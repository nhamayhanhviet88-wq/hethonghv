// ========== KHUYẾN MÃI GIẢM GIÁ PAGE ==========

async function renderKhuyenMaiPage(container) {
    container.innerHTML = `
        <div style="padding: 24px; max-width: 1200px; margin: 0 auto; font-family: 'Inter', sans-serif;">
            <!-- Header Block -->
            <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); border-radius: 16px; padding: 32px; color: white; margin-bottom: 28px; box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.3); position: relative; overflow: hidden;">
                <div style="position: absolute; right: -50px; bottom: -50px; font-size: 180px; opacity: 0.1; transform: rotate(-15deg); user-select: none;">🎁</div>
                <h2 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; display: flex; align-items: center; gap: 10px;">
                    <span>🎁 Quản Lý Khuyến Mãi Giảm Giá</span>
                </h2>
                <p style="margin: 8px 0 0; font-size: 15px; opacity: 0.9; max-width: 600px; line-height: 1.5;">
                    Tạo mã ưu đãi tự động 8 ký tự, quản lý loại quà tặng, chiết khấu và theo dõi trạng thái sử dụng của mã khuyến mãi.
                </p>
            </div>

            <!-- Toolbar & Actions -->
            <div style="background: white; border-radius: 12px; border: 1px solid #e5e7eb; padding: 20px; margin-bottom: 24px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <div style="display: flex; gap: 12px; flex: 1; min-width: 300px;">
                    <div style="position: relative; flex: 1; max-width: 360px;">
                        <span style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 16px;">🔍</span>
                        <input type="text" id="promoSearchInput" placeholder="Tìm kiếm mã khuyến mãi..." 
                            oninput="filterPromoCodes()"
                            style="width: 100%; padding: 10px 14px 10px 40px; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 14px; outline: none; transition: all 0.2s;"
                            onfocus="this.style.borderColor='#3b82f6'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)';"
                            onblur="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none';">
                    </div>
                    <select id="promoTypeFilter" onchange="filterPromoCodes()"
                        style="padding: 10px 14px; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 14px; color: #4b5563; background-color: white; outline: none; cursor: pointer;">
                        <option value="all">Tất cả loại ưu đãi</option>
                        <option value="discount">Giảm giá %</option>
                        <option value="gift">Tặng áo</option>
                    </select>
                </div>

                <div>
                    <button class="btn btn-primary" onclick="openCreatePromoModal()" 
                        style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 10px 20px; font-weight: 600; border-radius: 10px; display: flex; align-items: center; gap: 8px; border: none; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;"
                        onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(37, 99, 235, 0.2)';"
                        onmouseout="this.style.transform='none'; this.style.boxShadow='none';">
                        <span style="font-size: 16px;">➕</span> Tạo Mã Ưu Đãi Mới
                    </button>
                </div>
            </div>

            <!-- Codes Table Card -->
            <div style="background: white; border-radius: 16px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden;">
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead>
                            <tr style="background: #f8fafc; border-bottom: 1.5px solid #e5e7eb; color: #475569; font-weight: 700; font-size: 13px;">
                                <th style="padding: 16px 24px;">MÃ KHUYẾN MÃI</th>
                                <th style="padding: 16px 24px; white-space: nowrap;">LOẠI ƯU ĐÃI</th>
                                <th style="padding: 16px 24px;">CHI TIẾT</th>
                                <th style="padding: 16px 24px; white-space: nowrap;">LƯỢT DÙNG</th>
                                <th style="padding: 16px 24px; white-space: nowrap;">ĐƠN ÁP DỤNG</th>
                                <th style="padding: 16px 24px;">HẠN DÙNG</th>
                                <th style="padding: 16px 24px;">NGƯỜI TẠO</th>
                                <th style="padding: 16px 24px;">NGÀY TẠO</th>
                                <th style="padding: 16px 24px; text-align: center;">TRẠNG THÁI</th>
                                <th style="padding: 16px 24px; text-align: right;">HÀNH ĐỘNG</th>
                            </tr>
                        </thead>
                        <tbody id="promoCodesTableBody" style="font-size: 14px; color: #1e293b;">
                            <tr>
                                <td colspan="10" style="text-align: center; padding: 40px; color: #64748b;">
                                    <div style="font-size: 24px; margin-bottom: 8px;">⏳</div>
                                    Đang tải danh sách mã khuyến mãi...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Fetch and render the list
    await fetchAndRenderPromoCodes();
}

let _cachedPromoCodes = [];

async function fetchAndRenderPromoCodes() {
    try {
        const res = await apiCall('/api/promotion-codes');
        _cachedPromoCodes = res.items || [];
        window._promoCanEditMaxUses = res.can_edit_max_uses; // Save permission to window
        filterPromoCodes();
    } catch(e) {
        console.error('Error fetching promo codes:', e);
        const body = document.getElementById('promoCodesTableBody');
        if (body) {
            body.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px; color: #ef4444; font-weight: 600;">
                        ⚠️ Lỗi tải dữ liệu. Vui lòng thử lại sau.
                    </td>
                </tr>
            `;
        }
    }
}

function filterPromoCodes() {
    const body = document.getElementById('promoCodesTableBody');
    if (!body) return;

    const search = (document.getElementById('promoSearchInput')?.value || '').trim().toUpperCase();
    const typeFilter = document.getElementById('promoTypeFilter')?.value || 'all';

    const filtered = _cachedPromoCodes.filter(item => {
        const matchesSearch = item.code.toUpperCase().includes(search);
        const matchesType = typeFilter === 'all' || item.promo_type === typeFilter;
        return matchesSearch && matchesType;
    });

    if (filtered.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 40px; color: #64748b;">
                    Không tìm thấy mã khuyến mãi nào phù hợp.
                </td>
            </tr>
        `;
        return;
    }

    body.innerHTML = filtered.map(item => {
        const isDiscount = item.promo_type === 'discount';
        const typeBadge = isDiscount 
            ? `<span style="background-color: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;">🏷️ Giảm Giá %</span>`
            : `<span style="background-color: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;">👕 Tặng Áo</span>`;

        const detailsText = isDiscount
            ? `<strong style="color: #2563eb; font-size: 16px;">Giảm ${item.discount_pct}%</strong>`
            : `<strong style="color: #d97706; font-size: 16px;">Tặng ${item.gift_quantity} áo</strong>`;

        // 1. Used count display
        const usedCount = item.used_count || 0;
        const maxUses = item.max_uses || 1;
        const isFullyUsed = usedCount >= maxUses;
        const usedText = `${usedCount}/${maxUses}`;
        const usedBadge = isFullyUsed
            ? `<span style="color: #dc2626; font-weight: 700; background: #fee2e2; padding: 4px 8px; border-radius: 6px; font-size: 13px;">${usedText} (Hết lượt)</span>`
            : `<span style="color: #16a34a; font-weight: 700; background: #dcfce7; padding: 4px 8px; border-radius: 6px; font-size: 13px;">${usedText}</span>`;

        let ordersHtml = '';
        if (item.applied_orders && item.applied_orders.length > 0) {
            ordersHtml = `<div style="margin-top: 6px; display: flex; flex-wrap: wrap; gap: 4px; max-width: 200px;">` +
                item.applied_orders.map(o => 
                    `<span onclick="sessionStorage.setItem('dhtSearchOnLoad', '${o.order_code}'); navigate('don-hang-tong');" style="cursor: pointer; font-size: 11px; background: #eff6ff; color: #1e40af; padding: 2px 6px; border-radius: 4px; border: 1px solid #bfdbfe; font-weight: 700; transition: all 0.15s;" onmouseover="this.style.background='#dbeafe';" onmouseout="this.style.background='#eff6ff';" title="Nhấp để xem đơn hàng trên DHT">#${o.order_code}</span>`
                ).join('') + 
                `</div>`;
        }

        // 2. Expiration date display
        let expireDisplay = '';
        let isExpired = false;
        if (item.expire_at) {
            const expireDate = new Date(item.expire_at);
            const now = new Date();
            isExpired = now > expireDate;
            const formattedExpire = expireDate.toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
            expireDisplay = isExpired
                ? `<span style="color: #dc2626; font-weight: 600; background: #fee2e2; padding: 4px 8px; border-radius: 6px; font-size: 13px;">${formattedExpire} (Hết hạn)</span>`
                : `<span style="color: #475569; font-weight: 500;">${formattedExpire}</span>`;
        } else {
            expireDisplay = `<span style="color: #64748b; font-style: italic;">Vô thời hạn</span>`;
        }

        const isActive = item.status === 'active' && !isFullyUsed && !isExpired;
        const statusSwitch = `
            <label style="position: relative; display: inline-block; width: 44px; height: 24px; cursor: pointer;">
                <input type="checkbox" ${item.status === 'active' ? 'checked' : ''} onchange="togglePromoStatus(${item.id}, this.checked)" style="opacity: 0; width: 0; height: 0;">
                <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${item.status === 'active' ? '#10b981' : '#cbd5e1'}; transition: .3s; border-radius: 24px;"></span>
                <span style="position: absolute; content: ''; height: 18px; width: 18px; left: ${item.status === 'active' ? '22px' : '4px'}; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%;"></span>
            </label>
        `;

        const creator = item.creator_name || item.creator_username || 'Hệ thống';
        const createdDate = item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '---';

        return `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background-color 0.15s;" onmouseover="this.style.backgroundColor='#f8fafc';" onmouseout="this.style.backgroundColor='transparent';">
                <td style="padding: 16px 24px; font-weight: 700; font-family: monospace; font-size: 16px; color: #1e3a8a; letter-spacing: 0.5px;">${item.code}</td>
                <td style="padding: 16px 24px; white-space: nowrap;">${typeBadge}</td>
                <td style="padding: 16px 24px;">${detailsText}</td>
                <td style="padding: 16px 24px;">
                    <div>${usedBadge}</div>
                </td>
                <td style="padding: 16px 24px;">
                    ${ordersHtml || '<span style="color: #94a3b8; font-style: italic; font-size: 13px;">Chưa dùng</span>'}
                </td>
                <td style="padding: 16px 24px;">${expireDisplay}</td>
                <td style="padding: 16px 24px; color: #475569; font-weight: 500;">${creator}</td>
                <td style="padding: 16px 24px; color: #64748b;">${createdDate}</td>
                <td style="padding: 16px 24px; text-align: center;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                        ${statusSwitch}
                        <span style="font-size: 11px; font-weight: 700; color: ${item.status === 'active' ? '#059669' : '#64748b'};">${item.status === 'active' ? 'KÍCH HOẠT' : 'TẠM KHÓA'}</span>
                    </div>
                </td>
                <td style="padding: 16px 24px; text-align: right;">
                    <button class="btn btn-xs btn-danger" onclick="deletePromoCode(${item.id}, '${item.code}')" 
                        style="padding: 6px 12px; border-radius: 8px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                        🗑️ Xóa
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function openCreatePromoModal() {
    const isAllowedEditMax = !!window._promoCanEditMaxUses;
    const bodyHTML = `
        <div style="font-family: 'Inter', sans-serif;">
            <div class="form-group" style="margin-bottom: 16px;">
                <label style="font-weight: 600; color: #374151; display: block; margin-bottom: 6px;">Loại Khuyến Mãi</label>
                <select id="newPromoType" class="form-control" onchange="toggleModalFields(this.value)"
                    style="width: 100%; padding: 10px 12px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 14px; outline: none; background: white;">
                    <option value="discount">Giảm giá theo %</option>
                    <option value="gift">Tặng áo</option>
                </select>
            </div>
            
            <div style="display: flex; gap: 16px; margin-bottom: 16px;">
                <div class="form-group" id="promoDiscountGroup" style="flex: 1; margin-bottom: 0;">
                    <label style="font-weight: 600; color: #374151; display: block; margin-bottom: 6px;">Phần Trăm Giảm Giá (%)</label>
                    <input type="number" id="newPromoDiscountPct" min="1" max="100" placeholder="Nhập số từ 1 - 100" class="form-control"
                        style="width: 100%; padding: 10px 12px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 14px; outline: none;">
                </div>

                <div class="form-group" id="promoGiftGroup" style="flex: 1; margin-bottom: 0;">
                    <label style="font-weight: 600; color: #374151; display: block; margin-bottom: 6px;">Số Lượng Áo Tặng</label>
                    <input type="number" id="newPromoGiftQty" min="1" placeholder="Nhập số lượng áo tặng" class="form-control"
                        style="width: 100%; padding: 10px 12px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 14px; outline: none;">
                </div>
            </div>

            <div class="form-group" style="margin-bottom: 16px;">
                <label style="font-weight: 600; color: #374151; display: block; margin-bottom: 6px;">Số Lần Được Áp Dụng</label>
                <input type="number" id="newPromoMaxUses" min="1" value="1" class="form-control"
                    ${isAllowedEditMax ? '' : 'disabled style="background-color: #f3f4f6; color: #9ca3af; cursor: not-allowed;"'}
                    style="width: 100%; padding: 10px 12px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 14px; outline: none;">
                ${isAllowedEditMax ? '' : '<span style="font-size: 11px; color: #dc2626; font-weight: 500; margin-top: 4px; display: block;">⚠️ Bạn không được phân quyền thay đổi số lượt áp dụng (mặc định là 1 lần).</span>'}
            </div>

            <div class="form-group" style="margin-bottom: 16px;">
                <label style="font-weight: 600; color: #374151; display: block; margin-bottom: 6px;">Thời Gian Áp Dụng (Hạn Dùng)</label>
                <input type="datetime-local" id="newPromoExpireAt" class="form-control"
                    style="width: 100%; padding: 10px 12px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 14px; outline: none;">
                <span style="font-size: 11px; color: #6b7280; margin-top: 4px; display: block;">(Để trống nếu muốn sử dụng vô thời hạn cho tới khi hết lượt áp dụng)</span>
            </div>
        </div>
    `;

    openModal('➕ Tạo Mã Ưu Đãi Mới', bodyHTML, `
        <button class="btn btn-secondary" onclick="closeModal()" style="border-radius: 8px; padding: 8px 16px;">Hủy</button>
        <button class="btn btn-success" onclick="submitCreatePromoCode()" style="border-radius: 8px; padding: 8px 16px; background-color: #10b981; border: none; color: white;">Tạo mã tự động</button>
    `);

    // Set initial active/disabled state
    toggleModalFields('discount');
}

function toggleModalFields(type) {
    const discInput = document.getElementById('newPromoDiscountPct');
    const giftInput = document.getElementById('newPromoGiftQty');
    if (!discInput || !giftInput) return;

    if (type === 'discount') {
        discInput.disabled = false;
        discInput.style.backgroundColor = '';
        discInput.style.color = '';
        discInput.style.cursor = '';
        
        giftInput.disabled = true;
        giftInput.style.backgroundColor = '#f3f4f6';
        giftInput.style.color = '#9ca3af';
        giftInput.style.cursor = 'not-allowed';
        giftInput.value = '';
    } else {
        discInput.disabled = true;
        discInput.style.backgroundColor = '#f3f4f6';
        discInput.style.color = '#9ca3af';
        discInput.style.cursor = 'not-allowed';
        discInput.value = '';
        
        giftInput.disabled = false;
        giftInput.style.backgroundColor = '';
        giftInput.style.color = '';
        giftInput.style.cursor = '';
    }
}

async function submitCreatePromoCode() {
    const type = document.getElementById('newPromoType').value;
    const body = { promo_type: type };

    if (type === 'discount') {
        const val = parseFloat(document.getElementById('newPromoDiscountPct').value);
        if (isNaN(val) || val <= 0 || val > 100) {
            showToast('Phần trăm giảm giá phải từ 1 đến 100.', 'error');
            return;
        }
        body.discount_pct = val;
    } else {
        const val = parseInt(document.getElementById('newPromoGiftQty').value);
        if (isNaN(val) || val <= 0) {
            showToast('Số lượng áo tặng phải lớn hơn 0.', 'error');
            return;
        }
        body.gift_quantity = val;
    }

    const maxUsesInp = document.getElementById('newPromoMaxUses');
    if (maxUsesInp) {
        const maxUses = parseInt(maxUsesInp.value);
        if (!isNaN(maxUses) && maxUses > 0) {
            body.max_uses = maxUses;
        }
    }

    const expireAtInp = document.getElementById('newPromoExpireAt');
    if (expireAtInp && expireAtInp.value) {
        body.expire_at = expireAtInp.value;
    }

    try {
        const res = await apiCall('/api/promotion-codes', 'POST', body);
        if (res.success) {
            showToast(res.message);
            closeModal();
            await fetchAndRenderPromoCodes();
        } else {
            showToast(res.error || 'Lỗi tạo mã.', 'error');
        }
    } catch(e) {
        showToast(e.message || 'Lỗi kết nối tới máy chủ.', 'error');
    }
}

async function togglePromoStatus(id, checked) {
    const status = checked ? 'active' : 'inactive';
    try {
        const res = await apiCall(`/api/promotion-codes/${id}`, 'PUT', { status });
        if (res.success) {
            showToast(res.message);
            // Update in cache to prevent reloading from server
            const idx = _cachedPromoCodes.findIndex(x => x.id === id);
            if (idx !== -1) {
                _cachedPromoCodes[idx].status = status;
            }
            filterPromoCodes();
        } else {
            showToast(res.error || 'Lỗi cập nhật trạng thái.', 'error');
            filterPromoCodes(); // revert UI switch
        }
    } catch(e) {
        showToast('Lỗi kết nối.', 'error');
        filterPromoCodes(); // revert UI switch
    }
}

async function deletePromoCode(id, code) {
    if (!confirm(`Bạn có chắc chắn muốn xóa mã ưu đãi ${code}? Thao tác này không thể hoàn tác.`)) {
        return;
    }
    try {
        const res = await apiCall(`/api/promotion-codes/${id}`, 'DELETE');
        if (res.success) {
            showToast(res.message);
            _cachedPromoCodes = _cachedPromoCodes.filter(x => x.id !== id);
            filterPromoCodes();
        } else {
            showToast(res.error || 'Lỗi xóa mã.', 'error');
        }
    } catch(e) {
        showToast('Lỗi kết nối.', 'error');
    }
}
