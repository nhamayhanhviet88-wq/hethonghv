// ========== LOI THUONG GAP & XU LY ==========
var _ltg={items:[],tree:[],year:null,month:null,dept:null,status:null,stats:null};
var LTG_DEPTS=[
  {k:'sale',l:'Sale/KD',c:'#3b82f6',bg:'#dbeafe'},
  {k:'cat',l:'Cắt',c:'#7c3aed',bg:'#ede9fe'},
  {k:'in',l:'In',c:'#ea580c',bg:'#fff7ed'},
  {k:'ep',l:'Ép',c:'#d97706',bg:'#fef3c7'},
  {k:'may',l:'May',c:'#16a34a',bg:'#f0fdf4'},
  {k:'hoan_thien',l:'Hoàn Thiện',c:'#e11d48',bg:'#fff1f2'},
  {k:'kho',l:'Kho',c:'#6b7280',bg:'#f3f4f6'},
  {k:'thiet_ke',l:'Thiết Kế',c:'#0891b2',bg:'#ecfeff'}
];
var LTG_TYPES=['Sai màu','Sai size','Sai chất liệu','Lỗi in','Lỗi may','Lỗi ép','Thiếu số lượng','Giao trễ','Sai thông tin KH','Khác'];
var LTG_SOP={
  'Sai màu':['Liên hệ khách xác nhận lỗi sai màu','Chụp ảnh so sánh mẫu yêu cầu vs thực tế','Báo trưởng BP In/Ép xác nhận','Đề xuất phương án: in lại / giảm giá','Thông báo khách kết quả xử lý'],
  'Sai size':['Xác nhận size lỗi với khách','Đo lại và chụp ảnh bằng chứng','Báo BP Cắt/May kiểm tra','Lên đơn sửa hoặc may lại','Gửi hàng thay thế cho khách'],
  'Lỗi in':['Chụp ảnh lỗi in (nhòe/mờ/lệch)','Báo BP In kiểm tra máy/file','Xác nhận số lượng lỗi','Đề xuất in lại hoặc bồi thường','Cập nhật kết quả cho khách'],
  'Lỗi may':['Chụp ảnh đường may lỗi','Báo BP May kiểm tra','Xác nhận có thể sửa hay may lại','Lên lịch sửa/may lại','Giao hàng lại cho khách'],
  'Lỗi ép':['Chụp ảnh lỗi ép (bong/lệch)','Báo BP Ép kiểm tra nhiệt độ/thời gian','Xác nhận phương án xử lý','Ép lại hoặc thay thế','Thông báo khách'],
  '_default':['Liên hệ khách xác nhận lỗi','Chụp ảnh/video bằng chứng','Báo trưởng phòng bộ phận lỗi','Đợi phương án bồi thường','Thông báo khách kết quả']
};
function _ltgDept(k){return LTG_DEPTS.find(function(d){return d.k===k;})||{k:k,l:k||'Chưa xác định',c:'#6b7280',bg:'#f3f4f6'};}
function _ltgStatusInfo(s){
  if(s==='resolved') return {l:'Đã XL',c:'#16a34a',bg:'#f0fdf4',icon:'🟢'};
  if(s==='in_progress') return {l:'Đang XL',c:'#d97706',bg:'#fef3c7',icon:'🟡'};
  return {l:'Chưa XL',c:'#dc2626',bg:'#fef2f2',icon:'🔴'};
}

function renderDonloinoiboPage(c){renderLoithuonggapPage(c);}
function renderLoithuonggapPage(content){
  var now=vnNow();_ltg.year=null;_ltg.month=null;_ltg.dept=null;_ltg.status=null;
  content.innerHTML='<div id="ltgRoot" style="display:flex;gap:0;min-height:calc(100vh - 80px)">'+
    '<div id="ltgSidebar" style="width:220px;min-width:220px;background:#fff;border-right:1px solid #e5e7eb;overflow-y:auto"></div>'+
    '<div id="ltgMain" style="flex:1;padding:0;overflow-x:auto;background:#fafbfc"></div></div>';
  _ltgLoadAll();
}
async function _ltgLoadAll(){
  try{
    var t=await apiCall('/api/common-errors/tree');
    _ltg.tree=t.tree||[];_ltg.totalP=t.totalPending||0;_ltg.totalIP=t.totalInProgress||0;_ltg.totalR=t.totalResolved||0;_ltg.total=t.total||0;
    _ltgRenderSidebar();
  }catch(e){console.error('[LTG] tree:',e);}
  _ltgLoadList();
}
async function _ltgLoadList(){
  try{
    var p=[];
    if(_ltg.year)p.push('year='+_ltg.year);
    if(_ltg.month)p.push('month='+_ltg.month);
    if(_ltg.dept)p.push('department='+_ltg.dept);
    if(_ltg.status)p.push('status='+_ltg.status);
    var qs=p.length?'?'+p.join('&'):'';
    var d=await apiCall('/api/common-errors/list'+qs);
    _ltg.items=d.items||[];
    _ltgRenderMain();
  }catch(e){console.error('[LTG] list:',e);}
}

function _ltgRenderSidebar(){
  var sb=document.getElementById('ltgSidebar');if(!sb)return;
  var h='<div style="padding:12px 14px;font-size:13px;font-weight:800;color:#1e293b;border-bottom:1px solid #e5e7eb;cursor:pointer;display:flex;justify-content:space-between" onclick="_ltgFilter(null,null)">'+
    '<span>Tất Cả</span><span style="background:#f59e0b;color:#fff;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:700">'+_ltg.total+'</span></div>';
  // Stats mini
  h+='<div style="padding:8px 14px;border-bottom:1px solid #f1f5f9;display:flex;gap:4px;flex-wrap:wrap">';
  h+='<span onclick="_ltgFilterStatus(\'pending\')" style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;background:#fef2f2;color:#dc2626;border:1px solid #fecaca">🔴 '+_ltg.totalP+'</span>';
  h+='<span onclick="_ltgFilterStatus(\'in_progress\')" style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;background:#fef3c7;color:#d97706;border:1px solid #fde68a">🟡 '+_ltg.totalIP+'</span>';
  h+='<span onclick="_ltgFilterStatus(\'resolved\')" style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0">🟢 '+_ltg.totalR+'</span>';
  h+='</div>';
  var years={};
  _ltg.tree.forEach(function(r){if(!years[r.year])years[r.year]=[];years[r.year].push(r);});
  Object.keys(years).sort(function(a,b){return b-a;}).forEach(function(yr){
    var ms=years[yr].sort(function(a,b){return b.month-a.month;});
    var yt=ms.reduce(function(s,m){return s+m.count;},0);
    var isO=_ltg.year==yr;
    h+='<div style="border-bottom:1px solid #f1f5f9">';
    h+='<div onclick="_ltgToggleYr(this)" style="padding:8px 14px;font-size:12px;font-weight:700;color:#374151;cursor:pointer;display:flex;align-items:center;gap:6px">';
    h+='<span class="ltg-arr" style="transition:transform .2s;transform:rotate('+(isO?'90':'0')+'deg);font-size:10px">▶</span>';
    h+='<span>Năm '+yr+'</span><span style="margin-left:auto;background:#e5e7eb;color:#374151;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:700">'+yt+'</span></div>';
    h+='<div class="ltg-mos" style="display:'+(isO?'block':'none')+'">';
    ms.forEach(function(m){
      var isA=_ltg.year==yr&&_ltg.month==m.month;
      h+='<div onclick="_ltgFilter('+yr+','+m.month+')" style="padding:6px 14px 6px 32px;font-size:12px;cursor:pointer;display:flex;justify-content:space-between;'+(isA?'background:#fff7ed;color:#ea580c;font-weight:700;border-left:3px solid #f59e0b':'color:#6b7280')+'">'+
        '<span>Tháng '+String(m.month).padStart(2,'0')+'</span>'+
        '<span style="background:'+(isA?'#f59e0b':'#e5e7eb')+';color:'+(isA?'#fff':'#374151')+';padding:1px 6px;border-radius:8px;font-size:10px;font-weight:700">'+m.count+'</span></div>';
    });
    h+='</div></div>';
  });
  sb.innerHTML=h;
}
function _ltgToggleYr(el){var m=el.nextElementSibling,a=el.querySelector('.ltg-arr');if(m.style.display==='none'){m.style.display='block';a.style.transform='rotate(90deg)';}else{m.style.display='none';a.style.transform='rotate(0deg)';}}
function _ltgFilter(yr,mo){_ltg.year=yr;_ltg.month=mo;_ltg.dept=null;_ltg.status=null;_ltgLoadAll();}
function _ltgFilterStatus(s){_ltg.status=(_ltg.status===s)?null:s;_ltgLoadList();_ltgRenderSidebar();}
function _ltgFilterDept(d){_ltg.dept=(_ltg.dept===d)?null:d;_ltgLoadList();}

function _ltgRenderMain(){
  var main=document.getElementById('ltgMain');if(!main)return;
  var items=_ltg.items;
  var title=_ltg.year&&_ltg.month?'Tháng '+_ltg.month+'/'+_ltg.year:_ltg.year?'Năm '+_ltg.year:'Tất Cả';
  // Count stats from items
  var cP=0,cI=0,cR=0;
  items.forEach(function(i){var s=i.resolution_status;if(s==='resolved')cR++;else if(s==='in_progress')cI++;else cP++;});
  var h='<div style="padding:16px">';
  // Stat cards
  h+='<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">';
  h+=_ltgStatCard('🔴','Chưa Xử Lý',cP,'#dc2626','#fef2f2','#fecaca','pending');
  h+=_ltgStatCard('🟡','Đang Xử Lý',cI,'#d97706','#fef3c7','#fde68a','in_progress');
  h+=_ltgStatCard('🟢','Đã Xử Lý',cR,'#16a34a','#f0fdf4','#bbf7d0','resolved');
  h+=_ltgStatCard('📊','Tổng Cộng',items.length,'#1e40af','#eff6ff','#bfdbfe',null);
  h+='</div>';
  // Title bar
  h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">';
  h+='<div style="font-size:15px;font-weight:800;color:#1e293b">⚠️ LỖI THƯỜNG GẶP & XỬ LÝ — '+title+' <span style="color:#9ca3af;font-weight:500;font-size:12px">('+items.length+' lỗi)</span></div>';
  h+='</div>';
  // Dept filter chips
  h+='<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">';
  h+='<span onclick="_ltgFilterDept(null)" style="padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;'+(!_ltg.dept?'background:#1e293b;color:#fff':'background:#f1f5f9;color:#64748b')+'">Tất Cả</span>';
  LTG_DEPTS.forEach(function(d){
    var isA=_ltg.dept===d.k;
    h+='<span onclick="_ltgFilterDept(\''+d.k+'\')" style="padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid '+(isA?d.c:'#e5e7eb')+';'+(isA?'background:'+d.bg+';color:'+d.c:'background:#fff;color:#64748b')+'">'+d.l+'</span>';
  });
  h+='</div>';
  // Table
  h+='<div style="overflow-x:auto;border-radius:10px;border:1px solid #e5e7eb"><table style="width:100%;border-collapse:collapse;font-size:12px;min-width:1200px">';
  h+='<thead><tr style="background:#1e3a4f">';
  ['STT','Bộ Phận','Loại Lỗi','Mã Đơn','Trạng Thái','Lặp Lại','Ngày Báo','Nội Dung','Cách XL','Người VP','XL Tháng','Hành Động'].forEach(function(c){
    h+='<th style="padding:8px 6px;text-align:left;font-size:11px;font-weight:700;color:#fff;white-space:nowrap;border-right:1px solid rgba(255,255,255,0.1)">'+c+'</th>';
  });
  h+='</tr></thead><tbody>';
  if(!items.length){h+='<tr><td colspan="12" style="padding:40px;text-align:center;color:#9ca3af">Chưa có dữ liệu lỗi</td></tr>';}
  else{
    items.forEach(function(item,idx){
      var dp=_ltgDept(item.error_department);
      var st=_ltgStatusInfo(item.resolution_status);
      var rd=item.report_date?new Date(item.report_date).toLocaleDateString('vi-VN'):'—';
      var rc=item.repeat_count||1;
      h+='<tr style="border-bottom:1px solid #f1f5f9;cursor:pointer" onmouseover="this.style.background=\'#fffbeb\'" onmouseout="this.style.background=\'\'" onclick="_ltgDetail('+item.id+')">';
      h+='<td style="padding:6px;text-align:center;color:#9ca3af;border-right:1px solid #f8fafc">'+(idx+1)+'</td>';
      h+='<td style="padding:6px;border-right:1px solid #f8fafc"><span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;color:'+dp.c+';background:'+dp.bg+';border:1px solid '+dp.c+'22">'+dp.l+'</span></td>';
      h+='<td style="padding:6px;border-right:1px solid #f8fafc;font-weight:600">'+(item.common_error_type||'—')+'</td>';
      h+='<td style="padding:6px;font-weight:700;color:#ea580c;border-right:1px solid #f8fafc">'+(item.order_code||'—')+'</td>';
      h+='<td style="padding:6px;border-right:1px solid #f8fafc"><span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;color:'+st.c+';background:'+st.bg+'">'+st.icon+' '+st.l+'</span></td>';
      h+='<td style="padding:6px;text-align:center;border-right:1px solid #f8fafc"><span style="'+(rc>1?'background:#dc2626;color:#fff;padding:1px 6px;border-radius:10px;font-size:10px;font-weight:700':'color:#9ca3af')+'">'+rc+'</span></td>';
      h+='<td style="padding:6px;white-space:nowrap;border-right:1px solid #f8fafc">'+rd+'</td>';
      h+='<td style="padding:6px;max-width:180px;overflow:hidden;text-overflow:ellipsis;border-right:1px solid #f8fafc" title="'+(item.error_content||'').replace(/"/g,'&quot;')+'">'+(item.error_content||'')+'</td>';
      h+='<td style="padding:6px;max-width:150px;overflow:hidden;text-overflow:ellipsis;border-right:1px solid #f8fafc">'+(item.sale_resolution||'')+'</td>';
      h+='<td style="padding:6px;border-right:1px solid #f8fafc">'+(item.violator_name||'')+'</td>';
      h+='<td style="padding:6px;border-right:1px solid #f8fafc">'+(item.violation_month||'')+'</td>';
      h+='<td style="padding:6px;white-space:nowrap">';
      h+='<select onchange="event.stopPropagation();_ltgChangeStatus('+item.id+',this.value)" style="padding:3px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;background:'+st.bg+'">';
      ['pending','in_progress','resolved'].forEach(function(sv){var si=_ltgStatusInfo(sv);h+='<option value="'+sv+'"'+(item.resolution_status===sv||(!item.resolution_status&&sv==='pending')?' selected':'')+'>'+si.icon+' '+si.l+'</option>';});
      h+='</select></td></tr>';
    });
  }
  h+='</tbody></table></div></div>';
  main.innerHTML=h;
}
function _ltgStatCard(icon,label,count,color,bg,border,status){
  var click=status?'onclick="_ltgFilterStatus(\''+status+'\')"':'';
  var active=_ltg.status===status?'box-shadow:0 0 0 2px '+color+';':'';
  return '<div '+click+' style="flex:1;min-width:130px;padding:14px;background:'+bg+';border:1px solid '+border+';border-radius:10px;cursor:'+(status?'pointer':'default')+';'+active+'text-align:center">'+
    '<div style="font-size:20px">'+icon+'</div>'+
    '<div style="font-size:10px;font-weight:700;color:'+color+';text-transform:uppercase;margin-top:4px">'+label+'</div>'+
    '<div style="font-size:24px;font-weight:800;color:'+color+';margin-top:2px">'+count+'</div></div>';
}

async function _ltgChangeStatus(id,status){
  try{
    var r=await apiCall('/api/common-errors/'+id+'/status','PATCH',{status:status});
    if(r.error){showToast(r.error,'error');return;}
    showToast('✅ Đã cập nhật trạng thái');
    _ltgLoadAll();
  }catch(e){showToast('Lỗi: '+e.message,'error');}
}
function _ltgDetail(id){
  var item=_ltg.items.find(function(x){return x.id===id;});
  if(!item)return;
  var dp=_ltgDept(item.error_department);
  var st=_ltgStatusInfo(item.resolution_status);
  var rd=item.report_date?new Date(item.report_date).toLocaleDateString('vi-VN'):'—';
  var rc=item.repeat_count||1;
  var imgs=[];
  try{imgs=typeof item.error_images==='string'?JSON.parse(item.error_images||'[]'):(item.error_images||[]);}catch(e){}
  var imgH=imgs.length?imgs.map(function(u){return '<img src="'+u+'" style="width:100px;height:100px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid #e5e7eb" onclick="_ltgViewImg(\''+u+'\')">';}).join(''):'<span style="color:#9ca3af">Không có hình ảnh</span>';
  var videoH=item.error_video?'<video controls style="max-width:100%;max-height:250px;border-radius:8px"><source src="'+item.error_video+'"></video>':'<span style="color:#9ca3af">Không có video</span>';
  // SOP
  var sopKey=item.common_error_type||'_default';
  var sopSteps=LTG_SOP[sopKey]||LTG_SOP['_default'];
  var sopH='';
  sopSteps.forEach(function(s,i){
    sopH+='<div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:8px">'+
      '<span style="min-width:24px;height:24px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800">'+(i+1)+'</span>'+
      '<span style="font-size:13px;color:#1e293b;padding-top:2px">'+s+'</span></div>';
  });
  var fld=function(l,v,c){return '<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:2px">'+l+'</div><div style="font-size:13px;font-weight:600;color:'+(c||'#1e293b')+'">'+(v||'—')+'</div></div>';};
  var ov=document.createElement('div');
  ov.id='ltgDetailModal';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px';
  ov.onclick=function(e){if(e.target===ov)ov.remove();};
  ov.innerHTML='<div style="background:#fff;border-radius:16px;max-width:850px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">'+
    '<div style="padding:20px 24px;background:linear-gradient(135deg,#1e3a5f,#0f2a3a);border-radius:16px 16px 0 0;display:flex;align-items:center;justify-content:space-between">'+
      '<div style="display:flex;align-items:center;gap:12px"><span style="font-size:24px">⚠️</span><div>'+
        '<div style="font-size:16px;font-weight:800;color:#fff">Chi Tiết Lỗi — '+(item.order_code||'N/A')+'</div>'+
        '<div style="font-size:12px;color:#94a3b8;margin-top:2px">'+rd+' · '+dp.l+' · '+(item.created_by_name||'')+'</div></div></div>'+
      '<div style="display:flex;align-items:center;gap:8px">'+
        '<span style="padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;color:'+dp.c+';background:'+dp.bg+'">'+dp.l+'</span>'+
        '<span style="padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;color:'+st.c+';background:'+st.bg+'">'+st.icon+' '+st.l+'</span>'+
        (rc>1?'<span style="padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;color:#fff;background:#dc2626">Lặp '+rc+' lần</span>':'')+
        '<button onclick="document.getElementById(\'ltgDetailModal\').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:8px;font-size:18px;cursor:pointer">×</button>'+
      '</div></div>'+
    '<div style="padding:24px">'+
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;padding:14px;background:#f8fafc;border-radius:10px;margin-bottom:16px">'+
        fld('Loại Lỗi',item.common_error_type)+fld('Mã Đơn',item.order_code,'#ea580c')+fld('CSKH',item.cskh_name)+
        fld('Người Vi Phạm',item.violator_name,'#dc2626')+fld('XL Tháng',item.violation_month)+fld('Phạt Tháng',item.penalty_month)+
      '</div>'+
      '<div style="margin-bottom:16px"><div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:6px">📌 Nội Dung Lỗi</div>'+
        '<div style="padding:12px;background:#fff7ed;border-radius:8px;border:1px solid #fed7aa;font-size:13px;color:#9a3412;line-height:1.5">'+(item.error_content||'—')+'</div></div>'+
      '<div style="margin-bottom:16px"><div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:6px">✅ HƯỚNG DẪN XỬ LÝ CHO SALE/KD</div>'+
        '<div style="padding:14px;background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe">'+sopH+'</div></div>'+
      '<div style="margin-bottom:16px"><div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:6px">🔧 Cách Sale Đã Xử Lý</div>'+
        '<div style="padding:12px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;font-size:13px;color:#166534">'+(item.sale_resolution||'—')+'</div></div>'+
      '<div style="margin-bottom:16px"><div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:6px">📷 Hình Ảnh</div>'+
        '<div style="display:flex;gap:8px;flex-wrap:wrap">'+imgH+'</div></div>'+
      '<div style="margin-bottom:16px"><div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:6px">🎬 Video</div>'+videoH+'</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:14px;background:#f8fafc;border-radius:10px;margin-bottom:16px">'+
        fld('Cam Kết NV Vi Phạm',item.violator_commitment)+fld('Cách Khắc Phục',item.fix_plan)+
      '</div>'+
      '<div style="padding:14px;background:#f8fafc;border-radius:10px;display:flex;align-items:center;gap:12px">'+
        '<span style="font-size:12px;font-weight:700;color:#374151">Cập Nhật Trạng Thái:</span>'+
        '<button onclick="_ltgSetStatus('+item.id+',\'pending\')" style="padding:6px 14px;border-radius:6px;font-size:11px;font-weight:700;border:1px solid #fecaca;background:#fef2f2;color:#dc2626;cursor:pointer">🔴 Chưa XL</button>'+
        '<button onclick="_ltgSetStatus('+item.id+',\'in_progress\')" style="padding:6px 14px;border-radius:6px;font-size:11px;font-weight:700;border:1px solid #fde68a;background:#fef3c7;color:#d97706;cursor:pointer">🟡 Đang XL</button>'+
        '<button onclick="_ltgSetStatus('+item.id+',\'resolved\')" style="padding:6px 14px;border-radius:6px;font-size:11px;font-weight:700;border:1px solid #bbf7d0;background:#f0fdf4;color:#16a34a;cursor:pointer">🟢 Đã XL</button>'+
      '</div>'+
    '</div></div>';
  document.body.appendChild(ov);
}
async function _ltgSetStatus(id,status){
  try{
    var r=await apiCall('/api/common-errors/'+id+'/status','PATCH',{status:status});
    if(r.error){showToast(r.error,'error');return;}
    showToast('✅ Đã cập nhật trạng thái');
    var m=document.getElementById('ltgDetailModal');if(m)m.remove();
    _ltgLoadAll();
  }catch(e){showToast('Lỗi: '+e.message,'error');}
}
function _ltgViewImg(url){
  var ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:pointer';
  ov.onclick=function(){ov.remove();};
  ov.innerHTML='<img src="'+url+'" style="max-width:90vw;max-height:90vh;border-radius:8px;box-shadow:0 10px 40px rgba(0,0,0,0.5)">';
  document.body.appendChild(ov);
}
