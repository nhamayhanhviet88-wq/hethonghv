// public/js/pages/baogiagoc.js

var _bgg = {
    content: null,
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

async function renderBaogiagocPage(content) {
    _bgg.content = content;
    
    // Read cached configs from localstorage
    _bggLoadPetConfigs();
    
    // Inject stylesheet
    if (!document.getElementById('_bgg_styles')) {
        const style = document.createElement('style');
        style.id = '_bgg_styles';
        style.textContent = `
            .bgg-container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
                font-family: 'Inter', sans-serif;
            }
            .bgg-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 24px;
                flex-wrap: wrap;
                gap: 16px;
            }
            .bgg-title-area h2 {
                font-size: 24px;
                font-weight: 800;
                color: #0f172a;
                margin: 0;
            }
            .bgg-title-area p {
                font-size: 13px;
                color: #64748b;
                margin: 4px 0 0 0;
            }
            .bgg-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 24px;
            }
            @media (min-width: 1024px) {
                .bgg-grid {
                    grid-template-columns: 380px 1fr;
                }
            }
            .bgg-card {
                background: white;
                border-radius: 16px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
                border: 1px solid #f1f5f9;
                padding: 24px;
                height: fit-content;
            }
            .bgg-card-title {
                font-size: 16px;
                font-weight: 800;
                color: #1e293b;
                margin-top: 0;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .bgg-form-group {
                margin-bottom: 16px;
            }
            .bgg-form-group label {
                display: block;
                font-size: 12px;
                font-weight: 700;
                color: #475569;
                margin-bottom: 6px;
            }
            .bgg-input {
                width: 100%;
                border: 1.5px solid #cbd5e1;
                border-radius: 10px;
                padding: 10px 14px;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
                background-color: #fff;
                color: #1e293b;
            }
            .bgg-input:focus {
                border-color: #4f46e5;
                outline: none;
                box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
            }
            .bgg-btn-calc {
                width: 100%;
                background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
                color: white;
                border: none;
                border-radius: 10px;
                padding: 12px;
                font-size: 14px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s;
                box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
                margin-top: 10px;
            }
            .bgg-btn-calc:hover {
                transform: translateY(-1px);
                box-shadow: 0 6px 16px rgba(79, 70, 229, 0.3);
            }
            .bgg-pet-box {
                background: #f0fdf4;
                border: 1.5px solid #bbf7d0;
                border-radius: 12px;
                padding: 16px;
                margin-top: 20px;
            }
            .bgg-pet-title {
                font-weight: 800;
                font-size: 13.5px;
                color: #166534;
                display: flex;
                align-items: center;
                gap: 6px;
                margin: 0;
            }
            .pet-shape-row {
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 8px 12px;
                margin-bottom: 8px;
                box-shadow: 0 1px 2px rgba(0,0,0,0.02);
            }
        `;
        document.head.appendChild(style);
    }

    _bgg.content.innerHTML = `
        <div class="bgg-container">
            <div class="bgg-header">
                <div class="bgg-title-area">
                    <h2>🧮 Báo Giá Vải Thành Phẩm</h2>
                    <p>Hệ thống tự động tra cứu, tối ưu so sánh giá gốc các nguồn vải & chi phí in PET</p>
                </div>
            </div>
            
            <div class="bgg-grid">
                <!-- Column Left: Inputs -->
                <div class="bgg-card">
                    <h3 class="bgg-card-title">⚙️ Thông tin báo giá</h3>
                    
                    <div class="bgg-form-group">
                        <label>Chất liệu *</label>
                        <select id="bgg_material_id" class="bgg-input" onchange="_bggHandleMaterialChange(this.value)">
                            <option value="">-- Chọn chất liệu --</option>
                        </select>
                    </div>
                    
                    <div class="bgg-form-group">
                        <label>Màu sắc *</label>
                        <select id="bgg_color_id" class="bgg-input">
                            <option value="">-- Chọn màu sắc --</option>
                        </select>
                    </div>
                    
                    <div class="bgg-form-group">
                        <label>Phân khúc</label>
                        <select id="bgg_segment" class="bgg-input">
                            <option value="">-- Tất cả phân khúc --</option>
                        </select>
                    </div>
                    
                    <div class="bgg-form-group">
                        <label>Số lượng áo</label>
                        <input type="number" id="bgg_quantity" class="bgg-input" placeholder="Tự điền (tùy chọn)">
                    </div>

                    <!-- PET Section -->
                    <div class="bgg-pet-box">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                            <label class="bgg-pet-title">
                                <input type="checkbox" id="bgg_enable_pet" style="width: 16px; height: 16px; cursor: pointer;" onchange="_bggTogglePetSection(this.checked)">
                                🖨️ Chi phí in PET
                            </label>
                            
                            <div id="bgg_pet_global_settings" style="display: none; align-items: center; gap: 12px; flex-wrap: wrap;">
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span style="font-size: 11px; font-weight: 700; color: #166534;">Giá 58x100:</span>
                                    <input type="number" id="bgg_pet_sheet_price" class="bgg-input" style="width: 85px; padding: 4px 8px; font-size: 12px;" oninput="_bggSavePetConfigs()">
                                </div>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span style="font-size: 11px; font-weight: 700; color: #166534;">K.Cách:</span>
                                    <input type="text" id="bgg_pet_spacing" class="bgg-input" style="width: 55px; padding: 4px 8px; font-size: 12px;" oninput="this.value = this.value.replace(/,/g, '.').replace(/[^0-9.]/g, ''); _bggSavePetConfigs()">
                                </div>
                            </div>
                        </div>
                        
                        <div id="bgg_pet_shapes_container" style="display: none; border-top: 1px dashed #bbf7d0; padding-top: 12px;">
                            <div id="bgg_pet_shapes_rows"></div>
                            <button class="btn btn-sm" style="margin-top: 10px; font-size: 12px; padding: 6px 12px; background: #166534; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;" onclick="_bggAddPetShapeRow()">
                                ➕ Thêm hình in
                            </button>
                        </div>
                    </div>

                    <button class="bgg-btn-calc" onclick="_bggRunCalculation()">🧮 Tính toán & So sánh</button>
                </div>

                <!-- Column Right: Results -->
                <div class="bgg-card" id="bgg_results_card" style="min-height: 300px;">
                    <div style="text-align: center; padding: 80px 20px; color: #94a3b8;">
                        <span style="font-size: 48px; display: block; margin-bottom: 12px;">📊</span>
                        <h4 style="margin: 0; color: #64748b; font-weight: 700;">Chưa có kết quả tính toán</h4>
                        <p style="margin: 6px 0 0 0; font-size: 12px; color: #94a3b8;">Chọn chất liệu, màu sắc và click "Tính toán & So sánh" ở bên trái</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Populate initial inputs
    document.getElementById('bgg_enable_pet').checked = _bgg.petEnabled;
    document.getElementById('bgg_pet_sheet_price').value = _bgg.petSheetPrice;
    document.getElementById('bgg_pet_spacing').value = _bgg.petSpacing;
    _bggTogglePetSection(_bgg.petEnabled);

    await _bggLoadData();
}

async function _bggLoadData() {
    try {
        const [ratioRes, segRes] = await Promise.all([
            apiCall('/api/cutting/ratio-stats', 'GET'),
            apiCall('/api/cutting/size-segments', 'GET')
        ]);
        
        const ratioData = ratioRes.data || ratioRes;
        const segData = segRes.data || segRes;
        _bgg.materials = ratioData.materials || [];
        _bgg.colors = ratioData.colors || [];
        _bgg.sizeSegments = segData.segments || segData.sizeSegments || segRes.segments || [];
        
        // Populate Materials select
        const matSelect = document.getElementById('bgg_material_id');
        if (matSelect) {
            matSelect.innerHTML = '<option value="">-- Chọn chất liệu --</option>' + 
                _bgg.materials.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
        }
        
        // Populate segments
        const segSelect = document.getElementById('bgg_segment');
        if (segSelect) {
            segSelect.innerHTML = '<option value="">-- Tất cả phân khúc --</option>' +
                (_bgg.sizeSegments || []).map(s => `<option value="${s.name}">${s.icon || '🧑'} ${s.name}</option>`).join('');
        }
        
    } catch(err) {
        console.error('Failed to load bgg data:', err);
        if (typeof showToast === 'function') showToast('Không thể tải danh sách chất liệu và màu sắc!', 'error');
    }
}

function _bggLoadPetConfigs() {
    _bgg.petEnabled = localStorage.getItem('tlcg_pet_enabled') === 'true';
    _bgg.petSheetPrice = Number(localStorage.getItem('tlcg_pet_sheet_price')) || 40000;
    const storedSpacing = localStorage.getItem('tlcg_pet_spacing');
    if (storedSpacing === null || storedSpacing === '0.3' || storedSpacing === '3' || storedSpacing === '03') {
        _bgg.petSpacing = 0.4;
        localStorage.setItem('tlcg_pet_spacing', '0.4');
    } else {
        _bgg.petSpacing = Number(storedSpacing);
    }
    _bgg.petCalcMode = localStorage.getItem('tlcg_pet_calc_mode') || 'aligned';
    try {
        const storedShapes = localStorage.getItem('tlcg_pet_shapes');
        if (storedShapes) {
            const parsed = JSON.parse(storedShapes);
            if (Array.isArray(parsed)) {
                const cleaned = parsed.filter(s => {
                    if (!s || typeof s !== 'object') return false;
                    const hasName = s.name && s.name.trim() !== '';
                    const hasWidth = s.width !== '' && s.width !== undefined && s.width !== null && Number(s.width) > 0;
                    const hasHeight = s.height !== '' && s.height !== undefined && s.height !== null && Number(s.height) > 0;
                    return hasName || hasWidth || hasHeight;
                });
                _bgg.petShapes = cleaned;
                if (cleaned.length !== parsed.length) {
                    localStorage.setItem('tlcg_pet_shapes', JSON.stringify(cleaned));
                }
            } else {
                _bgg.petShapes = [];
                localStorage.setItem('tlcg_pet_shapes', JSON.stringify([]));
            }
        } else {
            _bgg.petShapes = [];
        }
    } catch(e) {
        _bgg.petShapes = [];
    }
}

function _bggSavePetConfigs() {
    const enableCb = document.getElementById('bgg_enable_pet');
    if (enableCb) {
        localStorage.setItem('tlcg_pet_enabled', enableCb.checked ? 'true' : 'false');
    }
    const priceInput = document.getElementById('bgg_pet_sheet_price');
    if (priceInput) {
        localStorage.setItem('tlcg_pet_sheet_price', priceInput.value);
    }
    const spacingInput = document.getElementById('bgg_pet_spacing');
    if (spacingInput) {
        localStorage.setItem('tlcg_pet_spacing', spacingInput.value);
    }
    if (Array.isArray(_bgg.petShapes)) {
        const cleanShapes = _bgg.petShapes.filter(s => s && typeof s === 'object');
        localStorage.setItem('tlcg_pet_shapes', JSON.stringify(cleanShapes));
    }
}

function _bggTogglePetSection(enabled) {
    const globalDiv = document.getElementById('bgg_pet_global_settings');
    const containerDiv = document.getElementById('bgg_pet_shapes_container');
    if (globalDiv && containerDiv) {
        globalDiv.style.display = enabled ? 'flex' : 'none';
        containerDiv.style.display = enabled ? 'block' : 'none';
    }
    _bggSavePetConfigs();
    _bggRenderPetShapeRows();
    _bggRenderCalcResults();
}

function _bggRenderPetShapeRows() {
    const list = document.getElementById('bgg_pet_shapes_rows');
    if (!list) return;
    
    if (!Array.isArray(_bgg.petShapes)) {
        _bgg.petShapes = [];
    }
    const shapes = _bgg.petShapes.filter(s => s && typeof s === 'object');
    if (shapes.length === 0) {
        list.innerHTML = `<div style="font-size: 12px; color: #166534; font-style: italic; padding: 4px 0;">Chưa có hình in nào. Vui lòng bấm nút Thêm hình in.</div>`;
        return;
    }
    
    list.innerHTML = shapes.map((s, idx) => `
        <div class="pet-shape-row" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;" data-idx="${idx}">
            <input type="text" class="bgg-input p-name" placeholder="Tên hình (vd: Logo ngực...)" style="flex: 2; min-width: 140px; padding: 6px 10px; font-size: 12px;" value="${s.name || ''}" onchange="_bggUpdatePetShape(${idx}, 'name', this.value)">
            <div style="display: flex; align-items: center; gap: 4px;">
                <input type="text" class="bgg-input p-width" placeholder="Rộng" style="width: 70px; padding: 6px 8px; font-size: 12px;" value="${s.width || ''}" oninput="this.value = this.value.replace(/,/g, '.').replace(/[^0-9.]/g, '')" onchange="_bggUpdatePetShape(${idx}, 'width', this.value)">
                <span style="font-size: 12px; color: #64748b;">x</span>
                <input type="text" class="bgg-input p-height" placeholder="Cao" style="width: 70px; padding: 6px 8px; font-size: 12px;" value="${s.height || ''}" oninput="this.value = this.value.replace(/,/g, '.').replace(/[^0-9.]/g, '')" onchange="_bggUpdatePetShape(${idx}, 'height', this.value)">
                <span style="font-size: 12px; color: #166534; font-weight: 600;">cm</span>
            </div>
            <button class="btn btn-sm" style="background: #fee2e2; color: #ef4444; border: none; padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="_bggRemovePetShapeRow(${idx})">Xóa</button>
        </div>
    `).join('');
}

function _bggAddPetShapeRow() {
    if (!Array.isArray(_bgg.petShapes)) {
        _bgg.petShapes = [];
    }
    _bgg.petShapes = _bgg.petShapes.filter(s => s && typeof s === 'object');
    _bgg.petShapes.push({ name: '', width: '', height: '' });

    _bggRenderPetShapeRows();
    _bggSavePetConfigs();
    _bggRenderCalcResults();
}

function _bggRemovePetShapeRow(idx) {
    if (Array.isArray(_bgg.petShapes)) {
        _bgg.petShapes = _bgg.petShapes.filter(s => s && typeof s === 'object');
        _bgg.petShapes.splice(idx, 1);
        _bggRenderPetShapeRows();
        _bggSavePetConfigs();
        _bggRenderCalcResults();
    }
}

function _bggUpdatePetShape(idx, field, val) {
    if (Array.isArray(_bgg.petShapes)) {
        _bgg.petShapes = _bgg.petShapes.filter(s => s && typeof s === 'object');
        if (_bgg.petShapes[idx]) {
            if (field === 'width' || field === 'height') {
                const cleanVal = String(val).replace(/,/g, '.');
                _bgg.petShapes[idx][field] = cleanVal !== '' ? Number(cleanVal) : '';
            } else {
                _bgg.petShapes[idx][field] = val;
            }
            _bggSavePetConfigs();
            _bggRenderCalcResults();
        }
    }
}

function _bggUpdatePetMode(val) {
    localStorage.setItem('tlcg_pet_calc_mode', val);
    _bggRenderCalcResults();
}

function _bggCalculatePacking(W_sheet, H_sheet, w, h, s) {
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

function _bggGetPetCosts() {
    const enabled = document.getElementById('bgg_enable_pet')?.checked;
    if (!enabled) return { enabled: false, alignedCost: 0, optimizedCost: 0, details: [] };
    
    const shapes = _bgg.petShapes || [];
    const validShapes = shapes.filter(s => Number(s.width) > 0 && Number(s.height) > 0);
    if (validShapes.length === 0) {
        return { enabled: false, alignedCost: 0, optimizedCost: 0, details: [] };
    }
    
    const price = Number(document.getElementById('bgg_pet_sheet_price')?.value) || 0;
    const spacing = Number(document.getElementById('bgg_pet_spacing')?.value) || 0;
    
    let alignedCost = 0;
    let optimizedCost = 0;
    const details = [];
    
    shapes.forEach(s => {
        const w = Number(s.width);
        const h = Number(s.height);
        if (w > 0 && h > 0) {
            const packing = _bggCalculatePacking(58, 100, w, h, spacing);
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

function _bggHandleMaterialChange(matId) {
    const colorSelect = document.getElementById('bgg_color_id');
    const segmentSelect = document.getElementById('bgg_segment');
    if (!colorSelect || !segmentSelect) return;
    
    colorSelect.innerHTML = '<option value="">-- Chọn màu sắc --</option>';
    
    if (!matId) {
        segmentSelect.innerHTML = `
            <option value="">-- Tất cả phân khúc --</option>
            ${(_bgg.sizeSegments || []).map(s => `<option value="${s.name}">${s.icon || '🧑'} ${s.name}</option>`).join('')}
        `;
        return;
    }

    const filteredColors = _bgg.colors.filter(c => String(c.material_id) === String(matId));
    filteredColors.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.color_name;
        colorSelect.appendChild(opt);
    });

    const mat = _bgg.materials.find(m => m.id === Number(matId));
    const activeSegs = _bggGetActiveSegmentsForMaterial(mat);
    segmentSelect.innerHTML = `
        <option value="">-- Tất cả phân khúc --</option>
        ${activeSegs.map(seg => {
            const segObj = (_bgg.sizeSegments || []).find(s => s.name === seg);
            const icon = segObj && segObj.icon ? segObj.icon : '🧑';
            return `<option value="${seg}">${icon} ${seg}</option>`;
        }).join('')}
    `;
}

function _bggGetActiveSegmentsForMaterial(mat) {
    if (mat && mat.active_segments) {
        try {
            const parsed = JSON.parse(mat.active_segments);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const globalNames = (_bgg.sizeSegments || []).map(s => s.name);
                return parsed.filter(name => globalNames.includes(name));
            }
        } catch(e) {
            console.error('Error parsing active segments:', e);
        }
    }
    const defaultBase = ['Người Lớn', 'Tiểu Học', 'Mầm Non', 'Oversize'];
    const globalNames = (_bgg.sizeSegments || []).map(s => s.name);
    return defaultBase.filter(name => globalNames.includes(name));
}

async function _bggRunCalculation() {
    const matId = document.getElementById('bgg_material_id').value;
    const colorId = document.getElementById('bgg_color_id').value;
    const segment = document.getElementById('bgg_segment').value;
    const qty = document.getElementById('bgg_quantity').value;

    if (!matId || !colorId) {
        if (typeof showToast === 'function') showToast('Vui lòng chọn đầy đủ chất liệu và màu sắc!', 'error');
        return;
    }

    const petEnabled = document.getElementById('bgg_enable_pet')?.checked;
    if (petEnabled) {
        const shapes = _bgg.petShapes || [];
        if (shapes.length === 0) {
            if (typeof showToast === 'function') showToast('Vui lòng thêm ít nhất một hình in PET!', 'error');
            return;
        }
        
        let hasInvalidShape = false;
        for (const s of shapes) {
            const w = Number(s.width);
            const h = Number(s.height);
            if (!s.name || isNaN(w) || w <= 0 || isNaN(h) || h <= 0) {
                hasInvalidShape = true;
                break;
            }
        }
        
        if (hasInvalidShape) {
            if (typeof showToast === 'function') showToast('Vui lòng điền đầy đủ tên và kích thước (> 0) cho tất cả hình in PET!', 'error');
            return;
        }
    }

    const resultsCard = document.getElementById('bgg_results_card');
    resultsCard.innerHTML = '<div style="text-align: center; padding: 80px 20px; color: #64748b; font-weight: 600; font-size: 14px;">⏳ Đang tính toán và tối ưu so sánh dữ liệu...</div>';

    try {
        const payload = {
            material_id: Number(matId),
            fabric_color_id: Number(colorId)
        };
        if (segment) payload.size_segment = segment;
        if (qty !== '') payload.quantity = Number(qty);

        const res = await apiCall('/api/pricing/calculate', 'POST', payload);
        if (!res.success) {
            resultsCard.innerHTML = `<div style="padding: 16px; background: #fee2e2; color: #b91c1c; border-radius: 8px; font-weight: 600;">❌ Lỗi: ${res.error || 'Có lỗi xảy ra'}</div>`;
            return;
        }

        _bgg.lastCalcResponse = res;
        _bgg.selectedCalcSupplierId = 'all';

        _bggRenderCalcResults();
    } catch (err) {
        console.error('[BGG Run calculation error]', err);
        resultsCard.innerHTML = `<div style="padding: 16px; background: #fee2e2; color: #b91c1c; border-radius: 8px; font-weight: 600;">❌ Lỗi: ${err.message}</div>`;
    }
}

function _bggSelectCalcSupplier(supplierId) {
    _bgg.selectedCalcSupplierId = String(supplierId);
    _bggRenderCalcResults();
}

function _bggRenderCalcResults() {
    const res = _bgg.lastCalcResponse;
    const resultsCard = document.getElementById('bgg_results_card');
    if (!res || !resultsCard) return;

    const selectedId = _bgg.selectedCalcSupplierId || 'all';
    const petInfo = _bggGetPetCosts();
    const petCost = petInfo.enabled ? (localStorage.getItem('tlcg_pet_calc_mode') === 'optimized' ? petInfo.optimizedCost : petInfo.alignedCost) : 0;

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

    // Render PET Print summary
    if (petInfo.enabled) {
        const selectedMode = localStorage.getItem('tlcg_pet_calc_mode') || 'aligned';
        html += `
            <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 12px; padding: 14px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <div style="font-size: 13px; font-weight: 800; color: #166534; text-transform: uppercase; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                    🖨️ Chi phí in PET dự kiến (cho 1 áo)
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
                    <label style="background: white; border: 1.5px solid ${selectedMode === 'aligned' ? '#166534' : '#e2e8f0'}; border-radius: 8px; padding: 10px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); margin: 0;">
                        <input type="radio" name="bgg_pet_calc_mode" value="aligned" ${selectedMode === 'aligned' ? 'checked' : ''} onchange="_bggUpdatePetMode(this.value)">
                        <div>
                            <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Xếp Thẳng Hàng (Dễ Cắt)</div>
                            <div style="font-size: 15px; font-weight: 800; color: #166534;">${Number(petInfo.alignedCost).toLocaleString('vi-VN')} đ / áo</div>
                        </div>
                    </label>
                    <label style="background: white; border: 1.5px solid ${selectedMode === 'optimized' ? '#166534' : '#e2e8f0'}; border-radius: 8px; padding: 10px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); margin: 0;">
                        <input type="radio" name="bgg_pet_calc_mode" value="optimized" ${selectedMode === 'optimized' ? 'checked' : ''} onchange="_bggUpdatePetMode(this.value)">
                        <div>
                            <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Xếp Tối Ưu (Tiết Kiệm)</div>
                            <div style="font-size: 15px; font-weight: 800; color: #166534;">${Number(petInfo.optimizedCost).toLocaleString('vi-VN')} đ / áo</div>
                        </div>
                    </label>
                </div>
                <div style="font-size: 11.5px; color: #166534; font-weight: 500; margin-top: 12px; border-top: 1px dashed #bbf7d0; padding-top: 8px; line-height: 1.6;">
                    ${petInfo.details.map((d, i) => `
                        <div>
                            <strong>• ${d.name || `Hình in ${i+1}`}</strong> (${d.width}x${d.height}cm): 
                            Thẳng hàng: <strong>${d.packing.aligned}</strong> hình/khổ (${Math.round(d.aCost).toLocaleString('vi-VN')}đ) | 
                            Tối ưu: <strong>${d.packing.optimized}</strong> hình/khổ (${Math.round(d.oCost).toLocaleString('vi-VN')}đ)
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // 1. Supplier Base Prices Table
    html += `
        <div style="margin-bottom: 24px;">
            <h5 style="margin: 0 0 12px 0; font-size: 13.5px; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 6px;">
                🏢 ĐƠN GIÁ NHẬP VẢI GỐC CÁC NGUỒN
            </h5>
            <div style="overflow-x: auto; border: 1.5px solid #e2e8f0; border-radius: 10px;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                    <thead>
                        <tr>
                            <th style="padding: 10px 12px; font-weight: 700; background: #0f172a !important; color: #ffffff !important; width: 50px; text-align: center;">Chọn</th>
                            <th style="padding: 10px 12px; font-weight: 700; background: #0f172a !important; color: #ffffff !important;">Nhà cung cấp (Nguồn nhập)</th>
                            <th style="padding: 10px 12px; font-weight: 700; background: #0f172a !important; color: #ffffff !important; text-align: right;">Giá Vải Gốc</th>
                            <th style="padding: 10px 12px; font-weight: 700; background: #0f172a !important; color: #ffffff !important; text-align: right;">Giá Thành Phẩm</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    if (res.suppliers && res.suppliers.length > 0) {
        html += `
            <tr style="border-bottom: 1px solid #f1f5f9; background: ${selectedId === 'all' ? '#f0f9ff' : 'transparent'}; cursor: pointer;" onclick="_bggSelectCalcSupplier('all')">
                <td style="padding: 10px 12px; text-align: center;">
                    <input type="radio" name="bgg_supplier_radio" value="all" ${selectedId === 'all' ? 'checked' : ''} style="cursor: pointer;" onclick="event.stopPropagation(); _bggSelectCalcSupplier('all')">
                </td>
                <td style="padding: 10px 12px; font-weight: 700; color: #4f46e5;">🏆 Tất cả (Tự động so sánh rẻ nhất)</td>
                <td style="padding: 10px 12px; text-align: right; font-weight: 600; color: #64748b; font-style: italic;">So sánh tối ưu</td>
                <td style="padding: 10px 12px; text-align: right; font-weight: 500; color: #94a3b8;">—</td>
            </tr>
        `;

        res.suppliers.forEach(s => {
            const isChecked = selectedId === String(s.source_id);
            let priceTexts = [];
            if (res.calculations && res.calculations.length > 0) {
                res.calculations.forEach(calc => {
                    const rangeCalc = calc.range_calcs && calc.range_calcs.length > 0 ? calc.range_calcs[0] : null;
                    const hasQty = res.quantity !== null && res.quantity > 0;
                    const price = (hasQty && rangeCalc && rangeCalc.range_prices[s.source_id])
                        ? rangeCalc.range_prices[s.source_id]
                        : calc.overall_prices[s.source_id];
                    if (price) {
                        const finalPrice = Number(price) + petCost;
                        const cleanSeg = (calc.segment || '').trim();
                        let color = '#2563eb';
                        if (cleanSeg === 'Người Lớn') color = '#2563eb';
                        else if (cleanSeg === 'Mầm Non') color = '#db2777';
                        else if (cleanSeg === 'Tiểu Học') color = '#059669';
                        else if (cleanSeg === 'Oversize') color = '#ea580c';
                        else {
                            const hash = cleanSeg.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                            const colors = ['#2563eb', '#059669', '#db2777', '#ea580c', '#4f46e5', '#a855f7', '#06b6d4'];
                            color = colors[hash % colors.length];
                        }

                        if (res.calculations.length > 1) {
                            priceTexts.push(`<span style="color: ${color}; font-weight: 700;">${calc.segment}: ${Number(finalPrice).toLocaleString('vi-VN')} đ</span>`);
                        } else {
                            priceTexts.push(`<span style="color: ${color}; font-weight: 700;">${Number(finalPrice).toLocaleString('vi-VN')} đ</span>`);
                        }
                    }
                });
            }
            const priceDisplay = priceTexts.length > 0 ? priceTexts.join('<br>') : '—';

            html += `
                <tr style="border-bottom: 1px solid #f1f5f9; background: ${isChecked ? '#f0f9ff' : 'transparent'}; cursor: pointer;" onclick="_bggSelectCalcSupplier('${s.source_id}')">
                    <td style="padding: 10px 12px; text-align: center;">
                        <input type="radio" name="bgg_supplier_radio" value="${s.source_id}" ${isChecked ? 'checked' : ''} style="cursor: pointer;" onclick="event.stopPropagation(); _bggSelectCalcSupplier('${s.source_id}')">
                    </td>
                    <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">${s.source_name}</td>
                    <td style="padding: 10px 12px; text-align: right; font-weight: 800; color: #4f46e5;">${Number(s.price).toLocaleString('vi-VN')} đ / ${res.unit}</td>
                    <td style="padding: 10px 12px; text-align: right; font-weight: 800; color: #1e293b; font-size: 13px;">${priceDisplay}</td>
                </tr>
            `;
        });
    } else {
        html += `
            <tr>
                <td colspan="4" style="padding: 16px; text-align: center; color: #64748b; font-style: italic;">Chưa có giá nhập gốc nào được duyệt cho màu này.</td>
            </tr>
        `;
    }

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // 2. Calculations
    html += `
        <h5 style="margin: 0 0 12px 0; font-size: 13.5px; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 6px; text-transform: uppercase;">
            📊 CHI TIẾT GIÁ THÀNH PHẨM SO SÁNH
        </h5>
    `;

    if (res.calculations && res.calculations.length > 0) {
        res.calculations.forEach((calc, calcIndex) => {
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

            const rangeSupplierPrices = [];
            if (rangeCalc) {
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
            }

            let subCardsHtml = '';
            if (hasQty && rangeCalc) {
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
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
                        <!-- Column 1: Range Specific -->
                        <div style="background: ${rangeBg}; border: 1.5px solid ${rangeBorder}; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
                            <div>
                                <div style="font-size: 11.5px; font-weight: 800; color: ${rangeText}; text-transform: uppercase; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
                                    📦 Theo Khung Số Lượng [${rangeCalc.range_label}]
                                </div>
                                <div style="font-size: 18px; font-weight: 900; color: ${rangeSub}; margin-bottom: 6px;">
                                    ${rangeCalc.range_ratio ? rangeCalc.range_ratio.toFixed(2) + ' sp/' + res.unit : 'Chưa có dữ liệu'}
                                </div>
                                ${rangeKgNeeded ? `
                                    <div style="font-size: 12px; color: ${rangeSub}; font-weight: 600; margin-bottom: 8px;">
                                        ⚖️ Số kg vải dự kiến: <strong style="font-size: 13.5px; color: ${rangeText};">${rangeKgNeeded} kg</strong>
                                    </div>
                                ` : ''}
                            </div>
                            ${rangeHasData ? `
                                <div style="font-size: 12px; border-top: 1px dashed ${rangeBorder}; padding-top: 8px; margin-top: 8px; line-height: 1.5;">
                                    ${rangeSupplierPrices.map((sp, idx) => {
                                        const isSelected = selectedId === 'all' || selectedId === String(sp.source_id);
                                        const styles = getRankStyles(idx);
                                        const finalNameColor = isSelected ? styles.nameColor : '#64748b';
                                        const finalPriceColor = isSelected ? styles.priceColor : '#64748b';
                                        const finalWeight = isSelected ? styles.fontWeight : 'normal';
                                        return `
                                            <div style="display: flex; justify-content: space-between; align-items: center; font-weight: ${finalWeight}; padding: 2px 0;">
                                                <span style="color: ${finalNameColor}; font-weight: 600;">${styles.icon}${sp.source_name}</span>
                                                <span style="color: ${finalPriceColor}; font-weight: 800;">
                                                    ${Number(sp.price + petCost).toLocaleString('vi-VN')} đ / áo
                                                </span>
                                            </div>
                                        `;
                                    }).join('')}
                                    ${selectedId !== 'all' && activeCheapestRange ? `
                                        <div style="font-size: 13px; font-weight: 800; color: ${rangeText}; margin-top: 6px; background: #dbeafe; padding: 4px 8px; border-radius: 6px; display: inline-block;">
                                            💰 Tổng tiền: ${Math.round((activeCheapestRange.price + petCost) * res.quantity).toLocaleString('vi-VN')} đ
                                        </div>
                                    ` : selectedId === 'all' && rangeSupplierPrices.length > 0 ? `
                                        <div style="font-size: 13px; font-weight: 800; color: ${rangeText}; margin-top: 6px; background: #dbeafe; padding: 4px 8px; border-radius: 6px; display: inline-block;">
                                            💰 Tổng tiền (tối ưu): ${Math.round((rangeSupplierPrices[0].price + petCost) * res.quantity).toLocaleString('vi-VN')} đ
                                        </div>
                                    ` : ''}
                                </div>
                            ` : `<div style="font-size: 12px; color: ${rangeSub}; font-style: italic; border-top: 1px dashed ${rangeBorder}; padding-top: 8px; margin-top: 8px;">Không có thực tế cho khung này</div>`}
                        </div>

                        <!-- Column 2: Overall -->
                        <div style="background: ${overallBg}; border: 1.5px solid ${overallBorder}; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
                            <div>
                                <div style="font-size: 11.5px; font-weight: 800; color: ${overallText}; text-transform: uppercase; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
                                    📊 Trung Bình Toàn Chất Liệu
                                </div>
                                <div style="font-size: 18px; font-weight: 900; color: ${overallSub}; margin-bottom: 6px;">
                                    ${calc.overall_ratio ? calc.overall_ratio.toFixed(2) + ' sp/' + res.unit : 'Chưa có dữ liệu'}
                                </div>
                                ${overallKgNeeded ? `
                                    <div style="font-size: 12px; color: ${overallSub}; font-weight: 600; margin-bottom: 8px;">
                                        ⚖️ Số kg vải dự kiến: <strong style="font-size: 13.5px; color: ${overallText};">${overallKgNeeded} kg</strong>
                                    </div>
                                ` : ''}
                            </div>
                            ${overallHasData ? `
                                <div style="font-size: 12px; border-top: 1px dashed ${overallBorder}; padding-top: 8px; margin-top: 8px; line-height: 1.5;">
                                    ${overallSupplierPrices.map((sp, idx) => {
                                        const isSelected = selectedId === 'all' || selectedId === String(sp.source_id);
                                        const styles = getRankStyles(idx);
                                        const finalNameColor = isSelected ? styles.nameColor : '#64748b';
                                        const finalPriceColor = isSelected ? styles.priceColor : '#64748b';
                                        const finalWeight = isSelected ? styles.fontWeight : 'normal';
                                        return `
                                            <div style="display: flex; justify-content: space-between; align-items: center; font-weight: ${finalWeight}; padding: 2px 0;">
                                                <span style="color: ${finalNameColor}; font-weight: 600;">${styles.icon}${sp.source_name}</span>
                                                <span style="color: ${finalPriceColor}; font-weight: 800;">
                                                    ${Number(sp.price + petCost).toLocaleString('vi-VN')} đ / áo
                                                </span>
                                            </div>
                                        `;
                                    }).join('')}
                                    ${selectedId !== 'all' && activeCheapestOverall ? `
                                        <div style="font-size: 13px; font-weight: 800; color: ${overallText}; margin-top: 6px; background: #d1fae5; padding: 4px 8px; border-radius: 6px; display: inline-block;">
                                            💰 Tổng tiền: ${Math.round((activeCheapestOverall.price + petCost) * res.quantity).toLocaleString('vi-VN')} đ
                                        </div>
                                    ` : selectedId === 'all' && overallSupplierPrices.length > 0 ? `
                                        <div style="font-size: 13px; font-weight: 800; color: ${overallText}; margin-top: 6px; background: #d1fae5; padding: 4px 8px; border-radius: 6px; display: inline-block;">
                                            💰 Tổng tiền (tối ưu): ${Math.round((overallSupplierPrices[0].price + petCost) * res.quantity).toLocaleString('vi-VN')} đ
                                        </div>
                                    ` : ''}
                                </div>
                            ` : `<div style="font-size: 12px; color: ${overallSub}; font-style: italic; border-top: 1px dashed ${overallBorder}; padding-top: 8px; margin-top: 8px;">Không có thực tế toàn chất liệu</div>`}
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
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <div style="background: ${ovBg}; border: 1px solid ${ovBorder}; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                            <div>
                                <div style="font-size: 11px; font-weight: 800; color: ${ovLabelText}; text-transform: uppercase;">📊 Trung Bình Toàn Chất Liệu</div>
                                <div style="font-size: 16px; font-weight: 900; color: ${ovText};">
                                    ${calc.overall_ratio ? calc.overall_ratio.toFixed(2) + ' sp/' + res.unit : 'Chưa có dữ liệu'}
                                </div>
                            </div>
                            ${overallHasData ? `
                                <div style="text-align: right; line-height: 1.5; font-size: 12.5px;">
                                    ${overallSupplierPrices.map((sp, idx) => {
                                        const isSelected = selectedId === 'all' || selectedId === String(sp.source_id);
                                        const styles = getRankStyles(idx);
                                        const finalNameColor = isSelected ? styles.nameColor : '#64748b';
                                        const finalPriceColor = isSelected ? styles.priceColor : '#64748b';
                                        const finalWeight = isSelected ? styles.fontWeight : 'normal';
                                        return `
                                            <div style="font-weight: ${finalWeight};">
                                                <span style="color: ${finalNameColor}; font-weight: 600;">${styles.icon}${sp.source_name}:</span>
                                                <strong style="color: ${finalPriceColor}; font-weight: 800;">${Number(sp.price + petCost).toLocaleString('vi-VN')} đ / áo</strong>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            ` : `<div style="font-size: 12px; color: ${ovLabelText}; font-style: italic;">Không có thực tế toàn chất liệu</div>`}
                        </div>
                    </div>
                `;
            }

            const cleanSeg = (calc.segment || '').trim();
            let segColor = '#4f46e5';
            if (cleanSeg === 'Người Lớn') segColor = '#2563eb';
            else if (cleanSeg === 'Mầm Non') segColor = '#db2777';
            else if (cleanSeg === 'Tiểu Học') segColor = '#059669';
            else if (cleanSeg === 'Oversize') segColor = '#ea580c';

            html += `
                <div style="border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 12px;">
                        <span style="font-size: 14px; font-weight: 800; color: ${segColor}; display: flex; align-items: center; gap: 6px;">
                            🏷️ Phân khúc: ${calc.segment}
                        </span>
                        ${res.quantity !== null ? `<span style="font-size: 12px; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 4px 10px; border-radius: 20px;">SL: ${res.quantity} áo</span>` : ''}
                    </div>
                    ${subCardsHtml}
                </div>
            `;
        });
    } else {
        html += `<div style="padding: 20px; text-align: center; color: #64748b; font-style: italic;">Không tìm thấy dữ liệu tính toán định lượng sản xuất thực tế.</div>`;
    }

    resultsCard.innerHTML = html;
}
