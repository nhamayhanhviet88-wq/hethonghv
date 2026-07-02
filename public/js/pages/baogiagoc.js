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
    selectedCalcSupplierId: 'all',
    print3dEnabled: false,
    print3dSupplier: '',
    print3dCost: 0,
    screenEnabled: false,
    screenSupplier: '',
    screenColors: '',
    embroideryEnabled: false,
    embroideryCost: '',
    manuallySelected3dSupplier: false,
    lastQty: 0
};

var _BGG_3D_SUPPLIERS = [];

var _BGG_SCREEN_SUPPLIERS = [
    { key: 'thien_linh_screen', name: 'In Lưới Thiện Linh', icon: '🎨' },
    { key: 'phuong_tc_screen', name: 'In Lưới Phượng TC', icon: '🎨' },
    { key: 'truong_thinh_screen', name: 'In Lưới Trường Thịnh', icon: '🎨' }
];

async function renderBaogiagocPage(content) {
    _bgg.content = content;
    
    // Read cached configs from localstorage
    _bggLoadPetConfigs();
    
    const isDirector = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';
    
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
            .btn-suggestion {
                background: #f1f5f9;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                padding: 4px 8px;
                font-size: 11.5px;
                font-weight: 600;
                color: #475569;
                cursor: pointer;
                transition: all 0.2s;
            }
            .btn-suggestion:hover {
                background: #e2e8f0;
                border-color: #94a3b8;
                color: #1e293b;
            }
            .btn-suggestion.active {
                background: #e0e7ff;
                border-color: #6366f1;
                color: #4f46e5;
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
                ${isDirector ? `
                    <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                        <button class="bgg-btn-calc" onclick="_bggNavigateToGiaGoc('Tem')" style="width: auto; margin-top: 0; display: flex; align-items: center; gap: 6px; padding: 10px 16px; font-weight: 700; border-radius: 10px; background: linear-gradient(135deg, #059669 0%, #047857 100%); border: none; color: white; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(5,150,105,0.2);">
                            🏷️ Giá Gốc Tem
                        </button>
                        <button class="bgg-btn-calc" onclick="_bggNavigateToGiaGoc('Pet')" style="width: auto; margin-top: 0; display: flex; align-items: center; gap: 6px; padding: 10px 16px; font-weight: 700; border-radius: 10px; background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); border: none; color: white; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(234,88,12,0.2);">
                            🏷️ Giá Gốc Pet
                        </button>
                        <button class="bgg-btn-calc" onclick="_bggOpenSetupModal()" style="width: auto; margin-top: 0; display: flex; align-items: center; gap: 6px; padding: 10px 16px; font-weight: 700; border-radius: 10px; background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); border: none; color: white; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(79,70,229,0.2);">
                            ⚙️ Setup Chi Phí & Gợi Ý
                        </button>
                    </div>
                ` : ''}
            </div>
            
            <div class="bgg-grid">
                <!-- Column Left: Inputs -->
                <div class="bgg-card">
                    <h3 class="bgg-card-title">⚙️ Thông tin báo giá</h3>
                    
                    <div class="bgg-form-group">
                        <label>Chất liệu *</label>
                        <div style="position: relative;" id="bgg_material_autocomplete_container">
                            <input type="text" id="bgg_material_search" class="bgg-input" placeholder="Gõ để tìm chất liệu..." autocomplete="off" onfocus="_bggShowMaterialDropdown()" oninput="_bggFilterMaterials(this.value)" onblur="_bggValidateMaterialSearch()">
                            <input type="hidden" id="bgg_material_id" value="">
                            <div id="bgg_material_dropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1.5px solid #cbd5e1; border-radius: 10px; max-height: 250px; overflow-y: auto; z-index: 1000; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); margin-top: 4px;"></div>
                        </div>
                    </div>
                    
                    <div class="bgg-form-group">
                        <label>Màu sắc</label>
                        <div style="position: relative;" id="bgg_color_autocomplete_container">
                            <input type="text" id="bgg_color_search" class="bgg-input" placeholder="Gõ để tìm màu sắc..." autocomplete="off" onfocus="_bggShowColorDropdown()" oninput="_bggFilterColors(this.value)" onblur="_bggValidateColorSearch()">
                            <input type="hidden" id="bgg_color_id" value="">
                            <div id="bgg_color_dropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1.5px solid #cbd5e1; border-radius: 10px; max-height: 250px; overflow-y: auto; z-index: 1000; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); margin-top: 4px;"></div>
                        </div>
                    </div>
                    
                    <div class="bgg-form-group">
                        <label>Phân khúc</label>
                        <select id="bgg_segment" class="bgg-input">
                            <option value="">-- Tất cả phân khúc --</option>
                        </select>
                    </div>
                    
                    <div class="bgg-form-group">
                        <label>Số lượng áo</label>
                        <input type="number" id="bgg_quantity" class="bgg-input" placeholder="Tự điền (tùy chọn)" oninput="_bggRender3dSupplierDisplay(); _bggRenderScreenSupplierDisplay(); _bggRenderCalcResults();">
                    </div>
                    
                    <div class="bgg-form-group">
                        <label>Chi phí may (đ)</label>
                        <input type="number" id="bgg_sewing_cost" class="bgg-input" placeholder="Tự điền giá may (đ)" style="margin-bottom: 6px;" oninput="_bggRenderCalcResults()">
                        <div id="bgg_sewing_presets_container" style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <!-- Dynamically populated -->
                        </div>
                    </div>
                    
                    <div class="bgg-form-group">
                        <label>Chi phí cổ bẻ (nếu có) (đ)</label>
                        <input type="number" id="bgg_collar_cost" class="bgg-input" placeholder="Tự điền giá cổ bẻ (đ)" style="margin-bottom: 6px;" oninput="_bggRenderCalcResults()">
                        <div id="bgg_collar_presets_container" style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <!-- Dynamically populated -->
                        </div>
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
                                    <input type="number" id="bgg_pet_sheet_price" class="bgg-input" style="width: 85px; padding: 4px 8px; font-size: 12px;" oninput="_bggSavePetConfigs()" ${isDirector ? '' : 'disabled'}>
                                </div>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span style="font-size: 11px; font-weight: 700; color: #166534;">K.Cách:</span>
                                    <input type="text" id="bgg_pet_spacing" class="bgg-input" style="width: 55px; padding: 4px 8px; font-size: 12px;" oninput="this.value = this.value.replace(/,/g, '.').replace(/[^0-9.]/g, ''); _bggSavePetConfigs()" ${isDirector ? '' : 'disabled'}>
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

                    <!-- 3D Printing Section -->
                    <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 12px; padding: 16px; margin-top: 12px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                            <label style="font-weight: 800; font-size: 13.5px; color: #1e40af; display: flex; align-items: center; gap: 6px; margin: 0; cursor: pointer;">
                                <input type="checkbox" id="bgg_enable_3d" style="width: 16px; height: 16px; cursor: pointer;" onchange="_bggToggle3dSection(this.checked)">
                                🎨 Chi phí in 3D
                            </label>
                            <button id="bgg_setup_3d_btn" style="display: none; background: #dbeafe; border: 1px solid #93c5fd; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 700; color: #1e40af; cursor: pointer; transition: all 0.2s;" onclick="_bggOpenSetup3dModal()">⚙️ Setup in 3D</button>
                        </div>
                        <div id="bgg_3d_info" style="display: none; margin-top: 10px; border-top: 1px dashed #bfdbfe; padding-top: 10px;">
                            <div id="bgg_3d_supplier_display"></div>
                        </div>
                    </div>

                    <!-- Screen Printing Section -->
                    <div style="background: #fdf2f8; border: 1.5px solid #fbcfe8; border-radius: 12px; padding: 16px; margin-top: 12px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                            <label style="font-weight: 800; font-size: 13.5px; color: #9d174d; display: flex; align-items: center; gap: 6px; margin: 0; cursor: pointer;">
                                <input type="checkbox" id="bgg_enable_screen" style="width: 16px; height: 16px; cursor: pointer;" onchange="_bggToggleScreenSection(this.checked)">
                                🎨 Chi phí in Lưới
                            </label>
                            <button id="bgg_setup_screen_btn" style="display: none; background: #fce7f3; border: 1px solid #fbcfe8; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 700; color: #9d174d; cursor: pointer; transition: all 0.2s;" onclick="_bggOpenSetupScreenModal()">⚙️ Setup in Lưới</button>
                        </div>
                        <div id="bgg_screen_info" style="display: none; margin-top: 10px; border-top: 1px dashed #fbcfe8; padding-top: 10px;">
                            <div id="bgg_screen_supplier_display" style="margin-bottom: 8px;"></div>
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">Số màu in</label>
                                <input type="number" id="bgg_screen_colors" class="bgg-input" placeholder="Nhập số màu" oninput="_bggSaveScreenConfigs(); _bggRenderScreenSupplierDisplay(); _bggRenderCalcResults();" min="1" style="width: 100%;">
                            </div>
                        </div>
                    </div>

                    <!-- Embroidery Section -->
                    <div style="background: #faf5ff; border: 1.5px solid #e9d5ff; border-radius: 12px; padding: 16px; margin-top: 12px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                            <label style="font-weight: 800; font-size: 13.5px; color: #6b21a8; display: flex; align-items: center; gap: 6px; margin: 0; cursor: pointer;">
                                <input type="checkbox" id="bgg_enable_embroidery" style="width: 16px; height: 16px; cursor: pointer;" onchange="_bggToggleEmbroiderySection(this.checked)">
                                🪡 Chi phí thêu
                            </label>
                        </div>
                        <div id="bgg_embroidery_info" style="display: none; margin-top: 10px; border-top: 1px dashed #e9d5ff; padding-top: 10px;">
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">Giá tiền thêu (đ/áo)</label>
                                <input type="number" id="bgg_embroidery_cost" class="bgg-input" placeholder="Nhập giá tiền thêu" oninput="_bggSaveEmbroideryConfigs(); _bggRenderCalcResults();" min="0" style="width: 100%;">
                            </div>
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
    const enable3dCb = document.getElementById('bgg_enable_3d');
    if (enable3dCb) enable3dCb.checked = _bgg.print3dEnabled;
    _bggToggle3dSection(_bgg.print3dEnabled);
    const enableScreenCb = document.getElementById('bgg_enable_screen');
    if (enableScreenCb) enableScreenCb.checked = _bgg.screenEnabled;
    _bggToggleScreenSection(_bgg.screenEnabled);
    const enableEmbroideryCb = document.getElementById('bgg_enable_embroidery');
    if (enableEmbroideryCb) enableEmbroideryCb.checked = _bgg.embroideryEnabled;
    _bggToggleEmbroiderySection(_bgg.embroideryEnabled);
    _bggRenderPresetsOnForm();

    const bggSewingInput = document.getElementById('bgg_sewing_cost');
    if (bggSewingInput) {
        bggSewingInput.addEventListener('input', () => _bggCheckAndShowSaveSuggestion('sewing'));
    }
    const bggCollarInput = document.getElementById('bgg_collar_cost');
    if (bggCollarInput) {
        bggCollarInput.addEventListener('input', () => _bggCheckAndShowSaveSuggestion('collar'));
    }

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
        
        // Clear autocomplete input on reload
        const matSearchInput = document.getElementById('bgg_material_search');
        const matHiddenInput = document.getElementById('bgg_material_id');
        if (matSearchInput) matSearchInput.value = '';
        if (matHiddenInput) matHiddenInput.value = '';
        const colSearchInput = document.getElementById('bgg_color_search');
        const colHiddenInput = document.getElementById('bgg_color_id');
        if (colSearchInput) colSearchInput.value = '';
        if (colHiddenInput) colHiddenInput.value = '';
        
        // Populate segments
        const segSelect = document.getElementById('bgg_segment');
        if (segSelect) {
            segSelect.innerHTML = '<option value="">-- Tất cả phân khúc --</option>' +
                (_bgg.sizeSegments || []).map(s => `<option value="${s.name}">${s.icon || '🧑'} ${s.name}</option>`).join('');
        }

        // Load dynamic screen suppliers from print areas & staff configuration
        await _bggLoadDynamicScreenSuppliers();
        _bggRenderScreenSupplierDisplay();

        // Load dynamic 3D suppliers from print areas & staff configuration
        await _bggLoadDynamic3DSuppliers();
        _bggRender3dSupplierDisplay();
        
    } catch(err) {
        console.error('Failed to load bgg data:', err);
        if (typeof showToast === 'function') showToast('Không thể tải danh sách chất liệu và màu sắc!', 'error');
    }
}

async function _bggLoadDynamicScreenSuppliers() {
    try {
        const fieldsRes = await apiCall('/api/printing/fields');
        const fields = fieldsRes.fields || [];
        const screenField = fields.find(f => {
            const name = (f.name || '').toLowerCase();
            return name.includes('lưới') || name.includes('luoi');
        });
        if (screenField) {
            const opsRes = await apiCall(`/api/printing/fields/${screenField.id}/operators`);
            const staff = opsRes.staff || [];
            const contractors = opsRes.contractors || [];
            const assigned = opsRes.assigned || [];
            
            const dynamicSuppliers = [];
            assigned.forEach(ass => {
                if (ass.operator_type === 'user') {
                    const u = staff.find(s => s.id === ass.operator_id);
                    if (u) {
                        dynamicSuppliers.push({
                            key: 'user_' + u.id,
                            name: u.full_name,
                            icon: '👤'
                        });
                    }
                } else if (ass.operator_type === 'contractor') {
                    const c = contractors.find(con => con.id === ass.operator_id);
                    if (c) {
                        dynamicSuppliers.push({
                            key: 'contractor_' + c.id,
                            name: c.name,
                            icon: '🎨'
                        });
                    }
                }
            });
            _BGG_SCREEN_SUPPLIERS = dynamicSuppliers;
        } else {
            _BGG_SCREEN_SUPPLIERS = [];
        }
    } catch (e) {
        console.error('Failed to load dynamic screen suppliers:', e);
    }
}

async function _bggLoadDynamic3DSuppliers() {
    try {
        const fieldsRes = await apiCall('/api/printing/fields');
        const fields = fieldsRes.fields || [];
        const fields3D = fields.filter(f => {
            const name = (f.name || '').toLowerCase();
            return name.includes('3d');
        });
        
        if (fields3D.length > 0) {
            const dynamicSuppliers = [];
            const seenKeys = new Set();
            
            // Fetch operators for all 3D fields
            const opsPromises = fields3D.map(f => apiCall(`/api/printing/fields/${f.id}/operators`));
            const opsResponses = await Promise.all(opsPromises);
            
            opsResponses.forEach(opsRes => {
                const staff = opsRes.staff || [];
                const contractors = opsRes.contractors || [];
                const assigned = opsRes.assigned || [];
                
                assigned.forEach(ass => {
                    let supplier = null;
                    if (ass.operator_type === 'user') {
                        const u = staff.find(s => s.id === ass.operator_id);
                        if (u) {
                            supplier = {
                                key: 'user_' + u.id,
                                name: u.full_name,
                                icon: '👤'
                            };
                        }
                    } else if (ass.operator_type === 'contractor') {
                        const c = contractors.find(con => con.id === ass.operator_id);
                        if (c) {
                            supplier = {
                                key: 'contractor_' + c.id,
                                name: c.name,
                                icon: '🏭'
                            };
                        }
                    }
                    if (supplier && !seenKeys.has(supplier.key)) {
                        seenKeys.add(supplier.key);
                        dynamicSuppliers.push(supplier);
                    }
                });
            });
            _BGG_3D_SUPPLIERS = dynamicSuppliers;
        } else {
            _BGG_3D_SUPPLIERS = [];
        }
    } catch (e) {
        console.error('Failed to load dynamic 3D suppliers:', e);
    }
}

function _bggLoadPetConfigs() {
    _bgg.petEnabled = false; // Always disabled on page load/F5
    _bgg.petSheetPrice = Number(localStorage.getItem('tlcg_pet_sheet_price')) || 40000;
    const storedSpacing = localStorage.getItem('tlcg_pet_spacing');
    if (storedSpacing === null || storedSpacing === '0.3' || storedSpacing === '3' || storedSpacing === '03') {
        _bgg.petSpacing = 0.4;
        localStorage.setItem('tlcg_pet_spacing', '0.4');
    } else {
        _bgg.petSpacing = Number(storedSpacing);
    }
    _bgg.petCalcMode = localStorage.getItem('tlcg_pet_calc_mode') || 'aligned';
    _bgg.petShapes = []; // Always empty on page load/F5

    // Load sewing presets
    const sewingCached = localStorage.getItem('bgg_sewing_presets');
    if (sewingCached) {
        try {
            _bgg.sewingPresets = JSON.parse(sewingCached);
        } catch(e) {
            console.error(e);
        }
    }
    if (!_bgg.sewingPresets || _bgg.sewingPresets.length === 0 || _bgg.sewingPresets.length === 2) {
        _bgg.sewingPresets = [
            { id: 'co_tron_tim', name: 'Cổ tròn/tim', icon: '👕', price: 9000 },
            { id: 'co_be_det', name: 'Cổ bẻ dệt', icon: '👕', price: 13000 },
            { id: 'co_be_vai', name: 'Cổ bẻ vải', icon: '👕', price: 14000 },
            { id: 'quan_mn', name: 'Quần MN', icon: '👕', price: 15000 },
            { id: 'vay_mn', name: 'Váy MN', icon: '👕', price: 13000 },
            { id: 'ao_gio_xuong_tron', name: 'Áo Gió Xuông Trơn', icon: '👕', price: 40000 },
            { id: 'tap_de_ngan', name: 'Tạp Dề Ngắn', icon: '👕', price: 10000 },
            { id: 'tap_de_dai', name: 'Tạp Dề Dài', icon: '👕', price: 11000 },
            { id: 'tap_de_dai_co_khoa', name: 'Tạp Dề Dài Có Khóa', icon: '👕', price: 14000 }
        ];
        localStorage.setItem('bgg_sewing_presets', JSON.stringify(_bgg.sewingPresets));
    }

    // Load collar presets
    const collarCached = localStorage.getItem('bgg_collar_presets');
    if (collarCached) {
        try {
            _bgg.collarPresets = JSON.parse(collarCached);
        } catch(e) {
            console.error(e);
        }
    }
    if (!_bgg.collarPresets || _bgg.collarPresets.length === 0 || _bgg.collarPresets.length === 1) {
        _bgg.collarPresets = [
            { id: 'co_tron_col', name: 'Cổ Trơn', icon: '👔', price: 6000 },
            { id: 'co_vach_col', name: 'Cổ Vạch', icon: '👔', price: 7500 },
            { id: 'co_thoi_trang_col', name: 'Cổ Thời Trang', icon: '👔', price: 9000 }
        ];
        localStorage.setItem('bgg_collar_presets', JSON.stringify(_bgg.collarPresets));
    }

    // Sync "In 3D Thiện Linh" (contractor_1) config with "In 3D Phượng TC" (contractor_2) if Thiện Linh has default single tier config
    const thienLinhConfigStr = localStorage.getItem('bgg_3d_config_contractor_1');
    let thienLinhNeedsReset = false;
    if (!thienLinhConfigStr) {
        thienLinhNeedsReset = true;
    } else {
        try {
            const parsed = JSON.parse(thienLinhConfigStr);
            if (parsed.print_tiers && parsed.print_tiers.length === 1 && parsed.print_tiers[0].price === 15000) {
                thienLinhNeedsReset = true;
            }
        } catch(e) {
            thienLinhNeedsReset = true;
        }
    }
    if (thienLinhNeedsReset) {
        const phuongConfigStr = localStorage.getItem('bgg_3d_config_contractor_2');
        if (phuongConfigStr) {
            localStorage.setItem('bgg_3d_config_contractor_1', phuongConfigStr);
        } else {
            const def = {
                meters_per_shirt: 0.8,
                print_tiers: [
                    { min: 3000, max: null, price: 11000 },
                    { min: 1000, max: 3000, price: 12000 },
                    { min: 500, max: 1000, price: 13000 },
                    { min: 200, max: 500, price: 14000 },
                    { min: 100, max: 200, price: 16000 },
                    { min: 50, max: 100, price: 18000 },
                    { min: 30, max: 50, price: 22000 },
                    { min: 10, max: 30, price: 25000 },
                    { min: 0, max: 10, price: 35000 }
                ],
                laser_tiers: [
                    { min: 500, max: null, price: 3500 },
                    { min: 0, max: 500, price: 4000 }
                ]
            };
            localStorage.setItem('bgg_3d_config_contractor_1', JSON.stringify(def));
        }
    }

    // Load 3D printing configs (always disabled on page load/F5)
    _bgg.print3dEnabled = false;
    _bgg.print3dSupplier = '';

    // Load screen printing configs (always disabled on page load/F5)
    _bgg.screenEnabled = false;
    _bgg.screenColors = '';
    _bgg.screenSupplier = localStorage.getItem('bgg_screen_supplier') || '';

    // Load embroidery configs (always disabled on page load/F5)
    _bgg.embroideryEnabled = false;
    _bgg.embroideryCost = '';
}

function _bggSavePetConfigs() {
    localStorage.removeItem('tlcg_pet_enabled');
    localStorage.removeItem('tlcg_pet_shapes');
    
    const priceInput = document.getElementById('bgg_pet_sheet_price');
    if (priceInput) {
        localStorage.setItem('tlcg_pet_sheet_price', priceInput.value);
    }
    const spacingInput = document.getElementById('bgg_pet_spacing');
    if (spacingInput) {
        localStorage.setItem('tlcg_pet_spacing', spacingInput.value);
    }
}

function _bggSave3dConfigs() {
    localStorage.removeItem('bgg_3d_enabled');
    localStorage.setItem('bgg_3d_supplier', _bgg.print3dSupplier || '');
}

function _bggGet3dConfig(supplierKey) {
    if (!supplierKey) return null;
    const stored = localStorage.getItem('bgg_3d_config_' + supplierKey);
    if (stored) {
        try { return JSON.parse(stored); } catch(e) { /* ignore */ }
    }
    // Default config for all 3D suppliers
    const def = {
        meters_per_shirt: 0.8,
        print_tiers: [
            { min: 3000, max: null, price: 11000 },
            { min: 1000, max: 3000, price: 12000 },
            { min: 500, max: 1000, price: 13000 },
            { min: 200, max: 500, price: 14000 },
            { min: 100, max: 200, price: 16000 },
            { min: 50, max: 100, price: 18000 },
            { min: 30, max: 50, price: 22000 },
            { min: 10, max: 30, price: 25000 },
            { min: 0, max: 10, price: 35000 }
        ],
        laser_tiers: [
            { min: 500, max: null, price: 3500 },
            { min: 0, max: 500, price: 4000 }
        ]
    };
    return def;
}

function _bggSave3dSupplierConfig(supplierKey, config) {
    localStorage.setItem('bgg_3d_config_' + supplierKey, JSON.stringify(config));
}

function _bggCalc3dCost(qty, supplierKey) {
    const activeSupplier = supplierKey || _bgg.print3dSupplier;
    const isEnabled = supplierKey ? true : _bgg.print3dEnabled;
    if (!isEnabled || !activeSupplier) return { total: 0, printCost: 0, laserCost: 0, metersPerShirt: 0, totalMeters: 0, printPricePerMeter: 0, laserPricePerShirt: 0 };
    const config = _bggGet3dConfig(activeSupplier);
    if (!config || !config.print_tiers || config.print_tiers.length === 0) return { total: 0, printCost: 0, laserCost: 0, metersPerShirt: 0, totalMeters: 0, printPricePerMeter: 0, laserPricePerShirt: 0 };
    const mps = config.meters_per_shirt || 0.8;
    if (!qty || qty <= 0) return { total: 0, printCost: 0, laserCost: 0, metersPerShirt: mps, totalMeters: 0, printPricePerMeter: 0, laserPricePerShirt: 0, needQty: true };
    const totalMeters = qty * mps;
    // Find print tier
    let printPrice = 0;
    for (const t of config.print_tiers) {
        const tMin = Number(t.min) || 0;
        const tMax = t.max !== null && t.max !== '' ? Number(t.max) : Infinity;
        if (totalMeters >= tMin && totalMeters < tMax) { printPrice = Number(t.price) || 0; break; }
    }
    // Handle edge: if totalMeters equals a max boundary, check the next tier
    if (printPrice === 0) {
        for (const t of config.print_tiers) {
            const tMin = Number(t.min) || 0;
            const tMax = t.max !== null && t.max !== '' ? Number(t.max) : Infinity;
            if (totalMeters >= tMin && totalMeters <= tMax) { printPrice = Number(t.price) || 0; break; }
        }
    }
    const printCostPerShirt = Math.round(printPrice * mps);
    // Find laser tier
    let laserPrice = 0;
    if (config.laser_tiers && config.laser_tiers.length > 0) {
        for (const t of config.laser_tiers) {
            const tMin = Number(t.min) || 0;
            const tMax = t.max !== null && t.max !== '' ? Number(t.max) : Infinity;
            if (totalMeters >= tMin && totalMeters < tMax) { laserPrice = Number(t.price) || 0; break; }
        }
        if (laserPrice === 0) {
            for (const t of config.laser_tiers) {
                const tMin = Number(t.min) || 0;
                const tMax = t.max !== null && t.max !== '' ? Number(t.max) : Infinity;
                if (totalMeters >= tMin && totalMeters <= tMax) { laserPrice = Number(t.price) || 0; break; }
            }
        }
    }
    const laserCostPerShirt = Math.round(laserPrice * mps);
    return {
        total: printCostPerShirt + laserCostPerShirt,
        printCost: printCostPerShirt,
        laserCost: laserCostPerShirt,
        metersPerShirt: mps,
        totalMeters: totalMeters,
        printPricePerMeter: printPrice,
        laserPricePerShirt: laserPrice
    };
}

function _bggGetScreenConfig(supplierKey) {
    if (!supplierKey) return null;
    const stored = localStorage.getItem('bgg_screen_config_' + supplierKey);
    if (stored) {
        try { return JSON.parse(stored); } catch(e) { /* ignore */ }
    }
    // Default config
    const def = {
        qty_threshold: 20,
        price_low: 50000,
        price_high_1_3: 3000,
        price_high_4_plus: 2500
    };
    localStorage.setItem('bgg_screen_config_' + supplierKey, JSON.stringify(def));
    return def;
}

function _bggSaveScreenConfigs() {
    localStorage.removeItem('bgg_screen_enabled'); // Don't persist enabled state
    localStorage.setItem('bgg_screen_supplier', _bgg.screenSupplier || '');
    const colorsInput = document.getElementById('bgg_screen_colors');
    if (colorsInput) {
        _bgg.screenColors = colorsInput.value;
    }
}

function _bggCalcScreenCost(qty) {
    if (!_bgg.screenEnabled || !_bgg.screenSupplier) return 0;
    const colors = Number(_bgg.screenColors) || 0;
    if (colors <= 0) return 0;
    const config = _bggGetScreenConfig(_bgg.screenSupplier);
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

function _bggToggleScreenSection(enabled) {
    _bgg.screenEnabled = enabled;
    const infoDiv = document.getElementById('bgg_screen_info');
    const setupBtn = document.getElementById('bgg_setup_screen_btn');
    if (infoDiv) infoDiv.style.display = enabled ? 'block' : 'none';
    
    const isDirector = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';
    if (setupBtn) setupBtn.style.display = (enabled && isDirector) ? 'inline-block' : 'none';
    
    _bggSaveScreenConfigs();
    _bggRenderScreenSupplierDisplay();
    _bggRenderCalcResults();
}

function _bggRenderScreenSupplierDisplay() {
    const el = document.getElementById('bgg_screen_supplier_display');
    if (!el) return;
    const supplier = _BGG_SCREEN_SUPPLIERS.find(s => s.key === _bgg.screenSupplier);
    if (!supplier) {
        el.innerHTML = '<div style="font-size: 12px; color: #94a3b8; cursor: pointer;" onclick="_bggOpenScreenPicker()">⚠️ Chưa chọn NCC in lưới — <strong style="color:#db2777;">bấm để chọn</strong></div>';
        return;
    }
    const nccBadge = `<span onclick="_bggOpenScreenPicker()" style="background: #fce7f3; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 800; color: #9d174d; cursor: pointer; border: 1px solid #fbcfe8; transition: background 0.2s;" onmouseover="this.style.background='#fbcfe8'" onmouseout="this.style.background='#fce7f3'">${supplier.icon} ${supplier.name} ▾</span>`;
    
    const qty = Number(document.getElementById('bgg_quantity')?.value) || 0;
    const colors = Number(document.getElementById('bgg_screen_colors')?.value) || 0;
    
    if (qty <= 0) {
        el.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 12px; font-weight: 700; color: #9d174d;">NCC:</span>
                ${nccBadge}
            </div>
            <div style="font-size: 11px; color: #f59e0b; margin-top: 6px; font-weight: 600;">⚠️ Nhập số lượng áo để tính chi phí in Lưới</div>
        `;
    } else if (colors <= 0) {
        el.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 12px; font-weight: 700; color: #9d174d;">NCC:</span>
                ${nccBadge}
            </div>
            <div style="font-size: 11px; color: #f59e0b; margin-top: 6px; font-weight: 600;">⚠️ Nhập số màu in để tính chi phí in Lưới</div>
        `;
    } else {
        const cost = _bggCalcScreenCost(qty);
        const config = _bggGetScreenConfig(_bgg.screenSupplier);
        const threshold = config ? (Number(config.qty_threshold) || 20) : 20;
        el.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 12px; font-weight: 700; color: #9d174d;">NCC:</span>
                ${nccBadge}
            </div>
            <div style="font-size: 11px; color: #9d174d; margin-top: 6px; font-weight: 600;">
                In Lưới: <strong>${Math.round(cost).toLocaleString('vi-VN')}đ / áo</strong> 
                ${qty < threshold ? `(Tổng đơn: ${Number(cost * qty).toLocaleString('vi-VN')}đ)` : ''}
            </div>
        `;
    }
}

function _bggToggleEmbroiderySection(enabled) {
    _bgg.embroideryEnabled = enabled;
    const infoDiv = document.getElementById('bgg_embroidery_info');
    if (infoDiv) infoDiv.style.display = enabled ? 'block' : 'none';
    _bggSaveEmbroideryConfigs();
    _bggRenderCalcResults();
}

function _bggSaveEmbroideryConfigs() {
    const costInput = document.getElementById('bgg_embroidery_cost');
    if (costInput) {
        _bgg.embroideryCost = costInput.value;
    }
}

function _bggToggle3dSection(enabled) {
    _bgg.print3dEnabled = enabled;
    const infoDiv = document.getElementById('bgg_3d_info');
    const setupBtn = document.getElementById('bgg_setup_3d_btn');
    if (infoDiv) infoDiv.style.display = enabled ? 'block' : 'none';
    if (setupBtn) setupBtn.style.display = enabled ? 'inline-block' : 'none';
    _bggSave3dConfigs();
    _bggRender3dSupplierDisplay();
    _bggRenderCalcResults();
}

function _bggAutoSelectCheapest3dSupplier(qty) {
    // Left empty/unused as user requested manual selection only
}

function _bggRender3dSupplierDisplay() {
    const el = document.getElementById('bgg_3d_supplier_display');
    if (!el) return;

    const qty = Number(document.getElementById('bgg_quantity')?.value) || 0;
    if (qty !== _bgg.lastQty) {
        _bgg.lastQty = qty;
    }



    const supplier = _BGG_3D_SUPPLIERS.find(s => s.key === _bgg.print3dSupplier);
    if (!supplier) {
        el.innerHTML = '<div style="font-size: 12px; color: #94a3b8; cursor: pointer;" onclick="_bggOpen3dPicker()">⚠️ Chưa chọn NCC — <strong style="color:#3b82f6;">bấm để chọn</strong></div>';
        return;
    }
    const nccBadge = `<span onclick="_bggOpen3dPicker()" style="background: #dbeafe; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 800; color: #1e40af; cursor: pointer; border: 1px solid #93c5fd; transition: background 0.2s;" onmouseover="this.style.background='#bfdbfe'" onmouseout="this.style.background='#dbeafe'">${supplier.icon} ${supplier.name} ▾</span>`;
    const calc = _bggCalc3dCost(qty);
    if (calc.needQty) {
        el.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 12px; font-weight: 700; color: #1e40af;">NCC:</span>
                ${nccBadge}
            </div>
            <div style="font-size: 11px; color: #f59e0b; margin-top: 6px; font-weight: 600;">⚠️ Nhập số lượng áo để tính chi phí 3D</div>
        `;
    } else if (calc.total > 0) {
        el.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 12px; font-weight: 700; color: #1e40af;">NCC:</span>
                ${nccBadge}
            </div>
            <div style="font-size: 11px; color: #1e40af; margin-top: 6px; font-weight: 600;">
                In: ${Number(calc.printCost).toLocaleString('vi-VN')}đ${calc.laserCost > 0 ? ' + Cắt: ' + Number(calc.laserCost).toLocaleString('vi-VN') + 'đ' : ''} = <strong>${Number(calc.total).toLocaleString('vi-VN')}đ / áo</strong>
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${qty} áo × ${calc.metersPerShirt}m = ${calc.totalMeters.toFixed(1)}m → In: ${Number(calc.printPricePerMeter).toLocaleString('vi-VN')}đ/m${calc.laserCost > 0 ? ' | Cắt: ' + Number(calc.laserPricePerShirt).toLocaleString('vi-VN') + 'đ/m' : ''}</div>
        `;
    } else {
        el.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 12px; font-weight: 700; color: #1e40af;">NCC:</span>
                ${nccBadge}
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 6px; font-style: italic;">Chưa có bảng giá — bấm ⚙️ Setup để cài đặt</div>
        `;
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
        list.innerHTML = '';
        return;
    }
    
    list.innerHTML = shapes.map((s, idx) => `
        <div class="pet-shape-row" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;" data-idx="${idx}">
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
    const segmentSelect = document.getElementById('bgg_segment');
    if (!segmentSelect) return;
    
    // Clear color selection
    const colorSearch = document.getElementById('bgg_color_search');
    const colorIdInput = document.getElementById('bgg_color_id');
    if (colorSearch) colorSearch.value = '';
    if (colorIdInput) colorIdInput.value = '';
    
    if (!matId) {
        segmentSelect.innerHTML = `
            <option value="">-- Tất cả phân khúc --</option>
            ${(_bgg.sizeSegments || []).map(s => `<option value="${s.name}">${s.icon || '🧑'} ${s.name}</option>`).join('')}
        `;
        return;
    }

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

    if (!matId) {
        if (typeof showToast === 'function') showToast('Vui lòng chọn chất liệu!', 'error');
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
            if (isNaN(w) || w <= 0 || isNaN(h) || h <= 0) {
                hasInvalidShape = true;
                break;
            }
        }
        
        if (hasInvalidShape) {
            if (typeof showToast === 'function') showToast('Vui lòng điền đầy đủ kích thước (> 0) cho tất cả hình in PET!', 'error');
            return;
        }
    }

    // 3D validation: require quantity & white color when 3D is enabled
    const print3dOn = document.getElementById('bgg_enable_3d')?.checked;
    if (print3dOn) {
        const q3d = Number(document.getElementById('bgg_quantity').value) || 0;
        if (q3d <= 0) {
            if (typeof showToast === 'function') showToast('Bật Chi phí in 3D → vui lòng nhập Số lượng áo để tính giá!', 'error');
            document.getElementById('bgg_quantity').focus();
            return;
        }
        
        const colSearch = document.getElementById('bgg_color_search')?.value || '';
        if (!colSearch.trim().toLowerCase().includes('trắng')) {
            if (typeof showToast === 'function') showToast('In 3D chỉ hỗ trợ trên vải màu trắng (Trắng, Trắng gạo, ...)! Vui lòng chọn màu trắng.', 'error');
            document.getElementById('bgg_color_search').focus();
            return;
        }
    }

    // Screen printing validation: require quantity, supplier, and number of colors when enabled
    const screenOn = document.getElementById('bgg_enable_screen')?.checked;
    if (screenOn) {
        const qScreen = Number(document.getElementById('bgg_quantity').value) || 0;
        if (qScreen <= 0) {
            if (typeof showToast === 'function') showToast('Bật Chi phí in Lưới → vui lòng nhập Số lượng áo để tính giá!', 'error');
            document.getElementById('bgg_quantity').focus();
            return;
        }
        if (!_bgg.screenSupplier) {
            if (typeof showToast === 'function') showToast('Vui lòng chọn nhà in lưới!', 'error');
            _bggOpenScreenPicker();
            return;
        }
        const colors = Number(document.getElementById('bgg_screen_colors')?.value) || 0;
        if (colors <= 0) {
            if (typeof showToast === 'function') showToast('Vui lòng nhập Số màu in Lưới (> 0)!', 'error');
            document.getElementById('bgg_screen_colors').focus();
            return;
        }
    }

    // Embroidery validation: require price when enabled
    const embroideryOn = document.getElementById('bgg_enable_embroidery')?.checked;
    if (embroideryOn) {
        const embroideryPrice = Number(document.getElementById('bgg_embroidery_cost')?.value) || 0;
        if (embroideryPrice <= 0) {
            if (typeof showToast === 'function') showToast('Vui lòng nhập Giá tiền thêu (> 0)!', 'error');
            document.getElementById('bgg_embroidery_cost').focus();
            return;
        }
    }

    const resultsCard = document.getElementById('bgg_results_card');
    resultsCard.innerHTML = '<div style="text-align: center; padding: 80px 20px; color: #64748b; font-weight: 600; font-size: 14px;">⏳ Đang tính toán và tối ưu so sánh dữ liệu...</div>';

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
    const sewingCost = Number(document.getElementById('bgg_sewing_cost')?.value) || 0;
    const collarCost = Number(document.getElementById('bgg_collar_cost')?.value) || 0;
    const qty3d = Number(document.getElementById('bgg_quantity')?.value) || 0;
    const calc3d = _bggCalc3dCost(qty3d);
    const print3dCost = calc3d.total;
    const screenCost = _bggCalcScreenCost(qty3d);
    const embroideryEnabled = document.getElementById('bgg_enable_embroidery')?.checked;
    const embroideryCost = embroideryEnabled ? (Number(document.getElementById('bgg_embroidery_cost')?.value) || 0) : 0;
    const extraCost = petCost + sewingCost + collarCost + print3dCost + screenCost + embroideryCost;
    
    const breakdownParts = [];
    if (petCost > 0) breakdownParts.push(`PET: ${Number(petCost).toLocaleString('vi-VN')}đ`);
    if (sewingCost > 0) breakdownParts.push(`May: ${Number(sewingCost).toLocaleString('vi-VN')}đ`);
    if (collarCost > 0) breakdownParts.push(`Cổ: ${Number(collarCost).toLocaleString('vi-VN')}đ`);
    if (print3dCost > 0) breakdownParts.push(`3D: ${Number(print3dCost).toLocaleString('vi-VN')}đ`);
    if (screenCost > 0) breakdownParts.push(`Lưới: ${Number(screenCost).toLocaleString('vi-VN')}đ`);
    if (embroideryCost > 0) breakdownParts.push(`Thêu: ${Number(embroideryCost).toLocaleString('vi-VN')}đ`);
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

    // Render 3D Print summary
    if (_bgg.print3dEnabled && _bgg.print3dSupplier && calc3d.total > 0) {
        const supplier3d = _BGG_3D_SUPPLIERS.find(s => s.key === _bgg.print3dSupplier);
        const supplierName = supplier3d ? `${supplier3d.icon} ${supplier3d.name}` : 'Chưa chọn';
        html += `
            <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 12px; padding: 14px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <div style="font-size: 13px; font-weight: 800; color: #1e40af; text-transform: uppercase; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                    🎨 Chi phí in 3D dự kiến (cho 1 áo)
                </div>
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <div style="background: white; border: 1.5px solid #93c5fd; border-radius: 8px; padding: 10px 14px;">
                        <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">NCC</div>
                        <div style="font-size: 13px; font-weight: 800; color: #1e40af;">${supplierName}</div>
                    </div>
                    <div style="background: white; border: 1.5px solid #93c5fd; border-radius: 8px; padding: 10px 14px;">
                        <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">In 3D</div>
                        <div style="font-size: 14px; font-weight: 800; color: #1e40af;">${Number(calc3d.printCost).toLocaleString('vi-VN')} đ</div>
                    </div>
                    ${calc3d.laserCost > 0 ? `
                    <div style="background: white; border: 1.5px solid #93c5fd; border-radius: 8px; padding: 10px 14px;">
                        <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Cắt Laze</div>
                        <div style="font-size: 14px; font-weight: 800; color: #1e40af;">${Number(calc3d.laserCost).toLocaleString('vi-VN')} đ</div>
                    </div>` : ''}
                    <div style="background: #1e40af; border-radius: 8px; padding: 10px 14px;">
                        <div style="font-size: 10px; color: #93c5fd; font-weight: 700; text-transform: uppercase;">Tổng / áo</div>
                        <div style="font-size: 15px; font-weight: 800; color: white;">${Number(calc3d.total).toLocaleString('vi-VN')} đ</div>
                    </div>
                </div>
                <div style="font-size: 11px; color: #475569; margin-top: 8px; border-top: 1px dashed #bfdbfe; padding-top: 6px;">
                    ${qty3d} áo × ${calc3d.metersPerShirt}m = <strong>${calc3d.totalMeters.toFixed(1)}m</strong> → Bậc giá in: <strong>${Number(calc3d.printPricePerMeter).toLocaleString('vi-VN')}đ/m</strong> × ${calc3d.metersPerShirt}m = <strong>${Number(calc3d.printCost).toLocaleString('vi-VN')}đ/áo</strong>${calc3d.laserCost > 0 ? ' + Bậc cắt: <strong>' + Number(calc3d.laserPricePerShirt).toLocaleString('vi-VN') + 'đ/m</strong> × ' + calc3d.metersPerShirt + 'm = <strong>' + Number(calc3d.laserCost).toLocaleString('vi-VN') + 'đ/áo</strong>' : ''}
                </div>
            </div>
        `;
    }

    // Render Screen Print summary
    if (_bgg.screenEnabled && _bgg.screenSupplier && screenCost > 0) {
        const supplierScreen = _BGG_SCREEN_SUPPLIERS.find(s => s.key === _bgg.screenSupplier);
        const supplierName = supplierScreen ? `${supplierScreen.icon} ${supplierScreen.name}` : 'Chưa chọn';
        html += `
            <div style="background: #fdf2f8; border: 1.5px solid #fbcfe8; border-radius: 12px; padding: 14px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <div style="font-size: 13px; font-weight: 800; color: #9d174d; text-transform: uppercase; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                    🎨 Chi phí in Lưới dự kiến (cho 1 áo)
                </div>
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <div style="background: white; border: 1.5px solid #fbcfe8; border-radius: 8px; padding: 10px 14px;">
                        <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">NCC</div>
                        <div style="font-size: 13px; font-weight: 800; color: #9d174d;">${supplierName}</div>
                    </div>
                    <div style="background: white; border: 1.5px solid #fbcfe8; border-radius: 8px; padding: 10px 14px;">
                        <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Số màu</div>
                        <div style="font-size: 14px; font-weight: 800; color: #9d174d;">${_bgg.screenColors} màu</div>
                    </div>
                    <div style="background: #9d174d; border-radius: 8px; padding: 10px 14px;">
                        <div style="font-size: 10px; color: #fbcfe8; font-weight: 700; text-transform: uppercase;">Tổng / áo</div>
                        <div style="font-size: 15px; font-weight: 800; color: white;">${Math.round(screenCost).toLocaleString('vi-VN')} đ</div>
                    </div>
                </div>
                <div style="font-size: 11px; color: #475569; margin-top: 8px; border-top: 1px dashed #fbcfe8; padding-top: 6px;">
                    Cấu hình tính toán: Q = ${qty3d} áo | Màu = ${_bgg.screenColors} màu | 
                    ${qty3d < 20 ? `Dưới 20 áo (gộp): <strong>${Math.round(screenCost * qty3d).toLocaleString('vi-VN')}đ / đơn</strong>` : `Từ 20 áo trở lên: Đơn giá <strong>${Math.round(screenCost).toLocaleString('vi-VN')}đ / áo</strong>`}
                </div>
            </div>
        `;
    }

    // Render Embroidery summary
    if (embroideryEnabled && embroideryCost > 0) {
        html += `
            <div style="background: #faf5ff; border: 1.5px solid #e9d5ff; border-radius: 12px; padding: 14px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <div style="font-size: 13px; font-weight: 800; color: #6b21a8; text-transform: uppercase; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                    🪡 Chi phí thêu dự kiến (cho 1 áo)
                </div>
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <div style="background: #6b21a8; border-radius: 8px; padding: 10px 14px;">
                        <div style="font-size: 10px; color: #e9d5ff; font-weight: 700; text-transform: uppercase;">Tổng / áo</div>
                        <div style="font-size: 15px; font-weight: 800; color: white;">${Number(embroideryCost).toLocaleString('vi-VN')} đ</div>
                    </div>
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
                        const finalPrice = Number(price) + extraCost;
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
                                                <div style="text-align: right; line-height: 1.2;">
                                                    <span style="color: ${finalPriceColor}; font-weight: 800;">
                                                        ${Number(sp.price + extraCost).toLocaleString('vi-VN')} đ / áo
                                                    </span>
                                                    ${extraCost > 0 ? `
                                                        <div style="font-size: 10px; color: #64748b; font-weight: normal; margin-top: 1px;">
                                                            (Vải: ${Number(sp.price).toLocaleString('vi-VN')}đ${extraDetailStr})
                                                        </div>
                                                    ` : ''}
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                    ${selectedId !== 'all' && activeCheapestRange ? `
                                        <div style="font-size: 13px; font-weight: 800; color: ${rangeText}; margin-top: 6px; background: #dbeafe; padding: 4px 8px; border-radius: 6px; display: inline-block;">
                                            💰 Tổng tiền: ${Math.round((activeCheapestRange.price + extraCost) * res.quantity).toLocaleString('vi-VN')} đ
                                        </div>
                                    ` : selectedId === 'all' && rangeSupplierPrices.length > 0 ? `
                                        <div style="font-size: 13px; font-weight: 800; color: ${rangeText}; margin-top: 6px; background: #dbeafe; padding: 4px 8px; border-radius: 6px; display: inline-block;">
                                            💰 Tổng tiền (tối ưu): ${Math.round((rangeSupplierPrices[0].price + extraCost) * res.quantity).toLocaleString('vi-VN')} đ
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
                                                <div style="text-align: right; line-height: 1.2;">
                                                    <span style="color: ${finalPriceColor}; font-weight: 800;">
                                                        ${Number(sp.price + extraCost).toLocaleString('vi-VN')} đ / áo
                                                    </span>
                                                    ${extraCost > 0 ? `
                                                        <div style="font-size: 10px; color: #64748b; font-weight: normal; margin-top: 1px;">
                                                            (Vải: ${Number(sp.price).toLocaleString('vi-VN')}đ${extraDetailStr})
                                                        </div>
                                                    ` : ''}
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                    ${selectedId !== 'all' && activeCheapestOverall ? `
                                        <div style="font-size: 13px; font-weight: 800; color: ${overallText}; margin-top: 6px; background: #d1fae5; padding: 4px 8px; border-radius: 6px; display: inline-block;">
                                            💰 Tổng tiền: ${Math.round((activeCheapestOverall.price + extraCost) * res.quantity).toLocaleString('vi-VN')} đ
                                        </div>
                                    ` : selectedId === 'all' && overallSupplierPrices.length > 0 ? `
                                        <div style="font-size: 13px; font-weight: 800; color: ${overallText}; margin-top: 6px; background: #d1fae5; padding: 4px 8px; border-radius: 6px; display: inline-block;">
                                            💰 Tổng tiền (tối ưu): ${Math.round((overallSupplierPrices[0].price + extraCost) * res.quantity).toLocaleString('vi-VN')} đ
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
                                            <div style="font-weight: ${finalWeight}; line-height: 1.3; margin-bottom: 4px;">
                                                <span style="color: ${finalNameColor}; font-weight: 600;">${styles.icon}${sp.source_name}:</span>
                                                <strong style="color: ${finalPriceColor}; font-weight: 800;">${Number(sp.price + extraCost).toLocaleString('vi-VN')} đ / áo</strong>
                                                ${extraCost > 0 ? `
                                                    <div style="font-size: 10.5px; color: #64748b; font-weight: normal; margin-top: 1px;">
                                                        (Vải: ${Number(sp.price).toLocaleString('vi-VN')}đ${extraDetailStr})
                                                    </div>
                                                ` : ''}
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

window._bggSelectSewingPreset = function(id, amount) {
    const sewingInput = document.getElementById('bgg_sewing_cost');
    if (sewingInput) {
        sewingInput.value = amount;
    }
    const collarInput = document.getElementById('bgg_collar_cost');
    if (collarInput) {
        const isCoBe = id === 'co_be' || id.toLowerCase().includes('co_be') || id.toLowerCase().includes('cổ bẻ');
        const isCoBeVai = id.toLowerCase().includes('vai') || id.toLowerCase().includes('vải');
        if (isCoBe && !isCoBeVai) {
            const firstCollarPreset = _bgg.collarPresets && _bgg.collarPresets[0];
            collarInput.value = firstCollarPreset ? firstCollarPreset.price : 6000;
        } else {
            collarInput.value = '';
        }
    }
    
    // Clear save suggestion wrappers
    const sewingSuggest = document.getElementById('bgg_sewing_save_suggest_wrapper');
    if (sewingSuggest) {
        sewingSuggest.style.display = 'none';
        sewingSuggest.innerHTML = '';
    }
    const collarSuggest = document.getElementById('bgg_collar_save_suggest_wrapper');
    if (collarSuggest) {
        collarSuggest.style.display = 'none';
        collarSuggest.innerHTML = '';
    }

    _bggRenderCalcResults();
};

window._bggSelectCollarPreset = function(amount) {
    const collarInput = document.getElementById('bgg_collar_cost');
    if (collarInput) {
        collarInput.value = amount;
    }
    
    // Clear collar save suggestion wrapper
    const collarSuggest = document.getElementById('bgg_collar_save_suggest_wrapper');
    if (collarSuggest) {
        collarSuggest.style.display = 'none';
        collarSuggest.innerHTML = '';
    }

    _bggRenderCalcResults();
};

function _bggCheckAndShowSaveSuggestion(type) {
    const isSewing = type === 'sewing';
    const inputEl = document.getElementById(isSewing ? 'bgg_sewing_cost' : 'bgg_collar_cost');
    const container = document.getElementById(isSewing ? 'bgg_sewing_presets_container' : 'bgg_collar_presets_container');
    if (!inputEl || !container) return;

    const val = Number(inputEl.value) || 0;
    
    let suggestWrapper = document.getElementById(`bgg_${type}_save_suggest_wrapper`);
    if (!suggestWrapper) {
        suggestWrapper = document.createElement('div');
        suggestWrapper.id = `bgg_${type}_save_suggest_wrapper`;
        suggestWrapper.style.cssText = 'margin-bottom: 8px; margin-top: 4px; display: none;';
        container.parentNode.insertBefore(suggestWrapper, container);
    }

    if (val > 0) {
        suggestWrapper.style.display = 'block';
        suggestWrapper.innerHTML = `
            <button type="button" class="btn-suggestion" style="background: #e0f2fe; border-color: #7dd3fc; color: #0369a1; font-weight: 700; width: 100%; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px 12px;" onclick="_bggSaveEnteredPresetPrompt('${type}', ${val})">
                💾 Lưu ${val.toLocaleString('vi-VN')}đ thành gợi ý ${isSewing ? 'may' : 'cổ bẻ'} mới
            </button>
        `;
    } else {
        suggestWrapper.style.display = 'none';
        suggestWrapper.innerHTML = '';
    }
}

window._bggSaveEnteredPresetPrompt = function(type, price) {
    const isSewing = type === 'sewing';
    const presetName = prompt(`Nhập tên gợi ý ${isSewing ? 'may' : 'cổ bẻ'} mới cho giá ${price.toLocaleString('vi-VN')}đ:`);
    if (!presetName) return;
    
    const cleanName = presetName.trim();
    if (!cleanName) return;

    const id = cleanName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '_');

    const icon = isSewing ? '👕' : '👔';
    const newPreset = {
        id: id,
        name: cleanName,
        icon: icon,
        price: price
    };

    if (isSewing) {
        if (!_bgg.sewingPresets) _bgg.sewingPresets = [];
        _bgg.sewingPresets.push(newPreset);
        localStorage.setItem('bgg_sewing_presets', JSON.stringify(_bgg.sewingPresets));
    } else {
        if (!_bgg.collarPresets) _bgg.collarPresets = [];
        _bgg.collarPresets.push(newPreset);
        localStorage.setItem('bgg_collar_presets', JSON.stringify(_bgg.collarPresets));
    }

    _bggRenderPresetsOnForm();
    
    const suggestWrapper = document.getElementById(`bgg_${type}_save_suggest_wrapper`);
    if (suggestWrapper) {
        suggestWrapper.style.display = 'none';
        suggestWrapper.innerHTML = '';
    }

    if (typeof showToast === 'function') {
        showToast(`Đã thêm gợi ý mới: ${icon} ${cleanName}: ${price.toLocaleString('vi-VN')}đ`, 'success');
    }
};

function _bggRenderPresetsOnForm() {
    const sewingContainer = document.getElementById('bgg_sewing_presets_container');
    if (sewingContainer) {
        sewingContainer.innerHTML = (_bgg.sewingPresets || []).map(p => `
            <button type="button" class="btn-suggestion" onclick="_bggSelectSewingPreset('${p.id}', ${p.price})">
                ${p.icon || '👕'} ${p.name}: ${Number(p.price).toLocaleString('vi-VN')}đ
            </button>
        `).join('');
    }
    const collarContainer = document.getElementById('bgg_collar_presets_container');
    if (collarContainer) {
        collarContainer.innerHTML = (_bgg.collarPresets || []).map(p => `
            <button type="button" class="btn-suggestion" onclick="_bggSelectCollarPreset(${p.price})">
                ${p.icon || '👔'} ${p.name}: ${Number(p.price).toLocaleString('vi-VN')}đ
            </button>
        `).join('');
    }
}

window._bggOpenSetupModal = function() {
    // Copy existing presets to temp lists
    _bgg.tempSewingPresets = JSON.parse(JSON.stringify(_bgg.sewingPresets || []));
    _bgg.tempCollarPresets = JSON.parse(JSON.stringify(_bgg.collarPresets || []));

    // Remove existing modal if any
    const existing = document.getElementById('bgg_setup_modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'bgg_setup_modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 11000; padding: 16px;';
    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); display: flex; flex-direction: column; border: 1px solid #e2e8f0;">
            <!-- Header -->
            <div style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
                <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px;">⚙️ Setup Chi Phí & Gợi Ý</h3>
                <button onclick="_bggCloseSetupModal()" style="background: none; border: none; font-size: 20px; color: #64748b; cursor: pointer; padding: 4px;">&times;</button>
            </div>
            <!-- Body -->
            <div style="padding: 20px; display: flex; flex-direction: column; gap: 20px;">
                <!-- Section 1: PET configs -->
                <div>
                    <h4 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #1e293b; text-transform: uppercase;">🖨️ Cấu hình PET</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div>
                            <label style="display: block; font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 4px;">Giá khổ in (58x100) (đ)</label>
                            <input type="number" id="setup_pet_sheet_price" class="bgg-input" style="padding: 8px 10px; font-size: 13px;" value="${_bgg.petSheetPrice}">
                        </div>
                        <div>
                            <label style="display: block; font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 4px;">Khoảng cách Spacing (cm)</label>
                            <input type="text" id="setup_pet_spacing" class="bgg-input" style="padding: 8px 10px; font-size: 13px;" value="${_bgg.petSpacing}" oninput="this.value = this.value.replace(/,/g, '.').replace(/[^0-9.]/g, '')">
                        </div>
                    </div>
                </div>
                
                <!-- Section 2: Sewing suggestions -->
                <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                        <h4 style="margin: 0; font-size: 13px; font-weight: 700; color: #1e293b; text-transform: uppercase;">👕 Gợi ý Chi phí may</h4>
                        <button onclick="_bggAddSetupSewingPreset()" style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: 700; color: #475569; cursor: pointer;">➕ Thêm</button>
                    </div>
                    <div id="setup_sewing_presets_list" style="display: flex; flex-direction: column; gap: 8px;">
                        <!-- Dynamically populated -->
                    </div>
                </div>
                
                <!-- Section 3: Collar suggestions -->
                <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                        <h4 style="margin: 0; font-size: 13px; font-weight: 700; color: #1e293b; text-transform: uppercase;">👔 Gợi ý Chi phí cổ bẻ</h4>
                        <button onclick="_bggAddSetupCollarPreset()" style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: 700; color: #475569; cursor: pointer;">➕ Thêm</button>
                    </div>
                    <div id="setup_collar_presets_list" style="display: flex; flex-direction: column; gap: 8px;">
                        <!-- Dynamically populated -->
                    </div>
                </div>
            </div>
            <!-- Footer -->
            <div style="padding: 16px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; background: #f8fafc; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;">
                <button onclick="_bggCloseSetupModal()" style="padding: 8px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #475569; background: white; cursor: pointer;">Hủy</button>
                <button onclick="_bggSaveSetupModal()" style="padding: 8px 16px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; color: white; background: #4f46e5; cursor: pointer; box-shadow: 0 4px 12px rgba(79,70,229,0.15);">Lưu cấu hình</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    _bggRenderSetupPresets();
};

window._bggCloseSetupModal = function() {
    const modal = document.getElementById('bgg_setup_modal');
    if (modal) modal.remove();
};

window._bggRenderSetupPresets = function() {
    const sewingList = document.getElementById('setup_sewing_presets_list');
    if (sewingList) {
        const presets = _bgg.tempSewingPresets || [];
        sewingList.style.display = presets.length > 0 ? 'flex' : 'none';
        sewingList.innerHTML = presets.map((p, idx) => {
            if (!p) return '';
            return `
                <div style="display: flex; align-items: center; gap: 6px;">
                    <input type="text" placeholder="Icon" value="${p.icon || ''}" style="width: 45px; text-align: center; padding: 6px; font-size: 13px; border: 1.5px solid #cbd5e1; border-radius: 8px;">
                    <input type="text" placeholder="Tên" value="${p.name || ''}" style="flex: 1; padding: 6px 10px; font-size: 13px; border: 1.5px solid #cbd5e1; border-radius: 8px;">
                    <input type="number" placeholder="Giá" value="${p.price || ''}" style="width: 80px; padding: 6px 10px; font-size: 13px; border: 1.5px solid #cbd5e1; border-radius: 8px;">
                    <button onclick="_bggRemoveSetupSewingPreset(${idx})" style="background: #fee2e2; border: none; color: #ef4444; border-radius: 6px; padding: 6px 10px; font-size: 12px; font-weight: 600; cursor: pointer;">Xóa</button>
                </div>
            `;
        }).join('');
    }
    const collarList = document.getElementById('setup_collar_presets_list');
    if (collarList) {
        const presets = _bgg.tempCollarPresets || [];
        collarList.style.display = presets.length > 0 ? 'flex' : 'none';
        collarList.innerHTML = presets.map((p, idx) => {
            if (!p) return '';
            return `
                <div style="display: flex; align-items: center; gap: 6px;">
                    <input type="text" placeholder="Icon" value="${p.icon || ''}" style="width: 45px; text-align: center; padding: 6px; font-size: 13px; border: 1.5px solid #cbd5e1; border-radius: 8px;">
                    <input type="text" placeholder="Tên" value="${p.name || ''}" style="flex: 1; padding: 6px 10px; font-size: 13px; border: 1.5px solid #cbd5e1; border-radius: 8px;">
                    <input type="number" placeholder="Giá" value="${p.price || ''}" style="width: 80px; padding: 6px 10px; font-size: 13px; border: 1.5px solid #cbd5e1; border-radius: 8px;">
                    <button onclick="_bggRemoveSetupCollarPreset(${idx})" style="background: #fee2e2; border: none; color: #ef4444; border-radius: 6px; padding: 6px 10px; font-size: 12px; font-weight: 600; cursor: pointer;">Xóa</button>
                </div>
            `;
        }).join('');
    }
};

window._bggSyncSetupPresetsFromDOM = function() {
    const sewingList = document.getElementById('setup_sewing_presets_list');
    if (sewingList) {
        const rows = sewingList.children;
        _bgg.tempSewingPresets = Array.from(rows).map(row => {
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
    const collarList = document.getElementById('setup_collar_presets_list');
    if (collarList) {
        const rows = collarList.children;
        _bgg.tempCollarPresets = Array.from(rows).map(row => {
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

window._bggAddSetupSewingPreset = function() {
    _bggSyncSetupPresetsFromDOM();
    _bgg.tempSewingPresets.push({ icon: '👕', name: '', price: 0 });
    _bggRenderSetupPresets();
};

window._bggRemoveSetupSewingPreset = function(idx) {
    _bggSyncSetupPresetsFromDOM();
    _bgg.tempSewingPresets.splice(idx, 1);
    _bggRenderSetupPresets();
};

window._bggAddSetupCollarPreset = function() {
    _bggSyncSetupPresetsFromDOM();
    _bgg.tempCollarPresets.push({ icon: '👔', name: '', price: 0 });
    _bggRenderSetupPresets();
};

window._bggRemoveSetupCollarPreset = function(idx) {
    _bggSyncSetupPresetsFromDOM();
    _bgg.tempCollarPresets.splice(idx, 1);
    _bggRenderSetupPresets();
};

window._bggSaveSetupModal = function() {
    _bggSyncSetupPresetsFromDOM();
    
    // Save PET price and spacing
    const priceVal = Number(document.getElementById('setup_pet_sheet_price')?.value) || 0;
    const spacingVal = document.getElementById('setup_pet_spacing')?.value || '0.4';
    
    const mainPriceInput = document.getElementById('bgg_pet_sheet_price');
    if (mainPriceInput) mainPriceInput.value = priceVal;
    
    const mainSpacingInput = document.getElementById('bgg_pet_spacing');
    if (mainSpacingInput) mainSpacingInput.value = spacingVal;
    
    localStorage.setItem('tlcg_pet_sheet_price', priceVal);
    localStorage.setItem('tlcg_pet_spacing', spacingVal);
    _bgg.petSheetPrice = priceVal;
    _bgg.petSpacing = Number(spacingVal);
    
    // Save presets
    _bgg.sewingPresets = _bgg.tempSewingPresets;
    _bgg.collarPresets = _bgg.tempCollarPresets;
    localStorage.setItem('bgg_sewing_presets', JSON.stringify(_bgg.sewingPresets));
    localStorage.setItem('bgg_collar_presets', JSON.stringify(_bgg.collarPresets));
    
    // Refresh main form and trigger recalculation
    _bggRenderPresetsOnForm();
    _bggRenderCalcResults();
    
    if (typeof showToast === 'function') showToast('Đã lưu cấu hình chi phí và gợi ý!', 'success');
    _bggCloseSetupModal();
};

// ========== 3D PRINTING SUPPLIER PICKER (FOR STAFF) ==========
window._bggOpen3dPicker = function() {
    const existing = document.getElementById('bgg_3d_picker_modal');
    if (existing) existing.remove();

    const currentSupplier = _bgg.print3dSupplier || '';
    const qty = Number(document.getElementById('bgg_quantity')?.value) || 0;

    // Calculate prices for all suppliers
    const suppliersWithPrices = _BGG_3D_SUPPLIERS.map(s => {
        const calc = _bggCalc3dCost(qty, s.key);
        return {
            ...s,
            totalCost: calc.total || 0,
            needQty: calc.needQty || false
        };
    });

    // Sort by price: cheapest on top (ascending order of totalCost)
    if (qty > 0) {
        suppliersWithPrices.sort((a, b) => {
            if (a.totalCost > 0 && b.totalCost > 0) {
                return a.totalCost - b.totalCost;
            }
            if (a.totalCost > 0) return -1;
            if (b.totalCost > 0) return 1;
            return 0;
        });
    }

    const modal = document.createElement('div');
    modal.id = 'bgg_3d_picker_modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 11000; padding: 16px;';
    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; width: 100%; max-width: 440px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; overflow: hidden;">
            <div style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
                <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #0f172a;">🏭 Chọn Nhà Cung Cấp In 3D</h3>
                <button onclick="_bggClose3dPicker()" style="background: none; border: none; font-size: 20px; color: #64748b; cursor: pointer; padding: 4px;">&times;</button>
            </div>
            <div style="padding: 20px; display: flex; flex-direction: column; gap: 10px;">
                ${suppliersWithPrices.map(s => {
                    const priceText = qty <= 0 
                        ? '<span style="font-size: 11.5px; color: #e11d48; font-weight: 600;">(Chưa nhập SL)</span>' 
                        : (s.totalCost > 0 ? `<span style="font-size: 13.5px; color: #16a34a; font-weight: 800;">${s.totalCost.toLocaleString('vi-VN')}đ / áo</span>` : '<span style="font-size: 11.5px; color: #94a3b8; font-style: italic;">(Chưa config)</span>');
                    return `
                        <div onclick="_bggSelect3dSupplierFromPicker('${s.key}')" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border: 2px solid ${currentSupplier === s.key ? '#3b82f6' : '#e2e8f0'}; border-radius: 12px; cursor: pointer; transition: all 0.2s; background: ${currentSupplier === s.key ? '#eff6ff' : 'white'};" onmouseover="this.style.borderColor='#93c5fd'; this.style.background='#f8fafc'" onmouseout="this.style.borderColor='${currentSupplier === s.key ? '#3b82f6' : '#e2e8f0'}'; this.style.background='${currentSupplier === s.key ? '#eff6ff' : 'white'}'">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 20px; height: 20px; border-radius: 50%; border: 2px solid ${currentSupplier === s.key ? '#3b82f6' : '#cbd5e1'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                    ${currentSupplier === s.key ? '<div style="width: 10px; height: 10px; border-radius: 50%; background: #3b82f6;"></div>' : ''}
                                </div>
                                <div style="font-size: 14px; font-weight: 700; color: #1e293b;">${s.icon} ${s.name}</div>
                            </div>
                            <div style="font-size: 13.5px; font-weight: 700; color: #475569; flex-shrink: 0;">${priceText}</div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div style="padding: 12px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; background: #f8fafc;">
                <button onclick="_bggClose3dPicker()" style="padding: 8px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #475569; background: white; cursor: pointer;">Đóng</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window._bggClose3dPicker = function() {
    const modal = document.getElementById('bgg_3d_picker_modal');
    if (modal) modal.remove();
};

window._bggSelect3dSupplierFromPicker = function(key) {
    _bgg.print3dSupplier = key;
    _bgg.manuallySelected3dSupplier = true;
    _bggSave3dConfigs();
    _bggRender3dSupplierDisplay();
    _bggRenderCalcResults();
    _bggClose3dPicker();
    if (typeof showToast === 'function') {
        const supplier = _BGG_3D_SUPPLIERS.find(s => s.key === key);
        showToast(`Đã chọn ${supplier ? supplier.name : key}`, 'success');
    }
};

// ========== 3D PRINTING SETUP MODAL ==========

window._bggOpenSetup3dModal = function() {
    const existing = document.getElementById('bgg_setup_3d_modal');
    if (existing) existing.remove();

    let currentSupplier = _bgg.print3dSupplier || '';
    if ((!currentSupplier || !_BGG_3D_SUPPLIERS.some(s => s.key === currentSupplier)) && _BGG_3D_SUPPLIERS.length > 0) {
        currentSupplier = _BGG_3D_SUPPLIERS[0].key;
    }

    const modal = document.createElement('div');
    modal.id = 'bgg_setup_3d_modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 11000; padding: 16px;';

    // Supplier tabs
    const tabsHtml = _BGG_3D_SUPPLIERS.length > 0 ? _BGG_3D_SUPPLIERS.map(s => `
        <button onclick="_bggSelect3dSupplier('${s.key}')" style="padding: 8px 14px; border: 2px solid ${currentSupplier === s.key ? '#3b82f6' : '#e2e8f0'}; border-radius: 8px; font-size: 12px; font-weight: 700; color: ${currentSupplier === s.key ? '#1e40af' : '#64748b'}; background: ${currentSupplier === s.key ? '#eff6ff' : 'white'}; cursor: pointer; transition: all 0.2s; white-space: nowrap;">${s.icon} ${s.name}</button>
    `).join('') : '<div style="color: #64748b; font-size: 13px; font-style: italic;">Chưa cấu hình nhà in 3D nào. Vui lòng vào Quản Lý Lĩnh Vực In để thêm.</div>';

    // Pricing tables for selected supplier
    let pricingHtml = '';
    if (currentSupplier && _BGG_3D_SUPPLIERS.some(s => s.key === currentSupplier)) {
        const config = _bggGet3dConfig(currentSupplier);
        const mps = config?.meters_per_shirt || 0.8;
        const printTiers = config?.print_tiers || [];
        const laserTiers = config?.laser_tiers || [];

        const printRowsHtml = printTiers.map((t, i) => `
            <tr>
                <td style="padding: 6px 8px; border-bottom: 1px solid #f1f5f9;"><input type="text" inputmode="decimal" value="${t.min}" data-idx="${i}" data-field="print_min" style="width: 70px; padding: 4px 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px; text-align: center;" oninput="this.value = this.value.replace(/,/g, '.').replace(/[^0-9.]/g, '')"></td>
                <td style="padding: 6px 8px; border-bottom: 1px solid #f1f5f9;"><input type="text" inputmode="decimal" value="${t.max !== null && t.max !== '' ? t.max : ''}" data-idx="${i}" data-field="print_max" placeholder="∞" style="width: 70px; padding: 4px 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px; text-align: center;" oninput="this.value = this.value.replace(/,/g, '.').replace(/[^0-9.]/g, '')"></td>
                <td style="padding: 6px 8px; border-bottom: 1px solid #f1f5f9;"><input type="text" inputmode="decimal" value="${t.price}" data-idx="${i}" data-field="print_price" style="width: 80px; padding: 4px 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px; text-align: right;" oninput="this.value = this.value.replace(/,/g, '.').replace(/[^0-9.]/g, '')"></td>
                <td style="padding: 6px 4px; border-bottom: 1px solid #f1f5f9; text-align: center;"><button onclick="_bgg3dRemoveTier('print', ${i})" style="background: #fee2e2; border: none; color: #dc2626; width: 24px; height: 24px; border-radius: 4px; cursor: pointer; font-size: 12px;">✕</button></td>
            </tr>
        `).join('');

        const laserRowsHtml = laserTiers.map((t, i) => `
            <tr>
                <td style="padding: 6px 8px; border-bottom: 1px solid #f1f5f9;"><input type="text" inputmode="decimal" value="${t.min}" data-idx="${i}" data-field="laser_min" style="width: 70px; padding: 4px 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px; text-align: center;" oninput="this.value = this.value.replace(/,/g, '.').replace(/[^0-9.]/g, '')"></td>
                <td style="padding: 6px 8px; border-bottom: 1px solid #f1f5f9;"><input type="text" inputmode="decimal" value="${t.max !== null && t.max !== '' ? t.max : ''}" data-idx="${i}" data-field="laser_max" placeholder="∞" style="width: 70px; padding: 4px 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px; text-align: center;" oninput="this.value = this.value.replace(/,/g, '.').replace(/[^0-9.]/g, '')"></td>
                <td style="padding: 6px 8px; border-bottom: 1px solid #f1f5f9;"><input type="text" inputmode="decimal" value="${t.price}" data-idx="${i}" data-field="laser_price" style="width: 80px; padding: 4px 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px; text-align: right;" oninput="this.value = this.value.replace(/,/g, '.').replace(/[^0-9.]/g, '')"></td>
                <td style="padding: 6px 4px; border-bottom: 1px solid #f1f5f9; text-align: center;"><button onclick="_bgg3dRemoveTier('laser', ${i})" style="background: #fee2e2; border: none; color: #dc2626; width: 24px; height: 24px; border-radius: 4px; cursor: pointer; font-size: 12px;">✕</button></td>
            </tr>
        `).join('');

        pricingHtml = `
            <div style="margin-top: 16px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px; background: #f8fafc; padding: 10px 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <span style="font-size: 12px; font-weight: 700; color: #475569;">1 áo =</span>
                    <input type="text" id="setup_3d_mps" value="${mps}" style="width: 60px; padding: 4px 8px; border: 1.5px solid #3b82f6; border-radius: 6px; font-size: 13px; font-weight: 700; text-align: center; color: #1e40af;" oninput="this.value = this.value.replace(/,/g, '.').replace(/[^0-9.]/g, '')">
                    <span style="font-size: 12px; font-weight: 700; color: #475569;">mét</span>
                </div>

                <div style="margin-bottom: 14px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                        <h5 style="margin: 0; font-size: 12px; font-weight: 800; color: #1e40af;">📋 BẢNG GIÁ IN (đ/mét)</h5>
                        <button onclick="_bgg3dAddTier('print')" style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 4px; padding: 2px 8px; font-size: 10px; font-weight: 700; color: #1e40af; cursor: pointer;">➕ Thêm bậc</button>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead><tr style="background: #0f172a; color: white;">
                            <th style="padding: 6px 8px; text-align: center; font-size: 10px; color: white; font-weight: 700; background: #0f172a;">Từ (m)</th>
                            <th style="padding: 6px 8px; text-align: center; font-size: 10px; color: white; font-weight: 700; background: #0f172a;">Đến (m)</th>
                            <th style="padding: 6px 8px; text-align: right; font-size: 10px; color: white; font-weight: 700; background: #0f172a;">Giá/mét</th>
                            <th style="padding: 6px 4px; width: 32px; background: #0f172a;"></th>
                        </tr></thead>
                        <tbody id="setup_3d_print_rows">${printRowsHtml}</tbody>
                    </table>
                </div>

                <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                        <h5 style="margin: 0; font-size: 12px; font-weight: 800; color: #1e40af;">✂️ BẢNG GIÁ CẮT LAZE (đ/mét)</h5>
                        <button onclick="_bgg3dAddTier('laser')" style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 4px; padding: 2px 8px; font-size: 10px; font-weight: 700; color: #1e40af; cursor: pointer;">➕ Thêm bậc</button>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead><tr style="background: #0f172a; color: white;">
                            <th style="padding: 6px 8px; text-align: center; font-size: 10px; color: white; font-weight: 700; background: #0f172a;">Từ (m)</th>
                            <th style="padding: 6px 8px; text-align: center; font-size: 10px; color: white; font-weight: 700; background: #0f172a;">Đến (m)</th>
                            <th style="padding: 6px 8px; text-align: right; font-size: 10px; color: white; font-weight: 700; background: #0f172a;">Giá/mét</th>
                            <th style="padding: 6px 4px; width: 32px; background: #0f172a;"></th>
                        </tr></thead>
                        <tbody id="setup_3d_laser_rows">${laserRowsHtml}</tbody>
                    </table>
                    ${laserTiers.length === 0 ? '<div style="font-size: 11px; color: #94a3b8; text-align: center; padding: 8px; font-style: italic;">Không có cắt laze — chỉ tính phí in 3D</div>' : ''}
                </div>
        `;
    } else {
        pricingHtml = '<div style="margin-top: 16px; padding: 16px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; text-align: center; font-size: 12px; color: #64748b;">Chọn nhà cung cấp ở trên để xem và chỉnh sửa bảng giá</div>';
    }
    const hasSupplier = currentSupplier && _BGG_3D_SUPPLIERS.some(s => s.key === currentSupplier);
    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
            <div style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; background: white; z-index: 1; border-radius: 16px 16px 0 0;">
                <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">🎨 Setup Chi Phí In 3D</h3>
                <button onclick="_bggCloseSetup3dModal()" style="background: none; border: none; font-size: 20px; color: #64748b; cursor: pointer; padding: 4px;">&times;</button>
            </div>
            <div style="padding: 20px;">
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;">${tabsHtml}</div>
                ${pricingHtml}
            </div>
            <div style="padding: 14px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; background: #f8fafc; border-radius: 0 0 16px 16px; position: sticky; bottom: 0;">
                <button onclick="_bggCloseSetup3dModal()" style="padding: 8px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #475569; background: white; cursor: pointer;">Đóng</button>
                ${hasSupplier ? '<button onclick="_bgg3dSaveConfig()" style="padding: 8px 16px; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; color: white; background: linear-gradient(135deg, #3b82f6, #1d4ed8); cursor: pointer;">💾 Lưu bảng giá</button>' : ''}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window._bggCloseSetup3dModal = function() {
    const modal = document.getElementById('bgg_setup_3d_modal');
    if (modal) modal.remove();
};

window._bggSelect3dSupplier = function(key) {
    _bgg.print3dSupplier = key;
    _bggSave3dConfigs();
    _bggRender3dSupplierDisplay();
    _bggRenderCalcResults();
    _bggCloseSetup3dModal();
    _bggOpenSetup3dModal();
};

window._bgg3dTierChanged = function() { /* live edit — saved on button click */ };

window._bgg3dAddTier = function(type) {
    const supplierKey = _bgg.print3dSupplier;
    if (!supplierKey) return;
    const config = _bggGet3dConfig(supplierKey);
    if (type === 'print') {
        config.print_tiers.push({ min: 0, max: null, price: 0 });
    } else {
        config.laser_tiers.push({ min: 0, max: null, price: 0 });
    }
    _bggSave3dSupplierConfig(supplierKey, config);
    _bggCloseSetup3dModal();
    _bggOpenSetup3dModal();
};

window._bgg3dRemoveTier = function(type, idx) {
    const supplierKey = _bgg.print3dSupplier;
    if (!supplierKey) return;
    const config = _bggGet3dConfig(supplierKey);
    if (type === 'print') {
        config.print_tiers.splice(idx, 1);
    } else {
        config.laser_tiers.splice(idx, 1);
    }
    _bggSave3dSupplierConfig(supplierKey, config);
    _bggCloseSetup3dModal();
    _bggOpenSetup3dModal();
};

window._bgg3dSaveConfig = function() {
    const supplierKey = _bgg.print3dSupplier;
    if (!supplierKey) return;
    const mpsInput = document.getElementById('setup_3d_mps');
    const mps = parseFloat(mpsInput?.value?.replace(',', '.')) || 0.8;
    // Read print tiers from DOM
    const printTiers = [];
    document.querySelectorAll('[data-field="print_min"]').forEach(el => {
        const idx = Number(el.dataset.idx);
        if (!printTiers[idx]) printTiers[idx] = {};
        printTiers[idx].min = parseFloat(el.value.replace(',', '.')) || 0;
    });
    document.querySelectorAll('[data-field="print_max"]').forEach(el => {
        const idx = Number(el.dataset.idx);
        if (!printTiers[idx]) printTiers[idx] = {};
        const v = el.value.trim();
        printTiers[idx].max = (v === '' || v === '∞') ? null : parseFloat(v.replace(',', '.'));
    });
    document.querySelectorAll('[data-field="print_price"]').forEach(el => {
        const idx = Number(el.dataset.idx);
        if (!printTiers[idx]) printTiers[idx] = {};
        printTiers[idx].price = parseFloat(el.value.replace(',', '.')) || 0;
    });
    // Read laser tiers from DOM
    const laserTiers = [];
    document.querySelectorAll('[data-field="laser_min"]').forEach(el => {
        const idx = Number(el.dataset.idx);
        if (!laserTiers[idx]) laserTiers[idx] = {};
        laserTiers[idx].min = parseFloat(el.value.replace(',', '.')) || 0;
    });
    document.querySelectorAll('[data-field="laser_max"]').forEach(el => {
        const idx = Number(el.dataset.idx);
        if (!laserTiers[idx]) laserTiers[idx] = {};
        const v = el.value.trim();
        laserTiers[idx].max = (v === '' || v === '∞') ? null : parseFloat(v.replace(',', '.'));
    });
    document.querySelectorAll('[data-field="laser_price"]').forEach(el => {
        const idx = Number(el.dataset.idx);
        if (!laserTiers[idx]) laserTiers[idx] = {};
        laserTiers[idx].price = parseFloat(el.value.replace(',', '.')) || 0;
    });
    const config = { meters_per_shirt: mps, print_tiers: printTiers.filter(Boolean), laser_tiers: laserTiers.filter(Boolean) };
    _bggSave3dSupplierConfig(supplierKey, config);
    _bggRender3dSupplierDisplay();
    _bggRenderCalcResults();
    if (typeof showToast === 'function') showToast('Đã lưu bảng giá in 3D!', 'success');
    _bggCloseSetup3dModal();
};

// Autocomplete helpers for Chất liệu
window._bggRenderMaterialDropdown = function(filteredList) {
    const dropdown = document.getElementById('bgg_material_dropdown');
    if (!dropdown) return;
    
    const list = filteredList || _bgg.materials || [];
    if (list.length === 0) {
        dropdown.innerHTML = '<div style="padding: 10px; color: #94a3b8; font-size: 13px; font-style: italic; text-align: center;">Không tìm thấy chất liệu</div>';
        return;
    }
    
    dropdown.innerHTML = list.map(m => `
        <div onmousedown="_bggSelectMaterial('${m.id}', '${m.name.replace(/'/g, "\\'")}')" style="padding: 10px 14px; font-size: 13px; font-weight: 600; color: #1e293b; cursor: pointer; border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='white'">
            ${m.name}
        </div>
    `).join('');
};

window._bggShowMaterialDropdown = function() {
    const dropdown = document.getElementById('bgg_material_dropdown');
    if (dropdown) {
        dropdown.style.display = 'block';
        _bggRenderMaterialDropdown();
    }
};

window._bggFilterMaterials = function(query) {
    const q = query.trim().toLowerCase();
    const filtered = _bgg.materials.filter(m => m.name.toLowerCase().includes(q));
    _bggRenderMaterialDropdown(filtered);
};

window._bggCloseMaterialDropdown = function() {
    const dropdown = document.getElementById('bgg_material_dropdown');
    if (dropdown) dropdown.style.display = 'none';
};

window._bggSelectMaterial = function(id, name) {
    const searchInput = document.getElementById('bgg_material_search');
    const idInput = document.getElementById('bgg_material_id');
    if (searchInput && idInput) {
        idInput.value = id;
        searchInput.value = name;
        _bggHandleMaterialChange(id);
    }
    _bggCloseMaterialDropdown();
};

window._bggValidateMaterialSearch = function() {
    setTimeout(() => {
        const searchInput = document.getElementById('bgg_material_search');
        if (!searchInput) return;
        const query = searchInput.value.trim().toLowerCase();
        if (query === '') {
            document.getElementById('bgg_material_id').value = '';
            _bggHandleMaterialChange('');
            _bggCloseMaterialDropdown();
            return;
        }
        
        const match = _bgg.materials.find(m => m.name.trim().toLowerCase() === query);
        if (match) {
            document.getElementById('bgg_material_id').value = match.id;
            searchInput.value = match.name;
            _bggHandleMaterialChange(match.id);
        } else {
            const currentId = document.getElementById('bgg_material_id').value;
            const currentMat = _bgg.materials.find(m => String(m.id) === String(currentId));
            if (currentMat) {
                searchInput.value = currentMat.name;
            } else {
                searchInput.value = '';
                document.getElementById('bgg_material_id').value = '';
                _bggHandleMaterialChange('');
            }
        }
        _bggCloseMaterialDropdown();
    }, 200);
};

// Autocomplete helpers for Màu sắc
window._bggGetActiveColors = function() {
    const matId = document.getElementById('bgg_material_id')?.value;
    if (!matId) {
        return _bgg.colors || [];
    }
    return (_bgg.colors || []).filter(c => String(c.material_id) === String(matId));
};

window._bggRenderColorDropdown = function(filteredList) {
    const dropdown = document.getElementById('bgg_color_dropdown');
    if (!dropdown) return;
    
    const list = filteredList || _bggGetActiveColors();
    if (list.length === 0) {
        dropdown.innerHTML = '<div style="padding: 10px; color: #94a3b8; font-size: 13px; font-style: italic; text-align: center;">Không tìm thấy màu sắc</div>';
        return;
    }
    
    dropdown.innerHTML = list.map(c => `
        <div onmousedown="_bggSelectColor('${c.id}', '${c.color_name.replace(/'/g, "\\'")}')" style="padding: 10px 14px; font-size: 13px; font-weight: 600; color: #1e293b; cursor: pointer; border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='white'">
            ${c.color_name}
        </div>
    `).join('');
};

window._bggShowColorDropdown = function() {
    const dropdown = document.getElementById('bgg_color_dropdown');
    if (dropdown) {
        dropdown.style.display = 'block';
        _bggRenderColorDropdown();
    }
};

window._bggFilterColors = function(query) {
    const q = query.trim().toLowerCase();
    const activeList = _bggGetActiveColors();
    const filtered = activeList.filter(c => c.color_name.toLowerCase().includes(q));
    _bggRenderColorDropdown(filtered);
};

window._bggCloseColorDropdown = function() {
    const dropdown = document.getElementById('bgg_color_dropdown');
    if (dropdown) dropdown.style.display = 'none';
};

window._bggSelectColor = function(id, name) {
    const searchInput = document.getElementById('bgg_color_search');
    const idInput = document.getElementById('bgg_color_id');
    if (searchInput && idInput) {
        idInput.value = id;
        searchInput.value = name;
    }
    _bggCloseColorDropdown();
};

window._bggValidateColorSearch = function() {
    setTimeout(() => {
        const searchInput = document.getElementById('bgg_color_search');
        if (!searchInput) return;
        const query = searchInput.value.trim().toLowerCase();
        if (query === '') {
            document.getElementById('bgg_color_id').value = '';
            _bggCloseColorDropdown();
            return;
        }
        
        const activeList = _bggGetActiveColors();
        const match = activeList.find(c => c.color_name.trim().toLowerCase() === query);
        if (match) {
            document.getElementById('bgg_color_id').value = match.id;
            searchInput.value = match.color_name;
        } else {
            const currentId = document.getElementById('bgg_color_id').value;
            const currentCol = activeList.find(c => String(c.id) === String(currentId));
            if (currentCol) {
                searchInput.value = currentCol.color_name;
            } else {
                searchInput.value = '';
                document.getElementById('bgg_color_id').value = '';
            }
        }
        _bggCloseColorDropdown();
    }, 200);
};

// ========== SCREEN PRINTING PICKER & SETUP MODALS ==========

window._bggOpenScreenPicker = function() {
    const existing = document.getElementById('bgg_screen_picker_modal');
    if (existing) existing.remove();

    const currentSupplier = _bgg.screenSupplier || '';

    const modal = document.createElement('div');
    modal.id = 'bgg_screen_picker_modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 11000; padding: 16px;';
    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; width: 100%; max-width: 400px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; overflow: hidden; font-family: 'Inter', sans-serif;">
            <div style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
                <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #0f172a;">🎨 Chọn Nhà Cung Cấp In Lưới</h3>
                <button onclick="_bggCloseScreenPicker()" style="background: none; border: none; font-size: 20px; color: #64748b; cursor: pointer; padding: 4px;">&times;</button>
            </div>
            <div style="padding: 20px; display: flex; flex-direction: column; gap: 10px;">
                ${_BGG_SCREEN_SUPPLIERS.length > 0 ? _BGG_SCREEN_SUPPLIERS.map(s => `
                    <div onclick="_bggSelectScreenSupplierFromPicker('${s.key}')" style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; border: 2px solid ${currentSupplier === s.key ? '#db2777' : '#e2e8f0'}; border-radius: 12px; cursor: pointer; transition: all 0.2s; background: ${currentSupplier === s.key ? '#fdf2f8' : 'white'};" onmouseover="this.style.borderColor='#fbcfe8'; this.style.background='#f8fafc'" onmouseout="this.style.borderColor='${currentSupplier === s.key ? '#db2777' : '#e2e8f0'}'; this.style.background='${currentSupplier === s.key ? '#fdf2f8' : 'white'}'">
                        <div style="width: 20px; height: 20px; border-radius: 50%; border: 2px solid ${currentSupplier === s.key ? '#db2777' : '#cbd5e1'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            ${currentSupplier === s.key ? '<div style="width: 10px; height: 10px; border-radius: 50%; background: #db2777;"></div>' : ''}
                        </div>
                        <div style="font-size: 14px; font-weight: 700; color: #1e293b;">${s.icon} ${s.name}</div>
                    </div>
                `).join('') : `
                    <div style="text-align: center; padding: 20px 10px; border: 2px dashed #fca5a5; border-radius: 12px; background: #fef2f2; color: #b91c1c; font-size: 13px; font-weight: 600; line-height: 1.5;">
                        ⚠️ Chưa cấu hình nhà in lưới nào!<br>
                        Vui lòng vào <strong>⚙️ Quản Lý Lĩnh Vực In & Nhân Sự</strong> để cấu hình (tích chọn In Lưới Viên).
                    </div>
                `}
            </div>
            <div style="padding: 12px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; background: #f8fafc;">
                <button onclick="_bggCloseScreenPicker()" style="padding: 8px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #475569; background: white; cursor: pointer;">Đóng</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window._bggCloseScreenPicker = function() {
    const modal = document.getElementById('bgg_screen_picker_modal');
    if (modal) modal.remove();
};

window._bggSelectScreenSupplierFromPicker = function(key) {
    _bgg.screenSupplier = key;
    _bggSaveScreenConfigs();
    _bggRenderScreenSupplierDisplay();
    _bggRenderCalcResults();
    _bggCloseScreenPicker();
    if (typeof showToast === 'function') {
        const supplier = _BGG_SCREEN_SUPPLIERS.find(s => s.key === key);
        showToast(`Đã chọn ${supplier ? supplier.name : key}`, 'success');
    }
};

window._bggOpenSetupScreenModal = function() {
    const existing = document.getElementById('bgg_setup_screen_modal');
    if (existing) existing.remove();

    let currentSupplier = _bgg.screenSupplier || '';
    if (!currentSupplier && _BGG_SCREEN_SUPPLIERS.length > 0) {
        currentSupplier = _BGG_SCREEN_SUPPLIERS[0].key;
    }

    const modal = document.createElement('div');
    modal.id = 'bgg_setup_screen_modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 11000; padding: 16px;';

    // Supplier tabs
    const tabsHtml = _BGG_SCREEN_SUPPLIERS.length > 0 ? _BGG_SCREEN_SUPPLIERS.map(s => `
        <button onclick="_bggSelectScreenSupplier('${s.key}')" style="padding: 8px 14px; border: 2px solid ${currentSupplier === s.key ? '#db2777' : '#e2e8f0'}; border-radius: 8px; font-size: 12px; font-weight: 700; color: ${currentSupplier === s.key ? '#9d174d' : '#64748b'}; background: ${currentSupplier === s.key ? '#fdf2f8' : 'white'}; cursor: pointer; transition: all 0.2s; white-space: nowrap;">${s.icon} ${s.name}</button>
    `).join('') : '<div style="color: #64748b; font-size: 13px; font-style: italic;">Chưa cấu hình nhà in lưới nào. Vui lòng vào Quản Lý Lĩnh Vực In để thêm.</div>';

    let pricingHtml = '';
    if (currentSupplier && _BGG_SCREEN_SUPPLIERS.some(s => s.key === currentSupplier)) {
        const config = _bggGetScreenConfig(currentSupplier);
        const threshold = config.qty_threshold;
        const priceLow = config.price_low;
        const priceHigh13 = config.price_high_1_3;
        const priceHigh4Plus = config.price_high_4_plus;

        pricingHtml = `
            <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 14px; font-family: 'Inter', sans-serif;">
                <div style="background: #fdf2f8; padding: 12px; border-radius: 8px; border: 1px solid #fbcfe8;">
                    <div style="font-weight: 800; font-size: 11px; color: #9d174d; text-transform: uppercase; margin-bottom: 8px;">⚙️ Thiết lập ngưỡng số lượng & Giá in</div>
                    
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                            <span style="font-size: 12px; font-weight: 700; color: #475569;">Ngưỡng số lượng ít:</span>
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <input type="number" id="setup_screen_threshold" value="${threshold}" style="width: 80px; padding: 4px 8px; border: 1.5px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 700; text-align: center;">
                                <span style="font-size: 11px; color: #64748b; font-weight: 600;">áo</span>
                            </div>
                        </div>
                        
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                            <span style="font-size: 12px; font-weight: 700; color: #475569;">Dưới ngưỡng (gộp cả đơn):</span>
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <input type="number" id="setup_screen_price_low" value="${priceLow}" style="width: 100px; padding: 4px 8px; border: 1.5px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 700; text-align: right;">
                                <span style="font-size: 11px; color: #64748b; font-weight: 600;">đ/màu/đơn</span>
                            </div>
                        </div>

                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; border-top: 1px dashed #fbcfe8; padding-top: 10px;">
                            <span style="font-size: 12px; font-weight: 700; color: #475569;">Trên/bằng ngưỡng (1-3 màu):</span>
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <input type="number" id="setup_screen_price_high_1_3" value="${priceHigh13}" style="width: 100px; padding: 4px 8px; border: 1.5px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 700; text-align: right;">
                                <span style="font-size: 11px; color: #64748b; font-weight: 600;">đ/màu/áo</span>
                            </div>
                        </div>

                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                            <span style="font-size: 12px; font-weight: 700; color: #475569;">Trên/bằng ngưỡng (≥ 4 màu):</span>
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <input type="number" id="setup_screen_price_high_4_plus" value="${priceHigh4Plus}" style="width: 100px; padding: 4px 8px; border: 1.5px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 700; text-align: right;">
                                <span style="font-size: 11px; color: #64748b; font-weight: 600;">đ/màu/áo</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else {
        pricingHtml = '<div style="margin-top: 16px; padding: 16px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; text-align: center; font-size: 12px; color: #64748b; font-family: \'Inter\', sans-serif;">Chọn nhà cung cấp ở trên để xem và chỉnh sửa bảng giá</div>';
    }

    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; font-family: 'Inter', sans-serif;">
            <div style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; background: white; z-index: 1; border-radius: 16px 16px 0 0;">
                <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">🎨 Setup Chi Phí In Lưới</h3>
                <button onclick="_bggCloseSetupScreenModal()" style="background: none; border: none; font-size: 20px; color: #64748b; cursor: pointer; padding: 4px;">&times;</button>
            </div>
            <div style="padding: 20px;">
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;">${tabsHtml}</div>
                ${pricingHtml}
            </div>
            <div style="padding: 14px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; background: #f8fafc; border-radius: 0 0 16px 16px; position: sticky; bottom: 0;">
                <button onclick="_bggCloseSetupScreenModal()" style="padding: 8px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #475569; background: white; cursor: pointer;">Đóng</button>
                ${currentSupplier ? '<button onclick="_bggScreenSaveConfig()" style="padding: 8px 16px; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; color: white; background: linear-gradient(135deg, #db2777, #be185d); cursor: pointer;">💾 Lưu bảng giá</button>' : ''}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window._bggCloseSetupScreenModal = function() {
    const modal = document.getElementById('bgg_setup_screen_modal');
    if (modal) modal.remove();
};

window._bggSelectScreenSupplier = function(key) {
    _bgg.screenSupplier = key;
    _bggSaveScreenConfigs();
    _bggRenderScreenSupplierDisplay();
    _bggRenderCalcResults();
    _bggCloseSetupScreenModal();
    _bggOpenSetupScreenModal();
};

window._bggScreenSaveConfig = function() {
    const supplierKey = _bgg.screenSupplier;
    if (!supplierKey) return;
    
    const threshold = Number(document.getElementById('setup_screen_threshold')?.value) || 20;
    const priceLow = Number(document.getElementById('setup_screen_price_low')?.value) || 50000;
    const priceHigh13 = Number(document.getElementById('setup_screen_price_high_1_3')?.value) || 3000;
    const priceHigh4Plus = Number(document.getElementById('setup_screen_price_high_4_plus')?.value) || 2500;

    const config = {
        qty_threshold: threshold,
        price_low: priceLow,
        price_high_1_3: priceHigh13,
        price_high_4_plus: priceHigh4Plus
    };
    
    localStorage.setItem('bgg_screen_config_' + supplierKey, JSON.stringify(config));
    
    if (typeof showToast === 'function') {
        showToast('Đã lưu cấu hình in Lưới!', 'success');
    }
    _bggCloseSetupScreenModal();
    _bggRenderScreenSupplierDisplay();
    _bggRenderCalcResults();
};

window._bggNavigateToGiaGoc = function(searchQuery) {
    const state = {
        filter: {
            tab: 'approved',
            search: searchQuery,
            supplierId: 'all',
            supplierSearch: '',
            type: 'material'
        },
        sidebarExpanded: {
            fabric: true,
            material: true
        }
    };
    sessionStorage.setItem('gng_state', JSON.stringify(state));
    if (typeof navigate === 'function') {
        navigate('gia-nhap-goc');
    }
};
