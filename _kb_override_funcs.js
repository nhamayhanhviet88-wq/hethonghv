
// ========== PER-USER OVERRIDE FUNCTIONS (GĐ only) ==========
async function _kbEditOverrideDiem(templateId, field) {
    if (currentUser.role !== 'giam_doc') { showToast('Chỉ Giám Đốc', 'error'); return; }
    var uid = _kbViewUserId;
    if (!uid) { showToast('Phải đang xem lịch nhân viên', 'error'); return; }
    var task = _kbTasks.find(function(t) { return (t._source === 'snapshot' ? t.template_id : t.id) === templateId; });
    var taskName = task ? task.task_name : '';
    var ov = _kbOverridesDiem[templateId];
    var label = field === 'points' ? 'Điểm' : 'SL Tối Thiểu';
    var currentVal = field === 'points' ? (task ? task.points : 0) : (task ? (task.min_quantity || 1) : 1);
    var origVal = currentVal;
    if (field === 'points' && ov && ov.custom_points != null && task && task._orig_points != null) origVal = task._orig_points;
    if (field === 'min_quantity' && ov && ov.custom_min_quantity != null && task && task._orig_min_quantity != null) origVal = task._orig_min_quantity;

    var old = document.getElementById('kbOverrideModal');
    if (old) old.remove();
    var m = document.createElement('div'); m.id = 'kbOverrideModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:100000;';
    m.onclick = function(e) { if (e.target === m) m.remove(); };
    m.innerHTML = '<div style="background:white;border-radius:16px;width:min(380px,90vw);box-shadow:0 25px 60px rgba(0,0,0,0.2);overflow:hidden;">'
        + '<div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:18px 24px;">'
        + '<div style="font-size:16px;font-weight:800;color:white;">✏️ Tùy chỉnh ' + label + '</div>'
        + '<div style="font-size:12px;color:#fef3c7;margin-top:4px;">' + taskName + '</div></div>'
        + '<div style="padding:24px;">'
        + '<div style="display:flex;gap:12px;margin-bottom:16px;">'
        + '<div style="flex:1;text-align:center;background:#f9fafb;border-radius:8px;padding:10px;border:1px solid #e5e7eb;">'
        + '<div style="font-size:10px;color:#6b7280;font-weight:600;">GIÁ TRỊ GỐC</div>'
        + '<div style="font-size:20px;font-weight:800;color:#374151;">' + origVal + '</div></div>'
        + '<div style="flex:1;text-align:center;background:#fffbeb;border-radius:8px;padding:10px;border:2px solid #f59e0b;">'
        + '<div style="font-size:10px;color:#d97706;font-weight:600;">GIÁ TRỊ MỚI</div>'
        + '<input id="kbOvInput" type="number" value="' + currentVal + '" min="0" style="width:80px;font-size:20px;font-weight:800;color:#d97706;border:none;text-align:center;background:transparent;outline:none;" /></div></div>'
        + '<div style="display:flex;gap:8px;">'
        + '<button onclick="_kbSaveOverrideDiem(' + templateId + ',\'' + field + '\')" style="flex:1;padding:10px;border:none;border-radius:8px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;font-weight:700;cursor:pointer;font-size:13px;">💾 Lưu</button>'
        + (ov ? '<button onclick="_kbResetOverrideDiem(' + templateId + ')" style="flex:1;padding:10px;border:none;border-radius:8px;background:#ef4444;color:white;font-weight:700;cursor:pointer;font-size:13px;">🔄 Mặc định</button>' : '')
        + '<button onclick="document.getElementById(\'kbOverrideModal\').remove()" style="flex:1;padding:10px;border:none;border-radius:8px;background:#e5e7eb;color:#374151;font-weight:700;cursor:pointer;font-size:13px;">Hủy</button>'
        + '</div></div></div>';
    document.body.appendChild(m);
    var inp = document.getElementById('kbOvInput'); if (inp) inp.focus();
}

async function _kbSaveOverrideDiem(templateId, field) {
    var inp = document.getElementById('kbOvInput');
    if (!inp) return;
    var val = Number(inp.value);
    if (isNaN(val) || val < 0) { showToast('Giá trị không hợp lệ', 'error'); return; }
    var existing = _kbOverridesDiem[templateId];
    try {
        await apiCall('/api/schedule/user-override', {
            method: 'POST',
            body: JSON.stringify({
                user_id: _kbViewUserId,
                source_type: 'diem',
                source_id: templateId,
                custom_points: field === 'points' ? val : (existing && existing.custom_points != null ? existing.custom_points : null),
                custom_min_quantity: field === 'min_quantity' ? val : (existing && existing.custom_min_quantity != null ? existing.custom_min_quantity : null)
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        showToast('✅ Đã lưu tùy chỉnh!', 'success');
        var om = document.getElementById('kbOverrideModal'); if (om) om.remove();
        var dm = document.getElementById('kbDetailModal'); if (dm) dm.remove();
        _kbInit();
    } catch(e) { showToast('Lỗi: ' + (e.message || ''), 'error'); }
}

async function _kbResetOverrideDiem(templateId) {
    if (!confirm('Khôi phục giá trị mặc định cho công việc này?')) return;
    try {
        await apiCall('/api/schedule/user-override?user_id=' + _kbViewUserId + '&source_type=diem&source_id=' + templateId, { method: 'DELETE' });
        showToast('🔄 Đã khôi phục mặc định!', 'success');
        var om = document.getElementById('kbOverrideModal'); if (om) om.remove();
        var dm = document.getElementById('kbDetailModal'); if (dm) dm.remove();
        _kbInit();
    } catch(e) { showToast('Lỗi: ' + (e.message || ''), 'error'); }
}

async function _kbEditOverrideKhoa(lockTaskId) {
    if (currentUser.role !== 'giam_doc') { showToast('Chỉ Giám Đốc', 'error'); return; }
    var uid = _kbViewUserId;
    if (!uid) { showToast('Phải đang xem lịch NV', 'error'); return; }
    var lt = _kbLockTasks.find(function(t) { return t.id === lockTaskId; });
    var ov = _kbOverridesKhoa[lockTaskId];
    var currentVal = ov && ov.custom_min_quantity != null ? ov.custom_min_quantity : (lt ? lt.min_quantity : 1);
    var origVal = lt ? (lt.min_quantity || 1) : 1;
    var old = document.getElementById('kbOverrideModal');
    if (old) old.remove();
    var m = document.createElement('div'); m.id = 'kbOverrideModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:100000;';
    m.onclick = function(e) { if (e.target === m) m.remove(); };
    m.innerHTML = '<div style="background:white;border-radius:16px;width:min(380px,90vw);box-shadow:0 25px 60px rgba(0,0,0,0.2);overflow:hidden;">'
        + '<div style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:18px 24px;">'
        + '<div style="font-size:16px;font-weight:800;color:white;">✏️ Tùy chỉnh SL Tối Thiểu (CV Khóa)</div>'
        + '<div style="font-size:12px;color:#fecaca;margin-top:4px;">' + (lt ? lt.task_name : '') + '</div></div>'
        + '<div style="padding:24px;">'
        + '<div style="display:flex;gap:12px;margin-bottom:16px;">'
        + '<div style="flex:1;text-align:center;background:#f9fafb;border-radius:8px;padding:10px;border:1px solid #e5e7eb;">'
        + '<div style="font-size:10px;color:#6b7280;font-weight:600;">GIÁ TRỊ GỐC</div>'
        + '<div style="font-size:20px;font-weight:800;color:#374151;">' + origVal + '</div></div>'
        + '<div style="flex:1;text-align:center;background:#fef2f2;border-radius:8px;padding:10px;border:2px solid #dc2626;">'
        + '<div style="font-size:10px;color:#dc2626;font-weight:600;">GIÁ TRỊ MỚI</div>'
        + '<input id="kbOvInput" type="number" value="' + currentVal + '" min="0" style="width:80px;font-size:20px;font-weight:800;color:#dc2626;border:none;text-align:center;background:transparent;outline:none;" /></div></div>'
        + '<div style="display:flex;gap:8px;">'
        + '<button onclick="_kbSaveOverrideKhoa(' + lockTaskId + ')" style="flex:1;padding:10px;border:none;border-radius:8px;background:linear-gradient(135deg,#dc2626,#991b1b);color:white;font-weight:700;cursor:pointer;font-size:13px;">💾 Lưu</button>'
        + (ov ? '<button onclick="_kbResetOverrideKhoa(' + lockTaskId + ')" style="flex:1;padding:10px;border:none;border-radius:8px;background:#ef4444;color:white;font-weight:700;cursor:pointer;font-size:13px;">🔄 Mặc định</button>' : '')
        + '<button onclick="document.getElementById(\'kbOverrideModal\').remove()" style="flex:1;padding:10px;border:none;border-radius:8px;background:#e5e7eb;color:#374151;font-weight:700;cursor:pointer;font-size:13px;">Hủy</button>'
        + '</div></div></div>';
    document.body.appendChild(m);
    var inp = document.getElementById('kbOvInput'); if (inp) inp.focus();
}

async function _kbSaveOverrideKhoa(lockTaskId) {
    var inp = document.getElementById('kbOvInput');
    if (!inp) return;
    var val = Number(inp.value);
    if (isNaN(val) || val < 0) { showToast('Giá trị không hợp lệ', 'error'); return; }
    try {
        await apiCall('/api/schedule/user-override', {
            method: 'POST',
            body: JSON.stringify({ user_id: _kbViewUserId, source_type: 'khoa', source_id: lockTaskId, custom_points: null, custom_min_quantity: val }),
            headers: { 'Content-Type': 'application/json' }
        });
        showToast('✅ Đã lưu!', 'success');
        var om = document.getElementById('kbOverrideModal'); if (om) om.remove();
        var lm = document.getElementById('kbLockDetailModal'); if (lm) lm.remove();
        _kbInit();
    } catch(e) { showToast('Lỗi: ' + (e.message || ''), 'error'); }
}

async function _kbResetOverrideKhoa(lockTaskId) {
    if (!confirm('Khôi phục mặc định?')) return;
    try {
        await apiCall('/api/schedule/user-override?user_id=' + _kbViewUserId + '&source_type=khoa&source_id=' + lockTaskId, { method: 'DELETE' });
        showToast('🔄 Đã khôi phục!', 'success');
        var om = document.getElementById('kbOverrideModal'); if (om) om.remove();
        var lm = document.getElementById('kbLockDetailModal'); if (lm) lm.remove();
        _kbInit();
    } catch(e) { showToast('Lỗi: ' + (e.message || ''), 'error'); }
}
