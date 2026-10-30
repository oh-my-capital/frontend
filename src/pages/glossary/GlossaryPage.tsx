import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { glossaryApi, HANGUL_INITIALS, initialOf, LATIN_INITIALS } from "../../api/glossary";
import { learningApi } from "../../api/learning";
import type { ConceptSummary, TermSummary } from "../../api/types";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import SubPageHeader from "../../components/SubPageHeader";
import { useLoad } from "../learn/useLoad";

/**
 * 용어 사전(S-04). 분류 탭 · 초성 버튼 줄 · 검색(홈 검색의 ?q= 수신) · 결과 표(용어·영문·분류·정의 첫 줄).
 * 필터 상태는 URL 질의(category·initial·q)에 두어 새로 고침·공유가 된다. 목록은 계약의 GET /glossary 질의로 받는다.
 * 검색어가 있으면 개념 목록(/learning/concepts)에서도 제목·요약이 맞는 개념을 함께 보여 준다.
 */
export default function GlossaryPage() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") ?? "";
  const initial = params.get("initial") ?? "";
  const q = params.get("q") ?? "";
  // 입력창 초안. URL 의 q 가 바깥(홈 검색·뒤로 가기)에서 바뀌면 그 값으로 맞춘다.
  const [draft, setDraft] = useState(q);
  const [syncedQ, setSyncedQ] = useState(q);
  if (q !== syncedQ) { setSyncedQ(q); setDraft(q); }

  const all = useLoad<TermSummary[]>(signal => glossaryApi.list({}, signal), []);
  const filtered = useLoad<TermSummary[]>(signal => glossaryApi.list({ category: category || undefined, initial: initial || undefined, q: q || undefined }, signal), [category, initial, q]);
  const concepts = useLoad<ConceptSummary[]>(signal => (q ? learningApi.concepts(signal) : Promise.resolve([])), [q]);

  const categories = Array.from(new Set((all.data ?? []).map(t => t.category)));
  const countByCategory = new Map<string, number>();
  for (const term of all.data ?? []) countByCategory.set(term.category, (countByCategory.get(term.category) ?? 0) + 1);
  const availableInitials = new Set((all.data ?? []).map(t => initialOf(t.term)).filter(Boolean));
  const matchedConcepts = q ? (concepts.data ?? []).filter(c => c.title.includes(q) || c.summary.includes(q)) : [];

  const update = (next: { category?: string; initial?: string; q?: string }) => {
    const merged = { category, initial, q, ...next };
    const search = new URLSearchParams();
    if (merged.category) search.set("category", merged.category);
    if (merged.initial) search.set("initial", merged.initial);
    if (merged.q) search.set("q", merged.q);
    setParams(search);
  };
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); update({ q: draft.trim() }); };
  const hasFilter = !!(category || initial || q);
  const filterLabel = [category && `분류 ${category}`, initial && `초성 ${initial}`, q && `검색 "${q}"`].filter(Boolean).join(" · ");

  return (
    <>
      <SubPageHeader
        section="learn"
        current="/glossary"
        title="용어 사전"
        description="여신 업무에서 쓰는 말을 분류·초성·검색으로 찾아요. 각 용어는 정의와 공식, 계산 예시의 숫자, 주의할 점, 관련 용어, 연결된 개념, 출처와 확인일을 함께 적어요."
        meta={all.data ? `용어 ${all.data.length}개 · 분류 ${categories.length}개` : undefined}
      />
      <main className="page-main glossary">
        <div className="page-grid">
          <div>
            <form className="glossary-search" role="search" onSubmit={submit}>
              <label className="sr-only" htmlFor="glossary-q">찾을 용어</label>
              <input id="glossary-q" className="field-input" type="search" value={draft} onChange={event => setDraft(event.target.value)} placeholder="용어·영문·정의에서 찾아요. 예: 연체이자" autoComplete="off" />
              <button type="submit" className="btn btn-primary"><Icon name="search" size={18} />찾기</button>
              {q && <button type="button" className="btn btn-secondary" onClick={() => { setDraft(""); update({ q: "" }); }}>검색 지우기</button>}
            </form>

            <div className="glossary-tabs" role="group" aria-label="분류">
              <button type="button" className={!category ? "is-active" : undefined} aria-pressed={!category} onClick={() => update({ category: "" })}>전체{all.data && <span className="glossary-count">{all.data.length}</span>}</button>
              {categories.map(name => (
                <button key={name} type="button" className={category === name ? "is-active" : undefined} aria-pressed={category === name} onClick={() => update({ category: category === name ? "" : name })}>
                  {name}<span className="glossary-count">{countByCategory.get(name)}</span>
                </button>
              ))}
            </div>

            <div className="glossary-initials" role="group" aria-label="초성">
              <button type="button" className={!initial ? "is-active" : undefined} aria-pressed={!initial} onClick={() => update({ initial: "" })}>전체</button>
              {[...HANGUL_INITIALS, ...LATIN_INITIALS.filter(letter => availableInitials.has(letter))].map(letter => (
                <button key={letter} type="button" className={initial === letter ? "is-active" : undefined} aria-pressed={initial === letter} disabled={all.data ? !availableInitials.has(letter) : false} onClick={() => update({ initial: initial === letter ? "" : letter })}>{letter}</button>
              ))}
            </div>

            {q && matchedConcepts.length > 0 && (
              <section className="glossary-concepts" aria-label="개념에서 찾은 결과">
                <h2>개념에서 찾음 <em>{matchedConcepts.length}개</em></h2>
                <ul>
                  {matchedConcepts.map(c => <li key={c.id}><Link to={`/learn/${c.id}`}>{c.orderNo}. {c.title}</Link><span className="muted">{c.summary}</span></li>)}
                </ul>
              </section>
            )}

            {filtered.error ? (
              <LoadError error={filtered.error} message="용어 목록을 불러오지 못했어요. 잠시 뒤 다시 시도해요." onRetry={filtered.retry} />
            ) : !filtered.data ? (
              <Loading message="용어를 불러오고 있어요" minHeight={420} />
            ) : (
              <table className="table table-links glossary-table">
                <caption>
                  {hasFilter ? `${filterLabel} · ${filtered.data.length}개` : `전체 용어 ${filtered.data.length}개 · 가나다순`}
                  <span className="table-caption-note" aria-live="polite">{filtered.data.length === 0 ? "맞는 용어가 없어요. 검색어를 줄이거나 분류·초성을 '전체'로 바꿔요." : "용어를 누르면 공식·예시·관련 용어를 볼 수 있어요."}</span>
                </caption>
                <thead><tr><th scope="col">용어</th><th scope="col">영문</th><th scope="col">분류</th><th scope="col">정의</th></tr></thead>
                <tbody>
                  {filtered.data.length === 0 && (
                    <tr><td colSpan={4} className="muted">{q ? <>"{q}"에 맞는 용어가 없어요. <Link to="/glossary">전체 목록으로 돌아가요</Link>.</> : <>이 조건에 맞는 용어가 없어요. <Link to="/glossary">전체 목록으로 돌아가요</Link>.</>}</td></tr>
                  )}
                  {[...filtered.data].sort((a, b) => a.term.localeCompare(b.term, "ko")).map(term => (
                    <tr key={term.slug}>
                      <th scope="row"><Link to={`/glossary/${term.slug}`}>{term.term}</Link></th>
                      <td className="glossary-english">{term.english ?? "—"}</td>
                      <td className="glossary-cat">{term.category}</td>
                      <td className="glossary-def">{firstSentence(term.definition)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <aside aria-label="찾는 방법">
            <div className="panel panel-soft">
              <h3>찾는 방법</h3>
              <dl className="def-list">
                <div><dt>분류</dt><dd>업무 → 금리·한도 → 심사 → 상환 → 연체·건전성 → 운영 순서로 대출 한 건의 생애를 따른다.</dd></div>
                <div><dt>초성</dt><dd>한글 용어는 첫 글자의 초성, 영문 약어(DSR·LTV)는 첫 글자로 찾는다.</dd></div>
                <div><dt>검색</dt><dd>용어·영문·정의 본문을 함께 찾는다. 홈 화면의 검색창도 이 화면으로 온다.</dd></div>
              </dl>
            </div>
            <div className="panel">
              <h3>처음이라면</h3>
              <ul className="glossary-suggest">
                <li><Link to="/glossary/credit">여신</Link><span className="muted">수신의 반대</span></li>
                <li><Link to="/glossary/contract-rate">약정이율</Link><span className="muted">기준 + 스프레드 − 우대</span></li>
                <li><Link to="/glossary/dsr">DSR</Link><span className="muted">연소득 대비 연 원리금</span></li>
                <li><Link to="/glossary/allocation">변제충당</Link><span className="muted">비용 → 연체이자 → 이자 → 원금</span></li>
                <li><Link to="/glossary/acceleration">기한이익상실</Link><span className="muted">연체 60일</span></li>
              </ul>
            </div>
          </aside>
        </div>
        <div className="next-actions">
          <Link to="/course">입문 과정 목차 <Icon name="next" size={16} /></Link>
          <Link to="/methodology">방법론과 규칙 세트 <Icon name="next" size={16} /></Link>
        </div>
      </main>
    </>
  );
}

/** 정의의 첫 문장만. "~이다." 뒤에 이어지는 설명은 상세 화면에서 본다. */
function firstSentence(text: string): string {
  const match = text.match(/^(.+?[.다])\s/);
  return match ? match[1] : text;
}
