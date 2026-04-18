// ========== ADD/CMT ĐỐI TÁC KH ==========
let _ac = { entries:[], members:[], stats:{}, selectedUser:null, selectedDept:null };

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
                <h2 style="margin:0;font-size:18px;color:#122546;">📋 Danh sách link hôm nay</h2>
                <button onclick="_acAddModal()" style="padding:8px 20px;border:none;border-radius:8px;background:linear-gradient(135deg,#16a34a,#15803d);color:white;cursor:pointer;font-weight:700;font-size:13px;box-shadow:0 2px 8px rgba(22,163,74,0.3);">＋ Thêm Link</button>
            </div>
            <div id="acTable"></div>
        </div>
    </div>`;
    document.getElementById('pageTitle').textContent = 'Add/Cmt Đối Tác KH';
    _acLoadAll();
}

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
    _acRenderStats();
    _acRenderTable();
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

function _acRenderStats() {
    const s = _ac.stats, el = document.getElementById('acStats');
    if (!el) return;
    el.innerHTML = [
        { l:'Hôm Nay', v:`${s.today||0}/${s.target||20}`, bg:'linear-gradient(135deg,#16a34a,#15803d)', icon:'📊' },
        { l:'Tuần Này', v:s.week||0, bg:'linear-gradient(135deg,#f59e0b,#d97706)', icon:'📅' },
        { l:'Tháng Này', v:s.month||0, bg:'linear-gradient(135deg,#8b5cf6,#7c3aed)', icon:'📆' },
    ].map(c => `<div style="flex:1;min-width:200px;background:${c.bg};border-radius:14px;padding:18px 20px;color:white;box-shadow:0 4px 15px rgba(0,0,0,0.15);"><div style="font-size:28px;margin-bottom:4px;">${c.icon}</div><div style="font-size:28px;font-weight:900;">${c.v}</div><div style="font-size:12px;opacity:0.9;font-weight:600;margin-top:2px;">${c.l}</div></div>`).join('');
}

function _acRenderTable() {
    const el = document.getElementById('acTable');
    if (!el) return;
    const rows = _ac.entries;
    if (!rows.length) { el.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">Chưa có dữ liệu hôm nay</div>'; return; }
    const today = _acToday();
    let h = `<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb;">
        <th style="padding:10px 8px;text-align:center;width:50px;">STT</th>
        <th style="padding:10px 8px;">LINK FACEBOOK (Add/Comment)</th>
        ${!_ac.selectedUser && !['nhan_vien','part_time'].includes(currentUser.role) ? '<th style="padding:10px 8px;">NHÂN VIÊN</th>' : ''}
        <th style="padding:10px 8px;text-align:center;width:80px;">XÓA</th>
    </tr></thead><tbody>`;
    rows.forEach((r, i) => {
        const fbShort = r.fb_link.length > 60 ? r.fb_link.substring(0,60)+'...' : r.fb_link;
        const ed = typeof r.entry_date === 'string' ? r.entry_date.split('T')[0] : r.entry_date;
        const canDel = (r.user_id === currentUser.id && ed === today) || currentUser.role === 'giam_doc';
        const showUser = !_ac.selectedUser && !['nhan_vien','part_time'].includes(currentUser.role);
        h += `<tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:10px 8px;text-align:center;font-weight:700;color:#6b7280;">${i+1}</td>
            <td style="padding:10px 8px;"><a href="${r.fb_link}" target="_blank" style="color:#16a34a;font-weight:500;">${fbShort}</a></td>
            ${showUser ? `<td style="padding:10px 8px;font-size:12px;color:#6b7280;">${r.user_name||''}</td>` : ''}
            <td style="padding:10px 8px;text-align:center;">${canDel ? `<button onclick="_acDel(${r.id})" style="padding:3px 8px;border:1px solid #fecaca;border-radius:6px;background:#fff5f5;color:#dc2626;cursor:pointer;font-size:11px;">🗑️</button>` : ''}</td>
        </tr>`;
    });
    h += '</tbody></table>';
    el.innerHTML = h;
}

function _acAddModal() {
    document.getElementById('acModal')?.remove();
    const m = document.createElement('div'); m.id = 'acModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    m.onclick = e => { if(e.target===m) m.remove(); };
    m.innerHTML = `
    <div style="background:white;border-radius:16px;width:min(480px,92vw);box-shadow:0 20px 60px rgba(0,0,0,0.25);">
        <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:20px 24px;border-radius:16px 16px 0 0;color:white;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="font-size:18px;font-weight:800;">＋ Thêm Link Add/Cmt</div>
                <button onclick="document.getElementById('acModal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;">×</button>
            </div>
        </div>
        <div style="padding:24px;">
            <label style="font-weight:600;font-size:13px;color:#374151;">Link Facebook <span style="color:#dc2626;">*</span></label>
            <input id="acFLink" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;margin-top:6px;box-sizing:border-box;" placeholder="https://facebook.com/..." autofocus>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px;">
                <button onclick="document.getElementById('acModal').remove()" style="padding:9px 18px;border:1px solid #d1d5db;border-radius:8px;background:white;color:#374151;cursor:pointer;font-size:13px;">Hủy</button>
                <button onclick="_acSave()" style="padding:9px 22px;border:none;border-radius:8px;background:#16a34a;color:white;cursor:pointer;font-size:13px;font-weight:700;">💾 Lưu</button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(m);
    setTimeout(() => document.getElementById('acFLink')?.focus(), 100);
}

async function _acSave() {
    const link = document.getElementById('acFLink').value.trim();
    if (!link) { showToast('Vui lòng nhập link FB!', 'error'); return; }
    try {
        await apiCall('/api/addcmt/entries', 'POST', { fb_link: link });
        document.getElementById('acModal')?.remove();
        showToast('✅ Đã thêm link!');
        _acLoadData();
    } catch(e) { showToast(e.message || 'Lỗi', 'error'); }
}

async function _acDel(id) {
    if (!confirm('Xóa link này?')) return;
    try { await apiCall('/api/addcmt/entries/' + id, 'DELETE'); showToast('✅ Đã xóa'); _acLoadData(); }
    catch(e) { showToast(e.message || 'Lỗi', 'error'); }
}

(function() {
    const orig = window.handleRoute;
    if (orig) { window.handleRoute = function() { orig.apply(this, arguments); if (window.location.pathname === '/addcmtdoitackh') _acInit(); }; }
    if (window.location.pathname === '/addcmtdoitackh') setTimeout(_acInit, 100);
})();
