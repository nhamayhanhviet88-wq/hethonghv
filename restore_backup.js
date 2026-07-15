const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv'
    });
    await client.connect();

    try {
        const res = await client.query(`
            SELECT original_data 
            FROM dht_order_session_backups b
            JOIN dht_orders o ON b.order_id = o.id
            WHERE o.order_code = 'SVTS0005'
        `);

        if (res.rows.length === 0) {
            console.log('No backup row found.');
            return;
        }

        const backupData = typeof res.rows[0].original_data === 'string' 
            ? JSON.parse(res.rows[0].original_data) 
            : res.rows[0].original_data;

        const items = backupData.items || [];
        const item201 = items.find(i => i.id === 201);
        if (item201) {
            console.log('--- FOUND ITEM 201 IN BACKUP ---');
            console.log('Mockup image length:', item201.mockup_image ? item201.mockup_image.length : 0);
            console.log('Print details:', JSON.stringify(item201.print_details, null, 2));
            
            if (item201.mockup_image) {
                // If it has mockup_image, let's restore it!
                console.log('Restoring to database...');
                await client.query(`
                    UPDATE dht_order_items 
                    SET mockup_image = $1, 
                        print_details = $2,
                        front_technique_image = $3,
                        back_technique_image = $4
                    WHERE id = 201
                `, [
                    item201.mockup_image,
                    JSON.stringify(item201.print_details || []),
                    item201.front_technique_image || null,
                    item201.back_technique_image || null
                ]);
                console.log('RESTORED SUCCESSFULLY!');
            } else {
                console.log('Backup item 201 does not have mockup_image.');
            }
        } else {
            console.log('Item 201 not found in backup.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

main();
