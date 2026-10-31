import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FAQ_QUERY_MAX, supportApi, TRY_MODE_LABEL, type ConsumerRight, type FaqList, type Guide, type NoticeSummary } from "../../api/support";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import { setDocumentTitle } from "../../components/PageTitle";
import StatusChip from "../../components/StatusChip";
import { formatDate } from "../../lib/format";
import { useLoad } from "../learn/useLoad";
import SupportHeader from "./SupportHeader";
import "../../styles/support.css";

/** 고객센터 첫 화면에 올리는 자주 찾는 질문·최근 공지 수. */
const FEATURED_COUNT = 5;
const RECENT_NOTICES = 3;

/**
 * 고객센터 홈(S-250). 실제 상담 없음 고지 · FAQ 검색창 · 핵심 수치 줄(실제 콘텐츠 개수) · 자주 찾는 질문 5 ·
 * 최근 공지 3 · 권리 바로가기 6 · 이용 가이드(처음 오신 분 순서) · 분류별 질문 수.
 * 네 API 를 따로 받아 하나가 실패해도 나머지 구역은 보인다.
 */
export default function SupportHomePage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState("");
  const faqs = useLoad<FaqList>(signal => supportApi.faqs({}, signal), []);
  const notices = useLoad<NoticeSummary[]>(signal => supportApi.notices(signal), []);
  const rights = useLoad<ConsumerRight[]>(signal => supportApi.rights(signal), []);
  const guides = useLoad<Guide[]>(signal => supportApi.guides(signal), []);
  useEffect(() => { setDocumentTitle("고객센터"); }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = draft.trim();
    navigate(q ? `/support/faq?q=${encodeURIComponent(q)}` : "/support/faq");
  };

  const featured = (faqs.data?.items ?? []).filter(f => f.featured).slice(0, FEATURED_COUNT);
  const firstGuide = guides.data?.[0];

  return (
    <>
      <SupportHeader
        current="/support"
        title="고객센터"
        description="막혔을 때 찾아볼 자주 묻는 질문, 서비스 변경 공지, 처음 오신 분을 위한 이용 순서, 대출을 받은 사람이 법으로 가진 권리를 한곳에 모았어요."
      />
      <main className="page-main support">
        <form className="support-search support-search-hero" role="search" onSubmit={submit}>
          <label className="support-search-label" htmlFor="support-q">자주 묻는 질문 검색</label>
          <div className="support-search-row">
            <input id="support-q" className="field-input" type="search" value={draft} maxLength={FAQ_QUERY_MAX} onChange={event => setDraft(event.target.value)} placeholder="예: 연체이자, 청약철회, 비밀번호" autoComplete="off" />
            <button type="submit" className="btn btn-primary"><Icon name="search" size={18} />찾기</button>
          </div>
        </form>

        {faqs.data && notices.data && rights.data && (
          <dl className="figure-row support-figures" style={{ "--figure-cols": 4 } as CSSProperties}>
            <div><dt>자주 묻는 질문</dt><dd>{faqs.data.total}<small>개 · 분류 {faqs.data.categories.length}</small></dd></div>
            <div><dt>공지사항</dt><dd>{notices.data.length}<small>건 · 최근 {formatDate(notices.data[0]?.postedOn)}</small></dd></div>
            <div><dt>금융소비자 권리</dt><dd>{rights.data.length}<small>종 · 해 볼 곳 {rights.data.filter(r => r.tryIt.mode !== "EXPLAIN_ONLY").length}</small></dd></div>
            <div><dt>상담·민원 접수</dt><dd>없음<small>교육용 모의 서비스</small></dd></div>
          </dl>
        )}

        <div className="page-grid support-home-grid">
          <div className="support-home-main">
            <section aria-labelledby="home-faq">
              <div className="section-head">
                <div><h2 id="home-faq">자주 찾는 질문</h2><p>처음 오신 분이 가장 먼저 묻는 질문 {FEATURED_COUNT}개예요.</p></div>
                <Link to="/support/faq">질문 전체 보기 <Icon name="next" size={16} /></Link>
              </div>
              {faqs.error ? <LoadError error={faqs.error} message="자주 묻는 질문을 불러오지 못했어요." onRetry={faqs.retry} />
                : !faqs.data ? <Loading message="자주 묻는 질문을 불러오고 있어요" minHeight={220} />
                : (
                  <ol className="support-featured">
                    {featured.map(f => (
                      <li key={f.id}>
                        <Link to={`/support/faq#${f.id}`}><span className="support-faq-mark" aria-hidden="true">Q</span>{f.question}</Link>
                        <span className="support-featured-cat">{f.categoryLabel}</span>
                      </li>
                    ))}
                  </ol>
                )}
            </section>

            <section aria-labelledby="home-notices">
              <div className="section-head">
                <div><h2 id="home-notices">공지사항</h2><p>실제로 있었던 서비스 변경만 날짜순으로 알려요.</p></div>
                <Link to="/support/notices">공지 전체 보기 <Icon name="next" size={16} /></Link>
              </div>
              {notices.error ? <LoadError error={notices.error} message="공지를 불러오지 못했어요." onRetry={notices.retry} />
                : !notices.data ? <Loading message="공지를 불러오고 있어요" minHeight={160} />
                : (
                  <table className="table table-links support-notice-table">
                    <caption>최근 공지 {Math.min(RECENT_NOTICES, notices.data.length)}건</caption>
                    <thead><tr><th scope="col">제목</th><th scope="col">분류</th><th scope="col">게시일</th></tr></thead>
                    <tbody>
                      {notices.data.slice(0, RECENT_NOTICES).map(n => (
                        <tr key={n.id}>
                          <th scope="row"><Link to={`/support/notices/${n.id}`}>{n.title}</Link></th>
                          <td className="support-notice-cat">{n.category}</td>
                          <td className="nowrap">{formatDate(n.postedOn)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </section>

            <section aria-labelledby="home-rights">
              <div className="section-head">
                <div><h2 id="home-rights">금융소비자 권리 바로가기</h2><p>근거 조문과 확인일을 함께 적고, 이 서비스에서 해 볼 수 있는 권리는 그 화면으로 이어 줘요.</p></div>
                <Link to="/support/rights">권리 안내 전체 <Icon name="next" size={16} /></Link>
              </div>
              {rights.error ? <LoadError error={rights.error} message="권리 안내를 불러오지 못했어요." onRetry={rights.retry} />
                : !rights.data ? <Loading message="권리 안내를 불러오고 있어요" minHeight={220} />
                : (
                  <ol className="support-right-index">
                    {rights.data.map(r => (
                      <li key={r.id}>
                        <span className="support-right-no">{r.orderNo}</span>
                        <div>
                          <Link to={`/support/rights#${r.id}`}>{r.name}</Link>
                          <span className="muted">{r.basis[0]?.law} {r.basis[0]?.article.replace(/\(.*$/, "")}</span>
                        </div>
                        <StatusChip label={TRY_MODE_LABEL[r.tryIt.mode].label} tone={TRY_MODE_LABEL[r.tryIt.mode].tone} />
                      </li>
                    ))}
                  </ol>
                )}
            </section>
          </div>

          <aside aria-label="이용 가이드와 질문 분류">
            <div className="panel">
              <div className="panel-head">
                <h3>{firstGuide?.title ?? "이용 가이드"}</h3>
                <p>배우기 → 계산기 → 모의 여신 → 미션 순서예요.</p>
              </div>
              {guides.error ? <LoadError error={guides.error} message="이용 가이드를 불러오지 못했어요." onRetry={guides.retry} />
                : !firstGuide ? <Loading message="이용 가이드를 불러오고 있어요" minHeight={200} />
                : (
                  <ol className="support-mini-steps">
                    {firstGuide.steps.map(s => (
                      <li key={s.orderNo}>
                        <span className="support-step-no">{s.orderNo}</span>
                        <span className="support-mini-stage">{s.title.replace(/:.*$/, "")}</span>
                        <Link to={s.path}>{s.pathLabel}</Link>
                        {s.loginRequired && <span className="faint">로그인 필요</span>}
                      </li>
                    ))}
                  </ol>
                )}
              <Link className="btn btn-secondary btn-small support-panel-action" to="/support/guide">이용 가이드 자세히</Link>
            </div>
            {faqs.data && (
              <div className="panel panel-soft">
                <h3>분류별 질문</h3>
                <table className="table table-compact table-links">
                  <caption className="sr-only">분류별 자주 묻는 질문 수</caption>
                  <thead><tr><th scope="col">분류</th><th scope="col" className="num">질문</th></tr></thead>
                  <tbody>
                    {faqs.data.categories.map(c => (
                      <tr key={c.code}>
                        <th scope="row"><Link to={`/support/faq?category=${c.code}`}>{c.label}</Link></th>
                        <td className="num">{c.count}개</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </aside>
        </div>
        <div className="next-actions">
          <Link to="/course">입문 과정 <Icon name="next" size={16} /></Link>
          <Link to="/calculators/schedule">상환 스케줄 계산기 <Icon name="next" size={16} /></Link>
          <Link to="/sandbox">내 모의 여신 <Icon name="next" size={16} /></Link>
        </div>
      </main>
    </>
  );
}
