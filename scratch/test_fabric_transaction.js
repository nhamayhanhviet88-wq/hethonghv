const db = require('../db/pool');
const crypto = require('crypto');
const { vnNow } = require('../utils/timezone');

function genFabricCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const bytes = crypto.randomBytes(13);
    let code = '';
    for (let i = 0; i < 13; i++) code += chars[bytes[i] % chars.length];
    return code;
}

(async () => {
    try {
        console.log('--- Fetching valid DB references ---');
        // Get valid user
        const user = await db.get("SELECT id, username, role, full_name FROM users WHERE role = 'giam_doc' LIMIT 1");
        if (!user) {
            console.error('No admin/giam_doc user found!');
            process.exit(1);
        }
        console.log('User:', user);

        // Get valid source
        const source = await db.get("SELECT id, name FROM import_sources WHERE source_type = 'fabric' LIMIT 1");
        if (!source) {
            console.error('No fabric source found!');
            process.exit(1);
        }
        console.log('Source:', source);

        // Get a valid fabric color (let's check which table stores it, probably qlx_fabric_colors or fabric_colors)
        // Let's query information_schema to see if there is a color table
        const tables = await db.all("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name LIKE '%color%' OR table_name LIKE '%fabric%')");
        console.log('Related tables:', tables.map(t => t.table_name));

        // Find a valid fabric color ID from the database
        // Let's try to query fabric_color_id from kv_rolls first
        let fabricColorId = null;
        const rollRow = await db.get("SELECT fabric_color_id FROM kv_rolls WHERE fabric_color_id IS NOT NULL LIMIT 1");
        if (rollRow) {
            fabricColorId = rollRow.fabric_color_id;
            console.log('Found fabric_color_id from kv_rolls:', fabricColorId);
        } else {
            // Let's look for a table named qlx_fabric_colors or similar
            const hasColorTable = tables.some(t => t.table_name === 'fabric_colors' || t.table_name === 'qlx_fabric_colors');
            if (hasColorTable) {
                const colorRow = await db.get("SELECT id FROM fabric_colors LIMIT 1");
                if (colorRow) {
                    fabricColorId = colorRow.id;
                    console.log('Found fabric_color_id from fabric_colors:', fabricColorId);
                }
            }
        }

        if (!fabricColorId) {
            // Let's look in another table if needed, e.g. material_items
            console.log('No fabric_color_id found, we will mock one or leave it null.');
        }

        const b = {
            source_id: source.id,
            fabric_items: [
                {
                    reservation_ids: [],
                    material_name: 'COTTON LITE 100%',
                    color_name: 'Bích Đậm',
                    unit: 'kg',
                    unit_price: 200000,
                    fabric_color_id: null,
                    trees: [
                        { weight: 24 }
                    ]
                }
            ],
            extra_costs: [],
            ship_cost: 0,
            ship_image_url: null,
            ship_image_path: null,
            bill_image_url: '/uploads/logo.png',
            bill_image_path: null,
            vat_amount: 0,
            cost_notes: 'Test import'
        };

        console.log('\n--- Running Transaction (Simulated) ---');
        const now = vnNow();
        const pool = db.getDB();
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Generate unique fabric_import_code
            let fabricCode;
            for (let attempt = 0; attempt < 5; attempt++) {
                fabricCode = genFabricCode();
                const exists = await client.query('SELECT 1 FROM import_records WHERE fabric_import_code=$1', [fabricCode]);
                if (exists.rows.length === 0) break;
                if (attempt === 4) throw new Error('Không thể tạo mã nhập vải duy nhất');
            }
            console.log('Generated fabric code:', fabricCode);

            // 2. Lock and validate reservations
            const reservationIds = b.fabric_items.flatMap(fi => fi.reservation_ids || (fi.reservation_id ? [fi.reservation_id] : [])).filter(Boolean);
            if (reservationIds.length > 0) {
                const locked = await client.query(
                    `SELECT id, status FROM qlx_fabric_reservations WHERE id = ANY($1) FOR UPDATE`,
                    [reservationIds]
                );
                for (const row of locked.rows) {
                    if (row.status !== 'reserved') {
                        throw new Error(`Yêu cầu gọi vải #${row.id} đã được xử lý bởi người khác`);
                    }
                }
            }

            // 3. Create kv_rolls for each fabric item + tree
            const fabricItemsResult = [];
            let totalFabricQty = 0;
            const fabricMaterialNames = [];

            for (const fi of b.fabric_items) {
                const rollIds = [];
                let itemTotalWeight = 0;
                const unitPrice = Number(fi.unit_price) || 0;
                const treesWithCost = [];
                for (const tree of fi.trees) {
                    const w = Number(tree.weight);
                    const treeCost = Math.round(w * unitPrice);
                    itemTotalWeight += w;
                    treesWithCost.push({ weight: w, cost: treeCost });
                    if (fi.fabric_color_id) {
                        const rollCode = 'KV' + crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 10);
                        
                        console.log(`Inserting roll code ${rollCode} for color id ${fi.fabric_color_id} and weight ${w}...`);
                        
                        const rollResult = await client.query(
                            `INSERT INTO kv_rolls (fabric_color_id, roll_code, weight, original_weight, source, note, created_by)
                             VALUES ($1, $2, $3, $3, 'nhap_vai', $4, $5) RETURNING id`,
                            [fi.fabric_color_id, rollCode, w, `Nhập vải từ bill ${fabricCode}`, user.id]
                        );
                        const newRollId = rollResult.rows[0].id;
                        rollIds.push(newRollId);

                        // Collect order codes from linked reservations for tagging
                        const resIds = fi.reservation_ids || [];
                        const calledOrders = [];
                        const autoReserveTargets = [];
                        if (resIds.length > 0) {
                            const resRows = await client.query(
                                `SELECT r.id, r.dht_order_id, r.item_id, r.phoi_index, r.material_name, r.color_name, r.unit,
                                        o.order_code
                                 FROM qlx_fabric_reservations r
                                 LEFT JOIN dht_orders o ON o.id = r.dht_order_id
                                 WHERE r.id = ANY($1)`, [resIds]
                            );
                            for (const rr of resRows.rows) {
                                if (rr.order_code && !calledOrders.includes(rr.order_code)) calledOrders.push(rr.order_code);
                                autoReserveTargets.push(rr);
                            }
                        }

                        // Tag roll with source info
                        if (calledOrders.length > 0) {
                            await client.query(
                                `UPDATE kv_rolls SET called_for_orders = $1::jsonb WHERE id = $2`,
                                [JSON.stringify(calledOrders), newRollId]
                            );
                        }

                        // Auto-create from_stock reservations for each linked order
                        for (const target of autoReserveTargets) {
                            await client.query(
                                `INSERT INTO qlx_fabric_reservations (dht_order_id, item_id, phoi_index, material_name, color_name, unit,
                                    reservation_type, roll_id, roll_code, kg_reserved, status, arrived_at, arrived_by, created_by)
                                 VALUES ($1,$2,$3,$4,$5,$6,'from_stock',$7,$8,$9,'arrived',$10,$11,$12)`,
                                [target.dht_order_id, target.item_id, target.phoi_index,
                                 target.material_name, target.color_name, target.unit || 'kg',
                                 newRollId, rollCode, w, now, user.id, user.id]
                            );
                        }

                        await client.query(
                            `INSERT INTO kv_transactions (fabric_color_id, tx_type, quantity, description, created_by)
                             VALUES ($1, 'NHAP', $2, $3, $4)`,
                            [fi.fabric_color_id, w, `Nhập vải: ${fi.material_name} - ${fi.color_name} (${w}${fi.unit || 'kg'}) bill ${fabricCode}`, user.id]
                        );
                    }
                }
                const itemCost = treesWithCost.reduce((s, t) => s + t.cost, 0);
                totalFabricQty += itemTotalWeight;
                fabricMaterialNames.push(`${fi.material_name} - ${fi.color_name}`);

                fabricItemsResult.push({
                    reservation_ids: fi.reservation_ids || [],
                    material_name: fi.material_name,
                    color_name: fi.color_name,
                    unit: fi.unit || 'kg',
                    unit_price: unitPrice,
                    trees: treesWithCost,
                    actual_total: itemTotalWeight,
                    item_cost: itemCost,
                    fabric_color_id: fi.fabric_color_id || null,
                    roll_ids_created: rollIds
                });
            }

            // 4. Smart fulfillment check per reservation group
            const allImportRows = await client.query(`SELECT fabric_items FROM import_records WHERE record_type='fabric'`);
            const prevImportEntries = [];
            for (const row of allImportRows.rows) {
                let items = []; try { items = typeof row.fabric_items === 'string' ? JSON.parse(row.fabric_items) : (row.fabric_items || []); } catch(e) {}
                for (const fi of items) {
                    const resIds = (fi.reservation_ids || []).map(Number).filter(n => n > 0);
                    const treeCount = (fi.trees || []).length;
                    if (resIds.length > 0 && treeCount > 0) {
                        prevImportEntries.push({ resIds: new Set(resIds), treeCount });
                    }
                }
            }

            // For each fabric item in this bill, check fulfillment by reservation_ids
            const checkedResGroups = new Set();
            for (const fi of fabricItemsResult) {
                const fiResIds = (fi.reservation_ids || []).map(Number).filter(n => n > 0);
                if (!fiResIds.length) continue;
                const resKey = fiResIds.slice().sort((a, b) => a - b).join(',');
                if (checkedResGroups.has(resKey)) continue;
                checkedResGroups.add(resKey);

                const fiResIdSet = new Set(fiResIds);

                // Get the specific reservations linked to this bill
                const groupRes = await client.query(
                    `SELECT id, dht_order_id, call_trees, call_amount FROM qlx_fabric_reservations
                     WHERE id = ANY($1) AND reservation_type='new_call' AND status='reserved'
                     FOR UPDATE`,
                    [fiResIds]
                );
                if (groupRes.rows.length === 0) continue;

                // Calculate needed trees for these specific reservations
                let neededTrees = 0;
                for (const r of groupRes.rows) {
                    neededTrees += (Number(r.call_trees) || 0) + (Number(r.call_amount) > 0 ? 1 : 0);
                }

                // Count trees from PREVIOUS bills linked to same reservations
                let prevImported = 0;
                for (const entry of prevImportEntries) {
                    for (const rid of entry.resIds) {
                        if (fiResIdSet.has(rid)) {
                            prevImported += entry.treeCount;
                            break; 
                        }
                    }
                }

                // Count trees from THIS bill for this reservation group
                let thisImported = 0;
                for (const fi2 of fabricItemsResult) {
                    const fi2ResIds = (fi2.reservation_ids || []).map(Number);
                    for (const rid of fi2ResIds) {
                        if (fiResIdSet.has(rid)) {
                            thisImported += (fi2.trees || []).length;
                            break; 
                        }
                    }
                }

                const totalImported = prevImported + thisImported;

                if (totalImported >= neededTrees) {
                    const resIds = groupRes.rows.map(r => r.id);
                    await client.query(
                        `UPDATE qlx_fabric_reservations SET status='fulfilled', arrived_at=$1, arrived_by=$2, updated_at=$1 WHERE id=ANY($3)`,
                        [now, user.id, resIds]
                    );

                    const linkedChildren = await client.query(
                        `SELECT id, dht_order_id FROM qlx_fabric_reservations WHERE linked_call_id = ANY($1) AND status = 'reserved'`,
                        [resIds]
                    );
                    if (linkedChildren.rows.length > 0) {
                        const childResIds = linkedChildren.rows.map(c => c.id);
                        await client.query(
                            `UPDATE qlx_fabric_reservations SET status = 'arrived', arrived_at = $1, arrived_by = $2, updated_at = $1 WHERE id = ANY($3)`,
                            [now, user.id, childResIds]
                        );
                    }

                    const parentOrders = groupRes.rows.map(r => r.dht_order_id);
                    const childOrders = linkedChildren.rows.map(c => c.dht_order_id);
                    const affectedOrders = [...new Set([...parentOrders, ...childOrders])];

                    for (const ordId of affectedOrders) {
                        const pending = await client.query(
                            `SELECT COUNT(*)::int AS cnt FROM qlx_fabric_reservations WHERE dht_order_id=$1 AND status='reserved'`,
                            [ordId]
                        );
                        if (pending.rows[0].cnt === 0) {
                            await client.query(
                                  `INSERT INTO qlx_preparation (dht_order_id, fabric_arrived, fabric_arrived_at, fabric_arrived_by)
                                 VALUES ($1, true, $2, $3)
                                 ON CONFLICT (dht_order_id) WHERE item_id IS NULL DO UPDATE SET fabric_arrived=true, fabric_arrived_at=$2, fabric_arrived_by=$3, updated_at=$2`,
                                [ordId, now, user.id]
                            );
                        }
                    }
                }
            }

            // 5. Calculate financials
            const fabricCost = fabricItemsResult.reduce((s, fi) => s + (fi.item_cost || 0), 0);
            const extraCostTotal = 0;
            const vatAmount = Number(b.vat_amount) || 0;
            const totalCost = fabricCost + extraCostTotal + vatAmount;
            const paid = 0; 
            const totalDebt = totalCost;

            // 6. Handle ship cost → create cashflow CHI
            let shipCfId = null, shipCfCode = null;
            const shipCost = Number(b.ship_cost) || 0;

            console.log('Inserting import record...');
            // 7. Insert import_records
            const importResult = await client.query(
                `INSERT INTO import_records (record_type, fabric_import_code, import_date, source_id, importer_id,
                    fabric_material, fabric_quantity, fabric_items, extra_costs,
                    cost, total_amount, paid, debt,
                    ship_cost, ship_image_url, ship_image_path, ship_cashflow_id, ship_cashflow_code,
                    bill_image_url, bill_image_path, cost_notes, vat_amount,
                    created_by, created_at)
                 VALUES ('fabric', $1, $2, $3, $4,
                    $5, $6, $7::jsonb, $8::jsonb,
                    $9, $10, $11, $12,
                    $13, $14, $15, $16, $17,
                    $18, $19, $20, $21,
                    $22, $23) RETURNING id`,
                [fabricCode, now, b.source_id, user.id,
                 fabricMaterialNames.join(', '), totalFabricQty, JSON.stringify(fabricItemsResult), JSON.stringify([]),
                 totalCost, totalCost, paid, totalDebt,
                 shipCost, b.ship_image_url || null, b.ship_image_path || null, shipCfId, shipCfCode,
                 b.bill_image_url, b.bill_image_path || null, b.cost_notes || null, vatAmount,
                 user.id, now]
            );
            const importId = importResult.rows[0].id;
            console.log('Import inserted successfully! ID:', importId);

            // 7b. Backfill source_import_id on created rolls
            const allCreatedRollIds = fabricItemsResult.reduce((arr, fi) => arr.concat(fi.roll_ids_created || []), []);
            if (allCreatedRollIds.length > 0) {
                await client.query(
                    `UPDATE kv_rolls SET source_import_id = $1 WHERE id = ANY($2)`,
                    [importId, allCreatedRollIds]
                );
            }

            // 8. History
            await client.query(
                `INSERT INTO import_history (import_id, action, details, performed_by, performed_at)
                 VALUES ($1, 'create_fabric', $2, $3, $4)`,
                [importId, `🧵 Nhập vải: ${fabricMaterialNames.join(', ')} | Mã: ${fabricCode}`, user.id, now]
            );

            console.log('Transaction succeeded in memory!');
            await client.query('ROLLBACK');
            console.log('Rolled back successfully.');
        } catch(err) {
            await client.query('ROLLBACK');
            console.error('ERROR inside transaction:', err.message);
            console.error(err.stack);
        } finally {
            client.release();
        }

    } catch(e) {
        console.error(e.stack || e.message);
    }
    process.exit(0);
})();
