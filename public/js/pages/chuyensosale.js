// ========== HỆ THỐNG CHUYỂN SỐ SALE ==========
const ROLE_LABELS_CSO_SALE = { giam_doc: 'Giám Đốc', quan_ly_cap_cao: 'Quản Lý Cấp Cao', quan_ly: 'Quản Lý', truong_phong: 'Trưởng Phòng', nhan_vien: 'Nhân Viên', thu_viec: 'Thử Việc', part_time: 'Part Time', hoa_hong: 'Hoa Hồng', tkaffiliate: 'TK Affiliate' };

async function renderChuyensosalePage(container) {
    // Load dropdowns + departments + allowed depts config
    const [sourcesAll, sourcesCSO, promotions, industries, users, deptData, configData, pancakeSettingsData] = await Promise.all([
        apiCall('/api/settings/sources?crm_type=sale'),
        apiCall('/api/settings/sources-chuyensale'),
        apiCall('/api/settings/promotions'),
        apiCall('/api/settings/industries'),
        apiCall('/api/users/dropdown'),
        apiCall('/api/departments'),
        apiCall('/api/app-config/chuyensosale_allowed_depts'),
        apiCall('/api/app-config/pancake_settings')
    ]);
    const sources = { items: sourcesAll.items || [], chuyensoItems: sourcesCSO.items || [] };
    const pancakeConfig = pancakeSettingsData && pancakeSettingsData.value ? JSON.parse(pancakeSettingsData.value) : {};

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

    // Filter users: only staff roles in PHÒNG SALE tree (id = 4)
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
    } else {
        // ★ Default: only show users in PHÒNG SALE tree (id=4 + child teams)
        const saleDeptIds = getAllChildDeptIds(4); // PHÒNG SALE = id 4
        // If allowedDeptIds config is set, intersect with it; otherwise use Sale tree
        let visibleDeptIds = saleDeptIds;
        if (allowedDeptIds && allowedDeptIds.length > 0) {
            let configDeptIds = [];
            allowedDeptIds.forEach(id => configDeptIds.push(...getAllChildDeptIds(id)));
            visibleDeptIds = saleDeptIds.filter(id => configDeptIds.includes(id));
        }

        receiverUsers = allUsers.filter(u => {
            if (u.role === 'giam_doc') return currentUser.role === 'giam_doc'; // GĐ only visible to GĐ
            if (!u.department_id) return false;
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
        const sel = document.getElementById('csoSaleAffiliate');
        if (!sel) return;
        const filtered = getAffiliatesForReceiver(receiverId);
        sel.innerHTML = '<option value="">-- Chọn TK Affiliate --</option>' +
            filtered.map(u => `<option value="${u.id}" data-crm="${u.source_crm_type || ''}">${u.full_name} (${ROLE_LABELS_CSO_SALE[u.role] || u.role})</option>`).join('');
        document.getElementById('csoSaleAffiliateCrm').value = '';
    }

    const CRM_TYPE_LABELS_SALE = { sale: 'Chăm Sóc Khách Sale' };

    // Build display label for each user
    function userLabel(u) {
        let label = `${u.full_name} (${ROLE_LABELS_CSO_SALE[u.role] || u.role})`;
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
    const isExecutive = ['giam_doc', 'quan_ly_cap_cao'].includes(currentUser.role);
    const isAffiliate = currentUser.role === 'tkaffiliate';
    const settingsBtn = isGD
        ? `<button onclick="csoSaleOpenSettings()" class="btn" style="background:#f3f4f6;color:#374151;border:1px solid #d1d5db;padding:6px 12px;font-size:13px;border-radius:8px;" title="Cài đặt đơn vị nhận số">⚙️ Cài đặt</button>`
        : '';

    // Determine active receiving users for today (Vietnam Timezone)
    const vnTimeStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
    const vnNow = new Date(vnTimeStr);
    const dayOfWeek = vnNow.getDay(); // 0 = CN, 1 = T2, ..., 6 = T7

    const y = vnNow.getFullYear();
    const m = String(vnNow.getMonth() + 1).padStart(2, '0');
    const day = String(vnNow.getDate()).padStart(2, '0');
    const vnDateStr = `${y}-${m}-${day}`;

    const workingUsers = [];
    const careUsers = [];

    receiverUsers.forEach(u => {
        let isWorkingToday = false;
        if (dayOfWeek === 0) {
            const schedule = pancakeConfig.sunday_duty_schedule || {};
            const assignedUsers = schedule[vnDateStr] || [];
            isWorkingToday = assignedUsers.includes(Number(u.id)) || assignedUsers.includes(String(u.id));
        } else {
            const globalWorkingDays = pancakeConfig.global_working_days || {};
            let workingDays = [1, 2, 3, 4, 5, 6]; // default Mon-Sat
            if (globalWorkingDays[u.id] !== undefined) {
                workingDays = globalWorkingDays[u.id].map(Number).filter(d => d !== 0);
            }
            isWorkingToday = workingDays.includes(dayOfWeek);
        }

        if (isWorkingToday) {
            workingUsers.push(u);
        } else {
            careUsers.push(u);
        }
    });

    const workingOptions = workingUsers.map(u => {
        return `<option value="${u.id}" class="cso-receiver-receiving" ${u.id === currentUser.id ? 'selected' : ''}>🟢 ${userLabel(u)}</option>`;
    }).join('');

    const careOptions = careUsers.map(u => {
        return `<option value="${u.id}" class="cso-receiver-followup" ${u.id === currentUser.id ? 'selected' : ''}>⚪ ${userLabel(u)} (Chăm lại)</option>`;
    }).join('');

    container.innerHTML = `
        <style>
            .cso-receiver-receiving {
                color: #047857 !important;
                font-weight: 800 !important;
                background-color: #f0fdf4 !important;
            }
            .cso-receiver-followup {
                color: #9ca3af !important;
                opacity: 0.7;
                font-style: italic;
            }
        </style>
        <div class="card" style="margin-bottom:16px;border:2px solid #6366f1;display:none;">
            <div class="card-header" style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:14px 20px;">
                <h3 style="color:#fff;margin:0;font-size:15px;">🔍 Tìm Kiếm Nhanh — Tên / SĐT / Link Khách Hàng</h3>
            </div>
            <div class="card-body" style="padding:16px 20px;">
                <div style="display:flex;gap:10px;align-items:center;">
                    <input type="text" id="csoSaleSmartSearch" class="form-control" placeholder="Nhập Tên KH, SĐT hoặc Link để tìm công việc..." style="flex:1;font-size:14px;border:2px solid #c7d2fe;border-radius:10px;padding:10px 14px;" autocomplete="one-time-code">
                    <button type="button" id="csoSaleSearchBtn" class="btn" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:10px;white-space:nowrap;font-weight:600;" onclick="_csoSaleDoSearch()">🔍 Tìm</button>
                </div>
                <small style="color:#6b7280;font-size:11px;margin-top:4px;display:block;">Tìm nhanh theo Tên KH, SĐT hoặc Link xem đã nằm trong công việc nào → chọn để auto-fill</small>
                <div id="csoSaleSearchResults" style="margin-top:10px;display:none;"></div>
            </div>
        </div>
        <div class="card">
            <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;">
                <h3>📱 Chuyển Số Khách Hàng (Sale)</h3>
                ${settingsBtn}
            </div>
            <div class="card-body">
                <form id="chuyensosaleForm" style="max-width: 700px;" autocomplete="off">
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label>CRM <span style="color:var(--danger)">*</span></label>
                            <select id="csoSaleCrm" class="form-control" required>
                                <option value="sale" selected>Chăm Sóc Khách Sale</option>
                            </select>
                        </div>
                        ${isAffiliate ? `
                        <div class="form-group">
                            <label>💎 Chiết Khấu Hoa Hồng</label>
                            <div id="csoSaleCommRate" style="padding:10px 14px;border-radius:8px;font-weight:800;font-size:16px;color:#059669;background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:2px solid #6ee7b7;text-align:center;cursor:not-allowed;">
                                10% Hoa Hồng
                            </div>
                            <small style="color:#6b7280;font-size:10px;margin-top:4px;display:block;">Tỷ lệ chiết khấu tự động theo CRM</small>
                        </div>
                        ` : `
                        <div class="form-group">
                            <label>Nguồn Khách Sale <span style="color:var(--danger)">*</span></label>
                            <select id="csoSaleSource" class="form-control" required>
                                <option value="">-- Chọn nguồn --</option>
                                ${(() => {
                                    const csoSources = sources.chuyensoItems || [];
                                    return csoSources.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
                                })()}
                            </select>
                        </div>
                        `}
                    </div>
                    ${isAffiliate ? `
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label>Nguồn Khách Sale <span style="color:var(--danger)">*</span></label>
                            <input type="text" id="csoSaleSourceDisplay" class="form-control" value="AFFILIATE GIỚI THIỆU KHÁCH" disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;">
                            <input type="hidden" id="csoSaleSourceAffiliate" value="">
                        </div>
                        <div></div>
                    </div>
                    ` : ''}
                    <div id="csoSaleJobTitleRow" style="display:none; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label>Lĩnh Vực <span style="color:var(--danger)">*</span></label>
                            <select id="csoSaleJobTitle" class="form-control">
                                <option value="">-- Chọn Lĩnh Vực --</option>
                            </select>
                        </div>
                        <div></div>
                    </div>
                    <div id="csoSaleAffiliateRow" style="display:none; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label>Tài Khoản Affiliate HV</label>
                            <select id="csoSaleAffiliate" class="form-control">
                                <option value="">-- Chọn TK Affiliate --</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>CRM TK Affiliate HV</label>
                            <input type="text" id="csoSaleAffiliateCrm" class="form-control" disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;" placeholder="Tự động theo TK Affiliate">
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label>Tên Khách Hàng <span style="color:var(--danger)">*</span></label>
                            <input type="text" id="csoSaleName" class="form-control" placeholder="Nhập tên khách hàng" required autocomplete="one-time-code">
                        </div>
                        <div class="form-group">
                            <label>Số Điện Thoại <span id="csoSalePhoneStar" style="color:var(--danger)">*</span></label>
                            <input type="text" id="csoSalePhone" class="form-control" placeholder="Nhập SĐT" oninput="_csoSaleNormalizePhoneField(this); _csoSaleToggleRequired()" autocomplete="one-time-code">
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label>🔗 Link Khách Hàng <span id="csoSaleFbStar" style="color:var(--danger)">*</span></label>
                            <input type="text" id="csoSaleFacebook" class="form-control" placeholder="https://facebook.com, instagram.com, tiktok.com..." oninput="_csoSaleToggleRequired()" autocomplete="one-time-code">
                            <small id="csoSaleFbHint" style="color:#6b7280;font-size:10px;">Nhập SĐT hoặc Link MXH (ít nhất 1)</small>
                        </div>
                        <div></div>
                    </div>
                    ${!isAffiliate ? `
                    <div style="display:grid; grid-template-columns: ${isExecutive ? '1fr 1fr' : '1fr'}; gap: 16px;">
                        ${isExecutive ? `
                        <div class="form-group">
                            <label>Khuyến Mãi</label>
                            <select id="csoSalePromotion" class="form-control">
                                <option value="">-- Chọn khuyến mãi --</option>
                                ${(promotions.items || []).map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                            </select>
                        </div>
                        ` : ''}
                        <div class="form-group">
                            <label>Sản Phẩm</label>
                            <select id="csoSaleIndustry" class="form-control">
                                <option value="">-- Chọn sản phẩm --</option>
                                ${(industries.items || []).map(i => `<option value="${i.id}">${i.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label>Lĩnh Vực</label>
                            <input type="text" id="csoSaleLinhVuc" class="form-control" value="Mặc Định" disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;">
                        </div>
                        <div class="form-group">
                            <label>Công Việc</label>
                            <input type="text" id="csoSaleCongViecDisplay" class="form-control" value="Mặc Định" disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;">
                            <input type="hidden" id="csoSaleCongViec" value="Mặc Định">
                        </div>
                    </div>
                    ` : ''}
                    <div class="form-group">
                        <label>Người Nhận Số <span style="color:var(--danger)">*</span></label>
                        ${['nhan_vien', 'truong_phong'].includes(currentUser.role) || isAffiliate ? `
                            <input type="text" class="form-control" value="${userLabel(receiverUsers[0] || {full_name: 'NV quản lý', role: '', department_id: null})}" disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;">
                            <input type="hidden" id="csoSaleReceiver" value="${receiverUsers[0]?.id || currentUser.managed_by_user_id || ''}">
                        ` : `
                            <select id="csoSaleReceiver" class="form-control" required style="font-weight: 600;">
                                <option value="">-- Chọn người nhận --</option>
                                <optgroup label="🟢 NHÂN VIÊN NHẬN SỐ HÔM NAY (ƯU TIÊN)">
                                    ${workingOptions || '<option disabled>Không có nhân viên nhận số hôm nay</option>'}
                                </optgroup>
                                <optgroup label="⚪ CHĂM LẠI KHÁCH HÀNG (KHÔNG ƯU TIÊN)">
                                    ${careOptions}
                                </optgroup>
                            </select>
                        `}
                    </div>
                    <div class="form-group">
                        <label>Ghi chú</label>
                        <textarea id="csoSaleNotes" class="form-control" rows="3" placeholder="Ghi chú thêm..."></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: auto; padding: 12px 40px; font-size: 16px;">
                        📱 CHUYỂN SỐ
                    </button>
                </form>
            </div>
        </div>
    `;

    // Also add click handler for debugging
    const submitBtn = document.querySelector('#chuyensosaleForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.addEventListener('click', (e) => {
            console.log('[CSO-SALE] Button clicked!');
            const form = document.getElementById('chuyensosaleForm');
            if (form && !form.checkValidity()) {
                console.log('[CSO-SALE] Form invalid! Reporting validity...');
                form.reportValidity();
            }
        });
    }

    document.getElementById('chuyensosaleForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('[CSO-SALE] Form submit fired!');

        const phoneInput = document.getElementById('csoSalePhone');
        if (phoneInput && phoneInput.value) {
            _csoSaleNormalizePhoneField(phoneInput, true);
        }

        const body = {
            crm_type: document.getElementById('csoSaleCrm').value,
            customer_name: document.getElementById('csoSaleName').value,
            phone: phoneInput ? phoneInput.value.trim() : '',
            source_id: document.getElementById('csoSaleSourceAffiliate')?.value || document.getElementById('csoSaleSource')?.value || null,
            source_name: document.getElementById('csoSaleSourceDisplay')?.value || null,
            promotion_id: document.getElementById('csoSalePromotion')?.value || null,
            industry_id: document.getElementById('csoSaleIndustry')?.value || null,
            receiver_id: document.getElementById('csoSaleReceiver').value,
            notes: document.getElementById('csoSaleNotes').value,
            affiliate_user_id: document.getElementById('csoSaleAffiliate')?.value || null,
            job: document.getElementById('csoSaleJobTitle')?.value || document.getElementById('csoSaleLinhVuc')?.value || null,
            facebook_link: document.getElementById('csoSaleFacebook')?.value?.trim() || null,
            cong_viec: document.getElementById('csoSaleCongViec')?.value || 'Mặc Định'
        };
        console.log('[CSO-SALE] Body:', JSON.stringify(body));

        if (!body.crm_type || !body.receiver_id) {
            console.log('[CSO-SALE] Validation failed!', { crm: body.crm_type, receiver: body.receiver_id });
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
        if (body.phone && (body.phone.length !== 10 || !body.phone.startsWith('0'))) {
            showToast('Số điện thoại phải đúng 10 chữ số và bắt đầu bằng số 0', 'error');
            return;
        }

        try {
            const data = await apiCall('/api/customers', 'POST', body);
            if (data.success) {
                showToast('✅ Chuyển số thành công!');
                _csoSaleResetForm(e.target);
            } else if (data.error === 'duplicate_customer_warning' && data.duplicates) {
                // ★ SĐT trùng KH → Hiện popup danh sách: chọn Gửi Lại hoặc Tạo Mới
                _csoSaleShowDuplicatePopup(data.duplicates, body.notes, body, data.receiver_id);
            } else {
                showToast(data.error || data.message || 'Lỗi', 'error');
            }
        } catch (err) {
            showToast('Lỗi kết nối', 'error');
        }
    });

    // Toggle affiliate row visibility based on CRM selection
    const csoSaleCrmEl = document.getElementById('csoSaleCrm');
    if (csoSaleCrmEl && csoSaleCrmEl.tagName === 'SELECT') {
        csoSaleCrmEl.addEventListener('change', async function() {
            const row = document.getElementById('csoSaleAffiliateRow');
            const jobRow = document.getElementById('csoSaleJobTitleRow');
            const jobSel = document.getElementById('csoSaleJobTitle');
            if (isGD) {
                row.style.display = 'grid';
            } else {
                row.style.display = 'none';
                document.getElementById('csoSaleAffiliate').value = '';
                document.getElementById('csoSaleAffiliateCrm').value = '';
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
    document.getElementById('csoSaleAffiliate').addEventListener('change', function() {
        const crmInput = document.getElementById('csoSaleAffiliateCrm');
        const crmType = affiliateCrmMap[this.value] || '';
        crmInput.value = CRM_TYPE_LABELS_SALE[crmType] || crmType || '';
    });

    // Update affiliate dropdown when receiver changes
    const csoSaleReceiverEl = document.getElementById('csoSaleReceiver');
    if (csoSaleReceiverEl && csoSaleReceiverEl.tagName === 'SELECT') {
        csoSaleReceiverEl.addEventListener('change', function() {
            updateAffiliateDropdown(this.value);
        });
        // Init with current selected receiver
        updateAffiliateDropdown(csoSaleReceiverEl.value);
    } else if (csoSaleReceiverEl) {
        // Hidden input (NV/TP/Affiliate) → init with that value
        updateAffiliateDropdown(csoSaleReceiverEl.value);
    }

    // ========== AFFILIATE: Auto-sync CRM → Nguồn Khách ==========
    if (isAffiliate) {
        const allSrc = sources.items || [];
        const AFF_SOURCE_MAP = {
            'sale': 'AFFILIATE GIỚI THIỆU KHÁCH'
        };
        function _affSyncSource() {
            const crmVal = document.getElementById('csoSaleCrm').value;
            const sourceName = AFF_SOURCE_MAP[crmVal] || '';
            const sourceDisplay = document.getElementById('csoSaleSourceDisplay');
            const sourceHidden = document.getElementById('csoSaleSourceAffiliate');
            if (sourceDisplay) sourceDisplay.value = sourceName;
            // Find source_id by name
            const found = allSrc.find(s => s.name.toUpperCase() === sourceName.toUpperCase());
            console.log('[AFF-SOURCE-SALE] crmVal:', crmVal, '| sourceName:', sourceName, '| allSrc.length:', allSrc.length, '| found:', found ? `id=${found.id} name=${found.name}` : 'NOT FOUND');
            if (sourceHidden) sourceHidden.value = found ? found.id : '';
            // Always hide Affiliate HV row for affiliate users (they ARE the affiliate)
            const affRow = document.getElementById('csoSaleAffiliateRow');
            if (affRow) affRow.style.display = 'none';
            // Update commission rate display
            const commEl = document.getElementById('csoSaleCommRate');
            if (commEl) {
                commEl.textContent = '10% Hoa Hồng';
                commEl.style.color = '#059669';
                commEl.style.background = 'linear-gradient(135deg,#ecfdf5,#d1fae5)';
                commEl.style.borderColor = '#6ee7b7';
            }
        }
        // Init on load
        _affSyncSource();
        // Listen for CRM change
        document.getElementById('csoSaleCrm').addEventListener('change', _affSyncSource);
    }

    // ========== SMART SEARCH LOGIC ==========
    const searchInput = document.getElementById('csoSaleSmartSearch');
    if (searchInput) {
        let _csoSaleSearchTimer = null;
        searchInput.addEventListener('input', () => {
            clearTimeout(_csoSaleSearchTimer);
            _csoSaleSearchTimer = setTimeout(() => _csoSaleDoSearch(), 500);
        });
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); _csoSaleDoSearch(); }
        });
    }

    // ========== AUTO-CHECK PARTNER OUTREACH on phone/link input ==========
    let _csoSaleCheckTimer = null;
    function _csoSaleAutoCheckPO() {
        clearTimeout(_csoSaleCheckTimer);
        _csoSaleCheckTimer = setTimeout(async () => {
            const phone = document.getElementById('csoSalePhone')?.value?.trim();
            const link = document.getElementById('csoSaleFacebook')?.value?.trim();
            if ((!phone || phone.length < 3) && (!link || link.length < 5)) return;
            try {
                const params = new URLSearchParams();
                if (phone) params.set('phone', phone);
                if (link) params.set('link', link);
                const data = await apiCall(`/api/customers/check-partner-outreach?${params}`);
                if (data.match && !data.match.already_transferred) {
                    const m = data.match;
                    // Auto-fill + LOCK name
                    if (m.partner_name) { const n = document.getElementById('csoSaleName'); if (n) { n.value = m.partner_name; n.readOnly = true; n.style.background = '#f5f3ff'; n.style.color = '#6d28d9'; n.style.fontWeight = '700'; n.style.cursor = 'not-allowed'; n.style.borderColor = '#c4b5fd'; } }
                    // Update Công Việc
                    const cv = document.getElementById('csoSaleCongViec');
                    const cvd = document.getElementById('csoSaleCongViecDisplay');
                    if (cv) cv.value = 'Nhắn Tìm Đối Tác KH KOL Tiktok';
                    if (cvd) { cvd.value = 'Nhắn Tìm Đối Tác KH KOL Tiktok'; cvd.style.color = '#6d28d9'; cvd.style.background = '#f5f3ff'; cvd.style.borderColor = '#c4b5fd'; }
                    // Update Lĩnh Vực
                    if (m.category_name) {
                        const lv = document.getElementById('csoSaleLinhVuc');
                        if (lv) { lv.value = m.category_name; lv.style.color = '#6d28d9'; lv.style.background = '#f5f3ff'; lv.style.borderColor = '#c4b5fd'; }
                    }
                    showToast(`ℹ️ Phát hiện KH "${m.partner_name}" thuộc Nhắn Tìm Đối Tác KH KOL Tiktok (${m.category_name || ''}) → Đã tự động chuyển Công Việc & Lĩnh Vực`);
                } else if (data.match && data.match.already_transferred) {
                    showToast(`⛔ KH "${data.match.partner_name}" đã được chuyển số trước đó!`, 'error');
                }
            } catch(e) { /* silent */ }
        }, 600);
    }
    const _csoSalePhoneEl = document.getElementById('csoSalePhone');
    const _csoSaleFbEl = document.getElementById('csoSaleFacebook');
    if (_csoSalePhoneEl) {
        _csoSalePhoneEl.addEventListener('input', _csoSaleAutoCheckPO);
        _csoSalePhoneEl.addEventListener('blur', () => {
            _csoSaleNormalizePhoneField(_csoSalePhoneEl, true);
            _csoSaleToggleRequired();
        });
    }
    if (_csoSaleFbEl) _csoSaleFbEl.addEventListener('input', _csoSaleAutoCheckPO);
}

// Settings modal — GĐ only
async function csoSaleOpenSettings() {
    const [deptData, configData, cfgWeekday, cfgSaturday] = await Promise.all([
        apiCall('/api/departments'),
        apiCall('/api/app-config/chuyensosale_allowed_depts'),
        apiCall('/api/app-config/chuyensosale_cutoff_weekday'),
        apiCall('/api/app-config/chuyensosale_cutoff_saturday')
    ]);

    const allDepts = deptData.departments || [];
    const rootDepts = allDepts.filter(d => !d.parent_id);
    const allowedIds = configData.value ? JSON.parse(configData.value) : [];
    const cutoffWeekday = cfgWeekday.value || '18:15';
    const cutoffSaturday = cfgSaturday.value || '17:15';

    let checkboxes = rootDepts.map(d => {
        const checked = allowedIds.includes(d.id) ? 'checked' : '';
        return `<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;cursor:pointer;background:${checked ? '#eef2ff' : '#f9fafb'};border:1px solid ${checked ? '#6366f1' : '#e5e7eb'};">
            <input type="checkbox" class="cso-sale-dept-cb" value="${d.id}" ${checked} style="width:18px;height:18px;">
            <span style="font-weight:600;color:#122546;">🏢 ${d.name}</span>
            <span style="font-size:11px;color:#6b7280;">(${d.code})</span>
        </label>`;
    }).join('');

    const overlay = document.createElement('div');
    overlay.id = 'csoSaleSettingsOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:white;border-radius:12px;padding:24px;width:520px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-height:90vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3 style="margin:0;color:#122546;">⚙️ Cài đặt Chuyển Số Sale</h3>
                <span onclick="document.getElementById('csoSaleSettingsOverlay').remove()" style="cursor:pointer;font-size:20px;color:#6b7280;">✕</span>
            </div>

            <!-- ★ CUTOFF TIME SETTINGS -->
            <div style="margin-bottom:20px;padding:16px;background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1.5px solid #fcd34d;border-radius:12px;">
                <div style="font-size:14px;font-weight:700;color:#92400e;margin-bottom:12px;">🕐 Mốc Giờ Chuyển Sang Ngày Hôm Sau</div>
                <p style="font-size:11px;color:#b45309;margin:0 0 12px;line-height:1.5;">
                    Số chuyển sau mốc giờ này sẽ được gán sang <strong>ngày làm việc kế tiếp</strong> (tự động bỏ qua CN, Lễ, NV nghỉ phép).
                </p>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div>
                        <label style="display:block;font-size:12px;font-weight:700;color:#78350f;margin-bottom:4px;">📅 Thứ 2 → Thứ 6</label>
                        <input type="time" id="csoSaleCutoffWeekday" value="${cutoffWeekday}" class="form-control"
                             style="font-size:15px;font-weight:700;text-align:center;padding:8px;border-radius:8px;border:2px solid #fbbf24;">
                    </div>
                    <div>
                        <label style="display:block;font-size:12px;font-weight:700;color:#78350f;margin-bottom:4px;">📅 Thứ 7</label>
                        <input type="time" id="csoSaleCutoffSaturday" value="${cutoffSaturday}" class="form-control"
                             style="font-size:15px;font-weight:700;text-align:center;padding:8px;border-radius:8px;border:2px solid #fbbf24;">
                    </div>
                </div>
                <div style="margin-top:8px;font-size:10px;color:#92400e;line-height:1.5;">
                    ℹ️ <strong>Chủ Nhật / Ngày Lễ / NV nghỉ phép</strong>: Luôn tự động chuyển sang ngày đi làm kế tiếp (không cần cài mốc giờ)
                </div>
            </div>

            <!-- DEPARTMENT SETTINGS -->
            <div style="margin-bottom:16px;">
                <div style="font-size:14px;font-weight:700;color:#122546;margin-bottom:8px;">🏢 Đơn vị nhận số</div>
                <p style="font-size:12px;color:#6b7280;margin-bottom:12px;">Chọn đơn vị được hiển thị trong dropdown "Người Nhận Số". Nếu không chọn, tất cả NV sẽ được hiển thị.</p>
                <div style="display:flex;flex-direction:column;gap:8px;max-height:250px;overflow-y:auto;">
                    ${checkboxes}
                </div>
            </div>

            <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
                <button onclick="document.getElementById('csoSaleSettingsOverlay').remove()" class="btn" style="background:#f3f4f6;color:#374151;border:1px solid #d1d5db;">Hủy</button>
                <button onclick="csoSaleSaveSettings()" class="btn btn-primary" style="width:auto;">💾 Lưu</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function csoSaleSaveSettings() {
    const checked = [...document.querySelectorAll('.cso-sale-dept-cb:checked')].map(cb => Number(cb.value));
    const cutoffWeekday = document.getElementById('csoSaleCutoffWeekday')?.value || '18:15';
    const cutoffSaturday = document.getElementById('csoSaleCutoffSaturday')?.value || '17:15';

    try {
        await Promise.all([
            apiCall('/api/app-config/chuyensosale_allowed_depts', 'PUT', { value: JSON.stringify(checked) }),
            apiCall('/api/app-config/chuyensosale_cutoff_weekday', 'PUT', { value: cutoffWeekday }),
            apiCall('/api/app-config/chuyensosale_cutoff_saturday', 'PUT', { value: cutoffSaturday })
        ]);
        showToast('✅ Đã lưu cài đặt Chuyển Số Sale');
        document.getElementById('csoSaleSettingsOverlay')?.remove();
        // Reload page to apply filter
        const container = document.getElementById('mainContent');
        if (container) renderChuyensosalePage(container);
    } catch (err) {
        showToast('Lỗi lưu cài đặt', 'error');
    }
}

// Toggle required stars: if phone filled -> fb not required, if fb filled -> phone not required
function _csoSaleNormalizePhoneField(el, isBlur = false) {
    if (!el) return;
    let val = el.value;
    if (!isBlur && (val === '+' || val === '+8' || val === '+84')) {
        return;
    }
    let cleaned = val.replace(/[^0-9+]/g, '');
    if (cleaned.startsWith('+84')) {
        cleaned = '0' + cleaned.slice(3);
    } else if (cleaned.startsWith('84') && cleaned.replace(/\D/g, '').length >= 11) {
        cleaned = '0' + cleaned.slice(2);
    }
    cleaned = cleaned.replace(/\D/g, '');
    if (cleaned.length > 10) {
        cleaned = cleaned.slice(0, 10);
    }
    if (el.value !== cleaned) {
        el.value = cleaned;
    }
}

function _csoSaleToggleRequired() {
    const phone = document.getElementById('csoSalePhone')?.value?.trim();
    const fb = document.getElementById('csoSaleFacebook')?.value?.trim();
    const phoneStar = document.getElementById('csoSalePhoneStar');
    const fbStar = document.getElementById('csoSaleFbStar');
    if (phoneStar) phoneStar.style.display = fb ? 'none' : '';
    if (fbStar) fbStar.style.display = phone ? 'none' : '';
}

// ========== SMART SEARCH — Tìm SĐT/Link qua tất cả công việc ==========
async function _csoSaleDoSearch() {
    const q = document.getElementById('csoSaleSmartSearch')?.value?.trim();
    const box = document.getElementById('csoSaleSearchResults');
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
            items.sort((a, b) => (a.already_transferred ? 1 : 0) - (b.already_transferred ? 1 : 0));
            html += `<div style="padding:6px 12px;background:#f5f3ff;font-weight:700;font-size:12px;color:#6d28d9;border-top:1px solid #e0e7ff;">${label} (${items.length})</div>`;
            for (const r of items) {
                const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : '';
                const nameStr = r.customer_name ? `<b>${r.customer_name}</b>` : '<i style="color:#9ca3af">Không tên</i>';
                const phoneStr = r.phone ? `📞 ${r.phone}` : '';
                const linkStr = r.link ? `🔗 ${r.link.length > 50 ? r.link.substring(0, 50) + '...' : r.link}` : '';
                const assignStr = r.assigned_to ? `👤 ${r.assigned_to}` : '';
                const isTransferred = r.already_transferred;
                const badge = isTransferred ? '<span style="background:#fee2e2;color:#991b1b;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;margin-left:8px;">⛔ Đã Chuyển Số</span>' : '';
                const rowStyle = isTransferred
                    ? 'padding:10px 12px;border-top:1px solid #f0f0f0;display:flex;flex-direction:column;gap:2px;opacity:0.5;cursor:not-allowed;background:#f9fafb;'
                    : 'padding:10px 12px;cursor:pointer;border-top:1px solid #f0f0f0;display:flex;flex-direction:column;gap:2px;transition:background 0.15s;';
                const rowEvents = isTransferred
                    ? 'onclick="showToast(\'⛔ Số này đã được chuyển vào CRM rồi!\', \'error\')"'
                    : `onmouseenter="this.style.background='#eef2ff'" onmouseleave="this.style.background=''" onclick="_csoSaleSelectResult(this)"`;
                html += `<div class="cso-sale-search-row" data-result='${JSON.stringify(r).replace(/'/g, '&#39;')}'
                    style="${rowStyle}" ${rowEvents}>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:13px;">${nameStr}${badge}</span>
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

function _csoSaleSelectResult(el) {
    try {
        const r = JSON.parse(el.dataset.result);
        // Auto-fill form fields
        if (r.customer_name) { const n = document.getElementById('csoSaleName'); if (n) n.value = r.customer_name; }
        if (r.phone) { const p = document.getElementById('csoSalePhone'); if (p) p.value = r.phone; }
        if (r.link) { const f = document.getElementById('csoSaleFacebook'); if (f) f.value = r.link; }
        // Update Công Việc
        if (r.cong_viec) {
            const cv = document.getElementById('csoSaleCongViec');
            const cvd = document.getElementById('csoSaleCongViecDisplay');
            if (cv) cv.value = r.cong_viec;
            if (cvd) { cvd.value = r.cong_viec; cvd.style.color = '#6d28d9'; cvd.style.background = '#f5f3ff'; cvd.style.borderColor = '#c4b5fd'; }
        }
        // Update Lĩnh Vực from source_name (e.g. "Quà Tặng" from partner_outreach category)
        if (r.source_name) {
            const lv = document.getElementById('csoSaleLinhVuc');
            if (lv) { lv.value = r.source_name; lv.style.color = '#6d28d9'; lv.style.background = '#f5f3ff'; lv.style.borderColor = '#c4b5fd'; }
        }
        // Toggle required stars
        _csoSaleToggleRequired();
        // Show success toast
        if (typeof showToast === 'function') showToast(`✅ Đã chọn: ${r.module_label} — ${r.customer_name || r.link || r.phone}`);
        // Collapse search results
        const lvLabel = r.source_name ? `, Lĩnh Vực: <b>${r.source_name}</b>` : '';
        const box = document.getElementById('csoSaleSearchResults');
        if (box) box.innerHTML = `<div style="padding:8px 12px;background:#ecfdf5;border-radius:8px;font-size:13px;color:#065f46;">✅ Đã auto-fill từ <b>${r.module_label}</b> → Công Việc: <b>${r.cong_viec}</b>${lvLabel}. Kiểm tra và bấm CHUYỂN SỐ.</div>`;
        // Scroll to form
        document.getElementById('chuyensosaleForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch(e) { console.error('[CSO-SALE] Select result error:', e); }
}

// ========== RESET FORM SAU KHI CHUYỂN SỐ THÀNH CÔNG ==========
function _csoSaleResetForm(form) {
    if (form) form.reset();
    // Hide affiliate row after reset
    const affRow = document.getElementById('csoSaleAffiliateRow');
    if (affRow) affRow.style.display = 'none';
    const affCrm = document.getElementById('csoSaleAffiliateCrm');
    if (affCrm) affCrm.value = '';
    const jobRow = document.getElementById('csoSaleJobTitleRow');
    if (jobRow) jobRow.style.display = 'none';
    const jobSel = document.getElementById('csoSaleJobTitle');
    if (jobSel) jobSel.innerHTML = '<option value="">-- Chọn Lĩnh Vực --</option>';
    const fbEl = document.getElementById('csoSaleFacebook');
    if (fbEl) fbEl.value = '';
    // Reset Công Việc back to default
    const cvd = document.getElementById('csoSaleCongViecDisplay');
    if (cvd) { cvd.value = 'Mặc Định'; cvd.style.color = '#122546'; cvd.style.background = '#f1f5f9'; cvd.style.borderColor = ''; }
    const cvh = document.getElementById('csoSaleCongViec'); if (cvh) cvh.value = 'Mặc Định';
    // Reset Lĩnh Vực back to default
    const lv = document.getElementById('csoSaleLinhVuc');
    if (lv) { lv.value = 'Mặc Định'; lv.style.color = '#122546'; lv.style.background = '#f1f5f9'; lv.style.borderColor = ''; }
    // Unlock name field (may have been locked by partner outreach auto-fill)
    const nameEl = document.getElementById('csoSaleName');
    if (nameEl) { nameEl.readOnly = false; nameEl.style.background = ''; nameEl.style.color = ''; nameEl.style.fontWeight = ''; nameEl.style.cursor = ''; nameEl.style.borderColor = ''; }
    // Clear smart search
    const ss = document.getElementById('csoSaleSmartSearch'); if (ss) ss.value = '';
    const sr = document.getElementById('csoSaleSearchResults'); if (sr) { sr.style.display = 'none'; sr.innerHTML = ''; }
}

// ========== POPUP GỬI LẠI SỐ TRÙNG (MULTI-CARD) ==========
function _csoSaleShowDuplicatePopup(dups, formNotes, originalBody, receiverId) {
    // Remove existing popup
    document.getElementById('csoSaleDupOverlay')?.remove();

    // Store originalBody globally for force_create
    window._csoSaleDupOriginalBody = originalBody || null;
    window._csoSaleDupSelectedId = null; // ★ Chưa chọn KH nào

    const CRM_LABELS = { nhu_cau: 'Chăm Sóc KH Nhu Cầu', ctv: 'Chăm Sóc CTV', ctv_hoa_hong: 'Chăm Sóc Affiliate', koc_tiktok: 'Chăm Sóc KOL/KOC Tiktok', sale: 'Chăm Sóc Khách Sale' };

    // ★ Kiểm tra NV nhận số đã có KH trùng chưa
    const receiverHasDup = receiverId && dups.some(d => d.assigned_to_id === receiverId);

    // Build cards HTML
    const cardsHtml = dups.map((dup, idx) => {
        const isSameReceiver = receiverId && dup.assigned_to_id === receiverId;
        return `
        <div class="_csoSaleDupCard ${isSameReceiver ? '_receiverMatch' : ''}" data-cid="${dup.id}" onclick="_csoSaleDupSelectCard(${dup.id})"
             style="background:linear-gradient(135deg,${isSameReceiver ? '#fef2f2,#fee2e2' : '#fffbeb,#fef3c7'});border:2px solid ${isSameReceiver ? '#fca5a5' : '#fcd34d'};border-radius:12px;padding:14px 16px;margin-bottom:10px;cursor:pointer;transition:all 0.2s;">
            ${isSameReceiver ? '<div style="font-size:10px;font-weight:800;color:#dc2626;margin-bottom:6px;text-transform:uppercase;">⚠️ NV nhận số đã có KH này</div>' : ''}
            <div style="display:grid;grid-template-columns:auto 1fr;gap:6px 14px;font-size:13px;">
                <span style="color:#92400e;font-weight:700;">👤 KH:</span>
                <span style="color:#1e293b;font-weight:700;">${dup.customer_name || 'N/A'}</span>
                <span style="color:#92400e;font-weight:700;">📱 SĐT:</span>
                <span style="color:#1e293b;font-weight:600;">${dup.phone || 'N/A'}</span>
                <span style="color:#92400e;font-weight:700;">👨‍💼 NV:</span>
                <span style="color:#1e293b;font-weight:600;">${dup.assigned_to_name || 'N/A'}${dup.dept_name ? ' — ' + dup.dept_name : ''}</span>
                <span style="color:#92400e;font-weight:700;">🏷️ CRM:</span>
                <span style="color:#1e293b;font-weight:600;">${CRM_LABELS[dup.crm_type] || dup.crm_type || 'N/A'}</span>
                <span style="color:#92400e;font-weight:700;">🏷️ Mã:</span>
                <span style="color:#6d28d9;font-weight:800;">${dup.current_code || 'N/A'}</span>
            </div>
        </div>`;
    }).join('');

    // ★ Nút Tạo KH Mới: ẩn nếu NV nhận số đã có KH trùng
    const createNewBtnHtml = receiverHasDup
        ? ''
        : `<button onclick="_csoSaleForceCreateNew()" style="padding:10px 20px;border-radius:10px;border:none;background:linear-gradient(135deg,#6366f1,#4f46e5);color:white;font-weight:800;font-size:13px;cursor:pointer;box-shadow:0 4px 14px rgba(99,102,241,0.4);transition:all 0.15s;" onmouseenter="this.style.transform='translateY(-1px)'" onmouseleave="this.style.transform=''">
                🆕 Tạo KH Mới
            </button>`;

    const createNewInfoHtml = receiverHasDup
        ? `<div style="font-size:11px;color:#dc2626;line-height:1.6;margin-bottom:16px;padding:10px 12px;background:#fef2f2;border-radius:8px;border:1px solid #fecaca;">
                <strong>🚫 Không thể Tạo KH Mới</strong> — NV nhận số đã có KH với SĐT này. Chỉ có thể Gửi Lại Số.
           </div>`
        : `<div style="font-size:11px;color:#6b7280;line-height:1.6;margin-bottom:16px;padding:10px 12px;background:#eef2ff;border-radius:8px;border:1px solid #c7d2fe;">
                <strong style="color:#4338ca;">🆕 Tạo KH Mới</strong> — tạo khách hàng mới với UID riêng biệt (dù cùng SĐT)
           </div>`;

    const overlay = document.createElement('div');
    overlay.id = 'csoSaleDupOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;animation:_csoSaleDupFadeIn 0.25s ease;';
    overlay.innerHTML = `
        <style>
            @keyframes _csoSaleDupFadeIn { from { opacity:0; } to { opacity:1; } }
            @keyframes _csoSaleDupSlideUp { from { transform:translateY(30px);opacity:0; } to { transform:translateY(0);opacity:1; } }
            ._csoSaleDupCard:hover { border-color:#f59e0b !important; transform:translateY(-1px); box-shadow:0 4px 12px rgba(245,158,11,0.2); }
            ._csoSaleDupCard._selected { border-color:#2563eb !important; background:linear-gradient(135deg,#eff6ff,#dbeafe) !important; box-shadow:0 4px 16px rgba(37,99,235,0.25); }
        </style>
        <div style="background:white;border-radius:16px;padding:0;width:540px;max-width:92vw;max-height:90vh;box-shadow:0 25px 80px rgba(0,0,0,0.3);overflow:hidden;animation:_csoSaleDupSlideUp 0.3s ease;display:flex;flex-direction:column;">
            <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:18px 24px;display:flex;align-items:center;gap:12px;flex-shrink:0;">
                <span style="font-size:28px;">⚠️</span>
                <div>
                    <div style="font-size:16px;font-weight:800;color:white;">SĐT ĐÃ TỒN TẠI TRONG HỆ THỐNG</div>
                    <div style="font-size:11px;color:rgba(255,255,255,0.85);margin-top:2px;">Tìm thấy <strong>${dups.length} khách hàng</strong> trùng SĐT. Chọn KH để <strong>Gửi Lại Số</strong>${receiverHasDup ? '' : ' hoặc <strong>Tạo KH Mới</strong>'}</div>
                </div>
            </div>
            <div style="padding:20px 24px;overflow-y:auto;flex:1;">
                <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:8px;">📋 Danh sách KH trùng SĐT (mới nhất lên đầu):</div>
                ${cardsHtml}

                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;margin-bottom:16px;">
                    <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:6px;">💬 Ghi chú kèm theo (tùy chọn)</div>
                    <textarea id="csoSaleDupNotes" rows="2" placeholder="VD: KH gọi lại muốn tư vấn thêm..." style="width:100%;border:1.5px solid #cbd5e1;border-radius:8px;padding:8px 12px;font-size:13px;font-family:inherit;resize:vertical;">${formNotes || ''}</textarea>
                </div>

                <!-- Option 1: Gửi Lại Số (KH cũ) -->
                <div style="font-size:11px;color:#6b7280;line-height:1.6;margin-bottom:12px;padding:10px 12px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
                    <strong style="color:#15803d;">✅ Gửi Lại Số</strong> — chọn 1 KH ở trên rồi bấm gửi lại
                </div>

                <!-- Option 2: Tạo KH Mới hoặc cảnh báo -->
                ${createNewInfoHtml}

                <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">
                    <button onclick="document.getElementById('csoSaleDupOverlay').remove()" style="padding:10px 20px;border-radius:10px;border:1.5px solid #d1d5db;background:#f9fafb;color:#374151;font-weight:700;font-size:13px;cursor:pointer;transition:all 0.15s;" onmouseenter="this.style.background='#f3f4f6'" onmouseleave="this.style.background='#f9fafb'">
                        ❌ Bỏ Qua
                    </button>
                    ${createNewBtnHtml}
                    <button id="csoSaleDupResendBtn" onclick="_csoSaleConfirmResendSelected()" disabled style="padding:10px 20px;border-radius:10px;border:none;background:#9ca3af;color:white;font-weight:800;font-size:13px;cursor:not-allowed;box-shadow:none;transition:all 0.15s;opacity:0.6;">
                        ✅ Chọn KH để Gửi Lại
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Close on overlay click (not popup itself)
    overlay.addEventListener('click', (ev) => {
        if (ev.target === overlay) overlay.remove();
    });
}

// ★ Chọn card KH
function _csoSaleDupSelectCard(customerId) {
    window._csoSaleDupSelectedId = customerId;
    // Highlight selected
    document.querySelectorAll('._csoSaleDupCard').forEach(c => c.classList.remove('_selected'));
    const card = document.querySelector(`._csoSaleDupCard[data-cid="${customerId}"]`);
    if (card) card.classList.add('_selected');
    // Enable resend button
    const btn = document.getElementById('csoSaleDupResendBtn');
    if (btn) {
        btn.disabled = false;
        btn.style.background = 'linear-gradient(135deg,#f59e0b,#d97706)';
        btn.style.cursor = 'pointer';
        btn.style.opacity = '1';
        btn.style.boxShadow = '0 4px 14px rgba(245,158,11,0.4)';
        btn.textContent = '✅ Gửi Lại Số';
    }
}

// ★ Gửi lại với KH đã chọn
async function _csoSaleConfirmResendSelected() {
    const customerId = window._csoSaleDupSelectedId;
    if (!customerId) { showToast('Vui lòng chọn 1 KH để gửi lại', 'error'); return; }
    await _csoSaleConfirmResend(customerId);
}

// ========== XÁC NHẬN GỬI LẠI — Gọi API /api/customers/resend ==========
async function _csoSaleConfirmResend(customerId) {
    const notesEl = document.getElementById('csoSaleDupNotes');
    const notes = notesEl ? notesEl.value.trim() : '';

    // Disable button
    const btn = document.querySelector('#csoSaleDupOverlay button:last-child');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang xử lý...'; }

    try {
        const data = await apiCall('/api/customers/resend', 'POST', { customer_id: customerId, notes });
        if (data.success) {
            showToast(data.message || '✅ Đã gửi lại thành công!');
            document.getElementById('csoSaleDupOverlay')?.remove();
            // Reset form
            _csoSaleResetForm(document.getElementById('chuyensosaleForm'));
        } else {
            showToast(data.error || 'Lỗi gửi lại', 'error');
            if (btn) { btn.disabled = false; btn.textContent = '✅ Gửi Lại Số'; }
        }
    } catch (err) {
        showToast('Lỗi kết nối', 'error');
        if (btn) { btn.disabled = false; btn.textContent = '✅ Gửi Lại Số'; }
    }
}

// ========== TẠO KH MỚI (force_create) — Bỏ qua cảnh báo trùng SĐT ==========
async function _csoSaleForceCreateNew() {
    const body = window._csoSaleDupOriginalBody;
    if (!body) { showToast('Lỗi: không tìm thấy dữ liệu form', 'error'); return; }

    // Disable button
    const btns = document.querySelectorAll('#csoSaleDupOverlay button');
    btns.forEach(b => { b.disabled = true; });
    const createBtn = [...btns].find(b => b.textContent.includes('Tạo KH'));
    if (createBtn) createBtn.textContent = '⏳ Đang tạo...';

    try {
        body.force_create = true; // Bypass duplicate warning
        const data = await apiCall('/api/customers', 'POST', body);
        if (data.success) {
            showToast('✅ Tạo KH mới thành công!');
            document.getElementById('csoSaleDupOverlay')?.remove();
            _csoSaleResetForm(document.getElementById('chuyensosaleForm'));
            window._csoSaleDupOriginalBody = null;
        } else {
            showToast(data.error || 'Lỗi tạo KH', 'error');
            btns.forEach(b => { b.disabled = false; });
            if (createBtn) createBtn.textContent = '🆕 Tạo KH Mới';
        }
    } catch (err) {
        showToast('Lỗi kết nối', 'error');
        btns.forEach(b => { b.disabled = false; });
        if (createBtn) createBtn.textContent = '🆕 Tạo KH Mới';
    }
}
