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
    collapsedGroups: new Set(),
    materialFilter: ''
};

function formatVnDateTime(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return new Intl.DateTimeFormat('sv-SE', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).format(d);
    } catch (e) {
        return dateStr.replace('T', ' ').slice(0, 16);
    }
}

function formatVnDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return new Intl.DateTimeFormat('sv-SE', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(d);
    } catch (e) {
        return dateStr.split('T')[0];
    }
}

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

        // Check if there is a session_id in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const urlSessionId = urlParams.get('session_id');

        if (res.active) {
            _kk.view = 'audit';
            // Default active warehouse to first warehouse in tree
            const treeRes = await apiCall('/api/stockcheck/tree');
            _kk.tree = treeRes;
            _kk.activeWarehouseId = 'all';
            await _kkLoadShelves();
        } else if (urlSessionId) {
            _kk.view = 'report';
            _kk.selectedSessionId = urlSessionId;
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
        let query = '/api/stockcheck/rolls?warehouse_id=' + _kk.activeWarehouseId + '&location=' + encodeURIComponent(_kk.activeLocation) + (_kk.search ? '&search=' + encodeURIComponent(_kk.search) : '');
        if (_kk.materialFilter) {
            query += '&material_name=' + encodeURIComponent(_kk.materialFilter);
        }
        const res = await apiCall(query);
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
    
    // Calculate Bill numbers for history sessions
    const billNumbers = {};
    const sortedSessions = [..._kk.historySessions].sort((a, b) => new Date(a.finished_at) - new Date(b.finished_at));
    const yearCounters = {};
    sortedSessions.forEach(s => {
        if (!s.finished_at) return;
        const dateVn = new Date(new Date(s.finished_at).toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
        const year = dateVn.getFullYear();
        if (!yearCounters[year]) {
            yearCounters[year] = 0;
        }
        yearCounters[year]++;
        billNumbers[s.id] = `Bill #${yearCounters[year]} Kiểm Kê - ${year}`;
    });

    let histHtml = '';
    if (_kk.historySessions.length === 0) {
        histHtml = `<tr><td colspan="6" class="text-center text-muted py-4">Chưa có lịch sử đợt kiểm kho nào hoàn thành.</td></tr>`;
    } else {
        _kk.historySessions.forEach((s, idx) => {
            // Format datetime: 18:56 Thứ 6 - 26/6/26
            let finishedDateStr = '—';
            if (s.finished_at) {
                const dateVn = new Date(new Date(s.finished_at).toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
                const hh = String(dateVn.getHours()).padStart(2, '0');
                const mm = String(dateVn.getMinutes()).padStart(2, '0');
                const d = dateVn.getDate();
                const m = dateVn.getMonth() + 1;
                const yy = String(dateVn.getFullYear()).slice(-2);
                const days = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
                const weekday = days[dateVn.getDay()];
                finishedDateStr = `${hh}:${mm} ${weekday} - ${d}/${m}/${yy}`;
            }

            const billText = billNumbers[s.id] || '—';
            
            let netDiffHtml = '';
            if (s.unit_breakdowns && s.unit_breakdowns.length > 0) {
                netDiffHtml = s.unit_breakdowns.map(b => {
                    const diff = Number(b.net_difference || 0);
                    const formatted = Number(Math.abs(diff)).toLocaleString('vi-VN');
                    let color = 'text-muted';
                    let sign = '0';
                    if (diff > 0) {
                        color = 'text-danger';
                        sign = `-${formatted}`;
                    } else if (diff < 0) {
                        color = 'text-success';
                        sign = `+${formatted}`;
                    }
                    return `<span class="${color} font-weight-bold" style="white-space:nowrap;">${sign} ${b.unit}</span>`;
                }).join(' / ');
            } else {
                netDiffHtml = `<span class="text-muted font-weight-bold">0 kg</span>`;
            }

            histHtml += `
                <tr style="cursor:pointer" onclick="_kkViewReport(${s.id})">
                    <td class="text-center font-weight-bold">${idx + 1}</td>
                    <td>${finishedDateStr}</td>
                    <td class="font-weight-bold text-dark">${billText}</td>
                    <td>${s.finished_by_name || 'Hệ thống'}</td>
                    <td class="text-center text-primary font-weight-bold">${s.checked_rolls} cây</td>
                    <td class="text-right font-weight-bold">${netDiffHtml}</td>
                </tr>
            `;
        });
    }

    let summaryHtml = '';
    if (_kk.yearlySummary) {
        _kk.yearlySummary.forEach(m => {
            if (m.audit_count > 0) {
                let missingHtml = '';
                let surplusHtml = '';
                let netDiffHtml = '';

                if (m.units && m.units.length > 0) {
                    m.units.forEach(u => {
                        const mWeight = Number(u.missing_weight || 0).toLocaleString('vi-VN');
                        missingHtml += `<div style="margin-bottom: 2px;">${u.missing_rolls} cây (${mWeight} ${u.unit})</div>`;
                        
                        const sWeight = Number(u.surplus_weight || 0).toLocaleString('vi-VN');
                        surplusHtml += `<div style="margin-bottom: 2px;">${u.surplus_rolls} cây (${sWeight} ${u.unit})</div>`;

                        const diff = Number(u.net_difference || 0);
                        const formatted = Number(Math.abs(diff)).toLocaleString('vi-VN');
                        let colorClass = 'text-muted';
                        let sign = '0';
                        if (diff > 0) {
                            colorClass = 'text-danger';
                            sign = `-${formatted}`;
                        } else if (diff < 0) {
                            colorClass = 'text-primary';
                            sign = `+${formatted}`;
                        }
                        netDiffHtml += `<div class="${colorClass} font-weight-bold" style="white-space:nowrap; margin-bottom: 2px;">${sign} ${u.unit}</div>`;
                    });
                } else {
                    missingHtml = '<span class="text-muted">—</span>';
                    surplusHtml = '<span class="text-muted">—</span>';
                    netDiffHtml = '<span class="text-muted">—</span>';
                }

                summaryHtml += `
                    <tr>
                        <td class="font-weight-bold text-center">Tháng ${m.month}</td>
                        <td class="text-center font-weight-bold text-teal">${m.audit_count} đợt</td>
                        <td class="text-center text-danger font-weight-bold">${missingHtml}</td>
                        <td class="text-center text-primary font-weight-bold">${surplusHtml}</td>
                        <td class="text-right font-weight-bold">${netDiffHtml}</td>
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
                                        <th>Bill Kiểm Kê</th>
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
    if (!confirm('Bạn có chắc chắn muốn BẮT ĐẦU đợt kiểm kê mới?\n\n⚠️ LƯU Ý: Vui lòng đảm bảo các cây vải chờ trả nhà cung cấp đã được di chuyển vào "Kệ Dự Định Hoàn Vải" trên hệ thống trước khi bắt đầu!')) return;
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
            if (res.pending_returns) {
                _kkShowBlockedReturnsModal(res.pending_returns);
            } else if (res.active_cuts) {
                _kkShowBlockedCutsModal(res.active_cuts);
            } else if (res.unassigned_free_le) {
                _kkShowBlockedUnassignedLeModal(res.unassigned_free_le);
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
        // Handle blocked cuts, returns or unassigned retail rolls (409 Conflict)
        if (e.status === 409 && e.data) {
            if (e.data.pending_returns) {
                _kkShowBlockedReturnsModal(e.data.pending_returns);
            } else if (e.data.active_cuts) {
                _kkShowBlockedCutsModal(e.data.active_cuts);
            } else if (e.data.unassigned_free_le) {
                _kkShowBlockedUnassignedLeModal(e.data.unassigned_free_le);
            } else {
                showToast(e.message || 'Không thể bắt đầu kiểm kê.', 'error');
            }
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

// ========== SHOW MODAL FOR BLOCKED RETURNS ==========
function _kkShowBlockedReturnsModal(pendingReturns) {
    let pendingRowsHtml = '';

    if (pendingReturns && pendingReturns.length > 0) {
        pendingReturns.forEach((r, idx) => {
            const dateStr = r.return_requested_at ? new Date(r.return_requested_at).toLocaleDateString('vi-VN') : '—';
            pendingRowsHtml += `
                <tr>
                    <td class="text-center font-weight-bold">${idx + 1}</td>
                    <td class="font-weight-bold">${r.material_name || '—'}</td>
                    <td><span class="badge badge-secondary" style="font-size:11px; background-color:#f1f5f9; color:#334155; border: 1px solid #e2e8f0;">${r.color_name || '—'}</span></td>
                    <td class="font-weight-bold text-teal">${r.weight ? r.weight + ' kg' : '—'}</td>
                    <td><span class="badge badge-info" style="font-size:11px;">${r.requester_name || '—'}</span></td>
                    <td><span class="text-muted" style="font-size:11px;">${dateStr}</span></td>
                </tr>
            `;
        });
    }

    let bodyHtml = '';
    if (pendingRowsHtml) {
        bodyHtml += `
            <div style="font-weight: 800; color: #b91c1c; font-size: 13px; margin-top: 10px; margin-bottom: 6px;">⚠️ YÊU CẦU LẬP BILL HOÀN VẢI TRƯỚC (CHƯA XỬ LÝ)</div>
            <div style="max-height:220px; overflow-y:auto; border:1px solid #f1f5f9; border-radius:8px; margin-bottom: 16px;">
                <table class="table" style="font-size:11px; margin:0;">
                    <thead>
                        <tr style="background:#fafafa;">
                            <th style="width:40px;" class="text-center">STT</th>
                            <th>Chất Liệu</th>
                            <th>Màu Sắc</th>
                            <th>Cân Nặng</th>
                            <th>Người Gửi</th>
                            <th>Ngày Gửi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pendingRowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    }

    const isMobile = window.location.pathname.startsWith('/m/');
    const redirectUrl = isMobile ? '/m/nhapxuathoanvai' : '/nhapxuathoanvai';

    const modalHtml = `
        <div class="kk-modal-overlay" id="kkBlockedReturnsModal">
            <div class="kk-modal" style="max-width:680px; width:95%;">
                <div class="kk-modal-header" style="background:#fef2f2; border-bottom:1px solid #fee2e2;">
                    <div class="kk-modal-title" style="color:#b91c1c; display:flex; align-items:center; gap:8px;">
                        <span>🚫 KHÔNG THỂ BẮT ĐẦU KIỂM KHO</span>
                    </div>
                    <button class="close" onclick="_kkCloseModal('kkBlockedReturnsModal')" style="font-size:24px; border:none; background:none;">&times;</button>
                </div>
                <div class="kk-modal-body">
                    <p style="font-size:13px; color:#475569; margin-bottom:16px; line-height:1.5;">
                        Hệ thống phát hiện có <strong>yêu cầu lập bill hoàn vải chưa xử lý</strong> từ bộ phận kho. Kế toán bắt buộc phải xử lý hết trước khi tiếp tục thực hiện kiểm kho.
                    </p>
                    ${bodyHtml}
                </div>
                <div class="kk-modal-footer" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <a href="${redirectUrl}" class="kk-btn kk-btn-primary" style="text-decoration:none; display:inline-flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#e53e3e,#c53030); border:none; color:#fff; font-weight:700;">
                        🔄 Đi đến Nhập Xuất Hoàn Vải
                    </a>
                    <button class="kk-btn kk-btn-secondary" onclick="_kkCloseModal('kkBlockedReturnsModal')">Đóng</button>
                </div>
            </div>
        </div>
    `;
    
    // Append to body
    const div = document.createElement('div');
    div.id = 'kkBlockedReturnsModalContainer';
    div.innerHTML = modalHtml;
    document.body.appendChild(div);
}

// ========== SHOW MODAL FOR BLOCKED UNASSIGNED LE ROLLS ==========
function _kkShowBlockedUnassignedLeModal(rolls) {
    let rowsHtml = '';
    rolls.forEach((r, idx) => {
        rowsHtml += `
            <tr>
                <td class="text-center font-weight-bold" style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${idx + 1}</td>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;"><span class="badge badge-warning" style="font-size:11px; background-color:#fffbeb; color:#b45309; border: 1px solid #fde68a; padding: 3px 6px; border-radius: 4px;">${r.roll_code || '—'}</span></td>
                <td class="font-weight-bold" style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${r.material_name || '—'}</td>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;"><span class="badge badge-secondary" style="font-size:11px; background-color:#f1f5f9; color:#334155; border: 1px solid #e2e8f0; padding: 3px 6px; border-radius: 4px;">${r.color_name || '—'}</span></td>
                <td class="font-weight-bold text-teal" style="padding: 8px; border-bottom: 1px solid #f1f5f9; color:#0d9488;">${r.weight ? r.weight + ' kg' : '—'}</td>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;"><span class="badge badge-info" style="font-size:11px; background-color:#ecfeff; color:#0891b2; border: 1px solid #cffafe; padding: 3px 6px; border-radius: 4px;">${r.warehouse_name || '—'}</span></td>
            </tr>
        `;
    });

    const isMobile = window.location.pathname.startsWith('/m/');
    const redirectUrl = isMobile ? '/m/quanlykhovai' : '/quanlykhovai';

    const modalHtml = `
        <div class="kk-modal-overlay" id="kkBlockedUnassignedLeModal">
            <div class="kk-modal" style="max-width:680px; width:95%; background:#fff; border-radius:12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); overflow:hidden;">
                <div class="kk-modal-header" style="background:#fffbeb; border-bottom:1px solid #fef3c7; padding: 16px 20px; display:flex; justify-content:space-between; align-items:center;">
                    <div class="kk-modal-title" style="color:#b45309; font-size:16px; font-weight:800; display:flex; align-items:center; gap:8px;">
                        <span>⚠️ KHÔNG THỂ BẮT ĐẦU KIỂM KHO</span>
                    </div>
                    <button class="close" onclick="_kkCloseModal('kkBlockedUnassignedLeModal')" style="font-size:24px; border:none; background:none; cursor:pointer; color:#94a3b8;">&times;</button>
                </div>
                <div class="kk-modal-body" style="padding: 20px;">
                    <p style="font-size:13px; color:#475569; margin-bottom:16px; line-height:1.5;">
                        Hệ thống phát hiện có <strong>cây lẻ chưa được xếp lên kệ</strong> (trong mục 🛠️ Cây Lẻ Cần Xử Lý Kho). Bạn bắt buộc phải xếp hết các cây lẻ này lên vị trí kệ trước khi bắt đầu đợt kiểm kê mới:
                    </p>
                    <div style="max-height:220px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; margin-bottom: 16px;">
                        <table class="table" style="font-size:11px; margin:0; width:100%; border-collapse:collapse; text-align:left;">
                            <thead>
                                <tr style="background:#f8fafc;">
                                    <th style="width:40px; padding:8px; border-bottom: 1px solid #e2e8f0;" class="text-center">STT</th>
                                    <th style="padding:8px; border-bottom: 1px solid #e2e8f0;">Mã Cây Vải</th>
                                    <th style="padding:8px; border-bottom: 1px solid #e2e8f0;">Chất Liệu</th>
                                    <th style="padding:8px; border-bottom: 1px solid #e2e8f0;">Màu Sắc</th>
                                    <th style="padding:8px; border-bottom: 1px solid #e2e8f0;">Cân Nặng</th>
                                    <th style="padding:8px; border-bottom: 1px solid #e2e8f0;">Kho Vải</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="kk-modal-footer" style="padding: 16px 20px; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <a href="${redirectUrl}" class="kk-btn kk-btn-primary" style="text-decoration:none; display:inline-flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#f59e0b,#d97706); border:none; color:#fff; font-weight:700; padding:8px 16px; border-radius:6px; font-size:12px; cursor:pointer;">
                        🚚 Đi đến Quản Lý Nhập Kho Vải
                    </a>
                    <button class="kk-btn kk-btn-secondary" onclick="_kkCloseModal('kkBlockedUnassignedLeModal')" style="padding:8px 16px; border-radius:6px; border:1px solid #cbd5e1; background:#fff; color:#475569; font-size:12px; cursor:pointer;">Đóng</button>
                </div>
            </div>
        </div>
    `;

    // Append to body
    const div = document.createElement('div');
    div.id = 'kkBlockedUnassignedLeModalContainer';
    div.innerHTML = modalHtml;
    document.body.appendChild(div);
    _kkUpdateBodyScroll();
}

function _kkUpdateBodyScroll() {
    var hasOpenModal = document.getElementById('kkRollOriginModal') || 
                       document.getElementById('_fabDetailOv') || 
                       document.getElementById('_bnhImgOv') || 
                       document.getElementById('_fabViolationOv') ||
                       document.getElementById('kkViewSurplusModal') ||
                       document.getElementById('kkWeightInputModal') ||
                       document.getElementById('kkMissingModal') ||
                       document.getElementById('kkBlockedCutsModal') ||
                       document.getElementById('kkBlockedReturnsModal') ||
                       document.getElementById('kkBlockedUnassignedLeModal') ||
                       document.getElementById('kkFinishConfirmModal') ||
                       document.getElementById('kkMaterialSelectModal');
    if (hasOpenModal) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}
window._kkUpdateBodyScroll = _kkUpdateBodyScroll;

function _kkCloseModal(id) {
    const el = document.getElementById(id + 'Container') || document.getElementById(id);
    if (el) el.remove();
    _kkUpdateBodyScroll();
}

// ========== AUDITING WORKFLOW VIEW ==========
async function _kkRenderAudit(content) {
    if (!_kk.tree) {
        _kk.tree = await apiCall('/api/stockcheck/tree');
    }
    const isGiamDoc = (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc');
    const cleanActiveLoc = (_kk.activeLocation || '').replace(/^📍\s*/, '').trim().toLowerCase();
    const isSurplusBlocked = ['kệ dự định hoàn vải', 'chưa xếp kệ - cây nguyên', 'chưa xếp kệ - cây lẻ', 'kệ 3d thiện linh'].includes(cleanActiveLoc);
    const activeShelf = _kk.shelves ? _kk.shelves.find(s => s.name === _kk.activeLocation) : null;
    const activeMatsList = activeShelf ? activeShelf.materials_list : '';
    
    // Progress calculation
    const totalRolls = _kk.tree.totals ? _kk.tree.totals.total_rolls || 0 : 0;
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
                    <div style="display:flex; align-items:center; gap:4px; min-width:0; flex:1;">
                        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:700;" title="${s.name}">
                            📍 ${s.name}
                        </span>
                        ${(s.shelf_position || (['chưa xếp kệ - cây nguyên', 'chưa xếp kệ - cây lẻ'].includes(s.name.trim().toLowerCase()) ? 'Hầm / Phòng Cắt' : '')) ? `<span style="font-size:9px; font-weight:800; color:#b45309; background:#fef3c7; border:1px solid #fde68a; padding:1px 5px; border-radius:4px; flex-shrink:0;">📍 ${s.shelf_position || 'Hầm / Phòng Cắt'}</span>` : ''}
                    </div>
                    <span class="kk-badge" style="flex-shrink:0;">${s.roll_count} cây</span>
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
                    <td class="text-center" style="font-size: 13px; color: #0f766e; font-weight: 800;">${groupIdx} ${chevron}</td>
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
                    const sessionStart = _kk.session ? new Date(_kk.session.started_at) : null;
                    const isSurplus = r.source === 'kiem_kho_du' && sessionStart && new Date(r.created_at) >= sessionStart;
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
                    const isReturnRoll = r.location && r.location.toLowerCase().includes('dự định hoàn vải');
                    const isUnassignedNguyen = r.is_unassigned && (Number(r.system_weight) >= Number(r.original_weight));
                    const isSpecialShelf = isReturnRoll || isUnassignedNguyen;

                    if (isSurplus) {
                        diffLabel = `<span class="kk-diff-badge ok" style="background:#f3e8ff; color:#6b21a8; border:1px solid #c084fc;">💜 Cây thừa</span>`;
                    } else if (isReturnRoll) {
                        diffLabel = `<span class="kk-diff-badge ok" style="background:#e0f2fe; color:#0369a1; border:1px solid #7dd3fc;">🔄 Chờ hoàn NCC</span>`;
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
                    } else if (isSpecialShelf) {
                        if (hasChecked) {
                            actionHtml = `
                                <button class="kk-action-btn" style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #10b981; padding: 4px 10px; border-radius: 6px; font-weight: 800; width: auto; height: 32px; display: inline-flex; align-items: center; gap: 4px; font-size: 11px;" onclick="event.stopPropagation(); _kkToggleReturnRollCheck(${r.roll_id}, '${r.roll_code}', true, ${isReturnRoll})" title="Hủy xác nhận có cây hoàn/cây nguyên chưa xếp kệ">
                                    ✅ Có cây này (Hủy?)
                                </button>
                            `;
                        } else {
                            actionHtml = `
                                <button class="kk-action-btn" style="background: rgba(217, 119, 6, 0.15); border: 1px solid #d97706; color: #ea580c; padding: 4px 10px; border-radius: 6px; font-weight: 800; width: auto; height: 32px; display: inline-flex; align-items: center; gap: 4px; font-size: 11px;" onclick="event.stopPropagation(); _kkToggleReturnRollCheck(${r.roll_id}, '${r.roll_code}', false, ${isReturnRoll})" title="Xác nhận có cây hoàn/cây nguyên chưa xếp kệ trong kho">
                                    🔍 Kiểm xem có cây này không
                                </button>
                            `;
                        }
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
                            <td class="text-center text-primary" style="font-size:12px;">
                                ${_kkCanViewBill() ? (
                                    r.source_import_id ? `
                                        <span style="cursor:pointer; color:#3b82f6; text-decoration:underline; font-weight:700;" onclick="event.stopPropagation(); _kkOpenImportBill(${r.source_import_id})" title="Nhấp để xem chi tiết bill nhập vải">
                                            ${Number(r.system_weight || 0).toLocaleString('vi-VN')} kg
                                        </span>
                                    ` : `
                                        <span style="cursor:pointer; color:#7c3aed; text-decoration:underline; font-weight:700;" onclick="event.stopPropagation(); _kkOpenRollOrigin(${r.roll_id})" title="Nhấp để xem nguồn gốc cây vải thừa/tự tạo">
                                            ${Number(r.system_weight || 0).toLocaleString('vi-VN')} kg
                                        </span>
                                    `
                                ) : `
                                    <span>${Number(r.system_weight || 0).toLocaleString('vi-VN')} kg</span>
                                `}
                            </td>
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
                        ${isGiamDoc ? `
                        <button class="kk-btn kk-btn-danger" style="padding:6px 12px; font-size:12px;" onclick="_kkAbortSession()">
                            🚫 Hủy Đợt Kiểm
                        </button>
                        ` : ''}
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
                            <div style="font-size:11px; color:#64748b; display:flex; align-items:center; gap:8px; margin-top:2px;">
                                <span>Tổng số trên kệ: ${_kk.rolls.length} cây</span>
                                ${activeMatsList ? `
                                    <span style="color:#cbd5e1;">|</span>
                                    ${_kk.materialFilter ? `
                                        <span style="color:#15803d; cursor:pointer; font-weight:800; background:#d1fae5; border:1px solid #a7f3d0; padding:2px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:4px; transition:all 0.15s;" onmouseover="this.style.background='#a7f3d0'" onmouseout="this.style.background='#d1fae5'" onclick="_kkOpenMaterialsSelector()" title="Bấm để lọc theo chất liệu">
                                            📦 Đang lọc: ${_kk.materialFilter} (Bấm để đổi) ▼
                                        </span>
                                    ` : `
                                        <span style="color:#0d9488; cursor:pointer; font-weight:700; background:#f0fdfa; border:1px solid #ccfbf1; padding:2px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:4px; transition:all 0.15s;" onmouseover="this.style.background='#ccfbf1'" onmouseout="this.style.background='#f0fdfa'" onclick="_kkOpenMaterialsSelector()" title="Bấm để lọc theo chất liệu">
                                            📦 Chất liệu: ${activeMatsList} ▼
                                        </span>
                                    `}
                                ` : ''}
                            </div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <input id="kkSearchRoll" placeholder="🔍 Tìm mã cây, màu, chất liệu..." style="padding:6px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:12px; width:220px; outline:none;" value="${_kk.search}" oninput="_kkSearchRolls(this.value)">
                            ${isSurplusBlocked ? '' : `
                            <button class="kk-btn kk-btn-primary" style="padding:6px 12px; font-size:12px;" onclick="_kkOpenAddSurplusModal()">
                                ➕ Thêm Cây Thừa
                            </button>
                            `}
                            ${progressPct === 100 ? `
                            <button class="kk-btn kk-btn-primary" style="padding:6px 16px; font-size:12px; background:linear-gradient(135deg, #059669, #10b981);" onclick="_kkOpenFinishConfirmModal()">
                                ✅ Hoàn Thành Kiểm Kho
                            </button>
                            ` : ''}
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
    _kk.materialFilter = '';
    await _kkLoadShelves();
    const content = _kkGetContainer();
    if (content) {
        _kkRenderMain(content);
    }
}

// ========== SELECT SHELF ==========
async function _kkSelectShelf(shelfName) {
    _kk.activeLocation = shelfName;
    _kk.materialFilter = '';
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

// Close color dropdown lists when clicking outside
document.addEventListener('click', function(e) {
    const container = document.getElementById('kkSurplusColorDropdownContainer');
    const list = document.getElementById('kkSurplusColorDropdownList');
    if (container && list && !container.contains(e.target)) {
        list.style.display = 'none';
    }
    
    const mContainer = document.getElementById('mSurplusColorDropdownContainer');
    const mList = document.getElementById('mSurplusColorDropdownList');
    if (mContainer && mList && !mContainer.contains(e.target)) {
        mList.style.display = 'none';
    }
});

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

async function _kkToggleReturnRollCheck(rollId, rollCode, isCurrentlyChecked, isReturnRoll = false) {
    const rollTypeLabel = isReturnRoll ? 'cây hoàn' : 'cây nguyên';
    const confirmMsg = isCurrentlyChecked 
        ? `Xác nhận hủy kiểm tra ${rollTypeLabel} này (mã ${rollCode})?`
        : `Xác nhận có ${rollTypeLabel} này (mã ${rollCode}) trong kho?`;
    
    if (!confirm(confirmMsg)) return;

    try {
        await apiCall('/api/stockcheck/check/' + rollId, 'POST', { action: 'toggle_check' });
        showToast(isCurrentlyChecked ? `↩️ Đã hủy kiểm ${rollTypeLabel}` : `✅ Đã xác nhận có ${rollTypeLabel}`, 'success');
        
        // Reload
        const treeRes = await apiCall('/api/stockcheck/tree');
        _kk.tree = treeRes;
        await _kkLoadRolls();
        const content = _kkGetContainer();
        if (content) _kkRenderMain(content);
    } catch(e) {
        showToast(e.message || 'Lỗi cập nhật', 'error');
    }
}

// 2. Mark Missing (Báo mất)
async function _kkMarkMissing(rollId, rollCode) {
    const r = _kk.rolls.find(item => item.roll_id === rollId);
    if (r && r.location && r.location.toLowerCase().includes('dự định hoàn vải')) {
        showToast('⚠️ Cây vải đang trong quá trình hoàn trả NCC, không được thay đổi số liệu.', 'warning');
        return;
    }
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
    if (r && r.location && r.location.toLowerCase().includes('dự định hoàn vải')) {
        showToast('⚠️ Cây vải đang trong quá trình hoàn trả NCC, không được thay đổi số liệu.', 'warning');
        return;
    }
    const colorName = r ? r.color_name : '—';
    const materialName = r ? r.material_name : '—';
    const isNguyen = r ? (Number(r.system_weight) >= Number(r.original_weight)) : false;

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
                            <div><strong>Phân loại:</strong> ${isNguyen ? `<span style="background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; padding:2px 8px; border-radius:6px; font-weight:700; display:inline-flex; align-items:center; gap:4px; font-size:11px;">🌲 Cây Nguyên</span>` : `<span style="background:#fff7ed; color:#ea580c; border:1px solid #ffedd5; padding:2px 8px; border-radius:6px; font-weight:700; display:inline-flex; align-items:center; gap:4px; font-size:11px;">✂️ Cây Lẻ</span>`}</div>
                            <div><strong>Tồn hệ thống:</strong> <span style="color:#2563eb; font-weight:800; font-size:13px; background:#eff6ff; padding:2px 8px; border-radius:6px; margin-left:4px; border:1px solid #bfdbfe; display:inline-flex; align-items:center;">${systemWeight} kg</span></div>
                        </div>
                    </div>

                    <div class="kk-form-group" style="margin-bottom:12px;">
                        <label class="kk-form-label">Cân nặng thực tế (kg) <span style="color:#ef4444;">*</span></label>
                        <input type="number" id="kkInputActualW" class="kk-form-input" placeholder="Nhập số kg thực tế..." step="0.1" min="0.1" oninput="_kkCalculateDifference(${systemWeight})">
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
    if (isNaN(actual) || actual <= 0) {
        diffEl.innerHTML = '<span style="color:#ef4444; font-weight:600;">Cân nặng phải lớn hơn 0</span>';
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
    if (!valStr || isNaN(Number(valStr)) || Number(valStr) <= 0) {
        showToast('Trọng lượng phải lớn hơn 0', 'error');
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
    _kkOpenFinishConfirmModal();
}

async function _kkOpenFinishConfirmModal() {
    try {
        const preview = await apiCall('/api/stockcheck/finish-preview', 'GET');
        if (!preview.success) {
            showToast(preview.error || 'Không thể tải thông tin xem trước.', 'error');
            return;
        }

        const initialWeight = Number(preview.initial_weight).toLocaleString('vi-VN');
        const actualWeight = Number(preview.actual_weight).toLocaleString('vi-VN');
        const diffWeight = Number(Math.abs(preview.net_difference)).toLocaleString('vi-VN');
        const missingWeight = Number(preview.missing_weight).toLocaleString('vi-VN');
        const surplusWeight = Number(preview.surplus_weight).toLocaleString('vi-VN');

        let diffClass = 'text-success';
        let diffSign = 'Khớp hoàn toàn';
        if (preview.net_difference > 0) {
            diffClass = 'text-danger';
            diffSign = `Hao hụt -${diffWeight} kg`;
        } else if (preview.net_difference < 0) {
            diffClass = 'text-primary';
            diffSign = `Dư +${diffWeight} kg`;
        }

        let unitsHtml = '';
        if (preview.by_unit && preview.by_unit.length > 0) {
            preview.by_unit.forEach(u => {
                const uInitW = Number(u.initial_weight).toLocaleString('vi-VN');
                const uActW = Number(u.actual_weight).toLocaleString('vi-VN');
                const uMissW = Number(u.missing_weight).toLocaleString('vi-VN');
                const uSurpW = Number(u.surplus_weight).toLocaleString('vi-VN');
                const uDiffW = Number(Math.abs(u.net_difference)).toLocaleString('vi-VN');

                let title = `KIỂM KÊ KHO VẢI ${u.unit.toUpperCase()}`;
                if (u.unit.toLowerCase() === 'mét') title = 'KIỂM KÊ KHO VẢI MÉT';
                if (u.unit.toLowerCase() === 'cái') title = 'KIỂM KÊ KHO SẴN';

                let uDiffStyle = 'color: #10b981; font-weight: bold;';
                let uDiffText = 'Khớp hoàn toàn';
                if (u.net_difference > 0) {
                    uDiffText = `Hao hụt -${uDiffW} ${u.unit}`;
                    uDiffStyle = 'color: #ef4444; font-weight: bold;';
                } else if (u.net_difference < 0) {
                    uDiffText = `Dư +${uDiffW} ${u.unit}`;
                    uDiffStyle = 'color: #3b82f6; font-weight: bold;';
                }

                unitsHtml += `
                    <div style="margin-bottom: 24px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 20px;">
                        <!-- Tiêu đề kho -->
                        <div style="font-weight: 800; font-size: 13px; color: #1e293b; margin-bottom: 12px; text-transform: uppercase; border-left: 4px solid #3b82f6; padding-left: 8px; letter-spacing: 0.5px;">
                            ${title}
                        </div>

                        <!-- 2 cột tổng quan (Tồn HT & Thực tế) -->
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
                            <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px 10px; border-radius:8px; text-align:center;">
                                <div style="color:#64748b; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Tồn Hệ Thống</div>
                                <div style="font-size:18px; font-weight:900; color:#0f172a; margin-top:4px;">${uInitW} ${u.unit}</div>
                                <div style="color:#94a3b8; font-size:10px; margin-top:2px;">(${u.initial_rolls} cây)</div>
                            </div>
                            <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:12px 10px; border-radius:8px; text-align:center;">
                                <div style="color:#166534; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Kiểm Thực Tế</div>
                                <div style="font-size:18px; font-weight:900; color:#15803d; margin-top:4px;">${uActW} ${u.unit}</div>
                                <div style="color:#166534; font-size:10px; margin-top:2px;">(${u.checked_rolls} cây)</div>
                            </div>
                        </div>

                        <!-- Chi tiết kết quả kiểm kê -->
                        <div style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; background: #fff;">
                            <div style="background:#f8fafc; padding:8px 12px; font-weight:700; border-bottom:1px solid #e2e8f0; color:#475569; font-size:10px; text-transform:uppercase; letter-spacing:0.5px;">
                                Chi Tiết Kết Quả Kiểm Kê
                            </div>
                            <div style="padding:10px 12px; display:flex; flex-direction:column; gap:8px; font-size:12px; color: #334155;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span>❌ Số cây báo mất:</span>
                                    <span style="font-weight:700; color:#ef4444;">${u.missing_rolls} cây (${uMissW} ${u.unit})</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span>➕ Số cây thừa mới:</span>
                                    <span style="font-weight:700; color:#3b82f6;">${u.surplus_rolls} cây (${uSurpW} ${u.unit})</span>
                                </div>
                                <div style="border-top:1px dashed #e2e8f0; margin-top:4px; padding-top:8px; display:flex; justify-content:space-between; align-items:center; font-size:13px;">
                                    <span style="font-weight:700; color:#0f172a;">⚖️ Chênh lệch ròng:</span>
                                    <span style="${uDiffStyle}">${uDiffText}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            // remove last border
            unitsHtml = unitsHtml.replace(/border-bottom: 1px dashed #e2e8f0; padding-bottom: 20px;(?=[^;]*<\/div>\s*$)/g, '');
        } else {
            unitsHtml = `
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:16px;">
                    <div style="background:#f8fafc; border:1px solid #f1f5f9; padding:10px; border-radius:8px; text-align:center;">
                        <div style="color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase;">Tồn Hệ Thống Đầu Kì</div>
                        <div style="font-size:18px; font-weight:900; color:#1e293b; margin-top:4px;">${initialWeight} kg</div>
                        <div style="color:#94a3b8; font-size:11px; margin-top:2px;">(${preview.initial_rolls} cây)</div>
                    </div>
                    <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:10px; border-radius:8px; text-align:center;">
                        <div style="color:#166534; font-size:11px; font-weight:700; text-transform:uppercase;">Kiểm Thực Tế Cuối Kì</div>
                        <div style="font-size:18px; font-weight:900; color:#14532d; margin-top:4px;">${actualWeight} kg</div>
                        <div style="color:#166534; font-size:11px; margin-top:2px;">(${preview.checked_rolls} cây)</div>
                    </div>
                </div>

                <div style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; margin-bottom:16px;">
                    <div style="background:#f8fafc; padding:8px 12px; font-weight:700; border-bottom:1px solid #e2e8f0; color:#475569; font-size:11px; text-transform:uppercase;">
                        Chi Tiết Kết Quả Kiểm Kê
                    </div>
                    <div style="padding:12px; display:flex; flex-direction:column; gap:8px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span>❌ Số cây báo mất:</span>
                            <span style="font-weight:700; color:#ef4444;">${preview.missing_rolls} cây (${missingWeight} kg)</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span>➕ Số cây thừa mới:</span>
                            <span style="font-weight:700; color:#3b82f6;">${preview.surplus_rolls} cây (${surplusWeight} kg)</span>
                        </div>
                        <div style="border-top:1px dashed #e2e8f0; margin-top:4px; padding-top:8px; display:flex; justify-content:space-between; align-items:center; font-size:14px;">
                            <span style="font-weight:700; color:#1e293b;">⚖️ Chênh lệch ròng:</span>
                            <span class="${diffClass}" style="font-weight:900;">${diffSign}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        const modalHtml = `
            <div class="kk-modal-overlay" id="kkFinishConfirmModal">
                <div class="kk-modal" style="max-width:500px; border-radius:12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);">
                    <div class="kk-modal-header" style="background:#f8fafc; border-bottom:1px solid #e2e8f0; padding:16px 20px;">
                        <div class="kk-modal-title" style="font-weight:800; font-size:16px; color:#0f172a; display:flex; align-items:center; gap:8px;">
                            📋 XÁC NHẬN CHỐT SỔ KIỂM KHO
                        </div>
                        <button class="close" onclick="_kkCloseModal('kkFinishConfirmModal')" style="border:none; background:none; font-size:24px; cursor:pointer;">&times;</button>
                    </div>
                    <div class="kk-modal-body" style="padding:20px; color:#334155; font-size:13px; line-height:1.6;">
                        <div style="background:#eff6ff; border:1px solid #bfdbfe; color:#1e40af; padding:12px; border-radius:8px; margin-bottom:16px; font-weight:600; display:flex; align-items:center; gap:8px;">
                            ⏰ <span style="font-weight:700;">Thời gian hoàn thành:</span> ${preview.time}
                        </div>

                        ${unitsHtml}

                        <div style="color:#ef4444; background:#fef2f2; border:1px solid #fee2e2; padding:10px; border-radius:8px; font-size:12px; font-weight:600;">
                            ⚠️ LƯU Ý: Sau khi bấm xác nhận, hệ thống sẽ chốt sổ vĩnh viễn, tự động xuất/nhập hao hụt và mở khóa kho vải. Hành động này không thể hoàn tác!
                        </div>
                    </div>
                    <div class="kk-modal-footer" style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:12px 20px; display:flex; justify-content:flex-end; gap:8px; border-bottom-left-radius:12px; border-bottom-right-radius:12px;">
                        <button class="kk-btn kk-btn-secondary" onclick="_kkCloseModal('kkFinishConfirmModal')" style="padding:8px 16px; font-size:13px; font-weight:600;">Hủy</button>
                        <button class="kk-btn" onclick="_kkConfirmFinishSession()" style="padding:8px 20px; font-size:13px; font-weight:700; background:linear-gradient(135deg,#059669,#10b981); color:#fff; border:none; border-radius:6px; cursor:pointer;">Xác Nhận Hoàn Thành</button>
                    </div>
                </div>
            </div>
        `;

        const oldContainer = document.getElementById('kkFinishConfirmModalContainer');
        if (oldContainer) oldContainer.remove();

        const div = document.createElement('div');
        div.id = 'kkFinishConfirmModalContainer';
        div.innerHTML = modalHtml;
        document.body.appendChild(div);
    } catch (e) {
        showToast(e.message || 'Lỗi tải thông tin xem trước.', 'error');
    }
}

async function _kkConfirmFinishSession() {
    _kkCloseModal('kkFinishConfirmModal');
    
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
                        <div style="position: relative;" id="kkSurplusColorDropdownContainer">
                            <input type="text" id="kkSurplusColorSearch" class="kk-form-input" placeholder="-- Click để chọn / Gõ để tìm màu --" readonly style="cursor: pointer; background: #fff; color: #1e293b; padding-right: 30px;" onclick="_kkToggleColorDropdown()">
                            <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #64748b;">▼</span>
                            <input type="hidden" id="kkSurplusColorSelect" value="">
                            <div id="kkSurplusColorDropdownList" style="display: none; position: absolute; top: 100%; left: 0; right: 0; max-height: 250px; overflow-y: auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-top: 4px;">
                                <div style="padding: 8px; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; background: #ffffff;">
                                    <input type="text" id="kkSurplusColorSearchFilter" class="kk-form-input" placeholder="🔎 Tìm màu..." style="background: #f8fafc; color: #1e293b; font-size: 13px;" oninput="_kkOnSurplusColorSearchInput(this.value)">
                                </div>
                                <div id="kkSurplusColorItemsContainer"></div>
                            </div>
                        </div>
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
    if (posEl) {
        const cleanName = shelfName.replace(/^📍\s*/, '').trim().toLowerCase();
        const fallbackPos = ['chưa xếp kệ - cây nguyên', 'chưa xếp kệ - cây lẻ'].includes(cleanName) ? 'Hầm / Phòng Cắt' : 'Chưa cấu hình';
        posEl.textContent = shelf.shelf_position || fallbackPos;
    }
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

let _kkSurplusLoadedColors = [];

function _kkRenderColorOptions(filterText = '') {
    const container = document.getElementById('kkSurplusColorItemsContainer');
    if (!container) return;
    
    const query = filterText.toLowerCase().trim();
    const filtered = _kkSurplusLoadedColors.filter(c => {
        return c.color_name.toLowerCase().includes(query);
    });
    
    let html = '';
    if (filtered.length === 0) {
        html = `<div style="padding: 10px 12px; color: #64748b; font-size: 13px; text-align: center;">Không tìm thấy màu phù hợp</div>`;
    } else {
        filtered.forEach(c => {
            const suffix = c.is_active ? '' : ' (Không bán)';
            html += `
                <div class="kk-color-item" 
                     onclick="_kkSelectColorItem('${c.id}', '${c.color_name}')"
                     onmouseover="this.style.background='#f1f5f9'"
                     onmouseout="this.style.background='transparent'"
                     style="padding: 10px 12px; cursor: pointer; color: #1e293b; font-size: 13px; border-bottom: 1px solid #f1f5f9; transition: background 0.2s;">
                     ${c.color_name}${suffix}
                </div>
            `;
        });
    }
    container.innerHTML = html;
}
window._kkRenderColorOptions = _kkRenderColorOptions;

function _kkOnSurplusColorSearchInput(val) {
    _kkRenderColorOptions(val);
}
window._kkOnSurplusColorSearchInput = _kkOnSurplusColorSearchInput;

function _kkToggleColorDropdown() {
    const matVal = document.getElementById('kkSurplusMatSelect').value;
    if (!matVal) {
        showToast('Vui lòng chọn chất liệu vải trước', 'warning');
        return;
    }
    
    const list = document.getElementById('kkSurplusColorDropdownList');
    const filterInput = document.getElementById('kkSurplusColorSearchFilter');
    if (!list) return;
    
    if (list.style.display === 'none') {
        list.style.display = 'block';
        if (filterInput) {
            filterInput.value = '';
            filterInput.focus();
        }
        _kkRenderColorOptions('');
    } else {
        list.style.display = 'none';
    }
}
window._kkToggleColorDropdown = _kkToggleColorDropdown;

function _kkSelectColorItem(id, name) {
    const colorSelect = document.getElementById('kkSurplusColorSelect');
    const searchInput = document.getElementById('kkSurplusColorSearch');
    const dropdownList = document.getElementById('kkSurplusColorDropdownList');
    
    if (colorSelect) colorSelect.value = id;
    if (searchInput) searchInput.value = name;
    if (dropdownList) dropdownList.style.display = 'none';
    
    _kkValidateSurplusForm();
}
window._kkSelectColorItem = _kkSelectColorItem;

// On Material Selected in Surplus Form
async function _kkOnSurplusMatChange(val) {
    const searchFilter = document.getElementById('kkSurplusColorSearchFilter');
    const searchInput = document.getElementById('kkSurplusColorSearch');
    const colorSelect = document.getElementById('kkSurplusColorSelect');
    
    if (colorSelect) colorSelect.value = '';
    if (searchInput) searchInput.value = '';
    if (searchFilter) searchFilter.value = '';

    if (!val) {
        _kkSurplusLoadedColors = [];
        _kkRenderColorOptions('');
        return;
    }

    try {
        const res = await apiCall('/api/khovai/colors?include_inactive=true&mid=' + val);
        _kkSurplusLoadedColors = res.colors || [];
        _kkRenderColorOptions('');
    } catch(e) {
        console.error('Cannot load colors', e);
        _kkSurplusLoadedColors = [];
        _kkRenderColorOptions('');
    }
}
window._kkOnSurplusMatChange = _kkOnSurplusMatChange;

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
    
    let valid = mat && col && hasWeight && hasPhoto && hasType;
    
    if (valid) {
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
    
    // Update URL to include ?session_id=sessionId
    const url = new URL(window.location.href);
    url.searchParams.set('session_id', sessionId);
    window.history.pushState({ page: 'kiem-kho', view: 'report', sessionId: sessionId }, '', url.pathname + url.search);

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
        if (!_kk.historySessions || _kk.historySessions.length === 0) {
            await _kkLoadHistoryAndSummary();
        }

        const res = await apiCall('/api/stockcheck/sessions/' + _kk.selectedSessionId);
        _kk.selectedSessionData = res;
        
        const s = res.session;
        const items = res.items || [];
        
        // Categorize items
        const missing = items.filter(i => i.type === 'missing');
        const surplus = items.filter(i => i.type === 'surplus');
        const difference = items.filter(i => i.type === 'difference');
        const matched = items.filter(i => i.type === 'match' || i.type === 'return_confirm');

        // Calculations
        const totalSystemRolls = s.total_rolls || 0;
        const totalSystemWeight = Number(s.total_weight || 0);

        // Total loss weight (Mất cây + Hao hụt cân)
        const missingWeightSum = missing.reduce((sum, i) => sum + Number(i.system_weight || 0), 0);
        const weightLossDiff = difference.filter(i => Number(i.difference) > 0).reduce((sum, i) => sum + Number(i.difference || 0), 0);
        const totalLossWeight = missingWeightSum + weightLossDiff;

        // Surplus weight & count
        const surplusRollsCount = surplus.length;
        const surplusWeightSum = surplus.reduce((sum, i) => sum + Number(i.actual_weight || 0), 0);

        // Total surplus weight (Cây thừa + Dôi dư cân)
        const weightGainDiff = difference.filter(i => Number(i.difference) < 0).reduce((sum, i) => sum + Math.abs(Number(i.difference || 0)), 0);
        const totalSurplusWeight = surplusWeightSum + weightGainDiff;

        // Total checked rolls & weight (Intuitive ledger-based calculation to prevent display mismatches if some rolls were left unchecked)
        const totalCheckedWeight = totalSystemWeight - totalLossWeight + totalSurplusWeight;
        const totalCheckedRolls = totalSystemRolls - missing.length + surplus.length;

        // Dynamic Unit & Item Labels
        const unitLabel = (items.length > 0 && items[0].unit) ? items[0].unit.trim() : 'kg';
        let itemLabel = 'cây';
        let itemLabelCap = 'Cây';
        
        if (unitLabel.toLowerCase() === 'cái' || unitLabel.toLowerCase() === 'bộ' || unitLabel.toLowerCase() === 'chiếc' || unitLabel.toLowerCase() === 'sản phẩm') {
            itemLabel = 'sản phẩm';
            itemLabelCap = 'Sản phẩm';
        } else if (unitLabel.toLowerCase() === 'm' || unitLabel.toLowerCase() === 'mét') {
            itemLabel = 'cây';
            itemLabelCap = 'Cây';
        }

        const missingTitle = itemLabel === 'cây' ? 'Cây vải báo mất (Không tìm thấy)' : `${itemLabelCap} báo mất (Không tìm thấy)`;
        const surplusTitle = itemLabel === 'cây' ? 'Cây thừa mới phát hiện (Khai báo thêm)' : `${itemLabelCap} thừa mới phát hiện`;
        const diffTitle = itemLabel === 'cây' ? 'Hao hụt cân nặng của các cây còn lại' : `Hao hụt số lượng / kích thước`;
        const gainTitle = itemLabel === 'cây' ? 'Dôi dư cân nặng của các cây còn lại' : `Dôi dư số lượng / kích thước`;

        const netWeightDiff = totalCheckedWeight - totalSystemWeight;
        const netRollDiff = totalCheckedRolls - totalSystemRolls;
        
        const summaryHeader = itemLabel === 'cây' ? '📉 Tổng Hợp Chênh Lệch Nhóm Vải' : '📉 Tổng Hợp Chênh Lệch Nhóm Hàng';

        // Calculate Bill number
        const sorted = [..._kk.historySessions].sort((a, b) => new Date(a.finished_at) - new Date(b.finished_at));
        const yearCounters = {};
        const billNumbers = {};
        sorted.forEach(item => {
            if (!item.finished_at) return;
            const dateVn = new Date(new Date(item.finished_at).toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
            const y = dateVn.getFullYear();
            if (!yearCounters[y]) yearCounters[y] = 0;
            yearCounters[y]++;
            billNumbers[item.id] = `Bill #${yearCounters[y]} Kiểm Kê - ${y}`;
        });
        const billText = billNumbers[s.id] || '—';

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
            <div class="container-fluid kk-report-printable-area" style="padding: 24px; max-width: 1100px; margin: 0 auto;">
                <!-- Header -->
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;" class="d-print-none">
                    <div style="display: flex; gap: 8px;">
                        <button class="kk-btn kk-btn-secondary" style="padding:6px 12px; font-size:12px;" onclick="_kkGoBackToSetup()">
                            ⬅️ Quay Lại Lịch Sử
                        </button>
                        <button class="kk-btn kk-btn-primary" style="padding:6px 12px; font-size:12px; background:#16a34a; border-color:#16a34a; color:#fff;" onclick="_kkExportReportToExcel()">
                            📊 Xuất Excel Báo Cáo
                        </button>
                        <button class="kk-btn kk-btn-primary" style="padding:6px 12px; font-size:12px; background:#475569; border-color:#475569; color:#fff;" onclick="window.print()">
                            🖨️ In Báo Cáo
                        </button>
                    </div>
                    <div style="text-align:right;">
                        <h2 style="font-weight:900; margin:0; font-size:20px; color:#0f766e;">Báo Cáo Kiểm Kho Chi Tiết</h2>
                        <span style="font-size:12px; font-weight:700; color:#475569; display:block; margin:2px 0;">${billText}</span>
                        <span style="font-size:11px; color:#64748b;">Đợt kiểm ngày: ${formatVnDate(s.finished_at)}</span>
                    </div>
                </div>

                <!-- Print-only Title -->
                <div class="d-none d-print-block" style="text-align: center; margin-bottom: 24px;">
                    <h2 style="font-weight:900; margin:0; font-size:24px; color:#000;">BÁO CÁO CHI TIẾT PHIÊN KIỂM KHO</h2>
                    <h3 style="font-weight:800; margin:4px 0 0 0; font-size:18px; color:#334155;">(${billText})</h3>
                    <div style="font-size:12px; margin-top:6px;">Ngày chốt sổ: ${formatVnDateTime(s.finished_at)} | Người thực hiện: ${s.finished_by_name || 'Hệ thống'}</div>
                </div>

                <!-- Info Overview Grid -->
                <div class="d-print-block-custom" style="margin-bottom: 24px; display: flex; flex-direction: column; gap: 20px;">
                    <!-- Top Summary row of cards (3 cards) -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
                        
                        <!-- Card 1: Người chốt sổ -->
                        <div style="background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 16px;">
                            <div style="width: 48px; height: 48px; border-radius: 10px; background: rgba(99, 102, 241, 0.1); display: flex; align-items: center; justify-content: center; color: #6366f1; font-size: 22px;">
                                👤
                            </div>
                            <div>
                                <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Người chốt sổ</div>
                                <div style="font-weight: 800; font-size: 15px; color: #0f172a;">${s.finished_by_name || 'Hệ thống'}</div>
                                <span style="font-size: 10px; color: #6366f1; background: rgba(99, 102, 241, 0.1); padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-block; margin-top: 4px;">Quản lý kho</span>
                            </div>
                        </div>

                        <!-- Card 2: Tồn hệ thống -->
                        <div style="background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 16px;">
                            <div style="width: 48px; height: 48px; border-radius: 10px; background: rgba(15, 118, 110, 0.1); display: flex; align-items: center; justify-content: center; color: #0f766e; font-size: 22px;">
                                🗄️
                            </div>
                            <div>
                                <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Tồn hệ thống trước kiểm</div>
                                <div style="font-weight: 800; font-size: 15px; color: #0f766e;">${totalSystemWeight.toLocaleString('vi-VN')} ${unitLabel}</div>
                                <div style="font-size: 11px; color: #475569; font-weight: 600; margin-top: 4px;">📦 ${totalSystemRolls} ${itemLabel}</div>
                            </div>
                        </div>

                        <!-- Card 3: Thực tế sau kiểm -->
                        <div style="background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 16px;">
                            <div style="width: 48px; height: 48px; border-radius: 10px; background: rgba(16, 185, 129, 0.1); display: flex; align-items: center; justify-content: center; color: #10b981; font-size: 22px;">
                                ⚖️
                            </div>
                            <div>
                                <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Thực tế sau khi kiểm</div>
                                <div style="font-weight: 800; font-size: 15px; color: #10b981;">${totalCheckedWeight.toLocaleString('vi-VN')} ${unitLabel}</div>
                                <div style="font-size: 11px; color: #047857; font-weight: 600; margin-top: 4px;">✅ ${totalCheckedRolls} ${itemLabel}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Highlight Banner: Chênh lệch kiểm kê (MOST IMPORTANT - FULL WIDTH) -->
                    <div style="background: ${netWeightDiff > 0 ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' : netWeightDiff < 0 ? 'linear-gradient(135deg, #fff5f5 0%, #ffe3e3 100%)' : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'}; border: 2px solid ${netWeightDiff > 0 ? '#3b82f6' : netWeightDiff < 0 ? '#ef4444' : '#10b981'}; border-radius: 16px; padding: 24px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02); display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; position: relative;">
                        <div style="position: absolute; top: -10px; right: 15px; background: ${netWeightDiff > 0 ? '#2563eb' : netWeightDiff < 0 ? '#dc2626' : '#16a34a'}; color: white; font-size: 9px; font-weight: 800; padding: 2px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            ⭐ Chỉ số quan trọng nhất
                        </div>
                        <div style="display: flex; align-items: center; gap: 20px; flex: 1; min-width: 280px;">
                            <div style="width: 64px; height: 64px; border-radius: 12px; background: ${netWeightDiff > 0 ? 'rgba(37, 99, 235, 0.15)' : netWeightDiff < 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'}; display: flex; align-items: center; justify-content: center; color: ${netWeightDiff > 0 ? '#2563eb' : netWeightDiff < 0 ? '#ef4444' : '#10b981'}; font-size: 32px; flex-shrink: 0; box-shadow: inset 0 2px 4px 0 rgba(0,0,0,0.06);">
                                ${netWeightDiff > 0 ? '📈' : netWeightDiff < 0 ? '📉' : '✅'}
                            </div>
                            <div>
                                <span style="background: ${netWeightDiff > 0 ? '#2563eb' : netWeightDiff < 0 ? '#dc2626' : '#16a34a'}; color: white; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block; margin-bottom: 8px;">
                                    ${netWeightDiff > 0 ? 'Dôi dư tồn kho' : netWeightDiff < 0 ? 'Thất thoát tồn kho' : 'Số liệu trùng khớp'}
                                </span>
                                <h3 style="font-weight: 900; font-size: 30px; color: ${netWeightDiff > 0 ? '#1d4ed8' : netWeightDiff < 0 ? '#b91c1c' : '#047857'}; margin: 0; line-height: 1.1; letter-spacing: -0.5px;">
                                    ${netWeightDiff >= 0 ? '+' : ''}${netWeightDiff.toLocaleString('vi-VN')} <span style="font-size: 20px; font-weight: 700;">${unitLabel}</span>
                                </h3>
                                <div style="font-size: 14px; color: ${netWeightDiff > 0 ? '#1e40af' : netWeightDiff < 0 ? '#991b1b' : '#065f46'}; font-weight: 700; margin-top: 4px; display: flex; align-items: center; gap: 6px;">
                                    <span>Lệch thực tế:</span>
                                    <strong style="font-size: 16px;">${netRollDiff >= 0 ? '+' : ''}${netRollDiff}</strong> ${itemLabel}
                                </div>
                            </div>
                        </div>
                        <div style="min-width: 250px; flex: 1.2; border-left: 1px dashed ${netWeightDiff > 0 ? '#bfdbfe' : netWeightDiff < 0 ? '#fecaca' : '#bbf7d0'}; padding-left: 24px;">
                            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Tóm tắt kết luận kiểm kê</div>
                            <p style="font-size: 12px; line-height: 1.5; color: #475569; margin: 0;">
                                ${netWeightDiff > 0 
                                    ? `Tổng lượng thực tế kiểm đếm được <strong>nhiều hơn</strong> sổ sách hệ thống là <strong>${netWeightDiff.toLocaleString('vi-VN')} ${unitLabel}</strong> (tăng <strong>${netRollDiff}</strong> ${itemLabel}). Hệ thống sẽ tự động cập nhật ghi nhận tăng tồn.`
                                    : netWeightDiff < 0 
                                    ? `Tổng lượng thực tế kiểm đếm được <strong>ít hơn</strong> sổ sách hệ thống là <strong>${Math.abs(netWeightDiff).toLocaleString('vi-VN')} ${unitLabel}</strong> (giảm <strong>${Math.abs(netRollDiff)}</strong> ${itemLabel}). Vui lòng kiểm tra lại nguyên nhân thất thoát.`
                                    : `Số lượng thực tế khớp hoàn toàn 100% với dữ liệu hệ thống (đúng <strong>${totalCheckedRolls}</strong> ${itemLabel} và <strong>${totalCheckedWeight.toLocaleString('vi-VN')} ${unitLabel}</strong>).`}
                            </p>
                        </div>
                    </div>

                    <!-- Breakdown Detail: Loss & Gain side-by-side -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
                        
                        <!-- Box Loss: Thất thoát -->
                        <div style="background: #ffffff; border: 1px solid #fee2e2; border-radius: 14px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.05); position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between;">
                            <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: #ef4444;"></div>
                            <div>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                                    <div style="font-size: 12px; font-weight: 800; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px;">
                                        <span>📉</span> TỔNG THẤT THOÁT HÀNG HÓA
                                    </div>
                                    <span style="background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700;">Hao hụt & Mất mát</span>
                                </div>
                                
                                <div style="font-size: 32px; font-weight: 900; color: #dc2626; margin-bottom: 16px; letter-spacing: -0.5px;">
                                    -${totalLossWeight.toLocaleString('vi-VN')} <span style="font-size: 18px; font-weight: 700; color: #f87171;">${unitLabel}</span>
                                </div>
                                
                                <div style="display: flex; flex-direction: column; gap: 12px;">
                                    <!-- Item 1: Cây báo mất -->
                                    <div style="display: flex; justify-content: space-between; align-items: center; background: #fafafa; padding: 10px 14px; border-radius: 8px; border: 1px solid #f1f5f9;">
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            <span style="font-size: 16px; color: #ef4444;">❌</span>
                                            <div>
                                                <div style="font-weight: 700; font-size: 12px; color: #334155;">${missingTitle}</div>
                                                <div style="font-size: 10px; color: #64748b;">Hệ thống tự động trừ tồn kho</div>
                                            </div>
                                        </div>
                                        <div style="text-align: right;">
                                            <div style="font-weight: 800; font-size: 13px; color: #e11d48;">${missing.length} ${itemLabel}</div>
                                            <div style="font-size: 11px; color: #94a3b8; font-weight: 600;">-${missingWeightSum.toLocaleString('vi-VN')} ${unitLabel}</div>
                                        </div>
                                    </div>
                                    
                                    <!-- Item 2: Lệch cân hao hụt -->
                                    <div style="display: flex; justify-content: space-between; align-items: center; background: #fafafa; padding: 10px 14px; border-radius: 8px; border: 1px solid #f1f5f9;">
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            <span style="font-size: 16px; color: #ea580c;">⚖️</span>
                                            <div>
                                                <div style="font-weight: 700; font-size: 12px; color: #334155;">${diffTitle}</div>
                                                <div style="font-size: 10px; color: #64748b;">Lệch thực tế so với sổ sách</div>
                                            </div>
                                        </div>
                                        <div style="text-align: right;">
                                            <div style="font-weight: 800; font-size: 13px; color: #ea580c;">${difference.filter(i => Number(i.difference) > 0).length} ${itemLabel}</div>
                                            <div style="font-size: 11px; color: #94a3b8; font-weight: 600;">-${weightLossDiff.toLocaleString('vi-VN')} ${unitLabel}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Box Gain: Dôi dư -->
                        <div style="background: #ffffff; border: 1px solid #dbeafe; border-radius: 14px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.05); position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between;">
                            <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: #2563eb;"></div>
                            <div>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                                    <div style="font-size: 12px; font-weight: 800; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px;">
                                        <span>📈</span> TỔNG DƯ THỪA HÀNG HÓA
                                    </div>
                                    <span style="background: #eff6ff; color: #2563eb; border: 1px solid #dbeafe; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700;">Thừa cây & Dôi dư</span>
                                </div>
                                
                                <div style="font-size: 32px; font-weight: 900; color: #1d4ed8; margin-bottom: 16px; letter-spacing: -0.5px;">
                                    +${totalSurplusWeight.toLocaleString('vi-VN')} <span style="font-size: 18px; font-weight: 700; color: #60a5fa;">${unitLabel}</span>
                                </div>
                                
                                <div style="display: flex; flex-direction: column; gap: 12px;">
                                    <!-- Item 1: Cây thừa mới -->
                                    <div style="display: flex; justify-content: space-between; align-items: center; background: #fafafa; padding: 10px 14px; border-radius: 8px; border: 1px solid #f1f5f9;">
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            <span style="font-size: 16px; color: #2563eb;">➕</span>
                                            <div>
                                                <div style="font-weight: 700; font-size: 12px; color: #334155;">${surplusTitle}</div>
                                                <div style="font-size: 10px; color: #64748b;">Hệ thống tự động cộng tồn kho</div>
                                            </div>
                                        </div>
                                        <div style="text-align: right;">
                                            <div style="font-weight: 800; font-size: 13px; color: #2563eb;">${surplus.length} ${itemLabel}</div>
                                            <div style="font-size: 11px; color: #94a3b8; font-weight: 600;">+${surplusWeightSum.toLocaleString('vi-VN')} ${unitLabel}</div>
                                        </div>
                                    </div>
                                    
                                    <!-- Item 2: Thừa cân nặng -->
                                    <div style="display: flex; justify-content: space-between; align-items: center; background: #fafafa; padding: 10px 14px; border-radius: 8px; border: 1px solid #f1f5f9;">
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            <span style="font-size: 16px; color: #0d9488;">⚖️</span>
                                            <div>
                                                <div style="font-weight: 700; font-size: 12px; color: #334155;">${gainTitle}</div>
                                                <div style="font-size: 10px; color: #64748b;">Lệch thực tế so với sổ sách</div>
                                            </div>
                                        </div>
                                        <div style="text-align: right;">
                                            <div style="font-weight: 800; font-size: 13px; color: #0d9488;">${difference.filter(i => Number(i.difference) < 0).length} ${itemLabel}</div>
                                            <div style="font-size: 11px; color: #94a3b8; font-weight: 600;">+${weightGainDiff.toLocaleString('vi-VN')} ${unitLabel}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- Grid layout of difference details and grouped summaries -->
                <div class="row">
                    <div class="col-md-5">
                        <div class="kk-card" style="padding:20px;">
                            <h4 style="font-weight:800; color:#1e293b; margin-bottom:14px; font-size:13px;">${summaryHeader}</h4>
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
                            <div style="display:flex; border-bottom:1px solid #e2e8f0; margin-bottom:14px; flex-shrink:0;" class="d-print-none">
                                <div class="kk-rep-tab-btn active" id="kkTabBtnMissing" onclick="_kkSwitchRepTab('missing')">❌ ${itemLabelCap} mất (${missing.length})</div>
                                <div class="kk-rep-tab-btn" id="kkTabBtnSurplus" onclick="_kkSwitchRepTab('surplus')">➕ ${itemLabelCap} thừa (${surplus.length})</div>
                                <div class="kk-rep-tab-btn" id="kkTabBtnDiff" onclick="_kkSwitchRepTab('diff')">⚖️ Lệch ${unitLabel} (${difference.length})</div>
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
    const unitLabel = (items.length > 0 && items[0].unit) ? items[0].unit.trim() : 'kg';
    const isProduct = (unitLabel.toLowerCase() === 'cái' || unitLabel.toLowerCase() === 'bộ' || unitLabel.toLowerCase() === 'chiếc' || unitLabel.toLowerCase() === 'sản phẩm');
    const labelCap = isProduct ? 'Sản phẩm' : 'Cây vải';
    const labelLower = isProduct ? 'sản phẩm' : 'cây vải';

    if (items.length === 0) {
        return `<div class="text-center text-muted py-5">Không có ${labelLower} nào thuộc trạng thái này.</div>`;
    }

    let rowsHtml = '';
    items.forEach((item, idx) => {
        let diffText = '—';
        if (type === 'missing') {
            diffText = `<span style="color:#ef4444; font-weight:700;">-${item.system_weight} ${item.unit}</span>`;
        } else if (type === 'surplus') {
            const isLe = item.notes && item.notes.includes("Cây lẻ");
            const typeBadge = isProduct 
                ? '' 
                : (isLe 
                    ? `<span style="background:#fff7ed; color:#ea580c; border:1px solid #ffedd5; padding:1px 5px; border-radius:4px; font-size:9px; font-weight:700; margin-left:6px;">✂️ Cây Lẻ</span>` 
                    : `<span style="background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; padding:1px 5px; border-radius:4px; font-size:9px; font-weight:700; margin-left:6px;">🌲 Cây Nguyên</span>`);
            diffText = `<span style="color:#3b82f6; font-weight:700;">+${item.actual_weight} ${item.unit}</span>${typeBadge}`;
        } else if (type === 'diff') {
            const d = Number(item.difference);
            diffText = `<span style="color:${d > 0 ? '#ef4444' : '#3b82f6'}; font-weight:700;">
                ${d > 0 ? '-' + d : '+' + Math.abs(d)} ${item.unit}
            </span>`;
        } else {
            if (item.type === 'return_confirm') {
                diffText = `<span class="text-success font-weight-bold">Khớp</span> <span class="kk-diff-badge ok" style="background:#e0f2fe; color:#0369a1; border:1px solid #7dd3fc; font-size:9px; padding:1px 5px; margin-left:4px;">🔄 Chờ hoàn NCC</span>`;
            } else {
                diffText = `<span class="text-success font-weight-bold">Khớp</span>`;
            }
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
                    <th>${labelCap} & Mã Hàng</th>
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
        dataList = items.filter(i => i.type === 'match' || i.type === 'return_confirm');
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
    
    // Clear URL parameters
    const url = new URL(window.location.href);
    url.searchParams.delete('session_id');
    window.history.pushState({ page: 'kiem-kho' }, '', url.pathname + url.search);
    
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

function _kkOpenMaterialsSelector() {
    const activeShelf = _kk.shelves ? _kk.shelves.find(s => s.name === _kk.activeLocation) : null;
    if (!activeShelf || !activeShelf.materials_list) return;
    
    const materials = activeShelf.materials_list.split(',').map(m => m.trim()).filter(Boolean);
    if (materials.length === 0) return;
    
    let itemsHtml = '';
    materials.forEach(mat => {
        const isActive = (mat.toLowerCase() === _kk.materialFilter.toLowerCase());
        itemsHtml += `
            <div onclick="_kkSelectMaterialForSearch('${mat.replace(/'/g, "\\'")}')" style="
                padding: 12px 14px;
                border-radius: 10px;
                background: ${isActive ? '#d1fae5' : '#f8fafc'};
                border: 1px solid ${isActive ? '#a7f3d0' : '#e2e8f0'};
                color: ${isActive ? '#15803d' : '#334155'};
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: space-between;
                transition: all 0.15s ease;
                margin-bottom: 6px;
            " onmouseover="this.style.background='#f0fdfa'; this.style.borderColor='#99f6e4'; this.style.color='#0f766e';"
              onmouseout="this.style.background='${isActive ? '#d1fae5' : '#f8fafc'}'; this.style.borderColor='${isActive ? '#a7f3d0' : '#e2e8f0'}'; this.style.color='${isActive ? '#15803d' : '#334155'}';">
                <span>📦 ${mat} ${isActive ? ' (Đang lọc)' : ''}</span>
                <span style="font-size: 11px; font-weight: bold;">${isActive ? '✓ Đang chọn' : 'Chọn ➔'}</span>
            </div>
        `;
    });
    
    itemsHtml += `
        <div onclick="_kkSelectMaterialForSearch('')" style="
            padding: 12px 14px;
            border-radius: 10px;
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #ef4444;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: all 0.15s ease;
            margin-top: 6px;
        " onmouseover="this.style.background='#fee2e2';"
          onmouseout="this.style.background='#fef2f2';">
            <span>❌ Bỏ tìm kiếm theo chất liệu</span>
            <span style="font-size: 11px; opacity: 0.8;">Xóa ➔</span>
        </div>
    `;

    const modalHtml = `
        <div class="kk-modal-overlay" id="kkMaterialSelectModal" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(4px);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            <div class="kk-modal" style="
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
                max-width: 400px;
                width: 90%;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            ">
                <div class="kk-modal-header" style="
                    padding: 16px 20px;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <div class="kk-modal-title" style="font-weight: 800; font-size: 15px; color: #0f766e; display: flex; align-items: center; gap: 6px;">
                        📦 Chọn Chất Liệu Để Tìm Kiếm
                    </div>
                    <button onclick="_kkCloseModal('kkMaterialSelectModal')" style="border:none; background:none; font-size:24px; cursor:pointer; color:#94a3b8;">&times;</button>
                </div>
                <div class="kk-modal-body" style="
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                ">
                    <div style="font-size: 12px; color: #64748b; margin-bottom: 4px; line-height: 1.4;">
                        Chọn chất liệu của kệ <strong>${_kk.activeLocation}</strong> để lọc tìm kiếm (Phần ô tìm kiếm bên dưới sẽ dùng để tìm kiếm màu/mã cây):
                    </div>
                    ${itemsHtml}
                </div>
                <div class="kk-modal-footer" style="
                    padding: 12px 20px;
                    border-top: 1px solid #e2e8f0;
                    background: #f8fafc;
                    display: flex;
                    justify-content: flex-end;
                ">
                    <button class="kk-btn kk-btn-secondary" onclick="_kkCloseModal('kkMaterialSelectModal')" style="padding: 6px 14px; font-size: 12px;">Hủy</button>
                </div>
            </div>
        </div>
    `;

    const oldContainer = document.getElementById('kkMaterialSelectModalContainer');
    if (oldContainer) oldContainer.remove();

    const div = document.createElement('div');
    div.id = 'kkMaterialSelectModalContainer';
    div.innerHTML = modalHtml;
    document.body.appendChild(div);
}

function _kkCloseModal(id) {
    const el = document.getElementById(id);
    if (el) el.parentElement.remove();
}

function _kkSelectMaterialForSearch(mat) {
    _kkCloseModal('kkMaterialSelectModal');
    _kk.materialFilter = mat.trim();
    _kkLoadRolls().then(() => {
        const content = _kkGetContainer();
        if (content) _kkRenderMain(content);
    });
}

async function _kkExportReportToExcel() {
    if (typeof XLSX === 'undefined') {
        showToast('⏳ Đang tải thư viện XLSX từ CDN...', 'info');
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
        document.head.appendChild(script);
        await new Promise((resolve) => {
            script.onload = resolve;
            script.onerror = () => {
                showToast('❌ Không thể tải thư viện XLSX từ CDN.', 'error');
            };
        });
    }

    try {
        const res = _kk.selectedSessionData;
        if (!res) {
            showToast('Không có dữ liệu báo cáo để xuất.', 'error');
            return;
        }

        const s = res.session;
        const items = res.items || [];

        // Sheet 1: General Summary Info
        const summaryData = [
            ["BÁO CÁO PHIÊN KIỂM KHO VẢI PHÁT HÀNH CHI TIẾT"],
            ["Đợt kiểm:", formatVnDateTime(s.finished_at)],
            ["Người chốt sổ:", s.finished_by_name || 'Hệ thống'],
            [""],
            ["CHỈ SỐ TỔNG HỢP", "GIÁ TRỊ", "ĐƠN VỊ"],
            ["Tổng số cây kiểm kê thực tế", s.checked_rolls, "cây"],
            ["Tồn hệ thống trước kiểm", Number(s.total_weight), "kg"],
            ["Cân thực tế sau kiểm", items.reduce((sum, i) => sum + Number(i.actual_weight || 0), 0), "kg"],
            ["Tổng số cây báo mất", s.missing_rolls, "cây"],
            ["Tổng trọng lượng cây báo mất", Number(s.missing_weight), "kg"],
            ["Tổng số cây thừa mới phát hiện", s.surplus_rolls, "cây"],
            ["Tổng trọng lượng cây thừa mới phát hiện", Number(s.surplus_weight), "kg"],
            ["Chênh lệch kiểm kê ròng (Thực tế - Hệ thống)", items.reduce((sum, i) => sum + Number(i.actual_weight || 0), 0) - Number(s.total_weight), "kg"]
        ];

        // Sheet 2: Grouped Difference Summary
        const groupedRows = [
            ["STT", "Chất Liệu & Màu Vải", "Tồn Hệ Thống (kg)", "Thực Tế Kiểm (kg)", "Chênh Lệch (kg)"]
        ];
        const matSummary = {};
        items.forEach(item => {
            const k = item.material_name + ' - ' + item.color_name;
            if (!matSummary[k]) {
                matSummary[k] = { expected: 0, checked: 0, diff: 0 };
            }
            matSummary[k].expected += Number(item.system_weight || 0);
            matSummary[k].checked += Number(item.actual_weight || 0);
            matSummary[k].diff += Number(item.difference || 0);
        });
        
        let gIdx = 1;
        Object.keys(matSummary).forEach(k => {
            const sum = matSummary[k];
            groupedRows.push([
                gIdx++,
                k,
                sum.expected,
                sum.checked,
                sum.diff === 0 ? 0 : -sum.diff
            ]);
        });

        // Sheet 3: Missing Rolls List
        const missingRows = [
            ["STT", "Mã Cây Vải", "Chất Liệu", "Màu Sắc", "Cân Hệ Thống (kg)", "Cân Thực Tế (kg)", "Hao Hụt (kg)", "Ghi Chú"]
        ];
        const missingItems = items.filter(i => i.type === 'missing');
        missingItems.forEach((i, idx) => {
            missingRows.push([
                idx + 1,
                i.roll_code,
                i.material_name,
                i.color_name,
                Number(i.system_weight),
                0,
                -Number(i.system_weight),
                i.notes || ''
            ]);
        });

        // Sheet 4: Surplus Rolls List
        const surplusRows = [
            ["STT", "Mã Cây Vải", "Chất Liệu", "Màu Sắc", "Cân Thực Tế (kg)", "Phân Loại", "Ghi Chú"]
        ];
        const surplusItems = items.filter(i => i.type === 'surplus');
        surplusItems.forEach((i, idx) => {
            const isLe = i.notes && i.notes.includes("Cây lẻ");
            surplusRows.push([
                idx + 1,
                i.roll_code,
                i.material_name,
                i.color_name,
                Number(i.actual_weight),
                isLe ? "Cây Lẻ" : "Cây Nguyên",
                i.notes || ''
            ]);
        });

        // Sheet 5: Checked Difference Rolls (excluding 100% missing)
        const diffRows = [
            ["STT", "Mã Cây Vải", "Chất Liệu", "Màu Sắc", "Cân Hệ Thống (kg)", "Cân Thực Tế (kg)", "Lệch (kg)", "Ghi Chú"]
        ];
        const diffItems = items.filter(i => i.type === 'difference');
        diffItems.forEach((i, idx) => {
            diffRows.push([
                idx + 1,
                i.roll_code,
                i.material_name,
                i.color_name,
                Number(i.system_weight),
                Number(i.actual_weight),
                -Number(i.difference),
                i.notes || ''
            ]);
        });

        // Create workbook & sheets
        const wb = XLSX.utils.book_new();
        
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, "Tổng quan");

        const wsGrouped = XLSX.utils.aoa_to_sheet(groupedRows);
        XLSX.utils.book_append_sheet(wb, wsGrouped, "Chênh lệch nhóm");

        const wsMissing = XLSX.utils.aoa_to_sheet(missingRows);
        XLSX.utils.book_append_sheet(wb, wsMissing, "Cây báo mất");

        const wsSurplus = XLSX.utils.aoa_to_sheet(surplusRows);
        XLSX.utils.book_append_sheet(wb, wsSurplus, "Cây thừa");

        const wsDiff = XLSX.utils.aoa_to_sheet(diffRows);
        XLSX.utils.book_append_sheet(wb, wsDiff, "Lệch cân");

        const fileName = `BaoCao_KiemKho_${s.finished_at ? formatVnDate(s.finished_at) : 'ChiTiet'}.xlsx`;
        XLSX.writeFile(wb, fileName);
        showToast('✅ Đã tải xuống file Excel báo cáo kiểm kho!', 'success');
    } catch (e) {
        console.error('[Excel export error]', e);
        showToast('Lỗi xuất Excel: ' + e.message, 'error');
    }
}

window._kkOpenMaterialsSelector = _kkOpenMaterialsSelector;
window._kkCloseModal = _kkCloseModal;
window._kkSelectMaterialForSearch = _kkSelectMaterialForSearch;
window._kkExportReportToExcel = _kkExportReportToExcel;
window._kkFinishSession = _kkFinishSession;
window._kkOpenFinishConfirmModal = _kkOpenFinishConfirmModal;
window._kkConfirmFinishSession = _kkConfirmFinishSession;

function _kkCanViewBill() {
    var u = typeof currentUser !== 'undefined' ? currentUser : null;
    if (!u) return false;
    if (u.role === 'giam_doc') return true;
    if (u.role === 'quan_ly_xuong') return true;
    if (u.username === 'ketoan' || u.username === 'ketoan1' || u.role === 'ke_toan') return true;
    if (u.role === 'quan_ly_cap_cao' && (u.username === 'trinh' || u.username === 'quanlyxuong')) return true;
    return false;
}

function _kkOpenImportBill(importId) {
    if (typeof _bnhFD !== 'function') {
        window._bnhFD = function(d) {
            if (!d) return '—';
            try {
                var p = d.split('T')[0].split('-');
                return p[2] + '/' + p[1] + '/' + p[0];
            } catch(e) { return d; }
        };
    }
    if (typeof _bnhFM !== 'function') {
        window._bnhFM = function(n) {
            if (!n && n !== 0) return '0';
            return Number(n).toLocaleString('vi-VN');
        };
    }
    if (typeof _bnhFabDetail === 'function') {
        _bnhFabDetail(importId);
    } else {
        var s = document.createElement('script');
        s.src = '/js/pages/fab-import-v4.js?v=20260626_2';
        s.onload = function() { _bnhFabDetail(importId); };
        document.head.appendChild(s);
    }
}

async function _kkOpenRollOrigin(rollId) {
    try {
        const r = await apiCall('/api/stockcheck/roll-origin/' + rollId);
        if (!r) {
            showToast('Không lấy được thông tin nguồn gốc cây vải', 'error');
            return;
        }

        const isNguyen = Number(r.weight) === Number(r.original_weight);
        const typeLabel = isNguyen 
            ? '<span style="background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700;">🌲 Cây Nguyên (Chưa cắt)</span>' 
            : '<span style="background:#fff7ed; color:#ea580c; border:1px solid #ffedd5; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700;">✂️ Cây Lẻ (Đã cắt dở)</span>';

        const originText = r.source === 'kiem_kho_du'
            ? '<strong style="color:#7c3aed;">💜 Báo dư từ đợt kiểm kê</strong>'
            : '<strong>Tạo thủ công / Cắt dư từ đơn hàng</strong>';

        const modalHtml = `
            <div class="kk-modal-overlay" id="kkRollOriginModal" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.55); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px);">
                <div class="kk-modal" style="background:#fff; border-radius:16px; width:100%; max-width:480px; box-shadow:0 25px 50px rgba(0,0,0,0.25); overflow:hidden;">
                    <div class="kk-modal-header" style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid #e2e8f0; background:linear-gradient(135deg,#7c3aed,#a855f7); color:#fff;">
                        <div class="kk-modal-title" style="font-size:15px; font-weight:800; display:flex; align-items:center; gap:6px;">🔍 Truy Xuất Nguồn Gốc Cây Vải</div>
                        <button onclick="_kkCloseModal('kkRollOriginModal')" style="background:rgba(255,255,255,0.2); border:none; color:#fff; border-radius:6px; padding:4px 10px; cursor:pointer; font-size:12px; font-weight:700;">✕ Đóng</button>
                    </div>
                    <div class="kk-modal-body" style="padding:20px; font-size:13px; display:flex; flex-direction:column; gap:12px; color:#334155; max-height:75vh; overflow-y:auto;">
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                            <span style="color:#64748b; font-weight:600;">Mã Cây Vải:</span>
                            <span style="font-weight:700; font-family:monospace; color:#7c3aed; font-size:14px;">${r.roll_code}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                            <span style="color:#64748b; font-weight:600;">Xuất Xứ Cây:</span>
                            <span>${originText}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                            <span style="color:#64748b; font-weight:600;">Thời Gian Kiểm/Tạo:</span>
                            <span style="font-weight:700; color:#1e293b;">${r.created_at_formatted}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                            <span style="color:#64748b; font-weight:600;">Nhân Viên Thực Hiện:</span>
                            <span style="font-weight:700; color:#1e293b;">${r.creator_name}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                            <span style="color:#64748b; font-weight:600;">Chất Liệu Vải:</span>
                            <span style="font-weight:700; color:#1e293b;">${r.material_name}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                            <span style="color:#64748b; font-weight:600;">Màu Vải:</span>
                            <span style="font-weight:700; color:#0d9488;">${r.color_name}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                            <span style="color:#64748b; font-weight:600;">Trọng Lượng Lúc Báo Dư:</span>
                            <span style="font-weight:800; color:#059669; font-size:14px;">${r.original_weight} kg</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                            <span style="color:#64748b; font-weight:600;">Trọng Lượng Hiện Tại:</span>
                            <span style="font-weight:800; color:#0d9488; font-size:14px;">${r.weight} kg</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                            <span style="color:#64748b; font-weight:600;">Phân Loại Cây:</span>
                            <span>${typeLabel}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                            <span style="color:#64748b; font-weight:600;">Vị Trí Kệ Lưu Trữ:</span>
                            <span style="font-weight:700; color:#4f46e5;">📍 ${r.location}</span>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px; background:#f8fafc; padding:10px 14px; border-radius:8px; border:1px solid #e2e8f0; text-align:left;">
                            <span style="color:#64748b; font-weight:600; font-size:11px;">Ghi chú chi tiết lúc kiểm:</span>
                            <span style="font-style:italic; color:#475569; font-weight:500; line-height:1.4;">${r.note || 'Không có ghi chú thêm'}</span>
                        </div>
                    </div>
                    <div class="kk-modal-footer" style="background:#fafafa; display:flex; justify-content:flex-end; padding:12px 20px; border-top:1px solid #f1f5f9;">
                        <button class="kk-btn kk-btn-secondary" onclick="_kkCloseModal('kkRollOriginModal')" style="background:#64748b; color:#fff; border:none; padding:8px 16px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">Đóng</button>
                    </div>
                </div>
            </div>
        `;

        const oldContainer = document.getElementById('kkRollOriginModalContainer');
        if (oldContainer) oldContainer.remove();

        const div = document.createElement('div');
        div.id = 'kkRollOriginModalContainer';
        div.innerHTML = modalHtml;
        document.body.appendChild(div);
        
        _kkUpdateBodyScroll();
    } catch (e) {
        console.error('[KK] Open roll origin detail error:', e);
        showToast('Không lấy được thông tin chi tiết cây vải', 'error');
    }
}

window._kkCanViewBill = _kkCanViewBill;
window._kkOpenImportBill = _kkOpenImportBill;
window._kkOpenRollOrigin = _kkOpenRollOrigin;

