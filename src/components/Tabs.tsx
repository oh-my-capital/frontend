import { useId, type KeyboardEvent, type ReactNode } from "react";

export interface TabItem { id: string; label: ReactNode; content: ReactNode }

/**
 * 탭(회차표 방식·계약 상세·콘텐츠 종류). role=tablist, ←→·Home·End 로 이동, 현재 탭만 tabIndex 0.
 * 모양은 base.css 의 `.tabs` 하나만 쓴다(화면마다 따로 만들지 않는다).
 */
export default function Tabs({ items, current, onChange, label }: { items: TabItem[]; current: string; onChange: (id: string) => void; label: string }) {
  const base = useId();
  const index = Math.max(0, items.findIndex(t => t.id === current));
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : event.key === "Home" ? -index : event.key === "End" ? items.length - 1 - index : 0;
    if (!delta) return;
    event.preventDefault();
    const next = items[(index + delta + items.length) % items.length];
    onChange(next.id);
    (document.getElementById(`${base}-tab-${next.id}`) as HTMLButtonElement | null)?.focus();
  };
  const active = items[index];
  return (
    <div className="tabs-wrap">
      <div className="tabs" role="tablist" aria-label={label} onKeyDown={onKey}>
        {items.map(item => (
          <button key={item.id} type="button" role="tab" id={`${base}-tab-${item.id}`} aria-selected={item.id === active?.id} aria-controls={`${base}-panel-${item.id}`} tabIndex={item.id === active?.id ? 0 : -1} className={item.id === active?.id ? "is-active" : undefined} onClick={() => onChange(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {active && <div role="tabpanel" id={`${base}-panel-${active.id}`} aria-labelledby={`${base}-tab-${active.id}`} className="tabpanel">{active.content}</div>}
    </div>
  );
}

/**
 * 거르개 묶음(알림 전체/읽지 않음, 용어 분류). 탭과 생김새는 같지만 화면을 바꾸지 않고 목록을 거르므로
 * role=group + aria-pressed 를 쓴다(탭이라고 읽히면 안 된다).
 */
export function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return <div className="tabs" role="group" aria-label={label}>{children}</div>;
}
