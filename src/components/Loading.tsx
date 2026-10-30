/** 로딩 상태는 텍스트로만. 스켈레톤 애니메이션을 쓰지 않고 영역 높이를 유지한다(screens.md 공통 상태). */
export default function Loading({ message = "불러오고 있어요", minHeight }: { message?: string; minHeight?: number }) {
  return (
    <div className="state-box is-loading" role="status" aria-live="polite" style={minHeight ? { minHeight } : undefined}>
      <span>{message}…</span>
    </div>
  );
}
