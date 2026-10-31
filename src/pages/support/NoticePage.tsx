import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { supportApi, type Notice } from "../../api/support";
import EmptyState from "../../components/EmptyState";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import { setDocumentTitle } from "../../components/PageTitle";
import StatusChip from "../../components/StatusChip";
import { formatDate } from "../../lib/format";
import { useLoad } from "../learn/useLoad";
import SupportHeader from "./SupportHeader";
import "../../styles/support.css";

/**
 * 공지 상세(S-252). 분류·게시일 · 본문 문단 · 바뀐 것 · 근거 기록(작업 계획·검증 기록 위치) · 연결 화면 · 이전/다음 공지.
 * 없는 공지 id 는 404 를 빈 상태로 바꿔 목록으로 돌려보낸다.
 */
export default function NoticePage() {
  const { id = "" } = useParams();
  const notice = useLoad<Notice>(signal => supportApi.notice(id, signal), [id]);
  useEffect(() => { if (notice.data) setDocumentTitle(`${notice.data.title} · 공지사항`); }, [notice.data]);

  if (notice.error) {
    const missing = notice.error instanceof ApiError && notice.error.status === 404;
    return (
      <>
        <SupportHeader current="/support/notices" title="공지사항" detail="찾을 수 없음" />
        <main className="page-main support">
          {missing
            ? <EmptyState title="그 공지를 찾지 못했어요" description="주소가 바뀌었거나 없는 공지예요. 공지 목록에서 다시 골라요." action={{ to: "/support/notices", label: "공지 목록 보기" }} />
            : <LoadError error={notice.error} message="공지를 불러오지 못했어요. 잠시 뒤 다시 시도해요." onRetry={notice.retry} />}
        </main>
      </>
    );
  }
  if (!notice.data) {
    return (
      <>
        <SupportHeader current="/support/notices" title="공지사항" detail="불러오는 중" />
        <main className="page-main support"><Loading message="공지를 불러오고 있어요" minHeight={360} /></main>
      </>
    );
  }

  const n = notice.data;
  return (
    <>
      <SupportHeader current="/support/notices" title={n.title} detail="공지 상세" meta={<>{n.category} · 게시일 {formatDate(n.postedOn)}</>} />
      <main className="page-main support">
        <div className="page-grid">
          <article className="support-notice-article" aria-labelledby="notice-summary">
            <p id="notice-summary" className="lead">{n.summary}</p>
            <div className="support-prose">
              {n.body.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
            </div>
            {n.changes.length > 0 && (
              <section className="support-block" aria-labelledby="notice-changes">
                <h2 id="notice-changes">바뀐 것</h2>
                <ul className="support-bullets">
                  {n.changes.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </section>
            )}
            {n.link && (
              <p className="support-notice-link"><Link className="btn btn-secondary btn-small" to={n.link.path}>{n.link.label}<Icon name="next" size={16} /></Link></p>
            )}
          </article>

          <aside aria-label="공지 정보">
            <div className="panel panel-soft">
              <h3>공지 정보</h3>
              <dl className="def-list">
                <div><dt>분류</dt><dd><StatusChip label={n.category} tone="info" /></dd></div>
                <div><dt>게시일</dt><dd>{formatDate(n.postedOn)}</dd></div>
                <div><dt>근거 기록</dt><dd className="support-evidence">{n.evidence}</dd></div>
              </dl>
            </div>
          </aside>
        </div>

        <nav className="support-prev-next" aria-label="이전·다음 공지">
          <div>
            <span className="faint">다음 공지(더 최근)</span>
            {n.next ? <Link to={`/support/notices/${n.next.id}`}>{n.next.title}</Link> : <span className="muted">가장 최근 공지예요.</span>}
          </div>
          <div>
            <span className="faint">이전 공지(더 오래된)</span>
            {n.previous ? <Link to={`/support/notices/${n.previous.id}`}>{n.previous.title}</Link> : <span className="muted">가장 오래된 공지예요.</span>}
          </div>
        </nav>
        <div className="next-actions">
          <Link to="/support/notices">공지 목록 <Icon name="next" size={16} /></Link>
          <Link to="/support">고객센터 홈 <Icon name="next" size={16} /></Link>
        </div>
      </main>
    </>
  );
}
