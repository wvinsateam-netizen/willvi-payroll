"""
data/seed-sites.js → supabase/seed.sql 변환 스크립트

사용법 (VS Code 터미널):
    python tools/seed_to_sql.py

- 만든 seed.sql 을 Supabase → SQL Editor 에 붙여넣고 Run 하면 사업장 정보가 공유 DB에 들어갑니다.
- 이미 있는 사업장(같은 id)은 건너뜁니다. 화면에서 고친 내용을 덮어쓰지 않습니다.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "seed-sites.js"
OUT = ROOT / "supabase" / "seed.sql"


def main():
    text = SRC.read_text(encoding="utf-8")
    sites = json.loads(text[text.index("["): text.rindex("]") + 1])
    rows = []
    for s in sites:
        doc = json.dumps(s["data"], ensure_ascii=False).replace("'", "''")
        sid = s["id"].replace("'", "''")
        rows.append(f"  ('sites', '{sid}', '{doc}'::jsonb, 'seed')")
    sql = (
        "-- tools/seed_to_sql.py 로 생성된 파일입니다. schema.sql 을 먼저 실행한 뒤 실행하세요.\n"
        "insert into public.docs (col, id, data, updated_by) values\n"
        + ",\n".join(rows)
        + "\non conflict (col, id) do nothing;\n"
    )
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(sql, encoding="utf-8")
    print(f"{len(rows)}개 사업장 → {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
