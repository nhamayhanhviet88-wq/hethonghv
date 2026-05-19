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
                    <div class="tab" data-tab="bang-gia" onclick="switchCdsxTab('bang-gia', this)">💲 Bảng Giá May</div>
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
        case 'bang-gia':
            await _cdsxLoadBangGia(content);
            break;
        case 'nhac-nho':
            await _cdsxLoadNhacNho(content);
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
var _bgm = { items: [], groups: [], total: 0, filter: 'all', search: '' };
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
        + '<span style="flex:1"></span>'
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

function _bgmRender() {
    var el = document.getElementById('_bgmTable'); if (!el) return;
    console.log('[BGM] render called, items:', _bgm.items.length, 'filter:', _bgm.filter);
    try {
    var filtered = _bgm.items;
    if (_bgm.filter !== 'all') filtered = filtered.filter(function(i) { return i.group_name === _bgm.filter; });
    if (_bgm.search) {
        var q = _bgm.search.toLowerCase();
        filtered = filtered.filter(function(i) { return i.name.toLowerCase().indexOf(q) >= 0 || i.group_name.toLowerCase().indexOf(q) >= 0; });
    }
    if (filtered.length === 0) { el.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;font-size:13px">Chưa có chi tiết may nào</div>'; return; }

    var h = '<table style="width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed"><thead><tr style="background:#1e3a5f;color:#fff;position:sticky;top:0">'
        + '<th style="padding:10px 8px;text-align:left;font-weight:700;font-size:10px;width:16%">TÊN</th>'
        + '<th style="padding:10px 8px;text-align:center;font-weight:700;font-size:10px;width:4%">ID</th>'
        + '<th style="padding:10px 8px;text-align:left;font-weight:700;font-size:10px;width:14%">TÊN CHI TIẾT</th>'
        + '<th style="padding:10px 8px;text-align:center;font-weight:700;font-size:10px;width:10%">NHÓM</th>'
        + '<th style="padding:10px 8px;text-align:center;font-weight:700;font-size:10px;width:14%">PHÂN QUYỀN</th>'
        + '<th style="padding:10px 8px;text-align:center;font-weight:700;font-size:10px;width:8%">LOẠI THÊM</th>'
        + '<th style="padding:10px 8px;text-align:right;font-weight:700;font-size:10px;width:9%">GIÁ NM</th>'
        + '<th style="padding:10px 8px;text-align:right;font-weight:700;font-size:10px;width:9%">GIÁ GC</th>'
        + '<th style="padding:10px 8px;text-align:left;font-weight:700;font-size:10px;width:12%">LỊCH SỬ CN</th>'
        + '<th style="padding:10px 8px;text-align:center;font-weight:700;font-size:10px;width:4%"></th>'
        + '</tr></thead><tbody>';

    filtered.forEach(function(item) {
        var addLabel = item.add_type === 'once' ? '1 lần' : 'nhiều';
        var displayName = item.name + ' - ' + (item.add_type === 'once' ? '1l' : 'n');
        var addColor = item.add_type === 'once' ? '#059669' : '#f59e0b';
        var lastUp = '—'; try { if (item.updated_at) { var _d = new Date(item.updated_at); lastUp = String(_d.getDate()).padStart(2,'0')+'/'+String(_d.getMonth()+1).padStart(2,'0')+'/'+_d.getFullYear()+' '+String(_d.getHours()).padStart(2,'0')+':'+String(_d.getMinutes()).padStart(2,'0'); } } catch(e) {}
        var creator = item.created_by_name ? '<br><span style="color:#2563eb;font-size:10px">' + item.created_by_name + '</span>' : '';
        h += '<tr style="border-bottom:1px solid #f1f5f9;cursor:pointer" onmouseover="this.style.background=\'#eff6ff\'" onmouseout="this.style.background=\'\'">'
            + '<td style="padding:8px;font-weight:700;color:#1e40af;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + displayName + '</td>'
            + '<td style="padding:8px;text-align:center;color:#94a3b8">' + item.id + '</td>'
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
