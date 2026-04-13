// ========== TRANG QUẢN LÝ QUY TẮC NÚT TƯ VẤN — PREMIUM UI ==========

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

// Stage definitions for Tab 1 grouping
const QT_STAGES = [
    {
        id: 'tuvan', title: 'Giai Đoạn Tư Vấn', icon: '💬',
        gradient: 'linear-gradient(135deg,#dbeafe,#eff6ff)',
        textColor: '#1e40af', countBg: '#bfdbfe', countColor: '#1e40af',
        keys: ['lam_quen_tuong_tac','goi_dien','nhan_tin','tuong_tac_ket_noi','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua']
    },
    {
        id: 'coc', title: 'Giai Đoạn Cọc & Đơn Hàng', icon: '💰',
        gradient: 'linear-gradient(135deg,#fef3c7,#fffbeb)',
        textColor: '#92400e', countBg: '#fde68a', countColor: '#92400e',
        keys: ['gui_stk_coc','giuc_coc','dat_coc','chot_don','dang_san_xuat','hoan_thanh']
    },
    {
        id: 'sauban', title: 'Sau Bán Hàng & Chăm Sóc', icon: '📦',
        gradient: 'linear-gradient(135deg,#d1fae5,#ecfdf5)',
        textColor: '#065f46', countBg: '#a7f3d0', countColor: '#065f46',
        keys: ['sau_ban_hang','gui_ct_kh_cu','giam_gia']
    },
    {
        id: 'capuu', title: 'Cấp Cứu & Hủy', icon: '🚨',
        gradient: 'linear-gradient(135deg,#fee2e2,#fef2f2)',
        textColor: '#991b1b', countBg: '#fecaca', countColor: '#991b1b',
        keys: ['cap_cuu_sep','huy_coc','hoan_thanh_cap_cuu','huy','tu_van_lai']
    }
];

// Flowchart journey definition
const QT_JOURNEY_NODES = [
    { key: 'dang_tu_van', icon: '🆕', short: 'Khách Mới', group: 'main' },
    { key: 'lam_quen_tuong_tac', icon: '👋', short: 'Làm Quen', group: 'main' },
    { key: 'goi_dien', icon: '📞', short: 'Tư Vấn', group: 'main', multi: true,
      tooltip: 'Gọi Điện / Nhắn Tin / Gặp TT / Gửi BG / Mẫu / TK / Sửa TK' },
    { key: 'gui_stk_coc', icon: '🏦', short: 'Gửi STK', group: 'main' },
    { key: 'giuc_coc', icon: '⏰', short: 'Giục Cọc', group: 'main' },
    { key: 'dat_coc', icon: '💵', short: 'Đặt Cọc', group: 'main' },
    { key: 'chot_don', icon: '✅', short: 'Chốt Đơn', group: 'main' },
    { key: 'dang_san_xuat', icon: '🏭', short: 'Sản Xuất', group: 'main' },
    { key: 'hoan_thanh', icon: '🏆', short: 'Hoàn Thành', group: 'main' },
    { key: 'sau_ban_hang', icon: '📦', short: 'Sau Bán', group: 'main' },
    { key: 'tuong_tac_ket_noi', icon: '🔗', short: 'Kết Nối', group: 'main' },
    { key: 'gui_ct_kh_cu', icon: '🎟️', short: 'CT KH Cũ', group: 'main' },
];
const QT_JOURNEY_BRANCH = [
    { key: 'huy_coc', icon: '🚫', short: 'Hủy Cọc', group: 'branch' },
    { key: 'cap_cuu_sep', icon: '🚨', short: 'Cấp Cứu', group: 'branch' },
    { key: 'hoan_thanh_cap_cuu', icon: '🏥', short: 'HT Cấp Cứu', group: 'branch' },
    { key: 'tu_van_lai', icon: '🔄', short: 'TV Lại', group: 'branch' },
];

// ========== STATE ==========
let _qtAllTypes = [];
let _qtAllRules = {};
let _qtIsGD = false;
let _qtActiveTab = 'buttons';
let _qtTabCache = {};
let _qtSortDebounce = null;

// ========== MAIN ENTRY ==========
async function renderQuyTacTuVanPage(container) {
    _qtIsGD = currentUser && currentUser.role === 'giam_doc';
    _qtTabCache = {};

    container.innerHTML = `
        <div class="qt-page">
            <a class="qt-back" href="/crm-nhu-cau" onclick="event.preventDefault();navigate('crm-nhu-cau')">← Quay lại CRM Nhu Cầu</a>
            <div class="qt-header">
                <h2 class="qt-header-title">⚙️ Quy Tắc Nút Tư Vấn</h2>
                <span class="qt-header-badge">
                    ${_qtIsGD ? '🔓 Chế độ chỉnh sửa' : '👁️ Chế độ xem'}
                </span>
            </div>

            <div class="qt-tabs">
                <div class="qt-tab active" onclick="_qtSwitchTab('buttons')" id="qtTabButtons">📋 Danh Sách Nút (0)</div>
                <div class="qt-tab" onclick="_qtSwitchTab('rules')" id="qtTabRules">🔄 Quy Tắc Liên Kết</div>
            </div>
            <div class="qt-panel" id="qtPanel">
                ${_qtRenderSkeleton()}
            </div>
        </div>
    `;

    await _qtLoadData();
}

// ========== SKELETON LOADING ==========
function _qtRenderSkeleton() {
    let cards = '';
    for (let i = 0; i < 12; i++) {
        cards += `<div class="qt-skel-card" style="animation-delay:${i*60}ms"></div>`;
    }
    return `<div class="qt-btn-grid qt-skeleton">${cards}</div>`;
}

// ========== DATA LOADING ==========
async function _qtLoadData() {
    const [typesData, rulesData] = await Promise.all([
        apiCall('/api/consult-types'),
        apiCall('/api/consult-flow-rules')
    ]);
    _qtAllTypes = typesData.types || [];
    _qtAllRules = rulesData.rules || {};
    _qtTabCache = {};

    document.getElementById('qtTabButtons').innerHTML = `📋 Danh Sách Nút (${_qtAllTypes.length})`;
    _qtRenderActiveTab();
}

// ========== TAB SWITCHING ==========
function _qtSwitchTab(tab) {
    _qtActiveTab = tab;
    document.querySelectorAll('.qt-tab').forEach(t => t.classList.remove('active'));
    if (tab === 'buttons') {
        document.getElementById('qtTabButtons').classList.add('active');
    } else {
        document.getElementById('qtTabRules').classList.add('active');
    }
    _qtRenderActiveTab();
}

function _qtRenderActiveTab() {
    if (_qtActiveTab === 'buttons') {
        _qtRenderButtons();
    } else {
        _qtRenderRules();
    }
}

// ========== TAB 1: BUTTONS (Grouped by Stage) ==========
function _qtRenderButtons() {
    const panel = document.getElementById('qtPanel');

    // Action bar
    let html = '';
    if (_qtIsGD) {
        html += `<div class="qt-action-bar">
            <button class="qt-flow-edit-btn" onclick="_qtShowAddTypeModal()">➕ Thêm nút mới</button>
        </div>`;
    }

    // Collect keys already in stages
    const assignedKeys = new Set();
    QT_STAGES.forEach(s => s.keys.forEach(k => assignedKeys.add(k)));

    // Find unassigned types
    const unassigned = _qtAllTypes.filter(t => !assignedKeys.has(t.key));

    // Render each stage
    for (const stage of QT_STAGES) {
        const stageTypes = stage.keys
            .map(k => _qtAllTypes.find(t => t.key === k))
            .filter(Boolean);
        if (stageTypes.length === 0) continue;

        html += `
            <div class="qt-stage">
                <div class="qt-stage-header" style="background:${stage.gradient};">
                    <span class="qt-stage-header-icon">${stage.icon}</span>
                    <span class="qt-stage-header-text" style="color:${stage.textColor}">${stage.title}</span>
                    <span class="qt-stage-header-count" style="background:${stage.countBg};color:${stage.countColor}">${stageTypes.length} nút</span>
                </div>
                <div class="qt-btn-grid" data-stage="${stage.id}">
        `;
        for (const t of stageTypes) {
            html += _qtRenderButtonCard(t);
        }
        html += '</div></div>';
    }

    // Unassigned group
    if (unassigned.length > 0) {
        html += `
            <div class="qt-stage">
                <div class="qt-stage-header" style="background:linear-gradient(135deg,#f1f5f9,#f8fafc);">
                    <span class="qt-stage-header-icon">📋</span>
                    <span class="qt-stage-header-text" style="color:#64748b">Khác</span>
                    <span class="qt-stage-header-count" style="background:#e2e8f0;color:#64748b">${unassigned.length} nút</span>
                </div>
                <div class="qt-btn-grid" data-stage="other">
        `;
        for (const t of unassigned) {
            html += _qtRenderButtonCard(t);
        }
        html += '</div></div>';
    }

    panel.innerHTML = html;

    // Initialize drag & drop for each grid
    if (_qtIsGD && typeof Sortable !== 'undefined') {
        document.querySelectorAll('.qt-btn-grid').forEach(grid => {
            new Sortable(grid, {
                animation: 200,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                handle: '.qt-btn-card',
                group: 'buttons',
                onEnd: _qtOnButtonSortEnd
            });
        });
    }
}

function _qtRenderButtonCard(t) {
    return `
        <div class="qt-btn-card ${t.is_active ? '' : 'inactive'}" data-key="${t.key}" style="--card-accent:${t.color}">
            ${_qtIsGD ? `<span class="qt-drag-hint">⠿</span>` : ''}
            ${_qtIsGD ? `<button class="qt-edit-btn" onclick="event.stopPropagation();_qtShowEditTypeModal('${t.key}')">✏️</button>` : ''}
            <span class="qt-icon">${t.icon}</span>
            <div class="qt-label">${t.label}</div>
            <div class="qt-color-info">
                <span class="qt-color-dot" style="background:${t.color};color:${t.color}"></span>
                <span class="qt-color-hex">${t.color}</span>
            </div>
            <div class="qt-key">${t.key}</div>
            <span class="qt-status ${t.is_active ? 'qt-status-on' : 'qt-status-off'}">
                ${t.is_active ? '● Đang bật' : '○ Đã tắt'}
            </span>
        </div>
    `;
}

// Drag & drop sort handler for buttons
function _qtOnButtonSortEnd() {
    clearTimeout(_qtSortDebounce);
    _qtSortDebounce = setTimeout(() => {
        const orders = [];
        let globalOrder = 0;
        document.querySelectorAll('.qt-btn-grid').forEach(grid => {
            grid.querySelectorAll('.qt-btn-card').forEach(card => {
                globalOrder++;
                orders.push({ key: card.dataset.key, sort_order: globalOrder });
            });
        });
        _qtSaveSortOrder(orders);
    }, 500);
}

// ========== TAB 2: RULES (Flowchart + Accordion) ==========
function _qtRenderRules() {
    const panel = document.getElementById('qtPanel');

    // Flowchart
    let html = _qtRenderFlowchart();

    // Legend
    html += `
        <div class="qt-legend">
            <span class="qt-legend-item">⭐ = Nút mặc định (tự chọn)</span>
            <span class="qt-legend-item">📅 = Sau X ngày mới hiện</span>
            <span class="qt-legend-item">🔵 = Nút đích cho phép</span>
        </div>
    `;

    // Action bar
    if (_qtIsGD) {
        html += `<div class="qt-action-bar">
            <button class="qt-flow-edit-btn" onclick="_qtShowAddRuleGroupModal()">➕ Thêm nhóm quy tắc mới</button>
        </div>`;
    }

    // Define sections
    const SECTIONS = [
        {
            title: 'PHẦN 1: LÀM QUEN, TƯ VẤN KHÁCH',
            icon: '📋', color: '#3b82f6',
            gradient: 'linear-gradient(135deg,#1e3a5f,#0f172a)',
            loai: [
                { num: 1, label: 'Khi ấn: Gọi Điện / Nhắn Tin / Gặp TT / Gửi BG / Gửi Mẫu / TK / Sửa TK',
                  statuses: ['dang_tu_van','goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua'],
                  showFrom: 'dang_tu_van',
                  desc: 'Khách mới vào → hoặc sau khi ấn các nút tư vấn cơ bản → hiện lại đầy đủ nút' },
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
            icon: '📦', color: '#10b981',
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
            icon: '🚨', color: '#ef4444',
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

    // Render sections
    for (const section of SECTIONS) {
        html += `
            <div class="qt-section-divider" style="background:${section.gradient};border-left-color:${section.color};">
                <span class="qt-section-divider-icon">${section.icon}</span>
                <span class="qt-section-divider-text" style="color:${section.color}">${section.title}</span>
            </div>
        `;

        for (const loai of section.loai) {
            const mainStatus = loai.showFrom || loai.statuses[0];
            const rules = _qtAllRules[mainStatus];
            if (!rules || rules.length === 0) continue;

            // Sub-chips for grouped statuses
            let subChipsHTML = '';
            if (loai.statuses.length > 1) {
                subChipsHTML = '<div class="qt-flow-sub-chips">';
                for (const s of loai.statuses) {
                    const t = _qtAllTypes.find(x => x.key === s);
                    const lbl = t ? `${t.icon} ${t.label}` : (FLOW_STATUS_LABELS[s] || s);
                    subChipsHTML += `<span class="qt-sub-chip">${lbl}</span>`;
                }
                subChipsHTML += '</div>';
            }

            const sectionId = `qtRule_${mainStatus}`;
            html += `
                <div class="qt-flow-section ${loai.isOverride ? 'override' : ''}" id="${sectionId}">
                    <div class="qt-flow-header" onclick="_qtToggleSection(this)">
                        <div class="qt-flow-title">
                            <span class="qt-loai-badge" style="background:${section.color}">Loại ${loai.num}</span>
                            ${loai.label}
                            <span class="qt-flow-count">${rules.length} nút</span>
                            ${loai.isOverride ? '<span class="qt-override-tag">OVERRIDE</span>' : ''}
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            ${_qtIsGD ? `<button class="qt-flow-edit-btn" onclick="event.stopPropagation();_qtShowEditRulesModal('${mainStatus}')">✏️ Sửa</button>` : ''}
                            <span class="qt-flow-chevron">▼</span>
                        </div>
                    </div>
                    <div class="qt-flow-body">
                        ${subChipsHTML}
                        ${loai.desc ? `<div class="qt-flow-desc">💡 ${loai.desc}</div>` : ''}
                        <div class="qt-flow-label">Hiện các nút:</div>
                        <div class="qt-flow-targets">
            `;

            for (const r of rules) {
                const t = _qtAllTypes.find(x => x.key === r.to_type_key);
                const icon = t ? t.icon : r.to_icon || '📋';
                const label = t ? t.label : r.to_label || r.to_type_key;
                const color = t ? t.color : r.to_color || '#6b7280';

                html += `
                    <div class="qt-target-card" style="--target-color:${color}">
                        <span class="qt-t-icon">${icon}</span>
                        <div class="qt-t-label">${label}</div>
                        ${r.is_default ? '<div class="qt-t-default">⭐ Mặc định</div>' : ''}
                        ${r.delay_days > 0
                            ? `<div class="qt-t-delay">📅 Sau ${r.delay_days} ngày</div>`
                            : '<div class="qt-t-instant">⚡ Ngay lập tức</div>'}
                    </div>
                `;
            }

            html += '</div></div></div>';
        }
    }

    panel.innerHTML = html;

    // Auto-open first section
    const firstHeader = panel.querySelector('.qt-flow-header');
    if (firstHeader) _qtToggleSection(firstHeader);
}

// Toggle accordion section
function _qtToggleSection(header) {
    const body = header.nextElementSibling;
    const isOpen = body.classList.contains('open');
    header.classList.toggle('open', !isOpen);
    body.classList.toggle('open', !isOpen);
}

// ========== FLOWCHART ==========
function _qtRenderFlowchart() {
    let mainNodes = '';
    for (let i = 0; i < QT_JOURNEY_NODES.length; i++) {
        const n = QT_JOURNEY_NODES[i];
        const t = _qtAllTypes.find(x => x.key === n.key);
        const color = t ? t.color : '#6b7280';

        mainNodes += `
            <div class="qt-fc-node" onclick="_qtScrollToRule('${n.key}')" title="${n.tooltip || (t ? t.label : n.short)}">
                <div class="qt-fc-circle" style="border-color:${color}40;background:${color}15;">
                    ${n.icon}
                </div>
                <div class="qt-fc-name">${n.short}${n.multi ? ' ×7' : ''}</div>
            </div>
        `;
        if (i < QT_JOURNEY_NODES.length - 1) {
            mainNodes += '<div class="qt-fc-connector"></div>';
        }
    }

    let branchNodes = '';
    for (let i = 0; i < QT_JOURNEY_BRANCH.length; i++) {
        const n = QT_JOURNEY_BRANCH[i];
        const t = _qtAllTypes.find(x => x.key === n.key);
        const color = t ? t.color : '#ef4444';

        branchNodes += `
            <div class="qt-fc-node" onclick="_qtScrollToRule('${n.key}')" title="${t ? t.label : n.short}">
                <div class="qt-fc-circle" style="border-color:${color}40;background:${color}15;">
                    ${n.icon}
                </div>
                <div class="qt-fc-name">${n.short}</div>
            </div>
        `;
        if (i < QT_JOURNEY_BRANCH.length - 1) {
            branchNodes += '<div class="qt-fc-connector"></div>';
        }
    }

    return `
        <div class="qt-flowchart">
            <div class="qt-flowchart-title">Luồng Tư Vấn Khách Hàng — Customer Journey</div>
            <div class="qt-fc-row">${mainNodes}</div>
            <div class="qt-fc-branch">
                <div class="qt-fc-branch-label">↓ Nhánh Hủy / Cấp Cứu</div>
                <div class="qt-fc-row">${branchNodes}</div>
            </div>
        </div>
    `;
}

// Scroll to rule section when clicking flowchart node
function _qtScrollToRule(key) {
    const el = document.getElementById(`qtRule_${key}`);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Open the section
        const header = el.querySelector('.qt-flow-header');
        const body = el.querySelector('.qt-flow-body');
        if (header && body && !body.classList.contains('open')) {
            header.classList.add('open');
            body.classList.add('open');
        }
        // Flash highlight
        el.style.boxShadow = '0 0 0 3px #3b82f6';
        setTimeout(() => { el.style.boxShadow = ''; }, 1500);
    }
}

// ========== HELPER ==========
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
                        <input type="color" id="qtEditColor" value="${t.color}" style="width:50px;height:36px;padding:2px;cursor:pointer;border-radius:8px;">
                        <input type="text" id="qtEditColorText" value="${t.color}" onchange="document.getElementById('qtEditColor').value=this.value">
                    </div>
                </div>
                <div>
                    <label>Màu chữ</label>
                    <input type="text" id="qtEditTextColor" value="${t.text_color || 'white'}">
                </div>
            </div>
            <div style="margin-top:12px;">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;color:#334155;">
                    <input type="checkbox" id="qtEditActive" ${t.is_active ? 'checked' : ''} style="width:18px;height:18px;accent-color:#22c55e;">
                    Đang bật (hiển thị cho NV)
                </label>
            </div>
            <div class="qt-preview">
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
                    <input type="color" id="qtNewColor" value="#6b7280" style="width:50px;height:36px;border-radius:8px;">
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
                <span class="qt-ri-drag">⠿</span>
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
            <div style="margin-bottom:12px;padding:10px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
                <div class="qt-legend" style="margin:0;background:transparent;border:none;padding:0;">
                    <span class="qt-legend-item">⠿ Kéo sắp xếp</span>
                    <span class="qt-legend-item">☑ Bật/tắt nút</span>
                    <span class="qt-legend-item">📅 Delay (0 = ngay)</span>
                    <span class="qt-legend-item">⭐ Mặc định</span>
                </div>
            </div>
            <div class="qt-rule-list" id="qtRuleList">${listHTML}</div>
            <div class="qt-actions">
                <button class="qt-btn qt-btn-secondary" onclick="this.closest('.qt-modal-overlay').remove()">Hủy</button>
                <button class="qt-btn qt-btn-primary" onclick="_qtSaveRules('${fromStatus}')">💾 Lưu quy tắc</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Init drag & drop in rule list
    if (typeof Sortable !== 'undefined') {
        new Sortable(document.getElementById('qtRuleList'), {
            animation: 200,
            handle: '.qt-ri-drag',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
        });
    }
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
    _qtAllRules[from] = [];
    _qtShowEditRulesModal(from);
}

// ========== SORT ORDER API ==========
async function _qtSaveSortOrder(orders) {
    try {
        await apiCall('/api/consult-types/batch/sort-order', {
            method: 'PATCH',
            body: JSON.stringify({ orders }),
            headers: {'Content-Type':'application/json'}
        });
        showToast('✅ Đã lưu thứ tự!', 'success');
    } catch(e) {
        showToast('❌ Lỗi lưu thứ tự!', 'error');
    }
}
