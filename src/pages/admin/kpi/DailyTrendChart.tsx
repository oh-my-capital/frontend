import { useId } from "react";
import type { KpiDay } from "../../../api/insight";
import { ChartShell, axisTicks, labelStep } from "../../../components/charts/chartShell";
import { formatDate, formatNumber } from "../../../lib/format";
import { shortDay } from "./kpiFormat";

const W = 720;
const H = 250;
const PAD = { top: 20, right: 20, bottom: 34, left: 52 };

type SeriesKey = "visitors" | "signups" | "learningActiveUsers";
const SERIES: { key: SeriesKey; label: string; className: string; color: string }[] = [
  { key: "visitors", label: "방문자", className: "kpi-s-visitors", color: "var(--primary)" },
  { key: "signups", label: "가입", className: "kpi-s-signups", color: "var(--accent)" },
  { key: "learningActiveUsers", label: "학습 활성", className: "kpi-s-learners", color: "var(--good)" },
];

/**
 * 일별 추이(S-400): 방문자·가입·학습 활성 세 선을 같은 축에 그린다. 범례·요약 문장·접힌 값 표가 같은 숫자를 글로 반복한다(ui-guidelines §7).
 * 값 표에는 그림에 없는 화면 조회·개념 완료·미션·신청·실행·계산기 실행까지 모두 둔다.
 */
export default function DailyTrendChart({ days }: { days: KpiDay[] }) {
  const id = useId();
  const max = Math.max(0, ...days.flatMap(d => SERIES.map(s => d[s.key])));
  const { top, ticks } = axisTicks(max);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (days.length <= 1 ? innerW / 2 : (innerW * i) / (days.length - 1));
  const y = (v: number) => PAD.top + innerH - (innerH * v) / top;
  const step = labelStep(days.length, 10);
  const total = (key: SeriesKey) => days.reduce((sum, d) => sum + d[key], 0);
  const busiest = days.reduce<KpiDay | null>((best, d) => (best === null || d.visitors > best.visitors ? d : best), null);
  const summary = days.length === 0
    ? "표시할 날짜가 없다."
    : `${formatDate(days[0].date)}부터 ${formatDate(days[days.length - 1].date)}까지 ${days.length}일. 가입 ${formatNumber(total("signups"))}명`
      + (busiest && busiest.visitors > 0 ? `, 방문자가 가장 많은 날은 ${formatDate(busiest.date)}(${formatNumber(busiest.visitors)}명)이다.` : ", 방문 기록은 아직 없다.");

  return (
    <ChartShell
      title="일별 추이"
      note="세로축 = 사람 수(서울 날짜 기준)"
      legend={SERIES.map(s => ({ color: s.color, label: s.label }))}
      summary={summary}
      data={(
        <div className="table-scroll">
          <table className="table table-compact">
            <caption className="sr-only">일별 지표 값</caption>
            <thead>
              <tr>
                <th scope="col">날짜</th>
                <th scope="col" className="num">방문자</th>
                <th scope="col" className="num">화면 조회</th>
                <th scope="col" className="num">가입</th>
                <th scope="col" className="num">학습 활성</th>
                <th scope="col" className="num">개념 완료</th>
                <th scope="col" className="num">미션 달성</th>
                <th scope="col" className="num">신청</th>
                <th scope="col" className="num">실행</th>
                <th scope="col" className="num">계산기 실행</th>
              </tr>
            </thead>
            <tbody>
              {days.map(d => (
                <tr key={d.date}>
                  <th scope="row" className="nowrap">{formatDate(d.date)}</th>
                  <td className="num">{formatNumber(d.visitors)}</td>
                  <td className="num">{formatNumber(d.pageViews)}</td>
                  <td className="num">{formatNumber(d.signups)}</td>
                  <td className="num">{formatNumber(d.learningActiveUsers)}</td>
                  <td className="num">{formatNumber(d.conceptCompletions)}</td>
                  <td className="num">{formatNumber(d.missionCompletions)}</td>
                  <td className="num">{formatNumber(d.applications)}</td>
                  <td className="num">{formatNumber(d.executions)}</td>
                  <td className="num">{formatNumber(d.calculatorRuns)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    >
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`}>
        <title id={`${id}-t`}>일별 방문자·가입·학습 활성 추이</title>
        <desc id={`${id}-d`}>{summary}</desc>
        {ticks.map(t => (
          <g key={t}>
            <line className="chart-grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="chart-label" x={PAD.left - 8} y={y(t) + 4} textAnchor="end">{formatNumber(t)}</text>
          </g>
        ))}
        <line className="chart-axis" x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} />
        {SERIES.map(s => (
          <g key={s.key} className={s.className}>
            {days.length > 1 && <polyline className="kpi-line" points={days.map((d, i) => `${x(i).toFixed(1)},${y(d[s.key]).toFixed(1)}`).join(" ")} />}
            {days.map((d, i) => <circle key={d.date} className="kpi-dot" cx={x(i)} cy={y(d[s.key])} r={days.length > 45 ? 1.5 : 2.5} />)}
          </g>
        ))}
        {days.map((d, i) => (i % step === 0 || i === days.length - 1) && (
          <text key={d.date} className="chart-label" x={x(i)} y={H - 10} textAnchor="middle">{shortDay(d.date)}</text>
        ))}
      </svg>
    </ChartShell>
  );
}
