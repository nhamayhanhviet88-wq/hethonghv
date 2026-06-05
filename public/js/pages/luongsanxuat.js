// ========== LƯƠNG SẢN XUẤT — Desktop SPA ==========
var _lsx = {
    records: [],
    tree: null,
    filter: {
        year: null,
        month: null,
        dept: null,
        worker_id: null,
        contractor_id: null,
        status: '' // '', 'approved', 'pending'
    },
    search: '',
    is_manager: false
};
var _lsxOpen = {};

function renderLuongSanXuatPage(content) {
    if (!content) content = document.getElementById('contentArea');
    if (!content) return;

    if (!document.getElementById('_lsxS')) {
        var st = document.createElement('style');
        st.id = '_lsxS';
        st.textContent = `
            .lsx-wrap { display: flex; height: calc(100vh - 60px); overflow: hidden; }
            .lsx-sb { width: 290px; min-width: 290px; background: #fff; border-right: 1px solid var(--gray-200); overflow-y: auto; display: flex; flex-direction: column; }
            .lsx-main { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow-y: auto; padding: 16px; }
            .lsx-main > * { flex-shrink: 0; }
            .lsx-sb-title { font-size: 13px; font-weight: 800; padding: 16px; border-bottom: 1px solid var(--gray-200); text-align: center; color: #0d9488; letter-spacing: 0.5px; }
            .lsx-sb-tree { flex: 1; overflow-y: auto; }
            .lsx-sb-total { background: linear-gradient(135deg, #0d9488, #14b8a6); color: #fff; padding: 12px 16px; font-size: 13px; font-weight: 800; display: flex; justify-content: space-between; cursor: pointer; transition: opacity 0.15s; }
            .lsx-sb-total:hover { opacity: 0.9; }
            .lsx-sb-year { padding: 8px 16px; font-weight: 800; font-size: 12px; color: var(--navy); cursor: pointer; display: flex; justify-content: space-between; background: #f8fafc; border-bottom: 1px solid var(--gray-200); }
            .lsx-sb-dept { padding: 6px 16px 6px 28px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; justify-content: space-between; border-bottom: 1px solid #f0f0f0; color: #0d9488; }
            .lsx-sb-dept:hover { background: #f0fdfa; }
            .lsx-sb-dept.active { background: #ccfbf1; font-weight: 800; }
            .lsx-sb-worker { padding: 5px 16px 5px 42px; font-size: 10px; font-weight: 600; cursor: pointer; display: flex; justify-content: space-between; border-bottom: 1px solid #fafafa; color: #64748b; }
            .lsx-sb-worker:hover { background: #f8fafc; }
            .lsx-sb-worker.active { background: #e2e8f0; color: #0f172a; font-weight: 800; }
            .lsx-sb-month { padding: 4px 16px 4px 56px; font-size: 9.5px; font-weight: 600; cursor: pointer; display: flex; justify-content: space-between; border-bottom: 1px solid #fcfcfc; color: #475569; }
            .lsx-sb-month:hover { background: #f0fdfa; }
            .lsx-sb-month.active { background: #ccfbf1; color: #0d9488; font-weight: 800; }
            .lsx-ib { width: 26px; height: 26px; border-radius: 6px; border: 1.5px solid #e2e8f0; background: #fff; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; transition: all 0.15s; margin: 0 1px; }
            .lsx-ib:hover { transform: scale(1.15); box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
            .lsx-ib.on-sal { background: #fef3c7; border-color: #f59e0b; }
            .lsx-ib.on-approved { background: #ccfbf1; border-color: #14b8a6; }
            .lsx-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
            .lsx-badge.cut { background: #ffedd5; color: #ea580c; border: 1px solid #fed7aa; }
            .lsx-badge.press { background: #f3e8ff; color: #7e22ce; border: 1px solid #e9d5ff; }
            .lsx-badge.sew { background: #ccfbf1; color: #0f766e; border: 1px solid #99f6e4; }
            .lsx-edit-input { width: 80px; padding: 2px 4px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px; text-align: right; outline: none; }
            .lsx-edit-input:focus { border-color: #14b8a6; box-shadow: 0 0 0 2px rgba(20,184,166,0.2); }
            .lsx-cell-editable { cursor: pointer; text-decoration: underline dashed #94a3b8; transition: background 0.15s; }
            .lsx-cell-editable:hover { background: #f8fafc; }
            .lsx-card-stat { flex: 1; min-width: 120px; border-radius: 12px; padding: 14px 20px; color: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.06); }
            @media(max-width: 768px) { .lsx-sb { display: none; } }
        `;
        document.head.appendChild(st);
    }

    content.innerHTML = `
        <div class="lsx-wrap">
            <div class="lsx-sb" id="lsxSb">
                <div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">⏳ Đang tải...</div>
            </div>
            <div class="lsx-main">
                <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
                    <div id="lsxInfo" style="font-size:12px"></div>
                    <div id="lsxStats" style="display:flex;gap:12px;flex:1;justify-content:center"></div>
                    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                        <select id="lsxYearFilter" style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;outline:none" onchange="_lsxChangeYear(this.value)">
                            <option value="">Năm: Tất cả</option>
                        </select>
                        <select id="lsxMonthFilter" style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;outline:none" onchange="_lsxChangeMonth(this.value)">
                            <option value="">Tháng: Tất cả</option>
                            <option value="1">Tháng 01</option>
                            <option value="2">Tháng 02</option>
                            <option value="3">Tháng 03</option>
                            <option value="4">Tháng 04</option>
                            <option value="5">Tháng 05</option>
                            <option value="6">Tháng 06</option>
                            <option value="7">Tháng 07</option>
                            <option value="8">Tháng 08</option>
                            <option value="9">Tháng 09</option>
                            <option value="10">Tháng 10</option>
                            <option value="11">Tháng 11</option>
                            <option value="12">Tháng 12</option>
                        </select>
                        <select id="lsxStatusFilter" style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;outline:none" onchange="_lsxChangeStatus(this.value)">
                            <option value="">Status: Tất cả</option>
                            <option value="pending">Chưa duyệt</option>
                            <option value="approved">Đã duyệt</option>
                        </select>
                        <input id="lsxSearch" placeholder="🔍 Tìm SP, mã đơn..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:200px;outline:none">
                    </div>
                </div>
                <div class="card">
                    <div class="card-body" style="overflow-x:auto;padding:8px">
                        <table class="table" style="font-size:11px;white-space:nowrap" id="lsxTable">
                            <thead>
                                <tr style="background:var(--gray-800)">
                                    <th style="width:50px">STT</th>
                                    <th>Ngày Làm</th>
                                    <th>Bộ Phận</th>
                                    <th>Nhân Viên</th>
                                    <th>Mã Đơn</th>
                                    <th style="text-align:center">SL Đơn</th>
                                    <th style="text-align:center">SL Cắt</th>
                                    <th>Tên Sản Phẩm</th>
                                    <th style="text-align:right">Đơn Giá (đ)</th>
                                    <th style="text-align:right">Thành Tiền (đ)</th>
                                    <th style="text-align:center">
                                        Kiểm Tra
                                        <br>
                                        <button id="lsxBtnApproveAll" class="btn btn-xs" onclick="_lsxApproveAllVisible()" style="padding:2px 6px;font-size:9px;margin-top:2px;background:#0d9488;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:800;display:none;">Duyệt hết</button>
                                    </th>
                                    <th>Lịch Sử Cập Nhật</th>
                                    <th style="text-align:right;font-weight:bold;color:#0d9488">Cộng dồn (đ)</th>
                                </tr>
                            </thead>
                            <tbody id="lsxTb">
                                <tr><td colspan="13" style="text-align:center;padding:40px">⏳ Đang tải bản ghi...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    var _t;
    document.getElementById('lsxSearch').addEventListener('input', function() {
        clearTimeout(_t);
        _t = setTimeout(function() {
            _lsx.search = document.getElementById('lsxSearch').value || '';
            _lsxRenderTable();
        }, 300);
    });

    _lsxLoadAll();
}

async function _lsxLoadAll() {
    try {
        var res = await apiCall('/api/production-salary/tree');
        _lsx.tree = res.tree;
        _lsx.is_manager = res.is_manager || false;
        
        // Pre-open the latest year and its departments by default on first load
        if (Object.keys(_lsxOpen).length === 0 && _lsx.tree && _lsx.tree.length > 0) {
            var latestYear = _lsx.tree[0];
            _lsxOpen['y_' + latestYear.year] = true;
            if (latestYear.depts) {
                latestYear.depts.forEach(function(dp) {
                    _lsxOpen[`d_${latestYear.year}_${dp.dept}`] = true;
                });
            }
        }
        
        // Populate Year dropdown dynamically
        var yEl = document.getElementById('lsxYearFilter');
        if (yEl && _lsx.tree) {
            var selectedY = _lsx.filter.year || '';
            var h = '<option value="">Năm: Tất cả</option>';
            _lsx.tree.forEach(function(yr) {
                h += `<option value="${yr.year}">Năm ${yr.year}</option>`;
            });
            yEl.innerHTML = h;
            yEl.value = selectedY;
        }

        // Render left sidebar tree
        _lsxRenderSb();
        
        // Render stats boxes
        _lsxRenderStats(res.stats);
        
        await _lsxLoadRecs();
    } catch(e) {
        console.error('[LSX]', e);
        showToast('Không thể tải cây dữ liệu', 'error');
    }
}

function _lsxRenderStats(stats) {
    var sc = document.getElementById('lsxStats');
    if (!sc) return;
    var s = stats || { total: 0, approved: 0, pending: 0, count: 0 };
    sc.innerHTML = `
        <div class="lsx-card-stat" style="background:linear-gradient(135deg,#1e293b,#0f172a)">
            <div style="font-size:9px;font-weight:700;opacity:.8;letter-spacing:1px;margin-bottom:2px">📦 TỔNG LƯƠNG</div>
            <div style="font-size:15px;font-weight:900">${_lsxFN(s.total)} đ</div>
            <div style="font-size:9px;opacity:.7;margin-top:2px">${s.count} đơn</div>
        </div>
        <div class="lsx-card-stat" style="background:linear-gradient(135deg,#10b981,#059669)">
            <div style="font-size:9px;font-weight:700;opacity:.8;letter-spacing:1px;margin-bottom:2px">✅ ĐÃ DUYỆT</div>
            <div style="font-size:15px;font-weight:900">${_lsxFN(s.approved)} đ</div>
        </div>
        <div class="lsx-card-stat" style="background:linear-gradient(135deg,#f59e0b,#d97706)">
            <div style="font-size:9px;font-weight:700;opacity:.8;letter-spacing:1px;margin-bottom:2px">⏳ CHƯA DUYỆT</div>
            <div style="font-size:15px;font-weight:900">${_lsxFN(s.pending)} đ</div>
        </div>
    `;
}

function _lsxRenderSb() {
    var sb = document.getElementById('lsxSb');
    if (!sb || !_lsx.tree) return;
    var t = _lsx.tree, f = _lsx.filter;
    
    var h = '<div class="lsx-sb-title">──── 💰 Lương Sản Xuất ────</div>';
    h += `<div class="lsx-sb-total" onclick="_lsxFilter()"><span>📦 Tất cả đơn</span><span>${_lsxFN(t.reduce((s, y) => s + y.total_salary, 0))}đ</span></div>`;
    h += '<div class="lsx-sb-tree">';

    t.forEach(function(yr) {
        var yo = !!_lsxOpen['y_' + yr.year];
        h += `<div class="lsx-sb-year" onclick="_lsxTgl('y_${yr.year}')">`
            + `<span>${yo ? '▼' : '▶'} 📆 Năm ${yr.year}</span>`
            + `<span style="background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;padding:1px 7px;border-radius:10px;font-size:9px">${_lsxFN(yr.total_salary)}</span>`
            + `</div>`;
            
        if (yo && yr.depts) {
            yr.depts.forEach(function(dp) {
                var dk = `d_${yr.year}_${dp.dept}`;
                var do2 = !!_lsxOpen[dk];
                var dpActive = f.year == yr.year && f.dept == dp.dept && !f.worker_id && !f.contractor_id;
                
                var dName = dp.dept === 'cutting' ? '✂️ Cắt' : (dp.dept === 'pressing' ? '🔥 Ép' : '🧵 May');
                
                h += `<div class="lsx-sb-dept${dpActive ? ' active' : ''}" onclick="event.stopPropagation(); _lsxTgl('${dk}'); _lsxFilter(${yr.year}, '${dp.dept}')">`
                    + `<span>${do2 ? '▼' : '▶'} ${dName}</span>`
                    + `<span>${_lsxFN(dp.total_salary)}</span>`
                    + `</div>`;
                    
                if (do2 && dp.workers) {
                    dp.workers.forEach(function(wk) {
                        var wkKey = `w_${yr.year}_${dp.dept}_${wk.id}_${wk.is_contractor}`;
                        var wActive = f.year == yr.year && f.dept == dp.dept && (wk.is_contractor ? f.contractor_id == wk.id : f.worker_id == wk.id);
                        var wo = !!_lsxOpen[wkKey];
                        
                        var wPrefix = wk.is_contractor ? '🏭 ' : '👤 ';
                        
                        h += `<div class="lsx-sb-worker${wActive ? ' active' : ''}" onclick="event.stopPropagation(); _lsxTgl('${wkKey}'); _lsxFilter(${yr.year}, '${dp.dept}', ${wk.is_contractor ? null : wk.id}, ${wk.is_contractor ? wk.id : null})">`
                            + `<span>${wo ? '▼' : '▶'} ${wPrefix}${wk.name}</span>`
                            + `<span>${_lsxFN(wk.total_salary)}</span>`
                            + `</div>`;
                            
                        if (wo && wk.months) {
                            wk.months.forEach(function(mo) {
                                var mActive = f.year == yr.year && f.month == mo.month && f.dept == dp.dept && (wk.is_contractor ? f.contractor_id == wk.id : f.worker_id == wk.id);
                                h += `<div class="lsx-sb-month${mActive ? ' active' : ''}" onclick="event.stopPropagation(); _lsxFilter(${yr.year}, '${dp.dept}', ${wk.is_contractor ? null : wk.id}, ${wk.is_contractor ? wk.id : null}, ${mo.month})">`
                                    + `<span>🗓️ Tháng ${String(mo.month).padStart(2, '0')}</span>`
                                    + `<span>${_lsxFN(mo.total_salary)}</span>`
                                    + `</div>`;
                            });
                        }
                    });
                }
            });
        }
    });
    h += '</div>';
    sb.innerHTML = h;
}

function _lsxTgl(k) {
    _lsxOpen[k] = !_lsxOpen[k];
    _lsxRenderSb();
}

function _lsxFilter(yr, dept, workerId, contractorId, month) {
    _lsx.filter.year = yr || null;
    _lsx.filter.dept = dept || null;
    _lsx.filter.worker_id = workerId || null;
    _lsx.filter.contractor_id = contractorId || null;
    _lsx.filter.month = month || null;
    
    _lsxRenderSb();
    _lsxLoadRecs();
}

function _lsxChangeStatus(st) {
    _lsx.filter.status = st || '';
    _lsxLoadRecs();
}

async function _lsxLoadRecs() {
    var f = _lsx.filter;
    
    // Sync dropdown values
    var yEl = document.getElementById('lsxYearFilter');
    if (yEl) yEl.value = f.year || '';
    var mEl = document.getElementById('lsxMonthFilter');
    if (mEl) mEl.value = f.month || '';
    var sEl = document.getElementById('lsxStatusFilter');
    if (sEl) sEl.value = f.status || '';

    var qs = '?_=1';
    if (f.year) qs += '&year=' + f.year;
    if (f.month) qs += '&month=' + f.month;
    if (f.dept) qs += '&dept=' + f.dept;
    if (f.worker_id) qs += '&worker_id=' + f.worker_id;
    if (f.contractor_id) qs += '&contractor_id=' + f.contractor_id;
    if (f.status) qs += '&status=' + f.status;

    try {
        var res = await apiCall('/api/production-salary/records' + qs);
        _lsx.records = res.records || [];
        _lsxRenderTable();
    } catch(e) {
        console.error('[LSX]', e);
        showToast('Không thể tải danh sách bản ghi', 'error');
    }
}

function _lsxFD(d) {
    if (!d) return '—';
    try {
        var p = d.split('T')[0].split('-');
        return p[2] + '/' + p[1] + '/' + p[0];
    } catch(e) {
        return d;
    }
}

function _lsxFN(n) {
    if (!n && n !== 0) return '—';
    return Number(n).toLocaleString('vi-VN');
}

function _lsxRenderTable() {
    var all = _lsx.records.slice();
    if (_lsx.search) {
        var q = _lsx.search.toLowerCase();
        all = all.filter(function(r) {
            return (r.product_name || '').toLowerCase().indexOf(q) >= 0 
                || (r.order_code || '').toLowerCase().indexOf(q) >= 0
                || (r.worker_name || '').toLowerCase().indexOf(q) >= 0;
        });
    }

    var tb = document.getElementById('lsxTb');
    if (!tb) return;
    
    if (!all.length) {
        tb.innerHTML = '<tr><td colspan="13"><div class="empty-state"><div class="icon">💰</div><h3>Không có bản ghi lương nào</h3></div></td></tr>';
        _lsxRenderInfo(0);
        return;
    }

    // Compute cumulative sum from bottom to top (chronological order)
    var cumulative = [];
    var runningSum = 0;
    for (var idx = all.length - 1; idx >= 0; idx--) {
        runningSum += Number(all[idx].salary) || 0;
        cumulative[idx] = runningSum;
    }

    tb.innerHTML = all.map(function(r, i) {
        var deptBadge = '';
        if (r.dept === 'cutting') deptBadge = '<span class="lsx-badge cut">Cắt</span>';
        else if (r.dept === 'pressing') deptBadge = '<span class="lsx-badge press">Ép</span>';
        else if (r.dept === 'sewing') deptBadge = '<span class="lsx-badge sew">May</span>';

        var wPrefix = r.contractor_id ? '🏭 ' : '👤 ';
        var workerName = r.contractor_id ? (r.contractor_name || 'Gia công') : (r.worker_name || '—');

        var isAppr = !!r.is_approved;
        var checkIcon = isAppr ? '💰' : '⬜';
        var checkCls = isAppr ? 'lsx-ib on-approved' : 'lsx-ib';
        var checkAction = _lsx.is_manager ? `onclick="_lsxToggleAppr(${r.id}, '${r.dept}')"` : 'disabled';

        var lastUpd = '—';
        if (r.last_update_at) {
            var timeStr = '';
            try {
                var dObj = new Date(r.last_update_at);
                timeStr = String(dObj.getHours()).padStart(2, '0') + ':' + String(dObj.getMinutes()).padStart(2, '0') + ' ' + String(dObj.getDate()).padStart(2,'0') + '/' + String(dObj.getMonth()+1).padStart(2,'0');
            } catch(e) {}
            lastUpd = `<span style="font-size:10px">${timeStr}</span>`;
            if (r.last_update_by) {
                lastUpd += `<br><span style="color:#0d9488;font-size:9.5px;font-weight:700">${r.last_update_by}</span>`;
            }
        }

        var priceCell = '';
        var salCell = '';

        if (_lsx.is_manager) {
            priceCell = `<td style="text-align:right;font-weight:700" class="lsx-cell-editable" onclick="_lsxStartEdit(${r.id}, '${r.dept}', 'unit_price', ${r.unit_price}, this)">${_lsxFN(r.unit_price)}</td>`;
            salCell = `<td style="text-align:right;font-weight:800;color:#f59e0b" class="lsx-cell-editable" onclick="_lsxStartEdit(${r.id}, '${r.dept}', 'salary', ${r.salary}, this)">${_lsxFN(r.salary)}</td>`;
        } else {
            priceCell = `<td style="text-align:right;font-weight:600">${_lsxFN(r.unit_price)}</td>`;
            salCell = `<td style="text-align:right;font-weight:700;color:#f59e0b">${_lsxFN(r.salary)}</td>`;
        }

        var orderQty = r.order_quantity !== undefined ? r.order_quantity : (r.quantity || 0);

        var codeCell = r.order_code || '—';
        if (r.cut_warning && r.cut_warning.indexOf('Cắt bù') >= 0) {
            codeCell = `<span class="lsx-badge cut" style="margin-right: 6px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 9px; padding: 1px 4px; border-radius: 3px; text-transform: none;">Cắt bù</span>` + codeCell;
        }

        var displayName = r.product_name || '—';
        var match = displayName.match(/^(.*?\s*[-—]\s*Phiếu\s+\d+)/i);
        if (match) {
            displayName = match[1];
        }

        var isPhoi = false;
        if (r.dept === 'cutting' && r.product_name) {
            var match = r.product_name.match(/— P(\d+)/);
            if (match && parseInt(match[1]) > 1) isPhoi = true;
        }
        var qtyColor = isPhoi ? '#94a3b8' : '#64748b';
        var cutColor = isPhoi ? '#2dd4bf' : '#0d9488';

        return `<tr>`
            + `<td style="text-align:center;font-weight:700;color:#94a3b8">${i + 1}</td>`
            + `<td style="font-size:10px">${_lsxFD(r.work_date)}</td>`
            + `<td>${deptBadge}</td>`
            + `<td style="font-weight:600;color:#0f172a">${wPrefix}${workerName}</td>`
            + `<td style="font-weight:700;color:#1e3a8a">${codeCell}</td>`
            + `<td style="text-align:center;font-weight:700;color:${qtyColor}">${_lsxFormatOrderQty(orderQty, r.product_name, r.cutting_category, r.dept)}</td>`
            + `<td style="text-align:center;font-weight:700;color:${cutColor}">${_lsxFormatOrderQty(r.quantity, r.product_name, r.cutting_category, r.dept)}</td>`
            + `<td style="font-weight:600;color:#334155;max-width:180px;overflow:hidden;text-overflow:ellipsis" title="${r.product_name || ''}">${displayName}</td>`
            + priceCell
            + salCell
            + `<td style="text-align:center"><button class="${checkCls}" ${checkAction} title="Duyệt lương">${checkIcon}</button></td>`
            + `<td style="font-size:9.5px;color:#64748b">${lastUpd}</td>`
            + `<td style="text-align:right;font-weight:800;color:#0f766e;background:#f0fdfa">${_lsxFN(cumulative[i])}</td>`
            + `</tr>`;
    }).join('');

    // Show/hide bulk approve button
    var showApproveAll = _lsx.is_manager && all.some(function(r) { return !r.is_approved; });
    var btnApproveAll = document.getElementById('lsxBtnApproveAll');
    if (btnApproveAll) {
        btnApproveAll.style.display = showApproveAll ? 'inline-block' : 'none';
    }

    _lsxRenderInfo(all.length);
}

function _lsxRenderInfo(count) {
    var el = document.getElementById('lsxInfo');
    if (!el) return;
    
    var parts = ['💰 Lương Sản Xuất'];
    var f = _lsx.filter;
    if (f.year) parts.push(`📆 ${f.year}`);
    if (f.month) parts.push(`🗓️ T${f.month}`);
    if (f.dept) {
        var dName = f.dept === 'cutting' ? 'Cắt' : (f.dept === 'pressing' ? 'Ép' : 'May');
        parts.push(`Bộ phận: ${dName}`);
    }
    
    el.innerHTML = `<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700">`
        + `${parts.join(' <span style="opacity:0.5;margin:0 6px">•</span> ')} — <span style="color:#99f6e4;font-weight:900">${count}</span> bản ghi`
        + `</div>`;
}

async function _lsxToggleAppr(id, dept) {
    try {
        var res = await apiCall(`/api/production-salary/toggle/${dept}/${id}`, 'POST');
        showToast('Cập nhật trạng thái duyệt thành công');
        // Reload all to refresh aggregates & tree sums
        await _lsxLoadAll();
    } catch(e) {
        console.error(e);
        showToast(e.message || 'Lỗi khi cập nhật trạng thái', 'error');
    }
}

function _lsxStartEdit(id, dept, field, currentVal, cell) {
    // Check if there is already an active input
    if (cell.querySelector('input')) return;

    var input = document.createElement('input');
    input.type = 'number';
    input.className = 'lsx-edit-input';
    input.value = currentVal;
    
    cell.innerHTML = '';
    cell.appendChild(input);
    input.focus();
    input.select();

    var finished = false;
    async function commitEdit() {
        if (finished) return;
        finished = true;
        
        var newVal = Number(input.value) || 0;
        if (newVal === currentVal) {
            cell.innerHTML = _lsxFN(currentVal);
            return;
        }

        try {
            var body = {};
            body[field] = newVal;
            
            var res = await apiCall(`/api/production-salary/record/${dept}/${id}`, 'PUT', body);
            showToast('Đã lưu thay đổi');
            await _lsxLoadAll();
        } catch(e) {
            console.error(e);
            showToast(e.message || 'Lỗi khi lưu dữ liệu', 'error');
            cell.innerHTML = _lsxFN(currentVal);
        }
    }

    input.onblur = commitEdit;
    input.onkeydown = function(e) {
        if (e.key === 'Enter') {
            input.blur();
        } else if (e.key === 'Escape') {
            finished = true;
            cell.innerHTML = _lsxFN(currentVal);
        }
    };
}

function _lsxChangeYear(val) {
    _lsx.filter.year = val ? Number(val) : null;
    _lsxRenderSb();
    _lsxLoadRecs();
}

function _lsxChangeMonth(val) {
    _lsx.filter.month = val ? Number(val) : null;
    _lsxRenderSb();
    _lsxLoadRecs();
}

async function _lsxApproveAllVisible() {
    var unapproved = _lsx.records.slice();
    if (_lsx.search) {
        var q = _lsx.search.toLowerCase();
        unapproved = unapproved.filter(function(r) {
            return (r.product_name || '').toLowerCase().indexOf(q) >= 0 
                || (r.order_code || '').toLowerCase().indexOf(q) >= 0
                || (r.worker_name || '').toLowerCase().indexOf(q) >= 0;
        });
    }
    unapproved = unapproved.filter(function(r) { return !r.is_approved; });

    if (!unapproved.length) {
        showToast('Không có bản ghi nào cần duyệt', 'info');
        return;
    }

    if (!confirm('Bạn có chắc chắn muốn duyệt tất cả ' + unapproved.length + ' bản ghi đang hiển thị?')) {
        return;
    }

    try {
        var payload = {
            records: unapproved.map(function(r) {
                return { id: r.id, dept: r.dept };
            })
        };
        await apiCall('/api/production-salary/approve-bulk', 'POST', payload);
        showToast('Đã duyệt thành công ' + unapproved.length + ' bản ghi');
        await _lsxLoadAll();
    } catch(e) {
        console.error(e);
        showToast(e.message || 'Lỗi khi duyệt hàng loạt', 'error');
    }
}

function _lsxFormatOrderQty(qty, prodName, category, dept) {
    if (!qty && qty !== 0) return '0';
    if (dept === 'cutting') {
        var isPhoi = false;
        if (prodName) {
            var match = prodName.match(/— P(\d+)/);
            if (match && parseInt(match[1]) > 1) isPhoi = true;
        }
        if (isPhoi) {
            return qty.toLocaleString('vi-VN') + ' Phối';
        } else {
            var catName = category || 'Áo';
            return qty.toLocaleString('vi-VN') + ' ' + catName;
        }
    }
    return qty.toLocaleString('vi-VN');
}
