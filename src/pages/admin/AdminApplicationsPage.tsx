import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { adminApi } from "../../api/admin";
import { ApiError, errorMessage, IS_MOCK } from "../../api/client";
import type { AdminApplicationItem, AdminOverrideRequest, Application, Decision } from "../../api/types";
import DataTable, { type Column } from "../../components/DataTable";
import Disclosure from "../../components/Disclosure";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import Money from "../../components/Money";
import MoneyInput from "../../components/MoneyInput";
import RateInput from "../../components/RateInput";
import StatusChip, { statusLabel } from "../../components/StatusChip";
import SubPageHeader from "../../components/SubPageHeader";
import { formatDate, formatRate } from "../../lib/format";
import { ForbiddenPage } from "../../components/ProtectedRoute";
import ScreeningReasons from "./parts/ScreeningReasons";
import { APPLICATION_STATUS_OPTIONS, DECISION_LABEL, formatDateTime, isForbidden, METHOD_LABEL, requestIdOf, SOURCE_LABEL } from "./parts/adminLabels";
import { useLoad } from "./parts/useLoad";

const MIN_REASON = 10;

/**
 * 심사 큐(S-20, FR-23): 상태 필터 · 페이지 표 → 행 선택 시 우측 패널(신청 요약 · 근거 표 · 변경 이력 · 결정 변경 폼).
 * 질의는 주소(?status=&page=&id=)에 둬서 새로 고침·뒤로 가기에도 같은 화면이 나온다.
 */
export default function AdminApplicationsPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const page = Math.max(0, Number(params.get("page") ?? 0) || 0);
  const selectedId = Number(params.get("id")) || null;
  const [listVersion, setListVersion] = useState(0);

  const list = useLoad(() => adminApi.listApplications({ status: status || undefined, page }), [status, page, listVersion]);
  const detail = useLoad(() => adminApi.getApplication(selectedId!), [selectedId], selectedId !== null);

  const update = (next: Record<string, string | null>) => {
    const copy = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) { if (v === null || v === "") copy.delete(k); else copy.set(k, v); }
    setParams(copy);
  };

  if (isForbidden(list.error)) return <ForbiddenPage requestId={requestIdOf(list.error)} />;

  const columns: Column<AdminApplicationItem>[] = [
    { key: "no", header: "신청번호", rowHeader: true, nowrap: true, render: r => <code className="admin-code">{r.applicationNo}</code> },
    { key: "sandbox", header: "샌드박스", numeric: true, render: r => r.sandboxId },
    { key: "email", header: "신청자", render: r => r.userEmailMasked },
    { key: "product", header: "상품", render: r => r.productName },
    { key: "amount", header: "신청 금액", numeric: true, render: r => <Money value={r.requestedAmount} /> },
    { key: "decision", header: "심사 결정", nowrap: true, render: r => { const { label, tone } = statusLabel(r.decision); return <><StatusChip label={label} tone={tone} /><span className="faint admin-sub">{SOURCE_LABEL[r.source] ?? r.source}</span></>; } },
    { key: "status", header: "현재 상태", nowrap: true, render: r => { const { label, tone } = statusLabel(r.status); return <StatusChip label={label} tone={tone} />; } },
    { key: "applied", header: "신청일", nowrap: true, render: r => formatDate(r.appliedOn) },
    { key: "open", header: "상세", render: r => (
      <button type="button" className={`btn btn-small ${r.id === selectedId ? "btn-primary" : "btn-secondary"}`} aria-pressed={r.id === selectedId} onClick={() => update({ id: String(r.id) })}>
        {r.id === selectedId ? "보는 중" : "보기"}
      </button>
    ) },
  ];

  const data = list.data;
  const statusLabelText = APPLICATION_STATUS_OPTIONS.find(o => o.value === status)?.label ?? "전체";

  return (
    <>
      <SubPageHeader
        section="admin"
        current="/admin/applications"
        title="심사 큐"
        description="모든 샌드박스의 신청을 상태로 걸러 보고, 자동 심사 결과를 근거 표와 함께 확인한 뒤 사유를 남기고 결정을 바꿔요. 실행이 끝난 신청은 바꿀 수 없어요."
        meta={IS_MOCK ? "mock 모드 · 고정 응답이며 새로 고침하면 변경이 사라져요" : undefined}
      />
      <main className="page-main admin-main">
        <div className="admin-grid">
          <section aria-labelledby="queue-title">
            <h2 id="queue-title" className="sr-only">신청 목록</h2>
            <form className="admin-filter" role="search" aria-label="심사 큐 필터" onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const fd = new FormData(e.currentTarget); update({ status: String(fd.get("status") ?? ""), page: null }); }}>
              <div className="field">
                <label className="field-label" htmlFor="queue-status">상태</label>
                <select id="queue-status" name="status" className="field-select" defaultValue={status} key={status}>
                  {APPLICATION_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <button type="submit" className="btn btn-secondary">걸러 보기</button>
              <p className="admin-count" aria-live="polite">
                {data ? <>{statusLabelText} <strong>{data.totalItems}</strong>건 · {data.page + 1}/{data.totalPages}쪽</> : "불러오는 중"}
              </p>
            </form>

            {list.loading && !data && <Loading message="신청을 불러오고 있어요" minHeight={240} />}
            {list.error != null && <LoadError error={list.error} onRetry={list.reload} />}
            {data && (
              <>
                <DataTable
                  caption="심사 큐"
                  captionNote="결정일 최신순. 심사 결정은 규칙 심사 또는 운영자 변경의 결과, 현재 상태는 실행·취소까지 반영한 값이다."
                  columns={columns}
                  rows={data.items}
                  rowKey={r => r.id}
                  selectedKey={selectedId}
                  scroll
                  emptyMessage="이 상태의 신청이 없어요. 상태를 전체로 바꿔 보거나 모의 여신에서 신청을 만들어요."
                />
                <nav className="admin-pager" aria-label="쪽 이동">
                  <button type="button" className="btn btn-secondary btn-small" disabled={data.page <= 0} onClick={() => update({ page: String(data.page - 1) })}>이전 쪽</button>
                  <span>{data.page + 1} / {data.totalPages}</span>
                  <button type="button" className="btn btn-secondary btn-small" disabled={data.page >= data.totalPages - 1} onClick={() => update({ page: String(data.page + 1) })}>다음 쪽</button>
                </nav>
              </>
            )}
          </section>

          <aside aria-label="신청 상세">
            {selectedId === null && (
              <div className="panel panel-soft">
                <h3>신청을 고르면 여기에 상세가 나와요</h3>
                <p className="muted" style={{ marginTop: 8, fontSize: 15 }}>표의 "보기"를 누르면 신청 조건, 규칙별 심사 근거, 이전 변경 이력과 결정 변경 폼이 열려요.</p>
              </div>
            )}
            {selectedId !== null && detail.loading && !detail.data && <Loading message="신청 상세를 불러오고 있어요" minHeight={240} />}
            {selectedId !== null && detail.error != null && (
              <LoadError
                error={detail.error}
                message={detail.error instanceof ApiError && detail.error.status === 404 ? "이 번호의 신청을 찾지 못했어요. 목록에서 다시 골라요." : undefined}
                onRetry={detail.reload}
              />
            )}
            {detail.data && (
              <ApplicationPanel
                key={detail.data.id}
                application={detail.data}
                onChanged={app => { detail.setData(app); setListVersion(v => v + 1); }}
                onClose={() => update({ id: null })}
              />
            )}
          </aside>
        </div>
        <div className="next-actions">
          <Link to="/admin/portfolio">포트폴리오 현황 보기 →</Link>
          <Link to="/admin/batch">전역 일마감 실행 →</Link>
          <Link to="/calculators/screening">심사 시뮬레이터에서 같은 조건 돌려 보기 →</Link>
        </div>
      </main>
    </>
  );
}

function ApplicationPanel({ application, onChanged, onClose }: { application: Application; onChanged: (app: Application) => void; onClose: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus({ preventScroll: false }); }, [application.id]);
  const s = application.screening;
  const current = statusLabel(application.status);
  const canOverride = application.status !== "EXECUTED" && application.status !== "CANCELLED";

  return (
    <div className="panel admin-detail">
      <div className="admin-detail-head">
        <div>
          <span className="eyebrow">신청 상세</span>
          <h2 ref={headingRef} tabIndex={-1}>{application.applicationNo}</h2>
        </div>
        <button type="button" className="btn btn-secondary btn-small" onClick={onClose}>닫기</button>
      </div>
      <p className="admin-chips">
        <StatusChip label={`현재 ${current.label}`} tone={current.tone} />
        <StatusChip label={`${SOURCE_LABEL[s.source] ?? s.source} · ${DECISION_LABEL[s.decision] ?? s.decision}`} tone={statusLabel(s.decision).tone} />
        {s.creditBand && <StatusChip label={`신용 밴드 ${s.creditBand}`} tone="neutral" />}
      </p>

      <dl className="def-list admin-def">
        <dt>상품</dt><dd>{application.product.name}</dd>
        <dt>신청 금액</dt><dd><Money value={application.requestedAmount} /></dd>
        <dt>조건</dt><dd>{application.termMonths}회 · {METHOD_LABEL[application.repaymentMethod] ?? application.repaymentMethod} · 납입일 {application.paymentDay}일 · 자동이체 {application.autoDebit ? "신청" : "미신청"}</dd>
        <dt>적용 금리</dt><dd>{s.rate ? <>{formatRate(s.rate.applied)} <span className="faint">(기준 {formatRate(s.rate.base)} + 스프레드 {formatRate(s.rate.spread)} − 우대 {formatRate(s.rate.discount)}{s.rate.capped ? " · 상한 적용" : ""})</span></> : <span className="faint">자격 단계에서 걸려 금리를 매기지 않았다</span>}</dd>
        <dt>최종 한도</dt><dd>{s.limits?.finalLimit != null ? <><Money value={s.limits.finalLimit} /> <span className="faint">({s.limits.bindingRule})</span></> : "—"}</dd>
        <dt>제안 금액</dt><dd><Money value={s.offeredAmount} /></dd>
        <dt>월 납입액</dt><dd><Money value={s.monthlyPayment} /></dd>
        <dt>DSR</dt><dd>{s.dsr ? <>{s.dsr.ratio.toFixed(2)}% <span className="faint">(한도 {s.dsr.limit}% · 기존 {new Intl.NumberFormat("ko-KR").format(s.dsr.existingAnnual)}원 + 신규 {new Intl.NumberFormat("ko-KR").format(s.dsr.newAnnual)}원)</span></> : "—"}</dd>
        <dt>신청일 · 결정일</dt><dd>{formatDate(application.appliedOn)} · {formatDate(application.decidedOn)}</dd>
        {application.contractId !== null && <><dt>계약</dt><dd>계약 ID {application.contractId}</dd></>}
      </dl>

      <ScreeningReasons reasons={s.reasons} />
      <Disclosure data={s.disclosure} />

      {application.overrides.length > 0 && <OverridesTable overrides={application.overrides} />}

      {canOverride
        ? <OverrideForm application={application} onChanged={onChanged} />
        : <p className="muted admin-note">{application.status === "EXECUTED" ? "실행이 끝난 신청이라 결정을 바꿀 수 없어요. 계약 쪽에서 처리해요." : "취소된 신청은 결정을 바꿀 수 없어요."}</p>}
    </div>
  );
}

/** 변경 이력(screening_overrides). 375px 에서 패널이 넓어지지 않도록 DataTable scroll 로 감싼다(1차의 맨 table 은 패널을 476px 까지 밀어냈다). */
function OverridesTable({ overrides }: { overrides: Application["overrides"] }) {
  const columns: Column<Application["overrides"][number]>[] = [
    { key: "at", header: "시각", nowrap: true, render: o => formatDateTime(o.createdAt) },
    { key: "change", header: "이전 → 이후", nowrap: true, render: o => `${statusLabel(o.beforeDecision).label} → ${statusLabel(o.afterDecision).label}` },
    { key: "amount", header: "금액", numeric: true, render: o => <Money value={o.afterAmount} /> },
    { key: "reason", header: "사유", render: o => o.reason },
  ];
  return <DataTable caption="변경 이력" captionNote="screening_overrides에 남은 이전·이후·사유·시각이다." columns={columns} rows={overrides} rowKey={(_, i) => i} compact scroll />;
}

function OverrideForm({ application, onChanged }: { application: Application; onChanged: (app: Application) => void }) {
  const [decision, setDecision] = useState<Decision>(application.screening.decision);
  const [amount, setAmount] = useState<number | null>(application.screening.offeredAmount ?? application.requestedAmount);
  const [rate, setRate] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const reasonLength = reason.trim().length;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDone(null);
    if (reasonLength < MIN_REASON) return setError(`변경 사유를 ${MIN_REASON}자 이상 적어요. 지금 ${reasonLength}자예요.`);
    if (decision === "CONDITIONAL" && amount === null) return setError("조건부 승인은 제안 한도를 적어요.");
    if (decision !== "REJECTED" && amount !== null && amount > application.requestedAmount) return setError("승인 금액은 요청 금액을 넘을 수 없어요.");
    const body: AdminOverrideRequest = { decision, reason: reason.trim() };
    if (decision !== "REJECTED" && amount !== null) body.amount = amount;
    if (decision !== "REJECTED" && rate !== null) body.rate = rate;
    setBusy(true);
    setError(null);
    try {
      const before = application.status;
      const updated = await adminApi.override(application.id, body);
      onChanged(updated);
      setReason("");
      setDone(`결정을 ${statusLabel(before).label}에서 ${DECISION_LABEL[decision]}(으)로 바꿨어요. 이전·이후·사유·운영자가 변경 이력에 남았어요.`);
    } catch (err) {
      setError(err instanceof ApiError && (err.status === 400 || err.status === 409) ? err.message : errorMessage(err, "결정을 바꾸지 못했어요. 잠시 뒤 다시 시도해요."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="admin-form" onSubmit={submit} aria-busy={busy} noValidate>
      <h3>결정 변경</h3>
      <p className="muted" style={{ fontSize: 15 }}>자동 심사 결과를 운영자가 바꿔요. 사유는 {MIN_REASON}자 이상이며 이전·이후 결정과 함께 기록돼요.</p>
      <div className="field">
        <label className="field-label" htmlFor="ov-decision">결정</label>
        <select id="ov-decision" className="field-select" value={decision} onChange={e => setDecision(e.target.value as Decision)}>
          <option value="APPROVED">승인</option>
          <option value="CONDITIONAL">조건부 승인(한도 축소)</option>
          <option value="REJECTED">거절</option>
        </select>
      </div>
      {decision !== "REJECTED" && (
        <>
          <MoneyInput label={decision === "CONDITIONAL" ? "제안 한도" : "승인 금액"} value={amount} onChange={setAmount} hint="비우면 자동 심사의 제안 금액을 유지해요." required={decision === "CONDITIONAL"} />
          <RateInput label="적용 금리" value={rate} onChange={setRate} hint="비우면 자동 심사 금리를 유지해요." />
        </>
      )}
      <div className="field">
        <label className="field-label" htmlFor="ov-reason">변경 사유</label>
        <textarea id="ov-reason" className="field-textarea" rows={3} value={reason} onChange={e => setReason(e.target.value)} aria-describedby="ov-reason-hint" required minLength={MIN_REASON} />
        <p id="ov-reason-hint" className="field-hint">{MIN_REASON}자 이상. 지금 {reasonLength}자. 예: "소득 증빙 추가 확인 후 한도 상향".</p>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {done && <p className="form-done" role="status" aria-live="polite">{done}</p>}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy || reasonLength < MIN_REASON}>{busy ? "바꾸고 있어요…" : "결정 바꾸기"}</button>
      </div>
    </form>
  );
}
