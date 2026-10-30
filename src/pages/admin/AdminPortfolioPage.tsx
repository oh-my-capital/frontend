import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../api/admin";
import { IS_MOCK } from "../../api/client";
import type { Portfolio, PortfolioByAssetClass, PortfolioMonthly } from "../../api/types";
import DataTable, { type Column } from "../../components/DataTable";
import Disclosure from "../../components/Disclosure";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import Money from "../../components/Money";
import StatusChip, { statusLabel } from "../../components/StatusChip";
import SubPageHeader from "../../components/SubPageHeader";
import { formatNumber, formatRate } from "../../lib/format";
import AdminForbidden from "./parts/AdminForbidden";
import TrendChart from "./parts/TrendChart";
import { ASSET_CLASS_RULES, formatDateTime, formatMonth, isForbidden } from "./parts/adminLabels";
import { useLoad } from "./parts/useLoad";

/**
 * 포트폴리오 현황(S-21, FR-24): 요약 표 → 건전성 분포 표(행 안 가로 막대) → 월별 추이(SVG 선 2개 + 표).
 * 숫자 타일·도넛 없이 표가 주인공이다. 비율은 응답 값을 그대로 쓰고, 비중만 여기서 나눈다.
 */
export default function AdminPortfolioPage() {
  const { data, error, loading, reload } = useLoad(() => adminApi.portfolio(), []);
  if (isForbidden(error)) return <AdminForbidden error={error} />;

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
        {data && (
          <div className="admin-grid">
            <div className="stack admin-stack">
              <SummaryTable portfolio={data} />
              <AssetClassTable portfolio={data} />
              <MonthlySection portfolio={data} />
            </div>
            <aside>
              <div className="panel panel-soft">
                <h3>읽는 법</h3>
                <dl className="def-list admin-def" style={{ marginTop: 12 }}>
                  <dt>연체율</dt><dd>연체 계약 잔여 원금 ÷ 전체 잔여 원금. 건수 기준이 아니라 잔액 기준이다.</dd>
                  <dt>건전성 분류</dt><dd>연체일수로 매일 일마감에서 다시 정하고, 바뀔 때만 이력에 남긴다.</dd>
                  <dt>충당금</dt><dd>잔여 원금 × 적립률을 절사해 월말 월마감에 저장한다. 완제 계약은 저장하지 않는다.</dd>
                </dl>
                <p className="faint" style={{ marginTop: 14 }}>적립률은 감독규정의 최소 기준을 참고한 교육용 가정값이다(확인일 2026-10-30).</p>
                <div className="btn-row" style={{ marginTop: 14 }}>
                  <Link className="btn btn-secondary btn-small" to="/methodology">방법론에서 분류 기준 보기</Link>
                </div>
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
    { key: "label", header: "항목", rowHeader: true, render: r => r.label, width: "30%" },
    { key: "value", header: "값", numeric: true, render: r => r.value },
    { key: "basis", header: "산출 기준", render: r => <span className="muted">{r.basis}</span> },
  ];
  return <DataTable caption="요약" captionNote="전 샌드박스 합계. 각 샌드박스의 영업일이 다르므로 값은 샌드박스별 마지막 일마감 결과를 지금 합친 것이다." columns={columns} rows={rows} rowKey={r => r.key} />;
}

function AssetClassTable({ portfolio: p }: { portfolio: Portfolio }) {
  const total = p.totalOutstanding || 1;
  const columns: Column<PortfolioByAssetClass>[] = [
    { key: "class", header: "분류", rowHeader: true, render: r => { const { label, tone } = statusLabel(r.assetClass); return <StatusChip label={label} tone={tone} />; } },
    { key: "days", header: "연체일수", render: r => ASSET_CLASS_RULES.find(a => a.code === r.assetClass)?.days ?? "—" },
    { key: "rate", header: "적립률", numeric: true, render: r => ASSET_CLASS_RULES.find(a => a.code === r.assetClass)?.rate ?? "—" },
    { key: "contracts", header: "계약 수", numeric: true, render: r => formatNumber(r.contracts) },
    { key: "outstanding", header: "잔액", numeric: true, render: r => <Money value={r.outstanding} /> },
    { key: "share", header: "잔액 비중", render: r => { const pct = r.outstanding / total * 100; return <span className="admin-bar" aria-label={`${pct.toFixed(1)}%`}><span className="admin-bar-fill" style={{ width: `${Math.max(1, pct)}%` }} /><span className="admin-bar-text">{pct.toFixed(1)}%</span></span>; }, width: "22%" },
    { key: "provision", header: "충당금", numeric: true, render: r => <Money value={r.provision} /> },
  ];
  const footer = (
    <tr>
      <th scope="row">합계</th>
      <td /><td />
      <td className="num">{formatNumber(p.byAssetClass.reduce((s, r) => s + r.contracts, 0))}</td>
      <td className="num"><Money value={p.totalOutstanding} /></td>
      <td>100.0%</td>
      <td className="num"><Money value={p.totalProvision} /></td>
    </tr>
  );
  return (
    <section aria-labelledby="class-title">
      <h2 id="class-title" className="sr-only">건전성 분포</h2>
      <DataTable caption="건전성 분포" captionNote="연체일수 구간별 계약 수·잔액·충당금. 막대는 전체 잔액 대비 비중이다." columns={columns} rows={p.byAssetClass} rowKey={r => r.assetClass} footer={footer} scroll />
      <Disclosure />
    </section>
  );
}

function MonthlySection({ portfolio: p }: { portfolio: Portfolio }) {
  const months = p.monthly;
  const shortMonth = (m: string) => { const [y, mm] = m.split("-"); return `${y.slice(2)}.${Number(mm)}`; };
  const columns: Column<PortfolioMonthly>[] = [
    { key: "month", header: "월", rowHeader: true, render: r => formatMonth(r.month) },
    { key: "disbursed", header: "실행액", numeric: true, render: r => <Money value={r.disbursed} /> },
    { key: "repaid", header: "원금 회수", numeric: true, render: r => <Money value={r.repaidPrincipal} /> },
    { key: "interest", header: "이자수익", numeric: true, render: r => <Money value={r.interestIncome} /> },
    { key: "ratio", header: "연체율", numeric: true, render: r => formatRate(r.overdueRatio) },
    { key: "provision", header: "충당금", numeric: true, render: r => <Money value={r.provision} /> },
  ];
  return (
    <section aria-labelledby="monthly-title">
      <div className="section-head"><div><h2 id="monthly-title">월별 추이</h2><p>최근 {months.length}개월. 연체율은 각 월말 잔액 기준, 충당금은 월마감 저장값이다.</p></div></div>
      <div className="admin-charts">
        <TrendChart title="연체율(잔액 기준)" points={months.map(m => ({ label: shortMonth(m.month), value: m.overdueRatio }))} format={v => `${v.toFixed(1)}%`} description="월말 연체 잔액 ÷ 총 잔액" />
        <TrendChart title="충당금 합계" points={months.map(m => ({ label: shortMonth(m.month), value: m.provision }))} format={v => (v >= 10_000 ? `${formatNumber(Math.round(v / 10_000))}만` : formatNumber(Math.round(v)))} description="월마감에 저장한 분류별 적립액의 합(원)" />
      </div>
      <DataTable caption="월별 수치" captionNote="그림의 원본 값. 실행액·원금 회수·이자수익은 해당 월 합계다." columns={columns} rows={months} rowKey={r => r.month} scroll compact />
      <Disclosure />
    </section>
  );
}
