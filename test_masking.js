require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
    const now = new Date();
    const month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    console.log('=== Month:', month, '===\n');

    // Get all awards for this month
    const awards = await p.query('SELECT id, board_key, top_rank, winner_name, winner_type, prize_amount FROM prize_awards WHERE month = $1 ORDER BY board_key, top_rank', [month]);
    console.log('--- AWARDS (đã trao) ---');
    awards.rows.forEach(a => {
        console.log(`  [${a.board_key}] Top ${a.top_rank}: winner="${a.winner_name}" (${a.winner_type}) amount=${a.prize_amount} id=${a.id}`);
    });

    // Get prizes config
    const prizes = await p.query('SELECT board_key, top_rank, prize_amount, min_orders, min_revenue, min_count FROM leaderboard_prizes WHERE month = $1 ORDER BY board_key, top_rank', [month]);
    console.log('\n--- PRIZES (cấu hình) ---');
    prizes.rows.forEach(p2 => {
        console.log(`  [${p2.board_key}] Top ${p2.top_rank}: amount=${p2.prize_amount} min_orders=${p2.min_orders} min_revenue=${p2.min_revenue} min_count=${p2.min_count}`);
    });

    await p.end();
})().catch(e => { console.error(e.message); p.end(); });
