import { useState, type CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { insightApi, type CalculatorUsage, type KpiReport, type PageUsage, type PurgeResult, type SandboxFunnelStage } from "../../../api/insight";
import DataTable, { type Column } from "../../../components/DataTable";
import EmptyState from "../../../components/EmptyState";
import LoadError from "../../../components/LoadError";
import Loading from "../../../components/Loading";
import { ForbiddenPage } from "../../../components/ProtectedRoute";
import SubPageHeader from "../../../components/SubPageHeader";
import { FilterGroup } from "../../../components/Tabs";
import { formatDate, formatNumber } from "../../../lib/format";
import { formatDateTime, isForbidden, requestIdOf } from "../parts/adminLabels";
import { useLoad } from "../parts/useLoad";
import DailyTrendChart from "./DailyTrendChart";
import SandboxFunnelChart from "./SandboxFunnelChart";
import { pathLabel, pct } from "./kpiFormat";
import "../../../styles/admin-kpi.css";

const PERIODS = [7, 30, 90] as const;
const DEFAULT_DAYS = 30;

/**
 * 서비스 지표(S-400, FR-61): 기간 거르개 → 지표 줄 → 일별 추이 → 샌드박스 도달률 → 계산기별 사용 → 많이 본 화면 + aside 수집 원칙·지금 지우기.
 * 숫자는 응답 그대로 쓴다. 정의는 business-rules WP40 §40.5, 수집 원칙은 §40.1.
 */
export default function AdminKpiPage() {
  const [params, setParams] = useSearchParams();
  const requested = Number(params.get("days"));
  const days = PERIODS.includes(requested as (typeof PERIODS)[number]) ? requested : DEFAULT_DAYS;
  const report = useLoad(() => insightApi.kpi(days), [days]);
  if (isForbidden(report.error)) return <ForbiddenPage requestId={requestIdOf(report.error)} />;

  const selectDays = (value: number) => {
    const copy = new URLSearchParams(params);
    if (value === DEFAULT_DAYS) copy.delete("days"); else copy.set("days", String(value));
    setParams(copy, { replace: true });
  };
  const data = report.data;

  return (
    <>
      <SubPageHeader
        section="admin"
        current="/admin/kpi"
        title="서비스 지표"
        description="익명 방문 기록(화면 조회·계산기 실행)과 학습·모의 여신 기록을 합쳐 방문, 가입 전환, 학습 활성, 계산기별 사용, 샌드박스 도달률을 날짜별로 계산해요. 운영자 계정은 세지 않아요."
        notice="교육용 모의 서비스의 운영 지표예요. 방문 기록은 난수 방문 ID로만 남기고 IP·이메일·계정은 저장하지 않아요."
        meta={data ? `기준 시점 ${formatDateTime(data.asOf)}` : undefined}
      />
      <main className="page-main admin-main">
        <div className="admin-filter kpi-controls">
          <FilterGroup label="기간">
            {PERIODS.map(p => (
              <button key={p} type="button" className={days === p ? "is-active" : undefined} aria-pressed={days === p} onClick={() => selectDays(p)}>
                최근 {p}일
              </button>
            ))}
          </FilterGroup>
          <p className="admin-count" aria-live="polite">
            {data ? <>{formatDate(data.from)} ~ {formatDate(data.to)} · <strong>{formatNumber(data.days)}</strong>일 · 서울 날짜</> : "기간을 불러오고 있어요"}
          </p>
        </div>
        {report.loading && !data && <Loading message="지표를 집계하고 있어요" minHeight={320} />}
        {report.error != null && <LoadError error={report.error} onRetry={report.reload} />}
        {data && <KpiBody report={data} />}
      </main>
    </>
  );
}

function KpiBody({ report }: { report: KpiReport }) {
  const s = report.summary;
  const hasVisits = s.pageViews > 0;
  return (
    <>
      <dl className="figure-row admin-figures" style={{ "--figure-cols": 4 } as CSSProperties}>
        <div>
          <dt>방문자</dt>
          <dd>{formatNumber(s.visitors)}<small>명 · 화면 조회 {formatNumber(s.pageViews)}회</small></dd>
        </div>
        <div>
          <dt>가입</dt>
          <dd>{formatNumber(s.signups)}<small>명 · 방문자 대비 {pct(s.signupConversionRate)}</small></dd>
        </div>
        <div>
          <dt>학습 활성 사용자</dt>
          <dd>{formatNumber(s.learningActiveUsers)}<small>명 · 개념 완료 {formatNumber(s.conceptCompletions)} · 미션 {formatNumber(s.missionCompletions)}</small></dd>
        </div>
        <div>
          <dt>모의 신청 → 실행</dt>
          <dd>{formatNumber(s.applications)}<small>건 → 실행 {formatNumber(s.executions)}건 · 계산기 실행 {formatNumber(s.calculatorRuns)}회</small></dd>
        </div>
      </dl>

      <div className="admin-grid">
        <div className="stack admin-stack">
          <section aria-labelledby="kpi-trend-title">
            <div className="section-head">
              <div>
                <h2 id="kpi-trend-title">일별 추이</h2>
                <p>방문자는 그날 화면을 한 번 이상 본 서로 다른 방문 ID 수, 학습 활성은 그날 문제를 한 번 이상 제출한 계정 수다. 값 표에는 개념 완료·미션·신청·실행·계산기 실행까지 모두 있다.</p>
              </div>
            </div>
            {hasVisits || s.signups > 0 || s.learningActiveUsers > 0
              ? <DailyTrendChart days={report.daily} />
              : <EmptyState title="아직 방문 기록이 없어요" description="화면을 둘러보면 다음 조회부터 날짜별로 쌓여요. 추적 거부(Do Not Track·GPC)를 켠 브라우저는 세지 않아요." action={{ to: "/", label: "홈으로 가기" }} />}
          </section>

          <section aria-labelledby="kpi-funnel-title">
            <div className="section-head">
              <div>
                <h2 id="kpi-funnel-title">샌드박스 도달률</h2>
                <p>기간 안에 가입한 계정이 지금까지 가상 고객 프로필 저장 → 모의 신청 → 실행 중 어디까지 갔는지 센다. 시나리오 프리셋으로 만든 신청·계약도 포함한다.</p>
              </div>
            </div>
            <FunnelSection stages={report.funnel} />
          </section>

          <section aria-labelledby="kpi-calc-title">
            <div className="section-head">
              <div>
                <h2 id="kpi-calc-title">계산기별 사용</h2>
                <p>화면 조회·방문자는 브라우저 기록, 실행은 서버가 성공한 계산 요청을 센 값이다. 입력한 대출 조건은 저장하지 않는다.</p>
              </div>
            </div>
            <CalculatorTable rows={report.calculators} />
          </section>

          <section aria-labelledby="kpi-pages-title">
            <div className="section-head">
              <div>
                <h2 id="kpi-pages-title">많이 본 화면</h2>
                <p>경로는 라우트 패턴으로만 저장해 개념·계약 번호 같은 값은 남지 않는다. 운영 화면은 세지 않는다.</p>
              </div>
            </div>
            <PageTable rows={report.topPages} />
          </section>
        </div>
        <aside>
          <PrinciplesPanel retentionDays={report.retentionDays} />
        </aside>
      </div>
      <div className="next-actions">
        <Link to="/admin/analytics">운영 분석으로 →</Link>
        <Link to="/admin/portfolio">포트폴리오 →</Link>
      </div>
    </>
  );
}

function FunnelSection({ stages }: { stages: SandboxFunnelStage[] }) {
  const columns: Column<SandboxFunnelStage>[] = [
    { key: "label", header: "단계", rowHeader: true, nowrap: true, render: st => st.label },
    { key: "count", header: "계정", numeric: true, render: st => `${formatNumber(st.count)}명` },
    { key: "step", header: "앞 단계 대비", numeric: true, render: st => pct(st.stepRate) },
    { key: "signed", header: "가입 대비", numeric: true, render: st => pct(st.rateOfSignups) },
  ];
  return (
    <div className="stack">
      <SandboxFunnelChart stages={stages} />
      <DataTable caption="단계별 계정 수·전환율" captionNote="앞 단계 대비 = 이 단계 ÷ 바로 앞 단계, 가입 대비 = 이 단계 ÷ 기간 가입." columns={columns} rows={stages} rowKey={st => st.code} compact />
    </div>
  );
}

function CalculatorTable({ rows }: { rows: CalculatorUsage[] }) {
  const maxRuns = Math.max(0, ...rows.map(r => r.runs));
  const columns: Column<CalculatorUsage>[] = [
    { key: "label", header: "계산기", rowHeader: true, render: r => <Link to={r.path}>{r.label}</Link> },
    { key: "views", header: "화면 조회", numeric: true, render: r => formatNumber(r.pageViews) },
    { key: "visitors", header: "방문자", numeric: true, render: r => formatNumber(r.visitors) },
    { key: "runs", header: "실행", numeric: true, render: r => formatNumber(r.runs) },
    {
      key: "share",
      header: "실행 비교",
      width: "28%",
      render: r => (
        <span className="bar-cell">
          <span className="bar-track"><i className="kpi-run-bar" style={{ width: `${maxRuns === 0 ? 0 : (r.runs * 100) / maxRuns}%` }} /></span>
          <span className="num">{maxRuns === 0 ? "—" : pct((r.runs * 100) / maxRuns)}</span>
        </span>
      ),
    },
  ];
  return <DataTable caption="계산기별 조회·실행" captionNote="실행 비교 = 가장 많이 실행된 계산기를 100%로 둔 상대 크기." columns={columns} rows={rows} rowKey={r => r.slug} scroll compact />;
}

function PageTable({ rows }: { rows: PageUsage[] }) {
  const columns: Column<PageUsage>[] = [
    { key: "path", header: "화면(경로 패턴)", rowHeader: true, render: r => <code className="kpi-path">{pathLabel(r.path)}</code> },
    { key: "views", header: "조회", numeric: true, render: r => formatNumber(r.pageViews) },
    { key: "visitors", header: "방문자", numeric: true, render: r => formatNumber(r.visitors) },
  ];
  return <DataTable caption="조회 수 상위 10개 화면" columns={columns} rows={rows} rowKey={r => r.path} compact emptyMessage="기간에 화면 조회 기록이 없어요." />;
}

function PrinciplesPanel({ retentionDays }: { retentionDays: number }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PurgeResult | null>(null);
  const [error, setError] = useState<unknown>(null);
  const purge = () => {
    setRunning(true);
    setError(null);
    insightApi.purge().then(setResult, setError).finally(() => setRunning(false));
  };
  return (
    <div className="panel panel-soft">
      <div className="panel-head">
        <h3>수집 원칙</h3>
        <p>개인정보처리방침에 같은 내용이 들어간다. 외부 분석 도구·광고 태그·쿠키는 쓰지 않는다.</p>
      </div>
      <dl className="def-list admin-def">
        <dt>저장하는 것</dt><dd>이벤트 종류(화면 조회·계산기 실행), 경로 패턴, 브라우저가 만든 난수 방문 ID, 서울 날짜.</dd>
        <dt>저장하지 않는 것</dt><dd>IP 주소, 이메일, 계정 ID, 쿼리 문자열, 정확한 시각, 입력한 대출 조건.</dd>
        <dt>추적 거부</dt><dd>Do Not Track 또는 Global Privacy Control을 켠 브라우저는 아무것도 보내지 않고, 서버도 저장하지 않는다.</dd>
        <dt>보관 기간</dt><dd>오늘을 포함한 최근 {formatNumber(retentionDays)}일. 그 이전 수집분은 매일 03:30에 지운다.</dd>
        <dt>가입·학습·신청</dt><dd>이벤트로 따로 남기지 않고 기존 기록에서 센다. 탈퇴하면 지표에서도 빠진다.</dd>
      </dl>
      <div className="btn-row">
        <button type="button" className="btn btn-secondary btn-small" onClick={purge} disabled={running}>
          {running ? "지우는 중" : "보관 기간 지난 기록 지금 지우기"}
        </button>
      </div>
      <p className="admin-hint kpi-purge-result" aria-live="polite">
        {result && `${formatDate(result.cutoff)} 이전(포함) 수집분 ${formatNumber(result.deleted)}건을 지웠어요.`}
        {error != null && <span className="admin-error-text">지우지 못했어요. 잠시 뒤 다시 시도해요.</span>}
      </p>
    </div>
  );
}
