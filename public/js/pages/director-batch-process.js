// Director Batch Processing Modal & Handler for CRM Nhu Cầu & CRM Sale

window.openDirectorBatchModal = async function(crmType) {
    const userRole = (typeof currentUser !== 'undefined' && currentUser?.role) || (window.currentUser?.role) || window.userRole;
    const isDirector = (userRole === 'giam_doc');
    if (!isDirector) {
        showToast('⚠️ Chỉ tài khoản Giám Đốc mới có quyền sử dụng công cụ xử lý hàng loạt này!', 'error');
        return;
    }

    const modalId = 'modalDirectorBatchProcess';
    let existingModal = document.getElementById(modalId);
    if (existingModal) existingModal.remove();

    // Fetch active staff list for reassignment dropdown
    let staffOptionsHtml = '<option value="">-- Chọn Nhân Viên Tiếp Nhận --</option>';
    try {
        const usersRes = await apiCall('/api/users');
        const users = Array.isArray(usersRes) ? usersRes : (usersRes.users || []);
        const activeStaff = users.filter(u => u.status === 'active');
        staffOptionsHtml += activeStaff.map(u => `<option value="${u.id}">${u.full_name} (${u.role_name || u.role})</option>`).join('');
    } catch(e) {
        console.error('Error fetching staff list for batch modal:', e);
    }

    const tomorrowObj = new Date();
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

    const crmTitle = crmType === 'sale' ? 'Chăm Sóc Khách Sale' : 'Chăm Sóc KH Nhu Cầu';

    // Calculate total count in "Phải Xử Lý Hôm Nay"
    let countPhaiXuLy = 0;
    if (crmType === 'sale') {
        const redCard = document.querySelector('.crm-stat-card[data-cat="phai_xu_ly"] .stat-value') || document.querySelector('.crm-stat-card[data-cat="phai_xu_ly"] div');
        if (typeof _saleAllCustomers !== 'undefined' && Array.isArray(_saleAllCustomers) && _saleAllCustomers.length > 0) {
            countPhaiXuLy = _saleAllCustomers.filter(c => {
                const cat = _saleGetCategory(c, _saleAllStats);
                return cat === 'phai_xu_ly' || cat === 'moi_chuyen';
            }).length;
        }
        if (!countPhaiXuLy && redCard) {
            countPhaiXuLy = parseInt(redCard.textContent) || 0;
        }
    } else {
        const redCard = document.querySelector('.crm-stat-card[data-cat="phai_xu_ly"] .stat-value') || document.querySelector('#crmStatCards .stat-card-value');
        if (typeof _crmAllCustomers !== 'undefined' && Array.isArray(_crmAllCustomers) && _crmAllCustomers.length > 0) {
            countPhaiXuLy = _crmAllCustomers.filter(c => {
                const cat = _crmGetCategory(c, _crmAllStats);
                return cat === 'phai_xu_ly' || cat === 'moi_chuyen';
            }).length;
        }
        if (!countPhaiXuLy && redCard) {
            countPhaiXuLy = parseInt(redCard.textContent) || 0;
        }
    }

    const modalHtml = `
        <div id="${modalId}" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.65); backdrop-filter:blur(4px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;">
            <div style="background:white; border-radius:16px; width:100%; max-width:560px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); overflow:hidden; border:1px solid #e2e8f0; animation: modalFadeIn 0.25s ease-out;">
                <!-- Header -->
                <div style="background:linear-gradient(135deg, #7c3aed, #4f46e5); padding:20px 24px; color:white; display:flex; align-items:center; justify-content:space-between;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <span style="font-size:26px;">⚡</span>
                        <div>
                            <h3 style="margin:0; font-size:18px; font-weight:800; color:white;">Xử Lý Hàng Loạt (Dành Cho Giám Đốc)</h3>
                            <p style="margin:2px 0 0 0; font-size:12px; opacity:0.9; color:#e0e7ff;">Phạm vi: <b>${crmTitle}</b></p>
                        </div>
                    </div>
                    <button onclick="document.getElementById('${modalId}').remove()" style="background:rgba(255,255,255,0.2); border:none; color:white; width:32px; height:32px; border-radius:50%; font-size:16px; cursor:pointer;">✕</button>
                </div>

                <!-- Body -->
                <div style="padding:24px; display:flex; flex-direction:column; gap:20px; max-height:75vh; overflow-y:auto;">
                    <!-- Scope Selection -->
                    <div style="background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:12px; padding:16px;">
                        <label style="font-weight:700; color:#1e293b; font-size:13px; display:block; margin-bottom:8px;">🎯 Đối tượng xử lý hàng loạt:</label>
                        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-size:13px; font-weight:700; color:#334155;">
                            <input type="radio" name="batchScope" value="phai_xu_ly_hom_nay" checked style="width:18px; height:18px; accent-color:#7c3aed;">
                            🔥 Toàn bộ danh sách <b>"PHẢI XỬ LÝ HÔM NAY"</b> trên trang <span style="background:#fee2e2; color:#991b1b; padding:3px 10px; border-radius:12px; font-weight:800; font-size:13px; margin-left:6px; border:1px solid #fca5a5;">(${countPhaiXuLy} khách hàng)</span>
                        </label>
                    </div>

                    <!-- Action Selection -->
                    <div>
                        <label style="font-weight:700; color:#1e293b; font-size:13px; display:block; margin-bottom:10px;">⚙️ Chọn hành động muốn thực thi:</label>
                        <div style="display:flex; flex-direction:column; gap:10px;">
                            <label style="display:flex; align-items:center; gap:10px; background:#f0fdf4; padding:12px 14px; border-radius:10px; cursor:pointer; font-size:13px; font-weight:700; color:#166534; border:1.5px solid #bbf7d0;" onclick="toggleBatchSubOptions('mark_handled')">
                                <input type="radio" name="batchAction" value="mark_handled" checked style="width:18px; height:18px; accent-color:#10b981;">
                                🟢 1. Đánh dấu ĐÃ XỬ LÝ HÔM NAY (Chuyển sang tab Đã xử lý & lùi hạn)
                            </label>

                            <label style="display:flex; align-items:center; gap:10px; background:#eff6ff; padding:12px 14px; border-radius:10px; cursor:pointer; font-size:13px; font-weight:700; color:#1e40af; border:1.5px solid #bfdbfe;" onclick="toggleBatchSubOptions('reassign')">
                                <input type="radio" name="batchAction" value="reassign" style="width:18px; height:18px; accent-color:#2563eb;">
                                ➡️ 2. Chuyển gán cho Nhân Viên khác
                            </label>

                            <label style="display:flex; align-items:center; gap:10px; background:#f5f3ff; padding:12px 14px; border-radius:10px; cursor:pointer; font-size:13px; font-weight:700; color:#5b21b6; border:1.5px solid #ddd6fe;" onclick="toggleBatchSubOptions('reschedule')">
                                <input type="radio" name="batchAction" value="reschedule" style="width:18px; height:18px; accent-color:#8b5cf6;">
                                📅 3. Dời Hạn Chăm Sóc Sang Ngày Khác
                            </label>

                            <label style="display:flex; align-items:center; gap:10px; background:#fff1f2; padding:12px 14px; border-radius:10px; cursor:pointer; font-size:13px; font-weight:700; color:#991b1b; border:1.5px solid #fecdd3;" onclick="toggleBatchSubOptions('cancel')">
                                <input type="radio" name="batchAction" value="cancel" style="width:18px; height:18px; accent-color:#ef4444;">
                                🗑️ 4. Hủy Hàng Loạt (Dọn Dẹp Danh Sách Khách Rác & Chuyển Sang Tab Hủy)
                            </label>

                            <label style="display:flex; align-items:center; gap:10px; background:#fef2f2; padding:12px 14px; border-radius:10px; cursor:pointer; font-size:13px; font-weight:700; color:#b91c1c; border:1.5px solid #fca5a5;" onclick="toggleBatchSubOptions('delete')">
                                <input type="radio" name="batchAction" value="delete" style="width:18px; height:18px; accent-color:#dc2626;">
                                ❌ 5. Xóa Vĩnh Viễn Hàng Loạt Khách Hàng (Xóa Sạch Khỏi CSDL Hệ Thống)
                            </label>
                        </div>
                    </div>

                    <!-- Sub Options Panel -->
                    <div id="batchSubOptionsPanel" style="background:#fafafa; border:1.5px solid #e2e8f0; padding:14px; border-radius:10px;">
                        <!-- Date Picker for mark_handled / reschedule -->
                        <div id="subOptDateGroup">
                            <label style="font-weight:700; font-size:12px; color:#475569; display:block; margin-bottom:6px;">📅 Chọn ngày hạn chăm sóc tiếp theo:</label>
                            <input type="date" id="batchNewDate" class="form-control" value="${tomorrowStr}" style="width:100%; font-weight:700;">
                        </div>

                        <!-- Staff Picker for reassign -->
                        <div id="subOptStaffGroup" style="display:none;">
                            <label style="font-weight:700; font-size:12px; color:#475569; display:block; margin-bottom:6px;">👤 Chọn nhân viên tiếp nhận mới:</label>
                            <select id="batchTargetUserId" class="form-control" style="width:100%; font-weight:700;">
                                ${staffOptionsHtml}
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:16px 24px; display:flex; justify-content:flex-end; gap:12px;">
                    <button onclick="document.getElementById('${modalId}').remove()" class="btn" style="background:#e2e8f0; color:#475569; font-weight:700; padding:8px 18px; border-radius:8px;">Hủy Bỏ</button>
                    <button id="btnSubmitDirectorBatch" onclick="executeDirectorBatchProcess('${crmType}')" class="btn" style="background:linear-gradient(135deg, #10b981, #059669); color:white; font-weight:800; padding:10px 24px; border-radius:8px; box-shadow:0 4px 12px rgba(16, 185, 129, 0.3); border:none; cursor:pointer;">🚀 XỬ LÝ HÀNG LOẠT NGAY (${countPhaiXuLy} KHÁCH)</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Dynamic toggle handler inside modal
    window.toggleBatchSubOptions = function(actionType) {
        const dateGroup = document.getElementById('subOptDateGroup');
        const staffGroup = document.getElementById('subOptStaffGroup');
        if (actionType === 'reassign') {
            if (dateGroup) dateGroup.style.display = 'none';
            if (staffGroup) staffGroup.style.display = 'block';
        } else if (actionType === 'mark_handled' || actionType === 'reschedule') {
            if (dateGroup) dateGroup.style.display = 'block';
            if (staffGroup) staffGroup.style.display = 'none';
        } else {
            if (dateGroup) dateGroup.style.display = 'none';
            if (staffGroup) staffGroup.style.display = 'none';
        }
    };
};

window.executeDirectorBatchProcess = async function(crmType) {
    const actionType = document.querySelector('input[name="batchAction"]:checked')?.value || 'mark_handled';
    const scope = document.querySelector('input[name="batchScope"]:checked')?.value || 'phai_xu_ly_hom_nay';
    const newDate = document.getElementById('batchNewDate')?.value;
    const targetUserId = document.getElementById('batchTargetUserId')?.value;

    if (actionType === 'reassign' && !targetUserId) {
        showToast('⚠️ Vui lòng chọn nhân viên tiếp nhận!', 'error');
        return;
    }

    if (actionType === 'delete') {
        if (!confirm('⚠️ CẢNH BÁO GIÁM ĐỐC: Anh/Chị có CHẮC CHẮN muốn XÓA VĨNH VIỄN toàn bộ danh sách "Phải xử lý hôm nay" khỏi CSDL hệ thống không?\n\nThao tác này sẽ xóa sạch dữ liệu khỏi máy chủ và KHÔNG THỂ KHÔI PHỤC!')) {
            return;
        }
    } else {
        if (!confirm('⚠️ Giám Đốc có chắc chắn muốn thực hiện xử lý hàng loạt cho toàn bộ danh sách "Phải xử lý hôm nay"?')) {
            return;
        }
    }

    const btn = document.getElementById('btnSubmitDirectorBatch');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Đang xử lý hàng loạt...';
    }

    try {
        const res = await apiCall('/api/customers/director-batch-process', 'POST', {
            action_type: actionType,
            crm_type: crmType,
            tab_filter: scope,
            new_appointment_date: newDate,
            target_user_id: targetUserId ? Number(targetUserId) : null
        });

        if (res && res.success) {
            showToast(res.message || '🎉 Đã xử lý hàng loạt thành công!', 'success');
            const modal = document.getElementById('modalDirectorBatchProcess');
            if (modal) modal.remove();

            // Refresh current page table safely
            if (crmType === 'sale' && typeof window._saleReloadCurrentPage === 'function') {
                await window._saleReloadCurrentPage();
            } else if (crmType === 'nhu_cau' && typeof window._crmReloadCurrentPage === 'function') {
                await window._crmReloadCurrentPage();
            } else if (typeof _saleLoadData === 'function') {
                await _saleLoadData();
            } else if (typeof loadCrmNhuCauData === 'function') {
                await loadCrmNhuCauData();
            }
        } else {
            showToast('❌ Lỗi: ' + (res?.error || 'Không thể xử lý'), 'error');
        }
    } catch(e) {
        console.error('Error executing director batch process:', e);
        showToast('❌ Lỗi hệ thống: ' + (e.message || 'Lỗi xử lý'), 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '🚀 XỬ LÝ HÀNG LOẠT NGAY';
        }
    }
};
