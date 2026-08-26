// ========== MAKET & CHẤM MÀU THIẾT KẾ — BỘ PHẬN THIẾT KẾ HV ==========
// Executive Design & Font matched 100% with Quản Trị Nhân Sự & Hành Chính HV
(function () {
    'use strict';

    let currentMainTab = localStorage.getItem('cmtk_main_tab') || 'muc1_maket'; // 'muc1_maket' | 'muc2_chammau'
    let maketList = [];
    let fabricsData = { warehouses: [], materials: [], colors: [] };
    let swatchesMap = {};
    let currentSearchQuery = '';
    let selectedMaterialFilter = 'all';
    let selectedWarehouseFilter = 'all';

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

    // Helper: Canvas Image Compression (<150KB JPEG, keeping high resolution for download)
    function compressImage(file, maxDimension = 1400, quality = 0.82) {
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
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(dataUrl);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
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
                maketList = cfgData.makets || [];
                swatchesMap = cfgData.swatches || {};
            }
            if (fabData && fabData.success) {
                fabricsData = fabData;
            }
        } catch (e) {
            console.error('[CMTK] Error loading data:', e);
        }
    }

    // Main Init Function matching Quản Trị Nhân Sự
    function initPage(targetContainer = null) {
        const root = targetContainer || document.getElementById('mainContent');
        if (!root) return;

        // Render UI layout immediately (0ms delay)
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
                        <button type="button" id="cmtkBtnAddMaket" onclick="window._cmtkOpenAddMaketModal()" class="cmtk-btn-header-action">
                            ➕ Tạo Bản Maket Mới
                        </button>
                    </div>
                </div>

                <!-- Level 1 Main Tabs Navigation (Matched MỤC 1 & MỤC 2 Cards in Quản Trị Nhân Sự) -->
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

        // Async load API data in background & refresh tab view mượt mà
        loadData().then(() => {
            renderCurrentMainTab();
        });
    }

    // Switch Main Tabs
    window._cmtkSwitchMainTab = function (tabId) {
        currentMainTab = tabId;
        localStorage.setItem('cmtk_main_tab', tabId);

        document.querySelectorAll('.cmtk-tab-btn').forEach(btn => {
            if (btn.getAttribute('data-maintab') === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        renderCurrentMainTab();
    };

    // Render Current Main Tab
    function renderCurrentMainTab() {
        const container = document.getElementById('cmtkContentContainer');
        if (!container) return;

        if (currentMainTab === '    // ==========================================
    // TAB 1: KHO LƯU TRỮ BẢN MAKET
    // ==========================================
    function renderTab1Maket(container) {
        const matSet = new Set(maketList.map(m => m.fabricMaterial).filter(Boolean));

        container.innerHTML = `
            <!-- Search Bar (Matched with Quản Trị Nhân Sự) -->
            <div style="margin-bottom: 20px; position: relative;">
                <div style="position: relative; display: flex; align-items: center;">
                    <span style="position: absolute; left: 18px; font-size: 18px; color: #7c3aed; pointer-events: none; z-index: 2;">🔍</span>
                    <input type="text" id="cmtkSearchMaketInput" value="${currentSearchQuery}" 
                        placeholder="Tìm kiếm mẫu Maket, tên khách hàng, trường học, chất liệu..." 
                        style="width: 100%; border: 2px solid #e9d5ff; border-radius: 18px; padding: 13px 48px 13px 48px; font-size: 14.5px; font-weight: 700; background: #ffffff; outline: none; color: #0f172a; box-shadow: 0 4px 16px rgba(124,58,237,0.08);"
                        oninput="window._cmtkOnSearchMaket(this.value)">
                </div>
            </div>

            <!-- Subtabs / Filter Control Bar -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; flex-wrap: wrap; gap: 14px; background: linear-gradient(135deg, rgba(250,245,255,0.95), rgba(243,232,255,0.98)); backdrop-filter: blur(16px); padding: 14px 22px; border-radius: 20px; border: 1.5px solid #e9d5ff; box-shadow: 0 12px 32px -8px rgba(109,40,217,0.15);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 14px; font-weight: 850; color: #5b21b6;">Lọc Theo Chất Liệu Vải:</span>
                </div>
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <select id="cmtkFilterMatSelect" onchange="window._cmtkOnFilterMatChange(this.value)" 
                        style="border: 2px solid #e9d5ff; border-radius: 14px; padding: 9px 16px; font-size: 13.5px; font-weight: 800; color: #6d28d9; background: #ffffff; outline: none; cursor: pointer;">
                        <option value="all">🌐 Tất Cả Chất Liệu (${maketList.length})</option>
                        ${Array.from(matSet).map(mat => `<option value="${mat}" ${selectedMaterialFilter === mat ? 'selected' : ''}>🧵 ${mat}</option>`).join('')}
                    </select>
                </div>
            </div>

            <!-- Dedicated Grid Container for Maket Cards -->
            <div id="cmtkCardGridContainer">
                ${_cmtkRenderMaketCardsHTML()}
            </div>
        `;
    }

    function _cmtkRenderMaketCardsHTML() {
        let filtered = maketList.filter(item => {
            const q = currentSearchQuery.toLowerCase().trim();
            const matchQ = !q || (item.title || '').toLowerCase().includes(q) || (item.customerName || '').toLowerCase().includes(q) || (item.fabricMaterial || '').toLowerCase().includes(q);
            const matchMat = selectedMaterialFilter === 'all' || item.fabricMaterial === selectedMaterialFilter;
            return matchQ && matchMat;
        });

        if (filtered.length === 0) {
            return `
                <div style="text-align: center; padding: 60px 20px; background: #ffffff; border-radius: 24px; border: 2px dashed #cbd5e1;">
                    <div style="font-size: 48px; margin-bottom: 12px;">🎨</div>
                    <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 900; color: #334155;">Chưa có bản thiết kế Maket nào trong thư viện</h3>
                    <p style="margin: 0 0 20px 0; font-size: 14px; color: #64748b; font-weight: 600;">Hãy bấm nút bên dưới để lưu trữ mẫu thiết kế Maket mới nhất cho khách hàng!</p>
                    <button type="button" onclick="window._cmtkOpenAddMaketModal()" style="background: linear-gradient(135deg, #6d28d9, #7c3aed); color: #ffffff; border: none; font-weight: 900; font-size: 14px; padding: 12px 24px; border-radius: 14px; cursor: pointer; box-shadow: 0 6px 18px rgba(109,40,217,0.35);">
                        ➕ Tạo Bản Maket Mới Ngay
                    </button>
                </div>
            `;
        }

        return `
            <div class="cmtk-card-grid">
                ${filtered.map(item => `
                    <div class="cmtk-card-item">
                        <div class="card-accent-bar theme-purple"></div>
                        
                        <!-- Header Thumbnail Banner -->
                        <div style="position: relative; width: 100%; height: 210px; background: #0f172a; cursor: pointer; overflow: hidden;" onclick="window._cmtkOpenDetailModal('${item.id}')" title="Nhấp để xem chi tiết bản Maket">
                            ${item.imageUrl ? `
                                <img src="${item.imageUrl}" style="width: 100%; height: 100%; object-fit: contain; display: block; transition: transform 0.3s ease;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
                            ` : `
                                <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px; background: linear-gradient(135deg, #1e293b, #0f172a); color: #64748b;">🎨</div>
                            `}
                            <div style="position: absolute; top: 12px; right: 12px; background: rgba(15,23,42,0.85); color: #ffffff; font-size: 11px; font-weight: 850; padding: 4px 10px; border-radius: 10px; backdrop-filter: blur(4px);">
                                📋 Xem Chi Tiết
                            </div>
                            ${item.hexCode ? `
                                <div style="position: absolute; bottom: 12px; left: 12px; background: #ffffff; color: #0f172a; font-size: 11.5px; font-weight: 900; padding: 4px 10px; border-radius: 10px; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                                    <span style="width: 12px; height: 12px; border-radius: 50%; background: ${item.hexCode}; display: inline-block; border: 1px solid rgba(0,0,0,0.2);"></span>
                                    <span>${item.hexCode}</span>
                                </div>
                            ` : ''}
                        </div>

                        <!-- Card Inner Content -->
                        <div class="card-inner">
                            <div class="card-main-content">
                                <div style="font-size: 12px; font-weight: 850; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                                    🏢 ${item.customerName || 'Khách Hàng Doanh Nghiệp / Trường Học'}
                                </div>
                                <h3 class="card-title">
                                    ${item.title || 'Mẫu Maket Áo Đồng Phục'}
                                </h3>
                                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px;">
                                    ${item.fabricMaterial ? `<span class="card-badge theme-purple">🧵 ${item.fabricMaterial}</span>` : ''}
                                    ${item.fabricColor ? `<span class="card-badge theme-blue">🎨 Màu: ${item.fabricColor}</span>` : ''}
                                </div>
                            </div>

                            <!-- Card Footer Action Buttons -->
                            <div style="display: flex; gap: 8px; margin-top: auto;">
                                <button type="button" onclick="window._cmtkOpenDetailModal('${item.id}')" class="card-btn-open" title="Xem Chi Tiết Quy Trình">
                                    📋 <span>Xem Chi Tiết ➔</span>
                                </button>
                                ${item.docUrl ? `
                                    <a href="${item.docUrl}" target="_blank" rel="noopener" 
                                        style="border: 1.5px solid #a855f7; background: #faf5ff; color: #6b21a8; font-weight: 850; font-size: 12.5px; padding: 9px 12px; border-radius: 12px; text-decoration: none; display: flex; align-items: center; gap: 4px;" title="Mở File Gốc Drive/Vector">
                                        🔗 <span>File Gốc ↗</span>
                                    </a>
                                ` : ''}
                                <button type="button" onclick="window._cmtkDeleteMaket('${item.id}')" style="border: 1.5px solid #fecdd3; background: #fff1f2; color: #be123c; padding: 9px 12px; border-radius: 12px; cursor: pointer; font-size: 12px;" title="Xóa Maket">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // ==========================================
    // TAB 2: CHẤM MÀU THIẾT KẾ & KHO VẢI
    // ==========================================
    function renderTab2Chammau(container) {
        const warehouses = fabricsData.warehouses || [];
        const materials = fabricsData.materials || [];

        container.innerHTML = `
            <!-- Search Bar (Matched with Quản Trị Nhân Sự) -->
            <div style="margin-bottom: 20px; position: relative;">
                <div style="position: relative; display: flex; align-items: center;">
                    <span style="position: absolute; left: 18px; font-size: 18px; color: #7c3aed; pointer-events: none; z-index: 2;">🔍</span>
                    <input type="text" id="cmtkSearchColorInput" value="${currentSearchQuery}" 
                        placeholder="Tìm mã màu HEX, tên màu vải, chất liệu..." 
                        style="width: 100%; border: 2px solid #e9d5ff; border-radius: 18px; padding: 13px 48px 13px 48px; font-size: 14.5px; font-weight: 700; background: #ffffff; outline: none; color: #0f172a; box-shadow: 0 4px 16px rgba(124,58,237,0.08);"
                        oninput="window._cmtkOnSearchMaket(this.value)">
                </div>
            </div>

            <!-- Subtabs / Filter Control Bar -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; flex-wrap: wrap; gap: 14px; background: linear-gradient(135deg, rgba(250,245,255,0.95), rgba(243,232,255,0.98)); backdrop-filter: blur(16px); padding: 14px 22px; border-radius: 20px; border: 1.5px solid #e9d5ff; box-shadow: 0 12px 32px -8px rgba(109,40,217,0.15);">
                <div style="display: flex; gap: 14px; align-items: center; flex-wrap: wrap;">
                    <span style="font-size: 13.5px; font-weight: 850; color: #5b21b6;">Kho vải:</span>
                    <select id="cmtkFilterWarehouseSelect" onchange="window._cmtkOnFilterWarehouseChange(this.value)" 
                        style="border: 2px solid #e9d5ff; border-radius: 14px; padding: 9px 16px; font-size: 13.5px; font-weight: 800; color: #6d28d9; background: #ffffff; outline: none; cursor: pointer;">
                        <option value="all">🏬 Tất Cả Kho Vải (${warehouses.length})</option>
                        ${warehouses.map(w => `<option value="${w.id}" ${selectedWarehouseFilter === String(w.id) ? 'selected' : ''}>🏬 ${w.name}</option>`).join('')}
                    </select>

                    <span style="font-size: 13.5px; font-weight: 850; color: #5b21b6;">Chất liệu:</span>
                    <select id="cmtkFilterMaterialSelect" onchange="window._cmtkOnFilterMatChange(this.value)" 
                        style="border: 2px solid #e9d5ff; border-radius: 14px; padding: 9px 16px; font-size: 13.5px; font-weight: 800; color: #6d28d9; background: #ffffff; outline: none; cursor: pointer;">
                        <option value="all">🧵 Tất Cả Chất Liệu (${materials.length})</option>
                        ${materials.map(m => `<option value="${m.id}" ${selectedMaterialFilter === String(m.id) ? 'selected' : ''}>🧵 ${m.name}</option>`).join('')}
                    </select>
                </div>
            </div>

            <!-- Dedicated Grid Container for Swatches -->
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

        if (Object.keys(groupedByMat).length === 0) {
            return `
                <div style="text-align: center; padding: 60px 20px; background: #ffffff; border-radius: 24px; border: 2px dashed #cbd5e1;">
                    <div style="font-size: 48px; margin-bottom: 12px;">🧵</div>
                    <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 900; color: #334155;">Không tìm thấy màu vải nào khớp với bộ lọc</h3>
                </div>
            `;
        }

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
                                    const hex = c.hex_code || '#3b82f6';
                                    return `
                                        <div class="cmtk-swatch-card" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 18px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.25s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.02);" onmouseover="this.style.borderColor='#c084fc'; this.style.boxShadow='0 10px 24px rgba(109,40,217,0.12)';" onmouseout="this.style.borderColor='#e2e8f0'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.02)';">
                                            <div>
                                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                                                    <div style="position: relative; width: 48px; height: 48px; border-radius: 50%; background: ${hex}; border: 3px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.18); flex-shrink: 0;" title="Digital HEX Swatch: ${hex}"></div>
                                                    <div style="flex: 1; min-width: 0;">
                                                        <div style="font-size: 15px; font-weight: 900; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                                            🎨 ${c.color_name}
                                                        </div>
                                                        <div style="font-size: 11.5px; font-weight: 750; color: #64748b;">
                                                            🏬 ${c.warehouse_name || 'Kho Vải'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style="background: #faf5ff; border: 1.5px solid #e9d5ff; border-radius: 10px; padding: 6px 12px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                                                    <span style="font-size: 11px; font-weight: 850; color: #6b21a8; text-transform: uppercase;">MÃ #HEX:</span>
                                                    <strong style="font-size: 13px; font-weight: 900; color: #0f172a; font-family: monospace;">${hex}</strong>
                                                </div>
                                            </div>

                                            <div style="display: flex; gap: 6px; margin-top: 8px;">
                                                <button type="button" onclick="window._cmtkCopyHex('${hex}', '${c.color_name}')" class="card-btn-open" title="Sao chép mã màu #HEX dán vào Photoshop / Illustrator">
                                                    📋 <span>Sao Chép #HEX</span>
                                                </button>
                                                <button type="button" onclick="window._cmtkOpenEditColorModal('${c.material_id}', '${c.id}', '${c.color_name}', '${hex}', '${c.swatch_image || ''}')" 
                                                    style="border: 1.5px solid #d8b4fe; background: #faf5ff; color: #6b21a8; font-weight: 850; font-size: 12.5px; padding: 9px 12px; border-radius: 12px; cursor: pointer;" title="Chấm màu mới">
                                                    ⚙️ Chấm Màu
                                                </button>
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

    // Dynamic Search Handler without destroying search input focus!
    window._cmtkOnSearchMaket = function (val) {
        currentSearchQuery = val || '';
        const grid1 = document.getElementById('cmtkCardGridContainer');
        const grid2 = document.getElementById('cmtkSwatchesGridContainer');

        if (grid1) {
            grid1.innerHTML = _cmtkRenderMaketCardsHTML();
        } else if (grid2) {
            grid2.innerHTML = _cmtkRenderSwatchesCardsHTML();
        } else {
            renderCurrentMainTab();
        }
    };

    window._cmtkOnFilterMatChange = function (val) {
        selectedMaterialFilter = val || 'all';
        const grid1 = document.getElementById('cmtkCardGridContainer');
        const grid2 = document.getElementById('cmtkSwatchesGridContainer');

        if (grid1) {
            grid1.innerHTML = _cmtkRenderMaketCardsHTML();
        } else if (grid2) {
            grid2.innerHTML = _cmtkRenderSwatchesCardsHTML();
        } else {
            renderCurrentMainTab();
        }
    };                               </button>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `}
        `;
    }

    window._cmtkOnFilterWarehouseChange = function (val) {
        selectedWarehouseFilter = val || 'all';
        renderCurrentMainTab();
    };

    // 1-Click Copy HEX Code to Clipboard
    window._cmtkCopyHex = function (hex, colorName) {
        navigator.clipboard.writeText(hex).then(() => {
            showToast(`✅ Đã sao chép mã màu ${hex} (${colorName})! Dán ngay vào Photoshop/Illustrator.`);
        }).catch(err => {
            const input = document.createElement('input');
            input.value = hex;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            showToast(`✅ Đã sao chép mã màu ${hex} (${colorName})!`);
        });
    };

    // ==========================================
    // MODAL 1: TẠO / SỬA MAKET
    // ==========================================
    function ensureMaketModalInDOM() {
        let modal = document.getElementById('cmtkMaketModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'cmtkMaketModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:99999; align-items:center; justify-content:center; padding:20px;';
            modal.innerHTML = `
                <div style="max-height:90vh; display:flex; flex-direction:column; width:100%; max-width:640px; border-radius:24px; overflow:hidden; background:#ffffff; box-shadow:0 25px 50px -12px rgba(91,33,182,0.35);">
                    <div style="flex-shrink:0; padding:18px 24px; background:linear-gradient(135deg, #4c1d95, #6d28d9); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                        <h3 id="cmtkMaketModalTitle" style="margin:0; font-size:17.5px; font-weight:900;">🎨 ➕ TẠO BẢN THIẾT KẾ MAKET MỚI</h3>
                        <button type="button" onclick="window._cmtkCloseMaketModal()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:30px; height:30px; border-radius:50%; cursor:pointer; font-size:16px; font-weight:bold;">✕</button>
                    </div>

                    <form id="cmtkMaketForm" onsubmit="window._cmtkSaveMaket(event)" style="flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:14px; background:#fcfafc;">
                        <input type="hidden" id="cmtkFormMaketId" value="">
                        
                        <div class="qtns-form-group">
                            <label style="color:#0f172a; font-weight:850; display:block; margin-bottom:6px;">Tiêu đề bản thiết kế Maket (* BẮT BUỘC):</label>
                            <input type="text" id="cmtkFormTitle" placeholder="Ví dụ: Maket Áo Polo Đồng Phục Trường THPT Chuyên..." required style="width:100%; border:2px solid #e9d5ff; border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:700; color:#0f172a;">
                        </div>

                        <div class="qtns-form-group">
                            <label style="color:#5b21b6; font-weight:850; display:block; margin-bottom:6px;">🏢 Tên Khách Hàng / Công Ty / Trường Học (*):</label>
                            <input type="text" id="cmtkFormCustomer" placeholder="Ví dụ: Công ty May Đồng Phục HV / Trường Nguyễn Trãi..." required style="width:100%; border:2px solid #e9d5ff; border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:700; color:#0f172a;">
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                            <div class="qtns-form-group">
                                <label style="color:#334155; font-weight:850; display:block; margin-bottom:6px;">🧵 Chất Liệu Vải Thực Tế:</label>
                                <select id="cmtkFormMaterial" style="width:100%; border:2px solid #e9d5ff; border-radius:12px; padding:10px 12px; font-size:13px; font-weight:750; color:#4c1d95; background:#ffffff;">
                                </select>
                            </div>
                            <div class="qtns-form-group">
                                <label style="color:#334155; font-weight:850; display:block; margin-bottom:6px;">🎨 Mã Màu Chấm (#HEX):</label>
                                <input type="text" id="cmtkFormHex" placeholder="#E63946" style="width:100%; border:2px solid #e9d5ff; border-radius:12px; padding:10px 12px; font-size:13px; font-weight:750; color:#0f172a;">
                            </div>
                        </div>

                        <div class="qtns-form-group">
                            <label style="color:#0f172a; font-weight:850; display:block; margin-bottom:6px;">🖼️ Hình Ảnh Bản Vẽ Maket (Ảnh chụp/xử lý tự động nén nét căng):</label>
                            <input type="file" id="cmtkFormImageFile" accept="image/*" style="display:none;" onchange="window._cmtkOnMaketImageSelected(this)">
                            <button type="button" onclick="document.getElementById('cmtkFormImageFile').click()" style="border:1.5px dashed #a855f7; background:#faf5ff; color:#6b21a8; padding:10px 16px; border-radius:12px; font-weight:800; cursor:pointer; width:100%; text-align:center;">
                                📷 Tải Hình Ảnh Maket Từ Máy / Điện Thoại
                            </button>
                            <input type="hidden" id="cmtkFormImageUrl" value="">
                            <div id="cmtkFormImagePreviewBox" style="display:none; margin-top:8px; text-align:center; border:1px solid #cbd5e1; border-radius:12px; padding:8px; background:#ffffff;">
                                <img id="cmtkFormImagePreviewImg" src="" style="max-height:160px; max-width:100%; border-radius:8px; object-fit:contain;">
                            </div>
                        </div>

                        <div class="qtns-form-group">
                            <label style="color:#0f172a; font-weight:850; display:block; margin-bottom:6px;">🔗 Link File Thiết Kế Gốc (Google Drive / Illustrator / PDF):</label>
                            <input type="url" id="cmtkFormDocUrl" placeholder="https://drive.google.com/..." style="width:100%; border:2px solid #e9d5ff; border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:700; color:#0f172a;">
                        </div>

                        <div class="qtns-form-group">
                            <label style="color:#334155; font-weight:850; display:block; margin-bottom:6px;">📝 Ghi Chú Kỹ Thuật (Vị trí in, kích thước logo, yêu cầu):</label>
                            <textarea id="cmtkFormNotes" rows="3" placeholder="Ghi chú về kiểu may,bo cổ, viền tay, vị trí logo trước ngực..." style="width:100%; border:2px solid #e9d5ff; border-radius:14px; padding:10px 14px; font-size:13px; font-weight:600; color:#0f172a; font-family:inherit; outline:none; resize:vertical;"></textarea>
                        </div>

                        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:10px;">
                            <button type="button" onclick="window._cmtkCloseMaketModal()" style="padding:10px 20px; border-radius:12px; font-weight:800; border:1.5px solid #cbd5e1; background:#ffffff; color:#334155; cursor:pointer;">Hủy Bỏ</button>
                            <button type="submit" style="padding:10px 24px; border-radius:12px; font-weight:900; border:none; background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; cursor:pointer; box-shadow:0 4px 14px rgba(109,40,217,0.35);">💾 Lưu Bản Maket</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    }

    window._cmtkOpenAddMaketModal = function () {
        const modal = ensureMaketModalInDOM();
        document.getElementById('cmtkMaketModalTitle').innerText = '🎨 ➕ TẠO BẢN THIẾT KẾ MAKET MỚI';
        document.getElementById('cmtkFormMaketId').value = '';
        document.getElementById('cmtkFormTitle').value = '';
        document.getElementById('cmtkFormCustomer').value = '';
        document.getElementById('cmtkFormHex').value = '';
        document.getElementById('cmtkFormImageUrl').value = '';
        document.getElementById('cmtkFormDocUrl').value = '';
        document.getElementById('cmtkFormNotes').value = '';
        document.getElementById('cmtkFormImagePreviewBox').style.display = 'none';

        const matSelect = document.getElementById('cmtkFormMaterial');
        const materials = fabricsData.materials || [];
        matSelect.innerHTML = `<option value="">-- Chọn chất liệu vải --</option>` + 
            materials.map(m => `<option value="${m.name}">🧵 ${m.name}</option>`).join('');

        modal.style.display = 'flex';
    };

    window._cmtkCloseMaketModal = function () {
        const modal = document.getElementById('cmtkMaketModal');
        if (modal) modal.style.display = 'none';
    };

    window._cmtkOnMaketImageSelected = async function (input) {
        if (!input || !input.files || !input.files[0]) return;
        try {
            const compressed = await compressImage(input.files[0], 1400, 0.82);
            document.getElementById('cmtkFormImageUrl').value = compressed;
            const previewImg = document.getElementById('cmtkFormImagePreviewImg');
            const previewBox = document.getElementById('cmtkFormImagePreviewBox');
            if (previewImg) previewImg.src = compressed;
            if (previewBox) previewBox.style.display = 'block';
            showToast('✅ Đã nén ảnh Maket độ nét cao thành công!');
        } catch (e) {
            console.error('[Image Compression Error]', e);
            showToast('⚠️ Nén ảnh thất bại', 'error');
        }
    };

    window._cmtkSaveMaket = async function (e) {
        e.preventDefault();
        const id = document.getElementById('cmtkFormMaketId').value || 'mkt_' + Date.now();
        const title = document.getElementById('cmtkFormTitle').value.trim();
        const customerName = document.getElementById('cmtkFormCustomer').value.trim();
        const fabricMaterial = document.getElementById('cmtkFormMaterial').value;
        const hexCode = document.getElementById('cmtkFormHex').value.trim();
        const imageUrl = document.getElementById('cmtkFormImageUrl').value;
        const docUrl = document.getElementById('cmtkFormDocUrl').value.trim();
        const notes = document.getElementById('cmtkFormNotes').value.trim();

        if (!title || !customerName) {
            showToast('⚠️ Vui lòng nhập tiêu đề và tên khách hàng!', 'error');
            return;
        }

        const idx = maketList.findIndex(m => String(m.id) === String(id));
        const newItem = {
            id, title, customerName, fabricMaterial, hexCode, imageUrl, docUrl, notes,
            createdAt: idx !== -1 ? maketList[idx].createdAt : new Date().toISOString()
        };

        if (idx !== -1) {
            maketList[idx] = newItem;
        } else {
            maketList.unshift(newItem);
        }

        try {
            await fetch('/api/chammauthietke/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: maketList })
            });
            showToast('✅ Đã lưu bản Maket thành công!');
            window._cmtkCloseMaketModal();
            renderCurrentMainTab();
        } catch (err) {
            showToast('❌ Lưu Maket thất bại: ' + err.message, 'error');
        }
    };

    window._cmtkDeleteMaket = async function (id) {
        if (!confirm('Bạn có chắc chắn muốn xóa bản Maket này không?')) return;
        maketList = maketList.filter(m => String(m.id) !== String(id));
        try {
            await fetch('/api/chammauthietke/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: maketList })
            });
            showToast('🗑️ Đã xóa bản Maket!');
            renderCurrentMainTab();
        } catch (err) {
            showToast('❌ Xóa thất bại: ' + err.message, 'error');
        }
    };

    // ==========================================
    // DETAIL VIEW MODAL & LIGHTBOX
    // ==========================================
    function ensureDetailModalInDOM() {
        let modal = document.getElementById('cmtkDetailModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'cmtkDetailModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:99999; align-items:center; justify-content:center; padding:20px;';
            modal.innerHTML = `
                <div style="max-height:90vh; display:flex; flex-direction:column; width:100%; max-width:720px; border-radius:24px; overflow:hidden; background:#ffffff; box-shadow:0 25px 50px -12px rgba(0,0,0,0.35); border:1.5px solid #d8b4fe;">
                    <div style="flex-shrink:0; padding:20px 26px; background:linear-gradient(135deg, #4c1d95, #6d28d9); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <span style="font-size:26px; background:rgba(255,255,255,0.2); padding:8px 12px; border-radius:14px;">🎨</span>
                            <div>
                                <h3 id="cmtkDetailTitle" style="margin:0; font-size:18px; font-weight:900; color:#ffffff;">Chi Tiết Bản Maket</h3>
                            </div>
                        </div>
                        <button type="button" onclick="window._cmtkCloseDetailModal()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:34px; height:34px; border-radius:50%; cursor:pointer; font-size:18px; font-weight:bold;">✕</button>
                    </div>

                    <div style="flex:1; overflow-y:auto; padding:22px 26px; display:flex; flex-direction:column; gap:18px; background:#fcfafc;">
                        <!-- Image Box -->
                        <div id="cmtkDetailImageBox" style="display:none; background:#ffffff; border:1.5px solid #e9d5ff; border-radius:18px; padding:16px; text-align:center;">
                            <div style="font-size:13px; font-weight:850; color:#6b21a8; margin-bottom:8px; text-align:left;">🖼️ HÌNH ẢNH MAKET MINH HỌA:</div>
                            <img id="cmtkDetailImg" src="" style="max-height:360px; max-width:100%; border-radius:12px; cursor:pointer; object-fit:contain;" onclick="window._cmtkOpenLightbox(this.src)" title="Click để phóng to ảnh nét căng">
                        </div>

                        <div id="cmtkDetailSubtitleBox" style="background:#ffffff; border:1.5px solid #e9d5ff; border-radius:16px; padding:16px 20px;">
                            <div style="font-size:13px; font-weight:850; color:#6b21a8; margin-bottom:6px;">📝 MÔ TẢ & GHI CHÚ KỸ THUẬT:</div>
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
        if (item.imageUrl) {
            imgEl.src = item.imageUrl;
            imgBox.style.display = 'block';
        } else {
            imgBox.style.display = 'none';
        }

        const notesText = document.getElementById('cmtkDetailNotesText');
        notesText.innerText = item.notes || item.customerName || 'Không có ghi chú thêm.';

        const footerBtn = document.getElementById('cmtkDetailFooterBtn');
        if (item.docUrl) {
            footerBtn.innerHTML = `
                <a href="${item.docUrl}" target="_blank" rel="noopener" style="background:linear-gradient(135deg, #059669, #10b981); color:#ffffff; padding:10px 22px; border-radius:12px; font-weight:900; font-size:13.5px; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                    🔗 Mở File Thiết Kế Gốc ↗
                </a>
            `;
        } else {
            footerBtn.innerHTML = '';
        }

        modal.style.display = 'flex';
    };

    window._cmtkCloseDetailModal = function () {
        const modal = document.getElementById('cmtkDetailModal');
        if (modal) modal.style.display = 'none';
    };

    // Lightbox Engine
    function ensureLightboxInDOM() {
        let lightbox = document.getElementById('cmtkLightboxModal');
        if (!lightbox) {
            lightbox = document.createElement('div');
            lightbox.id = 'cmtkLightboxModal';
            lightbox.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.92); backdrop-filter:blur(10px); z-index:999999; flex-direction:column; align-items:center; justify-content:center; padding:20px;';
            lightbox.innerHTML = `
                <div style="position:absolute; top:20px; right:24px; display:flex; gap:12px; z-index:10;">
                    <a id="cmtkLbDownloadBtn" href="" download="bap_ve_maket.jpg" style="background:rgba(255,255,255,0.2); color:#ffffff; text-decoration:none; border-radius:10px; padding:8px 16px; font-weight:800; font-size:13px; display:flex; align-items:center; gap:6px;">💾 Tải Ảnh Về</a>
                    <button type="button" onclick="window._cmtkCloseLightbox()" style="background:rgba(255,255,255,0.25); border:none; color:#ffffff; width:36px; height:36px; border-radius:50%; cursor:pointer; font-size:18px; font-weight:bold;">✕</button>
                </div>
                <div style="max-width:92vw; max-height:85vh; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                    <img id="cmtkLbImage" src="" style="max-width:100%; max-height:85vh; border-radius:12px; object-fit:contain; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
                </div>
            `;
            document.body.appendChild(lightbox);
        }
        return lightbox;
    }

    window._cmtkOpenLightbox = function (imgSrc) {
        if (!imgSrc) return;
        const lb = ensureLightboxInDOM();
        document.getElementById('cmtkLbImage').src = imgSrc;
        document.getElementById('cmtkLbDownloadBtn').href = imgSrc;
        lb.style.display = 'flex';
    };

    window._cmtkCloseLightbox = function () {
        const lb = document.getElementById('cmtkLightboxModal');
        if (lb) lb.style.display = 'none';
    };

    // ==========================================
    // MODAL 2: CHẤM MÀU VẢI (PICK HEX COLOR)
    // ==========================================
    function ensureEditColorModalInDOM() {
        let modal = document.getElementById('cmtkEditColorModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'cmtkEditColorModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:99999; align-items:center; justify-content:center; padding:20px;';
            modal.innerHTML = `
                <div style="max-height:90vh; display:flex; flex-direction:column; width:100%; max-width:520px; border-radius:24px; overflow:hidden; background:#ffffff; box-shadow:0 25px 50px -12px rgba(91,33,182,0.35);">
                    <div style="flex-shrink:0; padding:18px 24px; background:linear-gradient(135deg, #4c1d95, #6d28d9); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                        <h3 id="cmtkColorModalTitle" style="margin:0; font-size:17px; font-weight:900;">⚙️ CHẤM MÀU THIẾT KẾ CHO MÀU VẢI</h3>
                        <button type="button" onclick="window._cmtkCloseEditColorModal()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:30px; height:30px; border-radius:50%; cursor:pointer; font-size:16px; font-weight:bold;">✕</button>
                    </div>

                    <form onsubmit="window._cmtkSaveColorHex(event)" style="flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:14px; background:#fcfafc;">
                        <input type="hidden" id="cmtkFormColorKey" value="">
                        
                        <div class="qtns-form-group">
                            <label style="color:#0f172a; font-weight:850; display:block; margin-bottom:4px;">Tên Màu Vải:</label>
                            <input type="text" id="cmtkFormColorNameDisplay" readonly style="width:100%; border:1.5px solid #cbd5e1; border-radius:12px; padding:10px 14px; font-size:14px; font-weight:800; color:#4c1d95; background:#f1f5f9;">
                        </div>

                        <div class="qtns-form-group">
                            <label style="color:#5b21b6; font-weight:900; display:block; margin-bottom:6px;">🎨 Chọn Mã Màu Chấm (#HEX):</label>
                            <div style="display:flex; gap:12px; align-items:center;">
                                <input type="color" id="cmtkFormColorPicker" style="width:54px; height:44px; border:none; border-radius:10px; cursor:pointer; background:none;" onchange="document.getElementById('cmtkFormHexInput').value = this.value.toUpperCase();">
                                <input type="text" id="cmtkFormHexInput" placeholder="#E63946" required style="flex:1; border:2px solid #e9d5ff; border-radius:12px; padding:10px 14px; font-size:14px; font-weight:850; color:#0f172a; text-transform:uppercase;" oninput="document.getElementById('cmtkFormColorPicker').value = this.value;">
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
        document.getElementById('cmtkFormHexInput').value = hex || '#3B82F6';
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
                if (`${c.material_id}_${c.id}` === key) {
                    c.hex_code = hex;
                }
                return c;
            });

            showToast(`✅ Đã cập nhật mã màu ${hex} thành công!`);
            window._cmtkCloseEditColorModal();
            renderCurrentMainTab();
        } catch (err) {
            showToast('❌ Cập nhật mã màu thất bại: ' + err.message, 'error');
        }
    };

    // CSS Styles matching Quản Trị Nhân Sự & Hành Chính HV 100%
    function _cmtkGetStyles() {
        return `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Comfortaa:wght@500;600;700&display=swap');

                .cmtk-wrapper, .cmtk-wrapper button, .cmtk-wrapper input, .cmtk-wrapper select, .cmtk-wrapper textarea, .cmtk-wrapper div, .cmtk-wrapper span, .cmtk-wrapper h1, .cmtk-wrapper h2, .cmtk-wrapper h3, .cmtk-wrapper h4, .cmtk-wrapper p, .cmtk-wrapper a, .cmtk-wrapper option, .cmtk-wrapper strong,
                #cmtkMaketModal, #cmtkMaketModal button, #cmtkMaketModal input, #cmtkMaketModal select, #cmtkMaketModal textarea, #cmtkMaketModal div, #cmtkMaketModal span, #cmtkMaketModal h3,
                #cmtkDetailModal, #cmtkDetailModal button, #cmtkDetailModal input, #cmtkDetailModal select, #cmtkDetailModal textarea, #cmtkDetailModal div, #cmtkDetailModal span, #cmtkDetailModal h3,
                #cmtkEditColorModal, #cmtkEditColorModal button, #cmtkEditColorModal input, #cmtkEditColorModal select, #cmtkEditColorModal textarea, #cmtkEditColorModal div, #cmtkEditColorModal span, #cmtkEditColorModal h3 {
                    font-family: 'Nunito', 'Comfortaa', system-ui, -apple-system, sans-serif !important;
                }

                .cmtk-wrapper {
                    padding: 24px;
                    background: #f8fafc;
                    min-height: 100vh;
                }

                /* Executive Banner Header (Matched 100% with Quản Trị Nhân Sự) */
                .cmtk-header {
                    background: linear-gradient(135deg, #3b0764 0%, #5b21b6 50%, #6d28d9 100%);
                    border-radius: 24px;
                    padding: 28px 32px;
                    color: #ffffff;
                    margin-bottom: 24px;
                    box-shadow: 0 14px 35px rgba(91, 33, 182, 0.25);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 16px;
                }
                .cmtk-header-left {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }
                .cmtk-icon-bg {
                    font-size: 38px;
                    background: rgba(255, 255, 255, 0.15);
                    width: 68px;
                    height: 68px;
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1.5px solid rgba(255, 255, 255, 0.25);
                    flex-shrink: 0;
                }
                .cmtk-title {
                    font-size: 22px;
                    font-weight: 900;
                    margin: 0 0 6px 0;
                    letter-spacing: 0.5px;
                    color: #ffffff;
                }
                .cmtk-subtitle {
                    font-size: 13.5px;
                    margin: 0;
                    opacity: 0.9;
                    font-weight: 500;
                    color: #ffffff;
                }
                .cmtk-btn-header-action {
                    background: rgba(255, 255, 255, 0.2);
                    color: #ffffff;
                    border: 1.5px solid rgba(255, 255, 255, 0.35);
                    font-weight: 900;
                    font-size: 13.5px;
                    padding: 12px 22px;
                    border-radius: 18px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    backdrop-filter: blur(8px);
                    transition: all 0.2s ease;
                }
                .cmtk-btn-header-action:hover {
                    background: #ffffff;
                    color: #6d28d9;
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
                }

                /* Level 1 Main Tab Buttons Grid (Matched with Quản Trị Nhân Sự) */
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

                /* Dynamic Card Grid & Item Styling */
                .cmtk-card-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
                    gap: 22px;
                    margin-bottom: 24px;
                }
                .cmtk-card-item {
                    background: #ffffff;
                    border-radius: 20px;
                    border: 1.5px solid #e2e8f0;
                    box-shadow: 0 8px 25px rgba(15, 23, 42, 0.04);
                    position: relative;
                    overflow: hidden;
                    transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    flex-direction: column;
                }
                .cmtk-card-item:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 18px 40px rgba(109, 40, 217, 0.12);
                    border-color: #c084fc;
                }
                .card-accent-bar {
                    height: 5px;
                    width: 100%;
                }
                .card-accent-bar.theme-purple { background: linear-gradient(90deg, #6b21a8, #a855f7); }

                .card-inner {
                    padding: 20px 22px;
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                }
                .card-main-content {
                    flex: 1;
                    margin-bottom: 14px;
                }
                .card-title {
                    font-size: 17.5px;
                    font-weight: 950;
                    color: #0f172a;
                    margin: 6px 0 10px 0;
                    line-height: 1.35;
                    letter-spacing: -0.3px;
                }
                .card-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 3px;
                    font-size: 11px;
                    font-weight: 800;
                    padding: 4px 10px;
                    border-radius: 8px;
                }
                .card-badge.theme-purple { background: #faf5ff; color: #7e22ce; border: 1px solid #e9d5ff; }
                .card-badge.theme-blue { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }

                .card-btn-open {
                    flex: 1;
                    min-width: 0;
                    padding: 10px 12px;
                    font-size: 12.5px;
                    font-weight: 850;
                    border-radius: 12px;
                    text-decoration: none;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 5px;
                    color: #ffffff !important;
                    background: linear-gradient(135deg, #059669 0%, #10b981 100%) !important;
                    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
                    border: none !important;
                    transition: all 0.2s ease;
                    cursor: pointer;
                }
                .card-btn-open:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 18px rgba(16, 185, 129, 0.5);
                    background: linear-gradient(135deg, #047857 0%, #059669 100%) !important;
                }

                .cmtk-toast {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    background: #10b981;
                    color: #ffffff;
                    padding: 14px 24px;
                    border-radius: 14px;
                    font-weight: 800;
                    font-size: 14px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.18);
                    z-index: 999999;
                    opacity: 0;
                    transform: translateY(20px);
                    transition: all 0.3s ease;
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
