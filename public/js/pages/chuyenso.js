// ========== HỆ THỐNG CHUYỂN SỐ ==========
const ROLE_LABELS_CSO = { giam_doc: 'Giám Đốc', quan_ly_cap_cao: 'Quản Lý Cấp Cao', quan_ly: 'Quản Lý', truong_phong: 'Trưởng Phòng', nhan_vien: 'Nhân Viên', part_time: 'Part Time', hoa_hong: 'Hoa Hồng', tkaffiliate: 'TK Affiliate' };

async function renderChuyenSoPage(container) {
    // Load dropdowns + departments + allowed depts config
    const [sourcesAll, sourcesCSO, promotions, industries, users, deptData, configData] = await Promise.all([
        apiCall('/api/settings/sources'),
        apiCall('/api/settings/sources-chuyenso'),
        apiCall('/api/settings/promotions'),
        apiCall('/api/settings/industries'),
        apiCall('/api/users/dropdown'),
        apiCall('/api/departments'),
        apiCall('/api/app-config/chuyenso_allowed_depts')
    ]);
    const sources = { items: sourcesAll.items || [], chuyensoItems: sourcesCSO.items || [] };

    const allDepts = deptData.departments || [];
    const allowedDeptIds = configData.value ? JSON.parse(configData.value) : null; // null = all allowed

    // Build dept lookup helpers
    function getDeptName(deptId) {
        const d = allDepts.find(x => x.id === deptId);
        return d ? d.name : '';
    }
    function getParentCode(deptId) {
        const d = allDepts.find(x => x.id === deptId);
        if (!d || !d.parent_id) return '';
        const parent = allDepts.find(x => x.id === d.parent_id);
        return parent ? parent.code : '';
    }
    function getRootDeptId(deptId) {
        let d = allDepts.find(x => x.id === deptId);
        while (d && d.parent_id) {
            d = allDepts.find(x => x.id === d.parent_id);
        }
        return d ? d.id : deptId;
    }
    function getAllChildDeptIds(parentId) {
        let ids = [parentId];
        allDepts.filter(d => d.parent_id === parentId).forEach(child => {
            ids.push(...getAllChildDeptIds(child.id));
        });
        return ids;
    }

    // Filter users: GĐ always visible, others only if their dept (or root dept) is in allowed list
    const allUsers = (users.users || []).filter(u =>
        ['giam_doc', 'quan_ly', 'truong_phong', 'nhan_vien', 'quan_ly_cap_cao'].includes(u.role)
    );

    let receiverUsers = allUsers;

    // NV and TP can only assign to themselves
    if (['nhan_vien', 'truong_phong'].includes(currentUser.role)) {
        receiverUsers = allUsers.filter(u => u.id === currentUser.id);
    } else if (currentUser.role === 'tkaffiliate') {
        // Affiliate: auto-assign to their manager
        receiverUsers = allUsers.filter(u => u.id === currentUser.managed_by_user_id);
    } else if (allowedDeptIds && allowedDeptIds.length > 0) {
        // Get all dept IDs including children of allowed root depts
        let visibleDeptIds = [];
        allowedDeptIds.forEach(id => visibleDeptIds.push(...getAllChildDeptIds(id)));

        receiverUsers = allUsers.filter(u => {
            if (u.role === 'giam_doc') return currentUser.role === 'giam_doc'; // GĐ only visible to GĐ
            if (!u.department_id) return false; // unassigned users hidden when filter active
            return visibleDeptIds.includes(u.department_id);
        });
    }

    // Build affiliate users list (all affiliate-type roles)
    const affiliateRoles = ['hoa_hong', 'ctv', 'tkaffiliate'];
    const allAffiliateUsers = (users.users || []).filter(u => affiliateRoles.includes(u.role));
    const affiliateCrmMap = {};
    allAffiliateUsers.forEach(u => { affiliateCrmMap[u.id] = u.source_crm_type || ''; });

    // Filter affiliates by receiver (managed_by_user_id)
    function getAffiliatesForReceiver(receiverId) {
        if (!receiverId) return [];
        const receiver = (users.users || []).find(u => u.id == receiverId);
        // GĐ sees all affiliates
        if (receiver && receiver.role === 'giam_doc') return allAffiliateUsers;
        // Others see only affiliates they manage
        return allAffiliateUsers.filter(u => String(u.managed_by_user_id) === String(receiverId));
    }

    function updateAffiliateDropdown(receiverId) {
        const sel = document.getElementById('csoAffiliate');
        if (!sel) return;
        const filtered = getAffiliatesForReceiver(receiverId);
        sel.innerHTML = '<option value="">-- Chọn TK Affiliate --</option>' +
            filtered.map(u => `<option value="${u.id}" data-crm="${u.source_crm_type || ''}">${u.full_name} (${ROLE_LABELS_CSO[u.role] || u.role})</option>`).join('');
        document.getElementById('csoAffiliateCrm').value = '';
    }
    const CRM_TYPE_LABELS = { nhu_cau: 'Chăm Sóc KH Nhu Cầu', ctv: 'Chăm Sóc CTV', ctv_hoa_hong: 'Chăm Sóc Affiliate', koc_tiktok: 'Chăm Sóc KOL/KOC Tiktok' };

    // Build display label for each user
    function userLabel(u) {
        let label = `${u.full_name} (${ROLE_LABELS_CSO[u.role] || u.role})`;
        if (u.department_id) {
            const deptName = getDeptName(u.department_id);
            const parentCode = getParentCode(u.department_id);
            if (deptName) {
                label += ` — ${deptName}`;
                if (parentCode) label += ` - ${parentCode.toUpperCase()}`;
            }
        }
        return label;
    }

    // Settings button (only GĐ)
    const isGD = currentUser.role === 'giam_doc';
    const isAffiliate = currentUser.role === 'tkaffiliate';
    const settingsBtn = isGD
        ? `<button onclick="csoOpenSettings()" class="btn" style="background:#f3f4f6;color:#374151;border:1px solid #d1d5db;padding:6px 12px;font-size:13px;border-radius:8px;" title="Cài đặt đơn vị nhận số">⚙️ Cài đặt</button>`
        : '';

    container.innerHTML = `
        <div class="card" style="margin-bottom:16px;border:2px solid #6366f1;">
            <div class="card-header" style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:14px 20px;">
                <h3 style="color:#fff;margin:0;font-size:15px;">🔍 Tìm Kiếm Nhanh — Tên / SĐT / Link Khách Hàng</h3>
            </div>
            <div class="card-body" style="padding:16px 20px;">
                <div style="display:flex;gap:10px;align-items:center;">
                    <input type="text" id="csoSmartSearch" class="form-control" placeholder="Nhập Tên KH, SĐT hoặc Link để tìm công việc..." style="flex:1;font-size:14px;border:2px solid #c7d2fe;border-radius:10px;padding:10px 14px;">
                    <button type="button" id="csoSearchBtn" class="btn" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:10px;white-space:nowrap;font-weight:600;" onclick="_csoDoSearch()">🔍 Tìm</button>
                </div>
                <small style="color:#6b7280;font-size:11px;margin-top:4px;display:block;">Tìm nhanh theo Tên KH, SĐT hoặc Link xem đã nằm trong công việc nào → chọn để auto-fill</small>
                <div id="csoSearchResults" style="margin-top:10px;display:none;"></div>
            </div>
        </div>
        <div class="card">
            <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;">
                <h3>📱 Chuyển Số Khách Hàng</h3>
                ${settingsBtn}
            </div>
            <div class="card-body">
                <form id="chuyenSoForm" style="max-width: 700px;">
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label>CRM <span style="color:var(--danger)">*</span></label>
                            ${isAffiliate ? `
                                <select id="csoCrm" class="form-control" style="font-weight:700;color:#122546;">
                                    <option value="nhu_cau" selected>Chăm Sóc KH Nhu Cầu</option>
                                    <option value="ctv_hoa_hong">Chăm Sóc Affiliate</option>
                                </select>
                            ` : `
                            <select id="csoCrm" class="form-control" required>
                                <option value="">-- Chọn CRM --</option>
                                <option value="nhu_cau">Chăm Sóc KH Nhu Cầu</option>
                                <option value="ctv_hoa_hong">Chăm Sóc Affiliate</option>
                            </select>
                            `}
                        </div>
                        <div class="form-group">
                            <label>Nguồn Khách NV Kinh Doanh <span style="color:var(--danger)">*</span></label>
                            ${isAffiliate ? `
                                <input type="text" id="csoSourceDisplay" class="form-control" value="AFFILIATE GIỚI THIỆU KHÁCH" disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;">
                                <input type="hidden" id="csoSourceAffiliate" value="">
                            ` : `
                            <select id="csoSource" class="form-control" required>
                                <option value="">-- Chọn nguồn --</option>
                                ${(() => {
                                    const csoSources = sources.chuyensoItems || [];
                                    return csoSources.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
                                })()}
                            </select>
                            `}
                        </div>
                    </div>
                    <div id="csoJobTitleRow" style="display:none; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label>Lĩnh Vực <span style="color:var(--danger)">*</span></label>
                            <select id="csoJobTitle" class="form-control">
                                <option value="">-- Chọn Lĩnh Vực --</option>
                            </select>
                        </div>
                        <div></div>
                    </div>
                    <div id="csoAffiliateRow" style="display:none; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label>Tài Khoản Affiliate HV</label>
                            <select id="csoAffiliate" class="form-control">
                                <option value="">-- Chọn TK Affiliate --</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>CRM TK Affiliate HV</label>
                            <input type="text" id="csoAffiliateCrm" class="form-control" disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;" placeholder="Tự động theo TK Affiliate">
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label>Tên Khách Hàng <span style="color:var(--danger)">*</span></label>
                            <input type="text" id="csoName" class="form-control" placeholder="Nhập tên khách hàng" required>
                        </div>
                        <div class="form-group">
                            <label>Số Điện Thoại <span id="csoPhoneStar" style="color:var(--danger)">*</span></label>
                            <input type="text" id="csoPhone" class="form-control" placeholder="Nhập SĐT" oninput="_csoToggleRequired()">
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label>🔗 Link Khách Hàng <span id="csoFbStar" style="color:var(--danger)">*</span></label>
                            <input type="text" id="csoFacebook" class="form-control" placeholder="https://facebook.com, instagram.com, tiktok.com..." oninput="_csoToggleRequired()">
                            <small id="csoFbHint" style="color:#6b7280;font-size:10px;">Nhập SĐT hoặc Link MXH (ít nhất 1)</small>
                        </div>
                        <div></div>
                    </div>
                    ${!isAffiliate ? `
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label>Khuyến Mãi</label>
                            <select id="csoPromotion" class="form-control">
                                <option value="">-- Chọn khuyến mãi --</option>
                                ${(promotions.items || []).map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Sản Phẩm</label>
                            <select id="csoIndustry" class="form-control">
                                <option value="">-- Chọn sản phẩm --</option>
                                ${(industries.items || []).map(i => `<option value="${i.id}">${i.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label>Lĩnh Vực</label>
                            <input type="text" id="csoLinhVuc" class="form-control" value="Mặc Định" disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;">
                        </div>
                        <div class="form-group">
                            <label>Công Việc</label>
                            <input type="text" id="csoCongViecDisplay" class="form-control" value="Mặc Định" disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;">
                            <input type="hidden" id="csoCongViec" value="Mặc Định">
                        </div>
                    </div>
                    ` : ''}
                    <div class="form-group">
                        <label>Người Nhận Số <span style="color:var(--danger)">*</span></label>
                        ${['nhan_vien', 'truong_phong'].includes(currentUser.role) || isAffiliate ? `
                            <input type="text" class="form-control" value="${userLabel(receiverUsers[0] || {full_name: 'NV quản lý', role: '', department_id: null})}" disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;">
                            <input type="hidden" id="csoReceiver" value="${receiverUsers[0]?.id || currentUser.managed_by_user_id || ''}">
                        ` : `
                            <select id="csoReceiver" class="form-control" required>
                                <option value="">-- Chọn người nhận --</option>
                                ${receiverUsers.map(u => `<option value="${u.id}" ${u.id === currentUser.id ? 'selected' : ''}>${userLabel(u)}</option>`).join('')}
                            </select>
                        `}
                    </div>
                    <div class="form-group">
                        <label>Ghi chú</label>
                        <textarea id="csoNotes" class="form-control" rows="3" placeholder="Ghi chú thêm..."></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: auto; padding: 12px 40px; font-size: 16px;">
                        📱 CHUYỂN SỐ
                    </button>
                </form>
            </div>
        </div>
    `;

    // Also add click handler for debugging
    const submitBtn = document.querySelector('#chuyenSoForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.addEventListener('click', (e) => {
            console.log('[CSO] Button clicked!');
            const form = document.getElementById('chuyenSoForm');
            if (form && !form.checkValidity()) {
                console.log('[CSO] Form invalid! Reporting validity...');
                form.reportValidity();
            }
        });
    }

    document.getElementById('chuyenSoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('[CSO] Form submit fired!');
        const body = {
            crm_type: document.getElementById('csoCrm').value,
            customer_name: document.getElementById('csoName').value,
            phone: document.getElementById('csoPhone').value,
            source_id: document.getElementById('csoSourceAffiliate')?.value || document.getElementById('csoSource')?.value || null,
            promotion_id: document.getElementById('csoPromotion')?.value || null,
            industry_id: document.getElementById('csoIndustry')?.value || null,
            receiver_id: document.getElementById('csoReceiver').value,
            notes: document.getElementById('csoNotes').value,
            affiliate_user_id: document.getElementById('csoAffiliate')?.value || null,
            job: document.getElementById('csoJobTitle')?.value || document.getElementById('csoLinhVuc')?.value || null,
            facebook_link: document.getElementById('csoFacebook')?.value?.trim() || null,
            cong_viec: document.getElementById('csoCongViec')?.value || 'Mặc Định'
        };
        console.log('[CSO] Body:', JSON.stringify(body));

        if (!body.crm_type || !body.receiver_id) {
            console.log('[CSO] Validation failed!', { crm: body.crm_type, receiver: body.receiver_id });
            showToast('Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
            return;
        }
        if (!body.customer_name || !body.customer_name.trim()) {
            showToast('Vui lòng nhập Tên Khách Hàng', 'error');
            return;
        }
        if (!body.phone && !body.facebook_link) {
            showToast('Vui lòng nhập Số Điện Thoại hoặc Link Khách Hàng', 'error');
            return;
        }

        try {
            const data = await apiCall('/api/customers', 'POST', body);
            if (data.success) {
                showToast(`✅ Chuyển số thành công! Mã: ${data.dailyNum}`);
                e.target.reset();
                // Hide affiliate row after reset
                document.getElementById('csoAffiliateRow').style.display = 'none';
                document.getElementById('csoAffiliateCrm').value = '';
                document.getElementById('csoJobTitleRow').style.display = 'none';
                document.getElementById('csoJobTitle').innerHTML = '<option value="">-- Chọn Lĩnh Vực --</option>';
                if (document.getElementById('csoFacebook')) document.getElementById('csoFacebook').value = '';
                // Reset Công Việc back to default
                const cvd = document.getElementById('csoCongViecDisplay');
                if (cvd) { cvd.value = 'Mặc Định'; cvd.style.color = '#122546'; cvd.style.background = '#f1f5f9'; cvd.style.borderColor = ''; }
                const cvh = document.getElementById('csoCongViec'); if (cvh) cvh.value = 'Mặc Định';
                // Reset Lĩnh Vực back to default
                const lv = document.getElementById('csoLinhVuc');
                if (lv) { lv.value = 'Mặc Định'; lv.style.color = '#122546'; lv.style.background = '#f1f5f9'; lv.style.borderColor = ''; }
                // Clear smart search
                const ss = document.getElementById('csoSmartSearch'); if (ss) ss.value = '';
                const sr = document.getElementById('csoSearchResults'); if (sr) { sr.style.display = 'none'; sr.innerHTML = ''; }
            } else {
                showToast(data.error, 'error');
            }
        } catch (err) {
            showToast('Lỗi kết nối', 'error');
        }
    });

    // Toggle affiliate row visibility based on CRM selection
    const csoCrmEl = document.getElementById('csoCrm');
    if (csoCrmEl && csoCrmEl.tagName === 'SELECT') {
        csoCrmEl.addEventListener('change', async function() {
            const row = document.getElementById('csoAffiliateRow');
            const jobRow = document.getElementById('csoJobTitleRow');
            const jobSel = document.getElementById('csoJobTitle');
            if (isGD) {
                row.style.display = 'grid';
            } else {
                row.style.display = 'none';
                document.getElementById('csoAffiliate').value = '';
                document.getElementById('csoAffiliateCrm').value = '';
            }
            // Load job titles for selected CRM
            const crmTypesWithJobs = [];
            if (crmTypesWithJobs.includes(this.value)) {
                const data = await apiCall(`/api/telesale/sources?crm_type=${this.value}`);
                jobSel.innerHTML = '<option value="">-- Chọn Lĩnh Vực --</option>' +
                    (data.sources || []).map(j => `<option value="${j.name}">${j.name}</option>`).join('');
                jobRow.style.display = 'grid';
            } else {
                jobRow.style.display = 'none';
                jobSel.innerHTML = '<option value="">-- Chọn Lĩnh Vực --</option>';
            }
        });
    }

    // Auto-fill CRM TK when affiliate is selected
    document.getElementById('csoAffiliate').addEventListener('change', function() {
        const crmInput = document.getElementById('csoAffiliateCrm');
        const crmType = affiliateCrmMap[this.value] || '';
        crmInput.value = CRM_TYPE_LABELS[crmType] || crmType || '';
    });

    // Update affiliate dropdown when receiver changes
    const csoReceiverEl = document.getElementById('csoReceiver');
    if (csoReceiverEl && csoReceiverEl.tagName === 'SELECT') {
        csoReceiverEl.addEventListener('change', function() {
            updateAffiliateDropdown(this.value);
        });
        // Init with current selected receiver
        updateAffiliateDropdown(csoReceiverEl.value);
    } else if (csoReceiverEl) {
        // Hidden input (NV/TP/Affiliate) → init with that value
        updateAffiliateDropdown(csoReceiverEl.value);
    }

    // ========== AFFILIATE: Auto-sync CRM → Nguồn Khách ==========
    if (isAffiliate) {
        const allSrc = sources.items || [];
        const AFF_SOURCE_MAP = {
            'nhu_cau': 'AFFILIATE GIỚI THIỆU KHÁCH',
            'ctv_hoa_hong': 'AFFILIATE GIỚI THIỆU AFFILIATE'
        };
        function _affSyncSource() {
            const crmVal = document.getElementById('csoCrm').value;
            const sourceName = AFF_SOURCE_MAP[crmVal] || '';
            const sourceDisplay = document.getElementById('csoSourceDisplay');
            const sourceHidden = document.getElementById('csoSourceAffiliate');
            if (sourceDisplay) sourceDisplay.value = sourceName;
            // Find source_id by name
            const found = allSrc.find(s => s.name.toUpperCase() === sourceName.toUpperCase());
            if (sourceHidden) sourceHidden.value = found ? found.id : '';
            // Always hide Affiliate HV row for affiliate users (they ARE the affiliate)
            const affRow = document.getElementById('csoAffiliateRow');
            if (affRow) affRow.style.display = 'none';
        }
        // Init on load
        _affSyncSource();
        // Listen for CRM change
        document.getElementById('csoCrm').addEventListener('change', _affSyncSource);
    }

    // ========== SMART SEARCH LOGIC ==========
    const searchInput = document.getElementById('csoSmartSearch');
    if (searchInput) {
        let _csoSearchTimer = null;
        searchInput.addEventListener('input', () => {
            clearTimeout(_csoSearchTimer);
            _csoSearchTimer = setTimeout(() => _csoDoSearch(), 500);
        });
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); _csoDoSearch(); }
        });
    }
}

// Settings modal — GĐ only
async function csoOpenSettings() {
    const [deptData, configData] = await Promise.all([
        apiCall('/api/departments'),
        apiCall('/api/app-config/chuyenso_allowed_depts')
    ]);

    const allDepts = deptData.departments || [];
    const rootDepts = allDepts.filter(d => !d.parent_id);
    const allowedIds = configData.value ? JSON.parse(configData.value) : [];

    let checkboxes = rootDepts.map(d => {
        const checked = allowedIds.includes(d.id) ? 'checked' : '';
        return `<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;cursor:pointer;background:${checked ? '#eef2ff' : '#f9fafb'};border:1px solid ${checked ? '#6366f1' : '#e5e7eb'};">
            <input type="checkbox" class="cso-dept-cb" value="${d.id}" ${checked} style="width:18px;height:18px;">
            <span style="font-weight:600;color:#122546;">🏢 ${d.name}</span>
            <span style="font-size:11px;color:#6b7280;">(${d.code})</span>
        </label>`;
    }).join('');

    const overlay = document.createElement('div');
    overlay.id = 'csoSettingsOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:white;border-radius:12px;padding:24px;width:480px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3 style="margin:0;color:#122546;">⚙️ Cài đặt đơn vị nhận số</h3>
                <span onclick="document.getElementById('csoSettingsOverlay').remove()" style="cursor:pointer;font-size:20px;color:#6b7280;">✕</span>
            </div>
            <p style="font-size:13px;color:#6b7280;margin-bottom:12px;">Chọn đơn vị được hiển thị trong dropdown "Người Nhận Số". Nếu không chọn đơn vị nào, tất cả nhân viên sẽ được hiển thị.</p>
            <div style="display:flex;flex-direction:column;gap:8px;max-height:400px;overflow-y:auto;">
                ${checkboxes}
            </div>
            <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
                <button onclick="document.getElementById('csoSettingsOverlay').remove()" class="btn" style="background:#f3f4f6;color:#374151;border:1px solid #d1d5db;">Hủy</button>
                <button onclick="csoSaveSettings()" class="btn btn-primary" style="width:auto;">💾 Lưu</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function csoSaveSettings() {
    const checked = [...document.querySelectorAll('.cso-dept-cb:checked')].map(cb => Number(cb.value));
    try {
        await apiCall('/api/app-config/chuyenso_allowed_depts', 'PUT', { value: JSON.stringify(checked) });
        showToast('✅ Đã lưu cài đặt đơn vị nhận số');
        document.getElementById('csoSettingsOverlay')?.remove();
        // Reload page to apply filter
        const container = document.getElementById('mainContent');
        if (container) renderChuyenSoPage(container);
    } catch (err) {
        showToast('Lỗi lưu cài đặt', 'error');
    }
}

// Toggle required stars: if phone filled -> fb not required, if fb filled -> phone not required
function _csoToggleRequired() {
    const phone = document.getElementById('csoPhone')?.value?.trim();
    const fb = document.getElementById('csoFacebook')?.value?.trim();
    const phoneStar = document.getElementById('csoPhoneStar');
    const fbStar = document.getElementById('csoFbStar');
    if (phoneStar) phoneStar.style.display = fb ? 'none' : '';
    if (fbStar) fbStar.style.display = phone ? 'none' : '';
}

// ========== SMART SEARCH — Tìm SĐT/Link qua tất cả công việc ==========
async function _csoDoSearch() {
    const q = document.getElementById('csoSmartSearch')?.value?.trim();
    const box = document.getElementById('csoSearchResults');
    if (!box) return;
    if (!q || q.length < 3) { box.style.display = 'none'; box.innerHTML = ''; return; }

    box.style.display = 'block';
    box.innerHTML = '<div style="text-align:center;padding:12px;color:#6b7280;"><span class="spinner" style="display:inline-block;width:18px;height:18px;border:2px solid #c7d2fe;border-top-color:#6366f1;border-radius:50%;animation:spin 0.6s linear infinite;"></span> Đang tìm kiếm...</div>';

    try {
        const data = await apiCall(`/api/customers/search-modules?q=${encodeURIComponent(q)}`);
        const results = data.results || [];

        if (results.length === 0) {
            box.innerHTML = `<div style="padding:12px 16px;background:#fef2f2;border-radius:8px;color:#991b1b;font-size:13px;">❌ Không tìm thấy kết quả nào cho "<b>${q}</b>"</div>`;
            return;
        }

        // Group by module_label
        const groups = {};
        results.forEach(r => {
            if (!groups[r.module_label]) groups[r.module_label] = [];
            groups[r.module_label].push(r);
        });

        let html = `<div style="padding:8px 12px;background:#eef2ff;border-radius:8px 8px 0 0;font-size:13px;font-weight:600;color:#4338ca;">✅ Tìm thấy ${results.length} kết quả trong ${Object.keys(groups).length} công việc — Bấm chọn để auto-fill</div>`;
        html += '<div style="max-height:300px;overflow-y:auto;border:1px solid #e0e7ff;border-radius:0 0 8px 8px;">';

        for (const [label, items] of Object.entries(groups)) {
            html += `<div style="padding:6px 12px;background:#f5f3ff;font-weight:700;font-size:12px;color:#6d28d9;border-top:1px solid #e0e7ff;">${label} (${items.length})</div>`;
            for (const r of items) {
                const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : '';
                const nameStr = r.customer_name ? `<b>${r.customer_name}</b>` : '<i style="color:#9ca3af">Không tên</i>';
                const phoneStr = r.phone ? `📞 ${r.phone}` : '';
                const linkStr = r.link ? `🔗 ${r.link.length > 50 ? r.link.substring(0, 50) + '...' : r.link}` : '';
                const assignStr = r.assigned_to ? `👤 ${r.assigned_to}` : '';
                html += `<div class="cso-search-row" data-result='${JSON.stringify(r).replace(/'/g, '&#39;')}'
                    style="padding:10px 12px;cursor:pointer;border-top:1px solid #f0f0f0;display:flex;flex-direction:column;gap:2px;transition:background 0.15s;"
                    onmouseenter="this.style.background='#eef2ff'" onmouseleave="this.style.background=''"
                    onclick="_csoSelectResult(this)">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:13px;">${nameStr}</span>
                        <span style="font-size:11px;color:#9ca3af;">${dateStr}</span>
                    </div>
                    <div style="font-size:11px;color:#6b7280;display:flex;gap:12px;flex-wrap:wrap;">
                        ${phoneStr ? `<span>${phoneStr}</span>` : ''}
                        ${linkStr ? `<span>${linkStr}</span>` : ''}
                        ${assignStr ? `<span>${assignStr}</span>` : ''}
                        ${r.source_name ? `<span>📂 ${r.source_name}</span>` : ''}
                    </div>
                </div>`;
            }
        }
        html += '</div>';
        box.innerHTML = html;
    } catch(err) {
        box.innerHTML = `<div style="padding:12px;color:#991b1b;font-size:13px;">❌ Lỗi tìm kiếm: ${err.message}</div>`;
    }
}

function _csoSelectResult(el) {
    try {
        const r = JSON.parse(el.dataset.result);
        // Auto-fill form fields
        if (r.customer_name) { const n = document.getElementById('csoName'); if (n) n.value = r.customer_name; }
        if (r.phone) { const p = document.getElementById('csoPhone'); if (p) p.value = r.phone; }
        if (r.link) { const f = document.getElementById('csoFacebook'); if (f) f.value = r.link; }
        // Update Công Việc
        if (r.cong_viec) {
            const cv = document.getElementById('csoCongViec');
            const cvd = document.getElementById('csoCongViecDisplay');
            if (cv) cv.value = r.cong_viec;
            if (cvd) { cvd.value = r.cong_viec; cvd.style.color = '#6d28d9'; cvd.style.background = '#f5f3ff'; cvd.style.borderColor = '#c4b5fd'; }
        }
        // Update Lĩnh Vực from source_name (e.g. "Quà Tặng" from partner_outreach category)
        if (r.source_name) {
            const lv = document.getElementById('csoLinhVuc');
            if (lv) { lv.value = r.source_name; lv.style.color = '#6d28d9'; lv.style.background = '#f5f3ff'; lv.style.borderColor = '#c4b5fd'; }
        }
        // Toggle required stars
        _csoToggleRequired();
        // Show success toast
        if (typeof showToast === 'function') showToast(`✅ Đã chọn: ${r.module_label} — ${r.customer_name || r.link || r.phone}`);
        // Collapse search results
        const lvLabel = r.source_name ? `, Lĩnh Vực: <b>${r.source_name}</b>` : '';
        const box = document.getElementById('csoSearchResults');
        if (box) box.innerHTML = `<div style="padding:8px 12px;background:#ecfdf5;border-radius:8px;font-size:13px;color:#065f46;">✅ Đã auto-fill từ <b>${r.module_label}</b> → Công Việc: <b>${r.cong_viec}</b>${lvLabel}. Kiểm tra và bấm CHUYỂN SỐ.</div>`;
        // Scroll to form
        document.getElementById('chuyenSoForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch(e) { console.error('[CSO] Select result error:', e); }
}
