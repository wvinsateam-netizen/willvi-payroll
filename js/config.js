/*
 * Supabase 연결 설정 (기본값: 비어 있음 → 이 브라우저에만 저장)
 *
 * ⚠️ 이 파일에 실제 주소·키를 넣지 마세요. GitHub 저장소가 공개라서 누구나 보게 되고,
 *    로그인 없이 쓰는 구조라 키만 있으면 급여 데이터를 읽고 지울 수 있습니다.
 *
 * 실제 값은 같은 폴더에 config.local.js 파일을 만들어 넣습니다. (.gitignore 에 있어 GitHub 에 올라가지 않음)
 *   window.WV_CONFIG = {
 *     supabaseUrl: "https://abcdefgh.supabase.co",
 *     supabaseAnonKey: "eyJhbGciOi..."
 *   };
 * 팀원에게는 config.local.js 파일을 메신저 등으로 따로 전달하세요.
 */
window.WV_CONFIG = window.WV_CONFIG || { supabaseUrl: "", supabaseAnonKey: "" };
