# mmr-cards 개발 일지 — 2026-08-19

한국어 ⇄ 일본어 플래시카드 단어장 앱을 **하루 만에 0에서 배포까지** 만든 기록.

- **라이브**: https://mmr-cards-jp.vercel.app
- **저장소**: https://github.com/stardust88917/mmr-cards
- **폴더**: `PROJECTS/mmr-cards`

---

## 1. 개요

국립국어원 **한국어기초사전 Open API**로 한국어 단어를 검색하면 일본어 뜻·발음·예문을 자동으로 채워 주는 플래시카드 앱.

- **한국어 사용자** → 일본어 단어를 외우는 앱
- **일본어 사용자** → 한국어 단어를 외우는 앱 (UI·튜토리얼 전부 일본어)
- 디자인은 [gen-sports26](https://github.com/stardust88917/gen-sports26)의 두 테마를 참고 → 최종적으로 **朱墨(미니멀)** 방향으로 확정

---

## 2. 아키텍처

```
mmr-cards/
├─ index.html            프론트엔드 (단일 파일: HTML+CSS+JS, 무프레임워크)
├─ api/
│  ├─ search.js          krdict 검색 프록시 (키 숨김 + CORS 우회)
│  ├─ view.js            krdict 상세 프록시 (예문 + 발음 file_no)
│  └─ audio.js           krdict 발음 음성 프록시
├─ dev.mjs               로컬 개발 서버 (Vercel 없이 실행)
├─ manifest.webmanifest  PWA 매니페스트
├─ sw.js                 서비스 워커 (오프라인 캐시)
├─ icon.svg              앱 아이콘 (주색 単)
├─ vercel.json · package.json · .env.example · .gitignore
└─ .env.local            KRDICT_KEY (gitignore)
```

- **왜 프록시?** 브라우저에서 사전 API를 직접 부르면 ① CORS로 막히고 ② 인증키가 노출됨. Vercel 서버리스 함수가 서버에서 대신 호출 → XML 그대로 전달 → 브라우저가 `DOMParser`로 파싱. 키는 서버 환경변수(`KRDICT_KEY`)로만 주입.
- **비자명 함정**: krdict는 비브라우저 요청을 `400 Request Blocked`로 차단 → 프록시 `fetch`에 브라우저 User-Agent 필수.

---

## 3. 오늘의 마일스톤 (시간순)

### ① 앱 뼈대 + 사전 연동
- 한국어기초사전 API 스펙 확인: `search`(발음 O, 예문 X), `view`(예문 O, `pronunciation_info`에 발음 음성), `trans_lang=2`=일본어, 응답 XML
- 프론트(카드 플립·덱·localStorage) + 프록시(search/view) 구현
- 로컬 브라우저에서 렌더·검색·추가 전 과정 검증

### ② 프로젝트 정리 & 배포
- 폴더 `jp-ko-vocab` → `mmr-cards`로 이동, GitHub 저장소 연결·push
- Vercel 배포 → **검색이 500**: 환경변수 `KRDICT_KEY` 미설정이 원인 → Production에 등록 + 재배포로 해결
- **로컬 실행 문제**: Vercel CLI 미설치라 `npm run local`(=`dev.mjs`)로 로그인 없이 실행하도록 개선. (엔터프라이즈 보안이 `.bat`를 막아 `.bat` 런처는 폐기)

### ③ 발음 듣기 🔊
- krdict가 **실제 사람 녹음**을 제공(`oraginalDownload.do?file_no=`)하는 걸 발견 → `api/audio.js` 프록시 추가
- 한국어=krdict 녹음(없으면 브라우저 TTS 대체), 일본어 뜻=브라우저 TTS(ja-JP)
- 카드 앞/뒤에 스피커 버튼

### ④ 가나(かな) 학습 탭
- 오십음도 표(청음·탁음·요음) + 히라가나⇄가타카나 전환(유니코드 오프셋) + 발음 재생
- **퀴즈**: 글자↔읽기 4지선다, 실시간 채점

### ⑤ 첫 접속 튜토리얼
- 4단계 온보딩 모달(환영→단어추가→학습→가나), 첫 방문에만 표시, 도움말(?) 재열람
- '단어 추가' 단계에 **미니 시각 데모**(검색창→결과카드→＋추가)

### ⑥ 디자인 패스 — 朱墨(미니멀)
- 레퍼런스에서 3가지 팔레트 방향 뽑아 비교([팔레트 보드](https://claude.ai/code/artifact/aadf81db-3e8f-4c18-bf72-01cfe80166ee)) → **朱墨** 선택
  - 크림 종이 `#F1ECE3` + 먹 `#1A1815` + 주색 `#C8503C`
- **明朝체**(Zen Old Mincho / Noto Serif KR)로 단어·로고
- 모든 이모지 → **인라인 SVG 라인 아이콘**
- **인장(印) 도장 효과**: '외웠어요' 누르면 주색 「済」 도장이 찍히는 애니메이션 + 외운 카드 상시 인장

### ⑦ 버그 수정 — 빈 카드
- 일본어 직역어(`trans_word`)가 없는 단어(예: 밥상머리)는 `일→한`에서 빈 카드
- **수정**: 직역어 없으면 일본어 뜻풀이(`trans_dfn`)로 대체(`jaMain` 헬퍼). 이미 추가된 카드도 자동 정상화

### ⑧ 다국어 (한/일)
- 첫 실행 시 **언어 선택 화면**(한국어/日本語)
- 일본어 선택 → UI·튜토리얼(3단계) 전부 일본어, **가나 탭 숨김**(일본인은 가나를 알므로), 품사/등급도 번역
- 언어 토글 버튼(`日`/`한`), `notranslate`로 Chrome 자동번역 방지

### ⑨ 모바일 최적화 + PWA
- 상단 탭 유지 + 터치 타깃 확대·16px 입력·세이프에어리어·눌림 피드백
- **카드 스와이프**: 오른쪽=외움 / 왼쪽=다시 / 탭=뒤집기 (드래그 중 초록·빨강 테두리)
- **PWA**: `standalone` 매니페스트 + 서비스 워커(오프라인) + SVG 아이콘 + 상태바 색 → 안드로이드에서 "홈 화면에 추가"로 앱처럼 실행

---

## 4. 실행 방법

```bash
cd PROJECTS/mmr-cards
npm run local      # http://localhost:3000 (Vercel 불필요)
```
> `.env.local`에 `KRDICT_KEY=발급받은_인증키` 필요. 배포는 Vercel 환경변수에 `KRDICT_KEY` 등록 후 자동.

## 5. 안드로이드 설치
크롬으로 라이브 접속 → 메뉴(⋮) → **앱 설치 / 홈 화면에 추가** → 전체화면 앱 + 오프라인 동작

---

## 6. 남은 것 / 다음 후보
- 일본어 사용자용 **한글(자모) 학습 탭** (가나 탭의 한글 버전)
- 먹빛 라인 일러스트(스미 모티프)로 빈 화면·여백 마감
- **Play 스토어** 등록 (TWA — Bubblewrap/PWABuilder로 APK/AAB 래핑)
- 아이콘 PNG 버전(현재 SVG — 구형 안드로이드 대비)
- 간격 반복(SRS) 복습 스케줄

---

## 7. 주요 커밋 (오늘)
- 일본어-한국어 단어장 초기 버전 / 프로젝트 mmr-cards 정리
- 발음 듣기(스피커) · 가나 학습 탭 · 첫 접속 튜토리얼
- 컬러 팔레트 朱墨 · 明朝체+라인 아이콘 · 인장 도장 효과
- 빈 카드 버그 수정 · 다국어(한/일) · 모바일+PWA

*Generated with Claude Code · 2026-08-19*
