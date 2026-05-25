// ========== PHIẾU YÊU CẦU XỬ LÝ — QLX Tab Module ==========
// Prefix: _qlxWt — tránh xung đột với taophieuxulycv.js (_wt)
var _qlxWt={stats:{},tickets:[],staff:[],depts:[],filter:'all',search:'',page:1,total:0};

function _qlxWtInit(c){
    c.innerHTML='<div id="_qlxWtMain" style="padding:4px 0"><div style="text-align:center;padding:40px;color:#64748b">⏳ Đang tải...</div></div>';
    _qlxWt.filter='all';_qlxWt.search='';_qlxWt.page=1;
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
    if(s==='resolved')return{l:'Đã Xử Lý',c:'#16a34a',bg:'#f0fdf4',icon:'🟢'};
    if(s==='in_progress')return{l:'Đang Xử Lý',c:'#d97706',bg:'#fef3c7',icon:'🟡'};
    if(s==='closed')return{l:'Đã Đóng',c:'#6b7280',bg:'#f3f4f6',icon:'⚫'};
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
    // 5 Stat Cards
    h+='<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:14px">';
    h+=_qlxWtCard('🔥','Hôm Nay Phải Xử Lý',st.today_due||0,'#dc2626','#fef2f2','#fecaca','today_due');
    h+=_qlxWtCard('✅','Đã Xử Lý Hôm Nay',st.today_resolved||0,'#16a34a','#f0fdf4','#bbf7d0','today_resolved');
    h+=_qlxWtCard('⏰','Xử Lý Trễ',st.overdue||0,'#d97706','#fef3c7','#fde68a','overdue');
    h+=_qlxWtCard('⏳','Chờ Xử Lý',st.pending||0,'#7c3aed','#f5f3ff','#ddd6fe','pending');
    h+=_qlxWtCard('🏆','Hoàn Thành',st.completed||0,'#0891b2','#ecfeff','#a5f3fc','completed');
    h+='</div>';
    // Search
    h+='<div style="margin-bottom:12px"><input id="_qlxWtSrch" type="text" placeholder="🔍 Tìm mã phiếu, tiêu đề, mã đơn..." value="'+(_qlxWt.search||'')+'" onkeydown="if(event.key===\'Enter\'){_qlxWt.search=this.value;_qlxWt.page=1;_qlxWtLoadList()}" style="width:100%;padding:9px 14px;border:1.5px solid #d1d5db;border-radius:10px;font-size:12px;outline:none;box-sizing:border-box" onfocus="this.style.borderColor=\'#0369a1\'" onblur="this.style.borderColor=\'#d1d5db\'"></div>';
    // Table
    h+='<div style="overflow-x:auto;border-radius:10px;border:1px solid #e2e8f0"><table style="width:100%;border-collapse:collapse;font-size:12px">';
    h+='<thead><tr style="background:linear-gradient(135deg,#0c4a6e,#0369a1)">';
    ['STT','Ngày Tạo','Mã Phiếu','Tiêu Đề','Mã Đơn Yêu Cầu','Người Tạo','Người Nhận','Trả Lời Yêu Cầu'].forEach(function(c){
        h+='<th style="padding:8px 6px;text-align:left;font-size:11px;font-weight:700;color:#fff;white-space:nowrap;border-right:1px solid rgba(255,255,255,0.1)">'+c+'</th>';
    });
    h+='</tr></thead><tbody>';
    if(!items.length){
        h+='<tr><td colspan="8" style="padding:40px;text-align:center;color:#9ca3af">Chưa có phiếu xử lý nào</td></tr>';
    }else{
        items.forEach(function(t,idx){
            var si=_qlxWtSI(t.status);
            var late=(t.status==='pending'||t.status==='in_progress')&&t.created_at&&new Date(t.created_at).toISOString().slice(0,10)<vnDateStr();
            h+='<tr onclick="_qlxWtDetail('+t.id+')" style="border-bottom:1px solid #f1f5f9;cursor:pointer'+(late?';background:#fff5f5':'')+'" onmouseover="this.style.background=\'#f0f7ff\'" onmouseout="this.style.background=\''+(late?'#fff5f5':'')+'\'">';
            h+='<td style="padding:6px;text-align:center;color:#94a3b8;font-size:11px">'+(idx+1)+'</td>';
            h+='<td style="padding:6px;color:#64748b;font-size:11px;white-space:nowrap">'+vnFormat(t.created_at)+'</td>';
            h+='<td style="padding:6px;font-weight:800;color:#0369a1">'+(t.ticket_code||'—')+'</td>';
            h+='<td style="padding:6px;font-weight:700;color:#1e293b;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(t.title||'—')+'</td>';
            h+='<td style="padding:6px;color:#64748b">'+(t.order_code||'—')+'</td>';
            h+='<td style="padding:6px;color:#2563eb;font-weight:600;white-space:nowrap">'+(t.created_by_name||'—')+'</td>';
            h+='<td style="padding:6px;color:#d97706;font-weight:600;white-space:nowrap">'+(t.assigned_to_name||'—')+'</td>';
            h+='<td style="padding:6px;text-align:center"><span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700">💬 '+(t.reply_count||0)+'</span></td>';
            h+='</tr>';
        });
    }
    h+='</tbody></table></div>';
    m.innerHTML=h;
}
function _qlxWtCard(icon,label,count,color,bg,border,fk){
    var a=_qlxWt.filter===fk;
    return '<div onclick="_qlxWtSetFilter(\''+fk+'\')" style="padding:12px 14px;background:linear-gradient(135deg,'+bg+','+border+'44);border:2px solid '+(a?color:border)+';border-radius:12px;cursor:pointer;text-align:center;transition:all .2s;'+(a?'box-shadow:0 4px 16px '+color+'22':'')+'" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'none\'">'
        +'<div style="font-size:22px;margin-bottom:4px">'+icon+'</div>'
        +'<div style="font-size:20px;font-weight:900;color:'+color+'">'+count+'</div>'
        +'<div style="font-size:10px;font-weight:700;color:'+color+';margin-top:2px;line-height:1.2">'+label+'</div></div>';
}
function _qlxWtSetFilter(s){_qlxWt.filter=(_qlxWt.filter===s)?'all':s;_qlxWt.page=1;_qlxWtLoadList();}

// ===== DETAIL MODAL =====
async function _qlxWtDetail(id){
    try{
        var r=await apiCall('/api/work-tickets/'+id);
        var t=r.ticket;if(!t)return;
        var rps=r.replies||[],si=_qlxWtSI(t.status);
        var ov=document.createElement('div');
        ov.id='_qlxWtOv';
        ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px';
        ov.onclick=function(e){if(e.target===ov)ov.remove();};
        var rH='';
        rps.forEach(function(rp){
            var me=currentUser&&rp.user_id===currentUser.id;
            rH+='<div style="padding:10px 14px;background:'+(me?'#eff6ff':'#f8fafc')+';border-radius:10px;margin-bottom:8px;border-left:3px solid '+(me?'#0369a1':'#e5e7eb')+'">';
            rH+='<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:11px;font-weight:700;color:'+(me?'#0369a1':'#374151')+'">'+(rp.user_name||'—')+'</span><span style="font-size:10px;color:#9ca3af">'+vnFormat(rp.created_at)+'</span></div>';
            rH+='<div style="font-size:12px;color:#334155;line-height:1.5">'+(rp.message||'').replace(/\n/g,'<br>')+'</div></div>';
        });
        var stB='';
        ['pending','in_progress','resolved','closed'].forEach(function(s){
            var inf=_qlxWtSI(s),isA=t.status===s;
            stB+='<button onclick="_qlxWtChSt('+t.id+',\''+s+'\')" style="padding:4px 10px;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer;border:1px solid '+inf.c+';background:'+(isA?inf.c:'#fff')+';color:'+(isA?'#fff':inf.c)+'">'+inf.icon+' '+inf.l+'</button>';
        });
        ov.innerHTML='<div style="background:#fff;border-radius:16px;max-width:700px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">'
            +'<div style="padding:16px 20px;background:linear-gradient(135deg,#0c4a6e,#0369a1);border-radius:16px 16px 0 0;display:flex;align-items:center;justify-content:space-between">'
            +'<div><div style="font-size:15px;font-weight:800;color:#fff">📋 '+(t.ticket_code||'')+'</div><div style="font-size:11px;color:#bae6fd;margin-top:2px">'+(t.title||'')+'</div></div>'
            +'<button onclick="document.getElementById(\'_qlxWtOv\').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:8px;font-size:18px;cursor:pointer">×</button></div>'
            +'<div style="padding:20px">'
            +'<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">'+stB+'</div>'
            +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">'
            +'<div style="padding:8px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb"><div style="font-size:10px;color:#9ca3af;font-weight:700">NGƯỜI TẠO</div><div style="font-size:12px;font-weight:700;color:#2563eb">'+(t.created_by_name||'—')+'</div></div>'
            +'<div style="padding:8px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb"><div style="font-size:10px;color:#9ca3af;font-weight:700">NGƯỜI NHẬN</div><div style="font-size:12px;font-weight:700;color:#d97706">'+(t.assigned_to_name||'—')+'</div></div>'
            +'<div style="padding:8px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb"><div style="font-size:10px;color:#9ca3af;font-weight:700">MÃ ĐƠN YÊU CẦU</div><div style="font-size:12px;font-weight:700;color:#1e293b">'+(t.order_code||'—')+'</div></div>'
            +'<div style="padding:8px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb"><div style="font-size:10px;color:#9ca3af;font-weight:700">NGÀY TẠO</div><div style="font-size:12px;font-weight:700;color:#1e293b">'+vnFormat(t.created_at)+'</div></div>'
            +'</div>'
            +(t.description?'<div style="margin-bottom:14px"><div style="font-size:11px;font-weight:700;color:#374151;margin-bottom:4px">📝 Mô tả</div><div style="padding:10px 14px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb;font-size:12px;color:#334155;line-height:1.6">'+t.description.replace(/\n/g,'<br>')+'</div></div>':'')
            +'<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:700;color:#374151;margin-bottom:6px">💬 Trả Lời Yêu Cầu ('+rps.length+')</div>'
            +(rH||'<div style="padding:14px;text-align:center;color:#9ca3af;font-size:12px">Chưa có phản hồi</div>')
            +'</div>'
            +'<div style="display:flex;gap:8px"><textarea id="_qlxWtRM" rows="2" placeholder="Nhập trả lời yêu cầu..." style="flex:1;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:12px;resize:vertical;font-family:inherit"></textarea>'
            +'<button onclick="_qlxWtReply('+t.id+')" style="padding:8px 16px;background:linear-gradient(135deg,#0369a1,#0284c7);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">Gửi</button></div>'
            +'</div></div>';
        document.body.appendChild(ov);
    }catch(e){showToast('Lỗi: '+e.message,'error');}
}
async function _qlxWtChSt(id,status){
    try{
        var r=await apiCall('/api/work-tickets/'+id+'/status','PUT',{status:status});
        if(r.error){showToast(r.error,'error');return;}
        showToast(r.message||'✅ Đã cập nhật');
        var ov=document.getElementById('_qlxWtOv');if(ov)ov.remove();
        _qlxWtLoadAll();
    }catch(e){showToast('Lỗi: '+e.message,'error');}
}
async function _qlxWtReply(id){
    var el=document.getElementById('_qlxWtRM');if(!el)return;
    var msg=el.value.trim();
    if(!msg){showToast('Nhập nội dung trả lời','error');return;}
    try{
        var r=await apiCall('/api/work-tickets/'+id+'/reply','POST',{message:msg});
        if(r.error){showToast(r.error,'error');return;}
        showToast(r.message||'✅ Đã gửi');
        var ov=document.getElementById('_qlxWtOv');if(ov)ov.remove();
        _qlxWtDetail(id);_qlxWtLoadAll();
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
        +'<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">Mã Đơn Yêu Cầu (tùy chọn)</label><input id="_qlxF_o" type="text" placeholder="VD: HV001234" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;box-sizing:border-box"></div>'
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
    title=title.trim();if(!title){showToast('Vui lòng nhập tiêu đề','error');return;}
    if(!assigned){showToast('Vui lòng chọn người nhận','error');return;}
    try{
        var r=await apiCall('/api/work-tickets','POST',{title:title,description:desc.trim(),assigned_to:parseInt(assigned),priority:priority,order_code:orderCode.trim()||null,type:'custom'});
        if(r.error){showToast(r.error,'error');return;}
        showToast(r.message||'✅ Đã tạo phiếu');
        var ov=document.getElementById('_qlxWtFOv');if(ov)ov.remove();
        _qlxWtLoadAll();
    }catch(e){showToast('Lỗi: '+e.message,'error');}
}
