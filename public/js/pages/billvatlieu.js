// ========== BILL NHẬP VẬT LIỆU — Desktop SPA ==========
var _bvl = { records: [], tree: null, filter: { source_id: null }, search: '', sources: [], isDuyet: false, uploadImg: null };

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
            + '@media(max-width:768px){.bvl-sb{display:none}}';
        document.head.appendChild(st);
    }
    content.innerHTML = '<div class="bvl-wrap"><div class="bvl-sb" id="bvlSb"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="bvl-main">'
        + '<div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;align-items:center"><div id="bvlInfo" style="font-size:12px"></div><div id="bvlStats" style="display:flex;gap:6px;flex:1;justify-content:center;flex-wrap:nowrap;overflow-x:auto"></div><button id="bvlFabBtn" class="bvl-fab-btn" onclick="_bvlOpenMat()">📦 Nhập Vật Liệu</button><input id="bvlSearch" placeholder="🔍 Tìm vật liệu / nguồn..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:200px;outline:none"></div>'
        + '<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:11px;white-space:nowrap" id="bvlTable"><thead><tr style="background:var(--gray-800)">'
        + '<th style="text-align:center">STT</th><th style="text-align:center">Duyệt</th><th style="text-align:center">TT</th><th>Ngày Nhập</th><th>Nguồn</th><th>NV Nhập</th><th>Tên Vật Liệu</th><th style="text-align:center">Số Lượng</th><th style="text-align:right">Chi Phí</th><th style="text-align:right">Hoàn</th><th style="text-align:right">Thành Tiền</th><th style="text-align:right">Thanh Toán</th><th style="text-align:center">Công Nợ</th><th>Ghi Chú CP</th><th>Cập Nhật</th>'
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

async function _bvlLoadAll() {
    try {
        var [tR, sR, dR] = await Promise.all([
            apiCall('/api/import/tree?record_type=general'),
            apiCall('/api/import/sources'),
            apiCall('/api/import/check-duyet-perm')
        ]);
        _bvl.tree = tR;
        _bvl.sources = sR.sources || [];
        _bvl.isDuyet = dR.allowed || false;
        _bvlRenderSb();
        await _bvlLoadRecs();
    } catch (e) {
        console.error('[BVL]', e);
    }
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
        h += '<div class="bvl-sb-total" onclick="_bvlFilter()"><div style="display:flex;justify-content:space-between;align-items:center"><span>📦 Tất cả</span><span class="tv">' + (tt.total || 0) + '</span></div><div class="ts">💰 ' + _bvlFM(tt.sum_total) + ' ₫' + (Number(tt.sum_debt) > 0 ? ' &nbsp;|&nbsp; 🔴 Nợ: ' + _bvlFM(tt.sum_debt) + ' ₫' : '') + '</div></div>';
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
            return (r.fabric_material || '').toLowerCase().indexOf(q) >= 0 || (r.source_name || '').toLowerCase().indexOf(q) >= 0;
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

            return '<tr style="cursor:pointer" onclick="_bvlDetail(' + r.id + ')"><td style="text-align:center;font-weight:700;color:#94a3b8">' + (i + 1) + '</td>'
                + '<td style="text-align:center">' + duyetHtml + '</td>'
                + '<td style="text-align:center">' + payHtml + '</td>'
                + '<td style="font-size:10px">' + _bvlFD(r.import_date) + '</td>'
                + '<td style="font-size:10px;color:#0d9488;font-weight:700">' + (r.source_name || '—') + '</td>'
                + '<td style="font-size:10px;color:#059669;font-weight:600">' + (r.importer_name || '—') + '</td>'
                + '<td style="font-weight:600;color:#1e293b;max-width:160px;overflow:hidden;text-overflow:ellipsis">' + (r.fabric_material || '—') + '</td>'
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
        
        + '<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Nguồn NCC *</label>'
        + '<select id="_bvlSrc" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none">'
        + '<option value="">— Chọn nguồn cung cấp —</option>';
    _bvl.sources.forEach(function (s) {
        h += '<option value="' + s.id + '">' + s.name + '</option>';
    });
    h += '</select></div>'

    h += '<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Ngày Nhập</label>'
        + '<input id="_bvlDate" type="date" value="' + todayStr + '" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none"></div>'

    h += '<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Tên Vật Liệu *</label>'
        + '<input id="_bvlMatName" type="text" placeholder="Ví dụ: Băng keo, Túi bóng..." style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none"></div>'

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

    h += '<div style="margin-bottom:16px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Ảnh Bill (Ctrl+V)</label>'
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

async function _bvlSubmitMat() {
    var srcId = document.getElementById('_bvlSrc').value;
    var dateVal = document.getElementById('_bvlDate').value;
    var nameVal = document.getElementById('_bvlMatName').value;
    var qtyVal = Number(document.getElementById('_bvlQty').value) || 0;
    var costVal = Number(document.getElementById('_bvlCost').value) || 0;
    var refVal = Number(document.getElementById('_bvlRefund').value) || 0;
    var paidVal = Number(document.getElementById('_bvlPaid').value) || 0;
    var notesVal = document.getElementById('_bvlNotes').value;

    if (!srcId) { showToast('Vui lòng chọn nhà cung cấp', 'error'); return; }
    if (!nameVal) { showToast('Vui lòng nhập tên vật liệu', 'error'); return; }
    if (qtyVal <= 0) { showToast('Vui lòng nhập số lượng > 0', 'error'); return; }
    if (costVal <= 0) { showToast('Vui lòng nhập chi phí > 0', 'error'); return; }

    var btn = document.getElementById('_bvlSubmitBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Đang lưu...';

    var body = {
        import_date: dateVal,
        source_id: Number(srcId),
        fabric_material: nameVal, // Map to fabric_material in database for list display
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

    h += '<div style="background:#f1f5f9;padding:8px 12px;border-radius:8px;margin-bottom:12px"><div style="font-size:9px;color:#6b7280;font-weight:700">NGUỒN NCC</div><div style="font-size:12px;font-weight:700;color:#0d9488">' + (r.source_name || '—') + '</div></div>';

    h += '<div style="border:1.5px solid #ccfbf1;border-radius:10px;padding:12px;margin-bottom:12px;background:#f0fdfa">'
        + '<div style="font-size:11px;font-weight:800;color:#0d9488;margin-bottom:6px">📦 THÔNG TIN VẬT LIỆU</div>'
        + '<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px"><span>Tên vật liệu:</span><b style="color:#1e293b">' + (r.fabric_material || '—') + '</b></div>'
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
