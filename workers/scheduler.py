#!/usr/bin/env python3
"""
Scheduler — chạy crawl theo lịch mở thưởng (giờ VN = UTC+7)
- Miền Nam: 16:15 → crawl lúc 16:30 VN = 09:30 UTC
- Miền Trung: 17:15 → crawl lúc 17:30 VN = 10:30 UTC
- Miền Bắc: 18:30 → crawl lúc 18:45 VN = 11:45 UTC
"""
import time, subprocess, sys
from datetime import datetime, timezone, timedelta

VN_TZ = timezone(timedelta(hours=7))

# Lịch crawl (giờ VN): (hour, minute, region)
SCHEDULE = [
    (16, 30, "south"),
    (17, 30, "central"),
    (18, 45, "north"),
]

def get_vn_time():
    return datetime.now(VN_TZ)

def run_crawl(region):
    vn = get_vn_time()
    print(f"[{vn.strftime('%Y-%m-%d %H:%M')}] Crawling {region}...")
    try:
        result = subprocess.run(
            [sys.executable, "crawl_sox.py", "--region", region],
            capture_output=True, text=True, timeout=120
        )
        print(result.stdout)
        if result.returncode != 0:
            print(f"  ERROR: {result.stderr[:200]}")
    except Exception as e:
        print(f"  EXCEPTION: {e}")

def main():
    print("Lottery crawler scheduler started")
    print(f"Schedule (VN time): Miền Nam 16:30 | Miền Trung 17:30 | Miền Bắc 18:45")
    
    last_run = {}  # region → last run date

    while True:
        vn = get_vn_time()
        key = (vn.hour, vn.minute)

        for h, m, region in SCHEDULE:
            today = vn.strftime("%Y-%m-%d")
            if vn.hour == h and vn.minute == m:
                if last_run.get(region) != today:
                    print(f"\n[{vn.strftime('%Y-%m-%d %H:%M')}] ⏰ Trigger crawl: {region}")
                    run_crawl(region)
                    last_run[region] = today

        time.sleep(30)  # Check mỗi 30 giây

if __name__ == "__main__":
    main()
