// ========== TRAO GIẢI THƯỞNG (HALL OF FAME) ==========

var _tgSelectedMonth = '';
var _tgSelectedYear = 0;
var _tgSelectedPeriodType = 'monthly';
var _tgAllPrizes = [];
var _tgAllAwards = [];
var _tgDeptUsers = [];
var _tgLeaderboardData = {};

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
    _tgSelectedPeriodType = 'monthly';

    var periodTabsHtml = '';
    [{id:'daily',icon:'📆',label:'Ngày'},{id:'weekly',icon:'📅',label:'Tuần'},{id:'monthly',icon:'📅',label:'Tháng'},{id:'quarterly',icon:'📊',label:'Quý'}].forEach(function(pt) {
        var active = pt.id === 'monthly';
        periodTabsHtml += '<button class="tg-period-tab" data-period="' + pt.id + '" style="padding:8px 18px;font-weight:700;font-size:13px;cursor:pointer;border:none;border-bottom:3px solid ' + (active ? '#e65100' : 'transparent') + ';color:' + (active ? '#e65100' : 'var(--gray-500)') + ';background:none;transition:all .2s;">' + pt.icon + ' ' + pt.label + '</button>';
    });

    var yearOpts = '';
    for (var yr = curYear; yr <= 2060; yr++) {
        yearOpts += '<option value="' + yr + '" ' + (yr === curYear ? 'selected' : '') + '>' + yr + '</option>';
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
                    <h3 style="margin:0;color:var(--navy);font-size:15px;">📅 Xem theo kỳ</h3>\
                    <div style="display:flex;gap:8px;">\
                        <select id="tgPeriodValue" class="form-control" style="width:auto;min-width:200px;" onchange="_tgUpdatePeriod()">\
                            ' + _gtBuildPeriodOptions('monthly') + '\
                        </select>\
                    </div>\
                </div>\
                <div style="display:flex;gap:0;border-bottom:2px solid var(--gray-200);margin-top:10px;" id="tgPeriodTabs">\
                    ' + periodTabsHtml + '\
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

    // Attach period tab clicks
    document.querySelectorAll('.tg-period-tab').forEach(function(btn) {
        btn.addEventListener('click', function() {
            _tgSelectedPeriodType = this.getAttribute('data-period');
            document.querySelectorAll('.tg-period-tab').forEach(function(b) {
                b.style.borderBottomColor = 'transparent';
                b.style.color = 'var(--gray-500)';
            });
            this.style.borderBottomColor = '#e65100';
            this.style.color = '#e65100';
            var picker = document.getElementById('tgPeriodValue');
            picker.innerHTML = _gtBuildPeriodOptions(_tgSelectedPeriodType);
            _tgUpdatePeriod();
        });
    });

    await Promise.all([loadTraoGiaiData(), loadTgAnnualData()]);
}

function _tgUpdatePeriod() {
    var el = document.getElementById('tgPeriodValue');
    _tgSelectedMonth = el ? el.value : '';
    loadTraoGiaiData();
}

async function loadTraoGiaiData() {
    var gridEl = document.getElementById('tgAwardsGrid');
    gridEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-500);grid-column:1/-1;">⏳ Đang tải...</div>';

    var [pData, aData] = await Promise.all([
        apiCall('/api/affiliate/prizes?month=' + _tgSelectedMonth + '&period_type=' + _tgSelectedPeriodType),
        apiCall('/api/affiliate/awards?month=' + _tgSelectedMonth + '&period_type=' + _tgSelectedPeriodType)
    ]);
    // Fetch leaderboard data for current period
    var periodMap = {daily:'daily',weekly:'weekly',monthly:'month',quarterly:'quarter'};
    var lbPeriod = periodMap[_tgSelectedPeriodType] || 'month';
    var lbData = {};
    try { lbData = await apiCall('/api/affiliate/leaderboard?period=' + lbPeriod + '&value=' + _tgSelectedMonth); } catch(e) {}
    _tgLeaderboardData = lbData;
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

    // Group by board_key
    var groups = {};
    var groupOrder = [];
    pending.forEach(function(p) {
        if (!groups[p.board_key]) {
            groups[p.board_key] = [];
            groupOrder.push(p.board_key);
        }
        groups[p.board_key].push(p);
    });

    var medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    var totalPending = pending.length;

    var html = '<div class="tg-pending"><h4>⏳ Giải thưởng chưa trao (' + totalPending + ')</h4>';

    groupOrder.forEach(function(boardKey, gIdx) {
        var items = groups[boardKey];
        var info = _tgGetBoardInfo(boardKey);
        var totalAmt = items.reduce(function(s, p) { return s + Number(p.prize_amount); }, 0);
        var groupId = 'tgPendGroup_' + gIdx;

        // Get filtered rankings for this board
        var rankings = (_tgLeaderboardData[boardKey] || []).slice();
        var sample = items[0];
        var minOrders = Number(sample.min_orders) || 0;
        var minRevenue = Number(sample.min_revenue) || 0;
        var minCount = Number(sample.min_count) || 0;
        if (boardKey === 'hunterRanking' && minCount > 0) {
            rankings = rankings.filter(function(r) { return (r.affiliate_count || 0) >= minCount; });
        } else if (boardKey === 'magnetRanking' && minCount > 0) {
            rankings = rankings.filter(function(r) { return (r.total_customers || 0) >= minCount; });
        } else {
            if (minOrders > 0) rankings = rankings.filter(function(r) { return (r.total_orders || 0) >= minOrders; });
            if (minRevenue > 0) rankings = rankings.filter(function(r) { return (r.total_revenue || 0) >= minRevenue; });
        }

        // Group header (clickable to expand)
        html += '<div style="border:1px solid ' + info.color + '30;border-radius:10px;margin-bottom:8px;overflow:hidden;">';
        html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;cursor:pointer;background:linear-gradient(135deg,' + info.color + '10,' + info.color + '05);transition:background .2s;" onclick="var d=document.getElementById(\'' + groupId + '\');d.style.display=d.style.display===\'none\'?\'block\':\'none\';this.querySelector(\'.tg-arrow\').textContent=d.style.display===\'none\'?\'▶\':\'▼\'">';
        html += '<div style="display:flex;align-items:center;gap:10px;">';
        html += '<span class="tg-arrow" style="font-size:12px;color:' + info.color + ';transition:transform .2s;">▶</span>';
        html += '<div style="width:6px;height:28px;border-radius:3px;background:' + info.color + ';"></div>';
        html += '<div><div style="font-weight:800;font-size:13px;color:var(--navy);">' + info.boardName + ' <span style="font-weight:500;font-size:11px;color:var(--gray-500);">( ' + info.boardDesc + ' )</span></div>';
        html += '<div style="font-size:11px;color:var(--gray-500);">' + items.length + ' giải chưa trao · Tổng: <strong style="color:#e65100;">' + _tgFmt(totalAmt) + ' VNĐ</strong></div></div>';
        html += '</div>';
        html += '<div style="display:flex;align-items:center;gap:6px;">';
        html += '<button class="tg-btn" style="font-size:10px;padding:3px 10px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;border:none;border-radius:6px;font-weight:700;cursor:pointer;" onclick="event.stopPropagation();_showTgBoardExplainPopup(\'' + boardKey + '\')">📋 Điều kiện</button>';
        items.forEach(function(p) { html += '<span style="font-size:16px;">' + (medals[p.top_rank - 1] || '') + '</span>'; });
        html += '</div></div>';

        // Expandable content (hidden by default)
        html += '<div id="' + groupId + '" style="display:none;border-top:1px solid ' + info.color + '20;padding:0 14px 10px;">';
        items.forEach(function(p) {
            var currentWinner = rankings[p.top_rank - 1] || null;
            html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--gray-100);flex-wrap:wrap;gap:6px;">';
            html += '<div style="flex:1;min-width:180px;cursor:pointer;" onclick="showTgPrizeDetail(\'' + p.board_key + '\',' + p.top_rank + ',false)">';
            html += '<div style="display:flex;align-items:center;gap:8px;">';
            html += '<span style="font-size:20px;">' + (medals[p.top_rank - 1] || '') + '</span>';
            html += '<div><div style="font-weight:700;font-size:13px;color:var(--navy);">Top ' + p.top_rank + ' — <span style="color:#e65100;">' + _tgFmt(p.prize_amount) + ' VNĐ</span></div>';
            if (currentWinner) {
                html += '<div style="font-size:11px;color:#059669;font-weight:600;margin-top:2px;">🏅 Đang dẫn đầu: <strong>' + currentWinner.name + '</strong></div>';
            } else {
                html += '<div style="font-size:11px;color:#9ca3af;margin-top:2px;">Chưa có ai đạt điều kiện</div>';
            }
            html += '</div></div></div>';
            html += '<div style="display:flex;align-items:center;gap:6px;">';
            if (currentWinner) {
                html += '<button class="tg-btn" style="font-size:11px;padding:4px 12px;background:var(--info);color:white;" onclick="event.stopPropagation();showTgPrizeDetail(\'' + p.board_key + '\',' + p.top_rank + ',false)">🔍 Chi tiết</button>';
                if (canAward) {
                    html += '<button class="tg-btn tg-btn-primary" style="font-size:11px;padding:4px 12px;" onclick="event.stopPropagation();openTgAwardForm(\'' + p.board_key + '\',' + p.top_rank + ',' + p.prize_amount + ',\'' + (p.prize_description || '').replace(/'/g, "\\'") + '\',\'' + (p.departments || '[]').replace(/'/g, "\\'") + '\')">🎖 Trao giải</button>';
                }
            }
            html += '</div></div>';
        });
        html += '</div></div>';
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

        return '<div class="tg-award-card" style="cursor:pointer;" onclick="showTgPrizeDetail(\'' + a.board_key + '\',' + a.top_rank + ',true,' + a.id + ')">\
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
                ' + (canDelete ? '<button class="tg-btn" style="position:absolute;top:10px;right:10px;background:rgba(239,68,68,.9);color:white;font-size:10px;padding:3px 8px;" onclick="event.stopPropagation();deleteTgAward(' + a.id + ')">🗑</button>' : '') + '\
            </div>\
        </div>';
    }).join('');
}

async function openTgAwardForm(boardKey, topRank, prizeAmount, prizeDesc, deptJson) {
    var info = _tgGetBoardInfo(boardKey);
    var medals = ['🥇','🥈','🥉'];
    var isTeam = boardKey.indexOf('team') !== -1 || boardKey.indexOf('Đội') !== -1;

    // Determine expected winner from BXH data
    var rankings = (_tgLeaderboardData[boardKey] || []).slice();
    var prizeConfig = _tgAllPrizes.find(function(p) { return p.board_key === boardKey && p.top_rank === topRank; });
    var minOrders = prizeConfig ? (Number(prizeConfig.min_orders) || 0) : 0;
    var minRevenue = prizeConfig ? (Number(prizeConfig.min_revenue) || 0) : 0;
    var minCount = prizeConfig ? (Number(prizeConfig.min_count) || 0) : 0;
    // Apply threshold filter
    if (boardKey === 'hunterRanking' && minCount > 0) {
        rankings = rankings.filter(function(r) { return (r.affiliate_count || 0) >= minCount; });
    } else if (boardKey === 'magnetRanking' && minCount > 0) {
        rankings = rankings.filter(function(r) { return (r.total_customers || 0) >= minCount; });
    } else {
        if (minOrders > 0) rankings = rankings.filter(function(r) { return (r.total_orders || 0) >= minOrders; });
        if (minRevenue > 0) rankings = rankings.filter(function(r) { return (r.total_revenue || 0) >= minRevenue; });
    }
    var expectedWinner = rankings[topRank - 1] || null;
    var expectedName = expectedWinner ? expectedWinner.name : '';

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

    var preSelectedName = expectedWinner ? expectedName : '';
    var teamOpts = '';
    if (isTeam) {
        try {
            var tRes = await apiCall('/api/departments');
            (tRes.departments || []).filter(function(d) { return d.status === 'active'; }).forEach(function(t) {
                var sel = '';
                if (expectedWinner && (t.id === expectedWinner.id || t.name === expectedName)) {
                    sel = ' selected';
                    preSelectedName = t.name;
                }
                teamOpts += '<option value="' + t.id + '"' + sel + '>' + t.name + '</option>';
            });
        } catch(e) {}
    }

    // Build user options, auto-select expected winner (ONLY for individual awards, NOT team)
    var userOpts = '<option value="">-- Chọn nhân viên --</option>';
    var matchedExpected = false;
    if (!isTeam) {
        // Get expected winner's user ID from leaderboard data
        var expectedUserId = expectedWinner ? (expectedWinner.user_id || expectedWinner.manager_id || expectedWinner.id || null) : null;
        _tgDeptUsers.forEach(function(u) {
            var selected = '';
            if (expectedWinner && !matchedExpected) {
                // Match by ID first (most reliable), then by name
                if (expectedUserId && u.id === expectedUserId) {
                    selected = ' selected';
                    preSelectedName = u.full_name;
                    matchedExpected = true;
                } else {
                    var eName = expectedName.toLowerCase().trim();
                    var uName = (u.full_name || '').toLowerCase().trim();
                    var uUsername = (u.username || '').toLowerCase().trim();
                    if (uName === eName || uUsername === eName || eName.includes(uName) || uName.includes(eName)) {
                        selected = ' selected';
                        preSelectedName = u.full_name;
                        matchedExpected = true;
                    }
                }
            }
            userOpts += '<option value="' + u.id + '"' + selected + '>' + u.full_name + '</option>';
        });
    }

    // Build recommendation banner
    var recommendHtml = '';
    if (expectedWinner) {
        recommendHtml = '<div id="tgRecommendBanner" style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #86efac;border-radius:10px;padding:12px;margin-bottom:12px;">' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
            '<span style="font-size:20px;">✅</span>' +
            '<div><div style="font-weight:800;font-size:12px;color:#166534;">GỢI Ý TỪ BXH</div>' +
            '<div style="font-size:13px;color:#1e293b;margin-top:2px;">Theo BXH, người đứng <strong>Top ' + topRank + '</strong> hiện tại là: <strong style="color:#059669;">' + expectedName + '</strong></div></div>' +
            '</div></div>';
    } else {
        recommendHtml = '<div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:12px;margin-bottom:12px;">' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
            '<span style="font-size:20px;">⚠️</span>' +
            '<div style="font-size:13px;color:#92400e;">Không có ai đạt đủ điều kiện cho Top ' + topRank + ' trong BXH hiện tại.</div>' +
            '</div></div>';
    }

    // Warning div (shown when user selects different person)
    var warningDiv = '<div id="tgMismatchWarning" style="display:none;background:linear-gradient(135deg,#fff7ed,#ffedd5);border:1px solid #fed7aa;border-radius:10px;padding:12px;margin-bottom:12px;">' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
        '<span style="font-size:20px;">⚠️</span>' +
        '<div style="font-weight:700;font-size:12px;color:#c2410c;">CẢNH BÁO: Người bạn chọn KHÔNG PHẢI người đang giữ Top ' + topRank + ' trong BXH. Hãy kiểm tra lại!</div>' +
        '</div></div>';

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
            ' + recommendHtml + '\
            ' + warningDiv + '\
            ' + (isTeam ? '\
                <label>🏢 Chọn Team</label>\
                <select id="tgWinnerTeam" disabled style="background:#f1f5f9;cursor:not-allowed;opacity:0.8;"><option value="">-- Chọn team --</option>' + teamOpts + '</select>\
                <input type="hidden" id="tgWinnerType" value="team">\
            ' : '\
                <label>👤 Người Nhận Giải' + (depts.length > 0 ? ' (từ bộ phận áp dụng)' : '') + '</label>\
                <select id="tgWinnerUser" disabled style="background:#f1f5f9;cursor:not-allowed;opacity:0.8;">\
                    ' + userOpts + '\
                </select>\
                <input type="hidden" id="tgWinnerType" value="individual">\
            ') + '\
            <label>Tên hiển thị</label>\
            <input type="text" id="tgWinnerName" placeholder="Tên người/team nhận giải..." value="' + preSelectedName.replace(/"/g, '&quot;') + '" readonly style="background:#f1f5f9;cursor:not-allowed;">\
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

function _tgCheckWinnerMatch(selectEl, expectedName) {
    var o = selectEl.options[selectEl.selectedIndex];
    var selectedName = o.text !== '-- Chọn nhân viên --' ? o.text : '';
    document.getElementById('tgWinnerName').value = selectedName;

    var warnEl = document.getElementById('tgMismatchWarning');
    if (warnEl && expectedName && selectedName && selectedName !== expectedName) {
        warnEl.style.display = 'block';
    } else if (warnEl) {
        warnEl.style.display = 'none';
    }
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
    formData.append('period_type', _tgSelectedPeriodType);
    formData.append('photo_winner', photo1);
    formData.append('photo_certificate', photo2);

    var userEl = document.getElementById('tgWinnerUser');
    if (userEl) { userEl.disabled = false; if (userEl.value) formData.append('winner_user_id', userEl.value); userEl.disabled = true; }
    var teamEl = document.getElementById('tgWinnerTeam');
    if (teamEl) { teamEl.disabled = false; if (teamEl.value) formData.append('winner_team_id', teamEl.value); teamEl.disabled = true; }

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

// ========== DETAIL POPUP ==========
function showTgPrizeDetail(boardKey, topRank, isAwarded, awardId) {
    var info = _tgGetBoardInfo(boardKey);
    var medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
    var medal = medals[topRank - 1] || '🏅';

    // Find prize config
    var prizeConfig = _tgAllPrizes.find(function(p) { return p.board_key === boardKey && p.top_rank === topRank; });
    var prizeAmount = prizeConfig ? prizeConfig.prize_amount : 0;
    var conditions = prizeConfig ? (prizeConfig.conditions || '') : '';
    var minOrders = prizeConfig ? (Number(prizeConfig.min_orders) || 0) : 0;
    var minRevenue = prizeConfig ? (Number(prizeConfig.min_revenue) || 0) : 0;
    var minCount = prizeConfig ? (Number(prizeConfig.min_count) || 0) : 0;

    // Find award (if awarded)
    var award = null;
    if (isAwarded && awardId) {
        award = _tgAllAwards.find(function(a) { return a.id === awardId; });
    }

    // Get leaderboard rankings with threshold filter
    var rankings = (_tgLeaderboardData[boardKey] || []).slice();
    if (boardKey === 'hunterRanking' && minCount > 0) {
        rankings = rankings.filter(function(r) { return (r.affiliate_count || 0) >= minCount; });
    } else if (boardKey === 'magnetRanking' && minCount > 0) {
        rankings = rankings.filter(function(r) { return (r.total_customers || 0) >= minCount; });
    } else {
        if (minOrders > 0) rankings = rankings.filter(function(r) { return (r.total_orders || 0) >= minOrders; });
        if (minRevenue > 0) rankings = rankings.filter(function(r) { return (r.total_revenue || 0) >= minRevenue; });
    }
    var currentWinner = rankings[topRank - 1] || null;

    // Build conditions HTML
    var condHtml = '';
    var hasThresholds = minOrders > 0 || minRevenue > 0 || minCount > 0;
    if (hasThresholds || conditions) {
        condHtml += '<div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:14px;margin-bottom:16px;">';
        condHtml += '<div style="font-weight:800;font-size:13px;color:#92400e;margin-bottom:8px;">🎯 Điều kiện tối thiểu để lọt TOP</div>';
        if (minOrders > 0) condHtml += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;"><span style="font-size:16px;">📦</span><span style="font-size:13px;color:#1e293b;">Phải đạt tối thiểu <strong style="color:#e65100;">' + minOrders + ' đơn hàng</strong> trở lên</span></div>';
        if (minRevenue > 0) condHtml += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;"><span style="font-size:16px;">💰</span><span style="font-size:13px;color:#1e293b;">Doanh số phải đạt tối thiểu <strong style="color:#e65100;">' + _tgFmt(minRevenue) + ' VNĐ</strong> trở lên</span></div>';
        if (minCount > 0) {
            var countLabel = boardKey === 'hunterRanking' ? 'affiliate mới' : 'KH giới thiệu';
            condHtml += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;"><span style="font-size:16px;">🎯</span><span style="font-size:13px;color:#1e293b;">Phải đạt tối thiểu <strong style="color:#e65100;">' + minCount + ' ' + countLabel + '</strong> trở lên</span></div>';
        }
        if (conditions) condHtml += '<div style="display:flex;align-items:center;gap:8px;margin-top:6px;"><span style="font-size:16px;">📋</span><span style="font-size:13px;color:#1e293b;">' + conditions + '</span></div>';
        condHtml += '</div>';
    }

    // Build winner stats HTML
    var statsHtml = '';
    if (currentWinner) {
        var statItems = [];
        if (currentWinner.total_orders !== undefined) statItems.push({icon:'📦', label:'Số đơn hàng', value: currentWinner.total_orders, check: minOrders > 0, min: minOrders, pass: (currentWinner.total_orders || 0) >= minOrders, drillType: 'orders'});
        if (currentWinner.total_revenue !== undefined) statItems.push({icon:'💰', label:'Doanh số', value: _tgFmt(currentWinner.total_revenue) + ' VNĐ', check: minRevenue > 0, min: _tgFmt(minRevenue) + ' VNĐ', pass: (currentWinner.total_revenue || 0) >= minRevenue, drillType: 'orders'});
        if (currentWinner.affiliate_count !== undefined) statItems.push({icon:'🔑', label:'Số affiliate', value: currentWinner.affiliate_count, check: (boardKey === 'hunterRanking' && minCount > 0), min: minCount, pass: (currentWinner.affiliate_count || 0) >= minCount, drillType: 'affiliates'});
        if (currentWinner.total_customers !== undefined) statItems.push({icon:'👥', label:'Số KH giới thiệu', value: currentWinner.total_customers, check: (boardKey === 'magnetRanking' && minCount > 0), min: minCount, pass: (currentWinner.total_customers || 0) >= minCount, drillType: 'customers'});
        if (currentWinner.member_count !== undefined) statItems.push({icon:'👥', label:'Số thành viên', value: currentWinner.member_count, check: false, drillType: null});

        statsHtml += '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px;margin-bottom:16px;">';
        statsHtml += '<div style="font-weight:800;font-size:13px;color:#166534;margin-bottom:10px;">📊 Thống kê chi tiết — ' + currentWinner.name + '</div>';
        statItems.forEach(function(s, sIdx) {
            var checkBadge = '';
            if (s.check) {
                checkBadge = s.pass
                    ? '<span style="background:#22c55e;color:white;font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700;">✅ Đạt (≥' + s.min + ')</span>'
                    : '<span style="background:#ef4444;color:white;font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700;">❌ Chưa đạt (cần ≥' + s.min + ')</span>';
            }
            var clickAttr = s.drillType ? ' style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #dcfce7;cursor:pointer;transition:background .2s;border-radius:6px;padding-left:4px;padding-right:4px;" onmouseover="this.style.background=\'#dcfce7\'" onmouseout="this.style.background=\'\'" onclick="_tgLoadDrillDown(\'' + boardKey + '\',' + currentWinner.id + ',\'' + _tgSelectedMonth + '\',\'' + s.drillType + '\',' + sIdx + ')"' : ' style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #dcfce7;"';
            statsHtml += '<div' + clickAttr + '>';
            statsHtml += '<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:16px;">' + s.icon + '</span><span style="font-size:13px;color:#1e293b;">' + s.label + (s.drillType ? ' <span style="font-size:10px;color:#22c55e;">▶ xem</span>' : '') + '</span></div>';
            statsHtml += '<div style="display:flex;align-items:center;gap:8px;"><strong style="font-size:14px;color:#1e293b;">' + s.value + '</strong>' + checkBadge + '</div>';
            statsHtml += '</div>';
            statsHtml += '<div id="tgDrill_' + sIdx + '" style="display:none;"></div>';
        });
        statsHtml += '</div>';
    }

    // Build top 5 rankings
    var top5Html = '';
    var top5 = rankings.slice(0, 5);
    if (top5.length > 0) {
        top5Html += '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;">';
        top5Html += '<div style="font-weight:800;font-size:13px;color:var(--navy);margin-bottom:10px;">🏆 BXH hiện tại — Top 5 (đã lọc theo điều kiện)</div>';
        top5.forEach(function(r, i) {
            var isTop = (i + 1) === topRank;
            var rowBg = isTop ? 'background:linear-gradient(135deg,#fff7ed,#ffedd5);border:1px solid #fed7aa;' : '';
            var rankLabel = (medals[i] || '#' + (i+1));

            var valueLabel = '';
            if (boardKey === 'hunterRanking') valueLabel = (r.affiliate_count || 0) + ' affiliate';
            else if (boardKey === 'magnetRanking') valueLabel = (r.total_customers || 0) + ' KH';
            else if (boardKey === 'employeeOrders') valueLabel = (r.total_orders || 0) + ' đơn · ' + _tgFmt(r.total_revenue) + ' VNĐ';
            else valueLabel = _tgFmt(r.total_revenue) + ' VNĐ · ' + (r.total_orders || 0) + ' đơn';

            top5Html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;margin-bottom:4px;' + rowBg + '">';
            top5Html += '<span style="font-size:18px;width:28px;text-align:center;">' + rankLabel + '</span>';
            top5Html += '<div style="flex:1;"><div style="font-weight:700;font-size:13px;color:var(--navy);">' + r.name + '</div>';
            top5Html += '<div style="font-size:11px;color:var(--gray-500);">' + valueLabel + '</div></div>';
            if (isTop) top5Html += '<span style="background:#e65100;color:white;font-size:10px;padding:3px 10px;border-radius:10px;font-weight:700;">← Top ' + topRank + '</span>';
            top5Html += '</div>';
        });
        if (rankings.length === 0) {
            top5Html += '<div style="text-align:center;padding:16px;color:var(--gray-400);font-size:13px;">Không có ai đạt đủ điều kiện tối thiểu</div>';
        }
        top5Html += '</div>';
    }

    // Winner section (for awarded)
    var winnerHtml = '';
    if (award) {
        winnerHtml += '<div style="background:linear-gradient(135deg,#1a1a2e,#2d1810);border-radius:12px;padding:16px;margin-bottom:16px;color:white;display:flex;gap:14px;align-items:center;">';
        if (award.photo_winner) winnerHtml += '<img src="' + award.photo_winner + '" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid #ffd700;">';
        winnerHtml += '<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;opacity:.6;">Người nhận giải</div>';
        winnerHtml += '<div style="font-size:18px;font-weight:900;color:#ffd700;">' + award.winner_name + '</div>';
        winnerHtml += '<div style="font-size:14px;font-weight:700;color:#fbbf24;margin-top:4px;">💰 ' + _tgFmt(award.prize_amount) + ' VNĐ</div></div></div>';
    }

    // Lý do đạt giải
    var reasonHtml = '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px;margin-bottom:16px;">';
    reasonHtml += '<div style="font-weight:800;font-size:13px;color:#1e40af;margin-bottom:8px;">💡 Lý do đạt Top ' + topRank + '</div>';
    if (currentWinner) {
        if (boardKey === 'teamRevenue') reasonHtml += '<p style="font-size:13px;color:#1e293b;margin:0;">Team <strong>' + currentWinner.name + '</strong> có tổng doanh số affiliate cao thứ <strong>' + topRank + '</strong> trong tháng, đạt <strong>' + _tgFmt(currentWinner.total_revenue) + ' VNĐ</strong> với <strong>' + (currentWinner.affiliate_count || 0) + ' affiliate</strong>.</p>';
        else if (boardKey === 'employeeOrders') reasonHtml += '<p style="font-size:13px;color:#1e293b;margin:0;"><strong>' + currentWinner.name + '</strong> đạt <strong>' + (currentWinner.total_orders || 0) + ' đơn hàng</strong> affiliate — nhiều thứ <strong>' + topRank + '</strong> trong tháng.</p>';
        else if (boardKey === 'affiliateRevenue') reasonHtml += '<p style="font-size:13px;color:#1e293b;margin:0;">Khách affiliate <strong>' + currentWinner.name + '</strong> có doanh số <strong>' + _tgFmt(currentWinner.total_revenue) + ' VNĐ</strong> — cao thứ <strong>' + topRank + '</strong> trong tháng.</p>';
        else if (boardKey === 'employeeRevenue') reasonHtml += '<p style="font-size:13px;color:#1e293b;margin:0;"><strong>' + currentWinner.name + '</strong> quản lý affiliate đạt tổng doanh số <strong>' + _tgFmt(currentWinner.total_revenue) + ' VNĐ</strong> — cao thứ <strong>' + topRank + '</strong>.</p>';
        else if (boardKey === 'hunterRanking') reasonHtml += '<p style="font-size:13px;color:#1e293b;margin:0;"><strong>' + currentWinner.name + '</strong> tuyển được <strong>' + (currentWinner.affiliate_count || 0) + ' affiliate mới</strong> — nhiều thứ <strong>' + topRank + '</strong> trong tháng.</p>';
        else if (boardKey === 'magnetRanking') reasonHtml += '<p style="font-size:13px;color:#1e293b;margin:0;"><strong>' + currentWinner.name + '</strong> có affiliate giới thiệu <strong>' + (currentWinner.total_customers || 0) + ' khách hàng</strong> — nhiều thứ <strong>' + topRank + '</strong>.</p>';
        if (hasThresholds) reasonHtml += '<p style="font-size:12px;color:#6b7280;margin:8px 0 0;">Đã vượt qua tất cả điều kiện tối thiểu được thiết lập.</p>';
    } else {
        reasonHtml += '<p style="font-size:13px;color:#9ca3af;margin:0;">Chưa có ai đạt đủ điều kiện cho vị trí này.</p>';
    }
    reasonHtml += '</div>';

    // Build popup
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;animation:bxhFadeUp .3s ease;';
    overlay.id = 'tgDetailOverlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = '<div style="background:white;border-radius:16px;max-width:650px;width:92%;max-height:88vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);">' +
        '<div style="background:linear-gradient(135deg,' + info.color + ',' + info.color + 'cc);color:white;padding:20px 24px;border-radius:16px 16px 0 0;position:relative;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                '<div><div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;opacity:.7;">Chi tiết giải thưởng</div>' +
                '<div style="font-size:22px;font-weight:900;margin-top:4px;">' + medal + ' ' + info.boardName + '</div>' +
                '<div style="font-size:12px;opacity:.8;margin-top:2px;">' + info.boardDesc + ' — Top ' + topRank + '</div>' +
                '<div style="font-size:18px;font-weight:900;color:#ffd700;margin-top:6px;">💰 ' + _tgFmt(prizeAmount) + ' VNĐ</div></div>' +
                '<button onclick="document.getElementById(\'tgDetailOverlay\').remove()" style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);color:white;width:36px;height:36px;border-radius:10px;font-size:18px;cursor:pointer;flex-shrink:0;">✕</button>' +
            '</div>' +
        '</div>' +
        '<div style="padding:20px 24px;">' +
            winnerHtml +
            reasonHtml +
            condHtml +
            statsHtml +
            top5Html +
        '</div>' +
    '</div>';
    document.body.appendChild(overlay);
}

// ========== BOARD EXPLAIN POPUP (Trang Trao Giải) ==========
var _tgDeptCache = null;
async function _showTgBoardExplainPopup(boardKey) {
    // Load departments if not cached
    if (!_tgDeptCache) {
        try { var dd = await apiCall('/api/departments'); _tgDeptCache = dd.departments || []; } catch(e) { _tgDeptCache = []; }
    }
    var info = _tgGetBoardInfo(boardKey);
    var prizes = _tgAllPrizes.filter(function(p) { return p.board_key === boardKey; });
    var medals = ['🥇','🥈','🥉'];
    var hasPrizes = prizes.length > 0;

    // Ranking explanation
    var explanations = {
        'teamRevenue': 'Tổng doanh số affiliate của <strong>tất cả thành viên trong team</strong> được cộng lại. Team nào có tổng doanh số cao nhất sẽ xếp hạng cao nhất.',
        'employeeRevenue': 'Doanh số affiliate mà <strong>các khách hàng của nhân viên</strong> tạo ra. Nhân viên quản lý affiliate có doanh số cao nhất sẽ đứng đầu.',
        'employeeOrders': 'Tổng <strong>số lượng đơn hàng affiliate</strong> mà nhân viên quản lý. Nhân viên có nhiều đơn nhất sẽ đứng đầu.',
        'affiliateRevenue': '<strong>Khách hàng affiliate</strong> có doanh số bán hàng cao nhất. Xếp hạng theo doanh số cá nhân của từng khách affiliate.',
        'hunterRanking': 'Nhân viên nào <strong>tuyển được nhiều affiliate mới nhất</strong> trong tháng sẽ đứng đầu. Tính theo số lượng affiliate mới đăng ký.',
        'magnetRanking': 'Nhân viên nào có affiliate <strong>giới thiệu được nhiều khách hàng mới nhất</strong> sẽ đứng đầu.'
    };
    var explainText = explanations[boardKey] || 'Xếp hạng dựa trên hiệu suất đạt được trong tháng.';
    var explainHtml = '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin-bottom:16px;">' +
        '<div style="font-weight:800;font-size:13px;color:#166534;margin-bottom:10px;">💡 Cách tính xếp hạng</div>' +
        '<div style="font-size:13px;color:#1e293b;line-height:1.6;">' + explainText + '</div></div>';

    // Prize tiers
    var tiersHtml = '';
    if (hasPrizes) {
        tiersHtml = '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:16px;">' +
            '<div style="font-weight:800;font-size:13px;color:var(--navy);margin-bottom:10px;">🏆 Cơ cấu giải thưởng</div>';
        [1,2,3].forEach(function(rank) {
            var p = prizes.find(function(pp) { return pp.top_rank === rank; });
            if (p) {
                tiersHtml += '<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #e2e8f0;">' +
                    '<span style="font-size:24px;">' + medals[rank-1] + '</span>' +
                    '<div style="flex:1;"><div style="font-weight:700;font-size:13px;color:var(--navy);">Top ' + rank + '</div>' +
                    (p.prize_description ? '<div style="font-size:11px;color:var(--gray-500);">' + p.prize_description + '</div>' : '') +
                    '</div>' +
                    '<div style="font-weight:900;font-size:15px;color:#e65100;">' + _tgFmt(p.prize_amount) + ' VNĐ</div></div>';
            }
        });
        var totalPrize = prizes.reduce(function(s, p) { return s + Number(p.prize_amount); }, 0);
        tiersHtml += '<div style="display:flex;justify-content:space-between;padding:10px 0 0;font-weight:900;font-size:14px;">' +
            '<span style="color:var(--navy);">Tổng giải thưởng:</span>' +
            '<span style="color:#e65100;">' + _tgFmt(totalPrize) + ' VNĐ</span></div></div>';
    }

    // Conditions
    var condHtml = '';
    if (hasPrizes) {
        var minOrders = Number(prizes[0].min_orders) || 0;
        var minRevenue = Number(prizes[0].min_revenue) || 0;
        var minCount = Number(prizes[0].min_count) || 0;
        var conditions = prizes[0].conditions || '';
        if (minOrders > 0 || minRevenue > 0 || minCount > 0 || conditions) {
            condHtml = '<div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:16px;margin-bottom:16px;">' +
                '<div style="font-weight:800;font-size:13px;color:#92400e;margin-bottom:10px;">🎯 Điều kiện bắt buộc để lọt TOP</div>';
            if (minOrders > 0) condHtml += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="font-size:18px;">📦</span><span style="font-size:13px;color:#1e293b;">Số đơn hàng phải đạt <strong style="color:#e65100;">tối thiểu ' + minOrders + ' đơn</strong></span></div>';
            if (minRevenue > 0) condHtml += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="font-size:18px;">💰</span><span style="font-size:13px;color:#1e293b;">Doanh số phải đạt <strong style="color:#e65100;">tối thiểu ' + _tgFmt(minRevenue) + ' VNĐ</strong></span></div>';
            if (minCount > 0) {
                var label = boardKey === 'hunterRanking' ? 'affiliate mới' : 'KH giới thiệu';
                condHtml += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="font-size:18px;">🎯</span><span style="font-size:13px;color:#1e293b;">Phải đạt <strong style="color:#e65100;">tối thiểu ' + minCount + ' ' + label + '</strong></span></div>';
            }
            condHtml += '<div style="background:#fef3c7;border-radius:8px;padding:10px;margin-top:8px;font-size:12px;color:#92400e;">' +
                '<strong>⚠️ Lưu ý:</strong> Dù bạn đứng đầu bảng nhưng nếu không đạt các điều kiện trên, bạn sẽ <strong>không được tính vào TOP</strong> và không nhận giải.</div>';
            if (conditions) condHtml += '<div style="margin-top:10px;font-size:13px;color:#1e293b;"><strong>📝 Ghi chú:</strong> ' + conditions + '</div>';
            condHtml += '</div>';
        }
    }

    // Departments
    var deptHtml = '';
    if (hasPrizes) {
        var depts = [];
        try { depts = JSON.parse(prizes[0].departments || '[]'); } catch(e) {}
        if (depts.length > 0) {
            deptHtml = '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;margin-bottom:16px;">' +
                '<div style="font-weight:800;font-size:13px;color:#1e40af;margin-bottom:8px;">🏢 Bộ phận áp dụng</div><div style="display:flex;flex-wrap:wrap;gap:6px;">';
            depts.forEach(function(did) {
                var dName = 'Phòng ' + did;
                if (_tgDeptCache && _tgDeptCache.length > 0) {
                    var t = _tgDeptCache.find(function(tm) { return tm.id == did; });
                    if (t) dName = t.name;
                }
                deptHtml += '<span style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:700;">' + dName + '</span>';
            });
            deptHtml += '</div><div style="font-size:11px;color:#6b7280;margin-top:8px;">Chỉ nhân viên thuộc các bộ phận trên mới được tham gia xếp hạng.</div></div>';
        }
    }

    // Popup
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;animation:bxhFadeUp .3s ease;';
    overlay.id = 'tgExplainOverlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = '<div style="background:white;border-radius:18px;max-width:600px;width:92%;max-height:88vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);">' +
        '<div style="background:linear-gradient(135deg,' + info.color + ',' + info.color + 'cc);color:white;padding:24px;border-radius:18px 18px 0 0;">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
                '<div>' +
                    '<div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;opacity:.7;">' + info.tabLabel + '</div>' +
                    '<div style="font-size:24px;font-weight:900;margin-top:6px;">' + info.boardName + '</div>' +
                    '<div style="font-size:13px;opacity:.85;margin-top:4px;">' + info.boardDesc + '</div>' +
                    '<div style="font-size:11px;opacity:.6;margin-top:6px;">Tháng ' + _tgSelectedMonth.split('-')[1] + '/' + _tgSelectedMonth.split('-')[0] + '</div>' +
                '</div>' +
                '<button onclick="document.getElementById(\'tgExplainOverlay\').remove()" style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);color:white;width:36px;height:36px;border-radius:10px;font-size:18px;cursor:pointer;flex-shrink:0;">✕</button>' +
            '</div>' +
        '</div>' +
        '<div style="padding:20px 24px;">' + explainHtml + tiersHtml + condHtml + deptHtml + '</div>' +
    '</div>';

    var existing = document.getElementById('tgExplainOverlay');
    if (existing) existing.remove();
    document.body.appendChild(overlay);
}

// ========== DRILL-DOWN DETAIL POPUP ==========
async function _tgLoadDrillDown(boardKey, personId, month, drillType, idx) {
    // Show loading popup immediately
    var existing = document.getElementById('tgDrillOverlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'tgDrillOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);z-index:10000;display:flex;align-items:center;justify-content:center;animation:bxhFadeUp .3s ease;';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = '<div style="background:white;border-radius:16px;max-width:800px;width:95%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.4);overflow:hidden;">' +
        '<div style="background:linear-gradient(135deg,#1a1a2e,#16213e);color:white;padding:20px 24px;flex-shrink:0;">' +
            '<div style="text-align:center;font-size:13px;opacity:.7;">⏳ Đang tải dữ liệu chi tiết...</div>' +
        '</div>' +
        '<div style="padding:40px;text-align:center;color:#9ca3af;font-size:13px;">Vui lòng đợi...</div>' +
    '</div>';
    document.body.appendChild(overlay);

    try {
        var res = await apiCall('/api/affiliate/leaderboard-detail?board_key=' + boardKey + '&person_id=' + personId + '&month=' + month + '&period_type=' + _tgSelectedPeriodType);

        // Determine title and icon
        var titles = {
            orders: '📦 Chi tiết Đơn Hàng',
            customers: '👥 Chi tiết Khách Hàng Giới Thiệu',
            affiliates: '🔑 Chi tiết Affiliate Đã Tuyển'
        };
        var title = titles[res.type] || '📊 Chi tiết';
        // Build period label
        var monthLabel = month;
        if (_tgSelectedPeriodType === 'daily') {
            var dp = month.split('-'); monthLabel = dp[2] + '/' + dp[1] + '/' + dp[0];
        } else if (_tgSelectedPeriodType === 'weekly') {
            monthLabel = 'Tuần ' + month.split('-W')[1] + '/' + month.split('-W')[0];
        } else if (_tgSelectedPeriodType === 'quarterly') {
            var qp = month.split('-Q'); monthLabel = 'Quý ' + qp[1] + '/' + qp[0];
        } else {
            var monthParts = month.split('-'); monthLabel = 'Tháng ' + monthParts[1] + '/' + monthParts[0];
        }

        if (!res.success || !res.items || res.items.length === 0) {
            overlay.querySelector('div > div').innerHTML =
                '<div style="background:linear-gradient(135deg,#1a1a2e,#16213e);color:white;padding:20px 24px;flex-shrink:0;border-radius:16px 16px 0 0;">' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                        '<div><div style="font-size:20px;font-weight:900;">' + title + '</div><div style="font-size:12px;opacity:.6;margin-top:4px;">' + monthLabel + '</div></div>' +
                        '<button onclick="document.getElementById(\'tgDrillOverlay\').remove()" style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);color:white;width:36px;height:36px;border-radius:10px;font-size:18px;cursor:pointer;">✕</button>' +
                    '</div>' +
                '</div>' +
                '<div style="padding:40px;text-align:center;color:#9ca3af;font-size:14px;">Không có dữ liệu chi tiết cho kỳ này</div>';
            return;
        }

        // Build table HTML
        var tableHtml = '';

        if (res.type === 'orders') {
            var totalRev = 0;
            tableHtml += '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
            tableHtml += '<thead><tr style="background:#1a1a2e;color:white;position:sticky;top:0;z-index:1;">';
            tableHtml += '<th style="padding:10px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.5px;">#</th>';
            tableHtml += '<th style="padding:10px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Mã Đơn</th>';
            tableHtml += '<th style="padding:10px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Khách Hàng</th>';
            tableHtml += '<th style="padding:10px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Người GT</th>';
            tableHtml += '<th style="padding:10px 12px;text-align:right;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Doanh Số</th>';
            tableHtml += '<th style="padding:10px 12px;text-align:right;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Ngày</th>';
            tableHtml += '</tr></thead><tbody>';
            res.items.forEach(function(o, i) {
                totalRev += o.order_total;
                var d = o.created_at ? new Date(o.created_at) : null;
                var dateStr = d ? (d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear() + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0')) : '';
                tableHtml += '<tr style="border-bottom:1px solid #f1f5f9;' + (i%2 ? 'background:#f8fafc;' : '') + '">';
                tableHtml += '<td style="padding:8px 12px;color:#6b7280;font-weight:600;">' + (i+1) + '</td>';
                tableHtml += '<td style="padding:8px 12px;font-weight:700;color:#1e40af;">' + (o.order_code || '-') + '</td>';
                tableHtml += '<td style="padding:8px 12px;"><div style="font-weight:600;">' + (o.customer_name || '-') + '</div><div style="color:#9ca3af;font-size:10px;">' + (o.customer_phone || '') + '</div></td>';
                tableHtml += '<td style="padding:8px 12px;color:#6b7280;">' + (o.referrer_name || '-') + '</td>';
                tableHtml += '<td style="padding:8px 12px;text-align:right;font-weight:800;color:#e65100;">' + _tgFmt(o.order_total) + '</td>';
                tableHtml += '<td style="padding:8px 12px;text-align:right;color:#6b7280;font-size:11px;">' + dateStr + '</td>';
                tableHtml += '</tr>';
            });
            tableHtml += '</tbody></table>';
            var footerHtml = '<div style="display:flex;justify-content:space-between;align-items:center;"><span>📦 Tổng: <strong>' + res.items.length + '</strong> đơn hàng</span><span style="font-weight:900;color:#e65100;font-size:16px;">' + _tgFmt(totalRev) + ' VNĐ</span></div>';

        } else if (res.type === 'customers') {
            tableHtml += '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
            tableHtml += '<thead><tr style="background:#1a1a2e;color:white;position:sticky;top:0;z-index:1;">';
            tableHtml += '<th style="padding:10px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.5px;">#</th>';
            tableHtml += '<th style="padding:10px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Mã KH</th>';
            tableHtml += '<th style="padding:10px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Tên Khách Hàng</th>';
            tableHtml += '<th style="padding:10px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.5px;">SĐT</th>';
            tableHtml += '<th style="padding:10px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Người GT</th>';
            tableHtml += '<th style="padding:10px 12px;text-align:right;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Ngày</th>';
            tableHtml += '</tr></thead><tbody>';
            res.items.forEach(function(c, i) {
                var d = c.created_at ? new Date(c.created_at) : null;
                var dateStr = d ? (d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear() + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0')) : '';
                tableHtml += '<tr style="border-bottom:1px solid #f1f5f9;' + (i%2 ? 'background:#f8fafc;' : '') + '">';
                tableHtml += '<td style="padding:8px 12px;color:#6b7280;font-weight:600;">' + (i+1) + '</td>';
                tableHtml += '<td style="padding:8px 12px;font-weight:700;color:#1e40af;">KH' + c.id + '</td>';
                tableHtml += '<td style="padding:8px 12px;font-weight:600;">' + (c.customer_name || '-') + '</td>';
                tableHtml += '<td style="padding:8px 12px;color:#6b7280;">' + (c.phone || '-') + '</td>';
                tableHtml += '<td style="padding:8px 12px;color:#6b7280;">' + (c.referrer_name || '-') + '</td>';
                tableHtml += '<td style="padding:8px 12px;text-align:right;color:#6b7280;font-size:11px;">' + dateStr + '</td>';
                tableHtml += '</tr>';
            });
            tableHtml += '</tbody></table>';
            var footerHtml = '<div>👥 Tổng: <strong>' + res.items.length + '</strong> khách hàng giới thiệu</div>';

        } else if (res.type === 'affiliates') {
            tableHtml += '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
            tableHtml += '<thead><tr style="background:#1a1a2e;color:white;position:sticky;top:0;z-index:1;">';
            tableHtml += '<th style="padding:10px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.5px;">#</th>';
            tableHtml += '<th style="padding:10px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Tên Affiliate</th>';
            tableHtml += '<th style="padding:10px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.5px;">SĐT</th>';
            tableHtml += '<th style="padding:10px 12px;text-align:right;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Ngày Tạo</th>';
            tableHtml += '</tr></thead><tbody>';
            res.items.forEach(function(a, i) {
                var d = a.created_at ? new Date(a.created_at) : null;
                var dateStr = d ? (d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear() + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0')) : '';
                tableHtml += '<tr style="border-bottom:1px solid #f1f5f9;' + (i%2 ? 'background:#f8fafc;' : '') + '">';
                tableHtml += '<td style="padding:8px 12px;color:#6b7280;font-weight:600;">' + (i+1) + '</td>';
                tableHtml += '<td style="padding:8px 12px;font-weight:600;">' + (a.full_name || '-') + '</td>';
                tableHtml += '<td style="padding:8px 12px;color:#6b7280;">' + (a.phone || '-') + '</td>';
                tableHtml += '<td style="padding:8px 12px;text-align:right;color:#6b7280;font-size:11px;">' + dateStr + '</td>';
                tableHtml += '</tr>';
            });
            tableHtml += '</tbody></table>';
            var footerHtml = '<div>🔑 Tổng: <strong>' + res.items.length + '</strong> affiliate</div>';
        }

        // Build full popup
        overlay.innerHTML = '<div style="background:white;border-radius:16px;max-width:800px;width:95%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.4);overflow:hidden;">' +
            '<div style="background:linear-gradient(135deg,#1a1a2e,#16213e);color:white;padding:20px 24px;flex-shrink:0;">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                    '<div>' +
                        '<div style="font-size:20px;font-weight:900;">' + title + '</div>' +
                        '<div style="font-size:12px;opacity:.6;margin-top:4px;">' + monthLabel + ' · ID: ' + personId + '</div>' +
                    '</div>' +
                    '<button onclick="document.getElementById(\'tgDrillOverlay\').remove()" style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);color:white;width:36px;height:36px;border-radius:10px;font-size:18px;cursor:pointer;flex-shrink:0;">✕</button>' +
                '</div>' +
            '</div>' +
            '<div style="flex:1;overflow-y:auto;">' + tableHtml + '</div>' +
            '<div style="background:#f0fdf4;border-top:2px solid #22c55e;padding:14px 24px;font-size:14px;color:#166534;font-weight:700;flex-shrink:0;">' + footerHtml + '</div>' +
        '</div>';

    } catch(e) {
        overlay.innerHTML = '<div style="background:white;border-radius:16px;max-width:500px;width:90%;padding:40px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4);">' +
            '<div style="font-size:40px;margin-bottom:16px;">❌</div>' +
            '<div style="font-size:14px;color:#ef4444;font-weight:700;">Lỗi tải dữ liệu</div>' +
            '<div style="font-size:12px;color:#9ca3af;margin-top:8px;">' + (e.message || e) + '</div>' +
            '<button onclick="document.getElementById(\'tgDrillOverlay\').remove()" style="margin-top:16px;padding:8px 24px;background:#ef4444;color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;">Đóng</button>' +
        '</div>';
    }
}

