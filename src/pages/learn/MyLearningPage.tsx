import { Link } from "react-router-dom";
import { learningApi } from "../../api/learning";
import type { ConceptSummary, MyLearning } from "../../api/types";
import EmptyState from "../../components/EmptyState";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import ProgressBar from "../../components/ProgressBar";
import StatusChip from "../../components/StatusChip";
import SubPageHeader from "../../components/SubPageHeader";
import { formatDate } from "../../lib/format";
import { COURSE_PARTS } from "./links";
import { useLoad } from "./useLoad";

/**
 * 내 학습(S-10). 완료 n/12 · 개념별 최고점·완료·마지막 시도 · 오답 문항 다시 보기(S-03의 해당 문항으로 스크롤) · 다음 추천.
 * 로그인 전용(App.tsx 의 ProtectedRoute). 개념 순서·요약은 /learning/concepts 에서 받는다.
 */
export default function MyLearningPage() {
  const learning = useLoad<MyLearning>(signal => learningApi.myLearning(signal), []);
  const concepts = useLoad<ConceptSummary[]>(signal => learningApi.concepts(signal), []);
  const order = new Map(concepts.data?.map(c => [c.id, c]) ?? []);
  const data = learning.data;
  const rows = data ? [...data.concepts].sort((a, b) => (order.get(a.conceptId)?.orderNo ?? 99) - (order.get(b.conceptId)?.orderNo ?? 99)) : [];
  const attempted = rows.filter(r => r.lastAttemptedAt);
  const nextId = data?.nextConceptId ?? null;
  const next = nextId ? { id: nextId, orderNo: order.get(nextId)?.orderNo ?? null, title: order.get(nextId)?.title ?? rows.find(r => r.conceptId === nextId)?.title ?? nextId, summary: order.get(nextId)?.summary ?? null } : null;
  const wrongTotal = rows.reduce((sum, r) => sum + r.wrongQuizIds.length, 0);

  return (
    <>
      <SubPageHeader
        section="learn"
        current="/me/learning"
        title="내 학습"
        description="확인 문제를 제출할 때마다 개념별 최고점과 마지막 시도가 여기에 남아요. 80점 이상이면 완료로 표시하고, 틀린 문항은 개념 화면의 해당 문항으로 바로 돌아가 다시 풀 수 있어요."
        meta={data ? `완료 ${data.completedCount} / ${data.totalCount} · 시도한 개념 ${attempted.length}개 · 다시 볼 문항 ${wrongTotal}개` : undefined}
      />
      <main className="page-main my-learning">
        {learning.error ? (
          <LoadError error={learning.error} message="학습 기록을 불러오지 못했어요. 잠시 뒤 다시 시도해요." onRetry={learning.retry} />
        ) : !data ? (
          <Loading message="학습 기록을 불러오고 있어요" minHeight={480} />
        ) : (
          <div className="page-grid">
            <div>
              {attempted.length === 0 ? (
                <EmptyState title="아직 푼 확인 문제가 없어요" description="첫 개념을 읽고 확인 문제를 제출하면 점수와 완료 표시가 여기에 남아요." action={{ to: `/learn/${next?.id ?? rows[0]?.conceptId ?? ""}`, label: next ? `${next.orderNo !== null ? `${next.orderNo}. ` : ""}${next.title} 읽기` : "입문 과정 목차" }} />
              ) : (
                <table className="table my-learning-table">
                  <caption>개념별 기록 · 완료 {data.completedCount} / {data.totalCount}<span className="table-caption-note">최고점은 여러 번 제출한 결과 중 가장 높은 점수이다. 80점 이상이면 완료이다.</span></caption>
                  <thead>
                    <tr><th scope="col">순서</th><th scope="col">개념</th><th scope="col" className="num">최고점</th><th scope="col">상태</th><th scope="col">마지막 시도</th><th scope="col">오답 다시 보기</th></tr>
                  </thead>
                  <tbody>
                    {rows.map(row => {
                      const summary = order.get(row.conceptId);
                      const orderNo = summary?.orderNo;
                      return (
                        <tr key={row.conceptId} className={row.completed ? "is-done" : undefined}>
                          <td className="num">{orderNo !== undefined ? String(orderNo).padStart(2, "0") : "—"}</td>
                          <th scope="row"><Link to={`/learn/${row.conceptId}`}>{row.title}</Link></th>
                          <td className="num">{row.bestScore !== null ? `${row.bestScore}점` : "—"}</td>
                          <td>
                            {row.completed ? <StatusChip label="완료" tone="good" /> : row.lastAttemptedAt ? <StatusChip label="진행 중" tone="info" /> : <StatusChip label="미시작" tone="neutral" />}
                          </td>
                          <td>{row.lastAttemptedAt ? formatDate(row.lastAttemptedAt) : "—"}</td>
                          <td>
                            {row.wrongQuizIds.length === 0 ? (
                              <span className="faint">{row.lastAttemptedAt ? "없음" : "—"}</span>
                            ) : (
                              <span className="my-learning-wrong">
                                {row.wrongQuizIds.map(quizId => (
                                  <Link key={quizId} to={`/learn/${row.conceptId}#quiz-${quizId}`} className="btn btn-secondary btn-small">문항 {quizId}</Link>
                                ))}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <aside aria-label="진척과 다음 추천">
              <div className="panel learn-progress">
                <h3>완료</h3>
                <p className="progress-meta"><span className="muted">완료한 개념</span><strong>{data.completedCount} / {data.totalCount}</strong></p>
                <ProgressBar value={data.completedCount} total={data.totalCount} label={`${data.totalCount}개 중 ${data.completedCount}개 완료`} />
                <dl className="def-list learn-progress-parts">
                  {COURSE_PARTS.map(part => {
                    const inPart = rows.filter(r => { const n = order.get(r.conceptId)?.orderNo ?? 0; return n >= part.from && n <= part.to; });
                    return <div key={part.label}><dt>{part.label}</dt><dd>{inPart.filter(r => r.completed).length} / {inPart.length}</dd></div>;
                  })}
                </dl>
              </div>
              <div className="panel panel-soft">
                <h3>다음 추천</h3>
                {next ? (
                  <>
                    <p className="muted">아직 완료하지 않은 개념 중 가장 앞 순서예요.</p>
                    <p className="learn-next-title"><strong>{next.orderNo !== null ? `${next.orderNo}. ` : ""}{next.title}</strong></p>
                    {next.summary && <p className="muted learn-next-summary">{next.summary}</p>}
                    <Link className="btn btn-primary btn-small learn-panel-action" to={`/learn/${next.id}`}>이 개념 읽기 <Icon name="next" size={15} /></Link>
                  </>
                ) : (
                  <p className="muted">12개 개념을 모두 완료했어요. 샌드박스에서 대출 한 건의 생애를 직접 겪어 봐요.</p>
                )}
              </div>
            </aside>
          </div>
        )}
        <div className="next-actions">
          <Link to="/course">입문 과정 목차 <Icon name="next" size={16} /></Link>
          <Link to="/sandbox">내 모의 여신 <Icon name="next" size={16} /></Link>
          <Link to="/glossary">용어 사전 <Icon name="next" size={16} /></Link>
        </div>
      </main>
    </>
  );
}
