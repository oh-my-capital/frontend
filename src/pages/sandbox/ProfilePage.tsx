import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { calculatorsApi } from "../../api/calculators";
import { errorMessage } from "../../api/client";
import { sandboxApi } from "../../api/sandbox";
import type { EmploymentType, Profile, Sandbox, ScreeningResult } from "../../api/types";
import Disclosure from "../../components/Disclosure";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import Money from "../../components/Money";
import MoneyInput from "../../components/MoneyInput";
import StatusChip, { statusLabel } from "../../components/StatusChip";
import SubPageHeader from "../../components/SubPageHeader";
import { DateField, SelectField } from "../calculators/parts/fields";
import { EMPLOYMENT_LABEL, pct } from "../calculators/parts/labels";
import { useLoad } from "../calculators/parts/useLoad";

/** 미리보기에 쓰는 고정 신청 조건: 신용대출 1,000만 원 · 12회 · 원리금균등 · 자동이체(예시 11의 첫 신청). */
const PREVIEW = { productCode: "CREDIT_LOAN", requestedAmount: 10_000_000, termMonths: 12, repaymentMethod: "EQUAL_PAYMENT" as const, autoDebit: true };
const EMPLOYMENTS: EmploymentType[] = ["EMPLOYEE", "SELF_EMPLOYED", "FREELANCER", "NONE"];

/**
 * 가상 고객 프로필(S-12): 생년월일·고용형태·연소득·기존 연 원리금·신용점수(슬라이더+숫자) 폼과 "이 프로필이면" 미리보기.
 * 미리보기는 심사 계산기(POST /calculators/screening)에 고정 신청 조건을 넣어 밴드·예상 금리·최종 한도를 보여 준다.
 */
export default function ProfilePage() {
  const summary = useLoad<Sandbox>(signal => sandboxApi.summary(signal), []);
  const asOf = summary.data?.businessDate ?? "";
  return (
    <>
      <SubPageHeader
        section="sandbox"
        current="/sandbox/profile"
        title="가상 고객 프로필"
        description="심사에 쓰는 가상 고객의 소득·부채·신용점수예요. 실명·실제 신용정보는 쓰지 않아요. 값을 바꾸면 오른쪽 미리보기가 신용대출 1,000만 원·12회 조건으로 밴드와 예상 금리·한도를 다시 계산해요."
        meta={summary.data ? <>{summary.data.profile ? "저장된 프로필을 불러왔어요" : "아직 프로필이 없어요"} · 영업일 {asOf}</> : undefined}
      />
      <main className="page-main sandbox">
        {summary.error ? <LoadError error={summary.error} onRetry={summary.reload} /> : !summary.data ? <Loading message="프로필을 불러오고 있어요" minHeight={300} /> : (
          <ProfileForm initial={summary.data.profile} asOf={summary.data.businessDate} onSaved={summary.reload} />
        )}
        <nav className="next-actions" aria-label="다음 행동">
          <Link to="/sandbox/apply">대출 신청 <Icon name="next" size={16} /></Link>
          <Link to="/calculators/screening">심사 시뮬레이터에서 조건 바꿔 보기 <Icon name="next" size={16} /></Link>
        </nav>
      </main>
    </>
  );
}

/** 폼 본체. 저장된 프로필이 있으면 그 값으로, 없으면 예시 11 값으로 시작한다. */
function ProfileForm({ initial, asOf, onSaved }: { initial: Profile | null; asOf: string; onSaved: () => void }) {
  const navigate = useNavigate();
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? "1995-03-02");
  const [employmentType, setEmploymentType] = useState<EmploymentType>(initial?.employmentType ?? "EMPLOYEE");
  const [annualIncome, setAnnualIncome] = useState<number | null>(initial?.annualIncome ?? 48_000_000);
  const [existing, setExisting] = useState<number | null>(initial?.existingAnnualDebtService ?? 0);
  const [creditScore, setCreditScore] = useState(initial?.creditScore ?? 820);
  const [hasProfile, setHasProfile] = useState(initial !== null);
  const [preview, setPreview] = useState<ScreeningResult | null>(null);
  const [previewError, setPreviewError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState("");

  const valid = /^\d{4}-\d{2}-\d{2}$/.test(birthDate) && annualIncome !== null && existing !== null && creditScore >= 300 && creditScore <= 1000;

  useEffect(() => {
    if (!valid || !asOf) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      calculatorsApi.screening({ birthDate, annualIncome: annualIncome!, existingAnnualDebtService: existing!, creditScore, ...PREVIEW, asOf }, controller.signal)
        .then(res => { if (!controller.signal.aborted) { setPreview(res); setPreviewError(null); } })
        .catch(err => { if (!controller.signal.aborted) setPreviewError(err); });
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [valid, asOf, birthDate, annualIncome, existing, creditScore]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) { setSaveError("생년월일·연소득·기존 연 원리금·신용점수(300~1000)를 모두 넣어요."); return; }
    setSaving(true); setSaveError(""); setSaved("");
    try {
      const body: Profile = { birthDate, employmentType, annualIncome: annualIncome!, existingAnnualDebtService: existing!, creditScore };
      await sandboxApi.saveProfile(body);
      setSaved("프로필을 저장했어요. 이제 대출을 신청할 수 있어요.");
      setHasProfile(true);
      onSaved();
    } catch (err) {
      setSaveError(errorMessage(err, "프로필을 저장하지 못했어요. 값을 확인하고 다시 시도해요."));
    } finally {
      setSaving(false);
    }
  };

  return (
          <div className="page-grid">
            <form className="panel profile-form" onSubmit={submit} aria-labelledby="profile-title" noValidate>
              <h2 id="profile-title">프로필</h2>
              <div className="calc-fields">
                <DateField label="생년월일" value={birthDate} onChange={setBirthDate} hint="영업일 기준 만 19세 이상이어야 신청할 수 있어요" />
                <SelectField label="고용 형태" value={employmentType} options={EMPLOYMENTS.map(e => ({ value: e, label: EMPLOYMENT_LABEL[e] }))} onChange={setEmploymentType} hint="1단계 규칙에서는 심사에 쓰지 않고 기록만 해요" />
                <MoneyInput label="연소득" value={annualIncome} onChange={setAnnualIncome} required hint="소득배수·DSR 한도의 기준" />
                <MoneyInput label="기존 연 원리금" value={existing} onChange={setExisting} required hint="다른 대출로 한 해에 갚는 원금+이자. 없으면 0" />
              </div>
              <div className="field profile-score">
                <label className="field-label" htmlFor="profile-score-range">신용점수 <span className="profile-score-value">{creditScore}점</span></label>
                <input id="profile-score-range" type="range" min={300} max={1000} step={1} value={creditScore} onChange={event => setCreditScore(Number(event.target.value))} aria-describedby="profile-score-hint" />
                <div className="field-affix profile-score-number">
                  <input className="field-input num" type="number" inputMode="numeric" min={300} max={1000} value={creditScore} aria-label="신용점수 숫자 입력" onChange={event => setCreditScore(Math.min(1000, Math.max(300, Number(event.target.value) || 300)))} />
                  <span aria-hidden="true">점</span>
                </div>
                <p id="profile-score-hint" className="field-hint">300~1000점. 900 이상 A, 800 이상 B, 700 이상 C, 600 이상 D, 600 미만은 거절.</p>
              </div>
              {saveError && <p className="form-error" role="alert">{saveError}</p>}
              {saved && <p className="form-done" role="status">{saved}</p>}
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "저장하고 있어요…" : "프로필 저장"}</button>
                <button type="button" className="btn btn-secondary" disabled={saving || !hasProfile} onClick={() => navigate("/sandbox/apply")}>대출 신청으로</button>
              </div>
            </form>

            <aside aria-label="이 프로필이면" aria-live="polite">
              <section className="panel profile-preview">
                <h3>이 프로필이면</h3>
                <p className="muted">신용대출 <Money value={PREVIEW.requestedAmount} /> · 12회 · 원리금균등 · 자동이체 기준으로 미리 심사한 값이에요.</p>
                {previewError ? <LoadError error={previewError} message="미리보기를 계산하지 못했어요." /> : !preview ? <p className="muted">{valid ? "계산하고 있어요…" : "값을 모두 넣으면 계산해요."}</p> : (
                  <dl className="def-list">
                    <div><dt>결정</dt><dd><StatusChip label={statusLabel(preview.decision).label} tone={statusLabel(preview.decision).tone} /></dd></div>
                    <div><dt>신용 밴드</dt><dd>{preview.creditBand ?? "없음(자격 미충족)"}</dd></div>
                    <div><dt>예상 금리</dt><dd>{preview.rate ? <>{pct(preview.rate.applied)} <span className="faint">({pct(preview.rate.base)} + {pct(preview.rate.spread)} − {pct(preview.rate.discount)})</span></> : "—"}</dd></div>
                    <div><dt>최종 한도</dt><dd>{preview.limits ? <Money value={preview.limits.finalLimit} /> : "—"}</dd></div>
                    <div><dt>월 납입액</dt><dd><Money value={preview.monthlyPayment} /></dd></div>
                    <div><dt>DSR</dt><dd>{preview.dsr ? pct(preview.dsr.ratio) : "—"}</dd></div>
                  </dl>
                )}
                {preview && <Disclosure data={preview.disclosure} />}
              </section>
              <div className="panel panel-soft">
                <h3>예시 프로필</h3>
                <p className="muted">계산 예시 11: 1995-03-02생 · 연소득 48,000,000원 · 기존 0원 · 820점. 이 값이면 신용대출 1,000만 원은 7.70%로 즉시 승인이에요.</p>
                <button type="button" className="btn btn-secondary btn-small" onClick={() => { setBirthDate("1995-03-02"); setEmploymentType("EMPLOYEE"); setAnnualIncome(48_000_000); setExisting(0); setCreditScore(820); }}>예시 값 넣기</button>
              </div>
            </aside>
          </div>
  );
}
