import DataTable, { type Column } from "../../../components/DataTable";
import StatusChip, { statusLabel } from "../../../components/StatusChip";
import type { ScreeningReason } from "../../../api/types";

/**
 * 심사 근거 표(ADR-008: 모든 규칙의 입력·기준·결과). WP7의 ScreeningReasons 와 같은 props 로 만든 임시 구현이다.
 * WP7 병합 뒤 WP11에서 components/ 의 것으로 통일하고 이 파일은 지운다.
 */
export default function ScreeningReasons({ reasons, caption = "심사 근거" }: { reasons: ScreeningReason[]; caption?: string }) {
  const columns: Column<ScreeningReason>[] = [
    { key: "no", header: "순서", numeric: true, render: r => r.orderNo },
    { key: "rule", header: "규칙", rowHeader: true, render: r => <code>{r.ruleCode}</code> },
    { key: "input", header: "입력", render: r => r.input },
    { key: "threshold", header: "기준", render: r => r.threshold },
    { key: "outcome", header: "결과", render: r => { const { label, tone } = statusLabel(r.outcome); return <StatusChip label={label} tone={tone} />; } },
    { key: "message", header: "설명", render: r => <>{r.message}{r.reasonCode && <span className="faint" style={{ marginLeft: 6 }}>{r.reasonCode}</span>}</> },
  ];
  return <DataTable caption={caption} captionNote="자격 → 금리 → 한도 → 결정 순서로 평가한 규칙별 입력·기준·결과이다." columns={columns} rows={reasons} rowKey={r => r.orderNo} compact scroll />;
}
