const db = require('./db/pool');
(async () => {
    await db.init();
    // Add guide_url for Sedding
    await db.run(
        "INSERT INTO task_library (task_name, guide_url, min_quantity, points) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
        ['Sedding Cộng Đồng & Lẫn Nhau', 'http://localhost:11000/bangiaodiem', 3, 10]
    );
    console.log('Added Sedding guide');
    // Add guide_url for Đăng Bản Thân
    await db.run(
        "INSERT INTO task_library (task_name, guide_url, min_quantity, points) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
        ['Đăng Bản Thân & Sản Phẩm', 'http://localhost:11000/bangiaodiem', 10, 10]
    );
    console.log('Added Đăng Bản Thân guide');
    process.exit();
})();
