import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { homeApi } from "../api/home";
import type { ConceptSummary, MyLearning, Sandbox } from "../api/types";
import Icon from "../components/Icon";
import Loading from "../components/Loading";
import LoadError from "../components/LoadError";
import Money from "../components/Money";
import StatusChip from "../components/StatusChip";
import { useAuth } from "../context/AuthContext";
import { formatDate, formatNumber } from "../lib/format";

/** 계산 예시 1(docs/domain/calculation-examples.md)의 첫 3회차. 골든 값이라 손으로 옮긴다. */
const EXAMPLE_1_FIRST_ROWS = [
  { installmentNo: 1, principal: 788_488, interest: 100_000, payment: 888_488, balanceAfter: 9_211_512 },
  { installmentNo: 2, principal: 796_373, interest: 92_115, payment: 888_488, balanceAfter: 8_415_139 },
  { installmentNo: 3, principal: 804_337, interest: 84_151, payment: 888_488, balanceAfter: 7_610_802 },
];

/** 홈(S-01). 포털형: 배너 → 통합 검색 → 계산기 바로가기 표 → 학습 목차 12 → (로그인) 내 샌드박스 현황 표. */
export default function HomePage() {
  const notice = (useLocation().state as { notice?: string } | null)?.notice;
  const { isAuthenticated } = useAuth();
  return (
    <main>
      {notice && <p className="home-notice" role="status">{notice}</p>}
      <Banner />
      <div className="home-main">
        <HomeSearch />
        <CalculatorTable />
        <CourseList />
        {isAuthenticated && <SandboxStatus />}
      </div>
    </main>
  );
}

// 배너 문구는 실제 기능만 설명한다. 이용자 수·만족도 같은 수치와 마케팅 어휘를 넣지 않는다.
const SLIDES = [
  { tag: "입문 과정", title: ["여신전문금융업이 무엇인지부터", "중도상환 수수료까지 12개 개념으로"], description: "캐피탈과 은행의 차이, 금리의 구성, 한도의 규칙, 연체와 기한이익상실, 건전성 분류를 순서대로 읽고 개념마다 확인 문제를 풀어요. 출처와 확인일을 함께 적어요.", to: "/course", action: "입문 과정 목차 보기", image: { src: "/images/capital-desk.webp", alt: "남색 장부 모양 건물 앞 계단에서 장부를 읽고 막대그래프를 보며 이야기하는 사람들의 일러스트" } },
  { tag: "계산기", title: ["상환 방식 세 가지의 월 납입액을", "한 표에서 비교해요"], description: "원금·기간·금리를 넣으면 원리금균등·원금균등·만기일시의 회차표와 총이자를 같이 보여 줘요. 심사 시뮬레이터는 금리와 한도가 어느 규칙에서 정해졌는지 근거를 표로 보여 줘요.", to: "/calculators/schedule", action: "상환 스케줄 계산기 열기", image: { src: "/images/capital-calculator.webp", alt: "커다란 계산기 옆에서 원금은 늘고 이자는 줄어드는 회차별 막대그래프를 가리키고, 길게 출력된 회차표를 확인하는 사람들의 일러스트" } },
  { tag: "모의 여신", title: ["가상 고객으로 대출을 신청하고", "시간을 넘겨 연체까지 겪어 봐요"], description: "프로필을 만들고 신청하면 규칙 심사가 바로 결정을 내려요. 실행 뒤에는 가상 시계를 하루씩, 다음 납입일까지 넘기며 자동이체·연체이자·충당금이 어떻게 처리되는지 봐요. 실명·실계좌는 쓰지 않아요.", to: "/sandbox", action: "내 모의 여신 열기", image: { src: "/images/capital-sandbox.webp", alt: "자동차 옆 상담 창구에서 상담원이 계약서 봉투를 건네고, 뒤로 시계와 넘어가는 달력이 보이는 일러스트" } },
];
const SLIDE_INTERVAL_MS = 7000;

/** 자동 넘김·일시정지. 마우스·키보드가 머무는 동안과 동작 줄이기 설정에서는 멈춘다(ui-guidelines §8). */
function Banner() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const [holding, setHolding] = useState(false);
  const slide = SLIDES[index];
  const move = (step: number) => setIndex(value => (value + step + SLIDES.length) % SLIDES.length);

  useEffect(() => {
    if (paused || holding) return;
    const timer = window.setTimeout(() => setIndex(value => (value + 1) % SLIDES.length), SLIDE_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [index, paused, holding]);

  return (
    <section
      className="home-banner"
      aria-roledescription="carousel"
      aria-label="주요 안내"
      onMouseEnter={() => setHolding(true)}
      onMouseLeave={() => setHolding(false)}
      onFocus={() => setHolding(true)}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setHolding(false); }}
    >
      <h1 className="sr-only">CapiMATE — 여신을 배우는 모의 캐피탈</h1>
      <div className="home-banner-inner">
        <div className="home-banner-copy" aria-live={paused ? "polite" : "off"}>
          <div key={slide.tag} className="home-slide" role="group" aria-roledescription="slide" aria-label={`${index + 1} / ${SLIDES.length}`}>
            <span className="home-slide-tag">{slide.tag}</span>
            <h2>{slide.title[0]}<br />{slide.title[1]}</h2>
            <p>{slide.description}</p>
          </div>
          <div className="home-banner-controls">
            <div className="home-pager">
              <span><strong>{String(index + 1).padStart(2, "0")}</strong><i aria-hidden="true" />{String(SLIDES.length).padStart(2, "0")}</span>
              <button type="button" onClick={() => move(-1)} aria-label="이전 안내"><Icon name="prev" size={16} /></button>
              <button type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? "자동 넘김 시작" : "자동 넘김 멈춤"} aria-pressed={paused}><Icon name={paused ? "play" : "pause"} size={15} /></button>
              <button type="button" onClick={() => move(1)} aria-label="다음 안내"><Icon name="next" size={16} /></button>
            </div>
            <Link className="btn btn-primary home-banner-action" to={slide.to}>{slide.action} <Icon name="next" size={15} /></Link>
          </div>
        </div>
        {/* 슬라이드 그림을 한 칸에 겹쳐 두고 현재 것만 보인다. 미리 받아 두므로 넘길 때 깜박이지 않는다. */}
        <div className="home-banner-art">
          {SLIDES.map((item, i) => (
            <img key={item.image.src} className={i === index ? "is-active" : undefined} src={item.image.src} alt={i === index ? item.image.alt : ""} aria-hidden={i === index ? undefined : true} width={1200} height={800} fetchPriority={i === 0 ? "high" : "low"} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** 계산기 표 아래의 계산 예시 1(골든 값) 첫 3회차. 가짜 수치가 아니라 문서의 실제 계산 결과다. */
function TodayExample() {
  return (
    <div className="home-example">
      <div className="home-example-head">
        <h3>오늘의 계산 예시</h3>
        <span>계산 예시 1 · 원리금균등</span>
      </div>
      <dl>
        <div><dt>원금</dt><dd><Money value={10_000_000} /></dd></div>
        <div><dt>기간 · 금리</dt><dd>12회 · 연 12.00%</dd></div>
        <div><dt>월 납입액</dt><dd><Money value={888_488} strong /></dd></div>
      </dl>
      <table className="table table-compact">
        <caption>첫 3회차 회차표(이자 절사, 월 납입액 반올림)</caption>
        <thead>
          <tr><th scope="col">회차</th><th scope="col" className="num">원금</th><th scope="col" className="num">이자</th><th scope="col" className="num">잔액</th></tr>
        </thead>
        <tbody>
          {EXAMPLE_1_FIRST_ROWS.map(row => (
            <tr key={row.installmentNo}>
              <th scope="row">{row.installmentNo}회</th>
              <td className="num">{formatNumber(row.principal)}</td>
              <td className="num">{formatNumber(row.interest)}</td>
              <td className="num">{formatNumber(row.balanceAfter)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="home-example-foot">
        <span>총이자 661,851원 · 12회차는 절사 보정으로 5원 적어요</span>
        <Link to="/calculators/schedule">같은 조건으로 계산하기</Link>
      </div>
    </div>
  );
}

// 처음 보는 분께 권하는 용어. 인기 순위가 아니므로 "자주 찾는"이라고 쓰지 않는다.
const SUGGESTED_TERMS = [
  { slug: "dsr", label: "DSR" },
  { slug: "equal-payment", label: "원리금균등" },
  { slug: "contract-rate", label: "약정이율" },
  { slug: "acceleration", label: "기한이익상실" },
  { slug: "installment-finance", label: "할부금융" },
];

/** 통합 검색: 제출 시 /glossary?q= 로 보낸다(용어·개념). */
function HomeSearch() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = value.trim();
    navigate(q ? `/glossary?q=${encodeURIComponent(q)}` : "/glossary");
  };
  return (
    <section className="home-search" aria-label="용어·개념 검색">
      <form role="search" onSubmit={submit}>
        <label className="sr-only" htmlFor="home-search-input">찾을 용어나 개념</label>
        <input id="home-search-input" type="search" value={value} onChange={event => setValue(event.target.value)} placeholder="용어나 개념을 찾아요. 예: 연체이자는 무엇에 붙나요" autoComplete="off" />
        <button type="submit" aria-label="용어 사전에서 찾기"><Icon name="search" size={24} /></button>
      </form>
      <p className="home-search-suggest">
        <span>처음이라면</span>
        {SUGGESTED_TERMS.map(term => <Link key={term.slug} to={`/glossary/${term.slug}`}>{term.label}</Link>)}
      </p>
    </section>
  );
}

const CALCULATORS = [
  { to: "/calculators/schedule", name: "상환 스케줄 계산기", what: "세 가지 상환 방식의 회차표와 총이자를 한 표에서 비교한다", inputs: "원금 · 기간 · 금리 · 실행일 · 납입일" },
  { to: "/calculators/screening", name: "심사 시뮬레이터", what: "자격 → 금리 → 한도 → 결정 순서로 심사하고 규칙별 근거를 표로 보여 준다", inputs: "생년월일 · 소득 · 기존 원리금 · 신용점수 · 상품 · 금액" },
  { to: "/calculators/prepayment", name: "중도상환 견적", what: "잔액·경과이자·수수료·총액을 계산하고 잔존기간별 수수료 추이를 그린다", inputs: "대출 조건 · 상환일 · 수수료율 · 일부 상환액" },
];

/** 바로 가는 계산기 3개: 카드가 아니라 표 형태 링크 묶음(ui-guidelines §5 ③). 로그인 없이 쓴다. */
function CalculatorTable() {
  return (
    <section className="home-section" aria-labelledby="home-calc-title">
      <div className="section-head">
        <div>
          <h2 id="home-calc-title">바로 가는 <em>계산기</em></h2>
          <p>로그인 없이 쓴다. 모든 결과 아래에 규칙·계산 버전과 교육용 고지를 붙인다.</p>
        </div>
        <Link to="/methodology">계산 규칙 보기 <Icon name="next" size={16} /></Link>
      </div>
      <table className="table table-links home-calc-table">
        <caption className="sr-only">계산기 목록</caption>
        <thead>
          <tr><th scope="col">계산기</th><th scope="col">무엇을 계산하나</th><th scope="col">입력</th><th scope="col"><span className="sr-only">열기</span></th></tr>
        </thead>
        <tbody>
          {CALCULATORS.map(calc => (
            <tr key={calc.to}>
              <th scope="row"><Link to={calc.to}><Icon name="calculator" size={18} />{calc.name}</Link></th>
              <td>{calc.what}</td>
              <td className="muted">{calc.inputs}</td>
              <td className="go"><Link to={calc.to}>열기 →</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
      <TodayExample />
    </section>
  );
}

/** 학습 목차 12개: 번호 목록, 로그인 시 진척 표시(API 또는 mock). */
function CourseList() {
  const { isAuthenticated } = useAuth();
  const [concepts, setConcepts] = useState<ConceptSummary[] | null>(null);
  const [learning, setLearning] = useState<MyLearning | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    homeApi.concepts(controller.signal).then(setConcepts).catch(err => { if (!controller.signal.aborted) setError(err); });
    if (isAuthenticated) homeApi.myLearning(controller.signal).then(result => { if (!controller.signal.aborted) setLearning(result); }).catch(() => undefined);
    return () => controller.abort();
  }, [isAuthenticated, tick]);

  // 로그아웃하면 진척은 바로 숨긴다(다시 로그인하면 새로 받는다).
  const myLearning = isAuthenticated ? learning : null;
  const completed = new Set(myLearning?.concepts.filter(c => c.completed).map(c => c.conceptId) ?? []);
  const started = new Set(myLearning?.concepts.filter(c => !c.completed && c.lastAttemptedAt).map(c => c.conceptId) ?? []);

  return (
    <section className="home-section" aria-labelledby="home-course-title">
      <div className="section-head">
        <div>
          <h2 id="home-course-title">입문 과정 <em>{concepts ? `${concepts.length}개` : "12개"} 개념</em></h2>
          <p>권장 순서는 1에서 12지만 어느 개념이든 바로 열 수 있다. 개념마다 확인 문제와 연결된 계산기가 있다.</p>
        </div>
        <Link to="/course">목차 자세히 <Icon name="next" size={16} /></Link>
      </div>
      <div className="home-course-grid">
        <aside className="home-course-side" aria-label="학습 진척">
          {myLearning ? (
            <div className="progress">
              <span className="muted">완료한 개념</span>
              <div><strong>{myLearning.completedCount}</strong><span className="muted"> / {myLearning.totalCount}</span></div>
              <div className="progress-bar" role="img" aria-label={`${myLearning.totalCount}개 중 ${myLearning.completedCount}개 완료`}><i style={{ width: `${myLearning.totalCount ? (myLearning.completedCount / myLearning.totalCount) * 100 : 0}%` }} /></div>
              {myLearning.nextConceptId && <p>다음으로 권하는 개념은 <Link to={`/learn/${myLearning.nextConceptId}`}>{concepts?.find(c => c.id === myLearning.nextConceptId)?.title ?? myLearning.nextConceptId}</Link>이에요.</p>}
            </div>
          ) : (
            <>
              <p>여신의 구조(1~4) → 금리·한도·심사(5~8) → 연체·건전성·중도상환(9~12) 순서로 읽으면 대출 한 건의 생애를 처음부터 끝까지 따라가게 돼요.</p>
              <p>로그인하면 확인 문제 점수와 완료 표시가 여기와 목차에 남아요.</p>
              {!isAuthenticated && <Link className="btn btn-secondary btn-small" to="/login">로그인하고 진척 기록하기</Link>}
            </>
          )}
        </aside>
        {error ? (
          <LoadError error={error} message="학습 목차를 불러오지 못했어요. 잠시 뒤 다시 시도해요." onRetry={() => { setError(null); setTick(t => t + 1); }} />
        ) : !concepts ? (
          <Loading message="학습 목차를 불러오고 있어요" minHeight={420} />
        ) : (
          <ol className="home-course-list" aria-label="입문 과정 목차">
            {concepts.map(concept => (
              <li key={concept.id}>
                <Link to={`/learn/${concept.id}`}>
                  <span className="no" aria-hidden="true">{String(concept.orderNo).padStart(2, "0")}</span>
                  <strong><span className="sr-only">{concept.orderNo}. </span>{concept.title}</strong>
                  <span className="meta">
                    문제 {concept.quizCount}
                    {completed.has(concept.id) && <StatusChip label="완료" tone="good" />}
                    {started.has(concept.id) && <StatusChip label="진행 중" tone="info" />}
                  </span>
                  <span className="summary">{concept.summary}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

/** 로그인 시 내 샌드박스 현황 표: 영업일·결제계좌·다음 납입·계약 수·연체·미읽음 알림. */
function SandboxStatus() {
  const [sandbox, setSandbox] = useState<Sandbox | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    homeApi.sandbox(controller.signal).then(setSandbox).catch(err => { if (!controller.signal.aborted) setError(err); });
    return () => controller.abort();
  }, [tick]);

  return (
    <section className="home-section home-sandbox" aria-labelledby="home-sandbox-title">
      <div className="section-head">
        <div>
          <h2 id="home-sandbox-title">내 <em>모의 여신</em> 현황</h2>
          <p>가상 시계는 내 샌드박스 안에서만 흐른다. 시간을 진행하면 그날의 일마감이 자동이체·연체·충당금을 처리한다.</p>
        </div>
        <Link to="/sandbox">샌드박스 열기 <Icon name="next" size={16} /></Link>
      </div>
      {error ? (
        <LoadError error={error} message="샌드박스 현황을 불러오지 못했어요. 잠시 뒤 다시 시도해요." onRetry={() => { setError(null); setTick(t => t + 1); }} />
      ) : !sandbox ? (
        <Loading message="샌드박스 현황을 불러오고 있어요" minHeight={240} />
      ) : (
        <>
          <table className="table">
            <caption>샌드박스 현황 · 영업일 {formatDate(sandbox.businessDate)} 기준</caption>
            <tbody>
              <tr><th scope="row">영업일</th><td>{formatDate(sandbox.businessDate)}</td></tr>
              <tr><th scope="row">결제계좌 잔액</th><td><Money value={sandbox.settlementBalance} /></td></tr>
              <tr><th scope="row">다음 납입일</th><td>{sandbox.nextDueDate ? formatDate(sandbox.nextDueDate) : "예정된 납입이 없어요"}</td></tr>
              <tr><th scope="row">진행 중 계약</th><td>{sandbox.activeContracts}건{sandbox.overdueContracts > 0 ? <> · <StatusChip label={`연체 ${sandbox.overdueContracts}건`} tone="danger" /></> : <> · <StatusChip label="연체 없음" tone="good" /></>}</td></tr>
              <tr><th scope="row">가상 고객 프로필</th><td>{sandbox.profile ? `신용점수 ${sandbox.profile.creditScore}점 · 연소득 ${formatNumber(sandbox.profile.annualIncome)}원` : <>아직 없어요. <Link to="/sandbox/profile">프로필을 만들고</Link> 첫 대출을 신청해 봐요.</>}</td></tr>
              <tr><th scope="row">읽지 않은 알림</th><td>{sandbox.unreadNotifications > 0 ? <Link to="/sandbox/notifications">{sandbox.unreadNotifications}개 보기</Link> : "없어요"}</td></tr>
            </tbody>
          </table>
          <div className="home-sandbox-actions">
            <Link className="btn btn-primary" to="/sandbox">시간 진행하기</Link>
            <Link className="btn btn-secondary" to="/sandbox/apply">대출 신청하기</Link>
          </div>
        </>
      )}
    </section>
  );
}
