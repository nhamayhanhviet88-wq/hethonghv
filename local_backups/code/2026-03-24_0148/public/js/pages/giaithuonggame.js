// ========== SETUP GIẢI THƯỞNG GAME ==========

// 4 Leaderboard tabs
var GT_TABS = [
    { id: 'affiliate', label: '🏆 BXH Affiliate', color: '#e65100' },
    { id: 'kinhdoanh', label: '📊 BXH Kinh Doanh', color: '#1565c0' },
    { id: 'sale', label: '💼 BXH Sale', color: '#2e7d32' },
    { id: 'ctv', label: '🤝 BXH CTV', color: '#6a1b9a' },
    { id: 'sanxuat', label: '🏭 BXH Sản Xuất', color: '#d84315' },
    { id: 'vanphong', label: '🏢 BXH Văn Phòng', color: '#00695c' },
];

// Board options per tab
var GT_BOARDS = {
    affiliate: [
        { key: 'affiliateRevenue', name: '🏆 Ngôi Sao Doanh Số', desc: 'Khách Affiliate Doanh Số Cao Nhất', color: '#e65100' },
        { key: 'employeeRevenue', name: '👑 Thủ Lĩnh Doanh Số', desc: 'Nhân Viên Doanh Số Affiliate Cao Nhất', color: '#1565c0' },
        { key: 'employeeOrders', name: '🎯 Chiến Binh Đơn Hàng', desc: 'Nhân Viên Đạt Nhiều Đơn Affiliate Nhất', color: '#2e7d32' },
        { key: 'teamRevenue', name: '⚡ Đội Hình Vàng', desc: 'Team Đạt Doanh Số Affiliate Cao Nhất', color: '#6a1b9a' },
        { key: 'hunterRanking', name: '🔥 Thợ Săn Tài Năng', desc: 'Nhân Viên Có Nhiều Affiliate Mới Nhất', color: '#c62828' },
        { key: 'magnetRanking', name: '🧲 Nam Châm Khách Hàng', desc: 'Nhân Viên Có Affiliate Giới Thiệu Khách Nhiều Nhất', color: '#00838f' },
    ],
    kinhdoanh: [
        { key: 'kd_board1', name: '🏆 Hạng mục 1', desc: 'Chưa thiết lập', color: '#e65100' },
        { key: 'kd_board2', name: '👑 Hạng mục 2', desc: 'Chưa thiết lập', color: '#1565c0' },
        { key: 'kd_board3', name: '🎯 Hạng mục 3', desc: 'Chưa thiết lập', color: '#2e7d32' },
        { key: 'kd_board4', name: '⚡ Hạng mục 4', desc: 'Chưa thiết lập', color: '#6a1b9a' },
        { key: 'kd_board5', name: '🔥 Hạng mục 5', desc: 'Chưa thiết lập', color: '#c62828' },
        { key: 'kd_board6', name: '🧲 Hạng mục 6', desc: 'Chưa thiết lập', color: '#00838f' },
    ],
    sale: [
        { key: 'sale_board1', name: '🏆 Hạng mục 1', desc: 'Chưa thiết lập', color: '#e65100' },
        { key: 'sale_board2', name: '👑 Hạng mục 2', desc: 'Chưa thiết lập', color: '#1565c0' },
        { key: 'sale_board3', name: '🎯 Hạng mục 3', desc: 'Chưa thiết lập', color: '#2e7d32' },
        { key: 'sale_board4', name: '⚡ Hạng mục 4', desc: 'Chưa thiết lập', color: '#6a1b9a' },
        { key: 'sale_board5', name: '🔥 Hạng mục 5', desc: 'Chưa thiết lập', color: '#c62828' },
        { key: 'sale_board6', name: '🧲 Hạng mục 6', desc: 'Chưa thiết lập', color: '#00838f' },
    ],
    ctv: [
        { key: 'ctv_board1', name: '🏆 Hạng mục 1', desc: 'Chưa thiết lập', color: '#e65100' },
        { key: 'ctv_board2', name: '👑 Hạng mục 2', desc: 'Chưa thiết lập', color: '#1565c0' },
        { key: 'ctv_board3', name: '🎯 Hạng mục 3', desc: 'Chưa thiết lập', color: '#2e7d32' },
        { key: 'ctv_board4', name: '⚡ Hạng mục 4', desc: 'Chưa thiết lập', color: '#6a1b9a' },
        { key: 'ctv_board5', name: '🔥 Hạng mục 5', desc: 'Chưa thiết lập', color: '#c62828' },
        { key: 'ctv_board6', name: '🧲 Hạng mục 6', desc: 'Chưa thiết lập', color: '#00838f' },
    ],
    sanxuat: [
        { key: 'sx_board1', name: '🏆 Hạng mục 1', desc: 'Chưa thiết lập', color: '#e65100' },
        { key: 'sx_board2', name: '👑 Hạng mục 2', desc: 'Chưa thiết lập', color: '#1565c0' },
        { key: 'sx_board3', name: '🎯 Hạng mục 3', desc: 'Chưa thiết lập', color: '#2e7d32' },
        { key: 'sx_board4', name: '⚡ Hạng mục 4', desc: 'Chưa thiết lập', color: '#6a1b9a' },
        { key: 'sx_board5', name: '🔥 Hạng mục 5', desc: 'Chưa thiết lập', color: '#c62828' },
        { key: 'sx_board6', name: '🧲 Hạng mục 6', desc: 'Chưa thiết lập', color: '#00838f' },
    ],
    vanphong: [
        { key: 'vp_board1', name: '🏆 Hạng mục 1', desc: 'Chưa thiết lập', color: '#e65100' },
        { key: 'vp_board2', name: '👑 Hạng mục 2', desc: 'Chưa thiết lập', color: '#1565c0' },
        { key: 'vp_board3', name: '🎯 Hạng mục 3', desc: 'Chưa thiết lập', color: '#2e7d32' },
        { key: 'vp_board4', name: '⚡ Hạng mục 4', desc: 'Chưa thiết lập', color: '#6a1b9a' },
        { key: 'vp_board5', name: '🔥 Hạng mục 5', desc: 'Chưa thiết lập', color: '#c62828' },
        { key: 'vp_board6', name: '🧲 Hạng mục 6', desc: 'Chưa thiết lập', color: '#00838f' },
    ],
};

var _gtSelectedMonth = '';
var _gtActiveTab = 'affiliate';
var _gtAllPrizes = [];
var _gtTeamsList = [];

function _gtFmtMoney(n) { return n ? Number(n).toLocaleString('vi-VN') : '0'; }

async function renderGiaiThuongGamePage(container) {
    var now = new Date();
    var curYear = now.getFullYear();
    var curMonth = now.getMonth() + 1;
    _gtSelectedMonth = curYear + '-' + String(curMonth).padStart(2, '0');

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
            .gt-card { border-radius:14px; overflow:hidden; margin-bottom:16px; border:1px solid var(--gray-200); transition:all .3s; }\
            .gt-card:hover { box-shadow:0 4px 20px rgba(0,0,0,.08); }\
            .gt-card-header { padding:14px 18px; color:white; font-weight:800; font-size:15px; display:flex; justify-content:space-between; align-items:center; position:relative; }\
            .gt-card-header-name { font-size:16px; font-weight:900; letter-spacing:.5px; background:linear-gradient(90deg,rgba(255,255,255,1) 0%,rgba(255,220,150,1) 40%,rgba(255,255,255,1) 60%,rgba(255,255,255,.9) 100%); background-size:200% 100%; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; animation:gtHeaderShimmer 3s ease-in-out infinite; filter:drop-shadow(0 1px 4px rgba(0,0,0,.2)); }\
            @keyframes gtHeaderShimmer { 0%{background-position:100% 0} 100%{background-position:-100% 0} }\
            .gt-card-body { padding:16px; }\
            .gt-prize-row { display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid var(--gray-100); }\
            .gt-prize-row:last-child { border-bottom:none; }\
            .gt-medal { font-size:24px; width:36px; text-align:center; flex-shrink:0; }\
            .gt-input { border:1px solid var(--gray-200); border-radius:8px; padding:8px 12px; font-size:13px; outline:none; transition:border .2s; width:100%; box-sizing:border-box; }\
            .gt-input:focus { border-color:var(--info); }\
            .gt-btn-save { background:linear-gradient(135deg,#22c55e,#16a34a); color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:700; font-size:12px; cursor:pointer; transition:all .2s; }\
            .gt-btn-save:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(34,197,94,.3); }\
            .gt-btn-del { background:linear-gradient(135deg,#ef4444,#dc2626); color:white; border:none; padding:6px 12px; border-radius:6px; font-weight:600; font-size:11px; cursor:pointer; }\
            .gt-badge-active { background:linear-gradient(135deg,#22c55e,#059669); color:white; padding:6px 14px; border-radius:24px; font-size:11px; font-weight:800; box-shadow:0 2px 8px rgba(34,197,94,.4); letter-spacing:.3px; display:inline-flex; align-items:center; gap:4px; }\
            .gt-badge-none { background:rgba(0,0,0,.25); color:rgba(255,255,255,.8); padding:6px 14px; border-radius:24px; font-size:11px; font-weight:700; backdrop-filter:blur(4px); display:inline-flex; align-items:center; gap:4px; border:1px solid rgba(255,255,255,.15); }\
            .gt-tabs { display:flex; gap:0; border-bottom:2px solid var(--gray-200); margin-bottom:16px; }\
            .gt-tab { padding:10px 20px; font-weight:700; font-size:13px; cursor:pointer; border:none; border-bottom:3px solid transparent; transition:all .2s; color:var(--gray-500); background:none; }\
            .gt-tab:hover { color:var(--navy); background:var(--gray-50); }\
            .gt-tab.active { border-bottom-color:currentColor; }\
            .gt-summary-table { width:100%; border-collapse:collapse; font-size:12px; }\
            .gt-summary-table th { background:var(--navy); color:white; padding:8px 12px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.5px; }\
            .gt-summary-table td { padding:7px 12px; border-bottom:1px solid var(--gray-100); }\
            .gt-summary-table tr:hover td { background:var(--gray-50); }\
            .gt-summary-table .gt-sum-total { font-weight:800; color:var(--navy); background:rgba(212,168,67,.08); }\
            .gt-cond-box { background:var(--gray-50); border:1px solid var(--gray-200); border-radius:10px; padding:12px; margin-bottom:12px; }\
            .gt-cond-label { font-size:11px; font-weight:700; color:var(--navy); margin-bottom:6px; text-transform:uppercase; letter-spacing:.5px; }\
            .gt-dept-tags { display:flex; flex-wrap:wrap; gap:4px; margin-top:6px; }\
            .gt-dept-tag { background:linear-gradient(135deg,var(--info),#0284c7); color:white; padding:3px 8px; border-radius:12px; font-size:10px; font-weight:600; display:inline-flex; align-items:center; gap:3px; }\
            .gt-dept-tag .gt-remove-dept { cursor:pointer; opacity:.7; font-size:12px; }\
            .gt-dept-tag .gt-remove-dept:hover { opacity:1; }\
        </style>\
        <div class="card" style="margin-bottom:16px;">\
            <div class="card-body" style="padding:14px 18px;">\
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">\
                    <h2 style="margin:0;color:var(--navy);font-size:18px;">🎮 Setup Giải Thưởng Game</h2>\
                    <div style="display:flex;gap:8px;align-items:center;">\
                        <select id="gtYear" class="form-control" style="width:auto;min-width:90px;" onchange="_gtUpdateMonth()">\
                            ' + yearOpts + '\
                        </select>\
                        <select id="gtMonthNum" class="form-control" style="width:auto;min-width:120px;" onchange="_gtUpdateMonth()">\
                            ' + monthNumOpts + '\
                        </select>\
                    </div>\
                </div>\
                <p style="margin:6px 0 0;color:var(--gray-500);font-size:12px;">Thiết lập giải thưởng cho từng bảng xếp hạng theo tháng. Top 1-3, mỗi top có thể setup giải thưởng riêng.</p>\
            </div>\
        </div>\
        <div class="card" style="margin-bottom:16px;">\
            <div class="card-body" style="padding:14px 18px;">\
                <h3 style="margin:0 0 10px;color:var(--navy);font-size:14px;">📋 Tổng Kết Giải Thưởng Tháng</h3>\
                <div id="gtSummaryTable"></div>\
            </div>\
        </div>\
        <div class="card">\
            <div class="card-body" style="padding:0;">\
                <div class="gt-tabs" id="gtTabs"></div>\
                <div id="gtBoardsContainer" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px;"></div>\
            </div>\
        </div>\
    ';

    // Load departments for department selector
    try {
        var deptData = await apiCall('/api/departments');
        _gtTeamsList = (deptData.departments || []).filter(function(t) { return t.name; });
    } catch(e) { _gtTeamsList = []; }

    _renderGtTabs();
    await loadGiaiThuongData();
}

function _renderGtTabs() {
    var tabsEl = document.getElementById('gtTabs');
    var html = '';
    GT_TABS.forEach(function(tab) {
        var isActive = _gtActiveTab === tab.id;
        html += '<button class="gt-tab' + (isActive ? ' active' : '') + '" data-tab="' + tab.id + '" style="' + (isActive ? 'color:' + tab.color + ';border-bottom-color:' + tab.color + ';' : '') + '">';
        html += tab.label;
        html += '</button>';
    });
    tabsEl.innerHTML = html;
    tabsEl.querySelectorAll('.gt-tab').forEach(function(btn) {
        btn.addEventListener('click', function() {
            _gtActiveTab = this.getAttribute('data-tab');
            _renderGtTabs();
            _renderGtBoards();
        });
    });
}

function _gtUpdateMonth() {
    var y = document.getElementById('gtYear').value;
    var m = document.getElementById('gtMonthNum').value;
    _gtSelectedMonth = y + '-' + String(parseInt(m)).padStart(2, '0');
    loadGiaiThuongData();
}

var _gtPrevMonthBlocked = false;

async function loadGiaiThuongData() {
    var ct = document.getElementById('gtBoardsContainer');
    ct.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-500);grid-column:1/-1;">⏳ Đang tải...</div>';

    // Check if previous month awards are complete
    var parts = _gtSelectedMonth.split('-');
    var y = parseInt(parts[0]), m = parseInt(parts[1]);
    var pm = m - 1, py = y;
    if (pm <= 0) { pm = 12; py--; }
    var prevMonth = py + '-' + String(pm).padStart(2, '0');

    _gtPrevMonthBlocked = false;
    try {
        var checkRes = await apiCall('/api/affiliate/awards/check?month=' + prevMonth);
        if (checkRes.success && !checkRes.complete && checkRes.total > 0) {
            _gtPrevMonthBlocked = true;
        }
    } catch(e) {}

    // Show/hide warning
    var warnEl = document.getElementById('gtBlockWarning');
    if (!warnEl) {
        var w = document.createElement('div');
        w.id = 'gtBlockWarning';
        ct.parentNode.insertBefore(w, ct);
        warnEl = w;
    }
    if (_gtPrevMonthBlocked) {
        warnEl.innerHTML = '<div style="background:linear-gradient(135deg,#fef2f2,#fee2e2);border:1px solid #fca5a5;border-radius:12px;padding:16px;margin-bottom:16px;">' +
            '<div style="display:flex;align-items:center;gap:10px;">' +
            '<span style="font-size:28px;">⚠️</span>' +
            '<div><div style="font-weight:800;color:#b91c1c;font-size:14px;">Chưa thể setup tháng mới!</div>' +
            '<div style="color:#dc2626;font-size:12px;margin-top:4px;">Tháng ' + pm + '/' + py + ' vẫn còn giải thưởng chưa trao. Vui lòng vào <strong>Trao Giải Thưởng</strong> để hoàn thành trước.</div></div>' +
            '</div></div>';
    } else {
        warnEl.innerHTML = '';
    }

    var data = await apiCall('/api/affiliate/prizes?month=' + _gtSelectedMonth);
    _gtAllPrizes = data.prizes || [];
    _renderGtSummary();
    _renderGtBoards();
}

function _renderGtSummary() {
    var el = document.getElementById('gtSummaryTable');
    var prizeMap = {};
    _gtAllPrizes.forEach(function(p) {
        if (!prizeMap[p.board_key]) prizeMap[p.board_key] = [];
        prizeMap[p.board_key].push(p);
    });

    var boardInfo = {};
    GT_TABS.forEach(function(tab) {
        GT_BOARDS[tab.id].forEach(function(b) {
            boardInfo[b.key] = { tabLabel: tab.label.replace(/^[^\s]+\s/, ''), boardName: b.name, boardDesc: b.desc, color: tab.color };
        });
    });

    var rows = [];
    var grandTotal = 0;
    Object.keys(prizeMap).forEach(function(key) {
        var prizes = prizeMap[key];
        var info = boardInfo[key] || { tabLabel: '?', boardName: key, boardDesc: '', color: '#666' };
        var top1 = prizes.find(function(p) { return p.top_rank === 1; });
        var top2 = prizes.find(function(p) { return p.top_rank === 2; });
        var top3 = prizes.find(function(p) { return p.top_rank === 3; });
        var total = prizes.reduce(function(s, p) { return s + Number(p.prize_amount); }, 0);
        var conditions = prizes[0] ? (prizes[0].conditions || '') : '';
        var departments = [];
        try { departments = prizes[0] ? JSON.parse(prizes[0].departments || '[]') : []; } catch(e) {}
        var deptNames = departments.map(function(did) {
            var t = _gtTeamsList.find(function(tm) { return tm.id == did; });
            return t ? t.name : ('ID:' + did);
        });
        grandTotal += total;
        rows.push({ tabLabel: info.tabLabel, boardName: info.boardName, boardDesc: info.boardDesc, color: info.color,
            top1: top1 ? top1.prize_amount : 0, top2: top2 ? top2.prize_amount : 0, top3: top3 ? top3.prize_amount : 0,
            total: total, conditions: conditions, deptNames: deptNames });
    });

    // Sort: highest total first
    rows.sort(function(a, b) { return b.total - a.total; });

    if (rows.length === 0) {
        el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gray-400);font-size:13px;">Chưa có giải thưởng nào trong tháng này</div>';
        return;
    }

    var html = '<div style="overflow-x:auto;"><table class="gt-summary-table">';
    html += '<thead><tr><th>Bảng XH</th><th>Hạng mục</th><th>Điều kiện</th><th>Bộ phận</th><th style="text-align:right">🥇 Top 1</th><th style="text-align:right">🥈 Top 2</th><th style="text-align:right">🥉 Top 3</th><th style="text-align:right">Tổng tiền</th></tr></thead><tbody>';
    rows.forEach(function(r) {
        html += '<tr>';
        html += '<td><span style="color:' + r.color + ';font-weight:700;">' + r.tabLabel + '</span></td>';
        html += '<td><div style="font-weight:800;font-size:13px;color:var(--navy);">' + r.boardName + '</div><div style="font-size:10px;color:' + r.color + ';font-weight:600;margin-top:2px;padding-left:8px;border-left:2px solid ' + r.color + ';">' + r.boardDesc + '</div></td>';
        html += '<td style="font-size:11px;max-width:150px;">' + (r.conditions || '<span style="color:var(--gray-300);">—</span>') + '</td>';
        html += '<td>' + (r.deptNames.length > 0 ? r.deptNames.map(function(n) { return '<span style="background:var(--info);color:white;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:600;margin:1px;">' + n + '</span>'; }).join(' ') : '<span style="color:var(--gray-300);">—</span>') + '</td>';
        html += '<td style="text-align:right">' + (r.top1 ? _gtFmtMoney(r.top1) : '-') + '</td>';
        html += '<td style="text-align:right">' + (r.top2 ? _gtFmtMoney(r.top2) : '-') + '</td>';
        html += '<td style="text-align:right">' + (r.top3 ? _gtFmtMoney(r.top3) : '-') + '</td>';
        html += '<td style="text-align:right;font-weight:700;color:var(--navy);">' + _gtFmtMoney(r.total) + '</td>';
        html += '</tr>';
    });
    html += '<tr class="gt-sum-total"><td colspan="7" style="text-align:right;font-weight:800;">TỔNG CỘNG</td>';
    html += '<td style="text-align:right;font-weight:900;color:#e65100;font-size:14px;">' + _gtFmtMoney(grandTotal) + ' VNĐ</td></tr>';
    html += '</tbody></table></div>';
    el.innerHTML = html;
}

function _renderGtBoards() {
    var ct = document.getElementById('gtBoardsContainer');
    var boards = GT_BOARDS[_gtActiveTab] || [];
    var medals = ['🥇','🥈','🥉'];

    var prizeMap = {};
    _gtAllPrizes.forEach(function(p) {
        if (!prizeMap[p.board_key]) prizeMap[p.board_key] = [];
        prizeMap[p.board_key].push(p);
    });

    // Sort boards: has prizes first, highest total first
    var sortedBoards = boards.slice().sort(function(a, b) {
        var aPrizes = prizeMap[a.key] || [];
        var bPrizes = prizeMap[b.key] || [];
        var aTotal = aPrizes.reduce(function(s, p) { return s + Number(p.prize_amount); }, 0);
        var bTotal = bPrizes.reduce(function(s, p) { return s + Number(p.prize_amount); }, 0);
        var aHas = aPrizes.length > 0 ? 1 : 0;
        var bHas = bPrizes.length > 0 ? 1 : 0;
        if (aHas !== bHas) return bHas - aHas;
        return bTotal - aTotal;
    });

    ct.innerHTML = sortedBoards.map(function(board) {
        var bPrizes = prizeMap[board.key] || [];
        var hasActive = bPrizes.length > 0;
        var totalPrize = bPrizes.reduce(function(s, p) { return s + Number(p.prize_amount); }, 0);
        var existingCond = hasActive ? (bPrizes[0].conditions || '') : '';
        var existingDepts = [];
        try { existingDepts = hasActive ? JSON.parse(bPrizes[0].departments || '[]') : []; } catch(e) {}

        // Badge HTML
        var badgeHtml = hasActive
            ? '<span class="gt-badge-active">✅ Có giải: ' + _gtFmtMoney(totalPrize) + ' VNĐ</span>'
            : '<span class="gt-badge-none">❌ Chưa có giải</span>';

        // Prize rows
        var rowsHtml = [1,2,3].map(function(rank) {
            var existing = bPrizes.find(function(p) { return p.top_rank === rank; });
            return '<div class="gt-prize-row">\
                <div class="gt-medal">' + medals[rank - 1] + '</div>\
                <div style="flex:1;">\
                    <div style="font-weight:700;font-size:12px;color:var(--navy);margin-bottom:4px;">Top ' + rank + '</div>\
                    <div style="display:flex;gap:8px;">\
                        <input type="number" class="gt-input" id="gtAmt_' + board.key + '_' + rank + '" placeholder="Số tiền..." value="' + (existing ? existing.prize_amount : '') + '" style="width:140px;flex:none;">\
                        <input type="text" class="gt-input" id="gtDesc_' + board.key + '_' + rank + '" placeholder="Mô tả giải (tùy chọn)..." value="' + (existing ? (existing.prize_description || '') : '') + '">\
                    </div>\
                </div>\
            </div>';
        }).join('');

        // Department tags
        var deptTagsHtml = existingDepts.map(function(did) {
            var t = _gtTeamsList.find(function(tm) { return tm.id == did; });
            var nm = t ? t.name : ('ID:' + did);
            return '<span class="gt-dept-tag">' + nm + ' <span class="gt-remove-dept" data-board="' + board.key + '" data-dept="' + did + '">✕</span></span>';
        }).join('');

        // Department select options
        var deptOpts = '<option value="">+ Thêm phòng...</option>';
        _gtTeamsList.forEach(function(t) {
            if (existingDepts.indexOf(t.id) === -1) {
                deptOpts += '<option value="' + t.id + '">' + t.name + '</option>';
            }
        });

        return '<div class="gt-card" id="gtCard_' + board.key + '">\
            <div class="gt-card-header" style="background:linear-gradient(135deg,' + board.color + ',' + board.color + 'cc);">\
                <div>\
                    <div class="gt-card-header-name">' + board.name + '</div>\
                    <div style="font-size:10px;font-weight:400;opacity:.85;margin-top:2px;">' + board.desc + '</div>\
                </div>\
                ' + badgeHtml + '\
            </div>\
            <div class="gt-card-body">\
                <div class="gt-cond-box">\
                    <div style="display:flex;gap:12px;">\
                        <div style="flex:1;">\
                            <div class="gt-cond-label">📋 Điều kiện đạt giải</div>\
                            <input type="text" class="gt-input" id="gtCond_' + board.key + '" placeholder="VD: Chốt 10 đơn + Doanh số trên 100 triệu..." value="' + existingCond.replace(/"/g, '&quot;') + '">\
                        </div>\
                        <div style="flex:1;">\
                            <div class="gt-cond-label">🏢 Bộ phận áp dụng</div>\
                            <select class="gt-input gt-dept-select" data-board="' + board.key + '" style="margin-bottom:4px;">' + deptOpts + '</select>\
                            <div class="gt-dept-tags" id="gtDepts_' + board.key + '">' + deptTagsHtml + '</div>\
                            <input type="hidden" id="gtDeptsVal_' + board.key + '" value=\'' + JSON.stringify(existingDepts) + '\'>\
                        </div>\
                    </div>\
                </div>\
                ' + rowsHtml + '\
                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">\
                    ' + (hasActive ? '<button class="gt-btn-del" onclick="deleteGtPrize(\'' + board.key + '\')">🗑 Xóa giải</button>' : '') + '\
                    <button class="gt-btn-save" onclick="saveGtPrize(\'' + board.key + '\')">💾 Lưu giải thưởng</button>\
                </div>\
            </div>\
        </div>';
    }).join('');

    // Attach department select handlers
    ct.querySelectorAll('.gt-dept-select').forEach(function(sel) {
        sel.addEventListener('change', function() {
            var boardKey = this.getAttribute('data-board');
            var deptId = parseInt(this.value);
            if (!deptId) return;
            var hiddenEl = document.getElementById('gtDeptsVal_' + boardKey);
            var current = JSON.parse(hiddenEl.value || '[]');
            if (current.indexOf(deptId) === -1) {
                current.push(deptId);
                hiddenEl.value = JSON.stringify(current);
                _refreshDeptTags(boardKey, current);
            }
            this.value = '';
        });
    });

    // Attach remove department handlers
    ct.querySelectorAll('.gt-remove-dept').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var boardKey = this.getAttribute('data-board');
            var deptId = parseInt(this.getAttribute('data-dept'));
            var hiddenEl = document.getElementById('gtDeptsVal_' + boardKey);
            var current = JSON.parse(hiddenEl.value || '[]');
            current = current.filter(function(d) { return d !== deptId; });
            hiddenEl.value = JSON.stringify(current);
            _refreshDeptTags(boardKey, current);
        });
    });
}

function _refreshDeptTags(boardKey, depts) {
    var container = document.getElementById('gtDepts_' + boardKey);
    container.innerHTML = depts.map(function(did) {
        var t = _gtTeamsList.find(function(tm) { return tm.id == did; });
        var nm = t ? t.name : ('ID:' + did);
        return '<span class="gt-dept-tag">' + nm + ' <span class="gt-remove-dept" data-board="' + boardKey + '" data-dept="' + did + '">✕</span></span>';
    }).join('');

    // Re-attach remove handlers
    container.querySelectorAll('.gt-remove-dept').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var bk = this.getAttribute('data-board');
            var did = parseInt(this.getAttribute('data-dept'));
            var hiddenEl = document.getElementById('gtDeptsVal_' + bk);
            var cur = JSON.parse(hiddenEl.value || '[]');
            cur = cur.filter(function(d) { return d !== did; });
            hiddenEl.value = JSON.stringify(cur);
            _refreshDeptTags(bk, cur);
        });
    });

    // Update select to show removed options
    var sel = document.querySelector('.gt-dept-select[data-board="' + boardKey + '"]');
    if (sel) {
        var opts = '<option value="">+ Thêm phòng...</option>';
        _gtTeamsList.forEach(function(t) {
            if (depts.indexOf(t.id) === -1) {
                opts += '<option value="' + t.id + '">' + t.name + '</option>';
            }
        });
        sel.innerHTML = opts;
    }
}

async function saveGtPrize(boardKey) {
    if (_gtPrevMonthBlocked) {
        showToast('Chưa thể setup! Vui lòng trao giải tháng trước trước.', 'error');
        return;
    }
    var prizes = [];
    for (var rank = 1; rank <= 3; rank++) {
        var amtEl = document.getElementById('gtAmt_' + boardKey + '_' + rank);
        var descEl = document.getElementById('gtDesc_' + boardKey + '_' + rank);
        var amt = amtEl ? amtEl.value : '';
        var desc = descEl ? descEl.value : '';
        if (amt && Number(amt) > 0) {
            prizes.push({ top_rank: rank, prize_amount: Number(amt), prize_description: desc || '' });
        }
    }
    if (prizes.length === 0) { showToast('Vui lòng nhập ít nhất 1 giải thưởng', 'error'); return; }

    var condEl = document.getElementById('gtCond_' + boardKey);
    var deptEl = document.getElementById('gtDeptsVal_' + boardKey);
    var conditions = condEl ? condEl.value : '';
    var departments = [];
    try { departments = deptEl ? JSON.parse(deptEl.value || '[]') : []; } catch(e) {}

    var res = await apiCall('/api/affiliate/prizes', 'POST', {
        month: _gtSelectedMonth,
        board_key: boardKey,
        prizes: prizes,
        conditions: conditions,
        departments: departments
    });
    if (res.success) { showToast('Đã lưu giải thưởng!'); await loadGiaiThuongData(); }
    else showToast(res.error || 'Lỗi', 'error');
}

async function deleteGtPrize(boardKey) {
    if (!confirm('Xóa tất cả giải thưởng của bảng này?')) return;
    var res = await apiCall('/api/affiliate/prizes?month=' + _gtSelectedMonth + '&board_key=' + boardKey, 'DELETE');
    if (res.success) { showToast('Đã xóa giải thưởng'); await loadGiaiThuongData(); }
    else showToast(res.error || 'Lỗi', 'error');
}
