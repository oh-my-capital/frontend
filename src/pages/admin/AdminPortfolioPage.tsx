import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../api/admin";
import { IS_MOCK } from "../../api/client";
import type { Portfolio, PortfolioByAssetClass, PortfolioMonthly } from "../../api/types";
import DataTable, { type Column } from "../../components/DataTable";
import Disclosure from "../../components/Disclosure";
import EmptyState from "../../components/EmptyState";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import Money from "../../components/Money";
import StatusChip, { statusLabel } from "../../components/StatusChip";
import SubPageHeader from "../../components/SubPageHeader";
import { formatNumber, formatRate } from "../../lib/format";
import { ForbiddenPage } from "../../components/ProtectedRoute";
import MixBar from "../../components/charts/MixBar";
import TrendChart from "../../components/charts/TrendChart";
import { ASSET_CLASS_RULES, formatDateTime, formatMonth, isForbidden, requestIdOf } from "./parts/adminLabels";
import { useLoad } from "./parts/useLoad";

/**
 * 포트폴리오 현황(S-21, FR-24): 지표 줄 → 요약 표(산출 기준) → 건전성 분포(구성 막대 + 표) → 월별 추이(선 2개 + 표).
 * 숫자는 응답 값을 그대로 쓰고, 비중·평균만 여기서 계산한다.
 */
export default function AdminPortfolioPage() {
  const { data, error, loading, reload } = useLoad(() => adminApi.portfolio(), []);
  if (isForbidden(error)) return <ForbiddenPage requestId={requestIdOf(error)} />;

  return (
    <>
      <SubPageHeader
        section="admin"
        current="/admin/portfolio"
        title="포트폴리오"
        description="모든 샌드박스의 계약을 합친 현황이에요. 연체율은 잔액 기준이고, 충당금은 건전성 분류별 적립률로 계산한 값이에요. 수치는 교육용 모의 계약에서 나온 것이에요."
        meta={data ? `기준 시점 ${formatDateTime(data.asOf)}${IS_MOCK ? " · mock 모드" : ""}` : undefined}
      />
      <main className="page-main admin-main">
        {loading && !data && <Loading message="포트폴리오를 집계하고 있어요" minHeight={320} />}
        {error != null && <LoadError error={error} onRetry={reload} />}
        {data && data.contracts === 0 && (
          <EmptyState
            title="아직 집계할 계약이 없어요"
            description="실행된 계약이 한 건도 없어서 잔액·연체율·충당금이 모두 0이에요. 모의 여신에서 신청을 실행하면 다음 일마감부터 여기에 쌓여요."
            action={{ to: "/admin/applications", label: "심사 큐에서 신청 확인하기" }}
          />
        )}
        {data && data.contracts > 0 && <KeyFigures portfolio={data} />}
        {data && data.contracts > 0 && (
          <div className="admin-grid">
            <div className="stack admin-stack">
              <SummarySection portfolio={data} />
              <AssetClassSection portfolio={data} />
              <MonthlySection portfolio={data} />
            </div>
            <aside>
              <div className="panel panel-soft">
                <div className="panel-head">
                  <h3>읽는 법</h3>
                  <p>같은 숫자를 다르게 부르는 자리가 많아 기준을 먼저 맞춘다.</p>
                </div>
                <dl className="def-list admin-def">
                  <dt>연체율</dt><dd>연체 계약 잔여 원금 ÷ 전체 잔여 원금. 건수 기준이 아니라 잔액 기준이다.</dd>
                  <dt>건전성 분류</dt><dd>연체일수로 매일 일마감에서 다시 정하고, 바뀔 때만 이력에 남긴다.</dd>
                  <dt>충당금</dt><dd>잔여 원금 × 적립률을 절사해 월말 월마감에 저장한다. 완제 계약은 저장하지 않는다.</dd>
                  <dt>월별 추이</dt><dd>월말 월마감에 저장한 값만 들어간다. 월마감을 돌리지 않은 달은 0으로 보인다.</dd>
                </dl>
                <p className="faint admin-aside-note">적립률은 감독규정의 최소 기준을 참고한 교육용 가정값이다(확인일 2026-10-30).</p>
                <div className="btn-row">
                  <Link className="btn btn-secondary btn-small" to="/methodology">방법론에서 분류 기준 보기</Link>
                </div>
              </div>
              <div className="panel panel-soft">
                <div className="panel-head">
                  <h3>분류 기준</h3>
                  <p>연체일수 구간과 적립률(business-rules §9).</p>
                </div>
                <dl className="def-list admin-def">
                  {ASSET_CLASS_RULES.map(rule => (
                    <div key={rule.code}>
                      <dt>{rule.label}</dt>
                      <dd>{rule.days} · 적립률 {rule.rate}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </aside>
          </div>
        )}
        <div className="next-actions">
          <Link to="/admin/applications">심사 큐로 →</Link>
          <Link to="/admin/batch">월마감까지 배치 실행 →</Link>
        </div>
      </main>
    </>
  );
}

/** 지표 줄: 화면 폭 전체를 쓰는 네 칸. 아래 요약 표가 같은 값의 산출 기준을 말한다. */
function KeyFigures({ portfolio: p }: { portfolio: Portfolio }) {
  return (
    <dl className="figure-row admin-figures" style={{ "--figure-cols": 4 } as CSSProperties}>
      <div>
        <dt>총 잔액</dt>
        <dd><Money value={p.totalOutstanding} /></dd>
      </div>
      <div>
        <dt>진행 중 계약</dt>
        <dd>{formatNumber(p.activeContracts)}<small>건 / 전체 {formatNumber(p.contracts)}건</small></dd>
      </div>
      <div>
        <dt>연체율(잔액 기준)</dt>
        <dd className="danger">{formatRate(p.overdueRatio)}<small>연체 {formatNumber(p.overdueContracts)}건</small></dd>
      </div>
      <div>
        <dt>충당금 합계</dt>
        <dd><Money value={p.totalProvision} /></dd>
      </div>
    </dl>
  );
}

function SummarySection({ portfolio: p }: { portfolio: Portfolio }) {
  return (
    <section aria-labelledby="overview-title">
      <div className="section-head">
        <div>
          <h2 id="overview-title">여신 현황</h2>
          <p>전 샌드박스 합계. 샌드박스마다 영업일이 다르므로 각자의 마지막 일마감 결과를 지금 합친 값이다.</p>
        </div>
      </div>
      <SummaryTable portfolio={p} />
    </section>
  );
}

interface SummaryRow { key: string; label: string; value: ReactNode; basis: string }

function SummaryTable({ portfolio: p }: { portfolio: Portfolio }) {
  const rows: SummaryRow[] = [
    { key: "asOf", label: "기준 시점", value: formatDateTime(p.asOf), basis: "조회한 시각. 집계는 호출할 때마다 현재 계약으로 다시 계산한다" },
    { key: "contracts", label: "전체 계약", value: `${formatNumber(p.contracts)}건`, basis: "실행된 계약 수(완제 포함)" },
    { key: "active", label: "진행 중 계약", value: `${formatNumber(p.activeContracts)}건`, basis: "완제를 뺀 계약 수. 연체 계약도 포함한다" },
    { key: "overdue", label: "연체 계약", value: `${formatNumber(p.overdueContracts)}건`, basis: "진행 중 계약 가운데 연체·기한이익상실 계약" },
    { key: "outstanding", label: "총 잔액", value: <Money value={p.totalOutstanding} strong />, basis: "진행 중 계약의 잔여 원금 합계" },
    { key: "overdueOutstanding", label: "연체 잔액", value: <Money value={p.overdueOutstanding} />, basis: "연체 계약의 잔여 원금 합계" },
    { key: "ratio", label: "연체율(잔액 기준)", value: formatRate(p.overdueRatio), basis: "연체 잔액 ÷ 총 잔액" },
    { key: "provision", label: "충당금 합계", value: <Money value={p.totalProvision} />, basis: "진행 중 계약의 잔여 원금 × 분류별 적립률(절사)의 합" },
  ];
  const columns: Column<SummaryRow>[] = [
    { key: "label", header: "항목", rowHeader: true, render: r => r.label, width: "26%" },
    { key: "value", header: "값", numeric: true, render: r => r.value, width: "22%" },
    { key: "basis", header: "산출 기준", render: r => <span className="muted">{r.basis}</span> },
  ];
  return <DataTable caption="요약" captionNote="지표 줄과 같은 값이며, 각 값이 어떤 계약 집합에서 나왔는지를 함께 적었다." columns={columns} rows={rows} rowKey={r => r.key} compact />;
}

function AssetClassSection({ portfolio: p }: { portfolio: Portfolio }) {
  const total = p.totalOutstanding || 1;
  const ruleOf = (code: string) => ASSET_CLASS_RULES.find(a => a.code === code);
  const slices = ASSET_CLASS_RULES.map(rule => ({
    label: rule.label,
    value: p.byAssetClass.find(b => b.assetClass === rule.code)?.outstanding ?? 0,
    color: rule.color,
  }));
  const columns: Column<PortfolioByAssetClass>[] = [
    { key: "class", header: "분류", rowHeader: true, nowrap: true, render: r => { const { label, tone } = statusLabel(r.assetClass); return <StatusChip label={label} tone={tone} />; } },
    { key: "days", header: "연체일수", nowrap: true, render: r => ruleOf(String(r.assetClass))?.days ?? "—" },
    { key: "rate", header: "적립률", numeric: true, render: r => ruleOf(String(r.assetClass))?.rate ?? "—" },
    { key: "contracts", header: "계약 수", numeric: true, render: r => formatNumber(r.contracts) },
    { key: "outstanding", header: "잔액", numeric: true, render: r => <Money value={r.outstanding} /> },
    {
      key: "share",
      header: "잔액 비중",
      width: "20%",
      render: r => {
        const pct = (r.outstanding / total) * 100;
        return (
          <span className="bar-cell">
            <span className="bar-track"><i style={{ width: `${pct}%`, background: ruleOf(String(r.assetClass))?.color }} /></span>
            <span className="num">{pct.toFixed(1)}%</span>
          </span>
        );
      },
    },
    { key: "provision", header: "충당금", numeric: true, render: r => <Money value={r.provision} /> },
  ];
  const footer = (
    <tr>
      <th scope="row">합계</th>
      <td /><td />
      <td className="num">{formatNumber(p.byAssetClass.reduce((s, r) => s + r.contracts, 0))}</td>
      <td className="num"><Money value={p.totalOutstanding} /></td>
      <td className="num">100.0%</td>
      <td className="num"><Money value={p.totalProvision} /></td>
    </tr>
  );
  return (
    <section aria-labelledby="class-title">
      <div className="section-head">
        <div>
          <h2 id="class-title">건전성 분포</h2>
          <p>진행 중 계약을 연체일수로 나눈 잔액 구성이다. 막대가 길수록 그 분류가 잔액에서 차지하는 몫이 크다.</p>
        </div>
      </div>
      <MixBar
        title="건전성 분포(잔액 기준)"
        slices={slices}
        total={p.totalOutstanding}
        note={`진행 중 계약 ${formatNumber(p.activeContracts)}건`}
      />
      <DataTable caption="분류별 계약 수·잔액·충당금" captionNote="연체일수 구간은 business-rules §9의 교육용 가정값이고, 충당금은 잔여 원금 × 적립률을 절사한 값이다." columns={columns} rows={p.byAssetClass} rowKey={r => r.assetClass} footer={footer} scroll compact />
      <Disclosure />
    </section>
  );
}

function MonthlySection({ portfolio: p }: { portfolio: Portfolio }) {
  const months = p.monthly;
  const shortMonth = (m: string) => { const [y, mm] = m.split("-"); return `${y.slice(2)}.${Number(mm)}`; };
  const closed = months.filter(m => m.provision > 0);
  const averageRatio = closed.length > 0 ? closed.reduce((s, m) => s + m.overdueRatio, 0) / closed.length : 0;
  const columns: Column<PortfolioMonthly>[] = [
    { key: "month", header: "월", rowHeader: true, nowrap: true, render: r => formatMonth(r.month) },
    { key: "disbursed", header: "실행액", numeric: true, render: r => <Money value={r.disbursed} /> },
    { key: "repaid", header: "원금 회수", numeric: true, render: r => <Money value={r.repaidPrincipal} /> },
    { key: "interest", header: "이자수익", numeric: true, render: r => <Money value={r.interestIncome} /> },
    { key: "ratio", header: "연체율", numeric: true, render: r => formatRate(r.overdueRatio) },
    { key: "provision", header: "충당금", numeric: true, render: r => <Money value={r.provision} /> },
  ];
  const sum = (pick: (m: PortfolioMonthly) => number) => months.reduce((s, m) => s + pick(m), 0);
  const footer = (
    <tr>
      <th scope="row">{months.length}개월 합계</th>
      <td className="num"><Money value={sum(m => m.disbursed)} /></td>
      <td className="num"><Money value={sum(m => m.repaidPrincipal)} /></td>
      <td className="num"><Money value={sum(m => m.interestIncome)} /></td>
      <td className="num">평균 {formatRate(averageRatio)}</td>
      <td className="num">—</td>
    </tr>
  );
  return (
    <section aria-labelledby="monthly-title">
      <div className="section-head">
        <div>
          <h2 id="monthly-title">월별 추이</h2>
          <p>최근 {months.length}개월. 연체율은 각 월말 잔액 기준, 충당금은 월마감 저장값이다. 월마감이 없는 달은 0으로 남는다.</p>
        </div>
      </div>
      <div className="chart-row">
        <TrendChart
          title="연체율(잔액 기준)"
          points={months.map(m => ({ label: shortMonth(m.month), value: m.overdueRatio }))}
          format={v => `${v.toFixed(1)}%`}
          reference={closed.length > 0 ? { value: averageRatio, label: `월마감 ${closed.length}개월 평균` } : null}
          description="월말 연체 잔액 ÷ 총 잔액"
          valueHeader="연체율"
        />
        <TrendChart
          title="충당금 합계"
          points={months.map(m => ({ label: shortMonth(m.month), value: m.provision }))}
          format={v => (v >= 10_000 ? `${formatNumber(Math.round(v / 10_000))}만` : formatNumber(Math.round(v)))}
          description="월마감에 저장한 분류별 적립액의 합(원)"
          valueHeader="충당금"
        />
      </div>
      <DataTable caption="월별 수치" captionNote="그림의 원본 값. 실행액·원금 회수·이자수익은 해당 월 합계이고, 연체율·충당금은 그 달 월마감 시점의 값이다." columns={columns} rows={months} rowKey={r => r.month} footer={footer} scroll compact />
      <Disclosure />
    </section>
  );
}
