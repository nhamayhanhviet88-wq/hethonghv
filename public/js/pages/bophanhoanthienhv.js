// ========== CẮT CHỈ & HOÀN THIỆN — Desktop SPA ==========
var _bpht={records:[],tree:null,filter:{year:null,month:null,finisher_id:null},search:'',page:1,statusFilter:'all'};
var _bphtOpen={};
var _bphtState={currentRecordId:null,finishImages:[],staff:[]};
var _bphtRemindCooldown={};

function renderBophanhoanthienPage(content){
    if(!document.getElementById('_bphtS')){var st=document.createElement('style');st.id='_bphtS';
    st.textContent='.bpht-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden}.bpht-sb{width:270px;min-width:270px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto}.bpht-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;padding:16px}.bpht-main>*{flex-shrink:0}'
    +'.bpht-sb-title{font-size:13px;font-weight:800;padding:16px;border-bottom:1px solid var(--gray-200);text-align:center;color:#059669}'
    +'.bpht-sb-total{padding:12px 16px;font-size:13px;font-weight:800;display:flex;justify-content:space-between;cursor:pointer;transition:all 0.15s}'
    +'.bpht-sb-total.active{background:linear-gradient(135deg,#059669,#10b981);color:#fff}'
    +'.bpht-sb-total:not(.active){background:#f8fafc;color:#334155;border-bottom:1px solid #e2e8f0}'
    +'.bpht-sb-unassigned{padding:12px 16px;font-size:13px;font-weight:800;display:flex;justify-content:space-between;cursor:pointer;transition:all 0.15s}'
    +'.bpht-sb-unassigned.active{background:linear-gradient(135deg,#ef4444,#b91c1c);color:#fff}'
    +'.bpht-sb-unassigned:not(.active){background:#f8fafc;color:#334155;border-bottom:1px solid #e2e8f0}'
    +'.bpht-sb-finisher{padding:8px 16px;font-weight:800;font-size:12px;color:var(--navy);cursor:pointer;display:flex;justify-content:space-between;background:#f8fafc;border-bottom:1px solid var(--gray-200);transition:all 0.15s}'
    +'.bpht-sb-finisher:hover{background:#f1f5f9}'
    +'.bpht-sb-finisher.active{background:#d1fae5;color:#059669}'
    +'.bpht-sb-month{padding:6px 16px 6px 28px;font-size:11px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;border-bottom:1px solid #f0f0f0;color:#059669}'
    +'.bpht-sb-month:hover{background:#ecfdf5}.bpht-sb-month.active{background:#d1fae5;font-weight:800}'
    +'.bpht-sb-item{padding:5px 16px 5px 42px;font-size:10px;font-weight:600;cursor:pointer;display:flex;justify-content:space-between;border-bottom:1px solid #fafafa;color:#64748b}'
    +'.bpht-sb-item:hover{background:#ecfdf5}.bpht-sb-item.active{background:#d1fae5;color:#059669;font-weight:800}'
    +'.bpht-ib{width:26px;height:26px;border-radius:6px;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:12px;transition:all .15s;margin:0 1px}'
    +'.bpht-ib:hover{transform:scale(1.15);box-shadow:0 2px 8px rgba(0,0,0,0.12)}'
    +'.bpht-ib.on-ok{background:#d1fae5;border-color:#10b981}.bpht-ib.on-err{background:#fee2e2;border-color:#ef4444}'
    +'.bpht-badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:800;letter-spacing:.5px}'
    +'.bpht-badge.gap{background:#fee2e2;color:#dc2626}.bpht-badge.gui{background:#dbeafe;color:#2563eb}.bpht-badge.chuan{background:#d1fae5;color:#059669}'
    +'.bpht-progress{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:800}'
    +'.qlx-cl-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px}'
    +'.qlx-cl-popup{background:#fff;border-radius:16px;box-shadow:0 25px 50px rgba(0,0,0,0.25);overflow:hidden;animation:qlxSlideUp .3s}'
    +'@keyframes qlxSlideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}'
    +'@media(max-width:768px){.bpht-sb{display:none}}'
    +'.bpht-pag-btn { background: #ffffff; border: 1.5px solid #cbd5e1; color: #334155; padding: 6px 14px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 4px; }'
    +'.bpht-pag-btn:hover:not(:disabled) { background: #f1f5f9; border-color: #94a3b8; color: #0f172a; }'
    +'.bpht-pag-btn-num { background: #ffffff; border: 1.5px solid #cbd5e1; color: #334155; width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; }'
    +'.bpht-pag-btn-num:hover { background: #f1f5f9; border-color: #94a3b8; color: #0f172a; }'
    +'.bpht-pag-btn-num.active { background: #059669; border-color: #059669; color: #ffffff; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.25); }';
    document.head.appendChild(st);}
    
    var isGD = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';
    var setupBtn2 = isGD ? '<button onclick="_bphtDisplaySetup()" style="padding:6px 12px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;color:#334155;transition:all 0.15s;margin-right:8px;" onmouseover="this.style.borderColor=\'#059669\';this.style.color=\'#059669\';" onmouseout="this.style.borderColor=\'#cbd5e1\';this.style.color=\'#334155\';">⚙️ Setup Hoàn Thiện</button>' : '';
    var setupBtn = isGD ? (setupBtn2 + '<button onclick="_bphtChecklistSetup()" style="padding:6px 12px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;color:#334155;transition:all 0.15s;" onmouseover="this.style.borderColor=\'#059669\';this.style.color=\'#059669\';" onmouseout="this.style.borderColor=\'#cbd5e1\';this.style.color=\'#334155\';">⚙️ Setup Checklist Hoàn Thiện</button>') : '';

    content.innerHTML='<div class="bpht-wrap"><div class="bpht-sb" id="bphtSb"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="bpht-main">'
    +'<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center"><div style="display:flex;flex-direction:column;gap:6px;align-items:flex-start"><div id="bphtInfo" style="font-size:12px"></div><input id="bphtSearch" placeholder="🔍 Tìm SP / CSKH..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:200px;outline:none"></div><div id="bphtStats" style="display:flex;gap:10px;flex:1;justify-content:center"></div>'+setupBtn+'</div>'
    +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:11px;white-space:nowrap" id="bphtTable"><thead><tr style="background:var(--gray-800)">'
    +'<th>STT</th><th>✅</th><th>⚠️</th><th>Hạn gửi hàng</th><th>Hoàn Thiện</th><th>Tiến Độ</th><th>Tên SP</th><th>CSKH</th><th>SL</th><th>NV HT</th><th>NV May</th><th>Ảnh</th><th>TC Gửi</th><th>Cập Nhật</th>'
    +'</tr></thead><tbody id="bphtTb"><tr><td colspan="14" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div></div></div>';
    var _t;document.getElementById('bphtSearch').addEventListener('input',function(){clearTimeout(_t);_t=setTimeout(function(){_bpht.page=1;_bpht.search=document.getElementById('bphtSearch').value||'';_bphtRender();},300);});
    _bphtLoadAll();
}

async function _bphtLoadAll(){try{var tR=await apiCall('/api/finishing/tree');_bpht.tree=tR;_bphtRenderSb();await _bphtLoadRecs();}catch(e){console.error('[BPHT]',e);}}

function _bphtRenderSb(){var sb=document.getElementById('bphtSb');if(!sb||!_bpht.tree)return;var t=_bpht.tree,f=_bpht.filter;
var h='<div class="bpht-sb-title">────── ✅ Cắt Chỉ & Hoàn Thiện ──────</div>';

// Calculate unassigned total globally
var unassignedTotal = 0;
if(t.tree){
    t.tree.forEach(function(yr){
        if(yr.months){
            yr.months.forEach(function(mo){
                if(mo.finishers){
                    mo.finishers.forEach(function(p){
                        if(!p.id || p.id === 'unassigned'){
                            unassignedTotal += p.count;
                        }
                    });
                }
            });
        }
    });
}

var totalActive = !f.year && !f.month && !f.finisher_id;
var unassignedActive = !f.year && !f.month && f.finisher_id === 'unassigned';

h+='<div class="bpht-sb-total '+(totalActive?'active':'')+'" onclick="_bphtFilter()"><span>📦 Tổng đơn</span><span style="font-size:16px">'+(t.total||0)+'</span></div>';
h+='<div class="bpht-sb-unassigned '+(unassignedActive?'active':'')+'" onclick="_bphtFilter(null,null,\'unassigned\')"><span>⚠️ Chưa PC & Hoàn Thiện</span><span style="font-size:16px">'+unassignedTotal+'</span></div>';

// Pivot tree to group by finisher
var finishers = {};
if(t.tree){
    t.tree.forEach(function(yr){
        if(yr.months){
            yr.months.forEach(function(mo){
                if(mo.finishers){
                    mo.finishers.forEach(function(p){
                        var pId = p.id || 'unassigned';
                        var pName = p.name || 'Chưa phân công';
                        if(!finishers[pId]){
                            finishers[pId] = { id:pId, name:pName, count:0, months:{} };
                        }
                        finishers[pId].count += p.count;
                        var mKey = yr.year + '_' + mo.month;
                        if(!finishers[pId].months[mKey]){
                            finishers[pId].months[mKey] = { year:yr.year, month:mo.month, count:0 };
                        }
                        finishers[pId].months[mKey].count += p.count;
                    });
                }
            });
        }
    });
}

var finishersList = Object.values(finishers).filter(function(fin){
    return fin.id !== 'unassigned';
});
finishersList.sort(function(a,b){
    return a.name.localeCompare(b.name, 'vi');
});

finishersList.forEach(function(fin){
    var isOpen = !!_bphtOpen['f_'+fin.id];
    var finActive = f.finisher_id == fin.id && !f.year && !f.month;
    
    h+='<div class="bpht-sb-finisher '+(finActive?'active':'')+'" onclick="event.stopPropagation();_bphtTgl(\'f_'+fin.id+'\');_bphtFilter(null,null,\''+fin.id+'\')">';
    h+='<span>'+(isOpen?'▼':'▶')+' 👤 '+fin.name+'</span>';
    h+='<span style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:2px 10px;border-radius:10px;font-size:10px">'+fin.count+'</span>';
    h+='</div>';

    if(isOpen){
        var monthsList = Object.values(fin.months);
        monthsList.sort(function(a,b){
            if(a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });
        monthsList.forEach(function(mo){
            var moActive = f.finisher_id == fin.id && f.year == mo.year && f.month == mo.month;
            h+='<div class="bpht-sb-month '+(moActive?'active':'')+'" onclick="event.stopPropagation();_bphtFilter('+mo.year+','+mo.month+',\''+fin.id+'\')">';
            h+='<span>🗓️ T'+String(mo.month).padStart(2,'0')+'/'+mo.year+'</span>';
            h+='<span>'+mo.count+'</span>';
            h+='</div>';
        });
    }
});

sb.innerHTML=h;}

function _bphtTgl(k){_bphtOpen[k]=!_bphtOpen[k];_bphtRenderSb();}
function _bphtFilter(y,m,f){_bpht.page=1;_bpht.statusFilter='all';_bpht.filter={year:y||null,month:m||null,finisher_id:f!==undefined?f:null};_bphtRenderSb();_bphtLoadRecs();}
function _bphtSetStatusFilter(status){_bpht.statusFilter=status;_bpht.page=1;_bphtRender();}

async function _bphtLoadRecs(){var f=_bpht.filter,qs='?_=1';
if(f.year)qs+='&year='+f.year;if(f.month)qs+='&month='+f.month;if(f.finisher_id)qs+='&finisher_id='+f.finisher_id;
try{var res=await apiCall('/api/finishing/records'+qs);_bpht.records=res.records||[];_bphtRender();}catch(e){console.error('[BPHT]',e);}}

function _bphtFD(d){if(!d)return'—';try{var p=d.split('T')[0].split('-');return p[2]+'/'+p[1]+'/'+p[0];}catch(e){return d;}}
function _bphtGetCompletedTime(r) {
    if (!r.is_completed) return '—';
    if (r.completed_at) {
        try {
            var dt = new Date(r.completed_at);
            var hours = String(dt.getHours()).padStart(2, '0');
            var minutes = String(dt.getMinutes()).padStart(2, '0');
            var day = String(dt.getDate()).padStart(2, '0');
            var month = String(dt.getMonth() + 1).padStart(2, '0');
            return hours + ':' + minutes + ' ' + day + '/' + month;
        } catch(e) {}
    }
    if (r.done_date) {
        try {
            var p = r.done_date.split('T')[0].split('-');
            return p[2] + '/' + p[1];
        } catch(e) {}
    }
    return '—';
}

function _bphtGetRaDukien(r) {
    var targetDateStr = r.expected_ship_date || r.expected_date;
    if (!targetDateStr) return '—';
    try {
        var dt = new Date(targetDateStr);
        var day = String(dt.getDate()).padStart(2, '0');
        var month = String(dt.getMonth() + 1).padStart(2, '0');
        if (r.shipping_standard === 'chuan') {
            var timeStr = '';
            if (r.standard_delivery_time) {
                timeStr = r.standard_delivery_time.trim();
            } else {
                var hrs = String(dt.getHours()).padStart(2, '0');
                var mins = String(dt.getMinutes()).padStart(2, '0');
                timeStr = hrs + ':' + mins;
            }
            return timeStr + ' ' + day + '/' + month;
        } else {
            return day + '/' + month;
        }
    } catch(e) {
        try {
            var p = targetDateStr.split('T')[0].split('-');
            return p[2] + '/' + p[1];
        } catch(ex) {
            return targetDateStr;
        }
    }
}

function _bphtProgress(exp, done) {
    if (!exp) return '<span class="bpht-progress" style="background:#f1f5f9;color:#94a3b8">— Chưa có DK</span>';
    var expD = new Date(exp.split('T')[0]), today = new Date();
    today.setHours(0,0,0,0); expD.setHours(0,0,0,0);
    if (done) {
        var doneD = new Date(done.split('T')[0]); doneD.setHours(0,0,0,0);
        var diff = Math.round((doneD - expD) / 86400000);
        if (diff < 0) return '<span class="bpht-progress" style="background:#d1fae5;color:#059669">⚡ Nhanh '+Math.abs(diff)+' ngày</span>';
        if (diff === 0) return '<span class="bpht-progress" style="background:#dbeafe;color:#2563eb">✅ Đúng hạn</span>';
        return '<span class="bpht-progress" style="background:#fee2e2;color:#dc2626">🔴 Trễ '+diff+' ngày</span>';
    }
    var diff2 = Math.round((expD - today) / 86400000);
    if (diff2 > 0) return '<span class="bpht-progress" style="background:#fef3c7;color:#d97706">⏳ Còn '+diff2+' ngày</span>';
    if (diff2 === 0) return '<span class="bpht-progress" style="background:#fef3c7;color:#f59e0b">⏰ Hôm nay</span>';
    return '<span class="bpht-progress" style="background:#fee2e2;color:#dc2626">🔴 Quá '+Math.abs(diff2)+' ngày</span>';
}

function _bphtShip(s) {
    if (s === 'gap') return '<span class="bpht-badge gap">🔴 GẤP</span>';
    if (s === 'gui') return '<span class="bpht-badge gui">📦 GỬI</span>';
    return '<span class="bpht-badge chuan">✅ CHUẨN</span>';
}

function _bphtCleanProdName(r) {
    if (!r) return 'Sản phẩm';
    var name = r.cut_product_name || r.product_name || '';
    if (!name) return 'Sản phẩm';
    var parts = name.split(/—/).map(function(p) { return p.trim(); }).filter(Boolean);
    var orderCode = r.order_code || '';
    var ticketPart = '';
    var prodNamePart = '';
    parts.forEach(function(p) {
        var upper = p.toUpperCase();
        if (orderCode && upper === orderCode.toUpperCase()) return;
        var ticketMatch = p.match(/(?:Phiếu\s*|P)(\d+)/i);
        if (ticketMatch) {
            if (!ticketPart) ticketPart = 'Phiếu ' + ticketMatch[1];
            return;
        }
        if (!prodNamePart) prodNamePart = p;
        else prodNamePart += ' — ' + p;
    });
    var res = [];
    if (orderCode) res.push(orderCode);
    if (ticketPart) res.push(ticketPart);
    if (prodNamePart) res.push(prodNamePart);
    else res.push(r.product_name || 'Sản phẩm');
    return res.join(' — ');
}

function _bphtGetOrderCodeWithTicket(r) {
    if (!r) return '';
    var orderCode = r.order_code || '';
    var name = r.cut_product_name || r.product_name || '';
    if (!name) return orderCode;
    var parts = name.split(/—/).map(function(p) { return p.trim(); }).filter(Boolean);
    var ticketPart = '';
    parts.forEach(function(p) {
        var ticketMatch = p.match(/(?:Phiếu\s*|P)(\d+)/i);
        if (ticketMatch && !ticketPart) {
            ticketPart = 'Phiếu ' + ticketMatch[1];
        }
    });
    if (ticketPart) {
        return orderCode + ' - ' + ticketPart;
    }
    return orderCode;
}

function _bphtRender(){
    var all=_bpht.records.slice();
    if(_bpht.search){var q=_bpht.search.toLowerCase();all=all.filter(function(r){return(r.cut_product_name||r.product_name||'').toLowerCase().indexOf(q)>=0||(r.cskh_name||'').toLowerCase().indexOf(q)>=0||(r.order_code||'').toLowerCase().indexOf(q)>=0;});}
    
    var totalCount = all.length;
    var uncompletedCount = all.filter(function(r){return !r.done_date;}).length;
    var completedCount = all.filter(function(r){return r.done_date;}).length;
    var errorCount = all.filter(function(r){return r.error_reported;}).length;

    var filtered = all;
    if (_bpht.statusFilter === 'uncompleted') {
        filtered = all.filter(function(r){return !r.done_date;});
    } else if (_bpht.statusFilter === 'completed') {
        filtered = all.filter(function(r){return r.done_date;});
    } else if (_bpht.statusFilter === 'error') {
        filtered = all.filter(function(r){return r.error_reported;});
    }

    var tot=filtered.length;
    var itemsPerPage = 100;
    var totalPages = Math.ceil(tot / itemsPerPage) || 1;
    
    if (!_bpht.page) _bpht.page = 1;
    if (_bpht.page > totalPages) _bpht.page = totalPages;
    if (_bpht.page < 1) _bpht.page = 1;
    
    var startIdx = (_bpht.page - 1) * itemsPerPage;
    var paginated = filtered.slice(startIdx, startIdx + itemsPerPage);
    
    var pagEl = document.getElementById('bphtPagination');
    if (!pagEl) {
        pagEl = document.createElement('div');
        pagEl.id = 'bphtPagination';
        pagEl.style.cssText = 'display:flex; justify-content:center; align-items:center; gap:12px; padding: 16px; border-top: 1px solid #e2e8f0; background: #ffffff;';
        var card = document.querySelector('.bpht-main .card');
        if (card) card.appendChild(pagEl);
    }
    
    var tb=document.getElementById('bphtTb');if(!tb)return;
    if(!filtered.length){
        tb.innerHTML='<tr><td colspan="14"><div class="empty-state"><div class="icon">✅</div><h3>Chưa có đơn hoàn thiện</h3></div></td></tr>';
        if (pagEl) pagEl.style.display = 'none';
    }else{
        if (pagEl) {
            pagEl.style.display = 'flex';
            pagEl.style.borderTop = '1px solid #e2e8f0';
            pagEl.style.padding = '16px';
            
            var pagesHtml = '';
            var maxVisiblePages = 5;
            var startPage = Math.max(1, _bpht.page - 2);
            var endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
            if (endPage - startPage < maxVisiblePages - 1) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }
            
            pagesHtml += '<button class="bpht-pag-btn" onclick="_bphtPrevPage()" '+(_bpht.page === 1 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : '')+'>&lt; Trước</button>';
            
            if (startPage > 1) {
                pagesHtml += '<button class="bpht-pag-btn-num" onclick="_bphtGoToPage(1)">1</button>';
                if (startPage > 2) {
                    pagesHtml += '<span style="color:#64748b; padding: 0 4px;">...</span>';
                }
            }
            
            for (var p = startPage; p <= endPage; p++) {
                var activeClass = p === _bpht.page ? 'active' : '';
                pagesHtml += '<button class="bpht-pag-btn-num '+activeClass+'" onclick="_bphtGoToPage('+p+')">'+p+'</button>';
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    pagesHtml += '<span style="color:#64748b; padding: 0 4px;">...</span>';
                }
                pagesHtml += '<button class="bpht-pag-btn-num" onclick="_bphtGoToPage('+totalPages+')">'+totalPages+'</button>';
            }
            
            pagesHtml += '<button class="bpht-pag-btn" onclick="_bphtNextPage()" '+(_bpht.page === totalPages ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : '')+'>Sau &gt;</button>';
            
            pagEl.innerHTML = '<div style="display:flex; justify-content:space-between; align-items:center; width:100%; font-family:\'Inter\',sans-serif;">'
                + '<div style="font-size:12px; color:#64748b; font-weight:600;">'
                + 'Hiển thị <strong>'+(startIdx + 1)+'</strong> - <strong>'+Math.min(startIdx + itemsPerPage, tot)+'</strong> trên tổng số <strong>'+tot+'</strong> đơn'
                + '</div>'
                + '<div style="display:flex; gap:6px; align-items:center;">'
                + pagesHtml
                + '</div>'
                + '</div>';
        }
        tb.innerHTML=paginated.map(function(r,i){
        var isSewerAssigned = !!(r.sewer_name && r.sewer_name.trim() && !r.sewer_name.includes('Chưa Phân Công'));
        var isQcOk = (r.is_qc_checked !== 0);
        
        var cI=r.is_completed?'✅':'⬜',cC=r.is_completed?' on-ok':'';
        var clickAction = r.is_completed ? `_bphtOpenCompleteModal(${r.id}, true)` : `_bphtOpenCompleteModal(${r.id})`;
        var nameClickAction = (r.is_completed || !isSewerAssigned || !isQcOk) ? `_bphtOpenCompleteModal(${r.id}, true)` : `_bphtOpenCompleteModal(${r.id})`;
        var eI=r.error_reported?'⚠️':'⬜',eC=r.error_reported?' on-err':'';
        
        if (r.is_completed || (isSewerAssigned && isQcOk)) {
            clickHtml = '<button class="bpht-ib'+cC+'" onclick="'+clickAction+'" title="Hoàn thành">'+cI+'</button>';
        } else {
            const labelText = !isSewerAssigned ? '⚠️ Chưa Phân Công' : '⚠️ Chưa Kiểm Tra Chất Lượng';
            clickHtml = '<div style="display:inline-flex; align-items:center; justify-content:center; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); color:#ef4444; font-size:9px; font-weight:700; padding:4px 8px; border-radius:6px; cursor:not-allowed; text-transform:uppercase;" title="' + labelText + '">' + labelText + '</div>';
        }
        errHtml = r.error_reported 
            ? '<button class="bpht-ib on-err" disabled style="cursor:default;opacity:0.8;transform:none;box-shadow:none" title="Đã báo lỗi">🚨</button>'
            : '<button class="bpht-ib" onclick="_bphtOpenErrorModal(' + r.id + ')" title="Báo lỗi">⚠️</button>';

        var completedTimeHtml = (r.is_completed || (isSewerAssigned && isQcOk)) 
            ? _bphtGetCompletedTime(r) 
            : (!isSewerAssigned ? '<span style="color:#ef4444;font-weight:700;">⚠️ Chưa Phân Công</span>' : '<span style="color:#ef4444;font-weight:700;">⚠️ Chưa Kiểm Tra Chất Lượng</span>');

        var imgs='—';try{var ia=JSON.parse(r.finish_images||'[]');if(ia.length){
            var t = Date.now();
            var thumbnails = ia.map(src => {
                const buster = src.includes('?') ? `&t=${t}` : `?t=${t}`;
                return `<img src="${src}${buster}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px; border: 1.5px solid #cbd5e1; cursor: pointer; transition: all 0.2s;" onclick="_bphtViewImages(${r.id})" onmouseover="this.style.transform='scale(1.15)';" onmouseout="this.style.transform='scale(1)';">`;
            }).join(' ');
            imgs = `<div style="display:flex; gap:4px; justify-content:center; align-items:center;">${thumbnails}</div>`;
        }}catch(e){}
        var upd='';if(r.last_update_at){upd=_bphtFD(r.last_update_at);if(r.last_update_by)upd+='<br><span style="color:#059669;font-size:9px">'+r.last_update_by+'</span>';}
        return '<tr><td style="text-align:center;font-weight:700;color:#94a3b8">'+(startIdx+i+1)+'</td>'
        +'<td style="text-align:center">'+clickHtml+'</td>'
        +'<td style="text-align:center">'+errHtml+'</td>'
        +'<td style="font-size:10px">'+_bphtGetRaDukien(r)+'</td>'
        +'<td style="font-size:10px;color:'+(r.is_completed?'#059669':(!isQcOk?'#ef4444':'#94a3b8'))+'">'+completedTimeHtml+'</td>'
        +'<td>'+_bphtProgress(r.expected_ship_date||r.expected_date, r.done_date)+'</td>'
        +'<td style="font-weight:600;white-space:normal;max-width:250px;word-break:break-word;"><a href="javascript:void(0)" onclick="'+nameClickAction+'" style="color:#2563eb;text-decoration:underline;cursor:pointer">'+_bphtCleanProdName(r)+'</a></td>'
        +'<td style="font-size:10px;color:#2563eb;font-weight:600">'+(r.cskh_name||'—')+'</td>'
        +'<td style="text-align:center;font-weight:700;color:#059669">'+(r.quantity||'—')+'</td>'
        +'<td style="font-size:10px;color:#059669;font-weight:600">'+(r.finisher_name||'—')+'</td>'
        +'<td style="font-size:10px;color:#6b7280">' + (r.contractor_id ? '<span style="color:#f59e0b;font-weight:700;">[GIA CÔNG]</span> ' : '') + (r.sewer_name || '<span style="color:#ef4444;font-weight:700;">Chưa Phân Công</span>') + '</td>'
        +'<td style="text-align:center;font-size:10px">'+imgs+'</td>'
        +'<td>'+_bphtShip(r.shipping_standard)+'</td>'
        +'<td style="font-size:9px;color:#6b7280">'+upd+'</td></tr>';}).join('');}
    var el=document.getElementById('bphtInfo');if(el){var parts=['✅ Cắt Chỉ & Hoàn Thiện'];if(_bpht.filter.year)parts.push('📆 '+_bpht.filter.year);if(_bpht.filter.month)parts.push('🗓️ T'+_bpht.filter.month);
    el.innerHTML='<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700">'+parts.join(' <span style="opacity:0.5;margin:0 6px">•</span> ')+' — <span style="color:#bbf7d0;font-weight:900">'+tot+'</span> đơn</div>';}
    var sc=document.getElementById('bphtStats');if(sc){
        var activeTotal = (_bpht.statusFilter === 'all');
        var activeUncompleted = (_bpht.statusFilter === 'uncompleted');
        var activeCompleted = (_bpht.statusFilter === 'completed');
        var activeError = (_bpht.statusFilter === 'error');

        sc.innerHTML = 
        '<div onclick="_bphtSetStatusFilter(\'all\')" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:8px 18px;border-radius:10px;min-width:110px;text-align:center;cursor:pointer;user-select:none;box-shadow:0 4px 15px rgba(5,150,105,0.2);transition:all .2s;' + (activeTotal ? 'transform:scale(1.06);box-shadow:0 8px 25px rgba(5,150,105,0.4);border:2px solid #ffffff;' : 'opacity:0.55;') + '" onmouseover="this.style.opacity=\'1\'" onmouseout="if(!' + activeTotal + ')this.style.opacity=\'0.55\'">'
            + '<div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">📦 TỔNG</div>'
            + '<div style="font-size:15px;font-weight:900">' + totalCount + '</div>'
        + '</div>'
        + '<div onclick="_bphtSetStatusFilter(\'uncompleted\')" style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;padding:8px 18px;border-radius:10px;min-width:110px;text-align:center;cursor:pointer;user-select:none;box-shadow:0 4px 15px rgba(37,99,235,0.2);transition:all .2s;' + (activeUncompleted ? 'transform:scale(1.06);box-shadow:0 8px 25px rgba(37,99,235,0.4);border:2px solid #ffffff;' : 'opacity:0.55;') + '" onmouseover="this.style.opacity=\'1\'" onmouseout="if(!' + activeUncompleted + ')this.style.opacity=\'0.55\'">'
            + '<div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">🔄 Chưa Hoàn Thiện</div>'
            + '<div style="font-size:15px;font-weight:900">' + uncompletedCount + '</div>'
        + '</div>'
        + '<div onclick="_bphtSetStatusFilter(\'completed\')" style="background:linear-gradient(135deg,#059669,#047857);color:#fff;padding:8px 18px;border-radius:10px;min-width:110px;text-align:center;cursor:pointer;user-select:none;box-shadow:0 4px 15px rgba(4,120,87,0.2);transition:all .2s;' + (activeCompleted ? 'transform:scale(1.06);box-shadow:0 8px 25px rgba(4,120,87,0.4);border:2px solid #ffffff;' : 'opacity:0.55;') + '" onmouseover="this.style.opacity=\'1\'" onmouseout="if(!' + activeCompleted + ')this.style.opacity=\'0.55\'">'
            + '<div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">✅ Đã Hoàn Thiện</div>'
            + '<div style="font-size:15px;font-weight:900">' + completedCount + '</div>'
        + '</div>'
        + '<div onclick="_bphtSetStatusFilter(\'error\')" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:8px 18px;border-radius:10px;min-width:110px;text-align:center;cursor:pointer;user-select:none;box-shadow:0 4px 15px rgba(239,68,68,0.2);transition:all .2s;' + (activeError ? 'transform:scale(1.06);box-shadow:0 8px 25px rgba(239,68,68,0.4);border:2px solid #ffffff;' : 'opacity:0.55;') + '" onmouseover="this.style.opacity=\'1\'" onmouseout="if(!' + activeError + ')this.style.opacity=\'0.55\'">'
            + '<div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">⚠️ LỖI</div>'
            + '<div style="font-size:15px;font-weight:900">' + errorCount + '</div>'
        + '</div>';
    }
}

async function _bphtTog(id,action){
    if (action === 'undo_complete') {
        if (!confirm('Bạn có chắc chắn muốn hoàn tác trạng thái hoàn thành?')) return;
    }
    try{
        await apiCall('/api/finishing/toggle/'+id,'POST',{action});
        showToast('✅ Cập nhật');
        await _bphtLoadAll();
    }catch(e){}
}

async function _bphtRemindQc(id) {
    if (_bphtRemindCooldown[id]) {
        showToast('⚠️ Bạn đã gửi yêu cầu nhắc QC cho đơn hàng này rồi. Vui lòng chờ!', 'error');
        return;
    }
    try {
        await apiCall('/api/finishing/records/' + id + '/remind-qc', 'POST');
        showToast('🔔 Đã gửi yêu cầu nhắc QC qua Telegram thành công!');
        _bphtRemindCooldown[id] = true;
        _bphtRender();
        setTimeout(function() {
            delete _bphtRemindCooldown[id];
            _bphtRender();
        }, 60000);
    } catch(e) {
        showToast(e.message || 'Lỗi gửi nhắc QC', 'error');
    }
}

function _bphtErr(){if(typeof navigate==='function'){navigate('don-loi-khach-hang');showToast('📋 Chuyển sang Đơn Lỗi');}}

// ========== IMAGE VIEW OVERLAY ==========
function _bphtViewImages(recordId) {
    const r = _bpht.records.find(x => x.id === recordId);
    if (!r) return;
    let images = [];
    try { images = JSON.parse(r.finish_images || '[]'); } catch(e) {}
    if (!images.length) return;
    
    let html = `
        <div id="bphtImageViewOverlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.85);backdrop-filter:blur(4px);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;" onclick="document.getElementById('bphtImageViewOverlay').remove()">
            <div style="position:relative;background:#fff;border-radius:16px;padding:24px;width:90vw;max-width:650px;max-height:85vh;overflow-y:auto;display:flex;flex-direction:column;gap:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);" onclick="event.stopPropagation()">
                <button onclick="document.getElementById('bphtImageViewOverlay').remove()" style="position:absolute;top:15px;right:15px;background:none;border:none;font-size:24px;cursor:pointer;font-weight:bold;color:#64748b;transition:all 0.15s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#64748b'">✕</button>
                <div style="width:100%;text-align:center;font-weight:800;color:#0f172a;margin-bottom:10px;font-size:15px;font-family:'Inter',sans-serif;">📷 Ảnh hoàn thiện đơn hàng #${r.order_code || r.id}</div>
                <div style="display:flex;flex-direction:column;gap:16px;">
    `;
    const t = Date.now();
    images.forEach(src => {
        const buster = src.includes('?') ? `&t=${t}` : `?t=${t}`;
        html += `
            <div style="border:1.5px solid #cbd5e1;border-radius:10px;overflow:hidden;width:100%;background:#f8fafc;display:flex;align-items:center;justify-content:center;padding:6px;box-sizing:border-box;">
                <img src="${src}${buster}" style="width:100%;max-height:60vh;object-fit:contain;border-radius:6px;">
            </div>
        `;
    });
    html += `
                </div>
            </div>
        </div>
    `;
    const old = document.getElementById('bphtImageViewOverlay'); if (old) old.remove();
    document.body.insertAdjacentHTML('beforeend', html);
}

function _bphtViewSingleImage(src) {
    const t = Date.now();
    const buster = src.includes('?') ? `&t=${t}` : `?t=${t}`;
    const html = `
        <div id="bphtSingleImageViewOverlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.85);backdrop-filter:blur(4px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;" onclick="document.getElementById('bphtSingleImageViewOverlay').remove()">
            <div style="position:relative;background:#fff;border-radius:16px;padding:24px;width:90vw;max-width:650px;max-height:85vh;overflow-y:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);" onclick="event.stopPropagation()">
                <button onclick="document.getElementById('bphtSingleImageViewOverlay').remove()" style="position:absolute;top:15px;right:15px;background:none;border:none;font-size:24px;cursor:pointer;font-weight:bold;color:#64748b;transition:all 0.15s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#64748b'">✕</button>
                <img src="${src}${buster}" style="width:100%;max-height:65vh;object-fit:contain;border-radius:8px;margin-top:12px;">
            </div>
        </div>
    `;
    const old = document.getElementById('bphtSingleImageViewOverlay'); if (old) old.remove();
    document.body.insertAdjacentHTML('beforeend', html);
}

// ========== COMPLETING CHECKLIST MODAL (Thợ Hoàn Thiện) ==========
async function _bphtOpenCompleteModal(recordId, readOnly = false) {
    const r = _bpht.records.find(x => x.id === recordId);
    if (!r) return;
    
    _bphtState.currentRecordId = recordId;
    _bphtState.finishImages = [];
    try {
        _bphtState.finishImages = JSON.parse(r.finish_images || '[]');
    } catch(e) {}

    // Fetch staff if not loaded
    if (!_bphtState.staff.length) {
        try {
            const res = await apiCall('/api/finishing/staff');
            _bphtState.staff = res.staff || [];
        } catch(e) {
            console.error('Lỗi tải nhân viên:', e);
        }
    }

    // Load templates & answers
    let templates = [];
    let answers = [];
    try {
        const res = await apiCall('/api/finishing/checklist/answers/' + recordId);
        templates = res.templates || [];
        answers = res.answers || [];
    } catch(e) {
        console.error('Lỗi tải checklist:', e);
    }

    const activeFinisherId = r.finisher_id || (window.currentUser ? window.currentUser.id : '');
    let staffOptions = '';
    _bphtState.staff.forEach(s => {
        const sel = activeFinisherId === s.id ? 'selected' : '';
        staffOptions += `<option value="${s.id}" ${sel}>${s.full_name} (${s.username})</option>`;
    });

    let imagesHtml = '';
    const t = Date.now();
    _bphtState.finishImages.forEach(src => {
        const buster = src.includes('?') ? `&t=${t}` : `?t=${t}`;
        imagesHtml += `
            <div style="position:relative; width:80px; height:80px; border:1px solid #cbd5e1; border-radius:8px; overflow:hidden;">
                <img src="${src}${buster}" style="width:100%; height:100%; object-fit:cover; cursor:pointer;" onclick="_bphtViewSingleImage('${src}')">
                ${readOnly ? '' : `<button onclick="_bphtDeleteImage('${src}')" style="position:absolute; top:2px; right:2px; background:rgba(0,0,0,0.6); color:#fff; border:none; border-radius:50%; width:18px; height:18px; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>`}
            </div>
        `;
    });

    let checklistHtml = '';
    if (templates.length > 0) {
        checklistHtml += '<div style="margin-top:16px; border-top:1px solid #e2e8f0; padding-top:16px;">';
        checklistHtml += '<h4 style="margin:0 0 12px; font-size:13px; color:#0f172a;">📋 CHECKLIST HOÀN THIỆN (Bắt buộc trả lời hết)</h4>';
        templates.forEach(q => {
            const ans = answers.find(a => a.template_id === q.id);
            const val = ans ? ans.answer_value : '';

            checklistHtml += `<div class="bpht-qc-question-row" data-id="${q.id}" data-type="${q.type}" data-content="${q.content.replace(/"/g, '&quot;')}" style="margin-bottom:12px; display:flex; flex-direction:column; gap:6px;">`;
            checklistHtml += `<div style="font-weight:700; font-size:12.5px; color:#334155;">${q.content} <span style="color:#ef4444;">*</span></div>`;

            if (q.type === 'yes_no') {
                const hasYes = val === 'yes' ? 'checked' : '';
                const hasNo = val === 'no' ? 'checked' : '';
                checklistHtml += `
                    <div style="display:flex; gap:24px; margin-top:4px;">
                        <label style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:${readOnly ? 'default' : 'pointer'}; color:#334155; user-select:none;">
                            <input type="radio" name="bpht_q_${q.id}" value="yes" ${hasYes} ${readOnly ? 'disabled' : ''} style="width:18px; height:18px; cursor:${readOnly ? 'default' : 'pointer'}; accent-color:#059669;"> Có
                        </label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:${readOnly ? 'default' : 'pointer'}; color:#334155; user-select:none;">
                            <input type="radio" name="bpht_q_${q.id}" value="no" ${hasNo} ${readOnly ? 'disabled' : ''} style="width:18px; height:18px; cursor:${readOnly ? 'default' : 'pointer'}; accent-color:#dc2626;"> Không
                        </label>
                    </div>
                `;
            } else if (q.type === 'percentage') {
                const pctVal = val !== '' ? val : '50';
                checklistHtml += `
                    <div style="display:flex; align-items:center; gap:12px; margin-top:4px;">
                        <input type="range" name="bpht_q_${q.id}" min="0" max="100" value="${pctVal}" ${readOnly ? 'disabled' : ''} style="flex:1; height:6px; border-radius:3px; accent-color:#059669; cursor:${readOnly ? 'default' : 'pointer'};" oninput="this.nextElementSibling.textContent = this.value + '%'">
                        <span style="font-size:14px; font-weight:800; color:#059669; min-width:45px; text-align:right;">${pctVal}%</span>
                    </div>
                `;
            } else {
                const cleanContent = q.content.toLowerCase().replace(/\s+/g, '');
                const isCountQuestion = cleanContent.includes('sốlượngđếmlàbaonhiêu') || cleanContent.includes('sơlượngđếmlàbaonhiêu') || cleanContent.includes('soluongdemlabaonhieu');
                const isPersonQuestion = cleanContent.includes('ailàngườiđếm') || cleanContent.includes('ailanguoidem') || cleanContent.includes('ngườiđếmsốlượng');
                const placeholderText = isPersonQuestion ? 'Nhập không chính xác là tự chịu trách nhiệm !' : 'Nhập câu trả lời...';
                checklistHtml += `
                    <input type="text" class="bpht-qc-text" value="${val}" ${readOnly ? 'disabled' : ''} placeholder="${placeholderText}" style="background:${readOnly ? '#f1f5f9' : '#ffffff'}; border:1px solid #cbd5e1; color:${readOnly ? '#64748b' : '#1e293b'}; font-size:13px; border-radius:8px; padding:8px 12px; width:100%; outline:none; box-sizing:border-box; cursor:${readOnly ? 'not-allowed' : 'text'};"
                        ${isCountQuestion && !readOnly ? `oninput="_bphtValidateCountInput(this, ${r.quantity || 0})"` : ''}
                        ${isPersonQuestion && !readOnly ? `oninput="this.value = this.value.replace(/\\d/g, '')"` : ''}>
                    ${isCountQuestion && !readOnly ? `<div class="bpht-count-error-msg" style="color:#ef4444; font-size:11px; font-weight:700; margin-top:4px; ${val !== '' && (parseInt(val.replace(/\D/g, ''), 10) !== parseInt(r.quantity || 0, 10)) ? 'display:block;' : 'display:none;'}">Bạn đã đếm sai, hãy đếm lại !</div>` : ''}
                `;
            }
            checklistHtml += '</div>';
        });
        checklistHtml += '</div>';
    }

    let formattedExpectedDate = '—';
    const targetDateStr = r.expected_ship_date || r.expected_date;
    if (targetDateStr) {
        try {
            const dt = new Date(targetDateStr);
            const day = String(dt.getDate()).padStart(2, '0');
            const month = String(dt.getMonth() + 1).padStart(2, '0');
            if (r.shipping_standard === 'chuan') {
                let timeStr = '';
                if (r.standard_delivery_time) {
                    timeStr = r.standard_delivery_time.trim();
                } else {
                    const hrs = String(dt.getHours()).padStart(2, '0');
                    const mins = String(dt.getMinutes()).padStart(2, '0');
                    timeStr = `${hrs}:${mins}`;
                }
                formattedExpectedDate = `${timeStr} ngày ${day}/${month}`;
            } else {
                formattedExpectedDate = `ngày ${day}/${month}`;
            }
        } catch(e) {
            formattedExpectedDate = targetDateStr;
        }
    }

    let uploadBlockHtml = '';
    if (readOnly) {
        uploadBlockHtml = `
            <div id="bphtImagesContainer" style="display:flex; gap:8px; flex-wrap:wrap;">
                ${imagesHtml}
            </div>
        `;
    } else {
        uploadBlockHtml = `
            <div style="display:flex; gap:10px; align-items:center; margin-bottom:8px;">
                <button onclick="document.getElementById('bphtFileInput').click()" style="padding:6px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:11px; font-weight:700; background:#f8fafc; cursor:pointer; color:#334155;">📷 Tải ảnh lên</button>
                <span id="bphtUploadStatus" style="font-size:11px; color:#64748b;">${_bphtState.finishImages.length > 0 ? `Đã tải ${_bphtState.finishImages.length} ảnh` : 'Chưa có ảnh'}</span>
                <input type="file" id="bphtFileInput" multiple accept="image/*" style="display:none;" onchange="_bphtUploadImages(event)">
            </div>
            <div id="bphtImagesContainer" style="display:flex; gap:8px; flex-wrap:wrap;">
                ${imagesHtml}
            </div>
        `;
    }

    let notesHtml = `
        <div>
            <label style="display:block; font-size:11px; font-weight:700; color:#475569; margin-bottom:4px;">Ghi Chú NV Hoàn Thiện</label>
            <textarea id="bphtNotes" rows="2" ${readOnly ? 'disabled' : ''} placeholder="${readOnly ? '' : 'Nhập ghi chú (nếu có)...'}" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:12px; outline:none; box-sizing:border-box; font-family:inherit; background:${readOnly ? '#f1f5f9' : '#fff'}; color:${readOnly ? '#64748b' : '#0f172a'}; cursor:${readOnly ? 'not-allowed' : 'text'};">${r.finishing_notes || ''}</textarea>
        </div>
    `;


    let footerBtns = '';
    if (readOnly) {
        footerBtns = `
            <button onclick="document.getElementById('bphtCompleteOverlay').remove()" style="padding:8px 16px; border:1px solid #cbd5e1; border-radius:8px; font-size:12px; font-weight:700; background:#fff; cursor:pointer; color:#475569;">Đóng</button>
            ${r.is_completed ? `<button onclick="document.getElementById('bphtCompleteOverlay').remove(); _bphtTog(${r.id},'undo_complete')" style="padding:8px 20px; background:linear-gradient(135deg,#ef4444,#dc2626); color:#fff; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">Hoàn Tác Hoàn Thành</button>` : ''}
        `;
    } else {
        footerBtns = `
            <button onclick="document.getElementById('bphtCompleteOverlay').remove()" style="padding:8px 16px; border:1px solid #cbd5e1; border-radius:8px; font-size:12px; font-weight:700; background:#fff; cursor:pointer; color:#475569;">Hủy</button>
            <button onclick="_bphtSubmitComplete()" style="padding:8px 20px; background:linear-gradient(135deg,#059669,#10b981); color:#fff; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">Xác Nhận Hoàn Thành</button>
        `;
    }

    const modalHtml = `
        <div id="bphtCompleteOverlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.6); backdrop-filter:blur(4px); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px;">
            <div style="background:#fff; border-radius:16px; width:550px; max-width:100%; box-shadow:0 25px 50px rgba(0,0,0,0.25); overflow:hidden; display:flex; flex-direction:column; max-height:90vh; animation:qlxSlideUp .3s;">
                <div style="background:linear-gradient(135deg,#059669,#10b981); color:#fff; padding:16px 20px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-weight:800; font-size:14px;">${readOnly ? '🔍 Xem Hoàn Thiện & Checklist' : '📦 Xác Nhận Hoàn Thiện & Checklist'}</div>
                    <button onclick="document.getElementById('bphtCompleteOverlay').remove()" style="background:none; border:none; color:#fff; font-size:18px; cursor:pointer; font-weight:bold;">✕</button>
                </div>
                <div style="padding:20px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:14px;">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
                        <div>
                            <span style="font-size:10px; color:#64748b; font-weight:700; display:block; margin-bottom:2px; text-transform:uppercase;">Mã Đơn Hàng</span>
                            <span style="font-size:13px; color:#0f172a; font-weight:800;">${_bphtGetOrderCodeWithTicket(r)}</span>
                        </div>
                        <div>
                            <span style="font-size:10px; color:#64748b; font-weight:700; display:block; margin-bottom:2px; text-transform:uppercase;">CSKH</span>
                            <span style="font-size:13px; color:#059669; font-weight:800;">${r.cskh_name || '—'}</span>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                        <div>
                            <label style="display:block; font-size:11px; font-weight:700; color:#475569; margin-bottom:4px;">Nhân Viên Hoàn Thiện <span style="color:#ef4444;">*</span></label>
                            <select id="bphtFinisherId" disabled style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:8px; font-size:12px; outline:none; background:#f1f5f9; color:#64748b; cursor:not-allowed;">
                                ${staffOptions}
                            </select>
                        </div>
                        <div>
                            <label style="display:block; font-size:11px; font-weight:700; color:#475569; margin-bottom:4px;">Tiêu Chuẩn Gửi</label>
                            <select id="bphtShippingStandard" disabled style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:8px; font-size:12px; outline:none; background:#f1f5f9; color:#64748b; cursor:not-allowed;">
                                <option value="chuan" ${r.shipping_standard === 'chuan' ? 'selected' : ''}>✅ CHUẨN</option>
                                <option value="gap" ${r.shipping_standard === 'gap' ? 'selected' : ''}>🔴 GẤP</option>
                                <option value="gui" ${r.shipping_standard === 'gui' ? 'selected' : ''}>📦 GỬI</option>
                            </select>
                            <div style="font-size:11px; font-weight:700; color:#64748b; margin-top:4px;">
                                Hạn gửi hàng: <span style="color:#059669; font-weight:800;">${formattedExpectedDate}</span>
                            </div>
                        </div>
                    </div>

                    <div id="bphtHoanThienRemindersArea" style="display:none; margin-bottom:12px;">
                        <label style="display:block; font-size:12.5px; font-weight:800; color:#ea580c; margin-bottom:6px;">
                            🔔 NHẮC NHỞ QLX HOÀN THIỆN
                        </label>
                        <div id="bphtHoanThienRemindersContent" style="display:flex; flex-direction:column; gap:8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
                        </div>
                    </div>

                    ${checklistHtml}

                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#475569; margin-bottom:4px;">Ảnh Sản Phẩm Hoàn Thiện <span style="color:#ef4444;">*</span></label>
                        ${uploadBlockHtml}
                    </div>

                    ${notesHtml}
                </div>
                <div style="padding:12px 20px; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:10px;">
                    ${footerBtns}
                </div>
            </div>
        </div>
    `;

    const old = document.getElementById('bphtCompleteOverlay'); if (old) old.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    await _bphtLoadHoanThienReminders(r);
}

function _bphtValidateCountInput(inputEl, targetQty) {
    inputEl.value = inputEl.value.replace(/\D/g, '');
    const val = inputEl.value.trim();
    const errorEl = inputEl.nextElementSibling;
    if (!errorEl || !errorEl.classList.contains('bpht-count-error-msg')) return;

    if (val === '') {
        errorEl.style.display = 'none';
        return;
    }

    if (parseInt(val, 10) !== parseInt(targetQty, 10)) {
        errorEl.style.display = 'block';
    } else {
        errorEl.style.display = 'none';
    }
}

function _bphtResizeImage(file, maxW = 800, maxH = 800, quality = 0.6) {
    return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
            resolve(file);
            return;
        }
        const reader = new FileReader();
        reader.onerror = () => resolve(file);
        reader.onload = function (e) {
            const img = new Image();
            img.onerror = () => resolve(file);
            img.onload = function () {
                try {
                    let width = img.width;
                    let height = img.height;
                    if (width > height) {
                        if (width > maxW) {
                            height = Math.round((height * maxW) / width);
                            width = maxW;
                        }
                    } else {
                        if (height > maxH) {
                            width = Math.round((width * maxH) / height);
                            height = maxH;
                        }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            resolve(file);
                        }
                    }, 'image/jpeg', quality);
                } catch(err) {
                    resolve(file);
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function _bphtUploadImages(event) {
    const files = event.target.files;
    if (!files.length) return;

    const statusEl = document.getElementById('bphtUploadStatus');
    try {
        if (statusEl) statusEl.textContent = 'Đang xử lý...';
        const fd = new FormData();
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
                const resized = await _bphtResizeImage(file, 800, 800, 0.6);
                fd.append('file', resized, file.name);
            } else {
                fd.append('file', file);
            }
        }

        if (statusEl) statusEl.textContent = 'Đang tải lên...';
        const res = await fetch(`/api/finishing/records/${_bphtState.currentRecordId}/images`, {
            method: 'POST',
            body: fd,
            credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi upload');

        _bphtState.finishImages = data.images;
        showToast('Tải ảnh thành công!');
        if (statusEl) statusEl.textContent = `Đã tải ${data.images.length} ảnh`;

        const container = document.getElementById('bphtImagesContainer');
        if (container) {
            const t = Date.now();
            container.innerHTML = data.images.map(src => {
                const buster = src.includes('?') ? `&t=${t}` : `?t=${t}`;
                return `
                    <div style="position:relative; width:80px; height:80px; border:1px solid #cbd5e1; border-radius:8px; overflow:hidden;">
                        <img src="${src}${buster}" style="width:100%; height:100%; object-fit:cover; cursor:pointer;" onclick="window.open('${src}${buster}', '_blank')">
                        <button onclick="_bphtDeleteImage('${src}')" style="position:absolute; top:2px; right:2px; background:rgba(0,0,0,0.6); color:#fff; border:none; border-radius:50%; width:18px; height:18px; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
                    </div>
                `;
            }).join('');
        }

        const r = _bpht.records.find(x => x.id === _bphtState.currentRecordId);
        if (r) r.finish_images = JSON.stringify(data.images);
    } catch(err) {
        showToast(err.message || 'Lỗi tải ảnh', 'error');
        if (statusEl) statusEl.textContent = 'Lỗi tải ảnh!';
    }
}

async function _bphtDeleteImage(imgSrc) {
    if (!confirm('Xóa ảnh này?')) return;
    const updatedImgs = _bphtState.finishImages.filter(src => src !== imgSrc);
    try {
        await apiCall(`/api/finishing/records/${_bphtState.currentRecordId}`, 'PUT', { finish_images: JSON.stringify(updatedImgs) });
        _bphtState.finishImages = updatedImgs;
        showToast('Đã xóa ảnh!');

        const container = document.getElementById('bphtImagesContainer');
        if (container) {
            const t = Date.now();
            container.innerHTML = updatedImgs.map(src => {
                const buster = src.includes('?') ? `&t=${t}` : `?t=${t}`;
                return `
                    <div style="position:relative; width:80px; height:80px; border:1px solid #cbd5e1; border-radius:8px; overflow:hidden;">
                        <img src="${src}${buster}" style="width:100%; height:100%; object-fit:cover; cursor:pointer;" onclick="window.open('${src}${buster}', '_blank')">
                        <button onclick="_bphtDeleteImage('${src}')" style="position:absolute; top:2px; right:2px; background:rgba(0,0,0,0.6); color:#fff; border:none; border-radius:50%; width:18px; height:18px; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
                    </div>
                `;
            }).join('');
        }

        const statusEl = document.getElementById('bphtUploadStatus');
        if (statusEl) {
            statusEl.textContent = updatedImgs.length > 0 ? `Đã tải ${updatedImgs.length} ảnh` : 'Chưa có ảnh';
        }

        const r = _bpht.records.find(x => x.id === _bphtState.currentRecordId);
        if (r) r.finish_images = JSON.stringify(updatedImgs);
    } catch(err) {
        showToast(err.message || 'Lỗi', 'error');
    }
}

async function _bphtSubmitComplete() {
    const unviewedBtns = document.querySelectorAll('#bphtHoanThienRemindersContent .bpht-unviewed-btn');
    if (unviewedBtns.length > 0) {
        showToast('⚠️ Bạn phải bấm xác nhận "Đã Xem và Làm" tất cả các nhắc nhở trước khi hoàn thành!', 'error');
        return;
    }

    const finisherId = document.getElementById('bphtFinisherId').value;
    const shippingStandard = document.getElementById('bphtShippingStandard').value;
    const notes = document.getElementById('bphtNotes').value;

    if (!finisherId) {
        showToast('Vui lòng chọn Nhân viên Hoàn Thiện', 'error');
        return;
    }

    if (!_bphtState.finishImages || _bphtState.finishImages.length === 0) {
        showToast('Bắt buộc phải chụp ảnh/tải lên ảnh sản phẩm hoàn thiện!', 'error');
        return;
    }

    // Validate checklist answers
    const questionRows = document.querySelectorAll('.bpht-qc-question-row');
    const answersList = [];
    const r = _bpht.records.find(x => x.id === _bphtState.currentRecordId);

    for (const row of questionRows) {
        const qId = row.dataset.id;
        const qType = row.dataset.type;
        const qContent = row.dataset.content || '';
        let val = '';

        if (qType === 'yes_no') {
            const rad = row.querySelector(`input[name="bpht_q_${qId}"]:checked`);
            if (!rad) {
                showToast('Vui lòng trả lời đầy đủ tất cả câu hỏi checklist!', 'error');
                return;
            }
            val = rad.value;
        } else if (qType === 'percentage') {
            const range = row.querySelector(`input[name="bpht_q_${qId}"]`);
            val = range.value;
        } else {
            const text = row.querySelector(`.bpht-qc-text`);
            if (!text || !text.value.trim()) {
                showToast('Vui lòng điền đầy đủ tất cả câu hỏi checklist!', 'error');
                return;
            }
            val = text.value.trim();

            const cleanContent = _removeVietnameseTones(qContent.toLowerCase().replace(/\s+/g, ''));
            const isPersonQuestion = cleanContent.includes('ailanguoidem') || cleanContent.includes('nguoidemsoluong');
            if (isPersonQuestion) {
                if (/\d/.test(val)) {
                    showToast('Người đếm số lượng sản phẩm không được chứa số, chỉ được ghi chữ!', 'error');
                    return;
                }
                if (cleanContent.includes('ailanguoidemsoluong')) {
                    if (!isMatchingStaff(val, _bphtState.staff)) {
                        const selfName = window.currentUser ? (window.currentUser.full_name || window.currentUser.username) : val;
                        val = selfName;
                        text.value = selfName;
                    }
                }
            }
        }

        // Custom validation for "Số lượng đếm là bao nhiêu ?"
        const cleanContent = qContent.toLowerCase().replace(/\s+/g, '');
        if (cleanContent.includes('sơlượngđếmlàbaonhiêu') || cleanContent.includes('soluongdemlabaonhieu')) {
            const errorEl = row.querySelector('.bpht-count-error-msg');
            if (!/^\d+$/.test(val)) {
                if (errorEl) errorEl.style.display = 'block';
                alert('Bạn đã ghi sai số lượng đếm, hãy đếm lại');
                return;
            }
            const targetQty = r ? parseInt(r.quantity, 10) : null;
            if (targetQty !== null && parseInt(val, 10) !== targetQty) {
                if (errorEl) errorEl.style.display = 'block';
                alert('Bạn đã ghi sai số lượng đếm, hãy đếm lại');
                return;
            }
        }

        answersList.push({ template_id: parseInt(qId), answer_value: val });
    }

    try {
        // 1. Update finishing record fields (finisher_id, shipping_standard, finishing_notes)
        await apiCall(`/api/finishing/records/${_bphtState.currentRecordId}`, 'PUT', {
            finisher_id: parseInt(finisherId),
            shipping_standard: shippingStandard,
            finishing_notes: notes
        });

        // 2. Submit checklist answers (if any)
        if (answersList.length > 0) {
            await apiCall(`/api/finishing/checklist/answers/${_bphtState.currentRecordId}`, 'POST', { answers: answersList });
        }

        // 3. Mark completed (complete action)
        await apiCall(`/api/finishing/toggle/${_bphtState.currentRecordId}`, 'POST', { action: 'complete' });

        // 4. Send Telegram Notification
        try {
            await apiCall(`/api/finishing/checklist/notify/${_bphtState.currentRecordId}`, 'POST');
        } catch(tgErr) {
            console.error('Lỗi gửi Telegram:', tgErr);
        }

        showToast('✅ Đã hoàn thành đơn hoàn thiện!');
        const overlay = document.getElementById('bphtCompleteOverlay');
        if (overlay) overlay.remove();
        
        await _bphtLoadAll();
    } catch(err) {
        showToast(err.message || 'Lỗi', 'error');
    }
}

// ========== CHECKLIST SETUP MODAL (Giám Đốc) ==========
async function _bphtChecklistSetup() {
    try {
        const data = await apiCall('/api/finishing/checklist/templates/all');
        const templates = data.templates || [];
        let html = '<div style="padding:20px"><h3 style="margin:0 0 16px;color:#0f172a">⚙️ Quản Lý Checklist Hoàn Thiện</h3>';
        html += '<div style="background:#f8fafc;border-radius:10px;padding:14px;margin-bottom:20px;border:1px solid #e2e8f0">';
        html += '<div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:8px">➕ Thêm Mới Câu Hỏi/Checklist</div>';
        html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">';
        html += '<select id="_bphtClNewType" style="padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;background:#fff;"><option value="yes_no">✔️ Có/Không</option><option value="text">📝 Văn bản</option><option value="percentage">📈 Thanh kéo (%)</option></select>';
        html += '<input id="_bphtClNewContent" placeholder="Nội dung câu hỏi..." style="flex:1;min-width:200px;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;background:#fff;outline:none;">';
        html += '<input id="_bphtClNewOrder" type="number" value="0" placeholder="TT" style="width:60px;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;text-align:center;background:#fff;outline:none;">';
        html += '<button onclick="_bphtClAdd()" style="padding:8px 16px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;">Thêm</button>';
        html += '</div></div>';
        if (templates.length) {
            html += '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#f1f5f9"><th style="padding:8px;text-align:left">Loại</th><th style="padding:8px;text-align:left">Nội dung</th><th style="padding:8px;text-align:center">TT</th><th style="padding:8px;text-align:center">Trạng thái</th><th style="padding:8px;text-align:center">Thao tác</th></tr></thead><tbody>';
            templates.forEach(function(t) {
                let tp = '';
                if (t.type === 'yes_no') {
                    tp = '<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">✔️ Có/Không</span>';
                } else if (t.type === 'percentage') {
                    tp = '<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">📈 Thanh kéo (%)</span>';
                } else {
                    tp = '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">📝 Văn bản</span>';
                }
                const st = t.is_active ? '<span style="color:#059669;font-weight:700">Bật</span>' : '<span style="color:#dc2626;font-weight:700">Tắt</span>';
                html += `<tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px">${tp}</td><td style="padding:8px;"><input type="text" value="${t.content.replace(/"/g, '&quot;')}" onchange="_bphtClUpdate(${t.id}, \'content\', this.value)" style="width:95%; padding:6px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; font-weight:600; background:#fff; color:#1e293b; outline:none;" onfocus="this.style.borderColor=\'#059669\'" onblur="this.style.borderColor=\'#cbd5e1\'"></td><td style="padding:8px;text-align:center;"><input type="number" value="${t.sort_order}" onchange="_bphtClUpdate(${t.id}, \'sort_order\', parseInt(this.value)||0)" style="width:50px; padding:6px 4px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; text-align:center; background:#fff; color:#1e293b; outline:none;" onfocus="this.style.borderColor=\'#059669\'" onblur="this.style.borderColor=\'#cbd5e1\'"></td><td style="padding:8px;text-align:center">${st}</td>`;
                html += `<td style="padding:8px;text-align:center"><button onclick="_bphtClToggleActive(${t.id},${!t.is_active})" style="padding:4px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:10px;cursor:pointer;background:#fff;margin-right:4px">${t.is_active ? '🔇 Tắt' : '🔔 Bật'}</button>`;
                html += `<button onclick="_bphtClDelete(${t.id})" style="padding:4px 10px;border:1px solid #fca5a5;border-radius:6px;font-size:10px;cursor:pointer;background:#fef2f2;color:#dc2626">🗑️ Xóa</button></td></tr>`;
            });
            html += '</tbody></table>';
        } else { html += '<div style="text-align:center;padding:30px;color:#94a3b8;font-size:13px">Chưa có câu hỏi nào</div>'; }
        html += '<div style="padding:16px 20px;border-top:1px solid #e2e8f0;text-align:right"><button onclick="document.getElementById(\'_bphtSetupOverlay\').remove()" style="padding:8px 20px;background:#f1f5f9;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;color:#475569;">Đóng</button></div>';
        html += '</div>';
        
        let old = document.getElementById('_bphtSetupOverlay'); if (old) old.remove();
        let ov = document.createElement('div');
        ov.className = 'qlx-cl-overlay'; ov.id = '_bphtSetupOverlay';
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
        ov.onclick = function(e) { if (e.target === ov) ov.remove(); };
        ov.innerHTML = '<div class="qlx-cl-popup" style="width:700px;background:#fff;border-radius:16px;box-shadow:0 25px 50px rgba(0,0,0,0.25);overflow:hidden;animation:qlxSlideUp .3s;"><div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:16px 20px;"><h3>⚙️ Setup Checklist Hoàn Thiện</h3><p style="margin:4px 0 0;font-size:11px;opacity:0.85;">Quản lý câu hỏi kiểm tra khi hoàn thiện sản phẩm</p></div>' + html + '</div>';
        document.body.appendChild(ov);
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function _bphtClAdd() {
    const t = document.getElementById('_bphtClNewType').value;
    const c = document.getElementById('_bphtClNewContent').value;
    const s = parseInt(document.getElementById('_bphtClNewOrder').value) || 0;
    if (!c.trim()) return showToast('Nhập nội dung câu hỏi', 'error');
    try {
        await apiCall('/api/finishing/checklist/templates', 'POST', { type: t, content: c, sort_order: s });
        showToast('✅ Đã thêm');
        _bphtChecklistSetup();
    } catch(e) { showToast(e.message, 'error'); }
}

async function _bphtClToggleActive(id, val) {
    try {
        await apiCall('/api/finishing/checklist/templates/' + id, 'PUT', { is_active: val });
        showToast('✅ Cập nhật');
        _bphtChecklistSetup();
    } catch(e) { showToast(e.message, 'error'); }
}

async function _bphtClDelete(id) {
    if (!confirm('Xóa câu hỏi này?')) return;
    try {
        await apiCall('/api/finishing/checklist/templates/' + id, 'DELETE');
        showToast('✅ Đã xóa');
        _bphtChecklistSetup();
    } catch(e) { showToast(e.message, 'error'); }
}

async function _bphtClUpdate(id, field, val) {
    try {
        const payload = {};
        payload[field] = val;
        await apiCall('/api/finishing/checklist/templates/' + id, 'PUT', payload);
        showToast('✅ Đã lưu thay đổi');
        _bphtChecklistSetup();
    } catch(e) { showToast(e.message, 'error'); }
}

// ========== DISPLAY SETTINGS SETUP MODAL (Giám Đốc) ==========
async function _bphtDisplaySetup() {
    try {
        const data = await apiCall('/api/finishing/display-settings');
        const teams = data.teams || [];
        const contractors = data.contractors || [];

        let html = '<div style="padding:20px"><h3 style="margin:0 0 8px;color:#0f172a">⚙️ Cấu Hình Nguồn Hiển Thị Hoàn Thiện</h3>';
        html += '<p style="font-size:12px;color:#64748b;margin-bottom:20px;">Tích chọn các Tổ May và Nhà Gia Công được phép hiển thị tại Cắt Chỉ & Hoàn Thiện. Các nguồn bị bỏ tích sẽ <b>tự động hoàn thiện ngay sau khâu QC</b> và không hiện ở đây.</p>';
        
        html += '<div style="display:flex;gap:20px;margin-bottom:20px;">';
        
        // Left column: Tổ May
        html += '<div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">';
        html += '<div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:12px;padding-bottom:6px;border-bottom:1.5px solid #059669;display:flex;justify-content:space-between;align-items:center;">';
        html += '<span>TỔ MAY TRONG XƯỞNG</span>';
        html += '<div style="display:flex;gap:8px;">';
        html += '<button onclick="_bphtTglAllDs(\'team\', true)" style="border:none;background:none;color:#059669;font-size:11px;font-weight:700;cursor:pointer;">Tất cả</button>';
        html += '<span style="color:#cbd5e1;font-size:11px;">|</span>';
        html += '<button onclick="_bphtTglAllDs(\'team\', false)" style="border:none;background:none;color:#dc2626;font-size:11px;font-weight:700;cursor:pointer;">Bỏ chọn hết</button>';
        html += '</div>';
        html += '</div>';
        html += '<div style="max-height:350px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">';
        if (teams.length) {
            teams.forEach(t => {
                html += `<label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;padding:4px 0;">`;
                html += `<input type="checkbox" class="bpht-ds-check" data-type="team" data-id="${t.id}" ${t.is_visible ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;">`;
                html += `<span>${t.name}</span>`;
                html += `</label>`;
            });
        } else {
            html += '<div style="text-align:center;color:#94a3b8;font-size:12px;padding:10px;">Chưa có tổ may</div>';
        }
        html += '</div></div>';

        // Right column: Nhà Gia Công
        html += '<div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">';
        html += '<div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:12px;padding-bottom:6px;border-bottom:1.5px solid #059669;display:flex;justify-content:space-between;align-items:center;">';
        html += '<span>NHÀ GIA CÔNG MAY BÍCH</span>';
        html += '<div style="display:flex;gap:8px;">';
        html += '<button onclick="_bphtTglAllDs(\'contractor\', true)" style="border:none;background:none;color:#059669;font-size:11px;font-weight:700;cursor:pointer;">Tất cả</button>';
        html += '<span style="color:#cbd5e1;font-size:11px;">|</span>';
        html += '<button onclick="_bphtTglAllDs(\'contractor\', false)" style="border:none;background:none;color:#dc2626;font-size:11px;font-weight:700;cursor:pointer;">Bỏ chọn hết</button>';
        html += '</div>';
        html += '</div>';
        html += '<div style="max-height:350px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">';
        if (contractors.length) {
            contractors.forEach(c => {
                html += `<label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;padding:4px 0;">`;
                html += `<input type="checkbox" class="bpht-ds-check" data-type="contractor" data-id="${c.id}" ${c.is_visible ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;">`;
                html += `<span>${c.name}</span>`;
                html += `</label>`;
            });
        } else {
            html += '<div style="text-align:center;color:#94a3b8;font-size:12px;padding:10px;">Chưa có nhà gia công</div>';
        }
        html += '</div></div>';

        html += '</div>';

        html += '<div style="padding:16px 20px;border-top:1px solid #e2e8f0;text-align:right;display:flex;justify-content:flex-end;gap:10px;">';
        html += '<button onclick="document.getElementById(\'_bphtDsOverlay\').remove()" style="padding:8px 20px;background:#f1f5f9;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;color:#475569;">Đóng</button>';
        html += '<button onclick="_bphtSaveDisplaySettings()" style="padding:8px 20px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;">Lưu Cấu Hình</button>';
        html += '</div>';
        html += '</div>';

        let old = document.getElementById('_bphtDsOverlay'); if (old) old.remove();
        let ov = document.createElement('div');
        ov.className = 'qlx-cl-overlay'; ov.id = '_bphtDsOverlay';
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
        ov.onclick = function(e) { if (e.target === ov) ov.remove(); };
        ov.innerHTML = '<div class="qlx-cl-popup" style="width:750px;background:#fff;border-radius:16px;box-shadow:0 25px 50px rgba(0,0,0,0.25);overflow:hidden;animation:qlxSlideUp .3s;"><div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:16px 20px;"><h3>⚙️ Setup Hoàn Thiện</h3><p style="margin:4px 0 0;font-size:11px;opacity:0.85;">Thiết lập hiển thị Tổ may / Nhà gia công tại CCHT</p></div>' + html + '</div>';
        document.body.appendChild(ov);
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

function _bphtTglAllDs(type, val) {
    const list = document.querySelectorAll(`.bpht-ds-check[data-type="${type}"]`);
    list.forEach(cb => cb.checked = val);
}

async function _bphtSaveDisplaySettings() {
    const checks = document.querySelectorAll('.bpht-ds-check');
    const settings = [];
    checks.forEach(cb => {
        settings.push({
            source_type: cb.getAttribute('data-type'),
            source_id: parseInt(cb.getAttribute('data-id')),
            is_visible: cb.checked
        });
    });

    try {
        await apiCall('/api/finishing/display-settings', 'POST', { settings });
        showToast('✅ Đã lưu cấu hình thành công!');
        const overlay = document.getElementById('_bphtDsOverlay');
        if (overlay) overlay.remove();
        await _bphtLoadAll();
    } catch(err) {
        showToast(err.message || 'Lỗi lưu cấu hình', 'error');
    }
}

function _bphtPrevPage() {
    if (_bpht.page > 1) {
        _bpht.page--;
        _bphtRender();
        document.querySelector('.bpht-main')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function _bphtNextPage() {
    var all = _bpht.records.slice();
    if (_bpht.search) {
        var q = _bpht.search.toLowerCase();
        all = all.filter(function(r) {
            return (r.cut_product_name || r.product_name || '').toLowerCase().indexOf(q) >= 0 ||
                   (r.cskh_name || '').toLowerCase().indexOf(q) >= 0 ||
                   (r.order_code || '').toLowerCase().indexOf(q) >= 0;
        });
    }
    var tot = all.length;
    var totalPages = Math.ceil(tot / 100) || 1;
    if (_bpht.page < totalPages) {
        _bpht.page++;
        _bphtRender();
        document.querySelector('.bpht-main')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function _bphtGoToPage(p) {
    _bpht.page = p;
    _bphtRender();
    document.querySelector('.bpht-main')?.scrollTo({ top: 0, behavior: 'smooth' });
}

async function _bphtLoadHoanThienReminders(r) {
    const area = document.getElementById('bphtHoanThienRemindersArea');
    const content = document.getElementById('bphtHoanThienRemindersContent');
    if (!area || !content) return;
    area.style.display = 'none';
    content.innerHTML = '';

    if (r.contractor_id) return; // Skip reminders for outsourced/Gia công

    if (!document.getElementById('bptReminderPulseStyle')) {
        const style = document.createElement('style');
        style.id = 'bptReminderPulseStyle';
        style.innerHTML = `
            @keyframes bptReminderPulse {
                0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                70% { transform: scale(1.02); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
                100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            }
        `;
        document.head.appendChild(style);
    }

    try {
        const url = `/api/qlx/reminders?order_id=${r.dht_order_id}&dept=hoanthien&item_id=${r.order_item_id}&record_type=finishing_records&record_id=${r.id}`;
        const res = await apiCall(url);
        if (res.reminders && res.reminders.length > 0) {
            area.style.display = 'block';
            res.reminders.forEach((remContent, idx) => {
                const remId = res.reminder_ids[idx];
                const isViewed = res.viewed_ids.includes(remId);

                const itemDiv = document.createElement('div');
                itemDiv.style.display = 'flex';
                itemDiv.style.alignItems = 'center';
                itemDiv.style.gap = '10px';
                itemDiv.style.background = '#fff';
                itemDiv.style.border = `1.5px solid ${isViewed ? '#10b981' : '#ef4444'}`;
                itemDiv.style.borderRadius = '8px';
                itemDiv.style.padding = '8px 12px';
                itemDiv.style.marginBottom = '6px';
                itemDiv.style.transition = 'all 0.3s';

                const text = document.createElement('div');
                text.style.flex = '1';
                text.style.fontSize = '12.5px';
                text.style.fontWeight = '700';
                text.style.color = isViewed ? '#065f46' : '#991b1b';
                text.textContent = remContent;
                itemDiv.appendChild(text);

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.style.flexShrink = '0';
                btn.style.padding = '5px 10px';
                btn.style.borderRadius = '6px';
                btn.style.fontSize = '11px';
                btn.style.fontWeight = '800';
                btn.style.cursor = 'pointer';
                btn.style.display = 'flex';
                btn.style.alignItems = 'center';
                btn.style.gap = '4px';
                btn.style.transition = 'all 0.2s';
                btn.style.width = 'auto';
                btn.style.height = 'auto';

                if (isViewed) {
                    btn.style.border = '1.5px solid #10b981';
                    btn.style.background = '#ecfdf5';
                    btn.style.color = '#047857';
                    btn.innerHTML = '✅ Đã Xem và Làm';
                } else {
                    btn.className = 'bpht-unviewed-btn';
                    btn.style.border = '1.5px solid #ef4444';
                    btn.style.background = '#fef2f2';
                    btn.style.color = '#b91c1c';
                    btn.style.animation = 'bptReminderPulse 2s infinite';
                    btn.innerHTML = '👉 Đã Xem và Làm';
                }

                btn.onclick = async () => {
                    if (btn.disabled || !btn.classList.contains('bpht-unviewed-btn')) return;
                    try {
                        btn.disabled = true;
                        await apiCall('/api/qlx/reminders/viewed', 'POST', {
                            reminder_ids: [remId],
                            record_type: 'finishing_records',
                            record_id: r.id
                        });
                        showToast('Đã xác nhận xem nhắc nhở', 'success');
                        btn.classList.remove('bpht-unviewed-btn');
                        btn.style.border = '1.5px solid #10b981';
                        btn.style.background = '#ecfdf5';
                        btn.style.color = '#047857';
                        btn.style.animation = 'none';
                        btn.innerHTML = '✅ Đã Xem và Làm';
                        itemDiv.style.borderColor = '#10b981';
                        itemDiv.style.color = '#065f46';
                    } catch (err) {
                        btn.disabled = false;
                        showToast(err.message || 'Lỗi xác nhận nhắc nhở', 'error');
                    }
                };

                itemDiv.appendChild(btn);
                content.appendChild(itemDiv);
            });
        }
    } catch (err) {
        console.error('Error fetching reminders:', err);
    }
}

function isMatchingStaff(enteredVal, staffList) {
    if (!enteredVal) return false;
    const enteredNorm = _removeVietnameseTones(enteredVal.toLowerCase().trim());
    if (!enteredNorm) return false;
    const enteredNoSpace = enteredNorm.replace(/\s+/g, '');
    for (const s of staffList) {
        const sFullNameNorm = _removeVietnameseTones((s.full_name || '').toLowerCase().trim());
        const sUsernameNorm = _removeVietnameseTones((s.username || '').toLowerCase().trim());
        if (enteredNoSpace === sFullNameNorm.replace(/\s+/g, '') || enteredNoSpace === sUsernameNorm.replace(/\s+/g, '')) {
            return true;
        }
    }
    for (const s of staffList) {
        const sFullNameNorm = _removeVietnameseTones((s.full_name || '').toLowerCase().trim());
        const words = sFullNameNorm.split(/\s+/);
        if (words.includes(enteredNorm)) {
            return true;
        }
    }
    return false;
}

// ========== BAO LOI MODAL (CHUNG VOI BP CAT/QC) ==========
window._bphtErrorImages = [];
window._bphtErrorVideo = null;
window._bphtSubmitBusy = false;
window._bphtBusy = false;
window._bphtPasteHandler = null;

async function _bphtOpenErrorModal(recordId) {
    if (window._bphtBusy) return;
    window._bphtBusy = true;

    try {
        var r = _bpht.records.find(function(x) { return x.id === recordId; });
        if (!r) { showToast('Không tìm thấy đơn hoàn thiện', 'error'); window._bphtBusy = false; return; }

        var commonErrors = [];
        try {
            var ce = await apiCall('/api/common-errors-tpl');
            commonErrors = ce.items || [];
        } catch(e) { console.error(e); }

        var old = document.getElementById('_bphtErrorModal'); if (old) old.remove();

        var finisherName = window.currentUser ? window.currentUser.full_name : 'Thợ hoàn thiện';
        var reporterName = 'Người Báo Lỗi: Bộ Phận Cắt Chỉ & Hoàn Thiện - ' + finisherName;
        var saleName = r.cskh_name || '—';

        window._bphtErrorImages = [];
        window._bphtErrorVideo = null;

        var h = '<div class="bpc-modal-overlay show" id="_bphtErrorModal" onclick="if(event.target===this)_bphtCloseErrorModal()" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:80px;overflow-y:auto">';
        h += '<div class="bpc-modal" style="width:520px;max-height:90vh;overflow-y:auto;display:flex;flex-direction:column;background:#fff;border-radius:16px;box-shadow:0 25px 50px rgba(0,0,0,0.25);overflow:hidden;animation:qlxSlideUp .3s;margin-bottom:40px;">';
        h += '<div class="bpc-modal-header" style="background:linear-gradient(135deg,#7c3aed,#9333ea);color:#fff;padding:18px 24px;display:flex;align-items:center;gap:12px;"><div class="m-icon" style="font-size:24px">🚨</div><div><div class="m-title" style="font-weight:800;font-size:16px;line-height:1.2">BÁO ĐƠN LỖI</div><div class="m-sub" style="font-size:12px;opacity:0.9;margin-top:2px">' + (r.order_code || '') + '</div></div></div>';
        h += '<div class="bpc-modal-body" style="overflow-y:auto;flex:1;padding:20px;display:flex;flex-direction:column;gap:14px;color:#334155">';

        h += '<div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:8px;">';
        h += '  <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:#64748b;font-weight:600;">📋 Mã Đơn</span><span style="font-weight:700;color:#1e3a8a">' + (r.order_code || '—') + '</span></div>';
        h += '  <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:#64748b;font-weight:600;">👤 Khách Hàng</span><span style="font-weight:700;color:#1e293b">' + (r.customer_name || '—') + '</span></div>';
        h += '  <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:#64748b;font-weight:600;">💼 CSKH</span><span style="font-weight:700;color:#1e293b">' + saleName + '</span></div>';
        h += '  <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:#64748b;font-weight:600;">📦 SL Sản Xuất</span><span style="font-weight:700;color:#059669">' + (r.quantity || 0) + '</span></div>';
        h += '  <div style="display:flex;justify-content:space-between;font-size:13px;border-top:1px dashed #e2e8f0;padding-top:8px;margin-top:4px;"><span style="color:#64748b;font-weight:600;">✍️ Người Báo Lỗi</span><span style="font-weight:700;color:#7c3aed">' + reporterName + '</span></div>';
        h += '</div>';

        h += '<div><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:6px">Lỗi Thường Gặp (Nếu có)</label>';
        h += '<select id="bphtE_common" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;background:#f8fafc;outline:none;">';
        h += '<option value="">-- Chọn loại lỗi (nếu có) --</option>';
        commonErrors.forEach(function(ce){
            h += '<option value="' + ce.error_name + '">' + ce.error_name + '</option>';
        });
        h += '</select></div>';

        h += '<div><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:6px;color:#ef4444;">Số Lượng Lỗi <span style="color:#ef4444">*</span></label>';
        h += '<input type="number" id="bphtE_qty" min="1" max="' + (r.quantity || 9999) + '" value="" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;font-weight:800;color:#dc2626;outline:none;" placeholder="Nhập số lượng lỗi...">';
        h += '</div>';

        h += '<div><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:6px;color:#ef4444;">Nội Dung Chi Tiết <span style="color:#ef4444">*</span></label>';
        h += '<textarea id="bphtE_content" rows="3" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:12px;font-family:inherit;outline:none;" placeholder="Mô tả chi tiết lỗi..."></textarea>';
        h += '</div>';

        h += '<div><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:6px;color:#ef4444;">📷 Hình Ảnh Minh Họa <span style="color:#ef4444">*</span></label>';
        h += '<div style="border:1.5px dashed #7c3aed;border-radius:10px;padding:16px 20px;text-align:center;background:rgba(124,58,237,0.03);color:#7c3aed;font-size:13px;font-weight:700;">';
        h += '    Bấm <span style="background:#7c3aed;color:#fff;padding:2px 8px;border-radius:4px;font-family:monospace;font-size:12px;font-weight:800">Ctrl + V</span> tại bất kỳ đâu trên trang này để dán ảnh';
        h += '</div>';
        h += '<div id="bphtE_previews" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"></div>';
        h += '</div>';

        h += '<div><label style="display:block;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:6px">🎥 Video Minh Họa (Không bắt buộc)</label>';
        h += '<input type="file" id="bphtE_video" accept="video/*" style="font-size:11px;width:100%" onchange="_bphtUploadErrorVideo(event)">';
        h += '</div>';

        h += '</div>';

        h += '<div class="bpc-modal-actions" style="margin-top:0;padding:16px 20px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:12px;border-radius:0 0 16px 16px;">';
        h += '<button class="bpc-modal-btn cancel" onclick="_bphtCloseErrorModal()" style="padding:10px 20px;border:1.5px solid #cbd5e1;background:#fff;color:#475569;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;">Hủy</button>';
        h += '<button class="bpc-modal-btn confirm" id="_bphtErrorSubmitBtn" style="padding:10px 24px;border:none;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#fff;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;" onclick="_bphtSubmitError(' + recordId + ')">🚨 BÁO LỖI</button>';
        h += '</div>';

        h += '</div></div>';
        document.body.insertAdjacentHTML('beforeend', h);

        _bphtSetupPasteListener();
        window._bphtBusy = false;
    } catch(e) {
        showToast('Lỗi: ' + e.message, 'error');
        window._bphtBusy = false;
    }
}

function _bphtCloseErrorModal() {
    var m = document.getElementById('_bphtErrorModal');
    if (m) { m.remove(); }
    if (window._bphtPasteHandler) {
        window.removeEventListener('paste', window._bphtPasteHandler);
        window._bphtPasteHandler = null;
    }
}

function _bphtCompressImage(file, callback) {
    if (!file.type.startsWith('image/')) {
        callback(null);
        return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
            var canvas = document.createElement('canvas');
            var maxW = 800, maxH = 800;
            var w = img.width, h = img.height;
            if (w > h) {
                if (w > maxW) { h = Math.round((h * maxW) / w); w = maxW; }
            } else {
                if (h > maxH) { w = Math.round((w * maxH) / h); h = maxH; }
            }
            canvas.width = w; canvas.height = h;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            callback(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function _bphtAddErrorImage(file) {
    _bphtCompressImage(file, function(compressed) {
        if (!compressed) return;
        window._bphtErrorImages.push(compressed);
        _bphtRenderErrorImagePreviews();
    });
}

function _bphtRenderErrorImagePreviews() {
    var area = document.getElementById('bphtE_previews');
    if (!area) return;
    var h = '';
    window._bphtErrorImages.forEach(function(imgData, index) {
        h += '<div style="position:relative;display:inline-block">';
        h += '<img src="' + imgData + '" style="width:70px;height:70px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1">';
        h += '<span onclick="_bphtRemoveErrorImage(' + index + ')" style="position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border-radius:50%;width:16px;height:16px;font-size:10px;font-weight:900;text-align:center;line-height:16px;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.2)">×</span>';
        h += '</div>';
    });
    area.innerHTML = h;
}

function _bphtRemoveErrorImage(index) {
    window._bphtErrorImages.splice(index, 1);
    _bphtRenderErrorImagePreviews();
}

function _bphtSetupPasteListener() {
    if (window._bphtPasteHandler) {
        window.removeEventListener('paste', window._bphtPasteHandler);
    }
    window._bphtPasteHandler = function(e) {
        if (!document.getElementById('_bphtErrorModal')) return;
        var items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (var i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') === 0) {
                var blob = items[i].getAsFile();
                _bphtAddErrorImage(blob);
            }
        }
    };
    window.addEventListener('paste', window._bphtPasteHandler);
}

function _bphtUploadErrorVideo(event) {
    const file = event.target.files[0];
    if (file) {
        window._bphtErrorVideo = file;
    } else {
        window._bphtErrorVideo = null;
    }
}

async function _bphtSubmitError(recordId) {
    if (window._bphtSubmitBusy) return;

    var qtyEl = document.getElementById('bphtE_qty');
    var qty = Number(qtyEl.value) || 0;
    if (qty <= 0) { showToast('Vui lòng nhập số lượng lỗi hợp lệ!', 'error'); return; }

    var contentEl = document.getElementById('bphtE_content');
    var content = contentEl.value.trim();
    if (!content) { showToast('Vui lòng nhập chi tiết nội dung lỗi!', 'error'); return; }

    if (!window._bphtErrorImages || window._bphtErrorImages.length === 0) {
        showToast('Vui lòng dán hoặc chọn ít nhất 1 hình ảnh minh họa bắt buộc!', 'error');
        return;
    }

    window._bphtSubmitBusy = true;
    var btn = document.getElementById('_bphtErrorSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang gửi...'; }

    try {
        var r = _bpht.records.find(function(x) { return x.id === recordId; });
        if (!r) { throw new Error('Không tìm thấy record gốc'); }

        var today = new Date().toISOString().split('T')[0];
        if (typeof vnNow === 'function') {
            var n = vnNow();
            today = n.getFullYear() + '-' + String(n.getMonth()+1).padStart(2,'0') + '-' + String(n.getDate()).padStart(2,'0');
        }

        var body = {
            report_date: today,
            common_error_type: document.getElementById('bphtE_common') ? document.getElementById('bphtE_common').value : '',
            order_code: r.order_code,
            cskh_name: r.cskh_name || '',
            error_quantity: qty,
            error_content: content,
            dht_order_id: r.dht_order_id,
            customer_name: r.customer_name,
            production_quantity: r.quantity,
            error_department: null,
            error_type: 'Nội Bộ'
        };

        var result = await apiCall('/api/customer-errors', 'POST', body);
        if (result.error) { throw new Error(result.error); }

        if (window._bphtErrorImages && window._bphtErrorImages.length > 0 && result.id) {
            var fd = new FormData();
            window._bphtErrorImages.forEach(function(imgData, index) {
                var blob = dataURLtoBlob(imgData);
                fd.append('file_' + index, blob, 'image_' + index + '.jpeg');
            });
            await fetch('/api/customer-errors/' + result.id + '/images', { method: 'POST', body: fd });
        }

        if (window._bphtErrorVideo && result.id) {
            var fdv = new FormData();
            fdv.append('video', window._bphtErrorVideo);
            await fetch('/api/customer-errors/' + result.id + '/video', { method: 'POST', body: fdv });
        }

        // Action report_error toggle finishing_records
        await apiCall('/api/finishing/toggle/' + recordId, 'POST', { action: 'report_error', error_order_id: result.id });

        showToast('✅ Đã báo đơn lỗi thành công!');
        _bphtCloseErrorModal();
        await _bphtLoadAll();
    } catch(e) {
        showToast('Lỗi: ' + e.message, 'error');
        if (btn) { btn.disabled = false; btn.textContent = '🚨 BÁO LỖI'; }
    } finally {
        window._bphtSubmitBusy = false;
    }
}

