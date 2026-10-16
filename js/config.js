/*
 * 공유 DB(Supabase) 연결 설정
 * - 두 값을 비워 두면 지금처럼 이 브라우저(localStorage)에만 저장합니다.
 * - 값은 Supabase → Project Settings → API 에서 복사합니다.
 *   anon key 는 공개되어도 되는 키입니다. 데이터는 로그인 + RLS 정책으로 보호됩니다.
 *   service_role key 는 절대 여기에 넣지 마세요.
 */
window.WV_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: ""
};
