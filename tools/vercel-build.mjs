// Vercel 배포용 빌드: dist/ 폴더에 사이트 파일을 모으고, 환경 변수로 Supabase 설정 파일을 만듭니다.
// - Vercel → Project → Settings → Environment Variables 에 SUPABASE_URL, SUPABASE_ANON_KEY 를 넣으세요.
// - data/seed-sites.js(엑셀 원본: 담당자 이름·연락처)는 공개 사이트에 올리지 않습니다. 데이터는 Supabase 에 있습니다.
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL, SUPABASE_ANON_KEY 환경 변수가 없습니다. Vercel 프로젝트 설정에서 넣어 주세요.");
  process.exit(1);
}
rmSync("dist", { recursive: true, force: true });
mkdirSync("dist");
cpSync("index.html", "dist/index.html");
cpSync("css", "dist/css", { recursive: true });
cpSync("js", "dist/js", { recursive: true, filter: src => !src.endsWith("config.local.js") });
writeFileSync("dist/js/config.local.js",
  `window.WV_CONFIG = ${JSON.stringify({ supabaseUrl: url, supabaseAnonKey: key }, null, 2)};\n`);
console.log("dist/ 준비 완료");
