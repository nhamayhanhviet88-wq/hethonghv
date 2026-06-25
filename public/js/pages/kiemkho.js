// ========== KIỂM KHO — Desktop SPA ==========
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
    container: null
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
            if (treeRes.tree && treeRes.tree.length > 0) {
                _kk.activeWarehouseId = treeRes.tree[0].id;
            }
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
        _kk.shelves = res.shelves || [];
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
    
    // Progress calculation
    const totalRolls = _kk.session.total_rolls || 0;
    const checkedCount = _kk.tree.checked_count || 0;
    const progressPct = totalRolls > 0 ? Math.min(100, Math.round((checkedCount / totalRolls) * 100)) : 0;
    
    // Warehouse selection options
    let whOptions = '';
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
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:700;">📍 ${s.name}</span>
                    <span class="kk-badge">${s.roll_count} cây</span>
                </div>
                <div style="font-size:10px; color:${isActive ? '#0d9488' : '#64748b'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:left;" title="${materialsText}">
                    ${materialsText}
                </div>
            </div>
        `;
    });

    // Render Expected Rolls table
    let tableRows = '';
    if (_kk.rolls.length === 0) {
        tableRows = `
            <tr>
                <td colspan="8" class="text-center text-muted py-5" style="font-size:13px;">
                    Chưa có cây vải nào được xếp ở kệ này. 
                    <br>
                    <button class="kk-btn kk-btn-primary mt-3" style="padding:6px 12px; font-size:12px;" onclick="_kkOpenAddSurplusModal()">
                        ➕ Thêm Cây Thừa Tại Đây
                    </button>
                </td>
            </tr>
        `;
    } else {
        _kk.rolls.forEach((r, idx) => {
            const hasChecked = r.is_checked;
            const rowClass = hasChecked ? 'table-success' : '';
            
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
                photoBtn = `<img src="${r.roll_img}" style="width:36px; height:36px; object-fit:cover; border-radius:4px; border:1px solid #cbd5e1; cursor:pointer;" onclick="viewImage('${r.roll_img}')" title="Xem ảnh gốc">`;
            } else {
                photoBtn = `<button class="kk-action-btn" onclick="_kkTriggerPhotoUpload(${r.roll_id})" title="Chụp ảnh cây vải">📷</button>`;
            }

            // Difference display
            let diffLabel = '—';
            if (hasChecked) {
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

            tableRows += `
                <tr class="${rowClass}">
                    <td class="text-center font-weight-bold text-muted">${idx + 1}</td>
                    <td>
                        <div style="font-weight:700; color:#0d9488; font-size:13px;">${r.roll_code}</div>
                        <div style="font-size:10px; color:#64748b;">${r.material_name} - ${r.color_name}</div>
                        ${badges}
                    </td>
                    <td class="text-center font-weight-bold">${Number(r.original_weight || 0).toLocaleString('vi-VN')} kg</td>
                    <td class="text-center font-weight-bold text-primary" style="font-size:13px;">${Number(r.system_weight || 0).toLocaleString('vi-VN')} kg</td>
                    <td class="text-center font-weight-bold text-success" style="font-size:14px;">
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
                            ${photoBtn}
                            <button class="kk-action-btn green" onclick="_kkMarkPresent(${r.roll_id}, ${r.system_weight}, '${r.roll_img}')" title="📋 Có mặt (Khớp)">📋</button>
                            <button class="kk-action-btn red" onclick="_kkMarkMissing(${r.roll_id}, '${r.roll_code}')" title="❌ Báo mất">❌</button>
                            <button class="kk-action-btn blue" onclick="_kkInputWeightPrompt(${r.roll_id}, ${r.system_weight}, '${r.roll_img}')" title="📝 Nhập thực tế">📝</button>
                        </div>
                    </td>
                </tr>
            `;
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
                            <button class="kk-btn kk-btn-primary" style="padding:6px 12px; font-size:12px;" onclick="_kkOpenAddSurplusModal()">
                                ➕ Thêm Cây Thừa
                            </button>
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
                                    <th>Cây Vải & Mã Hàng</th>
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
    _kk.activeWarehouseId = Number(val);
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

function _kkTriggerPhotoUpload(rollId, successCallback) {
    const fileInput = document.getElementById('kkRollPhotoUploader');
    if (!fileInput) return;
    
    _kkPendingRollCallback = async function(file) {
        const formData = new FormData();
        formData.append('image', file);
        
        try {
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
    if (!confirm('❌ Báo mất cây vải ' + rollCode + '?\nSố lượng tồn thực tế của cây vải này sẽ chuyển về 0.')) return;
    try {
        await apiCall('/api/stockcheck/check/' + rollId, 'POST', { actual_weight: 0, notes: 'Báo mất khi kiểm kê' });
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
    const modalHtml = `
        <div class="kk-modal-overlay" id="kkWeightInputModal">
            <div class="kk-modal" style="max-width:400px;">
                <div class="kk-modal-header">
                    <div class="kk-modal-title">Nhập Trọng Lượng Thực Tế</div>
                    <button class="close" onclick="_kkCloseModal('kkWeightInputModal')" style="border:none; background:none; font-size:24px;">&times;</button>
                </div>
                <div class="kk-modal-body">
                    <div class="kk-form-group">
                        <label class="kk-form-label">Tồn hệ thống: ${systemWeight} kg</label>
                        <input type="number" id="kkInputActualW" class="kk-form-input" placeholder="Nhập số kg thực tế..." step="0.1" min="0">
                    </div>
                    <div class="kk-form-group">
                        <label class="kk-form-label">Ghi chú (Tùy chọn)</label>
                        <input type="text" id="kkInputActualNote" class="kk-form-input" placeholder="Ghi chú hao hụt, rách...">
                    </div>
                </div>
                <div class="kk-modal-footer">
                    <button class="kk-btn kk-btn-secondary" onclick="_kkCloseModal('kkWeightInputModal')">Hủy</button>
                    <button class="kk-btn kk-btn-primary" onclick="_kkSubmitWeightInput(${rollId}, ${systemWeight}, '${rollImg}')">Xác Nhận</button>
                </div>
            </div>
        </div>
    `;

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
            await apiCall('/api/stockcheck/check/' + rollId, 'POST', { actual_weight: val, notes: notes });
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
    // Populate Materials selection from _kk.tree
    let matOptions = `<option value="">-- Chọn chất liệu --</option>`;
    if (_kk.tree && _kk.tree.tree) {
        // Find current warehouse materials
        const currentWh = _kk.tree.tree.find(w => w.id === _kk.activeWarehouseId);
        if (currentWh && currentWh.materials) {
            currentWh.materials.forEach(m => {
                matOptions += `<option value="${m.id}">${m.name}</option>`;
            });
        }
    }
    matOptions += `<option value="[new]" style="color:#0f766e; font-weight:700;">➕ Tạo chất liệu mới...</option>`;

    const modalHtml = `
        <div class="kk-modal-overlay" id="kkSurplusModal">
            <div class="kk-modal" style="max-width:450px;">
                <div class="kk-modal-header">
                    <div class="kk-modal-title">Khai Báo Cây Vải Thừa (Ngoài Hệ Thống)</div>
                    <button class="close" onclick="_kkCloseModal('kkSurplusModal')" style="border:none; background:none; font-size:24px;">&times;</button>
                </div>
                <div class="kk-modal-body">
                    <!-- Material Selector -->
                    <div class="kk-form-group">
                        <label class="kk-form-label">Chất Liệu Vải</label>
                        <select id="kkSurplusMatSelect" class="kk-form-input" onchange="_kkOnSurplusMatChange(this.value)">
                            ${matOptions}
                        </select>
                    </div>
                    
                    <div class="kk-form-group" id="kkSurplusNewMatGroup" style="display:none;">
                        <label class="kk-form-label" style="color:#0d9488;">Tên Chất Liệu Mới</label>
                        <input type="text" id="kkSurplusNewMatName" class="kk-form-input" placeholder="Nhập tên chất liệu vải mới...">
                    </div>

                    <!-- Color Selector -->
                    <div class="kk-form-group">
                        <label class="kk-form-label">Màu Vải</label>
                        <select id="kkSurplusColorSelect" class="kk-form-input" onchange="_kkOnSurplusColorChange(this.value)">
                            <option value="">-- Chọn chất liệu trước --</option>
                        </select>
                    </div>
                    
                    <div class="kk-form-group" id="kkSurplusNewColorGroup" style="display:none;">
                        <label class="kk-form-label" style="color:#0d9488;">Tên Màu Vải Mới</label>
                        <input type="text" id="kkSurplusNewColorName" class="kk-form-input" placeholder="Nhập tên màu vải mới...">
                    </div>

                    <!-- Details -->
                    <div class="row">
                        <div class="col-6">
                            <div class="kk-form-group">
                                <label class="kk-form-label">Trọng Lượng (kg)</label>
                                <input type="number" id="kkSurplusWeight" class="kk-form-input" placeholder="0.0" step="0.1" min="0.1">
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="kk-form-group">
                                <label class="kk-form-label">Số Cây Thừa</label>
                                <input type="number" id="kkSurplusCount" class="kk-form-input" value="1" min="1">
                            </div>
                        </div>
                    </div>

                    <div class="kk-form-group">
                        <label class="kk-form-label">Vị Trí Kệ Thừa</label>
                        <input type="text" id="kkSurplusLocation" class="kk-form-input" value="${_kk.activeLocation || ''}" readonly>
                    </div>

                    <div class="kk-form-group">
                        <label class="kk-form-label">Ghi Chú</label>
                        <input type="text" id="kkSurplusNote" class="kk-form-input" placeholder="Ghi chú cây dư thừa phát hiện...">
                    </div>
                </div>
                <div class="kk-modal-footer">
                    <button class="kk-btn kk-btn-secondary" onclick="_kkCloseModal('kkSurplusModal')">Hủy</button>
                    <button class="kk-btn kk-btn-primary" onclick="_kkSubmitSurplus()">Thêm Cây Vải</button>
                </div>
            </div>
        </div>
    `;

    const div = document.createElement('div');
    div.id = 'kkSurplusModalContainer';
    div.innerHTML = modalHtml;
    document.body.appendChild(div);
}

// On Material Selected in Surplus Form
async function _kkOnSurplusMatChange(val) {
    const colorSelect = document.getElementById('kkSurplusColorSelect');
    const newMatGroup = document.getElementById('kkSurplusNewMatGroup');
    const newColorGroup = document.getElementById('kkSurplusNewColorGroup');
    
    if (val === '[new]') {
        newMatGroup.style.display = 'block';
        colorSelect.innerHTML = `<option value="[new]" selected>➕ Tạo màu vải mới...</option>`;
        newColorGroup.style.display = 'block';
        return;
    } else {
        newMatGroup.style.display = 'none';
        newColorGroup.style.display = 'none';
    }

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
    colorOptions += `<option value="[new]" style="color:#0f766e; font-weight:700;">➕ Tạo màu mới...</option>`;
    colorSelect.innerHTML = colorOptions;
}

function _kkOnSurplusColorChange(val) {
    const newColorGroup = document.getElementById('kkSurplusNewColorGroup');
    if (val === '[new]') {
        newColorGroup.style.display = 'block';
    } else {
        newColorGroup.style.display = 'none';
    }
}

// Submit Surplus Rolls
async function _kkSubmitSurplus() {
    const materialId = document.getElementById('kkSurplusMatSelect').value;
    const newMatName = document.getElementById('kkSurplusNewMatName').value;
    const colorId = document.getElementById('kkSurplusColorSelect').value;
    const newColorName = document.getElementById('kkSurplusNewColorName').value;
    const weight = document.getElementById('kkSurplusWeight').value;
    const count = document.getElementById('kkSurplusCount').value;
    const location = document.getElementById('kkSurplusLocation').value;
    const note = document.getElementById('kkSurplusNote').value;

    if (!materialId) { showToast('Vui lòng chọn chất liệu vải', 'error'); return; }
    if (materialId === '[new]' && !newMatName.trim()) { showToast('Nhập tên chất liệu vải mới', 'error'); return; }
    if (!colorId) { showToast('Vui lòng chọn màu vải', 'error'); return; }
    if (colorId === '[new]' && !newColorName.trim()) { showToast('Nhập tên màu vải mới', 'error'); return; }
    if (!weight || isNaN(Number(weight)) || Number(weight) <= 0) { showToast('Nhập trọng lượng hợp lệ', 'error'); return; }

    try {
        const body = {
            warehouse_id: _kk.activeWarehouseId,
            material_id: materialId,
            new_material_name: newMatName,
            color_id: colorId,
            new_color_name: newColorName,
            weight: Number(weight),
            roll_count: Number(count),
            location: location,
            note: note
        };

        await apiCall('/api/stockcheck/add-surplus-full', 'POST', body);
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
