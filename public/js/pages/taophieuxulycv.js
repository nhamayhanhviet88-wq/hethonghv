// ========== TẠO PHIẾU XỬ LÝ CV ==========
var _wt={staff:[],depts:[],tickets:[],stats:{},filter:'all',search:'',page:1};

function _wtSI(s){
    if(s==='resolved') return {l:'Đã Xử Lý',c:'#16a34a',bg:'#f0fdf4',icon:'🟢'};
    if(s==='in_progress') return {l:'Đang Xử Lý',c:'#d97706',bg:'#fef3c7',icon:'🟡'};
    if(s==='closed') return {l:'Đã Đóng',c:'#6b7280',bg:'#f3f4f6',icon:'⚫'};
    return {l:'Chờ Xử Lý',c:'#dc2626',bg:'#fef2f2',icon:'🔴'};
}
function _wtPB(p){
    if(p==='GẤP') return '<span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:800;background:#fef2f2;color:#dc2626;border:1px solid #fecaca">🔥 GẤP</span>';
    return '<span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0">CHUẨN</span>';
}

function renderTaophieuxulycvPage(c){
    c.innerHTML='<div id="wtMain" style="padding:20px;background:#fafbfc;min-height:calc(100vh - 80px)"><div style="text-align:center;padding:40px;color:#64748b">⏳ Đang tải...</div></div>';
    _wt.filter='all';_wt.search='';_wt.page=1;
    _wtLoadAll();
}

async function _wtLoadAll(){
    try{var r=await apiCall('/api/work-tickets/staff');_wt.staff=r.users||[];_wt.depts=r.departments||[];}catch(e){}
    try{var r2=await apiCall('/api/work-tickets/stats');_wt.stats=r2.stats||{};}catch(e){}
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

    // Header
    h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">';
    h+='<div style="font-size:18px;font-weight:900;color:#1e293b">📋 TẠO PHIẾU XỬ LÝ CÔNG VIỆC <span style="color:#9ca3af;font-weight:500;font-size:13px">('+(st.total||0)+' phiếu)</span></div>';
    h+='<button onclick="_wtOpenForm()" style="padding:10px 20px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(99,102,241,0.3)">+ Tạo Phiếu Mới</button>';
    h+='</div>';

    // Search
    h+='<div style="margin-bottom:14px"><input id="wtSearchInput" type="text" placeholder="🔍 Tìm mã phiếu, tiêu đề, mã đơn..." value="'+(_wt.search||'')+'" onkeydown="if(event.key===\'Enter\'){_wt.search=this.value;_wt.page=1;_wtLoadList()}" style="width:100%;padding:10px 14px;border:1.5px solid #d1d5db;border-radius:10px;font-size:13px;outline:none" onfocus="this.style.borderColor=\'#6366f1\'" onblur="this.style.borderColor=\'#d1d5db\'"></div>';

    // 4 Stat Cards
    h+='<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">';
    h+=_wtCard('🔴','Chờ Xử Lý',st.pending||0,'#dc2626','#fef2f2','#fecaca','pending');
    h+=_wtCard('🟡','Đang Xử Lý',st.in_progress||0,'#d97706','#fef3c7','#fde68a','in_progress');
    h+=_wtCard('🟢','Đã Xử Lý',st.resolved||0,'#16a34a','#f0fdf4','#bbf7d0','resolved');
    h+=_wtCard('⚫','Đã Đóng',st.closed||0,'#6b7280','#f3f4f6','#e5e7eb','closed');
    h+='</div>';

    // My stats
    h+='<div style="display:flex;gap:8px;margin-bottom:14px">';
    h+='<span style="padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe">📤 Tôi tạo: '+(st.my_created||0)+'</span>';
    h+='<span style="padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700;background:#fef3c7;color:#92400e;border:1px solid #fde68a">📥 Cần xử lý: '+(st.my_assigned||0)+'</span>';
    h+='</div>';

    // Table
    h+='<div style="overflow-x:auto;border-radius:10px;border:1px solid #e5e7eb"><table style="width:100%;border-collapse:collapse;font-size:12px">';
    h+='<thead><tr style="background:#1e3a5f">';
    ['STT','Người Tạo','Mã Đơn','Trạng Thái','Ngày Hẹn Xử Lý','Tiêu Đề','Nội Dung Yêu Cầu','Người Nhận','Trả Lời Yêu Cầu','Ngày Tạo'].forEach(function(c){
        h+='<th style="padding:8px 6px;text-align:left;font-size:11px;font-weight:700;color:#fff;white-space:nowrap;border-right:1px solid rgba(255,255,255,0.1)">'+c+'</th>';
    });
    h+='</tr></thead><tbody>';

    if(!items.length){
        h+='<tr><td colspan="10" style="padding:40px;text-align:center;color:#9ca3af">Chưa có phiếu xử lý nào</td></tr>';
    }else{
        items.forEach(function(t,idx){
            var si=_wtSI(t.status);
            var dueD=t.due_date?new Date(t.due_date).toISOString().slice(0,10):'';
            var today=vnDateStr();
            var late=dueD&&dueD<today&&t.status!=='resolved'&&t.status!=='closed';
            h+='<tr onclick="_wtViewDetail('+t.id+')" style="border-bottom:1px solid #f1f5f9;cursor:pointer'+(late?';background:#fff5f5':'')+'" onmouseover="this.style.background=\'#f0f4ff\'" onmouseout="this.style.background=\''+(late?'#fff5f5':'')+'\'">'; 
            h+='<td style="padding:6px;text-align:center;color:#9ca3af">'+(idx+1)+'</td>';
            h+='<td style="padding:6px;color:#2563eb;font-weight:600;white-space:nowrap">'+(t.created_by_name||'—')+'</td>';
            h+='<td style="padding:6px;color:#64748b;font-weight:600">'+(t.order_code||'—')+'</td>';
            h+='<td style="padding:6px;text-align:center;white-space:nowrap"><span style="display:inline-flex;align-items:center;gap:4px;background:'+si.bg+';color:'+si.c+';padding:3px 10px;border-radius:8px;font-size:10px;font-weight:800;border:1px solid '+si.c+'22">'+si.icon+' '+si.l+'</span></td>';
            h+='<td style="padding:6px;color:'+(late?'#dc2626':'#64748b')+';font-size:11px;font-weight:'+(late?'800':'600')+';white-space:nowrap">'+(dueD?dueD.split('-').reverse().join('/'):'—')+'</td>';
            h+='<td style="padding:6px;font-weight:700;color:#1e293b;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(t.title||'—')+'</td>';
            h+='<td style="padding:6px;color:#475569;font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(t.description||'—')+'</td>';
            h+='<td style="padding:6px;color:#d97706;font-weight:600;white-space:nowrap">'+(t.assigned_to_name||'—')+'</td>';
            h+='<td style="padding:6px;text-align:center"><span style="background:#e0e7ff;color:#4338ca;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700">💬 '+(t.reply_count||0)+'</span></td>';
            h+='<td style="padding:6px;color:#64748b;font-size:11px;white-space:nowrap">'+vnFormat(t.created_at)+'</td>';
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
        var si=_wtSI(t.status);
        var ov=document.createElement('div');
        ov.id='wtDetailOv';
        ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px';
        ov.onclick=function(e){if(e.target===ov)ov.remove();};

        var rH='';
        replies.forEach(function(rp){
            var isMe=currentUser&&rp.user_id===currentUser.id;
            rH+='<div style="padding:10px 14px;background:'+(isMe?'#eff6ff':'#f8fafc')+';border-radius:10px;margin-bottom:8px;border-left:3px solid '+(isMe?'#3b82f6':'#e5e7eb')+'">';
            rH+='<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:11px;font-weight:700;color:'+(isMe?'#2563eb':'#374151')+'">'+(rp.user_name||'—')+'</span><span style="font-size:10px;color:#9ca3af">'+vnFormat(rp.created_at)+'</span></div>';
            rH+='<div style="font-size:12px;color:#334155;line-height:1.5">'+(rp.message||'').replace(/\n/g,'<br>')+'</div></div>';
        });

        var stB='';
        ['pending','in_progress','resolved','closed'].forEach(function(s){
            var info=_wtSI(s);var isA=t.status===s;
            stB+='<button onclick="_wtChSt('+t.id+',\''+s+'\')" style="padding:4px 10px;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer;border:1px solid '+info.c+';background:'+(isA?info.c:'#fff')+';color:'+(isA?'#fff':info.c)+'">'+info.icon+' '+info.l+'</button>';
        });

        ov.innerHTML='<div style="background:#fff;border-radius:16px;max-width:700px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">'
            +'<div style="padding:16px 20px;background:linear-gradient(135deg,#4f46e5,#3730a3);border-radius:16px 16px 0 0;display:flex;align-items:center;justify-content:space-between">'
            +'<div><div style="font-size:15px;font-weight:800;color:#fff">📋 '+(t.ticket_code||'')+'</div><div style="font-size:11px;color:#c7d2fe;margin-top:2px">'+(t.title||'')+'</div></div>'
            +'<button onclick="document.getElementById(\'wtDetailOv\').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:8px;font-size:18px;cursor:pointer">×</button></div>'
            +'<div style="padding:20px">'
            +'<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">'+stB+'</div>'
            +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">'
            +'<div style="padding:8px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb"><div style="font-size:10px;color:#9ca3af;font-weight:700">NGƯỜI TẠO</div><div style="font-size:12px;font-weight:700;color:#2563eb">'+(t.created_by_name||'—')+'</div></div>'
            +'<div style="padding:8px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb"><div style="font-size:10px;color:#9ca3af;font-weight:700">NGƯỜI NHẬN</div><div style="font-size:12px;font-weight:700;color:#d97706">'+(t.assigned_to_name||'—')+'</div></div>'
            +'<div style="padding:8px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb"><div style="font-size:10px;color:#9ca3af;font-weight:700">MÃ ĐƠN HÀNG</div><div style="font-size:12px;font-weight:700;color:#1e293b">'+(t.order_code||'—')+'</div></div>'
            +'<div style="padding:8px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb"><div style="font-size:10px;color:#9ca3af;font-weight:700">ƯU TIÊN</div><div>'+_wtPB(t.priority)+'</div></div>'
            +'</div>'
            +(t.description?'<div style="margin-bottom:14px"><div style="font-size:11px;font-weight:700;color:#374151;margin-bottom:4px">📝 Mô tả</div><div style="padding:10px 14px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb;font-size:12px;color:#334155;line-height:1.6">'+t.description.replace(/\n/g,'<br>')+'</div></div>':'')
            +'<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:700;color:#374151;margin-bottom:6px">💬 Phản hồi ('+replies.length+')</div>'
            +(rH||'<div style="padding:14px;text-align:center;color:#9ca3af;font-size:12px">Chưa có phản hồi</div>')
            +'</div>'
            +'<div style="display:flex;gap:8px"><textarea id="wtRM" rows="2" placeholder="Nhập phản hồi..." style="flex:1;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:12px;resize:vertical;font-family:inherit"></textarea>'
            +'<button onclick="_wtReply('+t.id+')" style="padding:8px 16px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">Gửi</button></div>'
            +'</div></div>';
        document.body.appendChild(ov);
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

async function _wtReply(id){
    var el=document.getElementById('wtRM');if(!el)return;
    var msg=el.value.trim();
    if(!msg){showToast('Nhập nội dung phản hồi','error');return;}
    try{
        var r=await apiCall('/api/work-tickets/'+id+'/reply','POST',{message:msg});
        if(r.error){showToast(r.error,'error');return;}
        showToast(r.message||'✅ Đã gửi');
        var ov=document.getElementById('wtDetailOv');if(ov)ov.remove();
        _wtViewDetail(id);_wtLoadAll();
    }catch(e){showToast('Lỗi: '+e.message,'error');}
}

// ===== CREATE FORM =====
function _wtOpenForm(){
    var ov=document.createElement('div');
    ov.id='wtFormOv';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px';
    ov.onclick=function(e){if(e.target===ov)ov.remove();};

    var opts='<option value="">— Chọn người nhận —</option>';
    var dm={};_wt.depts.forEach(function(d){dm[d.id]=d.name;});
    var gr={};_wt.staff.forEach(function(u){var dn=dm[u.department_id]||'Chưa phân bổ';if(!gr[dn])gr[dn]=[];gr[dn].push(u);});
    Object.keys(gr).sort().forEach(function(dn){
        opts+='<optgroup label="'+dn+'">';
        gr[dn].forEach(function(u){opts+='<option value="'+u.id+'">'+u.full_name+(u.username?' ('+u.username+')':'')+'</option>';});
        opts+='</optgroup>';
    });

    ov.innerHTML='<div style="background:#fff;border-radius:16px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">'
        +'<div style="padding:16px 20px;background:linear-gradient(135deg,#4f46e5,#3730a3);border-radius:16px 16px 0 0;display:flex;align-items:center;justify-content:space-between">'
        +'<div style="font-size:15px;font-weight:800;color:#fff">➕ Tạo Phiếu Xử Lý CV</div>'
        +'<button onclick="document.getElementById(\'wtFormOv\').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:8px;font-size:18px;cursor:pointer">×</button></div>'
        +'<div style="padding:20px">'
        +'<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Tiêu Đề <span style="color:#dc2626">*</span></label><input id="wtF_t" type="text" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px"></div>'
        +'<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Mô Tả</label><textarea id="wtF_d" rows="3" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;resize:vertical;font-family:inherit"></textarea></div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
        +'<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Người Nhận <span style="color:#dc2626">*</span></label><select id="wtF_a" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px">'+opts+'</select></div>'
        +'<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Mức Ưu Tiên</label><select id="wtF_p" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px"><option value="CHUẨN">CHUẨN</option><option value="GẤP">🔥 GẤP</option></select></div></div>'
        +'<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Mã Đơn Hàng (tùy chọn)</label><input id="wtF_o" type="text" placeholder="VD: HV001234" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px"></div>'
        +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">'
        +'<button onclick="document.getElementById(\'wtFormOv\').remove()" style="padding:8px 20px;background:#f1f5f9;color:#64748b;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">Hủy</button>'
        +'<button onclick="_wtSubmit()" style="padding:8px 20px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">Tạo Phiếu</button>'
        +'</div></div></div>';
    document.body.appendChild(ov);
}

async function _wtSubmit(){
    var title=(document.getElementById('wtF_t')||{}).value||'';
    var desc=(document.getElementById('wtF_d')||{}).value||'';
    var assigned=(document.getElementById('wtF_a')||{}).value||'';
    var priority=(document.getElementById('wtF_p')||{}).value||'CHUẨN';
    var orderCode=(document.getElementById('wtF_o')||{}).value||'';
    title=title.trim();if(!title){showToast('Vui lòng nhập tiêu đề','error');return;}
    if(!assigned){showToast('Vui lòng chọn người nhận','error');return;}
    try{
        var r=await apiCall('/api/work-tickets','POST',{title:title,description:desc.trim(),assigned_to:parseInt(assigned),priority:priority,order_code:orderCode.trim()||null,type:'custom'});
        if(r.error){showToast(r.error,'error');return;}
        showToast(r.message||'✅ Đã tạo phiếu');
        var ov=document.getElementById('wtFormOv');if(ov)ov.remove();
        _wtLoadAll();
    }catch(e){showToast('Lỗi: '+e.message,'error');}
}
