// ========== PHẠT KHÓA TÀI KHOẢN NV ==========

let _penaltyMonth = '';
let _penaltyData = [];

async function renderKhoaTKNVPage(container) {
    const isGD = currentUser.role === 'giam_doc';
    const isManager = ['giam_doc', 'quan_ly', 'truong_phong', 'trinh'].includes(currentUser.role);

    // Default to current month
    const now = new Date();
    _penaltyMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    container.innerHTML = `
    <div style="max-width:1400px;margin:0 auto;padding:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
            <h2 style="margin:0;font-size:22px;color:#122546;font-weight:800;">🔒 Phạt Khóa Tài Khoản NV</h2>
        </div>

        ${isGD ? `
        <!-- SECTION 1: CẤU HÌNH MỨC PHẠT THEO PHÒNG BAN -->
        <div style="background:white;border:2px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
            <div onclick="_penaltyToggleConfig()" style="background:linear-gradient(135deg,#122546,#1e3a5f);padding:14px 18px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;">
                <span style="color:white;font-weight:800;font-size:15px;">⚙️ CẤU HÌNH MỨC PHẠT THEO PHÒNG BAN</span>
                <span id="penaltyConfigToggle" style="color:white;font-size:18px;transition:transform .2s;">▼</span>
            </div>
            <div id="penaltyConfigBody" style="display:none;padding:16px;">
                <div style="margin-bottom:12px;padding:10px 14px;background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;">
                    <div style="font-size:12px;color:#1e40af;font-weight:600;">ℹ️ Quy tắc phạt</div>
                    <div style="font-size:11px;color:#3b82f6;margin-top:4px;">Áp dụng cho cả <strong>📋 Công việc chờ duyệt</strong> và <strong>🆘 Hỗ trợ nhân sự</strong>. Khi quản lý không xử lý trước deadline → tự động bị khóa TK + phạt số tiền đã cấu hình.</div>
                </div>
                <div id="penaltyConfigList" style="margin-bottom:12px;">Đang tải...</div>
                <div style="text-align:right;">
                    <button onclick="_penaltySaveConfig()" style="padding:8px 20px;font-size:13px;border:none;border-radius:8px;background:linear-gradient(135deg,#059669,#10b981);color:white;cursor:pointer;font-weight:700;box-shadow:0 2px 6px rgba(5,150,105,0.3);">💾 Lưu mức phạt</button>
                </div>
            </div>
        </div>
        ` : ''}

        <!-- SECTION 2: THỐNG KÊ PHẠT -->
        <div style="background:white;border:2px solid #fca5a5;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(220,38,38,0.1);">
            <div style="background:linear-gradient(135deg,#dc2626,#ef4444);padding:14px 18px;display:flex;align-items:center;justify-content:space-between;">
                <span style="color:white;font-weight:800;font-size:15px;">📊 THỐNG KÊ PHẠT NHÂN SỰ</span>
                <div style="display:flex;align-items:center;gap:8px;">
                    <input type="month" id="penaltyMonthPicker" value="${_penaltyMonth}" onchange="_penaltyChangeMonth(this.value)" style="padding:4px 8px;border:1px solid rgba(255,255,255,0.3);border-radius:6px;font-size:12px;background:rgba(255,255,255,0.15);color:white;font-weight:600;">
                    <span id="penaltyTotalBadge" style="background:rgba(255,255,255,0.3);color:white;padding:3px 12px;border-radius:10px;font-size:13px;font-weight:800;">0đ</span>
                </div>
            </div>
            <div id="penaltyStatsBody" style="padding:16px;">
                <div style="text-align:center;color:#9ca3af;font-size:13px;padding:20px;">Đang tải...</div>
            </div>
        </div>
    </div>`;

    if (isGD) _penaltyLoadConfig();
    _penaltyLoadStats();
}

// ===== CONFIG =====
let _penaltyConfigOpen = false;
function _penaltyToggleConfig() {
    _penaltyConfigOpen = !_penaltyConfigOpen;
    const body = document.getElementById('penaltyConfigBody');
    const toggle = document.getElementById('penaltyConfigToggle');
    if (body) body.style.display = _penaltyConfigOpen ? 'block' : 'none';
    if (toggle) toggle.style.transform = _penaltyConfigOpen ? 'rotate(180deg)' : '';
    if (_penaltyConfigOpen) _penaltyLoadConfig();
}

async function _penaltyLoadConfig() {
    const list = document.getElementById('penaltyConfigList');
    if (!list) return;

    try {
        const data = await apiCall('/api/penalty/config');
        const configs = data.configs || [];

        if (configs.length === 0) {
            list.innerHTML = '<div style="text-align:center;color:#9ca3af;padding:10px;">Chưa có phòng ban nào</div>';
            return;
        }

        // Build tree: parent depts with children
        const roots = configs.filter(c => !c.parent_id);
        const children = configs.filter(c => c.parent_id);

        let html = '<div style="display:flex;flex-direction:column;gap:10px;">';

        // --- Header ---
        html += `<div style="display:flex;padding:8px 14px;background:linear-gradient(135deg,#f8fafc,#eef2ff);border-radius:8px;border:1px solid #e2e8f0;">
            <div style="flex:2;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;">📋 Lịch Khóa Biểu Công Việc</div>
            <div style="flex:1;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;text-align:center;">Người chịu TN</div>
            <div style="flex:1;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;text-align:center;">Mức phạt / việc</div>
        </div>`;

        roots.forEach(root => {
            const subs = children.filter(c => c.parent_id === root.department_id);

            // Parent dept
            html += `<div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:10px 14px;display:flex;align-items:center;">
                    <div style="flex:2;color:white;font-weight:800;font-size:14px;">🏢 ${root.department_name}</div>
                    <div style="flex:1;text-align:center;color:#93c5fd;font-size:12px;font-weight:600;">
                        ${root.approver ? `👤 ${root.approver.name}` : '<span style="color:#fca5a5;">Chưa setup</span>'}
                    </div>
                    <div style="flex:1;text-align:center;">
                        <input type="number" class="dept-penalty-input" data-dept="${root.department_id}" value="${root.penalty_amount}" min="0" step="10000" style="width:100px;padding:5px 8px;border:1px solid rgba(255,255,255,0.3);border-radius:6px;font-size:13px;font-weight:700;text-align:right;background:rgba(255,255,255,0.15);color:white;">
                    </div>
                </div>`;

            // Sub-departments
            if (subs.length > 0) {
                subs.forEach(sub => {
                    const subSubs = children.filter(c => c.parent_id === sub.department_id);

                    html += `<div style="display:flex;align-items:center;padding:9px 14px 9px 28px;border-bottom:1px solid #f1f5f9;background:white;">
                        <div style="flex:2;font-size:13px;font-weight:600;color:#334155;">┣ ${sub.department_name}</div>
                        <div style="flex:1;text-align:center;font-size:12px;color:#6b7280;">
                            ${sub.approver ? `👤 ${sub.approver.name}` : '<span style="color:#f97316;">Chưa setup</span>'}
                        </div>
                        <div style="flex:1;text-align:center;">
                            <input type="number" class="dept-penalty-input" data-dept="${sub.department_id}" value="${sub.penalty_amount}" min="0" step="10000" style="width:100px;padding:5px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;font-weight:600;text-align:right;">
                        </div>
                    </div>`;

                    // Sub-sub departments (teams)
                    const subSubDepts = configs.filter(c => c.parent_id === sub.department_id);
                    subSubDepts.forEach(ss => {
                        html += `<div style="display:flex;align-items:center;padding:7px 14px 7px 48px;border-bottom:1px solid #f8fafc;background:#fafbfc;">
                            <div style="flex:2;font-size:12px;color:#64748b;font-weight:500;">┗ ${ss.department_name}</div>
                            <div style="flex:1;text-align:center;font-size:11px;color:#9ca3af;">
                                ${ss.approver ? `👤 ${ss.approver.name}` : '—'}
                            </div>
                            <div style="flex:1;text-align:center;">
                                <input type="number" class="dept-penalty-input" data-dept="${ss.department_id}" value="${ss.penalty_amount}" min="0" step="10000" style="width:90px;padding:4px 6px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;text-align:right;">
                            </div>
                        </div>`;
                    });
                });
            }

            html += '</div>';
        });

        html += '</div>';
        list.innerHTML = html;
    } catch(e) {
        list.innerHTML = '<div style="color:#dc2626;">Lỗi tải cấu hình</div>';
    }
}

async function _penaltySaveConfig() {
    const inputs = document.querySelectorAll('.dept-penalty-input');
    const configs = [];
    inputs.forEach(inp => {
        configs.push({
            department_id: Number(inp.dataset.dept),
            penalty_amount: Number(inp.value) || 50000
        });
    });

    try {
        const res = await apiCall('/api/penalty/config', 'POST', { configs });
        if (res.error) { alert(res.error); return; }
        showToast('✅ Đã lưu mức phạt');
        _penaltyLoadConfig();
    } catch(e) {
        alert('Lỗi: ' + e.message);
    }
}

// ===== STATS =====
function _penaltyChangeMonth(val) {
    _penaltyMonth = val;
    _penaltyLoadStats();
}

async function _penaltyLoadStats() {
    const body = document.getElementById('penaltyStatsBody');
    const badge = document.getElementById('penaltyTotalBadge');
    if (!body) return;

    body.innerHTML = '<div style="text-align:center;color:#9ca3af;font-size:13px;padding:20px;">⏳ Đang tải...</div>';

    try {
        const data = await apiCall(`/api/penalty/lis        if (_penaltyData.length === 0) {
            body.innerHTML = `<div style="text-align:center;padding:40px;">
                <div style="font-size:40px;margin-bottom:8px;">✅</div>
                <div style="color:#059669;font-weight:700;font-size:14px;">Không có vi phạm nào trong tháng này</div>
            </div>`;
            return;
        }

        // Group by penalized person
        const byPerson = {};
        _penaltyData.forEach(p => {
            const key = p.penalized_user_id || p.manager_id;
            if (!byPerson[key]) byPerson[key] = {
                name: p.penalized_name || p.manager_name,
                username: p.penalized_username || p.manager_username,
                dept: p.dept_name,
                items: [],
                total: 0
            };
            byPerson[key].items.push(p);
            byPerson[key].total += (p.penalty_amount || 0);
        });

        // Source type badge colors
        const _srcBadge = (type) => {
            if (type === 'khoa') return '<span style="background:#fef2f2;color:#dc2626;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;">🔒 CV Khóa</span>';
            if (type === 'diem') return '<span style="background:#fffbeb;color:#d97706;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;">📊 CV Điểm</span>';
            if (type === 'support') return '<span style="background:#eff6ff;color:#2563eb;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;">🆘 Hỗ trợ</span>';
            return '';
        };

        let html = '';
        Object.keys(byPerson).forEach(pId => {
            const pg = byPerson[pId];
            let rows = pg.items.map((p, i) => `
                <tr style="border-bottom:1px solid #f1f5f9;${i % 2 ? 'background:#fafbfc;' : ''}">
                    <td style="padding:8px 12px;font-size:12px;color:#374151;font-weight:600;">${p.task_name}</td>
                    <td style="padding:8px 12px;font-size:12px;color:#6b7280;">${p.task_date ? p.task_date.split('-').reverse().join('/') : '—'}</td>
                    <td style="padding:8px 12px;font-size:11px;color:#64748b;max-width:250px;overflow:hidden;text-overflow:ellipsis;" title="${(p.penalty_reason||'').replace(/"/g, '&quot;')}">${p.penalty_reason || '—'}</td>
                    <td style="padding:8px 12px;font-size:11px;">${_srcBadge(p.source_type)}</td>
                    <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#dc2626;">${(p.penalty_amount || 0).toLocaleString()}đ</td>
                    <td style="padding:8px 12px;font-size:11px;">
                        ${p.acknowledged ? '<span style="background:#dcfce7;color:#059669;padding:2px 8px;border-radius:4px;font-weight:600;">✅ Đã XN</span>' : '<span style="background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:4px;font-weight:600;">⏳ Chưa XN</span>'}
                    </td>
                </tr>
            `).join('');

            html += `
            <div style="margin-bottom:16px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                <div style="background:#f8fafc;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7eb;">
                    <div>
                        <span style="font-weight:700;color:#1e293b;font-size:14px;">👤 ${pg.name || 'Không rõ'}</span>
                        <span style="color:#9ca3af;font-size:11px;margin-left:4px;">(${pg.username || ''})</span>
                        <span style="color:#6b7280;font-size:11px;margin-left:6px;">${pg.dept || ''}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="background:#fecaca;color:#dc2626;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:700;">${pg.total.toLocaleString()}đ</span>
                        <button onclick="_penaltyShowSlip(${pId},'${_penaltyMonth}','${(pg.name||'').replace(/'/g,"\\\\'")}') " style="padding:4px 10px;font-size:11px;border:1px solid #2563eb;border-radius:6px;background:white;color:#2563eb;cursor:pointer;font-weight:600;">📄 Phiếu phạt</button>
                    </div>
                </div>
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:#1e3a5f;">
                            <th style="padding:8px 12px;text-align:left;font-size:10px;color:#fca5a5;font-weight:700;text-transform:uppercase;">Công việc</th>
                            <th style="padding:8px 12px;text-align:left;font-size:10px;color:#fca5a5;font-weight:700;text-transform:uppercase;">Ngày</th>
                            <th style="padding:8px 12px;text-align:left;font-size:10px;color:#fca5a5;font-weight:700;text-transform:uppercase;">Lý do</th>
                            <th style="padding:8px 12px;text-align:left;font-size:10px;color:#fca5a5;font-weight:700;text-transform:uppercase;">Loại</th>
                            <th style="padding:8px 12px;text-align:left;font-size:10px;color:#fca5a5;font-weight:700;text-transform:uppercase;">Số tiền</th>
                            <th style="padding:8px 12px;text-align:left;font-size:10px;color:#fca5a5;font-weight:700;text-transform:uppercase;">Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
        });

        body.innerHTML = html;
    } catch(e) {
        body.innerHTML = `<div style="color:#dc2626;text-align:center;padding:20px;">Lỗi: ${e.message || 'Không tải được'}</div>`;
    }
}

// ===== PENALTY SLIP =====
async function _penaltyShowSlip(managerId, month, managerName) {
    try {
        const data = await apiCall(`/api/penalty/slip/${managerId}/${month}`);
        if (data.error) { alert(data.error); return; }

        const [y, m] = month.split('-');
        const monthLabel = `Tháng ${m}/${y}`;
        const mg = data.manager;
        const items = data.items || [];
        const total = data.total || 0;

        let itemsHtml = items.map((item, i) => `
            <tr style="border-bottom:1px solid #e5e7eb;${i % 2 ? 'background:#fafbfc;' : ''}">
                <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#1e293b;">${i + 1}</td>
                <td style="padding:10px 14px;font-size:13px;color:#374151;font-weight:600;">${item.task_name}</td>
                <td style="padding:10px 14px;font-size:12px;color:#6b7280;">${item.task_date.split('-').reverse().join('/')}</td>
                <td style="padding:10px 14px;font-size:12px;color:#374151;">${item.penalty_reason || 'Vi phạm quy định'}</td>
                <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#dc2626;text-align:right;">${(item.penalty_amount || 0).toLocaleString()}đ</td>
            </tr>
        `).join('');

        document.getElementById('penaltySlipModal')?.remove();
        const modal = document.createElement('div');
        modal.id = 'penaltySlipModal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `
        <div id="penaltySlipContent" style="background:white;border-radius:16px;width:650px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,.3);">
            <!-- HEADER -->
            <div style="background:linear-gradient(135deg,#122546,#1e3a5f);padding:24px 28px;border-radius:16px 16px 0 0;text-align:center;">
                <div style="font-size:11px;color:#93c5fd;font-weight:600;letter-spacing:2px;text-transform:uppercase;">ĐỒNG PHỤC HV</div>
                <div style="font-size:20px;color:white;font-weight:800;margin-top:4px;">📋 PHIẾU THỐNG KÊ PHẠT</div>
                <div style="font-size:13px;color:#93c5fd;margin-top:4px;">${monthLabel}</div>
            </div>
            <!-- INFO -->
            <div style="padding:20px 28px;border-bottom:2px dashed #e5e7eb;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div>
                        <div style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;">Nhân viên</div>
                        <div style="font-size:15px;color:#1e293b;font-weight:800;margin-top:2px;">${mg.name}</div>
                    </div>
                    <div>
                        <div style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;">Phòng ban</div>
                        <div style="font-size:15px;color:#1e293b;font-weight:800;margin-top:2px;">${mg.dept || '—'}</div>
                    </div>
                </div>
            </div>
            <!-- ITEMS -->
            <div style="padding:0 28px;">
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="border-bottom:2px solid #122546;">
                            <th style="padding:12px 14px;text-align:left;font-size:11px;color:#122546;font-weight:700;">STT</th>
                            <th style="padding:12px 14px;text-align:left;font-size:11px;color:#122546;font-weight:700;">CÔNG VIỆC</th>
                            <th style="padding:12px 14px;text-align:left;font-size:11px;color:#122546;font-weight:700;">NGÀY</th>
                            <th style="padding:12px 14px;text-align:left;font-size:11px;color:#122546;font-weight:700;">LÝ DO VI PHẠM</th>
                            <th style="padding:12px 14px;text-align:right;font-size:11px;color:#122546;font-weight:700;">SỐ TIỀN</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                    <tfoot>
                        <tr style="border-top:2px solid #122546;">
                            <td colspan="4" style="padding:14px;font-size:15px;font-weight:800;color:#122546;text-align:right;">TỔNG CỘNG:</td>
                            <td style="padding:14px;font-size:18px;font-weight:800;color:#dc2626;text-align:right;">${total.toLocaleString()}đ</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <!-- FOOTER -->
            <div style="padding:20px 28px;border-top:2px dashed #e5e7eb;display:flex;justify-content:space-between;align-items:flex-end;">
                <div style="font-size:11px;color:#9ca3af;line-height:1.6;">
                    Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}<br>
                    Hệ thống Đồng Phục HV
                </div>
                <div style="text-align:center;">
                    <div style="font-size:12px;font-weight:700;color:#374151;">Xác nhận</div>
                    <div style="width:120px;border-bottom:1px solid #374151;margin-top:40px;"></div>
                </div>
            </div>
            <!-- ACTIONS -->
            <div style="padding:16px 28px;background:#f8fafc;border-radius:0 0 16px 16px;display:flex;justify-content:flex-end;gap:8px;">
                <button onclick="window.print()" style="padding:8px 16px;font-size:12px;border:1px solid #2563eb;border-radius:8px;background:white;color:#2563eb;cursor:pointer;font-weight:600;">🖨️ In phiếu</button>
                <button onclick="document.getElementById('penaltySlipModal')?.remove()" style="padding:8px 16px;font-size:12px;border:1px solid #e5e7eb;border-radius:8px;background:white;color:#64748b;cursor:pointer;font-weight:600;">Đóng</button>
            </div>
        </div>`;

        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    } catch(e) {
        alert('Lỗi: ' + e.message);
    }
}

// ===== PENALTY LOCK POPUP (hiện khi QL bị khóa TK) =====
async function _showPenaltyLockPopup(penalties, total) {
    document.getElementById('penaltyLockPopup')?.remove();

    const itemsHtml = penalties.map((p, i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid #f1f5f9;${i % 2 ? 'background:#fafbfc;' : ''}">
            <div style="flex:0 0 24px;font-size:12px;font-weight:700;color:#6b7280;text-align:center;">${i+1}</div>
            <div style="flex:1;">
                <div style="font-size:13px;font-weight:700;color:#1e293b;">${p.task_name}</div>
                <div style="font-size:11px;color:#6b7280;">Ngày: ${p.task_date.split('-').reverse().join('/')} • NV yêu cầu: ${p.requested_by || '—'}</div>
            </div>
            <div style="font-size:13px;font-weight:800;color:#dc2626;">${(p.penalty_amount || 0).toLocaleString()}đ</div>
        </div>
    `).join('');

    const popup = document.createElement('div');
    popup.id = 'penaltyLockPopup';
    popup.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;animation:fadeIn .3s ease;backdrop-filter:blur(4px);';
    popup.innerHTML = `
    <style>
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes shakeX { 0%,100% { transform:translateX(0); } 10%,30%,50%,70%,90% { transform:translateX(-5px); } 20%,40%,60%,80% { transform:translateX(5px); } }
        @keyframes pulseRed { 0%,100% { box-shadow:0 0 0 0 rgba(220,38,38,0.4); } 50% { box-shadow:0 0 0 12px rgba(220,38,38,0); } }
    </style>
    <div style="background:white;border-radius:20px;width:500px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 80px rgba(220,38,38,.3);border:2px solid #fca5a5;animation:shakeX .5s ease;">
        <!-- RED HEADER -->
        <div style="background:linear-gradient(135deg,#991b1b,#dc2626);padding:28px 24px;text-align:center;border-radius:18px 18px 0 0;">
            <div style="width:70px;height:70px;background:rgba(255,255,255,0.15);border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center;animation:pulseRed 2s infinite;">
                <span style="font-size:36px;">🔒</span>
            </div>
            <div style="font-size:20px;font-weight:800;color:white;margin-top:12px;">TÀI KHOẢN BỊ KHÓA</div>
            <div style="font-size:12px;color:#fecaca;margin-top:6px;">Bạn chưa xử lý công việc trước thời hạn</div>
        </div>

        <!-- PENALTY INFO -->
        <div style="padding:20px 24px;">
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px;margin-bottom:16px;">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                    <div style="font-size:13px;color:#991b1b;font-weight:600;">💰 Tổng tiền phạt</div>
                    <div style="font-size:24px;font-weight:900;color:#dc2626;">${total.toLocaleString()}đ</div>
                </div>
            </div>

            <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:8px;text-transform:uppercase;">📋 Chi tiết vi phạm (${penalties.length} việc)</div>
            <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;max-height:250px;overflow-y:auto;">
                ${itemsHtml}
            </div>

            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin-top:14px;">
                <div style="font-size:11px;color:#92400e;font-weight:600;">⚠️ Lý do bị khóa</div>
                <div style="font-size:12px;color:#78350f;margin-top:4px;">Quản lý không duyệt / hỗ trợ nhân viên trước deadline theo quy định. Số tiền phạt sẽ được trừ vào lương cuối tháng.</div>
            </div>
        </div>

        <!-- CONFIRM -->
        <div style="padding:16px 24px 24px;text-align:center;">
            <button onclick="_penaltyAcknowledge()" id="penaltyAckBtn" style="padding:14px 40px;font-size:14px;border:none;border-radius:10px;background:linear-gradient(135deg,#dc2626,#991b1b);color:white;cursor:pointer;font-weight:800;box-shadow:0 4px 12px rgba(220,38,38,0.4);width:100%;transition:all .2s;">
                ✅ Tôi đã đọc và xác nhận — Mở khóa tài khoản
            </button>
            <div style="font-size:10px;color:#9ca3af;margin-top:8px;">Bấm xác nhận để mở khóa tài khoản và tiếp tục làm việc</div>
        </div>
    </div>`;

    document.body.appendChild(popup);
}

async function _penaltyAcknowledge() {
    const btn = document.getElementById('penaltyAckBtn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Đang xử lý...';
    }

    try {
        const res = await apiCall('/api/penalty/acknowledge-self', 'POST');
        if (res.success) {
            document.getElementById('penaltyLockPopup')?.remove();
            showToast('✅ ' + (res.message || 'Đã xác nhận. Tài khoản đã mở khóa.'));
        } else {
            alert(res.error || 'Lỗi');
            if (btn) { btn.disabled = false; btn.textContent = '✅ Tôi đã đọc và xác nhận — Mở khóa tài khoản'; }
        }
    } catch(e) {
        alert('Lỗi: ' + e.message);
        if (btn) { btn.disabled = false; btn.textContent = '✅ Tôi đã đọc và xác nhận — Mở khóa tài khoản'; }
    }
}
