// public/js/mobile-baogiagoc.js
// Duplicate/Wrapper for compatibility and to resolve 404 errors

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
    selectedCalcSupplierId: 'all'
};

async function initMobileBaogiagocPage() {
    const m_enable_pet = document.getElementById('m_enable_pet');
    if (!m_enable_pet) return;

    loadPetConfigsMobile();
    
    // Populate checkboxes
    m_enable_pet.checked = _mobileBgg.petEnabled;
    const isDirector = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';
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

    await loadInitialDataMobile();

    // Parse URL parameters for pre-selected material
    const urlParams = new URLSearchParams(window.location.search);
    const matParam = urlParams.get('material');
    if (matParam) {
        const matSelect = document.getElementById('m_material_id');
        if (matSelect) {
            matSelect.value = matParam;
            handleMaterialChangeMobile(matParam);
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
        
        // Populate Materials select
        const matSelect = document.getElementById('m_material_id');
        if (matSelect) {
            matSelect.innerHTML = '<option value="">-- Chọn chất liệu --</option>' + 
                _mobileBgg.materials.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
        }
        
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
    _mobileBgg.petEnabled = localStorage.getItem('tlcg_pet_enabled') === 'true';
    _mobileBgg.petSheetPrice = Number(localStorage.getItem('tlcg_pet_sheet_price')) || 40000;
    const storedSpacing = localStorage.getItem('tlcg_pet_spacing');
    if (storedSpacing === null || storedSpacing === '0.3' || storedSpacing === '3' || storedSpacing === '03') {
        _mobileBgg.petSpacing = 0.4;
        localStorage.setItem('tlcg_pet_spacing', '0.4');
    } else {
        _mobileBgg.petSpacing = Number(storedSpacing);
    }
    _mobileBgg.petCalcMode = localStorage.getItem('tlcg_pet_calc_mode') || 'aligned';
    _mobileBgg.petShapes = [];
    localStorage.removeItem('tlcg_pet_shapes');
}

function savePetConfigsMobile() {
    const enableCb = document.getElementById('m_enable_pet');
    if (enableCb) {
        localStorage.setItem('tlcg_pet_enabled', enableCb.checked ? 'true' : 'false');
    }
    const priceInput = document.getElementById('m_pet_sheet_price');
    if (priceInput) {
        localStorage.setItem('tlcg_pet_sheet_price', priceInput.value);
    }
    const spacingInput = document.getElementById('m_pet_spacing');
    if (spacingInput) {
        localStorage.setItem('tlcg_pet_spacing', spacingInput.value);
    }
    if (Array.isArray(_mobileBgg.petShapes)) {
        const cleanShapes = _mobileBgg.petShapes.filter(s => s && typeof s === 'object');
        localStorage.setItem('tlcg_pet_shapes', JSON.stringify(cleanShapes));
    }
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
    const colorSelect = document.getElementById('m_color_id');
    const segmentSelect = document.getElementById('m_segment');
    if (!colorSelect || !segmentSelect) return;
    
    colorSelect.innerHTML = '<option value="">-- Chọn màu sắc --</option>';
    
    if (!matId) {
        segmentSelect.innerHTML = `
            <option value="">-- Tất cả phân khúc --</option>
            ${(_mobileBgg.sizeSegments || []).map(s => `<option value="${s.name}">${s.icon || '🧑'} ${s.name}</option>`).join('')}
        `;
        return;
    }

    const filteredColors = _mobileBgg.colors.filter(c => String(c.material_id) === String(matId));
    filteredColors.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.color_name;
        colorSelect.appendChild(opt);
    });

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

    if (!matId || !colorId) {
        toast('Vui lòng chọn Chất liệu & Màu sắc!', 'error');
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

    const resultsCard = document.getElementById('m_results_card');
    resultsCard.innerHTML = '<div style="text-align: center; padding: 40px 10px; color: #64748b; font-weight: 700; font-size: 13px;">⏳ Đang tính toán tối ưu...</div>';

    try {
        const payload = {
            material_id: Number(matId),
            fabric_color_id: Number(colorId)
        };
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
    const extraCost = petCost + sewingCost + collarCost;

    const breakdownParts = [];
    if (petCost > 0) breakdownParts.push(`PET: ${Number(petCost).toLocaleString('vi-VN')}đ`);
    if (sewingCost > 0) breakdownParts.push(`May: ${Number(sewingCost).toLocaleString('vi-VN')}đ`);
    if (collarCost > 0) breakdownParts.push(`Cổ: ${Number(collarCost).toLocaleString('vi-VN')}đ`);
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

window._mSelectSewingPreset = function(type, amount) {
    const sewingInput = document.getElementById('m_sewing_cost');
    if (sewingInput) {
        sewingInput.value = amount;
    }
    const collarInput = document.getElementById('m_collar_cost');
    if (collarInput) {
        if (type === 'co_be') {
            collarInput.value = 6000;
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

// Register initialization on DOM content loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileBaogiagocPage);
} else {
    initMobileBaogiagocPage();
}
