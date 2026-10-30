import { useCallback, useEffect, useState } from "react";

interface Result<T> { key: string; data: T | null; error: unknown }

/**
 * 불러오기 상태 묶음(운영 화면 공용). deps 가 바뀌거나 reload() 를 부르면 다시 불러온다.
 * 로딩 여부는 "마지막으로 받은 응답의 키 ≠ 지금 키"로 계산하므로 effect 안에서 동기 setState 를 하지 않는다.
 * setData 는 저장 응답으로 화면을 바로 갱신할 때 쓴다. 화면을 떠난 뒤 도착한 응답은 버린다.
 */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[], enabled = true) {
  const [tick, setTick] = useState(0);
  const key = JSON.stringify([...deps, tick]);
  const [result, setResult] = useState<Result<T>>({ key: "", data: null, error: null });

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    loader().then(
      data => { if (alive) setResult({ key, data, error: null }); },
      error => { if (alive) setResult({ key, data: null, error }); },
    );
    return () => { alive = false; };
    // loader 는 매 렌더마다 새 함수이므로 키로만 다시 불러온다.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  const reload = useCallback(() => setTick(t => t + 1), []);
  const setData = useCallback((data: T) => setResult(prev => ({ ...prev, data })), []);
  if (!enabled) return { data: null as T | null, error: null as unknown, loading: false, reload, setData };
  return { data: result.data, error: result.key === key ? result.error : null, loading: result.key !== key, reload, setData };
}
