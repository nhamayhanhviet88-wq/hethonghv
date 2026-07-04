// ========== NHẬP XUẤT HOÀN VẬT LIỆU — Desktop SPA ==========
var _nxhvl = { records: [], tree: null, filter: { tx_type: null, year: null, month: null }, search: '' };
var _nxhvlOpen = {};
var _nxhvlTL = { HOAN: 'Hoàn', NHAP_KK: 'Nhập KK', XUAT_KK: 'Xuất KK', NHAP: 'Nhập Vật Liệu', XUAT: 'Xuất Vật Liệu' };
var _nxhvlIC = { HOAN: '🔄', NHAP_KK: '📥', XUAT_KK: '📤', NHAP: '📦', XUAT: '🚛' };
var _nxhvlCL = { HOAN: '#059669', NHAP_KK: '#7c3aed', XUAT_KK: '#ea580c', NHAP: '#2563eb', XUAT: '#dc2626' };

function renderNhapxuathoanvatlieuPage(content) {
    var highlightId = sessionStorage.getItem('nxhvl_highlight_bill');
    if (highlightId) {
        _nxhvl.search = highlightId;
        sessionStorage.removeItem('nxhvl_highlight_bill');
    } else {
        _nxhvl.search = '';
    }
    if (!document.getElementById('_nxhvlS')) {
        var st = document.createElement('style');
        st.id = '_nxhvlS';
        st.textContent = '.nxhvl-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden}.nxhvl-sb{width:280px;min-width:280px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto}.nxhvl-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;padding:16px}.nxhvl-main>*{flex-shrink:0}'
            + '.nxhvl-sb-title{font-size:13px;font-weight:800;padding:16px;border-bottom:1px solid var(--gray-200);text-align:center;color:#0891b2}'
            + '.nxhvl-sb-total{background:linear-gradient(135deg,#0891b2,#06b6d4);color:#fff;padding:12px 16px;font-size:12px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;align-items:center}'
            + '.nxhvl-sb-type{padding:8px 16px;font-weight:800;font-size:11px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--gray-200)}'
            + '.nxhvl-sb-type:hover{background:#ecfeff}'
            + '.nxhvl-sb-yr{padding:6px 16px 6px 28px;font-size:11px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;border-bottom:1px solid #f0f0f0;color:#475569}'
            + '.nxhvl-sb-yr:hover{background:#f0f9ff}'
            + '.nxhvl-sb-mo{padding:5px 16px 5px 44px;font-size:10px;font-weight:600;cursor:pointer;display:flex;justify-content:space-between;border-bottom:1px solid #fafafa;color:#64748b}'
            + '.nxhvl-sb-mo:hover{background:#ecfeff}.nxhvl-sb-mo.active{background:#cffafe;color:#0891b2;font-weight:800}'
            + '.nxhvl-ib{width:26px;height:26px;border-radius:6px;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:12px;transition:all .15s}'
            + '.nxhvl-ib:hover{transform:scale(1.15);box-shadow:0 2px 8px rgba(0,0,0,0.12)}'
            + '.nxhvl-ib.on{background:#ccfbf1;border-color:#14b8a6}'
            + '.nxhvl-ib.postpone.on{background:#fef3c7;border-color:#fbbf24;color:#d97706}'
            + '.nxhvl-tag{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:800;color:#fff}'
            + '.nxhvl-debt{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:800}'
            + '.nxhvl-debt.red{background:#fee2e2;color:#dc2626}.nxhvl-debt.green{background:#d1fae5;color:#059669}'
            + '@keyframes sparkle-glow{0%{background-position:0% 50%;text-shadow:0 0 4px rgba(255,0,127,0.4),0 0 10px rgba(255,127,0,0.2)}50%{background-position:100% 50%;text-shadow:0 0 10px rgba(255,0,127,0.9),0 0 20px rgba(255,127,0,0.7),0 0 30px rgba(255,0,127,0.5)}100%{background-position:0% 50%;text-shadow:0 0 4px rgba(255,0,127,0.4),0 0 10px rgba(255,127,0,0.2)}}'
            + '.sparkle-glowing-text{font-family:\'Outfit\',\'Inter\',sans-serif;font-weight:900!important;font-size:14px!important;background:linear-gradient(120deg,#ff007f,#ff7f00,#e11d48,#ff007f);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:sparkle-glow 2s ease infinite;display:inline-block}'
            + '@media(max-width:768px){.nxhvl-sb{display:none}}';
        document.head.appendChild(st);
    }
    
    var createBtnHtml = '<button id="btnNxhvlCreateReturn" class="btn btn-primary" style="padding:6px 14px;font-size:12px;font-weight:700;border-radius:8px;background:#059669;color:#fff;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:6px" onclick="_nxhvlOpenCreateReturnModal()">🔄 Tạo Hoàn Vật Liệu</button>';

    content.innerHTML = '<div class="nxhvl-wrap"><div class="nxhvl-sb" id="nxhvlSb"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="nxhvl-main">'
        + '<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center"><div id="nxhvlInfo" style="font-size:12px"></div><div id="nxhvlStats" style="display:flex;gap:8px;flex:1;justify-content:center;flex-wrap:wrap"></div>' + createBtnHtml + '<input id="nxhvlSearch" placeholder="🔍 Tìm vật liệu / nguồn / bill..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:220px;outline:none" value="' + (_nxhvl.search || '') + '"></div>'
        + '<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:11px;white-space:nowrap" id="nxhvlTable"><thead><tr style="background:var(--gray-800)">'
        + '<th style="text-align:center">STT</th><th style="text-align:center">Mã Bill Hoàn</th><th style="text-align:center">✅</th><th style="text-align:center">Ngày Hẹn Hoàn</th><th style="text-align:center">Ngày Lên Bill</th><th>Nguồn Vật Liệu</th><th>Tên Vật Liệu</th><th>ĐVT</th><th style="text-align:center">Số Lượng</th><th style="text-align:right">Giá</th><th style="text-align:right">Thành Tiền</th><th style="text-align:center">Công Nợ</th><th style="text-align:right">Thanh Toán</th><th>Cập Nhật</th>'
        + '</tr></thead><tbody id="nxhvlTb"><tr><td colspan="14" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div></div></div>';
        
    var _t;
    document.getElementById('nxhvlSearch').addEventListener('input', function () {
        clearTimeout(_t);
        _t = setTimeout(function () {
            _nxhvl.search = document.getElementById('nxhvlSearch').value || '';
            _nxhvlRender();
        }, 300);
    });
    _nxhvlLoadAll();
}

async function _nxhvlLoadAll() {
    try {
        var tR = await apiCall('/api/materialtx/tree');
        _nxhvl.tree = tR;
        _nxhvlRenderSb();
        await _nxhvlLoadRecs();
    } catch (e) {
        console.error('[NXHVL]', e);
    }
}

function formatDateTimeHM(d) {
    if (!d) return '—';
    try {
        var date = new Date(d);
        var formatter = new Intl.DateTimeFormat('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            hour12: false
        });
        var parts = formatter.formatToParts(date);
        var hour, minute, day, month;
        parts.forEach(function (p) {
            if (p.type === 'hour') hour = p.value;
            if (p.type === 'minute') minute = p.value;
            if (p.type === 'day') day = p.value;
            if (p.type === 'month') month = p.value;
        });

        var weekdayFormatter = new Intl.DateTimeFormat('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            weekday: 'long'
        });
        var weekdayStr = weekdayFormatter.format(date).toLowerCase();
        var dayMap = {
            'chủ nhật': 'Chủ Nhật',
            'thứ hai': 'Thứ 2',
            'thứ ba': 'Thứ 3',
            'thứ tư': 'Thứ 4',
            'thứ năm': 'Thứ 5',
            'thứ sáu': 'Thứ 6',
            'thứ bảy': 'Thứ 7'
        };
        var dayOfWeekMapped = dayMap[weekdayStr] || weekdayStr;
        return hour + ':' + minute + ' ' + dayOfWeekMapped + ' - ' + Number(day) + '/' + Number(month);
    } catch (e) {
        return d;
    }
}

function _nxhvlFD(d) { if (!d) return '—'; try { var p = d.split('T')[0].split('-'); return p[2] + '/' + p[1] + '/' + p[0]; } catch (e) { return d; } }
function _nxhvlFN(n) { if (!n && n !== 0) return '0'; return Number(n).toLocaleString('vi-VN'); }

function _nxhvlRenderSb() {
    var sb = document.getElementById('nxhvlSb');
    if (!sb || !_nxhvl.tree) return;
    var t = _nxhvl.tree, f = _nxhvl.filter;
    var h = '<div class="nxhvl-sb-title">────── 🔄 Hoàn Vật Liệu ──────</div>';
    h += '<div class="nxhvl-sb-total" onclick="_nxhvlFilter()"><span>📦 Tất cả</span><span style="font-size:16px;font-weight:900">' + (t.grand_total || 0) + '</span></div>';
    if (t.types) t.types.forEach(function (tp) {
        var tk = 't_' + tp.type, to = !!_nxhvlOpen[tk], cl = _nxhvlCL[tp.type] || '#0891b2';
        h += '<div class="nxhvl-sb-type" style="color:' + cl + '" onclick="_nxhvlTgl(\'' + tk+'\');_nxhvlFilter(\'' + tp.type + '\')"><span>' + (to ? '▼' : '▶') + ' ' + (_nxhvlIC[tp.type] || '') + ' ' + tp.label + '</span><span style="background:' + cl + ';color:#fff;padding:2px 10px;border-radius:10px;font-size:10px">' + tp.total + '</span></div>';
        if (to && tp.years) tp.years.forEach(function (yr) {
            var yk = tk + '_' + yr.year, yo = !!_nxhvlOpen[yk];
            h += '<div class="nxhvl-sb-yr" onclick="event.stopPropagation();_nxhvlTgl(\'' + yk + '\');_nxhvlFilter(\'' + tp.type + '\',' + yr.year + ')"><span>' + (yo ? '▼' : '▶') + ' 📆 ' + yr.year + '</span><span>' + yr.count + '</span></div>';
            if (yo) yr.months.forEach(function (mo) {
                var mA = f.tx_type === tp.type && f.year == yr.year && f.month == mo.month;
                h += '<div class="nxhvl-sb-mo' + (mA ? ' active' : '') + '" onclick="event.stopPropagation();_nxhvlFilter(\'' + tp.type + '\',' + yr.year + ',' + mo.month + ')"><span>T' + String(mo.month).padStart(2, '0') + '/' + yr.year + '</span><span>' + mo.count + '</span></div>';
            });
        });
    });
    sb.innerHTML = h;
}

function _nxhvlTgl(k) { _nxhvlOpen[k] = !_nxhvlOpen[k]; _nxhvlRenderSb(); }
function _nxhvlFilter(type, y, m) { _nxhvl.filter = { tx_type: type || null, year: y || null, month: m || null }; _nxhvlRenderSb(); _nxhvlLoadRecs(); }

async function _nxhvlLoadRecs() {
    var f = _nxhvl.filter, qs = '?_=1';
    if (f.tx_type) qs += '&tx_type=' + f.tx_type; if (f.year) qs += '&year=' + f.year; if (f.month) qs += '&month=' + f.month;
    try {
        var res = await apiCall('/api/materialtx/records' + qs);
        _nxhvl.records = res.records || [];
        _nxhvlRender();
    } catch (e) {
        console.error('[NXHVL]', e);
    }
}

function isGdOrTrinhFront() {
    return currentUser && (
        currentUser.role === 'giam_doc' || 
        currentUser.role === 'quan_ly_cap_cao' ||
        currentUser.full_name === 'Lê Việt Trinh' || 
        currentUser.username === 'leviettrinh' ||
        currentUser.username === 'trinh.lvt'
    );
}

function isAccountantOrMgmtFront() {
    if (isGdOrTrinhFront()) return true;
    if (currentUser && currentUser.department_name) {
        var n = currentUser.department_name.toLowerCase();
        if (n.includes('kế toán') || n.includes('ke toan')) return true;
    }
    return false;
}

function _nxhvlRender() {
    var all = _nxhvl.records.slice();
    if (_nxhvl.search) {
        var q = _nxhvl.search.toLowerCase();
        all = all.filter(function (r) {
            var inItems = false;
            if (r.material_items) {
                try {
                    var items = typeof r.material_items === 'string' ? JSON.parse(r.material_items) : r.material_items;
                    if (Array.isArray(items)) {
                        inItems = items.some(function(it) {
                            return (it.material_name || '').toLowerCase().indexOf(q) >= 0 ||
                                   (it.original_import_code || '').toLowerCase().indexOf(q) >= 0;
                        });
                    }
                } catch(e) {}
            }
            return (r.material_name || '').toLowerCase().indexOf(q) >= 0 ||
                (r.source_name || '').toLowerCase().indexOf(q) >= 0 ||
                (r.original_import_code || '').toLowerCase().indexOf(q) >= 0 ||
                (r.id && r.id.toString().indexOf(q) >= 0) || inItems;
        });
    }
    var tot = all.length, sumTA = 0, sumDebt = 0, sumPay = 0;
    all.forEach(function (r) {
        if (!r.is_canceled) {
            sumTA += Number(r.total_amount) || 0;
            sumDebt += Number(r.debt) || 0;
            sumPay += Number(r.payment) || 0;
        }
    });
    var tb = document.getElementById('nxhvlTb'); if (!tb) return;
    if (!all.length) {
        tb.innerHTML = '<tr><td colspan="14"><div class="empty-state"><div class="icon">🔄</div><h3>Chưa có giao dịch</h3></div></td></tr>';
    } else {
        tb.innerHTML = all.map(function (r, i) {
            var aI = r.is_approved ? '✅' : '⬜', aC = r.is_approved ? ' on' : '', aA = r.is_approved ? 'unapprove' : 'approve';
            var cl = _nxhvlCL[r.tx_type] || '#0891b2';
            var debt = Number(r.debt) || 0; var dB = debt > 0 ? '<span class="nxhvl-debt red">🔴 ' + _nxhvlFN(debt) + '</span>' : '<span class="nxhvl-debt green">✅ 0</span>';
            var upd = ''; if (r.last_update_at) { upd = _nxhvlFD(r.last_update_at); if (r.last_update_by) upd += '<br><span style="color:#0891b2;font-size:9px">' + r.last_update_by + '</span>'; }
            var clickHandler = r.tx_type === 'HOAN' ? ' style="cursor:pointer" onclick="if(event.target.tagName !== \'BUTTON\' && !event.target.closest(\'button\')) _nxhvlOpenViewReturnModal(' + r.id + ')"' : '';
            var rowStyle = r.is_canceled ? ' style="opacity: 0.65; background-color: #f1f5f9;"' : '';
            var btnHTML = '';
            if (r.is_canceled) {
                btnHTML = '<span style="color:#ef4444;font-size:10px;font-weight:700;background:#fee2e2;padding:2px 6px;border-radius:4px;white-space:nowrap;display:inline-block">❌ Đã hủy</span>';
            } else {
                if (r.tx_type === 'HOAN') {
                    var buttonsWrap = '';
                    if (!r.is_approved_1) {
                        buttonsWrap = '<button class="nxhvl-ib" onclick="event.stopPropagation(); _nxhvlOpenConfirm1Modal(' + r.id + ')" title="Xác nhận lần 1 (Đã bàn giao NCC)">⬜</button>';
                    } else if (!r.is_approved) {
                        buttonsWrap = '<button class="nxhvl-ib" style="background:#eab308; border-color:#eab308; color:#fff;" onclick="event.stopPropagation(); _nxhvlOpenConfirm2Modal(' + r.id + ')" title="Xác nhận lần 2 (Kế toán đối chiếu thực tế)">🟨</button>';
                    } else {
                        buttonsWrap = '<span style="font-size:16px; color:#10b981;" title="Đã hoàn tất xác nhận 2 bước">✅</span>';
                    }

                    if (!r.is_approved) {
                        var pEmoji = r.is_postponed ? '⏳' : '📅';
                        var pClass = r.is_postponed ? ' postpone on' : ' postpone';
                        var pTitle = r.is_postponed ? 'Đã lùi lịch hoàn vật liệu (Xem chi tiết/Hủy)' : 'Lùi lịch hoàn vật liệu';
                        buttonsWrap += '<button class="nxhvl-ib' + pClass + '" style="margin-left:5px" onclick="event.stopPropagation(); _nxhvlOpenPostponeModal(' + r.id + ')" title="' + pTitle + '">' + pEmoji + '</button>';
                    }

                    btnHTML = '<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px;">' +
                        '<div style="display:flex; align-items:center; justify-content:center; gap:5px;">' + buttonsWrap + '</div>';

                    if (r.is_approved_1 && !r.is_approved && r.needs_discrepancy_approval) {
                        btnHTML += '<span style="color:#d97706;font-size:9.5px;font-weight:700;display:block;white-space:normal;line-height:1.2;max-width:140px;text-align:center;">⚠️ Chờ QL duyệt sai lệch</span>';
                        if (isGdOrTrinhFront()) {
                            btnHTML += '<button class="nxhvl-ib" style="background:#10b981; border-color:#10b981; color:#fff; padding:3px 8px; font-size:10px; font-weight:700; border-radius:4px; height:auto; width:auto; line-height:1.2; display:inline-flex; align-items:center; gap:2px;" onclick="event.stopPropagation(); _nxhvlApproveDiscrepancy(' + r.id + ')" title="Duyệt sai lệch số lượng">🔔 Duyệt</button>';
                        }
                    }
                    btnHTML += '</div>';
                } else {
                    btnHTML = '<button class="nxhvl-ib' + aC + '" onclick="event.stopPropagation(); _nxhvlTog(' + r.id + ',\'' + aA + '\')" title="Duyệt">' + aI + '</button>';
                }
            }

            var billHoanCode = '—';
            if (r.tx_type === 'HOAN') {
                var num = r.seq_num || r.id;
                var badgeBg = r.is_canceled ? '#94a3b8' : '#059669';
                billHoanCode = '<span style="background:' + badgeBg + '; color:#fff; padding:3px 8px; border-radius:12px; font-weight:800; font-size:11px; display:inline-block; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">Hoàn Vật Liệu #' + num + '</span>';
            }

            var postponeDateStr = '—';
            if (r.tx_type === 'HOAN') {
                if (r.is_postponed && r.postponed_target_date) {
                    try {
                        var parts = r.postponed_target_date.split('T')[0].split('-');
                        var pYear = Number(parts[0]);
                        var pMonth = Number(parts[1]);
                        var pDay = Number(parts[2]);
                        var dStr = new Date(pYear, pMonth - 1, pDay);
                        var days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
                        postponeDateStr = days[dStr.getDay()] + ' - ' + pDay + '/' + pMonth;
                    } catch (e) {
                        postponeDateStr = r.postponed_target_date;
                    }
                }
            }

            var items = [];
            if (r.material_items) {
                try { items = typeof r.material_items === 'string' ? JSON.parse(r.material_items) : r.material_items; } catch(e) {}
            }
            if (!Array.isArray(items)) items = [];
            
            var nameHtml = '';
            var qtyHtml = '';
            var priceHtml = '';
            var unitHtml = '';
            
            if (items.length > 0) {
                nameHtml = items.map(function(it) {
                    return '• <b>' + _nxhvlEscapeHtml(it.material_name) + '</b><br><span style="font-size:9.5px;color:#94a3b8">Gốc: <a href="javascript:void(0)" onclick="event.stopPropagation(); _nxhvlOpenImportBill(' + it.import_record_id + ')" style="color:#4f46e5;text-decoration:underline;font-weight:700">#' + (it.original_import_code || it.import_record_id) + '</a></span>';
                }).join('<br>');
                
                qtyHtml = items.map(function(it) {
                    var itQtyStr = _nxhvlFN(it.quantity);
                    var itInit = Number(it.initial_quantity || it.quantity || 0);
                    if (itInit && itInit !== it.quantity) {
                        itQtyStr = '<span style="text-decoration:line-through;color:#94a3b8;font-size:9px">' + _nxhvlFN(itInit) + '</span><br><strong style="color:#0f766e">' + _nxhvlFN(it.quantity) + '</strong>';
                    }
                    return '• ' + itQtyStr;
                }).join('<br>');
                
                priceHtml = items.map(function(it) { return '• ' + _nxhvlFN(it.price); }).join('<br>');
                unitHtml = items.map(function(it) { return '• ' + _nxhvlEscapeHtml(it.unit || '—'); }).join('<br>');
            } else {
                var origCodeHtml = '—';
                if (r.import_record_id) {
                    origCodeHtml = '<a href="javascript:void(0)" onclick="event.stopPropagation(); _nxhvlOpenImportBill(' + r.import_record_id + ')" style="color:#4f46e5;text-decoration:underline;font-weight:700">#' + (r.original_import_code || r.import_record_id) + '</a>';
                }
                nameHtml = (_nxhvlEscapeHtml(r.material_name) || '—') + '<br><span style="font-size:9.5px;color:#94a3b8">Gốc: ' + origCodeHtml + '</span>';
                
                var qtyValStr = _nxhvlFN(r.quantity);
                if (r.initial_quantity && Number(r.initial_quantity) !== Number(r.quantity)) {
                    qtyValStr = '<span style="text-decoration:line-through;color:#94a3b8;font-size:9.5px">' + _nxhvlFN(r.initial_quantity) + '</span><br><strong style="color:#0f766e">' + _nxhvlFN(r.quantity) + '</strong>';
                }
                qtyHtml = qtyValStr;
                priceHtml = _nxhvlFN(r.price);
                unitHtml = _nxhvlEscapeHtml(r.unit) || '—';
            }

            return '<tr' + rowStyle + clickHandler + '><td style="text-align:center;font-weight:700;color:#94a3b8">' + (i + 1) + '</td>'
                + '<td style="text-align:center;font-weight:700">' + billHoanCode + '</td>'
                + '<td style="text-align:center">' + btnHTML + '</td>'
                + '<td style="text-align:center;font-weight:700;color:#d97706">' + postponeDateStr + '</td>'
                + '<td style="font-size:10px;font-weight:600;text-align:center">' + formatDateTimeHM(r.created_at) + '</td>'
                + '<td style="font-size:10px;color:#0891b2;font-weight:700">' + (r.source_name || '—') + '</td>'
                + '<td style="font-weight:600;color:#1e293b;vertical-align:middle;line-height:1.4;">' + nameHtml + '</td>'
                + '<td style="font-size:10px;color:#6366f1;font-weight:600;text-align:center;vertical-align:middle;line-height:1.4;">' + unitHtml + '</td>'
                + '<td style="font-size:12px;font-weight:800;color:#0f172a;text-align:center;vertical-align:middle;line-height:1.4;">' + qtyHtml + '</td>'
                + '<td style="text-align:right;font-weight:600;color:#f59e0b;vertical-align:middle;line-height:1.4;">' + priceHtml + '</td>'
                + '<td style="text-align:right;font-weight:800;color:#1e293b;vertical-align:middle;">' + _nxhvlFN(r.total_amount) + '</td>'
                + '<td style="text-align:center;vertical-align:middle;">' + dB + '</td>'
                + '<td style="text-align:right;color:#059669;font-weight:700;vertical-align:middle;">' + _nxhvlFN(r.payment) + '</td>'
                + '<td style="font-size:9px;color:#6b7280;vertical-align:middle;">' + upd + '</td></tr>';
        }).join('');
    }
    var el = document.getElementById('nxhvlInfo'); if (el) {
        var lbl = _nxhvl.filter.tx_type ? (_nxhvlTL[_nxhvl.filter.tx_type] || '') : 'Tất cả';
        el.innerHTML = '<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#0891b2,#06b6d4);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700">🔄 ' + lbl + ' — <span style="color:#a5f3fc;font-weight:900">' + tot + '</span> giao dịch</div>';
    }
    var sc = document.getElementById('nxhvlStats'); if (sc) {
        sc.innerHTML = '<div style="background:linear-gradient(135deg,#0891b2,#06b6d4);color:#fff;padding:8px 14px;border-radius:10px;min-width:90px;text-align:center"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">📦 TỔNG</div><div style="font-size:14px;font-weight:900">' + tot + '</div></div>'
            + '<div style="background:linear-gradient(135deg,#1e293b,#334155);color:#fff;padding:8px 14px;border-radius:10px;min-width:90px;text-align:center"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">💰 THÀNH TIỀN</div><div style="font-size:12px;font-weight:900">' + _nxhvlFN(sumTA) + '</div></div>'
            + '<div style="background:linear-gradient(135deg,' + (sumDebt > 0 ? '#ef4444,#dc2626' : '#059669,#10b981') + ');color:#fff;padding:8px 14px;border-radius:10px;min-width:90px;text-align:center"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">📊 CÔNG NỢ</div><div style="font-size:12px;font-weight:900">' + _nxhvlFN(sumDebt) + '</div></div>'
            + '<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:8px 14px;border-radius:10px;min-width:90px;text-align:center"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">✅ THANH TOÁN</div><div style="font-size:12px;font-weight:900">' + _nxhvlFN(sumPay) + '</div></div>';
    }
}

async function _nxhvlTog(id, action) {
    try {
        await apiCall('/api/materialtx/toggle/' + id, 'POST', { action }); showToast('✅ Cập nhật'); await _nxhvlLoadAll();
    } catch (e) { showToast(e.message || 'Lỗi', 'error'); }
}

// ========== CREATE MATERIAL RETURN (HOÀN VẬT LIỆU) MODAL ==========
var _nxhvl_retImportItems = [];
var _nxhvl_retFilteredItems = [];
var _nxhvl_retUniqueSources = [];
var _nxhvl_retSelectedItems = [];

async function _nxhvlOpenCreateReturnModal() {
    showToast('Đang tải dữ liệu nhập vật liệu...', 'info');

    _nxhvl_retSelectedItems = [];
    if (_nxhvl_postponePasteHandler) {
        document.removeEventListener('paste', _nxhvl_postponePasteHandler);
        _nxhvl_postponePasteHandler = null;
    }
    _nxhvl_postponeImageBlob = null;
    _nxhvl_postponeHolidays = [];

    try {
        var [impRes, holidayRes] = await Promise.all([
            apiCall('/api/materialtx/import-items'),
            apiCall('/api/penalty/holidays')
        ]);
        
        _nxhvl_retImportItems = impRes.items || [];
        _nxhvl_postponeHolidays = holidayRes.holidays || [];

        // Group unique sources
        var srcMap = {};
        _nxhvl_retImportItems.forEach(function(item) {
            if (item.source_id && item.source_name) {
                srcMap[item.source_id] = item.source_name;
            }
        });
        _nxhvl_retUniqueSources = Object.keys(srcMap).map(function(id) {
            return { id: Number(id), name: srcMap[id] };
        }).sort((a,b) => a.name.localeCompare(b.name));

        var bodyHTML = `
            <div class="nxhvl-modal-form" style="display:flex; flex-direction:column; gap:12px; font-size:12px; color:#1e293b; text-align:left;">
                <div style="display:grid; grid-template-columns: 1fr 1.2fr; gap:16px;">
                    <!-- Col 1: Picker of Imported Items -->
                    <div style="border-right:1px solid #cbd5e1; padding-right:16px;">
                        <span style="font-size:13px; font-weight:800; color:#0f766e; display:block; margin-bottom:8px;">👉 BƯỚC 1: Chọn Nhà cung cấp & Vật liệu</span>
                        
                        <div style="margin-bottom:10px;">
                            <label style="font-weight:700; display:block; margin-bottom:4px;">1. Chọn Nhà Cung Cấp:</label>
                            <select id="nxhvl_m_source_select" class="form-control" onchange="_nxhvlOnSourceChanged(this.value)" style="width:100%; font-size:12px; padding:6px 10px;">
                                <option value="">— Chọn Nhà Cung Cấp —</option>
                                ${_nxhvl_retUniqueSources.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                            </select>
                        </div>

                        <div style="margin-bottom:10px;">
                            <label style="font-weight:700; display:block; margin-bottom:4px;">2. Tìm nhanh Vật Liệu đã nhập:</label>
                            <input type="text" id="nxhvl_m_search_items" class="form-control" placeholder="Tìm tên vật liệu, mã bill..." style="width:100%; font-size:12px; padding:6px 10px;" oninput="_nxhvlOnSearchImportItems(this.value)" disabled />
                        </div>

                        <label style="font-weight:700; display:block; margin-bottom:4px;">3. Chọn một mặt hàng cụ thể dưới đây:</label>
                        <div id="nxhvl_m_items_container" style="max-height:260px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; padding:10px; background:#f8fafc; display:flex; flex-direction:column; gap:6px;">
                            <div style="text-align:center; color:#64748b; padding:30px 10px; font-weight:600; font-size:11px;">⚠️ Vui lòng chọn nhà cung cấp trước...</div>
                        </div>
                    </div>

                    <!-- Col 2: Refund Details & Scheduling -->
                    <div>
                        <span style="font-size:13px; font-weight:800; color:#0891b2; display:block; margin-bottom:8px;">📋 BƯỚC 2: Danh sách vật liệu hoàn trả</span>
                        
                        <input type="hidden" id="nxhvl_m_import_record_id" value="" />
                        <input type="hidden" id="nxhvl_m_material_item_id" value="" />
                        <input type="hidden" id="nxhvl_m_qty_orig" value="" />
                        <input type="hidden" id="nxhvl_m_unit_preview" value="" />
                        <input type="hidden" id="nxhvl_m_quantity" value="" />
                        <input type="hidden" id="nxhvl_m_price" value="" />

                        <div id="nxhvl_selected_items_list" style="max-height:220px; overflow-y:auto; border:1px dashed #cbd5e1; border-radius:8px; padding:10px; background:#f8fafc; margin-bottom:12px; display:flex; flex-direction:column; gap:8px;">
                            <div style="text-align:center; color:#94a3b8; padding:30px 10px; font-weight:600; font-size:11px;">⚠️ Chưa chọn mặt hàng nào cần hoàn trả...</div>
                        </div>

                        <div style="background:#fee2e2; border:1px solid #fecaca; padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                            <strong style="color:#b91c1c;">💰 TỔNG TIỀN HOÀN TRẢ:</strong>
                            <strong id="nxhvl_m_total_val" style="color:#b91c1c; font-size:15px;">0₫</strong>
                        </div>

                        <div style="margin-bottom:10px;">
                            <label style="font-weight:700; display:block; margin-bottom:4px;">Ghi Chú Hoàn Trả:</label>
                            <textarea id="nxhvl_m_notes" class="form-control" placeholder="Nhập lý do hoàn trả, tình trạng vật liệu..." style="width:100%; height:40px; font-size:12px; padding:6px 10px; resize:none;"></textarea>
                        </div>

                        <!-- Proof Image upload/paste area only -->
                        <div style="border-top:1px dashed #cbd5e1; padding-top:10px;">
                            <label style="display:inline-flex; align-items:center; gap:8px; font-weight:800; color:#b45309; font-size:12px; margin-bottom:6px;">
                                📸 ẢNH VẬT LIỆU HOÀN TRẢ (BẮT BUỘC)
                            </label>
                            
                            <div id="postponePasteArea" style="border: 2px dashed #cbd5e1; border-radius:8px; padding:15px; text-align:center; color:#64748b; cursor:pointer; background:#fff; font-size:11px; margin-bottom:10px;" tabindex="0">
                                <div id="postponePastePlaceholder">
                                    <span style="font-size:20px; display:block; margin-bottom:4px;">📸</span>
                                    <span>Click vào đây rồi Ctrl+V để dán ảnh vật liệu hoàn trả</span>
                                </div>
                                <div id="postponeImgPreviewWrap" style="display:none; position:relative; width:100%; justify-content:center; align-items:center;">
                                    <img id="postponeImagePreview" style="max-height:120px; max-width:100%; border-radius:6px; border:1px solid #cbd5e1; object-fit:contain;" />
                                    <button id="btnPostponeClearImg" type="button" class="btn" style="position:absolute; top:2px; right:2px; padding:1px 6px; font-size:9px; background:#ef4444; border:none; color:#fff; border-radius:4px; cursor:pointer;" onclick="event.stopPropagation(); _nxhvlClearPostponeImage()">❌ Xóa</button>
                                </div>
                            </div>
                            <input type="hidden" id="postponeDate" value="" />
                        </div>

                    </div>
                </div>
            </div>
        `;

        var footerHTML = `
            <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
            <button class="btn btn-primary" id="nxhvl_m_submit" style="background:#059669; border:none; color:#fff;" onclick="_nxhvlSubmitCreateReturn()" disabled>🔄 Tạo Hoàn Vật Liệu</button>
        `;

        openModal('🔄 Tạo Giao Dịch Hoàn Vật Liệu', bodyHTML, footerHTML);

        var modalContainer = document.getElementById('modalContainer');
        if (modalContainer) {
            modalContainer.style.width = '850px';
            modalContainer.style.maxWidth = '95%';
        }

        // Add Paste handler
        _nxhvl_postponePasteHandler = function (e) {
            var items = (e.clipboardData || e.originalEvent.clipboardData).items;
            var imageItem = null;
            for (var i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    imageItem = items[i];
                    break;
                }
            }
            if (imageItem) {
                var blob = imageItem.getAsFile();
                _nxhvlProcessAndPreviewPostponeImage(blob);
            }
        };
        var pasteArea = document.getElementById('postponePasteArea');
        if (pasteArea) {
            pasteArea.addEventListener('paste', _nxhvl_postponePasteHandler);
        }
        
    } catch (e) {
        showToast('Lỗi: ' + e.message, 'error');
    }
}

function _nxhvlOnSourceChanged(val) {
    var searchInput = document.getElementById('nxhvl_m_search_items');
    
    // Clear selected items when supplier changes
    if (_nxhvl_retSelectedItems.length > 0) {
        _nxhvl_retSelectedItems = [];
        showToast('Đã đổi Nhà cung cấp, danh sách vật liệu hoàn trả được làm mới.', 'info');
        _nxhvlRenderSelectedItemsList();
    }

    if (!val) {
        if (searchInput) {
            searchInput.value = '';
            searchInput.disabled = true;
        }
        document.getElementById('nxhvl_m_items_container').innerHTML = '<div style="text-align:center; color:#64748b; padding:30px 10px; font-weight:600; font-size:11px;">⚠️ Vui lòng chọn nhà cung cấp trước...</div>';
        return;
    }
    if (searchInput) {
        searchInput.disabled = false;
        searchInput.placeholder = '🔍 Tìm tên vật liệu, mã bill...';
    }
    _nxhvl_retFilteredItems = _nxhvl_retImportItems.filter(function(item) {
        return Number(item.source_id) === Number(val);
    });
    _nxhvlRenderImportItemsList();
}

function _nxhvlOnSearchImportItems(val) {
    var searchVal = val.toLowerCase().trim();
    var sourceId = document.getElementById('nxhvl_m_source_select').value;
    _nxhvl_retFilteredItems = _nxhvl_retImportItems.filter(function(item) {
        var matchesSrc = Number(item.source_id) === Number(sourceId);
        if (!matchesSrc) return false;
        if (!searchVal) return true;
        return (item.material_item_name || '').toLowerCase().indexOf(searchVal) >= 0 ||
               (item.fabric_import_code || '').toLowerCase().indexOf(searchVal) >= 0;
    });
    _nxhvlRenderImportItemsList();
}

function _nxhvlRenderImportItemsList() {
    var container = document.getElementById('nxhvl_m_items_container');
    if (!container) return;
    if (!_nxhvl_retFilteredItems.length) {
        container.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:20px; font-size:11px;">Không tìm thấy vật liệu nào đã nhập</div>';
        return;
    }
    container.innerHTML = _nxhvl_retFilteredItems.map(function(item, idx) {
        var dateStr = _nxhvlFD(item.import_date);
        return `
            <div class="import-item-row" style="background:#fff; border:1px solid #cbd5e1; border-radius:6px; padding:6px 10px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; transition:all 0.15s;" onclick="_nxhvlSelectImportItem(${item.import_record_id}, ${item.material_item_id}, '${_nxhvlEscapeHtml(item.material_item_name)}', ${item.quantity}, ${item.price}, '${_nxhvlEscapeHtml(item.unit || '')}', '${_nxhvlEscapeHtml(item.fabric_import_code || '')}')">
                <div>
                    <strong style="color:#0f766e; font-size:12px;">${item.material_item_name}</strong>
                    <div style="font-size:10px; color:#64748b; margin-top:2px;">Bill: <b>${item.fabric_import_code || '—'}</b> - Ngày: <b>${dateStr}</b></div>
                </div>
                <div style="text-align:right;">
                    <strong style="color:#1e293b; font-size:11px;">${_nxhvlFN(item.quantity)} ${item.unit || ''}</strong>
                    <div style="font-size:10px; color:#d97706; font-weight:700; margin-top:2px;">${_nxhvlFN(item.price)}đ</div>
                </div>
            </div>
        `;
    }).join('');
}

function _nxhvlSelectImportItem(importId, itemId, name, quantity, price, unit, code) {
    var exists = _nxhvl_retSelectedItems.some(function(it) {
        return Number(it.import_record_id) === Number(importId) && Number(it.material_item_id) === Number(itemId);
    });
    if (exists) {
        showToast('Mặt hàng này đã có trong danh sách hoàn trả.', 'warning');
        return;
    }

    // Populate hidden inputs for any legacy functions that read them
    document.getElementById('nxhvl_m_import_record_id').value = importId;
    document.getElementById('nxhvl_m_material_item_id').value = itemId;
    document.getElementById('nxhvl_m_qty_orig').value = quantity;
    document.getElementById('nxhvl_m_unit_preview').value = unit;
    document.getElementById('nxhvl_m_quantity').value = quantity;
    document.getElementById('nxhvl_m_price').value = price;

    _nxhvl_retSelectedItems.push({
        import_record_id: Number(importId),
        material_item_id: Number(itemId),
        material_name: name,
        orig_qty: Number(quantity),
        quantity: Number(quantity),
        price: Number(price),
        unit: unit || '',
        original_import_code: code || String(importId)
    });

    showToast('Đã thêm: ' + name, 'success');
    _nxhvlRenderSelectedItemsList();
}

function _nxhvlRemoveSelectedRetItem(idx) {
    _nxhvl_retSelectedItems.splice(idx, 1);
    _nxhvlRenderSelectedItemsList();
}

function _nxhvlUpdateRetItemQty(idx, val) {
    _nxhvl_retSelectedItems[idx].quantity = Number(val) || 0;
    _nxhvlUpdateFinValues();
    // Render only the totals rather than full refresh to avoid losing cursor focus
    var rowTotalEl = document.querySelectorAll('.selected-ret-item-row')[idx]?.querySelector('strong[style*="color:#b91c1c"]');
    if (rowTotalEl) {
        rowTotalEl.textContent = _nxhvlFN(_nxhvl_retSelectedItems[idx].quantity * _nxhvl_retSelectedItems[idx].price) + 'đ';
    }
}

function _nxhvlUpdateRetItemPrice(idx, val) {
    _nxhvl_retSelectedItems[idx].price = Number(val) || 0;
    _nxhvlUpdateFinValues();
    var rowTotalEl = document.querySelectorAll('.selected-ret-item-row')[idx]?.querySelector('strong[style*="color:#b91c1c"]');
    if (rowTotalEl) {
        rowTotalEl.textContent = _nxhvlFN(_nxhvl_retSelectedItems[idx].quantity * _nxhvl_retSelectedItems[idx].price) + 'đ';
    }
}

function _nxhvlRenderSelectedItemsList() {
    var container = document.getElementById('nxhvl_selected_items_list');
    if (!container) return;

    if (_nxhvl_retSelectedItems.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:30px 10px; font-weight:600; font-size:11px;">⚠️ Chưa chọn mặt hàng nào cần hoàn trả...</div>';
        document.getElementById('nxhvl_m_submit').disabled = true;
        _nxhvlUpdateFinValues();
        return;
    }

    var isGDOrTrinh = isGdOrTrinhFront();
    var priceReadonlyAttr = isGDOrTrinh ? '' : 'readonly';
    var priceBgStyle = isGDOrTrinh ? 'background:#fff;' : 'background:#f1f5f9; cursor:not-allowed;';

    container.innerHTML = _nxhvl_retSelectedItems.map(function(item, idx) {
        return `
            <div class="selected-ret-item-row" style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:8px 10px; display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <strong style="color:#0f766e; font-size:11px;">${_nxhvlEscapeHtml(item.material_name)}</strong>
                        <div style="font-size:10px; color:#64748b; margin-top:2px;">Bill gốc: #${item.original_import_code} (SL gốc: ${_nxhvlFN(item.orig_qty)} ${item.unit})</div>
                    </div>
                    <button type="button" class="btn" style="padding:1px 5px; font-size:9px; background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; border-radius:4px; cursor:pointer;" onclick="_nxhvlRemoveSelectedRetItem(${idx})">❌ Xóa</button>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px; align-items:center;">
                    <div>
                        <label style="font-weight:700; font-size:9.5px; color:#b45309; display:block; margin-bottom:2px;">SL hoàn:</label>
                        <input type="number" value="${item.quantity}" class="form-control" style="padding:4px; font-size:11px; font-weight:700; height:24px; border-color:#d97706;" min="0.01" step="any" oninput="_nxhvlUpdateRetItemQty(${idx}, this.value)" />
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:9.5px; color:#475569; display:block; margin-bottom:2px;">Đơn giá:</label>
                        <input type="number" value="${item.price}" ${priceReadonlyAttr} class="form-control" style="padding:4px; font-size:11px; font-weight:700; height:24px; ${priceBgStyle}" oninput="_nxhvlUpdateRetItemPrice(${idx}, this.value)" />
                    </div>
                    <div style="text-align:right;">
                        <label style="font-weight:700; font-size:9.5px; color:#475569; display:block; margin-bottom:2px;">Thành tiền:</label>
                        <strong style="color:#b91c1c; font-size:11.5px;">${_nxhvlFN(item.quantity * item.price)}đ</strong>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('nxhvl_m_submit').disabled = false;
    _nxhvlUpdateFinValues();
}

function _nxhvlUpdateFinValues() {
    var total = _nxhvl_retSelectedItems.reduce(function(sum, item) {
        return sum + (item.quantity * item.price);
    }, 0);
    var el = document.getElementById('nxhvl_m_total_val');
    if (el) el.textContent = _nxhvlFN(total) + '₫';
}

function _nxhvlEscapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Custom calendar logic
var _nxhvlCalCurrentYear = new Date().getFullYear();
var _nxhvlCalCurrentMonth = new Date().getMonth();
var _nxhvlCalSelectedDate = '';
var _nxhvlCalAllowedDates = [];
var _nxhvl_postponeHolidays = [];
var _nxhvl_postponeImageBlob = null;
var _nxhvl_postponePasteHandler = null;

function _nxhvlGetAllowedPostponeDates(maxDays, holidays) {
    var list = [];
    var current = new Date();
    current.setHours(0,0,0,0);

    var count = 0;
    var safetyLimit = 100;
    while (count < maxDays && safetyLimit > 0) {
        safetyLimit--;
        current.setDate(current.getDate() + 1);
        
        var y = current.getFullYear();
        var m = String(current.getMonth() + 1).padStart(2, '0');
        var d = String(current.getDate()).padStart(2, '0');
        var dateStr = y + '-' + m + '-' + d;
        
        if (current.getDay() === 0) continue; // Sunday
        
        var isHoliday = holidays.some(function(h) { return h.holiday_date === dateStr; });
        if (isHoliday) continue;
        
        list.push({ dateStr: dateStr, dateObj: new Date(current.getTime()) });
        count++;
    }
    return list;
}

function _nxhvlInitCustomCalendar(maxDays, holidays) {
    _nxhvlCalAllowedDates = _nxhvlGetAllowedPostponeDates(maxDays, holidays);
    var now = new Date();
    _nxhvlCalCurrentYear = now.getFullYear();
    _nxhvlCalCurrentMonth = now.getMonth();
    _nxhvlCalSelectedDate = '';
    _nxhvlRenderCustomCalendar();

    setTimeout(function() {
        var prevBtn = document.getElementById('calPrevMonth');
        var nextBtn = document.getElementById('calNextMonth');
        if (prevBtn) {
            prevBtn.onclick = function(e) {
                e.preventDefault(); e.stopPropagation();
                if (_nxhvlCalCurrentMonth === 0) { _nxhvlCalCurrentYear--; _nxhvlCalCurrentMonth = 11; } else { _nxhvlCalCurrentMonth--; }
                _nxhvlRenderCustomCalendar();
            };
        }
        if (nextBtn) {
            nextBtn.onclick = function(e) {
                e.preventDefault(); e.stopPropagation();
                if (_nxhvlCalCurrentMonth === 11) { _nxhvlCalCurrentYear++; _nxhvlCalCurrentMonth = 0; } else { _nxhvlCalCurrentMonth++; }
                _nxhvlRenderCustomCalendar();
            };
        }
    }, 50);
}

function _nxhvlRenderCustomCalendar() {
    var monthYearText = document.getElementById('calMonthYear');
    if (monthYearText) {
        monthYearText.textContent = 'Tháng ' + (_nxhvlCalCurrentMonth + 1) + ' / ' + _nxhvlCalCurrentYear;
    }
    
    var grid = document.getElementById('calDaysGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    var firstDay = new Date(_nxhvlCalCurrentYear, _nxhvlCalCurrentMonth, 1);
    var startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    var totalDays = new Date(_nxhvlCalCurrentYear, _nxhvlCalCurrentMonth + 1, 0).getDate();
    
    for (var i = 0; i < startOffset; i++) {
        var blank = document.createElement('div');
        grid.appendChild(blank);
    }
    
    for (var day = 1; day <= totalDays; day++) {
        var dayDiv = document.createElement('div');
        dayDiv.style.padding = '6px 2px';
        dayDiv.style.borderRadius = '6px';
        dayDiv.style.fontWeight = '700';
        dayDiv.style.display = 'flex';
        dayDiv.style.alignItems = 'center';
        dayDiv.style.justifyContent = 'center';
        dayDiv.style.fontSize = '11px';
        dayDiv.style.transition = 'all 0.15s ease';
        
        var dateStr = _nxhvlCalCurrentYear + '-' + String(_nxhvlCalCurrentMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        var allowedInfo = _nxhvlCalAllowedDates.find(function(item) { return item.dateStr === dateStr; });
        var dateObj = new Date(_nxhvlCalCurrentYear, _nxhvlCalCurrentMonth, day);
        var isSunday = dateObj.getDay() === 0;
        
        dayDiv.textContent = day;
        
        if (allowedInfo) {
            dayDiv.style.cursor = 'pointer';
            dayDiv.style.color = '#1e293b';
            dayDiv.style.background = '#f1f5f9';
            dayDiv.style.border = '1px solid #cbd5e1';
            dayDiv.title = 'Chọn lịch hẹn hoàn trả';
            
            dayDiv.onmouseover = function() {
                if (this.dataset.selected !== 'true') {
                    this.style.background = '#e2e8f0';
                    this.style.borderColor = '#94a3b8';
                }
            };
            dayDiv.onmouseout = function() {
                if (this.dataset.selected !== 'true') {
                    this.style.background = '#f1f5f9';
                    this.style.borderColor = '#cbd5e1';
                }
            };
            
            (function(dStr) {
                dayDiv.onclick = function(e) {
                    e.preventDefault(); e.stopPropagation();
                    _nxhvlCalSelectedDate = dStr;
                    document.getElementById('postponeDate').value = dStr;
                    _nxhvlRenderCustomCalendar();
                };
            })(dateStr);
            
            if (_nxhvlCalSelectedDate === dateStr) {
                dayDiv.style.background = '#059669';
                dayDiv.style.color = '#fff';
                dayDiv.style.borderColor = '#059669';
                dayDiv.dataset.selected = 'true';
            }
        } else {
            dayDiv.style.color = '#cbd5e1';
            dayDiv.style.background = '#f8fafc';
            dayDiv.style.cursor = 'not-allowed';
            if (isSunday) {
                dayDiv.style.color = '#fecaca';
                dayDiv.title = 'Chủ Nhật không hoạt động';
            } else {
                dayDiv.title = 'Không khả dụng';
            }
        }
        grid.appendChild(dayDiv);
    }
}

function _nxhvlProcessAndPreviewPostponeImage(file) {
    var reader = new FileReader();
    reader.onload = function(event) {
        var img = new Image();
        img.onload = function() {
            var canvas = document.createElement('canvas');
            var max_width = 800;
            var width = img.width;
            var height = img.height;
            if (width > max_width) {
                height = Math.round((height * max_width) / width);
                width = max_width;
            }
            canvas.width = width;
            canvas.height = height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(function(blob) {
                _nxhvl_postponeImageBlob = blob;
                var previewUrl = URL.createObjectURL(blob);
                var imgEl = document.getElementById('postponeImagePreview');
                var placeholderEl = document.getElementById('postponePastePlaceholder');
                var wrapEl = document.getElementById('postponeImgPreviewWrap');
                var pasteArea = document.getElementById('postponePasteArea');
                if (imgEl && pasteArea) {
                    imgEl.src = previewUrl;
                    if (placeholderEl) placeholderEl.style.display = 'none';
                    if (wrapEl) wrapEl.style.display = 'flex';
                    pasteArea.style.borderColor = '#10b981';
                }
            }, 'image/webp', 0.75);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function _nxhvlClearPostponeImage() {
    _nxhvl_postponeImageBlob = null;
    var imgEl = document.getElementById('postponeImagePreview');
    var placeholderEl = document.getElementById('postponePastePlaceholder');
    var wrapEl = document.getElementById('postponeImgPreviewWrap');
    var pasteArea = document.getElementById('postponePasteArea');
    if (imgEl) imgEl.src = '';
    if (placeholderEl) placeholderEl.style.display = 'block';
    if (wrapEl) wrapEl.style.display = 'none';
    if (pasteArea) pasteArea.style.borderColor = '#cbd5e1';
}

async function _nxhvlSubmitCreateReturn() {
    if (_nxhvl_retSelectedItems.length === 0) {
        showToast('Vui lòng chọn ít nhất một mặt hàng cần hoàn trả.', 'error');
        return;
    }
    
    // Validate quantities
    for (var i = 0; i < _nxhvl_retSelectedItems.length; i++) {
        if (_nxhvl_retSelectedItems[i].quantity <= 0) {
            showToast('Số lượng hoàn trả của ' + _nxhvl_retSelectedItems[i].material_name + ' phải lớn hơn 0.', 'error');
            return;
        }
    }
    
    if (!_nxhvl_postponeImageBlob) {
        showToast('Vui lòng dán ảnh chụp thực tế vật liệu hoàn trả (bắt buộc).', 'error');
        return;
    }
    
    var notes = document.getElementById('nxhvl_m_notes').value || '';
    
    var submitBtn = document.getElementById('nxhvl_m_submit');
    if (submitBtn) submitBtn.disabled = true;

    try {
        var postponeImgUrl = '';
        if (_nxhvl_postponeImageBlob) {
            // Upload proof photo
            var fd = new FormData();
            fd.append('file', _nxhvl_postponeImageBlob, 'proof.webp');
            var uploadRes = await fetch('/api/materialtx/upload-postpone/0', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
                body: fd
            });
            var upData = await uploadRes.json();
            if (upData.success) {
                postponeImgUrl = upData.url;
            }
        }

        var totalQty = _nxhvl_retSelectedItems.reduce(function(sum, item) { return sum + item.quantity; }, 0);
        var totalCost = _nxhvl_retSelectedItems.reduce(function(sum, item) { return sum + (item.quantity * item.price); }, 0);
        var avgPrice = totalQty > 0 ? (totalCost / totalQty) : 0;

        var postData = {
            tx_type: 'HOAN',
            material_item_id: _nxhvl_retSelectedItems[0].material_item_id,
            import_record_id: _nxhvl_retSelectedItems[0].import_record_id,
            quantity: totalQty,
            price: avgPrice,
            notes: notes,
            is_postponed: false,
            postponed_target_date: null,
            postponed_notes: notes,
            postponed_images: postponeImgUrl ? [postponeImgUrl] : [],
            bill_images: postponeImgUrl ? [postponeImgUrl] : [],
            material_items: _nxhvl_retSelectedItems
        };

        var res = await apiCall('/api/materialtx/records', 'POST', postData);
        if (res.error) {
            showToast(res.error, 'error');
            if (submitBtn) submitBtn.disabled = false;
        } else {
            showToast('Tạo hoàn vật liệu thành công!', 'success');
            closeModal();
            _nxhvlLoadAll();
        }
    } catch(e) {
        showToast('Lỗi: ' + e.message, 'error');
        if (submitBtn) submitBtn.disabled = false;
    }
}

// ========== VIEW / CONFIRM 2-STEP Lifecycles ==========
var _nxhvl_c2Items = [];

async function _nxhvlOpenViewReturnModal(id) {
    var r = _nxhvl.records.find(item => item.id === id);
    if (!r) {
        showToast('Không tìm thấy giao dịch', 'error');
        return;
    }
    
    var formattedDate = _nxhvlFD(r.tx_date || r.created_at);
    
    var imgsHTML = '';
    try {
        var ia = typeof r.bill_images === 'string' ? JSON.parse(r.bill_images) : r.bill_images;
        if (ia && ia.length) {
            imgsHTML = `
                <div style="margin-top:8px;">
                    <span style="font-weight:700; display:block; margin-bottom:4px; font-size:11px; color:#1e40af;">📸 Ảnh Hóa Đơn / Hoàn Vật Liệu:</span>
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        ${ia.map(url => `
                            <a href="${url}" target="_blank">
                                <img src="${url}" style="width:80px; height:80px; object-fit:cover; border-radius:6px; border:1px solid #bfdbfe;" />
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    } catch (e) {}

    var confirmHTML = '';
    if (r.is_approved_1) {
        var ap1By = r.approved_1_by_name || 'Hệ thống';
        var ap1At = r.approved_1_at ? formatDateTimeHM(r.approved_1_at) : '—';
        
        var ap2By = '—';
        var ap2At = '—';
        var actQtyText = '—';
        var diffText = '—';
        var actualNotes = r.actual_quantity_notes || '—';
        var actualImgsHTML = '';

        if (r.is_approved) {
            ap2By = r.approved_by_name || 'Hệ thống';
            ap2At = r.approved_at ? formatDateTimeHM(r.approved_at) : '—';
            actQtyText = _nxhvlFN(r.actual_quantity) + ' ' + (r.unit || '');
            var diff = (Number(r.actual_quantity) || 0) - (Number(r.initial_quantity) || Number(r.quantity) || 0);
            diffText = diff !== 0 ? (diff > 0 ? '+' : '') + _nxhvlFN(diff) + ' ' + (r.unit || '') : '0 ' + (r.unit || '');
            
            try {
                var actImgs = typeof r.actual_quantity_images === 'string' ? JSON.parse(r.actual_quantity_images) : r.actual_quantity_images;
                if (actImgs && actImgs.length) {
                    actualImgsHTML = '<div style="margin-top:8px;">' +
                        '<span style="font-weight:700; display:block; margin-bottom:4px; font-size:11px; color:#b45309;">📸 Ảnh chênh lệch thực tế:</span>' +
                        '<div style="display:flex; gap:6px; flex-wrap:wrap;">' +
                            actImgs.map(function(url) {
                                return '<a href="' + url + '" target="_blank">' +
                                       '<img src="' + url + '" style="width:80px; height:80px; object-fit:cover; border-radius:6px; border:1px solid #fcd34d;" />' +
                                       '</a>';
                              }).join('') +
                        '</div>' +
                    '</div>';
                }
            } catch(e) {}
        }

        confirmHTML = `
            <div style="border-top: 1px solid #e2e8f0; margin-top:12px; padding-top:12px;">
                <span style="font-size:13px; font-weight:800; color:#b45309; display:block; margin-bottom:8px;">🔒 Thông Tin Xác Nhận 2 Bước</span>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                    <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:10px;">
                        <strong style="color:#1e40af; display:block; margin-bottom:4px;">⬜ Xác nhận lần 1 (Bàn giao NCC):</strong>
                        <span style="display:block;">• Người duyệt: <b>${ap1By}</b></span>
                        <span style="display:block;">• Thời gian: <b>${ap1At}</b></span>
                        ${imgsHTML}
                    </div>
                    <div style="background:#fef3c7; border:1px solid #fcd34d; border-radius:8px; padding:10px;">
                        <strong style="color:#d97706; display:block; margin-bottom:4px;">🟨 Xác nhận lần 2 (Kế toán chốt):</strong>
                        <span style="display:block;">• Người duyệt: <b>${ap2By}</b></span>
                        <span style="display:block;">• Thời gian: <b>${ap2At}</b></span>
                        <span style="display:block;">• Thực tế chốt: <b>${actQtyText}</b> (Lệch: <b>${diffText}</b>)</span>
                        <span style="display:block; margin-top:4px;">• Ghi chú: <i>${actualNotes}</i></span>
                        ${actualImgsHTML}
                    </div>
                </div>
            </div>
        `;
    }

    var items = [];
    if (r.material_items) {
        try { items = typeof r.material_items === 'string' ? JSON.parse(r.material_items) : r.material_items; } catch(e) {}
    }
    if (!Array.isArray(items)) items = [];

    var itemsHTML = '';
    if (items.length > 0) {
        itemsHTML = `
            <div style="margin-bottom:12px;">
                <label style="font-weight:700; display:block; margin-bottom:4px; color:#0f766e;">📦 Chi Tiết Danh Sách Vật Liệu Hoàn Trả:</label>
                <div style="overflow-x:auto; border:1px solid #cbd5e1; border-radius:8px; background:#fff;">
                    <table class="table" style="width:100%; margin:0; font-size:11.5px; border-collapse:collapse;">
                        <thead>
                            <tr style="background:#f8fafc; border-bottom:1px solid #cbd5e1; text-align:left;">
                                <th style="padding:6px 8px; font-weight:700; color:#475569;">Tên vật liệu</th>
                                <th style="padding:6px 8px; font-weight:700; color:#475569;">Bill gốc</th>
                                <th style="padding:6px 8px; font-weight:700; color:#475569; text-align:center;">Số lượng gốc</th>
                                <th style="padding:6px 8px; font-weight:700; color:#475569; text-align:center;">Số lượng hoàn</th>
                                <th style="padding:6px 8px; font-weight:700; color:#475569; text-align:right;">Đơn giá</th>
                                <th style="padding:6px 8px; font-weight:700; color:#475569; text-align:right;">Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(function(it) {
                                return `
                                    <tr style="border-bottom:1px solid #f1f5f9;">
                                        <td style="padding:6px 8px; font-weight:600; color:#1e293b;">${_nxhvlEscapeHtml(it.material_name)}</td>
                                        <td style="padding:6px 8px; color:#4f46e5; font-weight:700;">#${it.original_import_code || it.import_record_id}</td>
                                        <td style="padding:6px 8px; text-align:center; color:#64748b;">${_nxhvlFN(it.orig_qty || it.initial_quantity || it.quantity)} ${_nxhvlEscapeHtml(it.unit || '')}</td>
                                        <td style="padding:6px 8px; text-align:center; font-weight:700; color:#0f766e;">${_nxhvlFN(it.quantity)} ${_nxhvlEscapeHtml(it.unit || '')}</td>
                                        <td style="padding:6px 8px; text-align:right; color:#f59e0b; font-weight:600;">${_nxhvlFN(it.price)}đ</td>
                                        <td style="padding:6px 8px; text-align:right; font-weight:700; color:#1e293b;">${_nxhvlFN(it.quantity * it.price)}đ</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } else {
        itemsHTML = `
            <div style="display:grid; grid-template-columns:2fr 1fr; gap:12px;">
                <div>
                    <label style="font-weight:700; display:block; margin-bottom:4px;">Tên Vật Liệu:</label>
                    <input type="text" value="${_nxhvlEscapeHtml(r.material_name) || ''}" class="form-control" readonly style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9;" />
                </div>
                <div>
                    <label style="font-weight:700; display:block; margin-bottom:4px;">Hóa Đơn Nhập Gốc:</label>
                    <input type="text" value="${r.original_import_code || r.import_record_id || ''}" class="form-control" readonly style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9;" />
                </div>
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
                <div>
                    <label style="font-weight:700; display:block; margin-bottom:4px;">Số Lượng Đề Xuất:</label>
                    <input type="text" value="${_nxhvlFN(r.quantity)} ${_nxhvlEscapeHtml(r.unit) || ''}" class="form-control" readonly style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9;" />
                </div>
                <div>
                    <label style="font-weight:700; display:block; margin-bottom:4px;">Đơn Giá Hoàn:</label>
                    <input type="text" value="${_nxhvlFN(r.price)}đ" class="form-control" readonly style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9;" />
                </div>
                <div>
                    <label style="font-weight:700; display:block; margin-bottom:4px;">Thành Tiền Hoàn:</label>
                    <input type="text" value="${_nxhvlFN(r.total_amount)}đ" class="form-control" readonly style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9; font-weight:700;" />
                </div>
            </div>
        `;
    }

    var bodyHTML = `
        <div class="nxhvl-modal-form" style="display:flex; flex-direction:column; gap:12px; font-size:12px; color:#1e293b; text-align:left;">
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
                <div>
                    <label style="font-weight:700; display:block; margin-bottom:4px;">Nguồn Vật Liệu:</label>
                    <input type="text" value="${_nxhvlEscapeHtml(r.source_name) || ''}" class="form-control" readonly style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9;" />
                </div>
                <div>
                    <label style="font-weight:700; display:block; margin-bottom:4px;">Ngày Hẹn Hoàn:</label>
                    <input type="text" value="${r.postponed_target_date || '—'}" class="form-control" readonly style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9;" />
                </div>
                <div>
                    <label style="font-weight:700; display:block; margin-bottom:4px;">Nhân Viên Đề Xuất:</label>
                    <input type="text" value="${_nxhvlEscapeHtml(r.staff_name) || ''}" class="form-control" readonly style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9;" />
                </div>
            </div>
            
            ${itemsHTML}
 
            <div>
                <label style="font-weight:700; display:block; margin-bottom:4px;">Ghi Chú Đề Xuất:</label>
                <textarea class="form-control" readonly style="width:100%; height:36px; font-size:12px; padding:6px 10px; background:#f1f5f9; resize:none;">${_nxhvlEscapeHtml(r.notes) || ''}</textarea>
            </div>
            ${confirmHTML}
        </div>
    `;
    
    var footerHTML = `<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>`;
    openModal('🔄 Chi Tiết Giao Dịch Hoàn Vật Liệu', bodyHTML, footerHTML);
}

// Step 1 Confirmation Modal
function _nxhvlOpenConfirm1Modal(id) {
    _nxhvl_postponeImageBlob = null;
    var bodyHTML = `
        <div style="font-size:12px; text-align:left; color:#1e293b;">
            <p style="margin-bottom:12px;">👉 <b>Xác nhận lần 1:</b> Bạn xác nhận đã bàn giao vật liệu hoàn trả cho nhà cung cấp mang đi.</p>
            <div style="margin-bottom:12px;">
                <label style="font-weight:700; display:block; margin-bottom:4px; color:#1e40af;">📸 Chụp ảnh bàn giao NCC (Ctrl+V) *:</label>
                <div id="confirm1PasteArea" style="border:2px dashed #3b82f6; border-radius:8px; padding:25px; text-align:center; color:#64748b; cursor:pointer; background:#f8fafc;" tabindex="0">
                    <div id="c1PastePlaceholder">
                        <span style="font-size:24px; display:block; margin-bottom:6px;">📋</span>
                        <span>Nhấp vào đây rồi nhấn Ctrl+V để dán ảnh bàn giao</span>
                    </div>
                    <div id="c1ImgPreviewWrap" style="display:none; position:relative; width:100%; justify-content:center; align-items:center;">
                        <img id="c1ImagePreview" style="max-height:160px; max-width:100%; border-radius:6px;" />
                    </div>
                </div>
            </div>
        </div>
    `;
    
    var footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-primary" id="btnConfirm1Submit" style="background:#1e40af; border:none;" onclick="_nxhvlSubmitConfirm1(${id})" disabled>✅ Xác Nhận Bàn Giao</button>
    `;
    
    openModal('⬜ Xác Nhận Lần 1: Bàn Giao Nhà Cung Cấp', bodyHTML, footerHTML);

    var pasteArea = document.getElementById('confirm1PasteArea');
    if (pasteArea) {
        pasteArea.addEventListener('paste', function(e) {
            var items = (e.clipboardData || e.originalEvent.clipboardData).items;
            for (var i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    var blob = items[i].getAsFile();
                    var reader = new FileReader();
                    reader.onload = function(event) {
                        var img = new Image();
                        img.onload = function() {
                            var canvas = document.createElement('canvas');
                            canvas.width = img.width > 800 ? 800 : img.width;
                            canvas.height = img.width > 800 ? Math.round(img.height * 800 / img.width) : img.height;
                            var ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                            canvas.toBlob(function(b) {
                                _nxhvl_postponeImageBlob = b;
                                document.getElementById('c1ImagePreview').src = URL.createObjectURL(b);
                                document.getElementById('c1PastePlaceholder').style.display = 'none';
                                document.getElementById('c1ImgPreviewWrap').style.display = 'flex';
                                document.getElementById('btnConfirm1Submit').disabled = false;
                            }, 'image/webp', 0.8);
                        };
                        img.src = event.target.result;
                    };
                    reader.readAsDataURL(blob);
                    break;
                }
            }
        });
    }
}

async function _nxhvlSubmitConfirm1(id) {
    if (!_nxhvl_postponeImageBlob) {
        showToast('Vui lòng chụp dán ảnh bàn giao', 'error');
        return;
    }
    var btn = document.getElementById('btnConfirm1Submit');
    if (btn) btn.disabled = true;

    try {
        var fd = new FormData();
        fd.append('file', _nxhvl_postponeImageBlob, 'confirm1.webp');
        var uploadRes = await fetch('/api/materialtx/upload/' + id, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
            body: fd
        });
        var upData = await uploadRes.json();
        if (!upData.success) {
            showToast('Lỗi upload ảnh', 'error');
            if (btn) btn.disabled = false;
            return;
        }

        var res = await apiCall('/api/materialtx/confirm1/' + id, 'POST', { image_data: upData.url });
        if (res.error) {
            showToast(res.error, 'error');
            if (btn) btn.disabled = false;
        } else {
            showToast('Xác nhận lần 1 thành công!', 'success');
            closeModal();
            _nxhvlLoadAll();
        }
    } catch(e) {
        showToast('Lỗi: ' + e.message, 'error');
        if (btn) btn.disabled = false;
    }
}

// Step 2 Confirmation Modal (Kế Toán Chốt)
function _nxhvlOpenConfirm2Modal(id) {
    var r = _nxhvl.records.find(item => item.id === id);
    if (!r) return;

    _nxhvl_postponeImageBlob = null;
    
    var items = [];
    if (r.material_items) {
        try { items = typeof r.material_items === 'string' ? JSON.parse(r.material_items) : r.material_items; } catch(e) {}
    }
    if (!Array.isArray(items)) items = [];
    
    _nxhvl_c2Items = items.map(function(it) {
        return {
            material_item_id: Number(it.material_item_id),
            import_record_id: Number(it.import_record_id),
            material_name: it.material_name,
            initial_quantity: Number(it.initial_quantity || it.quantity || 0),
            actual_quantity: Number(it.actual_quantity !== undefined && it.actual_quantity !== null ? it.actual_quantity : (it.quantity || 0)),
            price: Number(it.price || 0),
            unit: it.unit || '',
            original_import_code: it.original_import_code || ''
        };
    });

    var c2ListHTML = '';
    if (_nxhvl_c2Items.length > 0) {
        c2ListHTML = `
            <div style="border: 1px solid #cbd5e1; border-radius:8px; padding:10px; background:#f8fafc; margin-bottom:12px; max-height:220px; overflow-y:auto; display:flex; flex-direction:column; gap:8px;">
                ${_nxhvl_c2Items.map(function(it, idx) {
                    return `
                        <div class="c2-item-row" style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:8px; display:flex; flex-direction:column; gap:6px;">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                <div>
                                    <strong style="color:#0f766e; font-size:11.5px;">${_nxhvlEscapeHtml(it.material_name)}</strong>
                                    <div style="font-size:10px; color:#64748b; margin-top:2px;">Bill gốc: #${it.original_import_code}</div>
                                </div>
                                <span style="font-size:10px; background:#e0f2fe; color:#0369a1; padding:2px 6px; border-radius:4px; font-weight:700;">SL gốc: ${_nxhvlFN(it.initial_quantity)} ${it.unit}</span>
                            </div>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <label style="font-weight:700; font-size:11px; color:#b45309; white-space:nowrap; margin-bottom:0;">Số lượng thực tế:</label>
                                <input type="number" value="${it.actual_quantity}" class="form-control" style="font-weight:700; height:26px; font-size:12px; border-color:#d97706; padding:2px 8px; flex:1;" oninput="_nxhvlOnC2ItemQtyChanged(${idx}, this.value)" />
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } else {
        c2ListHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                <div>
                    <label style="font-weight:700; display:block; margin-bottom:4px;">Số lượng ban đầu:</label>
                    <input type="text" value="${_nxhvlFN(r.quantity)} ${r.unit || ''}" class="form-control" readonly style="background:#f1f5f9;" />
                </div>
                <div>
                    <label style="font-weight:700; display:block; margin-bottom:4px; color:#b45309;">Số lượng thực tế bàn giao *:</label>
                    <input type="number" id="c2_actual_quantity" value="${r.actual_quantity !== null && r.actual_quantity !== undefined ? r.actual_quantity : r.quantity}" class="form-control" style="font-weight:700; border-color:#d97706;" oninput="_nxhvlOnC2QtyInput(${r.quantity})" />
                </div>
            </div>
        `;
    }

    var bodyHTML = `
        <div style="font-size:12px; text-align:left; color:#1e293b;">
            <p>👉 <b>Xác nhận lần 2 (Kế toán chốt):</b> Nhập số lượng thực tế bàn giao hoàn trả để tính toán khấu trừ công nợ.</p>
            
            ${c2ListHTML}
 
            <!-- Discrepancy Alert & Upload Photo Zone -->
            <div id="c2_discrepancy_area" style="background:#fef3c7; border:1px solid #fcd34d; border-radius:8px; padding:10px; margin-bottom:12px; display:none;">
                <span id="c2_discrepancy_msg" style="color:#d97706; font-weight:700; display:block; margin-bottom:6px;"></span>
                <label style="font-weight:700; display:block; margin-bottom:4px;">📸 Bắt buộc ảnh chứng minh sai lệch (Ctrl+V) *:</label>
                <div id="confirm2PasteArea" style="border:2px dashed #d97706; border-radius:8px; padding:20px; text-align:center; color:#b45309; cursor:pointer; background:#fff;" tabindex="0">
                    <div id="c2PastePlaceholder">
                        <span>Nhấp vào đây rồi nhấn Ctrl+V để dán ảnh chênh lệch</span>
                    </div>
                    <div id="c2ImgPreviewWrap" style="display:none; position:relative; width:100%; justify-content:center; align-items:center;">
                        <img id="c2ImagePreview" style="max-height:130px; max-width:100%; border-radius:6px;" />
                    </div>
                </div>
            </div>
 
            <div style="margin-bottom:10px;">
                <label style="font-weight:700; display:block; margin-bottom:4px;">Ghi chú đối chiếu thực tế:</label>
                <textarea id="c2_notes" class="form-control" placeholder="Ghi chú thêm về tình trạng hao hụt..." style="width:100%; height:45px; resize:none;">${_nxhvlEscapeHtml(r.actual_quantity_notes) || ''}</textarea>
            </div>
        </div>
    `;
 
    var footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-primary" id="btnConfirm2Submit" style="background:#d97706; border:none; color:#fff;" onclick="_nxhvlSubmitConfirm2(${id})">✅ Xác Nhận Lần 2</button>
    `;
 
    openModal('🟨 Xác Nhận Lần 2: Kế Toán Chốt Số Lượng', bodyHTML, footerHTML);
 
    // Initial check for discrepancy if there's loaded state
    if (_nxhvl_c2Items.length > 0) {
        _nxhvlOnC2ItemQtyChanged(0, _nxhvl_c2Items[0].actual_quantity);
    } else {
        _nxhvlOnC2QtyInput(r.quantity);
    }
 
    var pasteArea = document.getElementById('confirm2PasteArea');
    if (pasteArea) {
        pasteArea.addEventListener('paste', function(e) {
            var items = (e.clipboardData || e.originalEvent.clipboardData).items;
            for (var i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    var blob = items[i].getAsFile();
                    var reader = new FileReader();
                    reader.onload = function(event) {
                        var img = new Image();
                        img.onload = function() {
                            var canvas = document.createElement('canvas');
                            canvas.width = img.width > 800 ? 800 : img.width;
                            canvas.height = img.width > 800 ? Math.round(img.height * 800 / img.width) : img.height;
                            var ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                            canvas.toBlob(function(b) {
                                _nxhvl_postponeImageBlob = b;
                                document.getElementById('c2ImagePreview').src = URL.createObjectURL(b);
                                document.getElementById('c2PastePlaceholder').style.display = 'none';
                                document.getElementById('c2ImgPreviewWrap').style.display = 'flex';
                            }, 'image/webp', 0.8);
                        };
                        img.src = event.target.result;
                    };
                    reader.readAsDataURL(blob);
                    break;
                }
            }
        });
    }
}
 
function _nxhvlOnC2ItemQtyChanged(idx, val) {
    if (idx !== undefined && val !== undefined) {
        _nxhvl_c2Items[idx].actual_quantity = Number(val) || 0;
    }
    
    var totalInitial = _nxhvl_c2Items.reduce((sum, it) => sum + it.initial_quantity, 0);
    var totalActual = _nxhvl_c2Items.reduce((sum, it) => sum + it.actual_quantity, 0);
    var diff = totalActual - totalInitial;
    
    var area = document.getElementById('c2_discrepancy_area');
    var msg = document.getElementById('c2_discrepancy_msg');
    if (!area || !msg) return;
 
    if (Math.abs(diff) > 0.001) {
        area.style.display = 'block';
        if (diff < 0) {
            msg.textContent = `⚠️ Tổng thực tế ít hơn ban đầu: ${totalActual.toFixed(2)} < ${totalInitial.toFixed(2)} (Lệch: ${diff.toFixed(2)}). Giao dịch sẽ chuyển sang chờ Quản lý duyệt sai lệch!`;
        } else {
            msg.textContent = `⚠️ Tổng thực tế nhiều hơn ban đầu: ${totalActual.toFixed(2)} > ${totalInitial.toFixed(2)} (Lệch: +${diff.toFixed(2)}).`;
        }
    } else {
        area.style.display = 'none';
    }
}
 
function _nxhvlOnC2QtyInput(origQty) {
    var actQty = Number(document.getElementById('c2_actual_quantity').value) || 0;
    var diff = actQty - origQty;
    var area = document.getElementById('c2_discrepancy_area');
    var msg = document.getElementById('c2_discrepancy_msg');
    if (!area || !msg) return;
    
    if (Math.abs(diff) > 0.001) {
        area.style.display = 'block';
        if (diff < 0) {
            msg.textContent = `⚠️ Số lượng thực tế ít hơn ban đầu: ${actQty} < ${origQty} (Lệch: ${diff.toFixed(2)}). Giao dịch sẽ chuyển sang chờ Quản lý duyệt sai lệch!`;
        } else {
            msg.textContent = `⚠️ Số lượng thực tế nhiều hơn ban đầu: ${actQty} > ${origQty} (Lệch: +${diff.toFixed(2)}).`;
        }
    } else {
        area.style.display = 'none';
    }
}
 
async function _nxhvlSubmitConfirm2(id) {
    var actQty = 0;
    var notes = document.getElementById('c2_notes').value || '';
    var postData = {};
    var isDiscrepancy = false;
 
    if (_nxhvl_c2Items.length > 0) {
        var totalInitial = _nxhvl_c2Items.reduce((sum, it) => sum + it.initial_quantity, 0);
        var totalActual = _nxhvl_c2Items.reduce((sum, it) => sum + it.actual_quantity, 0);
 
        for (var i = 0; i < _nxhvl_c2Items.length; i++) {
            if (_nxhvl_c2Items[i].actual_quantity <= 0) {
                showToast('Số lượng thực tế của ' + _nxhvl_c2Items[i].material_name + ' phải lớn hơn 0', 'error');
                return;
            }
        }
 
        var diff = totalActual - totalInitial;
        if (Math.abs(diff) > 0.001) {
            isDiscrepancy = true;
        }
 
        if (isDiscrepancy && !_nxhvl_postponeImageBlob) {
            showToast('Sai lệch số lượng thực tế so với ban đầu. Bắt buộc phải có hình ảnh chụp thực tế để chứng minh!', 'error');
            return;
        }
 
        actQty = totalActual;
        postData = {
            actual_quantity: totalActual,
            actual_items: _nxhvl_c2Items.map(it => ({
                material_item_id: it.material_item_id,
                import_record_id: it.import_record_id,
                actual_quantity: it.actual_quantity
            })),
            notes: notes
        };
    } else {
        actQty = Number(document.getElementById('c2_actual_quantity').value) || 0;
        if (actQty <= 0) {
            showToast('Số lượng thực tế chốt phải lớn hơn 0', 'error');
            return;
        }
 
        var r = _nxhvl.records.find(item => item.id === id);
        var origQty = r ? Number(r.quantity) : 0;
        var diff = actQty - origQty;
        if (Math.abs(diff) > 0.001) {
            isDiscrepancy = true;
        }
 
        if (isDiscrepancy && !_nxhvl_postponeImageBlob) {
            showToast('Sai lệch số lượng thực tế so với ban đầu. Bắt buộc phải có hình ảnh chụp thực tế để chứng minh!', 'error');
            return;
        }

        postData = {
            actual_quantity: actQty,
            notes: notes
        };
    }

    var btn = document.getElementById('btnConfirm2Submit');
    if (btn) btn.disabled = true;

    try {
        var actImgUrl = '';
        if (_nxhvl_postponeImageBlob) {
            var fd = new FormData();
            fd.append('file', _nxhvl_postponeImageBlob, 'confirm2.webp');
            var uploadRes = await fetch('/api/materialtx/upload/' + id, {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
                body: fd
            });
            var upData = await uploadRes.json();
            if (upData.success) {
                actImgUrl = upData.url;
            }
        }

        postData.image_data = actImgUrl;

        var res = await apiCall('/api/materialtx/confirm2/' + id, 'POST', postData);
        if (res.error) {
            showToast(res.error, 'error');
            if (btn) btn.disabled = false;
        } else {
            if (res.needs_discrepancy_approval) {
                showToast('Đã ghi nhận số lượng chênh lệch hao hụt. Chờ Quản lý Trinh duyệt!', 'warning');
            } else {
                showToast('Xác nhận lần 2 và khấu trừ công nợ thành công!', 'success');
            }
            closeModal();
            _nxhvlLoadAll();
        }
    } catch(e) {
        showToast('Lỗi: ' + e.message, 'error');
        if (btn) btn.disabled = false;
    }
}
async function _nxhvlApproveDiscrepancy(id) {
    if (!confirm('Bạn có chắc chắn muốn duyệt chênh lệch sai số hao hụt cho giao dịch này không?')) return;
    try {
        var res = await apiCall('/api/materialtx/approve-discrepancy/' + id, 'POST');
        if (res.error) {
            showToast(res.error, 'error');
        } else {
            showToast('Duyệt sai lệch chênh lệch thành công!', 'success');
            _nxhvlLoadAll();
        }
    } catch(e) {
        showToast('Lỗi: ' + e.message, 'error');
    }
}

// ========== POSTPONE RETURN (LÙI LỊCH HOÀN TRẢ) ==========
function _nxhvlOpenPostponeModal(id) {
    var r = _nxhvl.records.find(item => item.id === id);
    if (!r) return;

    _nxhvl_postponeImageBlob = null;
    var postponeHistHtml = '';
    if (r.is_postponed) {
        var postAt = r.postponed_at ? formatDateTimeHM(r.postponed_at) : '—';
        var postBy = r.postponed_by_name || 'Hệ thống';
        var targetDate = r.postponed_target_date || '—';
        var postNotes = r.postponed_notes || '—';
        var postImgs = [];
        try { postImgs = typeof r.postponed_images === 'string' ? JSON.parse(r.postponed_images) : (r.postponed_images || []); } catch(e) {}
        
        postponeHistHtml = `
            <div style="background:#fee2e2; border:1px solid #fecaca; padding:10px; border-radius:8px; margin-bottom:12px; color:#991b1b;">
                <strong>⚠️ Thông tin lùi lịch hiện tại:</strong>
                <span style="display:block; margin-top:4px;">• Người lùi lịch: <b>${postBy}</b> (${postAt})</span>
                <span style="display:block;">• Hẹn ngày hoàn trả mới: <b>${targetDate}</b></span>
                <span style="display:block;">• Lý do: <i>${postNotes}</i></span>
                ${postImgs.length ? `
                    <div style="margin-top:6px; display:flex; gap:6px;">
                        ${postImgs.map(url => `<a href="${url}" target="_blank"><img src="${url}" style="width:60px; height:60px; object-fit:cover; border-radius:4px;" /></a>`).join('')}
                    </div>
                ` : ''}
                <button class="btn" style="margin-top:8px; background:#ef4444; color:#fff; border:none; padding:4px 10px; font-size:10px; border-radius:4px; font-weight:700;" onclick="_nxhvlCancelPostpone(${id})">❌ HỦY LÙI LỊCH (Trở lại lịch hẹn gốc)</button>
            </div>
        `;
    }

    var bodyHTML = `
        <div style="font-size:12px; text-align:left; color:#1e293b;">
            ${postponeHistHtml}
            <p>👉 <b>Hẹn lùi lịch hoàn trả vật liệu:</b> Lựa chọn ngày hẹn mới.</p>
            
            <div id="postponePasteArea" style="border: 2px dashed #cbd5e1; border-radius:8px; padding:20px; text-align:center; color:#64748b; cursor:pointer; background:#fff; font-size:11px; margin-bottom:12px;" tabindex="0">
                <div id="postponePastePlaceholder">
                    <span style="font-size:20px; display:block; margin-bottom:4px;">📋</span>
                    <span>Click vào đây rồi Ctrl+V để dán ảnh chứng minh</span>
                </div>
                <div id="postponeImgPreviewWrap" style="display:none; position:relative; width:100%; justify-content:center; align-items:center;">
                    <img id="postponeImagePreview" style="max-height:120px; max-width:100%; border-radius:6px; border:1px solid #cbd5e1;" />
                    <button id="btnPostponeClearImg" type="button" class="btn" style="position:absolute; top:2px; right:2px; padding:2px 8px; font-size:10px; background:#ef4444; border:none; color:#fff; border-radius:4px;" onclick="event.stopPropagation(); _nxhvlClearPostponeImage()">❌ Xóa</button>
                </div>
            </div>
            
            <div style="margin-bottom:12px;">
                <label style="font-weight:700; display:block; margin-bottom:4px;">📅 Chọn ngày hẹn mới:</label>
                <div id="postponeCustomCalendar" style="border: 1px solid #cbd5e1; border-radius:10px; padding:10px; background:#fff;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <button type="button" id="calPrevMonth" style="background:none; border:none; cursor:pointer; font-size:14px; font-weight:700; color:#475569; padding: 2px 6px;">&lt;</button>
                        <span id="calMonthYear" style="font-weight:800; font-size:12px; color:#1e293b;"></span>
                        <button type="button" id="calNextMonth" style="background:none; border:none; cursor:pointer; font-size:14px; font-weight:700; color:#475569; padding: 2px 6px;">&gt;</button>
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(7, 1fr); text-align:center; font-weight:700; font-size:10px; color:#64748b; margin-bottom:6px; border-bottom:1px solid #f1f5f9; padding-bottom:4px;">
                        <div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div><div style="color:#ef4444;">CN</div>
                    </div>
                    <div id="calDaysGrid" style="display:grid; grid-template-columns: repeat(7, 1fr); gap:4px; text-align:center; font-size:10px;"></div>
                </div>
                <input type="hidden" id="postponeDate" value="" />
            </div>

            <div>
                <label style="font-weight:700; display:block; margin-bottom:4px;">Lý do lùi lịch (Bắt buộc):</label>
                <textarea id="postponeNotes" class="form-control" placeholder="Nhập lý do lùi lịch cụ thể..." style="width:100%; height:45px; resize:none;"></textarea>
            </div>
        </div>
    `;

    var footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-primary" id="btnConfirmPostpone" style="background:#b45309; border:none; color:#fff;" onclick="_nxhvlSubmitPostpone(${id})">📅 Lưu Lùi Lịch</button>
    `;

    openModal('📅 Hẹn Lùi Lịch Hoàn Vật Liệu', bodyHTML, footerHTML);

    _nxhvl_postponePasteHandler = function (e) {
        var items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (var i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                var blob = items[i].getAsFile();
                _nxhvlProcessAndPreviewPostponeImage(blob);
                break;
            }
        }
    };
    var pasteArea = document.getElementById('postponePasteArea');
    if (pasteArea) pasteArea.addEventListener('paste', _nxhvl_postponePasteHandler);

    _nxhvlInitCustomCalendar(14, _nxhvl_postponeHolidays);
}

async function _nxhvlSubmitPostpone(id) {
    var date = document.getElementById('postponeDate').value;
    var notes = document.getElementById('postponeNotes').value || '';

    if (!date) {
        showToast('Vui lòng chọn ngày hẹn hoàn trả mới.', 'error');
        return;
    }
    if (!notes.trim()) {
        showToast('Vui lòng nhập lý do lùi lịch.', 'error');
        return;
    }

    var btn = document.getElementById('btnConfirmPostpone');
    if (btn) btn.disabled = true;

    try {
        var postponeImgUrl = '';
        if (_nxhvl_postponeImageBlob) {
            var fd = new FormData();
            fd.append('file', _nxhvl_postponeImageBlob, 'proof.webp');
            var uploadRes = await fetch('/api/materialtx/upload-postpone/' + id, {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
                body: fd
            });
            var upData = await uploadRes.json();
            if (upData.success) {
                postponeImgUrl = upData.url;
            }
        }

        var postData = {
            target_date: date,
            notes: notes,
            images: postponeImgUrl ? [postponeImgUrl] : []
        };

        var res = await apiCall('/api/materialtx/postpone/' + id, 'POST', postData);
        if (res.error) {
            showToast(res.error, 'error');
            if (btn) btn.disabled = false;
        } else {
            showToast('Lùi lịch hẹn hoàn trả thành công!', 'success');
            closeModal();
            _nxhvlLoadAll();
        }
    } catch(e) {
        showToast('Lỗi: ' + e.message, 'error');
        if (btn) btn.disabled = false;
    }
}

async function _nxhvlCancelPostpone(id) {
    if (!confirm('Bạn có chắc chắn muốn hủy trạng thái lùi lịch cho giao dịch này không?')) return;
    try {
        var res = await apiCall('/api/materialtx/unpostpone/' + id, 'POST');
        if (res.error) {
            showToast(res.error, 'error');
        } else {
            showToast('Đã hủy trạng thái lùi lịch thành công!', 'success');
            closeModal();
            _nxhvlLoadAll();
        }
    } catch(e) {
        showToast('Lỗi: ' + e.message, 'error');
    }
}

function _nxhvlOpenImportBill(importId) {
    if (!importId) {
        showToast('Vật liệu này không có hóa đơn nhập gốc.', 'info');
        return;
    }
    if (typeof _bvlOpenMatEdit === 'function') {
        _bvlOpenMatEdit(importId);
    } else {
        var s = document.createElement('script');
        s.src = '/js/pages/billvatlieu.js?v=' + Date.now();
        s.onload = function() {
            _bvlOpenMatEdit(importId);
        };
        document.head.appendChild(s);
    }
}

// Export functions to global scope
window.renderNhapxuathoanvatlieuPage = renderNhapxuathoanvatlieuPage;
window._nxhvlFilter = _nxhvlFilter;
window._nxhvlTog = _nxhvlTog;
window._nxhvlOpenCreateReturnModal = _nxhvlOpenCreateReturnModal;
window._nxhvlOnSourceChanged = _nxhvlOnSourceChanged;
window._nxhvlOnSearchImportItems = _nxhvlOnSearchImportItems;
window._nxhvlSelectImportItem = _nxhvlSelectImportItem;
window._nxhvlUpdateFinValues = _nxhvlUpdateFinValues;
window._nxhvlClearPostponeImage = _nxhvlClearPostponeImage;
window._nxhvlSubmitCreateReturn = _nxhvlSubmitCreateReturn;
window._nxhvlOpenViewReturnModal = _nxhvlOpenViewReturnModal;
window._nxhvlOpenConfirm1Modal = _nxhvlOpenConfirm1Modal;
window._nxhvlSubmitConfirm1 = _nxhvlSubmitConfirm1;
window._nxhvlOpenConfirm2Modal = _nxhvlOpenConfirm2Modal;
window._nxhvlSubmitConfirm2 = _nxhvlSubmitConfirm2;
window._nxhvlOnC2QtyInput = _nxhvlOnC2QtyInput;
window._nxhvlOnC2ItemQtyChanged = _nxhvlOnC2ItemQtyChanged;
window._nxhvlApproveDiscrepancy = _nxhvlApproveDiscrepancy;
window._nxhvlOpenPostponeModal = _nxhvlOpenPostponeModal;
window._nxhvlSubmitPostpone = _nxhvlSubmitPostpone;
window._nxhvlCancelPostpone = _nxhvlCancelPostpone;
window._nxhvlOpenImportBill = _nxhvlOpenImportBill;
