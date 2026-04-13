// ========== TRANG QUẢN LÝ QUY TẮC NÚT TƯ VẤN — PREMIUM UI v2 ==========

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

// Preset gradient colors for stages
const STAGE_PRESETS = [
    { id: 'blue', name: '🔵 Ocean Blue', gradient: 'linear-gradient(135deg,#dbeafe,#eff6ff)', textColor: '#1e40af', countBg: '#bfdbfe', countColor: '#1e40af' },
    { id: 'gold', name: '🟡 Golden Sun', gradient: 'linear-gradient(135deg,#fef3c7,#fffbeb)', textColor: '#92400e', countBg: '#fde68a', countColor: '#92400e' },
    { id: 'green', name: '🟢 Forest Green', gradient: 'linear-gradient(135deg,#d1fae5,#ecfdf5)', textColor: '#065f46', countBg: '#a7f3d0', countColor: '#065f46' },
    { id: 'red', name: '🔴 Ruby Red', gradient: 'linear-gradient(135deg,#fee2e2,#fef2f2)', textColor: '#991b1b', countBg: '#fecaca', countColor: '#991b1b' },
    { id: 'purple', name: '🟣 Royal Purple', gradient: 'linear-gradient(135deg,#ede9fe,#f5f3ff)', textColor: '#5b21b6', countBg: '#ddd6fe', countColor: '#5b21b6' },
    { id: 'pink', name: '🩷 Rose Pink', gradient: 'linear-gradient(135deg,#fce7f3,#fdf2f8)', textColor: '#9d174d', countBg: '#fbcfe8', countColor: '#9d174d' },
    { id: 'orange', name: '🟠 Warm Orange', gradient: 'linear-gradient(135deg,#ffedd5,#fff7ed)', textColor: '#9a3412', countBg: '#fed7aa', countColor: '#9a3412' },
    { id: 'teal', name: '🩵 Cyan Teal', gradient: 'linear-gradient(135deg,#ccfbf1,#f0fdfa)', textColor: '#115e59', countBg: '#99f6e4', countColor: '#115e59' },
    { id: 'slate', name: '⚫ Slate Gray', gradient: 'linear-gradient(135deg,#e2e8f0,#f8fafc)', textColor: '#334155', countBg: '#cbd5e1', countColor: '#334155' },
    { id: 'indigo', name: '🧊 Indigo', gradient: 'linear-gradient(135deg,#e0e7ff,#eef2ff)', textColor: '#3730a3', countBg: '#c7d2fe', countColor: '#3730a3' },
];

// Flowchart journey definition
const QT_JOURNEY_NODES = [
    { key: 'dang_tu_van', icon: '🆕', short: 'Khách Mới' },
    { key: 'lam_quen_tuong_tac', icon: '👋', short: 'Làm Quen' },
    { key: 'goi_dien', icon: '📞', short: 'Tư Vấn', multi: true, tooltip: 'Gọi Điện / Nhắn Tin / Gặp TT / Gửi BG / Mẫu / TK / Sửa TK' },
    { key: 'gui_stk_coc', icon: '🏦', short: 'Gửi STK' },
    { key: 'giuc_coc', icon: '⏰', short: 'Giục Cọc' },
    { key: 'dat_coc', icon: '💵', short: 'Đặt Cọc' },
    { key: 'chot_don', icon: '✅', short: 'Chốt Đơn' },
    { key: 'dang_san_xuat', icon: '🏭', short: 'Sản Xuất' },
    { key: 'hoan_thanh', icon: '🏆', short: 'Hoàn Thành' },
    { key: 'sau_ban_hang', icon: '📦', short: 'Sau Bán' },
    { key: 'tuong_tac_ket_noi', icon: '🔗', short: 'Kết Nối' },
    { key: 'gui_ct_kh_cu', icon: '🎟️', short: 'CT KH Cũ' },
];
const QT_JOURNEY_BRANCH = [
    { key: 'huy_coc', icon: '🚫', short: 'Hủy Cọc' },
    { key: 'cap_cuu_sep', icon: '🚨', short: 'Cấp Cứu' },
    { key: 'hoan_thanh_cap_cuu', icon: '🏥', short: 'HT Cấp Cứu' },
    { key: 'tu_van_lai', icon: '🔄', short: 'TV Lại' },
];

// ========== STATE ==========
let _qtAllTypes = [];
let _qtAllRules = {};
let _qtStages = [];
let _qtSections = [];      // dynamic sections with section_order
let _qtUnsectioned = [];   // types without a section
let _qtIsGD = false;
let _qtActiveTab = 'buttons';
let _qtSortDebounce = null;

// ========== MAIN ENTRY ==========
async function renderQuyTacTuVanPage(container) {
    _qtIsGD = currentUser && currentUser.role === 'giam_doc';

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
            <div class="qt-panel" id="qtPanel">${_qtRenderSkeleton()}</div>
        </div>
    `;

    await _qtLoadData();
}

function _qtRenderSkeleton() {
    let cards = '';
    for (let i = 0; i < 12; i++) cards += `<div class="qt-skel-card" style="animation-delay:${i*60}ms"></div>`;
    return `<div class="qt-btn-grid qt-skeleton">${cards}</div>`;
}

// ========== DATA LOADING ==========
async function _qtLoadData() {
    const [typesData, rulesData, stagesData, sectionsData] = await Promise.all([
        apiCall('/api/consult-types'),
        apiCall('/api/consult-flow-rules'),
        apiCall('/api/consult-stages'),
        apiCall('/api/consult-sections')
    ]);
    _qtAllTypes = typesData.types || [];
    _qtAllRules = rulesData.rules || {};
    _qtStages = stagesData.stages || [];
    _qtSections = sectionsData.sections || [];
    _qtUnsectioned = sectionsData.unsectioned || [];
    // Sort stages by sort_order
    _qtStages.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    document.getElementById('qtTabButtons').innerHTML = `📋 Danh Sách Nút (${_qtAllTypes.length})`;
    _qtRenderActiveTab();
}

// ========== TAB SWITCHING ==========
function _qtSwitchTab(tab) {
    _qtActiveTab = tab;
    document.querySelectorAll('.qt-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(tab === 'buttons' ? 'qtTabButtons' : 'qtTabRules').classList.add('active');
    _qtRenderActiveTab();
}

function _qtRenderActiveTab() {
    if (_qtActiveTab === 'buttons') _qtRenderButtons();
    else _qtRenderRules();
}

// ========== TAB 1: BUTTONS (Dynamic Stages) ==========
function _qtRenderButtons() {
    const panel = document.getElementById('qtPanel');
    let html = '';

    // Action bar
    if (_qtIsGD) {
        html += `<div class="qt-action-bar" style="gap:8px;">
            <button class="qt-flow-edit-btn" style="background:linear-gradient(135deg,#10b981,#059669);" onclick="_qtShowAddStageModal()">📁 Thêm giai đoạn</button>
            <button class="qt-flow-edit-btn" onclick="_qtShowAddTypeModal()">➕ Thêm nút mới</button>
        </div>`;
    }

    // Render each stage from dynamic config
    for (const stage of _qtStages) {
        const stageTypes = _qtAllTypes.filter(t => t.stage === stage.id);
        html += `
            <div class="qt-stage" data-stage-id="${stage.id}">
                <div class="qt-stage-header" style="background:${stage.gradient};">
                    <span class="qt-stage-header-icon">${stage.icon}</span>
                    <span class="qt-stage-header-text" style="color:${stage.textColor}">${stage.title}</span>
                    <span class="qt-stage-header-count" style="background:${stage.countBg};color:${stage.countColor}">${stageTypes.length} nút</span>
                    ${_qtIsGD ? `
                        <button onclick="event.stopPropagation();_qtShowEditStageModal('${stage.id}')" style="background:none;border:none;cursor:pointer;font-size:14px;margin-left:4px;" title="Sửa giai đoạn">✏️</button>
                        <button onclick="event.stopPropagation();_qtDeleteStage('${stage.id}')" style="background:none;border:none;cursor:pointer;font-size:14px;" title="Xóa giai đoạn">🗑️</button>
                    ` : ''}
                </div>
                <div class="qt-btn-grid" data-stage="${stage.id}">
                    ${stageTypes.map(t => _qtRenderButtonCard(t)).join('')}
                </div>
            </div>
        `;
    }

    // Unassigned buttons (no stage)
    const unassigned = _qtAllTypes.filter(t => !t.stage || !_qtStages.find(s => s.id === t.stage));
    if (unassigned.length > 0) {
        html += `
            <div class="qt-stage" data-stage-id="_other">
                <div class="qt-stage-header" style="background:linear-gradient(135deg,#f1f5f9,#f8fafc);">
                    <span class="qt-stage-header-icon">📋</span>
                    <span class="qt-stage-header-text" style="color:#64748b">Chưa phân loại</span>
                    <span class="qt-stage-header-count" style="background:#e2e8f0;color:#64748b">${unassigned.length} nút</span>
                </div>
                <div class="qt-btn-grid" data-stage="_other">
                    ${unassigned.map(t => _qtRenderButtonCard(t)).join('')}
                </div>
            </div>
        `;
    }

    panel.innerHTML = html;

    // Event delegation for edit + delete buttons (avoids SortableJS blocking inline onclick)
    if (_qtIsGD) {
        panel.addEventListener('click', function(e) {
            const editBtn = e.target.closest('.qt-edit-btn');
            if (editBtn) {
                e.preventDefault();
                e.stopImmediatePropagation();
                const card = editBtn.closest('.qt-btn-card');
                if (card && card.dataset.key) _qtShowEditTypeModal(card.dataset.key);
                return;
            }
            const delBtn = e.target.closest('.qt-del-btn');
            if (delBtn) {
                e.preventDefault();
                e.stopImmediatePropagation();
                const card = delBtn.closest('.qt-btn-card');
                if (card && card.dataset.key) _qtDeleteType(card.dataset.key);
                return;
            }
        }, true);
    }

    // Initialize drag & drop
    if (_qtIsGD && typeof Sortable !== 'undefined') {
        document.querySelectorAll('.qt-btn-grid').forEach(grid => {
            new Sortable(grid, {
                animation: 200,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                handle: '.qt-drag-hint',
                filter: '.qt-edit-btn',
                preventOnFilter: false,
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
            ${_qtIsGD ? `<button class="qt-edit-btn" type="button">✏️</button>` : ''}
            ${_qtIsGD ? `<button class="qt-del-btn" type="button">🗑️</button>` : ''}
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

// Drag & drop sort handler
function _qtOnButtonSortEnd() {
    clearTimeout(_qtSortDebounce);
    _qtSortDebounce = setTimeout(() => {
        const orders = [];
        let globalOrder = 0;
        document.querySelectorAll('.qt-btn-grid').forEach(grid => {
            const stageId = grid.dataset.stage;
            grid.querySelectorAll('.qt-btn-card').forEach(card => {
                globalOrder++;
                orders.push({
                    key: card.dataset.key,
                    sort_order: globalOrder,
                    stage: stageId === '_other' ? null : stageId
                });
            });
        });
        _qtSaveSortOrder(orders);
    }, 500);
}

// ========== STAGE MANAGEMENT ==========
function _qtShowAddStageModal() {
    const presetsHTML = STAGE_PRESETS.map((p, i) => `
        <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:10px;cursor:pointer;border:2px solid transparent;transition:all .2s;" class="qt-preset-opt" onclick="document.querySelectorAll('.qt-preset-opt').forEach(x=>x.style.borderColor='transparent');this.style.borderColor='#2563eb';document.getElementById('qtStagePresetIdx').value=${i}">
            <div style="width:60px;height:28px;border-radius:6px;background:${p.gradient};flex-shrink:0;"></div>
            <span style="font-size:12px;font-weight:600;color:#334155;">${p.name}</span>
        </label>
    `).join('');

    const overlay = document.createElement('div');
    overlay.className = 'qt-modal-overlay';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
        <div class="qt-modal">
            <h3>📁 Thêm giai đoạn mới</h3>
            <input type="hidden" id="qtStagePresetIdx" value="0">
            <div class="qt-row">
                <div>
                    <label>Tên giai đoạn</label>
                    <input type="text" id="qtStageTitle" placeholder="VD: Giai Đoạn Sản Xuất">
                </div>
                <div style="flex:0 0 80px;">
                    <label>Icon</label>
                    <input type="text" id="qtStageIcon" value="🎯" style="text-align:center;font-size:20px;">
                </div>
            </div>
            <div style="margin-top:8px;">
                <label>Chọn màu sắc</label>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;max-height:240px;overflow-y:auto;">
                    ${presetsHTML}
                </div>
            </div>
            <div class="qt-actions">
                <button class="qt-btn qt-btn-secondary" onclick="this.closest('.qt-modal-overlay').remove()">Hủy</button>
                <button class="qt-btn qt-btn-primary" onclick="_qtAddStage()">📁 Thêm giai đoạn</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    // Auto-select first preset
    setTimeout(() => {
        const first = overlay.querySelector('.qt-preset-opt');
        if (first) first.style.borderColor = '#2563eb';
    }, 50);
}

async function _qtAddStage() {
    const title = document.getElementById('qtStageTitle').value.trim();
    const icon = document.getElementById('qtStageIcon').value.trim();
    if (!title) return showToast('❌ Vui lòng nhập tên giai đoạn!', 'error');

    const presetIdx = parseInt(document.getElementById('qtStagePresetIdx').value) || 0;
    const preset = STAGE_PRESETS[presetIdx];
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || ('stage_' + Date.now());

    const newStage = {
        id, title, icon: icon || '📋',
        gradient: preset.gradient, textColor: preset.textColor,
        countBg: preset.countBg, countColor: preset.countColor,
        sort_order: _qtStages.length + 1
    };

    _qtStages.push(newStage);
    await apiCall('/api/consult-stages', 'PUT', { stages: _qtStages });
    document.querySelector('.qt-modal-overlay')?.remove();
    showToast('✅ Đã thêm giai đoạn!', 'success');
    _qtRenderButtons();
}

function _qtShowEditStageModal(stageId) {
    const stage = _qtStages.find(s => s.id === stageId);
    if (!stage) return;

    const presetsHTML = STAGE_PRESETS.map((p, i) => {
        const isSelected = stage.gradient === p.gradient;
        return `
        <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:10px;cursor:pointer;border:2px solid ${isSelected ? '#2563eb' : 'transparent'};transition:all .2s;" class="qt-preset-opt" onclick="document.querySelectorAll('.qt-preset-opt').forEach(x=>x.style.borderColor='transparent');this.style.borderColor='#2563eb';document.getElementById('qtStagePresetIdx').value=${i}">
            <div style="width:60px;height:28px;border-radius:6px;background:${p.gradient};flex-shrink:0;"></div>
            <span style="font-size:12px;font-weight:600;color:#334155;">${p.name}</span>
        </label>
    `}).join('');

    const currentPresetIdx = STAGE_PRESETS.findIndex(p => p.gradient === stage.gradient);

    const overlay = document.createElement('div');
    overlay.className = 'qt-modal-overlay';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
        <div class="qt-modal">
            <h3>✏️ Sửa giai đoạn: ${stage.icon} ${stage.title}</h3>
            <input type="hidden" id="qtStagePresetIdx" value="${currentPresetIdx >= 0 ? currentPresetIdx : 0}">
            <div class="qt-row">
                <div>
                    <label>Tên giai đoạn</label>
                    <input type="text" id="qtStageTitle" value="${stage.title}">
                </div>
                <div style="flex:0 0 80px;">
                    <label>Icon</label>
                    <input type="text" id="qtStageIcon" value="${stage.icon}" style="text-align:center;font-size:20px;">
                </div>
            </div>
            <div style="margin-top:8px;">
                <label>Chọn màu sắc</label>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;max-height:240px;overflow-y:auto;">
                    ${presetsHTML}
                </div>
            </div>
            <div class="qt-actions">
                <button class="qt-btn qt-btn-secondary" onclick="this.closest('.qt-modal-overlay').remove()">Hủy</button>
                <button class="qt-btn qt-btn-primary" onclick="_qtSaveStage('${stageId}')">💾 Lưu</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function _qtSaveStage(stageId) {
    const stage = _qtStages.find(s => s.id === stageId);
    if (!stage) return;

    const presetIdx = parseInt(document.getElementById('qtStagePresetIdx').value) || 0;
    const preset = STAGE_PRESETS[presetIdx];

    stage.title = document.getElementById('qtStageTitle').value.trim() || stage.title;
    stage.icon = document.getElementById('qtStageIcon').value.trim() || stage.icon;
    stage.gradient = preset.gradient;
    stage.textColor = preset.textColor;
    stage.countBg = preset.countBg;
    stage.countColor = preset.countColor;

    await apiCall('/api/consult-stages', 'PUT', { stages: _qtStages });
    document.querySelector('.qt-modal-overlay')?.remove();
    showToast('✅ Đã lưu giai đoạn!', 'success');
    _qtRenderButtons();
}

async function _qtDeleteStage(stageId) {
    const stage = _qtStages.find(s => s.id === stageId);
    if (!stage) return;
    const count = _qtAllTypes.filter(t => t.stage === stageId).length;
    if (!confirm(`Xóa giai đoạn "${stage.title}"?\n${count > 0 ? `⚠️ ${count} nút sẽ chuyển về "Chưa phân loại"` : ''}`)) return;

    // Remove stage from config
    _qtStages = _qtStages.filter(s => s.id !== stageId);
    await apiCall('/api/consult-stages', 'PUT', { stages: _qtStages });

    // Clear stage from buttons
    const orders = _qtAllTypes.filter(t => t.stage === stageId).map((t, i) => ({ key: t.key, sort_order: 999 + i, stage: null }));
    if (orders.length > 0) {
        await apiCall('/api/consult-types/batch/sort-order', 'PATCH', { orders });
    }

    showToast('✅ Đã xóa giai đoạn!', 'success');
    await _qtLoadData();
}

// ========== DELETE TYPE ==========
async function _qtDeleteType(key) {
    const t = _qtAllTypes.find(x => x.key === key);
    if (!t) return;
    if (!confirm(`🗑️ Xóa nút "${t.icon} ${t.label}"?\n\nKey: ${t.key}\n⚠️ Hành động này không thể hoàn tác!`)) return;

    try {
        await apiCall(`/api/consult-types/${key}`, 'DELETE');
        showToast('✅ Đã xóa nút!', 'success');
        await _qtLoadData();
    } catch(e) {
        showToast('❌ Lỗi xóa nút: ' + (e.message || ''), 'error');
    }
}

// ========== EDIT TYPE MODAL ==========
function _qtShowEditTypeModal(key) {
    const t = _qtAllTypes.find(x => x.key === key);
    if (!t) return;

    const stageOptions = _qtStages.map(s => `<option value="${s.id}" ${t.stage === s.id ? 'selected' : ''}>${s.icon} ${s.title}</option>`).join('');

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
            <div style="margin-bottom:14px;">
                <label>Giai đoạn</label>
                <select id="qtEditStage" style="margin-top:4px;">
                    <option value="">— Chưa phân loại —</option>
                    ${stageOptions}
                </select>
            </div>
            <div>
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
        is_active: document.getElementById('qtEditActive').checked,
        stage: document.getElementById('qtEditStage').value || null
    };
    await apiCall(`/api/consult-types/${key}`, 'PUT', data);
    document.querySelector('.qt-modal-overlay')?.remove();
    showToast('✅ Đã lưu thay đổi!', 'success');
    await _qtLoadData();
}

function _qtShowAddTypeModal() {
    const stageOptions = _qtStages.map(s => `<option value="${s.id}">${s.icon} ${s.title}</option>`).join('');

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
                    <input type="color" id="qtNewColor" value="#6b7280" style="width:50px;height:36px;border-radius:8px;cursor:pointer;">
                </div>
                <div style="flex:2;">
                    <label>Giai đoạn</label>
                    <select id="qtNewStage" style="margin-top:4px;">
                        <option value="">— Chưa phân loại —</option>
                        ${stageOptions}
                    </select>
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
    const data = {
        key, label,
        icon: document.getElementById('qtNewIcon').value,
        color: document.getElementById('qtNewColor').value,
        stage: document.getElementById('qtNewStage').value || null
    };
    await apiCall('/api/consult-types', 'POST', data);
    document.querySelector('.qt-modal-overlay')?.remove();
    showToast('✅ Đã thêm nút mới!', 'success');
    await _qtLoadData();
}

// ========== TAB 2: RULES (Flowchart + Dynamic Accordion) ==========
function _qtRenderRules() {
    const panel = document.getElementById('qtPanel');
    let html = _qtRenderFlowchart();

    // Legend
    html += `
        <div class="qt-legend">
            <span class="qt-legend-item">⭐ = Nút mặc định (tự chọn)</span>
            <span class="qt-legend-item">📅 = Sau X ngày mới hiện</span>
            <span class="qt-legend-item">🔵 = Nút đích cho phép</span>
        </div>
    `;

    if (_qtIsGD) {
        const unsecCount = _qtUnsectioned.length;
        html += `<div class="qt-action-bar" style="gap:8px;">
            <div style="position:relative;display:inline-block;">
                <button class="qt-flow-edit-btn" style="background:linear-gradient(135deg,#f59e0b,#d97706);" onclick="_qtShowAddSectionModal()">📌 Thêm loại khi ấn ${unsecCount > 0 ? '<span style="background:#ef4444;color:white;padding:1px 7px;border-radius:10px;font-size:10px;margin-left:4px;">' + unsecCount + '</span>' : ''}</button>
            </div>
            <button class="qt-flow-edit-btn" onclick="_qtShowAddRuleGroupModal()">➕ Thêm nhóm quy tắc mới</button>
        </div>`;
    }

    // ★ DYNAMIC sections from API (sorted by section_order)
    for (const sec of _qtSections) {
        const rules = _qtAllRules[sec.key];
        if (!rules || rules.length === 0) continue;

        const tp = _qtAllTypes.find(x => x.key === sec.key);
        const label = tp ? `${tp.icon} ${tp.label}` : `${sec.icon} ${sec.label}`;
        const sectionId = `qtRule_${sec.key}`;

        html += `
            <div class="qt-flow-section" id="${sectionId}">
                <div class="qt-flow-header" onclick="_qtToggleSection(this)">
                    <div class="qt-flow-title">
                        <span class="qt-loai-badge" style="background:#3b82f6;cursor:${_qtIsGD ? 'pointer' : 'default'};" ${_qtIsGD ? `onclick="event.stopPropagation();_qtEditSectionOrder('${sec.key}',${sec.section_order})" title="Click để đổi STT"` : ''}>Loại ${sec.section_order}</span>
                        Khi ấn: ${sec.label}
                        <span class="qt-flow-count">${rules.length} nút</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        ${_qtIsGD ? `<button class="qt-flow-edit-btn" onclick="event.stopPropagation();_qtShowEditRulesModal('${sec.key}')">✏️ Sửa</button>` : ''}
                        <span class="qt-flow-chevron">▼</span>
                    </div>
                </div>
                <div class="qt-flow-body">
                    <div class="qt-flow-label">Hiện các nút:</div>
                    <div class="qt-flow-targets">
        `;

        for (const r of rules) {
            const rtp = _qtAllTypes.find(x => x.key === r.to_type_key);
            const icon = rtp ? rtp.icon : r.to_icon || '📋';
            const rlabel = rtp ? rtp.label : r.to_label || r.to_type_key;
            const color = rtp ? rtp.color : r.to_color || '#6b7280';
            html += `
                <div class="qt-target-card" style="--target-color:${color}">
                    <span class="qt-t-icon">${icon}</span>
                    <div class="qt-t-label">${rlabel}</div>
                    ${r.is_default ? '<div class="qt-t-default">⭐ Mặc định</div>' : ''}
                    ${r.delay_days > 0
                        ? `<div class="qt-t-delay">📅 Sau ${r.delay_days} ngày</div>`
                        : '<div class="qt-t-instant">⚡ Ngay lập tức</div>'}
                </div>
            `;
        }
        html += '</div></div></div>';
    }

    panel.innerHTML = html;
    const firstHeader = panel.querySelector('.qt-flow-header');
    if (firstHeader) _qtToggleSection(firstHeader);
}

// ========== ADD SECTION (Thêm loại khi ấn) ==========
function _qtShowAddSectionModal() {
    if (_qtUnsectioned.length === 0) return showToast('✅ Tất cả nút đã có loại!', 'success');
    const nextOrder = _qtSections.length > 0 ? Math.max(..._qtSections.map(s => s.section_order)) + 1 : 1;

    let listHTML = _qtUnsectioned.map(t => `
        <div class="qt-rule-item" data-key="${t.key}" style="cursor:pointer;" onclick="this.querySelector('input[type=checkbox]').click()">
            <input type="checkbox" class="qt-ri-check" onclick="event.stopPropagation()">
            <div class="qt-ri-info">
                <span class="qt-ri-icon">${t.icon}</span>
                <span class="qt-ri-label">${t.label}</span>
            </div>
            <span style="font-size:10px;color:#94a3b8;">${t.key}</span>
        </div>
    `).join('');

    const overlay = document.createElement('div');
    overlay.className = 'qt-modal-overlay';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
        <div class="qt-modal">
            <h3>📌 Thêm loại khi ấn</h3>
            <p style="font-size:12px;color:#64748b;margin-bottom:12px;">Chọn nút chưa có loại → tạo section "Khi ấn: ..." cho nó</p>
            <div class="qt-rule-list" style="max-height:300px;overflow-y:auto;">${listHTML}</div>
            <div style="margin-top:12px;">
                <label style="font-size:13px;font-weight:600;color:#334155;">Bắt đầu từ Loại số:</label>
                <input type="number" id="qtNewSectionOrder" value="${nextOrder}" min="1" style="width:80px;padding:6px 10px;font-size:14px;font-weight:700;border:2px solid #3b82f6;border-radius:8px;text-align:center;margin-left:8px;">
            </div>
            <div class="qt-actions">
                <button class="qt-btn qt-btn-secondary" onclick="this.closest('.qt-modal-overlay').remove()">Hủy</button>
                <button class="qt-btn qt-btn-primary" onclick="_qtAddSections()">📌 Thêm loại</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function _qtAddSections() {
    const items = document.querySelectorAll('.qt-rule-list .qt-rule-item');
    const selected = [];
    items.forEach(item => {
        if (item.querySelector('.qt-ri-check').checked) selected.push(item.dataset.key);
    });
    if (selected.length === 0) return showToast('❌ Chọn ít nhất 1 nút!', 'error');

    let startOrder = parseInt(document.getElementById('qtNewSectionOrder').value) || 1;

    for (const key of selected) {
        // Create flow rule if missing
        await apiCall(`/api/consult-flow-rules/${key}`, 'PUT', {
            rules: [{ to_type_key: key, is_default: true, delay_days: 0, sort_order: 1 }]
        });
        // Set section order
        await apiCall(`/api/consult-types/${key}/section-order`, 'PATCH', { section_order: startOrder });
        startOrder++;
    }

    document.querySelector('.qt-modal-overlay')?.remove();
    showToast(`✅ Đã thêm ${selected.length} loại!`, 'success');
    await _qtLoadData();
    _qtSwitchTab('rules');
}

// ========== EDIT SECTION ORDER (click badge) ==========
function _qtEditSectionOrder(key, currentOrder) {
    const tp = _qtAllTypes.find(x => x.key === key);
    const label = tp ? `${tp.icon} ${tp.label}` : key;
    const newOrder = prompt(`Đổi STT cho "${label}"\n\nHiện tại: Loại ${currentOrder}\nNhập số mới:`, currentOrder);
    if (!newOrder || isNaN(newOrder) || parseInt(newOrder) < 1) return;
    if (parseInt(newOrder) === currentOrder) return;

    apiCall(`/api/consult-types/${key}/section-order`, 'PATCH', { section_order: parseInt(newOrder) })
        .then(() => {
            showToast(`✅ Đã đổi thành Loại ${newOrder}!`, 'success');
            _qtLoadData().then(() => _qtSwitchTab('rules'));
        })
        .catch(e => showToast('❌ Lỗi: ' + (e.message || ''), 'error'));
}

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
                <div class="qt-fc-circle" style="border-color:${color}40;background:${color}15;">${n.icon}</div>
                <div class="qt-fc-name">${n.short}${n.multi ? ' ×7' : ''}</div>
            </div>
        `;
        if (i < QT_JOURNEY_NODES.length - 1) mainNodes += '<div class="qt-fc-connector"></div>';
    }

    let branchNodes = '';
    for (let i = 0; i < QT_JOURNEY_BRANCH.length; i++) {
        const n = QT_JOURNEY_BRANCH[i];
        const t = _qtAllTypes.find(x => x.key === n.key);
        const color = t ? t.color : '#ef4444';
        branchNodes += `
            <div class="qt-fc-node" onclick="_qtScrollToRule('${n.key}')" title="${t ? t.label : n.short}">
                <div class="qt-fc-circle" style="border-color:${color}40;background:${color}15;">${n.icon}</div>
                <div class="qt-fc-name">${n.short}</div>
            </div>
        `;
        if (i < QT_JOURNEY_BRANCH.length - 1) branchNodes += '<div class="qt-fc-connector"></div>';
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

function _qtScrollToRule(key) {
    const el = document.getElementById(`qtRule_${key}`);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const header = el.querySelector('.qt-flow-header');
        const body = el.querySelector('.qt-flow-body');
        if (header && body && !body.classList.contains('open')) {
            header.classList.add('open');
            body.classList.add('open');
        }
        el.style.boxShadow = '0 0 0 3px #3b82f6';
        setTimeout(() => { el.style.boxShadow = ''; }, 1500);
    }
}

// ========== EDIT RULES MODAL ==========
function _qtShowEditRulesModal(fromStatus) {
    const rules = _qtAllRules[fromStatus] || [];
    const statusLabel = FLOW_STATUS_LABELS[fromStatus] || _qtGetTypeLabel(fromStatus) || fromStatus;

    // ★ Only show types that have their own section (section_order > 0)
    // Exception: types already in this rule group are always shown
    const sectionKeys = new Set(_qtSections.map(s => s.key));
    const eligibleTypes = _qtAllTypes.filter(t => {
        return sectionKeys.has(t.key) || rules.some(r => r.to_type_key === t.key);
    });

    let listHTML = '';
    for (const t of eligibleTypes) {
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
                    <input type="number" class="qt-ri-delay" value="${delay}" min="0" max="90" style="width:50px;text-align:center;padding:4px;font-size:12px;" data-format-number-skip>
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
        const delayInput = item.querySelector('.qt-ri-delay');
        const rawVal = delayInput.getAttribute('value') || delayInput.value;
        rules.push({
            to_type_key: item.dataset.key,
            delay_days: parseInt(rawVal) || 0,
            is_default: item.querySelector('.qt-ri-default').checked,
            sort_order: order
        });
    });

    await apiCall(`/api/consult-flow-rules/${fromStatus}`, 'PUT', { rules });
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
                <select id="qtNewRuleFrom" style="margin-top:4px;">${optionsHTML}</select>
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

// ========== HELPERS ==========
function _qtGetTypeLabel(key) {
    const t = _qtAllTypes.find(x => x.key === key);
    return t ? `${t.icon} ${t.label}` : key;
}

async function _qtSaveSortOrder(orders) {
    try {
        await apiCall('/api/consult-types/batch/sort-order', 'PATCH', { orders });
        showToast('✅ Đã lưu thứ tự!', 'success');
    } catch(e) {
        showToast('❌ Lỗi lưu thứ tự!', 'error');
    }
}
