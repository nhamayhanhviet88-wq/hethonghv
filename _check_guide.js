const db = require('./db/pool');
(async () => {
    await db.run(
        `INSERT INTO task_library (task_name, points, min_quantity, guide_url, requires_approval, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['Sedding Cộng Đồng', 10, 20, 'http://localhost:11000/bangiaodiem', false, 1]
    );
    await db.run(
        `INSERT INTO task_library (task_name, points, min_quantity, guide_url, requires_approval, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['Tìm Gr Zalo Và Join', 10, 20, 'http://localhost:11000/bangiaodiem', false, 1]
    );
    console.log('Done - inserted Sedding & Tìm Gr Zalo into task_library');
    process.exit();
})();
