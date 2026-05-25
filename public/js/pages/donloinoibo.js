// ========== LOI THUONG GAP & XU LY — Common Error Templates ==========
var _ltg = { items: [], categories: [], stats: {}, filter: null, catFilter: null, deptFilter: null };
var LTG_DEPTS = [
  {k:'sale',l:'Sale/KD',c:'#3b82f6',bg:'#dbeafe'},
  {k:'cat',l:'Cắt',c:'#7c3aed',bg:'#ede9fe'},
  {k:'in',l:'In',c:'#ea580c',bg:'#fff7ed'},
  {k:'ep',l:'Ép',c:'#d97706',bg:'#fef3c7'},
  {k:'may',l:'May',c:'#16a34a',bg:'#f0fdf4'},
  {k:'hoan_thien',l:'Hoàn Thiện',c:'#e11d48',bg:'#fff1f2'},
  {k:'kho',l:'Kho',c:'#6b7280',bg:'#f3f4f6'},
  {k:'thiet_ke',l:'Thiết Kế',c:'#0891b2',bg:'#ecfeff'}
];
function _ltgDept(k){return LTG_DEPTS.find(function(d){return d.k===k;})||{k:k,l:k||'—',c:'#6b7280',bg:'#f3f4f6'};}
function _ltgStatusInfo(s){
  if(s==='resolved') return {l:'Đã Xử Lý',c:'#16a34a',bg:'#f0fdf4',icon:'🟢'};
  if(s==='in_progress') return {l:'Đang Xử Lý',c:'#d97706',bg:'#fef3c7',icon:'🟡'};
  return {l:'Chưa Xử Lý',c:'#dc2626',bg:'#fef2f2',icon:'🔴'};
}

// ===== ENTRY =====
function renderDonloinoiboPage(c){renderLoithuonggapPage(c);}
function renderLoithuonggapPage(content){
  _ltg.filter=null;_ltg.catFilter=null;_ltg.deptFilter=null;
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
  h+='<button onclick="_ltgOpenCatManager()" style="padding:8px 16px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">⚙️ Quản Lý Loại Lỗi</button>';
  h+='<button onclick="_ltgOpenForm()" style="padding:8px 16px;background:linear-gradient(135deg,#f59e0b,#ea580c);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">+ Thêm Lỗi Thường Gặp</button>';
  h+='</div></div>';

  // 3 Stat cards
  h+='<div style="display:flex;gap:12px;margin-bottom:16px">';
  h+=_ltgCard('🔴','Chưa Xử Lý',st.pending||0,'#dc2626','#fef2f2','#fecaca','pending');
  h+=_ltgCard('🟡','Đang Xử Lý',st.in_progress||0,'#d97706','#fef3c7','#fde68a','in_progress');
  h+=_ltgCard('🟢','Đã Xử Lý',st.resolved||0,'#16a34a','#f0fdf4','#bbf7d0','resolved');
  h+='</div>';

  // Dept filter chips
  h+='<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">';
  h+='<span onclick="_ltgSetDept(null)" style="padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;'+(!_ltg.deptFilter?'background:#1e293b;color:#fff':'background:#f1f5f9;color:#64748b')+'">Tất Cả BP</span>';
  LTG_DEPTS.forEach(function(d){
    var isA=_ltg.deptFilter===d.k;
    h+='<span onclick="_ltgSetDept(\''+d.k+'\')" style="padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid '+(isA?d.c:'#e5e7eb')+';'+(isA?'background:'+d.bg+';color:'+d.c:'background:#fff;color:#64748b')+'">'+d.l+'</span>';
  });
  h+='</div>';

  // Table
  h+='<div style="overflow-x:auto;border-radius:10px;border:1px solid #e5e7eb"><table style="width:100%;border-collapse:collapse;font-size:12px">';
  h+='<thead><tr style="background:#1e3a4f">';
  ['STT','Tên Lỗi','Loại Lỗi','Bộ Phận Lỗi','Tình Trạng','Cách Khắc Phục','HD Sale Tư Vấn','CK QL Xưởng','CK BP Lỗi','CK Sale',''].forEach(function(c){
    h+='<th style="padding:8px 6px;text-align:left;font-size:11px;font-weight:700;color:#fff;white-space:nowrap;border-right:1px solid rgba(255,255,255,0.1)">'+c+'</th>';
  });
  h+='</tr></thead><tbody>';

  if(!items.length){
    h+='<tr><td colspan="11" style="padding:40px;text-align:center;color:#9ca3af">Chưa có lỗi thường gặp nào</td></tr>';
  } else {
    items.forEach(function(item,idx){
      var dp=_ltgDept(item.department);
      var si=_ltgStatusInfo(item.status);
      var catName=item.category_name||'—';
      h+='<tr style="border-bottom:1px solid #f1f5f9" onmouseover="this.style.background=\'#fffbeb\'" onmouseout="this.style.background=\'\'">';
      h+='<td style="padding:6px;text-align:center;color:#9ca3af;border-right:1px solid #f8fafc">'+(idx+1)+'</td>';
      h+='<td style="padding:6px;font-weight:700;color:#1e293b;border-right:1px solid #f8fafc">'+(item.error_name||'—')+'</td>';
      h+='<td style="padding:6px;border-right:1px solid #f8fafc"><span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe">'+catName+'</span></td>';
      h+='<td style="padding:6px;border-right:1px solid #f8fafc"><span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;color:'+dp.c+';background:'+dp.bg+';border:1px solid '+dp.c+'22">'+dp.l+'</span></td>';
      h+='<td style="padding:6px;border-right:1px solid #f8fafc"><span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;color:'+si.c+';background:'+si.bg+'">'+si.icon+' '+si.l+'</span></td>';
      h+='<td style="padding:6px;max-width:180px;overflow:hidden;text-overflow:ellipsis;border-right:1px solid #f8fafc" title="'+(item.fix_guide||'').replace(/"/g,'&quot;')+'">'+(item.fix_guide||'—')+'</td>';
      h+='<td style="padding:6px;max-width:150px;overflow:hidden;text-overflow:ellipsis;border-right:1px solid #f8fafc">'+(item.sale_guide||'—')+'</td>';
      h+='<td style="padding:6px;max-width:120px;overflow:hidden;text-overflow:ellipsis;border-right:1px solid #f8fafc">'+(item.commit_factory||'—')+'</td>';
      h+='<td style="padding:6px;max-width:120px;overflow:hidden;text-overflow:ellipsis;border-right:1px solid #f8fafc">'+(item.commit_department||'—')+'</td>';
      h+='<td style="padding:6px;max-width:120px;overflow:hidden;text-overflow:ellipsis;border-right:1px solid #f8fafc">'+(item.commit_sale||'—')+'</td>';
      h+='<td style="padding:6px;white-space:nowrap">';
      h+='<button onclick="_ltgOpenForm('+item.id+')" style="padding:3px 8px;background:#3b82f6;color:#fff;border:none;border-radius:4px;font-size:10px;cursor:pointer;margin-right:2px">✏️</button>';
      h+='<button onclick="_ltgDelete('+item.id+')" style="padding:3px 8px;background:#ef4444;color:#fff;border:none;border-radius:4px;font-size:10px;cursor:pointer">🗑</button>';
      h+='</td></tr>';
    });
  }
  h+='</tbody></table></div>';
  main.innerHTML=h;
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

// ===== FORM — Create/Edit =====
async function _ltgOpenForm(id){
  var item=null;
  if(id){item=_ltg.items.find(function(x){return x.id===id;});}
  // Load categories
  var cats=_ltg.categories;
  var ov=document.createElement('div');
  ov.id='ltgFormOv';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px';
  ov.onclick=function(e){if(e.target===ov)ov.remove();};

  var catOpts='<option value="">— Chọn loại lỗi —</option>';
  cats.forEach(function(c){catOpts+='<option value="'+c.id+'"'+(item&&item.error_category_id==c.id?' selected':'')+'>'+c.name+'</option>';});

  var deptOpts='<option value="">— Chọn bộ phận —</option>';
  LTG_DEPTS.forEach(function(d){deptOpts+='<option value="'+d.k+'"'+(item&&item.department===d.k?' selected':'')+'>'+d.l+'</option>';});

  var statusOpts='';
  [['pending','🔴 Chưa Xử Lý'],['in_progress','🟡 Đang Xử Lý'],['resolved','🟢 Đã Xử Lý']].forEach(function(s){
    statusOpts+='<option value="'+s[0]+'"'+(item&&item.status===s[0]?' selected':(!item&&s[0]==='pending'?' selected':''))+'>'+s[1]+'</option>';
  });

  var fld=function(label,name,type,val){
    if(type==='select')return '<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">'+label+'</label><select id="ltgF_'+name+'" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px">'+val+'</select></div>';
    if(type==='textarea')return '<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">'+label+'</label><textarea id="ltgF_'+name+'" rows="3" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;resize:vertical">'+(val||'')+'</textarea></div>';
    return '<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">'+label+'</label><input id="ltgF_'+name+'" type="text" value="'+(val||'')+'" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px"></div>';
  };

  ov.innerHTML='<div style="background:#fff;border-radius:16px;max-width:700px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">'+
    '<div style="padding:16px 20px;background:linear-gradient(135deg,#1e3a5f,#0f2a3a);border-radius:16px 16px 0 0;display:flex;align-items:center;justify-content:space-between">'+
      '<div style="font-size:15px;font-weight:800;color:#fff">'+(id?'✏️ Chỉnh Sửa':'➕ Thêm')+' Lỗi Thường Gặp</div>'+
      '<button onclick="document.getElementById(\'ltgFormOv\').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:8px;font-size:18px;cursor:pointer">×</button>'+
    '</div>'+
    '<div style="padding:20px">'+
      fld('Tên Lỗi *','error_name','text',item?item.error_name:'')+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
        fld('Loại Lỗi','category','select',catOpts)+
        fld('Bộ Phận Lỗi','department','select',deptOpts)+
      '</div>'+
      fld('Tình Trạng','status','select',statusOpts)+
      fld('Cách Khắc Phục / Xử Lý Lỗi','fix_guide','textarea',item?item.fix_guide:'')+
      fld('Hướng Dẫn Sale Tư Vấn','sale_guide','textarea',item?item.sale_guide:'')+
      fld('Cam Kết Quản Lý Xưởng','commit_factory','textarea',item?item.commit_factory:'')+
      fld('Cam Kết Bộ Phận Lỗi','commit_department','textarea',item?item.commit_department:'')+
      fld('Cam Kết Sale','commit_sale','textarea',item?item.commit_sale:'')+
      '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">'+
        '<button onclick="document.getElementById(\'ltgFormOv\').remove()" style="padding:8px 20px;background:#f1f5f9;color:#64748b;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">Hủy</button>'+
        '<button onclick="_ltgSubmitForm('+(id||'null')+')" style="padding:8px 20px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">'+(id?'Cập Nhật':'Tạo Mới')+'</button>'+
      '</div>'+
    '</div></div>';
  document.body.appendChild(ov);
}

async function _ltgSubmitForm(id){
  var body={
    error_name:document.getElementById('ltgF_error_name').value.trim(),
    error_category_id:document.getElementById('ltgF_category').value||null,
    department:document.getElementById('ltgF_department').value||null,
    status:document.getElementById('ltgF_status').value||'pending',
    fix_guide:document.getElementById('ltgF_fix_guide').value.trim(),
    sale_guide:document.getElementById('ltgF_sale_guide').value.trim(),
    commit_factory:document.getElementById('ltgF_commit_factory').value.trim(),
    commit_department:document.getElementById('ltgF_commit_department').value.trim(),
    commit_sale:document.getElementById('ltgF_commit_sale').value.trim()
  };
  if(!body.error_name){showToast('Vui lòng nhập Tên Lỗi','error');return;}
  try{
    var r;
    if(id){r=await apiCall('/api/common-errors-tpl/'+id,'PUT',body);}
    else{r=await apiCall('/api/common-errors-tpl','POST',body);}
    if(r.error){showToast(r.error,'error');return;}
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
