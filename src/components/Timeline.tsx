import type { ReactNode } from "react";
import { formatDate } from "../lib/format";

export interface TimelineItem {
  id: string | number;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  description?: ReactNode;
  tone?: "neutral" | "good" | "danger";
}

/** 날짜순 사건 목록(계약 타임라인 등). 선·점은 CSS, 글자는 그대로. */
export default function Timeline({ items, label = "타임라인" }: { items: TimelineItem[]; label?: string }) {
  return (
    <ol className="timeline" aria-label={label}>
      {items.map(item => (
        <li key={item.id} className={item.tone ? `is-${item.tone}` : undefined}>
          <time dateTime={item.date}>{formatDate(item.date)}</time>
          <strong>{item.title}</strong>
          {item.description && <p>{item.description}</p>}
        </li>
      ))}
    </ol>
  );
}
