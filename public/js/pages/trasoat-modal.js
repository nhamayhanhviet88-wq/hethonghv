// ========== TRA SOÁT — Step Detail Modals ==========
var _tsModalOrderId = null;
const _STEP_MAP = {'Cắt':'cat','In':'in','Ép':'ep','May':'may','Kiểm Tra CL':'qc','Hoàn Thiện':'ht','Gửi Hàng':'gui'};

function _tsCloseModal(){ const m=document.getElementById('tsModal'); if(m) m.remove(); }

function _tsShowImagePreview(url) {
    if (!url) return;
    const existing = document.getElementById('tsImagePreviewModal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'tsImagePreviewModal';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '100000';
    overlay.style.background = 'rgba(15, 23, 42, 0.9)';
    overlay.style.backdropFilter = 'blur(12px)';
    overlay.style.webkitBackdropFilter = 'blur(12px)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.cursor = 'zoom-out';
    overlay.style.animation = 'tsPreviewFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)';

    if (!document.getElementById('tsPreviewStyle')) {
        const style = document.createElement('style');
        style.id = 'tsPreviewStyle';
        style.textContent = `
            @keyframes tsPreviewFadeIn {
                from { opacity: 0; transform: scale(0.98); }
                to { opacity: 1; transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }

    overlay.onclick = function(e) {
        if (e.target === this || e.target.id === 'tsCloseImagePreviewBtn') {
            overlay.remove();
        }
    };

    const closeBtn = document.createElement('button');
    closeBtn.id = 'tsCloseImagePreviewBtn';
    closeBtn.innerText = '✕';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '24px';
    closeBtn.style.right = '24px';
    closeBtn.style.width = '48px';
    closeBtn.style.height = '48px';
    closeBtn.style.borderRadius = '50%';
    closeBtn.style.border = 'none';
    closeBtn.style.background = 'rgba(255, 255, 255, 0.15)';
    closeBtn.style.color = '#f8fafc';
    closeBtn.style.fontSize = '22px';
    closeBtn.style.fontWeight = '800';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.display = 'flex';
    closeBtn.style.alignItems = 'center';
    closeBtn.style.justifyContent = 'center';
    closeBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    closeBtn.style.transition = 'all 0.2s';
    closeBtn.onmouseover = () => { 
        closeBtn.style.background = 'rgba(255, 255, 255, 0.3)';
        closeBtn.style.transform = 'scale(1.05)';
    };
    closeBtn.onmouseout = () => { 
        closeBtn.style.background = 'rgba(255, 255, 255, 0.15)';
        closeBtn.style.transform = 'scale(1)';
    };

    const img = document.createElement('img');
    img.src = url;
    img.style.maxWidth = '90vw';
    img.style.maxHeight = '90vh';
    img.style.borderRadius = '12px';
    img.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.5)';
    img.style.objectFit = 'contain';
    img.style.cursor = 'default';
    img.onclick = (e) => e.stopPropagation();

    overlay.appendChild(closeBtn);
    overlay.appendChild(img);
    document.body.appendChild(overlay);
}

async function _tsOpenStepModal(orderId, stepName, itemId = null){
    const stepKey = _STEP_MAP[stepName]; if(!stepKey) return;
    _tsModalOrderId = orderId;
    _tsCloseModal();
    // Show loading overlay
    document.body.insertAdjacentHTML('beforeend',`<div id="tsModal" onclick="if(event.target===this)_tsCloseModal()" style="position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;animation:tsFadeIn .2s">
        <div style="background:white;border-radius:16px;width:90%;max-width:600px;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)" id="tsModalBody">
            <div style="text-align:center;padding:40px;color:#9ca3af">⏳ Đang tải báo cáo...</div>
        </div></div>`);
    try {
        let url = '/api/trasoat/orders/'+orderId+'/step/'+stepKey;
        if (itemId) url += '?item_id=' + itemId;
        const res = await apiCall(url);
        document.getElementById('tsModalBody').innerHTML = _tsRenderStepModal(stepKey, res);

        if (stepKey === 'ep' && res.records && res.records.length > 0) {
            res.records.forEach(function(r) {
                (async function() {
                    try {
                        var url = '/api/qlx/reminders?order_id=' + r.dht_order_id + '&dept=ep';
                        if (r.order_item_id) url += '&item_id=' + r.order_item_id;
                        var remRes = await apiCall(url);
                        var pressReminders = remRes.reminders || [];
                        var pressReminderIds = remRes.reminder_ids || [];
                        var pressViewedIds = remRes.viewed_ids || [];
                        
                        if (pressReminders.length > 0) {
                            var el = document.getElementById('_tsEpRemindersContainer_' + r.id);
                            if (!el) return;
                            
                            var b = '';
                            b += '<div style="margin-top:12px;background:#fee2e2;border:1.5px solid #fca5a5;padding:12px 14px;border-radius:12px;">';
                            b += '  <div style="font-weight:800;color:#991b1b;font-size:12px;margin-bottom:8px;text-transform:uppercase;display:flex;align-items:center;gap:6px">🔥 NHẮC NHỞ BỘ PHẬN ÉP:</div>';
                            b += '<div style="display:flex; flex-direction:column; gap:8px;">';
                            pressReminders.forEach(function(rem, remIdx) {
                                var remId = pressReminderIds[remIdx] || 0;
                                var isViewed = pressViewedIds.indexOf(remId) >= 0;
                                
                                b += '<div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border:1.5px solid ' + (isViewed ? '#10b981' : '#7c3aed') + '; border-radius:10px; background:#fff; gap:10px;">';
                                b += '  <span style="font-weight:700; font-size:13px; color:#1e293b; flex:1; text-align:left;">' + rem.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>';
                                if (isViewed) {
                                    b += '  <span style="font-size:10px; font-weight:800; color:#10b981; border:1.5px solid #10b981; padding:4px 8px; border-radius:6px; background:#fff; display:inline-flex; align-items:center; gap:4px; flex-shrink:0;">✅ Đã Xem và Làm</span>';
                                } else {
                                    b += '  <span style="font-size:10px; font-weight:800; color:#ef4444; border:1.5px solid #ef4444; padding:4px 8px; border-radius:6px; background:#fff; display:inline-flex; align-items:center; gap:4px; flex-shrink:0;">👉 Chưa Xem</span>';
                                }
                                b += '</div>';
                            });
                            b += '</div>';
                            b += '</div>';
                            
                            el.innerHTML = b;
                            el.style.display = 'block';
                        }
                    } catch(e) {
                        console.error('Lỗi tải nhắc nhở chi tiết:', e);
                    }
                })();
            });
        } else if (stepKey === 'cat' && res.records && res.records.length > 0) {
            res.records.forEach(function(r) {
                (async function() {
                    try {
                        var url = '/api/qlx/reminders?order_id=' + r.dht_order_id + '&dept=cat';
                        if (r.order_item_id) url += '&item_id=' + r.order_item_id;
                        url += '&record_type=cutting&record_id=' + r.id;
                        var remRes = await apiCall(url);
                        var cutReminders = remRes.reminders || [];
                        var cutReminderIds = remRes.reminder_ids || [];
                        var cutViewedIds = remRes.viewed_ids || [];
                        
                        if (cutReminders.length > 0) {
                            var el = document.getElementById('_tsCatRemindersContainer_' + r.id);
                            if (!el) return;
                            
                            var b = '';
                            b += '<div style="margin-top:12px;background:#fee2e2;border:1.5px solid #fca5a5;padding:12px 14px;border-radius:12px;">';
                            b += '  <div style="font-weight:800;color:#991b1b;font-size:12px;margin-bottom:8px;text-transform:uppercase;display:flex;align-items:center;gap:6px">🔔 QLX NHẮC NHỞ BỘ PHẬN CẮT:</div>';
                            b += '<div style="display:flex; flex-direction:column; gap:8px;">';
                            cutReminders.forEach(function(rem, remIdx) {
                                var remId = cutReminderIds[remIdx] || 0;
                                var isViewed = cutViewedIds.indexOf(remId) >= 0;
                                
                                b += '<div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border:1.5px solid ' + (isViewed ? '#10b981' : '#7c3aed') + '; border-radius:10px; background:#fff; gap:10px;">';
                                b += '  <span style="font-weight:700; font-size:13px; color:#1e293b; flex:1; text-align:left;">' + rem.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>';
                                if (isViewed) {
                                    b += '  <span style="font-size:10px; font-weight:800; color:#10b981; border:1.5px solid #10b981; padding:4px 8px; border-radius:6px; background:#fff; display:inline-flex; align-items:center; gap:4px; flex-shrink:0;">✅ Đã Xem và Làm</span>';
                                } else {
                                    b += '  <span style="font-size:10px; font-weight:800; color:#ef4444; border:1.5px solid #ef4444; padding:4px 8px; border-radius:6px; background:#fff; display:inline-flex; align-items:center; gap:4px; flex-shrink:0;">👉 Chưa Xem</span>';
                                }
                                b += '</div>';
                            });
                            b += '</div>';
                            b += '</div>';
                            
                            el.innerHTML = b;
                            el.style.display = 'block';
                        }
                    } catch(e) {
                        console.error('Lỗi tải nhắc nhở chi tiết cắt:', e);
                    }
                })();
            });
        } else if (stepKey === 'in' && res.records && res.records.length > 0) {
            const groups = [];
            const groupMap = {};
            let noIdCounter = 0;
            res.records.forEach(r => {
                let key = r.order_item_id;
                if (!key) {
                    key = 'no-id-' + (++noIdCounter);
                }
                if (!groupMap[key]) {
                    groupMap[key] = {
                        order_item_id: r.order_item_id,
                        print_items: []
                    };
                    groups.push(groupMap[key]);
                }
                const g = groupMap[key];
                g.print_items.push(r);
            });

            groups.forEach(function(g, i) {
                g.print_items.forEach(function(item) {
                    if (item.contractor_id) return;
                    (async function() {
                        try {
                            var url = '/api/qlx/reminders?order_id=' + item.dht_order_id + '&dept=in';
                            if (g.order_item_id) url += '&item_id=' + g.order_item_id;
                            url += '&record_type=printing&record_id=' + item.id;
                            
                            var remRes = await apiCall(url);
                            var printReminders = remRes.reminders || [];
                            var printReminderIds = remRes.reminder_ids || [];
                            var printViewedIds = remRes.viewed_ids || [];
                            
                            if (printReminders.length > 0) {
                                var cleanAccents = function(str) {
                                    if (!str) return '';
                                    return str.normalize('NFD')
                                              .replace(/[\u0300-\u036f]/g, '')
                                              .replace(/đ/g, 'd')
                                              .replace(/Đ/g, 'D');
                                };
                                
                                var uniqueFields = [];
                                g.print_items.forEach(function(pi) {
                                    var fName = pi.print_field || pi.field_name || '';
                                    if (fName && uniqueFields.indexOf(fName) === -1) {
                                        uniqueFields.push(fName);
                                    }
                                });
                                
                                var filteredReminders = [];
                                printReminders.forEach(function(rem, remIdx) {
                                    var remId = printReminderIds[remIdx] || 0;
                                    var isViewed = printViewedIds.indexOf(remId) >= 0;
                                    var remObj = { content: rem, id: remId, isViewed: isViewed };
                                    
                                    var matchedField = null;
                                    var remLower = rem.toLowerCase();
                                    var remClean = cleanAccents(remLower);
                                    
                                    for (var fIdx = 0; fIdx < uniqueFields.length; fIdx++) {
                                        var f = uniqueFields[fIdx];
                                        var fLower = f.toLowerCase();
                                        var fClean = cleanAccents(fLower);
                                        
                                        if (remLower.indexOf(fLower) >= 0 || remClean.indexOf(fClean) >= 0) {
                                            matchedField = f;
                                            break;
                                        }
                                        
                                        if (fLower.indexOf('pet') >= 0 && remLower.indexOf('pet') >= 0) { matchedField = f; break; }
                                        if (fLower.indexOf('decal') >= 0 && remLower.indexOf('decal') >= 0) { matchedField = f; break; }
                                        if (fLower.indexOf('thêu') >= 0 && (remLower.indexOf('thêu') >= 0 || remLower.indexOf('theu') >= 0)) { matchedField = f; break; }
                                        if (fLower.indexOf('lưới') >= 0 && (remLower.indexOf('lưới') >= 0 || remLower.indexOf('luoi') >= 0)) { matchedField = f; break; }
                                        if (fLower.indexOf('3d') >= 0 && remLower.indexOf('3d') >= 0) { matchedField = f; break; }
                                    }
                                    
                                    var currentFieldName = item.print_field || item.field_name || '';
                                    if (matchedField) {
                                        if (currentFieldName === matchedField) {
                                            filteredReminders.push(remObj);
                                        }
                                    } else {
                                        filteredReminders.push(remObj);
                                    }
                                });
                                
                                if (filteredReminders.length > 0) {
                                    var el = document.getElementById('_tsInRemindersContainer_' + item.id);
                                    if (!el) return;
                                    
                                    var b = '';
                                    b += '<div style="margin-top:12px;background:#fee2e2;border:1.5px solid #fca5a5;padding:12px 14px;border-radius:12px;">';
                                    b += '  <div style="font-weight:800;color:#991b1b;font-size:12px;margin-bottom:8px;text-transform:uppercase;display:flex;align-items:center;gap:6px">🔔 QLX NHẮC NHỞ BỘ PHẬN IN:</div>';
                                    b += '  <div style="display:flex; flex-direction:column; gap:8px;">';
                                    
                                    filteredReminders.forEach(function(rObj) {
                                        b += '<div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border:1.5px solid ' + (rObj.isViewed ? '#10b981' : '#7c3aed') + '; border-radius:10px; background:#fff; gap:10px;">';
                                        b += '  <span style="font-weight:700; font-size:13px; color:#1e293b; flex:1; text-align:left;">' + rObj.content.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>';
                                        if (rObj.isViewed) {
                                            b += '  <span style="font-size:10px; font-weight:800; color:#10b981; border:1.5px solid #10b981; padding:4px 8px; border-radius:6px; background:#fff; display:inline-flex; align-items:center; gap:4px; flex-shrink:0;">✅ Đã Xem và Làm</span>';
                                        } else {
                                            b += '  <span style="font-size:10px; font-weight:800; color:#ef4444; border:1.5px solid #ef4444; padding:4px 8px; border-radius:6px; background:#fff; display:inline-flex; align-items:center; gap:4px; flex-shrink:0;">👉 Chưa Xem</span>';
                                        }
                                        b += '</div>';
                                    });
                                    
                                    b += '  </div>';
                                    b += '</div>';
                                    
                                    el.innerHTML = b;
                                    el.style.display = 'block';
                                }
                            }
                        } catch(e) {
                            console.error('Lỗi tải nhắc nhở chi tiết in:', e);
                        }
                    })();
                });
            });
        }
        if (stepKey === 'ht' && res.records && res.records.length > 0) {
            res.records.forEach(function(r) {
                if (r.contractor_id) return; // Skip reminders for outsourced/Gia công
                (async function() {
                    try {
                        var url = '/api/qlx/reminders?order_id=' + r.dht_order_id + '&dept=hoanthien';
                        if (r.order_item_id) url += '&item_id=' + r.order_item_id;
                        url += '&record_type=finishing_records&record_id=' + r.id;
                        
                        var remRes = await apiCall(url);
                        var htReminders = remRes.reminders || [];
                        var htReminderIds = remRes.reminder_ids || [];
                        var htViewedIds = remRes.viewed_ids || [];
                        
                        if (htReminders.length > 0) {
                            var el = document.getElementById('_tsHtRemindersContainer_' + r.id);
                            if (!el) return;
                            
                            var b = '';
                            b += '<div style="margin-top:12px;background:#fff7ed;border:1.5px solid #ffedd5;padding:12px 14px;border-radius:12px;">';
                            b += '  <div style="font-weight:800;color:#c2410c;font-size:12px;margin-bottom:8px;text-transform:uppercase;display:flex;align-items:center;gap:6px">🍊 NHẮC NHỞ QLX HOÀN THIỆN:</div>';
                            b += '  <div style="display:flex; flex-direction:column; gap:8px;">';
                            htReminders.forEach(function(rem, remIdx) {
                                var remId = htReminderIds[remIdx] || 0;
                                var isViewed = htViewedIds.indexOf(remId) >= 0;
                                
                                b += '<div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border:1.5px solid ' + (isViewed ? '#10b981' : '#f97316') + '; border-radius:10px; background:#fff; gap:10px;">';
                                b += '  <span style="font-weight:700; font-size:13px; color:#1e293b; flex:1; text-align:left;">' + rem.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>';
                                if (isViewed) {
                                    b += '  <span style="font-size:10px; font-weight:800; color:#10b981; border:1.5px solid #10b981; padding:4px 8px; border-radius:6px; background:#fff; display:inline-flex; align-items:center; gap:4px; flex-shrink:0;">✅ Đã Xem và Làm</span>';
                                } else {
                                    b += '  <span style="font-size:10px; font-weight:800; color:#f97316; border:1.5px solid #f97316; padding:4px 8px; border-radius:6px; background:#fff; display:inline-flex; align-items:center; gap:4px; flex-shrink:0;">👉 Chưa Xem</span>';
                                }
                                b += '</div>';
                            });
                            b += '  </div>';
                            b += '</div>';
                            
                            el.innerHTML = b;
                            el.style.display = 'block';
                        }
                    } catch(e) {
                        console.error('Lỗi tải nhắc nhở chi tiết hoàn thiện:', e);
                    }
                })();
            });
        }
        if (stepKey === 'may' && res.records && res.records.length > 0) {
            res.records.forEach(function(r) {
                (async function() {
                    try {
                        var url = '/api/qlx/reminders?order_id=' + r.dht_order_id + '&dept=may';
                        if (r.order_item_id) url += '&item_id=' + r.order_item_id;
                        url += '&record_type=sewing_phan_to&record_id=' + r.id;
                        
                        var remRes = await apiCall(url);
                        var sewReminders = remRes.reminders || [];
                        var sewReminderIds = remRes.reminder_ids || [];
                        var sewViewedIds = remRes.viewed_ids || [];
                        
                        if (sewReminders.length > 0) {
                            var el = document.getElementById('_tsSewRemindersContainer_' + r.id);
                            if (!el) return;
                            
                            var b = '';
                            b += '<div style="margin-top:12px;background:#f5f3ff;border:1.5px solid #ddd6fe;padding:12px 14px;border-radius:12px;">';
                            b += '  <div style="font-weight:800;color:#6d28d9;font-size:12px;margin-bottom:8px;text-transform:uppercase;display:flex;align-items:center;gap:6px">📠 Nhắc Nhở Phân Tổ May / Kiểm Tra QC:</div>';
                            b += '  <div style="display:flex; flex-direction:column; gap:8px;">';
                            sewReminders.forEach(function(rem, remIdx) {
                                var remId = sewReminderIds[remIdx] || 0;
                                var isViewed = sewViewedIds.indexOf(remId) >= 0;
                                
                                b += '<div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border:1.5px solid ' + (isViewed ? '#10b981' : '#7c3aed') + '; border-radius:10px; background:#fff; gap:10px;">';
                                b += '  <span style="font-weight:700; font-size:13px; color:#1e293b; flex:1; text-align:left;">' + rem.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>';
                                if (isViewed) {
                                    b += '  <span style="font-size:10px; font-weight:800; color:#10b981; border:1.5px solid #10b981; padding:4px 8px; border-radius:6px; background:#fff; display:inline-flex; align-items:center; gap:4px; flex-shrink:0;">✅ Đã Xem và Làm</span>';
                                } else {
                                    b += '  <span style="font-size:10px; font-weight:800; color:#7c3aed; border:1.5px solid #7c3aed; padding:4px 8px; border-radius:6px; background:#fff; display:inline-flex; align-items:center; gap:4px; flex-shrink:0;">👉 Chưa Xem</span>';
                                }
                                b += '</div>';
                            });
                            b += '  </div>';
                            b += '</div>';
                            
                            el.innerHTML = b;
                            el.style.display = 'block';
                        }
                    } catch(e) {
                        console.error('Lỗi tải nhắc nhở chi tiết may:', e);
                    }
                })();
            });
        }
        if (stepKey === 'qc' && res.records && res.records.length > 0) {
            res.records.forEach(function(r) {
                (async function() {
                    try {
                        var url = '/api/qlx/reminders?order_id=' + r.dht_order_id + '&dept=may';
                        if (r.order_item_id) url += '&item_id=' + r.order_item_id;
                        url += '&record_type=sewing_phan_to&record_id=' + r.id;
                        
                        var remRes = await apiCall(url);
                        var sewReminders = remRes.reminders || [];
                        var sewReminderIds = remRes.reminder_ids || [];
                        var sewViewedIds = remRes.viewed_ids || [];
                        
                        if (sewReminders.length > 0) {
                            var el = document.getElementById('_tsQcSewRemindersContainer_' + r.id);
                            if (!el) return;
                            
                            var b = '';
                            b += '<div style="margin-top:12px;background:#f5f3ff;border:1.5px solid #ddd6fe;padding:12px 14px;border-radius:12px;">';
                            b += '  <div style="font-weight:800;color:#6d28d9;font-size:12px;margin-bottom:8px;text-transform:uppercase;display:flex;align-items:center;gap:6px">📠 Nhắc Nhở Phân Tổ May / Kiểm Tra QC:</div>';
                            b += '  <div style="display:flex; flex-direction:column; gap:8px;">';
                            sewReminders.forEach(function(rem, remIdx) {
                                var remId = sewReminderIds[remIdx] || 0;
                                var isViewed = sewViewedIds.indexOf(remId) >= 0;
                                
                                b += '<div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border:1.5px solid ' + (isViewed ? '#10b981' : '#7c3aed') + '; border-radius:10px; background:#fff; gap:10px;">';
                                b += '  <span style="font-weight:700; font-size:13px; color:#1e293b; flex:1; text-align:left;">' + rem.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>';
                                if (isViewed) {
                                    b += '  <span style="font-size:10px; font-weight:800; color:#10b981; border:1.5px solid #10b981; padding:4px 8px; border-radius:6px; background:#fff; display:inline-flex; align-items:center; gap:4px; flex-shrink:0;">✅ Đã Xem và Làm</span>';
                                } else {
                                    b += '  <span style="font-size:10px; font-weight:800; color:#7c3aed; border:1.5px solid #7c3aed; padding:4px 8px; border-radius:6px; background:#fff; display:inline-flex; align-items:center; gap:4px; flex-shrink:0;">👉 Chưa Xem</span>';
                                }
                                b += '</div>';
                            });
                            b += '  </div>';
                            b += '</div>';
                            
                            el.innerHTML = b;
                            el.style.display = 'block';
                        }
                    } catch(e) {
                        console.error('Lỗi tải nhắc nhở chi tiết QC (may):', e);
                    }
                })();
            });
        }
    } catch(e) {
        document.getElementById('tsModalBody').innerHTML = '<div style="padding:40px;text-align:center;color:#ef4444">❌ Chưa có dữ liệu hoặc chưa đến giai đoạn này</div><div style="padding:0 20px 20px;text-align:center"><button onclick="_tsCloseModal()" style="padding:10px 40px;border:none;border-radius:10px;background:#1e293b;color:white;font-weight:700;cursor:pointer">Đóng</button></div>';
    }
}

function _tsRenderStepModal(step, d){
    const fmtDT = t => { if(!t) return '—'; return new Date(t).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'}); };
    const fmtD = t => { if(!t) return '—'; return new Date(t).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}); };
    const fmtQCDate = t => { if(!t) return '—'; const d = new Date(t); const hh = d.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false }); const dd = d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit' }); return hh + ' ' + dd; };
    const fmtShortDT = t => { if(!t) return '—'; const d = new Date(t); const hh = d.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false }); const dd = d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit' }); return hh + ' ' + dd; };
    const V = v => v||'—';
    const hdr = (icon,title,sub,color) => `<div style="background:linear-gradient(135deg,${color});padding:18px 24px;border-radius:16px 16px 0 0;color:white;display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:16px;font-weight:900">${icon} ${title}</div><div style="font-size:13px;font-weight:900;color:#fff;margin-top:4px;letter-spacing:0.5px;background:rgba(0,0,0,0.15);padding:2px 8px;border-radius:6px;display:inline-block">${sub}</div></div><button onclick="_tsCloseModal()" style="width:32px;height:32px;border-radius:50%;border:none;background:rgba(255,255,255,.2);color:white;font-size:18px;cursor:pointer;font-weight:800">✕</button></div>`;
    const row = (label,val,valColor) => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9"><span style="color:#64748b;font-weight:600">${label}</span><span style="font-weight:700;color:${valColor||'#1e293b'}">${val}</span></div>`;
    const section = (icon,title) => `<div style="font-weight:800;color:#1e293b;margin:16px 0 8px;font-size:13px">${icon} ${title}</div>`;

    let html = '', body = '';
    if(step==='cat'){
        html = hdr('✂️','CHI TIẾT ĐƠN CẮT',d.order_code,'#16a34a,#15803d');
        if(!d.records||!d.records.length){
            if (d.items_status && d.items_status.length > 0) {
                body = `<div style="padding:16px 24px;display:flex;flex-direction:column;gap:14px">`;
                body += `<div style="text-align:center;padding:12px;background:#fffbeb;border:1.5px solid #fef3c7;border-radius:12px;color:#b45309;font-weight:700;font-size:13px">
                            ⚠️ Đơn hàng chưa có dữ liệu cắt
                         </div>`;
                d.items_status.forEach((item, index) => {
                    const itemTitle = item.description ? `${d.order_code} - Phiếu ${index + 1} — ${item.description}` : `${d.order_code} - Phiếu ${index + 1}`;
                    
                    let statusLabel = '';
                    let statusColor = '';
                    let statusBg = '';
                    
                    if (item.has_cutter_claimed) {
                        statusLabel = 'Đã nhận cắt';
                        statusColor = '#166534';
                        statusBg = '#dcfce7';
                    } else if (item.fabric_arrived && item.has_print_assignment) {
                        statusLabel = 'Chờ thợ nhận';
                        statusColor = '#1e40af';
                        statusBg = '#dbeafe';
                    } else {
                        statusLabel = 'Chưa đủ điều kiện';
                        statusColor = '#991b1b';
                        statusBg = '#fee2e2';
                    }

                    body += `<div style="border:1.5px solid #e2e8f0;border-radius:14px;background:white;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.02)">
                                <div style="background:#f8fafc;padding:12px 16px;border-bottom:1.5px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
                                    <span style="font-weight:800;color:#1e293b;font-size:13px">${itemTitle}</span>
                                    <span style="padding:3px 10px;border-radius:6px;background:${statusBg};color:${statusColor};font-size:11px;font-weight:800">${statusLabel}</span>
                                </div>
                                <div style="padding:14px 16px;display:flex;flex-direction:column;gap:10px">
                                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:600">
                                        <span style="color:#64748b">1. Chuẩn bị vải</span>
                                        <span style="padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;${item.fabric_arrived ? 'background:#d1fae5;color:#065f46' : 'background:#fee2e2;color:#991b1b'}">${item.fabric_arrived ? '🟢 Vải đã về kho' : '🔴 Vải chưa về kho'}</span>
                                    </div>
                                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:600;border-top:1px solid #f1f5f9;padding-top:10px">
                                        <span style="color:#64748b">2. Phân công in</span>
                                        <span style="padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;${item.has_print_assignment ? 'background:#d1fae5;color:#065f46' : 'background:#fee2e2;color:#991b1b'}">${item.has_print_assignment ? '🟢 Đã phân công in' : '🔴 Chưa phân công in'}</span>
                                    </div>`;

                    let detailMsg = '';
                    let detailColor = '';
                    if (item.has_cutter_claimed) {
                        detailMsg = 'Đơn đã được thợ cắt nhận và đang xử lý.';
                        detailColor = '#166534';
                    } else if (item.fabric_arrived && item.has_print_assignment) {
                        detailMsg = 'Đã đủ điều kiện. Đang chờ thợ cắt nhận đơn.';
                        detailColor = '#1e40af';
                    } else {
                        const missing = [];
                        if (!item.fabric_arrived) missing.push('vải chưa về');
                        if (!item.has_print_assignment) missing.push('chưa phân công in');
                        detailMsg = `Chưa sẵn sàng nhận cắt do: ${missing.join(' & ')}.`;
                        detailColor = '#b45309';
                    }

                    body += `        <div style="margin-top:4px;padding:10px;background:#f8fafc;border-radius:8px;font-size:11px;color:${detailColor};font-weight:700;text-align:center">
                                        ℹ️ ${detailMsg}
                                     </div>
                                </div>
                             </div>`;
                });
                body += `</div>`;
            } else {
                body = '<div style="padding:40px 24px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:16px;margin:24px;box-shadow:0 4px 12px rgba(0,0,0,0.02)"><div style="font-size:32px;margin-bottom:12px;filter:grayscale(100%);opacity:0.6">✂️</div><div style="font-size:13px;font-weight:700;color:#64748b">Chưa có dữ liệu cắt</div></div>';
            }
        }
        else { body+=`<div style="padding:16px 24px;display:flex;flex-direction:column;gap:14px">`; d.records.forEach((r,i)=>{
            const title = `📋 ${r.product_name || r.item_description || 'Sản phẩm'}`;
            body+=`<div style="border:1.5px solid #e2e8f0;border-radius:14px;overflow:hidden;background:white;box-shadow:0 2px 8px rgba(0,0,0,.04)">`;
            body+=`<div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #e2e8f0"><span style="font-weight:800;color:#166534;font-size:13px">${title}</span><span style="padding:3px 10px;border-radius:6px;background:${r.is_cut_done?'#d1fae5':'#fef3c7'};color:${r.is_cut_done?'#065f46':'#92400e'};font-size:11px;font-weight:800">${r.is_cut_done?'✅ Đã cắt xong':'⏳ Đang cắt'}</span></div>`;
            body+=`<div style="padding:14px 16px">`;
            body+=`<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
                <div style="background:#eff6ff;border-radius:8px;padding:8px 14px;flex:1"><div style="font-size:10px;color:#3b82f6;font-weight:700">📅 NGÀY BÀN GIAO</div><div style="font-weight:800;color:#1e40af">${fmtShortDT(r.created_at)}</div></div>
                <div style="background:${r.is_cut_done?'#dcfce7':'#fef3c7'};border-radius:8px;padding:8px 14px;flex:1"><div style="font-size:10px;color:${r.is_cut_done?'#16a34a':'#f59e0b'};font-weight:700">✂️ HOÀN THÀNH CẮT</div><div style="font-weight:800;color:${r.is_cut_done?'#166534':'#92400e'}">${r.is_cut_done?fmtShortDT(r.cut_done_at):'⏳ Đang cắt'}</div></div>
            </div>`;
            body+=row('🧵 Chất liệu',V(r.material_name),'#7c3aed');
            body+=row('🎨 Màu',V(r.fabric_color),'#1e293b');
            body+=row('👤 NV Cắt',V(r.cutter_name),'#059669');
            body+=row('📊 SL Đơn',(r.order_quantity||0)+' sp');
            if(r.rolls&&r.rolls.length){
                body+=section('🧶','CÂY VẢI ĐÃ CHỌN ('+r.rolls.length+')');
                r.rolls.forEach(rl=>{ body+=`<div style="padding:6px 12px;background:#f8fafc;border-radius:8px;margin:4px 0;font-size:12px;font-weight:600">${rl.material_name} - ${rl.color} - ${rl.kg}kg</div>`; });
            }
            body+=`<div id="_tsCatRemindersContainer_${r.id}" style="display:none;margin-top:12px"></div>`;
            body+=`</div></div>`;
        }); body+=`</div>`; }
    }
    else if(step==='in'){
        html = hdr('🖨️','BÁO CÁO IN',d.order_code,'#7c3aed,#6d28d9');
        if(!d.records||!d.records.length){ body='<div style="padding:40px 24px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:16px;margin:24px;box-shadow:0 4px 12px rgba(0,0,0,0.02)"><div style="font-size:32px;margin-bottom:12px;filter:grayscale(100%);opacity:0.6">🖨️</div><div style="font-size:14px;font-weight:800;color:#991b1b;margin-bottom:6px">Chưa có dữ liệu in</div><div style="font-size:12px;font-weight:600;color:#64748b">Do Quản Lý Xưởng chưa phân công thợ in / gia công</div></div>'; }
        else {
            body+=`<div style="padding:16px 24px;display:flex;flex-direction:column;gap:14px">`;
            // Group by order_item_id
            const groups = [];
            const groupMap = {};
            let noIdCounter = 0;
            d.records.forEach(r => {
                let key = r.order_item_id;
                if (!key) {
                    key = 'no-id-' + (++noIdCounter);
                }
                if (!groupMap[key]) {
                    groupMap[key] = {
                        order_item_id: r.order_item_id,
                        item_description: r.item_description,
                        product_name: r.product_name,
                        order_quantity: r.order_quantity,
                        handover_date: null,
                        latest_done_date: null,
                        print_items: []
                    };
                    groups.push(groupMap[key]);
                }
                const g = groupMap[key];
                g.print_items.push(r);
                
                if (r.print_done_at) {
                    const dDate = new Date(r.print_done_at);
                    if (!g.latest_done_date || dDate > new Date(g.latest_done_date)) {
                        g.latest_done_date = r.print_done_at;
                    }
                }
                if (r.created_at) {
                    const hDate = new Date(r.created_at);
                    if (!g.handover_date || hDate < new Date(g.handover_date)) {
                        g.handover_date = r.created_at;
                    }
                }
            });

            groups.forEach((g, i) => {
                const title = `🖨️ ${d.order_code} — Phiếu ${i+1}`;
                
                const allDone = g.print_items.every(r => r.is_print_done);
                const allOutsourced = g.print_items.every(r => r.contractor_id);
                const allDoneOrGC = g.print_items.every(r => r.is_print_done || r.contractor_id);
                
                const statusText = allDone ? '✅ Đã in xong' : (allOutsourced ? '⏳ Đã bàn giao GC' : (allDoneOrGC ? '✅ Hoàn thành' : '⏳ Đang in'));
                const statusBg = allDone ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)' : (allOutsourced ? 'linear-gradient(135deg,#e0f2fe,#bae6fd)' : 'linear-gradient(135deg,#eff6ff,#dbeafe)');
                const statusBadgeBg = allDone ? '#d1fae5' : (allOutsourced ? '#e0f2fe' : '#fef3c7');
                const statusBadgeColor = allDone ? '#065f46' : (allOutsourced ? '#0369a1' : '#92400e');

                body+=`<div style="border:1.5px solid #e2e8f0;border-radius:14px;overflow:hidden;background:white;box-shadow:0 2px 8px rgba(0,0,0,.04)">`;
                body+=`<div style="background:${statusBg};padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #e2e8f0"><span style="font-weight:800;color:#5b21b6;font-size:13px">${title}</span><span style="padding:3px 10px;border-radius:6px;background:${statusBadgeBg};color:${statusBadgeColor};font-size:11px;font-weight:800">${statusText}</span></div>`;
                body+=`<div style="padding:14px 16px">`;
                body+=`<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
                    <div style="background:#eff6ff;border-radius:8px;padding:8px 14px;flex:1"><div style="font-size:10px;color:#3b82f6;font-weight:700">📅 NGÀY BÀN GIAO ĐẦU</div><div style="font-weight:800;color:#1e40af">${fmtShortDT(g.handover_date)}</div></div>
                    <div style="background:${allDoneOrGC?'#dcfce7':'#fef3c7'};border-radius:8px;padding:8px 14px;flex:1"><div style="font-size:10px;color:${allDoneOrGC?'#16a34a':'#f59e0b'};font-weight:700">🖨️ HOÀN THÀNH IN CUỐI</div><div style="font-weight:800;color:${allDoneOrGC?'#166534':'#92400e'}">${allDoneOrGC && g.latest_done_date ? fmtShortDT(g.latest_done_date) : statusText}</div></div>
                </div>`;
                body+=row('📦 Tên SP',V(g.product_name || g.item_description));
                body+=row('👤 CSKH',V(d.cskh_name));
                body+=row('📊 Số Lượng Theo Đơn',g.order_quantity ? g.order_quantity+' Áo' : '—','#1e40af');
                
                body+=section('📋','DANH SÁCH CHI TIẾT IN / THÊU');
                g.print_items.forEach((r, idx) => {
                    const printType = V(r.print_field || r.field_name);
                    const printerDisplay = r.contractor_name 
                        ? `🏭 Gia công: ${r.contractor_name}`
                        : (r.printer_name ? `👤 Thợ in: ${r.printer_name}` : `👤 Thợ in: Chưa nhận`);
                    
                    const itemStatusText = r.is_print_done 
                        ? `✅ Đã in xong (${fmtShortDT(r.print_done_at)})` 
                        : (r.contractor_id ? `⏳ Đã bàn giao GC` : '⏳ Đang in');
                    const itemStatusBg = r.is_print_done ? '#d1fae5' : (r.contractor_id ? '#e0f2fe' : '#fef3c7');
                    const itemStatusColor = r.is_print_done ? '#065f46' : (r.contractor_id ? '#0369a1' : '#92400e');

                    body += `<div style="padding:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;font-size:12px">
                        <div style="display:flex;justify-content:space-between;margin-bottom:4px;border-bottom:1px dashed #cbd5e1;padding-bottom:4px">
                            <span style="font-weight:800;color:#5b21b6">${idx+1}. ${printType}</span>
                            <span style="font-weight:800;background:${itemStatusBg};color:${itemStatusColor};padding:1px 6px;border-radius:4px;font-size:11px">${itemStatusText}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;color:#64748b;font-size:11px;margin-bottom:4px">
                            <span>${printerDisplay}</span>
                        </div>`;

                    if (!r.contractor_id && (r.current_roll || r.print_meters || r.roll_start_qty || r.roll_end_qty)) {
                        body += `<div style="margin-top:6px;padding:6px;background:white;border-radius:6px;border:1px solid #e2e8f0;font-size:11px">`;
                        if (r.current_roll) {
                            body += `<div style="margin-bottom:4px">🧻 Cây in: <strong style="color:#0f766e">${r.current_roll}</strong></div>`;
                        }
                        if (r.print_meters || r.roll_start_qty || r.roll_end_qty) {
                            body += `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;text-align:center">
                                <div style="background:#eff6ff;padding:4px;border-radius:4px"><div style="font-size:8px;color:#1e40af;font-weight:700">ĐẦU CUỘN</div><div style="font-weight:800;color:#1e40af">${r.roll_start_qty||0}m</div></div>
                                <div style="background:#fffbeb;padding:4px;border-radius:4px"><div style="font-size:8px;color:#92400e;font-weight:700">SỐ MÉT IN</div><div style="font-weight:800;color:#dc2626">${r.print_meters||0}m</div></div>
                                <div style="background:#f1f5f9;padding:4px;border-radius:4px"><div style="font-size:8px;color:#475569;font-weight:700">CUỐI CUỘN</div><div style="font-weight:800;color:#475569">${r.roll_end_qty||0}m</div></div>
                            </div>`;
                        }
                        body += `</div>`;
                    }

                    if (r.image_url) {
                        body += `<div style="margin-top:6px">
                            <div style="font-weight:700;font-size:11px;color:#475569;margin-bottom:2px">📸 File in/thiết kế:</div>
                            <img src="${r.image_url}" style="max-width:120px;max-height:120px;border-radius:6px;object-fit:cover;cursor:pointer" onclick="_tsShowImagePreview('${r.image_url}')" onerror="this.style.display='none'">
                        </div>`;
                    }

                    body += `<div id="_tsInRemindersContainer_${r.id}" style="display:none;margin-top:12px"></div>`;
                    body += `</div>`;
                });

                body+=`</div></div>`;
            });
            body+=`</div>`;
        }
    }
    else if(step==='ep'){
        html = hdr('🔥','CHI TIẾT PHIẾU ÉP',d.order_code,'#ea580c,#c2410c');
        if(!d.records||!d.records.length){
            if (d.items_status && d.items_status.length > 0) {
                body = `<div style="padding:16px 24px;display:flex;flex-direction:column;gap:14px">`;
                body += `<div style="text-align:center;padding:12px;background:#fff5f5;border:1.5px solid #fee2e2;border-radius:12px;color:#991b1b;font-weight:700;font-size:13px">
                            ⚠️ Đơn hàng chưa có dữ liệu ép
                         </div>`;
                
                d.items_status.forEach((item, index) => {
                    const itemTitle = item.description 
                        ? `${d.order_code} - Phiếu ${index + 1} — ${item.description}` 
                        : `${d.order_code} - Phiếu ${index + 1}`;
                    
                    let statusLabel = '';
                    let statusColor = '';
                    let statusBg = '';
                    
                    if (item.has_presser_claimed) {
                        statusLabel = 'Đã nhận ép';
                        statusColor = '#166534';
                        statusBg = '#dcfce7';
                    } else if (item.is_cut_done && item.is_print_done) {
                        statusLabel = 'Chờ thợ nhận';
                        statusColor = '#1e40af';
                        statusBg = '#dbeafe';
                    } else {
                        statusLabel = 'Chưa đủ điều kiện';
                        statusColor = '#991b1b';
                        statusBg = '#fee2e2';
                    }

                    // Print status label
                    let printStatusLabel = '';
                    let printStatusStyle = '';
                    if (item.has_print_assignment) {
                        if (item.is_print_done) {
                            printStatusLabel = '🟢 Đã in xong';
                            printStatusStyle = 'background:#d1fae5;color:#065f46';
                        } else {
                            printStatusLabel = '🔴 Chưa in xong';
                            printStatusStyle = 'background:#fee2e2;color:#991b1b';
                        }
                    } else {
                        printStatusLabel = '⚪ Không yêu cầu in PET/Decal';
                        printStatusStyle = 'background:#f1f5f9;color:#475569';
                    }

                    body += `<div style="border:1.5px solid #e2e8f0;border-radius:14px;background:white;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.02)">
                                <div style="background:#f8fafc;padding:12px 16px;border-bottom:1.5px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
                                    <span style="font-weight:800;color:#1e293b;font-size:13px">${itemTitle}</span>
                                    <span style="padding:3px 10px;border-radius:6px;background:${statusBg};color:${statusColor};font-size:11px;font-weight:800">${statusLabel}</span>
                                </div>
                                <div style="padding:14px 16px;display:flex;flex-direction:column;gap:10px">
                                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:600">
                                        <span style="color:#64748b">1. Bộ phận cắt</span>
                                        <span style="padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;${item.is_cut_done ? 'background:#d1fae5;color:#065f46' : 'background:#fee2e2;color:#991b1b'}">${item.is_cut_done ? '🟢 Đã cắt xong' : '🔴 Chưa cắt xong'}</span>
                                    </div>
                                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:600;border-top:1px solid #f1f5f9;padding-top:10px">
                                        <span style="color:#64748b">2. Bộ phận in (PET/Decal)</span>
                                        <span style="padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;${printStatusStyle}">${printStatusLabel}</span>
                                    </div>`;

                    let detailMsg = '';
                    let detailColor = '';
                    if (item.has_presser_claimed) {
                        detailMsg = 'Đơn đã được thợ nhận ép và đang xử lý.';
                        detailColor = '#166534';
                    } else if (item.is_cut_done && item.is_print_done) {
                        detailMsg = 'Đã đủ điều kiện. Đang chờ thợ ép nhận đơn.';
                        detailColor = '#1e40af';
                    } else {
                        const missing = [];
                        if (!item.is_cut_done) missing.push('chưa cắt xong');
                        if (!item.is_print_done) missing.push('chưa in xong');
                        detailMsg = `Chưa sẵn sàng nhận ép do: ${missing.join(' & ')}.`;
                        detailColor = '#b45309';
                    }

                    body += `        <div style="margin-top:4px;padding:10px;background:#f8fafc;border-radius:8px;font-size:11px;color:${detailColor};font-weight:700;text-align:center">
                                        ℹ️ ${detailMsg}
                                     </div>
                                </div>
                             </div>`;
                });
                body += `</div>`;
            } else {
                body = '<div style="padding:40px 24px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:16px;margin:24px;box-shadow:0 4px 12px rgba(0,0,0,0.02)"><div style="font-size:32px;margin-bottom:12px;filter:grayscale(100%);opacity:0.6">🔥</div><div style="font-size:13px;font-weight:700;color:#64748b">Chưa có dữ liệu ép</div></div>';
            }
        }
        else { body+=`<div style="padding:16px 24px;display:flex;flex-direction:column;gap:14px">`; d.records.forEach((r,i)=>{
            const title = `🔥 ${r.product_name || r.item_description || 'Sản phẩm'}`;
            body+=`<div style="border:1.5px solid #e2e8f0;border-radius:14px;overflow:hidden;background:white;box-shadow:0 2px 8px rgba(0,0,0,.04)">`;
            body+=`<div style="background:linear-gradient(135deg,#fff7ed,#ffedd5);padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #e2e8f0"><span style="font-weight:800;color:#c2410c;font-size:13px">${title}</span><span style="padding:3px 10px;border-radius:6px;background:${r.is_reported?'#d1fae5':'#fef3c7'};color:${r.is_reported?'#065f46':'#92400e'};font-size:11px;font-weight:800">${r.is_reported?'✅ Đã ép xong':'⏳ Đang ép'}</span></div>`;
            body+=`<div style="padding:14px 16px">`;
            body+=`<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
                <div style="background:#eff6ff;border-radius:8px;padding:8px 14px;flex:1"><div style="font-size:10px;color:#3b82f6;font-weight:700">📅 NGÀY BÀN GIAO</div><div style="font-weight:800;color:#1e40af">${fmtShortDT(r.created_at)}</div></div>
                <div style="background:${r.is_reported?'#dcfce7':'#fef3c7'};border-radius:8px;padding:8px 14px;flex:1"><div style="font-size:10px;color:${r.is_reported?'#16a34a':'#f59e0b'};font-weight:700">🔥 HOÀN THÀNH ÉP</div><div style="font-weight:800;color:${r.is_reported?'#166534':'#92400e'}">${r.is_reported?fmtShortDT(r.reported_at):'⏳ Đang ép'}</div></div>
            </div>`;
            body+=row('🧵 Chất liệu',V(r.material_name));
            body+=row('🎨 Màu',V(r.fabric_color));
            body+=row('👤 CSKH',V(d.cskh_name));
            body+=row('👷 NV Ép',V(r.presser_name),'#ea580c');
            body+=row('📊 SL Cắt',r.order_quantity+' sp');
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
            if(r.press_images){try{const imgs=JSON.parse(r.press_images);if(imgs.length){body+=section('📸','HÌNH ẢNH ÉP');imgs.forEach(img=>{body+=`<img src="${img}" style="max-width:100%;border-radius:8px;margin:4px 0;cursor:pointer" onclick="_tsShowImagePreview('${img}')" onerror="this.style.display='none'">`});}}catch(e){}}
            
            // Container for QLX reminders
            body+=`<div id="_tsEpRemindersContainer_${r.id}" style="display:none;margin-top:12px"></div>`;

            body+=`</div></div>`;
        }); body+=`</div>`; }
    }
    else if(step==='may'){
        html = hdr('🧵','CHI TIẾT BÀN GIAO MAY',d.order_code,'#1e3a5f,#1e40af');
        if(!d.records||!d.records.length){
            const isManager = currentUser && ['giam_doc','quan_ly','quan_ly_cap_cao','truong_phong'].includes(currentUser.role);
            const actionBtn = isManager ? '<button onclick="_tsCloseModal(); navigate(\'congviecqlx\');" style="margin-top:14px;padding:8px 20px;background:linear-gradient(135deg,#b45309,#d97706);color:white;border:none;border-radius:10px;font-weight:800;font-size:12px;cursor:pointer;box-shadow:0 4px 12px rgba(180,83,9,0.2);transition:all 0.2s" onmouseover="this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.transform=\'none\'">⚡ ĐI ĐẾN PHÂN CÔNG NGAY</button>' : '';
            body = `<div style="padding:32px 24px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:linear-gradient(135deg,#fffbeb,#fef3c7);border:2px dashed #f59e0b;border-radius:16px;margin:24px;box-shadow:0 10px 25px rgba(245,158,11,0.15);animation:_tsWarningPulse 2s infinite alternate">
                <div style="width:56px;height:56px;background:#fef3c7;border:2px solid #f59e0b;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:16px;box-shadow:0 4px 12px rgba(245,158,11,0.2)">⚠️</div>
                <h3 style="font-size:15px;font-weight:900;color:#92400e;margin:0 0 10px 0;text-transform:uppercase;letter-spacing:0.5px;line-height:1.4">QUẢN LÝ XƯỞNG CHƯA PHÂN CÔNG MAY</h3>
                <p style="font-size:13px;font-weight:600;color:#b45309;line-height:1.6;margin:0;max-width:380px;">Hãy liên hệ <strong style="color:#78350f;font-weight:800">QUẢN LÝ XƯỞNG</strong> phân công cho nhà may.</p>
                ${actionBtn}
            </div>
            <style>
                @keyframes _tsWarningPulse {
                    from { box-shadow:0 4px 15px rgba(245,158,11,0.1); transform:scale(1); }
                    to { box-shadow:0 10px 25px rgba(245,158,11,0.25); transform:scale(1.01); }
                }
            </style>`;
        }
        else {
            body+=`<div style="padding:16px 24px;display:flex;flex-direction:column;gap:14px">`;
            // Group by order_item_id
            const groups = [];
            const groupMap = {};
            let noIdCounter = 0;
            d.records.forEach(r => {
                let key = r.order_item_id;
                if (!key) {
                    key = 'no-id-' + (++noIdCounter);
                }
                if (!groupMap[key]) {
                    groupMap[key] = {
                        order_item_id: r.order_item_id,
                        item_description: r.item_description,
                        product_name: r.product_name,
                        material_name: r.material_name,
                        fabric_color: r.fabric_color,
                        order_quantity: r.order_quantity,
                        actual_quantity: r.actual_quantity,
                        handover_date: null,
                        latest_done_date: null,
                        assignments: []
                    };
                    groups.push(groupMap[key]);
                }
                const g = groupMap[key];
                g.assignments.push(r);
                
                if (r.done_date) {
                    const dDate = new Date(r.done_date);
                    if (!g.latest_done_date || dDate > new Date(g.latest_done_date)) {
                        g.latest_done_date = r.done_date;
                    }
                }
                if (r.handover_date) {
                    const hDate = new Date(r.handover_date);
                    if (!g.handover_date || hDate < new Date(g.handover_date)) {
                        g.handover_date = r.handover_date;
                    }
                }
            });

            groups.forEach((g, i) => {
                const title = `🧵 ${g.item_description || 'Sản phẩm'} — ${d.order_code} — Phiếu ${i+1}`;
                const cardDone = g.assignments.every(r => r.done_date);
                const cardDoneDate = cardDone ? g.latest_done_date : null;
                const statusText = cardDone ? '✅ Đã may xong' : '⏳ Đang may';
                const statusBg = cardDone ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)' : 'linear-gradient(135deg,#eff6ff,#dbeafe)';
                const statusBadgeBg = cardDone ? '#d1fae5' : '#fef3c7';
                const statusBadgeColor = cardDone ? '#065f46' : '#92400e';

                body+=`<div style="border:1.5px solid #e2e8f0;border-radius:14px;overflow:hidden;background:white;box-shadow:0 2px 8px rgba(0,0,0,.04)">`;
                body+=`<div style="background:${statusBg};padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #e2e8f0"><span style="font-weight:800;color:#1e40af;font-size:13px">${title}</span><span style="padding:3px 10px;border-radius:6px;background:${statusBadgeBg};color:${statusBadgeColor};font-size:11px;font-weight:800">${statusText}</span></div>`;
                body+=`<div style="padding:14px 16px">`;
                body+=`<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
                    <div style="background:#eff6ff;border-radius:8px;padding:8px 14px;flex:1"><div style="font-size:10px;color:#3b82f6;font-weight:700">📅 NGÀY BÀN GIAO ĐẦU</div><div style="font-weight:800;color:#1e40af">${fmtShortDT(g.handover_date)}</div></div>
                    <div style="background:${cardDone?'#dcfce7':'#fef3c7'};border-radius:8px;padding:8px 14px;flex:1"><div style="font-size:10px;color:${cardDone?'#16a34a':'#f59e0b'};font-weight:700">🧵 HOÀN THÀNH MAY</div><div style="font-weight:800;color:${cardDone?'#166534':'#92400e'}">${cardDone?fmtShortDT(cardDoneDate):'⏳ Đang may'}</div></div>
                </div>`;
                body+=row('📦 Tên SP',V(g.product_name));
                body+=row('👤 CSKH',V(d.cskh_name));
                body+=row('🧵 Chất liệu',V(g.material_name));
                body+=row('🎨 Màu',V(g.fabric_color));
                
                const totalAssignedQty = g.assignments.reduce((sum, r) => sum + (r.quantity || 0), 0);
                body+=row('📊 SL Theo Đơn', (g.order_quantity || 0) + ' sp', '#1e40af');
                body+=row('📊 SL Cắt Thực Tế', (g.actual_quantity || 0) + ' sp', '#dc2626');
                body+=row('📊 SL Đã Phân Công', totalAssignedQty + ' sp', '#059669');

                body+=section('🏭', 'PHÂN CÔNG NHÀ MAY / TỔ MAY');
                g.assignments.forEach((r, idxAss) => {
                    const sewerDisplay = (r.sewer_name||r.contractor_name||r.team_name) 
                        ? '🏭 ' + (r.sewer_name||r.contractor_name||r.team_name)
                        : `<span style="display:inline-block;padding:2px 8px;border-radius:6px;background:#fef2f2;border:1px solid #fca5a5;color:#ef4444;font-size:11px;font-weight:800">Chưa Chia Tổ May</span>`;
                    
                    const assStatus = r.done_date ? `✅ Đã xong (${fmtShortDT(r.done_date)})` : '⏳ Đang may';
                    const assStatusColor = r.done_date ? '#059669' : '#b45309';

                    body+=`<div style="padding:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;font-size:12px">
                        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                            <span style="font-weight:800;color:#1e293b">${idxAss+1}. ${sewerDisplay}</span>
                            <span style="font-weight:800;color:#dc2626">${r.quantity || 0} sp</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;color:#64748b;font-size:11px">
                            <span>Bàn giao: ${fmtShortDT(r.handover_date)}</span>
                            <span style="font-weight:700;color:${assStatusColor}">${assStatus}</span>
                        </div>
                        <div id="_tsSewRemindersContainer_${r.id}" style="display:none;margin-top:12px"></div>
                    </div>`;
                });

                body+=`</div></div>`;
            });
            body+=`</div>`;
        }
    }
    else if(step==='qc'){
        html = hdr('🔍','CHI TIẾT KIỂM TRA CHẤT LƯỢNG (QC)',d.order_code,'#0f766e,#0d9488');
        if(!d.records||!d.records.length){
            if (d.items_status && d.items_status.length > 0) {
                body = `<div style="padding:16px 24px;display:flex;flex-direction:column;gap:14px">`;
                body += `<div style="text-align:center;padding:12px;background:#fff5f5;border:1.5px solid #fee2e2;border-radius:12px;color:#991b1b;font-weight:700;font-size:13px">
                            ⚠️ Đơn hàng chưa có dữ liệu QC
                         </div>`;
                
                d.items_status.forEach((item, index) => {
                    const itemTitle = item.description 
                        ? `${d.order_code} - Phiếu ${index + 1} — ${item.description}` 
                        : `${d.order_code} - Phiếu ${index + 1}`;
                    
                    let statusLabel = '';
                    let statusColor = '';
                    let statusBg = '';
                    
                    if (item.is_qc_done) {
                        statusLabel = 'Hoàn thành QC';
                        statusColor = '#166534';
                        statusBg = '#dcfce7';
                    } else if (item.is_sewing_done) {
                        statusLabel = 'Chờ QC';
                        statusColor = '#1e40af';
                        statusBg = '#dbeafe';
                    } else {
                        statusLabel = 'Chưa đủ điều kiện';
                        statusColor = '#991b1b';
                        statusBg = '#fee2e2';
                    }

                    body += `<div style="border:1.5px solid #e2e8f0;border-radius:14px;background:white;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.02)">
                                <div style="background:#f8fafc;padding:12px 16px;border-bottom:1.5px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
                                    <span style="font-weight:800;color:#1e293b;font-size:13px">${itemTitle}</span>
                                    <span style="padding:3px 10px;border-radius:6px;background:${statusBg};color:${statusColor};font-size:11px;font-weight:800">${statusLabel}</span>
                                </div>
                                <div style="padding:14px 16px;display:flex;flex-direction:column;gap:10px">
                                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:600">
                                        <span style="color:#64748b">1. Phân công may</span>
                                        <span style="padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;${item.has_sewing_record ? 'background:#d1fae5;color:#065f46' : 'background:#fee2e2;color:#991b1b'}">${item.has_sewing_record ? '🟢 Đã phân công' : '🔴 Chưa phân công'}</span>
                                    </div>
                                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:600;border-top:1px solid #f1f5f9;padding-top:10px">
                                        <span style="color:#64748b">2. Tiến độ may</span>
                                        <span style="padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;${item.is_sewing_done ? 'background:#d1fae5;color:#065f46' : 'background:#fee2e2;color:#991b1b'}">${item.is_sewing_done ? '🟢 Đã may xong' : '🔴 Chưa may xong'}</span>
                                    </div>`;

                    let detailMsg = '';
                    let detailColor = '';
                    if (item.is_qc_done) {
                        detailMsg = 'Đơn đã hoàn thành kiểm tra chất lượng (QC).';
                        detailColor = '#166534';
                    } else if (item.is_sewing_done) {
                        detailMsg = 'Đã may xong. Đang chờ nhân viên QC tiến hành kiểm tra chất lượng sản phẩm.';
                        detailColor = '#1e40af';
                    } else {
                        const missing = [];
                        if (!item.has_sewing_record) {
                            missing.push('Quản Lý Xưởng chưa phân công thợ may / tổ may');
                        } else if (!item.is_sewing_done) {
                            missing.push('chưa may xong');
                        }
                        detailMsg = `Chưa sẵn sàng kiểm tra QC do: ${missing.join(' & ')}.`;
                        detailColor = '#b45309';
                    }

                    body += `        <div style="margin-top:4px;padding:10px;background:#f8fafc;border-radius:8px;font-size:11px;color:${detailColor};font-weight:700;text-align:center">
                                        ℹ️ ${detailMsg}
                                     </div>
                                </div>
                             </div>`;
                });
                body += `</div>`;
            } else {
                body = '<div style="padding:40px 24px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:16px;margin:24px;box-shadow:0 4px 12px rgba(0,0,0,0.02)"><div style="font-size:32px;margin-bottom:12px;filter:grayscale(100%);opacity:0.6">🔍</div><div style="font-size:13px;font-weight:700;color:#64748b">Chưa có dữ liệu QC</div></div>';
            }
        }
        else {
            body+=`<div style="padding:16px 24px;display:flex;flex-direction:column;gap:14px">`;
            // Group by order_item_id
            const groups = [];
            const groupMap = {};
            let noIdCounter = 0;
            d.records.forEach(r => {
                let key = r.order_item_id;
                if (!key) {
                    key = 'no-id-' + (++noIdCounter);
                }
                if (!groupMap[key]) {
                    groupMap[key] = {
                        order_item_id: r.order_item_id,
                        item_description: r.item_description,
                        product_name: r.product_name,
                        material_name: r.material_name,
                        fabric_color: r.fabric_color,
                        order_quantity: r.order_quantity,
                        handover_date: null,
                        latest_qc_date: null,
                        assignments: []
                    };
                    groups.push(groupMap[key]);
                }
                const g = groupMap[key];
                g.assignments.push(r);

                if (r.qc_date) {
                    const qDate = new Date(r.qc_date);
                    if (!g.latest_qc_date || qDate > new Date(g.latest_qc_date)) {
                        g.latest_qc_date = r.qc_date;
                    }
                }
                if (r.handover_date) {
                    const hDate = new Date(r.handover_date);
                    if (!g.handover_date || hDate < new Date(g.handover_date)) {
                        g.handover_date = r.handover_date;
                    }
                }
            });

            groups.forEach((g, i) => {
                const title = `🔍 ${g.item_description || 'Sản phẩm'} — ${d.order_code} — Phiếu ${i+1}`;
                const cardQcDone = g.assignments.every(r => r.answers && r.answers.length > 0);
                const statusText = cardQcDone ? '✅ Đã QC' : '⏳ Chưa QC';
                const statusBg = cardQcDone ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)' : 'linear-gradient(135deg,#eff6ff,#dbeafe)';
                const statusBadgeBg = cardQcDone ? '#d1fae5' : '#fef3c7';
                const statusBadgeColor = cardQcDone ? '#065f46' : '#92400e';

                body+=`<div style="border:1.5px solid #e2e8f0;border-radius:14px;overflow:hidden;background:white;box-shadow:0 2px 8px rgba(0,0,0,.04)">`;
                body+=`<div style="background:${statusBg};padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #e2e8f0"><span style="font-weight:800;color:#0f766e;font-size:13px">${title}</span><span style="padding:3px 10px;border-radius:6px;background:${statusBadgeBg};color:${statusBadgeColor};font-size:11px;font-weight:800">${statusText}</span></div>`;
                body+=`<div style="padding:14px 16px">`;
                body+=`<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
                    <div style="background:#eff6ff;border-radius:8px;padding:8px 14px;flex:1"><div style="font-size:10px;color:#3b82f6;font-weight:700">📅 BÀN GIAO ĐẦU</div><div style="font-weight:800;color:#1e40af">${fmtShortDT(g.handover_date)}</div></div>
                    <div style="background:${cardQcDone?'#dcfce7':'#fef3c7'};border-radius:8px;padding:8px 14px;flex:1"><div style="font-size:10px;color:${cardQcDone?'#16a34a':'#f59e0b'};font-weight:700">🔍 HOÀN THÀNH QC CUỐI</div><div style="font-weight:800;color:${cardQcDone?'#166534':'#92400e'}">${cardQcDone?fmtShortDT(g.latest_qc_date):'⏳ Chưa QC'}</div></div>
                </div>`;
                body+=row('📦 Tên SP',V(g.product_name));
                body+=row('👤 CSKH',V(d.cskh_name));

                body+=section('📋', 'KẾT QUẢ ĐÁNH GIÁ CHẤT LƯỢNG (QC) THEO NHÀ MAY');
                g.assignments.forEach((r, idxAss) => {
                    const sewerDisplay = r.sewer_name ? '🏭 ' + r.sewer_name : '<span style="color:#ef4444;font-weight:800">Chưa rõ nhà may</span>';
                    const assQcStatus = r.answers && r.answers.length > 0 ? `✅ Đã QC (${fmtShortDT(r.qc_date)})` : '⏳ Chưa QC';
                    const assQcColor = r.answers && r.answers.length > 0 ? '#059669' : '#b45309';

                    body+=`<div style="padding:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:12px;font-size:12px">
                        <div style="display:flex;justify-content:space-between;margin-bottom:4px;border-bottom:1px dashed #cbd5e1;padding-bottom:4px">
                            <span style="font-weight:800;color:#1e293b">${idxAss+1}. ${sewerDisplay} (${r.quantity || 0} sp)</span>
                            <span style="font-weight:800;color:${assQcColor}">${assQcStatus}</span>
                        </div>
                        <div style="margin-bottom:6px;font-size:11px;color:#64748b">
                            <span>👷 QC bởi: ${V(r.finisher_name)}</span>
                        </div>`;

                    if (r.answers && r.answers.length > 0) {
                        body+=`<div style="margin-top:6px;display:flex;flex-direction:column;gap:4px">`;
                        r.answers.forEach(a => {
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
                            const badge = `<span style="padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;background:${isOk?'#d1fae5':'#fee2e2'};color:${isOk?'#065f46':'#991b1b'}">${displayVal}</span>`;
                            body+=`<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px"><span style="color:#475569">${a.content}</span>${badge}</div>`;
                        });
                        body+=`</div>`;
                    } else {
                        body+=`<div style="color:#94a3b8;font-style:italic;text-align:center;padding:4px 0">Chưa thực hiện checklist QC</div>`;
                    }

                    if(r.finish_images){
                        try{
                            const imgs=JSON.parse(r.finish_images);
                            if(imgs.length){
                                body+=`<div style="margin-top:8px;font-weight:700;font-size:11px;color:#475569">📸 Ảnh QC:</div><div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">`;
                                imgs.forEach(img=>{body+=`<img src="${img}" style="max-width:80px;max-height:80px;border-radius:6px;object-fit:cover;cursor:pointer" onclick="_tsShowImagePreview('${img}')" onerror="this.style.display='none'">`});
                                body+=`</div>`;
                            }
                        }catch(e){}
                    }

                    if(r.sew_notes){
                        body+=`<div style="margin-top:6px;color:#475569;font-style:italic">Ghi chú quản lý may: ${r.sew_notes}</div>`;
                    }

                    body+=`<div id="_tsQcSewRemindersContainer_${r.id}" style="display:none;margin-top:12px"></div>`;
                    body+=`</div>`;
                });

                body+=`</div></div>`;
            });
            body+=`</div>`;
        }
    }
    else if(step==='ht'){
        html = hdr('🔧','CHI TIẾT HOÀN THIỆN & CHECKLIST',d.order_code,'#334155,#475569');
        if(!d.records||!d.records.length){
            body = `<div style="padding:16px 24px;display:flex;flex-direction:column;gap:14px">`;
            body += `<div style="text-align:center;padding:12px;background:#f1f5f9;border:1.5px solid #e2e8f0;border-radius:12px;color:#475569;font-weight:700;font-size:13px">
                        ⚠️ Đơn hàng chưa có dữ liệu hoàn thiện
                     </div>`;
            
            if (d.items_status && d.items_status.length) {
                d.items_status.forEach((item, index) => {
                    const itemTitle = item.description 
                        ? `${d.order_code} - Phiếu ${index + 1} — ${item.description}` 
                        : `${d.order_code} - Phiếu ${index + 1}`;
                    
                    let statusLabel = '';
                    let statusColor = '';
                    let statusBg = '';
                    
                    if (!item.has_ccht) {
                        statusLabel = 'Không cần HT';
                        statusColor = '#475569';
                        statusBg = '#f1f5f9';
                    } else if (item.is_qc_done) {
                        statusLabel = 'Chờ hoàn thiện';
                        statusColor = '#1e40af';
                        statusBg = '#dbeafe';
                    } else {
                        statusLabel = 'Chưa đủ điều kiện';
                        statusColor = '#991b1b';
                        statusBg = '#fee2e2';
                    }

                    body += `<div style="border:1.5px solid #e2e8f0;border-radius:14px;background:white;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.02)">
                                <div style="background:#f8fafc;padding:12px 16px;border-bottom:1.5px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
                                    <span style="font-weight:800;color:#1e293b;font-size:13px">${itemTitle}</span>
                                    <span style="padding:3px 10px;border-radius:6px;background:${statusBg};color:${statusColor};font-size:11px;font-weight:800">${statusLabel}</span>
                                </div>
                                <div style="padding:14px 16px;display:flex;flex-direction:column;gap:10px">
                                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:600">
                                        <span style="color:#64748b">1. Phân công may</span>
                                        <span style="padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;${item.has_sewing_record ? 'background:#d1fae5;color:#065f46' : 'background:#fee2e2;color:#991b1b'}">${item.has_sewing_record ? '🟢 Đã phân công' : '🔴 Chưa phân công'}</span>
                                    </div>
                                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:600;border-top:1px solid #f1f5f9;padding-top:10px">
                                        <span style="color:#64748b">2. Tiến độ may</span>
                                        <span style="padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;${item.is_sewing_done ? 'background:#d1fae5;color:#065f46' : 'background:#fee2e2;color:#991b1b'}">${item.is_sewing_done ? '🟢 Đã may xong' : '🔴 Chưa may xong'}</span>
                                    </div>
                                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:600;border-top:1px solid #f1f5f9;padding-top:10px">
                                        <span style="color:#64748b">3. Kiểm tra chất lượng (QC)</span>
                                        <span style="padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;${item.is_qc_done ? 'background:#d1fae5;color:#065f46' : 'background:#fee2e2;color:#991b1b'}">${item.is_qc_done ? '🟢 Đã QC' : '🔴 Chưa QC'}</span>
                                    </div>
                                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:600;border-top:1px solid #f1f5f9;padding-top:10px">
                                        <span style="color:#64748b">4. Quy trình hoàn thiện</span>
                                        <span style="padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;${item.has_ccht ? 'background:#d1fae5;color:#065f46' : 'background:#f1f5f9;color:#475569'}">${item.has_ccht ? '🟢 Cần hoàn thiện' : '⚪ Không cần hoàn thiện'}</span>
                                    </div>`;

                    let detailMsg = '';
                    let detailColor = '';
                    if (!item.has_ccht) {
                        detailMsg = 'Sản phẩm này không yêu cầu hoàn thiện trong quy trình công nghệ.';
                        detailColor = '#475569';
                    } else if (item.is_qc_done) {
                        detailMsg = 'Đã hoàn thành QC. Chờ nhân viên bộ phận Hoàn thiện thực hiện checklist và báo cáo hoàn thành.';
                        detailColor = '#1e40af';
                    } else {
                        const missing = [];
                        if (!item.has_sewing_record) {
                            missing.push('Quản Lý Xưởng chưa phân công thợ may / tổ may');
                        } else {
                            if (!item.is_sewing_done) {
                                missing.push('chưa may xong');
                            }
                            if (!item.is_qc_done) {
                                missing.push('chưa kiểm tra QC');
                            }
                        }
                        detailMsg = `Chưa sẵn sàng hoàn thiện do: ${missing.join(' & ')}.`;
                        detailColor = '#b45309';
                    }

                    body += `        <div style="margin-top:4px;padding:10px;background:#f8fafc;border-radius:8px;font-size:11px;color:${detailColor};font-weight:700;text-align:center">
                                        ℹ️ ${detailMsg}
                                     </div>
                                </div>
                             </div>`;
                });
            } else {
                body += `<div style="text-align:center;padding:20px;color:#64748b;font-size:13px">Không có thông tin chi tiết.</div>`;
            }
            body += `</div>`;
        }
        else {
            body+=`<div style="padding:16px 24px;display:flex;flex-direction:column;gap:14px">`;
            // Group by order_item_id
            const groups = [];
            const groupMap = {};
            let noIdCounter = 0;
            d.records.forEach(r => {
                let key = r.order_item_id;
                if (!key) {
                    key = 'no-id-' + (++noIdCounter);
                }
                if (!groupMap[key]) {
                    groupMap[key] = {
                        order_item_id: r.order_item_id,
                        item_description: r.item_description,
                        handover_date: null,
                        latest_completed_at: null,
                        assignments: []
                    };
                    groups.push(groupMap[key]);
                }
                const g = groupMap[key];
                g.assignments.push(r);

                if (r.is_completed && r.completed_at) {
                    const cDate = new Date(r.completed_at);
                    if (!g.latest_completed_at || cDate > new Date(g.latest_completed_at)) {
                        g.latest_completed_at = r.completed_at;
                    }
                }
                if (r.handover_date) {
                    const hDate = new Date(r.handover_date);
                    if (!g.handover_date || hDate < new Date(g.handover_date)) {
                        g.handover_date = r.handover_date;
                    }
                }
            });

            groups.forEach((g, i) => {
                g.assignments.sort((a, b) => {
                    const aGC = a.contractor_id !== null ? 1 : 0;
                    const bGC = b.contractor_id !== null ? 1 : 0;
                    return aGC - bGC;
                });
                const title = '🔧 ' + d.order_code + ' — Phiếu ' + (i+1) + (g.item_description ? ' — ' + g.item_description : '');
                
                // Determine if all are completed
                const allCompleted = g.assignments.every(r => {
                    const isQcDone = r.qc_count > 0;
                    const isOutsourced = r.contractor_id !== null;
                    if (d.is_order_shipped) {
                        return r.is_completed;
                    } else {
                        if (isOutsourced) {
                            return isQcDone;
                        } else {
                            return isQcDone && r.is_completed;
                        }
                    }
                });

                let overallStatusText = allCompleted ? '✅ Đã hoàn thiện' : '⏳ Đang hoàn thiện';
                let overallBadgeBg = allCompleted ? '#d1fae5' : '#fef3c7';
                let overallBadgeColor = allCompleted ? '#065f46' : '#92400e';

                body+=`<div style="border:1.5px solid #e2e8f0;border-radius:14px;overflow:hidden;background:white;box-shadow:0 2px 8px rgba(0,0,0,.04)">`;
                body+=`<div style="background:linear-gradient(135deg,#f1f5f9,#e2e8f0);padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #e2e8f0"><span style="font-weight:800;color:#334155;font-size:13px">${title}</span><span style="padding:3px 10px;border-radius:6px;background:${overallBadgeBg};color:${overallBadgeColor};font-size:11px;font-weight:800">${overallStatusText}</span></div>`;
                body+=`<div style="padding:14px 16px">`;
                body+=`<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
                    <div style="background:#eff6ff;border-radius:8px;padding:8px 14px;flex:1"><div style="font-size:10px;color:#3b82f6;font-weight:700">📅 BÀN GIAO ĐẦU</div><div style="font-weight:800;color:#1e40af">${fmtShortDT(g.handover_date)}</div></div>
                    <div style="background:${allCompleted?'#dcfce7':'#fef3c7'};border-radius:8px;padding:8px 14px;flex:1"><div style="font-size:10px;color:${allCompleted?'#16a34a':'#f59e0b'};font-weight:700">🔧 HOÀN THÀNH HOÀN THIỆN</div><div style="font-weight:800;color:${allCompleted?'#166534':'#92400e'}">${allCompleted && g.latest_completed_at ? fmtShortDT(g.latest_completed_at) : overallStatusText}</div></div>
                </div>`;
                body+=row('👤 CSKH',V(d.cskh_name));

                body+=section('📋', 'TIẾN ĐỘ HOÀN THIỆN THEO TỪNG NHÀ MAY / TỔ MAY');
                g.assignments.forEach((r, idxAss) => {
                    const sewerDisplay = r.sewer_name ? '🏭 ' + r.sewer_name : '<span style="color:#ef4444;font-weight:800">Chưa rõ nhà may</span>';
                    
                    const isQcDone = r.qc_count > 0;
                    const isOutsourced = r.contractor_id !== null;
                    let statusText = '⏳ Đang hoàn thiện';
                    let badgeBg = '#fef3c7';
                    let badgeColor = '#92400e';

                    if (d.is_order_shipped) {
                        if (r.is_completed) {
                            statusText = '✅ Đã hoàn thiện';
                            badgeBg = '#d1fae5';
                            badgeColor = '#065f46';
                        }
                    } else {
                        if (isOutsourced) {
                            if (isQcDone) {
                                statusText = '✅ Đã hoàn thiện từ kiểm tra QC';
                                badgeBg = '#d1fae5';
                                badgeColor = '#065f46';
                            } else {
                                statusText = '⏳ Chưa QC';
                                badgeBg = '#fee2e2';
                                badgeColor = '#991b1b';
                            }
                        } else {
                            if (!isQcDone) {
                                statusText = '⏳ Chưa QC';
                                badgeBg = '#fee2e2';
                                badgeColor = '#991b1b';
                            } else if (r.is_completed) {
                                statusText = '✅ Đã hoàn thiện';
                                badgeBg = '#d1fae5';
                                badgeColor = '#065f46';
                            }
                        }
                    }

                    let formattedExpectedDate = '—';
                    const targetDateStr = r.order_expected_ship_date || r.expected_date;
                    if (targetDateStr) {
                        try {
                            const dt = new Date(targetDateStr);
                            const day = String(dt.getDate()).padStart(2, '0');
                            const month = String(dt.getMonth() + 1).padStart(2, '0');
                            const year = dt.getFullYear();
                            const dateStr = `${day}/${month}/${year}`;
                            if (r.shipping_standard === 'chuan' && r.order_standard_delivery_time && r.order_standard_delivery_time.trim()) {
                                formattedExpectedDate = `${r.order_standard_delivery_time.trim()} ngày ${day}/${month}`;
                            } else {
                                formattedExpectedDate = `ngày ${day}/${month}`;
                            }
                        } catch(e) {
                            formattedExpectedDate = targetDateStr;
                        }
                    }

                    body+=`<div style="padding:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:12px;font-size:12px">
                        <div style="display:flex;justify-content:space-between;margin-bottom:4px;border-bottom:1px dashed #cbd5e1;padding-bottom:4px">
                            <span style="font-weight:800;color:#1e293b">${idxAss+1}. ${sewerDisplay}</span>
                            <span style="font-weight:800;background:${badgeBg};color:${badgeColor};padding:1px 6px;border-radius:4px;font-size:11px">${statusText}</span>
                        </div>
                        <div style="margin-bottom:6px;font-size:11px;color:#64748b">
                            <span>👷 NV hoàn thiện: ${V(r.finisher_name)}</span> | <span>📅 Hạn gửi: ${formattedExpectedDate}</span>
                        </div>
                        ${row('📦 Tiêu chuẩn gửi', r.shipping_standard === 'gap' ? '⚠️ GẤP' : (r.shipping_standard === 'gui' ? '📦 GỬI' : '✅ CHUẨN'))}
                        `;

                    if(r.checklist&&r.checklist.length){
                        body+=`<div style="margin-top:6px;display:flex;flex-direction:column;gap:4px">`;
                        r.checklist.forEach(c=>{
                            const ans=c.answer_value||'';
                            const isYes=ans.toLowerCase()==='có'||ans.toLowerCase()==='yes'||ans.toLowerCase()==='đạt';
                            body+=`<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px"><span style="color:#475569">${c.question}</span><span style="font-weight:800;color:${isYes?'#059669':'#dc2626'}">${ans}</span></div>`;
                        });
                        body+=`</div>`;
                    }

                    if(r.finish_images){
                        try{
                            const imgs=JSON.parse(r.finish_images);
                            if(imgs.length){
                                body+=`<div style="margin-top:8px;font-weight:700;font-size:11px;color:#475569">📸 Ảnh hoàn thiện:</div><div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">`;
                                imgs.forEach(img=>{body+=`<img src="${img}" style="max-width:80px;max-height:80px;border-radius:6px;object-fit:cover;cursor:pointer" onclick="_tsShowImagePreview('${img}')" onerror="this.style.display='none'">`});
                                body+=`</div>`;
                            }
                        }catch(e){}
                    }

                    if(r.finishing_notes){
                        body+=`<div style="margin-top:6px;color:#475569;font-style:italic">Ghi Chú NV Hoàn Thiện: ${r.finishing_notes}</div>`;
                    }

                    if (!r.contractor_id) {
                        body += `<div id="_tsHtRemindersContainer_${r.id}" style="display:none;margin-top:12px"></div>`;
                    }

                    body+=`</div>`;
                });

                body+=`</div></div>`;
            });
            body+=`</div>`;
        }
    }
    else if(step==='gui'){
        html = hdr('🚛','THÔNG TIN GỬI HÀNG',d.order_code,'#b45309,#d97706');
        body=`<div style="padding:16px 24px;display:flex;flex-direction:column;gap:14px">`;
        body+=`<div style="display:flex;gap:8px;margin-bottom:4px;flex-wrap:wrap">
            <div style="background:#eff6ff;border-radius:8px;padding:8px 14px;flex:1"><div style="font-size:10px;color:#3b82f6;font-weight:700">📅 THỜI GIAN XONG ĐƠN</div><div style="font-weight:800;color:#1e40af">${d.done_order_at?fmtShortDT(d.done_order_at):'⏳ Chưa xong'}</div></div>
            <div style="background:${d.shipped_at?'#dcfce7':'#fef3c7'};border-radius:8px;padding:8px 14px;flex:1"><div style="font-size:10px;color:${d.shipped_at?'#16a34a':'#f59e0b'};font-weight:700">🚚 THỜI GIAN GIAO HÀNG</div><div style="font-weight:800;color:${d.shipped_at?'#166534':'#92400e'}">${d.shipped_at?fmtShortDT(d.shipped_at):'⏳ Chờ gửi'}</div></div>
        </div>`;
        body+=`<div style="border:1.5px solid #e2e8f0;border-radius:14px;overflow:hidden;background:white;box-shadow:0 2px 8px rgba(0,0,0,.04)">`;
        body+=`<div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);padding:10px 16px;border-bottom:1.5px solid #e2e8f0"><span style="font-weight:800;color:#1e40af;font-size:13px">📦 THÔNG TIN ĐƠN HÀNG</span></div>`;
        body+=`<div style="padding:14px 16px">`;
        body+=row('👤 Khách hàng',V(d.customer_name));
        body+=row('📱 SĐT',V(d.customer_phone),'#ea580c');
        body+=row('📍 Địa chỉ',V(d.address));
        body+=row('🏙️ Tỉnh / TP',V(d.province),'#dc2626');
        body+=row('👤 CSKH',V(d.cskh_name));
        body+=row('📅 Ngày lên đơn',fmtD(d.order_date));
        
        var tcColor2 = (d.shipping_priority === 'GẤP') ? '#dc2626' : (d.shipping_priority === 'CHUẨN') ? '#7c3aed' : '#f59e0b';
        body+=row('🏷️ TC Gửi', `<span style="color:${tcColor2};font-weight:900;font-size:14px">${d.shipping_priority || 'CHUẨN'}</span>`);

        const formatExpectedShipDateWithDay = (dateVal) => {
            if (!dateVal) return '<span style="color:#94a3b8;font-style:italic">Chưa có</span>';
            const dt = new Date(dateVal);
            const localDt = new Date(dt.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
            const day = localDt.getDate();
            const month = localDt.getMonth() + 1;
            const daysOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            const dayName = daysOfWeek[localDt.getDay()];
            return `${dayName} - Ngày ${day}/${month}`;
        };
        body+=row('📅 Ngày gửi dự kiến',formatExpectedShipDateWithDay(d.expected_ship_date));
        
        if ((d.shipping_priority || 'CHUẨN').toUpperCase() === 'CHUẨN') {
            var deliveryTimeHtml = d.standard_delivery_time 
                ? `<span style="font-weight:800;color:#0369a1">${d.standard_delivery_time}</span>` 
                : '<span style="color:#94a3b8;font-style:italic">—</span>';
            body+=row('⏰ Yêu Cầu Chuẩn Giờ Hàng Ra', deliveryTimeHtml);
            
            var progressSaleHTML = '<span style="color:#94a3b8;font-style:italic">Chưa có ngày gửi dự kiến</span>';
            if (d.expected_ship_date) {
                var shipVN = new Date(d.expected_ship_date);
                shipVN.setHours(0,0,0,0);
                if (d.shipped_at) {
                    var actualVN = new Date(d.shipped_at);
                    actualVN.setHours(0,0,0,0);
                    var diffDays = Math.round((shipVN - actualVN) / 86400000);
                    if (diffDays > 0) {
                        progressSaleHTML = '<span style="color:#0369a1;font-weight:900;font-size:14px">🚀 Nhanh ' + diffDays + ' ngày</span>';
                    } else if (diffDays < 0) {
                        progressSaleHTML = '<span style="color:#dc2626;font-weight:900;font-size:14px">⚠️ Trễ ' + Math.abs(diffDays) + ' ngày</span>';
                    } else {
                        progressSaleHTML = '<span style="color:#059669;font-weight:900;font-size:14px">✅ Đúng hạn</span>';
                    }
                } else {
                    var todayVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
                    todayVN.setHours(0,0,0,0);
                    var remainDays = Math.round((shipVN - todayVN) / 86400000);
                    if (remainDays > 0) {
                        progressSaleHTML = '<span style="color:#3b82f6;font-weight:900;font-size:14px">📅 Còn ' + remainDays + ' ngày</span>';
                    } else if (remainDays < 0) {
                        progressSaleHTML = '<span style="color:#dc2626;font-weight:900;font-size:14px">⚠️ Quá hạn ' + Math.abs(remainDays) + ' ngày</span>';
                    } else {
                        progressSaleHTML = '<span style="color:#d97706;font-weight:900;font-size:14px">📦 Hôm nay gửi</span>';
                    }
                }
            }
            body+=row('📊 Tiến Độ Ra Hàng', progressSaleHTML);
        }
        
        body+=`</div></div>`;
        const items = d.items || [];
        const shippedItems = items.filter(it => it.shipping_status === 'shipped');
        const totalItemsCount = items.length;

        body+=`<div style="border:1.5px solid #e2e8f0;border-radius:14px;overflow:hidden;background:white;box-shadow:0 2px 8px rgba(0,0,0,.04)">`;
        body+=`<div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);padding:10px 16px;border-bottom:1.5px solid #e2e8f0"><span style="font-weight:800;color:#166534;font-size:13px">🚚 THÔNG TIN VẬN CHUYỂN</span></div>`;
        body+=`<div style="padding:14px 16px">`;

        if (totalItemsCount > 0 && (shippedItems.length > 0 || totalItemsCount > 1)) {
            // Header summary
            let summaryText = '';
            let summaryBg = '#f1f5f9';
            let summaryColor = '#475569';
            if (shippedItems.length === 0) {
                summaryText = `📭 Chưa gửi phiếu nào (0/${totalItemsCount} phiếu)`;
            } else if (shippedItems.length < totalItemsCount) {
                summaryText = `🚚 Đang giao hàng (Đã gửi ${shippedItems.length}/${totalItemsCount} phiếu)`;
                summaryBg = '#fff7ed';
                summaryColor = '#c2410c';
            } else {
                summaryText = `✅ Đã giao hàng thành công (${totalItemsCount}/${totalItemsCount} phiếu)`;
                summaryBg = '#f0fdf4';
                summaryColor = '#15803d';
            }
            
            body += `<div style="background:${summaryBg};color:${summaryColor};padding:10px 14px;border-radius:8px;font-weight:800;font-size:13px;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
                <span>${summaryText}</span>
            </div>`;
            
            // Group shipped items by batch key
            const shippedBatches = {};
            const pendingItems = [];
            
            for (let i = 0; i < items.length; i++) {
                const it = items[i];
                const phieuLabel = `Phiếu ${i + 1}`;
                if (it.shipping_status === 'shipped') {
                    const batchKey = [
                        it.shipped_at || '',
                        it.actual_carrier_id || '',
                        it.tracking_code || '',
                        it.shipping_bill_link || '',
                        it.shipping_fee || '0',
                        it.shipping_fee_payer || '',
                        it.shipping_fee_method || '',
                        it.shipping_payment_code || '',
                        it.shipping_payment_amount || ''
                    ].join('|');
                    
                    if (!shippedBatches[batchKey]) {
                        shippedBatches[batchKey] = {
                            details: it,
                            labels: []
                        };
                    }
                    shippedBatches[batchKey].labels.push({
                        label: phieuLabel,
                        name: it.product_name || it.description || 'Sản phẩm',
                        qty: it.quantity || 0
                    });
                } else {
                    pendingItems.push({
                        label: phieuLabel,
                        name: it.product_name || it.description || 'Sản phẩm',
                        qty: it.quantity || 0
                    });
                }
            }
            
            // Render Shipped Batches
            for (const batchKey in shippedBatches) {
                const batch = shippedBatches[batchKey];
                const it = batch.details;
                
                const carrierName = it.actual_carrier_name || '—';
                let trackingDisplay = it.tracking_code || '—';
                if (it.tracking_code && it.actual_carrier_tracking_url) {
                    const trackingUrl = it.actual_carrier_tracking_url.replace('{code}', encodeURIComponent(it.tracking_code));
                    trackingDisplay = `<a href="${trackingUrl}" target="_blank" rel="noopener" style="font-weight:700;color:#1e40af;text-decoration:underline;cursor:pointer" title="Tra cứu vận đơn">${it.tracking_code} 🔗</a>`;
                }
                
                const payerLabel = it.shipping_fee_payer === 'hv' ? 'HV trả' : it.shipping_fee_payer === 'khach' ? 'Khách trả' : '—';
                const methodLabel = it.shipping_fee_method === 'ck' ? 'Chuyển Khoản' : it.shipping_fee_method === 'tm' ? 'Tiền Mặt' : '—';
                const payerColor = it.shipping_fee_payer === 'hv' ? '#7c3aed' : '#059669';
                const feeAmt = Number(it.shipping_fee || 0);
                
                let billHtml = '—';
                if (it.shipping_bill_link) {
                    const itBillCid = `_tsItBillImgModal_${d.id || d.order_code || 'temp'}_${it.id}`;
                    billHtml = `<span id="${itBillCid}" style="color:#64748b;font-size:11px">⏳ Đang tải bill...</span>`;
                    
                    (function(_cid, _origUrl) {
                        setTimeout(async function() {
                            const el = document.getElementById(_cid);
                            if (!el) return;
                            let imgSrc = _origUrl;
                            try {
                                if (_origUrl.includes('prnt.sc') || _origUrl.includes('prntscr.com')) {
                                    const r = await apiCall('/api/shipping/resolve-image?url=' + encodeURIComponent(_origUrl));
                                    if (r && r.direct_url) imgSrc = r.direct_url;
                                } else {
                                    const dm = _origUrl.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
                                    if (dm) imgSrc = 'https://drive.google.com/uc?export=view&id=' + dm[1];
                                    const dm2 = _origUrl.match(/drive\.google\.com\/open\?id=([^&]+)/);
                                    if (dm2) imgSrc = 'https://drive.google.com/uc?export=view&id=' + dm2[1];
                                }
                            } catch(e) { console.warn('[BillResolve]', e); }
                            
                            if (imgSrc && imgSrc.includes('/uploads/')) {
                                imgSrc = imgSrc.substring(imgSrc.indexOf('/uploads/'));
                            }
                            let linkHref = _origUrl;
                            if (linkHref && linkHref.includes('/uploads/')) {
                                linkHref = linkHref.substring(linkHref.indexOf('/uploads/'));
                            }
                            
                            const img = document.createElement('img');
                            img.src = imgSrc;
                            img.style.cssText = 'max-width:180px;max-height:140px;border-radius:6px;border:1px solid #e2e8f0;cursor:pointer;object-fit:contain;box-shadow:0 2px 6px rgba(0,0,0,.08);margin-top:4px;';
                            img.onerror = function() {
                                el.innerHTML = '<a href="' + linkHref + '" target="_blank" style="color:#3b82f6;font-weight:700">📷 Xem bill (link)</a>';
                            };
                            const link = document.createElement('a');
                            link.href = linkHref;
                            link.target = '_blank';
                            link.title = 'Click xem ảnh gốc';
                            link.appendChild(img);
                            el.innerHTML = '';
                            el.appendChild(link);
                        }, 100);
                    })(itBillCid, it.shipping_bill_link);
                }
                
                const timeValue = it.actual_ship_datetime ? fmtDT(it.actual_ship_datetime) : (it.shipped_at ? fmtDT(it.shipped_at) : '—');
                
                let headerHtml = '';
                if (batch.labels.length === 1) {
                    const l = batch.labels[0];
                    headerHtml = `📦 ${l.label.toUpperCase()} — ${l.name.toUpperCase()} <span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">SL: ${l.qty}</span>`;
                } else {
                    const itemsHeader = batch.labels.map(l => `
                        <span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;display:inline-block;margin-bottom:2px;">
                            ${l.label.toUpperCase()}: ${l.name} (SL: ${l.qty})
                        </span>
                    `).join(' ');
                    headerHtml = `<span style="font-weight:800;color:#166534;font-size:13px;display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;">🚛 GỬI CHUNG: ${itemsHeader}</span>`;
                }
                
                body += `
                <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:14px;margin-bottom:10px;box-shadow:0 2px 4px rgba(22,163,74,0.03)">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1.5px solid #dcfce7;padding-bottom:8px;flex-wrap:wrap;gap:6px;">
                        ${headerHtml}
                        <span style="background:#16a34a;color:white;padding:3px 10px;border-radius:20px;font-weight:800;font-size:10px;letter-spacing:0.5px;">🟢 ĐÃ GỬI</span>
                    </div>
                    <div style="font-size:12px;color:#1e293b;display:grid;grid-template-columns:140px 1fr;gap:6px 12px;align-items:start;">
                        <span style="color:#64748b;font-weight:600;">👤 Người gửi:</span> <span style="font-weight:700;color:#1e293b">${it.shipped_by_name || '—'}</span>
                        <span style="color:#64748b;font-weight:600;">📅 Thời gian gửi:</span> <span style="font-weight:700;color:#1e293b">${timeValue}</span>
                        <span style="color:#64748b;font-weight:600;">🚛 Đơn vị vận chuyển:</span> <span style="font-weight:700;color:#1e293b">${carrierName}</span>
                        ${it.tracking_code ? `<span style="color:#64748b;font-weight:600;">📦 Mã vận đơn:</span> <span>${trackingDisplay}</span>` : ''}
                        ${it.carrier_phone ? `<span style="color:#64748b;font-weight:600;">📞 SĐT Nhà Xe:</span> <span><a href="tel:${it.carrier_phone}" style="color:#2563eb;text-decoration:underline;font-weight:700">${it.carrier_phone}</a></span>` : ''}
                        ${it.receiver_name ? `<span style="color:#64748b;font-weight:600;">🤝 Người nhận:</span> <span style="font-weight:700;color:#1e293b">${it.receiver_name}</span>` : ''}
                        <span style="color:#64748b;font-weight:600;">💳 Người trả ship:</span> <span><span style="font-weight:800;color:${payerColor}">${payerLabel}</span> — <span style="font-weight:700;color:#334155">${methodLabel}</span></span>
                        <span style="color:#64748b;font-weight:600;">💰 Phí gửi hàng:</span> <span style="font-weight:800;color:#dc2626">${feeAmt.toLocaleString('vi-VN')}đ</span>
                        ${it.shipping_payment_code ? `<span style="color:#64748b;font-weight:600;">💳 Mã thanh toán:</span> <span style="font-weight:700;color:#059669">${it.shipping_payment_code}</span>` : ''}
                        ${it.shipping_payment_code ? `<span style="color:#64748b;font-weight:600;">💵 Số tiền thanh toán:</span> <span style="font-weight:700;color:#0284c7">${(Number(it.shipping_payment_amount) || 0).toLocaleString('vi-VN')}đ</span>` : ''}
                        ${it.shipping_bill_link ? `<span style="color:#64748b;font-weight:600;vertical-align:top;padding-top:4px;">🔗 Bill gửi hàng:</span> <div>${billHtml}</div>` : ''}
                    </div>
                </div>`;
            }
            
            // Render Pending Items
            for (let i = 0; i < pendingItems.length; i++) {
                const pit = pendingItems[i];
                body += `
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-bottom:10px;opacity:0.85;display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-weight:700;color:#475569;font-size:12.5px;display:flex;align-items:center;gap:6px;">
                        📦 ${pit.label.toUpperCase()} — ${pit.name.toUpperCase()} <span style="background:#e2e8f0;color:#475569;padding:1px 6px;border-radius:10px;font-size:10px;font-weight:700;">SL: ${pit.qty}</span>
                    </span>
                    <span style="background:#e2e8f0;color:#475569;padding:3px 10px;border-radius:20px;font-weight:800;font-size:10px;letter-spacing:0.5px;">⏳ CHỜ GỬI</span>
                </div>`;
            }
        } else {
            // Fallback to order-level shipping details
            if (d.shipped_at) {
                body+=row('👤 Người Gửi', d.shipped_by_name ? `<span style="color:#2563eb;font-weight:800">${d.shipped_by_name}</span>` : '<span style="color:#94a3b8;font-style:italic">—</span>');
                body+=row('📅 Ngày giờ gửi hàng', d.actual_ship_datetime ? fmtDT(d.actual_ship_datetime) : (d.shipped_at ? fmtDT(d.shipped_at) : '<span style="color:#94a3b8;font-style:italic">—</span>'));
                body+=row('🚛 Vận Chuyển Thực Tế', d.actual_carrier_name ? `<span style="font-weight:800;color:#1e293b">${d.actual_carrier_name}</span>` : '<span style="color:#94a3b8;font-style:italic">—</span>');
                if (d.tracking_code) {
                    let trackingDisplay = `<span style="font-weight:700;color:#1e40af;letter-spacing:0.5px">${d.tracking_code}</span>`;
                    if (d.carrier_tracking_url) {
                        let trackingUrl = d.carrier_tracking_url.replace('{code}', encodeURIComponent(d.tracking_code));
                        trackingDisplay = `<a href="${trackingUrl}" target="_blank" rel="noopener" style="font-weight:700;color:#1e40af;letter-spacing:0.5px;text-decoration:underline;cursor:pointer" title="Tra cứu vận đơn">${d.tracking_code} 🔗</a>`;
                    }
                    body+=row('📦 Mã vận đơn', trackingDisplay);
                }
                if (d.carrier_phone) {
                    body+=row('📞 SĐT Nhà Xe', `<a href="tel:${d.carrier_phone}" style="color:#2563eb;text-decoration:underline;font-weight:700">${d.carrier_phone}</a>`);
                }
                if (d.receiver_name) {
                    var acn = (d.actual_carrier_name || '').toLowerCase();
                    var rnLabel = acn.includes('nhân viên hv') || acn.includes('nhan vien hv') ? '👷 Tên Nhân Viên Gửi Hàng' : '🤝 Tên Người Nhận Hàng';
                    body+=row(rnLabel, `<span style="font-weight:800;color:#1e293b">${d.receiver_name}</span>`);
                }
                var payerLabel = d.shipping_fee_payer === 'hv' ? 'HV trả' : d.shipping_fee_payer === 'khach' ? 'Khách trả' : '—';
                var methodLabel = d.shipping_fee_method === 'ck' ? 'Chuyển Khoản' : d.shipping_fee_method === 'tm' ? 'Tiền Mặt' : '—';
                var payerColor = d.shipping_fee_payer === 'hv' ? '#7c3aed' : '#059669';
                body+=row('💳 Người Trả', `<span style="font-weight:800;color:${payerColor}">${payerLabel}</span> — <span style="font-weight:700;color:#334155">${methodLabel}</span>`);
                var sfee = Number(d.shipping_fee) || 0;
                body+=row('💰 Phí Gửi Hàng', `<span style="font-weight:800;color:#dc2626">${sfee.toLocaleString('vi-VN')}đ</span>`);
                if (d.shipping_payment_code) {
                    body+=row('💳 Mã thanh toán', `<span style="font-weight:700;color:#059669">${d.shipping_payment_code}</span>`);
                    body+=row('💵 Số tiền thanh toán', `<span style="font-weight:700;color:#0284c7">${(Number(d.shipping_payment_amount) || 0).toLocaleString('vi-VN')}đ</span>`);
                }
                if (d.shipping_bill_link) {
                    var billCid = '_tsBillImg_' + d.order_code + '_' + Math.random().toString(36).substr(2, 9);
                    body+=`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9"><span style="color:#64748b;font-weight:600">🔗 Bill gửi hàng</span><span style="font-weight:700;color:#1e293b" id="${billCid}"><span style="color:#94a3b8;font-size:12px">⏳ Đang tải bill...</span></span></div>`;
                    (function(_cid, _origUrl) {
                        setTimeout(async function() {
                            var el = document.getElementById(_cid);
                            if (!el) return;
                            var imgSrc = _origUrl;
                            try {
                                if (_origUrl.includes('prnt.sc') || _origUrl.includes('prntscr.com')) {
                                    var r = await apiCall('/api/shipping/resolve-image?url=' + encodeURIComponent(_origUrl));
                                    if (r && r.direct_url) imgSrc = r.direct_url;
                                } else {
                                    var dm = _origUrl.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
                                    if (dm) imgSrc = 'https://drive.google.com/uc?export=view&id=' + dm[1];
                                    var dm2 = _origUrl.match(/drive\.google\.com\/open\?id=([^&]+)/);
                                    if (dm2) imgSrc = 'https://drive.google.com/uc?export=view&id=' + dm2[1];
                                }
                            } catch(e) { console.warn('[BillResolve]', e); }
                            
                            if (imgSrc && imgSrc.includes('/uploads/')) {
                                imgSrc = imgSrc.substring(imgSrc.indexOf('/uploads/'));
                            }
                            var linkHref = _origUrl;
                            if (linkHref && linkHref.includes('/uploads/')) {
                                linkHref = linkHref.substring(linkHref.indexOf('/uploads/'));
                            }
                            
                            var img = document.createElement('img');
                            img.src = imgSrc;
                            img.style.cssText = 'max-width:240px;max-height:200px;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer;object-fit:contain;box-shadow:0 2px 8px rgba(0,0,0,.1);margin-top:4px;';
                            img.onerror = function() {
                                el.innerHTML = '<a href="' + linkHref + '" target="_blank" style="color:#3b82f6;font-weight:700">📷 Xem bill (link)</a>';
                            };
                            var link = document.createElement('a');
                            link.href = linkHref;
                            link.target = '_blank';
                            link.title = 'Click xem ảnh gốc';
                            link.appendChild(img);
                            el.innerHTML = '';
                            el.appendChild(link);
                        }, 100);
                    })(billCid, d.shipping_bill_link);
                }
            } else {
                body+=`<div style="text-align:center;padding:16px;color:#94a3b8;font-size:13px;font-style:italic">📭 Chưa gửi hàng</div>`;
            }
        }

        body+=`</div></div>`;
        body+=`</div>`;
    }


    html += body;
    html += `<div style="padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb"><button onclick="_tsCloseModal()" style="padding:12px 50px;border:none;border-radius:12px;background:#1e293b;color:white;font-size:14px;font-weight:800;cursor:pointer;transition:all .15s">Đóng</button></div>`;
    return html;
}
