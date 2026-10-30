import { useState, type FormEvent } from "react";
import { adminApi } from "../../../api/admin";
import type { AdminConcept, ConceptDraft, ConceptDraftSection, ContentSource, LinkedCalculator, Misconception, QuizDraft } from "../../../api/types";
import { EditorActions, EditorHead, JsonEditor } from "./editorShared";
import { JSON_INVALID, useContentActions, type ActionKind } from "./useContentActions";
import { Fieldset, RepeatItem, SelectField, TextArea, TextField } from "./fields";
import { linesToList, parseJson } from "./listText";

const CALCULATORS: { value: string; label: string }[] = [
  { value: "", label: "없음" }, { value: "schedule", label: "상환 스케줄 계산기" }, { value: "screening", label: "심사 시뮬레이터" }, { value: "prepayment", label: "중도상환 견적" },
];

/** 응답(AdminConcept)에서 저장 본문(ConceptDraft)만 떼어 낸다. 메타(id·status·버전)는 서버가 정한다. */
function toDraft(c: AdminConcept): ConceptDraft {
  return {
    orderNo: c.orderNo, title: c.title, summary: c.summary,
    sections: c.sections.map(s => ({ heading: s.heading, body: s.body, figure: s.figure ?? null })),
    misconceptions: (c.misconceptions ?? []).map(m => ({ ...m })),
    checklist: [...(c.checklist ?? [])],
    linkedCalculator: c.linkedCalculator ?? null,
    sandboxTask: c.sandboxTask ?? null,
    sources: c.sources.map(s => ({ ...s })),
    quizzes: c.quizzes.map(q => ({ id: q.id ?? null, question: q.question, options: q.options.map(o => ({ id: o.id ?? null, text: o.text, correct: o.correct, feedback: o.feedback ?? "" })), explanation: q.explanation, nextAction: q.nextAction ?? null })),
  };
}
const emptyQuiz = (): QuizDraft => ({ id: null, question: "", options: [0, 1, 2, 3].map(i => ({ id: null, text: "", correct: i === 0, feedback: "" })), explanation: "", nextAction: null });

/**
 * 개념 편집 폼(S-22): 필드별 입력(기본·본문 절·흔한 오해·체크리스트·출처·확인 문제) ↔ JSON 원문 토글.
 * 저장 본문은 계약의 ConceptDraft 그대로다. 정답은 문항마다 라디오 1개.
 */
export default function ConceptEditor({ concept, onChanged }: { concept: AdminConcept; onChanged: (view: AdminConcept, kind: ActionKind) => void }) {
  const [draft, setDraft] = useState<ConceptDraft>(() => toDraft(concept));
  const [mode, setMode] = useState<"fields" | "json">("fields");
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  /** 지금 화면의 본문. JSON 모드면 파싱해서 쓴다(틀리면 null). */
  const currentDraft = (): ConceptDraft | null => {
    if (mode === "fields") return draft;
    const parsed = parseJson<ConceptDraft>(jsonText);
    if (parsed.error !== null) { setJsonError(parsed.error); return null; }
    setJsonError(null);
    return parsed.value;
  };
  const toggleMode = () => {
    if (mode === "fields") { setJsonText(JSON.stringify(draft, null, 2)); setJsonError(null); setMode("json"); return; }
    const parsed = parseJson<ConceptDraft>(jsonText);
    if (parsed.error !== null) { setJsonError(parsed.error); return; }
    setDraft(parsed.value); setJsonError(null); setMode("fields");
  };

  const actions = useContentActions<AdminConcept>({
    save: async () => { const body = currentDraft(); if (!body) throw new Error(JSON_INVALID); return adminApi.saveConceptDraft(concept.id, body); },
    publish: () => adminApi.publishConcept(concept.id),
    retire: () => adminApi.retireConcept(concept.id),
  }, (view, kind) => { setDraft(toDraft(view)); if (mode === "json") setJsonText(JSON.stringify(toDraft(view), null, 2)); onChanged(view, kind); });

  const patch = (p: Partial<ConceptDraft>) => setDraft(d => ({ ...d, ...p }));
  const setSection = (i: number, p: Partial<ConceptDraftSection>) => patch({ sections: draft.sections.map((s, k) => (k === i ? { ...s, ...p } : s)) });
  const setMis = (i: number, p: Partial<Misconception>) => patch({ misconceptions: (draft.misconceptions ?? []).map((m, k) => (k === i ? { ...m, ...p } : m)) });
  const setSource = (i: number, p: Partial<ContentSource>) => patch({ sources: draft.sources.map((s, k) => (k === i ? { ...s, ...p } : s)) });
  const setQuiz = (i: number, p: Partial<QuizDraft>) => patch({ quizzes: draft.quizzes.map((q, k) => (k === i ? { ...q, ...p } : q)) });
  const setOption = (qi: number, oi: number, p: Partial<QuizDraft["options"][number]>) => setQuiz(qi, { options: draft.quizzes[qi].options.map((o, k) => (k === oi ? { ...o, ...p } : o)) });
  const setCorrect = (qi: number, oi: number) => setQuiz(qi, { options: draft.quizzes[qi].options.map((o, k) => ({ ...o, correct: k === oi })) });

  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); actions.run("save", v => `초안을 저장했어요(v${v.contentVersion} 게시본은 그대로). 검증 후 게시하면 학습 화면에 반영돼요.`); };

  return (
    <form className="admin-editor" onSubmit={submit} aria-busy={actions.busy !== null} noValidate>
      <EditorHead eyebrow="개념 편집" title={draft.title || concept.title} id={concept.id} status={concept.status} contentVersion={concept.contentVersion} hasDraft={concept.hasDraft} updatedAt={concept.updatedAt} publishedAt={concept.publishedAt} />

      {mode === "json" ? <JsonEditor label="ConceptDraft JSON" value={jsonText} onChange={setJsonText} /> : (
        <>
          <Fieldset legend="기본">
            <div className="admin-two">
              <TextField label="순서" value={String(draft.orderNo)} inputMode="numeric" onChange={v => patch({ orderNo: Number(v.replace(/\D/g, "")) || 0 })} hint="입문 과정 목차의 번호(1~12)." />
              <SelectField label="연결 계산기" required={false} value={draft.linkedCalculator ?? ""} onChange={v => patch({ linkedCalculator: (v || null) as LinkedCalculator | null })} options={CALCULATORS} />
            </div>
            <TextField label="제목" value={draft.title} onChange={v => patch({ title: v })} />
            <TextArea label="요약" value={draft.summary} onChange={v => patch({ summary: v })} rows={2} hint="목차와 홈에 보이는 한두 문장." />
            <TextField label="샌드박스 과제" required={false} value={draft.sandboxTask ?? ""} onChange={v => patch({ sandboxTask: v || null })} hint="예: 내 모의 여신에서 1회 미납 뒤 30일 진행" />
          </Fieldset>

          <Fieldset legend={`본문 절 ${draft.sections.length}개`} hint="제목·본문은 필수. figure는 ConceptDiagram의 SVG 식별자." actions={<button type="button" className="btn btn-secondary btn-small" onClick={() => patch({ sections: [...draft.sections, { heading: "", body: "", figure: null }] })}>절 추가</button>}>
            {draft.sections.map((s, i) => (
              <RepeatItem key={i} index={i} title={s.heading || "새 절"} onRemove={() => patch({ sections: draft.sections.filter((_, k) => k !== i) })}>
                <div className="admin-two">
                  <TextField label="절 제목" value={s.heading} onChange={v => setSection(i, { heading: v })} />
                  <TextField label="그림 식별자" required={false} value={s.figure ?? ""} onChange={v => setSection(i, { figure: v || null })} />
                </div>
                <TextArea label="본문" value={s.body} onChange={v => setSection(i, { body: v })} rows={4} />
              </RepeatItem>
            ))}
          </Fieldset>

          <Fieldset legend={`흔한 오해 ${(draft.misconceptions ?? []).length}개`} actions={<button type="button" className="btn btn-secondary btn-small" onClick={() => patch({ misconceptions: [...(draft.misconceptions ?? []), { claim: "", correction: "" }] })}>오해 추가</button>}>
            {(draft.misconceptions ?? []).map((m, i) => (
              <RepeatItem key={i} index={i} title={m.claim || "새 항목"} onRemove={() => patch({ misconceptions: (draft.misconceptions ?? []).filter((_, k) => k !== i) })}>
                <TextField label="오해" value={m.claim} onChange={v => setMis(i, { claim: v })} />
                <TextArea label="바로잡기" value={m.correction} onChange={v => setMis(i, { correction: v })} rows={2} />
              </RepeatItem>
            ))}
          </Fieldset>

          <Fieldset legend="체크리스트">
            <TextArea label="항목(한 줄에 하나)" required={false} value={(draft.checklist ?? []).join("\n")} onChange={v => patch({ checklist: linesToList(v) })} rows={3} />
          </Fieldset>

          <Fieldset legend={`출처 ${draft.sources.length}개`} hint="공식 기관 URL(go.kr·or.kr 등)과 확인일이 필요하다. 게시 검증에서 걸린다." actions={<button type="button" className="btn btn-secondary btn-small" onClick={() => patch({ sources: [...draft.sources, { title: "", url: "", checkedOn: "" }] })}>출처 추가</button>}>
            {draft.sources.map((s, i) => (
              <RepeatItem key={i} index={i} title={s.title || "새 출처"} onRemove={draft.sources.length > 1 ? () => patch({ sources: draft.sources.filter((_, k) => k !== i) }) : undefined}>
                <TextField label="제목" value={s.title} onChange={v => setSource(i, { title: v })} />
                <div className="admin-two">
                  <TextField label="URL" type="url" inputMode="url" value={s.url} onChange={v => setSource(i, { url: v })} />
                  <TextField label="확인일" type="date" value={s.checkedOn} onChange={v => setSource(i, { checkedOn: v })} />
                </div>
              </RepeatItem>
            ))}
          </Fieldset>

          <Fieldset legend={`확인 문제 ${draft.quizzes.length}문항`} hint="선택지 4개, 정답 1개, 해설 필수. 기존 문항의 id는 유지된다." actions={<button type="button" className="btn btn-secondary btn-small" onClick={() => patch({ quizzes: [...draft.quizzes, emptyQuiz()] })}>문항 추가</button>}>
            {draft.quizzes.map((q, qi) => (
              <RepeatItem key={qi} index={qi} title={q.id ? `문항 #${q.id}` : "새 문항"} onRemove={draft.quizzes.length > 1 ? () => patch({ quizzes: draft.quizzes.filter((_, k) => k !== qi) }) : undefined}>
                <TextArea label="질문" value={q.question} onChange={v => setQuiz(qi, { question: v })} rows={2} />
                <fieldset className="admin-options">
                  <legend>선택지와 정답</legend>
                  {q.options.map((o, oi) => (
                    <div key={oi} className="admin-option">
                      <label className="field-check admin-option-correct">
                        <input type="radio" name={`quiz-${qi}-correct`} checked={o.correct} onChange={() => setCorrect(qi, oi)} />
                        <span>정답</span>
                      </label>
                      <TextField label={`선택지 ${oi + 1}`} value={o.text} onChange={v => setOption(qi, oi, { text: v })} />
                      <TextField label="피드백" required={false} value={o.feedback ?? ""} onChange={v => setOption(qi, oi, { feedback: v })} />
                    </div>
                  ))}
                </fieldset>
                <TextArea label="해설" value={q.explanation} onChange={v => setQuiz(qi, { explanation: v })} rows={2} />
                <TextField label="다음 행동" required={false} value={q.nextAction ?? ""} onChange={v => setQuiz(qi, { nextAction: v || null })} hint="틀렸을 때 안내할 한 문장." />
              </RepeatItem>
            ))}
          </Fieldset>
        </>
      )}

      <EditorActions
        mode={mode} onToggleMode={toggleMode} busy={actions.busy} hasDraft={concept.hasDraft} status={concept.status}
        onSave={() => undefined}
        onPublish={() => actions.run("publish", v => `v${v.contentVersion}으로 게시했어요. 학습 화면은 다음 조회부터 새 내용을 보여 줘요.`)}
        onRetire={() => actions.run("retire", () => "개념을 내렸어요. 학습 화면에서 숨겨지고 진척 기록은 남아요.")}
        message={actions.message} error={actions.error} problems={actions.problems} jsonError={jsonError}
      />
    </form>
  );
}
