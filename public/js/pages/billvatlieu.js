// ========== BILL NHẬP VẬT LIỆU — Desktop SPA ==========
var _bvl = { 
    records: [], 
    tree: null, 
    filter: { source_id: null, warehouse_id: null }, 
    search: '', 
    sources: [], 
    isDuyet: false, 
    uploadImg: null,
    warehouses: [],
    materials: [],
    warehouse_sources: []
};

var _selectedSetupWhIdForMat = null;
var _selectedSetupWhIdForSrc = null;

function renderBillvatlieuPage(content) {
    if (!document.getElementById('_bvlS')) {
        var st = document.createElement('style');
        st.id = '_bvlS';
        st.textContent = '.bvl-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden}.bvl-sb{width:280px;min-width:280px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto}.bvl-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;padding:16px}.bvl-main>*{flex-shrink:0}'
            + '.bvl-sb-title{font-size:13px;font-weight:800;padding:16px;border-bottom:1px solid var(--gray-200);text-align:center;color:#0d9488;display:flex;justify-content:space-between;align-items:center}'
            + '.bvl-sb-total{background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;padding:12px 16px;font-size:12px;font-weight:700;cursor:pointer}'
            + '.bvl-sb-total .tv{font-size:16px;font-weight:900}.bvl-sb-total .ts{font-size:10px;opacity:.85;margin-top:2px}'
            + '.bvl-sb-src{padding:10px 16px;font-size:11px;font-weight:600;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f0f0f0;color:#374151;gap:6px}'
            + '.bvl-sb-src:hover{background:#f0fdfa}.bvl-sb-src.active{background:#ccfbf1;color:#0d9488;font-weight:800}'
            + '.bvl-sb-src .sn{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bvl-sb-src .sc{font-size:9px;color:#0d9488;font-weight:800;white-space:nowrap}'
            + '.bvl-sb-src .sm{font-size:9px;color:#94a3b8;white-space:nowrap}'
            + '.bvl-ib{width:26px;height:26px;border-radius:6px;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:12px;transition:all .15s}'
            + '.bvl-ib:hover{transform:scale(1.15);box-shadow:0 2px 8px rgba(0,0,0,0.12)}'
            + '.bvl-ib.on{background:#ccfbf1;border-color:#14b8a6}'
            + '.bvl-debt{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:800}'
            + '.bvl-debt.red{background:#fee2e2;color:#dc2626}.bvl-debt.green{background:#d1fae5;color:#059669}.bvl-debt.blue{background:#dbeafe;color:#2563eb}'
            + '.bvl-add-src{padding:8px 16px;font-size:11px;font-weight:600;cursor:pointer;color:#0d9488;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:6px}'
            + '.bvl-add-src:hover{background:#f0fdfa}'
            + '.bvl-fab-btn{background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;padding:6px 16px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;border:none;white-space:nowrap;transition:all .2s;box-shadow:0 2px 8px #0d948830}'
            + '.bvl-fab-btn:hover{transform:translateY(-1px);box-shadow:0 4px 16px #0d948850}'
            + '.bvl-tab-btn{padding:12px 16px;background:none;border:none;border-bottom:3px solid transparent;font-weight:600;color:#64748b;cursor:pointer;font-size:13px;transition:all .2s}'
            + '.bvl-tab-btn:hover{color:#0d9488}.bvl-tab-btn.active{border-bottom-color:#0d9488;color:#0d9488;font-weight:700}'
            + '@media(max-width:768px){.bvl-sb{display:none}}';
        document.head.appendChild(st);
    }

    var u = window._currentUser || {};
    var setupBtnHtml = u.role === 'giam_doc' ? '<button class="bvl-fab-btn" style="background:#475569;box-shadow:0 2px 8px #47556930;margin-right:4px" onclick="_bvlOpenSetup()">⚙️ Cấu Hình Kho</button>' : '';

    content.innerHTML = '<div class="bvl-wrap"><div class="bvl-sb" id="bvlSb"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="bvl-main">'
        + '<div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;align-items:center">'
        + '<div id="bvlInfo" style="font-size:12px"></div>'
        + '<div id="bvlStats" style="display:flex;gap:6px;flex:1;justify-content:center;flex-wrap:nowrap;overflow-x:auto"></div>'
        + '<select id="bvlWhFilter" onchange="_bvlWhFilterChange(this.value)" style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:170px;outline:none;font-weight:700;color:#1e293b">'
        + '<option value="">— Tất cả Kho —</option>'
        + '</select>'
        + setupBtnHtml
        + '<button id="bvlFabBtn" class="bvl-fab-btn" onclick="_bvlOpenMat()">📦 Nhập Vật Liệu</button>'
        + '<input id="bvlSearch" placeholder="🔍 Tìm vật liệu / nguồn..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:200px;outline:none"></div>'
        + '<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:11px;white-space:nowrap" id="bvlTable"><thead><tr style="background:var(--gray-800)">'
        + '<th style="text-align:center">STT</th><th style="text-align:center">Duyệt</th><th style="text-align:center">TT</th><th>Ngày Nhập</th><th>Nguồn & Kho</th><th>NV Nhập</th><th>Tên Vật Liệu</th><th style="text-align:center">Số Lượng</th><th style="text-align:right">Chi Phí</th><th style="text-align:right">Hoàn</th><th style="text-align:right">Thành Tiền</th><th style="text-align:right">Thanh Toán</th><th style="text-align:center">Công Nợ</th><th>Ghi Chú CP</th><th>Cập Nhật</th>'
        + '</tr></thead><tbody id="bvlTb"><tr><td colspan="15" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div></div></div>';

    var _t;
    document.getElementById('bvlSearch').addEventListener('input', function () {
        clearTimeout(_t);
        _t = setTimeout(function () {
            _bvl.search = document.getElementById('bvlSearch').value || '';
            _bvlRender();
        }, 300);
    });
    _bvlLoadAll();
}

async function _bvlWhFilterChange(val) {
    _bvl.filter.warehouse_id = val ? Number(val) : null;
    _bvl.filter.source_id = null; // Clear active source selection to avoid mismatch
    await _bvlLoadAll();
}

async function _bvlLoadAll() {
    try {
        var treeQs = '?record_type=general';
        if (_bvl.filter.warehouse_id) treeQs += '&warehouse_id=' + _bvl.filter.warehouse_id;

        var [tR, sR, dR, setupRes] = await Promise.all([
            apiCall('/api/import/tree' + treeQs),
            apiCall('/api/import/sources'),
            apiCall('/api/import/check-duyet-perm'),
            apiCall('/api/material-setup/data').catch(function () { return { warehouses: [], materials: [], warehouse_sources: [] }; })
        ]);
        
        _bvl.tree = tR;
        _bvl.sources = sR.sources || [];
        _bvl.isDuyet = dR.allowed || false;
        
        _bvl.warehouses = setupRes.warehouses || [];
        _bvl.materials = setupRes.materials || [];
        _bvl.warehouse_sources = setupRes.warehouse_sources || [];

        _bvlRenderSb();
        _bvlRenderWhFilter();
        await _bvlLoadRecs();
    } catch (e) {
        console.error('[BVL]', e);
    }
}

function _bvlRenderWhFilter() {
    var select = document.getElementById('bvlWhFilter');
    if (!select) return;
    var currentVal = _bvl.filter.warehouse_id || '';
    var html = '<option value="">— Tất cả Kho —</option>';
    _bvl.warehouses.forEach(function (w) {
        if (w.is_active) {
            var selected = currentVal == w.id ? ' selected' : '';
            html += '<option value="' + w.id + '"' + selected + '>📦 ' + w.name + '</option>';
        }
    });
    select.innerHTML = html;
}

function _bvlFM(n) { if (!n && n !== 0) return '0'; return Number(n).toLocaleString('vi-VN'); }
function _bvlFD(d) { if (!d) return '—'; try { var p = d.split('T')[0].split('-'); return p[2] + '/' + p[1] + '/' + p[0]; } catch (e) { return d; } }

function _bvlRenderSb() {
    var sb = document.getElementById('bvlSb');
    if (!sb) return;
    var t = _bvl.tree, f = _bvl.filter;
    var h = '<div class="bvl-sb-title"><span>────── 📦 Bill Vật Liệu ──────</span></div>';
    if (t && t.totals) {
        var tt = t.totals;
        h += '<div class="bvl-sb-total" onclick="_bvlFilter()"><div style="display:flex;justify-content:space-between;align-items:center"><span>📦 Tất cả NCC</span><span class="tv">' + (tt.total || 0) + '</span></div><div class="ts">💰 ' + _bvlFM(tt.sum_total) + ' ₫' + (Number(tt.sum_debt) > 0 ? ' &nbsp;|&nbsp; 🔴 Nợ: ' + _bvlFM(tt.sum_debt) + ' ₫' : '') + '</div></div>';
    }
    var u = window._currentUser || {};
    if (u.role === 'giam_doc' || u.role === 'quan_ly_cap_cao') {
        h += '<div class="bvl-add-src" onclick="_bvlAddSrc()">➕ Thêm nguồn cung cấp</div>';
    }
    if (t && t.sources) {
        t.sources.forEach(function (s) {
            var active = f.source_id == s.id;
            h += '<div class="bvl-sb-src' + (active ? ' active' : '') + '" onclick="_bvlFilter(' + s.id + ')"><span class="sn">🏪 ' + s.name + '</span><span class="sc">[' + s.count + ']</span><span class="sm">' + _bvlFM(s.sum_total) + '₫</span></div>';
        });
    }
    sb.innerHTML = h;
}

function _bvlFilter(sid) {
    _bvl.filter.source_id = sid || null;
    _bvlRenderSb();
    _bvlLoadRecs();
}

async function _bvlLoadRecs() {
    var f = _bvl.filter, qs = '?record_type=general';
    if (f.source_id) qs += '&source_id=' + f.source_id;
    if (f.warehouse_id) qs += '&warehouse_id=' + f.warehouse_id;
    try {
        var res = await apiCall('/api/import/records' + qs);
        _bvl.records = res.records || [];
        _bvlRender();
    } catch (e) {
        console.error('[BVL]', e);
    }
}

function _bvlDebt(d) {
    var n = Number(d) || 0;
    if (n > 0) return '<span class="bvl-debt red">🔴 ' + _bvlFM(n) + '</span>';
    if (n === 0) return '<span class="bvl-debt green">✅ Đã TT</span>';
    return '<span class="bvl-debt blue">🔵 Dư ' + _bvlFM(Math.abs(n)) + '</span>';
}

function _bvlRender() {
    var all = _bvl.records.slice();
    if (_bvl.search) {
        var q = _bvl.search.toLowerCase();
        all = all.filter(function (r) {
            return (r.fabric_material || '').toLowerCase().indexOf(q) >= 0 || (r.source_name || '').toLowerCase().indexOf(q) >= 0 || (r.warehouse_name || '').toLowerCase().indexOf(q) >= 0;
        });
    }
    var tot = all.length;
    var sumCost = 0, sumTotal = 0, sumPaid = 0, sumDebt = 0, sumQty = 0;
    all.forEach(function (r) {
        sumCost += Number(r.cost) || 0;
        sumTotal += Number(r.total_amount) || 0;
        sumPaid += Number(r.paid) || 0;
        sumDebt += Number(r.debt) || 0;
        sumQty += Number(r.fabric_quantity) || 0;
    });

    var tb = document.getElementById('bvlTb');
    if (!tb) return;
    if (!all.length) {
        tb.innerHTML = '<tr><td colspan="15"><div class="empty-state"><div class="icon">📦</div><h3>Chưa có bill nhập vật liệu</h3></div></td></tr>';
    } else {
        var runDebt = new Array(all.length);
        var cumDebt = 0;
        for (var ri = all.length - 1; ri >= 0; ri--) {
            cumDebt += Number(all[ri].debt) || 0;
            runDebt[ri] = cumDebt;
        }
        var srcDebtMap = {};
        all.forEach(function (r) {
            var sid = r.source_id || 0;
            if (!srcDebtMap[sid]) srcDebtMap[sid] = 0;
            srcDebtMap[sid] += Number(r.debt) || 0;
        });

        tb.innerHTML = all.map(function (r, i) {
            var upd = '';
            if (r.last_update_at) {
                upd = _bvlFD(r.last_update_at);
                if (r.last_update_by) upd += '<br><span style="color:#0d9488;font-size:9px">' + r.last_update_by + '</span>';
            }
            var srcDebt = srcDebtMap[r.source_id || 0] || 0;
            var duyetHtml = '', payHtml = '';
            if (!r.is_checked && _bvl.isDuyet) {
                duyetHtml = '<button class="bvl-ib" onclick="event.stopPropagation();_bvlTog(' + r.id + ',\'check\')" title="Duyệt kiểm tra">⬜</button>';
            } else if (r.is_checked) {
                duyetHtml = '<span style="font-size:11px" title="Đã duyệt: ' + (r.checked_by_name || '') + '">✅</span>';
            }
            if (Number(r.debt) > 0) {
                payHtml = '<button class="bvl-ib" style="background:#fffbeb;border-color:#f59e0b" onclick="event.stopPropagation();_bvlPayModal(' + r.id + ',' + r.debt + ',' + srcDebt + ')" title="Thanh toán">💳</button>';
            } else {
                payHtml = '<span style="font-size:11px" title="Đã thanh toán đủ">✅</span>';
            }

            var whLabel = r.warehouse_name ? '<br><span style="font-size:8px;color:#3b82f6;font-weight:800;background:#dbeafe;padding:1px 4px;border-radius:4px;display:inline-block;margin-top:2px">📦 ' + r.warehouse_name + '</span>' : '';

            return '<tr style="cursor:pointer" onclick="_bvlDetail(' + r.id + ')"><td style="text-align:center;font-weight:700;color:#94a3b8">' + (i + 1) + '</td>'
                + '<td style="text-align:center">' + duyetHtml + '</td>'
                + '<td style="text-align:center">' + payHtml + '</td>'
                + '<td style="font-size:10px">' + _bvlFD(r.import_date) + '</td>'
                + '<td style="font-size:10px;color:#0d9488;font-weight:700">' + (r.source_name || '—') + whLabel + '</td>'
                + '<td style="font-size:10px;color:#059669;font-weight:600">' + (r.importer_name || '—') + '</td>'
                + '<td style="font-weight:600;color:#1e293b;max-width:160px;overflow:hidden;text-overflow:ellipsis">' + (r.material_item_name || r.fabric_material || '—') + '</td>'
                + '<td style="text-align:center;font-weight:700;color:#0d9488">' + _bvlFM(r.fabric_quantity) + '</td>'
                + '<td style="text-align:right;font-weight:600">' + _bvlFM(r.cost) + '</td>'
                + '<td style="text-align:right;color:#f59e0b;font-weight:600">' + _bvlFM(r.refund) + '</td>'
                + '<td style="text-align:right;font-weight:800;color:#1e293b">' + _bvlFM(r.total_amount) + '</td>'
                + '<td style="text-align:right;color:#059669;font-weight:700">' + _bvlFM(r.paid) + '</td>'
                + '<td style="text-align:center">' + _bvlDebt(runDebt[i]) + '</td>'
                + '<td style="font-size:9px;max-width:80px;overflow:hidden;text-overflow:ellipsis">' + (r.cost_notes || '—') + '</td>'
                + '<td style="font-size:9px;color:#6b7280">' + upd + '</td></tr>';
        }).join('');
    }

    var el = document.getElementById('bvlInfo');
    if (el) {
        var src = _bvl.filter.source_id ? (_bvl.sources.find(function (s) { return s.id == _bvl.filter.source_id; }) || {}).name || '' : 'Tất cả';
        el.innerHTML = '<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700">📦 ' + src + ' — <span style="color:#ccfbf1;font-weight:900">' + tot + '</span> bill</div>';
    }

    var sc = document.getElementById('bvlStats');
    if (sc) {
        sc.innerHTML = '<div style="background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;padding:6px 12px;border-radius:8px;min-width:70px;text-align:center;box-shadow:0 3px 10px #0d948820;flex-shrink:0"><div style="font-size:8px;font-weight:600;opacity:.85;letter-spacing:.5px;margin-bottom:1px"> TỔNG BILL</div><div style="font-size:14px;font-weight:900">' + tot + '</div></div>'
            + '<div style="background:linear-gradient(135deg,#14b8a6,#0d9488);color:#fff;padding:6px 12px;border-radius:8px;min-width:70px;text-align:center;box-shadow:0 3px 10px #14b8a620;flex-shrink:0"><div style="font-size:8px;font-weight:600;opacity:.85;letter-spacing:.5px;margin-bottom:1px"> TỔNG SL</div><div style="font-size:14px;font-weight:900">' + _bvlFM(sumQty) + '</div></div>'
            + '<div style="background:linear-gradient(135deg,#1e293b,#334155);color:#fff;padding:6px 12px;border-radius:8px;min-width:80px;text-align:center;box-shadow:0 3px 10px #1e293b20;flex-shrink:0"><div style="font-size:8px;font-weight:600;opacity:.85;letter-spacing:.5px;margin-bottom:1px">💰 THÀNH TIỀN</div><div style="font-size:12px;font-weight:900">' + _bvlFM(sumTotal) + '₫</div></div>'
            + '<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:6px 12px;border-radius:8px;min-width:70px;text-align:center;box-shadow:0 3px 10px #05966920;flex-shrink:0"><div style="font-size:8px;font-weight:600;opacity:.85;letter-spacing:.5px;margin-bottom:1px">✅ ĐÃ TT</div><div style="font-size:12px;font-weight:900">' + _bvlFM(sumPaid) + '₫</div></div>'
            + '<div style="background:linear-gradient(135deg,' + (sumDebt > 0 ? '#ef4444,#dc2626' : '#059669,#10b981') + ');color:#fff;padding:6px 12px;border-radius:8px;min-width:80px;text-align:center;box-shadow:0 3px 10px ' + (sumDebt > 0 ? '#ef444420' : '#05966920') + ';flex-shrink:0"><div style="font-size:8px;font-weight:600;opacity:.85;letter-spacing:.5px;margin-bottom:1px">📊 TỔNG CÔNG NỢ</div><div style="font-size:12px;font-weight:900">' + _bvlFM(sumDebt) + '₫</div></div>';
    }
}

async function _bvlTog(id, action) {
    if (action === 'check' && !confirm('Xác nhận duyệt bill này?')) return;
    try {
        await apiCall('/api/import/toggle/' + id, 'POST', { action });
        showToast('✅ Cập nhật');
        await _bvlLoadAll();
    } catch (e) {
        showToast(e.message || 'Lỗi', 'error');
    }
}

function _bvlAddSrc() {
    var name = prompt('Nhập tên nguồn cung cấp:');
    if (!name) return;
    apiCall('/api/import/sources', 'POST', { name }).then(function () {
        showToast('✅ Đã thêm nguồn: ' + name);
        _bvlLoadAll();
    }).catch(function (e) {
        showToast(e.message || 'Lỗi', 'error');
    });
}

// ========== PAYMENT MODAL ==========
var _bvlPay = { importId: null, imageData: null };
function _bvlPayModal(importId, billDebt, sourceDebt) {
    _bvlPay = { importId: importId, imageData: null };
    var remaining = Number(billDebt) || 0;
    var srcTotal = Number(sourceDebt) || 0;
    var ov = document.createElement('div');
    ov.id = '_bvlPayOv';
    ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    ov.onclick = function () { ov.remove(); };
    ov.innerHTML = '<div style="background:#fff;border-radius:16px;width:100%;max-width:480px;box-shadow:0 25px 50px rgba(0,0,0,.25)" onclick="event.stopPropagation()">'
        + '<div style="padding:14px 20px;border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#0d9488,#14b8a6);border-radius:16px 16px 0 0;color:#fff;display:flex;justify-content:space-between;align-items:center">'
        + '<div style="font-size:15px;font-weight:800">💳 Thanh Toán Nguồn</div>'
        + '<button onclick="document.getElementById(\'_bvlPayOv\').remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:6px;padding:4px 12px;cursor:pointer;font-size:12px;font-weight:600">✕ Đóng</button></div>'
        + '<div style="padding:20px">'
        + '<div style="background:#fee2e2;padding:10px 14px;border-radius:10px;margin-bottom:10px;display:flex;justify-content:space-between"><span style="font-size:12px;color:#dc2626;font-weight:700">📊 Tổng Công Nợ còn lại</span><span style="font-size:16px;font-weight:900;color:#dc2626">' + _bvlFM(srcTotal) + '₫</span></div>'
        + '<div style="background:#f1f5f9;padding:8px 14px;border-radius:10px;margin-bottom:16px;display:flex;justify-content:space-between"><span style="font-size:11px;color:#6b7280;font-weight:600">Nợ bill này</span><span style="font-size:14px;font-weight:800;color:#f59e0b">' + _bvlFM(remaining) + '₫</span></div>'
        + '<div style="margin-bottom:14px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">💵 Số tiền thanh toán <span style="color:#dc2626">*</span> <span style="color:#9ca3af;font-weight:400">(tối đa ' + _bvlFM(srcTotal) + '₫)</span></label>'
        + '<input id="_bvlPayAmt" type="number" placeholder="Nhập số tiền..." style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;font-weight:700;outline:none" max="' + srcTotal + '"></div>'
        + '<div style="margin-bottom:14px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">📸 Hình ảnh thanh toán <span style="color:#dc2626">* (Ctrl+V)</span></label>'
        + '<div id="_bvlPayImg" style="border:2px dashed #d1d5db;border-radius:10px;padding:30px;text-align:center;color:#9ca3af;cursor:pointer;min-height:80px;font-size:12px" tabindex="0">📋 Click vào đây rồi Ctrl+V dán hình ảnh</div></div>'
        + '<div style="margin-bottom:16px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">📝 Ghi chú (tùy chọn)</label>'
        + '<textarea id="_bvlPayNote" rows="2" placeholder="Ghi chú thanh toán..." style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:12px;resize:none;outline:none"></textarea></div>'
        + '<button id="_bvlPayBtn" onclick="_bvlPaySubmit()" style="width:100%;padding:12px;background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:800;cursor:pointer;transition:all .2s">💳 XÁC NHẬN THANH TOÁN</button>'
        + '</div></div>';
    document.body.appendChild(ov);

    var imgArea = document.getElementById('_bvlPayImg');
    imgArea.addEventListener('paste', function (e) {
        var items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (var i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                var blob = items[i].getAsFile();
                var fd = new FormData();
                fd.append('file', blob, 'paste.png');
                fetch('/api/import/upload-image', { method: 'POST', body: fd, credentials: 'include' })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            _bvlPay.imageData = data.url;
                            imgArea.innerHTML = '<img src="' + data.url + '" style="max-height:120px;border-radius:8px"><div style="font-size:10px;color:#0d9488;margin-top:4px;font-weight:600">✅ Đã dán hình ảnh</div>';
                            imgArea.style.borderColor = '#0d9488';
                        }
                    }).catch(err => showToast(err.message, 'error'));
                break;
            }
        }
        e.preventDefault();
    });
}

async function _bvlPaySubmit() {
    var amt = Number(document.getElementById('_bvlPayAmt').value) || 0;
    if (amt <= 0) { showToast('Vui lòng nhập số tiền', 'error'); return; }
    if (!_bvlPay.imageData) { showToast('Vui lòng dán hình ảnh thanh toán (Ctrl+V)', 'error'); return; }
    var note = document.getElementById('_bvlPayNote').value || '';
    var btn = document.getElementById('_bvlPayBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Đang xử lý...';
    try {
        var res = await apiCall('/api/import/payments/' + _bvlPay.importId, 'POST', { amount: amt, image_data: _bvlPay.imageData, note: note });
        if (res.error) {
            showToast(res.error, 'error');
            btn.disabled = false;
            btn.textContent = '💳 XÁC NHẬN THANH TOÁN';
            return;
        }
        showToast('✅ Thanh toán thành công: ' + _bvlFM(amt) + '₫');
        var ov = document.getElementById('_bvlPayOv');
        if (ov) ov.remove();
        await _bvlLoadAll();
    } catch (e) {
        showToast(e.message || 'Lỗi', 'error');
        btn.disabled = false;
        btn.textContent = '💳 XÁC NHẬN THANH TOÁN';
    }
}

// ========== CREATE MODAL ==========
function _bvlOpenMat() {
    _bvl.uploadImg = null;
    var now = new Date();
    var yyyy = now.getFullYear();
    var mm = String(now.getMonth() + 1).padStart(2, '0');
    var dd = String(now.getDate()).padStart(2, '0');
    var todayStr = yyyy + '-' + mm + '-' + dd;

    var ov = document.createElement('div');
    ov.id = '_bvlMatOv';
    ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    ov.onclick = function () { ov.remove(); };

    var h = '<div style="background:#fff;border-radius:16px;width:100%;max-width:550px;box-shadow:0 25px 50px rgba(0,0,0,.25)" onclick="event.stopPropagation()">'
        + '<div style="padding:14px 20px;border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#0d9488,#14b8a6);border-radius:16px 16px 0 0;color:#fff;display:flex;justify-content:space-between;align-items:center">'
        + '<div style="font-size:16px;font-weight:800">📦 Nhập Vật Liệu Mới</div>'
        + '<button onclick="document.getElementById(\'_bvlMatOv\').remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:6px;padding:4px 12px;cursor:pointer;font-size:12px;font-weight:600">✕ Đóng</button></div>'
        + '<div style="padding:20px;max-height:80vh;overflow-y:auto;">'
        
        // 1. Kho Vật Liệu
        + '<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Kho Vật Liệu *</label>'
        + '<select id="_bvlMatWh" onchange="_bvlMatWhChange(this.value)" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none;font-weight:600;color:#1e293b">'
        + '<option value="">— Chọn Kho Vật Liệu —</option>';
    _bvl.warehouses.forEach(function (w) {
        if (w.is_active) {
            h += '<option value="' + w.id + '">' + w.name + '</option>';
        }
    });
    h += '</select></div>'

    // 2. Nguồn NCC
    h += '<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Nguồn NCC *</label>'
        + '<select id="_bvlSrc" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none" disabled>'
        + '<option value="">— Chọn Kho trước —</option>'
        + '</select></div>'

    h += '<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Ngày Nhập</label>'
        + '<input id="_bvlDate" type="date" value="' + todayStr + '" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none"></div>'

    // 3. Tên Vật Liệu
    h += '<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Tên Vật Liệu *</label>'
        + '<select id="_bvlMatItemSelect" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none" disabled>'
        + '<option value="">— Chọn Kho trước —</option>'
        + '</select></div>'

    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">'
        + '<div><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Số Lượng *</label>'
        + '<input id="_bvlQty" type="number" placeholder="Số lượng nhập..." style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none"></div>'
        + '<div><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Chi Phí (Thành Tiền) *</label>'
        + '<input id="_bvlCost" type="number" placeholder="Thành tiền bill..." style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none"></div>'
        + '</div>'

    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">'
        + '<div><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Hoàn Tiền (nếu có)</label>'
        + '<input id="_bvlRefund" type="number" value="0" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none"></div>'
        + '<div><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Thanh Toán Ngay</label>'
        + '<input id="_bvlPaid" type="number" value="0" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none"></div>'
        + '</div>'

    h += '<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Ghi Chú</label>'
        + '<textarea id="_bvlNotes" placeholder="Ghi chú chi phí..." rows="2" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none;resize:none"></textarea></div>'

    h += '<div style="margin-bottom:16px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Ảnh Bill (Ctrl+V) *</label>'
        + '<div id="_bvlPasteArea" style="border:2px dashed #0d9488;border-radius:10px;padding:25px;text-align:center;color:#9ca3af;cursor:pointer;font-size:12px" tabindex="0">📋 Click vào đây rồi Ctrl+V để dán ảnh hóa đơn</div></div>'

    h += '<button id="_bvlSubmitBtn" onclick="_bvlSubmitMat()" style="width:100%;padding:12px;background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:800;cursor:pointer;transition:all .2s">💾 LƯU PHIẾU NHẬP</button>'
        + '</div></div>';

    ov.innerHTML = h;
    document.body.appendChild(ov);

    var area = document.getElementById('_bvlPasteArea');
    area.addEventListener('paste', function (e) {
        var items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (var i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                var blob = items[i].getAsFile();
                var fd = new FormData();
                fd.append('file', blob, 'paste.png');
                area.innerHTML = '⏳ Đang upload ảnh...';
                fetch('/api/import/upload-image', { method: 'POST', body: fd, credentials: 'include' })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            _bvl.uploadImg = { url: data.url, path: data.path };
                            area.innerHTML = '<img src="' + data.url + '" style="max-height:120px;border-radius:8px"><div style="font-size:10px;color:#0d9488;margin-top:4px;font-weight:600">✅ Đã tải lên hóa đơn</div>';
                            area.style.borderColor = '#0d9488';
                        } else {
                            area.innerHTML = '❌ Lỗi: ' + (data.error || 'không rõ');
                        }
                    }).catch(err => {
                        area.innerHTML = '❌ Lỗi kết nối';
                        showToast(err.message, 'error');
                    });
                break;
            }
        }
        e.preventDefault();
    });
}

function _bvlMatWhChange(whId) {
    var srcSelect = document.getElementById('_bvlSrc');
    var matSelect = document.getElementById('_bvlMatItemSelect');
    if (!whId) {
        srcSelect.disabled = true;
        srcSelect.innerHTML = '<option value="">— Chọn Kho trước —</option>';
        matSelect.disabled = true;
        matSelect.innerHTML = '<option value="">— Chọn Kho trước —</option>';
        return;
    }

    whId = Number(whId);

    // 1. Filter linked suppliers
    var linkedSourceIds = _bvl.warehouse_sources
        .filter(function (ws) { return ws.warehouse_id === whId; })
        .map(function (ws) { return ws.source_id; });

    var srcHtml = '<option value="">— Chọn nguồn cung cấp —</option>';
    var countSrc = 0;
    _bvl.sources.forEach(function (s) {
        if (linkedSourceIds.includes(s.id)) {
            srcHtml += '<option value="' + s.id + '">' + s.name + '</option>';
            countSrc++;
        }
    });
    if (countSrc === 0) {
        srcSelect.innerHTML = '<option value="">⚠️ Kho này chưa có NCC liên kết</option>';
        srcSelect.disabled = true;
    } else {
        srcSelect.innerHTML = srcHtml;
        srcSelect.disabled = false;
    }

    // 2. Filter linked materials
    var matHtml = '<option value="">— Chọn vật liệu —</option>';
    var countMat = 0;
    _bvl.materials.forEach(function (m) {
        if (m.warehouse_id === whId && m.is_active) {
            matHtml += '<option value="' + m.id + '">' + m.name + '</option>';
            countMat++;
        }
    });
    if (countMat === 0) {
        matSelect.innerHTML = '<option value="">⚠️ Kho này chưa có Loại vật liệu</option>';
        matSelect.disabled = true;
    } else {
        matSelect.innerHTML = matHtml;
        matSelect.disabled = false;
    }
}

async function _bvlSubmitMat() {
    var whSelect = document.getElementById('_bvlMatWh');
    var srcId = document.getElementById('_bvlSrc').value;
    var dateVal = document.getElementById('_bvlDate').value;
    var matItemSelect = document.getElementById('_bvlMatItemSelect');
    var qtyVal = Number(document.getElementById('_bvlQty').value) || 0;
    var costVal = Number(document.getElementById('_bvlCost').value) || 0;
    var refVal = Number(document.getElementById('_bvlRefund').value) || 0;
    var paidVal = Number(document.getElementById('_bvlPaid').value) || 0;
    var notesVal = document.getElementById('_bvlNotes').value;

    if (!whSelect || !whSelect.value) { showToast('Vui lòng chọn kho vật liệu', 'error'); return; }
    if (!srcId) { showToast('Vui lòng chọn nhà cung cấp', 'error'); return; }
    if (!matItemSelect || !matItemSelect.value) { showToast('Vui lòng chọn vật liệu', 'error'); return; }
    if (qtyVal <= 0) { showToast('Vui lòng nhập số lượng > 0', 'error'); return; }
    if (costVal <= 0) { showToast('Vui lòng nhập chi phí > 0', 'error'); return; }
    if (!_bvl.uploadImg) { showToast('Ảnh bill bắt buộc', 'error'); return; }

    var btn = document.getElementById('_bvlSubmitBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Đang lưu...';

    var matItemId = Number(matItemSelect.value);
    var matItem = _bvl.materials.find(function (m) { return m.id === matItemId; });
    var matNameText = matItem ? matItem.name : '';

    var body = {
        import_date: dateVal,
        source_id: Number(srcId),
        warehouse_id: Number(whSelect.value),
        material_item_id: matItemId,
        fabric_material: matNameText, // Compatibility fallback name
        fabric_quantity: qtyVal,
        cost: costVal,
        refund: refVal,
        paid: paidVal,
        cost_notes: notesVal,
        bill_image_url: _bvl.uploadImg ? _bvl.uploadImg.url : null,
        bill_image_path: _bvl.uploadImg ? _bvl.uploadImg.path : null
    };

    try {
        var res = await apiCall('/api/import/records', 'POST', body);
        if (res.error) {
            showToast(res.error, 'error');
            btn.disabled = false;
            btn.textContent = '💾 LƯU PHIẾU NHẬP';
            return;
        }
        showToast('✅ Đã tạo phiếu nhập vật liệu thành công');
        var ov = document.getElementById('_bvlMatOv');
        if (ov) ov.remove();
        await _bvlLoadAll();
    } catch (e) {
        showToast(e.message || 'Lỗi', 'error');
        btn.disabled = false;
        btn.textContent = '💾 LƯU PHIẾU NHẬP';
    }
}

// ========== DETAIL MODAL ==========
async function _bvlDetail(id) {
    try {
        var res = await apiCall('/api/import/fabric-detail/' + id); // Endpoint returns full bill details
        var r = res.record;
        if (!r) return;
        var totalSourceDebt = Number(res.total_source_debt) || 0;
    } catch (e) {
        showToast(e.message || 'Lỗi', 'error');
        return;
    }

    var h = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">'
        + '<div style="background:#f1f5f9;padding:8px 12px;border-radius:8px"><div style="font-size:9px;color:#6b7280;font-weight:700">NGÀY NHẬP</div><div style="font-size:12px;font-weight:600">' + _bvlFD(r.import_date) + '</div></div>'
        + '<div style="background:#f1f5f9;padding:8px 12px;border-radius:8px"><div style="font-size:9px;color:#6b7280;font-weight:700">NHÂN VIÊN</div><div style="font-size:12px;font-weight:600">' + (r.importer_name || '—') + '</div></div></div>';

    var whHtml = r.warehouse_name ? ' &nbsp; $\\rightarrow$ &nbsp; <b style="color:#2563eb">🏢 ' + r.warehouse_name + '</b>' : '';
    h += '<div style="background:#f1f5f9;padding:8px 12px;border-radius:8px;margin-bottom:12px"><div style="font-size:9px;color:#6b7280;font-weight:700">NGUỒN NCC & KHO</div><div style="font-size:12px;font-weight:700;color:#0d9488">🏪 ' + (r.source_name || '—') + whHtml + '</div></div>';

    h += '<div style="border:1.5px solid #ccfbf1;border-radius:10px;padding:12px;margin-bottom:12px;background:#f0fdfa">'
        + '<div style="font-size:11px;font-weight:800;color:#0d9488;margin-bottom:6px">📦 THÔNG TIN VẬT LIỆU</div>'
        + '<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px"><span>Tên vật liệu:</span><b style="color:#1e293b">' + (r.material_item_name || r.fabric_material || '—') + '</b></div>'
        + '<div style="display:flex;justify-content:space-between;font-size:12px"><span>Số lượng:</span><b style="color:#0d9488">' + _bvlFM(r.fabric_quantity) + '</b></div>'
        + '</div>';

    var hasSourceDebt = totalSourceDebt > 0;
    h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">'
        + '<div style="background:#f1f5f9;padding:8px;border-radius:8px;text-align:center"><div style="font-size:9px;color:#6b7280;font-weight:700">💰 THÀNH TIỀN</div><div style="font-size:14px;font-weight:900">' + _bvlFM(r.total_amount) + '</div></div>'
        + '<div style="background:#d1fae5;padding:8px;border-radius:8px;text-align:center"><div style="font-size:9px;color:#059669;font-weight:700">✅ ĐÃ TT</div><div style="font-size:14px;font-weight:900;color:#059669">' + _bvlFM(r.paid) + '</div></div>'
        + '<div style="background:' + (hasSourceDebt ? '#fee2e2' : '#d1fae5') + ';padding:8px;border-radius:8px;text-align:center"><div style="font-size:9px;color:' + (hasSourceDebt ? '#dc2626' : '#059669') + ';font-weight:700">📊 TỔNG CÔNG NỢ</div><div style="font-size:14px;font-weight:900;color:' + (hasSourceDebt ? '#dc2626' : '#059669') + '">' + _bvlFM(totalSourceDebt) + '</div></div></div>';

    if (r.bill_image_url) {
        h += '<div style="border:1.5px solid #ccfbf1;border-radius:10px;padding:10px;background:#f0fdfa;margin-bottom:12px">'
            + '<div style="font-size:11px;font-weight:800;color:#0d9488;margin-bottom:6px">📸 ẢNH HÓA ĐƠN</div>'
            + '<img src="' + r.bill_image_url + '" style="max-height:220px;border-radius:8px;cursor:pointer" onclick="window.open(this.src)">'
            + '</div>';
    }

    if (r.cost_notes) {
        h += '<div style="background:#f1f5f9;padding:8px 12px;border-radius:8px;margin-bottom:12px"><div style="font-size:9px;color:#6b7280;font-weight:700">📝 GHI CHÚ</div><div style="font-size:12px">' + r.cost_notes + '</div></div>';
    }

    try {
        var payRes = await apiCall('/api/import/payments/' + id);
        var payments = payRes.payments || [];
        if (payments.length) {
            h += '<div style="border:1.5px solid #a7f3d0;border-radius:10px;padding:10px;background:#ecfdf5">'
                + '<div style="font-size:11px;font-weight:800;color:#059669;margin-bottom:8px">💳 LỊCH SỬ THANH TOÁN (' + payments.length + ' lần)</div>';
            payments.forEach(function (p, pi) {
                h += '<div style="background:#fff;border:1px solid #d1fae5;border-radius:8px;padding:10px;margin-bottom:6px">'
                    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
                    + '<div><span style="font-size:11px;font-weight:700;color:#374151">Lần ' + (payments.length - pi) + '</span>'
                    + '<span style="font-size:10px;color:#6b7280;margin-left:8px">' + _bvlFD(p.paid_at) + '</span>'
                    + '<span style="font-size:10px;color:#0d9488;margin-left:8px;font-weight:600">' + (p.paid_by_name || '') + '</span></div>'
                    + '<div style="font-size:14px;font-weight:900;color:#059669">' + _bvlFM(p.amount) + '₫</div></div>';
                if (p.note) h += '<div style="font-size:10px;color:#6b7280;margin-bottom:4px">📝 ' + p.note + '</div>';
                if (p.image_url) h += '<div><img src="' + p.image_url + '" style="max-height:120px;border-radius:8px;cursor:pointer" onclick="window.open(this.src)"></div>';
                h += '</div>';
            });
            h += '</div>';
        }
    } catch (e) {
        console.error('[BVL] payments details error:', e);
    }

    var ov = document.createElement('div');
    ov.id = '_bvlDetailOv';
    ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    ov.onclick = function () { ov.remove(); };
    ov.innerHTML = '<div style="background:#fff;border-radius:16px;width:100%;max-width:550px;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,.25)" onclick="event.stopPropagation()">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 20px;border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#0d9488,#14b8a6);border-radius:16px 16px 0 0;color:#fff">'
        + '<div style="font-size:15px;font-weight:800">📦 Chi Tiết Bill Vật Liệu</div>'
        + '<button onclick="document.getElementById(\'_bvlDetailOv\').remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:6px;padding:4px 12px;cursor:pointer;font-size:12px;font-weight:600">✕ Đóng</button>'
        + '</div><div style="padding:16px 20px">' + h + '</div></div>';
    document.body.appendChild(ov);
}

// ========== CONFIG SETUP MODAL ==========
function _bvlOpenSetup() {
    var ov = document.createElement('div');
    ov.id = '_bvlSetupOv';
    ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    ov.onclick = function () { ov.remove(); };

    var h = '<div style="background:#fff;border-radius:16px;width:100%;max-width:650px;max-height:90vh;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,.25);display:flex;flex-direction:column" onclick="event.stopPropagation()">'
        + '<div style="padding:14px 20px;border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#334155,#475569);color:#fff;display:flex;justify-content:space-between;align-items:center">'
        + '<div style="font-size:16px;font-weight:800">⚙️ Cấu Hình Kho & Vật Liệu</div>'
        + '<button onclick="document.getElementById(\'_bvlSetupOv\').remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:6px;padding:4px 12px;cursor:pointer;font-size:12px;font-weight:600">✕ Đóng</button></div>'
        
        + '<div style="display:flex;background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:0 10px">'
        + '<button class="bvl-tab-btn active" onclick="_bvlSwitchTab(\'wh\')" id="_bvlTabWh">🏢 Kho Vật Liệu</button>'
        + '<button class="bvl-tab-btn" onclick="_bvlSwitchTab(\'mat\')" id="_bvlTabMat">📦 Loại Vật Liệu</button>'
        + '<button class="bvl-tab-btn" onclick="_bvlSwitchTab(\'src\')" id="_bvlTabSrc">🏪 Nhà Cung Cấp</button>'
        + '</div>'
        
        + '<div style="flex:1;overflow-y:auto;padding:20px" id="_bvlSetupContent">'
        + '</div>'
        + '</div>';

    ov.innerHTML = h;
    document.body.appendChild(ov);
    
    _bvlSwitchTab('wh');
}

function _bvlSwitchTab(tabName) {
    var tabs = ['wh', 'mat', 'src'];
    tabs.forEach(function (t) {
        var btn = document.getElementById('_bvlTab' + t.charAt(0).toUpperCase() + t.slice(1));
        if (btn) {
            if (t === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });

    var content = document.getElementById('_bvlSetupContent');
    if (!content) return;

    if (tabName === 'wh') {
        _bvlRenderWhTab(content);
    } else if (tabName === 'mat') {
        _bvlRenderMatTab(content);
    } else if (tabName === 'src') {
        _bvlRenderSrcTab(content);
    }
}

function _bvlRenderWhTab(content) {
    var html = '<h4 style="margin:0 0 12px 0;font-size:14px;color:#1e293b">➕ Thêm Kho Mới</h4>'
        + '<div style="display:flex;gap:10px;margin-bottom:20px">'
        + '<input id="_newWhName" placeholder="Tên kho (ví dụ: Kho Vật Liệu May)..." style="flex:1;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;outline:none">'
        + '<input id="_newWhOrder" type="number" placeholder="Thứ tự..." style="width:100px;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;outline:none">'
        + '<button onclick="_bvlAddWhSubmit()" style="padding:8px 16px;background:#0d9488;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">Thêm Kho</button>'
        + '</div>';

    html += '<h4 style="margin:0 0 10px 0;font-size:14px;color:#1e293b">📋 Danh Sách Kho</h4>'
        + '<table style="width:100%;border-collapse:collapse;font-size:12px">'
        + '<thead><tr style="background:#f1f5f9;text-align:left"><th style="padding:8px">ID</th><th style="padding:8px">Tên Kho</th><th style="padding:8px">Sắp xếp</th><th style="padding:8px;text-align:center">Hoạt động</th><th style="padding:8px;text-align:right">Thao tác</th></tr></thead><tbody>';

    if (_bvl.warehouses.length === 0) {
        html += '<tr><td colspan="5" style="padding:20px;text-align:center;color:#64748b">Chưa có kho nào. Vui lòng thêm kho ở trên.</td></tr>';
    } else {
        _bvl.warehouses.forEach(function (w) {
            html += '<tr style="border-bottom:1px solid #f1f5f9">'
                + '<td style="padding:8px;color:#64748b">' + w.id + '</td>'
                + '<td style="padding:8px"><input id="_whName_' + w.id + '" value="' + w.name + '" style="padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;width:90%;font-size:12px"></td>'
                + '<td style="padding:8px"><input id="_whOrder_' + w.id + '" type="number" value="' + w.display_order + '" style="padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;width:60px;font-size:12px"></td>'
                + '<td style="padding:8px;text-align:center"><input id="_whActive_' + w.id + '" type="checkbox"' + (w.is_active ? ' checked' : '') + '></td>'
                + '<td style="padding:8px;text-align:right"><button onclick="_bvlUpdateWhSubmit(' + w.id + ')" style="padding:4px 8px;background:#334155;color:#fff;border:none;border-radius:4px;font-size:11px;cursor:pointer">Lưu</button></td>'
                + '</tr>';
        });
    }
    html += '</tbody></table>';
    content.innerHTML = html;
}

async function _bvlAddWhSubmit() {
    var name = document.getElementById('_newWhName').value || '';
    var order = Number(document.getElementById('_newWhOrder').value) || 0;
    if (!name.trim()) { showToast('Vui lòng nhập tên kho', 'error'); return; }
    try {
        await apiCall('/api/material-setup/warehouses', 'POST', { name: name.trim(), display_order: order, is_active: true });
        showToast('✅ Đã thêm kho vật liệu');
        await _bvlLoadAll();
        _bvlSwitchTab('wh');
    } catch (e) {
        showToast(e.message || 'Lỗi', 'error');
    }
}

async function _bvlUpdateWhSubmit(id) {
    var name = document.getElementById('_whName_' + id).value || '';
    var order = Number(document.getElementById('_whOrder_' + id).value) || 0;
    var active = document.getElementById('_whActive_' + id).checked;
    if (!name.trim()) { showToast('Vui lòng nhập tên kho', 'error'); return; }
    try {
        await apiCall('/api/material-setup/warehouses/' + id, 'PUT', { name: name.trim(), display_order: order, is_active: active });
        showToast('✅ Đã cập nhật kho vật liệu');
        await _bvlLoadAll();
        _bvlSwitchTab('wh');
    } catch (e) {
        showToast(e.message || 'Lỗi', 'error');
    }
}

function _bvlRenderMatTab(content) {
    if (_selectedSetupWhIdForMat === null && _bvl.warehouses.length > 0) {
        _selectedSetupWhIdForMat = _bvl.warehouses[0].id;
    }

    var html = '<div style="margin-bottom:16px"><label style="font-size:12px;font-weight:700;color:#374151;margin-right:8px">Chọn Kho Vật Liệu:</label>'
        + '<select onchange="_bvlSetupMatWhChange(this.value)" style="padding:6px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;outline:none;font-weight:600">';
    _bvl.warehouses.forEach(function (w) {
        var sel = _selectedSetupWhIdForMat == w.id ? ' selected' : '';
        html += '<option value="' + w.id + '"' + sel + '>' + w.name + '</option>';
    });
    html += '</select></div>';

    if (!_selectedSetupWhIdForMat) {
        html += '<div style="padding:20px;text-align:center;color:#64748b">Vui lòng tạo Kho trước để thêm vật liệu.</div>';
        content.innerHTML = html;
        return;
    }

    html += '<h4 style="margin:0 0 12px 0;font-size:13px;color:#1e293b">➕ Thêm Vật Tư Mới</h4>'
        + '<div style="display:flex;gap:10px;margin-bottom:20px">'
        + '<input id="_newMatName" placeholder="Tên vật tư (ví dụ: Mực in PET, Cúc áo)..." style="flex:1;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;outline:none">'
        + '<input id="_newMatOrder" type="number" placeholder="Sắp xếp..." style="width:80px;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;outline:none">'
        + '<button onclick="_bvlAddMatSubmit()" style="padding:8px 16px;background:#0d9488;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">Thêm Vật Tư</button>'
        + '</div>';

    html += '<h4 style="margin:0 0 10px 0;font-size:13px;color:#1e293b">📋 Danh Sách Vật Tư Thuộc Kho</h4>'
        + '<table style="width:100%;border-collapse:collapse;font-size:12px">'
        + '<thead><tr style="background:#f1f5f9;text-align:left"><th style="padding:8px">ID</th><th style="padding:8px">Tên Vật Tư</th><th style="padding:8px">Sắp xếp</th><th style="padding:8px;text-align:center">Hoạt động</th><th style="padding:8px;text-align:right">Thao tác</th></tr></thead><tbody>';

    var filteredmats = _bvl.materials.filter(function (m) { return m.warehouse_id == _selectedSetupWhIdForMat; });

    if (filteredmats.length === 0) {
        html += '<tr><td colspan="5" style="padding:20px;text-align:center;color:#64748b">Kho này chưa có vật tư nào.</td></tr>';
    } else {
        filteredmats.forEach(function (m) {
            html += '<tr style="border-bottom:1px solid #f1f5f9">'
                + '<td style="padding:8px;color:#64748b">' + m.id + '</td>'
                + '<td style="padding:8px"><input id="_matName_' + m.id + '" value="' + m.name + '" style="padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;width:90%;font-size:12px"></td>'
                + '<td style="padding:8px"><input id="_matOrder_' + m.id + '" type="number" value="' + m.display_order + '" style="padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;width:50px;font-size:12px"></td>'
                + '<td style="padding:8px;text-align:center"><input id="_matActive_' + m.id + '" type="checkbox"' + (m.is_active ? ' checked' : '') + '></td>'
                + '<td style="padding:8px;text-align:right"><button onclick="_bvlUpdateMatSubmit(' + m.id + ')" style="padding:4px 8px;background:#334155;color:#fff;border:none;border-radius:4px;font-size:11px;cursor:pointer">Lưu</button></td>'
                + '</tr>';
        });
    }
    html += '</tbody></table>';
    content.innerHTML = html;
}

function _bvlSetupMatWhChange(val) {
    _selectedSetupWhIdForMat = Number(val);
    _bvlSwitchTab('mat');
}

async function _bvlAddMatSubmit() {
    var name = document.getElementById('_newMatName').value || '';
    var order = Number(document.getElementById('_newMatOrder').value) || 0;
    if (!name.trim()) { showToast('Vui lòng nhập tên vật tư', 'error'); return; }
    try {
        await apiCall('/api/material-setup/items', 'POST', { warehouse_id: _selectedSetupWhIdForMat, name: name.trim(), display_order: order, is_active: true });
        showToast('✅ Đã thêm vật tư');
        await _bvlLoadAll();
        _bvlSwitchTab('mat');
    } catch (e) {
        showToast(e.message || 'Lỗi', 'error');
    }
}

async function _bvlUpdateMatSubmit(id) {
    var name = document.getElementById('_matName_' + id).value || '';
    var order = Number(document.getElementById('_matOrder_' + id).value) || 0;
    var active = document.getElementById('_matActive_' + id).checked;
    if (!name.trim()) { showToast('Vui lòng nhập tên vật tư', 'error'); return; }
    try {
        await apiCall('/api/material-setup/items/' + id, 'PUT', { name: name.trim(), display_order: order, is_active: active });
        showToast('✅ Đã cập nhật vật tư');
        await _bvlLoadAll();
        _bvlSwitchTab('mat');
    } catch (e) {
        showToast(e.message || 'Lỗi', 'error');
    }
}

function _bvlRenderSrcTab(content) {
    if (_selectedSetupWhIdForSrc === null && _bvl.warehouses.length > 0) {
        _selectedSetupWhIdForSrc = _bvl.warehouses[0].id;
    }

    var html = '<div style="margin-bottom:16px"><label style="font-size:12px;font-weight:700;color:#374151;margin-right:8px">Chọn Kho Vật Liệu:</label>'
        + '<select onchange="_bvlSetupSrcWhChange(this.value)" style="padding:6px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;outline:none;font-weight:600">';
    _bvl.warehouses.forEach(function (w) {
        var sel = _selectedSetupWhIdForSrc == w.id ? ' selected' : '';
        html += '<option value="' + w.id + '"' + sel + '>' + w.name + '</option>';
    });
    html += '</select></div>';

    if (!_selectedSetupWhIdForSrc) {
        html += '<div style="padding:20px;text-align:center;color:#64748b">Vui lòng tạo Kho trước để liên kết Nhà Cung Cấp.</div>';
        content.innerHTML = html;
        return;
    }

    html += '<h4 style="margin:0 0 12px 0;font-size:13px;color:#1e293b">🏪 Chọn Nhà Cung Cấp Cho Kho</h4>'
        + '<div style="max-height:250px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px;padding:12px;background:#f8fafc;margin-bottom:20px;display:grid;grid-template-columns:1fr 1fr;gap:8px" id="_linkedSourcesContainer">';

    var linkedSourceIds = _bvl.warehouse_sources
        .filter(function (ws) { return ws.warehouse_id == _selectedSetupWhIdForSrc; })
        .map(function (ws) { return ws.source_id; });

    _bvl.sources.forEach(function (s) {
        var checked = linkedSourceIds.includes(s.id) ? ' checked' : '';
        html += '<label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">'
            + '<input type="checkbox" class="_setup_src_cb" value="' + s.id + '"' + checked + '> ' + s.name
            + '</label>';
    });

    html += '</div>';
    html += '<button onclick="_bvlSaveWarehouseSources()" style="width:100%;padding:10px;background:#0d9488;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">💾 LƯU LIÊN KẾT NHÀ CUNG CẤP</button>';

    content.innerHTML = html;
}

function _bvlSetupSrcWhChange(val) {
    _selectedSetupWhIdForSrc = Number(val);
    _bvlSwitchTab('src');
}

async function _bvlSaveWarehouseSources() {
    var cbs = document.querySelectorAll('._setup_src_cb');
    var sids = [];
    cbs.forEach(function (cb) {
        if (cb.checked) sids.push(Number(cb.value));
    });
    try {
        await apiCall('/api/material-setup/warehouse-sources', 'POST', { warehouse_id: _selectedSetupWhIdForSrc, source_ids: sids });
        showToast('✅ Đã lưu liên kết nhà cung cấp');
        await _bvlLoadAll();
        _bvlSwitchTab('src');
    } catch (e) {
        showToast(e.message || 'Lỗi', 'error');
    }
}
