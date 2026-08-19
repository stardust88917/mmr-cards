// 로컬 개발 서버 — Vercel CLI 없이 서버리스 함수(api/*.js) + 정적 파일을 그대로 실행
//
//   실행:  node dev.mjs      (또는  npm run local)
//   접속:  http://localhost:3000
//
// .env.local 의 KRDICT_KEY 를 읽어 프록시가 사전 API 를 호출한다.
// (프로덕션에서는 이 파일 대신 Vercel 이 api/*.js 를 함수로 서빙한다.)

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// .env.local 로드
const envPath = path.join(ROOT, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
if (!process.env.KRDICT_KEY) {
  console.warn("⚠️  .env.local 에 KRDICT_KEY 가 없습니다. 사전 검색이 동작하지 않습니다.");
}

const apiHandlers = {
  "/api/search": (await import(pathToFileURL(path.join(ROOT, "api/search.js")).href)).default,
  "/api/view": (await import(pathToFileURL(path.join(ROOT, "api/view.js")).href)).default,
  "/api/audio": (await import(pathToFileURL(path.join(ROOT, "api/audio.js")).href)).default,
};

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml", ".ico": "image/x-icon",
};

// Vercel 의 req.query / res.status().json().send() 를 흉내내는 얇은 shim
function shimRes(res) {
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(o)); };
  res.send = (b) => res.end(b);
  return res;
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://localhost");
  const p = decodeURIComponent(u.pathname);

  if (apiHandlers[p]) {
    req.query = Object.fromEntries(u.searchParams);
    shimRes(res);
    try {
      await apiHandlers[p](req, res);
    } catch (e) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: String(e) }));
    }
    return;
  }

  // 정적 파일 (디렉터리 탈출 방지)
  const rel = p === "/" ? "index.html" : p.replace(/^\/+/, "");
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.statusCode = 403; res.end("forbidden"); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; res.end("not found"); return; }
    res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`\n  일본어 단어장 로컬 서버 실행 중`);
  console.log(`  → http://localhost:${PORT}\n`);
  console.log(`  KRDICT_KEY: ${process.env.KRDICT_KEY ? "로드됨 ✓" : "없음 ✗ (.env.local 확인)"}`);
  console.log(`  (종료: Ctrl+C)\n`);
});
