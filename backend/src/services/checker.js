// Check ticket — match entered number against DB using SUFFIX matching
import { query } from '../db/conn.js';

export default async function checkTicket(ticketNumber, drawDate) {
  if (!ticketNumber || !drawDate) {
    return { matched: false, error: 'Vui lòng nhập số vé và ngày mở thưởng' };
  }

  const num = ticketNumber.trim();
  if (!/^\d{2,7}$/.test(num)) {
    return { matched: false, error: 'Số vé không hợp lệ (2-7 chữ số)' };
  }

  // Suffix match: RIGHT(ticket, LEN(winning_number)) = winning_number
  // Giải 8: last 2 digits match, Giải 7: last 3, etc.
  const sql = `
    SELECT d.draw_date, d.region, d.province_name, d.draw_code,
           p.prize_name, p.winning_number, p.reward_amount, p.prize_rank,
           cp.valid_days
    FROM lottery_prizes p
    JOIN lottery_draws d ON d.id = p.draw_id
    LEFT JOIN claim_policies cp ON cp.region = d.region AND cp.prize_name = p.prize_name
    WHERE d.draw_date = $1
      AND RIGHT($2, LENGTH(p.winning_number)) = p.winning_number
    ORDER BY p.prize_rank ASC
  `;

  const { rows } = await query(sql, [drawDate, num]);

  const matches = rows.map(r => ({
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

  // Thêm Giải Phụ ĐB & Giải Khuyến Khích cho MN/MT
  if (rows.length > 0) {
    const dbMatch = rows.find(r => r.prize_name === 'dac_biet');
    if (dbMatch && (dbMatch.region === 'south' || dbMatch.region === 'central')) {
      const dbNum = dbMatch.winning_number; // 6 digits
      
      // Giải Phụ ĐB: last 5 digits match, first digit differs
      if (num.length === 6 && num.slice(1) === dbNum.slice(1) && num[0] !== dbNum[0]) {
        matches.push({
          region: dbMatch.region,
          province: dbMatch.province_name,
          prize: 'phu_dac_biet',
          prize_rank: 1.5,
          winning_number: dbNum,
          reward_amount: 50000000, // 50 triệu
          draw_code: dbMatch.draw_code,
          claim_deadline: addDays(dbMatch.draw_date, 30),
          days_left: dayDiff(addDays(dbMatch.draw_date, 30), new Date()),
        });
      }
      
      // Giải Khuyến Khích: first digit matches, 4/5 remaining digits match in position
      if (num.length === 6 && num[0] === dbNum[0]) {
        let mismatches = 0;
        for (let i = 1; i < 6; i++) {
          if (num[i] !== dbNum[i]) mismatches++;
        }
        if (mismatches === 1) {
          // Check not already Giải Phụ ĐB (first digit differs)
          // Giải Khuyến Khích: same first digit, exactly 1 mismatch in remaining 5
          matches.push({
            region: dbMatch.region,
            province: dbMatch.province_name,
            prize: 'khuyen_khich',
            prize_rank: 1.6,
            winning_number: dbNum,
            reward_amount: 6000000, // 6 triệu
            draw_code: dbMatch.draw_code,
            claim_deadline: addDays(dbMatch.draw_date, 30),
            days_left: dayDiff(addDays(dbMatch.draw_date, 30), new Date()),
          });
        }
      }
    }
  }

  if (matches.length === 0) {
    return { matched: false, matches: [] };
  }

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
