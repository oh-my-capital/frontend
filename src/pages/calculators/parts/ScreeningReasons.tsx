import DataTable, { type Column } from "../../../components/DataTable";
import StatusChip, { statusLabel } from "../../../components/StatusChip";
import type { ScreeningReason } from "../../../api/types";
import { REASON_CODE_LABEL, RULE_LABEL } from "./labels";

/**
 * 심사 근거 표(ADR-008: 모든 규칙의 입력·기준·결과). 자격 → 금리 → 한도 → 결정 순서 그대로 보여 준다.
 * S-07 심사 시뮬레이터와 S-14 신청·심사 결과가 같이 쓰는 공식 구현이다. 운영 콘솔(pages/admin/parts)의 임시 구현과
 * props 가 같으므로 WP11에서 이 파일로 통일한다. 규칙 코드는 그대로 두고 한국어 이름을 앞에 붙인다.
 */
export default function ScreeningReasons({ reasons, caption = "심사 근거", captionNote }: { reasons: ScreeningReason[]; caption?: string; captionNote?: string }) {
  const columns: Column<ScreeningReason>[] = [
    { key: "no", header: "순서", numeric: true, width: "56px", render: r => r.orderNo },
    { key: "rule", header: "규칙", rowHeader: true, render: r => <><span className="reason-rule">{RULE_LABEL[r.ruleCode] ?? r.ruleCode}</span><code className="reason-code">{r.ruleCode}</code></> },
    { key: "input", header: "입력", render: r => r.input },
    { key: "threshold", header: "기준", render: r => r.threshold },
    { key: "outcome", header: "결과", render: r => { const { label, tone } = statusLabel(r.outcome); return <StatusChip label={label} tone={tone} />; } },
    { key: "message", header: "설명", render: r => <>{r.message}{r.reasonCode && <span className="reason-reason">사유 {REASON_CODE_LABEL[r.reasonCode] ?? r.reasonCode} <code className="reason-code">{r.reasonCode}</code></span>}</> },
  ];
  return (
    <DataTable
      caption={caption}
      captionNote={captionNote ?? "자격 → 금리 → 한도 → 결정 순서로 평가한 규칙별 입력·기준·결과이다. 자격에서 하나라도 미충족이면 거절이지만 나머지 자격 규칙도 평가해 사유를 모두 보여 준다."}
      columns={columns}
      rows={reasons}
      rowKey={r => r.orderNo}
      compact
      scroll
    />
  );
}
