import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { query } from './db/conn.js';
import checkTicket from './services/checker.js';

const fastify = Fastify({
  logger: true,
  trustProxy: true,
});

await fastify.register(cors, {
  origin: [
    'https://reasons-routing-strengths-charlotte.trycloudflare.com',
    'http://localhost:3000',
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
});

await fastify.register(rateLimit, {
  global: false,
});

// Health check
fastify.get('/api/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
}));

// Check ticket
fastify.post('/api/check-ticket', {
  config: {
    rateLimit: {
      max: 20,
      timeWindow: 60000,
    },
  },
}, async (request, reply) => {
  const { ticketNumber, drawDate } = request.body || {};

  if (!ticketNumber || !drawDate) {
    return reply.code(400).send({ error: 'Thiếu ticketNumber hoặc drawDate' });
  }

  const result = await checkTicket(ticketNumber.trim(), drawDate);

  // Log check to DB
  await query(
    'INSERT INTO ticket_checks (ticket_number, check_date, matched, result) VALUES ($1, $2, $3, $4)',
    [ticketNumber, drawDate, result.matched, JSON.stringify(result.matches || [])]
  );

  return result;
});

// Get draws by date
fastify.get('/api/draws', async (request, reply) => {
  const { date, region } = request.query;

  let sql = `
    SELECT d.id, d.draw_date, d.region, d.province_name, d.draw_code,
           json_agg(json_build_object(
             'prize_name', p.prize_name,
             'winning_number', p.winning_number,
             'reward_amount', p.reward_amount
           ) ORDER BY p.prize_rank) AS prizes
    FROM lottery_draws d
    LEFT JOIN lottery_prizes p ON p.draw_id = d.id
    WHERE 1=1
  `;

  const params = [];
  if (date) {
    params.push(date);
    sql += ` AND d.draw_date = $${params.length}`;
  }
  if (region) {
    params.push(region);
    sql += ` AND d.region = $${params.length}`;
  }

  sql += ' GROUP BY d.id ORDER BY d.draw_date DESC, d.region, d.province_name';

  const { rows } = await query(sql, params);
  return rows;
});

// Get single draw detail
fastify.get('/api/draws/:id', async (request, reply) => {
  const { id } = request.params;

  const draw = await query('SELECT * FROM lottery_draws WHERE id = $1', [id]);
  if (draw.rows.length === 0) return reply.code(404).send({ error: 'Không tìm thấy kỳ quay' });

  const prizes = await query('SELECT * FROM lottery_prizes WHERE draw_id = $1 ORDER BY prize_rank', [id]);

  return { ...draw.rows[0], prizes: prizes.rows };
});

// Ingest endpoint — crawler POST data vào
fastify.post('/api/ingest', async (request, reply) => {
  const { draw_date, region, provinces } = request.body;

  if (!draw_date || !region || !provinces?.length) {
    return reply.code(400).send({ error: 'Thiếu draw_date, region, hoặc provinces' });
  }

  const results = [];

  for (const prov of provinces) {
    const draw = await query(
      `INSERT INTO lottery_draws (draw_date, region, province_code, province_name, draw_code, source_id)
       VALUES ($1, $2, $3, $4, $5, 1)
       ON CONFLICT (draw_date, region, province_code) DO UPDATE SET
         province_name = EXCLUDED.province_name,
         draw_code = EXCLUDED.draw_code,
         fetched_at = NOW()
       RETURNING id`,
      [draw_date, region, prov.mauso, prov.tinh, prov.draw_code || '']
    );

    const drawId = draw.rows[0].id;

    for (const [prizeName, prizeRank, numbers] of prov.prizes) {
      for (const num of numbers) {
        await query(
          `INSERT INTO lottery_prizes (draw_id, prize_name, prize_rank, winning_number)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [drawId, prizeName, prizeRank, num]
        );
      }
    }

    results.push({ province: prov.tinh, draw_id: drawId });
  }

  return { ingested: results.length, details: results };
});

// Stats
fastify.get('/api/stats', async () => {
  const draws = await query('SELECT COUNT(*) as total_draws FROM lottery_draws');
  const prizes = await query('SELECT COUNT(*) as total_prizes FROM lottery_prizes');
  const checks = await query('SELECT COUNT(*) as total_checks FROM ticket_checks');

  return {
    total_draws: parseInt(draws.rows[0].total_draws),
    total_prizes: parseInt(prizes.rows[0].total_prizes),
    total_checks: parseInt(checks.rows[0].total_checks),
  };
});

fastify.listen({ port: 3001, host: '0.0.0.0' }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log('Lottery API running on http://0.0.0.0:3001');
});
