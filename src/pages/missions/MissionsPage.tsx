import { useState } from "react";
import { Link } from "react-router-dom";
import { DIFFICULTY_LABEL, missionsApi, type Mission, type MissionDifficulty, type MyMissions } from "../../api/missions";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import ProgressBar from "../../components/ProgressBar";
import StatusChip from "../../components/StatusChip";
import SubPageHeader from "../../components/SubPageHeader";
import { FilterGroup } from "../../components/Tabs";
import { useAuth } from "../../context/AuthContext";
import { formatDate } from "../../lib/format";
import { useLoad } from "../learn/useLoad";
import "../../styles/missions.css";

const FILTERS: { id: "ALL" | MissionDifficulty; label: string }[] = [
  { id: "ALL", label: "전체" },
  { id: "BASIC", label: "기초" },
  { id: "INTERMEDIATE", label: "중급" },
  { id: "ADVANCED", label: "심화" },
];

/**
 * 미션 목록(S-200). 정의는 공개(GET /missions), 로그인하면 GET /me/missions 로 다시 판정한 진행을 함께 보인다.
 * 상태는 글자 라벨(완료·진행 전)로, 진행률은 공용 ProgressBar 로 보인다.
 */
export default function MissionsPage() {
  const { isAuthenticated } = useAuth();
  const missions = useLoad<Mission[]>(signal => missionsApi.list(signal), []);
  const mine = useLoad<MyMissions | null>(signal => (isAuthenticated ? missionsApi.mine(signal) : Promise.resolve(null)), [isAuthenticated]);
  const [filter, setFilter] = useState<"ALL" | MissionDifficulty>("ALL");

  const status = new Map(mine.data?.missions.map(m => [m.missionId, m]) ?? []);
  const list = missions.data ?? [];
  const rows = filter === "ALL" ? list : list.filter(m => m.difficulty === filter);
  const total = list.length;
  const done = mine.data?.completedCount ?? 0;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const next = isAuthenticated && mine.data ? list.find(m => !status.get(m.id)?.completed) : list[0];

  return (
    <>
      <SubPageHeader
        section="learn"
        current="/missions"
        title="학습 미션"
        description="모의 여신에서 직접 해 볼 과업 목록이에요. 미션마다 학습 목표와 단계별 힌트가 있고, 조건을 만족하면 서버가 샌드박스 상태와 사건 기록을 읽어 자동으로 완료 표시해요. 점수나 순위는 없어요."
        meta={missions.data ? `미션 ${total}개 · 기초 ${list.filter(m => m.difficulty === "BASIC").length} · 중급 ${list.filter(m => m.difficulty === "INTERMEDIATE").length} · 심화 ${list.filter(m => m.difficulty === "ADVANCED").length}` : undefined}
      />
      <main className="page-main missions">
        {missions.error ? (
          <LoadError error={missions.error} message="미션 목록을 불러오지 못했어요. 잠시 뒤 다시 시도해요." onRetry={missions.retry} />
        ) : !missions.data ? (
          <Loading message="미션 목록을 불러오고 있어요" minHeight={480} />
        ) : (
          <>
            <dl className="figure-row missions-figures">
              <div><dt>전체 미션</dt><dd>{total}<small>개</small></dd></div>
              <div><dt>완료</dt><dd>{isAuthenticated ? (mine.data ? done : "…") : "—"}{isAuthenticated && <small>개</small>}</dd></div>
              <div><dt>진행률</dt><dd className="accent">{isAuthenticated && mine.data ? `${percent}%` : "—"}</dd></div>
            </dl>

            <div className="page-grid missions-grid">
              <div>
                {!isAuthenticated && (
                  <p className="missions-login-note" role="note">
                    <Icon name="lock" size={16} />
                    <span>로그인하면 진행이 저장돼요. 지금은 미션 내용과 힌트만 볼 수 있어요.</span>
                    <Link to="/login" state={{ from: "/missions" }}>로그인</Link>
                  </p>
                )}
                {mine.error ? <LoadError error={mine.error} message="내 진행을 불러오지 못했어요. 목록은 그대로 볼 수 있어요." onRetry={mine.retry} /> : null}

                <FilterGroup label="난이도">
                  {FILTERS.map(f => (
                    <button key={f.id} type="button" className={filter === f.id ? "is-active" : undefined} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                      {f.label}
                    </button>
                  ))}
                </FilterGroup>

                <div className="table-scroll">
                  <table className="table missions-table">
                    <caption>미션 {rows.length}개{isAuthenticated && mine.data ? ` · 완료 ${rows.filter(m => status.get(m.id)?.completed).length}` : ""}
                      <span className="table-caption-note">상태는 이 화면을 열 때 서버가 다시 판정한 결과이다. 한 번 완료한 미션은 완료로 남는다.</span>
                    </caption>
                    <thead>
                      <tr><th scope="col" className="num">순서</th><th scope="col">미션</th><th scope="col" className="missions-col-wide">난이도</th><th scope="col" className="missions-col-wide">연결 개념</th><th scope="col">상태</th></tr>
                    </thead>
                    <tbody>
                      {rows.map(m => {
                        const s = status.get(m.id);
                        const d = DIFFICULTY_LABEL[m.difficulty];
                        return (
                          <tr key={m.id} className={s?.completed ? "is-done" : undefined}>
                            <td className="num">{String(m.orderNo).padStart(2, "0")}</td>
                            <th scope="row">
                              <Link to={`/missions/${m.id}`}>{m.title}</Link>
                              <span className="missions-goal">{m.goal}</span>
                              <span className="missions-mobile-meta">난이도 {d.label} · 연결 개념 {m.concepts.length}개</span>
                            </th>
                            <td className="missions-col-wide"><StatusChip label={d.label} tone={d.tone} /></td>
                            <td className="missions-concepts missions-col-wide">{m.concepts.map(c => <Link key={c.id} to={`/learn/${c.id}`}>{c.title}</Link>)}</td>
                            <td>
                              {!isAuthenticated ? <span className="faint">로그인 후 판정</span>
                                : !mine.data ? <span className="faint">판정 중</span>
                                : s?.completed ? <StatusChip label="완료" tone="good" detail={s.completedBusinessDate ? ` ${formatDate(s.completedBusinessDate)}` : undefined} />
                                : <StatusChip label="진행 전" tone="neutral" />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <aside aria-label="진행률과 판정 방법">
                <div className="panel">
                  <h3>내 진행</h3>
                  {isAuthenticated && mine.data ? (
                    <>
                      <p className="progress-meta"><span className="muted">완료한 미션</span><strong>{done} / {total}</strong></p>
                      <ProgressBar value={done} total={total} tone={done === total ? "good" : "primary"} label={`${total}개 중 ${done}개 완료`} />
                      {mine.data.businessDate && <p className="faint missions-aside-note">판정 기준 영업일 {formatDate(mine.data.businessDate)}</p>}
                    </>
                  ) : (
                    <p className="muted">{isAuthenticated ? "진행을 판정하고 있어요." : "로그인하면 완료한 미션과 진행률이 여기에 남아요."}</p>
                  )}
                  {next && (
                    <Link className="btn btn-primary btn-small missions-aside-action" to={`/missions/${next.id}`}>
                      {isAuthenticated && mine.data ? "다음 미션" : "첫 미션"}: {next.title} <Icon name="next" size={15} />
                    </Link>
                  )}
                </div>
                <div className="panel panel-soft">
                  <h3>판정은 이렇게 해요</h3>
                  <ol className="missions-steps">
                    <li>미션을 열어 학습 목표와 힌트를 읽어요.</li>
                    <li>연결 화면에서 신청·실행·시간 진행·상환을 직접 해요.</li>
                    <li>미션 화면의 "지금 판정하기"를 누르거나 이 목록을 다시 열면 조건별 충족 여부가 갱신돼요.</li>
                  </ol>
                  <p className="faint">판정은 내 샌드박스의 계약 상태·사건 기록·알림·확인 문제 결과를 읽기만 하고 아무것도 바꾸지 않아요.</p>
                </div>
              </aside>
            </div>
          </>
        )}
        <div className="next-actions">
          <Link to="/sandbox">내 모의 여신 <Icon name="next" size={16} /></Link>
          <Link to="/course">입문 과정 목차 <Icon name="next" size={16} /></Link>
          <Link to="/me/learning">내 학습 <Icon name="next" size={16} /></Link>
        </div>
      </main>
    </>
  );
}
