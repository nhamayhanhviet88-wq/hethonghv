// ========== MAKET & CHẤM MÀU THIẾT KẾ — BỘ PHẬN THIẾT KẾ HV ==========
// Executive Design & Font matched 100% with Quản Trị Nhân Sự & Hành Chính HV (Ảnh 2, 3, 4, 5)
(function () {
    'use strict';

    let currentMainTab = localStorage.getItem('cmtk_main_tab') || 'muc1_maket'; // 'muc1_maket' | 'muc2_chammau'
    let activeSubtab = localStorage.getItem('cmtk_active_subtab') || 'all';
    let activeCategoryFilter = 'all'; // Department/Category Filter

    let maketList = [];
    let fabricsData = { warehouses: [], materials: [], colors: [] };
    let swatchesMap = {};
    let currentSearchQuery = '';
    let selectedMaterialFilter = 'all';
    let selectedWarehouseFilter = 'all';

    // State management for Categories (Bộ Phận / Loại Maket) and Subtabs (Mục)
    const DEFAULT_DEPARTMENTS = ['Chung', 'Áo Phông', 'Áo Khoác', 'Đồng Phục Công Ty', 'Áo Lớp / Trường Học', 'Áo Mẫu / BST'];
    const DEFAULT_SUBTABS = [
        { id: 'mk_thuvien', title: 'Kho Lưu Trữ Bản Maket', icon: '🎨', isCustom: false },
        { id: 'mk_quytrinh', title: 'Quy Trình & Hướng Dẫn Thiết Kế', icon: '📋', isCustom: false }
    ];

    let editingSubtabIndex = -1;
    let editingDeptIndex = -1;
    let activeModalTab = 'tab1';

    function getSubtabs() {
        try {
            const raw = localStorage.getItem('cmtk_subtabs_store');
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}
        return DEFAULT_SUBTABS;
    }

    function saveSubtabs(subtabs) {
        localStorage.setItem('cmtk_subtabs_store', JSON.stringify(subtabs));
        syncSaveToServer();
    }

    function getDepartments() {
        try {
            const raw = localStorage.getItem('cmtk_depts_store');
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}
        return DEFAULT_DEPARTMENTS;
    }

    function saveDepartments(depts) {
        localStorage.setItem('cmtk_depts_store', JSON.stringify(depts));
        syncSaveToServer();
    }

    // Sync state to server config
    let _syncSaveTimer = null;
    function syncSaveToServer() {
        if (_syncSaveTimer) clearTimeout(_syncSaveTimer);
        _syncSaveTimer = setTimeout(async () => {
            try {
                const payload = {
                    makets: maketList,
                    subtabs: getSubtabs(),
                    departments: getDepartments()
                };
                await fetch('/api/chammauthietke/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ value: payload })
                });
            } catch (e) {
                console.warn('[CMTK Sync Save Error]', e);
            }
        }, 500);
    }

    // Toast Notification Utility
    function showToast(msg, type = 'success') {
        let toast = document.getElementById('cmtkToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'cmtkToast';
            toast.className = 'cmtk-toast';
            document.body.appendChild(toast);
        }
        toast.innerText = msg;
        toast.style.background = type === 'error' ? '#ef4444' : '#10b981';
        toast.classList.add('show');
        setTimeout(() => { toast.classList.remove('show'); }, 2800);
    }

    // Canvas Image Compression (High quality display preview)
    function compressImage(file, maxDimension = 1800, quality = 0.90) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;
                    if (width > maxDimension || height > maxDimension) {
                        if (width > height) {
                            height = Math.round((height * maxDimension) / width);
                            width = maxDimension;
                        } else {
                            width = Math.round((width * maxDimension) / height);
                            height = maxDimension;
                        }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);
                    const mimeType = (file.type === 'image/png') ? 'image/png' : 'image/jpeg';
                    const dataUrl = canvas.toDataURL(mimeType, quality);
                    resolve(dataUrl);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    }

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    }

    // Fetch All Data
    async function loadData() {
        try {
            const [cfgRes, fabRes] = await Promise.all([
                fetch('/api/chammauthietke/config'),
                fetch('/api/chammauthietke/fabrics')
            ]);
            const cfgData = await cfgRes.json();
            const fabData = await fabRes.json();

            if (cfgData && cfgData.success) {
                const val = cfgData.makets || cfgData.value || [];
                if (Array.isArray(val)) {
                    maketList = val;
                } else if (typeof val === 'object') {
                    maketList = val.makets || [];
                    if (val.subtabs) localStorage.setItem('cmtk_subtabs_store', JSON.stringify(val.subtabs));
                    if (val.departments) localStorage.setItem('cmtk_depts_store', JSON.stringify(val.departments));
                }
                swatchesMap = cfgData.swatches || {};
            }
            if (fabData && fabData.success) {
                fabricsData = fabData;
            }
        } catch (e) {
            console.error('[CMTK] Error loading data:', e);
        }
    }

    // Main Init Function matching Quản Trị Nhân Sự (Ảnh 4)
    function initPage(targetContainer = null) {
        const root = targetContainer || document.getElementById('contentArea') || document.getElementById('mainContent') || document.querySelector('.content-area') || document.querySelector('.main-content');
        if (!root) return;

        root.innerHTML = `
            <div class="cmtk-wrapper">
                <!-- Top Executive Banner Header (Matched with Quản Trị Nhân Sự) -->
                <div class="cmtk-header">
                    <div class="cmtk-header-left">
                        <div class="cmtk-icon-bg">🎨</div>
                        <div>
                            <h1 class="cmtk-title">BỘ PHẬN THIẾT KẾ — MAKET & CHẤM MÀU THIẾT KẾ</h1>
                            <p class="cmtk-subtitle">Kho Lưu Trữ Bản Thiết Kế Maket Áo Mẫu và Công Cụ Chấm Màu Chuẩn Màu Kho Vải Thực Tế</p>
                        </div>
                    </div>
                    <div class="cmtk-header-right">
                        <span style="background:#22c55e; color:#ffffff; font-weight:850; font-size:12px; padding:6px 14px; border-radius:20px; box-shadow:0 4px 12px rgba(34,197,94,0.3);">● Hệ Thống Hoạt Động</span>
                    </div>
                </div>

                <!-- Level 1 Main Tabs Navigation (Grid 2 Card Lớn Matched Image 4 100%) -->
                <div class="cmtk-tabs-main">
                    <button class="cmtk-tab-btn ${currentMainTab === 'muc1_maket' ? 'active' : ''}" data-maintab="muc1_maket" onclick="window._cmtkSwitchMainTab('muc1_maket')">
                        <span class="tab-num">MỤC 1</span>
                        <span class="tab-label">🎨 1. Kho Lưu Trữ Bản Maket</span>
                    </button>
                    <button class="cmtk-tab-btn ${currentMainTab === 'muc2_chammau' ? 'active' : ''}" data-maintab="muc2_chammau" onclick="window._cmtkSwitchMainTab('muc2_chammau')">
                        <span class="tab-num">MỤC 2</span>
                        <span class="tab-label">🧵 2. Chấm Màu Thiết Kế & Kho Vải</span>
                    </button>
                </div>

                <!-- Main Dynamic Content Container -->
                <div class="cmtk-content-container" id="cmtkContentContainer">
                </div>
            </div>

            ${_cmtkGetStyles()}
        `;

        renderCurrentMainTab();
        loadData().then(() => renderCurrentMainTab());
    }

    window._cmtkSwitchMainTab = function (tabId) {
        currentMainTab = tabId;
        localStorage.setItem('cmtk_main_tab', tabId);
        document.querySelectorAll('.cmtk-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-maintab') === tabId);
        });
        renderCurrentMainTab();
    };

    function renderCurrentMainTab() {
        const container = document.getElementById('cmtkContentContainer');
        if (!container) return;
        if (currentMainTab === 'muc1_maket') renderTab1Maket(container);
        else renderTab2Chammau(container);
    }

    window._cmtkSwitchSubtab = function(subId) {
        activeSubtab = subId;
        localStorage.setItem('cmtk_active_subtab', subId);
        renderCurrentMainTab();
    };

    // Filter Change Handlers
    window._cmtkOnFilterWarehouseChange = function(whId) {
        selectedWarehouseFilter = whId;
        // Kiểm tra xem chất liệu đang chọn có thuộc Kho Vải mới chọn không, nếu không thì reset về 'all'
        if (selectedWarehouseFilter !== 'all' && selectedMaterialFilter !== 'all') {
            const allMaterials = fabricsData.materials || [];
            const isMatValid = allMaterials.some(m => String(m.warehouse_id) === String(selectedWarehouseFilter) && (String(m.id) === String(selectedMaterialFilter) || m.name === selectedMaterialFilter));
            if (!isMatValid) {
                selectedMaterialFilter = 'all';
            }
        }
        const container = document.getElementById('cmtkContentContainer');
        if (container) renderTab2Chammau(container);
    };

    window._cmtkOnFilterMatChange = function(matId) {
        selectedMaterialFilter = matId;
        const container = document.getElementById('cmtkContentContainer');
        if (currentMainTab === 'muc1_maket') {
            const grid = document.getElementById('cmtkCardGridContainer');
            if (grid) grid.innerHTML = _cmtkRenderMaketCardsHTML();
        } else {
            if (container) renderTab2Chammau(container);
        }
    };

    window._cmtkOnSearchMaket = function(val) {
        currentSearchQuery = val || '';
        if (currentMainTab === 'muc1_maket') {
            const grid = document.getElementById('cmtkCardGridContainer');
            if (grid) grid.innerHTML = _cmtkRenderMaketCardsHTML();
        } else {
            const grid = document.getElementById('cmtkSwatchesGridContainer');
            if (grid) grid.innerHTML = _cmtkRenderSwatchesCardsHTML();
        }
    };

    window._cmtkCopyHex = function(hex, colorName) {
        if (!hex) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(hex).then(() => {
                showToast(`✅ Đã sao chép mã màu ${hex} (${colorName})!`);
            }).catch(() => {
                _fallbackCopyText(hex, colorName);
            });
        } else {
            _fallbackCopyText(hex, colorName);
        }
    };

    function _fallbackCopyText(hex, colorName) {
        const input = document.createElement('input');
        input.value = hex;
        document.body.appendChild(input);
        input.select();
        try {
            document.execCommand('copy');
            showToast(`✅ Đã sao chép mã màu ${hex} (${colorName})!`);
        } catch (e) {
            showToast(`Mã màu: ${hex}`);
        }
        document.body.removeChild(input);
    }

    // ==========================================
    // TAB 1: KHO LƯU TRỮ BẢN MAKET
    // ==========================================
    function renderTab1Maket(container) {
        const matSet = new Set(maketList.map(m => m.fabricMaterial).filter(Boolean));
        const depts = getDepartments();
        const subtabs = getSubtabs();

        container.innerHTML = `
            <!-- Search Bar (Matched Image 3) -->
            <div style="margin-bottom: 20px; position: relative;">
                <div style="position: relative; display: flex; align-items: center;">
                    <span style="position: absolute; left: 18px; font-size: 18px; color: #7c3aed; pointer-events: none; z-index: 2;">🔍</span>
                    <input type="text" id="cmtkSearchMaketInput" value="${currentSearchQuery}" 
                        placeholder="Tìm kiếm mẫu Maket, tên khách hàng, trường học, chất liệu..." 
                        style="width: 100%; border: 2px solid #e9d5ff; border-radius: 18px; padding: 13px 48px 13px 48px; font-size: 14.5px; font-weight: 700; background: #ffffff; outline: none; color: #0f172a; box-shadow: 0 4px 16px rgba(124,58,237,0.08);"
                        oninput="window._cmtkOnSearchMaket(this.value)">
                </div>
            </div>

            <!-- Subtabs Bar + Action Buttons (Matched Image 3 100%) -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; flex-wrap: wrap; gap: 14px; background: linear-gradient(135deg, rgba(250,245,255,0.95), rgba(243,232,255,0.98)); backdrop-filter: blur(16px); padding: 14px 22px; border-radius: 20px; border: 1.5px solid #e9d5ff; box-shadow: 0 12px 32px -8px rgba(109,40,217,0.15);">
                <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
                    ${subtabs.map(st => `
                        <button type="button" class="cmtk-subtab-btn ${activeSubtab === st.id ? 'active' : ''}" onclick="window._cmtkSwitchSubtab('${st.id}')"
                            style="display:inline-flex; align-items:center; gap:8px; font-size:14px; font-weight:850; padding:10px 22px; border-radius:30px; cursor:pointer; ${activeSubtab === st.id ? 'background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; border:none; box-shadow:0 6px 18px rgba(109,40,217,0.45);' : 'background:#ffffff; color:#0f172a; border:1.5px solid #cbd5e1;'}">
                            ${st.icon || '🎨'} ${st.title}
                        </button>
                    `).join('')}
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <button type="button" onclick="window._cmtkOpenAddMaketModal()" style="border-radius:14px; padding:10px 20px; font-size:13.5px; font-weight:900; background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; border:none; box-shadow:0 6px 18px rgba(109,40,217,0.35); cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                        ➕ Tạo Bản Maket Mới
                    </button>
                    <button type="button" onclick="window._cmtkOpenSubtabModal()" style="border-radius:14px; padding:10px 20px; font-size:13.5px; font-weight:900; background:rgba(255,255,255,0.95); color:#6d28d9; border:1.5px solid #d8b4fe; box-shadow:0 4px 14px rgba(109,40,217,0.15); cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                        ⚙️ Cài Đặt Mục
                    </button>
                </div>
            </div>

            <!-- Department / Category Filter Bar (Matched Image 3 100%) -->
            <div style="display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 14px 22px; border-radius: 18px; border: 1.5px solid #e9d5ff; margin-bottom: 22px; box-shadow: 0 4px 14px rgba(109,40,217,0.04); flex-wrap: wrap; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span style="font-size: 13.5px; font-weight: 900; color: #4c1d95; margin-right: 4px;">🏢 Bộ phận / Loại:</span>
                    <button type="button" class="cmtk-dept-pill ${activeCategoryFilter === 'all' ? 'active' : ''}" data-dept="all" onclick="window._cmtkSetCategoryFilter('all')">
                        🌐 Tất Cả (${maketList.length})
                    </button>
                    ${depts.map(dept => {
                        const count = maketList.filter(m => (m.departments || []).includes(dept) || m.category === dept).length;
                        const safeDept = dept.replace(/'/g, "\\'");
                        const attrDept = dept.replace(/"/g, '&quot;');
                        return `
                            <button type="button" class="cmtk-dept-pill ${activeCategoryFilter === dept ? 'active' : ''}" data-dept="${attrDept}" onclick="window._cmtkSetCategoryFilter('${safeDept}')">
                                📋 ${dept} (${count})
                            </button>
                        `;
                    }).join('')}
                </div>
                <div>
                    <button type="button" onclick="window._cmtkOpenDepartmentModal()" style="border-radius:12px; padding:9px 18px; font-size:13.5px; font-weight:800; border:1.5px solid #d8b4fe; color:#6d28d9; background:#ffffff; cursor:pointer;">
                        ⚙️ Cài Đặt Bộ Phận
                    </button>
                </div>
            </div>

            <!-- Material Sub-Filter Bar -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; flex-wrap: wrap; gap: 14px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 13.5px; font-weight: 850; color: #475569;">Lọc Theo Chất Liệu Vải:</span>
                </div>
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <select id="cmtkFilterMatSelect" onchange="window._cmtkOnFilterMatChange(this.value)" 
                        style="border: 2px solid #e9d5ff; border-radius: 14px; padding: 8px 16px; font-size: 13px; font-weight: 800; color: #6d28d9; background: #ffffff; outline: none; cursor: pointer;">
                        <option value="all">🌐 Tất Cả Chất Liệu (${maketList.length})</option>
                        ${Array.from(matSet).map(mat => `<option value="${mat}" ${selectedMaterialFilter === mat ? 'selected' : ''}>🧵 ${mat}</option>`).join('')}
                    </select>
                </div>
            </div>

            <div id="cmtkCardGridContainer">
                ${_cmtkRenderMaketCardsHTML()}
            </div>
        `;
    }

    window._cmtkSetCategoryFilter = function(dept) {
        activeCategoryFilter = dept;
        
        // Cập nhật trạng thái active cho tất cả các button bộ phận / loại
        document.querySelectorAll('.cmtk-dept-pill').forEach(btn => {
            const bDept = btn.getAttribute('data-dept');
            if (bDept === String(dept)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        const grid = document.getElementById('cmtkCardGridContainer');
        if (grid) grid.innerHTML = _cmtkRenderMaketCardsHTML();
        else renderCurrentMainTab();
    };

    function _cmtkRenderMaketCardsHTML() {
        let filtered = maketList.filter(item => {
            const q = currentSearchQuery.toLowerCase().trim();
            const matchQ = !q || (item.title || '').toLowerCase().includes(q) || (item.customerName || '').toLowerCase().includes(q) || (item.fabricMaterial || '').toLowerCase().includes(q);
            const matchMat = selectedMaterialFilter === 'all' || item.fabricMaterial === selectedMaterialFilter;
            const matchDept = activeCategoryFilter === 'all' || (item.departments || []).includes(activeCategoryFilter) || item.category === activeCategoryFilter;

            let matchSubtab = true;
            if (activeSubtab === 'mk_thuvien') {
                matchSubtab = !item.category || item.category === 'Kho Lưu Trữ Bản Maket';
            } else if (activeSubtab === 'mk_quytrinh') {
                matchSubtab = item.category === 'Quy Trình & Hướng Dẫn';
            }

            return matchQ && matchMat && matchDept && matchSubtab;
        });

        if (filtered.length === 0) {
            return `
                <div style="text-align: center; padding: 60px 20px; background: #ffffff; border-radius: 24px; border: 2px dashed #cbd5e1;">
                    <div style="font-size: 48px; margin-bottom: 12px;">🎨</div>
                    <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 900; color: #334155;">Chưa có bản thiết kế Maket nào trong thư viện</h3>
                </div>
            `;
        }

        return `
            <div class="cmtk-card-grid">
                ${filtered.map(item => `
                    <div class="cmtk-card-item">
                        <div class="card-accent-bar theme-purple"></div>
                        <div style="position: relative; width: 100%; height: 210px; background: #0f172a; cursor: pointer; overflow: hidden;" onclick="window._cmtkOpenDetailModal('${item.id}')">
                            ${item.imageUrl ? `<img src="${item.imageUrl}" style="width: 100%; height: 100%; object-fit: contain;">` : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px; background: #1e293b; color: #475569;">🎨</div>`}
                        </div>
                        <div class="card-inner">
                            <div style="font-size: 11px; font-weight: 850; color: #7c3aed; text-transform: uppercase; margin-bottom: 4px;">🏢 ${item.customerName || 'Khách Hàng'}</div>
                            <h3 class="card-title">${item.title || 'Mẫu Maket'}</h3>
                            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px;">
                                ${(item.departments || []).map(dept => `<span class="card-badge theme-purple">📌 ${dept}</span>`).join('')}
                                ${item.fabricMaterial ? `<span class="card-badge theme-blue">🧵 ${item.fabricMaterial}</span>` : ''}
                            </div>
                            <button type="button" onclick="window._cmtkOpenDetailModal('${item.id}')" class="card-btn-open">📋 Xem Chi Tiết ➔</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderTab2Chammau(container) {
        const warehouses = fabricsData.warehouses || [];
        const allMaterials = fabricsData.materials || [];
        
        // Lọc danh sách chất liệu ĐỘNG theo Kho Vải được chọn!
        const materials = selectedWarehouseFilter === 'all'
            ? allMaterials
            : allMaterials.filter(m => String(m.warehouse_id) === String(selectedWarehouseFilter));

        container.innerHTML = `
            <!-- Search Bar -->
            <div style="margin-bottom: 20px; position: relative;">
                <div style="position: relative; display: flex; align-items: center;">
                    <span style="position: absolute; left: 18px; font-size: 18px; color: #7c3aed; pointer-events: none; z-index: 2;">🔍</span>
                    <input type="text" id="cmtkSearchColorInput" value="${currentSearchQuery}" 
                        placeholder="Tìm mã màu HEX, tên màu vải, chất liệu..." 
                        style="width: 100%; border: 2px solid #e9d5ff; border-radius: 18px; padding: 13px 48px 13px 48px; font-size: 14.5px; font-weight: 700; background: #ffffff; outline: none; color: #0f172a; box-shadow: 0 4px 16px rgba(124,58,237,0.08);"
                        oninput="window._cmtkOnSearchMaket(this.value)">
                </div>
            </div>

            <!-- Warehouse & Material Filters Bar -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; flex-wrap: wrap; gap: 14px; background: #ffffff; padding: 14px 22px; border-radius: 18px; border: 1.5px solid #e9d5ff; box-shadow: 0 4px 14px rgba(109,40,217,0.04);">
                <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 13.5px; font-weight: 850; color: #5b21b6;">Kho Vải:</span>
                        <select id="cmtkFilterWhSelect" onchange="window._cmtkOnFilterWarehouseChange(this.value)" 
                            style="border: 2px solid #e9d5ff; border-radius: 14px; padding: 8px 14px; font-size: 13px; font-weight: 800; color: #6d28d9; background: #ffffff; outline: none; cursor: pointer;">
                            <option value="all">🏬 Tất Cả Kho Vải (${warehouses.length})</option>
                            ${warehouses.map(w => `<option value="${w.id}" ${String(selectedWarehouseFilter) === String(w.id) ? 'selected' : ''}>🏬 ${w.name}</option>`).join('')}
                        </select>
                    </div>

                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 13.5px; font-weight: 850; color: #5b21b6;">Chất Liệu:</span>
                        <select id="cmtkFilterMatSelect2" onchange="window._cmtkOnFilterMatChange(this.value)" 
                            style="border: 2px solid #e9d5ff; border-radius: 14px; padding: 8px 14px; font-size: 13px; font-weight: 800; color: #6d28d9; background: #ffffff; outline: none; cursor: pointer;">
                            <option value="all">🧵 Tất Cả Chất Liệu (${materials.length})</option>
                            ${materials.map(m => `<option value="${m.id}" ${String(selectedMaterialFilter) === String(m.id) ? 'selected' : ''}>🧵 ${m.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>

            <div id="cmtkSwatchesGridContainer">
                ${_cmtkRenderSwatchesCardsHTML()}
            </div>
        `;
    }

    function _cmtkRenderSwatchesCardsHTML() {
        const colors = fabricsData.colors || [];
        let filteredColors = colors.filter(c => {
            const q = currentSearchQuery.toLowerCase().trim();
            const matchQ = !q || (c.color_name || '').toLowerCase().includes(q) || (c.material_name || '').toLowerCase().includes(q) || (c.hex_code || '').toLowerCase().includes(q);
            const matchW = selectedWarehouseFilter === 'all' || String(c.warehouse_id) === String(selectedWarehouseFilter);
            const matchM = selectedMaterialFilter === 'all' || String(c.material_id) === String(selectedMaterialFilter);
            return matchQ && matchW && matchM;
        });

        const groupedByMat = {};
        filteredColors.forEach(c => {
            const matName = c.material_name || 'Khác';
            if (!groupedByMat[matName]) groupedByMat[matName] = [];
            groupedByMat[matName].push(c);
        });

        if (Object.keys(groupedByMat).length === 0) return `<div style="text-align:center; padding:40px; font-size:15px; font-weight:700; color:#64748b;">🧵 Không tìm thấy màu vải nào khớp với bộ lọc.</div>`;

        return `
            <div style="display: flex; flex-direction: column; gap: 26px;">
                ${Object.keys(groupedByMat).map(matName => {
                    const colorsInMat = groupedByMat[matName];
                    return `
                        <div style="background: #ffffff; border-radius: 22px; border: 1.5px solid #e2e8f0; padding: 22px 24px; box-shadow: 0 8px 25px rgba(15,23,42,0.04);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span style="font-size: 22px; background: #faf5ff; padding: 6px 12px; border-radius: 12px; border: 1px solid #e9d5ff;">🧵</span>
                                    <h3 style="margin: 0; font-size: 18.5px; font-weight: 950; color: #4c1d95; letter-spacing: -0.3px;">CHẤT LIỆU: ${matName}</h3>
                                    <span style="background: #f3e8ff; color: #6d28d9; font-weight: 850; font-size: 12px; padding: 4px 12px; border-radius: 20px;">${colorsInMat.length} Màu Vải</span>
                                </div>
                            </div>

                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px;">
                                ${colorsInMat.map(c => {
                                    const hex = (c.hex_code && c.hex_code.trim()) ? c.hex_code.trim().toUpperCase() : null;
                                    const hasHex = !!hex;
                                    const safeName = (c.color_name || '').replace(/'/g, "\\'");

                                    return `
                                        <div class="cmtk-swatch-card" style="background: #ffffff; border: 1.5px solid ${hasHex ? '#e2e8f0' : '#fed7aa'}; border-radius: 18px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.25s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.02);" onmouseover="this.style.borderColor='#c084fc'; this.style.boxShadow='0 10px 24px rgba(109,40,217,0.12)';" onmouseout="this.style.borderColor='${hasHex ? '#e2e8f0' : '#fed7aa'}'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.02)';">
                                            <div>
                                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                                                    ${hasHex ? `
                                                        <div style="width: 44px; height: 44px; border-radius: 50%; background: ${hex}; border: 3px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.18); flex-shrink: 0;" title="Digital HEX Swatch: ${hex}"></div>
                                                    ` : `
                                                        <div style="width: 44px; height: 44px; border-radius: 50%; background: #f8fafc; border: 2.5px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #94a3b8; flex-shrink: 0;" title="Vải này chưa được chấm mã màu HEX">🎨</div>
                                                    `}
                                                    <div style="flex: 1; min-width: 0;">
                                                        <div style="font-size: 15px; font-weight: 900; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                                            🎨 ${c.color_name}
                                                        </div>
                                                        <div style="font-size: 11.5px; font-weight: 750; color: #64748b;">
                                                            🏬 ${c.warehouse_name || 'Kho Vải'}
                                                        </div>
                                                    </div>
                                                </div>

                                                ${hasHex ? `
                                                    <div style="background: #faf5ff; border: 1.5px solid #e9d5ff; border-radius: 10px; padding: 6px 12px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                                                        <span style="font-size: 11px; font-weight: 850; color: #6b21a8; text-transform: uppercase;">MÃ #HEX:</span>
                                                        <strong style="font-size: 13px; font-weight: 900; color: #0f172a; font-family: monospace;">${hex}</strong>
                                                    </div>
                                                ` : `
                                                    <div style="background: #fff7ed; border: 1.5px solid #ffedd5; border-radius: 10px; padding: 6px 12px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                                                        <span style="font-size: 11px; font-weight: 850; color: #c2410c; text-transform: uppercase;">TRẠNG THÁI:</span>
                                                        <strong style="font-size: 12px; font-weight: 900; color: #ea580c;">⚠️ Chưa Chấm Màu</strong>
                                                    </div>
                                                `}
                                            </div>

                                            <div style="display: flex; gap: 6px; margin-top: 8px;">
                                                ${hasHex ? `
                                                    <button type="button" onclick="window._cmtkCopyHex('${hex}', '${safeName}')" class="card-btn-open" title="Sao chép mã màu #HEX dán vào Photoshop / Illustrator">
                                                        📋 <span>Sao Chép #HEX</span>
                                                    </button>
                                                    <button type="button" onclick="window._cmtkOpenEditColorModal('${c.material_id}', '${c.id}', '${safeName}', '${hex}', '')" 
                                                        style="border: 1.5px solid #d8b4fe; background: #faf5ff; color: #6b21a8; font-weight: 850; font-size: 12.5px; padding: 9px 12px; border-radius: 12px; cursor: pointer;" title="Sửa mã màu">
                                                        ⚙️ Sửa Mã
                                                    </button>
                                                ` : `
                                                    <button type="button" onclick="window._cmtkOpenEditColorModal('${c.material_id}', '${c.id}', '${safeName}', '', '')" 
                                                        style="border: none; background: linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%); color: #ffffff; font-weight: 900; font-size: 13px; padding: 10px 16px; border-radius: 12px; cursor: pointer; box-shadow: 0 4px 14px rgba(109,40,217,0.35); width: 100%; text-align: center; display: inline-flex; align-items: center; justify-content: center; gap: 6px;" title="Bấm để chọn mã màu HEX cho vải này">
                                                        ⚙️ Chấm Màu Ngay
                                                    </button>
                                                `}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    window._cmtkOnSearchMaket = function (val) {
        currentSearchQuery = val || '';
        const grid1 = document.getElementById('cmtkCardGridContainer');
        const grid2 = document.getElementById('cmtkSwatchesGridContainer');
        if (grid1) grid1.innerHTML = _cmtkRenderMaketCardsHTML();
        else if (grid2) grid2.innerHTML = _cmtkRenderSwatchesCardsHTML();
        else renderCurrentMainTab();
    };

    window._cmtkOnFilterMatChange = function (val) {
        selectedMaterialFilter = val || 'all';
        const grid1 = document.getElementById('cmtkCardGridContainer');
        const grid2 = document.getElementById('cmtkSwatchesGridContainer');
        if (grid1) grid1.innerHTML = _cmtkRenderMaketCardsHTML();
        else if (grid2) grid2.innerHTML = _cmtkRenderSwatchesCardsHTML();
        else renderCurrentMainTab();
    };

    window._cmtkOnFilterWarehouseChange = function (val) {
        selectedWarehouseFilter = val || 'all';
        renderCurrentMainTab();
    };

    window._cmtkCopyHex = function (hex, colorName) {
        navigator.clipboard.writeText(hex).then(() => {
            showToast(`✅ Đã sao chép mã màu ${hex} (${colorName})!`);
        });
    };

    function ensureMaketModalInDOM() {
        let modal = document.getElementById('cmtkMaketModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'cmtkMaketModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:99999; align-items:center; justify-content:center; padding:20px;';
            modal.innerHTML = `
                <div style="max-height:92vh; display:flex; flex-direction:column; width:100%; max-width:680px; border-radius:24px; overflow:hidden; background:#ffffff; box-shadow:0 25px 50px -12px rgba(0,0,0,0.35); border:1.5px solid #d8b4fe;">
                    <div style="flex-shrink:0; padding:18px 24px; background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size:22px;">➕</span>
                            <h3 id="cmtkMaketModalTitle" style="margin:0; font-size:17.5px; font-weight:900; color:#ffffff; text-transform:uppercase; letter-spacing:-0.2px;">TẠO BẢN MAKET MỚI</h3>
                        </div>
                        <button type="button" onclick="window._cmtkCloseMaketModal()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:32px; height:32px; border-radius:50%; cursor:pointer; font-size:16px; font-weight:bold;">✕</button>
                    </div>

                    <div style="display:flex; gap:10px; padding:16px 24px 8px 24px; background:#fcfafc; border-bottom:1.5px solid #f1f5f9;">
                        <button type="button" id="cmtkModalTabBtn1" onclick="window._cmtkSwitchModalTab('tab1')" style="flex:1; padding:10px 16px; border-radius:14px; font-weight:900; font-size:13.5px; border:none; background:#7c3aed; color:#ffffff; cursor:pointer; box-shadow:0 4px 12px rgba(124,58,237,0.25);">
                            📁 TAB 1: Thông Tin & Link (*)
                        </button>
                        <button type="button" id="cmtkModalTabBtn2" onclick="window._cmtkSwitchModalTab('tab2')" style="flex:1; padding:10px 16px; border-radius:14px; font-weight:850; font-size:13.5px; border:1.5px solid #e9d5ff; background:#ffffff; color:#6d28d9; cursor:pointer;">
                            📝 TAB 2: Quy Trình & Hướng Dẫn*
                        </button>
                    </div>

                    <form id="cmtkMaketForm" onsubmit="window._cmtkSaveMaket(event)" style="flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:16px; background:#fcfafc;">
                        <input type="hidden" id="cmtkFormMaketId" value="">

                        <div id="cmtkModalTabContent1" style="display:flex; flex-direction:column; gap:16px;">
                            <div class="qtns-form-group">
                                <label style="color:#6d28d9; font-weight:900; display:block; margin-bottom:6px; font-size:13.5px;">📁 Danh Mục Quản Trị (* BẮT BUỘC):</label>
                                <select id="cmtkFormCategory" style="width:100%; border:2px solid #e9d5ff; border-radius:14px; padding:10px 14px; font-size:13.5px; font-weight:800; color:#0f172a; background:#ffffff; outline:none;">
                                    <option value="Kho Lưu Trữ Bản Maket">📁 Kho Lưu Trữ Bản Maket</option>
                                    <option value="Quy Trình & Hướng Dẫn">📋 Quy Trình & Hướng Dẫn</option>
                                </select>
                            </div>

                            <div class="qtns-form-group">
                                <label style="color:#6d28d9; font-weight:900; display:block; margin-bottom:8px; font-size:13.5px;">🏢 Bộ Phận / Loại Maket (* BẮT BUỘC - Chọn nhiều):</label>
                                <div id="cmtkDeptPillCheckboxes" style="display:flex; flex-wrap:wrap; gap:8px; background:#ffffff; border:1.5px solid #e9d5ff; border-radius:16px; padding:12px; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
                                </div>
                            </div>

                            <div class="qtns-form-group">
                                <label style="color:#0f172a; font-weight:900; display:block; margin-bottom:6px; font-size:13.5px;">Tiêu đề mẫu Maket (*):</label>
                                <input type="text" id="cmtkFormTitle" placeholder="Ví dụ: Quy trình thiết kế mẫu áo lớp / Maket Áo Polo Chuyên..." required style="width:100%; border:2px solid #e9d5ff; border-radius:14px; padding:11px 14px; font-size:13.5px; font-weight:700; color:#0f172a; outline:none; background:#ffffff;">
                            </div>

                            <div class="qtns-form-group">
                                <label style="color:#5b21b6; font-weight:900; display:block; margin-bottom:6px; font-size:13.5px;">🏢 Tên Khách Hàng / Trường Học / Công Ty (*):</label>
                                <input type="text" id="cmtkFormCustomer" placeholder="Ví dụ: Công ty Đồng Phục HV / THPT Chu Văn An..." required style="width:100%; border:2px solid #e9d5ff; border-radius:14px; padding:11px 14px; font-size:13.5px; font-weight:700; color:#0f172a; outline:none; background:#ffffff;">
                            </div>

                            <div class="qtns-form-group">
                                <label style="color:#0f172a; font-weight:900; display:block; margin-bottom:6px; font-size:13.5px;">📝 Mô tả / Ghi chú (tự động xuống dòng):</label>
                                <textarea id="cmtkFormNotes" rows="3" placeholder="Mô tả tóm tắt nội dung quy trình hoặc cẩm nang hướng dẫn mẫu thiết kế..." style="width:100%; border:2px solid #e9d5ff; border-radius:14px; padding:10px 14px; font-size:13px; font-weight:600; color:#0f172a; font-family:inherit; outline:none; resize:vertical; background:#ffffff;"></textarea>
                            </div>

                            <div class="qtns-form-group">
                                <label style="color:#0f172a; font-weight:900; display:block; margin-bottom:6px; font-size:13.5px;">Đường link URL tài liệu (Google Sheets / Word / Canva / Link ngoài):</label>
                                <input type="url" id="cmtkFormDocUrl" placeholder="https://docs.google.com/... hoặc link Canva / Drive" style="width:100%; border:2px solid #e9d5ff; border-radius:14px; padding:11px 14px; font-size:13.5px; font-weight:700; color:#0f172a; outline:none; background:#ffffff;">
                            </div>

                            <div class="qtns-form-group">
                                <label style="color:#0f172a; font-weight:900; display:block; margin-bottom:6px; font-size:13.5px;">🖼️ Hình Ảnh Minh Họa / Sơ Đồ / Mẫu (Không bắt buộc):</label>
                                <input type="file" id="cmtkFormImageFile" accept="image/*" style="display:none;" onchange="window._cmtkOnMaketImageSelected(this)">
                                <button type="button" onclick="document.getElementById('cmtkFormImageFile').click()" style="border:1.5px dashed #a855f7; background:#faf5ff; color:#6b21a8; padding:11px 16px; border-radius:14px; font-weight:850; cursor:pointer; width:100%; text-align:center; font-size:13.5px;">
                                    📷 Chọn Hình Ảnh Từ Máy Tính
                                </button>
                                <input type="hidden" id="cmtkFormImageUrl" value="">
                                <input type="hidden" id="cmtkFormOriginalImageUrl" value="">
                                <div id="cmtkFormImagePreviewBox" style="display:none; margin-top:8px; text-align:center; border:1.5px solid #e9d5ff; border-radius:14px; padding:10px; background:#ffffff;">
                                    <img id="cmtkFormImagePreviewImg" src="" style="max-height:160px; max-width:100%; border-radius:8px; object-fit:contain;">
                                </div>
                            </div>
                        </div>

                        <div id="cmtkModalTabContent2" style="display:none; flex-direction:column; gap:16px;">
                            <div class="qtns-form-group">
                                <label style="color:#6d28d9; font-weight:900; display:block; margin-bottom:6px; font-size:13.5px;">📝 Quy Trình & Hướng Dẫn Chi Tiết / Cảnh Báo In Ấn:</label>
                                <textarea id="cmtkFormDetailGuide" rows="8" placeholder="Nhập quy trình từng bước, lưu ý màu vải, thông số thiết kế vector..." style="width:100%; border:2px solid #e9d5ff; border-radius:16px; padding:12px 16px; font-size:13.5px; font-weight:600; color:#0f172a; font-family:inherit; outline:none; resize:vertical; background:#ffffff;"></textarea>
                            </div>
                        </div>

                        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:12px; border-top:1.5px solid #e2e8f0; padding-top:16px;">
                            <button type="button" onclick="window._cmtkCloseMaketModal()" style="padding:10px 22px; border-radius:12px; font-weight:800; border:1.5px solid #cbd5e1; background:#ffffff; color:#334155; cursor:pointer;">Hủy Bỏ</button>
                            <button type="submit" style="padding:10px 24px; border-radius:12px; font-weight:900; border:none; background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; cursor:pointer; box-shadow:0 4px 14px rgba(109,40,217,0.35);">💾 Lưu Đường Link</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    }

    window._cmtkSwitchModalTab = function (tabKey) {
        activeModalTab = tabKey;
        const btn1 = document.getElementById('cmtkModalTabBtn1');
        const btn2 = document.getElementById('cmtkModalTabBtn2');
        const content1 = document.getElementById('cmtkModalTabContent1');
        const content2 = document.getElementById('cmtkModalTabContent2');

        if (tabKey === 'tab1') {
            btn1.style.background = '#7c3aed'; btn1.style.color = '#ffffff'; btn1.style.border = 'none';
            btn2.style.background = '#ffffff'; btn2.style.color = '#6d28d9'; btn2.style.border = '1.5px solid #e9d5ff';
            content1.style.display = 'flex'; content2.style.display = 'none';
        } else {
            btn2.style.background = '#7c3aed'; btn2.style.color = '#ffffff'; btn2.style.border = 'none';
            btn1.style.background = '#ffffff'; btn1.style.color = '#6d28d9'; btn1.style.border = '1.5px solid #e9d5ff';
            content2.style.display = 'flex'; content1.style.display = 'none';
        }
    };

    window._cmtkOnMaketImageSelected = async function (input) {
        if (!input || !input.files || !input.files[0]) return;
        const file = input.files[0];
        showToast('⏳ Đang xử lý và nén hình ảnh...', 'info');
        try {
            const compressedDataUrl = await compressImage(file, 1400, 0.82);
            const imageUrlInput = document.getElementById('cmtkFormImageUrl');
            const previewBox = document.getElementById('cmtkFormImagePreviewBox');
            const previewImg = document.getElementById('cmtkFormImagePreviewImg');

            if (imageUrlInput) imageUrlInput.value = compressedDataUrl;
            if (previewImg) previewImg.src = compressedDataUrl;
            if (previewBox) previewBox.style.display = 'block';

            showToast('✅ Đã tải và nén hình ảnh thành công!');
        } catch (e) {
            console.error('[CMTK Image Upload Error]', e);
            showToast('❌ Lỗi xử lý hình ảnh: ' + e.message, 'error');
        }
    };

    window._cmtkOpenAddMaketModal = function () {
        const modal = ensureMaketModalInDOM();
        document.getElementById('cmtkMaketModalTitle').innerText = 'TẠO BẢN MAKET MỚI';
        document.getElementById('cmtkFormMaketId').value = '';
        document.getElementById('cmtkFormTitle').value = '';
        document.getElementById('cmtkFormCustomer').value = '';
        document.getElementById('cmtkFormImageUrl').value = '';
        const origUrlInput = document.getElementById('cmtkFormOriginalImageUrl');
        if (origUrlInput) origUrlInput.value = '';
        document.getElementById('cmtkFormDocUrl').value = '';
        document.getElementById('cmtkFormNotes').value = '';
        document.getElementById('cmtkFormDetailGuide').value = '';
        document.getElementById('cmtkFormImagePreviewBox').style.display = 'none';

        const depts = getDepartments();
        const box = document.getElementById('cmtkDeptPillCheckboxes');
        if (box) {
            box.innerHTML = depts.map(d => `
                <label style="display:inline-flex; align-items:center; gap:6px; background:#faf5ff; border:1.5px solid #e9d5ff; padding:6px 14px; border-radius:14px; font-size:13px; font-weight:800; color:#6d28d9; cursor:pointer;">
                    <input type="checkbox" name="cmtkDeptCheck" value="${d.replace(/"/g, '&quot;')}" style="accent-color:#7c3aed; width:16px; height:16px;">
                    <span>📌 ${d}</span>
                </label>
            `).join('');
        }

        window._cmtkSwitchModalTab('tab1');
        modal.style.display = 'flex';
    };

    window._cmtkCloseMaketModal = function () {
        const modal = document.getElementById('cmtkMaketModal');
        if (modal) modal.style.display = 'none';
    };

    window._cmtkSaveMaket = async function (e) {
        e.preventDefault();
        const id = document.getElementById('cmtkFormMaketId').value || 'mkt_' + Date.now();
        const category = document.getElementById('cmtkFormCategory').value;
        const title = document.getElementById('cmtkFormTitle').value.trim();
        const customerName = document.getElementById('cmtkFormCustomer').value.trim();
        const imageUrl = document.getElementById('cmtkFormImageUrl').value;
        const originalImageUrl = document.getElementById('cmtkFormOriginalImageUrl')?.value || imageUrl;
        const docUrl = document.getElementById('cmtkFormDocUrl').value.trim();
        const notes = document.getElementById('cmtkFormNotes').value.trim();
        const detailGuide = document.getElementById('cmtkFormDetailGuide').value.trim();

        const checkedDepts = Array.from(document.querySelectorAll('input[name="cmtkDeptCheck"]:checked')).map(cb => cb.value);

        if (!title || !customerName) {
            showToast('⚠️ Vui lòng nhập tiêu đề và tên khách hàng!', 'error');
            return;
        }

        const idx = maketList.findIndex(m => String(m.id) === String(id));
        const newItem = {
            id, category, title, customerName, imageUrl, originalImageUrl, docUrl, notes, detailGuide,
            departments: checkedDepts.length > 0 ? checkedDepts : ['Chung'],
            createdAt: idx !== -1 ? maketList[idx].createdAt : new Date().toISOString()
        };

        if (idx !== -1) maketList[idx] = newItem;
        else maketList.unshift(newItem);

        try {
            await fetch('/api/chammauthietke/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: { makets: maketList, subtabs: getSubtabs(), departments: getDepartments() } })
            });
            showToast('✅ Đã lưu bản Maket thành công!');
            window._cmtkCloseMaketModal();
            renderCurrentMainTab();
        } catch (err) {
            showToast('❌ Lưu Maket thất bại: ' + err.message, 'error');
        }
    };

    function ensureSubtabModalInDOM() {
        let modal = document.getElementById('cmtkSubtabModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'cmtkSubtabModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:99999; align-items:center; justify-content:center; padding:20px;';
            modal.innerHTML = `
                <div style="max-height:90vh; display:flex; flex-direction:column; width:100%; max-width:580px; border-radius:24px; overflow:hidden; background:#ffffff; box-shadow:0 25px 50px -12px rgba(0,0,0,0.35); border:1.5px solid #d8b4fe;">
                    <div style="flex-shrink:0; padding:18px 24px; background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size:22px;">⚙️</span>
                            <h3 style="margin:0; font-size:16.5px; font-weight:900; color:#ffffff; text-transform:uppercase;">CÀI ĐẶT MỤC (MAKET & CHẤM MÀU THIẾT KẾ)</h3>
                        </div>
                        <button type="button" onclick="window._cmtkCloseSubtabModal()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:32px; height:32px; border-radius:50%; cursor:pointer; font-size:16px; font-weight:bold;">✕</button>
                    </div>
                    <div style="flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:18px; background:#fcfafc;">
                        <div style="background:#ffffff; border:1.5px solid #e9d5ff; border-radius:18px; padding:16px; box-shadow:0 4px 12px rgba(0,0,0,0.02);">
                            <label style="color:#6d28d9; font-weight:900; display:block; margin-bottom:8px; font-size:13.5px;">➕ Tạo Mục Mới:</label>
                            <div style="display:flex; gap:10px;">
                                <input type="text" id="cmtkSubtabFormName" placeholder="Nhập tên mục mới..." style="flex:1; border:2px solid #e9d5ff; border-radius:12px; padding:9px 14px; font-size:13.5px; font-weight:700; color:#0f172a; outline:none;" onkeypress="if(event.key==='Enter') window._cmtkAddSubtabFromModal()">
                                <button type="button" onclick="window._cmtkAddSubtabFromModal()" style="background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; border:none; border-radius:12px; padding:9px 18px; font-size:13.5px; font-weight:900; cursor:pointer; box-shadow:0 4px 12px rgba(109,40,217,0.3); display:inline-flex; align-items:center; gap:4px;">
                                    ➕ Thêm Mới
                                </button>
                            </div>
                        </div>
                        <div>
                            <label style="color:#0f172a; font-weight:900; display:block; margin-bottom:10px; font-size:13.5px;">📌 Danh Sách Mục Hiện Tại:</label>
                            <div id="cmtkSubtabListContainer" style="display:flex; flex-direction:column; gap:10px;">
                            </div>
                        </div>
                    </div>
                    <div style="flex-shrink:0; padding:14px 24px; background:#ffffff; border-top:1.5px solid #e2e8f0; display:flex; justify-content:flex-end;">
                        <button type="button" onclick="window._cmtkCloseSubtabModal()" style="padding:9px 24px; border-radius:12px; font-weight:800; border:none; background:#f1f5f9; color:#334155; cursor:pointer;">Đóng</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    }

    window._cmtkOpenSubtabModal = function () {
        const modal = ensureSubtabModalInDOM();
        _cmtkRenderSubtabListInModal();
        modal.style.display = 'flex';
    };

    window._cmtkCloseSubtabModal = function () {
        const modal = document.getElementById('cmtkSubtabModal');
        if (modal) modal.style.display = 'none';
    };

    function _cmtkRenderSubtabListInModal() {
        const container = document.getElementById('cmtkSubtabListContainer');
        if (!container) return;
        const subtabs = getSubtabs();
        container.innerHTML = subtabs.map((sub, idx) => {
            if (editingSubtabIndex === idx) {
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#fffbeb; padding:10px 14px; border-radius:14px; border:2px solid #f59e0b; gap:10px;">
                        <input type="text" id="cmtkEditSubtabInput_${idx}" value="${sub.title.replace(/"/g, '&quot;')}" style="flex:1; padding:8px 12px; border-radius:10px; border:1.5px solid #f59e0b; font-size:13.5px; font-weight:800; outline:none;" onkeypress="if(event.key==='Enter') window._cmtkSaveSubtabEditFromModal(${idx})">
                        <div style="display:flex; gap:6px;">
                            <button onclick="window._cmtkSaveSubtabEditFromModal(${idx})" style="background:#22c55e; color:#ffffff; border:none; border-radius:10px; padding:7px 14px; font-size:12.5px; font-weight:900; cursor:pointer;">💾 Lưu</button>
                            <button onclick="window._cmtkCancelSubtabEditFromModal()" style="background:#e2e8f0; color:#475569; border:none; border-radius:10px; padding:7px 12px; font-size:12.5px; font-weight:800; cursor:pointer;">✕ Hủy</button>
                        </div>
                    </div>
                `;
            }
            return `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; padding:12px 16px; border-radius:14px; border:1.5px solid #e2e8f0; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:18px;">${sub.icon || '📁'}</span>
                        <span style="font-size:14.5px; font-weight:850; color:#0f172a;">${sub.title}</span>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button onclick="window._cmtkStartSubtabEditFromModal(${idx})" style="background:#fef3c7; color:#d97706; border:1px solid #fde047; border-radius:10px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer;">✏️ Sửa Tên</button>
                        <button onclick="window._cmtkDeleteSubtabFromModal(${idx})" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; border-radius:10px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer;">🗑️ Xóa</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window._cmtkAddSubtabFromModal = function () {
        const input = document.getElementById('cmtkSubtabFormName');
        if (!input) return;
        const title = input.value.trim();
        if (!title) { showToast('⚠️ Vui lòng nhập tên mục mới!', 'error'); return; }
        let subtabs = getSubtabs();
        subtabs.push({ id: 'custom_' + Date.now(), title, icon: '📁', isCustom: true });
        saveSubtabs(subtabs);
        input.value = '';
        _cmtkRenderSubtabListInModal();
        renderCurrentMainTab();
        showToast(`✅ Đã thêm mục mới "${title}"!`);
    };

    window._cmtkStartSubtabEditFromModal = function (index) { editingSubtabIndex = index; _cmtkRenderSubtabListInModal(); };
    window._cmtkCancelSubtabEditFromModal = function () { editingSubtabIndex = -1; _cmtkRenderSubtabListInModal(); };
    window._cmtkSaveSubtabEditFromModal = function (index) {
        const input = document.getElementById(`cmtkEditSubtabInput_${index}`);
        if (!input) return;
        const newTitle = input.value.trim();
        if (!newTitle) return;
        let subtabs = getSubtabs();
        subtabs[index].title = newTitle;
        saveSubtabs(subtabs);
        editingSubtabIndex = -1;
        _cmtkRenderSubtabListInModal();
        renderCurrentMainTab();
        showToast('💾 Đã cập nhật tên mục!');
    };
    window._cmtkDeleteSubtabFromModal = function (index) {
        let subtabs = getSubtabs();
        if (!confirm(`Bạn có chắc muốn xóa mục "${subtabs[index].title}" không?`)) return;
        subtabs.splice(index, 1);
        saveSubtabs(subtabs);
        _cmtkRenderSubtabListInModal();
        renderCurrentMainTab();
        showToast('🗑️ Đã xóa mục!');
    };

    function ensureDepartmentModalInDOM() {
        let modal = document.getElementById('cmtkDeptModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'cmtkDeptModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:99999; align-items:center; justify-content:center; padding:20px;';
            modal.innerHTML = `
                <div style="max-height:90vh; display:flex; flex-direction:column; width:100%; max-width:580px; border-radius:24px; overflow:hidden; background:#ffffff; box-shadow:0 25px 50px -12px rgba(0,0,0,0.35); border:1.5px solid #d8b4fe;">
                    <div style="flex-shrink:0; padding:18px 24px; background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size:22px;">⚙️</span>
                            <h3 style="margin:0; font-size:16.5px; font-weight:900; color:#ffffff; text-transform:uppercase;">CÀI ĐẶT BỘ PHẬN (LOẠI MAKET)</h3>
                        </div>
                        <button type="button" onclick="window._cmtkCloseDepartmentModal()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:32px; height:32px; border-radius:50%; cursor:pointer; font-size:16px; font-weight:bold;">✕</button>
                    </div>
                    <div style="flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:18px; background:#fcfafc;">
                        <div style="background:#ffffff; border:1.5px solid #e9d5ff; border-radius:18px; padding:16px; box-shadow:0 4px 12px rgba(0,0,0,0.02);">
                            <label style="color:#6d28d9; font-weight:900; display:block; margin-bottom:8px; font-size:13.5px;">➕ Tạo Bộ Phận Mới:</label>
                            <div style="display:flex; gap:10px;">
                                <input type="text" id="cmtkDeptFormName" placeholder="Nhập tên bộ phận mới..." style="flex:1; border:2px solid #e9d5ff; border-radius:12px; padding:9px 14px; font-size:13.5px; font-weight:700; color:#0f172a; outline:none;" onkeypress="if(event.key==='Enter') window._cmtkAddDeptFromModal()">
                                <button type="button" onclick="window._cmtkAddDeptFromModal()" style="background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; border:none; border-radius:12px; padding:9px 18px; font-size:13.5px; font-weight:900; cursor:pointer; box-shadow:0 4px 12px rgba(109,40,217,0.3); display:inline-flex; align-items:center; gap:4px;">
                                    ➕ Thêm Mới
                                </button>
                            </div>
                        </div>
                        <div>
                            <label style="color:#0f172a; font-weight:900; display:block; margin-bottom:10px; font-size:13.5px;">📌 Danh Sách Bộ Phận Hiện Tại:</label>
                            <div id="cmtkDeptListContainer" style="display:flex; flex-direction:column; gap:10px;">
                            </div>
                        </div>
                    </div>
                    <div style="flex-shrink:0; padding:14px 24px; background:#ffffff; border-top:1.5px solid #e2e8f0; display:flex; justify-content:flex-end;">
                        <button type="button" onclick="window._cmtkCloseDepartmentModal()" style="padding:9px 24px; border-radius:12px; font-weight:800; border:none; background:#f1f5f9; color:#334155; cursor:pointer;">Đóng</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    }

    window._cmtkOpenDepartmentModal = function () {
        const modal = ensureDepartmentModalInDOM();
        _cmtkRenderDeptListInModal();
        modal.style.display = 'flex';
    };

    window._cmtkCloseDepartmentModal = function () {
        const modal = document.getElementById('cmtkDeptModal');
        if (modal) modal.style.display = 'none';
    };

    function _cmtkRenderDeptListInModal() {
        const container = document.getElementById('cmtkDeptListContainer');
        if (!container) return;
        const depts = getDepartments();
        container.innerHTML = depts.map((dept, idx) => {
            if (editingDeptIndex === idx) {
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#fffbeb; padding:10px 14px; border-radius:14px; border:2px solid #f59e0b; gap:10px;">
                        <input type="text" id="cmtkEditDeptInput_${idx}" value="${dept.replace(/"/g, '&quot;')}" style="flex:1; padding:8px 12px; border-radius:10px; border:1.5px solid #f59e0b; font-size:13.5px; font-weight:800; outline:none;" onkeypress="if(event.key==='Enter') window._cmtkSaveDeptEditFromModal(${idx})">
                        <div style="display:flex; gap:6px;">
                            <button onclick="window._cmtkSaveDeptEditFromModal(${idx})" style="background:#22c55e; color:#ffffff; border:none; border-radius:10px; padding:7px 14px; font-size:12.5px; font-weight:900; cursor:pointer;">💾 Lưu</button>
                            <button onclick="window._cmtkCancelDeptEditFromModal()" style="background:#e2e8f0; color:#475569; border:none; border-radius:10px; padding:7px 12px; font-size:12.5px; font-weight:800; cursor:pointer;">✕ Hủy</button>
                        </div>
                    </div>
                `;
            }
            return `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; padding:12px 16px; border-radius:14px; border:1.5px solid #e2e8f0; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:16px; color:#be185d;">📌</span>
                        <span style="font-size:14.5px; font-weight:850; color:#0f172a;">${dept}</span>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button onclick="window._cmtkStartDeptEditFromModal(${idx})" style="background:#fef3c7; color:#d97706; border:1px solid #fde047; border-radius:10px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer;">✏️ Sửa Tên</button>
                        <button onclick="window._cmtkDeleteDeptFromModal(${idx})" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; border-radius:10px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer;">🗑️ Xóa</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window._cmtkAddDeptFromModal = function () {
        const input = document.getElementById('cmtkDeptFormName');
        if (!input) return;
        const name = input.value.trim();
        if (!name) { showToast('⚠️ Vui lòng nhập tên bộ phận mới!', 'error'); return; }
        let depts = getDepartments();
        if (depts.includes(name)) { showToast('⚠️ Bộ phận này đã tồn tại!', 'error'); return; }
        depts.push(name);
        saveDepartments(depts);
        input.value = '';
        _cmtkRenderDeptListInModal();
        renderCurrentMainTab();
        showToast(`✅ Đã thêm bộ phận mới "${name}"!`);
    };

    window._cmtkStartDeptEditFromModal = function (index) { editingDeptIndex = index; _cmtkRenderDeptListInModal(); };
    window._cmtkCancelDeptEditFromModal = function () { editingDeptIndex = -1; _cmtkRenderDeptListInModal(); };
    window._cmtkSaveDeptEditFromModal = function (index) {
        const input = document.getElementById(`cmtkEditDeptInput_${index}`);
        if (!input) return;
        const newName = input.value.trim();
        if (!newName) return;
        let depts = getDepartments();
        depts[index] = newName;
        saveDepartments(depts);
        editingDeptIndex = -1;
        _cmtkRenderDeptListInModal();
        renderCurrentMainTab();
        showToast('💾 Đã cập nhật tên bộ phận!');
    };
    window._cmtkDeleteDeptFromModal = function (index) {
        let depts = getDepartments();
        if (!confirm(`Bạn có chắc muốn xóa bộ phận "${depts[index]}" không?`)) return;
        depts.splice(index, 1);
        saveDepartments(depts);
        _cmtkRenderDeptListInModal();
        renderCurrentMainTab();
        showToast('🗑️ Đã xóa bộ phận!');
    };

    function ensureDetailModalInDOM() {
        let modal = document.getElementById('cmtkDetailModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'cmtkDetailModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:99999; align-items:center; justify-content:center; padding:20px;';
            modal.innerHTML = `
                <div style="max-height:90vh; display:flex; flex-direction:column; width:100%; max-width:720px; border-radius:24px; overflow:hidden; background:#ffffff; box-shadow:0 25px 50px -12px rgba(0,0,0,0.35); border:1.5px solid #d8b4fe;">
                    <div style="flex-shrink:0; padding:20px 26px; background:linear-gradient(135deg, #4c1d95, #6d28d9); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                        <h3 id="cmtkDetailTitle" style="margin:0; font-size:18px; font-weight:900;">Chi Tiết Bản Maket</h3>
                        <button type="button" onclick="window._cmtkCloseDetailModal()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:34px; height:34px; border-radius:50%; cursor:pointer; font-size:18px; font-weight:bold;">✕</button>
                    </div>
                    <div style="flex:1; overflow-y:auto; padding:22px 26px; display:flex; flex-direction:column; gap:18px; background:#fcfafc;">
                        <div id="cmtkDetailImageBox" style="display:none; text-align:center; border:1.5px solid #e9d5ff; border-radius:18px; padding:16px; background:#ffffff;">
                            <img id="cmtkDetailImg" src="" style="max-height:360px; max-width:100%; border-radius:12px; cursor:pointer; object-fit:contain;" onclick="window._cmtkOpenLightbox(this.src)">
                        </div>
                        <div style="background:#ffffff; border:1.5px solid #e9d5ff; border-radius:16px; padding:16px 20px;">
                            <div id="cmtkDetailNotesText" style="font-size:14px; font-weight:600; color:#1e293b; line-height:1.65; white-space:pre-line;"></div>
                        </div>
                    </div>
                    <div style="flex-shrink:0; padding:16px 26px; background:#ffffff; border-top:1.5px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                        <button type="button" onclick="window._cmtkCloseDetailModal()" style="padding:10px 22px; border-radius:12px; font-weight:800; border:1.5px solid #cbd5e1; background:#ffffff; color:#334155; cursor:pointer;">Đóng Chi Tiết</button>
                        <div id="cmtkDetailFooterBtn"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    }

    window._cmtkOpenDetailModal = function (id) {
        const item = maketList.find(m => String(m.id) === String(id));
        if (!item) return;
        const modal = ensureDetailModalInDOM();
        document.getElementById('cmtkDetailTitle').innerText = item.title;
        const imgBox = document.getElementById('cmtkDetailImageBox');
        const imgEl = document.getElementById('cmtkDetailImg');
        const origUrl = item.originalImageUrl || item.imageUrl;
        if (item.imageUrl) {
            imgEl.src = item.imageUrl;
            imgEl.onclick = () => window._cmtkOpenLightbox(item.imageUrl, origUrl);
            imgBox.style.display = 'block';
        } else {
            imgBox.style.display = 'none';
        }
        document.getElementById('cmtkDetailNotesText').innerText = item.notes || 'Không có ghi chú thêm.';
        const footerBtn = document.getElementById('cmtkDetailFooterBtn');
        let btnsHtml = '';
        if (origUrl) {
            btnsHtml += `<a href="${origUrl}" download="maket_goc_${(item.title || 'thiet_ke').replace(/[^a-zA-Z0-9_\-]/g, '_')}.jpg" target="_blank" style="background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; padding:10px 18px; border-radius:12px; font-weight:900; font-size:13px; text-decoration:none; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 14px rgba(109,40,217,0.35);">⬇️ Tải Ảnh Nét Gốc</a>`;
        }
        if (item.docUrl) {
            btnsHtml += `<a href="${item.docUrl}" target="_blank" rel="noopener" style="background:linear-gradient(135deg, #059669, #10b981); color:#ffffff; padding:10px 18px; border-radius:12px; font-weight:900; font-size:13px; text-decoration:none; display:inline-flex; align-items:center; gap:6px; margin-left:8px;">🔗 Mở File Gốc ↗</a>`;
        }
        footerBtn.innerHTML = btnsHtml;
        modal.style.display = 'flex';
    };

    window._cmtkCloseDetailModal = function () {
        const modal = document.getElementById('cmtkDetailModal');
        if (modal) modal.style.display = 'none';
    };

    function ensureLightboxInDOM() {
        let lightbox = document.getElementById('cmtkLightboxModal');
        if (!lightbox) {
            lightbox = document.createElement('div');
            lightbox.id = 'cmtkLightboxModal';
            lightbox.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.92); backdrop-filter:blur(10px); z-index:999999; flex-direction:column; align-items:center; justify-content:center; padding:20px;';
            lightbox.innerHTML = `
                <div style="position:absolute; top:20px; right:24px; display:flex; gap:12px; z-index:10;">
                    <a id="cmtkLightboxDownloadBtn" href="" download="maket_anh_goc_net_cao.jpg" target="_blank" style="background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; padding:9px 18px; border-radius:12px; font-weight:900; text-decoration:none; font-size:13px; box-shadow:0 4px 14px rgba(109,40,217,0.4); display:flex; align-items:center; gap:6px;">
                        ⬇️ Tải Ảnh Nét Gốc
                    </a>
                    <button type="button" onclick="window._cmtkCloseLightbox()" style="background:rgba(255,255,255,0.25); border:none; color:#ffffff; width:38px; height:38px; border-radius:50%; cursor:pointer; font-size:20px; font-weight:bold;">✕</button>
                </div>
                <img id="cmtkLightboxImg" src="" style="max-width:92vw; max-height:88vh; object-fit:contain; border-radius:16px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5); border:2px solid rgba(255,255,255,0.2);">
            `;
            document.body.appendChild(lightbox);
        }
        return lightbox;
    }

    window._cmtkOpenLightbox = function (src, origSrc) {
        const displaySrc = origSrc || src;
        if (!displaySrc) return;
        const lightbox = ensureLightboxInDOM();
        document.getElementById('cmtkLightboxImg').src = displaySrc;
        const dlBtn = document.getElementById('cmtkLightboxDownloadBtn');
        if (dlBtn) {
            dlBtn.href = displaySrc;
            dlBtn.download = 'maket_anh_goc_net_cao.jpg';
        }
        lightbox.style.display = 'flex';
    };

    window._cmtkCloseLightbox = function () {
        const lightbox = document.getElementById('cmtkLightboxModal');
        if (lightbox) lightbox.style.display = 'none';
    };

    function ensureEditColorModalInDOM() {
        let modal = document.getElementById('cmtkEditColorModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'cmtkEditColorModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:99999; align-items:center; justify-content:center; padding:20px;';
            modal.innerHTML = `
                <div style="max-height:90vh; display:flex; flex-direction:column; width:100%; max-width:480px; border-radius:24px; overflow:hidden; background:#ffffff; box-shadow:0 25px 50px -12px rgba(0,0,0,0.35); border:1.5px solid #d8b4fe;">
                    <div style="flex-shrink:0; padding:18px 24px; background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size:22px;">🎨</span>
                            <h3 style="margin:0; font-size:16.5px; font-weight:900; color:#ffffff;">CHẤM MÃ MÀU THIẾT KẾ #HEX</h3>
                        </div>
                        <button type="button" onclick="window._cmtkCloseEditColorModal()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:32px; height:32px; border-radius:50%; cursor:pointer; font-size:16px; font-weight:bold;">✕</button>
                    </div>

                    <form id="cmtkEditColorForm" onsubmit="window._cmtkSaveColorHex(event)" style="flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:16px; background:#fcfafc;">
                        <input type="hidden" id="cmtkFormColorKey" value="">
                        
                        <div class="qtns-form-group">
                            <label style="color:#0f172a; font-weight:850; display:block; margin-bottom:6px;">Tên Màu Vải:</label>
                            <input type="text" id="cmtkFormColorNameDisplay" readonly disabled style="width:100%; border:1.5px solid #cbd5e1; border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:800; color:#475569; background:#f1f5f9;">
                        </div>

                        <div class="qtns-form-group">
                            <label style="color:#5b21b6; font-weight:900; display:block; margin-bottom:6px;">🎨 Chọn Mã Màu Chấm (#HEX):</label>
                            <div style="display:flex; gap:12px; align-items:center;">
                                <input type="color" id="cmtkFormColorPicker" style="width:54px; height:44px; border:none; border-radius:10px; cursor:pointer; background:none;" onchange="document.getElementById('cmtkFormHexInput').value = this.value.toUpperCase();">
                                <input type="text" id="cmtkFormHexInput" placeholder="Ví dụ: #E63946" required style="flex:1; border:2px solid #e9d5ff; border-radius:12px; padding:10px 14px; font-size:14px; font-weight:850; color:#0f172a; text-transform:uppercase;" oninput="document.getElementById('cmtkFormColorPicker').value = this.value;">
                            </div>
                        </div>

                        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:12px;">
                            <button type="button" onclick="window._cmtkCloseEditColorModal()" style="padding:10px 20px; border-radius:12px; font-weight:800; border:1.5px solid #cbd5e1; background:#ffffff; color:#334155; cursor:pointer;">Hủy Bỏ</button>
                            <button type="submit" style="padding:10px 24px; border-radius:12px; font-weight:900; border:none; background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; cursor:pointer; box-shadow:0 4px 14px rgba(109,40,217,0.35);">💾 Lưu Mã Màu #HEX</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    }

    window._cmtkOpenEditColorModal = function (materialId, colorId, colorName, hex, swatchImg) {
        const modal = ensureEditColorModalInDOM();
        const key = `${materialId}_${colorId}`;
        document.getElementById('cmtkFormColorKey').value = key;
        document.getElementById('cmtkFormColorNameDisplay').value = colorName;
        document.getElementById('cmtkFormHexInput').value = hex || '';
        document.getElementById('cmtkFormColorPicker').value = hex || '#3B82F6';

        modal.style.display = 'flex';
    };

    window._cmtkCloseEditColorModal = function () {
        const modal = document.getElementById('cmtkEditColorModal');
        if (modal) modal.style.display = 'none';
    };

    window._cmtkSaveColorHex = async function (e) {
        e.preventDefault();
        const key = document.getElementById('cmtkFormColorKey').value;
        const hex = document.getElementById('cmtkFormHexInput').value.trim().toUpperCase();
        if (!key || !hex) return;
        swatchesMap[key] = { hex_code: hex };
        try {
            await fetch('/api/chammauthietke/swatches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ swatches: swatchesMap })
            });
            fabricsData.colors = fabricsData.colors.map(c => {
                if (`${c.material_id}_${c.id}` === key) c.hex_code = hex;
                return c;
            });
            showToast(`✅ Đã cập nhật mã màu ${hex} thành công!`);
            window._cmtkCloseEditColorModal();
            renderCurrentMainTab();
        } catch (err) {
            showToast('❌ Cập nhật mã màu thất bại: ' + err.message, 'error');
        }
    };

    function _cmtkGetStyles() {
        return `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Comfortaa:wght@500;600;700&display=swap');

                .cmtk-wrapper, .cmtk-wrapper button, .cmtk-wrapper input, .cmtk-wrapper select, .cmtk-wrapper textarea, .cmtk-wrapper div, .cmtk-wrapper span, .cmtk-wrapper h1, .cmtk-wrapper h2, .cmtk-wrapper h3, .cmtk-wrapper h4, .cmtk-wrapper p, .cmtk-wrapper a, .cmtk-wrapper option, .cmtk-wrapper strong,
                #cmtkMaketModal, #cmtkMaketModal button, #cmtkMaketModal input, #cmtkMaketModal select, #cmtkMaketModal textarea, #cmtkMaketModal div, #cmtkMaketModal span, #cmtkMaketModal h3,
                #cmtkDetailModal, #cmtkDetailModal button, #cmtkDetailModal input, #cmtkDetailModal select, #cmtkDetailModal textarea, #cmtkDetailModal div, #cmtkDetailModal span, #cmtkDetailModal h3,
                #cmtkEditColorModal, #cmtkEditColorModal button, #cmtkEditColorModal input, #cmtkEditColorModal select, #cmtkEditColorModal textarea, #cmtkEditColorModal div, #cmtkEditColorModal span, #cmtkEditColorModal h3,
                #cmtkSubtabModal, #cmtkSubtabModal button, #cmtkSubtabModal input, #cmtkSubtabModal div, #cmtkSubtabModal span, #cmtkSubtabModal h3,
                #cmtkDeptModal, #cmtkDeptModal button, #cmtkDeptModal input, #cmtkDeptModal div, #cmtkDeptModal span, #cmtkDeptModal h3 {
                    font-family: 'Nunito', 'Comfortaa', system-ui, -apple-system, sans-serif !important;
                }

                .cmtk-wrapper {
                    padding: 24px;
                    background: #f8fafc;
                    min-height: 100vh;
                    box-sizing: border-box;
                }

                /* Executive Header Banner */
                .cmtk-header {
                    background: linear-gradient(135deg, #6d28d9 0%, #7c3aed 50%, #8b5cf6 100%);
                    border-radius: 24px;
                    padding: 24px 32px;
                    margin-bottom: 24px;
                    box-shadow: 0 16px 36px -10px rgba(109, 40, 217, 0.4);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    color: #ffffff;
                }

                .cmtk-header-left {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }

                .cmtk-icon-bg {
                    width: 60px;
                    height: 60px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 32px;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                }

                .cmtk-title {
                    font-size: 23px;
                    font-weight: 950;
                    margin: 0 0 6px 0;
                    letter-spacing: -0.3px;
                    color: #ffffff;
                }

                .cmtk-subtitle {
                    font-size: 13.5px;
                    font-weight: 600;
                    opacity: 0.92;
                    margin: 0;
                    color: #f3e8ff;
                }

                .cmtk-btn-header-action {
                    background: rgba(255, 255, 255, 0.2);
                    border: 1.5px solid rgba(255, 255, 255, 0.4);
                    color: #ffffff;
                    font-weight: 900;
                    font-size: 13.5px;
                    padding: 11px 22px;
                    border-radius: 16px;
                    cursor: pointer;
                    backdrop-filter: blur(8px);
                    transition: all 0.25s ease;
                }

                .cmtk-btn-header-action:hover {
                    background: #ffffff;
                    color: #6d28d9;
                    box-shadow: 0 8px 20px rgba(0,0,0,0.15);
                    transform: translateY(-2px);
                }

                /* Level 1 Main Tabs Navigation Bar (Matched Image 4 100%) */
                .cmtk-tabs-main {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .cmtk-tab-btn {
                    background: #ffffff;
                    border: 2px solid #e2e8f0;
                    border-radius: 18px;
                    padding: 20px 24px;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    cursor: pointer;
                    transition: all 0.25s ease;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
                    width: 100%;
                    box-sizing: border-box;
                }

                .cmtk-tab-btn:hover {
                    border-color: #c084fc;
                    transform: translateY(-2px);
                }

                .cmtk-tab-btn.active {
                    background: linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%) !important;
                    border-color: #6d28d9 !important;
                    box-shadow: 0 8px 24px rgba(109, 40, 217, 0.45) !important;
                }

                .cmtk-tab-btn .tab-num {
                    font-size: 13.5px;
                    font-weight: 900;
                    color: #7c3aed;
                    background: #f3e8ff;
                    padding: 4px 12px;
                    border-radius: 12px;
                    margin-bottom: 8px;
                    letter-spacing: 0.8px;
                    text-transform: uppercase;
                }

                .cmtk-tab-btn.active .tab-num {
                    color: #ffffff !important;
                    background: rgba(255, 255, 255, 0.25) !important;
                }

                .cmtk-tab-btn .tab-label {
                    font-size: 18.5px;
                    font-weight: 900;
                    color: #1e293b;
                    line-height: 1.35;
                    letter-spacing: -0.2px;
                }

                .cmtk-tab-btn.active .tab-label {
                    color: #ffffff !important;
                }

                /* Department / Category Pills (Matched Image 4 100%) */
                .cmtk-dept-pill {
                    border: 1.5px solid #e9d5ff;
                    background: #ffffff;
                    color: #6d28d9;
                    font-weight: 800;
                    font-size: 13px;
                    padding: 8px 18px;
                    border-radius: 9999px;
                    cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    box-shadow: 0 2px 8px rgba(109, 40, 217, 0.04);
                    user-select: none;
                }

                .cmtk-dept-pill:hover {
                    border-color: #a855f7;
                    background: #f3e8ff;
                    color: #6d28d9;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 14px rgba(109, 40, 217, 0.12);
                }

                .cmtk-dept-pill.active {
                    background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%) !important;
                    color: #ffffff !important;
                    border-color: #6d28d9 !important;
                    box-shadow: 0 6px 18px rgba(124, 58, 237, 0.45), 0 2px 6px rgba(109, 40, 217, 0.3) !important;
                    font-weight: 900 !important;
                    transform: translateY(-1px);
                }

                /* Card Grid & Items */
                .cmtk-card-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 22px;
                }

                .cmtk-card-item {
                    background: #ffffff;
                    border-radius: 22px;
                    border: 1.5px solid #e2e8f0;
                    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                }

                .cmtk-card-item:hover {
                    transform: translateY(-4px);
                    border-color: #c084fc;
                    box-shadow: 0 20px 40px -12px rgba(109, 40, 217, 0.18);
                }

                .card-accent-bar.theme-purple {
                    height: 5px;
                    background: linear-gradient(90deg, #6d28d9, #a855f7);
                }

                .card-inner {
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                }

                .card-title {
                    font-size: 16px;
                    font-weight: 900;
                    color: #0f172a;
                    margin: 0 0 10px 0;
                    line-height: 1.4;
                }

                .card-badge {
                    font-size: 11.5px;
                    font-weight: 850;
                    padding: 4px 10px;
                    border-radius: 8px;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                }

                .card-badge.theme-purple {
                    background: #faf5ff;
                    color: #6d28d9;
                    border: 1px solid #e9d5ff;
                }

                .card-badge.theme-blue {
                    background: #eff6ff;
                    color: #1d4ed8;
                    border: 1px solid #bfdbfe;
                }

                .card-btn-open {
                    background: linear-gradient(135deg, #6d28d9, #7c3aed);
                    color: #ffffff;
                    border: none;
                    font-weight: 850;
                    font-size: 12.5px;
                    padding: 9px 14px;
                    border-radius: 12px;
                    cursor: pointer;
                    box-shadow: 0 4px 14px rgba(109,40,217,0.3);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    flex: 1;
                    justify-content: center;
                }

                /* Toast notification */
                .cmtk-toast {
                    position: fixed;
                    bottom: 28px;
                    right: 28px;
                    background: #10b981;
                    color: #ffffff;
                    padding: 12px 24px;
                    border-radius: 16px;
                    font-weight: 850;
                    font-size: 14px;
                    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
                    z-index: 999999;
                    opacity: 0;
                    transform: translateY(20px);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    pointer-events: none;
                }

                .cmtk-toast.show {
                    opacity: 1;
                    transform: translateY(0);
                }

                @media (max-width: 768px) {
                    .cmtk-tabs-main { grid-template-columns: 1fr; }
                    .cmtk-header { flex-direction: column; align-items: flex-start; gap: 16px; }
                }
            </style>
        `;
    }

    // Export Page Renderer for App Router
    window.renderChammauthietkePage = function(targetContainer) {
        initPage(targetContainer);
    };
    window.renderChamMauThietKePage = function(targetContainer) {
        initPage(targetContainer);
    };

    // Auto-init on page load
    document.addEventListener('DOMContentLoaded', () => initPage());
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        initPage();
    }
})();
