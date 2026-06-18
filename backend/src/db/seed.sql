-- Seed lottery sources
INSERT INTO lottery_sources (name, type, base_url, priority, is_active) VALUES
('MinhNgoc.net.vn', 'aggregator', 'https://www.minhngoc.net.vn', 1, true),
('XoSo.com.vn', 'aggregator', 'https://xoso.com.vn', 2, true);

-- Claim policies (hạn đổi 30 ngày)
INSERT INTO claim_policies (region, prize_name, valid_days) VALUES
  ('south', 'dac_biet', 30), ('south', 'nhat', 30),
  ('south', 'nhi', 30), ('south', 'ba', 30),
  ('south', 'tu', 30), ('south', 'nam', 30),
  ('south', 'sau', 30), ('south', 'bay', 30), ('south', 'tam', 30),
  ('central', 'dac_biet', 30), ('central', 'nhat', 30),
  ('central', 'nhi', 30), ('central', 'ba', 30),
  ('central', 'tu', 30), ('central', 'nam', 30),
  ('central', 'sau', 30), ('central', 'bay', 30), ('central', 'tam', 30),
  ('north', 'dac_biet', 30), ('north', 'nhat', 30),
  ('north', 'nhi', 30), ('north', 'ba', 30),
  ('north', 'tu', 30), ('north', 'nam', 30),
  ('north', 'sau', 30), ('north', 'bay', 30), ('north', 'tam', 30)
ON CONFLICT (region, prize_name) DO NOTHING;

-- Cập nhật reward_amount cho các giải Miền Nam/Trung (South/Central)
UPDATE lottery_prizes p SET reward_amount = 2000000000 FROM lottery_draws d WHERE p.draw_id = d.id AND p.prize_name = 'dac_biet' AND d.region IN ('south', 'central') AND p.reward_amount IS NULL;
UPDATE lottery_prizes p SET reward_amount = 15000000 FROM lottery_draws d WHERE p.draw_id = d.id AND p.prize_name = 'nhat' AND d.region IN ('south', 'central') AND p.reward_amount IS NULL;
UPDATE lottery_prizes p SET reward_amount = 15000000 FROM lottery_draws d WHERE p.draw_id = d.id AND p.prize_name = 'nhi' AND d.region IN ('south', 'central') AND p.reward_amount IS NULL;
UPDATE lottery_prizes p SET reward_amount = 10000000 FROM lottery_draws d WHERE p.draw_id = d.id AND p.prize_name = 'ba' AND d.region IN ('south', 'central') AND p.reward_amount IS NULL;
UPDATE lottery_prizes p SET reward_amount = 3000000 FROM lottery_draws d WHERE p.draw_id = d.id AND p.prize_name = 'tu' AND d.region IN ('south', 'central') AND p.reward_amount IS NULL;
UPDATE lottery_prizes p SET reward_amount = 1000000 FROM lottery_draws d WHERE p.draw_id = d.id AND p.prize_name = 'nam' AND d.region IN ('south', 'central') AND p.reward_amount IS NULL;
UPDATE lottery_prizes p SET reward_amount = 400000 FROM lottery_draws d WHERE p.draw_id = d.id AND p.prize_name = 'sau' AND d.region IN ('south', 'central') AND p.reward_amount IS NULL;
UPDATE lottery_prizes p SET reward_amount = 200000 FROM lottery_draws d WHERE p.draw_id = d.id AND p.prize_name = 'bay' AND d.region IN ('south', 'central') AND p.reward_amount IS NULL;
UPDATE lottery_prizes p SET reward_amount = 100000 FROM lottery_draws d WHERE p.draw_id = d.id AND p.prize_name = 'tam' AND d.region IN ('south', 'central') AND p.reward_amount IS NULL;

-- Cập nhật reward_amount cho các giải Miền Bắc (North)
UPDATE lottery_prizes p SET reward_amount = 500000000 FROM lottery_draws d WHERE p.draw_id = d.id AND p.prize_name = 'dac_biet' AND d.region = 'north' AND p.reward_amount IS NULL;
UPDATE lottery_prizes p SET reward_amount = 40000000 FROM lottery_draws d WHERE p.draw_id = d.id AND p.prize_name = 'nhat' AND d.region = 'north' AND p.reward_amount IS NULL;
UPDATE lottery_prizes p SET reward_amount = 5000000 FROM lottery_draws d WHERE p.draw_id = d.id AND p.prize_name = 'nhi' AND d.region = 'north' AND p.reward_amount IS NULL;
UPDATE lottery_prizes p SET reward_amount = 2000000 FROM lottery_draws d WHERE p.draw_id = d.id AND p.prize_name = 'ba' AND d.region = 'north' AND p.reward_amount IS NULL;
UPDATE lottery_prizes p SET reward_amount = 400000 FROM lottery_draws d WHERE p.draw_id = d.id AND p.prize_name = 'tu' AND d.region = 'north' AND p.reward_amount IS NULL;
UPDATE lottery_prizes p SET reward_amount = 200000 FROM lottery_draws d WHERE p.draw_id = d.id AND p.prize_name = 'nam' AND d.region = 'north' AND p.reward_amount IS NULL;
UPDATE lottery_prizes p SET reward_amount = 100000 FROM lottery_draws d WHERE p.draw_id = d.id AND p.prize_name = 'sau' AND d.region = 'north' AND p.reward_amount IS NULL;
UPDATE lottery_prizes p SET reward_amount = 60000 FROM lottery_draws d WHERE p.draw_id = d.id AND p.prize_name = 'bay' AND d.region = 'north' AND p.reward_amount IS NULL;
UPDATE lottery_prizes p SET reward_amount = 40000 FROM lottery_draws d WHERE p.draw_id = d.id AND p.prize_name = 'tam' AND d.region = 'north' AND p.reward_amount IS NULL;
