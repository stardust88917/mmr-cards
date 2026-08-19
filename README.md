# 일본어-한국어 단어장 (日本語単語帳)

국립국어원 **한국어기초사전 Open API**로 한국어 단어를 검색하면 일본어 뜻·발음·예문을 자동으로 채워 주는 플래시카드 단어장입니다.
UI는 [gen-sports26](https://github.com/stardust88917/gen-sports26)의 디자인(라이트/다크 두 테마)을 참고했습니다.

## 주요 기능

- 🔎 **실시간 사전 검색** — 한국어 단어 검색 → 일본어 번역어·뜻풀이·예문 자동 입력
- 🔄 **카드 플립 학습** — 한→일 / 일→한 출제 방향 전환, 섞기, 진도 표시
- 🔊 **발음 듣기** — 한국어는 국립국어원 실제 녹음(`/api/audio`), 일본어 뜻은 브라우저 음성합성(TTS)
- 🈂️ **가나 학습** — 히라가나·가타카나 오십음도 표 + 발음 듣기 + 읽기 퀴즈 (API 불필요, 앱 내장)
- ✅ **암기 체크** — 외움/모름 상태 저장, 상태별 필터
- 📚 **단어장(덱) 분류**, ✍️ 직접 추가·수정, 📤 JSON 내보내기/가져오기
- 🎓 **첫 접속 튜토리얼** — 4단계 온보딩 + 도움말(?)로 언제든 다시 보기
- 🌙 **라이트/다크 테마** 토글
- 💾 모든 데이터는 브라우저 **localStorage**에 저장 (로그인 불필요)

## 구조

```
mmr-cards/
├─ index.html        프론트엔드 (단일 파일: HTML+CSS+JS)
├─ api/
│  ├─ search.js      krdict 검색 API 프록시 (키 숨김 + CORS 우회)
│  ├─ view.js        krdict 상세 API 프록시 (예문 + 발음 file_no)
│  └─ audio.js       krdict 발음 음성 프록시
├─ dev.mjs           로컬 개발 서버 (Vercel 없이 실행)
├─ package.json
├─ .env.example      → .env.local 로 복사해 인증키 입력
└─ vercel.json
```

브라우저에서 사전 API를 **직접** 호출하면 ① CORS로 막히고 ② 인증키가 노출됩니다.
그래서 Vercel 서버리스 함수(`/api/*`)가 서버에서 대신 호출하고, 응답 XML을 그대로 전달하면
브라우저가 `DOMParser`로 파싱합니다. **인증키는 서버 환경변수로만 주입**됩니다.

## 로컬 실행

인증키 설정 — `.env.example`을 복사해 `.env.local`을 만들고 발급받은 키 입력:
```
KRDICT_KEY=발급받은_32자리_인증키
```

### 실행 방법 (Vercel 불필요)
터미널(PowerShell)에서 이 폴더로 이동한 뒤 서버를 켭니다:
```bash
cd C:\Users\SKTelecom\Desktop\CLAUDE-COWORK\PROJECTS\mmr-cards
npm run local
```
→ 터미널에 "서버 실행 중"이 뜨면, 브라우저에서 **http://localhost:3000** 접속.
(`dev.mjs`가 프록시 함수 + 정적 파일을 함께 서빙)

> ⚠️ http://localhost:3000 은 **서버가 켜져 있을 때만** 열립니다. 서버 없이 주소만
> 입력하면 "연결할 수 없음"이 뜹니다. 그 터미널 창은 쓰는 동안 닫지 마세요.

### 방법 B — Vercel CLI 로
```bash
npm i -g vercel
vercel dev
```
> 첫 실행 시 로그인/프로젝트 연결을 물어봅니다.

> `index.html`을 파일로 바로 열어도 **학습·직접추가**는 동작하지만, **사전 검색**은 프록시가
> 필요하므로 위 두 방법 중 하나로 실행해야 합니다. (우측 상단 점: 🟢 연결 / 🔴 미연결)

## 배포 (Vercel)

1. 이 폴더를 GitHub에 올리고 Vercel 프로젝트로 연결 (또는 `vercel --prod`)
2. Vercel → **Settings → Environment Variables** 에 `KRDICT_KEY` 추가
3. 배포 완료. `index.html`이 정적으로, `/api/search`·`/api/view`가 함수로 서빙됩니다.

## API 참고 (한국어기초사전)

- 검색: `https://krdict.korean.go.kr/api/search?key=&q=&translated=y&trans_lang=2`
- 상세: `https://krdict.korean.go.kr/api/view?key=&method=target_code&q=&translated=y&trans_lang=2`
- `trans_lang=2` = 일본어, 응답은 XML, 하루 50,000건 제한
- 인증키 발급: https://krdict.korean.go.kr/kor/openApi/openApiRegister
