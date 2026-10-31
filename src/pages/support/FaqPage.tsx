import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { FAQ_QUERY_MAX, supportApi, type Faq, type FaqList } from "../../api/support";
import EmptyState from "../../components/EmptyState";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import { setDocumentTitle } from "../../components/PageTitle";
import { FilterGroup } from "../../components/Tabs";
import { formatDate } from "../../lib/format";
import { useLoad } from "../learn/useLoad";
import { sourceName } from "./format";
import SupportHeader, { ExternalLink, TermLinks } from "./SupportHeader";
import "../../styles/support.css";

/**
 * 자주 묻는 질문(S-251). 분류 거르개(분류별 개수) · 검색(질문·답 부분 일치) · 아코디언(details/summary).
 * 거르개 상태는 URL 질의(category·q)에 두어 새로 고침·공유가 되고, 고객센터 홈의 검색창도 이 화면으로 온다.
 * 주소 끝의 #faq-id 는 그 질문을 펼친 채로 보여 준다(고객센터 홈의 "자주 찾는 질문" 링크).
 */
export default function FaqPage() {
  const [params, setParams] = useSearchParams();
  const { hash } = useLocation();
  const category = params.get("category") ?? "";
  const q = params.get("q") ?? "";
  const [draft, setDraft] = useState(q);
  const [syncedQ, setSyncedQ] = useState(q);
  if (q !== syncedQ) { setSyncedQ(q); setDraft(q); }

  const list = useLoad<FaqList>(signal => supportApi.faqs({ category: category || undefined, q: q || undefined }, signal), [category, q]);
  useEffect(() => { setDocumentTitle("자주 묻는 질문 · 고객센터"); }, []);

  const openId = hash ? decodeURIComponent(hash.slice(1)) : "";
  // 펼칠 질문이 그려진 뒤 그 위치로 옮긴다(목록이 비동기로 오므로 data 가 생긴 다음).
  useEffect(() => {
    if (!openId || !list.data) return;
    document.getElementById(openId)?.scrollIntoView({ block: "start" });
  }, [openId, list.data]);

  const update = (next: { category?: string; q?: string }) => {
    const merged = { category, q, ...next };
    const search = new URLSearchParams();
    if (merged.category) search.set("category", merged.category);
    if (merged.q) search.set("q", merged.q);
    setParams(search);
  };
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); update({ q: draft.trim() }); };

  const data = list.data;
  const categoryLabel = data?.categories.find(c => c.code === category)?.label;
  const filterLabel = [categoryLabel && `분류 ${categoryLabel}`, q && `검색 "${q}"`].filter(Boolean).join(" · ");
  // 결과가 적으면 답까지 바로 보이게 펼친다(검색 결과 확인 수고를 줄인다).
  const openAll = !!q && !!data && data.items.length <= 3;

  return (
    <>
      <SupportHeader
        current="/support/faq"
        title="자주 묻는 질문"
        description="서비스 이용, 계정, 계산기, 모의 여신, 연체, 중도상환, 권리, 학습 순서로 묶었어요. 검색어는 질문과 답 본문에서 함께 찾아요."
        meta={data ? `질문 ${data.total}개 · 분류 ${data.categories.length}개` : undefined}
      />
      <main className="page-main support">
        <div className="page-grid">
          <div>
            <form className="support-search" role="search" onSubmit={submit}>
              <label className="sr-only" htmlFor="faq-q">찾을 내용</label>
              <input id="faq-q" className="field-input" type="search" value={draft} maxLength={FAQ_QUERY_MAX} onChange={event => setDraft(event.target.value)} placeholder="질문·답에서 찾아요. 예: 중도상환수수료" autoComplete="off" />
              <button type="submit" className="btn btn-primary"><Icon name="search" size={18} />찾기</button>
              {q && <button type="button" className="btn btn-secondary" onClick={() => { setDraft(""); update({ q: "" }); }}>검색 지우기</button>}
            </form>

            <FilterGroup label="질문 분류">
              <button type="button" className={!category ? "is-active" : undefined} aria-pressed={!category} onClick={() => update({ category: "" })}>
                전체{data && <span className="support-count">{data.total}</span>}
              </button>
              {(data?.categories ?? []).map(c => (
                <button key={c.code} type="button" className={category === c.code ? "is-active" : undefined} aria-pressed={category === c.code} onClick={() => update({ category: category === c.code ? "" : c.code })}>
                  {c.label}<span className="support-count">{c.count}</span>
                </button>
              ))}
            </FilterGroup>

            {list.error ? (
              <LoadError error={list.error} message="질문 목록을 불러오지 못했어요. 분류나 검색어를 확인하고 다시 시도해요." onRetry={list.retry} />
            ) : !data ? (
              <Loading message="자주 묻는 질문을 불러오고 있어요" minHeight={420} />
            ) : data.items.length === 0 ? (
              <EmptyState
                title={q ? `"${q}"에 맞는 질문이 없어요` : "이 분류에 질문이 없어요"}
                description={<>{filterLabel ? `${filterLabel} 조건으로 찾았어요. ` : ""}검색어를 줄이거나 분류를 '전체'로 바꾸면 {data.total}개 질문을 모두 볼 수 있어요.</>}
                action={{ to: "/support/faq", label: "전체 질문 보기" }}
              />
            ) : (
              <section className="support-faq-list" aria-labelledby="faq-result">
                <h2 id="faq-result" className="support-result" aria-live="polite">
                  {filterLabel ? `${filterLabel} · ${data.items.length}개` : `전체 질문 ${data.items.length}개`}
                  <span className="faint">질문을 누르면 답이 펼쳐져요.</span>
                </h2>
                {data.items.map(faq => (
                  <FaqItem key={`${faq.id}-${q}-${category}`} faq={faq} q={q} open={openAll || faq.id === openId} showCategory={!category} />
                ))}
              </section>
            )}
          </div>

          <aside aria-label="고객센터 안내">
            <div className="panel panel-soft">
              <h3>찾는 방법</h3>
              <dl className="def-list">
                <div><dt>분류</dt><dd>질문을 8개 분류로 묶었고 숫자는 분류별 질문 수다.</dd></div>
                <div><dt>검색</dt><dd>질문과 답 본문을 함께 찾는다. 영문은 대소문자를 가리지 않는다.</dd></div>
                <div><dt>법령</dt><dd>법령 내용을 담은 답에는 근거 출처와 확인일을 붙였다.</dd></div>
              </dl>
            </div>
            <div className="panel">
              <h3>더 알아보기</h3>
              <ul className="support-side-links">
                <li><Link to="/support/rights">금융소비자 권리 안내<Icon name="next" size={16} /></Link><span className="muted">근거 조문과 해 볼 곳</span></li>
                <li><Link to="/support/guide">이용 가이드<Icon name="next" size={16} /></Link><span className="muted">처음 오신 분 순서</span></li>
                <li><Link to="/glossary">용어 사전<Icon name="next" size={16} /></Link><span className="muted">여신 업무 용어</span></li>
              </ul>
            </div>
          </aside>
        </div>
        <div className="next-actions">
          <Link to="/support">고객센터 홈 <Icon name="next" size={16} /></Link>
          <Link to="/methodology">방법론과 규칙 세트 <Icon name="next" size={16} /></Link>
        </div>
      </main>
    </>
  );
}

/** 질문 하나. details/summary 라 키보드(Enter·Space)와 화면 낭독기가 펼침 상태를 그대로 안다. */
function FaqItem({ faq, q, open, showCategory }: { faq: Faq; q: string; open: boolean; showCategory: boolean }) {
  return (
    <details className="fold support-faq" id={faq.id} open={open || undefined}>
      <summary>
        <span className="support-faq-q">
          <span className="support-faq-mark" aria-hidden="true">Q</span>
          <span>{highlight(faq.question, q)}</span>
        </span>
        {showCategory && <span className="support-faq-cat">{faq.categoryLabel}</span>}
      </summary>
      <div className="fold-body support-faq-body">
        {faq.answer.map((paragraph, i) => <p key={i}>{highlight(paragraph, q)}</p>)}
        {(faq.link || faq.source) && (
          <dl className="def-list support-faq-meta">
            {faq.link && <div><dt>연결 화면</dt><dd><Link to={faq.link.path}>{faq.link.label}<Icon name="next" size={16} /></Link></dd></div>}
            {faq.source && <div><dt>근거 출처</dt><dd><ExternalLink href={faq.source.url}>{sourceName(faq.source.url)}</ExternalLink> <span className="faint">확인일 {formatDate(faq.source.checkedOn)}</span></dd></div>}
          </dl>
        )}
        <TermLinks terms={faq.relatedTerms} />
      </div>
    </details>
  );
}

/** 검색어와 맞는 부분을 <mark>로 감싼다(대소문자 무시). 검색어가 없으면 그대로. */
function highlight(text: string, q: string): ReactNode {
  const needle = q.trim();
  if (!needle) return text;
  const parts = text.split(new RegExp(`(${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((part, i) => (i % 2 === 1 ? <mark key={i} className="support-mark">{part}</mark> : part));
}
