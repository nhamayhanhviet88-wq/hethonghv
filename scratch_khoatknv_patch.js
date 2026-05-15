// Precise patch for khoatknv.js - replace my-pending and team-today with ledger versions
const fs = require('fs');
let content = fs.readFileSync('routes/khoatknv.js', 'utf8').replace(/\r\n/g, '\n');

// ===== REPLACEMENT 1: my-pending =====
const myPendingOldStart = '    // GET: Check pending penalties for login popup\n    fastify.get(\'/api/penalty/my-pending\'';
const myPendingOldEnd = '        return { pending, total, penaltyDate: yesterdayStr };\n    });\n';
const myPendingAnchorAfter = '\n    // POST: Acknowledge penalties';

const myPendingIdx = content.indexOf(myPendingOldStart);
const myPendingEndIdx = content.indexOf(myPendingAnchorAfter, myPendingIdx);
if (myPendingIdx === -1 || myPendingEndIdx === -1) { console.error('Cannot find my-pending boundaries'); process.exit(1); }

const myPendingNew = `    // GET: Check pending penalties for login popup — reads from ledger
    fastify.get('/api/penalty/my-pending', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const { vnNow, vnDateStr } = require('../utils/timezone');
        const todayStr = vnDateStr(vnNow());

        const testAccountIds = await getTestAccountIds();
        if (testAccountIds.map(Number).includes(Number(userId)))
            return { pending: [], total: 0 };

        const userCheck = await db.get('SELECT penalty_popup_date FROM users WHERE id = $1', [userId]);
        if (userCheck && userCheck.penalty_popup_date === todayStr)
            return { pending: [], total: 0, shownToday: true };

        const vnYesterday = vnNow(); vnYesterday.setDate(vnYesterday.getDate() - 1);
        const yesterdayStr = vnDateStr(vnYesterday);

        // Sync + read from ledger
        try { const { syncLedgerForDate } = require('../utils/penaltyLedger'); await syncLedgerForDate(yesterdayStr); } catch(e) {}
        const { getLedgerForUser } = require('../utils/penaltyLedger');
        const rows = await getLedgerForUser(userId, yesterdayStr);

        const pending = rows.map(r => ({
            task_name: r.task_name, task_date: r.penalty_date,
            penalty_amount: r.penalty_amount, penalty_reason: r.penalty_reason
        }));
        const total = pending.reduce((s, p) => s + (p.penalty_amount || 0), 0);
        return { pending, total, penaltyDate: yesterdayStr };
    });
`;

let result = content.substring(0, myPendingIdx) + myPendingNew + content.substring(myPendingEndIdx);

// ===== REPLACEMENT 2: team-today =====
const teamTodayOldStart = '    // GET: Today\'s penalties for manager popup';
const teamTodayAnchorAfter = '\n    // POST: Mark manager popup as shown today';

const teamTodayIdx = result.indexOf(teamTodayOldStart);
const teamTodayEndIdx = result.indexOf(teamTodayAnchorAfter, teamTodayIdx);
if (teamTodayIdx === -1 || teamTodayEndIdx === -1) { console.error('Cannot find team-today boundaries'); process.exit(1); }

const teamTodayNew = `    // GET: Today's penalties for manager popup — reads from ledger (single source of truth)
    fastify.get('/api/penalty/team-today', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const userRole = request.user.role;
        const { vnNow, vnDateStr } = require('../utils/timezone');
        const todayStr = vnDateStr(vnNow());

        if (!['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(userRole))
            return { penalties: [], total: 0 };

        const userCheck = await db.get('SELECT penalty_mgr_popup_date, department_id FROM users WHERE id = $1', [userId]);
        if (userCheck && userCheck.penalty_mgr_popup_date === todayStr)
            return { penalties: [], total: 0, shownToday: true };

        let scopeDeptIds = [];
        if (userRole === 'giam_doc') {
            scopeDeptIds = (await db.all('SELECT id FROM departments')).map(d => d.id);
        } else {
            const myDeptId = userCheck?.department_id;
            if (!myDeptId) return { penalties: [], total: 0 };
            async function getChildIds(pid) {
                let ids = [pid];
                for (const c of await db.all('SELECT id FROM departments WHERE parent_id = $1', [pid]))
                    ids.push(...await getChildIds(c.id));
                return ids;
            }
            scopeDeptIds = await getChildIds(myDeptId);
        }
        if (!scopeDeptIds.length) return { penalties: [], total: 0 };

        const vnYesterday = vnNow(); vnYesterday.setDate(vnYesterday.getDate() - 1);
        const yesterdayStr = vnDateStr(vnYesterday);

        // Sync + read from ledger
        try { const { syncLedgerForDate } = require('../utils/penaltyLedger'); await syncLedgerForDate(yesterdayStr); } catch(e) {}
        const { getLedgerForDate } = require('../utils/penaltyLedger');
        const rows = await getLedgerForDate(yesterdayStr, userId, scopeDeptIds);

        const testAccountIds = await getTestAccountIds();
        const testSet = new Set(testAccountIds.map(Number));
        const allPenalties = rows.filter(p => !testSet.has(Number(p.user_id))).map(p => ({
            penalized_user_id: p.user_id, penalized_name: p.full_name, penalized_username: p.username,
            penalized_dept_id: p.department_id, penalized_role: p.role,
            task_name: p.task_name, task_date: p.penalty_date,
            penalty_amount: p.penalty_amount || 0, reason: p.penalty_reason || '', source: p.source_type
        }));

        const total = allPenalties.reduce((s, p) => s + (p.penalty_amount || 0), 0);
        let departments = [];
        if (allPenalties.length > 0) departments = await db.all('SELECT id, name, parent_id FROM departments');
        return { penalties: allPenalties, total, departments, penaltyDate: yesterdayStr };
    });
`;

result = result.substring(0, teamTodayIdx) + teamTodayNew + result.substring(teamTodayEndIdx);

// ===== REPLACEMENT 3: Fix timezone in acknowledge-self =====
result = result.replace(
    "    fastify.post('/api/penalty/acknowledge-self', { preHandler: [authenticate] }, async (request, reply) => {\n        const userId = request.user.id;\n        const todayStr = new Date().toISOString().split('T')[0];",
    "    fastify.post('/api/penalty/acknowledge-self', { preHandler: [authenticate] }, async (request, reply) => {\n        const userId = request.user.id;\n        const { vnNow, vnDateStr } = require('../utils/timezone');\n        const todayStr = vnDateStr(vnNow());"
);

// ===== REPLACEMENT 4: Fix timezone in team-today/acknowledge =====
result = result.replace(
    "    fastify.post('/api/penalty/team-today/acknowledge', { preHandler: [authenticate] }, async (request, reply) => {\n        const userId = request.user.id;\n        const todayStr = new Date().toISOString().split('T')[0];",
    "    fastify.post('/api/penalty/team-today/acknowledge', { preHandler: [authenticate] }, async (request, reply) => {\n        const userId = request.user.id;\n        const { vnNow, vnDateStr } = require('../utils/timezone');\n        const todayStr = vnDateStr(vnNow());"
);

fs.writeFileSync('routes/khoatknv.js', result, 'utf8');
console.log('Done! Lines:', result.split('\n').length);
// Verify syntax
try { new (require('vm').Script)(result); console.log('Syntax OK'); } catch(e) { console.error('Syntax error:', e.message); }
