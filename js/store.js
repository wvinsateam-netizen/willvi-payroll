/*
 * 로컬 저장소 (브라우저 localStorage)
 * - 처음 열면 data/seed-sites.js 의 엑셀 사업장 정보로 채웁니다.
 * - 입력한 노무 문제·급여 특이사항·통상임금은 이 브라우저에만 저장됩니다.
 *   다른 PC로 옮기거나 보관하려면 화면 왼쪽 아래 [백업 저장]을 쓰세요.
 * - app.js 는 아래 인터페이스(collection/doc, onSnapshot, set/update/delete)만 사용합니다.
 *   나중에 서버(DB)로 옮길 때는 이 파일만 바꾸면 됩니다.
 */
(function () {
  "use strict";
  var KEY = "wv-payroll-db-v1";
  var COLS = ["sites", "issues", "notes", "bills", "wages", "wagenotes"];
  var listeners = {};
  var data;

  function empty() { return { sites: {}, issues: {}, notes: {}, bills: {}, wages: {}, wagenotes: {} }; }
  function seeded() {
    var d = empty();
    (window.SEED_SITES || []).forEach(function (s) { d.sites[s.id] = JSON.parse(JSON.stringify(s.data)); });
    return d;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { throw { code: "quota_exceeded", message: "브라우저 저장 공간이 부족합니다." }; }
  }
  function load() {
    try { var raw = localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); if (o && o.sites) return Object.assign(empty(), o); } } catch (e) {}
    return null;
  }
  data = load();
  if (!data) { data = seeded(); try { save(); } catch (e) {} }

  function snap(c) {
    var docs = Object.keys(data[c] || {}).sort().map(function (id) {
      var d = data[c][id];
      return { id: id, exists: true, data: function () { return JSON.parse(JSON.stringify(d)); } };
    });
    return { docs: docs, size: docs.length, empty: !docs.length };
  }
  function emit(c) { (listeners[c] || []).forEach(function (f) { f(snap(c)); }); }
  function emitAll() { COLS.forEach(emit); }
  function gid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function docRef(c, id) {
    return {
      id: id,
      set: function (d) { (data[c] = data[c] || {})[id] = JSON.parse(JSON.stringify(d)); save(); emit(c); return Promise.resolve(); },
      update: function (d) {
        if (!data[c] || !data[c][id]) return Promise.reject({ code: "invalid_argument", message: "문서가 없습니다." });
        Object.assign(data[c][id], JSON.parse(JSON.stringify(d))); save(); emit(c); return Promise.resolve();
      },
      delete: function () { if (data[c]) delete data[c][id]; save(); emit(c); return Promise.resolve(); }
    };
  }

  window.LocalDB = {
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
    importJSON: function (text) {
      var o = JSON.parse(text);
      if (!o || typeof o.sites !== "object") throw new Error("급여·노무 백업 파일이 아닙니다.");
      data = empty(); COLS.forEach(function (c) { if (o[c]) data[c] = o[c]; });
      save(); emitAll();
    },
    reset: function () { data = seeded(); save(); emitAll(); }
  };

  // 같은 PC에서 탭을 여러 개 열어도 내용이 맞춰지도록
  window.addEventListener("storage", function (e) {
    if (e.key !== KEY) return;
    var o = load(); if (o) { data = o; emitAll(); }
  });
})();
