// ========== PHẠT KHÓA TÀI KHOẢN NV ==========

let _penaltyMonth = '';
let _penaltyData = [];

const _CRM_LABELS = {
    nhu_cau: 'KH Nhu Cầu', ctv: 'CTV', hoa_hong_crm: 'GV/HS/SV',
    nuoi_duong: 'NS/KT/PMH', sinh_vien: 'TT/TTL', koc_tiktok: 'KOL/MBS',
    qua_tang: 'QT/SK/DL', affiliate: 'Affiliate GT', nguoi_than: 'NT/BB',
    ctv_hoa_hong: 'CTV/HH'
};

async function renderKhoaTKNVPage(container) {
    const isGD = currentUser.role === 'giam_doc';
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
                    <div style="font-size:11px;color:#3b82f6;margin-top:4px;">Áp dụng cho <strong>📋 CV Điểm</strong>, <strong>🆘 Hỗ trợ NV</strong>, <strong>🚨 Cấp cứu</strong> và <strong>❌ KH chưa xử lý</strong>. Khi không xử lý trước deadline → tự động bị khóa TK + phạt số tiền đã cấu hình.</div>
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

        const roots = configs.filter(c => !c.parent_id);
        const children = configs.filter(c => c.parent_id);

        let html = '<div style="display:flex;flex-direction:column;gap:10px;">';

        // Header
        html += `<div style="display:flex;padding:8px 14px;background:linear-gradient(135deg,#f8fafc,#eef2ff);border-radius:8px;border:1px solid #e2e8f0;">
            <div style="flex:2;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;">📋 Phòng ban</div>
            <div style="flex:1;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;text-align:center;">Người chịu TN</div>
            <div style="flex:1;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;text-align:center;">Mức phạt / việc</div>
            <div style="flex:1;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;text-align:center;">🚨 Phạt cấp cứu</div>
            <div style="flex:1;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;text-align:center;">❌ Phạt KH</div>
        </div>`;

        roots.forEach(root => {
            const subs = children.filter(c => c.parent_id === root.department_id);

            html += `<div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:10px 14px;display:flex;align-items:center;">
                    <div style="flex:2;color:white;font-weight:800;font-size:14px;">🏢 ${root.department_name}</div>
                    <div style="flex:1;text-align:center;color:#93c5fd;font-size:12px;font-weight:600;">
                        ${root.approver ? `👤 ${root.approver.name}` : '<span style="color:#fca5a5;">Chưa setup</span>'}
                    </div>
                    <div style="flex:1;text-align:center;">
                        <input type="number" class="dept-penalty-input" data-dept="${root.department_id}" value="${root.penalty_amount}" min="0" step="10000" style="width:90px;padding:5px 8px;border:1px solid rgba(255,255,255,0.3);border-radius:6px;font-size:13px;font-weight:700;text-align:right;background:rgba(255,255,255,0.15);color:white;">
                    </div>
                    <div style="flex:1;text-align:center;">
                        <input type="number" class="dept-em-penalty-input" data-dept="${root.department_id}" value="${root.emergency_penalty_amount}" min="0" step="10000" style="width:90px;padding:5px 8px;border:1px solid rgba(255,255,255,0.3);border-radius:6px;font-size:13px;font-weight:700;text-align:right;background:rgba(220,38,38,0.3);color:white;">
                    </div>
                    <div style="flex:1;text-align:center;">
                        <input type="number" class="dept-cust-penalty-input" data-dept="${root.department_id}" value="${root.customer_penalty_amount}" min="0" step="10000" style="width:90px;padding:5px 8px;border:1px solid rgba(255,255,255,0.3);border-radius:6px;font-size:13px;font-weight:700;text-align:right;background:rgba(245,158,11,0.3);color:white;">
                    </div>
                </div>`;

            if (subs.length > 0) {
                subs.forEach(sub => {
                    html += `<div style="display:flex;align-items:center;padding:9px 14px 9px 28px;border-bottom:1px solid #f1f5f9;background:white;">
                        <div style="flex:2;font-size:13px;font-weight:600;color:#334155;">┣ ${sub.department_name}</div>
                        <div style="flex:1;text-align:center;font-size:12px;color:#6b7280;">
                            ${sub.approver ? `👤 ${sub.approver.name}` : '<span style="color:#f97316;">Chưa setup</span>'}
                        </div>
                        <div style="flex:1;text-align:center;">
                            <input type="number" class="dept-penalty-input" data-dept="${sub.department_id}" value="${sub.penalty_amount}" min="0" step="10000" style="width:90px;padding:5px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;font-weight:600;text-align:right;">
                        </div>
                        <div style="flex:1;text-align:center;">
                            <input type="number" class="dept-em-penalty-input" data-dept="${sub.department_id}" value="${sub.emergency_penalty_amount}" min="0" step="10000" style="width:90px;padding:5px 8px;border:1px solid #fca5a5;border-radius:6px;font-size:13px;font-weight:600;text-align:right;">
                        </div>
                        <div style="flex:1;text-align:center;">
                            <input type="number" class="dept-cust-penalty-input" data-dept="${sub.department_id}" value="${sub.customer_penalty_amount}" min="0" step="10000" style="width:90px;padding:5px 8px;border:1px solid #fde68a;border-radius:6px;font-size:13px;font-weight:600;text-align:right;">
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
                                <input type="number" class="dept-penalty-input" data-dept="${ss.department_id}" value="${ss.penalty_amount}" min="0" step="10000" style="width:85px;padding:4px 6px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;text-align:right;">
                            </div>
                            <div style="flex:1;text-align:center;">
                                <input type="number" class="dept-em-penalty-input" data-dept="${ss.department_id}" value="${ss.emergency_penalty_amount}" min="0" step="10000" style="width:85px;padding:4px 6px;border:1px solid #fca5a5;border-radius:6px;font-size:12px;text-align:right;">
                            </div>
                            <div style="flex:1;text-align:center;">
                                <input type="number" class="dept-cust-penalty-input" data-dept="${ss.department_id}" value="${ss.customer_penalty_amount}" min="0" step="10000" style="width:85px;padding:4px 6px;border:1px solid #fde68a;border-radius:6px;font-size:12px;text-align:right;">
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
    const emInputs = document.querySelectorAll('.dept-em-penalty-input');
    const custInputs = document.querySelectorAll('.dept-cust-penalty-input');
    const configMap = {};
    inputs.forEach(inp => {
        const deptId = Number(inp.dataset.dept);
        if (!configMap[deptId]) configMap[deptId] = { department_id: deptId };
        configMap[deptId].penalty_amount = Number(inp.value) || 50000;
    });
    emInputs.forEach(inp => {
        const deptId = Number(inp.dataset.dept);
        if (!configMap[deptId]) configMap[deptId] = { department_id: deptId };
        configMap[deptId].emergency_penalty_amount = Number(inp.value) || 50000;
    });
    custInputs.forEach(inp => {
        const deptId = Number(inp.dataset.dept);
        if (!configMap[deptId]) configMap[deptId] = { department_id: deptId };
        configMap[deptId].customer_penalty_amount = Number(inp.value) || 100000;
    });
    const configs = Object.values(configMap);

    try {
        const res = await apiCall('/api/penalty/config', 'POST', { configs });
        if (res.error) { alert(res.error); return; }
        showToast('✅ Đã lưu mức phạt');
        _penaltyLoadConfig();
    } catch(e) {
        alert('Lỗi: ' + e.message);
    }
}

// ===== STATS — CÂY PHÒNG BAN =====
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
        const [penaltyData, deptData] = await Promise.all([
            apiCall(`/api/penalty/list?month=${_penaltyMonth}`),
            apiCall('/api/departments')
        ]);

        _penaltyData = penaltyData.penalties || [];
        const total = penaltyData.total || 0;
        if (badge) badge.textContent = total > 0 ? total.toLocaleString() + 'đ' : '0đ';

        if (_penaltyData.length === 0) {
            body.innerHTML = `<div style="text-align:center;padding:40px;">
                <div style="font-size:40px;margin-bottom:8px;">✅</div>
                <div style="color:#059669;font-weight:700;font-size:14px;">Không có vi phạm nào trong tháng này</div>
            </div>`;
            return;
        }

        const departments = deptData.departments || [];

        // Build head_user_id map from departments
        const deptHeadMap = {};
        departments.forEach(d => {
            if (d.head_user_id) deptHeadMap[d.head_user_id] = d.id;
        });

        // Group penalties by penalized user — use penalized_dept_id & penalized_role from backend
        const userPenalties = {};
        _penaltyData.forEach(p => {
            const uid = p.penalized_user_id || p.manager_id;
            if (!userPenalties[uid]) userPenalties[uid] = { items: [], total: 0, name: '', username: '', dept_id: null, role: 'nhan_vien' };
            userPenalties[uid].items.push(p);
            userPenalties[uid].total += (p.penalty_amount || 0);
            userPenalties[uid].name = p.penalized_name || p.manager_name || '';
            userPenalties[uid].username = p.penalized_username || p.manager_username || '';
            // Use penalized_dept_id and penalized_role from backend (works even if user is locked)
            if (p.penalized_dept_id) userPenalties[uid].dept_id = p.penalized_dept_id;
            if (p.penalized_role) userPenalties[uid].role = p.penalized_role;
        });

        // Build department tree
        const rootDepts = departments.filter(d => !d.parent_id);
        const ROLE_SHORT = { giam_doc: 'GĐ', quan_ly_cap_cao: 'QLCC', quan_ly: 'QL', truong_phong: 'TP', nhan_vien: 'NV', part_time: 'PT' };
        const ROLE_PRIORITY = { giam_doc: 0, quan_ly_cap_cao: 1, quan_ly: 2, truong_phong: 3, nhan_vien: 4, part_time: 5 };

        // Get all dept IDs (recursive) under a dept
        function getChildDeptIds(parentId) {
            let ids = [parentId];
            departments.filter(d => d.parent_id === parentId).forEach(d => {
                ids.push(...getChildDeptIds(d.id));
            });
            return ids;
        }

        // Get total penalty for a dept (including sub-depts)
        function getDeptTotal(deptId) {
            const allIds = getChildDeptIds(deptId);
            let sum = 0;
            Object.keys(userPenalties).forEach(uid => {
                if (allIds.includes(userPenalties[uid].dept_id)) {
                    sum += userPenalties[uid].total;
                }
            });
            return sum;
        }

        // Get users with penalties in this specific dept (not children)
        // Sort: QL/QLCC first (dept heads), then TP, then NV
        function getDeptUsers(deptId) {
            const result = [];
            Object.keys(userPenalties).forEach(uid => {
                if (userPenalties[uid].dept_id === deptId) {
                    const u = { id: Number(uid), ...userPenalties[uid] };
                    // Check if user is dept head
                    u.isDeptHead = deptHeadMap[u.id] === deptId;
                    result.push(u);
                }
            });
            // Sort: dept heads first, then by role priority, then by total desc
            return result.sort((a, b) => {
                if (a.isDeptHead && !b.isDeptHead) return -1;
                if (!a.isDeptHead && b.isDeptHead) return 1;
                const pa = ROLE_PRIORITY[a.role] ?? 4;
                const pb = ROLE_PRIORITY[b.role] ?? 4;
                if (pa !== pb) return pa - pb;
                return b.total - a.total;
            });
        }

        // Source type config
        const SRC = {
            diem:    { icon: '📊', label: 'CV Điểm', color: '#d97706', bg: '#fffbeb' },
            khoa:    { icon: '🔒', label: 'CV Khóa', color: '#dc2626', bg: '#fef2f2' },
            chuoi:   { icon: '🔗', label: 'CV Chuỗi', color: '#4f46e5', bg: '#eef2ff' },
            support: { icon: '🆘', label: 'Sếp Hỗ Trợ', color: '#2563eb', bg: '#eff6ff' },
            emergency: { icon: '🚨', label: 'Cấp Cứu Sếp', color: '#b91c1c', bg: '#fef2f2' },
            customer_unhandled: { icon: '❌', label: 'KH Chưa XL', color: '#ea580c', bg: '#fff7ed' }
        };

        // Build HTML tree
        let html = '';

        rootDepts.forEach(root => {
            const rootTotal = getDeptTotal(root.id);
            if (rootTotal <= 0) return;

            const rootId = `penTree_root_${root.id}`;
            html += `<div style="border:2px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:12px;">
                <div onclick="document.getElementById('${rootId}').style.display = document.getElementById('${rootId}').style.display === 'none' ? 'block' : 'none'; this.querySelector('.chevron').textContent = document.getElementById('${rootId}').style.display === 'none' ? '▶' : '▼';"
                     style="background:linear-gradient(135deg,#122546,#1e3a5f);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span class="chevron" style="color:#93c5fd;font-size:12px;">▼</span>
                        <span style="color:white;font-weight:800;font-size:14px;">📂 ${root.name}</span>
                    </div>
                    <span style="background:rgba(220,38,38,0.3);color:#fca5a5;padding:3px 12px;border-radius:8px;font-size:13px;font-weight:800;">${rootTotal.toLocaleString()}đ</span>
                </div>
                <div id="${rootId}" style="display:block;">`;

            // Sub-departments (level 2)
            const subDepts = departments.filter(d => d.parent_id === root.id);
            subDepts.forEach(sub => {
                const subTotal = getDeptTotal(sub.id);
                if (subTotal <= 0) return;

                const subId = `penTree_sub_${sub.id}`;
                html += `<div style="border-bottom:1px solid #e5e7eb;">
                    <div onclick="document.getElementById('${subId}').style.display = document.getElementById('${subId}').style.display === 'none' ? 'block' : 'none'; this.querySelector('.chevron').textContent = document.getElementById('${subId}').style.display === 'none' ? '▶' : '▼';"
                         style="background:#f1f5f9;padding:10px 16px 10px 32px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none;border-bottom:1px solid #e2e8f0;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span class="chevron" style="color:#64748b;font-size:11px;">▼</span>
                            <span style="color:#334155;font-weight:700;font-size:13px;">📁 ${sub.name}</span>
                        </div>
                        <span style="background:#fecaca;color:#dc2626;padding:2px 10px;border-radius:6px;font-size:12px;font-weight:700;">${subTotal.toLocaleString()}đ</span>
                    </div>
                    <div id="${subId}" style="display:block;">`;

                // Department-level users (QL/Trưởng đơn vị) — render BEFORE teams
                const directUsers = getDeptUsers(sub.id);
                directUsers.forEach(u => {
                    html += _renderUserNode(u, SRC, ROLE_SHORT, 52);
                });

                // Teams (level 3)
                const teams = departments.filter(d => d.parent_id === sub.id);
                teams.forEach(team => {
                    const teamTotal = getDeptTotal(team.id);
                    if (teamTotal <= 0) return;

                    const teamId = `penTree_team_${team.id}`;
                    html += `<div style="border-bottom:1px solid #f1f5f9;">
                        <div onclick="document.getElementById('${teamId}').style.display = document.getElementById('${teamId}').style.display === 'none' ? 'block' : 'none'; this.querySelector('.chevron').textContent = document.getElementById('${teamId}').style.display === 'none' ? '▶' : '▼';"
                             style="background:#f8fafc;padding:8px 16px 8px 52px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none;">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span class="chevron" style="color:#94a3b8;font-size:10px;">▼</span>
                                <span style="color:#475569;font-weight:600;font-size:12px;">📁 ${team.name}</span>
                            </div>
                            <span style="background:#fed7aa;color:#ea580c;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">${teamTotal.toLocaleString()}đ</span>
                        </div>
                        <div id="${teamId}" style="display:block;">`;

                    // Users in this team
                    const teamUsers = getDeptUsers(team.id);
                    teamUsers.forEach(u => {
                        html += _renderUserNode(u, SRC, ROLE_SHORT, 72);
                    });

                    html += '</div></div>';
                });

                html += '</div></div>';
            });

            // Direct users in root dept
            const rootDirectUsers = getDeptUsers(root.id);
            rootDirectUsers.forEach(u => {
                html += _renderUserNode(u, SRC, ROLE_SHORT, 32);
            });

            html += '</div></div>';
        });

        // Users without department
        const noDeptUsers = [];
        Object.keys(userPenalties).forEach(uid => {
            if (!userPenalties[uid].dept_id) {
                noDeptUsers.push({ id: Number(uid), ...userPenalties[uid] });
            }
        });
        if (noDeptUsers.length > 0) {
            const noDeptTotal = noDeptUsers.reduce((s, u) => s + u.total, 0);
            html += `<div style="border:2px solid #fde68a;border-radius:12px;overflow:hidden;margin-bottom:12px;">
                <div style="background:linear-gradient(135deg,#92400e,#d97706);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;">
                    <span style="color:white;font-weight:800;font-size:14px;">⚠️ Chưa phân phòng ban</span>
                    <span style="background:rgba(255,255,255,0.3);color:white;padding:3px 12px;border-radius:8px;font-size:13px;font-weight:800;">${noDeptTotal.toLocaleString()}đ</span>
                </div>`;
            noDeptUsers.sort((a, b) => b.total - a.total).forEach(u => {
                html += _renderUserNode(u, SRC, ROLE_SHORT, 16);
            });
            html += '</div>';
        }

        body.innerHTML = html;
    } catch(e) {
        body.innerHTML = `<div style="color:#dc2626;text-align:center;padding:20px;">Lỗi: ${e.message || 'Không tải được'}</div>`;
    }
}

function _renderUserNode(u, SRC, ROLE_SHORT, paddingLeft) {
    const userId = u.id;
    const userNodeId = `penUser_${userId}`;

    // Group items by source type
    const byType = {};
    Object.keys(SRC).forEach(t => { byType[t] = []; });
    u.items.forEach(p => {
        const st = p.source_type || 'diem';
        if (!byType[st]) byType[st] = [];
        byType[st].push(p);
    });

    let catHtml = '';
    Object.keys(SRC).forEach(srcType => {
        const items = byType[srcType] || [];
        const srcTotal = items.reduce((s, p) => s + (p.penalty_amount || 0), 0);
        const cfg = SRC[srcType];
        const catId = `penCat_${userId}_${srcType}`;

        catHtml += `<div style="display:flex;align-items:center;padding:4px 0 4px ${paddingLeft + 24}px;gap:6px;">
            <span style="font-size:12px;">${cfg.icon}</span>
            <span style="font-size:12px;color:#475569;font-weight:600;min-width:90px;">${cfg.label}</span>`;

        if (items.length > 0) {
            catHtml += `<span onclick="document.getElementById('${catId}').style.display = document.getElementById('${catId}').style.display === 'none' ? 'block' : 'none';"
                  style="background:${cfg.bg};color:${cfg.color};padding:1px 8px;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer;">
                ${srcTotal.toLocaleString()}đ (${items.length} lần) ▸</span>`;
        } else {
            catHtml += `<span style="color:#d1d5db;font-size:11px;">0đ</span>`;
        }

        catHtml += '</div>';

        // Details (hidden by default)
        if (items.length > 0) {
            catHtml += `<div id="${catId}" style="display:none;padding:2px 0 6px ${paddingLeft + 48}px;">`;
            items.forEach(p => {
                const dateStr = p.task_date ? p.task_date.split('-').reverse().join('/') : '—';
                const ackBadge = p.acknowledged
                    ? '<span style="color:#059669;font-size:10px;font-weight:600;">✅</span>'
                    : '<span style="color:#d97706;font-size:10px;font-weight:600;">⏳</span>';

                let detailText = p.task_name || p.penalty_reason || '';
                if (srcType === 'customer_unhandled' && p.crm_type) {
                    detailText = `${_CRM_LABELS[p.crm_type] || p.crm_type} (${p.unhandled_count || '?'} KH)`;
                }

                catHtml += `<div style="font-size:11px;color:#6b7280;padding:2px 0;display:flex;gap:6px;align-items:center;">
                    ${ackBadge}
                    <span style="color:#94a3b8;">${dateStr}</span>
                    <span style="color:#475569;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(p.penalty_reason || '').replace(/"/g, '&quot;')}">${detailText}</span>
                    <span style="color:${cfg.color};font-weight:700;font-size:10px;">${(p.penalty_amount || 0).toLocaleString()}đ</span>
                </div>`;
            });
            catHtml += '</div>';
        }
    });

    // Determine leader badge — role takes priority
    const isTP = u.role === 'truong_phong';
    const isLeader = !isTP && (u.isDeptHead || ['quan_ly', 'quan_ly_cap_cao'].includes(u.role));
    let leaderBadge = '';
    if (isLeader) {
        leaderBadge = '<span style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;padding:1px 8px;border-radius:4px;font-size:9px;font-weight:800;margin-left:4px;">⭐ Trưởng đơn vị</span>';
    } else if (isTP) {
        leaderBadge = '<span style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;padding:1px 8px;border-radius:4px;font-size:9px;font-weight:800;margin-left:4px;">⭐ Trưởng phòng</span>';
    }

    // Role badge color
    const roleBadgeStyle = isLeader
        ? 'background:#fef3c7;color:#92400e;'
        : isTP
        ? 'background:#ede9fe;color:#6d28d9;'
        : 'background:#e0f2fe;color:#0369a1;';

    return `<div style="border-bottom:1px solid #f1f5f9;">
        <div onclick="document.getElementById('${userNodeId}').style.display = document.getElementById('${userNodeId}').style.display === 'none' ? 'block' : 'none'; this.querySelector('.chevron').textContent = document.getElementById('${userNodeId}').style.display === 'none' ? '▶' : '▼';"
             style="padding:8px 16px 8px ${paddingLeft}px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none;background:${isLeader ? '#fffbeb' : isTP ? '#f5f3ff' : 'white'};">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <span class="chevron" style="color:#94a3b8;font-size:10px;">▶</span>
                <span style="font-size:13px;">${isLeader ? '⭐' : isTP ? '⭐' : '👤'}</span>
                <span style="font-size:13px;font-weight:700;color:#1e293b;">${u.name || 'Unknown'}</span>
                <span style="font-size:10px;color:#9ca3af;">(${u.username || ''})</span>
                <span style="${roleBadgeStyle}padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">${ROLE_SHORT[u.role] || u.role || 'NV'}</span>
                ${leaderBadge}
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
                <span style="background:#fecaca;color:#dc2626;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:700;">${u.total.toLocaleString()}đ</span>
                <button onclick="event.stopPropagation();_penaltyShowSlip(${userId},'${_penaltyMonth}','${(u.name || '').replace(/'/g, "\\\\'")}')" style="padding:2px 8px;font-size:10px;border:1px solid #2563eb;border-radius:5px;background:white;color:#2563eb;cursor:pointer;font-weight:600;">📄 Phiếu</button>
            </div>
        </div>
        <div id="${userNodeId}" style="display:none;padding-bottom:6px;">
            ${catHtml}
        </div>
    </div>`;
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

        const _srcBadge = (type) => {
            const map = {
                diem: { bg: '#fffbeb', color: '#d97706', label: '📊 CV Điểm' },
                khoa: { bg: '#fef2f2', color: '#dc2626', label: '🔒 CV Khóa' },
                chuoi: { bg: '#eef2ff', color: '#4f46e5', label: '🔗 CV Chuỗi' },
                support: { bg: '#eff6ff', color: '#2563eb', label: '🆘 Hỗ trợ' },
                emergency: { bg: '#fef2f2', color: '#b91c1c', label: '🚨 Cấp cứu' },
                customer_unhandled: { bg: '#fff7ed', color: '#ea580c', label: '❌ KH Chưa XL' }
            };
            const cfg = map[type] || { bg: '#f3f4f6', color: '#6b7280', label: type };
            return `<span style="background:${cfg.bg};color:${cfg.color};padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;">${cfg.label}</span>`;
        };

        let itemsHtml = items.map((item, i) => `
            <tr style="border-bottom:1px solid #e5e7eb;${i % 2 ? 'background:#fafbfc;' : ''}">
                <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#1e293b;">${i + 1}</td>
                <td style="padding:10px 14px;font-size:13px;color:#374151;font-weight:600;">${item.task_name}</td>
                <td style="padding:10px 14px;font-size:12px;color:#6b7280;">${item.task_date.split('-').reverse().join('/')}</td>
                <td style="padding:10px 14px;font-size:11px;">${_srcBadge(item.source_type)}</td>
                <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#dc2626;text-align:right;">${(item.penalty_amount || 0).toLocaleString()}đ</td>
            </tr>
        `).join('');

        document.getElementById('penaltySlipModal')?.remove();
        const modal = document.createElement('div');
        modal.id = 'penaltySlipModal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `
        <div id="penaltySlipContent" style="background:white;border-radius:16px;width:700px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,.3);">
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
                            <th style="padding:12px 14px;text-align:left;font-size:11px;color:#122546;font-weight:700;">LOẠI</th>
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

// ===== PENALTY LOCK POPUP (hiện khi NV bị khóa TK) =====
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
