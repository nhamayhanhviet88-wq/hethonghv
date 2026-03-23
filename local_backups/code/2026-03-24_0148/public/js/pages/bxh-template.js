// ========== SHARED BXH PLACEHOLDER TEMPLATE ==========
function renderBxhPlaceholderPage(container, config) {
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

    const boards = config.boards || [];

    container.innerHTML = `
        <style>
            @keyframes phFadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
            .ph-board { border-radius:14px; overflow:hidden; animation:phFadeUp .5s ease forwards; }
            .ph-board-header { padding:14px 18px; font-weight:800; font-size:15px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; color:white; }
            .ph-empty { text-align:center; padding:40px 20px; color:rgba(0,0,0,.25); }
            .ph-empty-icon { font-size:48px; margin-bottom:8px; opacity:.5; }
            .ph-empty-text { font-size:13px; font-weight:600; }
        </style>

        <div class="card" style="margin-bottom:16px;">
            <div class="card-body" style="padding:14px 18px;">
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <h2 style="margin:0;color:var(--navy);font-size:18px;">${config.icon} ${config.title}</h2>
                        <button class="bxh-prize-btn" style="background:linear-gradient(135deg,#ffd700,#ffb300);color:#1a1a2e;border:none;padding:10px 20px;border-radius:12px;font-weight:800;font-size:14px;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 4px 15px rgba(255,215,0,.3);"
                            onclick="showToast('Giải thưởng chưa được thiết lập','info')">
                            ★ Xem Giải Thưởng
                        </button>
                    </div>
                    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                        <select class="form-control" style="width:auto;min-width:110px;" disabled>
                            <option selected>📅 Tháng</option>
                            <option>📊 Quý</option>
                            <option>📆 Năm</option>
                        </select>
                        <select class="form-control" style="width:auto;min-width:150px;" disabled>${monthOpts}</select>
                        <button class="btn btn-primary" style="padding:8px 18px;" disabled>🔍 XEM BXH</button>
                    </div>
                </div>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            ${boards.map(b => `
                <div class="ph-board card">
                    <div class="ph-board-header" style="background:${b.color};">
                        ${b.icon} ${b.name}
                        <span style="font-weight:400;font-size:11px;opacity:.75;margin-left:8px;">— ${b.subtitle}</span>
                    </div>
                    <div class="ph-empty">
                        <div class="ph-empty-icon">🏗️</div>
                        <div class="ph-empty-text">Đang phát triển</div>
                        <div style="font-size:11px;color:rgba(0,0,0,.2);margin-top:4px;">Hạng mục này sẽ được thiết lập sau</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}
