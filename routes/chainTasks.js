const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const { calculateRealDeadline, toLocalTimestamp } = require('./deadline-checker');
const { canApproveByRole, isAutoApproveRole } = require('../utils/approvalHierarchy');

// Helper: check if user has manager-level access
function isManager(role) {
    return ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong'].includes(role);
}
function isDirector(role) {
    return role === 'giam_doc';
}

async function chainTaskRoutes(fastify, options) {

    // ========== TEMPLATE CRUD ==========

    // GET: List all active chain templates
    fastify.get('/api/chain-tasks/templates', { preHandler: [authenticate] }, async (request, reply) => {
        const templates = await db.all(`
            SELECT ct.*, u.full_name as creator_name,
                   (SELECT COUNT(*) FROM chain_task_template_items WHERE chain_template_id = ct.id) as item_count
            FROM chain_task_templates ct
            LEFT JOIN users u ON u.id = ct.created_by
            WHERE ct.is_active = true
            ORDER BY ct.created_at DESC
        `);
        return templates;
    });

    // GET: Single template with items
    fastify.get('/api/chain-tasks/templates/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const template = await db.get('SELECT * FROM chain_task_templates WHERE id = $1', [id]);
        if (!template) return reply.code(404).send({ error: 'Template not found' });

        const items = await db.all(
            'SELECT * FROM chain_task_template_items WHERE chain_template_id = $1 ORDER BY item_order',
            [id]
        );
        return { ...template, items };
    });

    // POST: Create chain template (GĐ only)
    fastify.post('/api/chain-tasks/templates', { preHandler: [authenticate] }, async (request, reply) => {
        if (!isDirector(request.user.role)) {
            return reply.code(403).send({ error: 'Chỉ Giám đốc mới được tạo mẫu chuỗi' });
        }

        const { chain_name, description, execution_mode, items } = request.body;
        if (!chain_name || !items || items.length === 0) {
            return reply.code(400).send({ error: 'Tên chuỗi và ít nhất 1 task con là bắt buộc' });
        }

        const template = await db.get(
            `INSERT INTO chain_task_templates (chain_name, description, execution_mode, created_by)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [chain_name, description || '', execution_mode || 'sequential', request.user.id]
        );

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            await db.run(
                `INSERT INTO chain_task_template_items 
                 (chain_template_id, item_order, task_name, task_content, guide_link, 
                  input_requirements, output_requirements, requires_approval, requires_report, 
                  min_quantity, relative_days, deadline, max_redo_count)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [template.id, i + 1, item.task_name, item.task_content || '',
                 item.guide_link || '', item.input_requirements || '', item.output_requirements || '',
                 item.requires_approval || false, item.requires_report !== false,
                 item.min_quantity || 1, item.relative_days || 0, item.deadline || null, item.max_redo_count || 3]
            );
        }

        return { success: true, template };
    });

    // PUT: Update chain template (GĐ only)
    fastify.put('/api/chain-tasks/templates/:id', { preHandler: [authenticate] }, async (request, reply) => {
        if (!isDirector(request.user.role)) {
            return reply.code(403).send({ error: 'Chỉ Giám đốc mới được sửa mẫu chuỗi' });
        }

        const { id } = request.params;
        const { chain_name, description, execution_mode, items } = request.body;

        await db.run(
            `UPDATE chain_task_templates SET chain_name=$1, description=$2, execution_mode=$3 WHERE id=$4`,
            [chain_name, description || '', execution_mode || 'sequential', id]
        );

        // Replace items
        await db.run('DELETE FROM chain_task_template_items WHERE chain_template_id = $1', [id]);
        if (items && items.length > 0) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                await db.run(
                    `INSERT INTO chain_task_template_items 
                     (chain_template_id, item_order, task_name, task_content, guide_link,
                      input_requirements, output_requirements, requires_approval, requires_report,
                      min_quantity, relative_days, deadline, max_redo_count)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                    [id, i + 1, item.task_name, item.task_content || '',
                     item.guide_link || '', item.input_requirements || '', item.output_requirements || '',
                     item.requires_approval || false, item.requires_report !== false,
                     item.min_quantity || 1, item.relative_days || 0, item.deadline || null, item.max_redo_count || 3]
                );
            }
        }

        return { success: true };
    });

    // PUT: Update chain instance (GĐ only) — only pending items can be modified
    fastify.put('/api/chain-tasks/instances/:id', { preHandler: [authenticate] }, async (request, reply) => {
        if (!isDirector(request.user.role)) {
            return reply.code(403).send({ error: 'Chỉ Giám đốc mới được sửa chuỗi' });
        }

        const { id } = request.params;
        const { chain_name, items_update, items_add, items_delete } = request.body;

        // Update chain name
        if (chain_name) {
            await db.run('UPDATE chain_task_instances SET chain_name=$1 WHERE id=$2', [chain_name, id]);
        }

        // Update existing pending items
        if (items_update && items_update.length > 0) {
            for (const item of items_update) {
                // Only allow updating pending items
                const existing = await db.get('SELECT status FROM chain_task_instance_items WHERE id=$1 AND chain_instance_id=$2', [item.id, id]);
                if (!existing || existing.status !== 'pending') continue;

                await db.run(
                    `UPDATE chain_task_instance_items SET 
                     task_name=$1, task_content=$2, guide_link=$3, deadline=$4, deadline_time=$5,
                     requires_approval=$6, min_quantity=$7, max_redo_count=$8
                     WHERE id=$9 AND chain_instance_id=$10`,
                    [item.task_name, item.task_content || '', item.guide_link || '',
                     item.deadline, item.deadline_time || null,
                     item.requires_approval || false, item.min_quantity || 1, item.max_redo_count || 3,
                     item.id, id]
                );

                // Update assignments if provided
                if (item.user_ids) {
                    await db.run('DELETE FROM chain_task_assignments WHERE chain_item_id=$1', [item.id]);
                    for (const uid of item.user_ids) {
                        await db.run(
                            'INSERT INTO chain_task_assignments (chain_item_id, user_id, assigned_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
                            [item.id, uid, request.user.id]
                        );
                    }
                }
            }
        }

        // Add new items
        if (items_add && items_add.length > 0) {
            const maxOrder = await db.get('SELECT MAX(item_order) as mo FROM chain_task_instance_items WHERE chain_instance_id=$1', [id]);
            let nextOrder = (maxOrder?.mo || 0) + 1;

            for (const item of items_add) {
                const newItem = await db.get(
                    `INSERT INTO chain_task_instance_items 
                     (chain_instance_id, item_order, task_name, task_content, guide_link,
                      requires_approval, requires_report, min_quantity, max_redo_count,
                      deadline, deadline_time, status)
                     VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8,$9,$10,'pending') RETURNING id`,
                    [id, nextOrder++, item.task_name, item.task_content || '', item.guide_link || '',
                     item.requires_approval || false, item.min_quantity || 1, item.max_redo_count || 3,
                     item.deadline, item.deadline_time || null]
                );

                // Assign users
                if (item.user_ids && newItem) {
                    for (const uid of item.user_ids) {
                        await db.run(
                            'INSERT INTO chain_task_assignments (chain_item_id, user_id, assigned_by) VALUES ($1,$2,$3)',
                            [newItem.id, uid, request.user.id]
                        );
                    }
                }
            }
        }

        // Delete pending items
        if (items_delete && items_delete.length > 0) {
            for (const itemId of items_delete) {
                const existing = await db.get('SELECT status FROM chain_task_instance_items WHERE id=$1 AND chain_instance_id=$2', [itemId, id]);
                if (!existing || existing.status !== 'pending') continue;
                await db.run('DELETE FROM chain_task_instance_items WHERE id=$1', [itemId]);
            }
        }

        // Recalculate end_date
        const maxDl = await db.get("SELECT MAX(deadline) as max_dl FROM chain_task_instance_items WHERE chain_instance_id=$1", [id]);
        if (maxDl?.max_dl) {
            await db.run('UPDATE chain_task_instances SET end_date=$1 WHERE id=$2', [maxDl.max_dl, id]);
        }

        return { success: true };
    });

    // DELETE: Soft-delete template (GĐ only)
    fastify.delete('/api/chain-tasks/templates/:id', { preHandler: [authenticate] }, async (request, reply) => {
        if (!isDirector(request.user.role)) {
            return reply.code(403).send({ error: 'Chỉ Giám đốc mới được xóa mẫu chuỗi' });
        }
        await db.run('UPDATE chain_task_templates SET is_active = false WHERE id = $1', [request.params.id]);
        return { success: true };
    });

    // ========== DEPLOY CHAIN TO TEAM ==========

    // POST: Deploy a chain template to a department
    fastify.post('/api/chain-tasks/deploy', { preHandler: [authenticate] }, async (request, reply) => {
        if (!isManager(request.user.role)) {
            return reply.code(403).send({ error: 'Không có quyền triển khai' });
        }

        const { template_id, department_id, start_date, items_override, user_ids,
                penalty_amount, chain_penalty_amount, execution_mode_override } = request.body;

        if (!department_id || !start_date) {
            return reply.code(400).send({ error: 'Phòng ban và ngày bắt đầu là bắt buộc' });
        }

        let chainName, execMode, templateItems;

        if (template_id) {
            // Deploy from template
            const tmpl = await db.get('SELECT * FROM chain_task_templates WHERE id = $1 AND is_active = true', [template_id]);
            if (!tmpl) return reply.code(404).send({ error: 'Mẫu chuỗi không tồn tại' });

            chainName = tmpl.chain_name;
            execMode = execution_mode_override || tmpl.execution_mode;
            templateItems = await db.all(
                'SELECT * FROM chain_task_template_items WHERE chain_template_id = $1 ORDER BY item_order', [template_id]
            );
        } else if (request.body.chain_name && request.body.items) {
            // Deploy custom (no template)
            chainName = request.body.chain_name;
            execMode = request.body.execution_mode || 'sequential';
            templateItems = request.body.items.map((it, i) => ({
                ...it, item_order: i + 1, id: null
            }));
        } else {
            return reply.code(400).send({ error: 'Cần template_id hoặc chain_name + items' });
        }

        // Calculate end_date from items
        const startD = new Date(start_date);
        let maxDeadline = startD;

        // Create instance
        const instance = await db.get(
            `INSERT INTO chain_task_instances 
             (chain_template_id, chain_name, execution_mode, department_id, start_date, 
              penalty_amount, chain_penalty_amount, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [template_id || null, chainName, execMode, department_id, start_date,
             penalty_amount || 50000, chain_penalty_amount || 100000, request.user.id]
        );

        // Create instance items
        for (let i = 0; i < templateItems.length; i++) {
            const ti = templateItems[i];
            // Override deadline if provided, otherwise calculate from relative_days
            const override = items_override ? items_override[i] : null;
            let deadline;
            if (override && override.deadline) {
                deadline = override.deadline;
            } else if (ti.deadline) {
                deadline = ti.deadline;
            } else {
                const d = new Date(startD);
                d.setDate(d.getDate() + (ti.relative_days || 0));
                deadline = d.toISOString().split('T')[0];
            }
            const deadlineTime = override?.deadline_time || ti.deadline_time || null;

            const deadlineDate = new Date(deadline);
            if (deadlineDate > maxDeadline) maxDeadline = deadlineDate;

            // First item in sequential mode = 'in_progress', rest = 'pending'
            const itemStatus = (execMode === 'sequential' && i > 0) ? 'pending' : 'in_progress';

            const instanceItem = await db.get(
                `INSERT INTO chain_task_instance_items 
                 (chain_instance_id, template_item_id, item_order, task_name, task_content,
                  guide_link, input_requirements, output_requirements, requires_approval,
                  requires_report, min_quantity, deadline, deadline_time, status, max_redo_count)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
                [instance.id, ti.id || null, ti.item_order || (i + 1),
                 override?.task_name || ti.task_name, override?.task_content || ti.task_content || '',
                 override?.guide_link || ti.guide_link || '',
                 override?.input_requirements || ti.input_requirements || '',
                 override?.output_requirements || ti.output_requirements || '',
                 ti.requires_approval || false, ti.requires_report !== false,
                 ti.min_quantity || 1, deadline, deadlineTime, itemStatus, ti.max_redo_count || 3]
            );

            // Assign users
            const assignUserIds = (override && override.user_ids) ? override.user_ids : user_ids;
            if (assignUserIds && assignUserIds.length > 0) {
                for (const uid of assignUserIds) {
                    await db.run(
                        `INSERT INTO chain_task_assignments (chain_item_id, user_id, assigned_by) 
                         VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
                        [instanceItem.id, uid, request.user.id]
                    );
                }
            }
        }

        // Update end_date
        await db.run('UPDATE chain_task_instances SET end_date = $1 WHERE id = $2',
            [maxDeadline.toISOString().split('T')[0], instance.id]);

        return { success: true, instance_id: instance.id };
    });

    // ========== GET INSTANCES ==========

    // GET: Chain instances for a department
    fastify.get('/api/chain-tasks/dept/:deptId', { preHandler: [authenticate] }, async (request, reply) => {
        const { deptId } = request.params;

        const instances = await db.all(`
            SELECT ci.*, u.full_name as creator_name,
                   (SELECT COUNT(*) FROM chain_task_instance_items WHERE chain_instance_id = ci.id) as total_items,
                   (SELECT COUNT(*) FROM chain_task_instance_items cii_done
                    WHERE cii_done.chain_instance_id = ci.id
                    AND (cii_done.status = 'completed' OR (SELECT COUNT(*) FROM chain_task_completions WHERE chain_item_id = cii_done.id AND status = 'approved') >= COALESCE(cii_done.min_quantity, 1))
                   ) as completed_items
            FROM chain_task_instances ci
            LEFT JOIN users u ON u.id = ci.created_by
            WHERE ci.department_id = $1 AND ci.status != 'cancelled'
            ORDER BY ci.created_at DESC
        `, [deptId]);

        return instances;
    });

    // GET: Chain task items for calendar view (by user + week)
    fastify.get('/api/chain-tasks/calendar', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = parseInt(request.query.user_id) || request.user.id;
        const weekStart = request.query.week_start; // YYYY-MM-DD (Monday)
        if (!weekStart) return reply.code(400).send({ error: 'week_start required' });

        // Calculate week end (Sunday)
        const startD = new Date(weekStart);
        const endD = new Date(startD);
        endD.setDate(endD.getDate() + 6);
        const weekEnd = endD.toISOString().split('T')[0];

        // Get all chain items assigned to this user with deadline in this week range
        const items = await db.all(`
            SELECT cii.*, cii.deadline::text as deadline, ci.chain_name, ci.execution_mode, ci.status as chain_status,
                   ci.department_id, ci.id as chain_instance_id,
                   (SELECT COUNT(*) FROM chain_task_instance_items WHERE chain_instance_id = ci.id) as total_items,
                   (SELECT COUNT(*) FROM chain_task_instance_items cii_done
                    WHERE cii_done.chain_instance_id = ci.id
                    AND (cii_done.status = 'completed' OR (SELECT COUNT(*) FROM chain_task_completions WHERE chain_item_id = cii_done.id AND status = 'approved') >= COALESCE(cii_done.min_quantity, 1))
                   ) as completed_items,
                   (SELECT COUNT(*) FROM chain_task_completions WHERE chain_item_id = cii.id AND status = 'approved') as approved_count,
                   (SELECT json_agg(json_build_object('id', cc2.id, 'user_id', cc2.user_id, 'status', cc2.status, 'content', cc2.content))
                    FROM chain_task_completions cc2 WHERE cc2.chain_item_id = cii.id AND cc2.user_id = $1) as my_completions
            FROM chain_task_instance_items cii
            JOIN chain_task_instances ci ON ci.id = cii.chain_instance_id
            JOIN chain_task_assignments ca ON ca.chain_item_id = cii.id AND ca.user_id = $1
            WHERE ci.status != 'cancelled'
              AND cii.deadline >= $2::date AND cii.deadline <= $3::date
            ORDER BY cii.deadline, cii.item_order
        `, [userId, weekStart, weekEnd]);

        return { items };
    });

    // GET: Single instance with all detail
    fastify.get('/api/chain-tasks/instances/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const { id } = request.params;
        
        const instance = await db.get(`
            SELECT ci.*, ci.start_date::text as start_date, ci.end_date::text as end_date,
                   u.full_name as creator_name, ct.description as chain_description
            FROM chain_task_instances ci
            LEFT JOIN users u ON u.id = ci.created_by
            LEFT JOIN chain_task_templates ct ON ct.id = ci.chain_template_id
            WHERE ci.id = $1
        `, [id]);
        if (!instance) return reply.code(404).send({ error: 'Instance not found' });

        const items = await db.all(`
            SELECT cii.*, cii.deadline::text as deadline,
                   (SELECT json_agg(json_build_object('user_id', ca.user_id, 'full_name', u2.full_name))
                    FROM chain_task_assignments ca
                    JOIN users u2 ON u2.id = ca.user_id
                    WHERE ca.chain_item_id = cii.id) as assigned_users,
                   (SELECT json_agg(json_build_object(
                        'id', cc.id, 'user_id', cc.user_id, 'proof_url', cc.proof_url,
                        'content', cc.content, 'quantity_done', cc.quantity_done,
                        'status', cc.status, 'reviewed_by', cc.reviewed_by,
                        'reject_reason', cc.reject_reason, 'redo_count', cc.redo_count,
                        'created_at', cc.created_at, 'reviewer_name', u3.full_name,
                        'reporter_name', u4.full_name, 'reporter_role', u4.role))
                    FROM chain_task_completions cc
                    LEFT JOIN users u3 ON u3.id = cc.reviewed_by
                    LEFT JOIN users u4 ON u4.id = cc.user_id
                    WHERE cc.chain_item_id = cii.id) as completions
            FROM chain_task_instance_items cii
            WHERE cii.chain_instance_id = $1
            ORDER BY cii.item_order
        `, [id]);

        return { ...instance, items };
    });

    // ========== REPORT / APPROVE / REJECT ==========

    // POST: Submit report for a chain task item
    fastify.post('/api/chain-tasks/items/:id/report', { preHandler: [authenticate] }, async (request, reply) => {
        const itemId = request.params.id;
        const userId = request.user.id;

        const item = await db.get('SELECT * FROM chain_task_instance_items WHERE id = $1', [itemId]);
        if (!item) return reply.code(404).send({ error: 'Task con không tồn tại' });

        // Check if user is assigned
        const assigned = await db.get(
            'SELECT * FROM chain_task_assignments WHERE chain_item_id = $1 AND user_id = $2',
            [itemId, userId]
        );
        if (!assigned && !isManager(request.user.role)) {
            return reply.code(403).send({ error: 'Bạn không được gán cho task này' });
        }

        // Check status
        if (item.status === 'completed') {
            return reply.code(400).send({ error: 'Task con đã hoàn thành' });
        }
        if (item.status === 'pending') {
            // Allow early submission even in sequential mode
            // Items stay pending visually but employees can submit reports early
        }

        // Handle multipart for proof upload
        let proofUrl = '';
        let content = '';
        let quantityDone = 0;

        const ct = request.headers['content-type'] || '';
        if (ct.includes('multipart')) {
            const parts = request.parts();
            for await (const part of parts) {
                if (part.file) {
                    const uploadDir = path.join(__dirname, '..', 'uploads', 'chain-tasks');
                    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
                    const filename = `${Date.now()}_${part.filename}`;
                    const filepath = path.join(uploadDir, filename);
                    const writeStream = fs.createWriteStream(filepath);
                    await part.file.pipe(writeStream);
                    await new Promise((resolve, reject) => {
                        writeStream.on('finish', resolve);
                        writeStream.on('error', reject);
                    });
                    proofUrl = `/uploads/chain-tasks/${filename}`;
                } else {
                    if (part.fieldname === 'content') content = part.value;
                    if (part.fieldname === 'quantity_done') quantityDone = parseInt(part.value) || 0;
                    if (part.fieldname === 'proof_url' && !proofUrl) proofUrl = part.value || '';
                }
            }
        } else {
            const body = request.body || {};
            content = body.content || '';
            proofUrl = body.proof_url || '';
            quantityDone = parseInt(body.quantity_done) || 0;
        }

        // Count existing completions for redo_count
        const existing = await db.get(
            'SELECT MAX(redo_count) as max_redo FROM chain_task_completions WHERE chain_item_id = $1 AND user_id = $2',
            [itemId, userId]
        );
        const redoCount = existing?.max_redo != null ? existing.max_redo + 1 : 0;

        // Giám đốc auto-approve regardless of requires_approval
        const reporter = await db.get('SELECT role FROM users WHERE id = $1', [userId]);
        const shouldAutoApprove = !item.requires_approval || (reporter && isAutoApproveRole(reporter.role));
        const initialStatus = shouldAutoApprove ? 'approved' : 'pending';

        // Calculate approval deadline if pending
        let approvalDeadline = null;
        if (initialStatus === 'pending') {
            try {
                approvalDeadline = toLocalTimestamp(await calculateRealDeadline(new Date(), null));
            } catch(e2) { /* fallback: no deadline */ }
        }

        const completion = await db.get(
            `INSERT INTO chain_task_completions 
             (chain_item_id, user_id, proof_url, content, quantity_done, status, redo_count, approval_deadline)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [itemId, userId, proofUrl, content, quantityDone, initialStatus, redoCount, approvalDeadline]
        );

        // If auto-approved, mark item as completed
        if (shouldAutoApprove) {
            await _markItemCompleted(itemId);
        }

        return { success: true, completion };
    });

    // POST: Approve completion
    fastify.post('/api/chain-tasks/items/:id/approve', { preHandler: [authenticate] }, async (request, reply) => {
        if (!isManager(request.user.role)) {
            return reply.code(403).send({ error: 'Không có quyền duyệt' });
        }

        const { completion_id } = request.body;
        if (!completion_id) return reply.code(400).send({ error: 'completion_id required' });

        // Check approval hierarchy: get reporter's role
        const comp = await db.get(
            `SELECT cc.*, u.role as reporter_role FROM chain_task_completions cc
             JOIN users u ON u.id = cc.user_id WHERE cc.id = $1`, [completion_id]
        );
        if (!comp) return reply.code(404).send({ error: 'Completion not found' });
        if (!canApproveByRole(request.user.role, comp.reporter_role)) {
            return reply.code(403).send({ error: 'Bạn không đủ cấp bậc để duyệt báo cáo này' });
        }

        await db.run(
            `UPDATE chain_task_completions SET status = 'approved', reviewed_by = $1, reviewed_at = NOW() WHERE id = $2`,
            [request.user.id, completion_id]
        );

        // Get the item and mark completed
        if (comp) {
            await _markItemCompleted(comp.chain_item_id);
        }

        return { success: true };
    });

    // POST: Reject completion
    fastify.post('/api/chain-tasks/items/:id/reject', { preHandler: [authenticate] }, async (request, reply) => {
        if (!isManager(request.user.role)) {
            return reply.code(403).send({ error: 'Không có quyền từ chối' });
        }

        const { completion_id, reject_reason } = request.body;
        if (!completion_id) return reply.code(400).send({ error: 'completion_id required' });

        // Check approval hierarchy
        const comp = await db.get(
            `SELECT cc.*, ci.max_redo_count, u.role as reporter_role FROM chain_task_completions cc
             JOIN chain_task_instance_items ci ON ci.id = cc.chain_item_id
             JOIN users u ON u.id = cc.user_id
             WHERE cc.id = $1`, [completion_id]
        );
        if (!comp) return reply.code(404).send({ error: 'Completion not found' });
        if (!canApproveByRole(request.user.role, comp.reporter_role)) {
            return reply.code(403).send({ error: 'Bạn không đủ cấp bậc để từ chối báo cáo này' });
        }

        const maxRedo = comp.max_redo_count || 3;
        const currentRedo = comp.redo_count || 0;

        if (currentRedo >= maxRedo) {
            // All redo attempts used → expired
            await db.run(
                `UPDATE chain_task_completions SET status = 'expired', reviewed_by = $1, reviewed_at = NOW(), reject_reason = $2 WHERE id = $3`,
                [request.user.id, reject_reason || '', completion_id]
            );
            return { success: true, status: 'expired', message: 'Đã hết lượt làm lại' };
        }

        // Calculate redo deadline: 23:59 next working day
        let redoDeadline = null;
        try {
            const dl = await calculateRealDeadline(new Date(), null);
            redoDeadline = toLocalTimestamp(dl);
        } catch(e2) {}

        await db.run(
            `UPDATE chain_task_completions SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), reject_reason = $2, redo_deadline = $3 WHERE id = $4`,
            [request.user.id, reject_reason || '', redoDeadline, completion_id]
        );

        return { success: true, status: 'rejected', redo_deadline: redoDeadline, redo_remaining: maxRedo - currentRedo };
    });

    // ========== POSTPONE ==========

    // POST: Postpone chain task item(s)
    fastify.post('/api/chain-tasks/postpone', { preHandler: [authenticate] }, async (request, reply) => {
        const userRole = request.user.role;
        if (!isManager(userRole)) {
            return reply.code(403).send({ error: 'Không có quyền lùi lịch' });
        }

        const { chain_instance_id, chain_item_id, new_deadline, reason, cascade, postpone_for_user_id } = request.body;

        if (!chain_instance_id || !new_deadline) {
            return reply.code(400).send({ error: 'instance_id và new_deadline là bắt buộc' });
        }

        const instance = await db.get('SELECT * FROM chain_task_instances WHERE id = $1', [chain_instance_id]);
        if (!instance) return reply.code(404).send({ error: 'Chuỗi không tồn tại' });

        if (chain_item_id) {
            // Postpone single item (optionally cascade)
            const item = await db.get('SELECT * FROM chain_task_instance_items WHERE id = $1', [chain_item_id]);
            if (!item) return reply.code(404).send({ error: 'Task con không tồn tại' });

            const oldDeadline = item.deadline;
            const daysDiff = Math.round((new Date(new_deadline) - new Date(oldDeadline)) / (1000 * 60 * 60 * 24));

            // Log postponement
            await db.run(
                `INSERT INTO chain_task_postponements 
                 (chain_instance_id, chain_item_id, old_deadline, new_deadline, reason, cascade_applied, postponed_by, postponed_for)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                [chain_instance_id, chain_item_id, oldDeadline, new_deadline, reason || '',
                 cascade || false, request.user.id, postpone_for_user_id || null]
            );

            // Update the item deadline
            await db.run('UPDATE chain_task_instance_items SET deadline = $1 WHERE id = $2', [new_deadline, chain_item_id]);

            // Cascade: shift all following items by the same number of days
            if (cascade && daysDiff > 0) {
                const followingItems = await db.all(
                    `SELECT * FROM chain_task_instance_items 
                     WHERE chain_instance_id = $1 AND item_order > $2 ORDER BY item_order`,
                    [chain_instance_id, item.item_order]
                );
                for (const fi of followingItems) {
                    const newD = new Date(fi.deadline);
                    newD.setDate(newD.getDate() + daysDiff);
                    const newDeadlineStr = newD.toISOString().split('T')[0];
                    await db.run('UPDATE chain_task_instance_items SET deadline = $1 WHERE id = $2',
                        [newDeadlineStr, fi.id]);
                    // Log each cascaded postponement
                    await db.run(
                        `INSERT INTO chain_task_postponements 
                         (chain_instance_id, chain_item_id, old_deadline, new_deadline, reason, cascade_applied, postponed_by)
                         VALUES ($1,$2,$3,$4,$5,true,$6)`,
                        [chain_instance_id, fi.id, fi.deadline, newDeadlineStr, `Cascade từ "${item.task_name}"`, request.user.id]
                    );
                }

                // Update instance end_date
                const maxDeadline = await db.get(
                    'SELECT MAX(deadline) as max_d FROM chain_task_instance_items WHERE chain_instance_id = $1',
                    [chain_instance_id]
                );
                if (maxDeadline?.max_d) {
                    await db.run('UPDATE chain_task_instances SET end_date = $1 WHERE id = $2',
                        [maxDeadline.max_d, chain_instance_id]);
                }
            }
        } else {
            // Postpone entire chain: shift all items
            const allItems = await db.all(
                'SELECT * FROM chain_task_instance_items WHERE chain_instance_id = $1 ORDER BY item_order',
                [chain_instance_id]
            );
            const firstDeadline = allItems.length > 0 ? allItems[0].deadline : instance.start_date;
            const daysDiff = Math.round((new Date(new_deadline) - new Date(firstDeadline)) / (1000 * 60 * 60 * 24));

            for (const ai of allItems) {
                const newD = new Date(ai.deadline);
                newD.setDate(newD.getDate() + daysDiff);
                const newDeadlineStr = newD.toISOString().split('T')[0];
                await db.run('UPDATE chain_task_instance_items SET deadline = $1 WHERE id = $2',
                    [newDeadlineStr, ai.id]);
            }

            // Update instance dates
            const newStart = new Date(instance.start_date);
            newStart.setDate(newStart.getDate() + daysDiff);
            const maxDeadline = await db.get(
                'SELECT MAX(deadline) as max_d FROM chain_task_instance_items WHERE chain_instance_id = $1',
                [chain_instance_id]
            );
            await db.run(
                'UPDATE chain_task_instances SET start_date = $1, end_date = $2 WHERE id = $3',
                [newStart.toISOString().split('T')[0], maxDeadline?.max_d || new_deadline, chain_instance_id]
            );

            await db.run(
                `INSERT INTO chain_task_postponements 
                 (chain_instance_id, old_deadline, new_deadline, reason, cascade_applied, postponed_by, postponed_for)
                 VALUES ($1,$2,$3,$4,true,$5,$6)`,
                [chain_instance_id, firstDeadline, new_deadline, reason || '', request.user.id, postpone_for_user_id || null]
            );
        }

        return { success: true };
    });

    // ========== DELETE INSTANCE ==========
    fastify.delete('/api/chain-tasks/instances/:id', { preHandler: [authenticate] }, async (request, reply) => {
        if (!isManager(request.user.role)) {
            return reply.code(403).send({ error: 'Không có quyền xóa' });
        }
        await db.run("UPDATE chain_task_instances SET status = 'cancelled' WHERE id = $1", [request.params.id]);
        return { success: true };
    });

    // ========== HELPER: Mark item completed & auto-unlock next ==========
    async function _markItemCompleted(itemId) {
        const item = await db.get('SELECT * FROM chain_task_instance_items WHERE id = $1', [itemId]);
        if (!item) return;

        // Check if approved completions meet min_quantity
        const approvedCount = await db.get(
            `SELECT COUNT(*) as cnt FROM chain_task_completions 
             WHERE chain_item_id = $1 AND status = 'approved'`, [itemId]
        );
        const minQty = item.min_quantity || 1;

        // If approved reports >= min_quantity → mark as completed
        if (approvedCount.cnt >= minQty) {
            await db.run("UPDATE chain_task_instance_items SET status = 'completed' WHERE id = $1", [itemId]);

            // Auto-unlock next item (sequential mode)
            const instance = await db.get('SELECT * FROM chain_task_instances WHERE id = $1', [item.chain_instance_id]);
            if (instance && instance.execution_mode === 'sequential') {
                const nextItem = await db.get(
                    `SELECT * FROM chain_task_instance_items 
                     WHERE chain_instance_id = $1 AND item_order = $2 AND status = 'pending'`,
                    [item.chain_instance_id, item.item_order + 1]
                );
                if (nextItem) {
                    await db.run("UPDATE chain_task_instance_items SET status = 'in_progress' WHERE id = $1", [nextItem.id]);
                }
            }

            // Check if ALL items completed → mark chain as completed
            const remaining = await db.get(
                `SELECT COUNT(*) as cnt FROM chain_task_instance_items 
                 WHERE chain_instance_id = $1 AND status != 'completed'`,
                [item.chain_instance_id]
            );
            if (remaining.cnt === 0) {
                await db.run("UPDATE chain_task_instances SET status = 'completed' WHERE id = $1", [item.chain_instance_id]);
            }
        }
    }

    // ========== PENDING REVIEWS (for approval panel) ==========
    fastify.get('/api/chain-tasks/pending-reviews', { preHandler: [authenticate] }, async (request, reply) => {
        if (!isManager(request.user.role)) {
            return reply.code(403).send({ error: 'Không có quyền' });
        }

        const reviews = await db.all(`
            SELECT cc.id, cc.chain_item_id, cc.user_id, cc.proof_url, cc.content, cc.quantity_done,
                   cc.status, cc.created_at, cc.redo_count, cc.approval_deadline,
                   ci.task_name, ci.deadline, ci.min_quantity,
                   cti.chain_name as chain_name,
                   u.full_name as user_name, u.username
            FROM chain_task_completions cc
            JOIN chain_task_instance_items ci ON ci.id = cc.chain_item_id
            JOIN chain_task_instances cins ON cins.id = ci.chain_instance_id
            JOIN chain_task_templates cti ON cti.id = cins.chain_template_id
            JOIN users u ON u.id = cc.user_id
            WHERE cc.status = 'pending'
            ORDER BY cc.created_at ASC
        `);

        return { reviews };
    });
}

module.exports = chainTaskRoutes;
