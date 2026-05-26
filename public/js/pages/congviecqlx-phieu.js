// ========== PHIẾU YÊU CẦU XỬ LÝ — QLX Tab Module ==========
// Prefix: _qlxWt — tránh xung đột với taophieuxulycv.js (_wt)
var _qlxWt={stats:{},tickets:[],staff:[],depts:[],filter:'all',search:'',page:1,total:0};

function _qlxWtInit(c){
    c.innerHTML='<div id="_qlxWtMain" style="padding:4px 0"><div style="text-align:center;padding:40px;color:#64748b">⏳ Đang tải...</div></div>';
    _qlxWt.filter='cho_xu_ly';_qlxWt.search='';_qlxWt.page=1;
    _qlxWtLoadAll();
}
async function _qlxWtLoadAll(){
    try{var r=await apiCall('/api/work-tickets/staff');_qlxWt.staff=r.users||[];_qlxWt.depts=r.departments||[];}catch(e){}
    try{var r2=await apiCall('/api/work-tickets/stats');_qlxWt.stats=r2.stats||{};}catch(e){}
    _qlxWtLoadList();
}
async function _qlxWtLoadList(){
    try{
        var p=[];
        if(_qlxWt.filter&&_qlxWt.filter!=='all')p.push('status='+_qlxWt.filter);
        if(_qlxWt.search)p.push('search='+encodeURIComponent(_qlxWt.search));
        p.push('page='+_qlxWt.page);
        var r=await apiCall('/api/work-tickets'+(p.length?'?'+p.join('&'):''));
        _qlxWt.tickets=r.tickets||[];_qlxWt.total=r.total||0;
        _qlxWtRender();
    }catch(e){console.error('[QLX-WT]',e);}
}
function _qlxWtSI(s){
    if(s==='resolved'||s==='closed')return{l:'Đã Được Trả Lời',c:'#16a34a',bg:'#f0fdf4',icon:'🟢'};
    if(s==='in_progress')return{l:'Chờ Ngày Trả Lời',c:'#d97706',bg:'#fef3c7',icon:'🟡'};
    return{l:'Chờ Xử Lý',c:'#dc2626',bg:'#fef2f2',icon:'🔴'};
}
// Get display status matching the 3 filter categories
function _qlxWtDisplayStatus(t){
    var today=vnDateStr();
    var dueDate=t.due_date?new Date(t.due_date).toISOString().slice(0,10):'';
    // Đã Được Trả Lời (resolved/closed)
    if(t.status==='resolved'||t.status==='closed'){
        return{l:'Đã Được Trả Lời',c:'#16a34a',bg:'#f0fdf4',icon:'🟢'};
    }
    // Chờ Ngày Trả Lời (pending/in_progress with future due_date)
    if(dueDate&&dueDate>today){
        return{l:'Chờ Ngày Trả Lời',c:'#d97706',bg:'#fefce8',icon:'🟡'};
    }
    // Chờ Xử Lý (today + overdue + no due_date)
    if(dueDate&&dueDate<today)return{l:'Chờ Xử Lý (Trễ)',c:'#dc2626',bg:'#fef2f2',icon:'🔴'};
    return{l:'Chờ Xử Lý',c:'#dc2626',bg:'#fef2f2',icon:'🔴'};
}
function _qlxWtRender(){
    var m=document.getElementById('_qlxWtMain');if(!m)return;
    var st=_qlxWt.stats,items=_qlxWt.tickets,h='';
    // Header
    h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">';
    h+='<div style="font-size:16px;font-weight:900;color:#0c4a6e">📝 PHIẾU YÊU CẦU XỬ LÝ <span style="color:#94a3b8;font-weight:500;font-size:12px">('+(st.total||0)+' phiếu)</span></div>';
    h+='<button onclick="_qlxWtOpenForm()" style="padding:8px 18px;background:linear-gradient(135deg,#0369a1,#0284c7);color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 3px 10px rgba(3,105,161,0.3)">+ Tạo Phiếu Mới</button>';
    h+='</div>';
    // 3 Filter Buttons (full-width bars)
    var fCXL=st.cho_xu_ly||0, fCNTL=st.cho_ngay_tra_loi||0, fDTL=st.da_tra_loi||0;
    h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">';
    h+=_qlxWtFilterBtn('cho_xu_ly','🔴','Chờ Xử Lý',fCXL,'#dc2626','#fef2f2','#fecaca');
    h+=_qlxWtFilterBtn('cho_ngay_tra_loi','🟡','Chờ Ngày Trả Lời',fCNTL,'#d97706','#fefce8','#fde68a');
    h+=_qlxWtFilterBtn('da_tra_loi','🟢','Đã Được Trả Lời',fDTL,'#16a34a','#f0fdf4','#bbf7d0');
    h+='</div>';
    // Search
    h+='<div style="margin-bottom:12px"><input id="_qlxWtSrch" type="text" placeholder="🔍 Tìm mã phiếu, tiêu đề, mã đơn..." value="'+(_qlxWt.search||'')+'" onkeydown="if(event.key===\'Enter\'){_qlxWt.search=this.value;_qlxWt.page=1;_qlxWtLoadList()}" style="width:100%;padding:9px 14px;border:1.5px solid #d1d5db;border-radius:10px;font-size:12px;outline:none;box-sizing:border-box" onfocus="this.style.borderColor=\'#0369a1\'" onblur="this.style.borderColor=\'#d1d5db\'"></div>';
    // Table
    h+='<div style="overflow-x:auto;border-radius:10px;border:1px solid #e2e8f0"><table style="width:100%;border-collapse:collapse;font-size:12px">';
    h+='<thead><tr style="background:linear-gradient(135deg,#0c4a6e,#0369a1)">';
    var qlxCols=[{t:'STT',a:'center'},{t:'Người Tạo',a:'left'},{t:'Mã Phiếu',a:'center'},{t:'Tiêu Đề',a:'left'},{t:'Nội Dung Yêu Cầu',a:'left'},{t:'Mức Độ',a:'center'},{t:'Thời Gian',a:'center'},{t:'Ngày Hẹn Xử Lý',a:'center'},{t:'Trạng Thái',a:'center'},{t:'Người Nhận',a:'left'},{t:'Trả Lời',a:'center'},{t:'Ngày Tạo',a:'center'}];
    qlxCols.forEach(function(c){
        h+='<th style="padding:8px 6px;text-align:'+c.a+';font-size:11px;font-weight:700;color:#fff;white-space:nowrap;border-right:1px solid rgba(255,255,255,0.1)">'+c.t+'</th>';
    });
    h+='</tr></thead><tbody>';
    if(!items.length){
        h+='<tr><td colspan="12" style="padding:40px;text-align:center;color:#9ca3af">Chưa có phiếu xử lý nào</td></tr>';
    }else{
        items.forEach(function(t,idx){
            var ds=_qlxWtDisplayStatus(t);
            var late=ds.l.indexOf('Trễ')>=0;
            var deadlineDate=t.deadline_at?new Date(t.deadline_at):null;
            var deadlineFmt=deadlineDate?String(deadlineDate.getDate()).padStart(2,'0')+'/'+String(deadlineDate.getMonth()+1).padStart(2,'0')+'/'+deadlineDate.getFullYear()+' '+String(deadlineDate.getHours()).padStart(2,'0')+':'+String(deadlineDate.getMinutes()).padStart(2,'0'):'—';
            h+='<tr onclick="_qlxWtDetail('+t.id+')" style="border-bottom:1px solid #f1f5f9;cursor:pointer'+(late?';background:#fff5f5':'')+'" onmouseover="this.style.background=\'#f0f7ff\'" onmouseout="this.style.background=\''+(late?'#fff5f5':'')+'\'">'; 
            h+='<td style="padding:6px;text-align:center;color:#94a3b8;font-size:11px">'+(idx+1)+'</td>';
            h+='<td style="padding:6px;color:#2563eb;font-weight:600;white-space:nowrap">'+(t.created_by_name||'—')+'</td>';
            h+='<td style="padding:6px;text-align:center;color:#4f46e5;font-weight:700">'+(t.ticket_code||'—')+'</td>';
            h+='<td style="padding:6px;font-weight:700;color:#1e293b;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(t.title||'—')+'</td>';
            h+='<td style="padding:6px;color:#475569;font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(t.description||'—')+'</td>';
            h+='<td style="padding:6px;text-align:center">'+(_wtPLB?_wtPLB(t.priority_level||'low'):(t.priority||'—'))+'</td>';
            h+='<td style="padding:6px;text-align:center;white-space:nowrap">'+(_wtDeadlineBadge?_wtDeadlineBadge(t):'—')+'</td>';
            h+='<td style="padding:6px;text-align:center;color:'+(late?'#dc2626':'#64748b')+';font-size:11px;font-weight:'+(late?'800':'600')+';white-space:nowrap">'+deadlineFmt+'</td>';
            h+='<td style="padding:6px;text-align:center;white-space:nowrap"><span style="display:inline-flex;align-items:center;gap:4px;background:'+ds.bg+';color:'+ds.c+';padding:3px 10px;border-radius:8px;font-size:10px;font-weight:800;border:1px solid '+ds.c+'22">'+ds.icon+' '+ds.l+'</span></td>';
            h+='<td style="padding:6px;color:#d97706;font-weight:600;white-space:nowrap">'+(t.assigned_to_name||'—')+'</td>';
            h+='<td style="padding:6px;text-align:center"><span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700">💬 '+(t.reply_count||0)+'</span></td>';
            h+='<td style="padding:6px;text-align:center;color:#64748b;font-size:11px;white-space:nowrap">'+vnFormat(t.created_at)+'</td>';
            h+='</tr>';
        });
    }
    h+='</tbody></table></div>';
    m.innerHTML=h;
}
function _qlxWtFilterBtn(fk,icon,label,count,color,bg,border){
    var a=_qlxWt.filter===fk;
    return '<div onclick="_qlxWtSetFilter(\''+fk+'\')" style="display:flex;align-items:center;gap:10px;padding:12px 18px;background:'+(a?bg:'#fff')+';border:2px solid '+(a?color:border)+';border-radius:12px;cursor:pointer;transition:all .25s;'+(a?'box-shadow:0 4px 16px '+color+'33':'')+'" onmouseover="if(!this.classList.contains(\'_fActive\'))this.style.background=\''+bg+'\'" onmouseout="if(!this.classList.contains(\'_fActive\'))this.style.background=\'#fff\'">'
        +'<span style="font-size:16px">'+icon+'</span>'
        +'<span style="background:'+color+';color:#fff;min-width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;font-size:12px;font-weight:900;padding:0 4px">'+count+'</span>'
        +'<span style="font-size:13px;font-weight:'+(a?'800':'600')+';color:'+(a?color:'#374151')+'">'+label+'</span>'
        +'</div>';
}
function _qlxWtSetFilter(s){_qlxWt.filter=s;_qlxWt.page=1;_qlxWtLoadList();}

// ===== REPLY POPUP =====
async function _qlxWtDetail(id){
    try{
        var r=await apiCall('/api/work-tickets/'+id);
        var t=r.ticket;if(!t)return;
        var ov=document.createElement('div');
        ov.id='_qlxWtOv';
        ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s';
        ov.onclick=function(e){if(e.target===ov)ov.remove();};

        // Format dates
        var ngayTao = t.created_at ? vnFormat(t.created_at) : '—';
        var maDon = t.order_code || '—';
        var tieuDe = t.title || '—';
        var noiDung = (t.description || '—').replace(/\n/g,'<br>');

        // Show previous replies if any
        var rps = r.replies || [];
        var rpsHtml = '';
        if (rps.length > 0) {
            rpsHtml = '<div style="margin-bottom:14px"><div style="font-size:11px;font-weight:700;color:#374151;margin-bottom:6px">💬 Lịch Sử Trả Lời (' + rps.length + ')</div>';
            rps.forEach(function(rp){
                rpsHtml += '<div style="padding:8px 12px;background:#f8fafc;border-radius:8px;margin-bottom:6px;border-left:3px solid #0369a1">';
                rpsHtml += '<div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="font-size:10px;font-weight:700;color:#0369a1">' + (rp.user_name||'—') + '</span><span style="font-size:9px;color:#9ca3af">' + vnFormat(rp.created_at) + '</span></div>';
                rpsHtml += '<div style="font-size:11px;color:#334155;line-height:1.4">' + (rp.message||'').replace(/\n/g,'<br>') + '</div></div>';
            });
            rpsHtml += '</div>';
        }

        // Tomorrow string for calendar minDate
        var tmr = new Date(vnNow());
        tmr.setDate(tmr.getDate()+1);
        var tomorrowStr = tmr.getFullYear()+'-'+String(tmr.getMonth()+1).padStart(2,'0')+'-'+String(tmr.getDate()).padStart(2,'0');

        var h = '<div style="background:#fff;border-radius:16px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">';

        // Header
        h += '<div style="padding:16px 20px;background:linear-gradient(135deg,#0c4a6e,#0369a1);border-radius:16px 16px 0 0;display:flex;align-items:center;justify-content:space-between">';
        h += '<div style="font-size:15px;font-weight:800;color:#fff">📋 Trả Lời Yêu Cầu</div>';
        h += '<button onclick="document.getElementById(\'_qlxWtOv\').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:8px;font-size:18px;cursor:pointer">×</button></div>';

        // Body
        h += '<div style="padding:20px">';

        // Info block (read-only)
        h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">';
        h += '<div style="padding:8px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb"><div style="font-size:10px;color:#9ca3af;font-weight:700">📅 NGÀY TẠO</div><div style="font-size:12px;font-weight:700;color:#1e293b">' + ngayTao + '</div></div>';
        h += '<div style="padding:8px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb"><div style="font-size:10px;color:#9ca3af;font-weight:700">📦 MÃ ĐƠN</div><div style="font-size:12px;font-weight:700;color:#0369a1">' + maDon + '</div></div>';
        h += '</div>';
        h += '<div style="padding:8px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:10px"><div style="font-size:10px;color:#9ca3af;font-weight:700">📋 TIÊU ĐỀ</div><div style="font-size:13px;font-weight:700;color:#1e293b">' + tieuDe + '</div></div>';
        h += '<div style="padding:8px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:14px"><div style="font-size:10px;color:#9ca3af;font-weight:700">📝 NỘI DUNG YÊU CẦU</div><div style="font-size:12px;color:#334155;line-height:1.6;margin-top:4px">' + noiDung + '</div></div>';

        // Previous replies
        h += rpsHtml;

        // --- Input section ---
        h += '<div style="border-top:2px solid #e5e7eb;padding-top:14px">';

        // Reply textarea
        h += '<div style="margin-bottom:14px"><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:4px">✏️ Trả Lời Yêu Cầu <span style="color:#dc2626">*</span></label>';
        h += '<textarea id="_qlxReplyMsg" rows="3" placeholder="Nhập nội dung trả lời yêu cầu..." style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;box-sizing:border-box;resize:vertical;font-family:inherit;transition:border .2s" onfocus="this.style.borderColor=\'#0369a1\'" onblur="this.style.borderColor=\'#d1d5db\'"></textarea></div>';

        // Ngày Xử Lý toggle
        h += '<div style="margin-bottom:14px"><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:8px">📅 Ngày Xử Lý <span style="color:#dc2626">*</span></label>';
        h += '<div style="display:flex;gap:0;border-radius:8px;overflow:hidden;border:1px solid #d1d5db">';
        h += '<button type="button" id="_qlxDayToday" onclick="_qlxWtToggleDay(\'today\')" style="flex:1;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;border:none;background:#0369a1;color:#fff;transition:all .2s">☀️ Hôm Nay</button>';
        h += '<button type="button" id="_qlxDayOther" onclick="_qlxWtToggleDay(\'other\')" style="flex:1;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;border:none;background:#f8fafc;color:#374151;transition:all .2s">📅 Ngày Khác</button>';
        h += '</div></div>';

        // Calendar container (hidden by default)
        h += '<div id="_qlxReplyCalWrap" style="display:none;margin-bottom:14px;padding:12px;background:#fefce8;border:1px solid #fde68a;border-radius:10px">';
        h += '<div id="_qlxReplyCalendar"></div>';
        h += '<input type="hidden" id="_qlxReplyDueDate" value="">';
        h += '</div>';

        // Store ticket ID + tomorrow
        h += '<input type="hidden" id="_qlxReplyTid" value="' + t.id + '">';
        h += '<input type="hidden" id="_qlxReplyTmr" value="' + tomorrowStr + '">';

        // Buttons
        h += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">';
        h += '<button onclick="document.getElementById(\'_qlxWtOv\').remove()" style="padding:10px 24px;background:#f1f5f9;color:#64748b;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">Hủy</button>';
        h += '<button onclick="_qlxWtConfirmReply()" style="padding:10px 24px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer;transition:opacity .2s" onmouseover="this.style.opacity=\'0.9\'" onmouseout="this.style.opacity=\'1\'">✅ Xác Nhận</button>';
        h += '</div>';

        h += '</div></div></div>';
        ov.innerHTML = h;
        document.body.appendChild(ov);

        // Store day mode
        window._qlxReplyDayMode = 'today';
        window._qlxReplyCalInited = false;

    }catch(e){showToast('Lỗi: '+e.message,'error');}
}

// Toggle Hôm Nay / Ngày Khác
function _qlxWtToggleDay(mode){
    window._qlxReplyDayMode = mode;
    var btnToday = document.getElementById('_qlxDayToday');
    var btnOther = document.getElementById('_qlxDayOther');
    var calWrap = document.getElementById('_qlxReplyCalWrap');
    if(!btnToday||!btnOther||!calWrap) return;

    if(mode === 'today'){
        btnToday.style.background = '#0369a1'; btnToday.style.color = '#fff';
        btnOther.style.background = '#f8fafc'; btnOther.style.color = '#374151';
        calWrap.style.display = 'none';
        // Clear calendar selection
        var hidden = document.getElementById('_qlxReplyDueDate');
        if(hidden) hidden.value = '';
    } else {
        btnToday.style.background = '#f8fafc'; btnToday.style.color = '#374151';
        btnOther.style.background = '#0369a1'; btnOther.style.color = '#fff';
        calWrap.style.display = 'block';
        // Init calendar only once
        if(!window._qlxReplyCalInited){
            window._qlxReplyCalInited = true;
            var tmrVal = (document.getElementById('_qlxReplyTmr')||{}).value || '';
            initHolidayCalendar({
                containerId: '_qlxReplyCalendar',
                hiddenInputId: '_qlxReplyDueDate',
                minDate: tmrVal
            });
        }
    }
}

// Confirm reply + update status
async function _qlxWtConfirmReply(){
    var tid = (document.getElementById('_qlxReplyTid')||{}).value;
    if(!tid) return;

    var msg = (document.getElementById('_qlxReplyMsg')||{}).value.trim();
    if(!msg){
        showToast('⚠️ Vui lòng nhập Trả Lời Yêu Cầu','error');
        var el=document.getElementById('_qlxReplyMsg');
        if(el){el.style.borderColor='#dc2626';el.focus();}
        return;
    }

    var mode = window._qlxReplyDayMode || 'today';
    var dueDate = null;
    var newStatus = 'resolved';

    if(mode === 'other'){
        dueDate = (document.getElementById('_qlxReplyDueDate')||{}).value || '';
        if(!dueDate){
            showToast('⚠️ Vui lòng chọn ngày xử lý trên lịch','error');
            return;
        }
        newStatus = 'pending';
    } else {
        // Hôm Nay: due_date = today
        var now = vnNow();
        dueDate = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
        newStatus = 'resolved';
    }

    try{
        // 1. Create reply
        var rr = await apiCall('/api/work-tickets/'+tid+'/reply','POST',{message:msg});
        if(rr.error){showToast(rr.error,'error');return;}

        // 2. Update status + due_date
        var sr = await apiCall('/api/work-tickets/'+tid+'/status','PUT',{status:newStatus,due_date:dueDate});
        if(sr.error){showToast(sr.error,'error');return;}

        if(mode === 'today'){
            showToast('✅ Đã xử lý hôm nay!','success');
        } else {
            showToast('⏳ Đã hẹn xử lý ngày ' + dueDate.split('-').reverse().join('/'),'success');
        }

        var ov=document.getElementById('_qlxWtOv');if(ov)ov.remove();
        _qlxWtLoadAll();
    }catch(e){showToast('Lỗi: '+e.message,'error');}
}

// ===== CREATE FORM =====
function _qlxWtOpenForm(){
    var ov=document.createElement('div');
    ov.id='_qlxWtFOv';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px';
    ov.onclick=function(e){if(e.target===ov)ov.remove();};
    var opts='<option value="">— Chọn người nhận —</option>';
    var dm={};_qlxWt.depts.forEach(function(d){dm[d.id]=d.name;});
    var gr={};_qlxWt.staff.forEach(function(u){var dn=dm[u.department_id]||'Chưa phân bổ';if(!gr[dn])gr[dn]=[];gr[dn].push(u);});
    Object.keys(gr).sort().forEach(function(dn){
        opts+='<optgroup label="'+dn+'">';
        gr[dn].forEach(function(u){opts+='<option value="'+u.id+'">'+u.full_name+(u.username?' ('+u.username+')':'')+'</option>';});
        opts+='</optgroup>';
    });
    ov.innerHTML='<div style="background:#fff;border-radius:16px;max-width:560px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">'
        +'<div style="padding:16px 20px;background:linear-gradient(135deg,#0c4a6e,#0369a1);border-radius:16px 16px 0 0;display:flex;align-items:center;justify-content:space-between">'
        +'<div style="font-size:15px;font-weight:800;color:#fff">➕ Tạo Phiếu Xử Lý</div>'
        +'<button onclick="document.getElementById(\'_qlxWtFOv\').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:8px;font-size:18px;cursor:pointer">×</button></div>'
        +'<div style="padding:20px">'
        +'<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Tiêu Đề <span style="color:#dc2626">*</span></label><input id="_qlxF_t" type="text" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;box-sizing:border-box"></div>'
        +'<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Mô Tả</label><textarea id="_qlxF_d" rows="3" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;resize:vertical;font-family:inherit;box-sizing:border-box"></textarea></div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
        +'<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Người Nhận <span style="color:#dc2626">*</span></label><select id="_qlxF_a" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px">'+opts+'</select></div>'
        +'<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Mức Ưu Tiên</label><select id="_qlxF_p" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px"><option value="CHUẨN">CHUẨN</option><option value="GẤP">🔥 GẤP</option></select></div></div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
        +'<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Mã Đơn Yêu Cầu (tùy chọn)</label><input id="_qlxF_o" type="text" placeholder="VD: HV001234" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;box-sizing:border-box"></div>'
        +'<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">📅 Ngày Hẹn Xử Lý</label><input id="_qlxF_due" type="date" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;box-sizing:border-box"></div>'
        +'</div>'
        +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">'
        +'<button onclick="document.getElementById(\'_qlxWtFOv\').remove()" style="padding:8px 20px;background:#f1f5f9;color:#64748b;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">Hủy</button>'
        +'<button onclick="_qlxWtSubmit()" style="padding:8px 20px;background:linear-gradient(135deg,#0369a1,#0284c7);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">Tạo Phiếu</button>'
        +'</div></div></div>';
    document.body.appendChild(ov);
}
async function _qlxWtSubmit(){
    var title=(document.getElementById('_qlxF_t')||{}).value||'';
    var desc=(document.getElementById('_qlxF_d')||{}).value||'';
    var assigned=(document.getElementById('_qlxF_a')||{}).value||'';
    var priority=(document.getElementById('_qlxF_p')||{}).value||'CHUẨN';
    var orderCode=(document.getElementById('_qlxF_o')||{}).value||'';
    var dueDate=(document.getElementById('_qlxF_due')||{}).value||'';
    title=title.trim();if(!title){showToast('Vui lòng nhập tiêu đề','error');return;}
    if(!assigned){showToast('Vui lòng chọn người nhận','error');return;}
    try{
        var r=await apiCall('/api/work-tickets','POST',{title:title,description:desc.trim(),assigned_to:parseInt(assigned),priority:priority,order_code:orderCode.trim()||null,due_date:dueDate||null,type:'custom'});
        if(r.error){showToast(r.error,'error');return;}
        showToast(r.message||'✅ Đã tạo phiếu');
        var ov=document.getElementById('_qlxWtFOv');if(ov)ov.remove();
        _qlxWtLoadAll();
    }catch(e){showToast('Lỗi: '+e.message,'error');}
}
