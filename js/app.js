(function(){
"use strict";
/* ---------- 상수 ---------- */
const COLS=["순번","등록일","사업장명","사업자번호","대표자명","계약유지상태","최초계약일","최근재계약일","업무담당자명","업무담당자 연락처","사업장 코드","원가중심점","급여관련특이사항","경영지원본부 인사담당자","소속부서","사업부담당자","사업부담당자 연락처","CRM 전화응대 담당자","전화 응대 연락처","급여/총무 담당자","급여 총무 연락처","청구 급여 업무 담당자","근태/연차 관리 담당자","급여일","급여산정 시작일","급여산정 종료일","파견/도급구분","사업장 주소지(실근무지)","업무내용","계약형태 (도급, I/H, F/O, 파견)","업무형태 (I/B,O/B,파견 등)","청구형태 (인원, 콜, 업무도급, 성과유지 등)","퇴직금 적립방식","퇴직금적립방식 변경사항 (발생대상 사업장만 작성)","연차수당 적립방식","신원보증보험","근로자의날 선물 여부","계약시작일 (재계약일)","직접비율","매출비 품의","월청구분 당사입금일","퇴직연금DC사업장 근로계약 필수 작성시기","기타","특이사항","사업장명 변경 전(2024-12)","생일축하금 (금액기재)","설,추석 선물 여부","산재개시번호"];
const NAME="사업장명";
const BASIC=["사업자번호",NAME,"대표자명","계약유지상태","최초계약일","최근재계약일","업무담당자명","업무담당자 연락처"];
// 화면에 보이는 이름만 바꿈 (저장 데이터·엑셀 열 이름은 그대로)
const LABELS={"사업장 코드":"BMP 사업장 코드"};
const lbl=k=>LABELS[k]||k;
const CONTRACT_STATES=["계약","종료"];
const DATE_COLS=["최초계약일","최근재계약일"];
const GROUPS={
  "기본":["사업장 코드","원가중심점","소속부서","파견/도급구분","업무내용","급여일","경영지원본부 인사담당자"],
  "업무담당자":["소속부서","사업부담당자","사업부담당자 연락처","CRM 전화응대 담당자","전화 응대 연락처","급여/총무 담당자","급여 총무 연락처","청구 급여 업무 담당자","근태/연차 관리 담당자","경영지원본부 인사담당자"],
  "계약·청구":["파견/도급구분","계약형태 (도급, I/H, F/O, 파견)","업무형태 (I/B,O/B,파견 등)","청구형태 (인원, 콜, 업무도급, 성과유지 등)","계약시작일 (재계약일)","직접비율","매출비 품의","월청구분 당사입금일","사업장 주소지(실근무지)","산재개시번호"],
  "급여":["급여일","급여산정 시작일","급여산정 종료일","급여관련특이사항","퇴직금 적립방식","퇴직금적립방식 변경사항 (발생대상 사업장만 작성)","연차수당 적립방식","퇴직연금DC사업장 근로계약 필수 작성시기"],
  "복리후생":["신원보증보험","근로자의날 선물 여부","생일축하금 (금액기재)","설,추석 선물 여부"],
  "비고":["기타","특이사항","사업장명 변경 전(2024-12)","등록일","순번"],
  "전체":COLS.filter(c=>c!==NAME)
};
const FILTERS=[["경영지원본부 인사담당자","인사담당자"],["소속부서","소속부서"],["파견/도급구분","파견/도급"],["계약형태 (도급, I/H, F/O, 파견)","계약형태"],["급여일","급여일"],["퇴직금 적립방식","퇴직금 적립"]];
const ISSUE_TYPES=["임금·체불","근로시간·연장","휴가·휴직","징계·해고","직장 내 괴롭힘","산업재해","퇴직금·연금","근로계약","4대보험","기타"];
const STATUSES=["접수","진행중","완료"];
const RISKS=["높음","보통","낮음"];
const NOTE_TYPES=["수당","공제","소급·정산","입·퇴사","휴직·복직","청구","기타"];
const DEFAULT_WAGE=[
  ["기본급",true,"고정","매월"],["직책수당",true,"고정","매월"],["자격수당",true,"고정","매월"],["근속수당",true,"고정","매월"],
  ["식대",false,"고정","매월"],["교통비",false,"실비","매월"],["가족수당",false,"고정","매월"],["정기상여금",true,"고정","분기"],
  ["성과급",false,"변동","연"],["연장·야간·휴일근로수당",false,"변동","매월"]];

/* ---------- 상태 ---------- */
const S={view:"home",sites:[],issues:[],notes:[],wages:{},wagenotes:{},loaded:{sites:false,issues:false,notes:false,wages:false,wagenotes:false},
  siteF:{q:"",group:"기본",sort:null,dir:1},siteSel:{},issueF:{status:"",site:"",type:"",risk:""},noteF:{month:"",site:""},
  wSite:"",wDraft:null,wDirty:false,wnSite:"",wnDraft:null,wnDirty:false,drawer:null,dTab:"info",dEdit:false};
let db=null,user=null,uid=null,dl=null,readOnly=false;
const names={};
try{const v=localStorage.getItem("wv-view");if(v)S.view=v;const g=localStorage.getItem("wv-group");if(g&&GROUPS[g])S.siteF.group=g;}catch(e){}

/* ---------- 유틸 ---------- */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const today=()=>{const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)};
const thisMonth=()=>today().slice(0,7);
const won=n=>(Math.round(+n||0)).toLocaleString("ko-KR");
const siteName=id=>{const s=S.sites.find(x=>x.id===id);return s?(s.f[NAME]||"(이름 없음)"):"(삭제된 사업장)"};
const sitesSorted=()=>S.sites.slice().sort((a,b)=>(a.order??999)-(b.order??999));
function toast(m){const t=document.createElement("div");t.className="toast";t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2200)}
function err(e){console.error(e);if(e&&e.code==="invalid_argument"){readOnly=true;toast("이 화면에서는 저장 권한이 없습니다. 보기 전용으로 전환합니다.");render();return}
  if(e&&e.code==="quota_exceeded"){toast("저장 공간이 가득 찼습니다. 오래된 기록을 삭제한 뒤 다시 시도하세요.");return}
  toast("저장하지 못했습니다. 잠시 후 다시 시도하세요.")}
function hl(text,q){const t=esc(text);if(!q)return t;const i=t.toLowerCase().indexOf(esc(q).toLowerCase());if(i<0)return t;const n=esc(q).length;return t.slice(0,i)+"<mark>"+t.slice(i,i+n)+"</mark>"+t.slice(i+n)}
function armDelete(btn,fn){if(btn.classList.contains("arm")){fn();return}btn.classList.add("arm");const o=btn.textContent;btn.textContent="한 번 더 눌러 삭제";setTimeout(()=>{btn.classList.remove("arm");btn.textContent=o},3000)}
function siteOptions(sel,withAll,allLabel){const v=sel.value;sel.innerHTML=(withAll?`<option value="">${allLabel||"전체 사업장"}</option>`:`<option value="">사업장 선택</option>`)+sitesSorted().map(s=>`<option value="${esc(s.id)}">${esc(s.f[NAME]||"")}${s.f["사업장 코드"]?" · "+esc(s.f["사업장 코드"]):""}</option>`).join("");if([...sel.options].some(o=>o.value===v))sel.value=v}
async function fillNames(){if(!user||!user.profiles)return;const ids=[...new Set($$("[data-uid]").map(e=>e.dataset.uid).filter(Boolean))];if(!ids.length)return;
  try{const ps=await user.profiles(ids);ids.forEach(id=>{names[id]=(ps&&ps[id]&&ps[id].name)||"";});}catch(e){}
  $$("[data-uid]").forEach(e=>{e.textContent=names[e.dataset.uid]||"작성자"})}
const who=id=>id?`<span data-uid="${esc(id)}">${esc(names[id]||(String(id).includes("@")?String(id).split("@")[0]:"작성자"))}</span>`:"";

/* ---------- 내비 ---------- */
$("#nav").addEventListener("click",e=>{const b=e.target.closest("button[data-v]");if(!b)return;go(b.dataset.v)});
function go(v,opt){S.view=v;try{localStorage.setItem("wv-view",v)}catch(e){}if(opt)Object.assign(S,opt);render();window.scrollTo(0,0)}
function counts(){$("#c-sites").textContent=S.sites.length;$("#c-issues").textContent=S.issues.filter(i=>i.status!=="완료").length;
  $("#c-notes").textContent=S.notes.filter(n=>n.month===thisMonth()).length;$("#c-wages").textContent=Object.keys(S.wages).length;
  $$("#nav button").forEach(b=>b.setAttribute("aria-current",b.dataset.v===S.view?"page":"false"))}

/* ---------- 렌더 ---------- */
function render(){counts();const m=$("#main");
  const banner=readOnly?`<div class="banner">보기 전용입니다.</div>`:"";
  m.innerHTML=banner+({home:vHome,sites:vSites,issues:vIssues,notes:vNotes,wages:vWages}[S.view]||vHome)();
  ({home:()=>{},sites:bindSites,issues:bindIssues,notes:bindNotes,wages:bindWages}[S.view]||(()=>{}))();
  fillNames();renderDrawer()}
function refresh(){counts();({home:()=>render(),sites:refSites,issues:refIssues,notes:refNotes,wages:refWages}[S.view]||render)();if(S.drawer)renderDrawer();fillNames()}

/* ===== 홈 ===== */
function vHome(){const n=S.sites.length,open=S.issues.filter(i=>i.status!=="완료"),mon=S.notes.filter(x=>x.month===thisMonth()),wc=Object.keys(S.wages).length;
  const by=(k)=>{const m={};S.sites.forEach(s=>{const v=(s.f[k]||"미기재").trim();m[v]=(m[v]||0)+1});return Object.entries(m).sort((a,b)=>b[1]-a[1])};
  const bars=(arr,suf="",colorOf)=>{const mx=Math.max(1,...arr.map(a=>a[1]));return `<div class="bars">${arr.map(([k,c])=>`<div class="r"><span title="${esc(k)}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(k)}${suf}</span><span class="t"><i style="width:${c/mx*100}%${colorOf?`;background:${colorOf(k)}`:""}"></i></span><span class="c">${c}</span></div>`).join("")}</div>`};
  const riskColor=r=>r==="높음"?"var(--bad)":r==="보통"?"var(--warn)":"var(--ok)";
  const byRisk=RISKS.map(r=>[r,open.filter(i=>i.risk===r).length]);
  const recent=S.issues.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,5);
  return `<div class="page-h"><div><h1>급여·노무 관리 홈</h1><p>사업장별 급여기초 정보, 노무 문제, 급여 특이사항, 통상임금 포함항목을 한곳에서 관리합니다.</p></div></div>
  <div class="grid g-stats" style="margin-bottom:16px">
    <button class="stat" onclick="WV.go('sites')"><span class="l">관리 사업장</span><span class="v">${n}<small>곳</small></span><span class="n">급여기초 등록 기준</span></button>
    <button class="stat" onclick="WV.go('issues')"><span class="l">미해결 노무 문제</span><span class="v" style="color:${open.length?"var(--bad)":"inherit"}">${open.length}<small>건</small></span><span class="n">${open.filter(i=>i.risk==="높음").length?`<b style="color:var(--bad)">위험 높음 ${open.filter(i=>i.risk==="높음").length}</b> · `:""}접수 ${open.filter(i=>i.status==="접수").length} · 진행중 ${open.filter(i=>i.status==="진행중").length}</span></button>
    <button class="stat" onclick="WV.go('notes')"><span class="l">${thisMonth().replace("-","년 ")}월 급여 특이사항</span><span class="v">${mon.length}<small>건</small></span><span class="n">전체 ${S.notes.length}건</span></button>
    <button class="stat" onclick="WV.go('wages')"><span class="l">통상임금 항목 설정</span><span class="v">${wc}<small>/ ${n}</small></span><span class="n">${n-wc>0?`미설정 ${n-wc}곳`:"모든 사업장 설정 완료"}</span></button>
  </div>
  <div class="grid g-2">
    <div class="card"><div class="hd"><h2>최근 노무 문제</h2><button class="btn sm" style="margin-left:auto" onclick="WV.go('issues')">전체 보기</button></div>
      ${recent.length?`<div class="list">${recent.map(issueRow).join("")}</div>`:`<div class="empty"><b>등록된 노무 문제가 없습니다</b>노무 문제 메뉴에서 사업장별 이슈를 입력하면 여기에 최근 5건이 표시됩니다.</div>`}</div>
    <div class="grid">
      <div class="card"><div class="hd"><h2>위험도별 미해결 노무 문제</h2></div><div class="bd">${open.length?bars(byRisk,"",riskColor):`<div class="muted">미해결 노무 문제가 없습니다.</div>`}</div></div>
      <div class="card"><div class="hd"><h2>급여일별 사업장</h2></div><div class="bd">${n?bars(by("급여일").map(([k,c])=>[/^\d+$/.test(k)?k+"일":k,c])):`<div class="muted">사업장 정보를 불러오는 중입니다.</div>`}</div></div>
      <div class="card"><div class="hd"><h2>인사담당자별 사업장</h2></div><div class="bd">${n?bars(by("경영지원본부 인사담당자")):`<div class="muted">—</div>`}</div></div>
      <div class="card"><div class="hd"><h2>파견 / 도급 구분</h2></div><div class="bd">${n?bars(by("파견/도급구분")):`<div class="muted">—</div>`}</div></div>
    </div>
  </div>`}

/* ===== 급여기초 ===== */
function vSites(){return `<div class="page-h"><div><h1>급여기초</h1><p>사업장별 급여·계약·담당자 정보입니다. 조건을 조합해 필터링하고, 행을 누르면 상세 정보와 해당 사업장의 노무 문제·특이사항·통상임금을 함께 볼 수 있습니다.</p></div>
  <div class="act"><button class="btn" id="csv" hidden>필터 결과 CSV 저장</button><button class="btn pri" id="addSite" ${!db||readOnly?"disabled":""}>사업장 추가</button></div></div>
  <div class="card">
    <div class="bd" style="border-bottom:1px solid var(--line)"><div class="filters">
      <label class="f q">전체 검색<input class="i" id="sq" type="search" placeholder="사업장명, 담당자, 주소, 특이사항 등" value="${esc(S.siteF.q)}"></label>
      ${FILTERS.map(([k,l],i)=>`<label class="f">${esc(l)}<select class="i" id="sf${i}" data-k="${esc(k)}"></select></label>`).join("")}
    </div></div>
    <div class="toolbar"><span class="count" id="scount"></span><span class="chips" id="groups">${Object.keys(GROUPS).map(g=>`<button class="chip" data-g="${esc(g)}" aria-pressed="${g===S.siteF.group}">${esc(g)}</button>`).join("")}</span>
      <button class="btn sm" id="sreset" style="margin-left:auto">필터 초기화</button></div>
    <div class="tbl-wrap"><table class="sitetbl"><thead id="shead"></thead><tbody id="sbody"></tbody></table></div>
  </div>`}
function siteFiltered(){const q=S.siteF.q.trim().toLowerCase();return sitesSorted().filter(s=>{
  for(const [k] of FILTERS){const v=S.siteSel[k];if(v&&((s.f[k]||"미기재").trim()!==v))return false}
  if(q&&!Object.values(s.f).some(v=>String(v).toLowerCase().includes(q)))return false;return true})}
function bindSites(){$("#sq").addEventListener("input",e=>{S.siteF.q=e.target.value;refSites()});
  FILTERS.forEach((_,i)=>$("#sf"+i).addEventListener("change",e=>{S.siteSel[e.target.dataset.k]=e.target.value;refSites()}));
  $("#groups").addEventListener("click",e=>{const b=e.target.closest("[data-g]");if(!b)return;S.siteF.group=b.dataset.g;try{localStorage.setItem("wv-group",b.dataset.g)}catch(x){}$$("#groups .chip").forEach(c=>c.setAttribute("aria-pressed",c===b));refSites()});
  $("#sreset").addEventListener("click",()=>{S.siteF.q="";S.siteSel={};$("#sq").value="";refSites()});
  $("#shead").addEventListener("click",e=>{const th=e.target.closest("th[data-k]");if(!th)return;const k=th.dataset.k;if(S.siteF.sort===k)S.siteF.dir*=-1;else{S.siteF.sort=k;S.siteF.dir=1}refSites()});
  $("#sbody").addEventListener("click",e=>{const tr=e.target.closest("tr[data-id]");if(tr)openDrawer(tr.dataset.id)});
  $("#addSite").addEventListener("click",()=>{S.drawer="__new";S.dEdit=true;S.dTab="info";renderDrawer()});
  if(dl){const b=$("#csv");b.hidden=false;b.addEventListener("click",saveCsv)}
  refSites()}
function refSites(){if(!$("#sbody"))return;
  FILTERS.forEach(([k,l],i)=>{const sel=$("#sf"+i);const vals=[...new Set(S.sites.map(s=>(s.f[k]||"미기재").trim()))].sort((a,b)=>a.localeCompare(b,"ko",{numeric:true}));
    sel.innerHTML=`<option value="">전체</option>`+vals.map(v=>`<option>${esc(v)}</option>`).join("");sel.value=S.siteSel[k]||"";if(sel.value!==(S.siteSel[k]||""))S.siteSel[k]=""});
  let rows=siteFiltered();const cols=GROUPS[S.siteF.group];
  if(S.siteF.sort){const k=S.siteF.sort,d=S.siteF.dir;rows.sort((a,b)=>String(a.f[k]||"").localeCompare(String(b.f[k]||""),"ko",{numeric:true})*d)}
  const active=Object.values(S.siteSel).filter(Boolean).length+(S.siteF.q?1:0);
  $("#scount").innerHTML=`<b>${rows.length}</b> / ${S.sites.length}곳 ${active?`· 조건 ${active}개 적용`:""}`;
  const arrow=k=>S.siteF.sort===k?(S.siteF.dir>0?" ▲":" ▼"):"";
  $("#shead").innerHTML=`<tr>${[NAME,...cols].map(k=>`<th data-k="${esc(k)}" class="${S.siteF.sort===k?"sorted":""}">${esc(lbl(k))}${arrow(k)}</th>`).join("")}</tr>`;
  const q=S.siteF.q.trim();const mono=k=>/코드|연락처|급여일|산정|번호|등록일|계약시작일|순번/.test(k);
  $("#sbody").innerHTML=rows.length?rows.map(s=>`<tr data-id="${esc(s.id)}"><td>${hl(s.f[NAME]||"(이름 없음)",q)}</td>${cols.map(k=>`<td class="${mono(k)?"mono":""}">${hl(s.f[k]||"",q)}</td>`).join("")}</tr>`).join("")
    :`<tr><td colspan="${cols.length+1}"><div class="empty"><b>${S.sites.length?"조건에 맞는 사업장이 없습니다":"사업장 정보가 아직 없습니다"}</b>${S.sites.length?"필터를 줄이거나 초기화해 보세요.":"‘사업장 추가’로 첫 사업장을 등록하세요."}</div></td></tr>`}
function sitesCsv(rows){const q=v=>`"${String(v??"").replace(/"/g,'""')}"`;
  return "﻿"+COLS.map(q).join(",")+"\n"+rows.map(s=>COLS.map(k=>q(s.f[k])).join(",")).join("\n")}
async function saveCsv(){const csv=sitesCsv(siteFiltered());
  try{await dl.save({filename:`급여기초_${today()}.csv`,data:new Blob([csv],{type:"text/csv;charset=utf-8"})})}catch(e){}}

/* ===== 사업장 상세 드로어 ===== */
function openDrawer(id){S.drawer=id;S.dTab="info";S.dEdit=false;renderDrawer()}
function closeDrawer(){S.drawer=null;S.dEdit=false;renderDrawer()}
function renderDrawer(){const root=$("#drawer-root");if(!S.drawer){root.innerHTML="";return}
  const isNew=S.drawer==="__new";const s=isNew?{id:"__new",f:{}}:S.sites.find(x=>x.id===S.drawer);if(!s){root.innerHTML="";S.drawer=null;return}
  if(S.dEdit&&root.querySelector("#siteForm"))return; // 편집 중엔 입력값 보존
  const iss=S.issues.filter(i=>i.siteId===s.id),nts=S.notes.filter(n=>n.siteId===s.id),w=S.wages[s.id];
  const tabs=[["info","기본 정보"],["issues",`노무 문제 ${iss.length}`],["notes",`급여 특이사항 ${nts.length}`],["wages","통상임금"]];
  let body="";
  if(S.dEdit){body=`<form id="siteForm" class="form">${COLS.map((k,i)=>{if(k==="계약유지상태")return `<div class="f"><span>${esc(lbl(k))}</span><span class="cbox">${CONTRACT_STATES.map(v=>`<label><input type="checkbox" data-k="${esc(k)}" value="${esc(v)}" ${s.f[k]===v?"checked":""}>${esc(v)}</label>`).join("")}</span></div>`;
    if(DATE_COLS.includes(k))return `<label class="f">${esc(lbl(k))}<input class="i" type="date" id="sfld${i}" data-k="${esc(k)}" value="${esc(s.f[k]||"")}"></label>`;const long=/주소|특이사항|기타|업무내용/.test(k);return `<label class="f">${esc(lbl(k))}${long?`<textarea class="i" id="sfld${i}" data-k="${esc(k)}" rows="2">${esc(s.f[k]||"")}</textarea>`:`<input class="i" id="sfld${i}" data-k="${esc(k)}" value="${esc(s.f[k]||"")}" ${k===NAME?"required":""}>`}</label>`}).join("")}
    <div style="display:flex;gap:8px;position:sticky;bottom:0;background:var(--surface);padding-block:10px"><button class="btn pri" type="submit">저장</button><button class="btn" type="button" id="dCancel">취소</button>${isNew?"":`<button class="btn danger" type="button" id="dDel" style="margin-left:auto">사업장 삭제</button>`}</div></form>`}
  else if(S.dTab==="info"){const sec=(t,ks)=>`<section><h3 class="sec-t">${esc(t)}</h3><dl class="kv">${ks.map(k=>`<dt>${esc(lbl(k))}</dt><dd class="${/연락처|코드|번호/.test(k)?"mono":""}">${k==="계약유지상태"&&s.f[k]?`<span class="pill ${s.f[k]==="계약"?"p-acc":"p-neutral"}">${esc(s.f[k])}</span>`:esc(s.f[k]||"—")}</dd>`).join("")}</dl></section>`;
    const used=new Set();const out=["업무담당자","계약·청구","급여","복리후생","비고"].map(g=>{const ks=GROUPS[g].filter(k=>!used.has(k));ks.forEach(k=>used.add(k));return sec(g,ks)});
    out.unshift(sec("기본",[...BASIC,...["사업장 코드","원가중심점","업무내용"].filter(k=>!used.has(k))]));
    const extra=Object.keys(s.f).filter(k=>!COLS.includes(k));if(extra.length)out.push(sec("추가 항목",extra));body=out.join("")}
  else if(S.dTab==="issues"){body=`<div style="display:flex;justify-content:flex-end"><button class="btn sm pri" onclick="WV.go('issues',{issuePre:'${esc(s.id)}'});WV.close()">이 사업장 노무 문제 입력</button></div>`+(iss.length?`<div class="card list">${iss.sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(issueRow).join("")}</div>`:`<div class="empty"><b>등록된 노무 문제가 없습니다</b></div>`)}
  else if(S.dTab==="notes"){const base=[["급여관련특이사항",s.f["급여관련특이사항"]],["특이사항",s.f["특이사항"]],["기타",s.f["기타"]]].filter(x=>x[1]);
    body=(base.length?`<section><h3 class="sec-t">급여기초 자료의 특이사항</h3><dl class="kv">${base.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl></section>`:"")+
    `<div style="display:flex;justify-content:flex-end"><button class="btn sm pri" onclick="WV.go('notes',{notePre:'${esc(s.id)}'});WV.close()">이 사업장 특이사항 입력</button></div>`+(nts.length?`<div class="card list">${nts.sort((a,b)=>(b.month||"").localeCompare(a.month||"")).map(noteRow).join("")}</div>`:`<div class="empty"><b>월별 급여 특이사항이 없습니다</b></div>`)}
  else{body=w&&w.items&&w.items.length?`<table class="wtbl"><thead><tr><th>항목</th><th>통상임금</th><th>성격</th><th>주기</th><th style="text-align:right">월 환산액</th></tr></thead><tbody>${w.items.map(it=>`<tr><td>${esc(it.name)}</td><td>${it.inc?'<span class="pill p-acc">포함</span>':'<span class="pill p-neutral">제외</span>'}</td><td>${esc(it.kind)}</td><td>${esc(it.cycle)}</td><td class="mono" style="text-align:right">${it.amount?won(it.amount):"—"}</td></tr>`).join("")}</tbody></table>
    <div class="note">통상임금 월 합계 <b class="mono">${won(wageSum(w.items))}원</b> · 월 소정근로 ${esc(w.hours||209)}시간 기준 통상시급 <b class="mono">${won(wageSum(w.items)/(+w.hours||209))}원</b></div>
    <div><button class="btn sm" onclick="WV.go('wages',{wSite:'${esc(s.id)}',wDraft:null,wDirty:false});WV.close()">통상임금 항목 수정</button></div>`
    :`<div class="empty"><b>통상임금 포함항목이 설정되지 않았습니다</b><button class="btn sm pri" style="margin-top:10px" onclick="WV.go('wages',{wSite:'${esc(s.id)}',wDraft:null,wDirty:false});WV.close()">지금 설정하기</button></div>`}
  root.innerHTML=`<div class="drawer-bg" id="dBg"></div><div class="drawer" role="dialog" aria-modal="true" aria-label="사업장 상세">
    <div class="dh"><div style="min-width:0"><div class="tiny muted mono">${esc(s.f["사업장 코드"]?"코드 "+s.f["사업장 코드"]:"")} ${esc(s.f["소속부서"]||"")}</div><h2>${isNew?"새 사업장":esc(s.f[NAME]||"(이름 없음)")}</h2>
      <div class="chips" style="margin-top:6px">${s.f["파견/도급구분"]?`<span class="pill p-neutral">${esc(s.f["파견/도급구분"])}</span>`:""}${s.f["급여일"]?`<span class="pill p-neutral">급여일 ${esc(s.f["급여일"])}${/^\d+$/.test(s.f["급여일"])?"일":""}</span>`:""}${iss.filter(i=>i.status!=="완료").length?`<span class="pill p-open">미해결 노무 ${iss.filter(i=>i.status!=="완료").length}</span>`:""}</div></div>
      <div style="margin-left:auto;display:flex;gap:6px">${!S.dEdit&&!readOnly&&db?`<button class="btn sm" id="dEdit">정보 수정</button>`:""}<button class="btn sm" id="dClose" aria-label="닫기">닫기</button></div></div>
    ${S.dEdit?"":`<div class="tabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" data-t="${k}" aria-selected="${S.dTab===k}">${esc(l)}</button>`).join("")}</div>`}
    <div class="db">${body}</div></div>`;
  $("#dBg").onclick=closeDrawer;$("#dClose").onclick=closeDrawer;
  const ed=$("#dEdit");if(ed)ed.onclick=()=>{S.dEdit=true;root.innerHTML="";renderDrawer()};
  $$(".drawer .tabs button").forEach(b=>b.onclick=()=>{S.dTab=b.dataset.t;renderDrawer()});
  const f=$("#siteForm");if(f){f.addEventListener("submit",async e=>{e.preventDefault();const nf={};$$("[data-k]",f).forEach(el=>{if(el.type==="checkbox"&&!el.checked)return;const v=el.value.trim();if(v)nf[el.dataset.k]=v});
      const id=isNew?"s"+Date.now().toString(36):s.id;const order=isNew?(Math.max(0,...S.sites.map(x=>x.order||0))+1):(s.order||0);
      try{await db.doc("sites/"+id).set({order,f:nf,source:s.source||"직접 입력",updatedAt:new Date().toISOString(),updatedBy:uid||""});toast("저장했습니다");S.dEdit=false;S.drawer=id;$("#drawer-root").innerHTML="";renderDrawer()}catch(x){err(x)}});
    $$('input[type=checkbox][data-k="계약유지상태"]',f).forEach(cb=>cb.onchange=()=>{if(cb.checked)$$('input[type=checkbox][data-k="계약유지상태"]',f).forEach(o=>{if(o!==cb)o.checked=false})});
    $("#dCancel").onclick=()=>{S.dEdit=false;root.innerHTML="";if(isNew)S.drawer=null;renderDrawer()};
    const del=$("#dDel");if(del)del.onclick=()=>armDelete(del,async()=>{try{await db.doc("sites/"+s.id).delete();toast("사업장을 삭제했습니다");S.dEdit=false;closeDrawer()}catch(x){err(x)}})}
  fillNames()}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&S.drawer&&!S.dEdit)closeDrawer()});

/* ===== 노무 문제 ===== */
function riskPill(r){const k=RISKS.indexOf(r);return k<0?"":`<span class="pill rk rk-${k}" title="위험도">위험 ${esc(r)}</span>`}
function issueRow(i){return `<div class="item s-${esc(i.status)}"><span class="bar"></span><div style="min-width:0">
  <div class="meta"><span class="pill ${i.status==="완료"?"p-done":i.status==="진행중"?"p-prog":"p-open"}">${esc(i.status)}</span>${riskPill(i.risk)}<b style="color:var(--ink)">${esc(siteName(i.siteId))}</b><span>${esc(i.type)}</span><span class="mono">${esc(i.date)}</span>${i.owner?`<span>담당 ${esc(i.owner)}</span>`:""}</div>
  <h3>${esc(i.title)}</h3>${i.content?`<p>${esc(i.content)}</p>`:""}${i.result?`<p class="tiny" style="margin-top:6px;color:var(--ok)">처리 결과 · ${esc(i.result)}</p>`:""}
  </div>
  ${S.view==="issues"&&db&&!readOnly?`<div class="side"><select class="i" style="width:auto;padding:3px 8px;font-size:12px" data-st="${esc(i.id)}" aria-label="처리상태">${STATUSES.map(s=>`<option ${s===i.status?"selected":""}>${s}</option>`).join("")}</select><button class="btn sm" data-ed="${esc(i.id)}">수정</button><button class="btn sm danger" data-del="${esc(i.id)}">삭제</button></div>`:""}</div>`}
function vIssues(){return `<div class="page-h"><div><h1>노무 문제</h1><p>사업장별 노무 이슈를 접수하고 처리 상태를 관리합니다.</p></div></div>
  <div class="grid g-form">
    <div class="card"><div class="hd"><h2 id="iFormT">노무 문제 입력</h2></div><div class="bd"><form class="form" id="iForm">
      <label class="f">사업장<select class="i" id="iSite" required></select></label>
      <div class="row2"><label class="f">발생일<input class="i" type="date" id="iDate" value="${today()}" required></label><label class="f">유형<select class="i" id="iType">${ISSUE_TYPES.map(t=>`<option>${t}</option>`).join("")}</select></label></div>
      <label class="f">제목<input class="i" id="iTitle" required placeholder="예) 연장근로수당 미지급 문의"></label>
      <label class="f">내용<textarea class="i" id="iContent" rows="4" placeholder="경위, 관련 직원, 요구사항 등"></textarea></label>
      <div class="row2"><label class="f">위험도<select class="i" id="iRisk">${RISKS.map(r=>`<option ${r==="보통"?"selected":""}>${r}</option>`).join("")}</select></label><label class="f">처리상태<select class="i" id="iStatus">${STATUSES.map(s=>`<option>${s}</option>`).join("")}</select></label></div>
      <label class="f">담당자<input class="i" id="iOwner" placeholder="예) 배유진"></label>
      <label class="f">처리 결과 / 조치<textarea class="i" id="iResult" rows="2" placeholder="완료 시 결과를 남겨 주세요"></textarea></label>
      <div style="display:flex;gap:8px"><button class="btn pri" type="submit" id="iSubmit" ${!db||readOnly?"disabled":""}>등록</button><button class="btn" type="button" id="iCancel" hidden>수정 취소</button></div>
    </form></div></div>
    <div class="card"><div class="toolbar">
      <select class="i" id="ifSite" style="width:auto;max-width:220px"></select>
      <select class="i" id="ifType" style="width:auto"><option value="">전체 유형</option>${ISSUE_TYPES.map(t=>`<option>${t}</option>`).join("")}</select>
      <select class="i" id="ifRisk" style="width:auto"><option value="">전체 위험도</option>${RISKS.map(r=>`<option>${r}</option>`).join("")}</select>
      <span class="chips" id="ifStatus">${["",...STATUSES].map(s=>`<button class="chip" data-s="${s}" aria-pressed="${S.issueF.status===s}">${s||"전체"}</button>`).join("")}</span>
      <span class="count" id="icount" style="margin-left:auto"></span></div>
      <div class="list" id="ilist"></div></div>
  </div>`}
let iEditing=null;
function bindIssues(){siteOptions($("#iSite"),false);siteOptions($("#ifSite"),true);
  if(S.issuePre){$("#iSite").value=S.issuePre;S.issueF.site=S.issuePre;S.issuePre=null}
  $("#ifSite").value=S.issueF.site;$("#ifType").value=S.issueF.type;$("#ifRisk").value=S.issueF.risk;
  $("#ifRisk").onchange=e=>{S.issueF.risk=e.target.value;refIssues()};
  $("#ifSite").onchange=e=>{S.issueF.site=e.target.value;refIssues()};$("#ifType").onchange=e=>{S.issueF.type=e.target.value;refIssues()};
  $("#ifStatus").onclick=e=>{const b=e.target.closest("[data-s]");if(!b)return;S.issueF.status=b.dataset.s;$$("#ifStatus .chip").forEach(c=>c.setAttribute("aria-pressed",c===b));refIssues()};
  $("#iForm").addEventListener("submit",async e=>{e.preventDefault();const d={siteId:$("#iSite").value,date:$("#iDate").value,type:$("#iType").value,title:$("#iTitle").value.trim(),content:$("#iContent").value.trim(),status:$("#iStatus").value,risk:$("#iRisk").value,owner:$("#iOwner").value.trim(),result:$("#iResult").value.trim(),updatedAt:new Date().toISOString()};
    if(!d.siteId){toast("사업장을 선택하세요");return}
    try{if(iEditing){const o=S.issues.find(x=>x.id===iEditing)||{};await db.doc("issues/"+iEditing).set({...strip(o),...d});toast("수정했습니다")}else{await db.collection("issues").add({...d,by:uid||"",createdAt:d.updatedAt});toast("등록했습니다")}
      resetIssueForm()}catch(x){err(x)}});
  $("#iCancel").onclick=resetIssueForm;
  $("#ilist").addEventListener("change",async e=>{const s=e.target.closest("[data-st]");if(!s)return;try{await db.doc("issues/"+s.dataset.st).update({status:s.value,updatedAt:new Date().toISOString()});toast("상태를 ‘"+s.value+"’(으)로 바꿨습니다")}catch(x){err(x)}});
  $("#ilist").addEventListener("click",e=>{const d=e.target.closest("[data-del]");if(d){armDelete(d,async()=>{try{await db.doc("issues/"+d.dataset.del).delete();toast("삭제했습니다")}catch(x){err(x)}});return}
    const ed=e.target.closest("[data-ed]");if(ed){const i=S.issues.find(x=>x.id===ed.dataset.ed);if(!i)return;iEditing=i.id;$("#iSite").value=i.siteId;$("#iDate").value=i.date||"";$("#iType").value=i.type;$("#iTitle").value=i.title||"";$("#iContent").value=i.content||"";$("#iStatus").value=i.status;$("#iRisk").value=RISKS.includes(i.risk)?i.risk:"보통";$("#iOwner").value=i.owner||"";$("#iResult").value=i.result||"";$("#iFormT").textContent="노무 문제 수정";$("#iSubmit").textContent="수정 저장";$("#iCancel").hidden=false;$("#iTitle").focus()}});
  refIssues()}
function strip(o){const c={...o};delete c.id;return c}
function resetIssueForm(){iEditing=null;const f=$("#iForm");if(!f)return;const site=$("#iSite").value;f.reset();$("#iSite").value=site;$("#iDate").value=today();$("#iFormT").textContent="노무 문제 입력";$("#iSubmit").textContent="등록";$("#iCancel").hidden=true}
const rIdx=i=>{const k=RISKS.indexOf(i.risk);return k<0?1:k};
function refIssues(){if(!$("#ilist"))return;siteOptions($("#iSite"),false);siteOptions($("#ifSite"),true);
  const F=S.issueF;const rows=S.issues.filter(i=>(!F.site||i.siteId===F.site)&&(!F.type||i.type===F.type)&&(!F.status||i.status===F.status)&&(!F.risk||i.risk===F.risk)).sort((a,b)=>(STATUSES.indexOf(a.status)-STATUSES.indexOf(b.status))||(rIdx(a)-rIdx(b))||(b.date||"").localeCompare(a.date||""));
  $("#icount").innerHTML=`<b>${rows.length}</b>건`;
  $("#ilist").innerHTML=rows.length?rows.map(issueRow).join(""):`<div class="empty"><b>${S.issues.length?"조건에 맞는 노무 문제가 없습니다":"아직 등록된 노무 문제가 없습니다"}</b>${S.issues.length?"필터를 바꿔 보세요.":"왼쪽 양식에서 사업장, 유형, 내용을 입력해 첫 건을 등록하세요."}</div>`}

/* ===== 급여 특이사항 ===== */
function noteRow(n){return `<div class="item"><span class="bar" style="background:var(--accent)"></span><div style="min-width:0">
  <div class="meta"><span class="pill p-acc mono">${esc(n.month)}</span><b style="color:var(--ink)">${esc(siteName(n.siteId))}</b><span>${esc(n.type)}</span>${n.amount?`<span class="mono">${won(n.amount)}원</span>`:""}${n.repeat?`<span class="pill p-neutral">매월 반복</span>`:""}</div>
  <h3>${esc(n.title||"")}</h3>${n.content?`<p>${esc(n.content)}</p>`:""}</div>
  ${S.view==="notes"&&db&&!readOnly?`<div class="side"><button class="btn sm" data-ned="${esc(n.id)}">수정</button><button class="btn sm danger" data-ndel="${esc(n.id)}">삭제</button></div>`:""}</div>`}
function vNotes(){return `<div class="page-h"><div><h1>급여 특이사항</h1><p>귀속월별로 사업장의 급여 특이사항(수당 변동, 공제, 소급 정산 등)을 기록합니다. 급여기초 자료에 이미 적힌 특이사항은 아래에 함께 모아 보여 줍니다.</p></div></div>
  <div class="grid g-form">
    <div class="card"><div class="hd"><h2 id="nFormT">특이사항 입력</h2></div><div class="bd"><form class="form" id="nForm">
      <label class="f">사업장<select class="i" id="nSite" required></select></label>
      <div class="row2"><label class="f">귀속월<input class="i" type="month" id="nMonth" value="${thisMonth()}" required></label><label class="f">구분<select class="i" id="nType">${NOTE_TYPES.map(t=>`<option>${t}</option>`).join("")}</select></label></div>
      <label class="f">제목<input class="i" id="nTitle" required placeholder="예) 교육생 식대 회입"></label>
      <label class="f">내용<textarea class="i" id="nContent" rows="4" placeholder="대상자, 산정기준, 청구 반영 여부 등"></textarea></label>
      <div class="row2"><label class="f">금액(원, 선택)<input class="i" type="number" id="nAmount" min="0" step="1" placeholder="0"></label>
        <label class="f">반복<span style="display:flex;align-items:center;gap:8px;height:36px;color:var(--ink)"><input type="checkbox" class="tog" id="nRepeat">매월 반복 적용</span></label></div>
      <div style="display:flex;gap:8px"><button class="btn pri" type="submit" id="nSubmit" ${!db||readOnly?"disabled":""}>등록</button><button class="btn" type="button" id="nCancel" hidden>수정 취소</button></div>
    </form></div></div>
    <div class="grid">
      <div class="card"><div class="toolbar"><select class="i" id="nfSite" style="width:auto;max-width:220px"></select>
        <label class="f" style="flex-direction:row;align-items:center;gap:6px">귀속월<input class="i" type="month" id="nfMonth" style="width:auto" value="${esc(S.noteF.month)}"></label>
        <button class="btn sm" id="nfAll">전체 기간</button><span class="count" id="ncount" style="margin-left:auto"></span></div>
        <div class="list" id="nlist"></div></div>
      <div class="card"><div class="hd"><h2>급여기초 자료의 특이사항</h2><span class="sub">엑셀 ‘급여관련특이사항·특이사항·기타’ 열</span></div><div class="list" id="nbase"></div></div>
      <div class="card"><div class="toolbar"><label class="f" style="flex-direction:row;align-items:center;gap:8px;font-size:13px;color:var(--ink)">사업장<select class="i" id="wnSite" style="width:auto;max-width:280px"></select></label>
          <span class="tiny muted" id="wnMeta"></span><button class="btn pri" id="wnSave" style="margin-left:auto" ${!db||readOnly?"disabled":""}>저장</button></div>
        <div class="bd" style="display:flex;flex-direction:column;gap:14px">
          <section><h3 class="sec-t">통상임금 항목이나 포함하지 않는 임금항목</h3><p class="tiny muted" style="margin:2px 0 8px">임금체불에 대한 문제 발생이 있는 급여항목</p>
            <textarea class="i" id="wnOrdinary" rows="3" placeholder="사업장에서 통상임금에 포함/제외한 임금항목과 그 근거를 적어 주세요"></textarea></section>
          <section><h3 class="sec-t">퇴직금 평균임금(통상임금)이나 포함하지 않는 임금항목</h3><p class="tiny muted" style="margin:2px 0 8px">임금체불에 대한 문제 발생이 있는 급여항목</p>
            <textarea class="i" id="wnSeverance" rows="3" placeholder="퇴직금 평균임금 산정 시 포함/제외한 임금항목과 그 근거를 적어 주세요"></textarea></section>
        </div></div>
    </div>
  </div>`}
let nEditing=null;
function bindNotes(){siteOptions($("#nSite"),false);siteOptions($("#nfSite"),true);
  if(S.notePre){$("#nSite").value=S.notePre;S.noteF.site=S.notePre;S.notePre=null}
  $("#nfSite").value=S.noteF.site;
  $("#nfSite").onchange=e=>{S.noteF.site=e.target.value;refNotes()};$("#nfMonth").onchange=e=>{S.noteF.month=e.target.value;refNotes()};
  $("#nfAll").onclick=()=>{S.noteF.month="";$("#nfMonth").value="";refNotes()};
  $("#nForm").addEventListener("submit",async e=>{e.preventDefault();const d={siteId:$("#nSite").value,month:$("#nMonth").value,type:$("#nType").value,title:$("#nTitle").value.trim(),content:$("#nContent").value.trim(),amount:+$("#nAmount").value||0,repeat:$("#nRepeat").checked,updatedAt:new Date().toISOString()};
    if(!d.siteId){toast("사업장을 선택하세요");return}
    try{if(nEditing){const o=S.notes.find(x=>x.id===nEditing)||{};await db.doc("notes/"+nEditing).set({...strip(o),...d});toast("수정했습니다")}else{await db.collection("notes").add({...d,by:uid||"",createdAt:d.updatedAt});toast("등록했습니다")}resetNoteForm()}catch(x){err(x)}});
  $("#nCancel").onclick=resetNoteForm;
  $("#nlist").addEventListener("click",e=>{const d=e.target.closest("[data-ndel]");if(d){armDelete(d,async()=>{try{await db.doc("notes/"+d.dataset.ndel).delete();toast("삭제했습니다")}catch(x){err(x)}});return}
    const ed=e.target.closest("[data-ned]");if(ed){const n=S.notes.find(x=>x.id===ed.dataset.ned);if(!n)return;nEditing=n.id;$("#nSite").value=n.siteId;$("#nMonth").value=n.month;$("#nType").value=n.type;$("#nTitle").value=n.title||"";$("#nContent").value=n.content||"";$("#nAmount").value=n.amount||"";$("#nRepeat").checked=!!n.repeat;$("#nFormT").textContent="특이사항 수정";$("#nSubmit").textContent="수정 저장";$("#nCancel").hidden=false;$("#nTitle").focus()}});
  const wnSel=$("#wnSite");siteOptions(wnSel,false);if(!S.wnSite&&S.sites.length)S.wnSite=sitesSorted()[0].id;wnSel.value=S.wnSite;
  wnSel.onchange=e=>{if(S.wnDirty&&!wnSel.dataset.ok){wnSel.dataset.ok="1";toast("저장하지 않은 변경이 있습니다. 다시 선택하면 변경을 버리고 이동합니다.");wnSel.value=S.wnSite;return}delete wnSel.dataset.ok;S.wnSite=e.target.value;S.wnDraft=null;S.wnDirty=false;refWN()};
  $("#wnOrdinary").oninput=e=>{S.wnDraft=S.wnDraft||{ordinary:"",severance:""};S.wnDraft.ordinary=e.target.value;S.wnDirty=true};
  $("#wnSeverance").oninput=e=>{S.wnDraft=S.wnDraft||{ordinary:"",severance:""};S.wnDraft.severance=e.target.value;S.wnDirty=true};
  $("#wnSave").onclick=async()=>{if(!S.wnSite)return;const d=S.wnDraft||{ordinary:"",severance:""};
    try{await db.doc("wagenotes/"+S.wnSite).set({ordinary:d.ordinary||"",severance:d.severance||"",updatedAt:new Date().toISOString(),by:uid||""});S.wnDirty=false;toast("저장했습니다")}catch(x){err(x)}};
  refWN();refNotes()}
function refWN(){const sel=$("#wnSite");if(!sel)return;siteOptions(sel,false);if(!S.wnSite&&S.sites.length)S.wnSite=sitesSorted()[0].id;sel.value=S.wnSite;
  const saved=S.wagenotes[S.wnSite];
  if(!S.wnDirty||!S.wnDraft)S.wnDraft=saved?{ordinary:saved.ordinary||"",severance:saved.severance||""}:{ordinary:"",severance:""};
  const oEl=$("#wnOrdinary"),sEl=$("#wnSeverance"),ro=readOnly||!db;
  if(oEl.value!==S.wnDraft.ordinary)oEl.value=S.wnDraft.ordinary;if(sEl.value!==S.wnDraft.severance)sEl.value=S.wnDraft.severance;
  oEl.disabled=sEl.disabled=ro;$("#wnSave").disabled=ro||!S.wnSite;
  $("#wnMeta").textContent=saved&&saved.updatedAt?`마지막 저장 ${saved.updatedAt.slice(0,10)}`:""}
function resetNoteForm(){nEditing=null;const f=$("#nForm");if(!f)return;const s=$("#nSite").value;f.reset();$("#nSite").value=s;$("#nMonth").value=thisMonth();$("#nFormT").textContent="특이사항 입력";$("#nSubmit").textContent="등록";$("#nCancel").hidden=true}
function refNotes(){if(!$("#nlist"))return;siteOptions($("#nSite"),false);siteOptions($("#nfSite"),true);const F=S.noteF;
  const rows=S.notes.filter(n=>(!F.site||n.siteId===F.site)&&(!F.month||n.month===F.month||(n.repeat&&n.month<=F.month))).sort((a,b)=>(b.month||"").localeCompare(a.month||""));
  $("#ncount").innerHTML=`<b>${rows.length}</b>건`;
  $("#nlist").innerHTML=rows.length?rows.map(noteRow).join(""):`<div class="empty"><b>${S.notes.length?"조건에 맞는 특이사항이 없습니다":"아직 입력된 급여 특이사항이 없습니다"}</b>${S.notes.length?"귀속월이나 사업장을 바꿔 보세요.":"왼쪽 양식에서 귀속월과 내용을 입력해 등록하세요."}</div>`;
  refWN();
  const base=sitesSorted().filter(s=>!F.site||s.id===F.site).map(s=>({s,items:[["급여관련특이사항",s.f["급여관련특이사항"]],["특이사항",s.f["특이사항"]],["기타",s.f["기타"]]].filter(x=>x[1])})).filter(x=>x.items.length);
  $("#nbase").innerHTML=base.length?base.map(({s,items})=>`<div class="item" style="cursor:pointer" data-open="${esc(s.id)}"><span class="bar"></span><div style="min-width:0"><div class="meta"><b style="color:var(--ink)">${esc(s.f[NAME])}</b><span class="mono">${esc(s.f["사업장 코드"]||"")}</span></div>${items.map(([k,v])=>`<p style="margin-top:4px"><span class="tiny muted">${esc(k)}</span><br>${esc(v)}</p>`).join("")}</div></div>`).join(""):`<div class="empty">급여기초 자료에 적힌 특이사항이 없습니다.</div>`;
  $$("#nbase [data-open]").forEach(el=>el.onclick=()=>openDrawer(el.dataset.open))}

/* ===== 통상임금 ===== */
const wageSum=items=>(items||[]).filter(i=>i.inc).reduce((a,i)=>a+(+i.amount||0),0);
function vWages(){return `<div class="page-h"><div><h1>통상임금 포함항목</h1><p>사업장별로 임금 항목이 통상임금에 들어가는지 정리하고, 월 환산액을 넣으면 통상시급을 바로 계산합니다.</p></div></div>
  <div class="grid">
    <div class="card"><div class="toolbar"><label class="f" style="flex-direction:row;align-items:center;gap:8px;font-size:13px;color:var(--ink)">사업장<select class="i" id="wSite" style="width:auto;max-width:280px"></select></label>
      <span class="tiny muted" id="wMeta"></span><span style="margin-left:auto;display:flex;gap:8px"><button class="btn sm" id="wCopy" hidden>다른 사업장에서 복사</button><button class="btn pri" id="wSave" ${!db||readOnly?"disabled":""}>저장</button></span></div>
      <div id="wEditor"></div></div>
    <div class="note"><b style="color:var(--ink)">판단 기준</b> · 통상임금은 소정근로의 대가로 정기적·일률적으로 지급되는 임금입니다. 2024년 12월 대법원 전원합의체 판결로 ‘고정성’ 요건이 빠져, 재직 조건이나 일정 근무일수 조건이 붙은 정기상여금도 통상임금에 들어갈 수 있습니다. 실비 변상(교통비·출장비 실비 등)과 성과에 따라 달라지는 성과급, 연장·야간·휴일근로수당은 일반적으로 제외됩니다. 최종 판단은 노무 자문을 거쳐 확정하세요.</div>
    <div class="card"><div class="hd"><h2>사업장별 포함항목 한눈에 보기</h2><span class="sub">● 포함 · ○ 제외 · 빈칸 미설정</span></div><div class="tbl-wrap" id="wMatrix"></div></div>
  </div>`}
function bindWages(){const sel=$("#wSite");siteOptions(sel,false);if(!S.wSite&&S.sites.length)S.wSite=sitesSorted()[0].id;sel.value=S.wSite;
  sel.onchange=e=>{if(S.wDirty&&!sel.dataset.ok){sel.dataset.ok="1";toast("저장하지 않은 변경이 있습니다. 다시 선택하면 변경을 버리고 이동합니다.");sel.value=S.wSite;return}delete sel.dataset.ok;S.wSite=e.target.value;S.wDraft=null;S.wDirty=false;refWages()};
  $("#wSave").onclick=async()=>{if(!S.wSite||!S.wDraft)return;const items=S.wDraft.items.filter(i=>i.name.trim());
    try{await db.doc("wages/"+S.wSite).set({items,hours:+S.wDraft.hours||209,updatedAt:new Date().toISOString(),by:uid||""});S.wDirty=false;toast("통상임금 항목을 저장했습니다")}catch(x){err(x)}};
  refWages()}
function refWages(){if(!$("#wEditor"))return;const sel=$("#wSite");siteOptions(sel,false);if(!S.wSite&&S.sites.length){S.wSite=sitesSorted()[0].id}sel.value=S.wSite;
  const saved=S.wages[S.wSite];
  if(!S.wDirty||!S.wDraft){S.wDraft=saved?{items:JSON.parse(JSON.stringify(saved.items||[])),hours:saved.hours||209}:{items:DEFAULT_WAGE.map(([name,inc,kind,cycle])=>({name,inc,kind,cycle,amount:"",memo:""})),hours:209}}
  $("#wMeta").innerHTML=!S.wSite?"":saved?`마지막 저장 ${esc((saved.updatedAt||"").slice(0,10))}`:`<span class="pill p-prog">미설정</span> 기본 항목 틀을 불러왔습니다. 확인 후 저장하세요.`;
  const cp=$("#wCopy");const others=Object.keys(S.wages).filter(k=>k!==S.wSite);cp.hidden=!others.length||readOnly||!db;
  cp.onclick=()=>{const box=$("#wCopyBox");if(box){box.remove();return}const d=document.createElement("div");d.id="wCopyBox";d.className="toolbar";d.innerHTML=`<span class="tiny">복사할 사업장</span>${others.map(k=>`<button class="chip" data-cp="${esc(k)}">${esc(siteName(k))}</button>`).join("")}`;$("#wEditor").before(d);
    d.onclick=e=>{const b=e.target.closest("[data-cp]");if(!b)return;const src=S.wages[b.dataset.cp];S.wDraft={items:JSON.parse(JSON.stringify(src.items)),hours:src.hours||209};S.wDirty=true;d.remove();drawWEditor();toast(siteName(b.dataset.cp)+" 항목을 불러왔습니다. 저장해야 반영됩니다.")}};
  if(!S.wSite){$("#wEditor").innerHTML=`<div class="empty"><b>사업장을 먼저 등록하세요</b></div>`}else if(!S.wDirty||!$("#wEditor .wtbl"))drawWEditor();
  drawMatrix()}
function drawWEditor(){const D=S.wDraft,ro=readOnly||!db;
  $("#wEditor").innerHTML=`<div class="tbl-wrap" style="max-height:none"><table class="wtbl"><thead><tr><th style="min-width:150px">임금 항목</th><th>통상임금 포함</th><th>성격</th><th>지급 주기</th><th style="min-width:120px">월 환산액(원)</th><th style="min-width:160px">비고·판단 근거</th><th></th></tr></thead><tbody>
    ${D.items.map((it,i)=>`<tr data-i="${i}"><td><input class="i" id="wn${i}" data-f="name" value="${esc(it.name)}" ${ro?"disabled":""}></td>
      <td><input type="checkbox" class="tog" id="wi${i}" data-f="inc" ${it.inc?"checked":""} ${ro?"disabled":""} aria-label="통상임금 포함"></td>
      <td><select class="i" id="wk${i}" data-f="kind" ${ro?"disabled":""}>${["고정","변동","실비"].map(k=>`<option ${k===it.kind?"selected":""}>${k}</option>`).join("")}</select></td>
      <td><select class="i" id="wc${i}" data-f="cycle" ${ro?"disabled":""}>${["매월","분기","반기","연","부정기"].map(k=>`<option ${k===it.cycle?"selected":""}>${k}</option>`).join("")}</select></td>
      <td><input class="i mono" type="number" min="0" step="1" id="wa${i}" data-f="amount" value="${esc(it.amount)}" placeholder="0" style="text-align:right" ${ro?"disabled":""}></td>
      <td><input class="i" id="wm${i}" data-f="memo" value="${esc(it.memo||"")}" ${ro?"disabled":""}></td>
      <td>${ro?"":`<button class="btn sm danger" data-rm="${i}" aria-label="항목 삭제">삭제</button>`}</td></tr>`).join("")}
  </tbody></table></div>
  <div class="bd" style="display:flex;flex-direction:column;gap:14px;border-top:1px solid var(--line)">
    ${ro?"":`<div><button class="btn sm" id="wAdd">항목 추가</button></div>`}
    <div class="calc"><div class="box"><div class="l">통상임금 월 합계</div><div class="v" id="wSum">0</div></div>
      <div class="box"><div class="l">월 소정근로시간</div><div class="v"><input class="i mono" type="number" id="wHours" min="1" value="${esc(D.hours)}" style="font-size:17px;font-weight:700;width:110px;padding:2px 6px" ${ro?"disabled":""}> 시간</div></div>
      <div class="box"><div class="l">통상시급</div><div class="v" id="wHr">0</div></div></div>
    <div class="tiny muted">분기·연 단위로 지급되는 항목(예: 정기상여금)은 연간 지급액 ÷ 12로 월 환산액을 넣어 주세요. 주 40시간 근무자의 월 소정근로시간은 주휴 포함 209시간입니다.</div>
  </div>`;
  const calc=()=>{const s=wageSum(D.items);$("#wSum").textContent=won(s)+"원";$("#wHr").textContent=won(s/(+D.hours||209))+"원"};calc();
  const ed=$("#wEditor");
  ed.oninput=ed.onchange=e=>{const t=e.target;if(t.id==="wHours"){D.hours=t.value;S.wDirty=true;calc();return}const tr=t.closest("tr[data-i]");if(!tr||!t.dataset.f)return;const it=D.items[+tr.dataset.i];it[t.dataset.f]=t.type==="checkbox"?t.checked:t.value;S.wDirty=true;calc()};
  ed.onclick=e=>{const rm=e.target.closest("[data-rm]");if(rm){D.items.splice(+rm.dataset.rm,1);S.wDirty=true;drawWEditor();return}
    if(e.target.id==="wAdd"){D.items.push({name:"",inc:false,kind:"고정",cycle:"매월",amount:"",memo:""});S.wDirty=true;drawWEditor();const l=D.items.length-1;$("#wn"+l)&&$("#wn"+l).focus()}}}
function drawMatrix(){const ids=sitesSorted().map(s=>s.id).filter(id=>S.wages[id]);const box=$("#wMatrix");if(!box)return;
  if(!ids.length){box.innerHTML=`<div class="empty"><b>아직 저장된 사업장이 없습니다</b>위에서 사업장을 고르고 항목을 확인한 뒤 저장하면 사업장끼리 비교할 수 있습니다.</div>`;return}
  const items=[];ids.forEach(id=>(S.wages[id].items||[]).forEach(it=>{if(!items.includes(it.name))items.push(it.name)}));
  box.innerHTML=`<table class="matrix"><thead><tr><th>사업장</th>${items.map(n=>`<th>${esc(n)}</th>`).join("")}<th>통상시급</th></tr></thead><tbody>${ids.map(id=>{const w=S.wages[id];const m={};(w.items||[]).forEach(it=>m[it.name]=it);
    return `<tr style="cursor:pointer" data-w="${esc(id)}"><td><b>${esc(siteName(id))}</b></td>${items.map(n=>`<td>${m[n]?(m[n].inc?'<span class="dot-y">●</span>':'<span class="muted">○</span>'):""}</td>`).join("")}<td class="mono">${wageSum(w.items)?won(wageSum(w.items)/(+w.hours||209)):"—"}</td></tr>`}).join("")}</tbody></table>`;
  $$("#wMatrix [data-w]").forEach(tr=>tr.onclick=()=>{if(S.wDirty){toast("저장하지 않은 변경이 있습니다. 먼저 저장하세요.");return}S.wSite=tr.dataset.w;S.wDraft=null;refWages();window.scrollTo(0,0)})}

/* ---------- 데이터 연결 (공유 DB: js/cloud.js, 없으면 로컬 저장소: js/store.js) ---------- */
window.WV={go,close:closeDrawer};
dl={save:async({filename,data})=>{const a=document.createElement("a");a.href=URL.createObjectURL(data);a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}};
(window.DBReady||Promise.resolve({db:window.LocalDB})).then(r=>{db=r.db;if(r.user){uid=r.user.email;
  $("#conn").innerHTML=`공유 DB · ${esc(uid)} <button class="btn sm" id="logout">로그아웃</button>`;$("#logout").onclick=()=>db.signOut();
  $("#bkReset").style.display="none"}
  start()}).catch(e=>{console.error(e);$("#main").innerHTML=`<div class="empty"><b>공유 DB에 연결하지 못했습니다</b>${esc(e.message||"")} 새로고침해서 다시 시도하세요.</div>`});
function start(){
render();
const sub=(col,fn)=>db.collection(col).onSnapshot(snap=>{fn(snap.docs.map(d=>({id:d.id,...d.data()})));S.loaded[col]=true;refresh()});
sub("sites",a=>S.sites=a.map(x=>({...x,f:x.f||{}})));
sub("issues",a=>S.issues=a);
sub("notes",a=>S.notes=a);
sub("wages",a=>{const m={};a.forEach(x=>m[x.id]=x);S.wages=m});
sub("wagenotes",a=>{const m={};a.forEach(x=>m[x.id]=x);S.wagenotes=m});
/* 백업 */
$("#bkExport").onclick=()=>dl.save({filename:`급여기초_전체_${today()}.csv`,data:new Blob([sitesCsv(sitesSorted())],{type:"text/csv;charset=utf-8"})});
$("#bkJson").onclick=()=>dl.save({filename:`급여노무_백업_${today()}.json`,data:new Blob([db.exportJSON()],{type:"application/json"})});
$("#bkImport").onclick=()=>$("#bkFile").click();
$("#bkFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{await db.importJSON(await f.text());toast("백업을 불러왔습니다")}catch(x){toast("불러오지 못했습니다: "+(x.message||"파일 형식을 확인하세요"))}e.target.value=""};
$("#bkReset").onclick=e=>armDelete(e.currentTarget,()=>{db.reset();toast("엑셀 원본 상태로 초기화했습니다")});
}

})();
