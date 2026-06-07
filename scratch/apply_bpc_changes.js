const fs = require('fs');

const filePath = 'public/js/pages/bophancathv.js';
let content = fs.readFileSync(filePath, 'utf8');

// Helper to find function start and end indices/positions in string
function findFunctionRange(str, signature) {
    let startIdx = str.indexOf(signature);
    if (startIdx === -1) {
        throw new Error(`Signature not found: ${signature}`);
    }
    // Find open brace
    let braceIdx = str.indexOf('{', startIdx);
    if (braceIdx === -1) {
        throw new Error(`Open brace not found after signature: ${signature}`);
    }
    
    let depth = 1;
    let endIdx = -1;
    for (let i = braceIdx + 1; i < str.length; i++) {
        if (str[i] === '{') depth++;
        else if (str[i] === '}') depth--;
        
        if (depth === 0) {
            endIdx = i + 1;
            break;
        }
    }
    if (endIdx === -1) {
        throw new Error(`Matching closing brace not found for signature: ${signature}`);
    }
    return { start: startIdx, end: endIdx };
}

// 1. Replace _bpcRenderRows (and extract helpers)
let rangeRenderRows = findFunctionRange(content, 'function _bpcRenderRows(paged)');
let replacementRenderRows = `function _bpcMapRecordRow(r, i) {
    // === CUT/DONE button visibility logic ===
    // Not cutting yet: show ✂️, hide ✅
    // Cutting (not done): hide ✂️, show ✅
    // Cut done: hide ✂️, show ✅ (green)
    var showCutBtn = !r.is_cutting;
    var showDoneBtn = r.is_cutting;
    var cutIcon = r.is_cutting ? '✂️' : '⬜', cutCls = r.is_cutting ? ' on-cut' : '';
    var doneIcon = r.is_cut_done ? '✅' : '🏁', doneCls = r.is_cut_done ? ' on-done' : '';
    var washIcon = r.wash_reported ? '🫧' : '⬜', washCls = r.wash_reported ? ' on-wash' : '';
    var errIcon = r.error_reported ? '⚠️' : '⬜', errCls = r.error_reported ? ' on-err' : '';
    var washAct = r.wash_reported ? 'undo_wash' : 'report_wash';
    var ratioColor = '#3b82f6';
    var tr = Number(r.target_cut_ratio) || 0;
    if (tr > 0 && r.cut_ratio) {
        ratioColor = Number(r.cut_ratio) >= tr ? '#059669' : '#dc2626';
    }
    var warnHtml = '—';
    if (r.cut_warning) {
        warnHtml = '<span style="color:#dc2626;font-weight:700">' + r.cut_warning + '</span>';
        var isComp = r.cut_warning.indexOf('Cắt bù') >= 0;
        if (isComp && !r.is_cutting && !r.is_cut_done) {
            warnHtml += ' <button class="bpc-icon-btn" onclick="_bpcToggleAction(' + r.id + ',\'cancel_compensation\')" title="Hủy đơn cắt bù" style="background:#fee2e2;border-color:#fca5a5;color:#dc2626;padding:2px 8px;font-size:10px;margin-left:8px;font-weight:bold;height:auto;line-height:1;display:inline-block;vertical-align:middle;width:auto">❌ Hủy Cắt Bù</button>';
        }
    }
    var updateStr = '';
    if (r.last_update_at) { updateStr = _bpcFmtDate(r.last_update_at); if (r.last_update_by) updateStr += '<br><span style="color:#dc2626;font-size:9px">'+r.last_update_by+'</span>'; }
    var ccBadge = '';
    var sharedBadge = '';
    if (r.multi_cut_group_id) {
        var label = 'CẮT CHUNG';
        if (r.cut_shared) {
            var m = r.cut_shared.match(/Cắt chung (\d+) đơn/i);
            if (m) label = 'CẮT CHUNG ' + m[1] + ' ĐƠN';
        }
        sharedBadge = '<span style="background:#ea580c;color:#fff;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:800;margin-right:4px;display:inline-block;vertical-align:middle;text-transform:uppercase">' + label + '</span>';
    }
    var compBadge = r.cut_warning ? '<span style="background:#f97316;color:#fff;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:800;margin-right:4px;display:inline-block;vertical-align:middle;text-transform:uppercase">Cắt Bù</span>' : '';
    var priority = (r.shipping_priority || 'CHUẨN').toUpperCase();
    var priBadge = '';
    if (priority === 'GẤP') {
        priBadge = '<span style="margin-right: 6px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Gấp</span>';
    } else if (priority === 'GỬI') {
        priBadge = '<span style="margin-right: 6px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Gửi</span>';
    } else {
        priBadge = '<span style="margin-right: 6px; background: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Chuẩn</span>';
    }
    var cutBtnHtml = '';
    if (r.is_cut_done) {
        cutBtnHtml = '<button class="bpc-icon-btn on-cut" disabled title="Đã hoàn thành cắt" style="opacity:0.8;cursor:default">✅</button>';
    } else if (showCutBtn) {
        cutBtnHtml = '<button class="bpc-icon-btn'+cutCls+'" onclick="_bpcOpenCutModal('+r.id+')" title="Bắt đầu cắt">'+cutIcon+'</button>';
    } else {
        cutBtnHtml = '<button class="bpc-icon-btn on-cut" disabled title="Đang cắt" style="opacity:0.4;cursor:default">✂️</button>';
    }
    var isGiamDoc = window._currentUser && window._currentUser.role === 'giam_doc';
    var doneBtnHtml = showDoneBtn
        ? (r.is_cut_done
            ? (isGiamDoc
                ? '<button class="bpc-icon-btn on-done" onclick="_bpcToggleAction('+r.id+',\'undo_cut_done\')" title="Hoàn tác cắt xong (chỉ dành cho Giám đốc)">'+doneIcon+'</button>'
                : '<button class="bpc-icon-btn on-done" disabled title="Đã hoàn thành (chỉ Giám đốc mới được hoàn tác)" style="opacity:0.6;cursor:default">'+doneIcon+'</button>')
            : '<button class="bpc-icon-btn" onclick="_bpcOpenDoneModal('+r.id+')" title="Cắt xong" style="background:#eff6ff;border-color:#3b82f6">'+doneIcon+'</button>')
        : '<span style="width:26px;display:inline-block"></span>';
    var sharedCol = '—';
    if (r.cut_shared) {
        var firstLine = r.cut_shared.split('\n')[0].replace(':', '');
        sharedCol = '<span title="' + r.cut_shared.replace(/"/g, '&quot;') + '" style="cursor:help;border-bottom:1px dashed #ea580c;font-weight:700;color:#ea580c">' + firstLine + '</span>';
    }
    
    var isPhoi = false;
    if (r.product_name) {
        var match = r.product_name.match(/— P(\d+)/);
        if (match && parseInt(match[1]) > 1) isPhoi = true;
    }
    var qtyColor = isPhoi ? '#60a5fa' : '#0369a1';
    var cutColor = isPhoi ? '#c084fc' : '#7c3aed';

    return '<tr>'
        +'<td style="text-align:center;font-weight:700;color:#94a3b8">'+(i+1)+'</td>'
        +'<td style="text-align:center">'+cutBtnHtml+'</td>'
        +'<td style="text-align:center">'+doneBtnHtml+'</td>'
        +'<td style="text-align:center">'
            + (r.wash_reported
                ? '<button class="bpc-icon-btn ' + washCls + '" disabled title="Đã báo giặt vải" style="cursor:default;opacity:0.8;transform:none;box-shadow:none">' + washIcon + '</button>'
                : '<button class="bpc-icon-btn' + washCls + '" onclick="_bpcOpenWashModal(' + r.id + ')" title="Giặt vải">' + washIcon + '</button>')
        +'</td>'
        +'<td style="text-align:center">'
            + (r.error_reported
                ? '<button class="bpc-icon-btn ' + errCls + '" disabled title="Đã báo lỗi" style="cursor:default;opacity:0.8;transform:none;box-shadow:none">' + errIcon + '</button>'
                : '<button class="bpc-icon-btn' + errCls + '" onclick="_bpcReportError(' + r.id + ')" title="Báo lỗi">' + errIcon + '</button>')
        +'</td>'
        +'<td style="font-size:10px">'+((r.is_cutting || r.is_cut_done) ? _bpcFmtDate(r.cut_date) : '—')+'</td>'
        +'<td style="font-size:10px;color:#059669;font-weight:600">'+((r.is_cutting || r.is_cut_done) ? (r.cutter_name||'—') : '—')+'</td>'
        +'<td style="font-weight:600;color:#1e293b;font-size:11px;cursor:pointer" onclick="_bpcOpenDetail('+r.id+')" title="Xem chi tiết">' + ccBadge + sharedBadge + compBadge + priBadge + '<span style="border-bottom:1px dashed #94a3b8">' + (r.product_name||r.order_code||'—') + '</span></td>'
        +'<td style="font-size:10px;color:#475569">'+(r.material_name||'—')+'</td>'
        +'<td style="font-size:10px">'+(r.fabric_color||'—')+'</td>'
        +'<td style="text-align:center;font-weight:700;color:'+qtyColor+'">'+_bpcFormatOrderQty(r.order_quantity, r.product_name, r.cutting_category)+'</td>'
        +'<td style="text-align:center;font-weight:700;color:'+cutColor+'">'+_bpcFormatOrderQty(r.cut_quantity, r.product_name, r.cutting_category)+'</td>'
        +'<td style="text-align:center;font-weight:700;color:#dc2626">'+_bpcFmtKg(r.kg_cut)+'</td>'
        +'<td style="text-align:center;font-weight:800;color:'+ratioColor+'">'+(r.cut_ratio ? r.cut_ratio + ' sp/' + (r.fabric_unit || 'kg') : '—')+'</td>'
        +'<td style="font-size:9px;color:#6b7280;max-width:80px;overflow:hidden;text-overflow:ellipsis">'+(r.ratio_reason||'—')+'</td>'
        +'<td style="text-align:center;font-weight:600">'+_bpcFmtKg(r.kg_start)+'</td>'
        +'<td style="text-align:center;font-weight:600">'+_bpcFmtKg(r.kg_end)+'</td>'
        +'<td>'+warnHtml+'</td>'
        +'<td style="font-size:10px;text-align:center">'+sharedCol+'</td>'
        +'<td style="font-size:9px;color:#6b7280">'+updateStr+'</td>'
        +'</tr>';
}

function _bpcBuildRecordsTableHtml(records) {
    if (!records.length) {
        return '<table class="table" style="font-size:11px;white-space:nowrap"><tbody><tr><td colspan="20"><div class="empty-state"><div class="icon">✂️</div><h3>Chưa có đơn cắt nào</h3></div></td></tr></tbody></table>';
    }
    var th = '<table class="table" style="font-size:11px;white-space:nowrap" id="bpcRecordsTable"><thead><tr style="background:var(--gray-800)">'
        +'<th>STT</th><th>✂️</th><th>✅</th><th>🫧</th><th>⚠️</th>'
        +'<th>Ngày Cắt</th><th>NV Cắt</th><th>Tên SP</th><th>Chất Liệu</th><th>Màu Vải</th>'
        +'<th>SL Đơn</th><th>SL Cắt</th><th>Kg Cắt</th><th>Tỉ Lệ</th><th>Lý Do Sai TL</th>'
        +'<th>Kg Đầu</th><th>Kg Cuối</th><th>Cảnh Báo</th><th>Cắt Chung</th><th>Cập Nhật</th>'
        +'</tr></thead><tbody>';
    th += records.map(function(r, i) {
        return _bpcMapRecordRow(r, i);
    }).join('');
    th += '</tbody></table>';
    return th;
}

function _bpcRenderRows(paged) {
    var tbody = document.getElementById('bpcTbody'); if (!tbody) return;
    if (!paged.length) { tbody.innerHTML = '<tr><td colspan="20"><div class="empty-state"><div class="icon">✂️</div><h3>Chưa có đơn cắt nào</h3><p>Chọn mục ở sidebar</p></div></td></tr>'; return; }
    tbody.innerHTML = paged.map(function(r, i) {
        return _bpcMapRecordRow(r, i + (_bpc.page - 1) * _bpc.pageSize);
    }).join('');
}`;

content = content.substring(0, rangeRenderRows.start) + replacementRenderRows + content.substring(rangeRenderRows.end);

// 2. Replace _bpcRenderUnassigned (and create unassigned table helper)
let rangeRenderUnassigned = findFunctionRange(content, 'function _bpcRenderUnassigned()');
let replacementRenderUnassigned = `function _bpcBuildUnassignedTableHtml(all) {
    var th = '<table class="table" style="font-size:11px;white-space:nowrap" id="bpcUnassignedTable"><thead><tr style="background:var(--gray-800)">'
        +'<th>STT</th><th>✂️</th><th>✅</th><th>🫧</th><th>⚠️</th>'
        +'<th>Ngày Cắt</th><th>NV Cắt</th><th>Tên SP</th><th>Chất Liệu</th><th>Màu Vải</th>'
        +'<th>SL Đơn</th><th>SL Cắt</th><th>Kg Cắt</th><th>Tỉ Lệ</th><th>Lý Do Sai TL</th>'
        +'<th>Kg Đầu</th><th>Kg Cuối</th><th>Cảnh Báo</th><th>Cắt Chung</th><th>Cập Nhật</th>'
        +'</tr></thead><tbody>';
    if (!all.length) {
        th += '<tr><td colspan="20"><div class="empty-state"><div class="icon">✅</div><h3>Không có đơn chờ cắt</h3></div></td></tr>';
    } else {
        var groupRowCount = {};
        all.forEach(function(r) { var k = r.id + '_' + (r.item_id || 0); groupRowCount[k] = (groupRowCount[k] || 0) + 1; });
        var lastGroupKey = null, stt = 0;
        all.forEach(function(r, i) {
            var groupKey = r.id + '_' + (r.item_id || 0);
            var isNew = groupKey !== lastGroupKey; if (isNew) { stt++; lastGroupKey = groupKey; }
            var bg = isNew ? '' : 'background:#f0f9ff;';
            var ready = r.fabric_arrived && r.has_pc_in;
            var priColor = r.shipping_priority === 'GẤP' ? 'background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;box-shadow:0 2px 8px rgba(220,38,38,0.35)' : r.shipping_priority === 'GỬI' ? 'background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;box-shadow:0 2px 8px rgba(245,158,11,0.35)' : 'background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;box-shadow:0 2px 8px rgba(79,70,229,0.4)';
            var compBadge = r.cut_warning ? '<span style="background:#ea580c;color:#fff;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:800;margin-right:4px;display:inline-block;vertical-align:middle;text-transform:uppercase">Cắt Bù</span>' : '';
            var priority = (r.shipping_priority || 'CHUẨN').toUpperCase();
            var priBadge = '';
            if (priority === 'GẤP') {
                priBadge = '<span style="margin-right: 6px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Gấp</span>';
            } else if (priority === 'GỬI') {
                priBadge = '<span style="margin-right: 6px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Gửi</span>';
            } else {
                priBadge = '<span style="margin-right: 6px; background: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Chuẩn</span>';
            }
            var spName = compBadge + priBadge + ((r.total_phoi > 1) ? (r.order_code + ' — Phiếu ' + r.item_index + ' — P' + r.phoi_in_item + (r.item_desc ? ' — ' + r.item_desc : '')) : (r.order_code + (r.item_desc ? ' — ' + r.item_desc : '')));
            if (r.cut_warning) {
                spName += '<div style="color:#ea580c;font-size:10px;margin-top:2px;font-weight:bold">⚠️ ' + r.cut_warning + '</div>';
            }
            var statusHtml = '<div style="display:inline-flex;gap:4px;margin-left:8px;vertical-align:middle">'
                + (r.fabric_arrived ? '<span style="background:#dcfce7;color:#059669;padding:1px 6px;border-radius:4px;font-size:8px;font-weight:700">✅ Vải</span>' : '<span style="background:#fee2e2;color:#dc2626;padding:1px 6px;border-radius:4px;font-size:8px;font-weight:700">❌ Vải</span>')
                + (r.has_pc_in ? '<span style="background:#dcfce7;color:#059669;padding:1px 6px;border-radius:4px;font-size:8px;font-weight:700">✅ PC In</span>' : '<span style="background:#fee2e2;color:#dc2626;padding:1px 6px;border-radius:4px;font-size:8px;font-weight:700">❌ PC In</span>')
                + '</div>';
            var claimTd = '';
            if (isNew) {
                var rs = groupRowCount[groupKey] || 1;
                var claimHtml;
                if (ready) {
                    if (r.cut_warning && r.cut_warning.indexOf('Cắt bù') >= 0) {
                        claimHtml = '<button class="bpc-claim-btn ready" onclick="_bpcClaimOrder('+r.id+','+(r.item_id||'null')+',\''+r.order_code+'\')" title="Nhận đơn cắt bù" style="background:linear-gradient(135deg,#f97316,#ea580c);border-color:#ea580c">✂️ NHẬN CẮT BÙ</button>';
                    } else {
                        claimHtml = '<button class="bpc-claim-btn ready" onclick="_bpcClaimOrder('+r.id+','+(r.item_id||'null')+',\''+r.order_code+'\')" title="Nhận đơn cắt">✂️ NHẬN ĐƠN</button>';
                    }
                } else {
                    var missing = [];
                    if (!r.fabric_arrived) missing.push('Vải');
                    if (!r.has_pc_in) missing.push('PC In');
                    claimHtml = '<button class="bpc-claim-btn disabled" disabled title="Thiếu: '+missing.join(', ')+'">🔒 Thiếu '+missing.join('+')+'</button>';
                }
                if (r.cut_warning && r.cut_warning.indexOf('Cắt bù') >= 0) {
                    if (r.cutting_record_id) {
                        var isManager = window._currentUser && ['giam_doc', 'quan_ly', 'truong_phong'].includes(window._currentUser.role);
                        var isOriginalCutter = window._currentUser && r.original_cutter_id && r.original_cutter_id === window._currentUser.id;
                        if (isManager || isOriginalCutter) {
                            claimHtml += '<div style="margin-top:6px"><button class="bpc-icon-btn" onclick="_bpcToggleAction(' + r.cutting_record_id + ',\'cancel_compensation\')" title="Hủy đơn cắt bù" style="background:#fee2e2;border-color:#fca5a5;color:#dc2626;padding:2px 8px;font-size:10px;font-weight:bold;height:auto;line-height:1.2;width:auto">❌ Hủy Cắt Bù</button></div>';
                        }
                    }
                }
                claimTd = '<td rowspan="'+rs+'" colspan="4" style="text-align:center;vertical-align:middle;border-left:2px solid #e2e8f0">'+claimHtml+'</td>';
            }
            var qtyStyle = (r.phoi_in_item === 1 || isNew) ? 'text-align:center;font-weight:700;color:#0369a1' : 'text-align:center;font-weight:600;color:#93c5fd';
            var qtyVal = _bpcFormatOrderQty(r.item_qty || r.total_quantity || '', spName, r.cutting_category_name);
            var finalSpName = spName + statusHtml;

            th += '<tr style="'+bg+'">'
                +'<td style="text-align:center;font-weight:700;color:#94a3b8">'+(isNew?stt:'')+'</td>'
                +claimTd
                +'<td style="font-size:10px">—</td>'
                +'<td style="font-size:10px;color:#059669;font-weight:600">—</td>'
                +'<td style="font-weight:600;color:#1e293b;font-size:11px">' + finalSpName + '</td>'
                +'<td style="font-size:10px;color:#475569">'+(r.material_name||'—')+'</td>'
                +'<td style="font-size:10px">'+(r.color_name||'—')+'</td>'
                +'<td style="'+qtyStyle+'">'+qtyVal+'</td>'
                +'<td style="text-align:center;font-weight:700;color:#7c3aed">—</td>'
                +'<td style="text-align:center;font-weight:700;color:#dc2626">—</td>'
                +'<td style="text-align:center;font-weight:800;color:#3b82f6">—</td>'
                +'<td style="font-size:9px;color:#6b7280">—</td>'
                +'<td style="text-align:center;font-weight:600">—</td>'
                +'<td style="text-align:center;font-weight:600">—</td>'
                +'<td>' + (r.cut_warning ? ('<span style="color:#dc2626;font-weight:700">' + r.cut_warning + '</span>') : '—') + '</td>'
                +'<td style="font-size:10px;text-align:center">—</td>'
                +'<td style="font-size:9px;color:#6b7280">—</td>'
                +'</tr>';
        });
    }
    th += '</tbody></table>';
    return th;
}

function _bpcRenderUnassigned() {
    var wrap = document.getElementById('bpcTableWrap'); if (!wrap) return;
    var all = _bpc.unassignedOrders.slice();
    if (_bpc.search) {
        var q = _bpc.search.toLowerCase();
        all = all.filter(function(r) { 
            return (r.order_code||'').toLowerCase().indexOf(q)>=0 
                || (r.customer_name||'').toLowerCase().indexOf(q)>=0 
                || (r.material_name||'').toLowerCase().indexOf(q)>=0
                || (r.item_desc||'').toLowerCase().indexOf(q)>=0; 
        });
    }

    var lastGroupKey = null, stt = 0;
    var seenItems = {};
    all.forEach(function(r) { var k = r.id + '_' + (r.item_id || 0); if (!seenItems[k]) seenItems[k] = r; });
    var itemList = Object.values(seenItems);
    var readyCnt = itemList.filter(function(r){ return r.fabric_arrived && r.has_pc_in; }).length;
    var pendCnt = itemList.length - readyCnt;

    var el = document.getElementById('bpcFilterInfo'); if (el) {
        el.innerHTML = '<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700">'
            +'🔴 Đơn Chưa Cắt <span style="opacity:0.5;margin:0 4px">—</span> <span style="font-weight:900">' + itemList.length + '</span> phiếu</div>';
    }
    var sc = document.getElementById('bpcStatCards'); if (sc) {
        sc.innerHTML = '<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #05966930"><div style="font-size:9px;font-weight:600;opacity:0.85;letter-spacing:1px;margin-bottom:2px">🟢 SẴN SÀNG</div><div style="font-size:15px;font-weight:900">' + readyCnt + '</div></div>'
            +'<div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #f59e0b30"><div style="font-size:9px;font-weight:600;opacity:0.85;letter-spacing:1px;margin-bottom:2px">🟡 THIẾU ĐK</div><div style="font-size:15px;font-weight:900">' + pendCnt + '</div></div>';
    }

    wrap.innerHTML = _bpcBuildUnassignedTableHtml(all);

    var top = document.getElementById('bpcPaginationTop'), bot = document.getElementById('bpcPaginationBottom');
    if (top) top.innerHTML = '<div style="text-align:center;font-size:11px;color:#64748b;padding:4px"><span style="font-weight:700">'+all.length+' phối chờ cắt</span></div>';
    if (bot) bot.innerHTML = '';
}`;

content = content.substring(0, rangeRenderUnassigned.start) + replacementRenderUnassigned + content.substring(rangeRenderUnassigned.end);

// 3. Replace _bpcLoadAll to support running search if search term is active
let rangeLoadAll = findFunctionRange(content, 'async function _bpcLoadAll()');
let replacementLoadAll = `async function _bpcLoadAll() {
    try {
        var res = await apiCall('/api/cutting/tree');
        _bpc.tree = res;
        if (res && res.yearTree) {
            res.yearTree.forEach(function(yr) {
                var yKey = 'y' + yr.year;
                if (_bpcOpen[yKey] === undefined) {
                    _bpcOpen[yKey] = true;
                }
            });
        }
        _bpcRenderSidebar();
        if (_bpc.search) {
            await _bpcDoSearch(_bpc.search);
        } else {
            if (_bpc.filter.view === 'unassigned') await _bpcLoadUnassigned();
            else await _bpcLoadRecords();
        }
    } catch(e) { console.error('[BPC]', e); }
}`;

content = content.substring(0, rangeLoadAll.start) + replacementLoadAll + content.substring(rangeLoadAll.end);

// 4. Update the input event listener for bpcSearch to call _bpcDoSearch
let searchEventStr = "var _st; document.getElementById('bpcSearch').addEventListener('input', function() {";
let startSearchEvent = content.indexOf(searchEventStr);
if (startSearchEvent === -1) {
    throw new Error("bpcSearch addEventListener not found");
}
let endSearchEvent = content.indexOf('});', startSearchEvent) + 3;

let replacementSearchEvent = `var _st; document.getElementById('bpcSearch').addEventListener('input', function() {
        clearTimeout(_st); _st = setTimeout(function() {
            _bpc.search = document.getElementById('bpcSearch').value || '';
            _bpc.page = 1;
            if (_bpc.search) {
                _bpcDoSearch(_bpc.search);
            } else {
                if (_bpc.filter.view === 'unassigned') _bpcLoadUnassigned();
                else _bpcLoadRecords();
            }
        }, 300);
    });`;

content = content.substring(0, startSearchEvent) + replacementSearchEvent + content.substring(endSearchEvent);

// 5. Inject _bpcDoSearch and _bpcClearSearchUI and update sidebar clicks
let helperCode = `
function _bpcClearSearchUI() {
    _bpc.search = '';
    var inp = document.getElementById('bpcSearch');
    if (inp) inp.value = '';
}

async function _bpcDoSearch(query) {
    try {
        var wrap = document.getElementById('bpcTableWrap');
        if (wrap) wrap.innerHTML = '<div style="text-align:center;padding:24px;color:#64748b;font-weight:600">⌛ Đang tìm kiếm...</div>';

        // 1. Fetch matching records globally (no year/month/cutter filter)
        var recsRes = await apiCall('/api/cutting/records?search=' + encodeURIComponent(query));
        var matchedRecords = recsRes.records || [];

        // Group and sort records
        var groups = {};
        matchedRecords.forEach(function(r) {
            var key = r.order_code || 'Chưa rõ';
            if (!groups[key]) groups[key] = { maxId: 0, items: [] };
            if (r.id > groups[key].maxId) groups[key].maxId = r.id;
            groups[key].items.push(r);
        });
        Object.keys(groups).forEach(function(key) {
            groups[key].items.sort(function(a, b) {
                var aIsComp = (a.cut_warning || '').indexOf('Cắt bù') >= 0 ? 1 : 0;
                var bIsComp = (b.cut_warning || '').indexOf('Cắt bù') >= 0 ? 1 : 0;
                if (aIsComp !== bIsComp) return aIsComp - bIsComp;
                var cmp = (a.product_name || '').localeCompare(b.product_name || '');
                if (cmp !== 0) return cmp;
                return b.id - a.id;
            });
        });
        var sortedGroups = Object.keys(groups).sort(function(a, b) {
            return groups[b].maxId - groups[a].maxId;
        });
        var newRecs = [];
        sortedGroups.forEach(function(key) {
            newRecs = newRecs.concat(groups[key].items);
        });
        matchedRecords = newRecs;

        // 2. Fetch or filter unassigned orders
        if (!_bpc.unassignedOrders || !_bpc.unassignedOrders.length) {
            var unassignedRes = await apiCall('/api/cutting/unassigned');
            _bpc.unassignedOrders = unassignedRes.orders || [];
        }

        var q = query.toLowerCase();
        var matchedUnassigned = _bpc.unassignedOrders.filter(function(r) {
            return (r.order_code||'').toLowerCase().indexOf(q)>=0 
                || (r.customer_name||'').toLowerCase().indexOf(q)>=0 
                || (r.material_name||'').toLowerCase().indexOf(q)>=0
                || (r.item_desc||'').toLowerCase().indexOf(q)>=0;
        });

        // 3. Render combined results view
        var el = document.getElementById('bpcFilterInfo');
        if (el) {
            el.innerHTML = '<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700">🔍 Kết quả: "' + query + '"</div>';
        }
        var sc = document.getElementById('bpcStatCards');
        if (sc) {
            sc.innerHTML = '<div style="background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px rgba(234,88,12,0.3)"><div style="font-size:9px;font-weight:600;opacity:0.85;letter-spacing:1px;margin-bottom:2px">🔴 CHƯA NHẬN</div><div style="font-size:15px;font-weight:900">' + matchedUnassigned.length + '</div></div>'
                +'<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px rgba(16,185,129,0.3)"><div style="font-size:9px;font-weight:600;opacity:0.85;letter-spacing:1px;margin-bottom:2px">🟢 ĐÃ NHẬN</div><div style="font-size:15px;font-weight:900">' + matchedRecords.length + '</div></div>';
        }

        if (wrap) {
            wrap.innerHTML = '<div style="font-weight: 800; color: #ea580c; font-size: 13px; margin: 12px 8px 8px 8px; display: flex; align-items: center; gap: 8px;">'
                +'<span>🔴 CÁC ĐƠN CHƯA CẮT (' + matchedUnassigned.length + ')</span>'
                +'</div>'
                + _bpcBuildUnassignedTableHtml(matchedUnassigned)
                +'<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;">'
                +'<div style="font-weight: 800; color: #059669; font-size: 13px; margin: 12px 8px 8px 8px; display: flex; align-items: center; gap: 8px;">'
                +'<span>📦 CÁC ĐƠN ĐÃ CẮT / ĐANG CẮT (' + matchedRecords.length + ')</span>'
                +'</div>'
                + _bpcBuildRecordsTableHtml(matchedRecords);
        }

        // Clear pagination top & bottom
        var top = document.getElementById('bpcPaginationTop'), bot = document.getElementById('bpcPaginationBottom');
        if (top) top.innerHTML = '<div style="text-align:center;font-size:11px;color:#64748b;padding:4px"><span style="font-weight:700">Khớp: ' + matchedUnassigned.length + ' chưa nhận, ' + matchedRecords.length + ' đã nhận</span></div>';
        if (bot) bot.innerHTML = '';

    } catch (e) {
        console.error('[BPC] search failed:', e);
    }
}
`;

content += helperCode;

// 6. Update sidebar click functions to call _bpcClearSearchUI()
content = content.replace('function _bpcShowUnassigned() {', 'function _bpcShowUnassigned() {\n    _bpcClearSearchUI();');
content = content.replace('function _bpcFilter(year, month, cutterId) {', 'function _bpcFilter(year, month, cutterId) {\n    _bpcClearSearchUI();');
content = content.replace('function _bpcFilterCutterStatus(year, cutterId, status) {', 'function _bpcFilterCutterStatus(year, cutterId, status) {\n    _bpcClearSearchUI();');
content = content.replace('function _bpcFilterCutterMonth(year, cutterId, month) {', 'function _bpcFilterCutterMonth(year, cutterId, month) {\n    _bpcClearSearchUI();');

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully modified bophancathv.js!");
