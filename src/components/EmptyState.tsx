import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/** 빈 상태: 상황 한 문장 + 다음 행동 1개(ui-guidelines §6). */
export default function EmptyState({ title, description, action }: { title: string; description?: ReactNode; action?: { to: string; label: string } }) {
  return (
    <div className="state-box is-empty">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <Link className="btn btn-primary btn-small" to={action.to}>{action.label}</Link>}
    </div>
  );
}
