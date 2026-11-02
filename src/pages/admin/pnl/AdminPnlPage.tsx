import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { unitEconomicsApi, type PnlMonth, type PnlReport } from "../../../api/unitEconomics";
import DataTable, { type Column } from "../../../components/DataTable";
import EmptyState from "../../../components/EmptyState";
import LoadError from "../../../components/LoadError";
import Loading from "../../../components/Loading";
import Money from "../../../components/Money";
import { ForbiddenPage } from "../../../components/ProtectedRoute";
import StatusChip from "../../../components/StatusChip";
import SubPageHeader from "../../../components/SubPageHeader";
import TrendChart from "../../../components/charts/TrendChart";
import { shortMoney } from "../../../components/charts/chartShell";
import { formatNumber, formatRate } from "../../../lib/format";
import { SelectField } from "../../calculators/parts/fields";
import { formatDateTime, formatMonth, isForbidden, requestIdOf } from "../parts/adminLabels";
import { useLoad } from "../parts/useLoad";
import PnlProfitChart from "./PnlProfitChart";
import "../../../styles/admin-pnl.css";

const PERIODS = [6, 12, 24].map(n => ({ value: n, label: `최근 ${n}개월` }));

/**
 * 포트폴리오 손익(S-331, FR-55): 가정 고지 → 기간 → 지표 줄 → 세전이익 막대·평잔 추이 → 월별 손익 표 + aside 읽는 법.
 * 숫자는 응답 그대로 쓴다. 정의는 business-rules WP33 §33.3(월마감을 끝낸 샌드박스만, 가정 조달비용, 충당금 전입).
 */
export default function AdminPnlPage() {
  const [months, setMonths] = useState(12);
  const { data, error, loading, reload } = useLoad(() => unitEconomicsApi.pnl(months), [months]);
  if (isForbidden(error)) return <ForbiddenPage requestId={requestIdOf(error)} />;

  return (
    <>
      <SubPageHeader
        section="admin"
        current="/admin/pnl"
        title="포트폴리오 손익"
        description="모든 샌드박스의 월마감 기록으로 달마다 이자·연체이자·수수료 수익에서 가정 조달비용과 충당금 전입액을 빼 세전이익을 계산해요. 수치는 교육용 모의 계약에서 나온 것이에요."
        meta={data ? `기준 시점 ${formatDateTime(data.asOf)} · 규칙 ${data.ruleSetVersion}` : undefined}
      />
      <main className="page-main admin-main">
        <p className="pnl-notice">
          <StatusChip label="교육용 가정값" tone="warn" /> {data?.notice ?? "조달비용은 평잔 × 규칙 세트 조달금리로 계산한 가정값이고, 판관비·모집비는 넣지 않았어요."}
          {data && ` 가정 조달금리 연 ${formatRate(data.fundingRate)}.`}
        </p>
        <div className="pnl-controls">
          <SelectField label="기간" value={months} options={PERIODS} onChange={setMonths} />
        </div>
        {loading && !data && <Loading message="월마감 기록으로 손익을 계산하고 있어요" minHeight={280} />}
        {error != null && <LoadError error={error} onRetry={reload} />}
        {data && data.rows.length === 0 && (
          <EmptyState
            title="아직 월마감을 끝낸 달이 없어요"
            description="손익은 그 달 말일 월마감을 끝낸 샌드박스의 계약으로 계산해요. 배치로 모든 샌드박스를 월말 다음 날까지 진행하면 여기에 쌓여요."
            action={{ to: "/admin/batch", label: "배치 실행하러 가기" }}
          />
        )}
        {data && data.rows.length > 0 && (
          <>
            <KeyFigures report={data} />
            <div className="admin-grid">
              <div className="stack admin-stack">
                <div className="chart-row">
                  <PnlProfitChart rows={data.rows} />
                  <TrendChart
                    title="평잔 추이"
                    points={data.rows.map(r => ({ label: r.month.slice(2).replace("-", "."), value: r.averageBalance }))}
                    format={v => shortMoney(v)}
                    description="(월초 + 월말 잔여 원금) ÷ 2"
                    valueHeader="평잔(원)"
                  />
                </div>
                <MonthlyTable report={data} />
              </div>
              <aside>
                <div className="panel panel-soft">
                  <div className="panel-head">
                    <h3>읽는 법</h3>
                    <p>열마다 어디서 온 숫자인지 적었다(business-rules WP33 §33.3).</p>
                  </div>
                  <dl className="def-list pnl-def">
                    <div><dt>마감 샌드박스</dt><dd>그 달 말일 월마감을 끝낸 샌드박스만 센다. 말일까지 가지 않은 샌드박스의 반쪽짜리 한 달은 넣지 않는다.</dd></div>
                    <div><dt>이자·연체이자·수수료</dt><dd>그 달 상환 거래(자동이체·수동 상환·중도상환·청약철회)의 성분 합. 철회로 돌려준 이자·수수료는 음수로 빠진다.</dd></div>
                    <div><dt>평잔</dt><dd>전월 말과 당월 말 잔여 원금의 평균. 당월 실행은 월초 0, 완제는 월말 0으로 본다.</dd></div>
                    <div><dt>가정 조달비용</dt><dd>평잔 × 조달금리 ÷ 12. 실제로 돈을 빌려 오지 않으므로 규칙 세트 가정값으로 계산한다.</dd></div>
                    <div><dt>충당금 전입</dt><dd>월말 충당금 − 전월 말 충당금. 연체가 깊어지면 크게 늘고, 완제·정상화로 줄면 음수(환입)다.</dd></div>
                    <div><dt>세전이익</dt><dd>총수익 − 가정 조달비용 − 충당금 전입. 판관비·모집비는 원천이 없어 넣지 않았다.</dd></div>
                  </dl>
                </div>
              </aside>
            </div>
          </>
        )}
        <div className="next-actions">
          <Link to="/calculators/unit-economics">대출 한 건의 손익 계산 →</Link>
          <Link to="/admin/analytics">리스크 지표 →</Link>
          <Link to="/admin/portfolio">포트폴리오 →</Link>
        </div>
      </main>
    </>
  );
}

function KeyFigures({ report: { totals } }: { report: PnlReport }) {
  return (
    <dl className="figure-row admin-figures" style={{ "--figure-cols": 4 } as CSSProperties}>
      <div><dt>기간 세전이익({totals.months}개월)</dt><dd className={totals.pretaxProfit < 0 ? "danger" : undefined}><Money value={totals.pretaxProfit} /></dd></div>
      <div><dt>총수익</dt><dd><Money value={totals.totalRevenue} /></dd></div>
      <div><dt>가정 조달비용 · 충당금 전입</dt><dd><Money value={totals.fundingCost + totals.provisionExpense} /><small>{formatNumber(totals.fundingCost)} + {formatNumber(totals.provisionExpense)}</small></dd></div>
      <div><dt>기간 ROA(연환산)</dt><dd className={totals.annualizedRoa < 0 ? "danger" : undefined}>{formatRate(totals.annualizedRoa)}<small>평균 평잔 {shortMoney(totals.averageBalance)}원</small></dd></div>
    </dl>
  );
}

function signed(value: number) {
  return <span className={value < 0 ? "is-loss" : undefined}><Money value={value} /></span>;
}

function MonthlyTable({ report }: { report: PnlReport }) {
  const columns: Column<PnlMonth>[] = [
    { key: "month", header: "월", rowHeader: true, nowrap: true, render: r => <>{formatMonth(r.month)}<span className="faint"> · {r.closedSandboxes}곳 {r.contracts}건</span></> },
    { key: "avg", header: "평잔", numeric: true, nowrap: true, render: r => <Money value={r.averageBalance} /> },
    { key: "interest", header: "이자", numeric: true, nowrap: true, render: r => signed(r.interestIncome) },
    { key: "overdue", header: "연체이자", numeric: true, nowrap: true, render: r => signed(r.overdueInterestIncome) },
    { key: "fee", header: "수수료", numeric: true, nowrap: true, render: r => signed(r.feeIncome) },
    { key: "revenue", header: "총수익", numeric: true, nowrap: true, render: r => signed(r.totalRevenue) },
    { key: "funding", header: "가정 조달비용", numeric: true, nowrap: true, render: r => <Money value={-r.fundingCost} /> },
    { key: "provision", header: "충당금 전입", numeric: true, nowrap: true, render: r => <Money value={-r.provisionExpense} /> },
    { key: "pretax", header: "세전이익", numeric: true, nowrap: true, render: r => <strong className={r.pretaxProfit < 0 ? "is-loss" : undefined}><Money value={r.pretaxProfit} />{r.pretaxProfit < 0 ? " 손해" : ""}</strong> },
    { key: "roa", header: "월 ROA(연환산)", numeric: true, nowrap: true, render: r => <span className={r.annualizedRoa < 0 ? "is-loss" : undefined}>{formatRate(r.annualizedRoa)}</span> },
  ];
  const t = report.totals;
  const footer = (
    <tr>
      <th scope="row">합계 · {t.months}개월</th>
      <td className="num"><Money value={t.averageBalance} /></td>
      <td className="num"><Money value={t.interestIncome} /></td>
      <td className="num"><Money value={t.overdueInterestIncome} /></td>
      <td className="num"><Money value={t.feeIncome} /></td>
      <td className="num"><Money value={t.totalRevenue} /></td>
      <td className="num"><Money value={-t.fundingCost} /></td>
      <td className="num"><Money value={-t.provisionExpense} /></td>
      <td className={`num${t.pretaxProfit < 0 ? " is-loss" : ""}`}><Money value={t.pretaxProfit} /></td>
      <td className={`num${t.annualizedRoa < 0 ? " is-loss" : ""}`}>{formatRate(t.annualizedRoa)}</td>
    </tr>
  );
  return (
    <section aria-labelledby="pnl-table-title" className="pnl-table">
      <div className="section-head">
        <div>
          <h2 id="pnl-table-title">월별 손익</h2>
          <p>비용은 음수로 적었다. 합계 행의 평잔은 달별 평잔의 평균이고, 기간 ROA는 Σ세전이익 × 12 ÷ Σ평잔이다.</p>
        </div>
      </div>
      <DataTable caption="월별 손익(교육용 가정값 포함)" captionNote={`가정 조달금리 연 ${formatRate(report.fundingRate)}`} columns={columns} rows={report.rows} rowKey={r => r.month} scroll compact footer={footer} />
    </section>
  );
}
