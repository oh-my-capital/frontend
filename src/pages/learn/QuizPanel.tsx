import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError, errorMessage } from "../../api/client";
import { learningApi } from "../../api/learning";
import type { Quiz, QuizResult } from "../../api/types";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import StatusChip from "../../components/StatusChip";
import { useAuth } from "../../context/AuthContext";
import { useLoad } from "./useLoad";

interface Props {
  conceptId: string;
  /** 내 학습에서 넘어온 "다시 볼 문항" 번호. 해당 문항에 표시하고 처음 열릴 때 그곳으로 스크롤한다. */
  reviewQuizIds: number[];
  nextConceptId: string | null;
  /** 채점이 끝나면 부모에게 알린다(진척 표시 갱신용). */
  onGraded?: (result: QuizResult) => void;
}

/**
 * 확인 문제 패널(S-03). 라디오로 답을 고르고 제출하면 문항별 정오·선택지 피드백·해설·다음 행동을 보여 준다.
 * 키보드만으로 완료할 수 있다(라디오 ↔ 화살표, 제출 ↔ Enter). 결과 요약은 aria-live 영역에 한 줄로 알린다.
 * 409(콘텐츠 버전 불일치)면 문항을 다시 받아 재시도하게 안내한다.
 */
export default function QuizPanel({ conceptId, reviewQuizIds, nextConceptId, onGraded }: Props) {
  const { isAuthenticated } = useAuth();
  const quiz = useLoad<Quiz>(signal => learningApi.quiz(conceptId, signal), [conceptId]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [missing, setMissing] = useState<number[]>([]);
  const summaryRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);
  const headingId = useId();

  // 개념이 바뀌면 부모가 key 로 이 패널을 새로 만들어 답·결과가 비워진다.

  // 채점이 끝나면 결과 요약으로 초점을 옮긴다(제출 버튼이 사라져 초점이 body 로 떨어지는 것을 막는다).
  useEffect(() => { if (result) summaryRef.current?.focus(); }, [result]);

  // 내 학습 → 오답 문항으로 스크롤(문항이 그려진 뒤 한 번만).
  useEffect(() => {
    if (!quiz.data || scrolledRef.current) return;
    const hash = window.location.hash;
    const match = hash.match(/^#quiz-(\d+)$/);
    if (!match) return;
    const target = document.getElementById(`quiz-${match[1]}`);
    if (target) {
      scrolledRef.current = true;
      target.scrollIntoView({ block: "start", behavior: "instant" });
      target.focus({ preventScroll: true });
    }
  }, [quiz.data]);

  if (quiz.error) return <LoadError error={quiz.error} message="확인 문제를 불러오지 못했어요. 잠시 뒤 다시 시도해요." onRetry={quiz.retry} />;
  if (!quiz.data) return <Loading message="확인 문제를 불러오고 있어요" minHeight={240} />;
  const questions = quiz.data.questions;
  const resultById = new Map(result?.items.map(item => [item.quizId, item]) ?? []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const unanswered = questions.filter(q => answers[q.id] === undefined).map(q => q.id);
    setMissing(unanswered);
    if (unanswered.length > 0) {
      setProblem(`${unanswered.map(id => `${id}번`).join(", ")} 문항의 답을 아직 고르지 않았어요. 모두 고른 뒤 제출해요.`);
      document.getElementById(`quiz-${unanswered[0]}`)?.focus();
      return;
    }
    setProblem(null);
    setSubmitting(true);
    try {
      const body = { contentVersion: quiz.data!.contentVersion, answers: Object.fromEntries(Object.entries(answers).map(([k, v]) => [String(k), v])) };
      const graded = await learningApi.submitQuiz(conceptId, body);
      setResult(graded);
      onGraded?.(graded);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setProblem("문제 내용이 새로 게시되어 지금 고른 답을 채점할 수 없어요. 문항을 다시 불러온 뒤 다시 풀어요.");
        quiz.retry();
        setAnswers({});
      } else {
        setProblem(errorMessage(error, "채점하지 못했어요. 잠시 뒤 다시 시도해요."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => { setAnswers({}); setResult(null); setProblem(null); setMissing([]); document.getElementById(`quiz-${questions[0]?.id}`)?.focus(); };
  const correctCount = result?.items.filter(i => i.correct).length ?? 0;

  return (
    <section className="quiz" id="quiz" aria-labelledby={headingId}>
      <div className="quiz-head">
        <h2 id={headingId}>확인 문제 <em>{questions.length}문항</em></h2>
        <p>각 문항의 답을 하나씩 고르고 제출하면 문항별 정오와 해설을 보여 줘요. 80점 이상이면 완료이고, {isAuthenticated ? "로그인 상태라 점수가 내 학습에 남아요." : "로그인하면 점수가 내 학습에 남아요."}</p>
      </div>

      <div className="quiz-summary" ref={summaryRef} tabIndex={-1} aria-live="polite" aria-atomic="true">
        {result && (
          <>
            <StatusChip label={result.passed ? "통과" : "미통과"} tone={result.passed ? "good" : "warn"} />
            <strong>{questions.length}문항 중 {correctCount}문항 정답 · {result.score}점</strong>
            <span className="muted">{result.saved ? "내 학습에 기록했어요." : "로그인하지 않아 기록하지 않았어요."}{!result.passed && " 80점 이상이면 완료로 표시돼요. 해설을 읽고 다시 풀어요."}</span>
          </>
        )}
      </div>

      <form onSubmit={submit} noValidate>
        <ol className="quiz-list">
          {questions.map((question, index) => {
            const graded = resultById.get(question.id);
            const isReview = reviewQuizIds.includes(question.id);
            const isMissing = missing.includes(question.id);
            return (
              <li key={question.id} id={`quiz-${question.id}`} tabIndex={-1} className={`quiz-item${graded ? (graded.correct ? " is-correct" : " is-wrong") : ""}`}>
                <fieldset disabled={!!result || submitting} aria-invalid={isMissing || undefined}>
                  <legend>
                    <span className="quiz-no">문항 {index + 1}</span>
                    {isReview && !graded && <StatusChip label="지난 시도 오답" tone="warn" />}
                    {graded && <StatusChip label={graded.correct ? "정답" : "오답"} tone={graded.correct ? "good" : "danger"} />}
                    <span className="quiz-question">{question.question}</span>
                  </legend>
                  {isMissing && !result && <p className="field-error">이 문항의 답을 골라요.</p>}
                  <div className="quiz-options">
                    {question.options.map(option => {
                      const chosen = answers[question.id] === option.id;
                      const isAnswer = graded?.correctOptionId === option.id;
                      return (
                        <label key={option.id} className={`quiz-option${chosen ? " is-chosen" : ""}${isAnswer ? " is-answer" : ""}`}>
                          <input
                            type="radio"
                            name={`quiz-${question.id}`}
                            value={option.id}
                            checked={chosen}
                            onChange={() => setAnswers(prev => ({ ...prev, [question.id]: option.id }))}
                          />
                          <span className="quiz-option-text">{option.text}</span>
                          {graded && isAnswer && <span className="quiz-option-mark">정답</span>}
                          {graded && chosen && !isAnswer && <span className="quiz-option-mark is-wrong">내 답</span>}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                {graded && (
                  <dl className="quiz-explain">
                    <div><dt>피드백</dt><dd>{graded.feedback}</dd></div>
                    <div><dt>해설</dt><dd>{graded.explanation}</dd></div>
                    <div><dt>다음 행동</dt><dd>{graded.nextAction}</dd></div>
                  </dl>
                )}
              </li>
            );
          })}
        </ol>

        {problem && <p className="form-error" role="alert">{problem}</p>}

        <div className="form-actions quiz-actions">
          {!result ? (
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "채점하고 있어요…" : "제출하고 채점하기"}</button>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" onClick={reset}>다시 풀기</button>
              {result.saved && <Link className="btn btn-secondary" to="/me/learning">내 학습 보기</Link>}
              {nextConceptId && result.passed && <Link className="btn btn-primary" to={`/learn/${nextConceptId}`}>다음 개념으로 <Icon name="next" size={15} /></Link>}
            </>
          )}
          <span className="faint">답한 문항 {Object.keys(answers).length} / {questions.length}</span>
        </div>
      </form>
    </section>
  );
}
