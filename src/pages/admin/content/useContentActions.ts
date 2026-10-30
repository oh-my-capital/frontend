import { useState } from "react";
import { ApiError, errorMessage } from "../../../api/client";
import type { ContentValidationItem } from "../../../api/types";

export type ActionKind = "save" | "publish" | "retire";
/** JSON 원문이 파싱되지 않을 때 저장 함수가 던지는 표식. */
export const JSON_INVALID = "JSON_INVALID";

/**
 * 422 CONTENT_INVALID 의 검증 문제 목록. 계약(ContentValidationError)대로 ApiError.body.problems 를 먼저 읽고,
 * 없으면 details(field = "TYPE:id.field") 에서 되살린다(백엔드는 둘 다 채운다).
 */
export function problemsFromError(err: ApiError): ContentValidationItem[] {
  const problems = err.body?.problems;
  if (Array.isArray(problems) && problems.length > 0) return problems as ContentValidationItem[];
  return err.details.map(d => {
    const m = (d.field ?? "").match(/^(CONCEPT|QUIZ|TERM):([^.]+)(?:\.(.+))?$/);
    return { entityType: (m?.[1] ?? "CONCEPT") as ContentValidationItem["entityType"], entityId: m?.[2] ?? "", field: m?.[3] ?? null, message: d.message ?? "" };
  });
}

interface Ops<T> { save: () => Promise<T>; publish: () => Promise<T>; retire: () => Promise<T> }

/** 초안 저장·게시·내림 공통 상태: 진행 중 문구, 결과 문장(aria-live), 422 검증 문제 목록. */
export function useContentActions<T>(ops: Ops<T>, onChanged: (view: T, kind: ActionKind) => void) {
  const [busy, setBusy] = useState<ActionKind | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<ContentValidationItem[]>([]);

  const run = async (kind: ActionKind, successText: (view: T) => string) => {
    setBusy(kind);
    setError(null);
    setMessage(null);
    setProblems([]);
    try {
      const view = await ops[kind]();
      onChanged(view, kind);
      setMessage(successText(view));
    } catch (err) {
      if (err instanceof Error && err.message === JSON_INVALID) return; // JSON 파싱 오류는 편집 상자가 이미 보여 준다
      if (err instanceof ApiError && err.status === 422) {
        setProblems(problemsFromError(err));
        setError(err.message);
      } else if (err instanceof ApiError && (err.status === 409 || err.status === 400)) {
        setError(err.message);
      } else {
        setError(errorMessage(err, "요청을 처리하지 못했어요. 잠시 뒤 다시 시도해요."));
      }
    } finally {
      setBusy(null);
    }
  };
  return { busy, message, error, problems, run, clear: () => { setMessage(null); setError(null); setProblems([]); } };
}
