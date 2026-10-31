import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { sandboxApi } from "../../api/sandbox";
import type { ContractSummary, Notification, Sandbox } from "../../api/types";
import EmptyState from "../../components/EmptyState";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import Money from "../../components/Money";
import StatusChip, { ContractStatusChip, statusLabel } from "../../components/StatusChip";
import SubPageHeader from "../../components/SubPageHeader";
import { formatDate, formatNumber } from "../../lib/format";
import { ASSET_CLASS_LABEL, NOTIFICATION_TYPE_LABEL, pct } from "../calculators/parts/labels";
import { useLoad } from "../calculators/parts/useLoad";
import ClockControl from "./parts/ClockControl";
import DepositForm from "./parts/DepositForm";

/**
 * 내 모의 여신(S-11): 지표 네 칸(영업일·결제계좌 잔액·진행 중 계약·다음 납입일) → 한 줄 요약(프로필·연체·잔액·알림)
 * → 가상 시계(진행 결과는 시계 안 aria-live 영역에 한 줄 요약) → 계약 목록 표(상환 진행 막대 포함).
 * 보조 열: 결제계좌 입금 폼, 미읽음 알림 5개, 다음 할 일. 시간 진행·입금 뒤에는 현황과 계약 목록을 다시 불러온다.
 */
export default function SandboxPage() {
  const summary = useLoad<Sandbox>(signal => sandboxApi.summary(signal), []);
  const contracts = useLoad<ContractSummary[]>(signal => sandboxApi.contracts(undefined, signal), []);
  const unread = useLoad<Notification[]>(signal => sandboxApi.notifications(true, signal), []);
  const reloadAll = () => { summary.reload(); contracts.reload(); unread.reload(); };

  if (summary.error) {
    return (
      <>
        <SubPageHeader section="sandbox" current="/sandbox" title="내 모의 여신" />
        <main className="page-main"><LoadError error={summary.error} onRetry={reloadAll} /></main>
      </>
    );
  }
  const s = summary.data;
  const list = contracts.data ?? [];
  const live = list.filter(c => c.status !== "PAID_OFF");
  const nextDue = s?.nextDueDate ?? null;
  const nextPayment = live.filter(c => c.nextDueDate === nextDue).reduce((sum, c) => sum + (c.nextPayment ?? 0), 0);
  const shortfall = s && nextPayment > s.settlementBalance ? nextPayment - s.settlementBalance : 0;

  return (
    <>
      <SubPageHeader
        section="sandbox"
        current="/sandbox"
        title="내 모의 여신"
        description="가상 고객으로 대출을 신청하고, 가상 시계를 하루씩 또는 다음 납입일까지 넘기며 자동이체·연체·건전성 분류가 어떻게 처리되는지 봐요. 모든 날짜는 이 샌드박스의 영업일 기준이고, 돈은 가상 결제계좌에서만 오가요."
        meta={s ? <>영업일 {formatDate(s.businessDate)} · 결제계좌 {formatNumber(s.settlementBalance)}원 · 진행 중 계약 {s.activeContracts}건</> : "불러오고 있어요"}
      />
      <main className="page-main sandbox">
        <div className="page-grid">
          <div className="sandbox-main">
            {!s ? <Loading message="샌드박스 현황을 불러오고 있어요" minHeight={220} /> : (
              <>
                <dl className="figure-row" style={{ "--figure-cols": 4 } as CSSProperties}>
                  <div><dt>영업일</dt><dd>{formatDate(s.businessDate)}<small>샌드박스의 오늘</small></dd></div>
                  <div><dt>결제계좌 잔액</dt><dd className={shortfall > 0 ? "danger" : undefined}><Money value={s.settlementBalance} /></dd></div>
                  <div><dt>진행 중 계약</dt><dd>{s.activeContracts}건{s.overdueContracts > 0 && <small>연체 {s.overdueContracts}건</small>}</dd></div>
                  <div><dt>다음 납입일</dt><dd>{nextDue ? <>{formatDate(nextDue)}{nextPayment > 0 && <small>{formatNumber(nextPayment)}원</small>}</> : <>없음<small>예정된 납입 없음</small></>}</dd></div>
                </dl>
                <dl className="sandbox-facts">
                  <div>
                    <dt>가상 고객</dt>
                    <dd>{s.profile ? <>신용점수 {s.profile.creditScore}점 · 연소득 {formatNumber(s.profile.annualIncome)}원 · 기존 연 원리금 {formatNumber(s.profile.existingAnnualDebtService)}원 <Link to="/sandbox/profile">바꾸기</Link></> : <><Link to="/sandbox/profile">프로필을 만들고</Link> 첫 대출을 신청해 봐요</>}</dd>
                  </div>
                  <div>
                    <dt>연체</dt>
                    <dd>{s.overdueContracts > 0 ? <StatusChip label={`연체 ${s.overdueContracts}건`} tone="danger" /> : s.activeContracts > 0 ? <StatusChip label="연체 없음" tone="good" /> : "진행 중 계약 없음"}</dd>
                  </div>
                  <div>
                    <dt>잔액</dt>
                    <dd>{shortfall > 0 ? <StatusChip label={`다음 납입에 ${formatNumber(shortfall)}원 부족`} tone="warn" /> : <StatusChip label="다음 납입분 충분" tone="good" />}</dd>
                  </div>
                  <div>
                    <dt>읽지 않은 알림</dt>
                    <dd>{s.unreadNotifications > 0 ? <Link to="/sandbox/notifications">{s.unreadNotifications}개 보기</Link> : "없음"}</dd>
                  </div>
                </dl>

                <ClockControl businessDate={s.businessDate} nextDueDate={nextDue} onAdvanced={reloadAll} />

                <section aria-labelledby="contracts-title" className="sandbox-contracts">
                  <div className="section-head"><div><h2 id="contracts-title">계약</h2><p>계약번호를 누르면 회차표·거래 내역·타임라인·충당금과 상환 행동이 있는 상세 화면으로 가요.</p></div><Link to="/sandbox/apply">대출 신청 <Icon name="next" size={16} /></Link></div>
                  {contracts.error ? <LoadError error={contracts.error} onRetry={contracts.reload} /> : contracts.loading && !contracts.data ? <Loading message="계약 목록을 불러오고 있어요" /> : list.length === 0 ? (
                    <EmptyState title="아직 계약이 없어요" description={s.profile ? "대출을 신청하면 규칙 심사가 바로 결정을 내리고, 승인이면 실행해서 계약을 만들 수 있어요." : "프로필을 만들고 첫 대출을 신청해 봐요."} action={s.profile ? { to: "/sandbox/apply", label: "대출 신청하기" } : { to: "/sandbox/profile", label: "프로필 만들기" }} />
                  ) : (
                    <div className="table-scroll">
                      <table className="table table-links">
                        <caption>내 계약 {list.length}건<span className="table-caption-note">잔액은 남은 원금, 건전성은 연체일수로 매일 다시 분류한다(정상 0~29일 · 요주의 30~89일 · 고정 90~179일 · 회수의문 180~364일 · 추정손실 365일 이상).</span></caption>
                        <thead><tr><th scope="col">계약번호</th><th scope="col">상품</th><th scope="col" className="num">잔액 / 원금</th><th scope="col">상환 진행</th><th scope="col" className="num">금리</th><th scope="col">상태</th><th scope="col">건전성</th><th scope="col">다음 납입</th></tr></thead>
                        <tbody>
                          {list.map(c => {
                            const klass = statusLabel(c.assetClass);
                            const repaid = Math.max(0, c.principal - c.outstandingPrincipal);
                            const share = c.principal > 0 ? Math.round((repaid / c.principal) * 100) : 0;
                            return (
                              <tr key={c.id}>
                                <th scope="row"><Link to={`/sandbox/contracts/${c.id}`}>{c.contractNo}</Link></th>
                                <td>{c.productName}</td>
                                <td className="num"><Money value={c.outstandingPrincipal} strong /><span className="admin-sub faint">원금 <Money value={c.principal} /></span></td>
                                <td className="sandbox-progress-cell">
                                  <span className="bar-track" role="img" aria-label={`원금 ${share}% 상환`}><i style={{ width: `${share}%` }} /></span>
                                  <span className="num">{share}%</span>
                                </td>
                                <td className="num">{pct(c.contractRate)}</td>
                                <td><ContractStatusChip status={c.status} overdueDays={c.overdueDays} /></td>
                                <td><StatusChip label={ASSET_CLASS_LABEL[c.assetClass] ?? klass.label} tone={klass.tone} /></td>
                                <td>{c.nextDueDate ? <>{formatDate(c.nextDueDate)}<span className="admin-sub faint"><Money value={c.nextPayment} /></span></> : c.status === "PAID_OFF" ? "완제" : "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>

          <aside aria-label="입금과 알림">
            {s && <DepositForm balance={s.settlementBalance} suggested={shortfall > 0 ? shortfall : null} onDeposited={reloadAll} />}
            <section className="panel sandbox-notices" aria-labelledby="unread-title">
              <h3 id="unread-title">읽지 않은 알림</h3>
              {unread.error ? <p className="muted">알림을 불러오지 못했어요.</p> : !unread.data ? <p className="muted">불러오고 있어요…</p> : unread.data.length === 0 ? <p className="muted">읽지 않은 알림이 없어요. 시간을 진행하면 납입 예정·연체 알림이 쌓여요.</p> : (
                <ul className="notice-list">
                  {unread.data.slice(0, 5).map(n => {
                    const t = NOTIFICATION_TYPE_LABEL[n.type] ?? { label: n.type, tone: "neutral" as const };
                    return <li key={n.id}><time dateTime={n.businessDate}>{formatDate(n.businessDate)}</time> <StatusChip label={t.label} tone={t.tone} /><strong>{n.title}</strong></li>;
                  })}
                </ul>
              )}
              <Link to="/sandbox/notifications" className="panel-link">알림함 전체 보기 <Icon name="next" size={16} /></Link>
            </section>
            <div className="panel panel-soft">
              <h3>다음 할 일</h3>
              <ol className="sandbox-steps">
                <li className={s?.profile ? "is-done" : undefined}><Link to="/sandbox/profile">가상 고객 프로필 만들기</Link></li>
                <li className={live.length > 0 ? "is-done" : undefined}><Link to="/sandbox/apply">대출 신청 → 심사 결과 확인 → 실행</Link></li>
                <li>"다음 납입일까지" 진행해 자동이체를 보기</li>
                <li>자동이체 없는 계약을 미납 상태로 30·45·60일 진행해 연체 → 요주의 → 통지 → 기한이익상실 보기</li>
                <li>입금 후 수동 상환·중도상환으로 정리하기</li>
              </ol>
            </div>
          </aside>
        </div>
        <nav className="next-actions" aria-label="다음 행동">
          <Link to="/sandbox/apply">대출 신청 <Icon name="next" size={16} /></Link>
          <Link to="/sandbox/notifications">알림함 <Icon name="next" size={16} /></Link>
          <Link to="/sandbox/scenarios">시나리오로 시작 <Icon name="next" size={16} /></Link>
          <Link to="/learn/delinquency-and-overdue-interest">개념 9 · 연체와 연체이자 <Icon name="next" size={16} /></Link>
        </nav>
      </main>
    </>
  );
}
