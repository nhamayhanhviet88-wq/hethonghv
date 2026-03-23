// ========== BẢNG XẾP HẠNG AFFILIATE (6 boards + prizes) ==========

const BXH_BOARDS = [
    { key: 'affiliateRevenue', name: 'Ngôi Sao Doanh Số', subtitle: 'Khách Affiliate Doanh Số Cao Nhất', icon: '🏆', color: '#e65100', valueKey: 'total_revenue', suffix: ' VNĐ', extra: r => `👥 ${r.total_customers} KH · 📦 ${r.total_orders} đơn` },
    { key: 'employeeRevenue', name: 'Thủ Lĩnh Doanh Số', subtitle: 'Nhân Viên Doanh Số Affiliate Cao Nhất', icon: '👑', color: '#1565c0', valueKey: 'total_revenue', suffix: ' VNĐ', extra: r => `🔑 ${r.affiliate_count} affiliate · 📦 ${r.total_orders} đơn` },
    { key: 'employeeOrders', name: 'Chiến Binh Đơn Hàng', subtitle: 'Nhân Viên Đạt Nhiều Đơn Affiliate Nhất', icon: '🎯', color: '#2e7d32', valueKey: 'total_orders', suffix: ' đơn', extra: r => `🔑 ${r.affiliate_count} affiliate · 💰 ${_bxhFmt(r.total_revenue)} VNĐ` },
    { key: 'teamRevenue', name: 'Đội Hình Vàng', subtitle: 'Team Đạt Doanh Số Affiliate Cao Nhất', icon: '⚡', color: '#6a1b9a', valueKey: 'total_revenue', suffix: ' VNĐ', extra: r => `👥 ${r.member_count} NV · 🔑 ${r.affiliate_count} affiliate` },
    { key: 'hunterRanking', name: 'Thợ Săn Tài Năng', subtitle: 'Nhân Viên Có Nhiều Affiliate Mới Nhất', icon: '🔥', color: '#c62828', valueKey: 'affiliate_count', suffix: ' affiliate', extra: null },
    { key: 'magnetRanking', name: 'Nam Châm Khách Hàng', subtitle: 'Nhân Viên Có Affiliate Giới Thiệu Khách Nhiều Nhất', icon: '🧲', color: '#00838f', valueKey: 'total_customers', suffix: ' KH', extra: r => `🔑 ${r.affiliate_count} affiliate` },
];

let _bxhPrizesMap = {};

async function renderBangXepHangAffiliatePage(container) {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const curQuarter = Math.ceil(curMonth / 3);

    let monthOpts = '';
    for (let i = 0; i < 12; i++) {
        let m = curMonth - i, y = curYear;
        if (m <= 0) { m += 12; y--; }
        monthOpts += `<option value="${y}-${String(m).padStart(2,'0')}" ${i===0?'selected':''}> Tháng ${m}/${y}</option>`;
    }
    let quarterOpts = '';
    for (let q = curQuarter; q >= 1; q--) quarterOpts += `<option value="${curYear}-Q${q}">Quý ${q}/${curYear}</option>`;
    for (let q = 4; q >= 1; q--) quarterOpts += `<option value="${curYear-1}-Q${q}">Quý ${q}/${curYear-1}</option>`;
    let yearOpts = '';
    for (let y = curYear; y >= 2024; y--) yearOpts += `<option value="${y}">Năm ${y}</option>`;

    container.innerHTML = `
        <style>
            @keyframes bxhGoldGlow { 0%,100%{box-shadow:0 0 15px rgba(255,215,0,.3)} 50%{box-shadow:0 0 30px rgba(255,215,0,.5)} }
            @keyframes bxhShimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
            @keyframes bxhFadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
            @keyframes bxhPrizePulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,215,0,.4)} 50%{box-shadow:0 0 12px 4px rgba(255,215,0,.2)} }
            .bxh-board { border-radius:14px; overflow:hidden; animation:bxhFadeUp .5s ease forwards; }
            .bxh-board-header { padding:14px 18px; font-weight:800; font-size:15px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
            .bxh-podium { display:flex; gap:10px; padding:12px 14px; }
            .bxh-pod { flex:1; border-radius:12px; padding:12px 8px; text-align:center; transition:transform .3s; }
            .bxh-pod:hover { transform:translateY(-4px) scale(1.02); }
            .bxh-pod .medal { font-size:28px; display:block; margin-bottom:4px; }
            .bxh-pod .pod-name { font-size:12px; font-weight:800; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
            .bxh-pod .pod-val { font-size:14px; font-weight:900; }
            .bxh-pod .pod-sub { font-size:10px; opacity:.7; margin-top:2px; }
            .bxh-pod-gold { background:linear-gradient(135deg,#1a1a2e,#2d1810,#1a1a2e); border:1.5px solid #ffd700; color:#ffd700; animation:bxhGoldGlow 3s infinite; }
            .bxh-pod-gold .pod-name { background:linear-gradient(90deg,#ffd700,#fff8dc,#ffd700); background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; animation:bxhShimmer 3s linear infinite; }
            .bxh-pod-silver { background:linear-gradient(135deg,#1a1a2e,#2a2a3e,#1a1a2e); border:1.5px solid #c0c0c0; color:#e8e8e8; }
            .bxh-pod-silver .pod-name { background:linear-gradient(90deg,#c0c0c0,#fff,#c0c0c0); background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; animation:bxhShimmer 3s linear infinite; }
            .bxh-pod-bronze { background:linear-gradient(135deg,#1a1a2e,#2d1f14,#1a1a2e); border:1.5px solid #cd7f32; color:#deb887; }
            .bxh-pod-bronze .pod-name { background:linear-gradient(90deg,#cd7f32,#f4e3c1,#cd7f32); background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; animation:bxhShimmer 3s linear infinite; }
            .bxh-list { padding:0 14px 14px; }
            .bxh-list-item { display:flex; align-items:center; padding:8px 10px; border-radius:8px; margin-bottom:4px; background:rgba(255,255,255,.03); transition:background .2s; animation:bxhFadeUp .3s ease forwards; opacity:0; }
            .bxh-list-item:hover { background:rgba(255,255,255,.08); }
            .bxh-rank { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:12px; margin-right:10px; flex-shrink:0; }
            .bxh-item-name { flex:1; font-weight:700; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
            .bxh-item-val { font-weight:800; font-size:13px; text-align:right; white-space:nowrap; }
            .bxh-prize-badge { display:inline-flex; align-items:center; gap:3px; padding:3px 10px; border-radius:20px; font-size:10px; font-weight:700; background:linear-gradient(135deg,#ffd700,#ffb300); color:#1a1a2e; animation:bxhPrizePulse 2s ease infinite; }
            .bxh-prize-btn { background:linear-gradient(135deg,#ffd700,#ffb300); color:#1a1a2e; border:none; padding:10px 20px; border-radius:12px; font-weight:800; font-size:14px; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all .3s; box-shadow:0 4px 15px rgba(255,215,0,.3); font-family:'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif; }
            .bxh-prize-btn:hover { transform:translateY(-2px) scale(1.03); box-shadow:0 6px 25px rgba(255,215,0,.5); }
            .bxh-modal-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,.6); backdrop-filter:blur(4px); z-index:9999; display:flex; align-items:center; justify-content:center; animation:bxhFadeUp .3s ease; }
            .bxh-modal { background:white; border-radius:16px; max-width:600px; width:90%; max-height:85vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,.3); }
            .bxh-modal-header { padding:20px 24px; background:linear-gradient(135deg,#1a1a2e,#2d1810); color:#ffd700; border-radius:16px 16px 0 0; }
            .bxh-modal-body { padding:20px 24px; }
            .bxh-prize-card { border:1px solid var(--gray-200); border-radius:12px; padding:14px; margin-bottom:12px; transition:all .2s; }
            .bxh-prize-card:hover { box-shadow:0 4px 12px rgba(0,0,0,.08); }
        </style>

        <div class="card" style="margin-bottom:16px;">
            <div class="card-body" style="padding:14px 18px;">
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <h2 style="margin:0;color:var(--navy);font-size:18px;">🏆 Bảng Xếp Hạng Affiliate</h2>
                        <button class="bxh-prize-btn" onclick="showBxhPrizeModal()">
                            ★ Xem Giải Thưởng
                        </button>
                    </div>
                    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                        <select id="bxhPeriod" class="form-control" style="width:auto;min-width:110px;" onchange="onBxhPeriodChange()">
                            <option value="month" selected>📅 Tháng</option>
                            <option value="quarter">📊 Quý</option>
                            <option value="year">📆 Năm</option>
                        </select>
                        <select id="bxhValueMonth" class="form-control" style="width:auto;min-width:150px;">${monthOpts}</select>
                        <select id="bxhValueQuarter" class="form-control" style="width:auto;min-width:150px;display:none;">${quarterOpts}</select>
                        <select id="bxhValueYear" class="form-control" style="width:auto;min-width:110px;display:none;">${yearOpts}</select>
                        <button class="btn btn-primary" onclick="loadBxhData()" style="padding:8px 18px;">🔍 XEM BXH</button>
                    </div>
                </div>
            </div>
        </div>

        <div id="bxhGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;"></div>
    `;
    await loadBxhData();
}

function onBxhPeriodChange() {
    const p = document.getElementById('bxhPeriod').value;
    document.getElementById('bxhValueMonth').style.display = p==='month'?'':'none';
    document.getElementById('bxhValueQuarter').style.display = p==='quarter'?'':'none';
    document.getElementById('bxhValueYear').style.display = p==='year'?'':'none';
}

function _bxhFmt(n) { return n ? Number(n).toLocaleString('vi-VN') : '0'; }

function _renderBoard(el, board, rankings, prizesForBoard) {
    const medals = ['🥇','🥈','🥉'];
    const podClasses = ['bxh-pod-gold','bxh-pod-silver','bxh-pod-bronze'];
    const top3 = rankings.slice(0, 3);
    const rest = rankings.slice(3);
    const hasPrize = prizesForBoard && prizesForBoard.length > 0;
    const totalPrize = hasPrize ? prizesForBoard.reduce((s, p) => s + Number(p.prize_amount), 0) : 0;

    // Prize badge
    const prizeBadgeHtml = hasPrize
        ? `<span class="bxh-prize-badge">💎 Giải: ${_bxhFmt(totalPrize)} VNĐ</span>`
        : '';

    let podiumHtml = '';
    if (top3.length === 0) {
        podiumHtml = '<div style="text-align:center;padding:24px;color:rgba(255,255,255,.5);font-size:13px;">📭 Chưa có dữ liệu</div>';
    } else {
        podiumHtml = '<div class="bxh-podium">' + top3.map((r, i) => {
            const val = board.valueKey === 'total_revenue' ? _bxhFmt(r[board.valueKey]) + ' VNĐ' : r[board.valueKey];
            const sub = board.extra ? board.extra(r) : '';
            // Show prize amount for this rank
            const rankPrize = prizesForBoard ? prizesForBoard.find(p => p.top_rank === r.rank) : null;
            const prizeTag = rankPrize ? `<div style="font-size:9px;margin-top:3px;color:#ffd700;font-weight:700;">🎁 ${_bxhFmt(rankPrize.prize_amount)} VNĐ</div>` : '';
            return `<div class="bxh-pod ${podClasses[i]}">
                <span class="medal">${medals[i]}</span>
                <div class="pod-name" title="${r.name}">${r.name}</div>
                <div class="pod-val">${val}</div>
                ${sub ? `<div class="pod-sub">${sub}</div>` : ''}
                ${prizeTag}
            </div>`;
        }).join('') + '</div>';
    }

    const rankColors = ['#6366f1','#8b5cf6','#a855f7','#c084fc','#d8b4fe','#e9d5ff','#f3e8ff'];
    let listHtml = '';
    if (rest.length > 0) {
        listHtml = '<div class="bxh-list">' + rest.map((r, i) => {
            const c = rankColors[Math.min(i, rankColors.length - 1)];
            const val = board.valueKey === 'total_revenue' ? _bxhFmt(r[board.valueKey]) : r[board.valueKey];
            const delay = (i * 0.06) + 0.3;
            return `<div class="bxh-list-item" style="animation-delay:${delay}s">
                <div class="bxh-rank" style="background:${c}20;color:${c};border:1px solid ${c}40;">#${r.rank}</div>
                <div class="bxh-item-name" style="color:var(--navy);" title="${r.name}">${r.name}</div>
                <div class="bxh-item-val" style="color:${board.color};">${val}${board.suffix}</div>
            </div>`;
        }).join('') + '</div>';
    }

    el.innerHTML = `
        <div class="bxh-board-header" style="background:${board.color};color:white;">
            ${board.icon} ${board.name}
            <span style="font-weight:400;font-size:11px;opacity:.75;margin-left:8px;">— ${board.subtitle}</span>
            <span style="margin-left:auto;">${prizeBadgeHtml}</span>
        </div>
        ${podiumHtml}
        ${listHtml}
    `;
}

function _getCurrentMonth() {
    const period = document.getElementById('bxhPeriod')?.value;
    if (period === 'month') {
        return document.getElementById('bxhValueMonth')?.value || '';
    }
    // For quarter/year, derive the current month
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
}

async function loadBxhData() {
    const period = document.getElementById('bxhPeriod').value;
    let value = '';
    if (period === 'month') value = document.getElementById('bxhValueMonth').value;
    else if (period === 'quarter') value = document.getElementById('bxhValueQuarter').value;
    else if (period === 'year') value = document.getElementById('bxhValueYear').value;

    const grid = document.getElementById('bxhGrid');
    grid.innerHTML = '<div style="padding:40px;text-align:center;color:var(--gray-500);grid-column:1/-1;">⏳ Đang tải...</div>';

    // Fetch leaderboard + prizes in parallel
    const [data, prizesData] = await Promise.all([
        apiCall(`/api/affiliate/leaderboard?period=${period}&value=${encodeURIComponent(value)}`),
        apiCall(`/api/affiliate/prizes?month=${_getCurrentMonth()}`)
    ]);

    // Group prizes by board_key
    _bxhPrizesMap = {};
    (prizesData.prizes || []).forEach(p => {
        if (!_bxhPrizesMap[p.board_key]) _bxhPrizesMap[p.board_key] = [];
        _bxhPrizesMap[p.board_key].push(p);
    });

    // Sort boards: those with prizes first
    const sortedBoards = [...BXH_BOARDS].sort((a, b) => {
        const aHas = _bxhPrizesMap[a.key] ? 1 : 0;
        const bHas = _bxhPrizesMap[b.key] ? 1 : 0;
        return bHas - aHas;
    });

    // Render grid
    grid.innerHTML = sortedBoards.map(b => `<div id="bxhBoard_${b.key}" class="bxh-board card"></div>`).join('');

    sortedBoards.forEach(board => {
        const el = document.getElementById(`bxhBoard_${board.key}`);
        const rankings = data[board.key] || [];
        const prizes = _bxhPrizesMap[board.key] || [];
        _renderBoard(el, board, rankings, prizes);
    });
}

// ===== PRIZE MODAL =====
function showBxhPrizeModal() {
    const month = _getCurrentMonth();
    const [y, m] = month.split('-');
    const monthLabel = `Tháng ${parseInt(m)}/${y}`;

    const boardsWithPrizes = BXH_BOARDS.filter(b => _bxhPrizesMap[b.key] && _bxhPrizesMap[b.key].length > 0);
    const boardsNoPrizes = BXH_BOARDS.filter(b => !_bxhPrizesMap[b.key] || _bxhPrizesMap[b.key].length === 0);

    let cardsHtml = '';
    if (boardsWithPrizes.length === 0) {
        cardsHtml = '<div style="text-align:center;padding:30px;color:var(--gray-400);font-size:14px;">📭 Chưa có giải thưởng nào cho tháng này</div>';
    } else {
        cardsHtml = boardsWithPrizes.map(board => {
            const prizes = _bxhPrizesMap[board.key];
            const totalPrize = prizes.reduce((s, p) => s + Number(p.prize_amount), 0);
            const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
            return `
                <div class="bxh-prize-card" style="border-left:4px solid ${board.color};">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <div style="font-weight:800;font-size:14px;color:${board.color};">${board.icon} ${board.name}</div>
                        <div style="font-weight:800;font-size:13px;color:var(--navy);">💰 ${_bxhFmt(totalPrize)} VNĐ</div>
                    </div>
                    <div style="font-size:11px;color:var(--gray-500);margin-bottom:8px;">${board.subtitle}</div>
                    ${prizes.map(p => `
                        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--gray-100);">
                            <span style="font-size:18px;">${medals[p.top_rank-1]||'🏅'}</span>
                            <span style="font-weight:700;font-size:12px;color:var(--navy);">Top ${p.top_rank}</span>
                            <span style="margin-left:auto;font-weight:800;font-size:13px;color:#e65100;">${_bxhFmt(p.prize_amount)} VNĐ</span>
                        </div>
                        ${p.prize_description ? `<div style="font-size:11px;color:var(--gray-500);margin-left:30px;">${p.prize_description}</div>` : ''}
                    `).join('')}
                </div>
            `;
        }).join('');
    }

    const overlay = document.createElement('div');
    overlay.className = 'bxh-modal-overlay';
    overlay.id = 'bxhPrizeOverlay';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
        <div class="bxh-modal">
            <div class="bxh-modal-header">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <div style="font-size:20px;font-weight:900;">🎁 Giải Thưởng Thi Đua</div>
                        <div style="font-size:12px;opacity:.7;margin-top:4px;">📅 ${monthLabel}</div>
                    </div>
                    <button onclick="document.getElementById('bxhPrizeOverlay').remove()"
                        style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);color:white;width:32px;height:32px;border-radius:8px;font-size:16px;cursor:pointer;">✕</button>
                </div>
            </div>
            <div class="bxh-modal-body">
                ${cardsHtml}
                ${boardsNoPrizes.length > 0 ? `
                    <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--gray-200);">
                        <div style="font-size:11px;color:var(--gray-400);margin-bottom:6px;">Bảng chưa có giải thưởng:</div>
                        <div style="display:flex;flex-wrap:wrap;gap:6px;">
                            ${boardsNoPrizes.map(b => `<span style="font-size:11px;padding:3px 8px;border-radius:6px;background:var(--gray-100);color:var(--gray-500);">${b.icon} ${b.name}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}
