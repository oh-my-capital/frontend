import { useState, type CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { adminAnalyticsApi, type FunnelRow, type RollRateMatrix } from "../../../api/adminAnalytics";
import DataTable, { type Column } from "../../../components/DataTable";
import Disclosure from "../../../components/Disclosure";
import EmptyState from "../../../components/EmptyState";
import LoadError from "../../../components/LoadError";
import Loading from "../../../components/Loading";
import Money from "../../../components/Money";
import { ForbiddenPage } from "../../../components/ProtectedRoute";
import SubPageHeader from "../../../components/SubPageHeader";
import { FilterGroup } from "../../../components/Tabs";
import { formatNumber } from "../../../lib/format";
import { DECISION_LABEL, formatDateTime, formatMonth, isForbidden, requestIdOf } from "../parts/adminLabels";
import { useLoad } from "../parts/useLoad";
import FunnelChart from "./FunnelChart";
import RollRateTable, { RollRateLegend, type RollBasis } from "./RollRateTable";
import VintageChart from "./VintageChart";
import { pct } from "./riskLabels";
import "../../../styles/admin-analytics.css";

/**
 * 리스크 지표(S-220, FR-42): 지표 줄 → 롤레이트 히트맵(기준월·건수/잔액) → 빈티지 다중 선 → 승인 퍼널(상품별) + aside 읽는 법.
 * 숫자는 응답 그대로 쓰고 지표 줄의 합만 여기서 더한다. 정의는 business-rules WP22 §22.1~22.4.
 */
export default function AdminAnalyticsPage() {
  const [params, setParams] = useSearchParams();
  const month = params.get("month") ?? "";
  const roll = useLoad(() => adminAnalyticsApi.rollRates(month || undefined), [month]);
  const vintages = useLoad(() => adminAnalyticsApi.vintages(), []);
  const funnel = useLoad(() => adminAnalyticsApi.funnel(), []);
  const forbidden = [roll.error, vintages.error, funnel.error].find(isForbidden);
  if (forbidden) return <ForbiddenPage requestId={requestIdOf(forbidden)} />;

  const selectMonth = (value: string) => {
    const copy = new URLSearchParams(params);
    if (value) copy.set("month", value); else copy.delete("month");
    setParams(copy, { replace: true });
  };

  return (
    <>
      <SubPageHeader
        section="admin"
        current="/admin/analytics"
        title="리스크 지표"
        description="연체가 한 달 사이 어느 구간으로 굴러가는지(롤레이트), 어느 달 실행분이 더 나빠지는지(빈티지), 신청이 실행·완제까지 얼마나 이어지는지(퍼널)를 월마감 기록으로 계산해요. 모든 수치는 교육용 모의 계약에서 나온 것이에요."
        meta={roll.data ? `기준 시점 ${formatDateTime(roll.data.asOf)}` : undefined}
      />
      <main className="page-main admin-main">
        {roll.data && <KeyFigures matrix={roll.data} />}
        <div className="admin-grid">
          <div className="stack admin-stack">
            <section aria-labelledby="roll-title">
              <div className="section-head">
                <div>
                  <h2 id="roll-title">롤레이트 행렬</h2>
                  <p>전월 말 연체 구간에 있던 계약이 당월 말 어디에 있는지를 센다. 60일에 기한이익상실이 되므로 60일 이상 두 구간은 상실 계약이다.</p>
                </div>
              </div>
              {roll.loading && !roll.data && <Loading message="롤레이트를 계산하고 있어요" minHeight={280} />}
              {roll.error != null && !isForbidden(roll.error) && <LoadError error={roll.error} onRetry={roll.reload} />}
              {roll.data && <RollRateSection matrix={roll.data} month={month} onMonth={selectMonth} />}
            </section>

            <section aria-labelledby="vintage-title">
              <div className="section-head">
                <div>
                  <h2 id="vintage-title">빈티지</h2>
                  <p>같은 달에 실행한 계약을 한 묶음(코호트)으로 보고, 실행 뒤 몇 달째에 30일 이상 연체 잔액이 실행 원금의 몇 %인지를 잇는다. 분모가 실행 원금이라 코호트끼리 같은 자로 비교된다.</p>
                </div>
              </div>
              {vintages.loading && !vintages.data && <Loading message="빈티지를 계산하고 있어요" minHeight={280} />}
              {vintages.error != null && !isForbidden(vintages.error) && <LoadError error={vintages.error} onRetry={vintages.reload} />}
              {vintages.data && vintages.data.cohorts.length === 0 && (
                <EmptyState title="아직 실행된 계약이 없어요" description="모의 여신에서 신청을 실행하고 월말 일마감이 지나면 코호트가 생겨요." action={{ to: "/admin/batch", label: "배치에서 월말까지 실행하기" }} />
              )}
              {vintages.data && vintages.data.cohorts.length > 0 && (
                <>
                  <VintageChart cohorts={vintages.data.cohorts} maxMob={vintages.data.maxMob} thresholdDays={vintages.data.thresholdDays} />
                  <Disclosure />
                </>
              )}
            </section>

            <section aria-labelledby="funnel-title">
              <div className="section-head">
                <div>
                  <h2 id="funnel-title">승인 퍼널</h2>
                  <p>신청 → 심사 결정 → 승인(조건부 포함) → 실행 → 완제. 결정은 신청마다 가장 최근 심사 결과라 운영자 변경이 반영된다.</p>
                </div>
              </div>
              {funnel.loading && !funnel.data && <Loading message="퍼널을 집계하고 있어요" minHeight={240} />}
              {funnel.error != null && !isForbidden(funnel.error) && <LoadError error={funnel.error} onRetry={funnel.reload} />}
              {funnel.data && <FunnelSection rows={[funnel.data.total, ...funnel.data.products]} />}
            </section>
          </div>
          <aside>
            <div className="panel panel-soft">
              <div className="panel-head">
                <h3>읽는 법</h3>
                <p>세 지표 모두 저장하지 않고 조회할 때 월마감 기록으로 다시 계산한다.</p>
              </div>
              <dl className="def-list admin-def">
                <dt>월말 연체일수</dt><dd>말일 기준 연체 시작일부터 센 날수. 연체 기록(시작일·정상화일)에서 복원한다.</dd>
                <dt>모집단</dt><dd>전월 월마감에 들어간 계약. 완제 계약은 다음 달 행에 없다.</dd>
                <dt>미마감</dt><dd>샌드박스마다 영업일이 달라 당월 말일 일마감을 아직 돌리지 않은 계약. 비율 분모에서 뺀다.</dd>
                <dt>잔액 기준</dt><dd>전월 말 잔액이 한 달 뒤 어느 칸으로 옮겨 갔는가. 당월에 갚은 원금이 비율을 흐리지 않는다.</dd>
                <dt>빈티지 분모</dt><dd>코호트 실행 원금 합. 상환·완제로 줄지 않는다.</dd>
                <dt>퍼널 결정</dt><dd>조건부 승인을 수락해 실행해도 결정은 조건부로 센다.</dd>
              </dl>
              <div className="btn-row">
                <Link className="btn btn-secondary btn-small" to="/methodology">방법론에서 연체·건전성 기준 보기</Link>
              </div>
            </div>
          </aside>
        </div>
        <div className="next-actions">
          <Link to="/admin/collections">연체 관리 큐로 →</Link>
          <Link to="/admin/audit">운영 이력 보기 →</Link>
          <Link to="/admin/portfolio">포트폴리오 →</Link>
        </div>
      </main>
    </>
  );
}

/** 지표 줄: 기준월 · 전월 말 모집단 · 정상 유지율 · 정상 → 연체 전이율(잔액 기준). */
function KeyFigures({ matrix }: { matrix: RollRateMatrix }) {
  const population = matrix.rows.reduce((s, r) => s + r.contracts, 0);
  const balance = matrix.rows.reduce((s, r) => s + r.balance, 0);
  const current = matrix.rows.find(r => r.from === "CURRENT");
  const stay = current?.cells.find(c => c.to === "CURRENT")?.balanceRatio ?? 0;
  const rolled = current?.cells.filter(c => c.to !== "CURRENT" && c.to !== "PAID_OFF").reduce((s, c) => s + c.balanceRatio, 0) ?? 0;
  return (
    <dl className="figure-row admin-figures" style={{ "--figure-cols": 4 } as CSSProperties}>
      <div>
        <dt>기준월</dt>
        <dd>{matrix.month ? formatMonth(matrix.month) : "—"}<small>{matrix.previousMonth ? `전월 ${formatMonth(matrix.previousMonth)}` : "월마감 2개월 필요"}</small></dd>
      </div>
      <div>
        <dt>전월 말 모집단</dt>
        <dd>{formatNumber(population)}<small>건 · <Money value={balance} /></small></dd>
      </div>
      <div>
        <dt>정상 유지율(잔액)</dt>
        <dd>{current && current.contracts > 0 ? pct(stay) : "—"}<small>정상 → 정상</small></dd>
      </div>
      <div>
        <dt>정상 → 연체 전이율(잔액)</dt>
        <dd className={rolled > 0 ? "danger" : undefined}>{current && current.contracts > 0 ? pct(rolled) : "—"}<small>1일 이상 연체로</small></dd>
      </div>
    </dl>
  );
}

function RollRateSection({ matrix, month, onMonth }: { matrix: RollRateMatrix; month: string; onMonth: (value: string) => void }) {
  const [basis, setBasis] = useState<RollBasis>("balance");
  const options = matrix.availableMonths;
  return (
    <div className="stack">
      <div className="admin-filter rr-controls">
        <div className="field">
          <label className="field-label" htmlFor="rr-month">기준월</label>
          <select id="rr-month" className="field-select" value={month || matrix.month || ""} onChange={e => onMonth(e.target.value)} disabled={options.length === 0}>
            {options.length === 0 && <option value="">선택할 달 없음</option>}
            {options.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
          </select>
        </div>
        <FilterGroup label="비율 기준">
          <button type="button" className={basis === "balance" ? "is-active" : undefined} aria-pressed={basis === "balance"} onClick={() => setBasis("balance")}>잔액 기준</button>
          <button type="button" className={basis === "contracts" ? "is-active" : undefined} aria-pressed={basis === "contracts"} onClick={() => setBasis("contracts")}>건수 기준</button>
        </FilterGroup>
        <p className="admin-count" aria-live="polite">
          {matrix.newContracts > 0 ? <>당월 신규 <strong>{formatNumber(matrix.newContracts)}</strong>건은 행렬 밖</> : "당월 신규 실행 없음"}
        </p>
      </div>
      {matrix.rows.length === 0 ? (
        <EmptyState
          title={options.length === 0 ? "월마감이 두 달 이상 쌓이지 않았어요" : `${matrix.month ? formatMonth(matrix.month) : "이 달"}에는 전월 월마감 기록이 없어요`}
          description="롤레이트는 전월 말과 당월 말 월마감이 모두 있어야 계산돼요. 배치에서 일마감을 월말 두 번 이상 지나도록 실행해요."
          action={{ to: "/admin/batch", label: "배치 실행하기" }}
        />
      ) : (
        <>
          <RollRateTable matrix={matrix} basis={basis} />
          <RollRateLegend />
          <Disclosure />
        </>
      )}
    </div>
  );
}

function FunnelSection({ rows }: { rows: FunnelRow[] }) {
  const [code, setCode] = useState<string>("");
  const row = rows.find(r => (r.productCode ?? "") === code) ?? rows[0];
  const stageColumns: Column<FunnelRow["stages"][number]>[] = [
    { key: "label", header: "단계", rowHeader: true, nowrap: true, render: s => s.label },
    { key: "count", header: "건수", numeric: true, render: s => `${formatNumber(s.count)}건` },
    { key: "step", header: "앞 단계 대비", numeric: true, render: s => pct(s.stepRatio) },
    { key: "applied", header: "신청 대비", numeric: true, render: s => pct(s.ratioOfApplied) },
  ];
  const decisionColumns: Column<FunnelRow["decisions"][number]>[] = [
    { key: "decision", header: "결정", rowHeader: true, render: d => DECISION_LABEL[d.decision] },
    { key: "count", header: "건수", numeric: true, render: d => `${formatNumber(d.count)}건` },
    {
      key: "ratio",
      header: "결정 중 비율",
      width: "40%",
      render: d => (
        <span className="bar-cell">
          <span className="bar-track"><i className={`funnel-share funnel-share-${d.decision.toLowerCase()}`} style={{ width: `${Math.min(100, d.ratio)}%` }} /></span>
          <span className="num">{pct(d.ratio)}</span>
        </span>
      ),
    },
  ];
  return (
    <div className="stack">
      <div className="admin-filter">
        <div className="field">
          <label className="field-label" htmlFor="funnel-product">상품</label>
          <select id="funnel-product" className="field-select" value={code} onChange={e => setCode(e.target.value)}>
            {rows.map(r => <option key={r.productCode ?? "ALL"} value={r.productCode ?? ""}>{r.productName}</option>)}
          </select>
        </div>
        <p className="admin-count">취소 <strong>{formatNumber(row.cancelled)}</strong>건(승인 뒤 실행하지 않고 취소)</p>
      </div>
      <FunnelChart row={row} />
      <div className="chart-row">
        <DataTable caption="단계별 건수·전환율" captionNote="앞 단계 대비 = 이 단계 ÷ 바로 앞 단계, 신청 대비 = 이 단계 ÷ 신청." columns={stageColumns} rows={row.stages} rowKey={s => s.code} compact />
        <DataTable caption="결정 분포" captionNote="신청마다 가장 최근 심사 결과(운영자 변경 포함)." columns={decisionColumns} rows={row.decisions} rowKey={d => d.decision} compact />
      </div>
      <Disclosure />
    </div>
  );
}
