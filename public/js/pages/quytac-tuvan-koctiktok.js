// ========== TRANG QUẢN LÝ QUY TẮC NÚT TƯ VẤN — PREMIUM UI v2 ==========

// Status labels for display
const KOC_FLOW_STATUS_LABELS = {
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
    duyet_huy: '🚫 Hủy Khách (Đã Duyệt)',
    cho_duyet_huy: '⏳ Chờ Duyệt Hủy',
    hoan_thanh_cap_cuu: '🏥 Hoàn Thành Cấp Cứu',
    pending_emergency: '🚨 Đang có Cấp Cứu Sếp',
    cancel_auto_revert: '❌ KH bị auto-revert hủy',
};

// Preset gradient colors for stages
const KOC_STAGE_PRESETS = [
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


// ========== STATE ==========
let _qtKAllTypes = [];
let _qtKAllRules = {};
let _qtKStages = [];
let _qtKSections = [];      // dynamic sections with section_order
let _qtKUnsectioned = [];   // types without a section
let _qtKGroupMembers = [];  // buttons belonging to a group (section_order=0)
let _qtKRulePhases = [];    // dynamic phase groups (PHẦN 1, 2, 3...)
let _qtKIsGD = false;
let _qtKActiveTab = localStorage.getItem('qt_active_tab') || 'buttons';
let _qtKSortDebounce = null;

// ========== MAIN ENTRY ==========
async function renderQuyTacTuVanKocPage(container) {
    _qtKIsGD = currentUser && currentUser.role === 'giam_doc';

    container.innerHTML = `
        <div class="qt-page">
            <a class="qt-back" href="/crm-koc-tiktok" onclick="event.preventDefault();navigate('crm-koc-tiktok')">← Quay lại CRM KOL/KOC Tiktok</a>
            <div class="qt-header">
                <h2 class="qt-header-title">⚙️ Quy Tắc Nút Tư Vấn</h2>
                <span class="qt-header-badge">
                    ${_qtKIsGD ? '🔓 Chế độ chỉnh sửa' : '👁️ Chế độ xem'}
                </span>
            </div>
            <div class="qt-tabs">
                <div class="qt-tab${_qtKActiveTab === 'buttons' ? ' active' : ''}" onclick="_qtKSwitchTab('buttons')" id="qtTabButtons">📋 Danh Sách Nút (0)</div>
                <div class="qt-tab${_qtKActiveTab === 'rules' ? ' active' : ''}" onclick="_qtKSwitchTab('rules')" id="qtTabRules">🔄 Quy Tắc Liên Kết</div>
            </div>
            <div class="qt-panel" id="qtPanel">${_qtKRenderSkeleton()}</div>
        </div>
    `;

    await _qtKLoadData();
}

function _qtKRenderSkeleton() {
    let cards = '';
    for (let i = 0; i < 12; i++) cards += `<div class="qt-skel-card" style="animation-delay:${i*60}ms"></div>`;
    return `<div class="qt-btn-grid qt-skeleton">${cards}</div>`;
}

// ========== DATA LOADING ==========
async function _qtKLoadData() {
    const [typesData, rulesData, stagesData, sectionsData, phasesData] = await Promise.all([
        apiCall('/api/consult-types?crm_menu=koc_tiktok'),
        apiCall('/api/consult-flow-rules?crm_menu=koc_tiktok'),
        apiCall('/api/consult-stages'),
        apiCall('/api/consult-sections?crm_menu=koc_tiktok'),
        apiCall('/api/consult-rule-phases')
    ]);
    _qtKAllTypes = typesData.types || [];
    _qtKAllRules = rulesData.rules || {};
    _qtKStages = stagesData.stages || [];
    _qtKSections = sectionsData.sections || [];
    _qtKUnsectioned = (sectionsData.unsectioned || []).filter(t => !['cap_cuu_sep', 'huy'].includes(t.key));
    _qtKGroupMembers = sectionsData.groupMembers || [];
    _qtKRulePhases = phasesData.phases || [];
    _qtKRulePhases.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    // Sort stages by sort_order
    _qtKStages.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    document.getElementById('qtTabButtons').innerHTML = `📋 Danh Sách Nút (${_qtKAllTypes.length})`;
    _qtKRenderActiveTab();
}

// ========== TAB SWITCHING ==========
function _qtKSwitchTab(tab) {
    _qtKActiveTab = tab;
    localStorage.setItem('qt_active_tab', tab);
    document.querySelectorAll('.qt-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(tab === 'buttons' ? 'qtTabButtons' : 'qtTabRules').classList.add('active');
    _qtKRenderActiveTab();
}

function _qtKRenderActiveTab() {
    if (_qtKActiveTab === 'buttons') _qtKRenderButtons();
    else _qtKRenderRules();
}

// ========== TAB 1: BUTTONS (Dynamic Stages) ==========
function _qtKRenderButtons() {
    const panel = document.getElementById('qtPanel');
    let html = '';

    // Action bar
    if (_qtKIsGD) {
        html += `<div class="qt-action-bar" style="gap:8px;">
            <button class="qt-flow-edit-btn" style="background:linear-gradient(135deg,#10b981,#059669);" onclick="_qtKShowAddStageModal()">📁 Thêm giai đoạn</button>
            <button class="qt-flow-edit-btn" onclick="_qtKShowAddTypeModal()">➕ Thêm nút mới</button>
        </div>`;
    }

    // Render each stage from dynamic config
    for (const stage of _qtKStages) {
        const stageTypes = _qtKAllTypes.filter(t => t.stage === stage.id);
        html += `
            <div class="qt-stage" data-stage-id="${stage.id}">
                <div class="qt-stage-header" style="background:${stage.gradient};">
                    <span class="qt-stage-header-icon">${stage.icon}</span>
                    <span class="qt-stage-header-text" style="color:${stage.textColor}">${stage.title}</span>
                    <span class="qt-stage-header-count" style="background:${stage.countBg};color:${stage.countColor}">${stageTypes.length} nút</span>
                    ${_qtKIsGD ? `
                        <button onclick="event.stopPropagation();_qtKShowEditStageModal('${stage.id}')" style="background:none;border:none;cursor:pointer;font-size:14px;margin-left:4px;" title="Sửa giai đoạn">✏️</button>
                        <button onclick="event.stopPropagation();_qtKDeleteStage('${stage.id}')" style="background:none;border:none;cursor:pointer;font-size:14px;" title="Xóa giai đoạn">🗑️</button>
                    ` : ''}
                </div>
                <div class="qt-btn-grid" data-stage="${stage.id}">
                    ${stageTypes.map(t => _qtKRenderButtonCard(t)).join('')}
                </div>
            </div>
        `;
    }

    // Unassigned buttons (no stage)
    const unassigned = _qtKAllTypes.filter(t => !t.stage || !_qtKStages.find(s => s.id === t.stage));
    if (unassigned.length > 0) {
        html += `
            <div class="qt-stage" data-stage-id="_other">
                <div class="qt-stage-header" style="background:linear-gradient(135deg,#f1f5f9,#f8fafc);">
                    <span class="qt-stage-header-icon">📋</span>
                    <span class="qt-stage-header-text" style="color:#64748b">Chưa phân loại</span>
                    <span class="qt-stage-header-count" style="background:#e2e8f0;color:#64748b">${unassigned.length} nút</span>
                </div>
                <div class="qt-btn-grid" data-stage="_other">
                    ${unassigned.map(t => _qtKRenderButtonCard(t)).join('')}
                </div>
            </div>
        `;
    }

    panel.innerHTML = html;

    // Event delegation for edit + delete buttons (avoids SortableJS blocking inline onclick)
    if (_qtKIsGD) {
        panel.addEventListener('click', function(e) {
            const editBtn = e.target.closest('.qt-edit-btn');
            if (editBtn) {
                e.preventDefault();
                e.stopImmediatePropagation();
                const card = editBtn.closest('.qt-btn-card');
                if (card && card.dataset.key) _qtKShowEditTypeModal(card.dataset.key);
                return;
            }
            const delBtn = e.target.closest('.qt-del-btn');
            if (delBtn) {
                e.preventDefault();
                e.stopImmediatePropagation();
                const card = delBtn.closest('.qt-btn-card');
                if (card && card.dataset.key) _qtKDeleteType(card.dataset.key);
                return;
            }
        }, true);
    }

    // Initialize drag & drop
    if (_qtKIsGD && typeof Sortable !== 'undefined') {
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
                onEnd: _qtKOnButtonSortEnd
            });
        });
    }
}

function _qtKRenderButtonCard(t) {
    return `
        <div class="qt-btn-card ${t.is_active ? '' : 'inactive'}" data-key="${t.key}" style="--card-accent:${t.color}">
            ${_qtKIsGD ? `<span class="qt-drag-hint">⠿</span>` : ''}
            ${_qtKIsGD ? `<button class="qt-edit-btn" type="button">✏️</button>` : ''}
            ${_qtKIsGD ? `<button class="qt-del-btn" type="button">🗑️</button>` : ''}
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
function _qtKOnButtonSortEnd() {
    clearTimeout(_qtKSortDebounce);
    _qtKSortDebounce = setTimeout(() => {
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
        _qtKSaveSortOrder(orders);
    }, 500);
}

// ========== STAGE MANAGEMENT ==========
function _qtKShowAddStageModal() {
    const presetsHTML = KOC_STAGE_PRESETS.map((p, i) => `
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
                <button class="qt-btn qt-btn-primary" onclick="_qtKAddStage()">📁 Thêm giai đoạn</button>
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

async function _qtKAddStage() {
    const title = document.getElementById('qtStageTitle').value.trim();
    const icon = document.getElementById('qtStageIcon').value.trim();
    if (!title) return showToast('❌ Vui lòng nhập tên giai đoạn!', 'error');

    const presetIdx = parseInt(document.getElementById('qtStagePresetIdx').value) || 0;
    const preset = KOC_STAGE_PRESETS[presetIdx];
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || ('stage_' + Date.now());

    const newStage = {
        id, title, icon: icon || '📋',
        gradient: preset.gradient, textColor: preset.textColor,
        countBg: preset.countBg, countColor: preset.countColor,
        sort_order: _qtKStages.length + 1
    };

    _qtKStages.push(newStage);
    await apiCall('/api/consult-stages', 'PUT', { stages: _qtKStages });
    document.querySelector('.qt-modal-overlay')?.remove();
    showToast('✅ Đã thêm giai đoạn!', 'success');
    _qtKRenderButtons();
}

function _qtKShowEditStageModal(stageId) {
    const stage = _qtKStages.find(s => s.id === stageId);
    if (!stage) return;

    const presetsHTML = KOC_STAGE_PRESETS.map((p, i) => {
        const isSelected = stage.gradient === p.gradient;
        return `
        <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:10px;cursor:pointer;border:2px solid ${isSelected ? '#2563eb' : 'transparent'};transition:all .2s;" class="qt-preset-opt" onclick="document.querySelectorAll('.qt-preset-opt').forEach(x=>x.style.borderColor='transparent');this.style.borderColor='#2563eb';document.getElementById('qtStagePresetIdx').value=${i}">
            <div style="width:60px;height:28px;border-radius:6px;background:${p.gradient};flex-shrink:0;"></div>
            <span style="font-size:12px;font-weight:600;color:#334155;">${p.name}</span>
        </label>
    `}).join('');

    const currentPresetIdx = KOC_STAGE_PRESETS.findIndex(p => p.gradient === stage.gradient);

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
                <button class="qt-btn qt-btn-primary" onclick="_qtKSaveStage('${stageId}')">💾 Lưu</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function _qtKSaveStage(stageId) {
    const stage = _qtKStages.find(s => s.id === stageId);
    if (!stage) return;

    const presetIdx = parseInt(document.getElementById('qtStagePresetIdx').value) || 0;
    const preset = KOC_STAGE_PRESETS[presetIdx];

    stage.title = document.getElementById('qtStageTitle').value.trim() || stage.title;
    stage.icon = document.getElementById('qtStageIcon').value.trim() || stage.icon;
    stage.gradient = preset.gradient;
    stage.textColor = preset.textColor;
    stage.countBg = preset.countBg;
    stage.countColor = preset.countColor;

    await apiCall('/api/consult-stages', 'PUT', { stages: _qtKStages });
    document.querySelector('.qt-modal-overlay')?.remove();
    showToast('✅ Đã lưu giai đoạn!', 'success');
    _qtKRenderButtons();
}

async function _qtKDeleteStage(stageId) {
    const stage = _qtKStages.find(s => s.id === stageId);
    if (!stage) return;
    const count = _qtKAllTypes.filter(t => t.stage === stageId).length;
    if (!confirm(`Xóa giai đoạn "${stage.title}"?\n${count > 0 ? `⚠️ ${count} nút sẽ chuyển về "Chưa phân loại"` : ''}`)) return;

    // Remove stage from config
    _qtKStages = _qtKStages.filter(s => s.id !== stageId);
    await apiCall('/api/consult-stages', 'PUT', { stages: _qtKStages });

    // Clear stage from buttons
    const orders = _qtKAllTypes.filter(t => t.stage === stageId).map((t, i) => ({ key: t.key, sort_order: 999 + i, stage: null }));
    if (orders.length > 0) {
        await apiCall('/api/consult-types/batch/sort-order', 'PATCH', { orders });
    }

    showToast('✅ Đã xóa giai đoạn!', 'success');
    await _qtKLoadData();
}

// ========== DELETE TYPE ==========
async function _qtKDeleteType(key) {
    const t = _qtKAllTypes.find(x => x.key === key);
    if (!t) return;
    if (!confirm(`🗑️ Xóa nút "${t.icon} ${t.label}"?\n\nKey: ${t.key}\n⚠️ Hành động này không thể hoàn tác!`)) return;

    try {
        await apiCall(`/api/consult-types/${key}`, 'DELETE');
        showToast('✅ Đã xóa nút!', 'success');
        await _qtKLoadData();
    } catch(e) {
        showToast('❌ Lỗi xóa nút: ' + (e.message || ''), 'error');
    }
}

// ========== EDIT TYPE MODAL ==========
function _qtKShowEditTypeModal(key) {
    const t = _qtKAllTypes.find(x => x.key === key);
    if (!t) return;

    const stageOptions = _qtKStages.map(s => `<option value="${s.id}" ${t.stage === s.id ? 'selected' : ''}>${s.icon} ${s.title}</option>`).join('');

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
                <button class="qt-btn qt-btn-primary" onclick="_qtKSaveType('${key}')">💾 Lưu</button>
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

async function _qtKSaveType(key) {
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
    await _qtKLoadData();
}

function _qtKShowAddTypeModal() {
    const stageOptions = _qtKStages.map(s => `<option value="${s.id}">${s.icon} ${s.title}</option>`).join('');

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
                <button class="qt-btn qt-btn-primary" onclick="_qtKAddType()">➕ Thêm</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function _qtKAddType() {
    const key = document.getElementById('qtNewKey').value.trim();
    const label = document.getElementById('qtNewLabel').value.trim();
    if (!key || !label) return showToast('❌ Vui lòng nhập Key và Tên!', 'error');
    const data = {
        key, label,
        icon: document.getElementById('qtNewIcon').value,
        color: document.getElementById('qtNewColor').value,
        stage: document.getElementById('qtNewStage').value || null
    };
    await apiCall('/api/consult-types', 'POST', {...data, crm_menu: 'koc_tiktok'});
    document.querySelector('.qt-modal-overlay')?.remove();
    showToast('✅ Đã thêm nút mới!', 'success');
    await _qtKLoadData();
}

// ========== TAB 2: RULES (Flowchart + Dynamic Accordion) ==========
function _qtKRenderRules() {
    const panel = document.getElementById('qtPanel');
    let html = _qtKRenderFlowchart();

    // Legend
    html += `
        <div class="qt-legend">
            <span class="qt-legend-item">⭐ = Nút mặc định (tự chọn)</span>
            <span class="qt-legend-item">📅 = Sau X ngày mới hiện</span>
            <span class="qt-legend-item">🔵 = Nút đích cho phép</span>
        </div>
    `;

    if (_qtKIsGD) {
        const unsecCount = _qtKUnsectioned.length;
        html += `<div class="qt-action-bar" style="gap:8px;">
            <button class="qt-flow-edit-btn" style="background:linear-gradient(135deg,#10b981,#059669);" onclick="_qtKShowAddPhaseModal()">📂 Thêm Phần</button>
            <button class="qt-flow-edit-btn" onclick="_qtKShowAddRuleGroupModal()">➕ Thêm nhóm quy tắc mới ${unsecCount > 0 ? '<span style="background:#ef4444;color:white;padding:1px 7px;border-radius:10px;font-size:10px;margin-left:4px;">' + unsecCount + '</span>' : ''}</button>
        </div>`;
    }

    // ★ DYNAMIC phases from API
    const renderedPhaseIds = new Set();
    for (const phase of _qtKRulePhases) {
        const phaseSections = _qtKSections.filter(s => s.rule_phase === phase.id);
        renderedPhaseIds.add(phase.id);

        html += `
            <div class="qt-section-divider" style="background:${phase.gradient};border-left-color:${phase.color};">
                <span class="qt-section-divider-icon">${phase.icon}</span>
                <span class="qt-section-divider-text" style="color:${phase.color}">PHẦN ${phase.sort_order}: ${phase.title}</span>
                ${_qtKIsGD ? `<div style="margin-left:auto;display:flex;gap:6px;">
                    <button onclick="event.stopPropagation();_qtKEditPhase('${phase.id}')" style="background:none;border:none;cursor:pointer;font-size:14px;" title="Sửa phần">✏️</button>
                    <button onclick="event.stopPropagation();_qtKDeletePhase('${phase.id}')" style="background:none;border:none;cursor:pointer;font-size:14px;" title="Xóa phần">🗑️</button>
                </div>` : ''}
            </div>
        `;

        if (phaseSections.length === 0) {
            html += `<div style="padding:16px 24px;color:#94a3b8;font-style:italic;font-size:13px;">— Chưa có loại nào trong phần này —</div>`;
        }

        // Sub-group visual labels for special statuses
        const SUBGROUP_EMERGENCY = ['hoan_thanh_cap_cuu', 'pending_emergency'];
        const SUBGROUP_CANCEL = ['cho_duyet_huy', 'duyet_huy', 'tu_van_lai'];
        let _emSubShown = false, _cancelSubShown = false;

        for (const sec of phaseSections) {
            // Inject sub-group label before first emergency section
            if (!_emSubShown && SUBGROUP_EMERGENCY.includes(sec.key)) {
                _emSubShown = true;
                html += `<div style="margin:16px 0 8px;padding:8px 16px;background:linear-gradient(135deg,#fef2f2,#fff1f2);border-left:4px solid #ef4444;border-radius:0 8px 8px 0;display:flex;align-items:center;gap:8px;">
                    <span style="font-size:16px;">🚨</span>
                    <span style="font-size:13px;font-weight:700;color:#991b1b;letter-spacing:0.5px;">CẤP CỨU SẾP</span>
                    <span style="font-size:10px;color:#b91c1c;opacity:0.7;">— Loại ${SUBGROUP_EMERGENCY.map(k => { const s = phaseSections.find(x => x.key === k); return s ? s.section_order : ''; }).filter(Boolean).join(', ')}</span>
                </div>`;
            }
            // Inject sub-group label before first cancel section
            if (!_cancelSubShown && SUBGROUP_CANCEL.includes(sec.key)) {
                _cancelSubShown = true;
                html += `<div style="margin:16px 0 8px;padding:8px 16px;background:linear-gradient(135deg,#fff7ed,#fffbeb);border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;display:flex;align-items:center;gap:8px;">
                    <span style="font-size:16px;">❌</span>
                    <span style="font-size:13px;font-weight:700;color:#92400e;letter-spacing:0.5px;">HỦY KHÁCH</span>
                    <span style="font-size:10px;color:#b45309;opacity:0.7;">— Loại ${SUBGROUP_CANCEL.map(k => { const s = phaseSections.find(x => x.key === k); return s ? s.section_order : ''; }).filter(Boolean).join(', ')}</span>
                </div>`;
            }
            html += _qtKRenderSectionAccordion(sec);
        }
    }

    // Sections without a phase
    const unphased = _qtKSections.filter(s => !s.rule_phase || !renderedPhaseIds.has(s.rule_phase));
    if (unphased.length > 0) {
        html += `
            <div class="qt-section-divider" style="background:linear-gradient(135deg,#334155,#1e293b);border-left-color:#64748b;">
                <span class="qt-section-divider-icon">📋</span>
                <span class="qt-section-divider-text" style="color:#94a3b8;">CHƯA PHÂN PHẦN</span>
            </div>
        `;
        for (const sec of unphased) {
            html += _qtKRenderSectionAccordion(sec);
        }
    }

    panel.innerHTML = html;
    const firstHeader = panel.querySelector('.qt-flow-header');
    if (firstHeader) _qtKToggleSection(firstHeader);
}

// Render a single section accordion item
function _qtKRenderSectionAccordion(sec) {
    // Check if this is a group leader
    const isGroup = !!sec.section_group;
    const groupKeys = isGroup ? _qtKGetGroupKeys(sec.section_group) : [sec.key];
    const rules = _qtKAllRules[sec.key];
    const isWaitingStatus = sec.key === 'cho_duyet_huy';
    const isEmergencyPending = sec.key === 'pending_emergency';
    const isEmergencyDone = sec.key === 'hoan_thanh_cap_cuu';
    const hasInfoBlock = isWaitingStatus || isEmergencyPending || isEmergencyDone;
    if (!hasInfoBlock && (!rules || rules.length === 0)) return '';

    let label, tooltip = '';
    if (isGroup && sec.section_group_label) {
        label = sec.section_group_label;
        const memberLabels = groupKeys.map(k => {
            const t = _qtKAllTypes.find(x => x.key === k);
            return t ? `${t.icon} ${t.label}` : k;
        }).join(', ');
        tooltip = `title=\"Gồm: ${memberLabels}\"`;
    } else {
        const tp = _qtKAllTypes.find(x => x.key === sec.key);
        label = tp ? tp.label : sec.label;
    }
    const sectionId = `qtRule_${sec.key}`;
    const editKey = isGroup ? sec.section_group : sec.key;

    let html = `
        <div class="qt-flow-section" id="${sectionId}">
            <div class="qt-flow-header" onclick="_qtKToggleSection(this)">
                <div class="qt-flow-title">
                    <span class="qt-loai-badge" style="background:#3b82f6;cursor:${_qtKIsGD ? 'pointer' : 'default'};" ${_qtKIsGD ? `onclick="event.stopPropagation();_qtKEditSectionOrder('${sec.key}',${sec.section_order})" title="Click để đổi STT"` : ''}>Loại ${sec.section_order}</span>
                    <span ${tooltip}>Khi ấn: ${label}</span>
                    ${isGroup ? `<span style="font-size:10px;background:#8b5cf6;color:white;padding:1px 6px;border-radius:8px;">🔗 ${groupKeys.length} nút</span>
                        <span class="qt-group-members" style="display:inline-flex;gap:3px;flex-wrap:wrap;margin-left:4px;">${groupKeys.map(k => { const mt = _qtKAllTypes.find(x => x.key === k); return mt ? `<span style="font-size:9px;padding:1px 5px;border-radius:6px;background:${mt.color}20;color:${mt.color};font-weight:700;border:1px solid ${mt.color}30;white-space:nowrap;">${mt.icon} ${mt.label}</span>` : ''; }).join('')}</span>` : ''}
                    <span class="qt-flow-count">${rules.length} nút</span>
                    ${_qtKIsGD ? `<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:${sec.max_appointment_days > 0 ? '#f59e0b20' : '#64748b20'};color:${sec.max_appointment_days > 0 ? '#f59e0b' : '#94a3b8'};cursor:pointer;border:1px solid ${sec.max_appointment_days > 0 ? '#f59e0b40' : '#64748b30'};margin-left:4px;" onclick="event.stopPropagation();_qtKEditMaxDays('${sec.key}',${sec.max_appointment_days || 0})" title="Giới hạn ngày hẹn tối đa">📅 ${sec.max_appointment_days > 0 ? sec.max_appointment_days + ' ngày' : 'Không giới hạn'}</span>` : (sec.max_appointment_days > 0 ? `<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:#f59e0b20;color:#f59e0b;">📅 ${sec.max_appointment_days} ngày</span>` : '')}
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    ${_qtKIsGD ? `<button class="qt-flow-edit-btn" onclick="event.stopPropagation();_qtKShowEditRulesModal('${sec.key}')">✏️ Sửa</button><button class="qt-flow-edit-btn" style="background:#ef4444;padding:4px 8px;min-width:0;" onclick="event.stopPropagation();_qtKDeleteSection('${sec.key}')" title="Xóa loại">🗑️</button>` : ''}
                    <span class="qt-flow-chevron">▼</span>
                </div>
            </div>
            <div class="qt-flow-body">
                ${isWaitingStatus ? `
                <div style="padding:16px 20px;">
                    <div style="background:linear-gradient(135deg,#fef3c7,#fffbeb);border:1px solid #f59e0b40;border-radius:12px;padding:16px 20px;display:flex;flex-direction:column;gap:10px;">
                        <div style="font-size:14px;font-weight:700;color:#92400e;">⏳ NV chỉ chờ Sếp duyệt — không có nút tư vấn</div>
                        <div style="font-size:12px;color:#78350f;line-height:1.6;">
                            <div>✅ <b>Sếp duyệt</b> → Chuyển sang <b>Hủy Khách (Đã Duyệt)</b></div>
                            <div>❌ <b>Sếp từ chối</b> → Chuyển sang <b>Tư Vấn Lại</b></div>
                            <div>⏰ <b>Quá 24h không xử lý</b> → Tự động chuyển <b>Tư Vấn Lại</b></div>
                        </div>
                    </div>
                </div>
                ` : isEmergencyPending ? `
                <div style="padding:16px 20px;">
                    <div style="background:linear-gradient(135deg,#fef2f2,#fff1f2);border:1px solid #ef444440;border-radius:12px;padding:16px 20px;display:flex;flex-direction:column;gap:10px;">
                        <div style="font-size:14px;font-weight:700;color:#991b1b;">🚨 Khách đang có Cấp Cứu Sếp — NV bị LOCK</div>
                        <div style="font-size:12px;color:#7f1d1d;line-height:1.8;">
                            <div>🔒 NV <b>chỉ thấy nút "Cấp Cứu Sếp"</b> để nhắc lại (không tư vấn khác được)</div>
                            <div>⏰ Sếp phải xử lý trước <b>12h trưa ngày làm việc kế tiếp</b> (skip CN / Lễ / Nghỉ phép Sếp)</div>
                            <div>💰 Nếu quá hạn: <b>Phạt Sếp 50.000đ/ngày</b> (cộng dồn mỗi ngày chưa xử lý)</div>
                            <div>🔄 Sếp có thể <b>Bàn Giao</b> cho Sếp khác (timeout 30 phút)</div>
                        </div>
                    </div>
                </div>
                <div class="qt-flow-label">Hiện các nút:</div>
                <div class="qt-flow-targets">
                ` : isEmergencyDone ? `
                <div style="padding:16px 20px;">
                    <div style="background:linear-gradient(135deg,#dcfce7,#f0fdf4);border:1px solid #22c55e40;border-radius:12px;padding:16px 20px;display:flex;flex-direction:column;gap:10px;">
                        <div style="font-size:14px;font-weight:700;color:#166534;">✅ Sếp đã xử lý Cấp Cứu — NV tiếp tục tư vấn</div>
                        <div style="font-size:12px;color:#14532d;line-height:1.8;">
                            <div>📝 Sếp đã ghi <b>tư vấn chiến lược</b> + hình ảnh (nếu có)</div>
                            <div>📅 Hệ thống tự <b>hẹn ngày làm việc kế tiếp</b> cho khách</div>
                            <div>👇 NV chọn nút bên dưới để <b>tiếp tục tư vấn khách</b></div>
                        </div>
                    </div>
                </div>
                <div class="qt-flow-label">Hiện các nút:</div>
                <div class="qt-flow-targets">
                ` : `<div class="qt-flow-label">Hiện các nút:</div>
                <div class="qt-flow-targets">`}
    `;

    if (!isWaitingStatus) {
        const rulesList = rules || [];
        for (const r of rulesList) {
            const rtp = _qtKAllTypes.find(x => x.key === r.to_type_key);
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
    }
    html += isWaitingStatus ? '</div></div>' : '</div></div></div>';
    return html;
}

// Edit max appointment days for a section
async function _qtKEditMaxDays(key, currentVal) {
    const val = prompt(`📅 Giới hạn ngày hẹn tối đa cho loại này?\n\n0 = Không giới hạn\nVD: 15 = Chỉ cho hẹn tối đa 15 ngày`, currentVal || 0);
    if (val === null) return;
    const days = parseInt(val) || 0;
    if (days < 0) return showToast('Số ngày không hợp lệ', 'error');
    try {
        await apiCall(`/api/consult-types/${key}/max-appointment-days`, 'PATCH', { max_appointment_days: days });
        showToast(`✅ Đã cập nhật giới hạn: ${days > 0 ? days + ' ngày' : 'Không giới hạn'}`);
        _qtKLoadData();
    } catch(e) { showToast('Lỗi: ' + (e.message || ''), 'error'); }
}

// Get all keys in a section group
function _qtKGetGroupKeys(groupId) {
    if (!groupId) return [];
    const keys = [];
    // Leader (section_order > 0)
    const leader = _qtKSections.find(s => s.section_group === groupId);
    if (leader) keys.push(leader.key);
    // Members (section_order = 0)
    for (const m of _qtKGroupMembers) {
        if (m.section_group === groupId && !keys.includes(m.key)) keys.push(m.key);
    }
    return keys;
}

// ========== PHASE MANAGEMENT ==========
function _qtKShowAddPhaseModal() {
    const presetsHTML = KOC_STAGE_PRESETS.map((p, i) => `
        <label style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:8px;cursor:pointer;border:2px solid transparent;transition:all .2s;" class="qt-preset-opt" onclick="document.querySelectorAll('.qt-preset-opt').forEach(x=>x.style.borderColor='transparent');this.style.borderColor='#2563eb';document.getElementById('qtPhasePresetIdx').value=${i}">
            <div style="width:50px;height:24px;border-radius:4px;background:${p.gradient};flex-shrink:0;"></div>
            <span style="font-size:11px;font-weight:600;color:#334155;">${p.name}</span>
        </label>
    `).join('');

    const nextOrder = _qtKRulePhases.length > 0 ? Math.max(..._qtKRulePhases.map(p => p.sort_order)) + 1 : 1;

    const overlay = document.createElement('div');
    overlay.className = 'qt-modal-overlay';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
        <div class="qt-modal">
            <h3>📂 Thêm Phần mới</h3>
            <input type="hidden" id="qtPhasePresetIdx" value="0">
            <div class="qt-row">
                <div>
                    <label>Tên phần</label>
                    <input type="text" id="qtPhaseTitle" placeholder="VD: RE-MARKETING">
                </div>
                <div style="flex:0 0 80px;">
                    <label>Icon</label>
                    <input type="text" id="qtPhaseIcon" value="🎯" style="text-align:center;font-size:20px;">
                </div>
            </div>
            <div style="margin-top:8px;">
                <label>Chọn màu nền</label>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px;max-height:180px;overflow-y:auto;">
                    ${presetsHTML}
                </div>
            </div>
            <div style="margin-top:8px;">
                <label>Gom các loại vào phần này:</label>
                <div id="qtPhaseSectionsList" style="max-height:200px;overflow-y:auto;margin-top:4px;">
                    ${_qtKSections.filter(s => !s.rule_phase).map(s => `
                        <div class="qt-rule-item" data-key="${s.key}" style="cursor:pointer;" onclick="this.querySelector('input[type=checkbox]').click()">
                            <input type="checkbox" class="qt-ri-check" onclick="event.stopPropagation()">
                            <div class="qt-ri-info">
                                <span class="qt-ri-icon">${s.icon}</span>
                                <span class="qt-ri-label">Loại ${s.section_order}: ${s.label}</span>
                            </div>
                        </div>
                    `).join('') || '<div style="padding:8px;color:#94a3b8;font-size:12px;">Tất cả loại đã thuộc phần khác</div>'}
                </div>
            </div>
            <div class="qt-actions">
                <button class="qt-btn qt-btn-secondary" onclick="this.closest('.qt-modal-overlay').remove()">Hủy</button>
                <button class="qt-btn qt-btn-primary" onclick="_qtKAddPhase()">📂 Thêm Phần</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => { const f = overlay.querySelector('.qt-preset-opt'); if (f) f.style.borderColor = '#2563eb'; }, 50);
}

async function _qtKAddPhase() {
    const title = document.getElementById('qtPhaseTitle').value.trim();
    const icon = document.getElementById('qtPhaseIcon').value.trim();
    if (!title) return showToast('❌ Vui lòng nhập tên phần!', 'error');

    const presetIdx = parseInt(document.getElementById('qtPhasePresetIdx').value) || 0;
    const preset = KOC_STAGE_PRESETS[presetIdx];
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || ('phase_' + Date.now());
    const nextOrder = _qtKRulePhases.length > 0 ? Math.max(..._qtKRulePhases.map(p => p.sort_order)) + 1 : 1;

    _qtKRulePhases.push({
        id, title, icon: icon || '📋',
        color: preset.textColor, gradient: preset.gradient,
        sort_order: nextOrder
    });
    await apiCall('/api/consult-rule-phases', 'PUT', { phases: _qtKRulePhases });

    // Assign selected sections to this phase
    const items = document.querySelectorAll('#qtPhaseSectionsList .qt-rule-item');
    const updates = [];
    items.forEach(item => {
        if (item.querySelector('.qt-ri-check').checked) updates.push({ key: item.dataset.key, rule_phase: id });
    });
    if (updates.length > 0) await apiCall('/api/consult-types/batch/rule-phase', 'PATCH', { updates });

    document.querySelector('.qt-modal-overlay')?.remove();
    showToast('✅ Đã thêm phần!', 'success');
    await _qtKLoadData();
    _qtKSwitchTab('rules');
}

function _qtKEditPhase(phaseId) {
    const phase = _qtKRulePhases.find(p => p.id === phaseId);
    if (!phase) return;

    // Sections in this phase + available sections (no phase or different phase)
    const allSectioned = _qtKSections;
    let sectionsHTML = allSectioned.map(s => {
        const inThis = s.rule_phase === phaseId;
        return `
            <div class="qt-rule-item" data-key="${s.key}" style="cursor:pointer;" onclick="this.querySelector('input[type=checkbox]').click()">
                <input type="checkbox" class="qt-ri-check" ${inThis ? 'checked' : ''} onclick="event.stopPropagation()">
                <div class="qt-ri-info">
                    <span class="qt-ri-icon">${s.icon}</span>
                    <span class="qt-ri-label">Loại ${s.section_order}: ${s.label}</span>
                </div>
            </div>
        `;
    }).join('');

    const overlay = document.createElement('div');
    overlay.className = 'qt-modal-overlay';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
        <div class="qt-modal">
            <h3>✏️ Sửa Phần: ${phase.icon} ${phase.title}</h3>
            <div class="qt-row">
                <div>
                    <label>Tên phần</label>
                    <input type="text" id="qtEditPhaseTitle" value="${phase.title}">
                </div>
                <div style="flex:0 0 80px;">
                    <label>Icon</label>
                    <input type="text" id="qtEditPhaseIcon" value="${phase.icon}" style="text-align:center;font-size:20px;">
                </div>
            </div>
            <div style="margin-top:10px;">
                <label>Gom các loại vào phần này:</label>
                <div id="qtEditPhaseSectionsList" style="max-height:250px;overflow-y:auto;margin-top:4px;">
                    ${sectionsHTML}
                </div>
            </div>
            <div class="qt-actions">
                <button class="qt-btn qt-btn-secondary" onclick="this.closest('.qt-modal-overlay').remove()">Hủy</button>
                <button class="qt-btn qt-btn-primary" onclick="_qtKSavePhase('${phaseId}')">💾 Lưu</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function _qtKSavePhase(phaseId) {
    const phase = _qtKRulePhases.find(p => p.id === phaseId);
    if (!phase) return;

    phase.title = document.getElementById('qtEditPhaseTitle').value.trim() || phase.title;
    phase.icon = document.getElementById('qtEditPhaseIcon').value.trim() || phase.icon;
    await apiCall('/api/consult-rule-phases', 'PUT', { phases: _qtKRulePhases });

    // Update section assignments
    const items = document.querySelectorAll('#qtEditPhaseSectionsList .qt-rule-item');
    const updates = [];
    items.forEach(item => {
        const checked = item.querySelector('.qt-ri-check').checked;
        const key = item.dataset.key;
        const sec = _qtKSections.find(s => s.key === key);
        if (checked && (!sec || sec.rule_phase !== phaseId)) {
            updates.push({ key, rule_phase: phaseId });
        } else if (!checked && sec && sec.rule_phase === phaseId) {
            updates.push({ key, rule_phase: null });
        }
    });
    if (updates.length > 0) await apiCall('/api/consult-types/batch/rule-phase', 'PATCH', { updates });

    document.querySelector('.qt-modal-overlay')?.remove();
    showToast('✅ Đã lưu phần!', 'success');
    await _qtKLoadData();
    _qtKSwitchTab('rules');
}

async function _qtKDeletePhase(phaseId) {
    const phase = _qtKRulePhases.find(p => p.id === phaseId);
    if (!phase) return;
    const count = _qtKSections.filter(s => s.rule_phase === phaseId).length;
    if (!confirm(`🗑️ Xóa phần "${phase.icon} ${phase.title}"?\n${count > 0 ? `⚠️ ${count} loại sẽ chuyển về "Chưa phân phần"` : ''}`)) return;

    // Clear rule_phase for sections in this phase
    const updates = _qtKSections.filter(s => s.rule_phase === phaseId).map(s => ({ key: s.key, rule_phase: null }));
    if (updates.length > 0) await apiCall('/api/consult-types/batch/rule-phase', 'PATCH', { updates });

    _qtKRulePhases = _qtKRulePhases.filter(p => p.id !== phaseId);
    await apiCall('/api/consult-rule-phases', 'PUT', { phases: _qtKRulePhases });

    showToast('✅ Đã xóa phần!', 'success');
    await _qtKLoadData();
    _qtKSwitchTab('rules');
}

// ========== ADD SECTION (Thêm loại khi ấn) ==========
function _qtKShowAddSectionModal() {
    if (_qtKUnsectioned.length === 0) return showToast('✅ Tất cả nút đã có loại!', 'success');
    const nextOrder = _qtKSections.length > 0 ? Math.max(..._qtKSections.map(s => s.section_order)) + 1 : 1;

    let listHTML = _qtKUnsectioned.map(t => `
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
                <button class="qt-btn qt-btn-primary" onclick="_qtKAddSections()">📌 Thêm loại</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function _qtKAddSections() {
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
            rules: [{ to_type_key: key, is_default: true, delay_days: 0, sort_order: 1 }], crm_menu: 'koc_tiktok'
        });
        // Set section order
        await apiCall(`/api/consult-types/${key}/section-order`, 'PATCH', { section_order: startOrder });
        startOrder++;
    }

    document.querySelector('.qt-modal-overlay')?.remove();
    showToast(`✅ Đã thêm ${selected.length} loại!`, 'success');
    await apiCall('/api/consult-sections/reindex', 'POST');
    await _qtKLoadData();
    _qtKSwitchTab('rules');
}

// ========== EDIT SECTION ORDER (click badge) ==========
function _qtKEditSectionOrder(key, currentOrder) {
    const tp = _qtKAllTypes.find(x => x.key === key);
    const label = tp ? `${tp.icon} ${tp.label}` : key;
    const sec = _qtKSections.find(s => s.key === key);
    const currentPhase = sec ? sec.rule_phase : '';

    const phaseOptions = _qtKRulePhases.map(p =>
        `<option value="${p.id}" ${p.id === currentPhase ? 'selected' : ''}>${p.icon} PHẦN ${p.sort_order}: ${p.title}</option>`
    ).join('');

    const overlay = document.createElement('div');
    overlay.className = 'qt-modal-overlay';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
        <div class="qt-modal">
            <h3>🔢 Chỉnh Loại: ${label}</h3>
            <div style="margin-bottom:12px;">
                <label style="font-size:13px;font-weight:600;color:#334155;">Số Loại (STT)</label>
                <input type="number" id="qtEditLoaiNum" value="${currentOrder}" min="1" style="width:100%;padding:10px;font-size:18px;font-weight:700;border:2px solid #3b82f6;border-radius:10px;text-align:center;margin-top:4px;">
            </div>
            <div style="margin-bottom:12px;">
                <label style="font-size:13px;font-weight:600;color:#334155;">Thuộc Phần</label>
                <select id="qtEditLoaiPhase" style="margin-top:4px;">
                    <option value="">(Chưa phân phần)</option>
                    ${phaseOptions}
                </select>
            </div>
            <div class="qt-actions">
                <button class="qt-btn qt-btn-secondary" onclick="this.closest('.qt-modal-overlay').remove()">Hủy</button>
                <button class="qt-btn qt-btn-primary" onclick="_qtKSaveSectionEdit('${key}',${currentOrder})">💾 Lưu</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function _qtKSaveSectionEdit(key, oldOrder) {
    const newOrder = parseInt(document.getElementById('qtEditLoaiNum').value);
    const newPhase = document.getElementById('qtEditLoaiPhase').value;
    if (!newOrder || newOrder < 1) return showToast('❌ Số loại không hợp lệ!', 'error');

    const promises = [];
    if (newOrder !== oldOrder) {
        promises.push(apiCall(`/api/consult-types/${key}/section-order`, 'PATCH', { section_order: newOrder }));
    }
    const sec = _qtKSections.find(s => s.key === key);
    if (!sec || sec.rule_phase !== (newPhase || null)) {
        promises.push(apiCall(`/api/consult-types/${key}/rule-phase`, 'PATCH', { rule_phase: newPhase || null }));
    }
    if (promises.length > 0) await Promise.all(promises);

    document.querySelector('.qt-modal-overlay')?.remove();
    showToast('✅ Đã cập nhật!', 'success');
    await apiCall('/api/consult-sections/reindex', 'POST');
    await _qtKLoadData();
    _qtKSwitchTab('rules');
}

async function _qtKDeleteSection(key) {
    const sec = _qtKSections.find(s => s.key === key);
    const isGroup = sec && sec.section_group;
    const groupKeys = isGroup ? _qtKGetGroupKeys(sec.section_group) : [key];
    const tp = _qtKAllTypes.find(x => x.key === key);
    const displayLabel = (isGroup && sec.section_group_label) ? sec.section_group_label : (tp ? `${tp.icon} ${tp.label}` : key);
    const ruleCount = (_qtKAllRules[key] || []).length;

    if (!confirm(`🗑️ Xóa loại "${displayLabel}"?${isGroup ? `\n🔗 Gồm ${groupKeys.length} nút trong nhóm` : ''}\n\n❌ Xóa toàn bộ ${ruleCount} flow rules\n❌ Xóa khỏi phần hiện tại\n✅ Data tư vấn cũ giữ nguyên\n\n⚠️ Không thể hoàn tác!`)) return;

    try {
        console.log('[_qtKDeleteSection] Deleting key:', key, 'groupKeys:', groupKeys);
        for (const k of groupKeys) {
            console.log('[_qtKDeleteSection] Processing key:', k);
            const r1 = await apiCall(`/api/consult-flow-rules/${k}`, 'DELETE');
            console.log('[_qtKDeleteSection] DELETE flow-rules:', k, r1);
            const r2 = await apiCall(`/api/consult-types/${k}/section-order`, 'PATCH', { section_order: 0 });
            console.log('[_qtKDeleteSection] PATCH section-order:', k, r2);
            const r3 = await apiCall(`/api/consult-types/${k}/rule-phase`, 'PATCH', { rule_phase: null });
            console.log('[_qtKDeleteSection] PATCH rule-phase:', k, r3);
            // Clear group fields
            const r4 = await apiCall(`/api/consult-types/${k}`, 'PATCH', { section_group: null, section_group_label: null });
            console.log('[_qtKDeleteSection] PATCH group fields:', k, r4);
        }

        showToast('✅ Đã xóa loại hoàn toàn!', 'success');
        await apiCall('/api/consult-sections/reindex', 'POST');
        await _qtKLoadData();
        _qtKSwitchTab('rules');
    } catch(e) {
        console.error('[_qtKDeleteSection] ERROR:', e);
        showToast('❌ Lỗi xóa loại: ' + (e.message || ''), 'error');
    }
}

function _qtKToggleSection(header) {
    const body = header.nextElementSibling;
    const isOpen = body.classList.contains('open');
    header.classList.toggle('open', !isOpen);
    body.classList.toggle('open', !isOpen);
}

// ========== FLOWCHART (DYNAMIC from sections) ==========
function _qtKRenderFlowchart() {
    // Build journey nodes dynamically from _qtKSections (sorted by section_order)
    // Group by phase for separate rows
    const phaseMap = new Map(); // phaseId => { phase, sections[] }

    for (const phase of _qtKRulePhases) {
        phaseMap.set(phase.id, { phase, sections: [] });
    }
    // Add unphased bucket
    phaseMap.set('__none__', { phase: null, sections: [] });

    for (const sec of _qtKSections) {
        const phaseId = sec.rule_phase && phaseMap.has(sec.rule_phase) ? sec.rule_phase : '__none__';
        phaseMap.get(phaseId).sections.push(sec);
    }

    // Build rows: each phase = a row, first phase = main, rest = branches
    let rows = [];
    for (const [phaseId, data] of phaseMap) {
        if (data.sections.length === 0) continue;
        rows.push(data);
    }

    if (rows.length === 0) return '';

    // Render helper for a row of nodes
    function renderNodeRow(sections) {
        let nodesHtml = '';
        for (let i = 0; i < sections.length; i++) {
            const sec = sections[i];
            const t = _qtKAllTypes.find(x => x.key === sec.key);
            const icon = t ? t.icon : '📋';
            const color = t ? t.color : '#6b7280';
            const label = t ? t.label : sec.label || sec.key;
            // For grouped sections, use the group label (e.g. "Tư Vấn Khách" instead of "Gọi Điện")
            const isGroup = !!sec.section_group;
            const groupKeys = isGroup ? _qtKGetGroupKeys(sec.section_group) : [];
            const multiCount = isGroup ? groupKeys.length : 0;
            const displayName = (isGroup && sec.section_group_label) ? sec.section_group_label : label;

            nodesHtml += `
                <div class="qt-fc-node" onclick="_qtKScrollToRule('${sec.key}')" title="${displayName}${isGroup ? ' (nhóm ' + multiCount + ' nút: ' + groupKeys.map(k => { const gt = _qtKAllTypes.find(x => x.key === k); return gt ? gt.label : k; }).join(', ') + ')' : ''}">
                    <div class="qt-fc-circle" style="border-color:${color}40;background:${color}15;">${icon}</div>
                    <div class="qt-fc-name">${displayName}${multiCount > 1 ? ' ×' + multiCount : ''}</div>
                </div>
            `;
            if (i < sections.length - 1) nodesHtml += '<div class="qt-fc-connector"></div>';
        }
        return nodesHtml;
    }

    // Main row = first phase row
    const mainRow = rows[0];
    const mainNodesHtml = renderNodeRow(mainRow.sections);

    // Branch rows = remaining phases
    let branchesHtml = '';
    for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const branchLabel = row.phase ? `↓ ${row.phase.icon || ''} ${row.phase.title}` : '↓ Khác';
        branchesHtml += `
            <div class="qt-fc-branch">
                <div class="qt-fc-branch-label">${branchLabel}</div>
                <div class="qt-fc-row">${renderNodeRow(row.sections)}</div>
            </div>
        `;
    }

    const mainTitle = mainRow.phase ? `${mainRow.phase.icon || '—'} ${mainRow.phase.title} — Customer Journey` : '— Luồng Tư Vấn Khách Hàng — Customer Journey';

    return `
        <div class="qt-flowchart">
            <div class="qt-flowchart-title">${mainTitle}</div>
            <div class="qt-fc-row">${mainNodesHtml}</div>
            ${branchesHtml}
        </div>
    `;
}

function _qtKScrollToRule(key) {
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
function _qtKShowEditRulesModal(fromStatus) {
    const rules = _qtKAllRules[fromStatus] || [];
    const statusLabel = KOC_FLOW_STATUS_LABELS[fromStatus] || _qtKGetTypeLabel(fromStatus) || fromStatus;

    // ★ Show ALL active types as eligible targets
    const eligibleTypes = _qtKAllTypes.filter(t => {
        return t.is_active || rules.some(r => r.to_type_key === t.key);
    });

    // ★ Sort: checked items first (by sort_order), then unchecked (by label)
    const sorted = eligibleTypes.slice().sort((a, b) => {
        const aRule = rules.find(r => r.to_type_key === a.key);
        const bRule = rules.find(r => r.to_type_key === b.key);
        const aChecked = !!aRule;
        const bChecked = !!bRule;
        if (aChecked && !bChecked) return -1;
        if (!aChecked && bChecked) return 1;
        if (aChecked && bChecked) return (aRule.sort_order || 0) - (bRule.sort_order || 0);
        return (a.label || '').localeCompare(b.label || '', 'vi');
    });

    // Build set of unsectioned keys for quick lookup
    const unsectionedKeys = new Set(_qtKUnsectioned.map(u => u.key));

    let listHTML = '';
    let sttCount = 0;
    for (const t of sorted) {
        const existing = rules.find(r => r.to_type_key === t.key);
        const checked = !!existing;
        const delay = existing ? (existing.delay_days || 0) : 0;
        const isDef = existing ? existing.is_default : false;
        const isUnsectioned = unsectionedKeys.has(t.key);
        if (checked) sttCount++;

        if (isUnsectioned) {
            listHTML += `
                <div class="qt-rule-item qt-ri-inactive" data-key="${t.key}" data-checked="0"
                    style="opacity:0.45;cursor:not-allowed;position:relative;"
                    onclick="showToast('⚠️ Hãy tạo loại cho nút «${t.label}» trước tại ➕ Thêm nhóm quy tắc mới!', 'error')"
                    title="Nút này chưa có loại — không thể chọn làm quy tắc sau">
                    <span class="qt-ri-stt" style="min-width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0;background:#e2e8f0;color:#94a3b8;">🔒</span>
                    <span class="qt-ri-drag" style="opacity:0.3;pointer-events:none;">⠿</span>
                    <input type="checkbox" class="qt-ri-check" disabled style="pointer-events:none;">
                    <div class="qt-ri-info">
                        <span class="qt-ri-icon">${t.icon}</span>
                        <span class="qt-ri-label" style="text-decoration:line-through;color:#94a3b8;">${t.label}</span>
                        <span style="font-size:9px;color:#ef4444;font-weight:600;margin-left:4px;">Chưa có loại</span>
                    </div>
                </div>
            `;
        } else {
            listHTML += `
                <div class="qt-rule-item ${checked ? 'qt-ri-active' : 'qt-ri-inactive'}" data-key="${t.key}" data-checked="${checked ? '1' : '0'}">
                    <span class="qt-ri-stt" style="min-width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0;${checked ? 'background:#3b82f6;color:white;' : 'background:#e2e8f0;color:#94a3b8;'}">${checked ? sttCount : '-'}</span>
                    <span class="qt-ri-drag" style="${checked ? '' : 'opacity:0.3;pointer-events:none;'}">${'⠿'}</span>
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
                <button class="qt-btn qt-btn-primary" onclick="_qtKSaveRules('${fromStatus}')">💾 Lưu quy tắc</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const ruleList = document.getElementById('qtRuleList');

    // ★ Checkbox change → re-sort (checked to top) + update STT
    ruleList.addEventListener('change', e => {
        if (e.target.classList.contains('qt-ri-check')) {
            _qtKResortRuleList();
        }
    });

    // ★ Init SortableJS with STT update on drag end
    if (typeof Sortable !== 'undefined') {
        new Sortable(ruleList, {
            animation: 200,
            handle: '.qt-ri-drag',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            onEnd: () => _qtKUpdateRuleSTT()
        });
    }
}

// Re-sort rule list: checked items to top, unchecked to bottom, then update STT
function _qtKResortRuleList() {
    const list = document.getElementById('qtRuleList');
    if (!list) return;
    const items = Array.from(list.querySelectorAll('.qt-rule-item'));
    const checked = items.filter(el => el.querySelector('.qt-ri-check').checked);
    const unchecked = items.filter(el => !el.querySelector('.qt-ri-check').checked);

    // Re-append in order: checked first, then unchecked
    checked.forEach(el => list.appendChild(el));
    unchecked.forEach(el => list.appendChild(el));

    _qtKUpdateRuleSTT();
}

// Update STT badges + visual styling for all items in the rule list
function _qtKUpdateRuleSTT() {
    const list = document.getElementById('qtRuleList');
    if (!list) return;
    let stt = 0;
    list.querySelectorAll('.qt-rule-item').forEach(el => {
        const cb = el.querySelector('.qt-ri-check');
        const sttBadge = el.querySelector('.qt-ri-stt');
        const drag = el.querySelector('.qt-ri-drag');
        const isChecked = cb.checked;
        if (isChecked) {
            stt++;
            sttBadge.textContent = stt;
            sttBadge.style.background = '#3b82f6';
            sttBadge.style.color = 'white';
            drag.style.opacity = '';
            drag.style.pointerEvents = '';
            el.classList.add('qt-ri-active');
            el.classList.remove('qt-ri-inactive');
        } else {
            sttBadge.textContent = '-';
            sttBadge.style.background = '#e2e8f0';
            sttBadge.style.color = '#94a3b8';
            drag.style.opacity = '0.3';
            drag.style.pointerEvents = 'none';
            el.classList.remove('qt-ri-active');
            el.classList.add('qt-ri-inactive');
        }
    });
}

async function _qtKSaveRules(fromStatus) {
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

    // If this is a group leader, update ALL members' rules
    const sec = _qtKSections.find(s => s.key === fromStatus);
    const groupKeys = (sec && sec.section_group) ? _qtKGetGroupKeys(sec.section_group) : [fromStatus];
    for (const key of groupKeys) {
        await apiCall(`/api/consult-flow-rules/${key}`, 'PUT', { rules, crm_menu: 'koc_tiktok' });
    }

    document.querySelector('.qt-modal-overlay')?.remove();
    showToast('✅ Đã lưu quy tắc!', 'success');
    await _qtKLoadData();
    _qtKSwitchTab('rules');
}

function _qtKShowAddRuleGroupModal() {
    // Show unsectioned types (exclude system keys that already have dedicated workflows)
    const SYSTEM_KEYS = ['cap_cuu_sep', 'huy'];
    const sectionKeys = new Set(_qtKSections.map(s => s.key));
    const available = _qtKAllTypes.filter(t => !sectionKeys.has(t.key) && t.is_active && !t.section_group && !SYSTEM_KEYS.includes(t.key));

    if (available.length === 0) {
        return showToast('✅ Tất cả nút đã có nhóm quy tắc!', 'success');
    }

    const nextOrder = _qtKSections.length > 0 ? Math.max(..._qtKSections.map(s => s.section_order)) + 1 : 1;

    let listHTML = available.map(t => `
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
            <h3>➕ Thêm nhóm quy tắc mới</h3>
            <p style="font-size:12px;color:#64748b;margin-bottom:12px;">Chọn 1 nút → tạo loại riêng. Chọn 2+ nút → gom thành 1 loại chung.</p>
            <div class="qt-rule-list" id="qtAddRuleList" style="max-height:300px;overflow-y:auto;">${listHTML}</div>
            <div id="qtGroupNameRow" style="margin-top:12px;display:none;padding:10px;background:#f0f9ff;border:2px solid #3b82f6;border-radius:10px;">
                <label style="font-size:13px;font-weight:600;color:#1e40af;">🔗 Tên loại nhóm:</label>
                <input type="text" id="qtGroupName" placeholder="VD: Tư Vấn Trực Tiếp" style="width:100%;padding:8px 12px;font-size:14px;font-weight:600;border:1px solid #93c5fd;border-radius:8px;margin-top:4px;">
            </div>
            <div style="margin-top:12px;">
                <label style="font-size:13px;font-weight:600;color:#334155;">Thuộc Phần:</label>
                <select id="qtNewRulePhase" style="margin-top:4px;">
                    <option value="">(Chưa phân phần)</option>
                    ${_qtKRulePhases.map(p => `<option value="${p.id}">${p.icon} PHẦN ${p.sort_order}: ${p.title}</option>`).join('')}
                </select>
            </div>
            <div style="margin-top:8px;">
                <label style="font-size:13px;font-weight:600;color:#334155;">Bắt đầu từ Loại số:</label>
                <input type="number" id="qtNewRuleOrder" value="${nextOrder}" min="1" style="width:80px;padding:6px 10px;font-size:14px;font-weight:700;border:2px solid #3b82f6;border-radius:8px;text-align:center;margin-left:8px;">
            </div>
            <div class="qt-actions">
                <button class="qt-btn qt-btn-secondary" onclick="this.closest('.qt-modal-overlay').remove()">Hủy</button>
                <button class="qt-btn qt-btn-primary" onclick="_qtKAddRuleGroup()">➕ Thêm</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Show/hide group name input based on checkbox count
    overlay.querySelectorAll('.qt-ri-check').forEach(cb => {
        cb.addEventListener('change', () => {
            const checked = overlay.querySelectorAll('.qt-ri-check:checked').length;
            document.getElementById('qtGroupNameRow').style.display = checked >= 2 ? 'block' : 'none';
        });
    });
}

async function _qtKAddRuleGroup() {
    const items = document.querySelectorAll('#qtAddRuleList .qt-rule-item');
    const selected = [];
    items.forEach(item => {
        if (item.querySelector('.qt-ri-check').checked) selected.push(item.dataset.key);
    });
    if (selected.length === 0) return showToast('❌ Chọn ít nhất 1 nút!', 'error');

    const isGroup = selected.length >= 2;
    const groupName = isGroup ? (document.getElementById('qtGroupName').value || '').trim() : '';
    if (isGroup && !groupName) return showToast('❌ Nhập tên loại nhóm!', 'error');

    let startOrder = parseInt(document.getElementById('qtNewRuleOrder').value) || 1;
    const selectedPhase = document.getElementById('qtNewRulePhase').value || null;
    const groupId = isGroup ? `grp_${Date.now()}` : null;

    if (isGroup) {
        // GROUP MODE: first button = leader (has section_order), rest = members (section_order=0)
        const leaderKey = selected[0];

        // Create empty flow rules for ALL members (will be configured via Sửa)
        for (const key of selected) {
            await apiCall(`/api/consult-flow-rules/${key}`, 'PUT', {
                rules: [{ to_type_key: key, is_default: key === leaderKey, delay_days: 0, sort_order: selected.indexOf(key) + 1 }], crm_menu: 'koc_tiktok'
            });
            // Set group for all
            await apiCall(`/api/consult-types/${key}`, 'PATCH', {
                section_group: groupId,
                section_group_label: key === leaderKey ? groupName : null
            });
        }

        // Only leader gets section_order
        await apiCall(`/api/consult-types/${leaderKey}/section-order`, 'PATCH', { section_order: startOrder });
        if (selectedPhase) await apiCall(`/api/consult-types/${leaderKey}/rule-phase`, 'PATCH', { rule_phase: selectedPhase });

    } else {
        // SINGLE MODE: same as before
        const key = selected[0];
        await apiCall(`/api/consult-flow-rules/${key}`, 'PUT', {
            rules: [{ to_type_key: key, is_default: true, delay_days: 0, sort_order: 1 }], crm_menu: 'koc_tiktok'
        });
        await apiCall(`/api/consult-types/${key}/section-order`, 'PATCH', { section_order: startOrder });
        if (selectedPhase) await apiCall(`/api/consult-types/${key}/rule-phase`, 'PATCH', { rule_phase: selectedPhase });
    }

    document.querySelector('.qt-modal-overlay')?.remove();
    showToast(`✅ Đã thêm ${isGroup ? `nhóm "${groupName}" (${selected.length} nút)` : '1 loại'}!`, 'success');
    await apiCall('/api/consult-sections/reindex', 'POST');
    await _qtKLoadData();
    _qtKSwitchTab('rules');

    // Auto-open Sửa modal for the first/leader item
    setTimeout(() => _qtKShowEditRulesModal(selected[0]), 300);
}

// ========== HELPERS ==========
function _qtKGetTypeLabel(key) {
    const t = _qtKAllTypes.find(x => x.key === key);
    return t ? `${t.icon} ${t.label}` : key;
}

async function _qtKSaveSortOrder(orders) {
    try {
        await apiCall('/api/consult-types/batch/sort-order', 'PATCH', { orders });
        showToast('✅ Đã lưu thứ tự!', 'success');
    } catch(e) {
        showToast('❌ Lỗi lưu thứ tự!', 'error');
    }
}
