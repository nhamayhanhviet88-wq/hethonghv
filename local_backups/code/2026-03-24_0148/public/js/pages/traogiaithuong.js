// ========== TRAO GIẢI THƯỞNG (HALL OF FAME) ==========

var _tgSelectedMonth = '';
var _tgSelectedYear = 0;
var _tgAllPrizes = [];
var _tgAllAwards = [];
var _tgDeptUsers = [];

function _tgFmt(n) { return n ? Number(n).toLocaleString('vi-VN') : '0'; }

// Reuse GT_BOARDS from giaithuonggame.js
function _tgGetBoardInfo(boardKey) {
    var allBoards = {};
    if (typeof GT_TABS !== 'undefined' && typeof GT_BOARDS !== 'undefined') {
        GT_TABS.forEach(function(tab) {
            GT_BOARDS[tab.id].forEach(function(b) {
                allBoards[b.key] = { tabLabel: tab.label, boardName: b.name, boardDesc: b.desc, color: b.color, tabColor: tab.color };
            });
        });
    }
    return allBoards[boardKey] || { tabLabel: '?', boardName: boardKey, boardDesc: '', color: '#666', tabColor: '#666' };
}

async function renderTraoGiaiThuongPage(container) {
    var now = new Date();
    var curYear = now.getFullYear();
    var curMonth = now.getMonth() + 1;
    _tgSelectedMonth = curYear + '-' + String(curMonth).padStart(2, '0');
    _tgSelectedYear = curYear;

    var yearOpts = '';
    for (var yr = curYear; yr <= 2060; yr++) {
        yearOpts += '<option value="' + yr + '" ' + (yr === curYear ? 'selected' : '') + '>' + yr + '</option>';
    }
    var monthNumOpts = '';
    for (var mn = 1; mn <= 12; mn++) {
        monthNumOpts += '<option value="' + mn + '" ' + (mn === curMonth ? 'selected' : '') + '>Tháng ' + mn + '</option>';
    }

    container.innerHTML = '\
        <style>\
            .tg-hero { background:linear-gradient(135deg,#1a1a2e 0%,#16213e 40%,#0f3460 100%); border-radius:16px; padding:24px; margin-bottom:16px; color:white; text-align:center; position:relative; overflow:hidden; }\
            .tg-hero::before { content:""; position:absolute; top:-50%; left:-50%; width:200%; height:200%; background:radial-gradient(circle, rgba(212,168,67,.1) 0%, transparent 50%); animation:tgGlow 6s ease-in-out infinite; }\
            @keyframes tgGlow { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(180deg)} }\
            .tg-hero h2 { margin:0; font-size:22px; position:relative; z-index:1; }\
            .tg-hero p { margin:8px 0 0; opacity:.7; font-size:13px; position:relative; z-index:1; }\
            .tg-stats { display:flex; gap:16px; justify-content:center; margin-top:16px; position:relative; z-index:1; }\
            .tg-stat { background:rgba(255,255,255,.1); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,.1); border-radius:12px; padding:12px 20px; text-align:center; }\
            .tg-stat-num { font-size:24px; font-weight:900; color:#fad24c; }\
            .tg-stat-label { font-size:10px; text-transform:uppercase; letter-spacing:1px; opacity:.7; margin-top:4px; }\
            .tg-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:16px; }\
            .tg-award-card { border-radius:14px; overflow:hidden; border:1px solid var(--gray-200); background:white; transition:all .3s; position:relative; }\
            .tg-award-card:hover { transform:translateY(-2px); box-shadow:0 8px 30px rgba(0,0,0,.1); }\
            .tg-award-card .tg-photos { display:flex; gap:0; height:180px; }\
            .tg-award-card .tg-photos img { flex:1; object-fit:cover; }\
            .tg-award-card .tg-info { padding:14px; }\
            .tg-rank-badge { position:absolute; top:10px; left:10px; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:20px; background:rgba(0,0,0,.5); backdrop-filter:blur(10px); border:2px solid rgba(255,255,255,.3); }\
            .tg-winner-name { font-size:16px; font-weight:800; color:var(--navy); }\
            .tg-prize-amt { font-size:14px; font-weight:700; color:#e65100; }\
            .tg-board-label { font-size:10px; color:white; padding:3px 8px; border-radius:8px; font-weight:600; display:inline-block; margin-top:6px; }\
            .tg-empty { text-align:center; padding:60px 20px; color:var(--gray-400); }\
            .tg-empty-icon { font-size:60px; margin-bottom:12px; }\
            .tg-form-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,.6); z-index:9999; display:flex; align-items:center; justify-content:center; }\
            .tg-form { background:white; border-radius:16px; padding:24px; max-width:520px; width:95%; max-height:90vh; overflow-y:auto; }\
            .tg-form h3 { margin:0 0 16px; color:var(--navy); }\
            .tg-form label { display:block; font-size:12px; font-weight:700; color:var(--navy); margin:10px 0 4px; text-transform:uppercase; letter-spacing:.5px; }\
            .tg-form input, .tg-form select { width:100%; box-sizing:border-box; padding:8px 12px; border:1px solid var(--gray-200); border-radius:8px; font-size:13px; outline:none; }\
            .tg-form input:focus, .tg-form select:focus { border-color:var(--info); }\
            .tg-upload-box { border:2px dashed var(--gray-300); border-radius:10px; padding:20px; text-align:center; cursor:pointer; transition:all .2s; position:relative; }\
            .tg-upload-box:hover { border-color:var(--info); background:rgba(14,165,233,.05); }\
            .tg-upload-box.has-file { border-color:#22c55e; background:rgba(34,197,94,.05); }\
            .tg-upload-box input[type=file] { position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer; }\
            .tg-form-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:16px; }\
            .tg-btn { padding:8px 18px; border-radius:8px; font-weight:700; font-size:13px; border:none; cursor:pointer; transition:all .2s; }\
            .tg-btn-primary { background:linear-gradient(135deg,#22c55e,#16a34a); color:white; }\
            .tg-btn-primary:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(34,197,94,.3); }\
            .tg-btn-cancel { background:var(--gray-100); color:var(--gray-600); }\
            .tg-pending { background:linear-gradient(135deg,#fff7ed,#ffedd5); border:1px solid #fed7aa; border-radius:10px; padding:14px; margin-bottom:16px; }\
            .tg-pending h4 { margin:0 0 8px; color:#c2410c; font-size:14px; }\
            .tg-pending-item { display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid #fed7aa; font-size:12px; }\
            .tg-pending-item:last-child { border-bottom:none; }\
            .tg-annual-table { width:100%; border-collapse:collapse; font-size:12px; }\
            .tg-annual-table th { background:linear-gradient(135deg,#1a1a2e,#0f3460); color:white; padding:10px 12px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.5px; }\
            .tg-annual-table td { padding:8px 12px; border-bottom:1px solid var(--gray-100); }\
            .tg-annual-table tr:hover td { background:var(--gray-50); }\
            .tg-annual-table .tg-rank-1 { color:#e65100; font-weight:900; }\
        </style>\
        <div class="tg-hero">\
            <h2>🏆 Đền Vinh Danh — Hall of Fame</h2>\
            <p>Ghi nhận và tôn vinh những cá nhân, đội nhóm xuất sắc nhất</p>\
            <div class="tg-stats" id="tgStats"></div>\
        </div>\
        <div class="card" style="margin-bottom:16px;">\
            <div class="card-body" style="padding:14px 18px;">\
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">\
                    <h3 style="margin:0;color:var(--navy);font-size:15px;">📅 Xem theo tháng</h3>\
                    <div style="display:flex;gap:8px;">\
                        <select id="tgYear" class="form-control" style="width:auto;min-width:90px;" onchange="_tgUpdateMonth()">\
                            ' + yearOpts + '\
                        </select>\
                        <select id="tgMonthNum" class="form-control" style="width:auto;min-width:120px;" onchange="_tgUpdateMonth()">\
                            ' + monthNumOpts + '\
                        </select>\
                    </div>\
                </div>\
            </div>\
        </div>\
        <div id="tgPendingSection"></div>\
        <div id="tgAwardsGrid" class="tg-grid"></div>\
        <div class="card" style="margin-top:16px;">\
            <div class="card-body" style="padding:14px 18px;">\
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px;">\
                    <h3 style="margin:0;color:var(--navy);font-size:15px;">📊 Tổng Kết Năm</h3>\
                    <select id="tgAnnualYear" class="form-control" style="width:auto;min-width:90px;" onchange="_tgSelectedYear=parseInt(this.value);loadTgAnnualData()">\
                        ' + yearOpts + '\
                    </select>\
                </div>\
                <div id="tgAnnualSummary"></div>\
            </div>\
        </div>\
        <div id="tgFormOverlay" class="tg-form-overlay" style="display:none;"></div>\
    ';

    await loadTraoGiaiData();
    await loadTgAnnualData();
}

function _tgUpdateMonth() {
    var y = document.getElementById('tgYear').value;
    var m = document.getElementById('tgMonthNum').value;
    _tgSelectedMonth = y + '-' + String(parseInt(m)).padStart(2, '0');
    loadTraoGiaiData();
}

async function loadTraoGiaiData() {
    var gridEl = document.getElementById('tgAwardsGrid');
    gridEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-500);grid-column:1/-1;">⏳ Đang tải...</div>';

    var pData = await apiCall('/api/affiliate/prizes?month=' + _tgSelectedMonth);
    var aData = await apiCall('/api/affiliate/awards?month=' + _tgSelectedMonth);
    _tgAllPrizes = pData.prizes || [];
    _tgAllAwards = aData.awards || [];

    _renderTgStats();
    _renderTgPending();
    _renderTgAwards();
}

async function loadTgAnnualData() {
    var el = document.getElementById('tgAnnualSummary');
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gray-400);">⏳ Đang tải...</div>';

    var aData = await apiCall('/api/affiliate/awards?year=' + _tgSelectedYear);
    var awards = aData.awards || [];

    if (awards.length === 0) {
        el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--gray-400);font-size:13px;">Chưa có giải thưởng nào trong năm ' + _tgSelectedYear + '</div>';
        return;
    }

    // Group by winner_name
    var winnerMap = {};
    awards.forEach(function(a) {
        var key = a.winner_name;
        if (!winnerMap[key]) {
            winnerMap[key] = { name: a.winner_name, count: 0, totalAmount: 0, awards: [], photo: a.photo_winner };
        }
        winnerMap[key].count++;
        winnerMap[key].totalAmount += Number(a.prize_amount);
        var info = _tgGetBoardInfo(a.board_key);
        winnerMap[key].awards.push({
            month: a.month, boardName: info.boardName, topRank: a.top_rank,
            amount: a.prize_amount, color: info.color
        });
    });

    // Sort by count desc, then totalAmount desc
    var sorted = Object.values(winnerMap).sort(function(a, b) {
        return b.count - a.count || b.totalAmount - a.totalAmount;
    });

    var html = '<div style="overflow-x:auto;"><table class="tg-annual-table">';
    html += '<thead><tr><th style="width:40px">STT</th><th>Tên</th><th style="text-align:center">Số lần nhận giải</th><th>Các giải đạt được</th><th style="text-align:right">Tổng tiền thưởng</th></tr></thead><tbody>';
    sorted.forEach(function(w, idx) {
        var detailsHtml = w.awards.map(function(aw) {
            var medals = ['🥇','🥈','🥉'];
            return '<span style="display:inline-block;background:' + aw.color + ';color:white;padding:2px 6px;border-radius:6px;font-size:10px;font-weight:600;margin:1px;">' +
                (medals[aw.topRank - 1] || '🏅') + ' ' + aw.boardName + ' T' + aw.month.split('-')[1] + '</span>';
        }).join(' ');
        html += '<tr>';
        html += '<td style="text-align:center;font-weight:800;" class="' + (idx === 0 ? 'tg-rank-1' : '') + '">' + (idx + 1) + '</td>';
        html += '<td style="font-weight:700;">' + w.name + '</td>';
        html += '<td style="text-align:center;font-weight:800;font-size:16px;color:var(--navy);">' + w.count + '</td>';
        html += '<td>' + detailsHtml + '</td>';
        html += '<td style="text-align:right;font-weight:700;color:#e65100;">' + _tgFmt(w.totalAmount) + ' VNĐ</td>';
        html += '</tr>';
    });
    html += '</tbody></table></div>';
    el.innerHTML = html;
}

function _renderTgStats() {
    var el = document.getElementById('tgStats');
    var totalPrizeAmt = _tgAllPrizes.reduce(function(s, p) { return s + Number(p.prize_amount); }, 0);
    var totalAwarded = _tgAllAwards.length;
    var totalPrizeCount = _tgAllPrizes.length;

    el.innerHTML = '\
        <div class="tg-stat"><div class="tg-stat-num">' + totalPrizeCount + '</div><div class="tg-stat-label">Giải thưởng</div></div>\
        <div class="tg-stat"><div class="tg-stat-num">' + totalAwarded + '</div><div class="tg-stat-label">Đã trao</div></div>\
        <div class="tg-stat"><div class="tg-stat-num">' + (totalPrizeCount - totalAwarded) + '</div><div class="tg-stat-label">Chưa trao</div></div>\
        <div class="tg-stat"><div class="tg-stat-num">' + _tgFmt(totalPrizeAmt) + '</div><div class="tg-stat-label">Tổng tiền giải</div></div>\
    ';
}

function _renderTgPending() {
    var el = document.getElementById('tgPendingSection');
    var canAward = currentUser && ['giam_doc','quan_ly','trinh'].indexOf(currentUser.role) !== -1;

    var awardSet = {};
    _tgAllAwards.forEach(function(a) { awardSet[a.board_key + '_' + a.top_rank] = true; });

    var pending = [];
    _tgAllPrizes.forEach(function(p) {
        if (!awardSet[p.board_key + '_' + p.top_rank]) {
            pending.push(p);
        }
    });

    if (pending.length === 0) {
        el.innerHTML = '';
        return;
    }

    var medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

    var html = '<div class="tg-pending"><h4>⏳ Giải thưởng chưa trao (' + pending.length + ')</h4>';
    pending.forEach(function(p) {
        var info = _tgGetBoardInfo(p.board_key);
        html += '<div class="tg-pending-item">';
        html += '<div><span style="font-size:16px;">' + (medals[p.top_rank - 1] || '') + '</span> ';
        html += '<strong>' + info.boardName + '</strong> — Top ' + p.top_rank + ' <span style="color:#e65100;font-weight:700;">' + _tgFmt(p.prize_amount) + ' VNĐ</span></div>';
        if (canAward) {
            html += '<button class="tg-btn tg-btn-primary" style="font-size:11px;padding:4px 12px;" onclick="openTgAwardForm(\'' + p.board_key + '\',' + p.top_rank + ',' + p.prize_amount + ',\'' + (p.prize_description || '').replace(/'/g, "\\'") + '\',\'' + (p.departments || '[]').replace(/'/g, "\\'") + '\')">🎖 Trao giải</button>';
        }
        html += '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
}

function _renderTgAwards() {
    var gridEl = document.getElementById('tgAwardsGrid');
    if (_tgAllAwards.length === 0) {
        gridEl.innerHTML = '<div class="tg-empty" style="grid-column:1/-1;"><div class="tg-empty-icon">🏆</div><div style="font-size:16px;font-weight:700;">Chưa có giải thưởng nào được trao</div><div style="margin-top:8px;">Hãy setup giải thưởng và trao giải cho nhân viên xuất sắc!</div></div>';
        return;
    }

    var medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    var canDelete = currentUser && ['giam_doc','quan_ly','trinh'].indexOf(currentUser.role) !== -1;

    gridEl.innerHTML = _tgAllAwards.map(function(a) {
        var info = _tgGetBoardInfo(a.board_key);
        var medal = medals[a.top_rank - 1] || '🏅';

        return '<div class="tg-award-card">\
            <div class="tg-photos">\
                <img src="' + (a.photo_winner || '') + '" alt="Người nhận giải" onerror="this.style.background=\'#eee\'">\
                <img src="' + (a.photo_certificate || '') + '" alt="Bằng khen" onerror="this.style.background=\'#eee\'">\
            </div>\
            <div class="tg-rank-badge">' + medal + '</div>\
            <div class="tg-info">\
                <div class="tg-winner-name">' + a.winner_name + '</div>\
                <div class="tg-prize-amt">' + _tgFmt(a.prize_amount) + ' VNĐ</div>\
                <div style="font-size:11px;color:var(--gray-500);margin-top:4px;">' + (a.prize_description || '') + '</div>\
                <span class="tg-board-label" style="background:' + info.color + ';">' + info.boardName + ' — Top ' + a.top_rank + '</span>\
                ' + (canDelete ? '<button class="tg-btn" style="position:absolute;top:10px;right:10px;background:rgba(239,68,68,.9);color:white;font-size:10px;padding:3px 8px;" onclick="deleteTgAward(' + a.id + ')">🗑</button>' : '') + '\
            </div>\
        </div>';
    }).join('');
}

async function openTgAwardForm(boardKey, topRank, prizeAmount, prizeDesc, deptJson) {
    var info = _tgGetBoardInfo(boardKey);
    var medals = ['🥇','🥈','🥉'];
    var isTeam = boardKey.indexOf('team') !== -1 || boardKey.indexOf('Đội') !== -1;

    // Load users from departments
    var depts = [];
    try { depts = JSON.parse(deptJson); } catch(e) {}
    _tgDeptUsers = [];
    if (depts.length > 0) {
        try {
            var res = await apiCall('/api/affiliate/awards/users-by-dept?dept_ids=' + depts.join(','));
            _tgDeptUsers = res.users || [];
        } catch(e) {}
    }
    // Also load all users if no departments specified
    if (_tgDeptUsers.length === 0) {
        try {
            var allRes = await apiCall('/api/users');
            _tgDeptUsers = (allRes.users || allRes || []).filter(function(u) { return u.status === 'active'; });
        } catch(e) {}
    }

    var teamOpts = '';
    if (isTeam) {
        try {
            var tRes = await apiCall('/api/teams');
            (tRes.teams || []).forEach(function(t) {
                teamOpts += '<option value="' + t.id + '">' + t.name + '</option>';
            });
        } catch(e) {}
    }

    var userOpts = '<option value="">-- Chọn nhân viên --</option>';
    _tgDeptUsers.forEach(function(u) {
        userOpts += '<option value="' + u.id + '">' + u.full_name + '</option>';
    });

    var overlay = document.getElementById('tgFormOverlay');
    overlay.style.display = 'flex';
    overlay.innerHTML = '\
        <div class="tg-form">\
            <h3>' + (medals[topRank - 1] || '🏅') + ' Trao Giải — ' + info.boardName + ' — Top ' + topRank + '</h3>\
            <div style="background:' + info.color + ';color:white;padding:10px 14px;border-radius:10px;margin-bottom:14px;">\
                <div style="font-weight:800;">' + info.boardName + '</div>\
                <div style="font-size:11px;opacity:.8;">' + info.boardDesc + '</div>\
                <div style="font-size:16px;font-weight:900;margin-top:4px;">' + _tgFmt(prizeAmount) + ' VNĐ</div>\
            </div>\
            ' + (isTeam ? '\
                <label>🏢 Chọn Team</label>\
                <select id="tgWinnerTeam"><option value="">-- Chọn team --</option>' + teamOpts + '</select>\
                <input type="hidden" id="tgWinnerType" value="team">\
            ' : '\
                <label>👤 Chọn Người Nhận Giải' + (depts.length > 0 ? ' (từ bộ phận áp dụng)' : '') + '</label>\
                <select id="tgWinnerUser" onchange="var o=this.options[this.selectedIndex];document.getElementById(\'tgWinnerName\').value=o.text!==\'-- Chọn nhân viên --\'?o.text:\'\'">\
                    ' + userOpts + '\
                </select>\
                <input type="hidden" id="tgWinnerType" value="individual">\
            ') + '\
            <label>Tên hiển thị</label>\
            <input type="text" id="tgWinnerName" placeholder="Tên người/team nhận giải...">\
            <label>📸 Ảnh người nhận giải (bắt buộc)</label>\
            <div class="tg-upload-box" id="tgUpload1">\
                <div>📷 Click để chọn ảnh</div>\
                <input type="file" accept="image/*" onchange="if(this.files[0]){this.parentNode.classList.add(\'has-file\');this.parentNode.querySelector(\'div\').textContent=\'✅ \'+this.files[0].name}">\
            </div>\
            <label>📜 Ảnh bằng khen (bắt buộc)</label>\
            <div class="tg-upload-box" id="tgUpload2">\
                <div>📷 Click để chọn ảnh</div>\
                <input type="file" accept="image/*" onchange="if(this.files[0]){this.parentNode.classList.add(\'has-file\');this.parentNode.querySelector(\'div\').textContent=\'✅ \'+this.files[0].name}">\
            </div>\
            <div class="tg-form-actions">\
                <button class="tg-btn tg-btn-cancel" onclick="document.getElementById(\'tgFormOverlay\').style.display=\'none\'">Hủy</button>\
                <button class="tg-btn tg-btn-primary" onclick="submitTgAward(\'' + boardKey + '\',' + topRank + ',' + prizeAmount + ',\'' + (prizeDesc || '').replace(/'/g, "\\'") + '\')">🎖 Xác nhận trao giải</button>\
            </div>\
        </div>\
    ';
}

async function submitTgAward(boardKey, topRank, prizeAmount, prizeDesc) {
    var winnerName = document.getElementById('tgWinnerName').value.trim();
    if (!winnerName) { showToast('Vui lòng nhập tên người/team nhận giải', 'error'); return; }

    var photo1 = document.querySelector('#tgUpload1 input[type=file]').files[0];
    var photo2 = document.querySelector('#tgUpload2 input[type=file]').files[0];
    if (!photo1 || !photo2) { showToast('Bắt buộc upload đủ 2 ảnh', 'error'); return; }

    var formData = new FormData();
    formData.append('board_key', boardKey);
    formData.append('month', _tgSelectedMonth);
    formData.append('top_rank', topRank);
    formData.append('winner_type', document.getElementById('tgWinnerType').value);
    formData.append('winner_name', winnerName);
    formData.append('prize_amount', prizeAmount);
    formData.append('prize_description', prizeDesc);
    formData.append('photo_winner', photo1);
    formData.append('photo_certificate', photo2);

    var userEl = document.getElementById('tgWinnerUser');
    if (userEl && userEl.value) formData.append('winner_user_id', userEl.value);
    var teamEl = document.getElementById('tgWinnerTeam');
    if (teamEl && teamEl.value) formData.append('winner_team_id', teamEl.value);

    try {
        var token = document.cookie.split(';').find(function(c) { return c.trim().startsWith('token='); });
        token = token ? token.trim().split('=')[1] : '';

        var res = await fetch('/api/affiliate/awards', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
        });
        var data = await res.json();
        if (data.success) {
            showToast('🎉 Đã trao giải thành công!');
            document.getElementById('tgFormOverlay').style.display = 'none';
            await loadTraoGiaiData();
            await loadTgAnnualData();
        } else {
            showToast(data.error || 'Lỗi', 'error');
        }
    } catch(e) {
        showToast('Lỗi upload: ' + e.message, 'error');
    }
}

async function deleteTgAward(id) {
    if (!confirm('Bạn có chắc muốn xóa giải thưởng này?')) return;
    var res = await apiCall('/api/affiliate/awards/' + id, 'DELETE');
    if (res.success) { showToast('Đã xóa'); await loadTraoGiaiData(); await loadTgAnnualData(); }
    else showToast(res.error || 'Lỗi', 'error');
}
