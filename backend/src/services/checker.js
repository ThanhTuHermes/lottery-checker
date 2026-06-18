// Check ticket — match entered number against DB
import { query } from '../db/conn.js';

const MAP_PRIZE = { 1: 'dac_biet', 2: 'nhat', 3: 'nhi', 4: 'ba', 5: 'tu', 6: 'nam', 7: 'sau', 8: 'bay', 9: 'tam' };
const MAP_REGION = { 'Miền Nam': 'south', 'Miền Trung': 'central', 'Miền Bắc': 'north' };

export default async function checkTicket(ticketNumber, drawDate) {
  if (!ticketNumber || !drawDate) {
    return { matched: false, error: 'Vui lòng nhập số vé và ngày mở thưởng' };
  }

  const num = ticketNumber.trim();
  if (!/^\d{2,7}$/.test(num)) {
    return { matched: false, error: 'Số vé không hợp lệ (2-7 chữ số)' };
  }

  const sql = `
    SELECT d.draw_date, d.region, d.province_name, d.draw_code,
           p.prize_name, p.winning_number, p.reward_amount,
           cp.valid_days
    FROM lottery_prizes p
    JOIN lottery_draws d ON d.id = p.draw_id
    LEFT JOIN claim_policies cp ON cp.region = d.region AND cp.prize_name = p.prize_name
    WHERE d.draw_date = $1
      AND p.winning_number = $2
    ORDER BY p.prize_rank ASC
  `;

  const { rows } = await query(sql, [drawDate, num]);

  if (rows.length === 0) {
    return { matched: false, matches: [] };
  }

  const matches = rows.map(r => ({
    region: r.region,
    province: r.province_name,
    prize: r.prize_name,
    winning_number: r.winning_number,
    reward_amount: r.reward_amount ? Number(r.reward_amount) : null,
    draw_code: r.draw_code,
    claim_deadline: addDays(r.draw_date, r.valid_days || 30),
    days_left: dayDiff(addDays(r.draw_date, r.valid_days || 30), new Date()),
  }));

  return { matched: true, matches };
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function dayDiff(endStr, now) {
  const end = new Date(endStr);
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}
