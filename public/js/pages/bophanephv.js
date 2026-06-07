// ========== BỘ PHẬN ÉP — Desktop SPA ==========
var _bpe={records:[],tree:null,filter:{year:null,month:null,presser_id:null,status:null},search:'',viewMode:'assigned',unassignedOrders:[],unassignedFilter:null};
var _bpeOpen={};

function renderBophanepPage(content){
    _bpe.viewMode = 'assigned';
    _bpe.filter = {year:null,month:null,presser_id:null,status:null};
    _bpe.unassignedFilter = null;
    
    if(!document.getElementById('_bpeS')){var st=document.createElement('style');st.id='_bpeS';
    st.textContent='.bpe-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden}.bpe-sb{width:270px;min-width:270px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto}.bpe-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;padding:16px}.bpe-main>*{flex-shrink:0}'
    +'.bpe-sb-title{font-size:13px;font-weight:800;padding:16px;border-bottom:1px solid var(--gray-200);text-align:center;color:#7c3aed}'
    +'.bpe-sb-total{background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;padding:12px 16px;font-size:13px;font-weight:800;display:flex;justify-content:space-between;cursor:pointer}'
    +'.bpe-sb-total.active{background:linear-gradient(135deg,#6d28d9,#4338ca)}'
    +'.bpe-sb-uncut{background:linear-gradient(135deg,#f97316,#fb923c);color:#fff;padding:10px 16px;font-size:12px;font-weight:800;display:flex;justify-content:space-between;align-items:center;cursor:pointer;border-bottom:1px solid rgba(0,0,0,0.1)}'
    +'.bpe-sb-uncut.active{background:linear-gradient(135deg,#ea580c,#c2410c)}'
    +'.bpe-sb-year{padding:8px 16px;font-weight:800;font-size:12px;color:var(--navy);cursor:pointer;display:flex;justify-content:space-between;background:#f8fafc;border-bottom:1px solid var(--gray-200)}'
    +'.bpe-sb-year.active{background:#ede9fe;color:#7c3aed}'
    +'.bpe-sb-month{padding:6px 16px 6px 28px;font-size:11px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;border-bottom:1px solid #f0f0f0;color:#7c3aed}'
    +'.bpe-sb-month:hover{background:#f5f3ff}.bpe-sb-month.active{background:#ede9fe;font-weight:800}'
    +'.bpe-sb-item{padding:5px 16px 5px 42px;font-size:10px;font-weight:600;cursor:pointer;display:flex;justify-content:space-between;border-bottom:1px solid #fafafa;color:#64748b}'
    +'.bpe-sb-item:hover{background:#f5f3ff}.bpe-sb-item.active{background:#ede9fe;color:#7c3aed;font-weight:800}'
    +'.bpe-ib{width:26px;height:26px;border-radius:6px;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:12px;transition:all .15s;margin:0 1px}'
    +'.bpe-ib:hover{transform:scale(1.15);box-shadow:0 2px 8px rgba(0,0,0,0.12)}'
    +'.bpe-ib.on-rpt{background:#ffedd5;border-color:#f97316}.bpe-ib.on-sal{background:#fef3c7;border-color:#f59e0b}.bpe-ib.on-err{background:#fee2e2;border-color:#ef4444}'
    +'.bpe-pos{font-size:9px;text-align:center;font-weight:700;color:#7c3aed}'
    +'.bpe-claim-btn{padding:7px 16px;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;white-space:nowrap;font-family:"Inter",system-ui,sans-serif;letter-spacing:0.3px}'
    +'.bpe-claim-btn.ready{background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff !important;box-shadow:0 3px 10px rgba(124,58,237,0.3)}'
    +'.bpe-claim-btn.ready:hover{transform:translateY(-1px);box-shadow:0 5px 15px rgba(124,58,237,0.4)}'
    +'.bpe-claim-btn.disabled{background:#f8fafc;color:#64748b;cursor:not-allowed;border:1.5px solid #e2e8f0;font-weight:600}'
    +'@media(max-width:768px){.bpe-sb{display:none}}';
    document.head.appendChild(st);}
    
    content.innerHTML='<div class="bpe-wrap"><div class="bpe-sb" id="bpeSb"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="bpe-main">'
    +'<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center">'
    +'<div style="display:flex;flex-direction:column;gap:8px;align-items:flex-start">'
    +'<div id="bpeInfo" style="font-size:12px"></div>'
    +'<input id="bpeSearch" placeholder="🔍 Tìm SP, mã đơn, nhân viên..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:240px;outline:none">'
    +'</div>'
    +'<div id="bpeStats" style="display:flex;gap:10px;flex:1;justify-content:center"></div>'
    +'</div>'
    +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:11px;white-space:nowrap;width:100%" id="bpeTable"><thead><tr style="background:var(--gray-800)">'
    +'<th>STT</th><th>🔥</th><th>💰</th><th>⚠️</th><th>Ngày Ép</th><th>NV Ép</th><th>Tên SP</th><th>Chất Liệu</th><th>Màu Vải</th><th>CSKH</th><th>SL Đơn</th><th>SL Ép</th><th>Lương</th>'
    +'<th title="Ngực/Tay/Tạp Dề/Vải Mũ">Ngực/Tay</th><th title="Lưng/Bụng/Sườn/Áo Sẵn/Mũ Sẵn">Lưng/Bụng</th><th title="Bảo Hộ/Bếp/Sơ Mi">BH/Bếp</th><th title="Đóng Gói/Cổ Bẻ Vải">ĐG/Cổ Bẻ</th><th>VT Khác</th>'
    +'<th>Ảnh</th><th>Ghi Chú</th><th>Cập Nhật</th>'
    +'</tr></thead><tbody id="bpeTb"><tr><td colspan="21" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div></div></div>';
    
    var _t;document.getElementById('bpeSearch').addEventListener('input',function(){clearTimeout(_t);_t=setTimeout(function(){_bpe.search=document.getElementById('bpeSearch').value||'';_bpeRender();},300);});
    _bpeLoadAll();
}
 
async function _bpeLoadAll(){try{var tR=await apiCall('/api/pressing/tree');_bpe.tree=tR;_bpeRenderSb();if(_bpe.viewMode==='unassigned'){await _bpeLoadUnassigned();}else{await _bpeLoadRecs();}}catch(e){console.error('[BPE]',e);}}
 
function _bpeRenderSb(){
    var sb = document.getElementById('bpeSb'); if (!sb || !_bpe.tree) return;
    var t = _bpe.tree, f = _bpe.filter;
    var h = '<div class="bpe-sb-title">────── 🔥 Bộ Phận Ép ──────</div>';
    
    // Assigned total on top
    var totActive = _bpe.viewMode === 'assigned' && !f.year && !f.month && !f.presser_id;
    h += '<div class="bpe-sb-total' + (totActive ? ' active' : '') + '" onclick="_bpeFilter()"><span>📦 Tổng đã nhận</span><span style="font-size:15px;font-weight:900">' + (t.total || 0) + '</span></div>';
    
    // Unassigned section (CÁC ĐƠN CHƯA ÉP)
    var un = t.unassigned || { total: 0, ready: 0, pending: 0 };
    var unActive = _bpe.viewMode === 'unassigned' && !_bpe.unassignedFilter;
    h += '<div class="bpe-sb-uncut' + (unActive ? ' active' : '') + '" onclick="_bpeViewUnassigned()">';
    h += '<span>🔴 CÁC ĐƠN CHƯA ÉP</span>';
    h += '<span style="background:rgba(255,255,255,0.3);padding:2px 10px;border-radius:10px;font-size:12px;font-weight:900">' + un.total + '</span>';
    h += '</div>';
    
    if (un.total > 0) {
        h += '<div style="padding:4px 16px;font-size:9px;color:#6b7280;border-bottom:1px solid #f0f0f0;display:flex;gap:8px">';
        var readyActive = _bpe.viewMode === 'unassigned' && _bpe.unassignedFilter === 'ready';
        h += '<span style="color:#059669;font-weight:700;cursor:pointer;' + (readyActive ? 'text-decoration:underline;font-size:10px' : '') + '" onclick="_bpeViewUnassigned(\'ready\')">🟢 Sẵn sàng: ' + un.ready + '</span>';
        if (un.pending > 0) {
            var pendingActive = _bpe.viewMode === 'unassigned' && _bpe.unassignedFilter === 'pending';
            h += '<span style="color:#f59e0b;font-weight:700;cursor:pointer;' + (pendingActive ? 'text-decoration:underline;font-size:10px' : '') + '" onclick="_bpeViewUnassigned(\'pending\')">🟡 Thiếu ĐK: ' + un.pending + '</span>';
        }
        h += '</div>';
    }
    
    if (t.yearTree) {
        t.yearTree.forEach(function(yr) {
            var yo = !!_bpeOpen['y' + yr.year];
            var yAct = _bpe.viewMode === 'assigned' && f.year == yr.year && !f.presser_id && !f.month && !f.status;
            h += '<div class="bpe-sb-year' + (yAct ? ' active' : '') + '" onclick="event.stopPropagation(); _bpeTgl(\'y' + yr.year + '\'); _bpeFilter(' + yr.year + ')"><span>' + (yo ? '▼' : '▶') + ' 📅 Năm ' + yr.year + '</span><span style="background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;padding:2px 10px;border-radius:10px;font-size:10px">' + yr.count + '</span></div>';
            
            if (yo && yr.pressers) {
                yr.pressers.forEach(function(p) {
                    var pk = 'p' + yr.year + '_' + (p.id || 0);
                    var po = !!_bpeOpen[pk];
                    var pA = _bpe.viewMode === 'assigned' && f.year == yr.year && f.presser_id == p.id && !f.status;
                    h += '<div class="bpe-sb-month' + (pA ? ' active' : '') + '" onclick="event.stopPropagation(); _bpeTgl(\'' + pk + '\'); _bpeFilter(' + yr.year + ', null, ' + p.id + ')">';
                    h += '<span>' + (po ? '▼' : '▶') + ' 👤 ' + (p.name || 'Chưa PC') + '</span>';
                    h += '<span style="background:#ffedd5;color:#ea580c;padding:1px 6px;border-radius:10px;font-size:9px;font-weight:bold">' + p.total + '</span>';
                    h += '</div>';
                    
                    if (po) {
                        // Incomplete
                        if (p.incomplete_count > 0) {
                            var incA = _bpe.viewMode === 'assigned' && f.year == yr.year && f.presser_id == p.id && f.status === 'incomplete';
                            h += '<div class="bpe-sb-item' + (incA ? ' active' : '') + '" onclick="event.stopPropagation(); _bpeFilter(' + yr.year + ', null, ' + p.id + ', \'incomplete\')">';
                            h += '<span style="color:#ef4444">🔴 Đang ép (incomplete)</span>';
                            h += '<span style="color:#ef4444;font-weight:bold">' + p.incomplete_count + '</span>';
                            h += '</div>';
                        }
                        // Months
                        if (p.months) {
                            p.months.forEach(function(mo) {
                                var moA = _bpe.viewMode === 'assigned' && f.year == yr.year && f.month == mo.month && f.presser_id == p.id && f.status !== 'incomplete';
                                h += '<div class="bpe-sb-item' + (moA ? ' active' : '') + '" onclick="event.stopPropagation(); _bpeFilter(' + yr.year + ',' + mo.month + ',' + p.id + ')">';
                                h += '<span>🗓️ Tháng ' + String(mo.month).padStart(2, '0') + '</span>';
                                h += '<span>' + mo.count + '</span>';
                                h += '</div>';
                            });
                        }
                    }
                });
            }
        });
    }
    sb.innerHTML = h;
}

function _bpeTgl(k){_bpeOpen[k]=!_bpeOpen[k];_bpeRenderSb();}
function _bpeFilter(y,m,p,status){_bpe.viewMode='assigned';_bpe.filter={year:y||null,month:m||null,presser_id:p||null,status:status||null};_bpeRenderSb();_bpeLoadRecs();}

async function _bpeLoadRecs(){var f=_bpe.filter,qs='?_=1';
if(f.year)qs+='&year='+f.year;if(f.month)qs+='&month='+f.month;if(f.presser_id)qs+='&presser_id='+f.presser_id;if(f.status)qs+='&status='+f.status;
try{var res=await apiCall('/api/pressing/records'+qs);_bpe.records=res.records||[];_bpeRender();}catch(e){console.error('[BPE]',e);}}

function _bpeFD(d){if(!d)return'—';try{var p=d.split('T')[0].split('-');return p[2]+'/'+p[1]+'/'+p[0];}catch(e){return d;}}
function _bpeFN(n){if(!n&&n!==0)return'—';return Number(n).toLocaleString('vi-VN');}

function _bpeRender(){
    var tb=document.getElementById('bpeTb');if(!tb)return;
    if(_bpe.viewMode==='unassigned'){_bpeRenderUnassigned();return;}
    
    var all=_bpe.records.slice();
    if (_bpe.search) {
        var q = _bpe.search.toLowerCase();
        all = all.filter(function(r) {
            return (r.product_name||'').toLowerCase().indexOf(q)>=0 
                || (r.cskh_name||'').toLowerCase().indexOf(q)>=0 
                || (r.order_code||'').toLowerCase().indexOf(q)>=0
                || (r.customer_name||'').toLowerCase().indexOf(q)>=0
                || (r.presser_name||'').toLowerCase().indexOf(q)>=0;
        });
    }
    var tot=all.length;
    
    var wrap = document.getElementById('bpeTable');
    if (wrap) {
        var thead = wrap.querySelector('thead');
        if (thead) {
            thead.innerHTML = '<tr style="background:var(--gray-800)">'
                + '<th>STT</th><th>🔥</th><th>💰</th><th>⚠️</th><th>Ngày Ép</th><th>NV Ép</th><th>Tên SP</th><th>Chất Liệu</th><th>Màu Vải</th><th>CSKH</th><th>SL Đơn</th><th>SL Ép</th><th>Lương</th>'
                + '<th title="Ngực/Tay/Tạp Dề/Vải Mũ">Ngực/Tay</th><th title="Lưng/Bụng/Sườn/Áo Sẵn/Mũ Sẵn">Lưng/Bụng</th><th title="Bảo Hộ/Bếp/Sơ Mi">BH/Bếp</th><th title="Đóng Gói/Cổ Bẻ Vải">ĐG/Cổ Bẻ</th><th>VT Khác</th>'
                + '<th>Ảnh</th><th>Ghi Chú</th><th>Cập Nhật</th>'
                + '</tr>';
        }
    }
    
    if(!all.length){tb.innerHTML='<tr><td colspan="21"><div class="empty-state"><div class="icon">🔥</div><h3>Chưa có đơn ép</h3></div></td></tr>';}else{
    tb.innerHTML=all.map(function(r,i){
        var rI=r.is_reported?'🔥':'⬜',rC=r.is_reported?' on-rpt':'',rA=r.is_reported?'undo_report':'report';
        var sI=r.salary_approved?'💰':'⬜',sC=r.salary_approved?' on-sal':'',sA=r.salary_approved?'undo_salary':'approve_salary';
        var eI=r.error_reported?'⚠️':'⬜',eC=r.error_reported?' on-err':'';
        var imgs='—';try{var ia=JSON.parse(r.press_images||'[]');if(ia.length)imgs='📸 '+ia.length;}catch(e){}
        var upd='';if(r.last_update_at){upd=_bpeFD(r.last_update_at);if(r.last_update_by)upd+='<br><span style="color:#ea580c;font-size:9px">'+r.last_update_by+'</span>';}
        
        var presserHtml = r.presser_name || '—';
        var isOwnRecord = window._currentUser && r.presser_id === window._currentUser.id;
        var isManager = window._currentUser && ['giam_doc', 'quan_ly', 'truong_phong'].includes(window._currentUser.role);
        if ((isOwnRecord || isManager) && !r.is_reported && !r.salary_approved) {
            presserHtml += ' <span onclick="event.stopPropagation(); _bpeUnclaimOrder(' + r.order_item_id + ',\'' + (r.order_code || '') + '\')" style="color:#ef4444;cursor:pointer;font-weight:bold;margin-left:4px" title="Trả lại đơn">❌</span>';
        }

        return '<tr><td style="text-align:center;font-weight:700;color:#94a3b8">'+(i+1)+'</td>'
        +'<td style="text-align:center"><button class="bpe-ib'+rC+'" onclick="_bpeTog('+r.id+',\''+rA+'\')" title="Báo cáo ép">'+rI+'</button></td>'
        +'<td style="text-align:center"><button class="bpe-ib'+sC+'" onclick="_bpeTog('+r.id+',\''+sA+'\')" title="Lương">'+sI+'</button></td>'
        +'<td style="text-align:center"><button class="bpe-ib'+eC+'" onclick="_bpeErr()" title="Báo lỗi">'+eI+'</button></td>'
        +'<td style="font-size:10px">'+_bpeFD(r.press_date)+'</td>'
        +'<td style="font-size:10px;color:#ea580c;font-weight:600">'+presserHtml+'</td>'
        +'<td style="font-weight:600;color:#1e293b">'+(r.product_name||r.order_code||'—')+'</td>'
        +'<td style="font-size:10px;font-weight:bold">'+(r.material_name||'—')+'</td>'
        +'<td style="font-size:10px">'+(r.fabric_color||'—')+'</td>'
        +'<td style="font-size:10px;color:#2563eb;font-weight:600">'+(r.cskh_name||'—')+'</td>'
        +'<td style="text-align:center;font-weight:600">'+(r.order_quantity||'—')+'</td>'
        +'<td style="text-align:center;font-weight:700;color:#ea580c">'+(r.press_quantity||'—')+'</td>'
        +'<td style="text-align:right;font-weight:800;color:#f59e0b">'+_bpeFN(r.press_salary)+'</td>'
        +'<td class="bpe-pos">'+(r.pos_chest_arm||'—')+'</td>'
        +'<td class="bpe-pos">'+(r.pos_back_belly||'—')+'</td>'
        +'<td class="bpe-pos">'+(r.pos_protective||'—')+'</td>'
        +'<td class="bpe-pos">'+(r.pos_packaging||'—')+'</td>'
        +'<td style="font-size:9px;max-width:60px;overflow:hidden;text-overflow:ellipsis">'+(r.pos_other||'—')+'</td>'
        +'<td style="text-align:center;font-size:10px">'+imgs+'</td>'
        +'<td style="font-size:9px;max-width:80px;overflow:hidden;text-overflow:ellipsis">'+(r.notes||'—')+'</td>'
        +'<td style="font-size:9px;color:#6b7280">'+upd+'</td></tr>';}).join('');}
        
    var el=document.getElementById('bpeInfo');if(el){var parts=['🔥 Bộ Phận Ép'];if(_bpe.filter.year)parts.push('📆 '+_bpe.filter.year);if(_bpe.filter.month)parts.push('🗓️ T'+_bpe.filter.month);
    el.innerHTML='<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700">'+parts.join(' <span style="opacity:0.5;margin:0 6px">•</span> ')+' — <span style="color:#fed7aa;font-weight:900">'+tot+'</span> đơn</div>';}
    var sc=document.getElementById('bpeStats');if(sc){
    var rpt=all.filter(function(r){return r.is_reported;}).length,appr=all.filter(function(r){return r.salary_approved;}).length,err=all.filter(function(r){return r.error_reported;}).length;
    sc.innerHTML='<div style="background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #ea580c30"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">📦 TỔNG</div><div style="font-size:15px;font-weight:900">'+tot+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#f97316,#fb923c);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #f9731630"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">🔥 BÁO CÁO</div><div style="font-size:15px;font-weight:900">'+rpt+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #f59e0b30"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">💰 LƯƠNG</div><div style="font-size:15px;font-weight:900">'+appr+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #ef444430"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">⚠️ LỖI</div><div style="font-size:15px;font-weight:900">'+err+'</div></div>';}
}

function _bpeViewUnassigned(filterType) {
    _bpe.viewMode = 'unassigned';
    _bpe.unassignedFilter = filterType || null;
    _bpeRenderSb();
    _bpeLoadUnassigned();
}

async function _bpeLoadUnassigned() {
    try {
        var res = await apiCall('/api/pressing/unassigned');
        _bpe.unassignedOrders = res.orders || [];
        _bpeRenderUnassigned();
    } catch(e) { console.error('[BPE] unassigned:', e); }
}

function _bpeRenderUnassigned() {
    var tb = document.getElementById('bpeTb'); if (!tb) return;
    var all = _bpe.unassignedOrders.slice();
    if (_bpe.search) {
        var q = _bpe.search.toLowerCase();
        all = all.filter(function(r) {
            return (r.order_code||'').toLowerCase().indexOf(q)>=0 
                || (r.customer_name||'').toLowerCase().indexOf(q)>=0 
                || (r.material_name||'').toLowerCase().indexOf(q)>=0
                || (r.cskh_name||'').toLowerCase().indexOf(q)>=0
                || (r.created_by_name||'').toLowerCase().indexOf(q)>=0
                || (r.item_desc||'').toLowerCase().indexOf(q)>=0;
        });
    }
    
    if (_bpe.unassignedFilter === 'ready') {
        all = all.filter(function(r) { return r.ready; });
    } else if (_bpe.unassignedFilter === 'pending') {
        all = all.filter(function(r) { return !r.ready; });
    }

    // Re-render table headers for unassigned view
    var wrap = document.getElementById('bpeTable');
    if (wrap) {
        var thead = wrap.querySelector('thead');
        if (thead) {
            thead.innerHTML = '<tr style="background:var(--gray-800)">'
                + '<th>STT</th><th style="text-align:center">Nhận Đơn</th><th>Độ Ưu Tiên</th><th>Mã Đơn</th><th>Khách Hàng</th><th>NV Sale</th><th>Tên SP / Phối</th><th>Chất Liệu</th><th>Màu Vải</th><th>SL Đơn</th><th>SL Cắt Được</th><th>Trạng Thái</th>'
                + '</tr>';
        }
    }

    if (!all.length) {
        tb.innerHTML = '<tr><td colspan="12"><div class="empty-state"><div class="icon">📥</div><h3>Không có đơn chưa ép nào</h3></div></td></tr>';
        return;
    }

    var groupRowCount = {};
    all.forEach(function(r) {
        var k = r.id + '_' + (r.item_id || 0);
        groupRowCount[k] = (groupRowCount[k] || 0) + 1;
    });

    var seenGroups = {};
    var stt = 0;

    tb.innerHTML = all.map(function(r, i) {
        var groupKey = r.id + '_' + (r.item_id || 0);
        var isNewGroup = !seenGroups[groupKey];
        if (isNewGroup) {
            seenGroups[groupKey] = true;
            stt++;
        }

        var claimTd = '';
        var priTd = '';
        if (isNewGroup) {
            var rs = groupRowCount[groupKey] || 1;
            var claimHtml = '';
            if (r.ready) {
                claimHtml = '<button class="bpe-claim-btn ready" onclick="_bpeClaimOrder(' + r.id + ',' + (r.item_id || 'null') + ',\'' + r.order_code + '\')">🔥 NHẬN ÉP</button>';
            } else {
                claimHtml = '<button class="bpe-claim-btn disabled" disabled title="' + (r.warning_msg || 'Thiếu thông tin') + '">🔒 ' + (r.warning_msg || 'Khóa') + '</button>';
            }
            claimTd = '<td rowspan="' + rs + '" style="text-align:center;vertical-align:middle;border-left:2px solid #e2e8f0">' + claimHtml + '</td>';
            
            var priority = (r.shipping_priority || 'CHUẨN').toUpperCase();
            var priColor = 'background:#f3e8ff;color:#7e22ce;border:1px solid #d8b4fe';
            if (priority === 'GẤP') priColor = 'background:#fee2e2;color:#dc2626;border:1px solid #fca5a5';
            else if (priority === 'GỬI') priColor = 'background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd';
            
            priTd = '<td rowspan="' + rs + '" style="text-align:center;vertical-align:middle"><span style="padding:2px 6px;border-radius:4px;font-size:9px;font-weight:800;display:inline-block;' + priColor + '">' + priority + '</span></td>';
        }

        var statusHtml = '';
        if (r.warning_msg) {
            statusHtml = '<span style="color:#ef4444;font-weight:bold;font-size:10px">⚠️ ' + r.warning_msg + '</span>';
        } else {
            statusHtml = '<span style="color:#059669;font-weight:bold;font-size:10px">✅ Sẵn sàng ép</span>';
        }

        var showTitle = r.order_code + ' — Phiếu ' + r.item_index;
        var bg = isNewGroup ? 'background:#fff' : 'background:#fafafa';

        return '<tr style="' + bg + '"><td style="text-align:center;font-weight:700;color:#94a3b8">' + (isNewGroup ? stt : '') + '</td>'
            + claimTd
            + priTd
            + '<td style="font-weight:700;color:#1e293b">' + (isNewGroup ? showTitle : '') + '</td>'
            + '<td style="font-size:10px;color:#475569">' + (isNewGroup ? (r.customer_name || '—') : '') + '</td>'
            + '<td style="font-size:10px;color:#2563eb;font-weight:600">' + (isNewGroup ? (r.cskh_name || r.created_by_name || '—') : '') + '</td>'
            + '<td>' + (isNewGroup ? (r.item_desc || '—') : '') + '</td>'
            + '<td style="font-size:10px;font-weight:bold">' + (r.material_name || '—') + '</td>'
            + '<td style="font-size:10px">' + (r.color_name || '—') + '</td>'
            + '<td style="text-align:center;font-weight:bold;color:#0369a1">' + r.item_qty + '</td>'
            + '<td style="text-align:center;font-weight:bold;color:#ea580c">' + (r.cut_qty || 0) + '</td>'
            + '<td>' + (isNewGroup ? statusHtml : '') + '</td>'
            + '</tr>';
    }).join('');
    
    var tot = all.filter(function(x, idx, self) {
        return self.findIndex(y => y.id === x.id && y.item_id === x.item_id) === idx;
    }).length;
    var readyCount = all.filter(function(x) { return x.ready; }).length;
    
    var el=document.getElementById('bpeInfo');if(el){
        el.innerHTML='<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700">📥 Đơn chờ ép — <span style="color:#fed7aa;font-weight:900">' + tot + '</span> phiếu</div>';
    }
    
    var sc=document.getElementById('bpeStats');if(sc) {
        sc.innerHTML = '<div style="background:rgba(255,255,255,0.05);color:#475569;padding:8px 18px;border-radius:10px;text-align:center"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">SẴN SÀNG</div><div style="font-size:15px;font-weight:900;color:#059669">' + readyCount + '</div></div>';
    }
}

async function _bpeClaimOrder(orderId, itemId, orderCode) {
    var groupKey = orderId + '_' + (itemId || 0);
    var rows = _bpe.unassignedOrders.filter(function(r) { return (r.id + '_' + (r.item_id || 0)) === groupKey; });
    var o = rows[0] || {};
    
    var old = document.getElementById('_bpeClaimModal'); if (old) old.remove();
    
    var h = '<div class="bpc-modal-overlay" id="_bpeClaimModal" onclick="if(event.target===this)_bpeCloseModal()">';
    h += '<div class="bpc-modal" style="width:480px">';
    h += '<div class="bpc-modal-header" style="background:linear-gradient(135deg,#7c3aed,#4f46e5)"><div class="m-icon">🔥</div><div><div class="m-title">Xác Nhận Nhận Ép</div><div class="m-sub">Nhận phiếu ép hàng này</div></div></div>';
    h += '<div class="bpc-modal-body" style="padding:16px 20px">';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📋 Mã đơn</span><span class="bpc-modal-val" style="color:#059669;font-weight:bold;font-size:14px">' + orderCode + ' — Phiếu ' + o.item_index + '</span></div>';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">👤 Khách hàng</span><span class="bpc-modal-val">' + (o.customer_name || '—') + '</span></div>';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">💼 NV Sale</span><span class="bpc-modal-val" style="color:#60a5fa">' + (o.cskh_name || o.created_by_name || '—') + '</span></div>';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📅 Hạn ship</span><span class="bpc-modal-val">' + _bpeFD(o.expected_ship_date) + '</span></div>';
    h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">👕 Mô tả phiếu</span><span class="bpc-modal-val">' + (o.item_desc || '—') + '</span></div>';
    
    if (rows.length > 0) {
        h += '<div style="margin-top:12px;border-top:1px solid #e2e8f0;padding-top:12px">';
        h += '<div style="font-size:11px;font-weight:bold;color:#4f46e5;margin-bottom:8px">📦 DANH SÁCH PHỐI ÉP (' + rows.length + ')</div>';
        rows.forEach(function(p) {
            h += '<div style="display:flex;justify-content:space-between;padding:6px 10px;background:#f8fafc;border-radius:6px;margin-bottom:4px;font-size:11px">';
            h += '<span style="font-weight:bold">' + (p.material_name || 'Phối') + ' · ' + (p.color_name || 'Màu') + '</span>';
            h += '<span style="font-weight:bold;color:#ea580c">SL Ép: ' + (p.cut_qty || 0) + '</span>';
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

async function _bpeTog(id,action){try{await apiCall('/api/pressing/toggle/'+id,'POST',{action});showToast('✅ Cập nhật');await _bpeLoadAll();}catch(e){showToast(e.message||'Lỗi','error');}}
function _bpeErr(){if(typeof navigate==='function'){navigate('don-loi-khach-hang');showToast('📋 Chuyển sang Đơn Lỗi');}}
