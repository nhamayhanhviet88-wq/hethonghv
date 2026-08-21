// ========== CHÍNH SÁCH KHÁCH HÀNG — ĐỒNG PHỤC HV ==========
(function() {
'use strict';

var _csp = {
    policies: [],
    fields: [],
    filter: { status: 'active', type: 'all', field: 'all', year: 'all', period: 'all', search: '' },
    editingId: null,
    container: null
};

function _cspIsTrinh(u) {
    if (!u) return false;
    var uname = String(u.username || '').toLowerCase().trim();
    var name = String(u.full_name || '').toLowerCase().trim();
    return uname === 'trinh' || uname === 'leviettrinh' || uname === 'trinh.lvt' || name.indexOf('lê việt trinh') !== -1 || name.indexOf('le viet trinh') !== -1;
}

function _cspCanEdit() {
    var u = window.currentUser || window._currentUser;
    if (!u) return false;
    if (['giam_doc','admin'].includes(u.role)) return true;
    if (u.role === 'quan_ly_cap_cao' && _cspIsTrinh(u)) return true;
    return false;
}

function _cspIsDirector() {
    return _cspCanEdit();
}

function _cspGetVnToday() {
    try {
        return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
    } catch (e) {
        var d = new Date();
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, '0');
        var date = String(d.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + date;
    }
}

function _cspSortFields(fieldsList) {
    if (!Array.isArray(fieldsList)) return [];
    var priorityMap = {
        'công ty': 1,
        'đồng phục': 1,
        'áo lớp': 2,
        'mầm non': 3,
        'tem / pet': 4,
        'tem/pet': 4,
        'tem pet': 4
    };

    return fieldsList.slice().sort(function(a, b) {
        var nameA = String(a.name || a || '').trim().toLowerCase();
        var nameB = String(b.name || b || '').trim().toLowerCase();

        var pA = priorityMap[nameA] || 99;
        var pB = priorityMap[nameB] || 99;

        if (pA !== pB) return pA - pB;
        return nameA.localeCompare(nameB, 'vi');
    });
}

function _cspGetFieldBadgeStyle(fieldName) {
    if (!fieldName) return 'background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;font-weight:800';
    var norm = String(fieldName).trim().toLowerCase();

    if (norm.indexOf('đồng phục') !== -1 || norm.indexOf('dong phuc') !== -1) {
        return 'background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;font-weight:800';
    }
    if (norm.indexOf('tem') !== -1 || norm.indexOf('pet') !== -1) {
        return 'background:#fef3c7;color:#b45309;border:1px solid #fde68a;font-weight:800';
    }
    if (norm.indexOf('mẫu') !== -1 || norm.indexOf('mau') !== -1) {
        return 'background:#d1fae5;color:#047857;border:1px solid #a7f3d0;font-weight:800';
    }
    if (norm.indexOf('phụ kiện') !== -1 || norm.indexOf('phu kien') !== -1) {
        return 'background:#f3e8ff;color:#6b21a8;border:1px solid #e9d5ff;font-weight:800';
    }

    var hash = 0;
    for (var i = 0; i < fieldName.length; i++) {
        hash = fieldName.charCodeAt(i) + ((hash << 5) - hash);
    }
    var palettes = [
        { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
        { bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
        { bg: '#d1fae5', color: '#047857', border: '#a7f3d0' },
        { bg: '#f3e8ff', color: '#6b21a8', border: '#e9d5ff' },
        { bg: '#ffe4e6', color: '#be123c', border: '#fecdd3' },
        { bg: '#fae8ff', color: '#86198f', border: '#f5d0fe' }
    ];
    var p = palettes[Math.abs(hash) % palettes.length];
    return 'background:' + p.bg + ';color:' + p.color + ';border:1px solid ' + p.border + ';font-weight:800';
}

function _cspEsc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function _cspStripTags(htmlStr) {
    if (!htmlStr) return '';
    var tmp = String(htmlStr)
        .replace(/&nbsp;/g, ' ')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/div>/gi, ' ')
        .replace(/<\/p>/gi, ' ')
        .replace(/<[^>]+>/g, '');
    return tmp.replace(/\s+/g, ' ').trim();
}

function _cspFmtDate(d) {
    if (!d) return '';
    var p = String(d).split('T')[0].split('-');
    return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : d;
}

function _cspGetFieldBadgeStyle(fieldName) {
    if (!fieldName) return 'background:#f1f5f9;color:#475569;border:1.5px solid #cbd5e1';

    // Curated high-contrast pastel background + bold text colors
    var colors = [
        { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' }, // Blue
        { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' }, // Green
        { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' }, // Purple
        { bg: '#fff7ed', color: '#c2410c', border: '#ffedd5' }, // Orange
        { bg: '#fdf2f8', color: '#be185d', border: '#fbcfe8' }, // Pink
        { bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4' }, // Teal
        { bg: '#fefce8', color: '#a16207', border: '#fef08a' }, // Gold
        { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' }, // Violet
        { bg: '#fff1f2', color: '#be123c', border: '#fecdd3' }, // Crimson
        { bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc' }  // Cyan
    ];

    var hash = 0;
    var str = String(fieldName).toLowerCase().trim();
    for (var i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    var idx = Math.abs(hash) % colors.length;
    var c = colors[idx];

    return 'background:' + c.bg + ';color:' + c.color + ';border:1.5px solid ' + c.border + ';font-weight:800;font-size:12px;padding:3px 12px;border-radius:8px;display:inline-block;letter-spacing:0.3px;box-shadow:0 1px 3px rgba(0,0,0,0.05)';
}

function _cspToken() {
    return localStorage.getItem('token') || '';
}

function _cspHeaders() {
    var h = { 'Content-Type': 'application/json' };
    var t = _cspToken();
    if (t && t.length > 20) h['Authorization'] = 'Bearer ' + t;
    return h;
}

// ========== MAIN RENDER ==========
window.renderChinhsachkhhvPage = function(container) {
    _csp.container = container;
    _cspLoadData();
};

function _cspLoadData() {
    var params = '?';
    if (_csp.filter.type !== 'all') params += 'type=' + _csp.filter.type + '&';
    if (_csp.filter.field !== 'all') params += 'field=' + encodeURIComponent(_csp.filter.field) + '&';
    if (_csp.filter.search) params += 'search=' + encodeURIComponent(_csp.filter.search) + '&';

    Promise.all([
        fetch('/api/customer-policies' + params, { credentials: 'include', headers: _cspHeaders() }).then(function(r) { return r.json(); }),
        fetch('/api/customer-policies/fields', { credentials: 'include', headers: _cspHeaders() }).then(function(r) { return r.json(); })
    ]).then(function(results) {
        _csp.policies = results[0].policies || [];
        _csp.fields = _cspSortFields(results[1].fields || []);
        _cspRender();
    }).catch(function(e) {
        console.error('Load error:', e);
        _csp.policies = [];
        _cspRender();
    });
}

function _cspRender() {
    var c = _csp.container;
    if (!c) return;
    var html = '';

    // Inject styles — Navy #192951 + Golden #FAD14C (Google Sans font styling)
    html += '<style id="csp-styles">';
    html += '@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&display=swap");';
    html += '@font-face { font-family: "Google Sans"; src: local("Google Sans"), local("GoogleSans-Regular"); }';
    html += '.csp-page, .csp-page *, .csp-modal, .csp-modal * { font-family: "Google Sans", "Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; }';
    html += '.csp-page{padding:24px;background:#f8fafc;min-height:100vh}';
    html += '.csp-banner{background:linear-gradient(135deg,#0d1b3e 0%,#192951 50%,#1e3a6e 100%);color:#fff;padding:26px 32px;border-radius:18px;margin-bottom:24px;box-shadow:0 12px 28px -5px rgba(25,41,81,0.45);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;position:relative;overflow:hidden}';
    html += '.csp-banner::before{content:"";position:absolute;top:-50%;right:-20%;width:400px;height:400px;background:radial-gradient(circle,rgba(250,209,76,0.08) 0%,transparent 70%);border-radius:50%;pointer-events:none}';
    html += '.csp-banner h1{font-size:24px;font-weight:900;margin:0 0 6px;display:flex;align-items:center;gap:10px;letter-spacing:-0.3px;color:#FAD14C}';
    html += '.csp-banner p{font-size:13.5px;color:#cbd5e1;margin:0;opacity:0.95;font-weight:500;letter-spacing:0.2px}';
    html += '.csp-add-btn{background:linear-gradient(135deg,#FAD14C,#f5c030);color:#192951;border:none;padding:12px 22px;border-radius:10px;font-weight:800;font-size:13.5px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(250,209,76,0.35);transition:all 0.2s;z-index:1;letter-spacing:0.2px}';
    html += '.csp-add-btn:hover{background:linear-gradient(135deg,#f5c030,#e5b020);transform:translateY(-2px)}';
    html += '.csp-filter{background:#fff;border-radius:16px;padding:16px 20px;border:1.5px solid #e2e8f0;margin-bottom:24px;box-shadow:0 6px 16px rgba(15,23,42,0.06);display:flex;flex-direction:column;gap:12px}';
    html += '.csp-pill{background:#f1f5f9;color:#475569;border:none;padding:8px 15px;border-radius:9px;font-size:12.5px;font-weight:700;cursor:pointer;transition:all 0.2s;white-space:nowrap;letter-spacing:0.1px}';
    html += '.csp-pill.active{background:#192951;color:#FAD14C;box-shadow:0 3px 8px rgba(25,41,81,0.3)}';
    html += '.csp-search{width:100%;box-sizing:border-box;padding:10px 16px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:13.5px;outline:none;transition:border-color 0.2s;background:#fff}';
    html += '.csp-search:focus{border-color:#192951;box-shadow:0 0 0 3px rgba(25,41,81,0.1)}';
    html += '.csp-select{padding:8px 14px;border:1.5px solid #cbd5e1;border-radius:9px;font-size:12.5px;font-weight:700;color:#334155;outline:none;background:#fff;cursor:pointer;white-space:nowrap}';
    html += '.csp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:24px}';
    html += '.csp-card{background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 6px 16px -4px rgba(15,23,42,0.08);display:flex;flex-direction:column;transition:transform 0.25s,box-shadow 0.25s}';
    html += '.csp-card:hover{transform:translateY(-4px);box-shadow:0 20px 30px -6px rgba(25,41,81,0.18)}';
    html += '.csp-card-head{padding:16px 20px;border-bottom:1.5px solid #e2e8f0;background:#f8fafc;display:flex;align-items:flex-start;justify-content:space-between;gap:10px}';
    html += '.csp-card-body{padding:16px 20px;flex:1;display:flex;flex-direction:column;gap:10px}';
    html += '.csp-card-foot{padding:12px 20px;border-top:1.5px solid #e2e8f0;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:flex-end}';
    html += '.csp-badge{display:inline-block;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:800;letter-spacing:0.3px}';
    html += '.csp-badge-kh{background:linear-gradient(135deg,#192951,#1e3a6e);color:#FAD14C}';
    html += '.csp-badge-ctv{background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff}';
    html += '.csp-badge-aff{background:linear-gradient(135deg,#059669,#10b981);color:#fff}';
    html += '.csp-badge-field{background:#f1f5f9;color:#475569;border:1px solid #cbd5e1}';
    html += '.csp-badge-active{background:#dcfce7;color:#166534;border:1px solid #86efac}';
    html += '.csp-badge-expired{background:#fef2f2;color:#991b1b;border:1px solid #fca5a5}';
    html += '.csp-btn{padding:7px 14px;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.2s;display:inline-flex;align-items:center;gap:5px}';
    html += '.csp-btn-view{background:#e8edf5;color:#192951;border:1px solid #c5cfe0}.csp-btn-view:hover{background:#d5ddef}';
    html += '.csp-btn-edit{background:#fef3c7;color:#92400e;border:1px solid #fde68a}.csp-btn-edit:hover{background:#fde68a}';
    html += '.csp-btn-pdf{background:#f0fdf4;color:#166534;border:1px solid #86efac}.csp-btn-pdf:hover{background:#dcfce7}';
    html += '.csp-btn-img{background:#fdf4ff;color:#86198f;border:1px solid #e879f9}.csp-btn-img:hover{background:#fae8ff}';
    html += '.csp-btn-del{background:#fef2f2;color:#991b1b;border:1px solid #fca5a5}.csp-btn-del:hover{background:#fee2e2}';
    html += '.csp-modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9998;display:flex;align-items:center;justify-content:center}';
    html += '.csp-modal{background:#fff;border-radius:20px;width:95%;max-width:720px;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3);z-index:9999}';
    html += '.csp-modal-head{padding:20px 24px;border-bottom:1.5px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,#0d1b3e,#192951);color:#fff;border-radius:20px 20px 0 0}';
    html += '.csp-modal-body{padding:24px}';
    html += '.csp-form-group{margin-bottom:18px}';
    html += '.csp-form-label{display:block;font-size:13px;font-weight:800;color:#192951;margin-bottom:6px}';
    html += '.csp-form-input{width:100%;padding:10px 14px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:14px;outline:none;transition:border-color 0.2s;box-sizing:border-box}';
    html += '.csp-form-input:focus{border-color:#192951;box-shadow:0 0 0 3px rgba(25,41,81,0.1)}';
    html += '.csp-form-textarea{resize:vertical;min-height:220px}';
    html += '.csp-rte-btn{background:#fff;color:#334155;border:1.5px solid #cbd5e1;border-radius:8px;padding:5px 12px;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.15s;display:inline-flex;align-items:center;justify-content:center}';
    html += '.csp-rte-btn:hover{background:#e2e8f0;color:#0f172a;border-color:#192951}';
    html += '.csp-tier-card{background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:12px;position:relative}';
    html += '.csp-tier-remove{position:absolute;top:8px;right:8px;background:#fee2e2;color:#991b1b;border:none;width:28px;height:28px;border-radius:50%;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center}';
    html += '.csp-tier-row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px}';
    html += '.csp-tier-row > *{flex:1;min-width:120px}';
    html += '.csp-empty{text-align:center;padding:60px 20px}';
    html += '.csp-empty-icon{font-size:48px;margin-bottom:16px}';
    html += '.csp-empty h3{font-size:18px;font-weight:800;color:#192951;margin:0 0 8px}';
    html += '.csp-empty p{font-size:14px;color:#64748b;margin:0}';
    html += '@media(max-width:600px){.csp-grid{grid-template-columns:1fr}.csp-tier-row{flex-direction:column}}';
    html += '</style>';

    // Banner
    html += '<div class="csp-page">';
    html += '<div class="csp-banner">';
    html += '<div>';
    html += '<h1>📋 Chính Sách Khách Hàng</h1>';
    html += '<p>Quản lý tất cả chính sách dành cho Khách Hàng, CTV và Affiliate — Đồng Phục HV</p>';
    html += '</div>';
    html += '<div style="display:flex;gap:10px;align-items:center;z-index:1">';
    if (_cspCanEdit()) {
        html += '<button onclick="window._cspManageFields()" style="background:rgba(255,255,255,0.15);border:1.5px solid rgba(255,255,255,0.4);color:#fff;padding:10px 18px;border-radius:10px;font-weight:800;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:all 0.2s">🏷️ Quản Lý Lĩnh Vực</button>';
        html += '<button class="csp-add-btn" onclick="window._cspOpenCreate()">➕ Tạo Chính Sách Mới</button>';
    }
    html += '</div>';
    html += '</div>';

    // Dynamic Years list for filter (Tự động sinh năm quá khứ + hiện tại + tương lai + các năm từ dữ liệu)
    var currentYear = new Date().getFullYear();
    var yearSet = {};
    for (var i = currentYear - 3; i <= currentYear + 2; i++) {
        yearSet[i] = true;
    }
    (_csp.policies || []).forEach(function(p) {
        if (p.valid_from) {
            var dt = new Date(p.valid_from);
            if (!isNaN(dt.getTime())) yearSet[dt.getFullYear()] = true;
        }
        if (p.valid_to) {
            var dtTo = new Date(p.valid_to);
            if (!isNaN(dtTo.getTime())) yearSet[dtTo.getFullYear()] = true;
        }
    });
    var yearsList = Object.keys(yearSet).map(Number).sort(function(a, b) { return b - a; });

    // Periods list (Tháng & Quý)
    var periodsList = [
        { key: 'all', label: '🗓️ Tất Cả Thời Gian (Tháng / Quý)' },
        { key: 'q1', label: '📊 Quý 1 (Tháng 1 - 3)' },
        { key: 'q2', label: '📊 Quý 2 (Tháng 4 - 6)' },
        { key: 'q3', label: '📊 Quý 3 (Tháng 7 - 9)' },
        { key: 'q4', label: '📊 Quý 4 (Tháng 10 - 12)' },
        { key: 'm1', label: '📅 Tháng 1' },
        { key: 'm2', label: '📅 Tháng 2' },
        { key: 'm3', label: '📅 Tháng 3' },
        { key: 'm4', label: '📅 Tháng 4' },
        { key: 'm5', label: '📅 Tháng 5' },
        { key: 'm6', label: '📅 Tháng 6' },
        { key: 'm7', label: '📅 Tháng 7' },
        { key: 'm8', label: '📅 Tháng 8' },
        { key: 'm9', label: '📅 Tháng 9' },
        { key: 'm10', label: '📅 Tháng 10' },
        { key: 'm11', label: '📅 Tháng 11' },
        { key: 'm12', label: '📅 Tháng 12' }
    ];

    // Filter bar — Hàng 1: Bộ Lọc Phân Loại; Hàng 2: Bộ Lọc Thời Gian (Năm, Tháng/Quý) & Ô Tìm Kiếm
    html += '<div class="csp-filter">';
    
    // Hàng 1: Bộ Lọc (Trạng thái Select, Lĩnh vực Pills, Loại Pills)
    html += '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">';
    
    // 1. Trạng Thái Chính Sách (Ảnh 3 — Thẻ Select Dropdown gọn gàng — Mặc định: ✅ Đang áp dụng)
    html += '<select class="csp-select" onchange="window._cspSetFilter(\'status\',this.value)" style="font-weight:800;color:#192951;border-color:#192951">';
    html += '<option value="active"' + ((_csp.filter.status || 'active') === 'active' ? ' selected' : '') + '>✅ Đang Áp Dụng</option>';
    html += '<option value="paused"' + (_csp.filter.status === 'paused' ? ' selected' : '') + '>⏸️ Dừng Áp Dụng</option>';
    html += '<option value="expired"' + (_csp.filter.status === 'expired' ? ' selected' : '') + '>❌ Hết Hạn</option>';
    html += '<option value="all"' + (_csp.filter.status === 'all' ? ' selected' : '') + '>📋 Tất Cả Trạng Thái</option>';
    html += '</select>';

    html += '<div style="width:1px;height:24px;background:#cbd5e1;margin:0 2px"></div>';

    // 2. Lĩnh Vực (Ảnh 2 — Dạng Nút Pill trực quan)
    html += '<button class="csp-pill' + (_csp.filter.field === 'all' ? ' active' : '') + '" onclick="window._cspSetFilter(\'field\',\'all\')">🏷️ Tất Cả Lĩnh Vực</button>';
    _cspSortFields(_csp.fields).forEach(function(f) {
        var fn = f.name || f;
        var isActive = _csp.filter.field === fn;
        html += '<button class="csp-pill' + (isActive ? ' active' : '') + '" onclick="window._cspSetFilter(\'field\',\'' + _cspEsc(fn) + '\')">🏷️ ' + _cspEsc(fn) + '</button>';
    });

    html += '<div style="width:1px;height:24px;background:#cbd5e1;margin:0 2px"></div>';

    // 3. Loại Chính Sách (Nút Pill)
    var types = [
        { key: 'all', label: '📋 Tất Cả' },
        { key: 'khach_hang', label: '👤 Khách Hàng' },
        { key: 'ctv', label: '🤝 CTV' },
        { key: 'affiliate', label: '🔗 Affiliate' }
    ];
    types.forEach(function(t) {
        html += '<button class="csp-pill' + (_csp.filter.type === t.key ? ' active' : '') + '" onclick="window._cspSetFilter(\'type\',\'' + t.key + '\')">' + t.label + '</button>';
    });

    html += '</div>'; // End Hàng 1

    // Hàng 2: Bộ Lọc Thời Gian (📅 Áp Dụng Từ: Năm, Tháng/Quý) & Ô Tìm kiếm
    html += '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">';
    
    // Lọc Năm Áp Dụng
    html += '<select class="csp-select" onchange="window._cspSetFilter(\'year\',this.value)" style="min-width:130px;font-weight:700">';
    html += '<option value="all"' + (_csp.filter.year === 'all' ? ' selected' : '') + '>📅 Tất Cả Năm</option>';
    yearsList.forEach(function(y) {
        html += '<option value="' + y + '"' + (String(_csp.filter.year) === String(y) ? ' selected' : '') + '>📅 Năm ' + y + '</option>';
    });
    html += '</select>';

    // Lọc Tháng / Quý Áp Dụng
    html += '<select class="csp-select" onchange="window._cspSetFilter(\'period\',this.value)" style="min-width:210px;font-weight:700">';
    periodsList.forEach(function(pr) {
        html += '<option value="' + pr.key + '"' + (_csp.filter.period === pr.key ? ' selected' : '') + '>' + pr.label + '</option>';
    });
    html += '</select>';

    // Ô Tìm kiếm chính sách
    html += '<input class="csp-search" type="text" placeholder="🔍 Tìm kiếm chính sách..." value="' + _cspEsc(_csp.filter.search) + '" onkeyup="window._cspSearchDebounce(this.value)" style="flex:1;min-width:200px" />';
    
    html += '</div>'; // End Hàng 2

    html += '</div>'; // End csp-filter

    // Grid — Lọc danh sách theo Trạng Thái & Thời Gian (Áp Dụng Từ)
    var now = _cspGetVnToday();
    var filteredPolicies = (_csp.policies || []).filter(function(p) {
        var isNotStarted = p.valid_from && p.valid_from.split('T')[0] > now;
        var isExpired = p.valid_to && p.valid_to.split('T')[0] < now;
        var isActive = p.is_active && !isExpired && !isNotStarted;

        var st = _csp.filter.status || 'active';
        if (st === 'active' && !isActive) return false;
        if (st === 'paused' && (p.is_active || isExpired)) return false;
        if (st === 'expired' && !isExpired) return false;

        // Date filter check for valid_from (Tháng, Quý, Năm)
        var filterYear = _csp.filter.year || 'all';
        var filterPeriod = _csp.filter.period || 'all';

        if (filterYear !== 'all' || filterPeriod !== 'all') {
            if (!p.valid_from) return false;
            var dt = new Date(p.valid_from);
            if (isNaN(dt.getTime())) return false;
            var pYear = String(dt.getFullYear());
            var pMonth = dt.getMonth() + 1; // 1 to 12

            if (filterYear !== 'all' && pYear !== String(filterYear)) return false;

            if (filterPeriod !== 'all') {
                if (filterPeriod.indexOf('m') === 0) {
                    var mNum = parseInt(filterPeriod.replace('m', ''), 10);
                    if (pMonth !== mNum) return false;
                } else if (filterPeriod.indexOf('q') === 0) {
                    var qNum = parseInt(filterPeriod.replace('q', ''), 10);
                    var pQ = Math.ceil(pMonth / 3);
                    if (pQ !== qNum) return false;
                }
            }
        }

        return true;
    });

    if (filteredPolicies.length === 0) {
        html += '<div class="csp-empty">';
        html += '<div class="csp-empty-icon">📭</div>';
        html += '<h3>Không tìm thấy chính sách nào</h3>';
        html += '<p>Không có chính sách nào phù hợp với bộ lọc được chọn</p>';
        html += '</div>';
    } else {
        html += '<div class="csp-grid">';
        filteredPolicies.forEach(function(p) {
            html += _cspRenderCard(p);
        });
        html += '</div>';
    }
    html += '</div>';

    c.innerHTML = html;
}

function _cspRenderCard(p) {
    var typeLabel = p.policy_type === 'ctv' ? 'CTV' : (p.policy_type === 'affiliate' ? 'Affiliate' : 'Khách Hàng');
    var typeBadgeClass = p.policy_type === 'ctv' ? 'csp-badge-ctv' : (p.policy_type === 'affiliate' ? 'csp-badge-aff' : 'csp-badge-kh');

    var now = _cspGetVnToday();
    var isNotStarted = p.valid_from && p.valid_from.split('T')[0] > now;
    var isExpired = p.valid_to && p.valid_to.split('T')[0] < now;
    var isActive = p.is_active && !isExpired && !isNotStarted;

    var statusBadge = '';
    if (isNotStarted) {
        statusBadge = '<span class="csp-badge" style="background:#fff7ed;color:#c2410c;border:1px solid #ffedd5">⏳ Chưa đến ngày</span>';
    } else if (isExpired) {
        statusBadge = '<span class="csp-badge" style="background:#fef2f2;color:#b91c1c;border:1px solid #fecaca">❌ Hết hạn</span>';
    } else if (!p.is_active) {
        statusBadge = '<span class="csp-badge" style="background:#f1f5f9;color:#64748b;border:1px solid #cbd5e1">⏸️ Dừng áp dụng</span>';
    } else {
        statusBadge = '<span class="csp-badge csp-badge-active">✅ Đang áp dụng</span>';
    }

    var html = '<div class="csp-card" onclick="window._cspViewPolicy(' + p.id + ')" style="cursor:pointer;border-left:4px solid ' + (p.policy_type === 'ctv' ? '#d97706' : (p.policy_type === 'affiliate' ? '#059669' : '#192951')) + '">';

    // Header
    html += '<div class="csp-card-head">';
    html += '<div style="flex:1">';
    html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">';
    html += '<span class="csp-badge ' + typeBadgeClass + '">' + typeLabel + '</span>';
    if (p.field_name) html += '<span class="csp-badge" style="' + _cspGetFieldBadgeStyle(p.field_name) + '">🏷️ ' + _cspEsc(p.field_name) + '</span>';
    html += statusBadge;
    html += '</div>';
    html += '<div style="font-size:16px;font-weight:800;color:#0f172a;line-height:1.4">' + _cspEsc(p.title) + '</div>';
    html += '</div>';
    if (p.tier_count > 0) {
        html += '<div style="background:#e8edf5;color:#192951;font-size:11px;font-weight:800;padding:4px 10px;border-radius:8px;white-space:nowrap">' + p.tier_count + ' mức</div>';
    }
    html += '</div>';

    // Body
    html += '<div class="csp-card-body">';
    // Time
    html += '<div style="font-size:12.5px;color:#64748b;font-weight:600;display:flex;align-items:center;gap:6px">';
    html += '📅 ';
    if (p.valid_from) {
        html += _cspFmtDate(p.valid_from);
        html += p.valid_to ? (' → ' + _cspFmtDate(p.valid_to)) : ' → Mãi mãi';
    } else {
        html += 'Không giới hạn thời gian';
    }
    html += '</div>';

    // Content preview (Clean plain text without raw HTML tags like <div>, <br>, &nbsp;)
    if (p.content) {
        var cleanText = _cspStripTags(p.content);
        var preview = cleanText.substring(0, 120);
        if (cleanText.length > 120) preview += '...';
        html += '<div style="font-size:13px;color:#475569;line-height:1.5;margin-top:4px">' + _cspEsc(preview) + '</div>';
    }

    // Policy Image Thumbnail
    if (p.image_url) {
        html += '<div style="margin-top:8px;text-align:center"><img src="' + _cspEsc(p.image_url) + '" style="max-height:130px;max-width:100%;border-radius:10px;object-fit:cover;border:1px solid #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,0.06)" /></div>';
    }

    // Creator
    if (p.creator_name) {
        html += '<div style="font-size:11.5px;color:#94a3b8;font-weight:600;margin-top:auto;padding-top:6px">✍️ ' + _cspEsc(p.creator_name) + ' • ' + _cspFmtDate(p.created_at) + '</div>';
    }
    html += '</div>';

    // Footer
    var isBlocked = isExpired || isNotStarted || !p.is_active;
    html += '<div class="csp-card-foot" onclick="event.stopPropagation()">';
    if (isBlocked) {
        var reasonText = isExpired ? 'Chính sách này đã HẾT HẠN' : (!p.is_active ? 'Chính sách này đang TẠM DỪNG' : 'Chính sách này CHƯA ĐẾN NGÀY áp dụng');
        html += '<button class="csp-btn" style="opacity:0.4;cursor:not-allowed;background:#e2e8f0;color:#94a3b8;border:1px solid #cbd5e1" onclick="event.stopPropagation();alert(\'⚠️ ' + reasonText + ', không thể tải ảnh!\')" title="' + reasonText + '">🖼️ Ảnh</button>';
    } else {
        html += '<button class="csp-btn csp-btn-img" onclick="event.stopPropagation();window._cspExportImage(' + p.id + ')">🖼️ Ảnh</button>';
    }

    if (_cspCanEdit()) {
        if (p.is_active) {
            html += '<button class="csp-btn" style="background:#fff7ed;color:#c2410c;border:1.5px solid #fed7aa;font-weight:700" onclick="event.stopPropagation();window._cspToggleActivePolicy(' + p.id + ')" title="Bấm để Tạm Dừng chính sách này">⏸️ Dừng</button>';
        } else {
            html += '<button class="csp-btn" style="background:#f0fdf4;color:#15803d;border:1.5px solid #bbf7d0;font-weight:700" onclick="event.stopPropagation();window._cspToggleActivePolicy(' + p.id + ')" title="Bấm để Kích Hoạt chạy tiếp chính sách này">▶️ Tiếp tục</button>';
        }
        html += '<button class="csp-btn csp-btn-edit" onclick="event.stopPropagation();window._cspEditPolicy(' + p.id + ')">✏️ Sửa</button>';
        html += '<button class="csp-btn csp-btn-del" onclick="event.stopPropagation();window._cspDeletePolicy(' + p.id + ')">🗑</button>';
    }
    html += '</div>';

    html += '</div>';
    return html;
}

// ========== FILTER ==========
var _cspSearchTimer = null;
window._cspSearchDebounce = function(val) {
    clearTimeout(_cspSearchTimer);
    _cspSearchTimer = setTimeout(function() {
        _csp.filter.search = val;
        _cspLoadData();
    }, 400);
};

window._cspSetFilter = function(key, val) {
    _csp.filter[key] = val;
    _cspLoadData();
};

// ========== CREATE / EDIT MODAL ==========
window._cspOpenCreate = function() {
    _csp.editingId = null;
    _cspShowFormModal({
        title: '', policy_type: 'khach_hang', field_name: '', content: '',
        valid_from: _cspGetVnToday(), valid_to: '', is_active: true, tiers: []
    });
};

function _cspCleanOrphanNumberLines(htmlStr) {
    if (!htmlStr) return '';
    // 1) Remove orphan empty number lines e.g. <div>2.</div> or <div>2.&nbsp;</div>
    var str = String(htmlStr)
        .replace(/(?:<div>|<p>|<br\s*\/?>|\n)\s*\d+\.\s*(?:&nbsp;|\s)*(?:<\/div>|<\/p>|<br\s*\/?>|\n|$)/gi, '');

    // 2) Re-sequence leading line numbers (1. , 3. -> 1. , 2.)
    var seq = 1;
    str = str.replace(/(^|>|\n)\s*(\d+)\.\s*/g, function(match, p1) {
        return p1 + (seq++) + '. ';
    });

    return str;
}

window._cspEditPolicy = function(id) {
    fetch('/api/customer-policies/' + id, { credentials: 'include', headers: _cspHeaders() })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (!d.policy) return alert('Không tìm thấy chính sách');
            _csp.editingId = id;
            var p = d.policy;
            p.valid_from = p.valid_from ? p.valid_from.split('T')[0] : '';
            p.valid_to = p.valid_to ? p.valid_to.split('T')[0] : '';
            p.content = _cspCleanOrphanNumberLines(p.content || '');
            _cspShowFormModal(p);
        });
};

function _cspShowFormModal(data) {
    var isEdit = !!_csp.editingId;
    var ov = document.createElement('div');
    ov.className = 'csp-modal-overlay';
    ov.id = 'csp-modal-overlay';
    // Do NOT close on clicking outside backdrop — user must click Hủy, X, or Save

    var html = '<div class="csp-modal">';
    html += '<div class="csp-modal-head">';
    html += '<span style="font-size:18px;font-weight:900">' + (isEdit ? '✏️ Sửa Chính Sách' : '➕ Tạo Chính Sách Mới') + '</span>';
    html += '<button onclick="document.getElementById(\'csp-modal-overlay\').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer">✕</button>';
    html += '</div>';
    html += '<div class="csp-modal-body">';

    // Type
    html += '<div class="csp-form-group">';
    html += '<label class="csp-form-label">📌 Loại Chính Sách *</label>';
    html += '<select id="csp-f-type" class="csp-form-input">';
    html += '<option value="khach_hang"' + (data.policy_type === 'khach_hang' ? ' selected' : '') + '>👤 Khách Hàng</option>';
    html += '<option value="ctv"' + (data.policy_type === 'ctv' ? ' selected' : '') + '>🤝 CTV</option>';
    html += '<option value="affiliate"' + (data.policy_type === 'affiliate' ? ' selected' : '') + '>🔗 Affiliate</option>';
    html += '</select>';
    html += '</div>';

    // Field — select only, không cho gõ tay (Bắt buộc)
    html += '<div class="csp-form-group">';
    html += '<label class="csp-form-label">🏷️ Lĩnh Vực *</label>';
    html += '<select id="csp-f-field" class="csp-form-input">';
    html += '<option value="">-- Chọn lĩnh vực --</option>';
    _cspSortFields(_csp.fields).forEach(function(f) {
        var fn = f.name || f;
        html += '<option value="' + _cspEsc(fn) + '"' + (data.field_name === fn ? ' selected' : '') + '>' + _cspEsc(fn) + '</option>';
    });
    html += '</select>';
    if (_csp.fields.length === 0) {
        html += '<div style="font-size:11px;color:#f59e0b;margin-top:4px;font-weight:600">⚠️ Chưa có lĩnh vực nào. Giám Đốc cần tạo lĩnh vực trước.</div>';
    }
    html += '</div>';

    // Title
    html += '<div class="csp-form-group">';
    html += '<label class="csp-form-label">📝 Tên Chính Sách *</label>';
    html += '<input id="csp-f-title" class="csp-form-input" placeholder="VD: Chi Phí Vận Chuyển Ra Nhà Xe - Máy Bay" value="' + _cspEsc(data.title) + '" />';
    html += '</div>';

    // Dates
    html += '<div style="display:flex;gap:12px;flex-wrap:wrap">';
    html += '<div class="csp-form-group" style="flex:1;min-width:200px">';
    html += '<label class="csp-form-label">📅 Áp Dụng Từ</label>';
    html += '<input id="csp-f-from" type="date" class="csp-form-input" value="' + (data.valid_from || '') + '" onchange="window._cspSyncDateMin()" />';
    html += '</div>';
    html += '<div class="csp-form-group" style="flex:1;min-width:200px">';
    html += '<label class="csp-form-label">📅 Đến Ngày <span style="font-size:11px;color:#94a3b8">(bỏ trống = mãi mãi)</span></label>';
    html += '<input id="csp-f-to" type="date" class="csp-form-input" value="' + (data.valid_to || '') + '" min="' + (data.valid_from || '') + '" onchange="window._cspSyncDateMin()" />';
    html += '</div>';
    html += '</div>';

    // Image Upload (Phần Ảnh Chính Sách nằm TRÊN Nội Dung Chính Sách)
    html += '<div class="csp-form-group">';
    html += '<label class="csp-form-label">🖼️ Ảnh Chính Sách <span style="font-size:11px;color:#94a3b8">(chọn ảnh từ máy tính - tự động tối ưu sắc nét)</span></label>';
    html += '<input type="hidden" id="csp-f-image-url" value="' + _cspEsc(data.image_url || '') + '" />';
    html += '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:6px">';
    html += '<label style="padding:9px 18px;background:#e8edf5;color:#192951;border:1.5px dashed #192951;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px">';
    html += '📁 Chọn ảnh từ máy tính';
    html += '<input type="file" id="csp-f-image-file" accept="image/*" style="display:none" onchange="window._cspHandleImageSelect(this)" />';
    html += '</label>';
    html += '<div id="csp-image-preview-container" style="' + (data.image_url ? 'display:inline-flex;' : 'display:none;') + 'align-items:center;gap:8px">';
    html += '<img id="csp-image-preview" src="' + _cspEsc(data.image_url || '') + '" style="height:48px;max-width:120px;border-radius:8px;object-fit:cover;border:1px solid #cbd5e1;box-shadow:0 2px 6px rgba(0,0,0,0.1)" />';
    html += '<button type="button" onclick="window._cspRemoveImage()" style="background:#fee2e2;color:#991b1b;border:none;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">✕ Xóa ảnh</button>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    // Content (Nhập nội dung trực tiếp)
    html += '<div class="csp-form-group">';
    html += '<label class="csp-form-label">📄 Nội Dung Chính Sách *</label>';
    html += '<div id="csp-f-content-editor" contenteditable="true" style="border:1.5px solid #cbd5e1;border-radius:12px;min-height:220px;max-height:400px;overflow-y:auto;padding:16px;outline:none;font-size:13px;line-height:1.6;color:#1e293b;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,0.03)" placeholder="Nhập nội dung chính sách, quy định, lưu ý...">' + (data.content || '') + '</div>';
    html += '</div>';



    // Submit
    html += '<div style="margin-top:20px;display:flex;gap:12px;justify-content:flex-end">';
    html += '<button onclick="document.getElementById(\'csp-modal-overlay\').remove()" style="padding:10px 22px;background:#f1f5f9;color:#475569;border:1.5px solid #cbd5e1;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">Hủy</button>';
    html += '<button onclick="window._cspSavePolicy()" style="padding:10px 22px;background:linear-gradient(135deg,#FAD14C,#f5c030);color:#192951;border:none;border-radius:10px;font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(250,209,76,0.35)">💾 ' + (isEdit ? 'Cập Nhật' : 'Tạo Mới') + '</button>';
    html += '</div>';

    html += '</div></div>';
    ov.innerHTML = html;
    document.body.appendChild(ov);

    // Chặn trình duyệt tự tạo <ol><li> khi gõ "1. " — convert về <div> thuần để user tự do sửa/xóa số
    var editorEl = document.getElementById('csp-f-content-editor');
    if (editorEl) {
        setTimeout(function() {
            window._cspSyncFontSizeFromContent();
        }, 50);

        editorEl.addEventListener('click', window._cspSyncFontSizeFromContent);
        editorEl.addEventListener('keyup', window._cspSyncFontSizeFromContent);

        var obs = new MutationObserver(function() {
            var lists = editorEl.querySelectorAll('ol, ul');
            if (lists.length === 0) return;
            obs.disconnect();
            lists.forEach(function(list) {
                var items = list.querySelectorAll('li');
                var frag = document.createDocumentFragment();
                items.forEach(function(li, i) {
                    var div = document.createElement('div');
                    if (list.tagName === 'OL') {
                        div.innerHTML = (i + 1) + '. ' + li.innerHTML;
                    } else {
                        div.innerHTML = '• ' + li.innerHTML;
                    }
                    frag.appendChild(div);
                });
                list.parentNode.replaceChild(frag, list);
            });
            obs.observe(editorEl, { childList: true, subtree: true });
        });
        obs.observe(editorEl, { childList: true, subtree: true });
    }
}

function _cspRenderTierForm(t, idx) {
    var html = '<div class="csp-tier-card" data-tier-idx="' + idx + '">';
    html += '<button class="csp-tier-remove" onclick="this.parentElement.remove()" title="Xóa mức">✕</button>';
    html += '<div style="font-size:13px;font-weight:800;color:#192951;margin-bottom:8px">Mức ' + (idx + 1) + '</div>';
    html += '<div class="csp-form-group" style="margin-bottom:8px">';
    html += '<input class="csp-form-input csp-tier-label" placeholder="VD: Từ 10 - 100 áo, Nếu chênh từ 1% đến 30%..." value="' + _cspEsc(t.condition_label || '') + '" />';
    html += '</div>';
    html += '<div class="csp-tier-row">';
    html += '<div><label style="font-size:11px;font-weight:700;color:#64748b">SL Tối Thiểu</label><input class="csp-form-input csp-tier-min-qty" type="number" placeholder="0" value="' + (t.min_quantity || '') + '" /></div>';
    html += '<div><label style="font-size:11px;font-weight:700;color:#64748b">SL Tối Đa</label><input class="csp-form-input csp-tier-max-qty" type="number" placeholder="∞" value="' + (t.max_quantity || '') + '" /></div>';
    html += '<div><label style="font-size:11px;font-weight:700;color:#64748b">Giá Trị Min</label><input class="csp-form-input csp-tier-min-val" type="number" placeholder="0" value="' + (t.min_value || '') + '" /></div>';
    html += '<div><label style="font-size:11px;font-weight:700;color:#64748b">Giá Trị Max</label><input class="csp-form-input csp-tier-max-val" type="number" placeholder="∞" value="' + (t.max_value || '') + '" /></div>';
    html += '</div>';
    html += '<div class="csp-form-group" style="margin-bottom:0">';
    html += '<textarea class="csp-form-input csp-tier-benefit" rows="2" placeholder="Nội dung quyền lợi / ưu đãi của mức này...">' + _cspEsc(t.benefit_text || '') + '</textarea>';
    html += '</div>';
    html += '</div>';
    return html;
}

window._cspAddTier = function() {
    var cont = document.getElementById('csp-tiers-container');
    if (!cont) return;
    var idx = cont.querySelectorAll('.csp-tier-card').length;
    var div = document.createElement('div');
    div.innerHTML = _cspRenderTierForm({}, idx);
    cont.appendChild(div.firstChild);
};

window._cspHandleImageSelect = function(input) {
    if (!input.files || !input.files[0]) return;
    var file = input.files[0];

    // High quality canvas compression (Max 1600px, 0.85 JPEG quality)
    var reader = new FileReader();
    reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
            var canvas = document.createElement('canvas');
            var maxDim = 1800;
            var width = img.width;
            var height = img.height;
            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }
            canvas.width = width;
            canvas.height = height;
            var ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            var compressedDataUrl = canvas.toDataURL('image/jpeg', 0.92);

            document.getElementById('csp-f-image-url').value = compressedDataUrl;
            var prevImg = document.getElementById('csp-image-preview');
            if (prevImg) prevImg.src = compressedDataUrl;
            var prevCont = document.getElementById('csp-image-preview-container');
            if (prevCont) prevCont.style.display = 'inline-flex';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

window._cspRemoveImage = function() {
    var urlEl = document.getElementById('csp-f-image-url');
    if (urlEl) urlEl.value = '';
    var prevCont = document.getElementById('csp-image-preview-container');
    if (prevCont) prevCont.style.display = 'none';
    var fileInput = document.getElementById('csp-f-image-file');
    if (fileInput) fileInput.value = '';
};

// Lưu vùng chọn khi editor mất focus (user bấm vào toolbar)
var _cspSavedRange = null;
window._cspSaveEditorSelection = function() {
    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
        _cspSavedRange = sel.getRangeAt(0).cloneRange();
    }
};
function _cspRestoreEditorSelection() {
    var editor = document.getElementById('csp-f-content-editor');
    if (!editor || !_cspSavedRange) return false;
    editor.focus();
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(_cspSavedRange);
    return !sel.isCollapsed;
}

window._cspRteExec = function(cmd, value) {
    var editor = document.getElementById('csp-f-content-editor');
    if (!editor) return;
    _cspRestoreEditorSelection();
    document.execCommand(cmd, false, value || null);
};

var _cspCurrentFontSize = 14;

window._cspRteSetFontSize = function(val) {
    var size = parseInt(val, 10);
    if (!size || isNaN(size)) return;
    size = Math.max(8, Math.min(72, size));
    _cspCurrentFontSize = size;
    var valEl = document.getElementById('csp-rte-font-size-val');
    if (valEl && parseInt(valEl.value, 10) !== size) valEl.value = size;

    var editor = document.getElementById('csp-f-content-editor');
    if (!editor) return;

    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        // Dùng execCommand fontSize 7 làm marker tạm, rồi thay bằng pixel size thực
        document.execCommand('fontSize', false, '7');
        var fontTags = editor.querySelectorAll('font[size="7"]');
        fontTags.forEach(function(el) {
            el.removeAttribute('size');
            el.style.fontSize = size + 'px';
        });
    } else {
        editor.style.fontSize = size + 'px';
    }
};

window._cspRteChangeFontSize = function(delta) {
    var inputEl = document.getElementById('csp-rte-font-size-val');
    var cur = inputEl ? (parseInt(inputEl.value, 10) || 14) : _cspCurrentFontSize;
    var newSize = Math.max(8, Math.min(72, cur + delta));
    if (inputEl) inputEl.value = newSize;
    window._cspRteSetFontSize(newSize);
};

// Tự động đồng bộ cỡ chữ hiển thị trên ô số khi xem/sửa chính sách cũ
window._cspSyncFontSizeFromContent = function() {
    var editorEl = document.getElementById('csp-f-content-editor');
    var valInput = document.getElementById('csp-rte-font-size-val');
    if (!editorEl || !valInput) return;

    // 1. Ưu tiên kiểm tra nút được trỏ chuột / bôi đen
    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
        var node = sel.anchorNode;
        if (node && node.nodeType === 3) node = node.parentElement;
        if (node && editorEl.contains(node) && node !== editorEl) {
            var comp = window.getComputedStyle(node);
            if (comp && comp.fontSize) {
                var px = Math.round(parseFloat(comp.fontSize));
                if (px >= 8 && px <= 72) {
                    valInput.value = px;
                    _cspCurrentFontSize = px;
                    return;
                }
            }
        }
    }

    // 2. Kiểm tra thẻ con đầu tiên trong editor có font-size
    var fontEl = editorEl.querySelector('[style*="font-size"]');
    if (fontEl) {
        var comp = window.getComputedStyle(fontEl);
        if (comp && comp.fontSize) {
            var px = Math.round(parseFloat(comp.fontSize));
            if (px >= 8 && px <= 72) {
                valInput.value = px;
                _cspCurrentFontSize = px;
                return;
            }
        }
    }

    // 3. Kiểm tra font-size của chính editor
    if (editorEl.style && editorEl.style.fontSize) {
        var px = Math.round(parseFloat(editorEl.style.fontSize));
        if (px >= 8 && px <= 72) {
            valInput.value = px;
            _cspCurrentFontSize = px;
            return;
        }
    }

    // 4. Tìm kiếm từ chuỗi HTML
    var m = editorEl.innerHTML.match(/font-size\s*:\s*(\d+(\.\d+)?)px/i);
    if (m) {
        var px = Math.round(parseFloat(m[1]));
        if (px >= 8 && px <= 72) {
            valInput.value = px;
            _cspCurrentFontSize = px;
            return;
        }
    }

    valInput.value = 14;
    _cspCurrentFontSize = 14;
};





// Dynamic re-numbering for numbered list items when user edits or deletes numbers/lines
window._cspRenumberNumberedLines = function(editor) {
    if (!editor) return;

    var lines = editor.querySelectorAll('div, p');
    if (!lines || lines.length === 0) {
        var html = editor.innerHTML;
        var parts = html.split(/<br\s*\/?>/i);
        var seq = 1;
        var changed = false;
        var newParts = parts.map(function(part) {
            var match = part.match(/^(\s*(?:<[^>]+>)*)(\d+)\.(\s+.*)$/i);
            if (match) {
                var currentNum = parseInt(match[2], 10);
                if (currentNum !== seq) {
                    changed = true;
                    return match[1] + seq + '.' + match[3];
                }
                seq++;
            }
            return part;
        });

        if (changed) {
            editor.innerHTML = newParts.join('<br>');
        }
        return;
    }

    var seq = 1;
    lines.forEach(function(line) {
        var text = line.innerText || line.textContent || '';
        var match = text.match(/^(\s*)(\d+)\.(\s+.*)$/);
        if (match) {
            var currentNum = parseInt(match[2], 10);
            if (currentNum !== seq) {
                line.innerHTML = line.innerHTML.replace(/^(\s*)(\d+)\./, '$1' + seq + '.');
            }
            seq++;
        }
    });
};

window._cspSyncDateMin = function() {
    var fromEl = document.getElementById('csp-f-from');
    var toEl = document.getElementById('csp-f-to');
    if (!fromEl || !toEl) return;
    if (fromEl.value) {
        toEl.min = fromEl.value;
        if (toEl.value && toEl.value < fromEl.value) {
            toEl.value = fromEl.value;
        }
    } else {
        toEl.removeAttribute('min');
    }
};

window._cspSavePolicy = function() {
    var field_name = (document.getElementById('csp-f-field') || {}).value || '';
    var title = (document.getElementById('csp-f-title') || {}).value || '';
    var policy_type = (document.getElementById('csp-f-type') || {}).value || 'khach_hang';
    var image_url = (document.getElementById('csp-f-image-url') || {}).value || '';
    var editor = document.getElementById('csp-f-content-editor');
    // Tự động đánh lại số thứ tự nối tiếp trước khi lưu
    if (editor) window._cspRenumberNumberedLines(editor);
    var content = editor ? editor.innerHTML.trim() : ((document.getElementById('csp-f-content') || {}).value || '');
    var valid_from = (document.getElementById('csp-f-from') || {}).value || null;
    var valid_to = (document.getElementById('csp-f-to') || {}).value || null;

    if (!field_name.trim()) return alert('⚠️ Vui lòng chọn Lĩnh Vực!');
    if (!title.trim()) return alert('⚠️ Vui lòng nhập Tên Chính Sách!');
    if (!content.trim() || content === '<br>') return alert('⚠️ Vui lòng nhập Nội Dung Chính Sách!');
    if (valid_from && valid_to && valid_to < valid_from) {
        return alert('⚠️ "📅 Đến Ngày" phải lớn hơn hoặc bằng ngày "📅 Áp Dụng Từ"!\nKhông thể lưu ngày kết thúc nhỏ hơn ngày bắt đầu.');
    }

    var body = { title: title.trim(), policy_type: policy_type, field_name: field_name.trim(), content: content.trim(), image_url: image_url, valid_from: valid_from, valid_to: valid_to, is_active: true, tiers: [] };

    var url = _csp.editingId ? ('/api/customer-policies/' + _csp.editingId) : '/api/customer-policies';
    var method = _csp.editingId ? 'PUT' : 'POST';

    fetch(url, {
        method: method,
        credentials: 'include',
        headers: _cspHeaders(),
        body: JSON.stringify(body)
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.error) return alert('❌ ' + d.error);
        var ov = document.getElementById('csp-modal-overlay');
        if (ov) ov.remove();
        _cspLoadData();
    })
    .catch(function(e) { alert('Lỗi: ' + e.message); });
};

// ========== DELETE ==========
window._cspDeletePolicy = function(id) {
    if (!confirm('⚠️ Bạn chắc chắn muốn xóa chính sách này?')) return;
    fetch('/api/customer-policies/' + id, {
        method: 'DELETE',
        credentials: 'include',
        headers: _cspHeaders()
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.error) return alert('❌ ' + d.error);
        _cspLoadData();
    });
};

// ========== TOGGLE ACTIVE / PAUSE STATUS ==========
window._cspToggleActivePolicy = function(id) {
    var p = (_csp.policies || []).find(function(item) { return item.id == id; });
    var actionText = (p && p.is_active) ? 'tạm dừng' : 'kích hoạt chạy tiếp';
    if (!confirm('⚠️ Bạn có chắc chắn muốn ' + actionText + ' chính sách này?')) return;

    fetch('/api/customer-policies/' + id + '/toggle-active', {
        method: 'PATCH',
        credentials: 'include',
        headers: _cspHeaders(),
        body: JSON.stringify({})
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.error) return alert('❌ ' + d.error);
        _cspLoadData();
    })
    .catch(function(err) {
        alert('❌ Có lỗi xảy ra: ' + err.message);
    });
};

// ========== VIEW DETAIL MODAL ==========
window._cspViewPolicy = function(id) {
    fetch('/api/customer-policies/' + id, { credentials: 'include', headers: _cspHeaders() })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (!d.policy) return alert('Không tìm thấy chính sách');
            var now = _cspGetVnToday();
            var isNotStarted = d.policy.valid_from && d.policy.valid_from.split('T')[0] > now;
            var isExpired = d.policy.valid_to && d.policy.valid_to.split('T')[0] < now;
            if (!d.policy.is_active || isExpired || isNotStarted) {
                var reason = isExpired ? 'đã hết hạn' : (!d.policy.is_active ? 'đang tạm dừng' : 'chưa đến ngày áp dụng');
                return alert('⚠️ Chính sách này ' + reason + ', không thể xem!');
            }
            _cspShowPreviewModal(d.policy);
        });
};

function _cspShowPreviewModal(p) {
    var ov = document.createElement('div');
    ov.className = 'csp-modal-overlay';
    ov.id = 'csp-preview-overlay';
    ov.onclick = function(e) { if (e.target === ov) ov.remove(); };

    var html = '<div class="csp-modal" style="max-width:650px">';
    html += '<div class="csp-modal-head">';
    html += '<span style="font-size:18px;font-weight:900">👁 Xem Chính Sách</span>';
    html += '<div style="display:flex;gap:8px">';
    html += '<button onclick="window._cspExportImage(' + p.id + ')" style="background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);color:white;padding:6px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">🖼️ Ảnh</button>';
    html += '<button onclick="document.getElementById(\'csp-preview-overlay\').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer">✕</button>';
    html += '</div>';
    html += '</div>';
    html += '<div class="csp-modal-body" style="padding:0">';
    html += _cspBuildPreviewHTML(p);
    html += '</div>';
    html += '</div>';

    ov.innerHTML = html;
    document.body.appendChild(ov);
}

function _cspCleanOrphanNumberLines(htmlStr) {
    if (!htmlStr) return '';
    var str = String(htmlStr)
        .replace(/\s*class="isSelectedEnd"/gi, '')
        .replace(/\s*class="isSelected"/gi, '')
        .replace(/(?:<div>|<p>|<br\s*\/?>|\n)\s*\d+\.\s*(?:&nbsp;|\s)*(?:<\/div>|<\/p>|<br\s*\/?>|\n|$)/gi, '');
    var seq = 1;
    str = str.replace(/(^|>|\n)\s*(\d+)\.\s+(?!\d)/g, function(match, p1) {
        return p1 + (seq++) + '. ';
    });
    return str;
}

function _cspFixMoneySpacingInHTML(html) {
    if (!html) return '';
    return html.replace(/(\d+)\.\s+(\d{3})/g, '$1.$2');
}

// Auto-format content text with smart styling (Cỡ chữ 13px & line-height 1.65)
function _cspAutoFormat(text) {
    if (!text) return '';
    var cleaned = text.replace(/\s*class="isSelectedEnd"/gi, '').replace(/\s*class="isSelected"/gi, '');
    if (/<[a-z][\s\S]*>/i.test(cleaned)) {
        return _cspFixMoneySpacingInHTML(cleaned);
    }

    var lines = cleaned.split('\n');
    var result = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) { result.push('<div style="height:8px"></div>'); continue; }
        var escaped = _cspEsc(line);

        if (line.length >= 3 && line === line.toUpperCase() && /[A-ZÀ-Ỹ]/.test(line)) {
            result.push('<div style="font-size:14px;font-weight:900;color:#192951;text-transform:uppercase;margin-top:18px;margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid #FAD14C;display:inline-block;letter-spacing:0.3px">' + escaped + '</div>');
            continue;
        }

        result.push('<div style="font-size:13px;color:#334155;line-height:1.65;margin-bottom:8px">' + _cspHighlightAmounts(escaped) + '</div>');
    }
    return result.join('');
}

// Highlight monetary amounts and key terms
function _cspHighlightAmounts(text) {
    text = text.replace(/(\d+)\.\s+(\d{3})/g, '$1.$2');
    text = text.replace(/(\d[\d.,]*\s*(?:đ|VND|VNĐ|vnđ|k|K|triệu|tr)\b)/gi, '<strong style="color:#192951;font-weight:800">$1</strong>');
    text = text.replace(/(\d+%)/g, '<strong style="color:#192951;font-weight:800">$1</strong>');
    text = text.replace(/(Free ship[^,.)]*|Miễn [Pp]hí [Vv]ận [Cc]huyển)/gi, '<span style="color:#b45309;font-weight:700;font-style:italic">$1</span>');
    text = text.replace(/(Hỗ trợ(?:\s+tối đa)?)/gi, '<strong style="color:#192951">$1</strong>');
    return text;
}

function _cspBuildPreviewHTML(p) {
    var logoUrl = '/images/logo.png';
    var html = '<div id="csp-export-area" style="background:#fff;padding:0;font-family:\'Plus Jakarta Sans\',\'Google Sans\',sans-serif;width:100%;box-sizing:border-box">';

    // Header — Navy background: Logo icon + Brand text centered
    html += '<div style="background:#192951;padding:24px 30px 18px;text-align:center;border-radius:0">';
    html += '<div style="display:inline-flex;align-items:center;gap:14px;justify-content:center">';
    html += '<img src="' + logoUrl + '" style="width:64px;height:64px;object-fit:contain" />';
    html += '<div style="text-align:left">';
    html += '<div style="font-size:22px;font-weight:900;color:#FAD14C;letter-spacing:2px;line-height:1.2">ĐỒNG PHỤC HV</div>';
    html += '<div style="font-size:10px;color:#94a3c6;font-weight:600;font-style:italic;letter-spacing:0.5px">Tận tâm dựng xây giá trị</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    // Horizontal metallic gold shimmer divider
    html += '<div style="height:3px;background:linear-gradient(90deg, #192951 0%, #c49a28 15%, #FAD14C 35%, #FFF5A3 50%, #FAD14C 65%, #c49a28 85%, #192951 100%)"></div>';

    // Title bar
    html += '<div style="background:#192951;padding:14px 30px 12px;text-align:center">';
    html += '<div style="font-size:20px;font-weight:900;color:#fff;text-transform:uppercase;line-height:1.35;letter-spacing:0.5px">' + _cspEsc(p.title) + '</div>';
    html += '</div>';

    // Validity date (Căn chữ cân bằng chính giữa khung bo tròn & thu nhỏ vừa vặn)
    html += '<div style="background:#192951;padding:0 30px 16px;text-align:center">';
    html += '<div style="display:inline-flex;align-items:center;justify-content:center;padding:3.5px 13px;border-radius:20px;background:rgba(250,209,76,0.1);border:1px solid rgba(250,209,76,0.25);line-height:1.25">';
    html += '<span style="font-size:10px;color:#FAD14C;font-weight:700;letter-spacing:0.2px">';
    html += 'Thời Gian Áp Dụng : ';
    if (p.valid_from) {
        html += _cspFmtDate(p.valid_from);
        html += p.valid_to ? (' đến ' + _cspFmtDate(p.valid_to)) : ' trở đi khi có thông tin mới nhất';
    } else {
        html += 'Không giới hạn';
    }
    html += '</span>';
    html += '</div>';
    html += '</div>';

    // Body (Padding 24px 30px)
    html += '<div style="padding:24px 30px;border-left:2px solid #e2e8f0;border-right:2px solid #e2e8f0;background:#fff">';

    // Subtitle
    var typeLabel = p.policy_type === 'ctv' ? 'CTV' : (p.policy_type === 'affiliate' ? 'Affiliate' : 'Khách Hàng');
    if (p.field_name) {
        html += '<div style="font-size:13px;color:#475569;font-weight:600;margin-bottom:18px;display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span>Áp dụng cho <b>' + typeLabel + '</b></span> • <span>Lĩnh vực:</span> <span style="' + _cspGetFieldBadgeStyle(p.field_name) + '">🏷️ ' + _cspEsc(p.field_name) + '</span></div>';
    }

    // Content — auto formatted với cỡ chữ 13px và line-height 1.65
    if (p.content) {
        html += '<div style="margin-bottom:18px;font-size:13px;line-height:1.65;color:#334155">' + _cspAutoFormat(p.content) + '</div>';
    }

    // Tiers
    if (p.tiers && p.tiers.length > 0) {
        p.tiers.forEach(function(t) {
            html += '<div style="border:1.5px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:16px;border-left:4px solid #FAD14C;background:#fefdf8">';
            if (t.condition_label) {
                html += '<div style="font-size:13.5px;font-weight:900;color:#192951;text-transform:uppercase;margin-bottom:8px;border-bottom:2px solid #FAD14C;padding-bottom:4px;display:inline-block">' + _cspEsc(t.condition_label) + '</div>';
            }
            if (t.benefit_text) {
                html += '<div style="line-height:1.65;font-size:13px">' + _cspAutoFormat(t.benefit_text) + '</div>';
            }
            html += '</div>';
        });
    }
    html += '</div>';

    // Footer — Premium navy design ban đầu
    html += '<div style="background:#192951;padding:0;text-align:center">';
    html += '<div style="height:3px;background:linear-gradient(90deg, #192951 0%, #c49a28 15%, #FAD14C 35%, #FFF5A3 50%, #FAD14C 65%, #c49a28 85%, #192951 100%)"></div>';
    html += '<div style="padding:22px 30px 16px">';
    html += '<div style="font-size:15px;color:#FAD14C;font-weight:800;margin-bottom:4px;letter-spacing:0.8px">HV UNIFORM cảm ơn quý khách đã đặt hàng</div>';
    html += '<div style="font-size:12px;color:rgba(255,255,255,0.7);font-weight:500;font-style:italic">Chúc quý khách có một trải nghiệm tuyệt vời mua hàng tại HV</div>';
    html += '</div>';
    html += '<div style="margin:0 40px 16px;border-top:1px solid rgba(250,209,76,0.3)"></div>';
    html += '<div style="padding:0 30px 22px;display:flex;justify-content:center;align-items:center;gap:12px;flex-wrap:wrap">';
    html += '<div style="display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border-radius:20px;background:rgba(255,255,255,0.08);border:1px solid rgba(250,209,76,0.3);color:#FAD14C;font-size:11.5px;font-weight:700">📞 09 2333 2333</div>';
    html += '<div style="display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border-radius:20px;background:rgba(255,255,255,0.08);border:1px solid rgba(250,209,76,0.3);color:#FAD14C;font-size:11.5px;font-weight:700">🌐 www.dongphuchv.vn</div>';
    html += '<div style="display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border-radius:20px;background:rgba(255,255,255,0.08);border:1px solid rgba(250,209,76,0.3);color:#FAD14C;font-size:11.5px;font-weight:700">📍 LK02-21 Khu Đô Thị Đô Nghĩa, Hà Đông, Hà Nội</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    return html;
}

// ========== EXPORT IMAGE ==========
window._cspExportImage = function(id) {
    fetch('/api/customer-policies/' + id, { credentials: 'include', headers: _cspHeaders() })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (!d.policy) return alert('Không tìm thấy chính sách');
            var now = _cspGetVnToday();
            var isNotStarted = d.policy.valid_from && d.policy.valid_from.split('T')[0] > now;
            var isExpired = d.policy.valid_to && d.policy.valid_to.split('T')[0] < now;
            if (!d.policy.is_active || isExpired || isNotStarted) {
                var reason = isExpired ? 'đã hết hạn' : (!d.policy.is_active ? 'đang tạm dừng' : 'chưa đến ngày áp dụng');
                return alert('⚠️ Chính sách này ' + reason + ', không thể tải ảnh!');
            }
            _cspDoExport(d.policy, 'image');
        });
};

function _cspDownloadDirectImage(imageUrl, title) {
    var cleanTitle = (title || 'HV').replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, '_').substring(0, 50);
    var filename = 'Chinh_Sach_' + cleanTitle;

    if (imageUrl.indexOf('data:image/') === 0) {
        var ext = 'png';
        if (imageUrl.indexOf('data:image/jpeg') === 0 || imageUrl.indexOf('data:image/jpg') === 0) ext = 'jpg';
        else if (imageUrl.indexOf('data:image/webp') === 0) ext = 'webp';

        var a = document.createElement('a');
        a.download = filename + '.' + ext;
        a.href = imageUrl;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
    }

    fetch(imageUrl)
        .then(function(res) { return res.blob(); })
        .then(function(blob) {
            var ext = 'png';
            if (blob.type === 'image/jpeg') ext = 'jpg';
            else if (blob.type === 'image/webp') ext = 'webp';

            var blobUrl = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.download = filename + '.' + ext;
            a.href = blobUrl;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function() { URL.revokeObjectURL(blobUrl); }, 1000);
        })
        .catch(function() {
            var a = document.createElement('a');
            a.download = filename + '.png';
            a.href = imageUrl;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
}

function _cspDoExport(policy, format) {
    if (policy && policy.image_url && policy.image_url.trim()) {
        _cspDownloadDirectImage(policy.image_url, policy.title);
        return;
    }

    var existingExportArea = document.getElementById('csp-export-area');
    if (existingExportArea && document.getElementById('csp-preview-overlay')) {
        _cspRunHtml2Canvas(existingExportArea, policy);
        return;
    }

    var wrapper = document.createElement('div');
    wrapper.id = 'csp-temp-export-wrapper';
    wrapper.style.cssText = 'position:absolute;left:-9999px;top:0;width:600px;z-index:99999;opacity:1;background:#ffffff';
    wrapper.innerHTML = _cspBuildPreviewHTML(policy);
    document.body.appendChild(wrapper);

    _cspRunHtml2Canvas(wrapper, policy, function() {
        if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
    });
}

function _cspRunHtml2Canvas(elementTarget, policy, onComplete) {
    _cspLoadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', function() {
        setTimeout(function() {
            html2canvas(elementTarget, {
                scale: 2.5,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: elementTarget.offsetWidth || 600,
                height: elementTarget.offsetHeight
            }).then(function(canvas) {
                var link = document.createElement('a');
                link.download = 'Chinh_Sach_' + (policy.title || 'HV').replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, '_').substring(0, 50) + '.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
                if (onComplete) onComplete();
            }).catch(function(e) {
                console.error('Export error:', e);
                alert('Lỗi xuất file: ' + e.message);
                if (onComplete) onComplete();
            });
        }, 200);
    });
}

var _cspScriptCache = {};
function _cspLoadScript(src, cb) {
    if (_cspScriptCache[src]) { cb(); return; }
    var s = document.createElement('script');
    s.src = src;
    s.onload = function() { _cspScriptCache[src] = true; cb(); };
    s.onerror = function() { alert('Không thể tải thư viện xuất file'); };
    document.head.appendChild(s);
}

// ========== QUẢN LÝ LĨNH VỰC (Director Only) ==========
window._cspManageFields = function() {
    var ov = document.createElement('div');
    ov.className = 'csp-modal-overlay';
    ov.id = 'csp-fields-overlay';
    ov.onclick = function(e) { if (e.target === ov) ov.remove(); };

    var html = '<div class="csp-modal" style="max-width:520px">';
    html += '<div class="csp-modal-head">';
    html += '<span style="font-size:18px;font-weight:900">🏷️ Quản Lý Lĩnh Vực</span>';
    html += '<button onclick="document.getElementById(\'csp-fields-overlay\').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer">✕</button>';
    html += '</div>';
    html += '<div class="csp-modal-body">';

    // Add new
    html += '<div style="display:flex;gap:10px;margin-bottom:20px">';
    html += '<input id="csp-new-field-input" class="csp-form-input" placeholder="Nhập tên lĩnh vực mới..." style="flex:1" />';
    html += '<button onclick="window._cspAddField()" style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;padding:10px 18px;border-radius:10px;font-weight:800;font-size:13px;cursor:pointer;white-space:nowrap">➕ Thêm</button>';
    html += '</div>';

    // List
    html += '<div id="csp-fields-list" style="display:flex;flex-direction:column;gap:8px">';
    if (_csp.fields.length === 0) {
        html += '<div style="text-align:center;padding:30px;color:#94a3b8;font-size:14px">📭 Chưa có lĩnh vực nào</div>';
    } else {
        _cspSortFields(_csp.fields).forEach(function(f) {
            var fid = f.id;
            var fname = f.name || f;
            html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px">';
            html += '<span style="font-size:14px;font-weight:700;color:#1e293b">🏷️ ' + _cspEsc(fname) + '</span>';
            html += '<div style="display:flex;gap:6px">';
            html += '<button onclick="window._cspEditField(' + fid + ',\'' + _cspEsc(fname).replace(/'/g,'\\\'') + '\')" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;padding:5px 12px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">✏️ Sửa</button>';
            html += '<button onclick="window._cspDeleteField(' + fid + ',\'' + _cspEsc(fname).replace(/'/g,'\\\'') + '\')" style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;padding:5px 12px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">🗑 Xóa</button>';
            html += '</div>';
            html += '</div>';
        });
    }
    html += '</div>';

    html += '</div></div>';
    ov.innerHTML = html;
    document.body.appendChild(ov);

    // Focus input
    setTimeout(function() {
        var inp = document.getElementById('csp-new-field-input');
        if (inp) inp.focus();
    }, 100);
};

window._cspAddField = function() {
    var inp = document.getElementById('csp-new-field-input');
    if (!inp) return;
    var name = inp.value.trim();
    if (!name) return alert('⚠️ Vui lòng nhập tên lĩnh vực!');

    fetch('/api/customer-policies/fields', {
        method: 'POST',
        credentials: 'include',
        headers: _cspHeaders(),
        body: JSON.stringify({ name: name })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.error) return alert('❌ ' + d.error);
        // Reload fields and refresh modal
        fetch('/api/customer-policies/fields', { credentials: 'include', headers: _cspHeaders() })
            .then(function(r) { return r.json(); })
            .then(function(fd) {
                _csp.fields = fd.fields || [];
                // Close and re-open modal
                var ov = document.getElementById('csp-fields-overlay');
                if (ov) ov.remove();
                window._cspManageFields();
                _cspRender(); // re-render main page too
            });
    })
    .catch(function(e) { alert('Lỗi: ' + e.message); });
};

window._cspEditField = function(id, name) {
    var newName = prompt('✏️ Nhập tên mới cho lĩnh vực "' + name + '":', name);
    if (newName === null) return;
    newName = newName.trim();
    if (!newName) return alert('⚠️ Tên lĩnh vực không được để trống!');
    if (newName === name) return;

    fetch('/api/customer-policies/fields/' + id, {
        method: 'PUT',
        credentials: 'include',
        headers: _cspHeaders(),
        body: JSON.stringify({ name: newName })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.error) return alert('❌ ' + d.error);
        _cspLoadData();
        var ov = document.getElementById('csp-fields-overlay');
        if (ov) ov.remove();
        setTimeout(function() { window._cspManageFields(); }, 250);
    })
    .catch(function(e) { alert('Lỗi: ' + e.message); });
};

window._cspDeleteField = function(id, name) {
    if (!confirm('⚠️ Bạn chắc chắn muốn xóa lĩnh vực "' + name + '"?')) return;

    fetch('/api/customer-policies/fields/' + id, {
        method: 'DELETE',
        credentials: 'include',
        headers: _cspHeaders()
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.error) return alert('❌ ' + d.error);
        // Reload fields and refresh modal
        fetch('/api/customer-policies/fields', { credentials: 'include', headers: _cspHeaders() })
            .then(function(r) { return r.json(); })
            .then(function(fd) {
                _csp.fields = fd.fields || [];
                var ov = document.getElementById('csp-fields-overlay');
                if (ov) ov.remove();
                window._cspManageFields();
                _cspRender();
            });
    })
    .catch(function(e) { alert('Lỗi: ' + e.message); });
};

})();
