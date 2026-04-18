// ========== NHẮN TIN TÌM ĐỐI TÁC KH ==========
let _po = { entries:[], categories:[], members:[], stats:{}, selectedUser:null, selectedDept:null, imageData:null };

function _poInit() {
    if (window.location.pathname !== '/nhantintimdoitackh') return;
    const area = document.getElementById('contentArea');
    if (!area) return;
    area.innerHTML = `
    <div style="display:flex;gap:0;min-height:calc(100vh - 60px);">
        <div id="poSidebar" style="width:260px;min-width:260px;background:#f8fafc;border-right:1px solid #e5e7eb;padding:16px 12px;overflow-y:auto;"></div>
        <div style="flex:1;padding:20px 24px;overflow-y:auto;">
            <div id="poStats" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;"></div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h2 style="margin:0;font-size:18px;color:#122546;">📋 Danh sách hôm nay</h2>
                <div style="display:flex;gap:8px;">
                    ${currentUser?.role==='giam_doc'?'<button onclick="_poCatModal()" style="padding:8px 16px;border:1px solid #6366f1;border-radius:8px;background:#eef2ff;color:#6366f1;cursor:pointer;font-weight:600;font-size:13px;">⚙️ Lĩnh Vực</button>':''}
                    <button onclick="_poAddModal()" style="padding:8px 20px;border:none;border-radius:8px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;cursor:pointer;font-weight:700;font-size:13px;box-shadow:0 2px 8px rgba(37,99,235,0.3);">＋ Thêm Đối Tác</button>
                </div>
            </div>
            <div id="poTable"></div>
        </div>
    </div>`;
    document.getElementById('pageTitle').textContent = 'Nhắn Tin Tìm Đối Tác KH';
    _poLoadAll();
}

async function _poLoadAll() {
    const [catRes, memRes] = await Promise.all([
        apiCall('/api/partner-outreach/categories'),
        apiCall('/api/partner-outreach/members')
    ]);
    _po.categories = catRes.categories || [];
    const depts = memRes.departments || [];
    _poRenderSidebar(depts);
    await _poLoadData();
}

async function _poLoadData() {
    let url = '/api/partner-outreach/entries?date=' + _poToday();
    if (_po.selectedUser) url += '&user_id=' + _po.selectedUser;
    else if (_po.selectedDept) url += '&dept_id=' + _po.selectedDept;
    const uid = _po.selectedUser || currentUser.id;
    const [entRes, stRes] = await Promise.all([
        apiCall(url),
        apiCall('/api/partner-outreach/stats?user_id=' + uid)
    ]);
    _po.entries = entRes.entries || [];
    _po.stats = stRes;
    _poRenderStats();
    _poRenderTable();
}

function _poToday() {
    const n = new Date(); n.setHours(n.getHours()+7);
    return n.toISOString().split('T')[0];
}

function _poRenderSidebar(depts) {
    const sb = document.getElementById('poSidebar');
    if (!sb) return;
    const role = currentUser.role;
    if (role === 'nhan_vien' || role === 'part_time') { sb.style.display = 'none'; return; }
    let h = `<div style="font-size:14px;font-weight:700;color:#122546;margin-bottom:12px;">📂 Phòng Ban / NV</div>`;
    h += `<div onclick="_poSelectAll()" style="padding:8px 12px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;margin-bottom:8px;background:${!_po.selectedUser&&!_po.selectedDept?'#2563eb':'#f1f5f9'};color:${!_po.selectedUser&&!_po.selectedDept?'white':'#374151'};">📊 Tất cả</div>`;
    (depts||[]).forEach(d => {
        const dActive = _po.selectedDept==d.id && !_po.selectedUser;
        h += `<div style="margin-bottom:4px;">
            <div onclick="_poSelectDept(${d.id})" style="padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700;color:${dActive?'#2563eb':'#6b7280'};background:${dActive?'#eff6ff':'transparent'};text-transform:uppercase;">${d.name} (${d.members.length})</div>`;
        d.members.forEach(m => {
            const active = _po.selectedUser == m.id;
            h += `<div onclick="_poSelectUser(${m.id})" style="padding:6px 12px 6px 24px;border-radius:6px;cursor:pointer;font-size:13px;background:${active?'#122546':'transparent'};color:${active?'white':'#374151'};font-weight:${active?'600':'400'};">${m.full_name}</div>`;
        });
        h += '</div>';
    });
    sb.innerHTML = h;
}

function _poSelectAll() { _po.selectedUser=null; _po.selectedDept=null; _poLoadData(); _poLoadAll(); }
function _poSelectDept(id) { _po.selectedUser=null; _po.selectedDept=id; _poLoadData(); _poLoadAll(); }
function _poSelectUser(id) { _po.selectedUser=id; _po.selectedDept=null; _poLoadData(); _poLoadAll(); }

function _poRenderStats() {
    const s = _po.stats;
    const el = document.getElementById('poStats');
    if (!el) return;
    const cards = [
        { label:'Hôm Nay', val:`${s.today||0}/${s.target||20}`, bg:'linear-gradient(135deg,#3b82f6,#2563eb)', icon:'📊' },
        { label:'Tuần Này', val:s.week||0, bg:'linear-gradient(135deg,#f59e0b,#d97706)', icon:'📅' },
        { label:'Tháng Này', val:s.month||0, bg:'linear-gradient(135deg,#8b5cf6,#7c3aed)', icon:'📆' },
        { label:'Đã Chuyển CRM', val:s.transferred||0, bg:'linear-gradient(135deg,#10b981,#059669)', icon:'🔄' },
    ];
    el.innerHTML = cards.map(c => `
        <div style="flex:1;min-width:180px;background:${c.bg};border-radius:14px;padding:18px 20px;color:white;box-shadow:0 4px 15px rgba(0,0,0,0.15);">
            <div style="font-size:28px;margin-bottom:4px;">${c.icon}</div>
            <div style="font-size:28px;font-weight:900;">${c.val}</div>
            <div style="font-size:12px;opacity:0.9;font-weight:600;margin-top:2px;">${c.label}</div>
        </div>`).join('');
}

function _poRenderTable() {
    const el = document.getElementById('poTable');
    if (!el) return;
    const rows = _po.entries;
    if (!rows.length) { el.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">Chưa có dữ liệu hôm nay</div>'; return; }
    const isOwner = (uid) => uid === currentUser.id;
    const today = _poToday();
    let h = `<table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb;">
            <th style="padding:10px 8px;text-align:center;width:40px;">STT</th>
            <th style="padding:10px 8px;">TÊN KHÁCH</th>
            <th style="padding:10px 8px;">LINK FACEBOOK</th>
            <th style="padding:10px 8px;">SĐT</th>
            <th style="padding:10px 8px;">LĨNH VỰC</th>
            <th style="padding:10px 8px;text-align:center;">ẢNH TIN NHẮN</th>
            <th style="padding:10px 8px;text-align:center;">THAO TÁC</th>
        </tr></thead><tbody>`;
    rows.forEach((r, i) => {
        const catBadge = r.category_name ? `<span style="background:${r.category_color||'#e5e7eb'};color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">${r.category_name}</span>` : '-';
        const imgBtn = r.image_path ? `<a href="${r.image_path}" target="_blank" style="color:#2563eb;font-weight:600;">📷 Xem</a>` : '<span style="color:#d1d5db;">—</span>';
        const fbShort = r.fb_link.length > 30 ? r.fb_link.substring(0,30)+'...' : r.fb_link;
        const entryDate = typeof r.entry_date === 'string' ? r.entry_date.split('T')[0] : r.entry_date;
        let actions = '';
        if (r.transferred_to_crm) {
            actions = '<span style="background:#dcfce7;color:#16a34a;padding:3px 10px;border-radius:8px;font-size:11px;font-weight:700;">✅ Đã CRM</span>';
        } else {
            actions += `<button onclick="_poTransfer(${r.id})" style="padding:3px 8px;border:1px solid #10b981;border-radius:6px;background:#ecfdf5;color:#059669;cursor:pointer;font-size:11px;font-weight:600;margin-right:4px;" title="Chuyển vào CRM TTK">🔄 CRM</button>`;
            if (isOwner(r.user_id) && entryDate === today) {
                actions += `<button onclick="_poEditModal(${r.id})" style="padding:3px 8px;border:1px solid #d1d5db;border-radius:6px;background:white;cursor:pointer;font-size:11px;margin-right:4px;">✏️</button>`;
                actions += `<button onclick="_poDelete(${r.id})" style="padding:3px 8px;border:1px solid #fecaca;border-radius:6px;background:#fff5f5;color:#dc2626;cursor:pointer;font-size:11px;">🗑️</button>`;
            }
        }
        const showUser = (_po.selectedUser !== r.user_id && !['nhan_vien','part_time'].includes(currentUser.role)) ? `<div style="font-size:10px;color:#6b7280;">${r.user_name||''}</div>` : '';
        h += `<tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:10px 8px;text-align:center;font-weight:700;color:#6b7280;">${i+1}</td>
            <td style="padding:10px 8px;font-weight:600;color:#122546;">${r.partner_name}${showUser}</td>
            <td style="padding:10px 8px;"><a href="${r.fb_link}" target="_blank" style="color:#2563eb;">${fbShort}</a></td>
            <td style="padding:10px 8px;">${r.phone||'—'}</td>
            <td style="padding:10px 8px;">${catBadge}</td>
            <td style="padding:10px 8px;text-align:center;">${imgBtn}</td>
            <td style="padding:10px 8px;text-align:center;white-space:nowrap;">${actions}</td>
        </tr>`;
    });
    h += '</tbody></table>';
    el.innerHTML = h;
}

function _poAddModal(editEntry) {
    const isEdit = !!editEntry;
    _po.imageData = null;
    document.getElementById('poModal')?.remove();
    const catOpts = _po.categories.map(c => `<option value="${c.id}" ${editEntry?.category_id==c.id?'selected':''}>${c.name}</option>`).join('');
    const m = document.createElement('div'); m.id = 'poModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    m.onclick = e => { if(e.target===m) m.remove(); };
    m.innerHTML = `
    <div style="background:white;border-radius:16px;width:min(500px,92vw);max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
        <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:20px 24px;border-radius:16px 16px 0 0;color:white;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="font-size:18px;font-weight:800;">${isEdit?'✏️ Sửa':'＋ Thêm'} Đối Tác</div>
                <button onclick="document.getElementById('poModal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;">×</button>
            </div>
        </div>
        <div style="padding:24px;">
            <div style="margin-bottom:14px;">
                <label style="font-weight:600;font-size:13px;color:#374151;">Tên Đối Tác / KH <span style="color:#dc2626;">*</span></label>
                <input id="poFName" value="${editEntry?.partner_name||''}" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;margin-top:4px;box-sizing:border-box;" placeholder="VD: Nguyễn Văn A">
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-weight:600;font-size:13px;color:#374151;">Link Facebook <span style="color:#dc2626;">*</span></label>
                <input id="poFFb" value="${editEntry?.fb_link||''}" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;margin-top:4px;box-sizing:border-box;" placeholder="https://fb.com/...">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                <div>
                    <label style="font-weight:600;font-size:13px;color:#374151;">SĐT (nếu có)</label>
                    <input id="poFPhone" value="${editEntry?.phone||''}" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;margin-top:4px;box-sizing:border-box;" placeholder="09xx...">
                </div>
                <div>
                    <label style="font-weight:600;font-size:13px;color:#374151;">Lĩnh Vực</label>
                    <select id="poFCat" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;margin-top:4px;box-sizing:border-box;">
                        <option value="">-- Chọn --</option>${catOpts}
                    </select>
                </div>
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-weight:600;font-size:13px;color:#374151;">Hình Ảnh <span style="color:#dc2626;">*</span> (Ctrl+V để dán)</label>
                <div id="poFImgZone" tabindex="0" style="margin-top:4px;border:2px dashed #fde68a;border-radius:10px;padding:24px;text-align:center;cursor:pointer;background:#fffbeb;min-height:80px;outline:none;transition:border-color .2s;" onclick="this.focus()">
                    <div id="poFImgPreview" style="font-size:13px;color:#92400e;">📋 Click vào đây rồi Ctrl+V để dán hình ảnh</div>
                </div>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:12px;border-top:1px solid #f3f4f6;">
                <button onclick="document.getElementById('poModal').remove()" style="padding:9px 18px;border:1px solid #d1d5db;border-radius:8px;background:white;color:#374151;cursor:pointer;font-size:13px;">Hủy</button>
                <button onclick="_poSave(${editEntry?.id||'null'})" style="padding:9px 22px;border:none;border-radius:8px;background:#2563eb;color:white;cursor:pointer;font-size:13px;font-weight:700;">💾 ${isEdit?'Cập Nhật':'Ghi Nhận'}</button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(m);
    // Paste handler
    const zone = document.getElementById('poFImgZone');
    zone.addEventListener('paste', e => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                const reader = new FileReader();
                reader.onload = ev => {
                    _po.imageData = ev.target.result;
                    document.getElementById('poFImgPreview').innerHTML = `<img src="${ev.target.result}" style="max-width:100%;max-height:200px;border-radius:8px;">`;
                    zone.style.borderColor = '#10b981';
                };
                reader.readAsDataURL(file);
                break;
            }
        }
    });
    if (editEntry?.image_path) {
        document.getElementById('poFImgPreview').innerHTML = `<img src="${editEntry.image_path}" style="max-width:100%;max-height:200px;border-radius:8px;">`;
    }
}

function _poEditModal(id) {
    const entry = _po.entries.find(e => e.id === id);
    if (!entry) return;
    _poAddModal(entry);
}

async function _poSave(editId) {
    const name = document.getElementById('poFName').value.trim();
    const fb = document.getElementById('poFFb').value.trim();
    const phone = document.getElementById('poFPhone').value.trim();
    const catId = document.getElementById('poFCat').value;
    if (!name || !fb) { showToast('Vui lòng nhập tên và link FB!', 'error'); return; }
    if (!editId && !_po.imageData) { showToast('Vui lòng dán hình ảnh chụp tin nhắn!', 'error'); return; }
    const payload = { partner_name: name, fb_link: fb, phone, category_id: catId || null, image_data: _po.imageData };
    try {
        if (editId) await apiCall('/api/partner-outreach/entries/' + editId, 'PUT', payload);
        else await apiCall('/api/partner-outreach/entries', 'POST', payload);
        document.getElementById('poModal')?.remove();
        showToast('✅ ' + (editId ? 'Đã cập nhật!' : 'Đã thêm đối tác!'));
        _poLoadData();
    } catch(e) { showToast(e.message || 'Lỗi', 'error'); }
}

async function _poDelete(id) {
    if (!confirm('Xóa entry này?')) return;
    try {
        await apiCall('/api/partner-outreach/entries/' + id, 'DELETE');
        showToast('✅ Đã xóa'); _poLoadData();
    } catch(e) { showToast(e.message || 'Lỗi', 'error'); }
}

async function _poTransfer(id) {
    if (!confirm('Chuyển đối tác này vào CRM Tự Tìm Kiếm?')) return;
    try {
        await apiCall('/api/partner-outreach/entries/' + id + '/transfer', 'POST');
        showToast('✅ Đã chuyển vào CRM TTK'); _poLoadData();
    } catch(e) { showToast(e.message || 'Lỗi', 'error'); }
}

function _poCatModal() {
    document.getElementById('poCatModal')?.remove();
    const m = document.createElement('div'); m.id = 'poCatModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
    m.onclick = e => { if(e.target===m) m.remove(); };
    let listHtml = _po.categories.map(c => `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f8fafc;border-radius:8px;margin-bottom:6px;">
            <span style="width:16px;height:16px;border-radius:50%;background:${c.color};flex-shrink:0;"></span>
            <span style="flex:1;font-weight:600;font-size:13px;">${c.name}</span>
            <button onclick="_poCatDel(${c.id})" style="padding:2px 8px;border:1px solid #fecaca;border-radius:4px;background:#fff5f5;color:#dc2626;cursor:pointer;font-size:11px;">🗑️</button>
        </div>`).join('');
    m.innerHTML = `
    <div style="background:white;border-radius:16px;width:min(420px,92vw);box-shadow:0 20px 60px rgba(0,0,0,0.25);">
        <div style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:18px 24px;border-radius:16px 16px 0 0;color:white;display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:16px;font-weight:800;">⚙️ Quản Lý Lĩnh Vực</div>
            <button onclick="document.getElementById('poCatModal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer;">×</button>
        </div>
        <div style="padding:20px 24px;">
            <div style="margin-bottom:14px;">${listHtml||'<div style="color:#9ca3af;text-align:center;">Chưa có lĩnh vực</div>'}</div>
            <div style="display:flex;gap:8px;">
                <input id="poCatName" placeholder="Tên lĩnh vực mới..." style="flex:1;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;">
                <input id="poCatColor" type="color" value="#3b82f6" style="width:40px;height:36px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;">
                <button onclick="_poCatAdd()" style="padding:8px 16px;border:none;border-radius:8px;background:#16a34a;color:white;cursor:pointer;font-weight:700;font-size:13px;">＋</button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(m);
}

async function _poCatAdd() {
    const name = document.getElementById('poCatName').value.trim();
    const color = document.getElementById('poCatColor').value;
    if (!name) return;
    try {
        await apiCall('/api/partner-outreach/categories', 'POST', { name, color });
        showToast('✅ Đã thêm'); document.getElementById('poCatModal')?.remove();
        const res = await apiCall('/api/partner-outreach/categories');
        _po.categories = res.categories || [];
        _poCatModal();
    } catch(e) { showToast(e.message||'Lỗi','error'); }
}

async function _poCatDel(id) {
    if (!confirm('Xóa lĩnh vực này?')) return;
    try {
        await apiCall('/api/partner-outreach/categories/' + id, 'DELETE');
        showToast('✅ Đã xóa'); document.getElementById('poCatModal')?.remove();
        const res = await apiCall('/api/partner-outreach/categories');
        _po.categories = res.categories || [];
        _poCatModal();
    } catch(e) { showToast(e.message||'Lỗi','error'); }
}

// Hook into SPA router
(function() {
    const origHandleRoute = window.handleRoute;
    if (origHandleRoute) {
        window.handleRoute = function() {
            origHandleRoute.apply(this, arguments);
            if (window.location.pathname === '/nhantintimdoitackh') _poInit();
        };
    }
    if (window.location.pathname === '/nhantintimdoitackh') {
        setTimeout(_poInit, 100);
    }
})();
