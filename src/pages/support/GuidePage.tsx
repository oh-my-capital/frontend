import { useEffect } from "react";
import { Link } from "react-router-dom";
import { supportApi, type Guide } from "../../api/support";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import { setDocumentTitle } from "../../components/PageTitle";
import StatusChip from "../../components/StatusChip";
import { useLoad } from "../learn/useLoad";
import SupportHeader from "./SupportHeader";
import "../../styles/support.css";

/**
 * 이용 가이드(S-254). 가이드마다 번호 단계(제목·설명·로그인 필요 라벨·이동 링크).
 * 첫 가이드는 처음 오신 분 순서(배우기 → 계산기 → 가입 → 모의 여신 → 미션), 둘째는 모의 여신 한 바퀴다.
 */
export default function GuidePage() {
  const guides = useLoad<Guide[]>(signal => supportApi.guides(signal), []);
  useEffect(() => { setDocumentTitle("이용 가이드 · 고객센터"); }, []);

  return (
    <>
      <SupportHeader
        current="/support/guide"
        title="이용 가이드"
        description="무엇부터 하면 되는지 순서대로 적었어요. 단계마다 그 화면으로 바로 가는 링크가 있고, 로그인이 필요한 단계는 따로 표시해요."
        meta={guides.data ? `가이드 ${guides.data.length}종 · 단계 ${guides.data.reduce((n, g) => n + g.steps.length, 0)}개` : undefined}
      />
      <main className="page-main support">
        {guides.error ? (
          <LoadError error={guides.error} message="이용 가이드를 불러오지 못했어요. 잠시 뒤 다시 시도해요." onRetry={guides.retry} />
        ) : !guides.data ? (
          <Loading message="이용 가이드를 불러오고 있어요" minHeight={480} />
        ) : (
          <div className="support-guides">
            {guides.data.map(g => (
              <section key={g.id} id={g.id} className="support-guide" aria-labelledby={`${g.id}-title`}>
                <div className="section-head">
                  <div><h2 id={`${g.id}-title`}>{g.title}</h2><p>{g.summary}</p></div>
                </div>
                <ol className="support-steps">
                  {g.steps.map(s => (
                    <li key={s.orderNo}>
                      <span className="support-step-no" aria-hidden="true">{s.orderNo}</span>
                      <div className="support-step-body">
                        <h3><span className="sr-only">{s.orderNo}단계 </span>{s.title}</h3>
                        <p>{s.body}</p>
                        <div className="support-step-actions">
                          <Link to={s.path}>{s.pathLabel}<Icon name="next" size={16} /></Link>
                          {s.loginRequired ? <StatusChip label="로그인 필요" tone="warn" /> : <StatusChip label="로그인 없이" tone="neutral" />}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
        <div className="next-actions">
          <Link to="/support/faq">자주 묻는 질문 <Icon name="next" size={16} /></Link>
          <Link to="/support/rights">금융소비자 권리 안내 <Icon name="next" size={16} /></Link>
          <Link to="/signup">가입하고 모의 여신 시작 <Icon name="next" size={16} /></Link>
        </div>
      </main>
    </>
  );
}
