import { Link } from "react-router-dom";

/**
 * WP6~8이 교체할 자리표시. 라우트와 제목·설명 한 줄만 둔다.
 * 교체 방법: 해당 WP가 pages/<영역>/ 에 화면을 만들고 App.tsx 의 element 를 바꾼다. 이 컴포넌트는 그대로 둔다.
 */
export default function Placeholder({ title, description, owner }: { title: string; description: string; owner: "WP6" | "WP7" | "WP8" }) {
  return (
    <main className="placeholder-main">
      <div className="panel">
        <span className="eyebrow">{owner} 화면</span>
        <h1 style={{ marginTop: 6 }}>{title}</h1>
        <p className="muted" style={{ marginTop: 12 }}>{description}</p>
        <p className="faint" style={{ marginTop: 16 }}>이 화면의 본문은 {owner}가 만든다. 지금은 라우트와 제목만 있다.</p>
        <div className="btn-row" style={{ marginTop: 20 }}>
          <Link className="btn btn-secondary" to="/">홈으로</Link>
        </div>
      </div>
    </main>
  );
}
