// Patch: Add penalty slip ledger replacement to khoatknv.js
const fs = require('fs');
let content = fs.readFileSync('routes/khoatknv.js', 'utf8').replace(/\r\n/g, '\n');

const slipOldStart = '    // GET: Phiếu phạt cho NV cụ thể\n    fastify.get(\'/api/penalty/slip/';
const slipAnchorAfter = '\n    // GET: Check pending penalties';

const slipIdx = content.indexOf(slipOldStart);
const slipEndIdx = content.indexOf(slipAnchorAfter, slipIdx);
if (slipIdx === -1 || slipEndIdx === -1) { console.error('Cannot find slip boundaries', slipIdx, slipEndIdx); process.exit(1); }

const slipNew = `    // GET: Phiếu phạt cho NV cụ thể — reads from ledger (single source of truth)
    fastify.get('/api/penalty/slip/:managerId/:month', { preHandler: [authenticate] }, async (request, reply) => {
        const managerId = Number(request.params.managerId);
        const month = request.params.month;
        const monthStart = \`\${month}-01\`;
        const [y, m] = month.split('-').map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        const monthEnd = \`\${month}-\${String(lastDay).padStart(2, '0')}\`;
        const manager = await db.get('SELECT full_name, username, department_id FROM users WHERE id = $1', [managerId]);
        if (!manager) return reply.code(404).send({ error: 'Không tìm thấy nhân viên' });
        const dept = await db.get('SELECT name FROM departments WHERE id = $1', [manager.department_id]);

        // Sync ledger for today (ensure up-to-date)
        try { const { syncLedgerForDate } = require('../utils/penaltyLedger'); const { vnNow, vnDateStr } = require('../utils/timezone'); await syncLedgerForDate(vnDateStr(vnNow())); } catch(e) {}

        // Read from ledger — single query replaces 5 source queries
        const { getLedgerForUserRange } = require('../utils/penaltyLedger');
        const rows = await getLedgerForUserRange(managerId, monthStart, monthEnd);

        const sourceMap = {
            'cv_khoa': 'khoa', 'ql_khoa': 'khoa', 'ql_khoa_chong': 'khoa',
            'cv_chuoi': 'chuoi', 'ql_chuoi': 'chuoi', 'ql_chuoi_chong': 'chuoi',
            'ho_tro_nv': 'support', 'ho_tro_chong': 'support',
            'cv_diem': 'diem', 'cap_cuu': 'emergency',
            'kh_chua_xl': 'customer_unhandled', 'kh_tre': 'customer_overdue'
        };
        const items = rows.map(r => ({
            task_name: r.task_name, task_date: r.penalty_date,
            penalty_amount: r.penalty_amount, penalty_reason: r.penalty_reason || '',
            source_type: sourceMap[r.source_type] || r.source_type
        }));
        const total = items.reduce((s, i) => s + (i.penalty_amount || 0), 0);
        return {
            manager: { id: managerId, name: manager.full_name, username: manager.username, dept: dept?.name || '' },
            month, items, total
        };
    });
`;

const result = content.substring(0, slipIdx) + slipNew + content.substring(slipEndIdx);
fs.writeFileSync('routes/khoatknv.js', result, 'utf8');
console.log('Done! Lines:', result.split('\n').length);
try { new (require('vm').Script)(result); console.log('Syntax OK'); } catch(e) { console.error('Syntax error:', e.message); }
