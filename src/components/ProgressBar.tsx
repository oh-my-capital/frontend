/**
 * 진척 막대. 홈·입문 과정·내 학습·계약 상환 진행이 같은 조각을 쓴다.
 * 색만으로 상태를 말하지 않도록 `label` 을 aria-label 로도 쓰고, 호출 쪽이 숫자를 글자로 함께 둔다.
 */
export default function ProgressBar({ value, total, label, tone = "primary" }: {
  value: number;
  total: number;
  /** 보조 기술에 읽히는 설명. 예: "12개 중 5개 완료" */
  label: string;
  tone?: "primary" | "good" | "danger";
}) {
  const ratio = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;
  const toneClass = tone === "good" ? " is-good" : tone === "danger" ? " is-danger" : "";
  return (
    <div className={`progress-bar${toneClass}`} role="img" aria-label={label}>
      <i style={{ width: `${ratio}%` }} />
    </div>
  );
}
