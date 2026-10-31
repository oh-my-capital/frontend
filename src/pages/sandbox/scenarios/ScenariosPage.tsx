import { useCallback, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { errorMessage } from "../../../api/client";
import { scenariosApi, type Scenario } from "../../../api/scenarios";
import { sandboxApi } from "../../../api/sandbox";
import type { Sandbox } from "../../../api/types";
import Disclosure from "../../../components/Disclosure";
import Icon from "../../../components/Icon";
import LoadError from "../../../components/LoadError";
import Loading from "../../../components/Loading";
import Money from "../../../components/Money";
import StatusChip from "../../../components/StatusChip";
import SubPageHeader from "../../../components/SubPageHeader";
import { formatDate, formatNumber } from "../../../lib/format";
import { useLoad } from "../../calculators/parts/useLoad";
import ResetPanel from "./ResetPanel";
import "../../../styles/scenarios.css";

/**
 * 시나리오로 시작(S-260, WP26). 연체·기한이익상실·완제 직전 같은 장면을 수백 일 진행 없이 바로 연다.
 * 적용 = 초기화 + 기존 서비스 호출이므로 버튼은 2단계(적용 → 같은 행에서 "초기화하고 적용")로 받는다.
 * 성공하면 만든 계약(또는 조건부 신청) 화면으로 이동한다. 아래에는 확인 문구를 입력해야 켜지는 초기화 구역이 있다.
 */
export default function ScenariosPage() {
  const navigate = useNavigate();
  const summary = useLoad<Sandbox>(signal => sandboxApi.summary(signal), []);
  const scenarios = useLoad<Scenario[]>(signal => scenariosApi.list(signal), []);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [running, setRunning] = useState<Scenario | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);

  // 2단계 확인이 열리면 키보드 초점을 "취소"에 둔다(엔터를 두 번 눌러 실수로 지우지 않게, 경고 문장을 바로 읽게).
  const focusOnMount = useCallback((el: HTMLButtonElement | null) => { el?.focus(); }, []);

  const s = summary.data;
  const list = scenarios.data ?? [];

  const apply = async (scenario: Scenario) => {
    setRunning(scenario);
    setError(null);
    try {
      const result = await scenariosApi.apply(scenario.id);
      navigate(result.nextPath, { state: { notice: result.summary } });
    } catch (err) {
      setError({ id: scenario.id, message: errorMessage(err, "장면을 만들지 못했어요. 잠시 뒤 다시 시도해요.") });
      setRunning(null);
      setConfirming(null);
      summary.reload();
    }
  };

  return (
    <>
      <SubPageHeader
        section="sandbox"
        current="/sandbox"
        detail="시나리오로 시작"
        title="시나리오로 시작"
        description="연체 25일, 기한이익상실 직전, 완제 직전 같은 장면을 가상 시계를 직접 수백 일 넘기지 않고 바로 열어요. 적용하면 지금 샌드박스의 계약·신청·알림이 지워지고, 실제 신청·심사·실행·일마감을 차례로 돌려 그 장면을 다시 만들어요."
        meta={s ? <>영업일 {formatDate(s.businessDate)} · 진행 중 계약 {s.activeContracts}건 · 결제계좌 {formatNumber(s.settlementBalance)}원</> : "불러오고 있어요"}
      />
      <main className="page-main scenarios">
        <div className="page-grid">
          <div className="stack">
            {summary.error ? <LoadError error={summary.error} onRetry={summary.reload} /> : !s ? <Loading message="샌드박스 현황을 불러오고 있어요" minHeight={120} /> : (
              <dl className="figure-row" style={{ "--figure-cols": 4 } as CSSProperties}>
                <div><dt>지금 영업일</dt><dd>{monthDay(s.businessDate)}<small>{s.businessDate.slice(0, 4)}년 · 샌드박스의 오늘</small></dd></div>
                <div><dt>진행 중 계약</dt><dd>{s.activeContracts}건{s.overdueContracts > 0 && <small>연체 {s.overdueContracts}건</small>}</dd></div>
                <div><dt>결제계좌 잔액</dt><dd><Money value={s.settlementBalance} /></dd></div>
                <div><dt>가상 고객</dt><dd>{s.profile ? <>{s.profile.creditScore}점<small>연소득 {formatNumber(s.profile.annualIncome)}원</small></> : <>없음<small>프리셋이 만들어요</small></>}</dd></div>
              </dl>
            )}

            <section aria-labelledby="presets-title">
              <div className="section-head">
                <div>
                  <h2 id="presets-title">장면 고르기</h2>
                  <p>모든 숫자는 심사 엔진과 일마감이 실제로 계산한 값이에요. 시계를 많이 넘기는 장면은 응답까지 몇 초 걸려요.</p>
                </div>
              </div>
              <p className="sr-only" aria-live="polite">{running ? `${running.title} 장면을 만들고 있어요. 가상 시계를 약 ${running.approxAdvanceDays}일 진행해요.` : ""}</p>
              {scenarios.error ? <LoadError error={scenarios.error} onRetry={scenarios.reload} /> : !scenarios.data ? <Loading message="프리셋 목록을 불러오고 있어요" /> : (
                <table className="table scenario-table">
                  <caption>프리셋 {list.length}개<span className="table-caption-note">적용하면 지금 샌드박스를 초기화한 뒤 그 장면을 만들어요. 프로필은 장면에 맞는 가상 값으로 바뀌어요.</span></caption>
                  <thead><tr><th scope="col">장면</th><th scope="col">만들어지는 상태</th><th scope="col">배울 것</th><th scope="col">적용</th></tr></thead>
                  <tbody>
                    {list.map(sc => {
                      const isConfirming = confirming === sc.id;
                      const isRunning = running?.id === sc.id;
                      return (
                        <tr key={sc.id} className={isConfirming || isRunning ? "is-current" : undefined}>
                          <th scope="row">
                            <span className="scenario-no">{sc.order}</span>
                            <strong className="scenario-title">{sc.title}</strong>
                            <p className="scenario-scene">{sc.scene}</p>
                          </th>
                          <td>
                            <p className="scenario-produces">{sc.produces}</p>
                            <p className="scenario-meta faint">{sc.approxAdvanceDays > 0 ? `가상 시계 약 ${sc.approxAdvanceDays}일 진행` : "시계 진행 없음"} · 이동: {sc.creates === "CONTRACT" ? "계약 상세" : "신청·심사 결과"}</p>
                          </td>
                          <td>
                            <ul className="scenario-goals">{sc.learningGoals.map(g => <li key={g}>{g}</li>)}</ul>
                            <p className="scenario-links">
                              {sc.relatedConcepts.map(c => <Link key={c.id} to={`/learn/${c.id}`}>{c.title}</Link>)}
                            </p>
                            {sc.relatedMissions.length > 0 && <p className="scenario-meta faint">연결 미션: {sc.relatedMissions.join(" · ")}</p>}
                          </td>
                          <td className="scenario-action">
                            {isRunning ? (
                              <p className="scenario-running" role="status">약 {sc.approxAdvanceDays}일을 진행하고 있어요…</p>
                            ) : isConfirming ? (
                              <div className="scenario-confirm" role="group" aria-label={`${sc.title} 적용 확인`}>
                                <StatusChip label="지금 샌드박스를 지워요" tone="danger" />
                                <p>계약·신청·알림·결제계좌 기록을 지우고 이 장면을 만들어요.</p>
                                <div className="btn-row">
                                  <button type="button" className="btn btn-danger btn-small" onClick={() => apply(sc)} disabled={running !== null}>초기화하고 적용</button>
                                  <button type="button" className="btn btn-secondary btn-small" ref={focusOnMount} onClick={() => setConfirming(null)} disabled={running !== null}>취소</button>
                                </div>
                              </div>
                            ) : (
                              <button type="button" className="btn btn-primary btn-small" onClick={() => { setConfirming(sc.id); setError(null); }} disabled={running !== null}>
                                적용 <Icon name="next" size={16} />
                              </button>
                            )}
                            {error?.id === sc.id && <p className="form-error" role="alert">{error.message}</p>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>

            <ResetPanel disabled={running !== null} onReset={() => summary.reload()} />
          </div>

          <aside aria-label="프리셋의 가정값">
            <div className="panel panel-soft">
              <h3>프리셋이 쓰는 가상 조건</h3>
              <dl className="def-list scenario-assumptions">
                <div><dt>가상 고객</dt><dd>1995년생 근로소득자, 연소득 4,800만 원, 기존 부채 없음, 신용점수 820점(B)</dd></div>
                <div><dt>대출</dt><dd>신용대출 1,000만 원, 원리금균등, 36회(완제 직전은 12회)</dd></div>
                <div><dt>납입일</dt><dd>적용한 날의 날짜(29~31일이면 28일). 토·일이면 다음 월요일</dd></div>
                <div><dt>연체 장면</dt><dd>자동이체를 신청하지 않고 1회차부터 내지 않아요</dd></div>
                <div><dt>조건부 승인</dt><dd>연소득 3,000만 원, 기존 연 원리금 300만 원, 655점(D)으로 3,000만 원 신청</dd></div>
              </dl>
              <p className="muted">모두 교육용 가정값이에요. 실명·실계좌·실제 신용조회는 쓰지 않아요.</p>
            </div>
            <Disclosure />
          </aside>
        </div>
        <nav className="next-actions" aria-label="다음 행동">
          <Link to="/sandbox">내 모의 여신 현황 <Icon name="next" size={16} /></Link>
          <Link to="/sandbox/apply">직접 대출 신청 <Icon name="next" size={16} /></Link>
          <Link to="/learn/acceleration">기한이익상실 개념 <Icon name="next" size={16} /></Link>
        </nav>
      </main>
    </>
  );
}

/** "2026-10-31" → "10월 31일". 지표 칸이 좁아 연도는 작은 글자로 뺀다(큰 숫자가 두 줄로 꺾이지 않게). */
function monthDay(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}
