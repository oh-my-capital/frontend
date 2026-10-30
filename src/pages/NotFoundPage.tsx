import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";

/** 없는 주소(S-40): 홈·검색 링크. 조용히 홈으로 보내지 않고 어떤 주소가 없는지 보여 준다. */
export default function NotFoundPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(q.trim() ? `/glossary?q=${encodeURIComponent(q.trim())}` : "/glossary");
  };
  return (
    <main className="not-found-main">
      <div className="panel">
        <span className="eyebrow">404</span>
        <h1>이 주소에는 화면이 없어요</h1>
        <p><code>{pathname}</code> 에 해당하는 화면을 찾지 못했어요. 주소가 바뀌었거나 잘못 입력됐을 수 있어요. 홈으로 가거나, 찾던 용어를 아래에서 검색해요.</p>
        <form role="search" onSubmit={submit}>
          <label className="sr-only" htmlFor="nf-search">찾을 용어</label>
          <input id="nf-search" className="field-input" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="용어 사전에서 찾기" />
          <button className="btn btn-secondary" type="submit"><Icon name="search" size={16} />검색</button>
        </form>
        <div className="btn-row" style={{ marginTop: 20 }}>
          <Link className="btn btn-primary" to="/">홈으로</Link>
          <Link className="btn btn-secondary" to="/course">입문 과정</Link>
          <Link className="btn btn-secondary" to="/calculators/schedule">계산기</Link>
        </div>
      </div>
    </main>
  );
}
