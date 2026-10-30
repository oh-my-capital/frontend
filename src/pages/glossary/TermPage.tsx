import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { glossaryApi } from "../../api/glossary";
import { learningApi } from "../../api/learning";
import type { ConceptSummary, Term } from "../../api/types";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import { setDocumentTitle } from "../../components/PageTitle";
import SubPageHeader from "../../components/SubPageHeader";
import { formatDate } from "../../lib/format";
import { useLoad } from "../learn/useLoad";

/**
 * 용어 상세(S-05). 정의 · 공식(.glossary-formula) · 예시 · 주의 · 관련 용어 · 연결 개념 · 출처(확인일).
 * 연결 개념의 제목은 /learning/concepts 목록에서 찾는다.
 */
export default function TermPage() {
  const { slug = "" } = useParams();
  const term = useLoad<Term>(signal => glossaryApi.term(slug, signal), [slug]);
  const concepts = useLoad<ConceptSummary[]>(signal => learningApi.concepts(signal), []);
  useEffect(() => { if (term.data) setDocumentTitle(`${term.data.term} · 용어 사전`); }, [term.data]);

  if (term.error) {
    return (
      <>
        <SubPageHeader section="learn" current="/glossary" title="용어 상세" detail="찾을 수 없음" />
        <main className="page-main"><LoadError error={term.error} message="그 용어를 찾지 못했어요. 용어 사전에서 검색해요." onRetry={term.retry} /><div className="next-actions"><Link to="/glossary">용어 사전 <Icon name="next" size={16} /></Link></div></main>
      </>
    );
  }
  if (!term.data) {
    return (
      <>
        <SubPageHeader section="learn" current="/glossary" title="용어 상세" detail="불러오는 중" />
        <main className="page-main"><Loading message="용어를 불러오고 있어요" minHeight={360} /></main>
      </>
    );
  }
  const t = term.data;
  const linked = t.conceptIds.map(id => concepts.data?.find(c => c.id === id) ?? { id, orderNo: null, title: id });

  return (
    <>
      <SubPageHeader
        section="learn"
        current="/glossary"
        detail={t.term}
        title={t.term}
        description={t.definition}
        meta={<>{t.english && <span lang="en">{t.english}</span>}{t.english && " · "}분류 <Link to={`/glossary?category=${encodeURIComponent(t.category)}`}>{t.category}</Link></>}
      />
      <main className="page-main term">
        <div className="page-grid">
          <article className="term-body">
            <section className="term-section">
              <h2>정의</h2>
              <p>{t.definition}</p>
            </section>
            {t.formula && (
              <section className="term-section">
                <h2>공식</h2>
                <p className="glossary-formula">{t.formula}</p>
              </section>
            )}
            {t.example && (
              <section className="term-section">
                <h2>예시</h2>
                <p>{t.example}</p>
                <p className="faint">숫자는 방법론의 규칙 세트와 계산 예시(골든 값)에서 가져온 값이다.</p>
              </section>
            )}
            {t.caution && (
              <section className="term-section term-caution">
                <h2>주의</h2>
                <p>{t.caution}</p>
              </section>
            )}
            <section className="term-section">
              <h2>관련 용어</h2>
              {t.related.length === 0 ? <p className="muted">관련 용어가 없어요.</p> : (
                <ul className="term-related">
                  {t.related.map(r => <li key={r.slug}><Link to={`/glossary/${r.slug}`}>{r.term}</Link><span className="muted">{r.definition}</span></li>)}
                </ul>
              )}
            </section>
            <section className="term-section">
              <h2>연결 개념</h2>
              {linked.length === 0 ? <p className="muted">연결된 개념이 없어요.</p> : (
                <ul className="term-concepts">
                  {linked.map(c => <li key={c.id}><Link to={`/learn/${c.id}`}><Icon name="book" size={16} />{c.orderNo !== null ? `${c.orderNo}. ` : ""}{c.title}</Link></li>)}
                </ul>
              )}
            </section>
            <section className="term-section">
              <h2>출처</h2>
              <dl className="def-list">
                <div><dt>자료</dt><dd><a href={t.sourceUrl} target="_blank" rel="noreferrer noopener">{t.sourceUrl}</a></dd></div>
                <div><dt>확인일</dt><dd>{formatDate(t.sourceCheckedOn)}</dd></div>
              </dl>
            </section>
          </article>
          <aside aria-label="이 용어의 분류">
            <div className="panel panel-soft">
              <h3>이 용어는</h3>
              <dl className="def-list">
                <div><dt>분류</dt><dd><Link to={`/glossary?category=${encodeURIComponent(t.category)}`}>{t.category}</Link></dd></div>
                <div><dt>영문</dt><dd lang="en">{t.english ?? "—"}</dd></div>
                <div><dt>식별자</dt><dd><code>{t.slug}</code></dd></div>
              </dl>
            </div>
            <div className="panel">
              <h3>같은 분류 더 보기</h3>
              <p className="muted">같은 단계의 용어를 이어서 읽으면 흐름이 끊기지 않아요.</p>
              <Link className="btn btn-secondary btn-small term-panel-action" to={`/glossary?category=${encodeURIComponent(t.category)}`}>{t.category} 용어 전체 <Icon name="next" size={15} /></Link>
            </div>
          </aside>
        </div>
        <div className="next-actions">
          <Link to="/glossary">용어 사전으로 <Icon name="next" size={16} /></Link>
          {linked[0] && <Link to={`/learn/${linked[0].id}`}>{linked[0].title} 개념 읽기 <Icon name="next" size={16} /></Link>}
        </div>
      </main>
    </>
  );
}
