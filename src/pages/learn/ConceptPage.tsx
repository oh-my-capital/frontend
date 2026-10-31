import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { learningApi } from "../../api/learning";
import type { Concept, ConceptSummary, MyLearning, MyLearningConcept, QuizResult } from "../../api/types";
import ConceptDiagram from "../../components/ConceptDiagram";
import FigureFlow from "../../components/FigureFlow";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import { setDocumentTitle } from "../../components/PageTitle";
import StatusChip from "../../components/StatusChip";
import SubPageHeader from "../../components/SubPageHeader";
import { useAuth } from "../../context/AuthContext";
import { formatDate } from "../../lib/format";
import { learnDiagramFor } from "./diagrams";
import { calculatorLink, COURSE_TOTAL } from "./links";
import QuizPanel from "./QuizPanel";
import { useLoad } from "./useLoad";

/**
 * 개념 상세(S-03). 제목·요약 → 섹션(그림은 ConceptDiagram) → 흔한 오해 표 → 체크리스트 → 연결 계산기·샌드박스 과업 → 출처 → 확인 문제 → 이전/다음.
 * 로그인 시 /me/learning 에서 이 개념의 최고점·오답 문항을 읽어 표시하고, 채점 결과로 바로 갱신한다.
 * 문제 수·전체 개념 수는 계약의 Concept 에 없으므로 /learning/concepts 목록에서 읽는다.
 */
export default function ConceptPage() {
  const { conceptId = "" } = useParams();
  const { isAuthenticated } = useAuth();
  const concept = useLoad<Concept>(signal => learningApi.concept(conceptId, signal), [conceptId]);
  const concepts = useLoad<ConceptSummary[]>(signal => learningApi.concepts(signal), []);
  const learning = useLoad<MyLearning | null>(signal => (isAuthenticated ? learningApi.myLearning(signal) : Promise.resolve(null)), [isAuthenticated, conceptId]);
  // 채점 직후의 기록(서버 재조회 없이 바로 표시). 다른 개념으로 옮기면 무시한다.
  const [graded, setGraded] = useState<MyLearningConcept | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const fromServer = isAuthenticated ? learning.data?.concepts.find(c => c.conceptId === conceptId) ?? null : null;
  const mine = isAuthenticated ? (graded?.conceptId === conceptId ? graded : fromServer) : null;
  const totalConcepts = concepts.data?.length ?? COURSE_TOTAL;
  const quizCount = concepts.data?.find(c => c.id === conceptId)?.quizCount;

  useEffect(() => { if (concept.data) setDocumentTitle(`${concept.data.orderNo}. ${concept.data.title}`); }, [concept.data]);

  const onGraded = (result: QuizResult) => {
    if (!result.saved) return;
    const prev = mine;
    setGraded({
      conceptId,
      title: concept.data?.title ?? conceptId,
      bestScore: Math.max(prev?.bestScore ?? 0, result.score),
      completed: (prev?.completed ?? false) || result.passed,
      lastAttemptedAt: new Date().toISOString(),
      wrongQuizIds: result.items.filter(i => !i.correct).map(i => i.quizId),
    });
  };

  if (concept.error) {
    return (
      <>
        <SubPageHeader section="learn" current="/course" title="개념 상세" detail="찾을 수 없음" />
        <main className="page-main"><LoadError error={concept.error} message="그 개념을 찾지 못했어요. 입문 과정 목차에서 다시 골라요." onRetry={concept.retry} /><div className="next-actions"><Link to="/course">입문 과정 목차 <Icon name="next" size={16} /></Link></div></main>
      </>
    );
  }
  if (!concept.data) {
    return (
      <>
        <SubPageHeader section="learn" current="/course" title="개념 상세" detail="불러오는 중" />
        <main className="page-main"><Loading message="개념을 불러오고 있어요" minHeight={480} /></main>
      </>
    );
  }

  const data = concept.data;
  const calc = calculatorLink(data.linkedCalculator);
  const sectionAnchors = data.sections.map((s, i) => ({ id: `section-${i + 1}`, heading: s.heading }));

  return (
    <>
      <SubPageHeader
        section="learn"
        current="/course"
        detail={`${data.orderNo}. ${data.title}`}
        title={data.title}
        description={data.summary}
        meta={<>개념 {data.orderNo} / {totalConcepts}{quizCount !== undefined && ` · 확인 문제 ${quizCount}문항`} · 콘텐츠 v{data.contentVersion}{mine?.completed && <> · <StatusChip label="완료" tone="good" detail={mine.bestScore !== null ? ` ${mine.bestScore}점` : undefined} /></>}{mine && !mine.completed && mine.bestScore !== null && <> · <StatusChip label="진행 중" tone="info" detail={` 최고 ${mine.bestScore}점`} /></>}</>}
      />
      <main className="page-main concept">
        <div className="page-grid">
          <article className="concept-body">
            {data.sections.map((section, index) => {
              const spec = learnDiagramFor(section.figure);
              // 손으로 배치한 그림이 없으면 콘텐츠의 노드·엣지를 단계 흐름으로 그린다(그림 id 가 콘텐츠에만 있는 경우).
              const flow = !spec && section.figure ? data.figures?.find(f => f.id === section.figure) : undefined;
              return (
                <section key={section.heading} id={`section-${index + 1}`} className="concept-section">
                  <h2>{section.heading}</h2>
                  <p>{section.body}</p>
                  {spec && <ConceptDiagram spec={spec} />}
                  {flow && <FigureFlow figure={flow} />}
                </section>
              );
            })}

            {data.misconceptions.length > 0 && (
              <section id="misconceptions" className="concept-section">
                <h2>흔한 오해</h2>
                <table className="table concept-misconceptions">
                  <caption>주장과 바로잡기 · 왼쪽처럼 생각하기 쉽지만 오른쪽이 맞다</caption>
                  <thead><tr><th scope="col">흔한 주장</th><th scope="col">바로잡기</th></tr></thead>
                  <tbody>
                    {data.misconceptions.map(item => (
                      <tr key={item.claim}><th scope="row">{item.claim}</th><td>{item.correction}</td></tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {data.checklist.length > 0 && (
              <section id="checklist" className="concept-section">
                <h2>스스로 확인하기</h2>
                <p className="muted">읽은 뒤 아래 문장이 모두 참이면 확인 문제로 넘어간다. 체크 표시는 이 화면에서만 유지된다.</p>
                <ul className="concept-checklist">
                  {data.checklist.map((item, index) => (
                    <li key={item}>
                      <label className="field-check">
                        <input type="checkbox" checked={!!checked[`${conceptId}:${index}`]} onChange={event => setChecked(prev => ({ ...prev, [`${conceptId}:${index}`]: event.target.checked }))} />
                        <span>{item}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(calc || data.sandboxTask) && (
              <section id="practice" className="concept-section concept-practice">
                <h2>직접 확인하기</h2>
                <dl className="def-list">
                  {calc && calc.kind === "calculator" && <div><dt>연결 계산기</dt><dd><Link to={calc.to}><Icon name="calculator" size={16} />{calc.label}</Link> — 본문의 숫자를 같은 조건으로 넣어 결과 표를 읽는다.</dd></div>}
                  {calc && calc.kind === "screen" && <div><dt>연결 화면</dt><dd><Link to={calc.to}><Icon name="info" size={16} />{calc.label}</Link> — 근거 조문과 확인일을 읽고, 샌드박스에서 해 볼 수 있는 권리로 넘어간다.</dd></div>}
                  {data.sandboxTask && <div><dt>샌드박스 과업</dt><dd>{data.sandboxTask} <Link to="/sandbox"><Icon name="bank" size={16} />내 모의 여신 열기</Link></dd></div>}
                </dl>
              </section>
            )}

            <section id="sources" className="concept-section">
              <h2>출처</h2>
              <table className="table table-compact concept-sources">
                <caption>이 개념의 근거 자료와 확인일 · 기관이 권장한 교육 과정이라고 주장하지 않는다</caption>
                <thead><tr><th scope="col">자료</th><th scope="col">주소</th><th scope="col">확인일</th></tr></thead>
                <tbody>
                  {data.sources.map(source => (
                    <tr key={source.url + source.title}>
                      <th scope="row">{source.title}</th>
                      <td className="concept-source-url"><a href={source.url} target="_blank" rel="noreferrer noopener">{source.url}</a></td>
                      <td>{formatDate(source.checkedOn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <QuizPanel key={conceptId} conceptId={conceptId} reviewQuizIds={mine?.wrongQuizIds ?? []} nextConceptId={data.next} onGraded={onGraded} />
          </article>

          <aside aria-label="이 개념의 차례와 연결">
            <nav className="panel concept-toc" aria-label="이 개념의 차례">
              <h3>차례</h3>
              <ol>
                {sectionAnchors.map(anchor => <li key={anchor.id}><a href={`#${anchor.id}`}>{anchor.heading}</a></li>)}
                {data.misconceptions.length > 0 && <li><a href="#misconceptions">흔한 오해</a></li>}
                {data.checklist.length > 0 && <li><a href="#checklist">스스로 확인하기</a></li>}
                {(calc || data.sandboxTask) && <li><a href="#practice">직접 확인하기</a></li>}
                <li><a href="#sources">출처</a></li>
                <li><a href="#quiz">확인 문제{quizCount !== undefined && ` ${quizCount}문항`}</a></li>
              </ol>
            </nav>
            <div className="panel panel-soft">
              <h3>이 개념에서</h3>
              <dl className="def-list">
                <div><dt>확인 문제</dt><dd>{quizCount !== undefined ? `${quizCount}문항 · ` : ""}80점 이상 완료</dd></div>
                <div><dt>{calc?.kind === "screen" ? "연결 화면" : "연결 계산기"}</dt><dd>{calc ? <Link to={calc.to}>{calc.label}</Link> : "없음"}</dd></div>
                <div><dt>샌드박스 과업</dt><dd>{data.sandboxTask ? <Link to="/sandbox">있음 · 내 모의 여신</Link> : "없음"}</dd></div>
                <div><dt>내 기록</dt><dd>{!isAuthenticated ? <Link to="/login">로그인하면 점수가 남아요</Link> : mine?.bestScore !== null && mine?.bestScore !== undefined ? `최고 ${mine.bestScore}점 · 마지막 시도 ${formatDate(mine.lastAttemptedAt)}` : "아직 풀지 않았어요"}</dd></div>
              </dl>
            </div>
          </aside>
        </div>

        <nav className="concept-pager" aria-label="이전·다음 개념">
          {data.prev ? <Link to={`/learn/${data.prev}`} className="btn btn-secondary"><Icon name="prev" size={16} /> 이전 개념</Link> : <span />}
          <Link to="/course" className="concept-pager-index">목차 {data.orderNo} / {totalConcepts}</Link>
          {data.next ? <Link to={`/learn/${data.next}`} className="btn btn-primary">다음 개념 <Icon name="next" size={16} /></Link> : <Link to="/me/learning" className="btn btn-primary">내 학습 보기 <Icon name="next" size={16} /></Link>}
        </nav>
      </main>
    </>
  );
}
