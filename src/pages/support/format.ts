/** 고객센터 화면 공용 표기 도우미. */

/** 출처 URL 을 사람이 읽는 이름으로. 국가법령정보센터는 법령 이름까지 보여 준다. */
export function sourceName(url: string): string {
  try {
    const u = new URL(url);
    const path = decodeURIComponent(u.pathname);
    if (u.hostname.endsWith("law.go.kr")) {
      const m = path.match(/^\/법령\/([^/]+)(?:\/(.+))?$/);
      return m ? `국가법령정보센터 · ${m[1]}${m[2] ? ` ${m[2]}` : ""}` : "국가법령정보센터";
    }
    if (u.hostname.endsWith("fsc.go.kr")) return "금융위원회 보도자료";
    if (u.hostname.endsWith("fss.or.kr")) return "금융감독원";
    return u.hostname;
  } catch {
    return url;
  }
}
