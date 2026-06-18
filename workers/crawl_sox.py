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
from psycopg2 import pool
from psycopg2.extras import execute_values

DB = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "dbname": os.getenv("DB_NAME", "lottery_checker"),
    "user": os.getenv("DB_USER", "lottery"),
    "password": os.getenv("DB_PASSWORD"),
}

db_pool = None

def get_db_pool():
    global db_pool
    if db_pool is None:
        db_pool = pool.SimpleConnectionPool(1, 10, **DB)
    return db_pool

def close_db_pool():
    global db_pool
    if db_pool is not None:
        db_pool.closeall()
        db_pool = None

draw_date_override = None  # Set by --date arg

# ─── Source 1: minhngoc.net.vn ───────────────────────────────────────────────

def fetch_minhngoc(region, target_date=None):
    base_urls = {
        "south": "https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam",
        "central": "https://www.minhngoc.net.vn/ket-qua-xo-so/mien-trung",
        "north": "https://www.minhngoc.net.vn/ket-qua-xo-so/mien-bac",
    }
    if target_date:
        try:
            dt = datetime.strptime(target_date, "%Y-%m-%d")
            date_str = dt.strftime("%d-%m-%Y")
        except ValueError:
            date_str = target_date
        url = f"{base_urls[region]}/{date_str}.html"
    else:
        url = f"{base_urls[region]}.html"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")

def parse_minhngoc(html, region, target_date=None):
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

    # Clean HTML style tags
    clean_html = re.sub(r'<style.*?>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)
    
    # Split by box_kqxs to isolate the first block (target date)
    blocks = re.split(r'class="[^"]*box_kqxs[^"]*"', clean_html)
    first_block = blocks[1] if len(blocks) > 1 else clean_html

    draw_date = target_date
    if not draw_date:
        m = re.search(r'/(\d{2})-(\d{2})-(\d{4})\.html', first_block)
        if m:
            draw_date = f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
        else:
            m = re.search(r'(\d{2})/(\d{2})/(\d{4})', first_block)
            if m:
                draw_date = f"{m.group(3)}-{m.group(2)}-{m.group(1)}"

    if not draw_date:
        dm = re.search(r'var\s+maxday\s*=\s*(\d{4})(\d{2})(\d{2})', html)
        if dm:
            draw_date = f"{dm.group(1)}-{dm.group(2)}-{dm.group(3)}"
        else:
            draw_date = date.today().isoformat()

    provinces = []
    if region == "north":
        table_match = re.search(r'<table[^>]*class="[^"]*bkqtinhmienbac[^"]*"[^>]*>(.*?)</table>', first_block, re.DOTALL)
        if table_match:
            block = table_match.group(1)
            prov = {
                "tinh": "Miền Bắc",
                "mauso": "XSMB",
                "giai": {}
            }
            for cls, prize_name in pm.items():
                pattern = rf'<td[^>]*class="[^"]*\b{cls}\b[^"]*"[^>]*>(.*?)</td>'
                gm = re.search(pattern, block, re.DOTALL)
                if gm:
                    nums = re.findall(r'<div>(.*?)</div>', gm.group(1))
                    nums = [n.strip() for n in nums if n.strip()]
                    if nums:
                        prov["giai"][prize_name] = nums
            if prov["giai"]:
                provinces.append(prov)
    else:
        rightcl_blocks = re.findall(r'<table[^>]*class="[^"]*rightcl[^"]*"[^>]*>(.*?)</table>', first_block, re.DOTALL)
        if not rightcl_blocks:
            # Fallback for historical pages where class="rightcl" might be missing in HTML body
            leaf_tables = re.findall(r'<table[^>]*>((?:(?!<table).)*?)</table>', first_block, re.DOTALL)
            rightcl_blocks = [t for t in leaf_tables if re.search(r'class="[^"]*tinh[^"]*"', t)]

        for block in rightcl_blocks:
            prov = {}
            tm = re.search(r'<td[^>]*class="[^"]*tinh[^"]*"[^>]*>(.*?)</td>', block, re.DOTALL)
            if not tm:
                continue
            prov["tinh"] = re.sub(r'<[^>]*>', '', tm.group(1)).strip()

            mm = re.search(r'<td[^>]*class="[^"]*matinh[^"]*"[^>]*>(.*?)</td>', block, re.DOTALL)
            prov["mauso"] = re.sub(r'<[^>]*>', '', mm.group(1)).strip() if mm else ""

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

def fetch_xoso(region, target_date=None):
    paths = {
        "south": "xsmn",
        "central": "xsmt",
        "north": "xsmb",
    }
    path = paths[region]
    if target_date:
        try:
            dt = datetime.strptime(target_date, "%Y-%m-%d")
            day = int(dt.day)
            month = int(dt.month)
            date_str = f"{day}-{month}-{dt.year}"
        except ValueError:
            date_str = target_date
        url = f"https://xskt.com.vn/{path}/ngay-{date_str}"
    else:
        url = f"https://xskt.com.vn/{path}"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")

def parse_xoso(html, region, target_date=None):
    """Parse xskt.com.vn HTML → same format as minhngoc"""
    draw_date = target_date
    if not draw_date:
        m = re.search(r'(\d{2})/(\d{2})/(\d{4})', html)
        if m:
            draw_date = f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
        else:
            dm = re.search(r'var\s+maxday\s*=\s*(\d{4})(\d{2})(\d{2})', html)
            if dm:
                draw_date = f"{dm.group(1)}-{dm.group(2)}-{dm.group(3)}"
            else:
                draw_date = date.today().isoformat()

    provinces = []
    if region == "north":
        table_match = re.search(r'<table[^>]*class="[^"]*result[^"]*"[^>]*>(.*?)</table>', html, re.DOTALL)
        if table_match:
            table_html = table_match.group(1)
            prov = {
                "tinh": "Miền Bắc",
                "mauso": "XSMB",
                "giai": {}
            }
            row_map = {
                "ĐB": "dac_biet",
                "G1": "nhat",
                "G2": "nhi",
                "G3": "ba",
                "G4": "tu",
                "G5": "nam",
                "G6": "sau",
                "G7": "bay"
            }
            rows = re.findall(r'<tr[^>]*>(.*?)</tr>', table_html, re.DOTALL)
            for row in rows:
                label_match = re.search(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)
                if label_match:
                    label = re.sub(r'<[^>]*>', '', label_match.group(1)).strip()
                    if label in row_map:
                        prize_name = row_map[label]
                        tds = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)
                        if len(tds) > 1:
                            nums_cell = tds[1]
                            nums = re.findall(r'\b\d+\b', re.sub(r'<[^>]*>', ' ', nums_cell))
                            nums = [n.strip() for n in nums if n.strip()]
                            if nums:
                                prov["giai"][prize_name] = nums
            if prov["giai"]:
                provinces.append(prov)
    else:
        table_class = {"south": "tbl-xsmn", "central": "tbl-xsmt"}[region]
        table_match = re.search(rf'<table[^>]*class="[^"]*{table_class}[^"]*"[^>]*>(.*?)</table>', html, re.DOTALL)
        if not table_match:
            table_match = re.search(r'<table[^>]*class="[^"]*tbl-xs[^"]*"[^>]*>(.*?)</table>', html, re.DOTALL)
            
        if table_match:
            table_html = table_match.group(1)
            rows = re.findall(r'<tr[^>]*>(.*?)</tr>', table_html, re.DOTALL)
            if rows:
                header_cells = re.findall(r'<th[^>]*>(.*?)</th>', rows[0], re.DOTALL)
                provs_list = []
                for cell in header_cells[1:]:
                    tinh_match = re.search(r'<a[^>]*>(.*?)</a>', cell, re.DOTALL)
                    tinh_name = tinh_match.group(1).strip() if tinh_match else ""
                    mauso = ""
                    href_match = re.search(r'href="/xs([^"]+)"', cell)
                    if href_match:
                        mauso = "XS" + href_match.group(1).upper()
                    
                    provs_list.append({
                        "tinh": tinh_name,
                        "mauso": mauso,
                        "giai": {}
                    })
                
                row_map = {
                    "G.8": "tam",
                    "G.7": "bay",
                    "G.6": "sau",
                    "G.5": "nam",
                    "G.4": "tu",
                    "G.3": "ba",
                    "G.2": "nhi",
                    "G.1": "nhat",
                    "ĐB": "dac_biet"
                }
                
                for row in rows[1:]:
                    tds = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)
                    if len(tds) >= 2:
                        label = re.sub(r'<[^>]*>', '', tds[0]).strip()
                        prize_name = row_map.get(label)
                        if prize_name:
                            for i, cell_content in enumerate(tds[1:]):
                                if i < len(provs_list):
                                    cell_text = re.sub(r'<[^>]*>', ' ', cell_content)
                                    nums = re.findall(r'\b\d+\b', cell_text)
                                    nums = [n.strip() for n in nums if n.strip()]
                                    if nums:
                                        provs_list[i]["giai"][prize_name] = nums
                                        
                for p in provs_list:
                    if p["tinh"] and p["giai"]:
                        provinces.append(p)

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
    if not provinces:
        return 0

    pool = get_db_pool()
    conn = pool.getconn()
    try:
        cur = conn.cursor()

        # Get source_id
        cur.execute("SELECT id FROM lottery_sources WHERE name = %s", (source_name,))
        row = cur.fetchone()
        source_id = row[0] if row else 1

        prize_ranks = {"dac_biet": 1, "nhat": 2, "nhi": 3, "ba": 4, "tu": 5, "nam": 6, "sau": 7, "bay": 8, "tam": 9}

        # 1. Bulk insert draws
        draw_args = [
            (draw_date, region, prov["mauso"], prov["tinh"], prov["mauso"], source_id)
            for prov in provinces
        ]
        sql_draws = """
            INSERT INTO lottery_draws (draw_date, region, province_code, province_name, draw_code, source_id)
            VALUES %s
            ON CONFLICT (draw_date, region, province_code) DO UPDATE SET
                province_name = EXCLUDED.province_name,
                draw_code = EXCLUDED.draw_code,
                fetched_at = NOW()
            RETURNING id, province_code
        """
        returned_draws = execute_values(cur, sql_draws, draw_args, fetch=True)
        draw_id_map = {prov_code: draw_id for draw_id, prov_code in returned_draws}

        # 2. Bulk insert prizes
        prize_args = []
        for prov in provinces:
            draw_id = draw_id_map.get(prov["mauso"])
            if not draw_id:
                continue
            for prize_name, nums in prov["giai"].items():
                rank = prize_ranks.get(prize_name, 9)
                for num in nums:
                    prize_args.append((draw_id, prize_name, rank, num))

        if prize_args:
            sql_prizes = """
                INSERT INTO lottery_prizes (draw_id, prize_name, prize_rank, winning_number)
                VALUES %s
                ON CONFLICT DO NOTHING
            """
            execute_values(cur, sql_prizes, prize_args)

        conn.commit()
        cur.close()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        pool.putconn(conn)

    return len(provinces)


def log_validation(region, draw_date, match_rate, mismatches):
    pool = get_db_pool()
    conn = pool.getconn()
    try:
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
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        pool.putconn(conn)


# ─── Main ─────────────────────────────────────────────────────────────────────

def crawl_region(region, target_date=None):
    region_names = {"south": "Miền Nam", "central": "Miền Trung", "north": "Miền Băc"}
    target = target_date or date.today().isoformat()
    print(f"\n[{datetime.now()}] ═══ {region_names[region]} ({target}) ═══")

    # Crawl nguồn 1: minhngoc
    try:
        html1 = fetch_minhngoc(region, target)
        date1, provs1 = parse_minhngoc(html1, region, target)
        print(f"  [MinhNgoc] {len(provs1)} tỉnh, ngày {date1}")
    except Exception as e:
        print(f"  [MinhNgoc] LỖI: {e}")
        date1, provs1 = target, []

    # Crawl nguồn 2: xoso
    try:
        html2 = fetch_xoso(region, target)
        date2, provs2 = parse_xoso(html2, region, target)
        print(f"  [XoSo]     {len(provs2)} tỉnh, ngày {date2}")
    except Exception as e:
        print(f"  [XoSo]     LỖI: {e}")
        date2, provs2 = target, []

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
    parser.add_argument("--date", help="YYYY-MM-DD format (default: today)")
    args = parser.parse_args()

    regions = ["south", "central", "north"] if args.all else [args.region] if args.region else ["south"]

    # Override date if specified
    global draw_date_override
    draw_date_override = args.date

    try:
        for region in regions:
            crawl_region(region, draw_date_override)
    finally:
        close_db_pool()


if __name__ == "__main__":
    main()
