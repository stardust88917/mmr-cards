// Vercel Serverless Function — krdict 발음 음성 프록시
//
// view 응답의 pronunciation_info/link 에 담긴 뷰어 URL 에서 file_no 를 뽑아
// 실제 음성 파일( .../common/file/oraginalDownload.do?file_no= )을 받아 전달한다.
// 이 미디어 서버는 인증키가 필요 없지만, 비브라우저 요청을 막으므로 UA 를 붙이고,
// 브라우저가 same-origin 으로 재생할 수 있도록 프록시한다.
//
// 요청:  GET /api/audio?file_no=73686
// 응답:  오디오 바이트 (audio/mpeg)

const KRDICT_MEDIA = "https://krdicmedia.korean.go.kr/common/file/oraginalDownload.do";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export default async function handler(req, res) {
  const fileNo = (req.query.file_no || "").toString().trim();
  if (!/^\d+$/.test(fileNo)) {
    res.status(400).json({ error: "file_no(숫자)가 필요합니다." });
    return;
  }

  try {
    const upstream = await fetch(`${KRDICT_MEDIA}?file_no=${fileNo}`, {
      headers: { "User-Agent": BROWSER_UA },
    });
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: "발음 음성을 찾을 수 없습니다." });
      return;
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=604800, s-maxage=604800");
    res.status(200).send(buf);
  } catch (err) {
    res.status(502).json({ error: "음성 서버 호출 실패", detail: String(err) });
  }
}
