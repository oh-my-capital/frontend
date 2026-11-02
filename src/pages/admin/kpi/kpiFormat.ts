/** 서비스 지표 화면 공용 표기. */

/** "2027-03-10" → "3/10"(축 라벨). */
export function shortDay(iso: string): string {
  const m = iso.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return m ? `${Number(m[1])}/${Number(m[2])}` : iso;
}

/** 비율(%) 소수 한 자리. null 은 "—". */
export function pct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(1)}%`;
}

/** 라우트 패턴을 읽기 쉬운 글로. "*" 는 목록에 없는 화면. */
export function pathLabel(path: string): string {
  return path === "*" ? "목록에 없는 화면(*)" : path;
}
