/*
 * 공유 저장소 (Supabase)
 * - js/config.js 에 SUPABASE_URL, SUPABASE_ANON_KEY 가 있을 때만 켜집니다. 없으면 store.js(브라우저 저장)를 씁니다.
 * - 로그인한 뒤 supabase/schema.sql 의 members 명단에 있는 사람만 읽고 쓸 수 있습니다.
 * - store.js 와 같은 인터페이스(collection/doc, onSnapshot, set/update/delete)를 제공하므로 app.js 는 그대로 동작합니다.
 * - window.DBReady 는 로그인과 첫 데이터 불러오기가 끝나면 { db, user } 로 완료됩니다.
 */
(function () {
  "use strict";
  var cfg = window.WV_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return;

  var LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
  var TABLE = "docs";
  var COLS = ["sites", "issues", "notes", "wages", "wagenotes"];
  var listeners = {};
  var data = empty();
  var sb, me;

  function empty() { return { sites: {}, issues: {}, notes: {}, wages: {}, wagenotes: {} }; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function gid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function fail(e) {
    console.error(e);
    // 권한 없음(RLS) → app.js 가 보기 전용으로 전환
    if (e && (e.code === "42501" || /row-level security/i.test(e.message || ""))) return { code: "invalid_argument", message: "저장 권한이 없습니다." };
    return { code: "network", message: (e && e.message) || "서버에 저장하지 못했습니다." };
  }

  function snap(c) {
    var docs = Object.keys(data[c] || {}).sort().map(function (id) {
      var d = data[c][id];
      return { id: id, exists: true, data: function () { return clone(d); } };
    });
    return { docs: docs, size: docs.length, empty: !docs.length };
  }
  function emit(c) { (listeners[c] || []).forEach(function (f) { f(snap(c)); }); }
  function emitAll() { COLS.forEach(emit); }

  function loadAll() {
    var next = empty(), PAGE = 1000;
    function page(from) {
      return sb.from(TABLE).select("col,id,data").order("col").order("id").range(from, from + PAGE - 1).then(function (r) {
        if (r.error) throw fail(r.error);
        r.data.forEach(function (row) { if (next[row.col]) next[row.col][row.id] = row.data; });
        if (r.data.length === PAGE) return page(from + PAGE);
      });
    }
    return page(0).then(function () { data = next; emitAll(); });
  }

  function write(c, id, d) {
    return sb.from(TABLE).upsert({ col: c, id: id, data: d, updated_at: new Date().toISOString(), updated_by: me.email })
      .then(function (r) { if (r.error) throw fail(r.error); data[c][id] = d; emit(c); });
  }

  function docRef(c, id) {
    return {
      id: id,
      set: function (d) { return write(c, id, clone(d)); },
      update: function (d) {
        if (!data[c] || !data[c][id]) return Promise.reject({ code: "invalid_argument", message: "문서가 없습니다." });
        return write(c, id, Object.assign(clone(data[c][id]), clone(d)));
      },
      delete: function () {
        return sb.from(TABLE).delete().eq("col", c).eq("id", id)
          .then(function (r) { if (r.error) throw fail(r.error); delete data[c][id]; emit(c); });
      }
    };
  }

  var CloudDB = {
    cloud: true,
    collection: function (c) {
      return {
        onSnapshot: function (f) {
          (listeners[c] = listeners[c] || []).push(f);
          setTimeout(function () { f(snap(c)); }, 0);
          return function () { listeners[c] = listeners[c].filter(function (x) { return x !== f; }); };
        },
        add: function (d) { var r = docRef(c, gid()); return r.set(d).then(function () { return r; }); },
        doc: function (id) { return docRef(c, id || gid()); }
      };
    },
    doc: function (path) { var p = path.split("/"); return docRef(p[0], p[1]); },
    exportJSON: function () { return JSON.stringify(Object.assign({ exportedAt: new Date().toISOString() }, data), null, 2); },
    // 공유 DB에서는 백업을 '덮어쓰기'가 아니라 '합치기'로 불러옵니다. (같은 id 는 백업 내용으로 바뀌고, 나머지는 그대로)
    importJSON: function (text) {
      var o = JSON.parse(text);
      if (!o || typeof o.sites !== "object") return Promise.reject(new Error("급여·노무 백업 파일이 아닙니다."));
      var rows = [], now = new Date().toISOString();
      COLS.forEach(function (c) { Object.keys(o[c] || {}).forEach(function (id) { rows.push({ col: c, id: id, data: o[c][id], updated_at: now, updated_by: me.email }); }); });
      var chunks = [];
      for (var i = 0; i < rows.length; i += 500) chunks.push(rows.slice(i, i + 500));
      return chunks.reduce(function (p, ch) {
        return p.then(function () { return sb.from(TABLE).upsert(ch).then(function (r) { if (r.error) throw fail(r.error); }); });
      }, Promise.resolve()).then(loadAll);
    },
    reset: function () { return Promise.reject(new Error("공유 DB에서는 초기화를 쓸 수 없습니다.")); },
    signOut: function () { return sb.auth.signOut().then(function () { location.reload(); }); }
  };

  /* ---------- 로그인 화면 ---------- */
  function loginForm(msg) {
    return new Promise(function (resolve) {
      var w = document.createElement("div");
      w.id = "login";
      w.innerHTML =
        '<form class="login-card" novalidate>' +
        '<div class="brand"><b>윌앤비전 급여·노무</b><span>공유 DB에 로그인하세요</span></div>' +
        '<label class="f">이메일<input class="i" type="email" name="email" autocomplete="username" required></label>' +
        '<label class="f">비밀번호<input class="i" type="password" name="pw" autocomplete="current-password" required></label>' +
        '<p class="login-msg" role="alert"></p>' +
        '<button class="btn pri" type="submit">로그인</button>' +
        '<p class="login-help">계정이 없으면 인사팀 관리자에게 요청하세요.</p></form>';
      document.body.appendChild(w);
      var f = w.querySelector("form"), m = w.querySelector(".login-msg"), b = f.querySelector("button");
      if (msg) m.textContent = msg;
      f.email.focus();
      f.onsubmit = function (e) {
        e.preventDefault();
        if (!f.email.value || !f.pw.value) { m.textContent = "이메일과 비밀번호를 입력하세요."; return; }
        b.disabled = true; m.textContent = "";
        sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.pw.value }).then(function (r) {
          b.disabled = false;
          if (r.error) { m.textContent = /invalid/i.test(r.error.message) ? "이메일 또는 비밀번호가 맞지 않습니다." : "로그인하지 못했습니다: " + r.error.message; return; }
          w.remove(); resolve(r.data.user);
        });
      };
    });
  }

  function loadLib() {
    return new Promise(function (ok, no) {
      var s = document.createElement("script");
      s.src = LIB; s.onload = ok; s.onerror = function () { no(new Error("Supabase 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하세요.")); };
      document.head.appendChild(s);
    });
  }

  function checkMember() {
    // 로그인은 됐지만 members 명단에 없으면 false
    return sb.rpc("is_member").then(function (r) { if (r.error) throw fail(r.error); return r.data === true; });
  }

  function start(msg) {
    return sb.auth.getSession().then(function (r) {
      var u = r.data.session && r.data.session.user;
      return u || loginForm(msg);
    }).then(function (u) {
      me = u;
      return checkMember().then(function (ok) {
        if (ok) return;
        return sb.auth.signOut().then(function () { return start(u.email + " 계정은 사용 권한이 없습니다. 관리자에게 등록을 요청하세요."); });
      });
    });
  }

  function subscribe() {
    var first = true;
    sb.channel("docs-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, function (p) {
        var row = p.eventType === "DELETE" ? p.old : p.new;
        if (!row || !data[row.col]) return;
        if (p.eventType === "DELETE") delete data[row.col][row.id];
        else data[row.col][row.id] = row.data;
        emit(row.col);
      })
      .subscribe(function (status) {
        // 끊겼다가 다시 연결되면 그 사이 바뀐 내용을 다시 불러옵니다
        if (status === "SUBSCRIBED") { if (!first) loadAll().catch(console.error); first = false; }
      });
  }

  window.DBReady = loadLib().then(function () {
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    return start();
  }).then(loadAll).then(function () {
    subscribe();
    return { db: CloudDB, user: me };
  });
})();
