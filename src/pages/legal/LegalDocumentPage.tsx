import { useEffect } from "react";
import { Link } from "react-router-dom";
import { legalApi, type LegalArticle, type LegalDocument, type LegalSlug } from "../../api/legal";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import { setDocumentTitle } from "../../components/PageTitle";
import StatusChip from "../../components/StatusChip";
import SubPageHeader from "../../components/SubPageHeader";
import { formatDate } from "../../lib/format";
import { useLoad } from "../learn/useLoad";
import "../../styles/legal.css";

const META: Record<LegalSlug, { path: string; title: string; description: string }> = {
  terms: {
    path: "/legal/terms",
    title: "이용약관",
    description: "CapiMATE를 쓰는 조건이에요. 이 서비스의 대출·심사·연체는 모두 가상이고 실제 금융거래가 아니라는 점, 가입·탈퇴·내 데이터 내려받기 방법을 정해요.",
  },
  privacy: {
    path: "/legal/privacy",
    title: "개인정보처리방침",
    description: "CapiMATE가 실제로 처리하는 정보(이메일, 비밀번호 해시, 학습·샌드박스 기록, 동의 기록, 익명 이용 지표)와 보관 기간, 내려받기·탈퇴 방법을 적었어요.",
  },
};

/** 약관·처리방침 공통 화면(S-360·S-361). 본문은 data JSON 그대로이며 "~이다/~한다" 어조다. */
export default function LegalDocumentPage({ slug }: { slug: LegalSlug }) {
  const meta = META[slug];
  const doc = useLoad<LegalDocument>(signal => legalApi.document(slug, signal), [slug]);
  useEffect(() => { setDocumentTitle(`${meta.title} · 약관·정책`); }, [meta.title]);
  const d = doc.data;
  return (
    <>
      <SubPageHeader
        section="legal"
        current={meta.path}
        title={meta.title}
        description={meta.description}
        meta={d ? <>버전 {d.version} · 시행일 {formatDate(d.effectiveDate)}{!d.inEffect && " · 시행 예정"}</> : undefined}
      />
      <main className="page-main legal">
        {doc.error ? (
          <LoadError error={doc.error} message={`${meta.title}을 불러오지 못했어요. 잠시 뒤 다시 시도해요.`} onRetry={doc.retry} />
        ) : !d ? (
          <Loading message={`${meta.title}을 불러오고 있어요`} minHeight={480} />
        ) : (
          <>
            {d.draftNotice && (
              <p className="legal-draft" role="note">
                <StatusChip label="초안" tone="warn" />
                <strong>{d.draftNotice}</strong>
                <span>아직 정하지 않은 값은 [자리표시]로 남겨 두었어요.</span>
              </p>
            )}
            <div className="page-grid legal-grid">
              <article className="legal-body" aria-labelledby="legal-doc-title">
                <h2 id="legal-doc-title" className="legal-doc-title">{d.title}</h2>
                <p className="legal-summary">{d.summary}</p>
                {d.articles.map(a => <Article key={a.no} article={a} />)}
              </article>
              <aside aria-label={`${meta.title} 보조 정보`}>
                <nav className="panel legal-toc" aria-label="조항 목차">
                  <div className="panel-head"><h3>목차</h3></div>
                  <ol>
                    {d.articles.map(a => <li key={a.no}><a href={`#article-${a.no}`}><span className="legal-toc-no">제{a.no}조</span>{a.title}</a></li>)}
                  </ol>
                </nav>
                <div className="table-scroll">
                  <table className="table table-compact">
                    <caption>개정 이력</caption>
                    <thead><tr><th scope="col">버전</th><th scope="col">시행일</th><th scope="col">바뀐 것</th></tr></thead>
                    <tbody>
                      {d.changes.slice().reverse().map(c => (
                        <tr key={c.version}><th scope="row" className="nowrap">{c.version}</th><td className="nowrap">{formatDate(c.effectiveDate)}</td><td>{c.summary}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {d.placeholders.length > 0 && (
                  <div className="panel panel-soft">
                    <h3>아직 정하지 않은 값</h3>
                    <ul className="legal-placeholders">{d.placeholders.map(p => <li key={p}>{p.replace(/^\[자리표시: /, "").replace(/\]$/, "")}</li>)}</ul>
                  </div>
                )}
                {slug === "privacy" && (
                  <div className="panel">
                    <h3>내 정보 확인·삭제</h3>
                    <p className="muted">내 데이터는 JSON 파일로 바로 내려받고, 탈퇴하면 바로 지워져요.</p>
                    <div className="btn-row">
                      <Link className="btn btn-secondary btn-small" to="/settings/data">내 데이터</Link>
                      <Link className="btn btn-secondary btn-small" to="/settings">탈퇴</Link>
                    </div>
                  </div>
                )}
                <div className="panel panel-soft">
                  <h3>확인한 출처</h3>
                  <ul className="legal-sources">
                    {d.sources.map(s => (
                      <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a><span className="faint">확인일 {formatDate(s.checkedOn)}</span></li>
                    ))}
                  </ul>
                </div>
              </aside>
            </div>
          </>
        )}
        <div className="next-actions">
          <Link to={slug === "terms" ? "/legal/privacy" : "/legal/terms"}>{slug === "terms" ? "개인정보처리방침" : "이용약관"} <Icon name="next" size={16} /></Link>
          <Link to="/support/rights">금융소비자 권리 안내 <Icon name="next" size={16} /></Link>
          <Link to="/support">고객센터 <Icon name="next" size={16} /></Link>
        </div>
      </main>
    </>
  );
}

function Article({ article: a }: { article: LegalArticle }) {
  return (
    <section id={`article-${a.no}`} className="legal-article" aria-labelledby={`article-${a.no}-title`}>
      <h3 id={`article-${a.no}-title`}><span className="legal-article-no">제{a.no}조</span>{a.title}</h3>
      {a.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
      {a.items.length > 0 && <ol className="legal-items">{a.items.map((t, i) => <li key={i}>{t}</li>)}</ol>}
      {a.table && (
        <div className="table-scroll">
          <table className="table table-compact legal-table">
            <caption>제{a.no}조 {a.title}</caption>
            <thead><tr>{a.table.columns.map(c => <th key={c} scope="col">{c}</th>)}</tr></thead>
            <tbody>
              {a.table.rows.map((row, i) => (
                <tr key={i}>{row.map((cell, j) => (j === 0 ? <th key={j} scope="row">{cell}</th> : <td key={j}>{cell}</td>))}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {a.basis.length > 0 && <p className="legal-basis">근거 {a.basis.join(" · ")}</p>}
    </section>
  );
}
