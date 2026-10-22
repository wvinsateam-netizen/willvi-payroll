(function(){
"use strict";
/* ---------- 상수 ---------- */
const COLS=["사업장명","사업자번호","대표자명","계약유지상태","최초계약일","갱신예정일","업무담당자명","업무담당자 연락처","사업장 코드","원가중심점","경영지원본부 인사담당자","소속부서","사업부담당자","사업부담당자 연락처","CRM 전화응대 담당자","전화 응대 연락처","급여/총무 담당자","급여 총무 연락처","급여일","급여산정 시작일","급여산정 종료일","파견/도급구분","업무내용","계약형태 (도급, I/H, F/O, 파견)","업무형태 (I/B,O/B,파견 등)","청구형태 (인원, 콜, 업무도급, 성과유지 등)","근로자 계약형태","근로자 근무형태","근무시간","휴게시간","휴일기준","청구일","고객사 요청사항","이전 고객사 이슈 사항","퇴직금 적립방식","퇴직금적립방식 변경사항 (발생대상 사업장만 작성)","연차수당 적립방식","신원보증보험","월청구분 당사입금일","퇴직연금DC사업장 근로계약 필수 작성시기","사업장 주소지(실근무지)","산재개시번호","기타","특이사항","사업장명 변경 전(2024-12)","생일축하금 (금액기재)","설,추석 선물 여부","근로자의날 선물 여부"];
const NAME="사업장명";
const BASIC=["사업자번호",NAME,"대표자명","계약유지상태","최초계약일","갱신예정일","업무담당자명","업무담당자 연락처"];
// 화면에 보이는 이름만 바꿈 (저장 데이터·엑셀 열 이름은 그대로)
const LABELS={"사업장 코드":"BMP 코드","전화 응대 연락처":"CRM 전화 응대 연락처","급여/총무 담당자":"CRM 급여/총무 담당자","급여 총무 연락처":"CRM 급여/총무 연락처"};
// 화면에서 뺀 항목 (저장된 값이 있어도 '추가 항목'에 보이지 않음)
const REMOVED=["순번","급여관련특이사항","등록일","청구 급여 업무 담당자","근태/연차 관리 담당자","계약시작일 (재계약일)","직접비율","매출비 품의"];
const lbl=k=>LABELS[k]||k;
const CONTRACT_STATES=["계약","종료"];
const DATE_COLS=["최초계약일","갱신예정일"];
// 날짜 칸 값 맞추기: 2019.4.1 · 2019/04/01 → 2019-04-01 (알 수 없는 형식은 null)
const isoDate=v=>{if(!v)return "";const m=String(v).trim().match(/^(\d{4})\D(\d{1,2})\D(\d{1,2})$/);return m?`${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`:null};
// 사업자등록번호: 숫자만 남겨 000-00-00000 으로
const bizNo=v=>{const d=String(v||"").replace(/\D/g,"").slice(0,10);return d.length>5?`${d.slice(0,3)}-${d.slice(3,5)}-${d.slice(5)}`:d.length>3?`${d.slice(0,3)}-${d.slice(3)}`:d};
// 중복 체크 항목: 값은 "도급직, 파견직"처럼 쉼표로 이어 저장
const MULTI={"근로자 계약형태":["도급직","파견직","계약직","기타"],"근로자 근무형태":["주40시간","단시간","초단기","2교대","3교대","감단직","일용직"]};
const splitMulti=v=>String(v||"").split(",").map(x=>x.trim()).filter(Boolean);
const GROUPS={
  "기본":["소속부서","사업부담당자","파견/도급구분","최초계약일","업무내용","급여일","경영지원본부 인사담당자"],
  "업무담당자":["소속부서","사업부담당자","사업부담당자 연락처","CRM 전화응대 담당자","전화 응대 연락처","급여/총무 담당자","급여 총무 연락처","경영지원본부 인사담당자"],
  "계약·청구":["파견/도급구분","계약형태 (도급, I/H, F/O, 파견)","업무형태 (I/B,O/B,파견 등)","청구형태 (인원, 콜, 업무도급, 성과유지 등)","근로자 계약형태","근로자 근무형태","근무시간","휴게시간","휴일기준","청구일","고객사 요청사항","이전 고객사 이슈 사항","월청구분 당사입금일"],
  "임금":["급여일","급여산정 시작일","급여산정 종료일","퇴직금 적립방식","퇴직금적립방식 변경사항 (발생대상 사업장만 작성)","연차수당 적립방식","퇴직연금DC사업장 근로계약 필수 작성시기","사업장 주소지(실근무지)","산재개시번호"],
  "복리후생":["신원보증보험","근로자의날 선물 여부","생일축하금 (금액기재)","설,추석 선물 여부"],
  "비고":["기타","특이사항","사업장명 변경 전(2024-12)"],
  "전체":COLS.filter(c=>c!==NAME)
};
const FILTERS=[["소속부서","소속부서"],["파견/도급구분","파견/도급"],["계약형태 (도급, I/H, F/O, 파견)","계약형태"],["급여일","급여일"],["퇴직금 적립방식","퇴직금 적립"]];
const HARASS="직장 내 괴롭힘·직장 내 성희롱";
const ISSUE_TYPES=["임금·체불","근로시간·연장","휴가·휴직","징계·해고·인사발령",HARASS,"불법파견","산업재해","퇴직금·연금","근로계약","4대보험","기타"];
const STATUSES=["진행중","미해결","종결"];
// 예전에 저장된 값 → 새 값 (불러올 때 바꿔서 보여 주고, 고쳐 저장하면 새 값으로 저장됨)
const OLD_ISSUE={status:{"접수":"진행중","완료":"종결"},type:{"직장 내 괴롭힘":HARASS,"징계·해고":"징계·해고·인사발령"}};
const normIssue=i=>({...i,status:OLD_ISSUE.status[i.status]||(STATUSES.includes(i.status)?i.status:"진행중"),type:OLD_ISSUE.type[i.type]||i.type});
const isOpen=i=>i.status!=="종결";
const SAFETY_TYPES=["안전보건교육","건강검진","위험성평가","안전점검","산업재해","안전보건개선계획 수립명령","기타"];
const SAFETY_STATES=["예정","완료"];
const ACC_KINDS=["업무상 사고","업무상 질병","출퇴근 재해","사망"];
const LEAVE_KINDS=["없음","3일 미만","3일 이상"];
const EMERG_ROLES=["현장 관리자(소장)","현장 안전담당","본사 담당","지사 담당","고객사 담당","가까운 병원","소방서 (119)"];
const BILL_TYPES=["인원 변동","단가·요율","추가 청구","차감·환불","정산","입금","기타"];
const NOTE_TYPES=["수당","공제","소급·정산","입·퇴사","휴직·복직","청구","기타"];
// 엑셀 원본이 바뀐 값을 이미 저장된 데이터에도 반영 (현재 값이 예전 값 그대로일 때만 바꿈 → 직접 고친 값은 유지)
// [사업장 id, 항목, 예전 값, 새 값]
const DATA_FIXES=[
  ["s03","경영지원본부 인사담당자","강미리","주예린"],["s04","경영지원본부 인사담당자","강미리","주예린"],
  ["s07","경영지원본부 인사담당자","강미리","주예린"],["s08","경영지원본부 인사담당자","강미리","주예린"]];

/* ---------- 상태 ---------- */
const S={view:"home",sites:[],issues:[],safety:[],notes:[],bills:[],wagenotes:{},loaded:{sites:false,issues:false,safety:false,notes:false,bills:false,wagenotes:false},laborF:{q:"",issue:"",safety:"",only:false},cState:"계약",
  siteF:{q:"",group:"기본",sort:null,dir:1},siteSel:{},recF:{notes:{q:"",month:"",type:"",only:false},bills:{q:"",month:"",type:"",only:false}},
  drawer:null,dTab:"info",dEdit:false,dForm:null,dDirty:false,wnDraft:null,bmDraft:null,sfDraft:null};
let db=null,user=null,uid=null,dl=null,readOnly=false;
const names={};
try{const v=localStorage.getItem("wv-view");if(v)S.view=v;localStorage.removeItem("wv-group");}catch(e){}

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
$("#main").addEventListener("click",e=>{const d=e.target.closest("[data-dl]");if(d&&S.view==="home")openDrawer(d.dataset.dl,"safety")});
$("#nav").addEventListener("click",e=>{const b=e.target.closest("button[data-v]");if(!b)return;go(b.dataset.v)});
// 메뉴를 열 때마다 처음 상태로: 청구·급여 특이사항, 노무관리는 전체 사업장, 급여기초는 기본 탭
// 계약유지상태 구분 (급여기초·청구·급여 특이사항·노무관리 공통). 비어 있으면 '계약'으로 봄
const CS_TABS=[["계약","계약"],["종료","종료"],["","전체"]];
const cstate=s=>s.f["계약유지상태"]==="종료"?"종료":"계약";
const inState=s=>!S.cState||cstate(s)===S.cState;
const sitesIn=()=>sitesSorted().filter(inState);
const csCount=v=>v?S.sites.filter(s=>cstate(s)===v).length:S.sites.length;
const csTabs=()=>`<div class="cstabs" role="tablist" aria-label="계약유지상태">${CS_TABS.map(([v,l])=>`<button role="tab" data-cs="${v}" aria-selected="${S.cState===v}">${l} <span class="n">${csCount(v)}</span></button>`).join("")}</div>`;
function updCs(){$$(".cstabs [data-cs]").forEach(b=>{b.setAttribute("aria-selected",S.cState===b.dataset.cs);b.querySelector(".n").textContent=csCount(b.dataset.cs)})}
document.addEventListener("click",e=>{const b=e.target.closest(".cstabs [data-cs]");if(!b)return;S.cState=b.dataset.cs;updCs();
  ({sites:refSites,bills:()=>refRec("bills"),notes:()=>refRec("notes"),issues:refLabor}[S.view]||(()=>{}))()});
const ALL_FIRST={bills:()=>S.recF.bills,notes:()=>S.recF.notes,issues:()=>S.laborF};
function go(v,opt){S.view=v;if(ALL_FIRST[v])ALL_FIRST[v]().only=false;if(v==="sites")S.siteF.group="기본";if(ALL_FIRST[v]||v==="sites")S.cState="계약";try{localStorage.setItem("wv-view",v)}catch(e){}if(opt)Object.assign(S,opt);render();window.scrollTo(0,0)}
function counts(){$("#c-sites").textContent=S.sites.length;$("#c-issues").textContent=S.issues.filter(isOpen).length+lateCount();
  $("#c-notes").textContent=S.notes.filter(n=>n.month===thisMonth()).length;$("#c-bills").textContent=S.bills.filter(n=>n.month===thisMonth()).length;
  $$("#nav button").forEach(b=>b.setAttribute("aria-current",b.dataset.v===S.view?"page":"false"))}

/* ---------- 렌더 ---------- */
function render(){counts();const m=$("#main");
  const banner=readOnly?`<div class="banner">보기 전용입니다.</div>`:"";
  m.innerHTML=banner+({home:vHome,sites:vSites,bills:()=>vRec("bills"),issues:vLabor,notes:()=>vRec("notes")}[S.view]||vHome)();
  ({home:()=>{},sites:bindSites,bills:()=>bindRec("bills"),issues:bindLabor,notes:()=>bindRec("notes")}[S.view]||(()=>{}))();
  fillNames();renderDrawer()}
function refresh(){counts();({home:()=>render(),sites:refSites,bills:()=>refRec("bills"),issues:refLabor,notes:()=>refRec("notes")}[S.view]||render)();if(S.drawer)renderDrawer();fillNames()}

/* ===== 홈 ===== */
function vHome(){const n=S.sites.length,open=S.issues.filter(isOpen),mon=S.notes.filter(x=>x.month===thisMonth()),bmon=S.bills.filter(x=>x.month===thisMonth());
  const by=(k)=>{const m={};S.sites.forEach(s=>{const v=(s.f[k]||"미기재").trim();m[v]=(m[v]||0)+1});return Object.entries(m).sort((a,b)=>b[1]-a[1])};
  const bars=(arr,suf="",colorOf)=>{const mx=Math.max(1,...arr.map(a=>a[1]));return `<div class="bars">${arr.map(([k,c])=>`<div class="r"><span title="${esc(k)}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(k)}${suf}</span><span class="t"><i style="width:${c/mx*100}%${colorOf?`;background:${colorOf(k)}`:""}"></i></span><span class="c">${c}</span></div>`).join("")}</div>`};
  const t=today(),DL=deadlines().filter(d=>d.due<=addDays(t,30)),late=DL.filter(d=>d.due<t).length,cost=open.reduce((a,i)=>a+(+i.cost||0),0);
  const recent=S.issues.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,5);
  return `<div class="page-h"><div><h1>급여·노무 관리 홈</h1><p>사업장별 급여기초 정보, 청구 특이사항, 급여 특이사항, 노무관리(노무 문제·산업안전보건)를 한곳에서 관리합니다.</p></div></div>
  <div class="grid g-stats" style="margin-bottom:16px">
    <button class="stat" onclick="WV.go('sites')"><span class="l">관리 사업장</span><span class="v">${n}<small>곳</small></span><span class="n">급여기초 등록 기준</span></button>
    <button class="stat" onclick="WV.go('bills')"><span class="l">${thisMonth().replace("-","년 ")}월 청구 특이사항</span><span class="v">${bmon.length}<small>건</small></span><span class="n">전체 ${S.bills.length}건</span></button>
    <button class="stat" onclick="WV.go('notes')"><span class="l">${thisMonth().replace("-","년 ")}월 급여 특이사항</span><span class="v">${mon.length}<small>건</small></span><span class="n">전체 ${S.notes.length}건</span></button>
    <button class="stat" onclick="WV.go('issues')"><span class="l">종결 전 노무 문제</span><span class="v" style="color:${open.length?"var(--bad)":"inherit"}">${open.length}<small>건</small></span><span class="n">진행중 ${open.filter(i=>i.status==="진행중").length} · 미해결 ${open.filter(i=>i.status==="미해결").length}${cost?` · <b style="color:var(--bad)">지출 예정 ${won(cost)}원</b>`:""}${late?` · <b style="color:var(--bad)">안전보건 기한 지남 ${late}</b>`:""}</span></button>
  </div>
  <div class="grid g-2">
    <div class="card"><div class="hd"><h2>최근 노무 문제</h2><button class="btn sm" style="margin-left:auto" onclick="WV.go('issues')">전체 보기</button></div>
      ${recent.length?`<div class="list">${recent.map(i=>issueRow(i)).join("")}</div>`:`<div class="empty"><b>등록된 노무 문제가 없습니다</b>노무관리 메뉴에서 사업장별 노무 문제를 입력하면 여기에 최근 5건이 표시됩니다.</div>`}</div>
    <div class="grid">
      <div class="card"><div class="hd"><h2>안전보건 기한 알림</h2><span class="sub">기한 지남·30일 이내</span></div>${DL.length?`<div class="list">${DL.slice(0,8).map(d=>`<div class="item" style="cursor:pointer" data-dl="${esc(d.siteId)}"><span class="bar" style="background:${d.due<t?"var(--bad)":"var(--warn)"}"></span><div style="min-width:0"><div class="meta"><b style="color:var(--ink)">${esc(siteName(d.siteId))}</b><span>${esc(d.what)}</span></div><h3 style="font-size:13.5px">${esc(d.title)}</h3></div><div class="side"><span class="mono" style="font-weight:700;color:${d.due<t?"var(--bad)":"var(--warn)"}">${dday(d.due)}</span><span class="mono tiny muted">${esc(d.due)}</span></div></div>`).join("")}</div>`:`<div class="bd"><div class="muted">30일 안에 다가오는 안전보건 기한이 없습니다.</div></div>`}</div>
      <div class="card"><div class="hd"><h2>급여일별 사업장</h2></div><div class="bd">${n?bars(by("급여일").map(([k,c])=>[/^\d+$/.test(k)?k+"일":k,c])):`<div class="muted">사업장 정보를 불러오는 중입니다.</div>`}</div></div>
    </div>
  </div>`}

/* ===== 급여기초 ===== */
function vSites(){return `<div class="page-h"><div><h1>급여기초</h1><p>사업장별 급여·계약·담당자 정보입니다. 조건을 조합해 필터링하고, 행을 누르면 상세 정보와 해당 사업장의 노무 문제·특이사항을 함께 볼 수 있습니다.</p></div>
  <div class="act">${xlBtns("sites")}<button class="btn pri" id="addSite" ${!db||readOnly?"disabled":""}>사업장 추가</button></div></div>
  ${csTabs()}
  <div class="card">
    <div class="bd" style="border-bottom:1px solid var(--line)"><div class="filters">
      <label class="f q">전체 검색<input class="i" id="sq" type="search" placeholder="사업장명, 담당자, 주소, 특이사항 등" value="${esc(S.siteF.q)}"></label>
      ${FILTERS.map(([k,l],i)=>`<label class="f">${esc(l)}<select class="i" id="sf${i}" data-k="${esc(k)}"></select></label>`).join("")}
    </div></div>
    <div class="toolbar"><span class="count" id="scount"></span><span class="chips" id="groups">${Object.keys(GROUPS).map(g=>`<button class="chip" data-g="${esc(g)}" aria-pressed="${g===S.siteF.group}">${esc(g)}</button>`).join("")}</span>
      <button class="btn sm" id="sreset" style="margin-left:auto">필터 초기화</button></div>
    <div class="tbl-wrap"><table class="sitetbl"><thead id="shead"></thead><tbody id="sbody"></tbody></table></div>
  </div>`}
function siteFiltered(){const q=S.siteF.q.trim().toLowerCase();return sitesIn().filter(s=>{
  for(const [k] of FILTERS){const v=S.siteSel[k];if(v&&((s.f[k]||"미기재").trim()!==v))return false}
  if(q&&!Object.values(s.f).some(v=>String(v).toLowerCase().includes(q)))return false;return true})}
function bindSites(){$("#sq").addEventListener("input",e=>{S.siteF.q=e.target.value;refSites()});
  FILTERS.forEach((_,i)=>$("#sf"+i).addEventListener("change",e=>{S.siteSel[e.target.dataset.k]=e.target.value;refSites()}));
  $("#groups").addEventListener("click",e=>{const b=e.target.closest("[data-g]");if(!b)return;S.siteF.group=b.dataset.g;$$("#groups .chip").forEach(c=>c.setAttribute("aria-pressed",c===b));refSites()});
  $("#sreset").addEventListener("click",()=>{S.siteF.q="";S.siteSel={};$("#sq").value="";refSites()});
  $("#shead").addEventListener("click",e=>{const th=e.target.closest("th[data-k]");if(!th)return;const k=th.dataset.k;if(S.siteF.sort===k)S.siteF.dir*=-1;else{S.siteF.sort=k;S.siteF.dir=1}refSites()});
  $("#sbody").addEventListener("click",e=>{const tr=e.target.closest("tr[data-id]");if(tr)openDrawer(tr.dataset.id)});
  $("#addSite").addEventListener("click",()=>{S.drawer="__new";S.dEdit=true;S.dTab="info";renderDrawer()});
  refSites()}
function refSites(){if(!$("#sbody"))return;
  FILTERS.forEach(([k,l],i)=>{const sel=$("#sf"+i);const vals=[...new Set(S.sites.map(s=>(s.f[k]||"미기재").trim()))].sort((a,b)=>a.localeCompare(b,"ko",{numeric:true}));
    sel.innerHTML=`<option value="">전체</option>`+vals.map(v=>`<option>${esc(v)}</option>`).join("");sel.value=S.siteSel[k]||"";if(sel.value!==(S.siteSel[k]||""))S.siteSel[k]=""});
  let rows=siteFiltered();const cols=GROUPS[S.siteF.group];
  if(S.siteF.sort){const k=S.siteF.sort,d=S.siteF.dir;rows.sort((a,b)=>String(a.f[k]||"").localeCompare(String(b.f[k]||""),"ko",{numeric:true})*d)}
  const active=Object.values(S.siteSel).filter(Boolean).length+(S.siteF.q?1:0);
  updCs();$("#scount").innerHTML=`<b>${rows.length}</b> / ${sitesIn().length}곳 ${active?`· 조건 ${active}개 적용`:""}`;
  const arrow=k=>S.siteF.sort===k?(S.siteF.dir>0?" ▲":" ▼"):"";
  $("#shead").innerHTML=`<tr>${[NAME,...cols].map(k=>`<th data-k="${esc(k)}" class="${S.siteF.sort===k?"sorted":""}">${esc(lbl(k))}${arrow(k)}</th>`).join("")}</tr>`;
  const q=S.siteF.q.trim();const mono=k=>/코드|연락처|급여일|산정|번호|계약일|예정일|계약시작일|순번/.test(k);
  $("#sbody").innerHTML=rows.length?rows.map(s=>`<tr data-id="${esc(s.id)}"><td>${hl(s.f[NAME]||"(이름 없음)",q)}</td>${cols.map(k=>`<td class="${mono(k)?"mono":""}">${hl(s.f[k]||"",q)}</td>`).join("")}</tr>`).join("")
    :`<tr><td colspan="${cols.length+1}"><div class="empty"><b>${S.sites.length?"조건에 맞는 사업장이 없습니다":"사업장 정보가 아직 없습니다"}</b>${S.sites.length?"필터를 줄이거나 초기화해 보세요.":"‘사업장 추가’로 첫 사업장을 등록하세요."}</div></td></tr>`}

/* ===== 사업장 상세 드로어 ===== */
function openDrawer(id,tab){Object.assign(S,{drawer:id,dTab:tab||"info",dEdit:false,dForm:null,dDirty:false,wnDraft:null,bmDraft:null,sfDraft:null,dWarn:false});renderDrawer(true)}
function closeDrawer(){if(!leaveOk())return;Object.assign(S,{drawer:null,dEdit:false,dForm:null,dDirty:false,wnDraft:null,bmDraft:null,sfDraft:null});renderDrawer(true)}
// 입력 중인 내용이 있으면 한 번은 막고 알림, 다시 누르면 버리고 진행
function leaveOk(){if(!(S.dForm||S.dDirty)||S.dWarn){S.dWarn=false;return true}S.dWarn=true;toast("저장하지 않은 입력이 있습니다. 다시 누르면 버리고 이동합니다.");setTimeout(()=>S.dWarn=false,4000);return false}
function renderDrawer(force){const root=$("#drawer-root");if(!S.drawer){root.innerHTML="";return}
  const isNew=S.drawer==="__new";const s=isNew?{id:"__new",f:{}}:S.sites.find(x=>x.id===S.drawer);if(!s){root.innerHTML="";S.drawer=null;return}
  if(!force&&(S.dEdit&&root.querySelector("#siteForm")||(S.dForm||S.dDirty)&&root.querySelector(".drawer")))return; // 입력 중엔 다시 그리지 않음
  const iss=S.issues.filter(i=>i.siteId===s.id),mine=k=>S[k].filter(n=>n.siteId===s.id);
  const tabs=[["info","기본 정보"],["bills",`청구 특이사항 ${mine("bills").length}`],["notes",`급여 특이사항 ${mine("notes").length}`],["issues",`노무 문제 ${iss.length}`],["safety",`안전보건 ${mine("safety").length}`]];
  let body="";
  if(S.dEdit){body=`<form id="siteForm" class="form">${COLS.map((k,i)=>{if(k==="계약유지상태")return `<div class="f"><span>${esc(lbl(k))}</span><span class="cbox">${CONTRACT_STATES.map(v=>`<label><input type="checkbox" data-k="${esc(k)}" value="${esc(v)}" ${s.f[k]===v?"checked":""}>${esc(v)}</label>`).join("")}</span></div>`;
    if(MULTI[k]){const on=splitMulti(s.f[k]);return `<div class="f"><span>${esc(lbl(k))}</span><span class="cbox">${MULTI[k].map(v=>`<label><input type="checkbox" data-k="${esc(k)}" value="${esc(v)}" ${on.includes(v)?"checked":""}>${esc(v)}</label>`).join("")}</span></div>`}
    if(DATE_COLS.includes(k)&&isoDate(s.f[k])!==null)return `<label class="f">${esc(lbl(k))}<input class="i" type="date" id="sfld${i}" data-k="${esc(k)}" value="${esc(isoDate(s.f[k]))}"></label>`;
    if(k==="사업자번호")return `<label class="f">${esc(lbl(k))}<input class="i mono" id="sfld${i}" data-k="${esc(k)}" value="${esc(s.f[k]?bizNo(s.f[k]):"")}" inputmode="numeric" maxlength="12" placeholder="000-00-00000"></label>`;const long=/주소|특이사항|기타|업무내용|요청사항|이슈/.test(k);return `<label class="f">${esc(lbl(k))}${long?`<textarea class="i" id="sfld${i}" data-k="${esc(k)}" rows="2">${esc(s.f[k]||"")}</textarea>`:`<input class="i" id="sfld${i}" data-k="${esc(k)}" value="${esc(s.f[k]||"")}" ${k===NAME?"required":""}>`}</label>`}).join("")}
    <div style="display:flex;gap:8px;position:sticky;bottom:0;background:var(--surface);padding-block:10px"><button class="btn pri" type="submit">저장</button><button class="btn" type="button" id="dCancel">취소</button>${isNew?"":`<button class="btn danger" type="button" id="dDel" style="margin-left:auto">사업장 삭제</button>`}</div></form>`}
  else if(S.dTab==="info"){const sec=(t,ks)=>`<section><h3 class="sec-t">${esc(t)}</h3><dl class="kv">${ks.map(k=>`<dt>${esc(lbl(k))}</dt><dd class="${/연락처|코드|번호/.test(k)?"mono":""}">${k==="계약유지상태"&&s.f[k]?`<span class="pill ${s.f[k]==="계약"?"p-acc":"p-neutral"}">${esc(s.f[k])}</span>`:esc(s.f[k]||"—")}</dd>`).join("")}</dl></section>`;
    const used=new Set();const out=["업무담당자","계약·청구","임금","복리후생","비고"].map(g=>{const ks=GROUPS[g].filter(k=>!used.has(k));ks.forEach(k=>used.add(k));return sec(g,ks)});
    out.unshift(sec("기본",[...BASIC,...["사업장 코드","원가중심점","업무내용"].filter(k=>!used.has(k))]));
    const extra=Object.keys(s.f).filter(k=>!COLS.includes(k)&&!REMOVED.includes(k));if(extra.length)out.push(sec("추가 항목",extra));body=out.join("")}
  else if(S.dTab==="issues")body=drawerIssues(s,iss);
  else if(S.dTab==="safety")body=drawerSafety(s,mine("safety"));
  else if(REC[S.dTab])body=drawerRec(S.dTab,s,mine(S.dTab));
  root.innerHTML=`<div class="drawer-bg" id="dBg"></div><div class="drawer" role="dialog" aria-modal="true" aria-label="사업장 상세">
    <div class="dh"><div style="min-width:0"><div class="tiny muted mono">${esc(s.f["사업장 코드"]?"코드 "+s.f["사업장 코드"]:"")} ${esc(s.f["소속부서"]||"")}</div><h2>${isNew?"새 사업장":esc(s.f[NAME]||"(이름 없음)")}</h2>
      <div class="chips" style="margin-top:6px">${s.f["파견/도급구분"]?`<span class="pill p-neutral">${esc(s.f["파견/도급구분"])}</span>`:""}${s.f["급여일"]?`<span class="pill p-neutral">급여일 ${esc(s.f["급여일"])}${/^\d+$/.test(s.f["급여일"])?"일":""}</span>`:""}${iss.filter(isOpen).length?`<span class="pill p-open">종결 전 노무 ${iss.filter(isOpen).length}</span>`:""}</div></div>
      <div style="margin-left:auto;display:flex;gap:6px">${!S.dEdit&&!readOnly&&db?`<button class="btn sm" id="dEdit">정보 수정</button>`:""}<button class="btn sm" id="dClose" aria-label="닫기">닫기</button></div></div>
    ${S.dEdit?"":`<div class="tabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" data-t="${k}" aria-selected="${S.dTab===k}">${esc(l)}</button>`).join("")}</div>`}
    <div class="db">${body}</div></div>`;
  $("#dBg").onclick=closeDrawer;$("#dClose").onclick=closeDrawer;
  const ed=$("#dEdit");if(ed)ed.onclick=()=>{if(!leaveOk())return;Object.assign(S,{dEdit:true,dForm:null,dDirty:false,wnDraft:null,bmDraft:null,sfDraft:null});renderDrawer(true)};
  $$(".drawer .tabs button").forEach(b=>b.onclick=()=>{if(b.dataset.t===S.dTab||!leaveOk())return;Object.assign(S,{dTab:b.dataset.t,dForm:null,dDirty:false,wnDraft:null,bmDraft:null,sfDraft:null});renderDrawer(true)});
  if(!S.dEdit)bindDrawerRecords(root,s);
  const f=$("#siteForm");if(f){f.addEventListener("submit",async e=>{e.preventDefault();const nf={};
      // 화면에 없는 항목(추가 항목·삭제한 항목의 예전 값)은 그대로 보존
      Object.keys(s.f).forEach(k=>{if(!COLS.includes(k))nf[k]=s.f[k]});$$("[data-k]",f).forEach(el=>{if(el.type==="checkbox"&&!el.checked)return;const k=el.dataset.k,v=el.value.trim();if(!v)return;nf[k]=MULTI[k]&&nf[k]?nf[k]+", "+v:v});
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
const won0=n=>(+n||0)?won(n)+"원":"";
const stPill=s=>`<span class="pill ${s==="종결"?"p-done":s==="진행중"?"p-prog":"p-open"}">${esc(s)}</span>`;
// inDrawer: 사업장 상세 안에서 보일 때 (사업장명 생략, 수정·삭제 버튼 표시)
function issueRow(i,inDrawer){return `<div class="item s-${esc(i.status)}"><span class="bar"></span><div style="min-width:0">
  <div class="meta">${stPill(i.status)}${inDrawer?"":`<b style="color:var(--ink)">${esc(siteName(i.siteId))}</b>`}<span>${esc(i.type)}</span><span class="mono">${esc(i.date)}</span>${+i.cost?`<span class="mono" style="color:var(--bad)">지출 예정 ${won(i.cost)}원</span>`:""}${i.owner?`<span>담당 ${esc(i.owner)}</span>`:""}</div>
  <h3>${esc(i.title)}</h3>${i.content?`<p>${esc(i.content)}</p>`:""}${i.result?`<p class="tiny" style="margin-top:6px;color:var(--ok)">처리 결과 · ${esc(i.result)}</p>`:""}
  </div>
  ${inDrawer&&db&&!readOnly?`<div class="side"><select class="i" style="width:auto;padding:3px 8px;font-size:12px" data-st="${esc(i.id)}" aria-label="처리상태">${STATUSES.map(s=>`<option ${s===i.status?"selected":""}>${s}</option>`).join("")}</select><button class="btn sm" data-ied="${esc(i.id)}">수정</button><button class="btn sm danger" data-idel="${esc(i.id)}">삭제</button></div>`:""}</div>`}
const issueSort=(a,b)=>(isOpen(b)-isOpen(a))||((+b.cost||0)-(+a.cost||0))||(b.date||"").localeCompare(a.date||"");
// 사업장 표 공통: 검색어가 사업장명이나 기록 내용에 있으면 통과
const textHit=(q,...vals)=>!q||vals.some(v=>String(v||"").toLowerCase().includes(q));
/* ===== 노무관리 (노무 문제 · 산업안전보건관리) ===== */
// 첫 화면은 사업장 하나에 노무 문제·산업안전보건 요약을 함께 보여 줌
function vLabor(){const F=S.laborF;return `<div class="page-h"><div><h1>노무관리</h1><p>사업장별 노무 문제와 산업안전보건 관리 현황입니다. 사업장을 누르면 그 사업장의 노무 문제·안전보건 기록을 보고 입력·수정할 수 있습니다.</p></div><div class="act">${xlBtns("labor")}</div></div>
  ${csTabs()}
  <div class="card">
    <div class="bd" style="border-bottom:1px solid var(--line)"><div class="filters f3">
      <label class="f q">전체 검색<input class="i" id="lq" type="search" placeholder="사업장명, 제목, 내용, 담당자" value="${esc(F.q)}"></label>
      <label class="f">노무 문제<select class="i" id="lfIssue"><option value="">전체</option><option value="open">종결 전 (진행중·미해결)</option>${STATUSES.map(s=>`<option>${s}</option>`).join("")}</select></label>
      <label class="f">산업안전보건<select class="i" id="lfSafety"><option value="">전체</option><option value="late">기한 지남</option><option value="soon">기한 30일 이내</option>${SAFETY_STATES.map(s=>`<option>${s}</option>`).join("")}</select></label>
    </div></div>
    <div class="toolbar"><span class="count" id="lcount"></span>
      <span class="chips" id="lonly"><button class="chip" data-o="" aria-pressed="${!F.only}">전체 사업장</button><button class="chip" data-o="1" aria-pressed="${F.only}">기록 있는 사업장</button></span>
      <button class="btn sm" id="lreset" style="margin-left:auto">필터 초기화</button></div>
    <div class="tbl-wrap"><table class="sitetbl"><thead><tr><th>사업장명</th><th>소속부서</th><th class="num">노무 진행중</th><th class="num">노무 미해결</th><th class="num">지출 예정액</th><th>최근 노무 문제</th><th class="num">안전보건 기한 지남</th><th class="num">산업재해</th><th>다음 안전보건 기한</th></tr></thead><tbody id="lbody"></tbody></table></div>
  </div>`}
function bindLabor(){const F=S.laborF;$("#lfIssue").value=F.issue;$("#lfSafety").value=F.safety;
  $("#lq").oninput=e=>{F.q=e.target.value;refLabor()};
  $("#lfIssue").onchange=e=>{F.issue=e.target.value;refLabor()};$("#lfSafety").onchange=e=>{F.safety=e.target.value;refLabor()};
  $("#lonly").onclick=e=>{const b=e.target.closest("[data-o]");if(!b)return;F.only=!!b.dataset.o;$$("#lonly .chip").forEach(c=>c.setAttribute("aria-pressed",c===b));refLabor()};
  $("#lreset").onclick=()=>{Object.assign(F,{q:"",issue:"",safety:""});$("#lq").value=$("#lfIssue").value=$("#lfSafety").value="";refLabor()};
  $("#lbody").onclick=e=>{const tr=e.target.closest("tr[data-id]");if(!tr)return;const id=tr.dataset.id;
    const openI=S.issues.some(i=>i.siteId===id&&isOpen(i)),late=deadlines().some(d=>d.siteId===id&&d.due<today());
    openDrawer(id,openI&&!late?"issues":late||S.safety.some(x=>x.siteId===id)?"safety":"issues")};
  refLabor()}
function refLabor(){if(!$("#lbody"))return;const F=S.laborF,q=F.q.trim().toLowerCase(),t=today(),soon=addDays(t,30),DL=deadlines();
  const iHit=i=>!F.issue||(F.issue==="open"?isOpen(i):i.status===F.issue);
  const dHit=d=>F.safety==="late"?d.due<t:F.safety==="soon"?d.due>=t&&d.due<=soon:true;
  updCs();const rows=sitesIn().map(s=>{const nameHit=textHit(q,s.f[NAME]);
      let iss=S.issues.filter(i=>i.siteId===s.id&&iHit(i)),saf=S.safety.filter(x=>x.siteId===s.id&&(!SAFETY_STATES.includes(F.safety)||x.state===F.safety)),dl=DL.filter(d=>d.siteId===s.id);
      if(!nameHit){iss=iss.filter(i=>textHit(q,i.title,i.content,i.owner,i.result));saf=saf.filter(x=>textHit(q,x.title,x.content,x.owner))}
      const dlF=dl.filter(dHit);
      return {s,iss,saf,dl,dlF,nameHit}})
    .filter(r=>(r.nameHit||r.iss.length||r.saf.length)&&(!F.issue||r.iss.length)&&(!F.safety||(SAFETY_STATES.includes(F.safety)?r.saf.length:r.dlF.length))&&(!F.only||r.iss.length||r.saf.length||r.dl.length));
  const open=l=>l.filter(isOpen),late=l=>l.filter(d=>d.due<t),cost=l=>open(l).reduce((n,i)=>n+(+i.cost||0),0);
  rows.sort((a,b)=>(open(b.iss).length+late(b.dl).length)-(open(a.iss).length+late(a.dl).length)||cost(b.iss)-cost(a.iss)||(a.dl[0]?.due||"9999").localeCompare(b.dl[0]?.due||"9999")||(a.s.order??999)-(b.s.order??999));
  const tO=rows.reduce((n,r)=>n+open(r.iss).length,0),tL=rows.reduce((n,r)=>n+late(r.dl).length,0),tC=rows.reduce((n,r)=>n+cost(r.iss),0);
  $("#lcount").innerHTML=`<b>${rows.length}</b>곳${tO?` · 종결 전 노무 문제 <b>${tO}</b>건`:""}${tC?` · 지출 예정 <b style="color:var(--bad)">${won(tC)}</b>원`:""}${tL?` · 안전보건 기한 지남 <b style="color:var(--bad)">${tL}</b>건`:""}`;
  const n=(v,c)=>v?`<span class="num-b"${c?` style="color:${c}"`:""}>${v}</span>`:`<span class="muted">0</span>`,dash=`<span class="muted">—</span>`;
  $("#lbody").innerHTML=rows.length?rows.map(({s,iss,saf,dl})=>{const lastI=iss.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""))[0],nx=dl[0],c=cost(iss);
      return `<tr data-id="${esc(s.id)}"><td>${hl(s.f[NAME]||"(이름 없음)",F.q.trim())}</td><td>${esc(s.f["소속부서"]||"")}</td>
        <td class="num">${n(iss.filter(i=>i.status==="진행중").length)}</td><td class="num">${n(iss.filter(i=>i.status==="미해결").length,"var(--bad)")}</td>
        <td class="num">${c?`<span class="num-b" style="color:var(--bad)">${won(c)}</span>`:`<span class="muted">0</span>`}</td>
        <td class="clip">${lastI?`<span class="mono">${esc(lastI.date||"")}</span> ${esc(lastI.title||"")}`:dash}</td>
        <td class="num">${n(late(dl).length,"var(--bad)")}</td><td class="num">${n(saf.filter(x=>x.type==="산업재해").length,"var(--bad)")}</td>
        <td class="clip">${nx?`<span class="mono"${nx.due<t?' style="color:var(--bad)"':""}>${esc(nx.due)} ${dday(nx.due)}</span> ${esc(nx.what)}`:dash}</td></tr>`}).join("")
    :`<tr><td colspan="9"><div class="empty"><b>${S.issues.length||S.safety.length?"조건에 맞는 사업장이 없습니다":"아직 등록된 노무 문제·안전보건 기록이 없습니다"}</b>${S.issues.length||S.safety.length?"필터를 줄이거나 초기화해 보세요.":"‘전체 사업장’을 누르고 사업장을 골라 입력하세요."}</div></td></tr>`}

/* ----- 산업안전보건관리 ----- */
const addDays=(d,n)=>{const t=new Date(d+"T00:00:00Z");t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10)};
// 한 달 뒤 같은 날 (없는 날이면 그 달 말일)
const addMonth=d=>{const [y,m,dd]=d.split("-").map(Number);const t=new Date(Date.UTC(y,m,dd));if(t.getUTCDate()!==dd)t.setUTCDate(0);return t.toISOString().slice(0,10)};
const dday=d=>{const n=Math.round((Date.parse(d)-Date.parse(today()))/864e5);return n===0?"D-day":n>0?`D-${n}`:`D+${-n}`};
// 산업재해조사표 제출 대상: 사망 또는 3일 이상 휴업 (출퇴근 재해 제외) → 발생일부터 1개월 이내
const reportable=x=>x.type==="산업재해"&&x.acc!=="출퇴근 재해"&&(x.acc==="사망"||x.leave==="3일 이상");
// 기한: 산업재해조사표(발생일+1개월), 개선계획서(명령일+60일), 나머지는 예정일
const dueOf=x=>!x.date?"":x.type==="산업재해"?(reportable(x)?addMonth(x.date):""):x.type==="안전보건개선계획 수립명령"?addDays(x.date,60):x.date;
const overdue=x=>x.state==="예정"&&!!dueOf(x)&&dueOf(x)<today();
const dueWhat=x=>x.type==="산업재해"?"산업재해조사표 제출":x.type==="안전보건개선계획 수립명령"?"개선계획서 제출":x.type;
const stateText=x=>x.type==="산업재해"?(reportable(x)?(x.state==="완료"?"조사표 제출":"조사표 제출 전"):"조사표 비대상"):x.type==="안전보건개선계획 수립명령"?(x.state==="완료"?"계획서 제출":"계획서 제출 전"):x.state;
// 신규 사업장 체크리스트: 사업 개시일을 넣으면 최초 위험성평가 기한(개시일+30일)
const ckOf=id=>memoOf(id).checklist||{};
const ckDue=c=>c.start&&!c.raDone?addDays(c.start,30):"";
// 기한 목록 (종료 사업장 포함 전체, 기한 빠른 순)
function deadlines(){const out=[];
  S.safety.forEach(x=>{const d=dueOf(x);if(x.state==="예정"&&d)out.push({siteId:x.siteId,what:dueWhat(x),title:x.title||"",due:d})});
  S.sites.forEach(s=>{const d=ckDue(ckOf(s.id));if(d)out.push({siteId:s.id,what:"최초 위험성평가",title:"신규 사업장 체크리스트",due:d})});
  return out.sort((a,b)=>a.due.localeCompare(b.due))}
const lateCount=()=>deadlines().filter(d=>d.due<today()).length;
function safetyStatePill(x){const late=overdue(x),t=stateText(x);return late?`<span class="pill p-open">기한 지남</span>`:`<span class="pill ${x.state==="완료"||t==="조사표 비대상"?"p-done":"p-prog"}">${esc(t)}</span>`}
const safetySort=(a,b)=>(overdue(b)-overdue(a))||((a.state==="완료")-(b.state==="완료"))||(a.state==="완료"?(b.date||"").localeCompare(a.date||""):(dueOf(a)||a.date||"").localeCompare(dueOf(b)||b.date||""));
function safetyRow(x,inDrawer){const late=overdue(x),due=dueOf(x),c=late?"var(--bad)":x.state==="완료"?"var(--ok)":"var(--warn)";return `<div class="item"><span class="bar" style="background:${c}"></span><div style="min-width:0">
  <div class="meta">${safetyStatePill(x)}${inDrawer?"":`<b style="color:var(--ink)">${esc(siteName(x.siteId))}</b>`}<span>${esc(x.type)}</span><span class="mono">${esc(x.date)}</span>${x.type==="산업재해"?`<span>${esc(x.acc||"재해구분 미입력")} · 휴업 ${esc(x.leave||"미입력")}</span>`:""}${x.state==="예정"&&due&&due!==x.date?`<span class="mono"${late?' style="color:var(--bad)"':""}>기한 ${esc(due)} ${dday(due)}</span>`:x.state==="예정"&&due?`<span class="mono"${late?' style="color:var(--bad)"':""}>${dday(due)}</span>`:""}${x.people?`<span>대상 ${esc(x.people)}명</span>`:""}${x.owner?`<span>담당 ${esc(x.owner)}</span>`:""}</div>
  <h3>${esc(x.title||"")}</h3>${x.content?`<p>${esc(x.content)}</p>`:""}</div>
  ${inDrawer&&db&&!readOnly?`<div class="side"><select class="i" style="width:auto;padding:3px 8px;font-size:12px" data-sst="${esc(x.id)}" aria-label="상태">${SAFETY_STATES.map(s=>`<option ${s===x.state?"selected":""}>${s}</option>`).join("")}</select><button class="btn sm" data-sed="${esc(x.id)}">수정</button><button class="btn sm danger" data-sdel="${esc(x.id)}">삭제</button></div>`:""}</div>`}
function safetyForm(x){x=x||{date:today(),state:"예정",type:SAFETY_TYPES[0]};const types=SAFETY_TYPES.includes(x.type)?SAFETY_TYPES:[...SAFETY_TYPES,x.type];
  return `<form class="form card" style="padding:16px" id="dForm">
  <h3 class="sec-t" style="margin:0">산업안전보건 ${x.id?"수정":"입력"}</h3>
  <div class="row2"><label class="f">구분<select class="i" name="type">${types.map(t=>`<option ${t===x.type?"selected":""}>${t}</option>`).join("")}</select></label><label class="f">상태<select class="i" name="state">${SAFETY_STATES.map(s=>`<option ${s===x.state?"selected":""}>${s}</option>`).join("")}</select></label></div>
  <div class="row2" data-acc><label class="f">재해구분<select class="i" name="acc"><option value="">선택</option>${ACC_KINDS.map(t=>`<option ${t===x.acc?"selected":""}>${t}</option>`).join("")}</select></label><label class="f">휴업구분<select class="i" name="leave"><option value="">선택</option>${LEAVE_KINDS.map(t=>`<option ${t===x.leave?"selected":""}>${t}</option>`).join("")}</select></label></div>
  <label class="f"><span data-dlabel>일자</span><input class="i" type="date" name="date" value="${esc(x.date||"")}" required></label>
  <div class="guide" data-dueinfo></div>
  <label class="f">제목<input class="i" name="title" required placeholder="예) 하반기 정기 안전보건교육" value="${esc(x.title||"")}"></label>
  <label class="f">내용<textarea class="i" name="content" rows="3" placeholder="교육 시간·방식, 검진 기관, 재해 경위·요양신청 여부, 점검 결과 등">${esc(x.content||"")}</textarea></label>
  <div class="row2"><label class="f">대상 인원(선택)<input class="i" type="number" name="people" min="0" step="1" value="${esc(x.people||"")}"></label><label class="f">담당자<input class="i" name="owner" placeholder="예) 배유진" value="${esc(x.owner||"")}"></label></div>
  <div style="display:flex;gap:8px"><button class="btn pri" type="submit">${x.id?"수정 저장":"등록"}</button><button class="btn" type="button" data-fcancel>취소</button></div></form>`}
// 구분에 따라 입력 칸·안내 바꾸기
function updSafetyForm(f){const v=k=>f.elements[k].value,x={type:v("type"),acc:v("acc"),leave:v("leave"),date:v("date"),state:v("state")};
  $("[data-acc]",f).hidden=x.type!=="산업재해";
  $("[data-dlabel]",f).textContent=x.type==="산업재해"?"재해 발생일":x.type==="안전보건개선계획 수립명령"?"명령일":"일자 (예정이면 예정일, 완료면 실시일)";
  const due=dueOf(x),box=$("[data-dueinfo]",f);let h="";
  if(x.type==="산업재해")h=!x.acc||!x.leave?"재해구분과 휴업구분을 고르면 산업재해조사표 제출 대상인지 알려 드립니다.":reportable(x)?`<b>산업재해조사표 제출 대상</b> · 제출기한 <b class="mono">${due} (${dday(due)})</b><br>사망 또는 3일 이상 휴업 재해는 발생일부터 1개월 이내 제출 (산업안전보건법 시행규칙 제73조). 제출하면 상태를 ‘완료’로 바꾸세요.`:`<b>산업재해조사표 비대상</b> (${x.acc==="출퇴근 재해"?"출퇴근 재해":"휴업 3일 미만"}). 그룹웨어 보고에서 빠지기 쉬우니 요양신청 통지와 대조하세요.`;
  else if(x.type==="안전보건개선계획 수립명령")h=due?`제출기한 <b class="mono">${due} (${dday(due)})</b> · 명령일부터 60일 이내 제출 (산업안전보건법 시행규칙 제61조). 본사 안전관리자 현장 점검 필수. 제출하면 상태를 ‘완료’로 바꾸세요.`:"명령일을 넣으면 제출기한(명령일+60일)을 계산합니다.";
  box.innerHTML=h;box.hidden=!h}
// 사업장 안전보건 정보 (신규 사업장 체크리스트 + 비상연락망) — 사업장 메모 문서에 저장
function sfDraftOf(s){if(S.dDirty&&S.sfDraft)return S.sfDraft;const w=memoOf(s.id);
  return {ck:{...(w.checklist||{})},em:(w.emergency&&w.emergency.length?w.emergency:EMERG_ROLES.map(role=>({role,name:"",phone:""}))).map(r=>({...r}))}}
function safetyInfo(s,can){const d=sfDraftOf(s),c=d.ck,due=c.start?addDays(c.start,30):"",dis=can?"":"disabled";
  return `<section id="sfBox"><div style="display:flex;align-items:center;gap:10px"><h3 class="sec-t" style="margin:0">사업장 안전보건 정보</h3>${can?`<button class="btn sm pri" id="sfSave" style="margin-left:auto">안전보건 정보 저장</button>`:""}</div>
    <h4 class="sub-t">신규 사업장 체크리스트</h4>
    <div class="row2"><label class="f">사업 개시일<input class="i" type="date" data-ck="start" value="${esc(c.start||"")}" ${dis}><span class="tiny muted">${s.f["최초계약일"]&&!c.start?`급여기초 최초계약일: ${esc(s.f["최초계약일"])}`:"넣으면 최초 위험성평가 기한을 계산합니다"}</span></label>
      <label class="f">고객사 반기 안전점검<select class="i" data-ck="half" ${dis}>${[["","선택"],["대상","대상"],["비대상","비대상"]].map(([v,l])=>`<option value="${v}" ${c.half===v?"selected":""}>${l}</option>`).join("")}</select><span class="tiny muted">대상이면 점검 전 현장 방문·서류 준비 일정을 잡으세요</span></label></div>
    <div class="ckrow"><label class="ck"><input type="checkbox" data-ck="raDone" ${c.raDone?"checked":""} ${dis}> 최초 위험성평가 실시·제출</label>
      <input class="i" type="date" data-ck="raDate" value="${esc(c.raDate||"")}" ${dis} aria-label="위험성평가 제출일" style="width:auto">
      <span class="tiny ${due&&!c.raDone&&due<today()?"bad":"muted"}">${c.raDone?"완료":due?`기한 ${due} (${dday(due)}) · 사업 개시일부터 30일`:"사업 개시일을 넣으면 기한이 표시됩니다"}</span></div>
    <h4 class="sub-t" style="display:flex;align-items:center;gap:8px">비상연락망<button class="btn sm" id="emPrint" type="button" style="margin-left:auto">A4 인쇄</button></h4>
    <table class="emtbl"><thead><tr><th>구분</th><th>이름·기관</th><th>연락처</th>${can?"<th></th>":""}</tr></thead><tbody>${d.em.map((r,i)=>`<tr data-em="${i}"><td><input class="i" data-f="role" value="${esc(r.role)}" ${dis} aria-label="구분"></td><td><input class="i" data-f="name" value="${esc(r.name)}" ${dis} aria-label="이름·기관"></td><td><input class="i mono" data-f="phone" value="${esc(r.phone)}" ${dis} aria-label="연락처" inputmode="tel"></td>${can?`<td><button class="btn sm" type="button" data-emdel="${i}" aria-label="줄 삭제">삭제</button></td>`:""}</tr>`).join("")}</tbody></table>
    ${can?`<button class="btn sm" type="button" id="emAdd" style="margin-top:6px">연락처 줄 추가</button>`:""}
    <p class="tiny muted" style="margin:6px 0 0">출력해서 현장에 비치하고 중대재해 대비·대응 매뉴얼 첨부자료로 쓰세요.</p></section>`}
function readSf(box){const ck={};$$("[data-ck]",box).forEach(el=>{ck[el.dataset.ck]=el.type==="checkbox"?el.checked:el.value});
  return {ck,em:$$("tr[data-em]",box).map(tr=>({role:$('[data-f=role]',tr).value.trim(),name:$('[data-f=name]',tr).value.trim(),phone:$('[data-f=phone]',tr).value.trim()}))}}
function printEmergency(s,em){const w=window.open("","_blank");if(!w){toast("팝업이 막혀 있습니다. 브라우저에서 팝업을 허용해 주세요.");return}
  const rows=em.filter(r=>r.role||r.name||r.phone);
  w.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(s.f[NAME]||"")} 비상연락망</title><style>
    @page{size:A4;margin:18mm}body{font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif;color:#111}
    h1{font-size:24pt;margin:0 0 3mm}.sub{color:#444;margin:0 0 8mm;font-size:11pt}
    table{width:100%;border-collapse:collapse;font-size:13pt}th,td{border:1px solid #333;padding:4mm 3mm;text-align:left}thead th{background:#e9edf2}
    td:first-child{font-weight:700;width:32%}td:last-child{font-size:15pt;font-weight:700;letter-spacing:.02em}
    .call{margin-top:8mm;border:2px solid #b42323;color:#b42323;padding:4mm;font-size:14pt;font-weight:700;text-align:center}</style></head><body>
    <h1>${esc(s.f[NAME]||"")} 비상연락망</h1><p class="sub">${esc(s.f["사업장 주소지(실근무지)"]||"")}${s.f["사업장 주소지(실근무지)"]?" · ":""}작성일 ${today()}</p>
    <table><thead><tr><th>구분</th><th>이름·기관</th><th>연락처</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.role)}</td><td>${esc(r.name)}</td><td>${esc(r.phone)}</td></tr>`).join("")}</tbody></table>
    <div class="call">사고 발생 시: 119 신고 → 현장 관리자 → 본사·지사 담당 순으로 즉시 연락</div>
    <script>window.onload=function(){window.print()}<\/script></body></html>`);w.document.close()}
function drawerSafety(s,list){const can=db&&!readOnly,F=S.dForm;
  return safetyInfo(s,can)+`<section><h3 class="sec-t">안전보건 기록</h3><div style="display:flex;flex-direction:column;gap:10px">`+(F&&F.kind==="safety"?safetyForm(F.id&&S.safety.find(x=>x.id===F.id)):can?`<div style="display:flex;justify-content:flex-end"><button class="btn sm pri" data-fnew="safety">안전보건 기록 추가</button></div>`:"")+
    (list.length?`<div class="card list">${list.slice().sort(safetySort).map(x=>safetyRow(x,true)).join("")}</div>`:`<div class="empty"><b>산업안전보건 기록이 없습니다</b>${can?"‘안전보건 기록 추가’를 눌러 교육·검진 일정, 산업재해 등을 입력하세요.":""}</div>`)+`</div></section>`}

/* ===== 월별 특이사항 (청구 특이사항 · 급여 특이사항 공통) ===== */
// 메뉴마다 다른 것만 여기에. 저장 위치(Supabase 테이블 이름)는 키와 같음
const REC={
  bills:{p:"b",title:"청구 특이사항",types:BILL_TYPES,month:"청구월",
    desc:"사업장별 청구 특이사항 현황입니다. 사업장을 누르면 그 사업장의 청구방식과 청구 특이사항을 보고 입력할 수 있습니다.",
    ph:["예) 10월 인원 증원분 추가 청구","청구 대상, 산정 기준, 고객사 협의 내용 등"]},
  notes:{p:"n",title:"급여 특이사항",types:NOTE_TYPES,month:"귀속월",
    desc:"사업장별 급여 특이사항 현황입니다. 사업장을 누르면 급여정산, 통상임금·퇴직금 메모, 급여 특이사항을 함께 보고 입력할 수 있습니다.",
    ph:["예) 교육생 식대 회입","대상자, 산정기준, 청구 반영 여부 등"]}};
const byMonth=(a,b)=>(b.month||"").localeCompare(a.month||"");
function recRow(k,n,inDrawer){return `<div class="item"><span class="bar" style="background:var(--accent)"></span><div style="min-width:0">
  <div class="meta"><span class="pill p-acc mono">${esc(n.month)}</span>${inDrawer?"":`<b style="color:var(--ink)">${esc(siteName(n.siteId))}</b>`}<span>${esc(n.type)}</span>${n.amount?`<span class="mono">${won(n.amount)}원</span>`:""}${n.repeat?`<span class="pill p-neutral">매월 반복</span>`:""}</div>
  <h3>${esc(n.title||"")}</h3>${n.content?`<p>${esc(n.content)}</p>`:""}</div>
  ${inDrawer&&db&&!readOnly?`<div class="side"><button class="btn sm" data-red="${esc(n.id)}" data-k="${k}">수정</button><button class="btn sm danger" data-rdel="${esc(n.id)}" data-k="${k}">삭제</button></div>`:""}</div>`}
function vRec(k){const R=REC[k],F=S.recF[k],p=R.p;return `<div class="page-h"><div><h1>${R.title}</h1><p>${R.desc}</p></div><div class="act">${xlBtns(k)}</div></div>
  ${csTabs()}
  <div class="card">
    <div class="bd" style="border-bottom:1px solid var(--line)"><div class="filters f3">
      <label class="f q">전체 검색<input class="i" id="${p}q" type="search" placeholder="사업장명, 제목, 내용${k==="notes"?", 메모":""}" value="${esc(F.q)}"></label>
      <label class="f">${R.month}<input class="i" type="month" id="${p}fMonth" value="${esc(F.month)}"></label>
      <label class="f">구분<select class="i" id="${p}fType"><option value="">전체</option>${R.types.map(t=>`<option>${t}</option>`).join("")}</select></label>
    </div></div>
    <div class="toolbar"><span class="count" id="${p}count"></span>
      <span class="chips" id="${p}only"><button class="chip" data-o="" aria-pressed="${!F.only}">전체 사업장</button><button class="chip" data-o="1" aria-pressed="${F.only}">${k==="notes"?"기록 있는 사업장":"특이사항 있는 사업장"}</button></span>
      <button class="btn sm" id="${p}fAll" style="margin-left:auto">전체 기간</button><button class="btn sm" id="${p}reset">필터 초기화</button></div>
    <div class="tbl-wrap"><table class="sitetbl"><thead><tr><th>사업장명</th><th>소속부서</th><th class="num" id="${p}MonthH"></th><th class="num">매월 반복</th><th class="num">전체</th><th>최근 ${R.month}</th><th>최근 특이사항</th>${k==="notes"?"<th>통상임금 메모</th><th>퇴직금 메모</th>":""}</tr></thead><tbody id="${p}body"></tbody></table></div>
  </div>`}
const inMonth=(n,m)=>!m||n.month===m||(n.repeat&&n.month<=m);
function bindRec(k){const F=S.recF[k],p=REC[k].p,ref=()=>refRec(k);$(`#${p}fType`).value=F.type;
  $(`#${p}q`).oninput=e=>{F.q=e.target.value;ref()};
  $(`#${p}fMonth`).onchange=e=>{F.month=e.target.value;ref()};$(`#${p}fType`).onchange=e=>{F.type=e.target.value;ref()};
  $(`#${p}fAll`).onclick=()=>{F.month="";$(`#${p}fMonth`).value="";ref()};
  $(`#${p}only`).onclick=e=>{const b=e.target.closest("[data-o]");if(!b)return;F.only=!!b.dataset.o;$$(`#${p}only .chip`).forEach(c=>c.setAttribute("aria-pressed",c===b));ref()};
  $(`#${p}reset`).onclick=()=>{Object.assign(F,{q:"",month:"",type:""});$(`#${p}q`).value=$(`#${p}fMonth`).value=$(`#${p}fType`).value="";ref()};
  $(`#${p}body`).onclick=e=>{const tr=e.target.closest("tr[data-id]");if(tr)openDrawer(tr.dataset.id,k)};
  ref()}
function refRec(k){const R=REC[k],F=S.recF[k],p=R.p,body=$(`#${p}body`);if(!body)return;const q=F.q.trim().toLowerCase(),all=S[k];
  $(`#${p}MonthH`).textContent=F.month?`${F.month.replace("-",".")} 특이사항`:"특이사항";
  updCs();const rows=sitesIn().map(s=>{const mine=all.filter(n=>n.siteId===s.id&&(!F.type||n.type===F.type));const nameHit=textHit(q,s.f[NAME]);
      const list=nameHit?mine:mine.filter(n=>textHit(q,n.title,n.content));const inM=list.filter(n=>inMonth(n,F.month));
      // 급여 특이사항은 통상임금·퇴직금 메모도 표에 보여 줌
      const w=k==="notes"?memoOf(s.id):{},wn=!!(w.ordinary||w.severance),wnHit=wn&&!F.type&&textHit(q,w.ordinary,w.severance);
      return {s,list,inM,w,wn,hit:nameHit||list.length||wnHit}})
    .filter(r=>r.hit&&(F.month||F.type?r.inM.length||!F.only&&!F.type:!F.only||r.list.length||r.wn));
  rows.sort((a,b)=>b.inM.length-a.inM.length||(b.list.slice().sort(byMonth)[0]?.month||"").localeCompare(a.list.slice().sort(byMonth)[0]?.month||"")||(a.s.order??999)-(b.s.order??999));
  const tot=rows.reduce((n,r)=>n+r.inM.length,0);
  $(`#${p}count`).innerHTML=`<b>${rows.length}</b>곳 · ${F.month?F.month.replace("-",".")+" ":""}특이사항 <b>${tot}</b>건`;
  const n=v=>v?`<span class="num-b">${v}</span>`:`<span class="muted">0</span>`;
  const memo=v=>v?`<span title="${esc(v)}">${esc(v)}</span>`:`<span class="muted">—</span>`;
  body.innerHTML=rows.length?rows.map(({s,list,inM,w})=>{const last=list.slice().sort(byMonth)[0];
      return `<tr data-id="${esc(s.id)}"><td>${hl(s.f[NAME]||"(이름 없음)",F.q.trim())}</td><td>${esc(s.f["소속부서"]||"")}</td>
        <td class="num">${n(inM.length)}</td><td class="num">${n(list.filter(x=>x.repeat).length)}</td><td class="num">${n(list.length)}</td>
        <td class="mono">${last?esc(last.month||""):""}</td><td class="clip">${last?esc(last.title||""):`<span class="muted">—</span>`}</td>${k==="notes"?`<td class="clip">${memo(w.ordinary)}</td><td class="clip">${memo(w.severance)}</td>`:""}</tr>`}).join("")
    :`<tr><td colspan="${k==="notes"?9:7}"><div class="empty"><b>${all.length?"조건에 맞는 사업장이 없습니다":`아직 입력된 ${R.title}이 없습니다`}</b>${all.length?`${R.month}이나 필터를 바꿔 보세요.`:"‘전체 사업장’을 누르고 사업장을 골라 첫 특이사항을 입력하세요."}</div></td></tr>`}

/* ===== 사업장 상세 안의 노무 문제·급여 특이사항 입력 ===== */
function strip(o){const c={...o};delete c.id;return c}
function issueForm(i){i=i||{date:today(),status:STATUSES[0],type:ISSUE_TYPES[0]};const types=ISSUE_TYPES.includes(i.type)?ISSUE_TYPES:[...ISSUE_TYPES,i.type];
  return `<form class="form card" style="padding:16px" id="dForm">
  <h3 class="sec-t" style="margin:0">${i.id?"노무 문제 수정":"노무 문제 입력"}</h3>
  <div class="row2"><label class="f">발생일<input class="i" type="date" name="date" value="${esc(i.date||"")}" required></label><label class="f">유형<select class="i" name="type">${types.map(t=>`<option ${t===i.type?"selected":""}>${t}</option>`).join("")}</select></label></div>
  <div class="guide warn" data-harass ${i.type===HARASS?"":"hidden"}><b>실명·구체적 행위를 적지 마세요.</b> 직장 내 괴롭힘·성희롱은 회사에 비밀유지의무가 있고 위반 시 과태료 대상입니다 (근로기준법 제76조의3 제7항, 남녀고용평등법 제14조 제7항). 관련자 <b>인원수만</b> 적어 주세요. 예) 신고인 1명, 피신고인 1명, 참고인 2명</div>
  <label class="f">제목<input class="i" name="title" required placeholder="예) 연장근로수당 미지급 문의" value="${esc(i.title||"")}"></label>
  <label class="f">내용<textarea class="i" name="content" rows="4" placeholder="경위, 관련 직원, 요구사항 등">${esc(i.content||"")}</textarea></label>
  <div class="row2"><label class="f">지출 (예정)금액 (원)<input class="i mono" type="number" name="cost" min="0" step="1" placeholder="예) 3000000" value="${esc(i.cost||"")}"><span class="tiny muted">예상 임금·과태료 등 회사가 쓸 돈</span></label><label class="f">처리상태<select class="i" name="status">${STATUSES.map(s=>`<option ${s===i.status?"selected":""}>${s}</option>`).join("")}</select></label></div>
  <label class="f">담당자<input class="i" name="owner" placeholder="예) 배유진" value="${esc(i.owner||"")}"></label>
  <label class="f">처리 결과 / 조치<textarea class="i" name="result" rows="2" placeholder="종결 시 결과를 남겨 주세요">${esc(i.result||"")}</textarea></label>
  <div style="display:flex;gap:8px"><button class="btn pri" type="submit">${i.id?"수정 저장":"등록"}</button><button class="btn" type="button" data-fcancel>취소</button></div></form>`}
function recForm(k,n){const R=REC[k];n=n||{month:S.recF[k].month||thisMonth(),type:R.types[0]};return `<form class="form card" style="padding:16px" id="dForm">
  <h3 class="sec-t" style="margin:0">${R.title} ${n.id?"수정":"입력"}</h3>
  <div class="row2"><label class="f">${R.month}<input class="i" type="month" name="month" value="${esc(n.month||"")}" required></label><label class="f">구분<select class="i" name="type">${R.types.map(t=>`<option ${t===n.type?"selected":""}>${t}</option>`).join("")}</select></label></div>
  <label class="f">제목<input class="i" name="title" required placeholder="${esc(R.ph[0])}" value="${esc(n.title||"")}"></label>
  <label class="f">내용<textarea class="i" name="content" rows="4" placeholder="${esc(R.ph[1])}">${esc(n.content||"")}</textarea></label>
  <div class="row2"><label class="f">금액(원, 선택)<input class="i" type="number" name="amount" min="0" step="1" placeholder="0" value="${n.amount||""}"></label>
    <label class="f">반복<span style="display:flex;align-items:center;gap:8px;height:36px;color:var(--ink)"><input type="checkbox" class="tog" name="repeat" ${n.repeat?"checked":""}>매월 반복 적용</span></label></div>
  <div style="display:flex;gap:8px"><button class="btn pri" type="submit">${n.id?"수정 저장":"등록"}</button><button class="btn" type="button" data-fcancel>취소</button></div></form>`}
function drawerIssues(s,iss){const can=db&&!readOnly,F=S.dForm;
  return (F&&F.kind==="issue"?issueForm(F.id&&S.issues.find(x=>x.id===F.id)):can?`<div style="display:flex;justify-content:flex-end"><button class="btn sm pri" data-fnew="issue">노무 문제 추가</button></div>`:"")+
    (iss.length?`<div class="card list">${iss.slice().sort(issueSort).map(i=>issueRow(i,true)).join("")}</div>`:`<div class="empty"><b>등록된 노무 문제가 없습니다</b>${can?"‘노무 문제 추가’를 눌러 입력하세요.":""}</div>`)}
// 사업장 메모(wagenotes 문서): 통상임금·퇴직금 메모, 청구방식, 급여정산을 사업장별로 함께 저장
const memoOf=id=>{const w={...(S.wagenotes[id]||{})};delete w.id;return w};
// 특이사항 탭 맨 위 칸: 급여기초의 관련 값 + 사업장별 설명
// parts: 설명 칸들 (legacy: 칸을 나누기 전 저장 값이 있던 필드 — 새 칸이 비어 있으면 보여 줌)
const MEMO_BOX={
  bills:{field:"billing",title:"청구방식",
    parts:[{f:"billing",label:"청구 방식 설명",hint:"단가 구조(시급·월정액·인당 관리비), 청구 기준, 세금계산서 발행 시기 등",ph:"예) 인원 × 월 단가 + 인당 관리비 5만원, 매월 말일 마감 후 익월 5일 세금계산서 발행"}],
    info:[["청구형태 (인원, 콜, 업무도급, 성과유지 등)","청구형태"],["청구일","청구일"],["월청구분 당사입금일","월청구분 당사입금일"]]},
  notes:{field:"payroll",title:"급여정산",
    parts:[{f:"payrollBiz",tag:"사업부",label:"급여 정산 방식 설명",hint:"근태 집계·마감, 현장 수당 기준, 인사팀에 넘기는 자료와 일정 등",ph:"예) 매월 말일 근태 마감 후 다음 달 3일까지 근무표·수당 내역을 인사팀에 전달"},
      {f:"payrollHr",legacy:"payroll",tag:"인사팀",label:"급여 정산 방식 설명",hint:"급여 산정 기준, 수당·공제 정산, 소급·퇴직 정산 처리 방식 등",ph:"예) 전월 1일~말일 근태로 매월 10일 지급. 연장수당은 실적 확인 후 익월 정산"}],
    info:[["급여일","급여일"],["급여산정 시작일","급여산정 시작일"],["급여산정 종료일","급여산정 종료일"],["퇴직금 적립방식","퇴직금 적립방식"],["연차수당 적립방식","연차수당 적립방식"]]}};
const partVal=(w,P)=>w[P.f]!==undefined?w[P.f]:P.legacy?(w[P.legacy]||""):"";
function memoBox(k,s,can){const M=MEMO_BOX[k],w=memoOf(s.id),at=w[M.field+"At"],dr=S.dDirty&&S.bmDraft?S.bmDraft:null;
  const info=M.info.filter(([f])=>s.f[f]);
  return `<section id="mbBox"><div style="display:flex;align-items:center;gap:10px"><h3 class="sec-t" style="margin:0">${M.title}</h3><span class="tiny muted">${at?`마지막 저장 ${esc(at.slice(0,10))}`:""}</span>${can?`<button class="btn sm pri" id="mbSave" data-k="${k}" style="margin-left:auto">${M.title} 저장</button>`:""}</div>
    ${info.length?`<dl class="kv" style="margin-top:6px">${info.map(([f,l])=>`<dt>${esc(l)}</dt><dd>${esc(s.f[f])}</dd>`).join("")}</dl>`:""}
    ${M.parts.map(P=>`<label class="f" style="margin-top:8px"><span>${P.tag?`<b class="who">[${P.tag}]</b> `:""}${P.label}</span><span class="tiny muted">${P.hint}</span><textarea class="i" data-mb="${P.f}" rows="4" ${can?"":"disabled"} placeholder="${esc(P.ph)}">${esc(dr&&dr[P.f]!=null?dr[P.f]:partVal(w,P))}</textarea></label>`).join("")}</section>`}
// 통상임금·퇴직금 관련 법적 책임 참고표 (2026년 10월 기준 요약 — 법 개정 시 여기만 고치면 됨)
const LEGAL_REF_DATE="2026년 10월";
const LEGAL_REF=[
  ["임금 체불 (정기 지급일에 전액 미지급)","근로기준법 제43조","5년 이하 징역 또는 5천만원 이하 벌금 (2026.10.8. 이후 체불분, 그 전은 3년·3천만원). 반의사불벌, 단 체불사업주 명단공개 기간 중 재체불은 예외"],
  ["연장·야간·휴일 가산수당 미지급 (통상임금을 낮게 잡아 적게 준 경우 포함)","근로기준법 제56조","위 임금 체불과 같은 형사처벌"],
  ["퇴직 후 14일 내 임금·금품 미청산","근로기준법 제36조","위 임금 체불과 같은 형사처벌 (당사자 합의로 기일 연장 가능)"],
  ["퇴직금 14일 내 미지급 (평균임금 항목 누락으로 적게 준 경우 포함)","근로자퇴직급여 보장법 제9조","5년 이하 징역 또는 5천만원 이하 벌금 (2026.9.18. 이후 체불분, 그 전은 3년·3천만원). 반의사불벌"],
  ["지연이자","근로기준법 제37조, 퇴직급여법 제9조","퇴직자: 14일이 지난 다음 날부터 연 20%. 재직자: 2025.10.23. 이후 지급기일이 온 임금부터 지급일 다음 날부터 연 20%"],
  ["징벌적 손해배상","근로기준법 (2025.10.23. 시행)","명백한 고의 또는 3개월 이상 장기 체불 등은 근로자가 법원에 체불액의 최대 3배 청구 가능"],
  ["상습체불사업주","근로기준법 (2025.10.23. 시행)","직전 1년간 1명에게 3개월분 이상 체불, 또는 5회 이상·총 3천만원 이상 체불 시 신용제재·정부지원 제한 등"],
  ["임금명세서 미교부·기재 누락","근로기준법 제48조 제2항","500만원 이하 과태료"],
  ["근로조건 서면 명시·교부 위반","근로기준법 제17조","500만원 이하 벌금"],
  ["소멸시효","근로기준법 제49조, 퇴직급여법 제10조","임금·퇴직금 모두 3년"]];
const LEGAL_NOTES=["통상임금: 대법원 2024.12.19. 전원합의체 판결로 '고정성' 요건이 빠졌습니다. 재직조건·근무일수 조건이 붙은 정기상여금도 통상임금이 될 수 있습니다. 판결일 이후 산정분부터 적용됩니다 (해당·병행 사건은 예외).",
  "평균임금이 통상임금보다 적으면 통상임금을 평균임금으로 봅니다 (근로기준법 제2조 제2항). 퇴직금 산정에 영향을 줍니다."];
function legalRef(){return `<details class="legal" ${S.legalOpen?"open":""}><summary>근로기준법·퇴직급여법상 과태료·법적 책임 보기</summary>
  <table class="legal-t"><thead><tr><th>상황</th><th>근거</th><th>책임·제재</th></tr></thead><tbody>${LEGAL_REF.map(([a,b,c])=>`<tr><td>${esc(a)}</td><td>${esc(b)}</td><td>${esc(c)}</td></tr>`).join("")}</tbody></table>
  <ul>${LEGAL_NOTES.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
  <p class="tiny muted">${LEGAL_REF_DATE} 기준 참고용 요약입니다. 실제 적용 전에는 <a href="https://www.law.go.kr" target="_blank" rel="noopener">국가법령정보센터</a> 원문이나 노무사 확인이 필요합니다.</p></details>`}
function drawerRec(k,s,list){const R=REC[k],can=db&&!readOnly,F=S.dForm;
  let h=`<section><h3 class="sec-t">${R.title}</h3><div style="display:flex;flex-direction:column;gap:10px">`+
    (F&&F.kind===k?recForm(k,F.id&&S[k].find(x=>x.id===F.id)):can?`<div style="display:flex;justify-content:flex-end"><button class="btn sm pri" data-fnew="${k}">특이사항 추가</button></div>`:"")+
    (list.length?`<div class="card list">${list.slice().sort(byMonth).map(n=>recRow(k,n,true)).join("")}</div>`:`<div class="empty"><b>${R.title}이 없습니다</b>${can?"‘특이사항 추가’를 눌러 입력하세요.":""}</div>`)+`</div></section>`;
  if(k!=="notes")return memoBox(k,s,can)+h;
  const w=S.wagenotes[s.id]||{},d=S.dDirty&&S.wnDraft?S.wnDraft:{ordinary:w.ordinary||"",severance:w.severance||""};
  return memoBox(k,s,can)+`<section id="wnBox"><div style="display:flex;align-items:center;gap:10px"><h3 class="sec-t" style="margin:0">통상임금·퇴직금 메모</h3><span class="tiny muted">${w.updatedAt?`마지막 저장 ${esc(w.updatedAt.slice(0,10))}`:""}</span>${can?`<button class="btn sm pri" id="wnSave" style="margin-left:auto">메모 저장</button>`:""}</div>
      ${legalRef()}
      <label class="f" style="margin-top:8px">통상임금 항목이나 포함하지 않는 임금항목<span class="tiny muted">임금체불에 대한 문제 발생이 있는 급여항목</span><textarea class="i" id="wnOrdinary" rows="3" ${can?"":"disabled"} placeholder="사업장에서 통상임금에 포함/제외한 임금항목과 그 근거를 적어 주세요">${esc(d.ordinary)}</textarea></label>
      <label class="f" style="margin-top:8px">퇴직금 평균임금(통상임금)이나 포함하지 않는 임금항목<span class="tiny muted">임금체불에 대한 문제 발생이 있는 급여항목</span><textarea class="i" id="wnSeverance" rows="3" ${can?"":"disabled"} placeholder="퇴직금 평균임금 산정 시 포함/제외한 임금항목과 그 근거를 적어 주세요">${esc(d.severance)}</textarea></label></section>`+h}
function bindDrawerRecords(root,s){const body=$(".drawer .db",root);if(!body)return;
  body.addEventListener("toggle",e=>{if(e.target.matches("details.legal"))S.legalOpen=e.target.open},true);
  const redraw=()=>renderDrawer(true);
  body.addEventListener("click",e=>{const t=e.target;
    const nw=t.closest("[data-fnew]");if(nw){S.dForm={kind:nw.dataset.fnew,id:null};redraw();$("#dForm [name=title]")?.focus();return}
    if(t.closest("[data-fcancel]")){S.dForm=null;redraw();return}
    const ie=t.closest("[data-ied]");if(ie){S.dForm={kind:"issue",id:ie.dataset.ied};redraw();$("#dForm").scrollIntoView({block:"nearest"});return}
    const se=t.closest("[data-sed]");if(se){S.dForm={kind:"safety",id:se.dataset.sed};redraw();$("#dForm").scrollIntoView({block:"nearest"});return}
    const sdl=t.closest("[data-sdel]");if(sdl){armDelete(sdl,async()=>{try{await db.doc("safety/"+sdl.dataset.sdel).delete();toast("삭제했습니다");redraw()}catch(x){err(x)}});return}
    const ne=t.closest("[data-red]");if(ne){S.dForm={kind:ne.dataset.k,id:ne.dataset.red};redraw();$("#dForm").scrollIntoView({block:"nearest"});return}
    const idl=t.closest("[data-idel]");if(idl){armDelete(idl,async()=>{try{await db.doc("issues/"+idl.dataset.idel).delete();toast("삭제했습니다");redraw()}catch(x){err(x)}});return}
    const ndl=t.closest("[data-rdel]");if(ndl){armDelete(ndl,async()=>{try{await db.doc(ndl.dataset.k+"/"+ndl.dataset.rdel).delete();toast("삭제했습니다");redraw()}catch(x){err(x)}});return}
    if(t.id==="wnSave"){const d={ordinary:$("#wnOrdinary").value,severance:$("#wnSeverance").value};
      (async()=>{try{await db.doc("wagenotes/"+s.id).set({...memoOf(s.id),...d,updatedAt:new Date().toISOString(),by:uid||""});S.dDirty=false;S.wnDraft=null;toast("메모를 저장했습니다");redraw()}catch(x){err(x)}})()}
    if(t.id==="emAdd"){S.sfDraft=readSf($("#sfBox"));S.sfDraft.em.push({role:"",name:"",phone:""});S.dDirty=true;redraw();$$("#sfBox tr[data-em] [data-f=role]").pop()?.focus();return}
    const emd=t.closest("[data-emdel]");if(emd){S.sfDraft=readSf($("#sfBox"));S.sfDraft.em.splice(+emd.dataset.emdel,1);S.dDirty=true;redraw();return}
    if(t.id==="emPrint"){printEmergency(s,readSf($("#sfBox")).em);return}
    if(t.id==="sfSave"){const d=readSf($("#sfBox")),ck={start:d.ck.start||"",half:d.ck.half||"",raDone:!!d.ck.raDone,raDate:d.ck.raDate||""};
      (async()=>{try{await db.doc("wagenotes/"+s.id).set({...memoOf(s.id),checklist:ck,emergency:d.em.filter(r=>r.role||r.name||r.phone),safetyAt:new Date().toISOString(),by:uid||""});S.dDirty=false;S.sfDraft=null;toast("안전보건 정보를 저장했습니다");redraw()}catch(x){err(x)}})();return}
    if(t.id==="mbSave"){const M=MEMO_BOX[t.dataset.k],v={};$$("#mbBox [data-mb]").forEach(el=>{v[el.dataset.mb]=el.value});
      (async()=>{try{await db.doc("wagenotes/"+s.id).set({...memoOf(s.id),...v,[M.field+"At"]:new Date().toISOString(),by:uid||""});S.dDirty=false;S.bmDraft=null;toast(M.title+"을 저장했습니다");redraw()}catch(x){err(x)}})()}});
  body.addEventListener("change",async e=>{const ss=e.target.closest("[data-sst]");if(ss){try{await db.doc("safety/"+ss.dataset.sst).update({state:ss.value,updatedAt:new Date().toISOString()});toast("‘"+ss.value+"’(으)로 바꿨습니다")}catch(x){err(x)}return}
    const st=e.target.closest("[data-st]");if(!st)return;
    try{await db.doc("issues/"+st.dataset.st).update({status:st.value,updatedAt:new Date().toISOString()});toast("상태를 ‘"+st.value+"’(으)로 바꿨습니다")}catch(x){err(x)}});
  body.addEventListener("input",e=>{if(e.target.id==="wnOrdinary"||e.target.id==="wnSeverance"){S.dDirty=true;S.wnDraft={ordinary:$("#wnOrdinary").value,severance:$("#wnSeverance").value}}
    if(e.target.dataset.mb){S.dDirty=true;S.bmDraft={...(S.bmDraft||{}),[e.target.dataset.mb]:e.target.value}}
    if(e.target.closest("#sfBox")){S.dDirty=true;S.sfDraft=readSf($("#sfBox"))}});
  body.addEventListener("change",e=>{if(e.target.closest("#sfBox")){S.dDirty=true;S.sfDraft=readSf($("#sfBox"))}});
  const f=$("#dForm",root);
  if(f&&S.dForm.kind==="safety"){updSafetyForm(f);f.addEventListener("change",()=>updSafetyForm(f));f.addEventListener("input",()=>updSafetyForm(f))}
  if(f&&S.dForm.kind==="issue")f.elements.type.addEventListener("change",()=>{const h=f.elements.type.value===HARASS;$("[data-harass]",f).hidden=!h;
    if(h&&!f.elements.content.value.trim())f.elements.content.value="신고인 0명, 피신고인 0명, 참고인 0명"});
  if(f)f.addEventListener("submit",async e=>{e.preventDefault();const v=k=>(f.elements[k].value||"").trim(),now=new Date().toISOString(),F=S.dForm;
    try{if(F.kind==="issue"){const d={siteId:s.id,date:v("date"),type:v("type"),title:v("title"),content:v("content"),status:v("status"),cost:v("cost")?Math.round(+v("cost")):0,owner:v("owner"),result:v("result"),updatedAt:now};
        if(F.id){const o=S.issues.find(x=>x.id===F.id)||{};await db.doc("issues/"+F.id).set({...strip(o),...d});toast("수정했습니다")}else{await db.collection("issues").add({...d,by:uid||"",createdAt:now});toast("등록했습니다")}}
      else if(F.kind==="safety"){const isAcc=v("type")==="산업재해";const d={siteId:s.id,type:v("type"),state:v("state"),date:v("date"),acc:isAcc?v("acc"):"",leave:isAcc?v("leave"):"",title:v("title"),content:v("content"),people:v("people")?Math.round(+v("people")):"",owner:v("owner"),updatedAt:now};
        if(F.id){const o=S.safety.find(x=>x.id===F.id)||{};await db.doc("safety/"+F.id).set({...strip(o),...d});toast("수정했습니다")}else{await db.collection("safety").add({...d,by:uid||"",createdAt:now});toast(reportable(d)?`등록했습니다. 산업재해조사표 제출기한 ${dueOf(d)} (${dday(dueOf(d))})`:"등록했습니다")}}
      else{const d={siteId:s.id,month:v("month"),type:v("type"),title:v("title"),content:v("content"),amount:+v("amount")||0,repeat:f.elements.repeat.checked,updatedAt:now};
        if(F.id){const o=S[F.kind].find(x=>x.id===F.id)||{};await db.doc(F.kind+"/"+F.id).set({...strip(o),...d});toast("수정했습니다")}else{await db.collection(F.kind).add({...d,by:uid||"",createdAt:now});toast("등록했습니다")}}
      S.dForm=null;redraw()}catch(x){err(x)}})}

/* ===== 엑셀 다운로드 · 업로드 (메뉴별) ===== */
// 열: [엑셀 머리글, 필드]. ID 열이 있으면 같은 건을 고치고, 비어 있으면 새로 추가
const XL={
  sites:{title:"급여기초",cols:()=>[["ID","id"],...COLS.map(k=>[lbl(k),k])]},
  bills:{title:"청구 특이사항",cols:()=>recCols("bills")},
  notes:{title:"급여 특이사항",cols:()=>recCols("notes")},
  issues:{title:"노무 문제",cols:()=>[["ID","id"],["사업장명","site"],["발생일","date"],["유형","type"],["제목","title"],["내용","content"],["지출(예정)금액","cost"],["처리상태","status"],["담당자","owner"],["처리 결과","result"]]},
  safety:{title:"산업안전보건관리",cols:()=>[["ID","id"],["사업장명","site"],["일자","date"],["구분","type"],["재해구분","acc"],["휴업구분","leave"],["상태","state"],["제목","title"],["내용","content"],["대상 인원","people"],["담당자","owner"]]}};
const recCols=k=>[["ID","id"],["사업장명","site"],[REC[k].month,"month"],["구분","type"],["제목","title"],["내용","content"],["금액","amount"],["매월 반복","repeat"]];
function xlRows(k){const cols=XL[k].cols();let list;
  if(k==="sites")list=sitesSorted().map(s=>cols.map(([,f])=>f==="id"?s.id:(s.f[f]||"")));
  else list=S[k].slice().sort(k==="issues"||k==="safety"?((a,b)=>(b.date||"").localeCompare(a.date||"")):byMonth).map(r=>cols.map(([,f])=>f==="id"?r.id:f==="site"?siteName(r.siteId):f==="repeat"?(r.repeat?"Y":""):f==="amount"||f==="cost"?(r[f]||""):(r[f]||"")));
  return [cols.map(c=>c[0]),...list]}
// 여러 시트를 한 파일로 주고받는 메뉴
const XL_GROUP={labor:{title:"노무관리",keys:["issues","safety"]}};
const xlKeys=k=>XL_GROUP[k]?XL_GROUP[k].keys:[k],xlTitle=k=>XL_GROUP[k]?XL_GROUP[k].title:XL[k].title;
async function xlDownload(k){try{await dl.save({filename:`${xlTitle(k)}_${today()}.xlsx`,data:XLSXLite.write(xlKeys(k).map(x=>({name:XL[x].title,rows:xlRows(x)})))})}catch(e){console.error(e);toast("엑셀 파일을 만들지 못했습니다")}}
async function xlDownloadAll(){try{await dl.save({filename:`급여노무_전체_${today()}.xlsx`,data:XLSXLite.write(Object.keys(XL).map(k=>({name:XL[k].title,rows:xlRows(k)})))})}catch(e){console.error(e);toast("엑셀 파일을 만들지 못했습니다")}}
// 엑셀 값 맞추기 (날짜 칸은 엑셀 일련번호로 올 수 있음)
const isSerial=v=>/^\d{4,5}(\.\d+)?$/.test(v)&&+v>20000&&+v<80000;
const ymd=d=>d.toISOString().slice(0,10);
function xlDate(v){if(!v)return "";if(isSerial(v))return ymd(XLSXLite.serialToDate(v));return isoDate(v)}
function xlMonth(v){if(!v)return "";if(isSerial(v))return ymd(XLSXLite.serialToDate(v)).slice(0,7);
  let m=String(v).trim().match(/^(\d{4})\D?(\d{1,2})(\D\d{1,2})?$/);return m&&+m[2]>=1&&+m[2]<=12?`${m[1]}-${m[2].padStart(2,"0")}`:null}
const truthy=v=>/^(y|yes|예|o|v|true|1|반복|✓|✔)$/i.test(String(v).trim());
// 파일 → 반영 계획 {add:[], upd:[], same:n, errs:[], ignored:[]}
function xlPlan(k,rows){const cols=XL[k].cols(),plan={add:[],upd:[],same:0,errs:[],ignored:[]};
  const head=(rows[0]||[]).map(h=>String(h||"").replace(/\s+/g," ").trim());
  const byHead={};cols.forEach(([h,f])=>{byHead[h]=f});if(k==="sites")COLS.forEach(f=>{byHead[f]=f});
  const map=head.map(h=>byHead[h]);head.forEach((h,i)=>{if(h&&!map[i])plan.ignored.push(h)});
  const need=k==="sites"?[NAME]:k==="issues"||k==="safety"?["site","date","title"]:["site","month","title"];
  const miss=need.filter(f=>!map.includes(f));if(miss.length){plan.errs.push({row:1,msg:"필수 열이 없습니다: "+miss.map(f=>cols.find(c=>c[1]===f)?.[0]||f).join(", ")});return plan}
  const siteByName={};S.sites.forEach(s=>{const n=(s.f[NAME]||"").trim();if(n&&!siteByName[n])siteByName[n]=s});
  rows.slice(1).forEach((r,ri)=>{const row=ri+2,v={};map.forEach((f,i)=>{if(f)v[f]=String(r[i]??"").trim()});
    if(!Object.values(v).some(Boolean))return;
    const err=m=>plan.errs.push({row,msg:m});
    if(k==="sites"){if(!v[NAME])return err("사업장명이 비어 있습니다");
      const old=(v.id&&S.sites.find(s=>s.id===v.id))||(!v.id&&siteByName[v[NAME]]);
      const f={...(old?old.f:{})};
      for(const [key,val] of Object.entries(v)){if(key==="id")continue;let x=val;
        if(DATE_COLS.includes(key)&&x){const d=xlDate(x);if(d===null)return err(`${lbl(key)} 날짜 형식이 아닙니다: ${x}`);x=d}
        if(key==="사업자번호"&&x)x=bizNo(x);
        if(key==="계약유지상태"&&x&&!CONTRACT_STATES.includes(x))return err(`계약유지상태는 ${CONTRACT_STATES.join("/")} 중 하나여야 합니다: ${x}`);
        if(MULTI[key]&&x){const bad=splitMulti(x).filter(o=>!MULTI[key].includes(o));if(bad.length)return err(`${lbl(key)}에 없는 값: ${bad.join(", ")}`);x=splitMulti(x).join(", ")}
        if(x)f[key]=x;else delete f[key]}
      if(old&&JSON.stringify(f)===JSON.stringify(old.f)){plan.same++;return}
      (old?plan.upd:plan.add).push({id:old?old.id:null,name:f[NAME],data:{order:old?old.order:null,f,source:old?.source||"엑셀 업로드"}});return}
    const site=siteByName[v.site];if(!site)return err(v.site?`급여기초에 없는 사업장입니다: ${v.site}`:"사업장명이 비어 있습니다");
    if(!v.title)return err("제목이 비어 있습니다");
    const old=v.id&&S[k].find(x=>x.id===v.id),d={...(old?strip(old):{}),siteId:site.id};
    for(const [key,val] of Object.entries(v)){if(key==="id"||key==="site")continue;let x=val;
      if(key==="date"){x=xlDate(x);if(!x)return err(`${cols.find(c=>c[1]==="date")[0]} 날짜 형식이 아닙니다: ${val||"(빈 칸)"}`)}
      else if(key==="month"){x=xlMonth(x);if(!x)return err(`${REC[k].month} 형식이 아닙니다 (예: 2026-10): ${val||"(빈 칸)"}`)}
      else if(key==="amount"){const n=String(x).replace(/[,\s원]/g,"");if(n&&!/^-?\d+(\.\d+)?$/.test(n))return err(`금액이 숫자가 아닙니다: ${val}`);x=n?Math.round(+n):0}
      else if(key==="repeat")x=truthy(x);
      else if(key==="people"){const n=String(x).replace(/[,\s명]/g,"");if(n&&!/^\d+$/.test(n))return err(`대상 인원이 숫자가 아닙니다: ${val}`);x=n?+n:""}
      else if(key==="state"){if(x&&!SAFETY_STATES.includes(x))return err(`상태는 ${SAFETY_STATES.join("/")} 중 하나여야 합니다: ${x}`);x=x||SAFETY_STATES[0]}
      else if(key==="cost"){const n=String(x).replace(/[,\s원]/g,"");if(n&&!/^\d+(\.\d+)?$/.test(n))return err(`지출(예정)금액이 숫자가 아닙니다: ${val}`);x=n?Math.round(+n):0}
      else if(key==="status"){x=OLD_ISSUE.status[x]||x;if(x&&!STATUSES.includes(x))return err(`처리상태는 ${STATUSES.join("/")} 중 하나여야 합니다: ${x}`);x=x||STATUSES[0]}
      else if(key==="type"&&k==="issues")x=OLD_ISSUE.type[x]||x;
      else if(key==="acc"){if(x&&!ACC_KINDS.includes(x))return err(`재해구분은 ${ACC_KINDS.join("/")} 중 하나여야 합니다: ${x}`)}
      else if(key==="leave"){if(x&&!LEAVE_KINDS.includes(x))return err(`휴업구분은 ${LEAVE_KINDS.join("/")} 중 하나여야 합니다: ${x}`)}
      if(x===""&&!(key in d))continue;d[key]=x}
    if(k==="issues"){d.status=d.status||STATUSES[0];d.type=d.type||ISSUE_TYPES[0]}else if(k==="safety"){d.state=d.state||SAFETY_STATES[0];d.type=d.type||SAFETY_TYPES[0]}else{d.type=d.type||REC[k].types[0];d.amount=d.amount||0;d.repeat=!!d.repeat}
    if(old&&JSON.stringify(d)===JSON.stringify(strip(old))){plan.same++;return}
    (old?plan.upd:plan.add).push({id:old?old.id:null,name:`${site.f[NAME]} · ${d.title}`,data:d})});
  return plan}
async function xlUpload(k,file){let books;try{books=await XLSXLite.read(file)}catch(e){console.error(e);toast("엑셀 파일을 읽지 못했습니다: "+(e.message||".xlsx 파일인지 확인하세요"));return}
  const ks=xlKeys(k);let items=ks.map(x=>({k:x,sh:books.find(b=>b.name===XL[x].title)})).filter(i=>i.sh);
  if(!items.length&&books[0]){// 시트 이름이 다르면 첫 시트의 머리글로 판단
    const head=(books[0].rows[0]||[]).map(h=>String(h).trim());const g=ks.length===1?ks[0]:ks.find(x=>XL[x].cols().filter(c=>c[1]!=="id").every(c=>head.includes(c[0])))||ks.find(x=>head.includes(XL[x].cols()[2][0]));
    if(g)items=[{k:g,sh:books[0]}]}
  if(!items.length){toast(`시트를 찾지 못했습니다. 시트 이름을 ${ks.map(x=>"‘"+XL[x].title+"’").join(" 또는 ")}(으)로 해 주세요.`);return}
  xlConfirm(items.map(i=>({k:i.k,plan:xlPlan(i.k,i.sh.rows)})),file.name,xlTitle(k))}
function xlConfirm(items,fname,title){const root=$("#modal-root"),sum=f=>items.reduce((n,i)=>n+f(i.plan),0);
  const nAdd=sum(p=>p.add.length),nUpd=sum(p=>p.upd.length),nSame=sum(p=>p.same),nErr=sum(p=>p.errs.length),n=nAdd+nUpd,multi=items.length>1;
  const li=a=>a.slice(0,8).map(x=>`<li>${esc(x.name||"")}</li>`).join("")+(a.length>8?`<li class="muted">외 ${a.length-8}건</li>`:"");
  const part=({k,plan})=>`${multi?`<h3 style="margin:6px 0 0;font-size:14px">${esc(XL[k].title)} <span class="tiny muted">추가 ${plan.add.length} · 변경 ${plan.upd.length} · 그대로 ${plan.same}${plan.errs.length?` · 오류 ${plan.errs.length}`:""}</span></h3>`:""}
    ${plan.add.length?`<section><h3 class="sec-t">새로 추가</h3><ul>${li(plan.add)}</ul></section>`:""}
    ${plan.upd.length?`<section><h3 class="sec-t">변경</h3><ul>${li(plan.upd)}</ul></section>`:""}
    ${plan.errs.length?`<section><h3 class="sec-t" style="color:var(--bad)">오류 (반영하지 않음)</h3><ul>${plan.errs.slice(0,20).map(e=>`<li><span class="mono">${e.row}행</span> ${esc(e.msg)}</li>`).join("")}${plan.errs.length>20?`<li class="muted">외 ${plan.errs.length-20}건</li>`:""}</ul></section>`:""}
    ${plan.ignored.length?`<p class="tiny muted">알 수 없는 열이라 무시합니다: ${esc(plan.ignored.join(", "))}</p>`:""}`;
  root.innerHTML=`<div class="drawer-bg" data-x></div><div class="modal" role="dialog" aria-modal="true" aria-label="엑셀 업로드 확인">
    <h2>${esc(title)} 엑셀 업로드</h2><p class="tiny muted mono">${esc(fname)}</p>
    <div class="chips"><span class="pill p-acc">새로 추가 ${nAdd}건</span><span class="pill p-prog">변경 ${nUpd}건</span><span class="pill p-neutral">그대로 ${nSame}건</span>${nErr?`<span class="pill p-open">오류 ${nErr}건</span>`:""}</div>
    ${items.map(part).join("")}
    <p class="tiny muted">파일에 없는 기존 자료는 지우지 않습니다.${items.some(i=>i.k==="sites")?" 파일에 있는 열의 빈 칸은 값을 지웁니다.":""}</p>
    <div style="display:flex;gap:8px;justify-content:flex-end">${n?`<button class="btn pri" id="xlGo">${n}건 반영</button>`:""}<button class="btn" data-x>${n?"취소":"닫기"}</button></div></div>`;
  const close=()=>{root.innerHTML=""};$$("[data-x]",root).forEach(b=>b.onclick=close);
  const go=$("#xlGo");if(go)go.onclick=async()=>{go.disabled=true;go.textContent="반영 중…";const now=new Date().toISOString();let done=0,ord=Math.max(0,...S.sites.map(x=>x.order||0));
    try{for(const {k,plan} of items)for(const x of [...plan.upd,...plan.add]){
        if(k==="sites"){const id=x.id||"s"+Date.now().toString(36)+done;await db.doc("sites/"+id).set({...x.data,order:x.data.order??++ord,updatedAt:now,updatedBy:uid||""})}
        else if(x.id)await db.doc(k+"/"+x.id).set({...x.data,updatedAt:now});
        else await db.collection(k).add({...x.data,by:uid||"",createdAt:now,updatedAt:now});
        done++;go.textContent=`반영 중… ${done}/${n}`}
      close();toast(`${done}건을 반영했습니다`)}catch(e){close();err(e);if(done)toast(`${done}건 반영 후 중단됐습니다`)}}}
// 메뉴 머리의 버튼
const xlBtns=k=>`<button class="btn" data-xl-down="${k}">엑셀 다운로드</button>${db&&!readOnly?`<button class="btn" data-xl-up="${k}">엑셀 업로드</button>`:""}`;
document.addEventListener("click",e=>{const d=e.target.closest("[data-xl-down]");if(d){xlDownload(d.dataset.xlDown);return}
  const u=e.target.closest("[data-xl-up]");if(u){const inp=$("#xlFile");inp.dataset.k=u.dataset.xlUp;inp.value="";inp.click()}});
$("#xlFile").onchange=e=>{const f=e.target.files[0];if(f)xlUpload(e.target.dataset.k,f)};
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("#modal-root").innerHTML)$("#modal-root").innerHTML=""});

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
  sub("issues",a=>S.issues=a.map(normIssue));
  sub("safety",a=>S.safety=a);
  sub("bills",a=>S.bills=a);
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
$("#bkExport").onclick=xlDownloadAll;
$("#bkImport").onclick=()=>$("#bkFile").click();
$("#bkFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{await db.importJSON(await f.text());toast("백업을 불러왔습니다")}catch(x){toast("불러오지 못했습니다: "+(x.message||"파일 형식을 확인하세요"))}e.target.value=""};
// Supabase 모드: 이 브라우저(localStorage)의 기존 데이터를 공용 저장소로 올림 (같은 id 는 덮어씀)
$("#bkReset").onclick=e=>armDelete(e.currentTarget,async()=>{
  if(!supa){db.reset();toast("엑셀 원본 상태로 초기화했습니다");return}
  try{const n=await window.SupaDB.uploadLocal();toast(`이 브라우저 데이터 ${n}건을 올렸습니다`)}catch(x){err(x)}},supa?"한 번 더 눌러 올리기":"");
render();
boot();

})();
