import DataTable, { type Column } from "../../../components/DataTable";
import StatusChip, { statusLabel } from "../../../components/StatusChip";
import type { ScreeningReason } from "../../../api/types";
import { REASON_CODE_LABEL, RULE_LABEL } from "./labels";

/**
 * 심사 근거(ADR-008: 모든 규칙의 입력·기준·결과). 자격 → 금리 → 한도 → 결정 순서 그대로 보여 준다.
 * 거절·조건부면 표 위에 "왜 그렇게 됐나"를 사유 코드와 함께 먼저 요약한다(표를 끝까지 읽지 않아도 이유가 읽히게).
 * S-07 심사 시뮬레이터와 S-14 신청·심사 결과가 같이 쓰는 공식 구현이다.
 */
export default function ScreeningReasons({ reasons, caption = "심사 근거", captionNote }: { reasons: ScreeningReason[]; caption?: string; captionNote?: string }) {
  // 결정을 바꾼 줄: 미충족(FAIL)이거나 사유 코드가 달린 줄.
  const blocking = reasons.filter(r => r.outcome === "FAIL" || r.reasonCode !== null);
  const hasFail = blocking.some(r => r.outcome === "FAIL");

  const columns: Column<ScreeningReason>[] = [
    { key: "no", header: "순서", numeric: true, width: "56px", render: r => r.orderNo },
    { key: "rule", header: "규칙", rowHeader: true, render: r => <><span className="reason-rule">{RULE_LABEL[r.ruleCode] ?? r.ruleCode}</span><code className="reason-code">{r.ruleCode}</code></> },
    { key: "input", header: "입력", render: r => r.input },
    { key: "threshold", header: "기준", render: r => r.threshold },
    { key: "outcome", header: "결과", render: r => { const { label, tone } = statusLabel(r.outcome); return <StatusChip label={label} tone={tone} />; } },
    { key: "message", header: "설명", render: r => <>{r.message}{r.reasonCode && <span className="reason-reason">사유 {REASON_CODE_LABEL[r.reasonCode] ?? r.reasonCode} <code className="reason-code">{r.reasonCode}</code></span>}</> },
  ];
  return (
    <div className="reason-block">
      {blocking.length > 0 && (
        <section className={`reason-summary${hasFail ? "" : " is-warn"}`} aria-labelledby="reason-summary-title">
          <h3 id="reason-summary-title">{hasFail ? `충족하지 못한 규칙 ${blocking.length}개` : `결정을 바꾼 사유 ${blocking.length}개`}</h3>
          <ul>
            {blocking.map(r => (
              <li key={r.orderNo}>
                <span className="rule">
                  {RULE_LABEL[r.ruleCode] ?? r.ruleCode}
                  {r.reasonCode && <StatusChip label={REASON_CODE_LABEL[r.reasonCode] ?? r.reasonCode} tone={hasFail ? "danger" : "warn"} />}
                  <code className="reason-code">{r.reasonCode ?? r.ruleCode}</code>
                </span>
                <span className="msg">{r.message}</span>
                <span className="basis">입력 {r.input} · 기준 {r.threshold}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <DataTable
        caption={caption}
        captionNote={captionNote ?? "자격 → 금리 → 한도 → 결정 순서로 평가한 규칙별 입력·기준·결과이다. 자격에서 하나라도 미충족이면 거절이지만 나머지 자격 규칙도 평가해 사유를 모두 보여 준다."}
        columns={columns}
        rows={reasons}
        rowKey={r => r.orderNo}
        compact
        scroll
      />
    </div>
  );
}
