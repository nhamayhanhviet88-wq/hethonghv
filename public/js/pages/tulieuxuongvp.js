// ========== TƯ LIỆU XƯỞNG & VP ==========
var _tl = { boards: [], items: [], sel: { boardId: null, sourceId: null } };
var _tlOpen = {};
var _tlIsGD = function() { return typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc'; };

function _tlIsGoogleDriveUrl(url) {
    if (!url || typeof url !== 'string') return false;
    var u = url.trim();
    if (!u) return false;
    if (u.startsWith('/uploads/tlxvp/')) return true;
    return /^(https?:\/\/)?(www\.)?(drive|docs)\.google\.com(\/.*)?$/i.test(u);
}

function _tlNormalizeDriveUrl(url) {
    if (!url) return '';
    var u = url.trim();
    if (u.startsWith('/uploads/tlxvp/')) return u;
    if (/^(www\.)?(drive|docs)\.google\.com/i.test(u)) {
        u = 'https://' + u;
    }
    return u;
}

function _tlParseImageUrl(val) {
    if (!val) return { url: '', raw_url: '' };
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        var u = val.url || '';
        var r = val.raw_url || u;
        return { url: u, raw_url: r };
    }
    if (typeof val === 'string') {
        var str = val.trim();
        if (str.startsWith('{')) {
            try {
                var parsed = JSON.parse(str);
                if (parsed && typeof parsed === 'object' && parsed !== null) {
                    var u2 = parsed.url || '';
                    var r2 = parsed.raw_url || u2;
                    return { url: u2, raw_url: r2 };
                }
            } catch(e) {}
        }
        return { url: str, raw_url: str };
    }
    return { url: String(val), raw_url: String(val) };
}

async function renderTulieuxuongvpPage(content) {
    if (!document.getElementById('tlStyles')) {
        var st = document.createElement('style'); st.id = 'tlStyles';
        st.textContent = '.tl-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden}'
            +'.tl-sidebar{width:270px;min-width:270px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto}'
            +'.tl-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;padding:16px}.tl-main>*{flex-shrink:0}'
            +'.tl-sb-title{font-size:13px;font-weight:800;padding:16px;border-bottom:1px solid var(--gray-200);text-align:center;position:relative;overflow:hidden}'
            +'.tl-sb-title::before{content:"";position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:linear-gradient(45deg,transparent 30%,rgba(99,102,241,0.08) 50%,transparent 70%);animation:tlShimmer 3s infinite}'
            +'@keyframes tlShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}'
            +'.tl-sb-all{background:linear-gradient(135deg,#4f46e5,#6366f1,#818cf8);color:#fff;padding:12px 16px;font-size:13px;font-weight:800;display:flex;justify-content:space-between;cursor:pointer;position:relative;overflow:hidden}'
            +'.tl-sb-all::after{content:"";position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent);animation:tlGlow 2.5s infinite}'
            +'@keyframes tlGlow{0%{left:-100%}100%{left:150%}}'
            +'.tl-sb-board{padding:8px 16px;font-weight:800;font-size:12px;color:var(--navy);cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border-bottom:1px solid var(--gray-200)}'
            +'.tl-sb-board:hover{background:#f1f5f9}'
            +'.tl-sb-board.active{background:#eef2ff}'
            +'.tl-sb-src{padding:6px 16px 6px 28px;font-size:11px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f0f0f0;color:#4f46e5}'
            +'.tl-sb-src:hover{background:#eef2ff}.tl-sb-src.active{background:#e0e7ff;font-weight:800}'
            +'.tl-paste-zone{border:2px dashed #c7d2fe;border-radius:8px;padding:16px;text-align:center;cursor:pointer;transition:all .2s;min-height:80px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;background:#fafafe;position:relative}'
            +'.tl-paste-zone:hover{border-color:#4f46e5;background:#eef2ff}'
            +'.tl-paste-zone.has-img{border-style:solid;border-color:#10b981;background:#f0fdf4}'
            +'.tl-paste-zone img{max-width:100%;max-height:200px;border-radius:6px;object-fit:contain}'
            +'.tl-paste-zone .tl-paste-hint{font-size:11px;color:#6b7280;font-weight:600}'
            +'.tl-paste-zone .tl-paste-remove{position:absolute;top:4px;right:4px;background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:50%;width:22px;height:22px;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center}'
            +'.tl-lightbox{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:pointer;animation:tlFadeIn .2s ease}'
            +'@keyframes tlFadeIn{from{opacity:0}to{opacity:1}}'
            +'.tl-lightbox img{max-width:90vw;max-height:90vh;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.5);object-fit:contain}'
            +'.tl-lightbox-close{position:absolute;top:20px;right:30px;color:#fff;font-size:32px;cursor:pointer;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:rgba(255,255,255,0.15);transition:background .2s}'
            +'.tl-lightbox-close:hover{background:rgba(255,255,255,0.3)}'
        ;
        document.head.appendChild(st);
    }

    if (!window.JSZip && !document.getElementById('jszipScript')) {
        var jss = document.createElement('script');
        jss.id = 'jszipScript';
        jss.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        document.head.appendChild(jss);
    }

    content.innerHTML = '<div class="tl-wrap"><div class="tl-sidebar" id="tlSidebar"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="tl-main">'
        +'<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center">'
        +'<div id="tlBoardTitle" style="font-size:15px;font-weight:900;color:var(--navy)">📂 Tư Liệu Xưởng & VP</div>'
        +'<div style="flex:1"></div>'
        +'<div id="tlActions"></div>'
        +'</div>'
        +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:12px;white-space:nowrap" id="tlTable"><thead id="tlThead"><tr style="background:var(--gray-800)"><th>Đang tải...</th></tr></thead><tbody id="tlTbody"><tr><td style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div>'
        +'</div></div>';

    _tl.sel = { boardId: null, sourceId: null };
    await _tlLoadBoards();
}

// ===== LOAD BOARDS =====
async function _tlLoadBoards() {
    var data = await apiCall('/api/tlxvp/boards');
    _tl.boards = data.boards || [];
    // Mở rộng tất cả board khi load
    _tl.boards.forEach(function(b) { _tlOpen['b' + b.id] = true; });

    // Mặc định chọn BẢNG VẢI khi tải lần đầu
    if (!_tl.sel.boardId && _tl.boards.length > 0) {
        var boardVai = _tl.boards.find(function(b) {
            return b.name && (b.name.trim().toLowerCase().includes('vải') || b.name.trim().toLowerCase().includes('vai'));
        });
        if (boardVai) {
            _tl.sel.boardId = boardVai.id;
        } else {
            _tl.sel.boardId = _tl.boards[0].id;
        }
    }

    _tlRenderSidebar();
    _tlLoadItems();
}

// ===== SIDEBAR =====
function _tlRenderSidebar() {
    var sb = document.getElementById('tlSidebar'); if (!sb) return;
    var totalItems = _tl.boards.reduce(function(s,b){ return s + (b.item_count||0); }, 0);
    var sel = _tl.sel;
    var isGD = _tlIsGD();

    var h = '<div class="tl-sb-title"><span style="color:var(--navy)">───</span> <span style="color:#4f46e5;font-weight:900">📂 Tư Liệu Xưởng & VP</span> <span style="color:var(--navy)">───</span></div>';
    h += '<div class="tl-sb-all" onclick="_tlSelectAll()"><span>📋 All</span><span style="font-size:16px">' + totalItems + '</span></div>';

    _tl.boards.forEach(function(b) {
        var bKey = 'b' + b.id;
        var bOpen = !!_tlOpen[bKey];
        var bActive = sel.boardId == b.id && !sel.sourceId;
        h += '<div class="tl-sb-board' + (bActive ? ' active' : '') + '" onclick="_tlSelectBoard(' + b.id + ')">'
            + '<span><span onclick="event.stopPropagation();_tlToggleExpand(\'' + bKey + '\')" style="display:inline-block;padding:2px 6px 2px 0;cursor:pointer;font-size:10px" title="Đóng/Mở Bảng Phụ">' + (bOpen ? '▼' : '▸') + '</span> ' + b.name + '</span>'
            + '<span style="background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;padding:2px 10px;border-radius:10px;font-size:10px">' + (b.item_count||0) + '</span>'
            + '</div>';
        if (bOpen) {
            (b.sources || []).forEach(function(s) {
                var sActive = sel.sourceId == s.id;
                h += '<div class="tl-sb-src' + (sActive ? ' active' : '') + '" onclick="event.stopPropagation();_tlSelectSource(' + b.id + ',' + s.id + ')">'
                    + '<span>📋 ' + s.name + '</span>'
                    + '<span style="color:' + ((s.item_count||0) > 0 ? '#4f46e5' : '#999') + ';font-weight:' + ((s.item_count||0) > 0 ? '800' : '400') + '">' + (s.item_count||0) + '</span>'
                    + '</div>';
            });
        }
    });

    if (isGD) {
        h += '<div style="padding:12px;border-top:1px solid var(--gray-200);display:flex;gap:6px">'
            + '<button onclick="_tlShowCreateBoard()" style="flex:1;background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;border:none;padding:8px 4px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">➕ Tạo Bảng</button>'
            + '<button onclick="_tlShowReorderBoards()" style="background:#f3f4f6;color:#374151;border:1px solid #d1d5db;padding:8px 10px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer" title="Sắp xếp thứ tự các Bảng Chính">↕️ Sắp Xếp</button>'
            + '</div>';
    }
    sb.innerHTML = h;
}

function _tlApplyFilterLocal() {
    if (!_tl.allItems || _tl.allItems.length === 0) return;
    var sel = _tl.sel;
    _tl.items = _tl.allItems.filter(function(it) {
        if (sel.sourceId) return String(it.source_id) === String(sel.sourceId);
        if (sel.boardId) return String(it.board_id) === String(sel.boardId);
        return true;
    });
    _tlRenderTable();
    _tlRenderActions();
}

function _tlToggleExpand(bKey) {
    _tlOpen[bKey] = !_tlOpen[bKey];
    _tlRenderSidebar();
}
function _tlSelectBoard(boardId) {
    var bKey = 'b' + boardId;
    _tlOpen[bKey] = true;
    _tl.sel = { boardId: boardId, sourceId: null };
    _tlRenderSidebar();
    _tlApplyFilterLocal();
    _tlLoadItems();
}
function _tlSelectAll() {
    _tl.sel = { boardId: null, sourceId: null };
    _tlRenderSidebar();
    _tlApplyFilterLocal();
    _tlLoadItems();
}
function _tlSelectSource(boardId, sourceId) {
    _tl.sel = { boardId: boardId, sourceId: sourceId };
    _tlRenderSidebar();
    _tlApplyFilterLocal();
    _tlLoadItems();
}

// ===== LOAD ITEMS =====
async function _tlLoadItems() {
    var sel = _tl.sel, url = '/api/tlxvp/items?';
    if (sel.boardId) url += 'board_id=' + sel.boardId + '&';
    if (sel.sourceId) url += 'source_id=' + sel.sourceId + '&';
    var data = await apiCall(url);
    _tl.items = data.items || [];
    if (!sel.boardId && !sel.sourceId || !_tl.allItems) {
        _tl.allItems = data.items || [];
    }
    _tlRenderTable();
    _tlRenderActions();
}

// ===== RENDER TABLE =====
function _tlRenderTable() {
    var thead = document.getElementById('tlThead');
    var tbody = document.getElementById('tlTbody');
    if (!thead || !tbody) return;

    // Get columns — giờ lấy từ bảng phụ (source)
    var cols = _tlGetColumns();
    var isGD = _tlIsGD();

    // Header
    var th = '<tr style="background:var(--gray-800)"><th style="width:40px;text-align:center">STT</th><th>Bảng Phụ</th>';
    cols.forEach(function(c) { th += '<th>' + c.label + '</th>'; });
    th += '<th>Thời Gian Cập Nhật</th>';
    if (isGD) th += '<th></th>';
    th += '</tr>';
    thead.innerHTML = th;

    // Body
    if (_tl.items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="' + (cols.length + 4) + '"><div class="empty-state"><div class="icon">📂</div><h3>Chưa có tư liệu</h3></div></td></tr>';
        return;
    }

    tbody.innerHTML = _tl.items.map(function(it, idx) {
        var d = it.data || {};
        var row = '<tr style="cursor:pointer" onclick="_tlShowDetailModal(' + it.id + ')" title="Click để xem chi tiết đầy đủ tư liệu">';
        row += '<td style="text-align:center;font-weight:800;color:#6b7280;font-size:12px">' + (idx + 1) + '</td>';
        row += '<td><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:800;color:#4f46e5;background:#eef2ff;border:1px solid #c7d2fe">' + (it.source_name||'—') + '</span></td>';
        cols.forEach(function(c) {
            var val = d[c.key];
            if (val === undefined || val === null || val === '') val = '';
            var isNameCol = /tên|ten|name/i.test(c.label || '') || /tên|ten|name/i.test(c.key || '');
            
            if ((c.type === 'image' || c.type === 'images') && val) {
                var imgUrls = [];
                if (Array.isArray(val)) imgUrls = val;
                else if (typeof val === 'string' && val.trim().startsWith('[')) {
                    try { imgUrls = JSON.parse(val); } catch(e) { imgUrls = val ? [val] : []; }
                } else if (val) {
                    imgUrls = [val];
                }
                if (imgUrls.length > 0) {
                    var imgsHtml = '<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center" onclick="event.stopPropagation()">';
                    imgUrls.forEach(function(u) {
                        var parsedImg = _tlParseImageUrl(u);
                        if (parsedImg.url) {
                            imgsHtml += '<img src="' + parsedImg.url + '" style="max-height:50px;max-width:80px;border-radius:4px;cursor:pointer;object-fit:cover;border:1px solid #cbd5e1" onclick="event.stopPropagation();_tlShowLightbox(\'' + parsedImg.url.replace(/'/g,"\\'") + '\',\'' + parsedImg.raw_url.replace(/'/g,"\\'") + '\')" title="Click để xem & tải ảnh gốc nét">';
                        }
                    });
                    imgsHtml += '</div>';
                    row += '<td>' + imgsHtml + '</td>';
                } else {
                    row += '<td></td>';
                }
            } else if ((c.type === 'video' || c.type === 'link') && val) {
                var strVal = String(val).trim();
                if (strVal.startsWith('/uploads/tlxvp/videos/') || strVal.startsWith('/uploads/tlxvp/')) {
                    row += '<td>'
                        + '<div style="display:flex;align-items:center;gap:6px" onclick="event.stopPropagation()">'
                        + '<button type="button" class="btn btn-sm" onclick="event.stopPropagation();_tlShowDetailModal(' + it.id + ')" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;font-weight:800;font-size:11px;border:none;padding:4px 10px;border-radius:6px;cursor:pointer" title="Bấm để xem video & tải về">🎬 Xem Video</button>'
                        + '</div>'
                        + '</td>';
                } else {
                    var hrefVal = _tlNormalizeDriveUrl(strVal);
                    var displayVal = c.label || 'Link Video';
                    row += '<td><a href="' + hrefVal + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;background:#e0e7ff;color:#4338ca;font-weight:700;font-size:12px;text-decoration:none" title="' + String(hrefVal).replace(/"/g,'&quot;') + '">🔗 ' + displayVal + ' ↗</a></td>';
                }
            } else if (isNameCol && val !== '') {
                if (c.type === 'number' && typeof val === 'number') {
                    val = val.toLocaleString('vi-VN');
                }
                row += '<td><span style="display:inline-block;padding:5px 14px;border-radius:6px;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#ffffff;font-weight:800;font-size:13px;box-shadow:0 2px 6px rgba(37,99,235,0.35);letter-spacing:0.3px">' + val + '</span></td>';
            } else if (c.type === 'number' && val !== '') {
                val = Number(val).toLocaleString('vi-VN');
                row += '<td style="text-align:right"><span style="display:inline-block;padding:4px 12px;border-radius:6px;background:linear-gradient(135deg,#1e293b,#334155);color:#fff;font-weight:700;font-size:12px">' + val + '</span></td>';
            } else {
                row += '<td>' + (val ? '<span style="display:inline-block;padding:4px 12px;border-radius:6px;background:linear-gradient(135deg,#1e293b,#334155);color:#fff;font-weight:700;font-size:12px">' + val + '</span>' : '') + '</td>';
            }
        });
        // Thời Gian Cập Nhật
        var updatedAt = it.updated_at ? new Date(it.updated_at) : null;
        var updatedBy = it.updated_by_name || it.created_by_name || '';
        var timeStr = '';
        if (updatedAt) {
            var hh = String(updatedAt.getHours()).padStart(2,'0');
            var mm = String(updatedAt.getMinutes()).padStart(2,'0');
            var dd = String(updatedAt.getDate()).padStart(2,'0');
            var mo = String(updatedAt.getMonth()+1).padStart(2,'0');
            var yy = updatedAt.getFullYear();
            timeStr = hh + ':' + mm + ' ' + dd + '/' + mo + '/' + yy;
        }
        row += '<td style="font-size:11px;white-space:nowrap">'
            + (updatedBy ? '<div style="font-weight:700;color:#4f46e5">' + updatedBy + '</div>' : '')
            + (timeStr ? '<div style="color:#6b7280">' + timeStr + '</div>' : '')
            + '</td>';
        if (isGD) {
            var isFirst = idx === 0;
            var isLast = idx === _tl.items.length - 1;
            row += '<td style="white-space:nowrap">'
                + '<button class="btn btn-sm" onclick="event.stopPropagation();_tlMoveItem(' + it.id + ',\'up\')" ' + (isFirst ? 'disabled style="opacity:0.3;cursor:not-allowed"' : '') + ' title="Chuyển công việc lên trước">⬆️</button>'
                + '<button class="btn btn-sm" onclick="event.stopPropagation();_tlMoveItem(' + it.id + ',\'down\')" ' + (isLast ? 'disabled style="opacity:0.3;cursor:not-allowed"' : '') + ' title="Chuyển công việc xuống sau">⬇️</button>'
                + '<button class="btn btn-sm" onclick="event.stopPropagation();_tlEditItem(' + it.id + ')" title="Sửa">✏️</button>'
                + '<button class="btn btn-sm" onclick="event.stopPropagation();_tlDeleteItem(' + it.id + ')" title="Xóa" style="color:var(--danger)">🗑️</button>'
                + '</td>';
        }
        row += '</tr>';
        return row;
    }).join('');
}

async function _tlMoveItem(id, direction) {
    try {
        var res = await apiCall('/api/tlxvp/items/reorder', 'POST', { id: id, direction: direction });
        if (res && res.ok) {
            await _tlLoadItems();
        } else {
            showToast(res && res.error ? res.error : 'Không thể sắp xếp', 'error');
        }
    } catch(e) {
        showToast('Lỗi sắp xếp', 'error');
    }
}

// ===== POPUP HIỂN THỊ CHI TIẾT DÒNG TƯ LIỆU =====
function _tlShowDetailModal(id) {
    var item = _tl.items.find(function(it) { return it.id === id; });
    if (!item) return;
    var d = item.data || {};
    var cols = _tlGetColumns();
    var isGD = _tlIsGD();

    // Trích xuất Tên Vải / Tên mục chính
    var fabricName = '';
    cols.forEach(function(c) {
        var isNameCol = /tên|ten|name/i.test(c.label || '') || /tên|ten|name/i.test(c.key || '');
        if (isNameCol && d[c.key] && !fabricName) {
            fabricName = String(d[c.key]).trim();
        }
    });
    if (!fabricName) {
        fabricName = item.source_name || 'vai_goc';
    }

    var textCols = [];
    var mediaCols = [];

    cols.forEach(function(c) {
        if (c.type === 'image' || c.type === 'images' || c.type === 'video' || c.type === 'link') {
            mediaCols.push(c);
        } else {
            textCols.push(c);
        }
    });

    var updatedAt = item.updated_at ? new Date(item.updated_at) : null;
    var updatedBy = item.updated_by_name || item.created_by_name || '';
    var timeStr = '';
    if (updatedAt) {
        var hh = String(updatedAt.getHours()).padStart(2,'0');
        var mm = String(updatedAt.getMinutes()).padStart(2,'0');
        var dd = String(updatedAt.getDate()).padStart(2,'0');
        var mo = String(updatedAt.getMonth()+1).padStart(2,'0');
        var yy = updatedAt.getFullYear();
        timeStr = hh + ':' + mm + ' ' + dd + '/' + mo + '/' + yy;
    }

    var body = '<div style="font-family:inherit;color:#1e293b">';
    
    // Sub-board & Meta Header Card
    body += '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:12px 16px;background:linear-gradient(135deg,#f8fafc,#eef2ff);border:1px solid #c7d2fe;border-radius:10px;margin-bottom:16px">'
        + '<div style="flex:1">'
        + '<div style="font-size:11px;font-weight:700;color:#6366f1;text-transform:uppercase">Bảng Phụ: ' + (item.source_name || '—') + '</div>'
        + (updatedBy ? '<div style="font-size:11px;color:#475569;margin-top:2px">👤 Người cập nhật: <strong>' + updatedBy + '</strong> (' + timeStr + ')</div>' : '')
        + '</div>'
        + '</div>';

    // 1. Text & Parameters Grid
    if (textCols.length > 0) {
        body += '<div style="font-size:13px;font-weight:800;color:#1e293b;margin-bottom:8px;display:flex;align-items:center;gap:6px">📋 Thông Tin Chi Tiết</div>';
        body += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-bottom:20px">';
        textCols.forEach(function(c) {
            var val = d[c.key];
            if (val === undefined || val === null || val === '') val = '—';
            var isNameCol = /tên|ten|name/i.test(c.label || '') || /tên|ten|name/i.test(c.key || '');
            if (c.type === 'number' && typeof val === 'number') val = val.toLocaleString('vi-VN');

            body += '<div style="padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;display:flex;flex-direction:column;gap:4px">'
                + '<span style="font-size:11px;font-weight:700;color:#64748b">' + c.label + '</span>';
            if (isNameCol && val !== '—') {
                body += '<span><span style="display:inline-block;padding:4px 12px;border-radius:6px;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;font-weight:800;font-size:13px;box-shadow:0 2px 5px rgba(37,99,235,0.3)">' + val + '</span></span>';
            } else if (val !== '—') {
                body += '<span><span style="display:inline-block;padding:3px 10px;border-radius:6px;background:linear-gradient(135deg,#1e293b,#334155);color:#fff;font-weight:700;font-size:12px">' + val + '</span></span>';
            } else {
                body += '<span style="font-size:12px;color:#94a3b8;font-style:italic">—</span>';
            }
            body += '</div>';
        });
        body += '</div>';
    }

    // 2. Media Section (Images, Videos, Links)
    if (mediaCols.length > 0) {
        body += '<div style="font-size:13px;font-weight:800;color:#1e293b;margin-bottom:8px;display:flex;align-items:center;gap:6px">🖼️ Hình Ảnh & Video Tư Liệu</div>';
        body += '<div style="display:flex;flex-direction:column;gap:14px">';
        mediaCols.forEach(function(c) {
            var val = d[c.key];
            if (!val) return;

            if (c.type === 'image' || c.type === 'images') {
                var imgUrls = [];
                if (Array.isArray(val)) imgUrls = val;
                else if (typeof val === 'string' && val.trim().startsWith('[')) {
                    try { imgUrls = JSON.parse(val); } catch(e) { imgUrls = val ? [val] : []; }
                } else if (val) {
                    imgUrls = [val];
                }
                if (imgUrls.length > 0) {
                    var rawUrlsArr = [];
                    imgUrls.forEach(function(u) {
                        var parsedImg = _tlParseImageUrl(u);
                        if (parsedImg.raw_url) rawUrlsArr.push(parsedImg.raw_url);
                    });
                    var zipTitle = fabricName;
                    var downloadAllBtn = imgUrls.length > 1 ? '<button type="button" onclick="_tlDownloadAllImagesZip(' + String(JSON.stringify(rawUrlsArr)).replace(/"/g,'&quot;') + ', \'' + String(zipTitle).replace(/'/g,"\\'") + '\')" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;font-weight:700;font-size:11px;text-decoration:none;border:none;cursor:pointer" title="Nén & Tải toàn bộ ' + imgUrls.length + ' ảnh gốc vào 1 file ZIP">📦 Tải Về Tất Cả File .ZIP (' + imgUrls.length + ' Ảnh Gốc)</button>' : '';

                    body += '<div style="padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px">'
                        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px">'
                        + '<div style="font-weight:700;font-size:12px;color:#334155">📷 ' + c.label + ' (' + imgUrls.length + ' ảnh):</div>'
                        + downloadAllBtn
                        + '</div>'
                        + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px">';
                    imgUrls.forEach(function(u) {
                        var parsedImg = _tlParseImageUrl(u);
                        var displayUrl = parsedImg.url;
                        var rawUrl = parsedImg.raw_url;
                        if (displayUrl) {
                            body += '<div style="display:flex;flex-direction:column;gap:6px;background:#fff;padding:6px;border-radius:8px;border:1px solid #cbd5e1;align-items:center">'
                                + '<img src="' + displayUrl + '" style="width:100%;height:110px;object-fit:cover;border-radius:6px;cursor:pointer" onclick="_tlShowLightbox(\'' + displayUrl.replace(/'/g,"\\'") + '\',\'' + rawUrl.replace(/'/g,"\\'") + '\')" title="Click để phóng to">'
                                + '<a href="' + rawUrl + '" download style="display:inline-flex;align-items:center;justify-content:center;gap:4px;width:100%;padding:4px 6px;border-radius:6px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;font-weight:700;font-size:10px;text-decoration:none" title="Tải ảnh gốc 100% về máy">⬇️ Tải Ảnh Gốc</a>'
                                + '</div>';
                        }
                    });
                    body += '</div></div>';
                }
            } else if (c.type === 'video' || c.type === 'link') {
                var strVal = String(val).trim();
                if (strVal.startsWith('/uploads/tlxvp/videos/') || strVal.startsWith('/uploads/tlxvp/')) {
                    body += '<div style="padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px">'
                        + '<div style="font-weight:700;font-size:12px;color:#334155;margin-bottom:8px">🎬 ' + c.label + ':</div>'
                        + '<div style="display:flex;flex-direction:column;gap:8px;max-width:340px">'
                        + '<video src="' + strVal + '" controls style="width:100%;max-height:200px;border-radius:8px;background:#000" preload="metadata"></video>'
                        + '<a href="' + strVal + '" download style="display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 14px;border-radius:8px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;font-weight:800;font-size:12px;text-decoration:none;box-shadow:0 2px 6px rgba(5,150,105,0.3)" title="Tải video gốc nét về máy">⬇️ Tải Video Gốc Nét HD</a>'
                        + '</div></div>';
                } else if (strVal) {
                    var hrefVal = _tlNormalizeDriveUrl(strVal);
                    body += '<div style="padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px">'
                        + '<div style="font-weight:700;font-size:12px;color:#334155;margin-bottom:6px">🔗 ' + c.label + ':</div>'
                        + '<a href="' + hrefVal + '" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:8px;background:#e0e7ff;color:#4338ca;font-weight:800;font-size:12px;text-decoration:none">' + hrefVal + ' ↗</a>'
                        + '</div>';
                }
            }
        });
        body += '</div>';
    }

    body += '</div>';

    var footer = '';
    if (isGD) {
        footer += '<button class="btn" onclick="closeModal();_tlEditItem(' + item.id + ')" style="background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;border:none;font-weight:800;margin-right:8px">✏️ Chỉnh Sửa Dòng</button>';
    }
    footer += '<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>';

    openModal('📂 Chi Tiết Tư Liệu: ' + (item.source_name || ''), body, footer);
}

function _tlGetRawUrl(u) {
    if (!u) return '';
    if (typeof u === 'object') {
        return u.raw_url || u.url || '';
    }
    if (typeof u === 'string') {
        var str = u.trim();
        if (str.startsWith('{')) {
            try {
                var parsed = JSON.parse(str);
                if (parsed && typeof parsed === 'object') {
                    return parsed.raw_url || parsed.url || str;
                }
            } catch(e) {}
        }
        return str;
    }
    return String(u);
}

// ===== NÉN & TẢI FILE .ZIP TOÀN BỘ ÁNH GỐC (1 CLICK) =====
async function _tlDownloadAllImagesZip(urls, zipName) {
    if (!urls || !Array.isArray(urls) || urls.length === 0) return;
    showToast('⏳ Đang tạo tệp ZIP chứa ' + urls.length + ' ảnh gốc...', 'info');

    if (!window.JSZip) {
        try {
            await new Promise(function(resolve, reject) {
                var s = document.createElement('script');
                s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
                s.onload = resolve;
                s.onerror = function() { reject(new Error('Không nạp được JSZip')); };
                document.head.appendChild(s);
            });
        } catch(err) {
            showToast('Chuyển sang tải trực tiếp từng ảnh...', 'warning');
            return _tlDownloadAllImages(urls);
        }
    }

    try {
        var zip = new JSZip();
        var zipFileName = String(zipName || 'vai_goc').trim().replace(/[\/\\?%*:|"<>]/g, '_');
        var folder = zip.folder(zipFileName);
        var addedCount = 0;

        for (var i = 0; i < urls.length; i++) {
            var rawUrl = _tlGetRawUrl(urls[i]);
            if (!rawUrl) continue;
            try {
                var resp = await fetch(rawUrl);
                // Nếu fetch rawUrl trả về 404 (do ảnh tải lên trước đây chưa có bản raw_), tự động thử fetch url hiển thị
                if (!resp.ok && rawUrl.includes('/uploads/tlxvp/raw_')) {
                    var displayUrl = rawUrl.replace('/uploads/tlxvp/raw_', '/uploads/tlxvp/').replace(/\.[a-z0-9]+$/i, '.webp');
                    resp = await fetch(displayUrl);
                    if (!resp.ok) {
                        displayUrl = rawUrl.replace('/uploads/tlxvp/raw_', '/uploads/tlxvp/');
                        resp = await fetch(displayUrl);
                    }
                }
                if (resp.ok) {
                    var blob = await resp.blob();
                    var rawFileName = rawUrl.split('/').pop() || ('anh_goc_' + (i + 1) + '.png');
                    folder.file(rawFileName, blob);
                    addedCount++;
                }
            } catch(e) {
                console.error('Lỗi tải tệp vào zip:', rawUrl, e);
            }
        }

        if (addedCount === 0) {
            showToast('Không tải được file để tạo ZIP, chuyển sang tải trực tiếp...', 'warning');
            return _tlDownloadAllImages(urls);
        }

        var content = await zip.generateAsync({ type: 'blob' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(content);
        a.download = zipFileName + '.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('✅ Đã tải tệp ZIP (' + addedCount + ' ảnh) thành công!', 'success');
    } catch(e) {
        console.error('Lỗi nén ZIP:', e);
        showToast('Tạo ZIP không thành công, đang tải từng file...', 'warning');
        _tlDownloadAllImages(urls);
    }
}

async function _tlDownloadAllImages(urls) {
    if (!urls || !Array.isArray(urls) || urls.length === 0) return;
    showToast('Đang tải xuống ' + urls.length + ' ảnh gốc...', 'info');
    for (var i = 0; i < urls.length; i++) {
        (function(url, idx) {
            setTimeout(function() {
                var a = document.createElement('a');
                a.href = url;
                var fileName = url.split('/').pop() || ('anh_goc_' + (idx + 1) + '.png');
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                a.remove();
            }, idx * 350);
        })(urls[i], i);
    }
}

// Lấy cột — theo từng Bảng Chính (board.columns) riêng biệt
function _tlGetColumns() {
    var sel = _tl.sel;
    if (sel.boardId) {
        var board = _tl.boards.find(function(b) { return b.id == sel.boardId; });
        return (board && board.columns) ? board.columns : [];
    }
    // "All" → gộp cột từ tất cả các Bảng Chính
    var allCols = []; var seen = {};
    _tl.boards.forEach(function(b) {
        (b.columns || []).forEach(function(c) {
            if (!seen[c.key]) { seen[c.key] = true; allCols.push(c); }
        });
    });
    return allCols;
}

// ===== ACTIONS — thay đổi theo cấp =====
function _tlRenderActions() {
    var el = document.getElementById('tlActions'); if (!el) return;
    var isGD = _tlIsGD();
    var sel = _tl.sel;
    var title = document.getElementById('tlBoardTitle');

    if (!isGD) { el.innerHTML = ''; return; }

    // "All" — không có action
    if (!sel.boardId) {
        if (title) title.textContent = '📂 Tư Liệu Xưởng & VP — Tất cả';
        el.innerHTML = '';
        return;
    }

    var board = _tl.boards.find(function(b) { return b.id == sel.boardId; });
    if (!board) return;

    // Đang chọn Bảng Phụ cụ thể
    if (sel.sourceId) {
        var source = (board.sources || []).find(function(s) { return s.id == sel.sourceId; });
        if (title) title.textContent = '📂 ' + board.name + ' ▸ ' + (source ? source.name : '');
        var btns = '<button onclick="_tlShowAddItem()" style="background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;border:none;padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;margin-right:6px">➕ Thêm Tư Liệu</button>'
            + '<button onclick="_tlShowEditColumns()" style="background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;border:none;padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;margin-right:6px">⚙️ Sửa Cột</button>'
            + '<button onclick="_tlShowRenameSource()" style="background:linear-gradient(135deg,#6b7280,#9ca3af);color:#fff;border:none;padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;margin-right:6px">✏️ Đổi Tên</button>'
            + '<button onclick="_tlDeleteSource()" style="background:none;border:1px solid #fca5a5;color:#dc2626;padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">🗑️ Xóa Bảng Phụ</button>';
        el.innerHTML = btns;
        return;
    }

    // Đang chọn Bảng Chính (chưa chọn bảng phụ) — Không hiển thị 'Thêm Tư Liệu' ở cấp Bảng Chính
    if (title) title.textContent = '📂 ' + board.name;
    var btns2 = '<button onclick="_tlShowAddSource()" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;margin-right:6px">➕ Thêm Bảng Phụ</button>'
        + '<button onclick="_tlShowEditColumns()" style="background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;border:none;padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;margin-right:6px">⚙️ Sửa Cột</button>'
        + '<button onclick="_tlShowRenameBoard()" style="background:linear-gradient(135deg,#6b7280,#9ca3af);color:#fff;border:none;padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;margin-right:6px">✏️ Đổi Tên</button>'
        + '<button onclick="_tlDeleteBoard()" style="background:none;border:1px solid #fca5a5;color:#dc2626;padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">🗑️ Xóa Bảng Chính</button>';
    el.innerHTML = btns2;
}

// ===== CREATE BOARD MODAL — chỉ nhập tên =====
function _tlShowCreateBoard() {
    var body = '<div style="margin-bottom:12px"><label style="font-weight:700;font-size:12px">Tên Bảng Chính:</label><input type="text" id="tlNewBoardName" class="form-control" placeholder="VD: BẢNG MẪU VẢI" style="margin-top:4px"></div>';
    var footer = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button> <button class="btn" onclick="_tlSaveNewBoard()" style="background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;border:none;font-weight:800">💾 Lưu Bảng</button>';
    openModal('➕ Tạo Bảng Chính Mới', body, footer);
}

async function _tlSaveNewBoard() {
    var name = document.getElementById('tlNewBoardName')?.value?.trim();
    if (!name) return showToast('Nhập tên bảng chính', 'error');
    await apiCall('/api/tlxvp/boards', 'POST', { name: name });
    closeModal();
    showToast('Đã tạo bảng chính: ' + name, 'success');
    await _tlLoadBoards();
}

// ===== REORDER BOARDS MODAL =====
var _tlBoardOrderList = [];

function _tlShowReorderBoards() {
    _tlBoardOrderList = _tl.boards.map(function(b) { return { id: b.id, name: b.name }; });
    _tlRenderReorderModal();
}

function _tlRenderReorderModal() {
    var body = '<div id="tlReorderList">';
    _tlBoardOrderList.forEach(function(b, idx) {
        body += '<div style="display:flex;align-items:center;padding:8px 12px;margin-bottom:6px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">'
            + '<span style="flex:1;font-weight:700;font-size:13px;color:#1e293b">' + (idx + 1) + '. ' + b.name.replace(/"/g,'&quot;') + '</span>'
            + '<div style="display:flex;gap:4px">'
            + '<button onclick="_tlMoveBoardOrder(' + idx + ',-1)" ' + (idx === 0 ? 'disabled style="opacity:0.3;cursor:not-allowed"' : 'style="cursor:pointer"') + ' class="btn btn-sm">⬆️ Lên</button>'
            + '<button onclick="_tlMoveBoardOrder(' + idx + ',1)" ' + (idx === _tlBoardOrderList.length - 1 ? 'disabled style="opacity:0.3;cursor:not-allowed"' : 'style="cursor:pointer"') + ' class="btn btn-sm">⬇️ Xuống</button>'
            + '</div>'
            + '</div>';
    });
    body += '</div>';

    var footer = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button> <button class="btn" onclick="_tlSaveBoardOrder()" style="background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;border:none;font-weight:800">💾 Lưu Thứ Tự</button>';
    openModal('↕️ Sắp Xếp Thứ Tự Bảng Chính', body, footer);
}

function _tlMoveBoardOrder(index, direction) {
    var targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= _tlBoardOrderList.length) return;
    var temp = _tlBoardOrderList[index];
    _tlBoardOrderList[index] = _tlBoardOrderList[targetIndex];
    _tlBoardOrderList[targetIndex] = temp;
    _tlRenderReorderModal();
}

async function _tlSaveBoardOrder() {
    var orderIds = _tlBoardOrderList.map(function(b) { return b.id; });
    await apiCall('/api/tlxvp/boards/reorder', 'POST', { order: orderIds });
    closeModal();
    showToast('Đã lưu thứ tự Bảng Chính', 'success');
    await _tlLoadBoards();
}

// ===== RENAME BOARD =====
function _tlShowRenameBoard() {
    var board = _tl.boards.find(function(b) { return b.id == _tl.sel.boardId; });
    if (!board) return;
    var body = '<div><label style="font-weight:700;font-size:12px">Tên Bảng Chính:</label><input type="text" id="tlRenameBoardName" class="form-control" value="' + board.name.replace(/"/g,'&quot;') + '" style="margin-top:4px"></div>';
    var footer = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button> <button class="btn" onclick="_tlSaveRenameBoard()" style="background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;border:none;font-weight:800">💾 Lưu</button>';
    openModal('✏️ Đổi Tên Bảng Chính', body, footer);
}

async function _tlSaveRenameBoard() {
    var name = document.getElementById('tlRenameBoardName')?.value?.trim();
    if (!name) return showToast('Nhập tên', 'error');
    await apiCall('/api/tlxvp/boards/' + _tl.sel.boardId, 'PATCH', { name: name });
    closeModal();
    showToast('Đã đổi tên', 'success');
    await _tlLoadBoards();
}

// ===== RENAME SOURCE / BẢNG PHỤ =====
function _tlShowRenameSource() {
    var board = _tl.boards.find(function(b) { return b.id == _tl.sel.boardId; });
    if (!board) return;
    var source = (board.sources || []).find(function(s) { return s.id == _tl.sel.sourceId; });
    if (!source) return;
    var body = '<div><label style="font-weight:700;font-size:12px">Tên Bảng Phụ:</label><input type="text" id="tlRenameSourceName" class="form-control" value="' + source.name.replace(/"/g,'&quot;') + '" style="margin-top:4px"></div>';
    var footer = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button> <button class="btn" onclick="_tlSaveRenameSource()" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;font-weight:800">💾 Lưu</button>';
    openModal('✏️ Đổi Tên Bảng Phụ', body, footer);
}

async function _tlSaveRenameSource() {
    var name = document.getElementById('tlRenameSourceName')?.value?.trim();
    if (!name) return showToast('Nhập tên', 'error');
    await apiCall('/api/tlxvp/sources/' + _tl.sel.sourceId, 'PATCH', { name: name });
    closeModal();
    showToast('Đã đổi tên bảng phụ', 'success');
    await _tlLoadBoards();
}

// ===== ADD SOURCE / BẢNG PHỤ — chỉ cần nhập tên =====
function _tlShowAddSource() {
    var body = '<div style="margin-bottom:12px"><label style="font-weight:700;font-size:12px">Tên Bảng Phụ:</label><input type="text" id="tlNewSourceName" class="form-control" placeholder="VD: VẢI COTTON" style="margin-top:4px"></div>';
    var footer = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button> <button class="btn" onclick="_tlSaveNewSource()" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;font-weight:800">💾 Lưu</button>';
    openModal('➕ Tạo Bảng Phụ Mới', body, footer);
}

async function _tlSaveNewSource() {
    var name = document.getElementById('tlNewSourceName')?.value?.trim();
    if (!name) return showToast('Nhập tên bảng phụ', 'error');
    await apiCall('/api/tlxvp/sources', 'POST', { board_id: _tl.sel.boardId, name: name });
    closeModal();
    showToast('Đã tạo bảng phụ: ' + name, 'success');
    await _tlLoadBoards();
}

// ===== ADD ITEM (dynamic form theo cột Bảng Chính) =====
async function _tlShowAddItem() {
    var board = _tl.boards.find(function(b) { return b.id == _tl.sel.boardId; });
    if (!board) return showToast('Chọn bảng chính trước', 'error');
    
    var sources = board.sources || [];
    if (sources.length === 0) {
        // Tự động tạo bảng phụ mặc định nếu chưa có bảng phụ nào
        await apiCall('/api/tlxvp/sources', 'POST', { board_id: board.id, name: board.name });
        await _tlLoadBoards();
        board = _tl.boards.find(function(b) { return b.id == _tl.sel.boardId; });
        sources = board ? (board.sources || []) : [];
    }

    var selectedSourceId = _tl.sel.sourceId;
    if (!selectedSourceId && sources.length >= 1) {
        selectedSourceId = sources[0].id;
    }

    var body = '';
    if (!_tl.sel.sourceId && sources.length > 1) {
        body += '<div style="margin-bottom:12px"><label style="font-weight:700;font-size:12px">Chọn Bảng Phụ:</label>'
            + '<select id="tlSelectSourceId" class="form-control" style="margin-top:4px">'
            + sources.map(function(s) { return '<option value="' + s.id + '">' + s.name + '</option>'; }).join('')
            + '</select></div>';
    } else {
        body += '<input type="hidden" id="tlSelectSourceId" value="' + (selectedSourceId || '') + '">';
    }

    var cols = _tlGetColumns();
    cols.forEach(function(c) {
        if (c.type === 'images') {
            _tlMultiImages[c.key] = [];
            body += '<div style="margin-bottom:12px"><label style="font-weight:700;font-size:12px">' + c.label + ' (Nhiều Ảnh):</label>'
                + '<div id="tlPasteMulti_' + c.key + '" style="margin-top:4px"></div>'
                + '<input type="hidden" class="tl-item-field" data-key="' + c.key + '">'
                + '</div>';
            setTimeout(function() { _tlRenderMultiImagesZone(c.key); }, 50);
        } else if (c.type === 'image') {
            body += '<div style="margin-bottom:8px"><label style="font-weight:700;font-size:12px">' + c.label + ':</label>'
                + '<div class="tl-paste-zone" id="tlPaste_' + c.key + '" data-key="' + c.key + '" onclick="document.getElementById(\'tlFile_' + c.key + '\').click()" style="margin-top:4px">'
                + '<div class="tl-paste-hint">📷 Click để chọn ảnh</div>'
                + '</div>'
                + '<input type="file" id="tlFile_' + c.key + '" accept="image/*" style="display:none" onchange="_tlHandleFileSelect(this,\'' + c.key + '\')">'
                + '<input type="hidden" class="tl-item-field" data-key="' + c.key + '">'
                + '</div>';
        } else if (c.type === 'video') {
            var isLocalVideo = val && (String(val).startsWith('/uploads/tlxvp/videos/') || String(val).startsWith('/uploads/tlxvp/'));
            body += '<div style="margin-bottom:12px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px">'
                + '<label style="font-weight:800;font-size:13px;color:#1e293b;display:block;margin-bottom:6px">🎬 ' + c.label + ' (Video):</label>'
                + '<div style="margin-bottom:6px">'
                + '<button type="button" class="btn btn-sm" onclick="document.getElementById(\'tlVideoFile_' + c.key + '\').click()" style="background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;font-weight:700;border:none;padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer">🎥 Chọn File Video Từ Máy / Điện Thoại (Tự động nén HD)</button>'
                + '<input type="file" id="tlVideoFile_' + c.key + '" accept="video/*" style="display:none" onchange="if(this.files&&this.files[0])_tlUploadVideo(this.files[0], \'' + c.key + '\')">'
                + '<div id="tlVideoStatus_' + c.key + '" style="margin-top:6px;display:none"></div>'
                + '<div id="tlVideoPlayer_' + c.key + '" style="margin-top:4px;display:none"></div>'
                + '</div>'
                + '<input type="hidden" class="tl-item-field" data-key="' + c.key + '">'
                + '</div>';
        } else if (c.type === 'link') {
            body += '<div style="margin-bottom:8px"><label style="font-weight:700;font-size:12px">' + c.label + ' (Link Google Drive):</label>'
                + '<input type="url" class="form-control tl-item-field" data-key="' + c.key + '" placeholder="https://drive.google.com/..." style="margin-top:4px">'
                + '<div style="font-size:11px;color:#64748b;margin-top:2px">💡 Nhập đường link Google Drive (dạng https://drive.google.com/...)</div>'
                + '</div>';
        } else {
            var inputType = c.type === 'number' ? 'number' : 'text';
            body += '<div style="margin-bottom:8px"><label style="font-weight:700;font-size:12px">' + c.label + ':</label><input type="' + inputType + '" class="form-control tl-item-field" data-key="' + c.key + '" style="margin-top:4px"></div>';
        }
    });

    var footer = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button> <button class="btn" onclick="_tlSaveNewItem()" style="background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;border:none;font-weight:800">💾 Lưu</button>';
    openModal('➕ Thêm Tư Liệu: ' + board.name, body, footer);
    _tlBindPasteZones();
}

async function _tlSaveNewItem() {
    var sourceId = document.getElementById('tlSelectSourceId')?.value || _tl.sel.sourceId;
    if (!sourceId) return showToast('Vui lòng chọn Bảng Phụ', 'error');
    var name = 'item_' + Date.now();
    var data = {};
    var cols = _tlGetColumns();

    // Kiểm tra tính hợp lệ của tất cả các cột dạng link
    for (var i = 0; i < cols.length; i++) {
        var c = cols[i];
        if (c.type === 'link') {
            var inp = document.querySelector('.tl-item-field[data-key="' + c.key + '"]');
            var rawVal = inp ? inp.value.trim() : '';
            if (rawVal && !rawVal.startsWith('/uploads/tlxvp/')) {
                var normVal = _tlNormalizeDriveUrl(rawVal);
                if (!_tlIsGoogleDriveUrl(normVal)) {
                    showToast('Cột "' + c.label + '" phải là đường link hợp lệ hoặc link Google Drive (dạng https://drive.google.com/...)', 'error');
                    if (inp) inp.focus();
                    return;
                }
            }
        }
    }

    document.querySelectorAll('.tl-item-field').forEach(function(inp) {
        var key = inp.dataset.key;
        var val = inp.value;
        var colDef = cols.find(function(col) { return col.key === key; });
        if (colDef && colDef.type === 'link') {
            val = _tlNormalizeDriveUrl(val);
        }

        if (inp.type === 'number') {
            data[key] = Number(val) || 0;
        } else if (val && typeof val === 'string' && (val.trim().startsWith('[') || val.trim().startsWith('{'))) {
            try { data[key] = JSON.parse(val); } catch(e) { data[key] = val; }
        } else {
            data[key] = val || '';
        }
    });
    await apiCall('/api/tlxvp/items', 'POST', { board_id: _tl.sel.boardId, source_id: Number(sourceId), name: name, data: data });
    closeModal();
    showToast('Đã thêm tư liệu mới', 'success');
    await _tlLoadBoards();
    _tlLoadItems();
}

// ===== EDIT ITEM =====
function _tlEditItem(id) {
    var item = _tl.items.find(function(it) { return it.id === id; });
    if (!item) return;
    var cols = _tlGetColumns();

    var body = '';
    cols.forEach(function(c) {
        var val = (item.data || {})[c.key];
        if (val === undefined || val === null) val = '';
        if (c.type === 'images') {
            var arr = [];
            if (Array.isArray(val)) arr = val;
            else if (typeof val === 'string' && val.startsWith('[')) {
                try { arr = JSON.parse(val); } catch(e) { arr = val ? [val] : []; }
            } else if (val) {
                arr = [val];
            }
            _tlMultiImages[c.key] = arr;
            body += '<div style="margin-bottom:12px"><label style="font-weight:700;font-size:12px">' + c.label + ' (Nhiều Ảnh):</label>'
                + '<div id="tlPasteMulti_' + c.key + '" style="margin-top:4px"></div>'
                + '<input type="hidden" class="tl-edit-field" data-key="' + c.key + '" value="' + String(JSON.stringify(arr)).replace(/"/g,'&quot;') + '">'
                + '</div>';
            setTimeout(function() { _tlRenderMultiImagesZone(c.key); }, 50);
        } else if (c.type === 'image') {
            var parsedImg = _tlParseImageUrl(val);
            var hasImg = !!parsedImg.url;
            var valToSave = hasImg ? (typeof val === 'object' ? JSON.stringify(val) : String(val)) : '';
            body += '<div style="margin-bottom:8px"><label style="font-weight:700;font-size:12px">' + c.label + ':</label>'
                + '<div class="tl-paste-zone' + (hasImg ? ' has-img' : '') + '" id="tlPaste_' + c.key + '" data-key="' + c.key + '" onclick="document.getElementById(\'tlFile_' + c.key + '\').click()" style="margin-top:4px">'
                + (hasImg ? '<img src="' + parsedImg.url + '" onclick="event.stopPropagation();_tlShowLightbox(\'' + parsedImg.url.replace(/'/g,"\\'") + '\',\'' + parsedImg.raw_url.replace(/'/g,"\\'") + '\')"><button class="tl-paste-remove" onclick="event.stopPropagation();_tlRemovePasteImg(\'' + c.key + '\')" title="Xóa">✕</button>' : '<div class="tl-paste-hint">📷 Click để chọn ảnh</div>')
                + '</div>'
                + '<input type="file" id="tlFile_' + c.key + '" accept="image/*" style="display:none" onchange="_tlHandleFileSelect(this,\'' + c.key + '\')">'
                + '<input type="hidden" class="tl-edit-field" data-key="' + c.key + '" value="' + valToSave.replace(/"/g,'&quot;') + '">'
                + '</div>';
        } else if (c.type === 'video') {
            var isLocalVideo = val && (String(val).startsWith('/uploads/tlxvp/videos/') || String(val).startsWith('/uploads/tlxvp/'));
            body += '<div style="margin-bottom:12px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px">'
                + '<label style="font-weight:800;font-size:13px;color:#1e293b;display:block;margin-bottom:6px">🎬 ' + c.label + ' (Video):</label>'
                + '<div style="margin-bottom:6px">'
                + '<button type="button" class="btn btn-sm" onclick="document.getElementById(\'tlVideoFile_' + c.key + '\').click()" style="background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;font-weight:700;border:none;padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer">🎥 Chọn File Video Từ Máy / Điện Thoại (Tự động nén HD)</button>'
                + '<input type="file" id="tlVideoFile_' + c.key + '" accept="video/*" style="display:none" onchange="if(this.files&&this.files[0])_tlUploadVideo(this.files[0], \'' + c.key + '\')">'
                + '<div id="tlVideoStatus_' + c.key + '" style="margin-top:6px;' + (isLocalVideo ? '' : 'display:none') + '">'
                + (isLocalVideo ? '<div style="padding:6px 10px;background:#f0fdf4;border:1px solid #6ee7b7;border-radius:8px;color:#047857;font-weight:700;font-size:11px">✅ Đã có video tải trực tiếp</div>' : '')
                + '</div>'
                + '<div id="tlVideoPlayer_' + c.key + '" style="margin-top:4px;' + (isLocalVideo ? '' : 'display:none') + '">'
                + (isLocalVideo ? '<video src="' + val + '" controls style="max-width:100%;max-height:150px;border-radius:8px;background:#000"></video>' : '')
                + '</div>'
                + '</div>'
                + '<input type="hidden" class="tl-edit-field" data-key="' + c.key + '" value="' + String(val).replace(/"/g,'&quot;') + '">'
                + '</div>';
        } else if (c.type === 'link') {
            body += '<div style="margin-bottom:8px"><label style="font-weight:700;font-size:12px">' + c.label + ' (Link Google Drive):</label>'
                + '<input type="url" class="form-control tl-edit-field" data-key="' + c.key + '" placeholder="https://drive.google.com/..." value="' + String(val).replace(/"/g,'&quot;') + '" style="margin-top:4px">'
                + '<div style="font-size:11px;color:#64748b;margin-top:2px">💡 Nhập đường link Google Drive (dạng https://drive.google.com/...)</div>'
                + '</div>';
        } else {
            var inputType = c.type === 'number' ? 'number' : 'text';
            body += '<div style="margin-bottom:8px"><label style="font-weight:700;font-size:12px">' + c.label + ':</label><input type="' + inputType + '" class="form-control tl-edit-field" data-key="' + c.key + '" value="' + String(val).replace(/"/g,'&quot;') + '" style="margin-top:4px"></div>';
        }
    });

    var footer = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button> <button class="btn" onclick="_tlSaveEditItem(' + id + ')" style="background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;border:none;font-weight:800">💾 Lưu</button>';
    openModal('✏️ Sửa dòng', body, footer);
    _tlBindPasteZones();
}

async function _tlSaveEditItem(id) {
    var data = {};
    var cols = _tlGetColumns();

    // Kiểm tra tính hợp lệ của tất cả các cột dạng link
    for (var i = 0; i < cols.length; i++) {
        var c = cols[i];
        if (c.type === 'link') {
            var inp = document.querySelector('.tl-edit-field[data-key="' + c.key + '"]');
            var rawVal = inp ? inp.value.trim() : '';
            if (rawVal && !rawVal.startsWith('/uploads/tlxvp/')) {
                var normVal = _tlNormalizeDriveUrl(rawVal);
                if (!_tlIsGoogleDriveUrl(normVal)) {
                    showToast('Cột "' + c.label + '" phải là đường link hợp lệ hoặc link Google Drive (dạng https://drive.google.com/...)', 'error');
                    if (inp) inp.focus();
                    return;
                }
            }
        }
    }

    document.querySelectorAll('.tl-edit-field').forEach(function(inp) {
        var key = inp.dataset.key;
        var val = inp.value;
        var colDef = cols.find(function(col) { return col.key === key; });
        if (colDef && colDef.type === 'link') {
            val = _tlNormalizeDriveUrl(val);
        }

        if (inp.type === 'number') {
            data[key] = Number(val) || 0;
        } else if (val && typeof val === 'string' && (val.trim().startsWith('[') || val.trim().startsWith('{'))) {
            try { data[key] = JSON.parse(val); } catch(e) { data[key] = val; }
        } else {
            data[key] = val || '';
        }
    });
    await apiCall('/api/tlxvp/items/' + id, 'PATCH', { data: data });
    closeModal();
    showToast('Đã cập nhật', 'success');
    await _tlLoadBoards();
    _tlLoadItems();
}

// ===== DELETE ITEM =====
async function _tlDeleteItem(id) {
    if (!confirm('Xóa tư liệu này?')) return;
    await apiCall('/api/tlxvp/items/' + id, 'DELETE');
    showToast('Đã xóa', 'success');
    await _tlLoadBoards();
    _tlLoadItems();
}

// ===== DELETE BOARD / BẢNG CHÍNH =====
async function _tlDeleteBoard() {
    var board = _tl.boards.find(function(b) { return b.id == _tl.sel.boardId; });
    if (!board) return;
    if (!confirm('Xóa bảng chính "' + board.name + '" và TẤT CẢ bảng phụ + tư liệu bên trong?')) return;
    await apiCall('/api/tlxvp/boards/' + board.id, 'DELETE');
    _tl.sel = { boardId: null, sourceId: null };
    showToast('Đã xóa bảng chính', 'success');
    await _tlLoadBoards();
}

// ===== DELETE SOURCE / BẢNG PHỤ =====
async function _tlDeleteSource() {
    var board = _tl.boards.find(function(b) { return b.id == _tl.sel.boardId; });
    if (!board) return;
    var source = (board.sources || []).find(function(s) { return s.id == _tl.sel.sourceId; });
    if (!source) return;
    if (!confirm('Xóa bảng phụ "' + source.name + '" và TẤT CẢ tư liệu bên trong?')) return;
    await apiCall('/api/tlxvp/sources/' + source.id, 'DELETE');
    _tl.sel = { boardId: _tl.sel.boardId, sourceId: null };
    showToast('Đã xóa bảng phụ', 'success');
    await _tlLoadBoards();
    _tlLoadItems();
}

function _tlMoveColRow(btn, direction) {
    var row = btn.closest('div');
    if (!row) return;
    if (direction === -1 && row.previousElementSibling) {
        row.parentElement.insertBefore(row, row.previousElementSibling);
    } else if (direction === 1 && row.nextElementSibling) {
        row.parentElement.insertBefore(row.nextElementSibling, row);
    }
}

function _tlAddColRow(containerId) {
    var c = document.getElementById(containerId); if (!c) return;
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px;background:#f8fafc;padding:6px;border:1px solid #e2e8f0;border-radius:8px';
    row.innerHTML = '<button type="button" class="btn btn-sm" onclick="_tlMoveColRow(this, -1)" style="background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe;padding:4px 8px;border-radius:6px;font-weight:800;font-size:11px;cursor:pointer" title="Di chuyển cột lên trước">⬆️</button>'
        + '<button type="button" class="btn btn-sm" onclick="_tlMoveColRow(this, 1)" style="background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe;padding:4px 8px;border-radius:6px;font-weight:800;font-size:11px;cursor:pointer" title="Di chuyển cột xuống sau">⬇️</button>'
        + '<input type="text" class="form-control tl-col-label" placeholder="Tên cột" style="flex:1;font-size:12px">'
        + '<select class="form-control tl-col-type" style="width:130px;font-size:12px"><option value="text">Text</option><option value="number">Number</option><option value="image">1 Hình Ảnh</option><option value="images">Nhiều Hình Ảnh</option><option value="video">Video</option><option value="link">Đường Dẫn Link</option></select>'
        + '<button type="button" onclick="this.parentElement.remove()" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;padding:4px 8px;border-radius:6px;font-size:11px;cursor:pointer" title="Xóa cột này">🗑️</button>';
    c.appendChild(row);
}

// ===== EDIT COLUMNS — sửa & sắp xếp cột của Bảng Chính =====
function _tlShowEditColumns() {
    var board = _tl.boards.find(function(b) { return b.id == _tl.sel.boardId; });
    if (!board) return showToast('Chọn bảng chính trước', 'error');
    var cols = _tlGetColumns();

    var body = '<div id="tlEditCols">';
    cols.forEach(function(c) {
        body += '<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;background:#f8fafc;padding:6px;border:1px solid #e2e8f0;border-radius:8px">'
            + '<button type="button" class="btn btn-sm" onclick="_tlMoveColRow(this, -1)" style="background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe;padding:4px 8px;border-radius:6px;font-weight:800;font-size:11px;cursor:pointer" title="Di chuyển cột lên trước">⬆️</button>'
            + '<button type="button" class="btn btn-sm" onclick="_tlMoveColRow(this, 1)" style="background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe;padding:4px 8px;border-radius:6px;font-weight:800;font-size:11px;cursor:pointer" title="Di chuyển cột xuống sau">⬇️</button>'
            + '<input type="text" class="form-control tl-col-label" data-key="' + c.key + '" value="' + c.label.replace(/"/g,'&quot;') + '" style="flex:1;font-size:12px">'
            + '<select class="form-control tl-col-type" style="width:130px;font-size:12px">'
            + '<option value="text"' + (c.type==='text'?' selected':'') + '>Text</option>'
            + '<option value="number"' + (c.type==='number'?' selected':'') + '>Number</option>'
            + '<option value="image"' + (c.type==='image'?' selected':'') + '>1 Hình Ảnh</option>'
            + '<option value="images"' + (c.type==='images'?' selected':'') + '>Nhiều Hình Ảnh</option>'
            + '<option value="video"' + (c.type==='video'?' selected':'') + '>Video</option>'
            + '<option value="link"' + (c.type==='link'?' selected':'') + '>Đường Dẫn Link</option>'
            + '</select>'
            + '<button type="button" onclick="this.parentElement.remove()" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;padding:4px 8px;border-radius:6px;font-size:11px;cursor:pointer" title="Xóa cột này">🗑️</button>'
            + '</div>';
    });
    body += '</div>';
    body += '<button onclick="_tlAddColRow(\'tlEditCols\')" style="margin-top:6px;background:#eef2ff;color:#4f46e5;border:1px dashed #a5b4fc;padding:6px 14px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">➕ Thêm Cột Mới</button>';
    body += '<div style="margin-top:12px;padding:8px;background:#fef3c7;border-radius:8px;font-size:11px;color:#92400e">💡 Dùng nút ⬆️ ⬇️ để sắp xếp thứ tự hiển thị cột. Xóa cột chỉ ẩn khỏi bảng, dữ liệu cũ vẫn giữ nguyên trong DB.</div>';

    var footer = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button> <button class="btn" onclick="_tlSaveEditColumns()" style="background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;border:none;font-weight:800">💾 Lưu Thứ Tự & Cột</button>';
    openModal('⚙️ Sửa & Sắp Xếp Cột: ' + board.name, body, footer);
}

async function _tlSaveEditColumns() {
    var cols = [];
    var usedKeys = {};
    document.querySelectorAll('#tlEditCols > div').forEach(function(row, idx) {
        var labelEl = row.querySelector('.tl-col-label');
        var typeEl = row.querySelector('.tl-col-type');
        var label = labelEl?.value?.trim();
        var type = typeEl?.value || 'text';
        if (label) {
            var baseKey = labelEl.dataset.key || label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
            if (!baseKey) baseKey = 'col_' + idx;
            var key = baseKey;
            var count = 1;
            while (usedKeys[key]) {
                key = baseKey + '_' + count;
                count++;
            }
            usedKeys[key] = true;
            cols.push({ key: key, label: label, type: type });
        }
    });
    await apiCall('/api/tlxvp/boards/' + _tl.sel.boardId, 'PATCH', { columns: cols });
    closeModal();
    showToast('Đã cập nhật cột bảng chính', 'success');
    await _tlLoadBoards();
    _tlLoadItems();
}

// ===== MULTI-IMAGE HELPERS =====
var _tlMultiImages = {};

function _tlRenderMultiImagesZone(key) {
    var zone = document.getElementById('tlPasteMulti_' + key);
    if (!zone) return;
    var urls = _tlMultiImages[key] || [];
    var html = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">';
    urls.forEach(function(u, idx) {
        var parsedImg = _tlParseImageUrl(u);
        var displayUrl = parsedImg.url;
        var rawUrl = parsedImg.raw_url;
        if (displayUrl) {
            html += '<div style="position:relative;display:inline-block;width:70px;height:70px;border-radius:6px;overflow:hidden;border:1px solid #cbd5e1;background:#f8fafc">'
                + '<img src="' + displayUrl + '" style="width:100%;height:100%;object-fit:cover;cursor:pointer" onclick="_tlShowLightbox(\'' + displayUrl.replace(/'/g,"\\'") + '\',\'' + rawUrl.replace(/'/g,"\\'") + '\')" title="Click xem lớn">'
                + '<button onclick="event.stopPropagation();_tlRemoveMultiImg(\'' + key + '\',' + idx + ')" style="position:absolute;top:2px;right:2px;background:rgba(220,38,38,0.85);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center" title="Xóa ảnh">✕</button>'
                + '</div>';
        }
    });
    html += '</div>';
    html += '<button type="button" onclick="document.getElementById(\'tlFileMulti_' + key + '\').click()" style="background:#eef2ff;color:#4f46e5;border:1px dashed #a5b4fc;padding:6px 14px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer">🖼️ Chọn Ảnh (Có thể chọn nhiều)</button>'
        + '<input type="file" id="tlFileMulti_' + key + '" accept="image/*" multiple style="display:none" onchange="_tlHandleMultiFileSelect(this,\'' + key + '\')">';
    zone.innerHTML = html;

    var fields = document.querySelectorAll('.tl-item-field[data-key="' + key + '"], .tl-edit-field[data-key="' + key + '"]');
    fields.forEach(function(f) { f.value = JSON.stringify(urls); });
}

async function _tlHandleMultiFileSelect(input, key) {
    if (!input.files || input.files.length === 0) return;
    if (!_tlMultiImages[key]) _tlMultiImages[key] = [];
    var files = Array.from(input.files);
    
    showToast('Đang tải lên & nén ' + files.length + ' ảnh...', 'info');
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var fd = new FormData();
        fd.append('file', file);
        try {
            var resp = await fetch('/api/tlxvp/upload', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
                body: fd
            });
            var data = await resp.json();
            if (data.success && data.url) {
                var imgObj = data.raw_url ? { url: data.url, raw_url: data.raw_url } : data.url;
                _tlMultiImages[key].push(imgObj);
            }
        } catch (e) {}
    }
    _tlRenderMultiImagesZone(key);
    showToast('Đã tải lên ' + files.length + ' ảnh (Tự động nén WebP)', 'success');
    input.value = '';
}

function _tlRemoveMultiImg(key, index) {
    if (_tlMultiImages[key]) {
        _tlMultiImages[key].splice(index, 1);
        _tlRenderMultiImagesZone(key);
    }
}

// ===== IMAGE PASTE/UPLOAD HELPERS =====
function _tlBindPasteZones() {
    if (window._tlPasteBound) return;
    window._tlPasteBound = true;
    document.addEventListener('paste', function(e) {
        var items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        var imageItem = null;
        for (var i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                imageItem = items[i];
                break;
            }
        }
        if (!imageItem) return;
        var file = imageItem.getAsFile();
        if (!file) return;

        var activeZone = document.querySelector('.tl-paste-zone');
        if (activeZone) {
            var key = activeZone.dataset.key;
            if (key) _tlUploadImage(file, key);
        }
    });
}

async function _tlUploadImage(file, key) {
    var zone = document.getElementById('tlPaste_' + key);
    if (!zone) return;
    var fileSize = file.size;
    var sizeText = fileSize < 1024 * 1024 ? (fileSize / 1024).toFixed(1) + ' KB' : (fileSize / (1024 * 1024)).toFixed(1) + ' MB';
    zone.innerHTML = '<div class="tl-paste-hint">⏳ Đang tải lên & nén (' + sizeText + ')...</div>';

    var fd = new FormData();
    fd.append('file', file);

    try {
        var resp = await fetch('/api/tlxvp/upload', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
            body: fd
        });
        var data = await resp.json();
        if (data.success && data.url) {
            var displayUrl = data.url;
            var rawUrl = data.raw_url || data.url;
            var valToSave = data.raw_url ? JSON.stringify({ url: displayUrl, raw_url: rawUrl }) : displayUrl;

            zone.classList.add('has-img');
            zone.innerHTML = '<img src="' + displayUrl + '" onclick="event.stopPropagation();_tlShowLightbox(\'' + displayUrl.replace(/'/g,"\\'") + '\',\'' + rawUrl.replace(/'/g,"\\'") + '\')">'
                + '<div style="font-size:10px;color:#059669;font-weight:700;margin-top:4px">✅ Đã nén hiển thị (' + sizeText + ') - Giữ ảnh gốc 100%</div>'
                + '<button class="tl-paste-remove" onclick="event.stopPropagation();_tlRemovePasteImg(\'' + key + '\')" title="Xóa">✕</button>';
            
            // Set hidden input
            var hiddenInputs = document.querySelectorAll('input[type="hidden"][data-key="' + key + '"]');
            if (hiddenInputs.length > 0) hiddenInputs[hiddenInputs.length - 1].value = valToSave;
            // Also set tl-item-field or tl-edit-field
            var fields = document.querySelectorAll('.tl-item-field[data-key="' + key + '"], .tl-edit-field[data-key="' + key + '"]');
            fields.forEach(function(f) { f.value = valToSave; });
        } else {
            zone.innerHTML = '<div class="tl-paste-hint">❌ Lỗi tải ảnh</div>';
            showToast('Lỗi upload: ' + (data.error || 'Unknown'), 'error');
        }
    } catch (err) {
        zone.innerHTML = '<div class="tl-paste-hint">❌ Lỗi tải ảnh</div>';
        showToast('Lỗi upload', 'error');
    }
}

function _tlHandleFileSelect(input, key) {
    if (input.files && input.files[0]) {
        _tlUploadImage(input.files[0], key);
    }
}

function _tlRemovePasteImg(key) {
    var zone = document.getElementById('tlPaste_' + key);
    if (zone) {
        zone.classList.remove('has-img');
        zone.innerHTML = '<div class="tl-paste-hint">📷 Click để chọn ảnh</div>';
    }
    // Clear hidden input
    var fields = document.querySelectorAll('input[data-key="' + key + '"]');
    fields.forEach(function(f) { if (f.type === 'hidden') f.value = ''; });
}

// ===== LIGHTBOX =====
function _tlShowLightbox(url, rawUrl) {
    var downloadUrl = rawUrl || url;
    var overlay = document.createElement('div');
    overlay.className = 'tl-lightbox';
    overlay.innerHTML = '<img src="' + url + '">'
        + '<a href="' + downloadUrl + '" download style="position:absolute;top:20px;right:90px;color:#fff;font-size:13px;font-weight:800;cursor:pointer;padding:8px 16px;border-radius:20px;background:linear-gradient(135deg,#059669,#10b981);box-shadow:0 4px 12px rgba(0,0,0,0.4);text-decoration:none;display:flex;align-items:center;gap:6px;transition:all .2s" title="Tải ảnh gốc 100% sắc nét về máy" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'">⬇️ Tải Ảnh Gốc Nét</a>'
        + '<div class="tl-lightbox-close">✕</div>';
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay || e.target.classList.contains('tl-lightbox-close')) overlay.remove();
    });
    document.body.appendChild(overlay);
}

// ===== VIDEO UPLOAD & COMPRESS HELPER =====
async function _tlUploadVideo(file, key) {
    var statusDiv = document.getElementById('tlVideoStatus_' + key);
    var playerDiv = document.getElementById('tlVideoPlayer_' + key);
    if (!statusDiv) return;
    
    var fileSize = file.size;
    var sizeText = fileSize < 1024 * 1024 ? (fileSize / 1024).toFixed(1) + ' KB' : (fileSize / (1024 * 1024)).toFixed(1) + ' MB';
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = '<div style="padding:8px 12px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;color:#4338ca;font-weight:700;font-size:12px">⏳ Đang tải lên & Nén video tự động (' + sizeText + ')... Vui lòng chờ vài giây.</div>';

    var fd = new FormData();
    fd.append('file', file);

    try {
        var resp = await fetch('/api/tlxvp/upload-video', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
            body: fd
        });
        var data = await resp.json();
        if (data.success && data.url) {
            statusDiv.innerHTML = '<div style="padding:6px 10px;background:#f0fdf4;border:1px solid #6ee7b7;border-radius:8px;color:#047857;font-weight:700;font-size:11px">✅ Nén thành công! Giữ nguyên độ nét Full HD 1080p.</div>';
            
            if (playerDiv) {
                playerDiv.style.display = 'block';
                playerDiv.innerHTML = '<video src="' + data.url + '" controls style="max-width:100%;max-height:150px;border-radius:8px;margin-top:6px;background:#000"></video>';
            }

            // Set input value to local video URL
            var fields = document.querySelectorAll('.tl-item-field[data-key="' + key + '"], .tl-edit-field[data-key="' + key + '"]');
            fields.forEach(function(f) { f.value = data.url; });
        } else {
            statusDiv.innerHTML = '<div style="padding:6px 10px;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;color:#b91c1c;font-size:11px">❌ Lỗi nén video</div>';
            showToast('Lỗi upload video: ' + (data.error || 'Unknown'), 'error');
        }
    } catch (err) {
        statusDiv.innerHTML = '<div style="padding:6px 10px;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;color:#b91c1c;font-size:11px">❌ Lỗi kết nối tải video</div>';
        showToast('Lỗi upload video', 'error');
    }
}
