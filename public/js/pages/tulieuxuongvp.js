// ========== TƯ LIỆU XƯỞNG & VP ==========
var _tl = { boards: [], items: [], sel: { boardId: null, sourceId: null } };
var _tlOpen = {};
var _tlIsGD = function() { return typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc'; };

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
        ;
        document.head.appendChild(st);
    }

    content.innerHTML = '<div class="tl-wrap"><div class="tl-sidebar" id="tlSidebar"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="tl-main">'
        +'<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center">'
        +'<div id="tlBoardTitle" style="font-size:15px;font-weight:900;color:var(--navy)">📂 Tư Liệu Xưởng & VP</div>'
        +'<div style="flex:1"></div>'
        +'<div id="tlActions"></div>'
        +'</div>'
        +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:12px;white-space:nowrap" id="tlTable"><thead id="tlThead"><tr style="background:var(--gray-800)"><th>Đang tải...</th></tr></thead><tbody id="tlTbody"><tr><td style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div>'
        +'</div></div>';

    await _tlLoadBoards();
}

// ===== LOAD BOARDS =====
async function _tlLoadBoards() {
    var data = await apiCall('/api/tlxvp/boards');
    _tl.boards = data.boards || [];
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
        h += '<div class="tl-sb-board' + (bActive ? ' active' : '') + '" onclick="_tlToggleBoard(' + b.id + ',\'' + bKey + '\')">'
            + '<span>' + (bOpen ? '▼' : '▸') + ' ' + b.name + '</span>'
            + '<span style="background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;padding:2px 10px;border-radius:10px;font-size:10px">' + (b.item_count||0) + '</span>'
            + '</div>';
        if (bOpen) {
            (b.sources || []).forEach(function(s) {
                var sActive = sel.sourceId == s.id;
                h += '<div class="tl-sb-src' + (sActive ? ' active' : '') + '" onclick="event.stopPropagation();_tlSelectSource(' + b.id + ',' + s.id + ')">'
                    + '<span>▸ ' + s.name + '</span>'
                    + '<span style="color:' + ((s.item_count||0) > 0 ? '#4f46e5' : '#999') + ';font-weight:' + ((s.item_count||0) > 0 ? '800' : '400') + '">' + (s.item_count||0) + '</span>'
                    + '</div>';
            });
        }
    });

    if (isGD) {
        h += '<div style="padding:12px;border-top:1px solid var(--gray-200)">'
            + '<button onclick="_tlShowCreateBoard()" style="width:100%;background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;border:none;padding:8px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">➕ Tạo Bảng Chính</button>'
            + '</div>';
    }
    sb.innerHTML = h;
}

function _tlToggleBoard(boardId, key) {
    _tlOpen[key] = !_tlOpen[key];
    if (_tlOpen[key]) { _tl.sel = { boardId: boardId, sourceId: null }; _tlLoadItems(); }
    _tlRenderSidebar();
}
function _tlSelectAll() { _tl.sel = { boardId: null, sourceId: null }; _tlRenderSidebar(); _tlLoadItems(); }
function _tlSelectSource(boardId, sourceId) { _tl.sel = { boardId: boardId, sourceId: sourceId }; _tlRenderSidebar(); _tlLoadItems(); }

// ===== LOAD ITEMS =====
async function _tlLoadItems() {
    var sel = _tl.sel, url = '/api/tlxvp/items?';
    if (sel.boardId) url += 'board_id=' + sel.boardId + '&';
    if (sel.sourceId) url += 'source_id=' + sel.sourceId + '&';
    var data = await apiCall(url);
    _tl.items = data.items || [];
    _tlRenderTable();
    _tlRenderActions();
}

// ===== RENDER TABLE =====
function _tlRenderTable() {
    var thead = document.getElementById('tlThead');
    var tbody = document.getElementById('tlTbody');
    if (!thead || !tbody) return;

    // Get columns for selected board
    var cols = _tlGetColumns();
    var isGD = _tlIsGD();

    // Header
    var th = '<tr style="background:var(--gray-800)"><th>Nguồn</th><th>Tên</th>';
    cols.forEach(function(c) { th += '<th>' + c.label + '</th>'; });
    if (isGD) th += '<th></th>';
    th += '</tr>';
    thead.innerHTML = th;

    // Body
    if (_tl.items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="' + (cols.length + 3) + '"><div class="empty-state"><div class="icon">📂</div><h3>Chưa có tư liệu</h3></div></td></tr>';
        return;
    }

    tbody.innerHTML = _tl.items.map(function(it) {
        var d = it.data || {};
        var row = '<tr>';
        row += '<td><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:800;color:#4f46e5;background:#eef2ff;border:1px solid #c7d2fe">' + (it.source_name||'—') + '</span></td>';
        row += '<td style="font-weight:700">' + (it.name||'—') + '</td>';
        cols.forEach(function(c) {
            var val = d[c.key];
            if (val === undefined || val === null || val === '') val = '';
            if (c.type === 'number' && val !== '') val = Number(val).toLocaleString('vi-VN');
            row += '<td' + (c.type === 'number' ? ' style="text-align:right"' : '') + '>' + (val || '') + '</td>';
        });
        if (isGD) {
            row += '<td style="white-space:nowrap">'
                + '<button class="btn btn-sm" onclick="_tlEditItem(' + it.id + ')" title="Sửa">✏️</button>'
                + '<button class="btn btn-sm" onclick="_tlDeleteItem(' + it.id + ')" title="Xóa" style="color:var(--danger)">🗑️</button>'
                + '</td>';
        }
        row += '</tr>';
        return row;
    }).join('');
}

function _tlGetColumns() {
    var sel = _tl.sel;
    if (sel.boardId) {
        var board = _tl.boards.find(function(b) { return b.id == sel.boardId; });
        if (board && board.columns && board.columns.length > 0) return board.columns;
    }
    // If "All" selected and multiple boards, merge unique columns
    var allCols = []; var seen = {};
    _tl.boards.forEach(function(b) {
        (b.columns || []).forEach(function(c) {
            if (!seen[c.key]) { seen[c.key] = true; allCols.push(c); }
        });
    });
    return allCols;
}

// ===== ACTIONS =====
function _tlRenderActions() {
    var el = document.getElementById('tlActions'); if (!el) return;
    var isGD = _tlIsGD();
    var sel = _tl.sel;
    var title = document.getElementById('tlBoardTitle');

    if (!isGD) { el.innerHTML = ''; return; }
    if (!sel.boardId) {
        if (title) title.textContent = '📂 Tư Liệu Xưởng & VP — Tất cả';
        el.innerHTML = '';
        return;
    }

    var board = _tl.boards.find(function(b) { return b.id == sel.boardId; });
    if (!board) return;
    if (title) title.textContent = '📂 ' + board.name;

    var btns = '<button onclick="_tlShowAddSource()" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;margin-right:6px">➕ Thêm Nguồn</button>'
        + '<button onclick="_tlShowAddItem()" style="background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;border:none;padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;margin-right:6px">➕ Thêm Tư Liệu</button>'
        + '<button onclick="_tlShowEditColumns()" style="background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;border:none;padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;margin-right:6px">⚙️ Sửa Cột</button>'
        + '<button onclick="_tlDeleteBoard()" style="background:none;border:1px solid #fca5a5;color:#dc2626;padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">🗑️ Xóa Bảng</button>';
    el.innerHTML = btns;
}

// ===== CREATE BOARD MODAL =====
function _tlShowCreateBoard() {
    var body = '<div style="margin-bottom:12px"><label style="font-weight:700;font-size:12px">Tên Bảng:</label><input type="text" id="tlNewBoardName" class="form-control" placeholder="VD: BẢNG MẪU VẢI" style="margin-top:4px"></div>'
        + '<div><label style="font-weight:700;font-size:12px">📊 Định Nghĩa Cột:</label>'
        + '<div id="tlNewCols" style="margin-top:8px"></div>'
        + '<button onclick="_tlAddColRow(\'tlNewCols\')" style="margin-top:6px;background:#eef2ff;color:#4f46e5;border:1px dashed #a5b4fc;padding:4px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">➕ Thêm Cột</button>'
        + '</div>';
    var footer = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button> <button class="btn" onclick="_tlSaveNewBoard()" style="background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;border:none;font-weight:800">💾 Lưu Bảng</button>';
    openModal('➕ Tạo Bảng Chính Mới', body, footer);
    _tlAddColRow('tlNewCols');
    _tlAddColRow('tlNewCols');
}

function _tlAddColRow(containerId) {
    var c = document.getElementById(containerId); if (!c) return;
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:4px';
    row.innerHTML = '<input type="text" class="form-control tl-col-label" placeholder="Tên cột" style="flex:1;font-size:12px">'
        + '<select class="form-control tl-col-type" style="width:100px;font-size:12px"><option value="text">Text</option><option value="number">Number</option></select>'
        + '<button onclick="this.parentElement.remove()" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;padding:4px 8px;border-radius:6px;font-size:11px;cursor:pointer">🗑️</button>';
    c.appendChild(row);
}

async function _tlSaveNewBoard() {
    var name = document.getElementById('tlNewBoardName')?.value?.trim();
    if (!name) return showToast('Nhập tên bảng', 'error');
    var cols = [];
    document.querySelectorAll('#tlNewCols > div').forEach(function(row) {
        var label = row.querySelector('.tl-col-label')?.value?.trim();
        var type = row.querySelector('.tl-col-type')?.value || 'text';
        if (label) {
            var key = label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
            cols.push({ key: key, label: label, type: type });
        }
    });
    if (cols.length === 0) return showToast('Thêm ít nhất 1 cột', 'error');
    await apiCall('/api/tlxvp/boards', 'POST', { name: name, columns: cols });
    closeModal();
    showToast('Đã tạo bảng: ' + name, 'success');
    await _tlLoadBoards();
}

// ===== ADD SOURCE =====
function _tlShowAddSource() {
    var body = '<div><label style="font-weight:700;font-size:12px">Tên Nguồn:</label><input type="text" id="tlNewSourceName" class="form-control" placeholder="VD: NGUỒN PT" style="margin-top:4px"></div>';
    var footer = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button> <button class="btn" onclick="_tlSaveNewSource()" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;font-weight:800">💾 Lưu</button>';
    openModal('➕ Thêm Nguồn', body, footer);
}

async function _tlSaveNewSource() {
    var name = document.getElementById('tlNewSourceName')?.value?.trim();
    if (!name) return showToast('Nhập tên nguồn', 'error');
    await apiCall('/api/tlxvp/sources', 'POST', { board_id: _tl.sel.boardId, name: name });
    closeModal();
    showToast('Đã thêm nguồn: ' + name, 'success');
    await _tlLoadBoards();
}

// ===== ADD ITEM (dynamic form) =====
function _tlShowAddItem() {
    var board = _tl.boards.find(function(b) { return b.id == _tl.sel.boardId; });
    if (!board) return;
    var sources = board.sources || [];
    if (sources.length === 0) return showToast('Thêm Nguồn trước', 'error');

    var body = '<div style="margin-bottom:12px"><label style="font-weight:700;font-size:12px">Nguồn:</label><select id="tlItemSource" class="form-control" style="margin-top:4px">';
    sources.forEach(function(s) {
        var selected = _tl.sel.sourceId == s.id ? ' selected' : '';
        body += '<option value="' + s.id + '"' + selected + '>' + s.name + '</option>';
    });
    body += '</select></div>';
    body += '<div style="margin-bottom:12px"><label style="font-weight:700;font-size:12px">Tên:</label><input type="text" id="tlItemName" class="form-control" style="margin-top:4px"></div>';
    (board.columns || []).forEach(function(c) {
        var inputType = c.type === 'number' ? 'number' : 'text';
        body += '<div style="margin-bottom:8px"><label style="font-weight:700;font-size:12px">' + c.label + ':</label><input type="' + inputType + '" class="form-control tl-item-field" data-key="' + c.key + '" style="margin-top:4px"></div>';
    });

    var footer = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button> <button class="btn" onclick="_tlSaveNewItem()" style="background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;border:none;font-weight:800">💾 Lưu</button>';
    openModal('➕ Thêm vào: ' + board.name, body, footer);
}

async function _tlSaveNewItem() {
    var name = document.getElementById('tlItemName')?.value?.trim();
    var sourceId = document.getElementById('tlItemSource')?.value;
    if (!name) return showToast('Nhập tên', 'error');
    var data = {};
    document.querySelectorAll('.tl-item-field').forEach(function(inp) {
        var key = inp.dataset.key;
        data[key] = inp.type === 'number' ? (Number(inp.value) || 0) : (inp.value || '');
    });
    await apiCall('/api/tlxvp/items', 'POST', { board_id: _tl.sel.boardId, source_id: Number(sourceId), name: name, data: data });
    closeModal();
    showToast('Đã thêm: ' + name, 'success');
    await _tlLoadBoards();
    _tlLoadItems();
}

// ===== EDIT ITEM =====
function _tlEditItem(id) {
    var item = _tl.items.find(function(it) { return it.id === id; });
    if (!item) return;
    var board = _tl.boards.find(function(b) { return b.id == item.board_id; });
    var cols = board ? (board.columns || []) : [];

    var body = '<div style="margin-bottom:12px"><label style="font-weight:700;font-size:12px">Tên:</label><input type="text" id="tlEditItemName" class="form-control" value="' + (item.name||'').replace(/"/g,'&quot;') + '" style="margin-top:4px"></div>';
    cols.forEach(function(c) {
        var val = (item.data || {})[c.key];
        if (val === undefined || val === null) val = '';
        var inputType = c.type === 'number' ? 'number' : 'text';
        body += '<div style="margin-bottom:8px"><label style="font-weight:700;font-size:12px">' + c.label + ':</label><input type="' + inputType + '" class="form-control tl-edit-field" data-key="' + c.key + '" value="' + String(val).replace(/"/g,'&quot;') + '" style="margin-top:4px"></div>';
    });

    var footer = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button> <button class="btn" onclick="_tlSaveEditItem(' + id + ')" style="background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;border:none;font-weight:800">💾 Lưu</button>';
    openModal('✏️ Sửa: ' + item.name, body, footer);
}

async function _tlSaveEditItem(id) {
    var name = document.getElementById('tlEditItemName')?.value?.trim();
    var data = {};
    document.querySelectorAll('.tl-edit-field').forEach(function(inp) {
        data[inp.dataset.key] = inp.type === 'number' ? (Number(inp.value) || 0) : (inp.value || '');
    });
    await apiCall('/api/tlxvp/items/' + id, 'PATCH', { name: name, data: data });
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

// ===== DELETE BOARD =====
async function _tlDeleteBoard() {
    var board = _tl.boards.find(function(b) { return b.id == _tl.sel.boardId; });
    if (!board) return;
    if (!confirm('Xóa bảng "' + board.name + '" và TẤT CẢ nguồn + tư liệu bên trong?')) return;
    await apiCall('/api/tlxvp/boards/' + board.id, 'DELETE');
    _tl.sel = { boardId: null, sourceId: null };
    showToast('Đã xóa bảng', 'success');
    await _tlLoadBoards();
}

// ===== EDIT COLUMNS =====
function _tlShowEditColumns() {
    var board = _tl.boards.find(function(b) { return b.id == _tl.sel.boardId; });
    if (!board) return;
    var cols = board.columns || [];

    var body = '<div id="tlEditCols">';
    cols.forEach(function(c) {
        body += '<div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">'
            + '<input type="text" class="form-control tl-ecol-label" data-key="' + c.key + '" value="' + c.label.replace(/"/g,'&quot;') + '" style="flex:1;font-size:12px">'
            + '<select class="form-control tl-ecol-type" style="width:100px;font-size:12px"><option value="text"' + (c.type==='text'?' selected':'') + '>Text</option><option value="number"' + (c.type==='number'?' selected':'') + '>Number</option></select>'
            + '<button onclick="this.parentElement.remove()" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;padding:4px 8px;border-radius:6px;font-size:11px;cursor:pointer">🗑️</button>'
            + '</div>';
    });
    body += '</div>';
    body += '<button onclick="_tlAddColRow(\'tlEditCols\')" style="margin-top:6px;background:#eef2ff;color:#4f46e5;border:1px dashed #a5b4fc;padding:4px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">➕ Thêm Cột Mới</button>';
    body += '<div style="margin-top:12px;padding:8px;background:#fef3c7;border-radius:8px;font-size:11px;color:#92400e">⚠️ Xóa cột chỉ ẩn khỏi bảng, dữ liệu cũ vẫn giữ nguyên trong DB.</div>';

    var footer = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button> <button class="btn" onclick="_tlSaveEditColumns()" style="background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;border:none;font-weight:800">💾 Lưu</button>';
    openModal('⚙️ Sửa Cột: ' + board.name, body, footer);
}

async function _tlSaveEditColumns() {
    var cols = [];
    document.querySelectorAll('#tlEditCols > div').forEach(function(row) {
        var labelEl = row.querySelector('.tl-ecol-label');
        var typeEl = row.querySelector('.tl-ecol-type');
        var label = labelEl?.value?.trim();
        var type = typeEl?.value || 'text';
        if (label) {
            var key = labelEl.dataset.key || label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
            cols.push({ key: key, label: label, type: type });
        }
    });
    await apiCall('/api/tlxvp/boards/' + _tl.sel.boardId, 'PATCH', { columns: cols });
    closeModal();
    showToast('Đã cập nhật cột', 'success');
    await _tlLoadBoards();
    _tlLoadItems();
}
