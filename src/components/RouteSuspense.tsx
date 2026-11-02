import { Component, Suspense, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import LoadError from "./LoadError";
import Loading from "./Loading";

/**
 * 화면 코드 분할(NFR-21, WP39)의 경계. App.tsx 에서 공통 틀(Layout) 바로 아래 경로 없는 라우트로 둔다.
 * - 화면 조각(React.lazy)을 받는 동안: 머리·바닥은 그대로 두고 본문 자리에 공용 Loading(role="status", aria-live)만 그린다.
 * - 조각을 못 받으면(배포로 파일 이름이 바뀌었거나 네트워크 끊김): 공용 LoadError 로 이유와 "다시 시도"(새로고침)를 준다.
 *   다른 주소로 옮기면 오류 상태를 풀어 그 화면을 다시 받아 본다.
 */
export default function RouteSuspense() {
  const { pathname } = useLocation();
  return (
    <ChunkErrorBoundary pathname={pathname}>
      <Suspense fallback={<main className="page-main"><Loading message="화면을 불러오고 있어요" /></main>}>
        <Outlet />
      </Suspense>
    </ChunkErrorBoundary>
  );
}

type BoundaryProps = { pathname: string; children: ReactNode };
type BoundaryState = { failedPath: string | null };

/** 오류 경계는 아직 클래스 컴포넌트로만 만들 수 있다. 화면 조각 불러오기 실패만 다루고 나머지 오류도 같은 문장으로 받는다. */
class ChunkErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failedPath: null };

  static getDerivedStateFromError(): Partial<BoundaryState> {
    return { failedPath: "" };
  }

  static getDerivedStateFromProps(props: BoundaryProps, state: BoundaryState): Partial<BoundaryState> | null {
    if (state.failedPath === "") return { failedPath: props.pathname };
    if (state.failedPath !== null && state.failedPath !== props.pathname) return { failedPath: null };
    return null;
  }

  render() {
    if (this.state.failedPath !== null) {
      return (
        <main className="page-main">
          <LoadError
            message="화면 파일을 받지 못했어요. 새 버전이 배포됐거나 네트워크가 끊겼을 수 있어요. 다시 시도하면 화면을 새로 불러와요."
            onRetry={() => window.location.reload()}
          />
        </main>
      );
    }
    return this.props.children;
  }
}
