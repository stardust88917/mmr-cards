// Vercel Serverless Function — krdict 상세(view) API 프록시
//
// search 응답에는 예문(용례)이 없다. target_code 로 상세 조회하면
// sense_info > example_info > example 경로에 예문이 들어 있다.
//
// 요청:  GET /api/view?target_code=32750
// 응답:  krdict 가 준 XML 을 그대로 전달

const KRDICT_VIEW = "https://krdict.korean.go.kr/api/view";
const TRANS_LANG_JA = "2"; // 일본어

// krdict 서버가 비브라우저 요청을 400 "Request Blocked" 로 차단하므로
// 브라우저 User-Agent 를 붙여야 한다.
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export default async function handler(req, res) {
  const key = process.env.KRDICT_KEY;
  if (!key) {
    res.status(500).json({ error: "KRDICT_KEY 환경변수가 설정되지 않았습니다." });
    return;
  }

  const targetCode = (req.query.target_code || "").toString().trim();
  if (!targetCode) {
    res.status(400).json({ error: "target_code 가 필요합니다." });
    return;
  }

  const url = new URL(KRDICT_VIEW);
  url.searchParams.set("key", key);
  url.searchParams.set("method", "target_code");
  url.searchParams.set("q", targetCode);
  url.searchParams.set("translated", "y");
  url.searchParams.set("trans_lang", TRANS_LANG_JA);

  try {
    const upstream = await fetch(url, {
      headers: { Accept: "application/xml", "User-Agent": BROWSER_UA },
    });
    const xml = await upstream.text();
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
    res.status(upstream.ok ? 200 : upstream.status).send(xml);
  } catch (err) {
    res.status(502).json({ error: "사전 서버 호출 실패", detail: String(err) });
  }
}
