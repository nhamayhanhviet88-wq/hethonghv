// ========== BỘ PHẬN ÉP — Desktop SPA ==========
var _bpe = { records: [], tree: null, filter: { year: null, month: null, presser_id: null, status: null, view: 'records' }, search: '', page: 1, pageSize: 200, subFilter: 'all', fullRecords: [] };
var _bpeOpen = {};

function _bpeFD(d) { if (!d) return '—'; try { var p = d.split('T')[0].split('-'); return p[2] + '/' + p[1] + '/' + p[0]; } catch (e) { return d; } }
function _bpeFN(n) { if (!n && n !== 0) return '—'; return Number(n).toLocaleString('vi-VN'); }

function _bpeFmtTimeDateNoYear(d) {
    if (!d) return '—';
    try {
        var str = '';
        if (typeof vnFormat === 'function') {
            str = vnFormat(d);
        } else {
            var dateObj = new Date(d);
            if (isNaN(dateObj.getTime())) return d;
            var hh = String(dateObj.getHours()).padStart(2, '0');
            var mm = String(dateObj.getMinutes()).padStart(2, '0');
            var dd = String(dateObj.getDate()).padStart(2, '0');
            var mo = String(dateObj.getMonth() + 1).padStart(2, '0');
            var yy = dateObj.getFullYear();
            str = hh + ':' + mm + ' ' + dd + '/' + mo + '/' + yy;
        }
        return str.replace(/\/\d{4}$/, '');
    } catch(e) {
        return d;
    }
}

function renderBophanepPage(content) {
    if (!document.getElementById('_bpcFontLink')) {
        var fl = document.createElement('link'); fl.id = '_bpcFontLink'; fl.rel = 'stylesheet';
        fl.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800;900&display=swap';
        document.head.appendChild(fl);
    }
    if (!document.getElementById('_bpeStyles')) {
        var st = document.createElement('style'); st.id = '_bpeStyles';
        st.textContent = '.bpe-wrap{display:flex;min-height:calc(100vh - 110px);overflow:visible;align-items:flex-start}'
+ '.bpe-sb{width:270px;min-width:270px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto;position:sticky;top:80px;height:calc(100vh - 110px)}'
+ '.bpe-main{flex:1;min-width:0;display:flex;flex-direction:column;padding:16px}.bpe-main>*{flex-shrink:0}'
+ '.bpe-sb-title{font-size:13px;font-weight:800;padding:16px;border-bottom:1px solid var(--gray-200);text-align:center;position:relative;overflow:hidden;background:#f8fafc}'
+ '.bpe-sb-title::before{content:"";position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:linear-gradient(45deg,transparent 30%,rgba(124,58,237,0.08) 50%,transparent 70%);animation:bpeShimmer 3s infinite}'
+ '@keyframes bpeShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}'
+ '.bpe-sb-total{background:#5b21b6;color:#fff;border-left:5px solid #4c1d95;padding:12px 16px 12px 11px;font-size:13px;font-weight:800;display:flex;justify-content:space-between;align-items:center;cursor:pointer;position:relative;overflow:hidden;border-bottom:1px solid #5b21b6;transition:all 0.2s}'
+ '.bpe-sb-total:hover{background:#4c1d95}'
+ '.bpe-sb-total.active{background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border-left-color:#fbbf24;box-shadow:0 2px 8px rgba(124,58,237,0.4);font-weight:900}'
+ '.bpe-sb-total::after{content:"";position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent);animation:bpeGlow 2.5s infinite}'
+ '@keyframes bpeGlow{0%{left:-100%}100%{left:150%}}'
+ '.bpe-sb-uncut{background:#ea580c;color:#fff;border-left:5px solid #c2410c;padding:11px 16px 11px 11px;font-size:12px;font-weight:800;display:flex;justify-content:space-between;align-items:center;cursor:pointer;border-bottom:1px solid #ea580c;transition:all 0.2s}'
+ '.bpe-sb-uncut:hover{background:#c2410c}'
+ '.bpe-sb-uncut.active{background:linear-gradient(135deg,#c2410c,#f97316);color:#fff;border-left-color:#fbbf24;box-shadow:0 2px 8px rgba(234, 88, 12, 0.4);font-weight:900}'
+ '.bpe-sb-year{padding:9px 16px 9px 11px;font-weight:800;font-size:12px;color:#002277;cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:#cce0ff;border-bottom:1px solid #cce0ff;transition:all 0.15s;border-left:5px solid #60a5fa}'
+ '.bpe-sb-year:hover{background:#93c5fd}'
+ '.bpe-sb-year.active{background:linear-gradient(135deg,#1e3a8a,#3b82f6);color:#fff;border-left-color:#172554;box-shadow:0 2px 5px rgba(30,58,138,0.25)}'
+ '.bpe-sb-year.active span:last-child{background:rgba(255,255,255,0.2) !important;color:#fff !important}'
+ '.bpe-sb-toggle-btn{padding:4px 6px;margin-right:2px;cursor:pointer;display:inline-block;transition:all 0.15s;border-radius:4px;user-select:none}'
+ '.bpe-sb-toggle-btn:hover{background:rgba(255,255,255,0.35);transform:scale(1.2)}'
+ '.bpe-sb-presser{padding:7px 16px 7px 23px;font-size:11px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;color:#334155;border-left:5px solid #cbd5e1;background:#f1f5f9;transition:all 0.15s}'
+ '.bpe-sb-presser:hover{background:#e2e8f0}'
+ '.bpe-sb-presser.active{background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;font-weight:800;border-left-color:#4c1d95;box-shadow:0 2px 5px rgba(124, 58, 237, 0.25)}'
+ '.bpe-sb-presser.active span:last-child{background:rgba(255,255,255,0.2) !important;color:#fff !important;padding:2px 8px;border-radius:10px;font-size:10px}'
+ '.bpe-sb-sub{padding:6px 16px 6px 37px;font-size:10px;font-weight:600;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f1f5f9;color:#475569;border-left:5px solid transparent;background:#f8fafc;transition:all 0.15s}'
+ '.bpe-sb-sub:hover{background:#f1f5f9}'
+ '.bpe-sb-sub.active{background:linear-gradient(135deg,#2563eb,#60a5fa);color:#fff;font-weight:800;border-left-color:#1e3a8a;box-shadow:0 2px 5px rgba(37,99,235,0.25)}'
+ '.bpe-sb-sub.active span:last-child{background:rgba(255,255,255,0.2) !important;color:#fff !important;padding:2px 6px;border-radius:8px;font-size:9px}'
+ '.bpe-sb-sub.incomplete{background:#fef3c7;color:#92400e;border-left-color:#fde68a}'
+ '.bpe-sb-sub.incomplete.active{background:linear-gradient(135deg,#d97706,#fbbf24);color:#fff;border-left-color:#78350f;box-shadow:0 2px 5px rgba(217,119,6,0.25)}'
+ '.bpe-sb-sub.incomplete.active span:last-child{background:rgba(255,255,255,0.2) !important;color:#fff !important;padding:2px 6px;border-radius:8px;font-size:9px}'
+ '.bpe-ib{width:26px;height:26px;border-radius:6px;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:12px;transition:all .15s;margin:0 1px}'
+ '.bpe-ib:hover{transform:scale(1.15);box-shadow:0 2px 8px rgba(0,0,0,0.12)}'
+ '.bpe-ib.on-rpt{background:#ffedd5;border-color:#f97316}'
+ '.bpe-ib.on-sal{background:#fef3c7;border-color:#f59e0b}'
+ '.bpe-ib.on-err{background:#fee2e2;border-color:#ef4444}'
+ '.bpe-pos{font-size:9px;text-align:center;font-weight:700;color:#7c3aed}'
+ '.bpe-claim-btn{padding:7px 16px;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;white-space:nowrap;font-family:"Inter",system-ui,sans-serif;letter-spacing:0.3px}'
+ '.bpe-claim-btn.ready{background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff !important;box-shadow:0 3px 10px rgba(124,58,237,0.3)}'
+ '.bpe-claim-btn.ready:hover{transform:translateY(-1px);box-shadow:0 5px 15px rgba(124,58,237,0.4)}'
+ '.bpe-claim-btn.disabled{background:#f8fafc;color:#64748b;cursor:not-allowed;border:1px solid #e2e8f0;font-weight:600}'
+ '@media(min-width:769px){.bpe-hide-desktop{display:none !important}}'
+ '.bpe-col-act{width:40px !important;min-width:40px !important;max-width:40px !important;text-align:center !important;padding:4px 2px !important}'
+ '.bpe-col-stt{width:40px !important;min-width:40px !important;max-width:40px !important;text-align:center !important}'
+ '.bpc-modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(6px);z-index:999999 !important;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .25s ease;pointer-events:none}'
+ '.bpc-modal-overlay.show{opacity:1;pointer-events:auto}'
+ '.bpc-modal{background:#fff;border-radius:16px;width:460px;max-width:92vw;box-shadow:0 25px 60px rgba(0,0,0,0.25);transform:scale(0.85);transition:transform .3s cubic-bezier(0.34,1.56,0.64,1);overflow:hidden}'
+ '.bpc-modal-overlay.show .bpc-modal{transform:scale(1)}'
+ '.bpc-modal-header{background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:18px 24px;display:flex;align-items:center;gap:12px}'
+ '.bpc-modal-header .m-icon{font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.2))}'
+ '.bpc-modal-header .m-title{font-size:16px;font-weight:800;letter-spacing:0.3px;font-family:Inter,system-ui,sans-serif}'
+ '.bpc-modal-header .m-sub{font-size:11px;opacity:0.85;margin-top:2px}'
+ '.bpc-modal-body{padding:20px 24px}'
+ '.bpc-modal-actions{display:flex;gap:10px;padding:16px 24px;border-top:1px solid #f1f5f9}'
+ '.bpc-modal-btn{flex:1;padding:12px;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:Inter,system-ui,sans-serif;transition:all .15s}'
+ '.bpc-modal-btn.confirm{background:linear-gradient(135deg,#059669,#10b981);color:#fff;box-shadow:0 4px 15px rgba(16,185,129,0.3)}'
+ '.bpc-modal-btn.confirm:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(16,185,129,0.4)}'
+ '.bpc-modal-btn.cancel{background:#f1f5f9;color:#475569}'
+ '.bpc-modal-btn.cancel:hover{background:#e2e8f0}'
+ '.bpc-modal-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9;font-family:Inter,system-ui,sans-serif}'
+ '.bpc-modal-row:last-child{border-bottom:none}'
+ '.bpc-modal-lbl{font-size:12px;color:#64748b;font-weight:600;display:flex;align-items:center;gap:6px}'
+ '.bpc-modal-val{font-size:13px;color:#1e293b;font-weight:700;text-align:right;max-width:65%}'
+ '.bpc-detail-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:16px}'
+ '.bpc-detail-section-title{font-size:11px;font-weight:800;color:#6366f1;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;display:flex;align-items:center;gap:6px}'
+ '.bpe-detail-thumb{width:80px;height:80px;object-fit:cover;border-radius:8px;border:2px solid #e2e8f0;cursor:pointer;transition:transform .2s,border-color .2s}'
+ '.bpe-detail-thumb:hover{transform:scale(1.05);border-color:#6366f1}';
        document.head.appendChild(st);
    }

    content.innerHTML = '<div class="bpe-wrap"><div class="bpe-sb" id="bpeSb"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="bpe-main">'
        + '<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center">'
        + '<div style="display:flex;flex-direction:column;gap:8px;align-items:flex-start">'
        + '<div id="bpeInfo" style="font-size:12px"></div>'
        + '<input id="bpeSearch" autocomplete="off" placeholder="🔍 Tìm SP, mã đơn, nhân viên..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:240px;outline:none">'
        + '</div>'
        + '<div id="bpeStats" style="display:flex;gap:6px;flex:1;justify-content:center;align-items:center"></div>'
        + '</div>'
        + '<div id="bpePaginationTop" style="margin:8px 0"></div>'
        + '<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px">'
        + '<table class="table" style="font-size:11px;white-space:nowrap;width:100%" id="bpeTable"><thead><tr style="background:var(--gray-800)">'
        + '<th class="bpe-col-stt">STT</th><th class="bpe-col-act">🔥</th><th class="bpe-col-act">⚠️</th><th>Ngày Ép</th><th>NV Ép</th><th>Tên SP</th><th class="bpe-hide-desktop">Chất Liệu</th><th class="bpe-hide-desktop">Màu Vải</th><th>CSKH</th><th>SL Đơn</th><th>SL Ép</th>'
        + '<th title="Ngực/Tay/Tạp Dề/Vải Mũ">Ngực/Tay</th><th title="Lưng/Bụng/Sườn/Áo Sẵn/Mũ Sẵn">Lưng/Bụng</th><th title="Bảo Hộ/Bếp/Sơ Mi">BH/Bếp</th><th title="Đóng Gói/Cổ Bẻ Vải">ĐG/Cổ Bẻ</th><th>VT Khác</th>'
        + '<th>Ảnh</th><th>Ghi Chú</th><th>Cập Nhật</th>'
        + '</tr></thead><tbody id="bpeTb"><tr><td colspan="18" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div>'
        + '<div id="bpePaginationBottom" style="margin:8px 0"></div>'
        + '</div></div>';

    _bpe.search = '';
    var searchEl = document.getElementById('bpeSearch');
    if (searchEl) searchEl.value = '';

    var _t; document.getElementById('bpeSearch').addEventListener('input', function () {
        clearTimeout(_t); _t = setTimeout(function () {
            _bpe.search = document.getElementById('bpeSearch').value || '';
            _bpe.page = 1;
            _bpeRender();
        }, 300);
    });
    _bpeLoadAll();
}

async function _bpeLoadAll() {
    try {
        var tR = await apiCall('/api/pressing/tree');
        _bpe.tree = tR;
        if (tR && tR.yearTree) {
            tR.yearTree.forEach(function (yr) {
                var yKey = 'y' + yr.year;
                if (_bpeOpen[yKey] === undefined) {
                    _bpeOpen[yKey] = true;
                }
            });
        }
        _bpeRenderSb();
        if (_bpe.filter.view === 'unassigned') {
            await _bpeLoadUnassigned();
        } else {
            await _bpeLoadRecs();
        }
    } catch (e) { console.error('[BPE]', e); }
}

function _bpeRenderSb() {
    var sb = document.getElementById('bpeSb'); if (!sb || !_bpe.tree) return;
    var t = _bpe.tree, f = _bpe.filter;
    var un = t.unassigned || { total: 0, ready: 0, pending: 0 };

    var h = '<div class="bpe-sb-title"><span style="color:#7c3aed">───</span> <span style="color:#6d28d9;font-weight:900">🔥 Bộ Phận Ép</span> <span style="color:#7c3aed">───</span></div>';
    
    var totActive = f.view === 'records' && !f.year && !f.month && !f.presser_id && !f.status;
    var totalAll = (t.total || 0) + (un.total || 0);
    h += '<div class="bpe-sb-total' + (totActive ? ' active' : '') + '" onclick="_bpeFilter()"><span>📦 Tổng đơn ép</span><span style="font-size:16px">' + totalAll + '</span></div>';

    // Đơn Chưa Nhận Ép
    var unActive = f.view === 'unassigned';
    h += '<div class="bpe-sb-uncut' + (unActive ? ' active' : '') + '" onclick="_bpeShowUnassigned()">';
    h += '<span>🔴 ĐƠN CHƯA NHẬN ÉP</span>';
    h += '<span style="background:rgba(255,255,255,0.3);padding:2px 10px;border-radius:10px;font-size:12px;font-weight:900">' + un.total + '</span>';
    h += '</div>';

    // Năm -> Thợ -> {Chưa HT, Tháng}
    if (t.yearTree) {
        t.yearTree.forEach(function(yr) {
            var yOpen = !!_bpeOpen['y' + yr.year];
            var yAct = f.view === 'records' && f.year == yr.year && !f.presser_id && !f.month && !f.status;
            h += '<div class="bpe-sb-year' + (yAct ? ' active' : '') + '" onclick="event.stopPropagation(); _bpeFilter(' + yr.year + ')"><span><span class="bpe-sb-toggle-btn" onclick="event.stopPropagation(); _bpeToggleYear(' + yr.year + ')">' + (yOpen ? '▼' : '▶') + '</span> 📅 Năm ' + yr.year + '</span><span style="background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;padding:2px 10px;border-radius:10px;font-size:10px">' + yr.count + '</span></div>';
            
            if (yOpen && yr.pressers) {
                // Calculate total incomplete count for all pressers in this year
                var totalIncomplete = 0;
                yr.pressers.forEach(function(p) {
                    totalIncomplete += (p.incomplete_count || 0);
                });
                
                var incYearAct = f.view === 'records' && f.year == yr.year && !f.presser_id && f.status === 'incomplete';
                h += '<div class="bpe-sb-sub incomplete' + (incYearAct ? ' active' : '') + '" style="padding-left:23px" onclick="event.stopPropagation(); _bpeFilterPresserStatus(' + yr.year + ', null, \'incomplete\')">';
                h += '  <span>⏳ Chưa Ép Xong</span>';
                h += '  <span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:8px;font-size:9px;font-weight:800">' + totalIncomplete + '</span>';
                h += '</div>';

                yr.pressers.forEach(function(p) {
                    var pk = 'p' + yr.year + '_' + (p.id || 0);
                    var pOpen = !!_bpeOpen[pk];
                    var pAct = f.view === 'records' && f.year == yr.year && f.presser_id == p.id && !f.status;
                    h += '<div class="bpe-sb-presser' + (pAct ? ' active' : '') + '" onclick="event.stopPropagation(); _bpeFilter(' + yr.year + ', null, ' + p.id + ')"><span><span class="bpe-sb-toggle-btn" onclick="event.stopPropagation(); _bpeTgl(\'' + pk + '\')">' + (pOpen ? '▼' : '▶') + '</span> 👤 ' + (p.name || 'Chưa PC') + '</span><span style="font-weight:800">' + p.total + '</span></div>';
                    
                    if (pOpen) {
                        // Chưa Ép Xong (Incomplete)
                        if (p.incomplete_count > 0) {
                            var incAct = f.view === 'records' && f.year == yr.year && f.presser_id == p.id && f.status === 'incomplete';
                            h += '<div class="bpe-sb-sub incomplete' + (incAct ? ' active' : '') + '" onclick="event.stopPropagation(); _bpeFilterPresserStatus(' + yr.year + ',' + p.id + ',\'incomplete\')"><span>⏳ Chưa Ép Xong</span><span style="background:#fef3c7;color:#92400e;padding:1px 8px;border-radius:8px;font-size:9px;font-weight:800">' + p.incomplete_count + '</span></div>';
                        }
                        // Tháng đã hoàn thành
                        if (p.months) {
                            p.months.forEach(function(mo) {
                                var mAct = f.view === 'records' && f.year == yr.year && f.presser_id == p.id && f.month == mo.month && f.status === 'done';
                                h += '<div class="bpe-sb-sub' + (mAct ? ' active' : '') + '" onclick="event.stopPropagation(); _bpeFilterPresserMonth(' + yr.year + ',' + p.id + ',' + mo.month + ')"><span>📅 T' + String(mo.month).padStart(2, '0') + '</span><span>' + mo.count + '</span></div>';
                            });
                        }
                    }
                });
            }
        });
    }
    sb.innerHTML = h;
}

function _bpeTgl(k) { _bpeOpen[k] = !_bpeOpen[k]; _bpeRenderSb(); }

function _bpeToggleYear(year) {
    _bpeOpen['y' + year] = !_bpeOpen['y' + year];
    _bpeRenderSb();
}

function _bpeClearSearchUI() {
    var inp = document.getElementById('bpeSearch');
    if (inp) inp.value = '';
    _bpe.search = '';
}

function _bpeShowUnassigned() {
    _bpeClearSearchUI();
    _bpe.filter = { view: 'unassigned', year: null, month: null, presser_id: null, status: null };
    _bpe.page = 1;
    _bpe.subFilter = 'all';
    _bpeRenderSb();
    _bpeLoadUnassigned();
}

function _bpeFilter(year, month, presserId) {
    _bpeClearSearchUI();
    _bpe.filter = { view: 'records', year: year || null, month: month || null, presser_id: presserId || null, status: null };
    _bpe.page = 1;
    _bpe.subFilter = 'all';
    _bpeRenderSb();
    _bpeLoadRecs();
}

function _bpeFilterPresserStatus(year, presserId, status) {
    _bpeClearSearchUI();
    _bpe.filter = { view: 'records', year: year, month: null, presser_id: presserId, status: status };
    _bpe.page = 1;
    _bpe.subFilter = 'all';
    _bpeRenderSb();
    _bpeLoadRecs();
}

function _bpeFilterPresserMonth(year, presserId, month) {
    _bpeClearSearchUI();
    _bpe.filter = { view: 'records', year: year, month: month, presser_id: presserId, status: 'done' };
    _bpe.page = 1;
    _bpe.subFilter = 'all';
    _bpeRenderSb();
    _bpeLoadRecs();
}

async function _bpeLoadRecs() {
    var f = _bpe.filter;
    var qs = '?_=1';
    if (f.year) qs += '&year=' + f.year;
    if (f.month) qs += '&month=' + f.month;
    if (f.presser_id) qs += '&presser_id=' + f.presser_id;
    
    // Determine default client-side subFilter based on sidebar filter status
    if (f.status === 'incomplete') {
        _bpe.subFilter = 'incomplete';
    } else if (f.status === 'done') {
        _bpe.subFilter = 'done';
    } else {
        _bpe.subFilter = 'all';
    }

    try {
        var res = await apiCall('/api/pressing/records' + qs);
        var records = res.records || [];

        // If it is the "Total" view (no filters), load unassigned as well and merge
        var isTotalView = !f.year && !f.month && !f.presser_id;
        if (isTotalView) {
            try {
                var unassignedRes = await apiCall('/api/pressing/unassigned');
                var unassignedOrders = unassignedRes.orders || [];
                _bpe.unassignedOrders = unassignedOrders;
                
                // Map unassigned items to match pressing_record structure
                var unassignedRecords = unassignedOrders.map(function(ur) {
                    var spName = ur.order_code;
                    if (ur.total_items_in_order > 1 || ur.total_phoi > 1) {
                        spName += ' — Phiếu ' + ur.item_index;
                        if (ur.total_phoi > 1) spName += ' — P' + ur.phoi_in_item;
                    }
                    if (ur.item_desc) spName += ' — ' + ur.item_desc;
                    
                    return {
                        is_unpressed: true,
                        id: null,
                        dht_order_id: ur.id,
                        order_item_id: ur.item_id,
                        order_code: ur.order_code,
                        customer_name: ur.customer_name,
                        cskh_name: ur.cskh_name || ur.created_by_name,
                        shipping_priority: ur.shipping_priority,
                        expected_ship_date: ur.expected_ship_date,
                        product_name: spName,
                        material_name: ur.material_name,
                        fabric_color: ur.color_name,
                        order_quantity: ur.cut_qty || 0,
                        original_qty: ur.item_qty,
                        press_quantity: 0,
                        press_salary: 0,
                        is_reported: false,
                        salary_approved: false,
                        error_reported: false,
                        press_date: null,
                        presser_name: null,
                        presser_id: null,
                        ready: ur.ready,
                        warning_msg: ur.warning_msg,
                        phoi: ur.phoi || []
                    };
                });
                records = records.concat(unassignedRecords);
            } catch (eUnassigned) {
                console.error('[BPE] failed to load unassigned for total view:', eUnassigned);
            }
        }
        
        _bpe.fullRecords = records;
        _bpe.records = records;
        _bpe.page = 1;
        _bpeRender();
    } catch(e) { console.error('[BPE] records:', e); }
}

async function _bpeLoadUnassigned() {
    try {
        var res = await apiCall('/api/pressing/unassigned');
        var orders = res.orders || [];
        _bpe.unassignedOrders = orders;
        
        // Map to pressing records structure
        var records = orders.map(function(ur) {
            var spName = ur.order_code;
            if (ur.total_items_in_order > 1 || ur.total_phoi > 1) {
                spName += ' — Phiếu ' + ur.item_index;
                if (ur.total_phoi > 1) spName += ' — P' + ur.phoi_in_item;
            }
            if (ur.item_desc) spName += ' — ' + ur.item_desc;
            
            return {
                is_unpressed: true,
                id: null,
                dht_order_id: ur.id,
                order_item_id: ur.item_id,
                order_code: ur.order_code,
                customer_name: ur.customer_name,
                cskh_name: ur.cskh_name || ur.created_by_name,
                shipping_priority: ur.shipping_priority,
                expected_ship_date: ur.expected_ship_date,
                product_name: spName,
                material_name: ur.material_name,
                fabric_color: ur.color_name,
                order_quantity: ur.cut_qty || 0,
                original_qty: ur.item_qty,
                press_quantity: 0,
                press_salary: 0,
                is_reported: false,
                salary_approved: false,
                error_reported: false,
                press_date: null,
                presser_name: null,
                presser_id: null,
                ready: ur.ready,
                warning_msg: ur.warning_msg,
                phoi: ur.phoi || []
            };
        });
        
        _bpe.fullRecords = records;
        _bpe.records = records;
        _bpe.page = 1;
        _bpeRender();
    } catch(e) { console.error('[BPE] unassigned:', e); }
}

function _bpeRender() {
    var tb = document.getElementById('bpeTb'); if (!tb) return;
    
    var all = (_bpe.fullRecords || []).slice();
    
    // 1. Apply sub-filter
    var sf = _bpe.subFilter || 'all';
    if (sf === 'unassigned') {
        all = all.filter(function(r) { return r.is_unpressed; });
    } else if (sf === 'incomplete') {
        all = all.filter(function(r) { return !r.is_unpressed && !r.is_reported; });
    } else if (sf === 'done') {
        all = all.filter(function(r) { return r.is_reported; });
    }
    
    // 2. Apply search
    if (_bpe.search) {
        var q = _bpe.search.toLowerCase();
        all = all.filter(function(r) {
            return (r.product_name||'').toLowerCase().indexOf(q)>=0 
                || (r.cskh_name||'').toLowerCase().indexOf(q)>=0 
                || (r.order_code||'').toLowerCase().indexOf(q)>=0
                || (r.customer_name||'').toLowerCase().indexOf(q)>=0
                || (r.presser_name||'').toLowerCase().indexOf(q)>=0
                || (r.material_name||'').toLowerCase().indexOf(q)>=0;
        });
    }
    
    _bpe.records = all;
    
    var total = all.length;
    var totalPages = Math.ceil(total / _bpe.pageSize) || 1;
    if (_bpe.page > totalPages) _bpe.page = totalPages;
    if (_bpe.page < 1) _bpe.page = 1;
    var start = (_bpe.page - 1) * _bpe.pageSize;
    var paged = all.slice(start, start + _bpe.pageSize);
    
    // Re-render table headers if they were changed
    var wrap = document.getElementById('bpeTable');
    if (wrap) {
        var thead = wrap.querySelector('thead');
        if (thead) {
            thead.innerHTML = '<tr style="background:var(--gray-800)">'
                + '<th class="bpe-col-stt">STT</th><th class="bpe-col-act">🔥</th><th class="bpe-col-act">⚠️</th><th>Ngày Ép</th><th>NV Ép</th><th>Tên SP</th><th class="bpe-hide-desktop">Chất Liệu</th><th class="bpe-hide-desktop">Màu Vải</th><th>CSKH</th><th>SL Đơn</th><th>SL Ép</th>'
                + '<th title="Ngực/Tay/Tạp Dề/Vải Mũ">Ngực/Tay</th><th title="Lưng/Bụng/Sườn/Áo Sẵn/Mũ Sẵn">Lưng/Bụng</th><th title="Bảo Hộ/Bếp/Sơ Mi">BH/Bếp</th><th title="Đóng Gói/Cổ Bẻ Vải">ĐG/Cổ Bẻ</th><th>VT Khác</th>'
                + '<th>Ảnh</th><th>Ghi Chú</th><th>Cập Nhật</th>'
                + '</tr>';
        }
    }
    
    _bpeRenderRows(paged);
    _bpeRenderPagination(total, totalPages);
    _bpeRenderStats(total, all);
}

function _bpeGetPrintStatusHtml(r) {
    var printTypes = r.print_types || '';
    var pendingPrintTypes = r.pending_print_types || '';
    
    if (!printTypes) return '';
    
    var types = printTypes.split(', ').map(function(t) { return t.trim(); });
    var pending = pendingPrintTypes ? pendingPrintTypes.split(', ').map(function(t) { return t.trim(); }) : [];
    
    var badges = [];
    
    if (types.indexOf('IN PET') >= 0) {
        if (pending.indexOf('IN PET') >= 0) {
            badges.push('<span style="margin-left: 6px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; vertical-align: middle;">Chưa In Pet</span>');
        } else {
            badges.push('<span style="margin-left: 6px; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; vertical-align: middle;">Đã In Pet</span>');
        }
    }
    
    if (types.indexOf('IN DECAL') >= 0) {
        if (pending.indexOf('IN DECAL') >= 0) {
            badges.push('<span style="margin-left: 6px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; vertical-align: middle;">Chưa In Decal</span>');
        } else {
            badges.push('<span style="margin-left: 6px; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; vertical-align: middle;">Đã In Decal</span>');
        }
    }
    
    return badges.join('');
}

function _bpeRenderRows(paged) {
    var tb = document.getElementById('bpeTb'); if (!tb) return;
    if (!paged.length) {
        tb.innerHTML = '<tr><td colspan="18"><div class="empty-state"><div class="icon">🔥</div><h3>Chưa có đơn ép nào</h3><p>Chọn mục ở sidebar</p></div></td></tr>';
        return;
    }
    
    tb.innerHTML = paged.map(function(r, i) {
        var globalIndex = i + (_bpe.page - 1) * _bpe.pageSize;
        
        var priority = (r.shipping_priority || 'CHUẨN').toUpperCase();
        var priBadge = '';
        if (priority === 'GẤP') {
            priBadge = '<span style="margin-right: 6px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Gấp</span>';
        } else if (priority === 'GỬI') {
            priBadge = '<span style="margin-right: 6px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Gửi</span>';
        } else {
            priBadge = '<span style="margin-right: 6px; background: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Chuẩn</span>';
        }

        if (r.is_unpressed) {
            var claimHtml = '';
            if (r.ready) {
                claimHtml = '<button class="bpe-claim-btn ready" onclick="_bpeClaimOrder(' + r.dht_order_id + ',' + (r.order_item_id || 'null') + ',\'' + r.order_code + '\')" style="padding:4px 12px;font-size:10px">🔥 NHẬN ÉP</button>';
            } else {
                claimHtml = '<button class="bpe-claim-btn disabled" disabled title="' + (r.warning_msg || 'Thiếu thông tin') + '" style="padding:4px 12px;font-size:10px">🔒 ' + (r.warning_msg || 'Khóa') + '</button>';
            }
            
            var noteStr = r.warning_msg ? '<span style="color:#ef4444;font-weight:700">' + r.warning_msg + '</span>' : '—';

            return '<tr style="background:#fff7ed">'
                +'<td class="bpe-col-stt" style="font-weight:700;color:#94a3b8">'+(globalIndex+1)+'</td>'
                +'<td colspan="2" style="text-align:center;vertical-align:middle">'+claimHtml+'</td>'
                +'<td style="font-size:10px">—</td>'
                +'<td style="font-size:10px;color:#ea580c;font-weight:600">—</td>'
                +'<td style="font-weight:600;color:#1e293b"><a href="javascript:void(0)" onclick="_bpeOpenDetail(null,' + (r.order_item_id || 'null') + ')" style="color:#2563eb;text-decoration:underline;cursor:pointer">'+priBadge+r.product_name+'</a>' + _bpeGetPrintStatusHtml(r) + '</td>'
                +'<td class="bpe-hide-desktop" style="font-size:10px;font-weight:bold">'+(r.material_name||'—')+'</td>'
                +'<td class="bpe-hide-desktop" style="font-size:10px">'+(r.fabric_color||'—')+'</td>'
                +'<td style="font-size:10px;color:#2563eb;font-weight:600">'+(r.cskh_name||'—')+'</td>'
                +'<td style="text-align:center;font-weight:600;color:#0369a1">'+r.order_quantity+'</td>'
                +'<td style="text-align:center;font-weight:700;color:#ea580c">—</td>'
                +'<td class="bpe-pos">—</td>'
                +'<td class="bpe-pos">—</td>'
                +'<td class="bpe-pos">—</td>'
                +'<td class="bpe-pos">—</td>'
                +'<td class="bpe-pos" style="max-width:60px;overflow:hidden;text-overflow:ellipsis">—</td>'
                +'<td style="text-align:center;font-size:10px">—</td>'
                +'<td style="font-size:9px;color:#ef4444;font-weight:bold">'+noteStr+'</td>'
                +'<td style="font-size:9px;color:#6b7280">—</td>'
                +'</tr>';
        }
        
        var rI = r.is_reported ? '🔥' : '⬜', rC = r.is_reported ? ' on-rpt' : '', rA = r.is_reported ? 'undo_report' : 'report';
        var sI = r.salary_approved ? '💰' : '⬜', sC = r.salary_approved ? ' on-sal' : '', sA = r.salary_approved ? 'undo_salary' : 'approve_salary';
        var eI = r.error_reported ? '⚠️' : '⬜', eC = r.error_reported ? ' on-err' : '';
        var imgs = '—';
        try {
            var ia = JSON.parse(r.press_images || '[]');
            if (ia.length) {
                imgs = '<div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap">';
                ia.forEach(function(url) {
                    imgs += '<img src="' + url + '" style="width:32px;height:32px;object-fit:cover;border-radius:4px;cursor:pointer;border:1px solid #cbd5e1" onclick="_bpeViewImage(\'' + url.replace(/'/g, "\\'") + '\');event.stopPropagation();" />';
                });
                imgs += '</div>';
            }
        } catch (e) {}
        var upd = ''; if (r.last_update_at) { upd = _bpeFD(r.last_update_at); if (r.last_update_by) upd += '<br><span style="color:#ea580c;font-size:9px">' + r.last_update_by + '</span>'; }
        
        var presserHtml = r.presser_name || '—';
        
        var isManager = window._currentUser && ['giam_doc', 'quan_ly_cap_cao'].indexOf(window._currentUser.role) !== -1;
        var btnStyle = '';
        var btnTitle = 'Báo cáo ép';
        if (r.is_reported) {
            btnTitle = isManager ? 'Báo cáo lại (Quản lý)' : 'Đã báo cáo';
            if (!isManager) {
                btnStyle = ' style="cursor: not-allowed; opacity: 0.85;"';
            }
        }
 
        return '<tr><td class="bpe-col-stt" style="font-weight:700;color:#94a3b8">' + (globalIndex + 1) + '</td>'
            + '<td class="bpe-col-act"><button class="bpe-ib' + rC + '"' + btnStyle + ' onclick="_bpeTog(' + r.id + ',\'' + rA + '\')" title="' + btnTitle + '">' + rI + '</button></td>'
            + '<td class="bpe-col-act"><button class="bpe-ib' + eC + '" onclick="_bpeErr()" title="Báo lỗi">' + eI + '</button></td>'
            + '<td style="font-size:10px">' + (r.is_reported && r.reported_at ? _bpeFmtTimeDateNoYear(r.reported_at) : '—') + '</td>'
            + '<td style="font-size:10px;color:#ea580c;font-weight:600">' + presserHtml + '</td>'
            + '<td style="font-weight:600;color:#1e293b"><a href="javascript:void(0)" onclick="_bpeOpenDetail(' + r.id + ',' + (r.order_item_id || 'null') + ')" style="color:#2563eb;text-decoration:underline;cursor:pointer">' + priBadge + (r.product_name || r.order_code || '—') + '</a>' + _bpeGetPrintStatusHtml(r) + '</td>'
            + '<td class="bpe-hide-desktop" style="font-size:10px;font-weight:bold">' + (r.material_name || '—') + '</td>'
            + '<td class="bpe-hide-desktop" style="font-size:10px">' + (r.fabric_color || '—') + '</td>'
            + '<td style="font-size:10px;color:#2563eb;font-weight:600">' + (r.cskh_name || '—') + '</td>'
            + '<td style="text-align:center;font-weight:600">' + (r.order_quantity || '—') + '</td>'
            + '<td style="text-align:center;font-weight:700;color:#ea580c">' + (r.press_quantity || '—') + '</td>'
            + '<td class="bpe-pos">' + (r.pos_chest_arm || '—') + '</td>'
            + '<td class="bpe-pos">' + (r.pos_back_belly || '—') + '</td>'
            + '<td class="bpe-pos">' + (r.pos_protective || '—') + '</td>'
            + '<td class="bpe-pos">' + (r.pos_packaging || '—') + '</td>'
            + '<td class="bpe-pos" style="max-width:60px;overflow:hidden;text-overflow:ellipsis">' + (r.pos_other || '—') + '</td>'
            + '<td style="text-align:center;font-size:10px">' + imgs + '</td>'
            + '<td style="font-size:9px;max-width:80px;overflow:hidden;text-overflow:ellipsis">' + (r.notes || '—') + '</td>'
            + '<td style="font-size:9px;color:#6b7280">' + upd + '</td></tr>';
    }).join('');
}

function _bpeRenderPagination(totalItems, totalPages) {
    var html = '';
    if (totalPages <= 1) {
        html = '<div style="text-align:center;font-size:11px;color:#64748b;padding:4px"><span style="font-weight:700">' + totalItems + ' đơn</span></div>';
    } else {
        html = '<div style="display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap;padding:6px 0">';
        html += '<button onclick="_bpeGoPage(' + (_bpe.page - 1) + ')" ' + (_bpe.page <= 1 ? 'disabled' : '') + ' style="padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;background:' + (_bpe.page <= 1 ? '#f1f5f9' : '#fff') + ';color:' + (_bpe.page <= 1 ? '#94a3b8' : '#7c3aed') + ';font-size:11px;font-weight:700;cursor:' + (_bpe.page <= 1 ? 'not-allowed' : 'pointer') + '">◀ Trước</button>';
        for (var p = 1; p <= totalPages; p++) {
            if (totalPages > 7 && p > 2 && p < totalPages - 1 && Math.abs(p - _bpe.page) > 1) { if (p === 3 || p === totalPages - 2) html += '<span style="padding:4px 6px;color:#94a3b8;font-size:11px">...</span>'; continue; }
            var isA = p === _bpe.page;
            html += '<button onclick="_bpeGoPage(' + p + ')" style="min-width:30px;padding:4px 8px;border-radius:6px;border:1px solid ' + (isA ? '#7c3aed' : '#cbd5e1') + ';background:' + (isA ? '#7c3aed' : '#fff') + ';color:' + (isA ? '#fff' : '#334155') + ';font-size:11px;font-weight:' + (isA ? '800' : '600') + ';cursor:pointer">' + p + '</button>';
        }
        html += '<button onclick="_bpeGoPage(' + (_bpe.page + 1) + ')" ' + (_bpe.page >= totalPages ? 'disabled' : '') + ' style="padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;background:' + (_bpe.page >= totalPages ? '#f1f5f9' : '#fff') + ';color:' + (_bpe.page >= totalPages ? '#94a3b8' : '#7c3aed') + ';font-size:11px;font-weight:700;cursor:' + (_bpe.page >= totalPages ? 'not-allowed' : 'pointer') + '">Sau ▶</button>';
        html += ' <span style="font-size:11px;color:#64748b;font-weight:600;margin-left:8px">Trang ' + _bpe.page + '/' + totalPages + ' — ' + totalItems + ' đơn</span></div>';
    }
    var top = document.getElementById('bpePaginationTop'), bot = document.getElementById('bpePaginationBottom');
    if (top) {
        if (totalPages <= 1) {
            top.innerHTML = '';
        } else {
            top.innerHTML = html;
        }
    }
    if (bot) bot.innerHTML = html;
}

function _bpeGoPage(p) {
    var tp = Math.ceil((_bpe.records || []).length / _bpe.pageSize) || 1;
    if (p < 1 || p > tp) return;
    _bpe.page = p; _bpeRender();
    var tbl = document.getElementById('bpeTable');
    if (tbl) tbl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function _bpeSetSubFilter(sf) {
    _bpe.subFilter = sf;
    _bpe.page = 1;
    _bpeRender();
}

function _bpeRenderStats(count, arr) {
    var el = document.getElementById('bpeInfo'); if (!el) return;
    var f = _bpe.filter, parts = ['🔥 Bộ Phận Ép'];
    if (f.year) parts.push('📆 ' + f.year);
    if (f.status === 'incomplete') parts.push('⏳ Chưa Ép Xong');
    if (f.month) parts.push('🗓️ T' + f.month);
    var label = parts.join(' <span style="opacity:0.5;margin:0 6px">•</span> ');
    el.innerHTML = '<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#5b21b6,#4c1d95);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700;letter-spacing:0.3px">'
        + label + ' <span style="opacity:0.5;margin:0 4px">—</span> <span style="color:#ddd6fe;font-weight:900">' + count + '</span> đơn</div>';

    var sc = document.getElementById('bpeStats'); if (!sc) return;
    
    // Get base list filtered ONLY by search (so stats reflect search query if typed)
    var baseArr = (_bpe.fullRecords || []).slice();
    if (_bpe.search) {
        var q = _bpe.search.toLowerCase();
        baseArr = baseArr.filter(function(r) { 
            return (r.product_name||'').toLowerCase().indexOf(q)>=0 
                || (r.cskh_name||'').toLowerCase().indexOf(q)>=0 
                || (r.order_code||'').toLowerCase().indexOf(q)>=0 
                || (r.customer_name||'').toLowerCase().indexOf(q)>=0
                || (r.presser_name||'').toLowerCase().indexOf(q)>=0
                || (r.material_name||'').toLowerCase().indexOf(q)>=0; 
        });
    }
    
    var totalCount = baseArr.length;
    var unassignedCount = baseArr.filter(function(r) { return r.is_unpressed; }).length;
    var incompleteCount = baseArr.filter(function(r) { return !r.is_unpressed && !r.is_reported; }).length;
    var doneCount = baseArr.filter(function(r) { return r.is_reported; }).length;

    var sf = _bpe.subFilter || 'all';
    
    var btnTotalHtml = '<div onclick="_bpeSetSubFilter(\'all\')" style="cursor:pointer;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;padding:8px 18px;border-radius:10px;min-width:110px;text-align:center;transition:all 0.2s;box-shadow:' + (sf === 'all' ? '0 0 0 3px #fff, 0 4px 20px rgba(124,58,237,0.5)' : '0 4px 10px rgba(124,58,237,0.2)') + ';transform:' + (sf === 'all' ? 'scale(1.05)' : 'scale(1)') + ';opacity:' + (sf === 'all' ? '1' : '0.6') + ';position:relative;overflow:hidden">'
        +'<div style="position:absolute;top:0;left:-50%;width:200%;height:100%;background:linear-gradient(90deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%);animation:bpeShimmer 2.5s infinite"></div>'
        +'<div style="font-size:9px;font-weight:700;opacity:0.9;letter-spacing:1px;margin-bottom:2px">📦 TỔNG ĐƠN</div>'
        +'<div style="font-size:16px;font-weight:900">' + totalCount + '</div>'
        +'</div>';

    var btnUnassignedHtml = '<div onclick="_bpeSetSubFilter(\'unassigned\')" style="cursor:pointer;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;padding:8px 18px;border-radius:10px;min-width:110px;text-align:center;transition:all 0.2s;box-shadow:' + (sf === 'unassigned' ? '0 0 0 3px #fff, 0 4px 20px rgba(249,115,22,0.5)' : '0 4px 10px rgba(249,115,22,0.2)') + ';transform:' + (sf === 'unassigned' ? 'scale(1.05)' : 'scale(1)') + ';opacity:' + (sf === 'unassigned' ? '1' : '0.6') + ';position:relative;overflow:hidden">'
        +'<div style="position:absolute;top:0;left:-50%;width:200%;height:100%;background:linear-gradient(90deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%);animation:bpeShimmer 2.5s infinite .2s"></div>'
        +'<div style="font-size:9px;font-weight:700;opacity:0.9;letter-spacing:1px;margin-bottom:2px">🔴 CHƯA NHẬN</div>'
        +'<div style="font-size:16px;font-weight:900">' + unassignedCount + '</div>'
        +'</div>';
        
    var btnIncompleteHtml = '<div onclick="_bpeSetSubFilter(\'incomplete\')" style="cursor:pointer;background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;padding:8px 18px;border-radius:10px;min-width:110px;text-align:center;transition:all 0.2s;box-shadow:' + (sf === 'incomplete' ? '0 0 0 3px #fff, 0 4px 20px rgba(217,119,6,0.5)' : '0 4px 10px rgba(217,119,6,0.2)') + ';transform:' + (sf === 'incomplete' ? 'scale(1.05)' : 'scale(1)') + ';opacity:' + (sf === 'incomplete' ? '1' : '0.6') + ';position:relative;overflow:hidden">'
        +'<div style="position:absolute;top:0;left:-50%;width:200%;height:100%;background:linear-gradient(90deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%);animation:bpeShimmer 2.5s infinite .4s"></div>'
        +'<div style="font-size:9px;font-weight:700;opacity:0.9;letter-spacing:1px;margin-bottom:2px">⏳ ĐANG ÉP</div>'
        +'<div style="font-size:16px;font-weight:900">' + incompleteCount + '</div>'
        +'</div>';
        
    var btnDoneHtml = '<div onclick="_bpeSetSubFilter(\'done\')" style="cursor:pointer;background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:8px 18px;border-radius:10px;min-width:110px;text-align:center;transition:all 0.2s;box-shadow:' + (sf === 'done' ? '0 0 0 3px #fff, 0 4px 20px rgba(5,150,105,0.5)' : '0 4px 10px rgba(5,150,105,0.2)') + ';transform:' + (sf === 'done' ? 'scale(1.05)' : 'scale(1)') + ';opacity:' + (sf === 'done' ? '1' : '0.6') + ';position:relative;overflow:hidden">'
        +'<div style="position:absolute;top:0;left:-50%;width:200%;height:100%;background:linear-gradient(90deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%);animation:bpeShimmer 2.5s infinite .6s"></div>'
        +'<div style="font-size:9px;font-weight:700;opacity:0.9;letter-spacing:1px;margin-bottom:2px">✅ ĐÃ ÉP XONG</div>'
        +'<div style="font-size:16px;font-weight:900">' + doneCount + '</div>'
        +'</div>';
        
    sc.innerHTML = btnTotalHtml + btnUnassignedHtml + btnIncompleteHtml + btnDoneHtml;
}

async function _bpeClaimOrder(orderId, itemId, orderCode) {
    var groupKey = orderId + '_' + (itemId || 0);
    var rows = (_bpe.unassignedOrders || []).filter(function(r) { return (r.id + '_' + (r.item_id || 0)) === groupKey; });
    var o = rows[0];
    
    // If we are in merged view, we can find it in fullRecords as well
    if (!o) {
        var match = (_bpe.fullRecords || []).find(function(r) { return r.dht_order_id === orderId && r.order_item_id === itemId && r.is_unpressed; });
        if (match) {
            o = {
                id: match.dht_order_id,
                order_code: match.order_code,
                customer_name: match.customer_name,
                cskh_name: match.cskh_name,
                expected_ship_date: match.expected_ship_date,
                item_desc: match.product_name,
                item_index: 1,
                item_qty: match.original_qty || match.order_quantity,
                cut_qty: match.order_quantity
            };
            rows = [o];
        }
    }
    
    if (!o) return;
    
    var old = document.getElementById('_bpeClaimModal'); if (old) old.remove();
    
    var h = '<div class="bpc-modal-overlay" id="_bpeClaimModal">';
    h += '<div class="bpc-modal" style="width:480px">';
    h += '<div class="bpc-modal-header" style="background:linear-gradient(135deg,#7c3aed,#4f46e5)"><div class="m-icon">🔥</div><div><div class="m-title">Xác Nhận Nhận Ép</div><div class="m-sub">Nhận phiếu ép hàng này</div></div></div>';
    h += '<div class="bpc-modal-body" style="padding:16px 20px">';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📋 Mã đơn</span><span class="bpc-modal-val" style="color:#059669;font-weight:bold;font-size:14px">' + orderCode + ' — Phiếu ' + o.item_index + '</span></div>';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">👤 Khách hàng</span><span class="bpc-modal-val">' + (o.customer_name || '—') + '</span></div>';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">💼 NV Sale</span><span class="bpc-modal-val" style="color:#60a5fa">' + (o.cskh_name || '—') + '</span></div>';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📅 Hạn ship</span><span class="bpc-modal-val">' + _bpeFD(o.expected_ship_date) + '</span></div>';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">👕 Mô tả phiếu</span><span class="bpc-modal-val">' + (o.item_desc || '—') + '</span></div>';
    
    var phoiList = (o && o.phoi && o.phoi.length > 0) ? o.phoi : rows;
    if (phoiList.length > 0) {
        h += '<div style="margin-top:12px;border-top:1px solid #e2e8f0;padding-top:12px">';
        h += '<div style="font-size:11px;font-weight:bold;color:#4f46e5;margin-bottom:8px">📦 DANH SÁCH PHỐI ÉP (' + phoiList.length + ')</div>';
        phoiList.forEach(function(p) {
            h += '<div style="display:flex;justify-content:space-between;padding:6px 10px;background:#f8fafc;border-radius:6px;margin-bottom:4px;font-size:11px">';
            h += '<span style="font-weight:bold">' + (p.material_name || 'Phối') + ' · ' + (p.color_name || 'Màu') + '</span>';
            h += '<span style="font-weight:bold;color:#ea580c">SL Ép: ' + (p.cut_qty || p.order_quantity || 0) + '</span>';
            h += '</div>';
        });
        h += '</div>';
    }
    
    h += '</div>';
    h += '<div class="bpc-modal-actions">';
    h += '<button class="bpc-modal-btn cancel" onclick="_bpeCloseModal()">Hủy</button>';
    h += '<button class="bpc-modal-btn confirm" id="_bpeConfirmBtn" style="background:linear-gradient(135deg,#7c3aed,#4f46e5)" onclick="_bpeDoClaimOrder(' + orderId + ',' + (itemId || 'null') + ',\'' + orderCode + '\')">🔥 XÁC NHẬN NHẬN</button>';
    h += '</div></div></div>';

    document.body.insertAdjacentHTML('beforeend', h);
    requestAnimationFrame(function() { document.getElementById('_bpeClaimModal').classList.add('show'); });
}

function _bpeCloseModal() {
    var m = document.getElementById('_bpeClaimModal');
    if (m) { m.classList.remove('show'); setTimeout(function() { m.remove(); }, 300); }
}

async function _bpeDoClaimOrder(orderId, itemId, orderCode) {
    var btn = document.getElementById('_bpeConfirmBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang nhận...'; }
    try {
        await apiCall('/api/pressing/claim', 'POST', { dht_order_id: orderId, order_item_id: itemId });
        _bpeCloseModal();
        showToast('✅ Đã nhận đơn ép ' + orderCode);
        await _bpeLoadAll();
    } catch(e) {
        showToast(e.message || 'Lỗi', 'error');
        if (btn) { btn.disabled = false; btn.textContent = '🔥 XÁC NHẬN NHẬN'; }
    }
}

async function _bpeUnclaimOrder(itemId, orderCode) {
    if (confirm('Trả lại đơn ' + orderCode + '? Mọi dữ liệu ép của phiếu này sẽ bị xóa.')) {
        try {
            await apiCall('/api/pressing/unclaim', 'POST', { order_item_id: itemId });
            showToast('✅ Đã trả đơn ' + orderCode);
            await _bpeLoadAll();
        } catch(e) { showToast(e.message || 'Lỗi', 'error'); }
    }
}

async function _bpeTog(id, action) {
    if (action === 'report') {
        _bpeOpenReportModal(id);
    } else if (action === 'undo_report') {
        var isManager = window._currentUser && ['giam_doc', 'quan_ly_cap_cao'].indexOf(window._currentUser.role) !== -1;
        if (!isManager) {
            showToast('⚠️ Chỉ quản lý cấp cao và giám đốc mới được báo cáo lại đơn đã ép!', 'error');
            return;
        }
        _bpeOpenReportModal(id);
    } else {
        if (confirm('Hoàn tác báo cáo ép? Đơn này sẽ quay lại trạng thái chưa hoàn thành.')) {
            try {
                await apiCall('/api/pressing/toggle/' + id, 'POST', { action: action });
                showToast('✅ Đã hoàn tác');
                await _bpeLoadAll();
            } catch(e) { showToast(e.message||'Lỗi','error'); }
        }
    }
}

function _bpeErr() {
    if (typeof navigate === 'function') {
        navigate('don-loi-khach-hang');
        showToast('📋 Chuyển sang Đơn Lỗi');
    }
}

// --- Desktop Fusing Report Modal Logic ---
window._bpeReportImages = [];

function _bpeCompressImage(file, callback) {
    if (!file) return callback(null);
    var reader = new FileReader();
    reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
            var canvas = document.createElement('canvas');
            var maxWidth = 1000;
            var maxHeight = 1000;
            var width = img.width;
            var height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            var compressed = canvas.toDataURL('image/jpeg', 0.7);
            callback(compressed);
        };
        img.onerror = function() {
            callback(e.target.result);
        };
        img.src = e.target.result;
    };
    reader.onerror = function() {
        callback(null);
    };
    reader.readAsDataURL(file);
}

function _bpeOpenReportModal(id) {
    var r = (_bpe.fullRecords || []).find(function(x) { return x.id === id; });
    if (!r) {
        showToast('Không tìm thấy bản ghi đơn ép', 'error');
        return;
    }

    var orderQty = r.order_quantity || 0;
    window._bpeReportImages = [];
    try {
        if (r.press_images) {
            window._bpeReportImages = JSON.parse(r.press_images);
        }
    } catch(e) {
        window._bpeReportImages = [];
    }

    var old = document.getElementById('_bpeReportModal');
    if (old) old.remove();

    var matColor = (r.material_name || '—') + ' · ' + (r.fabric_color || '—');
    var cskh = r.cskh_name || '—';

    var modalTitle = r.is_reported ? 'BÁO CÁO LẠI ĐƠN ÉP' : 'BÁO CÁO HOÀN THÀNH ÉP';

    var h = '<div class="bpc-modal-overlay" id="_bpeReportModal">';
    h += '<div class="bpc-modal" style="width:680px; max-height:95vh; overflow-y:auto; display:flex; flex-direction:column;">';
    h += '<div class="bpc-modal-header" style="background:linear-gradient(135deg,#7c3aed,#4f46e5)"><div class="m-icon">🔥</div><div><div class="m-title">' + modalTitle + '</div><div class="m-sub">Mã đơn: <span id="_bpeRptOrderCode" style="font-weight:700">' + r.order_code + '</span></div></div></div>';
    
    h += '<div class="bpc-modal-body" style="overflow-y:auto; flex:1; padding:16px 20px; font-size:12px;">';
    
    // Info grid
    h += '<div style="background:#f8fafc; border-radius:8px; padding:12px; margin-bottom:16px; border:1px solid #e2e8f0; display:grid; grid-template-columns:1fr 1fr; gap:8px;">';
    h += '<div>👕 <strong>Sản phẩm:</strong> <span>' + (r.product_name || '—') + '</span></div>';
    h += '<div>🎨 <strong>Chất liệu/Màu:</strong> <span>' + matColor + '</span></div>';
    h += '<div>👤 <strong>CSKH:</strong> <span>' + cskh + '</span></div>';
    h += '<div>📦 <strong>SL Cắt:</strong> <span style="color:#0369a1; font-weight:700;">' + orderQty + ' sp</span></div>';
    h += '</div>';

    // Inputs Grid
    h += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">';
    h += '<div>';
    h += '<label style="display:block; font-weight:800; color:#475569; margin-bottom:4px; font-size:11px; text-transform:uppercase;">Ngực, Tay, Tạp Dề, Vải Mũ</label>';
    h += '<input type="number" id="_bpePosChest" class="form-control" style="width:100%; font-weight:bold;" min="0" oninput="_bpeUpdateReportTotal()" value="' + (r.pos_chest_arm || '') + '">';
    h += '</div>';
    h += '<div>';
    h += '<label style="display:block; font-weight:800; color:#475569; margin-bottom:4px; font-size:11px; text-transform:uppercase;">Lưng, Bụng, Sườn, Áo Sẵn, Mũ Sẵn</label>';
    h += '<input type="number" id="_bpePosBack" class="form-control" style="width:100%; font-weight:bold;" min="0" oninput="_bpeUpdateReportTotal()" value="' + (r.pos_back_belly || '') + '">';
    h += '</div>';
    h += '</div>';

    h += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:12px;">';
    h += '<div>';
    h += '<label style="display:block; font-weight:800; color:#475569; margin-bottom:4px; font-size:11px; text-transform:uppercase;">Bảo Hộ, Bếp, Sơ Mi</label>';
    h += '<input type="number" id="_bpePosProtective" class="form-control" style="width:100%; font-weight:bold;" min="0" oninput="_bpeUpdateReportTotal()" value="' + (r.pos_protective || '') + '">';
    h += '</div>';
    h += '<div>';
    h += '<label style="display:block; font-weight:800; color:#475569; margin-bottom:4px; font-size:11px; text-transform:uppercase;">Đóng Gói, Cổ Bẻ Vải</label>';
    h += '<input type="number" id="_bpePosPackaging" class="form-control" style="width:100%; font-weight:bold;" min="0" oninput="_bpeUpdateReportTotal()" value="' + (r.pos_packaging || '') + '">';
    h += '</div>';
    h += '</div>';

    h += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:12px;">';
    h += '<div>';
    h += '<label style="display:block; font-weight:800; color:#475569; margin-bottom:4px; font-size:11px; text-transform:uppercase;">Vị Trí Khác</label>';
    h += '<input type="number" id="_bpePosOther" class="form-control" style="width:100%; font-weight:bold;" min="0" oninput="_bpeUpdateReportTotal()" value="' + (parseInt(r.pos_other) || '') + '">';
    h += '</div>';
    h += '<div>';
    h += '<label style="display:block; font-weight:800; color:#475569; margin-bottom:4px; font-size:11px; text-transform:uppercase;">Ghi Chú Ép</label>';
    h += '<textarea id="_bpeReportNotes" class="form-control" style="width:100%; height:38px; resize:none;" placeholder="Nhập ghi chú...">' + (r.notes || '') + '</textarea>';
    h += '</div>';
    h += '</div>';

    // Auto-calculated total
    h += '<div style="margin-top:16px; padding:10px; background:#fff7ed; border-radius:8px; border:1px solid #ffedd5; display:flex; justify-content:space-between; align-items:center;">';
    h += '<span style="font-weight:700; color:#ea580c;">👉 Tổng Số Lượng Ép ( tổng của tất cả các chi tiết ):</span>';
    h += '<span id="_bpeReportQty" style="font-size:18px; font-weight:900; color:#ea580c;">0</span>';
    h += '</div>';

    // Image upload area
    h += '<div style="margin-top:16px;">';
    h += '<label style="display:block; font-weight:800; color:#475569; margin-bottom:4px; font-size:11px; text-transform:uppercase;">📸 Hình Ảnh Ép* (Bắt buộc)</label>';
    h += '<div id="_bpeDragArea" style="border:2px dashed #7c3aed; border-radius:10px; padding:20px; text-align:center; background:rgba(124,58,237,0.03); color:#7c3aed; cursor:pointer;" onclick="document.getElementById(\'_bpeFileInput\').click()">';
    h += '    Nhấn <span style="background:#7c3aed;color:#fff;padding:2px 8px;border-radius:4px;font-family:monospace;font-size:11px;font-weight:800">Ctrl + V</span> để dán ảnh hoặc click vào đây để chọn file';
    h += '    <input type="file" id="_bpeFileInput" accept="image/*" multiple style="display:none;" onchange="_bpeOnImagesSelect(event)">';
    h += '</div>';
    h += '<div id="_bpeImagePreviews" style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;"></div>';
    h += '</div>';

    h += '</div>'; // End of modal-body
    
    var submitText = r.is_reported ? 'LƯU BÁO CÁO' : 'BÁO CÁO ÉP';

    h += '<div class="bpc-modal-actions">';
    h += '<button class="bpc-modal-btn cancel" onclick="_bpeCloseReportModal()">Hủy</button>';
    h += '<button class="bpc-modal-btn confirm" id="_bpeReportSubmitBtn" style="background:linear-gradient(135deg,#7c3aed,#4f46e5)" onclick="_bpeSubmitReport(' + id + ')">' + submitText + '</button>';
    h += '</div>';

    h += '</div></div>';

    document.body.insertAdjacentHTML('beforeend', h);
    requestAnimationFrame(function() {
        document.getElementById('_bpeReportModal').classList.add('show');
    });

    // Setup drag and drop
    var dragArea = document.getElementById('_bpeDragArea');
    if (dragArea) {
        dragArea.addEventListener('dragover', function(e) { e.preventDefault(); dragArea.style.borderColor = '#4f46e5'; });
        dragArea.addEventListener('dragleave', function(e) { e.preventDefault(); dragArea.style.borderColor = '#7c3aed'; });
        dragArea.addEventListener('drop', function(e) {
            e.preventDefault();
            dragArea.style.borderColor = '#7c3aed';
            var files = e.dataTransfer.files;
            for (var i = 0; i < files.length; i++) {
                if (files[i].type.indexOf('image') === 0) {
                    _bpeAddReportImage(files[i]);
                }
            }
        });
    }

    _bpeSetupPasteListener();
    _bpeUpdateReportTotal();
    _bpeRenderReportImagePreviews();
}

function _bpeCloseReportModal() {
    var m = document.getElementById('_bpeReportModal');
    if (m) {
        m.classList.remove('show');
        setTimeout(function() { m.remove(); }, 300);
    }
    if (window._bpePasteHandler) {
        window.removeEventListener('paste', window._bpePasteHandler);
        window._bpePasteHandler = null;
    }
}

function _bpeUpdateReportTotal() {
    var chest = Number(document.getElementById('_bpePosChest').value) || 0;
    var back = Number(document.getElementById('_bpePosBack').value) || 0;
    var prot = Number(document.getElementById('_bpePosProtective').value) || 0;
    var pack = Number(document.getElementById('_bpePosPackaging').value) || 0;
    var other = Number(document.getElementById('_bpePosOther').value) || 0;

    var sum = chest + back + prot + pack + other;
    document.getElementById('_bpeReportQty').textContent = sum;
}

function _bpeOnImagesSelect(e) {
    var files = e.target.files;
    for (var i = 0; i < files.length; i++) {
        _bpeAddReportImage(files[i]);
    }
    e.target.value = '';
}

function _bpeAddReportImage(file) {
    _bpeCompressImage(file, function(compressed) {
        if (!compressed) return;
        window._bpeReportImages.push(compressed);
        _bpeRenderReportImagePreviews();
    });
}

function _bpeRenderReportImagePreviews() {
    var area = document.getElementById('_bpeImagePreviews');
    if (!area) return;
    var h = '';
    window._bpeReportImages.forEach(function(imgData, index) {
        h += '<div style="position:relative;display:inline-block">';
        h += '<img src="' + imgData + '" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1">';
        h += '<span onclick="_bpeRemoveReportImage(' + index + ')" style="position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border-radius:50%;width:16px;height:16px;font-size:10px;font-weight:900;text-align:center;line-height:16px;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.2)">×</span>';
        h += '</div>';
    });
    area.innerHTML = h;
}

function _bpeRemoveReportImage(index) {
    window._bpeReportImages.splice(index, 1);
    _bpeRenderReportImagePreviews();
}

function _bpeSetupPasteListener() {
    if (window._bpePasteHandler) {
        window.removeEventListener('paste', window._bpePasteHandler);
    }
    window._bpePasteHandler = function(e) {
        if (!document.getElementById('_bpeReportModal')) return;
        var items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (var i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') === 0) {
                var blob = items[i].getAsFile();
                _bpeAddReportImage(blob);
            }
        }
    };
    window.addEventListener('paste', window._bpePasteHandler);
}

function _bpeValidateFieldMultiple(val, name, orderQty, maxSubItems) {
    if (val <= 0) return null;
    if (orderQty <= 0) return null;
    if (val <= orderQty) return null;
    if (val % orderQty !== 0) {
        return `SL ${name} (${val}) khi lớn hơn SL cắt (${orderQty}) phải là bội số của SL cắt (ví dụ: ${orderQty}, ${orderQty * 2}, ${orderQty * 3}...)!`;
    }
    var maxAllowed = maxSubItems * orderQty;
    if (val > maxAllowed) {
        return `SL ${name} (${val}) không được lớn hơn ${maxSubItems} lần SL cắt (${maxAllowed})!`;
    }
    return null;
}

async function _bpeSubmitReport(id) {
    var chest = Number(document.getElementById('_bpePosChest').value) || 0;
    var back = Number(document.getElementById('_bpePosBack').value) || 0;
    var prot = Number(document.getElementById('_bpePosProtective').value) || 0;
    var pack = Number(document.getElementById('_bpePosPackaging').value) || 0;
    var otherVal = Number(document.getElementById('_bpePosOther').value) || 0;
    var notes = document.getElementById('_bpeReportNotes').value;

    var r = (_bpe.fullRecords || []).find(function(x) { return x.id === id; });
    var orderQty = r ? r.order_quantity : 9999;

    if (chest <= 0 && back <= 0 && prot <= 0 && pack <= 0 && otherVal <= 0) {
        showToast('⚠️ Bạn phải nhập số lượng cho ít nhất 1 vị trí ép!', 'error');
        return;
    }

    var errChest = _bpeValidateFieldMultiple(chest, 'Ngực, Tay, Tạp Dề, Vải Mũ', orderQty, 4);
    if (errChest) { showToast('⚠️ ' + errChest, 'error'); return; }

    var errBack = _bpeValidateFieldMultiple(back, 'Lưng, Bụng, Sườn, Áo Sẵn, Mũ Sẵn', orderQty, 5);
    if (errBack) { showToast('⚠️ ' + errBack, 'error'); return; }

    var errProt = _bpeValidateFieldMultiple(prot, 'Bảo Hộ, Bếp, Sơ Mi', orderQty, 3);
    if (errProt) { showToast('⚠️ ' + errProt, 'error'); return; }

    var errPack = _bpeValidateFieldMultiple(pack, 'Đóng Gói, Cổ Bẻ Vải', orderQty, 2);
    if (errPack) { showToast('⚠️ ' + errPack, 'error'); return; }

    var errOther = _bpeValidateFieldMultiple(otherVal, 'Vị Trí Khác', orderQty, 5);
    if (errOther) { showToast('⚠️ ' + errOther, 'error'); return; }

    if (!window._bpeReportImages || window._bpeReportImages.length === 0) {
        showToast('⚠️ Bạn phải chọn/dán ít nhất 1 hình ảnh ép!', 'error');
        return;
    }

    var btn = document.getElementById('_bpeReportSubmitBtn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Đang lưu...';
    }

    var qty = chest + back + prot + pack + otherVal;

    try {
        await apiCall('/api/pressing/records/' + id, 'PUT', {
            press_quantity: qty,
            pos_chest_arm: chest,
            pos_back_belly: back,
            pos_protective: prot,
            pos_packaging: pack,
            pos_other: otherVal ? otherVal.toString() : '',
            press_images: JSON.stringify(window._bpeReportImages),
            notes: notes
        });

        await apiCall('/api/pressing/toggle/' + id, 'POST', { action: 'report' });
        
        showToast('✅ Đã báo cáo thành công');
        _bpeCloseReportModal();
        await _bpeLoadAll();
    } catch(e) {
        showToast(e.message || 'Lỗi', 'error');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'BÁO CÁO ÉP';
        }
    }
}

function _bpeOpenDetail(recordId, orderItemId) {
    var r;
    if (recordId) {
        r = _bpe.records.find(function(x) { return x.id === recordId; });
        if (!r && _bpe.fullRecords) r = _bpe.fullRecords.find(function(x) { return x.id === recordId; });
    } else if (orderItemId) {
        r = _bpe.records.find(function(x) { return x.order_item_id === orderItemId && x.is_unpressed; });
        if (!r && _bpe.fullRecords) r = _bpe.fullRecords.find(function(x) { return x.order_item_id === orderItemId && x.is_unpressed; });
    }
    if (!r) {
        alert('Không tìm thấy thông tin phiếu ép.');
        return;
    }

    var old = document.getElementById('_bpeDetailModal'); if (old) old.remove();

    var matColor = (r.material_name || '—') + ' · ' + (r.fabric_color || '—');
    var statusTxt = r.is_reported ? '✅ Đã báo cáo' : '⏳ Chờ báo cáo';
    var statusBg = r.is_reported ? '#059669' : '#ea580c';

    var h = '<div class="bpc-modal-overlay" id="_bpeDetailModal">';
    h += '<div class="bpc-modal" style="width:560px; max-height:95vh; overflow-y:auto; display:flex; flex-direction:column;">';
    h += '<div class="bpc-modal-header" style="background:linear-gradient(135deg,' + statusBg + ',' + statusBg + 'cc)"><div class="m-icon">📋</div><div><div class="m-title">CHI TIẾT PHIẾU ÉP</div><div class="m-sub">' + statusTxt + '</div></div></div>';
    h += '<div class="bpc-modal-body" style="overflow-y:auto; flex:1; padding:16px 20px; font-size:12px;">';

    // Info grid
    h += '<div style="background:#f8fafc; border-radius:8px; padding:12px; margin-bottom:16px; border:1px solid #e2e8f0; display:grid; grid-template-columns:1fr 1fr; gap:8px;">';
    h += '<div>👕 <strong>Sản phẩm:</strong> <span>' + (r.product_name || '—') + '</span></div>';
    h += '<div>🎨 <strong>Chất liệu/Màu:</strong> <span>' + matColor + '</span></div>';
    h += '<div>👤 <strong>CSKH:</strong> <span>' + (r.cskh_name || '—') + '</span></div>';
    h += '<div>📦 <strong>SL Cắt:</strong> <span style="color:#0369a1; font-weight:700;">' + (r.order_quantity || 0) + ' sp</span></div>';
    h += '<div>🔥 <strong>NV Ép:</strong> <span>' + (r.presser_name || '—') + '</span></div>';
    h += '<div>📅 <strong>Ngày Ép:</strong> <span>' + (r.reported_at ? _bpeFmtTimeDateNoYear(r.reported_at) : '—') + '</span></div>';
    if (r.print_types) {
        h += '<div style="grid-column: span 2; display:flex; align-items:center; flex-wrap:wrap;">🖨️ <strong>Trạng thái in:</strong> ' + _bpeGetPrintStatusHtml(r) + '</div>';
    }
    h += '</div>';

    // Quantities & Salary
    h += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:16px;">';
    h += '<div style="background:#f0fdf4; padding:10px; border-radius:10px; text-align:center; border:1px solid #bbf7d0;"><div style="font-size:9px; font-weight:700; color:#166534">🔥 TỔNG SL ÉP THỰC TẾ</div><div style="font-size:18px; font-weight:900; color:#15803d">' + (r.press_quantity || 0) + ' sp</div></div>';
    h += '<div style="background:#fff7ed; padding:10px; border-radius:10px; text-align:center; border:1px solid #ffedd5;"><div style="font-size:9px; font-weight:700; color:#c2410c">💰 LƯƠNG ÉP</div><div style="font-size:18px; font-weight:900; color:#ea580c">' + _bpeFN(r.press_salary || 0) + ' đ</div></div>';
    h += '</div>';

    // Detailed positions
    h += '<div class="bpc-detail-card" style="border-left: 4px solid #6366f1;">';
    h += '<div class="bpc-detail-section-title">🧩 CHI TIẾT CÁC VỊ TRÍ ÉP</div>';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">👕 Ngực, Tay, Tạp Dề, Vải Mũ</span><span class="bpc-modal-val" style="color:#4f46e5;font-weight:700">' + (r.pos_chest_arm || 0) + ' sp</span></div>';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">🧥 Lưng, Bụng, Sườn, Áo Sẵn, Mũ Sẵn</span><span class="bpc-modal-val" style="color:#4f46e5;font-weight:700">' + (r.pos_back_belly || 0) + ' sp</span></div>';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">🛡️ Bảo Hộ, Bếp, Sơ Mi</span><span class="bpc-modal-val" style="color:#4f46e5;font-weight:700">' + (r.pos_protective || 0) + ' sp</span></div>';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📦 Đóng Gói, Cổ Bẻ Vải</span><span class="bpc-modal-val" style="color:#4f46e5;font-weight:700">' + (r.pos_packaging || 0) + ' sp</span></div>';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📍 Vị Trí Khác</span><span class="bpc-modal-val" style="color:#4f46e5;font-weight:700">' + (r.pos_other || 0) + ' sp</span></div>';
    h += '</div>';

    // Images & Notes
    h += '<div class="bpc-detail-card" style="border-left: 4px solid #8b5cf6;">';
    h += '<div class="bpc-detail-section-title" style="color:#8b5cf6">📝 BÁO CÁO CỦA NHÂN VIÊN</div>';
    h += '<div class="bpc-modal-row" style="flex-direction:column; align-items:flex-start; border-bottom:none; padding:4px 0;"><span class="bpc-modal-lbl" style="margin-bottom:6px;">💬 Ghi chú ép:</span><span class="bpc-modal-val" style="text-align:left; max-width:100%; white-space:pre-wrap; color:#334155; font-weight:500; font-size:12px; background:#fff; padding:8px 12px; border:1px solid #e2e8f0; border-radius:8px; width:100%; min-height:40px; box-sizing:border-box;">' + (r.notes || '—') + '</span></div>';
    
    var imgs = [];
    try { imgs = typeof r.press_images === 'string' ? JSON.parse(r.press_images) : (r.press_images || []); } catch(e) {}
    if (Array.isArray(imgs) && imgs.length > 0) {
        h += '<div style="margin-top:12px;">';
        h += '<div class="bpc-modal-lbl" style="margin-bottom:8px;">📸 Hình ảnh ép thực tế:</div>';
        h += '<div style="display:flex; flex-wrap:wrap; gap:10px">';
        imgs.forEach(function(imgUrl) {
            h += '<img src="' + imgUrl + '" class="bpe-detail-thumb" onclick="_bpeViewImage(\'' + imgUrl.replace(/'/g, "\\'") + '\')">';
        });
        h += '</div>';
        h += '</div>';
    }
    h += '</div>';

    h += '</div>'; // End body

    // Footer actions
    h += '<div style="padding:12px 24px; border-top:1px solid #f1f5f9; text-align:center">';
    h += '<button class="bpc-modal-btn cancel" style="width:100%" onclick="var m=document.getElementById(\'_bpeDetailModal\');if(m){m.classList.remove(\'show\');setTimeout(function(){m.remove()},300)}">Đóng</button>';
    h += '</div>';

    h += '</div></div>';
    
    document.body.insertAdjacentHTML('beforeend', h);
    requestAnimationFrame(function() {
        var m = document.getElementById('_bpeDetailModal');
        if (m) m.classList.add('show');
    });
}

function _bpeViewImage(url) {
    var ov = document.getElementById('bpeImgViewer');
    if (ov) ov.remove();
    ov = document.createElement('div');
    ov.id = 'bpeImgViewer';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:pointer';
    ov.onclick = function() { ov.remove(); };
    ov.innerHTML = '<img src="' + url + '" style="max-width:90vw;max-height:90vh;border-radius:8px;box-shadow:0 10px 40px rgba(0,0,0,0.5);object-fit:contain">';
    document.body.appendChild(ov);
}
