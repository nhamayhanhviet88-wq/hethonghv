const db = require('./db/pool');

async function testOverdueTasks() {
    const overdueTasks = await db.all(`
        SELECT bt.id, bt.title, bt.status, bt.deadline, bt.progress,
               u_creator.full_name as creator_name, u_assign.full_name as assignee_name
        FROM board_tasks bt
        LEFT JOIN users u_creator ON u_creator.id = bt.created_by
        LEFT JOIN users u_assign ON u_assign.id = bt.assigned_to
        WHERE bt.status != 'hoan_thanh' 
          AND bt.deadline IS NOT NULL 
          AND CAST(bt.deadline AS DATE) < CURRENT_DATE
        ORDER BY bt.deadline ASC LIMIT 20
    `);
    console.log('--- OVERDUE TASKS RESULT FROM CSDL ---');
    console.log(overdueTasks);
}

testOverdueTasks().then(() => process.exit(0));
