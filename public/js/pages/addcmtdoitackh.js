// ========== ADD/CMT ĐỐI TÁC KH ==========
let _ac = { entries:[], members:[], stats:{}, selectedUser:null, selectedDept:null, imageData:null, scheduleInfo:null };

function _acIsViewingSelf() {
    if (_ac.selectedUser) return _ac.selectedUser === currentUser.id;
    if (_ac.selectedDept) return false;
    if (['nhan_vien','part_time'].includes(currentUser.role)) return true;
    return false;
}

function _acInit() {
    if (window.location.pathname !== '/addcmtdoitackh') return;
    const area = document.getElementById('contentArea');
    if (!area) return;
    area.innerHTML = `
    <div style="display:flex;gap:0;min-height:calc(100vh - 60px);">
        <div id="acSidebar" style="width:260px;min-width:260px;background:#f8fafc;border-right:1px solid #e5e7eb;padding:16px 12px;overflow-y:auto;"></div>
        <div style="flex:1;padding:20px 24px;overflow-y:auto;">
            <div id="acStats" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;"></div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h2 style="margin:0;font-size:18px;color:#122546;">📋 Danh sách hôm nay</h2>
                <div id="acActionBtns" style="display:flex;gap:8px;align-items:center;"></div>
            </div>
            <div id="acTable"></div>
        </div>
    </div>
    <div id="acLightbox" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:99999;align-items:center;justify-content:center;cursor:zoom-out;" onclick="_acCloseLB()">
        <img id="acLBImg" src="" style="max-width:95vw;max-height:95vh;object-fit:contain;border-radius:8px;box-shadow:0 0 40px rgba(0,0,0,0.5);transition:transform .3s;" onclick="event.stopPropagation()">
        <button onclick="_acCloseLB()" style="position:absolute;top:20px;right:24px;background:rgba(255,255,255,0.15);border:none;color:white;width:44px;height:44px;border-radius:50%;font-size:22px;cursor:pointer;backdrop-filter:blur(8px);">✕</button>
        <div style="position:absolute;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:10px;">
            <button onclick="event.stopPropagation();document.getElementById('acLBImg').style.transform='scale(1.8)'" style="background:rgba(255,255,255,0.15);border:none;color:white;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700;backdrop-filter:blur(8px);">🔍+ Phóng to</button>
            <button onclick="event.stopPropagation();document.getElementById('acLBImg').style.transform='scale(1)'" style="background:rgba(255,255,255,0.15);border:none;color:white;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700;backdrop-filter:blur(8px);">↺ Gốc</button>
        </div>
    </div>`;
    if (!document.getElementById('_acLBCSS')) {
        const st = document.createElement('style'); st.id = '_acLBCSS';
        st.textContent = `.ac-thumb{width:52px;height:52px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid #e2e8f0;transition:all .2s;box-shadow:0 1px 4px rgba(0,0,0,0.08)}.ac-thumb:hover{transform:scale(1.15);border-color:#16a34a;box-shadow:0 4px 16px rgba(22,163,74,0.25)}#acLightbox.active{display:flex!important;animation:_acFI .2s}@keyframes _acFI{from{opacity:0}to{opacity:1}}@keyframes _acPulse{0%,100%{box-shadow:0 3px 12px rgba(22,163,74,0.4)}50%{box-shadow:0 3px 20px rgba(22,163,74,0.7)}}`;
        document.head.appendChild(st);
    }
    document.getElementById('pageTitle').textContent = 'Add/Cmt Đối Tác KH';
    _acLoadAll();
}

function _acOpenLB(src) { const lb=document.getElementById('acLightbox'),img=document.getElementById('acLBImg'); img.src=src; img.style.transform='scale(1)'; lb.classList.add('active'); document.body.style.overflow='hidden'; }
function _acCloseLB() { document.getElementById('acLightbox')?.classList.remove('active'); document.body.style.overflow=''; }

async function _acLoadAll() {
    const memRes = await apiCall('/api/addcmt/members');
    _acRenderSidebar(memRes.departments || []);
    await _acLoadData();
}

async function _acLoadData() {
    let url = '/api/addcmt/entries?date=' + _acToday();
    if (_ac.selectedUser) url += '&user_id=' + _ac.selectedUser;
    else if (_ac.selectedDept) url += '&dept_id=' + _ac.selectedDept;
    const uid = _ac.selectedUser || currentUser.id;
    const [eRes, sRes] = await Promise.all([apiCall(url), apiCall('/api/addcmt/stats?user_id=' + uid)]);
    _ac.entries = eRes.entries || [];
    _ac.stats = sRes;
    // Load schedule info for report
    try { _ac.scheduleInfo = await apiCall('/api/addcmt/schedule-info?user_id=' + uid); } catch(e) { _ac.scheduleInfo = null; }
    _acRenderStats();
    _acRenderTable();
    _acUpdateActions();
}

function _acToday() { const n = new Date(); n.setHours(n.getHours()+7); return n.toISOString().split('T')[0]; }

function _acRenderSidebar(depts) {
    const sb = document.getElementById('acSidebar');
    if (!sb) return;
    const role = currentUser.role;
    if (role === 'nhan_vien' || role === 'part_time') { sb.style.display = 'none'; return; }
    let h = `<div style="font-size:14px;font-weight:700;color:#122546;margin-bottom:12px;">📂 Phòng Ban / NV</div>`;
    h += `<div onclick="_acSelAll()" style="padding:8px 12px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;margin-bottom:8px;background:${!_ac.selectedUser&&!_ac.selectedDept?'#16a34a':'#f1f5f9'};color:${!_ac.selectedUser&&!_ac.selectedDept?'white':'#374151'};">📊 Tất cả</div>`;
    (depts||[]).forEach(d => {
        const dA = _ac.selectedDept==d.id && !_ac.selectedUser;
        h += `<div style="margin-bottom:4px;"><div onclick="_acSelDept(${d.id})" style="padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700;color:${dA?'#16a34a':'#6b7280'};background:${dA?'#f0fdf4':'transparent'};text-transform:uppercase;">${d.name} (${d.members.length})</div>`;
        d.members.forEach(m => {
            const a = _ac.selectedUser == m.id;
            h += `<div onclick="_acSelUser(${m.id})" style="padding:6px 12px 6px 24px;border-radius:6px;cursor:pointer;font-size:13px;background:${a?'#122546':'transparent'};color:${a?'white':'#374151'};font-weight:${a?'600':'400'};">${m.full_name}</div>`;
        });
        h += '</div>';
    });
    sb.innerHTML = h;
}

function _acSelAll() { _ac.selectedUser=null; _ac.selectedDept=null; _acLoadAll(); }
function _acSelDept(id) { _ac.selectedUser=null; _ac.selectedDept=id; _acLoadAll(); }
function _acSelUser(id) { _ac.selectedUser=id; _ac.selectedDept=null; _acLoadAll(); }

function _acUpdateActions() {
    const el = document.getElementById('acActionBtns');
    if (!el) return;
    const canAdd = _acIsViewingSelf();
    let h = '';
    if (canAdd) {
        h += '<button onclick="_acAddModal()" style="padding:8px 20px;border:none;border-radius:8px;background:linear-gradient(135deg,#16a34a,#15803d);color:white;cursor:pointer;font-weight:700;font-size:13px;box-shadow:0 2px 8px rgba(22,163,74,0.3);">＋ Báo cáo công việc</button>';
    } else if (_ac.selectedDept || (!_ac.selectedUser && !['nhan_vien','part_time'].includes(currentUser.role))) {
        h += '<span style="padding:8px 16px;border-radius:8px;background:#f1f5f9;color:#64748b;font-size:12px;font-weight:600;border:1px solid #e2e8f0;">👁️ Chế độ xem tổng hợp</span>';
    }
    el.innerHTML = h;
}

function _acRenderStats() {
    const s = _ac.stats, el = document.getElementById('acStats');
    if (!el) return;
    const si = _ac.scheduleInfo;
    const target = si?.found ? si.min_quantity : (s.target || 20);
    const todayDone = si?.found ? si.today_count : (s.today || 0);
    const isSelf = _acIsViewingSelf();

    // Report button — CHỈ hiện khi xem chính tài khoản mình
    let reportHtml = '';
    if (si?.found && isSelf) {
        if (si.report) {
            if (si.report.status === 'approved') reportHtml = '<span style="background:#dcfce7;color:#059669;padding:4px 12px;border-radius:8px;font-size:11px;font-weight:700;">✅ Đã duyệt</span>';
            else if (si.report.status === 'pending') reportHtml = '<span style="background:#fef3c7;color:#d97706;padding:4px 12px;border-radius:8px;font-size:11px;font-weight:700;">⏳ Chờ duyệt</span>';
            else if (si.report.status === 'rejected') {
                reportHtml = '<span style="background:#fecaca;color:#dc2626;padding:4px 12px;border-radius:8px;font-size:11px;font-weight:700;">❌ Từ chối</span>';
                reportHtml += ` <button onclick="_acSubmitReport()" style="padding:6px 16px;border:none;border-radius:8px;background:linear-gradient(135deg,#dc2626,#991b1b);color:white;cursor:pointer;font-weight:700;font-size:12px;">🔄 Nộp lại</button>`;
            }
        } else if (todayDone > 0) {
            reportHtml = `<button onclick="_acSubmitReport()" style="padding:6px 16px;border:none;border-radius:8px;background:linear-gradient(135deg,#16a34a,#15803d);color:white;cursor:pointer;font-weight:700;font-size:12px;animation:_acPulse 2s infinite;">📤 Báo Cáo (${todayDone})</button>`;
        }
    }

    el.innerHTML = [
        { l:'Hôm Nay', v:`${todayDone}/${target}`, bg:'linear-gradient(135deg,#16a34a,#15803d)', icon:'📊' },
        { l:'Tuần Này', v:s.week||0, bg:'linear-gradient(135deg,#f59e0b,#d97706)', icon:'📅' },
        { l:'Tháng Này', v:s.month||0, bg:'linear-gradient(135deg,#8b5cf6,#7c3aed)', icon:'📆' },
    ].map(c => `<div style="flex:1;min-width:200px;background:${c.bg};border-radius:14px;padding:18px 20px;color:white;box-shadow:0 4px 15px rgba(0,0,0,0.15);"><div style="font-size:28px;margin-bottom:4px;">${c.icon}</div><div style="font-size:28px;font-weight:900;">${c.v}</div><div style="font-size:12px;opacity:0.9;font-weight:600;margin-top:2px;">${c.l}</div></div>`).join('')
    + (reportHtml ? `<div style="width:100%;display:flex;align-items:center;gap:8px;margin-top:4px;">${reportHtml}</div>` : '');
}

async function _acSubmitReport() {
    const si = _ac.scheduleInfo;
    if (!si?.found) { showToast('Không tìm thấy CV trong Lịch Khóa Biểu!', 'error'); return; }
    if (si.today_count === 0) { showToast('Chưa có link nào hôm nay!', 'error'); return; }
    const today = _acToday();
    const isRedo = si.report && si.report.status === 'rejected';
    try {
        const formData = new FormData();
        formData.append('quantity', si.today_count);
        formData.append('content', `Add/Cmt Đối Tác: ${si.today_count} link`);
        formData.append('report_value', window.location.origin + '/addcmtdoitackh');
        const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        let resp;
        if (isRedo) {
            resp = await fetch(`/api/schedule/report/${si.report.id}/redo`, { method: 'PUT', body: formData, headers });
        } else {
            formData.append('template_id', si.template_id);
            formData.append('report_date', today);
            resp = await fetch('/api/schedule/report', { method: 'POST', body: formData, headers });
        }
        const data = await resp.json();
        if (data.success) { showToast(isRedo ? '🔄 Đã nộp lại!' : '✅ Đã báo cáo!'); await _acLoadData(); }
        else showToast('Lỗi: ' + (data.error || ''), 'error');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

function _acRenderTable() {
    const el = document.getElementById('acTable');
    if (!el) return;
    const rows = _ac.entries;
    if (!rows.length) { el.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">Chưa có dữ liệu hôm nay</div>'; return; }
    const today = _acToday();
    const showUserCol = !_ac.selectedUser && !['nhan_vien','part_time'].includes(currentUser.role);
    let h = `<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb;">
        <th style="padding:10px 8px;text-align:center;width:50px;">STT</th>
        ${showUserCol ? '<th style="padding:10px 8px;">NHÂN VIÊN</th>' : ''}
        <th style="padding:10px 8px;text-align:center;">ẢNH CHỤP MÀN HÌNH</th>
        <th style="padding:10px 8px;text-align:center;width:80px;">XÓA</th>
    </tr></thead><tbody>`;
    rows.forEach((r, i) => {
        const ed = typeof r.entry_date === 'string' ? r.entry_date.split('T')[0] : r.entry_date;
        const canDel = (r.user_id === currentUser.id && ed === today) || currentUser.role === 'giam_doc';
        const imgCell = r.image_path
            ? `<img src="${r.image_path}" class="ac-thumb" onclick="_acOpenLB('${r.image_path}')" alt="Ảnh" loading="lazy">`
            : '<span style="color:#d1d5db;">—</span>';
        h += `<tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:10px 8px;text-align:center;font-weight:700;color:#6b7280;">${i+1}</td>
            ${showUserCol ? `<td style="padding:10px 8px;font-size:12px;color:#6b7280;">${r.user_name||''}</td>` : ''}
            <td style="padding:10px 8px;text-align:center;">${imgCell}</td>
            <td style="padding:10px 8px;text-align:center;">${canDel ? `<button onclick="_acDel(${r.id})" style="padding:3px 8px;border:1px solid #fecaca;border-radius:6px;background:#fff5f5;color:#dc2626;cursor:pointer;font-size:11px;">🗑️</button>` : ''}</td>
        </tr>`;
    });
    h += '</tbody></table>';
    el.innerHTML = h;
}

function _acAddModal() {
    _ac.imageData = null;
    document.getElementById('acModal')?.remove();
    const m = document.createElement('div'); m.id = 'acModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    m.onclick = e => { if(e.target===m) m.remove(); };
    m.innerHTML = `
    <div style="background:white;border-radius:16px;width:min(480px,92vw);box-shadow:0 20px 60px rgba(0,0,0,0.25);">
        <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:20px 24px;border-radius:16px 16px 0 0;color:white;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="font-size:18px;font-weight:800;">📷 Báo cáo công việc - Add/Cmt</div>
                <button onclick="document.getElementById('acModal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;">×</button>
            </div>
        </div>
        <div style="padding:24px;">
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-weight:600;font-size:13px;color:#374151;">Hình Ảnh <span style="color:#dc2626;">*</span> (Ctrl+V để dán)</label>
                <div id="acFImgZone" tabindex="0" style="margin-top:4px;border:2px dashed #86efac;border-radius:10px;padding:20px;text-align:center;cursor:pointer;background:#f0fdf4;min-height:70px;outline:none;transition:border-color .2s;" onclick="this.focus()">
                    <div id="acFImgPreview" style="font-size:13px;color:#166534;">📋 Click vào đây rồi Ctrl+V để dán ảnh chụp màn hình</div>
                </div>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
                <button onclick="document.getElementById('acModal').remove()" style="padding:9px 18px;border:1px solid #d1d5db;border-radius:8px;background:white;color:#374151;cursor:pointer;font-size:13px;">Hủy</button>
                <button onclick="_acSave()" style="padding:9px 22px;border:none;border-radius:8px;background:#16a34a;color:white;cursor:pointer;font-size:13px;font-weight:700;">💾 Lưu</button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(m);
    // Paste handler
    const zone = document.getElementById('acFImgZone');
    zone.addEventListener('paste', e => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                const reader = new FileReader();
                reader.onload = ev => {
                    _ac.imageData = ev.target.result;
                    document.getElementById('acFImgPreview').innerHTML = `<img src="${ev.target.result}" style="max-width:100%;max-height:200px;border-radius:8px;">`;
                    zone.style.borderColor = '#16a34a';
                };
                reader.readAsDataURL(file);
                break;
            }
        }
    });
    setTimeout(() => document.getElementById('acFImgZone')?.focus(), 100);
}

async function _acSave() {
    if (!_ac.imageData) { showToast('Vui lòng dán hình ảnh chụp màn hình!', 'error'); return; }
    try {
        await apiCall('/api/addcmt/entries', 'POST', { fb_link: 'addcmt_' + Date.now(), image_data: _ac.imageData });
        document.getElementById('acModal')?.remove();
        showToast('✅ Đã báo cáo!');
        _acLoadData();
    } catch(e) { showToast(e.message || 'Lỗi', 'error'); }
}

async function _acDel(id) {
    if (!confirm('Xóa link này?')) return;
    try { await apiCall('/api/addcmt/entries/' + id, 'DELETE'); showToast('✅ Đã xóa'); _acLoadData(); }
    catch(e) { showToast(e.message || 'Lỗi', 'error'); }
}


