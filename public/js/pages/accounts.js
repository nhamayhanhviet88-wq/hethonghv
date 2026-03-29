// ========== ACCOUNTS PAGE ==========

async function renderAccountsPage(container) {
    container.innerHTML = `
        <div class="toolbar">
            <div class="toolbar-filters">
                <select class="form-control" id="filterRole" onchange="loadAccounts()">
                    <option value="">Tất cả vai trò</option>
                    <option value="pho_giam_doc">Phó Giám Đốc</option>
                    <option value="quan_ly">Quản Lý</option>
                    <option value="truong_phong">Trưởng Phòng</option>
                    <option value="trinh">Trinh</option>
                    <option value="thu_quy">Thủ Quỹ</option>
                    <option value="ke_toan">Kế Toán</option>
                    <option value="thu_kho">Thủ Kho</option>
                    <option value="nhan_su">Nhân Sự</option>
                    <option value="thu_ky">Thư Ký</option>
                    <option value="nhan_vien">Nhân Viên</option>
                    <option value="to_truong">Tổ Trưởng</option>
                    <option value="kcs_hang">KCS Hàng</option>
                    <option value="ky_thuat">Kỹ Thuật</option>
                    <option value="nhan_vien_parttime">NV Part-Time</option>
                </select>
                <select class="form-control" id="filterStatus" onchange="loadAccounts()">
                    <option value="">Tất cả trạng thái</option>
                    <option value="active">Đang làm</option>
                    <option value="resigned">Nghỉ việc</option>
                </select>
                <select class="form-control" id="filterCrm" onchange="loadAccounts()">
                    <option value="">Tất cả CRM</option>
                    <option value="nhu_cau">KH Nhu Cầu</option>
                    <option value="ctv">CTV</option>
                    <option value="hoa_hong_crm">GV / HS / SV</option>
                    <option value="nuoi_duong">NS/KT/P.Mua Hàng</option>
                    <option value="sinh_vien">TT/Thời Trang</option>
                    <option value="koc_tiktok">KOC/KOL Tiktok</option>
                </select>
                <input type="text" class="form-control" id="filterSearch" placeholder="🔍 Tìm tên, SĐT..." oninput="loadAccounts()" style="min-width:180px;">
            </div>
            <button class="btn btn-primary" onclick="showCreateAccountModal()" style="width:auto;">
                ➕ Thêm Tài Khoản
            </button>
        </div>
        <div class="card">
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Họ tên</th>
                            <th>Tài khoản</th>
                            <th>Vai trò</th>

                            <th>SĐT</th>
                            <th>Trạng thái</th>
                            <th>Sinh Nhật</th>
                            <th>Ngày vào</th>
                            <th>Số Ngày Làm Việc</th>
                            <th>Telegram</th>
                            <th style="text-align:center;">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody id="accountsTableBody">
                        <tr><td colspan="8" class="text-center text-muted" style="padding:40px;">Đang tải...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    await loadAccounts();
}

async function loadAccounts() {
    const role = document.getElementById('filterRole')?.value || '';
    const status = document.getElementById('filterStatus')?.value || '';
    const crmFilter = document.getElementById('filterCrm')?.value || '';
    const searchQ = (document.getElementById('filterSearch')?.value || '').toLowerCase().trim();
    let url = '/api/users?';
    if (role) url += `role=${role}&`;
    if (status) url += `status=${status}&`;

    const data = await apiCall(url);
    let users = (data.users || []).filter(u => !['hoa_hong','ctv','nuoi_duong','sinh_vien','tkaffiliate'].includes(u.role));

    // Client-side CRM filter
    if (crmFilter) {
        users = users.filter(u => u.source_crm_type === crmFilter);
    }
    // Client-side search filter
    if (searchQ) {
        users = users.filter(u => 
            (u.full_name || '').toLowerCase().includes(searchQ) ||
            (u.phone || '').includes(searchQ) ||
            (u.username || '').toLowerCase().includes(searchQ)
        );
    }

    const tbody = document.getElementById('accountsTableBody');
    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="icon">👥</div><h3>Không tìm thấy tài khoản</h3><p>Thử thay đổi bộ lọc</p></div></td></tr>`;
        return;
    }
    // Sort by role order, then by work days descending
    const ROLE_ORDER = ['pho_giam_doc','quan_ly','truong_phong','trinh','thu_quy','ke_toan','thu_kho','nhan_su','thu_ky','nhan_vien','to_truong','kcs_hang','ky_thuat','nhan_vien_parttime'];
    users.sort((a, b) => {
        const ai = ROLE_ORDER.indexOf(a.role);
        const bi = ROLE_ORDER.indexOf(b.role);
        const roleDiff = (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        if (roleDiff !== 0) return roleDiff;
        // Same role: more work days first
        const daysA = a.start_date ? Math.floor((new Date() - new Date(a.start_date)) / 86400000) : -1;
        const daysB = b.start_date ? Math.floor((new Date() - new Date(b.start_date)) / 86400000) : -1;
        return daysB - daysA;
    });

    const filtered = users.filter(u => u.role !== 'giam_doc');
    const activeUsers = filtered.filter(u => u.status === 'active');
    const resignedUsers = filtered.filter(u => u.status !== 'active');

    function calcWorkDays(user) {
        if (!user.start_date) return '-';
        // Normalize to local date only (no timezone issues)
        const startParts = user.start_date.split('T')[0].split('-');
        const startLocal = new Date(startParts[0], startParts[1] - 1, startParts[2]);
        let endLocal;
        if (user.status === 'active') {
            const now = new Date();
            endLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else {
            const endStr = user.updated_at || user.start_date;
            const endParts = endStr.split('T')[0].split('-');
            endLocal = new Date(endParts[0], endParts[1] - 1, endParts[2]);
        }
        const days = Math.max(0, Math.round((endLocal - startLocal) / 86400000));
        if (days >= 365) {
            const years = Math.floor(days / 365);
            const months = Math.floor((days % 365) / 30);
            return `${years} năm ${months} tháng`;
        }
        return `${days} ngày`;
    }

    function renderUserRow(user) {
        return `
        <tr>
            <td>${(() => {
                const rc = {
                    giam_doc:['#fef3c7','#fde68a','#92400e','#fcd34d'], quan_ly:['#dbeafe','#bfdbfe','#1e40af','#93c5fd'],
                    truong_phong:['#d1fae5','#a7f3d0','#065f46','#6ee7b7'], nhan_vien:['#e5e7eb','#d1d5db','#374151','#9ca3af'],
                    hoa_hong:['#ffedd5','#fed7aa','#9a3412','#fdba74'], ctv:['#ede9fe','#ddd6fe','#5b21b6','#c4b5fd'],
                    nuoi_duong:['#fce7f3','#fbcfe8','#9d174d','#f9a8d4'], sinh_vien:['#cffafe','#a5f3fc','#155e75','#67e8f9'],
                    ke_toan:['#fef9c3','#fef08a','#854d0e','#fde047'], nhan_su:['#e0e7ff','#c7d2fe','#3730a3','#a5b4fc'],
                    thu_quy:['#dcfce7','#bbf7d0','#166534','#86efac'], thu_kho:['#f3e8ff','#e9d5ff','#6b21a8','#c084fc'],
                    pho_giam_doc:['#fff7ed','#fed7aa','#c2410c','#fdba74'], thu_ky:['#f1f5f9','#e2e8f0','#475569','#94a3b8'],
                    trinh:['#fdf2f8','#fce7f3','#be185d','#f9a8d4'], nhan_vien_parttime:['#f0fdf4','#dcfce7','#15803d','#86efac'],
                    to_truong:['#e5e7eb','#d1d5db','#374151','#9ca3af'], kcs_hang:['#e5e7eb','#d1d5db','#374151','#9ca3af'],
                    ky_thuat:['#e5e7eb','#d1d5db','#374151','#9ca3af']
                };
                const c = rc[user.role] || ['#e5e7eb','#d1d5db','#374151','#9ca3af'];
                return `<span style="cursor:pointer;display:inline-flex;align-items:center;background:linear-gradient(135deg,${c[0]},${c[1]});color:${c[2]};padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;border:1px solid ${c[3]};transition:all 0.2s;" onclick="showAccountDetail(${user.id})" onmouseover="this.style.boxShadow='0 2px 8px ${c[3]}66'" onmouseout="this.style.boxShadow='none'">${user.full_name}</span>`;
            })()}</td>
            <td>${user.username}</td>
            <td><span class="role-badge role-${user.role}">${ROLE_LABELS[user.role]}</span></td>
            <td>${user.phone || '-'}</td>
            <td><span class="badge badge-${user.status}" style="cursor:pointer;" onclick="event.stopPropagation();showUserStatusModal(${user.id}, '${user.full_name.replace(/'/g, "\\\\'")}', '${user.status}')" title="Ấn để đổi trạng thái">${user.status === 'active' ? 'Đang làm' : user.status === 'locked' ? '🔒 Bị khóa' : 'Nghỉ việc'}</span></td>
            <td style="white-space:nowrap;">${(() => {
                if (!user.birth_date) return '-';
                const bd = new Date(user.birth_date);
                const today = new Date();
                const isBirthday = bd.getDate() === today.getDate() && bd.getMonth() === today.getMonth();
                const formatted = formatDate(user.birth_date);
                return isBirthday 
                    ? `<span style="background:#fef3c7;padding:2px 8px;border-radius:8px;font-weight:700;">🎂 ${formatted}</span>` 
                    : formatted;
            })()}</td>
            <td>${formatDate(user.start_date)}</td>
            <td style="font-size:12px;white-space:nowrap;">${calcWorkDays(user)}</td>
            <td>${user.telegram_group_id ? '✅' : '❌'}</td>
            <td style="text-align:center;">
                <div class="d-flex align-center gap-10" style="justify-content:center;">
                    <button class="btn btn-xs btn-secondary" onclick="showEditAccountModal(${user.id})" title="Sửa">✏️</button>

                    ${user.status === 'locked' 
                        ? (currentUser.role === 'giam_doc' 
                            ? `<button class="btn btn-xs btn-success" onclick="unlockUser(${user.id}, '${user.full_name.replace(/'/g, "\\\\\'")}')" title="Mở khóa">🔓</button>`
                            : '')
                        : ''
                    }
                    ${currentUser.role === 'giam_doc' ? `<button class="btn btn-xs" onclick="deleteUser(${user.id}, '${user.full_name}')" title="Xóa" style="background:transparent;color:#ef4444;border:1.5px solid #fca5a5;border-radius:8px;transition:all 0.2s;" onmouseover="this.style.background='#ef4444';this.style.color='#fff';this.style.borderColor='#ef4444'" onmouseout="this.style.background='transparent';this.style.color='#ef4444';this.style.borderColor='#fca5a5'">✕</button>` : ''}
                </div>
            </td>
        </tr>`;
    }

    let html = '';
    // Section: Đang Làm
    if (activeUsers.length > 0) {
        html += `<tr><td colspan="10" style="background:#ecfdf5;padding:10px 16px;font-weight:700;font-size:13px;color:#166534;border-bottom:2px solid #10b981;">✅ Đang Làm <span style="font-weight:400;color:#6b7280;font-size:12px;">(${activeUsers.length})</span></td></tr>`;
        html += activeUsers.map(renderUserRow).join('');
    }
    // Section: Nghỉ Việc
    if (resignedUsers.length > 0) {
        html += `<tr><td colspan="10" style="background:#fef2f2;padding:10px 16px;font-weight:700;font-size:13px;color:#991b1b;border-bottom:2px solid #ef4444;${activeUsers.length > 0 ? 'border-top:2px solid #e5e7eb;' : ''}">🚫 Nghỉ Việc <span style="font-weight:400;color:#6b7280;font-size:12px;">(${resignedUsers.length})</span></td></tr>`;
        html += resignedUsers.map(renderUserRow).join('');
    }

    tbody.innerHTML = html;
}

// Helper: build hierarchical department options for account forms
function buildAccDeptOptions(depts, selectedId) {
    const roots = depts.filter(d => !d.parent_id);
    const childrenOf = (pid) => depts.filter(d => d.parent_id === pid);
    let html = '';
    function addOpt(dept, level) {
        const indent = '\u00A0\u00A0\u00A0\u00A0'.repeat(level);
        const sel = dept.id === selectedId ? 'selected' : '';
        const icon = level === 0 ? '🏢' : '📁';
        html += `<option value="${dept.id}" ${sel}>${indent}${icon} ${dept.name}</option>`;
        childrenOf(dept.id).forEach(c => addOpt(c, level + 1));
    }
    roots.forEach(r => addOpt(r, 0));
    return html;
}

async function showCreateAccountModal() {
    const [tiers, staffList, deptData] = await Promise.all([
        apiCall('/api/settings/commission-tiers'),
        apiCall('/api/users/dropdown'),
        apiCall('/api/departments')
    ]);
    const depts = deptData.departments || [];
    const deptOptionsHTML = buildAccDeptOptions(depts);

    const bodyHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Tên đăng nhập <span style="color:var(--danger)">*</span></label>
                <input type="text" id="accUsername" class="form-control" placeholder="Tên đăng nhập">
            </div>
            <div class="form-group">
                <label>Mật khẩu <span style="color:var(--danger)">*</span></label>
                <input type="password" id="accPassword" class="form-control" placeholder="Mật khẩu">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Họ tên <span style="color:var(--danger)">*</span></label>
                <input type="text" id="accFullName" class="form-control" placeholder="Họ và tên">
            </div>
            <div class="form-group">
                <label>Vai trò <span style="color:var(--danger)">*</span></label>
                <select id="accRole" class="form-control" onchange="onRoleChange()">
                    <option value="">Chọn vai trò</option>
                    ${currentUser.role === 'giam_doc' ? '<option value="pho_giam_doc">Phó Giám Đốc</option>' : ''}
                    ${currentUser.role === 'giam_doc' ? '<option value="quan_ly">Quản Lý</option>' : ''}
                    <option value="truong_phong">Trưởng Phòng</option>
                    <option value="trinh">Trinh</option>
                    <option value="thu_quy">Thủ Quỹ</option>
                    <option value="ke_toan">Kế Toán</option>
                    <option value="thu_kho">Thủ Kho</option>
                    <option value="nhan_su">Nhân Sự</option>
                    <option value="thu_ky">Thư Ký</option>
                    <option value="nhan_vien">Nhân Viên</option>
                    <option value="to_truong">Tổ Trưởng</option>
                    <option value="kcs_hang">KCS Hàng</option>
                    <option value="ky_thuat">Kỹ Thuật</option>
                    <option value="nhan_vien_parttime">NV Part-Time</option>
                </select>
            </div>
        </div>
        <div id="movableContactFields">
        <div class="form-row">
            <div class="form-group">
                <label id="lblPhone">Số điện thoại <span style="color:var(--danger)">*</span></label>
                <input type="text" id="accPhone" class="form-control" placeholder="10 chữ số" maxlength="10" pattern="[0-9]{10}" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
            </div>
            <div class="form-group">
                <label>Ngày vào làm</label>
                <input type="date" id="accStartDate" class="form-control" value="${new Date().toISOString().split('T')[0]}">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label id="lblAddress">Địa chỉ <span style="color:var(--danger)">*</span></label>
                <input type="text" id="accAddress" class="form-control" placeholder="Địa chỉ">
            </div>
            <div class="form-group">
                <label id="lblProvince">Tỉnh / Thành phố <span style="color:var(--danger)">*</span></label>
                <select id="accProvince" class="form-control">
                    <option value="">— Chọn tỉnh thành —</option>
                </select>
            </div>
        </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label id="lblBirthDate">🎂 Sinh nhật</label>
                <input type="date" id="accBirthDate" class="form-control">
            </div>
            <div class="form-group" id="accTelegramGroup">
                <label>ID nhóm Telegram</label>
                <input type="text" id="accTelegram" class="form-control" placeholder="ID nhóm Telegram">
            </div>
        </div>
        <div class="form-group" id="maDonKDGroup">
            <label>Mã Đơn KD <small style="color:var(--gray-500);">(VD: VTT, duy nhất mỗi NV)</small></label>
            <input type="text" id="accOrderCodePrefix" class="form-control" placeholder="VD: VTT" maxlength="10" style="text-transform:uppercase;">
        </div>
        <div class="form-group">
            <label>Đơn vị / Phòng ban <span style="color:var(--danger)">*</span></label>
            <select id="accDepartment" class="form-control">
                <option value="">— Chưa chọn —</option>
                ${deptOptionsHTML}
            </select>
        </div>
        <div id="affiliateFields" style="display:none;">
            <div class="form-row">
                <div class="form-group">
                    <label>👤 Nhân viên quản lý <span style="color:var(--danger)">*</span></label>
                    <select id="accManagedBy" class="form-control" onchange="onManagedByChange()">
                        <option value="">— Chọn nhân viên —</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>📋 Khách hàng nguồn <span style="color:var(--danger)">*</span></label>
                    <input type="text" id="accSourceSearch" class="form-control" placeholder="Chọn NV quản lý trước..." disabled onfocus="loadSourceDropdown()" oninput="searchSourceCustomer(this.value)">
                    <input type="hidden" id="accSourceCustomerId">
                    <input type="hidden" id="accSourceCrmType">
                    <div id="accSourceResults" style="max-height:150px;overflow-y:auto;border:1px solid var(--gray-200);border-radius:8px;margin-top:4px;display:none;"></div>
                </div>
            </div>
            <div class="form-group">
                <label>📌 Khách CRM từ đâu? <span style="color:var(--danger)">*</span></label>
                <input type="text" id="accSourceCrmLabel" class="form-control" disabled placeholder="Tự điền khi chọn KH nguồn" style="background:#f9fafb;color:var(--navy);font-weight:600;">
            </div>
        </div>
        <div id="contactFieldsAnchor"></div>
        <div id="hoSoSection">
        <hr style="margin: 15px 0; border-color: var(--gray-200);">
        <h4 style="color:var(--navy);margin-bottom:10px;">📎 Hồ Sơ Nhân Viên</h4>
        <div class="form-row">
            <div class="form-group">
                <label>Hợp Đồng (PDF) <span style="color:var(--danger)">*</span></label>
                <input type="file" id="accContractFile" class="form-control" accept=".pdf">
            </div>
            <div class="form-group">
                <label>Nội Quy (PDF) <span style="color:var(--danger)">*</span></label>
                <input type="file" id="accRulesFile" class="form-control" accept=".pdf">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>CCCD Mặt Trước <span style="color:var(--danger)">*</span></label>
                <input type="file" id="accCCCDFront" class="form-control" accept="image/*">
            </div>
            <div class="form-group">
                <label>CCCD Mặt Sau <span style="color:var(--danger)">*</span></label>
                <input type="file" id="accCCCDBack" class="form-control" accept="image/*">
            </div>
        </div>

        <hr style="margin: 15px 0; border-color: var(--gray-200);">
        <h4 style="color:var(--navy);margin-bottom:10px;">🌐 BÀN GIAO MXH</h4>
        <div class="table-container" style="margin-bottom:8px;">
            <table class="table" style="font-size:12px;" id="createSocialTable">
                <thead><tr>
                    <th style="min-width:80px">Loại</th>
                    <th style="min-width:100px">Tên TK</th>
                    <th style="min-width:80px">ACC</th>
                    <th style="min-width:80px">PASS</th>
                    <th style="min-width:60px">2FA</th>
                    <th style="min-width:100px">Link</th>
                    <th style="min-width:80px">Ghi chú</th>
                    <th style="width:40px"></th>
                </tr></thead>
                <tbody></tbody>
            </table>
        </div>
        <button class="btn btn-sm" onclick="addCreateSocialRow()" style="font-size:11px;margin-bottom:12px;">➕ Thêm dòng MXH</button>

        <hr style="margin: 15px 0; border-color: var(--gray-200);">
        <h4 style="color:var(--navy);margin-bottom:10px;">🔧 BÀN GIAO CÔNG CỤ</h4>
        <div class="table-container" style="margin-bottom:8px;">
            <table class="table" style="font-size:12px;" id="createToolTable">
                <thead><tr>
                    <th style="min-width:150px">Tên Công Cụ</th>
                    <th style="min-width:80px">Số Lượng</th>
                    <th style="min-width:120px">Ngày Bàn Giao</th>
                    <th style="width:40px"></th>
                </tr></thead>
                <tbody></tbody>
            </table>
        </div>
        <button class="btn btn-sm" onclick="addCreateToolRow()" style="font-size:11px;margin-bottom:12px;">➕ Thêm dòng Công Cụ</button>

        </div>
        <div id="hoaHongFields" style="display:none;">
            <hr style="margin: 15px 0; border-color: var(--gray-200);">
            <h4 style="color:var(--navy);margin-bottom:10px;">💰 Hoa Hồng</h4>
            <div class="form-row">
                <div class="form-group">
                    <label>Tầng chiết khấu</label>
                    <select id="accTierId" class="form-control">
                        <option value="">Chọn tầng</option>
                        ${(tiers.items || []).map(t => `<option value="${t.id}">${t.name} (${t.percentage}%)</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Gán cho nhân viên</label>
                    <select id="accAssignTo" class="form-control">
                        <option value="">Chọn nhân viên</option>
                        ${(staffList.users || []).filter(u => ['nhan_vien','truong_phong'].includes(u.role)).map(u => 
                            `<option value="${u.id}">${u.full_name} (${ROLE_LABELS[u.role]})</option>`
                        ).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Ngân hàng</label>
                    <input type="text" id="accBankName" class="form-control" placeholder="VD: Vietcombank">
                </div>
                <div class="form-group">
                    <label>Số tài khoản</label>
                    <input type="text" id="accBankAccount" class="form-control" placeholder="Số TK ngân hàng">
                </div>
            </div>
            <div class="form-group">
                <label>Chủ tài khoản</label>
                <input type="text" id="accBankHolder" class="form-control" placeholder="Tên chủ tài khoản">
            </div>
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-success" onclick="submitCreateAccount()">Tạo Tài Khoản</button>
    `;
    openModal('➕ Thêm Tài Khoản Mới', bodyHTML, footerHTML);
    populateProvinceDropdown('accProvince');
}

function onRoleChange() {
    const role = document.getElementById('accRole').value;
    const hhFields = document.getElementById('hoaHongFields');
    if (hhFields) hhFields.style.display = role === 'hoa_hong' ? 'block' : 'none';
    
    const AFFILIATE_ROLES = ['hoa_hong', 'ctv', 'nuoi_duong', 'sinh_vien'];
    const isAff = AFFILIATE_ROLES.includes(role);

    const affFields = document.getElementById('affiliateFields');
    if (affFields) {
        affFields.style.display = isAff ? 'block' : 'none';
        if (isAff) loadEmployeeDropdown('accManagedBy');
    }
    // Show/hide Hồ Sơ section for affiliate roles
    const hoSo = document.getElementById('hoSoSection');
    if (hoSo) hoSo.style.display = isAff ? 'none' : 'block';
    const maDon = document.getElementById('maDonKDGroup');
    if (maDon) maDon.style.display = isAff ? 'none' : 'block';
    const tgGroup = document.getElementById('accTelegramGroup');
    if (tgGroup) tgGroup.style.display = isAff ? 'none' : 'block';

    // Toggle birthday required
    const lblBirth = document.getElementById('lblBirthDate');
    if (lblBirth) lblBirth.innerHTML = isAff ? '🎂 Sinh nhật' : '🎂 Sinh nhật <span style="color:var(--danger)">*</span>';

    // Toggle phone/address/province required labels
    const lblPhone = document.getElementById('lblPhone');
    if (lblPhone) lblPhone.innerHTML = isAff ? 'Số điện thoại' : 'Số điện thoại <span style="color:var(--danger)">*</span>';
    const lblAddr = document.getElementById('lblAddress');
    if (lblAddr) lblAddr.innerHTML = isAff ? 'Địa chỉ' : 'Địa chỉ <span style="color:var(--danger)">*</span>';
    const lblProv = document.getElementById('lblProvince');
    if (lblProv) lblProv.innerHTML = isAff ? 'Tỉnh / Thành phố' : 'Tỉnh / Thành phố <span style="color:var(--danger)">*</span>';

    // Move contact fields: after affiliate section for affiliate, before birthday for non-affiliate
    const movable = document.getElementById('movableContactFields');
    const anchor = document.getElementById('contactFieldsAnchor');
    const birthRow = document.getElementById('lblBirthDate')?.closest('.form-row');
    if (movable) {
        if (isAff && anchor) {
            anchor.after(movable);
        } else if (birthRow) {
            birthRow.before(movable);
        }
    }

    // Populate province dropdown
    populateProvinceDropdown('accProvince');
}

const PROVINCES_VN = [
    'An Giang','Bà Rịa - Vũng Tàu','Bạc Liêu','Bắc Giang','Bắc Kạn','Bắc Ninh','Bến Tre','Bình Dương',
    'Bình Định','Bình Phước','Bình Thuận','Cà Mau','Cao Bằng','Cần Thơ','Đà Nẵng','Đắk Lắk','Đắk Nông',
    'Điện Biên','Đồng Nai','Đồng Tháp','Gia Lai','Hà Giang','Hà Nam','Hà Nội','Hà Tĩnh','Hải Dương',
    'Hải Phòng','Hậu Giang','Hòa Bình','Hồ Chí Minh','Hưng Yên','Khánh Hòa','Kiên Giang','Kon Tum',
    'Lai Châu','Lâm Đồng','Lạng Sơn','Lào Cai','Long An','Nam Định','Nghệ An','Ninh Bình','Ninh Thuận',
    'Phú Thọ','Phú Yên','Quảng Bình','Quảng Nam','Quảng Ngãi','Quảng Ninh','Quảng Trị','Sóc Trăng',
    'Sơn La','Tây Ninh','Thái Bình','Thái Nguyên','Thanh Hóa','Thừa Thiên Huế','Tiền Giang','Trà Vinh',
    'Tuyên Quang','Vĩnh Long','Vĩnh Phúc','Yên Bái'
];

function populateProvinceDropdown(selectId, selectedVal) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    if (sel.options.length <= 1) {
        PROVINCES_VN.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p; opt.textContent = p;
            if (selectedVal && p === selectedVal) opt.selected = true;
            sel.appendChild(opt);
        });
    }
}

async function loadEmployeeDropdown(selectId) {
    const data = await apiCall('/api/users/dropdown');
    const employees = (data.users || []).filter(u => ['nhan_vien','truong_phong','quan_ly'].includes(u.role));
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">— Chọn nhân viên —</option>' +
        employees.map(e => `<option value="${e.id}">${e.full_name} (${ROLE_LABELS[e.role] || e.role})</option>`).join('');
}

function onManagedByChange() {
    const empId = document.getElementById('accManagedBy')?.value;
    const searchEl = document.getElementById('accSourceSearch');
    const resEl = document.getElementById('accSourceResults');
    if (searchEl) {
        if (empId) {
            searchEl.disabled = false;
            searchEl.placeholder = 'Click để xem danh sách hoặc tìm kiếm...';
        } else {
            searchEl.disabled = true;
            searchEl.placeholder = 'Chọn NV quản lý trước...';
            searchEl.value = '';
            document.getElementById('accSourceCustomerId').value = '';
        }
    }
    if (resEl) resEl.style.display = 'none';
}

async function loadSourceDropdown() {
    const empId = document.getElementById('accManagedBy')?.value;
    if (!empId) return;
    const q = document.getElementById('accSourceSearch')?.value || '';
    const data = await apiCall(`/api/affiliate/customers-for-assign?employee_id=${empId}&q=${encodeURIComponent(q)}`);
    renderSourceResults(data.customers || []);
}

let _sourceSearchTimeout = null;
async function searchSourceCustomer(q) {
    clearTimeout(_sourceSearchTimeout);
    const empId = document.getElementById('accManagedBy')?.value;
    if (!empId) return;
    _sourceSearchTimeout = setTimeout(async () => {
        const data = await apiCall(`/api/affiliate/customers-for-assign?employee_id=${empId}&q=${encodeURIComponent(q)}`);
        renderSourceResults(data.customers || []);
    }, 300);
}

let _sourceCustomersCache = [];

function renderSourceResults(customers) {
    _sourceCustomersCache = customers;
    const resDiv = document.getElementById('accSourceResults');
    if (!resDiv) return;
    if (customers.length === 0) {
        resDiv.innerHTML = '<div style="padding:8px;color:#9ca3af;font-size:12px;">Không tìm thấy khách hàng</div>';
    } else {
        resDiv.innerHTML = customers.map((c, i) =>
            `<div style="padding:8px 12px;cursor:pointer;font-size:12px;border-bottom:1px solid #f3f4f6;transition:background .15s;" 
                 onmouseover="this.style.background='#f0f4ff'" onmouseout="this.style.background=''"
                 onmousedown="selectSourceCustomer(${i})">
                <b>${c.customer_name}</b> — ${c.phone || 'Chưa có SĐT'}
                ${c.address ? `<br><span style="color:#6b7280;">${c.address}${c.province ? ', ' + c.province : ''}</span>` : ''}
            </div>`
        ).join('');
    }
    resDiv.style.display = 'block';
}

function selectSourceCustomer(index) {
    const c = _sourceCustomersCache[index];
    if (!c) return;
    document.getElementById('accSourceCustomerId').value = c.id;
    document.getElementById('accSourceSearch').value = `${c.customer_name} - ${c.phone || ''}`;
    document.getElementById('accSourceResults').style.display = 'none';

    // Auto-fill CRM source type
    const CRM_LABELS = {nhu_cau:'Chăm Sóc KH Nhu Cầu',ctv:'Chăm Sóc CTV',hoa_hong_crm:'CRM Giáo Viên/Học Sinh/Sinh Viên',nuoi_duong:'CRM Nhân Sự/Kế Toán/P.Mua Hàng',sinh_vien:'CRM Thể Thao/Thời Trang Local',koc_tiktok:'CRM KOL Tiktok/Mẹ Bỉm Sữa'};
    document.getElementById('accSourceCrmType').value = c.crm_type || '';
    document.getElementById('accSourceCrmLabel').value = CRM_LABELS[c.crm_type] || c.crm_type || '';

    // Auto-fill phone, address, province from source customer
    if (c.phone) document.getElementById('accPhone').value = c.phone;
    if (c.address) document.getElementById('accAddress').value = c.address;
    if (c.province) {
        populateProvinceDropdown('accProvince');
        document.getElementById('accProvince').value = c.province;
    }
}

async function submitCreateAccount() {
    const phone = document.getElementById('accPhone').value;
    if (phone && !/^\d{10}$/.test(phone)) {
        showToast('Số điện thoại phải đúng 10 chữ số', 'error');
        return;
    }

    // Validate mandatory files (skip for affiliate roles)
    const contractFile = document.getElementById('accContractFile').files[0];
    const rulesFile = document.getElementById('accRulesFile').files[0];
    const cccdFront = document.getElementById('accCCCDFront').files[0];
    const cccdBack = document.getElementById('accCCCDBack').files[0];
    const selectedRole = document.getElementById('accRole').value;
    const AFFILIATE_ROLES_CHECK = ['hoa_hong','ctv','nuoi_duong','sinh_vien'];
    const isAffiliate = AFFILIATE_ROLES_CHECK.includes(selectedRole);

    if (!isAffiliate) {
        if (!contractFile) { showToast('Vui lòng upload Hợp Đồng (PDF)', 'error'); return; }
        if (!rulesFile) { showToast('Vui lòng upload Nội Quy (PDF)', 'error'); return; }
        if (!cccdFront) { showToast('Vui lòng upload CCCD Mặt Trước', 'error'); return; }
        if (!cccdBack) { showToast('Vui lòng upload CCCD Mặt Sau', 'error'); return; }
    }

    const body = {
        username: document.getElementById('accUsername').value,
        password: document.getElementById('accPassword').value,
        full_name: document.getElementById('accFullName').value,
        role: selectedRole,
        phone,
        address: document.getElementById('accAddress').value,
        start_date: document.getElementById('accStartDate').value,
        telegram_group_id: document.getElementById('accTelegram').value,
        birth_date: document.getElementById('accBirthDate')?.value || null,
        order_code_prefix: document.getElementById('accOrderCodePrefix')?.value || null,
        department_id: document.getElementById('accDepartment')?.value || null,
        commission_tier_id: document.getElementById('accTierId')?.value || null,
        assigned_to_user_id: document.getElementById('accAssignTo')?.value || null,
        bank_name: document.getElementById('accBankName')?.value || null,
        bank_account: document.getElementById('accBankAccount')?.value || null,
        bank_holder: document.getElementById('accBankHolder')?.value || null,
        managed_by_user_id: document.getElementById('accManagedBy')?.value || null,
        source_customer_id: document.getElementById('accSourceCustomerId')?.value || null,
        province: document.getElementById('accProvince')?.value || null,
        source_crm_type: document.getElementById('accSourceCrmType')?.value || null,
    };

    if (!body.username || !body.password || !body.full_name || !body.role) {
        showToast('Vui lòng điền đầy đủ thông tin bắt buộc (*)', 'error');
        return;
    }
    // Non-affiliate: require phone, address, province, birthday, department
    if (!isAffiliate) {
        if (!body.phone) { showToast('Vui lòng nhập Số điện thoại', 'error'); return; }
        if (!body.address) { showToast('Vui lòng nhập Địa chỉ', 'error'); return; }
        if (!body.province) { showToast('Vui lòng chọn Tỉnh / Thành phố', 'error'); return; }
        if (!body.birth_date) { showToast('Vui lòng nhập Sinh nhật', 'error'); return; }
    }
    if (!body.department_id) { showToast('Vui lòng chọn Đơn vị / Phòng ban', 'error'); return; }
    if (isAffiliate && !body.source_customer_id) {
        showToast('Vui lòng chọn Khách hàng nguồn', 'error'); return;
    }

    const data = await apiCall('/api/users', 'POST', body);
    if (data.success) {
        const userId = data.id;
        // Upload files
        const contractForm = new FormData();
        contractForm.append('contract_file', contractFile);
        contractForm.append('rules_file', rulesFile);
        await fetch(`/api/users/${userId}/upload-contract`, { method: 'POST', body: contractForm });

        const cccdForm = new FormData();
        cccdForm.append('id_card_front', cccdFront);
        cccdForm.append('id_card_back', cccdBack);
        await fetch(`/api/users/${userId}/upload-idcard`, { method: 'POST', body: cccdForm });

        // Save social handovers
        const socialRows = document.querySelectorAll('#createSocialTable tbody tr');
        for (const row of socialRows) {
            const item = {
                platform: row.querySelector('.sh-platform')?.value || '',
                account_name: row.querySelector('.sh-name')?.value || '',
                acc: row.querySelector('.sh-acc')?.value || '',
                pass: row.querySelector('.sh-pass')?.value || '',
                two_fa: row.querySelector('.sh-2fa')?.value || '',
                link: row.querySelector('.sh-link')?.value || '',
                note: row.querySelector('.sh-note')?.value || ''
            };
            if (item.platform || item.account_name) {
                await apiCall(`/api/users/${userId}/social-handovers`, 'POST', item);
            }
        }
        // Save tool handovers
        const toolRows = document.querySelectorAll('#createToolTable tbody tr');
        for (const row of toolRows) {
            const item = {
                tool_name: row.querySelector('.th-name')?.value || '',
                quantity: row.querySelector('.th-qty')?.value || 1,
                handover_date: row.querySelector('.th-date')?.value || null
            };
            if (item.tool_name) {
                await apiCall(`/api/users/${userId}/tool-handovers`, 'POST', item);
            }
        }

        showToast('Tạo tài khoản thành công!');
        closeModal();
        await loadAccounts();
    } else {
        showToast(data.error, 'error');
    }
}

async function showEditAccountModal(userId) {
    const [userData, tiers, staffList, deptData, socialData, toolData] = await Promise.all([
        apiCall(`/api/users/${userId}`),
        apiCall('/api/settings/commission-tiers'),
        apiCall('/api/users/dropdown'),
        apiCall('/api/departments'),
        apiCall(`/api/users/${userId}/social-handovers`),
        apiCall(`/api/users/${userId}/tool-handovers`)
    ]);
    const user = userData.user;
    if (!user) { showToast('Không tìm thấy tài khoản', 'error'); return; }
    const depts = deptData.departments || [];
    const editDeptOptionsHTML = buildAccDeptOptions(depts, user.department_id);
    const socialItems = socialData.items || [];
    const toolItems = toolData.items || [];

    const EDIT_AFF_ROLES = ['hoa_hong','ctv','nuoi_duong','sinh_vien'];
    const isEditAff = EDIT_AFF_ROLES.includes(user.role);

    const bodyHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Tên đăng nhập</label>
                <input type="text" class="form-control" value="${user.username}" disabled>
            </div>
            <div class="form-group">
                <label>Vai trò</label>
                <select id="editRole" class="form-control" onchange="onEditRoleChange()">
                    ${currentUser.role === 'giam_doc' ? `<option value="pho_giam_doc" ${user.role==='pho_giam_doc'?'selected':''}>Phó Giám Đốc</option>` : ''}
                    ${currentUser.role === 'giam_doc' ? `<option value="quan_ly" ${user.role==='quan_ly'?'selected':''}>Quản Lý</option>` : ''}
                    <option value="truong_phong" ${user.role==='truong_phong'?'selected':''}>Trưởng Phòng</option>
                    <option value="trinh" ${user.role==='trinh'?'selected':''}>Trinh</option>
                    <option value="thu_quy" ${user.role==='thu_quy'?'selected':''}>Thủ Quỹ</option>
                    <option value="ke_toan" ${user.role==='ke_toan'?'selected':''}>Kế Toán</option>
                    <option value="thu_kho" ${user.role==='thu_kho'?'selected':''}>Thủ Kho</option>
                    <option value="nhan_su" ${user.role==='nhan_su'?'selected':''}>Nhân Sự</option>
                    <option value="thu_ky" ${user.role==='thu_ky'?'selected':''}>Thư Ký</option>
                    <option value="nhan_vien" ${user.role==='nhan_vien'?'selected':''}>Nhân Viên</option>
                    <option value="to_truong" ${user.role==='to_truong'?'selected':''}>Tổ Trưởng</option>
                    <option value="kcs_hang" ${user.role==='kcs_hang'?'selected':''}>KCS Hàng</option>
                    <option value="ky_thuat" ${user.role==='ky_thuat'?'selected':''}>Kỹ Thuật</option>
                    <option value="nhan_vien_parttime" ${user.role==='nhan_vien_parttime'?'selected':''}>NV Part-Time</option>
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Họ tên</label>
                <input type="text" id="editFullName" class="form-control" value="${user.full_name}">
            </div>
            <div class="form-group">
                <label>🎂 Sinh nhật</label>
                <input type="date" id="editBirthDate" class="form-control" value="${user.birth_date ? user.birth_date.split('T')[0] : ''}">
            </div>
        </div>
        <div class="form-row" ${isEditAff ? 'style="display:none;"' : ''}>
            <div class="form-group">
                <label>ID nhóm Telegram</label>
                <input type="text" id="editTelegram" class="form-control" value="${user.telegram_group_id || ''}">
            </div>
            <div class="form-group">
                <label>Ngày vào làm</label>
                <input type="date" id="editStartDate" class="form-control" value="${user.start_date ? user.start_date.split('T')[0] : ''}">
            </div>
        </div>
        <div class="form-group" ${isEditAff ? 'style="display:none;"' : ''} id="editMaDonKDGroup">
            <label>Mã Đơn KD <small style="color:var(--gray-500);">(VD: VTT, duy nhất mỗi NV)</small></label>
            <input type="text" id="editOrderCodePrefix" class="form-control" value="${user.order_code_prefix || ''}" maxlength="10" style="text-transform:uppercase;">
        </div>
        <div class="form-group">
            <label>Đơn vị / Phòng ban</label>
            <select id="editDepartment" class="form-control">
                <option value="">— Chưa chọn —</option>
                ${editDeptOptionsHTML}
            </select>
        </div>
        ${isEditAff ? `
        <div class="form-row">
            <div class="form-group">
                <label>👤 Nhân viên quản lý</label>
                <select id="editManagedBy" class="form-control" onchange="onEditManagedByChange()">
                    <option value="">— Chọn nhân viên —</option>
                </select>
            </div>
            <div class="form-group">
                <label>📋 Khách hàng nguồn</label>
                <input type="text" id="editSourceSearch" class="form-control" placeholder="Tìm khách hàng..." value="${user.source_customer_name || ''}" onfocus="editLoadSourceDropdown()" oninput="editSearchSourceCustomer(this.value)">
                <input type="hidden" id="editSourceCustomerId" value="${user.source_customer_id || ''}">
                <input type="hidden" id="editSourceCrmType" value="${user.source_crm_type || ''}">
                <div id="editSourceResults" style="max-height:150px;overflow-y:auto;border:1px solid var(--gray-200);border-radius:8px;margin-top:4px;display:none;"></div>
            </div>
        </div>
        <div class="form-group">
            <label>📌 Khách CRM từ đâu?</label>
            <input type="text" id="editSourceCrmLabel" class="form-control" disabled value="${({nhu_cau:'Chăm Sóc KH Nhu Cầu',ctv:'Chăm Sóc CTV',hoa_hong_crm:'CRM Giáo Viên/Học Sinh/Sinh Viên',nuoi_duong:'CRM Nhân Sự/Kế Toán/P.Mua Hàng',sinh_vien:'CRM Thể Thao/Thời Trang Local',koc_tiktok:'CRM KOL Tiktok/Mẹ Bỉm Sữa'})[user.source_crm_type] || user.source_crm_type || '—'}" style="background:#f9fafb;color:var(--navy);font-weight:600;">
        </div>
        ` : ''}
        <div class="form-row">
            <div class="form-group">
                <label>SĐT <small style="color:var(--danger);">(10 chữ số)</small></label>
                <input type="text" id="editPhone" class="form-control" value="${user.phone || ''}" maxlength="10" pattern="[0-9]{10}" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
            </div>
            <div class="form-group">
                <label>Tỉnh / Thành phố</label>
                <select id="editProvince" class="form-control">
                    <option value="">— Chọn tỉnh thành —</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Địa chỉ</label>
            <input type="text" id="editAddress" class="form-control" value="${user.address || ''}">
        </div>

        <div id="editHoSoSection" ${isEditAff ? 'style="display:none;"' : ''}>
        <hr style="margin: 15px 0; border-color: var(--gray-200);">
        <h4 style="color:var(--navy);margin-bottom:10px;">📎 Hồ Sơ Nhân Viên</h4>
        <div class="form-row">
            <div class="form-group">
                <label>Hợp Đồng (PDF)</label>
                ${user.contract_file ? `<div style="margin-bottom:6px;"><a href="${user.contract_file}" target="_blank" style="color:var(--info);font-size:12px;">📄 Xem file hiện tại</a></div>` : '<div style="margin-bottom:6px;font-size:12px;color:var(--danger);">⚠️ Chưa upload</div>'}
                <input type="file" id="editContractFile" class="form-control" accept=".pdf">
            </div>
            <div class="form-group">
                <label>Nội Quy (PDF)</label>
                ${user.rules_file ? `<div style="margin-bottom:6px;"><a href="${user.rules_file}" target="_blank" style="color:var(--info);font-size:12px;">📄 Xem file hiện tại</a></div>` : '<div style="margin-bottom:6px;font-size:12px;color:var(--danger);">⚠️ Chưa upload</div>'}
                <input type="file" id="editRulesFile" class="form-control" accept=".pdf">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>CCCD Mặt Trước</label>
                ${user.id_card_front ? `<div style="margin-bottom:6px;"><img src="${user.id_card_front}" style="max-width:120px;border-radius:6px;border:1px solid var(--gray-200);"></div>` : '<div style="margin-bottom:6px;font-size:12px;color:var(--danger);">⚠️ Chưa upload</div>'}
                <input type="file" id="editCCCDFront" class="form-control" accept="image/*">
            </div>
            <div class="form-group">
                <label>CCCD Mặt Sau</label>
                ${user.id_card_back ? `<div style="margin-bottom:6px;"><img src="${user.id_card_back}" style="max-width:120px;border-radius:6px;border:1px solid var(--gray-200);"></div>` : '<div style="margin-bottom:6px;font-size:12px;color:var(--danger);">⚠️ Chưa upload</div>'}
                <input type="file" id="editCCCDBack" class="form-control" accept="image/*">
            </div>
        </div>

        <hr style="margin: 15px 0; border-color: var(--gray-200);">
        <h4 style="color:var(--navy);margin-bottom:10px;">🌐 BÀN GIAO MXH</h4>
        <div class="table-container" style="margin-bottom:8px;">
            <table class="table" style="font-size:12px;" id="socialHandoverTable">
                <thead><tr>
                    <th style="min-width:80px">Loại</th>
                    <th style="min-width:100px">Tên TK</th>
                    <th style="min-width:80px">ACC</th>
                    <th style="min-width:80px">PASS</th>
                    <th style="min-width:60px">2FA</th>
                    <th style="min-width:100px">Link</th>
                    <th style="min-width:80px">Ghi chú</th>
                    <th style="width:40px"></th>
                </tr></thead>
                <tbody>
                    ${socialItems.length > 0 ? socialItems.map(s => `<tr>
                        <td><input class="form-control sh-platform" value="${s.platform||''}" placeholder="FB" style="font-size:11px;padding:4px 6px;"></td>
                        <td><input class="form-control sh-name" value="${s.account_name||''}" style="font-size:11px;padding:4px 6px;"></td>
                        <td><input class="form-control sh-acc" value="${s.acc||''}" style="font-size:11px;padding:4px 6px;"></td>
                        <td><input class="form-control sh-pass" value="${s.pass||''}" style="font-size:11px;padding:4px 6px;"></td>
                        <td><input class="form-control sh-2fa" value="${s.two_fa||''}" style="font-size:11px;padding:4px 6px;"></td>
                        <td><input class="form-control sh-link" value="${s.link||''}" style="font-size:11px;padding:4px 6px;"></td>
                        <td><input class="form-control sh-note" value="${s.note||''}" style="font-size:11px;padding:4px 6px;"></td>
                        <td><button class="btn btn-xs" onclick="this.closest('tr').remove()" style="color:var(--danger)">✕</button></td>
                    </tr>`).join('') : ''}
                </tbody>
            </table>
        </div>
        <button class="btn btn-sm" onclick="addSocialHandoverRow()" style="font-size:11px;margin-bottom:12px;">➕ Thêm dòng MXH</button>

        <hr style="margin: 15px 0; border-color: var(--gray-200);">
        <h4 style="color:var(--navy);margin-bottom:10px;">🔧 BÀN GIAO CÔNG CỤ LÀM VIỆC</h4>
        <div class="table-container" style="margin-bottom:8px;">
            <table class="table" style="font-size:12px;" id="toolHandoverTable">
                <thead><tr>
                    <th style="min-width:150px">Tên Công Cụ</th>
                    <th style="min-width:80px">Số Lượng</th>
                    <th style="min-width:120px">Ngày Bàn Giao</th>
                    <th style="width:40px"></th>
                </tr></thead>
                <tbody>
                    ${toolItems.length > 0 ? toolItems.map(t => `<tr>
                        <td><input class="form-control th-name" value="${t.tool_name||''}" style="font-size:11px;padding:4px 6px;"></td>
                        <td><input type="number" class="form-control th-qty" value="${t.quantity||1}" min="1" style="font-size:11px;padding:4px 6px;"></td>
                        <td><input type="date" class="form-control th-date" value="${t.handover_date||''}" style="font-size:11px;padding:4px 6px;"></td>
                        <td><button class="btn btn-xs" onclick="this.closest('tr').remove()" style="color:var(--danger)">✕</button></td>
                    </tr>`).join('') : ''}
                </tbody>
            </table>
        </div>
        <button class="btn btn-sm" onclick="addToolHandoverRow()" style="font-size:11px;margin-bottom:12px;">➕ Thêm dòng Công Cụ</button>
        </div>

        <div id="editHoaHongFields" style="display:${user.role === 'hoa_hong' ? 'block' : 'none'};">
            <hr style="margin: 15px 0; border-color: var(--gray-200);">
            <h4 style="color:var(--navy);margin-bottom:10px;">💰 Hoa Hồng</h4>
            <div class="form-row">
                <div class="form-group">
                    <label>Tầng chiết khấu</label>
                    <select id="editTierId" class="form-control">
                        <option value="">Chọn tầng</option>
                        ${(tiers.items || []).map(t => `<option value="${t.id}" ${user.commission_tier_id==t.id?'selected':''}>${t.name} (TT: ${t.percentage}% / CT: ${t.parent_percentage || 0}%)</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Gán cho nhân viên</label>
                    <select id="editAssignTo" class="form-control">
                        <option value="">Chọn nhân viên</option>
                        ${(staffList.users || []).filter(u => ['nhan_vien','truong_phong'].includes(u.role)).map(u => 
                            `<option value="${u.id}" ${user.assigned_to_user_id==u.id?'selected':''}>${u.full_name} (${ROLE_LABELS[u.role]})</option>`
                        ).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Ngân hàng</label>
                    <input type="text" id="editBankName" class="form-control" value="${user.bank_name || ''}" placeholder="VD: Vietcombank">
                </div>
                <div class="form-group">
                    <label>Số tài khoản</label>
                    <input type="text" id="editBankAccount" class="form-control" value="${user.bank_account || ''}" placeholder="Số TK">
                </div>
            </div>
            <div class="form-group">
                <label>Chủ tài khoản</label>
                <input type="text" id="editBankHolder" class="form-control" value="${user.bank_holder || ''}" placeholder="Tên chủ TK">
            </div>
        </div>
        <hr style="margin: 15px 0; border-color: var(--gray-200);">
        <div class="form-group">
            <label>Đổi mật khẩu (để trống nếu không đổi)</label>
            <input type="password" id="editNewPassword" class="form-control" placeholder="Mật khẩu mới">
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-success" onclick="submitEditAccount(${userId})">Lưu Thay Đổi</button>
    `;
    const statusBtnColor = user.status === 'active' ? '#10b981' : '#ef4444';
    const statusBtnLabel = user.status === 'active' ? 'Đang Làm' : 'Nghỉ Việc';
    const statusBtnNext = user.status === 'active' ? 'resigned' : 'active';
    const modalTitle = `✏️ Sửa Tài Khoản: ${user.full_name} <span onclick="toggleUserStatusFromModal(${userId}, '${statusBtnNext}')" style="display:inline-block;margin-left:12px;padding:3px 14px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;background:${statusBtnColor};color:white;vertical-align:middle;">${statusBtnLabel}</span>`;
    openModal(modalTitle, bodyHTML, footerHTML);
    // Populate province dropdown
    if (typeof populateProvinceDropdown === 'function') {
        populateProvinceDropdown('editProvince');
    }
    const editProvSel = document.getElementById('editProvince');
    if (editProvSel && user.province) editProvSel.value = user.province;

    // Populate NV quản lý dropdown for affiliates
    if (isEditAff) {
        loadEmployeeDropdown('editManagedBy').then(() => {
            const sel = document.getElementById('editManagedBy');
            if (sel && user.managed_by_user_id) sel.value = user.managed_by_user_id;
        });
    }
}

// --- Edit form: source customer search ---
let _editSourceCustomersCache = [];

async function onEditManagedByChange() {
    const managerId = document.getElementById('editManagedBy')?.value;
    const searchInput = document.getElementById('editSourceSearch');
    if (searchInput) {
        searchInput.disabled = !managerId;
        if (!managerId) {
            searchInput.placeholder = 'Chọn NV quản lý trước...';
            searchInput.value = '';
            document.getElementById('editSourceCustomerId').value = '';
            document.getElementById('editSourceCrmType').value = '';
            document.getElementById('editSourceCrmLabel').value = '';
        } else {
            searchInput.placeholder = 'Tìm khách hàng...';
        }
    }
}

async function editLoadSourceDropdown() {
    const managerId = document.getElementById('editManagedBy')?.value;
    if (!managerId) return;
    await editSearchSourceCustomer('');
}

async function editSearchSourceCustomer(q) {
    const managerId = document.getElementById('editManagedBy')?.value;
    if (!managerId) return;
    const data = await apiCall(`/api/affiliate/customers-for-assign?employee_id=${managerId}&q=${encodeURIComponent(q)}`);
    const customers = data.customers || [];
    _editSourceCustomersCache = customers;
    const resDiv = document.getElementById('editSourceResults');
    if (!resDiv) return;
    if (customers.length === 0) {
        resDiv.innerHTML = '<div style="padding:8px;color:#9ca3af;font-size:12px;">Không tìm thấy khách hàng</div>';
    } else {
        resDiv.innerHTML = customers.map((c, i) =>
            `<div style="padding:8px 12px;cursor:pointer;font-size:12px;border-bottom:1px solid #f3f4f6;transition:background .15s;"
                 onmouseover="this.style.background='#f0f4ff'" onmouseout="this.style.background=''"
                 onmousedown="editSelectSourceCustomer(${i})">
                <b>${c.customer_name}</b> — ${c.phone || 'Chưa có SĐT'}
                ${c.address ? `<br><span style="color:#6b7280;">${c.address}${c.province ? ', ' + c.province : ''}</span>` : ''}
            </div>`
        ).join('');
    }
    resDiv.style.display = 'block';
}

function editSelectSourceCustomer(index) {
    const c = _editSourceCustomersCache[index];
    if (!c) return;
    document.getElementById('editSourceCustomerId').value = c.id;
    document.getElementById('editSourceSearch').value = `${c.customer_name} - ${c.phone || ''}`;
    document.getElementById('editSourceResults').style.display = 'none';

    // Auto-fill CRM source type
    const CRM_LABELS = {nhu_cau:'Chăm Sóc KH Nhu Cầu',ctv:'Chăm Sóc CTV',hoa_hong_crm:'CRM Giáo Viên/Học Sinh/Sinh Viên',nuoi_duong:'CRM Nhân Sự/Kế Toán/P.Mua Hàng',sinh_vien:'CRM Thể Thao/Thời Trang Local',koc_tiktok:'CRM KOL Tiktok/Mẹ Bỉm Sữa'};
    document.getElementById('editSourceCrmType').value = c.crm_type || '';
    document.getElementById('editSourceCrmLabel').value = CRM_LABELS[c.crm_type] || c.crm_type || '';
}

function addSocialHandoverRow() {
    const tbody = document.querySelector('#socialHandoverTable tbody');
    tbody.insertAdjacentHTML('beforeend', `<tr>
        <td><input class="form-control sh-platform" value="" placeholder="FB" style="font-size:11px;padding:4px 6px;"></td>
        <td><input class="form-control sh-name" value="" style="font-size:11px;padding:4px 6px;"></td>
        <td><input class="form-control sh-acc" value="" style="font-size:11px;padding:4px 6px;"></td>
        <td><input class="form-control sh-pass" value="" style="font-size:11px;padding:4px 6px;"></td>
        <td><input class="form-control sh-2fa" value="" style="font-size:11px;padding:4px 6px;"></td>
        <td><input class="form-control sh-link" value="" style="font-size:11px;padding:4px 6px;"></td>
        <td><input class="form-control sh-note" value="" style="font-size:11px;padding:4px 6px;"></td>
        <td><button class="btn btn-xs" onclick="this.closest('tr').remove()" style="color:var(--danger)">✕</button></td>
    </tr>`);
}

function addToolHandoverRow() {
    const tbody = document.querySelector('#toolHandoverTable tbody');
    tbody.insertAdjacentHTML('beforeend', `<tr>
        <td><input class="form-control th-name" value="" style="font-size:11px;padding:4px 6px;"></td>
        <td><input type="number" class="form-control th-qty" value="1" min="1" style="font-size:11px;padding:4px 6px;"></td>
        <td><input type="date" class="form-control th-date" value="" style="font-size:11px;padding:4px 6px;"></td>
        <td><button class="btn btn-xs" onclick="this.closest('tr').remove()" style="color:var(--danger)">✕</button></td>
    </tr>`);
}

function addCreateSocialRow() {
    const tbody = document.querySelector('#createSocialTable tbody');
    tbody.insertAdjacentHTML('beforeend', `<tr>
        <td><input class="form-control sh-platform" value="" placeholder="FB" style="font-size:11px;padding:4px 6px;"></td>
        <td><input class="form-control sh-name" value="" style="font-size:11px;padding:4px 6px;"></td>
        <td><input class="form-control sh-acc" value="" style="font-size:11px;padding:4px 6px;"></td>
        <td><input class="form-control sh-pass" value="" style="font-size:11px;padding:4px 6px;"></td>
        <td><input class="form-control sh-2fa" value="" style="font-size:11px;padding:4px 6px;"></td>
        <td><input class="form-control sh-link" value="" style="font-size:11px;padding:4px 6px;"></td>
        <td><input class="form-control sh-note" value="" style="font-size:11px;padding:4px 6px;"></td>
        <td><button class="btn btn-xs" onclick="this.closest('tr').remove()" style="color:var(--danger)">✕</button></td>
    </tr>`);
}

function addCreateToolRow() {
    const tbody = document.querySelector('#createToolTable tbody');
    tbody.insertAdjacentHTML('beforeend', `<tr>
        <td><input class="form-control th-name" value="" style="font-size:11px;padding:4px 6px;"></td>
        <td><input type="number" class="form-control th-qty" value="1" min="1" style="font-size:11px;padding:4px 6px;"></td>
        <td><input type="date" class="form-control th-date" value="" style="font-size:11px;padding:4px 6px;"></td>
        <td><button class="btn btn-xs" onclick="this.closest('tr').remove()" style="color:var(--danger)">✕</button></td>
    </tr>`);
}

function onEditRoleChange() {
    const role = document.getElementById('editRole').value;
    const hhFields = document.getElementById('editHoaHongFields');
    if (hhFields) hhFields.style.display = role === 'hoa_hong' ? 'block' : 'none';
}

async function submitEditAccount(userId) {
    const phone = document.getElementById('editPhone').value;
    if (phone && !/^\d{10}$/.test(phone)) {
        showToast('Số điện thoại phải đúng 10 chữ số', 'error');
        return;
    }

    const body = {
        full_name: document.getElementById('editFullName').value,
        role: document.getElementById('editRole').value,
        phone,
        address: document.getElementById('editAddress').value,
        province: document.getElementById('editProvince')?.value || null,
        start_date: document.getElementById('editStartDate').value,
        telegram_group_id: document.getElementById('editTelegram').value,
        birth_date: document.getElementById('editBirthDate')?.value || null,
        order_code_prefix: document.getElementById('editOrderCodePrefix')?.value || null,
        department_id: document.getElementById('editDepartment')?.value || null,
        commission_tier_id: document.getElementById('editTierId')?.value || null,
        assigned_to_user_id: document.getElementById('editAssignTo')?.value || null,
        bank_name: document.getElementById('editBankName')?.value || null,
        bank_account: document.getElementById('editBankAccount')?.value || null,
        bank_holder: document.getElementById('editBankHolder')?.value || null,
        managed_by_user_id: document.getElementById('editManagedBy')?.value || null,
        source_customer_id: document.getElementById('editSourceCustomerId')?.value || null,
        source_crm_type: document.getElementById('editSourceCrmType')?.value || null,
    };

    const data = await apiCall(`/api/users/${userId}`, 'PUT', body);
    if (data.success) {
        // Change password if provided
        const newPass = document.getElementById('editNewPassword').value;
        if (newPass) {
            await apiCall(`/api/users/${userId}/change-password`, 'PUT', { newPassword: newPass });
        }

        // Upload files if selected
        const contractFile = document.getElementById('editContractFile')?.files[0];
        const rulesFile = document.getElementById('editRulesFile')?.files[0];
        if (contractFile || rulesFile) {
            const fileForm = new FormData();
            if (contractFile) fileForm.append('contract_file', contractFile);
            if (rulesFile) fileForm.append('rules_file', rulesFile);
            await fetch(`/api/users/${userId}/upload-contract`, { method: 'POST', body: fileForm });
        }

        const cccdFront = document.getElementById('editCCCDFront')?.files[0];
        const cccdBack = document.getElementById('editCCCDBack')?.files[0];
        if (cccdFront || cccdBack) {
            const cccdForm = new FormData();
            if (cccdFront) cccdForm.append('id_card_front', cccdFront);
            if (cccdBack) cccdForm.append('id_card_back', cccdBack);
            await fetch(`/api/users/${userId}/upload-idcard`, { method: 'POST', body: cccdForm });
        }

        // Save social handovers
        const socialItems = [];
        document.querySelectorAll('#socialHandoverTable tbody tr').forEach(row => {
            const platform = row.querySelector('.sh-platform')?.value;
            if (platform) {
                socialItems.push({
                    platform,
                    account_name: row.querySelector('.sh-name')?.value || '',
                    acc: row.querySelector('.sh-acc')?.value || '',
                    pass: row.querySelector('.sh-pass')?.value || '',
                    two_fa: row.querySelector('.sh-2fa')?.value || '',
                    link: row.querySelector('.sh-link')?.value || '',
                    note: row.querySelector('.sh-note')?.value || '',
                });
            }
        });
        await apiCall(`/api/users/${userId}/social-handovers`, 'PUT', { items: socialItems });

        // Save tool handovers
        const toolItems = [];
        document.querySelectorAll('#toolHandoverTable tbody tr').forEach(row => {
            const tool_name = row.querySelector('.th-name')?.value;
            if (tool_name) {
                toolItems.push({
                    tool_name,
                    quantity: Number(row.querySelector('.th-qty')?.value) || 1,
                    handover_date: row.querySelector('.th-date')?.value || null,
                });
            }
        });
        await apiCall(`/api/users/${userId}/tool-handovers`, 'PUT', { items: toolItems });

        showToast('Cập nhật tài khoản thành công!');
        // Re-open edit modal with fresh data (preserve state)
        await loadAccounts();
        await showEditAccountModal(userId);
    } else {
        showToast(data.error, 'error');
    }
}

async function showAccountDetail(userId) {
    const { user } = await apiCall(`/api/users/${userId}`);
    if (!user) { showToast('Không tìm thấy', 'error'); return; }

    // Load handover data
    const socialData = await apiCall(`/api/users/${userId}/social-handovers`);
    const toolData = await apiCall(`/api/users/${userId}/tool-handovers`);
    const socialItems = socialData.items || [];
    const toolItems = toolData.items || [];

    const VIEW_AFF_ROLES = ['hoa_hong','ctv','nuoi_duong','sinh_vien'];
    const isViewAff = VIEW_AFF_ROLES.includes(user.role);
    const initials = (user.full_name || '?').split(' ').map(w => w[0]).join('').slice(-2).toUpperCase();
    const isActive = user.status === 'active';
    const startDate = user.start_date ? new Date(user.start_date) : null;
    const daysWorking = startDate ? Math.floor((Date.now() - startDate.getTime()) / 86400000) : 0;

    const bodyHTML = `
        <div style="margin:-20px -24px -10px;font-family:'Segoe UI',system-ui,sans-serif;">
            <!-- HEADER -->
            <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%);padding:24px 24px 20px;border-radius:12px 12px 0 0;position:relative;overflow:hidden;">
                <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;background:rgba(250,210,76,0.06);border-radius:50%;"></div>
                <div style="display:flex;align-items:center;gap:16px;position:relative;z-index:1;">
                    <div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#fad24c,#f59e0b);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#0f172a;box-shadow:0 4px 14px rgba(250,210,76,0.35);flex-shrink:0;">
                        ${initials}
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:2px;">${user.full_name}</div>
                        <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:6px;">@${user.username}</div>
                        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                            <span class="role-badge role-${user.role}" style="font-size:11px;">${ROLE_LABELS[user.role]}</span>
                            <span style="font-size:11px;padding:3px 10px;border-radius:12px;font-weight:600;background:${isActive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'};color:${isActive ? '#22c55e' : '#ef4444'};border:1px solid ${isActive ? '#22c55e' : '#ef4444'};">
                                ${isActive ? '✅ Đang làm' : '🚫 Nghỉ việc'}
                            </span>
                        </div>
                    </div>
                    <div style="text-align:right;flex-shrink:0;">
                        <div style="font-size:24px;font-weight:800;color:#fad24c;">${daysWorking}</div>
                        <div style="font-size:10px;color:rgba(255,255,255,0.5);font-weight:600;">NGÀY LÀM VIỆC</div>
                    </div>
                </div>
            </div>

            <!-- INFO GRID -->
            <div style="padding:16px 20px 12px;">
                <div style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;overflow:hidden;">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
                        <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                            <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">📞 SĐT</div>
                            <div style="font-size:13px;font-weight:600;color:#1e293b;">${user.phone || '—'}</div>
                        </div>
                        <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;">
                            <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">📅 Ngày vào</div>
                            <div style="font-size:13px;font-weight:600;color:#1e293b;">${formatDate(user.start_date)}</div>
                        </div>
                        <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                            <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">🏠 Địa chỉ</div>
                            <div style="font-size:13px;font-weight:600;color:#1e293b;">${user.address || '—'}</div>
                        </div>
                        <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;">
                            <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">📍 Tỉnh/TP</div>
                            <div style="font-size:13px;font-weight:600;color:#1e293b;">${user.province || '—'}</div>
                        </div>
                        <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                            <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">🎂 Sinh nhật</div>
                            <div style="font-size:13px;font-weight:600;color:#1e293b;">${user.birth_date ? formatDate(user.birth_date) : '—'}</div>
                        </div>
                        ${!isViewAff ? `
                        <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;">
                            <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">💬 Telegram</div>
                            <div style="font-size:13px;font-weight:600;color:#1e293b;">${user.telegram_group_id || '—'}</div>
                        </div>
                        ` : `
                        <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;">
                            <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">👤 NV Quản lý</div>
                            <div style="font-size:13px;font-weight:600;color:#1e293b;">${user.manager_name || '—'}</div>
                        </div>
                        `}
                        ${isViewAff ? `
                        <div style="padding:12px 14px;border-right:1px solid #e2e8f0;">
                            <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">📋 KH Nguồn</div>
                            <div style="font-size:13px;font-weight:600;color:#1e293b;">${user.source_customer_name || '—'}</div>
                        </div>
                        <div style="padding:12px 14px;">
                            <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">📌 CRM Nguồn</div>
                            <div style="font-size:13px;font-weight:600;color:#1e293b;">${({nhu_cau:'Chăm Sóc KH Nhu Cầu',ctv:'Chăm Sóc CTV',hoa_hong_crm:'CRM Giáo Viên/Học Sinh/Sinh Viên',nuoi_duong:'CRM Nhân Sự/Kế Toán/P.Mua Hàng',sinh_vien:'CRM Thể Thao/Thời Trang Local',koc_tiktok:'CRM KOL Tiktok/Mẹ Bỉm Sữa'})[user.source_crm_type] || user.source_crm_type || '—'}</div>
                        </div>
                        ` : `
                        <div style="padding:12px 14px;">
                            <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">🏷️ Mã Đơn KD</div>
                            <div style="font-size:13px;font-weight:700;color:#fad24c;">${user.order_code_prefix || '—'}</div>
                        </div>
                        `}
                    </div>
                </div>

                ${user.role === 'hoa_hong' ? `
                <!-- HOA HONG SECTION -->
                <div style="margin-top:12px;background:linear-gradient(135deg,#fefce8,#fef3c7);border-radius:10px;border:1px solid #fde68a;padding:14px;">
                    <div style="font-size:12px;font-weight:700;color:#92400e;margin-bottom:10px;">💰 Thông tin Hoa Hồng</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
                        <div><div style="font-size:10px;color:#b45309;">Tầng HH</div><div style="font-size:13px;font-weight:700;color:#92400e;">${user.tier_name || '—'} ${user.tier_percentage ? '(' + user.tier_percentage + '%)' : ''}</div></div>
                        <div><div style="font-size:10px;color:#b45309;">Gán cho</div><div style="font-size:13px;font-weight:600;color:#92400e;">${user.assigned_to_name || '—'}</div></div>
                        <div><div style="font-size:10px;color:#b45309;">Số dư</div><div style="font-size:14px;font-weight:800;color:#d97706;">${formatCurrency(user.balance)} VNĐ</div></div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px;">
                        <div><div style="font-size:10px;color:#b45309;">Ngân hàng</div><div style="font-size:13px;font-weight:600;color:#92400e;">${user.bank_name || '—'}</div></div>
                        <div><div style="font-size:10px;color:#b45309;">Số TK</div><div style="font-size:13px;font-weight:600;color:#92400e;">${user.bank_account || '—'}</div></div>
                        <div><div style="font-size:10px;color:#b45309;">Chủ TK</div><div style="font-size:13px;font-weight:600;color:#92400e;">${user.bank_holder || '—'}</div></div>
                    </div>
                </div>
                ` : ''}
            </div>

            ${!isViewAff ? `
            <!-- HỒ SƠ SECTION -->
            <div style="padding:0 20px 16px;">
                <div style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;padding:16px;">
                    <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px;">📎 Hồ Sơ</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                        <div style="padding:10px 14px;background:white;border-radius:8px;border:1px solid #e2e8f0;">
                            <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:4px;">Hợp đồng</div>
                            ${user.contract_file ? '<a href="' + user.contract_file + '" target="_blank" style="color:#3b82f6;font-weight:600;font-size:13px;text-decoration:none;">📄 Xem PDF</a>' : '<span style="color:#ef4444;font-size:12px;">⚠️ Chưa upload</span>'}
                        </div>
                        <div style="padding:10px 14px;background:white;border-radius:8px;border:1px solid #e2e8f0;">
                            <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:4px;">Nội quy</div>
                            ${user.rules_file ? '<a href="' + user.rules_file + '" target="_blank" style="color:#3b82f6;font-weight:600;font-size:13px;text-decoration:none;">📄 Xem PDF</a>' : '<span style="color:#ef4444;font-size:12px;">⚠️ Chưa upload</span>'}
                        </div>
                    </div>
                    ${user.id_card_front || user.id_card_back ? `
                    <div style="font-size:11px;font-weight:600;color:#64748b;margin-bottom:8px;">🪪 Căn cước công dân</div>
                    <div style="display:flex;gap:12px;flex-wrap:wrap;">
                        ${user.id_card_front ? '<div><div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">Mặt trước</div><img src="' + user.id_card_front + '" style="max-width:220px;border-radius:10px;border:2px solid #e2e8f0;cursor:pointer;transition:transform 0.15s;" onclick="window.open(\'' + user.id_card_front + '\',\'_blank\')" onmouseover="this.style.transform=\'scale(1.03)\'" onmouseout="this.style.transform=\'\'"></div>' : ''}
                        ${user.id_card_back ? '<div><div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">Mặt sau</div><img src="' + user.id_card_back + '" style="max-width:220px;border-radius:10px;border:2px solid #e2e8f0;cursor:pointer;transition:transform 0.15s;" onclick="window.open(\'' + user.id_card_back + '\',\'_blank\')" onmouseover="this.style.transform=\'scale(1.03)\'" onmouseout="this.style.transform=\'\'"></div>' : ''}
                    </div>
                    ` : '<div style="color:#ef4444;font-size:12px;">⚠️ Chưa upload CCCD</div>'}
                </div>
            </div>

            ${socialItems.length > 0 ? `
            <!-- MXH SECTION -->
            <div style="padding:0 20px 16px;">
                <div style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;padding:16px;">
                    <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:10px;">🌐 Bàn Giao MXH</div>
                    <div class="table-container">
                        <table class="table" style="font-size:11px;">
                            <thead><tr><th>Loại</th><th>Tên TK</th><th>ACC</th><th>PASS</th><th>2FA</th><th>Link</th><th>Ghi chú</th></tr></thead>
                            <tbody>${socialItems.map(s => '<tr><td><strong>' + s.platform + '</strong></td><td>' + (s.account_name||'—') + '</td><td>' + (s.acc||'—') + '</td><td>' + (s.pass||'—') + '</td><td>' + (s.two_fa||'—') + '</td><td>' + (s.link ? '<a href="' + s.link + '" target="_blank" style="color:#3b82f6;">🔗</a>' : '—') + '</td><td>' + (s.note||'—') + '</td></tr>').join('')}</tbody>
                        </table>
                    </div>
                </div>
            </div>
            ` : ''}

            ${toolItems.length > 0 ? `
            <!-- CÔNG CỤ SECTION -->
            <div style="padding:0 20px 16px;">
                <div style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;padding:16px;">
                    <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:10px;">🔧 Bàn Giao Công Cụ</div>
                    <div class="table-container">
                        <table class="table" style="font-size:11px;">
                            <thead><tr><th>Tên Công Cụ</th><th>Số Lượng</th><th>Ngày Bàn Giao</th></tr></thead>
                            <tbody>${toolItems.map(t => '<tr><td><strong>' + t.tool_name + '</strong></td><td style="text-align:center;">' + t.quantity + '</td><td>' + (t.handover_date ? formatDate(t.handover_date) : '—') + '</td></tr>').join('')}</tbody>
                        </table>
                    </div>
                </div>
            </div>
            ` : ''}
            ` : ''}
        </div>
    `;

    openModal('', bodyHTML, `
        <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
    `);
}

async function toggleUserStatusFromModal(userId, newStatus) {
    // Close edit modal first, then show status modal
    const userName = document.getElementById('modalTitle')?.textContent?.replace(/.*:\s*/, '') || '';
    closeModal();
    setTimeout(() => {
        showUserStatusModal(userId, userName, newStatus === 'resigned' ? 'active' : 'resigned');
    }, 200);
}

function showUserStatusModal(userId, userName, currentStatus) {
    const isActive = currentStatus === 'active';
    const bodyHTML = `
        <div style="text-align:center;padding:10px 0;">
            <div style="margin-bottom:16px;font-size:14px;">Chọn trạng thái cho <strong>${userName}</strong>:</div>
            <div style="display:flex;flex-direction:column;gap:10px;max-width:320px;margin:0 auto;">
                <button onclick="confirmUserStatus(${userId}, 'active')" 
                    style="padding:12px 20px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;
                    border:2px solid ${isActive ? '#10b981' : '#e5e7eb'};background:${isActive ? '#ecfdf5' : 'white'};color:${isActive ? '#10b981' : '#6b7280'};">
                    ✅ Đang Làm Việc
                </button>
                <button onclick="confirmUserStatus(${userId}, 'resigned')" 
                    style="padding:12px 20px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;
                    border:2px solid ${!isActive ? '#ef4444' : '#e5e7eb'};background:${!isActive ? '#fef2f2' : 'white'};color:${!isActive ? '#ef4444' : '#6b7280'};">
                    🚫 Cho Nghỉ Việc
                </button>
            </div>
            <div style="margin-top:14px;font-size:12px;color:#f59e0b;">⚠ Cho Nghỉ Việc sẽ khóa đăng nhập tài khoản này</div>
        </div>
    `;
    openModal('🔄 Thay đổi trạng thái', bodyHTML, `<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>`);
}

async function confirmUserStatus(userId, newStatus) {
    // If setting to resigned, check if user has managed KH/affiliates
    if (newStatus === 'resigned') {
        try {
            const res = await fetch(`/api/users/${userId}/managed-count`, {
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
            });
            const managed = await res.json();
            if (managed.success && (managed.customerCount > 0 || managed.affiliateCount > 0)) {
                closeModal();
                setTimeout(() => showHandoverModal(userId, managed), 200);
                return;
            }
        } catch(e) { /* proceed normally */ }
    }

    const data = await apiCall(`/api/users/${userId}/status`, 'PUT', { status: newStatus });
    if (data.success) {
        showToast(data.message);
        closeModal();
        await loadAccounts();
    } else {
        showToast(data.error, 'error');
    }
}

// ========== HANDOVER (1B + 1C) ==========

async function showHandoverModal(userId, managed) {
    // Build staff list for dropdown
    const staffRes = await fetch('/api/staff-list', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
    const staffList = await staffRes.json();
    const managers = (staffList.users || []).filter(u => 
        !['hoa_hong','ctv','nuoi_duong','sinh_vien','tkaffiliate'].includes(u.role) && u.id !== userId
    );
    const ROLE_MAP = { nhan_vien:'Nhân Viên', quan_ly:'Quản Lý', truong_phong:'Trưởng Phòng', giam_doc:'Giám Đốc', trinh:'Trinh', nhan_vien_parttime:'NV Parttime' };
    const options = managers.map(e => `<option value="${e.id}">${e.full_name} (${ROLE_MAP[e.role] || e.role})</option>`).join('');

    const custList = managed.customers.map(c => 
        `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f3f4f6;">
            <input type="checkbox" class="handover-check" data-type="customer" data-id="${c.id}" checked>
            <span>🧑 <strong>${c.customer_name}</strong> ${c.phone ? '- ' + c.phone : ''}</span>
        </div>`
    ).join('');

    const affList = managed.affiliates.map(a => 
        `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f3f4f6;">
            <input type="checkbox" class="handover-check" data-type="affiliate" data-id="${a.id}" checked>
            <span>👤 <strong>${a.full_name}</strong> ${a.phone ? '- ' + a.phone : ''}</span>
        </div>`
    ).join('');

    const bodyHTML = `
        <div style="margin-bottom:16px;">
            <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:12px 16px;margin-bottom:16px;">
                <strong>⚠ Nhân viên này đang quản lý ${managed.customerCount} khách hàng và ${managed.affiliateCount} affiliate.</strong><br>
                <span style="font-size:13px;color:#92400e;">Vui lòng chọn nhân viên nhận bàn giao trước khi cho nghỉ việc.</span>
            </div>
            <label style="font-weight:600;font-size:13px;">Nhân viên nhận bàn giao:</label>
            <select id="handoverNewManager" class="form-control" style="margin:8px 0 16px;">
                <option value="">— Chọn nhân viên nhận —</option>
                ${options}
            </select>
            ${managed.customerCount > 0 ? `
            <div style="margin-bottom:12px;">
                <div style="font-weight:700;font-size:13px;margin-bottom:6px;">🧑 Khách hàng (${managed.customerCount})</div>
                <div style="max-height:150px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px;padding:6px 10px;">${custList}</div>
            </div>` : ''}
            ${managed.affiliateCount > 0 ? `
            <div style="margin-bottom:12px;">
                <div style="font-weight:700;font-size:13px;margin-bottom:6px;">👤 Affiliate (${managed.affiliateCount})</div>
                <div style="max-height:150px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px;padding:6px 10px;">${affList}</div>
            </div>` : ''}
        </div>
    `;
    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn" style="background:#fef3c7;color:#92400e;" onclick="skipHandoverAndResign(${userId})">Bỏ qua, cho nghỉ</button>
        <button class="btn btn-primary" onclick="submitHandover(${userId})">📦 Bàn giao & Cho nghỉ</button>
    `;
    openModal('📦 Bàn Giao KH & Affiliate', bodyHTML, footerHTML);
}

async function submitHandover(userId) {
    const newManagerId = document.getElementById('handoverNewManager')?.value;
    if (!newManagerId) { showToast('Chọn nhân viên nhận bàn giao', 'error'); return; }

    // Collect checked items
    const checks = document.querySelectorAll('.handover-check:checked');
    const transfers = [];
    checks.forEach(cb => {
        transfers.push({ type: cb.dataset.type, id: Number(cb.dataset.id), newManagerId: Number(newManagerId) });
    });

    if (transfers.length === 0) {
        showToast('Chưa chọn mục nào để bàn giao', 'error');
        return;
    }

    // Check if all items are selected → use bulk API, else selective
    const allChecked = document.querySelectorAll('.handover-check').length === checks.length;
    
    try {
        let data;
        if (allChecked) {
            const res = await fetch(`/api/users/${userId}/handover`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') },
                body: JSON.stringify({ newManagerId: Number(newManagerId) })
            });
            data = await res.json();
        } else {
            const res = await fetch(`/api/users/${userId}/handover-selective`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') },
                body: JSON.stringify({ transfers })
            });
            data = await res.json();
        }

        if (data.success) {
            showToast(data.message, 'success');
            // Now set status to resigned
            const statusRes = await apiCall(`/api/users/${userId}/status`, 'PUT', { status: 'resigned' });
            if (statusRes.success) showToast(statusRes.message);
            closeModal();
            await loadAccounts();
        } else {
            showToast(data.error || 'Lỗi bàn giao', 'error');
        }
    } catch (e) {
        showToast('Lỗi kết nối', 'error');
    }
}

async function skipHandoverAndResign(userId) {
    if (!confirm('Bạn chắc chắn muốn cho nghỉ mà KHÔNG bàn giao KH/Affiliate?')) return;
    const data = await apiCall(`/api/users/${userId}/status`, 'PUT', { status: 'resigned' });
    if (data.success) {
        showToast(data.message);
        closeModal();
        await loadAccounts();
    } else {
        showToast(data.error, 'error');
    }
}

async function unlockUser(userId, name) {
    const confirm = window.confirm(`Mở khóa tài khoản "${name}"?\n\nKhách hàng nguồn sẽ được phục hồi về CRM với trạng thái Tư Vấn và lịch hẹn hôm nay.`);
    if (!confirm) return;
    
    const data = await apiCall(`/api/users/${userId}/unlock`, 'PUT');
    if (data.success) {
        showToast('🔓 ' + data.message);
        await loadAccounts();
    } else {
        showToast(data.error, 'error');
    }
}

async function deleteUser(userId, name) {
    const confirm = window.confirm(`Bạn có chắc muốn XÓA tài khoản "${name}"? Hành động này không thể hoàn tác!`);
    if (!confirm) return;

    const data = await apiCall(`/api/users/${userId}`, 'DELETE');
    if (data.success) {
        showToast('Xóa tài khoản thành công!');
        await loadAccounts();
    } else {
        showToast(data.error, 'error');
    }
}
