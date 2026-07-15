const db = require('./db/pool');

async function main() {
    try {
        const notifications = await db.all("SELECT * FROM notifications WHERE content ILIKE '%SVTS0005%' OR title ILIKE '%SVTS0005%' ORDER BY id DESC LIMIT 50");
        console.log('Notifications count:', notifications.length);
        notifications.forEach(n => {
            console.log(`ID: ${n.id}, Title: ${n.title}, Created At: ${n.created_at}`);
            console.log(`Content snippet: ${n.content ? n.content.substring(0, 300) : 'null'}`);
            console.log('----------------------------------------------------');
        });
    } catch (e) {
        console.error(e);
    }
}

main();
