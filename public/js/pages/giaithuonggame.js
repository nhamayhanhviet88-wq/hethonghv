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
var _gtSelectedPeriodType = 'monthly';
var _gtActiveTab = 'affiliate';
var _gtAllPrizes = [];
var _gtTeamsList = [];
var _gtManuallyAddedBoards = {}; // { tabId: [boardKey1, boardKey2, ...] }

function _gtFmtMoney(n) { return n ? Number(n).toLocaleString('vi-VN') : '0'; }

function _gtBuildPeriodOptions(periodType) {
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
    var html = '';
    if (periodType === 'daily') {
        for (var i = 0; i < 30; i++) {
            var dt = new Date(y, m - 1, d - i);
            var val = dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0');
            var label = dt.getDate() + '/' + (dt.getMonth()+1) + '/' + dt.getFullYear();
            if (i === 0) label += ' (Hôm nay)';
            html += '<option value="' + val + '"' + (i===0?' selected':'') + '>' + label + '</option>';
        }
    } else if (periodType === 'weekly') {
        var today = new Date(y, m - 1, d);
        var dayOfWeek = today.getDay() || 7;
        var monday = new Date(today);
        monday.setDate(today.getDate() - dayOfWeek + 1);
        for (var i = 0; i < 12; i++) {
            var wMon = new Date(monday);
            wMon.setDate(monday.getDate() - i * 7);
            var wSun = new Date(wMon);
            wSun.setDate(wMon.getDate() + 6);
            var tmpDate = new Date(wMon.getTime());
            tmpDate.setDate(tmpDate.getDate() + 3 - ((tmpDate.getDay() + 6) % 7));
            var weekYear = tmpDate.getFullYear();
            var week1 = new Date(weekYear, 0, 4);
            var weekNum = 1 + Math.round(((tmpDate - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
            var val = weekYear + '-W' + String(weekNum).padStart(2, '0');
            var label = 'Tuần ' + weekNum + ' (' + wMon.getDate() + '/' + (wMon.getMonth()+1) + ' - ' + wSun.getDate() + '/' + (wSun.getMonth()+1) + ')';
            html += '<option value="' + val + '"' + (i===0?' selected':'') + '>' + label + '</option>';
        }
    } else if (periodType === 'monthly') {
        for (var i = 0; i < 12; i++) {
            var mm = m - i, yy = y;
            if (mm <= 0) { mm += 12; yy--; }
            var val = yy + '-' + String(mm).padStart(2, '0');
            html += '<option value="' + val + '"' + (i===0?' selected':'') + '>Tháng ' + mm + '/' + yy + '</option>';
        }
    } else if (periodType === 'quarterly') {
        var curQ = Math.ceil(m / 3);
        for (var i = 0; i < 8; i++) {
            var qq = curQ - i, qy = y;
            while (qq <= 0) { qq += 4; qy--; }
            var val = qy + '-Q' + qq;
            html += '<option value="' + val + '"' + (i===0?' selected':'') + '>Quý ' + qq + '/' + qy + '</option>';
        }
    }
    return html;
}

function _gtGetPeriodValue() {
    var el = document.getElementById('gtPeriodValue');
    return el ? el.value : _gtSelectedMonth;
}

async function renderGiaiThuongGamePage(container) {
    var now = new Date();
    var curYear = now.getFullYear();
    var curMonth = now.getMonth() + 1;
    _gtSelectedMonth = curYear + '-' + String(curMonth).padStart(2, '0');
    _gtSelectedPeriodType = 'monthly';

    var periodTabsHtml = '';
    [{id:'daily',icon:'📆',label:'Ngày'},{id:'weekly',icon:'📅',label:'Tuần'},{id:'monthly',icon:'📅',label:'Tháng'},{id:'quarterly',icon:'📊',label:'Quý'}].forEach(function(pt) {
        var active = pt.id === 'monthly';
        periodTabsHtml += '<button class="gt-period-tab' + (active ? ' active' : '') + '" data-period="' + pt.id + '" style="padding:8px 18px;font-weight:700;font-size:13px;cursor:pointer;border:none;border-bottom:3px solid ' + (active ? '#e65100' : 'transparent') + ';color:' + (active ? '#e65100' : 'var(--gray-500)') + ';background:none;transition:all .2s;">' + pt.icon + ' ' + pt.label + '</button>';
    });

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
            #gtAddBoardHeaderBtn:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(59,130,246,.35) !important; }\
        </style>\
        <div class="card" style="margin-bottom:16px;">\
            <div class="card-body" style="padding:14px 18px;">\
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">\
                    <h2 style="margin:0;color:var(--navy);font-size:18px;">🎮 Setup Giải Thưởng Game</h2>\
                    <div style="display:flex;gap:8px;align-items:center;">\
                        <button id="gtAddBoardHeaderBtn" onclick="_gtShowAddBoardPopup()" style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;border:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(59,130,246,.25);transition:all .2s;white-space:nowrap;">➕ Thêm Hạng Mục <span id="gtAddBoardCount" style="background:rgba(255,255,255,.25);padding:1px 6px;border-radius:6px;font-size:10px;"></span></button>\
                        <select id="gtPeriodValue" class="form-control" style="width:auto;min-width:200px;" onchange="_gtUpdatePeriod()">\
                            ' + _gtBuildPeriodOptions('monthly') + '\
                        </select>\
                    </div>\
                </div>\
                <div style="display:flex;gap:0;border-bottom:2px solid var(--gray-200);margin-top:12px;" id="gtPeriodTabs">\
                    ' + periodTabsHtml + '\
                </div>\
                <p style="margin:6px 0 0;color:var(--gray-500);font-size:12px;">Thiết lập giải thưởng cho từng bảng xếp hạng. Chọn kỳ (Ngày/Tuần/Tháng/Quý), chọn thời gian, rồi setup giải.</p>\
            </div>\
        </div>\
        <div class="card" style="margin-bottom:16px;">\
            <div class="card-body" style="padding:14px 18px;">\
                <h3 style="margin:0 0 10px;color:var(--navy);font-size:14px;">📋 Tổng Kết Giải Thưởng</h3>\
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

    // Attach period tab clicks
    document.querySelectorAll('.gt-period-tab').forEach(function(btn) {
        btn.addEventListener('click', function() {
            _gtSelectedPeriodType = this.getAttribute('data-period');
            document.querySelectorAll('.gt-period-tab').forEach(function(b) {
                b.style.borderBottomColor = 'transparent';
                b.style.color = 'var(--gray-500)';
                b.classList.remove('active');
            });
            this.style.borderBottomColor = '#e65100';
            this.style.color = '#e65100';
            this.classList.add('active');
            var picker = document.getElementById('gtPeriodValue');
            picker.innerHTML = _gtBuildPeriodOptions(_gtSelectedPeriodType);
            _gtUpdatePeriod();
        });
    });

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

function _gtUpdatePeriod() {
    _gtSelectedMonth = _gtGetPeriodValue();
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

    var data = await apiCall('/api/affiliate/prizes?month=' + _gtSelectedMonth + '&period_type=' + _gtSelectedPeriodType);
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
        // Build comprehensive condition text
        var minOrders = prizes[0] ? (Number(prizes[0].min_orders) || 0) : 0;
        var minRevenue = prizes[0] ? (Number(prizes[0].min_revenue) || 0) : 0;
        var minCount = prizes[0] ? (Number(prizes[0].min_count) || 0) : 0;
        var condParts = [];
        if (minOrders > 0) condParts.push('Tối thiểu ' + minOrders + ' đơn');
        if (minRevenue > 0) condParts.push(_gtFmtMoney(minRevenue) + ' VNĐ doanh số');
        if (minCount > 0) {
            var countLabel = key === 'hunterRanking' ? 'affiliate mới' : (key === 'magnetRanking' ? 'KH giới thiệu' : '');
            condParts.push(minCount + ' ' + countLabel);
        }
        var fullCondText = condParts.length > 0 ? condParts.join(' & ') + ' trở lên' : '';
        if (conditions && fullCondText) fullCondText += ' · ' + conditions;
        else if (conditions) fullCondText = conditions;
        grandTotal += total;
        rows.push({ tabLabel: info.tabLabel, boardName: info.boardName, boardDesc: info.boardDesc, color: info.color, boardKey: key,
            top1: top1 ? top1.prize_amount : 0, top2: top2 ? top2.prize_amount : 0, top3: top3 ? top3.prize_amount : 0,
            total: total, conditions: fullCondText, deptNames: deptNames });
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
        html += '<td><div style="font-weight:800;font-size:13px;color:var(--navy);cursor:pointer;" onclick="_showBoardExplainPopup(\'' + r.boardKey + '\')">' + r.boardName + ' <span style="font-size:10px;opacity:.5;">ⓘ</span></div><div style="font-size:10px;color:' + r.color + ';font-weight:600;margin-top:2px;padding-left:8px;border-left:2px solid ' + r.color + ';">' + r.boardDesc + '</div></td>';
        html += '<td style="font-size:11px;max-width:200px;">' + (r.conditions ? '<span style="color:#1e293b;font-weight:600;">' + r.conditions + '</span>' : '<span style="color:var(--gray-300);">—</span>') + '</td>';
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
    var allBoards = GT_BOARDS[_gtActiveTab] || [];
    var medals = ['🥇','🥈','🥉'];

    var prizeMap = {};
    _gtAllPrizes.forEach(function(p) {
        if (!prizeMap[p.board_key]) prizeMap[p.board_key] = [];
        prizeMap[p.board_key].push(p);
    });

    // Determine which boards to show: ones with saved prizes + manually added
    var manualList = _gtManuallyAddedBoards[_gtActiveTab] || [];
    var visibleBoards = allBoards.filter(function(b) {
        return (prizeMap[b.key] && prizeMap[b.key].length > 0) || manualList.indexOf(b.key) !== -1;
    });

    // Sort boards: has prizes first, highest total first
    var sortedBoards = visibleBoards.slice().sort(function(a, b) {
        var aPrizes = prizeMap[a.key] || [];
        var bPrizes = prizeMap[b.key] || [];
        var aTotal = aPrizes.reduce(function(s, p) { return s + Number(p.prize_amount); }, 0);
        var bTotal = bPrizes.reduce(function(s, p) { return s + Number(p.prize_amount); }, 0);
        var aHas = aPrizes.length > 0 ? 1 : 0;
        var bHas = bPrizes.length > 0 ? 1 : 0;
        if (aHas !== bHas) return bHas - aHas;
        return bTotal - aTotal;
    });

    // Count how many boards can still be added
    var remainingBoards = allBoards.filter(function(b) {
        return !visibleBoards.some(function(v) { return v.key === b.key; });
    });

    var cardsHtml = sortedBoards.map(function(board) {
        var bPrizes = prizeMap[board.key] || [];
        var hasActive = bPrizes.length > 0;
        var totalPrize = bPrizes.reduce(function(s, p) { return s + Number(p.prize_amount); }, 0);
        var existingCond = hasActive ? (bPrizes[0].conditions || '') : '';
        var existingDepts = [];
        try { existingDepts = hasActive ? JSON.parse(bPrizes[0].departments || '[]') : []; } catch(e) {}
        var existingMinOrders = hasActive ? (bPrizes[0].min_orders || 0) : 0;
        var existingMinRevenue = hasActive ? (bPrizes[0].min_revenue || 0) : 0;
        var existingMinCount = hasActive ? (bPrizes[0].min_count || 0) : 0;

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

        // Remove button for manually added (unsaved) boards
        var removeBtn = (!hasActive && manualList.indexOf(board.key) !== -1)
            ? '<button class="gt-btn-del" onclick="_gtRemoveManualBoard(\'' + board.key + '\')">✕ Bỏ hạng mục</button>'
            : '';

        return '<div class="gt-card" id="gtCard_' + board.key + '">\
            <div class="gt-card-header" style="background:linear-gradient(135deg,' + board.color + ',' + board.color + 'cc);">\
                <div>\
                    <div class="gt-card-header-name" style="cursor:pointer;" onclick="_showBoardExplainPopup(\'' + board.key + '\')">' + board.name + ' <span style="font-size:12px;opacity:.6;">ⓘ</span></div>\
                    <div style="font-size:10px;font-weight:400;opacity:.85;margin-top:2px;">' + board.desc + '</div>\
                </div>\
                ' + badgeHtml + '\
            </div>\
            <div class="gt-card-body">\
                <div class="gt-cond-box">\
                    <div style="display:flex;gap:12px;">\
                        <div style="flex:1;">\
                            <div class="gt-cond-label">📝 Ghi Chú Nội Dung Giải Thưởng</div>\
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
                <div class="gt-cond-box" style="margin-top:8px;">\
                    <div class="gt-cond-label">🎯 Điều kiện tối thiểu để lọt TOP</div>\
                    ' + (function() {
                        if (board.key === 'hunterRanking') {
                            return '<div style="display:flex;gap:10px;align-items:center;"><label style="font-size:12px;font-weight:600;color:var(--navy);white-space:nowrap;">Tối thiểu</label><input type="number" class="gt-input" id="gtMinCount_' + board.key + '" placeholder="0" value="' + (existingMinCount || '') + '" style="width:100px;"><label style="font-size:12px;color:var(--gray-500);">affiliate mới trở lên</label></div>';
                        } else if (board.key === 'magnetRanking') {
                            return '<div style="display:flex;gap:10px;align-items:center;"><label style="font-size:12px;font-weight:600;color:var(--navy);white-space:nowrap;">Tối thiểu</label><input type="number" class="gt-input" id="gtMinCount_' + board.key + '" placeholder="0" value="' + (existingMinCount || '') + '" style="width:100px;"><label style="font-size:12px;color:var(--gray-500);">KH giới thiệu trở lên</label></div>';
                        } else {
                            return '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;"><label style="font-size:12px;font-weight:600;color:var(--navy);white-space:nowrap;">Tối thiểu</label><input type="number" class="gt-input" id="gtMinOrders_' + board.key + '" placeholder="0" value="' + (existingMinOrders || '') + '" style="width:80px;"><label style="font-size:12px;color:var(--gray-500);white-space:nowrap;">đơn &</label><input type="number" class="gt-input" id="gtMinRevenue_' + board.key + '" placeholder="0" value="' + (existingMinRevenue || '') + '" style="width:120px;"><label style="font-size:12px;color:var(--gray-500);white-space:nowrap;">VNĐ doanh số trở lên</label></div>';
                        }
                    })() + '\
                </div>\
                ' + rowsHtml + '\
                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;" id="gtActions_' + board.key + '">\
                    ' + removeBtn + '\
                    ' + (hasActive ? '<button class="gt-btn-del" onclick="deleteGtPrize(\'' + board.key + '\')">🗑 Xóa giải</button><button class="gt-btn-save" style="background:linear-gradient(135deg,#f59e0b,#d97706);" onclick="_gtToggleEdit(\'' + board.key + '\')">✏️ Sửa</button>' : '') + '\
                    <button class="gt-btn-save" id="gtSaveBtn_' + board.key + '"' + (hasActive ? ' style="display:none;"' : '') + ' onclick="saveGtPrize(\'' + board.key + '\')">💾 Lưu giải thưởng</button>\
                </div>\
            </div>\
        </div>';
    }).join('');

    // Empty state
    if (sortedBoards.length === 0) {
        ct.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:50px 20px;">' +
            '<div style="font-size:56px;margin-bottom:16px;">🎯</div>' +
            '<div style="font-size:16px;font-weight:800;color:var(--navy);margin-bottom:8px;">Chưa có hạng mục nào</div>' +
            '<div style="font-size:13px;color:var(--gray-500);">Bấm nút <strong>➕ Thêm Hạng Mục</strong> ở trên để thêm hạng mục giải thưởng.</div>' +
            '</div>';
    } else {
        ct.innerHTML = cardsHtml;
    }

    // Update header button count
    _gtUpdateAddBoardBtn(remainingBoards.length);

    // Lock saved cards
    setTimeout(function() {
        (GT_BOARDS[_gtActiveTab] || []).forEach(function(b) {
            if (prizeMap[b.key] && prizeMap[b.key].length > 0) {
                _gtLockCard(b.key);
            }
        });
    }, 500);

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

// ========== ADD BOARD HEADER BUTTON ==========
function _gtUpdateAddBoardBtn(remaining) {
    var btn = document.getElementById('gtAddBoardHeaderBtn');
    var countEl = document.getElementById('gtAddBoardCount');
    if (!btn) return;
    if (remaining <= 0) {
        btn.style.display = 'none';
    } else {
        btn.style.display = '';
        if (countEl) countEl.textContent = 'còn ' + remaining;
    }
}

// ========== ADD BOARD POPUP ==========
function _gtShowAddBoardPopup() {
    var allBoards = GT_BOARDS[_gtActiveTab] || [];
    var manualList = _gtManuallyAddedBoards[_gtActiveTab] || [];
    var prizeMap = {};
    _gtAllPrizes.forEach(function(p) {
        if (!prizeMap[p.board_key]) prizeMap[p.board_key] = [];
        prizeMap[p.board_key].push(p);
    });

    // Filter only boards not yet visible
    var availableBoards = allBoards.filter(function(b) {
        var hasPrizes = prizeMap[b.key] && prizeMap[b.key].length > 0;
        var isManual = manualList.indexOf(b.key) !== -1;
        return !hasPrizes && !isManual;
    });

    if (availableBoards.length === 0) {
        showToast('Tất cả hạng mục đã được thêm!', 'info');
        return;
    }

    var tabInfo = GT_TABS.find(function(t) { return t.id === _gtActiveTab; });
    var tabColor = tabInfo ? tabInfo.color : '#3b82f6';

    var listHtml = availableBoards.map(function(b) {
        return '<label style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid var(--gray-200);border-radius:10px;cursor:pointer;transition:all .2s;" ' +
            'onmouseover="this.style.background=\'#f0f9ff\';this.style.borderColor=\'' + tabColor + '\'" ' +
            'onmouseout="this.style.background=\'\';this.style.borderColor=\'var(--gray-200)\'">' +
            '<input type="checkbox" value="' + b.key + '" class="gt-add-board-cb" style="width:18px;height:18px;accent-color:' + tabColor + ';cursor:pointer;">' +
            '<div style="flex:1;">' +
                '<div style="font-weight:800;font-size:14px;color:var(--navy);">' + b.name + '</div>' +
                '<div style="font-size:11px;color:var(--gray-500);margin-top:2px;">' + b.desc + '</div>' +
            '</div>' +
            '<div style="width:14px;height:14px;border-radius:50%;background:' + b.color + ';flex-shrink:0;"></div>' +
        '</label>';
    }).join('');

    var overlay = document.createElement('div');
    overlay.id = 'gtAddBoardOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;animation:bxhFadeUp .3s ease;padding:20px;';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = '<div style="background:white;border-radius:18px;max-width:520px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3);overflow:hidden;">' +
        '<div style="background:linear-gradient(135deg,' + tabColor + ',' + tabColor + 'cc);color:white;padding:20px 24px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                '<div>' +
                    '<div style="font-size:18px;font-weight:900;">➕ Thêm Hạng Mục</div>' +
                    '<div style="font-size:12px;opacity:.8;margin-top:4px;">Chọn hạng mục cần tạo giải thưởng</div>' +
                '</div>' +
                '<button onclick="document.getElementById(\'gtAddBoardOverlay\').remove()" style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);color:white;width:36px;height:36px;border-radius:10px;font-size:18px;cursor:pointer;">✕</button>' +
            '</div>' +
        '</div>' +
        '<div style="padding:20px 24px;max-height:400px;overflow-y:auto;">' +
            '<div style="display:flex;flex-direction:column;gap:8px;">' + listHtml + '</div>' +
        '</div>' +
        '<div style="padding:16px 24px;border-top:1px solid var(--gray-200);display:flex;justify-content:space-between;align-items:center;">' +
            '<label style="font-size:12px;color:var(--gray-500);cursor:pointer;display:flex;align-items:center;gap:6px;">' +
                '<input type="checkbox" id="gtSelectAllBoards" onchange="document.querySelectorAll(\'.gt-add-board-cb\').forEach(function(c){c.checked=this.checked}.bind(this))" style="accent-color:' + tabColor + ';cursor:pointer;"> Chọn tất cả' +
            '</label>' +
            '<button onclick="_gtAddSelectedBoards()" style="background:linear-gradient(135deg,' + tabColor + ',' + tabColor + 'cc);color:white;border:none;padding:10px 24px;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;transition:all .2s;" onmouseover="this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.transform=\'\'">' +
                '✅ Thêm hạng mục đã chọn' +
            '</button>' +
        '</div>' +
    '</div>';

    var existing = document.getElementById('gtAddBoardOverlay');
    if (existing) existing.remove();
    document.body.appendChild(overlay);
}

function _gtAddSelectedBoards() {
    var checkboxes = document.querySelectorAll('.gt-add-board-cb:checked');
    if (checkboxes.length === 0) {
        showToast('Vui lòng chọn ít nhất 1 hạng mục!', 'error');
        return;
    }
    if (!_gtManuallyAddedBoards[_gtActiveTab]) _gtManuallyAddedBoards[_gtActiveTab] = [];
    checkboxes.forEach(function(cb) {
        var key = cb.value;
        if (_gtManuallyAddedBoards[_gtActiveTab].indexOf(key) === -1) {
            _gtManuallyAddedBoards[_gtActiveTab].push(key);
        }
    });
    var overlay = document.getElementById('gtAddBoardOverlay');
    if (overlay) overlay.remove();
    showToast('Đã thêm ' + checkboxes.length + ' hạng mục!', 'success');
    _renderGtBoards();
}

function _gtRemoveManualBoard(boardKey) {
    if (!_gtManuallyAddedBoards[_gtActiveTab]) return;
    _gtManuallyAddedBoards[_gtActiveTab] = _gtManuallyAddedBoards[_gtActiveTab].filter(function(k) { return k !== boardKey; });
    _renderGtBoards();
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

    // Validate: Bộ phận áp dụng bắt buộc
    if (departments.length === 0) {
        showToast('⚠️ Vui lòng chọn ít nhất 1 bộ phận áp dụng!', 'error');
        var deptBox = document.querySelector('.gt-dept-select[data-board="' + boardKey + '"]');
        if (deptBox) { deptBox.style.border = '2px solid #ef4444'; deptBox.focus(); setTimeout(function() { deptBox.style.border = ''; }, 3000); }
        return;
    }

    var minOrdersEl = document.getElementById('gtMinOrders_' + boardKey);
    var minRevenueEl = document.getElementById('gtMinRevenue_' + boardKey);
    var minCountEl = document.getElementById('gtMinCount_' + boardKey);

    var minOrders = minOrdersEl ? Number(minOrdersEl.value) || 0 : 0;
    var minRevenue = minRevenueEl ? Number(minRevenueEl.value) || 0 : 0;
    var minCount = minCountEl ? Number(minCountEl.value) || 0 : 0;

    // Validate: Điều kiện tối thiểu bắt buộc
    if (boardKey === 'hunterRanking' || boardKey === 'magnetRanking') {
        if (minCount <= 0) {
            showToast('⚠️ Vui lòng nhập điều kiện tối thiểu để lọt TOP!', 'error');
            if (minCountEl) { minCountEl.style.border = '2px solid #ef4444'; minCountEl.focus(); setTimeout(function() { minCountEl.style.border = ''; }, 3000); }
            return;
        }
    } else {
        if (minOrders <= 0 && minRevenue <= 0) {
            showToast('⚠️ Vui lòng nhập ít nhất 1 điều kiện tối thiểu (số đơn hoặc doanh số)!', 'error');
            if (minOrdersEl) { minOrdersEl.style.border = '2px solid #ef4444'; minOrdersEl.focus(); setTimeout(function() { minOrdersEl.style.border = ''; }, 3000); }
            return;
        }
    }

    var res = await apiCall('/api/affiliate/prizes', 'POST', {
        month: _gtSelectedMonth,
        board_key: boardKey,
        prizes: prizes,
        conditions: conditions,
        departments: departments,
        min_orders: minOrders,
        min_revenue: minRevenue,
        min_count: minCount,
        period_type: _gtSelectedPeriodType
    });
    if (res.success) { showToast('Đã lưu giải thưởng!'); await loadGiaiThuongData(); }
    else showToast(res.error || 'Lỗi', 'error');
}

// Lock/Unlock card inputs
function _gtLockCard(boardKey) {
    var card = document.getElementById('gtCard_' + boardKey);
    if (!card) return;
    card.setAttribute('data-locked', 'true');
    card.querySelectorAll('input:not([type=hidden]), select').forEach(function(el) {
        el.disabled = true;
        el.style.opacity = '0.6';
        el.style.cursor = 'not-allowed';
    });
    // Block clicks on the body area
    var body = card.querySelector('.gt-card-body');
    if (body) {
        body.style.pointerEvents = 'none';
        body.style.opacity = '0.7';
    }
    // Re-enable action buttons
    var actions = document.getElementById('gtActions_' + boardKey);
    if (actions) {
        actions.style.pointerEvents = 'auto';
        actions.style.opacity = '1';
    }
    card.querySelectorAll('.gt-remove-dept').forEach(function(el) { el.style.display = 'none'; });
    var header = card.querySelector('.gt-card-header');
    if (header && !header.querySelector('.gt-locked-badge')) {
        var badge = document.createElement('span');
        badge.className = 'gt-locked-badge';
        badge.innerHTML = '🔒';
        badge.style.cssText = 'position:absolute;top:8px;right:8px;font-size:16px;background:rgba(0,0,0,.3);padding:4px 8px;border-radius:8px;';
        header.appendChild(badge);
    }
    // Hide save btn
    var saveBtn = document.getElementById('gtSaveBtn_' + boardKey);
    if (saveBtn) saveBtn.style.display = 'none';
}

function _gtUnlockCard(boardKey) {
    var card = document.getElementById('gtCard_' + boardKey);
    if (!card) return;
    card.removeAttribute('data-locked');
    card.querySelectorAll('input:not([type=hidden]), select').forEach(function(el) {
        el.disabled = false;
        el.style.opacity = '';
        el.style.cursor = '';
    });
    var body = card.querySelector('.gt-card-body');
    if (body) {
        body.style.pointerEvents = '';
        body.style.opacity = '';
    }
    card.querySelectorAll('.gt-remove-dept').forEach(function(el) { el.style.display = ''; });
    var badge = card.querySelector('.gt-locked-badge');
    if (badge) badge.remove();
}

function _gtToggleEdit(boardKey) {
    var saveBtn = document.getElementById('gtSaveBtn_' + boardKey);
    if (saveBtn && saveBtn.style.display === 'none') {
        _gtUnlockCard(boardKey);
        saveBtn.style.display = '';
        showToast('Đã mở khóa chỉnh sửa. Nhấn Lưu khi xong.', 'info');
    } else {
        _gtLockCard(boardKey);
        if (saveBtn) saveBtn.style.display = 'none';
    }
}


async function deleteGtPrize(boardKey) {
    if (!confirm('Xóa tất cả giải thưởng của bảng này?')) return;
    var res = await apiCall('/api/affiliate/prizes?month=' + _gtSelectedMonth + '&board_key=' + boardKey + '&period_type=' + _gtSelectedPeriodType, 'DELETE');
    if (res.success) { showToast('Đã xóa giải thưởng'); await loadGiaiThuongData(); }
    else showToast(res.error || 'Lỗi', 'error');
}

// ========== BOARD EXPLAIN POPUP ==========
function _showBoardExplainPopup(boardKey) {
    // Find board info
    var boardInfo = null;
    var tabInfo = null;
    GT_TABS.forEach(function(tab) {
        GT_BOARDS[tab.id].forEach(function(b) {
            if (b.key === boardKey) { boardInfo = b; tabInfo = tab; }
        });
    });
    if (!boardInfo) return;

    // Find prizes for this board
    var prizes = _gtAllPrizes.filter(function(p) { return p.board_key === boardKey; });
    var medals = ['🥇','🥈','🥉'];
    var hasPrizes = prizes.length > 0;

    // Build prize tiers section
    var tiersHtml = '';
    if (hasPrizes) {
        tiersHtml += '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:16px;">';
        tiersHtml += '<div style="font-weight:800;font-size:13px;color:var(--navy);margin-bottom:10px;">🏆 Cơ cấu giải thưởng</div>';
        [1,2,3].forEach(function(rank) {
            var p = prizes.find(function(pp) { return pp.top_rank === rank; });
            if (p) {
                tiersHtml += '<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #e2e8f0;">';
                tiersHtml += '<span style="font-size:24px;">' + medals[rank-1] + '</span>';
                tiersHtml += '<div style="flex:1;"><div style="font-weight:700;font-size:13px;color:var(--navy);">Top ' + rank + '</div>';
                if (p.prize_description) tiersHtml += '<div style="font-size:11px;color:var(--gray-500);">' + p.prize_description + '</div>';
                tiersHtml += '</div>';
                tiersHtml += '<div style="font-weight:900;font-size:15px;color:#e65100;">' + _gtFmtMoney(p.prize_amount) + ' VNĐ</div>';
                tiersHtml += '</div>';
            }
        });
        var totalPrize = prizes.reduce(function(s, p) { return s + Number(p.prize_amount); }, 0);
        tiersHtml += '<div style="display:flex;justify-content:space-between;padding:10px 0 0;font-weight:900;font-size:14px;">';
        tiersHtml += '<span style="color:var(--navy);">Tổng giải thưởng:</span>';
        tiersHtml += '<span style="color:#e65100;">' + _gtFmtMoney(totalPrize) + ' VNĐ</span>';
        tiersHtml += '</div></div>';
    }

    // Build conditions section
    var condHtml = '';
    if (hasPrizes) {
        var minOrders = Number(prizes[0].min_orders) || 0;
        var minRevenue = Number(prizes[0].min_revenue) || 0;
        var minCount = Number(prizes[0].min_count) || 0;
        var conditions = prizes[0].conditions || '';
        var hasThresholds = minOrders > 0 || minRevenue > 0 || minCount > 0;

        if (hasThresholds || conditions) {
            condHtml += '<div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:16px;margin-bottom:16px;">';
            condHtml += '<div style="font-weight:800;font-size:13px;color:#92400e;margin-bottom:10px;">🎯 Điều kiện bắt buộc để lọt TOP</div>';
            if (minOrders > 0) condHtml += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="font-size:18px;">📦</span><span style="font-size:13px;color:#1e293b;">Số đơn hàng phải đạt <strong style="color:#e65100;">tối thiểu ' + minOrders + ' đơn</strong></span></div>';
            if (minRevenue > 0) condHtml += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="font-size:18px;">💰</span><span style="font-size:13px;color:#1e293b;">Doanh số phải đạt <strong style="color:#e65100;">tối thiểu ' + _gtFmtMoney(minRevenue) + ' VNĐ</strong></span></div>';
            if (minCount > 0) {
                var label = boardKey === 'hunterRanking' ? 'affiliate mới' : 'KH giới thiệu';
                condHtml += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="font-size:18px;">🎯</span><span style="font-size:13px;color:#1e293b;">Phải đạt <strong style="color:#e65100;">tối thiểu ' + minCount + ' ' + label + '</strong></span></div>';
            }
            condHtml += '<div style="background:#fef3c7;border-radius:8px;padding:10px;margin-top:8px;font-size:12px;color:#92400e;">';
            condHtml += '<strong>⚠️ Lưu ý:</strong> Dù bạn đứng đầu bảng nhưng nếu không đạt các điều kiện trên, bạn sẽ <strong>không được tính vào TOP</strong> và không nhận giải.';
            condHtml += '</div>';
            if (conditions) {
                condHtml += '<div style="margin-top:10px;font-size:13px;color:#1e293b;"><strong>📝 Ghi chú:</strong> ' + conditions + '</div>';
            }
            condHtml += '</div>';
        }
    }

    // Build departments section
    var deptHtml = '';
    if (hasPrizes) {
        var depts = [];
        try { depts = JSON.parse(prizes[0].departments || '[]'); } catch(e) {}
        if (depts.length > 0) {
            var deptNames = depts.map(function(did) {
                var t = _gtTeamsList.find(function(tm) { return tm.id == did; });
                return t ? t.name : ('ID:' + did);
            });
            deptHtml += '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;margin-bottom:16px;">';
            deptHtml += '<div style="font-weight:800;font-size:13px;color:#1e40af;margin-bottom:8px;">🏢 Bộ phận áp dụng</div>';
            deptHtml += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
            deptNames.forEach(function(n) {
                deptHtml += '<span style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:700;">' + n + '</span>';
            });
            deptHtml += '</div>';
            deptHtml += '<div style="font-size:11px;color:#6b7280;margin-top:8px;">Chỉ nhân viên thuộc các bộ phận trên mới được tham gia xếp hạng.</div>';
            deptHtml += '</div>';
        }
    }

    // Build explanation based on board type
    var explainHtml = '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin-bottom:16px;">';
    explainHtml += '<div style="font-weight:800;font-size:13px;color:#166534;margin-bottom:10px;">💡 Cách tính xếp hạng</div>';
    var explanations = {
        'teamRevenue': 'Tổng doanh số affiliate của <strong>tất cả thành viên trong team</strong> được cộng lại. Team nào có tổng doanh số cao nhất sẽ xếp hạng cao nhất.',
        'employeeRevenue': 'Doanh số affiliate mà <strong>các khách hàng của nhân viên</strong> tạo ra. Nhân viên quản lý affiliate có doanh số cao nhất sẽ đứng đầu.',
        'employeeOrders': 'Tổng <strong>số lượng đơn hàng affiliate</strong> mà nhân viên quản lý. Nhân viên có nhiều đơn nhất sẽ đứng đầu.',
        'affiliateRevenue': '<strong>Khách hàng affiliate</strong> có doanh số bán hàng cao nhất. Xếp hạng theo doanh số cá nhân của từng khách affiliate.',
        'hunterRanking': 'Nhân viên nào <strong>tuyển được nhiều affiliate mới nhất</strong> trong tháng sẽ đứng đầu. Tính theo số lượng affiliate mới đăng ký.',
        'magnetRanking': 'Nhân viên nào có affiliate <strong>giới thiệu được nhiều khách hàng mới nhất</strong> sẽ đứng đầu.'
    };
    var explainText = explanations[boardKey] || 'Xếp hạng dựa trên hiệu suất và chỉ số đạt được trong tháng. Người có kết quả tốt nhất sẽ đứng đầu bảng.';
    explainHtml += '<div style="font-size:13px;color:#1e293b;line-height:1.6;">' + explainText + '</div>';
    explainHtml += '</div>';

    // Not set up yet message
    var notSetupHtml = '';
    if (!hasPrizes) {
        notSetupHtml = '<div style="text-align:center;padding:30px;"><div style="font-size:48px;margin-bottom:12px;">🎯</div>';
        notSetupHtml += '<div style="font-size:14px;font-weight:700;color:var(--navy);">Giải thưởng chưa được thiết lập</div>';
        notSetupHtml += '<div style="font-size:12px;color:var(--gray-500);margin-top:4px;">Admin cần vào Setup Giải Thưởng Game để cấu hình giải cho bảng này.</div></div>';
    }

    // Create popup
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;animation:bxhFadeUp .3s ease;';
    overlay.id = 'gtExplainOverlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = '<div style="background:white;border-radius:18px;max-width:600px;width:92%;max-height:88vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);">' +
        '<div style="background:linear-gradient(135deg,' + boardInfo.color + ',' + boardInfo.color + 'cc);color:white;padding:24px;border-radius:18px 18px 0 0;position:relative;">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
                '<div>' +
                    '<div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;opacity:.7;">' + tabInfo.label + '</div>' +
                    '<div style="font-size:24px;font-weight:900;margin-top:6px;">' + boardInfo.name + '</div>' +
                    '<div style="font-size:13px;opacity:.85;margin-top:4px;">' + boardInfo.desc + '</div>' +
                    '<div style="font-size:11px;opacity:.6;margin-top:6px;">Tháng ' + _gtSelectedMonth.split('-')[1] + '/' + _gtSelectedMonth.split('-')[0] + '</div>' +
                '</div>' +
                '<button onclick="document.getElementById(\'gtExplainOverlay\').remove()" style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);color:white;width:36px;height:36px;border-radius:10px;font-size:18px;cursor:pointer;flex-shrink:0;margin-top:-4px;">✕</button>' +
            '</div>' +
        '</div>' +
        '<div style="padding:20px 24px;">' +
            explainHtml +
            (hasPrizes ? tiersHtml + condHtml + deptHtml : notSetupHtml) +
        '</div>' +
    '</div>';

    // Remove existing overlay if any
    var existing = document.getElementById('gtExplainOverlay');
    if (existing) existing.remove();
    document.body.appendChild(overlay);
}
