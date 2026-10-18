# 윌앤비전 급여·노무 관리

사업장별 급여기초 정보 필터링, 노무 문제·급여 특이사항 입력을 하는 웹페이지입니다.
설치할 프로그램이나 서버가 없어도 브라우저에서 바로 열립니다.

## 실행 방법

1. VS Code에서 **파일 → 폴더 열기**로 이 폴더(`willvi-payroll`)를 엽니다.
2. 오른쪽 아래에 "권장 확장 설치" 안내가 뜨면 **Live Server**를 설치합니다.
3. `index.html`을 연 상태에서 오른쪽 아래 **Go Live**를 누르면 브라우저가 열립니다.
   - Live Server 없이 `index.html`을 더블클릭해도 됩니다.
   - 단, 두 방식은 저장 위치가 달라서 **입력한 내용이 서로 보이지 않습니다.** 한 가지 방식만 쓰세요.

## 폴더 구조

```
willvi-payroll/
├─ index.html              화면 뼈대 (메뉴, 레이아웃)
├─ css/style.css           디자인 (색상은 맨 위 :root 에서 한 번에 바꿀 수 있음)
├─ js/app.js               화면 동작 (홈, 급여기초, 노무 문제, 급여 특이사항)
├─ js/config.js            Supabase 설정 안내 (실제 값은 config.local.js, GitHub에 안 올라감)
├─ js/store.js             저장 기능 (브라우저 localStorage)
├─ js/store-supabase.js    저장 기능 (Supabase 공용 저장소, 공용 계정 로그인)
├─ supabase/schema.sql     Supabase 테이블 만들기 SQL
├─ data/seed-sites.js      엑셀에서 가져온 사업장 정보 (처음 열 때 사용)
├─ tools/excel_to_seed.py  엑셀 → seed-sites.js 변환 스크립트
├─ tools/vercel-build.mjs  Vercel 배포용 빌드 (환경 변수 → Supabase 설정)
├─ vercel.json             Vercel 설정
└─ .vscode/                VS Code 권장 확장·설정
```

## 데이터 저장 방식

아래는 `js/config.js`가 비어 있을 때(기본값)의 설명입니다. Supabase를 쓰려면 아래 "Supabase 연동"을 보세요.

- 입력한 내용은 **지금 쓰는 PC의 브라우저 안에만** 저장됩니다. 서버에 올라가지 않습니다.
- 그래서 다른 PC나 다른 팀원과는 자동으로 공유되지 않습니다.
- 화면 왼쪽 아래 버튼으로 관리합니다.
  - **백업 저장**: 전체 데이터를 JSON 파일로 내려받습니다. 주기적으로 받아 두세요.
  - **백업 불러오기**: 백업 파일로 전체 데이터를 덮어씁니다.
  - **엑셀 원본으로 초기화**: `data/seed-sites.js` 상태로 되돌립니다. 입력한 노무 문제·특이사항이 모두 지워지니 먼저 백업하세요. 실수 방지를 위해 두 번 눌러야 실행됩니다.
- 브라우저의 "인터넷 사용 기록 삭제"에서 사이트 데이터를 지우면 저장 내용도 지워집니다.

## Supabase 연동 (팀 공용 저장소)

Supabase에 저장하고, 팀 공용 계정 1개로 로그인해서 씁니다. 다른 사람이 고친 내용은 바로 화면에 반영됩니다.

1. [supabase.com](https://supabase.com)에서 프로젝트를 만듭니다. Region은 Seoul을 권장합니다.
2. **SQL Editor**에 `supabase/schema.sql` 내용을 붙여 넣고 **Run** 합니다.
3. **Authentication → Users → Add user → Create new user**로 팀 공용 계정을 하나 만듭니다. **Auto Confirm User**를 체크하세요.
4. ⚠️ **Authentication → Sign In / Providers**에서 **Allow new users to sign up**을 끕니다. 켜져 있으면 누구나 가입해서 데이터를 볼 수 있습니다.
5. **Project Settings → API Keys**에서 Project URL과 `anon` `public` 키를 복사합니다. `service_role`(secret) 키는 절대 쓰지 마세요.
6. 설정 넣기
   - **Vercel로 배포할 때**: 아래 "Vercel 배포"를 보세요.
   - **PC에서 파일로 열 때**: `js/config.local.js` 파일을 만들고 아래처럼 넣습니다. 이 파일은 GitHub에 올라가지 않습니다.
     ```js
     window.WV_CONFIG = {
       supabaseUrl: "https://abcdefgh.supabase.co",
       supabaseAnonKey: "eyJhbGciOi..."
     };
     ```
7. **기존 데이터 옮기기**: 기존에 쓰던 PC·브라우저·열기 방식 그대로 페이지를 열고 로그인한 뒤, 왼쪽 아래 **이 브라우저 데이터 올리기**를 두 번 누릅니다. 같은 항목은 덮어쓰니 한 사람이 한 번만 하세요.

Supabase 모드에서는 "엑셀 원본으로 초기화" 버튼이 없습니다(공용 데이터를 한 번에 지우지 않도록).
**백업 불러오기**는 백업 파일의 내용을 Supabase에 올리며, 백업에 없는 항목은 지우지 않습니다.

## Vercel 배포

1. [vercel.com](https://vercel.com)에서 **Add New → Project**로 이 GitHub 저장소를 가져옵니다(Import).
2. **Environment Variables**에 두 개를 넣습니다.
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_ANON_KEY` = anon public 키
3. **Deploy**를 누릅니다. 빌드 설정은 `vercel.json`에 있어서 따로 고칠 것이 없습니다.
4. 도메인은 Vercel 프로젝트 → **Settings → Domains**에서 연결합니다.

- 두 환경 변수가 없으면 배포가 실패합니다(실수로 브라우저 저장 방식으로 올라가지 않도록).
- `data/seed-sites.js`(엑셀 원본: 담당자 이름·연락처)는 배포에 포함하지 않습니다.

## 엑셀이 바뀌었을 때

VS Code 터미널(**보기 → 터미널**)에서:

```bash
pip install openpyxl
python tools/excel_to_seed.py "급여기초.xlsx"
```

`data/seed-sites.js`가 새로 만들어집니다. 화면에 반영하려면 **백업 저장 → 엑셀 원본으로 초기화** 순서로 진행하세요.
엑셀은 첫 번째 시트의 1행을 열 이름으로 읽습니다. 열을 추가해도 상세 화면의 '추가 항목'에 나타납니다.

## 고치기 쉬운 곳 (js/app.js 맨 위)

| 바꾸고 싶은 것 | 상수 이름 |
|---|---|
| 급여기초 표의 열 묶음 (기본·담당자·급여…) | `GROUPS` |
| 급여기초 필터 항목 | `FILTERS` |
| 노무 문제 유형 | `ISSUE_TYPES` |
| 처리 상태 | `STATUSES` |
| 노무 문제 위험도 | `RISKS` |
| 급여 특이사항 구분 | `NOTE_TYPES` |

## 팀이 함께 쓰려면

지금 구조는 한 PC용입니다. 여러 명이 같은 데이터를 보려면 `js/store.js`를 서버 DB(예: Firebase, Supabase, 사내 서버)에 연결하는 방식으로 바꾸면 됩니다.
`app.js`는 `store.js`의 `collection / doc / onSnapshot / set / update / delete`만 쓰므로 화면 코드는 그대로 둘 수 있습니다.
