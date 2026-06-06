// ========== KHO VẬT LIỆU — Routes ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow } = require('../utils/timezone');

module.exports = async function(fastify) {

    // ========== AUTO-MIGRATE & TRIGGERS ==========
    try {
        // 1. Create material_transactions table
        await db.exec(`CREATE TABLE IF NOT EXISTS material_transactions (
            id SERIAL PRIMARY KEY,
            material_item_id INTEGER NOT NULL REFERENCES material_items(id) ON DELETE CASCADE,
            tx_type VARCHAR(10) NOT NULL CHECK (tx_type IN ('NHAP', 'XUAT', 'HOAN')),
            quantity NUMERIC NOT NULL CHECK (quantity >= 0),
            price NUMERIC DEFAULT 0,
            total_amount NUMERIC DEFAULT 0, -- quantity * price
            performed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            performed_at TIMESTAMPTZ DEFAULT NOW(),
            import_record_id INTEGER REFERENCES import_records(id) ON DELETE CASCADE,
            printing_record_id INTEGER REFERENCES printing_records(id) ON DELETE CASCADE,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_mt_item_id ON material_transactions(material_item_id)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_mt_tx_type ON material_transactions(tx_type)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_mt_printing_id ON material_transactions(printing_record_id)`);
    } catch(e) { console.error('[KVL] Migrate material_transactions error:', e.message); }

    try {
        // 2. Add material_tx_id to printing_records
        await db.exec(`ALTER TABLE printing_records ADD COLUMN IF NOT EXISTS material_tx_id INTEGER REFERENCES material_transactions(id) ON DELETE SET NULL`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_pr_material_tx ON printing_records(material_tx_id)`);
    } catch(e) { console.error('[KVL] Add material_tx_id column error:', e.message); }

    try {
        await db.exec(`ALTER TABLE material_transactions ADD COLUMN IF NOT EXISTS parent_tx_id INTEGER REFERENCES material_transactions(id) ON DELETE SET NULL`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_mt_parent_tx ON material_transactions(parent_tx_id)`);
    } catch(e) { console.error('[KVL] Add parent_tx_id column error:', e.message); }

    try {
        // 3. Create Trigger Function to sync import_records (general) to material_transactions
        await db.exec(`
            CREATE OR REPLACE FUNCTION sync_import_records_to_material_transactions()
            RETURNS TRIGGER AS $$
            DECLARE
                item RECORD;
            BEGIN
                IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
                    DELETE FROM material_transactions WHERE import_record_id = OLD.id AND tx_type = 'NHAP';
                END IF;

                IF (TG_OP = 'DELETE') THEN
                    RETURN OLD;
                END IF;

                -- Only sync if it is a general material import
                IF NEW.record_type = 'general' THEN
                    IF NEW.fabric_items IS NOT NULL AND jsonb_typeof(NEW.fabric_items) = 'array' THEN
                        FOR item IN SELECT * FROM jsonb_to_recordset(NEW.fabric_items) AS x(material_item_id INT, quantity NUMERIC, price NUMERIC, cost NUMERIC) LOOP
                            IF item.material_item_id IS NOT NULL THEN
                                INSERT INTO material_transactions (
                                    material_item_id, tx_type, quantity, price, total_amount, performed_by, performed_at, import_record_id, notes
                                ) VALUES (
                                    item.material_item_id,
                                    'NHAP',
                                    COALESCE(item.quantity, 0),
                                    COALESCE(item.price, 0),
                                    COALESCE(item.cost, 0),
                                    NEW.importer_id,
                                    COALESCE(NEW.import_date::timestamptz, NEW.created_at),
                                    NEW.id,
                                    NEW.cost_notes
                                );
                            END IF;
                        END LOOP;
                    END IF;
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Create Trigger on import_records
        await db.exec(`
            DROP TRIGGER IF EXISTS trigger_sync_import_records ON import_records;
            CREATE TRIGGER trigger_sync_import_records
            AFTER INSERT OR UPDATE OR DELETE ON import_records
            FOR EACH ROW
            EXECUTE FUNCTION sync_import_records_to_material_transactions();
        `);
    } catch(e) { console.error('[KVL] Create import trigger error:', e.message); }

    try {
        // 4. Create Trigger Function to sync printing_records to material_transactions (XUAT)
        await db.exec(`
            CREATE OR REPLACE FUNCTION sync_printing_records_to_material_transactions()
            RETURNS TRIGGER AS $$
            DECLARE
                material_id INT;
                nhap_price NUMERIC;
            BEGIN
                IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
                    DELETE FROM material_transactions WHERE printing_record_id = OLD.id AND tx_type = 'XUAT';
                END IF;

                IF (TG_OP = 'DELETE') THEN
                    RETURN OLD;
                END IF;

                -- If the printing is marked done AND linked to a roll/transaction AND NOT using a workshop roll (to avoid double-counting)
                IF NEW.is_print_done = true AND NEW.material_tx_id IS NOT NULL AND NEW.pettem_roll_id IS NULL THEN
                    SELECT material_item_id, price INTO material_id, nhap_price 
                    FROM material_transactions WHERE id = NEW.material_tx_id;
                    
                    IF material_id IS NOT NULL THEN
                        INSERT INTO material_transactions (
                            material_item_id, tx_type, quantity, price, total_amount, performed_by, performed_at, printing_record_id, notes, parent_tx_id
                        ) VALUES (
                            material_id,
                            'XUAT',
                            COALESCE(NEW.print_meters, 0),
                            COALESCE(nhap_price, 0),
                            COALESCE(NEW.print_meters, 0) * COALESCE(nhap_price, 0),
                            COALESCE(NEW.print_done_by, NEW.printer_id, NEW.created_by),
                            COALESCE(NEW.print_done_at, NEW.updated_at, NOW()),
                            NEW.id,
                            'Xuất in đơn ' || COALESCE((SELECT order_code FROM dht_orders WHERE id = NEW.dht_order_id), '') || ': ' || COALESCE(NEW.product_name, ''),
                            NEW.material_tx_id
                        );
                    END IF;
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Create Trigger on printing_records
        await db.exec(`
            DROP TRIGGER IF EXISTS trigger_sync_printing_records ON printing_records;
            CREATE TRIGGER trigger_sync_printing_records
            AFTER INSERT OR UPDATE OR DELETE ON printing_records
            FOR EACH ROW
            EXECUTE FUNCTION sync_printing_records_to_material_transactions();
        `);
    } catch(e) { console.error('[KVL] Create printing trigger error:', e.message); }

    try {
        // 5. Backfill existing general import records to populate transactions
        const existingCount = await db.get("SELECT COUNT(*)::int AS cnt FROM material_transactions WHERE tx_type = 'NHAP'");
        if (existingCount.cnt === 0) {
            console.log('[KVL] Backfilling existing general import records...');
            await db.run("UPDATE import_records SET updated_at = NOW() WHERE record_type = 'general'");
            console.log('[KVL] Backfill complete.');
        }
    } catch(e) { console.error('[KVL] Backfill error:', e.message); }

    // ========== API ENDPOINTS ==========

    // 1. GET /api/khovatlieu/tree
    fastify.get('/api/khovatlieu/tree', { preHandler: [authenticate] }, async () => {
        // Fetch warehouses
        const warehouses = await db.all(`
            SELECT id, name, display_order 
            FROM material_warehouses 
            WHERE is_active = true 
            ORDER BY display_order, name
        `);

        // Fetch items with remaining stock
        const items = await db.all(`
            SELECT 
                mi.id, mi.name, mi.warehouse_id, mi.unit, mi.display_order,
                COALESCE(SUM(CASE WHEN mt.tx_type = 'NHAP' THEN mt.quantity ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN mt.tx_type = 'XUAT' THEN mt.quantity ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN mt.tx_type = 'HOAN' THEN mt.quantity ELSE 0 END), 0) AS remaining_stock
            FROM material_items mi
            LEFT JOIN material_transactions mt ON mi.id = mt.material_item_id
            WHERE mi.is_active = true
            GROUP BY mi.id, mi.name, mi.warehouse_id, mi.unit, mi.display_order
            ORDER BY mi.warehouse_id, mi.display_order, mi.name
        `);

        // Group items into warehouses
        const tree = warehouses.map(wh => {
            const whItems = items.filter(it => it.warehouse_id === wh.id).map(it => ({
                id: it.id,
                name: it.name,
                unit: it.unit,
                remaining_stock: Number(it.remaining_stock)
            }));
            return {
                id: wh.id,
                name: wh.name,
                items: whItems,
                total_items: whItems.length
            };
        });

        return { tree };
    });

    // 2. GET /api/khovatlieu/summary
    fastify.get('/api/khovatlieu/summary', { preHandler: [authenticate] }, async (req) => {
        const { warehouse_id, search } = req.query;
        let whereClause = 'WHERE mi.is_active = true';
        let params = [];
        let idx = 1;

        if (warehouse_id) {
            whereClause += ` AND mi.warehouse_id = $${idx++}`;
            params.push(Number(warehouse_id));
        }

        if (search) {
            whereClause += ` AND mi.name ILIKE $${idx++}`;
            params.push(`%${search}%`);
        }

        // Fetch main summaries
        const summaries = await db.all(`
            SELECT 
                mi.id, mi.name, mi.unit, mi.warehouse_id, w.name AS warehouse_name,
                COALESCE(SUM(CASE WHEN mt.tx_type = 'NHAP' THEN mt.quantity ELSE 0 END), 0)::numeric AS total_import,
                COALESCE(SUM(CASE WHEN mt.tx_type = 'XUAT' THEN mt.quantity ELSE 0 END), 0)::numeric AS total_export,
                COALESCE(SUM(CASE WHEN mt.tx_type = 'HOAN' THEN mt.quantity ELSE 0 END), 0)::numeric AS total_refund,
                (COALESCE(SUM(CASE WHEN mt.tx_type = 'NHAP' THEN mt.quantity ELSE 0 END), 0) -
                 COALESCE(SUM(CASE WHEN mt.tx_type = 'XUAT' THEN mt.quantity ELSE 0 END), 0) -
                 COALESCE(SUM(CASE WHEN mt.tx_type = 'HOAN' THEN mt.quantity ELSE 0 END), 0))::numeric AS remaining_stock
            FROM material_items mi
            LEFT JOIN material_warehouses w ON mi.warehouse_id = w.id
            LEFT JOIN material_transactions mt ON mi.id = mt.material_item_id
            ${whereClause}
            GROUP BY mi.id, mi.name, mi.unit, mi.warehouse_id, w.name
            ORDER BY w.name, mi.name
        `, params);

        // Fetch supplier relationships for each warehouse and actual imports
        const warehouseSuppliers = await db.all(`
            SELECT mws.warehouse_id, s.name AS supplier_name 
            FROM material_warehouse_sources mws
            JOIN import_sources s ON mws.source_id = s.id
        `);

        const actualSuppliers = await db.all(`
            SELECT DISTINCT mt.material_item_id, s.name AS supplier_name
            FROM material_transactions mt
            JOIN import_records ir ON mt.import_record_id = ir.id
            JOIN import_sources s ON ir.source_id = s.id
            WHERE mt.tx_type = 'NHAP'
        `);

        // Map suppliers to summary records
        const results = summaries.map(sum => {
            const whSups = warehouseSuppliers.filter(s => s.warehouse_id === sum.warehouse_id).map(s => s.supplier_name);
            const actSups = actualSuppliers.filter(s => s.material_item_id === sum.id).map(s => s.supplier_name);
            const allSups = [...new Set([...whSups, ...actSups])];
            
            return {
                ...sum,
                total_import: Number(sum.total_import),
                total_export: Number(sum.total_export),
                total_refund: Number(sum.total_refund),
                remaining_stock: Number(sum.remaining_stock),
                suppliers: allSups
            };
        });

        return { summaries: results };
    });

    // 3. GET /api/khovatlieu/history
    fastify.get('/api/khovatlieu/history', { preHandler: [authenticate] }, async (req, reply) => {
        const { material_item_id } = req.query;
        if (!material_item_id) {
            return reply.code(400).send({ error: 'material_item_id là bắt buộc' });
        }

        // Fetch details of the material item
        const itemInfo = await db.get(`
            SELECT mi.id, mi.name, mi.unit, w.name AS warehouse_name
            FROM material_items mi
            LEFT JOIN material_warehouses w ON mi.warehouse_id = w.id
            WHERE mi.id = $1
        `, [Number(material_item_id)]);

        if (!itemInfo) {
            return reply.code(404).send({ error: 'Không tìm thấy vật liệu này' });
        }

        // Fetch transaction history (chronological order for running balance calculation)
        const transactions = await db.all(`
            SELECT 
                mt.id, mt.tx_type, mt.quantity, mt.price, mt.total_amount, 
                mt.performed_at, mt.notes, mt.import_record_id, mt.printing_record_id,
                mt.parent_tx_id,
                u.full_name AS performer_name,
                s.name AS supplier_name
            FROM material_transactions mt
            LEFT JOIN users u ON mt.performed_by = u.id
            LEFT JOIN import_records ir ON mt.import_record_id = ir.id
            LEFT JOIN import_sources s ON ir.source_id = s.id
            WHERE mt.material_item_id = $1
            ORDER BY mt.performed_at ASC, mt.id ASC
        `, [Number(material_item_id)]);

        // Calculate running balance and compile financial statistics
        let runningBalance = 0;
        let totalImportCost = 0;
        let totalImportQuantity = 0;

        const mappedTx = transactions.map(tx => {
            const qty = Number(tx.quantity);
            const price = Number(tx.price);
            const amt = Number(tx.total_amount);

            if (tx.tx_type === 'NHAP') {
                runningBalance += qty;
                totalImportCost += amt;
                totalImportQuantity += qty;
            } else if (tx.tx_type === 'XUAT') {
                runningBalance -= qty;
            } else if (tx.tx_type === 'HOAN') {
                runningBalance -= qty;
            }

            return {
                id: tx.id,
                tx_type: tx.tx_type,
                quantity: qty,
                price: price,
                total_amount: amt,
                performed_at: tx.performed_at,
                notes: tx.notes,
                import_record_id: tx.import_record_id,
                printing_record_id: tx.printing_record_id,
                parent_tx_id: tx.parent_tx_id,
                performer_name: tx.performer_name || 'Hệ thống',
                supplier_name: tx.supplier_name || '',
                running_balance: runningBalance
            };
        });

        // Query printed orders linked to NHAP transactions in this log
        const nhapTxIds = mappedTx.filter(tx => tx.tx_type === 'NHAP').map(tx => tx.id);
        let printedOrdersMap = {};
        
        if (nhapTxIds.length > 0) {
            const prints = await db.all(`
                SELECT pr.id, pr.material_tx_id, pr.dht_order_id, o.order_code, o.customer_name, 
                       pr.order_quantity, pr.print_meters, pr.print_done_at
                FROM printing_records pr
                JOIN dht_orders o ON pr.dht_order_id = o.id
                WHERE pr.material_tx_id = ANY($1) AND pr.is_print_done = true
                ORDER BY pr.print_done_at DESC
            `, [nhapTxIds]);

            prints.forEach(p => {
                if (!printedOrdersMap[p.material_tx_id]) {
                    printedOrdersMap[p.material_tx_id] = [];
                }
                printedOrdersMap[p.material_tx_id].push({
                    id: p.id,
                    dht_order_id: p.dht_order_id,
                    order_code: p.order_code,
                    customer_name: p.customer_name,
                    order_quantity: p.order_quantity,
                    print_meters: Number(p.print_meters),
                    print_done_at: p.print_done_at
                });
            });
        }

        // Attach printed orders list to the transactions
        const finalTxList = mappedTx.map(tx => ({
            ...tx,
            printed_orders: printedOrdersMap[tx.id] || []
        }));

        // Sort descending for display (most recent first)
        finalTxList.reverse();

        const averageImportPrice = totalImportQuantity > 0 ? (totalImportCost / totalImportQuantity) : 0;

        return {
            material: itemInfo,
            history: finalTxList,
            stats: {
                total_import_cost: totalImportCost,
                average_import_price: averageImportPrice,
                total_import_qty: totalImportQuantity
            }
        };
    });

    // 4. POST /api/khovatlieu/transaction (Manual XUAT/HOAN adjustment)
    fastify.post('/api/khovatlieu/transaction', { preHandler: [authenticate] }, async (req, reply) => {
        const { material_item_id, tx_type, quantity, price, notes } = req.body || {};
        
        if (!material_item_id || !tx_type || !quantity) {
            return reply.code(400).send({ error: 'Thiếu thông tin bắt buộc (material_item_id, tx_type, quantity)' });
        }

        if (!['XUAT', 'HOAN'].includes(tx_type)) {
            return reply.code(400).send({ error: 'Loại giao dịch thủ công chỉ được là XUAT hoặc HOAN' });
        }

        const qty = Number(quantity);
        if (isNaN(qty) || qty <= 0) {
            return reply.code(400).send({ error: 'Số lượng phải lớn hơn 0' });
        }

        const itemExists = await db.get('SELECT id FROM material_items WHERE id = $1 AND is_active = true', [Number(material_item_id)]);
        if (!itemExists) {
            return reply.code(404).send({ error: 'Vật liệu không tồn tại hoặc đã bị khóa' });
        }

        const prc = Number(price) || 0;
        const total = qty * prc;
        const now = vnNow();

        const r = await db.get(`
            INSERT INTO material_transactions (
                material_item_id, tx_type, quantity, price, total_amount, performed_by, performed_at, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
        `, [Number(material_item_id), tx_type, qty, prc, total, req.user.id, now, notes || null]);

        return { success: true, id: r.id };
    });

    // 5. GET /api/khovatlieu/available-rolls
    fastify.get('/api/khovatlieu/available-rolls', { preHandler: [authenticate] }, async (req, reply) => {
        const { material_item_id } = req.query;
        if (!material_item_id) {
            return reply.code(400).send({ error: 'material_item_id là bắt buộc' });
        }

        // Fetch NHAP transactions for this item where they have positive remaining stock (original quantity minus exported quantities)
        const rolls = await db.all(`
            SELECT * FROM (
                SELECT 
                    mt.id, mt.performed_at, mt.quantity::numeric AS quantity, mt.price::numeric AS price, mt.notes,
                    s.name AS source_name,
                    (mt.quantity - COALESCE((SELECT SUM(quantity) FROM material_transactions WHERE parent_tx_id = mt.id AND tx_type = 'XUAT' AND printing_record_id IS NULL), 0))::numeric AS remaining_qty
                FROM material_transactions mt
                LEFT JOIN import_records ir ON mt.import_record_id = ir.id
                LEFT JOIN import_sources s ON ir.source_id = s.id
                WHERE mt.material_item_id = $1 AND mt.tx_type = 'NHAP'
            ) x
            WHERE x.remaining_qty > 0
            ORDER BY x.performed_at DESC, x.id DESC
        `, [Number(material_item_id)]);

        const formatted = rolls.map(r => ({
            id: r.id,
            performed_at: r.performed_at,
            quantity: Number(r.quantity),
            price: Number(r.price),
            notes: r.notes || '',
            source_name: r.source_name || 'Nguồn khác',
            remaining_qty: Number(r.remaining_qty)
        }));

        return { rolls: formatted };
    });
};
