// ========== DAILY LINKS — UNIFIED FRONTEND ==========
const _DL_MODULES = {
    '/addcmtdoitackh':    { type:'addcmt',       label:'Add/Cmt Đối Tác KH',    icon:'👥', grad:'linear-gradient(135deg,#16a34a,#15803d)', accent:'#16a34a' },
    '/dangvideo':         { type:'dang_video',    label:'Đăng Video Isocal',      icon:'🎬', grad:'linear-gradient(135deg,#dc2626,#b91c1c)', accent:'#dc2626' },
    '/dangcontent':       { type:'dang_content',  label:'Đăng Content Isocal',    icon:'✍️', grad:'linear-gradient(135deg,#8b5cf6,#7c3aed)', accent:'#8b5cf6' },
    '/danggruop':         { type:'dang_group',    label:'Đăng & Tìm KH Group',   icon:'📢', grad:'linear-gradient(135deg,#0891b2,#0e7490)', accent:'#0891b2' },
    '/seddingcongdong':   { type:'sedding',       label:'Sedding Cộng Đồng',     icon:'🌐', grad:'linear-gradient(135deg,#ea580c,#c2410c)', accent:'#ea580c' },
    '/tuyendungsvkd':     { type:'tuyen_dung',    label:'Tuyển Dụng SV KD',      icon:'🎓', grad:'linear-gradient(135deg,#be185d,#9d174d)', accent:'#be185d' },
};

let _dl = { entries:[], stats:{}, selUser:null, selDept:null, mod:null };

function _dlInit() {
    const path = window.location.pathname;
    const cfg = _DL_MODULES[path];
    if (!cfg) return;
    _dl.mod = cfg;
    const area = document.getElementById('contentArea');
    if (!area) return;
    area.innerHTML = `
    <div style="display:flex;gap:0;min-height:calc(100vh - 60px);">
        <div id="dlSidebar" style="width:260px;min-width:260px;background:#f8fafc;border-right:1px solid #e5e7eb;padding:16px 12px;overflow-y:auto;"></div>
        <div style="flex:1;padding:20px 24px;overflow-y:auto;">
            <div id="dlStats" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;"></div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h2 style="margin:0;font-size:18px;color:#122546;">📋 Danh sách link hôm nay</h2>
                <button onclick="_dlAddModal()" style="padding:8px 20px;border:none;border-radius:8px;background:${cfg.grad};color:white;cursor:pointer;font-weight:700;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.2);">＋ Thêm Link</button>
            </div>
            <div id="dlTable"></div>
        </div>
    </div>`;
    document.getElementById('pageTitle').textContent = cfg.label;
    _dlLoadAll();
}

async function _dlLoadAll() {
    const memRes = await apiCall('/api/dailylinks/members');
    _dlRenderSidebar(memRes.departments || []);
    await _dlLoadData();
}

async function _dlLoadData() {
    const m = _dl.mod;
    let url = '/api/dailylinks/entries?module_type=' + m.type + '&date=' + _dlToday();
    if (_dl.selUser) url += '&user_id=' + _dl.selUser;
    else if (_dl.selDept) url += '&dept_id=' + _dl.selDept;
    const uid = _dl.selUser || currentUser.id;
    const [eRes, sRes] = await Promise.all([
        apiCall(url),
        apiCall('/api/dailylinks/stats?module_type=' + m.type + '&user_id=' + uid)
    ]);
    _dl.entries = eRes.entries || [];
    _dl.stats = sRes;
    _dlRenderStats();
    _dlRenderTable();
}

function _dlToday() { const n=new Date(); n.setHours(n.getHours()+7); return n.toISOString().split('T')[0]; }

function _dlRenderSidebar(depts) {
    const sb = document.getElementById('dlSidebar');
    if (!sb) return;
    const role = currentUser.role;
    if (role==='nhan_vien'||role==='part_time') { sb.style.display='none'; return; }
    const c = _dl.mod.accent;
    let h = `<div style="font-size:14px;font-weight:700;color:#122546;margin-bottom:12px;">📂 Phòng Ban / NV</div>`;
    h += `<div onclick="_dlSelAll()" style="padding:8px 12px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;margin-bottom:8px;background:${!_dl.selUser&&!_dl.selDept?c:'#f1f5f9'};color:${!_dl.selUser&&!_dl.selDept?'white':'#374151'};">📊 Tất cả</div>`;
    (depts||[]).forEach(d => {
        const dA=_dl.selDept==d.id&&!_dl.selUser;
        h+=`<div style="margin-bottom:4px;"><div onclick="_dlSelDept(${d.id})" style="padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700;color:${dA?c:'#6b7280'};text-transform:uppercase;">${d.name} (${d.members.length})</div>`;
        d.members.forEach(m=>{const a=_dl.selUser==m.id;h+=`<div onclick="_dlSelUser(${m.id})" style="padding:6px 12px 6px 24px;border-radius:6px;cursor:pointer;font-size:13px;background:${a?'#122546':'transparent'};color:${a?'white':'#374151'};font-weight:${a?'600':'400'};">${m.full_name}</div>`;});
        h+='</div>';
    });
    sb.innerHTML=h;
}

function _dlSelAll(){_dl.selUser=null;_dl.selDept=null;_dlLoadAll();}
function _dlSelDept(id){_dl.selUser=null;_dl.selDept=id;_dlLoadAll();}
function _dlSelUser(id){_dl.selUser=id;_dl.selDept=null;_dlLoadAll();}

function _dlRenderStats() {
    const s=_dl.stats, el=document.getElementById('dlStats'), m=_dl.mod;
    if(!el) return;
    el.innerHTML=[
        {l:'Hôm Nay',v:`${s.today||0}/${s.target||20}`,bg:m.grad,icon:'📊'},
        {l:'Tuần Này',v:s.week||0,bg:'linear-gradient(135deg,#f59e0b,#d97706)',icon:'📅'},
        {l:'Tháng Này',v:s.month||0,bg:'linear-gradient(135deg,#6366f1,#4f46e5)',icon:'📆'},
    ].map(c=>`<div style="flex:1;min-width:200px;background:${c.bg};border-radius:14px;padding:18px 20px;color:white;box-shadow:0 4px 15px rgba(0,0,0,0.15);"><div style="font-size:28px;margin-bottom:4px;">${c.icon}</div><div style="font-size:28px;font-weight:900;">${c.v}</div><div style="font-size:12px;opacity:0.9;font-weight:600;margin-top:2px;">${c.l}</div></div>`).join('');
}

function _dlRenderTable() {
    const el=document.getElementById('dlTable');
    if(!el) return;
    const rows=_dl.entries, today=_dlToday(), m=_dl.mod;
    if(!rows.length){el.innerHTML='<div style="text-align:center;padding:40px;color:#9ca3af;">Chưa có dữ liệu hôm nay</div>';return;}
    const showUser=!_dl.selUser&&!['nhan_vien','part_time'].includes(currentUser.role);
    let h=`<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb;">
        <th style="padding:10px 8px;text-align:center;width:50px;">STT</th>
        <th style="padding:10px 8px;">LINK</th>
        ${showUser?'<th style="padding:10px 8px;">NHÂN VIÊN</th>':''}
        <th style="padding:10px 8px;text-align:center;width:80px;">XÓA</th>
    </tr></thead><tbody>`;
    rows.forEach((r,i)=>{
        const fbShort=r.fb_link.length>60?r.fb_link.substring(0,60)+'...':r.fb_link;
        const ed=typeof r.entry_date==='string'?r.entry_date.split('T')[0]:r.entry_date;
        const canDel=(r.user_id===currentUser.id&&ed===today)||currentUser.role==='giam_doc';
        h+=`<tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:10px 8px;text-align:center;font-weight:700;color:#6b7280;">${i+1}</td>
            <td style="padding:10px 8px;"><a href="${r.fb_link}" target="_blank" style="color:${m.accent};font-weight:500;">${fbShort}</a></td>
            ${showUser?`<td style="padding:10px 8px;font-size:12px;color:#6b7280;">${r.user_name||''}</td>`:''}
            <td style="padding:10px 8px;text-align:center;">${canDel?`<button onclick="_dlDel(${r.id})" style="padding:3px 8px;border:1px solid #fecaca;border-radius:6px;background:#fff5f5;color:#dc2626;cursor:pointer;font-size:11px;">🗑️</button>`:''}</td>
        </tr>`;
    });
    h+='</tbody></table>';
    el.innerHTML=h;
}

function _dlAddModal() {
    const m=_dl.mod;
    document.getElementById('dlModal')?.remove();
    const d=document.createElement('div');d.id='dlModal';
    d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    d.onclick=e=>{if(e.target===d)d.remove();};
    d.innerHTML=`
    <div style="background:white;border-radius:16px;width:min(480px,92vw);box-shadow:0 20px 60px rgba(0,0,0,0.25);">
        <div style="background:${m.grad};padding:20px 24px;border-radius:16px 16px 0 0;color:white;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="font-size:18px;font-weight:800;">${m.icon} Thêm Link ${m.label}</div>
                <button onclick="document.getElementById('dlModal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;">×</button>
            </div>
        </div>
        <div style="padding:24px;">
            <label style="font-weight:600;font-size:13px;color:#374151;">Link <span style="color:#dc2626;">*</span></label>
            <input id="dlFLink" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;margin-top:6px;box-sizing:border-box;" placeholder="https://..." autofocus>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px;">
                <button onclick="document.getElementById('dlModal').remove()" style="padding:9px 18px;border:1px solid #d1d5db;border-radius:8px;background:white;color:#374151;cursor:pointer;font-size:13px;">Hủy</button>
                <button onclick="_dlSave()" style="padding:9px 22px;border:none;border-radius:8px;background:${m.accent};color:white;cursor:pointer;font-size:13px;font-weight:700;">💾 Lưu</button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(d);
    setTimeout(()=>document.getElementById('dlFLink')?.focus(),100);
}

async function _dlSave() {
    const link=document.getElementById('dlFLink').value.trim();
    if(!link){showToast('Vui lòng nhập link!','error');return;}
    try{
        await apiCall('/api/dailylinks/entries','POST',{fb_link:link,module_type:_dl.mod.type});
        document.getElementById('dlModal')?.remove();
        showToast('✅ Đã thêm link!');_dlLoadData();
    }catch(e){showToast(e.message||'Lỗi','error');}
}

async function _dlDel(id) {
    if(!confirm('Xóa link này?'))return;
    try{await apiCall('/api/dailylinks/entries/'+id,'DELETE');showToast('✅ Đã xóa');_dlLoadData();}
    catch(e){showToast(e.message||'Lỗi','error');}
}

// SPA Router Hook
(function(){
    const paths=Object.keys(_DL_MODULES);
    const orig=window.handleRoute;
    if(orig){window.handleRoute=function(){orig.apply(this,arguments);if(paths.includes(window.location.pathname)){_dl.selUser=null;_dl.selDept=null;_dlInit();}};}
    if(paths.includes(window.location.pathname)) setTimeout(_dlInit,100);
})();
