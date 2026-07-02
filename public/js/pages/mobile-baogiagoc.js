// public/js/pages/mobile-baogiagoc.js

var _mobileBgg = {
    materials: [],
    colors: [],
    sizeSegments: [],
    petEnabled: false,
    petSheetPrice: 40000,
    petSpacing: 0.4,
    petCalcMode: 'aligned',
    petShapes: [],
    lastCalcResponse: null,
    selectedCalcSupplierId: 'all',
    print3dEnabled: false,
    print3dSupplier: '',
    print3dCost: 0,
    screenEnabled: false,
    screenSupplier: '',
    screenColors: ''
};

var _M_BGG_3D_SUPPLIERS = [
    { key: 'thien_linh', name: 'In 3D Thiện Linh', icon: '🏭' },
    { key: 'phuong_tc', name: 'In 3D Phượng TC', icon: '🏭' },
    { key: 'chi_hang', name: 'In 3D Chi Hằng', icon: '🏭' }
];

var _M_BGG_SCREEN_SUPPLIERS = [
    { key: 'thien_linh_screen', name: 'In Lưới Thiện Linh', icon: '🎨' },
    { key: 'phuong_tc_screen', name: 'In Lưới Phượng TC', icon: '🎨' },
    { key: 'truong_thinh_screen', name: 'In Lưới Trường Thịnh', icon: '🎨' }
];

async function initMobileBaogiagocPage() {
    const m_enable_pet = document.getElementById('m_enable_pet');
    if (!m_enable_pet) return;

    let user = null;
    try {
        const auth = await apiCall('/api/auth/me');
        if (auth && auth.user) {
            user = auth.user;
            window.currentUser = user;
            window._currentUser = user;
        }
    } catch(e) {
        console.error('Failed to fetch user:', e);
    }
    const isDirector = user && user.role === 'giam_doc';

    loadPetConfigsMobile();
    
    // Populate checkboxes
    m_enable_pet.checked = _mobileBgg.petEnabled;
    const setupBtn = document.getElementById('m_btn_setup');
    if (setupBtn && isDirector) {
        setupBtn.style.display = 'block';
    }
    const priceInput = document.getElementById('m_pet_sheet_price');
    if (priceInput) {
        priceInput.value = _mobileBgg.petSheetPrice;
        if (!isDirector) priceInput.disabled = true;
    }
    const spacingInput = document.getElementById('m_pet_spacing');
    if (spacingInput) {
        spacingInput.value = _mobileBgg.petSpacing;
        if (!isDirector) spacingInput.disabled = true;
    }
    togglePetSectionMobile(_mobileBgg.petEnabled);
    const m3dCb = document.getElementById('m_enable_3d');
    if (m3dCb) m3dCb.checked = _mobileBgg.print3dEnabled;
    toggle3dSectionMobile(_mobileBgg.print3dEnabled);
    const mScreenCb = document.getElementById('m_enable_screen');
    if (mScreenCb) mScreenCb.checked = _mobileBgg.screenEnabled;
    toggleScreenSectionMobile(_mobileBgg.screenEnabled);
    _mRenderPresetsOnForm();

    await loadInitialDataMobile();

    // Parse URL parameters for pre-selected material
    const urlParams = new URLSearchParams(window.location.search);
    const matParam = urlParams.get('material');
    if (matParam) {
        const matObj = _mobileBgg.materials.find(m => String(m.id) === String(matParam));
        if (matObj) {
            const idInput = document.getElementById('m_material_id');
            const searchInput = document.getElementById('m_material_search');
            if (idInput) idInput.value = matObj.id;
            if (searchInput) searchInput.value = matObj.name;
            handleMaterialChangeMobile(matObj.id);
        }
    }
}

async function apiCall(url, method = 'GET', body = null) {
    const options = {
        method,
        headers: {},
        credentials: 'include'
    };
    if (body) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }
    const res = await fetch(url, options);
    if (res.status === 401 || res.status === 403) {
        window.location.href = '/login';
        throw new Error('Chưa đăng nhập');
    }
    return res.json();
}

function toast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.style.cssText = `
        background: ${type === 'error' ? '#ef4444' : '#10b981'};
        color: white;
        padding: 10px 16px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 12.5px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        margin-bottom: 8px;
        text-align: center;
        transition: opacity 0.25s;
        opacity: 0;
    `;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.style.opacity = '1', 50);
    setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 250);
    }, 3000);
}

async function loadInitialDataMobile() {
    try {
        const [ratioRes, segRes] = await Promise.all([
            apiCall('/api/cutting/ratio-stats', 'GET'),
            apiCall('/api/cutting/size-segments', 'GET')
        ]);
        
        const ratioData = ratioRes.data || ratioRes;
        const segData = segRes.data || segRes;
        _mobileBgg.materials = ratioData.materials || [];
        _mobileBgg.colors = ratioData.colors || [];
        _mobileBgg.sizeSegments = segData.segments || segData.sizeSegments || segRes.segments || [];
        
        // Clear autocomplete input on reload
        const matSearchInput = document.getElementById('m_material_search');
        const matHiddenInput = document.getElementById('m_material_id');
        if (matSearchInput) matSearchInput.value = '';
        if (matHiddenInput) matHiddenInput.value = '';
        const colSearchInput = document.getElementById('m_color_search');
        const colHiddenInput = document.getElementById('m_color_id');
        if (colSearchInput) colSearchInput.value = '';
        if (colHiddenInput) colHiddenInput.value = '';
        
        // Populate segments
        const segSelect = document.getElementById('m_segment');
        if (segSelect) {
            segSelect.innerHTML = '<option value="">-- Tất cả phân khúc --</option>' +
                (_mobileBgg.sizeSegments || []).map(s => `<option value="${s.name}">${s.icon || '🧑'} ${s.name}</option>`).join('');
        }
        
    } catch(err) {
        console.error('Failed to load data:', err);
        toast('Không thể kết nối máy chủ!', 'error');
    }
}

function loadPetConfigsMobile() {
    _mobileBgg.petEnabled = false; // Always disabled on page load/F5
    _mobileBgg.petSheetPrice = Number(localStorage.getItem('tlcg_pet_sheet_price')) || 40000;
    const storedSpacing = localStorage.getItem('tlcg_pet_spacing');
    if (storedSpacing === null || storedSpacing === '0.3' || storedSpacing === '3' || storedSpacing === '03') {
        _mobileBgg.petSpacing = 0.4;
        localStorage.setItem('tlcg_pet_spacing', '0.4');
    } else {
        _mobileBgg.petSpacing = Number(storedSpacing);
    }
    _mobileBgg.petCalcMode = localStorage.getItem('tlcg_pet_calc_mode') || 'aligned';
    _mobileBgg.petShapes = []; // Always empty on page load/F5

    // Load sewing presets
    const sewingCached = localStorage.getItem('bgg_sewing_presets');
    if (sewingCached) {
        try {
            _mobileBgg.sewingPresets = JSON.parse(sewingCached);
        } catch(e) {
            console.error(e);
        }
    }
    if (!_mobileBgg.sewingPresets || _mobileBgg.sewingPresets.length === 0) {
        _mobileBgg.sewingPresets = [
            { id: 'co_tron', name: 'Cổ tròn', icon: '👕', price: 9000 },
            { id: 'co_be', name: 'Cổ bẻ', icon: '👔', price: 13000 }
        ];
        localStorage.setItem('bgg_sewing_presets', JSON.stringify(_mobileBgg.sewingPresets));
    }

    // Load collar presets
    const collarCached = localStorage.getItem('bgg_collar_presets');
    if (collarCached) {
        try {
            _mobileBgg.collarPresets = JSON.parse(collarCached);
        } catch(e) {
            console.error(e);
        }
    }
    if (!_mobileBgg.collarPresets || _mobileBgg.collarPresets.length === 0) {
        _mobileBgg.collarPresets = [
            { id: 'co_be_extra', name: 'Gợi ý', icon: '👔', price: 6000 }
        ];
        localStorage.setItem('bgg_collar_presets', JSON.stringify(_mobileBgg.collarPresets));
    }

    // Load 3D printing configs (always disabled on page load/F5)
    _mobileBgg.print3dEnabled = false;
    _mobileBgg.print3dSupplier = localStorage.getItem('bgg_3d_supplier') || '';

    // Load screen printing configs (always disabled on page load/F5)
    _mobileBgg.screenEnabled = false;
    _mobileBgg.screenColors = '';
    _mobileBgg.screenSupplier = localStorage.getItem('bgg_screen_supplier') || '';
}

function savePetConfigsMobile() {
    localStorage.removeItem('tlcg_pet_enabled');
    localStorage.removeItem('tlcg_pet_shapes');
    
    const priceInput = document.getElementById('m_pet_sheet_price');
    if (priceInput) {
        localStorage.setItem('tlcg_pet_sheet_price', priceInput.value);
    }
    const spacingInput = document.getElementById('m_pet_spacing');
    if (spacingInput) {
        localStorage.setItem('tlcg_pet_spacing', spacingInput.value);
    }
}

function save3dConfigsMobile() {
    localStorage.removeItem('bgg_3d_enabled');
    localStorage.setItem('bgg_3d_supplier', _mobileBgg.print3dSupplier || '');
}

function _mGet3dConfig(supplierKey) {
    if (!supplierKey) return null;
    const stored = localStorage.getItem('bgg_3d_config_' + supplierKey);
    if (stored) { try { return JSON.parse(stored); } catch(e) {} }
    if (supplierKey === 'thien_linh') {
        const def = { meters_per_shirt: 0.8, print_tiers: [{min:3000,max:null,price:11000},{min:1000,max:3000,price:12000},{min:500,max:1000,price:13000},{min:200,max:500,price:14000},{min:100,max:200,price:16000},{min:50,max:100,price:18000},{min:30,max:50,price:22000},{min:10,max:30,price:25000},{min:0,max:10,price:35000}], laser_tiers: [{min:500,max:null,price:3500},{min:0,max:500,price:4000}] };
        localStorage.setItem('bgg_3d_config_thien_linh', JSON.stringify(def));
        return def;
    }
    return { meters_per_shirt: 0.8, print_tiers: [], laser_tiers: [] };
}

function _mCalc3dCost(qty) {
    if (!_mobileBgg.print3dEnabled || !_mobileBgg.print3dSupplier) return { total:0, printCost:0, laserCost:0, metersPerShirt:0, totalMeters:0, printPricePerMeter:0, laserPricePerShirt:0 };
    const config = _mGet3dConfig(_mobileBgg.print3dSupplier);
    if (!config || !config.print_tiers || config.print_tiers.length === 0) return { total:0, printCost:0, laserCost:0, metersPerShirt:0, totalMeters:0, printPricePerMeter:0, laserPricePerShirt:0 };
    const mps = config.meters_per_shirt || 0.8;
    if (!qty || qty <= 0) return { total:0, printCost:0, laserCost:0, metersPerShirt:mps, totalMeters:0, printPricePerMeter:0, laserPricePerShirt:0, needQty:true };
    const totalMeters = qty * mps;
    let printPrice = 0;
    for (const t of config.print_tiers) { const mn=Number(t.min)||0, mx=t.max!==null&&t.max!==''?Number(t.max):Infinity; if(totalMeters>=mn&&totalMeters<mx){printPrice=Number(t.price)||0;break;} }
    if (!printPrice) { for (const t of config.print_tiers) { const mn=Number(t.min)||0, mx=t.max!==null&&t.max!==''?Number(t.max):Infinity; if(totalMeters>=mn&&totalMeters<=mx){printPrice=Number(t.price)||0;break;} } }
    const printCostPS = Math.round(printPrice * mps);
    let laserPrice = 0;
    if (config.laser_tiers && config.laser_tiers.length > 0) {
        for (const t of config.laser_tiers) { const mn=Number(t.min)||0, mx=t.max!==null&&t.max!==''?Number(t.max):Infinity; if(qty>=mn&&qty<mx){laserPrice=Number(t.price)||0;break;} }
        if (!laserPrice) { for (const t of config.laser_tiers) { const mn=Number(t.min)||0, mx=t.max!==null&&t.max!==''?Number(t.max):Infinity; if(qty>=mn&&qty<=mx){laserPrice=Number(t.price)||0;break;} } }
    }
    return { total:printCostPS+laserPrice, printCost:printCostPS, laserCost:laserPrice, metersPerShirt:mps, totalMeters, printPricePerMeter:printPrice, laserPricePerShirt:laserPrice };
}

function getScreenConfigMobile(supplierKey) {
    if (!supplierKey) return null;
    const stored = localStorage.getItem('bgg_screen_config_' + supplierKey);
    if (stored) {
        try { return JSON.parse(stored); } catch(e) { /* ignore */ }
    }
    const def = {
        qty_threshold: 20,
        price_low: 50000,
        price_high_1_3: 3000,
        price_high_4_plus: 2500
    };
    localStorage.setItem('bgg_screen_config_' + supplierKey, JSON.stringify(def));
    return def;
}

function saveScreenConfigsMobile() {
    localStorage.removeItem('bgg_screen_enabled'); // Don't persist enabled state
    localStorage.setItem('bgg_screen_supplier', _mobileBgg.screenSupplier || '');
    const colorsInput = document.getElementById('m_screen_colors');
    if (colorsInput) {
        _mobileBgg.screenColors = colorsInput.value;
    }
}

function calcScreenCostMobile(qty) {
    if (!_mobileBgg.screenEnabled || !_mobileBgg.screenSupplier) return 0;
    const colors = Number(_mobileBgg.screenColors) || 0;
    if (colors <= 0) return 0;
    const config = getScreenConfigMobile(_mobileBgg.screenSupplier);
    if (!config) return 0;

    const threshold = Number(config.qty_threshold) || 20;
    const priceLow = Number(config.price_low) || 50000;
    const priceHigh13 = Number(config.price_high_1_3) || 3000;
    const priceHigh4Plus = Number(config.price_high_4_plus) || 2500;

    if (!qty || qty <= 0) return 0;

    if (qty < threshold) {
        const totalOrderCost = priceLow * colors;
        return totalOrderCost / qty;
    } else {
        if (colors <= 3) {
            return priceHigh13 * colors;
        } else {
            return priceHigh4Plus * colors;
        }
    }
}

function toggleScreenSectionMobile(enabled) {
    _mobileBgg.screenEnabled = enabled;
    const infoDiv = document.getElementById('m_screen_info');
    const setupBtn = document.getElementById('m_setup_screen_btn');
    if (infoDiv) infoDiv.style.display = enabled ? 'block' : 'none';
    
    const isDirector = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';
    if (setupBtn) setupBtn.style.display = (enabled && isDirector) ? 'inline-block' : 'none';
    
    saveScreenConfigsMobile();
    renderScreenSupplierDisplayMobile();
    renderMobileCalcResults();
}

function renderScreenSupplierDisplayMobile() {
    const el = document.getElementById('m_screen_supplier_display');
    if (!el) return;
    const supplier = _M_BGG_SCREEN_SUPPLIERS.find(s => s.key === _mobileBgg.screenSupplier);
    if (!supplier) {
        el.innerHTML = '<div style="font-size: 11px; color: #94a3b8; cursor: pointer;" onclick="openScreenPickerMobile()">⚠️ Chưa chọn NCC in lưới — <strong style="color:#db2777;">bấm để chọn</strong></div>';
        return;
    }
    const nccBadge = `<span onclick="openScreenPickerMobile()" style="background:#fce7f3;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:800;color:#9d174d;cursor:pointer;border:1px solid #fbcfe8;">${supplier.icon} ${supplier.name} ▾</span>`;
    
    const qty = Number(document.getElementById('m_quantity')?.value) || 0;
    const colors = Number(document.getElementById('m_screen_colors')?.value) || 0;
    
    if (qty <= 0) {
        el.innerHTML = `
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;"><span style="font-size:11px;font-weight:700;color:#9d174d;">NCC:</span>${nccBadge}</div>
            <div style="font-size:10px;color:#f59e0b;margin-top:4px;font-weight:600;">⚠️ Nhập số lượng áo để tính chi phí in Lưới</div>
        `;
    } else if (colors <= 0) {
        el.innerHTML = `
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;"><span style="font-size:11px;font-weight:700;color:#9d174d;">NCC:</span>${nccBadge}</div>
            <div style="font-size:10px;color:#f59e0b;margin-top:4px;font-weight:600;">⚠️ Nhập số màu in để tính chi phí in Lưới</div>
        `;
    } else {
        const cost = calcScreenCostMobile(qty);
        el.innerHTML = `
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;"><span style="font-size:11px;font-weight:700;color:#9d174d;">NCC:</span>${nccBadge}</div>
            <div style="font-size:10px;color:#9d174d;margin-top:4px;font-weight:600;">
                In Lưới: <strong>${Math.round(cost).toLocaleString('vi-VN')}đ / áo</strong> 
                ${qty < 20 ? `(Tổng: ${Number(cost * qty).toLocaleString('vi-VN')}đ)` : ''}
            </div>
        `;
    }
}

function toggle3dSectionMobile(enabled) {
    _mobileBgg.print3dEnabled = enabled;
    const infoDiv = document.getElementById('m_3d_info');
    const setupBtn = document.getElementById('m_setup_3d_btn');
    if (infoDiv) infoDiv.style.display = enabled ? 'block' : 'none';
    if (setupBtn) setupBtn.style.display = enabled ? 'inline-block' : 'none';
    save3dConfigsMobile();
    render3dSupplierDisplayMobile();
    renderMobileCalcResults();
}

function render3dSupplierDisplayMobile() {
    const el = document.getElementById('m_3d_supplier_display');
    if (!el) return;
    const supplier = _M_BGG_3D_SUPPLIERS.find(s => s.key === _mobileBgg.print3dSupplier);
    if (!supplier) {
        el.innerHTML = '<div style="font-size: 11px; color: #94a3b8; cursor: pointer;" onclick="open3dPickerMobile()">⚠️ Chưa chọn NCC — <strong style="color:#3b82f6;">bấm để chọn</strong></div>';
        return;
    }
    const nccBadge = `<span onclick="open3dPickerMobile()" style="background:#dbeafe;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:800;color:#1e40af;cursor:pointer;border:1px solid #93c5fd;">${supplier.icon} ${supplier.name} ▾</span>`;
    const qty = Number(document.getElementById('m_quantity')?.value) || 0;
    const calc = _mCalc3dCost(qty);
    if (calc.needQty) {
        el.innerHTML = `
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;"><span style="font-size:11px;font-weight:700;color:#1e40af;">NCC:</span>${nccBadge}</div>
            <div style="font-size:10px;color:#f59e0b;margin-top:4px;font-weight:600;">⚠️ Nhập số lượng áo để tính chi phí 3D</div>
        `;
    } else if (calc.total > 0) {
        el.innerHTML = `
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;"><span style="font-size:11px;font-weight:700;color:#1e40af;">NCC:</span>${nccBadge}</div>
            <div style="font-size:10px;color:#1e40af;margin-top:4px;font-weight:600;">In: ${Number(calc.printCost).toLocaleString('vi-VN')}đ${calc.laserCost>0?' + Cắt: '+Number(calc.laserCost).toLocaleString('vi-VN')+'đ':''} = <strong>${Number(calc.total).toLocaleString('vi-VN')}đ/áo</strong></div>
            <div style="font-size:9px;color:#64748b;margin-top:1px;">${qty}áo × ${calc.metersPerShirt}m = ${calc.totalMeters.toFixed(1)}m → ${Number(calc.printPricePerMeter).toLocaleString('vi-VN')}đ/m</div>
        `;
    } else {
        el.innerHTML = `
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;"><span style="font-size:11px;font-weight:700;color:#1e40af;">NCC:</span>${nccBadge}</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:4px;font-style:italic;">Chưa có bảng giá — bấm Setup</div>
        `;
    }
}

function open3dPickerMobile() {
    const existing = document.getElementById('m_3d_picker_modal');
    if (existing) existing.remove();

    const currentSupplier = _mobileBgg.print3dSupplier || '';

    const modal = document.createElement('div');
    modal.id = 'm_3d_picker_modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 11000; padding: 16px;';
    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; width: 100%; max-width: 320px; box-shadow: 0 20px 25px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; overflow: hidden;">
            <div style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
                <h3 style="margin: 0; font-size: 13px; font-weight: 800; color: #0f172a;">🏭 Chọn Nhà In 3D</h3>
                <button onclick="close3dPickerMobile()" style="background: none; border: none; font-size: 18px; color: #64748b; cursor: pointer;">&times;</button>
            </div>
            <div style="padding: 16px; display: flex; flex-direction: column; gap: 8px;">
                ${_M_BGG_3D_SUPPLIERS.map(s => `
                    <div onclick="select3dSupplierFromPickerMobile('${s.key}')" style="display: flex; align-items: center; gap: 10px; padding: 12px; border: 2px solid ${currentSupplier === s.key ? '#3b82f6' : '#e2e8f0'}; border-radius: 10px; cursor: pointer; background: ${currentSupplier === s.key ? '#eff6ff' : 'white'};">
                        <div style="width: 16px; height: 16px; border-radius: 50%; border: 2px solid ${currentSupplier === s.key ? '#3b82f6' : '#cbd5e1'}; display: flex; align-items: center; justify-content: center;">
                            ${currentSupplier === s.key ? '<div style="width: 8px; height: 8px; border-radius: 50%; background: #3b82f6;"></div>' : ''}
                        </div>
                        <div style="font-size: 13px; font-weight: 700; color: #1e293b;">${s.icon} ${s.name}</div>
                    </div>
                `).join('')}
            </div>
            <div style="padding: 10px 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; background: #f8fafc;">
                <button onclick="close3dPickerMobile()" style="padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; font-weight: 600; color: #475569; background: white;">Đóng</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function close3dPickerMobile() {
    const modal = document.getElementById('m_3d_picker_modal');
    if (modal) modal.remove();
}

function select3dSupplierFromPickerMobile(key) {
    _mobileBgg.print3dSupplier = key;
    save3dConfigsMobile();
    render3dSupplierDisplayMobile();
    renderMobileCalcResults();
    close3dPickerMobile();
    toast(`Đã chọn bên in: ${key === 'thien_linh' ? 'Thiện Linh' : key === 'phuong_tc' ? 'Phượng TC' : 'Chi Hằng'}`, 'success');
}

function openSetup3dMobile() {
    const existing = document.getElementById('m_setup_3d_modal');
    if (existing) existing.remove();
    const currentSupplier = _mobileBgg.print3dSupplier || '';
    const modal = document.createElement('div');
    modal.id = 'm_setup_3d_modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 11000; padding: 16px;';
    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; width: 100%; max-width: 400px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
            <div style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
                <h3 style="margin: 0; font-size: 14px; font-weight: 800; color: #0f172a;">🎨 Setup In 3D</h3>
                <button onclick="closeSetup3dMobile()" style="background: none; border: none; font-size: 20px; color: #64748b; cursor: pointer;">&times;</button>
            </div>
            <div style="padding: 16px;">
                <h4 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Chọn nhà cung cấp:</h4>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${_M_BGG_3D_SUPPLIERS.map(s => `
                        <div onclick="select3dSupplierMobile('${s.key}')" style="display: flex; align-items: center; gap: 10px; padding: 12px; border: 2px solid ${currentSupplier === s.key ? '#3b82f6' : '#e2e8f0'}; border-radius: 10px; cursor: pointer; background: ${currentSupplier === s.key ? '#eff6ff' : 'white'};">
                            <div style="width: 18px; height: 18px; border-radius: 50%; border: 2px solid ${currentSupplier === s.key ? '#3b82f6' : '#cbd5e1'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                ${currentSupplier === s.key ? '<div style="width: 9px; height: 9px; border-radius: 50%; background: #3b82f6;"></div>' : ''}
                            </div>
                            <div>
                                <div style="font-size: 13px; font-weight: 700; color: #1e293b;">${s.icon} ${s.name}</div>
                                <div style="font-size: 10px; color: #94a3b8; margin-top: 1px;">Bảng giá sẽ cập nhật sau</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div style="margin-top: 14px; padding: 14px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; text-align: center;">
                    <span style="font-size: 20px; display: block; margin-bottom: 4px;">📋</span>
                    <div style="font-size: 11px; font-weight: 600; color: #64748b;">Bảng giá chi tiết sẽ hiển thị ở đây</div>
                </div>
            </div>
            <div style="padding: 12px 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; background: #f8fafc; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;">
                <button onclick="closeSetup3dMobile()" style="padding: 8px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 12px; font-weight: 600; color: #475569; background: white; cursor: pointer;">Đóng</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeSetup3dMobile() {
    const modal = document.getElementById('m_setup_3d_modal');
    if (modal) modal.remove();
}

function select3dSupplierMobile(key) {
    _mobileBgg.print3dSupplier = key;
    save3dConfigsMobile();
    render3dSupplierDisplayMobile();
    renderMobileCalcResults();
    closeSetup3dMobile();
    openSetup3dMobile();
}

function togglePetSectionMobile(enabled) {
    const globalDiv = document.getElementById('m_pet_global_settings');
    const containerDiv = document.getElementById('m_pet_shapes_container');
    if (globalDiv && containerDiv) {
        globalDiv.style.display = enabled ? 'flex' : 'none';
        containerDiv.style.display = enabled ? 'block' : 'none';
    }
    savePetConfigsMobile();
    renderPetShapeRowsMobile();
    renderMobileCalcResults();
}

function renderPetShapeRowsMobile() {
    const list = document.getElementById('m_pet_shapes_rows');
    if (!list) return;
    
    if (!Array.isArray(_mobileBgg.petShapes)) {
        _mobileBgg.petShapes = [];
    }
    const shapes = _mobileBgg.petShapes.filter(s => s && typeof s === 'object');
    if (shapes.length === 0) {
        list.innerHTML = '';
        return;
    }
    
    list.innerHTML = shapes.map((s, idx) => `
        <div class="pet-shape-row-mobile" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;" data-idx="${idx}">
            <div style="display: flex; align-items: center; gap: 2px;">
                <input type="text" class="m-input p-width" placeholder="Rộng" style="width: 50px; padding: 5px 6px; font-size: 11.5px; text-align: center;" value="${s.width || ''}" oninput="this.value = this.value.replace(/,/g, '.').replace(/[^0-9.]/g, '')" onchange="updatePetShapeMobile(${idx}, 'width', this.value)">
                <span style="font-size: 11px; color: #64748b;">x</span>
                <input type="text" class="m-input p-height" placeholder="Cao" style="width: 50px; padding: 5px 6px; font-size: 11.5px; text-align: center;" value="${s.height || ''}" oninput="this.value = this.value.replace(/,/g, '.').replace(/[^0-9.]/g, '')" onchange="updatePetShapeMobile(${idx}, 'height', this.value)">
                <span style="font-size: 11px; color: #166534; font-weight: 700;">cm</span>
            </div>
            <button style="background: #fee2e2; color: #ef4444; border: none; padding: 6px 10px; border-radius: 6px; font-size: 11.5px; font-weight: 700; cursor: pointer;" onclick="removePetShapeRowMobile(${idx})">Xóa</button>
        </div>
    `).join('');
}

function addPetShapeRowMobile() {
    if (!Array.isArray(_mobileBgg.petShapes)) {
        _mobileBgg.petShapes = [];
    }
    _mobileBgg.petShapes.push({ name: '', width: '', height: '' });
    renderPetShapeRowsMobile();
    savePetConfigsMobile();
    renderMobileCalcResults();
}

function removePetShapeRowMobile(idx) {
    if (Array.isArray(_mobileBgg.petShapes)) {
        _mobileBgg.petShapes.splice(idx, 1);
        renderPetShapeRowsMobile();
        savePetConfigsMobile();
        renderMobileCalcResults();
    }
}

function updatePetShapeMobile(idx, field, val) {
    if (Array.isArray(_mobileBgg.petShapes) && _mobileBgg.petShapes[idx]) {
        if (field === 'width' || field === 'height') {
            const cleanVal = String(val).replace(/,/g, '.');
            _mobileBgg.petShapes[idx][field] = cleanVal !== '' ? Number(cleanVal) : '';
        } else {
            _mobileBgg.petShapes[idx][field] = val;
        }
        savePetConfigsMobile();
        renderMobileCalcResults();
    }
}

function updatePetModeMobile(val) {
    localStorage.setItem('tlcg_pet_calc_mode', val);
    renderMobileCalcResults();
}

function calculatePackingMobile(W_sheet, H_sheet, w, h, s) {
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

function getPetCostsMobile() {
    const enabled = document.getElementById('m_enable_pet')?.checked;
    if (!enabled) return { enabled: false, alignedCost: 0, optimizedCost: 0, details: [] };
    
    const shapes = _mobileBgg.petShapes || [];
    const validShapes = shapes.filter(s => Number(s.width) > 0 && Number(s.height) > 0);
    if (validShapes.length === 0) {
        return { enabled: false, alignedCost: 0, optimizedCost: 0, details: [] };
    }
    
    const price = Number(document.getElementById('m_pet_sheet_price')?.value) || 0;
    const spacing = Number(document.getElementById('m_pet_spacing')?.value) || 0;
    
    let alignedCost = 0;
    let optimizedCost = 0;
    const details = [];
    
    shapes.forEach(s => {
        const w = Number(s.width);
        const h = Number(s.height);
        if (w > 0 && h > 0) {
            const packing = calculatePackingMobile(58, 100, w, h, spacing);
            const aCost = packing.aligned > 0 ? (price / packing.aligned) : 0;
            const oCost = packing.optimized > 0 ? (price / packing.optimized) : 0;
            alignedCost += aCost;
            optimizedCost += oCost;
            details.push({
                name: s.name || 'Hình in',
                width: w,
                height: h,
                packing,
                aCost,
                oCost
            });
        }
    });
    
    return {
        enabled: true,
        alignedCost: Math.round(alignedCost),
        optimizedCost: Math.round(optimizedCost),
        details
    };
}

function handleMaterialChangeMobile(matId) {
    const segmentSelect = document.getElementById('m_segment');
    if (!segmentSelect) return;
    
    // Clear color selection
    const colorSearch = document.getElementById('m_color_search');
    const colorIdInput = document.getElementById('m_color_id');
    if (colorSearch) colorSearch.value = '';
    if (colorIdInput) colorIdInput.value = '';
    
    if (!matId) {
        segmentSelect.innerHTML = `
            <option value="">-- Tất cả phân khúc --</option>
            ${(_mobileBgg.sizeSegments || []).map(s => `<option value="${s.name}">${s.icon || '🧑'} ${s.name}</option>`).join('')}
        `;
        return;
    }

    const mat = _mobileBgg.materials.find(m => m.id === Number(matId));
    const activeSegs = getActiveSegmentsMobile(mat);
    segmentSelect.innerHTML = `
        <option value="">-- Tất cả phân khúc --</option>
        ${activeSegs.map(seg => {
            const segObj = (_mobileBgg.sizeSegments || []).find(s => s.name === seg);
            const icon = segObj && segObj.icon ? segObj.icon : '🧑';
            return `<option value="${seg}">${icon} ${seg}</option>`;
        }).join('')}
    `;
}

function getActiveSegmentsMobile(mat) {
    if (mat && mat.active_segments) {
        try {
            const parsed = JSON.parse(mat.active_segments);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const globalNames = (_mobileBgg.sizeSegments || []).map(s => s.name);
                return parsed.filter(name => globalNames.includes(name));
            }
        } catch(e) {
            console.error(e);
        }
    }
    const defaultBase = ['Người Lớn', 'Tiểu Học', 'Mầm Non', 'Oversize'];
    const globalNames = (_mobileBgg.sizeSegments || []).map(s => s.name);
    return defaultBase.filter(name => globalNames.includes(name));
}

async function runMobileCalculation() {
    const matId = document.getElementById('m_material_id').value;
    const colorId = document.getElementById('m_color_id').value;
    const segment = document.getElementById('m_segment').value;
    const qty = document.getElementById('m_quantity').value;

    if (!matId) {
        toast('Vui lòng chọn Chất liệu!', 'error');
        return;
    }

    const petEnabled = document.getElementById('m_enable_pet')?.checked;
    if (petEnabled) {
        const shapes = _mobileBgg.petShapes || [];
        if (shapes.length === 0) {
            toast('Vui lòng thêm ít nhất một hình in PET!', 'error');
            return;
        }
        let hasInvalidShape = false;
        for (const s of shapes) {
            const w = Number(s.width);
            const h = Number(s.height);
            if (isNaN(w) || w <= 0 || isNaN(h) || h <= 0) {
                hasInvalidShape = true;
                break;
            }
        }
        if (hasInvalidShape) {
            toast('Điền đầy đủ kích thước (> 0) cho hình in PET!', 'error');
            return;
        }
    }

    // 3D validation: require quantity & white color when 3D is enabled
    const print3dOn = document.getElementById('m_enable_3d')?.checked;
    if (print3dOn) {
        const q3d = Number(document.getElementById('m_quantity').value) || 0;
        if (q3d <= 0) {
            toast('Bật In 3D → vui lòng nhập Số lượng áo!', 'error');
            document.getElementById('m_quantity').focus();
            return;
        }
        
        const colSearch = document.getElementById('m_color_search')?.value || '';
        if (!colSearch.trim().toLowerCase().includes('trắng')) {
            toast('In 3D chỉ hỗ trợ trên vải màu trắng (Trắng, Trắng gạo, ...)! Vui lòng chọn màu trắng.', 'error');
            document.getElementById('m_color_search').focus();
            return;
        }
    }

    // Screen printing validation: require quantity, supplier, and number of colors when enabled
    const screenOn = document.getElementById('m_enable_screen')?.checked;
    if (screenOn) {
        const qScreen = Number(document.getElementById('m_quantity').value) || 0;
        if (qScreen <= 0) {
            toast('Bật Chi phí in Lưới → vui lòng nhập Số lượng áo để tính giá!', 'error');
            document.getElementById('m_quantity').focus();
            return;
        }
        if (!_mobileBgg.screenSupplier) {
            toast('Vui lòng chọn nhà in lưới!', 'error');
            openScreenPickerMobile();
            return;
        }
        const colors = Number(document.getElementById('m_screen_colors')?.value) || 0;
        if (colors <= 0) {
            toast('Vui lòng nhập Số màu in Lưới (> 0)!', 'error');
            document.getElementById('m_screen_colors').focus();
            return;
        }
    }

    const resultsCard = document.getElementById('m_results_card');
    resultsCard.innerHTML = '<div style="text-align: center; padding: 40px 10px; color: #64748b; font-weight: 700; font-size: 13px;">⏳ Đang tính toán tối ưu...</div>';

    try {
        const payload = {
            material_id: Number(matId)
        };
        if (colorId) {
            payload.fabric_color_id = Number(colorId);
        }
        if (segment) payload.size_segment = segment;
        if (qty !== '') payload.quantity = Number(qty);

        const res = await apiCall('/api/pricing/calculate', 'POST', payload);
        if (!res.success) {
            resultsCard.innerHTML = `<div style="padding: 12px; background: #fee2e2; color: #b91c1c; border-radius: 8px; font-weight: 600; font-size: 12.5px;">❌ Lỗi: ${res.error || 'Có lỗi xảy ra'}</div>`;
            return;
        }

        _mobileBgg.lastCalcResponse = res;
        _mobileBgg.selectedCalcSupplierId = 'all';

        renderMobileCalcResults();
    } catch (err) {
        console.error(err);
        resultsCard.innerHTML = `<div style="padding: 12px; background: #fee2e2; color: #b91c1c; border-radius: 8px; font-weight: 600; font-size: 12.5px;">❌ Lỗi kết nối</div>`;
    }
}

function selectMobileCalcSupplier(supplierId) {
    _mobileBgg.selectedCalcSupplierId = String(supplierId);
    renderMobileCalcResults();
}

function getSegmentBadgeMobile(segment) {
    if (!segment) {
        return `<span style="color:#ef4444; font-style:italic;">Chưa chia</span>`;
    }
    const cleanSegment = segment.trim();
    let bg = '#e2e8f0';
    let color = '#475569';
    const segObj = (_mobileBgg.sizeSegments || []).find(s => s.name === cleanSegment);
    if (!segObj) {
        return `<span style="color:#ef4444; font-style:italic;">Chưa chia</span>`;
    }
    let icon = segObj.icon ? segObj.icon : '🧑';
    
    if (cleanSegment === 'Người Lớn') {
        bg = '#dbeafe';
        color = '#1e40af';
    } else if (cleanSegment === 'Mầm Non') {
        bg = '#fce7f3';
        color = '#9d174d';
    } else if (cleanSegment === 'Tiểu Học') {
        bg = '#dcfce7';
        color = '#166534';
    } else if (cleanSegment === 'Oversize') {
        bg = '#f3e8ff';
        color = '#6b21a8';
    }
    return `<span style="display:inline-flex; align-items:center; gap:2px; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:700; background-color:${bg}; color:${color};">${icon} ${cleanSegment}</span>`;
}

function renderMobileCalcResults() {
    const res = _mobileBgg.lastCalcResponse;
    const resultsCard = document.getElementById('m_results_card');
    if (!res || !resultsCard) return;

    const selectedId = _mobileBgg.selectedCalcSupplierId || 'all';
    const petInfo = getPetCostsMobile();
    const petCost = petInfo.enabled ? (localStorage.getItem('tlcg_pet_calc_mode') === 'optimized' ? petInfo.optimizedCost : petInfo.alignedCost) : 0;
    const sewingCost = Number(document.getElementById('m_sewing_cost')?.value) || 0;
    const collarCost = Number(document.getElementById('m_collar_cost')?.value) || 0;
    const qty3d = Number(document.getElementById('m_quantity')?.value) || 0;
    const calc3d = _mCalc3dCost(qty3d);
    const print3dCost = calc3d.total;
    const screenCost = calcScreenCostMobile(qty3d);
    const extraCost = petCost + sewingCost + collarCost + print3dCost + screenCost;

    const breakdownParts = [];
    if (petCost > 0) breakdownParts.push(`PET: ${Number(petCost).toLocaleString('vi-VN')}đ`);
    if (sewingCost > 0) breakdownParts.push(`May: ${Number(sewingCost).toLocaleString('vi-VN')}đ`);
    if (collarCost > 0) breakdownParts.push(`Cổ: ${Number(collarCost).toLocaleString('vi-VN')}đ`);
    if (print3dCost > 0) breakdownParts.push(`3D: ${Number(print3dCost).toLocaleString('vi-VN')}đ`);
    if (screenCost > 0) breakdownParts.push(`Lưới: ${Number(screenCost).toLocaleString('vi-VN')}đ`);
    const extraDetailStr = breakdownParts.length > 0 ? ` + ${breakdownParts.join(' + ')}` : '';

    const getRankStyles = (idx) => {
        const icons = ['🏆 ', '🥈 ', '🥉 ', '• '];
        const icon = icons[Math.min(idx, 3)];
        let nameColor = '#1e293b';
        let priceColor = '#334155';
        let fontWeight = '600';
        
        if (idx === 0) {
            priceColor = '#15803d';
            nameColor = '#1e3a8a';
            fontWeight = '800';
        } else if (idx === 1) {
            priceColor = '#c2410c';
            nameColor = '#0369a1';
            fontWeight = '700';
        } else if (idx === 2) {
            priceColor = '#b91c1c';
            nameColor = '#4f46e5';
            fontWeight = '700';
        } else {
            priceColor = '#475569';
            nameColor = '#475569';
            fontWeight = '500';
        }
        return { icon, nameColor, priceColor, fontWeight };
    };

    let html = '';

    // 1. PET Print summary
    if (petInfo.enabled) {
        const selectedMode = localStorage.getItem('tlcg_pet_calc_mode') || 'aligned';
        html += `
            <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 12px; padding: 10px; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <div style="font-size: 11px; font-weight: 800; color: #166534; text-transform: uppercase; margin-bottom: 8px;">
                    🖨️ Chi phí in PET dự kiến (cho 1 áo)
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px;">
                    <label style="background: white; border: 1.5px solid ${selectedMode === 'aligned' ? '#166534' : '#e2e8f0'}; border-radius: 8px; padding: 6px 10px; cursor: pointer; display: flex; align-items: center; gap: 6px; margin: 0;">
                        <input type="radio" name="m_pet_calc_mode" value="aligned" ${selectedMode === 'aligned' ? 'checked' : ''} onchange="updatePetModeMobile(this.value)">
                        <div>
                            <div style="font-size: 8px; color: #64748b; font-weight: 700; text-transform: uppercase;">Thẳng hàng</div>
                            <div style="font-size: 13px; font-weight: 800; color: #166534;">${Number(petInfo.alignedCost).toLocaleString('vi-VN')} đ</div>
                        </div>
                    </label>
                    <label style="background: white; border: 1.5px solid ${selectedMode === 'optimized' ? '#166534' : '#e2e8f0'}; border-radius: 8px; padding: 6px 10px; cursor: pointer; display: flex; align-items: center; gap: 6px; margin: 0;">
                        <input type="radio" name="m_pet_calc_mode" value="optimized" ${selectedMode === 'optimized' ? 'checked' : ''} onchange="updatePetModeMobile(this.value)">
                        <div>
                            <div style="font-size: 8px; color: #64748b; font-weight: 700; text-transform: uppercase;">Tối ưu</div>
                            <div style="font-size: 13px; font-weight: 800; color: #166534;">${Number(petInfo.optimizedCost).toLocaleString('vi-VN')} đ</div>
                        </div>
                    </label>
                </div>
                <div style="font-size: 9.5px; color: #166534; font-weight: 500; margin-top: 8px; border-top: 1px dashed #bbf7d0; padding-top: 6px; line-height: 1.4;">
                    ${petInfo.details.map((d, i) => `
                        <div>
                            <strong>• ${d.name || `Hình in ${i+1}`}</strong> (${d.width}x${d.height}cm): 
                            Thẳng: <strong>${d.packing.aligned}</strong> hình (${Math.round(d.aCost).toLocaleString('vi-VN')}đ) | 
                            Tối ưu: <strong>${d.packing.optimized}</strong> hình (${Math.round(d.oCost).toLocaleString('vi-VN')}đ)
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // 1b. 3D Print summary
    if (_mobileBgg.print3dEnabled && _mobileBgg.print3dSupplier && calc3d.total > 0) {
        const supplier3d = _M_BGG_3D_SUPPLIERS.find(s => s.key === _mobileBgg.print3dSupplier);
        const sName = supplier3d ? `${supplier3d.icon} ${supplier3d.name}` : 'Chưa chọn';
        html += `
            <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:10px;margin-bottom:14px;">
                <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;margin-bottom:6px;">🎨 Chi phí in 3D (cho 1 áo)</div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <div style="background:white;border:1.5px solid #93c5fd;border-radius:8px;padding:6px 10px;"><div style="font-size:8px;color:#64748b;font-weight:700;">NCC</div><div style="font-size:11px;font-weight:800;color:#1e40af;">${sName}</div></div>
                    <div style="background:white;border:1.5px solid #93c5fd;border-radius:8px;padding:6px 10px;"><div style="font-size:8px;color:#64748b;font-weight:700;">In</div><div style="font-size:12px;font-weight:800;color:#1e40af;">${Number(calc3d.printCost).toLocaleString('vi-VN')}đ</div></div>
                    ${calc3d.laserCost>0?'<div style="background:white;border:1.5px solid #93c5fd;border-radius:8px;padding:6px 10px;"><div style="font-size:8px;color:#64748b;font-weight:700;">Cắt</div><div style="font-size:12px;font-weight:800;color:#1e40af;">'+Number(calc3d.laserCost).toLocaleString('vi-VN')+'đ</div></div>':''}
                    <div style="background:#1e40af;border-radius:8px;padding:6px 10px;"><div style="font-size:8px;color:#93c5fd;font-weight:700;">Tổng</div><div style="font-size:13px;font-weight:800;color:white;">${Number(calc3d.total).toLocaleString('vi-VN')}đ</div></div>
                </div>
                <div style="font-size:9px;color:#475569;margin-top:6px;border-top:1px dashed #bfdbfe;padding-top:4px;">${qty3d}áo × ${calc3d.metersPerShirt}m = ${calc3d.totalMeters.toFixed(1)}m → ${Number(calc3d.printPricePerMeter).toLocaleString('vi-VN')}đ/m</div>
            </div>
        `;
    }

    // 1c. Screen Print summary
    if (_mobileBgg.screenEnabled && _mobileBgg.screenSupplier && screenCost > 0) {
        const supplierScreen = _M_BGG_SCREEN_SUPPLIERS.find(s => s.key === _mobileBgg.screenSupplier);
        const sName = supplierScreen ? `${supplierScreen.icon} ${supplierScreen.name}` : 'Chưa chọn';
        html += `
            <div style="background:#fdf2f8;border:1.5px solid #fbcfe8;border-radius:12px;padding:10px;margin-bottom:14px;">
                <div style="font-size:11px;font-weight:800;color:#9d174d;text-transform:uppercase;margin-bottom:6px;">🎨 Chi phí in Lưới (cho 1 áo)</div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <div style="background:white;border:1.5px solid #fbcfe8;border-radius:8px;padding:6px 10px;"><div style="font-size:8px;color:#64748b;font-weight:700;">NCC</div><div style="font-size:11px;font-weight:800;color:#9d174d;">${sName}</div></div>
                    <div style="background:white;border:1.5px solid #fbcfe8;border-radius:8px;padding:6px 10px;"><div style="font-size:8px;color:#64748b;font-weight:700;">Số màu</div><div style="font-size:12px;font-weight:800;color:#9d174d;">${_mobileBgg.screenColors} màu</div></div>
                    <div style="background:#9d174d;border-radius:8px;padding:6px 10px;"><div style="font-size:8px;color:#fbcfe8;font-weight:700;">Tổng</div><div style="font-size:13px;font-weight:800;color:white;">${Math.round(screenCost).toLocaleString('vi-VN')}đ</div></div>
                </div>
                <div style="font-size:9px;color:#475569;margin-top:6px;border-top:1px dashed #fbcfe8;padding-top:4px;">
                    Q = ${qty3d} áo | Màu = ${_mobileBgg.screenColors} màu | 
                    ${qty3d < 20 ? `Tổng gộp: ${Math.round(screenCost * qty3d).toLocaleString('vi-VN')}đ / đơn` : `Đơn giá: ${Math.round(screenCost).toLocaleString('vi-VN')}đ / áo`}
                </div>
            </div>
        `;
    }

    // 2. Raw pricing from suppliers list
    html += `
        <div style="background: #f1f5f9; border-radius: 12px; padding: 10px; margin-bottom: 14px;">
            <div style="font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">
                🏭 Giá Vải Gốc & Thành Phẩm
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
    `;

    if (res.suppliers && res.suppliers.length > 0) {
        html += `
            <div class="results-supplier-card" style="background: ${selectedId === 'all' ? '#e0f2fe' : 'transparent'}; border: 1px solid ${selectedId === 'all' ? '#bae6fd' : 'transparent'};" onclick="selectMobileCalcSupplier('all')">
                <input type="radio" name="m_supplier_radio" value="all" ${selectedId === 'all' ? 'checked' : ''} style="margin: 0; width: 15px; height: 15px;" onclick="event.stopPropagation(); selectMobileCalcSupplier('all')">
                <div style="flex: 1; font-size: 11.5px; font-weight: 700; color: #0369a1; line-height: 1.2;">
                    <div>🏆 Tất cả (Tự động rẻ nhất)</div>
                    <div style="font-size: 10.5px; color: #64748b; font-weight: normal; font-style: italic;">So sánh tối ưu</div>
                </div>
                <div style="text-align: right; font-size: 11.5px; font-weight: 800; color: #64748b; line-height: 1.2;">
                    <div style="font-size: 9.5px; color: #64748b; font-weight: normal;">Thành phẩm:</div>
                    <div>—</div>
                </div>
            </div>
        `;

        res.suppliers.forEach(ap => {
            const isChecked = selectedId === String(ap.source_id);
            
            let priceTexts = [];
            if (res.calculations && res.calculations.length > 0) {
                res.calculations.forEach(calc => {
                    const rangeCalc = calc.range_calcs && calc.range_calcs.length > 0 ? calc.range_calcs[0] : null;
                    const hasQty = res.quantity !== null && res.quantity > 0;
                    const price = (hasQty && rangeCalc && rangeCalc.range_prices[ap.source_id])
                        ? rangeCalc.range_prices[ap.source_id]
                        : calc.overall_prices[ap.source_id];
                    if (price) {
                        const finalPrice = Number(price) + extraCost;
                        const cleanSeg = (calc.segment || '').trim();
                        let color = '#2563eb';
                        if (cleanSeg === 'Người Lớn') color = '#2563eb';
                        else if (cleanSeg === 'Mầm Non') color = '#db2777';
                        else if (cleanSeg === 'Tiểu Học') color = '#059669';
                        else if (cleanSeg === 'Oversize') color = '#ea580c';

                        if (res.calculations.length > 1) {
                            priceTexts.push(`<span style="color: ${color}; font-weight: 700;">${calc.segment}: ${Number(finalPrice).toLocaleString('vi-VN')}đ</span>`);
                        } else {
                            priceTexts.push(`<span style="color: ${color}; font-weight: 700;">${Number(finalPrice).toLocaleString('vi-VN')}đ</span>`);
                        }
                    }
                });
            }
            const priceDisplay = priceTexts.length > 0 ? priceTexts.join('<br>') : '—';

            html += `
                <div class="results-supplier-card" style="background: ${isChecked ? '#e0f2fe' : 'transparent'}; border: 1px solid ${isChecked ? '#bae6fd' : 'transparent'};" onclick="selectMobileCalcSupplier('${ap.source_id}')">
                    <input type="radio" name="m_supplier_radio" value="${ap.source_id}" ${isChecked ? 'checked' : ''} style="margin: 0; width: 15px; height: 15px;" onclick="event.stopPropagation(); selectMobileCalcSupplier('${ap.source_id}')">
                    <div style="flex: 1; font-size: 11.5px; font-weight: 700; color: #334155; line-height: 1.2;">
                        <div>${ap.source_name}</div>
                        <div style="font-size: 10.5px; color: #64748b; font-weight: normal;">Gốc: ${Number(ap.price).toLocaleString('vi-VN')} đ / ${res.unit}</div>
                    </div>
                    <div style="text-align: right; font-size: 11.5px; font-weight: 800; color: #1e293b; line-height: 1.2;">
                        <div style="font-size: 9.5px; color: #64748b; font-weight: normal;">Thành phẩm:</div>
                        <div>${priceDisplay}</div>
                    </div>
                </div>
            `;
        });
    } else {
        html += '<div style="font-size: 11px; color: #64748b; font-style: italic; padding: 4px;">Chưa có giá nhập gốc cho màu vải này</div>';
    }

    html += `
            </div>
        </div>
    `;

    // 3. Calculation Details
    html += `
        <div style="font-size: 11.5px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 10px;">
            📊 Chi tiết so sánh & định lượng
        </div>
    `;

    if (res.calculations && res.calculations.length > 0) {
        res.calculations.forEach(calc => {
            const hasQty = res.quantity !== null && res.quantity > 0;
            const rangeCalc = calc.range_calcs && calc.range_calcs.length > 0 ? calc.range_calcs[0] : null;

            let activeCheapestRange = null;
            let activeCheapestOverall = null;

            if (selectedId === 'all') {
                activeCheapestRange = rangeCalc ? rangeCalc.cheapest_range : null;
                activeCheapestOverall = calc.cheapest_overall;
            } else {
                const selSupplier = res.suppliers.find(s => String(s.source_id) === selectedId);
                if (selSupplier) {
                    if (rangeCalc) {
                        const rPrice = rangeCalc.range_prices[selSupplier.source_id];
                        if (rPrice) {
                            activeCheapestRange = {
                                source_id: selSupplier.source_id,
                                source_name: selSupplier.source_name,
                                price: rPrice,
                                base_price: selSupplier.price
                            };
                        }
                    }
                    const oPrice = calc.overall_prices[selSupplier.source_id];
                    if (oPrice) {
                        activeCheapestOverall = {
                            source_id: selSupplier.source_id,
                            source_name: selSupplier.source_name,
                            price: oPrice,
                            base_price: selSupplier.price
                        };
                    }
                }
            }

            const overallSupplierPrices = [];
            res.suppliers.forEach(s => {
                const oPrice = calc.overall_prices[s.source_id];
                if (oPrice) {
                    overallSupplierPrices.push({
                        source_id: s.source_id,
                        source_name: s.source_name,
                        price: oPrice,
                        base_price: s.price
                    });
                }
            });
            overallSupplierPrices.sort((a, b) => a.price - b.price);

            let subCardsHtml = '';
            if (hasQty && rangeCalc) {
                const rangeSupplierPrices = [];
                res.suppliers.forEach(s => {
                    const rPrice = rangeCalc.range_prices[s.source_id];
                    if (rPrice) {
                        rangeSupplierPrices.push({
                            source_id: s.source_id,
                            source_name: s.source_name,
                            price: rPrice,
                            base_price: s.price
                        });
                    }
                });
                rangeSupplierPrices.sort((a, b) => a.price - b.price);

                const rangeKgNeeded = rangeCalc.range_ratio > 0 ? (res.quantity / rangeCalc.range_ratio).toFixed(2) : null;
                const overallKgNeeded = calc.overall_ratio > 0 ? (res.quantity / calc.overall_ratio).toFixed(2) : null;

                const rangeHasData = rangeCalc.range_ratio > 0 && rangeSupplierPrices.length > 0;
                const rangeBg = rangeHasData ? '#eff6ff' : '#fef2f2';
                const rangeBorder = rangeHasData ? '#bfdbfe' : '#fca5a5';
                const rangeText = rangeHasData ? '#1d4ed8' : '#991b1b';
                const rangeSub = rangeHasData ? '#1e40af' : '#b91c1c';

                const overallHasData = calc.overall_ratio > 0 && overallSupplierPrices.length > 0;
                const overallBg = overallHasData ? '#ecfdf5' : '#fef2f2';
                const overallBorder = overallHasData ? '#a7f3d0' : '#fca5a5';
                const overallText = overallHasData ? '#047857' : '#991b1b';
                const overallSub = overallHasData ? '#065f46' : '#b91c1c';

                subCardsHtml = `
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <!-- Range Specific Card -->
                        <div style="background: ${rangeBg}; border: 1.5px solid ${rangeBorder}; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 6px;">
                            <div>
                                <div style="font-size: 10px; font-weight: 800; color: ${rangeText}; text-transform: uppercase;">
                                    📦 Theo Khung Số Lượng [${rangeCalc.range_label}]
                                </div>
                                <div style="font-size: 15px; font-weight: 900; color: ${rangeSub}; margin-top: 2px;">
                                    Tỉ lệ: ${rangeCalc.range_ratio ? rangeCalc.range_ratio.toFixed(2) + ' sp/' + res.unit : 'Chưa có'}
                                </div>
                                ${rangeKgNeeded ? `
                                    <div style="font-size: 11px; color: ${rangeSub}; font-weight: 600;">
                                        Số vải dự kiến: <strong>${rangeKgNeeded} kg</strong>
                                    </div>
                                ` : ''}
                            </div>
                            ${rangeHasData ? `
                                <div style="font-size: 11.5px; border-top: 1px dashed ${rangeBorder}; padding-top: 6px; line-height: 1.4;">
                                    ${rangeSupplierPrices.map((sp, idx) => {
                                        const isSelected = selectedId === 'all' || selectedId === String(sp.source_id);
                                        const styles = getRankStyles(idx);
                                        const finalNameColor = isSelected ? styles.nameColor : '#64748b';
                                        const finalPriceColor = isSelected ? styles.priceColor : '#64748b';
                                        return `
                                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1px 0;">
                                                <span style="color: ${finalNameColor}; font-weight: 600;">${styles.icon}${sp.source_name}</span>
                                                <div style="text-align: right; line-height: 1.2;">
                                                    <span style="color: ${finalPriceColor}; font-weight: 800;">
                                                        ${Number(sp.price + extraCost).toLocaleString('vi-VN')} đ
                                                    </span>
                                                    ${extraCost > 0 ? `
                                                        <div style="font-size: 9.5px; color: #64748b; font-weight: normal; margin-top: 1px;">
                                                            (Vải: ${Number(sp.price).toLocaleString('vi-VN')}đ${extraDetailStr})
                                                        </div>
                                                    ` : ''}
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            ` : `<div style="font-size: 11px; color: ${rangeSub}; font-style: italic;">Không có thực tế cho khung này</div>`}
                        </div>

                        <!-- Overall Card -->
                        <div style="background: ${overallBg}; border: 1.5px solid ${overallBorder}; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 6px;">
                            <div>
                                <div style="font-size: 10px; font-weight: 800; color: ${overallText}; text-transform: uppercase;">
                                    📊 Trung Bình Toàn Chất Liệu
                                </div>
                                <div style="font-size: 15px; font-weight: 900; color: ${overallSub}; margin-top: 2px;">
                                    Tỉ lệ: ${calc.overall_ratio ? calc.overall_ratio.toFixed(2) + ' sp/' + res.unit : 'Chưa có'}
                                </div>
                                ${overallKgNeeded ? `
                                    <div style="font-size: 11px; color: ${overallSub}; font-weight: 600;">
                                        Số vải dự kiến: <strong>${overallKgNeeded} kg</strong>
                                    </div>
                                ` : ''}
                            </div>
                            ${overallHasData ? `
                                <div style="font-size: 11.5px; border-top: 1px dashed ${overallBorder}; padding-top: 6px; line-height: 1.4;">
                                    ${overallSupplierPrices.map((sp, idx) => {
                                        const isSelected = selectedId === 'all' || selectedId === String(sp.source_id);
                                        const styles = getRankStyles(idx);
                                        const finalNameColor = isSelected ? styles.nameColor : '#64748b';
                                        const finalPriceColor = isSelected ? styles.priceColor : '#64748b';
                                        return `
                                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1px 0;">
                                                <span style="color: ${finalNameColor}; font-weight: 600;">${styles.icon}${sp.source_name}</span>
                                                <div style="text-align: right; line-height: 1.2;">
                                                    <span style="color: ${finalPriceColor}; font-weight: 800;">
                                                        ${Number(sp.price + extraCost).toLocaleString('vi-VN')} đ
                                                    </span>
                                                    ${extraCost > 0 ? `
                                                        <div style="font-size: 9.5px; color: #64748b; font-weight: normal; margin-top: 1px;">
                                                            (Vải: ${Number(sp.price).toLocaleString('vi-VN')}đ${extraDetailStr})
                                                        </div>
                                                    ` : ''}
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            ` : `<div style="font-size: 11px; color: ${overallSub}; font-style: italic;">Không có thực tế toàn chất liệu</div>`}
                        </div>
                    </div>
                `;
            } else {
                const overallHasData = calc.overall_ratio > 0 && overallSupplierPrices.length > 0;
                const ovBg = overallHasData ? '#f8fafc' : '#fef2f2';
                const ovBorder = overallHasData ? '#e2e8f0' : '#fca5a5';
                const ovText = overallHasData ? '#334155' : '#991b1b';
                const ovLabelText = overallHasData ? '#64748b' : '#b91c1c';

                subCardsHtml = `
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="background: ${ovBg}; border: 1.5px solid ${ovBorder}; border-radius: 10px; padding: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                            <div>
                                <div style="font-size: 9.5px; font-weight: 800; color: ${ovLabelText}; text-transform: uppercase;">📊 Trung Bình Toàn Chất Liệu</div>
                                <div style="font-size: 14px; font-weight: 900; color: ${ovText}; margin-top: 2px;">
                                    Tỉ lệ: ${calc.overall_ratio ? calc.overall_ratio.toFixed(2) + ' sp/' + res.unit : 'Chưa có'}
                                </div>
                            </div>
                            ${overallHasData ? `
                                <div style="text-align: right; line-height: 1.4; font-size: 11.5px; flex: 1; min-width: 120px;">
                                    ${overallSupplierPrices.map((sp, idx) => {
                                        const isSelected = selectedId === 'all' || selectedId === String(sp.source_id);
                                        const styles = getRankStyles(idx);
                                        const finalNameColor = isSelected ? styles.nameColor : '#64748b';
                                        const finalPriceColor = isSelected ? styles.priceColor : '#64748b';
                                        return `
                                            <div style="font-weight: 600; color: ${finalNameColor}; font-size: 11.5px; line-height: 1.3; margin-bottom: 4px;">
                                                ${styles.icon}${sp.source_name}: <span style="color: ${finalPriceColor}; font-weight: 800;">${Number(sp.price + extraCost).toLocaleString('vi-VN')} đ</span>
                                                ${extraCost > 0 ? `
                                                    <div style="font-size: 9.5px; color: #64748b; font-weight: normal; margin-top: 1px; padding-left: 14px;">
                                                        (Vải: ${Number(sp.price).toLocaleString('vi-VN')}đ${extraDetailStr})
                                                    </div>
                                                ` : ''}
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }

            html += `
                <div style="background: white; border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                    <div style="font-weight: 800; font-size: 12.5px; color: #1e293b; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                        <span>${getSegmentBadgeMobile(calc.segment)}</span>
                        ${res.quantity !== null ? `<span style="font-size: 11px; font-weight: 700; color: #64748b;">SL: ${res.quantity} áo</span>` : ''}
                    </div>
                    ${subCardsHtml}
                </div>
            `;
        });
    } else {
        html += '<div style="text-align: center; color: #64748b; font-style: italic; padding: 16px; font-size: 12px;">Không có dữ liệu định lượng</div>';
    }

    resultsCard.innerHTML = html;
}

window._mSelectSewingPreset = function(id, amount) {
    const sewingInput = document.getElementById('m_sewing_cost');
    if (sewingInput) {
        sewingInput.value = amount;
    }
    const collarInput = document.getElementById('m_collar_cost');
    if (collarInput) {
        const isCoBe = id === 'co_be' || id.toLowerCase().includes('co_be') || id.toLowerCase().includes('cổ bẻ');
        const isCoBeVai = id.toLowerCase().includes('vai') || id.toLowerCase().includes('vải');
        if (isCoBe && !isCoBeVai) {
            const firstCollarPreset = _mobileBgg.collarPresets && _mobileBgg.collarPresets[0];
            collarInput.value = firstCollarPreset ? firstCollarPreset.price : 6000;
        } else {
            collarInput.value = '';
        }
    }
    renderMobileCalcResults();
};

window._mSelectCollarPreset = function(amount) {
    const collarInput = document.getElementById('m_collar_cost');
    if (collarInput) {
        collarInput.value = amount;
    }
    renderMobileCalcResults();
};

function _mRenderPresetsOnForm() {
    const sewingContainer = document.getElementById('m_sewing_presets_container');
    if (sewingContainer) {
        sewingContainer.innerHTML = (_mobileBgg.sewingPresets || []).map(p => `
            <button type="button" class="btn-suggestion" onclick="_mSelectSewingPreset('${p.id}', ${p.price})">
                ${p.icon || '👕'} ${p.name}: ${Number(p.price).toLocaleString('vi-VN')}đ
            </button>
        `).join('');
    }
    const collarContainer = document.getElementById('m_collar_presets_container');
    if (collarContainer) {
        collarContainer.innerHTML = (_mobileBgg.collarPresets || []).map(p => `
            <button type="button" class="btn-suggestion" onclick="_mSelectCollarPreset(${p.price})">
                ${p.icon || '👔'} ${p.name}: ${Number(p.price).toLocaleString('vi-VN')}đ
            </button>
        `).join('');
    }
}

window._mOpenSetupModal = function() {
    // Copy existing presets to temp lists
    _mobileBgg.tempSewingPresets = JSON.parse(JSON.stringify(_mobileBgg.sewingPresets || []));
    _mobileBgg.tempCollarPresets = JSON.parse(JSON.stringify(_mobileBgg.collarPresets || []));

    // Remove existing modal if any
    const existing = document.getElementById('m_setup_modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'm_setup_modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 11000; padding: 16px;';
    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; width: 100%; max-width: 450px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); display: flex; flex-direction: column; border: 1px solid #e2e8f0;">
            <!-- Header -->
            <div style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
                <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px;">⚙️ Setup Chi Phí & Gợi Ý</h3>
                <button onclick="_mCloseSetupModal()" style="background: none; border: none; font-size: 20px; color: #64748b; cursor: pointer; padding: 4px;">&times;</button>
            </div>
            <!-- Body -->
            <div style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
                <!-- Section 1: PET configs -->
                <div>
                    <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #1e293b; text-transform: uppercase;">🖨️ Cấu hình PET</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <label style="display: block; font-size: 10px; font-weight: 700; color: #64748b; margin-bottom: 4px;">Giá khổ in (58x100) (đ)</label>
                            <input type="number" id="m_setup_pet_sheet_price" class="m-input" style="padding: 6px 8px; font-size: 12.5px; width: 100%; border: 1.5px solid #cbd5e1; border-radius: 8px;" value="${_mobileBgg.petSheetPrice}">
                        </div>
                        <div>
                            <label style="display: block; font-size: 10px; font-weight: 700; color: #64748b; margin-bottom: 4px;">Khoảng cách Spacing (cm)</label>
                            <input type="text" id="m_setup_pet_spacing" class="m-input" style="padding: 6px 8px; font-size: 12.5px; width: 100%; border: 1.5px solid #cbd5e1; border-radius: 8px;" value="${_mobileBgg.petSpacing}" oninput="this.value = this.value.replace(/,/g, '.').replace(/[^0-9.]/g, '')">
                        </div>
                    </div>
                </div>
                
                <!-- Section 2: Sewing suggestions -->
                <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <h4 style="margin: 0; font-size: 12px; font-weight: 700; color: #1e293b; text-transform: uppercase;">👕 Gợi ý Chi phí may</h4>
                        <button onclick="_mAddSetupSewingPreset()" style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; font-size: 10.5px; font-weight: 700; color: #475569; cursor: pointer;">➕ Thêm</button>
                    </div>
                    <div id="m_setup_sewing_presets_list" style="display: flex; flex-direction: column; gap: 8px;">
                        <!-- Dynamically populated -->
                    </div>
                </div>
                
                <!-- Section 3: Collar suggestions -->
                <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <h4 style="margin: 0; font-size: 12px; font-weight: 700; color: #1e293b; text-transform: uppercase;">👔 Gợi ý Chi phí cổ bẻ</h4>
                        <button onclick="_mAddSetupCollarPreset()" style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; font-size: 10.5px; font-weight: 700; color: #475569; cursor: pointer;">➕ Thêm</button>
                    </div>
                    <div id="m_setup_collar_presets_list" style="display: flex; flex-direction: column; gap: 8px;">
                        <!-- Dynamically populated -->
                    </div>
                </div>
            </div>
            <!-- Footer -->
            <div style="padding: 12px 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; background: #f8fafc; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;">
                <button onclick="_mCloseSetupModal()" style="padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 12.5px; font-weight: 600; color: #475569; background: white; cursor: pointer;">Hủy</button>
                <button onclick="_mSaveSetupModal()" style="padding: 6px 12px; border: none; border-radius: 8px; font-size: 12.5px; font-weight: 600; color: white; background: #166534; cursor: pointer; box-shadow: 0 4px 12px rgba(22,101,52,0.15);">Lưu</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    _mRenderSetupPresets();
};

window._mCloseSetupModal = function() {
    const modal = document.getElementById('m_setup_modal');
    if (modal) modal.remove();
};

window._mRenderSetupPresets = function() {
    const sewingList = document.getElementById('m_setup_sewing_presets_list');
    if (sewingList) {
        const presets = _mobileBgg.tempSewingPresets || [];
        sewingList.style.display = presets.length > 0 ? 'flex' : 'none';
        sewingList.innerHTML = presets.map((p, idx) => {
            if (!p) return '';
            return `
                <div style="display: flex; align-items: center; gap: 4px;">
                    <input type="text" placeholder="Icon" value="${p.icon || ''}" style="width: 40px; text-align: center; padding: 6px; font-size: 12.5px; border: 1.5px solid #cbd5e1; border-radius: 8px;">
                    <input type="text" placeholder="Tên" value="${p.name || ''}" style="flex: 1; padding: 6px 8px; font-size: 12.5px; border: 1.5px solid #cbd5e1; border-radius: 8px; min-width: 0;">
                    <input type="number" placeholder="Giá" value="${p.price || ''}" style="width: 70px; padding: 6px 8px; font-size: 12.5px; border: 1.5px solid #cbd5e1; border-radius: 8px;">
                    <button onclick="_mRemoveSetupSewingPreset(${idx})" style="background: #fee2e2; border: none; color: #ef4444; border-radius: 6px; padding: 6px 8px; font-size: 11.5px; font-weight: 600; cursor: pointer;">Xóa</button>
                </div>
            `;
        }).join('');
    }
    const collarList = document.getElementById('m_setup_collar_presets_list');
    if (collarList) {
        const presets = _mobileBgg.tempCollarPresets || [];
        collarList.style.display = presets.length > 0 ? 'flex' : 'none';
        collarList.innerHTML = presets.map((p, idx) => {
            if (!p) return '';
            return `
                <div style="display: flex; align-items: center; gap: 4px;">
                    <input type="text" placeholder="Icon" value="${p.icon || ''}" style="width: 40px; text-align: center; padding: 6px; font-size: 12.5px; border: 1.5px solid #cbd5e1; border-radius: 8px;">
                    <input type="text" placeholder="Tên" value="${p.name || ''}" style="flex: 1; padding: 6px 8px; font-size: 12.5px; border: 1.5px solid #cbd5e1; border-radius: 8px; min-width: 0;">
                    <input type="number" placeholder="Giá" value="${p.price || ''}" style="width: 70px; padding: 6px 8px; font-size: 12.5px; border: 1.5px solid #cbd5e1; border-radius: 8px;">
                    <button onclick="_mRemoveSetupCollarPreset(${idx})" style="background: #fee2e2; border: none; color: #ef4444; border-radius: 6px; padding: 6px 8px; font-size: 11.5px; font-weight: 600; cursor: pointer;">Xóa</button>
                </div>
            `;
        }).join('');
    }
};

window._mSyncSetupPresetsFromDOM = function() {
    const sewingList = document.getElementById('m_setup_sewing_presets_list');
    if (sewingList) {
        const rows = sewingList.children;
        _mobileBgg.tempSewingPresets = Array.from(rows).map(row => {
            const inputs = row.querySelectorAll('input');
            const iconVal = inputs[0] ? inputs[0].value : '';
            const nameVal = inputs[1] ? inputs[1].value : '';
            const priceVal = inputs[2] ? Number(inputs[2].value) : 0;
            return {
                id: nameVal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '_'),
                icon: iconVal,
                name: nameVal,
                price: priceVal || 0
            };
        });
    }
    const collarList = document.getElementById('m_setup_collar_presets_list');
    if (collarList) {
        const rows = collarList.children;
        _mobileBgg.tempCollarPresets = Array.from(rows).map(row => {
            const inputs = row.querySelectorAll('input');
            const iconVal = inputs[0] ? inputs[0].value : '';
            const nameVal = inputs[1] ? inputs[1].value : '';
            const priceVal = inputs[2] ? Number(inputs[2].value) : 0;
            return {
                id: nameVal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '_'),
                icon: iconVal,
                name: nameVal,
                price: priceVal || 0
            };
        });
    }
};

window._mAddSetupSewingPreset = function() {
    _mSyncSetupPresetsFromDOM();
    _mobileBgg.tempSewingPresets.push({ icon: '👕', name: '', price: 0 });
    _mRenderSetupPresets();
};

window._mRemoveSetupSewingPreset = function(idx) {
    _mSyncSetupPresetsFromDOM();
    _mobileBgg.tempSewingPresets.splice(idx, 1);
    _mRenderSetupPresets();
};

window._mAddSetupCollarPreset = function() {
    _mSyncSetupPresetsFromDOM();
    _mobileBgg.tempCollarPresets.push({ icon: '👔', name: '', price: 0 });
    _mRenderSetupPresets();
};

window._mRemoveSetupCollarPreset = function(idx) {
    _mSyncSetupPresetsFromDOM();
    _mobileBgg.tempCollarPresets.splice(idx, 1);
    _mRenderSetupPresets();
};

window._mSaveSetupModal = function() {
    _mSyncSetupPresetsFromDOM();
    
    // Save PET price and spacing
    const priceVal = Number(document.getElementById('m_setup_pet_sheet_price')?.value) || 0;
    const spacingVal = document.getElementById('m_setup_pet_spacing')?.value || '0.4';
    
    const mainPriceInput = document.getElementById('m_pet_sheet_price');
    if (mainPriceInput) mainPriceInput.value = priceVal;
    
    const mainSpacingInput = document.getElementById('m_pet_spacing');
    if (mainSpacingInput) mainSpacingInput.value = spacingVal;
    
    localStorage.setItem('tlcg_pet_sheet_price', priceVal);
    localStorage.setItem('tlcg_pet_spacing', spacingVal);
    _mobileBgg.petSheetPrice = priceVal;
    _mobileBgg.petSpacing = Number(spacingVal);
    
    // Save presets
    _mobileBgg.sewingPresets = _mobileBgg.tempSewingPresets;
    _mobileBgg.collarPresets = _mobileBgg.tempCollarPresets;
    localStorage.setItem('bgg_sewing_presets', JSON.stringify(_mobileBgg.sewingPresets));
    localStorage.setItem('bgg_collar_presets', JSON.stringify(_mobileBgg.collarPresets));
    
    // Refresh main form and trigger recalculation
    _mRenderPresetsOnForm();
    renderMobileCalcResults();
    
    toast('Đã lưu cấu hình chi phí và gợi ý!');
    _mCloseSetupModal();
};

// Bind all to window
window._mobileBgg = _mobileBgg;
window.initMobileBaogiagocPage = initMobileBaogiagocPage;
window.apiCall = apiCall;
window.toast = toast;
window.loadInitialDataMobile = loadInitialDataMobile;
window.loadPetConfigsMobile = loadPetConfigsMobile;
window.savePetConfigsMobile = savePetConfigsMobile;
window.togglePetSectionMobile = togglePetSectionMobile;
window.renderPetShapeRowsMobile = renderPetShapeRowsMobile;
window.addPetShapeRowMobile = addPetShapeRowMobile;
window.removePetShapeRowMobile = removePetShapeRowMobile;
window.updatePetShapeMobile = updatePetShapeMobile;
window.updatePetModeMobile = updatePetModeMobile;
window.calculatePackingMobile = calculatePackingMobile;
window.getPetCostsMobile = getPetCostsMobile;
window.handleMaterialChangeMobile = handleMaterialChangeMobile;
window.getActiveSegmentsMobile = getActiveSegmentsMobile;
window.runMobileCalculation = runMobileCalculation;
window.selectMobileCalcSupplier = selectMobileCalcSupplier;
window.getSegmentBadgeMobile = getSegmentBadgeMobile;
window.renderMobileCalcResults = renderMobileCalcResults;
window._mSelectSewingPreset = window._mSelectSewingPreset;
window._mSelectCollarPreset = window._mSelectCollarPreset;
window.toggle3dSectionMobile = toggle3dSectionMobile;
window.openSetup3dMobile = openSetup3dMobile;
window.closeSetup3dMobile = closeSetup3dMobile;
window.select3dSupplierMobile = select3dSupplierMobile;

// Autocomplete helpers for mobile Chất liệu
function showMaterialDropdownMobile() {
    const dropdown = document.getElementById('m_material_dropdown');
    if (dropdown) {
        dropdown.style.display = 'block';
        renderMaterialDropdownMobile();
    }
}

function renderMaterialDropdownMobile(filteredList) {
    const dropdown = document.getElementById('m_material_dropdown');
    if (!dropdown) return;
    
    const list = filteredList || _mobileBgg.materials || [];
    if (list.length === 0) {
        dropdown.innerHTML = '<div style="padding: 10px; color: #94a3b8; font-size: 13px; font-style: italic; text-align: center;">Không tìm thấy chất liệu</div>';
        return;
    }
    
    dropdown.innerHTML = list.map(m => `
        <div onmousedown="selectMaterialMobile('${m.id}', '${m.name.replace(/'/g, "\\'")}')" style="padding: 12px 14px; font-size: 13px; font-weight: 600; color: #1e293b; cursor: pointer; border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='white'">
            ${m.name}
        </div>
    `).join('');
}

function filterMaterialsMobile(query) {
    const q = query.trim().toLowerCase();
    const filtered = _mobileBgg.materials.filter(m => m.name.toLowerCase().includes(q));
    renderMaterialDropdownMobile(filtered);
}

function closeMaterialDropdownMobile() {
    const dropdown = document.getElementById('m_material_dropdown');
    if (dropdown) dropdown.style.display = 'none';
}

function selectMaterialMobile(id, name) {
    const searchInput = document.getElementById('m_material_search');
    const idInput = document.getElementById('m_material_id');
    if (searchInput && idInput) {
        idInput.value = id;
        searchInput.value = name;
        handleMaterialChangeMobile(id);
    }
    closeMaterialDropdownMobile();
}

function validateMaterialSearchMobile() {
    setTimeout(() => {
        const searchInput = document.getElementById('m_material_search');
        if (!searchInput) return;
        const query = searchInput.value.trim().toLowerCase();
        if (query === '') {
            document.getElementById('m_material_id').value = '';
            handleMaterialChangeMobile('');
            closeMaterialDropdownMobile();
            return;
        }
        
        const match = _mobileBgg.materials.find(m => m.name.trim().toLowerCase() === query);
        if (match) {
            document.getElementById('m_material_id').value = match.id;
            searchInput.value = match.name;
            handleMaterialChangeMobile(match.id);
        } else {
            const currentId = document.getElementById('m_material_id').value;
            const currentMat = _mobileBgg.materials.find(m => String(m.id) === String(currentId));
            if (currentMat) {
                searchInput.value = currentMat.name;
            } else {
                searchInput.value = '';
                document.getElementById('m_material_id').value = '';
                handleMaterialChangeMobile('');
            }
        }
        closeMaterialDropdownMobile();
    }, 200);
}

window.showMaterialDropdownMobile = showMaterialDropdownMobile;
window.renderMaterialDropdownMobile = renderMaterialDropdownMobile;
window.filterMaterialsMobile = filterMaterialsMobile;
window.closeMaterialDropdownMobile = closeMaterialDropdownMobile;
window.selectMaterialMobile = selectMaterialMobile;
window.validateMaterialSearchMobile = validateMaterialSearchMobile;

// Autocomplete helpers for mobile Màu sắc
function getActiveColorsMobile() {
    const matId = document.getElementById('m_material_id')?.value;
    if (!matId) {
        return _mobileBgg.colors || [];
    }
    return (_mobileBgg.colors || []).filter(c => String(c.material_id) === String(matId));
}

function showColorDropdownMobile() {
    const dropdown = document.getElementById('m_color_dropdown');
    if (dropdown) {
        dropdown.style.display = 'block';
        renderColorDropdownMobile();
    }
}

function renderColorDropdownMobile(filteredList) {
    const dropdown = document.getElementById('m_color_dropdown');
    if (!dropdown) return;
    
    const list = filteredList || getActiveColorsMobile();
    if (list.length === 0) {
        dropdown.innerHTML = '<div style="padding: 10px; color: #94a3b8; font-size: 13px; font-style: italic; text-align: center;">Không tìm thấy màu sắc</div>';
        return;
    }
    
    dropdown.innerHTML = list.map(c => `
        <div onmousedown="selectColorMobile('${c.id}', '${c.color_name.replace(/'/g, "\\'")}')" style="padding: 12px 14px; font-size: 13px; font-weight: 600; color: #1e293b; cursor: pointer; border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='white'">
            ${c.color_name}
        </div>
    `).join('');
}

function filterColorsMobile(query) {
    const q = query.trim().toLowerCase();
    const activeList = getActiveColorsMobile();
    const filtered = activeList.filter(c => c.color_name.toLowerCase().includes(q));
    renderColorDropdownMobile(filtered);
}

function closeColorDropdownMobile() {
    const dropdown = document.getElementById('m_color_dropdown');
    if (dropdown) dropdown.style.display = 'none';
}

function selectColorMobile(id, name) {
    const searchInput = document.getElementById('m_color_search');
    const idInput = document.getElementById('m_color_id');
    if (searchInput && idInput) {
        idInput.value = id;
        searchInput.value = name;
    }
    closeColorDropdownMobile();
}

function validateColorSearchMobile() {
    setTimeout(() => {
        const searchInput = document.getElementById('m_color_search');
        if (!searchInput) return;
        const query = searchInput.value.trim().toLowerCase();
        if (query === '') {
            document.getElementById('m_color_id').value = '';
            closeColorDropdownMobile();
            return;
        }
        
        const activeList = getActiveColorsMobile();
        const match = activeList.find(c => c.color_name.trim().toLowerCase() === query);
        if (match) {
            document.getElementById('m_color_id').value = match.id;
            searchInput.value = match.color_name;
        } else {
            const currentId = document.getElementById('m_color_id').value;
            const currentCol = activeList.find(c => String(c.id) === String(currentId));
            if (currentCol) {
                searchInput.value = currentCol.color_name;
            } else {
                searchInput.value = '';
                document.getElementById('m_color_id').value = '';
            }
        }
        closeColorDropdownMobile();
    }, 200);
}

window.getActiveColorsMobile = getActiveColorsMobile;
window.showColorDropdownMobile = showColorDropdownMobile;
window.renderColorDropdownMobile = renderColorDropdownMobile;
window.filterColorsMobile = filterColorsMobile;
window.closeColorDropdownMobile = closeColorDropdownMobile;
window.selectColorMobile = selectColorMobile;
window.validateColorSearchMobile = validateColorSearchMobile;

// Screen printing registrations
window.toggleScreenSectionMobile = toggleScreenSectionMobile;
window.renderScreenSupplierDisplayMobile = renderScreenSupplierDisplayMobile;
window.saveScreenConfigsMobile = saveScreenConfigsMobile;
window.openScreenPickerMobile = openScreenPickerMobile;
window.closeScreenPickerMobile = closeScreenPickerMobile;
window.selectScreenSupplierFromPickerMobile = selectScreenSupplierFromPickerMobile;
window.openSetupScreenMobile = openSetupScreenMobile;
window.closeSetupScreenMobile = closeSetupScreenMobile;
window.selectScreenSupplierMobile = selectScreenSupplierMobile;
window.screenSaveConfigMobile = screenSaveConfigMobile;

// ========== MOBILE SCREEN PRINTING MODALS ==========

function openScreenPickerMobile() {
    const existing = document.getElementById('m_screen_picker_modal');
    if (existing) existing.remove();

    const currentSupplier = _mobileBgg.screenSupplier || '';

    const modal = document.createElement('div');
    modal.id = 'm_screen_picker_modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 11000; padding: 16px;';
    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; width: 100%; max-width: 360px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; overflow: hidden; font-family: system-ui, -apple-system, sans-serif;">
            <div style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
                <h3 style="margin: 0; font-size: 14px; font-weight: 800; color: #0f172a;">🎨 Chọn Nhà Cung Cấp In Lưới</h3>
                <button onclick="closeScreenPickerMobile()" style="background: none; border: none; font-size: 20px; color: #64748b; cursor: pointer; padding: 4px;">&times;</button>
            </div>
            <div style="padding: 16px; display: flex; flex-direction: column; gap: 8px;">
                ${_M_BGG_SCREEN_SUPPLIERS.map(s => `
                    <div onclick="selectScreenSupplierFromPickerMobile('${s.key}')" style="display: flex; align-items: center; gap: 10px; padding: 12px 14px; border: 2px solid ${currentSupplier === s.key ? '#db2777' : '#e2e8f0'}; border-radius: 10px; cursor: pointer; transition: all 0.2s; background: ${currentSupplier === s.key ? '#fdf2f8' : 'white'};">
                        <div style="width: 18px; height: 18px; border-radius: 50%; border: 2px solid ${currentSupplier === s.key ? '#db2777' : '#cbd5e1'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            ${currentSupplier === s.key ? '<div style="width: 8px; height: 8px; border-radius: 50%; background: #db2777;"></div>' : ''}
                        </div>
                        <div style="font-size: 13px; font-weight: 700; color: #1e293b;">${s.icon} ${s.name}</div>
                    </div>
                `).join('')}
            </div>
            <div style="padding: 10px 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; background: #f8fafc;">
                <button onclick="closeScreenPickerMobile()" style="padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; font-weight: 600; color: #475569; background: white; cursor: pointer;">Đóng</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeScreenPickerMobile() {
    const modal = document.getElementById('m_screen_picker_modal');
    if (modal) modal.remove();
}

function selectScreenSupplierFromPickerMobile(key) {
    _mobileBgg.screenSupplier = key;
    saveScreenConfigsMobile();
    renderScreenSupplierDisplayMobile();
    renderMobileCalcResults();
    closeScreenPickerMobile();
    if (typeof toast === 'function') {
        const supplier = _M_BGG_SCREEN_SUPPLIERS.find(s => s.key === key);
        toast(`Đã chọn ${supplier ? supplier.name : key}`, 'success');
    }
}

function openSetupScreenMobile() {
    const existing = document.getElementById('m_setup_screen_modal');
    if (existing) existing.remove();

    const currentSupplier = _mobileBgg.screenSupplier || '';

    const modal = document.createElement('div');
    modal.id = 'm_setup_screen_modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 11000; padding: 16px;';

    // Supplier tabs
    const tabsHtml = _M_BGG_SCREEN_SUPPLIERS.map(s => `
        <button onclick="selectScreenSupplierMobile('${s.key}')" style="padding: 6px 10px; border: 2px solid ${currentSupplier === s.key ? '#db2777' : '#e2e8f0'}; border-radius: 6px; font-size: 11px; font-weight: 700; color: ${currentSupplier === s.key ? '#9d174d' : '#64748b'}; background: ${currentSupplier === s.key ? '#fdf2f8' : 'white'}; cursor: pointer; transition: all 0.2s; white-space: nowrap;">${s.icon} ${s.name}</button>
    `).join('');

    let pricingHtml = '';
    if (currentSupplier) {
        const config = getScreenConfigMobile(currentSupplier);
        const threshold = config.qty_threshold;
        const priceLow = config.price_low;
        const priceHigh13 = config.price_high_1_3;
        const priceHigh4Plus = config.price_high_4_plus;

        pricingHtml = `
            <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 10px; font-family: system-ui, -apple-system, sans-serif;">
                <div style="background: #fdf2f8; padding: 10px; border-radius: 8px; border: 1px solid #fbcfe8;">
                    <div style="font-weight: 800; font-size: 10px; color: #9d174d; text-transform: uppercase; margin-bottom: 6px;">⚙️ Thiết lập ngưỡng số lượng & Giá in</div>
                    
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                            <span style="font-size: 11px; font-weight: 700; color: #475569;">Ngưỡng áo ít:</span>
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <input type="number" id="m_setup_screen_threshold" value="${threshold}" style="width: 60px; padding: 4px; border: 1.5px solid #cbd5e1; border-radius: 6px; font-size: 12px; font-weight: 700; text-align: center;">
                                <span style="font-size: 10px; color: #64748b; font-weight: 600;">áo</span>
                            </div>
                        </div>
                        
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                            <span style="font-size: 11px; font-weight: 700; color: #475569;">Dưới ngưỡng:</span>
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <input type="number" id="m_setup_screen_price_low" value="${priceLow}" style="width: 80px; padding: 4px; border: 1.5px solid #cbd5e1; border-radius: 6px; font-size: 12px; font-weight: 700; text-align: right;">
                                <span style="font-size: 10px; color: #64748b; font-weight: 600;">đ/màu/đơn</span>
                            </div>
                        </div>

                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; border-top: 1px dashed #fbcfe8; padding-top: 8px;">
                            <span style="font-size: 11px; font-weight: 700; color: #475569;">Trên/bằng (1-3 màu):</span>
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <input type="number" id="m_setup_screen_price_high_1_3" value="${priceHigh13}" style="width: 80px; padding: 4px; border: 1.5px solid #cbd5e1; border-radius: 6px; font-size: 12px; font-weight: 700; text-align: right;">
                                <span style="font-size: 10px; color: #64748b; font-weight: 600;">đ/màu/áo</span>
                            </div>
                        </div>

                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                            <span style="font-size: 11px; font-weight: 700; color: #475569;">Trên/bằng (≥ 4 màu):</span>
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <input type="number" id="m_setup_screen_price_high_4_plus" value="${priceHigh4Plus}" style="width: 80px; padding: 4px; border: 1.5px solid #cbd5e1; border-radius: 6px; font-size: 12px; font-weight: 700; text-align: right;">
                                <span style="font-size: 10px; color: #64748b; font-weight: 600;">đ/màu/áo</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else {
        pricingHtml = '<div style="margin-top: 12px; padding: 12px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; text-align: center; font-size: 11px; color: #64748b; font-family: system-ui, sans-serif;">Chọn nhà cung cấp ở trên để xem và chỉnh sửa bảng giá</div>';
    }

    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; width: 100%; max-width: 360px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; font-family: system-ui, -apple-system, sans-serif;">
            <div style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; background: white; z-index: 1; border-radius: 16px 16px 0 0;">
                <h3 style="margin: 0; font-size: 14px; font-weight: 800; color: #0f172a;">🎨 Setup Chi Phí In Lưới</h3>
                <button onclick="closeSetupScreenMobile()" style="background: none; border: none; font-size: 20px; color: #64748b; cursor: pointer; padding: 4px;">&times;</button>
            </div>
            <div style="padding: 16px;">
                <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 4px;">${tabsHtml}</div>
                ${pricingHtml}
            </div>
            <div style="padding: 10px 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 8px; background: #f8fafc; border-radius: 0 0 16px 16px; position: sticky; bottom: 0;">
                <button onclick="closeSetupScreenMobile()" style="padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; font-weight: 600; color: #475569; background: white; cursor: pointer;">Đóng</button>
                ${currentSupplier ? '<button onclick="screenSaveConfigMobile()" style="padding: 6px 12px; border: none; border-radius: 6px; font-size: 12px; font-weight: 700; color: white; background: linear-gradient(135deg, #db2777, #be185d); cursor: pointer;">💾 Lưu bảng giá</button>' : ''}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeSetupScreenMobile() {
    const modal = document.getElementById('m_setup_screen_modal');
    if (modal) modal.remove();
}

function selectScreenSupplierMobile(key) {
    _mobileBgg.screenSupplier = key;
    saveScreenConfigsMobile();
    renderScreenSupplierDisplayMobile();
    renderMobileCalcResults();
    closeSetupScreenMobile();
    openSetupScreenMobile();
}

function screenSaveConfigMobile() {
    const supplierKey = _mobileBgg.screenSupplier;
    if (!supplierKey) return;
    
    const threshold = Number(document.getElementById('m_setup_screen_threshold')?.value) || 20;
    const priceLow = Number(document.getElementById('m_setup_screen_price_low')?.value) || 50000;
    const priceHigh13 = Number(document.getElementById('m_setup_screen_price_high_1_3')?.value) || 3000;
    const priceHigh4Plus = Number(document.getElementById('m_setup_screen_price_high_4_plus')?.value) || 2500;

    const config = {
        qty_threshold: threshold,
        price_low: priceLow,
        price_high_1_3: priceHigh13,
        price_high_4_plus: priceHigh4Plus
    };
    
    localStorage.setItem('bgg_screen_config_' + supplierKey, JSON.stringify(config));
    
    if (typeof toast === 'function') {
        toast('Đã lưu cấu hình in Lưới!', 'success');
    }
    closeSetupScreenMobile();
    renderScreenSupplierDisplayMobile();
    renderMobileCalcResults();
}

// Register initialization on DOM content loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileBaogiagocPage);
} else {
    initMobileBaogiagocPage();
}
