/** 줄 단위 목록 ↔ 문자열. 체크리스트·쉼표 목록 입력에 쓴다. */
export const linesToList = (text: string) => text.split("\n").map(s => s.trim()).filter(Boolean);
export const commaToList = (text: string) => text.split(",").map(s => s.trim()).filter(Boolean);

/** JSON 문자열 → 객체. 실패하면 문장으로 이유를 돌려준다. */
export function parseJson<T>(text: string): { value: T; error: null } | { value: null; error: string } {
  try {
    const value = JSON.parse(text) as T;
    if (!value || typeof value !== "object" || Array.isArray(value)) return { value: null, error: "JSON 최상위는 객체({ ... })여야 해요." };
    return { value, error: null };
  } catch (err) {
    return { value: null, error: `JSON을 읽지 못했어요: ${err instanceof Error ? err.message : "형식 오류"}. 쉼표·따옴표를 확인해요.` };
  }
}
