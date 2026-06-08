// ========== BỘ PHẬN MAY — Desktop SPA ==========
var _bpm={records:[],tree:null,filter:{year:null,month:null,sewer_id:null,contractor_id:null,status:null},search:'',page:1,ps:100,contractors:[]};
var _bpmOpen={};

function renderBophanmayPage(content){
    if(!document.getElementById('_bpmS')){var st=document.createElement('style');st.id='_bpmS';
    st.textContent='.bpm-wrap{display:flex;min-height:calc(100vh - 110px);overflow:visible;align-items:flex-start}'
    +'.bpm-sb{width:270px;min-width:270px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto;position:sticky;top:80px;height:calc(100vh - 110px)}'
    +'.bpm-main{flex:1;min-width:0;display:flex;flex-direction:column;padding:16px}.bpm-main>*{flex-shrink:0}'
    +'.bpm-sb-title{font-size:13px;font-weight:800;padding:16px;border-bottom:1px solid var(--gray-200);text-align:center;position:relative;overflow:hidden;background:#f8fafc}'
    +'.bpm-sb-title::before{content:"";position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:linear-gradient(45deg,transparent 30%,rgba(13,148,136,0.08) 50%,transparent 70%);animation:bpmShimmer 3s infinite}'
    +'@keyframes bpmShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}'
    +'.bpm-sb-total{background:linear-gradient(135deg,#3b82f6,#4f46e5);color:#fff;border-left:5px solid #2563eb;padding:12px 16px 12px 11px;font-size:13px;font-weight:800;display:flex;justify-content:space-between;align-items:center;cursor:pointer;position:relative;overflow:hidden;border-bottom:1px solid #2563eb;transition:all 0.2s}'
    +'.bpm-sb-total:hover{background:linear-gradient(135deg,#2563eb,#3b82f6)}'
    +'.bpm-sb-total.active{background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;border-left-color:#fbbf24;box-shadow:0 4px 12px rgba(37,99,235,0.3);font-weight:900}'
    +'.bpm-sb-total::after{content:"";position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent);animation:bpmGlow 2.5s infinite}'
    +'@keyframes bpmGlow{0%{left:-100%}100%{left:150%}}'
    +'.bpm-sb-unassigned{background:linear-gradient(135deg,#e11d48,#f43f5e);color:#fff;border-left:5px solid #be123c;padding:12px 16px 12px 11px;font-size:13px;font-weight:800;display:flex;justify-content:space-between;align-items:center;cursor:pointer;position:relative;overflow:hidden;border-bottom:1px solid #be123c;transition:all 0.2s}'
    +'.bpm-sb-unassigned:hover{background:linear-gradient(135deg,#be123c,#fb7185)}'
    +'.bpm-sb-unassigned.active{background:linear-gradient(135deg,#be123c,#fca5a5);color:#fff;border-left-color:#fbbf24;box-shadow:0 4px 12px rgba(190,18,60,0.3);font-weight:900}'
    +'.bpm-sb-year{padding:12px 16px 12px 11px;font-weight:800;font-size:12px;color:#fff;cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,#059669,#10b981);border-bottom:1px solid #047857;transition:all 0.2s;border-left:5px solid #047857}'
    +'.bpm-sb-year:hover{background:linear-gradient(135deg,#047857,#34d399)}'
    +'.bpm-sb-year.active{background:linear-gradient(135deg,#047857,#a7f3d0);color:#fff;border-left-color:#fbbf24;box-shadow:0 4px 12px rgba(5,150,105,0.3);font-weight:900}'
    +'.bpm-sb-year.active span:last-child{background:rgba(255,255,255,0.4) !important;color:#fff !important}'
    +'.bpm-sb-toggle-btn{padding:4px 6px;margin-right:2px;cursor:pointer;display:inline-block;transition:all 0.15s;border-radius:4px;user-select:none}'
    +'.bpm-sb-toggle-btn:hover{background:rgba(255,255,255,0.35);transform:scale(1.2)}'
    +'.bpm-sb-sewer{padding:7px 16px 7px 23px;font-size:11px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;color:#334155;border-left:5px solid #cbd5e1;background:#f1f5f9;transition:all 0.15s}'
    +'.bpm-sb-sewer:hover{background:#e2e8f0}'
    +'.bpm-sb-sewer.active{background:linear-gradient(135deg,#0f766e,#2dd4bf);color:#fff;font-weight:800;border-left-color:#115e59;box-shadow:0 2px 5px rgba(15,118,110,0.25)}'
    +'.bpm-sb-sewer.active span:last-child{background:rgba(255,255,255,0.2) !important;color:#fff !important;padding:2px 8px;border-radius:10px;font-size:10px}'
    +'.bpm-sb-sub{padding:6px 16px 6px 37px;font-size:10px;font-weight:600;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f1f5f9;color:#475569;border-left:5px solid transparent;background:#f8fafc;transition:all 0.15s}'
    +'.bpm-sb-sub:hover{background:#f1f5f9}'
    +'.bpm-sb-sub.active{background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;font-weight:800;border-left-color:#0f766e;box-shadow:0 2px 5px rgba(13,148,136,0.25)}'
    +'.bpm-sb-sub.active span:last-child{background:rgba(255,255,255,0.2) !important;color:#fff !important;padding:2px 6px;border-radius:8px;font-size:9px}'
    +'.bpm-sb-sub.incomplete{background:#fef3c7;color:#92400e;border-left-color:#fde68a}'
    +'.bpm-sb-sub.incomplete.active{background:linear-gradient(135deg,#d97706,#fbbf24);color:#fff;border-left-color:#78350f;box-shadow:0 2px 5px rgba(217,119,6,0.25)}'
    +'.bpm-sb-sub.incomplete.active span:last-child{background:rgba(255,255,255,0.2) !important;color:#fff !important;padding:2px 6px;border-radius:8px;font-size:9px}'
    +'.bpm-ib{width:26px;height:26px;border-radius:6px;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:12px;transition:all .15s;margin:0 1px}'
    +'.bpm-ib:hover{transform:scale(1.15);box-shadow:0 2px 8px rgba(0,0,0,0.12)}'
    +'.bpm-ib.on-rpt{background:#ccfbf1;border-color:#14b8a6}.bpm-ib.on-err{background:#fee2e2;border-color:#ef4444}.bpm-ib.on-sal{background:#fef3c7;border-color:#f59e0b}'
    +'.bpm-team-card{transition:all 0.2s ease}.bpm-team-card:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.05);border-color:#cbd5e1}.bpm-team-card.active{box-shadow:0 4px 12px rgba(13,148,136,0.15)}'
    +'@media(max-width:768px){.bpm-sb{display:none}}';
    document.head.appendChild(st);}
    content.innerHTML='<div class="bpm-wrap"><div class="bpm-sb" id="bpmSb"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="bpm-main">'
    +'<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center"><div id="bpmInfo" style="font-size:12px"></div><div id="bpmStats" style="display:flex;gap:10px;flex:1;justify-content:center"></div><input id="bpmSearch" placeholder="🔍 Tìm SP..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:200px;outline:none">'
    +(window._currentUser && window._currentUser.role === 'giam_doc' ? '<button onclick="_bpmManageContractors()" style="padding:6px 14px;background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;margin-left:8px;transition:all .2s" onmouseover="this.style.opacity=0.85" onmouseout="this.style.opacity=1">🏭 Quản Lý Gia Công May</button>' : '')
    +'</div>'
    +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:11px;white-space:nowrap" id="bpmTable"><thead><tr style="background:var(--gray-800);color:#fff">'
    +'<th style="text-align:center">STT</th><th style="text-align:center">📋</th><th style="text-align:center">💰</th><th style="text-align:center">⚠️</th><th style="text-align:left">NV May</th><th style="text-align:left">QLX Hẹn Ra</th><th style="text-align:center">Ngày May HT</th><th style="text-align:left">Tên SP / Phối</th><th style="text-align:center">Số Lượng</th><th style="text-align:right">Giá May</th><th style="text-align:right">Giá Kiểm Tra</th><th style="text-align:right">Lương Giá Kiểm Tra</th><th style="text-align:left">May Chung</th><th style="text-align:center">Ảnh Kiểm Tra</th><th style="text-align:left">Ngày Bàn Giao May</th><th style="text-align:left">Cập Nhật</th>'
    +'</tr></thead><tbody id="bpmTb"><tr><td colspan="16" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div></div></div>';
    var _t;document.getElementById('bpmSearch').addEventListener('input',function(){clearTimeout(_t);_t=setTimeout(function(){_bpm.search=document.getElementById('bpmSearch').value||'';_bpm.page=1;_bpmRender();},300);});
    _bpmLoadAll();
}

async function _bpmLoadAll(){try{var[tR,cR,tms]=await Promise.all([apiCall('/api/sewing/tree'),apiCall('/api/sewing/contractors'),apiCall('/api/sewing/teams')]);_bpm.tree=tR;_bpm.contractors=cR.contractors||[];_bpm.teams=tms.teams||[];_bpmRenderSb();await _bpmLoadRecs();}catch(e){console.error('[BPM]',e);}}

function _bpmRenderSb(){
    var sb = document.getElementById('bpmSb'); if (!sb || !_bpm.tree) return;
    var t = _bpm.tree, f = _bpm.filter;

    var h = '<div class="bpm-sb-title"><span style="color:var(--navy)">───</span> <span style="color:#0d9488;font-weight:900">🧵 Bộ Phận May</span> <span style="color:var(--navy)">───</span></div>';
    var totActive = !f.year && !f.month && !f.sewer_id && !f.contractor_id && !f.status;
    h += '<div class="bpm-sb-total' + (totActive ? ' active' : '') + '" onclick="_bpmFilter()"><span>📦 Tổng đơn may</span><span style="font-size:16px">' + (t.total || 0) + '</span></div>';

    var unassignedCount = 0;
    if (t.tree) {
        t.tree.forEach(function(yr) {
            if (yr.sewers) {
                yr.sewers.forEach(function(s) {
                    if (!s.is_contractor && !s.is_team && !s.id) {
                        unassignedCount += (s.total || 0);
                    }
                });
            }
        });
    }
    var unassignedActive = !f.year && !f.month && f.sewer_id === 'none' && !f.contractor_id && !f.status;
    h += '<div class="bpm-sb-unassigned' + (unassignedActive ? ' active' : '') + '" onclick="_bpmFilter(null, null, \'none\', null)"><span>👤 Chưa phân công</span><span style="font-size:16px">' + unassignedCount + '</span></div>';

    if (t.tree) {
        t.tree.forEach(function(yr) {
            if (yr.year === 2025) return;
            var yKey = 'y' + yr.year;
            if (_bpmOpen[yKey] === undefined) {
                _bpmOpen[yKey] = true;
            }
            var yOpen = !!_bpmOpen[yKey];
            var yAct = f.year == yr.year && !f.sewer_id && !f.contractor_id && !f.month && !f.status;
            h += '<div class="bpm-sb-year' + (yAct ? ' active' : '') + '" onclick="_bpmFilter(' + yr.year + ')"><span><span class="bpm-sb-toggle-btn" onclick="event.stopPropagation(); _bpmTgl(\'' + yKey + '\')">' + (yOpen ? '▼' : '▶') + '</span> 📅 Năm ' + yr.year + '</span><span style="background:rgba(255,255,255,0.25);color:#fff;padding:2px 10px;border-radius:10px;font-size:10px;font-weight:800">' + yr.count + '</span></div>';
            
            if (yOpen && yr.sewers) {
                // Calculate total incomplete count for all sewers/contractors in this year
                var totalIncomplete = 0;
                yr.sewers.forEach(function(s) {
                    totalIncomplete += (s.incomplete_count || 0);
                });
                
                var incYearAct = f.year == yr.year && !f.sewer_id && !f.contractor_id && f.status === 'incomplete';
                h += '<div class="bpm-sb-sub incomplete' + (incYearAct ? ' active' : '') + '" style="padding-left:23px" onclick="event.stopPropagation(); _bpmFilterStatus(' + yr.year + ', null, null, \'incomplete\')">';
                h += '  <span>⏳ Chưa May Xong</span>';
                h += '  <span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:8px;font-size:9px;font-weight:800">' + totalIncomplete + '</span>';
                h += '</div>';

                yr.sewers.forEach(function(s) {
                    if (!s.is_contractor && !s.is_team && !s.id) return;
                    var sKey = 's' + yr.year + '_' + (s.is_contractor ? 'c' : 'i') + '_' + (s.id || 0);
                    var sOpen = !!_bpmOpen[sKey];
                    var isCurrentSewer = !s.is_contractor && f.sewer_id == s.id;
                    var isCurrentContractor = s.is_contractor && f.contractor_id == s.id;
                    var sAct = f.year == yr.year && (isCurrentSewer || isCurrentContractor) && !f.status && !f.month;
                    
                    var icon = s.is_contractor ? '🏭 ' : '👤 ';
                    h += '<div class="bpm-sb-sewer' + (sAct ? ' active' : '') + '" onclick="event.stopPropagation(); _bpmFilter(' + yr.year + ', null, ' + (s.is_contractor ? 'null' : (s.id || 'null')) + ', ' + (s.is_contractor ? s.id : 'null') + ')"><span><span class="bpm-sb-toggle-btn" onclick="event.stopPropagation(); _bpmTgl(\'' + sKey + '\')">' + (sOpen ? '▼' : '▶') + '</span> ' + icon + (s.name || 'Chưa PC') + '</span><span style="font-weight:800">' + s.total + '</span></div>';
                    
                    if (sOpen) {
                        // Đơn Chưa May Xong of this sewer/contractor
                        if (s.incomplete_count > 0) {
                            var incAct = f.year == yr.year && (isCurrentSewer || isCurrentContractor) && f.status === 'incomplete';
                            h += '<div class="bpm-sb-sub incomplete' + (incAct ? ' active' : '') + '" onclick="event.stopPropagation(); _bpmFilterStatus(' + yr.year + ', ' + (s.is_contractor ? 'null' : (s.id || 'null')) + ', ' + (s.is_contractor ? s.id : 'null') + ', \'incomplete\')"><span>⏳ Chưa May Xong</span><span style="background:#fef3c7;color:#92400e;padding:1px 8px;border-radius:8px;font-size:9px;font-weight:800">' + s.incomplete_count + '</span></div>';
                        }
                        // Tháng đã hoàn thành
                        if (s.months) {
                            s.months.forEach(function(m) {
                                var mAct = f.year == yr.year && (isCurrentSewer || isCurrentContractor) && f.month == m.month && f.status === 'done';
                                h += '<div class="bpm-sb-sub' + (mAct ? ' active' : '') + '" onclick="event.stopPropagation(); _bpmFilterMonth(' + yr.year + ', ' + (s.is_contractor ? 'null' : (s.id || 'null')) + ', ' + (s.is_contractor ? s.id : 'null') + ', ' + m.month + ')"><span>📅 T' + String(m.month).padStart(2, '0') + '</span><span>' + m.count + '</span></div>';
                            });
                        }
                    }
                });
            }
        });
    }
    sb.innerHTML = h;
}

function _bpmTgl(k){_bpmOpen[k]=!_bpmOpen[k];_bpmRenderSb();}
function _bpmFilter(y,m,s,c){_bpm.filter={year:y||null,month:m||null,sewer_id:s||null,contractor_id:c||null,status:null};_bpm.page=1;_bpmRenderSb();_bpmLoadRecs();}
function _bpmFilterStatus(y,s,c,status){_bpm.filter={year:y,month:null,sewer_id:s||null,contractor_id:c||null,status:status};_bpm.page=1;_bpmRenderSb();_bpmLoadRecs();}
function _bpmFilterMonth(y,s,c,m){_bpm.filter={year:y,month:m,sewer_id:s||null,contractor_id:c||null,status:'done'};_bpm.page=1;_bpmRenderSb();_bpmLoadRecs();}

async function _bpmLoadRecs(){var f=_bpm.filter,qs='?_=1';
if(f.year)qs+='&year='+f.year;if(f.month)qs+='&month='+f.month;
if(f.sewer_id)qs+='&sewer_id='+f.sewer_id;if(f.contractor_id)qs+='&contractor_id='+f.contractor_id;
if(f.status)qs+='&status='+f.status;
try{var res=await apiCall('/api/sewing/records'+qs);_bpm.records=res.records||[];_bpm.page=1;_bpmRender();}catch(e){console.error('[BPM]',e);}}

function _bpmFD(d){if(!d)return'—';try{var p=d.split('T')[0].split('-');return p[2]+'/'+p[1]+'/'+p[0];}catch(e){return d;}}
function _bpmFN(n){if(!n&&n!==0)return'—';return Number(n).toLocaleString('vi-VN');}
function _bpmFDT(d){if(!d)return'';try{return new Date(d).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}).replace(',','').trim();}catch(e){return d;}}

function _bpmRender(){
    var all=_bpm.records.slice();
    if(_bpm.search){var q=_bpm.search.toLowerCase();all=all.filter(function(r){return(r.product_name||'').toLowerCase().indexOf(q)>=0||(r.order_code||'').toLowerCase().indexOf(q)>=0;});}
    var tot=all.length;
    var tb=document.getElementById('bpmTb');if(!tb)return;
    if(!all.length){tb.innerHTML='<tr><td colspan="16"><div class="empty-state"><div class="icon">🧵</div><h3>Chưa có đơn may</h3></div></td></tr>';}else{
    tb.innerHTML=all.map(function(r,i){
        var rI=r.is_reported?'📋':'⬜',rC=r.is_reported?' on-rpt':'',rA=r.is_reported?'undo_report':'report';
        var eI=r.error_reported?'⚠️':'⬜',eC=r.error_reported?' on-err':'';
        var sI=r.salary_approved?'💰':'⬜',sC=r.salary_approved?' on-sal':'',sA=r.salary_approved?'undo_salary':'approve_salary';
        var nvN = '—';
        if (r.contractor_id) {
            nvN = r.contractor_name ? '🏭 ' + r.contractor_name : '🏭 Gia công';
        } else {
            var badgeColor = r.sewing_team_id ? 'background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd' : 'background:#fee2e2;color:#b91c1c;border:1px solid #fecaca';
            var teamLabel = r.sewer_name ? '👥 ' + r.sewer_name : '❌ Chưa Phân Tổ';
            nvN = '<span class="badge" style="' + badgeColor + ';padding:4px 8px;border-radius:6px;font-weight:800;cursor:pointer" onclick="_bpmShowHandoverModal(' + r.id + ')" title="Nhấp để bàn giao/phân tổ may">' + teamLabel + '</span>';
        }
        var imgs='—';try{var ia=JSON.parse(r.finish_images||'[]');if(ia.length)imgs='<span class="badge" style="background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;padding:4px 8px;border-radius:6px;font-weight:800;cursor:pointer" onclick="_bpmView('+r.id+')" title="Xem ảnh">📸 '+ia.length+'</span>';}catch(e){}
        var upd='';if(r.last_update_at){upd=_bpmFD(r.last_update_at);if(r.last_update_by)upd+='<br><span style="color:#0d9488;font-size:9px">'+r.last_update_by+'</span>';}
        
        var priority = (r.shipping_priority || 'CHUẨN').toUpperCase();
        var priBadge = '';
        if (priority === 'GẤP') {
            priBadge = '<span style="margin-right: 6px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Gấp</span>';
        } else if (priority === 'GỬI') {
            priBadge = '<span style="margin-right: 6px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Gửi</span>';
        } else {
            priBadge = '<span style="margin-right: 6px; background: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; display: inline-block; vertical-align: middle;">Chuẩn</span>';
        }

        return '<tr><td style="text-align:center;font-weight:700;color:#94a3b8">'+(i+1)+'</td>'
        +'<td style="text-align:center"><button class="bpm-ib'+rC+'" onclick="_bpmShowHandoverModal('+r.id+')" title="Bàn giao">'+rI+'</button></td>'
        +'<td style="text-align:center"><button class="bpm-ib'+sC+'" onclick="_bpmTog('+r.id+',\''+sA+'\')" title="Lương">'+sI+'</button></td>'
        +'<td style="text-align:center"><button class="bpm-ib'+eC+'" onclick="_bpmErr('+r.id+')" title="Báo lỗi">'+eI+'</button></td>'
        +'<td style="font-size:10px;color:#059669;font-weight:600">'+nvN+'</td>'
        +'<td style="font-size:10px">'+_bpmFD(r.handover_date)+'</td>'
        +'<td style="text-align:center;vertical-align:middle">'+(r.done_date?'<span style="color:#059669;font-weight:700;font-size:11px;white-space:nowrap">'+_bpmFDT(r.done_date)+'</span>':'<span style="padding:4px 8px;background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;border-radius:6px;font-size:10px;font-weight:700;display:inline-block;white-space:nowrap">Chưa May Xong</span>')+'</td>'
        +'<td style="font-weight:600;color:#1e293b">'+priBadge+(r.product_name||r.order_code||'—')+'</td>'
        +'<td style="text-align:center;font-weight:700;color:#0d9488">'+(r.quantity||'—')+'</td>'
        +'<td style="text-align:right;font-size:10px">'+_bpmFN(r.base_price)+'</td>'
        +'<td style="text-align:right;font-size:10px;color:#dc2626;font-weight:700">'+_bpmFN(r.checked_price)+'</td>'
        +'<td style="text-align:right;font-weight:800;color:#f59e0b">'+_bpmFN(r.salary)+'</td>'
        +'<td style="font-size:9px">'+(r.shared_sewing||'—')+'</td>'
        +'<td style="text-align:center;font-size:10px">'+imgs+'</td>'
        +'<td style="font-size:10px">'+_bpmFD(r.expected_date)+'</td>'
        +'<td style="font-size:9px;color:#6b7280">'+upd+'</td></tr>';}).join('');}
    // Stats
    var el=document.getElementById('bpmInfo');if(el){var parts=['🧵 Bộ Phận May'];if(_bpm.filter.year)parts.push('📆 '+_bpm.filter.year);if(_bpm.filter.status==='incomplete')parts.push('⏳ Chưa May Xong');if(_bpm.filter.month)parts.push('🗓️ T'+_bpm.filter.month);if(_bpm.filter.sewer_id==='none')parts.push('👤 Chưa phân công');
    el.innerHTML='<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700">'+parts.join(' <span style="opacity:0.5;margin:0 6px">•</span> ')+' — <span style="color:#99f6e4;font-weight:900">'+tot+'</span> đơn</div>';}
    var sc=document.getElementById('bpmStats');if(sc){
    var prog=all.filter(function(r){return r.is_reported&&!r.done_date;}).length,done=all.filter(function(r){return r.done_date;}).length,appr=all.filter(function(r){return r.salary_approved;}).length;
    sc.innerHTML='<div style="background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #0d948830"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">📦 TỔNG</div><div style="font-size:15px;font-weight:900">'+tot+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #3b82f630"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">🔄 ĐANG MAY</div><div style="font-size:15px;font-weight:900">'+prog+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #05966930"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">✅ XONG</div><div style="font-size:15px;font-weight:900">'+done+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #f59e0b30"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">💰 LƯƠNG</div><div style="font-size:15px;font-weight:900">'+appr+'</div></div>';}
}

async function _bpmTog(id,action){try{await apiCall('/api/sewing/toggle/'+id,'POST',{action});showToast('✅ Cập nhật');await _bpmLoadAll();}catch(e){showToast(e.message||'Lỗi','error');}}
function _bpmErr(id){if(typeof navigate==='function'){navigate('don-loi-khach-hang');showToast('📋 Chuyển sang Đơn Lỗi');}}
function _bpmView(id){
    var r=_bpm.records.find(function(x){return x.id===id;});
    if(!r)return;
    var ia=[]; try { ia=JSON.parse(r.finish_images||'[]'); } catch(e){}
    if(!ia.length) return showToast('Không có ảnh', 'warning');
    
    var html = '<div style="padding:20px;font-family:\'Inter\',sans-serif">';
    html += '<h3 style="margin:0 0 16px;color:#0f172a;font-size:15px;font-weight:800">📸 Ảnh Kiểm Tra - Đơn #' + r.id + '</h3>';
    html += '<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-bottom:20px;max-height:60vh;overflow-y:auto">';
    ia.forEach(function(src) {
        html += '<a href="' + src + '" target="_blank" title="Click để xem ảnh gốc"><img src="' + src + '" style="width:120px;height:120px;object-fit:cover;border-radius:10px;border:2px solid #e2e8f0;transition:all 0.2s" onmouseover="this.style.transform=\'scale(1.05)\';this.style.borderColor=\'#0d9488\'" onmouseout="this.style.transform=\'scale(1)\';this.style.borderColor=\'#e2e8f0\'"></a>';
    });
    html += '</div>';
    html += '<div style="text-align:right"><button onclick="document.getElementById(\'_bpmImgOverlay\').remove()" style="padding:8px 20px;background:#f1f5f9;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;color:#475569">Đóng</button></div>';
    html += '</div>';

    var old = document.getElementById('_bpmImgOverlay'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:80px;animation:qlxFadeIn .2s;transition:opacity .25s ease';
    ov.id = '_bpmImgOverlay';
    ov.innerHTML = '<div style="background:#fff;border-radius:16px;width:500px;max-width:95vw;box-shadow:0 25px 50px rgba(0,0,0,0.25);animation:qlxSlideUp .3s">' + html + '</div>';
    document.body.appendChild(ov);
}
function _bpmEdit(id){showToast('✏️ Chức năng edit chi tiết — phát triển thêm');}

// ========== GIA CÔNG MAY MANAGEMENT (Giám Đốc only) ==========
async function _bpmManageContractors() {
    try {
        var res = await apiCall('/api/sewing/contractors');
        var cons = res.contractors || [];

        var html = '<div style="padding:20px;font-family:\'Inter\',sans-serif">';
        html += '<h3 style="margin:0 0 16px;color:#0f172a">🏭 Quản Lý Gia Công May</h3>';

        // Add new form
        html += '<div style="background:#f8fafc;border-radius:10px;padding:14px;margin-bottom:20px;border:1px solid #e2e8f0">';
        html += '<div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:8px">➕ Thêm Gia Công May Mới</div>';
        html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">';
        html += '<input id="_bpmConName" placeholder="Tên gia công..." style="flex:1;min-width:150px;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px">';
        html += '<input id="_bpmConPhone" placeholder="SĐT (tuỳ chọn)" style="width:120px;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px">';
        html += '<input id="_bpmConNotes" placeholder="Ghi chú" style="width:150px;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px">';
        html += '<button onclick="_bpmConAdd()" style="padding:8px 16px;background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer">Thêm</button>';
        html += '</div></div>';

        // List existing
        if (cons.length) {
            html += '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#f1f5f9">';
            html += '<th style="padding:8px;text-align:left">#</th><th style="padding:8px;text-align:left">Tên</th><th style="padding:8px;text-align:left">SĐT</th><th style="padding:8px;text-align:left">Ghi chú</th><th style="padding:8px;text-align:center">Thao tác</th></tr></thead><tbody>';
            cons.forEach(function(c, i) {
                html += '<tr style="border-bottom:1px solid #e2e8f0">';
                html += '<td style="padding:8px;color:#94a3b8;font-weight:700">' + (i+1) + '</td>';
                html += '<td style="padding:8px;font-weight:700;color:#1e293b">🏭 ' + c.name + '</td>';
                html += '<td style="padding:8px;color:#6b7280">' + (c.phone || '—') + '</td>';
                html += '<td style="padding:8px;color:#6b7280;max-width:120px;overflow:hidden;text-overflow:ellipsis">' + (c.notes || '—') + '</td>';
                html += '<td style="padding:8px;text-align:center">';
                html += '<button onclick="_bpmConDel(' + c.id + ')" style="padding:4px 10px;border:1px solid #fca5a5;border-radius:6px;font-size:10px;cursor:pointer;background:#fef2f2;color:#dc2626;font-weight:600">🗑️ Xóa</button>';
                html += '</td></tr>';
            });
            html += '</tbody></table>';
        } else {
            html += '<div style="text-align:center;padding:30px;color:#94a3b8;font-size:13px">Chưa có Gia Công May nào</div>';
        }

        html += '<div style="padding:16px 0 0;text-align:right"><button onclick="document.getElementById(\'_bpmConOverlay\').remove()" style="padding:8px 20px;background:#f1f5f9;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;color:#475569">Đóng</button></div>';
        html += '</div>';

        var old = document.getElementById('_bpmConOverlay'); if (old) old.remove();
        var ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:40px;overflow-y:auto;animation:qlxFadeIn .2s;transition:opacity .25s ease';
        ov.id = '_bpmConOverlay';
        ov.innerHTML = '<div style="background:#fff;border-radius:16px;width:650px;max-width:95vw;max-height:85vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);animation:qlxSlideUp .3s;margin-bottom:40px">' + html + '</div>';
        document.body.appendChild(ov);
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function _bpmConAdd() {
    var name = (document.getElementById('_bpmConName') || {}).value || '';
    var phone = (document.getElementById('_bpmConPhone') || {}).value || '';
    var notes = (document.getElementById('_bpmConNotes') || {}).value || '';
    if (!name.trim()) return showToast('Nhập tên gia công', 'error');
    try {
        await apiCall('/api/sewing/contractors', 'POST', { name: name.trim(), phone: phone.trim(), notes: notes.trim() });
        showToast('✅ Đã thêm Gia Công May');
        _bpmManageContractors();
    } catch(e) { showToast(e.message, 'error'); }
}

async function _bpmConDel(id) {
    if (!confirm('Xóa Gia Công May này?')) return;
    try {
        await apiCall('/api/sewing/contractors/' + id, 'DELETE');
        showToast('✅ Đã xóa');
        _bpmManageContractors();
    } catch(e) { showToast(e.message, 'error'); }
}

async function _bpmAssignTeam(recordId) {
    try {
        var res = await apiCall('/api/sewing/teams');
        var teams = res.teams || [];
        var rec = _bpm.records.find(function(x) { return x.id === recordId; });
        if (!rec) return;

        var currentTeamId = rec.sewing_team_id || '';

        var opts = teams.map(function(t) {
            var selected = String(t.id) === String(currentTeamId) ? 'selected' : '';
            return '<option value="' + t.id + '" ' + selected + '>' + t.name + '</option>';
        }).join('');

        var html = '<div style="padding:20px;font-family:\'Inter\',sans-serif;background-color:#ffffff;color:#1e293b;border-radius:16px">';
        html += '<h3 style="margin:0 0 16px;color:#0d9488;font-size:15px;font-weight:800">👥 Phân Tổ May</h3>';
        
        html += '<div style="margin-bottom:12px"><label style="font-size:10px;font-weight:800;color:#475569;display:block;margin-bottom:4px">MẶT HÀNG / ĐƠN</label>';
        html += '<input type="text" value="' + (rec.product_name || rec.order_code || 'N/A').replace(/"/g, '&quot;') + '" readonly style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:12px;font-weight:700;color:#1e293b;background:#f8fafc;cursor:not-allowed"></div>';

        html += '<div style="margin-bottom:20px"><label style="font-size:10px;font-weight:800;color:#475569;display:block;margin-bottom:4px">CHỌN TỔ/TEAM MAY</label>';
        html += '<select id="_bpmAssignTeamSelect" class="form-control" style="width:100%;padding:8px 10px;border-radius:8px;font-size:12px;background:#ffffff;color:#1e293b;border:1.5px solid #cbd5e1"><option value="">-- Chưa Phân Tổ --</option>' + opts + '</select></div>';

        html += '<div style="display:flex;justify-content:flex-end;gap:12px">';
        html += '<button class="btn btn-secondary" style="padding:6px 14px;font-size:11px;background-color:#ffffff;border:1px solid #cbd5e1;color:#475569" onclick="document.getElementById(\'_bpmTeamOverlay\').remove()">Hủy</button>';
        html += '<button onclick="_bpmDoAssignTeam(' + recordId + ')" style="background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;border:none;padding:6px 18px;border-radius:8px;font-weight:700;font-size:11px;cursor:pointer">💾 Lưu Phân Tổ</button>';
        html += '</div></div>';

        var old = document.getElementById('_bpmTeamOverlay'); if (old) old.remove();
        var ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:100px;animation:qlxFadeIn .2s;transition:opacity .25s ease';
        ov.id = '_bpmTeamOverlay';
        ov.innerHTML = '<div style="background:#ffffff;border-radius:16px;width:380px;max-width:95vw;box-shadow:0 25px 50px rgba(0,0,0,0.15);border:1px solid #e2e8f0;animation:qlxSlideUp .3s">' + html + '</div>';
        document.body.appendChild(ov);
    } catch(e) {
        showToast('Lỗi: ' + e.message, 'error');
    }
}



async function _bpmDoAssignTeam(recordId) {
    var teamId = document.getElementById('_bpmAssignTeamSelect').value;
    try {
        await apiCall('/api/sewing/records/' + recordId + '/field', 'PATCH', { field: 'sewing_team_id', value: teamId ? parseInt(teamId) : null });
        var overlay = document.getElementById('_bpmTeamOverlay'); if (overlay) overlay.remove();
        showToast('✅ Đã phân tổ may');
        await _bpmLoadAll();
    } catch(e) {
        showToast(e.message, 'error');
    }
}

async function _bpmShowHandoverModal(recordId) {
    try {
        var rec = _bpm.records.find(function(x) { return x.id === recordId; });
        if (!rec) return;

        if (!_bpm.teams) {
            var res = await apiCall('/api/sewing/teams');
            _bpm.teams = res.teams || [];
        }

        var currentTeamId = rec.sewing_team_id || '';

        var html = '<div style="padding: 24px; font-family: \'Inter\', sans-serif;">';
        
        // Header
        html += '<div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px;">';
        html += '  <h3 style="margin: 0; color: #0d9488; font-size: 16px; font-weight: 800; display: flex; align-items: center; gap: 8px;">📋 Bàn Giao Đơn Hàng May</h3>';
        html += '  <span style="font-size: 11px; font-weight: 700; background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 20px;">Mã số: #' + rec.id + '</span>';
        html += '</div>';

        // Order Details (Grid format)
        html += '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px; font-size: 12px;">';
        
        html += '  <div style="grid-column: span 2;">';
        html += '    <div style="font-weight: 800; color: #64748b; margin-bottom: 2px;">TÊN SẢN PHẨM / ĐƠN HÀNG</div>';
        var priority = (rec.shipping_priority || 'CHUẨN').toUpperCase();
        var priBadge = '';
        if (priority === 'GẤP') {
            priBadge = '<span style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-right: 6px;">Gấp</span>';
        }
        html += '    <div style="font-weight: 700; color: #0f172a; font-size: 13px;">' + priBadge + (rec.product_name || rec.order_code || '—') + '</div>';
        html += '  </div>';

        html += '  <div>';
        html += '    <div style="font-weight: 800; color: #64748b; margin-bottom: 2px;">SỐ LƯỢNG</div>';
        html += '    <div style="font-weight: 700; color: #0d9488; font-size: 13px;">' + _bpmFN(rec.quantity) + ' sản phẩm</div>';
        html += '  </div>';

        html += '  <div>';
        html += '    <div style="font-weight: 800; color: #64748b; margin-bottom: 2px;">LƯƠNG</div>';
        html += '    <div style="font-weight: 700; color: #f59e0b; font-size: 13px;">' + _bpmFN(rec.salary) + ' đ</div>';
        html += '  </div>';

        html += '  <div>';
        html += '    <div style="font-weight: 800; color: #64748b; margin-bottom: 2px;">NGÀY DỰ KIẾN</div>';
        html += '    <div style="font-weight: 700; color: #475569;">' + _bpmFD(rec.expected_date) + '</div>';
        html += '  </div>';

        html += '  <div>';
        html += '    <div style="font-weight: 800; color: #64748b; margin-bottom: 2px;">QLX HẸN RA</div>';
        html += '    <div style="font-weight: 700; color: #475569;">' + _bpmFD(rec.handover_date) + '</div>';
        html += '  </div>';

        html += '  <div style="grid-column: span 2;">';
        html += '    <div style="font-weight: 800; color: #64748b; margin-bottom: 2px;">CHI TIẾT MAY</div>';
        html += '    <div style="color: #334155; line-height: 1.4; background: #fff; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 11px;">' + (rec.sewing_details || '—') + '</div>';
        html += '  </div>';

        html += '  <div style="grid-column: span 2;">';
        html += '    <div style="font-weight: 800; color: #64748b; margin-bottom: 2px;">GHI CHÚ / KK / MAY CHUNG</div>';
        html += '    <div style="color: #475569;">';
        if (rec.notes) html += '📌 <b>Ghi chú:</b> ' + rec.notes + '<br>';
        if (rec.inventory_notes) html += '📦 <b>KK:</b> ' + rec.inventory_notes + '<br>';
        if (rec.shared_sewing) html += '🪡 <b>May chung:</b> ' + rec.shared_sewing;
        if (!rec.notes && !rec.inventory_notes && !rec.shared_sewing) html += '—';
        html += '    </div>';
        html += '  </div>';

        html += '</div>';

        // Handover Teams Selection
        html += '<div>';
        html += '  <div style="font-size: 12px; font-weight: 800; color: #1e293b; margin-bottom: 12px;">';
        html += '    <span>🪡 BÀN GIAO CHO TEAM MAY:</span>';
        html += '  </div>';

        html += '  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 24px;">';
        
        var noneActive = !currentTeamId;
        html += '    <div class="bpm-team-card' + (noneActive ? ' active' : '') + '" onclick="_bpmSelectTeam(null)" id="team_card_none" style="padding: 12px; border-radius: 10px; border: 2px solid ' + (noneActive ? '#ef4444' : '#e2e8f0') + '; background: ' + (noneActive ? '#fef2f2' : '#fff') + '; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px;">';
        html += '      <div style="width: 18px; height: 18px; border-radius: 50%; border: 2px solid ' + (noneActive ? '#ef4444' : '#cbd5e1') + '; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: #fff;">';
        if (noneActive) html += '        <div style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444;"></div>';
        html += '      </div>';
        html += '      <div style="font-size: 12px; font-weight: 700; color: ' + (noneActive ? '#b91c1c' : '#475569') + '">❌ Chưa Bàn Giao</div>';
        html += '    </div>';

        _bpm.teams.forEach(function(t) {
            var isCurrent = String(t.id) === String(currentTeamId);
            html += '    <div class="bpm-team-card' + (isCurrent ? ' active' : '') + '" onclick="_bpmSelectTeam(' + t.id + ')" id="team_card_' + t.id + '" style="padding: 12px; border-radius: 10px; border: 2px solid ' + (isCurrent ? '#0d9488' : '#e2e8f0') + '; background: ' + (isCurrent ? '#f0fdf4' : '#fff') + '; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px;">';
            html += '      <div style="width: 18px; height: 18px; border-radius: 50%; border: 2px solid ' + (isCurrent ? '#0d9488' : '#cbd5e1') + '; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: #fff;">';
            if (isCurrent) html += '        <div style="width: 8px; height: 8px; border-radius: 50%; background: #0d9488;"></div>';
            html += '      </div>';
            html += '      <div style="font-size: 12px; font-weight: 700; color: ' + (isCurrent ? '#0f766e' : '#1e293b') + '">👥 ' + t.name + '</div>';
            html += '    </div>';
        });

        html += '  </div>';
        html += '</div>';

        html += '<input type="hidden" id="_bpmSelectedTeamId" value="' + currentTeamId + '">';
        html += '<div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #e2e8f0; padding-top: 16px;">';
        html += '  <button class="btn btn-secondary" style="padding: 8px 18px; font-size: 12px; font-weight: 700; background-color: #f1f5f9; border: none; color: #475569;" onclick="document.getElementById(\'_bpmHandoverOverlay\').remove()">Hủy</button>';
        html += '  <button onclick="_bpmSaveHandover(' + rec.id + ')" style="background: linear-gradient(135deg, #0d9488, #14b8a6); color: #fff; border: none; padding: 8px 24px; border-radius: 8px; font-weight: 800; font-size: 12px; cursor: pointer; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);">💾 Lưu Bàn Giao</button>';
        html += '</div>';

        html += '</div>';

        var old = document.getElementById('_bpmHandoverOverlay'); if (old) old.remove();
        var ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:40px;overflow-y:auto;animation:qlxFadeIn .2s;transition:opacity .25s ease';
        ov.id = '_bpmHandoverOverlay';
        ov.innerHTML = '<div style="background:#ffffff;border-radius:16px;width:550px;max-width:95vw;box-shadow:0 25px 50px rgba(0,0,0,0.15);border:1px solid #e2e8f0;animation:qlxSlideUp .3s;margin-bottom:40px">' + html + '</div>';
        document.body.appendChild(ov);
    } catch(e) {
        showToast('Lỗi: ' + e.message, 'error');
    }
}

function _bpmSelectTeam(teamId) {
    document.getElementById('_bpmSelectedTeamId').value = teamId || '';

    var cards = document.querySelectorAll('.bpm-team-card');
    cards.forEach(function(c) {
        c.classList.remove('active');
        c.style.borderColor = '#e2e8f0';
        c.style.background = '#fff';
        
        var textEl = c.querySelector('div:last-child');
        if (textEl) textEl.style.color = c.id === 'team_card_none' ? '#475569' : '#1e293b';

        var radioOuter = c.firstElementChild;
        if (radioOuter) {
            radioOuter.style.borderColor = '#cbd5e1';
            radioOuter.innerHTML = '';
        }
    });

    var targetId = teamId ? 'team_card_' + teamId : 'team_card_none';
    var activeCard = document.getElementById(targetId);
    if (activeCard) {
        activeCard.classList.add('active');
        var activeColor = teamId ? '#0d9488' : '#ef4444';
        var activeBg = teamId ? '#f0fdf4' : '#fef2f2';
        var textColor = teamId ? '#0f766e' : '#b91c1c';
        
        activeCard.style.borderColor = activeColor;
        activeCard.style.background = activeBg;
        
        var textEl = activeCard.querySelector('div:last-child');
        if (textEl) textEl.style.color = textColor;

        var radioOuter = activeCard.firstElementChild;
        if (radioOuter) {
            radioOuter.style.borderColor = activeColor;
            radioOuter.innerHTML = '<div style="width: 8px; height: 8px; border-radius: 50%; background: ' + activeColor + ';"></div>';
        }
    }
}

async function _bpmSaveHandover(recordId) {
    var teamId = document.getElementById('_bpmSelectedTeamId').value;
    try {
        await apiCall('/api/sewing/records/' + recordId + '/field', 'PATCH', { 
            field: 'sewing_team_id', 
            value: teamId ? parseInt(teamId) : null 
        });

        var action = teamId ? 'report' : 'undo_report';
        await apiCall('/api/sewing/toggle/' + recordId, 'POST', { action: action });

        var overlay = document.getElementById('_bpmHandoverOverlay'); if (overlay) overlay.remove();
        showToast('✅ Đã bàn giao đơn hàng');
        await _bpmLoadAll();
    } catch(e) {
        showToast(e.message, 'error');
    }
}
