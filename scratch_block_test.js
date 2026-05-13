const db = require('./db/pool');
(async () => {
    // Reset emergency penalty to correct value: 3 days × 50k = 150k
    // Set last_penalty_at to VN time today so it won't stack again today
    await db.run(
        "UPDATE emergencies SET penalty_amount = 150000, last_penalty_at = '2026-05-14 03:06:00' WHERE id = 20"
    );
    const r = await db.get('SELECT penalty_amount, last_penalty_at::text FROM emergencies WHERE id = 20');
    console.log('Emergency id=20 after reset:', r);
    process.exit();
})();
