"""
급여기초 엑셀 → data/seed-sites.js 변환 스크립트

사용법 (VS Code 터미널):
    pip install openpyxl
    python tools/excel_to_seed.py "급여기초.xlsx"

- 첫 번째 시트의 1행을 열 이름으로, 2행부터를 사업장으로 읽습니다.
- 만든 파일은 '처음 열 때' 또는 화면의 [엑셀 원본으로 초기화]를 눌렀을 때 반영됩니다.
  (초기화하면 입력해 둔 노무 문제·특이사항·통상임금도 지워지니, 먼저 [백업 저장]을 하세요.)
"""
import datetime
import json
import re
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "seed-sites.js"


def clean_header(h):
    return re.sub(r"\s+", " ", str(h)).strip() if h is not None else None


def convert(header, value):
    if value is None:
        return ""
    if isinstance(value, datetime.datetime):
        return value.strftime("%Y-%m-%d")
    # 날짜 열에 숫자(엑셀 일련번호)로 들어간 값 → 날짜
    if header and "일" in header and isinstance(value, (int, float)) and 30000 < value < 60000:
        return (datetime.date(1899, 12, 30) + datetime.timedelta(days=int(value))).isoformat()
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    return str(value).strip()


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
    ws = wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    headers = [clean_header(h) for h in rows[0]]

    sites = []
    for row in rows[1:]:
        fields = {h: convert(h, v) for h, v in zip(headers, row) if h}
        fields = {k: v for k, v in fields.items() if v != ""}
        if not fields.get("사업장명"):
            continue
        n = len(sites) + 1
        sites.append({"id": f"s{n:02d}", "data": {"order": n, "f": fields, "source": "엑셀 원본"}})

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(
        "// tools/excel_to_seed.py 로 생성된 파일입니다. 직접 고치기보다 엑셀을 고친 뒤 다시 생성하세요.\n"
        "window.SEED_SITES = " + json.dumps(sites, ensure_ascii=False, indent=1) + ";\n",
        encoding="utf-8",
    )
    print(f"사업장 {len(sites)}곳 → {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
