-- Lottery Checker — PostgreSQL Schema
-- Tạo database: createdb lottery_checker

-- 1. Nguồn dữ liệu
CREATE TABLE IF NOT EXISTS lottery_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('official_site','aggregator','api')),
    base_url TEXT NOT NULL,
    priority INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Kết quả quay
CREATE TABLE IF NOT EXISTS lottery_draws (
    id SERIAL PRIMARY KEY,
    draw_date DATE NOT NULL,
    region VARCHAR(20) NOT NULL CHECK (region IN ('north','central','south','vietlott')),
    province_code VARCHAR(20),
    province_name VARCHAR(100) NOT NULL,
    draw_code VARCHAR(50),
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    source_id INT REFERENCES lottery_sources(id),
    checksum VARCHAR(64),
    UNIQUE (draw_date, region, province_code)
);

-- 3. Giải trúng — mỗi số = 1 dòng
CREATE TABLE IF NOT EXISTS lottery_prizes (
    id SERIAL PRIMARY KEY,
    draw_id INT REFERENCES lottery_draws(id) ON DELETE CASCADE,
    prize_name VARCHAR(50) NOT NULL,  -- dac_biet, nhat, nhi, ba, tu, nam, sau, bay, tam
    prize_rank INT NOT NULL,           -- 1=DB, 2=Nhat, ..., 9=Tam
    winning_number VARCHAR(20) NOT NULL,
    reward_amount NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Policy đổi giải
CREATE TABLE IF NOT EXISTS claim_policies (
    id SERIAL PRIMARY KEY,
    region VARCHAR(20) NOT NULL,
    prize_name VARCHAR(50) NOT NULL,
    valid_days INT NOT NULL DEFAULT 30,
    notes TEXT,
    UNIQUE (region, prize_name)
);

-- 5. Lịch sử tra cứu
CREATE TABLE IF NOT EXISTS ticket_checks (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(20) NOT NULL,
    check_date DATE NOT NULL,
    matched BOOLEAN DEFAULT false,
    result JSONB,
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes cho performance
CREATE INDEX IF NOT EXISTS idx_draws_date ON lottery_draws(draw_date);
CREATE INDEX IF NOT EXISTS idx_draws_region_date ON lottery_draws(region, draw_date);
CREATE INDEX IF NOT EXISTS idx_prizes_number ON lottery_prizes(winning_number);
CREATE INDEX IF NOT EXISTS idx_prizes_draw ON lottery_prizes(draw_id);
CREATE INDEX IF NOT EXISTS idx_checks_date ON ticket_checks(check_date, ticket_number);

-- 7. Lịch mở thưởng (schedule)
CREATE TABLE IF NOT EXISTS lottery_schedule (
    id SERIAL PRIMARY KEY,
    region VARCHAR(20) NOT NULL CHECK (region IN ('north','central','south')),
    province_code VARCHAR(20) NOT NULL,
    province_name VARCHAR(100) NOT NULL,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=CN, 1=T2...6=T7
    draw_time TIME NOT NULL,
    frequency_per_week INT NOT NULL DEFAULT 1 CHECK (frequency_per_week IN (1,2)),
    is_active BOOLEAN DEFAULT true,
    UNIQUE (region, province_code, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_schedule_day_region ON lottery_schedule(day_of_week, region);

-- Trigger: tự động cập nhật fetched_at khi upsert draw
CREATE OR REPLACE FUNCTION update_fetched_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fetched_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_fetched_at ON lottery_draws;
CREATE TRIGGER trg_update_fetched_at
    BEFORE UPDATE ON lottery_draws
    FOR EACH ROW
    EXECUTE FUNCTION update_fetched_at();

── 6. Validation log (dual-source cross-check)
CREATE TABLE IF NOT EXISTS crawl_validation (
    id SERIAL PRIMARY KEY,
    region VARCHAR(20),
    draw_date DATE,
    match_rate FLOAT,
    mismatches JSONB,
    validated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_validation_date ON crawl_validation(draw_date, region);
