// ========== RÚT TIỀN AFFILIATE - PREMIUM ==========

async function renderWithdrawAffiliatePage(container) {
    container.innerHTML = `
        <div style="max-width:700px;margin:0 auto;">
            <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5a8e 50%,#1e3a5f 100%);border-radius:20px;padding:28px 24px;margin-bottom:20px;color:white;position:relative;overflow:hidden;">
                <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;background:rgba(255,255,255,0.05);border-radius:50%;"></div>
                <div style="position:absolute;bottom:-40px;left:-20px;width:100px;height:100px;background:rgba(255,255,255,0.03);border-radius:50%;"></div>
                <div style="text-align:center;position:relative;">
                    <div style="font-size:12px;opacity:0.7;letter-spacing:1px;text-transform:uppercase;">Số dư khả dụng</div>
                    <div id="wdBalance" style="font-size:32px;font-weight:900;margin:8px 0;letter-spacing:-1px;">⏳ Đang tải...</div>
                    <div style="display:flex;justify-content:center;gap:20px;margin-top:12px;">
                        <div style="text-align:center;">
                            <div style="font-size:10px;opacity:0.6;">Tổng HH</div>
                            <div id="wdTotalComm" style="font-size:13px;font-weight:700;">—</div>
                        </div>
                        <div style="width:1px;background:rgba(255,255,255,0.2);"></div>
                        <div style="text-align:center;">
                            <div style="font-size:10px;opacity:0.6;">Đã rút</div>
                            <div id="wdTotalWithdrawn" style="font-size:13px;font-weight:700;">—</div>
                        </div>
                        <div style="width:1px;background:rgba(255,255,255,0.2);"></div>
                        <div style="text-align:center;">
                            <div style="font-size:10px;opacity:0.6;">Đang chờ</div>
                            <div id="wdTotalPending" style="font-size:13px;font-weight:700;">—</div>
                        </div>
                    </div>
                </div>
            </div>

            <div style="background:white;border-radius:16px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,0.06);margin-bottom:20px;">
                <h3 style="margin:0 0 16px;font-size:16px;color:#1e3a5f;">💰 Yêu Cầu Rút Tiền</h3>
                <div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:10px;padding:12px;margin-bottom:16px;font-size:12px;color:#92400e;">
                    <div>📌 Số tiền tối thiểu: <strong>100.000 VNĐ</strong></div>
                    <div>📌 Vui lòng nhập đầy đủ thông tin ngân hàng</div>
                </div>

                <div style="margin-bottom:14px;">
                    <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">Số tiền rút <span style="color:#ef4444;">*</span></label>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <input type="text" id="wdAmount" placeholder="Nhập số tiền..." oninput="wdFormatInput(this)"
                            style="flex:1;padding:10px 14px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;outline:none;">
                        <button onclick="wdFillAll()" style="padding:10px 16px;border:1px solid #d1d5db;background:white;color:#6b7280;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">Rút tất cả</button>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                    <div>
                        <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">Tên ngân hàng <span style="color:#ef4444;">*</span></label>
                        <input type="text" id="wdBankName" placeholder="VD: Vietcombank..."
                            style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">Số tài khoản <span style="color:#ef4444;">*</span></label>
                        <input type="text" id="wdBankAccount" placeholder="Nhập STK..."
                            style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none;box-sizing:border-box;">
                    </div>
                </div>

                <div style="margin-bottom:18px;">
                    <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">Tên thụ hưởng <span style="color:#ef4444;">*</span></label>
                    <input type="text" id="wdBankHolder" placeholder="Tên chủ tài khoản..."
                        style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none;box-sizing:border-box;">
                </div>

                <button onclick="wdSubmit()" id="wdSubmitBtn"
                    style="width:100%;padding:16px;border:none;background:#fad24c;color:#122546;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;letter-spacing:0.5px;transition:transform 0.15s;box-shadow:0 4px 16px rgba(250,210,76,0.4);font-family:inherit;"
                    onmouseover="this.style.transform='scale(1.02)';this.style.boxShadow='0 6px 24px rgba(250,210,76,0.5)'" onmouseout="this.style.transform='';this.style.boxShadow='0 4px 16px rgba(250,210,76,0.4)'">
                    💰 GỬI YÊU CẦU RÚT TIỀN
                </button>
            </div>

            <div style="background:white;border-radius:16px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
                <h3 style="margin:0 0 16px;font-size:16px;color:#1e3a5f;">📜 Lịch Sử Rút Tiền</h3>
                <div id="wdHistory" style="overflow-x:auto;">
                    <div style="text-align:center;padding:20px;color:#9ca3af;">Đang tải...</div>
                </div>
            </div>
        </div>
    `;

    // Load balance
    try {
        const balData = await apiCall('/api/affiliate/balance');
        if (balData.success) {
            window._wdBalance = balData.balance;
            document.getElementById('wdBalance').textContent = wdFormatMoney(balData.balance);
            document.getElementById('wdTotalComm').textContent = wdFormatMoney(balData.totalCommission);
            document.getElementById('wdTotalWithdrawn').textContent = wdFormatMoney(balData.totalWithdrawn);
            document.getElementById('wdTotalPending').textContent = wdFormatMoney(balData.totalPending);
            // Auto-fill bank info
            if (balData.bankInfo) {
                if (balData.bankInfo.bank_name) document.getElementById('wdBankName').value = balData.bankInfo.bank_name;
                if (balData.bankInfo.bank_account) document.getElementById('wdBankAccount').value = balData.bankInfo.bank_account;
                if (balData.bankInfo.bank_holder) document.getElementById('wdBankHolder').value = balData.bankInfo.bank_holder;
            }
        }
    } catch (e) {
        document.getElementById('wdBalance').textContent = 'Lỗi tải';
    }

    // Load history
    wdLoadHistory();

    // Check for newly approved withdrawals → show branded popup
    wdCheckApprovedPopup();
}

async function wdCheckApprovedPopup() {
    try {
        const data = await apiCall('/api/withdrawals');
        if (!data.withdrawals) return;
        const approved = data.withdrawals.filter(w => w.status === 'approved');
        if (approved.length === 0) return;

        const lastSeenId = parseInt(localStorage.getItem('wdLastSeenApprovedId') || '0');
        const newest = approved[0]; // sorted by created_at DESC
        if (newest.id > lastSeenId) {
            localStorage.setItem('wdLastSeenApprovedId', String(newest.id));
            if (lastSeenId > 0) { // Don't show on first ever visit
                wdShowApprovedBrandedPopup(newest.amount);
            }
        }
    } catch (e) { /* silent */ }
}

function wdShowApprovedBrandedPopup(amount) {
    const old = document.getElementById('wdApprovedPopup');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'wdApprovedPopup';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;';

    overlay.innerHTML = `
        <div style="background:white;border-radius:24px;max-width:420px;width:100%;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.4);animation:wdPopIn 0.4s ease;">
            <div style="background:#122546;padding:28px 28px 20px;text-align:center;position:relative;border-radius:24px 24px 0 0;">
                <div style="width:96px;height:96px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;border:4px solid #fad24c;box-shadow:0 4px 20px rgba(250,210,76,0.3);overflow:hidden;">
                    <img src="/images/logo.png" style="width:100%;height:100%;object-fit:cover;">
                </div>
                <div style="color:#fad24c;font-size:20px;font-weight:700;margin-bottom:2px;">Tiền Đã Về Tài Khoản!</div>
                <div style="color:white;font-size:13px;font-weight:700;margin-top:10px;">ĐỒNG PHỤC HV</div>
                <div style="color:rgba(255,255,255,0.7);font-size:11px;font-style:italic;margin-top:2px;">Tận Tâm Dựng Xây Giá Trị</div>
                <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.1);">
                    <a href="https://www.dongphuchv.vn" target="_blank" style="font-size:11px;color:#fad24c;text-decoration:none;">🌐 www.dongphuchv.vn</a>
                </div>
            </div>
            <div style="padding:24px;text-align:center;">
                <div style="font-size:13px;color:#6b7280;margin-bottom:4px;">Số tiền đã nhận</div>
                <div style="font-size:28px;font-weight:700;color:#122546;margin-bottom:16px;">${wdFormatMoney(amount)}</div>
                <div style="font-size:14px;color:#374151;line-height:1.8;margin-bottom:18px;">
                    Tiền đã được chuyển về tài khoản của Anh/Chị.<br>
                    Anh/Chị vui lòng kiểm tra tài khoản nhé! 🙏
                </div>
                <div style="font-size:14px;color:#122546;font-weight:600;margin-bottom:18px;line-height:1.6;">
                    Cảm ơn Anh/Chị đã luôn đồng hành cùng<br>🏢 Đồng Phục HV!
                </div>
                <button onclick="document.getElementById('wdApprovedPopup').remove()"
                    style="padding:14px 36px;border:none;background:#fad24c;color:#122546;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;transition:transform 0.15s;font-family:inherit;"
                    onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform=''">
                    Đã hiểu ✨
                </button>
            </div>
        </div>
    `;
    const style = document.createElement('style');
    style.textContent = '@keyframes wdPopIn { from { transform: scale(0.8) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }';
    overlay.appendChild(style);
    document.body.appendChild(overlay);
}

function wdFormatMoney(n) {
    if (!n && n !== 0) return '0 đ';
    return Number(n).toLocaleString('vi-VN') + ' đ';
}

function wdFillAll() {
    const bal = window._wdBalance || 0;
    document.getElementById('wdAmount').value = bal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function wdFormatInput(el) {
    let raw = el.value.replace(/\D/g, '');
    el.value = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function wdParseAmount(str) {
    return Number((str || '').replace(/\./g, ''));
}

async function wdLoadHistory() {
    const area = document.getElementById('wdHistory');
    try {
        const data = await apiCall('/api/withdrawals');
        if (!data.withdrawals || data.withdrawals.length === 0) {
            area.innerHTML = `<div style="text-align:center;padding:30px;color:#9ca3af;">
                <div style="font-size:32px;margin-bottom:8px;">💰</div>
                <div>Chưa có lịch sử rút tiền</div>
            </div>`;
            return;
        }

        area.innerHTML = `<table style="width:100%;font-size:12px;border-collapse:collapse;">
            <thead><tr style="background:#f8fafc;">
                <th style="padding:8px 10px;text-align:left;">Ngày</th>
                <th style="padding:8px 10px;text-align:right;">Số tiền</th>
                <th style="padding:8px 10px;text-align:center;">Trạng thái</th>
                <th style="padding:8px 10px;text-align:left;">Chi tiết</th>
            </tr></thead>
            <tbody>${data.withdrawals.map(w => {
                let statusHtml = '';
                let detailHtml = '';
                if (w.status === 'pending') {
                    statusHtml = '<span style="background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600;">⏳ Chờ xác nhận</span>';
                } else if (w.status === 'approved') {
                    statusHtml = '<span style="background:#d1fae5;color:#065f46;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600;">✅ Đã chuyển</span>';
                    if (w.transfer_image) {
                        detailHtml = `<span onclick="wdShowTransferImage('${w.transfer_image.replace(/'/g, "\\'")}')" style="cursor:pointer;color:#3b82f6;text-decoration:underline;font-size:11px;">📸 Xem ảnh CK</span>`;
                    }
                } else {
                    statusHtml = '<span style="background:#fee2e2;color:#991b1b;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600;">❌ Từ chối</span>';
                    if (w.reject_reason) {
                        detailHtml = `<span style="color:#ef4444;font-size:11px;" title="${w.reject_reason.replace(/"/g, '&quot;')}">Lý do: ${w.reject_reason.length > 20 ? w.reject_reason.substring(0, 20) + '...' : w.reject_reason}</span>`;
                    }
                }
                return `<tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:10px;">${w.created_at ? new Date(w.created_at).toLocaleDateString('vi-VN') : '-'}</td>
                    <td style="padding:10px;text-align:right;font-weight:700;color:#1e3a5f;">${wdFormatMoney(w.amount)}</td>
                    <td style="padding:10px;text-align:center;">${statusHtml}</td>
                    <td style="padding:10px;">${detailHtml}</td>
                </tr>`;
            }).join('')}</tbody>
        </table>`;
    } catch (e) {
        area.innerHTML = `<div style="text-align:center;padding:20px;color:#ef4444;">Lỗi tải lịch sử</div>`;
    }
}

function wdShowTransferImage(imgSrc) {
    const old = document.getElementById('wdImgPopup');
    if (old) old.remove();
    const overlay = document.createElement('div');
    overlay.id = 'wdImgPopup';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `<div style="max-width:500px;max-height:80vh;position:relative;">
        <span onclick="document.getElementById('wdImgPopup').remove()" style="position:absolute;top:-12px;right:-12px;background:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">✕</span>
        <img src="${imgSrc}" style="max-width:100%;max-height:80vh;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.4);">
    </div>`;
    document.body.appendChild(overlay);
}

async function wdSubmit() {
    const amount = wdParseAmount(document.getElementById('wdAmount').value);
    const bank_name = document.getElementById('wdBankName').value.trim();
    const bank_account = document.getElementById('wdBankAccount').value.trim();
    const bank_holder = document.getElementById('wdBankHolder').value.trim();

    if (!amount || amount < 100000) return showToast('Số tiền tối thiểu 100.000 VNĐ', 'error');
    if (!bank_name) return showToast('Vui lòng nhập tên ngân hàng', 'error');
    if (!bank_account) return showToast('Vui lòng nhập số tài khoản', 'error');
    if (!bank_holder) return showToast('Vui lòng nhập tên thụ hưởng', 'error');

    const balance = window._wdBalance || 0;
    if (amount > balance) return showToast(`Số dư không đủ! Số dư hiện tại: ${wdFormatMoney(balance)}`, 'error');

    const btn = document.getElementById('wdSubmitBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Đang gửi...';

    try {
        const data = await apiCall('/api/withdrawals', 'POST', { amount, bank_name, bank_account, bank_holder });
        if (data.success) {
            wdShowSuccessPopup(amount);
        } else {
            showToast(data.error || 'Lỗi gửi yêu cầu', 'error');
            btn.disabled = false;
            btn.textContent = '💰 GỬI YÊU CẦU RÚT TIỀN';
        }
    } catch (e) {
        showToast('Lỗi kết nối', 'error');
        btn.disabled = false;
        btn.textContent = '💰 GỬI YÊU CẦU RÚT TIỀN';
    }
}

function wdShowSuccessPopup(amount) {
    const old = document.getElementById('wdSuccessPopup');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'wdSuccessPopup';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;';

    overlay.innerHTML = `
        <div style="background:white;border-radius:24px;max-width:420px;width:100%;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.3);animation:wdPopIn 0.4s ease;">
            <div style="background:linear-gradient(135deg,#1e3a5f,#2d5a8e);padding:30px;text-align:center;">
                <div style="width:64px;height:64px;background:rgba(255,255,255,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:28px;">✅</div>
                <div style="color:white;font-size:18px;font-weight:700;">Yêu Cầu Đã Được Gửi!</div>
                <div style="color:rgba(255,255,255,0.7);font-size:12px;margin-top:4px;font-weight:600;">ĐỒNG PHỤC HV - XIN CÁM ƠN Ạ</div>
            </div>
            <div style="padding:24px;text-align:center;">
                <div style="font-size:13px;color:#6b7280;margin-bottom:4px;">Số tiền yêu cầu rút</div>
                <div style="font-size:26px;font-weight:900;color:#1e3a5f;margin-bottom:16px;">${wdFormatMoney(amount)}</div>
                <div style="background:#f0fdf4;border-radius:12px;padding:14px;margin-bottom:16px;">
                    <div style="font-size:13px;color:#166534;line-height:1.6;">
                        Công ty <strong>Đồng Phục HV</strong> sẽ xác nhận và chuyển tiền cho Anh/Chị trong thời gian sớm nhất.<br>
                        Vui lòng chờ trong giây lát! 🙏
                    </div>
                </div>
                <div style="font-size:11px;color:#9ca3af;margin-bottom:16px;">
                    ⏰ Thời gian xử lý: Trong giờ hành chính (9:00 - 18:00)
                </div>
                <button onclick="document.getElementById('wdSuccessPopup').remove(); handleRoute();"
                    style="padding:12px 32px;border:none;background:linear-gradient(135deg,#1e3a5f,#2d5a8e);color:white;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;">
                    Đã hiểu ✨
                </button>
            </div>
            <div style="background:#f8fafc;padding:10px;text-align:center;">
                <div style="font-size:10px;color:#9ca3af;">🏢 Đồng Phục HV — Đồng hành cùng bạn</div>
            </div>
        </div>
    `;
    // Add animation
    const style = document.createElement('style');
    style.textContent = '@keyframes wdPopIn { from { transform: scale(0.8) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }';
    overlay.appendChild(style);
    document.body.appendChild(overlay);
}
