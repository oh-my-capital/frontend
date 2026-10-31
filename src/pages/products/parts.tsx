import type { ReactNode } from "react";
import SubPageHeader from "../../components/SubPageHeader";

/** 상품 안내 머리(S-230·231). 디자인 v3 공용 머리(위치 표시 띠 + 제목 띠 + 상품안내 탭)를 쓴다. */
export function ProductsHead({ title, description, meta, detail }: { title: string; description?: ReactNode; meta?: ReactNode; detail?: string }) {
  return <SubPageHeader section="products" current="/products" title={title} description={description} meta={meta} detail={detail} />;
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
