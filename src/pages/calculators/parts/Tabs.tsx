import { useId, type KeyboardEvent, type ReactNode } from "react";

export interface TabItem { id: string; label: ReactNode; content: ReactNode }

/** 탭(회차표 방식·계약 상세). role=tablist, 화살표 키로 이동, 현재 탭만 tabIndex 0. */
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
    <div className="lab-tabs-wrap">
      <div className="lab-tabs" role="tablist" aria-label={label} onKeyDown={onKey}>
        {items.map(item => (
          <button key={item.id} type="button" role="tab" id={`${base}-tab-${item.id}`} aria-selected={item.id === active?.id} aria-controls={`${base}-panel-${item.id}`} tabIndex={item.id === active?.id ? 0 : -1} className={item.id === active?.id ? "is-active" : undefined} onClick={() => onChange(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {active && <div role="tabpanel" id={`${base}-panel-${active.id}`} aria-labelledby={`${base}-tab-${active.id}`} className="lab-tabpanel">{active.content}</div>}
    </div>
  );
}
