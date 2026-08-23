// ========== CHƯƠNG TRÌNH & QUÀ TẶNG KHÁCH HÀNG — ĐỒNG PHỤC HV ==========
(function() {
'use strict';

var _ctk = {
    programs: [],
    fields: [],
    filter: { status: 'active', type: 'all', field: 'all', year: 'all', period: 'all', search: '' },
    editingId: null,
    container: null
};

function _ctkIsTrinh(u) {
    if (!u) return false;
    var uname = String(u.username || '').toLowerCase().trim();
    var name = String(u.full_name || '').toLowerCase().trim();
    return uname === 'trinh' || uname === 'leviettrinh' || uname === 'trinh.lvt' || name.indexOf('lê việt trinh') !== -1 || name.indexOf('le viet trinh') !== -1;
}

function _ctkCanEdit() {
    var u = window.currentUser || window._currentUser;
    if (!u || !u.role) {
        try {
            var stored = JSON.parse(localStorage.getItem('user') || '{}');
            if (stored && stored.role) u = stored;
        } catch(e) {}
    }
    if (!u) return false;
    if (['giam_doc', 'admin'].indexOf(u.role) !== -1) return true;
    if (u.role === 'quan_ly_cap_cao' && _ctkIsTrinh(u)) return true;
    return false;
}

function _ctkIsDirector() {
    return _ctkCanEdit();
}

function _ctkGetVnToday() {
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

function _ctkSortFields(fieldsList) {
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

function _ctkGetFieldBadgeStyle(fieldName) {
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

function _ctkEsc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function _ctkStripTags(htmlStr) {
    if (!htmlStr) return '';
    var tmp = document.createElement('div');
    tmp.innerHTML = htmlStr;
    return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
}

function _ctkFormatDate(dStr) {
    if (!dStr) return 'Mãi mãi';
    var d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var yyyy = d.getFullYear();
    return dd + '/' + mm + '/' + yyyy;
}

function _ctkFormatDateDisplay(dStr) {
    if (!dStr) return '';
    var d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    var dd = d.getDate();
    var mm = d.getMonth() + 1;
    var yyyy = d.getFullYear();
    return dd + '/' + mm + '/' + yyyy;
}

function _ctkCapitalizeVnName(str) {
    if (!str) return '';
    return str.trim().toLowerCase().split(/\s+/).map(function(word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

window._ctkCopyKeyword = function(keyword) {
    var text = keyword || '(khach_hang)';
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
            alert('📋 Đã sao chép từ khóa ' + text + ' vào bộ nhớ tạm!\nAnh/Chị có thể dán (Ctrl+V) vào ô Nội Dung Chương Trình.');
        }).catch(function() {
            _ctkFallbackCopy(text);
        });
    } else {
        _ctkFallbackCopy(text);
    }
};

function _ctkFallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        alert('📋 Đã sao chép từ khóa ' + text + ' vào bộ nhớ tạm!\nAnh/Chị có thể dán (Ctrl+V) vào ô Nội Dung Chương Trình.');
    } catch(e) {
        alert('⚠️ Không thể tự động sao chép. Vui lòng chọn và chép thủ công: ' + text);
    }
    if (ta.parentNode) ta.parentNode.removeChild(ta);
}

window._ctkLimitTitleLines = function(e, el) {
    if (e.key === 'Enter') {
        var lines = (el.value || '').split('\n');
        if (lines.length >= 2) {
            e.preventDefault();
            return false;
        }
    }
};

window._ctkCleanTitleLines = function(el) {
    if (!el) return;
    var lines = (el.value || '').split('\n');
    if (lines.length > 2) {
        el.value = lines.slice(0, 2).join('\n');
    }
};

function _ctkGetNowVnDate() {
    var now = new Date();
    try {
        var formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        });
        var parts = formatter.formatToParts(now);
        var y = 0, m = 0, d = 0;
        for (var i = 0; i < parts.length; i++) {
            if (parts[i].type === 'year') y = parseInt(parts[i].value, 10);
            if (parts[i].type === 'month') m = parseInt(parts[i].value, 10) - 1;
            if (parts[i].type === 'day') d = parseInt(parts[i].value, 10);
        }
        if (y && m >= 0 && d) {
            return new Date(y, m, d);
        }
    } catch(e){}
    return new Date();
}

function _ctkFormatValidityText(p) {
    if (!p) return 'Thời gian áp dụng: Không giới hạn';
    var vType = p.valid_type || 'date_range';

    if (vType === 'days_from_sent') {
        var numDays = (p.valid_days !== undefined && p.valid_days !== null && p.valid_days !== '') ? parseInt(p.valid_days, 10) : 30;
        if (!numDays || numDays <= 0) numDays = 30;
        return 'Thời hạn ưu đãi: ' + numDays + ' ngày kể từ ngày gửi chương trình';
    }

    if (vType === 'auto_days') {
        var d = (p.valid_days !== undefined && p.valid_days !== null && p.valid_days !== '') ? parseInt(p.valid_days, 10) : 5;
        if (!d || d <= 0) d = 5;

        var nowVn = _ctkGetNowVnDate();
        var day1 = String(nowVn.getDate()).padStart(2, '0');
        var m1 = String(nowVn.getMonth() + 1).padStart(2, '0');
        var y1 = nowVn.getFullYear();

        var endVn = new Date(nowVn.getTime());
        endVn.setDate(endVn.getDate() + d);
        var day2 = String(endVn.getDate()).padStart(2, '0');
        var m2 = String(endVn.getMonth() + 1).padStart(2, '0');
        var y2 = endVn.getFullYear();

        return 'Thời gian áp dụng từ ngày ' + day1 + '/' + m1 + '/' + y1 + ' - ' + day2 + '/' + m2 + '/' + y2;
    }

    // Default / date_range
    if (p.valid_from) {
        if (p.valid_to) {
            return 'Thời gian áp dụng từ ngày ' + _ctkFormatDateDisplay(p.valid_from) + ' - ' + _ctkFormatDateDisplay(p.valid_to);
        }
        return 'Thời gian áp dụng từ ngày ' + _ctkFormatDateDisplay(p.valid_from) + ' trở đi';
    }

    // Fallback: Check if content has "Thời gian áp dụng: ..." line typed manually
    if (p.content) {
        var match = p.content.match(/(?:📅\s*)?Thời gian áp dụng[:\s]*([^<\n\r]+)/i);
        if (match && match[1]) {
            var extracted = _ctkStripTags(match[1]).trim();
            if (extracted) {
                return 'Thời gian áp dụng: ' + extracted.replace(/^(Từ\s*)/i, 'Từ ');
            }
        }
    }

    return 'Thời gian áp dụng: Không giới hạn';
}

function _ctkFormatMoney(val) {
    if (!val && val !== 0) return '';
    return Number(val).toLocaleString('vi-VN') + 'đ';
}

function _ctkLoadData() {
    return Promise.all([
        fetch('/api/customer-programs', { headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') } }).then(function(r){ return r.json(); }),
        fetch('/api/customer-programs/fields', { headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') } }).then(function(r){ return r.json(); })
    ]).then(function(results) {
        var resP = results[0];
        var resF = results[1];
        if (resP.success) _ctk.programs = resP.programs || [];
        if (resF.success) _ctk.fields = _ctkSortFields(resF.fields || []);
        _ctkRender();
    });
}

window.renderChuongtrinhkhhvPage = function(container) {
    _ctk.container = container;
    container.innerHTML = '<div style="padding:40px;text-align:center;color:#192951;font-size:16px;font-weight:700;font-family:\'Google Sans\',sans-serif">⏳ Đang tải danh sách Chương Trình & Quà Tặng...</div>';
    
    _ctkLoadData().catch(function(err) {
        console.error('[chuongtrinhkhhv]', err);
        container.innerHTML = '<div style="padding:40px;text-align:center;color:#ef4444;font-weight:700;font-family:\'Google Sans\',sans-serif">❌ Lỗi tải dữ liệu: ' + _ctkEsc(err.message) + '</div>';
    });
};

function _ctkRender() {
    var c = _ctk.container;
    if (!c) return;

    var isEdit = _ctkCanEdit();
    var isDir = _ctkIsDirector();

    var html = '';

    // Style riêng bộ nhận diện VÀNG ĐẬM + CHỮ XANH ĐEN + FULL MÀN HÌNH + FONT ĐỒNG BỘ NỔI BẬT
    html += '<style>';
    html += '@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Lexend:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&family=Google+Sans:wght@400;500;700;800&display=swap");';
    html += '.ctk-wrapper, .ctk-wrapper *, .ctk-wrapper button, .ctk-wrapper input, .ctk-wrapper select, .ctk-wrapper textarea, #ctk-modal-overlay, #ctk-modal-overlay *, #ctk-modal-overlay button, #ctk-modal-overlay input, #ctk-modal-overlay select, #ctk-modal-overlay textarea, #ctk_field_modal_overlay, #ctk_field_modal_overlay *, #ctk_field_modal_overlay button, #ctk_field_modal_overlay input, #ctk_field_modal_overlay select, #ctk_field_modal_overlay textarea { font-family: "Plus Jakarta Sans", "Lexend", "Outfit", "Google Sans", sans-serif !important; }';
    html += '.ctk-wrapper{padding:20px 24px;width:100%;box-sizing:border-box;color:#0f172a}';
    
    // Banner Vàng Đậm (#FAD14C) + Chữ Xanh Đen (#192951)
    html += '.ctk-banner{background:linear-gradient(135deg,#FAD14C 0%,#f5c030 50%,#e5b020 100%);border-radius:20px;padding:28px 32px;color:#192951;margin-bottom:24px;box-shadow:0 10px 25px -5px rgba(250,209,76,0.4);border:2px solid #e5b020;display:flex;align-items:center;justify-content:space-between;position:relative;overflow:hidden}';
    html += '.ctk-banner::after{content:"🎁";position:absolute;right:-10px;bottom:-20px;font-size:140px;opacity:0.18;pointer-events:none}';
    html += '.ctk-banner h1{font-size:25px;font-weight:800;margin:0 0 6px 0;letter-spacing:-0.3px;color:#192951;display:flex;align-items:center;gap:10px}';
    html += '.ctk-banner p{font-size:14px;color:#0f172a;margin:0;opacity:0.95;font-weight:600;letter-spacing:0.2px}';
    
    // Nút bấm Xanh Đen + Chữ Vàng Đậm Nổi Bật trên Banner
    html += '.ctk-add-btn{background:linear-gradient(135deg,#192951,#0f172a);color:#FAD14C;border:none;padding:12px 22px;border-radius:12px;font-weight:800;font-size:13.5px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 6px 16px rgba(25,41,81,0.35);transition:all 0.2s;z-index:1;letter-spacing:0.2px}';
    html += '.ctk-add-btn:hover{background:linear-gradient(135deg,#0f172a,#020617);transform:translateY(-2px);box-shadow:0 8px 20px rgba(25,41,81,0.45)}';
    
    // Filter Box
    html += '.ctk-filter{background:#ffffff;border-radius:18px;padding:18px 22px;border:1.5px solid #cbd5e1;margin-bottom:24px;box-shadow:0 6px 16px rgba(15,23,42,0.06);display:flex;flex-direction:column;gap:14px}';
    html += '.ctk-pill{background:#f1f5f9;color:#334155;border:none;padding:9px 16px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s;white-space:nowrap;letter-spacing:0.1px}';
    html += '.ctk-pill.active{background:#192951;color:#FAD14C;box-shadow:0 4px 12px rgba(25,41,81,0.35)}';
    html += '.ctk-search{width:100%;box-sizing:border-box;padding:11px 18px;border:1.5px solid #cbd5e1;border-radius:12px;font-size:13.5px;font-weight:500;outline:none;transition:all 0.2s;background:#ffffff;color:#0f172a}';
    html += '.ctk-search:focus{border-color:#192951;box-shadow:0 0 0 3.5px rgba(25,41,81,0.15)}';
    html += '.ctk-select{padding:9px 16px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:13px;font-weight:800;color:#192951;outline:none;background:#ffffff;cursor:pointer;white-space:nowrap}';
    html += '.ctk-select:focus{border-color:#192951}';
    
    // Cards Grid
    html += '.ctk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:24px}';
    html += '.ctk-card{background:#ffffff;border-radius:18px;border:1.5px solid #e2e8f0;overflow:hidden;box-shadow:0 8px 20px -4px rgba(15,23,42,0.08);display:flex;flex-direction:column;transition:transform 0.25s,box-shadow 0.25s}';
    html += '.ctk-card:hover{transform:translateY(-4px);box-shadow:0 20px 32px -6px rgba(25,41,81,0.18);border-color:#FAD14C}';
    html += '.ctk-card-head{padding:16px 20px;border-bottom:1.5px solid #e2e8f0;background:#f8fafc;display:flex;align-items:flex-start;justify-content:space-between;gap:10px}';
    html += '.ctk-card-body{padding:18px 20px;flex:1;display:flex;flex-direction:column;gap:12px}';
    html += '.ctk-card-foot{padding:14px 20px;border-top:1.5px solid #e2e8f0;background:#f8fafc;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:flex-end}';
    
    // Badges & Buttons
    html += '.ctk-badge{display:inline-block;padding:4px 11px;border-radius:7px;font-size:11.5px;font-weight:800;letter-spacing:0.3px}';
    html += '.ctk-badge-kh{background:linear-gradient(135deg,#192951,#0f172a);color:#FAD14C}';
    html += '.ctk-badge-ctv{background:linear-gradient(135deg,#d97706,#b45309);color:#ffffff}';
    html += '.ctk-badge-aff{background:linear-gradient(135deg,#059669,#047857);color:#ffffff}';
    html += '.ctk-badge-field{background:#e2e8f0;color:#1e293b;font-weight:700}';
    html += '.ctk-badge-status-on{background:#dcfce7;color:#15803d}';
    html += '.ctk-badge-status-off{background:#fee2e2;color:#b91c1c}';
    html += '.ctk-badge-status-expired{background:#f1f5f9;color:#64748b}';
    html += '.ctk-btn-action{padding:7px 14px;border-radius:9px;font-size:12.5px;font-weight:700;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:4px;transition:all 0.2s}';
    html += '.ctk-btn-img{background:#fdf2f8;color:#c026d3;border:1.5px solid #f472b6;font-weight:800}';
    html += '.ctk-btn-img:hover{background:#fce7f3;border-color:#d946ef;transform:translateY(-1px)}';
    html += '.ctk-btn-pause{background:#fef3c7;color:#b45309}';
    html += '.ctk-btn-pause:hover{background:#fde68a}';
    html += '.ctk-btn-edit{background:#dbeafe;color:#1d4ed8}';
    html += '.ctk-btn-edit:hover{background:#bfdbfe}';
    html += '.ctk-btn-del{background:#fee2e2;color:#b91c1c}';
    html += '.ctk-btn-del:hover{background:#fca5a5}';

    // Form Modal Styles
    html += '.ctk-modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.7);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto}';
    html += '.ctk-modal{background:#ffffff;border-radius:20px;width:100%;max-width:760px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 50px -12px rgba(15,23,42,0.5);border:2px solid #192951}';
    html += '.ctk-modal-head{background:linear-gradient(135deg,#192951,#0f172a);color:#ffffff;padding:18px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1.5px solid #192951}';
    html += '.ctk-modal-body{padding:24px;overflow-y:auto;display:flex;flex-direction:column;gap:16px;flex:1}';
    html += '.ctk-form-group{display:flex;flex-direction:column;gap:6px}';
    html += '.ctk-form-label{font-size:13px;font-weight:800;color:#192951}';
    html += '.ctk-form-input{padding:10px 14px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:13px;outline:none;width:100%;box-sizing:border-box;background:#fff;transition:border-color 0.2s}';
    html += '.ctk-form-input:focus{border-color:#192951;box-shadow:0 0 0 3px rgba(25,41,81,0.12)}';
    html += '.ctk-rte-btn{border:1.5px solid #cbd5e1;background:#fff;border-radius:6px;padding:4px 10px;font-size:13px;cursor:pointer;color:#192951;display:inline-flex;align-items:center;justify-content:center;transition:all 0.15s}';
    html += '.ctk-rte-btn:hover{background:#f1f5f9;border-color:#192951}';

    html += '</style>';

    html += '<div class="ctk-wrapper">';

    // Header Banner Vàng Đậm + Chữ Xanh Đen
    html += '<div class="ctk-banner">';
    html += '<div>';
    html += '<h1>🎁 Chương Trình & Quà Tặng Khách Hàng</h1>';
    html += '<p>Quản lý tất cả chương trình ưu đãi, quà tặng tri ân dành cho Khách Hàng, CTV và Affiliate — Đồng Phục HV</p>';
    html += '</div>';

    if (isEdit) {
        html += '<div style="display:flex;gap:10px">';
        html += '<button class="ctk-add-btn" style="background:#ffffff;color:#192951;border:1.5px solid #cbd5e1;box-shadow:none" onclick="window._ctkManageFields()">📌 Quản Lý Lĩnh Vực</button>';
        html += '<button class="ctk-add-btn" onclick="window._ctkOpenModal()">➕ Tạo Chương Trình Mới</button>';
        html += '</div>';
    }

    html += '</div>';

    // Dynamic Years list
    var currentYear = new Date().getFullYear();
    var yearSet = {};
    for (var i = currentYear - 3; i <= currentYear + 2; i++) {
        yearSet[i] = true;
    }
    (_ctk.programs || []).forEach(function(p) {
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

    // Filter bar
    html += '<div class="ctk-filter">';
    
    // Hàng 1: Bộ Lọc
    html += '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">';
    
    // 1. Trạng Thái Dropdown Select
    html += '<select class="ctk-select" onchange="window._ctkSetFilter(\'status\',this.value)" style="font-weight:800;color:#192951;border-color:#cbd5e1">';
    html += '<option value="active"' + ((_ctk.filter.status || 'active') === 'active' ? ' selected' : '') + '>✅ Đang Áp Dụng</option>';
    html += '<option value="paused"' + (_ctk.filter.status === 'paused' ? ' selected' : '') + '>⏸️ Dừng Áp Dụng</option>';
    html += '<option value="expired"' + (_ctk.filter.status === 'expired' ? ' selected' : '') + '>❌ Hết Hạn</option>';
    html += '<option value="all"' + (_ctk.filter.status === 'all' ? ' selected' : '') + '>📋 Tất Cả Trạng Thái</option>';
    html += '</select>';

    html += '<div style="width:1px;height:24px;background:#cbd5e1;margin:0 2px"></div>';

    // 2. Lĩnh Vực Pills
    html += '<button class="ctk-pill' + (_ctk.filter.field === 'all' ? ' active' : '') + '" onclick="window._ctkSetFilter(\'field\',\'all\')">🏷️ Tất Cả Lĩnh Vực</button>';
    _ctkSortFields(_ctk.fields).forEach(function(f) {
        var fn = f.name || f;
        var isActive = _ctk.filter.field === fn;
        html += '<button class="ctk-pill' + (isActive ? ' active' : '') + '" onclick="window._ctkSetFilter(\'field\',\'' + _ctkEsc(fn) + '\')">🏷️ ' + _ctkEsc(fn) + '</button>';
    });

    html += '<div style="width:1px;height:24px;background:#cbd5e1;margin:0 2px"></div>';

    // 3. Loại Pills
    var types = [
        { key: 'all', label: '📋 Tất Cả' },
        { key: 'khach_hang', label: '👤 Khách Hàng' },
        { key: 'ctv', label: '🤝 CTV' },
        { key: 'affiliate', label: '🔗 Affiliate' }
    ];
    types.forEach(function(t) {
        html += '<button class="ctk-pill' + (_ctk.filter.type === t.key ? ' active' : '') + '" onclick="window._ctkSetFilter(\'type\',\'' + t.key + '\')">' + t.label + '</button>';
    });

    html += '</div>'; // End Hàng 1

    // Hàng 2: Thời Gian (Năm, Tháng/Quý) & Ô Tìm kiếm
    html += '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">';
    
    html += '<select class="ctk-select" onchange="window._ctkSetFilter(\'year\',this.value)" style="min-width:130px;font-weight:700">';
    html += '<option value="all"' + (_ctk.filter.year === 'all' ? ' selected' : '') + '>📅 Tất Cả Năm</option>';
    yearsList.forEach(function(y) {
        html += '<option value="' + y + '"' + (String(_ctk.filter.year) === String(y) ? ' selected' : '') + '>📅 Năm ' + y + '</option>';
    });
    html += '</select>';

    html += '<select class="ctk-select" onchange="window._ctkSetFilter(\'period\',this.value)" style="min-width:210px;font-weight:700">';
    periodsList.forEach(function(pr) {
        html += '<option value="' + pr.key + '"' + (_ctk.filter.period === pr.key ? ' selected' : '') + '>' + pr.label + '</option>';
    });
    html += '</select>';

    html += '<input class="ctk-search" type="text" placeholder="🎁 Tìm kiếm chương trình & quà tặng..." value="' + _ctkEsc(_ctk.filter.search) + '" onkeyup="window._ctkSearchDebounce(this.value)" style="flex:1;min-width:200px" />';
    
    html += '</div>'; // End Hàng 2

    html += '</div>'; // End ctk-filter

    // Grid Programs
    var now = _ctkGetVnToday();
    var filteredPrograms = (_ctk.programs || []).filter(function(p) {
        var isNotStarted = p.valid_from && p.valid_from.split('T')[0] > now;
        var isExpired = p.valid_to && p.valid_to.split('T')[0] < now;
        var isActive = p.is_active && !isExpired && !isNotStarted;

        var st = _ctk.filter.status || 'active';
        if (st === 'active' && !isActive) return false;
        if (st === 'paused' && (p.is_active || isExpired)) return false;
        if (st === 'expired' && !isExpired) return false;

        var filterYear = _ctk.filter.year || 'all';
        var filterPeriod = _ctk.filter.period || 'all';

        if (filterYear !== 'all' || filterPeriod !== 'all') {
            if (!p.valid_from) return false;
            var dt = new Date(p.valid_from);
            if (isNaN(dt.getTime())) return false;
            var pYear = String(dt.getFullYear());
            var pMonth = dt.getMonth() + 1;

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

        if (_ctk.filter.type !== 'all' && p.program_type !== _ctk.filter.type) return false;
        if (_ctk.filter.field !== 'all' && p.field_name !== _ctk.filter.field) return false;
        if (_ctk.filter.search) {
            var q = _ctk.filter.search.toLowerCase();
            var t = (p.title || '').toLowerCase();
            var ct = (p.content || '').toLowerCase();
            if (t.indexOf(q) === -1 && ct.indexOf(q) === -1) return false;
        }

        return true;
    });

    if (filteredPrograms.length === 0) {
        html += '<div style="background:#ffffff;border-radius:20px;padding:60px 20px;text-align:center;border:2px dashed #cbd5e1;box-shadow:0 8px 20px rgba(15,23,42,0.05)">';
        html += '<div style="font-size:52px;margin-bottom:12px">🎁</div>';
        html += '<div style="font-size:17px;font-weight:800;color:#192951">Chưa có chương trình & quà tặng nào</div>';
        html += '<div style="font-size:13.5px;color:#64748b;margin-top:6px;font-weight:500">Thử thay đổi bộ lọc hoặc bấm nút <strong>"➕ Tạo Chương Trình Mới"</strong> ở góc trên</div>';
        html += '</div>';
    } else {
        html += '<div class="ctk-grid">';
        filteredPrograms.forEach(function(p) {
            var isNotStarted = p.valid_from && p.valid_from.split('T')[0] > now;
            var isExpired = p.valid_to && p.valid_to.split('T')[0] < now;
            var isActive = p.is_active && !isExpired && !isNotStarted;

            html += '<div class="ctk-card" onclick="window._ctkViewDetail(' + p.id + ')" style="cursor:pointer">';
            
            // Header
            html += '<div class="ctk-card-head">';
            html += '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">';
            
            if (p.program_type === 'khach_hang') {
                html += '<span class="ctk-badge ctk-badge-kh">Khách Hàng</span>';
            } else if (p.program_type === 'ctv') {
                html += '<span class="ctk-badge ctk-badge-ctv">CTV</span>';
            } else if (p.program_type === 'affiliate') {
                html += '<span class="ctk-badge ctk-badge-aff">Affiliate</span>';
            }

            if (p.theme_color === 'red') {
                html += '<span class="ctk-badge" style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;font-weight:800">🔴 Tông Đỏ Đô</span>';
            } else {
                html += '<span class="ctk-badge" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;font-weight:800">🟡 Tông Vàng</span>';
            }

            if (p.field_name) {
                html += '<span class="ctk-badge" style="' + _ctkGetFieldBadgeStyle(p.field_name) + '">🏷️ ' + _ctkEsc(p.field_name) + '</span>';
            }
            html += '</div>';

            // Status Badge
            if (isExpired) {
                html += '<span class="ctk-badge ctk-badge-status-expired">❌ Hết hạn</span>';
            } else if (isNotStarted) {
                html += '<span class="ctk-badge ctk-badge-status-expired">⏳ Sắp diễn ra</span>';
            } else if (p.is_active) {
                html += '<span class="ctk-badge ctk-badge-status-on">✅ Đang áp dụng</span>';
            } else {
                html += '<span class="ctk-badge ctk-badge-status-off">⏸️ Đã dừng</span>';
            }
            html += '</div>';

            // Body
            html += '<div class="ctk-card-body">';
            html += '<h3 style="margin:0;font-size:15.5px;font-weight:800;color:#192951;line-height:1.4">' + _ctkEsc(p.title) + '</h3>';
            
            html += '<div style="font-size:12px;color:#64748b;display:flex;align-items:center;gap:6px;font-weight:700">';
            if (p.valid_type === 'auto_days' && p.valid_days) {
                html += '<span>📅 Áp dụng ' + p.valid_days + ' ngày (tính từ thời điểm tải ảnh)</span>';
            } else {
                html += '<span>📅 ' + _ctkEsc(_ctkFormatValidityText(p)) + '</span>';
            }
            html += '</div>';

            // Clean text preview
            if (p.content) {
                var cleanText = _ctkStripTags(p.content);
                var snippet = cleanText.length > 130 ? cleanText.substring(0, 130) + '...' : cleanText;
                html += '<div style="font-size:13px;color:#475569;line-height:1.5;margin-top:4px">' + _ctkEsc(snippet) + '</div>';
            }

            if (p.image_url) {
                html += '<div style="margin-top:8px;text-align:center">';
                html += '<img src="' + _ctkEsc(p.image_url) + '" style="max-height:140px;border-radius:12px;object-fit:cover;border:1px solid #cbd5e1;max-width:100%" />';
                html += '</div>';
            }

            html += '<div style="margin-top:auto;padding-top:10px;font-size:11.5px;color:#64748b;display:flex;justify-content:space-between;font-weight:600">';
            html += '<span>✍️ ' + _ctkEsc(p.creator_name || 'Hệ thống') + '</span>';
            if (p.created_at) {
                html += '<span>• ' + _ctkFormatDate(p.created_at) + '</span>';
            }
            html += '</div>';

            html += '</div>'; // End body

            // Footer actions
            html += '<div class="ctk-card-foot" onclick="event.stopPropagation()">';
            
            html += '<button class="ctk-btn-action ctk-btn-img" onclick="event.stopPropagation();window._ctkExportImage(' + p.id + ')">🖼️ Ảnh</button>';
            if (isEdit) {
                html += '<button class="ctk-btn-action ctk-btn-pause"' + (p.is_active ? '' : ' style="background:#dcfce7;color:#15803d"') + ' onclick="event.stopPropagation();window._ctkToggleActive(' + p.id + ')">' + (p.is_active ? '⏸️ Dừng' : '▶️ Tiếp Tục') + '</button>';
                html += '<button class="ctk-btn-action ctk-btn-edit" onclick="event.stopPropagation();window._ctkOpenModal(' + p.id + ')">✏️ Sửa</button>';
                html += '<button class="ctk-btn-action ctk-btn-del" onclick="event.stopPropagation();window._ctkDeleteProgram(' + p.id + ')">🗑️</button>';
            }

            html += '</div>'; // End foot
            html += '</div>'; // End card
        });
        html += '</div>';
    }

    html += '</div>';
    c.innerHTML = html;
}

// Global Filter Handlers
window._ctkSetFilter = function(key, val) {
    _ctk.filter[key] = val;
    _ctkRender();
};

var _ctkSearchTimeout = null;
window._ctkSearchDebounce = function(val) {
    clearTimeout(_ctkSearchTimeout);
    _ctkSearchTimeout = setTimeout(function() {
        _ctk.filter.search = val;
        _ctkRender();
    }, 250);
};

// Date min sync helper
window._ctkSyncDateMin = function() {
    var fromEl = document.getElementById('ctk-f-from');
    var toEl = document.getElementById('ctk-f-to');
    var today = _ctkGetVnToday();
    if (fromEl) {
        if (!fromEl.min) fromEl.min = today;
    }
    if (fromEl && toEl) {
        var minTo = fromEl.value ? fromEl.value : (fromEl.min || today);
        toEl.min = minTo;
        if (toEl.value && toEl.value < minTo) {
            toEl.value = minTo;
        }
    }
};

// Close Modal Helpers
window._ctkCloseModal = function() {
    var el = document.getElementById('ctk-modal-overlay');
    if (el) el.remove();
};

window._ctkCloseFieldModal = function() {
    var el = document.getElementById('ctk_field_modal_overlay');
    if (el) el.remove();
};

// Clean orphan lines & strip selection rác mà KHÔNG tác động vào số tiền như 1.000.000đ hay 2.000.000đ!
function _ctkCleanOrphanNumberLines(htmlStr) {
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

// Image Helpers
window._ctkHandleImageSelect = function(input) {
    if (!input.files || !input.files[0]) return;
    var file = input.files[0];
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

            document.getElementById('ctk-f-image-url').value = compressedDataUrl;
            var prevImg = document.getElementById('ctk-image-preview');
            if (prevImg) prevImg.src = compressedDataUrl;
            var prevCont = document.getElementById('ctk-image-preview-container');
            if (prevCont) prevCont.style.display = 'inline-flex';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

window._ctkRemoveImage = function() {
    var urlEl = document.getElementById('ctk-f-image-url');
    if (urlEl) urlEl.value = '';
    var prevCont = document.getElementById('ctk-image-preview-container');
    if (prevCont) prevCont.style.display = 'none';
    var fileInput = document.getElementById('ctk-f-image-file');
    if (fileInput) fileInput.value = '';
};

// Rich Text Editor Helpers
var _ctkSavedRange = null;
window._ctkSaveEditorSelection = function() {
    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
        _ctkSavedRange = sel.getRangeAt(0).cloneRange();
    }
};
function _ctkRestoreEditorSelection() {
    var editor = document.getElementById('ctk-f-content-editor');
    if (!editor || !_ctkSavedRange) return false;
    editor.focus();
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(_ctkSavedRange);
    return !sel.isCollapsed;
}

window._ctkRteExec = function(cmd, value) {
    var editor = document.getElementById('ctk-f-content-editor');
    if (!editor) return;
    _ctkRestoreEditorSelection();
    document.execCommand(cmd, false, value || null);
    _ctkSaveEditorSelection();
};

window._ctkRteChangeFontSize = function(delta) {
    var valEl = document.getElementById('ctk-rte-font-size-val');
    if (!valEl) return;
    var currentSize = parseInt(valEl.value, 10) || 13;
    var newSize = Math.max(8, Math.min(72, currentSize + delta));
    valEl.value = newSize;
    window._ctkRteSetFontSize(newSize);
};

window._ctkRteSetFontSize = function(sizePx) {
    var editor = document.getElementById('ctk-f-content-editor');
    if (!editor) return;
    var px = parseInt(sizePx, 10) || 13;

    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        _ctkRestoreEditorSelection();
        document.execCommand('fontSize', false, '7');
        var fontEls = editor.querySelectorAll('font[size="7"]');
        fontEls.forEach(function(el) {
            el.removeAttribute('size');
            el.style.fontSize = px + 'px';
        });
        _ctkSaveEditorSelection();
    } else {
        editor.style.fontSize = px + 'px';
    }
};

window._ctkSyncFontSizeFromContent = function() {
    var editor = document.getElementById('ctk-f-content-editor');
    var valEl = document.getElementById('ctk-rte-font-size-val');
    if (!editor || !valEl) return;

    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
        var node = sel.anchorNode;
        if (node) {
            if (node.nodeType === 3) node = node.parentNode;
            if (editor.contains(node)) {
                var compSize = window.getComputedStyle(node).fontSize;
                if (compSize) {
                    var parsed = parseInt(compSize, 10);
                    if (parsed) valEl.value = parsed;
                }
            }
        }
    }
};

// Dynamic Auto Format Content HTML với Cỡ Chữ Vừa Vặn 13px & Giãn Dòng Chiều Dọc Thanh Thoát
function _ctkAutoFormat(text) {
    if (!text) return '';
    var cleaned = text.replace(/\s*class="isSelectedEnd"/gi, '').replace(/\s*class="isSelected"/gi, '');
    
    if (/<[a-z][\s\S]*>/i.test(cleaned)) {
        return _ctkFixMoneySpacingInHTML(cleaned);
    }

    var lines = cleaned.split('\n');
    var result = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) { result.push('<div style="height:8px"></div>'); continue; }
        var escaped = _ctkEsc(line);

        if (line.length >= 3 && line === line.toUpperCase() && /[A-ZÀ-Ỹ]/.test(line)) {
            result.push('<div style="font-size:14px;font-weight:900;color:#192951;text-transform:uppercase;margin-top:18px;margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid #FAD14C;display:inline-block;letter-spacing:0.3px">' + escaped + '</div>');
            continue;
        }

        result.push('<div style="font-size:13px;color:#334155;line-height:1.65;margin-bottom:8px">' + _ctkHighlightAmounts(escaped) + '</div>');
    }
    return result.join('');
}

function _ctkFixMoneySpacingInHTML(html) {
    if (!html) return '';
    return html.replace(/(\d+)\.\s+(\d{3})/g, '$1.$2');
}

function _ctkHighlightAmounts(text) {
    text = text.replace(/(\d+)\.\s+(\d{3})/g, '$1.$2');
    text = text.replace(/(\d[\d.,]*\s*(?:đ|VND|VNĐ|vnđ|k|K|triệu|tr)\b)/gi, '<strong style="color:#192951;font-weight:800">$1</strong>');
    text = text.replace(/(\d+%)/g, '<strong style="color:#192951;font-weight:800">$1</strong>');
    text = text.replace(/(Free ship[^,.)]*|Miễn [Pp]hí [Vv]ận [Cc]huyển)/gi, '<span style="color:#b45309;font-weight:700;font-style:italic">$1</span>');
    text = text.replace(/(Hỗ trợ(?:\s+tối đa)?)/gi, '<strong style="color:#192951">$1</strong>');
    return text;
}

// Build Preview HTML — Thiết kế Dáng Poster Dọc 540px Cân Đối & Cao Rỡ Sang Trọng
function _ctkBuildPreviewHTML(p, customCustomerName) {
    var logoUrl = '/images/logo.png';
    var isRed = p && p.theme_color === 'red';

    // Theme Variables
    var outerBorder = isRed ? '3.5px solid #800a0c' : '3.5px solid #FAD14C';
    var headerBg = isRed ? 'linear-gradient(135deg, #78080a 0%, #4a0204 100%)' : 'linear-gradient(135deg, #fffdfa 0%, #fef8ec 100%)';
    var brandTitleColor = isRed ? '#ffffff' : '#192951';
    var taglineColor = isRed ? '#fde047' : '#475569';
    var dividerBg = isRed ? 'linear-gradient(90deg, #4a0204 0%, #c49a28 25%, #FAD14C 50%, #c49a28 75%, #4a0204 100%)' : 'linear-gradient(90deg, #fef8ec 0%, #c49a28 25%, #FAD14C 50%, #c49a28 75%, #fef8ec 100%)';
    var titleTitleColor = isRed ? '#ffffff' : '#192951';
    var underlineColor = isRed ? '#FAD14C' : '#192951';

    var pillBg = isRed ? 'rgba(0,0,0,0.35)' : '#fef3c7';
    var pillBorder = isRed ? '1.5px solid #FAD14C' : '1.5px solid #fde68a';
    var pillTextColor = isRed ? '#fde047' : '#92400e';

    var footerBg = isRed ? 'linear-gradient(135deg, #78080a 0%, #4a0204 100%)' : 'linear-gradient(135deg, #fffdfa 0%, #fef8ec 100%)';
    var footerTitleColor = isRed ? '#ffffff' : '#192951';
    var footerSubtextColor = isRed ? '#fde047' : '#64748b';
    var footerDividerBorder = isRed ? '1px solid rgba(250,209,76,0.3)' : '1px solid rgba(234,179,8,0.25)';

    var html = '<div id="ctk-export-area" style="background:#fff;padding:0;font-family:\'Plus Jakarta Sans\',\'Google Sans\',sans-serif;width:100%;box-sizing:border-box;border:' + outerBorder + ';border-radius:4px;box-shadow:0 10px 30px rgba(0,0,0,0.08)">';

    // Header
    html += '<div style="background:' + headerBg + ';padding:32px 24px 22px;text-align:center;border-radius:0">';
    html += '<div style="display:inline-flex;align-items:center;gap:14px;justify-content:center">';
    html += '<img src="' + logoUrl + '" style="width:62px;height:62px;object-fit:contain" />';
    html += '<div style="text-align:left">';
    html += '<div style="font-size:21px;font-weight:900;color:' + brandTitleColor + ';letter-spacing:2px;line-height:1.2">ĐỒNG PHỤC HV</div>';
    html += '<div style="font-size:10px;color:' + taglineColor + ';font-weight:700;font-style:italic;letter-spacing:0.5px">Tận tâm dựng xây giá trị</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    // Đường viền mạ vàng
    html += '<div style="height:1.5px;background:' + dividerBg + '"></div>';

    // Title bar
    var rawTitle = p.title || '';
    var escapedTitle = _ctkEsc(rawTitle);
    var custUnderline = customCustomerName ? ('<u style="text-decoration:underline;text-underline-offset:4px;font-weight:900;color:' + underlineColor + '">' + _ctkEsc(customCustomerName) + '</u>') : ('<u style="text-decoration:underline;text-underline-offset:4px;font-weight:900;color:' + underlineColor + '">Khách Hàng</u>');
    escapedTitle = escapedTitle.replace(/\(khach_hang\)/g, custUnderline);

    var titleLines = escapedTitle.split(/\r?\n/).filter(function(l){ return l.trim().length > 0; });
    if (titleLines.length === 0) titleLines = [escapedTitle];

    html += '<div style="background:' + headerBg + ';padding:18px 24px 14px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px">';
    titleLines.slice(0, 2).forEach(function(lineStr) {
        html += '<div style="font-size:18.5px;font-weight:900;color:' + titleTitleColor + ';line-height:1.4;letter-spacing:0.4px;text-align:center;width:100%">' + lineStr + '</div>';
    });
    html += '</div>';

    // Validity date
    var validityText = _ctkFormatValidityText(p);
    html += '<div style="background:' + headerBg + ';padding:0 24px 18px;text-align:center">';
    html += '<div style="display:inline-block;padding:6px 20px;border-radius:20px;background:' + pillBg + ';border:' + pillBorder + ';box-shadow:0 2px 6px rgba(0,0,0,0.12);text-align:center">';
    html += '<span style="font-size:13px;color:' + pillTextColor + ';font-weight:800;letter-spacing:0.2px;display:inline;line-height:1.4">';
    html += _ctkEsc(validityText);
    html += '</span>';
    html += '</div>';
    html += '</div>';

    // Đường viền mạ vàng
    html += '<div style="height:2px;background:' + dividerBg + '"></div>';

    // Body
    html += '<div style="padding:30px 28px;border-left:2px solid #e2e8f0;border-right:2px solid #e2e8f0;background:#fff">';

    // Content
    if (p.content) {
        var formattedContent = _ctkAutoFormat(p.content);
        var custBoldColor = isRed ? '#78080a' : '#192951';
        var custBold = customCustomerName ? ('<strong style="font-weight:900;color:' + custBoldColor + '">' + _ctkEsc(customCustomerName) + '</strong>') : ('<strong style="font-weight:900;color:' + custBoldColor + '">Khách Hàng</strong>');
        formattedContent = formattedContent.replace(/\(khach_hang\)/g, custBold);
        html += '<div style="margin-bottom:18px;font-size:13px;line-height:1.65;color:#334155">' + formattedContent + '</div>';
    }

    // Tiers
    if (p.tiers && p.tiers.length > 0) {
        var tierBorderLeft = isRed ? '4px solid #78080a' : '4px solid #FAD14C';
        var tierTitleColor = isRed ? '#78080a' : '#192951';
        var tierBottomBorder = isRed ? '2px solid #78080a' : '2px solid #FAD14C';
        var tierBg = isRed ? '#fffcfc' : '#fefdf8';

        p.tiers.forEach(function(t) {
            html += '<div style="border:1.5px solid #e2e8f0;border-radius:12px;padding:16px 18px;margin-bottom:16px;border-left:' + tierBorderLeft + ';background:' + tierBg + '">';
            var custBoldColor = isRed ? '#78080a' : '#192951';
            var custBoldTier = customCustomerName ? ('<strong style="font-weight:900;color:' + custBoldColor + '">' + _ctkEsc(customCustomerName) + '</strong>') : ('<strong style="font-weight:900;color:' + custBoldColor + '">Khách Hàng</strong>');
            if (t.condition_label) {
                var cLabel = _ctkEsc(t.condition_label).replace(/\(khach_hang\)/g, custBoldTier);
                html += '<div style="font-size:13.5px;font-weight:900;color:' + tierTitleColor + ';text-transform:uppercase;margin-bottom:8px;border-bottom:' + tierBottomBorder + ';padding-bottom:4px;display:inline-block">' + cLabel + '</div>';
            }
            if (t.benefit_text) {
                var bText = _ctkAutoFormat(t.benefit_text).replace(/\(khach_hang\)/g, custBoldTier);
                html += '<div style="line-height:1.65;font-size:13px">' + bText + '</div>';
            }
            html += '</div>';
        });
    }

    // Subtitle
    var typeLabel = p.program_type === 'ctv' ? 'CTV' : (p.program_type === 'affiliate' ? 'Affiliate' : 'Khách Hàng');
    html += '<div style="margin-top:16px;padding-top:10px;border-top:1px dashed #f1f5f9;font-size:11px;color:#94a3b8;font-weight:500;display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap"><span>Áp dụng cho <b style="color:#64748b;font-weight:700">' + typeLabel + '</b></span>';
    if (p.field_name) {
        html += ' • <span>Lĩnh vực:</span> <span class="ctk-badge" style="font-size:10px;padding:2px 7px;font-weight:700;' + _ctkGetFieldBadgeStyle(p.field_name) + '">🏷️ ' + _ctkEsc(p.field_name) + '</span>';
    }
    html += '</div>';

    html += '</div>';

    // Đường viền phân cách Footer
    html += '<div style="height:2px;background:' + dividerBg + '"></div>';

    // Footer
    html += '<div style="background:' + footerBg + ';padding:0;text-align:center">';
    html += '<div style="padding:24px 24px 16px">';
    html += '<div style="font-size:15px;color:' + footerTitleColor + ';font-weight:900;margin-bottom:6px;letter-spacing:0.8px">HV UNIFORM cảm ơn quý khách đã đặt hàng</div>';
    html += '<div style="font-size:11.5px;color:' + footerSubtextColor + ';font-weight:700;font-style:italic">Chúc quý khách có một trải nghiệm tuyệt vời mua hàng tại HV</div>';
    html += '</div>';
    html += '<div style="margin:0 30px 16px;border-top:' + footerDividerBorder + '"></div>';
    html += '<div style="padding:0 24px 24px;display:flex;justify-content:center;align-items:center;gap:10px;flex-wrap:wrap">';
    html += '<div style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;background:' + pillBg + ';border:' + pillBorder + ';color:' + pillTextColor + ';font-size:11.5px;font-weight:800;box-shadow:0 2px 6px rgba(0,0,0,0.12)">📞 09 2333 2333</div>';
    html += '<div style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;background:' + pillBg + ';border:' + pillBorder + ';color:' + pillTextColor + ';font-size:11.5px;font-weight:800;box-shadow:0 2px 6px rgba(0,0,0,0.12)">🌐 www.dongphuchv.vn</div>';
    html += '<div style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;background:' + pillBg + ';border:' + pillBorder + ';color:' + pillTextColor + ';font-size:11.5px;font-weight:800;box-shadow:0 2px 6px rgba(0,0,0,0.12)">📍 LK02–21 Khu Đô Thị Đô Nghĩa, Hà Đông, Hà Nội</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    return html;
}

// Customer Name Prompt Modal for Exporting Image
window._ctkPromptCustomerNameAndExport = function(p) {
    var existingModal = document.getElementById('ctk-cust-prompt-overlay');
    if (existingModal) existingModal.remove();

    var ov = document.createElement('div');
    ov.className = 'ctk-modal-overlay';
    ov.id = 'ctk-cust-prompt-overlay';
    ov.style.zIndex = '100000';

    var html = '<div class="ctk-modal" style="max-width:440px">';
    html += '<div class="ctk-modal-head">';
    html += '<span style="font-size:17px;font-weight:900">👤 Nhập Thông Tin Khách Hàng Để Tải Ảnh</span>';
    html += '<button onclick="document.getElementById(\'ctk-cust-prompt-overlay\').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer">✕</button>';
    html += '</div>';
    html += '<div class="ctk-modal-body" style="padding:20px">';
    
    html += '<div style="font-size:13px;color:#475569;margin-bottom:14px;font-weight:600;line-height:1.5">';
    html += 'Chương trình này yêu cầu cá nhân hóa tên khách hàng trên hình ảnh. Vui lòng chọn danh xưng và nhập tên khách hàng:';
    html += '</div>';

    // 1. Danh xưng (Bắt buộc)
    html += '<div class="ctk-form-group" style="margin-bottom:14px">';
    html += '<label class="ctk-form-label" style="font-weight:800;color:#192951">📌 Danh xưng *</label>';
    html += '<div style="display:flex;gap:20px;margin-top:6px">';
    html += '<label style="display:flex;align-items:center;gap:6px;font-weight:800;cursor:pointer;color:#192951;font-size:14px">';
    html += '<input type="radio" name="ctk-cust-prefix" value="Anh" />';
    html += '<span>Anh</span>';
    html += '</label>';
    html += '<label style="display:flex;align-items:center;gap:6px;font-weight:800;cursor:pointer;color:#192951;font-size:14px">';
    html += '<input type="radio" name="ctk-cust-prefix" value="Chị" />';
    html += '<span>Chị</span>';
    html += '</label>';
    html += '</div>';
    html += '</div>';

    // 2. Tên khách hàng (Bắt buộc)
    html += '<div class="ctk-form-group" style="margin-bottom:18px">';
    html += '<label class="ctk-form-label" style="font-weight:800;color:#192951">📝 Tên Khách Hàng *</label>';
    html += '<input id="ctk-cust-name-input" type="text" class="ctk-form-input" placeholder="Ví dụ: Việt Trinh" style="font-size:14px;font-weight:700" />';
    html += '<div style="font-size:11px;color:#64748b;margin-top:4px">Hệ thống sẽ tự động viết hoa chữ cái đầu (Ví dụ: việt trinh &rarr; Việt Trinh).</div>';
    html += '</div>';

    // Submit
    html += '<div style="display:flex;gap:10px;justify-content:flex-end">';
    html += '<button type="button" onclick="document.getElementById(\'ctk-cust-prompt-overlay\').remove()" style="padding:9px 18px;background:#f1f5f9;color:#475569;border:1.5px solid #cbd5e1;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer">Hủy</button>';
    html += '<button type="button" id="ctk-btn-confirm-cust-export" style="padding:9px 20px;background:linear-gradient(135deg,#FAD14C,#f5c030);color:#192951;border:none;border-radius:10px;font-size:13.5px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(250,209,76,0.35)">🖼️ Xác Nhận Tải Ảnh</button>';
    html += '</div>';

    html += '</div></div>';
    ov.innerHTML = html;
    document.body.appendChild(ov);

    setTimeout(function() {
        var inputEl = document.getElementById('ctk-cust-name-input');
        if (inputEl) inputEl.focus();
    }, 100);

    document.getElementById('ctk-btn-confirm-cust-export').onclick = function() {
        var prefixEls = document.getElementsByName('ctk-cust-prefix');
        var prefix = '';
        for (var i = 0; i < prefixEls.length; i++) {
            if (prefixEls[i].checked) {
                prefix = prefixEls[i].value;
                break;
            }
        }
        if (!prefix) {
            alert('⚠️ Vui lòng chọn danh xưng (Anh hoặc Chị)!');
            return;
        }

        var inputEl = document.getElementById('ctk-cust-name-input');
        var rawName = inputEl ? inputEl.value.trim() : '';
        if (!rawName) {
            alert('⚠️ Vui lòng nhập tên khách hàng!');
            if (inputEl) inputEl.focus();
            return;
        }

        var formattedName = _ctkCapitalizeVnName(rawName);
        var fullCustomerText = prefix + ' ' + formattedName;

        ov.remove();
        _ctkDoExport(p, fullCustomerText);
    };
};

// Export Image Functionality (Khung rộng 540px Poster Dọc)
window._ctkExportImage = function(id) {
    fetch('/api/customer-programs/' + id, {
        headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') }
    }).then(function(r){ return r.json(); }).then(function(res) {
        if (!res.success || !res.program) {
            alert('❌ Không tìm thấy thông tin chương trình');
            return;
        }
        var p = res.program;
        var now = _ctkGetVnToday();
        var isNotStarted = p.valid_type !== 'auto_days' && p.valid_type !== 'days_from_sent' && p.valid_from && p.valid_from.split('T')[0] > now;
        var isExpired = p.valid_type !== 'auto_days' && p.valid_type !== 'days_from_sent' && p.valid_to && p.valid_to.split('T')[0] < now;
        if (!p.is_active || isExpired || isNotStarted) {
            var reason = isExpired ? 'đã hết hạn' : (!p.is_active ? 'đang tạm dừng' : 'chưa đến ngày áp dụng');
            return alert('⚠️ Chương trình này ' + reason + ', không thể tải ảnh!');
        }

        var hasCustomerNameTag = p.include_customer_name === true || (p.title && p.title.indexOf('(khach_hang)') !== -1) || (p.content && p.content.indexOf('(khach_hang)') !== -1);
        if (hasCustomerNameTag) {
            _ctkPromptCustomerNameAndExport(p);
        } else {
            _ctkDoExport(p);
        }
    });
};

function _ctkDownloadDirectImage(imageUrl, title) {
    var cleanTitle = (title || 'HV').replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, '_').substring(0, 50);
    var filename = 'Chuong_Trinh_' + cleanTitle;

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

function _ctkDoExport(program, customCustomerName) {
    var hasCustTag = program.include_customer_name === true || (program.title && program.title.indexOf('(khach_hang)') !== -1) || (program.content && program.content.indexOf('(khach_hang)') !== -1);

    if (program && program.image_url && program.image_url.trim() && program.valid_type !== 'auto_days' && program.valid_type !== 'days_from_sent' && !hasCustTag) {
        _ctkDownloadDirectImage(program.image_url, program.title);
        return;
    }

    var existingExportArea = document.getElementById('ctk-export-area');
    if (existingExportArea && document.getElementById('ctk-modal-overlay') && !customCustomerName) {
        _ctkRunHtml2Canvas(existingExportArea, program);
        return;
    }

    var wrapper = document.createElement('div');
    wrapper.id = 'ctk-temp-export-wrapper';
    wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;width:540px;z-index:-9999;opacity:1;pointer-events:none;background:#ffffff';
    wrapper.innerHTML = _ctkBuildPreviewHTML(program, customCustomerName);
    document.body.appendChild(wrapper);

    _ctkRunHtml2Canvas(wrapper, program, function() {
        if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
    });
}

function _ctkRunHtml2Canvas(elementTarget, program, callback) {
    var fn = function() {
        if (typeof window.html2canvas !== 'function') {
            alert('❌ Thư viện tải ảnh chưa sẵn sàng, vui lòng thử lại sau 2 giây.');
            if (callback) callback();
            return;
        }

        window.html2canvas(elementTarget, {
            scale: 2.5,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            onclone: function(clonedDoc) {
                var el = clonedDoc.getElementById('ctk-temp-export-wrapper');
                if (el) {
                    el.style.position = 'relative';
                    el.style.left = '0';
                    el.style.top = '0';
                    el.style.opacity = '1';
                    el.style.zIndex = '1';
                }
            }
        }).then(function(canvas) {
            var cleanTitle = (program.title || 'HV').replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, '_').substring(0, 50);
            var filename = 'Chuong_Trinh_' + cleanTitle + '.png';

            var link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL('image/png', 1.0);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            if (callback) callback();
        }).catch(function(err) {
            console.error('[chuongtrinhkhhv html2canvas]', err);
            alert('❌ Có lỗi khi tạo file ảnh: ' + err.message);
            if (callback) callback();
        });
    };

    if (typeof window.html2canvas === 'function') {
        fn();
    } else {
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        s.onload = fn;
        document.head.appendChild(s);
    }
}

// Toggle Active
window._ctkToggleActive = function(id) {
    fetch('/api/customer-programs/' + id + '/toggle-active', {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') }
    }).then(function(r){ return r.json(); }).then(function(res) {
        if (res.success) {
            var p = _ctk.programs.find(function(x){ return x.id === id; });
            if (p) p.is_active = res.is_active;
            _ctkRender();
        } else {
            alert('❌ ' + (res.error || 'Không thể đổi trạng thái'));
        }
    });
};

// Delete Program
window._ctkDeleteProgram = function(id) {
    if (!confirm('Anh có chắc chắn muốn xóa chương trình ưu đãi này không?')) return;
    fetch('/api/customer-programs/' + id, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') }
    }).then(function(r){ return r.json(); }).then(function(res) {
        if (res.success) {
            _ctk.programs = _ctk.programs.filter(function(x){ return x.id !== id; });
            _ctkRender();
        } else {
            alert('❌ ' + (res.error || 'Lỗi khi xóa'));
        }
    });
};

// View Detail Modal (Khung max-width 560px Poster Dọc)
window._ctkViewDetail = function(id) {
    fetch('/api/customer-programs/' + id, {
        headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') }
    }).then(function(r){ return r.json(); }).then(function(res) {
        if (!res.success || !res.program) {
            alert('❌ Không tìm thấy thông tin chương trình');
            return;
        }
        var p = res.program;
        var now = _ctkGetVnToday();
        var isNotStarted = p.valid_from && p.valid_from.split('T')[0] > now;
        var isExpired = p.valid_to && p.valid_to.split('T')[0] < now;
        if (!p.is_active || isExpired || isNotStarted) {
            var reason = isExpired ? 'đã hết hạn' : (!p.is_active ? 'đang tạm dừng' : 'chưa đến ngày áp dụng');
            return alert('⚠️ Chương trình này ' + reason + ', không thể xem!');
        }
        
        window._ctkCloseModal();
        
        var ov = document.createElement('div');
        ov.className = 'ctk-modal-overlay';
        ov.id = 'ctk-modal-overlay';
        ov.onclick = function(e) { if (e.target === ov) ov.remove(); };

        var html = '<div class="ctk-modal" style="max-width:560px">';
        html += '<div class="ctk-modal-head">';
        html += '<span style="font-size:17px;font-weight:900">👁 Xem Chi Tiết Chương Trình & Quà Tặng</span>';
        html += '<div style="display:flex;gap:8px">';
        html += '<button onclick="window._ctkExportImage(' + p.id + ')" style="background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);color:white;padding:6px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">🖼️ Tải Ảnh</button>';
        html += '<button onclick="window._ctkCloseModal()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer">✕</button>';
        html += '</div>';
        html += '</div>';
        html += '<div class="ctk-modal-body" style="padding:0">';
        html += _ctkBuildPreviewHTML(p);
        html += '</div>';
        html += '</div>';

        ov.innerHTML = html;
        document.body.appendChild(ov);
    });
};

// Dynamic Helpers for Validity Conditions
window._ctkSwitchValidType = function(type) {
    var b1 = document.getElementById('ctk-valid-box-date_range');
    var b2 = document.getElementById('ctk-valid-box-days_from_sent');
    var b3 = document.getElementById('ctk-valid-box-auto_days');

    if (b1) b1.style.display = (type === 'date_range') ? 'flex' : 'none';
    if (b2) b2.style.display = (type === 'days_from_sent') ? 'block' : 'none';
    if (b3) b3.style.display = (type === 'auto_days') ? 'block' : 'none';

    if (type === 'days_from_sent') window._ctkUpdateDaysPreview('days_from_sent');
    if (type === 'auto_days') window._ctkUpdateDaysPreview('auto_days');
};

window._ctkToggleCustNameBox = function(show) {
    var box = document.getElementById('ctk-cust-name-box');
    if (box) box.style.display = show ? 'block' : 'none';
};

function _ctkBuildAutoDaysPreviewText(daysVal) {
    var d = parseInt(daysVal, 10);
    if (!d || d <= 0) d = 5;
    var nowVn = new Date();
    try {
        nowVn = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    } catch(e){}
    var day1 = nowVn.getDate();
    var m1 = nowVn.getMonth() + 1;
    var y1 = nowVn.getFullYear();

    var endVn = new Date(nowVn);
    endVn.setDate(endVn.getDate() + d);
    var day2 = endVn.getDate();
    var m2 = endVn.getMonth() + 1;
    var y2 = endVn.getFullYear();

    return 'Mẫu hiển thị khi tải ảnh: Thời gian áp dụng từ ngày ' + day1 + '/' + m1 + '/' + y1 + ' - ' + day2 + '/' + m2 + '/' + y2;
}

window._ctkUpdateDaysPreview = function(type) {
    if (type === 'days_from_sent') {
        var input = document.getElementById('ctk-f-days-sent');
        var prev = document.getElementById('ctk-preview-days_from_sent');
        if (input && prev) {
            var val = parseInt(input.value, 10);
            var num = (val && val > 0) ? val : 30;
            prev.innerText = 'Mẫu hiển thị: Thời hạn ưu đãi: ' + num + ' ngày kể từ ngày gửi chương trình';
        }
    } else if (type === 'auto_days') {
        var inputA = document.getElementById('ctk-f-days-auto');
        var prevA = document.getElementById('ctk-preview-auto_days');
        if (inputA && prevA) {
            prevA.innerText = _ctkBuildAutoDaysPreviewText(inputA.value);
        }
    }
};

// Create / Edit Modal (Form Giống Hệt Ảnh 1 - Chính Sách Mới)
window._ctkOpenModal = function(id) {
    var p = id ? _ctk.programs.find(function(x){ return x.id === id; }) : null;
    _ctk.editingId = id || null;
    
    window._ctkCloseModal();

    var isEdit = !!_ctk.editingId;
    var vType = p && p.valid_type ? p.valid_type : 'date_range';
    var vDays = p && p.valid_days ? p.valid_days : '';

    var data = p ? {
        title: p.title || '',
        program_type: p.program_type || '',
        field_name: p.field_name || '',
        valid_type: vType,
        valid_days: vDays,
        valid_from: p.valid_from ? p.valid_from.split('T')[0] : '',
        valid_to: p.valid_to ? p.valid_to.split('T')[0] : '',
        content: _ctkCleanOrphanNumberLines(p.content || ''),
        image_url: p.image_url || '',
        is_active: p.is_active !== false
    } : {
        title: '',
        program_type: '',
        field_name: '',
        valid_type: 'date_range',
        valid_days: '',
        valid_from: '',
        valid_to: '',
        content: '',
        image_url: '',
        is_active: true
    };

    var ov = document.createElement('div');
    ov.className = 'ctk-modal-overlay';
    ov.id = 'ctk-modal-overlay';

    var html = '<div class="ctk-modal">';
    html += '<div class="ctk-modal-head">';
    html += '<span style="font-size:18px;font-weight:900">' + (isEdit ? '✏️ Sửa Chương Trình & Quà Tặng' : '➕ Tạo Chương Trình & Quà Tặng Mới') + '</span>';
    html += '<button onclick="window._ctkCloseModal()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer">✕</button>';
    html += '</div>';
    html += '<div class="ctk-modal-body">';

    // 1. Đối Tượng Áp Dụng *
    html += '<div class="ctk-form-group">';
    html += '<label class="ctk-form-label">📌 Đối Tượng Áp Dụng *</label>';
    html += '<select id="ctk-f-type" class="ctk-form-input">';
    html += '<option value="">-- Chọn đối tượng áp dụng --</option>';
    html += '<option value="khach_hang"' + (data.program_type === 'khach_hang' ? ' selected' : '') + '>👤 Khách Hàng</option>';
    html += '<option value="ctv"' + (data.program_type === 'ctv' ? ' selected' : '') + '>🤝 CTV</option>';
    html += '<option value="affiliate"' + (data.program_type === 'affiliate' ? ' selected' : '') + '>🔗 Affiliate</option>';
    html += '</select>';
    html += '</div>';

    // 2. Lĩnh Vực *
    html += '<div class="ctk-form-group">';
    html += '<label class="ctk-form-label">🏷️ Lĩnh Vực *</label>';
    html += '<select id="ctk-f-field" class="ctk-form-input">';
    html += '<option value="">-- Chọn lĩnh vực --</option>';
    _ctkSortFields(_ctk.fields).forEach(function(f) {
        var fn = f.name || f;
        html += '<option value="' + _ctkEsc(fn) + '"' + (data.field_name === fn ? ' selected' : '') + '>' + _ctkEsc(fn) + '</option>';
    });
    html += '</select>';
    if (_ctk.fields.length === 0) {
        html += '<div style="font-size:11px;color:#f59e0b;margin-top:4px;font-weight:600">⚠️ Chưa có lĩnh vực nào. Giám Đốc cần tạo lĩnh vực trước.</div>';
    }
    html += '</div>';

    // 3. Tên Chương Trình & Quà Tặng * (Tối đa 2 dòng)
    html += '<div class="ctk-form-group">';
    html += '<label class="ctk-form-label">📝 Tên Chương Trình & Quà Tặng * <span style="font-size:11px;color:#64748b;font-weight:600">(tối đa 2 dòng - dòng 2 tự động căn giữa khi xuất ảnh)</span></label>';
    html += '<textarea id="ctk-f-title" rows="2" class="ctk-form-input" style="min-height:58px;max-height:80px;resize:none;font-weight:700;font-size:13.5px;line-height:1.45" placeholder="VD: 🎁 Đồng Phục HV Trân Trọng Gửi Tặng (khach_hang)&#10;Chương Trình Ưu Đãi Đặc Biệt" onkeydown="window._ctkLimitTitleLines(event, this)" oninput="window._ctkCleanTitleLines(this)">' + _ctkEsc(data.title || '') + '</textarea>';
    html += '</div>';

    // 4. Thời Gian Áp Dụng (Radio choice - bắt buộc chọn 1 trong 3 điều kiện)
    html += '<div class="ctk-form-group" style="background:#f8fafc;padding:16px;border-radius:14px;border:1.5px solid #cbd5e1;margin-bottom:16px">';
    html += '<label class="ctk-form-label" style="font-size:13.5px;font-weight:800;color:#192951;margin-bottom:12px;display:block">📅 Thời Gian Áp Dụng <span style="font-size:11px;color:#dc2626;font-weight:700">(Bắt buộc chỉ chọn 1 trong 3 điều kiện)</span></label>';

    // Condition 1
    var vnToday = _ctkGetVnToday();
    var minFromDate = (isEdit && data.valid_from && data.valid_from < vnToday) ? data.valid_from : vnToday;

    html += '<div style="margin-bottom:10px;padding:10px 14px;background:#ffffff;border-radius:10px;border:1px solid #cbd5e1">';
    html += '<label style="display:flex;align-items:center;gap:8px;font-weight:700;cursor:pointer;color:#192951;font-size:13px">';
    html += '<input type="radio" name="ctk-valid-type-radio" value="date_range"' + (data.valid_type === 'date_range' ? ' checked' : '') + ' onchange="window._ctkSwitchValidType(\'date_range\')" />';
    html += '<span>1️⃣ Chọn khoảng ngày cụ thể (Áp Dụng Từ &rarr; Đến Ngày)</span>';
    html += '</label>';
    html += '<div id="ctk-valid-box-date_range" style="margin-top:10px;display:' + (data.valid_type === 'date_range' ? 'flex' : 'none') + ';gap:12px;flex-wrap:wrap">';
    html += '<div style="flex:1;min-width:180px">';
    html += '<label style="font-size:11px;font-weight:700;color:#475569;margin-bottom:4px;display:block">📅 Áp Dụng Từ</label>';
    html += '<input id="ctk-f-from" type="date" class="ctk-form-input" value="' + (data.valid_from || '') + '" min="' + minFromDate + '" onchange="window._ctkSyncDateMin()" />';
    html += '</div>';
    html += '<div style="flex:1;min-width:180px">';
    html += '<label style="font-size:11px;font-weight:700;color:#475569;margin-bottom:4px;display:block">📅 Đến Ngày <span style="font-size:10px;color:#64748b">(bỏ trống = mãi mãi)</span></label>';
    html += '<input id="ctk-f-to" type="date" class="ctk-form-input" value="' + (data.valid_to || '') + '" min="' + (data.valid_from || minFromDate) + '" onchange="window._ctkSyncDateMin()" />';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    // Condition 2
    html += '<div style="margin-bottom:10px;padding:10px 14px;background:#ffffff;border-radius:10px;border:1px solid #cbd5e1">';
    html += '<label style="display:flex;align-items:center;gap:8px;font-weight:700;cursor:pointer;color:#192951;font-size:13px">';
    html += '<input type="radio" name="ctk-valid-type-radio" value="days_from_sent"' + (data.valid_type === 'days_from_sent' ? ' checked' : '') + ' onchange="window._ctkSwitchValidType(\'days_from_sent\')" />';
    html += '<span>2️⃣ Số ngày áp dụng tính từ thời điểm gửi (Ví dụ: 30 ngày)</span>';
    html += '</label>';
    html += '<div id="ctk-valid-box-days_from_sent" style="margin-top:10px;display:' + (data.valid_type === 'days_from_sent' ? 'block' : 'none') + '">';
    html += '<div style="display:flex;align-items:center;gap:8px">';
    html += '<input id="ctk-f-days-sent" type="number" min="1" class="ctk-form-input" placeholder="Ví dụ: 30" value="' + (data.valid_type === 'days_from_sent' ? (data.valid_days || '') : '') + '" style="max-width:200px" oninput="window._ctkUpdateDaysPreview(\'days_from_sent\')" />';
    html += '<span style="font-size:13px;font-weight:700;color:#192951">ngày</span>';
    html += '</div>';
    html += '<div id="ctk-preview-days_from_sent" style="font-size:12px;color:#0284c7;margin-top:6px;font-weight:700">';
    html += 'Mẫu hiển thị: ' + (data.valid_type === 'days_from_sent' && data.valid_days ? ('Thời hạn ưu đãi: ' + data.valid_days + ' ngày kể từ ngày gửi chương trình') : 'Thời hạn ưu đãi: 15 ngày kể từ ngày gửi chương trình');
    html += '</div>';
    html += '</div>';
    html += '</div>';

    // Condition 3
    html += '<div style="padding:10px 14px;background:#ffffff;border-radius:10px;border:1px solid #cbd5e1">';
    html += '<label style="display:flex;align-items:center;gap:8px;font-weight:700;cursor:pointer;color:#192951;font-size:13px">';
    html += '<input type="radio" name="ctk-valid-type-radio" value="auto_days"' + (data.valid_type === 'auto_days' ? ' checked' : '') + ' onchange="window._ctkSwitchValidType(\'auto_days\')" />';
    html += '<span>3️⃣ Số ngày áp dụng (Tự động tính từ lúc tải ảnh)</span>';
    html += '</label>';
    html += '<div id="ctk-valid-box-auto_days" style="margin-top:10px;display:' + (data.valid_type === 'auto_days' ? 'block' : 'none') + '">';
    html += '<div style="display:flex;align-items:center;gap:8px">';
    html += '<input id="ctk-f-days-auto" type="number" min="1" class="ctk-form-input" placeholder="Ví dụ: 5" value="' + (data.valid_type === 'auto_days' ? (data.valid_days || '') : '') + '" style="max-width:200px" oninput="window._ctkUpdateDaysPreview(\'auto_days\')" />';
    html += '<span style="font-size:13px;font-weight:700;color:#192951">ngày</span>';
    html += '</div>';
    html += '<div id="ctk-preview-auto_days" style="font-size:12px;color:#059669;margin-top:6px;font-weight:700">';
    html += _ctkBuildAutoDaysPreviewText(data.valid_type === 'auto_days' ? data.valid_days : '');
    html += '</div>';
    html += '</div>';
    html += '</div>';

    html += '</div>';

    // 4b. Chèn Tên Khách Hàng ở nội dung? (Mặc định Không, tự động bật nếu chứa từ khóa (khach_hang))
    var isCustName = (data && (data.include_customer_name === true || (data.title && data.title.indexOf('(khach_hang)') !== -1) || (data.content && data.content.indexOf('(khach_hang)') !== -1)));
    html += '<div class="ctk-form-group" style="background:#f8fafc;padding:16px;border-radius:14px;border:1.5px solid #cbd5e1;margin-bottom:16px">';
    html += '<label class="ctk-form-label" style="font-size:13.5px;font-weight:800;color:#192951;margin-bottom:10px;display:block">👤 Chèn Tên Khách Hàng ở Nội Dung?</label>';
    html += '<div style="display:flex;gap:20px;align-items:center">';
    html += '<label style="display:flex;align-items:center;gap:6px;font-weight:700;cursor:pointer;color:#192951;font-size:13px">';
    html += '<input type="radio" name="ctk-inc-cust-name-radio" value="false"' + (!isCustName ? ' checked' : '') + ' onchange="window._ctkToggleCustNameBox(false)" />';
    html += '<span>🔴 Không (Mặc định)</span>';
    html += '</label>';
    html += '<label style="display:flex;align-items:center;gap:6px;font-weight:700;cursor:pointer;color:#192951;font-size:13px">';
    html += '<input type="radio" name="ctk-inc-cust-name-radio" value="true"' + (isCustName ? ' checked' : '') + ' onchange="window._ctkToggleCustNameBox(true)" />';
    html += '<span>🟢 Có</span>';
    html += '</label>';
    html += '</div>';

    html += '<div id="ctk-cust-name-box" style="margin-top:12px;padding:12px;background:#ffffff;border-radius:10px;border:1px solid #bae6fd;display:' + (isCustName ? 'block' : 'none') + '">';
    html += '<div style="font-size:12.5px;color:#0369a1;font-weight:700;margin-bottom:8px">💡 Từ khóa cá nhân hóa tên khách hàng:</div>';
    html += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">';
    html += '<code style="background:#e0f2fe;color:#0369a1;padding:6px 12px;border-radius:8px;font-weight:800;font-size:13.5px;border:1px solid #bae6fd">(khach_hang)</code>';
    html += '<button type="button" onclick="window._ctkCopyKeyword(\'(khach_hang)\')" style="padding:6px 14px;background:linear-gradient(135deg,#0284c7,#0369a1);color:#ffffff;border:none;border-radius:8px;font-weight:700;font-size:12.5px;cursor:pointer;box-shadow:0 2px 6px rgba(2,132,199,0.25)">📋 Copy (khach_hang)</button>';
    html += '</div>';
    html += '<div style="font-size:11.5px;color:#64748b;margin-top:8px">Dán từ khóa <strong>(khach_hang)</strong> vào bất kỳ đâu trong ô Tên Chương Trình hoặc Nội Dung (Ví dụ: <i>🎁 Đồng Phục HV Trân Trọng Gửi Tặng (khach_hang) Chương Trình Ưu Đãi Đặc Biệt...</i>). Khi nhân viên ấn Tải Ảnh, hệ thống sẽ mở bảng hỏi tên để thay thế tự động!</div>';
    html += '</div>';
    html += '</div>';

    // 4c. Tông Màu Poster * (Bắt buộc chọn 1 trong 2 màu)
    var activeTheme = (data && data.theme_color) ? data.theme_color : 'gold';
    html += '<div class="ctk-form-group" style="background:#f8fafc;padding:16px;border-radius:14px;border:1.5px solid #cbd5e1;margin-bottom:16px">';
    html += '<label class="ctk-form-label" style="font-size:13.5px;font-weight:800;color:#192951;margin-bottom:10px;display:block">🎨 Tông Màu Poster * <span style="font-size:11px;color:#dc2626;font-weight:700">(Bắt buộc chọn 1 trong 2 màu)</span></label>';
    html += '<div style="display:flex;gap:16px;flex-wrap:wrap">';
    html += '<label style="display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:10px;border:2px solid #FAD14C;background:#fffdfa;cursor:pointer;flex:1;min-width:180px">';
    html += '<input type="radio" name="ctk-theme-color-radio" value="gold"' + (activeTheme === 'gold' ? ' checked' : '') + ' />';
    html += '<span style="font-weight:800;color:#92400e;font-size:13.5px">🟡 Màu Vàng Hoàng Gia (Mặc định)</span>';
    html += '</label>';
    html += '<label style="display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:10px;border:2px solid #991b1b;background:#fef2f2;cursor:pointer;flex:1;min-width:180px">';
    html += '<input type="radio" name="ctk-theme-color-radio" value="red"' + (activeTheme === 'red' ? ' checked' : '') + ' />';
    html += '<span style="font-weight:800;color:#991b1b;font-size:13.5px">🔴 Màu Đỏ Đô Sang Trọng</span>';
    html += '</label>';
    html += '</div>';
    html += '</div>';

    // 5. Ảnh Chương Trình (Chế độ chọn ảnh từ máy tính)
    html += '<div class="ctk-form-group">';
    html += '<label class="ctk-form-label">🖼️ Ảnh Chương Trình & Quà Tặng <span style="font-size:11px;color:#64748b">(chọn ảnh từ máy tính - tự động tối ưu sắc nét)</span></label>';
    html += '<input type="hidden" id="ctk-f-image-url" value="' + _ctkEsc(data.image_url || '') + '" />';
    html += '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:6px">';
    html += '<label style="padding:9px 18px;background:#e8edf5;color:#192951;border:1.5px dashed #192951;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px">';
    html += '📁 Chọn ảnh từ máy tính';
    html += '<input type="file" id="ctk-f-image-file" accept="image/*" style="display:none" onchange="window._ctkHandleImageSelect(this)" />';
    html += '</label>';
    html += '<div id="ctk-image-preview-container" style="' + (data.image_url ? 'display:inline-flex;' : 'display:none;') + 'align-items:center;gap:8px">';
    html += '<img id="ctk-image-preview" src="' + _ctkEsc(data.image_url || '') + '" style="height:48px;max-width:120px;border-radius:8px;object-fit:cover;border:1px solid #cbd5e1;box-shadow:0 2px 6px rgba(0,0,0,0.1)" />';
    html += '<button type="button" onclick="window._ctkRemoveImage()" style="background:#fee2e2;color:#991b1b;border:none;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">✕ Xóa ảnh</button>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    // 6. Nội Dung (Nhập nội dung trực tiếp)
    html += '<div class="ctk-form-group">';
    html += '<label class="ctk-form-label">📝 Nội Dung Chương Trình *</label>';
    html += '<div id="ctk-f-content-editor" contenteditable="true" style="border:1.5px solid #cbd5e1;border-radius:12px;min-height:220px;max-height:400px;overflow-y:auto;padding:16px;outline:none;font-size:13px;line-height:1.6;color:#1e293b;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,0.03)" placeholder="Nhập chi tiết về thể lệ chương trình quà tặng, khuyến mại...">' + (data.content || '') + '</div>';
    html += '</div>';

    // Submit & Cancel
    html += '<div style="margin-top:20px;display:flex;gap:12px;justify-content:flex-end">';
    html += '<button type="button" onclick="window._ctkCloseModal()" style="padding:10px 22px;background:#f1f5f9;color:#475569;border:1.5px solid #cbd5e1;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">Hủy</button>';
    html += '<button type="button" onclick="window._ctkSaveProgram()" style="padding:10px 22px;background:linear-gradient(135deg,#FAD14C,#f5c030);color:#192951;border:none;border-radius:10px;font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(250,209,76,0.35)">💾 ' + (isEdit ? 'Cập Nhật' : 'Tạo Mới') + '</button>';
    html += '</div>';

    html += '</div></div>';
    ov.innerHTML = html;
    document.body.appendChild(ov);

    var editorEl = document.getElementById('ctk-f-content-editor');
    if (editorEl) {
        setTimeout(function() {
            window._ctkSyncFontSizeFromContent();
        }, 50);

        editorEl.addEventListener('click', window._ctkSyncFontSizeFromContent);
        editorEl.addEventListener('keyup', window._ctkSyncFontSizeFromContent);

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
};

// Save Program
window._ctkSaveProgram = function() {
    var id = _ctk.editingId;
    
    var pType = document.getElementById('ctk-f-type').value;
    var field = document.getElementById('ctk-f-field').value;
    var title = (document.getElementById('ctk-f-title').value || '').trim();

    var radioEls = document.getElementsByName('ctk-valid-type-radio');
    var validType = 'date_range';
    for (var i = 0; i < radioEls.length; i++) {
        if (radioEls[i].checked) {
            validType = radioEls[i].value;
            break;
        }
    }

    var validFrom = null;
    var validTo = null;
    var validDays = null;

    if (validType === 'date_range') {
        var vnToday = _ctkGetVnToday();
        validFrom = document.getElementById('ctk-f-from') ? document.getElementById('ctk-f-from').value : '';
        validTo = document.getElementById('ctk-f-to') ? document.getElementById('ctk-f-to').value : '';
        
        if (!isEdit && validFrom && validFrom < vnToday) {
            alert('⚠️ Nguyên tắc bắt buộc:\n📅 Áp Dụng Từ phải từ ngày hiện tại (' + _ctkFormatDateDisplay(vnToday) + ') trở đi, không được chọn ngày trong quá khứ!');
            return;
        }

        if (validFrom && validTo && validTo < validFrom) {
            alert('⚠️ Nguyên tắc bắt buộc:\n📅 Đến Ngày phải là ngày lớn hơn hoặc bằng ngày 📅 Áp Dụng Từ!\n\nKhông được nhỏ hơn ngày Áp Dụng Từ.');
            return;
        }
    } else if (validType === 'days_from_sent') {
        var dSent = document.getElementById('ctk-f-days-sent') ? parseInt(document.getElementById('ctk-f-days-sent').value, 10) : 0;
        if (!dSent || dSent <= 0) {
            alert('⚠️ Vui lòng nhập số ngày áp dụng tính từ ngày gửi (ví dụ: 30)');
            return;
        }
        validDays = dSent;
    } else if (validType === 'auto_days') {
        var dAuto = document.getElementById('ctk-f-days-auto') ? parseInt(document.getElementById('ctk-f-days-auto').value, 10) : 0;
        if (!dAuto || dAuto <= 0) {
            alert('⚠️ Vui lòng nhập số ngày áp dụng tự tính từ hôm nay (ví dụ: 5)');
            return;
        }
        validDays = dAuto;
    }
    
    var editorEl = document.getElementById('ctk-f-content-editor');
    var content = editorEl ? editorEl.innerHTML.trim() : '';
    content = _ctkCleanOrphanNumberLines(content);
    var imgUrl = (document.getElementById('ctk-f-image-url').value || '').trim();

    if (!pType) {
        alert('Vui lòng chọn đối tượng áp dụng');
        return;
    }
    if (!field) {
        alert('Vui lòng chọn lĩnh vực hoạt động');
        return;
    }
    if (!title) {
        alert('Vui lòng nhập tên chương trình');
        return;
    }

    var custNameEls = document.getElementsByName('ctk-inc-cust-name-radio');
    var includeCustName = false;
    for (var i = 0; i < custNameEls.length; i++) {
        if (custNameEls[i].checked && custNameEls[i].value === 'true') {
            includeCustName = true;
            break;
        }
    }
    if ((title && title.indexOf('(khach_hang)') !== -1) || (content && content.indexOf('(khach_hang)') !== -1)) {
        includeCustName = true;
    }

    var themeEls = document.getElementsByName('ctk-theme-color-radio');
    var themeColor = 'gold';
    for (var i = 0; i < themeEls.length; i++) {
        if (themeEls[i].checked) {
            themeColor = themeEls[i].value;
            break;
        }
    }

    var bodyData = {
        title: title,
        program_type: pType,
        field_name: field,
        valid_type: validType,
        valid_days: validDays,
        include_customer_name: includeCustName,
        theme_color: themeColor,
        valid_from: validFrom || null,
        valid_to: validTo || null,
        content: content,
        image_url: imgUrl,
        is_active: true
    };

    var url = id ? '/api/customer-programs/' + id : '/api/customer-programs';
    var method = id ? 'PUT' : 'POST';

    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
        },
        body: JSON.stringify(bodyData)
    }).then(function(r){ return r.json(); }).then(function(res) {
        if (res.success) {
            alert(id ? '✅ Đã cập nhật chương trình thành công!' : '🎉 Đã tạo chương trình & quà tặng mới thành công!');
            window._ctkCloseModal();
            window.renderChuongtrinhkhhvPage(_ctk.container);
        } else {
            alert('❌ ' + (res.error || 'Lỗi khi lưu chương trình'));
        }
    }).catch(function(err) {
        alert('❌ Lỗi kết nối: ' + err.message);
    });
};

// Field Management Modal (Director only)
window._ctkManageFields = function() {
    window._ctkCloseFieldModal();

    var m = document.createElement('div');
    m.id = 'ctk_field_modal_overlay';
    m.className = 'ctk-modal-overlay';
    
    m.onclick = function(e) {
        if (e.target === m) window._ctkCloseFieldModal();
    };

    function renderFieldsList() {
        var fHtml = '';
        _ctkSortFields(_ctk.fields).forEach(function(f) {
            fHtml += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#f8fafc;border-radius:10px;border:1px solid #cbd5e1">';
            fHtml += '<span style="font-weight:700;color:#192951">🏷️ ' + _ctkEsc(f.name) + '</span>';
            fHtml += '<div style="display:flex;gap:6px">';
            fHtml += '<button onclick="window._ctkEditField(' + f.id + ',\'' + _ctkEsc(f.name).replace(/'/g,'\\\'') + '\')" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;padding:5px 10px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:700">✏️ Sửa</button>';
            fHtml += '<button onclick="window._ctkDeleteField(' + f.id + ')" style="background:#fee2e2;color:#b91c1c;border:none;padding:5px 10px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:700">🗑️ Xóa</button>';
            fHtml += '</div>';
            fHtml += '</div>';
        });
        return fHtml || '<div style="color:#64748b;text-align:center;padding:20px">Chưa có lĩnh vực nào</div>';
    }

    var html = '';
    html += '<div class="ctk-modal" style="max-width:540px">';
    html += '<div class="ctk-modal-head">';
    html += '<span style="font-size:18px;font-weight:900">📌 Quản Lý Lĩnh Vực Chương Trình</span>';
    html += '<button type="button" onclick="window._ctkCloseFieldModal()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer">✕</button>';
    html += '</div>';

    html += '<div class="ctk-modal-body">';
    
    html += '<div style="display:flex;gap:10px">';
    html += '<input type="text" id="ctk_new_field_name" class="ctk-form-input" placeholder="Nhập tên lĩnh vực mới..." style="flex:1" />';
    html += '<button onclick="window._ctkAddField()" style="padding:10px 18px;background:linear-gradient(135deg,#192951,#0f172a);color:#FAD14C;border:none;border-radius:10px;font-weight:800;cursor:pointer">➕ Thêm</button>';
    html += '</div>';

    html += '<div id="ctk_fields_container" style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto">';
    html += renderFieldsList();
    html += '</div>';

    html += '</div>';
    html += '</div>';

    m.innerHTML = html;
    document.body.appendChild(m);
};

window._ctkAddField = function() {
    var input = document.getElementById('ctk_new_field_name');
    var val = input ? input.value.trim() : '';
    if (!val) return alert('Vui lòng nhập tên lĩnh vực');

    fetch('/api/customer-programs/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') },
        body: JSON.stringify({ name: val })
    }).then(function(r){ return r.json(); }).then(function(res) {
        if (res.success) {
            _ctk.fields.push({ id: res.id, name: res.name });
            input.value = '';
            _ctkRender();
            alert('✅ Đã thêm lĩnh vực thành công!');
            window._ctkCloseFieldModal();
            window._ctkManageFields();
        } else {
            alert('❌ ' + (res.error || 'Lỗi thêm lĩnh vực'));
        }
    });
};

window._ctkEditField = function(id, name) {
    var newName = prompt('✏️ Nhập tên mới cho lĩnh vực "' + name + '":', name);
    if (newName === null) return;
    newName = newName.trim();
    if (!newName) return alert('⚠️ Tên lĩnh vực không được để trống!');
    if (newName === name) return;

    fetch('/api/customer-programs/fields/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') },
        body: JSON.stringify({ name: newName })
    }).then(function(r){ return r.json(); }).then(function(res) {
        if (res.success) {
            _ctkLoadData();
            alert('✅ Đã sửa tên lĩnh vực thành công!');
            window._ctkCloseFieldModal();
            setTimeout(function() { window._ctkManageFields(); }, 250);
        } else {
            alert('❌ ' + (res.error || 'Lỗi khi sửa lĩnh vực'));
        }
    }).catch(function(e){ alert('Lỗi: ' + e.message); });
};

window._ctkDeleteField = function(id) {
    if (!confirm('Anh có chắc muốn xóa lĩnh vực này?')) return;
    fetch('/api/customer-programs/fields/' + id, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') }
    }).then(function(r){ return r.json(); }).then(function(res) {
        if (res.success) {
            _ctk.fields = _ctk.fields.filter(function(x){ return x.id !== id; });
            _ctkRender();
            alert('✅ Đã xóa lĩnh vực!');
            var container = document.getElementById('ctk_fields_container');
            if (container) {
                var fHtml = renderFieldsList();
                container.innerHTML = fHtml;
            }
        } else {
            alert('❌ ' + (res.error || 'Lỗi khi xóa lĩnh vực'));
        }
    });
};

})();
