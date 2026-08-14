// ========== NỘI QUY & ĐIỀU KHOẢN CÔNG TY HV ==========
var _nqState = {
    rules: [],
    depts: { vanPhong: [], xuong: [], all: [] },
    stats: { totalRules: 0, generalRules: 0, deptRules: 0, fineRules: 0 },
    filters: {
        scope: 'all',
        deptId: 'all',
        month: 'all',
        year: 'all',
        search: '',
        hasFine: false
    },
    editingId: null
};

var _nqIsAdmin = function() {
    if (typeof currentUser === 'undefined' || !currentUser) return false;
    var r = currentUser.role;
    return r === 'giam_doc' || r === 'quan_ly_cap_cao' || r === 'quan_ly' || r === 'truong_phong';
};

async function renderNoiquycongtyhvPage(container) {
    if (!document.getElementById('nqStyles')) {
        var st = document.createElement('style'); st.id = 'nqStyles';
        st.textContent = `
            .nq-page { padding: 20px; background: #f8fafc; min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
            .nq-header-banner { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%); color: #fff; padding: 24px 30px; border-radius: 16px; margin-bottom: 24px; box-shadow: 0 10px 25px -5px rgba(67, 56, 202, 0.3); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; position: relative; overflow: hidden; }
            .nq-header-banner::before { content: ""; position: absolute; top: -50%; right: -20%; width: 400px; height: 400px; background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%); border-radius: 50%; pointer-events: none; }
            .nq-title-group h1 { font-size: 22px; font-weight: 900; margin: 0 0 6px 0; display: flex; align-items: center; gap: 10px; letter-spacing: -0.5px; }
            .nq-title-group p { font-size: 13px; color: #e0e7ff; margin: 0; opacity: 0.9; font-weight: 500; }
            .nq-add-btn { background: #10b981; color: #fff; border: none; padding: 12px 22px; border-radius: 10px; font-weight: 800; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: all 0.2s ease; z-index: 1; }
            .nq-add-btn:hover { background: #059669; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4); }

            /* Stats Grid */
            .nq-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
            .nq-stat-card { background: #fff; border-radius: 14px; padding: 18px 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03); display: flex; align-items: center; gap: 16px; transition: transform 0.2s, box-shadow 0.2s; }
            .nq-stat-card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.06); }
            .nq-stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
            .nq-stat-info { display: flex; flex-direction: column; }
            .nq-stat-value { font-size: 24px; font-weight: 900; color: #0f172a; line-height: 1.1; }
            .nq-stat-label { font-size: 12px; font-weight: 700; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }

            /* Filter Bar */
            .nq-filter-card { background: #fff; border-radius: 14px; padding: 16px 20px; border: 1px solid #e2e8f0; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 14px; }
            .nq-scope-tabs { display: flex; gap: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; overflow-x: auto; }
            .nq-tab-btn { background: #f1f5f9; color: #475569; border: none; padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
            .nq-tab-btn.active { background: #4338ca; color: #fff; box-shadow: 0 2px 8px rgba(67, 56, 202, 0.25); }

            .nq-filter-controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
            .nq-search-box { flex: 1; min-width: 240px; position: relative; }
            .nq-search-box input { width: 100%; padding: 9px 14px 9px 36px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; transition: border-color 0.2s; }
            .nq-search-box input:focus { border-color: #4338ca; box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.1); }
            .nq-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 14px; }

            .nq-select { padding: 9px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #334155; outline: none; background: #fff; cursor: pointer; }
            .nq-select:focus { border-color: #4338ca; }
            .nq-checkbox-label { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: #dc2626; cursor: pointer; user-select: none; background: #fef2f2; padding: 7px 12px; border-radius: 8px; border: 1px solid #fecaca; }

            /* Rules Grid */
            .nq-rules-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px; }
            .nq-card { background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03); display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; }
            .nq-card:hover { transform: translateY(-3px); box-shadow: 0 12px 20px -5px rgba(0,0,0,0.08); border-color: #cbd5e1; }
            
            .nq-card-header { padding: 16px 18px 12px 18px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; background: #fafafa; }
            .nq-code-badge { background: linear-gradient(135deg, #4f46e5, #6366f1); color: #fff; font-size: 12px; font-weight: 900; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2); }
            .nq-scope-badge { font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; }
            .nq-scope-badge.chung { background: #e0e7ff; color: #3730a3; }
            .nq-scope-badge.phongban { background: #fef3c7; color: #92400e; }

            .nq-card-body { padding: 18px; flex: 1; display: flex; flex-direction: column; gap: 12px; }
            .nq-card-title { font-size: 16px; font-weight: 800; color: #0f172a; line-height: 1.4; margin: 0; }
            .nq-card-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: #64748b; font-weight: 600; background: #f8fafc; padding: 8px 12px; border-radius: 8px; }
            .nq-card-meta-item { display: flex; align-items: center; gap: 5px; }

            .nq-card-content { font-size: 13px; color: #334155; line-height: 1.6; white-space: pre-line; background: #fff; word-break: break-word; }

            .nq-fine-box { background: #fff1f2; border: 1px solid #ffe4e6; border-radius: 10px; padding: 10px 14px; display: flex; flex-direction: column; gap: 6px; margin-top: auto; }
            .nq-fine-title { font-size: 11px; font-weight: 900; color: #be123c; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px; }
            .nq-fine-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; }
            .nq-fine-label { color: #881337; }
            .nq-fine-value { color: #e11d48; font-weight: 900; }

            .nq-card-footer { padding: 12px 18px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
            .nq-action-btn { background: none; border: none; font-size: 12px; font-weight: 800; cursor: pointer; padding: 6px 12px; border-radius: 6px; transition: background 0.15s; display: inline-flex; align-items: center; gap: 5px; }
            .nq-action-edit { color: #2563eb; background: #eff6ff; }
            .nq-action-edit:hover { background: #dbeafe; }
            .nq-action-del { color: #dc2626; background: #fef2f2; }
            .nq-action-del:hover { background: #fee2e2; }

            /* Modal Styles */
            .nq-modal-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px; animation: nqFadeIn 0.2s ease-out; }
            @keyframes nqFadeIn { from { opacity: 0; } to { opacity: 1; } }
            .nq-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); display: flex; flex-direction: column; }
            .nq-modal-hdr { padding: 20px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-radius: 16px 16px 0 0; }
            .nq-modal-hdr h3 { margin: 0; font-size: 18px; font-weight: 900; color: #0f172a; display: flex; align-items: center; gap: 8px; }
            .nq-modal-close { background: none; border: none; font-size: 20px; font-weight: 700; color: #94a3b8; cursor: pointer; }
            .nq-modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
            .nq-form-group { display: flex; flex-direction: column; gap: 6px; }
            .nq-form-group label { font-size: 13px; font-weight: 800; color: #334155; }
            .nq-form-input, .nq-form-select, .nq-form-textarea { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
            .nq-form-textarea { min-height: 100px; resize: vertical; font-family: inherit; }
            .nq-form-input:focus, .nq-form-select:focus, .nq-form-textarea:focus { border-color: #4338ca; box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.1); }
            .nq-modal-ftr { padding: 16px 24px; border-top: 1px solid #e2e8f0; background: #f8fafc; display: flex; justify-content: flex-end; gap: 12px; border-radius: 0 0 16px 16px; }
            .nq-btn-secondary { background: #e2e8f0; color: #475569; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; }
            .nq-btn-primary { background: #4338ca; color: #fff; border: none; padding: 10px 22px; border-radius: 8px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 10px rgba(67, 56, 202, 0.25); }

            .nq-empty { text-align: center; padding: 60px 20px; background: #fff; border-radius: 14px; border: 1px dashed #cbd5e1; grid-column: 1 / -1; }
            .nq-empty-icon { font-size: 48px; margin-bottom: 12px; }
            .nq-empty-text { font-size: 15px; font-weight: 800; color: #475569; }
        `;
        document.head.appendChild(st);
    }

    container.innerHTML = `
        <div class="nq-page">
            <!-- Header Banner -->
            <div class="nq-header-banner">
                <div class="nq-title-group">
                    <h1>📜 NỘI QUY & ĐIỀU KHOẢN CÔNG TY HV</h1>
                    <p>Quy chuẩn văn hóa, quy tắc làm việc & chế tài khen thưởng kỷ luật toàn công ty</p>
                </div>
                ${_nqIsAdmin() ? `
                    <button class="nq-add-btn" onclick="_nqOpenAddModal()">
                        <span>➕</span> Thêm Điều Khoản Mới
                    </button>
                ` : ''}
            </div>

            <!-- Stats Grid -->
            <div class="nq-stats-grid" id="nqStatsGrid">
                <div class="nq-stat-card">
                    <div class="nq-stat-icon" style="background:#e0e7ff;color:#4338ca">📋</div>
                    <div class="nq-stat-info">
                        <span class="nq-stat-value" id="nqStatTotal">0</span>
                        <span class="nq-stat-label">Tổng Điều Khoản</span>
                    </div>
                </div>
                <div class="nq-stat-card">
                    <div class="nq-stat-icon" style="background:#dcfce7;color:#15803d">🏢</div>
                    <div class="nq-stat-info">
                        <span class="nq-stat-value" id="nqStatGeneral">0</span>
                        <span class="nq-stat-label">Nội Quy Chung</span>
                    </div>
                </div>
                <div class="nq-stat-card">
                    <div class="nq-stat-icon" style="background:#fef3c7;color:#b45309">🏛️</div>
                    <div class="nq-stat-info">
                        <span class="nq-stat-value" id="nqStatDept">0</span>
                        <span class="nq-stat-label">Nội Quy Phòng Ban</span>
                    </div>
                </div>
                <div class="nq-stat-card">
                    <div class="nq-stat-icon" style="background:#ffe4e6;color:#be123c">🚨</div>
                    <div class="nq-stat-info">
                        <span class="nq-stat-value" id="nqStatFine">0</span>
                        <span class="nq-stat-label">Có Phạt Vi Phạm</span>
                    </div>
                </div>
            </div>

            <!-- Filter Toolbar -->
            <div class="nq-filter-card">
                <div class="nq-scope-tabs">
                    <button class="nq-tab-btn active" id="nqTabAll" onclick="_nqSetScope('all')">🌐 Xem Tất Cả</button>
                    <button class="nq-tab-btn" id="nqTabChung" onclick="_nqSetScope('chung')">🏢 1. Nội Quy Chung</button>
                    <button class="nq-tab-btn" id="nqTabPhongban" onclick="_nqSetScope('phong_ban')">🏛️ 2. Nội Quy Phòng Ban</button>
                </div>
                <div class="nq-filter-controls">
                    <div class="nq-search-box">
                        <span class="nq-search-icon">🔍</span>
                        <input type="text" id="nqSearchInput" placeholder="Tìm theo mã (NQ-...), tiêu đề, nội dung, người tạo..." oninput="_nqOnSearch(this.value)">
                    </div>
                    <select class="nq-select" id="nqDeptFilter" onchange="_nqOnDeptChange(this.value)">
                        <option value="all">🏢 Tất Cả Phòng Ban</option>
                    </select>
                    <select class="nq-select" id="nqMonthFilter" onchange="_nqOnMonthChange(this.value)">
                        <option value="all">📅 Tất Cả Các Tháng</option>
                        ${[1,2,3,4,5,6,7,8,9,10,11,12].map(m => `<option value="${m}">Tháng ${m}</option>`).join('')}
                    </select>
                    <select class="nq-select" id="nqYearFilter" onchange="_nqOnYearChange(this.value)">
                        <option value="all">📆 Tất Cả Các Năm</option>
                        <option value="2026">Năm 2026</option>
                        <option value="2025">Năm 2025</option>
                    </select>
                    <label class="nq-checkbox-label">
                        <input type="checkbox" id="nqFineCheck" onchange="_nqOnFineChange(this.checked)">
                        <span>🚨 Phạt Vi Phạm</span>
                    </label>
                </div>
            </div>

            <!-- Rules Card Grid -->
            <div class="nq-rules-grid" id="nqRulesGrid">
                <div style="grid-column:1/-1;text-align:center;padding:40px;color:#64748b;font-weight:700">⌛ Đang tải dữ liệu nội quy...</div>
            </div>
        </div>
    `;

    await _nqInitData();
}

async function _nqInitData() {
    try {
        // Fetch departments
        var deptRes = await apiCall('/api/company-rules/departments');
        if (deptRes) {
            _nqState.depts = deptRes;
            _nqPopulateDeptFilter();
        }

        // Fetch rules
        await _nqLoadRules();
    } catch (e) {
        console.error('Error init _nqData:', e);
    }
}

function _nqPopulateDeptFilter() {
    var sel = document.getElementById('nqDeptFilter');
    if (!sel) return;

    var html = '<option value="all">🏢 Tất Cả Phòng Ban</option>';
    
    if (_nqState.depts.vanPhong && _nqState.depts.vanPhong.length > 0) {
        html += '<optgroup label="🏛️ HỆ THỐNG VĂN PHÒNG HV">';
        _nqState.depts.vanPhong.forEach(function(d) {
            html += `<option value="${d.id}">${d.name}</option>`;
        });
        html += '</optgroup>';
    }

    if (_nqState.depts.xuong && _nqState.depts.xuong.length > 0) {
        html += '<optgroup label="🏭 HỆ THỐNG XƯỞNG HV">';
        _nqState.depts.xuong.forEach(function(d) {
            html += `<option value="${d.id}">${d.name}</option>`;
        });
        html += '</optgroup>';
    }

    if (_nqState.depts.other && _nqState.depts.other.length > 0) {
        html += '<optgroup label="🏢 PHÒNG BAN KHÁC">';
        _nqState.depts.other.forEach(function(d) {
            html += `<option value="${d.id}">${d.name}</option>`;
        });
        html += '</optgroup>';
    }

    sel.innerHTML = html;
}

async function _nqLoadRules() {
    try {
        var params = new URLSearchParams();
        var f = _nqState.filters;
        if (f.scope !== 'all') params.append('scope', f.scope);
        if (f.deptId !== 'all') params.append('department_id', f.deptId);
        if (f.month !== 'all') params.append('month', f.month);
        if (f.year !== 'all') params.append('year', f.year);
        if (f.search) params.append('search', f.search);
        if (f.hasFine) params.append('has_fine', 'true');

        var res = await apiCall('/api/company-rules?' + params.toString());
        if (res) {
            _nqState.rules = res.rules || [];
            _nqState.stats = res.stats || { totalRules: 0, generalRules: 0, deptRules: 0, fineRules: 0 };
            _nqUpdateStats();
            _nqRenderRules();
        }
    } catch (e) {
        console.error('Error loading rules:', e);
    }
}

function _nqUpdateStats() {
    var s = _nqState.stats;
    var elTot = document.getElementById('nqStatTotal');
    var elGen = document.getElementById('nqStatGeneral');
    var elDept = document.getElementById('nqStatDept');
    var elFine = document.getElementById('nqStatFine');

    if (elTot) elTot.textContent = s.totalRules;
    if (elGen) elGen.textContent = s.generalRules;
    if (elDept) elDept.textContent = s.deptRules;
    if (elFine) elFine.textContent = s.fineRules;
}

function _nqFormatDate(dStr) {
    if (!dStr) return '';
    try {
        var s = String(dStr).substring(0, 10);
        var parts = s.split('-');
        if (parts.length === 3) {
            return parts[2] + '/' + parts[1] + '/' + parts[0];
        }
        return dStr;
    } catch(e) {
        return dStr;
    }
}

function _nqRenderRules() {
    var grid = document.getElementById('nqRulesGrid');
    if (!grid) return;

    if (_nqState.rules.length === 0) {
        grid.innerHTML = `
            <div class="nq-empty">
                <div class="nq-empty-icon">📂</div>
                <div class="nq-empty-text">Chưa có điều khoản nào phù hợp với bộ lọc hiện tại</div>
            </div>
        `;
        return;
    }

    var html = '';
    _nqState.rules.forEach(function(r) {
        var isChung = r.scope === 'chung';
        var deptName = isChung ? 'Nội Quy Chung' : (r.department_name || 'Phòng Ban');
        
        var effDateStr = r.effective_date ? _nqFormatDate(r.effective_date) : 'Đang cập nhật';
        var createdDateStr = r.created_at ? _nqFormatDate(r.created_at) : '';

        var fineAmt = Number(r.fine_amount) || 0;
        var mgrFineAmt = Number(r.manager_fine_amount) || 0;
        var hasFine = r.has_fine && fineAmt > 0;
        var hasMgrFine = r.has_manager_fine && mgrFineAmt > 0;

        html += `
            <div class="nq-card">
                <div class="nq-card-header">
                    <span class="nq-code-badge">${r.rule_code}</span>
                    <span class="nq-scope-badge ${isChung ? 'chung' : 'phongban'}">
                        ${isChung ? '🌐 Nội Quy Chung' : '🏛️ ' + deptName}
                    </span>
                </div>
                <div class="nq-card-body">
                    <h3 class="nq-card-title">${escapeHtml(r.title)}</h3>
                    
                    <div class="nq-card-meta">
                        <div class="nq-card-meta-item">
                            <span>📅 Áp dụng từ:</span>
                            <strong style="color:#0f172a">${effDateStr}</strong>
                        </div>
                        <div class="nq-card-meta-item">
                            <span>👤 Tạo bởi:</span>
                            <strong style="color:#4338ca">${escapeHtml(r.created_by_name || 'Hệ thống')}</strong>
                        </div>
                        ${createdDateStr ? `<div class="nq-card-meta-item"><span>🕒 Ngày tạo:</span> ${createdDateStr}</div>` : ''}
                    </div>

                    <div class="nq-card-content">${escapeHtml(r.content)}</div>

                    ${r.image_url ? `
                        <div style="margin-top:8px">
                            <img src="${r.image_url}" style="max-width:100%;max-height:200px;border-radius:8px;border:1px solid #cbd5e1;cursor:pointer" onclick="window.open('${r.image_url}')">
                        </div>
                    ` : ''}

                    ${(hasFine || hasMgrFine) ? `
                        <div class="nq-fine-box">
                            <div class="nq-fine-title">
                                <span>🚨 CHẾ TÀI PHẠT VI PHẠM</span>
                            </div>
                            ${hasFine ? `
                                <div class="nq-fine-row">
                                    <span class="nq-fine-label">Cá nhân vi phạm:</span>
                                    <span class="nq-fine-value">${formatVND(fineAmt)}</span>
                                </div>
                            ` : ''}
                            ${hasMgrFine ? `
                                <div class="nq-fine-row">
                                    <span class="nq-fine-label">Quản lý liên đới:</span>
                                    <span class="nq-fine-value">${formatVND(mgrFineAmt)}</span>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
                ${_nqIsAdmin() ? `
                    <div class="nq-card-footer">
                        <div></div>
                        <div style="display:flex;gap:8px">
                            <button class="nq-action-btn nq-action-edit" onclick="_nqEditRule(${r.id})">✏️ Sửa</button>
                            <button class="nq-action-btn nq-action-del" onclick="_nqDeleteRule(${r.id})">🗑️ Xóa</button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    });

    grid.innerHTML = html;
}

// ===== FILTER HANDLERS =====
function _nqSetScope(scope) {
    _nqState.filters.scope = scope;
    ['nqTabAll', 'nqTabChung', 'nqTabPhongban'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });
    if (scope === 'all') document.getElementById('nqTabAll')?.classList.add('active');
    if (scope === 'chung') document.getElementById('nqTabChung')?.classList.add('active');
    if (scope === 'phong_ban') document.getElementById('nqTabPhongban')?.classList.add('active');

    _nqLoadRules();
}

function _nqOnSearch(val) {
    _nqState.filters.search = val;
    if (window._nqSearchTimer) clearTimeout(window._nqSearchTimer);
    window._nqSearchTimer = setTimeout(function() {
        _nqLoadRules();
    }, 350);
}

function _nqOnDeptChange(val) {
    _nqState.filters.deptId = val;
    _nqLoadRules();
}

function _nqOnMonthChange(val) {
    _nqState.filters.month = val;
    _nqLoadRules();
}

function _nqOnYearChange(val) {
    _nqState.filters.year = val;
    _nqLoadRules();
}

function _nqOnFineChange(checked) {
    _nqState.filters.hasFine = checked;
    _nqLoadRules();
}

// ===== MODAL ADD / EDIT =====
async function _nqOpenAddModal() {
    _nqState.editingId = null;
    _nqRenderModalForm(null);
}

async function _nqEditRule(id) {
    var rule = _nqState.rules.find(function(r) { return r.id === id; });
    if (!rule) return;
    _nqState.editingId = id;
    _nqRenderModalForm(rule);
}

function _nqRenderModalForm(rule) {
    var isEdit = !!rule;
    var existingModal = document.getElementById('nqModalOverlay');
    if (existingModal) existingModal.remove();

    var overlay = document.createElement('div');
    overlay.className = 'nq-modal-overlay';
    overlay.id = 'nqModalOverlay';

    var scope = isEdit ? rule.scope : 'chung';
    var deptId = isEdit ? (rule.department_id || '') : '';
    var effDate = isEdit ? rule.effective_date : new Date().toISOString().substring(0, 10);

    var deptsOpts = '<option value="">-- Chọn phòng ban --</option>';
    if (_nqState.depts.all) {
        _nqState.depts.all.forEach(function(d) {
            deptsOpts += `<option value="${d.id}" ${String(d.id) === String(deptId) ? 'selected' : ''}>${d.name}</option>`;
        });
    }

    overlay.innerHTML = `
        <div class="nq-modal">
            <div class="nq-modal-hdr">
                <h3>${isEdit ? '✏️ Chỉnh Sửa Điều Khoản' : '➕ Thêm Điều Khoản Mới'}</h3>
                <button class="nq-modal-close" onclick="_nqCloseModal()">✕</button>
            </div>
            <div class="nq-modal-body">
                <div class="nq-form-group">
                    <label>Phạm Vi Áp Dụng *</label>
                    <div style="display:flex;gap:16px;margin-top:4px">
                        <label style="font-weight:600;cursor:pointer">
                            <input type="radio" name="nqScope" value="chung" ${scope === 'chung' ? 'checked' : ''} onchange="_nqOnScopeRadioChange(this.value)"> 🏢 Nội Quy Chung
                        </label>
                        <label style="font-weight:600;cursor:pointer">
                            <input type="radio" name="nqScope" value="phong_ban" ${scope === 'phong_ban' ? 'checked' : ''} onchange="_nqOnScopeRadioChange(this.value)"> 🏛️ Nội Quy Phòng Ban
                        </label>
                    </div>
                </div>

                <div class="nq-form-group" id="nqDeptSelectGroup" style="display:${scope === 'phong_ban' ? 'flex' : 'none'}">
                    <label>Phòng Ban Áp Dụng *</label>
                    <select class="nq-form-select" id="nqFormDeptId" onchange="_nqOnFormDeptChange(this.value)">
                        ${deptsOpts}
                    </select>
                </div>

                <div class="nq-form-group">
                    <label>Mã Điều Khoản (Tự động sinh hoặc chỉnh sửa)</label>
                    <div style="display:flex;gap:8px">
                        <input type="text" class="nq-form-input" id="nqFormCode" value="${isEdit ? rule.rule_code : ''}" placeholder="VD: NQ-CHUNG0001, NQ-KT0001...">
                        <button type="button" class="nq-btn-secondary" onclick="_nqFetchNextCode()" style="white-space:nowrap">⚡ Sinh Mã</button>
                    </div>
                </div>

                <div class="nq-form-group">
                    <label>Tiêu Đề Nội Quy *</label>
                    <input type="text" class="nq-form-input" id="nqFormTitle" value="${isEdit ? escapeHtml(rule.title) : ''}" placeholder="Nhập tiêu đề điều khoản ngắn gọn, rõ ràng...">
                </div>

                <div class="nq-form-group">
                    <label>Nội Dung Chi Tiết Điều Khoản *</label>
                    <textarea class="nq-form-textarea" id="nqFormContent" placeholder="Nhập nội dung các quy định chi tiết...">${isEdit ? escapeHtml(rule.content) : ''}</textarea>
                </div>

                <div class="nq-form-group">
                    <label>Hình Ảnh Minh Họa / File Đính Kèm (Link URL)</label>
                    <input type="text" class="nq-form-input" id="nqFormImage" value="${isEdit && rule.image_url ? escapeHtml(rule.image_url) : ''}" placeholder="https://...">
                </div>

                <div class="nq-form-group">
                    <label>Áp Dụng Từ Ngày *</label>
                    <input type="date" class="nq-form-input" id="nqFormEffDate" value="${effDate}">
                </div>

                <!-- Fine Section -->
                <div style="background:#fff1f2;border:1px solid #ffe4e6;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:12px">
                    <div style="font-weight:900;color:#be123c;font-size:13px;display:flex;align-items:center;gap:6px">
                        🚨 CHẾ TÀI PHẠT VI PHẠM (NẾU CÓ)
                    </div>

                    <div style="display:flex;align-items:center;justify-content:space-between">
                        <label style="font-size:13px;font-weight:700;color:#334155;cursor:pointer">
                            <input type="checkbox" id="nqFormHasFine" ${isEdit && rule.has_fine ? 'checked' : ''} onchange="_nqToggleFineInput(this.checked)"> Phạt vi phạm cá nhân
                        </label>
                        <input type="number" class="nq-form-input" id="nqFormFineAmt" style="width:160px" value="${isEdit ? Number(rule.fine_amount) : 0}" placeholder="Số tiền VNĐ" ${isEdit && rule.has_fine ? '' : 'disabled'}>
                    </div>

                    <div style="display:flex;align-items:center;justify-content:space-between">
                        <label style="font-size:13px;font-weight:700;color:#334155;cursor:pointer">
                            <input type="checkbox" id="nqFormHasMgrFine" ${isEdit && rule.has_manager_fine ? 'checked' : ''} onchange="_nqToggleMgrFineInput(this.checked)"> Phạt quản lý liên đới
                        </label>
                        <input type="number" class="nq-form-input" id="nqFormMgrFineAmt" style="width:160px" value="${isEdit ? Number(rule.manager_fine_amount) : 0}" placeholder="Số tiền VNĐ" ${isEdit && rule.has_manager_fine ? '' : 'disabled'}>
                    </div>
                </div>
            </div>
            <div class="nq-modal-ftr">
                <button class="nq-btn-secondary" onclick="_nqCloseModal()">Hủy</button>
                <button class="nq-btn-primary" onclick="_nqSaveRule()">${isEdit ? 'Lưu Cập Nhật' : 'Tạo Mới'}</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    if (!isEdit) {
        _nqFetchNextCode();
    }
}

function _nqCloseModal() {
    var el = document.getElementById('nqModalOverlay');
    if (el) el.remove();
}

function _nqOnScopeRadioChange(val) {
    var grp = document.getElementById('nqDeptSelectGroup');
    if (grp) grp.style.display = (val === 'phong_ban') ? 'flex' : 'none';
    _nqFetchNextCode();
}

function _nqOnFormDeptChange(val) {
    _nqFetchNextCode();
}

function _nqToggleFineInput(checked) {
    var inp = document.getElementById('nqFormFineAmt');
    if (inp) inp.disabled = !checked;
}

function _nqToggleMgrFineInput(checked) {
    var inp = document.getElementById('nqFormMgrFineAmt');
    if (inp) inp.disabled = !checked;
}

async function _nqFetchNextCode() {
    var scopeRadio = document.querySelector('input[name="nqScope"]:checked');
    var scope = scopeRadio ? scopeRadio.value : 'chung';
    var deptId = document.getElementById('nqFormDeptId')?.value || '';

    try {
        var params = new URLSearchParams({ scope: scope });
        if (scope === 'phong_ban' && deptId) params.append('department_id', deptId);

        var res = await apiCall('/api/company-rules/next-code?' + params.toString());
        if (res && res.nextCode) {
            var codeInp = document.getElementById('nqFormCode');
            if (codeInp && (!_nqState.editingId || !codeInp.value)) {
                codeInp.value = res.nextCode;
            }
        }
    } catch (e) {
        console.error('Error fetch next code:', e);
    }
}

async function _nqSaveRule() {
    var scopeRadio = document.querySelector('input[name="nqScope"]:checked');
    var scope = scopeRadio ? scopeRadio.value : 'chung';
    var deptId = document.getElementById('nqFormDeptId')?.value || null;
    var ruleCode = document.getElementById('nqFormCode')?.value || '';
    var title = document.getElementById('nqFormTitle')?.value || '';
    var content = document.getElementById('nqFormContent')?.value || '';
    var imageUrl = document.getElementById('nqFormImage')?.value || '';
    var effDate = document.getElementById('nqFormEffDate')?.value || '';
    
    var hasFine = document.getElementById('nqFormHasFine')?.checked || false;
    var fineAmt = Number(document.getElementById('nqFormFineAmt')?.value) || 0;
    var hasMgrFine = document.getElementById('nqFormHasMgrFine')?.checked || false;
    var mgrFineAmt = Number(document.getElementById('nqFormMgrFineAmt')?.value) || 0;

    if (!title.trim()) { alert('Vui lòng nhập tiêu đề nội quy'); return; }
    if (!content.trim()) { alert('Vui lòng nhập nội dung nội quy'); return; }
    if (!effDate) { alert('Vui lòng chọn ngày áp dụng'); return; }
    if (scope === 'phong_ban' && !deptId) { alert('Vui lòng chọn phòng ban áp dụng'); return; }

    var payload = {
        scope: scope,
        department_id: deptId,
        rule_code: ruleCode,
        title: title,
        content: content,
        image_url: imageUrl,
        effective_date: effDate,
        has_fine: hasFine,
        fine_amount: fineAmt,
        has_manager_fine: hasMgrFine,
        manager_fine_amount: mgrFineAmt
    };

    try {
        var res;
        if (_nqState.editingId) {
            res = await apiCall('/api/company-rules/' + _nqState.editingId, { method: 'PUT', body: JSON.stringify(payload) });
        } else {
            res = await apiCall('/api/company-rules', { method: 'POST', body: JSON.stringify(payload) });
        }

        if (res && res.error) {
            alert(res.error);
            return;
        }

        _nqCloseModal();
        await _nqLoadRules();
    } catch (e) {
        console.error('Error save rule:', e);
        alert('Lỗi lưu điều khoản');
    }
}

async function _nqDeleteRule(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa điều khoản này?')) return;
    try {
        var res = await apiCall('/api/company-rules/' + id, { method: 'DELETE' });
        if (res && res.error) {
            alert(res.error);
            return;
        }
        await _nqLoadRules();
    } catch (e) {
        console.error('Error delete rule:', e);
    }
}
