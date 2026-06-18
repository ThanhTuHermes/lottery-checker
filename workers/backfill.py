#!/usr/bin/env python3
"""
Backfill 90 ngày lịch sử cho cả 3 miền
Gọi crawl_sox.py với --region và --date
"""
import subprocess, sys, os
from datetime import date, timedelta

WORKERS = "/home/ubuntu/lottery-checker/workers"

start = date.today() - timedelta(days=90)
end = date.today() - timedelta(days=1)  # hôm qua

total = (end - start).days + 1
done = 0

print(f"[BACKFILL] {start} → {end} = {total} ngày")

for i in range(total):
    d = start + timedelta(days=i)
    ds = d.isoformat()  # YYYY-MM-DD
    print(f"\n{'='*60}")
    print(f"[{done+1}/{total}] 📅 {ds}")

    for region in ["south", "central", "north"]:
        print(f"  [{region}] crawl...")
        r = subprocess.run(
            [sys.executable, "crawl_sox.py", "--region", region, "--date", ds],
            capture_output=True, text=True, timeout=120,
            cwd=WORKERS
        )
        # Print last few lines of output
        lines = r.stdout.strip().split("\n")
        if r.stdout:
            for line in lines[-5:]:
                print(f"    {line}")
        if r.returncode != 0:
            print(f"    ❌ lỗi exit={r.returncode}")
            if r.stderr:
                print(f"    stderr: {r.stderr[:200]}")

    done += 1
    print(f"[{done}/{total}] ✅ {ds}")

print(f"\n[BACKFILL] 🎯 Xong {done}/{total} ngày!")
