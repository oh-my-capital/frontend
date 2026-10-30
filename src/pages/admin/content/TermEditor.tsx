import { useState, type FormEvent } from "react";
import { adminApi } from "../../../api/admin";
import type { AdminTerm, TermCategory, TermDraft } from "../../../api/types";
import { EditorActions, EditorHead, JsonEditor } from "./editorShared";
import { JSON_INVALID, useContentActions, type ActionKind } from "./useContentActions";
import { Fieldset, SelectField, TextArea, TextField } from "./fields";
import { commaToList, parseJson } from "./listText";

const CATEGORIES: TermCategory[] = ["업무", "금리", "상환", "심사", "연체", "건전성", "리스"];

function toDraft(t: AdminTerm): TermDraft {
  return {
    term: t.term, english: t.english ?? null, category: t.category, definition: t.definition, formula: t.formula ?? null, example: t.example ?? null,
    caution: t.caution ?? null, relatedSlugs: [...(t.relatedSlugs ?? [])], conceptIds: [...(t.conceptIds ?? [])], sourceUrl: t.sourceUrl, sourceCheckedOn: t.sourceCheckedOn,
  };
}

/** 용어 편집 폼(S-22): 필드별 입력 ↔ JSON 원문. 저장 본문은 계약의 TermDraft 그대로다. */
export default function TermEditor({ term, onChanged }: { term: AdminTerm; onChanged: (view: AdminTerm, kind: ActionKind) => void }) {
  const [draft, setDraft] = useState<TermDraft>(() => toDraft(term));
  const [mode, setMode] = useState<"fields" | "json">("fields");
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [related, setRelated] = useState((term.relatedSlugs ?? []).join(", "));
  const [conceptIds, setConceptIds] = useState((term.conceptIds ?? []).join(", "));

  const currentDraft = (): TermDraft | null => {
    if (mode === "fields") return { ...draft, relatedSlugs: commaToList(related), conceptIds: commaToList(conceptIds) };
    const parsed = parseJson<TermDraft>(jsonText);
    if (parsed.error !== null) { setJsonError(parsed.error); return null; }
    setJsonError(null);
    return parsed.value;
  };
  const toggleMode = () => {
    if (mode === "fields") { setJsonText(JSON.stringify(currentDraft(), null, 2)); setJsonError(null); setMode("json"); return; }
    const parsed = parseJson<TermDraft>(jsonText);
    if (parsed.error !== null) { setJsonError(parsed.error); return; }
    setDraft(parsed.value); setRelated((parsed.value.relatedSlugs ?? []).join(", ")); setConceptIds((parsed.value.conceptIds ?? []).join(", ")); setJsonError(null); setMode("fields");
  };

  const actions = useContentActions<AdminTerm>({
    save: async () => { const body = currentDraft(); if (!body) throw new Error(JSON_INVALID); return adminApi.saveTermDraft(term.slug, body); },
    publish: () => adminApi.publishTerm(term.slug),
    retire: () => adminApi.retireTerm(term.slug),
  }, (view, kind) => { const d = toDraft(view); setDraft(d); setRelated((d.relatedSlugs ?? []).join(", ")); setConceptIds((d.conceptIds ?? []).join(", ")); if (mode === "json") setJsonText(JSON.stringify(d, null, 2)); onChanged(view, kind); });

  const patch = (p: Partial<TermDraft>) => setDraft(d => ({ ...d, ...p }));
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); actions.run("save", v => `초안을 저장했어요(v${v.contentVersion} 게시본은 그대로). 검증 후 게시하면 용어 사전에 반영돼요.`); };

  return (
    <form className="admin-editor" onSubmit={submit} aria-busy={actions.busy !== null} noValidate>
      <EditorHead eyebrow="용어 편집" title={draft.term || term.term} id={term.slug} status={term.status} contentVersion={term.contentVersion} hasDraft={term.hasDraft} updatedAt={term.updatedAt} />

      {mode === "json" ? <JsonEditor label="TermDraft JSON" value={jsonText} onChange={setJsonText} /> : (
        <>
          <Fieldset legend="기본">
            <div className="admin-two">
              <TextField label="용어" value={draft.term} onChange={v => patch({ term: v })} />
              <TextField label="영문" required={false} value={draft.english ?? ""} onChange={v => patch({ english: v || null })} />
            </div>
            <SelectField label="분류" value={draft.category} onChange={v => patch({ category: v as TermCategory })} options={CATEGORIES.map(c => ({ value: c, label: c }))} hint="계약 열거형: 업무·금리·상환·심사·연체·건전성·리스." />
            <TextArea label="정의" value={draft.definition} onChange={v => patch({ definition: v })} rows={3} />
          </Fieldset>
          <Fieldset legend="보충">
            <TextField label="공식" required={false} value={draft.formula ?? ""} onChange={v => patch({ formula: v || null })} />
            <TextArea label="예시" required={false} value={draft.example ?? ""} onChange={v => patch({ example: v || null })} rows={2} hint="가능하면 계산 예시의 골든 값을 쓴다." />
            <TextArea label="주의" required={false} value={draft.caution ?? ""} onChange={v => patch({ caution: v || null })} rows={2} />
          </Fieldset>
          <Fieldset legend="연결">
            <TextField label="관련 용어 slug" required={false} value={related} onChange={setRelated} hint="쉼표로 구분. 예: dsr, ltv" />
            <TextField label="연결 개념 id" required={false} value={conceptIds} onChange={setConceptIds} hint="쉼표로 구분. 예: dsr-ltv-limit" />
          </Fieldset>
          <Fieldset legend="출처" hint="공식 기관 URL과 확인일. 게시 검증에서 걸린다.">
            <div className="admin-two">
              <TextField label="출처 URL" type="url" inputMode="url" value={draft.sourceUrl} onChange={v => patch({ sourceUrl: v })} />
              <TextField label="확인일" type="date" value={draft.sourceCheckedOn} onChange={v => patch({ sourceCheckedOn: v })} />
            </div>
          </Fieldset>
        </>
      )}

      <EditorActions
        mode={mode} onToggleMode={toggleMode} busy={actions.busy} hasDraft={term.hasDraft} status={term.status}
        onSave={() => undefined}
        onPublish={() => actions.run("publish", v => `v${v.contentVersion}으로 게시했어요. 용어 사전은 다음 조회부터 새 내용을 보여 줘요.`)}
        onRetire={() => actions.run("retire", () => "용어를 내렸어요. 용어 사전에서 숨겨져요.")}
        message={actions.message} error={actions.error} problems={actions.problems} jsonError={jsonError}
      />
    </form>
  );
}
