import { useState } from "react";
import type { ContentStatus, ContentValidationItem } from "../../../api/types";
import type { ActionKind } from "./useContentActions";
import StatusChip from "../../../components/StatusChip";
import { CONTENT_STATUS, formatDateTime } from "../parts/adminLabels";
import ValidationList from "./ValidationList";

/** 편집 머리: 식별자·상태·버전·초안 여부·수정 시각. */
export function EditorHead({ eyebrow, title, id, status, contentVersion, hasDraft, updatedAt, publishedAt }: { eyebrow: string; title: string; id: string; status: ContentStatus; contentVersion: number; hasDraft: boolean; updatedAt: string; publishedAt?: string | null }) {
  const chip = CONTENT_STATUS[status];
  return (
    <div className="admin-editor-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p className="faint admin-editor-meta"><code className="admin-code">{id}</code> · 수정 {formatDateTime(updatedAt)}{publishedAt !== undefined && <> · 게시 {formatDateTime(publishedAt)}</>}</p>
      </div>
      <p className="admin-chips">
        <StatusChip label={chip.label} tone={chip.tone} />
        <StatusChip label={`v${contentVersion}`} tone="neutral" />
        {hasDraft && <StatusChip label="저장된 초안 편집 중" tone="info" />}
      </p>
    </div>
  );
}

/** 편집 하단: 모드 토글 + 저장·게시·내림 + 결과 문장 + 검증 문제. 내림은 한 번 더 확인한다(키보드만으로 가능). */
export function EditorActions({ mode, onToggleMode, busy, hasDraft, status, onSave, onPublish, onRetire, message, error, problems, jsonError }: {
  mode: "fields" | "json"; onToggleMode: () => void; busy: ActionKind | null; hasDraft: boolean; status: ContentStatus;
  onSave: () => void; onPublish: () => void; onRetire: () => void; message: string | null; error: string | null; problems: ContentValidationItem[]; jsonError: string | null;
}) {
  const [confirmRetire, setConfirmRetire] = useState(false);
  return (
    <div className="admin-editor-actions">
      {jsonError && <p className="form-error" role="alert">{jsonError}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="form-done" role="status" aria-live="polite">{message}</p>}
      <ValidationList problems={problems} />
      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={onToggleMode} aria-pressed={mode === "json"}>{mode === "json" ? "필드별로 편집" : "JSON 원문으로 편집"}</button>
        <button type="submit" className="btn btn-primary" disabled={busy !== null} onClick={onSave}>{busy === "save" ? "저장하고 있어요…" : "초안 저장"}</button>
        <button type="button" className="btn btn-secondary" disabled={busy !== null || !hasDraft} onClick={onPublish} title={hasDraft ? undefined : "먼저 초안을 저장해요"}>{busy === "publish" ? "검증하고 게시하는 중…" : "검증 후 게시"}</button>
        {status !== "RETIRED" && !confirmRetire && <button type="button" className="btn btn-danger" disabled={busy !== null} onClick={() => setConfirmRetire(true)}>내리기</button>}
        {status !== "RETIRED" && confirmRetire && (
          <span className="admin-confirm" role="group" aria-label="내림 확인">
            <span>학습·사전 화면에서 숨겨요. 진척 기록은 남아요.</span>
            <button type="button" className="btn btn-danger btn-small" disabled={busy !== null} onClick={() => { setConfirmRetire(false); onRetire(); }}>{busy === "retire" ? "내리는 중…" : "내림 확정"}</button>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => setConfirmRetire(false)}>취소</button>
          </span>
        )}
      </div>
      <p className="faint">초안 저장은 게시본을 건드리지 않아요. 게시는 트리 전체를 다시 검증한 뒤 버전을 1 올리고 이력에 남겨요.</p>
    </div>
  );
}

/** JSON 원문 편집 상자. 파싱 오류는 문장으로. */
export function JsonEditor({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="field admin-json">
      <label className="field-label" htmlFor="json-editor">{label}</label>
      <textarea id="json-editor" className="field-textarea admin-mono" rows={28} value={value} onChange={e => onChange(e.target.value)} spellCheck={false} />
      <p className="field-hint">계약 스키마의 필드 이름을 그대로 쓴다. "필드별로 편집"으로 돌아갈 때 파싱하고, 틀리면 이 상자에 머문다.</p>
    </div>
  );
}
