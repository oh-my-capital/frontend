/** 개념에 연결된 계산기 코드 → 화면 경로·이름. 계약의 linkedCalculator enum(schedule·screening·prepayment). */
export const CALCULATOR_LINKS: Record<string, { to: string; label: string }> = {
  schedule: { to: "/calculators/schedule", label: "상환 스케줄 계산기" },
  screening: { to: "/calculators/screening", label: "심사 시뮬레이터" },
  prepayment: { to: "/calculators/prepayment", label: "중도상환 견적" },
};

export function calculatorLink(code: string | null | undefined): { to: string; label: string } | null {
  return code ? CALCULATOR_LINKS[code] ?? null : null;
}

/** 권장 순서 구간. 홈·목차·내 학습이 같은 말을 쓴다. */
export const COURSE_PARTS = [
  { from: 1, to: 4, label: "여신의 구조", description: "여신전문금융업이 무엇인지, 캐피탈이 은행과 어떻게 다른지, 할부·신용대출·리스가 어떤 구조인지 읽는다." },
  { from: 5, to: 8, label: "금리·한도·심사", description: "금리가 세 요소로 구성되는 방식, 상환 방식별 총이자, 한도를 정하는 세 기준, 심사 네 단계를 계산기로 확인한다." },
  { from: 9, to: 12, label: "연체·건전성·중도상환", description: "연체이자가 언제 무엇에 붙는지, 기한이익상실과 건전성 분류, 중도상환수수료를 샌드박스와 견적 계산기로 겪어 본다." },
];
