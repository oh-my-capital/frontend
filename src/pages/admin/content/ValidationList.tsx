import type { ContentValidationItem } from "../../../api/types";
import DataTable, { type Column } from "../../../components/DataTable";
import StatusChip from "../../../components/StatusChip";
import { ENTITY_TYPE } from "../parts/adminLabels";

/**
 * 검증 결과 표: 심각도·유형·대상·필드·문장. 검증 문제는 모두 게시를 막으므로(422 CONTENT_INVALID) 심각도는 "게시 차단" 하나다.
 * 유형은 문장을 보고 가른 것이며, 고치는 방법이 유형마다 다르다(참조는 대상 항목을, 누락은 이 항목을 고친다).
 */
function kindOf(message: string): string {
  if (message.includes("중복")) return "중복";
  if (message.includes("없는 ") || message.includes("가리키는")) return "참조";
  if (message.includes("없다") || message.includes("아니다") || message.includes("하나도")) return "누락";
  return "형식";
}

export default function ValidationList({ problems, title }: { problems: ContentValidationItem[]; title?: string }) {
  if (problems.length === 0) return null;
  const columns: Column<ContentValidationItem>[] = [
    { key: "severity", header: "심각도", nowrap: true, render: () => <StatusChip label="게시 차단" tone="danger" /> },
    { key: "kind", header: "유형", nowrap: true, render: p => kindOf(p.message) },
    { key: "entity", header: "대상", render: p => <>{ENTITY_TYPE[p.entityType] ?? p.entityType}<span className="faint admin-sub"><code className="admin-code">{p.entityId}</code></span></> },
    { key: "field", header: "필드", render: p => (p.field ? <code className="admin-code">{p.field}</code> : <span className="faint">—</span>) },
    { key: "message", header: "내용", render: p => p.message },
  ];
  return (
    <div className="admin-problems" role="alert">
      {title && <p className="admin-problems-title">{title}</p>}
      <DataTable
        caption={`검증 문제 ${problems.length}건`}
        captionNote="모두 게시를 막는 문제다. 유형은 문장으로 가른 것이며, 참조는 가리키는 대상을, 누락·형식은 이 항목을 고친다."
        columns={columns}
        rows={problems}
        rowKey={(p, i) => `${p.entityType}-${p.entityId}-${p.field ?? ""}-${i}`}
        compact
        scroll
      />
    </div>
  );
}
