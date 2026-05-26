// ========== TẠO PHIẾU XỬ LÝ CV ==========
var _wt={staff:[],depts:[],tickets:[],stats:{},filter:'all',search:'',page:1,pSettings:[],fmgr:null,nextCode:''};

function _wtSI(t){
    if(typeof t==='string'){var s=t;t={status:s};} // backward compat
    if(t.status==='closed') return {l:'Hội Thoại Hoàn Thành',c:'#7c3aed',bg:'#f5f3ff',icon:'🏁'};
    if(t.status==='resolved') return {l:'Đã Được Trả Lời',c:'#16a34a',bg:'#f0fdf4',icon:'🟢'};
    // Date-based logic: compare due_date with today
    var today=vnDateStr();
    var dueDate=t.due_date?new Date(t.due_date).toISOString().slice(0,10):'';
    if(dueDate&&dueDate>today) return {l:'Chờ Ngày Trả Lời',c:'#d97706',bg:'#fef3c7',icon:'🟡'};
    if(dueDate&&dueDate<today) return {l:'Chờ Xử Lý (Trễ)',c:'#dc2626',bg:'#fef2f2',icon:'🔴'};
    return {l:'Chờ Xử Lý',c:'#dc2626',bg:'#fef2f2',icon:'🔴'};
}
function _wtPLB(pl){
    var m={urgent:{l:'🔴 Khẩn Cấp',c:'#dc2626',bg:'#fef2f2'},high:{l:'🟠 Cao',c:'#ea580c',bg:'#fff7ed'},medium:{l:'🟡 Trung Bình',c:'#eab308',bg:'#fefce8'},low:{l:'🟢 Thấp',c:'#16a34a',bg:'#f0fdf4'},scheduled:{l:'⚪ Theo Lịch',c:'#6b7280',bg:'#f3f4f6'}};
    var info=m[pl]||m.low;
    return '<span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:800;background:'+info.bg+';color:'+info.c+';border:1px solid '+info.c+'33">'+info.l+'</span>';
}
function _wtDeadlineBadge(t){
    if(!t.deadline_at||t.status==='resolved'||t.status==='closed'){
        if(t.status==='resolved'&&t.is_overdue) return '<span style="padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;background:#fef3c7;color:#d97706">⚠️ Trễ</span>';
        if(t.status==='resolved') return '<span style="padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;background:#f0fdf4;color:#16a34a">✅ Xong</span>';
        return '—';
    }
    var now=vnNow().getTime(),dl=new Date(t.deadline_at).getTime(),diff=dl-now;
    if(diff<=0){var m=Math.abs(Math.floor(diff/60000));return '<span style="padding:2px 6px;border-radius:4px;font-size:9px;font-weight:800;background:#fef2f2;color:#dc2626;animation:blink 1s infinite">🚨 Quá hạn '+(m>=60?Math.floor(m/60)+'h'+('0'+(m%60)).slice(-2):m+'p')+'</span>';}
    if(diff<=300000) return '<span style="padding:2px 6px;border-radius:4px;font-size:9px;font-weight:800;background:#fef3c7;color:#d97706;animation:blink 1s infinite">⚠️ Sắp hết hạn</span>';
    var h=Math.floor(diff/3600000),mn=Math.floor((diff%3600000)/60000);
    return '<span style="padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;background:#f0fdf4;color:#16a34a">⏳ '+(h>0?h+'h'+('0'+mn).slice(-2):mn+'p')+'</span>';
}

function renderTaophieuxulycvPage(c){
    c.innerHTML='<div id="wtMain" style="padding:20px;background:#fafbfc;min-height:calc(100vh - 80px)"><div style="text-align:center;padding:40px;color:#64748b">⏳ Đang tải...</div></div>';
    _wt.filter='all';_wt.search='';_wt.page=1;
    _wtLoadAll();
}

async function _wtLoadAll(){
    try{var r=await apiCall('/api/work-tickets/staff');_wt.staff=r.users||[];_wt.depts=r.departments||[];}catch(e){}
    try{var r2=await apiCall('/api/work-tickets/stats');_wt.stats=r2.stats||{};}catch(e){}
    try{var r3=await apiCall('/api/work-tickets/priority-settings');_wt.pSettings=r3.settings||[];}catch(e){}
    try{var r4=await apiCall('/api/work-tickets/factory-manager');_wt.fmgr=r4.managers&&r4.managers[0]?r4.managers[0]:null;}catch(e){}
    try{var r5=await apiCall('/api/work-tickets/next-code');_wt.nextCode=r5.next_code||'';}catch(e){}
    _wtLoadList();
}

async function _wtLoadList(){
    try{
        var p=[];
        if(_wt.filter&&_wt.filter!=='all')p.push('status='+_wt.filter);
        if(_wt.search)p.push('search='+encodeURIComponent(_wt.search));
        p.push('page='+_wt.page);
        var r=await apiCall('/api/work-tickets'+(p.length?'?'+p.join('&'):''));
        _wt.tickets=r.tickets||[];_wt.total=r.total||0;
        _wtRender();
    }catch(e){console.error('[WT]',e);}
}

function _wtRender(){
    var main=document.getElementById('wtMain');if(!main)return;
    var items=_wt.tickets,st=_wt.stats,h='';
    var isAdm=currentUser&&['giam_doc','quan_ly_cap_cao'].includes(currentUser.role);

    // Blink animation
    h+='<style>@keyframes blink{0%,100%{opacity:1}50%{opacity:0.4}}</style>';

    // Header
    h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">';
    h+='<div style="font-size:18px;font-weight:900;color:#1e293b">📋 TẠO PHIẾU XỬ LÝ CÔNG VIỆC <span style="color:#9ca3af;font-weight:500;font-size:13px">('+(st.total||0)+' phiếu)</span></div>';
    h+='<div style="display:flex;gap:8px">';
    if(isAdm) h+='<button onclick="_wtOpenSettings()" style="padding:10px 16px;background:linear-gradient(135deg,#64748b,#475569);color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer">⚙️ Cài Đặt Mức Độ</button>';
    h+='<button onclick="_wtOpenTypeChoice()" style="padding:10px 20px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(99,102,241,0.3)">+ Tạo Phiếu Mới</button>';
    h+='</div></div>';

    // Search
    h+='<div style="margin-bottom:14px"><input id="wtSearchInput" type="text" placeholder="🔍 Tìm mã phiếu, tiêu đề, mã đơn..." value="'+(_wt.search||'')+'" onkeydown="if(event.key===\'Enter\'){_wt.search=this.value;_wt.page=1;_wtLoadList()}" style="width:100%;padding:10px 14px;border:1.5px solid #d1d5db;border-radius:10px;font-size:13px;outline:none" onfocus="this.style.borderColor=\'#6366f1\'" onblur="this.style.borderColor=\'#d1d5db\'"></div>';

    // 3 Stat Cards (date-based, matching QLX module)
    h+='<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">';
    h+=_wtCard('🔴','Chờ Xử Lý',st.cho_xu_ly||0,'#dc2626','#fef2f2','#fecaca','cho_xu_ly');
    h+=_wtCard('🟡','Chờ Ngày Trả Lời',st.cho_ngay_tra_loi||0,'#d97706','#fef3c7','#fde68a','cho_ngay_tra_loi');
    h+=_wtCard('🟢','Đã Được Trả Lời',st.da_tra_loi||0,'#16a34a','#f0fdf4','#bbf7d0','da_tra_loi');
    h+=_wtCard('🏁','Hội Thoại Hoàn Thành',st.hoan_thanh||0,'#7c3aed','#f5f3ff','#ddd6fe','hoan_thanh');
    h+='</div>';

    // My stats
    h+='<div style="display:flex;gap:8px;margin-bottom:14px">';
    h+='<span style="padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe">📤 Tôi tạo: '+(st.my_created||0)+'</span>';
    h+='<span style="padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700;background:#fef3c7;color:#92400e;border:1px solid #fde68a">📥 Cần xử lý: '+(st.my_assigned||0)+'</span>';
    h+='</div>';

    // Table
    h+='<div style="overflow-x:auto;border-radius:10px;border:1px solid #e5e7eb"><table style="width:100%;border-collapse:collapse;font-size:12px">';
    h+='<thead><tr style="background:#1e3a5f">';
    var cols=[{t:'STT',a:'center'},{t:'Người Tạo',a:'left'},{t:'Trạng Thái',a:'center'},{t:'Mã Phiếu',a:'center'},{t:'Tiêu Đề',a:'left'},{t:'Nội Dung Yêu Cầu',a:'left'},{t:'Mức Độ',a:'center'},{t:'Thời Gian',a:'center'},{t:'Ngày Hẹn Xử Lý',a:'center'},{t:'Người Nhận',a:'left'},{t:'Trả Lời',a:'center'},{t:'Ngày Tạo',a:'center'}];
    cols.forEach(function(c){
        h+='<th style="padding:8px 6px;text-align:'+c.a+';font-size:11px;font-weight:700;color:#fff;white-space:nowrap;border-right:1px solid rgba(255,255,255,0.1)">'+c.t+'</th>';
    });
    h+='</tr></thead><tbody>';

    if(!items.length){
        h+='<tr><td colspan="12" style="padding:40px;text-align:center;color:#9ca3af">Chưa có phiếu xử lý nào</td></tr>';
    }else{
        items.forEach(function(t,idx){
            var si=_wtSI(t);
            var late=t.is_overdue&&t.status!=='resolved'&&t.status!=='closed';
            var deadlineDate=t.deadline_at?new Date(t.deadline_at):null;
            var deadlineFmt=deadlineDate?String(deadlineDate.getDate()).padStart(2,'0')+'/'+String(deadlineDate.getMonth()+1).padStart(2,'0')+'/'+deadlineDate.getFullYear()+' '+String(deadlineDate.getHours()).padStart(2,'0')+':'+String(deadlineDate.getMinutes()).padStart(2,'0'):'—';
            h+='<tr onclick="_wtViewDetail('+t.id+')" style="border-bottom:1px solid #f1f5f9;cursor:pointer'+(late?';background:#fff5f5':'')+'" onmouseover="this.style.background=\'#f0f4ff\'" onmouseout="this.style.background=\''+(late?'#fff5f5':'')+'\'">'; 
            h+='<td style="padding:6px;text-align:center;color:#9ca3af">'+(idx+1)+'</td>';
            h+='<td style="padding:6px;color:#2563eb;font-weight:600;white-space:nowrap">'+(t.created_by_name||'—')+'</td>';
            h+='<td style="padding:6px;text-align:center;white-space:nowrap"><span style="display:inline-flex;align-items:center;gap:4px;background:'+si.bg+';color:'+si.c+';padding:3px 10px;border-radius:8px;font-size:10px;font-weight:800;border:1px solid '+si.c+'22">'+si.icon+' '+si.l+'</span></td>';
            h+='<td style="padding:6px;text-align:center;color:#4f46e5;font-weight:700">'+(t.ticket_code||'—')+'</td>';
            h+='<td style="padding:6px;font-weight:700;color:#1e293b;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(t.title||'—')+'</td>';
            var _ndyc2=t.latest_reply||t.description||'—';
            h+='<td style="padding:6px;color:#475569;font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(t.latest_reply?'💬 ':'')+_ndyc2+'</td>';
            h+='<td style="padding:6px;text-align:center">'+_wtPLB(t.priority_level||'low')+'</td>';
            h+='<td style="padding:6px;text-align:center;white-space:nowrap">'+_wtDeadlineBadge(t)+'</td>';
            h+='<td style="padding:6px;text-align:center;color:'+(late?'#dc2626':'#64748b')+';font-size:11px;font-weight:'+(late?'800':'600')+';white-space:nowrap">'+deadlineFmt+'</td>';
            h+='<td style="padding:6px;color:#d97706;font-weight:600;white-space:nowrap">'+(t.assigned_to_name||'—')+'</td>';
            h+='<td style="padding:6px;text-align:center"><span style="background:#e0e7ff;color:#4338ca;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700">💬 '+(t.reply_count||0)+'</span></td>';
            h+='<td style="padding:6px;text-align:center;color:#64748b;font-size:11px;white-space:nowrap">'+vnFormat(t.created_at)+'</td>';
            h+='</tr>';
        });
    }
    h+='</tbody></table></div>';
    main.innerHTML=h;
}

function _wtCard(icon,label,count,color,bg,border,status){
    var active=_wt.filter===status;
    return '<div onclick="_wtSetFilter(\''+status+'\')" style="flex:1;min-width:120px;padding:14px 18px;background:linear-gradient(135deg,'+bg+','+border+'44);border:2px solid '+(active?color:border)+';border-radius:12px;cursor:pointer;display:flex;align-items:center;gap:12px;transition:all .2s" onmouseover="this.style.boxShadow=\'0 4px 16px '+color+'33\'" onmouseout="this.style.boxShadow=\''+(active?'0 4px 16px '+color+'22':'none')+'\'">'
        +'<div style="font-size:24px">'+icon+'</div>'
        +'<div><div style="font-size:18px;font-weight:900;color:'+color+'">'+count+'</div>'
        +'<div style="font-size:11px;font-weight:700;color:'+color+'">'+label+'</div></div></div>';
}

function _wtSetFilter(s){_wt.filter=(_wt.filter===s)?'all':s;_wt.page=1;_wtLoadList();}

// ===== DETAIL =====
async function _wtViewDetail(id){
    try{
        var r=await apiCall('/api/work-tickets/'+id);
        var t=r.ticket;if(!t)return;
        var replies=r.replies||[];
        var si=_wtSI(t);
        var ov=document.createElement('div');
        ov.id='wtDetailOv';
        ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px';
        ov.onclick=function(e){if(e.target===ov)ov.remove();};

        var rH='';
        var ticketCreatorId2 = t.created_by;
        // Helper: render metadata badge for chat bubble
        function _wtMetaBadge(rp){
            var md=rp.metadata;if(!md)return '';
            try{if(typeof md==='string')md=JSON.parse(md);}catch(e){return '';}
            var h2='';
            if(md.priority_level){
                var _c=md.color||'#6b7280',_ico=md.icon||'',_lb=md.label||md.priority_level;
                var _sub='';
                if(md.is_calendar)_sub='📅 Theo lịch';
                else if(md.target_time)_sub='⏰ '+md.target_time;
                else if(md.duration_hours){var _dh=parseFloat(md.duration_hours),_hh=Math.floor(_dh),_mm=Math.round((_dh-_hh)*60);_sub=_hh>0&&_mm>0?_hh+'h'+_mm+'p':_hh>0?_hh+' tiếng':_mm+' phút';}
                h2+='<div style="margin-top:6px;padding:4px 8px;background:'+_c+'15;border:1px solid '+_c+'33;border-radius:6px;display:inline-flex;align-items:center;gap:4px">';
                h2+='<span style="font-size:9px;font-weight:800;color:'+_c+'">⚡ Mức độ: '+_ico+' '+_lb+'</span>';
                if(_sub)h2+='<span style="font-size:8px;color:'+_c+';opacity:0.8"> — '+_sub+'</span>';
                h2+='</div>';
            }
            if(md.action){
                if(md.action==='today'){
                    h2+='<div style="margin-top:6px;padding:4px 8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;display:inline-flex;align-items:center;gap:4px">';
                    h2+='<span style="font-size:9px;font-weight:800;color:#16a34a">✅ Xử lý hôm nay</span></div>';
                } else if((md.action==='schedule'||md.action==='other')&&md.scheduled_date){
                    var _dd=md.scheduled_date.split('-');var _fmt=_dd[2]+'/'+_dd[1]+'/'+_dd[0];
                    h2+='<div style="margin-top:6px;padding:4px 8px;background:#fefce8;border:1px solid #fde68a;border-radius:6px;display:inline-flex;align-items:center;gap:4px">';
                    h2+='<span style="font-size:9px;font-weight:800;color:#d97706">📅 Hẹn xử lý: '+_fmt+'</span></div>';
                }
            }
            return h2;
        }
        replies.forEach(function(rp){
            var isCreator2 = (rp.user_id == ticketCreatorId2);
            var rAttach=[];try{rAttach=typeof rp.attachments==='string'?JSON.parse(rp.attachments):rp.attachments||[];}catch(e){}
            var rpImgs2='';
            rAttach.forEach(function(a){if(a.type==='image'&&a.url)rpImgs2+='<img src="'+a.url+'" style="max-width:180px;max-height:110px;border-radius:6px;margin-top:4px;cursor:pointer;border:1px solid '+(isCreator2?'#bfdbfe':'#bbf7d0')+'" onclick="window.open(this.src,\'_blank\')">';});
            if(isCreator2){
                // ── Người tạo phiếu: LEFT align, blue accent ──
                rH+='<div style="display:flex;justify-content:flex-start;margin-bottom:8px"><div style="max-width:85%;padding:8px 12px;background:#eff6ff;border-radius:2px 12px 12px 12px;border-left:3px solid #2563eb">';
                rH+='<div style="display:flex;align-items:center;gap:4px;margin-bottom:3px"><span style="font-size:10px;font-weight:800;color:#2563eb">🧑‍💼 '+(rp.user_name||'—')+'</span><span style="font-size:8px;background:#dbeafe;color:#1d4ed8;padding:1px 6px;border-radius:4px;font-weight:700">Người yêu cầu</span></div>';
                rH+='<div style="font-size:11px;color:#1e3a5f;line-height:1.5">'+(rp.message||'').replace(/\n/g,'<br>')+'</div>';
                rH+=_wtMetaBadge(rp);
                if(rpImgs2)rH+='<div style="margin-top:4px">'+rpImgs2+'</div>';
                rH+='<div style="text-align:right;margin-top:3px"><span style="font-size:9px;color:#93c5fd">'+vnFormat(rp.created_at)+'</span></div>';
                rH+='</div></div>';
            } else {
                // ── Người trả lời: RIGHT align, green accent ──
                rH+='<div style="display:flex;justify-content:flex-end;margin-bottom:8px"><div style="max-width:85%;padding:8px 12px;background:#f0fdf4;border-radius:12px 2px 12px 12px;border-right:3px solid #16a34a">';
                rH+='<div style="display:flex;align-items:center;gap:4px;margin-bottom:3px;justify-content:flex-end"><span style="font-size:8px;background:#dcfce7;color:#15803d;padding:1px 6px;border-radius:4px;font-weight:700">Trả lời</span><span style="font-size:10px;font-weight:800;color:#16a34a">🏭 '+(rp.user_name||'—')+'</span></div>';
                rH+='<div style="font-size:11px;color:#14532d;line-height:1.5">'+(rp.message||'').replace(/\n/g,'<br>')+'</div>';
                rH+=_wtMetaBadge(rp);
                if(rpImgs2)rH+='<div style="margin-top:4px">'+rpImgs2+'</div>';
                rH+='<div style="text-align:left;margin-top:3px"><span style="font-size:9px;color:#86efac">'+vnFormat(rp.created_at)+'</span></div>';
                rH+='</div></div>';
            }
        });

        // Build reply priority buttons with time sub-text
        var rplyPL='';
        var pMap2={urgent:'🔴',high:'🟠',medium:'🟡',low:'🟢',scheduled:'⚪'};
        (_wt.pSettings||[]).forEach(function(ps){
            var isA=ps.priority_key===(t.priority_level||'low');
            var ico=pMap2[ps.priority_key]||ps.icon||'';
            var sub2='';
            if(ps.is_calendar){sub2='Chọn ngày';}
            else if(ps.target_time){sub2='H.sau '+ps.target_time;}
            else if(ps.duration_hours){var dh2=parseFloat(ps.duration_hours),hh2=Math.floor(dh2),mm2=Math.round((dh2-hh2)*60);sub2=hh2>0&&mm2>0?hh2+'h'+mm2+'p':hh2>0?hh2+' tiếng':mm2+' phút';}
            rplyPL+='<button type="button" onclick="_wtReplySelectPL(\''+ps.priority_key+'\',' +(ps.require_image?'true':'false')+')" class="_wtRPBtn" style="padding:4px 8px;border:1.5px solid '+(isA?'#4f46e5':'#e5e7eb')+';border-radius:6px;font-size:10px;font-weight:700;cursor:pointer;background:'+(isA?'#f5f3ff':'#fff')+';color:'+(isA?'#4f46e5':'#374151')+';text-align:center"><div>'+ico+' '+ps.label+'</div>'+(sub2?'<div style="font-size:8px;color:#9ca3af;font-weight:500;margin-top:1px">'+sub2+'</div>':'')+'</button>';
        });

        ov.innerHTML='<div style="background:#fff;border-radius:16px;max-width:700px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">'
            +'<div style="padding:16px 20px;background:linear-gradient(135deg,#4f46e5,#3730a3);border-radius:16px 16px 0 0;display:flex;align-items:center;justify-content:space-between">'
            +'<div><div style="font-size:15px;font-weight:800;color:#fff">📋 '+(t.ticket_code||'')+'</div><div style="font-size:11px;color:#c7d2fe;margin-top:2px">'+(t.title||'')+'</div></div>'
            +'<button onclick="document.getElementById(\'wtDetailOv\').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:8px;font-size:18px;cursor:pointer">×</button></div>'
            +'<div style="padding:20px">'

            +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">'
            +'<div style="padding:8px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb"><div style="font-size:10px;color:#9ca3af;font-weight:700">NGƯỜI TẠO</div><div style="font-size:12px;font-weight:700;color:#2563eb">'+(t.created_by_name||'—')+'</div></div>'
            +'<div style="padding:8px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb"><div style="font-size:10px;color:#9ca3af;font-weight:700">NGƯỜI NHẬN</div><div style="font-size:12px;font-weight:700;color:#d97706">'+(t.assigned_to_name||'—')+'</div></div>'
            +'<div style="padding:8px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb"><div style="font-size:10px;color:#9ca3af;font-weight:700">MÃ ĐƠN HÀNG</div><div style="font-size:12px;font-weight:700;color:#1e293b">'+(t.order_code||'—')+'</div></div>'
            +'<div style="padding:8px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb"><div style="font-size:10px;color:#9ca3af;font-weight:700">MỨC ĐỘ</div><div>'+_wtPLB(t.priority_level||'low')+'</div></div>'
            +'<div style="padding:8px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb"><div style="font-size:10px;color:#9ca3af;font-weight:700">THỜI HẠN</div><div>'+_wtDeadlineBadge(t)+'</div></div>'
            +'</div>'
            +(t.description?'<div style="margin-bottom:14px"><div style="font-size:11px;font-weight:700;color:#374151;margin-bottom:4px">📝 Mô tả</div><div style="padding:10px 14px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb;font-size:12px;color:#334155;line-height:1.6">'+t.description.replace(/\n/g,'<br>')+'</div></div>':'')
            +'<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:700;color:#374151;margin-bottom:6px">💬 Phản hồi ('+replies.length+')</div>'
            +(rH||'<div style="padding:14px;text-align:center;color:#9ca3af;font-size:12px">Chưa có phản hồi</div>')
            +'</div>'
            // Reply section with priority + image
            +'<div style="border:1px solid #e5e7eb;border-radius:10px;padding:12px;background:#fafafa">'
            +'<div style="font-size:11px;font-weight:700;color:#374151;margin-bottom:8px">✏️ Phản Hồi</div>'
            +'<textarea id="wtRM" rows="2" placeholder="Nhập nội dung phản hồi..." style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:12px;resize:vertical;font-family:inherit;margin-bottom:8px"></textarea>'
            // Priority selector
            +'<div style="margin-bottom:8px"><div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px">⚡ Chọn mức độ mới (tùy chọn)</div><div style="display:flex;gap:4px;flex-wrap:wrap">'+rplyPL+'</div><div id="wtReplyDlPreview" style="margin-top:4px"></div></div>'
            // Image paste zone (dynamic show/hide)
            +'<div id="wtReplyImgZone" style="margin-bottom:8px"><div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px">📷 Hình ảnh <span id="wtReplyImgReq" style="display:none;color:#dc2626">* Bắt buộc</span><span id="wtReplyImgOpt">(tùy chọn)</span></div><div id="wtReplyPaste" tabindex="0" style="padding:10px;border:2px dashed #d1d5db;border-radius:8px;text-align:center;cursor:pointer;background:#fff;outline:none;transition:all .2s" onfocus="this.style.borderColor=\'#6366f1\'" onblur="this.style.borderColor=\'#d1d5db\'"><div style="font-size:14px">📋</div><div style="font-size:10px;color:#64748b">Ctrl+V để dán ảnh</div></div><div id="wtReplyImgPreview" style="margin-top:4px"></div></div>'
            +'<div style="display:flex;justify-content:flex-end;gap:8px">'
            +(t.status==='resolved'&&currentUser&&currentUser.id==t.created_by?'<button onclick="_wtCloseTicket('+t.id+')" style="padding:8px 18px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 3px 10px rgba(124,58,237,0.3)">🏁 Hội Thoại Hoàn Thành</button>':'')
            +'<button onclick="_wtReply('+t.id+')" style="padding:8px 20px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">📤 Gửi Phản Hồi</button></div>'
            +'</div>'
            +'</div></div>';
        document.body.appendChild(ov);

        // Setup reply paste listener
        // Auto-set current priority so reply always triggers reset if ticket is resolved
        window._wtReplyPL=(t.status==='resolved')?t.priority_level:null;
        window._wtReplyImg=null;
        setTimeout(function(){
            var pz=document.getElementById('wtReplyPaste');if(!pz)return;
            pz.addEventListener('paste',function(e){
                var items=(e.clipboardData||e.originalEvent.clipboardData).items;
                for(var i=0;i<items.length;i++){
                    if(items[i].type.indexOf('image')!==-1){
                        var f=items[i].getAsFile();var reader=new FileReader();
                        reader.onload=function(ev){
                            window._wtReplyImg=ev.target.result;
                            var prv=document.getElementById('wtReplyImgPreview');
                            if(prv)prv.innerHTML='<div style="position:relative;display:inline-block;margin-top:4px"><img src="'+ev.target.result+'" style="max-width:150px;max-height:100px;border-radius:6px;border:1px solid #e5e7eb"><button onclick="window._wtReplyImg=null;this.parentElement.remove()" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;background:#dc2626;color:#fff;border:none;border-radius:50%;font-size:10px;cursor:pointer;line-height:18px">×</button></div>';
                        };reader.readAsDataURL(f);e.preventDefault();return;
                    }
                }
            });
            pz.addEventListener('dragover',function(e){e.preventDefault();pz.style.borderColor='#6366f1';pz.style.background='#f5f3ff';});
            pz.addEventListener('dragleave',function(e){pz.style.borderColor='#d1d5db';pz.style.background='#fff';});
            pz.addEventListener('drop',function(e){e.preventDefault();pz.style.borderColor='#d1d5db';pz.style.background='#fff';
                var files=e.dataTransfer.files;if(files&&files[0]&&files[0].type.startsWith('image/')){
                    var reader=new FileReader();reader.onload=function(ev){
                        window._wtReplyImg=ev.target.result;
                        var prv=document.getElementById('wtReplyImgPreview');
                        if(prv)prv.innerHTML='<div style="position:relative;display:inline-block;margin-top:4px"><img src="'+ev.target.result+'" style="max-width:150px;max-height:100px;border-radius:6px;border:1px solid #e5e7eb"><button onclick="window._wtReplyImg=null;this.parentElement.remove()" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;background:#dc2626;color:#fff;border:none;border-radius:50%;font-size:10px;cursor:pointer;line-height:18px">×</button></div>';
                    };reader.readAsDataURL(files[0]);
                }
            });
        },100);
    }catch(e){showToast('Lỗi: '+e.message,'error');}
}

async function _wtChSt(id,status){
    try{
        var r=await apiCall('/api/work-tickets/'+id+'/status','PUT',{status:status});
        if(r.error){showToast(r.error,'error');return;}
        showToast(r.message||'✅ Đã cập nhật');
        var ov=document.getElementById('wtDetailOv');if(ov)ov.remove();
        _wtLoadAll();
    }catch(e){showToast('Lỗi: '+e.message,'error');}
}

async function _wtCloseTicket(id){
    if(!confirm('🏁 Xác nhận đánh dấu Hội Thoại Hoàn Thành?\n\nPhiếu sẽ được chuyển sang trạng thái hoàn thành. Bạn vẫn có thể phản hồi thêm nếu cần.'))return;
    try{
        var r=await apiCall('/api/work-tickets/'+id+'/close','PUT',{});
        if(r.error){showToast(r.error,'error');return;}
        showToast(r.message||'✅ Hội Thoại Hoàn Thành');
        var ov=document.getElementById('wtDetailOv');if(ov)ov.remove();
        _wtLoadAll();
    }catch(e){showToast('Lỗi: '+e.message,'error');}
}

function _wtReplySelectPL(k,reqImg){
    window._wtReplyPL=k;
    document.querySelectorAll('._wtRPBtn').forEach(function(b){b.style.background='#fff';b.style.borderColor='#e5e7eb';b.style.color='#374151';});
    event.currentTarget.style.background='#f5f3ff';event.currentTarget.style.borderColor='#4f46e5';event.currentTarget.style.color='#4f46e5';
    // Người tạo phiếu KHÔNG cần hình ảnh bắt buộc khi chọn mức độ — chỉ QLX mới cần
    window._wtReplyReqImg=false;
    var reqEl=document.getElementById('wtReplyImgReq'),optEl=document.getElementById('wtReplyImgOpt');
    if(reqEl)reqEl.style.display='none';if(optEl)optEl.style.display='inline';
    // Show deadline preview
    var ps=(_wt.pSettings||[]).find(function(s){return s.priority_key===k;});
    var dlEl=document.getElementById('wtReplyDlPreview');
    if(dlEl&&ps){
        if(ps.is_calendar){dlEl.innerHTML='<span style="font-size:10px;color:#d97706">📅 → Chờ Ngày Trả Lời (đến ngày chọn sẽ chuyển Chờ Xử Lý)</span>';}
        else if(ps.target_time){dlEl.innerHTML='<span style="font-size:10px;color:#d97706">⏰ → Chờ Ngày Trả Lời — Hạn: ngày LV tiếp theo lúc '+ps.target_time+'</span>';}
        else if(ps.duration_hours){
            var _d=parseFloat(ps.duration_hours),_h=Math.floor(_d),_m=Math.round((_d-_h)*60);
            var _t=_h>0&&_m>0?_h+' giờ '+_m+' phút':_h>0?_h+' tiếng':_m+' phút';
            var _now=vnNow(),_hh=_now.getHours(),_mm=_now.getMinutes(),_curMin=_hh*60+_mm;
            if(_curMin>=18*60||_now.getDay()===0){
                dlEl.innerHTML='<span style="font-size:10px;color:#ea580c">🌙 Ngoài giờ LV → Chờ Ngày Trả Lời — Ngày LV tiếp theo QLX phải xử lý trong '+_t+' (giờ LV: 10h-12h30, 14h-18h)</span>';
            } else {
                dlEl.innerHTML='<span style="font-size:10px;color:#16a34a">✅ Trong giờ LV → Chờ Xử Lý — QLX phải trả lời trong '+_t+' (giờ LV: 10h-12h30, 14h-18h)</span>';
            }
        }
        else{dlEl.innerHTML='';}
    }
}
async function _wtReply(id){
    var el=document.getElementById('wtRM');if(!el)return;
    var msg=el.value.trim();
    if(!msg){showToast('Nhập nội dung phản hồi','error');return;}
    // Người tạo phiếu không bị bắt buộc ảnh — hình ảnh chỉ tùy chọn
    var body={message:msg};
    if(window._wtReplyPL)body.priority_level=window._wtReplyPL;
    if(window._wtReplyImg)body.image_data=window._wtReplyImg;
    try{
        var r=await apiCall('/api/work-tickets/'+id+'/reply','POST',body);
        if(r.error){showToast(r.error,'error');return;}
        showToast(r.message||'✅ Đã gửi');
        window._wtReplyPL=null;window._wtReplyImg=null;
        var ov=document.getElementById('wtDetailOv');if(ov)ov.remove();
        _wtViewDetail(id);_wtLoadAll();
    }catch(e){showToast('Lỗi: '+e.message,'error');}
}

// ===== TYPE CHOICE =====
function _wtOpenTypeChoice(){
    var ov=document.createElement('div');ov.id='wtTypeOv';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99998;display:flex;align-items:center;justify-content:center';
    ov.onclick=function(e){if(e.target===ov)ov.remove();};
    ov.innerHTML='<div style="background:#fff;border-radius:16px;max-width:480px;width:95%;box-shadow:0 25px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">'
    +'<div style="padding:16px 20px;background:linear-gradient(135deg,#4f46e5,#3730a3);border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center"><div style="font-size:15px;font-weight:800;color:#fff">➕ Tạo Phiếu Xử Lý CV</div><button onclick="document.getElementById(\'wtTypeOv\').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:8px;font-size:18px;cursor:pointer">×</button></div>'
    +'<div style="padding:24px;display:flex;flex-direction:column;gap:12px">'
    +'<div onclick="document.getElementById(\'wtTypeOv\').remove();_wtOpenForm(\'custom\')" style="padding:20px;border:2px solid #e5e7eb;border-radius:12px;cursor:pointer;transition:all .2s" onmouseover="this.style.borderColor=\'#6366f1\';this.style.background=\'#f5f3ff\'" onmouseout="this.style.borderColor=\'#e5e7eb\';this.style.background=\'\'"><div style="font-size:24px;margin-bottom:6px">📝</div><div style="font-weight:800;font-size:14px;color:#1e293b">Tạo Phiếu Xử Lý</div><div style="font-size:11px;color:#64748b;margin-top:2px">Phiếu xử lý tự do, không gắn đơn hàng</div></div>'
    +'<div onclick="document.getElementById(\'wtTypeOv\').remove();_wtOpenForm(\'order\')" style="padding:20px;border:2px solid #e5e7eb;border-radius:12px;cursor:pointer;transition:all .2s" onmouseover="this.style.borderColor=\'#6366f1\';this.style.background=\'#f5f3ff\'" onmouseout="this.style.borderColor=\'#e5e7eb\';this.style.background=\'\'"><div style="font-size:24px;margin-bottom:6px">📦</div><div style="font-weight:800;font-size:14px;color:#1e293b">Tạo Phiếu Theo Đơn</div><div style="font-size:11px;color:#64748b;margin-top:2px">Gắn với mã đơn hàng cụ thể</div></div>'
    +'</div></div>';
    document.body.appendChild(ov);
}

function _wtOpenForm(type){
    window._wtFormType=type;window._wtFormImg=null;
    var ov=document.createElement('div');ov.id='wtFormOv';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px';
    ov.onclick=function(e){if(e.target===ov)ov.remove();};
    var fm=_wt.fmgr;var fmName=fm?(fm.full_name||fm.username):'(Chưa cấu hình)';
    var h='<div style="background:#fff;border-radius:16px;max-width:620px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">';
    h+='<div style="padding:16px 20px;background:linear-gradient(135deg,#4f46e5,#3730a3);border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center"><div style="font-size:15px;font-weight:800;color:#fff">➕ '+(type==='order'?'Tạo Phiếu Theo Đơn':'Tạo Phiếu Xử Lý')+'</div><button onclick="document.getElementById(\'wtFormOv\').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:8px;font-size:18px;cursor:pointer">×</button></div>';
    h+='<div style="padding:20px">';
    // Người tạo phiếu
    var _creatorName=(typeof currentUser!=='undefined'&&currentUser)?currentUser.full_name:'---';
    h+='<div style="margin-bottom:12px;padding:10px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;display:flex;align-items:center;gap:8px"><span style="font-size:18px">👤</span><div><div style="font-size:10px;font-weight:700;color:#3b82f6;text-transform:uppercase">Người Tạo Phiếu</div><div style="font-size:14px;font-weight:800;color:#1e293b">'+_creatorName+'</div></div></div>';
    // Mã phiếu (chỉ hiện cho phiếu tự do)
    if(type!=='order') h+='<div style="margin-bottom:12px;padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px"><span style="font-size:10px;font-weight:700;color:#9ca3af">📌 MÃ PHIẾU</span> <span style="font-size:14px;font-weight:900;color:#4f46e5;margin-left:8px">'+(_wt.nextCode||'PHIEUHV0001')+'</span> <span style="font-size:9px;color:#9ca3af">(tự động)</span></div>';
    // Mã đơn (chọn từ dropdown, không cho nhập tự do)
    if(type==='order') h+='<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">📦 Mã Đơn Hàng = Mã Phiếu <span style="color:#dc2626">*</span></label><div style="position:relative"><input id="wtF_o" type="text" readonly placeholder="👆 Nhấn để tìm đơn hàng..." onclick="this.readOnly=false;this.value=\'\';this.placeholder=\'Nhập mã đơn để tìm...\';_wtSearchOrder(\'\')" oninput="_wtSearchOrder(this.value)" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;cursor:pointer;background:#f8fafc"><input type="hidden" id="wtF_oId"></div><div id="wtOrderResults"></div><div style="margin-top:4px;font-size:10px;color:#6366f1;font-weight:600">📌 Mã phiếu sẽ là mã đơn hàng bạn chọn (mỗi đơn chỉ tạo 1 phiếu duy nhất)</div></div>';
    // Tiêu đề
    h+='<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">📋 Tiêu Đề <span style="color:#dc2626">*</span></label><input id="wtF_t" type="text" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px"></div>';
    // Nội dung
    h+='<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">📝 Nội Dung Yêu Cầu <span style="color:#dc2626">*</span></label><textarea id="wtF_d" rows="3" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;resize:vertical;font-family:inherit"></textarea></div>';
    // Mức độ
    h+='<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:8px">⚡ Mức Độ <span style="color:#dc2626">*</span></label>';
    h+='<div style="display:flex;gap:6px;flex-wrap:wrap" id="wtPriorityBtns">';
    // Build from pSettings (dynamic)
    var pMap={urgent:{l:'🔴 Khẩn Cấp'},high:{l:'🟠 Cao'},medium:{l:'🟡 Trung Bình'},low:{l:'🟢 Thấp'},scheduled:{l:'⚪ Theo Lịch'}};
    var pList=[];(_wt.pSettings||[]).forEach(function(ps){
        var sub='';
        if(ps.is_calendar){sub='Chọn ngày';}
        else if(ps.target_time){sub='H.sau '+ps.target_time;}
        else if(ps.duration_hours){
            var dh=parseFloat(ps.duration_hours);
            var hh=Math.floor(dh),mm=Math.round((dh-hh)*60);
            if(hh>0&&mm>0)sub=hh+'h'+mm+'p';
            else if(hh>0)sub=hh+' tiếng';
            else sub=mm+' phút';
        }
        pList.push({k:ps.priority_key,l:(pMap[ps.priority_key]||{}).l||ps.icon+' '+ps.label,sub:sub});
    });
    if(!pList.length) pList=[{k:'urgent',l:'🔴 Khẩn Cấp',sub:'1 tiếng'},{k:'high',l:'🟠 Cao',sub:'3 tiếng'},{k:'medium',l:'🟡 Trung Bình',sub:'6 tiếng'},{k:'low',l:'🟢 Thấp',sub:'H.sau 12h'},{k:'scheduled',l:'⚪ Theo Lịch',sub:'Chọn ngày'}];
    pList.forEach(function(p){h+='<button type="button" onclick="_wtSelectPriority(\''+p.k+'\')" id="wtPL_'+p.k+'" style="flex:1;min-width:100px;padding:10px 8px;border:2px solid #e5e7eb;border-radius:10px;background:#fff;cursor:pointer;text-align:center;transition:all .2s"><div style="font-size:12px;font-weight:800">'+p.l+'</div><div style="font-size:9px;color:#9ca3af;margin-top:2px">'+p.sub+'</div></button>';});
    h+='</div></div>';
    // Image upload (hidden by default, shown for urgent) - Ctrl+V paste
    h+='<div id="wtImgZone" style="display:none;margin-bottom:12px;padding:14px;background:#fef2f2;border:2px solid #fecaca;border-radius:10px"><label style="font-size:11px;font-weight:800;color:#dc2626;display:block;margin-bottom:6px">📷 Hình Ảnh Bắt Buộc <span style="color:#dc2626">*</span></label><div id="wtPasteZone" tabindex="0" style="padding:16px;border:2px dashed #fca5a5;border-radius:8px;text-align:center;cursor:pointer;background:#fff5f5;outline:none;transition:all .2s" onfocus="this.style.borderColor=\'#dc2626\'" onblur="this.style.borderColor=\'#fca5a5\'"><div style="font-size:20px;margin-bottom:4px">📋</div><div style="font-size:11px;color:#dc2626;font-weight:700">Nhấn vào đây rồi Ctrl+V để dán ảnh</div><div style="font-size:10px;color:#9ca3af;margin-top:2px">hoặc kéo thả ảnh vào</div></div><div id="wtImgPreview" style="margin-top:6px"></div></div>';
    // Calendar (hidden, shown for scheduled)
    h+='<div id="wtCalZone" style="display:none;margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:6px">📅 Chọn Ngày Hết Hạn <span style="color:#dc2626">*</span></label><div id="wtCalContainer"></div></div>';
    // Optional image for non-urgent - Ctrl+V paste
    h+='<div id="wtOptImgZone" style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">📷 Hình Ảnh (tùy chọn)</label><div id="wtOptPasteZone" tabindex="0" style="padding:14px;border:2px dashed #d1d5db;border-radius:8px;text-align:center;cursor:pointer;background:#fafafa;outline:none;transition:all .2s" onfocus="this.style.borderColor=\'#6366f1\'" onblur="this.style.borderColor=\'#d1d5db\'"><div style="font-size:18px;margin-bottom:2px">📋</div><div style="font-size:11px;color:#64748b;font-weight:600">Ctrl+V để dán ảnh</div></div><div id="wtOptImgPreview" style="margin-top:6px"></div></div>';
    // Deadline preview
    h+='<div id="wtDeadlinePreview" style="display:none;margin-bottom:12px;padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:12px;font-weight:700;color:#16a34a"></div>';
    // Người nhận
    h+='<div style="margin-bottom:14px;padding:10px 14px;background:#fef3c7;border:1px solid #fde68a;border-radius:8px"><span style="font-size:10px;font-weight:700;color:#92400e">👤 NGƯỜI NHẬN</span> <span style="font-size:13px;font-weight:800;color:#1e293b;margin-left:8px">'+fmName+'</span> <span style="font-size:9px;color:#9ca3af">(mặc định)</span></div>';
    // Buttons
    h+='<div style="display:flex;gap:8px;justify-content:flex-end">';
    h+='<button onclick="document.getElementById(\'wtFormOv\').remove()" style="padding:8px 20px;background:#f1f5f9;color:#64748b;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">Hủy</button>';
    h+='<button id="wtSubmitBtn" onclick="_wtSubmit()" style="padding:8px 20px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">✅ Tạo Phiếu</button>';
    h+='</div></div></div>';
    ov.innerHTML=h;document.body.appendChild(ov);
    // Default select low
    setTimeout(function(){_wtSelectPriority('low');},100);
    // Setup paste listeners
    setTimeout(function(){_wtSetupPaste();},150);
}
window._wtSelectedPL='low';
function _wtSelectPriority(k){
    window._wtSelectedPL=k;
    var _allPKeys=(_wt.pSettings||[]).map(function(s){return s.priority_key;});
    if(!_allPKeys.length)_allPKeys=['urgent','high','medium','low','scheduled'];
    _allPKeys.forEach(function(pk){
        var el=document.getElementById('wtPL_'+pk);if(!el)return;
        el.style.borderColor=pk===k?'#4f46e5':'#e5e7eb';el.style.background=pk===k?'#f5f3ff':'#fff';
    });
    var imgZ=document.getElementById('wtImgZone'),calZ=document.getElementById('wtCalZone'),optZ=document.getElementById('wtOptImgZone'),dlP=document.getElementById('wtDeadlinePreview');
    var curPs=(_wt.pSettings||[]).find(function(s){return s.priority_key===k;});
    var needImg=curPs&&curPs.require_image;
    if(imgZ)imgZ.style.display=needImg?'block':'none';
    if(calZ)calZ.style.display=k==='scheduled'?'block':'none';
    if(optZ)optZ.style.display=needImg?'none':'block';
    if(dlP){
        // Read from pSettings dynamically
        var ps=(_wt.pSettings||[]).find(function(s){return s.priority_key===k;});
        if(ps){
            if(ps.is_calendar){dlP.style.display='none';}
            else if(ps.target_time){dlP.style.display='block';dlP.innerHTML='⏰ Hạn xử lý: <b>Ngày hôm sau '+ps.target_time+'</b>';}
            else if(ps.duration_hours){
                var _pdh=parseFloat(ps.duration_hours),_phh=Math.floor(_pdh),_pmm=Math.round((_pdh-_phh)*60);
                var _pTxt=_phh>0&&_pmm>0?_phh+' giờ '+_pmm+' phút':_phh>0?_phh+' tiếng':_pmm+' phút';
                dlP.style.display='block';dlP.innerHTML='⏰ Hạn xử lý: <b>'+_pTxt+'</b> từ lúc tạo';
            }
            else{dlP.style.display='none';}
        }else{dlP.style.display='none';}
    }
    if(k==='scheduled'){setTimeout(function(){initHolidayCalendar({containerId:'wtCalContainer',hiddenInputId:'wtCalValue',minDate:vnDateStr()});},50);}
}
function _wtSetupPaste(){
    var z1=document.getElementById('wtPasteZone');
    var z2=document.getElementById('wtOptPasteZone');
    if(z1){z1.addEventListener('paste',function(e){_wtHandlePaste(e,false);});z1.addEventListener('drop',function(e){e.preventDefault();if(e.dataTransfer.files[0])_wtSetImg(e.dataTransfer.files[0],false);});z1.addEventListener('dragover',function(e){e.preventDefault();});}
    if(z2){z2.addEventListener('paste',function(e){_wtHandlePaste(e,true);});z2.addEventListener('drop',function(e){e.preventDefault();if(e.dataTransfer.files[0])_wtSetImg(e.dataTransfer.files[0],true);});z2.addEventListener('dragover',function(e){e.preventDefault();});}
}
function _wtHandlePaste(e,opt){
    var items=e.clipboardData&&e.clipboardData.items;
    if(!items)return;
    for(var i=0;i<items.length;i++){
        if(items[i].type.indexOf('image')!==-1){
            var f=items[i].getAsFile();
            if(f){_wtSetImg(f,opt);e.preventDefault();return;}
        }
    }
    showToast('Clipboard không có ảnh','error');
}
function _wtSetImg(file,opt){
    if(!opt)window._wtFormImg=file;else window._wtFormOptImg=file;
    var prev=document.getElementById(opt?'wtOptImgPreview':'wtImgPreview');if(!prev)return;
    var r=new FileReader();r.onload=function(e){
        prev.innerHTML='<div style="display:flex;align-items:center;gap:8px;margin-top:4px"><img src="'+e.target.result+'" style="width:60px;height:60px;object-fit:cover;border-radius:8px;border:2px solid #4f46e5"><div><div style="font-size:11px;font-weight:700;color:#16a34a">✅ Đã dán ảnh</div><div style="font-size:10px;color:#64748b">'+(file.name||'clipboard')+' ('+Math.round(file.size/1024)+'KB)</div><button onclick="_wtRemoveImg('+opt+')" style="margin-top:2px;font-size:10px;color:#dc2626;background:none;border:none;cursor:pointer;text-decoration:underline">❌ Xóa</button></div></div>';
    };r.readAsDataURL(file);
}
function _wtRemoveImg(opt){
    if(!opt)window._wtFormImg=null;else window._wtFormOptImg=null;
    var prev=document.getElementById(opt?'wtOptImgPreview':'wtImgPreview');if(prev)prev.innerHTML='';
}
var _wtSearchTimer=null;
async function _wtSearchOrder(q){
    clearTimeout(_wtSearchTimer);
    var el=document.getElementById('wtOrderResults');if(!el)return;
    if(!q||q.length<1){
        // Show recent orders immediately
        try{
            var r=await apiCall('/api/work-tickets/search-orders');
            if(r.orders&&r.orders.length){_wtShowOrderList(r.orders);}
            else{el.innerHTML='<div style="padding:8px;font-size:11px;color:#9ca3af">Không có đơn hàng nào</div>';}
        }catch(e){}
        return;
    }
    _wtSearchTimer=setTimeout(async function(){
        try{
            var r=await apiCall('/api/work-tickets/search-orders?q='+encodeURIComponent(q));
            if(!r.orders||!r.orders.length){el.innerHTML='<div style="padding:8px;font-size:11px;color:#dc2626">❌ Không tìm thấy đơn hàng</div>';return;}
            _wtShowOrderList(r.orders);
        }catch(e){}
    },300);
}
function _wtShowOrderList(orders){
    var el=document.getElementById('wtOrderResults');if(!el)return;
    var h='<div style="max-height:180px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:6px;margin-top:4px;background:#fff;box-shadow:0 4px 12px rgba(0,0,0,0.1)">';
    orders.forEach(function(o){
        h+='<div onclick="_wtSelectOrder(\''+o.order_code+'\','+o.id+')" style="padding:8px 12px;cursor:pointer;font-size:12px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center" onmouseover="this.style.background=\'#f0f4ff\'" onmouseout="this.style.background=\'\'">';
        h+='<div><b style="color:#4f46e5">'+o.order_code+'</b></div>';
        h+='<div style="font-size:10px;color:#64748b">'+(o.customer_name||'')+'</div>';
        h+='</div>';
    });
    h+='</div>';el.innerHTML=h;
}
function _wtSelectOrder(code,id){
    var inp=document.getElementById('wtF_o');if(inp){inp.value=code;inp.readOnly=true;inp.style.background='#f0fdf4';inp.style.borderColor='#16a34a';inp.style.fontWeight='700';inp.style.color='#16a34a';inp.style.cursor='pointer';}
    var hid=document.getElementById('wtF_oId');if(hid)hid.value=id;
    document.getElementById('wtOrderResults').innerHTML='<div style="padding:4px 8px;font-size:11px;color:#16a34a;font-weight:700">✅ Đã chọn: '+code+'</div>';
}
async function _wtSubmit(){
    var title=(document.getElementById('wtF_t')||{}).value||'';
    var desc=(document.getElementById('wtF_d')||{}).value||'';
    var orderCode=(document.getElementById('wtF_o')||{}).value||'';
    var pl=window._wtSelectedPL||'low';
    var fm=_wt.fmgr;
    title=title.trim();
    if(!title){showToast('Vui lòng nhập tiêu đề','error');return;}
    if(!desc.trim()){showToast('Vui lòng nhập nội dung yêu cầu','error');return;}
    if(!fm){showToast('Chưa cấu hình người nhận','error');return;}
    if(window._wtFormType==='order'&&!orderCode.trim()){showToast('Vui lòng nhập mã đơn hàng','error');return;}
    var submitPs=(_wt.pSettings||[]).find(function(s){return s.priority_key===pl;});
    if(submitPs&&submitPs.require_image&&!window._wtFormImg){showToast((submitPs.icon||'')+' '+submitPs.label+': Bắt buộc đính kèm ảnh!','error');return;}
    var scheduledDate=null;
    if(pl==='scheduled'){scheduledDate=getHolidayCalendarValue('wtCalContainer');if(!scheduledDate){showToast('Vui lòng chọn ngày hết hạn','error');return;}}
    var btn=document.getElementById('wtSubmitBtn');if(btn){btn.disabled=true;btn.textContent='⏳ Đang tạo...';}
    try{
        var r=await apiCall('/api/work-tickets','POST',{title:title,description:desc.trim(),assigned_to:fm.id,priority_level:pl,order_code:orderCode.trim()||null,type:window._wtFormType||'custom',scheduled_date:scheduledDate});
        if(r.error){showToast(r.error,'error');return;}
        var imgFile=window._wtFormImg||(pl!=='urgent'?window._wtFormOptImg:null);
        if(imgFile&&r.ticket_id){
            var fd=new FormData();fd.append('image',imgFile);
            await fetch('/api/work-tickets/'+r.ticket_id+'/image',{method:'POST',headers:{'Authorization':'Bearer '+localStorage.getItem('token')},body:fd});
        }
        showToast(r.message||'✅ Đã tạo phiếu');
        var ov=document.getElementById('wtFormOv');if(ov)ov.remove();
        window._wtFormImg=null;window._wtFormOptImg=null;
        _wtLoadAll();
    }catch(e){showToast('Lỗi: '+e.message,'error');}
    finally{if(btn){btn.disabled=false;btn.textContent='✅ Tạo Phiếu';}}
}
// ===== SETTINGS =====
async function _wtOpenSettings(){
    try{var r=await apiCall('/api/work-tickets/priority-settings');var s=r.settings||[];}catch(e){showToast('Lỗi tải','error');return;}
    try{var r2=await apiCall('/api/work-tickets/work-schedules');window._wtWS=r2.schedules||[];}catch(e){window._wtWS=[];}
    var ov=document.createElement('div');ov.id='wtSetOv';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center';
    ov.onclick=function(e){if(e.target===ov)ov.remove();};
    var h='<div style="background:#fff;border-radius:16px;max-width:560px;width:95%;max-height:85vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">';
    h+='<div style="padding:14px 20px;background:linear-gradient(135deg,#64748b,#475569);border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center"><div style="font-size:14px;font-weight:800;color:#fff">⚙️ Cài Đặt Mức Độ & Lịch Làm Việc</div><button onclick="document.getElementById(\'wtSetOv\').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:28px;height:28px;border-radius:6px;font-size:16px;cursor:pointer">×</button></div>';
    h+='<div style="padding:20px">';
    h+='<div style="font-size:12px;font-weight:800;color:#1e293b;margin-bottom:8px">📊 Mức Độ Ưu Tiên</div>';
    s.forEach(function(p){
        h+='<div style="padding:12px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:10px"><div style="font-weight:800;font-size:13px;margin-bottom:8px">'+(p.icon||'')+' '+p.label+'</div>';
        if(p.duration_hours!==null&&!p.is_calendar&&!p.target_time){
            var _dh=parseFloat(p.duration_hours||0),_hh=Math.floor(_dh),_mm=Math.round((_dh-_hh)*60);
            h+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><span style="font-size:11px;color:#374151;font-weight:600">Thời hạn:</span><input id="wtSet_dur_h_'+p.priority_key+'" type="number" value="'+_hh+'" min="0" step="1" style="width:50px;padding:4px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:12px;text-align:center"><span style="font-size:11px;color:#64748b">giờ</span><input id="wtSet_dur_m_'+p.priority_key+'" type="number" value="'+_mm+'" min="0" max="59" step="5" style="width:50px;padding:4px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:12px;text-align:center"><span style="font-size:11px;color:#64748b">phút</span></div>';
        }
        if(p.target_time) h+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><span style="font-size:11px;color:#374151;font-weight:600">Deadline:</span><input id="wtSet_time_'+p.priority_key+'" type="time" value="'+(p.target_time||'12:00')+'" style="padding:4px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:12px"><span style="font-size:11px;color:#64748b">hôm sau</span></div>';
        h+='<div style="display:flex;gap:12px;font-size:11px"><label><input type="checkbox" id="wtSet_img_'+p.priority_key+'" '+(p.require_image?'checked':'')+'>  Bắt buộc ảnh</label><label><input type="checkbox" id="wtSet_pen_'+p.priority_key+'" '+(p.penalty_on_late?'checked':'')+'>  Phạt khi trễ</label></div>';
        h+='</div>';
    });
    h+='<div style="margin-top:16px;padding-top:16px;border-top:2px solid #e5e7eb">';
    h+='<div style="font-size:12px;font-weight:800;color:#1e293b;margin-bottom:10px">🕐 Khung Giờ Làm Việc</div>';
    h+='<div style="margin-bottom:12px;padding:10px;background:#f5f3ff;border-radius:8px;border:1px solid #ddd6fe"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><div style="font-size:11px;font-weight:700;color:#4f46e5">🏭 Quản Lý Xưởng</div><button type="button" onclick="_wtAddWSRow(\'qlx\')" style="padding:2px 10px;background:#4f46e5;color:#fff;border:none;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer">+ Thêm ca</button></div><div id="wtWS_qlx">';
    (window._wtWS||[]).filter(function(w){return w.role_type==='qlx';}).forEach(function(w){
        h+='<div class="_wtWSRow" data-role="qlx" style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><input type="time" class="_wtWSStart" value="'+w.start_time+'" style="padding:4px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:12px"><span style="font-size:11px;color:#64748b">→</span><input type="time" class="_wtWSEnd" value="'+w.end_time+'" style="padding:4px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:12px"><button type="button" onclick="this.parentElement.remove()" style="width:22px;height:22px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:4px;font-size:11px;cursor:pointer;line-height:20px">×</button></div>';
    });
    h+='</div></div>';
    h+='<div style="margin-bottom:12px;padding:10px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><div style="font-size:11px;font-weight:700;color:#16a34a">👔 Nhân Viên</div><button type="button" onclick="_wtAddWSRow(\'nhanvien\')" style="padding:2px 10px;background:#16a34a;color:#fff;border:none;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer">+ Thêm ca</button></div><div id="wtWS_nhanvien">';
    (window._wtWS||[]).filter(function(w){return w.role_type==='nhanvien';}).forEach(function(w){
        h+='<div class="_wtWSRow" data-role="nhanvien" style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><input type="time" class="_wtWSStart" value="'+w.start_time+'" style="padding:4px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:12px"><span style="font-size:11px;color:#64748b">→</span><input type="time" class="_wtWSEnd" value="'+w.end_time+'" style="padding:4px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:12px"><button type="button" onclick="this.parentElement.remove()" style="width:22px;height:22px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:4px;font-size:11px;cursor:pointer;line-height:20px">×</button></div>';
    });
    h+='</div></div></div>';
    h+='<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button onclick="document.getElementById(\'wtSetOv\').remove()" style="padding:8px 16px;background:#f1f5f9;color:#64748b;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">Hủy</button><button onclick="_wtSaveSettings()" style="padding:8px 16px;background:linear-gradient(135deg,#64748b,#475569);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">💾 Lưu</button></div>';
    h+='</div></div>';ov.innerHTML=h;document.body.appendChild(ov);
}
function _wtAddWSRow(role){
    var cont=document.getElementById('wtWS_'+role);if(!cont)return;
    var row=document.createElement('div');row.className='_wtWSRow';row.setAttribute('data-role',role);
    row.style.cssText='display:flex;align-items:center;gap:6px;margin-bottom:4px';
    row.innerHTML='<input type="time" class="_wtWSStart" value="08:00" style="padding:4px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:12px"><span style="font-size:11px;color:#64748b">→</span><input type="time" class="_wtWSEnd" value="12:00" style="padding:4px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:12px"><button type="button" onclick="this.parentElement.remove()" style="width:22px;height:22px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:4px;font-size:11px;cursor:pointer;line-height:20px">×</button>';
    cont.appendChild(row);
}
async function _wtSaveSettings(){
    var arr=[];
    var _saveKeys=(_wt.pSettings||[]).map(function(s){return s.priority_key;});
    if(!_saveKeys.length)_saveKeys=['urgent','high','medium','low','scheduled'];
    _saveKeys.forEach(function(k){
        var durHEl=document.getElementById('wtSet_dur_h_'+k),durMEl=document.getElementById('wtSet_dur_m_'+k),timeEl=document.getElementById('wtSet_time_'+k);
        var durationHours=null;
        if(durHEl||durMEl){
            var hVal=durHEl?parseInt(durHEl.value)||0:0;
            var mVal=durMEl?parseInt(durMEl.value)||0:0;
            durationHours=hVal+(mVal/60);
            durationHours=Math.round(durationHours*100)/100;
        }
        arr.push({priority_key:k,duration_hours:durationHours,target_time:timeEl?timeEl.value:null,require_image:document.getElementById('wtSet_img_'+k)?.checked||false,penalty_on_late:document.getElementById('wtSet_pen_'+k)?.checked!==false});
    });
    var wsArr=[];
    document.querySelectorAll('._wtWSRow').forEach(function(row){
        var role=row.getAttribute('data-role');
        var st=row.querySelector('._wtWSStart');
        var en=row.querySelector('._wtWSEnd');
        if(st&&en&&st.value&&en.value){wsArr.push({role_type:role,start_time:st.value,end_time:en.value});}
    });
    try{
        var r=await apiCall('/api/work-tickets/priority-settings','PUT',{settings:arr});
        if(r.error){showToast(r.error,'error');return;}
        var r2=await apiCall('/api/work-tickets/work-schedules','PUT',{schedules:wsArr});
        if(r2.error){showToast(r2.error,'error');return;}
        showToast('✅ Đã lưu cài đặt & lịch làm việc');document.getElementById('wtSetOv')?.remove();_wtLoadAll();
    }catch(e){showToast('Lỗi: '+e.message,'error');}
}
