// ===== CAM KẾT CUỘC HỌP — Trang riêng /camketcuochop =====

async function renderCamketcuochopPage(content) {
    var container = content || document.getElementById('main-content');
    if (!container) return;

    var now = new Date();
    var curMonth = now.getMonth() + 1;
    var curYear = now.getFullYear();
    var isGD = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';

    container.innerHTML = '<style>'
        + '.ckch-wrap{max-width:1100px;margin:0 auto;padding:20px}'
        + '.ckch-header{background:linear-gradient(135deg,#1e293b 0%,#334155 50%,#1e293b 100%);border-radius:20px;padding:32px 36px;margin-bottom:24px;color:#fff;box-shadow:0 10px 40px rgba(0,0,0,.2)}'
        + '.ckch-title{font-size:26px;font-weight:900;background:linear-gradient(90deg,#fbbf24,#f59e0b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0 0 6px 0}'
        + '.ckch-sub{font-size:13px;color:#94a3b8}'
        + '.ckch-filters{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:16px}'
        + '.ckch-select{padding:8px 14px;border-radius:10px;border:2px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:#fff;font-size:13px;font-weight:600;cursor:pointer;outline:none}'
        + '.ckch-select option{color:#1e293b;background:#fff}'
        + '.ckch-card{background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.06);margin-bottom:20px;transition:all .3s}'
        + '.ckch-card:hover{box-shadow:0 8px 30px rgba(0,0,0,.1)}'
        + '.ckch-card-head{padding:18px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f1f5f9;cursor:pointer}'
        + '.ckch-card-title{font-size:15px;font-weight:800;color:#1e293b;display:flex;align-items:center;gap:10px}'
        + '.ckch-card-date{font-size:12px;color:#6b7280;font-weight:500}'
        + '.ckch-card-stats{display:flex;gap:8px}'
        + '.ckch-stat-pill{padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700}'
        + '.ckch-card-body{padding:0 24px 20px}'
        + '.ckch-emp-group{margin-top:16px}'
        + '.ckch-emp-header{font-size:14px;font-weight:700;color:#334155;padding:8px 0;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:8px}'
        + '.ckch-commit{padding:12px 16px;margin:6px 0;border-radius:10px;border-left:4px solid #e5e7eb;background:#fafbfc;display:flex;gap:12px;align-items:flex-start}'
        + '.ckch-commit-done{border-left-color:#22c55e;background:#f0fdf4}'
        + '.ckch-commit-partial{border-left-color:#f59e0b;background:#fffbeb}'
        + '.ckch-stt{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0}'
        + '.ckch-commit-content{flex:1}'
        + '.ckch-commit-text{font-size:13px;font-weight:600;color:#1e293b}'
        + '.ckch-commit-meta{font-size:11px;color:#6b7280;margin-top:3px}'
        + '.ckch-commit-review{font-size:11px;color:#059669;margin-top:3px;font-style:italic}'
        + '.ckch-pct-bar{height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;margin-top:6px;width:120px}'
        + '.ckch-pct-fill{height:100%;border-radius:3px;transition:width .3s}'
        + '.ckch-empty{padding:60px;text-align:center;color:#6b7280;font-size:14px}'
        + '.ckch-actions{display:flex;gap:8px;margin-left:auto}'
        + '@media(max-width:768px){.ckch-filters{flex-direction:column;align-items:stretch}.ckch-card-head{flex-direction:column;align-items:flex-start;gap:8px}}'
        + '</style>'
        + '<div class="ckch-wrap">'
        + '<div class="ckch-header">'
        + '<div class="ckch-title">📝 Cam Kết Cuộc Họp</div>'
        + '<div class="ckch-sub">Quản lý cam kết & theo dõi thực hiện sau cuộc họp</div>'
        + '<div class="ckch-filters">'
        + '<select class="ckch-select" id="ckchMonth"></select>'
        + '<select class="ckch-select" id="ckchYear"></select>'
        + '<select class="ckch-select" id="ckchUser"><option value="">👤 Tất cả NV</option></select>'
        + '</div>'
        + '</div>'
        + '<div id="ckchContent"><div style="text-align:center;padding:60px;color:#9ca3af">⏳ Đang tải...</div></div>'
        + '</div>';

    // Populate month select
    var monthSel = document.getElementById('ckchMonth');
    monthSel.innerHTML = '<option value="">📅 Tất cả tháng</option>';
    for (var m = 1; m <= 12; m++) {
        monthSel.innerHTML += '<option value="' + m + '"' + (m === curMonth ? ' selected' : '') + '>Tháng ' + m + '</option>';
    }

    // Populate year select
    var yearSel = document.getElementById('ckchYear');
    for (var y = curYear; y >= curYear - 3; y--) {
        yearSel.innerHTML += '<option value="' + y + '"' + (y === curYear ? ' selected' : '') + '>' + y + '</option>';
    }

    // Load employees for filter
    try {
        var empData = await apiCall('/api/meeting-commitments/employees');
        var userSel = document.getElementById('ckchUser');
        var allTeams = empData.teams || [];
        for (var ti = 0; ti < allTeams.length; ti++) {
            var team = allTeams[ti];
            for (var mi = 0; mi < team.members.length; mi++) {
                var emp = team.members[mi];
                userSel.innerHTML += '<option value="' + emp.id + '">' + emp.full_name + ' (' + team.name + ')</option>';
            }
        }
    } catch(e) {}

    // Events
    monthSel.onchange = ckchLoad;
    yearSel.onchange = ckchLoad;
    document.getElementById('ckchUser').onchange = ckchLoad;

    ckchLoad();
}

async function ckchLoad() {
    var month = document.getElementById('ckchMonth').value;
    var year = document.getElementById('ckchYear').value;
    var userId = document.getElementById('ckchUser').value;
    var contentEl = document.getElementById('ckchContent');
    var isGD = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';

    contentEl.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af">⏳ Đang tải...</div>';

    try {
        var url = '/api/meeting-commitments/sessions?';
        if (month) url += 'month=' + month + '&';
        if (year) url += 'year=' + year + '&';
        var sessions = (await apiCall(url)).sessions || [];

        if (sessions.length === 0) {
            contentEl.innerHTML = '<div class="ckch-empty"><div style="font-size:48px;margin-bottom:12px">📭</div>Không có cuộc họp nào trong khoảng thời gian này</div>';
            return;
        }

        var h = '';
        for (var si = 0; si < sessions.length; si++) {
            var s = sessions[si];
            var dt = new Date(s.meeting_date);
            var pctDone = s.total_items > 0 ? Math.round(100 * s.completed_items / s.total_items) : 0;
            var pctColor = pctDone >= 80 ? '#22c55e' : pctDone >= 50 ? '#f59e0b' : '#ef4444';

            h += '<div class="ckch-card" id="ckchCard' + s.id + '">';
            h += '<div class="ckch-card-head" onclick="ckchToggle(' + s.id + ')">';
            h += '<div class="ckch-card-title">📋 ' + s.title + '<span class="ckch-card-date">' + dt.toLocaleDateString('vi-VN') + '</span></div>';
            h += '<div class="ckch-card-stats">';
            h += '<span class="ckch-stat-pill" style="background:#eff6ff;color:#1d4ed8">📝 ' + s.total_items + ' cam kết</span>';
            h += '<span class="ckch-stat-pill" style="background:' + (pctDone >= 80 ? '#dcfce7;color:#166534' : pctDone >= 50 ? '#fef3c7;color:#92400e' : '#fee2e2;color:#991b1b') + '">' + pctDone + '% hoàn thành</span>';
            if (isGD) {
                h += '<button class="ckch-stat-pill" style="background:#fee2e2;color:#dc2626;border:none;cursor:pointer" onclick="event.stopPropagation();ckchDeleteSession(' + s.id + ')">🗑️</button>';
            }
            h += '</div></div>';
            h += '<div class="ckch-card-body" id="ckchBody' + s.id + '" style="display:none"><div style="padding:20px;text-align:center;color:#9ca3af">⏳</div></div>';
            h += '</div>';
        }
        contentEl.innerHTML = h;

        // Auto-expand first session
        if (sessions.length > 0) ckchToggle(sessions[0].id);

    } catch(e) {
        contentEl.innerHTML = '<div class="ckch-empty" style="color:#ef4444">⚠️ Lỗi: ' + (e.message || '') + '</div>';
    }
}

window.ckchToggle = async function(sessionId) {
    var body = document.getElementById('ckchBody' + sessionId);
    if (!body) return;

    if (body.style.display === 'none') {
        body.style.display = 'block';
        // Load commitments
        try {
            var data = await apiCall('/api/meeting-commitments/sessions/' + sessionId);
            var commits = data.commitments || [];
            var userId = document.getElementById('ckchUser').value;
            if (userId) commits = commits.filter(function(c) { return c.user_id === parseInt(userId); });

            if (commits.length === 0) {
                body.innerHTML = '<div style="padding:20px;text-align:center;color:#9ca3af">Không có cam kết</div>';
                return;
            }

            // Group by user
            var byUser = {};
            for (var i = 0; i < commits.length; i++) {
                var c = commits[i];
                var key = c.user_id;
                if (!byUser[key]) byUser[key] = { name: c.user_name, role: c.user_role, dept: c.dept_name, items: [] };
                byUser[key].items.push(c);
            }

            var h = '';
            var userIds = Object.keys(byUser);
            for (var ui = 0; ui < userIds.length; ui++) {
                var u = byUser[userIds[ui]];
                var roleTag = '';
                if (u.role === 'quan_ly' || u.role === 'quan_ly_cap_cao') roleTag = ' <span style="font-size:11px;color:#94a3b8">(Quản Lý)</span>';
                else if (u.role === 'truong_phong') roleTag = ' <span style="font-size:11px;color:#94a3b8">(Trưởng Phòng)</span>';

                h += '<div class="ckch-emp-group">';
                h += '<div class="ckch-emp-header">👤 ' + u.name + roleTag + ' <span style="font-size:11px;color:#94a3b8;margin-left:auto">' + (u.dept || '') + '</span></div>';

                for (var ci = 0; ci < u.items.length; ci++) {
                    var item = u.items[ci];
                    var cls = item.is_completed ? ' ckch-commit-done' : item.completion_pct > 0 ? ' ckch-commit-partial' : '';
                    var pctColor = item.completion_pct >= 80 ? '#22c55e' : item.completion_pct >= 50 ? '#f59e0b' : '#ef4444';

                    h += '<div class="ckch-commit' + cls + '">';
                    h += '<div class="ckch-stt">' + item.stt + '</div>';
                    h += '<div class="ckch-commit-content">';
                    h += '<div class="ckch-commit-text">' + item.content + '</div>';
                    if (item.target_revenue > 0) {
                        h += '<div class="ckch-commit-meta">🎯 Mục tiêu: ' + formatCurrency(item.target_revenue) + '</div>';
                    }
                    if (item.review_note) {
                        h += '<div class="ckch-commit-review">💬 Review: ' + item.review_note + '</div>';
                    }
                    h += '<div class="ckch-pct-bar"><div class="ckch-pct-fill" style="width:' + (item.completion_pct || 0) + '%;background:' + pctColor + '"></div></div>';
                    h += '</div>';
                    h += '<div style="text-align:center;min-width:50px"><div style="font-size:18px;font-weight:900;color:' + pctColor + '">' + (item.completion_pct || 0) + '%</div>';
                    h += '<div style="font-size:10px;color:#6b7280">' + (item.is_completed ? '✅ Xong' : '⏳') + '</div></div>';
                    h += '</div>';
                }
                h += '</div>';
            }
            body.innerHTML = h;
        } catch(e) {
            body.innerHTML = '<div style="padding:20px;color:#ef4444;text-align:center">Lỗi: ' + (e.message || '') + '</div>';
        }
    } else {
        body.style.display = 'none';
    }
};

window.ckchDeleteSession = async function(sessionId) {
    if (!confirm('Xóa cuộc họp này và tất cả cam kết?')) return;
    try {
        await apiCall('/api/meeting-commitments/sessions/' + sessionId, 'DELETE');
        ckchLoad();
    } catch(e) { alert('Lỗi: ' + (e.message || '')); }
};

function formatCurrency(n) {
    if (!n) return '0';
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + ' tỷ';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + ' triệu';
    return n.toLocaleString('vi-VN') + 'đ';
}
