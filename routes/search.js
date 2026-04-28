const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { maskCustomerData } = require('../utils/dataMasking');

async function searchRoutes(fastify, options) {

    // GET /api/search/customers — Unified customer search across all modules
    fastify.get('/api/search/customers', { preHandler: [authenticate] }, async (request, reply) => {
        const q = (request.query.q || '').trim();
        if (!q || q.length < 2) return { crm: [], telesale: [], orders: [], addcmt: [] };

        const userId = request.user.id;
        const role = request.user.role;
        const isFullAccess = ['giam_doc', 'quan_ly_cap_cao'].includes(role);

        const searchPattern = `%${q}%`;

        // ========== 1. CRM (customers table) ==========
        let crmQuery = `
            SELECT c.id, c.crm_type, c.customer_name, c.phone, c.phone2, c.facebook_link,
                   c.order_status, c.created_at, c.address, c.province, c.cong_viec,
                   c.appointment_date,
                   u.full_name as created_by_name, u.username as created_by_username,
                   asgn.full_name as assigned_to_name,
                   (SELECT COUNT(*) FROM consultation_logs cl WHERE cl.customer_id = c.id) as consult_count,
                   (SELECT COUNT(*) FROM order_codes oc WHERE oc.customer_id = c.id) as order_count
            FROM customers c
            LEFT JOIN users u ON u.id = c.created_by
            LEFT JOIN users asgn ON asgn.id = c.assigned_to_id
            WHERE (c.customer_name ILIKE $1 OR c.phone ILIKE $1 OR c.phone2 ILIKE $1 OR c.facebook_link ILIKE $1 OR c.address ILIKE $1)
        `;
        let crmParams = [searchPattern];
        if (!isFullAccess) {
            crmQuery += ` AND (c.created_by = $2 OR c.assigned_to_id = $2 OR c.receiver_id = $2)`;
            crmParams.push(userId);
        }
        crmQuery += ` ORDER BY c.created_at DESC LIMIT 50`;
        const crm = await db.all(crmQuery, crmParams);

        // Mask sensitive data for QL/TP viewing subordinate customers
        if (['quan_ly', 'truong_phong'].includes(role)) {
            for (const c of crm) {
                if (c.assigned_to_id !== userId) {
                    maskCustomerData(c);
                }
            }
        }

        // ========== 2. Telesale ==========
        let telQuery = `
            SELECT td.id, td.customer_name, td.company_name, td.phone, td.fb_link, td.address,
                   td.status, td.created_at,
                   u.full_name as assigned_to_name
            FROM telesale_data td
            LEFT JOIN users u ON u.id = td.last_assigned_user_id
            WHERE (td.customer_name ILIKE $1 OR td.phone ILIKE $1 OR td.company_name ILIKE $1 OR td.fb_link ILIKE $1)
        `;
        let telParams = [searchPattern];
        if (!isFullAccess) {
            telQuery += ` AND (td.last_assigned_user_id = $2 OR td.self_searched_by = $2)`;
            telParams.push(userId);
        }
        telQuery += ` ORDER BY td.created_at DESC LIMIT 50`;
        const telesale = await db.all(telQuery, telParams);

        // ========== 3. Order Codes ==========
        let ordQuery = `
            SELECT oc.id, oc.customer_id, oc.order_code, oc.status, oc.deposit_amount, oc.created_at,
                   c.customer_name, c.phone, c.crm_type,
                   u.full_name as user_name
            FROM order_codes oc
            LEFT JOIN customers c ON c.id = oc.customer_id
            LEFT JOIN users u ON u.id = oc.user_id
            WHERE (oc.order_code ILIKE $1 OR c.customer_name ILIKE $1 OR c.phone ILIKE $1)
        `;
        let ordParams = [searchPattern];
        if (!isFullAccess) {
            ordQuery += ` AND oc.user_id = $2`;
            ordParams.push(userId);
        }
        ordQuery += ` ORDER BY oc.created_at DESC LIMIT 50`;
        const orders = await db.all(ordQuery, ordParams);

        // Mask phone in order results for QL/TP
        if (['quan_ly', 'truong_phong'].includes(role)) {
            for (const o of orders) {
                if (o.user_id !== userId) {
                    maskCustomerData(o);
                }
            }
        }

        // ========== 4. Add/Cmt Entries ==========
        let addQuery = `
            SELECT ae.id, ae.fb_link, ae.entry_date, ae.image_path,
                   u.full_name as user_name
            FROM addcmt_entries ae
            LEFT JOIN users u ON u.id = ae.user_id
            WHERE ae.fb_link ILIKE $1
        `;
        let addParams = [searchPattern];
        if (!isFullAccess) {
            addQuery += ` AND ae.user_id = $2`;
            addParams.push(userId);
        }
        addQuery += ` ORDER BY ae.created_at DESC LIMIT 50`;
        const addcmt = await db.all(addQuery, addParams);

        return { crm, telesale, orders, addcmt };
    });
}

module.exports = searchRoutes;
