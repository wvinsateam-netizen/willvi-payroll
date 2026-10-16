# 윌앤비전 급여·노무 관리

사업장별 급여기초 정보 필터링, 노무 문제·급여 특이사항 입력, 통상임금 포함항목 관리와 통상시급 계산을 하는 웹페이지입니다.
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
├─ js/app.js               화면 동작 (홈, 급여기초, 노무 문제, 급여 특이사항, 통상임금)
├─ js/store.js             저장 기능 (브라우저 localStorage)
├─ data/seed-sites.js      엑셀에서 가져온 사업장 정보 (처음 열 때 사용)
├─ tools/excel_to_seed.py  엑셀 → seed-sites.js 변환 스크립트
└─ .vscode/                VS Code 권장 확장·설정
```

## 데이터 저장 방식

- 입력한 내용은 **지금 쓰는 PC의 브라우저 안에만** 저장됩니다. 서버에 올라가지 않습니다.
- 그래서 다른 PC나 다른 팀원과는 자동으로 공유되지 않습니다.
- 화면 왼쪽 아래 버튼으로 관리합니다.
  - **백업 저장**: 전체 데이터를 JSON 파일로 내려받습니다. 주기적으로 받아 두세요.
  - **백업 불러오기**: 백업 파일로 전체 데이터를 덮어씁니다.
  - **엑셀 원본으로 초기화**: `data/seed-sites.js` 상태로 되돌립니다. 입력한 노무 문제·특이사항·통상임금이 모두 지워지니 먼저 백업하세요. 실수 방지를 위해 두 번 눌러야 실행됩니다.
- 브라우저의 "인터넷 사용 기록 삭제"에서 사이트 데이터를 지우면 저장 내용도 지워집니다.

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
| 통상임금 기본 항목 틀 | `DEFAULT_WAGE` |

## 팀이 함께 쓰려면 (Supabase 공유 DB + Vercel 배포)

`js/config.js`에 Supabase 주소와 키를 넣으면 로그인 화면이 나오고, 데이터가 공유 DB에 저장됩니다.
비워 두면 위의 "데이터 저장 방식"처럼 브라우저에만 저장합니다.

### 처음 한 번 설정

1. **Supabase 프로젝트 만들기**: Vercel 프로젝트 → Storage → Supabase로 만들거나, supabase.com에서 직접 만듭니다.
2. **테이블 만들기**: Supabase → SQL Editor에 `supabase/schema.sql`을 통째로 붙여넣고 Run 합니다.
3. **사업장 정보 넣기**: `supabase/seed.sql`을 SQL Editor에 붙여넣고 Run 합니다.
   (엑셀이 바뀌면 `python tools/excel_to_seed.py ...` → `python tools/seed_to_sql.py` 순서로 다시 만듭니다. 이미 있는 사업장은 덮어쓰지 않습니다.)
4. **회원가입 막기**: Authentication → Sign In / Providers → **Allow new users to sign up 끄기**.
5. **사용자 등록** (한 명마다):
   - Authentication → Users → **Add user → Create new user**로 이메일·비밀번호를 만듭니다. (Auto Confirm 체크)
   - SQL Editor에서 사용 권한을 줍니다:
     `insert into public.members (email, name) values ('이메일', '이름');`
   - 권한을 뺄 때: `delete from public.members where email = '이메일';`
6. **키 넣기**: Supabase → Project Settings → API의 **Project URL**과 **anon public** 키를 `js/config.js`에 넣고 커밋합니다.
   anon 키는 공개되어도 되는 키입니다. **service_role 키는 절대 넣지 마세요.**
7. **배포**: GitHub에 push 하면 Vercel이 자동으로 배포합니다. (Vercel 설정: Preset `Other`, Build Command 비움)

### 알아둘 점

- `data/`, `supabase/`, `tools/`는 `.vercelignore`로 배포에서 빠집니다. 사업장 원본이 공개 주소로 노출되지 않게 하기 위해서입니다.
- 기존에 브라우저에 입력해 둔 내용은: 예전 방식(키를 비운 상태)으로 열어 **백업 저장** → 공유 DB에 로그인한 뒤 **백업 불러오기**. 공유 DB에서는 덮어쓰기가 아니라 **합치기**로 들어갑니다.
- 공유 DB에서는 **엑셀 원본으로 초기화** 버튼이 숨겨집니다. (모든 사람의 데이터가 지워지는 것을 막기 위해)
- 다른 사람이 저장한 내용은 새로고침 없이 바로 반영됩니다. 같은 항목을 동시에 고치면 나중에 저장한 쪽이 남습니다.
