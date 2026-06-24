// ========== NHẬP XUẤT HOÀN VẢI — Desktop SPA ==========
var _nxhv={records:[],tree:null,filter:{tx_type:null,year:null,month:null},search:''};
var _nxhvOpen={};
var _nxhvTL={HOAN:'Hoàn',NHAP_KK:'Nhập KK',XUAT_KK:'Xuất KK',NHAP:'Nhập Vải',XUAT:'Xuất Vải'};
var _nxhvIC={HOAN:'🔄',NHAP_KK:'📥',XUAT_KK:'📤',NHAP:'📦',XUAT:'🚛'};
var _nxhvCL={HOAN:'#059669',NHAP_KK:'#7c3aed',XUAT_KK:'#ea580c',NHAP:'#2563eb',XUAT:'#dc2626'};

function renderNhapxuathoanvaiPage(content){
    var highlightId = sessionStorage.getItem('nxhv_highlight_bill');
    if (highlightId) {
        _nxhv.search = highlightId;
        sessionStorage.removeItem('nxhv_highlight_bill');
    } else {
        _nxhv.search = '';
    }
    if(!document.getElementById('_nxhvS')){var st=document.createElement('style');st.id='_nxhvS';
    st.textContent='.nxhv-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden}.nxhv-sb{width:280px;min-width:280px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto}.nxhv-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;padding:16px}.nxhv-main>*{flex-shrink:0}'
    +'.nxhv-sb-title{font-size:13px;font-weight:800;padding:16px;border-bottom:1px solid var(--gray-200);text-align:center;color:#0891b2}'
    +'.nxhv-sb-total{background:linear-gradient(135deg,#0891b2,#06b6d4);color:#fff;padding:12px 16px;font-size:12px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;align-items:center}'
    +'.nxhv-sb-type{padding:8px 16px;font-weight:800;font-size:11px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--gray-200)}'
    +'.nxhv-sb-type:hover{background:#ecfeff}'
    +'.nxhv-sb-yr{padding:6px 16px 6px 28px;font-size:11px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;border-bottom:1px solid #f0f0f0;color:#475569}'
    +'.nxhv-sb-yr:hover{background:#f0f9ff}'
    +'.nxhv-sb-mo{padding:5px 16px 5px 44px;font-size:10px;font-weight:600;cursor:pointer;display:flex;justify-content:space-between;border-bottom:1px solid #fafafa;color:#64748b}'
    +'.nxhv-sb-mo:hover{background:#ecfeff}.nxhv-sb-mo.active{background:#cffafe;color:#0891b2;font-weight:800}'
    +'.nxhv-ib{width:26px;height:26px;border-radius:6px;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:12px;transition:all .15s}'
    +'.nxhv-ib:hover{transform:scale(1.15);box-shadow:0 2px 8px rgba(0,0,0,0.12)}'
    +'.nxhv-ib.on{background:#ccfbf1;border-color:#14b8a6}'
    +'.nxhv-ib.postpone.on{background:#fef3c7;border-color:#fbbf24;color:#d97706}'
    +'.nxhv-tag{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:800;color:#fff}'
    +'.nxhv-debt{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:800}'
    +'.nxhv-debt.red{background:#fee2e2;color:#dc2626}.nxhv-debt.green{background:#d1fae5;color:#059669}'
    +'@keyframes sparkle-glow{0%{background-position:0% 50%;text-shadow:0 0 4px rgba(255,0,127,0.4),0 0 10px rgba(255,127,0,0.2)}50%{background-position:100% 50%;text-shadow:0 0 10px rgba(255,0,127,0.9),0 0 20px rgba(255,127,0,0.7),0 0 30px rgba(255,0,127,0.5)}100%{background-position:0% 50%;text-shadow:0 0 4px rgba(255,0,127,0.4),0 0 10px rgba(255,127,0,0.2)}}'
    +'.sparkle-glowing-text{font-family:\'Outfit\',\'Inter\',sans-serif;font-weight:900!important;font-size:14px!important;background:linear-gradient(120deg,#ff007f,#ff7f00,#e11d48,#ff007f);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:sparkle-glow 2s ease infinite;display:inline-block}'
    +'@media(max-width:768px){.nxhv-sb{display:none}}';
    document.head.appendChild(st);}
    var configBtnHtml = '';
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc') {
        configBtnHtml = '<button id="btnNxhvConfig" class="btn" style="padding:6px 14px;font-size:12px;font-weight:700;border-radius:8px;background:#d97706;color:#fff;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:6px" onclick="openNxhvConfigModal()">⚙️ Cấu hình lùi lịch</button>';
    }
    content.innerHTML='<div class="nxhv-wrap"><div class="nxhv-sb" id="nxhvSb"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="nxhv-main">'
    +'<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center"><div id="nxhvInfo" style="font-size:12px"></div><div id="nxhvStats" style="display:flex;gap:8px;flex:1;justify-content:center;flex-wrap:wrap"></div>' + configBtnHtml + '<button id="btnNxhvCreateReturn" class="btn btn-primary" style="padding:6px 14px;font-size:12px;font-weight:700;border-radius:8px;background:#059669;color:#fff;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:6px" onclick="openCreateReturnModal()">🔄 Tạo Hoàn Vải</button><input id="nxhvSearch" placeholder="🔍 Tìm chất liệu / màu / nguồn..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:220px;outline:none" value="' + (_nxhv.search || '') + '"></div>'
    +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:11px;white-space:nowrap" id="nxhvTable"><thead><tr style="background:var(--gray-800)">'
    +'<th style="text-align:center">STT</th><th style="text-align:center">Mã Bill Hoàn</th><th style="text-align:center">✅</th><th style="text-align:center">Ngày Hẹn Hoàn</th><th style="text-align:center">Ngày Lên Bill</th><th style="text-align:center">📸</th><th>Nghiệp Vụ</th><th>Nguồn Vải</th><th>Chất Liệu</th><th>Màu Vải</th><th>Các Cây</th><th style="text-align:right">Giá</th><th style="text-align:right">Thành Tiền</th><th style="text-align:center">Công Nợ</th><th style="text-align:right">Thanh Toán</th><th>Cập Nhật</th>'
    +'</tr></thead><tbody id="nxhvTb"><tr><td colspan="16" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div></div></div>';
    var _t;document.getElementById('nxhvSearch').addEventListener('input',function(){clearTimeout(_t);_t=setTimeout(function(){_nxhv.search=document.getElementById('nxhvSearch').value||'';_nxhvRender();},300);});
    _nxhvLoadAll();
}

async function _nxhvLoadAll(){try{var tR=await apiCall('/api/fabrictx/tree');_nxhv.tree=tR;_nxhvRenderSb();await _nxhvLoadRecs();}catch(e){console.error('[NXHV]',e);}}
function formatDateTimeHM(d) {
    if (!d) return '—';
    try {
        var date = new Date(d);
        var formatter = new Intl.DateTimeFormat('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            hour12: false
        });
        var parts = formatter.formatToParts(date);
        var hour, minute, day, month;
        parts.forEach(function(p) {
            if (p.type === 'hour') hour = p.value;
            if (p.type === 'minute') minute = p.value;
            if (p.type === 'day') day = p.value;
            if (p.type === 'month') month = p.value;
        });
        return hour + ':' + minute + ' ' + day + '/' + month;
    } catch (e) {
        return d;
    }
}
function cleanTreeDetails(details) {
    if (!details) return '—';
    var cleaned = details.replace(/\s*\([^)]+\)/g, '');
    if (cleaned.includes('Cây 27kg')) {
        return cleaned.replace(/Cây 27kg/g, '<span class="sparkle-glowing-text">Cây 27kg</span>');
    }
    return cleaned;
}
function _nxhvFD(d){if(!d)return'—';try{var p=d.split('T')[0].split('-');return p[2]+'/'+p[1]+'/'+p[0];}catch(e){return d;}}
function _nxhvFN(n){if(!n&&n!==0)return'0';return Number(n).toLocaleString('vi-VN');}

function _nxhvRenderSb(){var sb=document.getElementById('nxhvSb');if(!sb||!_nxhv.tree)return;var t=_nxhv.tree,f=_nxhv.filter;
var h='<div class="nxhv-sb-title">────── 🔄 Nhập Xuất Hoàn Vải ──────</div>';
h+='<div class="nxhv-sb-total" onclick="_nxhvFilter()"><span>📦 Tất cả</span><span style="font-size:16px;font-weight:900">'+(t.grand_total||0)+'</span></div>';
if(t.types)t.types.forEach(function(tp){var tk='t_'+tp.type,to=!!_nxhvOpen[tk],cl=_nxhvCL[tp.type]||'#0891b2';
h+='<div class="nxhv-sb-type" style="color:'+cl+'" onclick="_nxhvTgl(\''+tk+'\');_nxhvFilter(\''+tp.type+'\')"><span>'+(to?'▼':'▶')+' '+(_nxhvIC[tp.type]||'')+' '+tp.label+'</span><span style="background:'+cl+';color:#fff;padding:2px 10px;border-radius:10px;font-size:10px">'+tp.total+'</span></div>';
if(to&&tp.years)tp.years.forEach(function(yr){var yk=tk+'_'+yr.year,yo=!!_nxhvOpen[yk];
h+='<div class="nxhv-sb-yr" onclick="event.stopPropagation();_nxhvTgl(\''+yk+'\');_nxhvFilter(\''+tp.type+'\','+yr.year+')"><span>'+(yo?'▼':'▶')+' 📆 '+yr.year+'</span><span>'+yr.count+'</span></div>';
if(yo)yr.months.forEach(function(mo){var mA=f.tx_type===tp.type&&f.year==yr.year&&f.month==mo.month;
h+='<div class="nxhv-sb-mo'+(mA?' active':'')+'" onclick="event.stopPropagation();_nxhvFilter(\''+tp.type+'\','+yr.year+','+mo.month+')"><span>T'+String(mo.month).padStart(2,'0')+'/'+yr.year+'</span><span>'+mo.count+'</span></div>';
});});});sb.innerHTML=h;}

function _nxhvTgl(k){_nxhvOpen[k]=!_nxhvOpen[k];_nxhvRenderSb();}
function _nxhvFilter(type,y,m){_nxhv.filter={tx_type:type||null,year:y||null,month:m||null};_nxhvRenderSb();_nxhvLoadRecs();}

async function _nxhvLoadRecs(){var f=_nxhv.filter,qs='?_=1';
if(f.tx_type)qs+='&tx_type='+f.tx_type;if(f.year)qs+='&year='+f.year;if(f.month)qs+='&month='+f.month;
try{var res=await apiCall('/api/fabrictx/records'+qs);_nxhv.records=res.records||[];_nxhvRender();}catch(e){console.error('[NXHV]',e);}}

function _nxhvRender(){
    var all=_nxhv.records.slice();
    // Pre-calculate stable sequential numbering for HOAN bills under current sidebar filter
    var hoanMap = {};
    var hc = 0;
    for (var idx = _nxhv.records.length - 1; idx >= 0; idx--) {
        var r = _nxhv.records[idx];
        if (r.tx_type === 'HOAN') {
            hc++;
            hoanMap[r.id] = hc;
        }
    }

    if(_nxhv.search){var q=_nxhv.search.toLowerCase();all=all.filter(function(r){return(r.material_name||'').toLowerCase().indexOf(q)>=0||(r.color_name||'').toLowerCase().indexOf(q)>=0||(r.source_name||'').toLowerCase().indexOf(q)>=0||(r.id&&r.id.toString().indexOf(q)>=0);});}
    var tot=all.length,sumTA=0,sumDebt=0,sumPay=0;
    all.forEach(function(r){sumTA+=Number(r.total_amount)||0;sumDebt+=Number(r.debt)||0;sumPay+=Number(r.payment)||0;});
    var tb=document.getElementById('nxhvTb');if(!tb)return;
    if(!all.length){tb.innerHTML='<tr><td colspan="16"><div class="empty-state"><div class="icon">🔄</div><h3>Chưa có giao dịch</h3></div></td></tr>';}else{
    tb.innerHTML=all.map(function(r,i){
        var aI=r.is_approved?'✅':'⬜',aC=r.is_approved?' on':'',aA=r.is_approved?'unapprove':'approve';
        var cl=_nxhvCL[r.tx_type]||'#0891b2';
        var imgs='—';try{var ia=typeof r.bill_images==='string'?JSON.parse(r.bill_images):r.bill_images;if(ia&&ia.length)imgs='📸 '+ia.length;}catch(e){}
        var debt=Number(r.debt)||0;var dB=debt>0?'<span class="nxhv-debt red">🔴 '+_nxhvFN(debt)+'</span>':'<span class="nxhv-debt green">✅ 0</span>';
        var upd='';if(r.last_update_at){upd=_nxhvFD(r.last_update_at);if(r.last_update_by)upd+='<br><span style="color:#0891b2;font-size:9px">'+r.last_update_by+'</span>';}
        var clickHandler = r.tx_type === 'HOAN' ? ' style="cursor:pointer" onclick="if(event.target.tagName !== \'BUTTON\' && !event.target.closest(\'button\')) openViewReturnModal('+r.id+')"' : '';
        var rowStyle = r.is_canceled ? ' style="opacity: 0.65; background-color: #f1f5f9;"' : '';
        var btnHTML = '';
        if (r.is_canceled) {
            btnHTML = '<span style="color:#ef4444;font-size:10px;font-weight:700;background:#fee2e2;padding:2px 6px;border-radius:4px;white-space:nowrap">❌ Đã hủy</span>';
        } else {
            btnHTML = '<button class="nxhv-ib'+aC+'" onclick="event.stopPropagation(); _nxhvTog('+r.id+',\''+aA+'\')" title="Duyệt">'+aI+'</button>';
            if (r.tx_type === 'HOAN' && !r.is_approved) {
                var pEmoji = r.is_postponed ? '⏳' : '📅';
                var pClass = r.is_postponed ? ' postpone on' : ' postpone';
                var pTitle = r.is_postponed ? 'Đã lùi lịch hoàn vải (Xem chi tiết/Hủy)' : 'Lùi lịch hoàn vải';
                btnHTML += '<button class="nxhv-ib' + pClass + '" style="margin-left:5px" onclick="event.stopPropagation(); openPostponeModal(' + r.id + ')" title="' + pTitle + '">' + pEmoji + '</button>';
            }
        }
        
        var billHoanCode = '—';
        if (r.tx_type === 'HOAN') {
            var num = hoanMap[r.id] || 0;
            billHoanCode = 'Bill Hoàn #' + num;
        }
        
        var postponeDateStr = '—';
        if (r.tx_type === 'HOAN') {
            if (r.is_postponed && r.postponed_target_date) {
                postponeDateStr = _nxhvFD(r.postponed_target_date);
            }
        }
        
        var detailsHTML = cleanTreeDetails(r.tree_details);
        if (r.is_canceled && r.notes) {
            detailsHTML += '<br><span style="color:#ef4444;font-size:11px;font-weight:600">' + r.notes + '</span>';
        }
        return '<tr'+rowStyle+clickHandler+'><td style="text-align:center;font-weight:700;color:#94a3b8">'+(i+1)+'</td>'
        +'<td style="text-align:center;font-weight:700;color:#0f766e">'+billHoanCode+'</td>'
        +'<td style="text-align:center">'+btnHTML+'</td>'
        +'<td style="text-align:center;font-weight:700;color:#d97706">'+postponeDateStr+'</td>'
        +'<td style="font-size:10px;font-weight:600;text-align:center">'+formatDateTimeHM(r.created_at)+'</td>'
        +'<td style="text-align:center;font-size:10px">'+imgs+'</td>'
        +'<td><span class="nxhv-tag" style="background:'+cl+'">'+(_nxhvTL[r.tx_type]||r.tx_type)+'</span></td>'
        +'<td style="font-size:10px;color:#0891b2;font-weight:700">'+(r.source_name||'—')+'</td>'
        +'<td style="font-weight:600;color:#1e293b">'+(r.material_name||'—')+'</td>'
        +'<td style="font-size:10px;color:#6366f1;font-weight:600">'+(r.color_name||'—')+'</td>'
        +'<td style="font-size:13px;font-weight:800;color:#0f172a;white-space:normal;line-height:1.4">'+detailsHTML+'</td>'
        +'<td style="text-align:right;font-weight:600;color:#f59e0b">'+_nxhvFN(r.price)+'</td>'
        +'<td style="text-align:right;font-weight:800;color:#1e293b">'+_nxhvFN(r.total_amount)+'</td>'
        +'<td style="text-align:center">'+dB+'</td>'
        +'<td style="text-align:right;color:#059669;font-weight:700">'+_nxhvFN(r.payment)+'</td>'
        +'<td style="font-size:9px;color:#6b7280">'+upd+'</td></tr>';}).join('');}
    var el=document.getElementById('nxhvInfo');if(el){var lbl=_nxhv.filter.tx_type?(_nxhvTL[_nxhv.filter.tx_type]||''):'Tất cả';
    el.innerHTML='<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#0891b2,#06b6d4);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700">🔄 '+lbl+' — <span style="color:#a5f3fc;font-weight:900">'+tot+'</span> giao dịch</div>';}
    var sc=document.getElementById('nxhvStats');if(sc){
    sc.innerHTML='<div style="background:linear-gradient(135deg,#0891b2,#06b6d4);color:#fff;padding:8px 14px;border-radius:10px;min-width:90px;text-align:center"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">📦 TỔNG</div><div style="font-size:14px;font-weight:900">'+tot+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#1e293b,#334155);color:#fff;padding:8px 14px;border-radius:10px;min-width:90px;text-align:center"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">💰 THÀNH TIỀN</div><div style="font-size:12px;font-weight:900">'+_nxhvFN(sumTA)+'</div></div>'
    +'<div style="background:linear-gradient(135deg,'+(sumDebt>0?'#ef4444,#dc2626':'#059669,#10b981')+');color:#fff;padding:8px 14px;border-radius:10px;min-width:90px;text-align:center"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">📊 CÔNG NỢ</div><div style="font-size:12px;font-weight:900">'+_nxhvFN(sumDebt)+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:8px 14px;border-radius:10px;min-width:90px;text-align:center"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">✅ THANH TOÁN</div><div style="font-size:12px;font-weight:900">'+_nxhvFN(sumPay)+'</div></div>';}
}

async function _nxhvTog(id,action){
    if (action === 'approve') {
        var tx = _nxhv.records.find(function(r) { return r.id === id; });
        if (tx && tx.is_postponed) {
            if (!confirm('Giao dịch hoàn vải này đang ở trạng thái Lùi lịch. Bạn có chắc chắn muốn Duyệt giao dịch này không?')) return;
        }
    }
    try{await apiCall('/api/fabrictx/toggle/'+id,'POST',{action});showToast('✅ Cập nhật');await _nxhvLoadAll();}catch(e){showToast(e.message||'Lỗi','error');}
}

// ========== CREATE FABRIC RETURN (HOÀN VẢI) MODAL ==========
var _retSummaryData = [];
var _retStaffData = [];
var _selectedRetType = null; // null, 1, 2, or 3

async function openCreateReturnModal() {
    showToast('Đang tải dữ liệu...', 'info');
    try {
        const [sumRes, staffRes] = await Promise.all([
            apiCall('/api/khovai/summary'),
            apiCall('/api/fabrictx/staff')
        ]);
        _retSummaryData = sumRes.summary || [];
        _retStaffData = staffRes.staff || [];
        _selectedRetType = null;
        
        const isGDOrTrinh = currentUser && (
            currentUser.role === 'giam_doc' || 
            currentUser.role === 'quan_ly_cap_cao' ||
            currentUser.full_name === 'Lê Việt Trinh' || 
            currentUser.username === 'leviettrinh' ||
            currentUser.username === 'trinh.lvt'
        );
        const priceReadonlyAttr = isGDOrTrinh ? '' : 'readonly';
        const priceBgStyle = isGDOrTrinh ? 'background:#fff;' : 'background:#f1f5f9; cursor:not-allowed;';

        const bodyHTML = `
            <div class="nxhv-modal-form" style="display:flex; flex-direction:column; gap:12px; font-size:12px; color:#1e293b; text-align:left;">
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <span style="font-size:13px; font-weight:800; color:#0f766e;">📋 Chọn Cây Vải Từ Kho Vải</span>
                        <span id="nxhv_m_selection_summary" style="font-weight:700; color:#0891b2;">Đã chọn: 0 cây (0 kg)</span>
                    </div>

                    <!-- Step 1: Force type selection -->
                    <div style="margin-bottom:10px; padding:8px; background:rgba(15,118,110,0.03); border:1px dashed rgba(15,118,110,0.2); border-radius:8px;">
                        <label style="font-weight:800; display:block; margin-bottom:6px; color:#0f766e;">👉 BƯỚC 1: Chọn loại cây vải muốn hoàn trả:</label>
                        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
                            <button type="button" id="nxhv_btn_type1" class="btn btn-outline" onclick="selectRetType(1)" style="font-size:11px; padding:8px; text-align:left; border:2px solid #e2e8f0; border-radius:8px; background:#fff; font-weight:700; display:flex; flex-direction:column; gap:2px; transition:all 0.2s;">
                                <span style="font-size:12px; display:inline-flex; align-items:center; gap:4px;">🛠️ LOẠI 1</span>
                                <span style="color:#64748b; font-size:10px; font-weight:500;">CÂY NGUYÊN CẦN XỬ LÝ KHO</span>
                            </button>
                            <button type="button" id="nxhv_btn_type2" class="btn btn-outline" onclick="selectRetType(2)" style="font-size:11px; padding:8px; text-align:left; border:2px solid #e2e8f0; border-radius:8px; background:#fff; font-weight:700; display:flex; flex-direction:column; gap:2px; transition:all 0.2s;">
                                <span style="font-size:12px; display:inline-flex; align-items:center; gap:4px;">📍 Loại 2</span>
                                <span style="color:#64748b; font-size:10px; font-weight:500;">Cây nguyên đã lên kệ</span>
                            </button>
                            <button type="button" id="nxhv_btn_type3" class="btn btn-outline" onclick="selectRetType(3)" style="font-size:11px; padding:8px; text-align:left; border:2px solid #e2e8f0; border-radius:8px; background:#fff; font-weight:700; display:flex; flex-direction:column; gap:2px; transition:all 0.2s;">
                                <span style="font-size:12px; display:inline-flex; align-items:center; gap:4px;">✂️ Loại 3</span>
                                <span style="color:#64748b; font-size:10px; font-weight:500;">Cây lẻ / cắt dở</span>
                            </button>
                        </div>
                    </div>

                    <div style="margin-bottom:8px;">
                        <input type="text" id="nxhv_m_search_rolls" disabled class="form-control" placeholder="🔍 Vui lòng chọn loại cây vải trước..." style="width:100%; font-size:12px; padding:6px 10px;" />
                    </div>
                    <div id="nxhv_m_rolls_container" style="max-height:220px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; padding:10px; background:#f8fafc;">
                    </div>
                </div>
                
                <div style="border-top:1px solid #e2e8f0; margin-top:4px; padding-top:8px;">
                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:12px;">
                        <div>
                            <label style="font-weight:700; display:block; margin-bottom:4px;">Nguồn Vải (Nhà cung cấp):</label>
                            <input type="text" id="nxhv_m_source" class="form-control" readonly placeholder="Tự động chọn..." style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9;" />
                        </div>
                        <div>
                            <label style="font-weight:700; display:block; margin-bottom:4px;">Ngày Hoàn Vải:</label>
                            <input type="date" id="nxhv_m_date" class="form-control" disabled style="width:100%; font-size:12px; padding:5px 10px; background:#f1f5f9; cursor:not-allowed;" />
                        </div>
                        <div>
                            <label style="font-weight:700; display:block; margin-bottom:4px;">Nhân Viên Thực Hiện:</label>
                            <select id="nxhv_m_staff" class="form-control" disabled style="width:100%; font-size:12px; padding:5px 10px; background:#f1f5f9; cursor:not-allowed;"></select>
                        </div>
                    </div>
                    
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                        <div>
                            <label style="font-weight:700; display:block; margin-bottom:4px;">Chất Liệu:</label>
                            <input type="text" id="nxhv_m_material" class="form-control" style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9;" readonly placeholder="Tự động chọn..." />
                        </div>
                        <div>
                            <label style="font-weight:700; display:block; margin-bottom:4px;">Màu Vải:</label>
                            <input type="text" id="nxhv_m_color" class="form-control" style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9;" readonly placeholder="Tự động chọn..." />
                        </div>
                    </div>
                    
                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
                        <div>
                            <label style="font-weight:700; display:block; margin-bottom:4px;">Số Lượng:</label>
                            <input type="text" id="nxhv_m_unit" class="form-control" value="0 kg" readonly style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9;" />
                        </div>
                        <div>
                            <label style="font-weight:700; display:block; margin-bottom:4px;">Đơn Giá Hoàn:</label>
                            <input type="number" id="nxhv_m_price" class="form-control" value="0" ${priceReadonlyAttr} style="width:100%; font-size:12px; padding:6px 10px; ${priceBgStyle}" />
                        </div>
                        <div>
                            <label style="font-weight:700; display:block; margin-bottom:4px;">Thanh Toán:</label>
                            <input type="number" id="nxhv_m_payment" class="form-control" value="0" readonly style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9;" />
                        </div>
                        <div style="display:none;">
                            <label style="font-weight:700; display:block; margin-bottom:4px;">Công Nợ:</label>
                            <input type="text" id="nxhv_m_debt" class="form-control" value="0" style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9; font-weight:700; color:#dc2626;" readonly />
                        </div>
                    </div>
                    
                    <div style="display:none;">
                        <div>
                            <label style="font-weight:700; display:block; margin-bottom:4px;">Ghi Chú:</label>
                            <textarea id="nxhv_m_notes" class="form-control" placeholder="Ghi chú thêm..." style="width:100%; height:34px; resize:vertical; font-size:12px; padding:6px 10px;"></textarea>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const footerHTML = `
            <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
            <button class="btn btn-primary" id="nxhv_m_submit" style="background:#059669; border:none; color:#fff;" onclick="submitCreateReturn()">🔄 Tạo Hoàn Vải</button>
        `;
        
        openModal('🔄 Tạo Giao Dịch Hoàn Vải', bodyHTML, footerHTML);
        
        // Adjust width
        const modalContainer = document.getElementById('modalContainer');
        if (modalContainer) {
            modalContainer.style.width = '750px';
            modalContainer.style.maxWidth = '95%';
        }
        
        // Set date to today
        document.getElementById('nxhv_m_date').value = new Date().toLocaleDateString('en-CA');
        
        // Populate Staff
        const staffSelect = document.getElementById('nxhv_m_staff');
        staffSelect.innerHTML = _retStaffData.map(u => `<option value="${u.id}" ${currentUser && u.id === currentUser.id ? 'selected' : ''}>${u.full_name}</option>`).join('');
        
        // Render rolls list (shows placeholder initially)
        renderAllRollsList();
        
        // Bind search
        document.getElementById('nxhv_m_search_rolls').addEventListener('input', function() {
            renderAllRollsList(this.value);
        });
        
        document.getElementById('nxhv_m_price').addEventListener('input', updateFinValues);
        document.getElementById('nxhv_m_payment').addEventListener('input', function() {
            this.dataset.userEdited = '1';
            updateFinValues();
        });
        
    } catch (e) {
        showToast('Lỗi khi tải dữ liệu: ' + e.message, 'error');
    }
}

function selectRetType(type) {
    const container = document.getElementById('nxhv_m_rolls_container');
    const checked = container ? container.querySelectorAll('.nxhv-roll-cb:checked') : [];
    if (checked.length > 0 && _selectedRetType !== type) {
        showToast('⚠️ Bạn đang có cây vải được tích chọn. Hãy bỏ chọn chúng trước khi đổi loại cây vải hoàn!', 'warning');
        return;
    }
    
    _selectedRetType = type;
    
    // Update button active styles
    for (let i = 1; i <= 3; i++) {
        const btn = document.getElementById(`nxhv_btn_type${i}`);
        if (!btn) continue;
        if (i === type) {
            btn.style.borderColor = '#0f766e';
            btn.style.background = '#ecfeff';
            btn.style.color = '#0f766e';
            btn.style.boxShadow = '0 0 0 2px rgba(15, 118, 110, 0.2)';
        } else {
            btn.style.borderColor = '#e2e8f0';
            btn.style.background = '#fff';
            btn.style.color = '';
            btn.style.boxShadow = '';
        }
    }
    
    const searchInput = document.getElementById('nxhv_m_search_rolls');
    if (searchInput) {
        searchInput.disabled = false;
        searchInput.placeholder = '🔍 Tìm nhanh cây vải (chất liệu, màu, mã cây...)';
    }
    
    renderAllRollsList(searchInput ? searchInput.value : '');
}

function renderAllRollsList(searchTerm = '') {
    const container = document.getElementById('nxhv_m_rolls_container');
    if (!container) return;
    
    if (_selectedRetType === null) {
        container.innerHTML = '<div style="text-align:center; color:#64748b; padding:30px 10px; font-weight:600; font-size:12px;">⚠️ Vui lòng chọn 1 trong 3 loại cây vải phía trên để hiển thị danh sách cây cần hoàn trả.</div>';
        return;
    }
    
    const term = searchTerm.toLowerCase().trim();
    let checkedMatColor = null;
    
    const activeCbs = container.querySelectorAll('.nxhv-roll-cb:checked');
    if (activeCbs.length > 0) {
        checkedMatColor = activeCbs[0].getAttribute('data-matcolor');
    }
    
    let html = '';
    _retSummaryData.forEach(colorObj => {
        const matColorKey = `${colorObj.material_name} - ${colorObj.color_name}`;
        const rolls = colorObj.roll_weights || [];
        
        let filtered = [];
        let groupTitle = '';
        let groupColor = '';
        
        if (_selectedRetType === 1) {
            filtered = rolls.filter(r => {
                const isNguyen = Number(r.w) >= Number(r.ow);
                const rollLoc = (r.loc || '').trim();
                const isUnassigned = !rollLoc || rollLoc === 'Chưa Phân Vị Trí Cây Nguyên' || rollLoc === 'Chưa xếp kệ' || rollLoc === 'Chưa xếp vị trí';
                const isFree = !r.locked_by_cutting_id && !r.active_cut && (!r.active_reservations || r.active_reservations.length === 0);
                return isNguyen && isUnassigned && isFree;
            });
            groupTitle = '🛠️ 1. CÂY NGUYÊN CẦN XỬ LÝ KHO';
            groupColor = '#ef4444';
        } else if (_selectedRetType === 2) {
            filtered = rolls.filter(r => {
                const isNguyen = Number(r.w) >= Number(r.ow);
                const rollLoc = (r.loc || '').trim();
                const isOnShelf = rollLoc !== '' && rollLoc !== 'Chưa Phân Vị Trí Cây Nguyên' && rollLoc !== 'Chưa xếp kệ' && rollLoc !== 'Chưa xếp vị trí';
                const isFree = !r.locked_by_cutting_id && !r.active_cut && (!r.active_reservations || r.active_reservations.length === 0);
                return isNguyen && isOnShelf && isFree;
            });
            groupTitle = '📍 2. CÂY NGUYÊN Ở CÁC KỆ';
            groupColor = '#3b82f6';
        } else if (_selectedRetType === 3) {
            filtered = rolls.filter(r => {
                const isLe = Number(r.w) < Number(r.ow);
                const isFree = !r.locked_by_cutting_id && !r.active_cut && (!r.active_reservations || r.active_reservations.length === 0);
                return isLe && isFree;
            });
            groupTitle = '✂️ 3. CÁC CÂY LẺ Ở KHO VẢI';
            groupColor = '#f59e0b';
        }
        
        if (term) {
            const matchesHeader = matColorKey.toLowerCase().indexOf(term) >= 0;
            if (!matchesHeader) {
                filtered = filtered.filter(r => (r.code || '').toLowerCase().indexOf(term) >= 0 || String(r.w).indexOf(term) >= 0);
            }
        }
        
        const total = filtered.length;
        if (total === 0) return;
        
        const isDisabled = checkedMatColor && checkedMatColor !== matColorKey;
        
        html += `
            <div class="mat-color-group" style="margin-bottom:12px; border:1px solid #cbd5e1; border-radius:8px; background:#fff; overflow:hidden; opacity:${isDisabled ? 0.5 : 1};">
                <div style="background:#e2e8f0; padding:6px 12px; font-weight:800; font-size:11px; color:#0f766e; display:flex; justify-content:space-between; align-items:center;">
                    <span>🎨 ${matColorKey}</span>
                    <span style="background:#0f766e; color:#fff; padding:1px 6px; border-radius:10px; font-size:9px;">${total} cây khả dụng</span>
                </div>
                <div style="padding:8px; display:flex; flex-direction:column; gap:6px;">
        `;
        
        html += `
                <div>
                    <div style="display:flex; flex-direction:column; gap:3px;">
                        ${filtered.map(r => {
                            const shelf = _selectedRetType === 1 
                                ? (r.loc ? `Kệ ${r.loc}` : '⚠️ Chưa xếp kệ') 
                                : (r.loc ? `📍 Kệ ${r.loc}` : '⚠️ Chưa xếp kệ');
                            const photoBadge = r.needs_photo ? `<span style="background:#fee2e2; color:#dc2626; padding:1px 4px; border-radius:4px; font-size:8px; font-weight:700; margin-left:4px;">📷 Cần ảnh</span>` : '';
                            const isChecked = activeCbs && Array.from(activeCbs).some(cb => cb.value == r.id);
                            return `
                                <label style="display:flex; align-items:center; gap:8px; padding:5px 8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; cursor:${isDisabled ? 'not-allowed' : 'pointer'}; margin-bottom:0;">
                                    <input type="checkbox" class="nxhv-roll-cb" value="${r.id}" 
                                        data-weight="${r.w}" 
                                        data-code="${r.code || ''}" 
                                        data-matcolor="${matColorKey}"
                                        data-material="${colorObj.material_name}"
                                        data-color="${colorObj.color_name}"
                                        data-price="${r.import_price || colorObj.price || 0}"
                                        data-unit="${colorObj.unit || 'kg'}"
                                        data-source="${r.source_name || ''}"
                                        ${isChecked ? 'checked' : ''} 
                                        ${isDisabled ? 'disabled' : ''}
                                        style="width:14px; height:14px; accent-color:#059669;" />
                                    <div style="flex:1; display:flex; justify-content:space-between; align-items:center;">
                                        <div>
                                            ${r.source_import_id ? `
                                                <strong style="color:#4f46e5; text-decoration:underline; cursor:pointer;" onclick="event.preventDefault(); event.stopPropagation(); _nxhvOpenImportBill(${r.source_import_id})">${r.w} kg</strong> 
                                                <span style="color:#4f46e5; font-size:10px; margin-left:6px; text-decoration:underline; cursor:pointer;" onclick="event.preventDefault(); event.stopPropagation(); _nxhvOpenImportBill(${r.source_import_id})">(${r.code || 'Chưa có mã'})</span>
                                            ` : `
                                                <strong style="color:#0f766e;">${r.w} kg</strong> 
                                                <span style="color:#64748b; font-size:10px; margin-left:6px;">(${r.code || 'Chưa có mã'})</span>
                                            `}
                                            ${photoBadge}
                                        </div>
                                        <div style="color:#475569; font-size:10px; font-weight:600;">${shelf}</div>
                                    </div>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
        `;
        
        html += `
                </div>
            </div>
        `;
    });
    
    // Preserve checked state
    const savedChecked = Array.from(activeCbs).map(cb => cb.value);
    
    container.innerHTML = html || '<div style="text-align:center; color:#94a3b8; padding:20px;">Không tìm thấy cây vải phù hợp.</div>';
    
    // Restore checkboxes checked state
    savedChecked.forEach(val => {
        const cb = container.querySelector(`.nxhv-roll-cb[value="${val}"]`);
        if (cb) cb.checked = true;
    });
    
    // Bind change listener
    container.querySelectorAll('.nxhv-roll-cb').forEach(cb => {
        cb.addEventListener('change', function() {
            const allChecked = container.querySelectorAll('.nxhv-roll-cb:checked');
            if (allChecked.length > 0) {
                const first = allChecked[0];
                document.getElementById('nxhv_m_material').value = first.getAttribute('data-material');
                document.getElementById('nxhv_m_color').value = first.getAttribute('data-color');
                document.getElementById('nxhv_m_source').value = first.getAttribute('data-source') || '';
                
                const priceInput = document.getElementById('nxhv_m_price');
                priceInput.value = first.getAttribute('data-price');
            } else {
                document.getElementById('nxhv_m_material').value = '';
                document.getElementById('nxhv_m_color').value = '';
                document.getElementById('nxhv_m_price').value = '0';
                document.getElementById('nxhv_m_source').value = '';
            }
            
            renderAllRollsList(document.getElementById('nxhv_m_search_rolls').value);
            updateFinValues();
        });
    });
}

function updateFinValues() {
    const cbs = document.querySelectorAll('.nxhv-roll-cb:checked');
    let totalWeight = 0;
    cbs.forEach(cb => {
        totalWeight += Number(cb.getAttribute('data-weight')) || 0;
    });
    totalWeight = Math.round(totalWeight * 100) / 100;
    document.getElementById('nxhv_m_selection_summary').textContent = `Đã chọn: ${cbs.length} cây (${totalWeight} kg)`;
    
    const price = Number(document.getElementById('nxhv_m_price').value) || 0;
    const totalAmount = totalWeight * price;
    const paymentInput = document.getElementById('nxhv_m_payment');
    paymentInput.value = totalAmount;
    const payment = Number(paymentInput.value) || 0;
    const debt = Math.max(0, totalAmount - payment);
    document.getElementById('nxhv_m_debt').value = debt.toLocaleString('vi-VN');
    
    const first = cbs[0];
    const baseUnit = first ? (first.getAttribute('data-unit') || 'kg') : 'kg';
    document.getElementById('nxhv_m_unit').value = cbs.length > 0 ? `${totalWeight} ${baseUnit}` : `0 ${baseUnit}`;
}

async function submitCreateReturn() {
    const source = document.getElementById('nxhv_m_source').value.trim();
    const txDate = document.getElementById('nxhv_m_date').value;
    const staffId = document.getElementById('nxhv_m_staff').value;
    const material = document.getElementById('nxhv_m_material').value;
    const color = document.getElementById('nxhv_m_color').value;
    const firstCb = document.querySelector('.nxhv-roll-cb:checked');
    const unit = firstCb ? (firstCb.getAttribute('data-unit') || 'kg') : 'kg';
    const price = Number(document.getElementById('nxhv_m_price').value) || 0;
    const payment = Number(document.getElementById('nxhv_m_payment').value) || 0;
    const notes = document.getElementById('nxhv_m_notes').value.trim();
    
    const cbs = document.querySelectorAll('.nxhv-roll-cb:checked');
    if (!source) { showToast('Vui lòng nhập nguồn vải (nhà cung cấp)', 'error'); return; }
    if (!txDate) { showToast('Vui lòng chọn ngày hoàn vải', 'error'); return; }
    if (!material || !color) { showToast('Vui lòng chọn ít nhất một cây vải từ danh sách để tự động điền chất liệu và màu vải', 'error'); return; }
    if (cbs.length === 0) { showToast('Vui lòng chọn ít nhất một cây vải để hoàn trả', 'error'); return; }
    
    let totalWeight = 0;
    let detailsArray = [];
    const rollIds = [];
    cbs.forEach(cb => {
        const w = Number(cb.getAttribute('data-weight')) || 0;
        const c = cb.getAttribute('data-code') || '';
        totalWeight += w;
        detailsArray.push(`Cây ${w}kg`);
        rollIds.push(Number(cb.value));
    });
    totalWeight = Math.round(totalWeight * 100) / 100;
    const totalAmount = totalWeight * price;
    const debt = Math.max(0, totalAmount - payment);
    
    const submitBtn = document.getElementById('nxhv_m_submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang xử lý...';
    
    try {
        const res = await apiCall('/api/fabrictx/records', 'POST', {
            tx_type: 'HOAN',
            tx_date: txDate,
            source_name: source,
            staff_id: Number(staffId),
            material_name: material,
            color_name: color,
            unit: unit,
            tree_details: detailsArray.join(', '),
            tree_count: cbs.length,
            total_quantity: totalWeight,
            price: price,
            payment: payment,
            debt: debt,
            notes: notes
        });
        
        if (res.error) throw new Error(res.error);
        const newTxId = res.id;
        
        const fileInput = document.getElementById('nxhv_m_files');
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            for (const file of fileInput.files) {
                const formData = new FormData();
                formData.append('file', file);
                await apiCall('/api/fabrictx/upload/' + newTxId, 'POST', formData);
            }
        }
        
        await Promise.all(rollIds.map(id => apiCall('/api/khovai/rolls/' + id, 'PUT', { return_tx_id: newTxId, location: '📍 Kệ Dự Định Hoàn Vải' })));
        
        showToast('Tạo giao dịch hoàn vải thành công!');
        closeModal();
        _nxhvLoadAll();
    } catch (e) {
        showToast('Lỗi: ' + e.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = '🔄 Tạo Hoàn Vải';
    }
}

window.openCreateReturnModal = openCreateReturnModal;
window.submitCreateReturn = submitCreateReturn;
window.updateFinValues = updateFinValues;
window.selectRetType = selectRetType;

function openViewReturnModal(id) {
    const r = _nxhv.records.find(item => item.id === id);
    if (!r) {
        showToast('Không tìm thấy giao dịch', 'error');
        return;
    }
    
    let formattedDate = '';
    if (r.tx_date) {
        try {
            const p = r.tx_date.split('T')[0].split('-');
            formattedDate = p[2] + '/' + p[1] + '/' + p[0];
        } catch (e) {
            formattedDate = r.tx_date;
        }
    }
    
    const rollsArr = (r.tree_details || '').split(',').map(s => s.trim()).filter(Boolean);
    const rollsHtml = rollsArr.map(rollStr => {
        var cleanRoll = rollStr.replace(/\s*\([^)]+\)/g, '');
        return `
            <label style="display:flex; align-items:center; gap:8px; padding:6px 10px; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:6px; font-weight:700; color:#0f766e; margin-bottom:0;">
                <input type="checkbox" checked disabled style="width:14px; height:14px; accent-color:#059669;" />
                <span style="color:#0f766e; font-size:12px;">${cleanRoll}</span>
            </label>
        `;
    }).join('');

    let imgsHTML = '';
    try {
        const ia = typeof r.bill_images === 'string' ? JSON.parse(r.bill_images) : r.bill_images;
        if (ia && ia.length) {
            imgsHTML = `
                <div style="border-top:1px solid #e2e8f0; margin-top:12px; padding-top:8px;">
                    <label style="font-weight:700; display:block; margin-bottom:6px;">📸 Ảnh Hóa Đơn / Bill Hoàn:</label>
                    <div style="display:flex; gap:10px; flex-wrap:wrap;">
                        ${ia.map(url => `
                            <a href="${url}" target="_blank">
                                <img src="${url}" style="width:100px; height:100px; object-fit:cover; border-radius:6px; border:1px solid #cbd5e1;" />
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    } catch (e) {}

    const bodyHTML = `
        <div class="nxhv-modal-form" style="display:flex; flex-direction:column; gap:12px; font-size:12px; color:#1e293b; text-align:left;">
            <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <span style="font-size:13px; font-weight:800; color:#0f766e;">📋 Cây Vải Trả Hoàn</span>
                    <span style="font-weight:700; color:#0891b2;">Đã chọn: ${rollsArr.length} cây (${_nxhvFN(r.total_quantity)} ${r.unit || 'kg'})</span>
                </div>
                <div id="nxhv_m_rolls_container_view" style="max-height:220px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; padding:10px; background:#f8fafc; display:flex; flex-direction:column; gap:6px;">
                    ${rollsHtml}
                </div>
            </div>
            
            <div style="border-top:1px solid #e2e8f0; margin-top:4px; padding-top:8px;">
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:12px;">
                    <div>
                        <label style="font-weight:700; display:block; margin-bottom:4px;">Nguồn Vải (Nhà cung cấp):</label>
                        <input type="text" value="${r.source_name || ''}" class="form-control" readonly style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9; cursor:not-allowed;" />
                    </div>
                    <div>
                        <label style="font-weight:700; display:block; margin-bottom:4px;">Ngày Hoàn Vải:</label>
                        <input type="text" value="${formattedDate}" class="form-control" readonly style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9; cursor:not-allowed;" />
                    </div>
                    <div>
                        <label style="font-weight:700; display:block; margin-bottom:4px;">Nhân Viên Thực Hiện:</label>
                        <input type="text" value="${r.staff_name || ''}" class="form-control" readonly style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9; cursor:not-allowed;" />
                    </div>
                </div>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                    <div>
                        <label style="font-weight:700; display:block; margin-bottom:4px;">Chất Liệu:</label>
                        <input type="text" value="${r.material_name || ''}" class="form-control" readonly style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9; cursor:not-allowed;" />
                    </div>
                    <div>
                        <label style="font-weight:700; display:block; margin-bottom:4px;">Màu Vải:</label>
                        <input type="text" value="${r.color_name || ''}" class="form-control" readonly style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9; cursor:not-allowed;" />
                    </div>
                </div>
                
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
                    <div>
                        <label style="font-weight:700; display:block; margin-bottom:4px;">Số Lượng:</label>
                        <input type="text" value="${_nxhvFN(r.total_quantity)} ${r.unit || 'kg'}" class="form-control" readonly style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9; cursor:not-allowed;" />
                    </div>
                    <div>
                        <label style="font-weight:700; display:block; margin-bottom:4px;">Đơn Giá Hoàn:</label>
                        <input type="text" value="${_nxhvFN(r.price)}" class="form-control" readonly style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9; cursor:not-allowed;" />
                    </div>
                    <div>
                        <label style="font-weight:700; display:block; margin-bottom:4px;">Thanh Toán:</label>
                        <input type="text" value="${_nxhvFN(r.payment)}" class="form-control" readonly style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9; cursor:not-allowed;" />
                    </div>
                </div>
                ${imgsHTML}
            </div>
        </div>
    `;
    
    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
    `;
    
    openModal('🔄 Chi Tiết Giao Dịch Hoàn Vải', bodyHTML, footerHTML);
    
    const modalContainer = document.getElementById('modalContainer');
    if (modalContainer) {
        modalContainer.style.width = '750px';
        modalContainer.style.maxWidth = '95%';
    }
}
window.openViewReturnModal = openViewReturnModal;

function _nxhvOpenImportBill(importId) {
    if (!importId) {
        showToast('Cây vải này không có hóa đơn nhập gốc.', 'info');
        return;
    }
    if (typeof _bnhFabDetail === 'function') {
        _bnhFabDetail(importId);
    } else {
        var s = document.createElement('script');
        s.src = '/js/pages/fab-import-v4.js?v=' + Date.now();
        s.onload = function() {
            _bnhFabDetail(importId);
        };
        document.head.appendChild(s);
    }
}
window._nxhvOpenImportBill = _nxhvOpenImportBill;

// ========== POSTPONE RETURN MODAL FUNCTIONS ==========
var _postponeImageBlob = null;
var _postponePasteHandler = null;

function processAndPreviewPostponeImage(file) {
    var reader = new FileReader();
    reader.onload = function(event) {
        var img = new Image();
        img.onload = function() {
            var canvas = document.createElement('canvas');
            var max_width = 800;
            var width = img.width;
            var height = img.height;
            if (width > max_width) {
                height = Math.round((height * max_width) / width);
                width = max_width;
            }
            canvas.width = width;
            canvas.height = height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(function(blob) {
                _postponeImageBlob = blob;
                var previewUrl = URL.createObjectURL(blob);
                var imgEl = document.getElementById('postponeImagePreview');
                var placeholderEl = document.getElementById('postponePastePlaceholder');
                var wrapEl = document.getElementById('postponeImgPreviewWrap');
                var pasteArea = document.getElementById('postponePasteArea');
                if (imgEl && pasteArea) {
                    imgEl.src = previewUrl;
                    if (placeholderEl) placeholderEl.style.display = 'none';
                    if (wrapEl) wrapEl.style.display = 'flex';
                    pasteArea.style.borderColor = '#10b981';
                    var btn = document.getElementById('btnConfirmPostpone');
                    if (btn) btn.disabled = false;
                }
            }, 'image/webp', 0.75);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function clearPostponeImage() {
    _postponeImageBlob = null;
    var imgEl = document.getElementById('postponeImagePreview');
    var placeholderEl = document.getElementById('postponePastePlaceholder');
    var wrapEl = document.getElementById('postponeImgPreviewWrap');
    var pasteArea = document.getElementById('postponePasteArea');
    if (imgEl) imgEl.src = '';
    if (placeholderEl) placeholderEl.style.display = 'block';
    if (wrapEl) wrapEl.style.display = 'none';
    if (pasteArea) pasteArea.style.borderColor = '#cbd5e1';
    var btn = document.getElementById('btnConfirmPostpone');
    if (btn) btn.disabled = true;
    var fileInput = document.getElementById('postponeFileInput');
    if (fileInput) fileInput.value = '';
}
window.clearPostponeImage = clearPostponeImage;

var _postponeHolidays = [];
var _calCurrentYear = new Date().getFullYear();
var _calCurrentMonth = new Date().getMonth();
var _calSelectedDate = '';
var _calAllowedDates = [];

function getAllowedPostponeDates(maxDays, holidays) {
    var list = [];
    var current = new Date(); // Start from today
    var count = 0;
    var safetyLimit = 100;
    while (count < maxDays && safetyLimit > 0) {
        safetyLimit--;
        current.setDate(current.getDate() + 1);
        
        var y = current.getFullYear();
        var m = String(current.getMonth() + 1).padStart(2, '0');
        var d = String(current.getDate()).padStart(2, '0');
        var dateStr = y + '-' + m + '-' + d;
        
        // Sunday check
        if (current.getDay() === 0) {
            continue;
        }
        
        // Holiday check
        var isHoliday = holidays.some(function(h) {
            return h.holiday_date === dateStr;
        });
        if (isHoliday) {
            continue;
        }
        
        list.push({
            dateStr: dateStr,
            dateObj: new Date(current.getTime()),
            holidayName: holidays.find(function(h) { return h.holiday_date === dateStr; })?.holiday_name || null
        });
        count++;
    }
    return list;
}

function initCustomCalendar(maxDays, holidays) {
    _calAllowedDates = getAllowedPostponeDates(maxDays, holidays);
    
    var now = new Date();
    _calCurrentYear = now.getFullYear();
    _calCurrentMonth = now.getMonth();
    _calSelectedDate = '';
    
    renderCustomCalendar();
    
    setTimeout(function() {
        var prevBtn = document.getElementById('calPrevMonth');
        var nextBtn = document.getElementById('calNextMonth');
        if (prevBtn) {
            prevBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (_calCurrentMonth === 0) {
                    _calCurrentMonth = 11;
                    _calCurrentYear--;
                } else {
                    _calCurrentMonth--;
                }
                renderCustomCalendar();
            };
        }
        if (nextBtn) {
            nextBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (_calCurrentMonth === 11) {
                    _calCurrentMonth = 0;
                    _calCurrentYear++;
                } else {
                    _calCurrentMonth++;
                }
                renderCustomCalendar();
            };
        }
    }, 50);
}

function renderCustomCalendar() {
    var monthYearText = document.getElementById('calMonthYear');
    if (monthYearText) {
        monthYearText.textContent = 'Tháng ' + (_calCurrentMonth + 1) + ' / ' + _calCurrentYear;
    }
    
    var grid = document.getElementById('calDaysGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    var firstDay = new Date(_calCurrentYear, _calCurrentMonth, 1);
    var startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    var totalDays = new Date(_calCurrentYear, _calCurrentMonth + 1, 0).getDate();
    
    for (var i = 0; i < startOffset; i++) {
        var blank = document.createElement('div');
        grid.appendChild(blank);
    }
    
    for (var day = 1; day <= totalDays; day++) {
        var dayDiv = document.createElement('div');
        dayDiv.style.padding = '8px 4px';
        dayDiv.style.borderRadius = '8px';
        dayDiv.style.fontWeight = '700';
        dayDiv.style.display = 'flex';
        dayDiv.style.flexDirection = 'column';
        dayDiv.style.alignItems = 'center';
        dayDiv.style.justifyContent = 'center';
        dayDiv.style.position = 'relative';
        dayDiv.style.fontSize = '12px';
        dayDiv.style.transition = 'all 0.15s ease';
        
        var dateStr = _calCurrentYear + '-' + String(_calCurrentMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        
        var allowedInfo = _calAllowedDates.find(function(item) {
            return item.dateStr === dateStr;
        });
        
        var dateObj = new Date(_calCurrentYear, _calCurrentMonth, day);
        var isSunday = dateObj.getDay() === 0;
        
        dayDiv.textContent = day;
        
        if (allowedInfo) {
            dayDiv.style.cursor = 'pointer';
            dayDiv.style.color = '#1e293b';
            dayDiv.style.background = '#f1f5f9';
            dayDiv.style.border = '1px solid #cbd5e1';
            dayDiv.title = 'Có thể lùi lịch đến ngày này';
            
            dayDiv.onmouseover = function() {
                if (this.dataset.selected !== 'true') {
                    this.style.background = '#e2e8f0';
                    this.style.borderColor = '#94a3b8';
                }
            };
            dayDiv.onmouseout = function() {
                if (this.dataset.selected !== 'true') {
                    this.style.background = '#f1f5f9';
                    this.style.borderColor = '#cbd5e1';
                }
            };
            
            dayDiv.onclick = (function(dStr) {
                return function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    _calSelectedDate = dStr;
                    var hiddenInput = document.getElementById('postponeDate');
                    if (hiddenInput) hiddenInput.value = dStr;
                    renderCustomCalendar();
                };
            })(dateStr);
            
            if (_calSelectedDate === dateStr) {
                dayDiv.dataset.selected = 'true';
                dayDiv.style.background = '#d97706';
                dayDiv.style.borderColor = '#d97706';
                dayDiv.style.color = '#ffffff';
                dayDiv.style.fontWeight = '800';
                dayDiv.style.boxShadow = '0 2px 6px rgba(217,119,6,0.3)';
            }
        } else {
            dayDiv.style.color = '#cbd5e1';
            dayDiv.style.cursor = 'not-allowed';
            dayDiv.style.background = '#f8fafc';
            dayDiv.style.border = '1px solid #f1f5f9';
            
            if (isSunday) {
                dayDiv.style.color = '#fca5a5';
                dayDiv.style.background = '#fef2f2';
                dayDiv.title = 'Chủ Nhật (Không được chọn)';
            }
            
            var holiday = _postponeHolidays.find(function(h) { return h.holiday_date === dateStr; });
            if (holiday) {
                dayDiv.style.color = '#fde047';
                dayDiv.style.background = '#fef9c3';
                dayDiv.style.textDecoration = 'line-through';
                dayDiv.title = 'Ngày nghỉ lễ: ' + holiday.holiday_name;
            }
        }
        grid.appendChild(dayDiv);
    }
}

async function openNxhvConfigModal() {
    try {
        var res = await apiCall('/api/fabrictx/config');
        var maxDays = res.max_postpone_days || 3;
        
        var bodyHTML = '<div class="nxhv-modal-form" style="display:flex; flex-direction:column; gap:12px; font-size:12px; color:#1e293b; text-align:left;">' +
            '<div style="background:#fffbeb; border:1px solid #fcd34d; border-radius:8px; padding:10px; color:#b45309; line-height:1.4;">' +
                'ℹ️ Cấu hình số ngày hẹn hoàn vải tối đa được phép lùi lịch. Các ngày nghỉ lễ và ngày Chủ Nhật sẽ tự động bị bỏ qua (không tính vào thời hạn này).' +
            '</div>' +
            '<div style="margin-top:4px;">' +
                '<label style="font-weight:700; display:block; margin-bottom:4px;">Số ngày hẹn lùi lịch tối đa:</label>' +
                '<input type="number" id="cfgMaxPostponeDays" class="form-control" min="1" max="30" value="' + maxDays + '" style="width:100%; font-size:12px; padding:6px 10px; border-radius:6px; border:1px solid #cbd5e1; outline:none;" />' +
            '</div>' +
        '</div>';
        
        var footerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>' +
            '<button class="btn btn-primary" onclick="submitNxhvConfig()" style="width:auto; font-weight:700; background:#d97706; border:none; color:#fff;">Lưu cấu hình</button>';
            
        openModal('⚙️ Cấu Hình Lùi Lịch Hoàn Vải', bodyHTML, footerHTML);
    } catch(e) {
        showToast('Không tải được cấu hình: ' + e.message, 'error');
    }
}
window.openNxhvConfigModal = openNxhvConfigModal;

async function submitNxhvConfig() {
    var maxDays = parseInt(document.getElementById('cfgMaxPostponeDays').value);
    if (isNaN(maxDays) || maxDays < 1 || maxDays > 30) {
        showToast('Vui lòng nhập số ngày từ 1 đến 30', 'warning');
        return;
    }
    try {
        var res = await apiCall('/api/fabrictx/config', 'POST', { max_postpone_days: maxDays });
        if (res.error) throw new Error(res.error);
        showToast('✅ Đã lưu cấu hình thời gian hẹn hoàn vải');
        closeModal();
    } catch(e) {
        showToast('Lỗi lưu cấu hình: ' + e.message, 'error');
    }
}
window.submitNxhvConfig = submitNxhvConfig;

async function openPostponeModal(id) {
    var tx = _nxhv.records.find(function(item) { return item.id === id; });
    if (!tx) {
        showToast('Không tìm thấy giao dịch', 'error');
        return;
    }
    
    // Clean up any old listener
    if (_postponePasteHandler) {
        document.removeEventListener('paste', _postponePasteHandler);
        _postponePasteHandler = null;
    }
    
    _postponeImageBlob = null;
    _postponeHolidays = [];
    
    try {
        var res = await apiCall('/api/penalty/holidays');
        _postponeHolidays = res.holidays || [];
    } catch(e) {
        console.error('Failed to load holidays:', e);
    }
    
    var maxDays = 3;
    try {
        var cfgRes = await apiCall('/api/fabrictx/config');
        if (cfgRes && cfgRes.max_postpone_days) {
            maxDays = cfgRes.max_postpone_days;
        }
    } catch(e) {
        console.error('Failed to load max postpone days config:', e);
    }
    
    if (tx.is_postponed) {
        // CASE: Already postponed - show detail & option to unpostpone
        var dateStr = '—';
        if (tx.postponed_at) {
            dateStr = formatDateTimeHM(tx.postponed_at);
        }
        
        var targetDateStr = '—';
        if (tx.postponed_target_date) {
            var tParts = tx.postponed_target_date.split('T')[0].split('-');
            targetDateStr = tParts[2] + '/' + tParts[1] + '/' + tParts[0];
        }
        
        var imgHtml = '—';
        try {
            var imgs = typeof tx.postponed_images === 'string' ? JSON.parse(tx.postponed_images) : tx.postponed_images;
            if (imgs && imgs.length) {
                imgHtml = imgs.map(function(url) {
                    return '<a href="' + url + '" target="_blank">' +
                           '<img src="' + url + '" style="max-width:100%; max-height:220px; border-radius:8px; border:1px solid #cbd5e1; box-shadow:0 2px 8px rgba(0,0,0,0.06); object-fit:contain; margin-top:6px;" />' +
                           '</a>';
                }).join('');
            }
        } catch(e) {}
        
        var bodyHTML = '<div class="nxhv-modal-form" style="display:flex; flex-direction:column; gap:12px; font-size:12px; color:#1e293b; text-align:left;">' +
            '<div>' +
                '<label style="font-weight:700; display:block; margin-bottom:2px; color:#b45309;">📍 Trạng thái:</label>' +
                '<span style="display:inline-block; background:#fef3c7; color:#d97706; padding:4px 10px; border-radius:6px; font-weight:700; border:1px solid #fcd34d;">⏳ ĐANG LÙI LỊCH HOÀN VẢI</span>' +
            '</div>' +
            '<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:4px;">' +
                '<div>' +
                    '<label style="font-weight:700; display:block; margin-bottom:2px;">Người thực hiện:</label>' +
                    '<input type="text" value="' + (tx.postponed_by_name || 'Hệ thống') + '" class="form-control" readonly style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9; cursor:not-allowed;" />' +
                '</div>' +
                '<div>' +
                    '<label style="font-weight:700; display:block; margin-bottom:2px;">Thời gian thực hiện:</label>' +
                    '<input type="text" value="' + dateStr + '" class="form-control" readonly style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9; cursor:not-allowed;" />' +
                '</div>' +
            '</div>' +
            '<div style="margin-top:4px;">' +
                '<label style="font-weight:700; display:block; margin-bottom:2px; color:#b45309;">📅 Ngày hẹn hoàn vải:</label>' +
                '<input type="text" value="' + targetDateStr + '" class="form-control" readonly style="width:100%; font-size:12px; padding:6px 10px; font-weight:700; color:#d97706; background:#fffbeb; border:1px solid #fcd34d; cursor:not-allowed;" />' +
            '</div>' +
            '<div style="margin-top:4px;">' +
                '<label style="font-weight:700; display:block; margin-bottom:2px;">Ghi chú / Lý do:</label>' +
                '<textarea class="form-control" readonly style="width:100%; font-size:12px; padding:6px 10px; height:50px; background:#f1f5f9; cursor:not-allowed; resize:none;">' + (tx.postponed_notes || '—') + '</textarea>' +
            '</div>' +
            '<div style="margin-top:4px; border-top:1px solid #e2e8f0; padding-top:8px;">' +
                '<label style="font-weight:700; display:block; margin-bottom:4px;">📸 Ảnh bằng chứng lùi lịch:</label>' +
                '<div style="text-align:center;">' + imgHtml + '</div>' +
            '</div>' +
        '</div>';
        
        var footerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>' +
            '<button class="btn btn-danger" onclick="submitUnpostpone(' + tx.id + ')" style="width:auto; background:#ef4444; border:none; color:#fff; font-weight:700;">Hủy Lùi Lịch</button>';
            
        openModal('⏳ Chi Tiết Lùi Lịch Hoàn Vải', bodyHTML, footerHTML);
        var container = document.getElementById('modalContainer');
        if (container) {
            container.style.width = '480px';
            container.style.maxWidth = '95%';
        }
    } else {
        // CASE: Not postponed - show postpone form
        var bodyHTML = '<div class="nxhv-modal-form" style="display:flex; flex-direction:column; gap:12px; font-size:12px; color:#1e293b; text-align:left;">' +
            '<div style="background:#fffbeb; border:1px solid #feebc8; border-radius:8px; padding:10px; color:#c05621; line-height:1.4;">' +
                'ℹ️ <strong>Thông báo:</strong> Cây vải sẽ vẫn hiển thị ở <strong>📍 Kệ Dự Định Hoàn Vải</strong> và bộ phận cắt vẫn có thể gọi cây vải này để cắt (khi đó bill hoàn sẽ tự động hủy).' +
            '</div>' +
            '<div id="postponePasteArea" style="border: 2px dashed #cbd5e1; border-radius:8px; padding:24px 16px; text-align:center; background:#f8fafc; cursor:pointer; position:relative; transition:all 0.2s; overflow:hidden;" onclick="if(event.target.id!==\'btnPostponeClearImg\')document.getElementById(\'postponeFileInput\').click()">' +
                '<div id="postponePastePlaceholder">' +
                    '<span style="font-size:24px; display:block; margin-bottom:6px;">📋</span>' +
                    '<span style="font-weight:700; color:#475569; display:block; font-size:12px;">Nhấn Ctrl+V để dán ảnh chứng minh</span>' +
                    '<span style="font-size:11px; color:#64748b; margin-top:2px; display:block;">hoặc nhấp trực tiếp để chọn tệp tin ảnh</span>' +
                '</div>' +
                '<div id="postponeImgPreviewWrap" style="display:none; position:relative; width:100%; justify-content:center; align-items:center;">' +
                    '<img id="postponeImagePreview" style="max-height:180px; max-width:100%; border-radius:6px; border:1px solid #cbd5e1; box-shadow:0 2px 6px rgba(0,0,0,0.05); object-fit:contain;" />' +
                    '<button id="btnPostponeClearImg" type="button" class="btn" style="position:absolute; top:4px; right:4px; padding:2px 8px; font-size:10px; background:#ef4444; border:none; color:#fff; border-radius:4px; cursor:pointer; z-index:10;" onclick="event.stopPropagation(); clearPostponeImage()">❌ Xóa</button>' +
                '</div>' +
                '<input type="file" id="postponeFileInput" accept="image/*" style="display:none;" />' +
            '</div>' +
            '<div style="margin-top:4px;">' +
                '<label style="font-weight:700; display:block; margin-bottom:4px;">📅 Chọn ngày hẹn hoàn vải (Bắt buộc):</label>' +
                '<div id="postponeCustomCalendar" style="border: 1px solid #cbd5e1; border-radius:12px; padding:12px; background:#fff; box-shadow: 0 4px 12px rgba(0,0,0,0.05); font-family: \'Inter\', sans-serif;">' +
                    '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">' +
                        '<button type="button" id="calPrevMonth" style="background:none; border:none; cursor:pointer; font-size:16px; font-weight:700; color:#475569; padding: 2px 8px;">&lt;</button>' +
                        '<span id="calMonthYear" style="font-weight:800; font-size:13px; color:#1e293b;"></span>' +
                        '<button type="button" id="calNextMonth" style="background:none; border:none; cursor:pointer; font-size:16px; font-weight:700; color:#475569; padding: 2px 8px;">&gt;</button>' +
                    '</div>' +
                    '<div style="display:grid; grid-template-columns: repeat(7, 1fr); text-align:center; font-weight:700; font-size:11px; color:#64748b; margin-bottom:8px; border-bottom:1px solid #f1f5f9; padding-bottom:4px;">' +
                        '<div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div><div style="color:#ef4444;">CN</div>' +
                    '</div>' +
                    '<div id="calDaysGrid" style="display:grid; grid-template-columns: repeat(7, 1fr); gap:4px; text-align:center; font-size:11px;"></div>' +
                '</div>' +
                '<input type="hidden" id="postponeDate" value="" />' +
            '</div>' +
            '<div style="margin-top:4px;">' +
                '<label style="font-weight:700; display:block; margin-bottom:4px;">Ghi chú / Lý do lùi lịch:</label>' +
                '<textarea id="postponeNotes" class="form-control" placeholder="Nhập lý do lùi lịch (nếu có)..." style="width:100%; font-size:12px; padding:6px 10px; height:55px; border-radius:6px; border:1px solid #cbd5e1; outline:none; resize:none;"></textarea>' +
            '</div>' +
        '</div>';
        
        var footerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>' +
            '<button class="btn btn-primary" id="btnConfirmPostpone" disabled onclick="submitPostpone(' + tx.id + ')" style="width:auto; font-weight:700; background:#d97706; border:none; color:#fff;">Xác nhận lùi lịch</button>';
            
        openModal('⏳ Yêu Cầu Lùi Lịch Hoàn Vải', bodyHTML, footerHTML);
        var container = document.getElementById('modalContainer');
        if (container) {
            container.style.width = '480px';
            container.style.maxWidth = '95%';
        }
        
        initCustomCalendar(maxDays, _postponeHolidays);
        
        // Event listeners
        var fileInput = document.getElementById('postponeFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', function(e) {
                if (e.target.files && e.target.files[0]) {
                    processAndPreviewPostponeImage(e.target.files[0]);
                }
            });
        }
        
        _postponePasteHandler = function(e) {
            var items = (e.clipboardData || e.originalEvent.clipboardData).items;
            var imageItem = null;
            for (var i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    imageItem = items[i];
                    break;
                }
            }
            if (imageItem) {
                var blob = imageItem.getAsFile();
                processAndPreviewPostponeImage(blob);
            }
        };
        document.addEventListener('paste', _postponePasteHandler);
    }
}
window.openPostponeModal = openPostponeModal;

async function submitPostpone(id) {
    var targetDate = document.getElementById('postponeDate').value;
    if (!targetDate) {
        showToast('Vui lòng chọn ngày hẹn hoàn vải', 'warning');
        return;
    }
    
    var parts = targetDate.split('-');
    var dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (dateObj.getDay() === 0) {
        showToast('Không được lùi lịch vào ngày Chủ Nhật', 'warning');
        return;
    }
    
    var isHoliday = _postponeHolidays.some(function(h) {
        return h.holiday_date === targetDate;
    });
    if (isHoliday) {
        var hName = _postponeHolidays.find(function(h) { return h.holiday_date === targetDate; })?.holiday_name || '';
        showToast('Không được lùi lịch vào ngày nghỉ lễ: ' + hName, 'warning');
        return;
    }

    var notes = document.getElementById('postponeNotes').value.trim();
    if (!_postponeImageBlob) {
        showToast('Vui lòng dán hoặc chọn hình ảnh chứng minh', 'warning');
        return;
    }
    
    var btn = document.getElementById('btnConfirmPostpone');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Đang tải ảnh...';
    }
    
    try {
        // 1. Upload proof image
        var formData = new FormData();
        formData.append('file', _postponeImageBlob, 'postpone_proof.webp');
        
        var uploadRes = await apiCall('/api/fabrictx/upload-postpone/' + id, 'POST', formData);
        if (!uploadRes.url) {
            throw new Error(uploadRes.error || 'Lỗi upload ảnh chứng minh');
        }
        
        if (btn) btn.textContent = 'Đang lưu...';
        
        // 2. Submit postpone request
        var postponeRes = await apiCall('/api/fabrictx/postpone/' + id, 'POST', {
            images: [uploadRes.url],
            notes: notes,
            target_date: targetDate
        });
        
        if (postponeRes.error) {
            throw new Error(postponeRes.error);
        }
        
        showToast('⏳ Đã cập nhật lùi lịch hoàn vải');
        closeModal();
        
        // Clean up
        if (_postponePasteHandler) {
            document.removeEventListener('paste', _postponePasteHandler);
            _postponePasteHandler = null;
        }
        
        await _nxhvLoadAll();
    } catch(e) {
        showToast(e.message || 'Lỗi xử lý', 'error');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Xác nhận lùi lịch';
        }
    }
}
window.submitPostpone = submitPostpone;

async function submitUnpostpone(id) {
    if (!confirm('Bạn có chắc chắn muốn HỦY trạng thái lùi lịch cho giao dịch này?')) return;
    try {
        var res = await apiCall('/api/fabrictx/unpostpone/' + id, 'POST');
        if (res.error) throw new Error(res.error);
        showToast('✅ Đã hủy lùi lịch hoàn vải');
        closeModal();
        await _nxhvLoadAll();
    } catch(e) {
        showToast(e.message || 'Lỗi xử lý', 'error');
    }
}
window.submitUnpostpone = submitUnpostpone;

// Wrap or listen to modal closing to remove paste event listener
var _origCloseModal = window.closeModal;
window.closeModal = function() {
    if (_postponePasteHandler) {
        document.removeEventListener('paste', _postponePasteHandler);
        _postponePasteHandler = null;
    }
    if (typeof _origCloseModal === 'function') {
        _origCloseModal();
    }
};

