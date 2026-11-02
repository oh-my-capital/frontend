import { useEffect, useRef, useState, type ReactNode } from "react";
import { errorMessage } from "../../../api/client";
import { REASON_MAX, REASON_MIN, ruleChangesApi, type Backtest, type BacktestExample, type BacktestOutcome, type RuleChange } from "../../../api/ruleChanges";
import DataTable, { type Column } from "../../../components/DataTable";
import Disclosure from "../../../components/Disclosure";
import LoadError from "../../../components/LoadError";
import Loading from "../../../components/Loading";
import Money from "../../../components/Money";
import StatusChip from "../../../components/StatusChip";
import { formatDate, formatNumber, formatRate } from "../../../lib/format";
import { formatDateTime } from "../parts/adminLabels";
import { useLoad } from "../parts/useLoad";
import { DECISION_TEXT, DECISION_TONE, changeStatus, formatDelta, formatPointDelta, formatValue } from "./ruleLabels";

/**
 * 기안 상세(S-311): 전후 비교(dl) → 결재 요청·결재·반려(자기 기안이면 비활성 + 이유) → 백테스트(전후 지표 표·바뀐 건 예시).
 * 행동 결과는 aria-live 한 줄로 알리고 목록도 다시 불러온다.
 */
export default function RuleChangeDetail({ id, onChanged, onClose }: { id: number; onChanged: () => void; onClose: () => void }) {
  const change = useLoad(() => ruleChangesApi.get(id), [id]);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [id]);

  return (
    <section className="panel admin-detail rules-detail" aria-labelledby="rules-detail-title">
      <div className="admin-detail-head">
        <div>
          <p className="faint">규칙 변경 기안</p>
          <h2 id="rules-detail-title" ref={heading} tabIndex={-1}>기안 #{id}</h2>
        </div>
        <button type="button" className="btn btn-secondary btn-small" onClick={onClose}>닫기</button>
      </div>
      {change.loading && !change.data && <Loading message="기안을 불러오고 있어요" minHeight={160} />}
      {change.error != null && <LoadError error={change.error} onRetry={change.reload} />}
      {change.data && (
        <>
          <Comparison c={change.data} />
          <Actions key={`${change.data.id}-${change.data.status}`} c={change.data} onDone={updated => { change.setData(updated); onChanged(); }} />
          <BacktestSection c={change.data} />
        </>
      )}
    </section>
  );
}

function Comparison({ c }: { c: RuleChange }) {
  const s = changeStatus(c);
  return (
    <div className="stack rules-compare">
      <p className="rules-version-line">
        <StatusChip label={s.label} tone={s.tone} />
        <span>기준 {c.baseVersion} → {c.targetVersion ?? "결재되면 새 버전"}</span>
      </p>
      <dl className="def-list admin-def">
        <dt>항목</dt><dd>{c.label} <code className="faint">{c.key}</code></dd>
        <dt>기존 값</dt><dd className="num">{formatValue(c.oldValue, c.unit, c.scale)}</dd>
        <dt>새 값</dt><dd className="num rules-new">{formatValue(c.newValue, c.unit, c.scale)}</dd>
        <dt>차이</dt><dd className="num">{formatDelta(c.oldValue, c.newValue, c.unit, c.scale)}</dd>
        <dt>시행일</dt><dd>{formatDate(c.effectiveFrom)}(실제 날짜){c.inEffect ? " · 오늘 새 신청에 쓰는 버전" : ""}</dd>
        <dt>사유</dt><dd>{c.reason}</dd>
        <dt>기안</dt><dd>{c.drafter.label}{c.draftedByMe ? "(나)" : ""} · {formatDateTime(c.createdAt)}{c.submittedAt ? ` · 요청 ${formatDateTime(c.submittedAt)}` : ""}</dd>
        <dt>결재</dt>
        <dd>{c.reviewer ? `${c.reviewer.label} · ${formatDateTime(c.reviewedAt)}` : "아직 없음"}{c.reviewComment ? ` · “${c.reviewComment}”` : ""}</dd>
      </dl>
    </div>
  );
}

function Actions({ c, onDone }: { c: RuleChange; onDone: (c: RuleChange) => void }) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const length = [...comment.trim()].length;
  const rejectOk = length >= REASON_MIN && length <= REASON_MAX;

  const run = async (action: () => Promise<RuleChange>, message: string) => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const updated = await action();
      setDone(message);
      onDone(updated);
    } catch (err) {
      setError(errorMessage(err, "처리하지 못했어요. 잠시 뒤 다시 시도해요."));
    } finally {
      setBusy(false);
    }
  };

  if (c.status === "DRAFT") {
    return (
      <div className="rules-actions">
        <h3>결재 요청</h3>
        {c.canSubmit
          ? <p className="field-hint">요청하면 다른 운영자가 결재하거나 반려해요. 그 전에 아래 백테스트로 영향을 확인해 두세요.</p>
          : <p className="field-hint">기안한 운영자({c.drafter.label})만 결재 요청할 수 있어요.</p>}
        <div className="form-actions">
          <button type="button" className="btn btn-primary" disabled={!c.canSubmit || busy} onClick={() => run(() => ruleChangesApi.submit(c.id), "결재를 요청했어요.")}>
            {busy ? "요청하고 있어요…" : "결재 요청"}
          </button>
        </div>
        <Feedback error={error} done={done} />
      </div>
    );
  }
  if (c.status !== "PENDING") {
    return <Feedback error={error} done={done} />;
  }
  const blocked = !c.canReview;
  return (
    <div className="rules-actions">
      <h3>결재</h3>
      {blocked && <p className="rules-blocked" role="note">{c.reviewBlockedReason ?? "이 기안을 결재할 수 없어요."}</p>}
      <div className="field">
        <label className="field-label" htmlFor="review-comment">의견(결재는 선택, 반려는 {REASON_MIN}자 이상)</label>
        <textarea id="review-comment" className="field-textarea" rows={3} value={comment} disabled={blocked} maxLength={REASON_MAX + 20}
          onChange={e => setComment(e.target.value)} aria-describedby="review-comment-count" />
        <p id="review-comment-count" className={`admin-counter${rejectOk ? " is-ok" : ""}`}>
          <span>{REASON_MAX}자 중 {length}자{length < REASON_MIN ? ` · 반려하려면 ${REASON_MIN - length}자 더` : ""}</span>
        </p>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-primary" disabled={blocked || busy}
          onClick={() => run(() => ruleChangesApi.approve(c.id, comment.trim() || undefined), "결재했어요. 새 규칙 버전이 생겼고 시행일부터 새 신청에 쓰여요.")}>
          결재
        </button>
        <button type="button" className="btn btn-danger" disabled={blocked || busy || !rejectOk}
          onClick={() => run(() => ruleChangesApi.reject(c.id, comment.trim()), "반려했어요.")}>
          반려
        </button>
      </div>
      <Feedback error={error} done={done} />
    </div>
  );
}

function Feedback({ error, done }: { error: string | null; done: string | null }) {
  return (
    <div aria-live="polite">
      {error && <p className="form-error" role="alert">{error}</p>}
      {done && <p className="form-done">{done}</p>}
    </div>
  );
}

function BacktestSection({ c }: { c: RuleChange }) {
  const [requested, setRequested] = useState(false);
  const bt = useLoad(() => ruleChangesApi.backtest(c.id), [c.id], requested);
  return (
    <div className="rules-backtest">
      <div className="section-head">
        <div>
          <h3>백테스트</h3>
          <p>지난 신청(전체 샌드박스, 최근 2,000건)을 기준 버전과 이 변경을 넣은 버전으로 각각 다시 심사해 비교한다. 읽기만 하고 아무것도 바꾸지 않는다.</p>
        </div>
      </div>
      {!requested && <button type="button" className="btn btn-secondary" onClick={() => setRequested(true)}>백테스트 실행</button>}
      {requested && bt.loading && <Loading message="지난 신청을 두 번씩 다시 심사하고 있어요" minHeight={120} />}
      {bt.error != null && <LoadError error={bt.error} onRetry={bt.reload} />}
      {bt.data && <BacktestResult b={bt.data} onRerun={bt.reload} />}
    </div>
  );
}

function BacktestResult({ b, onRerun }: { b: Backtest; onRerun: () => void }) {
  if (b.sampleSize === 0) {
    return <p className="muted">비교할 지난 신청이 없어요. 모의 여신에서 신청이 쌓이면 다시 실행해요.</p>;
  }
  type Row = { label: string; before: ReactNode; after: ReactNode; diff: string };
  const decisions = (["APPROVED", "CONDITIONAL", "REJECTED"] as const).map(d => ({
    label: DECISION_TEXT[d],
    before: `${formatNumber(b.before.decisions[d] ?? 0)}건`,
    after: `${formatNumber(b.after.decisions[d] ?? 0)}건`,
    diff: signed((b.after.decisions[d] ?? 0) - (b.before.decisions[d] ?? 0), "건"),
  }));
  const rows: Row[] = [
    { label: "평가한 신청", before: `${formatNumber(b.before.evaluated)}건`, after: `${formatNumber(b.after.evaluated)}건`, diff: "—" },
    { label: "승인율(승인+조건부)", before: formatRate(b.before.approvalRate), after: formatRate(b.after.approvalRate), diff: formatPointDelta(b.before.approvalRate, b.after.approvalRate) },
    { label: "평균 금리(승인 계열)", before: b.before.avgRate === null ? "—" : formatRate(b.before.avgRate), after: b.after.avgRate === null ? "—" : formatRate(b.after.avgRate), diff: formatPointDelta(b.before.avgRate, b.after.avgRate) },
    { label: "평균 한도(자격 통과)", before: <Money value={b.before.avgLimit} />, after: <Money value={b.after.avgLimit} />, diff: b.before.avgLimit === null || b.after.avgLimit === null ? "—" : signed(b.after.avgLimit - b.before.avgLimit, "원") },
    ...decisions,
  ];
  const columns: Column<Row>[] = [
    { key: "label", header: "지표", rowHeader: true, render: r => r.label },
    { key: "before", header: `전(${b.baseVersion})`, numeric: true, render: r => r.before },
    { key: "after", header: `후(${b.proposedLabel})`, numeric: true, render: r => r.after },
    { key: "diff", header: "차이", numeric: true, nowrap: true, render: r => r.diff },
  ];
  return (
    <div className="stack">
      <p className="rules-population">
        최근 {formatNumber(b.sampleSize)}건을 다시 심사했어요{b.truncated ? `(상한 ${formatNumber(b.limit)}건에서 잘림)` : ""}.
        {b.skipped > 0 ? ` 프로필이 없어 ${formatNumber(b.skipped)}건은 건너뛰었어요.` : ""}
        {b.differsFromStored > 0 ? ` ${formatNumber(b.differsFromStored)}건은 “전” 결과가 저장된 결정과 달라요(그 뒤 프로필 변경·운영자 변경).` : ""}
      </p>
      <DataTable caption={`${b.label} 변경 전후 지표`} captionNote="승인율 = (승인 + 조건부) ÷ 평가 × 100. 평균 금리는 승인 계열, 평균 한도는 자격을 통과한 건의 최종 한도 평균(원 미만 절사)."
        columns={columns} rows={rows} rowKey={r => r.label} scroll compact />
      <dl className="figure-row rules-changed">
        <div><dt>결정이 바뀐 건</dt><dd>{formatNumber(b.decisionChanged)}<small>건</small></dd></div>
        <div><dt>금리가 바뀐 건</dt><dd>{formatNumber(b.rateChanged)}<small>건</small></dd></div>
        <div><dt>한도가 바뀐 건</dt><dd>{formatNumber(b.limitChanged)}<small>건</small></dd></div>
      </dl>
      {b.examples.length > 0
        ? <ExampleTable examples={b.examples} />
        : <p className="muted">이 변경으로 결정·금리·한도가 바뀐 지난 신청이 없어요.</p>}
      <p className="faint">{b.notice}</p>
      <Disclosure />
      <div className="form-actions"><button type="button" className="btn btn-secondary btn-small" onClick={onRerun}>다시 실행</button></div>
    </div>
  );
}

function ExampleTable({ examples }: { examples: BacktestExample[] }) {
  const columns: Column<BacktestExample>[] = [
    {
      key: "app", header: "신청", rowHeader: true, nowrap: true,
      render: e => <>{e.applicationNo}<span className="admin-sub faint">{e.productName}</span></>,
    },
    { key: "score", header: "점수·밴드", nowrap: true, render: e => `${e.creditScore}점 · ${band(e.before)}${band(e.after) !== band(e.before) ? ` → ${band(e.after)}` : ""}` },
    { key: "decision", header: "결정 전 → 후", render: e => <><Decision o={e.before} /> → <Decision o={e.after} /></> },
    { key: "rate", header: "금리 전 → 후", numeric: true, nowrap: true, render: e => `${rate(e.before)} → ${rate(e.after)}` },
    { key: "limit", header: "한도 전 → 후", numeric: true, render: e => <><Money value={e.before.finalLimit} /><span className="admin-sub">→ <Money value={e.after.finalLimit} /></span></> },
  ];
  return (
    <DataTable caption="바뀐 건 예시" captionNote="결정이 바뀐 건 먼저, 그다음 금리·한도만 바뀐 건(최대 20건). 점수는 가상 고객 프로필의 지금 값이다."
      columns={columns} rows={examples} rowKey={e => e.applicationId} scroll compact />
  );
}

function Decision({ o }: { o: BacktestOutcome }) {
  return <StatusChip label={DECISION_TEXT[o.decision]} tone={DECISION_TONE[o.decision]} />;
}

function band(o: BacktestOutcome): string {
  return o.creditBand ?? "밴드 없음";
}

function rate(o: BacktestOutcome): string {
  return o.appliedRate === null ? "—" : formatRate(o.appliedRate);
}

function signed(n: number, unit: string): string {
  if (n === 0) return "변화 없음";
  return `${n > 0 ? "+" : "−"}${formatNumber(Math.abs(n))}${unit}`;
}
