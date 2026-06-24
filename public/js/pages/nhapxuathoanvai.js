// ========== NHẬP XUẤT HOÀN VẢI — Desktop SPA ==========
var _nxhv={records:[],tree:null,filter:{tx_type:null,year:null,month:null},search:''};
var _nxhvOpen={};
var _nxhvTL={HOAN:'Hoàn',NHAP_KK:'Nhập KK',XUAT_KK:'Xuất KK',NHAP:'Nhập Vải',XUAT:'Xuất Vải'};
var _nxhvIC={HOAN:'🔄',NHAP_KK:'📥',XUAT_KK:'📤',NHAP:'📦',XUAT:'🚛'};
var _nxhvCL={HOAN:'#059669',NHAP_KK:'#7c3aed',XUAT_KK:'#ea580c',NHAP:'#2563eb',XUAT:'#dc2626'};

function renderNhapxuathoanvaiPage(content){
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
    +'.nxhv-tag{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:800;color:#fff}'
    +'.nxhv-debt{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:800}'
    +'.nxhv-debt.red{background:#fee2e2;color:#dc2626}.nxhv-debt.green{background:#d1fae5;color:#059669}'
    +'@media(max-width:768px){.nxhv-sb{display:none}}';
    document.head.appendChild(st);}
    content.innerHTML='<div class="nxhv-wrap"><div class="nxhv-sb" id="nxhvSb"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="nxhv-main">'
    +'<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center"><div id="nxhvInfo" style="font-size:12px"></div><div id="nxhvStats" style="display:flex;gap:8px;flex:1;justify-content:center;flex-wrap:wrap"></div><button id="btnNxhvCreateReturn" class="btn btn-primary" style="padding:6px 14px;font-size:12px;font-weight:700;border-radius:8px;background:#059669;color:#fff;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:6px" onclick="openCreateReturnModal()">🔄 Tạo Hoàn Vải</button><input id="nxhvSearch" placeholder="🔍 Tìm chất liệu / màu / nguồn..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:220px;outline:none"></div>'
    +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:11px;white-space:nowrap" id="nxhvTable"><thead><tr style="background:var(--gray-800)">'
    +'<th>STT</th><th>✅</th><th>📸</th><th>Nghiệp Vụ</th><th>Ngày</th><th>Nguồn Vải</th><th>NV</th><th>Chất Liệu</th><th>Màu Vải</th><th>ĐVT</th><th>Các Cây</th><th>Số Cây</th><th>Tổng SL</th><th>Giá</th><th>Thành Tiền</th><th>Công Nợ</th><th>Thanh Toán</th><th>Cập Nhật</th>'
    +'</tr></thead><tbody id="nxhvTb"><tr><td colspan="18" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div></div></div>';
    var _t;document.getElementById('nxhvSearch').addEventListener('input',function(){clearTimeout(_t);_t=setTimeout(function(){_nxhv.search=document.getElementById('nxhvSearch').value||'';_nxhvRender();},300);});
    _nxhvLoadAll();
}

async function _nxhvLoadAll(){try{var tR=await apiCall('/api/fabrictx/tree');_nxhv.tree=tR;_nxhvRenderSb();await _nxhvLoadRecs();}catch(e){console.error('[NXHV]',e);}}
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
    if(_nxhv.search){var q=_nxhv.search.toLowerCase();all=all.filter(function(r){return(r.material_name||'').toLowerCase().indexOf(q)>=0||(r.color_name||'').toLowerCase().indexOf(q)>=0||(r.source_name||'').toLowerCase().indexOf(q)>=0;});}
    var tot=all.length,sumTA=0,sumDebt=0,sumPay=0;
    all.forEach(function(r){sumTA+=Number(r.total_amount)||0;sumDebt+=Number(r.debt)||0;sumPay+=Number(r.payment)||0;});
    var tb=document.getElementById('nxhvTb');if(!tb)return;
    if(!all.length){tb.innerHTML='<tr><td colspan="18"><div class="empty-state"><div class="icon">🔄</div><h3>Chưa có giao dịch</h3></div></td></tr>';}else{
    tb.innerHTML=all.map(function(r,i){
        var aI=r.is_approved?'✅':'⬜',aC=r.is_approved?' on':'',aA=r.is_approved?'unapprove':'approve';
        var cl=_nxhvCL[r.tx_type]||'#0891b2';
        var imgs='—';try{var ia=typeof r.bill_images==='string'?JSON.parse(r.bill_images):r.bill_images;if(ia&&ia.length)imgs='📸 '+ia.length;}catch(e){}
        var debt=Number(r.debt)||0;var dB=debt>0?'<span class="nxhv-debt red">🔴 '+_nxhvFN(debt)+'</span>':'<span class="nxhv-debt green">✅ 0</span>';
        var upd='';if(r.last_update_at){upd=_nxhvFD(r.last_update_at);if(r.last_update_by)upd+='<br><span style="color:#0891b2;font-size:9px">'+r.last_update_by+'</span>';}
        return '<tr><td style="text-align:center;font-weight:700;color:#94a3b8">'+(i+1)+'</td>'
        +'<td style="text-align:center"><button class="nxhv-ib'+aC+'" onclick="_nxhvTog('+r.id+',\''+aA+'\')" title="Duyệt">'+aI+'</button></td>'
        +'<td style="text-align:center;font-size:10px">'+imgs+'</td>'
        +'<td><span class="nxhv-tag" style="background:'+cl+'">'+(_nxhvTL[r.tx_type]||r.tx_type)+'</span></td>'
        +'<td style="font-size:10px">'+_nxhvFD(r.tx_date)+'</td>'
        +'<td style="font-size:10px;color:#0891b2;font-weight:700">'+(r.source_name||'—')+'</td>'
        +'<td style="font-size:10px;color:#059669;font-weight:600">'+(r.staff_name||'—')+'</td>'
        +'<td style="font-weight:600;color:#1e293b">'+(r.material_name||'—')+'</td>'
        +'<td style="font-size:10px;color:#6366f1;font-weight:600">'+(r.color_name||'—')+'</td>'
        +'<td style="font-size:10px;color:#94a3b8">'+(r.unit||'kg')+'</td>'
        +'<td style="font-size:9px;max-width:100px;overflow:hidden;text-overflow:ellipsis">'+(r.tree_details||'—')+'</td>'
        +'<td style="text-align:center;font-weight:700">'+_nxhvFN(r.tree_count)+'</td>'
        +'<td style="text-align:center;font-weight:800;color:#0891b2">'+_nxhvFN(r.total_quantity)+'</td>'
        +'<td style="text-align:right;font-weight:600;color:#f59e0b">'+_nxhvFN(r.price)+'</td>'
        +'<td style="text-align:right;font-weight:800;color:#1e293b">'+_nxhvFN(r.total_amount)+'</td>'
        +'<td>'+dB+'</td>'
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

async function _nxhvTog(id,action){try{await apiCall('/api/fabrictx/toggle/'+id,'POST',{action});showToast('✅ Cập nhật');await _nxhvLoadAll();}catch(e){showToast(e.message||'Lỗi','error');}}

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
        
        const bodyHTML = `
            <div class="nxhv-modal-form" style="display:flex; flex-direction:column; gap:12px; font-size:12px; color:#1e293b; text-align:left;">
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
                    <div>
                        <label style="font-weight:700; display:block; margin-bottom:4px;">Nguồn Vải (Nhà cung cấp):</label>
                        <input type="text" id="nxhv_m_source" class="form-control" placeholder="Tên nhà cung cấp..." style="width:100%; font-size:12px; padding:6px 10px;" />
                    </div>
                    <div>
                        <label style="font-weight:700; display:block; margin-bottom:4px;">Ngày Hoàn Vải:</label>
                        <input type="date" id="nxhv_m_date" class="form-control" style="width:100%; font-size:12px; padding:5px 10px;" />
                    </div>
                    <div>
                        <label style="font-weight:700; display:block; margin-bottom:4px;">Nhân Viên Thực Hiện:</label>
                        <select id="nxhv_m_staff" class="form-control" style="width:100%; font-size:12px; padding:5px 10px;"></select>
                    </div>
                </div>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <div>
                        <label style="font-weight:700; display:block; margin-bottom:4px;">Chất Liệu:</label>
                        <input type="text" id="nxhv_m_material" class="form-control" style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9;" readonly placeholder="Tự động chọn..." />
                    </div>
                    <div>
                        <label style="font-weight:700; display:block; margin-bottom:4px;">Màu Vải:</label>
                        <input type="text" id="nxhv_m_color" class="form-control" style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9;" readonly placeholder="Tự động chọn..." />
                    </div>
                </div>
                
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:12px;">
                    <div>
                        <label style="font-weight:700; display:block; margin-bottom:4px;">ĐVT:</label>
                        <input type="text" id="nxhv_m_unit" class="form-control" value="kg" style="width:100%; font-size:12px; padding:6px 10px;" />
                    </div>
                    <div>
                        <label style="font-weight:700; display:block; margin-bottom:4px;">Đơn Giá Hoàn:</label>
                        <input type="number" id="nxhv_m_price" class="form-control" value="0" style="width:100%; font-size:12px; padding:6px 10px;" />
                    </div>
                    <div>
                        <label style="font-weight:700; display:block; margin-bottom:4px;">Thanh Toán:</label>
                        <input type="number" id="nxhv_m_payment" class="form-control" value="0" style="width:100%; font-size:12px; padding:6px 10px;" />
                    </div>
                    <div>
                        <label style="font-weight:700; display:block; margin-bottom:4px;">Công Nợ:</label>
                        <input type="text" id="nxhv_m_debt" class="form-control" value="0" style="width:100%; font-size:12px; padding:6px 10px; background:#f1f5f9; font-weight:700; color:#dc2626;" readonly />
                    </div>
                </div>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; align-items:center;">
                    <div>
                        <label style="font-weight:700; display:block; margin-bottom:4px;">Ghi Chú:</label>
                        <textarea id="nxhv_m_notes" class="form-control" placeholder="Ghi chú thêm..." style="width:100%; height:34px; resize:vertical; font-size:12px; padding:6px 10px;"></textarea>
                    </div>
                    <div>
                        <label style="font-weight:700; display:block; margin-bottom:4px;">Ảnh Bill Hoàn (Không bắt buộc):</label>
                        <input type="file" id="nxhv_m_files" multiple accept="image/*" class="form-control" style="width:100%; font-size:11px; padding:3px 10px;" />
                    </div>
                </div>
                
                <div style="border-top:1px solid #e2e8f0; margin-top:4px; padding-top:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <span style="font-size:13px; font-weight:800; color:#0f766e;">📋 Chọn Cây Vải Từ Kho Vải</span>
                        <span id="nxhv_m_selection_summary" style="font-weight:700; color:#0891b2;">Đã chọn: 0 cây (0 kg)</span>
                    </div>

                    <!-- Step 1: Force type selection -->
                    <div style="margin-bottom:10px; padding:8px; background:rgba(15,118,110,0.03); border:1px dashed rgba(15,118,110,0.2); border-radius:8px;">
                        <label style="font-weight:800; display:block; margin-bottom:6px; color:#0f766e;">👉 BƯỚC 1: Chọn loại cây vải muốn hoàn trả:</label>
                        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
                            <button type="button" id="nxhv_btn_type1" class="btn btn-outline" onclick="selectRetType(1)" style="font-size:11px; padding:8px; text-align:left; border:2px solid #e2e8f0; border-radius:8px; background:#fff; font-weight:700; display:flex; flex-direction:column; gap:2px; transition:all 0.2s;">
                                <span style="font-size:12px; display:inline-flex; align-items:center; gap:4px;">🛠️ Loại 1</span>
                                <span style="color:#64748b; font-size:10px; font-weight:500;">Cây nguyên chưa xếp kệ</span>
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
                    <div style="font-weight:700; font-size:10px; margin-bottom:4px; color:${groupColor};">${groupTitle}</div>
                    <div style="display:flex; flex-direction:column; gap:3px;">
                        ${filtered.map(r => {
                            const shelf = r.loc ? `📍 Kệ ${r.loc}` : '⚠️ Chưa xếp kệ';
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
                                        data-price="${colorObj.price || 0}"
                                        data-unit="${colorObj.unit || 'kg'}"
                                        ${isChecked ? 'checked' : ''} 
                                        ${isDisabled ? 'disabled' : ''}
                                        style="width:14px; height:14px; accent-color:#059669;" />
                                    <div style="flex:1; display:flex; justify-content:space-between; align-items:center;">
                                        <div>
                                            <strong style="color:#0f766e;">${r.w} kg</strong> 
                                            <span style="color:#64748b; font-size:10px; margin-left:6px;">(${r.code || 'Chưa có mã'})</span>
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
                document.getElementById('nxhv_m_unit').value = first.getAttribute('data-unit');
                
                const priceInput = document.getElementById('nxhv_m_price');
                if (priceInput.value === '0' || !priceInput.dataset.userEdited) {
                    priceInput.value = first.getAttribute('data-price');
                }
            } else {
                document.getElementById('nxhv_m_material').value = '';
                document.getElementById('nxhv_m_color').value = '';
                document.getElementById('nxhv_m_price').value = '0';
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
    if (!paymentInput.dataset.userEdited) {
        paymentInput.value = totalAmount;
    }
    const payment = Number(paymentInput.value) || 0;
    const debt = Math.max(0, totalAmount - payment);
    document.getElementById('nxhv_m_debt').value = debt.toLocaleString('vi-VN');
}

async function submitCreateReturn() {
    const source = document.getElementById('nxhv_m_source').value.trim();
    const txDate = document.getElementById('nxhv_m_date').value;
    const staffId = document.getElementById('nxhv_m_staff').value;
    const material = document.getElementById('nxhv_m_material').value;
    const color = document.getElementById('nxhv_m_color').value;
    const unit = document.getElementById('nxhv_m_unit').value.trim();
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
        detailsArray.push(`Cây ${w}kg` + (c ? ` (${c})` : ''));
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
        
        await Promise.all(rollIds.map(id => apiCall('/api/khovai/rolls/' + id, 'PUT', { is_returned: true })));
        
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
