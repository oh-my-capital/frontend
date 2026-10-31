import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { errorMessage } from "../../api/client";
import { DIFFICULTY_LABEL, missionsApi, screenLabel, type ConditionStatus, type Mission, type MissionCondition, type MissionStatus, type MyMissions } from "../../api/missions";
import Disclosure from "../../components/Disclosure";
import EmptyState from "../../components/EmptyState";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import StatusChip from "../../components/StatusChip";
import SubPageHeader from "../../components/SubPageHeader";
import { useAuth } from "../../context/AuthContext";
import { formatDate } from "../../lib/format";
import { useLoad } from "../learn/useLoad";
import "../../styles/missions.css";

const GROUP_LABEL: Record<string, string> = { ALL_OF: "모두 충족", ANY_OF: "하나 이상 충족" };

/**
 * 미션 상세(S-201). 학습 목표 · 단계 힌트(하나씩 펼침) · 판정 조건 표(조건별 충족 여부·현재 값) · "지금 판정하기" ·
 * 연결 개념/화면 버튼 · 이전/다음 미션. 비로그인은 조건 목록만 보고 "로그인하면 진행이 저장돼요" 안내를 본다.
 * 현재 위치 줄은 SubPageHeader(WP15 소유)의 배우기 탭 목록을 따른다. detail 을 쓰지 않아 탭 목록에 /missions 가 없어도 이름이 어긋나지 않는다.
 */
export default function MissionPage() {
  const { id = "" } = useParams();
  const { isAuthenticated } = useAuth();
  const missions = useLoad<Mission[]>(signal => missionsApi.list(signal), []);
  const mine = useLoad<MyMissions | null>(signal => (isAuthenticated ? missionsApi.mine(signal) : Promise.resolve(null)), [isAuthenticated, id]);
  // 판정 결과는 미션 id 와 함께 둔다. 다른 미션으로 옮겨 가면 그 미션의 결과가 아니므로 쓰지 않는다.
  const [checked, setChecked] = useState<{ id: string; status: MissionStatus } | null>(null);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<{ id: string; text: string } | null>(null);
  const [opened, setOpened] = useState<{ id: string; count: number }>({ id, count: 1 });

  const list = missions.data ?? [];
  const index = list.findIndex(m => m.id === id);
  const mission = index >= 0 ? list[index] : null;
  const status = (checked?.id === id ? checked.status : null) ?? mine.data?.missions.find(m => m.missionId === id) ?? null;
  const hintCount = opened.id === id ? opened.count : 1;
  const liveText = message?.id === id ? message.text : "";

  async function judge() {
    setChecking(true);
    setMessage(null);
    try {
      const result = await missionsApi.check(id);
      setChecked({ id, status: result });
      const met = countSatisfied(result.conditions);
      setMessage({
        id,
        text: result.newlyCompleted ? "조건을 모두 만족해 미션을 완료했어요."
          : result.completed ? "이미 완료한 미션이에요. 조건별 충족 여부는 지금 데이터로 다시 계산했어요."
          : `아직 완료 전이에요. 조건 ${result.conditions.length}개 중 ${met}개를 만족했어요.`,
      });
    } catch (error) {
      setMessage({ id, text: errorMessage(error, "판정하지 못했어요. 잠시 뒤 다시 시도해요.") });
    } finally {
      setChecking(false);
    }
  }

  if (missions.error) {
    return <main className="page-main"><LoadError error={missions.error} message="미션을 불러오지 못했어요. 잠시 뒤 다시 시도해요." onRetry={missions.retry} /></main>;
  }
  if (!missions.data) {
    return <main className="page-main"><Loading message="미션을 불러오고 있어요" minHeight={480} /></main>;
  }
  if (!mission) {
    return (
      <main className="page-main">
        <EmptyState title="없는 미션이에요" description="주소가 바뀌었거나 미션이 정리됐어요. 미션 목록에서 다시 골라요." action={{ to: "/missions", label: "미션 목록" }} />
      </main>
    );
  }

  const difficulty = DIFFICULTY_LABEL[mission.difficulty];
  const prev = index > 0 ? list[index - 1] : null;
  const next = index < list.length - 1 ? list[index + 1] : null;

  return (
    <>
      <SubPageHeader
        section="learn"
        current="/missions"
        title={mission.title}
        description={mission.goal}
        meta={<>
          <span className="mission-no">미션 {String(mission.orderNo).padStart(2, "0")} / {list.length}</span>
          <StatusChip label={difficulty.label} tone={difficulty.tone} />
          {" "}
          {!isAuthenticated ? <StatusChip label="로그인 전" tone="neutral" />
            : status?.completed ? <StatusChip label="완료" tone="good" detail={status.completedBusinessDate ? ` 영업일 ${formatDate(status.completedBusinessDate)}` : undefined} />
            : mine.data || checked ? <StatusChip label="진행 전" tone="neutral" />
            : <span className="faint">판정 중</span>}
        </>}
      />
      <main className="page-main missions">
        <div className="page-grid missions-grid">
          <div className="mission-body">
            {!isAuthenticated && (
              <p className="missions-login-note" role="note">
                <Icon name="lock" size={16} />
                <span>로그인하면 진행이 저장돼요. 로그인 전에는 조건만 보이고 판정은 하지 않아요.</span>
                <Link to="/login" state={{ from: `/missions/${mission.id}` }}>로그인</Link>
              </p>
            )}

            <section aria-labelledby="mission-hints">
              <div className="section-head"><div><h2 id="mission-hints">단계별 힌트</h2><p>막히면 다음 힌트를 하나씩 펼쳐요.</p></div></div>
              <ol className="mission-hints">
                {mission.hints.slice(0, hintCount).map((hint, i) => <li key={i}>{hint}</li>)}
              </ol>
              {hintCount < mission.hints.length ? (
                <button type="button" className="btn btn-secondary btn-small" onClick={() => setOpened({ id, count: hintCount + 1 })}>
                  다음 힌트 보기 ({hintCount} / {mission.hints.length})
                </button>
              ) : <p className="faint">힌트 {mission.hints.length}개를 모두 펼쳤어요.</p>}
            </section>

            <section aria-labelledby="mission-conditions" className="mission-section">
              <div className="section-head"><div><h2 id="mission-conditions">판정 조건</h2><p>아래 조건을 모두 만족하면 완료예요. 판정은 내 샌드박스와 학습 기록을 읽기만 해요.</p></div></div>
              {mine.error ? <LoadError error={mine.error} message="내 진행을 불러오지 못했어요. 지금 판정하기로 다시 시도할 수 있어요." /> : null}
              <table className="table mission-conditions">
                <caption>조건 {mission.conditions.length}개{status ? ` · 충족 ${countSatisfied(status.conditions)}` : ""}</caption>
                <thead><tr><th scope="col">조건</th><th scope="col">충족 여부</th></tr></thead>
                <tbody>
                  {mission.conditions.map((condition, i) => (
                    <ConditionRow key={i} condition={condition} result={status?.conditions[i] ?? null} isAuthenticated={isAuthenticated} />
                  ))}
                </tbody>
              </table>
              {isAuthenticated && (
                <div className="btn-row mission-check">
                  <button type="button" className="btn btn-primary" onClick={judge} disabled={checking}>
                    <Icon name="check" size={16} />{checking ? "판정하고 있어요" : "지금 판정하기"}
                  </button>
                  <span className="faint">내 샌드박스의 지금 상태로 다시 계산해요.</span>
                </div>
              )}
              <p className="mission-live" aria-live="polite">{liveText}</p>
            </section>
            <Disclosure data={{ ruleSetVersion: "v1", calcVersion: "v1", notice: "교육용 모의 과업이며 실제 대출·신용 기록과 관계없습니다." }} />
          </div>

          <aside aria-label="연결 개념과 화면">
            <div className="panel">
              <h3>해 볼 화면</h3>
              <p className="muted">이 과업은 아래 화면에서 시작해요.</p>
              <Link className="btn btn-primary btn-small mission-action" to={mission.screenPath}>{screenLabel(mission.screenPath)} <Icon name="next" size={15} /></Link>
            </div>
            <div className="panel panel-soft">
              <h3>연결 개념</h3>
              <ul className="mission-concepts">
                {mission.concepts.map(c => (
                  <li key={c.id}><Link className="btn btn-secondary btn-small" to={`/learn/${c.id}`}><Icon name="book" size={15} />{c.title}</Link></li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        <nav className="next-actions mission-pager" aria-label="이전·다음 미션">
          {prev ? <Link to={`/missions/${prev.id}`}><Icon name="prev" size={16} />이전: {prev.title}</Link> : <span />}
          <Link to="/missions">미션 목록</Link>
          {next ? <Link to={`/missions/${next.id}`}>다음: {next.title}<Icon name="next" size={16} /></Link> : <span />}
        </nav>
      </main>
    </>
  );
}

/** 조건 한 줄. ALL_OF·ANY_OF 는 하위 조건을 같은 칸 안의 목록으로 보인다. */
function ConditionRow({ condition, result, isAuthenticated }: { condition: MissionCondition; result: ConditionStatus | null; isAuthenticated: boolean }) {
  const group = GROUP_LABEL[condition.type];
  return (
    <tr className={result?.satisfied ? "is-met" : undefined}>
      <th scope="row">
        {condition.label}
        {group && <span className="mission-group">{group}</span>}
        {condition.conditions.length > 0 && (
          <ul className="mission-children">
            {condition.conditions.map((child, i) => {
              const r = result?.children[i];
              return (
                <li key={i}>
                  <span>{child.label}</span>
                  {r && <SatisfiedChip satisfied={r.satisfied} current={r.current} />}
                </li>
              );
            })}
          </ul>
        )}
      </th>
      <td>
        {result ? <SatisfiedChip satisfied={result.satisfied} current={result.current} />
          : <span className="faint">{isAuthenticated ? "판정 중" : "로그인 후 판정"}</span>}
      </td>
    </tr>
  );
}

function SatisfiedChip({ satisfied, current }: { satisfied: boolean; current: string | null }) {
  return (
    <span className="mission-result">
      <StatusChip label={satisfied ? "충족" : "미충족"} tone={satisfied ? "good" : "neutral"} />
      {current && <span className="faint">{current}</span>}
    </span>
  );
}

function countSatisfied(conditions: ConditionStatus[]): number {
  return conditions.filter(c => c.satisfied).length;
}
