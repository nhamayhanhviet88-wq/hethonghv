// ========== CÀI ĐẶT SẢN XUẤT PAGE — Central Hub ==========

let _cdsxCurrentTab = 'sp-qt';

async function renderCaidatsanxuatPage(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3>🏭 Cài Đặt Sản Xuất</h3>
            </div>
            <div class="card-body">
                <div class="tabs" style="flex-wrap:wrap;" id="cdsxTabs">
                    <div class="tab active" data-tab="sp-qt" onclick="switchCdsxTab('sp-qt', this)">📦 Sản Phẩm & Quy Trình</div>
                    <div class="tab" data-tab="kho-vai" onclick="switchCdsxTab('kho-vai', this)">🏬 Kho Vải</div>
                    <div class="tab" data-tab="luong-sx" onclick="switchCdsxTab('luong-sx', this)">💰 Lương Sản Xuất</div>
                    <div class="tab" data-tab="luong-tho-cat" onclick="switchCdsxTab('luong-tho-cat', this)">✂️ Lương Thợ Cắt</div>
                    <div class="tab" data-tab="luong-tho-ep" onclick="switchCdsxTab('luong-tho-ep', this)">🔥 Lương Thợ Ép</div>
                    <div class="tab" data-tab="bang-gia" onclick="switchCdsxTab('bang-gia', this)">💲 Bảng Giá May</div>
                    <div class="tab" data-tab="vi-tri-phoi" onclick="switchCdsxTab('vi-tri-phoi', this)">📌 Vị Trí Phối</div>
                    <div class="tab" data-tab="quyen-duyet" onclick="switchCdsxTab('quyen-duyet', this)">🔑 Quyền Duyệt TSAM</div>
                    <div class="tab" data-tab="nhac-nho" onclick="switchCdsxTab('nhac-nho', this)">🔔 Nhắc Nhở Công Việc</div>
                </div>
                <div id="cdsxContent">
                    <div class="text-center text-muted" style="padding:30px;">Đang tải...</div>
                </div>
            </div>
        </div>
    `;

    // Restore saved tab
    var savedTab = localStorage.getItem('cdsxActiveTab') || 'sp-qt';
    _cdsxCurrentTab = savedTab;
    var tabEl = document.querySelector('#cdsxTabs .tab[data-tab="' + savedTab + '"]');
    if (tabEl) {
        document.querySelectorAll('#cdsxTabs .tab').forEach(function(t) { t.classList.remove('active'); });
        tabEl.classList.add('active');
    }
    await switchCdsxTab(savedTab, tabEl || document.querySelector('#cdsxTabs .tab'));
}

async function switchCdsxTab(tab, el) {
    _cdsxCurrentTab = tab;
    localStorage.setItem('cdsxActiveTab', tab);
    document.querySelectorAll('#cdsxTabs .tab').forEach(function(t) { t.classList.remove('active'); });
    if (el) el.classList.add('active');

    var content = document.getElementById('cdsxContent');
    if (!content) return;

    // Tab routing
    switch (tab) {
        case 'sp-qt':
            await _cdsxLoadSpQt(content);
            break;
        case 'kho-vai':
            await _cdsxLoadKhoVai(content);
            break;
        case 'luong-sx':
            _cdsxLoadShell(content, '💰', 'Lương Sản Xuất', 'Cấu hình bảng lương cho công nhân sản xuất');
            break;
        case 'luong-tho-cat':
            await _cdsxLoadLuongThoCat(content);
            break;
        case 'luong-tho-ep':
            await _cdsxLoadLuongThoEp(content);
            break;
        case 'bang-gia':
            await _cdsxLoadBangGia(content);
            break;
        case 'vi-tri-phoi':
            await _cdsxLoadViTriPhoi(content);
            break;
        case 'nhac-nho':
            await _cdsxLoadNhacNho(content);
            break;
        case 'quyen-duyet':
            await _cdsxLoadQuyenDuyet(content);
            break;
        default:
            _cdsxLoadShell(content, '🔧', tab, 'Tab chưa được cấu hình');
    }
}

// ===== SP & QT Tab — reuses all functions from caidatspqt.js =====
async function _cdsxLoadSpQt(content) {
    content.innerHTML = '<div style="max-width:1100px;margin:0 auto;padding:16px 0">'
        + '<div style="display:grid;grid-template-columns:280px 1fr;gap:16px" id="_spqtMain">'
        + '<div id="_spqtSidebar" style="background:#fff;border-radius:12px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,0.06);max-height:70vh;overflow-y:auto"></div>'
        + '<div id="_spqtContent" style="background:#fff;border-radius:12px;padding:18px;box-shadow:0 2px 8px rgba(0,0,0,0.06);min-height:400px"></div>'
        + '</div></div>';

    await _spqtLoadAll();
    _spqtRenderSidebar();
    _spqtRenderWelcome();
}

// ===== Kho Vải Tab — reuses all functions from caidatkhovai.js =====
async function _cdsxLoadKhoVai(content) {
    // Inject styles if not present
    if (!document.getElementById('cdkStyles')) {
        var st = document.createElement('style'); st.id = 'cdkStyles';
        st.textContent = [
            '.cdk-wrap{display:flex;height:calc(100vh - 180px);overflow:hidden;background:#f8fafc}',
            '.cdk-col{flex:1;min-width:0;border-right:1px solid var(--gray-200);display:flex;flex-direction:column;background:#fff}',
            '.cdk-col:last-child{border-right:none}',
            '.cdk-col-head{padding:14px 16px;background:linear-gradient(135deg,#0d9488,#0f766e);color:#fff;font-weight:800;font-size:13px;display:flex;justify-content:space-between;align-items:center}',
            '.cdk-col-head.col2{background:linear-gradient(135deg,#7c3aed,#6d28d9)}',
            '.cdk-col-head.col3{background:linear-gradient(135deg,#2563eb,#1d4ed8)}',
            '.cdk-col-body{flex:1;overflow-y:auto;padding:8px 0}',
            '.cdk-item{padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background .15s}',
            '.cdk-item:hover{background:#f0fdfa}',
            '.cdk-item.active{background:#ccfbf1;border-left:3px solid #0d9488}',
            '.cdk-item.inactive{opacity:0.5}',
            '.cdk-item.checked{background:#dcfce7;border-left:3px solid #16a34a}',
            '.cdk-item-name{font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px}',
            '.cdk-item-actions{display:flex;gap:4px;align-items:center}',
            '.cdk-toggle{width:36px;height:20px;border-radius:10px;border:none;cursor:pointer;position:relative;transition:background .2s}',
            '.cdk-toggle.on{background:#0d9488}',
            '.cdk-toggle.off{background:#cbd5e1}',
            '.cdk-toggle::after{content:"";position:absolute;width:16px;height:16px;border-radius:50%;background:#fff;top:2px;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}',
            '.cdk-toggle.on::after{left:18px}',
            '.cdk-toggle.off::after{left:2px}',
            '.cdk-btn-sm{border:none;padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;font-weight:700}',
            '.cdk-add-form{padding:12px 16px;border-bottom:2px solid var(--gray-200);background:#f0fdfa}',
            '.cdk-empty{text-align:center;padding:30px;color:var(--gray-400);font-size:12px}',
            '.cdk-bulk-area{padding:12px 16px;border-bottom:2px solid var(--gray-200);background:#eff6ff}',
            '.cdk-badge{font-size:9px;padding:1px 6px;border-radius:8px;font-weight:700}',
            '@media(max-width:768px){.cdk-wrap{flex-direction:column;height:auto}.cdk-col{min-height:200px;border-right:none;border-bottom:1px solid var(--gray-200)}}'
        ].join('');
        document.head.appendChild(st);
    }

    content.innerHTML = '<div class="cdk-wrap" id="cdkWrap">'
        + '<div class="cdk-col" id="cdkCol1"></div>'
        + '<div class="cdk-col" id="cdkCol2"></div>'
        + '<div class="cdk-col" id="cdkCol3"></div>'
        + '</div>';

    _cdk.selWid = null; _cdk.selMid = null;
    await _cdkLoadWarehouses();
}

// ===== Shell for tabs not yet implemented =====
function _cdsxLoadShell(content, icon, title, desc) {
    content.innerHTML = '<div style="text-align:center;padding:60px 20px;">'
        + '<div style="font-size:48px;margin-bottom:16px;">' + icon + '</div>'
        + '<h3 style="color:var(--navy,#1e293b);margin-bottom:8px;">' + title + '</h3>'
        + '<p style="color:var(--gray-500,#64748b);font-size:14px;">' + desc + '</p>'
        + '<p style="color:var(--gray-400,#9ca3af);font-size:12px;margin-top:12px;">Nội dung sẽ được bổ sung sau</p></div>';
}

// ===== Nhắc Nhở Công Việc Tab =====
var _nnFilter = 'all'; // current sidebar filter
var _nnData = []; // cached reminders
var _nnDepts = []; // cached departments

async function _cdsxLoadNhacNho(content) {
    content.innerHTML = '<div style="display:flex;gap:0;height:calc(100vh - 200px);min-height:400px">'
        + '<div id="_nnSidebar" style="width:200px;min-width:200px;background:#fff;border-right:1px solid #e2e8f0;display:flex;flex-direction:column">'
        + '<div style="padding:12px 14px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-weight:800;font-size:13px">📂 Bộ Phận</div>'
        + '<div id="_nnSbList" style="flex:1;overflow-y:auto;padding:4px 0"></div></div>'
        + '<div style="flex:1;min-width:0;display:flex;flex-direction:column">'
        + '<div style="padding:10px 16px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #e2e8f0;background:#fffbeb">'
        + '<span style="font-weight:800;font-size:13px;color:#92400e">🔔 Nhắc Nhở Công Việc</span>'
        + '<span style="flex:1"></span>'
        + '<button onclick="_nnShowCreate()" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;padding:6px 16px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">➕ Thêm Nhắc Nhở</button></div>'
        + '<div id="_nnTable" style="flex:1;overflow-y:auto;padding:0"></div></div></div>';
    await _nnLoadAll();
}

async function _nnLoadAll() {
    var res = await apiCall('/api/nhacnho/all');
    _nnData = res.reminders || [];
    _nnDepts = res.departments || [];
    _nnRenderSidebar();
    _nnRenderTable();
}

function _nnRenderSidebar() {
    var sb = document.getElementById('_nnSbList'); if (!sb) return;
    var cats = [{key:'all',label:'Tất cả',icon:'📋'},{key:'ke_toan',label:'KẾ TOÁN',icon:'🧾'},{key:'san_xuat',label:'SẢN XUẤT',icon:'🏭'}];
    var h = '';
    cats.forEach(function(c) {
        var cnt = c.key === 'all' ? _nnData.length : _nnData.filter(function(r){return r.category===c.key;}).length;
        var act = _nnFilter === c.key ? 'background:#fef3c7;font-weight:800;border-left:3px solid #f59e0b' : '';
        h += '<div onclick="_nnFilter=\''+c.key+'\';_nnRenderSidebar();_nnRenderTable()" style="padding:10px 14px;cursor:pointer;font-size:12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f8fafc;'+act+'" onmouseover="this.style.background=\'#fffbeb\'" onmouseout="this.style.background=\''+(_nnFilter===c.key?'#fef3c7':'')+'\'">'
            + '<span>'+c.icon+' '+c.label+'</span><span style="background:#f1f5f9;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:700">'+cnt+'</span></div>';
    });
    // Department sub-filters under SẢN XUẤT
    if (_nnFilter === 'san_xuat' || _nnFilter.startsWith('dept:')) {
        _nnDepts.forEach(function(d) {
            if (d === 'KẾ TOÁN') return;
            var cnt = _nnData.filter(function(r){return r.category==='san_xuat' && r.departments && r.departments.indexOf(d)>=0;}).length;
            var act = _nnFilter === 'dept:'+d ? 'background:#fef3c7;font-weight:700;border-left:3px solid #d97706;padding-left:24px' : 'padding-left:28px';
            h += '<div onclick="_nnFilter=\'dept:'+d+'\';_nnRenderSidebar();_nnRenderTable()" style="padding:8px 14px;cursor:pointer;font-size:11px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f8fafc;'+act+'" onmouseover="this.style.background=\'#fffbeb\'">'
                + '<span>└ '+d+'</span><span style="background:#f1f5f9;padding:1px 5px;border-radius:6px;font-size:9px;font-weight:700">'+cnt+'</span></div>';
        });
    }
    sb.innerHTML = h;
}

function _nnRenderTable() {
    var el = document.getElementById('_nnTable'); if (!el) return;
    var filtered = _nnData;
    if (_nnFilter === 'ke_toan') filtered = _nnData.filter(function(r){return r.category==='ke_toan';});
    else if (_nnFilter === 'san_xuat') filtered = _nnData.filter(function(r){return r.category==='san_xuat';});
    else if (_nnFilter.startsWith('dept:')) { var d=_nnFilter.slice(5); filtered = _nnData.filter(function(r){return r.category==='san_xuat' && r.departments && r.departments.indexOf(d)>=0;}); }

    if (filtered.length === 0) { el.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;font-size:13px">Chưa có nhắc nhở nào</div>'; return; }

    var h = '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#f8fafc;position:sticky;top:0">'
        + '<th style="padding:10px 12px;text-align:left;font-weight:800;width:70px">Áp Dụng</th>'
        + '<th style="padding:10px 8px;text-align:left;font-weight:800">Nội Dung Nhắc Nhở</th>'
        + '<th style="padding:10px 8px;text-align:left;font-weight:800;width:100px">Loại</th>'
        + '<th style="padding:10px 8px;text-align:left;font-weight:800;width:150px">Bộ Phận</th>'
        + '<th style="padding:10px 8px;text-align:left;font-weight:800;width:100px">Người Thêm</th>'
        + '<th style="padding:10px 8px;text-align:left;font-weight:800;width:90px">Ngày ÁD</th>'
        + '<th style="padding:10px 8px;text-align:center;font-weight:800;width:80px">Thao Tác</th>'
        + '</tr></thead><tbody>';

    filtered.forEach(function(r) {
        var toggle = r.is_active
            ? '<button onclick="_nnToggle('+r.id+',false)" style="background:#059669;color:#fff;border:none;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer">ÁP DỤNG</button>'
            : '<button onclick="_nnToggle('+r.id+',true)" style="background:#94a3b8;color:#fff;border:none;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer">TẮT</button>';
        var catLabel = r.category === 'ke_toan' ? '<span style="background:#dbeafe;color:#1d4ed8;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700">KẾ TOÁN</span>' : '<span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700">SẢN XUẤT</span>';
        var depts = (r.departments||'').split(',').filter(Boolean).map(function(d){return '<span style="background:#f1f5f9;padding:1px 4px;border-radius:3px;font-size:9px;margin-right:2px">'+d.trim()+'</span>';}).join('');
        var dateStr = r.applied_date ? r.applied_date.split('T')[0].split('-').reverse().join('/') : '';
        var rowBg = r.is_active ? '' : 'opacity:0.5;';
        h += '<tr style="border-bottom:1px solid #f1f5f9;'+rowBg+'">'
            + '<td style="padding:8px 12px">'+toggle+'</td>'
            + '<td style="padding:8px;font-weight:600;color:#1e293b">'+r.content+'</td>'
            + '<td style="padding:8px">'+catLabel+'</td>'
            + '<td style="padding:8px">'+(depts||'—')+'</td>'
            + '<td style="padding:8px;color:#6b7280">'+(r.created_by||'')+'</td>'
            + '<td style="padding:8px;color:#6b7280;font-size:11px">'+dateStr+'</td>'
            + '<td style="padding:8px;text-align:center">'
            + '<button onclick="_nnShowHistory('+r.id+')" title="Lịch sử" style="background:none;border:none;cursor:pointer;font-size:14px">📜</button>'
            + '<button onclick="_nnShowEdit('+r.id+')" title="Sửa" style="background:none;border:none;cursor:pointer;font-size:14px">✏️</button>'
            + '<button onclick="_nnDelete('+r.id+')" title="Xóa" style="background:none;border:none;cursor:pointer;font-size:14px">🗑️</button>'
            + '</td></tr>';
    });
    h += '</tbody></table>';
    el.innerHTML = h;
}

async function _nnToggle(id, val) {
    await apiCall('/api/nhacnho/'+id+'/toggle','PUT',{is_active:val});
    await _nnLoadAll();
    showToast(val ? '✅ Đã bật áp dụng' : '⚠️ Đã tắt');
}

async function _nnDelete(id) {
    if (!confirm('Xóa nhắc nhở này?')) return;
    await apiCall('/api/nhacnho/'+id,'DELETE');
    await _nnLoadAll();
    showToast('🗑️ Đã xóa');
}

async function _nnShowHistory(id) {
    var res = await apiCall('/api/nhacnho/history/'+id);
    var rows = res.history || [];
    var h = rows.length === 0 ? '<p style="text-align:center;color:#9ca3af">Chưa có lịch sử</p>' : '<div style="max-height:300px;overflow-y:auto">';
    rows.forEach(function(r) {
        var d = new Date(r.changed_at);
        var ds = String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
        h += '<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:12px"><span style="color:#6b7280">'+ds+'</span> — <b>'+r.changed_by+'</b>: '+r.details+'</div>';
    });
    if (rows.length) h += '</div>';
    openModal('📜 Lịch Sử Cập Nhật', h, '<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>');
}

function _nnShowCreate() { _nnShowForm(null); }
function _nnShowEdit(id) { var r = _nnData.find(function(x){return x.id===id;}); if (r) _nnShowForm(r); }

function _nnShowForm(existing) {
    var isEdit = !!existing;
    var e = existing || {};
    var deptArr = (e.departments||'').split(',').filter(Boolean).map(function(d){return d.trim();});
    var today = new Date(); var todayStr = today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
    var dateVal = e.applied_date ? e.applied_date.split('T')[0] : todayStr;

    var body = '<div style="display:grid;gap:12px">'
        + '<div><label style="font-weight:700;font-size:12px">Nội dung nhắc nhở *</label><input id="_nnFContent" class="form-control" value="'+(e.content||'').replace(/"/g,'&quot;')+'" placeholder="VD: Không Túi HV, Không Mác HV"></div>'
        + '<div><label style="font-weight:700;font-size:12px">Loại *</label><div style="display:flex;gap:8px;margin-top:4px">'
        + '<button type="button" id="_nnFCatKT" onclick="_nnPickCat(\'ke_toan\')" style="flex:1;padding:8px;border:2px solid '+(e.category==='ke_toan'?'#1d4ed8':'#e2e8f0')+';border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;background:'+(e.category==='ke_toan'?'#dbeafe':'#fff')+'">🧾 KẾ TOÁN</button>'
        + '<button type="button" id="_nnFCatSX" onclick="_nnPickCat(\'san_xuat\')" style="flex:1;padding:8px;border:2px solid '+(e.category!=='ke_toan'?'#d97706':'#e2e8f0')+';border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;background:'+(e.category!=='ke_toan'?'#fef3c7':'#fff')+'">🏭 SẢN XUẤT</button>'
        + '</div><input type="hidden" id="_nnFCat" value="'+(e.category||'san_xuat')+'"></div>'
        + '<div><label style="font-weight:700;font-size:12px">Nhắc nhở bộ phận</label>'
        + '<input id="_nnFDept" class="form-control" value="'+deptArr.join(', ')+'" placeholder="VD: HOÀN THIỆN, KẾ TOÁN, CẮT" style="margin-top:4px">'
        + '<div style="font-size:10px;color:#9ca3af;margin-top:2px">Nhập tên bộ phận, cách nhau bằng dấu phẩy</div></div>'
        + '<div><label style="font-weight:700;font-size:12px">Ngày áp dụng</label><input type="date" id="_nnFDate" class="form-control" value="'+dateVal+'"></div>'
        + '</div>';

    var footer = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>'
        + '<button class="btn" onclick="_nnSaveForm('+(isEdit?e.id:'null')+')" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;padding:8px 20px;border-radius:6px;font-weight:700">'+(isEdit?'💾 Cập Nhật':'➕ Tạo Mới')+'</button>';

    openModal((isEdit?'✏️ Sửa':'➕ Thêm')+' Nhắc Nhở', body, footer);
}

function _nnPickCat(cat) {
    document.getElementById('_nnFCat').value = cat;
    var kt = document.getElementById('_nnFCatKT'), sx = document.getElementById('_nnFCatSX');
    if (cat==='ke_toan') { kt.style.borderColor='#1d4ed8';kt.style.background='#dbeafe';sx.style.borderColor='#e2e8f0';sx.style.background='#fff'; }
    else { sx.style.borderColor='#d97706';sx.style.background='#fef3c7';kt.style.borderColor='#e2e8f0';kt.style.background='#fff'; }
}

async function _nnSaveForm(editId) {
    var content = document.getElementById('_nnFContent')?.value?.trim();
    var category = document.getElementById('_nnFCat')?.value || 'san_xuat';
    var deptStr = document.getElementById('_nnFDept')?.value || '';
    var departments = deptStr.split(',').map(function(d){return d.trim();}).filter(Boolean);
    var applied_date = document.getElementById('_nnFDate')?.value || null;
    if (!content) { showToast('Nhập nội dung nhắc nhở','error'); return; }

    if (editId) {
        await apiCall('/api/nhacnho/'+editId, 'PUT', { content, category, departments, applied_date });
    } else {
        await apiCall('/api/nhacnho', 'POST', { content, category, departments, applied_date });
    }
    closeModal();
    await _nnLoadAll();
    showToast(editId ? '✅ Đã cập nhật' : '✅ Đã tạo nhắc nhở mới');
}

// ===================================================================
// ========== BẢNG GIÁ MAY TAB ==========
// ===================================================================
var _bgm = { items: [], groups: [], total: 0, filter: 'all', search: '', selected: {}, sortCol: 'name', sortDir: 'asc' };
var _bgmFmt = function(n) { return Number(n||0).toLocaleString('vi-VN'); };
var _bgmRoleMap = { giam_doc: 'AD', quan_ly_xuong: 'QLX', quan_ly_cap_cao: 'QLX', nhan_vien: 'SALE', truong_nhom: 'TN' };
var _bgmRoleLabel = function(roles) {
    if (!roles) return '—';
    var arr = roles;
    if (typeof arr === 'string') { try { arr = JSON.parse(arr); } catch(e) { return '—'; } }
    if (!Array.isArray(arr)) return '—';
    return arr.map(function(r) { return _bgmRoleMap[r] || r; }).join(', ');
};

async function _cdsxLoadBangGia(content) {
    content.innerHTML = '<div style="display:flex;gap:0;height:calc(100vh - 200px);min-height:400px">'
        + '<div id="_bgmSidebar" style="width:200px;min-width:200px;background:#fff;border-right:1px solid #e2e8f0;display:flex;flex-direction:column">'
        + '<div style="padding:12px 14px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-weight:800;font-size:13px">💲 Nhóm</div>'
        + '<div id="_bgmSbList" style="flex:1;overflow-y:auto;padding:4px 0"></div></div>'
        + '<div style="flex:1;min-width:0;display:flex;flex-direction:column">'
        + '<div style="padding:10px 16px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #e2e8f0;background:#eff6ff">'
        + '<span style="font-weight:800;font-size:13px;color:#1e40af">💲 GIÁ MAY HV</span>'
        + '<input type="text" id="_bgmSearch" placeholder="🔍 Tìm..." style="margin-left:8px;padding:4px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:11px;width:180px">'
        + '<div id="_bgmSelBar" style="display:none;align-items:center;gap:8px;background:#fef3c7;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;color:#92400e"><span id="_bgmSelCount">0</span> đã chọn <button onclick="_bgmSelectAll()" style="background:#2563eb;color:#fff;border:none;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer">☑ Chọn tất cả</button><button onclick="_bgmDeselectAll()" style="background:#64748b;color:#fff;border:none;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer">☐ Bỏ chọn</button><button onclick="_bgmDeleteSelected()" style="background:#dc2626;color:#fff;border:none;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer">🗑️ Xóa đã chọn</button></div>'
        + '<span style="flex:1"></span>'
        + '<button onclick="_bgmShowBulk()" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;padding:6px 16px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;margin-right:6px">📋 Thêm Hàng Loạt</button>'
        + '<button onclick="_bgmShowCreate()" style="background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;border:none;padding:6px 16px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">➕ Thêm Chi Tiết</button></div>'
        + '<div id="_bgmTable" style="flex:1;overflow-y:auto;padding:0"></div></div></div>';
    var _st; document.getElementById('_bgmSearch').addEventListener('input', function() { clearTimeout(_st); _st = setTimeout(function() { _bgm.search = document.getElementById('_bgmSearch')?.value || ''; _bgmRender(); }, 300); });
    await _bgmLoadAll();
}

async function _bgmLoadAll() {
    try {
    var res = await apiCall('/api/bgm/items');
    console.log('[BGM] items response:', res);
    _bgm.items = res.items || [];
    var gRes = await apiCall('/api/bgm/groups');
    console.log('[BGM] groups response:', gRes);
    _bgm.groups = gRes.groups || [];
    _bgm.total = gRes.total || 0;
    _bgmRenderSB();
    _bgmRender();
    } catch(e) { console.error('[BGM] loadAll error:', e); }
}

function _bgmRenderSB() {
    var sb = document.getElementById('_bgmSbList'); if (!sb) return;
    var h = '<div onclick="_bgm.filter=\'all\';_bgmRenderSB();_bgmRender()" style="padding:10px 14px;cursor:pointer;font-size:12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f8fafc;' + (_bgm.filter === 'all' ? 'background:#dbeafe;font-weight:800;border-left:3px solid #2563eb' : '') + '">'
        + '<span>📋 Tất cả</span><span style="background:#2563eb;color:#fff;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:700">' + _bgm.total + '</span></div>';
    _bgm.groups.forEach(function(g) {
        var act = _bgm.filter === g.group_name ? 'background:#dbeafe;font-weight:800;border-left:3px solid #2563eb' : '';
        h += '<div onclick="_bgm.filter=\'' + g.group_name.replace(/'/g,"\\'") + '\';_bgmRenderSB();_bgmRender()" style="padding:10px 14px;cursor:pointer;font-size:12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f8fafc;' + act + '">'
            + '<span>🏷️ ' + g.group_name + '</span><span style="background:#f1f5f9;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:700">' + g.item_count + '</span></div>';
    });
    sb.innerHTML = h;
}

function _bgmSortBy(col) {
    if (_bgm.sortCol === col) _bgm.sortDir = _bgm.sortDir === 'asc' ? 'desc' : 'asc';
    else { _bgm.sortCol = col; _bgm.sortDir = 'asc'; }
    _bgmRender();
}

function _bgmSortIcon(col) {
    if (_bgm.sortCol !== col) return ' <span style="opacity:0.3;font-size:8px">⇅</span>';
    return _bgm.sortDir === 'asc' ? ' <span style="font-size:8px">▲</span>' : ' <span style="font-size:8px">▼</span>';
}

function _bgmRender() {
    var el = document.getElementById('_bgmTable'); if (!el) return;
    console.log('[BGM] render called, items:', _bgm.items.length, 'filter:', _bgm.filter);
    try {
    var filtered = _bgm.items.slice();
    if (_bgm.filter !== 'all') filtered = filtered.filter(function(i) { return i.group_name === _bgm.filter; });
    if (_bgm.search) {
        var q = _bgm.search.toLowerCase();
        filtered = filtered.filter(function(i) { return i.name.toLowerCase().indexOf(q) >= 0 || i.group_name.toLowerCase().indexOf(q) >= 0; });
    }

    // Sort
    var sc = _bgm.sortCol, sd = _bgm.sortDir;
    var textCols = ['name','group_name'];
    filtered.sort(function(a, b) {
        var va = a[sc], vb = b[sc];
        if (va == null) va = '';
        if (vb == null) vb = '';
        var cmp;
        if (textCols.indexOf(sc) >= 0) {
            cmp = String(va).localeCompare(String(vb), 'vi');
        } else {
            cmp = (Number(va)||0) - (Number(vb)||0);
        }
        return sd === 'asc' ? cmp : -cmp;
    });

    if (filtered.length === 0) { el.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;font-size:13px">Chưa có chi tiết may nào</div>'; return; }

    var thStyle = 'padding:10px 6px;font-weight:700;font-size:10px;cursor:pointer;user-select:none;white-space:nowrap';
    var h = '<table style="width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed"><thead><tr style="background:#1e3a5f;color:#fff;position:sticky;top:0">'
        + '<th style="padding:10px 4px;text-align:center;width:3%"><input type="checkbox" id="_bgmChkAll" onchange="_bgmToggleAll(this.checked)" style="cursor:pointer"></th>'
        + '<th style="' + thStyle + ';text-align:center;width:3%">STT</th>'
        + '<th onclick="_bgmSortBy(\'name\')" style="' + thStyle + ';text-align:left;width:14%">TÊN' + _bgmSortIcon('name') + '</th>'
        + '<th onclick="_bgmSortBy(\'name\')" style="' + thStyle + ';text-align:left;width:13%">TÊN CHI TIẾT' + _bgmSortIcon('name') + '</th>'
        + '<th onclick="_bgmSortBy(\'group_name\')" style="' + thStyle + ';text-align:center;width:9%">NHÓM' + _bgmSortIcon('group_name') + '</th>'
        + '<th style="' + thStyle + ';text-align:center;width:13%">PHÂN QUYỀN</th>'
        + '<th style="' + thStyle + ';text-align:center;width:7%">LOẠI THÊM</th>'
        + '<th onclick="_bgmSortBy(\'factory_price\')" style="' + thStyle + ';text-align:right;width:9%">GIÁ NM' + _bgmSortIcon('factory_price') + '</th>'
        + '<th onclick="_bgmSortBy(\'processing_price\')" style="' + thStyle + ';text-align:right;width:9%">GIÁ GC' + _bgmSortIcon('processing_price') + '</th>'
        + '<th style="' + thStyle + ';text-align:left;width:12%">LỊCH SỬ CN</th>'
        + '<th style="' + thStyle + ';text-align:center;width:4%"></th>'
        + '</tr></thead><tbody>';

    filtered.forEach(function(item, idx) {
        var stt = idx + 1;
        var addLabel = item.add_type === 'once' ? '1 lần' : 'nhiều';
        var displayName = item.name + ' - ' + (item.add_type === 'once' ? '1l' : 'n');
        var addColor = item.add_type === 'once' ? '#059669' : '#f59e0b';
        var lastUp = '—'; try { if (item.updated_at) { var _d = new Date(item.updated_at); lastUp = String(_d.getDate()).padStart(2,'0')+'/'+String(_d.getMonth()+1).padStart(2,'0')+'/'+_d.getFullYear()+' '+String(_d.getHours()).padStart(2,'0')+':'+String(_d.getMinutes()).padStart(2,'0'); } } catch(e) {}
        var creator = item.created_by_name ? '<br><span style="color:#2563eb;font-size:10px">' + item.created_by_name + '</span>' : '';
        var isChk = !!_bgm.selected[item.id];
        h += '<tr style="border-bottom:1px solid #f1f5f9;cursor:pointer;' + (isChk?'background:#eff6ff':'') + '" onmouseover="if(!this.classList.contains(\'_bgmSel\'))this.style.background=\'#f8fafc\'" onmouseout="if(!this.classList.contains(\'_bgmSel\'))this.style.background=\'\'" class="' + (isChk?'_bgmSel':'') + '">'
            + '<td style="padding:8px 4px;text-align:center"><input type="checkbox" class="_bgmRowCb" data-id="' + item.id + '" onchange="_bgmToggleRow(' + item.id + ',this.checked)"' + (isChk?' checked':'') + ' style="cursor:pointer"></td>'
            + '<td style="padding:8px 4px;text-align:center;color:#94a3b8;font-weight:600;font-size:10px">' + stt + '</td>'
            + '<td style="padding:8px;font-weight:700;color:#1e40af;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + displayName + '</td>'
            + '<td style="padding:8px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + item.name + '</td>'
            + '<td style="padding:8px;text-align:center"><span style="background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">' + item.group_name + '</span></td>'
            + '<td style="padding:8px;text-align:center;font-size:10px;font-weight:600;color:#64748b">' + _bgmRoleLabel(item.allowed_roles) + '</td>'
            + '<td style="padding:8px;text-align:center"><span style="background:' + addColor + ';color:#fff;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">' + addLabel + '</span></td>'
            + '<td style="padding:8px;text-align:right;font-weight:700;color:#059669">' + _bgmFmt(item.factory_price) + '</td>'
            + '<td style="padding:8px;text-align:right;font-weight:700;color:#2563eb">' + _bgmFmt(item.processing_price) + '</td>'
            + '<td style="padding:8px;font-size:10px;color:#6b7280;overflow:hidden;text-overflow:ellipsis">' + lastUp + creator + '</td>'
            + '<td style="padding:8px;text-align:center">'
            + '<button onclick="_bgmShowEdit(' + item.id + ')" title="Sửa" style="background:none;border:none;cursor:pointer;font-size:14px">✏️</button>'
            + '<button onclick="_bgmDelete(' + item.id + ')" title="Xóa" style="background:none;border:none;cursor:pointer;font-size:14px">🗑️</button>'
            + '</td></tr>';
    });
    h += '</tbody></table>';
    el.innerHTML = h;
    } catch(e) { console.error('[BGM] render error:', e); el.innerHTML = '<div style="color:red;padding:20px">Lỗi hiển thị: ' + e.message + '</div>'; }
}

// ========== BGM CREATE / EDIT MODAL ==========
function _bgmShowCreate() { _bgmShowForm(null); }
function _bgmShowEdit(id) { var item = _bgm.items.find(function(x){return x.id===id;}); if (item) _bgmShowForm(item); }

function _bgmShowForm(existing) {
    var isEdit = !!existing;
    var e = existing || {};
    var roles = []; try { roles = typeof e.allowed_roles === 'string' ? JSON.parse(e.allowed_roles) : (e.allowed_roles || []); } catch(ex) {}
    // Build group datalist from existing groups
    var groupOpts = _bgm.groups.map(function(g) { return '<option value="' + g.group_name + '">'; }).join('');
    var rq = '<span style="color:red">*</span>';
    var roleChecks = [
        { val: 'giam_doc', label: 'AD (Giám Đốc)' },
        { val: 'quan_ly_xuong', label: 'QLX (Quản Lý Xưởng)' },
        { val: 'nhan_vien', label: 'SALE (Nhân Viên)' }
    ].map(function(r) {
        var checked = roles.indexOf(r.val) >= 0 ? ' checked' : '';
        return '<label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" class="_bgmRoleCb" value="' + r.val + '"' + checked + '> ' + r.label + '</label>';
    }).join('');

    var body = '<div style="display:grid;gap:12px">'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        + '<div><label style="font-weight:700;font-size:12px">Tên Chi Tiết ' + rq + '</label><input id="_bgmFName" class="form-control" value="' + (e.name || '') + '" placeholder="VD: Cổ bẻ dệt"></div>'
        + '<div><label style="font-weight:700;font-size:12px">Nhóm ' + rq + '</label><input id="_bgmFGroup" class="form-control" list="_bgmGroupList" value="' + (e.group_name || '') + '" placeholder="VD: Cổ, Tạp Dề, Mác..."><datalist id="_bgmGroupList">' + groupOpts + '</datalist></div>'
        + '</div>'
        + '<div><label style="font-weight:700;font-size:12px">Phân Quyền ' + rq + '</label><div style="display:flex;gap:16px;margin-top:4px">' + roleChecks + '</div></div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
        + '<div><label style="font-weight:700;font-size:12px">Loại Thêm ' + rq + '</label><select id="_bgmFAddType" class="form-control"><option value="once"' + (e.add_type === 'once' || !e.add_type ? ' selected' : '') + '>1 lần</option><option value="multi"' + (e.add_type === 'multi' ? ' selected' : '') + '>Nhiều lần</option></select></div>'
        + '<div><label style="font-weight:700;font-size:12px">Giá Nhà May ' + rq + '</label><input type="number" id="_bgmFPrice" class="form-control" value="' + (e.factory_price || 0) + '" min="0"></div>'
        + '<div><label style="font-weight:700;font-size:12px">Giá Gia Công ' + rq + '</label><input type="number" id="_bgmFPriceGC" class="form-control" value="' + (e.processing_price || 0) + '" min="0"></div>'
        + '</div></div>';

    var footer = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>'
        + '<button class="btn" onclick="_bgmSaveForm(' + (isEdit ? e.id : 'null') + ')" style="background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;border:none;padding:8px 20px;border-radius:6px;font-weight:700">' + (isEdit ? '💾 Cập Nhật' : '➕ Tạo Mới') + '</button>';

    openModal((isEdit ? '✏️ Sửa: ' + e.name : '➕ Thêm Chi Tiết May'), body, footer);
}

async function _bgmSaveForm(editId) {
    var name = document.getElementById('_bgmFName')?.value?.trim();
    var group_name = document.getElementById('_bgmFGroup')?.value?.trim();
    var add_type = document.getElementById('_bgmFAddType')?.value;
    var factory_price = document.getElementById('_bgmFPrice')?.value;
    var processing_price = document.getElementById('_bgmFPriceGC')?.value;
    var roleCbs = document.querySelectorAll('._bgmRoleCb:checked');
    var allowed_roles = [];
    roleCbs.forEach(function(cb) { allowed_roles.push(cb.value); });

    if (!name) { showToast('Nhập Tên chi tiết', 'error'); return; }
    if (!group_name) { showToast('Nhập Nhóm', 'error'); return; }
    if (allowed_roles.length === 0) { showToast('Chọn ít nhất 1 Phân Quyền', 'error'); return; }
    if (!factory_price && factory_price !== 0) { showToast('Nhập Giá Nhà May', 'error'); return; }
    if (!processing_price && processing_price !== 0) { showToast('Nhập Giá Gia Công', 'error'); return; }

    var data = { name: name, group_name: group_name, add_type: add_type, factory_price: Number(factory_price), processing_price: Number(processing_price), allowed_roles: allowed_roles };

    var res;
    if (editId) { res = await apiCall('/api/bgm/items/' + editId, 'PUT', data); }
    else { res = await apiCall('/api/bgm/items', 'POST', data); }

    if (res.success) { showToast('✅ ' + (editId ? 'Đã cập nhật' : 'Đã tạo')); closeModal(); await _bgmLoadAll(); }
    else { showToast(res.error || 'Lỗi', 'error'); }
}

async function _bgmDelete(id) {
    if (!confirm('Xóa chi tiết may này?')) return;
    var res = await apiCall('/api/bgm/items/' + id, 'DELETE');
    if (res.success) { showToast('🗑️ Đã xóa'); await _bgmLoadAll(); }
    else { showToast(res.error || 'Lỗi', 'error'); }
}

// ========== SELECTION + BULK DELETE ==========
function _bgmUpdateSelBar() {
    var ids = Object.keys(_bgm.selected).filter(function(k){return _bgm.selected[k];});
    var bar = document.getElementById('_bgmSelBar');
    var cnt = document.getElementById('_bgmSelCount');
    if (!bar) return;
    if (ids.length > 0) {
        bar.style.display = 'flex';
        if (cnt) cnt.textContent = ids.length;
    } else {
        bar.style.display = 'none';
    }
}

function _bgmToggleRow(id, checked) {
    if (checked) _bgm.selected[id] = true;
    else delete _bgm.selected[id];
    _bgmUpdateSelBar();
}

function _bgmToggleAll(checked) {
    var cbs = document.querySelectorAll('._bgmRowCb');
    cbs.forEach(function(cb) {
        cb.checked = checked;
        var id = Number(cb.dataset.id);
        if (checked) _bgm.selected[id] = true;
        else delete _bgm.selected[id];
    });
    _bgmUpdateSelBar();
}

function _bgmSelectAll() {
    _bgm.items.forEach(function(item) { _bgm.selected[item.id] = true; });
    _bgmRender();
    _bgmUpdateSelBar();
}

function _bgmDeselectAll() {
    _bgm.selected = {};
    _bgmRender();
    _bgmUpdateSelBar();
}

async function _bgmDeleteSelected() {
    var ids = Object.keys(_bgm.selected).filter(function(k){return _bgm.selected[k];}).map(Number);
    if (ids.length === 0) { showToast('Chưa chọn item nào', 'error'); return; }
    if (!confirm('Xóa ' + ids.length + ' chi tiết may đã chọn?')) return;
    var ok = 0, fail = 0;
    for (var i = 0; i < ids.length; i++) {
        var res = await apiCall('/api/bgm/items/' + ids[i], 'DELETE');
        if (res.success) ok++; else fail++;
    }
    _bgm.selected = {};
    showToast('🗑️ Đã xóa ' + ok + ' items' + (fail ? ', ' + fail + ' lỗi' : ''));
    await _bgmLoadAll();
}

// ========== BULK IMPORT ==========
function _bgmShowBulk() {
    var taStyle = 'width:100%;min-height:200px;max-height:300px;font-size:11px;font-family:monospace;padding:6px;border:1px solid #e2e8f0;border-radius:6px;resize:vertical;line-height:1.6';
    var labelStyle = 'font-size:10px;font-weight:800;color:#1e40af;margin-bottom:2px;display:block';
    var hintStyle = 'font-size:9px;color:#94a3b8;display:block;margin-bottom:4px';
    var body = '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin-bottom:10px;font-size:11px;color:#92400e">'
        + '<b>📋 Hướng dẫn:</b> Copy cột từ Excel → Ctrl+V dán vào ô tương ứng. Mỗi dòng = 1 item. Số dòng các cột phải bằng nhau.'
        + '</div>'
        + '<div style="margin-bottom:8px"><label style="' + labelStyle + '">Phân Quyền mặc định cho tất cả</label>'
        + '<div style="display:flex;gap:12px;font-size:11px">'
        + '<label><input type="checkbox" id="_bkAD" checked> AD</label>'
        + '<label><input type="checkbox" id="_bkQLX" checked> QLX</label>'
        + '<label><input type="checkbox" id="_bkSALE"> SALE</label>'
        + '</div></div>'
        + '<div style="display:grid;grid-template-columns:2fr 1.2fr 1fr 1fr 1fr 1fr;gap:6px">'
        + '<div><label style="' + labelStyle + '">Tên Chi Tiết *</label><span style="' + hintStyle + '">Paste cột tên</span><textarea id="_bkName" style="' + taStyle + '" placeholder="Cổ bẻ dệt\nCổ tròn\nCổ tim\n..."></textarea></div>'
        + '<div><label style="' + labelStyle + '">Nhóm *</label><span style="' + hintStyle + '">Paste cột nhóm</span><textarea id="_bkGroup" style="' + taStyle + '" placeholder="Cổ\nCổ\nCổ\n..."></textarea></div>'
        + '<div><label style="' + labelStyle + '">Loại Thêm</label><span style="' + hintStyle + '">1 lần / nhiều</span><textarea id="_bkType" style="' + taStyle + '" placeholder="1 lần\n1 lần\nnhiều\n..."></textarea></div>'
        + '<div><label style="' + labelStyle + '">Giá NM *</label><span style="' + hintStyle + '">Paste cột giá</span><textarea id="_bkFP" style="' + taStyle + '" placeholder="6000\n7000\n5000\n..."></textarea></div>'
        + '<div><label style="' + labelStyle + '">Giá GC *</label><span style="' + hintStyle + '">Paste cột GC</span><textarea id="_bkPP" style="' + taStyle + '" placeholder="14000\n15000\n10000\n..."></textarea></div>'
        + '<div><label style="' + labelStyle + '">Phân Quyền</label><span style="' + hintStyle + '">Tuỳ chọn riêng</span><textarea id="_bkRoles" style="' + taStyle + '" placeholder="AD,QLX\nAD,QLX,SALE\n(để trống = mặc định)"></textarea></div>'
        + '</div>'
        + '<div id="_bkPreview" style="margin-top:8px;font-size:11px;color:#6b7280"></div>';
    var footer = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>'
        + '<button class="btn" onclick="_bgmPreviewBulk()" style="background:#f59e0b;color:#fff;border:none;padding:8px 18px;border-radius:6px;font-weight:700;margin-right:6px">👁️ Xem trước</button>'
        + '<button class="btn" onclick="_bgmSubmitBulk()" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;padding:8px 18px;border-radius:6px;font-weight:700">🚀 Nhập tất cả</button>';
    openModal('📋 Thêm Hàng Loạt — Bảng Giá May', body, footer);
}

function _bgmParseBulkLines() {
    var names = (document.getElementById('_bkName')?.value || '').split('\n').map(function(s){return s.trim();});
    var groups = (document.getElementById('_bkGroup')?.value || '').split('\n').map(function(s){return s.trim();});
    var types = (document.getElementById('_bkType')?.value || '').split('\n').map(function(s){return s.trim();});
    var fps = (document.getElementById('_bkFP')?.value || '').split('\n').map(function(s){return s.trim().replace(/[,\.]/g,'');});
    var pps = (document.getElementById('_bkPP')?.value || '').split('\n').map(function(s){return s.trim().replace(/[,\.]/g,'');});
    var rolesRaw = (document.getElementById('_bkRoles')?.value || '').split('\n').map(function(s){return s.trim();});
    // Remove trailing empty lines
    while (names.length > 0 && !names[names.length-1]) names.pop();
    while (groups.length > 0 && !groups[groups.length-1]) groups.pop();
    // Default roles from checkboxes
    var defRoles = [];
    if (document.getElementById('_bkAD')?.checked) defRoles.push('giam_doc');
    if (document.getElementById('_bkQLX')?.checked) defRoles.push('quan_ly_xuong');
    if (document.getElementById('_bkSALE')?.checked) defRoles.push('nhan_vien');
    if (defRoles.length === 0) defRoles = ['giam_doc','quan_ly_xuong'];

    var roleMap = {AD:'giam_doc',QLX:'quan_ly_xuong',SALE:'nhan_vien'};
    var count = names.length;
    var rows = [];
    for (var i = 0; i < count; i++) {
        if (!names[i]) continue;
        var lineRoles = defRoles;
        if (rolesRaw[i]) {
            lineRoles = rolesRaw[i].split(',').map(function(r){r=r.trim().toUpperCase();return roleMap[r]||r;}).filter(Boolean);
        }
        var addType = 'once';
        var t = (types[i]||'').toLowerCase();
        if (t === 'nhiều' || t === 'nhieu' || t === 'multi' || t === 'n') addType = 'multi';
        rows.push({
            name: names[i],
            group_name: groups[i] || '',
            allowed_roles: lineRoles,
            add_type: addType,
            factory_price: Number(fps[i]) || 0,
            processing_price: Number(pps[i]) || 0
        });
    }
    return { rows: rows, nameCount: names.filter(Boolean).length, groupCount: groups.filter(Boolean).length };
}

function _bgmPreviewBulk() {
    var p = _bgmParseBulkLines();
    var el = document.getElementById('_bkPreview'); if (!el) return;
    if (p.rows.length === 0) { el.innerHTML = '<span style="color:#dc2626">⚠️ Chưa có dữ liệu</span>'; return; }
    var missing = p.rows.filter(function(r){return !r.group_name;}).length;
    var h = '<b style="color:#059669">✅ ' + p.rows.length + ' dòng sẵn sàng</b>';
    if (missing > 0) h += ' — <span style="color:#dc2626">⚠️ ' + missing + ' dòng thiếu nhóm</span>';
    h += '<div style="max-height:150px;overflow-y:auto;margin-top:6px;border:1px solid #e2e8f0;border-radius:6px"><table style="width:100%;font-size:10px;border-collapse:collapse"><thead><tr style="background:#f1f5f9"><th style="padding:3px 6px;text-align:left">#</th><th style="padding:3px 6px;text-align:left">Tên</th><th style="padding:3px 6px">Nhóm</th><th style="padding:3px 6px">Loại</th><th style="padding:3px 6px;text-align:right">Giá NM</th><th style="padding:3px 6px;text-align:right">Giá GC</th></tr></thead><tbody>';
    p.rows.forEach(function(r,i){
        var bg = r.group_name ? '' : 'background:#fef2f2';
        h += '<tr style="border-bottom:1px solid #f8fafc;' + bg + '"><td style="padding:2px 6px">' + (i+1) + '</td><td style="padding:2px 6px;font-weight:600">' + r.name + '</td><td style="padding:2px 6px;text-align:center">' + (r.group_name||'❌') + '</td><td style="padding:2px 6px;text-align:center">' + r.add_type + '</td><td style="padding:2px 6px;text-align:right">' + _bgmFmt(r.factory_price) + '</td><td style="padding:2px 6px;text-align:right">' + _bgmFmt(r.processing_price) + '</td></tr>';
    });
    h += '</tbody></table></div>';
    el.innerHTML = h;
}

async function _bgmSubmitBulk() {
    var p = _bgmParseBulkLines();
    if (p.rows.length === 0) { showToast('Chưa có dữ liệu để nhập', 'error'); return; }
    var invalid = p.rows.filter(function(r){return !r.group_name;});
    if (invalid.length > 0) { showToast(invalid.length + ' dòng thiếu Nhóm — hãy paste cột Nhóm', 'error'); return; }
    var res = await apiCall('/api/bgm/bulk', 'POST', { rows: p.rows });
    if (res.success) {
        showToast('🚀 Đã nhập ' + res.inserted + ' items' + (res.skipped ? ', bỏ qua ' + res.skipped + ' trùng' : ''));
        closeModal();
        await _bgmLoadAll();
    } else { showToast(res.error || 'Lỗi', 'error'); }
}

// ========== VỊ TRÍ PHỐI TAB ==========
var _vtpData = [];

async function _cdsxLoadViTriPhoi(content) {
    content.innerHTML = '<div style="max-width:700px;margin:0 auto;padding:16px 0">'
        + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">'
        + '<h4 style="margin:0;color:#7c3aed">📌 Vị Trí Phối</h4>'
        + '<span style="font-size:11px;color:#94a3b8">Quản lý các vị trí phối cho mẫu áo Pha Phối</span>'
        + '<div style="margin-left:auto"><button class="btn" onclick="_vtpShowAdd()" style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#fff;border:none;padding:6px 16px;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer">➕ Thêm</button></div>'
        + '</div>'
        + '<div class="card"><div class="card-body" style="padding:8px"><table class="tsam-tbl" style="width:100%"><thead><tr>'
        + '<th style="text-align:center;width:50px">STT</th>'
        + '<th style="text-align:center">Tên Vị Trí</th>'
        + '<th style="text-align:center;width:100px">Trạng Thái</th>'
        + '<th style="text-align:center;width:120px">Thao Tác</th>'
        + '</tr></thead><tbody id="_vtpTbody"><tr><td colspan="4" style="text-align:center;padding:30px;color:#94a3b8">⏳</td></tr></tbody></table></div></div></div>';
    await _vtpLoad();
}

async function _vtpLoad() {
    var res = await apiCall('/api/tsam/mix-positions/all');
    _vtpData = res.positions || [];
    var tbody = document.getElementById('_vtpTbody');
    if (!tbody) return;
    if (!_vtpData.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:#94a3b8"><div style="font-size:24px;margin-bottom:4px">📌</div>Chưa có vị trí phối nào</td></tr>';
        return;
    }
    tbody.innerHTML = _vtpData.map(function(p, i) {
        var stColor = p.is_active ? '#059669' : '#dc2626';
        var stLabel = p.is_active ? '✅ Hoạt động' : '❌ Tắt';
        return '<tr>'
            + '<td style="text-align:center;color:#94a3b8">' + (i + 1) + '</td>'
            + '<td style="text-align:center;font-weight:700">' + p.name + '</td>'
            + '<td style="text-align:center"><span style="color:' + stColor + ';font-weight:700;font-size:11px;cursor:pointer" onclick="_vtpToggle(' + p.id + ',' + !p.is_active + ')">' + stLabel + '</span></td>'
            + '<td style="text-align:center">'
            + '<button onclick="_vtpEdit(' + p.id + ')" style="background:#3b82f6;color:#fff;border:none;padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;margin-right:4px">✏️</button>'
            + '<button onclick="_vtpDelete(' + p.id + ')" style="background:#dc2626;color:#fff;border:none;padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer">🗑️</button>'
            + '</td></tr>';
    }).join('');
}

function _vtpShowAdd() {
    var body = '<div class="form-group"><label>Tên Vị Trí Phối <span style="color:red">*</span></label>'
        + '<input id="_vtpName" class="form-control" placeholder="VD: Thân Trước, Tay, Vai..."></div>';
    var footer = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>'
        + '<button class="btn" onclick="_vtpSave()" style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#fff;border:none;padding:8px 20px;border-radius:6px;font-weight:700">💾 Lưu</button>';
    openModal('➕ Thêm Vị Trí Phối', body, footer);
}

async function _vtpSave() {
    var name = document.getElementById('_vtpName')?.value?.trim();
    if (!name) { showToast('Nhập tên vị trí', 'error'); return; }
    var res = await apiCall('/api/tsam/mix-positions', 'POST', { name: name });
    if (res.success) { showToast('✅ Đã thêm'); closeModal(); await _vtpLoad(); }
    else { showToast(res.error || 'Lỗi', 'error'); }
}

function _vtpEdit(id) {
    var p = _vtpData.find(function(x) { return x.id === id; });
    if (!p) return;
    var body = '<div class="form-group"><label>Tên Vị Trí Phối <span style="color:red">*</span></label>'
        + '<input id="_vtpName" class="form-control" value="' + p.name + '"></div>';
    var footer = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>'
        + '<button class="btn" onclick="_vtpUpdate(' + id + ')" style="background:#f59e0b;color:#fff;border:none;padding:8px 20px;border-radius:6px;font-weight:700">💾 Cập Nhật</button>';
    openModal('✏️ Sửa Vị Trí Phối', body, footer);
}

async function _vtpUpdate(id) {
    var name = document.getElementById('_vtpName')?.value?.trim();
    if (!name) { showToast('Nhập tên vị trí', 'error'); return; }
    var res = await apiCall('/api/tsam/mix-positions/' + id, 'PUT', { name: name });
    if (res.success) { showToast('✅ Đã cập nhật'); closeModal(); await _vtpLoad(); }
    else { showToast(res.error || 'Lỗi', 'error'); }
}

async function _vtpToggle(id, active) {
    var res = await apiCall('/api/tsam/mix-positions/' + id, 'PUT', { is_active: active });
    if (res.success) { showToast(active ? '✅ Đã bật' : '❌ Đã tắt'); await _vtpLoad(); }
    else { showToast(res.error || 'Lỗi', 'error'); }
}

async function _vtpDelete(id) {
    if (!confirm('Xóa vị trí phối này?')) return;
    var res = await apiCall('/api/tsam/mix-positions/' + id, 'DELETE');
    if (res.success) { showToast('🗑️ Đã xóa'); await _vtpLoad(); }
    else { showToast(res.error || 'Lỗi', 'error'); }
}

// ===== QUYỀN DUYỆT TSAM Tab =====
async function _cdsxLoadQuyenDuyet(container) {
    container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--gray-400)">Đang tải...</div>';
    var res = await apiCall('/api/tsam/approvers');
    var users = res.users || [];
    var roleLabels = { quan_ly_cap_cao:'QL Cấp Cao', quan_ly_xuong:'QL Xưởng', quan_ly:'Quản Lý', truong_phong:'Trưởng Phòng', nhan_vien:'Nhân Viên', thu_viec:'Thử Việc' };

    var h = '<div style="margin-bottom:12px"><div style="font-size:13px;font-weight:700;color:#7c3aed;margin-bottom:4px">🔑 Phân Quyền Duyệt Mẫu Áo (TSAM)</div>'
        + '<div style="font-size:11px;color:var(--gray-400)">Bật/tắt quyền Duyệt, Từ Chối, Xóa mẫu áo cho từng nhân viên.<br>GĐ luôn có quyền duyệt mặc định.</div></div>';

    h += '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>'
        + '<th style="padding:8px 6px;border-bottom:2px solid var(--gray-200);text-align:left">Nhân Viên</th>'
        + '<th style="padding:8px 6px;border-bottom:2px solid var(--gray-200);text-align:left">Vai Trò</th>'
        + '<th style="padding:8px 6px;border-bottom:2px solid var(--gray-200);text-align:center">Quyền Duyệt</th>'
        + '</tr></thead><tbody>';

    if (!users.length) {
        h += '<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--gray-400)">Không có nhân viên</td></tr>';
    }
    users.forEach(function(u) {
        var checked = u.can_approve_tsam ? ' checked' : '';
        var roleName = roleLabels[u.role] || u.role;
        h += '<tr style="border-bottom:1px solid var(--gray-100)">'
            + '<td style="padding:8px 6px;font-weight:600">' + (u.full_name || u.username) + ' <span style="font-size:10px;color:var(--gray-400)">@' + u.username + '</span></td>'
            + '<td style="padding:8px 6px"><span style="background:#ede9fe;color:#7c3aed;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700">' + roleName + '</span></td>'
            + '<td style="padding:8px 6px;text-align:center">'
            + '<label style="position:relative;display:inline-block;width:42px;height:22px;cursor:pointer">'
            + '<input type="checkbox" onchange="_cdsxToggleApprover(' + u.id + ', this.checked)" style="opacity:0;width:0;height:0"' + checked + '>'
            + '<span style="position:absolute;top:0;left:0;right:0;bottom:0;background:' + (u.can_approve_tsam ? '#059669' : '#cbd5e1') + ';border-radius:22px;transition:.3s"></span>'
            + '<span style="position:absolute;top:2px;left:' + (u.can_approve_tsam ? '22px' : '2px') + ';width:18px;height:18px;background:#fff;border-radius:50%;transition:.3s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></span>'
            + '</label>'
            + '</td></tr>';
    });
    h += '</tbody></table>';
    container.innerHTML = h;
}

async function _cdsxToggleApprover(userId, val) {
    var res = await apiCall('/api/tsam/approvers/' + userId, 'PUT', { can_approve: val });
    if (res.success) { showToast(val ? '✅ Đã cấp quyền duyệt' : '❌ Đã thu hồi quyền duyệt'); }
    else { showToast(res.error || 'Lỗi', 'error'); }
    // Reload to update toggle visuals
    var content = document.getElementById('cdsxContent');
    if (content) await _cdsxLoadQuyenDuyet(content);
}

// ===== LƯƠNG THỢ CẮT Tab =====
let _ltcProductTypes = [];
let _ltcTiers = [];
let _ltcCutters = [];
let _ltcAssignments = [];

async function _cdsxLoadLuongThoCat(container) {
    container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--gray-400)">Đang tải cấu hình lương thợ cắt...</div>';
    try {
        const ptRes = await apiCall('/api/cutting-salary/product-types');
        const tRes = await apiCall('/api/cutting-salary/tiers');
        const aRes = await apiCall('/api/cutting-salary/assignments');

        _ltcProductTypes = ptRes.product_types || [];
        _ltcTiers = tRes.tiers || [];
        _ltcCutters = aRes.cutters || [];
        _ltcAssignments = aRes.assignments || [];

        _ltcRenderMain(container);
    } catch(e) {
        container.innerHTML = '<div style="padding:20px;color:#dc2626;font-weight:700;">Lỗi tải cấu hình lương: ' + e.message + '</div>';
    }
}

function _ltcRenderMain(container) {
    let h = `
        <div style="display:grid; grid-template-columns: 460px 1fr; gap: 20px; margin-top: 10px;">
            <!-- Left panel: Quản lý Bậc Lương -->
            <div style="background:#fff; border-radius:12px; padding:16px; box-shadow:0 2px 8px rgba(0,0,0,0.06); display:flex; flex-direction:column; gap:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:10px;">
                    <span style="font-weight:800; font-size:14px; color:#1e293b;">📋 Danh Sách Bậc Lương</span>
                    <button onclick="_ltcShowCreateTier()" style="background:linear-gradient(135deg,#2563eb,#1d4ed8); color:#fff; border:none; padding:6px 12px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;">➕ Thêm Bậc</button>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <label style="font-size:11px; font-weight:700; color:#64748b; min-width:85px;">Lọc Sản phẩm:</label>
                    <select id="_ltcFilterProdType" onchange="_ltcRenderTiersList()" style="flex:1; border:1px solid #d1d5db; border-radius:6px; padding:5px 8px; font-size:12px; background:#fff;">
                        <option value="all">-- Tất cả sản phẩm --</option>
                        ${_ltcProductTypes.map(pt => `<option value="${pt}">${pt}</option>`).join('')}
                    </select>
                </div>
                <div id="_ltcTiersListContainer" style="flex:1; overflow-y:auto; max-height:calc(100vh - 350px); display:flex; flex-direction:column; gap:10px; padding-top:4px;">
                    <!-- Filled by JS -->
                </div>
            </div>

            <!-- Right panel: Gán Bậc Lương Nhân Viên -->
            <div style="background:#fff; border-radius:12px; padding:16px; box-shadow:0 2px 8px rgba(0,0,0,0.06); display:flex; flex-direction:column; gap:12px;">
                <div style="border-bottom:1px solid #f1f5f9; padding-bottom:10px;">
                    <span style="font-weight:800; font-size:14px; color:#7c3aed;">👥 Gán Bậc Lương Thợ Cắt</span>
                    <div style="font-size:11px; color:#94a3b8; margin-top:2px;">Chọn bậc lương tương ứng cho mỗi thợ theo từng loại sản phẩm. Thay đổi sẽ tự động lưu lại.</div>
                </div>
                <div style="flex:1; overflow:auto; max-height:calc(100vh - 290px);">
                    <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;">
                        <thead>
                            <tr style="border-bottom:2px solid #cbd5e1; background:#1e3a5f !important; color:#ffffff !important; position:sticky; top:0; z-index:1;">
                                <th style="padding:10px 8px; font-weight:700; color:#ffffff !important; background:#1e3a5f !important;">Thợ Cắt</th>
                                ${_ltcProductTypes.map(pt => `<th style="padding:10px 8px; font-weight:700; color:#ffffff !important; background:#1e3a5f !important; min-width:110px;">${pt}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${_ltcCutters.map(cutter => `
                                <tr style="border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background='#faf5ff'" onmouseout="this.style.background='none'">
                                    <td style="padding:10px 8px; font-weight:700; color:#1e293b;">
                                        ${cutter.full_name || cutter.username}
                                        <div style="font-size:10px; font-weight:normal; color:#94a3b8;">@${cutter.username}</div>
                                    </td>
                                    ${_ltcProductTypes.map(pt => {
                                        const currentTierId = _ltcAssignments.find(a => a.user_id === cutter.id && a.product_type === pt)?.tier_id || '';
                                        const availableTiers = _ltcTiers.filter(t => {
                                            const types = (t.product_type || '').split(',').map(s => s.trim());
                                            return types.includes(pt);
                                        });
                                        return `
                                            <td style="padding:8px 6px;">
                                                <select onchange="_ltcSaveAssignment(${cutter.id}, '${pt}', this.value)" style="width:100%; border:1px solid #d1d5db; border-radius:6px; padding:4px 6px; font-size:11px; background:#fff; cursor:pointer;">
                                                    <option value="">-- Chưa gán --</option>
                                                    ${availableTiers.map(t => `<option value="${t.id}" ${t.id == currentTierId ? 'selected' : ''}>${t.tier_name}</option>`).join('')}
                                                </select>
                                            </td>
                                        `;
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    container.innerHTML = h;
    _ltcRenderTiersList();
}

function _ltcRenderTiersList() {
    const container = document.getElementById('_ltcTiersListContainer');
    if (!container) return;

    const filterVal = document.getElementById('_ltcFilterProdType')?.value || 'all';
    const filteredTiers = filterVal === 'all' ? _ltcTiers : _ltcTiers.filter(t => {
        const types = (t.product_type || '').split(',').map(s => s.trim());
        return types.includes(filterVal);
    });

    if (filteredTiers.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8; font-size:11px;">Chưa có bậc lương nào</div>';
        return;
    }

    let h = '';
    filteredTiers.forEach(t => {
        let rules = [];
        try {
            rules = typeof t.rules === 'string' ? JSON.parse(t.rules) : t.rules;
        } catch(e) {}

        let rulesText = '';
        rules.forEach(r => {
            const min = r.min_qty;
            const max = r.max_qty;
            const price = Number(r.price).toLocaleString('vi-VN') + 'đ';
            let qtyText = '';
            if (max === null || max === undefined || max === '') {
                qtyText = `> ${min - 1} sản phẩm`;
            } else {
                qtyText = `${min} - ${max} sản phẩm`;
            }
            rulesText += `<div style="display:flex; justify-content:space-between; font-size:11px; color:#475569; padding:2px 0;">
                <span>• ${qtyText}</span>
                <span style="font-weight:700; color:#0f766e;">${price}/sp</span>
            </div>`;
        });

        const badges = (t.product_type || '').split(',').map(s => s.trim()).map(p => `
            <span style="background:#ccfbf1; color:#0d9488; font-size:9px; padding:1px 5px; border-radius:4px; font-weight:700; margin-left:4px; display:inline-block; margin-top:2px;">${p}</span>
        `).join('');

        h += `
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed #cbd5e1; padding-bottom:4px;">
                    <div>
                        <span style="font-weight:800; font-size:12px; color:#1e293b;">${t.tier_name}</span>
                        ${badges}
                    </div>
                    <div style="display:flex; gap:6px;">
                        <button onclick="_ltcEditTier(${t.id})" style="border:none; background:none; color:#2563eb; font-weight:700; font-size:10px; cursor:pointer;">✏️ Sửa</button>
                        <button onclick="_ltcDeleteTier(${t.id})" style="border:none; background:none; color:#dc2626; font-weight:700; font-size:10px; cursor:pointer;">🗑️ Xóa</button>
                    </div>
                </div>
                <div>
                    ${rulesText}
                </div>
            </div>
        `;
    });
    container.innerHTML = h;
}

async function _ltcSaveAssignment(cutterId, productType, tierId) {
    try {
        const res = await apiCall('/api/cutting-salary/assignments', 'POST', {
            user_id: cutterId,
            product_type: productType,
            tier_id: tierId ? Number(tierId) : null
        });
        if (res.success) {
            showToast('✅ Đã lưu gán bậc lương');
            if (!tierId) {
                _ltcAssignments = _ltcAssignments.filter(a => !(a.user_id === cutterId && a.product_type === productType));
            } else {
                const existing = _ltcAssignments.find(a => a.user_id === cutterId && a.product_type === productType);
                if (existing) {
                    existing.tier_id = Number(tierId);
                } else {
                    _ltcAssignments.push({ user_id: cutterId, product_type: productType, tier_id: Number(tierId) });
                }
            }
        } else {
            showToast(res.error || 'Lỗi', 'error');
        }
    } catch(err) {
        showToast('Lỗi kết nối', 'error');
    }
}

function _ltcShowCreateTier() {
    _ltcShowTierFormModal();
}

function _ltcEditTier(id) {
    const tier = _ltcTiers.find(t => t.id === id);
    if (!tier) return;
    _ltcShowTierFormModal(tier);
}

function _ltcShowTierFormModal(tier = null) {
    const isEdit = !!tier;
    const title = isEdit ? '✏️ Chỉnh Sửa Bậc Lương' : '➕ Thêm Bậc Lương Mới';
    
    let rules = [{ min_qty: 1, max_qty: 299, price: 400 }];
    if (isEdit) {
        try {
            rules = typeof tier.rules === 'string' ? JSON.parse(tier.rules) : tier.rules;
        } catch(e) {}
    }

    let body = `
        <div style="display:flex; flex-direction:column; gap:12px; font-size:12px;">
            <div style="display:flex; gap:12px; align-items: stretch;">
                <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                    <label style="font-weight:700; color:#475569;">Tên bậc lương:</label>
                    <input type="text" id="_formTierName" value="${isEdit ? tier.tier_name : ''}" placeholder="Ví dụ: Bậc 1" style="border:1px solid #d1d5db; border-radius:6px; padding:6px 10px; height: 38px; box-sizing: border-box;">
                </div>
                <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                    <label style="font-weight:700; color:#475569;">Loại sản phẩm (chọn nhiều):</label>
                    <div style="border:1px solid #d1d5db; border-radius:6px; padding:8px; background:#fff; max-height:120px; overflow-y:auto; display:grid; grid-template-columns: 1fr 1fr; gap:6px; box-sizing: border-box;">
                        ${_ltcProductTypes.map(pt => {
                            const isChecked = isEdit && (tier.product_type || '').split(',').map(s => s.trim()).includes(pt);
                            return `
                                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:11px; user-select:none; margin:0;">
                                    <input type="checkbox" class="_formTierProdTypeCb" value="${pt}" ${isChecked ? 'checked' : ''} style="cursor:pointer; width:14px; height:14px; margin:0;">
                                    <span>${pt}</span>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
            
            <div style="border-top:1px solid #e2e8f0; padding-top:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span style="font-weight:700; color:#475569;">Định mức số lượng & Đơn giá:</span>
                    <button onclick="_formAddRuleRow()" style="background:#10b981; color:#fff; border:none; padding:4px 10px; border-radius:4px; font-size:10px; font-weight:700; cursor:pointer;">➕ Thêm khoảng</button>
                </div>
                <div id="_formRulesContainer" style="display:flex; flex-direction:column; gap:8px; max-height:220px; overflow-y:auto; padding-right:4px;">
                    <!-- Rule rows dynamic -->
                </div>
            </div>
        </div>
    `;

    let footer = `<button class="btn" onclick="${isEdit ? `_ltcSubmitTierForm(${tier.id})` : '_ltcSubmitTierForm()'}" style="background:#2563eb; color:#fff; border:none; padding:8px 20px; border-radius:6px; font-weight:700; cursor:pointer;">💾 Lưu Bậc Lương</button>`;
    
    openModal(title, body, footer);

    window._formAddRuleRow = function(min = '', max = '', price = '') {
        const container = document.getElementById('_formRulesContainer');
        if (!container) return;
        const row = document.createElement('div');
        row.className = '_form-rule-row';
        row.style = 'display:flex; gap:8px; align-items:center; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:6px;';
        row.innerHTML = `
            <div style="display:flex; align-items:center; gap:4px; flex:1;">
                <span style="color:#64748b; font-size:10px;">Từ:</span>
                <input type="number" class="min-qty" value="${min}" placeholder="1" style="width:100%; border:1px solid #d1d5db; border-radius:4px; padding:3px 6px;">
            </div>
            <div style="display:flex; align-items:center; gap:4px; flex:1;">
                <span style="color:#64748b; font-size:10px;">Đến:</span>
                <input type="number" class="max-qty" value="${max}" placeholder="Ví dụ: 299" style="width:100%; border:1px solid #d1d5db; border-radius:4px; padding:3px 6px;">
                <span style="color:#94a3b8; font-size:10px; cursor:pointer;" onclick="this.previousElementSibling.value='';" title="Vô hạn (Không giới hạn tối đa)">♾️</span>
            </div>
            <div style="display:flex; align-items:center; gap:4px; flex:1.2;">
                <span style="color:#64748b; font-size:10px;">Đơn giá:</span>
                <input type="number" class="price" value="${price}" placeholder="đ/sp" style="width:100%; border:1px solid #d1d5db; border-radius:4px; padding:3px 6px;">
            </div>
            <button onclick="this.parentElement.remove()" style="background:none; border:none; color:#dc2626; font-size:12px; cursor:pointer;" title="Xóa">🗑️</button>
        `;
        container.appendChild(row);
    };

    rules.forEach(r => {
        window._formAddRuleRow(r.min_qty, r.max_qty !== null && r.max_qty !== undefined ? r.max_qty : '', r.price);
    });
}

async function _ltcSubmitTierForm(id = null) {
    const isEdit = id !== null;
    const tierName = document.getElementById('_formTierName')?.value?.trim();
    const prodTypeCbs = document.querySelectorAll('._formTierProdTypeCb:checked');
    const selectedProdTypes = Array.from(prodTypeCbs).map(cb => cb.value);
    
    if (!tierName) { showToast('Nhập tên bậc lương', 'error'); return; }
    if (selectedProdTypes.length === 0) { showToast('Chọn ít nhất một loại sản phẩm', 'error'); return; }

    const productType = selectedProdTypes.join(', ');

    const rowEls = document.querySelectorAll('#_formRulesContainer ._form-rule-row');
    const rules = [];
    
    for (const row of rowEls) {
        const minVal = row.querySelector('.min-qty').value;
        const maxVal = row.querySelector('.max-qty').value;
        const priceVal = row.querySelector('.price').value;

        if (minVal === '' || isNaN(Number(minVal))) {
            showToast('Giá trị "Từ" số lượng phải là số', 'error');
            return;
        }
        if (priceVal === '' || isNaN(Number(priceVal))) {
            showToast('Đơn giá phải là số hợp lệ', 'error');
            return;
        }

        rules.push({
            min_qty: Number(minVal),
            max_qty: maxVal !== '' ? Number(maxVal) : null,
            price: Number(priceVal)
        });
    }

    if (rules.length === 0) {
        showToast('Vui lòng thêm ít nhất một dòng định mức', 'error');
        return;
    }

    rules.sort((a, b) => a.min_qty - b.min_qty);

    const payload = {
        tier_name: tierName,
        product_type: productType,
        rules: rules
    };

    try {
        const url = isEdit ? `/api/cutting-salary/tiers/${id}` : '/api/cutting-salary/tiers';
        const method = isEdit ? 'PUT' : 'POST';
        const res = await apiCall(url, method, payload);
        if (res.success) {
            showToast(isEdit ? '✅ Đã cập nhật bậc lương' : '✅ Đã thêm bậc lương mới');
            closeModal();
            const content = document.getElementById('cdsxContent');
            if (content) await _cdsxLoadLuongThoCat(content);
        } else {
            showToast(res.error || 'Lỗi', 'error');
        }
    } catch(err) {
        showToast('Lỗi kết nối', 'error');
    }
}

async function _ltcDeleteTier(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa bậc lương này?')) return;
    try {
        const res = await apiCall(`/api/cutting-salary/tiers/${id}`, 'DELETE');
        if (res.success) {
            showToast('🗑️ Đã xóa bậc lương');
            const content = document.getElementById('cdsxContent');
            if (content) await _cdsxLoadLuongThoCat(content);
        } else {
            showToast(res.error || 'Lỗi', 'error');
        }
    } catch(err) {
        showToast('Lỗi kết nối', 'error');
    }
}

// ========== LƯƠNG THỢ ÉP UI LOGIC ==========
let _lteTiers = [];
let _ltePressers = [];
let _lteAssignments = [];
let _ltePositions = [];

async function _cdsxLoadLuongThoEp(container) {
    container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--gray-400)">Đang tải cấu hình lương thợ ép...</div>';
    try {
        const tRes = await apiCall('/api/pressing-salary/tiers');
        const aRes = await apiCall('/api/pressing-salary/assignments');
        const pRes = await apiCall('/api/pressing/positions');

        _lteTiers = tRes.tiers || [];
        _ltePressers = aRes.pressers || [];
        _lteAssignments = aRes.assignments || [];
        _ltePositions = pRes.positions || [];

        _lteRenderMain(container);
    } catch(e) {
        container.innerHTML = '<div style="padding:20px;color:#dc2626;font-weight:700;">Lỗi tải cấu hình lương thợ ép: ' + e.message + '</div>';
    }
}

function _lteRenderMain(container) {
    let h = `
        <div style="display:grid; grid-template-columns: 320px 420px 1fr; gap: 20px; margin-top: 10px;">
            <!-- Column 1: Cấu hình Vị Trí Ép -->
            <div style="background:#fff; border-radius:12px; padding:16px; box-shadow:0 2px 8px rgba(0,0,0,0.06); display:flex; flex-direction:column; gap:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:10px;">
                    <span style="font-weight:800; font-size:14px; color:#0f766e;">🎯 Vị Trí Ép</span>
                    <button onclick="_lteShowCreatePositionModal()" style="background:linear-gradient(135deg,#0f766e,#0d9488); color:#fff; border:none; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;">➕ Thêm Vị Trí</button>
                </div>
                <div id="_ltePositionsListContainer" style="flex:1; overflow-y:auto; max-height:calc(100vh - 300px); display:flex; flex-direction:column; gap:8px;">
                    <!-- Filled dynamically -->
                </div>
            </div>

            <!-- Column 2: Quản lý Bậc Lương -->
            <div style="background:#fff; border-radius:12px; padding:16px; box-shadow:0 2px 8px rgba(0,0,0,0.06); display:flex; flex-direction:column; gap:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:10px;">
                    <span style="font-weight:800; font-size:14px; color:#1e293b;">📋 Danh Sách Bậc Lương Ép</span>
                    <button onclick="_lteShowCreateTier()" style="background:linear-gradient(135deg,#2563eb,#1d4ed8); color:#fff; border:none; padding:6px 12px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;">➕ Thêm Bậc</button>
                </div>
                <div id="_lteTiersListContainer" style="flex:1; overflow-y:auto; max-height:calc(100vh - 300px); display:flex; flex-direction:column; gap:10px; padding-top:4px;">
                    <!-- Filled by JS -->
                </div>
            </div>

            <!-- Column 3: Gán Bậc Lương Nhân Viên -->
            <div style="background:#fff; border-radius:12px; padding:16px; box-shadow:0 2px 8px rgba(0,0,0,0.06); display:flex; flex-direction:column; gap:12px;">
                <div style="border-bottom:1px solid #f1f5f9; padding-bottom:10px;">
                    <span style="font-weight:800; font-size:14px; color:#7c3aed;">👥 Gán Bậc Lương Thợ Ép</span>
                    <div style="font-size:11px; color:#94a3b8; margin-top:2px;">Chọn bậc lương tương ứng cho từng nhân viên phòng ép. Thay đổi sẽ tự động lưu lại.</div>
                </div>
                <div style="flex:1; overflow:auto; max-height:calc(100vh - 290px);">
                    <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;">
                        <thead>
                            <tr style="border-bottom:2px solid #cbd5e1; background:#1e3a5f !important; color:#ffffff !important; position:sticky; top:0; z-index:1;">
                                <th style="padding:10px 8px; font-weight:700; color:#ffffff !important; background:#1e3a5f !important;">Nhân Viên</th>
                                <th style="padding:10px 8px; font-weight:700; color:#ffffff !important; background:#1e3a5f !important;">Bộ Phận</th>
                                <th style="padding:10px 8px; font-weight:700; color:#ffffff !important; background:#1e3a5f !important; width:200px;">Bậc Lương Ép</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${_ltePressers.map(presser => {
                                const currentTierId = _lteAssignments.find(a => a.user_id === presser.id)?.tier_id || '';
                                return `
                                    <tr style="border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background='#faf5ff'" onmouseout="this.style.background='none'">
                                        <td style="padding:10px 8px; font-weight:700; color:#1e293b;">
                                            ${presser.full_name || presser.username}
                                            <div style="font-size:10px; font-weight:normal; color:#94a3b8;">@${presser.username}</div>
                                        </td>
                                        <td style="padding:10px 8px; color:#64748b;">
                                            ${presser.dept_name || 'Phòng Ép'}
                                        </td>
                                        <td style="padding:8px 6px;">
                                            <select onchange="_lteSaveAssignment(${presser.id}, this.value)" style="width:100%; border:1px solid #d1d5db; border-radius:6px; padding:6px 8px; font-size:11px; background:#fff; cursor:pointer;">
                                                <option value="">-- Chưa gán --</option>
                                                ${_lteTiers.map(t => `<option value="${t.id}" ${t.id == currentTierId ? 'selected' : ''}>${t.tier_name}</option>`).join('')}
                                            </select>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    container.innerHTML = h;
    _lteRenderPositionsList();
    _lteRenderTiersList();
}

function _lteRenderPositionsList() {
    const container = document.getElementById('_ltePositionsListContainer');
    if (!container) return;

    if (_ltePositions.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8; font-size:11px;">Chưa có vị trí nào</div>';
        return;
    }

    let h = '';
    _ltePositions.forEach(p => {
        h += `
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; flex-direction:column; gap:2px; max-width: 70%;">
                    <span style="font-weight:700; font-size:12px; color:#1e293b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${p.display_name}">${p.display_name}</span>
                    <span style="font-size:10px; color:#64748b;">Viết tắt: <span style="font-weight:700; color:#0f766e;">${p.short_name || '—'}</span></span>
                    <span style="font-size:10px; color:${p.is_active ? '#0d9488' : '#94a3b8'}">${p.is_active ? '● Hoạt động' : '○ Tắt'}</span>
                </div>
                <div style="display:flex; gap:8px;">
                    <button onclick="_lteShowEditPositionModal(${p.id})" style="border:none; background:none; color:#2563eb; font-weight:700; font-size:10px; cursor:pointer;">✏️ Sửa</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = h;
}

function _lteRenderTiersList() {
    const container = document.getElementById('_lteTiersListContainer');
    if (!container) return;

    if (_lteTiers.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8; font-size:11px;">Chưa có bậc lương nào</div>';
        return;
    }

    let h = '';
    _lteTiers.forEach(t => {
        h += `
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed #cbd5e1; padding-bottom:6px;">
                    <span style="font-weight:800; font-size:13px; color:#1e293b;">${t.tier_name}</span>
                    <div style="display:flex; gap:8px;">
                        <button onclick="_lteEditTier(${t.id})" style="border:none; background:none; color:#2563eb; font-weight:700; font-size:10px; cursor:pointer;">✏️ Sửa</button>
                        <button onclick="_lteDeleteTier(${t.id})" style="border:none; background:none; color:#dc2626; font-weight:700; font-size:10px; cursor:pointer;">🗑️ Xóa</button>
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; gap:4px; font-size:11px;">
                    ${_ltePositions.filter(pos => pos.is_active).map(pos => {
                        const qtyCol = pos.key_code;
                        const prcCol = qtyCol.startsWith('pos_') && !['pos_chest_arm', 'pos_back_belly', 'pos_protective', 'pos_packaging', 'pos_other'].includes(qtyCol)
                            ? 'price_' + qtyCol
                            : qtyCol.replace('pos_', 'price_');
                        return `
                            <div style="display:flex; justify-content:space-between; padding:2px 0;">
                                <span style="color:#475569;">• ${pos.display_name}:</span>
                                <span style="font-weight:700; color:#0f766e;">${(Number(t[prcCol]) || 0).toLocaleString('vi-VN')}đ</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });
    container.innerHTML = h;
}

async function _lteSaveAssignment(presserId, tierId) {
    try {
        const res = await apiCall('/api/pressing-salary/assignments', 'POST', {
            user_id: presserId,
            tier_id: tierId ? Number(tierId) : null
        });
        if (res.success) {
            showToast('✅ Đã lưu gán bậc lương thợ ép');
            if (!tierId) {
                _lteAssignments = _lteAssignments.filter(a => a.user_id !== presserId);
            } else {
                const existing = _lteAssignments.find(a => a.user_id === presserId);
                if (existing) {
                    existing.tier_id = Number(tierId);
                } else {
                    _lteAssignments.push({ user_id: presserId, tier_id: Number(tierId) });
                }
            }
        } else {
            showToast(res.error || 'Lỗi', 'error');
        }
    } catch(err) {
        showToast('Lỗi kết nối', 'error');
    }
}

function _lteShowCreateTier() {
    _lteShowTierFormModal();
}

function _lteEditTier(id) {
    const tier = _lteTiers.find(t => t.id === id);
    if (!tier) return;
    _lteShowTierFormModal(tier);
}

function _lteShowTierFormModal(tier = null) {
    const isEdit = !!tier;
    const title = isEdit ? '✏️ Chỉnh Sửa Bậc Lương Ép' : '➕ Thêm Bậc Lương Ép Mới';

    let body = `
        <div style="display:flex; flex-direction:column; gap:12px; font-size:12px; width:450px;">
            <div style="display:flex; flex-direction:column; gap:4px;">
                <label style="font-weight:700; color:#475569;">Tên bậc lương:</label>
                <input type="text" id="_lteFormTierName" value="${isEdit ? tier.tier_name : ''}" placeholder="Ví dụ: Bậc 1" style="width:100%; border:1px solid #d1d5db; border-radius:6px; padding:6px 10px; height: 38px; box-sizing: border-box;">
            </div>
            
            <div style="border-top:1px solid #e2e8f0; padding-top:10px; display:flex; flex-direction:column; gap:10px;">
                <span style="font-weight:700; color:#475569;">Đơn giá cho từng vị trí (đ/áo):</span>
                ${_ltePositions.filter(pos => pos.is_active).map(pos => {
                    const qtyCol = pos.key_code;
                    const prcCol = qtyCol.startsWith('pos_') && !['pos_chest_arm', 'pos_back_belly', 'pos_protective', 'pos_packaging', 'pos_other'].includes(qtyCol)
                        ? 'price_' + qtyCol
                        : qtyCol.replace('pos_', 'price_');
                    
                    let defaultVal = 0;
                    if (pos.key_code === 'pos_chest_arm') defaultVal = 250;
                    else if (pos.key_code === 'pos_back_belly') defaultVal = 350;
                    else if (pos.key_code === 'pos_protective') defaultVal = 400;
                    else if (pos.key_code === 'pos_packaging') defaultVal = 100;
                    else if (pos.key_code === 'pos_other') defaultVal = 250;

                    const val = isEdit ? (tier[prcCol] !== undefined ? tier[prcCol] : 0) : defaultVal;
                    return `
                        <div style="display:grid; grid-template-columns: 1fr 120px; gap:10px; align-items:center;">
                            <span style="color:#475569;">${pos.display_name}:</span>
                            <input type="number" class="lte-dynamic-price-input" data-col="${prcCol}" value="${val}" style="border:1px solid #d1d5db; border-radius:6px; padding:6px 10px; text-align:right; box-sizing: border-box; height: 32px;">
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    let footer = `<button class="btn" onclick="${isEdit ? `_lteSubmitTierForm(${tier.id})` : '_lteSubmitTierForm()'}" style="background:#2563eb; color:#fff; border:none; padding:8px 20px; border-radius:6px; font-weight:700; cursor:pointer;">💾 Lưu Bậc Lương</button>`;
    
    openModal(title, body, footer);
}

async function _lteSubmitTierForm(id = null) {
    const isEdit = id !== null;
    const tierName = document.getElementById('_lteFormTierName')?.value?.trim();
    if (!tierName) { showToast('Nhập tên bậc lương', 'error'); return; }

    const payload = {
        tier_name: tierName
    };

    const inputs = document.querySelectorAll('.lte-dynamic-price-input');
    inputs.forEach(input => {
        const col = input.getAttribute('data-col');
        payload[col] = Number(input.value) || 0;
    });

    try {
        const url = isEdit ? `/api/pressing-salary/tiers/${id}` : '/api/pressing-salary/tiers';
        const method = isEdit ? 'PUT' : 'POST';
        const res = await apiCall(url, method, payload);
        if (res.success) {
            showToast(isEdit ? '✅ Đã cập nhật bậc lương thợ ép' : '✅ Đã thêm bậc lương thợ ép mới');
            closeModal();
            const content = document.getElementById('cdsxContent');
            if (content) await _cdsxLoadLuongThoEp(content);
        } else {
            showToast(res.error || 'Lỗi', 'error');
        }
    } catch(err) {
        showToast('Lỗi kết nối', 'error');
    }
}

async function _lteDeleteTier(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa bậc lương này?')) return;
    try {
        const res = await apiCall(`/api/pressing-salary/tiers/${id}`, 'DELETE');
        if (res.success) {
            showToast('🗑️ Đã xóa bậc lương thợ ép');
            const content = document.getElementById('cdsxContent');
            if (content) await _cdsxLoadLuongThoEp(content);
        } else {
            showToast(res.error || 'Lỗi', 'error');
        }
    } catch(err) {
        showToast('Lỗi kết nối', 'error');
    }
}

function _lteShowCreatePositionModal() {
    _lteShowPositionFormModal();
}

function _lteShowEditPositionModal(id) {
    const pos = _ltePositions.find(p => p.id === id);
    if (!pos) return;
    _lteShowPositionFormModal(pos);
}

function _lteShowPositionFormModal(pos = null) {
    const isEdit = !!pos;
    const title = isEdit ? '✏️ Chỉnh Sửa Vị Trí Ép' : '➕ Thêm Vị Trí Ép Mới';

    let body = `
        <div style="display:flex; flex-direction:column; gap:12px; font-size:12px; width:360px;">
            <div style="display:flex; flex-direction:column; gap:4px;">
                <label style="font-weight:700; color:#475569;">Tên vị trí:</label>
                <input type="text" id="_lteFormPosName" value="${isEdit ? pos.display_name : ''}" placeholder="Ví dụ: Cổ Bẻ Phối" style="width:100%; border:1px solid #d1d5db; border-radius:6px; padding:6px 10px; height: 38px; box-sizing: border-box;">
            </div>
            
            <div style="display:flex; flex-direction:column; gap:4px;">
                <label style="font-weight:700; color:#475569;">Tên viết tắt (Rút gọn):</label>
                <input type="text" id="_lteFormPosShort" value="${isEdit ? (pos.short_name || '') : ''}" placeholder="Ví dụ: Cổ Bẻ" style="width:100%; border:1px solid #d1d5db; border-radius:6px; padding:6px 10px; height: 38px; box-sizing: border-box;">
            </div>
            
            ${isEdit ? `
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <label style="font-weight:700; color:#475569;">Thứ tự hiển thị:</label>
                    <input type="number" id="_lteFormPosOrder" value="${pos.display_order || 0}" style="width:100%; border:1px solid #d1d5db; border-radius:6px; padding:6px 10px; height: 38px; box-sizing: border-box;">
                </div>
                <div style="display:flex; align-items:center; gap:8px; margin-top: 4px;">
                    <input type="checkbox" id="_lteFormPosActive" ${pos.is_active ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;">
                    <label for="_lteFormPosActive" style="font-weight:700; color:#475569; cursor: pointer;">Hoạt động</label>
                </div>
            ` : ''}
        </div>
    `;

    let footer = `<button class="btn" onclick="${isEdit ? `_lteSubmitPositionForm(${pos.id})` : '_lteSubmitPositionForm()'}" style="background:#0f766e; color:#fff; border:none; padding:8px 20px; border-radius:6px; font-weight:700; cursor:pointer;">💾 Lưu Vị Trí</button>`;

    openModal(title, body, footer);
}

async function _lteSubmitPositionForm(id = null) {
    const isEdit = id !== null;
    const name = document.getElementById('_lteFormPosName')?.value?.trim();
    if (!name) { showToast('Nhập tên vị trí', 'error'); return; }

    const shortName = document.getElementById('_lteFormPosShort')?.value?.trim();

    let payload = { display_name: name, short_name: shortName };
    if (isEdit) {
        const order = document.getElementById('_lteFormPosOrder')?.value;
        const active = document.getElementById('_lteFormPosActive')?.checked;
        payload.display_order = Number(order) || 0;
        payload.is_active = !!active;
    }

    try {
        const url = isEdit ? `/api/pressing/positions/${id}` : '/api/pressing/positions';
        const method = isEdit ? 'PUT' : 'POST';
        const res = await apiCall(url, method, payload);
        if (res.success) {
            showToast(isEdit ? '✅ Đã cập nhật vị trí ép' : '✅ Đã thêm vị trí ép mới');
            closeModal();
            const content = document.getElementById('cdsxContent');
            if (content) await _cdsxLoadLuongThoEp(content);
        } else {
            showToast(res.error || 'Lỗi', 'error');
        }
    } catch(err) {
        showToast('Lỗi kết nối', 'error');
    }
}


