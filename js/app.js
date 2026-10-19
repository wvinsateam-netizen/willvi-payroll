(function(){
"use strict";
/* ---------- 상수 ---------- */
const COLS=["사업장명","사업자번호","대표자명","계약유지상태","최초계약일","최근재계약일","업무담당자명","업무담당자 연락처","사업장 코드","원가중심점","경영지원본부 인사담당자","소속부서","사업부담당자","사업부담당자 연락처","CRM 전화응대 담당자","전화 응대 연락처","급여/총무 담당자","급여 총무 연락처","급여일","급여산정 시작일","급여산정 종료일","파견/도급구분","사업장 주소지(실근무지)","업무내용","계약형태 (도급, I/H, F/O, 파견)","업무형태 (I/B,O/B,파견 등)","청구형태 (인원, 콜, 업무도급, 성과유지 등)","근로자 계약형태","근로자 근무형태","퇴직금 적립방식","퇴직금적립방식 변경사항 (발생대상 사업장만 작성)","연차수당 적립방식","신원보증보험","월청구분 당사입금일","퇴직연금DC사업장 근로계약 필수 작성시기","기타","특이사항","사업장명 변경 전(2024-12)","생일축하금 (금액기재)","설,추석 선물 여부","근로자의날 선물 여부","산재개시번호"];
const NAME="사업장명";
const BASIC=["사업자번호",NAME,"대표자명","계약유지상태","최초계약일","최근재계약일","업무담당자명","업무담당자 연락처"];
// 화면에 보이는 이름만 바꿈 (저장 데이터·엑셀 열 이름은 그대로)
const LABELS={"사업장 코드":"BMP 코드","전화 응대 연락처":"CRM 전화 응대 연락처","급여/총무 담당자":"CRM 급여/총무 담당자","급여 총무 연락처":"CRM 급여/총무 연락처"};
// 화면에서 뺀 항목 (저장된 값이 있어도 '추가 항목'에 보이지 않음)
const REMOVED=["순번","급여관련특이사항","등록일","청구 급여 업무 담당자","근태/연차 관리 담당자","계약시작일 (재계약일)","직접비율","매출비 품의"];
const lbl=k=>LABELS[k]||k;
const CONTRACT_STATES=["계약","종료"];
const DATE_COLS=["최초계약일","최근재계약일"];
// 날짜 칸 값 맞추기: 2019.4.1 · 2019/04/01 → 2019-04-01 (알 수 없는 형식은 null)
const isoDate=v=>{if(!v)return "";const m=String(v).trim().match(/^(\d{4})\D(\d{1,2})\D(\d{1,2})$/);return m?`${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`:null};
// 사업자등록번호: 숫자만 남겨 000-00-00000 으로
const bizNo=v=>{const d=String(v||"").replace(/\D/g,"").slice(0,10);return d.length>5?`${d.slice(0,3)}-${d.slice(3,5)}-${d.slice(5)}`:d.length>3?`${d.slice(0,3)}-${d.slice(3)}`:d};
// 중복 체크 항목: 값은 "도급직, 파견직"처럼 쉼표로 이어 저장
const MULTI={"근로자 계약형태":["도급직","파견직","계약직","기타"],"근로자 근무형태":["주40시간","단시간","초단기","2교대","3교대","감단직","일용직"]};
const splitMulti=v=>String(v||"").split(",").map(x=>x.trim()).filter(Boolean);
const GROUPS={
  "기본":["사업장 코드","원가중심점","소속부서","파견/도급구분","업무내용","급여일","경영지원본부 인사담당자"],
  "업무담당자":["소속부서","사업부담당자","사업부담당자 연락처","CRM 전화응대 담당자","전화 응대 연락처","급여/총무 담당자","급여 총무 연락처","경영지원본부 인사담당자"],
  "계약·청구":["파견/도급구분","계약형태 (도급, I/H, F/O, 파견)","업무형태 (I/B,O/B,파견 등)","청구형태 (인원, 콜, 업무도급, 성과유지 등)","근로자 계약형태","근로자 근무형태","월청구분 당사입금일","사업장 주소지(실근무지)","산재개시번호"],
  "임금":["급여일","급여산정 시작일","급여산정 종료일","퇴직금 적립방식","퇴직금적립방식 변경사항 (발생대상 사업장만 작성)","연차수당 적립방식","퇴직연금DC사업장 근로계약 필수 작성시기"],
  "복리후생":["신원보증보험","근로자의날 선물 여부","생일축하금 (금액기재)","설,추석 선물 여부"],
  "비고":["기타","특이사항","사업장명 변경 전(2024-12)"],
  "전체":COLS.filter(c=>c!==NAME)
};
const FILTERS=[["경영지원본부 인사담당자","인사담당자"],["소속부서","소속부서"],["파견/도급구분","파견/도급"],["계약형태 (도급, I/H, F/O, 파견)","계약형태"],["급여일","급여일"],["퇴직금 적립방식","퇴직금 적립"]];
const ISSUE_TYPES=["임금·체불","근로시간·연장","휴가·휴직","징계·해고","직장 내 괴롭힘","산업재해","퇴직금·연금","근로계약","4대보험","기타"];
const STATUSES=["접수","진행중","완료"];
const RISKS=["높음","보통","낮음"];
const NOTE_TYPES=["수당","공제","소급·정산","입·퇴사","휴직·복직","청구","기타"];
// 엑셀 원본이 바뀐 값을 이미 저장된 데이터에도 반영 (현재 값이 예전 값 그대로일 때만 바꿈 → 직접 고친 값은 유지)
// [사업장 id, 항목, 예전 값, 새 값]
const DATA_FIXES=[
  ["s03","경영지원본부 인사담당자","강미리","주예린"],["s04","경영지원본부 인사담당자","강미리","주예린"],
  ["s07","경영지원본부 인사담당자","강미리","주예린"],["s08","경영지원본부 인사담당자","강미리","주예린"]];

/* ---------- 상태 ---------- */
const S={view:"home",sites:[],issues:[],notes:[],wagenotes:{},loaded:{sites:false,issues:false,notes:false,wagenotes:false},
  siteF:{q:"",group:"기본",sort:null,dir:1},siteSel:{},issueF:{q:"",status:"",type:"",risk:"",only:true},noteF:{q:"",month:"",type:"",only:true},
  drawer:null,dTab:"info",dEdit:false,dForm:null,dDirty:false,wnDraft:null};
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
  if(e&&e.code==="permission_denied"){toast("저장 권한이 없습니다. 다시 로그인하거나 supabase/schema.sql 을 다시 실행하세요. ("+(e.message||"")+")");return}
  if(e&&e.code==="quota_exceeded"){toast("저장 공간이 가득 찼습니다. 오래된 기록을 삭제한 뒤 다시 시도하세요.");return}
  toast("저장하지 못했습니다. 잠시 후 다시 시도하세요.")}
function hl(text,q){const t=esc(text);if(!q)return t;const i=t.toLowerCase().indexOf(esc(q).toLowerCase());if(i<0)return t;const n=esc(q).length;return t.slice(0,i)+"<mark>"+t.slice(i,i+n)+"</mark>"+t.slice(i+n)}
function armDelete(btn,fn,msg){if(btn.classList.contains("arm")){fn();return}btn.classList.add("arm");const o=btn.textContent;btn.textContent=msg||"한 번 더 눌러 삭제";setTimeout(()=>{btn.classList.remove("arm");btn.textContent=o},3000)}
async function fillNames(){if(!user||!user.profiles)return;const ids=[...new Set($$("[data-uid]").map(e=>e.dataset.uid).filter(Boolean))];if(!ids.length)return;
  try{const ps=await user.profiles(ids);ids.forEach(id=>{names[id]=(ps&&ps[id]&&ps[id].name)||"";});}catch(e){}
  $$("[data-uid]").forEach(e=>{e.textContent=names[e.dataset.uid]||"작성자"})}
const who=id=>id?`<span data-uid="${esc(id)}">${esc(names[id]||"작성자")}</span>`:"";

/* ---------- 내비 ---------- */
$("#nav").addEventListener("click",e=>{const b=e.target.closest("button[data-v]");if(!b)return;go(b.dataset.v)});
function go(v,opt){S.view=v;try{localStorage.setItem("wv-view",v)}catch(e){}if(opt)Object.assign(S,opt);render();window.scrollTo(0,0)}
function counts(){$("#c-sites").textContent=S.sites.length;$("#c-issues").textContent=S.issues.filter(i=>i.status!=="완료").length;
  $("#c-notes").textContent=S.notes.filter(n=>n.month===thisMonth()).length;
  $$("#nav button").forEach(b=>b.setAttribute("aria-current",b.dataset.v===S.view?"page":"false"))}

/* ---------- 렌더 ---------- */
function render(){counts();const m=$("#main");
  const banner=readOnly?`<div class="banner">보기 전용입니다.</div>`:"";
  m.innerHTML=banner+({home:vHome,sites:vSites,issues:vIssues,notes:vNotes}[S.view]||vHome)();
  ({home:()=>{},sites:bindSites,issues:bindIssues,notes:bindNotes}[S.view]||(()=>{}))();
  fillNames();renderDrawer()}
function refresh(){counts();({home:()=>render(),sites:refSites,issues:refIssues,notes:refNotes}[S.view]||render)();if(S.drawer)renderDrawer();fillNames()}

/* ===== 홈 ===== */
function vHome(){const n=S.sites.length,open=S.issues.filter(i=>i.status!=="완료"),mon=S.notes.filter(x=>x.month===thisMonth());
  const by=(k)=>{const m={};S.sites.forEach(s=>{const v=(s.f[k]||"미기재").trim();m[v]=(m[v]||0)+1});return Object.entries(m).sort((a,b)=>b[1]-a[1])};
  const bars=(arr,suf="",colorOf)=>{const mx=Math.max(1,...arr.map(a=>a[1]));return `<div class="bars">${arr.map(([k,c])=>`<div class="r"><span title="${esc(k)}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(k)}${suf}</span><span class="t"><i style="width:${c/mx*100}%${colorOf?`;background:${colorOf(k)}`:""}"></i></span><span class="c">${c}</span></div>`).join("")}</div>`};
  const riskColor=r=>r==="높음"?"var(--bad)":r==="보통"?"var(--warn)":"var(--ok)";
  const byRisk=RISKS.map(r=>[r,open.filter(i=>i.risk===r).length]);
  const recent=S.issues.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,5);
  return `<div class="page-h"><div><h1>급여·노무 관리 홈</h1><p>사업장별 급여기초 정보, 노무 문제, 급여 특이사항을 한곳에서 관리합니다.</p></div></div>
  <div class="grid g-stats" style="margin-bottom:16px">
    <button class="stat" onclick="WV.go('sites')"><span class="l">관리 사업장</span><span class="v">${n}<small>곳</small></span><span class="n">급여기초 등록 기준</span></button>
    <button class="stat" onclick="WV.go('issues')"><span class="l">미해결 노무 문제</span><span class="v" style="color:${open.length?"var(--bad)":"inherit"}">${open.length}<small>건</small></span><span class="n">${open.filter(i=>i.risk==="높음").length?`<b style="color:var(--bad)">위험 높음 ${open.filter(i=>i.risk==="높음").length}</b> · `:""}접수 ${open.filter(i=>i.status==="접수").length} · 진행중 ${open.filter(i=>i.status==="진행중").length}</span></button>
    <button class="stat" onclick="WV.go('notes')"><span class="l">${thisMonth().replace("-","년 ")}월 급여 특이사항</span><span class="v">${mon.length}<small>건</small></span><span class="n">전체 ${S.notes.length}건</span></button>
  </div>
  <div class="grid g-2">
    <div class="card"><div class="hd"><h2>최근 노무 문제</h2><button class="btn sm" style="margin-left:auto" onclick="WV.go('issues')">전체 보기</button></div>
      ${recent.length?`<div class="list">${recent.map(i=>issueRow(i)).join("")}</div>`:`<div class="empty"><b>등록된 노무 문제가 없습니다</b>노무 문제 메뉴에서 사업장별 이슈를 입력하면 여기에 최근 5건이 표시됩니다.</div>`}</div>
    <div class="grid">
      <div class="card"><div class="hd"><h2>위험도별 미해결 노무 문제</h2></div><div class="bd">${open.length?bars(byRisk,"",riskColor):`<div class="muted">미해결 노무 문제가 없습니다.</div>`}</div></div>
      <div class="card"><div class="hd"><h2>급여일별 사업장</h2></div><div class="bd">${n?bars(by("급여일").map(([k,c])=>[/^\d+$/.test(k)?k+"일":k,c])):`<div class="muted">사업장 정보를 불러오는 중입니다.</div>`}</div></div>
      <div class="card"><div class="hd"><h2>인사담당자별 사업장</h2></div><div class="bd">${n?bars(by("경영지원본부 인사담당자")):`<div class="muted">—</div>`}</div></div>
      <div class="card"><div class="hd"><h2>파견 / 도급 구분</h2></div><div class="bd">${n?bars(by("파견/도급구분")):`<div class="muted">—</div>`}</div></div>
    </div>
  </div>`}

/* ===== 급여기초 ===== */
function vSites(){return `<div class="page-h"><div><h1>급여기초</h1><p>사업장별 급여·계약·담당자 정보입니다. 조건을 조합해 필터링하고, 행을 누르면 상세 정보와 해당 사업장의 노무 문제·특이사항을 함께 볼 수 있습니다.</p></div>
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
function openDrawer(id,tab){Object.assign(S,{drawer:id,dTab:tab||"info",dEdit:false,dForm:null,dDirty:false,wnDraft:null,dWarn:false});renderDrawer(true)}
function closeDrawer(){if(!leaveOk())return;Object.assign(S,{drawer:null,dEdit:false,dForm:null,dDirty:false,wnDraft:null});renderDrawer(true)}
// 입력 중인 내용이 있으면 한 번은 막고 알림, 다시 누르면 버리고 진행
function leaveOk(){if(!(S.dForm||S.dDirty)||S.dWarn){S.dWarn=false;return true}S.dWarn=true;toast("저장하지 않은 입력이 있습니다. 다시 누르면 버리고 이동합니다.");setTimeout(()=>S.dWarn=false,4000);return false}
function renderDrawer(force){const root=$("#drawer-root");if(!S.drawer){root.innerHTML="";return}
  const isNew=S.drawer==="__new";const s=isNew?{id:"__new",f:{}}:S.sites.find(x=>x.id===S.drawer);if(!s){root.innerHTML="";S.drawer=null;return}
  if(!force&&(S.dEdit&&root.querySelector("#siteForm")||(S.dForm||S.dDirty)&&root.querySelector(".drawer")))return; // 입력 중엔 다시 그리지 않음
  const iss=S.issues.filter(i=>i.siteId===s.id),nts=S.notes.filter(n=>n.siteId===s.id);
  const tabs=[["info","기본 정보"],["issues",`노무 문제 ${iss.length}`],["notes",`급여 특이사항 ${nts.length}`]];
  let body="";
  if(S.dEdit){body=`<form id="siteForm" class="form">${COLS.map((k,i)=>{if(k==="계약유지상태")return `<div class="f"><span>${esc(lbl(k))}</span><span class="cbox">${CONTRACT_STATES.map(v=>`<label><input type="checkbox" data-k="${esc(k)}" value="${esc(v)}" ${s.f[k]===v?"checked":""}>${esc(v)}</label>`).join("")}</span></div>`;
    if(MULTI[k]){const on=splitMulti(s.f[k]);return `<div class="f"><span>${esc(lbl(k))}</span><span class="cbox">${MULTI[k].map(v=>`<label><input type="checkbox" data-k="${esc(k)}" value="${esc(v)}" ${on.includes(v)?"checked":""}>${esc(v)}</label>`).join("")}</span></div>`}
    if(DATE_COLS.includes(k)&&isoDate(s.f[k])!==null)return `<label class="f">${esc(lbl(k))}<input class="i" type="date" id="sfld${i}" data-k="${esc(k)}" value="${esc(isoDate(s.f[k]))}"></label>`;
    if(k==="사업자번호")return `<label class="f">${esc(lbl(k))}<input class="i mono" id="sfld${i}" data-k="${esc(k)}" value="${esc(s.f[k]?bizNo(s.f[k]):"")}" inputmode="numeric" maxlength="12" placeholder="000-00-00000"></label>`;const long=/주소|특이사항|기타|업무내용/.test(k);return `<label class="f">${esc(lbl(k))}${long?`<textarea class="i" id="sfld${i}" data-k="${esc(k)}" rows="2">${esc(s.f[k]||"")}</textarea>`:`<input class="i" id="sfld${i}" data-k="${esc(k)}" value="${esc(s.f[k]||"")}" ${k===NAME?"required":""}>`}</label>`}).join("")}
    <div style="display:flex;gap:8px;position:sticky;bottom:0;background:var(--surface);padding-block:10px"><button class="btn pri" type="submit">저장</button><button class="btn" type="button" id="dCancel">취소</button>${isNew?"":`<button class="btn danger" type="button" id="dDel" style="margin-left:auto">사업장 삭제</button>`}</div></form>`}
  else if(S.dTab==="info"){const sec=(t,ks)=>`<section><h3 class="sec-t">${esc(t)}</h3><dl class="kv">${ks.map(k=>`<dt>${esc(lbl(k))}</dt><dd class="${/연락처|코드|번호/.test(k)?"mono":""}">${k==="계약유지상태"&&s.f[k]?`<span class="pill ${s.f[k]==="계약"?"p-acc":"p-neutral"}">${esc(s.f[k])}</span>`:esc(s.f[k]||"—")}</dd>`).join("")}</dl></section>`;
    const used=new Set();const out=["업무담당자","계약·청구","임금","복리후생","비고"].map(g=>{const ks=GROUPS[g].filter(k=>!used.has(k));ks.forEach(k=>used.add(k));return sec(g,ks)});
    out.unshift(sec("기본",[...BASIC,...["사업장 코드","원가중심점","업무내용"].filter(k=>!used.has(k))]));
    const extra=Object.keys(s.f).filter(k=>!COLS.includes(k)&&!REMOVED.includes(k));if(extra.length)out.push(sec("추가 항목",extra));body=out.join("")}
  else if(S.dTab==="issues")body=drawerIssues(s,iss);
  else if(S.dTab==="notes")body=drawerNotes(s,nts);
  root.innerHTML=`<div class="drawer-bg" id="dBg"></div><div class="drawer" role="dialog" aria-modal="true" aria-label="사업장 상세">
    <div class="dh"><div style="min-width:0"><div class="tiny muted mono">${esc(s.f["사업장 코드"]?"코드 "+s.f["사업장 코드"]:"")} ${esc(s.f["소속부서"]||"")}</div><h2>${isNew?"새 사업장":esc(s.f[NAME]||"(이름 없음)")}</h2>
      <div class="chips" style="margin-top:6px">${s.f["파견/도급구분"]?`<span class="pill p-neutral">${esc(s.f["파견/도급구분"])}</span>`:""}${s.f["급여일"]?`<span class="pill p-neutral">급여일 ${esc(s.f["급여일"])}${/^\d+$/.test(s.f["급여일"])?"일":""}</span>`:""}${iss.filter(i=>i.status!=="완료").length?`<span class="pill p-open">미해결 노무 ${iss.filter(i=>i.status!=="완료").length}</span>`:""}</div></div>
      <div style="margin-left:auto;display:flex;gap:6px">${!S.dEdit&&!readOnly&&db?`<button class="btn sm" id="dEdit">정보 수정</button>`:""}<button class="btn sm" id="dClose" aria-label="닫기">닫기</button></div></div>
    ${S.dEdit?"":`<div class="tabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" data-t="${k}" aria-selected="${S.dTab===k}">${esc(l)}</button>`).join("")}</div>`}
    <div class="db">${body}</div></div>`;
  $("#dBg").onclick=closeDrawer;$("#dClose").onclick=closeDrawer;
  const ed=$("#dEdit");if(ed)ed.onclick=()=>{if(!leaveOk())return;Object.assign(S,{dEdit:true,dForm:null,dDirty:false,wnDraft:null});renderDrawer(true)};
  $$(".drawer .tabs button").forEach(b=>b.onclick=()=>{if(b.dataset.t===S.dTab||!leaveOk())return;Object.assign(S,{dTab:b.dataset.t,dForm:null,dDirty:false,wnDraft:null});renderDrawer(true)});
  if(!S.dEdit)bindDrawerRecords(root,s);
  const f=$("#siteForm");if(f){f.addEventListener("submit",async e=>{e.preventDefault();const nf={};$$("[data-k]",f).forEach(el=>{if(el.type==="checkbox"&&!el.checked)return;const k=el.dataset.k,v=el.value.trim();if(!v)return;nf[k]=MULTI[k]&&nf[k]?nf[k]+", "+v:v});
      const id=isNew?"s"+Date.now().toString(36):s.id;const order=isNew?(Math.max(0,...S.sites.map(x=>x.order||0))+1):(s.order||0);
      try{await db.doc("sites/"+id).set({order,f:nf,source:s.source||"직접 입력",updatedAt:new Date().toISOString(),updatedBy:uid||""});toast("저장했습니다");S.dEdit=false;S.drawer=id;$("#drawer-root").innerHTML="";renderDrawer()}catch(x){err(x)}});
    const bz=$('[data-k="사업자번호"]',f);if(bz)bz.oninput=()=>{const at=bz.selectionStart,before=bz.value.slice(0,at).replace(/\D/g,"").length;bz.value=bizNo(bz.value);
      let n=0,pos=0;while(pos<bz.value.length&&n<before){if(/\d/.test(bz.value[pos]))n++;pos++}bz.setSelectionRange(pos,pos)};
    $$('input[type=checkbox][data-k="계약유지상태"]',f).forEach(cb=>cb.onchange=()=>{if(cb.checked)$$('input[type=checkbox][data-k="계약유지상태"]',f).forEach(o=>{if(o!==cb)o.checked=false})});
    $("#dCancel").onclick=()=>{S.dEdit=false;root.innerHTML="";if(isNew)S.drawer=null;renderDrawer()};
    const del=$("#dDel");if(del)del.onclick=()=>armDelete(del,async()=>{try{await db.doc("sites/"+s.id).delete();toast("사업장을 삭제했습니다");S.dEdit=false;closeDrawer()}catch(x){err(x)}})}
  fillNames()}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&S.drawer&&!S.dEdit)closeDrawer()});

/* ===== 노무 문제 ===== */
function riskPill(r){const k=RISKS.indexOf(r);return k<0?"":`<span class="pill rk rk-${k}" title="위험도">위험 ${esc(r)}</span>`}
// inDrawer: 사업장 상세 안에서 보일 때 (사업장명 생략, 수정·삭제 버튼 표시)
function issueRow(i,inDrawer){return `<div class="item s-${esc(i.status)}"><span class="bar"></span><div style="min-width:0">
  <div class="meta"><span class="pill ${i.status==="완료"?"p-done":i.status==="진행중"?"p-prog":"p-open"}">${esc(i.status)}</span>${riskPill(i.risk)}${inDrawer?"":`<b style="color:var(--ink)">${esc(siteName(i.siteId))}</b>`}<span>${esc(i.type)}</span><span class="mono">${esc(i.date)}</span>${i.owner?`<span>담당 ${esc(i.owner)}</span>`:""}</div>
  <h3>${esc(i.title)}</h3>${i.content?`<p>${esc(i.content)}</p>`:""}${i.result?`<p class="tiny" style="margin-top:6px;color:var(--ok)">처리 결과 · ${esc(i.result)}</p>`:""}
  </div>
  ${inDrawer&&db&&!readOnly?`<div class="side"><select class="i" style="width:auto;padding:3px 8px;font-size:12px" data-st="${esc(i.id)}" aria-label="처리상태">${STATUSES.map(s=>`<option ${s===i.status?"selected":""}>${s}</option>`).join("")}</select><button class="btn sm" data-ied="${esc(i.id)}">수정</button><button class="btn sm danger" data-idel="${esc(i.id)}">삭제</button></div>`:""}</div>`}
const rIdx=i=>{const k=RISKS.indexOf(i.risk);return k<0?1:k};
const issueSort=(a,b)=>(STATUSES.indexOf(a.status)-STATUSES.indexOf(b.status))||(rIdx(a)-rIdx(b))||(b.date||"").localeCompare(a.date||"");
// 사업장 표 공통: 검색어가 사업장명이나 기록 내용에 있으면 통과
const textHit=(q,...vals)=>!q||vals.some(v=>String(v||"").toLowerCase().includes(q));
function vIssues(){const F=S.issueF;return `<div class="page-h"><div><h1>노무 문제</h1><p>사업장별 노무 문제 현황입니다. 사업장을 누르면 그 사업장의 노무 문제를 보고 입력·수정할 수 있습니다.</p></div></div>
  <div class="card">
    <div class="bd" style="border-bottom:1px solid var(--line)"><div class="filters f4">
      <label class="f q">전체 검색<input class="i" id="iq" type="search" placeholder="사업장명, 제목, 내용, 담당자" value="${esc(F.q)}"></label>
      <label class="f">유형<select class="i" id="ifType"><option value="">전체</option>${ISSUE_TYPES.map(t=>`<option>${t}</option>`).join("")}</select></label>
      <label class="f">위험도<select class="i" id="ifRisk"><option value="">전체</option>${RISKS.map(r=>`<option>${r}</option>`).join("")}</select></label>
      <label class="f">처리상태<select class="i" id="ifStatus"><option value="">전체</option>${STATUSES.map(s=>`<option>${s}</option>`).join("")}</select></label>
    </div></div>
    <div class="toolbar"><span class="count" id="icount"></span>
      <span class="chips" id="ionly"><button class="chip" data-o="1" aria-pressed="${F.only}">노무 문제 있는 사업장</button><button class="chip" data-o="" aria-pressed="${!F.only}">전체 사업장</button></span>
      <button class="btn sm" id="ireset" style="margin-left:auto">필터 초기화</button></div>
    <div class="tbl-wrap"><table class="sitetbl"><thead><tr><th>사업장명</th><th>소속부서</th><th class="num">미해결</th><th class="num">위험 높음</th><th class="num">진행중</th><th class="num">완료</th><th class="num">전체</th><th>최근 발생일</th><th>최근 노무 문제</th></tr></thead><tbody id="ibody"></tbody></table></div>
  </div>`}
function bindIssues(){const F=S.issueF;$("#ifType").value=F.type;$("#ifRisk").value=F.risk;$("#ifStatus").value=F.status;
  $("#iq").oninput=e=>{F.q=e.target.value;refIssues()};
  $("#ifType").onchange=e=>{F.type=e.target.value;refIssues()};$("#ifRisk").onchange=e=>{F.risk=e.target.value;refIssues()};$("#ifStatus").onchange=e=>{F.status=e.target.value;refIssues()};
  $("#ionly").onclick=e=>{const b=e.target.closest("[data-o]");if(!b)return;F.only=!!b.dataset.o;$$("#ionly .chip").forEach(c=>c.setAttribute("aria-pressed",c===b));refIssues()};
  $("#ireset").onclick=()=>{Object.assign(F,{q:"",type:"",risk:"",status:""});$("#iq").value="";$("#ifType").value=$("#ifRisk").value=$("#ifStatus").value="";refIssues()};
  $("#ibody").onclick=e=>{const tr=e.target.closest("tr[data-id]");if(tr)openDrawer(tr.dataset.id,"issues")};
  refIssues()}
function refIssues(){if(!$("#ibody"))return;const F=S.issueF,q=F.q.trim().toLowerCase();
  const hit=i=>(!F.type||i.type===F.type)&&(!F.risk||i.risk===F.risk)&&(!F.status||i.status===F.status);
  const filtering=F.type||F.risk||F.status;
  const rows=sitesSorted().map(s=>{const all=S.issues.filter(i=>i.siteId===s.id&&hit(i));const nameHit=textHit(q,s.f[NAME]);
      const list=nameHit?all:all.filter(i=>textHit(q,i.title,i.content,i.owner,i.result));return {s,list,nameHit}})
    .filter(r=>(r.nameHit||r.list.length)&&(!(F.only||filtering)||r.list.length));
  const open=l=>l.filter(i=>i.status!=="완료");
  rows.sort((a,b)=>open(b.list).length-open(a.list).length||open(b.list).filter(i=>i.risk==="높음").length-open(a.list).filter(i=>i.risk==="높음").length||(b.list.map(i=>i.date||"").sort().pop()||"").localeCompare(a.list.map(i=>i.date||"").sort().pop()||"")||(a.s.order??999)-(b.s.order??999));
  const tot=rows.reduce((n,r)=>n+r.list.length,0),totOpen=rows.reduce((n,r)=>n+open(r.list).length,0);
  $("#icount").innerHTML=`<b>${rows.length}</b>곳 · 노무 문제 <b>${tot}</b>건${totOpen?` · 미해결 <b style="color:var(--bad)">${totOpen}</b>건`:""}`;
  const n=(v,c)=>v?`<span class="num-b"${c?` style="color:${c}"`:""}>${v}</span>`:`<span class="muted">0</span>`;
  $("#ibody").innerHTML=rows.length?rows.map(({s,list})=>{const o=open(list),last=list.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""))[0];
      return `<tr data-id="${esc(s.id)}"><td>${hl(s.f[NAME]||"(이름 없음)",F.q.trim())}</td><td>${esc(s.f["소속부서"]||"")}</td>
        <td class="num">${n(o.length,"var(--bad)")}</td><td class="num">${n(o.filter(i=>i.risk==="높음").length,"var(--bad)")}</td>
        <td class="num">${n(list.filter(i=>i.status==="진행중").length)}</td><td class="num">${n(list.filter(i=>i.status==="완료").length)}</td><td class="num">${n(list.length)}</td>
        <td class="mono">${last?esc(last.date||""):""}</td><td class="clip">${last?esc(last.title||""):`<span class="muted">—</span>`}</td></tr>`}).join("")
    :`<tr><td colspan="9"><div class="empty"><b>${S.issues.length?"조건에 맞는 사업장이 없습니다":"아직 등록된 노무 문제가 없습니다"}</b>${S.issues.length?"필터를 줄이거나 초기화해 보세요.":"‘전체 사업장’을 누르고 사업장을 골라 첫 노무 문제를 입력하세요."}</div></td></tr>`}

/* ===== 급여 특이사항 ===== */
function noteRow(n,inDrawer){return `<div class="item"><span class="bar" style="background:var(--accent)"></span><div style="min-width:0">
  <div class="meta"><span class="pill p-acc mono">${esc(n.month)}</span>${inDrawer?"":`<b style="color:var(--ink)">${esc(siteName(n.siteId))}</b>`}<span>${esc(n.type)}</span>${n.amount?`<span class="mono">${won(n.amount)}원</span>`:""}${n.repeat?`<span class="pill p-neutral">매월 반복</span>`:""}</div>
  <h3>${esc(n.title||"")}</h3>${n.content?`<p>${esc(n.content)}</p>`:""}</div>
  ${inDrawer&&db&&!readOnly?`<div class="side"><button class="btn sm" data-ned="${esc(n.id)}">수정</button><button class="btn sm danger" data-ndel="${esc(n.id)}">삭제</button></div>`:""}</div>`}
const baseNotes=s=>[["특이사항",s.f["특이사항"]],["기타",s.f["기타"]]].filter(x=>x[1]);
const wnHas=id=>{const w=S.wagenotes[id];return !!(w&&(w.ordinary||w.severance))};
function vNotes(){const F=S.noteF;return `<div class="page-h"><div><h1>급여 특이사항</h1><p>사업장별 급여 특이사항 현황입니다. 사업장을 누르면 월별 특이사항, 급여기초 자료의 특이사항, 통상임금·퇴직금 메모를 함께 보고 입력할 수 있습니다.</p></div></div>
  <div class="card">
    <div class="bd" style="border-bottom:1px solid var(--line)"><div class="filters f3">
      <label class="f q">전체 검색<input class="i" id="nq" type="search" placeholder="사업장명, 제목, 내용" value="${esc(F.q)}"></label>
      <label class="f">귀속월<input class="i" type="month" id="nfMonth" value="${esc(F.month)}"></label>
      <label class="f">구분<select class="i" id="nfType"><option value="">전체</option>${NOTE_TYPES.map(t=>`<option>${t}</option>`).join("")}</select></label>
    </div></div>
    <div class="toolbar"><span class="count" id="ncount"></span>
      <span class="chips" id="nonly"><button class="chip" data-o="1" aria-pressed="${F.only}">기록 있는 사업장</button><button class="chip" data-o="" aria-pressed="${!F.only}">전체 사업장</button></span>
      <button class="btn sm" id="nfAll" style="margin-left:auto">전체 기간</button><button class="btn sm" id="nreset">필터 초기화</button></div>
    <div class="tbl-wrap"><table class="sitetbl"><thead><tr><th>사업장명</th><th>소속부서</th><th class="num" id="nMonthH"></th><th class="num">매월 반복</th><th class="num">전체</th><th>최근 귀속월</th><th>최근 특이사항</th><th>급여기초 특이사항</th><th>통상임금·퇴직금 메모</th></tr></thead><tbody id="nbody"></tbody></table></div>
  </div>`}
const noteInMonth=(n,m)=>!m||n.month===m||(n.repeat&&n.month<=m);
function bindNotes(){const F=S.noteF;$("#nfType").value=F.type;
  $("#nq").oninput=e=>{F.q=e.target.value;refNotes()};
  $("#nfMonth").onchange=e=>{F.month=e.target.value;refNotes()};$("#nfType").onchange=e=>{F.type=e.target.value;refNotes()};
  $("#nfAll").onclick=()=>{F.month="";$("#nfMonth").value="";refNotes()};
  $("#nonly").onclick=e=>{const b=e.target.closest("[data-o]");if(!b)return;F.only=!!b.dataset.o;$$("#nonly .chip").forEach(c=>c.setAttribute("aria-pressed",c===b));refNotes()};
  $("#nreset").onclick=()=>{Object.assign(F,{q:"",month:"",type:""});$("#nq").value=$("#nfMonth").value=$("#nfType").value="";refNotes()};
  $("#nbody").onclick=e=>{const tr=e.target.closest("tr[data-id]");if(tr)openDrawer(tr.dataset.id,"notes")};
  refNotes()}
function refNotes(){if(!$("#nbody"))return;const F=S.noteF,q=F.q.trim().toLowerCase();
  $("#nMonthH").textContent=F.month?`${F.month.replace("-",".")} 특이사항`:"특이사항";
  const rows=sitesSorted().map(s=>{const all=S.notes.filter(n=>n.siteId===s.id&&(!F.type||n.type===F.type));const nameHit=textHit(q,s.f[NAME]);
      const list=nameHit?all:all.filter(n=>textHit(q,n.title,n.content));const inM=list.filter(n=>noteInMonth(n,F.month));
      const base=baseNotes(s),wn=wnHas(s.id);return {s,list,inM,base,wn,hit:nameHit||list.length||(!F.type&&(textHit(q,...base.map(b=>b[1]))))}})
    .filter(r=>r.hit&&(F.month||F.type?r.inM.length||!F.only&&!F.type:!F.only||r.list.length||r.base.length||r.wn));
  rows.sort((a,b)=>b.inM.length-a.inM.length||(b.list[0]?.month||"").localeCompare(a.list[0]?.month||"")||(a.s.order??999)-(b.s.order??999));
  const tot=rows.reduce((n,r)=>n+r.inM.length,0);
  $("#ncount").innerHTML=`<b>${rows.length}</b>곳 · ${F.month?F.month.replace("-",".")+" ":""}특이사항 <b>${tot}</b>건`;
  const n=v=>v?`<span class="num-b">${v}</span>`:`<span class="muted">0</span>`,yes=v=>v?`<span class="pill p-acc">있음</span>`:`<span class="muted">—</span>`;
  $("#nbody").innerHTML=rows.length?rows.map(({s,list,inM,base,wn})=>{const last=list.slice().sort((a,b)=>(b.month||"").localeCompare(a.month||""))[0];
      return `<tr data-id="${esc(s.id)}"><td>${hl(s.f[NAME]||"(이름 없음)",F.q.trim())}</td><td>${esc(s.f["소속부서"]||"")}</td>
        <td class="num">${n(inM.length)}</td><td class="num">${n(list.filter(x=>x.repeat).length)}</td><td class="num">${n(list.length)}</td>
        <td class="mono">${last?esc(last.month||""):""}</td><td class="clip">${last?esc(last.title||""):`<span class="muted">—</span>`}</td>
        <td>${yes(base.length)}</td><td>${yes(wn)}</td></tr>`}).join("")
    :`<tr><td colspan="9"><div class="empty"><b>${S.notes.length?"조건에 맞는 사업장이 없습니다":"아직 입력된 급여 특이사항이 없습니다"}</b>${S.notes.length?"귀속월이나 필터를 바꿔 보세요.":"‘전체 사업장’을 누르고 사업장을 골라 첫 특이사항을 입력하세요."}</div></td></tr>`}

/* ===== 사업장 상세 안의 노무 문제·급여 특이사항 입력 ===== */
function strip(o){const c={...o};delete c.id;return c}
function issueForm(i){i=i||{date:today(),risk:"보통",status:STATUSES[0],type:ISSUE_TYPES[0]};return `<form class="form card" style="padding:16px" id="dForm">
  <h3 class="sec-t" style="margin:0">${i.id?"노무 문제 수정":"노무 문제 입력"}</h3>
  <div class="row2"><label class="f">발생일<input class="i" type="date" name="date" value="${esc(i.date||"")}" required></label><label class="f">유형<select class="i" name="type">${ISSUE_TYPES.map(t=>`<option ${t===i.type?"selected":""}>${t}</option>`).join("")}</select></label></div>
  <label class="f">제목<input class="i" name="title" required placeholder="예) 연장근로수당 미지급 문의" value="${esc(i.title||"")}"></label>
  <label class="f">내용<textarea class="i" name="content" rows="4" placeholder="경위, 관련 직원, 요구사항 등">${esc(i.content||"")}</textarea></label>
  <div class="row2"><label class="f">위험도<select class="i" name="risk">${RISKS.map(r=>`<option ${r===i.risk?"selected":""}>${r}</option>`).join("")}</select></label><label class="f">처리상태<select class="i" name="status">${STATUSES.map(s=>`<option ${s===i.status?"selected":""}>${s}</option>`).join("")}</select></label></div>
  <label class="f">담당자<input class="i" name="owner" placeholder="예) 배유진" value="${esc(i.owner||"")}"></label>
  <label class="f">처리 결과 / 조치<textarea class="i" name="result" rows="2" placeholder="완료 시 결과를 남겨 주세요">${esc(i.result||"")}</textarea></label>
  <div style="display:flex;gap:8px"><button class="btn pri" type="submit">${i.id?"수정 저장":"등록"}</button><button class="btn" type="button" data-fcancel>취소</button></div></form>`}
function noteForm(n){n=n||{month:S.noteF.month||thisMonth(),type:NOTE_TYPES[0]};return `<form class="form card" style="padding:16px" id="dForm">
  <h3 class="sec-t" style="margin:0">${n.id?"특이사항 수정":"특이사항 입력"}</h3>
  <div class="row2"><label class="f">귀속월<input class="i" type="month" name="month" value="${esc(n.month||"")}" required></label><label class="f">구분<select class="i" name="type">${NOTE_TYPES.map(t=>`<option ${t===n.type?"selected":""}>${t}</option>`).join("")}</select></label></div>
  <label class="f">제목<input class="i" name="title" required placeholder="예) 교육생 식대 회입" value="${esc(n.title||"")}"></label>
  <label class="f">내용<textarea class="i" name="content" rows="4" placeholder="대상자, 산정기준, 청구 반영 여부 등">${esc(n.content||"")}</textarea></label>
  <div class="row2"><label class="f">금액(원, 선택)<input class="i" type="number" name="amount" min="0" step="1" placeholder="0" value="${n.amount||""}"></label>
    <label class="f">반복<span style="display:flex;align-items:center;gap:8px;height:36px;color:var(--ink)"><input type="checkbox" class="tog" name="repeat" ${n.repeat?"checked":""}>매월 반복 적용</span></label></div>
  <div style="display:flex;gap:8px"><button class="btn pri" type="submit">${n.id?"수정 저장":"등록"}</button><button class="btn" type="button" data-fcancel>취소</button></div></form>`}
function drawerIssues(s,iss){const can=db&&!readOnly,F=S.dForm;
  return (F&&F.kind==="issue"?issueForm(F.id&&S.issues.find(x=>x.id===F.id)):can?`<div style="display:flex;justify-content:flex-end"><button class="btn sm pri" data-fnew="issue">노무 문제 추가</button></div>`:"")+
    (iss.length?`<div class="card list">${iss.slice().sort(issueSort).map(i=>issueRow(i,true)).join("")}</div>`:`<div class="empty"><b>등록된 노무 문제가 없습니다</b>${can?"‘노무 문제 추가’를 눌러 입력하세요.":""}</div>`)}
function drawerNotes(s,nts){const can=db&&!readOnly,F=S.dForm,base=baseNotes(s),w=S.wagenotes[s.id]||{};const d=S.dDirty&&S.wnDraft?S.wnDraft:{ordinary:w.ordinary||"",severance:w.severance||""};
  return `<section><h3 class="sec-t">월별 급여 특이사항</h3><div style="display:flex;flex-direction:column;gap:10px">`+
    (F&&F.kind==="note"?noteForm(F.id&&S.notes.find(x=>x.id===F.id)):can?`<div style="display:flex;justify-content:flex-end"><button class="btn sm pri" data-fnew="note">특이사항 추가</button></div>`:"")+
    (nts.length?`<div class="card list">${nts.slice().sort((a,b)=>(b.month||"").localeCompare(a.month||"")).map(n=>noteRow(n,true)).join("")}</div>`:`<div class="empty"><b>월별 급여 특이사항이 없습니다</b>${can?"‘특이사항 추가’를 눌러 입력하세요.":""}</div>`)+`</div></section>`+
    (base.length?`<section><h3 class="sec-t">급여기초 자료의 특이사항</h3><dl class="kv">${base.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl></section>`:"")+
    `<section id="wnBox"><div style="display:flex;align-items:center;gap:10px"><h3 class="sec-t" style="margin:0">통상임금·퇴직금 메모</h3><span class="tiny muted">${w.updatedAt?`마지막 저장 ${esc(w.updatedAt.slice(0,10))}`:""}</span>${can?`<button class="btn sm pri" id="wnSave" style="margin-left:auto">메모 저장</button>`:""}</div>
      <label class="f" style="margin-top:8px">통상임금 항목이나 포함하지 않는 임금항목<span class="tiny muted">임금체불에 대한 문제 발생이 있는 급여항목</span><textarea class="i" id="wnOrdinary" rows="3" ${can?"":"disabled"} placeholder="사업장에서 통상임금에 포함/제외한 임금항목과 그 근거를 적어 주세요">${esc(d.ordinary)}</textarea></label>
      <label class="f" style="margin-top:8px">퇴직금 평균임금(통상임금)이나 포함하지 않는 임금항목<span class="tiny muted">임금체불에 대한 문제 발생이 있는 급여항목</span><textarea class="i" id="wnSeverance" rows="3" ${can?"":"disabled"} placeholder="퇴직금 평균임금 산정 시 포함/제외한 임금항목과 그 근거를 적어 주세요">${esc(d.severance)}</textarea></label></section>`}
function bindDrawerRecords(root,s){const body=$(".drawer .db",root);if(!body)return;
  const redraw=()=>renderDrawer(true);
  body.addEventListener("click",e=>{const t=e.target;
    const nw=t.closest("[data-fnew]");if(nw){S.dForm={kind:nw.dataset.fnew,id:null};redraw();$("#dForm [name=title]")?.focus();return}
    if(t.closest("[data-fcancel]")){S.dForm=null;redraw();return}
    const ie=t.closest("[data-ied]");if(ie){S.dForm={kind:"issue",id:ie.dataset.ied};redraw();$("#dForm").scrollIntoView({block:"nearest"});return}
    const ne=t.closest("[data-ned]");if(ne){S.dForm={kind:"note",id:ne.dataset.ned};redraw();$("#dForm").scrollIntoView({block:"nearest"});return}
    const idl=t.closest("[data-idel]");if(idl){armDelete(idl,async()=>{try{await db.doc("issues/"+idl.dataset.idel).delete();toast("삭제했습니다");redraw()}catch(x){err(x)}});return}
    const ndl=t.closest("[data-ndel]");if(ndl){armDelete(ndl,async()=>{try{await db.doc("notes/"+ndl.dataset.ndel).delete();toast("삭제했습니다");redraw()}catch(x){err(x)}});return}
    if(t.id==="wnSave"){const d={ordinary:$("#wnOrdinary").value,severance:$("#wnSeverance").value};
      (async()=>{try{await db.doc("wagenotes/"+s.id).set({...d,updatedAt:new Date().toISOString(),by:uid||""});S.dDirty=false;S.wnDraft=null;toast("메모를 저장했습니다");redraw()}catch(x){err(x)}})()}});
  body.addEventListener("change",async e=>{const st=e.target.closest("[data-st]");if(!st)return;
    try{await db.doc("issues/"+st.dataset.st).update({status:st.value,updatedAt:new Date().toISOString()});toast("상태를 ‘"+st.value+"’(으)로 바꿨습니다")}catch(x){err(x)}});
  body.addEventListener("input",e=>{if(e.target.id==="wnOrdinary"||e.target.id==="wnSeverance"){S.dDirty=true;S.wnDraft={ordinary:$("#wnOrdinary").value,severance:$("#wnSeverance").value}}});
  const f=$("#dForm",root);if(f)f.addEventListener("submit",async e=>{e.preventDefault();const v=k=>(f.elements[k].value||"").trim(),now=new Date().toISOString(),F=S.dForm;
    try{if(F.kind==="issue"){const d={siteId:s.id,date:v("date"),type:v("type"),title:v("title"),content:v("content"),status:v("status"),risk:v("risk"),owner:v("owner"),result:v("result"),updatedAt:now};
        if(F.id){const o=S.issues.find(x=>x.id===F.id)||{};await db.doc("issues/"+F.id).set({...strip(o),...d});toast("수정했습니다")}else{await db.collection("issues").add({...d,by:uid||"",createdAt:now});toast("등록했습니다")}}
      else{const d={siteId:s.id,month:v("month"),type:v("type"),title:v("title"),content:v("content"),amount:+v("amount")||0,repeat:f.elements.repeat.checked,updatedAt:now};
        if(F.id){const o=S.notes.find(x=>x.id===F.id)||{};await db.doc("notes/"+F.id).set({...strip(o),...d});toast("수정했습니다")}else{await db.collection("notes").add({...d,by:uid||"",createdAt:now});toast("등록했습니다")}}
      S.dForm=null;redraw()}catch(x){err(x)}})}

/* ---------- 데이터 연결 ----------
   js/config.js 에 Supabase 주소·키가 있으면 Supabase(js/store-supabase.js), 없으면 이 브라우저(js/store.js) */
window.WV={go,close:closeDrawer};
const supa=!!(window.SupaDB&&window.SupaDB.enabled);
dl={save:async({filename,data})=>{const a=document.createElement("a");a.href=URL.createObjectURL(data);a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}};
window.WV_onStoreError=e=>toast("Supabase에서 불러오지 못했습니다: "+(e.message||"연결을 확인하세요"));
const sub=(col,fn)=>db.collection(col).onSnapshot(snap=>{fn(snap.docs.map(d=>({id:d.id,...d.data()})));S.loaded[col]=true;refresh()});
async function boot(){
  if(supa){try{user=await window.SupaDB.connect()}catch(e){console.error(e);return}
    db=window.SupaDB;$("#conn").innerHTML=`Supabase 공용 저장소<br><span class="mono">${esc(user.email||"")}</span>`;
    $("#bkReset").textContent="이 브라우저 데이터 올리기";$("#bkReset").classList.remove("danger");
    $("#bkReset").insertAdjacentHTML("afterend",`<button class="btn sm" id="bkLogout">로그아웃</button>`);
    $("#bkLogout").onclick=()=>window.SupaDB.signOut()}
  else db=window.LocalDB;
  render();
  sub("sites",a=>{S.sites=a.map(x=>({...x,f:x.f||{}}));applyFixes()});
  sub("issues",a=>S.issues=a);
  sub("notes",a=>S.notes=a);
  sub("wagenotes",a=>{const m={};a.forEach(x=>m[x.id]=x);S.wagenotes=m});
}
let fixing=false;
async function applyFixes(){if(readOnly||fixing)return;const by={};DATA_FIXES.forEach(([id,k,from,to])=>{const s=S.sites.find(x=>x.id===id);if(s&&s.f[k]===from)(by[id]=by[id]||{...s.f})[k]=to});
  if(!Object.keys(by).length)return;fixing=true;
  try{for(const id in by)await db.doc("sites/"+id).update({f:by[id],updatedAt:new Date().toISOString()});fixing=false}
  catch(e){console.error(e);return} // 실패하면 이번 접속 동안은 다시 시도하지 않음
  applyFixes()}
/* 백업 */
$("#bkExport").onclick=()=>dl.save({filename:`급여기초_전체_${today()}.csv`,data:new Blob([sitesCsv(sitesSorted())],{type:"text/csv;charset=utf-8"})});
$("#bkImport").onclick=()=>$("#bkFile").click();
$("#bkFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{await db.importJSON(await f.text());toast("백업을 불러왔습니다")}catch(x){toast("불러오지 못했습니다: "+(x.message||"파일 형식을 확인하세요"))}e.target.value=""};
// Supabase 모드: 이 브라우저(localStorage)의 기존 데이터를 공용 저장소로 올림 (같은 id 는 덮어씀)
$("#bkReset").onclick=e=>armDelete(e.currentTarget,async()=>{
  if(!supa){db.reset();toast("엑셀 원본 상태로 초기화했습니다");return}
  try{const n=await window.SupaDB.uploadLocal();toast(`이 브라우저 데이터 ${n}건을 올렸습니다`)}catch(x){err(x)}},supa?"한 번 더 눌러 올리기":"");
render();
boot();

})();
