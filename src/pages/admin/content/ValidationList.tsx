import type { ContentValidationItem } from "../../../api/types";
import { ENTITY_TYPE } from "../parts/adminLabels";

/** 검증 결과 목록: 대상·필드·문장. 색만이 아니라 "문제 n건" 텍스트를 함께 둔다. */
export default function ValidationList({ problems, title }: { problems: ContentValidationItem[]; title?: string }) {
  if (problems.length === 0) return null;
  return (
    <div className="admin-problems" role="alert">
      {title && <p className="admin-problems-title">{title}</p>}
      <table className="table table-compact">
        <caption>검증 문제 {problems.length}건</caption>
        <thead><tr><th scope="col">종류</th><th scope="col">대상</th><th scope="col">필드</th><th scope="col">내용</th></tr></thead>
        <tbody>
          {problems.map((p, i) => (
            <tr key={`${p.entityType}-${p.entityId}-${p.field ?? ""}-${i}`}>
              <td>{ENTITY_TYPE[p.entityType] ?? p.entityType}</td>
              <td><code>{p.entityId}</code></td>
              <td>{p.field ? <code>{p.field}</code> : <span className="faint">—</span>}</td>
              <td>{p.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
