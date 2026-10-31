import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { errorMessage } from "../../../api/client";
import { certificatesApi, type Certificate, type CertificateIssue, type CertificatePath } from "../../../api/certificates";
import { sandboxApi } from "../../../api/sandbox";
import type { ContractSummary, Sandbox } from "../../../api/types";
import EmptyState from "../../../components/EmptyState";
import Icon from "../../../components/Icon";
import LoadError from "../../../components/LoadError";
import Loading from "../../../components/Loading";
import { setDocumentTitle } from "../../../components/PageTitle";
import { statusLabel } from "../../../components/StatusChip";
import SubPageHeader from "../../../components/SubPageHeader";
import { formatDate } from "../../../lib/format";
import { useLoad } from "../../calculators/parts/useLoad";
import CertificateDocument from "./CertificateDocument";
import { CERTIFICATE_NAME, CERTIFICATE_TYPES, PATH_OF } from "./labels";
import "../../../styles/certificates.css";

/** 인쇄용 화면 주소. 거래내역은 발급된 기간을 그대로 넘겨 같은 번호가 나오게 한다. */
function printPath(contractId: number, path: CertificatePath, from?: string | null, to?: string | null): string {
  const search = path === "transactions" ? new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString() : "";
  return `/sandbox/contracts/${contractId}/certificates/${path}${search ? `?${search}` : ""}`;
}

/**
 * 증명서 발급(S-210). 계약·종류(·기간)를 고르고 "미리보기"를 누르면 발급하고 본문을 아래에 보여 준다.
 * 완납증명서는 완제 계약에서만 고를 수 있고, 못 고르는 이유를 글로 적는다. 계약 상세의 "증명서 발급" 링크는 ?contractId= 로 계약을 미리 고른다.
 * 발급 이력은 최신 먼저이며 "다시 열기"는 오늘 영업일 기준으로 다시 발급한다(같은 날 같은 내용이면 같은 번호).
 */
export default function CertificatesPage() {
  const [params] = useSearchParams();
  const initialContract = Number(params.get("contractId")) || null;
  const summary = useLoad<Sandbox>(signal => sandboxApi.summary(signal), []);
  const contracts = useLoad<ContractSummary[]>(signal => sandboxApi.contracts(undefined, signal), []);
  const history = useLoad<CertificateIssue[]>(signal => certificatesApi.history(undefined, signal), []);

  const [picked, setPicked] = useState<number | null>(initialContract);
  const [path, setPath] = useState<CertificatePath>("balance");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Certificate | null>(null);

  const list = contracts.data ?? [];
  const contractId = picked !== null && list.some(c => c.id === picked) ? picked : list[0]?.id ?? null;
  const contract = list.find(c => c.id === contractId) ?? null;
  const paidOff = contract?.status === "PAID_OFF";
  const effectivePath: CertificatePath = path === "payoff" && !paidOff ? "balance" : path;
  const businessDate = summary.data?.businessDate;
  useEffect(() => { setDocumentTitle("증명서 발급"); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (contractId === null) return;
    setBusy(true);
    setError(null);
    try {
      const period = effectivePath === "transactions" ? { from: from || undefined, to: to || undefined } : undefined;
      const result = await certificatesApi.issue(contractId, effectivePath, period);
      setPreview(result);
      history.reload();
    } catch (e) {
      setError(errorMessage(e, "증명서를 발급하지 못했어요. 잠시 뒤 다시 시도해요."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SubPageHeader
        section="sandbox"
        current="/sandbox/certificates"
        title="증명서 발급"
        description="내 모의 계약의 부채잔액증명서·완납증명서·거래내역확인서를 실제 금융회사 고객센터의 셀프 발급처럼 만들어 봐요. 모두 교육용 모의 문서이고 법적 효력이 없어요."
        meta={summary.data ? <>발급 영업일 {formatDate(summary.data.businessDate)} · 샌드박스의 가상 오늘 기준으로 발급해요</> : "불러오고 있어요"}
      />
      <main className="page-main cert-issue">
        <div className="page-grid">
          <div className="cert-main">
            {contracts.error ? <LoadError error={contracts.error} onRetry={contracts.reload} /> : !contracts.data ? <Loading message="계약 목록을 불러오고 있어요" minHeight={240} /> : list.length === 0 ? (
              <EmptyState title="아직 계약이 없어요" description="증명서는 실행된 계약에 대해서만 발급해요. 프로필을 만들고 대출을 신청해 실행해 봐요." action={{ to: "/sandbox/apply", label: "대출 신청하기" }} />
            ) : (
              <form className="panel cert-form" onSubmit={submit} aria-labelledby="cert-form-title">
                <div className="panel-head"><h2 id="cert-form-title">무엇을 발급할까요</h2><p>계약과 종류를 고르고 미리보기를 누르면 발급번호가 매겨지고 본문이 아래에 나와요.</p></div>
                <div className="field">
                  <label className="field-label" htmlFor="cert-contract">계약</label>
                  <select id="cert-contract" className="field-select" value={contractId ?? ""} onChange={e => { setPicked(Number(e.target.value)); setPreview(null); }}>
                    {list.map(c => <option key={c.id} value={c.id}>{c.contractNo} · {c.productName} · {statusLabel(c.status).label}</option>)}
                  </select>
                </div>
                <fieldset className="cert-types">
                  <legend className="field-label">종류</legend>
                  {CERTIFICATE_TYPES.map(t => {
                    const disabled = t.path === "payoff" && !paidOff;
                    return (
                      <label key={t.path} className={`cert-type${disabled ? " is-disabled" : ""}`}>
                        <input type="radio" name="cert-type" value={t.path} checked={effectivePath === t.path} disabled={disabled}
                          onChange={() => { setPath(t.path); setPreview(null); }} />
                        <span>
                          <strong>{t.name}</strong>
                          <span className="field-hint">{t.description}</span>
                          {disabled && contract && <span className="field-hint cert-type-why">이 계약은 지금 {statusLabel(contract.status).label} 상태라 완납증명서를 발급할 수 없어요. 완제되면 고를 수 있어요.</span>}
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
                {effectivePath === "transactions" && (
                  <div className="cert-period">
                    <div className="field">
                      <label className="field-label" htmlFor="cert-from">기간 시작일<span className="optional">비우면 실행일</span></label>
                      <input id="cert-from" type="date" className="field-input" value={from} max={to || businessDate} onChange={e => setFrom(e.target.value)} />
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="cert-to">기간 끝일<span className="optional">비우면 영업일</span></label>
                      <input id="cert-to" type="date" className="field-input" value={to} min={from || undefined} max={businessDate} onChange={e => setTo(e.target.value)} />
                    </div>
                  </div>
                )}
                {error && <p className="form-error" role="alert">{error}</p>}
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={busy || contractId === null}>{busy ? "발급하고 있어요" : "미리보기"}</button>
                  {contractId !== null && <Link to={`/sandbox/contracts/${contractId}`}>계약 상세 보기</Link>}
                </div>
              </form>
            )}

            {preview && (
              <section className="cert-preview" aria-labelledby="cert-preview-head">
                <div className="section-head">
                  <div>
                    <h2 id="cert-preview-head">미리보기</h2>
                    <p aria-live="polite">{preview.issue.reused ? `오늘 같은 내용으로 발급한 ${preview.issue.issueNo}를 다시 보여 줘요(재발급 아님).` : `${preview.issue.issueNo}로 발급했어요.`}</p>
                  </div>
                  <Link to={printPath(preview.contract.id, PATH_OF[preview.issue.type], preview.issue.periodFrom, preview.issue.periodTo)}>인쇄용 화면 열기 <Icon name="next" size={16} /></Link>
                </div>
                <CertificateDocument data={preview} headingId="cert-preview-title" />
              </section>
            )}

            <section className="cert-history" aria-labelledby="cert-history-title">
              <div className="section-head"><div><h2 id="cert-history-title">발급 이력</h2><p>발급번호는 이 샌드박스 안에서 1번부터 차례로 매겨요. 다시 열면 오늘 영업일 기준으로 다시 발급해요.</p></div></div>
              {history.error ? <LoadError error={history.error} onRetry={history.reload} /> : !history.data ? <Loading message="발급 이력을 불러오고 있어요" /> : history.data.length === 0 ? (
                <p className="muted">아직 발급한 증명서가 없어요. 위에서 계약과 종류를 골라 미리보기를 눌러 봐요.</p>
              ) : (
                <div className="table-scroll">
                  <table className="table table-compact">
                    <caption>발급 {history.data.length}건<span className="table-caption-note">최신 발급이 위에 온다. 기간은 거래내역확인서만 있다.</span></caption>
                    <thead><tr><th scope="col">발급번호</th><th scope="col">종류</th><th scope="col">계약번호</th><th scope="col">발급 영업일</th><th scope="col">기간</th><th scope="col">열기</th></tr></thead>
                    <tbody>
                      {history.data.map(h => (
                        <tr key={h.issueNo}>
                          <th scope="row" className="num cert-no">{h.issueNo}</th>
                          <td>{CERTIFICATE_NAME[h.type] ?? h.typeName}</td>
                          <td className="nowrap"><Link to={`/sandbox/contracts/${h.contractId}`}>{h.contractNo}</Link></td>
                          <td className="nowrap">{formatDate(h.issuedOn)}</td>
                          <td className="nowrap">{h.periodFrom ? `${formatDate(h.periodFrom)} ~ ${formatDate(h.periodTo)}` : "—"}</td>
                          <td><Link to={printPath(h.contractId, PATH_OF[h.type], h.periodFrom, h.periodTo)} aria-label={`${h.issueNo} 인쇄용 화면 열기`}>다시 열기</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <aside aria-label="증명서 안내">
            <div className="panel panel-soft">
              <h3>이 증명서는</h3>
              <ul className="cert-guide">
                <li><strong>교육용 모의 문서</strong>예요. 법적 효력이 없고 어디에도 제출·증빙할 수 없어요. 본문과 워터마크에 같은 문구가 들어가요.</li>
                <li>명의는 <strong>가상 고객</strong>과 마스킹한 이메일뿐이에요. 실명·주민번호·주소는 받지도 적지도 않아요.</li>
                <li>기준일은 고를 수 없고 <strong>샌드박스 영업일</strong>로 정해져요. 시간을 진행하면 잔액도 그날 기준으로 바뀌어요.</li>
                <li>같은 날 같은 내용이면 <strong>같은 발급번호</strong>예요. 상환 등으로 내용이 바뀌면 새 번호가 매겨져요.</li>
              </ul>
            </div>
            <div className="panel">
              <h3>함께 보기</h3>
              <ul className="cert-guide">
                <li><Link to="/sandbox/calendar">납입 캘린더</Link> — 이번 달 회차와 납입 상태를 달력으로 봐요.</li>
                <li>잔액증명서의 잔여 원금은 완제 금액이 아니에요. 오늘 다 갚는 금액은 계약 상세의 <strong>중도상환 견적</strong>에서 봐요.</li>
              </ul>
            </div>
          </aside>
        </div>
        <nav className="next-actions" aria-label="다음 행동">
          <Link to="/sandbox">내 모의 여신 <Icon name="next" size={16} /></Link>
          <Link to="/sandbox/calendar">납입 캘린더 <Icon name="next" size={16} /></Link>
          <Link to="/learn/acceleration">개념 10 · 기한이익상실 <Icon name="next" size={16} /></Link>
        </nav>
      </main>
    </>
  );
}
