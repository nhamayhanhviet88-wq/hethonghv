/**
 * Mobile Báo Giá CTV/HH Page Controller
 * Path: public/js/pages/mobile-baogiactvhh.js
 */

async function apiFetch(url, options = {}) {
    const method = options.method || 'GET';
    const body = options.body || null;
    const fetchOptions = {
        method,
        headers: {},
        credentials: 'include'
    };
    if (body) {
        fetchOptions.headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(body);
    }
    const res = await fetch(url, fetchOptions);
    if (res.status === 401 || res.status === 403) {
        window.location.href = '/';
        throw new Error('Chưa đăng nhập');
    }
    return res.json();
}

var _mState = {
    activeTab: 'calculator',
    activeConfig: null,
    customers: [],
    selectedCustomer: null,
    quantity: '',
    selectedMaterialIndex: 0,
    surcharges: {
        collar: false,
        raglan: false,
        color_block: false,
        primary_school: false
    },
    printType: 'none', // none, pet, print3d, screen, embroidery
    petShapes: [],
    screenColors: 1,
    embroideryCost: 15000,
    print3dCost: 30000,
    petChestPrint: false,
    includeCommission: false,
    historyLogs: [],
    configVersions: []
};

async function initMobileBaogiactvhhPage() {
    console.log("Mobile Báo Giá CTV/HH page initialized");
    
    // Check Giám đốc or Quản lý cấp cao role to show Settings tab
    const isManager = typeof currentUser !== 'undefined' && currentUser && (currentUser.role === 'giam_doc' || currentUser.role === 'quan_ly_cap_cao');
    const settingsBtn = document.getElementById('m-tab-btn-settings');
    if (settingsBtn && isManager) {
        settingsBtn.style.display = 'flex';
    }
    
    // Load config
    await _mLoadActiveConfig();
    
    // Default switch to calculator
    _mSwitchTab('calculator');
}

async function _mLoadActiveConfig() {
    try {
        const res = await apiFetch('/api/ctv-quotations/config/active');
        if (res && res.config) {
            _mState.activeConfig = res.config;
            _mState.print3dCost = res.config.print_prices.print3d?.flat_price || 30000;
        } else {
            _mState.activeConfig = null;
        }
    } catch (e) {
        console.error('Mobile active config error:', e);
        _mState.activeConfig = null;
    }
}

function _mSwitchTab(tabName) {
    _mState.activeTab = tabName;
    
    document.querySelectorAll('.m-tabs-container .m-tab-btn').forEach(btn => btn.classList.remove('active'));
    const btn = document.getElementById(`m-tab-btn-${tabName}`);
    if (btn) btn.classList.add('active');
    
    const container = document.getElementById('m-dynamic-content');
    if (!container) return;
    
    if (tabName === 'calculator') {
        _mRenderCalculator(container);
    } else if (tabName === 'history') {
        _mRenderHistory(container);
    } else if (tabName === 'settings') {
        _mRenderSettings(container);
    }
}

// ==========================================
// MOBILE TAB 1: CALCULATOR
// ==========================================

function _mRenderCalculator(container) {
    if (!_mState.activeConfig) {
        container.innerHTML = `
            <div class="m-card text-center" style="padding: 30px;">
                <div style="font-size: 48px; margin-bottom: 12px;">⚠️</div>
                <h4 style="margin-bottom:6px;">Chưa có biểu phí hoạt động</h4>
                <p style="color:#64748b; font-size:12px; line-height:1.5;">Vui lòng thiết lập cấu hình biểu phí active trên bản PC của Quản lý.</p>
            </div>
        `;
        return;
    }
    
    const config = _mState.activeConfig;
    
    container.innerHTML = `
        <!-- Customer & Qty -->
        <div class="m-card">
            <div class="m-card-title">👤 Khách Hàng & Số lượng</div>
            <div class="m-form-group">
                <label>Tìm kiếm khách hàng chăm sóc</label>
                <input type="text" class="m-input" id="m_cust_search" placeholder="Gõ tên hoặc số điện thoại..." oninput="_mOnCustomerSearch(this.value)">
                <div id="m_cust_dropdown" class="m-autocomplete-dropdown" style="display:none;"></div>
                <div id="m_selected_cust_badge"></div>
            </div>
            
            <div class="m-form-group" style="margin-bottom:0;">
                <label>Số lượng áo đặt hàng</label>
                <input type="number" class="m-input" id="m_qty" min="1" value="${_mState.quantity}" oninput="_mOnQuantityChange(this.value)">
            </div>
        </div>
        
        <!-- Fabric Material & Surcharges -->
        <div class="m-card">
            <div class="m-card-title">👕 Phôi Vải & Phụ Phí</div>
            <div class="m-form-group">
                <label>Chất liệu vải</label>
                <select class="m-select" id="m_material" onchange="_mOnMaterialChange(this.value)">
                    ${config.materials.map((m, idx) => `
                        <option value="${idx}" ${idx === _mState.selectedMaterialIndex ? 'selected' : ''}>
                            ${m.name} - ${Number(m.price).toLocaleString('vi-VN')}đ (May cổ tròn)
                        </option>
                    `).join('')}
                </select>
            </div>
            
            ${(function() {
                const commissionPercent = Number(config.print_prices?.commission_percent || 15);
                const isChecked = _mState.includeCommission ? 'checked' : '';
                return `
                    <div class="m-form-group">
                        <label style="display: flex; align-items: center; justify-content: space-between; background: #fff7ed; border: 2px solid #ea580c; border-radius: 8px; padding: 10px 14px; cursor: pointer; user-select: none; margin: 0;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 20px;">💰</span>
                                <div style="text-align: left;">
                                    <div style="font-weight: 800; color: #c2410c; font-size: 13px;">Cộng hoa hồng đại lý (+${commissionPercent}%)</div>
                                    <div style="font-size: 10px; color: #ea580c; font-weight: normal;">Tự động cộng thêm +${commissionPercent}% vào đơn giá vải</div>
                                </div>
                            </div>
                            <input type="checkbox" id="m_commission_toggle" ${isChecked} onchange="_mToggleCommission(this.checked)" style="width: 18px; height: 18px; cursor: pointer; accent-color: #ea580c; margin: 0;">
                        </label>
                    </div>
                `;
            })()}
            
            <div class="m-form-group" style="margin-bottom:0;">
                <label>Phụ phí thêm</label>
                <div class="m-checkbox-group">
                    ${(function() {
                        const ordered = _mGetOrderedOptionalSurcharges(config);
                        return ordered.filter(item => {
                            const priceInfo = _mGetPriceInfo(item.value);
                            return !priceInfo.isContact;
                        }).map(item => {
                            const isChecked = _mState.surcharges[item.key] ? 'checked' : '';
                            const priceInfo = _mGetPriceInfo(item.value);
                            const safeId = 'm_sc_' + item.key.replace(/\s+/g, '_');
                            return `
                                <label class="m-checkbox-label">
                                    <input type="checkbox" id="${safeId}" ${isChecked} onchange="_mToggleSurcharge('${item.key}', this.checked)">
                                    ${item.name} (${priceInfo.text})
                                </label>
                            `;
                        }).join('');
                    })()}
                </div>
            </div>
        </div>
        
        <!-- Printing Options -->
        <div class="m-card">
            <div class="m-card-title">🎨 Phương Án In PET</div>
            <div class="m-form-group" style="margin-bottom:0;">
                <label>Loại hình in</label>
                <select class="m-select" id="m_print_type" onchange="_mOnPrintTypeChange(this.value)">
                    <option value="none" ${_mState.printType === 'none' ? 'selected' : ''}>Không in</option>
                    <option value="pet" ${_mState.printType === 'pet' ? 'selected' : ''}>In PET CTV</option>
                </select>
            </div>
            
            <div id="m_print_panel"></div>
        </div>
        
        <!-- Calculation Box -->
        <div class="m-result-box" id="m_result_box"></div>
    `;
    
    _mRenderSelectedCustomer();
    _mRenderPrintPanel();
    _mUpdateCalculations();
}

async function _mOnCustomerSearch(val) {
    const dropdown = document.getElementById('m_cust_dropdown');
    if (!dropdown) return;
    
    const query = val.trim();
    if (query.length < 2) {
        dropdown.style.display = 'none';
        return;
    }
    
    try {
        const res = await apiFetch(`/api/ctv-quotations/customers?search=${encodeURIComponent(query)}`);
        if (res && res.customers) {
            _mState.customers = res.customers;
            if (res.customers.length === 0) {
                dropdown.innerHTML = `<div style="padding:10px; color:#64748b; font-size:12px; text-align:center;">Không tìm thấy khách hàng</div>`;
            } else {
                dropdown.innerHTML = res.customers.map(c => `
                    <div class="m-autocomplete-item" onclick="_mSelectCustomer(${c.id})">
                        <strong>${c.customer_name}</strong> - ${c.phone}
                    </div>
                `).join('');
            }
            dropdown.style.display = 'block';
        }
    } catch(e) {
        console.error(e);
    }
}

function _mSelectCustomer(id) {
    const customer = _mState.customers.find(c => c.id === id);
    if (customer) {
        _mState.selectedCustomer = customer;
        const searchInput = document.getElementById('m_cust_search');
        if (searchInput) searchInput.value = '';
        _mRenderSelectedCustomer();
        _mUpdateCalculations();
    }
    const dropdown = document.getElementById('m_cust_dropdown');
    if (dropdown) dropdown.style.display = 'none';
}

function _mRenderSelectedCustomer() {
    const container = document.getElementById('m_selected_cust_badge');
    if (!container) return;
    
    if (_mState.selectedCustomer) {
        container.innerHTML = `
            <div class="m-selected-badge">
                👤 ${_mState.selectedCustomer.customer_name} (${_mState.selectedCustomer.phone})
                <button type="button" onclick="_mClearCustomer()">×</button>
            </div>
        `;
    } else {
        container.innerHTML = '';
    }
}

function _mClearCustomer() {
    _mState.selectedCustomer = null;
    _mRenderSelectedCustomer();
    _mUpdateCalculations();
}

function _mOnQuantityChange(val) {
    if (val === '') {
        _mState.quantity = '';
    } else {
        _mState.quantity = Math.max(1, parseInt(val) || 1);
    }
    _mUpdateCalculations();
}

function _mOnMaterialChange(idx) {
    _mState.selectedMaterialIndex = Number(idx);
    _mUpdateCalculations();
}

function _mToggleCommission(checked) {
    _mState.includeCommission = !!checked;
    _mUpdateCalculations();
}

function _mToggleSurcharge(key, checked) {
    _mState.surcharges[key] = !!checked;
    _mUpdateCalculations();
}

function _mTogglePetChestPrint(checked) {
    _mState.petChestPrint = !!checked;
    _mUpdateCalculations();
}

function _mGetOrderedOptionalSurcharges(config) {
    if (!config) return [];
    const allItems = {
        collar: { key: 'collar', name: 'Cổ bẻ', value: config.surcharges.collar || 0 },
        primary_school: { key: 'primary_school', name: 'Tiểu học', value: config.surcharges.primary_school || 0 },
        raglan: { key: 'raglan', name: 'Raglan', value: config.surcharges.raglan || 0 },
        color_block: { key: 'color_block', name: 'Phối màu vải', value: config.surcharges.color_block || 0 }
    };
    const customList = config.surcharges?.custom || [];
    customList.forEach(item => {
        const customKey = 'custom_' + item.name.replace(/\s+/g, '_');
        allItems[customKey] = { key: customKey, name: item.name, value: item.value || 0, is_custom: true };
    });
    let ordered = [];
    if (config.surcharges?.display_order && Array.isArray(config.surcharges.display_order)) {
        config.surcharges.display_order.forEach(o => {
            let found = null;
            const oKey = typeof o === 'string' ? o : o.key;
            const oName = typeof o === 'string' ? o : o.name;
            
            if (oKey && allItems[oKey]) {
                found = allItems[oKey];
                found.name = oName || found.name;
                delete allItems[oKey];
            } else {
                const matchedKey = Object.keys(allItems).find(k => allItems[k].name === oName || allItems[k].key === oName);
                if (matchedKey) {
                    found = allItems[matchedKey];
                    found.name = oName || found.name;
                    delete allItems[matchedKey];
                }
            }
            if (found && found.key !== 'qty_under_20') {
                ordered.push(found);
            }
        });
    } else {
        Object.keys(allItems).forEach(k => {
            if (allItems[k].key !== 'qty_under_20') {
                ordered.push(allItems[k]);
            }
        });
    }
    return ordered;
}

function _mOnPrintTypeChange(val) {
    _mState.printType = val;
    _mRenderPrintPanel();
    _mUpdateCalculations();
}

function _mRenderPrintPanel() {
    const panel = document.getElementById('m_print_panel');
    if (!panel) return;
    
    if (_mState.printType === 'none') {
        panel.innerHTML = '';
        return;
    }
    
    const config = _mState.activeConfig;
    
    if (_mState.printType === 'pet') {
        const petConfig = config.print_prices.pet || { sheet_price: 60000, spacing: 0.4 };
        const chestPrice = petConfig.chest_price !== undefined ? Number(petConfig.chest_price) : 5000;
        panel.innerHTML = `
            <div style="background:#f0fdfa; border:1px dashed #99f6e4; border-radius:10px; padding:10px; margin-top:12px;">
                <div style="font-size:11px; font-weight:700; color:#0d9488; margin-bottom:8px;">🧬 CẤU HÌNH PET KHỔ MÉT</div>
                
                <div style="background:#e0f2fe; border:1px solid #bae6fd; border-radius:8px; padding:8px; margin-bottom:10px; display:flex; align-items:center;">
                    <label style="display:flex; align-items:center; gap:6px; font-weight:700; color:#0369a1; cursor:pointer; margin:0; font-size:12px; width: 100%;">
                        <input type="checkbox" id="m_pet_chest_print" ${_mState.petChestPrint ? 'checked' : ''} onchange="_mTogglePetChestPrint(this.checked)" style="transform:scale(1.1); margin-right: 4px;">
                        In PET Ngực (Cố định +${chestPrice.toLocaleString('vi-VN')} đ/áo)
                    </label>
                </div>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:8px;">
                    <div>
                        <label style="font-size:10px; color:#475569; font-weight:700;">RỘNG (CM)</label>
                        <input type="number" class="m-input" id="m_pet_w" step="0.1" value="10">
                    </div>
                    <div>
                        <label style="font-size:10px; color:#475569; font-weight:700;">CAO (CM)</label>
                        <input type="number" class="m-input" id="m_pet_h" step="0.1" value="10">
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1.2fr 1fr; gap:6px;">
                    <div>
                        <label style="font-size:10px; color:#475569; font-weight:700;">SỐ HÌNH/ÁO</label>
                        <input type="number" class="m-input" id="m_pet_qty" value="1" min="1">
                    </div>
                    <div style="display:flex; align-items:end;">
                        <button type="button" class="m-btn" style="padding:10px 0; font-size:12px;" onclick="_mAddPetShape()">Thêm hình</button>
                    </div>
                </div>
                
                <div id="m_pet_shapes_list" class="m-shapes-list"></div>
            </div>
        `;
        _mRenderPetShapesList();
    } else if (_mState.printType === 'print3d') {
        const config3d = config.print_prices.print3d || { flat_price: 30000 };
        const flatPrice = Number(config3d.flat_price) || 30000;
        panel.innerHTML = `
            <div style="background:#f0f9ff; border:1px dashed #bae6fd; border-radius:10px; padding:10px; margin-top:12px;">
                <div style="font-size:11px; font-weight:700; color:#0284c7; margin-bottom:6px;">🌀 IN 3D TOÀN THÂN</div>
                <div style="font-size:11px; color:#0369a1; margin-bottom:8px;">Giá cấu hình: <strong>${flatPrice.toLocaleString('vi-VN')} đ/áo</strong></div>
                <div class="m-form-group" style="margin-bottom:0;">
                    <label style="color:#0284c7;">Giá in 3D (đ/áo)</label>
                    <input type="text" class="m-input" id="m_3d_cost" value="${_mState.print3dCost}" oninput="this.value = this.value.replace(/,/g, '.').replace(/[^0-9.]/g, ''); _mOn3dCostChange(this.value)">
                </div>
            </div>
        `;
    } else if (_mState.printType === 'screen') {
        const screenConfig = config.print_prices.screen || { qty_threshold: 20 };
        panel.innerHTML = `
            <div style="background:#faf5ff; border:1px dashed #c084fc; border-radius:10px; padding:10px; margin-top:12px;">
                <div class="m-form-group" style="margin-bottom:0;">
                    <label style="color:#7e22ce;">Số màu in lưới</label>
                    <input type="number" class="m-input" id="m_screen_colors" min="1" value="${_mState.screenColors}" oninput="_mOnScreenColorsChange(this.value)">
                </div>
            </div>
        `;
    } else if (_mState.printType === 'embroidery') {
        panel.innerHTML = `
            <div style="background:#fffbeb; border:1px dashed #fcd34d; border-radius:10px; padding:10px; margin-top:12px;">
                <div class="m-form-group" style="margin-bottom:0;">
                    <label style="color:#b45309;">Giá thêu CTV (đ/áo)</label>
                    <input type="text" class="m-input" id="m_emb_cost" value="${_mState.embroideryCost}" oninput="_mOnEmbCostChange(this.value)">
                </div>
            </div>
        `;
    }
}

function _mOnScreenColorsChange(val) {
    _mState.screenColors = Math.max(1, Number(val) || 1);
    _mUpdateCalculations();
}

function _mOn3dCostChange(val) {
    _mState.print3dCost = Math.max(0, Number(val) || 0);
    _mUpdateCalculations();
}

function _mGetPriceInfo(val) {
    const cleanVal = String(val === undefined || val === null ? '' : val).trim();
    if (cleanVal === '') {
        return { isContact: false, value: 0, text: '0đ' };
    }
    const parsed = parseFloat(cleanVal.replace(/[^0-9.-]/g, ''));
    if (!isNaN(parsed) && isFinite(parsed) && /^-?\d+(\.\d+)?$/.test(cleanVal.replace(/[,.đ]/g, ''))) {
        return { isContact: false, value: parsed, text: (parsed >= 0 ? '+' : '') + parsed.toLocaleString('vi-VN') + 'đ' };
    }
    return { isContact: true, value: 0, text: cleanVal };
}

function _mGetEmbPriceInfo(val) {
    const cleanVal = String(val || '').trim();
    const parsed = parseFloat(cleanVal.replace(/[^0-9.-]/g, ''));
    if (!isNaN(parsed) && isFinite(parsed)) {
        return { isContact: false, value: parsed, text: parsed.toLocaleString('vi-VN') + 'đ/áo' };
    }
    return { isContact: true, value: 0, text: cleanVal || 'Liên hệ' };
}

function _mOnEmbCostChange(val) {
    _mState.embroideryCost = val;
    _mUpdateCalculations();
}

function _mAddPetShape() {
    const w = parseFloat(document.getElementById('m_pet_w')?.value) || 0;
    const h = parseFloat(document.getElementById('m_pet_h')?.value) || 0;
    const qty = parseInt(document.getElementById('m_pet_qty')?.value) || 0;
    
    if (w <= 0 || h <= 0 || qty <= 0) {
        showToast('Kích thước hoặc SL không hợp lệ', 'error');
        return;
    }
    
    _mState.petShapes.push({ width: w, height: h, qty_per_shirt: qty, mode: 'aligned' });
    _mRenderPetShapesList();
    _mUpdateCalculations();
}

function _mRemovePetShape(idx) {
    _mState.petShapes.splice(idx, 1);
    _mRenderPetShapesList();
    _mUpdateCalculations();
}

function _mRenderPetShapesList() {
    const list = document.getElementById('m_pet_shapes_list');
    if (!list) return;
    
    if (_mState.petShapes.length === 0) {
        list.innerHTML = `<div style="font-size:11px; color:#64748b; font-style:italic; text-align:center; padding:6px 0;">Chưa có hình in nào</div>`;
        return;
    }
    
    list.innerHTML = _mState.petShapes.map((s, idx) => `
        <div class="m-shape-card">
            <div class="m-shape-info">
                #${idx+1}: ${s.width}x${s.height} cm (${s.qty_per_shirt} hình)
            </div>
            <button type="button" style="background:#fee2e2; border:none; color:#ef4444; padding:4px 8px; border-radius:6px; font-weight:700;" onclick="_mRemovePetShape(${idx})">Xóa</button>
        </div>
    `).join('');
}

// 2D PET calculation wrapper helper
function _mCalcPetPlacement(W_sheet, H_sheet, w, h, s) {
    if (w <= 0 || h <= 0 || W_sheet <= 0 || H_sheet <= 0) return { aligned: 0, optimized: 0 };
    s = Number(s) || 0;
    
    const nw_horiz = Math.floor((W_sheet + s) / (w + s));
    const nh_horiz = Math.floor((H_sheet + s) / (h + s));
    const countHoriz = (nw_horiz > 0 && nh_horiz > 0) ? nw_horiz * nh_horiz : 0;
    
    const nw_vert = Math.floor((W_sheet + s) / (h + s));
    const nh_vert = Math.floor((H_sheet + s) / (w + s));
    const countVert = (nw_vert > 0 && nh_vert > 0) ? nw_vert * nh_vert : 0;
    
    const aligned = Math.max(countHoriz, countVert);
    let optimized = aligned;
    
    function checkHorizontalSplit(wA, hA, wB, hB) {
        const maxA = Math.floor((H_sheet + s) / (hA + s));
        for (let rA = 0; rA <= maxA; rA++) {
            const heightA = rA > 0 ? (rA * (hA + s) - s) : 0;
            const remainH = H_sheet - heightA - (rA > 0 ? s : 0);
            const rB = remainH >= hB ? Math.floor((remainH + s) / (hB + s)) : 0;
            const cA = Math.floor((W_sheet + s) / (wA + s));
            const cB = Math.floor((W_sheet + s) / (wB + s));
            const total = (rA * cA) + (rB * cB);
            if (total > optimized) optimized = total;
        }
    }
    
    function checkVerticalSplit(wA, hA, wB, hB) {
        const maxA = Math.floor((W_sheet + s) / (wA + s));
        for (let cA = 0; cA <= maxA; cA++) {
            const widthA = cA > 0 ? (cA * (wA + s) - s) : 0;
            const remainW = W_sheet - widthA - (cA > 0 ? s : 0);
            const cB = remainW >= wB ? Math.floor((remainW + s) / (wB + s)) : 0;
            const rA = Math.floor((H_sheet + s) / (hA + s));
            const rB = Math.floor((H_sheet + s) / (hB + s));
            const total = (cA * rA) + (cB * rB);
            if (total > optimized) optimized = total;
        }
    }
    
    checkHorizontalSplit(w, h, h, w);
    checkHorizontalSplit(h, w, w, h);
    checkVerticalSplit(w, h, h, w);
    checkVerticalSplit(h, w, w, h);
    
    return { aligned, optimized };
}

function _mParseShippingLimit(val) {
    const str = String(val || '').toLowerCase();
    let num = parseInt(str.replace(/[^0-9]/g, '')) || 0;
    if (str.includes('triệu') || str.includes('tr') || str.includes('m') || (num > 0 && num < 1000 && !str.includes('áo') && !str.includes('pcs'))) {
        num = num * 1000000;
    }
    return num;
}

function _mMatchShippingPolicy(shippingList, qty, grandTotal) {
    if (!shippingList || shippingList.length === 0) return null;
    
    const isMoneyBased = shippingList.some(s => {
        const max = _mParseShippingLimit(s.max_qty);
        return max >= 10000;
    });
    
    const valueToCompare = isMoneyBased ? grandTotal : qty;
    
    return shippingList.find(s => {
        const min = _mParseShippingLimit(s.min_qty);
        const max = _mParseShippingLimit(s.max_qty) || 999999999;
        return valueToCompare >= min && valueToCompare <= max;
    });
}

function _mCalculateAllCosts() {
    const config = _mState.activeConfig;
    if (!config) return null;
    
    const qty = _mState.quantity;
    const m = config.materials[_mState.selectedMaterialIndex];
    const basePrice = m ? Number(m.price) : 0;
    const materialName = m ? m.name : 'Unknown';
    
    let surchargeTotal = 0;
    const surchargesBreakdown = [];
    
    if (qty > 0 && qty < 20) {
        const priceInfo = _mGetPriceInfo(config.surcharges.qty_under_20);
        surchargeTotal += priceInfo.value;
        surchargesBreakdown.push({
            label: 'Số lượng < 20 áo',
            price: priceInfo.value,
            text: priceInfo.text,
            isContact: priceInfo.isContact,
            contactText: priceInfo.text
        });
    }
    
    // Optional surcharges ordered
    const optionalSurcharges = _mGetOrderedOptionalSurcharges(config);
    optionalSurcharges.forEach(item => {
        if (_mState.surcharges[item.key]) {
            const priceInfo = _mGetPriceInfo(item.value);
            surchargeTotal += priceInfo.value;
            surchargesBreakdown.push({
                label: item.name,
                price: priceInfo.value,
                text: priceInfo.text,
                isContact: priceInfo.isContact,
                contactText: priceInfo.text
            });
        }
    });
    
    // Always put 'Giá Tại Xưởng' at the very end of surcharges breakdown
    surchargesBreakdown.sort((a, b) => {
        const aHas = a.label.toLowerCase().includes('giá tại xưởng') || a.label.toLowerCase().includes('gia tai xuong');
        const bHas = b.label.toLowerCase().includes('giá tại xưởng') || b.label.toLowerCase().includes('gia tai xuong');
        if (aHas && !bHas) return 1;
        if (!aHas && bHas) return -1;
        return 0;
    });
    
    let printCost = 0;
    const printBreakdown = [];
    const pt = _mState.printType;
    
    if (pt === 'pet') {
        const petConfig = config.print_prices.pet || { sheet_price: 60000, spacing: 0.4 };
        const sheetPrice = Number(petConfig.sheet_price) || 60000;
        const spacing = Number(petConfig.spacing) || 0.4;
        const chestPrice = petConfig.chest_price !== undefined ? Number(petConfig.chest_price) : 5000;
        const minPositionPrice = petConfig.min_position_price !== undefined ? Number(petConfig.min_position_price) : 5000;
        
        // Add flat chest print if enabled
        if (_mState.petChestPrint) {
            printCost += chestPrice;
            printBreakdown.push({ label: `In PET Ngực (cố định)`, price: chestPrice });
        }
        
        _mState.petShapes.forEach((s, idx) => {
            const packed = _mState.activeConfig ? _mCalcPetPlacement(58, 100, s.width, s.height, spacing) : { aligned: 0, optimized: 0 };
            const perSheetCount = packed.aligned; // Mobile aligned calculation
            
            if (perSheetCount > 0) {
                const sheetFraction = s.qty_per_shirt / perSheetCount;
                let costPerShirt = Math.round(sheetFraction * sheetPrice);
                let labelText = `PET #${idx+1}: ${s.width}x${s.height}cm`;
                
                if (costPerShirt < minPositionPrice) {
                    costPerShirt = minPositionPrice;
                    labelText += ` (Tối thiểu ${minPositionPrice.toLocaleString('vi-VN')}đ)`;
                }
                
                costPerShirt = Math.ceil(costPerShirt / 1000) * 1000;
                
                printCost += costPerShirt;
                printBreakdown.push({ label: labelText, price: costPerShirt });
            }
        });
    } else if (pt === 'print3d') {
        const flatPrice = Number(_mState.print3dCost) || 0;
        printCost = flatPrice;
        printBreakdown.push({ label: `In 3D toàn thân (${flatPrice.toLocaleString('vi-VN')} đ/áo)`, price: flatPrice });
    } else if (pt === 'screen') {
        const configScreen = config.print_prices.screen || { qty_threshold: 20, price_low: 60000, price_high_1_3: 4000, price_high_4_plus: 3500 };
        const colors = _mState.screenColors;
        const threshold = configScreen.qty_threshold || 20;
        let singleScreenPrice = 0;
        
        if (qty === 0) {
            singleScreenPrice = 0;
            printBreakdown.push({ label: `In lưới (${colors} màu, chưa nhập số lượng)`, price: 0 });
        } else if (qty < threshold) {
            singleScreenPrice = Math.round((configScreen.price_low * colors) / qty);
            printBreakdown.push({ label: `In lưới (${colors} màu)`, price: singleScreenPrice });
        } else {
            singleScreenPrice = (colors <= 3 ? configScreen.price_high_1_3 : configScreen.price_high_4_plus) * colors;
            printBreakdown.push({ label: `In lưới (${colors} màu)`, price: singleScreenPrice });
        }
        printCost = singleScreenPrice;
    } else if (pt === 'embroidery') {
        const embInfo = _mGetEmbPriceInfo(_mState.embroideryCost);
        if (embInfo.isContact) {
            printCost = 0;
            printBreakdown.push({ label: `Thêu vi tính: ${embInfo.text}`, price: 0, isContact: true, contactText: embInfo.text });
        } else {
            printCost = embInfo.value;
            printBreakdown.push({ label: `Thêu vi tính đồng giá`, price: printCost });
        }
    }
    
    const commissionPercent = Number(config.print_prices?.commission_percent || 15);
    const commissionAmount = _mState.includeCommission ? Math.round(basePrice * commissionPercent / 100) : 0;
    
    const finalPricePerShirt = basePrice + surchargeTotal + printCost + commissionAmount;
    const grandTotal = finalPricePerShirt * qty;
    
    const shippingList = _mState.activeConfig?.print_prices?.shipping || [
        { min_qty: "0", max_qty: "9.999.999", desc: "Không hỗ trợ vận chuyển (Nhận hàng tại xưởng)", value: 0 },
        { min_qty: "10.000.000", max_qty: "Trở lên", desc: "Miễn phí ship 1 chiều", value: 0 }
    ];
    let matchedShipping = null;
    if (qty > 0) {
        matchedShipping = _mMatchShippingPolicy(shippingList, qty, grandTotal);
    }
    
    return {
        materialName,
        basePrice,
        surchargesBreakdown,
        surchargeTotal,
        printBreakdown,
        printCost,
        commissionAmount,
        commissionPercent,
        finalPricePerShirt,
        grandTotal,
        matchedShipping
    };
}

function _mUpdateCalculations() {
    const box = document.getElementById('m_result_box');
    if (!box) return;
    
    const calc = _mCalculateAllCosts();
    if (!calc) {
        box.innerHTML = `<div style="text-align:center; font-style:italic;">Không thể tính toán chi phí.</div>`;
        return;
    }
    
    const hasCustomer = !!_mState.selectedCustomer;
    
    const contactTexts = [];
    calc.printBreakdown.forEach(p => {
        if (p.isContact) contactTexts.push(p.contactText);
    });
    calc.surchargesBreakdown.forEach(s => {
        if (s.isContact) contactTexts.push(s.contactText);
    });
    const hasContactPrice = contactTexts.length > 0;
    const contactNote = hasContactPrice ? ` + ${contactTexts.join(', ')}` : '';
    
    const finalPricePerShirtText = `${calc.finalPricePerShirt.toLocaleString('vi-VN')} đ/áo${contactNote}`;
    
    const grandTotalText = `${calc.grandTotal.toLocaleString('vi-VN')} đ${contactNote}`;
        
    const wordsText = hasContactPrice
        ? `${docSoTienVietNam(calc.grandTotal)} (và ${contactTexts.join(', ')})`
        : docSoTienVietNam(calc.grandTotal);
    
    box.innerHTML = `
        <div class="m-result-title">📊 Chi tiết đơn hàng</div>
        
        <div class="m-result-row">
            <span>Khách hàng:</span>
            <strong style="color:white;">${hasCustomer ? _mState.selectedCustomer.customer_name : '<span style="color:#ef4444;">Chưa chọn khách</span>'}</strong>
        </div>
        <div class="m-result-row">
            <span>Số lượng:</span>
            <strong style="color:white;">${_mState.quantity ? _mState.quantity + ' áo' : '<span style="color:#ef4444;">Chưa nhập số lượng</span>'}</strong>
        </div>
        <div class="m-result-row">
            <span>Chất liệu vải:</span>
            <strong style="color:white;">${calc.materialName}</strong>
        </div>
        <div class="m-result-row">
            <span>Đơn giá phôi:</span>
            <span>${calc.basePrice.toLocaleString('vi-VN')} đ/áo</span>
        </div>
        
        ${calc.commissionAmount > 0 ? `
            <div style="border-top:1px dashed rgba(255,255,255,0.15); margin:6px 0; padding-top:6px;">
                <div class="m-result-row" style="color:#f97316; font-weight:bold; font-size:12px;">
                    <span>Hoa hồng đại lý (+${calc.commissionPercent}%):</span>
                    <span>+${calc.commissionAmount.toLocaleString('vi-VN')} đ/áo</span>
                </div>
            </div>
        ` : ''}
        
        ${calc.surchargesBreakdown.length > 0 ? `
            <div style="border-top:1px dashed rgba(255,255,255,0.15); margin:6px 0; padding-top:6px;">
                <div style="font-size:10px; color:#94a3b8; font-weight:700; margin-bottom:4px;">PHỤ PHÍ:</div>
                ${calc.surchargesBreakdown.map(s => {
                    if (s.isContact) {
                        return `
                            <div class="m-result-row" style="font-size:12px;">
                                <span>• ${s.label} ${s.contactText}</span>
                                <span></span>
                            </div>
                        `;
                    }
                    return `
                        <div class="m-result-row" style="font-size:12px;">
                            <span>• ${s.label}</span>
                            <span>${s.price >= 0 ? '+' : ''}${s.price.toLocaleString('vi-VN')} đ</span>
                        </div>
                    `;
                }).join('')}
            </div>
        ` : ''}
        
        ${calc.printBreakdown.length > 0 ? `
            <div style="border-top:1px dashed rgba(255,255,255,0.15); margin:6px 0; padding-top:6px;">
                <div style="font-size:10px; color:#94a3b8; font-weight:700; margin-bottom:4px;">IN / THÊU:</div>
                ${calc.printBreakdown.map(p => {
                    if (p.isContact) {
                        return `
                            <div class="m-result-row" style="font-size:12px;">
                                <span>• ${p.label}</span>
                                <span></span>
                            </div>
                        `;
                    }
                    return `
                        <div class="m-result-row" style="font-size:12px;">
                            <span>• ${p.label}</span>
                            <span>+${p.price.toLocaleString('vi-VN')} đ</span>
                        </div>
                    `;
                }).join('')}
            </div>
        ` : ''}
        
        <div class="m-result-row total">
            <span>Đơn giá/Áo:</span>
            <span style="color:#38bdf8;">${finalPricePerShirtText}</span>
        </div>
        <div style="font-size: 11px; color: #94a3b8; text-align: right; margin-top: -4px; margin-bottom: 4px; font-style: italic;">
            * Giá chưa bao gồm VAT
        </div>
        <div class="m-result-row" style="font-size:15px; font-weight:700; margin-top:4px;">
            <span>Tổng đơn:</span>
            <span>${grandTotalText}</span>
        </div>
        
        <div style="font-size:11.5px; font-style:italic; color:#38bdf8; text-align:right; margin-top:4px;">
            Bằng chữ: ${wordsText}
        </div>
        
        ${calc.matchedShipping ? `
        <div class="m-result-row" style="color: #38bdf8; font-size: 12px; border-top: 1px dashed rgba(255,255,255,0.15); padding-top: 6px; margin-top: 6px;">
            <span>Hỗ trợ vận chuyển:</span>
            <span style="text-align: right; font-weight: 600;">${calc.matchedShipping.desc}</span>
        </div>
        ` : ''}
        
        <div style="margin-top:14px; display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <button class="m-btn-secondary" style="background:transparent; border-color:rgba(255,255,255,0.3); color:white;" onclick="_mOpenExportModal()">🖨️ Xuất Bản In</button>
            <button class="m-btn" style="background:#22c55e; box-shadow:none;" onclick="_mSaveQuotation()" ${!hasCustomer ? 'disabled style="opacity:0.5;"' : ''}>💾 Lưu Giá</button>
        </div>
    `;
}

async function _mSaveQuotation() {
    if (!_mState.selectedCustomer) {
        showToast('Vui lòng chọn khách hàng', 'error');
        return;
    }
    
    const calc = _mCalculateAllCosts();
    if (!calc) return;
    
    const body = {
        customer_id: _mState.selectedCustomer.id,
        config_version_id: _mState.activeConfig.id,
        input_details: {
            quantity: _mState.quantity,
            selectedMaterialIndex: _mState.selectedMaterialIndex,
            surcharges: _mState.surcharges,
            printType: _mState.printType,
            petShapes: _mState.petShapes,
            screenColors: _mState.screenColors,
            embroideryCost: _mState.embroideryCost,
            print3dCost: _mState.print3dCost,
            petChestPrint: _mState.petChestPrint,
            materialName: calc.materialName
        },
        calculated_price: calc.finalPricePerShirt,
        total_amount: calc.grandTotal
    };
    
    try {
        const res = await apiFetch('/api/ctv-quotations', {
            method: 'POST',
            body
        });
        if (res && res.success) {
            showToast('Đã lưu báo giá thành công!', 'success');
            _mState.selectedCustomer = null;
            _mState.petShapes = [];
            _mRenderSelectedCustomer();
            _mRenderPrintPanel();
            _mUpdateCalculations();
        } else {
            showToast(res.error || 'Lỗi lưu báo giá', 'error');
        }
    } catch(e) {
        showToast('Lỗi kết nối: ' + e.message, 'error');
    }
}

function _mOpenExportModal(mode = 'ctv') {
    _mState.exportMode = mode;
    const calc = _mCalculateAllCosts();
    if (!calc) return;
    
    const hasCustomer = !!_mState.selectedCustomer;
    const name = hasCustomer ? _mState.selectedCustomer.customer_name : 'Quý Khách Hàng';
    const phone = hasCustomer ? _mState.selectedCustomer.phone : 'Chưa có SĐT';
    const dateStr = vnDateStr(vnNow());
    const code = (mode === 'customer' ? 'BGKH-M' : 'BGCTV-M') + Math.floor(Math.random()*90000 + 10000);
    
    const contactTexts = [];
    calc.printBreakdown.forEach(p => {
        if (p.isContact) contactTexts.push(p.contactText);
    });
    calc.surchargesBreakdown.forEach(s => {
        if (s.isContact) contactTexts.push(s.contactText);
    });
    const hasContactPrice = contactTexts.length > 0;
    const contactNote = hasContactPrice ? ` + ${contactTexts.join(', ')}` : '';
    
    const finalPricePerShirtText = `${calc.finalPricePerShirt.toLocaleString('vi-VN')} đ/áo${contactNote}`;
    const grandTotalText = `${calc.grandTotal.toLocaleString('vi-VN')} đ${contactNote}`;
    const wordsText = hasContactPrice
        ? `${docSoTienVietNam(calc.grandTotal)} (và ${contactTexts.join(', ')})`
        : docSoTienVietNam(calc.grandTotal);
    
    const container = document.getElementById('m_print_area');
    if (!container) return;
    
    container.innerHTML = `
        <div style="font-family:'Inter', sans-serif; color:#1e293b; line-height:1.4; font-size:12px;">
            <!-- Toggle Mode Button Group (no-print) -->
            <div class="no-print" style="display:flex; background:#f1f5f9; padding:2px; border-radius:8px; gap:2px; border:1px solid #cbd5e1; margin-bottom: 12px; font-family:'Inter', sans-serif;">
                <button onclick="_mOpenExportModal('ctv')" style="background: ${mode === 'ctv' ? '#2563eb' : 'transparent'}; color: ${mode === 'ctv' ? 'white' : '#475569'}; border: none; padding: 6px 0; border-radius: 6px; font-weight:750; font-size:11px; cursor:pointer; flex: 1; text-align: center; transition: all 0.2s;">👥 Bản in CTV</button>
                <button onclick="_mOpenExportModal('customer')" style="background: ${mode === 'customer' ? '#f97316' : 'transparent'}; color: ${mode === 'customer' ? 'white' : '#475569'}; border: none; padding: 6px 0; border-radius: 6px; font-weight:750; font-size:11px; cursor:pointer; flex: 1; text-align: center; transition: all 0.2s;">🛍️ Bản in Khách hàng</button>
            </div>

            <div style="border-bottom:2px double #e2e8f0; padding-bottom:10px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:start;">
                <div>
                    <h4 style="margin:0; font-size:14px; font-weight:800; color:#1e3a8a;">ĐỒNG PHỤC HV</h4>
                    <p style="margin:2px 0 0 0; font-size:10px; color:#64748b;">Xưởng May Đồng Phục HV</p>
                </div>
                <div style="text-align:right;">
                    <h5 style="margin:0; font-size:11px; color:#475569;">${mode === 'customer' ? 'BÁO GIÁ SẢN PHẨM' : 'BÁO GIÁ CTV'}</h5>
                    <p style="margin:2px 0 0 0; font-size:9px; color:#94a3b8;">${code} | ${dateStr}</p>
                </div>
            </div>
            
            <div style="background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; padding:10px; margin-bottom:14px;">
                <div style="margin-bottom:4px;">• ${mode === 'customer' ? 'Tên Khách hàng' : 'CTV/Khách hàng'}: <strong>${name}</strong></div>
                <div style="margin-bottom:4px;">• Số điện thoại: <strong>${phone}</strong></div>
                <div>• SL áo: <strong>${_mState.quantity} chiếc</strong> (Áo thun cổ tròn)</div>
            </div>
            
            <table style="width:100%; border-collapse:collapse; font-size:11.5px; border:1px solid #cbd5e1; margin-bottom:14px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="border:1px solid #cbd5e1; padding:6px; text-align:left;">Hạng mục may & in</th>
                        <th style="border:1px solid #cbd5e1; padding:6px; text-align:right; width:100px;">Đơn giá</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="border:1px solid #cbd5e1; padding:6px;">Phôi vải ${calc.materialName}</td>
                        <td style="border:1px solid #cbd5e1; padding:6px; text-align:right;">${(mode === 'customer' ? (calc.basePrice + calc.commissionAmount) : calc.basePrice).toLocaleString('vi-VN')} đ</td>
                    </tr>
                    ${(mode !== 'customer' && calc.commissionAmount > 0) ? `
                        <tr>
                            <td style="border:1px solid #cbd5e1; padding:6px; padding-left:14px; color:#ea580c; font-weight:bold;">+ Hoa hồng đại lý (+${calc.commissionPercent}%)</td>
                            <td style="border:1px solid #cbd5e1; padding:6px; text-align:right; color:#ea580c; font-weight:bold;">+${calc.commissionAmount.toLocaleString('vi-VN')} đ</td>
                        </tr>
                    ` : ''}
                    ${calc.surchargesBreakdown.map(s => `
                        <tr>
                            <td style="border:1px solid #cbd5e1; padding:6px; padding-left:14px; color:#475569;">+ Phụ phí: ${s.label}</td>
                            <td style="border:1px solid #cbd5e1; padding:6px; text-align:right; color:#475569;">${s.isContact ? s.contactText : `${s.price >= 0 ? '+' : ''}${s.price.toLocaleString('vi-VN')} đ`}</td>
                        </tr>
                    `).join('')}
                    ${calc.printBreakdown.map(p => `
                        <tr>
                            <td style="border:1px solid #cbd5e1; padding:6px; padding-left:14px; color:#0d9488;">+ In/thêu: ${p.label}</td>
                            <td style="border:1px solid #cbd5e1; padding:6px; text-align:right; color:#0d9488;">${p.isContact ? p.contactText : `+${p.price.toLocaleString('vi-VN')} đ`}</td>
                        </tr>
                    `).join('')}
                    <tr style="font-weight:700; background:#f8fafc;">
                        <td style="border:1px solid #cbd5e1; padding:8px; text-align:right;">Đơn giá tổng:</td>
                        <td style="border:1px solid #cbd5e1; padding:8px; text-align:right; color:#1e3a8a;">${finalPricePerShirtText}</td>
                    </tr>
                </tbody>
            </table>
            
            <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px; text-align:right;">
                <div style="font-size:10px; color:#64748b; margin-bottom:4px; font-style:italic;">* Giá chưa bao gồm VAT</div>
                ${calc.matchedShipping ? `
                <div style="font-size:11px; color:#0369a1; margin-bottom:6px; font-weight:600;">
                    🚚 Hỗ trợ vận chuyển: ${calc.matchedShipping.desc}
                </div>
                ` : ''}
                <div style="font-size:11px; color:#64748b;">Tổng cộng:</div>
                <div style="font-size:18px; font-weight:900; color:#1e3a8a;">${grandTotalText}</div>
                <div style="font-size:11.5px; font-style:italic; color:#0369a1; margin-top:4px;">
                    Bằng chữ: <strong>${wordsText}</strong>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('m_export_modal').style.display = 'flex';
}

function _mCloseExportModal() {
    document.getElementById('m_export_modal').style.display = 'none';
}

function _mCopyTextQuotation() {
    const calc = _mCalculateAllCosts();
    if (!calc) return;
    
    const mode = _mState.exportMode || 'ctv';
    const hasCustomer = !!_mState.selectedCustomer;
    const name = hasCustomer ? _mState.selectedCustomer.customer_name : 'Quý Khách Hàng';
    const phone = hasCustomer ? _mState.selectedCustomer.phone : 'Chưa có SĐT';
    const dateStr = vnDateStr(vnNow());
    
    let text = mode === 'customer' ? `🤝 BÁO GIÁ SẢN PHẨM ĐỒNG PHỤC (MOBILE) 🤝\n` : `🤝 BÁO GIÁ ĐẠI LÝ / CTV (MOBILE) 🤝\n`;
    text += `Ngày: ${dateStr}\n`;
    text += `----------------------------------------\n`;
    text += `• ${mode === 'customer' ? 'Khách hàng' : 'Khách hàng/Đại lý'}: ${name} (${phone})\n`;
    text += `• Số lượng: ${_mState.quantity} áo (Cổ tròn)\n`;
    text += `• Chất liệu: ${calc.materialName}\n`;
    text += `----------------------------------------\n`;
    
    const displayBasePrice = mode === 'customer' ? (calc.basePrice + calc.commissionAmount) : calc.basePrice;
    text += `• Giá phôi: ${displayBasePrice.toLocaleString('vi-VN')} đ/áo\n`;
    if (mode !== 'customer' && calc.commissionAmount > 0) {
        text += `  + Hoa hồng đại lý (+${calc.commissionPercent}%): +${calc.commissionAmount.toLocaleString('vi-VN')} đ/áo\n`;
    }
    
    calc.surchargesBreakdown.forEach(s => {
        text += `  + Phụ phí ${s.label}: ${s.price >= 0 ? '+' : ''}${s.price.toLocaleString('vi-VN')} đ\n`;
    });
    
    calc.printBreakdown.forEach(p => {
        text += `  + In/thêu ${p.label}: ${p.isContact ? p.contactText : '+' + p.price.toLocaleString('vi-VN') + ' đ'}\n`;
    });
    
    const hasContactPriceText = calc.printBreakdown.some(p => p.isContact);
    const finalPricePerShirtTextCopy = hasContactPriceText 
        ? `${calc.finalPricePerShirt.toLocaleString('vi-VN')} đ/áo + Thêu liên hệ`
        : `${calc.finalPricePerShirt.toLocaleString('vi-VN')} đ/áo`;
    
    const grandTotalTextCopy = hasContactPriceText
        ? `${calc.grandTotal.toLocaleString('vi-VN')} đ + Thêu liên hệ`
        : `${calc.grandTotal.toLocaleString('vi-VN')} đ`;
        
    const wordsTextCopy = hasContactPriceText
        ? `${docSoTienVietNam(calc.grandTotal)} (và giá thêu liên hệ)`
        : docSoTienVietNam(calc.grandTotal);
        
    text += `----------------------------------------\n`;
    text += `💰 ĐƠN GIÁ: ${finalPricePerShirtTextCopy}\n`;
    text += `* Giá chưa bao gồm VAT\n`;
    text += `💵 TỔNG CỘNG: ${grandTotalTextCopy}\n`;
    text += `✍️ (Chữ: ${wordsTextCopy})\n`;
    if (calc.matchedShipping) {
        text += `🚚 Vận chuyển: ${calc.matchedShipping.desc}\n`;
    }
    text += `----------------------------------------\n`;
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('Đã sao chép text báo giá!', 'success');
    }).catch(err => {
        showToast('Lỗi copy: ' + err.message, 'error');
    });
}

// ==========================================
// MOBILE TAB 2: HISTORY
// ==========================================

async function _mRenderHistory(container) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    container.innerHTML = `
        <div class="m-card">
            <div class="m-card-title">📜 Lịch Sử Đã Tạo</div>
            
            <div class="m-form-group">
                <input type="text" id="m_history_search" class="m-input" placeholder="Tìm tên hoặc SĐT khách..." oninput="_mOnHistoryFilter()">
            </div>
            
            <div class="m-filter-row">
                <select id="m_history_month" class="m-select" onchange="_mOnHistoryFilter()">
                    <option value="">-- Tất cả tháng --</option>
                    ${Array.from({length: 12}, (_, i) => `
                        <option value="${i+1}" ${i+1 === currentMonth ? 'selected' : ''}>Tháng ${i+1}</option>
                    `).join('')}
                </select>
                <select id="m_history_year" class="m-select" onchange="_mOnHistoryFilter()">
                    <option value="">-- Tất cả năm --</option>
                    <option value="${currentYear}" selected>${currentYear}</option>
                    <option value="${currentYear-1}">${currentYear-1}</option>
                </select>
            </div>
            
            <button class="m-btn-secondary" style="margin-bottom:12px;" onclick="_mLoadHistoryLogs()">🔄 Tải lại danh sách</button>
            
            <div id="m_history_list_container">
                <div style="text-align:center; padding:20px; color:#64748b;">Đang tải lịch sử...</div>
            </div>
        </div>
    `;
    
    await _mLoadHistoryLogs();
}

async function _mLoadHistoryLogs() {
    const searchVal = document.getElementById('m_history_search')?.value || '';
    const mVal = document.getElementById('m_history_month')?.value || '';
    const yVal = document.getElementById('m_history_year')?.value || '';
    
    let url = `/api/ctv-quotations?1=1`;
    if (searchVal) url += `&search=${encodeURIComponent(searchVal)}`;
    if (mVal) url += `&month=${mVal}`;
    if (yVal) url += `&year=${yVal}`;
    
    try {
        const res = await apiFetch(url);
        const container = document.getElementById('m_history_list_container');
        if (!container) return;
        
        if (res && res.quotations) {
            _mState.historyLogs = res.quotations;
            _mRenderHistoryList(container, res.quotations);
        } else {
            container.innerHTML = `<div style="color:#ef4444; text-align:center; padding:10px;">Lỗi tải dữ liệu</div>`;
        }
    } catch(e) {
        console.error(e);
    }
}

var _mDebounce = null;
function _mOnHistoryFilter() {
    clearTimeout(_mDebounce);
    _mDebounce = setTimeout(() => {
        _mLoadHistoryLogs();
    }, 450);
}

function _mRenderHistoryList(container, list) {
    if (list.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:24px; color:#64748b; font-style:italic; font-size:12.5px;">Không tìm thấy lịch sử báo giá</div>`;
        return;
    }
    
    container.innerHTML = list.map(q => {
        const dateStr = vnFormat(q.created_at, 'HH:mm DD/MM/YYYY');
        const details = q.input_details || {};
        return `
            <div class="m-history-item">
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
                    <div>
                        <strong style="font-size:13.5px; color:#1e293b;">${q.customer_name || 'N/A'}</strong>
                        <div style="font-size:11px; color:#64748b; margin-top:2px;">SĐT: ${q.customer_phone || ''}</div>
                    </div>
                    <span style="font-size:10.5px; color:#94a3b8; font-weight:700;">${dateStr}</span>
                </div>
                
                <div style="display:flex; justify-content:space-between; font-size:12.5px; margin-bottom:8px; color:#475569;">
                    <span>Vải: <strong>${details.materialName || 'N/A'}</strong> | SL: <strong>${details.quantity || 0} áo</strong></span>
                    <strong style="color:#1e3a8a; font-size:13px;">${Number(q.total_amount).toLocaleString('vi-VN')} đ</strong>
                </div>
                
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:10.5px; color:#94a3b8;">Người tạo: ${q.creator_name || 'N/A'}</span>
                    <button class="m-btn-secondary" style="padding:4px 10px; width:auto; font-size:11px;" onclick="_mShowHistoryDetail(${q.id})">Xem chi tiết</button>
                </div>
            </div>
        `;
    }).join('');
}

function _mShowHistoryDetail(quoteId) {
    const q = _mState.historyLogs.find(log => log.id === quoteId);
    if (!q) return;
    
    // Preview snapshot inside modal using exact same mechanism
    const tempState = {
        activeConfig: q.config_snapshot,
        selectedCustomer: { customer_name: q.customer_name, phone: q.customer_phone },
        quantity: q.input_details.quantity,
        selectedMaterialIndex: q.input_details.selectedMaterialIndex,
        surcharges: q.input_details.surcharges,
        printType: q.input_details.printType,
        petShapes: q.input_details.petShapes || [],
        screenColors: q.input_details.screenColors || 1,
        embroideryCost: q.input_details.embroideryCost || 15000,
        print3dCost: q.input_details.print3dCost || 30000,
        petChestPrint: q.input_details.petChestPrint || false
    };
    
    const originalConfig = _mState.activeConfig;
    const originalCustomer = _mState.selectedCustomer;
    const originalQty = _mState.quantity;
    const originalMat = _mState.selectedMaterialIndex;
    const originalSc = _mState.surcharges;
    const originalPt = _mState.printType;
    const originalPet = _mState.petShapes;
    const originalScr = _mState.screenColors;
    const originalEmb = _mState.embroideryCost;
    const originalPrint3d = _mState.print3dCost;
    const originalPetChest = _mState.petChestPrint;
    
    _mState.activeConfig = tempState.activeConfig;
    _mState.selectedCustomer = tempState.selectedCustomer;
    _mState.quantity = tempState.quantity;
    _mState.selectedMaterialIndex = tempState.selectedMaterialIndex;
    _mState.surcharges = tempState.surcharges;
    _mState.printType = tempState.printType;
    _mState.petShapes = tempState.petShapes;
    _mState.screenColors = tempState.screenColors;
    _mState.embroideryCost = tempState.embroideryCost;
    _mState.print3dCost = tempState.print3dCost;
    _mState.petChestPrint = tempState.petChestPrint;
    
    _mOpenExportModal();
    
    // Restore
    _mState.activeConfig = originalConfig;
    _mState.selectedCustomer = originalCustomer;
    _mState.quantity = originalQty;
    _mState.selectedMaterialIndex = originalMat;
    _mState.surcharges = originalSc;
    _mState.printType = originalPt;
    _mState.petShapes = originalPet;
    _mState.screenColors = originalScr;
    _mState.embroideryCost = originalEmb;
    _mState.print3dCost = originalPrint3d;
    _mState.petChestPrint = originalPetChest;
}

// ==========================================
// MOBILE TAB 3: SETTINGS (ADMINS ONLY)
// ==========================================

async function _mRenderSettings(container) {
    container.innerHTML = `
        <div class="m-card">
            <div class="m-card-title">⚙️ Thiết Lập Biểu Phí</div>
            <div style="font-size:12px; color:#64748b; margin-bottom:14px; line-height:1.5;">
                Bạn đang truy cập menu quản trị di động. Vui lòng sử dụng giao diện PC (Desktop) để tạo/chỉnh sửa hoặc cập nhật các phiên bản biểu phí cấu hình một cách chi tiết và an toàn nhất.
            </div>
            
            <button class="m-btn-secondary" style="margin-bottom:12px;" onclick="_mLoadConfigVersionsList()">🔄 Tải danh sách cấu hình</button>
            
            <div id="m_config_list_container">
                <div style="text-align:center; padding:20px; color:#64748b;">Đang tải...</div>
            </div>
        </div>
    `;
    
    await _mLoadConfigVersionsList();
}

async function _mLoadConfigVersionsList() {
    try {
        const res = await apiFetch('/api/ctv-quotations/config/history');
        const container = document.getElementById('m_config_list_container');
        if (!container) return;
        
        if (res && res.history) {
            _mState.configVersions = res.history;
            if (res.history.length === 0) {
                container.innerHTML = `<div style="text-align:center; font-style:italic; font-size:12px;">Chưa có cấu hình nào</div>`;
                return;
            }
            
            container.innerHTML = res.history.map(c => {
                const isActive = c.status === 'active';
                const dateStr = vnFormat(c.created_at, 'DD/MM/YYYY');
                return `
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; margin-bottom:8px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <strong style="font-size:13px; color:#1e293b;">${c.version_name}</strong>
                            <span style="font-size:9.5px; font-weight:700; padding:2px 6px; border-radius:4px; ${isActive ? 'background:#dcfce7; color:#15803d;' : 'background:#e2e8f0; color:#475569;'}">
                                ${isActive ? 'ĐANG DÙNG' : 'NHÁP'}
                            </span>
                        </div>
                        <div style="font-size:11.5px; color:#64748b; margin-bottom:8px;">Ngày tạo: ${dateStr} | Người tạo: ${c.creator_name || 'Hệ thống'}</div>
                        
                        <div style="display:flex; gap:6px;">
                            <button class="m-btn-secondary" style="padding:4px; font-size:11px; flex:1;" onclick="_mShowConfigDetailPopup(${c.id})">Chi tiết</button>
                            ${!isActive ? `
                                <button class="m-btn" style="padding:4px; font-size:11px; flex:1; background:#22c55e;" onclick="_mApplyConfig(${c.id})">⚡ Áp dụng</button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch(e) {
        console.error(e);
    }
}

async function _mApplyConfig(id) {
    if (!confirm('Kích hoạt bảng giá này cho hệ thống di động & PC?')) return;
    try {
        const res = await apiFetch(`/api/ctv-quotations/config/${id}/apply`, { method: 'POST' });
        if (res && res.success) {
            showToast('Đã áp dụng bảng giá mới!', 'success');
            await _mLoadActiveConfig();
            initMobileBaogiactvhhPage();
        } else {
            showToast(res.error || 'Lỗi kích hoạt', 'error');
        }
    } catch(e) {
        showToast('Lỗi: ' + e.message, 'error');
    }
}

function _mShowConfigDetailPopup(id, mode = 'ctv') {
    const c = _mState.configVersions.find(v => v.id === id);
    if (!c) return;
    
    document.getElementById('m_config_modal_title').textContent = `📋 Bảng giá: ${c.version_name}`;
    
    const mats = c.materials || [];
    const sc = c.surcharges || {};
    const pr = c.print_prices || {};
    const commissionPercent = Number(pr.commission_percent !== undefined ? pr.commission_percent : 15);
    
    // Sort surcharge items by configured display order
    let surchargeItems = [];
    const defaults = {
        collar: { key: 'collar', name: 'Cổ bẻ', value: sc.collar || 0 },
        qty_under_20: { key: 'qty_under_20', name: 'Sản xuất dưới 20 áo', value: sc.qty_under_20 || 0 },
        primary_school: { key: 'primary_school', name: 'Chiết khấu tiểu học', value: sc.primary_school || 0 },
        raglan: { key: 'raglan', name: 'Tay Raglan', value: sc.raglan || 0 },
        color_block: { key: 'color_block', name: 'Phối màu vải', value: sc.color_block || 0 }
    };
    const customs = {};
    if (sc.custom && Array.isArray(sc.custom)) {
        sc.custom.forEach(item => {
            if (item && item.name) {
                const customKey = 'custom_' + item.name.replace(/\s+/g, '_');
                customs[customKey] = { key: customKey, name: item.name, value: item.value || 0 };
            }
        });
    }
    
    if (sc.display_order && Array.isArray(sc.display_order)) {
        sc.display_order.forEach(o => {
            if (!o) return;
            let found = null;
            const oKey = typeof o === 'string' ? o : o.key;
            const oName = typeof o === 'string' ? o : o.name;
            
            if (defaults[oKey]) {
                found = defaults[oKey];
                found.name = oName || found.name;
                delete defaults[oKey];
            } else if (customs[oKey]) {
                found = customs[oKey];
                found.name = oName || found.name;
                delete customs[oKey];
            } else {
                const dk = Object.keys(defaults).find(k => defaults[k].name === oName || defaults[k].key === oName);
                if (dk) {
                    found = defaults[dk];
                    found.name = oName || found.name;
                    delete defaults[dk];
                } else {
                    const ck = Object.keys(customs).find(k => customs[k].name === oName || customs[k].key === oName);
                    if (ck) {
                        found = customs[ck];
                        found.name = oName || found.name;
                        delete customs[ck];
                    }
                }
            }
            if (found) {
                surchargeItems.push(found);
            }
        });
    } else {
        surchargeItems = Object.values(defaults);
        Object.values(customs).forEach(c => surchargeItems.push(c));
    }
    
    document.getElementById('m_config_modal_body').innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 16px; font-family: 'Inter', sans-serif;">
            
            <!-- Brand watermark block -->
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: ${mode === 'customer' ? 'linear-gradient(135deg, #ea580c, #f97316)' : 'linear-gradient(135deg, #1e3b8a, #2563eb)'}; border-radius: 10px; color: white; margin-bottom: 4px; box-shadow: 0 3px 8px rgba(37,99,235,0.15);">
                <span style="font-weight: 900; font-size: 11px; letter-spacing: 0.5px;">⚡ ĐỒNG PHỤC HV</span>
                <span style="font-size: 9px; font-weight: 750; opacity: 0.95; letter-spacing: 0.5px; text-transform: uppercase;">
                    ${mode === 'customer' ? `BẢNG GIÁ KHÁCH HÀNG (ĐÃ CỘNG HỒI ${commissionPercent}%)` : 'HỆ THỐNG BIỂU PHÍ CTV & ĐẠI LÝ CHÍNH THỨC'}
                </span>
            </div>
            
            <!-- Toggle Mode Selector Group -->
            <div style="display:flex; background:#f1f5f9; padding:2px; border-radius:8px; gap:2px; border:1px solid #cbd5e1; margin-bottom: 4px;">
                <button onclick="_mShowConfigDetailPopup(${c.id}, 'ctv')" style="background: ${mode === 'ctv' ? '#2563eb' : 'transparent'}; color: ${mode === 'ctv' ? 'white' : '#475569'}; border: none; padding: 6px 0; border-radius: 6px; font-weight:750; font-size:11px; cursor:pointer; flex: 1; text-align: center; transition: all 0.2s;">👥 Biểu phí CTV</button>
                <button onclick="_mShowConfigDetailPopup(${c.id}, 'customer')" style="background: ${mode === 'customer' ? '#f97316' : 'transparent'}; color: ${mode === 'customer' ? 'white' : '#475569'}; border: none; padding: 6px 0; border-radius: 6px; font-weight:750; font-size:11px; cursor:pointer; flex: 1; text-align: center; transition: all 0.2s;">🛍️ Biểu phí Khách hàng</button>
            </div>
            
            <!-- Phôi Vải -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px;">
                <div style="font-weight: 800; color: #1e3a8a; font-size: 12.5px; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; margin-bottom: 8px;">
                    👕 ĐƠN GIÁ PHÔI TRƠN ${mode === 'customer' ? 'BÁN KHÁCH HÀNG' : ''}
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    ${mats.map(m => {
                        const displayPrice = mode === 'customer' ? Math.round(Number(m.price) * (1 + commissionPercent / 100)) : Number(m.price);
                        return `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: white; border-radius: 8px; border: 1px solid #f1f5f9;">
                                <span style="font-weight: 600; color: #334155; font-size: 12px;">${m.name}</span>
                                <span style="background: #eff6ff; color: #1d4ed8; padding: 2px 6px; border-radius: 6px; font-weight: 750; font-size: 11px;">
                                    ${displayPrice.toLocaleString('vi-VN')}đ
                                </span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <!-- Chi Tiết Thêm -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px;">
                <div style="font-weight: 800; color: #0d9488; font-size: 12.5px; border-bottom: 2px solid #0d9488; padding-bottom: 4px; margin-bottom: 8px;">
                    ➕ PHỤ PHÍ & CHI TIẾT THÊM
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    ${surchargeItems.map(item => {
                        const priceInfo = _mGetPriceInfo(item.value);
                        const isNegative = !priceInfo.isContact && priceInfo.value < 0;
                        return `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: white; border-radius: 8px; border: 1px solid #f1f5f9;">
                                <span style="font-weight: 600; color: #334155; font-size: 12px;">${item.name}</span>
                                <span style="background: ${isNegative ? '#fef2f2' : '#f0fdf4'}; color: ${isNegative ? '#b91c1c' : '#15803d'}; padding: 2px 6px; border-radius: 6px; font-weight: 750; font-size: 11px;">
                                    ${priceInfo.text}
                                </span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <!-- In/Thêu -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px;">
                <div style="font-weight: 800; color: #7c3aed; font-size: 12.5px; border-bottom: 2px solid #7c3aed; padding-bottom: 4px; margin-bottom: 8px;">
                    🎨 PHƯƠNG ÁN IN / THÊU ${mode === 'customer' ? 'KHÁCH HÀNG' : 'CTV'}
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px; color: #475569;">
                    <!-- PET -->
                    <div style="background: white; padding: 8px; border-radius: 8px; border: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 4px;">
                        <div style="font-weight: 750; color: #6b21a8; font-size: 11.5px; border-bottom: 1px dashed #e9d5ff; padding-bottom: 2px; margin-bottom: 2px;">🧬 In PET Khổ Mét</div>
                        <div style="display:flex; justify-content:space-between; align-items:center;"><span>Khổ mét (58x100cm):</span><strong>${Number(pr.pet?.sheet_price).toLocaleString('vi-VN')}đ</strong></div>
                        <div style="display:flex; justify-content:space-between; align-items:center;"><span>Khoảng cách an toàn:</span><strong>${pr.pet?.spacing} cm</strong></div>
                        <div style="display:flex; justify-content:space-between; align-items:center;"><span>In PET Ngực:</span><strong>+${Number(pr.pet?.chest_price || 5000).toLocaleString('vi-VN')}đ/áo</strong></div>
                        <div style="display:flex; justify-content:space-between; align-items:center;"><span>Tối thiểu/Vị trí khác:</span><strong>${Number(pr.pet?.min_position_price || 5000).toLocaleString('vi-VN')}đ</strong></div>
                    </div>
                    <!-- Embroidery & 3D -->
                    <div style="background: white; padding: 8px; border-radius: 8px; border: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 4px;">
                        <div style="font-weight: 750; color: #86198f; font-size: 11.5px; border-bottom: 1px dashed #f5d0fe; padding-bottom: 2px; margin-bottom: 2px;">⚡ Thêu & In 3D</div>
                        <div style="display:flex; justify-content:space-between; align-items:center;"><span>Thêu vi tính đồng giá:</span><strong>
                            ${(() => {
                                const val = pr.embroidery?.flat_price;
                                const isNum = !isNaN(parseFloat(val)) && isFinite(val);
                                return isNum ? Number(val).toLocaleString('vi-VN') + 'đ/áo' : (val || 'Liên hệ');
                            })()}
                        </strong></div>
                        <div style="display:flex; justify-content:space-between; align-items:center;"><span>In 3D toàn thân:</span><strong>${Number(pr.print3d?.flat_price || 30000).toLocaleString('vi-VN')}đ/áo</strong></div>
                    </div>
                    <!-- Screen -->
                    <div style="background: white; padding: 8px; border-radius: 8px; border: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 4px;">
                        <div style="font-weight: 750; color: #334155; font-size: 11.5px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 2px; margin-bottom: 2px;">🖌️ In Lưới (Screen Printing)</div>
                        <div style="display:flex; justify-content:space-between; align-items:center;"><span>Đơn tối thiểu:</span><strong>${pr.screen?.qty_threshold} áo</strong></div>
                        <div style="display:flex; justify-content:space-between; align-items:center;"><span>Đơn hàng &lt; ${pr.screen?.qty_threshold} áo:</span><strong>${Number(pr.screen?.price_low).toLocaleString('vi-VN')}đ/màu</strong></div>
                        <div style="display:flex; justify-content:space-between; align-items:center;"><span>Đơn >= ${pr.screen?.qty_threshold} áo (1-3 màu):</span><strong>${Number(pr.screen?.price_high_1_3).toLocaleString('vi-VN')}đ/màu/áo</strong></div>
                        <div style="display:flex; justify-content:space-between; align-items:center;"><span>Đơn >= ${pr.screen?.qty_threshold} áo (4+ màu):</span><strong>${Number(pr.screen?.price_high_4_plus).toLocaleString('vi-VN')}đ/màu/áo</strong></div>
                    </div>
                </div>
            </div>
            
        </div>
    `;
    
    document.getElementById('m_config_modal').style.display = 'flex';
}

// ==========================================
// VIETNAMESE MONEY TRANSLATOR
// ==========================================

function docSoTienVietNam(number) {
    if (number === 0) return 'Không đồng';
    const units = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ'];
    const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    
    function docGroup3(n, showZeroHundred) {
        let hundred = Math.floor(n / 100);
        let remain = n % 100;
        let ten = Math.floor(remain / 10);
        let unit = remain % 10;
        let result = '';
        
        if (hundred > 0 || showZeroHundred) {
            result += digits[hundred] + ' trăm ';
        }
        
        if (ten > 0) {
            if (ten === 1) result += 'mười ';
            else result += digits[ten] + ' mươi ';
        } else if (hundred > 0 && unit > 0) {
            result += 'lẻ ';
        }
        
        if (unit > 0) {
            if (unit === 1 && ten > 1) result += 'mốt';
            else if (unit === 5 && ten > 0) result += 'lăm';
            else result += digits[unit];
        }
        return result.trim();
    }
    
    let strNum = String(Math.floor(number));
    let groups = [];
    while (strNum.length > 0) {
        groups.push(strNum.substring(Math.max(0, strNum.length - 3)));
        strNum = strNum.substring(0, Math.max(0, strNum.length - 3));
    }
    
    let result = '';
    let hasValueBefore = false;
    for (let i = groups.length - 1; i >= 0; i--) {
        let val = Number(groups[i]);
        if (val > 0) {
            let showZeroHundred = hasValueBefore;
            let groupStr = docGroup3(val, showZeroHundred);
            result += ' ' + groupStr + units[i];
            hasValueBefore = true;
        }
    }
    
    result = result.trim() + ' đồng';
    return result.charAt(0).toUpperCase() + result.slice(1);
}

// Auto-boot trigger
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileBaogiactvhhPage);
} else {
    initMobileBaogiactvhhPage();
}
