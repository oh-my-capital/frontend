import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * 상품 안내 머리(S-230·231). 현재 위치 줄 + 큰 제목 + 설명. SubPageHeader 와 같은 마크업·클래스를 쓴다.
 * (v2 SubPageHeader 의 묶음 목록에 "상품 안내"가 없어 여기서 그린다. 디자인 v3(WP15)가 products 묶음을 더하면 SubPageHeader 로 바꿔도 된다.)
 */
export function ProductsHead({ title, description, meta, detail }: { title: string; description?: ReactNode; meta?: ReactNode; detail?: string }) {
  return (
    <div className="subpage-head">
      <div className="subpage-inner">
        <nav className="crumbs" aria-label="현재 위치">
          <ol>
            <li><Link to="/">홈</Link></li>
            {detail
              ? <><li><Link to="/products">상품 안내</Link></li><li aria-current="page">{detail}</li></>
              : <li aria-current="page">상품 안내</li>}
          </ol>
        </nav>
        <div className="subpage-title">
          <div>
            <h1>{title}</h1>
            {description && <p className="subpage-description">{description}</p>}
            {meta && <p className="subpage-meta">{meta}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 교육용 모의 상품 고지(서버 응답 notice 를 그대로). 광고·권유 문구를 쓰지 않는다. */
export function ProductsNotice({ notice }: { notice: string }) {
  return (
    <p className="products-notice" role="note">
      <strong>교육용 모의 상품</strong>
      <span>{notice} 실명 확인·신용조회·실제 송금은 없고, 모든 숫자는 규칙 세트 가정값으로 계산한 결과예요.</span>
    </p>
  );
}
