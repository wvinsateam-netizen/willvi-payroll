/*
 * 엑셀(.xlsx) 읽기·쓰기 (외부 라이브러리 없이)
 * - 쓰기: 시트 여러 개, 모든 칸을 글자로 저장 (엑셀이 001 → 1, 날짜 자동 변환 등을 하지 않도록)
 * - 읽기: 엑셀·구글 시트에서 저장한 .xlsx 의 시트별 표를 2차원 배열로 돌려줌
 *   (압축 풀기는 브라우저 기본 기능 DecompressionStream 사용)
 *   숫자 칸은 숫자 그대로(문자열) 돌려줌. 날짜 칸은 엑셀 일련번호이므로 XLSXLite.serialToDate 로 바꿔 씀
 */
(function () {
  "use strict";
  var enc = new TextEncoder();

  /* ---------- zip ---------- */
  var CRC = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xffffffff; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  // 압축하지 않고(store) 묶기
  function zip(files) {
    var parts = [], central = [], offset = 0;
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = typeof f.data === "string" ? enc.encode(f.data) : f.data, crc = crc32(data);
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true);
      c.setUint32(42, offset, true);
      central.push(new Uint8Array(c.buffer), name);
      offset += 30 + name.length + data.length;
    });
    var size = central.reduce(function (n, p) { return n + p.length; }, 0);
    var e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, size, true); e.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [new Uint8Array(e.buffer)]), { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  async function inflate(data) {
    var s = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  async function unzip(buf) {
    var u = new Uint8Array(buf), v = new DataView(buf), dec = new TextDecoder(), out = {};
    var e = -1; for (var i = u.length - 22; i >= Math.max(0, u.length - 65557); i--) if (v.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error("엑셀(.xlsx) 파일이 아닙니다.");
    var n = v.getUint16(e + 10, true), p = v.getUint32(e + 16, true);
    for (var k = 0; k < n; k++) {
      if (v.getUint32(p, true) !== 0x02014b50) throw new Error("파일이 손상되었습니다.");
      var method = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), lo = v.getUint32(p + 42, true);
      var name = dec.decode(u.subarray(p + 46, p + 46 + nl));
      var start = lo + 30 + v.getUint16(lo + 26, true) + v.getUint16(lo + 28, true), data = u.subarray(start, start + csize);
      out[name] = { method: method, data: data };
      p += 46 + nl + xl + cl;
    }
    return {
      has: function (nm) { return !!out[nm]; },
      text: async function (nm) { var f = out[nm]; if (!f) return null; var d = f.method === 8 ? await inflate(f.data) : f.data; return dec.decode(d); }
    };
  }

  /* ---------- 쓰기 ---------- */
  function x(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ""); }
  function col(i) { var s = ""; i++; while (i) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function sheetXml(rows) {
    var w = (rows[0] || []).map(function (_, c) { var m = 8; rows.slice(0, 200).forEach(function (r) { var t = String(r[c] == null ? "" : r[c]); var len = 0; for (var i = 0; i < Math.min(t.length, 60); i++) len += t.charCodeAt(i) > 255 ? 2 : 1; m = Math.max(m, len); }); return Math.min(m + 2, 60); });
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      (w.length ? "<cols>" + w.map(function (n, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + n + '" customWidth="1"/>'; }).join("") + "</cols>" : "") +
      "<sheetData>" + rows.map(function (r, ri) {
        return '<row r="' + (ri + 1) + '">' + r.map(function (val, ci) {
          if (val == null || val === "") return "";
          return '<c r="' + col(ci) + (ri + 1) + '" t="inlineStr"' + (ri === 0 ? ' s="1"' : ' s="2"') + '><is><t xml:space="preserve">' + x(val) + "</t></is></c>";
        }).join("") + "</row>";
      }).join("") + "</sheetData></worksheet>";
  }
  // sheets: [{name, rows:[[...], ...]}] → Blob
  function write(sheets) {
    var ns = 'xmlns="http://schemas.openxmlformats.org/package/2006/relationships"';
    var files = [
      { name: "[Content_Types].xml", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + sheets.map(function (_, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join("") + "</Types>" },
      { name: "_rels/.rels", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships ' + ns + '><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: "xl/workbook.xml", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sheets.map(function (s, i) { return '<sheet name="' + x(String(s.name).replace(/[\\\/?*\[\]:]/g, " ").slice(0, 31)) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join("") + "</sheets></workbook>" },
      { name: "xl/_rels/workbook.xml.rels", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships ' + ns + ">" + sheets.map(function (_, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join("") + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      // 0: 기본, 1: 머리글(굵게·배경·글자 서식), 2: 본문(글자 서식 @ → 엑셀에서 고쳐 써도 글자로 유지)
      { name: "xl/styles.xml", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="맑은 고딕"/></font><font><b/><sz val="11"/><name val="맑은 고딕"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8EEF5"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="49" fontId="1" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>' }
    ];
    sheets.forEach(function (s, i) { files.push({ name: "xl/worksheets/sheet" + (i + 1) + ".xml", data: sheetXml(s.rows) }); });
    return zip(files);
  }

  /* ---------- 읽기 ---------- */
  function xml(t) { return new DOMParser().parseFromString(t, "application/xml"); }
  function all(el, tag) { return Array.prototype.slice.call(el.getElementsByTagNameNS("*", tag)); }
  function texts(el) { return all(el, "t").map(function (t) { return t.textContent; }).join(""); }
  function colIdx(ref) { var m = /^([A-Z]+)/.exec(ref || ""); if (!m) return -1; var n = 0; for (var i = 0; i < m[1].length; i++) n = n * 26 + m[1].charCodeAt(i) - 64; return n - 1; }
  // File|ArrayBuffer → [{name, rows:[[...]]}]
  async function read(file) {
    var buf = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
    var z = await unzip(buf);
    var wbXml = await z.text("xl/workbook.xml"); if (!wbXml) throw new Error("엑셀(.xlsx) 파일이 아닙니다.");
    var rels = {}, relXml = await z.text("xl/_rels/workbook.xml.rels");
    if (relXml) all(xml(relXml), "Relationship").forEach(function (r) { var t = r.getAttribute("Target"); rels[r.getAttribute("Id")] = t.charAt(0) === "/" ? t.slice(1) : "xl/" + t; });
    var sst = [], sstXml = await z.text("xl/sharedStrings.xml");
    if (sstXml) sst = all(xml(sstXml), "si").map(texts);
    var out = [];
    for (var sh of all(xml(wbXml), "sheet")) {
      var rid = sh.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") || sh.getAttribute("r:id");
      var path = rels[rid]; if (!path || !z.has(path)) continue;
      var rows = [], d = xml(await z.text(path));
      all(d, "row").forEach(function (r, ri) {
        var rn = parseInt(r.getAttribute("r"), 10) || ri + 1, row = [];
        all(r, "c").forEach(function (c, ci) {
          var t = c.getAttribute("t"), idx = colIdx(c.getAttribute("r")); if (idx < 0) idx = ci;
          var vEl = all(c, "v")[0], val;
          if (t === "s") val = sst[+(vEl && vEl.textContent)] || "";
          else if (t === "inlineStr") val = texts(c);
          else if (t === "b") val = vEl && vEl.textContent === "1" ? "TRUE" : "FALSE";
          else val = vEl ? vEl.textContent : "";
          row[idx] = val;
        });
        for (var i = 0; i < row.length; i++) if (row[i] == null) row[i] = "";
        rows[rn - 1] = row;
      });
      for (var i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
      out.push({ name: sh.getAttribute("name"), rows: rows });
    }
    return out;
  }
  // 엑셀 날짜 일련번호 → Date (UTC)
  function serialToDate(n) { return new Date(Date.UTC(1899, 11, 30) + Math.round(+n * 86400000)); }

  window.XLSXLite = { write: write, read: read, serialToDate: serialToDate };
})();
