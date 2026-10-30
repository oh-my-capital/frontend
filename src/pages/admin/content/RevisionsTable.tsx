import type { ContentRevision } from "../../../api/types";
import DataTable, { type Column } from "../../../components/DataTable";
import StatusChip from "../../../components/StatusChip";
import { ENTITY_TYPE, formatDateTime, REVISION_ACTION } from "../parts/adminLabels";

function snapshotSummary(snapshot: Record<string, unknown>): string {
  const title = snapshot.title ?? snapshot.term ?? snapshot.question;
  return typeof title === "string" ? title : "";
}

/** 이력 표(content_revisions 최신순). 선택한 항목만 보거나 전체를 본다. */
export default function RevisionsTable({ rows, caption, captionNote }: { rows: ContentRevision[]; caption: string; captionNote?: string }) {
  const columns: Column<ContentRevision>[] = [
    { key: "at", header: "시각", rowHeader: true, render: r => <span className="admin-time">{formatDateTime(r.createdAt)}</span> },
    { key: "type", header: "종류", render: r => ENTITY_TYPE[r.entityType] ?? r.entityType },
    { key: "entity", header: "대상", render: r => <><code className="admin-code">{r.entityId}</code>{snapshotSummary(r.snapshot) && <span className="faint admin-sub">{snapshotSummary(r.snapshot)}</span>}</> },
    { key: "action", header: "동작", render: r => { const chip = REVISION_ACTION[r.action] ?? { label: r.action, tone: "neutral" as const }; return <StatusChip label={chip.label} tone={chip.tone} />; } },
    { key: "version", header: "버전", numeric: true, render: r => (r.contentVersion === null ? "—" : `v${r.contentVersion}`) },
    { key: "actor", header: "운영자", render: r => r.actorEmail },
  ];
  return <DataTable caption={caption} captionNote={captionNote} columns={columns} rows={rows} rowKey={r => r.id} compact scroll emptyMessage="아직 이력이 없어요. 초안을 저장하거나 게시하면 여기에 남아요." />;
}
