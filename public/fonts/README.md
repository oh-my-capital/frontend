# 폰트

본문 서체 **눈누 기초고딕**(NoonnuBasicGothic) woff2 파일은 라이선스를 사람이 확인한 뒤 이 폴더에 둔다.

- 파일 이름: `NoonnuBasicGothicRegular.woff2`
- 넣은 뒤 `index.html`의 preload 주석을 푼다.
- 파일이 없어도 `src/styles/base.css`의 `@font-face`는 조용히 실패하고 시스템 폰트(Apple SD Gothic Neo · Malgun Gothic)로 표시된다.

폰트 CDN은 쓰지 않는다(docs `design/ui-guidelines.md` §4, `contracts/runtime.md` CSP).
