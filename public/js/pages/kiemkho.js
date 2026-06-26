var _kk = {
    view: 'setup', // 'setup', 'audit', 'report'
    session: null,
    active_cuts_count: 0,
    warehouses: [],
    shelves: [],
    rolls: [],
    tree: null,
    activeWarehouseId: null,
    activeLocation: null, // name of shelf or unassigned_nguyen / unassigned_le
    search: '',
    photoMode: 'none',
    selectedSessionId: null,
    selectedSessionData: null,
    historySessions: [],
    yearlySummary: null,
    currentYear: new Date().getFullYear(),
    container: null,
    collapsedGroups: new Set()
};

window._kkToggleGroup = function(groupKey) {
    if (_kk.collapsedGroups.has(groupKey)) {
        _kk.collapsedGroups.delete(groupKey);
    } else {
        _kk.collapsedGroups.add(groupKey);
    }
    _kkRenderActiveLocation();
};

function _kkGetContainer() {
    return _kk.container || document.getElementById('contentArea') || document.getElementById('mainContent') || document.querySelector('.kk-wrap')?.parentElement || document.querySelector('.kk-main')?.parentElement;
}

function renderKiemkhoPage(content) {
    _kk.container = content;
    // Inject Custom Styles for Premium Aesthetics
    if (!document.getElementById('_kkS')) {
        var st = document.createElement('style');
        st.id = '_kkS';
        st.textContent = `
            .kk-wrap { display: flex; height: calc(100vh - 60px); overflow: hidden; font-family: 'Inter', sans-serif; background: #f8fafc; }
            .kk-sb { width: 300px; min-width: 300px; background: #ffffff; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; height: 100%; }
            .kk-main { flex: 1; min-width: 0; display: flex; flex-direction: column; height: 100%; overflow-y: auto; padding: 24px; position: relative; }
            .kk-card { background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 20px; transition: all 0.2s; }
            .kk-card:hover { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
            
            /* Sidebar styles */
            .kk-sb-header { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; background: #fafafa; }
            .kk-sb-title { font-size: 15px; font-weight: 800; color: #0f766e; text-transform: uppercase; letter-spacing: 0.5px; }
            .kk-sb-body { flex: 1; overflow-y: auto; padding: 12px 16px; }
            .kk-sb-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; margin-bottom: 6px; border-radius: 8px; font-size: 13px; font-weight: 600; color: #475569; cursor: pointer; transition: all 0.15s; border: 1px solid transparent; }
            .kk-sb-item:hover { background: #f0fdfa; color: #0d9488; }
            .kk-sb-item.active { background: #ccfbf1; color: #0f766e; border-color: #99f6e4; font-weight: 700; }
            .kk-badge { background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 700; }
            .kk-sb-item.active .kk-badge { background: #0f766e; color: #ffffff; }

            /* Table actions */
            .kk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 16px; font-size: 13px; font-weight: 700; border-radius: 8px; border: none; cursor: pointer; transition: all 0.15s; }
            .kk-btn-primary { background: linear-gradient(135deg, #0d9488, #14b8a6); color: white; box-shadow: 0 4px 10px rgba(13,148,136,0.25); }
            .kk-btn-primary:hover { opacity: 0.95; transform: translateY(-1px); }
            .kk-btn-danger { background: #ef4444; color: white; }
            .kk-btn-danger:hover { opacity: 0.9; }
            .kk-btn-secondary { background: #e2e8f0; color: #334155; }
            .kk-btn-secondary:hover { background: #cbd5e1; }
            .kk-btn-disabled { background: #cbd5e1; color: #94a3b8; cursor: not-allowed; opacity: 0.7; }
            
            .kk-action-btn { width: 32px; height: 32px; border-radius: 6px; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; background: white; transition: all 0.15s; margin: 0 2px; }
            .kk-action-btn:hover { transform: scale(1.08); box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            .kk-action-btn.green { border-color: #86efac; color: #15803d; background: #f0fdf4; }
            .kk-action-btn.red { border-color: #fca5a5; color: #b91c1c; background: #fef2f2; }
            .kk-action-btn.blue { border-color: #93c5fd; color: #1d4ed8; background: #eff6ff; }
            
            /* Status badges */
            .kk-lock-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; background: #fee2e2; color: #b91c1c; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-left: 5px; }
            .kk-reserve-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; background: #fef3c7; color: #d97706; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-left: 5px; }
            .kk-diff-badge { font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 12px; display: inline-block; }
            .kk-diff-badge.ok { background: #d1fae5; color: #065f46; }
            .kk-diff-badge.missing { background: #fee2e2; color: #991b1b; }
            .kk-diff-badge.surplus { background: #dbeafe; color: #1e40af; }
            .kk-tr-surplus { background-color: #f3e8ff !important; color: #6b21a8 !important; }
            .kk-tr-surplus td { color: #6b21a8 !important; }
            
            /* Progress bar */
            .kk-progress-container { width: 100%; height: 16px; background: #e2e8f0; border-radius: 8px; overflow: hidden; margin: 12px 0; position: relative; }
            .kk-progress-bar { height: 100%; background: linear-gradient(135deg, #0d9488, #10b981); width: 0%; transition: width 0.3s ease; }
            .kk-progress-text { position: absolute; width: 100%; text-align: center; font-size: 11px; font-weight: 800; color: #1e293b; top: 0; line-height: 16px; }

            /* Grid display */
            .kk-grid-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
            .kk-info-box { padding: 16px; border-radius: 12px; color: white; display: flex; flex-direction: column; justify-content: center; }
            .kk-info-box.teal { background: linear-gradient(135deg, #0f766e, #0d9488); }
            .kk-info-box.emerald { background: linear-gradient(135deg, #047857, #059669); }
            .kk-info-box.orange { background: linear-gradient(135deg, #c2410c, #ea580c); }
            .kk-info-box.indigo { background: linear-gradient(135deg, #4338ca, #4f46e5); }
            
            /* Custom Modal styles */
            .kk-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
            .kk-modal { background: white; border-radius: 16px; max-width: 500px; width: 90%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); animation: kkModalShow 0.2s ease; overflow: hidden; }
            .kk-modal-header { padding: 18px 24px; border-bottom: 1px solid #f1f5f9; background: #fafafa; display: flex; justify-content: space-between; align-items: center; }
            .kk-modal-title { font-size: 16px; font-weight: 800; color: #1e293b; }
            .kk-modal-body { padding: 24px; max-height: 70vh; overflow-y: auto; }
            .kk-modal-footer { padding: 18px 24px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 12px; background: #fafafa; }
            @keyframes kkModalShow { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            
            /* Form elements */
            .kk-form-group { margin-bottom: 16px; }
            .kk-form-label { display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px; }
            .kk-form-input { width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; transition: border 0.15s; }
            .kk-form-input:focus { border-color: #0d9488; box-shadow: 0 0 0 2px rgba(13,148,136,0.1); }
            
            /* Report Table Styling */
            .kk-rep-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
            .kk-rep-table th { background: #fafafa; color: #475569; font-weight: 700; padding: 12px 16px; border-bottom: 2px solid #e2e8f0; text-align: left; }
            .kk-rep-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; }
            .kk-rep-tab-btn { padding: 8px 16px; font-weight: 700; font-size: 13px; border-bottom: 3px solid transparent; cursor: pointer; transition: all 0.15s; color: #64748b; }
            .kk-rep-tab-btn.active { color: #0d9488; border-bottom-color: #0d9488; }
        `;
        document.head.appendChild(st);
    }
    
    // Inject File Upload Target (safety reset)
    var oldInp = document.getElementById('kkRollPhotoUploader');
    if (oldInp) oldInp.remove();
    var fileUploaderInput = document.createElement('input');
    fileUploaderInput.type = 'file';
    fileUploaderInput.id = 'kkRollPhotoUploader';
    fileUploaderInput.accept = 'image/*';
    fileUploaderInput.capture = 'environment';
    fileUploaderInput.style.display = 'none';
    document.body.appendChild(fileUploaderInput);
    
    // Init state
    _kkLoadSessionStatus(content);
}

// ========== LOAD STATUS ==========
async function _kkLoadSessionStatus(content) {
    try {
        const res = await apiCall('/api/stockcheck/session-status');
        _kk.session = res.session;
        _kk.active_cuts_count = res.active_cuts_count;
        
        // Fetch Photo modes
        const sRes = await apiCall('/api/stockcheck/settings');
        _kk.photoMode = sRes.photo_mode || 'none';

        if (res.active) {
            _kk.view = 'audit';
            // Default active warehouse to first warehouse in tree
            const treeRes = await apiCall('/api/stockcheck/tree');
            _kk.tree = treeRes;
            _kk.activeWarehouseId = 'all';
            await _kkLoadShelves();
        } else {
            _kk.view = 'setup';
            await _kkLoadHistoryAndSummary();
        }
        
        _kkRenderMain(content);
    } catch (e) {
        console.error('[KK status]', e);
        content.innerHTML = `<div class="p-4 text-center text-danger">Lỗi tải dữ liệu kiểm kho: ${e.message}</div>`;
    }
}

// ========== LOAD HISTORY & YEAR SUMMARY ==========
async function _kkLoadHistoryAndSummary() {
    try {
        const hRes = await apiCall('/api/stockcheck/sessions');
        _kk.historySessions = hRes.sessions || [];
        
        const yRes = await apiCall('/api/stockcheck/yearly-summary?year=' + _kk.currentYear);
        _kk.yearlySummary = yRes.stats || [];
    } catch (e) {
        console.error('[KK hist/summary]', e);
    }
}

// ========== LOAD SHELVES ==========
async function _kkLoadShelves() {
    if (!_kk.activeWarehouseId) return;
    try {
        const query = '/api/stockcheck/shelves?warehouse_id=' + _kk.activeWarehouseId + (_kk.search ? '&search=' + encodeURIComponent(_kk.search) : '');
        const res = await apiCall(query);
        const shelves = res.shelves || [];
        shelves.sort((a, b) => {
            const nameA = (a.name || '').trim().toLowerCase();
            const nameB = (b.name || '').trim().toLowerCase();
            
            const isUnassignedA = nameA.includes('chưa xếp kệ');
            const isUnassignedB = nameB.includes('chưa xếp kệ');
            const isReturnA = nameA === 'kệ dự định hoàn vải';
            const isReturnB = nameB === 'kệ dự định hoàn vải';
            const isThienLinhA = nameA === 'kệ 3d thiện linh';
            const isThienLinhB = nameB === 'kệ 3d thiện linh';

            if (isUnassignedA && !isUnassignedB) return 1;
            if (!isUnassignedA && isUnassignedB) return -1;
            if (isUnassignedA && isUnassignedB) {
                return nameA.includes('nguyên') ? -1 : 1;
            }

            if (isReturnA && !isReturnB) return 1;
            if (!isReturnA && isReturnB) return -1;

            if (isThienLinhA && !isThienLinhB) {
                return isReturnB ? -1 : 1;
            }
            if (!isThienLinhA && isThienLinhB) {
                return isReturnA ? 1 : -1;
            }
            return 0;
        });
        _kk.shelves = shelves;
        if (_kk.shelves.length > 0) {
            if (!_kk.activeLocation) {
                _kk.activeLocation = _kk.shelves[0].name;
            } else if (_kk.search) {
                const activeShelf = _kk.shelves.find(s => s.name === _kk.activeLocation);
                if (!activeShelf || activeShelf.roll_count === 0) {
                    const firstMatch = _kk.shelves.find(s => s.roll_count > 0);
                    if (firstMatch) {
                        _kk.activeLocation = firstMatch.name;
                    }
                }
            }
        }
        await _kkLoadRolls();
    } catch (e) {
        console.error('[KK shelves]', e);
    }
}

// ========== LOAD ROLLS IN ACTIVE LOCATION ==========
async function _kkLoadRolls() {
    if (!_kk.activeWarehouseId || !_kk.activeLocation) return;
    try {
        const res = await apiCall('/api/stockcheck/rolls?warehouse_id=' + _kk.activeWarehouseId + '&location=' + encodeURIComponent(_kk.activeLocation) + (_kk.search ? '&search=' + encodeURIComponent(_kk.search) : ''));
        _kk.rolls = res.rolls || [];
    } catch (e) {
        console.error('[KK rolls]', e);
    }
}

// ========== MAIN SPA RENDERING ==========
function _kkRenderMain(content) {
    if (_kk.view === 'setup') {
        _kkRenderSetup(content);
    } else if (_kk.view === 'audit') {
        _kkRenderAudit(content);
    } else if (_kk.view === 'report') {
        _kkRenderReport(content);
    }
}

// ========== SETUP / PRE-AUDIT VIEW ==========
function _kkRenderSetup(content) {
    const isGiamDoc = (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc');
    let histHtml = '';
    if (_kk.historySessions.length === 0) {
        histHtml = `<tr><td colspan="5" class="text-center text-muted py-4">Chưa có lịch sử đợt kiểm kho nào hoàn thành.</td></tr>`;
    } else {
        _kk.historySessions.forEach((s, idx) => {
            const finishedDate = s.finished_at ? s.finished_at.split('T')[0] : '—';
            histHtml += `
                <tr style="cursor:pointer" onclick="_kkViewReport(${s.id})">
                    <td class="text-center font-weight-bold">${idx + 1}</td>
                    <td>${finishedDate}</td>
                    <td>${s.finished_by_name || 'Hệ thống'}</td>
                    <td class="text-center text-primary font-weight-bold">${s.checked_rolls} cây</td>
                    <td class="text-right text-danger font-weight-bold">${s.net_difference ? Number(s.net_difference).toLocaleString('vi-VN') + ' kg' : '0 kg'}</td>
                </tr>
            `;
        });
    }

    let summaryHtml = '';
    if (_kk.yearlySummary) {
        _kk.yearlySummary.forEach(m => {
            if (m.audit_count > 0) {
                summaryHtml += `
                    <tr>
                        <td class="font-weight-bold text-center">Tháng ${m.month}</td>
                        <td class="text-center font-weight-bold text-teal">${m.audit_count} đợt</td>
                        <td class="text-center text-danger font-weight-bold">${m.missing_rolls} cây (${Number(m.missing_weight).toLocaleString('vi-VN')} kg)</td>
                        <td class="text-center text-primary font-weight-bold">${m.surplus_rolls} cây (${Number(m.surplus_weight).toLocaleString('vi-VN')} kg)</td>
                        <td class="text-right font-weight-bold ${m.net_difference > 0 ? 'text-danger' : m.net_difference < 0 ? 'text-primary' : 'text-success'}">
                            ${m.net_difference > 0 ? '-' + Number(m.net_difference).toLocaleString('vi-VN') : m.net_difference < 0 ? '+' + Number(Math.abs(m.net_difference)).toLocaleString('vi-VN') : '0'} kg
                        </td>
                    </tr>
                `;
            }
        });
        if (!summaryHtml) {
            summaryHtml = `<tr><td colspan="5" class="text-center text-muted py-4">Chưa có dữ liệu chênh lệch nào trong năm ${_kk.currentYear}.</td></tr>`;
        }
    }

    content.innerHTML = `
        <div class="container-fluid" style="padding: 24px; max-width: 1200px; margin: 0 auto;">
            <!-- Welcome Header -->
            <div class="kk-card" style="background: linear-gradient(135deg, #0d9488, #14b8a6); color: white; padding: 30px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
                    <div>
                        <h2 style="font-weight:900; margin:0; font-size:24px; letter-spacing:-0.5px;">Quản Lý Kiểm Kho Vải</h2>
                        <p style="margin:6px 0 0 0; opacity:0.9; font-size:13px;">Thực hiện kiểm kê, khóa kho đồng bộ, kiểm soát hao hụt cây vải và xem báo cáo lịch sử chênh lệch.</p>
                    </div>
                    <div style="background:rgba(255,255,255,0.15); padding:10px 20px; border-radius:12px; text-align:center;">
                        <span style="font-size:11px; text-transform:uppercase; font-weight:800; opacity:0.8; display:block; margin-bottom:2px;">Trạng Thái Cắt Dở</span>
                        <span style="font-weight:900; font-size:16px;">${_kk.active_cuts_count > 0 ? '⚠️ Có ' + _kk.active_cuts_count + ' cây đang cắt' : '✅ Sẵn sàng'}</span>
                    </div>
                </div>
            </div>

            <div class="row">
                <!-- Session Start Panel -->
                <div class="col-md-5">
                    <div class="kk-card" style="padding: 24px;">
                        <h4 style="font-weight:800; color:#1e293b; margin-bottom:18px; display:flex; align-items:center; gap:8px;">
                            <span>⚙️</span> Cấu Hình Đợt Kiểm Mới
                        </h4>
                        
                        <div class="kk-form-group">
                            <label class="kk-form-label">Yêu Cầu Chụp Ảnh Minh Chứng (Camera) ${!isGiamDoc ? '<span style="color:#ef4444; font-size:11px; font-weight:normal; margin-left:6px;">(Chỉ Giám Đốc mới có quyền thay đổi)</span>' : ''}</label>
                            <select id="kkSettingPhotoMode" class="kk-form-input" style="height:40px; font-weight:600;" ${!isGiamDoc ? 'disabled' : ''}>
                                <option value="none" ${_kk.photoMode === 'none' ? 'selected' : ''}>Không yêu cầu chụp ảnh</option>
                                <option value="all" ${_kk.photoMode === 'all' ? 'selected' : ''}>Yêu cầu chụp ảnh toàn bộ cây vải</option>
                                <option value="missing_only" ${_kk.photoMode === 'missing_only' ? 'selected' : ''}>Chỉ chụp khi cây chưa có ảnh</option>
                            </select>
                            <small class="text-muted" style="font-size:11px; margin-top:4px; display:block;">Cưỡng chế nhân viên mở camera chụp ảnh/tải lên ảnh cây vải khi quét hoặc xác nhận.</small>
                        </div>

                        <!-- Info details -->
                        <div style="background:#f8fafc; border-radius:8px; padding:14px; border:1px dashed #cbd5e1; margin-bottom:20px; font-size:12px; color:#475569; line-height:1.5;">
                            <strong>🔒 Cơ chế Khóa Kho Đồng Bộ:</strong> Khi bắt đầu kiểm kê, hệ thống sẽ tự động khóa toàn bộ các thao tác chỉnh sửa, nhập mới, di chuyển và cắt vải. Chỉ Quản lý/GĐ mới có quyền mở khóa.
                        </div>

                        <button class="kk-btn kk-btn-primary" style="width:100%; height:45px; font-size:14px; text-transform:uppercase; letter-spacing:0.5px;" onclick="_kkStartSession()">
                            🚀 Bắt Đầu Đợt Kiểm Kê Mới
                        </button>
                    </div>
                </div>

                <!-- History Logs -->
                <div class="col-md-7">
                    <div class="kk-card" style="padding: 24px; min-height:300px;">
                        <h4 style="font-weight:800; color:#1e293b; margin-bottom:18px; display:flex; align-items:center; gap:8px;">
                            <span>📊</span> Lịch Sử Các Đợt Kiểm Kho
                        </h4>
                        <div style="overflow-x:auto;">
                            <table class="table table-hover table-striped" style="font-size:12px;">
                                <thead>
                                    <tr style="background:#f1f5f9; color:#475569;">
                                        <th style="width:50px;" class="text-center">STT</th>
                                        <th>Ngày Hoàn Thành</th>
                                        <th>Người Kiểm</th>
                                        <th class="text-center">Đã Kiểm</th>
                                        <th class="text-right">Hao Hụt / Chênh Lệch</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${histHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Yearly Summary -->
            <div class="kk-card" style="padding:24px; margin-top:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
                    <h4 style="font-weight:800; color:#1e293b; margin:0; display:flex; align-items:center; gap:8px;">
                        <span>📅</span> Báo Cáo Chênh Lệch Năm ${_kk.currentYear}
                    </h4>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:12px; font-weight:700; color:#475569;">Chọn năm:</span>
                        <select class="kk-form-input" style="width:100px; height:34px; padding:2px 8px;" onchange="_kkChangeYear(this.value)">
                            ${[2024, 2025, 2026, 2027, 2028].map(y => `<option value="${y}" ${y === _kk.currentYear ? 'selected' : ''}>${y}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div style="overflow-x:auto;">
                    <table class="table table-hover" style="font-size:12px;">
                        <thead>
                            <tr style="background:#f1f5f9; color:#475569;">
                                <th style="width:120px;" class="text-center">Tháng</th>
                                <th class="text-center">Số Đợt Kiểm</th>
                                <th class="text-center text-danger">Hao Hụt (Mất)</th>
                                <th class="text-center text-primary">Phát Hiện (Thừa)</th>
                                <th class="text-right">Tổng Lệch (Hao Hụt Ròng)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${summaryHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// ========== CHANGE SUMMARY YEAR ==========
async function _kkChangeYear(year) {
    _kk.currentYear = Number(year);
    const content = _kkGetContainer();
    if (content) {
        await _kkLoadHistoryAndSummary();
        _kkRenderMain(content);
    }
}

// ========== START SESSION AND CHECK LOCKS ==========
async function _kkStartSession() {
    const isGiamDoc = (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc');
    try {
        if (isGiamDoc) {
            const photoMode = document.getElementById('kkSettingPhotoMode').value;
            // Save settings first
            await apiCall('/api/stockcheck/settings', 'PUT', { photo_mode: photoMode });
        }
        
        // Attempt starting audit
        const res = await apiCall('/api/stockcheck/start-session', 'POST');
        if (res && res.error) {
            if (res.active_cuts) {
                _kkShowBlockedCutsModal(res.active_cuts);
            } else {
                showToast(res.error, 'error');
            }
            return;
        }
        
        showToast('✅ Đã bắt đầu kiểm kho! Kho vải đã bị khóa.', 'success');
        
        // Reload page to enter audit view
        const content = _kkGetContainer();
        if (content) {
            _kkLoadSessionStatus(content);
        }
    } catch (e) {
        // Handle blocked cuts (409 Conflict)
        if (e.status === 409 && e.data && e.data.active_cuts) {
            _kkShowBlockedCutsModal(e.data.active_cuts);
        } else {
            showToast(e.message || 'Không thể bắt đầu kiểm kê.', 'error');
        }
    }
}

// ========== SHOW MODAL FOR BLOCKED CUTTING RECORDS ==========
function _kkShowBlockedCutsModal(cuts) {
    let rowsHtml = '';
    cuts.forEach((c, idx) => {
        rowsHtml += `
            <tr>
                <td class="text-center font-weight-bold">${idx + 1}</td>
                <td><span class="badge badge-danger" style="font-size:11px;">${c.order_code || '—'}</span></td>
                <td class="font-weight-bold">${c.material_name || '—'}</td>
                <td><span class="badge badge-secondary" style="font-size:11px; background-color:#f1f5f9; color:#334155; border: 1px solid #e2e8f0;">${c.color_name || '—'}</span></td>
                <td class="font-weight-bold text-teal">${c.weight ? c.weight + ' kg' : '—'}</td>
                <td><span class="badge badge-secondary" style="font-size:11px;">Kệ: ${c.location || 'Chưa xếp'}</span></td>
            </tr>
        `;
    });

    const modalHtml = `
        <div class="kk-modal-overlay" id="kkBlockedCutsModal">
            <div class="kk-modal" style="max-width:680px;">
                <div class="kk-modal-header" style="background:#fef2f2; border-bottom:1px solid #fee2e2;">
                    <div class="kk-modal-title" style="color:#b91c1c; display:flex; align-items:center; gap:8px;">
                        <span>🚫 KHÔNG THỂ BẮT ĐẦU KIỂM KHO</span>
                    </div>
                    <button class="close" onclick="_kkCloseModal('kkBlockedCutsModal')" style="font-size:24px; border:none; background:none;">&times;</button>
                </div>
                <div class="kk-modal-body">
                    <p style="font-size:13px; color:#475569; margin-bottom:16px; line-height:1.5;">
                        Hiện tại xưởng cắt đang <strong>sử dụng dở dang</strong> các cây vải sau. Vui lòng liên hệ bộ phận cắt hoàn thành cắt hoặc hoàn vải trước khi bắt đầu đợt kiểm kê mới:
                    </p>
                    <div style="max-height:250px; overflow-y:auto; border:1px solid #f1f5f9; border-radius:8px;">
                        <table class="table" style="font-size:11px; margin:0;">
                            <thead>
                                <tr style="background:#fafafa;">
                                    <th style="width:40px;" class="text-center">STT</th>
                                    <th>Mã Đơn Hàng</th>
                                    <th>Chất Liệu</th>
                                    <th>Màu Sắc</th>
                                    <th>Cân Nặng</th>
                                    <th>Kệ / Vị Trí</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="kk-modal-footer">
                    <button class="kk-btn kk-btn-secondary" onclick="_kkCloseModal('kkBlockedCutsModal')">Đóng</button>
                </div>
            </div>
        </div>
    `;
    
    // Append to body
    const div = document.createElement('div');
    div.id = 'kkBlockedCutsModalContainer';
    div.innerHTML = modalHtml;
    document.body.appendChild(div);
}

function _kkCloseModal(id) {
    const el = document.getElementById(id + 'Container') || document.getElementById(id);
    if (el) el.remove();
}

// ========== AUDITING WORKFLOW VIEW ==========
async function _kkRenderAudit(content) {
    if (!_kk.tree) {
        _kk.tree = await apiCall('/api/stockcheck/tree');
    }
    const isGiamDoc = (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc');
    const cleanActiveLoc = (_kk.activeLocation || '').replace(/^📍\s*/, '').trim().toLowerCase();
    const isSurplusBlocked = ['kệ dự định hoàn vải', 'chưa xếp kệ - cây nguyên', 'chưa xếp kệ - cây lẻ', 'kệ 3d thiện linh'].includes(cleanActiveLoc);
    
    // Progress calculation
    const totalRolls = _kk.session.total_rolls || 0;
    const checkedCount = _kk.tree.checked_count || 0;
    const progressPct = totalRolls > 0 ? Math.min(100, Math.round((checkedCount / totalRolls) * 100)) : 0;
    
    // Warehouse selection options
    let whOptions = `<option value="all" ${_kk.activeWarehouseId === 'all' ? 'selected' : ''}>🏭 TẤT CẢ KHO</option>`;
    if (_kk.tree && _kk.tree.tree) {
        _kk.tree.tree.forEach(w => {
            whOptions += `<option value="${w.id}" ${w.id === _kk.activeWarehouseId ? 'selected' : ''}>🏭 ${w.name}</option>`;
        });
    }

    // Shelf selector sidebar
    let shelfItemsHtml = '';
    _kk.shelves.forEach(s => {
        const isActive = s.name === _kk.activeLocation;
        const materialsText = s.materials_list ? s.materials_list : 'Chưa có vải';
        const isDimmed = _kk.search && s.roll_count === 0;
        shelfItemsHtml += `
            <div class="kk-sb-item ${isActive ? 'active' : ''}" onclick="_kkSelectShelf('${s.name}')" style="display:flex; flex-direction:column; align-items:stretch; padding:10px 12px; gap:4px; opacity:${isDimmed ? 0.4 : 1.0}; transition:opacity 0.2s;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:700;">
                        📍 ${s.name}
                        ${s.shelf_position ? `<span style="font-size:9px; font-weight:800; color:#b45309; background:#fef3c7; border:1px solid #fde68a; padding:1px 5px; border-radius:4px; margin-left:4px;">📍 ${s.shelf_position}</span>` : ''}
                    </span>
                    <span class="kk-badge">${s.roll_count} cây</span>
                </div>
                <div style="font-size:10px; color:${isActive ? '#0d9488' : '#64748b'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:left;" title="${materialsText}">
                    ${materialsText}
                </div>
            </div>
        `;
    });

    // Render Expected Rolls table with Grouping by Material + Color
    let tableRows = '';
    if (_kk.rolls.length === 0) {
        tableRows = `
            <tr>
                <td colspan="9" class="text-center text-muted py-5" style="font-size:13px;">
                    Chưa có cây vải nào được xếp ở kệ này. 
                    ${isSurplusBlocked ? '' : `
                    <br>
                    <button class="kk-btn kk-btn-primary mt-3" style="padding:6px 12px; font-size:12px;" onclick="_kkOpenAddSurplusModal()">
                        ➕ Thêm Cây Thừa Tại Đây
                    </button>
                    `}
                </td>
            </tr>
        `;
    } else {
        // Group rolls by material_name + color_name
        const groups = {};
        const groupOrder = [];
        
        _kk.rolls.forEach(r => {
            const key = `${r.material_name}_${r.color_name}`;
            if (!groups[key]) {
                groups[key] = {
                    material_name: r.material_name,
                    color_name: r.color_name,
                    original_weight: 0,
                    system_weight: 0,
                    actual_weight: 0,
                    difference: 0,
                    rolls: [],
                    checkedCount: 0
                };
                groupOrder.push(key);
            }
            const g = groups[key];
            g.rolls.push(r);
            g.original_weight += Number(r.original_weight || 0);
            g.system_weight += Number(r.system_weight || 0);
            if (r.is_checked) {
                g.actual_weight += Number(r.actual_weight || 0);
                g.difference += Number(r.difference || 0);
                g.checkedCount++;
            }
        });

        let groupIdx = 1;
        groupOrder.forEach(key => {
            const g = groups[key];
            const isCollapsed = _kk.collapsedGroups.has(key);
            const chevron = isCollapsed ? '▶' : '▼';
            
            // Format sums
            const sumOrig = Number(g.original_weight.toFixed(2)).toLocaleString('vi-VN') + ' kg';
            const sumSys = Number(g.system_weight.toFixed(2)).toLocaleString('vi-VN') + ' kg';
            const sumAct = g.checkedCount > 0 
                ? Number(g.actual_weight.toFixed(2)).toLocaleString('vi-VN') + ' kg'
                : '<span style="color:#94a3b8; font-weight:normal;">—</span>';
                
            // Calculate group difference based on checked rolls
            let groupDiffLabel = '—';
            if (g.checkedCount > 0) {
                const checkedSysW = g.rolls.filter(r => r.is_checked).reduce((sum, r) => sum + Number(r.system_weight || 0), 0);
                const diffVal = Number((checkedSysW - g.actual_weight).toFixed(2));
                if (diffVal === 0) {
                    groupDiffLabel = `<span class="kk-diff-badge ok">Khớp</span>`;
                } else {
                    groupDiffLabel = `<span class="kk-diff-badge ${diffVal > 0 ? 'missing' : 'surplus'}">
                        ${diffVal > 0 ? 'Thiếu ' + diffVal.toLocaleString('vi-VN') : 'Thừa ' + Math.abs(diffVal).toLocaleString('vi-VN')} kg
                    </span>`;
                }
            }

            // Render Group Header Row
            tableRows += `
                <tr style="background-color: #f1f5f9; cursor: pointer; font-weight: bold; border-left: 4px solid #0f766e;" onclick="_kkToggleGroup('${key}')">
                    <td class="text-center" style="font-size: 14px; color: #0f766e;">${chevron}</td>
                    <td style="color: #0f766e; font-weight: 800; font-size: 13px;">${g.material_name}</td>
                    <td style="color: #0f766e; font-weight: 800; font-size: 13px;">${g.color_name}</td>
                    <td class="text-center" style="color: #0f766e;">${sumOrig}</td>
                    <td class="text-center" style="color: #0d9488;">${sumSys}</td>
                    <td class="text-center" style="color: #10b981;">${sumAct}</td>
                    <td class="text-center">${groupDiffLabel}</td>
                    <td colspan="2" style="font-size: 11px; color: #475569; font-weight: 600; text-align: left; padding-left: 15px;">
                        📦 ${g.rolls.length} cây (${g.checkedCount} đã kiểm)
                    </td>
                </tr>
            `;
            
            // Render sub-rows if not collapsed
            if (!isCollapsed) {
                g.rolls.forEach((r, subIdx) => {
                    const hasChecked = r.is_checked;
                    const isSurplus = r.source === 'kiem_kho_du';
                    const rowClass = isSurplus ? 'kk-tr-surplus' : (hasChecked ? 'table-success' : '');
                    
                    // Badges for locks and reservations
                    let badges = '';
                    if (r.locked_by_cutting_id) {
                        badges += `<span class="kk-lock-badge" title="Cây đang bị khóa bởi phiếu cắt ở xưởng">🔒 ${r.locked_order_code || 'CẮT'}</span>`;
                    }
                    if (r.reserved_order_code) {
                        badges += `<span class="kk-reserve-badge" title="Cây vải đã đặt trước cho đơn hàng">🔖 ${r.reserved_order_code}</span>`;
                    }

                    // Photo preview/thumbnail
                    let photoBtn = '';
                    if (r.roll_img) {
                        photoBtn = `<img src="${r.roll_img}" style="width:36px; height:36px; object-fit:cover; border-radius:4px; border:1px solid #cbd5e1; cursor:pointer;" onclick="event.stopPropagation(); viewImage('${r.roll_img}')" title="Xem ảnh gốc">`;
                    } else {
                        photoBtn = `<button class="kk-action-btn" onclick="event.stopPropagation(); _kkTriggerPhotoUpload(${r.roll_id})" title="Chụp ảnh cây vải">📷</button>`;
                    }

                    // Difference display
                    let diffLabel = '—';
                    if (isSurplus) {
                        diffLabel = `<span class="kk-diff-badge ok" style="background:#f3e8ff; color:#6b21a8; border:1px solid #c084fc;">💜 Cây thừa</span>`;
                    } else if (hasChecked) {
                        if (r.actual_weight === 0) {
                            diffLabel = `<span class="kk-diff-badge missing">❌ Báo mất</span>`;
                        } else if (Number(r.difference) === 0) {
                            diffLabel = `<span class="kk-diff-badge ok">Khớp</span>`;
                        } else {
                            const diffVal = Number(r.difference);
                            diffLabel = `<span class="kk-diff-badge ${diffVal > 0 ? 'missing' : 'surplus'}">
                                ${diffVal > 0 ? 'Thiếu ' + diffVal : 'Thừa ' + Math.abs(diffVal)} kg
                            </span>`;
                        }
                    }

                    let actionHtml = '';
                    if (isSurplus) {
                        actionHtml = `
                            <button class="kk-action-btn" style="background: rgba(139, 92, 246, 0.15); border: 1px solid #8b5cf6; color: #8b5cf6; padding: 4px 8px; border-radius: 6px; font-weight: bold; width: auto; height: 32px; display: inline-flex; align-items: center; gap: 4px; font-size: 11px;" onclick="event.stopPropagation(); _kkViewSurplusDetail(${r.roll_id})" title="Xem chi tiết cây vải thừa">
                                💜 Xem chi tiết
                            </button>
                        `;
                    } else {
                        actionHtml = `
                            <button class="kk-action-btn blue" onclick="event.stopPropagation(); _kkInputWeightPrompt(${r.roll_id}, ${r.system_weight}, '${r.roll_img}')" title="📝 Nhập thực tế">📝</button>
                            ${photoBtn}
                            <button class="kk-action-btn red" onclick="event.stopPropagation(); _kkMarkMissing(${r.roll_id}, '${r.roll_code}')" title="❌ Báo mất">❌</button>
                        `;
                    }

                    tableRows += `
                        <tr class="${rowClass}" style="background-color: #ffffff;">
                            <td class="text-center text-muted" style="padding-left: 20px; font-size: 11px;">${groupIdx}.${subIdx + 1}</td>
                            <td style="padding-left: 20px;">
                                <div style="font-weight: 700; color: #0d9488; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                                    └─ <span style="font-family: monospace;">${r.roll_code}</span>
                                </div>
                            </td>
                            <td>
                                <div style="margin-top:2px; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                                    <span style="font-weight:600; color:#334155;">${r.color_name}</span>
                                    ${Number(r.system_weight) === Number(r.original_weight)
                                        ? `<span style="background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; padding:1px 5px; border-radius:4px; font-size:9px; font-weight:700;">🌲 Cây Nguyên</span>`
                                        : `<span style="background:#fff7ed; color:#ea580c; border:1px solid #ffedd5; padding:1px 5px; border-radius:4px; font-size:9px; font-weight:700;">✂️ Cây Lẻ</span>`}
                                    ${badges}
                                </div>
                            </td>
                            <td class="text-center">${Number(r.original_weight || 0).toLocaleString('vi-VN')} kg</td>
                            <td class="text-center text-primary" style="font-size:12px;">${Number(r.system_weight || 0).toLocaleString('vi-VN')} kg</td>
                            <td class="text-center text-success" style="font-size:13px; font-weight: 700;">
                                ${hasChecked ? Number(r.actual_weight).toLocaleString('vi-VN') + ' kg' : '<span style="color:#94a3b8; font-weight:normal;">—</span>'}
                            </td>
                            <td class="text-center">${diffLabel}</td>
                            <td>
                                <span style="font-size:10px; color:#64748b; max-width:120px; display:inline-block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${r.sc_notes || ''}">
                                    ${r.sc_notes || '—'}
                                </span>
                            </td>
                            <td class="text-center">
                                <div style="display:flex; align-items:center; justify-content:center; gap:2px;">
                                    ${actionHtml}
                                </div>
                            </td>
                        </tr>
                    `;
                });
            }
            groupIdx++;
        });
    }

    content.innerHTML = `
        <div class="kk-wrap">
            <!-- Sidebar -->
            <div class="kk-sb">
                <div class="kk-sb-header">
                    <div class="kk-sb-title">Vị Trí Kệ Kiểm</div>
                    <div class="kk-form-group" style="margin-top:10px; margin-bottom:0;">
                        <select id="kkWhSelect" class="kk-form-input" style="height:36px; font-weight:700;" onchange="_kkChangeWarehouse(this.value)">
                            ${whOptions}
                        </select>
                    </div>
                </div>
                <div class="kk-sb-body" id="kkSbShelfList">
                    ${shelfItemsHtml}
                </div>
            </div>

            <!-- Main Panel -->
            <div class="kk-main">
                <!-- Status Banner -->
                <div style="background:#fef2f2; border:1px solid #fee2e2; border-radius:12px; padding:12px 20px; display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-shrink:0; flex-wrap:wrap; gap:16px;">
                    <div style="display:flex; align-items:center; gap:24px; flex-wrap:wrap;">
                        <div>
                            <span style="display:block; color:#991b1b; font-weight:900; font-size:13px; text-transform:uppercase; letter-spacing:0.5px;">⚠️ KHO VẢI ĐANG KHÓA ĐỒNG BỘ</span>
                            <span style="font-size:11px; color:#7f1d1d;">Bắt đầu lúc: ${_kk.session.started_at ? _kk.session.started_at.split('T')[0] + ' ' + _kk.session.started_at.split('T')[1].slice(0,5) : ''} bởi ${_kk.session.started_by_name}</span>
                        </div>
                        ${isGiamDoc ? `
                        <div style="display:flex; align-items:center; gap:8px; background:#fff; border:1px solid #fecaca; border-radius:8px; padding:4px 10px;">
                            <span style="font-size:11px; font-weight:800; color:#991b1b; white-space:nowrap;">📷 Yêu cầu chụp ảnh:</span>
                            <select class="kk-form-input" style="height:28px; font-size:11px; font-weight:600; width:170px; padding:2px 8px; margin:0;" onchange="_kkChangePhotoModeDuringAudit(this.value)">
                                <option value="none" ${_kk.photoMode === 'none' ? 'selected' : ''}>Không yêu cầu</option>
                                <option value="all" ${_kk.photoMode === 'all' ? 'selected' : ''}>Yêu cầu toàn bộ</option>
                                <option value="missing_only" ${_kk.photoMode === 'missing_only' ? 'selected' : ''}>Chỉ khi chưa có ảnh</option>
                            </select>
                        </div>
                        ` : `
                        <div style="font-size:11px; color:#991b1b; font-weight:800; background:#fee2e2; border-radius:8px; padding:4px 10px;">
                            📷 Chế độ chụp ảnh: ${_kk.photoMode === 'all' ? 'Yêu cầu toàn bộ cây' : _kk.photoMode === 'missing_only' ? 'Chỉ khi chưa có ảnh' : 'Không yêu cầu'}
                        </div>
                        `}
                    </div>
                    <div>
                        <button class="kk-btn kk-btn-danger" style="padding:6px 12px; font-size:12px;" onclick="_kkAbortSession()">
                            🚫 Hủy Đợt Kiểm
                        </button>
                    </div>
                </div>

                <!-- Global Progress -->
                <div class="kk-card" style="padding:16px 20px; margin-bottom:20px; flex-shrink:0;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:13px; font-weight:800; color:#1e293b;">📊 Tiến Độ Kiểm Toàn Kho Vải</span>
                        <span style="font-size:14px; font-weight:900; color:#0d9488;">${checkedCount} / ${totalRolls} cây (${progressPct}%)</span>
                    </div>
                    <div class="kk-progress-container">
                        <div class="kk-progress-bar" style="width: ${progressPct}%;"></div>
                        <div class="kk-progress-text">${progressPct}% ĐÃ KIỂM</div>
                    </div>
                </div>

                <!-- Shelf Content Panel -->
                <div class="kk-card" style="flex:1; display:flex; flex-direction:column; overflow:hidden; margin-bottom:0;">
                    <div style="padding:16px 20px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; flex-wrap:wrap; gap:10px;">
                        <div>
                            <h3 style="font-weight:900; color:#0f766e; margin:0; font-size:16px;">📍 Kệ: ${_kk.activeLocation}</h3>
                            <span style="font-size:11px; color:#64748b;">Tổng số trên kệ: ${_kk.rolls.length} cây</span>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <input id="kkSearchRoll" placeholder="🔍 Tìm mã cây, màu, chất liệu..." style="padding:6px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:12px; width:220px; outline:none;" value="${_kk.search}" oninput="_kkSearchRolls(this.value)">
                            ${isSurplusBlocked ? '' : `
                            <button class="kk-btn kk-btn-primary" style="padding:6px 12px; font-size:12px;" onclick="_kkOpenAddSurplusModal()">
                                ➕ Thêm Cây Thừa
                            </button>
                            `}
                            <button class="kk-btn ${progressPct === 100 ? 'kk-btn-primary' : 'kk-btn-disabled'}" style="padding:6px 16px; font-size:12px;" onclick="_kkFinishSession(${progressPct === 100})">
                                ✅ Chốt Sổ Kiểm Kho
                            </button>
                        </div>
                    </div>

                    <div style="flex:1; overflow-y:auto; padding:0;">
                        <table class="table table-hover table-striped" style="font-size:12px; margin:0; white-space:nowrap;">
                            <thead>
                                <tr style="background:#fafafa; color:#475569; position:sticky; top:0; z-index:1;">
                                    <th style="width:50px;" class="text-center">STT</th>
                                    <th>Chất Liệu</th>
                                    <th>Màu</th>
                                    <th class="text-center">Cân Gốc (Gốc)</th>
                                    <th class="text-center">Tồn Hệ Thống</th>
                                    <th class="text-center">Cân Thực Tế</th>
                                    <th class="text-center">Chênh Lệch</th>
                                    <th>Ghi Chú Kiểm</th>
                                    <th style="width:160px;" class="text-center">Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ========== SWITCH WAREHOUSE ==========
async function _kkChangeWarehouse(val) {
    _kk.activeWarehouseId = val === 'all' ? 'all' : Number(val);
    _kk.activeLocation = null;
    await _kkLoadShelves();
    const content = _kkGetContainer();
    if (content) {
        _kkRenderMain(content);
    }
}

// ========== SELECT SHELF ==========
async function _kkSelectShelf(shelfName) {
    _kk.activeLocation = shelfName;
    await _kkLoadRolls();
    const content = _kkGetContainer();
    if (content) {
        _kkRenderMain(content);
    }
}

// ========== SEARCH ROLLS ==========
var _kkSearchTimeout;
function _kkSearchRolls(val) {
    clearTimeout(_kkSearchTimeout);
    _kkSearchTimeout = setTimeout(async () => {
        _kk.search = val.trim();
        await _kkLoadShelves();
        const content = _kkGetContainer();
        if (content) {
            _kkRenderMain(content);
        }
    }, 300);
}

// ========== ABORT SESSION ==========
async function _kkAbortSession() {
    if (!confirm('Bạn có chắc chắn muốn HỦY đợt kiểm kê này? Mọi dữ liệu đã kiểm từ đầu phiên sẽ bị xóa hoàn toàn, kho vải sẽ được mở khóa.')) return;
    try {
        await apiCall('/api/stockcheck/abort-session', 'POST');
        showToast('✅ Đã hủy đợt kiểm kê. Kho vải đã mở khóa.', 'success');
        const content = _kkGetContainer();
        if (content) {
            _kkLoadSessionStatus(content);
        }
    } catch (e) {
        showToast(e.message || 'Lỗi hủy đợt kiểm.', 'error');
    }
}

// ========== PHOTO TRIGGER FLOW ==========
let _kkPendingRollCallback = null;

function _kkCheckPhotoRequired(rollImg) {
    if (_kk.photoMode === 'all') return true;
    if (_kk.photoMode === 'missing_only' && !rollImg) return true;
    return false;
}

function _kkResizeImageHelper(file, maxDimension = 1024) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                let width = img.width;
                let height = img.height;

                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        resolve(file);
                        return;
                    }
                    const resizedFile = new File([blob], file.name || 'image.jpg', {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(resizedFile);
                }, 'image/jpeg', 0.8);
            };
            img.onerror = function() {
                resolve(file);
            };
            img.src = event.target.result;
        };
        reader.onerror = function() {
            resolve(file);
        };
        reader.readAsDataURL(file);
    });
}

function _kkTriggerPhotoUpload(rollId, successCallback) {
    const fileInput = document.getElementById('kkRollPhotoUploader');
    if (!fileInput) return;
    
    _kkPendingRollCallback = async function(file) {
        try {
            showToast('⏳ Đang tối ưu dung lượng ảnh...');
            const optimizedFile = await _kkResizeImageHelper(file, 1024);

            const formData = new FormData();
            formData.append('image', optimizedFile);
            
            showToast('⏳ Đang nén và tải ảnh lên...');
            const res = await apiCall('/api/khovai/rolls/' + rollId + '/image', 'POST', formData);
            showToast('✅ Tải ảnh lên thành công', 'success');
            if (successCallback) {
                await successCallback(res.image_path);
            } else {
                // Auto reload
                await _kkLoadRolls();
                const content = _kkGetContainer();
                if (content) _kkRenderMain(content);
            }
        } catch (e) {
            showToast(e.message || 'Lỗi tải ảnh.', 'error');
        }
    };
    
    fileInput.value = '';
    fileInput.click();
}

// Global hook for photo input changes
document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'kkRollPhotoUploader') {
        if (e.target.files && e.target.files[0] && _kkPendingRollCallback) {
            _kkPendingRollCallback(e.target.files[0]);
            _kkPendingRollCallback = null;
        }
    }
});

// ========== AUDITING ACTIONS ==========

// 1. Mark Present (Khớp)
async function _kkMarkPresent(rollId, systemWeight, rollImg) {
    // Real-time photo mode fetch
    try {
        const sRes = await apiCall('/api/stockcheck/settings');
        _kk.photoMode = sRes.photo_mode || 'none';
    } catch(e) {
        console.error('[KK settings fetch]', e);
    }

    const runCheck = async () => {
        try {
            await apiCall('/api/stockcheck/check/' + rollId, 'POST', { actual_weight: systemWeight });
            showToast('✅ Cập nhật khớp: ' + systemWeight + ' kg');
            
            // Reload
            const treeRes = await apiCall('/api/stockcheck/tree');
            _kk.tree = treeRes;
            await _kkLoadRolls();
            const content = _kkGetContainer();
            if (content) _kkRenderMain(content);
        } catch(e) {
            showToast(e.message || 'Lỗi cập nhật', 'error');
        }
    };

    if (_kkCheckPhotoRequired(rollImg)) {
        if (confirm('Yêu cầu chụp ảnh minh chứng trước khi xác nhận. Mở camera?')) {
            _kkTriggerPhotoUpload(rollId, runCheck);
        }
    } else {
        await runCheck();
    }
}

// 2. Mark Missing (Báo mất)
async function _kkMarkMissing(rollId, rollCode) {
    const r = _kk.rolls.find(item => item.roll_id === rollId);
    const colorName = r ? r.color_name : '—';
    const materialName = r ? r.material_name : '—';
    const systemWeight = r ? r.system_weight : 0;

    const modalHtml = `
        <div class="kk-modal-overlay" id="kkMissingModal">
            <div class="kk-modal" style="max-width:400px;">
                <div class="kk-modal-header">
                    <div class="kk-modal-title" style="color:#ef4444; font-weight:800;">⚠️ Xác Nhận Báo Mất Cây Vải</div>
                    <button class="close" onclick="_kkCloseModal('kkMissingModal')" style="border:none; background:none; font-size:24px;">&times;</button>
                </div>
                <div class="kk-modal-body">
                    <div style="background:#fef2f2; border:1px solid #fee2e2; border-radius:10px; padding:12px; font-size:12px; color:#991b1b; line-height:1.5; margin-bottom:12px;">
                        Cây vải này sẽ được ghi nhận là <strong>MẤT</strong>. Cân nặng thực tế sẽ tính bằng <strong>0 kg</strong> (hao hụt 100%).
                    </div>
                    
                    <div class="kk-form-group">
                        <label class="kk-form-label">Thông tin cây vải</label>
                        <div style="font-size:12px; color:#334155; display:flex; flex-direction:column; gap:4px; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
                            <div><strong>Chất liệu:</strong> ${materialName}</div>
                            <div><strong>Màu:</strong> ${colorName}</div>
                            <div><strong>Tồn hệ thống:</strong> ${systemWeight} kg</div>
                        </div>
                    </div>

                    <div class="kk-form-group" style="margin-top:12px;">
                        <label class="kk-form-label">Ghi chú (Tùy chọn)</label>
                        <input type="text" id="kkMissingNotes" class="kk-form-input" value="Báo mất khi kiểm kê" placeholder="Nhập lý do báo mất...">
                    </div>
                </div>
                <div class="kk-modal-footer">
                    <button class="kk-btn kk-btn-secondary" onclick="_kkCloseModal('kkMissingModal')">Hủy</button>
                    <button class="kk-btn kk-btn-danger" style="background:#ef4444; border-color:#ef4444; color:#fff;" onclick="_kkSubmitMissing(${rollId}, '${rollCode}')">Xác Nhận Báo Mất</button>
                </div>
            </div>
        </div>
    `;

    const oldContainer = document.getElementById('kkMissingModalContainer');
    if (oldContainer) oldContainer.remove();

    const div = document.createElement('div');
    div.id = 'kkMissingModalContainer';
    div.innerHTML = modalHtml;
    document.body.appendChild(div);
}

async function _kkSubmitMissing(rollId, rollCode) {
    const notesInput = document.getElementById('kkMissingNotes');
    const note = notesInput ? notesInput.value.trim() : 'Báo mất khi kiểm kê';
    
    _kkCloseModal('kkMissingModal');
    
    try {
        await apiCall('/api/stockcheck/check/' + rollId, 'POST', { actual_weight: 0, notes: note });
        showToast('❌ Đã báo mất cây ' + rollCode);
        
        // Reload
        const treeRes = await apiCall('/api/stockcheck/tree');
        _kk.tree = treeRes;
        await _kkLoadRolls();
        const content = _kkGetContainer();
        if (content) _kkRenderMain(content);
    } catch(e) {
        showToast(e.message || 'Lỗi báo mất.', 'error');
    }
}

// 3. Weight Input Modal (Nhập thực tế)
function _kkInputWeightPrompt(rollId, systemWeight, rollImg) {
    const r = _kk.rolls.find(item => item.roll_id === rollId);
    const colorName = r ? r.color_name : '—';
    const materialName = r ? r.material_name : '—';

    const modalHtml = `
        <div class="kk-modal-overlay" id="kkWeightInputModal">
            <div class="kk-modal" style="max-width:400px;">
                <div class="kk-modal-header">
                    <div class="kk-modal-title">Nhập Trọng Lượng Thực Tế</div>
                    <button class="close" onclick="_kkCloseModal('kkWeightInputModal')" style="border:none; background:none; font-size:24px;">&times;</button>
                </div>
                <div class="kk-modal-body">
                    <div class="kk-form-group" style="margin-bottom:12px;">
                        <label class="kk-form-label">Thông tin cây vải</label>
                        <div style="font-size:12px; color:#334155; display:flex; flex-direction:column; gap:4px; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
                            <div><strong>Chất liệu:</strong> ${materialName}</div>
                            <div><strong>Màu:</strong> ${colorName}</div>
                            <div><strong>Tồn hệ thống:</strong> ${systemWeight} kg</div>
                        </div>
                    </div>

                    <div class="kk-form-group" style="margin-bottom:12px;">
                        <label class="kk-form-label">Cân nặng thực tế (kg) <span style="color:#ef4444;">*</span></label>
                        <input type="number" id="kkInputActualW" class="kk-form-input" placeholder="Nhập số kg thực tế..." step="0.1" min="0" oninput="_kkCalculateDifference(${systemWeight})">
                    </div>

                    <div class="kk-form-group" style="margin-bottom:12px;">
                        <label class="kk-form-label">So sánh chênh lệch</label>
                        <div id="kkWeightDiffLabel" style="font-size:13px; background:#f8fafc; padding:8px 10px; border-radius:8px; border:1px solid #e2e8f0; min-height:36px; display:flex; align-items:center;">
                            <span style="color:#64748b; font-weight:600;">—</span>
                        </div>
                    </div>

                    <div class="kk-form-group">
                        <label class="kk-form-label">Ghi chú (Tùy chọn)</label>
                        <input type="text" id="kkInputActualNote" class="kk-form-input" placeholder="Ghi chú hao hụt, rách...">
                    </div>
                </div>
                <div class="kk-modal-footer">
                    <button class="kk-btn kk-btn-secondary" onclick="_kkCloseModal('kkWeightInputModal')">Hủy</button>
                    <button class="kk-btn kk-btn-primary" id="kkWeightConfirmBtn" disabled style="opacity:0.5;" onclick="_kkSubmitWeightInput(${rollId}, ${systemWeight}, '${rollImg}')">Xác Nhận</button>
                </div>
            </div>
        </div>
    `;

    const oldContainer = document.getElementById('kkWeightInputModalContainer');
    if (oldContainer) oldContainer.remove();

    const div = document.createElement('div');
    div.id = 'kkWeightInputModalContainer';
    div.innerHTML = modalHtml;
    document.body.appendChild(div);
    
    // Focus
    setTimeout(() => {
        const inp = document.getElementById('kkInputActualW');
        if (inp) inp.focus();
    }, 100);
}

function _kkCalculateDifference(systemWeight) {
    const inputEl = document.getElementById('kkInputActualW');
    const diffEl = document.getElementById('kkWeightDiffLabel');
    const btnEl = document.getElementById('kkWeightConfirmBtn');
    
    if (!inputEl || !diffEl || !btnEl) return;
    
    const val = inputEl.value.trim();
    if (val === '') {
        diffEl.innerHTML = '<span style="color:#64748b; font-weight:600;">—</span>';
        btnEl.disabled = true;
        btnEl.style.opacity = '0.5';
        return;
    }
    
    const actual = Number(val);
    if (isNaN(actual) || actual < 0) {
        diffEl.innerHTML = '<span style="color:#ef4444; font-weight:600;">Cân nặng không hợp lệ</span>';
        btnEl.disabled = true;
        btnEl.style.opacity = '0.5';
        return;
    }
    
    btnEl.disabled = false;
    btnEl.style.opacity = '1.0';
    
    const diff = actual - systemWeight;
    if (diff === 0) {
        diffEl.innerHTML = '<span style="color:#16a34a; font-weight:700;">✅ Khớp (0 kg)</span>';
    } else if (diff < 0) {
        diffEl.innerHTML = `<span style="color:#dc2626; font-weight:700;">📉 Thiếu ${Math.abs(diff).toFixed(2)} kg</span>`;
    } else {
        diffEl.innerHTML = `<span style="color:#2563eb; font-weight:700;">📈 Thừa +${diff.toFixed(2)} kg</span>`;
    }
}

async function _kkSubmitWeightInput(rollId, systemWeight, rollImg) {
    const valStr = document.getElementById('kkInputActualW').value;
    if (!valStr || isNaN(Number(valStr)) || Number(valStr) < 0) {
        showToast('Trọng lượng không hợp lệ', 'error');
        return;
    }
    const val = Number(valStr);
    const notes = document.getElementById('kkInputActualNote').value;
    
    _kkCloseModal('kkWeightInputModal');

    // Real-time photo mode fetch
    try {
        const sRes = await apiCall('/api/stockcheck/settings');
        _kk.photoMode = sRes.photo_mode || 'none';
    } catch(e) {
        console.error('[KK settings fetch]', e);
    }

    const runCheck = async () => {
        try {
            await apiCall('/api/stockcheck/check/' + rollId, 'POST', { actual_weight: val, notes: notes || '' });
            showToast('✅ Đã cập nhật thực tế: ' + val + ' kg');
            
            // Reload
            const treeRes = await apiCall('/api/stockcheck/tree');
            _kk.tree = treeRes;
            await _kkLoadRolls();
            const content = _kkGetContainer();
            if (content) _kkRenderMain(content);
        } catch(e) {
            showToast(e.message || 'Lỗi cập nhật', 'error');
        }
    };

    if (_kkCheckPhotoRequired(rollImg)) {
        if (confirm('Yêu cầu chụp ảnh minh chứng trước khi xác nhận. Mở camera?')) {
            _kkTriggerPhotoUpload(rollId, runCheck);
        }
    } else {
        await runCheck();
    }
}

// ========== FINISH SESSION ==========
async function _kkFinishSession(ready) {
    if (!ready) {
        showToast('Bạn phải hoàn thành kiểm kê 100% số cây vải trước khi chốt sổ.', 'warning');
        return;
    }

    if (!confirm('⚠️ XÁC NHẬN CHỐT SỔ KIỂM KHO?\n\nHệ thống sẽ chốt sổ, cập nhật số dư kho, ghi nhận hóa đơn nhập/xuất hao hụt, và mở khóa kho vải. Hành động này không thể hoàn tác!')) return;

    try {
        const res = await apiCall('/api/stockcheck/finish-session', 'POST');
        showToast('✅ Chốt sổ kiểm kê kho vải thành công!', 'success');
        
        // Direct to report view
        _kk.selectedSessionId = res.session_id;
        _kk.view = 'report';
        
        const content = _kkGetContainer();
        if (content) {
            await _kkLoadHistoryAndSummary();
            _kkRenderMain(content);
        }
    } catch(e) {
        showToast(e.message || 'Lỗi chốt sổ.', 'error');
    }
}

// ========== ADD SURPLUS MODAL (CÂY THỪA) ==========
function _kkOpenAddSurplusModal() {
    const cleanActiveLoc = (_kk.activeLocation || '').replace(/^📍\s*/, '').trim().toLowerCase();
    const isSurplusBlocked = ['kệ dự định hoàn vải', 'chưa xếp kệ - cây nguyên', 'chưa xếp kệ - cây lẻ', 'kệ 3d thiện linh'].includes(cleanActiveLoc);
    if (isSurplusBlocked) {
        showToast('Không cho phép khai báo cây thừa tại kệ này.', 'error');
        return;
    }

    _kk.surplusFile = null; // Clear previous state

    // Populate Shelf selection options from _kk.shelves
    let shelfOptions = '';
    (_kk.shelves || []).forEach(s => {
        const cleanName = s.name.replace(/^📍\s*/, '').trim().toLowerCase();
        const isBlockedShelf = ['kệ dự định hoàn vải', 'chưa xếp kệ - cây nguyên', 'chưa xếp kệ - cây lẻ', 'kệ 3d thiện linh'].includes(cleanName);
        if (isBlockedShelf) return;
        shelfOptions += `<option value="${s.name}" ${s.name === _kk.activeLocation ? 'selected' : ''}>${s.name}</option>`;
    });

    const modalHtml = `
        <div class="kk-modal-overlay" id="kkSurplusModal">
            <div class="kk-modal" style="max-width:450px;">
                <div class="kk-modal-header">
                    <div class="kk-modal-title">Khai Báo Cây Vải Thừa (Ngoài Hệ Thống)</div>
                    <button class="close" onclick="_kkCloseModal('kkSurplusModal')" style="border:none; background:none; font-size:24px;">&times;</button>
                </div>
                <div class="kk-modal-body">
                    <!-- Shelf Selector -->
                    <div class="kk-form-group">
                        <label class="kk-form-label">Kệ Chứa Cây Thừa</label>
                        <select id="kkSurplusLocation" class="kk-form-input" onchange="_kkOnSurplusShelfChange(this.value)">
                            ${shelfOptions}
                        </select>
                        <div id="kkSurplusShelfInfo" style="margin-top: 6px; padding: 8px 10px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 12px; display: flex; flex-direction: column; gap: 4px;">
                            <div>📍 <span style="color:#854d0e; font-weight: 600;">Vị trí kệ:</span> <span id="kkSurplusShelfPos" style="color:#1e293b; font-weight: 700;">--</span></div>
                            <div>📦 <span style="color:#0f766e; font-weight: 600;">Chất liệu kệ:</span> <span id="kkSurplusShelfMats" style="color:#1e293b; font-weight: 700;">--</span></div>
                        </div>
                    </div>

                    <!-- Material Selector -->
                    <div class="kk-form-group">
                        <label class="kk-form-label">Chất Liệu Vải</label>
                        <select id="kkSurplusMatSelect" class="kk-form-input" onchange="_kkOnSurplusMatChange(this.value); _kkValidateSurplusForm();">
                        </select>
                        <div id="kkSurplusMatWarning" style="color:#f59e0b; font-size:12px; margin-top:4px; display:none;">⚠️ Kệ này đang bị giới hạn nhưng chưa được gán chất liệu nào!</div>
                    </div>

                    <!-- Color Selector -->
                    <div class="kk-form-group">
                        <label class="kk-form-label">Màu Vải</label>
                        <select id="kkSurplusColorSelect" class="kk-form-input" onchange="_kkValidateSurplusForm()">
                            <option value="">-- Chọn chất liệu trước --</option>
                        </select>
                    </div>

                    <!-- Details -->
                    <div class="row">
                        <div class="col-6">
                            <div class="kk-form-group">
                                <label class="kk-form-label">Trọng Lượng (kg)</label>
                                <input type="number" id="kkSurplusWeight" class="kk-form-input" placeholder="0.0" step="0.1" min="0.1" oninput="_kkValidateSurplusForm()">
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="kk-form-group">
                                <label class="kk-form-label">Số Cây Thừa</label>
                                <input type="number" id="kkSurplusCount" class="kk-form-input" value="1" readonly style="background:rgba(0,0,0,0.02); color:#64748b;">
                            </div>
                        </div>
                    </div>

                    <!-- Roll Type Selector (Cây Nguyên hay Cây Lẻ) -->
                    <div class="kk-form-group">
                        <label class="kk-form-label">Phân Loại Cây Vải <span style="color:#ef4444;">*</span></label>
                        <input type="hidden" id="kkSurplusRollType" value="">
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:4px;">
                            <div style="border: 2px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; transition: all 0.2s; background:#ffffff;" id="labelSurplusTypeNguyen" onclick="_kkOnSurplusTypeChange('nguyen')">
                                <span style="font-weight:700; font-size:13px; color:#1e293b;">🌲 Cây Nguyên</span>
                                <span style="font-size:10px; color:#64748b;">Chưa cắt bao giờ</span>
                            </div>
                            <div style="border: 2px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; transition: all 0.2s; background:#ffffff;" id="labelSurplusTypeLe" onclick="_kkOnSurplusTypeChange('le')">
                                <span style="font-weight:700; font-size:13px; color:#1e293b;">✂️ Cây Lẻ</span>
                                <span style="font-size:10px; color:#64748b;">Đã từng cắt dở</span>
                            </div>
                        </div>
                    </div>

                    <!-- Photo Upload for Surplus (Desktop) -->
                    <div class="kk-form-group">
                        <label class="kk-form-label">Ảnh Minh Chứng Cây Thừa <span style="color:#ef4444;">*</span></label>
                        <div style="display:flex; align-items:center; gap:12px;">
                            <button type="button" class="kk-btn" style="background:#475569; color:#f8fafc; border:1px solid #cbd5e1; display:flex; align-items:center; gap:6px; font-weight:700; padding:8px 12px; border-radius:8px;" onclick="document.getElementById('kkSurplusPhotoUploader').click()">
                                📁 Chọn ảnh tải lên
                            </button>
                            <input type="file" id="kkSurplusPhotoUploader" accept="image/*" style="display:none" onchange="_kkOnSurplusPhotoSelected(this)">
                            <div id="kkSurplusPhotoPreview" style="display:flex; align-items:center; gap:8px;">
                                <span style="color:#94a3b8; font-size:12px; font-style:italic;">Bắt buộc phải có ảnh</span>
                            </div>
                        </div>
                    </div>

                    <div class="kk-form-group">
                        <label class="kk-form-label">Ghi Chú</label>
                        <input type="text" id="kkSurplusNote" class="kk-form-input" placeholder="Ghi chú cây dư thừa phát hiện...">
                    </div>
                </div>
                <div class="kk-modal-footer">
                    <button class="kk-btn kk-btn-secondary" onclick="_kkCloseModal('kkSurplusModal')">Hủy</button>
                    <button class="kk-btn kk-btn-primary" id="kkSurplusSubmitBtn" disabled style="opacity:0.5;" onclick="_kkSubmitSurplus()">Thêm Cây Vải</button>
                </div>
            </div>
        </div>
    `;

    const div = document.createElement('div');
    div.id = 'kkSurplusModalContainer';
    div.innerHTML = modalHtml;
    document.body.appendChild(div);

    // Initialize labels and populate materials for the selected shelf
    _kkOnSurplusShelfChange(_kk.activeLocation);
}

function _kkOnSurplusShelfChange(shelfName) {
    const shelf = (_kk.shelves || []).find(s => s.name === shelfName);
    if (!shelf) return;

    // Update Shelf info labels
    const posEl = document.getElementById('kkSurplusShelfPos');
    const matsEl = document.getElementById('kkSurplusShelfMats');
    if (posEl) posEl.textContent = shelf.shelf_position || 'Chưa cấu hình';
    if (matsEl) {
        matsEl.textContent = shelf.is_restricted ? (shelf.allowed_materials || 'Chưa gán chất liệu nào') : 'Đa năng (Chất liệu nào cũng được)';
        matsEl.style.color = shelf.is_restricted ? '#c084fc' : '#ffffff';
    }

    // Filter material options
    const matSelect = document.getElementById('kkSurplusMatSelect');
    if (!matSelect) return;

    const prevSelected = matSelect.value;
    let matOptions = `<option value="">-- Chọn chất liệu --</option>`;

    // Get all materials of the warehouse
    const actualWhId = Number(shelf.warehouse_id);
    let allowedIds = [];
    if (shelf.is_restricted && shelf.allowed_material_ids) {
        allowedIds = shelf.allowed_material_ids.split(',').map(Number);
    }

    let validPrevSelected = false;

    if (_kk.tree && _kk.tree.tree) {
        _kk.tree.tree.forEach(w => {
            if (Number(w.id) !== actualWhId) return;
            if (w.materials) {
                w.materials.forEach(m => {
                    if (shelf.is_restricted) {
                        // Only allow assigned materials
                        if (!allowedIds.includes(Number(m.id))) return;
                    }
                    matOptions += `<option value="${m.id}">[${w.name}] ${m.name}</option>`;
                    if (Number(m.id) === Number(prevSelected)) {
                        validPrevSelected = true;
                    }
                });
            }
        });
    }

    matSelect.innerHTML = matOptions;

    // Warn if restricted but no materials
    const warnEl = document.getElementById('kkSurplusMatWarning');
    if (shelf.is_restricted && allowedIds.length === 0) {
        if (warnEl) warnEl.style.display = 'block';
    } else {
        if (warnEl) warnEl.style.display = 'none';
    }

    if (validPrevSelected) {
        matSelect.value = prevSelected;
    } else {
        matSelect.value = "";
        _kkOnSurplusMatChange("");
    }

    _kkValidateSurplusForm();
}
window._kkOnSurplusShelfChange = _kkOnSurplusShelfChange;
}

// On Material Selected in Surplus Form
async function _kkOnSurplusMatChange(val) {
    const colorSelect = document.getElementById('kkSurplusColorSelect');

    if (!val) {
        colorSelect.innerHTML = `<option value="">-- Chọn chất liệu trước --</option>`;
        return;
    }

    // Load colors from tree structure
    let colorOptions = `<option value="">-- Chọn màu --</option>`;
    try {
        // Fetch rolls of this material to populate existing colors.
        const res = await apiCall('/api/stockcheck/rolls?material_id=' + val);
        const colorSet = new Set();
        const colors = [];
        res.rolls.forEach(r => {
            if (!colorSet.has(r.fabric_color_id)) {
                colorSet.add(r.fabric_color_id);
                colors.push({ id: r.fabric_color_id, name: r.color_name });
            }
        });
        
        colors.forEach(c => {
            colorOptions += `<option value="${c.id}">${c.name}</option>`;
        });
    } catch(e) {
        console.error('Cannot load colors', e);
    }
    colorSelect.innerHTML = colorOptions;
}

// Submit Surplus Rolls
async function _kkSubmitSurplus() {
    const materialId = document.getElementById('kkSurplusMatSelect').value;
    const colorId = document.getElementById('kkSurplusColorSelect').value;
    const weight = document.getElementById('kkSurplusWeight').value;
    const count = document.getElementById('kkSurplusCount').value;
    const location = document.getElementById('kkSurplusLocation').value;
    const note = document.getElementById('kkSurplusNote').value;
    const rollType = document.getElementById('kkSurplusRollType').value;

    if (!materialId) { showToast('Vui lòng chọn chất liệu vải', 'error'); return; }
    if (!colorId) { showToast('Vui lòng chọn màu vải', 'error'); return; }
    if (!weight || isNaN(Number(weight)) || Number(weight) <= 0) { showToast('Vui lòng nhập cân nặng hợp lệ (lớn hơn 0)', 'error'); return; }
    if (!rollType) { showToast('Vui lòng chọn loại cây vải (Cây Nguyên hoặc Cây Lẻ)', 'error'); return; }
    if (!_kk.surplusFile) { showToast('Bắt buộc phải tải ảnh minh chứng cho cây vải thừa!', 'error'); return; }

    try {
        const curShelf = (_kk.shelves || []).find(s => s.name === location);
        const actualWhId = curShelf ? Number(curShelf.warehouse_id) : (isNaN(Number(_kk.activeWarehouseId)) ? 0 : Number(_kk.activeWarehouseId));

        const body = {
            warehouse_id: actualWhId,
            material_id: materialId,
            new_material_name: '',
            color_id: colorId,
            new_color_name: '',
            weight: Number(weight),
            roll_count: Number(count),
            location: location,
            note: note,
            roll_type: rollType
        };

        showToast('⏳ Đang xử lý khai báo...', 'info');
        const res = await apiCall('/api/stockcheck/add-surplus-full', 'POST', body);
        if (res && res.error) {
            throw new Error(res.error);
        }

        if (res && res.rolls && res.rolls.length > 0) {
            const newRollId = res.rolls[0].id;
            showToast('⏳ Đang tải ảnh cây vải lên...', 'info');
            
            const formData = new FormData();
            formData.append('image', _kk.surplusFile);
            
            const uploadRes = await apiCall('/api/khovai/rolls/' + newRollId + '/image', 'POST', formData);
            if (uploadRes && uploadRes.error) {
                throw new Error(uploadRes.error || 'Tải ảnh lên thất bại');
            }
        }

        showToast('✅ Đã khai báo cây thừa thành công!', 'success');
        _kkCloseModal('kkSurplusModal');
        
        // Reload
        const treeRes = await apiCall('/api/stockcheck/tree');
        _kk.tree = treeRes;
        await _kkLoadRolls();
        const content = _kkGetContainer();
        if (content) _kkRenderMain(content);
    } catch (e) {
        showToast(e.message || 'Lỗi khai báo cây thừa.', 'error');
    }
}

async function _kkOnSurplusPhotoSelected(input) {
    if (input.files && input.files[0]) {
        try {
            showToast('⏳ Đang tối ưu dung lượng ảnh...');
            const file = await _kkResizeImageHelper(input.files[0], 1024);
            _kk.surplusFile = file;
            const previewUrl = URL.createObjectURL(_kk.surplusFile);
            const previewEl = document.getElementById('kkSurplusPhotoPreview');
            if (previewEl) {
                previewEl.innerHTML = `<img src="${previewUrl}" style="width:50px; height:50px; object-fit:cover; border-radius:6px; border:1px solid rgba(0,0,0,0.15);" onclick="window.open('${previewUrl}', '_blank')">`;
            }
            _kkValidateSurplusForm();
        } catch (e) {
            console.error('Failed to optimize image', e);
        }
    }
}

function _kkValidateSurplusForm() {
    const mat = document.getElementById('kkSurplusMatSelect').value;
    const col = document.getElementById('kkSurplusColorSelect').value;
    const wVal = document.getElementById('kkSurplusWeight').value;
    const typeVal = document.getElementById('kkSurplusRollType')?.value;
    const btn = document.getElementById('kkSurplusSubmitBtn');
    if (!btn) return;
    
    const hasWeight = wVal && !isNaN(Number(wVal)) && Number(wVal) > 0;
    const hasPhoto = !!_kk.surplusFile;
    const hasType = !!typeVal;
    
    if (mat && col && hasWeight && hasPhoto && hasType) {
        btn.disabled = false;
        btn.style.opacity = '1.0';
    } else {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    }
}

function _kkOnSurplusTypeChange(type) {
    const input = document.getElementById('kkSurplusRollType');
    if (!input) return;
    input.value = type;
    
    const btnNguyen = document.getElementById('labelSurplusTypeNguyen');
    const btnLe = document.getElementById('labelSurplusTypeLe');
    if (!btnNguyen || !btnLe) return;
    
    if (type === 'nguyen') {
        btnNguyen.style.borderColor = '#0d9488';
        btnNguyen.style.background = '#f0fdfa';
        btnLe.style.borderColor = '#cbd5e1';
        btnLe.style.background = '#ffffff';
    } else {
        btnLe.style.borderColor = '#0d9488';
        btnLe.style.background = '#f0fdfa';
        btnNguyen.style.borderColor = '#cbd5e1';
        btnNguyen.style.background = '#ffffff';
    }
    _kkValidateSurplusForm();
}

function _kkViewSurplusDetail(rollId) {
    const r = _kk.rolls.find(item => item.roll_id === rollId);
    if (!r) {
        showToast('Không tìm thấy thông tin cây vải thừa', 'error');
        return;
    }

    const isOriginal = Number(r.system_weight) === Number(r.original_weight);
    const typeLabel = isOriginal 
        ? '<span style="font-weight:700; color:#16a34a;">🌲 Cây Nguyên (Chưa cắt bao giờ)</span>' 
        : '<span style="font-weight:700; color:#ea580c;">✂️ Cây Lẻ (Đã từng cắt dở)</span>';

    const modalHtml = `
        <div class="kk-modal-overlay" id="kkViewSurplusModal">
            <div class="kk-modal" style="max-width:450px;">
                <div class="kk-modal-header">
                    <div class="kk-modal-title" style="color: #6b21a8; font-weight: 800;">💜 Chi Tiết Cây Vải Thừa</div>
                    <button class="close" onclick="_kkCloseModal('kkViewSurplusModal')" style="border:none; background:none; font-size:24px; cursor:pointer;">&times;</button>
                </div>
                <div class="kk-modal-body" style="font-size:13px; display:flex; flex-direction:column; gap:12px; color:#334155;">
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
                        <span style="color:#64748b; font-weight:600;">Mã Cây Vải:</span>
                        <span style="font-weight:700; font-family:monospace; color:#6b21a8;">${r.roll_code}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
                        <span style="color:#64748b; font-weight:600;">Phân Loại:</span>
                        <span>${typeLabel}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
                        <span style="color:#64748b; font-weight:600;">Chất Liệu:</span>
                        <span style="font-weight:700;">${r.material_name}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
                        <span style="color:#64748b; font-weight:600;">Màu Vải:</span>
                        <span style="font-weight:700; color:#0d9488;">${r.color_name}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
                        <span style="color:#64748b; font-weight:600;">Trọng Lượng Thực Tế:</span>
                        <span style="font-weight:900; color:#059669; font-size:15px;">${r.actual_weight} kg</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
                        <span style="color:#64748b; font-weight:600;">Vị Trí Kệ:</span>
                        <span style="font-weight:700; color:#6b21a8;">📍 ${r.location || 'Chưa rõ'}</span>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:4px; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
                        <span style="color:#64748b; font-weight:600;">Ghi Chú:</span>
                        <span style="font-style:italic; color:#475569;">${r.sc_notes || 'Không có ghi chú'}</span>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <span style="color:#64748b; font-weight:600;">Ảnh Minh Chứng:</span>
                        ${r.roll_img ? `
                            <img src="${r.roll_img}" style="width:100%; max-height:240px; object-fit:contain; border-radius:8px; border:1px solid #cbd5e1; cursor:pointer;" onclick="viewImage('${r.roll_img}')">
                        ` : `
                            <span style="color:#ef4444; font-style:italic;">Không có ảnh minh chứng</span>
                        `}
                    </div>
                </div>
                <div class="kk-modal-footer" style="background:#fafafa; display:flex; justify-content:flex-end; padding:12px 24px;">
                    <button class="kk-btn kk-btn-secondary" onclick="_kkCloseModal('kkViewSurplusModal')">Đóng</button>
                </div>
            </div>
        </div>
    `;

    const oldContainer = document.getElementById('kkViewSurplusModalContainer');
    if (oldContainer) oldContainer.remove();

    const div = document.createElement('div');
    div.id = 'kkViewSurplusModalContainer';
    div.innerHTML = modalHtml;
    document.body.appendChild(div);
}

// ========== VIEW COMPLETED SESSION REPORT VIEW ==========
async function _kkViewReport(sessionId) {
    _kk.selectedSessionId = sessionId;
    _kk.view = 'report';
    const content = _kkGetContainer();
    if (content) {
        _kkRenderMain(content);
    }
}

// Render Session Report
async function _kkRenderReport(content) {
    if (!_kk.selectedSessionId) return;
    
    content.innerHTML = `<div style="padding:40px; text-align:center;" class="text-muted">⏳ Đang lập báo cáo chi tiết...</div>`;

    try {
        const res = await apiCall('/api/stockcheck/sessions/' + _kk.selectedSessionId);
        _kk.selectedSessionData = res;
        
        const s = res.session;
        const items = res.items || [];
        
        // Categorize items
        const missing = items.filter(i => i.type === 'missing');
        const surplus = items.filter(i => i.type === 'surplus');
        const difference = items.filter(i => i.type === 'difference');
        const matched = items.filter(i => i.type === 'match');

        // Totals calculation
        const totalMissingW = missing.reduce((sum, i) => sum + Number(i.system_weight || 0), 0);
        const totalSurplusW = surplus.reduce((sum, i) => sum + Number(i.actual_weight || 0), 0);

        // Group details by material/color for summary view
        const matSummary = {};
        items.forEach(item => {
            const k = item.material_name + ' - ' + item.color_name;
            if (!matSummary[k]) {
                matSummary[k] = { expected: 0, checked: 0, diff: 0, unit: item.unit || 'kg' };
            }
            matSummary[k].expected += Number(item.system_weight || 0);
            matSummary[k].checked += Number(item.actual_weight || 0);
            matSummary[k].diff += Number(item.difference || 0);
        });

        let summaryRows = '';
        Object.keys(matSummary).forEach(k => {
            const sum = matSummary[k];
            if (sum.diff !== 0) {
                summaryRows += `
                    <tr>
                        <td class="font-weight-bold">${k}</td>
                        <td class="text-center">${Number(sum.expected).toLocaleString('vi-VN')} ${sum.unit}</td>
                        <td class="text-center">${Number(sum.checked).toLocaleString('vi-VN')} ${sum.unit}</td>
                        <td class="text-right font-weight-bold ${sum.diff > 0 ? 'text-danger' : 'text-primary'}">
                            ${sum.diff > 0 ? '-' + Number(sum.diff).toLocaleString('vi-VN') : '+' + Number(Math.abs(sum.diff)).toLocaleString('vi-VN')} ${sum.unit}
                        </td>
                    </tr>
                `;
            }
        });
        if (!summaryRows) {
            summaryRows = `<tr><td colspan="4" class="text-center text-success font-weight-bold py-3">✅ Kho khớp tuyệt đối, không có chênh lệch!</td></tr>`;
        }

        // Render Page
        content.innerHTML = `
            <div class="container-fluid" style="padding: 24px; max-width: 1100px; margin: 0 auto;">
                <!-- Header -->
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
                    <div>
                        <button class="kk-btn kk-btn-secondary" style="padding:6px 12px; font-size:12px;" onclick="_kkGoBackToSetup()">
                            ⬅️ Quay Lại Lịch Sử
                        </button>
                    </div>
                    <div style="text-align:right;">
                        <h2 style="font-weight:900; margin:0; font-size:20px; color:#0f766e;">Báo Cáo Kiểm Kho Chi Tiết</h2>
                        <span style="font-size:11px; color:#64748b;">Đợt kiểm ngày: ${s.finished_at ? s.finished_at.split('T')[0] : ''}</span>
                    </div>
                </div>

                <!-- Info Overview Card -->
                <div class="kk-card" style="padding: 24px;">
                    <div class="row">
                        <div class="col-md-3 col-sm-6 mb-3">
                            <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Người chốt sổ</div>
                            <div style="font-weight:900; font-size:15px; color:#1e293b;">${s.finished_by_name || 'Hệ thống'}</div>
                        </div>
                        <div class="col-md-3 col-sm-6 mb-3">
                            <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Tổng số đã kiểm</div>
                            <div style="font-weight:900; font-size:15px; color:#0d9488;">${s.checked_rolls} cây</div>
                        </div>
                        <div class="col-md-3 col-sm-6 mb-3">
                            <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Hao hụt (Mất)</div>
                            <div style="font-weight:900; font-size:15px; color:#ef4444;">${s.missing_rolls} cây (${Number(s.missing_weight).toLocaleString('vi-VN')} kg)</div>
                        </div>
                        <div class="col-md-3 col-sm-6 mb-3">
                            <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Dư ròng (Hao hụt ròng)</div>
                            <div style="font-weight:900; font-size:15px; color:#3b82f6;">${Number(s.net_difference).toLocaleString('vi-VN')} kg</div>
                        </div>
                    </div>
                </div>

                <!-- Grid layout of difference details and grouped summaries -->
                <div class="row">
                    <div class="col-md-5">
                        <div class="kk-card" style="padding:20px;">
                            <h4 style="font-weight:800; color:#1e293b; margin-bottom:14px;">📉 Tổng Hợp Chênh Lệch Nhóm Vải</h4>
                            <table class="table" style="font-size:11px; margin:0;">
                                <thead>
                                    <tr style="background:#fafafa;">
                                        <th>Chất Liệu & Màu</th>
                                        <th class="text-center">Hệ Thống</th>
                                        <th class="text-center">Thực Tế</th>
                                        <th class="text-right">Chênh Lệch</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${summaryRows}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="col-md-7">
                        <div class="kk-card" style="padding:20px; min-height:400px; display:flex; flex-direction:column;">
                            <!-- Tabs header -->
                            <div style="display:flex; border-bottom:1px solid #e2e8f0; margin-bottom:14px; flex-shrink:0;">
                                <div class="kk-rep-tab-btn active" id="kkTabBtnMissing" onclick="_kkSwitchRepTab('missing')">❌ Cây bị mất (${missing.length})</div>
                                <div class="kk-rep-tab-btn" id="kkTabBtnSurplus" onclick="_kkSwitchRepTab('surplus')">➕ Cây thừa (${surplus.length})</div>
                                <div class="kk-rep-tab-btn" id="kkTabBtnDiff" onclick="_kkSwitchRepTab('diff')">⚖️ Lệch cân (${difference.length})</div>
                                <div class="kk-rep-tab-btn" id="kkTabBtnMatch" onclick="_kkSwitchRepTab('match')">✅ Khớp (${matched.length})</div>
                            </div>
                            
                            <!-- Tabs content -->
                            <div style="flex:1; overflow-y:auto;" id="kkRepTabContent">
                                <!-- Default loaded is Missing list -->
                                ${_kkRenderReportTabItems(missing, 'missing')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch(e) {
        content.innerHTML = `<div class="p-4 text-center text-danger">Lỗi tải báo cáo: ${e.message}</div>`;
    }
}

// Return Report list item rows
function _kkRenderReportTabItems(items, type) {
    if (items.length === 0) {
        return `<div class="text-center text-muted py-5">Không có cây vải nào thuộc trạng thái này.</div>`;
    }

    let rowsHtml = '';
    items.forEach((item, idx) => {
        let diffText = '—';
        if (type === 'missing') {
            diffText = `<span style="color:#ef4444; font-weight:700;">-${item.system_weight} ${item.unit}</span>`;
        } else if (type === 'surplus') {
            diffText = `<span style="color:#3b82f6; font-weight:700;">+${item.actual_weight} ${item.unit}</span>`;
        } else if (type === 'diff') {
            const d = Number(item.difference);
            diffText = `<span style="color:${d > 0 ? '#ef4444' : '#3b82f6'}; font-weight:700;">
                ${d > 0 ? '-' + d : '+' + Math.abs(d)} ${item.unit}
            </span>`;
        } else {
            diffText = `<span class="text-success font-weight-bold">Khớp</span>`;
        }

        rowsHtml += `
            <tr>
                <td class="text-center text-muted font-weight-bold">${idx + 1}</td>
                <td>
                    <div style="font-weight:700; color:#0f766e;">${item.roll_code}</div>
                    <div style="font-size:10px; color:#64748b;">${item.material_name} - ${item.color_name}</div>
                </td>
                <td class="text-center">${Number(item.system_weight).toLocaleString('vi-VN')} ${item.unit}</td>
                <td class="text-center">${Number(item.actual_weight).toLocaleString('vi-VN')} ${item.unit}</td>
                <td class="text-right">${diffText}</td>
            </tr>
        `;
    });

    return `
        <table class="table table-hover" style="font-size:11px; margin:0;">
            <thead>
                <tr style="background:#fafafa; color:#475569;">
                    <th style="width:40px;" class="text-center">STT</th>
                    <th>Cây Vải & Mã Hàng</th>
                    <th class="text-center">Tồn Ban Đầu</th>
                    <th class="text-center">Kiểm Thực Tế</th>
                    <th class="text-right">Chênh Lệch</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>
    `;
}

// Switch between tabs in detail report
function _kkSwitchRepTab(type) {
    // Toggle active tab buttons
    document.querySelectorAll('.kk-rep-tab-btn').forEach(btn => btn.classList.remove('active'));
    
    let activeBtnId = 'kkTabBtnMissing';
    let dataList = [];
    
    const items = _kk.selectedSessionData.items || [];
    
    if (type === 'missing') {
        activeBtnId = 'kkTabBtnMissing';
        dataList = items.filter(i => i.type === 'missing');
    } else if (type === 'surplus') {
        activeBtnId = 'kkTabBtnSurplus';
        dataList = items.filter(i => i.type === 'surplus');
    } else if (type === 'diff') {
        activeBtnId = 'kkTabBtnDiff';
        dataList = items.filter(i => i.type === 'difference');
    } else if (type === 'match') {
        activeBtnId = 'kkTabBtnMatch';
        dataList = items.filter(i => i.type === 'match');
    }
    
    const btn = document.getElementById(activeBtnId);
    if (btn) btn.classList.add('active');
    
    // Render content
    const contentDiv = document.getElementById('kkRepTabContent');
    if (contentDiv) {
        contentDiv.innerHTML = _kkRenderReportTabItems(dataList, type);
    }
}

// Go back to pre-audit dashboard
async function _kkGoBackToSetup() {
    _kk.view = 'setup';
    _kk.selectedSessionId = null;
    _kk.selectedSessionData = null;
    
    const content = _kkGetContainer();
    if (content) {
        _kkLoadSessionStatus(content);
    }
}

// Change photo mode setting in real-time during an active audit
async function _kkChangePhotoModeDuringAudit(val) {
    try {
        await apiCall('/api/stockcheck/settings', 'PUT', { photo_mode: val });
        _kk.photoMode = val;
        showToast('✅ Đã cập nhật chế độ chụp ảnh minh chứng', 'success');
    } catch(e) {
        showToast(e.message || 'Lỗi cập nhật cấu hình', 'error');
    }
}

function viewImage(imgUrl) {
    if (!imgUrl) return;
    
    // Remove existing viewer if any
    const existing = document.getElementById('global-image-viewer');
    if (existing) existing.remove();
    
    const viewerHtml = `
        <div id="global-image-viewer" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(8px);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.25s ease;
        ">
            <!-- Close button -->
            <button onclick="document.getElementById('global-image-viewer').style.opacity='0'; setTimeout(()=>document.getElementById('global-image-viewer').remove(), 250);" style="
                position: absolute;
                top: 16px;
                right: 16px;
                width: 44px;
                height: 44px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: #ffffff;
                font-size: 24px;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: background 0.2s;
                z-index: 100000;
            " onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
                &times;
            </button>
            
            <!-- Image container -->
            <div style="max-width: 95%; max-height: 85%; display: flex; align-items: center; justify-content: center; position: relative;">
                <img src="${imgUrl}" style="
                    max-width: 100%;
                    max-height: 85vh;
                    object-fit: contain;
                    border-radius: 8px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                ">
            </div>
        </div>
    `;
    
    const container = document.createElement('div');
    container.innerHTML = viewerHtml;
    const viewerDiv = container.firstElementChild;
    
    // Close when clicking the background
    viewerDiv.addEventListener('click', function(e) {
        if (e.target === viewerDiv || e.target.tagName === 'DIV') {
            viewerDiv.style.opacity = '0';
            setTimeout(() => viewerDiv.remove(), 250);
        }
    });
    
    document.body.appendChild(viewerDiv);
    
    // Trigger transition
    setTimeout(() => {
        viewerDiv.style.opacity = '1';
    }, 10);
}

window.viewImage = viewImage;
