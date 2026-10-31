import { useEffect } from "react";
import { Link } from "react-router-dom";
import { supportApi, type NoticeSummary } from "../../api/support";
import EmptyState from "../../components/EmptyState";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import { setDocumentTitle } from "../../components/PageTitle";
import { formatDate } from "../../lib/format";
import { useLoad } from "../learn/useLoad";
import SupportHeader from "./SupportHeader";
import "../../styles/support.css";

/**
 * 공지사항 목록(S-252). 번호·분류·제목·게시일 표, 최신순. 서비스 변경 이력이라 실제로 있었던 변경만 올린다
 * (근거 기록은 상세 화면에 있다).
 */
export default function NoticesPage() {
  const notices = useLoad<NoticeSummary[]>(signal => supportApi.notices(signal), []);
  useEffect(() => { setDocumentTitle("공지사항 · 고객센터"); }, []);

  return (
    <>
      <SupportHeader
        current="/support/notices"
        title="공지사항"
        description="CapiMATE에 무엇이 바뀌었는지 날짜순으로 알려요. 기능 추가·디자인 변경·규칙 설명 정정처럼 작업 기록에 남은 변경만 올리고, 상세에서 그 근거 기록을 함께 보여 줘요."
        meta={notices.data ? `공지 ${notices.data.length}건` : undefined}
      />
      <main className="page-main support">
        {notices.error ? (
          <LoadError error={notices.error} message="공지 목록을 불러오지 못했어요. 잠시 뒤 다시 시도해요." onRetry={notices.retry} />
        ) : !notices.data ? (
          <Loading message="공지를 불러오고 있어요" minHeight={320} />
        ) : notices.data.length === 0 ? (
          <EmptyState title="아직 공지가 없어요" description="서비스가 바뀌면 이곳에 날짜와 함께 알려요." action={{ to: "/support", label: "고객센터 홈" }} />
        ) : (
          <table className="table table-links support-notice-table support-notice-list">
            <caption>
              전체 공지 {notices.data.length}건 · 최신순
              <span className="table-caption-note">제목을 누르면 본문·바뀐 것·근거 기록을 볼 수 있어요.</span>
            </caption>
            <thead><tr><th scope="col" className="num">번호</th><th scope="col">제목</th><th scope="col">분류</th><th scope="col">게시일</th></tr></thead>
            <tbody>
              {notices.data.map((n, i) => (
                <tr key={n.id}>
                  <td className="num support-notice-no">{notices.data!.length - i}</td>
                  <th scope="row">
                    <Link to={`/support/notices/${n.id}`}>{n.title}</Link>
                    <span className="support-notice-summary">{n.summary}</span>
                  </th>
                  <td className="support-notice-cat">{n.category}</td>
                  <td className="nowrap support-notice-date">{formatDate(n.postedOn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="next-actions">
          <Link to="/support">고객센터 홈 <Icon name="next" size={16} /></Link>
          <Link to="/support/faq">자주 묻는 질문 <Icon name="next" size={16} /></Link>
        </div>
      </main>
    </>
  );
}
