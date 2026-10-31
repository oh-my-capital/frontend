import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { supportApi, TRY_MODE_LABEL, type ConsumerRight } from "../../api/support";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import { setDocumentTitle } from "../../components/PageTitle";
import StatusChip from "../../components/StatusChip";
import { formatDate } from "../../lib/format";
import { useLoad } from "../learn/useLoad";
import SupportHeader, { ExternalLink, TermLinks } from "./SupportHeader";
import "../../styles/support.css";

/**
 * 금융소비자 권리 안내(S-253, FR-46). 권리 목차 · 권리마다 요약 · 정의 목록(요건·기한·행사 방법·행사하면·주의) ·
 * 근거 조문 표(법령·조문·기준 버전, 국가법령정보센터 링크) · 출처 확인일 · 이 서비스에서 해 볼 곳(또는 "설명만"과 이유) · 관련 용어.
 */
export default function RightsPage() {
  const { hash } = useLocation();
  const rights = useLoad<ConsumerRight[]>(signal => supportApi.rights(signal), []);
  useEffect(() => { setDocumentTitle("금융소비자 권리 안내 · 고객센터"); }, []);
  // 고객센터 홈의 바로가기(#권리 id)로 들어오면 목록이 그려진 뒤 그 권리로 옮긴다.
  useEffect(() => {
    if (!hash || !rights.data) return;
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: "start" });
  }, [hash, rights.data]);

  const checkedOn = rights.data?.[0]?.source.checkedOn;
  return (
    <>
      <SupportHeader
        current="/support/rights"
        title="금융소비자 권리 안내"
        description="대출을 받은 사람이 법으로 가진 권리 여섯 가지를 요건·기한·행사 방법과 근거 조문으로 정리했어요. 이 서비스의 모의 여신에서 해 볼 수 있는 권리는 그 화면으로 이어 줘요."
        meta={checkedOn ? `국가법령정보센터 법령 원문 확인일 ${formatDate(checkedOn)}` : undefined}
      />
      <main className="page-main support">
        <p className="disclosure support-rights-disclosure">
          <span>법령 원문을 요약한 교육용 설명이며 법률 자문이 아닙니다.</span>
          <span>실제 행사는 해당 금융회사의 안내와 법령 원문(시행 버전)을 따릅니다.</span>
        </p>
        {rights.error ? (
          <LoadError error={rights.error} message="권리 안내를 불러오지 못했어요. 잠시 뒤 다시 시도해요." onRetry={rights.retry} />
        ) : !rights.data ? (
          <Loading message="권리 안내를 불러오고 있어요" minHeight={480} />
        ) : (
          <div className="page-grid support-rights-grid">
            <div className="support-rights">
              {rights.data.map(r => <RightSection key={r.id} right={r} />)}
            </div>
            <aside aria-label="권리 바로가기">
              <nav className="panel support-toc" aria-label="권리 목차">
                <div className="panel-head">
                  <h3>목차</h3>
                  <p>모의 여신: 로그인 뒤 내 계약으로 직접 행사 · 계산기: 숫자만 확인 · 설명만: 이 서비스에 절차가 없음</p>
                </div>
                <ol>
                  {rights.data.map(r => (
                    <li key={r.id}>
                      <a href={`#${r.id}`}>{r.orderNo}. {r.name}</a>
                      <span className="faint">{TRY_MODE_LABEL[r.tryIt.mode].label}</span>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>
          </div>
        )}
        <div className="next-actions">
          <Link to="/support/faq?category=rights">권리에 관한 자주 묻는 질문 <Icon name="next" size={16} /></Link>
          <Link to="/sandbox">내 모의 여신 <Icon name="next" size={16} /></Link>
          <Link to="/calculators/prepayment">중도상환 견적 <Icon name="next" size={16} /></Link>
        </div>
      </main>
    </>
  );
}

function RightSection({ right: r }: { right: ConsumerRight }) {
  const mode = TRY_MODE_LABEL[r.tryIt.mode];
  return (
    <section id={r.id} className="support-right" aria-labelledby={`${r.id}-title`}>
      <div className="support-right-head">
        <h2 id={`${r.id}-title`}><span className="support-right-no">{r.orderNo}</span>{r.name}</h2>
        <StatusChip label={mode.label} tone={mode.tone} />
      </div>
      <p className="support-right-summary">{r.summary}</p>

      <dl className="def-list support-right-dl">
        <div>
          <dt>요건</dt>
          <dd><ul className="support-bullets">{r.requirements.map((t, i) => <li key={i}>{t}</li>)}</ul></dd>
        </div>
        <div><dt>기한</dt><dd>{r.deadline}</dd></div>
        <div>
          <dt>행사 방법</dt>
          <dd><ol className="support-numbered">{r.howTo.map((t, i) => <li key={i}>{t}</li>)}</ol></dd>
        </div>
        {r.effect && <div><dt>행사하면</dt><dd>{r.effect}</dd></div>}
        {r.cautions.length > 0 && (
          <div>
            <dt>주의</dt>
            <dd><ul className="support-bullets">{r.cautions.map((t, i) => <li key={i}>{t}</li>)}</ul></dd>
          </div>
        )}
      </dl>

      <div className="table-scroll support-basis">
        <table className="table table-compact">
          <caption>근거 조문 · 확인일 {formatDate(r.source.checkedOn)}</caption>
          <thead><tr><th scope="col">법령</th><th scope="col">조문</th><th scope="col">확인한 버전</th></tr></thead>
          <tbody>
            {r.basis.map((b, i) => (
              <tr key={i}>
                <th scope="row">{b.law}</th>
                <td><ExternalLink href={b.url}>{b.article}</ExternalLink></td>
                <td className="support-law-version">{b.lawVersion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`support-try support-try-${r.tryIt.mode.toLowerCase().replace("_", "-")}`}>
        <h3>이 서비스에서 해 볼 곳</h3>
        <p><strong>{r.tryIt.label}</strong></p>
        <p className="muted">{r.tryIt.note}</p>
        {r.tryIt.path && <Link className="btn btn-primary btn-small" to={r.tryIt.path}>{r.tryIt.mode === "SANDBOX" ? "내 모의 여신으로" : "계산기로"}<Icon name="next" size={16} /></Link>}
      </div>
      <TermLinks terms={r.relatedTerms} />
    </section>
  );
}
