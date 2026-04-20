// ========== TRANG QUáº¢N LÃ QUY Táº®C NÃšT TÆ¯ Váº¤N â€” PREMIUM UI v2 ==========

// Status labels for display
const KOCKOL_FLOW_STATUS_LABELS = {
    dang_tu_van: 'ðŸ†• KhÃ¡ch má»›i / Máº·c Ä‘á»‹nh',
    lam_quen_tuong_tac: 'ðŸ‘‹ LÃ m Quen TÆ°Æ¡ng TÃ¡c',
    gui_stk_coc: 'ðŸ¦ Gá»­i STK Cá»c',
    dat_coc: 'ðŸ’µ Äáº·t Cá»c',
    chot_don: 'âœ… Chá»‘t ÄÆ¡n',
    hoan_thanh: 'ðŸ† HoÃ n ThÃ nh ÄÆ¡n',
    sau_ban_hang: 'ðŸ“¦ ChÄƒm SÃ³c Sau BÃ¡n',
    tuong_tac_ket_noi: 'ðŸ”— TÆ°Æ¡ng TÃ¡c Káº¿t Ná»‘i Láº¡i',
    gui_ct_kh_cu: 'ðŸŽŸï¸ Gá»­i CT KH CÅ©',
    huy_coc: 'ðŸš« Há»§y Cá»c',
    giam_gia: 'ðŸŽ Giáº£m GiÃ¡',
    tu_van_lai: 'ðŸ”„ TÆ° Váº¥n Láº¡i',
    duyet_huy: 'ðŸš« Há»§y KhÃ¡ch (ÄÃ£ Duyá»‡t)',
    cho_duyet_huy: 'â³ Chá» Duyá»‡t Há»§y',
    hoan_thanh_cap_cuu: 'ðŸ¥ HoÃ n ThÃ nh Cáº¥p Cá»©u',
    pending_emergency: 'ðŸš¨ Äang cÃ³ Cáº¥p Cá»©u Sáº¿p',
    cancel_auto_revert: 'âŒ KH bá»‹ auto-revert há»§y',
};

// Preset gradient colors for stages
const KOCKOL_STAGE_PRESETS = [
    { id: 'blue', name: 'ðŸ”µ Ocean Blue', gradient: 'linear-gradient(135deg,#dbeafe,#eff6ff)', textColor: '#1e40af', countBg: '#bfdbfe', countColor: '#1e40af' },
    { id: 'gold', name: 'ðŸŸ¡ Golden Sun', gradient: 'linear-gradient(135deg,#fef3c7,#fffbeb)', textColor: '#92400e', countBg: '#fde68a', countColor: '#92400e' },
    { id: 'green', name: 'ðŸŸ¢ Forest Green', gradient: 'linear-gradient(135deg,#d1fae5,#ecfdf5)', textColor: '#065f46', countBg: '#a7f3d0', countColor: '#065f46' },
    { id: 'red', name: 'ðŸ”´ Ruby Red', gradient: 'linear-gradient(135deg,#fee2e2,#fef2f2)', textColor: '#991b1b', countBg: '#fecaca', countColor: '#991b1b' },
    { id: 'purple', name: 'ðŸŸ£ Royal Purple', gradient: 'linear-gradient(135deg,#ede9fe,#f5f3ff)', textColor: '#5b21b6', countBg: '#ddd6fe', countColor: '#5b21b6' },
    { id: 'pink', name: 'ðŸ©· Rose Pink', gradient: 'linear-gradient(135deg,#fce7f3,#fdf2f8)', textColor: '#9d174d', countBg: '#fbcfe8', countColor: '#9d174d' },
    { id: 'orange', name: 'ðŸŸ  Warm Orange', gradient: 'linear-gradient(135deg,#ffedd5,#fff7ed)', textColor: '#9a3412', countBg: '#fed7aa', countColor: '#9a3412' },
    { id: 'teal', name: 'ðŸ©µ Cyan Teal', gradient: 'linear-gradient(135deg,#ccfbf1,#f0fdfa)', textColor: '#115e59', countBg: '#99f6e4', countColor: '#115e59' },
    { id: 'slate', name: 'âš« Slate Gray', gradient: 'linear-gradient(135deg,#e2e8f0,#f8fafc)', textColor: '#334155', countBg: '#cbd5e1', countColor: '#334155' },
    { id: 'indigo', name: 'ðŸ§Š Indigo', gradient: 'linear-gradient(135deg,#e0e7ff,#eef2ff)', textColor: '#3730a3', countBg: '#c7d2fe', countColor: '#3730a3' },
];


// ========== STATE ==========
let _qtCAllTypes = [];
let _qtCAllRules = {};
let _qtCStages = [];
let _qtCSections = [];      // dynamic sections with section_order
let _qtCUnsectioned = [];   // types without a section
let _qtCGroupMembers = [];  // buttons belonging to a group (section_order=0)
let _qtCRulePhases = [];    // dynamic phase groups (PHáº¦N 1, 2, 3...)
let _qtCIsGD = false;
let _qtCActiveTab = localStorage.getItem('qt_active_tab') || 'buttons';
let _qtCSortDebounce = null;

// ========== MAIN ENTRY ==========
async function renderQuyTacTuVanKocKolPage(container) {
    _qtCIsGD = currentUser && currentUser.role === 'giam_doc';

    container.innerHTML = `
        <div class="qt-page">
            <a class="qt-back" href="/cham-soc-koc-kol" onclick="event.preventDefault();navigate('cham-soc-koc-kol')">â† Quay láº¡i ChÄƒm SÃ³c CTV</a>
            <div class="qt-header">
                <h2 class="qt-header-title">âš™ï¸ Quy Táº¯c NÃºt TÆ° Váº¥n</h2>
                <span class="qt-header-badge">
                    ${_qtCIsGD ? 'ðŸ”“ Cháº¿ Ä‘á»™ chá»‰nh sá»­a' : 'ðŸ‘ï¸ Cháº¿ Ä‘á»™ xem'}
                </span>
            </div>
            <div class="qt-tabs">
                <div class="qt-tab${_qtCActiveTab === 'buttons' ? ' active' : ''}" onclick="_qtCSwitchTab('buttons')" id="qtTabButtons">ðŸ“‹ Danh SÃ¡ch NÃºt (0)</div>
                <div class="qt-tab${_qtCActiveTab === 'rules' ? ' active' : ''}" onclick="_qtCSwitchTab('rules')" id="qtTabRules">ðŸ”„ Quy Táº¯c LiÃªn Káº¿t</div>
            </div>
            <div class="qt-panel" id="qtPanel">${_qtCRenderSkeleton()}</div>
        </div>
    `;

    await _qtCLoadData();
}

function _qtCRenderSkeleton() {
    let cards = '';
    for (let i = 0; i < 12; i++) cards += `<div class="qt-skel-card" style="animation-delay:${i*60}ms"></div>`;
    return `<div class="qt-btn-grid qt-skeleton">${cards}</div>`;
}

// ========== DATA LOADING ==========
async function _qtCLoadData() {
    const [typesData, rulesData, stagesData, sectionsData, phasesData] = await Promise.all([
        apiCall('/api/consult-types?crm_menu=koc_tiktok'),
        apiCall('/api/consult-flow-rules?crm_menu=koc_tiktok'),
        apiCall('/api/consult-stages'),
        apiCall('/api/consult-sections?crm_menu=koc_tiktok'),
        apiCall('/api/consult-rule-phases')
    ]);
    _qtCAllTypes = typesData.types || [];
    _qtCAllRules = rulesData.rules || {};
    _qtCStages = stagesData.stages || [];
    _qtCSections = sectionsData.sections || [];
    _qtCUnsectioned = (sectionsData.unsectioned || []).filter(t => !['cap_cuu_sep', 'huy'].includes(t.key));
    _qtCGroupMembers = sectionsData.groupMembers || [];
    _qtCRulePhases = phasesData.phases || [];
    _qtCRulePhases.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    // Sort stages by sort_order
    _qtCStages.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    document.getElementById('qtTabButtons').innerHTML = `ðŸ“‹ Danh SÃ¡ch NÃºt (${_qtCAllTypes.length})`;
    _qtCRenderActiveTab();
}

// ========== TAB SWITCHING ==========
function _qtCSwitchTab(tab) {
    _qtCActiveTab = tab;
    localStorage.setItem('qt_active_tab', tab);
    document.querySelectorAll('.qt-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(tab === 'buttons' ? 'qtTabButtons' : 'qtTabRules').classList.add('active');
    _qtCRenderActiveTab();
}

function _qtCRenderActiveTab() {
    if (_qtCActiveTab === 'buttons') _qtCRenderButtons();
    else _qtCRenderRules();
}

// ========== TAB 1: BUTTONS (Dynamic Stages) ==========
function _qtCRenderButtons() {
    const panel = document.getElementById('qtPanel');
    let html = '';

    // Action bar
    if (_qtCIsGD) {
        html += `<div class="qt-action-bar" style="gap:8px;">
            <button class="qt-flow-edit-btn" style="background:linear-gradient(135deg,#10b981,#059669);" onclick="_qtCShowAddStageModal()">ðŸ“ ThÃªm giai Ä‘oáº¡n</button>
            <button class="qt-flow-edit-btn" onclick="_qtCShowAddTypeModal()">âž• ThÃªm nÃºt má»›i</button>
        </div>`;
    }

    // Render each stage from dynamic config
    for (const stage of _qtCStages) {
        const stageTypes = _qtCAllTypes.filter(t => t.stage === stage.id);
        html += `
            <div class="qt-stage" data-stage-id="${stage.id}">
                <div class="qt-stage-header" style="background:${stage.gradient};">
                    <span class="qt-stage-header-icon">${stage.icon}</span>
                    <span class="qt-stage-header-text" style="color:${stage.textColor}">${stage.title}</span>
                    <span class="qt-stage-header-count" style="background:${stage.countBg};color:${stage.countColor}">${stageTypes.length} nÃºt</span>
                    ${_qtCIsGD ? `
                        <button onclick="event.stopPropagation();_qtCShowEditStageModal('${stage.id}')" style="background:none;border:none;cursor:pointer;font-size:14px;margin-left:4px;" title="Sá»­a giai Ä‘oáº¡n">âœï¸</button>
                        <button onclick="event.stopPropagation();_qtCDeleteStage('${stage.id}')" style="background:none;border:none;cursor:pointer;font-size:14px;" title="XÃ³a giai Ä‘oáº¡n">ðŸ—‘ï¸</button>
                    ` : ''}
                </div>
                <div class="qt-btn-grid" data-stage="${stage.id}">
                    ${stageTypes.map(t => _qtCRenderButtonCard(t)).join('')}
                </div>
            </div>
        `;
    }

    // Unassigned buttons (no stage)
    const unassigned = _qtCAllTypes.filter(t => !t.stage || !_qtCStages.find(s => s.id === t.stage));
    if (unassigned.length > 0) {
        html += `
            <div class="qt-stage" data-stage-id="_other">
                <div class="qt-stage-header" style="background:linear-gradient(135deg,#f1f5f9,#f8fafc);">
                    <span class="qt-stage-header-icon">ðŸ“‹</span>
                    <span class="qt-stage-header-text" style="color:#64748b">ChÆ°a phÃ¢n loáº¡i</span>
                    <span class="qt-stage-header-count" style="background:#e2e8f0;color:#64748b">${unassigned.length} nÃºt</span>
                </div>
                <div class="qt-btn-grid" data-stage="_other">
                    ${unassigned.map(t => _qtCRenderButtonCard(t)).join('')}
                </div>
            </div>
        `;
    }

    panel.innerHTML = html;

    // Event delegation for edit + delete buttons (avoids SortableJS blocking inline onclick)
    if (_qtCIsGD) {
        panel.addEventListener('click', function(e) {
            const editBtn = e.target.closest('.qt-edit-btn');
            if (editBtn) {
                e.preventDefault();
                e.stopImmediatePropagation();
                const card = editBtn.closest('.qt-btn-card');
                if (card && card.dataset.key) _qtCShowEditTypeModal(card.dataset.key);
                return;
            }
            const delBtn = e.target.closest('.qt-del-btn');
            if (delBtn) {
                e.preventDefault();
                e.stopImmediatePropagation();
                const card = delBtn.closest('.qt-btn-card');
                if (card && card.dataset.key) _qtCDeleteType(card.dataset.key);
                return;
            }
        }, true);
    }

    // Initialize drag & drop
    if (_qtCIsGD && typeof Sortable !== 'undefined') {
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
                onEnd: _qtCOnButtonSortEnd
            });
        });
    }
}

function _qtCRenderButtonCard(t) {
    return `
        <div class="qt-btn-card ${t.is_active ? '' : 'inactive'}" data-key="${t.key}" style="--card-accent:${t.color}">
            ${_qtCIsGD ? `<span class="qt-drag-hint">â ¿</span>` : ''}
            ${_qtCIsGD ? `<button class="qt-edit-btn" type="button">âœï¸</button>` : ''}
            ${_qtCIsGD ? `<button class="qt-del-btn" type="button">ðŸ—‘ï¸</button>` : ''}
            <span class="qt-icon">${t.icon}</span>
            <div class="qt-label">${t.label}</div>
            <div class="qt-color-info">
                <span class="qt-color-dot" style="background:${t.color};color:${t.color}"></span>
                <span class="qt-color-hex">${t.color}</span>
            </div>
            <div class="qt-key">${t.key}</div>
            <span class="qt-status ${t.is_active ? 'qt-status-on' : 'qt-status-off'}">
                ${t.is_active ? 'â— Äang báº­t' : 'â—‹ ÄÃ£ táº¯t'}
            </span>
        </div>
    `;
}

// Drag & drop sort handler
function _qtCOnButtonSortEnd() {
    clearTimeout(_qtCSortDebounce);
    _qtCSortDebounce = setTimeout(() => {
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
        _qtCSaveSortOrder(orders);
    }, 500);
}

// ========== STAGE MANAGEMENT ==========
function _qtCShowAddStageModal() {
    const presetsHTML = KOCKOL_STAGE_PRESETS.map((p, i) => `
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
            <h3>ðŸ“ ThÃªm giai Ä‘oáº¡n má»›i</h3>
            <input type="hidden" id="qtStagePresetIdx" value="0">
            <div class="qt-row">
                <div>
                    <label>TÃªn giai Ä‘oáº¡n</label>
                    <input type="text" id="qtStageTitle" placeholder="VD: Giai Äoáº¡n Sáº£n Xuáº¥t">
                </div>
                <div style="flex:0 0 80px;">
                    <label>Icon</label>
                    <input type="text" id="qtStageIcon" value="ðŸŽ¯" style="text-align:center;font-size:20px;">
                </div>
            </div>
            <div style="margin-top:8px;">
                <label>Chá»n mÃ u sáº¯c</label>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;max-height:240px;overflow-y:auto;">
                    ${presetsHTML}
                </div>
            </div>
            <div class="qt-actions">
                <button class="qt-btn qt-btn-secondary" onclick="this.closest('.qt-modal-overlay').remove()">Há»§y</button>
                <button class="qt-btn qt-btn-primary" onclick="_qtCAddStage()">ðŸ“ ThÃªm giai Ä‘oáº¡n</button>
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

async function _qtCAddStage() {
    const title = document.getElementById('qtStageTitle').value.trim();
    const icon = document.getElementById('qtStageIcon').value.trim();
    if (!title) return showToast('âŒ Vui lÃ²ng nháº­p tÃªn giai Ä‘oáº¡n!', 'error');

    const presetIdx = parseInt(document.getElementById('qtStagePresetIdx').value) || 0;
    const preset = KOCKOL_STAGE_PRESETS[presetIdx];
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || ('stage_' + Date.now());

    const newStage = {
        id, title, icon: icon || 'ðŸ“‹',
        gradient: preset.gradient, textColor: preset.textColor,
        countBg: preset.countBg, countColor: preset.countColor,
        sort_order: _qtCStages.length + 1
    };

    _qtCStages.push(newStage);
    await apiCall('/api/consult-stages', 'PUT', { stages: _qtCStages });
    document.querySelector('.qt-modal-overlay')?.remove();
    showToast('âœ… ÄÃ£ thÃªm giai Ä‘oáº¡n!', 'success');
    _qtCRenderButtons();
}

function _qtCShowEditStageModal(stageId) {
    const stage = _qtCStages.find(s => s.id === stageId);
    if (!stage) return;

    const presetsHTML = KOCKOL_STAGE_PRESETS.map((p, i) => {
        const isSelected = stage.gradient === p.gradient;
        return `
        <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:10px;cursor:pointer;border:2px solid ${isSelected ? '#2563eb' : 'transparent'};transition:all .2s;" class="qt-preset-opt" onclick="document.querySelectorAll('.qt-preset-opt').forEach(x=>x.style.borderColor='transparent');this.style.borderColor='#2563eb';document.getElementById('qtStagePresetIdx').value=${i}">
            <div style="width:60px;height:28px;border-radius:6px;background:${p.gradient};flex-shrink:0;"></div>
            <span style="font-size:12px;font-weight:600;color:#334155;">${p.name}</span>
        </label>
    `}).join('');

    const currentPresetIdx = KOCKOL_STAGE_PRESETS.findIndex(p => p.gradient === stage.gradient);

    const overlay = document.createElement('div');
    overlay.className = 'qt-modal-overlay';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
        <div class="qt-modal">
            <h3>âœï¸ Sá»­a giai Ä‘oáº¡n: ${stage.icon} ${stage.title}</h3>
            <input type="hidden" id="qtStagePresetIdx" value="${currentPresetIdx >= 0 ? currentPresetIdx : 0}">
            <div class="qt-row">
                <div>
                    <label>TÃªn giai Ä‘oáº¡n</label>
                    <input type="text" id="qtStageTitle" value="${stage.title}">
                </div>
                <div style="flex:0 0 80px;">
                    <label>Icon</label>
                    <input type="text" id="qtStageIcon" value="${stage.icon}" style="text-align:center;font-size:20px;">
                </div>
            </div>
            <div style="margin-top:8px;">
                <label>Chá»n mÃ u sáº¯c</label>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;max-height:240px;overflow-y:auto;">
                    ${presetsHTML}
                </div>
            </div>
            <div class="qt-actions">
                <button class="qt-btn qt-btn-secondary" onclick="this.closest('.qt-modal-overlay').remove()">Há»§y</button>
                <button class="qt-btn qt-btn-primary" onclick="_qtCSaveStage('${stageId}')">ðŸ’¾ LÆ°u</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function _qtCSaveStage(stageId) {
    const stage = _qtCStages.find(s => s.id === stageId);
    if (!stage) return;

    const presetIdx = parseInt(document.getElementById('qtStagePresetIdx').value) || 0;
    const preset = KOCKOL_STAGE_PRESETS[presetIdx];

    stage.title = document.getElementById('qtStageTitle').value.trim() || stage.title;
    stage.icon = document.getElementById('qtStageIcon').value.trim() || stage.icon;
    stage.gradient = preset.gradient;
    stage.textColor = preset.textColor;
    stage.countBg = preset.countBg;
    stage.countColor = preset.countColor;

    await apiCall('/api/consult-stages', 'PUT', { stages: _qtCStages });
    document.querySelector('.qt-modal-overlay')?.remove();
    showToast('âœ… ÄÃ£ lÆ°u giai Ä‘oáº¡n!', 'success');
    _qtCRenderButtons();
}

async function _qtCDeleteStage(stageId) {
    const stage = _qtCStages.find(s => s.id === stageId);
    if (!stage) return;
    const count = _qtCAllTypes.filter(t => t.stage === stageId).length;
    if (!confirm(`XÃ³a giai Ä‘oáº¡n "${stage.title}"?\n${count > 0 ? `âš ï¸ ${count} nÃºt sáº½ chuyá»ƒn vá» "ChÆ°a phÃ¢n loáº¡i"` : ''}`)) return;

    // Remove stage from config
    _qtCStages = _qtCStages.filter(s => s.id !== stageId);
    await apiCall('/api/consult-stages', 'PUT', { stages: _qtCStages });

    // Clear stage from buttons
    const orders = _qtCAllTypes.filter(t => t.stage === stageId).map((t, i) => ({ key: t.key, sort_order: 999 + i, stage: null }));
    if (orders.length > 0) {
        await apiCall('/api/consult-types/batch/sort-order', 'PATCH', { orders, crm_menu: 'ctv' });
    }

    showToast('âœ… ÄÃ£ xÃ³a giai Ä‘oáº¡n!', 'success');
    await _qtCLoadData();
}

// ========== DELETE TYPE ==========
async function _qtCDeleteType(key) {
    const t = _qtCAllTypes.find(x => x.key === key);
    if (!t) return;
    if (!confirm(`ðŸ—‘ï¸ XÃ³a nÃºt "${t.icon} ${t.label}"?\n\nKey: ${t.key}\nâš ï¸ HÃ nh Ä‘á»™ng nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c!`)) return;

    try {
        await apiCall(`/api/consult-types/${key}?crm_menu=koc_tiktok`, 'DELETE');
        showToast('âœ… ÄÃ£ xÃ³a nÃºt!', 'success');
        await _qtCLoadData();
    } catch(e) {
        showToast('âŒ Lá»—i xÃ³a nÃºt: ' + (e.message || ''), 'error');
    }
}

// ========== EDIT TYPE MODAL ==========
function _qtCShowEditTypeModal(key) {
    const t = _qtCAllTypes.find(x => x.key === key);
    if (!t) return;

    const stageOptions = _qtCStages.map(s => `<option value="${s.id}" ${t.stage === s.id ? 'selected' : ''}>${s.icon} ${s.title}</option>`).join('');

    const overlay = document.createElement('div');
    overlay.className = 'qt-modal-overlay';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
        <div class="qt-modal">
            <h3>${t.icon} Chá»‰nh sá»­a nÃºt: ${t.label}</h3>
            <div class="qt-row">
                <div>
                    <label>TÃªn nÃºt</label>
                    <input type="text" id="qtEditLabel" value="${t.label}">
                </div>
                <div style="flex:0 0 80px;">
                    <label>Icon</label>
                    <input type="text" id="qtEditIcon" value="${t.icon}" style="text-align:center;font-size:20px;">
                </div>
            </div>
            <div class="qt-row">
                <div>
                    <label>MÃ u ná»n</label>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <input type="color" id="qtEditColor" value="${t.color}" style="width:50px;height:36px;padding:2px;cursor:pointer;border-radius:8px;">
                        <input type="text" id="qtEditColorText" value="${t.color}" onchange="document.getElementById('qtEditColor').value=this.value">
                    </div>
                </div>
                <div>
                    <label>MÃ u chá»¯</label>
                    <input type="text" id="qtEditTextColor" value="${t.text_color || 'white'}">
                </div>
            </div>
            <div style="margin-bottom:14px;">
                <label>Giai Ä‘oáº¡n</label>
                <select id="qtEditStage" style="margin-top:4px;">
                    <option value="">â€” ChÆ°a phÃ¢n loáº¡i â€”</option>
                    ${stageOptions}
                </select>
            </div>
            <div>
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;color:#334155;">
                    <input type="checkbox" id="qtEditActive" ${t.is_active ? 'checked' : ''} style="width:18px;height:18px;accent-color:#22c55e;">
                    Äang báº­t (hiá»ƒn thá»‹ cho NV)
                </label>
            </div>
            <div class="qt-preview">
                <label>Xem trÆ°á»›c</label>
                <div id="qtEditPreview" style="margin-top:8px;display:flex;align-items:center;gap:8px;">
                    <span style="font-size:24px;">${t.icon}</span>
                    <span style="padding:6px 14px;border-radius:8px;font-weight:700;font-size:13px;background:${t.color};color:${t.text_color || 'white'};">${t.label}</span>
                </div>
            </div>
            <div class="qt-actions">
                <button class="qt-btn qt-btn-secondary" onclick="this.closest('.qt-modal-overlay').remove()">Há»§y</button>
                <button class="qt-btn qt-btn-primary" onclick="_qtCSaveType('${key}')">ðŸ’¾ LÆ°u</button>
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

async function _qtCSaveType(key) {
    const data = {
        label: document.getElementById('qtEditLabel').value,
        icon: document.getElementById('qtEditIcon').value,
        color: document.getElementById('qtEditColor').value,
        text_color: document.getElementById('qtEditTextColor').value,
        is_active: document.getElementById('qtEditActive').checked,
        stage: document.getElementById('qtEditStage').value || null
    };
    await apiCall(`/api/consult-types/${key}`, 'PUT', {...data, crm_menu: 'ctv'});
    document.querySelector('.qt-modal-overlay')?.remove();
    showToast('âœ… ÄÃ£ lÆ°u thay Ä‘á»•i!', 'success');
    await _qtCLoadData();
}

function _qtCShowAddTypeModal() {
    const stageOptions = _qtCStages.map(s => `<option value="${s.id}">${s.icon} ${s.title}</option>`).join('');

    const overlay = document.createElement('div');
    overlay.className = 'qt-modal-overlay';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
        <div class="qt-modal">
            <h3>âž• ThÃªm nÃºt tÆ° váº¥n má»›i</h3>
            <div class="qt-row">
                <div>
                    <label>Key (khÃ´ng dáº¥u, dÃ¹ng _ )</label>
                    <input type="text" id="qtNewKey" placeholder="vd: goi_lai">
                </div>
                <div>
                    <label>TÃªn hiá»ƒn thá»‹</label>
                    <input type="text" id="qtNewLabel" placeholder="vd: Gá»i Láº¡i">
                </div>
            </div>
            <div class="qt-row">
                <div style="flex:0 0 80px;">
                    <label>Icon</label>
                    <input type="text" id="qtNewIcon" value="ðŸ“‹" style="text-align:center;font-size:20px;">
                </div>
                <div>
                    <label>MÃ u</label>
                    <input type="color" id="qtNewColor" value="#6b7280" style="width:50px;height:36px;border-radius:8px;cursor:pointer;">
                </div>
                <div style="flex:2;">
                    <label>Giai Ä‘oáº¡n</label>
                    <select id="qtNewStage" style="margin-top:4px;">
                        <option value="">â€” ChÆ°a phÃ¢n loáº¡i â€”</option>
                        ${stageOptions}
                    </select>
                </div>
            </div>
            <div class="qt-actions">
                <button class="qt-btn qt-btn-secondary" onclick="this.closest('.qt-modal-overlay').remove()">Há»§y</button>
                <button class="qt-btn qt-btn-primary" onclick="_qtCAddType()">âž• ThÃªm</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function _qtCAddType() {
    const key = document.getElementById('qtNewKey').value.trim();
    const label = document.getElementById('qtNewLabel').value.trim();
    if (!key || !label) return showToast('âŒ Vui lÃ²ng nháº­p Key vÃ  TÃªn!', 'error');
    const data = {
        key, label,
        icon: document.getElementById('qtNewIcon').value,
        color: document.getElementById('qtNewColor').value,
        stage: document.getElementById('qtNewStage').value || null
    };
    await apiCall('/api/consult-types', 'POST', {...data, crm_menu: 'ctv'});
    document.querySelector('.qt-modal-overlay')?.remove();
    showToast('âœ… ÄÃ£ thÃªm nÃºt má»›i!', 'success');
    await _qtCLoadData();
}

// ========== TAB 2: RULES (Flowchart + Dynamic Accordion) ==========
function _qtCRenderRules() {
    const panel = document.getElementById('qtPanel');
    let html = _qtCRenderFlowchart();

    // Legend
    html += `
        <div class="qt-legend">
            <span class="qt-legend-item">â­ = NÃºt máº·c Ä‘á»‹nh (tá»± chá»n)</span>
            <span class="qt-legend-item">ðŸ“… = Sau X ngÃ y má»›i hiá»‡n</span>
            <span class="qt-legend-item">ðŸ”µ = NÃºt Ä‘Ã­ch cho phÃ©p</span>
        </div>
    `;

    if (_qtCIsGD) {
        const unsecCount = _qtCUnsectioned.length;
        html += `<div class="qt-action-bar" style="gap:8px;">
            <button class="qt-flow-edit-btn" style="background:linear-gradient(135deg,#10b981,#059669);" onclick="_qtCShowAddPhaseModal()">ðŸ“‚ ThÃªm Pháº§n</button>
            <button class="qt-flow-edit-btn" onclick="_qtCShowAddRuleGroupModal()">âž• ThÃªm nhÃ³m quy táº¯c má»›i ${unsecCount > 0 ? '<span style="background:#ef4444;color:white;padding:1px 7px;border-radius:10px;font-size:10px;margin-left:4px;">' + unsecCount + '</span>' : ''}</button>
        </div>`;
    }

    // â˜… DYNAMIC phases from API
    const renderedPhaseIds = new Set();
    for (const phase of _qtCRulePhases) {
        const phaseSections = _qtCSections.filter(s => s.rule_phase === phase.id);
        renderedPhaseIds.add(phase.id);

        html += `
            <div class="qt-section-divider" style="background:${phase.gradient};border-left-color:${phase.color};">
                <span class="qt-section-divider-icon">${phase.icon}</span>
                <span class="qt-section-divider-text" style="color:${phase.color}">PHáº¦N ${phase.sort_order}: ${phase.title}</span>
                ${_qtCIsGD ? `<div style="margin-left:auto;display:flex;gap:6px;">
                    <button onclick="event.stopPropagation();_qtCEditPhase('${phase.id}')" style="background:none;border:none;cursor:pointer;font-size:14px;" title="Sá»­a pháº§n">âœï¸</button>
                    <button onclick="event.stopPropagation();_qtCDeletePhase('${phase.id}')" style="background:none;border:none;cursor:pointer;font-size:14px;" title="XÃ³a pháº§n">ðŸ—‘ï¸</button>
                </div>` : ''}
            </div>
        `;

        if (phaseSections.length === 0) {
            html += `<div style="padding:16px 24px;color:#94a3b8;font-style:italic;font-size:13px;">â€” ChÆ°a cÃ³ loáº¡i nÃ o trong pháº§n nÃ y â€”</div>`;
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
                    <span style="font-size:16px;">ðŸš¨</span>
                    <span style="font-size:13px;font-weight:700;color:#991b1b;letter-spacing:0.5px;">Cáº¤P Cá»¨U Sáº¾P</span>
                    <span style="font-size:10px;color:#b91c1c;opacity:0.7;">â€” Loáº¡i ${SUBGROUP_EMERGENCY.map(k => { const s = phaseSections.find(x => x.key === k); return s ? s.section_order : ''; }).filter(Boolean).join(', ')}</span>
                </div>`;
            }
            // Inject sub-group label before first cancel section
            if (!_cancelSubShown && SUBGROUP_CANCEL.includes(sec.key)) {
                _cancelSubShown = true;
                html += `<div style="margin:16px 0 8px;padding:8px 16px;background:linear-gradient(135deg,#fff7ed,#fffbeb);border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;display:flex;align-items:center;gap:8px;">
                    <span style="font-size:16px;">âŒ</span>
                    <span style="font-size:13px;font-weight:700;color:#92400e;letter-spacing:0.5px;">Há»¦Y KHÃCH</span>
                    <span style="font-size:10px;color:#b45309;opacity:0.7;">â€” Loáº¡i ${SUBGROUP_CANCEL.map(k => { const s = phaseSections.find(x => x.key === k); return s ? s.section_order : ''; }).filter(Boolean).join(', ')}</span>
                </div>`;
            }
            html += _qtCRenderSectionAccordion(sec);
        }
    }

    // Sections without a phase
    const unphased = _qtCSections.filter(s => !s.rule_phase || !renderedPhaseIds.has(s.rule_phase));
    if (unphased.length > 0) {
        html += `
            <div class="qt-section-divider" style="background:linear-gradient(135deg,#334155,#1e293b);border-left-color:#64748b;">
                <span class="qt-section-divider-icon">ðŸ“‹</span>
                <span class="qt-section-divider-text" style="color:#94a3b8;">CHÆ¯A PHÃ‚N PHáº¦N</span>
            </div>
        `;
        for (const sec of unphased) {
            html += _qtCRenderSectionAccordion(sec);
        }
    }

    panel.innerHTML = html;
    const firstHeader = panel.querySelector('.qt-flow-header');
    if (firstHeader) _qtCToggleSection(firstHeader);
}

// Render a single section accordion item
function _qtCRenderSectionAccordion(sec) {
    // Check if this is a group leader
    const isGroup = !!sec.section_group;
    const groupKeys = isGroup ? _qtCGetGroupKeys(sec.section_group) : [sec.key];
    const rules = _qtCAllRules[sec.key];
    const isWaitingStatus = sec.key === 'cho_duyet_huy';
    const isEmergencyPending = sec.key === 'pending_emergency';
    const isEmergencyDone = sec.key === 'hoan_thanh_cap_cuu';
    const hasInfoBlock = isWaitingStatus || isEmergencyPending || isEmergencyDone;
    if (!hasInfoBlock && (!rules || rules.length === 0)) return '';

    let label, tooltip = '';
    if (isGroup && sec.section_group_label) {
        label = sec.section_group_label;
        const memberLabels = groupKeys.map(k => {
            const t = _qtCAllTypes.find(x => x.key === k);
            return t ? `${t.icon} ${t.label}` : k;
        }).join(', ');
        tooltip = `title=\"Gá»“m: ${memberLabels}\"`;
    } else {
        const tp = _qtCAllTypes.find(x => x.key === sec.key);
        label = tp ? tp.label : sec.label;
    }
    const sectionId = `qtRule_${sec.key}`;
    const editKey = isGroup ? sec.section_group : sec.key;

    let html = `
        <div class="qt-flow-section" id="${sectionId}">
            <div class="qt-flow-header" onclick="_qtCToggleSection(this)">
                <div class="qt-flow-title">
                    <span class="qt-loai-badge" style="background:#3b82f6;cursor:${_qtCIsGD ? 'pointer' : 'default'};" ${_qtCIsGD ? `onclick="event.stopPropagation();_qtCEditSectionOrder('${sec.key}',${sec.section_order})" title="Click Ä‘á»ƒ Ä‘á»•i STT"` : ''}>Loáº¡i ${sec.section_order}</span>
                    <span ${tooltip}>Khi áº¥n: ${label}</span>
                    ${isGroup ? `<span style="font-size:10px;background:#8b5cf6;color:white;padding:1px 6px;border-radius:8px;">ðŸ”— ${groupKeys.length} nÃºt</span>
                        <span class="qt-group-members" style="display:inline-flex;gap:3px;flex-wrap:wrap;margin-left:4px;">${groupKeys.map(k => { const mt = _qtCAllTypes.find(x => x.key === k); return mt ? `<span style="font-size:9px;padding:1px 5px;border-radius:6px;background:${mt.color}20;color:${mt.color};font-weight:700;border:1px solid ${mt.color}30;white-space:nowrap;">${mt.icon} ${mt.label}</span>` : ''; }).join('')}</span>` : ''}
                    <span class="qt-flow-count">${rules.length} nÃºt</span>
                    ${_qtCIsGD ? `<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:${sec.max_appointment_days > 0 ? '#f59e0b20' : '#64748b20'};color:${sec.max_appointment_days > 0 ? '#f59e0b' : '#94a3b8'};cursor:pointer;border:1px solid ${sec.max_appointment_days > 0 ? '#f59e0b40' : '#64748b30'};margin-left:4px;" onclick="event.stopPropagation();_qtCEditMaxDays('${sec.key}',${sec.max_appointment_days || 0})" title="Giá»›i háº¡n ngÃ y háº¹n tá»‘i Ä‘a">ðŸ“… ${sec.max_appointment_days > 0 ? sec.max_appointment_days + ' ngÃ y' : 'KhÃ´ng giá»›i háº¡n'}</span>` : (sec.max_appointment_days > 0 ? `<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:#f59e0b20;color:#f59e0b;">ðŸ“… ${sec.max_appointment_days} ngÃ y</span>` : '')}
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    ${_qtCIsGD ? `<button class="qt-flow-edit-btn" onclick="event.stopPropagation();_qtCShowEditRulesModal('${sec.key}')">âœï¸ Sá»­a</button><button class="qt-flow-edit-btn" style="background:#ef4444;padding:4px 8px;min-width:0;" onclick="event.stopPropagation();_qtCDeleteSection('${sec.key}')" title="XÃ³a loáº¡i">ðŸ—‘ï¸</button>` : ''}
                    <span class="qt-flow-chevron">â–¼</span>
                </div>
            </div>
            <div class="qt-flow-body">
                ${isWaitingStatus ? `
                <div style="padding:16px 20px;">
                    <div style="background:linear-gradient(135deg,#fef3c7,#fffbeb);border:1px solid #f59e0b40;border-radius:12px;padding:16px 20px;display:flex;flex-direction:column;gap:10px;">
                        <div style="font-size:14px;font-weight:700;color:#92400e;">â³ NV chá»‰ chá» Sáº¿p duyá»‡t â€” khÃ´ng cÃ³ nÃºt tÆ° váº¥n</div>
                        <div style="font-size:12px;color:#78350f;line-height:1.6;">
                            <div>âœ… <b>Sáº¿p duyá»‡t</b> â†’ Chuyá»ƒn sang <b>Há»§y KhÃ¡ch (ÄÃ£ Duyá»‡t)</b></div>
                            <div>âŒ <b>Sáº¿p tá»« chá»‘i</b> â†’ Chuyá»ƒn sang <b>TÆ° Váº¥n Láº¡i</b></div>
                            <div>â° <b>QuÃ¡ 24h khÃ´ng xá»­ lÃ½</b> â†’ Tá»± Ä‘á»™ng chuyá»ƒn <b>TÆ° Váº¥n Láº¡i</b></div>
                        </div>
                    </div>
                </div>
                ` : isEmergencyPending ? `
                <div style="padding:16px 20px;">
                    <div style="background:linear-gradient(135deg,#fef2f2,#fff1f2);border:1px solid #ef444440;border-radius:12px;padding:16px 20px;display:flex;flex-direction:column;gap:10px;">
                        <div style="font-size:14px;font-weight:700;color:#991b1b;">ðŸš¨ KhÃ¡ch Ä‘ang cÃ³ Cáº¥p Cá»©u Sáº¿p â€” NV bá»‹ LOCK</div>
                        <div style="font-size:12px;color:#7f1d1d;line-height:1.8;">
                            <div>ðŸ”’ NV <b>chá»‰ tháº¥y nÃºt "Cáº¥p Cá»©u Sáº¿p"</b> Ä‘á»ƒ nháº¯c láº¡i (khÃ´ng tÆ° váº¥n khÃ¡c Ä‘Æ°á»£c)</div>
                            <div>â° Sáº¿p pháº£i xá»­ lÃ½ trÆ°á»›c <b>12h trÆ°a ngÃ y lÃ m viá»‡c káº¿ tiáº¿p</b> (skip CN / Lá»… / Nghá»‰ phÃ©p Sáº¿p)</div>
                            <div>ðŸ’° Náº¿u quÃ¡ háº¡n: <b>Pháº¡t Sáº¿p 50.000Ä‘/ngÃ y</b> (cá»™ng dá»“n má»—i ngÃ y chÆ°a xá»­ lÃ½)</div>
                            <div>ðŸ”„ Sáº¿p cÃ³ thá»ƒ <b>BÃ n Giao</b> cho Sáº¿p khÃ¡c (timeout 30 phÃºt)</div>
                        </div>
                    </div>
                </div>
                <div class="qt-flow-label">Hiá»‡n cÃ¡c nÃºt:</div>
                <div class="qt-flow-targets">
                ` : isEmergencyDone ? `
                <div style="padding:16px 20px;">
                    <div style="background:linear-gradient(135deg,#dcfce7,#f0fdf4);border:1px solid #22c55e40;border-radius:12px;padding:16px 20px;display:flex;flex-direction:column;gap:10px;">
                        <div style="font-size:14px;font-weight:700;color:#166534;">âœ… Sáº¿p Ä‘Ã£ xá»­ lÃ½ Cáº¥p Cá»©u â€” NV tiáº¿p tá»¥c tÆ° váº¥n</div>
                        <div style="font-size:12px;color:#14532d;line-height:1.8;">
                            <div>ðŸ“ Sáº¿p Ä‘Ã£ ghi <b>tÆ° váº¥n chiáº¿n lÆ°á»£c</b> + hÃ¬nh áº£nh (náº¿u cÃ³)</div>
                            <div>ðŸ“… Há»‡ thá»‘ng tá»± <b>háº¹n ngÃ y lÃ m viá»‡c káº¿ tiáº¿p</b> cho khÃ¡ch</div>
                            <div>ðŸ‘‡ NV chá»n nÃºt bÃªn dÆ°á»›i Ä‘á»ƒ <b>tiáº¿p tá»¥c tÆ° váº¥n khÃ¡ch</b></div>
                        </div>
                    </div>
                </div>
                <div class="qt-flow-label">Hiá»‡n cÃ¡c nÃºt:</div>
                <div class="qt-flow-targets">
                ` : `<div class="qt-flow-label">Hiá»‡n cÃ¡c nÃºt:</div>
                <div class="qt-flow-targets">`}
    `;

    if (!isWaitingStatus) {
        const rulesList = rules || [];
        for (const r of rulesList) {
            const rtp = _qtCAllTypes.find(x => x.key === r.to_type_key);
            const icon = rtp ? rtp.icon : r.to_icon || 'ðŸ“‹';
            const rlabel = rtp ? rtp.label : r.to_label || r.to_type_key;
            const color = rtp ? rtp.color : r.to_color || '#6b7280';
            html += `
                <div class="qt-target-card" style="--target-color:${color}">
                    <span class="qt-t-icon">${icon}</span>
                    <div class="qt-t-label">${rlabel}</div>
                    ${r.is_default ? '<div class="qt-t-default">â­ Máº·c Ä‘á»‹nh</div>' : ''}
                    ${r.delay_days > 0
                        ? `<div class="qt-t-delay">ðŸ“… Sau ${r.delay_days} ngÃ y</div>`
                        : '<div class="qt-t-instant">âš¡ Ngay láº­p tá»©c</div>'}
                </div>
            `;
        }
    }
    html += isWaitingStatus ? '</div></div>' : '</div></div></div>';
    return html;
}

// Edit max appointment days for a section
async function _qtCEditMaxDays(key, currentVal) {
    const val = prompt(`ðŸ“… Giá»›i háº¡n ngÃ y háº¹n tá»‘i Ä‘a cho loáº¡i nÃ y?\n\n0 = KhÃ´ng giá»›i háº¡n\nVD: 15 = Chá»‰ cho háº¹n tá»‘i Ä‘a 15 ngÃ y`, currentVal || 0);
    if (val === null) return;
    const days = parseInt(val) || 0;
    if (days < 0) return showToast('Sá»‘ ngÃ y khÃ´ng há»£p lá»‡', 'error');
    try {
        await apiCall(`/api/consult-types/${key}/max-appointment-days`, 'PATCH', { max_appointment_days: days, crm_menu: 'ctv' });
        showToast(`âœ… ÄÃ£ cáº­p nháº­t giá»›i háº¡n: ${days > 0 ? days + ' ngÃ y' : 'KhÃ´ng giá»›i háº¡n'}`);
        _qtCLoadData();
    } catch(e) { showToast('Lá»—i: ' + (e.message || ''), 'error'); }
}

// Get all keys in a section group
function _qtCGetGroupKeys(groupId) {
    if (!groupId) return [];
    const keys = [];
    // Leader (section_order > 0)
    const leader = _qtCSections.find(s => s.section_group === groupId);
    if (leader) keys.push(leader.key);
    // Members (section_order = 0)
    for (const m of _qtCGroupMembers) {
        if (m.section_group === groupId && !keys.includes(m.key)) keys.push(m.key);
    }
    return keys;
}

// ========== PHASE MANAGEMENT ==========
function _qtCShowAddPhaseModal() {
    const presetsHTML = KOCKOL_STAGE_PRESETS.map((p, i) => `
        <label style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:8px;cursor:pointer;border:2px solid transparent;transition:all .2s;" class="qt-preset-opt" onclick="document.querySelectorAll('.qt-preset-opt').forEach(x=>x.style.borderColor='transparent');this.style.borderColor='#2563eb';document.getElementById('qtPhasePresetIdx').value=${i}">
            <div style="width:50px;height:24px;border-radius:4px;background:${p.gradient};flex-shrink:0;"></div>
            <span style="font-size:11px;font-weight:600;color:#334155;">${p.name}</span>
        </label>
    `).join('');

    const nextOrder = _qtCRulePhases.length > 0 ? Math.max(..._qtCRulePhases.map(p => p.sort_order)) + 1 : 1;

    const overlay = document.createElement('div');
    overlay.className = 'qt-modal-overlay';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
        <div class="qt-modal">
            <h3>ðŸ“‚ ThÃªm Pháº§n má»›i</h3>
            <input type="hidden" id="qtPhasePresetIdx" value="0">
            <div class="qt-row">
                <div>
                    <label>TÃªn pháº§n</label>
                    <input type="text" id="qtPhaseTitle" placeholder="VD: RE-MARKETING">
                </div>
                <div style="flex:0 0 80px;">
                    <label>Icon</label>
                    <input type="text" id="qtPhaseIcon" value="ðŸŽ¯" style="text-align:center;font-size:20px;">
                </div>
            </div>
            <div style="margin-top:8px;">
                <label>Chá»n mÃ u ná»n</label>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px;max-height:180px;overflow-y:auto;">
                    ${presetsHTML}
                </div>
            </div>
            <div style="margin-top:8px;">
                <label>Gom cÃ¡c loáº¡i vÃ o pháº§n nÃ y:</label>
                <div id="qtPhaseSectionsList" style="max-height:200px;overflow-y:auto;margin-top:4px;">
                    ${_qtCSections.filter(s => !s.rule_phase).map(s => `
                        <div class="qt-rule-item" data-key="${s.key}" style="cursor:pointer;" onclick="this.querySelector('input[type=checkbox]').click()">
                            <input type="checkbox" class="qt-ri-check" onclick="event.stopPropagation()">
                            <div class="qt-ri-info">
                                <span class="qt-ri-icon">${s.icon}</span>
                                <span class="qt-ri-label">Loáº¡i ${s.section_order}: ${s.label}</span>
                            </div>
                        </div>
                    `).join('') || '<div style="padding:8px;color:#94a3b8;font-size:12px;">Táº¥t cáº£ loáº¡i Ä‘Ã£ thuá»™c pháº§n khÃ¡c</div>'}
                </div>
            </div>
            <div class="qt-actions">
                <button class="qt-btn qt-btn-secondary" onclick="this.closest('.qt-modal-overlay').remove()">Há»§y</button>
                <button class="qt-btn qt-btn-primary" onclick="_qtCAddPhase()">ðŸ“‚ ThÃªm Pháº§n</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => { const f = overlay.querySelector('.qt-preset-opt'); if (f) f.style.borderColor = '#2563eb'; }, 50);
}

async function _qtCAddPhase() {
    const title = document.getElementById('qtPhaseTitle').value.trim();
    const icon = document.getElementById('qtPhaseIcon').value.trim();
    if (!title) return showToast('âŒ Vui lÃ²ng nháº­p tÃªn pháº§n!', 'error');

    const presetIdx = parseInt(document.getElementById('qtPhasePresetIdx').value) || 0;
    const preset = KOCKOL_STAGE_PRESETS[presetIdx];
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || ('phase_' + Date.now());
    const nextOrder = _qtCRulePhases.length > 0 ? Math.max(..._qtCRulePhases.map(p => p.sort_order)) + 1 : 1;

    _qtCRulePhases.push({
        id, title, icon: icon || 'ðŸ“‹',
        color: preset.textColor, gradient: preset.gradient,
        sort_order: nextOrder
    });
    await apiCall('/api/consult-rule-phases', 'PUT', { phases: _qtCRulePhases });

    // Assign selected sections to this phase
    const items = document.querySelectorAll('#qtPhaseSectionsList .qt-rule-item');
    const updates = [];
    items.forEach(item => {
        if (item.querySelector('.qt-ri-check').checked) updates.push({ key: item.dataset.key, rule_phase: id });
    });
    if (updates.length > 0) await apiCall('/api/consult-types/batch/rule-phase', 'PATCH', { updates, crm_menu: 'ctv' });

    document.querySelector('.qt-modal-overlay')?.remove();
    showToast('âœ… ÄÃ£ thÃªm pháº§n!', 'success');
    await _qtCLoadData();
    _qtCSwitchTab('rules');
}

function _qtCEditPhase(phaseId) {
    const phase = _qtCRulePhases.find(p => p.id === phaseId);
    if (!phase) return;

    // Sections in this phase + available sections (no phase or different phase)
    const allSectioned = _qtCSections;
    let sectionsHTML = allSectioned.map(s => {
        const inThis = s.rule_phase === phaseId;
        return `
            <div class="qt-rule-item" data-key="${s.key}" style="cursor:pointer;" onclick="this.querySelector('input[type=checkbox]').click()">
                <input type="checkbox" class="qt-ri-check" ${inThis ? 'checked' : ''} onclick="event.stopPropagation()">
                <div class="qt-ri-info">
                    <span class="qt-ri-icon">${s.icon}</span>
                    <span class="qt-ri-label">Loáº¡i ${s.section_order}: ${s.label}</span>
                </div>
            </div>
        `;
    }).join('');

    const overlay = document.createElement('div');
    overlay.className = 'qt-modal-overlay';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
        <div class="qt-modal">
            <h3>âœï¸ Sá»­a Pháº§n: ${phase.icon} ${phase.title}</h3>
            <div class="qt-row">
                <div>
                    <label>TÃªn pháº§n</label>
                    <input type="text" id="qtEditPhaseTitle" value="${phase.title}">
                </div>
                <div style="flex:0 0 80px;">
                    <label>Icon</label>
                    <input type="text" id="qtEditPhaseIcon" value="${phase.icon}" style="text-align:center;font-size:20px;">
                </div>
            </div>
            <div style="margin-top:10px;">
                <label>Gom cÃ¡c loáº¡i vÃ o pháº§n nÃ y:</label>
                <div id="qtEditPhaseSectionsList" style="max-height:250px;overflow-y:auto;margin-top:4px;">
                    ${sectionsHTML}
                </div>
            </div>
            <div class="qt-actions">
                <button class="qt-btn qt-btn-secondary" onclick="this.closest('.qt-modal-overlay').remove()">Há»§y</button>
                <button class="qt-btn qt-btn-primary" onclick="_qtCSavePhase('${phaseId}')">ðŸ’¾ LÆ°u</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function _qtCSavePhase(phaseId) {
    const phase = _qtCRulePhases.find(p => p.id === phaseId);
    if (!phase) return;

    phase.title = document.getElementById('qtEditPhaseTitle').value.trim() || phase.title;
    phase.icon = document.getElementById('qtEditPhaseIcon').value.trim() || phase.icon;
    await apiCall('/api/consult-rule-phases', 'PUT', { phases: _qtCRulePhases });

    // Update section assignments
    const items = document.querySelectorAll('#qtEditPhaseSectionsList .qt-rule-item');
    const updates = [];
    items.forEach(item => {
        const checked = item.querySelector('.qt-ri-check').checked;
        const key = item.dataset.key;
        const sec = _qtCSections.find(s => s.key === key);
        if (checked && (!sec || sec.rule_phase !== phaseId)) {
            updates.push({ key, rule_phase: phaseId });
        } else if (!checked && sec && sec.rule_phase === phaseId) {
            updates.push({ key, rule_phase: null });
        }
    });
    if (updates.length > 0) await apiCall('/api/consult-types/batch/rule-phase', 'PATCH', { updates, crm_menu: 'ctv' });

    document.querySelector('.qt-modal-overlay')?.remove();
    showToast('âœ… ÄÃ£ lÆ°u pháº§n!', 'success');
    await _qtCLoadData();
    _qtCSwitchTab('rules');
}

async function _qtCDeletePhase(phaseId) {
    const phase = _qtCRulePhases.find(p => p.id === phaseId);
    if (!phase) return;
    const count = _qtCSections.filter(s => s.rule_phase === phaseId).length;
    if (!confirm(`ðŸ—‘ï¸ XÃ³a pháº§n "${phase.icon} ${phase.title}"?\n${count > 0 ? `âš ï¸ ${count} loáº¡i sáº½ chuyá»ƒn vá» "ChÆ°a phÃ¢n pháº§n"` : ''}`)) return;

    // Clear rule_phase for sections in this phase
    const updates = _qtCSections.filter(s => s.rule_phase === phaseId).map(s => ({ key: s.key, rule_phase: null }));
    if (updates.length > 0) await apiCall('/api/consult-types/batch/rule-phase', 'PATCH', { updates, crm_menu: 'ctv' });

    _qtCRulePhases = _qtCRulePhases.filter(p => p.id !== phaseId);
    await apiCall('/api/consult-rule-phases', 'PUT', { phases: _qtCRulePhases });

    showToast('âœ… ÄÃ£ xÃ³a pháº§n!', 'success');
    await _qtCLoadData();
    _qtCSwitchTab('rules');
}

// ========== ADD SECTION (ThÃªm loáº¡i khi áº¥n) ==========
function _qtCShowAddSectionModal() {
    if (_qtCUnsectioned.length === 0) return showToast('âœ… Táº¥t cáº£ nÃºt Ä‘Ã£ cÃ³ loáº¡i!', 'success');
    const nextOrder = _qtCSections.length > 0 ? Math.max(..._qtCSections.map(s => s.section_order)) + 1 : 1;

    let listHTML = _qtCUnsectioned.map(t => `
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
            <h3>ðŸ“Œ ThÃªm loáº¡i khi áº¥n</h3>
            <p style="font-size:12px;color:#64748b;margin-bottom:12px;">Chá»n nÃºt chÆ°a cÃ³ loáº¡i â†’ táº¡o section "Khi áº¥n: ..." cho nÃ³</p>
            <div class="qt-rule-list" style="max-height:300px;overflow-y:auto;">${listHTML}</div>
            <div style="margin-top:12px;">
                <label style="font-size:13px;font-weight:600;color:#334155;">Báº¯t Ä‘áº§u tá»« Loáº¡i sá»‘:</label>
                <input type="number" id="qtNewSectionOrder" value="${nextOrder}" min="1" style="width:80px;padding:6px 10px;font-size:14px;font-weight:700;border:2px solid #3b82f6;border-radius:8px;text-align:center;margin-left:8px;">
            </div>
            <div class="qt-actions">
                <button class="qt-btn qt-btn-secondary" onclick="this.closest('.qt-modal-overlay').remove()">Há»§y</button>
                <button class="qt-btn qt-btn-primary" onclick="_qtCAddSections()">ðŸ“Œ ThÃªm loáº¡i</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function _qtCAddSections() {
    const items = document.querySelectorAll('.qt-rule-list .qt-rule-item');
    const selected = [];
    items.forEach(item => {
        if (item.querySelector('.qt-ri-check').checked) selected.push(item.dataset.key);
    });
    if (selected.length === 0) return showToast('âŒ Chá»n Ã­t nháº¥t 1 nÃºt!', 'error');

    let startOrder = parseInt(document.getElementById('qtNewSectionOrder').value) || 1;

    for (const key of selected) {
        // Create flow rule if missing
        await apiCall(`/api/consult-flow-rules/${key}`, 'PUT', {
            rules: [{ to_type_key: key, is_default: true, delay_days: 0, sort_order: 1 }], crm_menu: 'ctv'
        });
        // Set section order
        await apiCall(`/api/consult-types/${key}/section-order`, 'PATCH', { section_order: startOrder, crm_menu: 'ctv' });
        startOrder++;
    }

    document.querySelector('.qt-modal-overlay')?.remove();
    showToast(`âœ… ÄÃ£ thÃªm ${selected.length} loáº¡i!`, 'success');
    await apiCall('/api/consult-sections/reindex', 'POST', { crm_menu: 'ctv' });
    await _qtCLoadData();
    _qtCSwitchTab('rules');
}

// ========== EDIT SECTION ORDER (click badge) ==========
function _qtCEditSectionOrder(key, currentOrder) {
    const tp = _qtCAllTypes.find(x => x.key === key);
    const label = tp ? `${tp.icon} ${tp.label}` : key;
    const sec = _qtCSections.find(s => s.key === key);
    const currentPhase = sec ? sec.rule_phase : '';

    const phaseOptions = _qtCRulePhases.map(p =>
        `<option value="${p.id}" ${p.id === currentPhase ? 'selected' : ''}>${p.icon} PHáº¦N ${p.sort_order}: ${p.title}</option>`
    ).join('');

    const overlay = document.createElement('div');
    overlay.className = 'qt-modal-overlay';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
        <div class="qt-modal">
            <h3>ðŸ”¢ Chá»‰nh Loáº¡i: ${label}</h3>
            <div style="margin-bottom:12px;">
                <label style="font-size:13px;font-weight:600;color:#334155;">Sá»‘ Loáº¡i (STT)</label>
                <input type="number" id="qtEditLoaiNum" value="${currentOrder}" min="1" style="width:100%;padding:10px;font-size:18px;font-weight:700;border:2px solid #3b82f6;border-radius:10px;text-align:center;margin-top:4px;">
            </div>
            <div style="margin-bottom:12px;">
                <label style="font-size:13px;font-weight:600;color:#334155;">Thuá»™c Pháº§n</label>
                <select id="qtEditLoaiPhase" style="margin-top:4px;">
                    <option value="">(ChÆ°a phÃ¢n pháº§n)</option>
                    ${phaseOptions}
                </select>
            </div>
            <div class="qt-actions">
                <button class="qt-btn qt-btn-secondary" onclick="this.closest('.qt-modal-overlay').remove()">Há»§y</button>
                <button class="qt-btn qt-btn-primary" onclick="_qtCSaveSectionEdit('${key}',${currentOrder})">ðŸ’¾ LÆ°u</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function _qtCSaveSectionEdit(key, oldOrder) {
    const newOrder = parseInt(document.getElementById('qtEditLoaiNum').value);
    const newPhase = document.getElementById('qtEditLoaiPhase').value;
    if (!newOrder || newOrder < 1) return showToast('âŒ Sá»‘ loáº¡i khÃ´ng há»£p lá»‡!', 'error');

    const promises = [];
    if (newOrder !== oldOrder) {
        promises.push(apiCall(`/api/consult-types/${key}/section-order`, 'PATCH', { section_order: newOrder, crm_menu: 'ctv' }));
    }
    const sec = _qtCSections.find(s => s.key === key);
    if (!sec || sec.rule_phase !== (newPhase || null)) {
        promises.push(apiCall(`/api/consult-types/${key}/rule-phase`, 'PATCH', { rule_phase: newPhase || null, crm_menu: 'ctv' }));
    }
    if (promises.length > 0) await Promise.all(promises);

    document.querySelector('.qt-modal-overlay')?.remove();
    showToast('âœ… ÄÃ£ cáº­p nháº­t!', 'success');
    await apiCall('/api/consult-sections/reindex', 'POST', { crm_menu: 'ctv' });
    await _qtCLoadData();
    _qtCSwitchTab('rules');
}

async function _qtCDeleteSection(key) {
    const sec = _qtCSections.find(s => s.key === key);
    const isGroup = sec && sec.section_group;
    const groupKeys = isGroup ? _qtCGetGroupKeys(sec.section_group) : [key];
    const tp = _qtCAllTypes.find(x => x.key === key);
    const displayLabel = (isGroup && sec.section_group_label) ? sec.section_group_label : (tp ? `${tp.icon} ${tp.label}` : key);
    const ruleCount = (_qtCAllRules[key] || []).length;

    if (!confirm(`ðŸ—‘ï¸ XÃ³a loáº¡i "${displayLabel}"?${isGroup ? `\nðŸ”— Gá»“m ${groupKeys.length} nÃºt trong nhÃ³m` : ''}\n\nâŒ XÃ³a toÃ n bá»™ ${ruleCount} flow rules\nâŒ XÃ³a khá»i pháº§n hiá»‡n táº¡i\nâœ… Data tÆ° váº¥n cÅ© giá»¯ nguyÃªn\n\nâš ï¸ KhÃ´ng thá»ƒ hoÃ n tÃ¡c!`)) return;

    try {
        console.log('[_qtCDeleteSection] Deleting key:', key, 'groupKeys:', groupKeys);
        for (const k of groupKeys) {
            console.log('[_qtCDeleteSection] Processing key:', k);
            const r1 = await apiCall(`/api/consult-flow-rules/${k}?crm_menu=koc_tiktok`, 'DELETE');
            console.log('[_qtCDeleteSection] DELETE flow-rules:', k, r1);
            const r2 = await apiCall(`/api/consult-types/${k}/section-order`, 'PATCH', { section_order: 0, crm_menu: 'ctv' });
            console.log('[_qtCDeleteSection] PATCH section-order:', k, r2);
            const r3 = await apiCall(`/api/consult-types/${k}/rule-phase`, 'PATCH', { rule_phase: null, crm_menu: 'ctv' });
            console.log('[_qtCDeleteSection] PATCH rule-phase:', k, r3);
            // Clear group fields
            const r4 = await apiCall(`/api/consult-types/${k}`, 'PATCH', { section_group: null, section_group_label: null, crm_menu: 'ctv' });
            console.log('[_qtCDeleteSection] PATCH group fields:', k, r4);
        }

        showToast('âœ… ÄÃ£ xÃ³a loáº¡i hoÃ n toÃ n!', 'success');
        await apiCall('/api/consult-sections/reindex', 'POST', { crm_menu: 'ctv' });
        await _qtCLoadData();
        _qtCSwitchTab('rules');
    } catch(e) {
        console.error('[_qtCDeleteSection] ERROR:', e);
        showToast('âŒ Lá»—i xÃ³a loáº¡i: ' + (e.message || ''), 'error');
    }
}

function _qtCToggleSection(header) {
    const body = header.nextElementSibling;
    const isOpen = body.classList.contains('open');
    header.classList.toggle('open', !isOpen);
    body.classList.toggle('open', !isOpen);
}

// ========== FLOWCHART (DYNAMIC from sections) ==========
function _qtCRenderFlowchart() {
    // Build journey nodes dynamically from _qtCSections (sorted by section_order)
    // Group by phase for separate rows
    const phaseMap = new Map(); // phaseId => { phase, sections[] }

    for (const phase of _qtCRulePhases) {
        phaseMap.set(phase.id, { phase, sections: [] });
    }
    // Add unphased bucket
    phaseMap.set('__none__', { phase: null, sections: [] });

    for (const sec of _qtCSections) {
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
            const t = _qtCAllTypes.find(x => x.key === sec.key);
            const icon = t ? t.icon : 'ðŸ“‹';
            const color = t ? t.color : '#6b7280';
            const label = t ? t.label : sec.label || sec.key;
            // For grouped sections, use the group label (e.g. "TÆ° Váº¥n KhÃ¡ch" instead of "Gá»i Äiá»‡n")
            const isGroup = !!sec.section_group;
            const groupKeys = isGroup ? _qtCGetGroupKeys(sec.section_group) : [];
            const multiCount = isGroup ? groupKeys.length : 0;
            const displayName = (isGroup && sec.section_group_label) ? sec.section_group_label : label;

            nodesHtml += `
                <div class="qt-fc-node" onclick="_qtCScrollToRule('${sec.key}')" title="${displayName}${isGroup ? ' (nhÃ³m ' + multiCount + ' nÃºt: ' + groupKeys.map(k => { const gt = _qtCAllTypes.find(x => x.key === k); return gt ? gt.label : k; }).join(', ') + ')' : ''}">
                    <div class="qt-fc-circle" style="border-color:${color}40;background:${color}15;">${icon}</div>
                    <div class="qt-fc-name">${displayName}${multiCount > 1 ? ' Ã—' + multiCount : ''}</div>
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
        const branchLabel = row.phase ? `â†“ ${row.phase.icon || ''} ${row.phase.title}` : 'â†“ KhÃ¡c';
        branchesHtml += `
            <div class="qt-fc-branch">
                <div class="qt-fc-branch-label">${branchLabel}</div>
                <div class="qt-fc-row">${renderNodeRow(row.sections)}</div>
            </div>
        `;
    }

    const mainTitle = mainRow.phase ? `${mainRow.phase.icon || 'â€”'} ${mainRow.phase.title} â€” Customer Journey` : 'â€” Luá»“ng TÆ° Váº¥n KhÃ¡ch HÃ ng â€” Customer Journey';

    return `
        <div class="qt-flowchart">
            <div class="qt-flowchart-title">${mainTitle}</div>
            <div class="qt-fc-row">${mainNodesHtml}</div>
            ${branchesHtml}
        </div>
    `;
}

function _qtCScrollToRule(key) {
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
function _qtCShowEditRulesModal(fromStatus) {
    const rules = _qtCAllRules[fromStatus] || [];
    const statusLabel = KOCKOL_FLOW_STATUS_LABELS[fromStatus] || _qtCGetTypeLabel(fromStatus) || fromStatus;

    // â˜… Show ALL active types as eligible targets
    const eligibleTypes = _qtCAllTypes.filter(t => {
        return t.is_active || rules.some(r => r.to_type_key === t.key);
    });

    // â˜… Sort: checked items first (by sort_order), then unchecked (by label)
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
    const unsectionedKeys = new Set(_qtCUnsectioned.map(u => u.key));

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
                    onclick="showToast('âš ï¸ HÃ£y táº¡o loáº¡i cho nÃºt Â«${t.label}Â» trÆ°á»›c táº¡i âž• ThÃªm nhÃ³m quy táº¯c má»›i!', 'error')"
                    title="NÃºt nÃ y chÆ°a cÃ³ loáº¡i â€” khÃ´ng thá»ƒ chá»n lÃ m quy táº¯c sau">
                    <span class="qt-ri-stt" style="min-width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0;background:#e2e8f0;color:#94a3b8;">ðŸ”’</span>
                    <span class="qt-ri-drag" style="opacity:0.3;pointer-events:none;">â ¿</span>
                    <input type="checkbox" class="qt-ri-check" disabled style="pointer-events:none;">
                    <div class="qt-ri-info">
                        <span class="qt-ri-icon">${t.icon}</span>
                        <span class="qt-ri-label" style="text-decoration:line-through;color:#94a3b8;">${t.label}</span>
                        <span style="font-size:9px;color:#ef4444;font-weight:600;margin-left:4px;">ChÆ°a cÃ³ loáº¡i</span>
                    </div>
                </div>
            `;
        } else {
            listHTML += `
                <div class="qt-rule-item ${checked ? 'qt-ri-active' : 'qt-ri-inactive'}" data-key="${t.key}" data-checked="${checked ? '1' : '0'}">
                    <span class="qt-ri-stt" style="min-width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0;${checked ? 'background:#3b82f6;color:white;' : 'background:#e2e8f0;color:#94a3b8;'}">${checked ? sttCount : '-'}</span>
                    <span class="qt-ri-drag" style="${checked ? '' : 'opacity:0.3;pointer-events:none;'}">${'â ¿'}</span>
                    <input type="checkbox" class="qt-ri-check" ${checked ? 'checked' : ''}>
                    <div class="qt-ri-info">
                        <span class="qt-ri-icon">${t.icon}</span>
                        <span class="qt-ri-label">${t.label}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:4px;">
                        <span style="font-size:10px;color:#94a3b8;">Sau</span>
                        <input type="number" class="qt-ri-delay" value="${delay}" min="0" max="90" style="width:50px;text-align:center;padding:4px;font-size:12px;" data-format-number-skip>
                        <span style="font-size:10px;color:#94a3b8;">ngÃ y</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:4px;">
                        <input type="radio" name="qtDefault" class="qt-ri-default" ${isDef ? 'checked' : ''} value="${t.key}">
                        <span style="font-size:10px;color:#fbbf24;">â­</span>
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
            <h3>âš™ï¸ Quy táº¯c sau: ${statusLabel}</h3>
            <div style="margin-bottom:12px;padding:10px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
                <div class="qt-legend" style="margin:0;background:transparent;border:none;padding:0;">
                    <span class="qt-legend-item">â ¿ KÃ©o sáº¯p xáº¿p</span>
                    <span class="qt-legend-item">â˜‘ Báº­t/táº¯t nÃºt</span>
                    <span class="qt-legend-item">ðŸ“… Delay (0 = ngay)</span>
                    <span class="qt-legend-item">â­ Máº·c Ä‘á»‹nh</span>
                </div>
            </div>
            <div class="qt-rule-list" id="qtRuleList">${listHTML}</div>
            <div class="qt-actions">
                <button class="qt-btn qt-btn-secondary" onclick="this.closest('.qt-modal-overlay').remove()">Há»§y</button>
                <button class="qt-btn qt-btn-primary" onclick="_qtCSaveRules('${fromStatus}')">ðŸ’¾ LÆ°u quy táº¯c</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const ruleList = document.getElementById('qtRuleList');

    // â˜… Checkbox change â†’ re-sort (checked to top) + update STT
    ruleList.addEventListener('change', e => {
        if (e.target.classList.contains('qt-ri-check')) {
            _qtCResortRuleList();
        }
    });

    // â˜… Init SortableJS with STT update on drag end
    if (typeof Sortable !== 'undefined') {
        new Sortable(ruleList, {
            animation: 200,
            handle: '.qt-ri-drag',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            onEnd: () => _qtCUpdateRuleSTT()
        });
    }
}

// Re-sort rule list: checked items to top, unchecked to bottom, then update STT
function _qtCResortRuleList() {
    const list = document.getElementById('qtRuleList');
    if (!list) return;
    const items = Array.from(list.querySelectorAll('.qt-rule-item'));
    const checked = items.filter(el => el.querySelector('.qt-ri-check').checked);
    const unchecked = items.filter(el => !el.querySelector('.qt-ri-check').checked);

    // Re-append in order: checked first, then unchecked
    checked.forEach(el => list.appendChild(el));
    unchecked.forEach(el => list.appendChild(el));

    _qtCUpdateRuleSTT();
}

// Update STT badges + visual styling for all items in the rule list
function _qtCUpdateRuleSTT() {
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

async function _qtCSaveRules(fromStatus) {
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
    const sec = _qtCSections.find(s => s.key === fromStatus);
    const groupKeys = (sec && sec.section_group) ? _qtCGetGroupKeys(sec.section_group) : [fromStatus];
    for (const key of groupKeys) {
        await apiCall(`/api/consult-flow-rules/${key}`, 'PUT', { rules, crm_menu: 'ctv' });
    }

    document.querySelector('.qt-modal-overlay')?.remove();
    showToast('âœ… ÄÃ£ lÆ°u quy táº¯c!', 'success');
    await _qtCLoadData();
    _qtCSwitchTab('rules');
}

function _qtCShowAddRuleGroupModal() {
    // Show unsectioned types (exclude system keys that already have dedicated workflows)
    const SYSTEM_KEYS = ['cap_cuu_sep', 'huy'];
    const sectionKeys = new Set(_qtCSections.map(s => s.key));
    const available = _qtCAllTypes.filter(t => !sectionKeys.has(t.key) && t.is_active && !t.section_group && !SYSTEM_KEYS.includes(t.key));

    if (available.length === 0) {
        return showToast('âœ… Táº¥t cáº£ nÃºt Ä‘Ã£ cÃ³ nhÃ³m quy táº¯c!', 'success');
    }

    const nextOrder = _qtCSections.length > 0 ? Math.max(..._qtCSections.map(s => s.section_order)) + 1 : 1;

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
            <h3>âž• ThÃªm nhÃ³m quy táº¯c má»›i</h3>
            <p style="font-size:12px;color:#64748b;margin-bottom:12px;">Chá»n 1 nÃºt â†’ táº¡o loáº¡i riÃªng. Chá»n 2+ nÃºt â†’ gom thÃ nh 1 loáº¡i chung.</p>
            <div class="qt-rule-list" id="qtAddRuleList" style="max-height:300px;overflow-y:auto;">${listHTML}</div>
            <div id="qtGroupNameRow" style="margin-top:12px;display:none;padding:10px;background:#f0f9ff;border:2px solid #3b82f6;border-radius:10px;">
                <label style="font-size:13px;font-weight:600;color:#1e40af;">ðŸ”— TÃªn loáº¡i nhÃ³m:</label>
                <input type="text" id="qtGroupName" placeholder="VD: TÆ° Váº¥n Trá»±c Tiáº¿p" style="width:100%;padding:8px 12px;font-size:14px;font-weight:600;border:1px solid #93c5fd;border-radius:8px;margin-top:4px;">
            </div>
            <div style="margin-top:12px;">
                <label style="font-size:13px;font-weight:600;color:#334155;">Thuá»™c Pháº§n:</label>
                <select id="qtNewRulePhase" style="margin-top:4px;">
                    <option value="">(ChÆ°a phÃ¢n pháº§n)</option>
                    ${_qtCRulePhases.map(p => `<option value="${p.id}">${p.icon} PHáº¦N ${p.sort_order}: ${p.title}</option>`).join('')}
                </select>
            </div>
            <div style="margin-top:8px;">
                <label style="font-size:13px;font-weight:600;color:#334155;">Báº¯t Ä‘áº§u tá»« Loáº¡i sá»‘:</label>
                <input type="number" id="qtNewRuleOrder" value="${nextOrder}" min="1" style="width:80px;padding:6px 10px;font-size:14px;font-weight:700;border:2px solid #3b82f6;border-radius:8px;text-align:center;margin-left:8px;">
            </div>
            <div class="qt-actions">
                <button class="qt-btn qt-btn-secondary" onclick="this.closest('.qt-modal-overlay').remove()">Há»§y</button>
                <button class="qt-btn qt-btn-primary" onclick="_qtCAddRuleGroup()">âž• ThÃªm</button>
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

async function _qtCAddRuleGroup() {
    const items = document.querySelectorAll('#qtAddRuleList .qt-rule-item');
    const selected = [];
    items.forEach(item => {
        if (item.querySelector('.qt-ri-check').checked) selected.push(item.dataset.key);
    });
    if (selected.length === 0) return showToast('âŒ Chá»n Ã­t nháº¥t 1 nÃºt!', 'error');

    const isGroup = selected.length >= 2;
    const groupName = isGroup ? (document.getElementById('qtGroupName').value || '').trim() : '';
    if (isGroup && !groupName) return showToast('âŒ Nháº­p tÃªn loáº¡i nhÃ³m!', 'error');

    let startOrder = parseInt(document.getElementById('qtNewRuleOrder').value) || 1;
    const selectedPhase = document.getElementById('qtNewRulePhase').value || null;
    const groupId = isGroup ? `grp_${Date.now()}` : null;

    if (isGroup) {
        // GROUP MODE: first button = leader (has section_order), rest = members (section_order=0)
        const leaderKey = selected[0];

        // Create empty flow rules for ALL members (will be configured via Sá»­a)
        for (const key of selected) {
            await apiCall(`/api/consult-flow-rules/${key}`, 'PUT', {
                rules: [{ to_type_key: key, is_default: key === leaderKey, delay_days: 0, sort_order: selected.indexOf(key) + 1 }], crm_menu: 'ctv'
            });
            // Set group for all
            await apiCall(`/api/consult-types/${key}`, 'PATCH', {
                section_group: groupId,
                section_group_label: key === leaderKey ? groupName : null
            });
        }

        // Only leader gets section_order
        await apiCall(`/api/consult-types/${leaderKey}/section-order`, 'PATCH', { section_order: startOrder, crm_menu: 'ctv' });
        if (selectedPhase) await apiCall(`/api/consult-types/${leaderKey}/rule-phase`, 'PATCH', { rule_phase: selectedPhase, crm_menu: 'ctv' });

    } else {
        // SINGLE MODE: same as before
        const key = selected[0];
        await apiCall(`/api/consult-flow-rules/${key}`, 'PUT', {
            rules: [{ to_type_key: key, is_default: true, delay_days: 0, sort_order: 1 }], crm_menu: 'ctv'
        });
        await apiCall(`/api/consult-types/${key}/section-order`, 'PATCH', { section_order: startOrder, crm_menu: 'ctv' });
        if (selectedPhase) await apiCall(`/api/consult-types/${key}/rule-phase`, 'PATCH', { rule_phase: selectedPhase, crm_menu: 'ctv' });
    }

    document.querySelector('.qt-modal-overlay')?.remove();
    showToast(`âœ… ÄÃ£ thÃªm ${isGroup ? `nhÃ³m "${groupName}" (${selected.length} nÃºt)` : '1 loáº¡i'}!`, 'success');
    await apiCall('/api/consult-sections/reindex', 'POST', { crm_menu: 'ctv' });
    await _qtCLoadData();
    _qtCSwitchTab('rules');

    // Auto-open Sá»­a modal for the first/leader item
    setTimeout(() => _qtCShowEditRulesModal(selected[0]), 300);
}

// ========== HELPERS ==========
function _qtCGetTypeLabel(key) {
    const t = _qtCAllTypes.find(x => x.key === key);
    return t ? `${t.icon} ${t.label}` : key;
}

async function _qtCSaveSortOrder(orders) {
    try {
        await apiCall('/api/consult-types/batch/sort-order', 'PATCH', { orders });
        showToast('âœ… ÄÃ£ lÆ°u thá»© tá»±!', 'success');
    } catch(e) {
        showToast('âŒ Lá»—i lÆ°u thá»© tá»±!', 'error');
    }
}

