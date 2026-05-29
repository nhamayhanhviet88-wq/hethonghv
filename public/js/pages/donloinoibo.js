// ========== LOI THUONG GAP & XU LY — Common Error Templates ==========
var _ltg = { items: [], categories: [], departments: [], stats: {}, filter: null, catFilter: null, deptFilter: null, catFilterId: null };
function _ltgStatusInfo(s){
  if(s==='resolved') return {l:'Đã Xử Lý',c:'#16a34a',bg:'#f0fdf4',icon:'🟢'};
  if(s==='in_progress') return {l:'Đang Xử Lý',c:'#d97706',bg:'#fef3c7',icon:'🟡'};
  return {l:'Chưa Xử Lý',c:'#dc2626',bg:'#fef2f2',icon:'🔴'};
}
var _ltgDeptColors=['#3b82f6','#7c3aed','#ea580c','#d97706','#16a34a','#e11d48','#6b7280','#0891b2','#8b5cf6','#0d9488'];

// ===== ENTRY =====
function renderDonloinoiboPage(c){renderLoithuonggapPage(c);}
function renderLoithuonggapPage(content){
  _ltg.filter=null;_ltg.catFilter=null;_ltg.deptFilter=null;_ltg.catFilterId=null;
  content.innerHTML='<div id="ltgMain" style="padding:20px;background:#fafbfc;min-height:calc(100vh - 80px)"></div>';
  _ltgLoadAll();
}

// ===== LOAD DATA =====
async function _ltgLoadAll(){
  try{
    var r1=await apiCall('/api/error-categories');
    _ltg.categories=r1.categories||[];
  }catch(e){console.error('[LTG] categories:',e);}
  try{
    var r3=await apiCall('/api/error-departments');
    _ltg.departments=r3.departments||[];
  }catch(e){console.error('[LTG] departments:',e);}
  try{
    var r2=await apiCall('/api/common-errors-tpl/stats');
    _ltg.stats=r2||{total:0,pending:0,in_progress:0,resolved:0};
  }catch(e){console.error('[LTG] stats:',e);}
  _ltgLoadList();
}

async function _ltgLoadList(){
  try{
    var p=[];
    if(_ltg.filter)p.push('status='+_ltg.filter);
    if(_ltg.catFilter)p.push('category_id='+_ltg.catFilter);
    if(_ltg.deptFilter)p.push('department='+_ltg.deptFilter);
    var qs=p.length?'?'+p.join('&'):'';
    var r=await apiCall('/api/common-errors-tpl'+qs);
    _ltg.items=r.items||[];
    _ltgRender();
  }catch(e){console.error('[LTG] list:',e);}
}

// ===== RENDER =====
function _ltgRender(){
  var main=document.getElementById('ltgMain');if(!main)return;
  var items=_ltg.items;
  var st=_ltg.stats;
  var h='';

  // Header
  h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">';
  h+='<div style="font-size:18px;font-weight:900;color:#1e293b">⚠️ LỖI THƯỜNG GẶP & XỬ LÝ <span style="color:#9ca3af;font-weight:500;font-size:13px">('+items.length+' lỗi)</span></div>';
  h+='<div style="display:flex;gap:8px">';
  h+='<button onclick="_ltgOpenDeptManager()" style="padding:8px 16px;background:linear-gradient(135deg,#0891b2,#0e7490);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">🏭 Quản Lý Bộ Phận</button>';
  h+='<button onclick="_ltgOpenCatManager()" style="padding:8px 16px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">⚙️ Quản Lý Loại Lỗi</button>';
  h+='<button onclick="_ltgOpenForm()" style="padding:8px 16px;background:linear-gradient(135deg,#f59e0b,#ea580c);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">+ Thêm Lỗi Thường Gặp</button>';
  h+='</div></div>';

  // Search bar
  h+='<div style="position:relative;margin-bottom:14px">';
  h+='<input id="ltgSearchInput" type="text" placeholder="🔍 Tìm kiếm tên lỗi, loại lỗi..." oninput="_ltgSearch(this.value)" style="width:100%;padding:10px 14px 10px 14px;border:1.5px solid #d1d5db;border-radius:10px;font-size:13px;outline:none;transition:border .2s" onfocus="this.style.borderColor=\'#3b82f6\'" onblur="setTimeout(function(){var s=document.getElementById(\'ltgSearchSuggest\');if(s)s.style.display=\'none\'},200)">';
  h+='<div id="ltgSearchSuggest" style="display:none;position:absolute;top:44px;left:0;right:0;background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.12);max-height:280px;overflow-y:auto;z-index:100"></div>';
  h+='</div>';

  // 3 Stat cards
  h+='<div style="display:flex;gap:12px;margin-bottom:16px">';
  h+=_ltgCard('🔴','Chưa Xử Lý',st.pending||0,'#dc2626','#fef2f2','#fecaca','pending');
  h+=_ltgCard('🟡','Đang Xử Lý',st.in_progress||0,'#d97706','#fef3c7','#fde68a','in_progress');
  h+=_ltgCard('🟢','Đã Xử Lý',st.resolved||0,'#16a34a','#f0fdf4','#bbf7d0','resolved');
  h+='</div>';

  // Dept filter chips
  h+='<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">';
  h+='<span onclick="_ltgSetDept(null)" style="padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;'+(!_ltg.deptFilter?'background:#1e293b;color:#fff':'background:#f1f5f9;color:#64748b')+'">Tất Cả BP</span>';
  _ltg.departments.forEach(function(d,i){
    var c=_ltgDeptColors[i%_ltgDeptColors.length];
    var isA=_ltg.deptFilter===d.name;
    var dn=d.name.replace(/'/g,'');
    h+='<span onclick="_ltgSetDept(\''+dn+'\')" style="padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid '+(isA?c:'#e5e7eb')+';'+(isA?'background:'+c+'18;color:'+c:'background:#fff;color:#64748b')+'">'+d.name+'</span>';
  });
  h+='</div>';

  // Category (Loại Lỗi) filter chips
  h+='<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">';
  h+='<span onclick="_ltgSetCatFilter(null)" style="padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;'+(!_ltg.catFilterId?'background:#6366f1;color:#fff':'background:#f1f5f9;color:#64748b')+'">Tất Cả Loại Lỗi</span>';
  _ltg.categories.forEach(function(cat){
    var isA=_ltg.catFilterId==cat.id;
    h+='<span onclick="_ltgSetCatFilter('+cat.id+')" style="padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid '+(isA?'#6366f1':'#e5e7eb')+';'+(isA?'background:#eef2ff;color:#4f46e5':'background:#fff;color:#64748b')+'">'+cat.name+'</span>';
  });
  h+='</div>';

  // Table
  h+='<div style="overflow-x:auto;border-radius:10px;border:1px solid #e5e7eb"><table style="width:100%;border-collapse:collapse;font-size:12px">';
  h+='<thead><tr style="background:#1e3a4f">';
  ['STT','Tên Lỗi','Loại Lỗi','Bộ Phận Lỗi','Tình Trạng','Mã Đơn Lỗi','Số Đơn Lỗi','Cách Khắc Phục','HD Sale Tư Vấn','Cam Kết Quản Lý Xưởng','Cam Kết Bộ Phận Lỗi','Chịu Trách Nhiệm',''].forEach(function(c){
    var extra='';
    if(c==='Mã Đơn Lỗi')extra='background:#7c3aed;';
    if(c==='Số Đơn Lỗi')extra='background:#dc2626;text-align:center;';
    if(c==='Chịu Trách Nhiệm')extra='background:#0891b2;';
    h+='<th style="padding:8px 6px;text-align:left;font-size:11px;font-weight:700;color:#fff;white-space:nowrap;border-right:1px solid rgba(255,255,255,0.1);'+extra+'">'+c+'</th>';
  });
  h+='</tr></thead><tbody>';

  if(!items.length){
    h+='<tr><td colspan="13" style="padding:40px;text-align:center;color:#9ca3af">Chưa có lỗi thường gặp nào</td></tr>';
  } else {
    items.forEach(function(item,idx){
      var depts=[];
      try{depts=typeof item.departments==='string'?JSON.parse(item.departments||'[]'):(item.departments||[]);}catch(e){}
      var si=_ltgStatusInfo(item.status);
      var catName=item.category_name||'—';
      var deptBadges=depts.length?depts.map(function(dn){return '<span style="padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;background:#e0f2fe;color:#0369a1;margin-right:2px">'+dn+'</span>';}).join(''):'<span style="color:#d1d5db">—</span>';
      // Linked orders
      var linkedOrders=[];
      try{linkedOrders=typeof item.linked_orders==='string'?JSON.parse(item.linked_orders||'[]'):(item.linked_orders||[]);}catch(e){}
      var loCount=item.linked_order_count||0;
      var loBadges='';
      if(loCount===0){loBadges='<span style="color:#d1d5db;font-size:10px">—</span>';}
      else{
        var shown=linkedOrders.slice(0,3);
        shown.forEach(function(o){loBadges+='<span onclick="event.stopPropagation();_ltgViewOrderDetail('+o.id+')" style="display:inline-block;padding:1px 5px;border-radius:3px;font-size:8px;font-weight:700;background:#f5f3ff;color:#7c3aed;border:1px solid #c4b5fd;margin:1px;cursor:pointer;transition:all .15s" onmouseover="this.style.background=\'#7c3aed\';this.style.color=\'#fff\'" onmouseout="this.style.background=\'#f5f3ff\';this.style.color=\'#7c3aed\'">'+(o.order_code||'#'+o.id)+'</span>';});
        if(loCount>3){loBadges+='<span style="display:inline-block;padding:1px 5px;border-radius:3px;font-size:8px;font-weight:700;background:#ede9fe;color:#6d28d9;margin:1px">+'+(loCount-3)+' đơn</span>';}
      }
      // Severity badge for Số Lỗi
      var sevColor,sevBg,sevIcon;
      if(loCount===0){sevColor='#9ca3af';sevBg='#f9fafb';sevIcon='';}
      else if(loCount<=2){sevColor='#16a34a';sevBg='#f0fdf4';sevIcon='✅';}
      else if(loCount<=5){sevColor='#d97706';sevBg='#fffbeb';sevIcon='⚠️';}
      else{sevColor='#dc2626';sevBg='linear-gradient(135deg,#fef2f2,#fee2e2)';sevIcon='🔴';}

      h+='<tr onclick="_ltgViewDetail('+item.id+')" style="border-bottom:1px solid #f1f5f9;cursor:pointer" onmouseover="this.style.background=\'#fffbeb\'" onmouseout="this.style.background=\'\'">';
      h+='<td style="padding:6px;text-align:center;color:#9ca3af;border-right:1px solid #f8fafc">'+(idx+1)+'</td>';
      h+='<td style="padding:6px;font-weight:700;color:#1e293b;border-right:1px solid #f8fafc">'+(item.error_name||'—')+'</td>';
      h+='<td style="padding:6px;border-right:1px solid #f8fafc"><span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe">'+catName+'</span></td>';
      h+='<td style="padding:6px;border-right:1px solid #f8fafc">'+deptBadges+'</td>';
      h+='<td style="padding:6px;border-right:1px solid #f8fafc"><span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;color:'+si.c+';background:'+si.bg+'">'+si.icon+' '+si.l+'</span></td>';
      h+='<td style="padding:6px;max-width:160px;border-right:1px solid #f8fafc">'+loBadges+'</td>';
      h+='<td style="padding:6px;text-align:center;border-right:1px solid #f8fafc">'+(loCount>0?'<span style="display:inline-block;min-width:28px;padding:4px 8px;border-radius:8px;font-size:13px;font-weight:900;color:#fff;background:'+sevColor+';text-align:center">'+loCount+'</span>':'<span style="color:#d1d5db;font-size:11px">0</span>')+'</td>';
      h+='<td style="padding:6px;max-width:180px;overflow:hidden;text-overflow:ellipsis;border-right:1px solid #f8fafc" title="'+(item.fix_guide||'').replace(/"/g,'&quot;')+'">'+(item.fix_guide||'—')+'</td>';
      h+='<td style="padding:6px;max-width:150px;overflow:hidden;text-overflow:ellipsis;border-right:1px solid #f8fafc">'+(item.sale_guide||'—')+'</td>';
      h+='<td style="padding:6px;max-width:120px;overflow:hidden;text-overflow:ellipsis;border-right:1px solid #f8fafc">'+(item.commit_factory||'—')+'</td>';
      h+='<td style="padding:6px;max-width:120px;overflow:hidden;text-overflow:ellipsis;border-right:1px solid #f8fafc">'+(item.commit_department||'—')+'</td>';
      // Chịu Trách Nhiệm column
      var resp=[];try{resp=typeof item.responsibility==='string'?JSON.parse(item.responsibility||'[]'):(item.responsibility||[]);}catch(e){}
      var respHtml=resp.length?resp.map(function(r){return '<div style="white-space:nowrap;font-size:10px;line-height:1.6"><span style="font-weight:700;color:#0e7490">'+((r.name||'—'))+'</span> <span style="padding:1px 5px;border-radius:3px;font-size:9px;font-weight:800;background:#ecfeff;color:#0891b2;border:1px solid #a5f3fc">'+r.percent+'%</span></div>';}).join(''):'<span style="color:#d1d5db">—</span>';
      h+='<td style="padding:6px;max-width:150px;border-right:1px solid #f8fafc">'+respHtml+'</td>';
      h+='<td style="padding:6px;white-space:nowrap">';
      h+='<button onclick="event.stopPropagation();_ltgOpenForm('+item.id+')" style="padding:3px 8px;background:#3b82f6;color:#fff;border:none;border-radius:4px;font-size:10px;cursor:pointer;margin-right:2px">✏️</button>';
      h+='<button onclick="event.stopPropagation();_ltgDelete('+item.id+')" style="padding:3px 8px;background:#ef4444;color:#fff;border:none;border-radius:4px;font-size:10px;cursor:pointer">🗑</button>';
      h+='</td></tr>';
    });
  }
  h+='</tbody></table></div>';
  main.innerHTML=h;
}

// ===== DETAIL POPUP =====
function _ltgViewDetail(id){
  var item=_ltg.items.find(function(x){return x.id===id;});
  if(!item)return;
  var si=_ltgStatusInfo(item.status);
  var catName=item.category_name||'—';
  var depts=[];
  try{depts=typeof item.departments==='string'?JSON.parse(item.departments||'[]'):(item.departments||[]);}catch(e){}
  var imgs=[];
  try{imgs=typeof item.error_images==='string'?JSON.parse(item.error_images||'[]'):(item.error_images||[]);}catch(e){}

  var deptBadges=depts.length?depts.map(function(d){return '<span style="padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd">'+d+'</span>';}).join(' '):'—';

  var sec=function(icon,title,content){
    var lines=(content||'—').split('\n');
    var formatted=lines.map(function(l){return '<div style="padding:2px 0">'+l+'</div>';}).join('');
    return '<div style="margin-bottom:16px">'+
      '<div style="font-size:12px;font-weight:800;color:#1e293b;margin-bottom:6px;display:flex;align-items:center;gap:6px">'+icon+' '+title+'</div>'+
      '<div style="padding:10px 14px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb;font-size:12px;color:#334155;line-height:1.6">'+formatted+'</div>'+
    '</div>';
  };

  var imgH='';
  if(imgs.length){
    imgH='<div style="margin-bottom:16px"><div style="font-size:12px;font-weight:800;color:#1e293b;margin-bottom:6px">📷 Hình Ảnh Lỗi</div><div style="display:flex;gap:8px;flex-wrap:wrap">';
    imgs.forEach(function(u){imgH+='<img src="'+u+'" onclick="window.open(\''+u+'\',\'_blank\')" style="width:100px;height:100px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;cursor:pointer;transition:transform .2s" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'">';});
    imgH+='</div></div>';
  }
  var vidH='';
  if(item.error_video){
    vidH='<div style="margin-bottom:16px"><div style="font-size:12px;font-weight:800;color:#1e293b;margin-bottom:6px">🎬 Video Lỗi</div><video src="'+item.error_video+'" controls style="max-width:100%;max-height:280px;border-radius:8px;border:1px solid #e5e7eb"></video></div>';
  }

  // Linked orders section
  var loCount=item.linked_order_count||0;
  var linkedOrders=[];
  try{linkedOrders=typeof item.linked_orders==='string'?JSON.parse(item.linked_orders||'[]'):(item.linked_orders||[]);}catch(e){}
  var sevColor,sevBg,sevIcon;
  if(loCount===0){sevColor='#9ca3af';sevBg='#f9fafb';sevIcon='';}
  else if(loCount<=2){sevColor='#16a34a';sevBg='#f0fdf4';sevIcon='✅';}
  else if(loCount<=5){sevColor='#d97706';sevBg='#fffbeb';sevIcon='⚠️';}
  else{sevColor='#dc2626';sevBg='#fef2f2';sevIcon='🔴';}

  var linkedH='<div style="margin-bottom:16px"><div style="font-size:12px;font-weight:800;color:#1e293b;margin-bottom:8px;display:flex;align-items:center;gap:8px">📋 Đơn Lỗi Liên Kết <span style="padding:2px 10px;border-radius:6px;font-size:11px;font-weight:800;color:'+sevColor+';background:'+sevBg+';border:1px solid '+sevColor+'33">'+sevIcon+' '+loCount+' đơn</span></div>';
  if(loCount===0){
    linkedH+='<div style="padding:12px;text-align:center;color:#9ca3af;font-size:12px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb">Chưa có đơn lỗi nào liên kết</div>';
  } else {
    linkedH+='<div style="max-height:200px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px">';
    linkedH+='<table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr style="background:#1e3a4f;position:sticky;top:0"><th style="padding:6px 8px;text-align:left;font-weight:700;color:#fff;border-bottom:1px solid #2d4f63">Mã Đơn</th><th style="padding:6px 8px;text-align:left;font-weight:700;color:#fff;border-bottom:1px solid #2d4f63">Ngày</th></tr></thead><tbody>';
    linkedOrders.forEach(function(o){
      var rd=o.report_date?new Date(o.report_date).toLocaleDateString('vi-VN'):'—';
      linkedH+='<tr onclick="event.stopPropagation();_ltgViewOrderDetail('+o.id+')" style="cursor:pointer;transition:background .1s" onmouseover="this.style.background=\'#f5f3ff\'" onmouseout="this.style.background=\'\'">';
      linkedH+='<td style="padding:5px 8px;border-bottom:1px solid #f1f5f9"><span style="font-weight:700;color:#7c3aed">'+(o.order_code||'#'+o.id)+'</span></td>';
      linkedH+='<td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;color:#6b7280">'+rd+'</td></tr>';
    });
    linkedH+='</tbody></table></div>';
  }
  linkedH+='</div>';

  var ov=document.createElement('div');
  ov.id='ltgDetailOv';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px';
  ov.onclick=function(e){if(e.target===ov)ov.remove();};
  ov.innerHTML='<div style="background:#fff;border-radius:16px;max-width:750px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">'+
    '<div style="padding:16px 20px;background:linear-gradient(135deg,#1e3a5f,#0f2a3a);border-radius:16px 16px 0 0;display:flex;align-items:center;justify-content:space-between">'+
      '<div style="display:flex;align-items:center;gap:10px"><div style="font-size:16px;font-weight:800;color:#fff">📋 '+(item.error_name||'')+'</div>'+
      '<span style="padding:3px 10px;border-radius:6px;font-size:10px;font-weight:700;color:'+si.c+';background:'+si.bg+'">'+si.icon+' '+si.l+'</span></div>'+
      '<button onclick="document.getElementById(\'ltgDetailOv\').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:8px;font-size:18px;cursor:pointer">×</button>'+
    '</div>'+
    '<div style="padding:20px">'+
      '<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">'+
        '<div style="flex:1;min-width:150px"><div style="font-size:10px;font-weight:700;color:#9ca3af;margin-bottom:4px">LOẠI LỖI</div><span style="padding:4px 12px;border-radius:6px;font-size:12px;font-weight:700;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe">'+catName+'</span></div>'+
        '<div style="flex:2"><div style="font-size:10px;font-weight:700;color:#9ca3af;margin-bottom:4px">BỘ PHẬN LỖI</div><div style="display:flex;gap:4px;flex-wrap:wrap">'+deptBadges+'</div></div>'+
      '</div>'+
      sec('🔧','Cách Khắc Phục / Xử Lý Lỗi',item.fix_guide)+
      sec('💬','Hướng Dẫn Sale Tư Vấn',item.sale_guide)+
      sec('🏭','Cam Kết Quản Lý Xưởng',item.commit_factory)+
      sec('⚠️','Cam Kết Bộ Phận Lỗi',item.commit_department)+
      _ltgRespDetailSection(item)+
      imgH+vidH+linkedH+
      '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;border-top:1px solid #f1f5f9;padding-top:12px">'+
        '<button onclick="document.getElementById(\'ltgDetailOv\').remove();_ltgOpenForm('+item.id+')" style="padding:8px 20px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">✏️ Chỉnh Sửa</button>'+
        '<button onclick="document.getElementById(\'ltgDetailOv\').remove()" style="padding:8px 20px;background:#f1f5f9;color:#64748b;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">Đóng</button>'+
      '</div>'+
    '</div></div>';
  document.body.appendChild(ov);
}

function _ltgCard(icon,label,count,color,bg,border,status){
  var active=_ltg.filter===status;
  return '<div onclick="_ltgSetFilter(\''+status+'\')" style="flex:1;padding:16px 20px;background:linear-gradient(135deg,'+bg+','+border+'44);border:2px solid '+(active?color:border)+';border-radius:12px;cursor:pointer;display:flex;align-items:center;gap:14px;transition:all .2s;user-select:none" onmouseover="this.style.boxShadow=\'0 4px 16px '+color+'33\'" onmouseout="this.style.boxShadow=\''+(active?'0 4px 16px '+color+'22':'none')+'\'">'
    +'<div style="font-size:28px">'+icon+'</div>'
    +'<div><div style="font-size:20px;font-weight:900;color:'+color+'">'+count+'</div>'
    +'<div style="font-size:12px;font-weight:700;color:'+color+'">'+label+'</div></div></div>';
}

// ===== FILTERS =====
function _ltgSetFilter(s){_ltg.filter=(_ltg.filter===s)?null:s;_ltgLoadList();}
function _ltgSetDept(d){_ltg.deptFilter=(_ltg.deptFilter===d)?null:d;_ltgLoadList();}
function _ltgSetCatFilter(id){_ltg.catFilterId=(_ltg.catFilterId==id)?null:id;_ltg.catFilter=id||null;_ltgLoadList();}

// ===== SEARCH =====
function _ltgSearch(q){
  var box=document.getElementById('ltgSearchSuggest');
  if(!box)return;
  q=(q||'').trim().toLowerCase();
  if(!q){box.style.display='none';return;}
  var matches=_ltg.items.filter(function(item){
    var name=(item.error_name||'').toLowerCase();
    var cat=(item.category_name||'').toLowerCase();
    return name.indexOf(q)>=0||cat.indexOf(q)>=0;
  }).slice(0,8);
  if(!matches.length){
    box.innerHTML='<div style="padding:14px;text-align:center;color:#9ca3af;font-size:12px">Không tìm thấy kết quả</div>';
    box.style.display='block';return;
  }
  var h='';
  matches.forEach(function(item){
    var si=_ltgStatusInfo(item.status);
    var depts=[];
    try{depts=typeof item.departments==='string'?JSON.parse(item.departments||'[]'):(item.departments||[]);}catch(e){}
    var deptStr=depts.length?depts.join(', '):'—';
    h+='<div onmousedown="_ltgViewDetail('+item.id+')" style="padding:10px 14px;border-bottom:1px solid #f1f5f9;cursor:pointer;display:flex;align-items:center;gap:10px;transition:background .15s" onmouseover="this.style.background=\'#f0f9ff\'" onmouseout="this.style.background=\'\'">';
    h+='<div style="flex:1"><div style="font-size:13px;font-weight:700;color:#1e293b">'+_ltgHighlight(item.error_name||'',q)+'</div>';
    h+='<div style="font-size:11px;color:#6b7280;margin-top:2px">'+_ltgHighlight(item.category_name||'',q)+' · '+deptStr+'</div></div>';
    h+='<span style="padding:2px 8px;border-radius:4px;font-size:9px;font-weight:700;color:'+si.c+';background:'+si.bg+'">'+si.icon+' '+si.l+'</span>';
    h+='</div>';
  });
  box.innerHTML=h;
  box.style.display='block';
}
function _ltgHighlight(text,q){
  if(!q)return text;
  var idx=text.toLowerCase().indexOf(q);
  if(idx<0)return text;
  return text.substring(0,idx)+'<mark style="background:#fef08a;padding:0 1px;border-radius:2px">'+text.substring(idx,idx+q.length)+'</mark>'+text.substring(idx+q.length);
}

// ===== AUTO-NUMBER for textareas =====
function _ltgAutoNum(el){
  el.addEventListener('keydown',function(e){
    if(e.key==='Enter'){
      e.preventDefault();
      var v=el.value,pos=el.selectionStart;
      var lines=v.substring(0,pos).split('\n');
      var next=lines.length+1;
      var insert='\n'+next+'. ';
      el.value=v.substring(0,pos)+insert+v.substring(pos);
      el.selectionStart=el.selectionEnd=pos+insert.length;
    }
  });
  // Init with "1. " if empty
  if(!el.value.trim())el.value='1. ';
}

// ===== FORM — Create/Edit =====
async function _ltgOpenForm(id){
  var item=null;
  if(id){item=_ltg.items.find(function(x){return x.id===id;});}
  var cats=_ltg.categories;
  var ov=document.createElement('div');
  ov.id='ltgFormOv';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px';
  ov.onclick=function(e){if(e.target===ov)ov.remove();};

  var catOpts='<option value="">— Chọn loại lỗi —</option>';
  cats.forEach(function(c){catOpts+='<option value="'+c.id+'"'+(item&&item.error_category_id==c.id?' selected':'')+'>'+c.name+'</option>';});
  // Build dept checkboxes
  var existDepts=[];
  if(item){try{existDepts=typeof item.departments==='string'?JSON.parse(item.departments||'[]'):(item.departments||[]);}catch(e){}}
  var deptChecks='';
  _ltg.departments.forEach(function(d){
    var chk=existDepts.indexOf(d.name)>=0?' checked':'';
    deptChecks+='<label style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;margin-bottom:4px;font-size:12px;cursor:pointer"><input type="checkbox" class="ltgF_dept_chk" value="'+d.name+'"'+chk+' style="cursor:pointer"> '+d.name+'</label>';
  });
  var statusOpts='';
  [['pending','🔴 Chưa Xử Lý'],['in_progress','🟡 Đang Xử Lý'],['resolved','🟢 Đã Xử Lý']].forEach(function(s){
    statusOpts+='<option value="'+s[0]+'"'+(item&&item.status===s[0]?' selected':(!item&&s[0]==='pending'?' selected':''))+'>'+s[1]+'</option>';
  });

  var req='<span style="color:#dc2626"> *</span>';
  var fld=function(label,name,type,val,required){
    var star=required?req:'';
    if(type==='select')return '<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">'+label+star+'</label><select id="ltgF_'+name+'" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px">'+val+'</select></div>';
    if(type==='textarea')return '<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">'+label+star+'</label><textarea id="ltgF_'+name+'" rows="4" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;resize:vertical;font-family:inherit">'+(val||'')+'</textarea></div>';
    return '<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">'+label+star+'</label><input id="ltgF_'+name+'" type="text" value="'+(val||'')+'" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px"></div>';
  };

  // Existing images preview
  var existImgs=[];
  if(item){try{existImgs=typeof item.error_images==='string'?JSON.parse(item.error_images||'[]'):(item.error_images||[]);}catch(e){}}
  var imgPrev='';
  existImgs.forEach(function(u){imgPrev+='<img src="'+u+'" style="width:50px;height:50px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb">';});

  ov.innerHTML='<div style="background:#fff;border-radius:16px;max-width:750px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">'+
    '<div style="padding:16px 20px;background:linear-gradient(135deg,#1e3a5f,#0f2a3a);border-radius:16px 16px 0 0;display:flex;align-items:center;justify-content:space-between">'+
      '<div style="font-size:15px;font-weight:800;color:#fff">'+(id?'✏️ Chỉnh Sửa':'➕ Thêm')+' Lỗi Thường Gặp</div>'+
      '<button onclick="document.getElementById(\'ltgFormOv\').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:8px;font-size:18px;cursor:pointer">×</button>'+
    '</div>'+
    '<div style="padding:20px">'+
      fld('Tên Lỗi','error_name','text',item?item.error_name:'',true)+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
        fld('Loại Lỗi','category','select',catOpts,true)+
      '</div>'+
      // Department checkboxes (multi-select)
      '<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:6px">Bộ Phận Lỗi<span style="color:#dc2626"> *</span></label>'+
      '<div id="ltgF_deptGroup" style="padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;display:flex;flex-wrap:wrap;gap:2px">'+deptChecks+'</div></div>'+
      fld('Tình Trạng','status','select',statusOpts,false)+
      fld('Cách Khắc Phục / Xử Lý Lỗi','fix_guide','textarea',item?item.fix_guide:'',true)+
      fld('Hướng Dẫn Sale Tư Vấn','sale_guide','textarea',item?item.sale_guide:'',true)+
      fld('Cam Kết Quản Lý Xưởng','commit_factory','textarea',item?item.commit_factory:'',true)+
      fld('Cam Kết Bộ Phận Lỗi','commit_department','textarea',item?item.commit_department:'',true)+
      // Chịu Trách Nhiệm dynamic rows
      _ltgBuildRespFormSection(item)+
      // Image upload with paste zone
      '<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">📷 Hình Ảnh Lỗi</label>'+
      '<div id="ltgF_imgPreview" style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">'+imgPrev+'</div>'+
      '<div id="ltgF_pasteZone" tabindex="0" style="padding:14px;border:2px dashed #c4b5fd;border-radius:8px;text-align:center;color:#7c3aed;font-size:12px;font-weight:600;cursor:pointer;margin-bottom:6px;background:#faf5ff;transition:all .2s" onmouseover="this.style.borderColor=\'#7c3aed\';this.style.background=\'#ede9fe\'" onmouseout="this.style.borderColor=\'#c4b5fd\';this.style.background=\'#faf5ff\'">📋 Ctrl+V để dán ảnh từ clipboard</div>'+
      '<div id="ltgF_pastedPreview" style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px"></div>'+
      '<input type="file" id="ltgF_images" accept="image/*" multiple style="font-size:12px"></div>'+
      // Video upload
      '<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">🎬 Video Lỗi</label>'+
      (item&&item.error_video?'<video src="'+item.error_video+'" controls style="max-width:200px;max-height:120px;border-radius:8px;margin-bottom:6px"></video><br>':'')+
      '<input type="file" id="ltgF_video" accept="video/*" style="font-size:12px"></div>'+
      '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">'+
        '<button onclick="document.getElementById(\'ltgFormOv\').remove()" style="padding:8px 20px;background:#f1f5f9;color:#64748b;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">Hủy</button>'+
        '<button onclick="_ltgSubmitForm('+(id||'null')+')" style="padding:8px 20px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">'+(id?'Cập Nhật':'Tạo Mới')+'</button>'+
      '</div>'+
    '</div></div>';
  document.body.appendChild(ov);

  // Attach auto-numbering to textareas
  ['fix_guide','sale_guide','commit_factory','commit_department'].forEach(function(n){
    var el=document.getElementById('ltgF_'+n);
    if(el)_ltgAutoNum(el);
  });

  // Init responsibility progress bar
  _ltgUpdateRespTotal();

  // Ctrl+V paste image support
  window._ltgPastedFiles=[];
  var formEl=document.querySelector('#ltgFormOv');
  if(formEl){
    formEl.addEventListener('paste',function(e){
      var items=e.clipboardData&&e.clipboardData.items;
      if(!items)return;
      for(var i=0;i<items.length;i++){
        if(items[i].type.indexOf('image')===0){
          e.preventDefault();
          var file=items[i].getAsFile();
          if(!file)continue;
          if(file.size>5*1024*1024){showToast('Ảnh quá lớn (max 5MB)','error');continue;}
          if(window._ltgPastedFiles.length>=5){showToast('Tối đa 5 ảnh paste','error');continue;}
          window._ltgPastedFiles.push(file);
          var reader=new FileReader();
          reader.onload=function(ev){
            var prev=document.getElementById('ltgF_pastedPreview');
            if(prev){
              var idx=window._ltgPastedFiles.length-1;
              prev.innerHTML+='<div style="position:relative;display:inline-block" data-paste-idx="'+idx+'"><img src="'+ev.target.result+'" style="width:50px;height:50px;object-fit:cover;border-radius:6px;border:2px solid #7c3aed"><span onclick="_ltgRemovePasted('+idx+')" style="position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;width:14px;height:14px;border-radius:50%;font-size:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:700">×</span></div>';
            }
          };
          reader.readAsDataURL(file);
          showToast('📋 Đã dán ảnh từ clipboard!');
          break;
        }
      }
    });
  }
}

async function _ltgSubmitForm(id){
  // Collect departments from checkboxes
  var selDepts=[];
  document.querySelectorAll('.ltgF_dept_chk:checked').forEach(function(cb){selDepts.push(cb.value);});
  // Collect responsibility rows
  var respRows=[];
  var respContainer=document.getElementById('ltgF_respRows');
  if(respContainer){
    var rows=respContainer.querySelectorAll('.ltgF_respRow');
    rows.forEach(function(row){
      var nameEl=row.querySelector('.ltgF_respName');
      var pctEl=row.querySelector('.ltgF_respPct');
      if(nameEl&&pctEl){
        var n=nameEl.value.trim();
        var p=parseInt(pctEl.value)||0;
        if(n&&p>0)respRows.push({name:n,percent:p});
      }
    });
  }
  var body={
    error_name:document.getElementById('ltgF_error_name').value.trim(),
    error_category_id:document.getElementById('ltgF_category').value||null,
    departments:selDepts,
    status:document.getElementById('ltgF_status').value||'pending',
    fix_guide:document.getElementById('ltgF_fix_guide').value.trim(),
    sale_guide:document.getElementById('ltgF_sale_guide').value.trim(),
    commit_factory:document.getElementById('ltgF_commit_factory').value.trim(),
    commit_department:document.getElementById('ltgF_commit_department').value.trim(),
    responsibility:respRows
  };
  // Validation
  if(!body.error_name){showToast('Vui lòng nhập Tên Lỗi','error');return;}
  if(!body.error_category_id){showToast('Vui lòng chọn Loại Lỗi','error');return;}
  if(!selDepts.length){showToast('Vui lòng chọn ít nhất 1 Bộ Phận Lỗi','error');return;}
  if(!body.fix_guide||body.fix_guide==='1. '){showToast('Vui lòng nhập Cách Khắc Phục / Xử Lý Lỗi','error');return;}
  if(!body.sale_guide||body.sale_guide==='1. '){showToast('Vui lòng nhập Hướng Dẫn Sale Tư Vấn','error');return;}
  if(!body.commit_factory||body.commit_factory==='1. '){showToast('Vui lòng nhập Cam Kết Quản Lý Xưởng','error');return;}
  if(!body.commit_department||body.commit_department==='1. '){showToast('Vui lòng nhập Cam Kết Bộ Phận Lỗi','error');return;}
  // Validate responsibility — must have ≥1 row and total = 100%
  if(!respRows.length){showToast('Vui lòng thêm ít nhất 1 người Chịu Trách Nhiệm','error');return;}
  var totalPct=respRows.reduce(function(s,r){return s+r.percent;},0);
  if(totalPct!==100){showToast('Tổng % Chịu Trách Nhiệm phải = 100% (hiện tại: '+totalPct+'%)','error');return;}
  // Check for empty names
  var hasEmpty=respRows.some(function(r){return !r.name;});
  if(hasEmpty){showToast('Vui lòng nhập tên cho tất cả người Chịu Trách Nhiệm','error');return;}

  try{
    var r;
    if(id){r=await apiCall('/api/common-errors-tpl/'+id,'PUT',body);}
    else{r=await apiCall('/api/common-errors-tpl','POST',body);}
    if(r.error){showToast(r.error,'error');return;}
    var targetId=id||r.item.id;

    // Upload images (file input + pasted)
    var imgInput=document.getElementById('ltgF_images');
    var hasPasted=window._ltgPastedFiles&&window._ltgPastedFiles.length>0;
    var hasFiles=imgInput&&imgInput.files&&imgInput.files.length>0;
    if(hasFiles||hasPasted){
      var fd=new FormData();
      if(hasFiles){for(var i=0;i<imgInput.files.length;i++)fd.append('images',imgInput.files[i]);}
      if(hasPasted){window._ltgPastedFiles.forEach(function(f){fd.append('images',f);});}
      await fetch('/api/common-errors-tpl/'+targetId+'/images',{method:'POST',body:fd,credentials:'include'});
      window._ltgPastedFiles=[];
    }
    // Upload video if selected
    var vidInput=document.getElementById('ltgF_video');
    if(vidInput&&vidInput.files&&vidInput.files.length>0){
      var vd=new FormData();
      vd.append('video',vidInput.files[0]);
      await fetch('/api/common-errors-tpl/'+targetId+'/video',{method:'POST',body:vd,credentials:'include'});
    }

    showToast('✅ '+(id?'Đã cập nhật':'Đã tạo')+' lỗi thường gặp!');
    document.getElementById('ltgFormOv').remove();
    _ltgLoadAll();
  }catch(e){showToast('Lỗi: '+e.message,'error');}
}

// ===== DELETE =====
async function _ltgDelete(id){
  if(!confirm('Bạn có chắc muốn xóa lỗi thường gặp này?'))return;
  try{
    await apiCall('/api/common-errors-tpl/'+id,'DELETE');
    showToast('✅ Đã xóa');
    _ltgLoadAll();
  }catch(e){showToast('Lỗi: '+e.message,'error');}
}

// ===== CATEGORY MANAGER =====
function _ltgOpenCatManager(){
  var cats=_ltg.categories;
  var ov=document.createElement('div');
  ov.id='ltgCatOv';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px';
  ov.onclick=function(e){if(e.target===ov)ov.remove();};

  var listH='';
  cats.forEach(function(c){
    listH+='<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #f1f5f9">'
      +'<span style="font-size:13px;font-weight:600;color:#1e293b">'+c.name+'</span>'
      +'<button onclick="_ltgDeleteCat('+c.id+')" style="padding:2px 8px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer">Xóa</button>'
      +'</div>';
  });

  ov.innerHTML='<div style="background:#fff;border-radius:16px;max-width:450px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">'+
    '<div style="padding:16px 20px;background:linear-gradient(135deg,#6366f1,#4f46e5);border-radius:16px 16px 0 0;display:flex;align-items:center;justify-content:space-between">'+
      '<div style="font-size:15px;font-weight:800;color:#fff">⚙️ Quản Lý Loại Lỗi</div>'+
      '<button onclick="document.getElementById(\'ltgCatOv\').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:8px;font-size:18px;cursor:pointer">×</button>'+
    '</div>'+
    '<div style="padding:16px">'+
      '<div style="display:flex;gap:8px;margin-bottom:12px">'+
        '<input id="ltgCat_name" type="text" placeholder="Nhập tên loại lỗi mới..." style="flex:1;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px">'+
        '<button onclick="_ltgAddCat()" style="padding:8px 14px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">+ Thêm</button>'+
      '</div>'+
      '<div id="ltgCatList" style="border:1px solid #e5e7eb;border-radius:8px;max-height:300px;overflow-y:auto">'+(listH||'<div style="padding:20px;text-align:center;color:#9ca3af">Chưa có loại lỗi</div>')+'</div>'+
    '</div></div>';
  document.body.appendChild(ov);
}

async function _ltgAddCat(){
  var input=document.getElementById('ltgCat_name');
  if(!input)return;
  var name=input.value.trim();
  if(!name){showToast('Nhập tên loại lỗi','error');return;}
  try{
    var r=await apiCall('/api/error-categories','POST',{name:name});
    if(r.error){showToast(r.error,'error');return;}
    showToast('✅ Đã thêm loại lỗi: '+name);
    document.getElementById('ltgCatOv').remove();
    _ltgLoadAll().then(function(){_ltgOpenCatManager();});
  }catch(e){showToast('Lỗi: '+e.message,'error');}
}

async function _ltgDeleteCat(id){
  if(!confirm('Xóa loại lỗi này?'))return;
  try{
    var r=await apiCall('/api/error-categories/'+id,'DELETE');
    if(r.error){showToast(r.error,'error');return;}
    showToast('✅ Đã xóa');
    document.getElementById('ltgCatOv').remove();
    _ltgLoadAll().then(function(){_ltgOpenCatManager();});
  }catch(e){showToast('Lỗi: '+e.message,'error');}
}

// ===== DEPARTMENT MANAGER =====
function _ltgOpenDeptManager(){
  var depts=_ltg.departments;
  var ov=document.createElement('div');
  ov.id='ltgDeptOv';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px';
  ov.onclick=function(e){if(e.target===ov)ov.remove();};
  var listH='';
  depts.forEach(function(d){
    listH+='<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #f1f5f9">'
      +'<span style="font-size:13px;font-weight:600;color:#1e293b">'+d.name+'</span>'
      +'<button onclick="_ltgDeleteDept('+d.id+')" style="padding:2px 8px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer">Xóa</button>'
      +'</div>';
  });
  ov.innerHTML='<div style="background:#fff;border-radius:16px;max-width:450px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">'+
    '<div style="padding:16px 20px;background:linear-gradient(135deg,#0891b2,#0e7490);border-radius:16px 16px 0 0;display:flex;align-items:center;justify-content:space-between">'+
      '<div style="font-size:15px;font-weight:800;color:#fff">🏭 Quản Lý Bộ Phận</div>'+
      '<button onclick="document.getElementById(\'ltgDeptOv\').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:8px;font-size:18px;cursor:pointer">×</button>'+
    '</div>'+
    '<div style="padding:16px">'+
      '<div style="display:flex;gap:8px;margin-bottom:12px">'+
        '<input id="ltgDept_name" type="text" placeholder="Nhập tên bộ phận mới..." style="flex:1;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px">'+
        '<button onclick="_ltgAddDept()" style="padding:8px 14px;background:linear-gradient(135deg,#0891b2,#0e7490);color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">+ Thêm</button>'+
      '</div>'+
      '<div style="border:1px solid #e5e7eb;border-radius:8px;max-height:300px;overflow-y:auto">'+(listH||'<div style="padding:20px;text-align:center;color:#9ca3af">Chưa có bộ phận</div>')+'</div>'+
    '</div></div>';
  document.body.appendChild(ov);
}

async function _ltgAddDept(){
  var input=document.getElementById('ltgDept_name');
  if(!input)return;
  var name=input.value.trim();
  if(!name){showToast('Nhập tên bộ phận','error');return;}
  try{
    var r=await apiCall('/api/error-departments','POST',{name:name});
    if(r.error){showToast(r.error,'error');return;}
    showToast('✅ Đã thêm bộ phận: '+name);
    document.getElementById('ltgDeptOv').remove();
    _ltgLoadAll().then(function(){_ltgOpenDeptManager();});
  }catch(e){showToast('Lỗi: '+e.message,'error');}
}

async function _ltgDeleteDept(id){
  if(!confirm('Xóa bộ phận này?'))return;
  try{
    var r=await apiCall('/api/error-departments/'+id,'DELETE');
    if(r.error){showToast(r.error,'error');return;}
    showToast('✅ Đã xóa');
    document.getElementById('ltgDeptOv').remove();
    _ltgLoadAll().then(function(){_ltgOpenDeptManager();});
  }catch(e){showToast('Lỗi: '+e.message,'error');}
}

// ===== REMOVE PASTED IMAGE =====
function _ltgRemovePasted(idx){
  if(window._ltgPastedFiles)window._ltgPastedFiles.splice(idx,1);
  var prev=document.getElementById('ltgF_pastedPreview');
  if(prev){var el=prev.querySelector('[data-paste-idx="'+idx+'"]');if(el)el.remove();}
}

// ===== DRILL-DOWN: View Customer Error Order Detail =====
async function _ltgViewOrderDetail(id){
  if(typeof _ceoViewDetail==='function'){_ceoViewDetail(id);return;}
  try{
    var d=await apiCall('/api/customer-errors/'+id);
    var item=d.item;
    if(!item){showToast('Không tìm thấy đơn lỗi','error');return;}
    var rd=item.report_date?new Date(item.report_date).toLocaleDateString('vi-VN'):'—';
    var fmtM=function(v){return Number(v||0)>0?Number(v).toLocaleString('vi-VN')+'đ':'—';};
    var imgs=[];try{imgs=typeof item.error_images==='string'?JSON.parse(item.error_images||'[]'):(item.error_images||[]);}catch(e){}
    var imgH=imgs.length?imgs.map(function(u){return '<img src="'+u+'" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;cursor:pointer" onclick="window.open(\''+u+'\',\'_blank\')">';}).join(''):'<span style="color:#9ca3af">Không có hình ảnh</span>';
    var old=document.getElementById('ltgOrderDetailOv');if(old)old.remove();
    var ov=document.createElement('div');ov.id='ltgOrderDetailOv';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
    ov.onclick=function(e){if(e.target===ov)ov.remove();};
    var field=function(l,v,c){return '<div><div style="font-size:10px;font-weight:700;color:#9ca3af;margin-bottom:2px">'+l+'</div><div style="font-size:13px;font-weight:700;color:'+(c||'#1e293b')+'">'+(v||'—')+'</div></div>';};
    var h='<div style="background:#fff;border-radius:16px;max-width:700px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">';
    h+='<div style="padding:16px 20px;background:linear-gradient(135deg,#7c3aed,#5b21b6);border-radius:16px 16px 0 0;display:flex;align-items:center;justify-content:space-between">';
    h+='<div style="color:#fff;font-size:15px;font-weight:800">📝 Đơn Lỗi — '+(item.order_code||'N/A')+'</div>';
    h+='<button onclick="document.getElementById(\'ltgOrderDetailOv\').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:30px;height:30px;border-radius:8px;font-size:16px;cursor:pointer">×</button></div>';
    h+='<div style="padding:20px">';
    h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px;padding:12px;background:#f8fafc;border-radius:8px">';
    h+=field('Mã Đơn',item.order_code,'#ea580c')+field('Ngày',rd)+field('Lỗi Thường Gặp',item.common_error_type,'#7c3aed');
    h+=field('Người Vi Phạm',item.violator_name,'#dc2626')+field('SL Lỗi',item.error_quantity)+field('CSKH',item.cskh_name);
    h+='</div>';
    h+='<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:700;color:#6b7280;margin-bottom:4px">📌 Nội Dung Lỗi</div><div style="padding:8px 12px;background:#fff7ed;border-radius:6px;border:1px solid #fed7aa;font-size:12px;color:#9a3412;line-height:1.5">'+(item.error_content||'—')+'</div></div>';
    h+='<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:700;color:#6b7280;margin-bottom:4px">✅ Cách Xử Lý</div><div style="padding:8px 12px;background:#f0fdf4;border-radius:6px;border:1px solid #bbf7d0;font-size:12px;color:#166534;line-height:1.5;white-space:pre-line">'+(item.sale_resolution||'—')+'</div></div>';
    h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">';
    h+='<div style="padding:8px 12px;background:#eff6ff;border-radius:6px;border:1px solid #bfdbfe"><div style="font-size:10px;font-weight:700;color:#1e40af">Chi Phí SX</div><div style="font-size:14px;font-weight:800;color:#1e40af">'+fmtM(item.production_cost)+'</div></div>';
    h+='<div style="padding:8px 12px;background:#fefce8;border-radius:6px;border:1px solid #fde68a"><div style="font-size:10px;font-weight:700;color:#92400e">Phí Ship</div><div style="font-size:14px;font-weight:800;color:#92400e">'+fmtM(item.shipping_cost)+'</div></div></div>';
    h+='<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:700;color:#6b7280;margin-bottom:4px">📷 Hình Ảnh</div><div style="display:flex;gap:6px;flex-wrap:wrap">'+imgH+'</div></div>';
    if(item.violator_commitment){h+='<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:700;color:#6b7280;margin-bottom:4px">📝 Cam Kết NVP</div><div style="padding:8px 12px;background:#f5f3ff;border-radius:6px;border:1px solid #c4b5fd;font-size:12px;color:#5b21b6;white-space:pre-line">'+item.violator_commitment+'</div></div>';}
    if(item.penalty_month){h+='<div style="padding:6px 10px;background:#fefce8;border:1px solid #fde68a;border-radius:6px;font-size:11px;font-weight:700;color:#92400e">📅 Đã Phạt: '+item.penalty_month+'</div>';}
    h+='</div></div>';
    ov.innerHTML=h;document.body.appendChild(ov);
  }catch(e){showToast('Lỗi: '+e.message,'error');}
}

// ===== RESPONSIBILITY HELPERS — Chịu Trách Nhiệm =====

// Build the form section HTML for responsibility rows
function _ltgBuildRespFormSection(item){
  var resp=[];
  if(item){try{resp=typeof item.responsibility==='string'?JSON.parse(item.responsibility||'[]'):(item.responsibility||[]);}catch(e){}}
  // If no existing data, start with 1 empty row
  if(!resp.length)resp=[{name:'',percent:100}];

  var h='<div style="margin-bottom:12px">';
  h+='<label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:6px">👤 Chịu Trách Nhiệm<span style="color:#dc2626"> *</span></label>';
  h+='<div id="ltgF_respRows" style="border:1px solid #d1d5db;border-radius:8px;padding:10px;background:#f8fafc">';
  resp.forEach(function(r,i){
    h+=_ltgRespRowHtml(i,r.name,r.percent);
  });
  h+='</div>';
  // Add button + progress bar
  h+='<div style="display:flex;align-items:center;gap:10px;margin-top:8px">';
  h+='<button type="button" onclick="_ltgAddRespRow()" style="padding:5px 14px;background:linear-gradient(135deg,#0891b2,#0e7490);color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap">+ Thêm Người</button>';
  h+='<div style="flex:1;display:flex;align-items:center;gap:8px">';
  h+='<div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden"><div id="ltgF_respBar" style="height:100%;width:0%;background:#16a34a;border-radius:4px;transition:all .3s"></div></div>';
  h+='<span id="ltgF_respTotal" style="font-size:12px;font-weight:800;color:#6b7280;min-width:60px;text-align:right">0/100%</span>';
  h+='</div></div>';
  h+='</div>';
  return h;
}

// Generate HTML for a single responsibility row
function _ltgRespRowHtml(idx,name,pct){
  return '<div class="ltgF_respRow" style="display:flex;align-items:center;gap:8px;margin-bottom:6px" data-idx="'+idx+'">'
    +'<input type="text" class="ltgF_respName" value="'+(name||'').replace(/"/g,'&quot;')+'" placeholder="Nhập tên người / bộ phận..." style="flex:1;padding:7px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px">'
    +'<div style="display:flex;align-items:center;gap:2px"><input type="number" class="ltgF_respPct" value="'+(pct||0)+'" min="1" max="100" step="1" oninput="_ltgUpdateRespTotal()" style="width:65px;padding:7px 6px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;text-align:center;font-weight:700"><span style="font-size:12px;font-weight:700;color:#6b7280">%</span></div>'
    +'<button type="button" onclick="_ltgRemoveRespRow(this)" style="padding:4px 8px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer" title="Xóa">✕</button>'
    +'</div>';
}

// Add a new responsibility row
function _ltgAddRespRow(){
  var container=document.getElementById('ltgF_respRows');
  if(!container)return;
  var rows=container.querySelectorAll('.ltgF_respRow');
  var idx=rows.length;
  // Calculate remaining %
  var used=0;
  rows.forEach(function(row){
    var pctEl=row.querySelector('.ltgF_respPct');
    used+=parseInt(pctEl.value)||0;
  });
  var remaining=Math.max(0,100-used);
  var div=document.createElement('div');
  div.innerHTML=_ltgRespRowHtml(idx,'',remaining);
  container.appendChild(div.firstChild);
  _ltgUpdateRespTotal();
  // Focus the new name input
  var newRow=container.querySelectorAll('.ltgF_respRow');
  var last=newRow[newRow.length-1];
  if(last){var inp=last.querySelector('.ltgF_respName');if(inp)inp.focus();}
}

// Remove a responsibility row
function _ltgRemoveRespRow(btn){
  var container=document.getElementById('ltgF_respRows');
  if(!container)return;
  var rows=container.querySelectorAll('.ltgF_respRow');
  if(rows.length<=1){showToast('Phải có ít nhất 1 người Chịu Trách Nhiệm','error');return;}
  var row=btn.closest('.ltgF_respRow');
  if(row)row.remove();
  _ltgUpdateRespTotal();
}

// Update the total % display + progress bar in realtime
function _ltgUpdateRespTotal(){
  var container=document.getElementById('ltgF_respRows');
  var bar=document.getElementById('ltgF_respBar');
  var totalEl=document.getElementById('ltgF_respTotal');
  if(!container||!bar||!totalEl)return;
  var total=0;
  container.querySelectorAll('.ltgF_respPct').forEach(function(el){total+=parseInt(el.value)||0;});
  var pct=Math.min(total,100);
  bar.style.width=pct+'%';
  if(total===100){
    bar.style.background='linear-gradient(90deg,#16a34a,#22c55e)';
    totalEl.style.color='#16a34a';
    totalEl.innerHTML='<span style="font-size:14px">✅</span> '+total+'/100%';
  } else if(total>100){
    bar.style.background='linear-gradient(90deg,#dc2626,#ef4444)';
    bar.style.width='100%';
    totalEl.style.color='#dc2626';
    totalEl.innerHTML='<span style="font-size:14px">⚠️</span> '+total+'/100%';
  } else {
    bar.style.background='linear-gradient(90deg,#d97706,#f59e0b)';
    totalEl.style.color='#d97706';
    totalEl.innerHTML=total+'/100%';
  }
}

// Build responsibility section for detail popup
function _ltgRespDetailSection(item){
  var resp=[];
  try{resp=typeof item.responsibility==='string'?JSON.parse(item.responsibility||'[]'):(item.responsibility||[]);}catch(e){}
  if(!resp.length)return '';
  var h='<div style="margin-bottom:16px">';
  h+='<div style="font-size:12px;font-weight:800;color:#1e293b;margin-bottom:6px;display:flex;align-items:center;gap:6px">👤 Chịu Trách Nhiệm</div>';
  h+='<div style="padding:10px 14px;background:#f0fdfa;border-radius:8px;border:1px solid #99f6e4">';
  resp.forEach(function(r){
    var barW=Math.min(r.percent,100);
    h+='<div style="display:flex;align-items:center;gap:10px;padding:5px 0;border-bottom:1px solid #ccfbf133">';
    h+='<div style="min-width:120px;font-size:12px;font-weight:700;color:#0e7490">'+(r.name||'—')+'</div>';
    h+='<div style="flex:1;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden"><div style="height:100%;width:'+barW+'%;background:linear-gradient(90deg,#0891b2,#06b6d4);border-radius:3px"></div></div>';
    h+='<div style="min-width:50px;text-align:right;font-size:12px;font-weight:800;color:#0891b2">'+r.percent+'%</div>';
    h+='</div>';
  });
  h+='</div></div>';
  return h;
}
