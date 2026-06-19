// Check ticket — match entered number against DB using SUFFIX matching
// Only show results for provinces scheduled to draw on that day of week
import { query } from '../db/conn.js';

export default async function checkTicket(ticketNumber, drawDate) {
  if (!ticketNumber || !drawDate) {
    return { matched: false, error: 'Vui lòng nhập số vé và ngày mở thưởng' };
  }

  const num = ticketNumber.trim();
  if (!/^\d{2,7}$/.test(num)) {
    return { matched: false, error: 'Số vé không hợp lệ (2-7 chữ số)' };
  }

  // Schedule filter: only provinces that draw on this day of week
  // EXTRACT(DOW FROM date) returns 0=Sunday...6=Saturday, matching our schedule
  const sql = `
    SELECT d.draw_date, d.region, d.province_name, d.draw_code,
           p.prize_name, p.winning_number, p.reward_amount, p.prize_rank,
           cp.valid_days
    FROM lottery_prizes p
    JOIN lottery_draws d ON d.id = p.draw_id
    LEFT JOIN claim_policies cp ON cp.region = d.region AND cp.prize_name = p.prize_name
    WHERE d.draw_date = $1
      AND p.prize_name != 'dac_biet'
      AND RIGHT($2, LENGTH(p.winning_number)) = p.winning_number
      AND EXISTS (
        SELECT 1 FROM lottery_schedule s
        WHERE s.region = d.region
          AND s.province_name = d.province_name
          AND s.day_of_week = EXTRACT(DOW FROM $1::date)::int
          AND s.is_active = true
      )
    ORDER BY p.prize_rank ASC
  `;

  const { rows: suffixRows } = await query(sql, [drawDate, num]);

  const matches = suffixRows.map(r => ({
    region: r.region,
    province: r.province_name,
    prize: r.prize_name,
    prize_rank: r.prize_rank,
    winning_number: r.winning_number,
    reward_amount: r.reward_amount ? Number(r.reward_amount) : null,
    draw_code: r.draw_code,
    claim_deadline: addDays(r.draw_date, r.valid_days || 30),
    days_left: dayDiff(addDays(r.draw_date, r.valid_days || 30), new Date()),
  }));

  // Query dac_biet separately — with schedule filter
  const dbSql = `
    SELECT p.*, d.region, d.draw_date, d.province_name, d.draw_code, cp.valid_days
    FROM lottery_prizes p
    JOIN lottery_draws d ON d.id = p.draw_id
    LEFT JOIN claim_policies cp ON cp.region = d.region AND cp.prize_name = p.prize_name
    WHERE p.prize_name = 'dac_biet' AND d.draw_date = $1
      AND EXISTS (
        SELECT 1 FROM lottery_schedule s
        WHERE s.region = d.region
          AND s.province_name = d.province_name
          AND s.day_of_week = EXTRACT(DOW FROM $1::date)::int
          AND s.is_active = true
      )
  `;
  const { rows: dbRows } = await query(dbSql, [drawDate]);

  for (const dbRow of dbRows) {
    const dbNum = dbRow.winning_number;
    const dbValidDays = dbRow.valid_days || 30;

    if (dbRow.region === 'south' || dbRow.region === 'central') {
      if (num.length === 6 && dbNum.length === 6) {
        // Perfect match: Giải Đặc Biệt
        if (num === dbNum) {
          matches.push({
            region: dbRow.region,
            province: dbRow.province_name,
            prize: dbRow.prize_name, // 'dac_biet'
            prize_rank: dbRow.prize_rank,
            winning_number: dbNum,
            reward_amount: dbRow.reward_amount ? Number(dbRow.reward_amount) : null,
            draw_code: dbRow.draw_code,
            claim_deadline: addDays(dbRow.draw_date, dbValidDays),
            days_left: dayDiff(addDays(dbRow.draw_date, dbValidDays), new Date()),
          });
        }
        // Giải Phụ ĐB: last 5 digits match, first digit differs
        else if (num.slice(1) === dbNum.slice(1) && num[0] !== dbNum[0]) {
          matches.push({
            region: dbRow.region,
            province: dbRow.province_name,
            prize: 'phu_dac_biet',
            prize_rank: 1.5,
            winning_number: dbNum,
            reward_amount: 50000000, // 50 triệu
            draw_code: dbRow.draw_code,
            claim_deadline: addDays(dbRow.draw_date, dbValidDays),
            days_left: dayDiff(addDays(dbRow.draw_date, dbValidDays), new Date()),
          });
        }
        // Giải Khuyến Khích: first digit matches, exactly 1 of the remaining 5 digits differs
        else if (num[0] === dbNum[0]) {
          let mismatches = 0;
          for (let i = 1; i < 6; i++) {
            if (num[i] !== dbNum[i]) {
              mismatches++;
            }
          }
          if (mismatches === 1) {
            matches.push({
              region: dbRow.region,
              province: dbRow.province_name,
              prize: 'khuyen_khich',
              prize_rank: 1.6,
              winning_number: dbNum,
              reward_amount: 6000000, // 6 triệu
              draw_code: dbRow.draw_code,
              claim_deadline: addDays(dbRow.draw_date, dbValidDays),
              days_left: dayDiff(addDays(dbRow.draw_date, dbValidDays), new Date()),
            });
          }
        }
      }
    } else if (dbRow.region === 'north') {
      if (dbNum.length === 5) {
        // Perfect match: Giải Đặc Biệt
        if (num === dbNum && num.length === 5) {
          matches.push({
            region: dbRow.region,
            province: dbRow.province_name,
            prize: dbRow.prize_name, // 'dac_biet'
            prize_rank: dbRow.prize_rank,
            winning_number: dbNum,
            reward_amount: dbRow.reward_amount ? Number(dbRow.reward_amount) : null,
            draw_code: dbRow.draw_code,
            claim_deadline: addDays(dbRow.draw_date, dbValidDays),
            days_left: dayDiff(addDays(dbRow.draw_date, dbValidDays), new Date()),
          });
        }
        // Northern region support: last 2 digits match -> Giải Khuyến Khích 40,000đ
        else if (num.slice(-2) === dbNum.slice(-2)) {
          matches.push({
            region: dbRow.region,
            province: dbRow.province_name,
            prize: 'khuyen_khich',
            prize_rank: 8.5,
            winning_number: dbNum,
            reward_amount: 40000, // 40k
            draw_code: dbRow.draw_code,
            claim_deadline: addDays(dbRow.draw_date, dbValidDays),
            days_left: dayDiff(addDays(dbRow.draw_date, dbValidDays), new Date()),
          });
        }
      }
    }
  }

  if (matches.length === 0) {
    return { matched: false, matches: [] };
  }

  // Sort matches by prize_rank to keep them in order
  matches.sort((a, b) => a.prize_rank - b.prize_rank);

  return { matched: true, matches };
}

function addDays(dateVal, days) {
  let d;
  if (typeof dateVal === 'string') {
    const [year, month, day] = dateVal.split('-').map(Number);
    d = new Date(year, month - 1, day);
  } else if (dateVal instanceof Date) {
    d = new Date(dateVal.getFullYear(), dateVal.getMonth(), dateVal.getDate());
  } else {
    d = new Date(dateVal);
  }
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function dayDiff(endStr, now) {
  const [year, month, day] = endStr.split('-').map(Number);
  const end = new Date(year, month - 1, day);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}
