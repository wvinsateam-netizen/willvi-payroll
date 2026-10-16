/*
 * Supabase 저장소
 * - js/config.js 에 주소와 키를 넣으면 이 파일이 쓰입니다. 비어 있으면 js/store.js(로컬)를 씁니다.
 * - app.js 가 쓰는 인터페이스(collection/doc, onSnapshot, set/update/delete)는 store.js 와 같습니다.
 * - 테이블 구조는 supabase/schema.sql 참고: (id, data jsonb, updated_at, updated_by)
 * - 로그인: Supabase Auth 이메일·비밀번호. 계정은 Supabase 대시보드에서 관리자가 만듭니다.
 */
(function () {
  "use strict";
  var cfg = window.WV_CONFIG || {};
  var enabled = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  var LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
  var COLS = ["sites", "issues", "notes", "wages", "wagenotes"];
  var PAGE = 1000;
  var sb = null, me = null;
  var cache = {}, listeners = {}, started = {};

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function gid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  // Supabase 오류를 app.js 의 err() 가 아는 형태로
  function fail(e) {
    var code = e && e.code === "42501" ? "permission_denied" : "supabase_error";
    return { code: code, message: (e && e.message) || "Supabase 오류" };
  }

  function loadLib() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise(function (ok, no) {
      var s = document.createElement("script"); s.src = LIB;
      s.onload = function () { ok(); };
      s.onerror = function () { no(new Error("Supabase 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하세요.")); };
      document.head.appendChild(s);
    });
  }

  /* ---------- 읽기 · 실시간 ---------- */
  function snap(c) {
    var m = cache[c] || {};
    var docs = Object.keys(m).sort().map(function (id) {
      return { id: id, exists: true, data: function () { return clone(m[id]); } };
    });
    return { docs: docs, size: docs.length, empty: !docs.length };
  }
  function emit(c) { if (cache[c]) (listeners[c] || []).forEach(function (f) { f(snap(c)); }); }

  async function fetchAll(c) {
    var out = {}, from = 0;
    for (;;) {
      var r = await sb.from(c).select("id,data").order("id").range(from, from + PAGE - 1);
      if (r.error) throw fail(r.error);
      r.data.forEach(function (row) { out[row.id] = row.data || {}; });
      if (r.data.length < PAGE) return out;
      from += PAGE;
    }
  }
  function start(c) {
    if (started[c]) return; started[c] = true;
    sb.channel("wv-" + c)
      .on("postgres_changes", { event: "*", schema: "public", table: c }, function (p) {
        if (!cache[c]) return; // 첫 읽기가 끝나면 어차피 최신 상태
        if (p.eventType === "DELETE") { if (p.old && p.old.id) delete cache[c][p.old.id]; }
        else if (p.new && p.new.id) cache[c][p.new.id] = p.new.data || {};
        emit(c);
      })
      .subscribe(function (status) {
        // 끊겼다가 다시 연결되면 그 사이 바뀐 것을 놓치지 않도록 전체 다시 읽기
        if (status === "SUBSCRIBED" && cache[c]) fetchAll(c).then(function (m) { cache[c] = m; emit(c); }).catch(console.error);
      });
    fetchAll(c).then(function (m) { cache[c] = m; emit(c); }).catch(function (e) {
      console.error(e); cache[c] = {}; emit(c);
      if (window.WV_onStoreError) window.WV_onStoreError(e);
    });
  }

  /* ---------- 쓰기 ---------- */
  async function put(c, id, d) {
    var r = await sb.from(c).upsert({ id: id, data: d, updated_at: new Date().toISOString(), updated_by: me && me.id });
    if (r.error) throw fail(r.error);
    (cache[c] = cache[c] || {})[id] = clone(d); emit(c);
  }
  function docRef(c, id) {
    return {
      id: id,
      set: function (d) { return put(c, id, clone(d)); },
      update: function (d) {
        var cur = cache[c] && cache[c][id];
        if (!cur) return Promise.reject({ code: "not_found", message: "문서가 없습니다." });
        return put(c, id, Object.assign(clone(cur), clone(d)));
      },
      delete: async function () {
        var r = await sb.from(c).delete().eq("id", id);
        if (r.error) throw fail(r.error);
        if (cache[c]) delete cache[c][id]; emit(c);
      }
    };
  }
  async function upsertMany(c, m) {
    var rows = Object.keys(m || {}).map(function (id) { return { id: id, data: m[id], updated_at: new Date().toISOString(), updated_by: me && me.id }; });
    for (var i = 0; i < rows.length; i += 500) {
      var r = await sb.from(c).upsert(rows.slice(i, i + 500));
      if (r.error) throw fail(r.error);
    }
  }
  async function reload() {
    for (var i = 0; i < COLS.length; i++) { var c = COLS[i]; if (started[c]) { cache[c] = await fetchAll(c); emit(c); } }
  }

  /* ---------- 로그인 화면 ---------- */
  function loginScreen(msg) {
    return new Promise(function (resolve) {
      var box = document.createElement("div");
      box.className = "login-bg";
      box.innerHTML = '<form class="login" autocomplete="on">' +
        '<b>윌앤비전 급여·노무</b><span class="muted">팀 공용 저장소(Supabase)에 로그인하세요.</span>' +
        '<label class="f">이메일<input class="i" type="email" name="email" autocomplete="username" required></label>' +
        '<label class="f">비밀번호<input class="i" type="password" name="pw" autocomplete="current-password" required></label>' +
        '<div class="login-msg" role="alert">' + esc(msg || "") + '</div>' +
        '<button class="btn pri" type="submit">로그인</button></form>';
      document.body.appendChild(box);
      var f = box.querySelector("form"), m = box.querySelector(".login-msg"), b = box.querySelector("button");
      f.email.focus();
      f.addEventListener("submit", async function (e) {
        e.preventDefault(); b.disabled = true; m.textContent = "";
        var r = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.pw.value });
        b.disabled = false;
        if (r.error) { m.textContent = "로그인하지 못했습니다. 이메일과 비밀번호를 확인하세요."; return; }
        box.remove(); resolve(r.data.user);
      });
    });
  }

  window.SupaDB = {
    enabled: enabled,
    // 로그인까지 마치면 사용자 정보를 돌려줌
    connect: async function () {
      try { await loadLib(); }
      catch (e) {
        var d = document.createElement("div"); d.className = "login-bg";
        d.innerHTML = '<div class="login"><b>연결하지 못했습니다</b><span class="login-msg">' + esc(e.message) + '</span><button class="btn pri" onclick="location.reload()">다시 시도</button></div>';
        document.body.appendChild(d); throw e;
      }
      sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true } });
      var s = await sb.auth.getSession();
      me = s.data && s.data.session ? s.data.session.user : await loginScreen();
      // 다른 탭에서 로그아웃하거나 세션이 끝나면 다시 로그인
      sb.auth.onAuthStateChange(function (ev) { if (ev === "SIGNED_OUT") location.reload(); });
      return me;
    },
    user: function () { return me; },
    signOut: function () { return sb.auth.signOut().then(function () { location.reload(); }); },
    collection: function (c) {
      return {
        onSnapshot: function (f) {
          (listeners[c] = listeners[c] || []).push(f);
          start(c);
          if (cache[c]) setTimeout(function () { f(snap(c)); }, 0);
          return function () { listeners[c] = listeners[c].filter(function (x) { return x !== f; }); };
        },
        add: function (d) { var r = docRef(c, gid()); return r.set(d).then(function () { return r; }); },
        doc: function (id) { return docRef(c, id || gid()); }
      };
    },
    doc: function (path) { var p = path.split("/"); return docRef(p[0], p[1]); },
    // 백업 파일(JSON)을 올림: 같은 id 는 덮어쓰고, 백업에 없는 것은 지우지 않음
    importJSON: async function (text) {
      var o = JSON.parse(text);
      if (!o || typeof o.sites !== "object") throw new Error("급여·노무 백업 파일이 아닙니다.");
      for (var i = 0; i < COLS.length; i++) await upsertMany(COLS[i], o[COLS[i]]);
      await reload();
    },
    // 이 브라우저(localStorage)에 있던 데이터를 Supabase 로 올림
    uploadLocal: async function () {
      if (!window.LocalDB) throw new Error("로컬 데이터가 없습니다.");
      var o = JSON.parse(window.LocalDB.exportJSON()), n = 0;
      for (var i = 0; i < COLS.length; i++) { await upsertMany(COLS[i], o[COLS[i]]); n += Object.keys(o[COLS[i]] || {}).length; }
      await reload();
      return n;
    },
    exportJSON: function () {
      var o = { exportedAt: new Date().toISOString() };
      COLS.forEach(function (c) { o[c] = clone(cache[c] || {}); });
      return JSON.stringify(o, null, 2);
    }
  };
})();
