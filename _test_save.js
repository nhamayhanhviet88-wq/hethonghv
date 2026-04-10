const db = require('./db/pool');
(async () => {
    try {
        const items = [
            { task_name: 'CÔNG VIỆC THỎ TEST 2', deadline: '2026-04-09', guide_link: 'http://localhost:11000/bangiaokhoa2', min_quantity: 1, max_redo_count: 3, requires_approval: true },
            { task_name: 'CÔNG VIỆC THỎ TEST 3', deadline: '2026-04-10', guide_link: 'http://localhost:11000/bangiaokhoa3', min_quantity: 1, max_redo_count: 3, requires_approval: true }
        ];
        
        // Nullify FK first (same as the fixed backend code)
        await db.run('UPDATE chain_task_instance_items SET template_item_id = NULL WHERE template_item_id IN (SELECT id FROM chain_task_template_items WHERE chain_template_id = $1)', [6]);
        console.log('Nullify FK OK');
        
        // Delete
        await db.run('DELETE FROM chain_task_template_items WHERE chain_template_id = $1', [6]);
        console.log('DELETE OK');
        
        // Re-insert
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            await db.run(
                `INSERT INTO chain_task_template_items 
                 (chain_template_id, item_order, task_name, task_content, guide_link,
                  input_requirements, output_requirements, requires_approval, requires_report,
                  min_quantity, relative_days, deadline, max_redo_count)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [6, i + 1, item.task_name, '',
                 item.guide_link || '', '', '',
                 item.requires_approval || false, true,
                 item.min_quantity || 1, 0, item.deadline || null, item.max_redo_count || 3]
            );
            console.log(`INSERT item ${i+1} OK`);
        }
        
        // Verify
        const verify = await db.all('SELECT id, task_name, deadline FROM chain_task_template_items WHERE chain_template_id = 6 ORDER BY item_order');
        console.log('\n✅ After save:', JSON.stringify(verify, null, 2));
        
        process.exit(0);
    } catch(e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
})();
