import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { errorMessage } from "../../api/client";
import { industryApi, type IndustryAnswerResult, type IndustryMetric, type IndustryQuestion, type MetricId } from "../../api/industry";
import Icon from "../../components/Icon";
import StatusChip from "../../components/StatusChip";
import "../../styles/learn.css";

/**
 * 해석 문항(S-343). 학습 확인 문제(QuizPanel)와 같은 모양(.quiz-*)을 쓰되 채점은 업권 비교 API 가 한다.
 * 라디오로 고르고 제출하면 문항별 정오·정답 보기·해설·연결 지표·다음 화면을 보여 준다. 로그인·기록이 없다.
 * 결과 요약으로 초점을 옮기고 aria-live 로 한 줄 알린다.
 */
export default function IndustryQuiz({ questions, metrics }: { questions: IndustryQuestion[]; metrics: Map<MetricId, IndustryMetric> }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<IndustryAnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const summaryRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (result) summaryRef.current?.focus(); }, [result]);

  const byId = new Map(result?.items.map(i => [i.questionId, i]) ?? []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const unanswered = questions.filter(q => answers[q.id] === undefined).map(q => q.id);
    setMissing(unanswered);
    if (unanswered.length > 0) {
      const numbers = unanswered.map(id => `${questions.findIndex(q => q.id === id) + 1}번`).join(", ");
      setProblem(`${numbers} 문항의 답을 아직 고르지 않았어요. 모두 고른 뒤 제출해요.`);
      document.getElementById(`industry-${unanswered[0]}`)?.focus();
      return;
    }
    setProblem(null);
    setSubmitting(true);
    try {
      setResult(await industryApi.answers(answers));
    } catch (error) {
      setProblem(errorMessage(error, "채점하지 못했어요. 잠시 뒤 다시 시도해요."));
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setAnswers({}); setResult(null); setProblem(null); setMissing([]);
    document.getElementById(`industry-${questions[0]?.id}`)?.focus();
  };

  return (
    <div className="quiz industry-quiz">
      <div className="quiz-head">
        <h3>해석 문항 <em>{questions.length}문항</em></h3>
        <p>지표 비교표의 숫자를 근거로 고른다. 정답은 서버만 알고 있어 제출해야 해설이 열린다.</p>
      </div>
      <div className="quiz-summary" ref={summaryRef} tabIndex={-1} aria-live="polite" aria-atomic="true">
        {result && (
          <dl className="figure-row">
            <div><dt>점수</dt><dd>{result.score}<small>점</small></dd></div>
            <div><dt>정답 수</dt><dd>{result.correctCount}<small>/ {result.total}문항</small></dd></div>
            <div><dt>기록</dt><dd><StatusChip label="저장하지 않음" tone="neutral" /></dd></div>
          </dl>
        )}
      </div>
      <form onSubmit={submit} noValidate>
        <ol className="quiz-list">
          {questions.map((q, index) => {
            const graded = byId.get(q.id);
            const isMissing = missing.includes(q.id);
            return (
              <li key={q.id} id={`industry-${q.id}`} tabIndex={-1} className={`quiz-item${graded ? (graded.correct ? " is-correct" : " is-wrong") : ""}`}>
                <fieldset disabled={!!result || submitting} aria-invalid={isMissing || undefined}>
                  <legend>
                    <span className="quiz-no">문항 {index + 1}</span>
                    {graded && <StatusChip label={graded.correct ? "정답" : graded.selectedOptionId ? "오답" : "답하지 않음"} tone={graded.correct ? "good" : "danger"} />}
                    <span className="quiz-question">{q.question}</span>
                  </legend>
                  {isMissing && !result && <p className="field-error">이 문항의 답을 골라요.</p>}
                  <div className="quiz-options">
                    {q.options.map(o => {
                      const chosen = answers[q.id] === o.id;
                      const isAnswer = graded?.correctOptionId === o.id;
                      return (
                        <label key={o.id} className={`quiz-option${chosen ? " is-chosen" : ""}${isAnswer ? " is-answer" : ""}`}>
                          <input type="radio" name={`industry-${q.id}`} value={o.id} checked={chosen} onChange={() => setAnswers(prev => ({ ...prev, [q.id]: o.id }))} />
                          <span className="quiz-option-text">{o.text}</span>
                          {graded && isAnswer && <span className="quiz-option-mark">정답</span>}
                          {graded && chosen && !isAnswer && <span className="quiz-option-mark is-wrong">내 답</span>}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                {graded && (
                  <dl className="quiz-explain">
                    <div><dt>해설</dt><dd>{graded.explanation}</dd></div>
                    <div>
                      <dt>연결 지표</dt>
                      <dd>{graded.relatedMetrics.map((id, i) => <span key={id}>{i > 0 && " · "}<a href={`#metric-${id}`}>{metrics.get(id)?.name ?? id}</a></span>)}</dd>
                    </div>
                    {graded.nextLink && <div><dt>더 보기</dt><dd><Link to={graded.nextLink.path}>{graded.nextLink.label} <Icon name="next" size={14} /></Link></dd></div>}
                  </dl>
                )}
              </li>
            );
          })}
        </ol>
        {problem && <p className="form-error" role="alert">{problem}</p>}
        <div className="form-actions quiz-actions">
          {!result
            ? <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "채점하고 있어요…" : "제출하고 채점하기"}</button>
            : <button type="button" className="btn btn-secondary" onClick={reset}>다시 풀기</button>}
          <span className="faint">답한 문항 {Object.keys(answers).length} / {questions.length}</span>
        </div>
      </form>
    </div>
  );
}
