// ========== DAILY REPORT — Tổng Kết Hàng Ngày Tập Trung ==========
const db = require('../db/pool');

module.exports = async function (fastify) {
    const jwt = require('jsonwebtoken');

    function authGD(request, reply) {
        const token = request.cookies?.token;
        if (!token) { reply.code(401).send({ error: 'Chưa đăng nhập' }); return null; }
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { reply.code(401).send({ error: 'Token không hợp lệ' }); return null; }
        if (user.role !== 'giam_doc') { reply.code(403).send({ error: 'Chỉ Giám Đốc' }); return null; }
        return user;
    }

    // ========== CONFIG: Get ==========
    fastify.get('/api/daily-report/config', async (request, reply) => {
        const user = authGD(request, reply); if (!user) return;
        const row = await db.get("SELECT value FROM app_config WHERE key = 'daily_report_config'");
        let config = { group_id: '', time: '21:00', modules: ['payment_thu', 'cashflow_chi'] };
        if (row?.value) {
            try { config = JSON.parse(row.value); } catch (e) {}
        }
        return { config };
    });

    // ========== CONFIG: Save ==========
    fastify.put('/api/daily-report/config', async (request, reply) => {
        const user = authGD(request, reply); if (!user) return;
        const { group_id, time, modules } = request.body || {};
        const config = {
            group_id: (group_id || '').trim(),
            time: (time || '21:00').trim(),
            modules: Array.isArray(modules) ? modules : ['payment_thu', 'cashflow_chi']
        };
        await db.run(
            `INSERT INTO app_config (key, value, updated_at) VALUES ('daily_report_config', $1, NOW())
             ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()`,
            [JSON.stringify(config)]
        );
        return { success: true };
    });

    // ========== Generate combined message ==========
    async function _buildReport(dateStr, enabledModules) {
        const { vnNow } = require('../utils/timezone');
        const now = vnNow();
        const targetDate = dateStr || now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
        const parts = targetDate.split('-');
        const dateLabel = parts[2] + '/' + parts[1] + '/' + parts[0];
        const fmtVN = (n) => Number(n).toLocaleString('vi-VN') + 'đ';

        let lines = [];
        lines.push(`📊 <b>TỔNG KẾT NGÀY ${dateLabel}</b>`);
        lines.push('━━━━━━━━━━━━━━━━━');

        let grandThu = 0, grandChi = 0;
        let lineNum = 0;

        // Module: Sổ Ghi Nhận Tiền (THU)
        if (enabledModules.includes('payment_thu')) {
            const rows = await db.all(`
                SELECT payment_method, COALESCE(SUM(amount), 0)::numeric AS total
                FROM payment_records
                WHERE payment_date = $1
                  AND COALESCE(source, '') != 'cashflow_chi'
                  AND payment_type != 'chi'
                GROUP BY payment_method
            `, [targetDate]);

            let totalCK = 0, totalTM = 0;
            for (const r of rows) {
                if (r.payment_method === 'CK') totalCK = Number(r.total);
                else if (r.payment_method === 'TM') totalTM = Number(r.total);
            }
            const totalThu = totalCK + totalTM;
            grandThu = totalThu;
            lineNum++;
            lines.push(`<b>${lineNum}</b> - 💰 <b>TỔNG THU:</b> ${fmtVN(totalCK)} CK + ${fmtVN(totalTM)} TM = <b>${fmtVN(totalThu)}</b>`);
            lines.push('');
        }

        // Module: Sổ Thu Chi (CHI)
        if (enabledModules.includes('cashflow_chi')) {
            const rows = await db.all(`
                SELECT money_source, COALESCE(SUM(amount), 0)::numeric AS total
                FROM cashflow_records
                WHERE cashflow_date = $1 AND cashflow_type = 'CHI'
                GROUP BY money_source
            `, [targetDate]);

            let totalCongTy = 0, totalCPMay = 0;
            for (const r of rows) {
                if (r.money_source === 'cophanmay') totalCPMay = Number(r.total);
                else totalCongTy = Number(r.total);
            }
            const totalChi = totalCongTy + totalCPMay;
            grandChi = totalChi;
            lineNum++;
            lines.push(`<b>${lineNum}</b> - 💸 <b>TỔNG CHI:</b> ${fmtVN(totalCongTy)} CT + ${fmtVN(totalCPMay)} CPM = <b>${fmtVN(totalChi)}</b>`);
            lines.push('');
        }

        return { message: lines.join('\n'), grandThu, grandChi };
    }

    // ========== SEND: Manual ==========
    fastify.post('/api/daily-report/send', async (request, reply) => {
        const user = authGD(request, reply); if (!user) return;

        const bodyGroupId = (request.body?.group_id || '').trim();
        const bodyModules = request.body?.modules;

        let groupId = bodyGroupId;
        let modules = bodyModules;

        if (!groupId || !modules) {
            const row = await db.get("SELECT value FROM app_config WHERE key = 'daily_report_config'");
            if (row?.value) {
                try {
                    const cfg = JSON.parse(row.value);
                    if (!groupId) groupId = cfg.group_id;
                    if (!modules) modules = cfg.modules;
                } catch (e) {}
            }
        }
        if (!groupId) return reply.code(400).send({ error: 'Chưa cài đặt Group ID Telegram' });
        if (!modules || !modules.length) return reply.code(400).send({ error: 'Chưa chọn module nào' });

        const report = await _buildReport(null, modules);
        const { sendTelegramMessage } = require('../utils/telegram');
        const ok = await sendTelegramMessage(groupId, report.message);
        if (ok) return { success: true, message: report.message };
        return reply.code(400).send({ error: 'Gửi thất bại! Kiểm tra Bot Token và Group ID.' });
    });

    // Export for cron
    fastify.decorate('_drBuildReport', _buildReport);
};
