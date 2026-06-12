// ========== TRA SOÁT — Step Detail Modals ==========
var _tsModalOrderId = null;
const _STEP_MAP = {'Cắt':'cat','In':'in','Ép':'ep','May':'may','Kiểm Tra CL':'qc','Hoàn Thiện':'ht','Gửi Hàng':'gui'};

function _tsCloseModal(){ const m=document.getElementById('tsModal'); if(m) m.remove(); }

async function _tsOpenStepModal(orderId, stepName){
    const stepKey = _STEP_MAP[stepName]; if(!stepKey) return;
    _tsModalOrderId = orderId;
    _tsCloseModal();
    // Show loading overlay
    document.body.insertAdjacentHTML('beforeend',`<div id="tsModal" onclick="if(event.target===this)_tsCloseModal()" style="position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;animation:tsFadeIn .2s">
        <div style="background:white;border-radius:16px;width:90%;max-width:600px;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)" id="tsModalBody">
            <div style="text-align:center;padding:40px;color:#9ca3af">⏳ Đang tải báo cáo...</div>
        </div></div>`);
    try {
        const res = await apiCall('/api/trasoat/orders/'+orderId+'/step/'+stepKey);
        document.getElementById('tsModalBody').innerHTML = _tsRenderStepModal(stepKey, res);
    } catch(e) {
        document.getElementById('tsModalBody').innerHTML = '<div style="padding:40px;text-align:center;color:#ef4444">❌ Chưa có dữ liệu hoặc chưa đến giai đoạn này</div><div style="padding:0 20px 20px;text-align:center"><button onclick="_tsCloseModal()" style="padding:10px 40px;border:none;border-radius:10px;background:#1e293b;color:white;font-weight:700;cursor:pointer">Đóng</button></div>';
    }
}

function _tsRenderStepModal(step, d){
    const fmtDT = t => { if(!t) return '—'; return new Date(t).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'}); };
    const fmtD = t => { if(!t) return '—'; return new Date(t).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}); };
    const fmtQCDate = t => { if(!t) return '—'; const d = new Date(t); const hh = d.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false }); const dd = d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit' }); return hh + ' ' + dd; };
    const V = v => v||'—';
    const hdr = (icon,title,sub,color) => `<div style="background:linear-gradient(135deg,${color});padding:18px 24px;border-radius:16px 16px 0 0;color:white;display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:16px;font-weight:900">${icon} ${title}</div><div style="font-size:12px;opacity:.8;margin-top:2px">${sub}</div></div><button onclick="_tsCloseModal()" style="width:32px;height:32px;border-radius:50%;border:none;background:rgba(255,255,255,.2);color:white;font-size:18px;cursor:pointer;font-weight:800">✕</button></div>`;
    const row = (label,val,valColor) => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9"><span style="color:#64748b;font-weight:600">${label}</span><span style="font-weight:700;color:${valColor||'#1e293b'}">${val}</span></div>`;
    const section = (icon,title) => `<div style="font-weight:800;color:#1e293b;margin:16px 0 8px;font-size:13px">${icon} ${title}</div>`;

    let html = '', body = '';
    if(step==='cat'){
        html = hdr('✂️','CHI TIẾT ĐƠN CẮT',d.order_code,'#16a34a,#15803d');
        if(!d.records||!d.records.length){ body='<div style="padding:30px;text-align:center;color:#9ca3af">Chưa có dữ liệu cắt</div>'; }
        else { body+=`<div style="padding:16px 24px;display:flex;flex-direction:column;gap:14px">`; d.records.forEach((r,i)=>{
            const title = r.item_description ? `📋 ${r.item_description}` : `📋 Phiếu ${i+1}`;
            body+=`<div style="border:1.5px solid #e2e8f0;border-radius:14px;overflow:hidden;background:white;box-shadow:0 2px 8px rgba(0,0,0,.04)">`;
            body+=`<div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #e2e8f0"><span style="font-weight:800;color:#166534;font-size:13px">${title}</span><span style="padding:3px 10px;border-radius:6px;background:${r.is_cut_done?'#d1fae5':'#fef3c7'};color:${r.is_cut_done?'#065f46':'#92400e'};font-size:11px;font-weight:800">${r.is_cut_done?'✅ Đã cắt xong':'⏳ Đang cắt'}</span></div>`;
            body+=`<div style="padding:14px 16px">`;
            body+=row('📦 Tên SP',V(r.product_name));
            body+=row('🧵 Chất liệu',V(r.material_name),'#7c3aed');
            body+=row('🎨 Màu',V(r.fabric_color),'#1e293b');
            body+=row('👤 NV Cắt',V(r.cutter_name),'#059669');
            body+=row('🕐 Cắt Xong',fmtDT(r.cut_done_at));
            body+=row('📊 SL Đơn',(r.order_quantity||0)+' sp');
            if(r.rolls&&r.rolls.length){
                body+=section('🧶','CÂY VẢI ĐÃ CHỌN ('+r.rolls.length+')');
                r.rolls.forEach(rl=>{ body+=`<div style="padding:6px 12px;background:#f8fafc;border-radius:8px;margin:4px 0;font-size:12px;font-weight:600">${rl.material_name} - ${rl.color} - ${rl.kg}kg</div>`; });
            }
            body+=`</div></div>`;
        }); body+=`</div>`; }
    }
    else if(step==='in'){
        html = hdr('🖨️','BÁO CÁO IN',d.order_code,'#7c3aed,#6d28d9');
        if(!d.records||!d.records.length){ body='<div style="padding:30px;text-align:center;color:#9ca3af">Chưa có dữ liệu in</div>'; }
        else { body+=`<div style="padding:16px 24px;display:flex;flex-direction:column;gap:14px">`; d.records.forEach((r,i)=>{
            const title = r.item_description ? `🖨️ ${r.item_description}` : `🖨️ Phiếu ${i+1}`;
            const statusText = r.is_print_done ? '✅ Đã in xong' : (r.contractor_id ? '⏳ Đã bàn giao bên gia công' : '⏳ Đang in');
            body+=`<div style="border:1.5px solid #e2e8f0;border-radius:14px;overflow:hidden;background:white;box-shadow:0 2px 8px rgba(0,0,0,.04)">`;
            body+=`<div style="background:linear-gradient(135deg,#f5f3ff,#ede9fe);padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #e2e8f0"><span style="font-weight:800;color:#5b21b6;font-size:13px">${title}</span><span style="padding:3px 10px;border-radius:6px;background:${r.is_print_done?'#d1fae5':(r.contractor_id?'#e0f2fe':'#fef3c7')};color:${r.is_print_done?'#065f46':(r.contractor_id?'#0369a1':'#92400e')};font-size:11px;font-weight:800">${statusText}</span></div>`;
            body+=`<div style="padding:14px 16px">`;
            body+=row('📦 Tên SP/Phối',V(r.product_name));
            body+=row('👤 CSKH',V(d.cskh_name));
            body+=row('🖨️ Nhân Viên In',V(r.printer_name),'#7c3aed');
            body+=row('📋 Loại In',V(r.print_field||r.field_name));
            body+=row('📊 Số Lượng Theo Đơn',r.order_quantity ? r.order_quantity+' Áo' : '—','#1e40af');
            if(r.contractor_id){
                body+=row('🤝 Thời Gian Bàn Giao', r.created_at ? fmtDT(r.created_at) : '—', '#0369a1');
            }
            if(r.is_print_done){
                body+=row('🕐 Thời Gian In Xong', r.print_done_at ? fmtDT(r.print_done_at) : '—', '#059669');
            }
            if(r.current_roll) body+=row('🧻 Cây In',V(r.current_roll),'#0f766e');
            if(r.print_meters) body+=`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px">
                <div style="background:#eff6ff;border-radius:10px;padding:10px;text-align:center"><div style="font-size:9px;font-weight:700;color:#1e40af">SL ĐẦU CUỘN (M)</div><div style="font-size:18px;font-weight:900;color:#1e40af">${r.roll_start_qty||0}</div></div>
                <div style="background:#fef3c7;border-radius:10px;padding:10px;text-align:center"><div style="font-size:9px;font-weight:700;color:#92400e">SỐ MÉT IN (M)</div><div style="font-size:18px;font-weight:900;color:#dc2626">${r.print_meters||0}</div></div>
                <div style="background:#f1f5f9;border-radius:10px;padding:10px;text-align:center"><div style="font-size:9px;font-weight:700;color:#475569">SL CUỐI CUỘN (M)</div><div style="font-size:18px;font-weight:900;color:#475569">${r.roll_end_qty||0}</div></div>
            </div>`;
            if(r.image_url){body+=section('📸','HÌNH ẢNH FILE IN');body+=`<img src="${r.image_url}" style="max-width:100%;border-radius:8px;margin:4px 0" onerror="this.style.display='none'">`;}
            if(r.is_print_done && r.print_done_at) body+=`<div style="margin-top:12px;text-align:center;padding:6px 14px;background:#d1fae5;border-radius:8px;font-weight:800;font-size:12px;color:#065f46">In Xong: ${fmtDT(r.print_done_at)}</div>`;
            body+=`</div></div>`;
        }); body+=`</div>`; }
    }
    else if(step==='ep'){
        html = hdr('🔥','CHI TIẾT PHIẾU ÉP',d.order_code,'#ea580c,#c2410c');
        if(!d.records||!d.records.length){ body='<div style="padding:30px;text-align:center;color:#9ca3af">Chưa có dữ liệu ép</div>'; }
        else { body+=`<div style="padding:16px 24px;display:flex;flex-direction:column;gap:14px">`; d.records.forEach((r,i)=>{
            const title = r.item_description ? `🔥 ${r.item_description}` : `🔥 Phiếu ${i+1}`;
            body+=`<div style="border:1.5px solid #e2e8f0;border-radius:14px;overflow:hidden;background:white;box-shadow:0 2px 8px rgba(0,0,0,.04)">`;
            body+=`<div style="background:linear-gradient(135deg,#fff7ed,#ffedd5);padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #e2e8f0"><span style="font-weight:800;color:#c2410c;font-size:13px">${title}</span><span style="padding:3px 10px;border-radius:6px;background:${r.is_reported?'#d1fae5':'#fef3c7'};color:${r.is_reported?'#065f46':'#92400e'};font-size:11px;font-weight:800">${r.is_reported?'✅ Đã ép xong':'⏳ Đang ép'}</span></div>`;
            body+=`<div style="padding:14px 16px">`;
            body+=row('📦 Sản phẩm',V(r.product_name));
            body+=row('🧵 Chất liệu',V(r.material_name));
            body+=row('🎨 Màu',V(r.fabric_color));
            body+=row('👤 CSKH',V(d.cskh_name));
            body+=row('👷 NV Ép',V(r.presser_name),'#ea580c');
            body+=row('📊 SL Cắt',r.order_quantity+' sp');
            body+=row('🕐 Ép Xong',fmtDT(r.reported_at));
            body+=section('📋','CHI TIẾT CÁC VỊ TRÍ ÉP');
            const posNames = {'pos_chest_arm':'Ngực, Tay, Tạp Dề, Vải Mũ','pos_back_belly':'Lưng, Bụng, Sườn Áo Sần, Mũ Sần','pos_protective':'Bảo Hộ, Bếp, Sơ Mi','pos_packaging':'Đóng Gói, Cổ Bẻ Vải'};
            let totalEp=0;
            Object.keys(posNames).forEach(k=>{
                const qty=Number(r[k])||0; totalEp+=qty;
                body+=`<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;border-bottom:1px solid #f8fafc"><span>${posNames[k]}</span><span style="font-weight:700;color:#ea580c">${qty} sp</span></div>`;
            });
            body+=`<div style="margin-top:12px">
                <div style="background:#fef3c7;border-radius:10px;padding:14px;text-align:center"><div style="font-size:10px;font-weight:700;color:#92400e">🔥 TỔNG SL ÉP THỰC TẾ</div><div style="font-size:22px;font-weight:900;color:#92400e">${r.press_quantity||totalEp} sp</div></div>
            </div>`;
            if(r.notes){body+=section('📝','GHI CHÚ');body+=`<div style="background:#f8fafc;border-radius:8px;padding:10px;font-size:12px">${r.notes}</div>`;}
            if(r.press_images){try{const imgs=JSON.parse(r.press_images);if(imgs.length){body+=section('📸','HÌNH ẢNH ÉP');imgs.forEach(img=>{body+=`<img src="${img}" style="max-width:100%;border-radius:8px;margin:4px 0" onerror="this.style.display='none'">`});}}catch(e){}}
            body+=`</div></div>`;
        }); body+=`</div>`; }
    }
    else if(step==='may'){
        html = hdr('🧵','CHI TIẾT BÀN GIAO MAY',d.order_code,'#1e3a5f,#1e40af');
        if(!d.records||!d.records.length){ body='<div style="padding:30px;text-align:center;color:#9ca3af">Chưa có dữ liệu may</div>'; }
        else { body+=`<div style="padding:16px 24px;display:flex;flex-direction:column;gap:14px">`; d.records.forEach((r,i)=>{
            const title = r.item_description ? `🧵 ${r.item_description}` : `🧵 Phiếu ${i+1}`;
            body+=`<div style="border:1.5px solid #e2e8f0;border-radius:14px;overflow:hidden;background:white;box-shadow:0 2px 8px rgba(0,0,0,.04)">`;
            body+=`<div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #e2e8f0"><span style="font-weight:800;color:#1e40af;font-size:13px">${title}</span><span style="padding:3px 10px;border-radius:6px;background:${r.done_date?'#d1fae5':'#fef3c7'};color:${r.done_date?'#065f46':'#92400e'};font-size:11px;font-weight:800">${r.done_date?'✅ Đã may xong':'⏳ Đang may'}</span></div>`;
            body+=`<div style="padding:14px 16px">`;
            body+=`<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
                <div style="background:#eff6ff;border-radius:8px;padding:8px 14px;flex:1"><div style="font-size:10px;color:#3b82f6;font-weight:700">📅 HẠN TRẢ HÀNG</div><div style="font-weight:800;color:#1e40af">${fmtD(d.expected_ship_date)}</div></div>
                <div style="background:${r.done_date?'#dcfce7':'#fef3c7'};border-radius:8px;padding:8px 14px;flex:1"><div style="font-size:10px;color:${r.done_date?'#16a34a':'#f59e0b'};font-weight:700">🧵 NGÀY MAY HT</div><div style="font-weight:800;color:${r.done_date?'#166534':'#92400e'}">${fmtD(r.done_date)}</div></div>
            </div>`;
            body+=row('📦 Tên SP',V(r.product_name));
            body+=row('👤 CSKH',V(d.cskh_name));
            body+=row('🧵 Chất liệu',V(r.material_name));
            body+=row('🎨 Màu',V(r.fabric_color));
            body+=row('👷 NV May','🏭 '+(r.sewer_name||r.contractor_name||r.team_name||'—'),'#1e40af');
            body+=row('📅 Ngày Bàn Giao',fmtDT(r.handover_date));
            body+=row('📊 SL Thực Tế',(r.actual_quantity||r.order_quantity||0)+' sp','#dc2626');
            body+=row('📊 SL May',(r.quantity||0)+' sp','#059669');
            body+=`</div></div>`;
        }); body+=`</div>`; }
    }
    else if(step==='qc'){
        html = hdr('🔍','CHI TIẾT KIỂM TRA CHẤT LƯỢNG (QC)',d.order_code,'#0f766e,#0d9488');
        if(!d.records||!d.records.length){ body='<div style="padding:30px;text-align:center;color:#9ca3af">Chưa có dữ liệu QC</div>'; }
        else { body+=`<div style="padding:16px 24px;display:flex;flex-direction:column;gap:14px">`; d.records.forEach((r,i)=>{
            const title = '🔍 ' + d.order_code + ' — Phiếu ' + (i+1) + (r.item_description ? ' — ' + r.item_description : '');
            body+=`<div style="border:1.5px solid #e2e8f0;border-radius:14px;overflow:hidden;background:white;box-shadow:0 2px 8px rgba(0,0,0,.04)">`;
            body+=`<div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #e2e8f0"><span style="font-weight:800;color:#0f766e;font-size:13px">${title}</span><span style="padding:3px 10px;border-radius:6px;background:${r.answers&&r.answers.length?'#d1fae5':'#fef3c7'};color:${r.answers&&r.answers.length?'#065f46':'#92400e'};font-size:11px;font-weight:800">${r.answers&&r.answers.length?'✅ Đã QC':'⏳ Chưa QC'}</span></div>`;
            body+=`<div style="padding:14px 16px">`;
            body+=row('📦 Tên SP',V(r.product_name));
            body+=row('👤 CSKH',V(d.cskh_name));
            body+=row('🧵 Nhân Viên May',V(r.sewer_name));
            body+=row('👷 Nhân Viên QC',V(r.finisher_name),'#0d9488');
            body+=row('📅 Thời Gian QC',fmtQCDate(r.qc_date));
            body+=row('📊 Số Lượng',r.quantity ? r.quantity+' sp' : '—');
            if(r.answers&&r.answers.length){
                body+=section('📋','KẾT QUẢ ĐÁNH GIÁ CHẤT LƯỢNG');
                r.answers.forEach(a=>{
                    let displayVal = a.answer_value;
                    let isOk = false;
                    
                    if (a.type === 'yes_no') {
                        if (String(a.answer_value).toLowerCase() === 'yes' || String(a.answer_value).toLowerCase() === 'đạt' || String(a.answer_value).toLowerCase() === 'có') {
                            displayVal = 'Có';
                            isOk = true;
                        } else {
                            displayVal = 'Không';
                            isOk = false;
                        }
                    } else if (a.type === 'percentage') {
                        displayVal = a.answer_value + '%';
                        isOk = (parseFloat(a.answer_value) || 0) >= 50;
                    } else {
                        isOk = String(a.answer_value).toLowerCase() === 'yes' || String(a.answer_value).toLowerCase() === 'đạt' || String(a.answer_value).toLowerCase() === 'có';
                    }

                    const badge = `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:${isOk?'#d1fae5':'#fee2e2'};color:${isOk?'#065f46':'#991b1b'}">${displayVal}</span>`;
                    body+=`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:12px;border-bottom:1px solid #f8fafc"><span style="font-weight:600;color:#334155">${a.content}</span>${badge}</div>`;
                });
            } else { body+=`<div style="padding:10px;text-align:center;color:#9ca3af;font-size:12px">Chưa thực hiện checklist QC</div>`; }
            if(r.finish_images){
                try{
                    const imgs=JSON.parse(r.finish_images);
                    if(imgs.length){
                        body+=section('📸','HÌNH ẢNH QC');
                        imgs.forEach(img=>{body+=`<img src="${img}" style="max-width:100%;border-radius:8px;margin:4px 0" onerror="this.style.display='none'">`});
                    }
                }catch(e){}
            }
            body+=`</div></div>`;
        }); body+=`</div>`; }
    }
    else if(step==='ht'){
        html = hdr('🔧','CHI TIẾT HOÀN THIỆN & CHECKLIST',d.order_code,'#334155,#475569');
        if(!d.records||!d.records.length){ body='<div style="padding:30px;text-align:center;color:#9ca3af">Chưa có dữ liệu hoàn thiện</div>'; }
        else { body+=`<div style="padding:16px 24px;display:flex;flex-direction:column;gap:14px">`; d.records.forEach((r,i)=>{
            const title = r.item_description ? `🔧 ${r.item_description}` : `🔧 Phiếu ${i+1}`;
            body+=`<div style="border:1.5px solid #e2e8f0;border-radius:14px;overflow:hidden;background:white;box-shadow:0 2px 8px rgba(0,0,0,.04)">`;
            body+=`<div style="background:linear-gradient(135deg,#f1f5f9,#e2e8f0);padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #e2e8f0"><span style="font-weight:800;color:#334155;font-size:13px">${title}</span><span style="padding:3px 10px;border-radius:6px;background:${r.is_completed?'#d1fae5':'#fef3c7'};color:${r.is_completed?'#065f46':'#92400e'};font-size:11px;font-weight:800">${r.is_completed?'✅ Đã hoàn thiện':'⏳ Đang hoàn thiện'}</span></div>`;
            body+=`<div style="padding:14px 16px">`;
            body+=row('👤 CSKH',V(d.cskh_name));
            body+=row('👷 NV Hoàn Thiện',V(r.finisher_name),'#059669');
            body+=row('📦 Tiêu Chuẩn Gửi',r.shipping_standard==='chuan'?'✅ CHUẨN':'⚠️ '+V(r.shipping_standard));
            body+=row('📅 Hạn Gửi Hàng',fmtDT(r.expected_date));
            if(r.checklist&&r.checklist.length){
                body+=section('📋','CHECKLIST HOÀN THIỆN');
                r.checklist.forEach(c=>{
                    const ans=c.answer_value||'';
                    const isYes=ans.toLowerCase()==='có'||ans.toLowerCase()==='yes'||ans.toLowerCase()==='đạt';
                    body+=`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f8fafc;font-size:12px"><span style="font-weight:600">${c.question}</span><span style="font-weight:800;color:${isYes?'#059669':'#dc2626'}">${ans}</span></div>`;
                });
            }
            if(r.finish_images){try{const imgs=JSON.parse(r.finish_images);if(imgs.length){body+=section('📸','ẢNH SẢN PHẨM HOÀN THIỆN');imgs.forEach(img=>{body+=`<img src="${img}" style="max-width:100%;border-radius:8px;margin:4px 0" onerror="this.style.display='none'">`});}}catch(e){}}
            if(r.notes||r.finishing_notes){body+=section('📝','GHI CHÚ');body+=`<div style="background:#f8fafc;border-radius:8px;padding:10px;font-size:12px">${r.finishing_notes||r.notes||''}</div>`;}
            body+=`</div></div>`;
        }); body+=`</div>`; }
    }
    else if(step==='gui'){
        html = hdr('🚛','THÔNG TIN GỬI HÀNG',d.order_code,'#b45309,#d97706');
        body=`<div style="padding:16px 24px">`;
        body+=section('📦','THÔNG TIN ĐƠN HÀNG');
        body+=row('👤 Khách hàng',V(d.customer_name));
        body+=row('📱 SĐT',V(d.customer_phone),'#ea580c');
        body+=row('📍 Địa chỉ',V(d.address));
        body+=row('🏙️ Tỉnh / TP',V(d.province),'#dc2626');
        body+=row('👤 CSKH',V(d.cskh_name));
        body+=row('🎨 Thiết kế',V(d.design_source));
        body+=row('📊 Nguồn',V(d.data_source));
        body+=row('💼 Lĩnh vực',V(d.business_field));
        body+=row('📅 Ngày lên đơn',fmtD(d.order_date));
        body+=section('🚚','THÔNG TIN VẬN CHUYỂN');
        body+=row('👤 Người Gửi',V(d.shipped_by_name),'#059669');
        body+=row('📅 Ngày giờ gửi hàng',fmtDT(d.shipped_at));
        body+=row('🚛 Vận Chuyển Thực Tế',V(d.carrier_name),'#1e40af');
        let tcHtml = V(d.tracking_code);
        if(d.tracking_code&&d.carrier_tracking_url){const url=d.carrier_tracking_url.replace('{code}',d.tracking_code);tcHtml=`<a href="${url}" target="_blank" style="color:#4338ca;text-decoration:underline">${d.tracking_code} 🔗</a>`;}
        body+=row('📦 Mã vận đơn',tcHtml);
        body+=row('💰 Phí Gửi Hàng',d.shipping_fee?Number(d.shipping_fee).toLocaleString()+'đ':'—','#dc2626');
        body+=row('💳 Người Trả',V(d.shipping_fee_payer));
        body+=`</div>`;
    }

    html += body;
    html += `<div style="padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb"><button onclick="_tsCloseModal()" style="padding:12px 50px;border:none;border-radius:12px;background:#1e293b;color:white;font-size:14px;font-weight:800;cursor:pointer;transition:all .15s">Đóng</button></div>`;
    return html;
}
