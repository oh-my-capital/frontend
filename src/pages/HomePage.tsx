import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { homeApi, type HomeNotice, type HomeProduct } from "../api/home";
import type { ConceptSummary, MyLearning, Sandbox } from "../api/types";
import Icon, { type IconName } from "../components/Icon";
import Loading from "../components/Loading";
import LoadError from "../components/LoadError";
import Money from "../components/Money";
import ProgressBar from "../components/ProgressBar";
import StatusChip from "../components/StatusChip";
import { useAuth } from "../context/AuthContext";
import { formatDate, formatNumber, formatRate } from "../lib/format";
import { calculatorLink, CONCEPT_TERMS, COURSE_PARTS } from "./learn/links";

/** 슬라이드 오른쪽 표의 종류. 이미지에 기대지 않고 슬라이드마다 그 주제의 실제 수치를 보여 준다. */
type FigureKind = "repayment" | "screening" | "overdue";

/** 계산 예시 1(docs/domain/calculation-examples.md): 1,000만 원·12회·연 12.00% 원리금균등. 골든 값이라 손으로 옮긴다. */
const EXAMPLE_1_ROWS = [
  { no: 1, principal: 788_488, interest: 100_000, balance: 9_211_512 },
  { no: 2, principal: 796_373, interest: 92_115, balance: 8_415_139 },
  { no: 3, principal: 804_337, interest: 84_151, balance: 7_610_802 },
  { no: 12, principal: 879_687, interest: 8_796, balance: 0 },
];

/** 계산 예시 6의 한도 세 기준. 최종 한도는 셋 중 가장 작은 값을 만 원 절사한 금액이다(업무 규칙 §3.3). */
const EXAMPLE_6_LIMITS = [
  { rule: "상품 최대", basis: "신용대출 상품 한도", amount: 50_000_000, binding: false },
  { rule: "소득배수", basis: "820점 B밴드 × 1.2배", amount: 57_600_000, binding: false },
  { rule: "DSR 역산", basis: "연소득의 50% − 기존 600만", amount: 47_938_249, binding: true },
];

/** 업무 규칙 §9의 건전성 5단계와 계산 예시 9의 충당금(잔액 9,211,512원 기준). 일수 경계·적립률은 교육용 가정값이다. */
const ASSET_CLASS_ROWS = [
  { days: "0~29일", label: "정상", rate: "1%", provision: 92_115 },
  { days: "30~89일", label: "요주의", rate: "10%", provision: 921_151 },
  { days: "90~179일", label: "고정", rate: "20%", provision: 1_842_302 },
  { days: "180~364일", label: "회수의문", rate: "75%", provision: 6_908_634 },
  { days: "365일~", label: "추정손실", rate: "100%", provision: 9_211_512 },
];

/**
 * 홈(S-01, 디자인 v3). 시중 캐피탈 첫 화면이 수렴한 순서(docs/design/rea-capital-sites.md §3·§4.3)를 따른다:
 * 안내 배너 → 주요 업무 줄 → (로그인) 내 모의 여신 현황 → 상품 안내 → 계산기 6종 → 배우기(검색 + 목차) → 고객센터·공지.
 * 상품·공지는 다른 WP의 API다. 실패하면 상품은 정적 링크로 대체하고 공지는 숨긴다. 숫자는 서버·골든 예시 값만 쓴다.
 */
export default function HomePage() {
  const notice = (useLocation().state as { notice?: string } | null)?.notice;
  const { isAuthenticated } = useAuth();
  return (
    <main>
      {notice && <p className="home-notice" role="status">{notice}</p>}
      <Banner />
      <QuickTasks />
      <div className="home-main">
        {isAuthenticated && <SandboxStatus />}
        <ProductSection />
        <CalculatorTable />
        <CourseList />
        <SupportSection />
      </div>
    </main>
  );
}

// 주요 업무 줄(rea §3-4): 칸 나눈 한 띠. 카드 반복이 아니라 지표 줄(.figure-row)과 같은 구조다.
const QUICK_TASKS: { to: string; label: string; hint: string; icon: IconName; login?: boolean }[] = [
  { to: "/sandbox/apply", label: "모의 대출 신청", hint: "가상 고객으로 상품을 골라 신청하고 심사 근거를 봐요", icon: "apply", login: true },
  { to: "/sandbox", label: "내 계약·납입", hint: "계약 상태·잔액·다음 납입일을 보고 시간을 진행해요", icon: "contract", login: true },
  { to: "/sandbox/calendar", label: "납입 캘린더", hint: "모든 계약의 회차를 달력에서 예정·납입·연체로 봐요", icon: "calendarCheck", login: true },
  { to: "/sandbox/scenarios", label: "장면 시나리오", hint: "연체 25일·청약철회 가능 같은 상태를 바로 열어요", icon: "scene", login: true },
  { to: "/support/rights", label: "금융소비자 권리", hint: "청약철회·금리인하요구 같은 권리와 근거 조문", icon: "shield" },
  { to: "/support/faq", label: "자주 묻는 질문", hint: "막혔을 때 분류별 질문과 답부터 찾아봐요", icon: "question" },
];

function QuickTasks() {
  const { isAuthenticated } = useAuth();
  return (
    <nav className="home-quick" aria-label="주요 업무">
      <ul>
        {QUICK_TASKS.map(task => (
          <li key={task.to}>
            <Link to={task.to}>
              <span className="home-quick-icon"><Icon name={task.icon} size={20} /></span>
              <span className="home-quick-text">
                <strong>{task.label}{task.login && !isAuthenticated && <span className="nav-tag">로그인</span>}</strong>
                <span>{task.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

type ProductState = { status: "loading" } | { status: "ready"; products: HomeProduct[] } | { status: "fallback" };

/** 상품 안내: GET /api/products(WP23)를 표로. 404·실패·빈 목록이면 정적 링크 줄로 대체하고 숫자를 지어내지 않는다. */
function ProductSection() {
  const [state, setState] = useState<ProductState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    homeApi.products(controller.signal)
      .then(products => { if (!controller.signal.aborted) setState(products.length ? { status: "ready", products } : { status: "fallback" }); })
      .catch(() => { if (!controller.signal.aborted) setState({ status: "fallback" }); });
    return () => controller.abort();
  }, []);

  return (
    <section className="home-section" aria-labelledby="home-products-title">
      <div className="section-head">
        <div>
          <h2 id="home-products-title">상품 <em>안내</em></h2>
          <p>교육용 모의 상품이다. 금리 범위·한도·기간은 규칙 세트에서 나오고, 상세 화면이 같은 규칙으로 대표 예시를 계산한다.</p>
        </div>
        <Link to="/products">상품 전체 보기 <Icon name="next" size={16} /></Link>
      </div>
      {state.status === "loading" ? (
        <Loading message="상품 목록을 불러오고 있어요" minHeight={160} />
      ) : state.status === "ready" ? (
        <ProductTable products={state.products} />
      ) : (
        <div className="home-fallback">
          <p>상품 목록을 지금은 불러올 수 없어요. 아래 화면에서 상품 조건을 보거나 바로 계산해 볼 수 있어요.</p>
          <ul className="home-link-list">
            <li><Link to="/products"><strong>상품 안내</strong><span>상품별 대상·금리 범위·한도·기간과 대표 예시</span></Link></li>
            <li><Link to="/sandbox/apply"><strong>모의 대출 신청</strong><span>상품 표에서 골라 조건을 넣고 신청(로그인)</span></Link></li>
            <li><Link to="/calculators/auto-finance"><strong>할부·리스·렌트 비교</strong><span>같은 차량가·기간으로 네 방식의 월 부담과 총 비용</span></Link></li>
          </ul>
        </div>
      )}
    </section>
  );
}

const termText = (p: HomeProduct) =>
  p.minTerm !== null && p.maxTerm !== null && p.minTerm !== p.maxTerm ? `${p.minTerm}~${p.maxTerm}개월` : p.maxTerm !== null ? `${p.maxTerm}개월` : "—";
const rateText = (p: HomeProduct) =>
  p.minRate !== null && p.maxRate !== null ? `${formatRate(p.minRate)} ~ ${formatRate(p.maxRate)}` : p.minRate !== null ? `${formatRate(p.minRate)}부터` : p.maxRate !== null ? `${formatRate(p.maxRate)}까지` : "—";

/** 서버가 준 열만 그린다(모든 상품에 없는 열은 빼서 "—"만 늘어선 열을 만들지 않는다). */
function ProductTable({ products }: { products: HomeProduct[] }) {
  const has = {
    category: products.some(p => p.category),
    rate: products.some(p => p.minRate !== null || p.maxRate !== null),
    amount: products.some(p => p.maxAmount !== null),
    term: products.some(p => p.maxTerm !== null),
  };
  return (
    <div className="table-scroll home-product-table">
      <table className="table table-links">
        <caption>상품 {products.length}개 · 교육용 모의 상품이며 실제 금융회사의 조건이 아니다</caption>
        <thead>
          <tr>
            <th scope="col">상품</th>
            {has.category && <th scope="col">구분</th>}
            {has.rate && <th scope="col" className="num">금리(연)</th>}
            {has.amount && <th scope="col" className="num">최대 한도</th>}
            {has.term && <th scope="col" className="num">기간</th>}
            <th scope="col"><span className="sr-only">상세</span></th>
          </tr>
        </thead>
        <tbody>
          {products.map(product => (
            <tr key={product.code}>
              <th scope="row">
                <Link to={`/products/${encodeURIComponent(product.code)}`}>{product.name}</Link>
                {product.summary && <span className="home-product-summary">{product.summary}</span>}
              </th>
              {has.category && <td>{product.category ?? "—"}</td>}
              {has.rate && <td className="num">{rateText(product)}</td>}
              {has.amount && <td className="num">{product.maxAmount !== null ? <Money value={product.maxAmount} /> : "—"}</td>}
              {has.term && <td className="num">{termText(product)}</td>}
              <td className="go"><Link to={`/products/${encodeURIComponent(product.code)}`} aria-label={`${product.name} 상세`}>상세 →</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 배너 문구는 실제 기능만 설명한다. 이용자 수·만족도 같은 수치와 마케팅 어휘를 넣지 않는다.
const SLIDES: { tag: string; title: [string, string]; description: string; to: string; action: string; learn: { to: string; label: string }; figure: FigureKind; image: { src: string; alt: string } }[] = [
  {
    tag: "상환",
    title: ["1,000만 원을 12회로 갚으면", "이자는 얼마나 붙을까요"],
    description: "원금·기간·금리를 넣으면 원리금균등·원금균등·만기일시의 회차표와 총이자를 한 표에서 비교해요. 회차마다 원금과 이자가 어떻게 갈리는지, 마지막 회차만 몇 원 다른 이유가 무엇인지까지 규칙으로 설명해요.",
    to: "/calculators/schedule",
    action: "상환 스케줄 계산기 열기",
    learn: { to: "/learn/repayment-methods", label: "개념 6. 상환 방식 3가지" },
    figure: "repayment",
    image: { src: "/images/capital-calculator.webp", alt: "커다란 계산기 옆에서 원금은 늘고 이자는 줄어드는 회차별 막대그래프를 가리키고, 길게 출력된 회차표를 확인하는 사람들의 일러스트" },
  },
  {
    tag: "심사",
    title: ["신용점수와 소득이", "금리와 한도로 바뀌는 과정을 봐요"],
    description: "심사 시뮬레이터는 자격 → 금리 → 한도 → 결정 네 단계를 그대로 밟고, 어느 규칙이 한도를 결정했는지 근거를 표로 남겨요. 쓰인 규칙 수치는 방법론 화면에 모두 공개해요.",
    to: "/calculators/screening",
    action: "심사 시뮬레이터 열기",
    learn: { to: "/learn/credit-score-and-screening", label: "개념 8. 신용점수와 심사" },
    figure: "screening",
    image: { src: "/images/capital-desk.webp", alt: "남색 장부 모양 건물 앞 계단에서 장부를 읽고 막대그래프를 보며 이야기하는 사람들의 일러스트" },
  },
  {
    tag: "연체",
    title: ["하루 연체부터 기한이익상실까지", "시간을 넘기며 겪어 봐요"],
    description: "가상 고객으로 신청하고 실행한 뒤 가상 시계를 하루씩 넘기면 자동이체·연체이자·건전성 분류·충당금을 그날의 일마감이 처리해요. 실명·실계좌는 쓰지 않아요.",
    to: "/sandbox",
    action: "내 모의 여신 열기",
    learn: { to: "/learn/delinquency-and-overdue-interest", label: "개념 9. 연체와 연체이자" },
    figure: "overdue",
    image: { src: "/images/capital-sandbox.webp", alt: "자동차 옆 상담 창구에서 상담원이 계약서 봉투를 건네고, 뒤로 시계와 넘어가는 달력이 보이는 일러스트" },
  },
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
            <Link className="home-banner-learn" to={slide.learn.to}><Icon name="book" size={16} />{slide.learn.label}</Link>
          </div>
        </div>
        {/* 그림을 한 칸에 겹쳐 두고 현재 슬라이드 것만 보인다. 미리 받아 두므로 넘길 때 깜박이지 않는다. */}
        <div className="home-banner-img">
          {SLIDES.map((item, i) => (
            <img
              key={item.image.src}
              className={i === index ? "is-active" : undefined}
              src={item.image.src}
              alt={i === index ? item.image.alt : ""}
              aria-hidden={i === index ? undefined : true}
              width={1200}
              height={800}
              fetchPriority={i === 0 ? "high" : undefined}
            />
          ))}
        </div>
        <div className="home-banner-art">
          {slide.figure === "repayment" ? <RepaymentFigure /> : slide.figure === "screening" ? <ScreeningFigure /> : <OverdueFigure />}
        </div>
      </div>
    </section>
  );
}

/*
 * 배너 오른쪽 열의 표 셋. 숫자는 모두 docs/domain/business-rules.md·calculation-examples.md 의 값이다
 * (화면용으로 지어낸 수치는 없다). 이미지 파일에 기대지 않으므로 세 슬라이드 모두 내용이 찬다.
 */
/** 상환 슬라이드: 계산 예시 1의 회차표 요약. */
function RepaymentFigure() {
  return (
    <div className="home-figure">
      <div className="home-figure-head">
        <h3>회차마다 갈리는 원금과 이자</h3>
        <span>계산 예시 1 · 원리금균등</span>
      </div>
      <dl className="figure-row">
        <div><dt>월 납입액</dt><dd><Money value={888_488} /></dd></div>
        <div><dt>총이자</dt><dd className="accent"><Money value={661_851} /></dd></div>
        <div><dt>조건</dt><dd>12회<small>연 12.00%</small></dd></div>
      </dl>
      <table className="table table-compact home-figure-table">
        <caption>원금 10,000,000원의 첫 3회차와 마지막 회차<span className="table-caption-note">잔액이 줄면 이자도 줄고 그만큼 원금 몫이 커진다.</span></caption>
        <thead>
          <tr><th scope="col">회차</th><th scope="col" className="num">원금</th><th scope="col" className="num">이자</th><th scope="col" className="num">잔액</th></tr>
        </thead>
        <tbody>
          {EXAMPLE_1_ROWS.map(row => (
            <tr key={row.no}>
              <th scope="row">{row.no}회{row.no === 12 && <span className="home-figure-mark">마지막</span>}</th>
              <td className="num">{formatNumber(row.principal)}</td>
              <td className="num">{formatNumber(row.interest)}</td>
              <td className="num">{formatNumber(row.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="home-figure-foot">
        <span>12회차만 절사 보정으로 5원 적어요</span>
        <Link to="/calculators/schedule">같은 조건으로 계산하기</Link>
      </div>
    </div>
  );
}

/** 심사 슬라이드: 계산 예시 6의 금리·DSR과 한도를 정한 세 기준. */
function ScreeningFigure() {
  return (
    <div className="home-figure">
      <div className="home-figure-head">
        <h3>한도를 정한 규칙은 하나</h3>
        <span>계산 예시 6 · 신용대출</span>
      </div>
      <dl className="figure-row">
        <div><dt>적용 금리</dt><dd>7.90<small>%</small></dd></div>
        <div><dt>월 납입액</dt><dd><Money value={938_708} /></dd></div>
        <div><dt>DSR</dt><dd className="accent">35.97<small>%</small></dd></div>
      </dl>
      <table className="table table-compact home-figure-table">
        <caption>연소득 48,000,000원 · 기존 연 원리금 6,000,000원 · 820점(B밴드) · 36회<span className="table-caption-note">기준금리 5.90% + 밴드 스프레드 2.00%p = 7.90%. 한도는 세 기준 중 가장 작은 값이다.</span></caption>
        <thead>
          <tr><th scope="col">한도 기준</th><th scope="col">근거</th><th scope="col" className="num">금액</th></tr>
        </thead>
        <tbody>
          {EXAMPLE_6_LIMITS.map(row => (
            <tr key={row.rule} className={row.binding ? "is-current" : undefined}>
              <th scope="row">{row.rule}{row.binding && <span className="home-figure-mark">한도 결정</span>}</th>
              <td>{row.basis}</td>
              <td className="num">{formatNumber(row.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><th scope="row">최종 한도</th><td>셋 중 최소 · 만 원 절사</td><td className="num">{formatNumber(47_930_000)}</td></tr>
        </tfoot>
      </table>
      <div className="home-figure-foot">
        <span>요청한 30,000,000원은 한도 안이라 승인이에요</span>
        <Link to="/methodology">밴드·한도 규칙 전체</Link>
      </div>
    </div>
  );
}

/** 연체 슬라이드: 연체일수별 건전성 단계와 충당금(계산 예시 9). */
function OverdueFigure() {
  return (
    <div className="home-figure">
      <div className="home-figure-head">
        <h3>연체가 길어지면 생기는 일</h3>
        <span>업무 규칙 · 계산 예시 9</span>
      </div>
      <dl className="figure-row">
        <div><dt>연체 가산</dt><dd>+3.00<small>%p</small></dd></div>
        <div><dt>상실 예정 통지</dt><dd>45<small>일</small></dd></div>
        <div><dt>기한이익상실</dt><dd className="danger">60<small>일</small></dd></div>
      </dl>
      <table className="table table-compact home-figure-table">
        <caption>연체일수별 건전성 분류와 충당금<span className="table-caption-note">잔액 9,211,512원 기준. 일수 경계와 적립률은 교육용 가정값이다.</span></caption>
        <thead>
          <tr><th scope="col">연체일수</th><th scope="col">분류</th><th scope="col" className="num">적립률</th><th scope="col" className="num">충당금</th></tr>
        </thead>
        <tbody>
          {ASSET_CLASS_ROWS.map(row => (
            <tr key={row.label}>
              <th scope="row">{row.days}</th>
              <td>{row.label}</td>
              <td className="num">{row.rate}</td>
              <td className="num">{formatNumber(row.provision)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="home-figure-foot">
        <span>연체이율은 약정이율 + 3.00%p, 상한 20.00%예요</span>
        <Link to="/learn/acceleration">기한이익상실 읽기</Link>
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
    <div className="home-search" role="group" aria-label="용어·개념 검색">
      <form role="search" onSubmit={submit}>
        <label className="sr-only" htmlFor="home-search-input">찾을 용어나 개념</label>
        <input id="home-search-input" type="search" value={value} onChange={event => setValue(event.target.value)} placeholder="용어나 개념을 찾아요. 예: 연체이자는 무엇에 붙나요" autoComplete="off" />
        <button type="submit" aria-label="용어 사전에서 찾기"><Icon name="search" size={24} /></button>
      </form>
      <p className="home-search-suggest">
        <span>처음이라면</span>
        {SUGGESTED_TERMS.map(term => <Link key={term.slug} to={`/glossary/${term.slug}`}>{term.label}</Link>)}
      </p>
    </div>
  );
}

// 분류는 머리 메뉴(nav.ts)의 계산기 2단 분류와 같은 말을 쓴다.
const CALCULATORS: { to: string; group: string; name: string; what: string; inputs: string; icon: IconName }[] = [
  { to: "/calculators/schedule", group: "상환·이자", name: "상환 스케줄 계산기", what: "세 가지 상환 방식의 회차표와 총이자를 한 표에서 비교한다", inputs: "원금 · 기간 · 금리 · 실행일 · 납입일", icon: "calculator" },
  { to: "/calculators/prepayment", group: "상환·이자", name: "중도상환 견적", what: "잔액·경과이자·수수료·총액을 계산하고 잔존기간별 수수료 추이를 그린다", inputs: "대출 조건 · 상환일 · 수수료율 · 일부 상환액", icon: "calculator" },
  { to: "/calculators/refinance", group: "상환·이자", name: "대환 비교", what: "갈아타기 비용과 남은 이자 차이로 순이익과 손익분기 회차를 계산한다", inputs: "기존 잔액·금리·잔존 회차 · 새 금리·기간·부대비용", icon: "calculator" },
  { to: "/calculators/screening", group: "심사·한도", name: "심사 시뮬레이터", what: "자격 → 금리 → 한도 → 결정 순서로 심사하고 규칙별 근거를 표로 보여 준다", inputs: "생년월일 · 소득 · 기존 원리금 · 신용점수 · 상품 · 금액", icon: "calculator" },
  { to: "/calculators/dsr", group: "심사·한도", name: "DSR 계산기", what: "기존 대출 여러 건의 연 원리금을 합산한 DSR과 더 빌릴 수 있는 한도를 계산한다", inputs: "연소득 · 기존 대출(최대 10건) · 새 대출 조건", icon: "calculator" },
  { to: "/calculators/auto-finance", group: "자동차 금융", name: "할부·리스·렌트 비교", what: "같은 차량가·기간으로 네 방식의 월 부담·총 지출·만기 소유권을 비교한다", inputs: "차량가 · 선수금 · 기간 · 금리 · 잔존가치율", icon: "car" },
];

/** 계산기 6종: 카드가 아니라 표 형태 링크 묶음(ui-guidelines §5 ③). 로그인 없이 쓴다. */
function CalculatorTable() {
  return (
    <section className="home-section" aria-labelledby="home-calc-title">
      <div className="section-head">
        <div>
          <h2 id="home-calc-title">계산기 <em>{CALCULATORS.length}종</em></h2>
          <p>로그인 없이 쓴다. 모든 결과 아래에 규칙·계산 버전과 교육용 고지를 붙인다.</p>
        </div>
        <Link to="/methodology">계산 규칙 보기 <Icon name="next" size={16} /></Link>
      </div>
      <table className="table table-links home-calc-table">
        <caption className="sr-only">계산기 목록</caption>
        <thead>
          <tr><th scope="col">계산기</th><th scope="col">분류</th><th scope="col">무엇을 계산하나</th><th scope="col">입력</th><th scope="col"><span className="sr-only">열기</span></th></tr>
        </thead>
        <tbody>
          {CALCULATORS.map(calc => (
            <tr key={calc.to}>
              <th scope="row"><Link to={calc.to}><Icon name={calc.icon} size={18} />{calc.name}</Link></th>
              <td className="home-calc-group">{calc.group}</td>
              <td>{calc.what}</td>
              <td className="muted">{calc.inputs}</td>
              <td className="go"><Link to={calc.to} aria-label={`${calc.name} 열기`}>열기 →</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
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
          <h2 id="home-course-title">입문 과정 <em>{concepts ? `${concepts.length}개 개념` : "개념"}</em></h2>
          <p>권장 순서대로 읽어도 되고 어느 개념이든 바로 열어도 된다. 개념마다 확인 문제와 연결된 계산기·용어가 있다.</p>
        </div>
        <Link to="/course">목차 자세히 <Icon name="next" size={16} /></Link>
      </div>
      <HomeSearch />
      <div className="home-course-grid">
        <aside className="home-course-side" aria-label="학습 진척">
          {myLearning ? (
            <div className="home-course-progress">
              <p className="progress-meta"><span className="muted">완료한 개념</span><strong>{myLearning.completedCount} / {myLearning.totalCount}</strong></p>
              <ProgressBar value={myLearning.completedCount} total={myLearning.totalCount} label={`${myLearning.totalCount}개 중 ${myLearning.completedCount}개 완료`} />
              {myLearning.nextConceptId && <p>다음으로 권하는 개념은 <Link to={`/learn/${myLearning.nextConceptId}`}>{concepts?.find(c => c.id === myLearning.nextConceptId)?.title ?? myLearning.nextConceptId}</Link>이에요.</p>}
            </div>
          ) : (
            <p>여신의 구조(1~4) → 금리·한도·심사(5~8) → 연체·건전성·중도상환(9~12) 순서로 읽으면 대출 한 건의 생애를 처음부터 끝까지 따라가게 돼요.</p>
          )}
          <ol className="home-course-parts">
            {COURSE_PARTS.map(part => {
              const inPart = (concepts ?? []).filter(c => c.orderNo >= part.from && c.orderNo <= part.to);
              const quizzes = inPart.reduce((sum, c) => sum + c.quizCount, 0);
              const done = inPart.filter(c => completed.has(c.id)).length;
              return (
                <li key={part.label}>
                  <strong>{part.from}~{part.to} {part.label}</strong>
                  <span>{inPart.length ? `개념 ${inPart.length} · 확인 문제 ${quizzes}문항` : "개념을 불러오고 있어요"}{myLearning && inPart.length ? ` · 완료 ${done}` : ""}</span>
                </li>
              );
            })}
          </ol>
          <p className="home-course-mission"><Link to="/missions"><Icon name="scene" size={16} />학습 미션</Link> — 샌드박스에서 해 볼 과업을 고르면 조건을 만족할 때 자동으로 완료 표시돼요.</p>
          {!isAuthenticated && (
            <>
              <p className="muted">로그인하면 확인 문제 점수와 완료 표시가 여기와 목차에 남아요. 읽기와 문제 풀이는 로그인 없이도 돼요.</p>
              <Link className="btn btn-secondary btn-small" to="/login">로그인하고 진척 기록하기</Link>
            </>
          )}
        </aside>
        {error ? (
          <LoadError error={error} message="학습 목차를 불러오지 못했어요. 잠시 뒤 다시 시도해요." onRetry={() => { setError(null); setTick(t => t + 1); }} />
        ) : !concepts ? (
          <Loading message="학습 목차를 불러오고 있어요" minHeight={420} />
        ) : (
          <ol className="home-course-list" aria-label="입문 과정 목차">
            {concepts.map(concept => {
              const calc = calculatorLink(concept.linkedCalculator);
              return (
                <li key={concept.id}>
                  <Link className="home-course-link" to={`/learn/${concept.id}`}>
                    <span className="no" aria-hidden="true">{String(concept.orderNo).padStart(2, "0")}</span>
                    <strong><span className="sr-only">{concept.orderNo}. </span>{concept.title}</strong>
                    <span className="meta">
                      문제 {concept.quizCount}
                      {completed.has(concept.id) && <StatusChip label="완료" tone="good" />}
                      {started.has(concept.id) && <StatusChip label="진행 중" tone="info" />}
                    </span>
                    <span className="summary">{concept.summary}</span>
                  </Link>
                  <p className="home-course-links">
                    {calc && <Link to={calc.to}><Icon name="calculator" size={15} />{calc.label}</Link>}
                    {(CONCEPT_TERMS[concept.id] ?? []).map(term => <Link key={term.slug} to={`/glossary/${term.slug}`}><Icon name="book" size={15} />{term.label}</Link>)}
                  </p>
                </li>
              );
            })}
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

type NoticeState = { status: "loading" } | { status: "ready"; notices: HomeNotice[] } | { status: "hidden" };

const HELP_LINKS = [
  { to: "/support/faq", label: "자주 묻는 질문", hint: "분류별로 찾거나 검색해요" },
  { to: "/support/rights", label: "금융소비자 권리 안내", hint: "청약철회권·금리인하요구권 등과 근거 조문" },
  { to: "/support", label: "이용 가이드", hint: "처음 오신 분이 따라 할 순서" },
  { to: "/methodology", label: "계산 규칙(방법론)", hint: "규칙 세트 수치의 출처·확인일과 가정값" },
];

/** 고객센터·공지: 공지는 GET /api/support/notices(WP25) 최근 4건. 실패하거나 비면 공지 열을 숨기고 도움말만 남긴다. */
function SupportSection() {
  const [state, setState] = useState<NoticeState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    homeApi.notices(controller.signal)
      .then(notices => { if (!controller.signal.aborted) setState(notices.length ? { status: "ready", notices: notices.slice(0, 4) } : { status: "hidden" }); })
      .catch(() => { if (!controller.signal.aborted) setState({ status: "hidden" }); });
    return () => controller.abort();
  }, []);

  const showNotices = state.status !== "hidden";
  return (
    <section className="home-section" aria-labelledby="home-support-title">
      <div className="section-head">
        <div>
          <h2 id="home-support-title">{showNotices ? <>고객센터 · <em>공지</em></> : <em>고객센터</em>}</h2>
          <p>실제 상담·민원 접수는 없다. 막혔을 때 볼 도움말{showNotices ? "과 서비스 변경 공지" : ""}를 모았다.</p>
        </div>
        <Link to="/support">고객센터 열기 <Icon name="next" size={16} /></Link>
      </div>
      <div className={`home-support-grid${showNotices ? "" : " is-single"}`}>
        {showNotices && (
          <div className="home-notices">
            <div className="panel-head home-support-head">
              <h3>공지사항</h3>
              <Link to="/support/notices">전체 보기</Link>
            </div>
            {state.status === "loading" ? (
              <Loading message="공지를 불러오고 있어요" minHeight={176} />
            ) : state.status === "ready" ? (
              <ul className="home-notice-list">
                {state.notices.map(item => (
                  <li key={item.id}>
                    <Link to="/support/notices">
                      {item.category && <span className="home-notice-cat">{item.category}</span>}
                      <strong>{item.title}</strong>
                      <time dateTime={item.postedOn}>{formatDate(item.postedOn)}</time>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
        <div className="home-help">
          <div className="panel-head home-support-head">
            <h3>도움이 필요할 때</h3>
          </div>
          <ul className="home-link-list">
            {HELP_LINKS.map(link => (
              <li key={link.to}><Link to={link.to}><strong>{link.label}</strong><span>{link.hint}</span></Link></li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
