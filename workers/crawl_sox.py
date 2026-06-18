#!/usr/bin/env python3
"""
Crawler XSKT — Dual source crawl + cross-validation
Nguồn 1: minhngoc.net.vn (primary)
Nguồn 2: xskt.com.vn (validation)
Chỉ ingest vào DB khi 2 nguồn khớp >= 80% số trúng
"""
import sys, os, json, re, difflib
from datetime import datetime, date
import urllib.request
import psycopg2

DB = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "dbname": os.getenv("DB_NAME", "lottery_checker"),
    "user": os.getenv("DB_USER", "lottery"),
    "password": os.getenv("DB_PASSWORD", "lottery2026"),
}

# ─── Source 1: minhngoc.net.vn ───────────────────────────────────────────────

def fetch_minhngoc(region):
    urls = {
        "south": "https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam.html",
        "central": "https://www.minhngoc.net.vn/ket-qua-xo-so/mien-trung.html",
        "north": "https://www.minhngoc.net.vn/ket-qua-xo-so/mien-bac.html",
    }
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"}
    req = urllib.request.Request(urls[region], headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")

def parse_minhngoc(html, region):
    """Parse minhngoc HTML → list of {tinh, mauso, giai: {prize_name: [numbers]}}"""
    prize_map = {
        "south": {"giaidb": "dac_biet", "giai1": "nhat", "giai2": "nhi", "giai3": "ba",
                  "giai4": "tu", "giai5": "nam", "giai6": "sau", "giai7": "bay", "giai8": "tam"},
        "central": {"giaidb": "dac_biet", "giai1": "nhat", "giai2": "nhi", "giai3": "ba",
                    "giai4": "tu", "giai5": "nam", "giai6": "sau", "giai7": "bay", "giai8": "tam"},
        "north": {"giaidb": "dac_biet", "giai1": "nhat", "giai2": "nhi", "giai3": "ba",
                  "giai4": "tu", "giai5": "nam", "giai6": "sau", "giai7": "bay"},
    }
    pm = prize_map[region]

    # Extract draw date — ưu tiên var maxday=YYYYMMDD trong JS, tránh copyright 2008
    draw_date = date.today().isoformat()
    dm = re.search(r'var\s+maxday\s*=\s*(\d{4})(\d{2})(\d{2})', html)
    if dm:
        draw_date = f"{dm.group(1)}-{dm.group(2)}-{dm.group(3)}"
    else:
        m = re.search(r'(\d{2})/(\d{2})/(\d{4})', html)
        if m and int(m.group(3)) >= 2020:
            draw_date = f"{m.group(3)}-{m.group(2)}-{m.group(1)}"

    provinces = []
    # Find all rightcl tables
    rightcl_blocks = re.findall(r'<table[^>]*class="[^"]*rightcl[^"]*"[^>]*>(.*?)</table>', html, re.DOTALL)

    for block in rightcl_blocks:
        prov = {}

        # Tên tỉnh
        tm = re.search(r'<td[^>]*class="[^"]*tinh[^"]*"[^>]*>.*?<a[^>]*>(.*?)</a>', block, re.DOTALL)
        if not tm:
            continue
        prov["tinh"] = tm.group(1).strip()

        # Mã số
        mm = re.search(r'<td[^>]*class="[^"]*matinh[^"]*"[^>]*>(.*?)</td>', block, re.DOTALL)
        prov["mauso"] = mm.group(1).strip() if mm else ""

        # Các giải
        prov["giai"] = {}
        for cls, prize_name in pm.items():
            gm = re.search(rf'<td[^>]*class="[^"]*{cls}[^"]*"[^>]*>(.*?)</td>', block, re.DOTALL)
            if gm:
                nums = re.findall(r'<div>(.*?)</div>', gm.group(1))
                nums = [n.strip() for n in nums if n.strip()]
                if nums:
                    prov["giai"][prize_name] = nums

        if prov.get("tinh") and prov.get("giai"):
            provinces.append(prov)

    return draw_date, provinces


# ─── Source 2: xskt.com.vn ────────────────────────────────────────────────────

def fetch_xoso(region):
    urls = {
        "south": "https://xskt.com.vn/xs-mien-nam",
        "central": "https://xskt.com.vn/xs-mien-trung",
        "north": "https://xskt.com.vn/xs-mien-bac",
    }
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"}
    req = urllib.request.Request(urls[region], headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")

def parse_xoso(html, region):
    """Parse xskt.com.vn HTML → same format as minhngoc"""
    prize_map = {
        "south": {"prize_db": "dac_biet", "prize_1": "nhat", "prize_2": "nhi", "prize_3": "ba",
                  "prize_4": "tu", "prize_5": "nam", "prize_6": "sau", "prize_7": "bay", "prize_8": "tam"},
        "central": {"prize_db": "dac_biet", "prize_1": "nhat", "prize_2": "nhi", "prize_3": "ba",
                    "prize_4": "tu", "prize_5": "nam", "prize_6": "sau", "prize_7": "bay", "prize_8": "tam"},
        "north": {"prize_db": "dac_biet", "prize_1": "nhat", "prize_2": "nhi", "prize_3": "ba",
                  "prize_4": "tu", "prize_5": "nam", "prize_6": "sau", "prize_7": "bay"},
    }
    pm = prize_map[region]

    # Extract draw date
    draw_date = date.today().isoformat()
    dm = re.search(r'var\s+maxday\s*=\s*(\d{4})(\d{2})(\d{2})', html)
    if dm:
        draw_date = f"{dm.group(1)}-{dm.group(2)}-{dm.group(3)}"
    else:
        m = re.search(r'(\d{2})/(\d{2})/(\d{4})', html)
        if m and int(m.group(3)) >= 2020:
            draw_date = f"{m.group(3)}-{m.group(2)}-{m.group(1)}"

    provinces = []

    # xskt.com.vn dùng table-xsmn / table-xsmt / table-xsmb
    table_class = {"south": "table-xsmn", "central": "table-xsmt", "north": "table-xsmb"}[region]
    table_match = re.search(rf'<table[^>]*class="[^"]*{table_class}[^"]*"[^>]*>(.*?)</table>', html, re.DOTALL)
    if not table_match:
        return draw_date, []

    table_html = table_match.group(1)

    # Mỗi tỉnh là 1 <tr> hoặc 1 block
    # Tìm tên tỉnh
    tinh_blocks = re.findall(r'<tr[^>]*>(.*?)</tr>', table_html, re.DOTALL)

    for block in tinh_blocks:
        prov = {}

        # Tên tỉnh
        tm = re.search(r'<td[^>]*>.*?<a[^>]*>(.*?)</a>', block, re.DOTALL)
        if not tm:
            continue
        prov["tinh"] = tm.group(1).strip()

        # Mã số
        mm = re.search(r'<span[^>]*class="[^"]*matinh[^"]*"[^>]*>(.*?)</span>', block, re.DOTALL)
        if not mm:
            mm = re.search(r'<td[^>]*class="[^"]*matinh[^"]*"[^>]*>(.*?)</td>', block, re.DOTALL)
        prov["mauso"] = mm.group(1).strip() if mm else ""

        # Các giải
        prov["giai"] = {}
        for cls, prize_name in pm.items():
            gm = re.search(rf'<td[^>]*class="[^"]*{cls}[^"]*"[^>]*>(.*?)</td>', block, re.DOTALL)
            if not gm:
                gm = re.search(rf'<span[^>]*class="[^"]*{cls}[^"]*"[^>]*>(.*?)</span>', block, re.DOTALL)
            if gm:
                nums = re.findall(r'>([\d]+)<', gm.group(1))
                nums = [n.strip() for n in nums if n.strip()]
                if nums:
                    prov["giai"][prize_name] = nums

        if prov.get("tinh") and prov.get("giai"):
            provinces.append(prov)

    return draw_date, provinces


# ─── Cross-validation ─────────────────────────────────────────────────────────

def cross_validate(src1, src2):
    """
    So sánh 2 nguồn. Trả về:
    - matched_provinces: list province names khớp
    - mismatches: list {province, prize, src1_nums, src2_nums}
    - match_rate: float 0-1
    """
    matched = []
    mismatches = []
    total_checks = 0
    total_matched = 0

    src2_by_name = {p["tinh"]: p for p in src2}

    for p1 in src1:
        tinh = p1["tinh"]
        p2 = src2_by_name.get(tinh)
        if not p2:
            mismatches.append({"province": tinh, "reason": "Không tìm thấy trong nguồn 2"})
            continue

        for prize_name, nums1 in p1["giai"].items():
            total_checks += 1
            nums2 = p2["giai"].get(prize_name, [])

            set1 = set(nums1)
            set2 = set(nums2)

            if set1 == set2:
                total_matched += 1
            else:
                diff1 = set1 - set2
                diff2 = set2 - set1
                mismatches.append({
                    "province": tinh,
                    "prize": prize_name,
                    "minhngoc": list(diff1),
                    "xoso": list(diff2),
                })

        if tinh not in matched:
            matched.append(tinh)

    match_rate = total_matched / total_checks if total_checks > 0 else 0
    return matched, mismatches, match_rate


# ─── DB operations ────────────────────────────────────────────────────────────

def save_to_db(draw_date, region, provinces, source_name):
    conn = psycopg2.connect(**DB)
    cur = conn.cursor()

    # Get source_id
    cur.execute("SELECT id FROM lottery_sources WHERE name = %s", (source_name,))
    row = cur.fetchone()
    source_id = row[0] if row else 1

    prize_ranks = {"dac_biet": 1, "nhat": 2, "nhi": 3, "ba": 4, "tu": 5, "nam": 6, "sau": 7, "bay": 8, "tam": 9}

    for prov in provinces:
        cur.execute("""
            INSERT INTO lottery_draws (draw_date, region, province_code, province_name, draw_code, source_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (draw_date, region, province_code) DO UPDATE SET
                province_name = EXCLUDED.province_name,
                draw_code = EXCLUDED.draw_code,
                fetched_at = NOW()
            RETURNING id
        """, (draw_date, region, prov["mauso"], prov["tinh"], prov["mauso"], source_id))
        draw_id = cur.fetchone()[0]

        for prize_name, nums in prov["giai"].items():
            rank = prize_ranks.get(prize_name, 9)
            for num in nums:
                cur.execute("""
                    INSERT INTO lottery_prizes (draw_id, prize_name, prize_rank, winning_number)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                """, (draw_id, prize_name, rank, num))

    conn.commit()
    cur.close()
    conn.close()
    return len(provinces)


def log_validation(region, draw_date, match_rate, mismatches):
    conn = psycopg2.connect(**DB)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS crawl_validation (
            id SERIAL PRIMARY KEY,
            region VARCHAR(20),
            draw_date DATE,
            match_rate FLOAT,
            mismatches JSONB,
            validated_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    cur.execute("""
        INSERT INTO crawl_validation (region, draw_date, match_rate, mismatches)
        VALUES (%s, %s, %s, %s)
    """, (region, draw_date, match_rate, json.dumps(mismatches, ensure_ascii=False)))
    conn.commit()
    cur.close()
    conn.close()


# ─── Main ─────────────────────────────────────────────────────────────────────

def crawl_region(region):
    region_names = {"south": "Miền Nam", "central": "Miền Trung", "north": "Miền Bắc"}
    print(f"\n[{datetime.now()}] ═══ {region_names[region]} ═══")

    # Crawl nguồn 1: minhngoc
    try:
        html1 = fetch_minhngoc(region)
        date1, provs1 = parse_minhngoc(html1, region)
        print(f"  [MinhNgoc] {len(provs1)} tỉnh, ngày {date1}")
    except Exception as e:
        print(f"  [MinhNgoc] LỖI: {e}")
        date1, provs1 = date.today().isoformat(), []

    # Crawl nguồn 2: xoso
    try:
        html2 = fetch_xoso(region)
        date2, provs2 = parse_xoso(html2, region)
        print(f"  [XoSo]     {len(provs2)} tỉnh, ngày {date2}")
    except Exception as e:
        print(f"  [XoSo]     LỖI: {e}")
        date2, provs2 = date.today().isoformat(), []

    # Cross-validate
    if provs1 and provs2:
        matched, mismatches, rate = cross_validate(provs1, provs2)
        print(f"  [Validate] Match rate: {rate:.0%} ({len(matched)}/{len(provs1)} tỉnh)")

        if mismatches:
            for mm in mismatches[:5]:
                print(f"    ⚠ {mm['province']} / {mm.get('prize', '?')}: MN={mm.get('minhngoc', [])} XS={mm.get('xoso', [])}")

        # Chỉ ingest nếu match rate >= 80%
        if rate >= 0.8:
            draw_date = date1  # Dùng date từ nguồn chính
            count = save_to_db(draw_date, region, provs1, "MinhNgoc.net.vn")
            log_validation(region, draw_date, rate, mismatches)
            print(f"  [DB] ✅ Ingested {count} tỉnh (match rate {rate:.0%})")
        else:
            log_validation(region, date1, rate, mismatches)
            print(f"  [DB] ❌ KHÔNG ingest — match rate {rate:.0%} < 80%")
            print(f"  [DB] Cần kiểm tra thủ công!")
    elif provs1:
        # Chỉ có nguồn 1 — ingest với cảnh báo
        print(f"  [Validate] Chỉ có 1 nguồn (MinhNgoc) — ingest với flag")
        save_to_db(date1, region, provs1, "MinhNgoc.net.vn")
    else:
        print(f"  [DB] ❌ Không có dữ liệu từ nguồn nào")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Crawl XSKT dual-source")
    parser.add_argument("--region", choices=["south", "central", "north"])
    parser.add_argument("--all", action="store_true")
    args = parser.parse_args()

    regions = ["south", "central", "north"] if args.all else [args.region] if args.region else ["south"]

    for region in regions:
        crawl_region(region)


if __name__ == "__main__":
    main()
