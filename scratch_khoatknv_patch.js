// Patch: Replace /api/penalty/list with ledger-based version
const fs = require('fs');
let content = fs.readFileSync('routes/khoatknv.js', 'utf8').replace(/\r\n/g, '\n');

const listOldStart = '    // GET: Thống kê phạt theo tháng\n    fastify.get(\'/api/penalty/list\'';
const listAnchorAfter = '\n    // GET: Phiếu phạt cho NV cụ thể';

const listIdx = content.indexOf(listOldStart);
const listEndIdx = content.indexOf(listAnchorAfter, listIdx);
if (listIdx === -1 || listEndIdx === -1) { console.error('Cannot find list boundaries', listIdx, listEndIdx); process.exit(1); }

const listNew = `    // GET: Thống kê phạt theo tháng — reads from ledger (single source of truth)
    fastify.get('/api/penalty/list', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const userRole = request.user.role;
        let monthStart, monthEnd;
        if (request.query.dateFrom) {
            monthStart = request.query.dateFrom;
            monthEnd = request.query.dateTo || request.query.dateFrom;
        } else if (request.query.monthFrom) {
            const mFrom = request.query.monthFrom;
            const mTo = request.query.monthTo || mFrom;
            monthStart = \`\${mFrom}-01\`;
            const [yTo, mToNum] = mTo.split('-').map(Number);
            const lastDay = new Date(yTo, mToNum, 0).getDate();
            monthEnd = \`\${mTo}-\${String(lastDay).padStart(2, '0')}\`;
        } else {
            const month = request.query.month;
            if (!month) return reply.code(400).send({ error: 'Thiếu tham số lọc ngày' });
            monthStart = \`\${month}-01\`;
            const [y, m] = month.split('-').map(Number);
            const lastDay = new Date(y, m, 0).getDate();
            monthEnd = \`\${month}-\${String(lastDay).padStart(2, '0')}\`;
        }

        // Cap tối đa = ngày hôm qua (VN)
        const { vnNow, vnDateStr } = require('../utils/timezone');
        const vnYesterday = vnNow(); vnYesterday.setDate(vnYesterday.getDate() - 1);
        const maxDate = vnDateStr(vnYesterday);
        if (monthEnd > maxDate) monthEnd = maxDate;
        if (monthStart > maxDate) monthStart = maxDate;

        // Sync ledger for today
        try { const { syncLedgerForDate } = require('../utils/penaltyLedger'); await syncLedgerForDate(vnDateStr(vnNow())); } catch(e) {}

        // Build department scope
        let scopeFilter = '';
        let params = [monthStart, monthEnd];

        if (userRole === 'giam_doc') {
            scopeFilter = '';
        } else if (['quan_ly', 'truong_phong', 'quan_ly_cap_cao'].includes(userRole)) {
            const user = await db.get('SELECT department_id FROM users WHERE id = $1', [userId]);
            if (!user || !user.department_id) return { penalties: [], total: 0 };
            async function getChildIds(pid) {
                let ids = [pid];
                for (const c of await db.all('SELECT id FROM departments WHERE parent_id = $1', [pid]))
                    ids.push(...await getChildIds(c.id));
                return ids;
            }
            const deptIds = await getChildIds(user.department_id);
            const ph = deptIds.map((_, i) => \`$\${i + 3}\`).join(',');
            scopeFilter = \` AND u.department_id IN (\${ph})\`;
            params.push(...deptIds);
        } else {
            scopeFilter = ' AND dpl.user_id = $3';
            params.push(userId);
        }

        // Read from ledger — single query replaces 5 source queries
        const rows = await db.all(
            \`SELECT dpl.*, u.full_name, u.username, u.department_id, u.role, d.name as dept_name
             FROM daily_penalty_ledger dpl
             JOIN users u ON u.id = dpl.user_id
             LEFT JOIN departments d ON u.department_id = d.id
             WHERE dpl.penalty_date BETWEEN $1::date AND $2::date AND u.role != 'giam_doc'\${scopeFilter}
             ORDER BY dpl.penalty_date DESC, u.full_name\`,
            params
        );

        const sourceMap = {
            'cv_khoa': 'khoa', 'ql_khoa': 'khoa', 'ql_khoa_chong': 'khoa',
            'cv_chuoi': 'chuoi', 'ql_chuoi': 'chuoi', 'ql_chuoi_chong': 'chuoi',
            'ho_tro_nv': 'support', 'ho_tro_chong': 'support',
            'cv_diem': 'diem', 'cap_cuu': 'emergency',
            'kh_chua_xl': 'customer_unhandled', 'kh_tre': 'customer_overdue'
        };

        const testAccountIds = await getTestAccountIds();
        const testSet = new Set(testAccountIds.map(Number));

        const allPenalties = rows.filter(p => !testSet.has(Number(p.user_id))).map(p => ({
            penalized_user_id: p.user_id, penalized_name: p.full_name, penalized_username: p.username,
            penalized_dept_id: p.department_id, penalized_role: p.role,
            manager_id: p.user_id, manager_name: p.full_name, manager_username: p.username,
            task_name: p.task_name, task_date: p.penalty_date,
            penalty_amount: p.penalty_amount || 0,
            penalty_reason: p.penalty_reason || '',
            source_type: sourceMap[p.source_type] || p.source_type,
            dept_name: p.dept_name || ''
        }));

        const total = allPenalties.reduce((s, p) => s + (p.penalty_amount || 0), 0);
        return { penalties: allPenalties, total };
    });
`;

const result = content.substring(0, listIdx) + listNew + content.substring(listEndIdx);
fs.writeFileSync('routes/khoatknv.js', result, 'utf8');
console.log('Done! Lines:', result.split('\n').length);
try { new (require('vm').Script)(result); console.log('Syntax OK'); } catch(e) { console.error('Syntax error:', e.message); }
