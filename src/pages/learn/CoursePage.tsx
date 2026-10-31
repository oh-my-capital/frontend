import { Link } from "react-router-dom";
import { learningApi } from "../../api/learning";
import type { ConceptSummary, MyLearning } from "../../api/types";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import ProgressBar from "../../components/ProgressBar";
import StatusChip from "../../components/StatusChip";
import SubPageHeader from "../../components/SubPageHeader";
import { useAuth } from "../../context/AuthContext";
import { calculatorLink, COURSE_PARTS, COURSE_TOTAL, SANDBOX_TASK_CONCEPTS } from "./links";
import { useLoad } from "./useLoad";

/**
 * 입문 과정 목차(S-02). 개념 번호 목록(1단계 12 + WP24 13~16)(제목·요약·문제 수·연결 계산기·완료 표시)과 권장 순서 설명.
 * 로그인 시 /me/learning 으로 완료·최고점을 표시한다. 어느 개념이든 처음부터 열려 있다(ADR-006).
 */
export default function CoursePage() {
  const { isAuthenticated } = useAuth();
  const concepts = useLoad<ConceptSummary[]>(signal => learningApi.concepts(signal), []);
  const learning = useLoad<MyLearning | null>(signal => (isAuthenticated ? learningApi.myLearning(signal) : Promise.resolve(null)), [isAuthenticated]);
  const progress = new Map((isAuthenticated ? learning.data?.concepts : undefined)?.map(c => [c.conceptId, c]) ?? []);

  return (
    <>
      <SubPageHeader
        section="learn"
        current="/course"
        title="입문 과정 목차"
        description={`${COURSE_PARTS.map(part => `${part.label}(${part.from}~${part.to})`).join(" → ")} 순서로 읽으면 대출 한 건의 생애와 그 뒤의 채권 관리·권리까지 따라가게 돼요. 권장 순서는 1에서 ${COURSE_TOTAL}이지만 어느 개념이든 바로 열 수 있고, 개념마다 확인 문제와 연결된 계산기·안내 화면이나 샌드박스 과업이 있어요.`}
        meta={concepts.data ? `개념 ${concepts.data.length}개 · 확인 문제 ${concepts.data.reduce((sum, c) => sum + c.quizCount, 0)}문항 · 출처와 확인일은 개념마다 적혀 있어요` : undefined}
      />
      <main className="page-main">
        <div className="page-grid">
          <div>
            {concepts.error ? (
              <LoadError error={concepts.error} message="학습 목차를 불러오지 못했어요. 잠시 뒤 다시 시도해요." onRetry={concepts.retry} />
            ) : !concepts.data ? (
              <Loading message="학습 목차를 불러오고 있어요" minHeight={520} />
            ) : (
              COURSE_PARTS.map(part => (
                <section key={part.label} className="course-part" aria-labelledby={`course-part-${part.from}`}>
                  <div className="course-part-head">
                    <h2 id={`course-part-${part.from}`}><span className="eyebrow">{part.from}~{part.to}</span>{part.label}</h2>
                    <p>{part.description}</p>
                  </div>
                  <ol className="course-list" start={part.from}>
                    {concepts.data!.filter(c => c.orderNo >= part.from && c.orderNo <= part.to).map(concept => {
                      const mine = progress.get(concept.id);
                      const calc = calculatorLink(concept.linkedCalculator);
                      return (
                        <li key={concept.id}>
                          <span className="course-no" aria-hidden="true">{String(concept.orderNo).padStart(2, "0")}</span>
                          <div className="course-body">
                            <h3><Link to={`/learn/${concept.id}`}><span className="sr-only">{concept.orderNo}. </span>{concept.title}</Link></h3>
                            <p>{concept.summary}</p>
                            <p className="course-meta">
                              <span>확인 문제 {concept.quizCount}문항</span>
                              {calc && <Link to={calc.to}><Icon name={calc.kind === "screen" ? "info" : "calculator"} size={16} />{calc.label}</Link>}
                              {!calc && SANDBOX_TASK_CONCEPTS.has(concept.id) && <Link to="/sandbox"><Icon name="bank" size={16} />샌드박스 과업</Link>}
                            </p>
                          </div>
                          <div className="course-state">
                            {mine?.completed && <StatusChip label="완료" tone="good" detail={mine.bestScore !== null ? ` ${mine.bestScore}점` : undefined} />}
                            {mine && !mine.completed && mine.lastAttemptedAt && <StatusChip label="진행 중" tone="info" detail={mine.bestScore !== null ? ` 최고 ${mine.bestScore}점` : undefined} />}
                            <Link className="btn btn-secondary btn-small" to={`/learn/${concept.id}`}>읽기 <Icon name="next" size={15} /></Link>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))
            )}
          </div>
          <aside aria-label="학습 진척과 읽는 방법">
            <ProgressPanel learning={isAuthenticated ? learning.data : null} concepts={concepts.data} isAuthenticated={isAuthenticated} />
            <div className="panel panel-soft">
              <h3>읽고 → 풀고 → 확인하기</h3>
              <ol className="learn-steps">
                <li>개념의 정의·그림·흔한 오해 표를 읽는다.</li>
                <li>확인 문제 3~5문항을 풀고 해설과 다음 행동을 읽는다. 80점 이상이면 완료로 기록한다.</li>
                <li>연결된 계산기나 샌드박스 과업에서 같은 숫자를 직접 만들어 본다.</li>
              </ol>
            </div>
          </aside>
        </div>
        <div className="next-actions">
          <Link to="/glossary">용어 사전 <Icon name="next" size={16} /></Link>
          <Link to="/calculators/schedule">상환 스케줄 계산기 <Icon name="next" size={16} /></Link>
          <Link to="/methodology">방법론과 규칙 세트 <Icon name="next" size={16} /></Link>
        </div>
      </main>
    </>
  );
}

function ProgressPanel({ learning, concepts, isAuthenticated }: { learning: MyLearning | null; concepts: ConceptSummary[] | null; isAuthenticated: boolean }) {
  if (!isAuthenticated) {
    return (
      <div className="panel">
        <h3>진척 기록</h3>
        <p className="muted">로그인하면 확인 문제 점수와 완료 표시가 이 목차와 내 학습 화면에 남아요. 로그인 없이도 모든 개념을 읽고 문제를 풀 수 있어요.</p>
        <Link className="btn btn-secondary btn-small learn-panel-action" to="/login">로그인하고 진척 기록하기</Link>
      </div>
    );
  }
  if (!learning) return <Loading message="진척을 불러오고 있어요" minHeight={160} />;
  const next = learning.nextConceptId ? concepts?.find(c => c.id === learning.nextConceptId) : null;
  return (
    <div className="panel learn-progress">
      <h3>내 진척</h3>
      <p className="progress-meta"><span className="muted">완료한 개념</span><strong>{learning.completedCount} / {learning.totalCount}</strong></p>
      <ProgressBar value={learning.completedCount} total={learning.totalCount} label={`${learning.totalCount}개 중 ${learning.completedCount}개 완료`} />
      {next ? (
        <p className="muted">다음으로 권하는 개념은 <Link to={`/learn/${next.id}`}>{next.orderNo}. {next.title}</Link>이에요.</p>
      ) : (
        <p className="muted">{learning.totalCount}개 개념을 모두 완료했어요. 오답이 있던 문항은 내 학습에서 다시 볼 수 있어요.</p>
      )}
      <Link to="/me/learning" className="learn-progress-link">내 학습 자세히 <Icon name="next" size={16} /></Link>
    </div>
  );
}
