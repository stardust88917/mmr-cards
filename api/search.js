// Vercel Serverless Function — krdict 검색(search) API 프록시
//
// 브라우저에서 국립국어원 한국어기초사전 API를 직접 부르면 (1) CORS 로 막히고
// (2) 인증키가 소스에 노출된다. 이 함수가 서버에서 대신 호출해 두 문제를 해결한다.
// 인증키는 환경변수 KRDICT_KEY 로만 주입되며 클라이언트로 나가지 않는다.
//
// 요청:  GET /api/search?q=나무&num=20&start=1
// 응답:  krdict 가 준 XML 을 그대로 전달 (브라우저가 DOMParser 로 파싱)

const KRDICT_SEARCH = "https://krdict.korean.go.kr/api/search";
const TRANS_LANG_JA = "2"; // 일본어

// krdict 서버가 비브라우저 요청(기본 Node fetch 등)을 400 "Request Blocked" 로
// 차단하므로 브라우저 User-Agent 를 붙여야 한다.
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export default async function handler(req, res) {
  const key = process.env.KRDICT_KEY;
  if (!key) {
    res.status(500).json({ error: "KRDICT_KEY 환경변수가 설정되지 않았습니다." });
    return;
  }

  const q = (req.query.q || "").toString().trim();
  if (!q) {
    res.status(400).json({ error: "검색어(q)가 필요합니다." });
    return;
  }

  // num 은 10~100 만 허용 (그 밖이면 API 가 error_code 103 을 반환)
  const num = Math.max(10, Math.min(100, parseInt(req.query.num, 10) || 10));
  const start = Math.max(1, Math.min(1000, parseInt(req.query.start, 10) || 1));
  const part = ["word", "ip", "dfn", "exam"].includes(req.query.part) ? req.query.part : "word";
  const sort = req.query.sort === "popular" ? "popular" : "dict";

  const url = new URL(KRDICT_SEARCH);
  url.searchParams.set("key", key);
  url.searchParams.set("q", q);
  url.searchParams.set("translated", "y");
  url.searchParams.set("trans_lang", TRANS_LANG_JA);
  url.searchParams.set("part", part);
  url.searchParams.set("sort", sort);
  url.searchParams.set("num", String(num));
  url.searchParams.set("start", String(start));

  try {
    const upstream = await fetch(url, {
      headers: { Accept: "application/xml", "User-Agent": BROWSER_UA },
    });
    const xml = await upstream.text();
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    // 사전 내용은 잘 안 바뀌므로 CDN 에 하루 캐시
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
    res.status(upstream.ok ? 200 : upstream.status).send(xml);
  } catch (err) {
    res.status(502).json({ error: "사전 서버 호출 실패", detail: String(err) });
  }
}
