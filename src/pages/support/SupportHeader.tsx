import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { RelatedTerm } from "../../api/support";
import Icon from "../../components/Icon";
import SubPageHeader from "../../components/SubPageHeader";

/** 고객센터 화면 경로(탭 목록 자체는 nav.ts 의 고객센터 메뉴가 원본이다). */
type SupportPath = "/support" | "/support/faq" | "/support/notices" | "/support/rights" | "/support/guide";

type Props = {
  /** 탭 중 현재 화면의 경로. 상세 화면이면 상위 목록의 경로. */
  current: SupportPath;
  title: string;
  description?: ReactNode;
  meta?: ReactNode;
  /** 상세 화면 이름(예: 공지 제목). 있으면 현재 위치 줄에 한 단계 더 붙인다. */
  detail?: string;
};

/**
 * 고객센터 하위 화면 머리: 디자인 v3 공용 머리(위치 표시 띠 · 제목 띠 · 고객센터 탭, 탭은 nav.ts 에서 만든다)에
 * "실제 상담·민원 접수는 없다" 고지를 한 줄 더한다(FR-45, ADR-001).
 */
export default function SupportHeader({ current, title, description, meta, detail }: Props) {
  return (
    <SubPageHeader section="support" current={current} title={title} description={description} meta={meta} detail={detail}
      notice={<p className="support-no-counsel"><Icon name="info" size={16} />교육용 모의 서비스라 실제 상담·민원 접수는 없어요. 전화번호·상담 시간도 두지 않아요.</p>} />
  );
}

/** 관련 용어 링크 줄. 용어 상세(S-05)로 간다. 비어 있으면 아무것도 그리지 않는다. */
export function TermLinks({ terms, label = "관련 용어" }: { terms: RelatedTerm[]; label?: string }) {
  if (terms.length === 0) return null;
  return (
    <p className="support-terms">
      <span className="support-terms-label">{label}</span>
      {terms.map(t => <Link key={t.slug} to={`/glossary/${t.slug}`}>{t.term}</Link>)}
    </p>
  );
}

/** 외부 공식 출처 링크(국가법령정보센터 등). 새 창으로 열고 그 사실을 글자로 알린다. */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="support-external">
      {children}<span className="sr-only"> (새 창)</span>
    </a>
  );
}
