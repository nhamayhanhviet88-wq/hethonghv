// ========== TRANG QUẢN LÝ QUY TẮC NÚT TƯ VẤN ==========

// Status labels for display
const FLOW_STATUS_LABELS = {
    dang_tu_van: '🆕 Khách mới / Mặc định',
    lam_quen_tuong_tac: '👋 Làm Quen Tương Tác',
    gui_stk_coc: '🏦 Gửi STK Cọc',
    dat_coc: '💵 Đặt Cọc',
    chot_don: '✅ Chốt Đơn',
    hoan_thanh: '🏆 Hoàn Thành Đơn',
    sau_ban_hang: '📦 Chăm Sóc Sau Bán',
    tuong_tac_ket_noi: '🔗 Tương Tác Kết Nối Lại',
    gui_ct_kh_cu: '🎟️ Gửi CT KH Cũ',
    huy_coc: '🚫 Hủy Cọc',
    giam_gia: '🎁 Giảm Giá',
    tu_van_lai: '🔄 Tư Vấn Lại',
    duyet_huy: '✅ Duyệt Hủy',
    hoan_thanh_cap_cuu: '🏥 Hoàn Thành Cấp Cứu',
    pending_emergency: '🚨 Đang có Cấp Cứu Sếp',
    cancel_auto_revert: '❌ KH bị auto-revert hủy',
};

let _qtAllTypes = [];
let _qtAllRules = {};
let _qtIsGD = false;

async function renderQuyTacTuVanPage(container) {
    _qtIsGD = currentUser && currentUser.role === 'giam_doc';

    container.innerHTML = `
        <style>
            .qt-page { max-width:1200px; margin:0 auto; font-family:'Inter','Segoe UI',sans-serif; }
            .qt-tabs { display:flex; gap:0; margin-bottom:0; border-bottom:2px solid #e2e8f0; }
            .qt-tab { padding:12px 28px; cursor:pointer; font-weight:700; font-size:14px;
                background:transparent; color:#94a3b8; border:none; border-bottom:3px solid transparent;
                margin-bottom:-2px; transition:all .2s; }
            .qt-tab:hover { color:#475569; }
            .qt-tab.active { color:#2563eb; border-bottom-color:#2563eb; }
            .qt-panel { background:#ffffff; border:1px solid #e2e8f0; border-top:none; border-radius:0 0 16px 16px;
                padding:28px; min-height:400px; box-shadow:0 4px 24px rgba(0,0,0,.04); }

            /* Tab 1: Button Grid */
            .qt-btn-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:14px; }
            .qt-btn-card { background:#ffffff; border:1px solid #e2e8f0; border-radius:14px;
                padding:18px 14px; text-align:center; transition:all .3s; position:relative; overflow:hidden;
                box-shadow:0 1px 4px rgba(0,0,0,.04); }
            .qt-btn-card:hover { transform:translateY(-4px); box-shadow:0 12px 32px rgba(0,0,0,.08); border-color:#cbd5e1; }
            .qt-btn-card.inactive { opacity:.35; }
            .qt-btn-card .qt-icon { font-size:34px; margin-bottom:10px; display:block; }
            .qt-btn-card .qt-label { font-size:13px; font-weight:700; color:#1e293b; margin-bottom:6px; }
            .qt-btn-card .qt-color-dot { width:10px; height:10px; border-radius:50%; display:inline-block; margin-right:4px; }
            .qt-btn-card .qt-key { font-size:9px; color:#94a3b8; font-family:'JetBrains Mono',monospace; letter-spacing:.3px; }
            .qt-btn-card .qt-edit-btn { position:absolute; top:8px; right:8px; background:#2563eb; color:white;
                border:none; border-radius:8px; width:28px; height:28px; cursor:pointer; font-size:12px;
                display:flex; align-items:center; justify-content:center; opacity:0; transition:all .2s; box-shadow:0 2px 8px rgba(37,99,235,.3); }
            .qt-btn-card:hover .qt-edit-btn { opacity:1; }
            .qt-btn-card .qt-status { font-size:10px; font-weight:700; padding:3px 10px; border-radius:20px; margin-top:8px; display:inline-block; }

            /* Tab 2: Flow Rules */
            .qt-flow-section { background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; margin-bottom:14px;
                overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,.03); transition:box-shadow .2s; }
            .qt-flow-section:hover { box-shadow:0 4px 16px rgba(0,0,0,.06); }
            .qt-flow-header { display:flex; align-items:center; justify-content:space-between; padding:14px 20px;
                background:#fafbfc; cursor:pointer; border-bottom:1px solid #f1f5f9; }
            .qt-flow-header:hover { background:#f1f5f9; }
            .qt-flow-title { font-size:14px; font-weight:800; color:#1e293b; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
            .qt-flow-count { font-size:10px; background:#eff6ff; color:#2563eb; padding:3px 10px; border-radius:20px; font-weight:700; }
            .qt-flow-body { padding:18px 20px; display:none; background:#fafbfc; }
            .qt-flow-body.open { display:block; }
            .qt-flow-targets { display:flex; flex-wrap:wrap; gap:10px; }
            .qt-target-card { background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:14px 16px;
                text-align:center; min-width:110px; position:relative; transition:all .25s; box-shadow:0 1px 3px rgba(0,0,0,.04); }
            .qt-target-card:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(0,0,0,.08); border-color:#cbd5e1; }
            .qt-target-card .qt-t-icon { font-size:26px; display:block; margin-bottom:6px; }
            .qt-target-card .qt-t-label { font-size:11px; font-weight:700; color:#334155; line-height:1.3; }
            .qt-target-card .qt-t-default { font-size:9px; color:#d97706; font-weight:800; margin-top:4px; }
            .qt-target-card .qt-t-delay { font-size:9px; color:#ea580c; font-weight:700; margin-top:3px; padding:2px 6px;
                background:#fff7ed; border-radius:6px; display:inline-block; }
            .qt-flow-edit-btn { background:linear-gradient(135deg,#2563eb,#1d4ed8); color:white; border:none;
                border-radius:8px; padding:6px 16px; font-size:12px; font-weight:700; cursor:pointer; transition:all .2s;
                box-shadow:0 2px 8px rgba(37,99,235,.25); }
            .qt-flow-edit-btn:hover { transform:scale(1.05); box-shadow:0 4px 16px rgba(37,99,235,.35); }

            /* Modal */
            .qt-modal-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(15,23,42,.5);
                backdrop-filter:blur(4px); z-index:9999; display:flex; align-items:center; justify-content:center; animation:qtFadeIn .2s; }
            @keyframes qtFadeIn { from{opacity:0} to{opacity:1} }
            .qt-modal { background:#ffffff; border:1px solid #e2e8f0; border-radius:20px; width:92%; max-width:700px;
                max-height:85vh; overflow-y:auto; padding:28px; box-shadow:0 24px 64px rgba(0,0,0,.12); }
            .qt-modal h3 { color:#1e293b; margin:0 0 20px; font-size:18px; }
            .qt-modal label { color:#64748b; font-size:12px; font-weight:600; display:block; margin-bottom:6px; }
            .qt-modal input, .qt-modal select { background:#f8fafc; color:#1e293b; border:1px solid #e2e8f0;
                border-radius:10px; padding:10px 14px; width:100%; font-size:13px; box-sizing:border-box; transition:border .2s; }
            .qt-modal input:focus { border-color:#2563eb; outline:none; box-shadow:0 0 0 3px rgba(37,99,235,.1); }
            .qt-modal .qt-row { display:flex; gap:14px; margin-bottom:14px; }
            .qt-modal .qt-row > div { flex:1; }
            .qt-modal .qt-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:20px; }
            .qt-modal .qt-btn { padding:10px 24px; border:none; border-radius:10px; font-weight:700; font-size:13px; cursor:pointer; transition:all .2s; }
            .qt-modal .qt-btn-primary { background:linear-gradient(135deg,#2563eb,#1d4ed8); color:white; box-shadow:0 2px 8px rgba(37,99,235,.3); }
            .qt-modal .qt-btn-primary:hover { box-shadow:0 4px 16px rgba(37,99,235,.4); }
            .qt-modal .qt-btn-secondary { background:#f1f5f9; color:#64748b; }
            .qt-modal .qt-btn-secondary:hover { background:#e2e8f0; }

            /* Rule editor checkboxes */
            .qt-rule-list { max-height:400px; overflow-y:auto; }
            .qt-rule-item { display:flex; align-items:center; gap:12px; padding:10px 14px;
                background:#f8fafc; border:1px solid #f1f5f9; border-radius:10px; margin-bottom:6px; transition:all .15s; }
            .qt-rule-item:hover { background:#eff6ff; border-color:#dbeafe; }
            .qt-rule-item input[type="checkbox"] { width:18px; height:18px; accent-color:#2563eb; cursor:pointer; }
            .qt-rule-item .qt-ri-info { flex:1; display:flex; align-items:center; gap:8px; }
            .qt-rule-item .qt-ri-icon { font-size:20px; }
            .qt-rule-item .qt-ri-label { font-size:13px; font-weight:600; color:#334155; }
            .qt-rule-item .qt-ri-delay { width:60px; text-align:center; }
            .qt-rule-item .qt-ri-default { width:18px; height:18px; accent-color:#d97706; cursor:pointer; }

            .qt-legend { display:flex; gap:18px; margin-bottom:16px; flex-wrap:wrap; padding:10px 16px; background:#f8fafc; border-radius:10px; border:1px solid #f1f5f9; }
            .qt-legend-item { font-size:11px; color:#64748b; display:flex; align-items:center; gap:4px; font-weight:600; }

            /* Back button */
            .qt-back { display:inline-flex; align-items:center; gap:6px; color:#2563eb; font-size:13px;
                font-weight:600; cursor:pointer; margin-bottom:16px; text-decoration:none; transition:color .2s; }
            .qt-back:hover { color:#1d4ed8; }

            /* Section headers */
            .qt-section-hdr { margin:28px 0 14px; padding:16px 22px; border-radius:14px; display:flex; align-items:center; gap:12px; }
        </style>

        <div class="qt-page">
            <a class="qt-back" href="/crm-nhu-cau" onclick="event.preventDefault();navigate('crm-nhu-cau')">← Quay lại CRM Nhu Cầu</a>
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px;flex-wrap:wrap;">
                <h2 style="color:var(--navy,#122546);margin:0;font-size:24px;font-weight:900;letter-spacing:-.3px;">⚙️ Quy Tắc Nút Tư Vấn</h2>
                <span style="font-size:12px;color:var(--navy,#122546);background:rgba(250,210,76,.15);padding:5px 14px;border-radius:20px;font-weight:700;border:1px solid rgba(250,210,76,.3);">
                    ${_qtIsGD ? '🔓 Chế độ chỉnh sửa' : '👁️ Chế độ xem'}
                </span>
            </div>

            <div class="qt-tabs">
                <div class="qt-tab active" onclick="_qtSwitchTab('buttons')" id="qtTabButtons">📋 Danh Sách Nút (${0})</div>
                <div class="qt-tab" onclick="_qtSwitchTab('rules')" id="qtTabRules">🔄 Quy Tắc Liên Kết</div>
            </div>
            <div class="qt-panel" id="qtPanel">
                <div style="text-align:center;padding:40px;color:#94a3b8;">⏳ Đang tải...</div>
            </div>
        </div>
    `;

    await _qtLoadData();
}

async function _qtLoadData() {
    const [typesData, rulesData] = await Promise.all([
        apiCall('/api/consult-types'),
        apiCall('/api/consult-flow-rules')
    ]);
    _qtAllTypes = typesData.types || [];
    _qtAllRules = rulesData.rules || {};

    document.getElementById('qtTabButtons').innerHTML = `📋 Danh Sách Nút (${_qtAllTypes.length})`;
    _qtRenderButtons();
}

function _qtSwitchTab(tab) {
    document.querySelectorAll('.qt-tab').forEach(t => t.classList.remove('active'));
    if (tab === 'buttons') {
        document.getElementById('qtTabButtons').classList.add('active');
        _qtRenderButtons();
    } else {
        document.getElementById('qtTabRules').classList.add('active');
        _qtRenderRules();
    }
}

function _qtRenderButtons() {
    const panel = document.getElementById('qtPanel');
    let html = '';

    if (_qtIsGD) {
        html += `<div style="margin-bottom:16px;text-align:right;">
            <button class="qt-flow-edit-btn" onclick="_qtShowAddTypeModal()">➕ Thêm nút mới</button>
        </div>`;
    }

    html += '<div class="qt-btn-grid">';
    for (const t of _qtAllTypes) {
        html += `
            <div class="qt-btn-card ${t.is_active ? '' : 'inactive'}">
                ${_qtIsGD ? `<button class="qt-edit-btn" onclick="_qtShowEditTypeModal('${t.key}')">✏️</button>` : ''}
                <span class="qt-icon">${t.icon}</span>
                <div class="qt-label">${t.label}</div>
                <div>
                    <span class="qt-color-dot" style="background:${t.color}"></span>
                    <span style="font-size:11px;color:${t.color};font-weight:600">${t.color}</span>
                </div>
                <div class="qt-key">${t.key}</div>
                <span class="qt-status" style="background:${t.is_active ? 'rgba(34,197,94,.15);color:#22c55e' : 'rgba(239,68,68,.15);color:#ef4444'}">
                    ${t.is_active ? '● Đang bật' : '○ Đã tắt'}
                </span>
            </div>
        `;
    }
    html += '</div>';
    panel.innerHTML = html;
}

function _qtRenderRules() {
    const panel = document.getElementById('qtPanel');

    // Define 3 sections with Loại numbering
    const SECTIONS = [
        {
            title: 'PHẦN 1: LÀM QUEN, TƯ VẤN KHÁCH',
            icon: '📋',
            color: '#3b82f6',
            gradient: 'linear-gradient(135deg,#1e3a5f,#0f172a)',
            loai: [
                {
                    num: 1,
                    label: 'Khi ấn: Gọi Điện / Nhắn Tin / Gặp TT / Gửi BG / Gửi Mẫu / TK / Sửa TK',
                    statuses: ['dang_tu_van','goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua'],
                    showFrom: 'dang_tu_van',
                    desc: 'Khách mới vào → hoặc sau khi ấn các nút tư vấn cơ bản → hiện lại đầy đủ nút'
                },
                { num: 2, label: 'Khi ấn: Làm Quen Tương Tác', statuses: ['lam_quen_tuong_tac'] },
                { num: 3, label: 'Khi ấn: Gửi STK Cọc', statuses: ['gui_stk_coc'] },
                { num: 4, label: 'Khi ấn: Giục Cọc', statuses: ['giuc_coc'] },
                { num: 5, label: 'Khi ấn: Đặt Cọc', statuses: ['dat_coc'] },
                { num: 6, label: 'Khi ấn: Chốt Đơn', statuses: ['chot_don'] },
                { num: 7, label: 'Khi ấn: Đang Sản Xuất', statuses: ['dang_san_xuat'] },
                { num: 8, label: 'Khi ấn: Hoàn Thành Đơn', statuses: ['hoan_thanh'] },
            ]
        },
        {
            title: 'PHẦN 2: CHĂM SÓC SAU BÁN HÀNG',
            icon: '📦',
            color: '#10b981',
            gradient: 'linear-gradient(135deg,#064e3b,#0f172a)',
            loai: [
                { num: 9, label: 'Khi ấn: Chăm Sóc Sau Bán', statuses: ['sau_ban_hang'] },
                { num: 10, label: 'Khi ấn: Tương Tác Kết Nối Lại', statuses: ['tuong_tac_ket_noi'] },
                { num: 11, label: 'Khi ấn: Gửi Chương Trình KH Cũ', statuses: ['gui_ct_kh_cu'] },
                { num: 12, label: 'Khi ấn: Giảm Giá', statuses: ['giam_gia'] },
            ]
        },
        {
            title: 'PHẦN 3: TRẠNG THÁI HỦY, CẤP CỨU SẾP',
            icon: '🚨',
            color: '#ef4444',
            gradient: 'linear-gradient(135deg,#7f1d1d,#0f172a)',
            loai: [
                { num: 13, label: 'Khi ấn: Hủy Cọc', statuses: ['huy_coc'] },
                { num: 14, label: 'Khi ấn: Tư Vấn Lại (sếp không duyệt hủy)', statuses: ['tu_van_lai'] },
                { num: 15, label: 'Khi ấn: Duyệt Hủy', statuses: ['duyet_huy'] },
                { num: 16, label: 'Khi ấn: Hoàn Thành Cấp Cứu', statuses: ['hoan_thanh_cap_cuu'] },
                { num: 17, label: 'OVERRIDE: Đang có Cấp Cứu Sếp chưa xử lý', statuses: ['pending_emergency'], isOverride: true },
                { num: 18, label: 'OVERRIDE: KH bị auto-revert hủy', statuses: ['cancel_auto_revert'], isOverride: true },
            ]
        }
    ];

    let html = `
        <div class="qt-legend">
            <span class="qt-legend-item">⭐ = Nút mặc định (tự chọn)</span>
            <span class="qt-legend-item">📅 = Sau X ngày mới hiện</span>
            <span class="qt-legend-item">🔵 = Nút đích cho phép</span>
        </div>
    `;

    if (_qtIsGD) {
        html += `<div style="margin-bottom:16px;text-align:right;">
            <button class="qt-flow-edit-btn" onclick="_qtShowAddRuleGroupModal()">➕ Thêm nhóm quy tắc mới</button>
        </div>`;
    }

    for (const section of SECTIONS) {
        // Section header
        html += `
            <div style="margin:24px 0 12px;padding:14px 20px;border-radius:12px;background:${section.gradient};
                border-left:4px solid ${section.color};display:flex;align-items:center;gap:10px;">
                <span style="font-size:22px;">${section.icon}</span>
                <span style="font-size:16px;font-weight:900;color:${section.color};letter-spacing:1px;">${section.title}</span>
            </div>
        `;

        for (const loai of section.loai) {
            // Get rules from first status that has data
            const mainStatus = loai.showFrom || loai.statuses[0];
            const rules = _qtAllRules[mainStatus];
            if (!rules || rules.length === 0) continue;

            const isOverride = loai.isOverride;

            // Build sub-status chips for Loại 1 (grouped)
            let subChipsHTML = '';
            if (loai.statuses.length > 1) {
                subChipsHTML = `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">`;
                for (const s of loai.statuses) {
                    const t = _qtAllTypes.find(x => x.key === s);
                    const lbl = t ? `${t.icon} ${t.label}` : (FLOW_STATUS_LABELS[s] || s);
                    subChipsHTML += `<span style="font-size:10px;background:rgba(59,130,246,.1);color:#60a5fa;padding:2px 8px;border-radius:6px;font-weight:600;">${lbl}</span>`;
                }
                subChipsHTML += `</div>`;
            }

            html += `
                <div class="qt-flow-section" style="${isOverride ? 'border-color:#ef4444;border-style:dashed;' : ''}">
                    <div class="qt-flow-header" onclick="this.nextElementSibling.classList.toggle('open')">
                        <div class="qt-flow-title">
                            <span style="background:${section.color};color:white;font-size:11px;font-weight:900;padding:3px 10px;border-radius:8px;min-width:55px;text-align:center;">Loại ${loai.num}</span>
                            ${loai.label}
                            <span class="qt-flow-count">${rules.length} nút</span>
                            ${isOverride ? '<span style="font-size:10px;background:rgba(239,68,68,.2);color:#f87171;padding:2px 8px;border-radius:6px;">OVERRIDE</span>' : ''}
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            ${_qtIsGD ? `<button class="qt-flow-edit-btn" onclick="event.stopPropagation();_qtShowEditRulesModal('${mainStatus}')">✏️ Sửa</button>` : ''}
                            <span style="color:#64748b;font-size:18px;">▼</span>
                        </div>
                    </div>
                    <div class="qt-flow-body">
                        ${subChipsHTML}
                        ${loai.desc ? `<div style="color:#fbbf24;font-size:11px;margin-bottom:8px;font-style:italic;">💡 ${loai.desc}</div>` : ''}
                        <div style="color:#94a3b8;font-size:12px;margin-bottom:10px;font-weight:600;">
                            → Hiện các nút:
                        </div>
                        <div class="qt-flow-targets">
            `;

            for (const r of rules) {
                const t = _qtAllTypes.find(x => x.key === r.to_type_key);
                const icon = t ? t.icon : r.to_icon || '📋';
                const label = t ? t.label : r.to_label || r.to_type_key;
                const color = t ? t.color : r.to_color || '#6b7280';

                html += `
                    <div class="qt-target-card" style="border-top:3px solid ${color};">
                        <span class="qt-t-icon">${icon}</span>
                        <div class="qt-t-label">${label}</div>
                        ${r.is_default ? '<div class="qt-t-default">⭐ Mặc định</div>' : ''}
                        ${r.delay_days > 0 ? `<div class="qt-t-delay">📅 Sau ${r.delay_days} ngày</div>` : '<div style="font-size:10px;color:#64748b;margin-top:2px;">⚡ Ngay lập tức</div>'}
                    </div>
                `;
            }

            html += `
                        </div>
                    </div>
                </div>
            `;
        }
    }

    panel.innerHTML = html;

    // Auto-open first section
    const firstBody = panel.querySelector('.qt-flow-body');
    if (firstBody) firstBody.classList.add('open');
}

function _qtGetTypeLabel(key) {
    const t = _qtAllTypes.find(x => x.key === key);
    return t ? `${t.icon} ${t.label}` : key;
}

// ========== EDIT TYPE MODAL ==========
function _qtShowEditTypeModal(key) {
    const t = _qtAllTypes.find(x => x.key === key);
    if (!t) return;

    const overlay = document.createElement('div');
    overlay.className = 'qt-modal-overlay';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
        <div class="qt-modal">
            <h3>${t.icon} Chỉnh sửa nút: ${t.label}</h3>
            <div class="qt-row">
                <div>
                    <label>Tên nút</label>
                    <input type="text" id="qtEditLabel" value="${t.label}">
                </div>
                <div style="flex:0 0 80px;">
                    <label>Icon</label>
                    <input type="text" id="qtEditIcon" value="${t.icon}" style="text-align:center;font-size:20px;">
                </div>
            </div>
            <div class="qt-row">
                <div>
                    <label>Màu nền</label>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <input type="color" id="qtEditColor" value="${t.color}" style="width:50px;height:36px;padding:2px;cursor:pointer;">
                        <input type="text" id="qtEditColorText" value="${t.color}" onchange="document.getElementById('qtEditColor').value=this.value">
                    </div>
                </div>
                <div>
                    <label>Màu chữ</label>
                    <input type="text" id="qtEditTextColor" value="${t.text_color || 'white'}">
                </div>
            </div>
            <div style="margin-top:12px;">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;color:#e2e8f0;">
                    <input type="checkbox" id="qtEditActive" ${t.is_active ? 'checked' : ''} style="width:18px;height:18px;accent-color:#22c55e;">
                    Đang bật (hiển thị cho NV)
                </label>
            </div>
            <div style="margin-top:12px;padding:12px;background:#0f172a;border-radius:8px;">
                <label>Xem trước</label>
                <div id="qtEditPreview" style="margin-top:8px;display:flex;align-items:center;gap:8px;">
                    <span style="font-size:24px;">${t.icon}</span>
                    <span style="padding:6px 14px;border-radius:8px;font-weight:700;font-size:13px;background:${t.color};color:${t.text_color || 'white'};">${t.label}</span>
                </div>
            </div>
            <div class="qt-actions">
                <button class="qt-btn qt-btn-secondary" onclick="this.closest('.qt-modal-overlay').remove()">Hủy</button>
                <button class="qt-btn qt-btn-primary" onclick="_qtSaveType('${key}')">💾 Lưu</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Live preview
    const updatePreview = () => {
        const icon = document.getElementById('qtEditIcon').value;
        const label = document.getElementById('qtEditLabel').value;
        const color = document.getElementById('qtEditColor').value;
        const textColor = document.getElementById('qtEditTextColor').value;
        document.getElementById('qtEditColorText').value = color;
        document.getElementById('qtEditPreview').innerHTML = `
            <span style="font-size:24px;">${icon}</span>
            <span style="padding:6px 14px;border-radius:8px;font-weight:700;font-size:13px;background:${color};color:${textColor};">${label}</span>
        `;
    };
    ['qtEditLabel','qtEditIcon','qtEditColor','qtEditTextColor'].forEach(id => {
        document.getElementById(id).addEventListener('input', updatePreview);
    });
}

async function _qtSaveType(key) {
    const data = {
        label: document.getElementById('qtEditLabel').value,
        icon: document.getElementById('qtEditIcon').value,
        color: document.getElementById('qtEditColor').value,
        text_color: document.getElementById('qtEditTextColor').value,
        is_active: document.getElementById('qtEditActive').checked
    };
    await apiCall(`/api/consult-types/${key}`, { method: 'PUT', body: JSON.stringify(data), headers: {'Content-Type':'application/json'} });
    document.querySelector('.qt-modal-overlay')?.remove();
    showToast('✅ Đã lưu thay đổi!', 'success');
    await _qtLoadData();
}

function _qtShowAddTypeModal() {
    const overlay = document.createElement('div');
    overlay.className = 'qt-modal-overlay';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
        <div class="qt-modal">
            <h3>➕ Thêm nút tư vấn mới</h3>
            <div class="qt-row">
                <div>
                    <label>Key (không dấu, dùng _ )</label>
                    <input type="text" id="qtNewKey" placeholder="vd: goi_lai">
                </div>
                <div>
                    <label>Tên hiển thị</label>
                    <input type="text" id="qtNewLabel" placeholder="vd: Gọi Lại">
                </div>
            </div>
            <div class="qt-row">
                <div style="flex:0 0 80px;">
                    <label>Icon</label>
                    <input type="text" id="qtNewIcon" value="📋" style="text-align:center;font-size:20px;">
                </div>
                <div>
                    <label>Màu</label>
                    <input type="color" id="qtNewColor" value="#6b7280" style="width:50px;height:36px;">
                </div>
            </div>
            <div class="qt-actions">
                <button class="qt-btn qt-btn-secondary" onclick="this.closest('.qt-modal-overlay').remove()">Hủy</button>
                <button class="qt-btn qt-btn-primary" onclick="_qtAddType()">➕ Thêm</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function _qtAddType() {
    const key = document.getElementById('qtNewKey').value.trim();
    const label = document.getElementById('qtNewLabel').value.trim();
    if (!key || !label) return showToast('❌ Vui lòng nhập Key và Tên!', 'error');
    const data = { key, label, icon: document.getElementById('qtNewIcon').value, color: document.getElementById('qtNewColor').value };
    await apiCall('/api/consult-types', { method: 'POST', body: JSON.stringify(data), headers: {'Content-Type':'application/json'} });
    document.querySelector('.qt-modal-overlay')?.remove();
    showToast('✅ Đã thêm nút mới!', 'success');
    await _qtLoadData();
}

// ========== EDIT RULES MODAL ==========
function _qtShowEditRulesModal(fromStatus) {
    const rules = _qtAllRules[fromStatus] || [];
    const statusLabel = FLOW_STATUS_LABELS[fromStatus] || _qtGetTypeLabel(fromStatus) || fromStatus;

    let listHTML = '';
    for (const t of _qtAllTypes) {
        const existing = rules.find(r => r.to_type_key === t.key);
        const checked = !!existing;
        const delay = existing ? (existing.delay_days || 0) : 0;
        const isDef = existing ? existing.is_default : false;
        const order = existing ? existing.sort_order : 99;

        listHTML += `
            <div class="qt-rule-item" data-key="${t.key}" data-order="${order}">
                <input type="checkbox" class="qt-ri-check" ${checked ? 'checked' : ''}>
                <div class="qt-ri-info">
                    <span class="qt-ri-icon">${t.icon}</span>
                    <span class="qt-ri-label">${t.label}</span>
                </div>
                <div style="display:flex;align-items:center;gap:4px;">
                    <span style="font-size:10px;color:#94a3b8;">Sau</span>
                    <input type="number" class="qt-ri-delay" value="${delay}" min="0" max="90" style="width:50px;text-align:center;padding:4px;font-size:12px;">
                    <span style="font-size:10px;color:#94a3b8;">ngày</span>
                </div>
                <div style="display:flex;align-items:center;gap:4px;">
                    <input type="radio" name="qtDefault" class="qt-ri-default" ${isDef ? 'checked' : ''} value="${t.key}">
                    <span style="font-size:10px;color:#fbbf24;">⭐</span>
                </div>
            </div>
        `;
    }

    const overlay = document.createElement('div');
    overlay.className = 'qt-modal-overlay';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
        <div class="qt-modal">
            <h3>⚙️ Quy tắc sau: ${statusLabel}</h3>
            <div style="margin-bottom:12px;padding:10px;background:#0f172a;border-radius:8px;">
                <div class="qt-legend" style="margin:0;">
                    <span class="qt-legend-item">☑ Bật/tắt nút</span>
                    <span class="qt-legend-item">📅 Delay (0 = ngay)</span>
                    <span class="qt-legend-item">⭐ Mặc định</span>
                </div>
            </div>
            <div class="qt-rule-list">${listHTML}</div>
            <div class="qt-actions">
                <button class="qt-btn qt-btn-secondary" onclick="this.closest('.qt-modal-overlay').remove()">Hủy</button>
                <button class="qt-btn qt-btn-primary" onclick="_qtSaveRules('${fromStatus}')">💾 Lưu quy tắc</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function _qtSaveRules(fromStatus) {
    const items = document.querySelectorAll('.qt-rule-item');
    const rules = [];
    let order = 0;
    items.forEach(item => {
        const checked = item.querySelector('.qt-ri-check').checked;
        if (!checked) return;
        order++;
        rules.push({
            to_type_key: item.dataset.key,
            delay_days: parseInt(item.querySelector('.qt-ri-delay').value) || 0,
            is_default: item.querySelector('.qt-ri-default').checked,
            sort_order: order
        });
    });

    await apiCall(`/api/consult-flow-rules/${fromStatus}`, {
        method: 'PUT',
        body: JSON.stringify({ rules }),
        headers: {'Content-Type':'application/json'}
    });
    document.querySelector('.qt-modal-overlay')?.remove();
    showToast('✅ Đã lưu quy tắc!', 'success');
    await _qtLoadData();
    _qtSwitchTab('rules');
}

function _qtShowAddRuleGroupModal() {
    // Collect statuses that don't have rules yet
    const existingStatuses = new Set(Object.keys(_qtAllRules));
    let optionsHTML = '';
    for (const t of _qtAllTypes) {
        if (!existingStatuses.has(t.key)) {
            optionsHTML += `<option value="${t.key}">${t.icon} ${t.label}</option>`;
        }
    }

    const overlay = document.createElement('div');
    overlay.className = 'qt-modal-overlay';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
        <div class="qt-modal">
            <h3>➕ Thêm nhóm quy tắc mới</h3>
            <div style="margin-bottom:12px;">
                <label>Chọn nút nguồn (sau khi bấm nút này thì...)</label>
                <select id="qtNewRuleFrom" style="margin-top:4px;">
                    ${optionsHTML}
                </select>
            </div>
            <div class="qt-actions">
                <button class="qt-btn qt-btn-secondary" onclick="this.closest('.qt-modal-overlay').remove()">Hủy</button>
                <button class="qt-btn qt-btn-primary" onclick="_qtAddRuleGroup()">Tiếp tục →</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function _qtAddRuleGroup() {
    const from = document.getElementById('qtNewRuleFrom').value;
    if (!from) return;
    document.querySelector('.qt-modal-overlay')?.remove();
    // Pre-populate empty rules then open edit modal
    _qtAllRules[from] = [];
    _qtShowEditRulesModal(from);
}
