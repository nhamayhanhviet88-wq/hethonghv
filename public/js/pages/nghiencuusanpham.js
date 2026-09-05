// ========== NGHIÊN CỨU SẢN PHẨM — PREMIUM FULL SCREEN UI ==========

(function() {
    'use strict';

    // State Management
    let currentMainTab = localStorage.getItem('ncsp_main_tab') || 'muc1_rd';
    let currentSubTab = localStorage.getItem('ncsp_sub_tab_' + currentMainTab) || 'all';
    let currentCategory = localStorage.getItem('ncsp_cat_' + currentMainTab) || 'all';

    let globalSearchQuery = '';
    let editingSubtabId = null;
    let editingCatId = null;

    // Helper HTML Escape Function (Prevents JS crashes & ReferenceError)
    function _ncspEscapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    const escapeHTML = _ncspEscapeHTML;

    // Default Sub-tabs for each Main Tab
    const DEFAULT_SUBTABS = {
        'muc1_rd': [
            { id: 'all', title: 'Tất Cả Dự Án R&D', icon: '🔬', isCustom: false },
            { id: 'vai_soi', title: 'Nghiên Cứu Vải & Sợi', icon: '🧵', isCustom: false },
            { id: 'tem_pet', title: 'Mẫu In & Tem PET', icon: '🏷️', isCustom: false }
        ],
        'muc2_process': [
            { id: 'all', title: 'Tất Cả Tiêu Chuẩn', icon: '📦', isCustom: false },
            { id: 'ky_thuat_may', title: 'Quy Trình May HV', icon: '👔', isCustom: false },
            { id: 'dong_goi', title: 'Tiêu Chuẩn Đóng Gói', icon: '📦', isCustom: false }
        ],
        'muc3_testing': [
            { id: 'all', title: 'Tất Cả Thử Nghiệm', icon: '🧪', isCustom: false },
            { id: 'test_lab', title: 'Nhật Ký Lab Test', icon: '🧫', isCustom: false },
            { id: 'do_ben_giat', title: 'Test Co Rút & Bền Giặt', icon: '💧', isCustom: false }
        ]
    };

    // Default Categories (Lĩnh Vực) for each Main Tab
    const DEFAULT_CATEGORIES = {
        'muc1_rd': [
            { id: 'cat_vai', name: 'Vải & Nguyên Liệu' },
            { id: 'cat_tem', name: 'Tem In & PET' },
            { id: 'cat_phukien', name: 'Phụ Kiện May' }
        ],
        'muc2_process': [
            { id: 'cat_may', name: 'Tiêu Chuẩn May' },
            { id: 'cat_cat', name: 'Thông Số Cắt' },
            { id: 'cat_qc', name: 'Kiểm Hàng QC' }
        ],
        'muc3_testing': [
            { id: 'cat_corut', name: 'Lỗi Co Rút' },
            { id: 'cat_benmau', name: 'Lỗi Bền Màu' },
            { id: 'cat_epnhiet', name: 'Lỗi Ép Nhiệt' }
        ]
    };

    // Default Items for R&D (Mục 1)
    const DEFAULT_RD_ITEMS = [
        {
            id: 'ncsp_rd_1',
            title: 'NGHIÊN CỨU VẢI COTTON PREMIUM CO GIÃN 4 CHIỀU',
            subtitle: 'Báo cáo thử nghiệm chất liệu vải Cotton 100% kháng khuẩn, chống nhăn, độ bền màu cấp 5 & định lượng GSM 230g.',
            url: 'https://docs.google.com/spreadsheets/d/1uuSXaFSdxyk22wJ0t_JPjn8Fgp2XQx_KljRg0B_ATDI/edit',
            icon: '🧵',
            theme: 'green',
            subtabId: 'vai_soi',
            category: 'Vải & Nguyên Liệu',
            createdAt: new Date().toISOString(),
            createdBy: 'Giám Đốc',
            updatedAt: new Date().toISOString(),
            updatedBy: 'Giám Đốc'
        },
        {
            id: 'ncsp_rd_2',
            title: 'MẪU IN PET CHUYỂN NHIỆT SIÊU MỊN MỚI 2026',
            subtitle: 'Tài liệu thông số kỹ thuật màng PET ép chuyển nhiệt chống rạn nứt, chịu giặt máy > 100 lần.',
            url: 'https://docs.google.com/spreadsheets/d/1uuSXaFSdxyk22wJ0t_JPjn8Fgp2XQx_KljRg0B_ATDI/edit',
            icon: '🏷️',
            theme: 'blue',
            subtabId: 'tem_pet',
            category: 'Tem In & PET',
            createdAt: new Date().toISOString(),
            createdBy: 'Giám Đốc',
            updatedAt: new Date().toISOString(),
            updatedBy: 'Giám Đốc'
        }
    ];

    // Default Items for Quy Trình (Mục 2)
    const DEFAULT_PROCESS_ITEMS = [
        {
            id: 'ncsp_proc_1',
            title: 'TIÊU CHUẨN KỸ THUẬT MAY ÁO POLO & ÁO THUN HV',
            subtitle: 'Bảng quy định mật độ mũi chỉ (5 mũi/cm), đường may lé, bo cổ dệt viền & độ dung sai size ±0.5cm.',
            url: 'https://docs.google.com/spreadsheets/d/1uuSXaFSdxyk22wJ0t_JPjn8Fgp2XQx_KljRg0B_ATDI/edit',
            icon: '👔',
            theme: 'purple',
            subtabId: 'ky_thuat_may',
            category: 'Tiêu Chuẩn May',
            createdAt: new Date().toISOString(),
            createdBy: 'Giám Đốc',
            updatedAt: new Date().toISOString(),
            updatedBy: 'Giám Đốc'
        }
    ];

    // Default Items for Thử Nghiệm (Mục 3)
    const DEFAULT_TESTING_ITEMS = [
        {
            id: 'ncsp_test_1',
            title: 'NHẬT KÝ THỬ NGHIỆM ĐỘ CO RÚT & ĐỘ BỀN GIẶT',
            subtitle: 'Kết quả test 50 mẫu áo giặt sấy nhiệt độ cao, kiểm tra biến dạng sau 10 lần giặt liên tục.',
            url: 'https://docs.google.com/spreadsheets/d/1uuSXaFSdxyk22wJ0t_JPjn8Fgp2XQx_KljRg0B_ATDI/edit',
            icon: '🧪',
            theme: 'amber',
            subtabId: 'do_ben_giat',
            category: 'Lỗi Co Rút',
            createdAt: new Date().toISOString(),
            createdBy: 'Giám Đốc',
            updatedAt: new Date().toISOString(),
            updatedBy: 'Giám Đốc'
        }
    ];

    // === Subtabs Helpers ===
    function _ncspGetSubtabs(mainTab) {
        try {
            const raw = localStorage.getItem('ncsp_subtabs_' + mainTab);
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}
        return DEFAULT_SUBTABS[mainTab] || [ { id: 'all', title: 'Tất Cả Mục', icon: '📌', isCustom: false } ];
    }

    function _ncspSaveSubtabs(mainTab, subtabs) {
        localStorage.setItem('ncsp_subtabs_' + mainTab, JSON.stringify(subtabs));
        _ncspSyncSaveToServer();
    }

    // === Categories (Lĩnh Vực) Helpers ===
    function _ncspGetCategories(mainTab) {
        try {
            const raw = localStorage.getItem('ncsp_cats_' + mainTab);
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {}
        return DEFAULT_CATEGORIES[mainTab] || [];
    }

    function _ncspSaveCategories(mainTab, cats) {
        localStorage.setItem('ncsp_cats_' + mainTab, JSON.stringify(cats));
        _ncspSyncSaveToServer();
    }

    // === Items Helpers ===
    function _ncspGetItems(scope) {
        try {
            const raw = localStorage.getItem('ncsp_items_' + scope);
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {}
        if (scope === 'muc1_rd') return DEFAULT_RD_ITEMS;
        if (scope === 'muc2_process') return DEFAULT_PROCESS_ITEMS;
        if (scope === 'muc3_testing') return DEFAULT_TESTING_ITEMS;
        return [];
    }

    function _ncspSaveItems(scope, items) {
        localStorage.setItem('ncsp_items_' + scope, JSON.stringify(items));
        _ncspSyncSaveToServer();
    }

    // Backend Remote Sync
    async function _ncspSyncLoadFromServer() {
        try {
            const res = await fetch('/api/nghiencuusanpham/config');
            if (res.ok) {
                const data = await res.json();
                if (data && data.value) {
                    // Server CÓ dữ liệu → load về localStorage
                    const store = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
                    if (store && typeof store === 'object') {
                        Object.keys(store).forEach(key => {
                            if (key.startsWith('ncsp_')) {
                                localStorage.setItem(key, store[key]);
                            }
                        });
                        _ncspRenderCurrentMainTab();
                    }
                } else {
                    // Server CHƯA CÓ dữ liệu (null) → kiểm tra localStorage có dữ liệu không → push lên server lần đầu
                    let hasLocalData = false;
                    for (let i = 0; i < localStorage.length; i++) {
                        if (localStorage.key(i) && localStorage.key(i).startsWith('ncsp_')) {
                            hasLocalData = true;
                            break;
                        }
                    }
                    if (hasLocalData) {
                        console.log('[NCSP Sync] Server chưa có dữ liệu, tự động đẩy localStorage lên server lần đầu...');
                        _ncspSyncSaveToServer();
                    }
                }
            }
        } catch (e) {
            console.warn('Sync load ncsp_store error:', e);
        }
    }

    let _syncSaveTimer = null;
    function _ncspSyncSaveToServer() {
        if (_syncSaveTimer) clearTimeout(_syncSaveTimer);
        _syncSaveTimer = setTimeout(async () => {
            try {
                const store = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith('ncsp_')) {
                        store[k] = localStorage.getItem(k);
                    }
                }
                await fetch('/api/nghiencuusanpham/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ value: store })
                });
            } catch (e) {
                console.warn('Sync save ncsp_store error:', e);
            }
        }, 500);
    }

    // Main Render Entry Point
    window.renderNghiencuusanphamPage = function(container) {
        if (!container) return;
        _ncspSyncLoadFromServer();

        container.innerHTML = `
            <div class="ncsp-wrapper">
                <!-- Top Header Banner -->
                <div class="ncsp-header">
                    <div class="ncsp-header-left">
                        <div class="ncsp-icon-bg">🔬</div>
                        <div>
                            <h1 class="ncsp-title">NGHIÊN CỨU SẢN PHẨM</h1>
                            <p class="ncsp-subtitle">Hệ thống Quản lý Nghiên cứu R&D, Quy trình & Thử nghiệm Chất lượng Sản phẩm Doanh Nghiệp</p>
                        </div>
                    </div>
                    <div class="ncsp-header-right">
                        <span class="ncsp-badge-live">● Đang hoạt động</span>
                    </div>
                </div>

                <!-- Main Navigation Tabs (Level 1) -->
                <div class="ncsp-tabs-main">
                    <button class="ncsp-tab-btn ${currentMainTab === 'muc1_rd' ? 'active' : ''}" onclick="window._ncspSwitchMainTab('muc1_rd')">
                        <span class="tab-num">MỤC 1</span>
                        <span class="tab-label">🔬 Nghiên Cứu & Phát Triển (R&D)</span>
                    </button>
                    <button class="ncsp-tab-btn ${currentMainTab === 'muc2_process' ? 'active' : ''}" onclick="window._ncspSwitchMainTab('muc2_process')">
                        <span class="tab-num">MỤC 2</span>
                        <span class="tab-label">📦 Quy Trình & Tiêu Chuẩn Sản Phẩm</span>
                    </button>
                    <button class="ncsp-tab-btn ${currentMainTab === 'muc3_testing' ? 'active' : ''}" onclick="window._ncspSwitchMainTab('muc3_testing')">
                        <span class="tab-num">MỤC 3</span>
                        <span class="tab-label">🧪 Thử Nghiệm & Đánh Giá Chất Lượng</span>
                    </button>
                </div>

                <!-- Main Content Area -->
                <div class="ncsp-content-container" id="ncspContentContainer">
                    <!-- Dynamic view rendered here -->
                </div>
            </div>

            <!-- Modal Form Thêm / Sửa Link Tài Liệu -->
            <div class="ncsp-modal-overlay" id="ncspLinkModal" style="display:none;">
                <div class="ncsp-modal-card">
                    <div class="ncsp-modal-header">
                        <h3 id="ncspModalTitle">➕ TẠO ĐƯỜNG LINK TÀI LIỆU/R&D MỚI</h3>
                        <button class="ncsp-modal-close" onclick="window._ncspCloseLinkModal()">✕</button>
                    </div>

                    <div class="ncsp-modal-body">
                        <input type="hidden" id="ncspFormLinkId" value="">

                        <!-- 1. Danh Mục Quản Trị (* BẮT BUỘC) -->
                        <div class="ncsp-form-group">
                            <label class="ncsp-form-label" style="color:#1e40af; font-weight:900;">📁 Danh Mục Quản Trị (* BẮT BUỘC):</label>
                            <select id="ncspFormSubtabSelect" class="ncsp-select" style="border: 2px solid #2563eb; background: #eff6ff; font-weight: 800; color: #1e40af;">
                                <!-- Dynamic subtab options -->
                            </select>
                        </div>

                        <!-- 2. Lĩnh Vực Tài Liệu (* BẮT BUỘC - Chọn nhiều) -->
                        <div class="ncsp-form-group">
                            <label class="ncsp-form-label" style="color:#0369a1; font-weight:900; display:flex; justify-content:space-between; align-items:center;">
                                <span>📌 Lĩnh Vực Tài Liệu (* BẮT BUỘC - Chọn nhiều):</span>
                                <span style="font-size:12px; color:#64748b; font-weight:700;">(Bấm chọn 1 hoặc nhiều Lĩnh Vực)</span>
                            </label>
                            <div id="ncspFormCategoryCheckboxes" class="ncsp-cat-checkbox-container">
                                <!-- Dynamic Checkboxes populated on modal open -->
                            </div>
                        </div>

                        <!-- 3. Tên Tiêu Đề Tài Liệu / Dự Án R&D (*) -->
                        <div class="ncsp-form-group">
                            <label class="ncsp-form-label">Tên Tiêu Đề Tài Liệu / Dự Án R&D (*)</label>
                            <input type="text" id="ncspFormTitle" placeholder="Ví dụ: Nghiên cứu mẫu vải Cotton Premium 2026..." class="ncsp-input">
                        </div>

                        <!-- 4. Mô Tả Chi Tiết / Ghi Chú Thông Số (*) -->
                        <div class="ncsp-form-group">
                            <label class="ncsp-form-label">Mô Tả Chi Tiết / Ghi Chú Thông Số (*)</label>
                            <textarea id="ncspFormSubtitle" rows="3" placeholder="Ví dụ: Báo cáo kết quả thử nghiệm thông số độ bền màu, độ co rút..." class="ncsp-textarea"></textarea>
                        </div>

                        <!-- 5. Đường Link Liên Kết Google Sheet / Docs / File -->
                        <div class="ncsp-form-group">
                            <label class="ncsp-form-label">Đường Link Liên Kết Google Sheet / Docs / File:</label>
                            <input type="text" id="ncspFormUrl" placeholder="https://docs.google.com/spreadsheets/d/... (Có thể để trống nếu đã có Hình Ảnh)" class="ncsp-input">
                        </div>

                        <!-- 6. Khung Dán / Tải Hình Ảnh Minh Họa (2 Ô Song Song) -->
                        <div class="ncsp-form-group">
                            <label class="ncsp-form-label" style="color:#0f172a; font-weight:850; display:flex; justify-content:space-between; align-items:center;">
                                <span>🖼️ Hình Ảnh Minh Họa / Sơ Đồ:</span>
                                <span style="font-size:12px; color:#0284c7; font-weight:700;">(Đã điền Link thì KHÔNG bắt buộc Ảnh)</span>
                            </label>

                            <div id="ncspFormImageDropzone" class="ncsp-image-dropzone" tabindex="0">
                                <input type="file" id="ncspFormFileInput" accept="image/*" style="display:none;" onchange="window._ncspOnFileSelect(event)">
                                
                                <div id="ncspImagePlaceholder" class="ncsp-dropzone-placeholder-split">
                                    <!-- Ô 1: Dán ảnh bằng Ctrl + V -->
                                    <div id="ncspPasteZone" class="ncsp-upload-half-box paste-box" tabindex="0" title="Nhấn vào đây và ấn Ctrl + V để dán hình ảnh">
                                        <div class="half-box-icon">📋</div>
                                        <div class="half-box-title">Dán Ảnh Bằng <span class="kbd-badge">Ctrl + V</span></div>
                                        <div class="half-box-sub">Bấm vào đây rồi dán ảnh (hoặc Kéo thả file)</div>
                                    </div>

                                    <!-- Ô 2: Tải file từ máy tính -->
                                    <div id="ncspUploadZone" class="ncsp-upload-half-box upload-box" title="Bấm vào đây để chọn file ảnh từ máy tính" onclick="document.getElementById('ncspFormFileInput').click()">
                                        <div class="half-box-icon">📁</div>
                                        <div class="half-box-title">Tải File Ảnh Từ Máy Tính</div>
                                        <div class="half-box-sub">Bấm vào đây để chọn file (PNG, JPG, WEBP)</div>
                                    </div>
                                </div>

                                <div id="ncspImagePreviewWrap" class="ncsp-preview-wrap" style="display:none;">
                                    <img id="ncspImagePreview" src="" alt="Preview" class="ncsp-preview-img">
                                    <button type="button" class="ncsp-btn danger sm" onclick="window._ncspClearFormImage(event)">
                                        ❌ Xóa Ảnh Này
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="ncsp-form-row">
                            <div class="ncsp-form-group">
                                <label class="ncsp-form-label">Icon Đại Diện</label>
                                <select id="ncspFormIcon" class="ncsp-select">
                                    <option value="🔬">🔬 Kính Hiển Vi (R&D)</option>
                                    <option value="🧵">🧵 Vải & Sợi</option>
                                    <option value="🏷️">🏷️ Tem / In PET</option>
                                    <option value="👔">👔 Trang Phục HV</option>
                                    <option value="🧪">🧪 Thử Nghiệm Lab</option>
                                    <option value="📊">📊 Báo Cáo Sheets</option>
                                    <option value="📚">📚 Tài Liệu Quy Trình</option>
                                    <option value="💡">💡 Ý Tưởng Mới</option>
                                    <option value="⚡">⚡ Tiêu Chuẩn Nhanh</option>
                                </select>
                            </div>
                            <div class="ncsp-form-group">
                                <label class="ncsp-form-label">Màu Sắc Thẻ (Theme)</label>
                                <select id="ncspFormTheme" class="ncsp-select">
                                    <option value="green">🟢 Xanh Lá - Tươi Mới</option>
                                    <option value="blue">🔵 Xanh Dương - Chuyên Nghiệp</option>
                                    <option value="purple">🟣 Tím - Cao Cấp</option>
                                    <option value="amber">🟠 Cam/Vàng - Nổi Bật</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="ncsp-modal-footer">
                        <button class="ncsp-btn secondary" onclick="window._ncspCloseLinkModal()">Hủy Bỏ</button>
                        <button class="ncsp-btn primary" onclick="window._ncspSaveLinkModal()">💾 Lưu Thay Đổi</button>
                    </div>
                </div>
            </div>

            <!-- Modal Xem Chi Tiết Tài Liệu R&D (Chuẩn Thiết Kế Ảnh 3) -->
            <div class="ncsp-modal-overlay" id="ncspDetailModal" style="display:none;" onclick="window._ncspCloseDetailModal()">
                <div class="ncsp-modal-card" style="width:780px; max-width:95vw; border-radius:24px; overflow:hidden; border:1.5px solid #a855f7; box-shadow:0 25px 50px -12px rgba(124, 58, 237, 0.35);" onclick="event.stopPropagation()">
                    
                    <!-- Header Gradient Purple/Indigo -->
                    <div style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); padding:20px 24px; display:flex; align-items:center; justify-content:space-between;">
                        <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0; padding-right:12px;">
                            <div id="ncspDetailHeaderIcon" style="font-size:26px; background:rgba(255,255,255,0.2); width:46px; height:46px; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">🔬</div>
                            <h3 id="ncspDetailHeaderTitle" style="font-size:17.5px; font-weight:900; color:#ffffff; margin:0; line-height:1.35; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                HƯỚNG DẪN ỨNG XỬ CHO SALE KHI NÓI CHUYỆN VỚI KHÁCH
                            </h3>
                        </div>
                        <button class="ncsp-modal-close" onclick="window._ncspCloseDetailModal()" style="color:#ffffff; background:rgba(255,255,255,0.2); border-radius:50%; width:34px; height:34px; display:flex; align-items:center; justify-content:center; border:none; cursor:pointer; font-size:16px;">✕</button>
                    </div>

                    <!-- Body -->
                    <div style="padding:24px; background:#f8fafc; max-height:75vh; overflow-y:auto; display:flex; flex-direction:column; gap:20px;">
                        
                        <!-- Section 1: HÌNH ÁNH MINH HỌA -->
                        <div id="ncspDetailImageSec" style="display:none; background:#ffffff; padding:18px; border-radius:20px; border:1.5px solid #e9d5ff; box-shadow:0 4px 14px rgba(124, 58, 237, 0.06);">
                            <div style="font-size:13.5px; font-weight:900; color:#7e22ce; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
                                <span>🖼️</span> HÌNH ÁNH MINH HỌA:
                            </div>
                            <div style="text-align:center; background:#faf5ff; border-radius:16px; padding:12px; border:1px solid #f3e8ff;">
                                <img id="ncspDetailImage" src="" alt="Detail Image" style="max-width:100%; max-height:420px; border-radius:12px; box-shadow:0 6px 18px rgba(0,0,0,0.1); cursor:pointer;" onclick="window._ncspViewFullImageFromDetail()">
                            </div>
                        </div>

                        <!-- Section 2: MÔ TẢ & GHI CHÚ -->
                        <div style="background:#ffffff; padding:20px; border-radius:20px; border:1.5px solid #e9d5ff; box-shadow:0 4px 14px rgba(124, 58, 237, 0.06);">
                            <div style="font-size:13.5px; font-weight:900; color:#6b21a8; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
                                <span>📝</span> MÔ TẢ & GHI CHÚ:
                            </div>
                            <div id="ncspDetailDesc" style="font-size:14px; font-weight:600; color:#1e293b; line-height:1.7; white-space:pre-wrap; word-break:break-word;">
                                <!-- Formatted desc -->
                            </div>
                        </div>

                    </div>

                    <!-- Footer -->
                    <div style="padding:16px 24px; background:#ffffff; border-top:1.5px solid #f3e8ff; display:flex; justify-content:space-between; align-items:center;">
                        <button class="ncsp-btn secondary" onclick="window._ncspCloseDetailModal()" style="border-radius:12px; padding:10px 22px; font-weight:800; font-size:14px;">
                            Đóng Window
                        </button>
                        <a id="ncspDetailUrlBtn" href="#" target="_blank" rel="noopener" class="ncsp-btn primary" style="background:linear-gradient(135deg, #7c3aed, #6d28d9); border:none; border-radius:12px; padding:10px 24px; font-weight:900; font-size:14px; box-shadow:0 4px 14px rgba(124, 58, 237, 0.35); text-decoration:none; display:inline-flex; align-items:center; gap:8px;">
                            <span>🔗</span> Mở Bản Gốc Tài Liệu
                        </a>
                    </div>
                </div>
            </div>

            <!-- Modal Xem Hình Ảnh Phóng To (Image Lightbox) -->
            <div class="ncsp-modal-overlay" id="ncspImageViewerModal" style="display:none;" onclick="window._ncspCloseImageViewerModal()">
                <div class="ncsp-image-modal-content" onclick="event.stopPropagation()">
                    <button class="ncsp-modal-close" onclick="window._ncspCloseImageViewerModal()" style="position:absolute; top:16px; right:16px; z-index:10;">✕</button>
                    <img id="ncspFullImagePreview" src="" alt="Full Image" style="max-width:90vw; max-height:85vh; border-radius:16px; box-shadow:0 20px 50px rgba(0,0,0,0.5); border:3px solid #ffffff; object-fit:contain;">
                </div>
            </div>

            <!-- Modal Cài Đặt Mục (Subtabs Settings) -->
            <div class="ncsp-modal-overlay" id="ncspSubtabModal" style="display:none;">
                <div class="ncsp-modal-card">
                    <div class="ncsp-modal-header" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);">
                        <h3 id="ncspSubtabModalTitle">⚙️ CÀI ĐẶT MỤC (NGHIÊN CỨU SẢN PHẨM)</h3>
                        <button class="ncsp-modal-close" onclick="window._ncspCloseSubtabModal()">✕</button>
                    </div>

                    <div class="ncsp-modal-body">
                        <!-- Box Tạo Mục Mới -->
                        <div class="ncsp-box-create">
                            <label class="ncsp-box-label">➕ Tạo Mục Mới:</label>
                            <div class="ncsp-form-row" style="grid-template-columns: 140px 1fr;">
                                <select id="ncspSubtabFormIcon" class="ncsp-select">
                                    <option value="🔬">🔬 R&D</option>
                                    <option value="🧵">🧵 Vải Sợi</option>
                                    <option value="🏷️">🏷️ Tem In</option>
                                    <option value="👔">👔 May Mặc</option>
                                    <option value="📦">📦 Đóng Gói</option>
                                    <option value="🧪">🧪 Thử Nghiệm</option>
                                    <option value="🧫">🧫 Lab Test</option>
                                    <option value="💧">💧 Co Rút</option>
                                    <option value="📝">📝 Bài Test</option>
                                    <option value="📚">📚 Học Thuộc</option>
                                    <option value="📌">📌 Ghi Chú</option>
                                </select>
                                <input type="text" id="ncspSubtabFormTitle" placeholder="Nhập tên mục mới (ví dụ: Quy Trình Thử Vải...)" class="ncsp-input"
                                    onkeypress="if(event.key==='Enter') window._ncspAddSubtabFromModal()">
                            </div>
                            <button class="ncsp-btn primary" onclick="window._ncspAddSubtabFromModal()" style="margin-top:10px; width:100%; justify-content:center;">
                                ➕ Thêm Mục Mới
                            </button>
                        </div>

                        <!-- Danh Sách Mục Hiện Tại -->
                        <div>
                            <label class="ncsp-box-label">📌 Danh Sách Mục Hiện Tại:</label>
                            <div id="ncspSubtabListContainer" class="ncsp-list-container">
                                <!-- Dynamic Subtabs List -->
                            </div>
                        </div>
                    </div>

                    <div class="ncsp-modal-footer">
                        <button class="ncsp-btn secondary" onclick="window._ncspCloseSubtabModal()">Đóng Window</button>
                    </div>
                </div>
            </div>

            <!-- Modal Cài Đặt Lĩnh Vực (Categories Settings) -->
            <div class="ncsp-modal-overlay" id="ncspCategoryModal" style="display:none;">
                <div class="ncsp-modal-card">
                    <div class="ncsp-modal-header" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);">
                        <h3 id="ncspCatModalTitle">⚙️ CÀI ĐẶT LĨNH VỰC (NGHIÊN CỨU SẢN PHẨM)</h3>
                        <button class="ncsp-modal-close" onclick="window._ncspCloseCatModal()">✕</button>
                    </div>

                    <div class="ncsp-modal-body">
                        <!-- Box Tạo Lĩnh Vực Mới -->
                        <div class="ncsp-box-create">
                            <label class="ncsp-box-label">➕ Tạo Lĩnh Vực Mới:</label>
                            <div style="display:flex; gap:10px;">
                                <input type="text" id="ncspCatFormName" placeholder="Nhập tên lĩnh vực mới (ví dụ: Lỗi Size Áo, Co Rút...)" class="ncsp-input" style="flex:1;"
                                    onkeypress="if(event.key==='Enter') window._ncspAddCategoryFromModal()">
                                <button class="ncsp-btn primary" onclick="window._ncspAddCategoryFromModal()">
                                    ➕ Thêm Mới
                                </button>
                            </div>
                        </div>

                        <!-- Danh Sách Lĩnh Vực Hiện Tại -->
                        <div>
                            <label class="ncsp-box-label">📌 Danh Sách Lĩnh Vực Hiện Tại:</label>
                            <div id="ncspCatListContainer" class="ncsp-list-container">
                                <!-- Dynamic Categories List -->
                            </div>
                        </div>
                    </div>

                    <div class="ncsp-modal-footer">
                        <button class="ncsp-btn secondary" onclick="window._ncspCloseCatModal()">Đóng Window</button>
                    </div>
                </div>
            </div>

            ${_ncspGetStyles()}
        `;

        _ncspRenderCurrentMainTab();
    };

    // Switch Main Tabs
    window._ncspSwitchMainTab = function(tabId) {
        currentMainTab = tabId;
        localStorage.setItem('ncsp_main_tab', tabId);
        currentSubTab = localStorage.getItem('ncsp_sub_tab_' + tabId) || 'all';
        currentCategory = localStorage.getItem('ncsp_cat_' + tabId) || 'all';

        const buttons = document.querySelectorAll('.ncsp-tab-btn');
        buttons.forEach((btn, idx) => {
            if (
                (tabId === 'muc1_rd' && idx === 0) ||
                (tabId === 'muc2_process' && idx === 1) ||
                (tabId === 'muc3_testing' && idx === 2)
            ) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        _ncspRenderCurrentMainTab();
    };

    // Render Tab Content
    function _ncspRenderCurrentMainTab() {
        const container = document.getElementById('ncspContentContainer');
        if (!container) return;

        let tabTitle = '🔬 MỤC 1: NGHIÊN CỨU & PHÁT TRIỂN (R&D)';
        if (currentMainTab === 'muc2_process') tabTitle = '📦 MỤC 2: QUY TRÌNH & TIÊU CHUẨN SẢN PHẨM';
        if (currentMainTab === 'muc3_testing') tabTitle = '🧪 MỤC 3: THỬ NGHIỆM & ĐÁNH GIÁ CHẤT LƯỢNG';

        const subtabs = _ncspGetSubtabs(currentMainTab);
        const categories = _ncspGetCategories(currentMainTab);
        const items = _ncspGetItems(currentMainTab);

        let html = `
            <!-- Sub-tabs Bar (Level 2) -->
            <div class="ncsp-subtabs-bar">
                <div class="ncsp-subtabs-list">
                    ${subtabs.map(sub => `
                        <button class="ncsp-subtab-chip ${currentSubTab === sub.id ? 'active' : ''}" onclick="window._ncspSelectSubtab('${sub.id}')">
                            <span>${sub.icon || '📌'}</span> ${escapeHTML(sub.title)}
                        </button>
                    `).join('')}
                </div>
                <div class="ncsp-subtabs-actions">
                    <button class="ncsp-btn primary sm" onclick="window._ncspOpenLinkModal()">
                        <span>➕</span> Tạo Đường Link Mới
                    </button>
                    <button class="ncsp-btn secondary sm" onclick="window._ncspOpenManageSubtabModal()">
                        <span>⚙️</span> Cài Đặt Mục
                    </button>
                </div>
            </div>

            <!-- Categories / Lĩnh Vực Filter Bar -->
            <div class="ncsp-categories-bar">
                <div class="ncsp-categories-left">
                    <span class="ncsp-label-prefix">📌 Lĩnh Vực:</span>
                    <button class="ncsp-cat-chip ${currentCategory === 'all' ? 'active' : ''}" onclick="window._ncspSelectCategory('all')">
                        🌐 Tất Cả Lĩnh Vực (${items.length})
                    </button>
                    ${categories.map(cat => {
                        const count = items.filter(i => i.category === cat.name).length;
                        return `
                            <button class="ncsp-cat-chip ${currentCategory === cat.name ? 'active' : ''}" onclick="window._ncspSelectCategory('${escapeHTML(cat.name)}')">
                                📌 ${escapeHTML(cat.name)} (${count})
                            </button>
                        `;
                    }).join('')}
                </div>
                <div class="ncsp-categories-right">
                    <button class="ncsp-btn secondary sm" onclick="window._ncspOpenManageCatModal()">
                        <span>⚙️</span> Cài Đặt Lĩnh Vực
                    </button>
                </div>
            </div>

            <!-- Search Bar (Permanent Input - Focus Preserved 100%) -->
            <div class="ncsp-controls-card">
                <div class="ncsp-search-box">
                    <span class="search-icon">🔍</span>
                    <input type="text" id="ncspSearchInput" placeholder="Nhập từ khóa, tên tài liệu, dự án R&D, nguyên liệu hoặc quy trình cần tìm kiếm trong cả 3 MỤC..." 
                        value="${escapeHTML(globalSearchQuery)}"
                        class="ncsp-search-input">
                    <span id="ncspClearSearchBtn" class="clear-icon" onclick="window._ncspClearSearch()" style="display: ${globalSearchQuery ? 'inline-block' : 'none'};">✕</span>
                </div>
            </div>

            <!-- Title Header -->
            <div class="ncsp-section-title-wrap">
                <h2 class="ncsp-section-title" id="ncspSectionTitle">${tabTitle}</h2>
                <span class="ncsp-count-badge" id="ncspCountBadge">Tổng số: ${items.length} tài liệu</span>
            </div>

            <!-- Items Grid Section (Target for dynamic partial rendering) -->
            <div id="ncspGridSection"></div>
        `;

        container.innerHTML = html;
        
        // Bind Vietnamese IME Composition events (Telex/VNI) for smooth typing (Tên Tiêu Đề)
        const searchInput = document.getElementById('ncspSearchInput');
        if (searchInput) {
            let isComposing = false;
            searchInput.addEventListener('compositionstart', () => { isComposing = true; });
            searchInput.addEventListener('compositionend', (e) => {
                isComposing = false;
                window._ncspOnSearchInput(e.target.value);
            });
            searchInput.addEventListener('input', (e) => {
                if (!isComposing) {
                    window._ncspOnSearchInput(e.target.value);
                }
            });
        }

        _ncspUpdateGridOnly();
    }

    // Search Handlers - Focus preserved 100% & Try-Catch Protected
    window._ncspOnSearchInput = function(val) {
        try {
            globalSearchQuery = val;
            
            const clearBtn = document.getElementById('ncspClearSearchBtn');
            if (clearBtn) {
                clearBtn.style.display = val ? 'inline-block' : 'none';
            }

            _ncspUpdateGridOnly();
        } catch (err) {
            console.error('[NCSP] Search input error:', err);
        }
    };

    window._ncspClearSearch = function() {
        try {
            globalSearchQuery = '';
            const searchInput = document.getElementById('ncspSearchInput');
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            const clearBtn = document.getElementById('ncspClearSearchBtn');
            if (clearBtn) {
                clearBtn.style.display = 'none';
            }

            _ncspUpdateGridOnly();
        } catch (err) {
            console.error('[NCSP] Clear search error:', err);
        }
    };

    // Update Grid and Section Title dynamically without touching the search input (Zero focus loss)
    function _ncspUpdateGridOnly() {
        const gridSection = document.getElementById('ncspGridSection');
        const titleEl = document.getElementById('ncspSectionTitle');
        const countBadgeEl = document.getElementById('ncspCountBadge');

        if (!gridSection) return;

        const q = (globalSearchQuery || '').trim().toLowerCase();

        // IF SEARCH QUERY IS NOT EMPTY -> SEARCH ACROSS ALL 3 MAIN TABS (Mục 1, Mục 2, Mục 3)
        if (q !== '') {
            const mainTabs = [
                { id: 'muc1_rd', title: 'MỤC 1: NGHIÊN CỨU & PHÁT TRIỂN (R&D)', icon: '🔬' },
                { id: 'muc2_process', title: 'MỤC 2: QUY TRÌNH & TIÊU CHUẨN SẢN PHẨM', icon: '📦' },
                { id: 'muc3_testing', title: 'MỤC 3: THỬ NGHIỆM & ĐÁNH GIÁ CHẤT LƯỢNG', icon: '🧪' }
            ];

            let allSearchResults = [];
            let totalMatchCount = 0;

            mainTabs.forEach(mt => {
                const items = _ncspGetItems(mt.id);
                const matches = items.filter(item => {
                    const titleMatch = (item.title || '').toLowerCase().includes(q);
                    const descMatch = (item.subtitle || '').toLowerCase().includes(q);
                    const catMatch = (item.category || '').toLowerCase().includes(q);
                    const catsMatch = (item.categories || []).some(c => c.toLowerCase().includes(q));
                    return titleMatch || descMatch || catMatch || catsMatch;
                });

                if (matches.length > 0) {
                    totalMatchCount += matches.length;
                    allSearchResults.push({
                        tab: mt,
                        items: matches
                    });
                }
            });

            if (titleEl) titleEl.innerText = `🔍 TÌM KIẾM TOÀN BỘ (3 MỤC): "${globalSearchQuery}"`;
            if (countBadgeEl) countBadgeEl.innerText = `Tìm thấy ${totalMatchCount} kết quả`;

            if (totalMatchCount === 0) {
                gridSection.innerHTML = `
                    <div class="ncsp-empty-state">
                        <div class="empty-icon">🔍</div>
                        <h3>Không tìm thấy tài liệu nào khớp với từ khóa "${escapeHTML(globalSearchQuery)}"</h3>
                        <p>Từ khóa này không xuất hiện ở bất kỳ tài liệu nào trong cả 3 mục (Mục 1, Mục 2, Mục 3).</p>
                    </div>
                `;
            } else {
                let html = '';
                allSearchResults.forEach(group => {
                    html += `
                        <div style="margin-bottom:32px;">
                            <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px; font-size:14.5px; font-weight:900; color:#1e40af; background:#eff6ff; padding:10px 18px; border-radius:14px; border:1.5px solid #bfdbfe; width:fit-content; box-shadow:0 4px 12px rgba(30, 64, 175, 0.1);">
                                <span style="font-size:16px;">${group.tab.icon}</span>
                                <span>${group.tab.title} (${group.items.length} tài liệu)</span>
                            </div>
                            <div class="ncsp-grid">
                                ${group.items.map(item => _ncspRenderItemCard(item)).join('')}
                            </div>
                        </div>
                    `;
                });
                gridSection.innerHTML = html;
            }
            return;
        }

        // IF SEARCH IS EMPTY -> SHOW NORMAL CURRENT MAIN TAB
        let tabTitle = '🔬 MỤC 1: NGHIÊN CỨU & PHÁT TRIỂN (R&D)';
        if (currentMainTab === 'muc2_process') tabTitle = '📦 MỤC 2: QUY TRÌNH & TIÊU CHUẨN SẢN PHẨM';
        if (currentMainTab === 'muc3_testing') tabTitle = '🧪 MỤC 3: THỬ NGHIỆM & ĐÁNH GIÁ CHẤT LƯỢNG';

        if (titleEl) titleEl.innerText = tabTitle;

        const items = _ncspGetItems(currentMainTab);
        const filtered = items.filter(item => {
            const matchesSubtab = currentSubTab === 'all' || item.subtabId === currentSubTab;
            const matchesCategory = currentCategory === 'all' || item.category === currentCategory;
            return matchesSubtab && matchesCategory;
        });

        if (countBadgeEl) countBadgeEl.innerText = `Tổng số: ${filtered.length} tài liệu`;

        const pinnedLinks = filtered.filter(i => i.isImportant);
        const normalLinks = filtered.filter(i => !i.isImportant);

        if (filtered.length === 0) {
            gridSection.innerHTML = `
                <div class="ncsp-empty-state">
                    <div class="empty-icon">🔬</div>
                    <h3>Chưa có tài liệu nào phù hợp với bộ lọc hiện tại</h3>
                    <p>Hãy bấm nút <strong>"+ Tạo Đường Link Mới"</strong> ở phía trên để thêm tài liệu.</p>
                </div>
            `;
        } else {
            let html = '';
            if (pinnedLinks.length > 0) {
                html += `
                    <div style="margin-bottom:28px;">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px; font-size:14px; font-weight:900; color:#b45309; background:linear-gradient(135deg, #fffbe6 0%, #fef3c7 100%); padding:9px 18px; border-radius:14px; border:1.5px solid #fde68a; width:fit-content; box-shadow:0 4px 12px rgba(217, 119, 6, 0.12);">
                            <span style="font-size:16px;">📌⭐</span>
                            <span>MỤC QUAN TRỌNG (${pinnedLinks.length})</span>
                        </div>
                        <div class="ncsp-grid">
                            ${pinnedLinks.map(item => _ncspRenderItemCard(item)).join('')}
                        </div>
                    </div>
                `;
            }

            if (normalLinks.length > 0) {
                if (pinnedLinks.length > 0) {
                    html += `
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px; font-size:13.5px; font-weight:850; color:#64748b; padding-top:4px;">
                            <span>📁</span>
                            <span>DANH SÁCH TÀI LIỆU BÌNH THƯỜNG (${normalLinks.length})</span>
                        </div>
                    `;
                }
                html += `
                    <div class="ncsp-grid">
                        ${normalLinks.map(item => _ncspRenderItemCard(item)).join('')}
                    </div>
                `;
            }
            gridSection.innerHTML = html;
        }
    }

    function _ncspRenderItemCard(item) {
        const themeClass = item.theme || 'blue';
        const hasUrl = Boolean(item.url && item.url.trim());
        const hasImage = Boolean(item.image && item.image.trim());
        const isStarred = Boolean(item.isImportant);

        const categoriesList = item.categories || (item.category ? item.category.split(', ') : []);

        const formattedDate = item.updatedAt 
            ? new Date(item.updatedAt).toLocaleString('vi-VN', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit', year:'numeric' }) 
            : '';

        return `
            <div class="ncsp-card theme-${themeClass}" style="${isStarred ? 'border:2px solid #f59e0b; box-shadow:0 8px 25px rgba(245, 158, 11, 0.18);' : ''} padding:0; overflow:hidden;">
                
                ${hasImage ? `
                    <!-- Top Cover Image Banner (Matching Image 2 & Image 3 Click Scope) -->
                    <div class="ncsp-card-cover-wrap" onclick="window._ncspOpenDetailModal('${item.id}')" title="Bấm vào để xem chi tiết tài liệu R&D">
                        <img src="${item.image}" alt="${escapeHTML(item.title)}" class="ncsp-card-cover-img" onclick="window._ncspOpenDetailModal('${item.id}')">
                        <div class="ncsp-card-cover-overlay" onclick="window._ncspOpenDetailModal('${item.id}')">
                            <span class="ncsp-cover-badge" onclick="window._ncspOpenDetailModal('${item.id}')">📋 Xem Chi Tiết</span>
                        </div>
                    </div>
                ` : ''}

                <div style="padding:16px 20px 20px 20px; display:flex; flex-direction:column; gap:12px;">
                    <!-- Card Header: Icon, Tags, Action Buttons -->
                    <div class="ncsp-card-header" style="align-items:flex-start; margin-bottom:0;">
                        <div class="ncsp-card-icon" style="flex-shrink:0;">${item.icon || '🔬'}</div>
                        
                        <div style="display:flex; flex-direction:column; gap:6px; flex:1; min-width:0;">
                            <!-- Category Tags & Important Badge -->
                            <div style="display:flex; flex-wrap:wrap; gap:6px; align-items:center;">
                                ${isStarred ? `<span style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; font-weight:900; padding:3px 10px; border-radius:12px; font-size:11.5px; display:inline-flex; align-items:center; gap:4px;">📌 ⭐ Quan Trọng</span>` : ''}
                                ${categoriesList.map(c => `<span class="ncsp-card-tag">📌 ${escapeHTML(c)}</span>`).join('')}
                            </div>
                        </div>

                        <!-- Top Action Icons: Star, Edit, Delete -->
                        <div style="display:flex; gap:6px; flex-shrink:0; align-items:center;">
                            <button type="button" class="ncsp-icon-btn" onclick="window._ncspToggleImportant('${item.id}')" title="${isStarred ? 'Bỏ đánh dấu quan trọng' : 'Đánh dấu mục quan trọng'}" style="${isStarred ? 'background:#fef3c7; border:1.5px solid #fde68a; color:#d97706;' : 'background:#f8fafc; border:1.5px solid #e2e8f0; color:#94a3b8;'} width:32px; height:32px; border-radius:10px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:15px; transition:all 0.2s;">
                                ⭐
                            </button>
                            <button type="button" class="ncsp-icon-btn" onclick="window._ncspEditItem('${item.id}')" title="Chỉnh Sửa" style="background:#f8fafc; border:1.5px solid #e2e8f0; color:#475569; width:32px; height:32px; border-radius:10px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px;">
                                ✏️
                            </button>
                            <button type="button" class="ncsp-icon-btn danger" onclick="window._ncspDeleteItem('${item.id}')" title="Xóa" style="background:#fef2f2; border:1.5px solid #fecaca; color:#dc2626; width:32px; height:32px; border-radius:10px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px;">
                                🗑️
                            </button>
                        </div>
                    </div>

                    <!-- Title & Description -->
                    <div class="ncsp-card-body" style="padding:0;">
                        <h3 class="ncsp-card-title" style="font-size:16.5px; font-weight:900; color:#0f172a; margin-bottom:6px; line-height:1.4;">
                            ${escapeHTML(item.title)}
                        </h3>
                        <p class="ncsp-card-desc" style="font-size:13.5px; color:#475569; line-height:1.55; margin:0;">
                            ${escapeHTML(item.subtitle)}
                        </p>
                    </div>

                    <!-- Footer Action Buttons & Meta Info -->
                    <div class="ncsp-card-footer" style="flex-direction:column; align-items:stretch; gap:10px; border-top:1px solid #f1f5f9; padding-top:12px; margin-top:4px;">
                        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; width:100%;">
                            <button type="button" onclick="window._ncspOpenDetailModal('${item.id}')" style="flex:1; background:linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color:#ffffff; font-weight:850; border:none; border-radius:12px; padding:10px 16px; box-shadow:0 4px 12px rgba(124, 58, 237, 0.3); font-size:13.5px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:6px; transition:all 0.2s;">
                                <span>📋</span> Xem Chi Tiết ➔
                            </button>
                            
                            ${hasUrl ? `
                                <a href="${item.url}" target="_blank" rel="noopener" style="flex:1; background:linear-gradient(135deg, #059669 0%, #10b981 100%); color:#ffffff; font-weight:850; border:none; border-radius:12px; padding:10px 16px; box-shadow:0 4px 12px rgba(16, 185, 129, 0.3); font-size:13.5px; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; gap:6px; transition:all 0.2s;">
                                    <span>🔗</span> Mở Tài Liệu ↗
                                </a>
                            ` : ''}
                        </div>

                        <div style="font-size:12px; color:#64748b; font-weight:700; background:#f8fafc; padding:6px 12px; border-radius:10px; border:1px solid #e2e8f0; display:flex; align-items:center; gap:6px;">
                            <span>🕒</span>
                            <span>Cập nhật: <strong style="color:#0f172a;">${escapeHTML(item.updatedBy || 'Giám Đốc')}</strong> ${formattedDate ? '• ' + formattedDate : ''}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // === Subtab Handlers ===
    window._ncspSelectSubtab = function(subId) {
        currentSubTab = subId;
        localStorage.setItem('ncsp_sub_tab_' + currentMainTab, subId);
        _ncspRenderCurrentMainTab();
    };

    window._ncspSelectCategory = function(catName) {
        currentCategory = catName;
        localStorage.setItem('ncsp_cat_' + currentMainTab, catName);
        _ncspRenderCurrentMainTab();
    };

    // [REMOVED] Duplicate _ncspOnSearchInput that called _ncspRenderCurrentMainTab() destroying input focus.
    // The correct version at line ~657 calls _ncspUpdateGridOnly() preserving input focus 100%.

    // === Subtabs Settings Modal ===
    window._ncspOpenManageSubtabModal = function() {
        editingSubtabId = null;
        const modal = document.getElementById('ncspSubtabModal');
        if (!modal) return;

        const titleInput = document.getElementById('ncspSubtabFormTitle');
        if (titleInput) titleInput.value = '';

        let tabName = 'MỤC 1: NGHIÊN CỨU & PHÁT TRIỂN R&D';
        if (currentMainTab === 'muc2_process') tabName = 'MỤC 2: QUY TRÌNH & TIÊU CHUẨN';
        if (currentMainTab === 'muc3_testing') tabName = 'MỤC 3: THỬ NGHIỆM CHẤT LƯỢNG';

        document.getElementById('ncspSubtabModalTitle').innerText = `⚙️ CÀI ĐẶT MỤC (${tabName})`;
        _ncspRenderSubtabListInModal();
        modal.style.display = 'flex';
    };

    window._ncspCloseSubtabModal = function() {
        const modal = document.getElementById('ncspSubtabModal');
        if (modal) modal.style.display = 'none';
    };

    window._ncspAddSubtabFromModal = function() {
        const titleInput = document.getElementById('ncspSubtabFormTitle');
        const iconSelect = document.getElementById('ncspSubtabFormIcon');
        if (!titleInput || !iconSelect) return;

        const title = titleInput.value.trim();
        const icon = iconSelect.value;

        if (!title) {
            alert('Vui lòng nhập tên mục mới!');
            return;
        }

        const subtabs = _ncspGetSubtabs(currentMainTab);
        const newId = 'custom_sub_' + Date.now();
        subtabs.push({ id: newId, title, icon: icon || '📌', isCustom: true });

        _ncspSaveSubtabs(currentMainTab, subtabs);
        titleInput.value = '';
        _ncspRenderSubtabListInModal();
        _ncspRenderCurrentMainTab();
    };

    window._ncspStartSubtabEdit = function(subId) {
        editingSubtabId = subId;
        _ncspRenderSubtabListInModal();
    };

    window._ncspSaveSubtabEdit = function(subId) {
        const titleInput = document.getElementById('ncspEditSubtabTitle_' + subId);
        const iconSelect = document.getElementById('ncspEditSubtabIcon_' + subId);
        if (!titleInput || !iconSelect) return;

        const newTitle = titleInput.value.trim();
        const newIcon = iconSelect.value;

        if (!newTitle) {
            alert('Tên mục không được để trống!');
            return;
        }

        const subtabs = _ncspGetSubtabs(currentMainTab);
        const item = subtabs.find(s => s.id === subId);
        if (item) {
            item.title = newTitle;
            item.icon = newIcon;
            _ncspSaveSubtabs(currentMainTab, subtabs);
        }

        editingSubtabId = null;
        _ncspRenderSubtabListInModal();
        _ncspRenderCurrentMainTab();
    };

    window._ncspCancelSubtabEdit = function() {
        editingSubtabId = null;
        _ncspRenderSubtabListInModal();
    };

    window._ncspDeleteSubtabFromModal = function(subId) {
        let subtabs = _ncspGetSubtabs(currentMainTab);
        const item = subtabs.find(s => s.id === subId);
        if (!item) return;

        if (!confirm(`Bạn có chắc muốn xóa mục "${item.title}" không?`)) return;

        subtabs = subtabs.filter(s => s.id !== subId);
        _ncspSaveSubtabs(currentMainTab, subtabs);

        if (currentSubTab === subId) {
            currentSubTab = subtabs[0] ? subtabs[0].id : 'all';
            localStorage.setItem('ncsp_sub_tab_' + currentMainTab, currentSubTab);
        }

        _ncspRenderSubtabListInModal();
        _ncspRenderCurrentMainTab();
    };

    window._ncspMoveSubtabUp = function(subId) {
        const subtabs = _ncspGetSubtabs(currentMainTab);
        const idx = subtabs.findIndex(s => s.id === subId);
        if (idx <= 0) return;

        const temp = subtabs[idx];
        subtabs[idx] = subtabs[idx - 1];
        subtabs[idx - 1] = temp;

        _ncspSaveSubtabs(currentMainTab, subtabs);
        _ncspRenderSubtabListInModal();
        _ncspRenderCurrentMainTab();
    };

    window._ncspMoveSubtabDown = function(subId) {
        const subtabs = _ncspGetSubtabs(currentMainTab);
        const idx = subtabs.findIndex(s => s.id === subId);
        if (idx < 0 || idx >= subtabs.length - 1) return;

        const temp = subtabs[idx];
        subtabs[idx] = subtabs[idx + 1];
        subtabs[idx + 1] = temp;

        _ncspSaveSubtabs(currentMainTab, subtabs);
        _ncspRenderSubtabListInModal();
        _ncspRenderCurrentMainTab();
    };

    function _ncspRenderSubtabListInModal() {
        const container = document.getElementById('ncspSubtabListContainer');
        if (!container) return;

        const subtabs = _ncspGetSubtabs(currentMainTab);
        if (subtabs.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:16px; color:#64748b; font-weight:700;">Chưa có mục nào</div>`;
            return;
        }

        container.innerHTML = subtabs.map((item, idx) => {
            const isEditing = editingSubtabId === item.id;
            if (isEditing) {
                return `
                    <div class="ncsp-manage-item editing">
                        <div class="ncsp-form-row" style="grid-template-columns: 110px 1fr;">
                            <select id="ncspEditSubtabIcon_${item.id}" class="ncsp-select">
                                <option value="🔬" ${item.icon==='🔬'?'selected':''}>🔬 R&D</option>
                                <option value="🧵" ${item.icon==='🧵'?'selected':''}>🧵 Vải Sợi</option>
                                <option value="🏷️" ${item.icon==='🏷️'?'selected':''}>🏷️ Tem In</option>
                                <option value="👔" ${item.icon==='👔'?'selected':''}>👔 May Mặc</option>
                                <option value="📦" ${item.icon==='📦'?'selected':''}>📦 Đóng Gói</option>
                                <option value="🧪" ${item.icon==='🧪'?'selected':''}>🧪 Thử Nghiệm</option>
                                <option value="📌" ${item.icon==='📌'?'selected':''}>📌 Ghi Chú</option>
                            </select>
                            <input type="text" id="ncspEditSubtabTitle_${item.id}" value="${escapeHTML(item.title)}" class="ncsp-input">
                        </div>
                        <div style="display:flex; gap:8px; justify-content:flex-end;">
                            <button class="ncsp-btn secondary sm" onclick="window._ncspCancelSubtabEdit()">Hủy</button>
                            <button class="ncsp-btn primary sm" onclick="window._ncspSaveSubtabEdit('${item.id}')">💾 Lưu</button>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="ncsp-manage-item">
                    <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0; margin-right:12px;">
                        <span class="ncsp-item-num" style="flex-shrink:0;">${idx + 1}</span>
                        <span class="ncsp-item-icon" style="flex-shrink:0;">${item.icon || '📌'}</span>
                        <span class="ncsp-item-title" style="white-space: nowrap; font-size: 14.5px;">${escapeHTML(item.title)}</span>
                    </div>
                    <div class="ncsp-item-actions">
                        <button class="ncsp-btn secondary sm" onclick="window._ncspMoveSubtabUp('${item.id}')" ${idx===0?'disabled':''}>⬆️ Lên</button>
                        <button class="ncsp-btn secondary sm" onclick="window._ncspMoveSubtabDown('${item.id}')" ${idx===subtabs.length-1?'disabled':''}>⬇️ Xuống</button>
                        <button class="ncsp-btn secondary sm" onclick="window._ncspStartSubtabEdit('${item.id}')">✏️ Sửa</button>
                        <button class="ncsp-btn secondary sm danger" onclick="window._ncspDeleteSubtabFromModal('${item.id}')">🗑️ Xóa</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // === Categories (Lĩnh Vực) Settings Modal ===
    window._ncspOpenManageCatModal = function() {
        editingCatId = null;
        const modal = document.getElementById('ncspCategoryModal');
        if (!modal) return;

        const nameInput = document.getElementById('ncspCatFormName');
        if (nameInput) nameInput.value = '';

        let tabName = 'MỤC 1: NGHIÊN CỨU R&D';
        if (currentMainTab === 'muc2_process') tabName = 'MỤC 2: QUY TRÌNH SẢN PHẨM';
        if (currentMainTab === 'muc3_testing') tabName = 'MỤC 3: THỬ NGHIỆM CHẤT LƯỢNG';

        document.getElementById('ncspCatModalTitle').innerText = `⚙️ CÀI ĐẶT LĨNH VỰC (${tabName})`;
        _ncspRenderCatListInModal();
        modal.style.display = 'flex';
    };

    window._ncspCloseCatModal = function() {
        const modal = document.getElementById('ncspCategoryModal');
        if (modal) modal.style.display = 'none';
    };

    window._ncspAddCategoryFromModal = function() {
        const nameInput = document.getElementById('ncspCatFormName');
        if (!nameInput) return;

        const name = nameInput.value.trim();
        if (!name) {
            alert('Vui lòng nhập tên lĩnh vực mới!');
            return;
        }

        const cats = _ncspGetCategories(currentMainTab);
        const newId = 'cat_' + Date.now();
        cats.push({ id: newId, name });

        _ncspSaveCategories(currentMainTab, cats);
        nameInput.value = '';
        _ncspRenderCatListInModal();
        _ncspRenderCurrentMainTab();
    };

    window._ncspStartCatEdit = function(catId) {
        editingCatId = catId;
        _ncspRenderCatListInModal();
    };

    window._ncspSaveCatEdit = function(catId) {
        const input = document.getElementById('ncspEditCatName_' + catId);
        if (!input) return;

        const newName = input.value.trim();
        if (!newName) {
            alert('Tên lĩnh vực không được để trống!');
            return;
        }

        const cats = _ncspGetCategories(currentMainTab);
        const item = cats.find(c => c.id === catId);
        if (item) {
            item.name = newName;
            _ncspSaveCategories(currentMainTab, cats);
        }

        editingCatId = null;
        _ncspRenderCatListInModal();
        _ncspRenderCurrentMainTab();
    };

    window._ncspCancelCatEdit = function() {
        editingCatId = null;
        _ncspRenderCatListInModal();
    };

    window._ncspDeleteCatFromModal = function(catId) {
        let cats = _ncspGetCategories(currentMainTab);
        const item = cats.find(c => c.id === catId);
        if (!item) return;

        if (!confirm(`Bạn có chắc muốn xóa lĩnh vực "${item.name}" không?`)) return;

        cats = cats.filter(c => c.id !== catId);
        _ncspSaveCategories(currentMainTab, cats);

        if (currentCategory === item.name) {
            currentCategory = 'all';
            localStorage.setItem('ncsp_cat_' + currentMainTab, 'all');
        }

        _ncspRenderCatListInModal();
        _ncspRenderCurrentMainTab();
    };

    function _ncspRenderCatListInModal() {
        const container = document.getElementById('ncspCatListContainer');
        if (!container) return;

        const cats = _ncspGetCategories(currentMainTab);
        if (cats.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:16px; color:#64748b; font-weight:700;">Chưa có lĩnh vực nào</div>`;
            return;
        }

        container.innerHTML = cats.map(item => {
            const isEditing = editingCatId === item.id;
            if (isEditing) {
                return `
                    <div class="ncsp-manage-item editing">
                        <input type="text" id="ncspEditCatName_${item.id}" value="${escapeHTML(item.name)}" class="ncsp-input" style="flex:1;">
                        <div style="display:flex; gap:8px;">
                            <button class="ncsp-btn secondary sm" onclick="window._ncspCancelCatEdit()">Hủy</button>
                            <button class="ncsp-btn primary sm" onclick="window._ncspSaveCatEdit('${item.id}')">💾 Lưu</button>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="ncsp-manage-item">
                    <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0; margin-right:12px;">
                        <span class="ncsp-item-icon" style="flex-shrink:0;">📌</span>
                        <span class="ncsp-item-title">${escapeHTML(item.name)}</span>
                    </div>
                    <div class="ncsp-item-actions">
                        <button class="ncsp-btn secondary sm" onclick="window._ncspStartCatEdit('${item.id}')">✏️ Sửa Tên</button>
                        <button class="ncsp-btn secondary sm danger" onclick="window._ncspDeleteCatFromModal('${item.id}')">🗑️ Xóa</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // === Image Dropzone & Paste Handlers ===
    window._ncspCurrentFormImageData = '';

    window._ncspOnFileSelect = function(e) {
        if (e.target.files && e.target.files[0]) {
            _ncspProcessImageFile(e.target.files[0]);
        }
    };

    window._ncspClearFormImage = function(e) {
        if (e) e.stopPropagation();
        window._ncspCurrentFormImageData = '';
        const fileInput = document.getElementById('ncspFormFileInput');
        if (fileInput) fileInput.value = '';
        document.getElementById('ncspImagePlaceholder').style.display = 'grid';
        document.getElementById('ncspImagePreviewWrap').style.display = 'none';
    };

    function _ncspProcessImageFile(file) {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            window._ncspCurrentFormImageData = evt.target.result;
            const previewImg = document.getElementById('ncspImagePreview');
            if (previewImg) previewImg.src = evt.target.result;
            document.getElementById('ncspImagePlaceholder').style.display = 'none';
            document.getElementById('ncspImagePreviewWrap').style.display = 'flex';
        };
        reader.readAsDataURL(file);
    }

    window._ncspViewFullImage = function(itemId) {
        const items = _ncspGetItems(currentMainTab);
        const item = items.find(i => i.id === itemId);
        if (!item || !item.image) return;

        const modal = document.getElementById('ncspImageViewerModal');
        const img = document.getElementById('ncspFullImagePreview');
        if (modal && img) {
            img.src = item.image;
            modal.style.display = 'flex';
        }
    };

    window._ncspViewFullImageFromDetail = function() {
        if (window._ncspCurrentDetailItemId) {
            window._ncspViewFullImage(window._ncspCurrentDetailItemId);
        }
    };

    window._ncspToggleImportant = function(itemId) {
        let items = _ncspGetItems(currentMainTab);
        items = items.map(item => {
            if (item.id === itemId) {
                return { ...item, isImportant: !item.isImportant };
            }
            return item;
        });
        _ncspSaveItems(currentMainTab, items);
        _ncspRenderCurrentMainTab();
    };

    window._ncspOpenDetailModal = function(itemId) {
        let items = _ncspGetItems(currentMainTab);
        let item = items.find(i => i.id === itemId);

        if (!item) {
            const mainTabs = ['muc1_rd', 'muc2_process', 'muc3_testing'];
            for (let mt of mainTabs) {
                const list = _ncspGetItems(mt);
                const found = list.find(i => i.id === itemId);
                if (found) { item = found; break; }
            }
        }

        if (!item) {
            console.warn('Item not found for detail view:', itemId);
            return;
        }

        window._ncspCurrentDetailItemId = itemId;

        const iconEl = document.getElementById('ncspDetailHeaderIcon');
        const titleEl = document.getElementById('ncspDetailHeaderTitle');
        if (iconEl) iconEl.innerText = item.icon || '🔬';
        if (titleEl) titleEl.innerText = item.title || '';

        // Description formatting
        const descEl = document.getElementById('ncspDetailDesc');
        if (descEl) {
            let descText = escapeHTML(item.subtitle || 'Không có mô tả chi tiết.');
            descText = descText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            descEl.innerHTML = descText;
        }

        // Image section
        const imgSec = document.getElementById('ncspDetailImageSec');
        const imgEl = document.getElementById('ncspDetailImage');
        if (item.image) {
            if (imgEl) imgEl.src = item.image;
            if (imgSec) imgSec.style.display = 'block';
        } else {
            if (imgSec) imgSec.style.display = 'none';
        }

        // URL button
        const urlBtn = document.getElementById('ncspDetailUrlBtn');
        if (urlBtn) {
            if (item.url) {
                urlBtn.href = item.url;
                urlBtn.style.display = 'inline-flex';
            } else {
                urlBtn.style.display = 'none';
            }
        }

        const modal = document.getElementById('ncspDetailModal');
        if (modal) modal.style.display = 'flex';
    };

    window._ncspCloseDetailModal = function() {
        const modal = document.getElementById('ncspDetailModal');
        if (modal) modal.style.display = 'none';
    };

    // === Item Link Modal Operations ===
    window._ncspOpenLinkModal = function(editId = null) {
        const modal = document.getElementById('ncspLinkModal');
        if (!modal) return;

        // Setup Drag, Drop & Paste events
        const dropzone = document.getElementById('ncspFormImageDropzone');
        if (dropzone) {
            dropzone.ondragover = function(e) { e.preventDefault(); };
            dropzone.ondragleave = function(e) { e.preventDefault(); };
            dropzone.ondrop = function(e) {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    _ncspProcessImageFile(e.dataTransfer.files[0]);
                }
            };
            dropzone.onclick = function(e) {
                if (e.target.closest('#ncspImagePreviewWrap')) return;
                if (e.target.closest('#ncspUploadZone')) {
                    const fileInput = document.getElementById('ncspFormFileInput');
                    if (fileInput) fileInput.click();
                } else if (e.target.closest('#ncspPasteZone')) {
                    const pasteZone = document.getElementById('ncspPasteZone');
                    if (pasteZone) pasteZone.focus();
                }
            };
        }

        // Global Paste Event inside Modal
        const modalCard = document.querySelector('#ncspLinkModal .ncsp-modal-card');
        if (modalCard) {
            modalCard.onpaste = function(e) {
                const items = (e.clipboardData || window.clipboardData)?.items;
                if (!items) return;
                for (let item of items) {
                    if (item.type && item.type.startsWith('image/')) {
                        e.preventDefault();
                        const file = item.getAsFile();
                        if (file) _ncspProcessImageFile(file);
                        break;
                    }
                }
            };
        }

        // 1. Populate Subtab Select Options (NOT preselected in create mode!)
        const subtabs = _ncspGetSubtabs(currentMainTab).filter(s => s.id !== 'all');
        const subtabSelect = document.getElementById('ncspFormSubtabSelect');
        if (subtabSelect) {
            let subtabHtml = `<option value="" disabled ${!editId ? 'selected' : ''}>-- Chọn Mục Quản Trị (* BẮT BUỘC) --</option>`;
            subtabHtml += subtabs.map(s => `<option value="${s.id}">${s.icon||'📁'} ${escapeHTML(s.title)}</option>`).join('');
            subtabSelect.innerHTML = subtabHtml;
        }

        // 2. Populate Category Checkboxes (NOT checked in create mode!)
        const categories = _ncspGetCategories(currentMainTab);
        const catContainer = document.getElementById('ncspFormCategoryCheckboxes');
        if (catContainer) {
            if (categories.length === 0) {
                catContainer.innerHTML = `<div style="color:#64748b; font-size:13px; font-weight:700; padding:4px;">Chưa có lĩnh vực nào. Hãy bấm "⚙️ Cài Đặt Lĩnh Vực" để thêm!</div>`;
            } else {
                catContainer.innerHTML = categories.map(c => `
                    <label class="ncsp-cat-checkbox-item">
                        <input type="checkbox" name="ncspCatCheckbox" value="${escapeHTML(c.name)}">
                        <span>📌 ${escapeHTML(c.name)}</span>
                    </label>
                `).join('');
            }
        }

        document.getElementById('ncspFormLinkId').value = editId || '';
        document.getElementById('ncspModalTitle').innerText = editId ? '✏️ CHỈNH SỬA TÀI LIỆU R&D' : '➕ TẠO ĐƯỜNG LINK TÀI LIỆU/R&D MỚI';

        if (editId) {
            const items = _ncspGetItems(currentMainTab);
            const item = items.find(i => i.id === editId);
            if (item) {
                document.getElementById('ncspFormTitle').value = item.title || '';
                document.getElementById('ncspFormSubtitle').value = item.subtitle || '';
                document.getElementById('ncspFormUrl').value = item.url || '';
                document.getElementById('ncspFormIcon').value = item.icon || '🔬';
                document.getElementById('ncspFormTheme').value = item.theme || 'blue';
                if (subtabSelect && item.subtabId) subtabSelect.value = item.subtabId;

                // Pre-check saved categories
                const savedCats = item.categories || (item.category ? item.category.split(', ') : []);
                document.querySelectorAll('input[name="ncspCatCheckbox"]').forEach(cb => {
                    cb.checked = savedCats.includes(cb.value);
                });

                // Load saved Image if available
                if (item.image) {
                    window._ncspCurrentFormImageData = item.image;
                    const previewImg = document.getElementById('ncspImagePreview');
                    if (previewImg) previewImg.src = item.image;
                    document.getElementById('ncspImagePlaceholder').style.display = 'none';
                    document.getElementById('ncspImagePreviewWrap').style.display = 'flex';
                } else {
                    window._ncspClearFormImage();
                }
            }
        } else {
            document.getElementById('ncspFormTitle').value = '';
            document.getElementById('ncspFormSubtitle').value = '';
            document.getElementById('ncspFormUrl').value = '';
            document.getElementById('ncspFormIcon').value = '🔬';
            document.getElementById('ncspFormTheme').value = 'blue';
            if (subtabSelect) subtabSelect.value = '';

            // Ensure ALL checkboxes are UNCHECKED by default in Create Mode
            document.querySelectorAll('input[name="ncspCatCheckbox"]').forEach(cb => {
                cb.checked = false;
            });

            window._ncspClearFormImage();
        }

        modal.style.display = 'flex';
    };

    window._ncspCloseLinkModal = function() {
        const modal = document.getElementById('ncspLinkModal');
        if (modal) modal.style.display = 'none';
    };

    window._ncspSaveLinkModal = function() {
        const editId = document.getElementById('ncspFormLinkId').value;
        const subtabId = document.getElementById('ncspFormSubtabSelect').value;

        const checkedBoxes = Array.from(document.querySelectorAll('input[name="ncspCatCheckbox"]:checked'));
        const selectedCategories = checkedBoxes.map(cb => cb.value);

        const title = document.getElementById('ncspFormTitle').value.trim();
        const subtitle = document.getElementById('ncspFormSubtitle').value.trim();
        const url = document.getElementById('ncspFormUrl').value.trim();
        const image = window._ncspCurrentFormImageData || '';
        const icon = document.getElementById('ncspFormIcon').value;
        const theme = document.getElementById('ncspFormTheme').value;

        // Strict Validation 1: Must select Subtab
        if (!subtabId) {
            alert('⚠️ Vui lòng chọn Mục Quản Trị (* BẮT BUỘC)!');
            document.getElementById('ncspFormSubtabSelect').focus();
            return;
        }

        // Strict Validation 2: Must select at least 1 Category
        if (selectedCategories.length === 0) {
            alert('⚠️ Vui lòng chọn ít nhất 1 Lĩnh Vực Tài Liệu (* BẮT BUỘC)!');
            return;
        }

        // Strict Validation 3: Must enter Title
        if (!title) {
            alert('⚠️ Vui lòng nhập Tên tiêu đề tài liệu / dự án R&D!');
            document.getElementById('ncspFormTitle').focus();
            return;
        }

        // Strict Validation 4: FLEXIBLE Rule — URL or Image (at least 1 must be present)
        if (!url && !image) {
            alert('⚠️ Vui lòng điền Đường Link Liên Kết HOẶC Dán/Tải Hình Ảnh (bắt buộc chọn ít nhất 1 trong 2)!');
            document.getElementById('ncspFormUrl').focus();
            return;
        }

        let items = _ncspGetItems(currentMainTab);
        const currentUserStr = (window.currentUser && window.currentUser.full_name) || 'Giám Đốc';

        const categoryStr = selectedCategories.join(', ');

        if (editId) {
            items = items.map(item => {
                if (item.id === editId) {
                    return {
                        ...item,
                        title, subtitle, url, image, icon, theme, subtabId,
                        category: categoryStr,
                        categories: selectedCategories,
                        updatedAt: new Date().toISOString(),
                        updatedBy: currentUserStr
                    };
                }
                return item;
            });
        } else {
            const newItem = {
                id: 'ncsp_item_' + Date.now(),
                title, subtitle, url, image, icon, theme, subtabId,
                category: categoryStr,
                categories: selectedCategories,
                createdAt: new Date().toISOString(),
                createdBy: currentUserStr,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUserStr
            };
            items.unshift(newItem);
        }

        _ncspSaveItems(currentMainTab, items);
        window._ncspCloseLinkModal();
        _ncspRenderCurrentMainTab();
    };

    window._ncspEditItem = function(id) {
        window._ncspOpenLinkModal(id);
    };

    window._ncspDeleteItem = function(id) {
        if (!confirm('Bạn có chắc chắn muốn xóa tài liệu này?')) return;
        let items = _ncspGetItems(currentMainTab);
        items = items.filter(i => i.id !== id);
        _ncspSaveItems(currentMainTab, items);
        _ncspRenderCurrentMainTab();
    };

    // Helper escape HTML
    function _ncspLegacyEscapeHTML(str) {
        return _ncspEscapeHTML(str);
    }

    // Embed Styles
    function _ncspGetStyles() {
        return `
            <style>
                .ncsp-wrapper, .ncsp-wrapper button, .ncsp-wrapper input, .ncsp-wrapper textarea, .ncsp-wrapper select {
                    font-family: 'Nunito', 'Comfortaa', system-ui, -apple-system, sans-serif !important;
                }

                .ncsp-wrapper {
                    padding: 24px;
                    width: 100%;
                    box-sizing: border-box;
                    background: #f8fafc;
                    min-height: calc(100vh - 70px);
                    color: #0f172a;
                }

                @keyframes ncspSparkle {
                    0% { background-position: 0% 50%, 0 0, 0 0; }
                    50% { background-position: 100% 50%, 100px 100px, -50px -50px; }
                    100% { background-position: 0% 50%, 0 0, 0 0; }
                }

                @keyframes ncspShimmerSweep {
                    0% { transform: translate(-30%, -30%) rotate(0deg); }
                    100% { transform: translate(30%, 30%) rotate(0deg); }
                }

                .ncsp-header {
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: 
                        linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 40%, #2563eb 70%, #3b82f6 100%),
                        radial-gradient(circle at 20% 30%, rgba(255,255,255,0.25) 1px, transparent 2px),
                        radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3) 1.5px, transparent 2.5px);
                    background-size: 200% 200%, 60px 60px, 90px 90px;
                    animation: ncspSparkle 8s ease infinite;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    padding: 32px 38px;
                    border-radius: 24px;
                    box-shadow: 0 12px 35px -5px rgba(37,99,235,0.35), 0 4px 15px rgba(0,0,0,0.1);
                    margin-bottom: 24px;
                    min-height: 120px;
                    box-sizing: border-box;
                }

                .ncsp-header::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: linear-gradient(
                        45deg,
                        transparent 45%,
                        rgba(255, 255, 255, 0.15) 50%,
                        transparent 55%
                    );
                    animation: ncspShimmerSweep 4s infinite linear;
                    pointer-events: none;
                }

                .ncsp-header-left {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    position: relative;
                    z-index: 2;
                }

                .ncsp-icon-bg {
                    width: 62px;
                    height: 62px;
                    background: rgba(255, 255, 255, 0.2);
                    backdrop-filter: blur(12px);
                    border: 2px solid rgba(255, 255, 255, 0.4);
                    border-radius: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 30px;
                    color: #ffffff;
                    box-shadow: 0 8px 20px rgba(0,0,0,0.2);
                }

                .ncsp-title {
                    font-size: 26px;
                    font-weight: 900;
                    color: #ffffff;
                    margin: 0 0 6px 0;
                    letter-spacing: -0.5px;
                    text-shadow: 0 2px 10px rgba(0,0,0,0.35);
                }

                .ncsp-subtitle {
                    font-size: 15px;
                    color: rgba(255, 255, 255, 0.95);
                    font-weight: 600;
                    margin: 0;
                    text-shadow: 0 1px 4px rgba(0,0,0,0.25);
                }

                .ncsp-badge-live {
                    position: relative;
                    z-index: 2;
                    background: rgba(16, 185, 129, 0.25);
                    color: #a7f3d0;
                    border: 1.5px solid rgba(167, 243, 208, 0.6);
                    padding: 8px 18px;
                    border-radius: 24px;
                    font-size: 13px;
                    font-weight: 900;
                    backdrop-filter: blur(8px);
                    box-shadow: 0 4px 14px rgba(0,0,0,0.2);
                }

                .ncsp-tabs-main {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 18px;
                    margin-bottom: 20px;
                }

                .ncsp-tab-btn {
                    background: #ffffff;
                    border: 1.5px solid #e2e8f0;
                    border-radius: 20px;
                    padding: 20px 24px;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.03);
                }

                .ncsp-tab-btn:hover {
                    border-color: #93c5fd;
                    transform: translateY(-3px);
                    box-shadow: 0 12px 24px rgba(37, 99, 235, 0.12);
                }

                .ncsp-tab-btn.active {
                    background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
                    border-color: transparent;
                    color: #ffffff;
                    box-shadow: 0 12px 28px -4px rgba(37, 99, 235, 0.45);
                }

                .ncsp-tab-btn .tab-num {
                    font-size: 11.5px;
                    font-weight: 900;
                    letter-spacing: 1.2px;
                    opacity: 0.8;
                    margin-bottom: 6px;
                    text-transform: uppercase;
                }

                .ncsp-tab-btn .tab-label {
                    font-size: 15.5px;
                    font-weight: 850;
                }

                /* Sub-tabs Level 2 Bar */
                .ncsp-subtabs-bar {
                    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                    border: 1.5px solid #93c5fd;
                    border-radius: 20px;
                    padding: 14px 20px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    margin-bottom: 16px;
                    box-shadow: 0 4px 14px rgba(2, 132, 199, 0.08);
                }

                .ncsp-subtabs-list {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                    align-items: center;
                }

                .ncsp-subtab-chip {
                    background: #ffffff;
                    border: 1.5px solid #93c5fd;
                    padding: 9px 18px;
                    border-radius: 24px;
                    font-size: 13.5px;
                    font-weight: 850;
                    color: #0369a1;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.2s;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.03);
                }

                .ncsp-subtab-chip:hover {
                    border-color: #0284c7;
                    color: #0284c7;
                    transform: translateY(-1px);
                }

                .ncsp-subtab-chip.active {
                    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
                    border-color: transparent;
                    color: #ffffff;
                    box-shadow: 0 6px 16px rgba(2, 132, 199, 0.35);
                }

                .ncsp-subtabs-actions {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                    flex-shrink: 0;
                }

                /* Categories / Lĩnh Vực Bar */
                .ncsp-categories-bar {
                    background: #ffffff;
                    border: 1.5px solid #e2e8f0;
                    border-radius: 18px;
                    padding: 12px 20px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    margin-bottom: 16px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
                }

                .ncsp-categories-left {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                    align-items: center;
                }

                .ncsp-label-prefix {
                    font-size: 13px;
                    font-weight: 900;
                    color: #334155;
                    margin-right: 4px;
                }

                .ncsp-cat-chip {
                    background: #f8fafc;
                    border: 1.5px solid #cbd5e1;
                    padding: 7px 15px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 800;
                    color: #475569;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .ncsp-cat-chip:hover {
                    border-color: #2563eb;
                    color: #2563eb;
                }

                .ncsp-cat-chip.active {
                    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                    border-color: transparent;
                    color: #ffffff;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                }

                .ncsp-categories-right {
                    flex-shrink: 0;
                }

                .ncsp-controls-card {
                    background: #ffffff;
                    border-radius: 18px;
                    padding: 14px 20px;
                    display: flex;
                    gap: 20px;
                    align-items: center;
                    justify-content: space-between;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
                    border: 1.5px solid #e2e8f0;
                    margin-bottom: 20px;
                }

                .ncsp-search-box {
                    position: relative;
                    flex: 1;
                }

                .ncsp-search-box .search-icon {
                    position: absolute;
                    left: 16px;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 18px;
                    color: #64748b;
                }

                .ncsp-search-box .clear-icon {
                    position: absolute;
                    right: 16px;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 15px;
                    color: #94a3b8;
                    cursor: pointer;
                }

                .ncsp-search-input {
                    width: 100%;
                    padding: 12px 40px 12px 46px;
                    border-radius: 14px;
                    border: 1.5px solid #cbd5e1;
                    font-size: 14px;
                    font-weight: 600;
                    outline: none;
                    transition: all 0.2s;
                    box-sizing: border-box;
                    background: #f8fafc;
                }

                .ncsp-search-input:focus {
                    border-color: #2563eb;
                    background: #ffffff;
                    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
                }

                .ncsp-section-title-wrap {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }

                .ncsp-section-title {
                    font-size: 17px;
                    font-weight: 900;
                    color: #0f172a;
                    margin: 0;
                    letter-spacing: -0.3px;
                }

                .ncsp-count-badge {
                    font-size: 13px;
                    font-weight: 800;
                    color: #475569;
                    background: #e2e8f0;
                    padding: 5px 14px;
                    border-radius: 14px;
                }

                .ncsp-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
                    gap: 22px;
                }

                .ncsp-card {
                    background: #ffffff;
                    border-radius: 22px;
                    border: 1.5px solid #e2e8f0;
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.04);
                }

                .ncsp-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.08);
                    border-color: #bfdbfe;
                }

                .ncsp-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 16px;
                }

                .ncsp-card-icon {
                    font-size: 34px;
                    background: #f8fafc;
                    width: 58px;
                    height: 58px;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1.5px solid #f1f5f9;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
                }

                .ncsp-card-meta {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 6px;
                }

                .ncsp-card-tag {
                    font-size: 12px;
                    font-weight: 850;
                    background: #eff6ff;
                    color: #1d4ed8;
                    padding: 4px 12px;
                    border-radius: 10px;
                }

                .ncsp-card-date {
                    font-size: 11.5px;
                    color: #94a3b8;
                    font-weight: 600;
                }

                .ncsp-card-title {
                    font-size: 16px;
                    font-weight: 850;
                    color: #0f172a;
                    margin: 0 0 10px 0;
                    line-height: 1.45;
                }

                .ncsp-card-desc {
                    font-size: 13.5px;
                    color: #64748b;
                    line-height: 1.55;
                    margin: 0 0 20px 0;
                    font-weight: 500;

                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .ncsp-card-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-top: 16px;
                    border-top: 1.5px solid #f1f5f9;
                }

                .ncsp-card-actions {
                    display: flex;
                    gap: 8px;
                }

                .ncsp-btn {
                    padding: 11px 20px;
                    border-radius: 14px;
                    font-size: 14px;
                    font-weight: 850;
                    cursor: pointer;
                    border: none;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s;
                    text-decoration: none;
                }

                .ncsp-btn.sm {
                    padding: 8px 16px;
                    font-size: 13px;
                }

                .ncsp-btn.primary {
                    background: linear-gradient(135deg, #2563eb, #1d4ed8);
                    color: #ffffff;
                    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
                }

                .ncsp-btn.primary:hover {
                    background: linear-gradient(135deg, #1d4ed8, #1e40af);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(37, 99, 235, 0.45);
                }

                .ncsp-btn.secondary {
                    background: #ffffff;
                    border: 1.5px solid #cbd5e1;
                    color: #334155;
                }

                .ncsp-btn.secondary:hover {
                    background: #f8fafc;
                    border-color: #2563eb;
                    color: #2563eb;
                }

                .ncsp-btn.danger {
                    color: #dc2626;
                }

                .ncsp-btn.danger:hover {
                    background: #fef2f2;
                    border-color: #fca5a5;
                }

                .ncsp-icon-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: 12px;
                    border: 1.5px solid #e2e8f0;
                    background: #ffffff;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 15px;
                    transition: all 0.2s;
                }

                .ncsp-icon-btn:hover {
                    background: #f8fafc;
                    border-color: #cbd5e1;
                    transform: translateY(-1px);
                }

                .ncsp-icon-btn.danger:hover {
                    background: #fef2f2;
                    border-color: #fca5a5;
                    color: #dc2626;
                }

                .ncsp-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.65);
                    backdrop-filter: blur(8px);
                    z-index: 99999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }

                .ncsp-modal-card {
                    background: #ffffff;
                    border-radius: 24px;
                    width: 820px;
                    max-width: 95vw;
                    overflow: hidden;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3);
                    border: 1.5px solid #bfdbfe;
                }

                .ncsp-modal-header {
                    padding: 20px 28px;
                    background: linear-gradient(135deg, #1e3a8a, #2563eb);
                    color: #ffffff;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .ncsp-modal-header h3 {
                    margin: 0;
                    font-size: 17.5px;
                    font-weight: 900;
                }

                .ncsp-modal-close {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: #ffffff;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 16px;
                }

                .ncsp-modal-body {
                    padding: 24px 28px;
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                    background: #f8fafc;
                }

                .ncsp-box-create {
                    background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
                    padding: 20px;
                    border-radius: 18px;
                    border: 1.5px solid #93c5fd;
                    box-shadow: 0 4px 14px rgba(2, 132, 199, 0.08);
                }

                .ncsp-box-label {
                    font-size: 14px;
                    font-weight: 900;
                    color: #0369a1;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 12px;
                }

                .ncsp-list-container {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    max-height: 340px;
                    overflow-y: auto;
                    padding-right: 4px;
                }

                .ncsp-manage-item {
                    background: #ffffff;
                    border: 1.5px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 10px 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
                }

                .ncsp-manage-item.editing {
                    border-color: #2563eb;
                    box-shadow: 0 4px 14px rgba(37,99,235,0.12);
                }

                .ncsp-item-num {
                    background: #eff6ff;
                    color: #1d4ed8;
                    font-weight: 900;
                    font-size: 12px;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .ncsp-item-icon {
                    font-size: 18px;
                }

                .ncsp-item-title {
                    font-size: 14px;
                    font-weight: 850;
                    color: #0f172a;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .ncsp-item-actions {
                    display: flex;
                    gap: 6px;
                    flex-shrink: 0;
                }

                .ncsp-item-actions .ncsp-btn.sm {
                    padding: 6px 11px;
                    font-size: 12.5px;
                    white-space: nowrap;
                }

                .ncsp-form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .ncsp-form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 14px;
                }

                .ncsp-form-label {
                    font-size: 13.5px;
                    font-weight: 850;
                    color: #1e293b;
                }

                .ncsp-cat-checkbox-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    padding: 12px 16px;
                    border: 2px solid #0284c7;
                    background: #f0f9ff;
                    border-radius: 16px;
                    max-height: 160px;
                    overflow-y: auto;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
                }

                .ncsp-cat-checkbox-item {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: #ffffff;
                    border: 1.5px solid #93c5fd;
                    padding: 7px 14px;
                    border-radius: 20px;
                    font-size: 13.5px;
                    font-weight: 800;
                    color: #0369a1;
                    cursor: pointer;
                    transition: all 0.2s;
                    user-select: none;
                }

                .ncsp-cat-checkbox-item:hover {
                    border-color: #0284c7;
                    background: #e0f2fe;
                    transform: translateY(-1px);
                }

                .ncsp-cat-checkbox-item input[type="checkbox"] {
                    width: 16px;
                    height: 16px;
                    cursor: pointer;
                    accent-color: #0284c7;
                }

                .ncsp-card-cover-wrap {
                    position: relative;
                    width: 100%;
                    height: 185px;
                    background: #f1f5f9;
                    cursor: pointer;
                    overflow: hidden;
                    border-bottom: 1.5px solid #e2e8f0;
                }

                .ncsp-card-cover-img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                    transition: transform 0.35s ease;
                }

                .ncsp-card-cover-wrap:hover .ncsp-card-cover-img {
                    transform: scale(1.04);
                }

                .ncsp-card-cover-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.25s ease;
                    cursor: pointer;
                }

                .ncsp-card-cover-wrap:hover .ncsp-card-cover-overlay {
                    opacity: 1;
                }

                .ncsp-cover-badge {
                    background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
                    color: #ffffff;
                    font-size: 13.5px;
                    font-weight: 850;
                    padding: 8px 18px;
                    border-radius: 20px;
                    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
                    transform: translateY(6px);
                    transition: transform 0.25s ease;
                    pointer-events: none;
                }

                .ncsp-card-cover-wrap:hover .ncsp-cover-badge {
                    transform: translateY(0);
                }

                .ncsp-image-dropzone {
                    border: none;
                    background: transparent;
                    padding: 0;
                    text-align: center;
                    outline: none;
                }

                .ncsp-dropzone-placeholder-split {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 14px;
                    width: 100%;
                }

                .ncsp-upload-half-box {
                    border: 2px dashed #0284c7;
                    background: #ffffff;
                    border-radius: 16px;
                    padding: 18px 14px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.22s ease;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    outline: none;
                }

                .ncsp-upload-half-box.paste-box {
                    border-color: #0284c7;
                    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                }

                .ncsp-upload-half-box.paste-box:hover, .ncsp-upload-half-box.paste-box:focus {
                    border-color: #2563eb;
                    background: #dbeafe;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.18);
                }

                .ncsp-upload-half-box.upload-box {
                    border-color: #10b981;
                    background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
                }

                .ncsp-upload-half-box.upload-box:hover {
                    border-color: #059669;
                    background: #a7f3d0;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.18);
                }

                .ncsp-upload-half-box .half-box-icon {
                    font-size: 30px;
                    margin-bottom: 6px;
                }

                .ncsp-upload-half-box .half-box-title {
                    font-size: 13.5px;
                    font-weight: 850;
                    margin-bottom: 4px;
                }

                .ncsp-upload-half-box.paste-box .half-box-title {
                    color: #0369a1;
                }

                .ncsp-upload-half-box.upload-box .half-box-title {
                    color: #047857;
                }

                .ncsp-upload-half-box .half-box-sub {
                    font-size: 11.5px;
                    color: #64748b;
                    font-weight: 600;
                }

                .kbd-badge {
                    background: #0284c7;
                    color: #ffffff;
                    padding: 2px 7px;
                    border-radius: 6px;
                    font-size: 11.5px;
                    font-weight: 900;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .ncsp-preview-wrap {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 10px;
                    padding: 16px;
                    border: 2px solid #3b82f6;
                    background: #eff6ff;
                    border-radius: 16px;
                }

                .ncsp-preview-img {
                    max-width: 100%;
                    max-height: 180px;
                    border-radius: 12px;
                    border: 1.5px solid #cbd5e1;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    object-fit: contain;
                }

                .ncsp-card-thumbnail-wrap {
                    margin-top: 12px;
                    border-radius: 14px;
                    overflow: hidden;
                    border: 1.5px solid #e2e8f0;
                    max-height: 160px;
                    cursor: pointer;
                    background: #f8fafc;
                }

                .ncsp-card-thumbnail {
                    width: 100%;
                    height: 140px;
                    object-fit: cover;
                    display: block;
                    transition: transform 0.3s ease;
                }

                .ncsp-card-thumbnail:hover {
                    transform: scale(1.03);
                }

                .ncsp-input, .ncsp-textarea, .ncsp-select {
                    width: 100%;
                    padding: 12px 16px;
                    border-radius: 12px;
                    border: 1.5px solid #cbd5e1;
                    font-size: 14px;
                    font-weight: 600;
                    outline: none;
                    box-sizing: border-box;
                    font-family: inherit;
                    background: #ffffff;
                }

                .ncsp-input:focus, .ncsp-textarea:focus, .ncsp-select:focus {
                    border-color: #2563eb;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                }

                .ncsp-modal-footer {
                    padding: 18px 28px;
                    background: #ffffff;
                    border-top: 1.5px solid #e2e8f0;
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }

                .ncsp-empty-state {
                    background: #ffffff;
                    border-radius: 24px;
                    border: 2px dashed #cbd5e1;
                    padding: 56px 24px;
                    text-align: center;
                    color: #64748b;
                }

                .ncsp-empty-state .empty-icon {
                    font-size: 52px;
                    margin-bottom: 14px;
                }

                .ncsp-empty-state h3 {
                    font-size: 18px;
                    color: #0f172a;
                    margin: 0 0 10px 0;
                    font-weight: 850;
                }
            </style>
        `;
    }

})();
