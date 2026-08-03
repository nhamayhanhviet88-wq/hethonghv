// ========== NGÂN SÁCH MARKETING 2 CỘT (DESKTOP) ==========
// Page: /ngansachmkt
// Init function: renderNgansachmktPage(container)

var _mktNavState = {
    selectedYear: new Date().getFullYear(),
    selectedMonth: new Date().getMonth() + 1, // 1 - 12 or 'all'
    selectedGroup: 'all', // 'all', 'online', 'offline'
    selectedCatId: 'all', // 'all' or category_id
    viewType: 'daily', // 'daily' or 'monthly'
    categories: [],
    sources: { nhu_cau: [], sale: [] },
    pages: [],
    budgetsData: [],
    summary: {},
    resourceHandlers: []
};

function _mktIsGiamDoc() {
    const user = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
    if (!user) return true; // Fallback for unauthenticated dev mode
    if (user.role === 'giam_doc' || user.role === 'admin' || user.username === 'admin') return true;
    if (user.full_name && (user.full_name.toLowerCase().includes('giám đốc') || user.full_name.toLowerCase().includes('giam doc'))) return true;
    return false;
}

async function renderNgansachmktPage(container) {
    const isDirector = _mktIsGiamDoc();

    const directorButtonsHtml = isDirector ? `
        <button class="mkt-btn mkt-btn-secondary" style="font-size:12px;padding:8px 12px;background:#fdf4ff;color:#7e22ce;border-color:#d8b4fe;" onclick="_mktOpenResourceModal()">
            📦 Cài Đặt Nguyên Liệu
        </button>
        <button class="mkt-btn mkt-btn-secondary" style="font-size:12px;padding:8px 12px;background:#f0fdf4;color:#166534;border-color:#86efac;" onclick="_mktSyncMetaInsights()">
            🔄 Rút Dữ Liệu Meta Ads
        </button>
        <button class="mkt-btn mkt-btn-secondary" style="font-size:12px;padding:8px 12px;" onclick="_mktOpenMetaConfigModal()">
            ⚙️ Cấu Hình Token Ads
        </button>
        <button class="mkt-btn mkt-btn-secondary" style="font-size:12px;padding:8px 12px;" onclick="_mktSyncPancakePages()">
            ⚡ Đồng Bộ Page Pancake
        </button>
    ` : '';

    container.innerHTML = `
        ${_mkt2ColStyles()}
        <div class="mkt-container">
            <!-- LEFT COLUMN: TREE MENU SIDEBAR -->
            <div class="mkt-sidebar">
                <div class="mkt-sb-header">
                    <div class="mkt-sb-title">📅 Chọn Năm</div>
                    <div class="mkt-sb-year-box">
                        <button type="button" class="mkt-sb-year-btn" onclick="_mktSelectYearAll()" title="Click để xem tổng hợp toàn bộ dữ liệu Năm ${_mktNavState.selectedYear}">
                            <span id="mktYearBtnTxt">📅 Năm ${_mktNavState.selectedYear}</span>
                        </button>
                        <div class="mkt-sb-divider"></div>
                        <div class="mkt-sb-arrow-box" title="Click mũi tên để đổi sang Năm khác">
                            <select id="mktYearSelect" class="mkt-sb-arrow-select" onchange="_mktOnYearChange(this.value)">
                                ${[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => `<option value="${y}" ${y === _mktNavState.selectedYear ? 'selected' : ''}>Năm ${y}</option>`).join('')}
                            </select>
                            <span class="mkt-sb-arrow-icon">▼</span>
                        </div>
                    </div>
                </div>

                <div class="mkt-sb-section-title">🗓️ Danh Sách Tháng</div>
                <div id="mktMonthList" class="mkt-month-list">
                    <!-- Loaded dynamically -->
                </div>
            </div>

            <!-- RIGHT COLUMN: CONTENT & DETAILS -->
            <div class="mkt-main-content">
                <!-- Header Breadcrumb & Actions -->
                <div class="mkt-top-bar">
                    <div class="mkt-breadcrumb" id="mktBreadcrumb">
                        ⏳ Đang tải vị trí...
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        ${directorButtonsHtml}
                    </div>
                </div>

                <!-- KPI Summary Cards (2 Rows Structure) -->
                <div id="mktKpiCards" style="margin-bottom:20px;">
                    <div style="text-align:center;padding:20px;color:#94a3b8;">⏳ Đang tính toán chỉ số...</div>
                </div>

                <!-- CARD PANEL 1: BẢNG CHI PHÍ MARKETING (NHẬT KÝ TIỀN CHI CHI TIẾT) -->
                <div class="mkt-card-panel" style="margin-bottom:24px;">
                    <div class="mkt-panel-hdr">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <h3 style="font-size:16px;font-weight:800;color:#0f172a;margin:0;">📋 Bảng Chi Phí Marketing</h3>
                            <span style="font-size:11.5px;color:#64748b;background:#f1f5f9;padding:2px 8px;border-radius:6px;font-weight:600;">Nhật ký từng phiếu/bản ghi tiền chi</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:10px;">
                            <span id="mktCostRecordCount" class="mkt-tag">0 giao dịch</span>
                            <button id="mktDirectorCampaignBtn" type="button" data-no-debounce="true" class="mkt-btn" style="padding:5px 12px;font-size:12px;background:linear-gradient(135deg, #7c3aed, #6d28d9);color:white;display:none;" onclick="_mktOpenCampaignModal()">🎯 Tạo Chiến Dịch</button>
                            <button id="mktCostAddBtn" type="button" data-no-debounce="true" class="mkt-btn mkt-btn-primary" style="padding:5px 12px;font-size:12px;" onclick="_mktOpenCostModal()">➕ Nhập Chi Phí</button>
                        </div>
                    </div>
                    <div id="mktCampaignCardsBox" style="display:none;padding:14px 18px;background:#fcf5ff;border-bottom:1.5px solid #f3e8ff;"></div>
                    <div class="mkt-table-wrap" style="max-height: 400px; overflow-y: auto;">
                        <table class="mkt-table">
                            <thead>
                                <tr>
                                    <th style="width:40px;text-align:center;">#</th>
                                    <th style="width:105px;">Ngày Chi</th>
                                    <th style="width:110px;">Mã Tiền Chi</th>
                                    <th style="min-width:190px;">Chiến Dịch Marketing</th>
                                    <th style="min-width:240px;">📝 Nội Dung Chi Marketing *</th>
                                    <th style="width:130px;text-align:right;">💸 Chi Phí Thực Tế</th>
                                    <th style="width:100px;text-align:center;">Ảnh Hóa Đơn</th>
                                    <th style="width:140px;">Người Báo Chi Phí</th>
                                    <th style="width:80px;text-align:center;">Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody id="mktCostTableBody">
                                <!-- Populated dynamically -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- CARD PANEL 2: BẢNG CHI TIẾT CHỈ SỐ / CHI PHÍ (GIỮ NGUYÊN NẰM PHÍA DƯỚI) -->
                <div class="mkt-card-panel">
                    <div class="mkt-panel-hdr">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <h3 id="mktTableTitle">📋 Bảng Chi Tiết Chỉ Số / Chi Phí</h3>
                            <div style="display:inline-flex;background:#e2e8f0;padding:3px;border-radius:10px;gap:4px;">
                                <button id="mktViewBtnDaily" class="mkt-btn" style="padding:4px 12px;font-size:11.5px;border-radius:8px;" onclick="_mktSetViewType('daily')">📅 Chi Tiết Từng Ngày</button>
                                <button id="mktViewBtnMonthly" class="mkt-btn" style="padding:4px 12px;font-size:11.5px;border-radius:8px;" onclick="_mktSetViewType('monthly')">📊 Tổng Cả Tháng</button>
                            </div>
                        </div>
                        <span id="mktRecordCount" class="mkt-tag">0 bản ghi</span>
                    </div>
                    <div class="mkt-table-wrap">
                        <table class="mkt-table">
                            <thead>
                                <tr id="mktTableHeaderRow">
                                    <th style="width:40px;text-align:center;">#</th>
                                    <th style="width:140px;">Ngày</th>
                                    <th style="min-width:260px;">Kênh Marketing</th>
                                    <th style="text-align:right;">Chi Phí</th>
                                    <th style="text-align:center;">Tin Nhắn</th>
                                    <th style="text-align:right;">CPL</th>
                                    <th style="text-align:center;">Đơn Hàng</th>
                                    <th style="text-align:right;">Doanh Số</th>
                                    <th style="text-align:center;">ROAS</th>
                                    <th style="text-align:right;">Giá / Đơn</th>
                                    <th style="text-align:center;width:90px;">Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody id="mktTableBody">
                                <tr><td colspan="11" style="text-align:center;padding:40px;color:#94a3b8;">⏳ Đang tải dữ liệu...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL: ADS HANDLER RESOURCES (CÀI ĐẶT NGUYÊN LIỆU TÀI KHOẢN) -->
        <div id="mktResourceModalOverlay" class="mkt-modal-overlay" style="display:none;" onclick="if(event.target===this)_mktCloseResourceModal()">
            <div class="mkt-modal" style="width:680px;">
                <div class="mkt-modal-hdr">
                    <h3>📦 Cài Đặt Nguyên Liệu Tài Khoản Cho Người Cầm Ads</h3>
                    <button class="mkt-modal-close" onclick="_mktCloseResourceModal()">✕</button>
                </div>
                <form onsubmit="_mktSaveResource(event)">
                    <div class="mkt-fg" style="background:#fcf5ff;padding:14px;border-radius:12px;border:1.5px solid #e9d5ff;">
                        <label style="color:#7e22ce;font-size:13.5px;font-weight:800;">👤 Chọn Người Cầm Ads Đã Cấp Phát Nguyên Liệu *</label>
                        <select id="mktResourceHandlerSelect" class="mkt-select" style="font-weight:800;color:#6b21a8;" required onchange="_mktOnResourceHandlerChange(this.value)">
                            <!-- Loaded dynamically -->
                        </select>
                        <div id="mktResourceUpdatedDisp" style="font-size:11.5px;color:#6b21a8;margin-top:6px;font-weight:600;">
                            <!-- Shows timestamp -->
                        </div>
                    </div>

                    <div class="mkt-fg">
                        <label style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:6px;display:block;">
                            📝 Danh Sách Nguyên Liệu Tài Khoản (VIA, BM, Proxy, Clone, Backup Code...)
                        </label>
                        <textarea id="mktResourceContent" class="mkt-input" rows="12" style="font-family:'Courier New', Consolas, monospace;font-size:13px;line-height:1.5;padding:12px;border:2px solid #cbd5e1;border-radius:12px;" placeholder="Nhập hoặc dán thông tin nguyên liệu tài khoản quảng cáo cấp cho nhân viên này tại đây...&#10;Ví dụ:&#10;VIA 1: 100088829123 | Pass: Aa123456 | 2FA: 2K3J 9K1A...&#10;BM 1: BM 2500 - ID: 72139788...&#10;Proxy HTTP: 103.18.xxx:8080:user:pass"></textarea>
                        <span style="font-size:11px;color:#64748b;margin-top:4px;display:block;">Dữ liệu lưu dạng thô (Raw Text), dễ dàng copy/paste và tra cứu bất cứ lúc nào.</span>
                    </div>

                    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
                        <button type="button" class="mkt-btn mkt-btn-secondary" onclick="_mktCloseResourceModal()">Hủy</button>
                        <button type="submit" class="mkt-btn mkt-btn-primary" style="background:linear-gradient(135deg, #9333ea, #7e22ce);">💾 Lưu Nguyên Liệu</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL: ADD/EDIT COST -->
        <div id="mktCostModalOverlay" class="mkt-modal-overlay" style="display:none;" onclick="if(event.target===this)_mktCloseCostModal()">
            <div class="mkt-modal">
                <div class="mkt-modal-hdr">
                    <h3 id="mktCostModalTitle">➕ Nhập Chi Phí Marketing</h3>
                    <button class="mkt-modal-close" onclick="_mktCloseCostModal()">✕</button>
                </div>
                <form id="mktCostForm" onsubmit="_mktSaveCost(event)">
                    <input type="hidden" id="mktCostId" value="">
                    
                    <div class="mkt-fg">
                        <label style="font-weight:800;font-size:12.5px;color:#1e40af;">📅 Ngày Cụ Thể Phát Sinh Chi Phí *</label>
                        <input type="date" id="mktCostDate" class="mkt-input" required style="font-weight:800;color:#1e40af;">
                    </div>

                    <div class="mkt-fg">
                        <label style="font-weight:800;font-size:12.5px;">Kênh Marketing *</label>
                        <select id="mktCostCategory" class="mkt-select" required onchange="_mktOnCostCategoryChange(this.value)">
                            <!-- Options populated dynamically -->
                        </select>
                    </div>

                    <div class="mkt-fg" style="background:#f3e8ff;padding:12px;border-radius:10px;border:1.5px solid #d8b4fe;">
                        <label style="color:#6b21a8;font-weight:800;font-size:12.5px;">🎯 Chọn Chiến Dịch Marketing * (Bắt Buộc Kiểm Soát Ngân Sách)</label>
                        <select id="mktCostCampaignSelect" class="mkt-select" required onchange="_mktOnCostSpentInput()" style="font-weight:700;color:#6b21a8;">
                            <option value="">-- Chọn Chiến Dịch Marketing * --</option>
                        </select>
                        <div id="mktCostCampaignInfo" style="display:none;margin-top:8px;background:white;padding:8px 10px;border-radius:8px;border:1px solid #d8b4fe;"></div>
                    </div>

                    <!-- FANPAGE & ADS HANDLER SELECTION (HIDDEN) -->
                    <div id="mktPageSection" style="display:none;">
                        <select id="mktCostPageSelect" class="mkt-select"></select>
                    </div>

                    <div class="mkt-fg">
                        <label style="font-weight:800;font-size:12.5px;color:#0f172a;">📝 Nội Dung Chi Marketing *</label>
                        <textarea id="mktCostNotes" class="mkt-input" rows="2" required placeholder="Nhập chi tiết nội dung chi (VD: Chạy QC Facebook Page 02 tuần 3, In ấn poster...)..."></textarea>
                    </div>

                    <div class="mkt-fg">
                        <label style="font-weight:800;font-size:12.5px;color:#059669;">💸 Chi Phí Thực Tế (VNĐ) *</label>
                        <input type="number" id="mktCostSpent" class="mkt-input" required placeholder="0" min="0" oninput="_mktOnCostSpentInput()" style="font-weight:800;font-size:15px;color:#059669;">
                    </div>

                    <!-- REPORT LINK (MANDATORY) -->
                    <div class="mkt-fg">
                        <label style="font-weight:800;font-size:12.5px;color:#0369a1;">🔗 Đường Link Báo Các Mục Chi Tiền * (Bắt Buộc Điền)</label>
                        <input type="url" id="mktCostReportLink" class="mkt-input" required placeholder="Vd: https://facebook.com/ads/..., https://drive.google.com/..." style="font-weight:600;">
                        <span style="font-size:11px;color:#0284c7;margin-top:2px;display:block;">💡 Nhập đường dẫn link bài viết, chiến dịch, hóa đơn hoặc tài liệu báo các mục chi tiền.</span>
                    </div>

                    <!-- CTRL + V PASTE IMAGE DROPZONE (PASTE ONLY - MANDATORY) -->
                    <div class="mkt-fg">
                        <label style="font-weight:800;font-size:12.5px;color:#dc2626;margin-bottom:6px;display:block;">
                            🖼️ Ảnh Hóa Đơn / Bill Chi Phí * (Bắt Buộc Dán Ảnh Ctrl + V)
                        </label>
                        <div id="mktCostImageDropArea" tabindex="0" style="border: 2px dashed #fca5a5; border-radius: 12px; padding: 16px; text-align: center; background: #fef2f2; cursor: default; transition: all 0.2s; outline: none;" onpaste="_mktHandleCostImagePaste(event)">
                            <div id="mktCostImagePlaceholder">
                                <div style="font-size: 26px; margin-bottom: 4px;">📋 🖼️</div>
                                <div style="font-size: 13.5px; font-weight: 800; color: #dc2626;">Bắt buộc bấm <kbd style="background:#fecdd3;padding:2px 8px;border-radius:6px;font-family:monospace;font-size:13px;border:1px solid #fda4af;color:#991b1b;">Ctrl + V</kbd> để dán ảnh bill trực tiếp</div>
                                <div style="font-size: 11.5px; color: #991b1b; margin-top: 4px;">Hỗ trợ dán ảnh hóa đơn từ Zalo, Facebook, Snipping Tool, Chụp màn hình...</div>
                            </div>
                            <div id="mktCostImagePreviewContainer" style="display:none; position:relative; text-align:center;">
                                <img id="mktCostImagePreview" src="" style="max-height: 180px; max-width: 100%; border-radius: 10px; border: 1px solid #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                                <button type="button" onclick="event.stopPropagation(); _mktRemoveCostImage();" style="position:absolute; top:-8px; right:-8px; background:#ef4444; color:white; border:none; border-radius:50%; width:24px; height:24px; font-size:12px; cursor:pointer; font-weight:bold; box-shadow:0 2px 6px rgba(0,0,0,0.2);">✕</button>
                            </div>
                        </div>
                        <input type="hidden" id="mktCostImageUrl" value="">
                    </div>

                    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
                        <button type="button" class="mkt-btn mkt-btn-secondary" onclick="_mktCloseCostModal()">Hủy</button>
                        <button id="mktSaveCostBtn" type="submit" class="mkt-btn mkt-btn-primary">💾 Lưu Chi Phí</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL: META ADS CONFIG (REQUIRED: NAME, LINK, ID, TOKEN) -->
        <div id="mktMetaModalOverlay" class="mkt-modal-overlay" style="display:none;" onclick="if(event.target===this)_mktCloseMetaConfigModal()">
            <div class="mkt-modal" style="width:580px;">
                <div class="mkt-modal-hdr">
                    <h3>⚙️ Cấu Hình Facebook Graph API Token & Ad Account</h3>
                    <button class="mkt-modal-close" onclick="_mktCloseMetaConfigModal()">✕</button>
                </div>
                <form onsubmit="_mktSaveMetaConfig(event)">
                    <div class="mkt-fg">
                        <label>Kênh / Fanpage Cần Kết Nối *</label>
                        <select id="mktMetaCatSelect" class="mkt-select" required onchange="_mktOnMetaCatChange(this.value)"></select>
                    </div>
                    <div class="mkt-fg">
                        <label>Tên Tài Khoản Quảng Cáo Meta *</label>
                        <input type="text" id="mktMetaAdAccountName" class="mkt-input" required placeholder="Vd: Tk QC HV 01 - Nguyễn Văn A">
                    </div>
                    <div class="mkt-fg">
                        <label>Mã Tài Khoản Quảng Cáo Meta (Ad Account ID) *</label>
                        <input type="text" id="mktMetaAdAccountId" class="mkt-input" required placeholder="Vd: act_721397883965307">
                        <span style="font-size:11px;color:#64748b;margin-top:2px;display:block;">Nhập ID tài khoản quảng cáo Meta (bắt đầu bằng act_).</span>
                    </div>
                    <div class="mkt-fg">
                        <label>Link Trực Tiếp Tài Khoản Quảng Cáo Meta *</label>
                        <input type="url" id="mktMetaAdAccountLink" class="mkt-input" required placeholder="Vd: https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=721397883965307">
                        <span style="font-size:11px;color:#64748b;margin-top:2px;display:block;">Dán đường link truy cập trực tiếp Trình quản lý quảng cáo Meta.</span>
                    </div>
                    <div class="mkt-fg">
                        <label>Tên Tài Khoản FB Developer</label>
                        <input type="text" id="mktMetaDevAccountName" class="mkt-input" placeholder="Vd: Nguyễn Văn A (FB Developer)">
                    </div>
                    <div class="mkt-fg">
                        <label>Link Facebook Tài Khoản</label>
                        <input type="url" id="mktMetaDevAccountLink" class="mkt-input" placeholder="Vd: https://facebook.com/profile.php?id=...">
                        <span style="font-size:11px;color:#64748b;margin-top:2px;display:block;">Dán đường link Facebook cá nhân của tài khoản Developer.</span>
                    </div>
                    <div class="mkt-fg">
                        <label>Link Meta Developer</label>
                        <input type="url" id="mktMetaDevPortalLink" class="mkt-input" placeholder="Vd: https://developers.facebook.com/apps/...">
                        <span style="font-size:11px;color:#64748b;margin-top:2px;display:block;">Dán đường link truy cập ứng dụng / trang Meta Developer.</span>
                    </div>
                    <div class="mkt-fg">
                        <label>Access Token Meta (Trình khám phá API Đồ thị) *</label>
                        <textarea id="mktMetaAccessToken" class="mkt-input" rows="3" required placeholder="Dán mã EAAV3... tại đây"></textarea>
                        <span style="font-size:11px;color:#64748b;margin-top:2px;display:block;">Mã truy cập tạo từ Meta Developer Explorer kèm các quyền: ads_read, read_insights, pages_show_list.</span>
                    </div>
                    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
                        <button type="button" class="mkt-btn mkt-btn-secondary" onclick="_mktCloseMetaConfigModal()">Hủy</button>
                        <button type="submit" class="mkt-btn mkt-btn-primary" style="background:linear-gradient(135deg, #10b981, #059669);">💾 Lưu Cấu Hình Meta</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL: ADD / EDIT MARKETING CATEGORY WITH PANCAKE PAGE DIRECT SELECTION & PERMISSION ASSIGNMENT -->
        <div id="mktCatModalOverlay" class="mkt-modal-overlay" style="display:none;" onclick="if(event.target===this)_mktCloseCatModal()">
            <div class="mkt-modal" style="width:540px;">
                <div class="mkt-modal-hdr">
                    <h3 id="mktCatModalTitle">➕ Tạo Mục Marketing Mới</h3>
                    <button type="button" class="mkt-modal-close" data-no-debounce="true" onclick="_mktCloseCatModal();event.preventDefault();">✕</button>
                </div>
                <form id="mktCatForm" onsubmit="_mktSaveCat(event)">
                    <input type="hidden" id="mktCatId" value="">
                    <input type="hidden" id="mktCatGroupType" value="online">
                    <div class="mkt-fg">
                        <label>Phân Nhóm Marketing</label>
                        <input type="text" id="mktCatGroupDisplay" class="mkt-input" readonly style="background:#f1f5f9;font-weight:700;">
                    </div>

                    <!-- PARENT CATEGORY SELECTOR -->
                    <div id="mktCatParentBox" class="mkt-fg" style="background:#eff6ff;padding:12px;border-radius:10px;border:1px solid #bfdbfe;">
                        <label style="color:#1e40af;font-weight:800;">📂 Chọn Mục Cha (Tùy chọn)</label>
                        <select id="mktCatParentSelect" class="mkt-select" onchange="_mktOnParentCategoryChange(this.value)">
                            <!-- Populated dynamically -->
                        </select>
                    </div>

                    <!-- DIRECT PANCAKE PAGE SELECTOR (FOR FACEBOOK / ADS) -->
                    <div id="mktCatPancakeBox" class="mkt-fg" style="background:#f0fdf4;padding:12px;border-radius:10px;border:1.5px solid #86efac;">
                        <label style="color:#166534;font-weight:800;">📄 Chọn Trực Tiếp Page Từ Cài Đặt Pancake</label>
                        <select id="mktCatPancakePageSelect" class="mkt-select" onchange="_mktOnCatPancakePageSelect(this.value)">
                            <!-- Populated dynamically -->
                        </select>
                        <div id="mktCatPancakeInfo" style="display:none;margin-top:8px;background:white;padding:8px 10px;border-radius:8px;font-size:12px;border:1px solid #bbf7d0;">
                            <div>🔗 Nguồn Mặc Định: <strong id="mktCatPageSourceTxt" style="color:#0284c7;">—</strong></div>
                            <div>👤 Người Cầm Ads: <strong id="mktCatPageHandlerTxt" style="color:#7c3aed;">—</strong></div>
                        </div>
                    </div>

                    <div class="mkt-fg">
                        <label>Tên Kênh / Mục Mới *</label>
                        <input type="text" id="mktCatName" class="mkt-input" required placeholder="Vd: Page Đồng Phục Công Ty, Threads Ads...">
                    </div>

                    <!-- SECTION 1: SINGLE ADS HANDLER SELECTOR -->
                    <div class="mkt-fg" style="background:#f3e8ff;padding:12px;border-radius:10px;border:1.5px solid #d8b4fe;">
                        <label style="color:#6b21a8;font-weight:800;">👤 Nhân Viên Cầm Ads (Chạy Ads & Tính Chỉ Số) * (Chỉ chọn 1 người)</label>
                        <select id="mktCatAdsHandlerSelect" class="mkt-select" style="font-weight:700;color:#6b21a8;">
                            <!-- Populated dynamically -->
                        </select>
                        <div style="font-size:11px;color:#7e22ce;margin-top:4px;">💡 Người duy nhất được tính chỉ số KPI/ROAS và truy cập kho Nguyên Liệu Tài Khoản.</div>
                    </div>

                    <!-- SECTION 2: MULTI REPORTERS CHECKBOXES SELECTOR -->
                    <div class="mkt-fg" style="background:#eff6ff;padding:12px;border-radius:10px;border:1.5px solid #93c5fd;">
                        <label style="color:#1e40af;font-weight:800;">📝 Nhân Viên Được Phép Báo Chi Phí (Có thể chọn nhiều người) *</label>
                        <div id="mktCatReportersBox" style="max-height:160px;overflow-y:auto;background:white;border:1px solid #bfdbfe;border-radius:8px;padding:8px 12px;margin-top:6px;display:flex;flex-direction:column;gap:6px;">
                            <!-- Populated dynamically with checkboxes -->
                        </div>
                        <div style="font-size:11px;color:#1e40af;margin-top:4px;">💡 Tích chọn danh sách các nhân viên Marketing được quyền khai báo chi phí cho Mục này.</div>
                    </div>

                    <div class="mkt-fg">
                        <label>Biểu Tượng Icon (Tùy chọn)</label>
                        <input type="text" id="mktCatIcon" class="mkt-input" placeholder="Vd: 📄, 🌐, 🎯">
                    </div>

                    <!-- FIXED SOURCE BINDING SELECTOR -->
                    <div id="mktCatSourceBox" class="mkt-fg" style="background:#f8fafc;padding:12px;border-radius:10px;border:1px solid #e2e8f0;">
                        <label style="color:#0369a1;font-weight:800;">🔗 Gắn Nguồn Khách Cố Định</label>
                        <select id="mktCatSourceSelect" class="mkt-select">
                            <!-- Populated dynamically -->
                        </select>
                        <div id="mktCatSourceNote" style="font-size:11px;color:#d97706;margin-top:6px;display:none;font-weight:700;">
                            🔒 <strong>Mục Lớn (Cấp Cha):</strong> Không chọn nguồn trực tiếp. Chỉ số Mục Lớn sẽ tự động bằng <strong>TỔNG CỦA CÁC MỤC CON</strong>.
                        </div>
                    </div>

                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;">
                        <div>
                            <button type="button" id="mktCatDeleteBtn" class="mkt-btn" style="display:none;background:#ef4444;color:white;font-weight:700;border:none;border-radius:10px;padding:10px 16px;cursor:pointer;transition:background 0.2s;" onclick="_mktDeleteCatCurrent();event.preventDefault();">🗑️ Xóa Mục</button>
                        </div>
                        <div style="display:flex;gap:10px;">
                            <button type="button" class="mkt-btn mkt-btn-secondary" data-no-debounce="true" onclick="_mktCloseCatModal();event.preventDefault();">Hủy</button>
                            <button type="submit" id="mktCatSubmitBtn" class="mkt-btn mkt-btn-primary">➕ Tạo Mục Mới</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL: CAMPAIGN CREATION FOR DIRECTOR -->
        <div id="mktCampaignModalOverlay" class="mkt-modal-overlay" style="display:none;" onclick="if(event.target===this)_mktCloseCampaignModal()">
            <div class="mkt-modal" style="width:540px;">
                <div class="mkt-modal-hdr" style="background:linear-gradient(135deg, #7c3aed, #6d28d9);color:white;padding:14px 20px;border-radius:14px 14px 0 0;">
                    <h3 style="margin:0;color:white;font-size:16px;">🎯 Tạo Chiến Dịch Marketing Mới (Dành Cho Giám Đốc)</h3>
                    <button type="button" class="mkt-modal-close" style="color:white;opacity:0.9;" onclick="_mktCloseCampaignModal()">✕</button>
                </div>
                <form id="mktCampaignForm" onsubmit="_mktSaveCampaign(event)" style="padding:20px;">
                    <input type="hidden" id="mktCampaignId" value="">

                    <div class="mkt-fg" style="background:#f3e8ff;padding:12px;border-radius:10px;border:1.5px solid #d8b4fe;">
                        <label style="color:#6b21a8;font-weight:800;">📌 Chọn Kênh / Mục Marketing Áp Dụng (Tùy chọn)</label>
                        <select id="mktCampaignCategory" class="mkt-select">
                            <!-- Populated dynamically -->
                        </select>
                        <span style="font-size:11px;color:#7e22ce;margin-top:2px;display:block;">Chọn Mục Marketing áp dụng cho chiến dịch này (hoặc áp dụng chung).</span>
                    </div>

                    <div class="mkt-fg">
                        <label style="font-weight:800;">🎯 Tên Chiến Dịch Marketing *</label>
                        <input type="text" id="mktCampaignName" class="mkt-input" required placeholder="Vd: Campaign Quảng Cáo Hè 2026 - Áo Thun">
                    </div>

                    <div class="mkt-fg">
                        <label style="font-weight:800;">📝 Mục Tiêu Chiến Dịch *</label>
                        <textarea id="mktCampaignTargetGoal" class="mkt-input" rows="3" required placeholder="Vd: Đạt 5.000 lead tin nhắn, doanh số kỳ vọng 1.2 tỷ VNĐ..."></textarea>
                    </div>

                    <div class="mkt-fg" style="background:#f0fdf4;padding:12px;border-radius:10px;border:1.5px solid #86efac;">
                        <label style="color:#166534;font-weight:800;">💰 Chi Phí / Ngân Sách Tối Đa Cho Phép (VNĐ) *</label>
                        <input type="number" id="mktCampaignMaxBudget" class="mkt-input" required min="1000" step="1000" placeholder="Vd: 50000000" style="font-size:16px;font-weight:800;color:#059669;">
                        <span style="font-size:11px;color:#15803d;margin-top:4px;display:block;">💡 Số tiền chi phí giới hạn tối đa. Nhân viên khai báo chi phí vượt quá số tiền này sẽ bị hệ thống KHÓA LẠI.</span>
                    </div>

                    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
                        <button type="button" class="mkt-btn mkt-btn-secondary" onclick="_mktCloseCampaignModal()">Hủy</button>
                        <button type="submit" class="mkt-btn mkt-btn-primary" style="background:linear-gradient(135deg, #7c3aed, #6d28d9);">💾 Lưu Cấu Hình Chiến Dịch</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL: DIRECTOR APPROVAL WITH TRANSFER BILL -->
        <div id="mktApproveModalOverlay" class="mkt-modal-overlay" style="display:none;" onclick="if(event.target===this)_mktCloseApproveModal()">
            <div class="mkt-modal" style="width:520px;">
                <div class="mkt-modal-hdr" style="background:linear-gradient(135deg, #059669, #047857);color:white;padding:14px 20px;border-radius:14px 14px 0 0;">
                    <h3 style="margin:0;color:white;font-size:16px;">✅ Duyệt Chi Phí Marketing & Gửi Bill (Giám Đốc)</h3>
                    <button type="button" class="mkt-modal-close" style="color:white;opacity:0.9;" onclick="_mktCloseApproveModal()">✕</button>
                </div>
                <form id="mktApproveForm" onsubmit="_mktConfirmApproveCost(event)" style="padding:20px;">
                    <input type="hidden" id="mktApproveCostId" value="">
                    
                    <div id="mktApproveCostInfo" style="background:#f0fdf4;padding:12px 14px;border-radius:10px;border:1.5px solid #86efac;margin-bottom:16px;font-size:13px;color:#166534;line-height:1.5;"></div>

                    <!-- CTRL + V PASTE DIRECTOR TRANSFER BILL -->
                    <div class="mkt-fg">
                        <label style="font-weight:800;font-size:12.5px;color:#166534;margin-bottom:6px;display:block;">
                            🧾 Ảnh Bill Tiền Chuyển Khoản / Thanh Toán Của Giám Đốc (Ctrl + V)
                        </label>
                        <div id="mktApproveImageDropArea" tabindex="0" style="border: 2px dashed #86efac; border-radius: 12px; padding: 16px; text-align: center; background: #f0fdf4; cursor: default; transition: all 0.2s; outline: none;" onpaste="_mktHandleApproveImagePaste(event)">
                            <div id="mktApproveImagePlaceholder">
                                <div style="font-size: 26px; margin-bottom: 4px;">🧾 💸</div>
                                <div style="font-size: 13.5px; font-weight: 800; color: #15803d;">Bấm <kbd style="background:#dcfce7;padding:2px 8px;border-radius:6px;font-family:monospace;font-size:13px;border:1px solid #86efac;color:#166534;">Ctrl + V</kbd> để dán ảnh bill chuyển khoản của Giám Đốc</div>
                                <div style="font-size: 11.5px; color: #166534; margin-top: 4px;">Hỗ trợ dán ảnh màn hình Banking, Zalo Pay, VietQR...</div>
                            </div>
                            <div id="mktApproveImagePreviewContainer" style="display:none; position:relative; text-align:center;">
                                <img id="mktApproveImagePreview" src="" style="max-height: 180px; max-width: 100%; border-radius: 10px; border: 1px solid #86efac; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                                <button type="button" onclick="event.stopPropagation(); _mktRemoveApproveImage();" style="position:absolute; top:-8px; right:-8px; background:#ef4444; color:white; border:none; border-radius:50%; width:24px; height:24px; font-size:12px; cursor:pointer; font-weight:bold; box-shadow:0 2px 6px rgba(0,0,0,0.2);">✕</button>
                            </div>
                            <input type="hidden" id="mktApproveImageUrl" value="">
                        </div>
                    </div>

                    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
                        <button type="button" class="mkt-btn mkt-btn-secondary" onclick="_mktCloseApproveModal()">Hủy</button>
                        <button type="submit" class="mkt-btn mkt-btn-primary" style="background:linear-gradient(135deg, #059669, #047857);">✅ Xác Nhận Duyệt Chi & Khóa Phiếu</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;

    await _mktInitData();
}

function _mkt2ColStyles() {
    return `
    <style>
        .mkt-container { display: flex; gap: 20px; min-height: calc(100vh - 120px); font-family: 'Inter', system-ui, sans-serif; }
        
        /* SIDEBAR MENU TREE */
        .mkt-sidebar { width: 320px; flex-shrink: 0; background: white; border-radius: 18px; padding: 18px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; height: fit-content; max-height: calc(100vh - 100px); overflow-y: auto; }
        .mkt-sb-header { padding-bottom: 14px; margin-bottom: 14px; border-bottom: 1.5px solid #f1f5f9; }
        .mkt-sb-title { font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        
        /* SPLIT YEAR SELECTOR BOX */
        .mkt-sb-year-box { display: flex; align-items: center; background: #eff6ff; border: 2px solid #2563eb; border-radius: 12px; overflow: hidden; transition: border-color .2s; }
        .mkt-sb-year-box:hover { border-color: #1d4ed8; }
        .mkt-sb-year-btn { flex: 1; padding: 10px 14px; border: none; background: transparent; font-size: 15px; font-weight: 800; color: #1e40af; cursor: pointer; text-align: left; transition: background .15s; }
        .mkt-sb-year-btn:hover { background: #dbeafe; }
        .mkt-sb-divider { width: 1.5px; height: 24px; background: #bfdbfe; }
        .mkt-sb-arrow-box { position: relative; width: 38px; height: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: transparent; transition: background .15s; }
        .mkt-sb-arrow-box:hover { background: #dbeafe; }
        .mkt-sb-arrow-select { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; z-index: 2; }
        .mkt-sb-arrow-icon { font-size: 13px; color: #2563eb; font-weight: 900; z-index: 1; pointer-events: none; }

        .mkt-sb-section-title { font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase; margin: 12px 0 8px 0; }
        
        /* Month accordion list */
        .mkt-month-item { margin-bottom: 8px; border: 1.5px solid #f1f5f9; border-radius: 12px; overflow: hidden; transition: all .2s; }
        .mkt-month-item.active { border-color: #2563eb; background: #faf5ff; }
        .mkt-month-hdr { padding: 10px 14px; font-size: 14px; font-weight: 800; color: #1e293b; display: flex; justify-content: space-between; align-items: center; cursor: pointer; background: #f8fafc; }
        .mkt-month-item.active .mkt-month-hdr { background: #2563eb; color: white; }
        .mkt-month-sub { padding: 8px 10px; display: none; background: white; }
        .mkt-month-item.active .mkt-month-sub { display: block; }
        
        /* Group Item (MKT Online / Offline) */
        .mkt-group-title { font-size: 12.5px; font-weight: 800; color: #0f172a; display: flex; justify-content: space-between; align-items: center; margin: 10px 0 6px 0; padding: 6px 8px; border-radius: 8px; background: #f1f5f9; cursor: pointer; }
        .mkt-group-title.selected { background: #e0e7ff; color: #3730a3; }
        .mkt-add-cat-btn { font-size: 11px; background: white; color: #2563eb; border: 1px solid #bfdbfe; padding: 2px 8px; border-radius: 6px; cursor: pointer; font-weight: 700; }
        .mkt-add-cat-btn:hover { background: #2563eb; color: white; }

        /* Parent Channel Item */
        .mkt-parent-item { padding: 7px 10px; font-size: 13px; font-weight: 800; color: #1e293b; border-radius: 8px; cursor: pointer; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between; gap: 6px; transition: all .15s; background: #f8fafc; }
        .mkt-parent-item:hover { background: #e0e7ff; color: #1e40af; }
        .mkt-parent-item.selected { background: #dbeafe; color: #1e40af; border-left: 4px solid #2563eb; }

        /* Child Channel Item (Indented) */
        .mkt-child-item { padding: 6px 10px 6px 22px; font-size: 12.5px; font-weight: 600; color: #475569; border-radius: 8px; cursor: pointer; margin-bottom: 3px; display: flex; align-items: center; justify-content: space-between; gap: 6px; transition: all .15s; position: relative; }
        .mkt-child-item::before { content: "└─"; font-size: 10px; color: #94a3b8; position: absolute; left: 8px; font-weight: 700; }
        .mkt-child-item:hover { background: #f1f5f9; color: #0f172a; }
        .mkt-child-item.selected { background: #e0f2fe; color: #0369a1; font-weight: 800; }

        .mkt-del-cat-btn { opacity: 0.3; background: none; border: none; font-size: 11px; cursor: pointer; padding: 2px 4px; border-radius: 4px; transition: all .15s; }
        .mkt-cat-item:hover .mkt-del-cat-btn, .mkt-parent-item:hover .mkt-del-cat-btn, .mkt-child-item:hover .mkt-del-cat-btn { opacity: 1; }
        .mkt-del-cat-btn:hover { background: #fee2e2; color: #dc2626; transform: scale(1.15); }

        /* MAIN CONTENT AREA */
        .mkt-main-content { flex: 1; min-width: 0; }
        .mkt-top-bar { background: white; padding: 16px 20px; border-radius: 18px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .mkt-breadcrumb { font-size: 15px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        
        /* INTERACTIVE BREADCRUMB BUTTON TAGS */
        .mkt-crumb-tag { background: #eff6ff; color: #2563eb; padding: 5px 12px; border-radius: 10px; font-size: 13px; font-weight: 800; cursor: pointer; user-select: none; transition: all 0.15s ease-in-out; border: 1px solid #bfdbfe; display: inline-flex; align-items: center; gap: 4px; }
        .mkt-crumb-tag:hover { background: #2563eb; color: white; border-color: #1d4ed8; box-shadow: 0 4px 12px rgba(37,99,235,0.25); transform: translateY(-1.5px); }
        .mkt-crumb-tag.active { background: #1e40af; color: white; border-color: #1e3a8a; box-shadow: 0 2px 8px rgba(30,64,175,0.3); }

        .mkt-btn { padding: 10px 18px; border-radius: 12px; font-weight: 800; font-size: 13.5px; cursor: pointer; border: none; transition: all .2s; display: inline-flex; align-items: center; gap: 6px; }
        .mkt-btn-primary { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; box-shadow: 0 4px 12px rgba(37,99,235,0.25); }
        .mkt-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(37,99,235,0.35); }
        .mkt-btn-secondary { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
        .mkt-btn-secondary:hover { background: #e2e8f0; }

        /* KPI Card Styling */
        .mkt-kpi-card { background: white; border-radius: 16px; padding: 16px 18px; box-shadow: 0 4px 18px rgba(0,0,0,0.04); border: 1px solid #e2e8f0; border-top: 4px solid #2563eb; transition: transform .2s, box-shadow .2s; }
        .mkt-kpi-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        .mkt-kpi-val { font-size: 22px; font-weight: 900; line-height: 1.25; margin-top: 6px; letter-spacing: -0.3px; }
        .mkt-kpi-lbl { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }

        /* Custom Instant Formula Tooltip */
        [data-tooltip] { position: relative; cursor: pointer !important; }
        [data-tooltip]::after {
            content: attr(data-tooltip);
            position: absolute;
            bottom: 110%;
            left: 50%;
            transform: translateX(-50%);
            background: #0f172a;
            color: #ffffff;
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 11.5px;
            font-weight: 700;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.15s ease-in-out;
            z-index: 9999;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
            border: 1px solid #334155;
        }
        [data-tooltip]::before {
            content: '';
            position: absolute;
            bottom: 95%;
            left: 50%;
            transform: translateX(-50%);
            border-width: 6px;
            border-style: solid;
            border-color: #0f172a transparent transparent transparent;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.15s ease-in-out;
            z-index: 9999;
        }
        [data-tooltip]:hover::after,
        [data-tooltip]:hover::before {
            opacity: 1;
        }

        /* Table panel */
        .mkt-card-panel { background: white; border-radius: 18px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; overflow: hidden; }
        .mkt-panel-hdr { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #f1f5f9; background: #f8fafc; }
        .mkt-panel-hdr h3 { margin: 0; font-size: 15px; font-weight: 800; color: #0f172a; }
        .mkt-tag { background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; }
        
        .mkt-table-wrap { overflow-x: auto; }
        .mkt-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
        .mkt-table th { background: #f8fafc; padding: 12px 14px; font-weight: 700; color: #475569; font-size: 12px; border-bottom: 1.5px solid #e2e8f0; white-space: nowrap; }
        .mkt-table td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; color: #1e293b; vertical-align: middle; }
        .mkt-table tr:hover td { background: #f8fafc; }

        .mkt-channel-cell { display: flex; flex-direction: column; gap: 3px; max-width: 320px; }
        .mkt-page-title-link { font-weight: 800; color: #2563eb; text-decoration: none; max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; }
        .mkt-page-title-link:hover { text-decoration: underline; color: #1d4ed8; }
        .mkt-channel-meta { font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .mkt-meta-badge { background: #f1f5f9; color: #475569; padding: 2px 7px; border-radius: 5px; font-weight: 600; }
        .mkt-meta-acc-link { color: #059669; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 1px 7px; border-radius: 5px; font-weight: 700; text-decoration: none; transition: all .15s; }
        .mkt-meta-acc-link:hover { background: #d1fae5; color: #047857; text-decoration: underline; }

        /* Modal Overlay */
        .mkt-modal-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(15,23,42,0.6); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
        .mkt-modal { background: white; border-radius: 20px; width: 620px; max-width: 92vw; padding: 24px; box-shadow: 0 25px 60px rgba(0,0,0,0.3); animation: mktFade .25s ease; }
        @keyframes mktFade { from { opacity:0; transform:translateY(15px); } to { opacity:1; transform:translateY(0); } }
        .mkt-modal-hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }
        .mkt-modal-hdr h3 { margin:0; font-size: 17px; font-weight: 800; color: #0f172a; }
        .mkt-modal-close { background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer; }
        .mkt-form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .mkt-fg { margin-bottom: 14px; }
        .mkt-fg label { font-size: 12.5px; font-weight: 700; color: #334155; margin-bottom: 6px; display: block; }
        .mkt-input, .mkt-select { width: 100%; padding: 10px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13.5px; outline: none; transition: border .2s; background: white; }
        .mkt-input:focus, .mkt-select:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
    </style>
    `;
}

async function _mktInitData() {
    try {
        const catRes = await apiCall('/api/marketing-categories');
        if (catRes.success) {
            _mktNavState.categories = catRes.data || [];
        }

        const spRes = await apiCall('/api/marketing-sources-and-pages');
        if (spRes.success) {
            _mktNavState.sources = spRes.sources || { nhu_cau: [], sale: [] };
            _mktNavState.pages = spRes.pages || [];
        }

        // Auto silent sync Meta Ads insights in background if Director
        if (_mktIsGiamDoc()) {
            apiCall('/api/marketing-budgets/sync-facebook-insights', 'POST', {
                year: _mktNavState.selectedYear,
                month: _mktNavState.selectedMonth,
                category_id: 'all'
            }).then(r => {
                if (r && r.success) {
                    _mktLoadBudgets();
                }
            }).catch(() => {});
        }
    } catch(e) {
        console.error('Error fetching MKT categories/sources/pages:', e);
    }
    _mktRenderSidebar();
    _mktLoadBudgets();
}

function _mktRenderSidebar() {
    const monthListEl = document.getElementById('mktMonthList');
    if (!monthListEl) return;

    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const categories = _mktNavState.categories || [];
    const isDirector = _mktIsGiamDoc();

    const onlineTopCats = categories.filter(c => c.group_type === 'online' && !c.parent_id);
    const offlineTopCats = categories.filter(c => c.group_type === 'offline' && !c.parent_id);

    monthListEl.innerHTML = months.map(m => {
        const isActiveMonth = m === _mktNavState.selectedMonth;
        return `
            <div class="mkt-month-item ${isActiveMonth ? 'active' : ''}">
                <div class="mkt-month-hdr" onclick="_mktSelectMonth(${m})">
                    <span>🗓️ Tháng ${m}</span>
                    <span>${isActiveMonth ? '▼' : '▶'}</span>
                </div>
                <div class="mkt-month-sub">
                    <!-- ALL IN MONTH -->
                    <div class="mkt-child-item ${_mktNavState.selectedGroup === 'all' && _mktNavState.selectedCatId === 'all' ? 'selected' : ''}" style="padding-left:10px;" onclick="_mktSelectNav('all', 'all')">
                        📊 Tất Cả Chi Phí Tháng ${m}
                    </div>

                    <!-- ONLINE GROUP -->
                    <div class="mkt-group-title ${_mktNavState.selectedGroup === 'online' && _mktNavState.selectedCatId === 'all' ? 'selected' : ''}" onclick="_mktSelectNav('online', 'all')">
                        <span>🌐 MKT Online</span>
                        ${isDirector ? `<button class="mkt-add-cat-btn" onclick="event.stopPropagation();_mktOpenCatModal('online')">➕ Tạo Mục</button>` : ''}
                    </div>
                    ${onlineTopCats.map(pCat => {
                        const childCats = categories.filter(c => Number(c.parent_id) === Number(pCat.id));
                        const isSelectedParent = Number(_mktNavState.selectedCatId) === Number(pCat.id);
                        return `
                            <div class="mkt-parent-item ${isSelectedParent ? 'selected' : ''}" onclick="_mktSelectNav('online', ${pCat.id})">
                                <div style="display:flex;flex-direction:column;min-width:0;flex:1;">
                                    <span style="display:flex;align-items:center;gap:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${pCat.icon || '📌'} ${pCat.name}</span>
                                    ${pCat.linked_source_name ? `<span style="font-size:10px;color:#0284c7;background:#e0f2fe;padding:1px 6px;border-radius:4px;font-weight:700;margin-top:2px;width:fit-content;">🔗 ${pCat.linked_source_name}</span>` : ''}
                                </div>
                                ${isDirector ? `
                                    <div style="display:flex;align-items:center;gap:3px;">
                                        <button class="mkt-add-cat-btn" style="padding:1px 5px;font-size:10px;" title="Tạo mục con cho ${pCat.name}" onclick="event.stopPropagation();_mktOpenCatModal('online', ${pCat.id})">➕</button>
                                        <button class="mkt-add-cat-btn" style="padding:1px 5px;font-size:10px;background:#f3e8ff;color:#7e22ce;border:1px solid #d8b4fe;" title="Sửa & Phân công nhân viên cho ${pCat.name.replace(/"/g, '&quot;')}" onclick="event.stopPropagation();_mktOpenEditCatModal(${pCat.id})">✏️</button>
                                    </div>
                                ` : ''}
                            </div>
                            <!-- CHILD CATEGORIES -->
                            ${childCats.map(cCat => {
                                const isSelectedChild = Number(_mktNavState.selectedCatId) === Number(cCat.id);
                                return `
                                    <div class="mkt-child-item ${isSelectedChild ? 'selected' : ''}" onclick="_mktSelectNav('online', ${cCat.id})">
                                        <div style="display:flex;flex-direction:column;min-width:0;flex:1;">
                                            <span style="display:flex;align-items:center;gap:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${cCat.icon || '📄'} ${cCat.name}</span>
                                            ${cCat.linked_source_name ? `<span style="font-size:9.5px;color:#0369a1;background:#e0f2fe;padding:1px 5px;border-radius:4px;font-weight:700;margin-top:2px;width:fit-content;">🔗 ${cCat.linked_source_name}</span>` : ''}
                                            ${cCat.ads_handler_name ? `<span onclick="event.stopPropagation();_mktOpenResourceModal('${cCat.ads_handler_name.replace(/'/g, "\\'")}')" style="font-size:9px;color:#7c3aed;font-weight:700;cursor:pointer;background:#f3e8ff;padding:1px 6px;border-radius:4px;border:1px solid #d8b4fe;display:inline-flex;align-items:center;gap:3px;margin-top:2px;width:fit-content;" title="Click để xem Nguyên Liệu Tài Khoản của ${cCat.ads_handler_name}">👤 ${cCat.ads_handler_name} 📝</span>` : ''}
                                        </div>
                                        ${isDirector ? `
                                            <div style="display:flex;align-items:center;gap:3px;">
                                                <button class="mkt-add-cat-btn" style="padding:1px 4px;font-size:10px;background:#f3e8ff;color:#7e22ce;border:1px solid #d8b4fe;" title="Sửa & Phân công nhân viên cho ${cCat.name.replace(/"/g, '&quot;')}" onclick="event.stopPropagation();_mktOpenEditCatModal(${cCat.id})">✏️</button>
                                            </div>
                                        ` : ''}
                                    </div>
                                `;
                            }).join('')}
                        `;
                    }).join('')}

                    <!-- OFFLINE GROUP -->
                    <div class="mkt-group-title ${_mktNavState.selectedGroup === 'offline' && _mktNavState.selectedCatId === 'all' ? 'selected' : ''}" onclick="_mktSelectNav('offline', 'all')">
                        <span>🏢 MKT Offline</span>
                        ${isDirector ? `<button class="mkt-add-cat-btn" onclick="event.stopPropagation();_mktOpenCatModal('offline')">➕ Tạo Mục</button>` : ''}
                    </div>
                    ${offlineTopCats.map(pCat => {
                        const childCats = categories.filter(c => Number(c.parent_id) === Number(pCat.id));
                        const isSelectedParent = Number(_mktNavState.selectedCatId) === Number(pCat.id);
                        return `
                            <div class="mkt-parent-item ${isSelectedParent ? 'selected' : ''}" onclick="_mktSelectNav('offline', ${pCat.id})">
                                <div style="display:flex;flex-direction:column;min-width:0;flex:1;">
                                    <span style="display:flex;align-items:center;gap:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${pCat.icon || '📌'} ${pCat.name}</span>
                                    ${pCat.linked_source_name ? `<span style="font-size:10px;color:#0284c7;background:#e0f2fe;padding:1px 6px;border-radius:4px;font-weight:700;margin-top:2px;width:fit-content;">🔗 ${pCat.linked_source_name}</span>` : ''}
                                </div>
                                ${isDirector ? `
                                    <div style="display:flex;align-items:center;gap:3px;">
                                        <button class="mkt-add-cat-btn" style="padding:1px 5px;font-size:10px;" title="Tạo mục con cho ${pCat.name}" onclick="event.stopPropagation();_mktOpenCatModal('offline', ${pCat.id})">➕</button>
                                        <button class="mkt-add-cat-btn" style="padding:1px 5px;font-size:10px;background:#f3e8ff;color:#7e22ce;border:1px solid #d8b4fe;" title="Sửa & Phân công nhân viên cho ${pCat.name.replace(/"/g, '&quot;')}" onclick="event.stopPropagation();_mktOpenEditCatModal(${pCat.id})">✏️</button>
                                    </div>
                                ` : ''}
                            </div>
                            <!-- CHILD CATEGORIES -->
                            ${childCats.map(cCat => {
                                const isSelectedChild = Number(_mktNavState.selectedCatId) === Number(cCat.id);
                                return `
                                    <div class="mkt-child-item ${isSelectedChild ? 'selected' : ''}" onclick="_mktSelectNav('offline', ${cCat.id})">
                                        <div style="display:flex;flex-direction:column;min-width:0;flex:1;">
                                            <span style="display:flex;align-items:center;gap:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${cCat.icon || '📄'} ${cCat.name}</span>
                                            ${cCat.linked_source_name ? `<span style="font-size:9.5px;color:#0369a1;background:#e0f2fe;padding:1px 5px;border-radius:4px;font-weight:700;margin-top:2px;width:fit-content;">🔗 ${cCat.linked_source_name}</span>` : ''}
                                        </div>
                                        ${isDirector ? `
                                            <div style="display:flex;align-items:center;gap:3px;">
                                                <button class="mkt-add-cat-btn" style="padding:1px 4px;font-size:10px;background:#f3e8ff;color:#7e22ce;border:1px solid #d8b4fe;" title="Sửa & Phân công nhân viên cho ${cCat.name.replace(/"/g, '&quot;')}" onclick="event.stopPropagation();_mktOpenEditCatModal(${cCat.id})">✏️</button>
                                            </div>
                                        ` : ''}
                                    </div>
                                `;
                            }).join('')}
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function _mktSelectYearAll() {
    _mktNavState.selectedMonth = 'all';
    _mktNavState.selectedGroup = 'all';
    _mktNavState.selectedCatId = 'all';
    _mktRenderSidebar();
    _mktLoadBudgets();
}

function _mktOnYearChange(yr) {
    _mktNavState.selectedYear = Number(yr);
    const txtEl = document.getElementById('mktYearBtnTxt');
    if (txtEl) txtEl.textContent = `📅 Năm ${yr}`;
    _mktLoadBudgets();
}

function _mktSelectMonth(m) {
    _mktNavState.selectedMonth = Number(m);
    _mktRenderSidebar();
    _mktLoadBudgets();
}

function _mktSelectNav(group, catId) {
    _mktNavState.selectedGroup = group;
    _mktNavState.selectedCatId = catId;
    _mktRenderSidebar();
    _mktLoadBudgets();
}

function _mktSetViewType(type) {
    _mktNavState.viewType = type;
    _mktUpdateViewTypeButtons();
    _mktLoadBudgets();
}

function _mktUpdateViewTypeButtons() {
    const btnDaily = document.getElementById('mktViewBtnDaily');
    const btnMonthly = document.getElementById('mktViewBtnMonthly');
    if (!btnDaily || !btnMonthly) return;

    if (_mktNavState.viewType === 'daily') {
        btnDaily.className = 'mkt-btn mkt-btn-primary';
        btnMonthly.className = 'mkt-btn mkt-btn-secondary';
    } else {
        btnDaily.className = 'mkt-btn mkt-btn-secondary';
        btnMonthly.className = 'mkt-btn mkt-btn-primary';
    }
}

async function _mktLoadBudgets() {
    _mktUpdateBreadcrumb();
    _mktUpdateViewTypeButtons();

    const tbody = document.getElementById('mktTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:40px;color:#94a3b8;">⏳ Đang tải dữ liệu chi phí...</td></tr>';

    try {
        let url = `/api/marketing-budgets?year=${_mktNavState.selectedYear}&view_type=${_mktNavState.viewType}`;
        if (_mktNavState.selectedMonth !== 'all') {
            url += `&month=${_mktNavState.selectedMonth}`;
        }
        if (_mktNavState.selectedGroup !== 'all') {
            url += `&group_type=${_mktNavState.selectedGroup}`;
        }
        if (_mktNavState.selectedCatId !== 'all') {
            url += `&category_id=${_mktNavState.selectedCatId}`;
        }

        const res = await apiCall(url);
        if (res.success) {
            _mktNavState.budgetsData = res.data || [];
            _mktNavState.summary = res.summary || {};
            _mktRenderKpiCards(res.summary);
            _mktRenderTable(res.data);
        }
    } catch(e) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:40px;color:#ef4444;">❌ Lỗi: ${e.message}</td></tr>`;
    }
}

// FULLY CLICKABLE & INTERACTIVE BREADCRUMB BAR (ANH 2)
function _mktUpdateBreadcrumb() {
    const el = document.getElementById('mktBreadcrumb');
    if (!el) return;

    const isYearOnly = _mktNavState.selectedMonth === 'all';
    const yearTag = `<span class="mkt-crumb-tag ${isYearOnly ? 'active' : ''}" onclick="_mktSelectYearAll()" title="Click để xem tất cả dữ liệu Năm ${_mktNavState.selectedYear}">📅 Năm ${_mktNavState.selectedYear}</span>`;
    
    let monthTag = '';
    if (_mktNavState.selectedMonth === 'all') {
        monthTag = ` > <span class="mkt-crumb-tag" onclick="_mktSelectNav('all', 'all')" title="Xem tất cả các tháng">🗓️ Tất Cả Các Tháng</span>`;
    } else {
        monthTag = ` > <span class="mkt-crumb-tag" onclick="_mktSelectNav('all', 'all')" title="Click để xem tất cả dữ liệu Tháng ${_mktNavState.selectedMonth}/${_mktNavState.selectedYear}">🗓️ Tháng ${_mktNavState.selectedMonth}</span>`;
    }

    let groupLabel = 'Tất Cả';
    let groupOnClick = `_mktSelectNav('all', 'all')`;
    let isGroupActive = _mktNavState.selectedCatId === 'all';

    if (_mktNavState.selectedGroup === 'online') {
        groupLabel = '🌐 MKT Online';
        groupOnClick = `_mktSelectNav('online', 'all')`;
    } else if (_mktNavState.selectedGroup === 'offline') {
        groupLabel = '🏢 MKT Offline';
        groupOnClick = `_mktSelectNav('offline', 'all')`;
    }

    const groupTag = `<span class="mkt-crumb-tag ${isGroupActive && _mktNavState.selectedGroup !== 'all' ? 'active' : ''}" onclick="${groupOnClick}" title="Click để hiển thị toàn bộ dữ liệu ${groupLabel}">${groupLabel}</span>`;

    let catLabel = '';
    if (_mktNavState.selectedCatId !== 'all') {
        const cat = _mktNavState.categories.find(c => Number(c.id) === Number(_mktNavState.selectedCatId));
        if (cat) {
            if (cat.parent_id) {
                const pCat = _mktNavState.categories.find(p => Number(p.id) === Number(cat.parent_id));
                const parentTag = pCat ? ` > <span class="mkt-crumb-tag" onclick="_mktSelectNav('${_mktNavState.selectedGroup}', ${pCat.id})" title="Click để xem toàn bộ dữ liệu thuộc ${pCat.name}">${pCat.icon || '📂'} ${pCat.name}</span>` : '';
                catLabel = `${parentTag} > <span class="mkt-crumb-tag active" onclick="_mktSelectNav('${_mktNavState.selectedGroup}', ${cat.id})" title="Đang xem chi tiết kênh ${cat.name}">${cat.icon || '📌'} ${cat.name}</span>`;
            } else {
                catLabel = ` > <span class="mkt-crumb-tag active" onclick="_mktSelectNav('${_mktNavState.selectedGroup}', ${cat.id})" title="Đang xem toàn bộ dữ liệu thuộc ${cat.name}">${cat.icon || '📌'} ${cat.name}</span>`;
            }
            if (cat.parent_id && !cat.linked_source_name) {
                catLabel += ` <span style="font-size:11px;color:#d97706;background:#fffbeb;padding:2px 8px;border-radius:6px;font-weight:700;border:1px solid #fde68a;" title="Mục con này chưa cài đặt Nguồn Quảng Cáo liên kết (Nhấn ✏️ để cài đặt)">⚠️ Chưa cài Nguồn Liên Kết</span>`;
            }
        }
    }

    el.innerHTML = `${yearTag}${monthTag} > ${groupTag}${catLabel}`;
}

function _mktRenderKpiCards(s) {
    const el = document.getElementById('mktKpiCards');
    if (!el) return;
    s = s || {};

    const totalSpent = Number(s.totalSpent || 0);
    const totalLeads = Number(s.totalLeads || 0);
    const totalOrders = Number(s.totalOrders || 0);
    const totalRevenue = Number(s.totalRevenue || 0);
    const avgCpl = Number(s.avgCpl || 0);
    const roas = Number(s.roas || 0);
    const costPerOrder = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0;
    const costIncomeRatio = totalRevenue > 0 ? (totalSpent / totalRevenue * 100).toFixed(2) : '0.00';
    const closeRate = totalLeads > 0 ? (totalOrders / totalLeads * 100).toFixed(2) : '0.00';

    const periodText = _mktNavState.selectedMonth === 'all' 
        ? `Năm ${_mktNavState.selectedYear}` 
        : `Tháng ${_mktNavState.selectedMonth}/${_mktNavState.selectedYear}`;

    const titleOrders = `${totalOrders.toLocaleString('vi-VN')} Đơn hàng chốt thành công trong ${periodText}`;
    const titleRevenue = `${_mktFmt(totalRevenue)} Doanh số thu về trong ${periodText}`;
    const titleCostRatio = `${_mktFmt(totalSpent)} Chi phí MKT / ${_mktFmt(totalRevenue)} Doanh số = ${costIncomeRatio}%`;
    const titleCpo = `${_mktFmt(totalSpent)} Chi phí MKT / ${totalOrders} Đơn = ${costPerOrder > 0 ? _mktFmt(costPerOrder) : '0đ'}`;
    const titleSpent = `${_mktFmt(totalSpent)} Chi phí MKT đã thực chi trong ${periodText}`;
    const titleLeads = `${totalLeads.toLocaleString('vi-VN')} Khách (Tin Nhắn) trong ${periodText}`;
    const titleCpl = `${_mktFmt(totalSpent)} Chi phí MKT / ${totalLeads} Tin Nhắn = ${_mktFmt(avgCpl)}`;
    const titleCloseRate = `${totalOrders} Đơn / ${totalLeads} Tin Nhắn = ${closeRate}%`;

    el.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:14px;grid-column:1/-1;">
            <!-- HÀNG 1: 4 Ô THỐNG KÊ (Đơn Hàng | Doanh Số | % Chi Phí/Doanh Thu | Giá/Đơn) -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:14px;">
                <div class="mkt-kpi-card" onclick="_mktOpenOrdersModal()" data-tooltip="${titleOrders}" title="${titleOrders}" style="border-top-color:#2563eb;background:linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);cursor:pointer;transition:transform 0.2s;">
                    <div class="mkt-kpi-lbl" style="display:flex;justify-content:space-between;align-items:center;">
                        <span>📦 TỔNG SỐ ĐƠN HÀNG</span>
                        <span style="font-size:10px;color:#2563eb;background:#dbeafe;padding:1px 6px;border-radius:4px;font-weight:700;">Xem chi tiết 🔍</span>
                    </div>
                    <div class="mkt-kpi-val" style="color:#2563eb;">${totalOrders.toLocaleString('vi-VN')} <span style="font-size:13px;font-weight:600">đơn</span></div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px;">Phát sinh trong ${periodText}</div>
                </div>
                <div class="mkt-kpi-card" onclick="_mktOpenOrdersModal()" data-tooltip="${titleRevenue}" title="${titleRevenue}" style="border-top-color:#0284c7;background:linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%);cursor:pointer;transition:transform 0.2s;">
                    <div class="mkt-kpi-lbl" style="display:flex;justify-content:space-between;align-items:center;">
                        <span>💰 DOANH SỐ MKT</span>
                        <span style="font-size:10px;color:#0284c7;background:#e0e7ff;padding:1px 6px;border-radius:4px;font-weight:700;">Xem chi tiết 🔍</span>
                    </div>
                    <div class="mkt-kpi-val" style="color:#0284c7;">${_mktFmt(totalRevenue)}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px;">Doanh số thu về</div>
                </div>
                <div class="mkt-kpi-card" data-tooltip="${titleCostRatio}" title="${titleCostRatio}" style="border-top-color:#4f46e5;background:linear-gradient(180deg, #eef2ff 0%, #ffffff 100%);">
                    <div class="mkt-kpi-lbl">📉 % CHI PHÍ / DOANH THU</div>
                    <div class="mkt-kpi-val" style="color:#4f46e5;">${costIncomeRatio}%</div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px;">Tỷ lệ chi phí MKT / doanh thu</div>
                </div>
                <div class="mkt-kpi-card" data-tooltip="${titleCpo}" title="${titleCpo}" style="border-top-color:#dc2626;background:linear-gradient(180deg, #fef2f2 0%, #ffffff 100%);">
                    <div class="mkt-kpi-lbl">🎯 GIÁ / ĐƠN (CPO)</div>
                    <div class="mkt-kpi-val" style="color:#dc2626;">${costPerOrder > 0 ? _mktFmt(costPerOrder) : '—'}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px;">Chi phí thực tế / 1 đơn</div>
                </div>
            </div>

            <!-- HÀNG 2: 4 Ô THỐNG KÊ (Thực Chi | Lead | CPL | Tỷ Lệ Chốt) -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:14px;">
                <div class="mkt-kpi-card" data-tooltip="${titleSpent}" title="${titleSpent}" style="border-top-color:#059669;background:linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%);">
                    <div class="mkt-kpi-lbl">💸 THỰC CHI MARKETING</div>
                    <div class="mkt-kpi-val" style="color:#059669;">${_mktFmt(totalSpent)}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px;">${periodText}</div>
                </div>
                <div class="mkt-kpi-card" data-tooltip="${titleLeads}" title="${titleLeads}" style="border-top-color:#d97706;background:linear-gradient(180deg, #fffbeb 0%, #ffffff 100%);">
                    <div class="mkt-kpi-lbl">📥 TỔNG SỐ LEAD (TIN NHẮN)</div>
                    <div class="mkt-kpi-val" style="color:#d97706;">${totalLeads.toLocaleString('vi-VN')} <span style="font-size:13px;font-weight:600">khách</span></div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px;">Theo bộ lọc đang chọn</div>
                </div>
                <div class="mkt-kpi-card" data-tooltip="${titleCpl}" title="${titleCpl}" style="border-top-color:#7c3aed;background:linear-gradient(180deg, #f3e8ff 0%, #ffffff 100%);">
                    <div class="mkt-kpi-lbl">📊 CPL (GIÁ / LEAD)</div>
                    <div class="mkt-kpi-val" style="color:#7c3aed;">${_mktFmt(avgCpl)}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px;">Chi phí / 1 tin nhắn</div>
                </div>
                <div class="mkt-kpi-card" data-tooltip="${titleCloseRate}" title="${titleCloseRate}" style="border-top-color:#0891b2;background:linear-gradient(180deg, #ecfeff 0%, #ffffff 100%);">
                    <div class="mkt-kpi-lbl">🎯 TỶ LỆ CHỐT (DATA CHẤT)</div>
                    <div class="mkt-kpi-val" style="color:#0891b2;">${closeRate}%</div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px;">Tổng số đơn / tổng số lead (tin nhắn)</div>
                </div>
            </div>
        </div>
    `;
}

window._mktOpenOrdersModal = async function() {
    let modal = document.getElementById('mktOrdersModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'mktOrdersModal';
        modal.className = 'mkt-modal-overlay';
        modal.style.zIndex = '99999';
        modal.innerHTML = `
            <div class="mkt-modal" style="width:1100px;max-width:96vw;max-height:92vh;padding:24px;">
                <div class="mkt-modal-hdr" style="border-bottom:2px solid #e2e8f0;padding-bottom:14px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <h3 style="font-size:18px;color:#0f172a;margin:0;display:flex;align-items:center;gap:8px;">📦 Danh Sách Đơn Hàng Marketing (First-Touch)</h3>
                        <div id="mktOrdersModalSub" style="font-size:12px;color:#64748b;margin-top:2px;font-weight:600;"></div>
                    </div>
                    <button class="mkt-btn mkt-btn-secondary" style="padding:4px 10px;font-size:16px;border-radius:8px;cursor:pointer;" onclick="document.getElementById('mktOrdersModal').style.display='none'">✕</button>
                </div>

                <!-- Control & Filter Bar -->
                <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
                    <div id="mktOrdersSummaryStats" style="display:flex;gap:10px;align-items:center;font-size:13px;font-weight:700;flex-wrap:wrap;"></div>
                    <div id="mktOrdersFilterContainer" style="display:flex;align-items:center;gap:8px;"></div>
                </div>

                <!-- Table Scroll Wrap -->
                <div id="mktOrdersTableContainer" style="overflow-y:auto;max-height:60vh;border-radius:12px;">
                    <div style="text-align:center;padding:40px;color:#64748b;font-weight:700;">
                        ⏳ Đang truy vấn danh sách đơn hàng...
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const subEl = modal.querySelector('#mktOrdersModalSub');
    const statsEl = modal.querySelector('#mktOrdersSummaryStats');
    const filterEl = modal.querySelector('#mktOrdersFilterContainer');
    const tableEl = modal.querySelector('#mktOrdersTableContainer');

    modal.style.setProperty('display', 'flex', 'important');
    if (tableEl) tableEl.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b;font-weight:700;">⏳ Đang tải danh sách đơn hàng chốt thành công từ Quảng Cáo...</div>';

    try {
        let url = `/api/marketing-budgets/first-touch-orders?year=${_mktNavState.selectedYear}`;
        if (_mktNavState.selectedMonth !== 'all') url += `&month=${_mktNavState.selectedMonth}`;
        if (_mktNavState.selectedGroup !== 'all') url += `&group_type=${_mktNavState.selectedGroup}`;
        if (_mktNavState.selectedCatId !== 'all') url += `&category_id=${_mktNavState.selectedCatId}`;

        const res = await apiCall(url);
        if (res.success && Array.isArray(res.orders)) {
            const allOrders = res.orders;
            const periodTxt = _mktNavState.selectedMonth === 'all' 
                ? `Cả Năm ${_mktNavState.selectedYear}` 
                : `Tháng ${_mktNavState.selectedMonth}/${_mktNavState.selectedYear}`;

            if (subEl) subEl.textContent = `Báo cáo Đơn hàng First-Touch • ${periodTxt}`;

            if (allOrders.length === 0) {
                if (statsEl) statsEl.innerHTML = '';
                if (filterEl) filterEl.innerHTML = '';
                if (tableEl) tableEl.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:14px;font-weight:600;">📭 Chưa có đơn hàng Marketing nào được ghi nhận cho bộ lọc đang chọn.</div>';
                return;
            }

            // Extract unique sources for filter dropdown
            const uniqueSources = Array.from(new Set(allOrders.map(o => (o.source || '').trim()).filter(Boolean))).sort();

            if (filterEl) {
                filterEl.innerHTML = `
                    <label style="font-size:12.5px;font-weight:800;color:#334155;white-space:nowrap;display:flex;align-items:center;gap:4px;">🎯 Lọc Nguồn Quảng Cáo:</label>
                    <select id="mktOrdersSourceSelect" style="padding:6px 12px;border-radius:8px;border:1.5px solid #cbd5e1;font-weight:700;font-size:12.5px;color:#0f172a;background:white;cursor:pointer;outline:none;box-shadow:0 2px 5px rgba(0,0,0,0.04);">
                        <option value="all">🌐 Tất cả nguồn (${allOrders.length} đơn)</option>
                        ${uniqueSources.map(s => `<option value="${escapeHtml(s)}">📍 ${escapeHtml(s)}</option>`).join('')}
                    </select>
                `;

                const selectEl = filterEl.querySelector('#mktOrdersSourceSelect');
                if (selectEl) {
                    selectEl.onchange = (e) => renderFilteredOrders(e.target.value);
                }
            }

            function renderFilteredOrders(selectedSource) {
                const filtered = selectedSource && selectedSource !== 'all'
                    ? allOrders.filter(o => (o.source || '').trim() === selectedSource)
                    : allOrders;

                const totalOrdersCount = filtered.length;
                const totalQty = filtered.reduce((acc, o) => acc + Number(o.total_quantity || 0), 0);
                const totalDep = filtered.reduce((acc, o) => acc + Number(o.deposit_amount || 0), 0);
                const totalRev = filtered.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);

                if (statsEl) {
                    statsEl.innerHTML = `
                        <span style="color:#2563eb;background:#eff6ff;padding:4px 10px;border-radius:8px;border:1px solid #bfdbfe;">📦 Tổng đơn: <b>${totalOrdersCount} đơn</b></span>
                        <span style="color:#059669;background:#f0fdf4;padding:4px 10px;border-radius:8px;border:1px solid #bbf7d0;">👔 Tổng SL: <b>${totalQty.toLocaleString('vi-VN')} sp</b></span>
                        <span style="color:#d97706;background:#fffbeb;padding:4px 10px;border-radius:8px;border:1px solid #fde68a;">💵 Tổng cọc: <b>${_mktFmt(totalDep)}</b></span>
                        <span style="color:#7c3aed;background:#f3e8ff;padding:4px 10px;border-radius:8px;border:1px solid #ddd6fe;">💰 Doanh số MKT: <b>${_mktFmt(totalRev)}</b></span>
                    `;
                }

                if (filtered.length === 0) {
                    if (tableEl) tableEl.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:14px;font-weight:600;">📭 Không tìm thấy đơn hàng nào thuộc nguồn đã chọn.</div>';
                    return;
                }

                let rowsHtml = filtered.map((o, idx) => {
                    const timeDisp = (o.order_time_str || o.dt_str || '').replace(' 00:00', '');
                    return `
                    <tr style="border-bottom:1px solid #e2e8f0;transition:background 0.15s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'">
                        <td style="padding:11px 12px;text-align:center;font-weight:700;color:#64748b;font-size:12px;">${idx + 1}</td>
                        <td style="padding:11px 12px;font-weight:700;color:#334155;font-size:12.5px;white-space:nowrap;">🕒 ${timeDisp}</td>
                        <td style="padding:11px 12px;font-weight:800;color:#2563eb;font-family:monospace;font-size:13px;white-space:nowrap;">
                            <span style="background:#eff6ff;padding:3px 8px;border-radius:6px;border:1px solid #bfdbfe;">${o.order_code}</span>
                        </td>
                        <td style="padding:11px 12px;font-weight:800;color:#0f172a;font-size:13px;">${escapeHtml(o.customer_name)}</td>
                        <td style="padding:11px 12px;font-weight:700;color:#475569;font-size:12.5px;">👤 ${escapeHtml(o.sale_name)}</td>
                        <td style="padding:11px 12px;font-size:12px;">
                            <span style="background:#e0f2fe;color:#0369a1;padding:3px 8px;border-radius:6px;font-weight:700;border:1px solid #bae6fd;white-space:nowrap;">📍 ${escapeHtml(o.source)}</span>
                        </td>
                        <td style="padding:11px 12px;text-align:center;font-weight:800;color:#059669;font-size:13px;">${Number(o.total_quantity || 0).toLocaleString('vi-VN')}</td>
                        <td style="padding:11px 12px;text-align:right;font-weight:800;color:#d97706;font-size:13px;">${Number(o.deposit_amount) > 0 ? _mktFmt(o.deposit_amount) : '—'}</td>
                        <td style="padding:11px 12px;text-align:right;font-weight:900;color:#2563eb;font-size:14px;">${_mktFmt(o.total_amount)}</td>
                    </tr>
                `}).join('');

                if (tableEl) {
                    tableEl.innerHTML = `
                        <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.03);">
                            <table class="mkt-table" style="width:100%;border-collapse:collapse;background:white;">
                                <thead>
                                    <tr style="background:#1e293b;border-bottom:2px solid #0f172a;">
                                        <th style="padding:12px;text-align:center;width:40px;color:#ffffff;font-weight:800;font-size:13px;">#</th>
                                        <th style="padding:12px;color:#ffffff;font-weight:800;font-size:13px;">Thời Gian Chốt</th>
                                        <th style="padding:12px;color:#ffffff;font-weight:800;font-size:13px;">Mã Đơn</th>
                                        <th style="padding:12px;color:#ffffff;font-weight:800;font-size:13px;">Tên Khách Hàng</th>
                                        <th style="padding:12px;color:#ffffff;font-weight:800;font-size:13px;">NVKD / Sale</th>
                                        <th style="padding:12px;color:#ffffff;font-weight:800;font-size:13px;">Nguồn Quảng Cáo</th>
                                        <th style="padding:12px;text-align:center;color:#ffffff;font-weight:800;font-size:13px;">Tổng SL</th>
                                        <th style="padding:12px;text-align:right;color:#ffffff;font-weight:800;font-size:13px;">Đặt Cọc</th>
                                        <th style="padding:12px;text-align:right;color:#ffffff;font-weight:800;font-size:13px;">Doanh Số</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rowsHtml}
                                </tbody>
                            </table>
                        </div>
                    `;
                }
            }

            renderFilteredOrders('all');
        }
    } catch(e) {
        if (tableEl) tableEl.innerHTML = `<div style="text-align:center;padding:30px;color:#ef4444;font-weight:700;">❌ Lỗi nạp danh sách đơn hàng: ${e.message}</div>`;
    }
};

// Helper formatting date to: "Thứ 4 - 01/07/26"
function _mktFmtDateWithDay(dateStr) {
    return _mktFmtDayOfWeek(dateStr);
}

function _mktFmtDayOfWeek(dateStr) {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dt = new Date(y, m, d);
    
    if (isNaN(dt.getTime())) return dateStr;

    const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayName = days[dt.getDay()] || '';
    const yy = parts[0].slice(-2);
    
    return `${dayName} - ${parts[2]}/${parts[1]}/${yy}`;
}

function _mktFmtDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
}

window._mktViewFullImage = function(url) {
    if (!url) return;
    let modal = document.getElementById('mktImageLightboxOverlay');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'mktImageLightboxOverlay';
        modal.className = 'mkt-modal-overlay';
        modal.style.zIndex = '99999';
        modal.onclick = function() { modal.style.display = 'none'; };
        modal.innerHTML = `
            <div style="position:relative;max-width:90vw;max-height:90vh;background:white;padding:12px;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,0.3);" onclick="event.stopPropagation()">
                <button type="button" style="position:absolute;top:-12px;right:-12px;background:#ef4444;color:white;border:none;border-radius:50%;width:30px;height:30px;font-weight:bold;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.2);" onclick="document.getElementById('mktImageLightboxOverlay').style.display='none'">✕</button>
                <img id="mktImageLightboxImg" src="" style="max-width:85vw;max-height:80vh;border-radius:8px;object-fit:contain;display:block;">
            </div>
        `;
        document.body.appendChild(modal);
    }
    const img = modal.querySelector('#mktImageLightboxImg');
    if (img) img.src = url;
    modal.style.setProperty('display', 'flex', 'important');
};

async function _mktEditCostItem(id) {
    const dataList = _mktNavState.budgetsData || [];
    const item = dataList.find(b => Number(b.id) === Number(id));
    if (!item) {
        showToast('⚠️ Không tìm thấy thông tin khoản chi cần sửa!', 'error');
        return;
    }
    _mktOpenCostModal(item);
}

async function _mktDeleteCostItem(id) {
    const dataList = _mktNavState.budgetsData || [];
    const item = dataList.find(b => Number(b.id) === Number(id));
    const notesTxt = item && item.notes ? item.notes : `#${id}`;

    if (!confirm(`⚠️ XÁC NHẬN XÓA PHIẾU CHI MARKETING:\n\nBạn có chắc chắn muốn XÓA khoản chi: "${notesTxt}" không?\n\n(Hành động này sẽ xóa vĩnh viễn phiếu chi khỏi hệ thống)`)) {
        return;
    }

    try {
        const res = await apiCall(`/api/marketing-budgets/${id}`, 'DELETE');
        if (res.success) {
            showToast('✅ Đã xóa khoản chi phí Marketing thành công!', 'success');
            _mktLoadBudgets();
        }
    } catch(err) {
        showToast('❌ Lỗi khi xóa chi phí: ' + err.message, 'error');
    }
}

function _mktIsUserDirectorOrManager() {
    const u = typeof currentUser !== 'undefined' ? currentUser : (window.currentUser || {});
    if (!u) return false;
    if (u.role === 'giam_doc' || u.role === 'admin' || u.role === 'quan_ly_cap_cao' || u.role === 'quan_ly' || u.username === 'admin') return true;
    const name = (u.full_name || u.name || '').toLowerCase();
    if (name.includes('giám đốc') || name.includes('giam doc') || name.includes('admin')) return true;
    return false;
}

function _mktUpdateCostAddButtonVisibility() {
    const btn = document.getElementById('mktCostAddBtn');
    const directorBtn = document.getElementById('mktDirectorCampaignBtn');
    const isManager = _mktIsUserDirectorOrManager();

    if (directorBtn) {
        const canCreateCampaign = isManager && _mktNavState.selectedCatId && _mktNavState.selectedCatId !== 'all';
        directorBtn.style.display = canCreateCampaign ? 'inline-flex' : 'none';
    }

    if (!btn) return;
    if (isManager) {
        btn.style.display = 'inline-flex';
        return;
    }

    const user = typeof currentUser !== 'undefined' ? currentUser : (window.currentUser || {});
    const userName = (user.full_name || user.name || user.username || '').toLowerCase().trim();
    if (!userName) {
        btn.style.display = 'none';
        return;
    }

    const allCategories = _mktNavState.categories || [];

    function isUserAllowedForCat(c) {
        if (!c) return false;
        const h = (c.ads_handler_name || '').toLowerCase().trim();
        const rep = (c.allowed_reporter_names || '').toLowerCase().trim();
        const isHandler = Boolean(h && (h.includes(userName) || userName.includes(h)));
        const isReporter = Boolean(rep && rep.includes(userName));
        return isHandler || isReporter;
    }

    if (_mktNavState.selectedCatId === 'all') {
        const hasAnyAllowed = allCategories.some(c => isUserAllowedForCat(c));
        btn.style.display = hasAnyAllowed ? 'inline-flex' : 'none';
    } else {
        const targetCatId = Number(_mktNavState.selectedCatId);
        const selCat = allCategories.find(c => Number(c.id) === targetCatId);
        const childCats = allCategories.filter(c => Number(c.parent_id) === targetCatId);
        const catsToCheck = selCat ? [selCat, ...childCats] : childCats;

        const isAllowed = catsToCheck.some(c => isUserAllowedForCat(c));
        btn.style.display = isAllowed ? 'inline-flex' : 'none';
    }
}

window._mktDeleteCampaign = async function(id, name) {
    if (!_mktIsUserDirectorOrManager()) {
        showToast('⚠️ Bạn không có quyền xóa Chiến dịch! Chỉ Giám Đốc mới có quyền thao tác.', 'error');
        return;
    }
    if (!confirm(`⚠️ XÁC NHẬN XÓA CHIẾN DỊCH MARKETING:\n\nBạn có chắc chắn muốn XÓA chiến dịch: "${name || '#' + id}" không?\n\n(Lưu ý: Thao tác này sẽ gỡ chiến dịch khỏi các quy định hạn mức)`)) {
        return;
    }

    try {
        const res = await apiCall(`/api/marketing-campaigns/${id}`, 'DELETE');
        if (res.success) {
            showToast('✅ Đã xóa chiến dịch thành công!', 'success');
            _mktLoadBudgets();
        }
    } catch(err) {
        showToast('❌ Lỗi khi xóa chiến dịch: ' + err.message, 'error');
    }
};

async function _mktRenderCampaignSummaryCards() {
    const box = document.getElementById('mktCampaignCardsBox');
    if (!box) return;

    try {
        const selectedCat = _mktNavState.selectedCatId;
        const res = await apiCall(`/api/marketing-campaigns?category_id=${selectedCat || 'all'}`);
        const campaigns = Array.isArray(res) ? res : [];

        if (campaigns.length === 0) {
            box.style.display = 'none';
            box.innerHTML = '';
            return;
        }

        const isDirector = _mktIsUserDirectorOrManager();
        let cardsHtml = `
            <div style="font-size:12.5px;font-weight:800;color:#7e22ce;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
                <span>🎯 DANH SÁCH CHIẾN DỊCH MARKETING ĐANG ÁP DỤNG (${campaigns.length} chiến dịch):</span>
            </div>
            <div style="display:grid;grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));gap:12px;">
        `;

        campaigns.forEach(c => {
            const max = Number(c.max_budget || 0);
            const spent = Number(c.total_spent || 0);
            const rem = Math.max(0, max - spent);
            const pct = max > 0 ? Math.min(100, Math.round((spent / max) * 100)) : 0;
            const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';

            const deleteBtnHtml = isDirector ? `
                <button type="button" class="mkt-btn-xs" style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;padding:3px 8px;border-radius:6px;font-size:11px;cursor:pointer;font-weight:700;margin-left:auto;" onclick="_mktDeleteCampaign(${c.id}, '${(c.name || '').replace(/'/g, "\\'")}')" title="Xóa chiến dịch">🗑️ Xóa</button>
            ` : '';

            const catLabel = c.category_name ? `📍 ${c.category_name}` : '🌐 Áp dụng toàn bộ kênh';

            cardsHtml += `
                <div style="background:white;border:1.5px solid #d8b4fe;border-radius:12px;padding:12px 14px;box-shadow:0 2px 10px rgba(124,58,237,0.06);display:flex;flex-direction:column;gap:6px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                        <span style="font-weight:800;font-size:13.5px;color:#5b21b6;">🎯 ${c.name}</span>
                        ${deleteBtnHtml}
                    </div>
                    <div style="font-size:11.5px;color:#64748b;background:#f8fafc;padding:4px 8px;border-radius:6px;">
                        ${catLabel} • 📝 ${c.target_goal}
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-top:2px;">
                        <span style="color:#059669;">💰 Tối đa: ${_mktFmt(max)}</span>
                        <span style="color:#2563eb;">Đã chi: ${_mktFmt(spent)}</span>
                        <span style="color:${rem > 0 ? '#15803d' : '#dc2626'};">Còn: ${_mktFmt(rem)}</span>
                    </div>
                    <div style="width:100%;height:6px;background:#e2e8f0;border-radius:10px;overflow:hidden;margin-top:2px;">
                        <div style="width:${pct}%;height:100%;background:${barColor};border-radius:10px;transition:width 0.3s;"></div>
                    </div>
                </div>
            `;
        });

        cardsHtml += `</div>`;
        box.innerHTML = cardsHtml;
        box.style.display = 'block';
    } catch(e) {
        console.error('Error rendering campaign summary cards:', e);
    }
}

function _mktRenderCostTable(data) {
    _mktUpdateCostAddButtonVisibility();
    _mktRenderCampaignSummaryCards();

    const tbody = document.getElementById('mktCostTableBody');
    const countTag = document.getElementById('mktCostRecordCount');
    if (!tbody) return;

    // Strictly filter records created from "➕ Nhập Chi Phí Marketing" (must have non-empty notes or image_url)
    const costEntries = (data || []).filter(item => (item.notes && item.notes.trim() !== '') || item.image_url);

    if (!costEntries || costEntries.length === 0) {
        if (countTag) countTag.textContent = '0 giao dịch';
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:35px;color:#94a3b8;">📭 Chưa có phiếu/giao dịch chi phí nào được tạo từ "➕ Nhập Chi Phí Marketing"</td></tr>`;
        return;
    }

    // Sort cost entries by budget_date DESC, id DESC
    const sorted = [...costEntries].sort((a, b) => {
        if (a.budget_date !== b.budget_date) {
            return (b.budget_date || '').localeCompare(a.budget_date || '');
        }
        return Number(b.id) - Number(a.id);
    });

    if (countTag) countTag.textContent = `${sorted.length} giao dịch`;

    tbody.innerHTML = sorted.map((item, idx) => {
        const spent = Number(item.spent_amount || 0);
        const codeTxt = `MKT-${item.id}`;
        const dateDisp = item.budget_date ? _mktFmtDateWithDay(item.budget_date) : `Tháng ${item.budget_month}/${item.budget_year}`;
        const catName = item.channel_name || item.category_name || 'Khác';
        const pageName = item.pancake_page_name ? ` <span style="font-size:10.5px;color:#0284c7;background:#e0f2fe;padding:1px 6px;border-radius:4px;font-weight:700;">📄 ${item.pancake_page_name}</span>` : '';
        const mainCampaignTitleHtml = item.campaign_name 
            ? `<div style="font-weight:800;font-size:12.5px;color:#7e22ce;"><span style="background:#f3e8ff;padding:2px 8px;border-radius:6px;border:1px solid #d8b4fe;display:inline-flex;align-items:center;gap:4px;">🎯 ${item.campaign_name}</span></div>` 
            : `<div style="font-weight:800;font-size:12.5px;color:#0f172a;"><span>${item.cat_icon || '📌'} ${catName}</span></div>`;

        const subCategoryLineHtml = item.campaign_name 
            ? `<div style="font-size:11.5px;color:#475569;margin-top:2px;display:flex;align-items:center;gap:4px;font-weight:600;"><span>${item.cat_icon || '📄'} ${catName}</span>${pageName}</div>`
            : (pageName ? `<div style="font-size:11.5px;color:#475569;margin-top:2px;display:flex;align-items:center;gap:4px;">${pageName}</div>` : '');

        const notesTxt = item.notes ? item.notes : '—';
        const reportLinkHtml = item.report_link ? `<div style="margin-top:4px;"><a href="${item.report_link}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#0284c7;background:#e0f2fe;padding:2px 8px;border-radius:6px;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:4px;border:1px solid #bae6fd;" title="${item.report_link.replace(/"/g, '&quot;')}">🔗 Link Báo Các Mục Chi Tiền ↗</a></div>` : '';
        const reporterTxt = item.creator_name || item.ads_handler_name || 'Giám Đốc';

        let imgHtml = '<span style="color:#94a3b8;font-size:11px;">—</span>';
        if (item.image_url) {
            imgHtml = `<img src="${item.image_url}" onclick="_mktViewFullImage('${item.image_url.replace(/'/g, "\\'")}')" style="width:38px;height:38px;object-fit:cover;border-radius:6px;cursor:pointer;border:1.5px solid #cbd5e1;box-shadow:0 2px 5px rgba(0,0,0,0.1);" title="Click để phóng to ảnh bill hóa đơn">`;
        }

        const isDirector = _mktIsGiamDoc();
        let actionsHtml = '';

        if (item.is_approved) {
            let dirBillImg = '';
            if (item.director_bill_image_url) {
                dirBillImg = `<img src="${item.director_bill_image_url}" onclick="_mktViewFullImage('${item.director_bill_image_url.replace(/'/g, "\\'")}')" style="width:28px;height:28px;object-fit:cover;border-radius:6px;cursor:pointer;border:1.5px solid #86efac;box-shadow:0 2px 5px rgba(0,0,0,0.1);" title="Click xem Bill chuyển khoản của Giám Đốc">`;
            }
            actionsHtml = `
                <div style="display:flex;flex-direction:column;gap:4px;align-items:center;justify-content:center;">
                    <div>
                        <span style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:6px;font-weight:700;font-size:11px;border:1px solid #86efac;white-space:nowrap;display:inline-block;" title="Phiếu chi đã được Giám Đốc Duyệt Chi. Khóa Sửa/Xóa.">Duyệt Chi</span>
                    </div>
                    ${dirBillImg ? `<div>${dirBillImg}</div>` : ''}
                </div>
            `;
        } else {
            const pendingStatusHtml = isDirector ? `
                <button type="button" style="background:#ef4444;color:white;border:1px solid #dc2626;padding:2px 8px;border-radius:6px;font-weight:700;font-size:11px;white-space:nowrap;cursor:pointer;display:inline-block;box-shadow:0 2px 4px rgba(239,68,68,0.2);" title="Bấm để Giám Đốc duyệt chi & gửi bill chuyển khoản" onclick="_mktOpenDirectorApproveModal(${item.id})">Chờ Duyệt</button>
            ` : `
                <span style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;padding:2px 8px;border-radius:6px;font-weight:700;font-size:11px;white-space:nowrap;display:inline-block;" title="Đang chờ Giám Đốc duyệt chi">Chờ Duyệt</span>
            `;

            actionsHtml = `
                <div style="display:flex;flex-direction:column;gap:6px;justify-content:center;align-items:center;">
                    <div>${pendingStatusHtml}</div>
                    <div style="display:flex;gap:4px;justify-content:center;align-items:center;">
                        <button class="mkt-add-cat-btn" style="padding:2px 6px;font-size:11px;background:#eff6ff;color:#2563eb;border:1px solid #93c5fd;" title="Sửa chi phí này" onclick="_mktEditCostItem(${item.id})">✏️</button>
                        <button class="mkt-add-cat-btn" style="padding:2px 6px;font-size:11px;background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;" title="Xóa chi phí này" onclick="_mktDeleteCostItem(${item.id})">🗑️</button>
                    </div>
                </div>
            `;
        }

        return `
            <tr>
                <td style="font-weight:700;color:#64748b;text-align:center;">${idx + 1}</td>
                <td style="font-weight:700;color:#334155;white-space:nowrap;">${dateDisp}</td>
                <td style="font-weight:800;color:#2563eb;font-family:monospace;">${codeTxt}</td>
                <td>
                    <div style="display:flex;flex-direction:column;gap:2px;">
                        ${mainCampaignTitleHtml}
                        ${subCategoryLineHtml}
                    </div>
                </td>
                <td style="font-weight:700;color:#1e293b;max-width:280px;white-space:normal;word-break:break-word;">
                    ${notesTxt}
                    ${reportLinkHtml}
                </td>
                <td style="text-align:right;font-weight:800;color:#059669;font-size:13.5px;">
                    ${_mktFmt(spent)}
                </td>
                <td style="text-align:center;">
                    ${imgHtml}
                </td>
                <td>
                    <span class="mkt-meta-badge" style="color:#7c3aed;background:#f3e8ff;border:1px solid #d8b4fe;font-weight:700;">👤 ${reporterTxt}</span>
                </td>
                <td style="text-align:center;">
                    ${actionsHtml}
                </td>
            </tr>
        `;
    }).join('');
}

function _mktRenderTable(data) {
    // 1. Render Cost Transactions Table Panel
    _mktRenderCostTable(data);

    // 2. Render Analytics Table Panel (EXCLUDE manual cost entries created from "➕ Nhập Chi Phí Marketing")
    let analyticsData = (data || []).filter(item => (!item.notes || item.notes.trim() === '') && !item.image_url && !item.report_link);

    // Sort analyticsData by budget_date DESC
    analyticsData.sort((a, b) => (b.budget_date || '').localeCompare(a.budget_date || ''));

    const tbody = document.getElementById('mktTableBody');
    const countTag = document.getElementById('mktRecordCount');
    if (countTag) countTag.textContent = `${analyticsData.length} bản ghi`;
    if (!tbody) return;

    if (!analyticsData || analyticsData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:40px;color:#94a3b8;">📭 Chưa có dữ liệu chỉ số / chi phí từ hệ thống ngoài cho mục đang chọn</td></tr>`;
        return;
    }

    if (_mktNavState.viewType === 'monthly') {
        // Group data by category for monthly summary view
        const map = new Map();
        analyticsData.forEach(item => {
            const key = item.category_id || item.channel_name;
            if (!map.has(key)) {
                map.set(key, {
                    id: item.id,
                    cat_icon: item.cat_icon,
                    channel_name: item.channel_name,
                    pancake_page_id: item.pancake_page_id,
                    pancake_page_name: item.pancake_page_name,
                    ads_handler_name: item.ads_handler_name,
                    linked_source_name: item.linked_source_name || item.cat_linked_source,
                    fb_ad_account_id: item.fb_ad_account_id || item.cat_fb_acc,
                    fb_ad_account_name: item.fb_ad_account_name || item.cat_fb_acc_name,
                    fb_ad_account_link: item.fb_ad_account_link || item.cat_fb_acc_link,
                    spent_amount: 0,
                    lead_count: 0,
                    order_count: 0,
                    revenue_amount: 0,
                    notes: item.notes
                });
            }
            const grp = map.get(key);
            grp.spent_amount += Number(item.spent_amount || 0);
            grp.lead_count += Number(item.lead_count || 0);
            grp.order_count += Number(item.order_count || 0);
            grp.revenue_amount += Number(item.revenue_amount || 0);
        });

        const groupedList = Array.from(map.values());
        const periodTxt = _mktNavState.selectedMonth === 'all' 
            ? `Cả Năm ${_mktNavState.selectedYear}` 
            : `Tháng ${_mktNavState.selectedMonth}/${_mktNavState.selectedYear}`;

        tbody.innerHTML = groupedList.map((item, idx) => {
            const spent = Number(item.spent_amount || 0);
            const leads = Number(item.lead_count || 0);
            const orders = Number(item.order_count || 0);
            const rev = Number(item.revenue_amount || 0);
            const cpl = leads > 0 ? Math.round(spent / leads) : 0;
            const costPerOrder = orders > 0 ? Math.round(spent / orders) : 0;
            const roas = spent > 0 ? (rev / spent * 100).toFixed(1) : 0;

            const handlerDisplay = item.ads_handler_name || 'Giám Đốc';
            const sourceDisplay = item.linked_source_name || '—';
            const fullPageName = item.pancake_page_name || item.channel_name || 'Fanpage';

            const adAccName = item.fb_ad_account_name || item.cat_fb_acc_name || '';
            const adAccLink = item.fb_ad_account_link || item.cat_fb_acc_link || '';

            let adAccBadgeHtml = '';
            if (adAccName) {
                if (adAccLink) {
                    adAccBadgeHtml = `<a href="${adAccLink}" target="_blank" class="mkt-meta-acc-link" title="Mở Trình Quản Lý Quảng Cáo Meta: ${adAccName}">💳 ${adAccName} ↗</a>`;
                } else {
                    adAccBadgeHtml = `<span class="mkt-meta-badge" style="color:#059669;background:#ecfdf5;">💳 ${adAccName}</span>`;
                }
            }

            let pageLinkHtml = `<span style="font-weight:800;color:#0f172a;">${item.cat_icon || '📌'} ${fullPageName}</span>`;
            if (item.pancake_page_id) {
                pageLinkHtml = `<a href="https://facebook.com/${item.pancake_page_id}" target="_blank" class="mkt-page-title-link" title="${fullPageName}">📄 ${fullPageName} ↗</a>`;
            }

            const titleCplRow = `${_mktFmt(spent)} Chi phí MKT / ${leads} Tin Nhắn = ${_mktFmt(cpl)}`;
            const titleCpoRow = `${_mktFmt(spent)} Chi phí MKT / ${orders} Đơn = ${_mktFmt(costPerOrder)}`;
            const titleRoasRow = `${_mktFmt(spent)} Chi phí MKT / ${_mktFmt(rev)} Doanh số = ${roas}%`;

            return `
                <tr>
                    <td style="font-weight:700;color:#64748b;text-align:center;">${idx + 1}</td>
                    <td style="font-weight:800;color:#2563eb;white-space:nowrap;">Tổng ${periodTxt}</td>
                    <td>
                        <div class="mkt-channel-cell">
                            ${pageLinkHtml}
                            <div class="mkt-channel-meta">
                                <span class="mkt-meta-badge" style="color:#0369a1;background:#e0f2fe;">🔗 ${sourceDisplay}</span>
                                ${adAccBadgeHtml}
                                <span class="mkt-meta-badge" onclick="_mktOpenResourceModal('${handlerDisplay.replace(/'/g, "\\'")}')" style="color:#7c3aed;background:#f3e8ff;border:1px solid #d8b4fe;cursor:pointer;font-weight:700;transition:all .15s;" title="Click để xem Nguyên Liệu Tài Khoản của ${handlerDisplay}">👤 ${handlerDisplay} 📝</span>
                            </div>
                        </div>
                    </td>
                    <td style="text-align:right;font-weight:800;color:#059669;">${_mktFmt(spent)}</td>
                    <td style="text-align:center;font-weight:800;color:#d97706;">${leads}</td>
                    <td style="text-align:right;font-weight:800;color:#7c3aed;" data-tooltip="${titleCplRow}" title="${titleCplRow}">${cpl > 0 ? _mktFmt(cpl) : '—'}</td>
                    <td style="text-align:center;font-weight:800;color:#2563eb;">${orders}</td>
                    <td style="text-align:right;font-weight:700;color:#0284c7;">${rev > 0 ? _mktFmt(rev) : '—'}</td>
                    <td style="text-align:center;" data-tooltip="${titleRoasRow}" title="${titleRoasRow}"><span style="background:${roas >= 100 ? '#dcfce7' : '#fef3c7'};color:${roas >= 100 ? '#166534' : '#92400e'};padding:2px 8px;border-radius:10px;font-weight:800;font-size:11px;">${spent > 0 ? roas + '%' : '—'}</span></td>
                    <td style="text-align:right;font-weight:800;color:#dc2626;" data-tooltip="${titleCpoRow}" title="${titleCpoRow}">${costPerOrder > 0 ? _mktFmt(costPerOrder) : '—'}</td>
                    <td style="text-align:center;">—</td>
                </tr>
            `;
        }).join('');
        return;
    }

    // Daily View Breakdown (Optimized 10 Columns)
    tbody.innerHTML = analyticsData.map((item, idx) => {
        const spent = Number(item.spent_amount || 0);
        const leads = Number(item.lead_count || 0);
        const orders = Number(item.order_count || 0);
        const rev = Number(item.revenue_amount || 0);
        const cpl = leads > 0 ? Math.round(spent / leads) : 0;
        const costPerOrder = orders > 0 ? Math.round(spent / orders) : 0;
        const roas = spent > 0 ? (rev / spent * 100).toFixed(1) : 0;

        const titleCplRow = `${_mktFmt(spent)} Chi phí MKT / ${leads} Tin Nhắn = ${_mktFmt(cpl)}`;
        const titleCpoRow = `${_mktFmt(spent)} Chi phí MKT / ${orders} Đơn = ${_mktFmt(costPerOrder)}`;
        const titleRoasRow = `${_mktFmt(spent)} Chi phí MKT / ${_mktFmt(rev)} Doanh số = ${roas}%`;

        const dateDisp = item.budget_date ? _mktFmtDayOfWeek(item.budget_date) : `Tháng ${item.budget_month}/${item.budget_year}`;
        const handlerDisplay = item.ads_handler_name || 'Giám Đốc';
        const sourceDisplay = item.linked_source_name || item.cat_linked_source || '—';
        const fullPageName = item.pancake_page_name || item.channel_name || 'Fanpage';

        const adAccName = item.fb_ad_account_name || item.cat_fb_acc_name || '';
        const adAccLink = item.fb_ad_account_link || item.cat_fb_acc_link || '';

        let adAccBadgeHtml = '';
        if (adAccName) {
            if (adAccLink) {
                adAccBadgeHtml = `<a href="${adAccLink}" target="_blank" class="mkt-meta-acc-link" title="Mở Trình Quản Lý Quảng Cáo Meta: ${adAccName}">💳 ${adAccName} ↗</a>`;
            } else {
                adAccBadgeHtml = `<span class="mkt-meta-badge" style="color:#059669;background:#ecfdf5;">💳 ${adAccName}</span>`;
            }
        }

        let pageLinkHtml = `<span style="font-weight:800;color:#0f172a;">${item.cat_icon || '📌'} ${fullPageName}</span>`;
        if (item.pancake_page_id) {
            pageLinkHtml = `<a href="https://facebook.com/${item.pancake_page_id}" target="_blank" class="mkt-page-title-link" title="${fullPageName}">📄 ${fullPageName} ↗</a>`;
        }

        const isAutoApiRow = Boolean(
            item.fb_ad_account_id || 
            item.cat_fb_acc || 
            (item.channel_name && (item.channel_name.toLowerCase().includes('facebook') || item.channel_name.toLowerCase().includes('tiktok')))
        );

        let actionHtml = '';
        if (isAutoApiRow) {
            actionHtml = `<span style="background:#f1f5f9;color:#64748b;padding:3px 6px;border-radius:6px;font-weight:700;font-size:10.5px;border:1px solid #e2e8f0;" title="Dữ liệu rút tự động từ Meta API">🔒 API</span>`;
        } else {
            actionHtml = `
                <div style="display:flex;gap:4px;justify-content:center;">
                    <button class="mkt-btn mkt-btn-secondary" style="padding:3px 6px;font-size:10.5px;" onclick="_mktEditCost(${item.id})">✏️</button>
                    <button class="mkt-btn mkt-btn-secondary" style="padding:3px 6px;font-size:10.5px;color:#ef4444;border-color:#fca5a5;" onclick="_mktDeleteCost(${item.id})">🗑️</button>
                </div>
            `;
        }

        const noteBadge = item.notes ? `<span title="Ghi chú: ${item.notes}" style="cursor:help;margin-left:4px;font-size:12px;">📝</span>` : '';
        const imageBadge = item.image_url ? `<a href="${item.image_url}" target="_blank" title="Click xem ảnh hóa đơn chi phí" style="display:inline-block;margin-left:6px;"><img src="${item.image_url}" style="width:22px;height:22px;object-fit:cover;border-radius:4px;border:1.5px solid #3b82f6;vertical-align:middle;"></a>` : '';

        return `
            <tr>
                <td style="font-weight:700;color:#64748b;text-align:center;">${idx + 1}</td>
                <td style="font-weight:800;color:#1e40af;white-space:nowrap;">${dateDisp} ${noteBadge}${imageBadge}</td>
                <td>
                    <div class="mkt-channel-cell">
                        ${pageLinkHtml}
                        <div class="mkt-channel-meta">
                            <span class="mkt-meta-badge" style="color:#0369a1;background:#e0f2fe;">🔗 ${sourceDisplay}</span>
                            ${adAccBadgeHtml}
                            <span class="mkt-meta-badge" onclick="_mktOpenResourceModal('${handlerDisplay.replace(/'/g, "\\'")}')" style="color:#7c3aed;background:#f3e8ff;border:1px solid #d8b4fe;cursor:pointer;font-weight:700;transition:all .15s;" title="Click để xem Nguyên Liệu Tài Khoản của ${handlerDisplay}">👤 ${handlerDisplay} 📝</span>
                        </div>
                    </div>
                </td>
                <td style="text-align:right;font-weight:800;color:#059669;">${_mktFmt(spent)}</td>
                <td style="text-align:center;font-weight:800;color:#d97706;">${leads}</td>
                <td style="text-align:right;font-weight:800;color:#7c3aed;" data-tooltip="${titleCplRow}" title="${titleCplRow}">${cpl > 0 ? _mktFmt(cpl) : '—'}</td>
                <td style="text-align:center;font-weight:800;color:#2563eb;">${orders}</td>
                <td style="text-align:right;font-weight:700;color:#0284c7;">${rev > 0 ? _mktFmt(rev) : '—'}</td>
                <td style="text-align:center;" data-tooltip="${titleRoasRow}" title="${titleRoasRow}"><span style="background:${roas >= 100 ? '#dcfce7' : '#fef3c7'};color:${roas >= 100 ? '#166534' : '#92400e'};padding:2px 8px;border-radius:10px;font-weight:800;font-size:11px;">${spent > 0 ? roas + '%' : '—'}</span></td>
                <td style="text-align:right;font-weight:800;color:#dc2626;" data-tooltip="${titleCpoRow}" title="${titleCpoRow}">${costPerOrder > 0 ? _mktFmt(costPerOrder) : '—'}</td>
                <td style="text-align:center;">${actionHtml}</td>
            </tr>
        `;
    }).join('');
}

function _mktFmt(val) {
    if (!val || val === 0) return '0đ';
    return Number(val).toLocaleString('vi-VN') + 'đ';
}

// ========== ADS HANDLER RESOURCE MODAL FUNCTIONS ==========
async function _mktOpenResourceModal(targetHandlerName = null) {
    const user = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : {});
    const isDirector = _mktIsGiamDoc();

    const modal = document.getElementById('mktResourceModalOverlay');
    const select = document.getElementById('mktResourceHandlerSelect');
    if (!modal || !select) return;

    select.innerHTML = '<option value="">⏳ Đang tải danh sách người cầm Ads...</option>';

    try {
        const res = await apiCall('/api/marketing-categories/ads-handlers-resources');
        if (res.success && Array.isArray(res.handlers)) {
            _mktNavState.resourceHandlers = res.handlers;

            const reqUserName = (user.full_name || user.name || user.username || '').toLowerCase().trim();
            const targetLower = targetHandlerName ? targetHandlerName.toLowerCase().trim() : '';

            if (!isDirector && targetHandlerName) {
                const isOwner = targetLower && (targetLower === reqUserName || targetLower.includes(reqUserName) || reqUserName.includes(targetLower));
                if (!isOwner) {
                    showToast(`⚠️ Bạn không có quyền xem Nguyên Liệu Tài Khoản của ${targetHandlerName}! Chỉ Giám Đốc và ${targetHandlerName} mới được xem.`, 'error');
                    return;
                }
            }

            const availableHandlers = res.handlers.filter(h => isDirector || h.can_access);

            if (availableHandlers.length === 0) {
                showToast('⚠️ Bạn không có quyền xem nguyên liệu của bất kỳ tài khoản nào!', 'error');
                return;
            }

            select.innerHTML = availableHandlers.map(h => `
                <option value="${h.ads_handler_name}">👤 ${h.ads_handler_name} ${h.content && !h.content.includes('🔒') ? ' (Đã có dữ liệu)' : ''}</option>
            `).join('');

            if (targetHandlerName && availableHandlers.some(h => h.ads_handler_name === targetHandlerName)) {
                select.value = targetHandlerName;
            } else if (availableHandlers.length > 0) {
                select.value = availableHandlers[0].ads_handler_name;
            }

            select.disabled = !isDirector;
            _mktOnResourceHandlerChange(select.value);
        }
    } catch(e) {
        showToast('❌ Lỗi tải thông tin nguyên liệu: ' + e.message, 'error');
        return;
    }

    modal.style.setProperty('display', 'flex', 'important');
}

function _mktOnResourceHandlerChange(handlerName) {
    const contentEl = document.getElementById('mktResourceContent');
    const updatedDisp = document.getElementById('mktResourceUpdatedDisp');
    if (!contentEl) return;

    const item = (_mktNavState.resourceHandlers || []).find(h => h.ads_handler_name === handlerName);
    if (item) {
        contentEl.value = item.content || '';
        if (updatedDisp) {
            if (item.updated_at) {
                const dt = new Date(item.updated_at).toLocaleString('vi-VN');
                const byName = item.updater_name ? ` bởi ${item.updater_name}` : '';
                updatedDisp.textContent = `🕒 Cập nhật lần cuối: ${dt}${byName}`;
            } else {
                updatedDisp.textContent = '🕒 Chưa từng lưu nguyên liệu cho người cầm Ads này.';
            }
        }
    } else {
        contentEl.value = '';
        if (updatedDisp) updatedDisp.textContent = '';
    }
}

async function _mktSaveResource(e) {
    e.preventDefault();
    const select = document.getElementById('mktResourceHandlerSelect');
    const contentEl = document.getElementById('mktResourceContent');
    if (!select || !contentEl) return;

    const handlerName = select.value;
    if (!handlerName) {
        showToast('⚠️ Vui lòng chọn Người Cầm Ads!', 'error');
        return;
    }

    try {
        const res = await apiCall('/api/marketing-categories/ads-handlers-resources', 'POST', {
            ads_handler_name: handlerName,
            content: contentEl.value
        });

        if (res.success) {
            showToast(`✅ ${res.message}`, 'success');
            _mktCloseResourceModal();
        }
    } catch(err) {
        showToast('❌ Lỗi khi lưu nguyên liệu: ' + err.message, 'error');
    }
}

window._mktCloseResourceModal = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    const modal = document.getElementById('mktResourceModalOverlay');
    if (modal) modal.style.setProperty('display', 'none', 'important');
    return false;
};
function _mktCloseResourceModal(e) { return window._mktCloseResourceModal(e); }

let _mktCurrentCampaigns = [];

window._mktOpenCampaignModal = async function() {
    if (_mktNavState.selectedCatId === 'all') {
        showToast('⚠️ Vui lòng chọn 1 Kênh Marketing cụ thể (ví dụ: Facebook Ads) để tạo Chiến Dịch!', 'warning');
        return;
    }

    const modal = document.getElementById('mktCampaignModalOverlay');
    const catSelect = document.getElementById('mktCampaignCategory');
    const nameEl = document.getElementById('mktCampaignName');
    const goalEl = document.getElementById('mktCampaignTargetGoal');
    const maxBudgetEl = document.getElementById('mktCampaignMaxBudget');

    if (!modal) return;

    const categories = _mktNavState.categories || [];
    let catHtml = '<option value="">🌐 Áp dụng chung cho toàn bộ kênh</option>';
    categories.forEach(c => {
        const indent = c.parent_id ? '&nbsp;&nbsp;&nbsp;&nbsp;└── ' : '📌 ';
        catHtml += `<option value="${c.id}">${indent}${c.icon || ''} ${c.name}</option>`;
    });

    if (catSelect) {
        catSelect.innerHTML = catHtml;
        if (_mktNavState.selectedCatId && _mktNavState.selectedCatId !== 'all' && catSelect.querySelector(`option[value="${_mktNavState.selectedCatId}"]`)) {
            catSelect.value = _mktNavState.selectedCatId;
        } else {
            catSelect.value = '';
        }
        catSelect.disabled = true;
        catSelect.style.background = '#f1f5f9';
        catSelect.style.fontWeight = '700';
        catSelect.style.cursor = 'not-allowed';
    }

    if (nameEl) nameEl.value = '';
    if (goalEl) goalEl.value = '';
    if (maxBudgetEl) maxBudgetEl.value = '';

    modal.style.setProperty('display', 'flex', 'important');
};

window._mktCloseCampaignModal = function() {
    const modal = document.getElementById('mktCampaignModalOverlay');
    if (modal) modal.style.setProperty('display', 'none', 'important');
};

window._mktSaveCampaign = async function(e) {
    if (e && e.preventDefault) e.preventDefault();

    const catSelect = document.getElementById('mktCampaignCategory');
    const nameEl = document.getElementById('mktCampaignName');
    const goalEl = document.getElementById('mktCampaignTargetGoal');
    const maxBudgetEl = document.getElementById('mktCampaignMaxBudget');

    const name = nameEl ? nameEl.value.trim() : '';
    const goal = goalEl ? goalEl.value.trim() : '';
    const maxBudget = maxBudgetEl ? Number(maxBudgetEl.value) : 0;
    const catId = catSelect ? catSelect.value : null;

    if (!name) {
        showToast('⚠️ Vui lòng nhập Tên chiến dịch Marketing!', 'warning');
        return;
    }
    if (!goal) {
        showToast('⚠️ Vui lòng nhập Mục tiêu chiến dịch!', 'warning');
        return;
    }
    if (!maxBudget || maxBudget <= 0) {
        showToast('⚠️ Vui lòng nhập Chi phí tối đa hợp lệ (> 0đ)!', 'warning');
        return;
    }

    try {
        const res = await apiCall('/api/marketing-campaigns', 'POST', {
            category_id: catId ? Number(catId) : null,
            name: name,
            target_goal: goal,
            max_budget: maxBudget
        });

        if (res.success) {
            showToast(`✅ ${res.message}`, 'success');
            _mktCloseCampaignModal();
            _mktLoadBudgets();
        }
    } catch(err) {
        showToast('❌ Lỗi khi tạo chiến dịch: ' + err.message, 'error');
    }
};

window._mktOpenDirectorApproveModal = function(id) {
    const modal = document.getElementById('mktApproveModalOverlay');
    const costIdEl = document.getElementById('mktApproveCostId');
    const infoBox = document.getElementById('mktApproveCostInfo');
    if (!modal) return;

    const dataList = _mktNavState.budgetsData || [];
    const item = dataList.find(b => Number(b.id) === Number(id));
    if (!item) {
        showToast('⚠️ Không tìm thấy phiếu chi!', 'error');
        return;
    }

    costIdEl.value = item.id;
    const catName = item.channel_name || item.category_name || '';
    const campName = item.campaign_name ? ` 🎯 ${item.campaign_name}` : '';
    const dateDisp = item.budget_date ? _mktFmtDateWithDay(item.budget_date) : `Tháng ${item.budget_month}/${item.budget_year}`;
    const spentDisp = _mktFmt(item.spent_amount || 0);

    infoBox.innerHTML = `
        <div>📌 <strong>Mã Phiếu Chi:</strong> MKT-${item.id}</div>
        <div>🗓️ <strong>Ngày Chi:</strong> ${dateDisp}</div>
        <div>🎯 <strong>Kênh & Chiến Dịch:</strong> ${catName}${campName}</div>
        <div>💸 <strong>Số Tiền Cần Duyệt:</strong> <strong style="color:#059669;font-size:15px;">${spentDisp}</strong></div>
        <div>👤 <strong>Người Báo Chi:</strong> ${item.creator_name || item.ads_handler_name || 'N/A'}</div>
    `;

    _mktRemoveApproveImage();
    modal.style.setProperty('display', 'flex', 'important');

    const dropArea = document.getElementById('mktApproveImageDropArea');
    if (dropArea) dropArea.focus();
};

window._mktCloseApproveModal = function() {
    const modal = document.getElementById('mktApproveModalOverlay');
    if (modal) modal.style.setProperty('display', 'none', 'important');
};

window._mktRemoveApproveImage = function() {
    const imgEl = document.getElementById('mktApproveImagePreview');
    const container = document.getElementById('mktApproveImagePreviewContainer');
    const placeholder = document.getElementById('mktApproveImagePlaceholder');
    const inputEl = document.getElementById('mktApproveImageUrl');

    if (imgEl) imgEl.src = '';
    if (container) container.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
    if (inputEl) inputEl.value = '';
};

window._mktHandleApproveImagePaste = function(e) {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    let blob = null;

    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') === 0) {
            blob = items[i].getAsFile();
            break;
        }
    }

    if (!blob) return;
    e.preventDefault();

    const reader = new FileReader();
    reader.onload = function(evt) {
        const base64 = evt.target.result;
        const imgEl = document.getElementById('mktApproveImagePreview');
        const container = document.getElementById('mktApproveImagePreviewContainer');
        const placeholder = document.getElementById('mktApproveImagePlaceholder');
        const inputEl = document.getElementById('mktApproveImageUrl');

        if (imgEl) imgEl.src = base64;
        if (container) container.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
        if (inputEl) inputEl.value = base64;

        showToast('✅ Đã nhận ảnh bill chuyển khoản của Giám Đốc!', 'success');
    };
    reader.readAsDataURL(blob);
};

window._mktConfirmApproveCost = async function(e) {
    if (e && e.preventDefault) e.preventDefault();

    const costId = document.getElementById('mktApproveCostId').value;
    const imageUrl = document.getElementById('mktApproveImageUrl').value;

    if (!costId) return;

    try {
        const res = await apiCall(`/api/marketing-budgets/${costId}/approve`, 'POST', {
            director_bill_image_url: imageUrl || null
        });

        if (res.success) {
            showToast(`✅ ${res.message}`, 'success');
            _mktCloseApproveModal();
            _mktLoadBudgets();
        }
    } catch(err) {
        showToast('❌ Lỗi khi duyệt chi phí: ' + err.message, 'error');
    }
};

async function _mktPopulateCostCampaigns(selectedCampaignId = null, catId = null) {
    const select = document.getElementById('mktCostCampaignSelect');
    if (!select) return;

    try {
        const targetCat = catId || _mktNavState.selectedCatId;
        const res = await apiCall(`/api/marketing-campaigns?category_id=${targetCat || 'all'}`);
        _mktCurrentCampaigns = Array.isArray(res) ? res : [];
    } catch(e) {
        _mktCurrentCampaigns = [];
    }

    let html = '<option value="">-- Chọn Chiến Dịch Marketing * --</option>';
    _mktCurrentCampaigns.forEach(c => {
        const catTxt = c.category_name ? ` (${c.category_name})` : '';
        const maxTxt = Number(c.max_budget) > 0 ? ` [Tối đa: ${_mktFmt(c.max_budget)}]` : '';
        html += `<option value="${c.id}">🎯 ${c.name}${catTxt}${maxTxt}</option>`;
    });

    select.innerHTML = html;
    if (selectedCampaignId && select.querySelector(`option[value="${selectedCampaignId}"]`)) {
        select.value = selectedCampaignId;
    } else if (_mktCurrentCampaigns.length === 1) {
        select.value = _mktCurrentCampaigns[0].id;
    } else {
        select.value = '';
    }
    _mktOnCostSpentInput();
}

window._mktOnCostSpentInput = function() {
    const campaignSelect = document.getElementById('mktCostCampaignSelect');
    const spentEl = document.getElementById('mktCostSpent');
    const infoBox = document.getElementById('mktCostCampaignInfo');
    const saveBtn = document.getElementById('mktSaveCostBtn');

    if (!spentEl) return;
    const entered = Number(spentEl.value || 0);

    if (!campaignSelect || !campaignSelect.value) {
        if (infoBox) infoBox.style.display = 'none';
        if (spentEl) {
            spentEl.style.borderColor = '#cbd5e1';
            spentEl.style.backgroundColor = '#ffffff';
        }
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.style.opacity = '1';
            saveBtn.style.cursor = 'pointer';
        }
        return;
    }

    const campId = Number(campaignSelect.value);
    const camp = _mktCurrentCampaigns.find(c => Number(c.id) === campId);
    if (!camp) {
        if (infoBox) infoBox.style.display = 'none';
        if (spentEl) {
            spentEl.style.borderColor = '#cbd5e1';
            spentEl.style.backgroundColor = '#ffffff';
        }
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.style.opacity = '1';
            saveBtn.style.cursor = 'pointer';
        }
        return;
    }

    const maxBudget = Number(camp.max_budget || 0);
    const totalSpent = Number(camp.total_spent || 0);
    const remaining = Math.max(0, maxBudget - totalSpent);

    if (infoBox) {
        infoBox.style.display = 'block';
        infoBox.innerHTML = `
            <div style="font-size:12px;font-weight:700;color:#6b21a8;">
                🎯 Chiến dịch: <strong>${camp.name}</strong><br>
                🎯 Mục tiêu: <span style="color:#475569;">${camp.target_goal}</span><br>
                💰 Ngân Sách Tối Đa: <strong style="color:#059669;">${_mktFmt(maxBudget)}</strong> | 
                Đã Chi: <strong style="color:#2563eb;">${_mktFmt(totalSpent)}</strong> | 
                Hạn Mức Còn Lại: <strong style="color:${remaining >= entered ? '#059669' : '#dc2626'};">${_mktFmt(remaining)}</strong>
            </div>
        `;
    }

    if (entered > remaining) {
        spentEl.style.borderColor = '#ef4444';
        spentEl.style.backgroundColor = '#fef2f2';
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.style.opacity = '0.5';
            saveBtn.style.cursor = 'not-allowed';
        }
        showToast(`⚠️ Chi phí thực tế (${_mktFmt(entered)}) vượt quá Hạn Mức Còn Lại (${_mktFmt(remaining)}) của Chiến dịch "${camp.name}"!`, 'warning');
    } else {
        spentEl.style.borderColor = '#cbd5e1';
        spentEl.style.backgroundColor = '#ffffff';
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.style.opacity = '1';
            saveBtn.style.cursor = 'pointer';
        }
    }
};

function _mktOpenCostModal(item = null) {
    const modal = document.getElementById('mktCostModalOverlay');
    const title = document.getElementById('mktCostModalTitle');
    const costId = document.getElementById('mktCostId');
    const dateEl = document.getElementById('mktCostDate');
    const catSelect = document.getElementById('mktCostCategory');
    const spentEl = document.getElementById('mktCostSpent');
    const notesEl = document.getElementById('mktCostNotes');
    const imageUrlEl = document.getElementById('mktCostImageUrl');

    if (!modal) return;

    // Check permissions per user
    const user = typeof currentUser !== 'undefined' ? currentUser : (window.currentUser || {});
    const isManager = user.role === 'giam_doc' || user.role === 'quan_ly_cap_cao' || user.role === 'quan_ly';
    const userName = (user.full_name || user.name || user.username || '').toLowerCase().trim();

    const allCategories = _mktNavState.categories || [];
    let categories = allCategories;

    // If regular Marketing staff, filter categories to assigned ones (either Ads Handler OR Allowed Reporter)
    if (!isManager && userName) {
        categories = allCategories.filter(c => {
            const h = (c.ads_handler_name || '').toLowerCase().trim();
            const rep = (c.allowed_reporter_names || '').toLowerCase().trim();
            const isHandler = Boolean(h && (h.includes(userName) || userName.includes(h)));
            const isReporter = Boolean(rep && rep.includes(userName));
            return isHandler || isReporter;
        });

        if (categories.length === 0) {
            showToast('⚠️ Bạn chưa được Giám Đốc phân công Mục/Page Marketing nào để báo chi phí!', 'warning');
            return;
        }
    }

    let catHtml = '';

    function buildCategoryOptions(groupType, groupLabel) {
        let hasOptions = false;
        let res = `<optgroup label="${groupLabel}">`;

        allCategories.forEach(parent => {
            if (parent.group_type !== groupType || parent.parent_id) return;

            const parentMatches = categories.some(c => Number(c.id) === Number(parent.id));
            const childrenMatches = categories.filter(c => Number(c.parent_id) === Number(parent.id));

            if (parentMatches || childrenMatches.length > 0) {
                hasOptions = true;
                const srcLabel = parent.linked_source_name ? ` (🔗 ${parent.linked_source_name})` : '';

                if (parentMatches || isManager) {
                    res += `<option value="${parent.id}">📌 ${parent.icon || '📂'} ${parent.name}${srcLabel}</option>`;
                }

                childrenMatches.forEach(child => {
                    const childSrc = child.linked_source_name ? ` (🔗 ${child.linked_source_name})` : '';
                    const handler = child.ads_handler_name ? ` [👤 ${child.ads_handler_name}]` : '';
                    res += `<option value="${child.id}">&nbsp;&nbsp;&nbsp;&nbsp;└── ${child.icon || '📄'} ${child.name}${childSrc}${handler}</option>`;
                });
            }
        });

        res += `</optgroup>`;
        return hasOptions ? res : '';
    }

    catHtml += buildCategoryOptions('online', '🌐 MARKETING ONLINE');
    catHtml += buildCategoryOptions('offline', '🏢 MARKETING OFFLINE');

    catSelect.innerHTML = catHtml;
    catSelect.disabled = true;
    catSelect.style.background = '#f1f5f9';
    catSelect.style.fontWeight = '700';
    catSelect.style.cursor = 'not-allowed';

    if (item) {
        title.textContent = '✏️ Sửa Chi Phí Marketing';
        costId.value = item.id;
        if (dateEl) dateEl.value = item.budget_date || '';
        catSelect.value = item.category_id || (catSelect.options[0] ? catSelect.options[0].value : '');
        spentEl.value = item.spent_amount || '';
        notesEl.value = item.notes || '';
        const reportLinkEl = document.getElementById('mktCostReportLink');
        if (reportLinkEl) reportLinkEl.value = item.report_link || '';
        if (imageUrlEl) imageUrlEl.value = item.image_url || '';
        if (item.image_url) {
            _mktSetCostImagePreview(item.image_url);
        } else {
            _mktRemoveCostImage();
        }
        _mktPopulateCostCampaigns(item.campaign_id, item.category_id);
    } else {
        title.textContent = '➕ Nhập Chi Phí Marketing';
        const nowD = new Date();
        const todayStr = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-${String(nowD.getDate()).padStart(2, '0')}`;
        if (dateEl) dateEl.value = todayStr;
        if (_mktNavState.selectedCatId !== 'all' && catSelect.querySelector(`option[value="${_mktNavState.selectedCatId}"]`)) {
            catSelect.value = _mktNavState.selectedCatId;
        } else if (catSelect.options[0]) {
            catSelect.value = catSelect.options[0].value;
        }
        spentEl.value = '';
        notesEl.value = '';
        const reportLinkEl = document.getElementById('mktCostReportLink');
        if (reportLinkEl) reportLinkEl.value = '';
        _mktRemoveCostImage();
        _mktPopulateCostCampaigns(null, catSelect.value);
    }

    modal.style.display = 'flex';

    // Focus on paste drop area for quick Ctrl+V
    const dropArea = document.getElementById('mktCostImageDropArea');
    if (dropArea) dropArea.focus();
}

function _mktTriggerCostImageUpload() {
    const fileInput = document.getElementById('mktCostFileInput');
    if (fileInput) fileInput.click();
}

function _mktSetCostImagePreview(url) {
    const placeholder = document.getElementById('mktCostImagePlaceholder');
    const container = document.getElementById('mktCostImagePreviewContainer');
    const img = document.getElementById('mktCostImagePreview');
    const input = document.getElementById('mktCostImageUrl');

    if (input) input.value = url;
    if (img) img.src = url;
    if (placeholder) placeholder.style.display = 'none';
    if (container) container.style.display = 'inline-block';
}

function _mktRemoveCostImage() {
    const placeholder = document.getElementById('mktCostImagePlaceholder');
    const container = document.getElementById('mktCostImagePreviewContainer');
    const img = document.getElementById('mktCostImagePreview');
    const input = document.getElementById('mktCostImageUrl');
    const fileInput = document.getElementById('mktCostFileInput');

    if (input) input.value = '';
    if (img) img.src = '';
    if (fileInput) fileInput.value = '';
    if (placeholder) placeholder.style.display = 'block';
    if (container) container.style.display = 'none';
}

function _mktHandleCostImagePaste(e) {
    const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            const blob = items[i].getAsFile();
            const reader = new FileReader();
            reader.onload = function(evt) {
                _mktSetCostImagePreview(evt.target.result);
                showToast('📷 Đã dán ảnh hóa đơn từ bộ nhớ tạm!', 'success');
            };
            reader.readAsDataURL(blob);
            break;
        }
    }
}

function _mktHandleCostFileSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            _mktSetCostImagePreview(evt.target.result);
            showToast('📷 Đã chọn ảnh hóa đơn!', 'success');
        };
        reader.readAsDataURL(file);
    }
}

function _mktOnCostCategoryChange(catId) {
    const pageSec = document.getElementById('mktPageSection');
    if (pageSec) {
        pageSec.style.display = 'none';
    }
}

function _mktOnPageSelect(pageId) {
    // Hidden
}

window._mktCloseCostModal = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    const modal = document.getElementById('mktCostModalOverlay');
    if (modal) modal.style.setProperty('display', 'none', 'important');
    return false;
};
function _mktCloseCostModal(e) { return window._mktCloseCostModal(e); }

function _mktOpenMetaConfigModal() {
    if (!_mktIsGiamDoc()) {
        showToast('⚠️ Bạn không có quyền truy cập! Chỉ Giám Đốc mới được cấu hình.', 'error');
        return;
    }

    const modal = document.getElementById('mktMetaModalOverlay');
    const catSelect = document.getElementById('mktMetaCatSelect');
    if (!modal) return;

    const targetCats = _mktNavState.categories.filter(c => {
        if (c.pancake_page_id) return true;
        if (c.parent_id) {
            const p = _mktNavState.categories.find(parent => Number(parent.id) === Number(c.parent_id));
            if (p) {
                const pName = (p.name || '').toLowerCase();
                return pName.includes('facebook') || pName.includes('tiktok');
            }
            return true;
        }
        const nameLower = (c.name || '').toLowerCase();
        return nameLower.includes('facebook') || nameLower.includes('tiktok');
    });

    if (targetCats.length === 0) {
        catSelect.innerHTML = '<option value="">-- Chưa có Fanpage / Kênh Facebook Ads / Tiktok Ads nào --</option>';
    } else {
        catSelect.innerHTML = targetCats.map(c => `
            <option value="${c.id}">${c.parent_id ? '  └── 📄 ' : '📂 '}${c.name}</option>
        `).join('');
    }

    if (_mktNavState.selectedCatId !== 'all' && targetCats.some(tc => Number(tc.id) === Number(_mktNavState.selectedCatId))) {
        catSelect.value = _mktNavState.selectedCatId;
    } else if (targetCats.length > 0) {
        catSelect.value = targetCats[0].id;
    }
    _mktOnMetaCatChange(catSelect.value);

    modal.style.setProperty('display', 'flex', 'important');
}

window._mktCloseMetaConfigModal = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    const modal = document.getElementById('mktMetaModalOverlay');
    if (modal) modal.style.setProperty('display', 'none', 'important');
    return false;
};
function _mktCloseMetaConfigModal(e) { return window._mktCloseMetaConfigModal(e); }

function _mktOnMetaCatChange(catId) {
    const nameInput = document.getElementById('mktMetaAdAccountName');
    const accInput = document.getElementById('mktMetaAdAccountId');
    const linkInput = document.getElementById('mktMetaAdAccountLink');
    const devNameInput = document.getElementById('mktMetaDevAccountName');
    const devLinkInput = document.getElementById('mktMetaDevAccountLink');
    const devPortalInput = document.getElementById('mktMetaDevPortalLink');
    const tokenInput = document.getElementById('mktMetaAccessToken');

    const cat = _mktNavState.categories.find(c => Number(c.id) === Number(catId));
    if (cat) {
        if (nameInput) nameInput.value = cat.fb_ad_account_name || '';
        if (accInput) accInput.value = cat.fb_ad_account_id || '';
        if (linkInput) linkInput.value = cat.fb_ad_account_link || '';
        if (devNameInput) devNameInput.value = cat.fb_dev_account_name || '';
        if (devLinkInput) devLinkInput.value = cat.fb_dev_account_link || '';
        if (devPortalInput) devPortalInput.value = cat.fb_dev_portal_link || '';
        if (tokenInput) tokenInput.value = cat.fb_access_token || '';
    }
}

async function _mktSaveMetaConfig(e) {
    e.preventDefault();
    if (!_mktIsGiamDoc()) {
        showToast('⚠️ Bạn không có quyền thao tác! Chỉ Giám Đốc mới có thể lưu.', 'error');
        return;
    }

    const catId = document.getElementById('mktMetaCatSelect').value;
    if (!catId) {
        showToast('⚠️ Vui lòng chọn Kênh / Page!', 'error');
        return;
    }

    const fb_ad_account_name = document.getElementById('mktMetaAdAccountName').value;
    const fb_ad_account_id = document.getElementById('mktMetaAdAccountId').value;
    const fb_ad_account_link = document.getElementById('mktMetaAdAccountLink').value;
    const fb_dev_account_name = document.getElementById('mktMetaDevAccountName')?.value || '';
    const fb_dev_account_link = document.getElementById('mktMetaDevAccountLink')?.value || '';
    const fb_dev_portal_link = document.getElementById('mktMetaDevPortalLink')?.value || '';
    const fb_access_token = document.getElementById('mktMetaAccessToken').value;

    if (!fb_ad_account_name || !fb_ad_account_id || !fb_ad_account_link || !fb_access_token) {
        showToast('⚠️ Vui lòng điền đầy đủ các thông tin bắt buộc!', 'error');
        return;
    }

    try {
        const res = await apiCall(`/api/marketing-categories/${catId}/meta-config`, 'POST', {
            fb_ad_account_name,
            fb_ad_account_id,
            fb_ad_account_link,
            fb_dev_account_name,
            fb_dev_account_link,
            fb_dev_portal_link,
            fb_access_token
        });

        if (res.success) {
            showToast('✅ Đã lưu đầy đủ cấu hình Meta API!', 'success');
            _mktCloseMetaConfigModal();
            const catRes = await apiCall('/api/marketing-categories');
            if (catRes.success) {
                _mktNavState.categories = catRes.data || [];
            }
            _mktLoadBudgets();
        }
    } catch(err) {
        showToast('❌ Lỗi: ' + err.message, 'error');
    }
}

async function _mktSyncMetaInsights() {
    if (!_mktIsGiamDoc()) {
        showToast('⚠️ Bạn không có quyền thao tác! Chỉ Giám Đốc mới có thể rút dữ liệu Meta Ads.', 'error');
        return;
    }

    showToast('🔄 Đang kết nối Meta Ads Graph API để rút chi phí & tin nhắn từng ngày...', 'info');
    try {
        const res = await apiCall('/api/marketing-budgets/sync-facebook-insights', 'POST', {
            year: _mktNavState.selectedYear,
            month: _mktNavState.selectedMonth,
            category_id: _mktNavState.selectedCatId
        });

        if (res.success) {
            showToast(`✅ ${res.message}`, 'success');
            _mktLoadBudgets();
        }
    } catch(err) {
        showToast('❌ Lỗi rút dữ liệu Meta API: ' + err.message, 'error');
    }
}

async function _mktPopulateAdsHandlerUsers(selectedHandler = 'Giám Đốc', selectedReporters = []) {
    const select = document.getElementById('mktCatAdsHandlerSelect');
    const reportersBox = document.getElementById('mktCatReportersBox');
    if (!select || !reportersBox) return;

    let userList = [{ full_name: 'Giám Đốc', role: 'giam_doc' }];

    try {
        const uRes = await apiCall('/api/marketing-categories/marketing-users');
        if (uRes.success && Array.isArray(uRes.users)) {
            uRes.users.forEach(u => {
                const uName = u.full_name || u.name || u.username;
                if (uName && !userList.some(item => item.full_name === uName)) {
                    userList.push({ full_name: uName, role: u.role || 'Nhân Viên', department: u.department_name || '' });
                }
            });
        }
    } catch(e) {}

    // 1. Single Select for Ads Handler (Only 1 person allowed)
    let singleHtml = '';
    userList.forEach(u => {
        const deptTxt = u.department ? ` - ${u.department}` : '';
        singleHtml += `<option value="${u.full_name}">👤 ${u.full_name}${deptTxt}</option>`;
    });
    select.innerHTML = singleHtml;
    if (selectedHandler) select.value = selectedHandler;

    // Parse selectedReporters
    let reportersArr = [];
    if (Array.isArray(selectedReporters)) {
        reportersArr = selectedReporters;
    } else if (typeof selectedReporters === 'string' && selectedReporters.trim()) {
        try {
            reportersArr = JSON.parse(selectedReporters);
        } catch(pe) {
            reportersArr = selectedReporters.split(',').map(s => s.trim());
        }
    }
    if (reportersArr.length === 0) {
        reportersArr = ['Giám Đốc'];
        if (selectedHandler && !reportersArr.includes(selectedHandler)) {
            reportersArr.push(selectedHandler);
        }
    }

    // 2. Multi Checkboxes for Reporters (Multiple selection allowed)
    let multiHtml = '';
    userList.forEach(u => {
        const isChecked = reportersArr.includes(u.full_name);
        const deptTxt = u.department ? ` <span style="font-size:11px;color:#64748b;">(${u.department})</span>` : '';
        multiHtml += `
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#1e293b;cursor:pointer;padding:3px 0;">
                <input type="checkbox" name="mkt_reporter" value="${u.full_name}" ${isChecked ? 'checked' : ''} style="width:16px;height:16px;accent-color:#2563eb;">
                <span>👤 ${u.full_name}${deptTxt}</span>
            </label>
        `;
    });
    if (reportersBox) reportersBox.innerHTML = multiHtml;
}

window._mktOnParentCategoryChange = function(parentVal) {
    const sourceSelect = document.getElementById('mktCatSourceSelect');
    const sourceNote = document.getElementById('mktCatSourceNote');
    const sourceBox = document.getElementById('mktCatSourceBox');

    if (!parentVal) {
        if (sourceSelect) {
            sourceSelect.value = '';
            sourceSelect.disabled = true;
            sourceSelect.style.background = '#f1f5f9';
            sourceSelect.style.cursor = 'not-allowed';
        }
        if (sourceBox) {
            sourceBox.style.background = '#fffbeb';
            sourceBox.style.border = '1.5px solid #fde68a';
        }
        if (sourceNote) {
            sourceNote.style.display = 'block';
        }
    } else {
        if (sourceSelect) {
            sourceSelect.disabled = false;
            sourceSelect.style.background = 'white';
            sourceSelect.style.cursor = 'pointer';
        }
        if (sourceBox) {
            sourceBox.style.background = '#f8fafc';
            sourceBox.style.border = '1px solid #e2e8f0';
        }
        if (sourceNote) {
            sourceNote.style.display = 'none';
        }
    }
};

async function _mktOpenCatModal(groupType, defaultParentId = null) {
    if (!_mktIsGiamDoc()) {
        showToast('⚠️ Bạn không có quyền thao tác! Chỉ Giám Đốc mới được tạo mục.', 'error');
        return;
    }

    const modal = document.getElementById('mktCatModalOverlay');
    const title = document.getElementById('mktCatModalTitle');
    const catIdEl = document.getElementById('mktCatId');
    const submitBtn = document.getElementById('mktCatSubmitBtn');
    const groupInput = document.getElementById('mktCatGroupType');
    const groupDisplay = document.getElementById('mktCatGroupDisplay');
    const parentSelect = document.getElementById('mktCatParentSelect');
    const pancakeSelect = document.getElementById('mktCatPancakePageSelect');
    const nameEl = document.getElementById('mktCatName');
    const iconEl = document.getElementById('mktCatIcon');
    const sourceSelect = document.getElementById('mktCatSourceSelect');
    const deleteBtn = document.getElementById('mktCatDeleteBtn');

    const parentBox = document.getElementById('mktCatParentBox');
    if (parentBox) parentBox.style.display = 'block';

    if (!modal) return;
    if (catIdEl) catIdEl.value = '';
    if (title) title.textContent = '➕ Tạo Mục Marketing Mới';
    if (submitBtn) submitBtn.textContent = '➕ Tạo Mục Mới';
    if (deleteBtn) deleteBtn.style.display = 'none';

    groupInput.value = groupType;
    groupDisplay.value = groupType === 'online' ? '🌐 Marketing Online' : '🏢 Marketing Offline';
    nameEl.value = '';
    nameEl.readOnly = false;
    nameEl.style.background = 'white';
    nameEl.style.fontWeight = 'normal';

    iconEl.value = groupType === 'online' ? '📄' : '🏢';

    const topCats = _mktNavState.categories.filter(c => c.group_type === groupType && !c.parent_id);
    let parentHtml = '<option value="">-- Không chọn (Tạo làm Mục Chính Cấp 1) --</option>';
    topCats.forEach(p => {
        parentHtml += `<option value="${p.id}" ${Number(p.id) === Number(defaultParentId) ? 'selected' : ''}>📂 ${p.icon || '📌'} ${p.name}</option>`;
    });
    parentSelect.innerHTML = parentHtml;

    pancakeSelect.innerHTML = '<option value="">-- Chọn Page Pancake để tự động nhập Tên & Nguồn --</option>' + _mktNavState.pages.map(p => `
        <option value="${p.id}">📄 ${p.name} (Nguồn: ${p.default_source} | Ads: ${p.ads_handler})</option>
    `).join('');

    let html = '<option value="">-- Không gắn Nguồn cố định --</option>';
    html += '<optgroup label="📌 Nguồn Khách Hệ Thống">';
    const allSources = [];
    const addedNames = new Set();
    const rawSources = [
        ...(_mktNavState.sources.nhu_cau || []),
        ...(_mktNavState.sources.sale || [])
    ];
    rawSources.forEach(s => {
        if (s && s.name) {
            const cleanName = s.name.trim();
            if (!addedNames.has(cleanName)) {
                addedNames.add(cleanName);
                allSources.push({ type: s.type || 'nhu_cau', name: cleanName });
            }
        }
    });
    allSources.forEach(s => {
        html += `<option value="${s.type}:${s.name}">${s.name}</option>`;
    });
    html += '</optgroup>';

    sourceSelect.innerHTML = html;
    sourceSelect.disabled = false;
    sourceSelect.style.background = 'white';

    await _mktPopulateAdsHandlerUsers('Giám Đốc', ['Giám Đốc']);

    _mktOnCatPancakePageSelect('');
    _mktOnParentCategoryChange(parentSelect.value);

    modal.style.setProperty('display', 'flex', 'important');
}

async function _mktOpenEditCatModal(catId) {
    if (!_mktIsGiamDoc()) {
        showToast('⚠️ Bạn không có quyền thao tác! Chỉ Giám Đốc mới được sửa mục.', 'error');
        return;
    }

    const cat = _mktNavState.categories.find(c => Number(c.id) === Number(catId));
    if (!cat) {
        showToast('⚠️ Không tìm thấy mục cần sửa!', 'error');
        return;
    }

    await _mktOpenCatModal(cat.group_type, cat.parent_id);

    const title = document.getElementById('mktCatModalTitle');
    const catIdEl = document.getElementById('mktCatId');
    const submitBtn = document.getElementById('mktCatSubmitBtn');
    const nameEl = document.getElementById('mktCatName');
    const iconEl = document.getElementById('mktCatIcon');
    const sourceSelect = document.getElementById('mktCatSourceSelect');
    const pancakeBox = document.getElementById('mktCatPancakeBox');

    const deleteBtn = document.getElementById('mktCatDeleteBtn');

    if (catIdEl) catIdEl.value = cat.id;
    if (title) title.textContent = `✏️ Sửa & Phân Công: ${cat.name}`;
    if (submitBtn) submitBtn.textContent = '💾 Lưu Cấu Hình & Phân Công';
    if (deleteBtn) deleteBtn.style.display = 'inline-block';

    if (nameEl) nameEl.value = cat.name || '';
    if (iconEl) iconEl.value = cat.icon || '';
    if (sourceSelect && cat.linked_source_name) {
        const targetVal = `${cat.linked_source_type || 'sale'}:${cat.linked_source_name}`;
        sourceSelect.value = targetVal;
    }

    _mktOnParentCategoryChange(cat.parent_id);

    // Hide Parent Category selection box if editing an existing Parent Category
    const parentBox = document.getElementById('mktCatParentBox');
    if (parentBox) {
        if (!cat.parent_id) {
            parentBox.style.display = 'none';
        } else {
            parentBox.style.display = 'block';
        }
    }

    // Hide Pancake Page selection box when editing an existing category
    if (pancakeBox) pancakeBox.style.display = 'none';

    await _mktPopulateAdsHandlerUsers(cat.ads_handler_name || 'Giám Đốc', cat.allowed_reporter_names);
}

window._mktCloseCatModal = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    const modal = document.getElementById('mktCatModalOverlay');
    if (modal) {
        modal.style.setProperty('display', 'none', 'important');
    }
    const catModals = document.querySelectorAll('#mktCatModalOverlay, .mkt-modal-overlay');
    catModals.forEach(m => {
        if (m.querySelector('#mktCatForm') || m.querySelector('#mktCatModalTitle')) {
            m.style.setProperty('display', 'none', 'important');
        }
    });
    return false;
};

async function _mktDeleteCatCurrent() {
    if (!_mktIsGiamDoc()) {
        showToast('⚠️ Bạn không có quyền thao tác! Chỉ Giám Đốc mới có quyền xóa mục.', 'error');
        return;
    }

    const catId = document.getElementById('mktCatId') ? document.getElementById('mktCatId').value : '';
    if (!catId) return;

    const cat = _mktNavState.categories.find(c => Number(c.id) === Number(catId));
    const catName = cat ? cat.name : 'mục này';

    if (!confirm(`⚠️ XÁC NHẬN XÓA MỤC MARKETING:\n\nBạn có chắc chắn muốn XÓA mục "${catName}" không?\n\n(Hành động này sẽ ẩn mục khỏi danh sách)`)) {
        return;
    }

    try {
        const res = await apiCall(`/api/marketing-categories/${catId}`, 'DELETE');
        if (res.success) {
            showToast(`✅ Đã xóa thành công mục Marketing: ${catName}`, 'success');
            _mktCloseCatModal();
            _mktLoadBudgets();
        }
    } catch(err) {
        showToast('❌ Lỗi khi xóa mục Marketing: ' + err.message, 'error');
    }
}
function _mktCloseCatModal(e) { return window._mktCloseCatModal(e); }

function _mktOnParentCategoryChange(parentId) {
    const box = document.getElementById('mktCatPancakeBox');
    if (!box) return;
    if (parentId || _mktNavState.selectedGroup === 'online') {
        box.style.display = 'block';
    } else {
        box.style.display = 'none';
    }
}

function _mktOnCatPancakePageSelect(pageId) {
    const infoBox = document.getElementById('mktCatPancakeInfo');
    const nameEl = document.getElementById('mktCatName');
    const sourceSelect = document.getElementById('mktCatSourceSelect');
    const sourceTxt = document.getElementById('mktCatPageSourceTxt');
    const handlerTxt = document.getElementById('mktCatPageHandlerTxt');

    const page = _mktNavState.pages.find(p => String(p.id) === String(pageId));
    if (page) {
        if (nameEl) {
            nameEl.value = page.name;
            nameEl.readOnly = true;
            nameEl.style.background = '#f1f5f9';
            nameEl.style.fontWeight = '700';
        }
        if (sourceTxt) sourceTxt.textContent = page.default_source || '—';
        if (handlerTxt) handlerTxt.textContent = page.ads_handler || '—';
        if (infoBox) infoBox.style.display = 'block';

        if (sourceSelect && page.default_source) {
            for (let i = 0; i < sourceSelect.options.length; i++) {
                if (sourceSelect.options[i].text.includes(page.default_source) || sourceSelect.options[i].value.includes(page.default_source)) {
                    sourceSelect.selectedIndex = i;
                    break;
                }
            }
            sourceSelect.disabled = true;
            sourceSelect.style.background = '#f1f5f9';
            sourceSelect.style.fontWeight = '700';
        }
    } else {
        if (nameEl) {
            nameEl.readOnly = false;
            nameEl.style.background = 'white';
            nameEl.style.fontWeight = 'normal';
        }
        if (sourceSelect) {
            sourceSelect.disabled = false;
            sourceSelect.style.background = 'white';
            sourceSelect.style.fontWeight = 'normal';
        }
        if (infoBox) infoBox.style.display = 'none';
    }
}

async function _mktSyncPancakePages() {
    if (!_mktIsGiamDoc()) {
        showToast('⚠️ Bạn không có quyền thao tác! Chỉ Giám Đốc mới có thể đồng bộ.', 'error');
        return;
    }

    try {
        const res = await apiCall('/api/marketing-categories/sync-pancake-pages', 'POST');
        if (res.success) {
            showToast(`✅ ${res.message}`, 'success');
            const catRes = await apiCall('/api/marketing-categories');
            if (catRes.success) {
                _mktNavState.categories = catRes.data || [];
            }
            _mktRenderSidebar();
        }
    } catch(e) {
        showToast('❌ Lỗi đồng bộ Page: ' + e.message, 'error');
    }
}

function _mktCloseCatModal() {
    const modal = document.getElementById('mktCostModalOverlay');
    if (modal) modal.style.display = 'none';
}

function _mktEditCost(id) {
    const item = _mktNavState.budgetsData.find(b => Number(b.id) === Number(id));
    if (item) _mktOpenCostModal(item);
}

async function _mktDeleteCost(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa bản ghi chi phí này?')) return;
    try {
        const res = await apiCall(`/api/marketing-budgets/${id}`, 'DELETE');
        if (res.success) {
            showToast('✅ Đã xóa thành công!', 'success');
            _mktLoadBudgets();
        }
    } catch(e) {
        showToast('❌ Lỗi: ' + e.message, 'error');
    }
}

async function _mktSaveCost(e) {
    e.preventDefault();
    const id = document.getElementById('mktCostId').value;
    const catId = document.getElementById('mktCostCategory').value;
    const catObj = _mktNavState.categories.find(c => Number(c.id) === Number(catId));
    const budget_date = document.getElementById('mktCostDate') ? document.getElementById('mktCostDate').value : null;
    const notes = document.getElementById('mktCostNotes') ? document.getElementById('mktCostNotes').value.trim() : '';
    const spent_amount = document.getElementById('mktCostSpent') ? document.getElementById('mktCostSpent').value : 0;
    const imageUrl = document.getElementById('mktCostImageUrl') ? document.getElementById('mktCostImageUrl').value : '';
    const reportLink = document.getElementById('mktCostReportLink') ? document.getElementById('mktCostReportLink').value.trim() : '';

    if (!budget_date) {
        showToast('⚠️ Vui lòng chọn Ngày Cụ Thể!', 'error');
        return;
    }
    if (!notes) {
        showToast('⚠️ Vui lòng nhập Nội Dung Chi Marketing!', 'error');
        return;
    }

    const campaignSelect = document.getElementById('mktCostCampaignSelect');
    const campaign_id = campaignSelect && campaignSelect.value ? Number(campaignSelect.value) : null;

    if (!campaign_id) {
        showToast('⚠️ Bắt buộc phải chọn Chiến Dịch Marketing để kiểm soát ngân sách tối đa!', 'warning');
        if (campaignSelect) campaignSelect.focus();
        return;
    }

    if (!reportLink) {
        showToast('⚠️ Bắt buộc phải nhập 🔗 Đường Link Báo Chi Phí!', 'warning');
        const reportEl = document.getElementById('mktCostReportLink');
        if (reportEl) reportEl.focus();
        return;
    }

    if (!imageUrl) {
        showToast('⚠️ Bắt buộc phải dán/tải 🖼️ Ảnh Hóa Đơn / Bill Chi Phí (Ấn Ctrl + V)!', 'warning');
        return;
    }

    const payload = {
        category_id: catId,
        campaign_id: campaign_id,
        group_type: catObj ? catObj.group_type : 'online',
        channel_name: catObj ? catObj.name : 'Khác',
        budget_date: budget_date,
        spent_amount: spent_amount || 0,
        notes: notes,
        image_url: imageUrl || null,
        report_link: reportLink || null,
        pancake_page_id: catObj ? catObj.pancake_page_id : null,
        pancake_page_name: catObj ? catObj.pancake_page_name : null,
        linked_source_name: catObj ? catObj.linked_source_name : null,
        ads_handler_name: catObj ? catObj.ads_handler_name : null,
        fb_ad_account_name: catObj ? catObj.fb_ad_account_name : null,
        fb_ad_account_link: catObj ? catObj.fb_ad_account_link : null
    };

    try {
        let res;
        if (id) {
            res = await apiCall(`/api/marketing-budgets/${id}`, 'PUT', payload);
        } else {
            res = await apiCall('/api/marketing-budgets', 'POST', payload);
        }

        if (res.success) {
            showToast('✅ Đã lưu chi phí Marketing thành công!', 'success');
            _mktCloseCostModal();
            _mktLoadBudgets();
        }
    } catch(err) {
        showToast('❌ Lỗi: ' + err.message, 'error');
    }
}

async function _mktSaveCat(e) {
    e.preventDefault();
    if (!_mktIsGiamDoc()) {
        showToast('⚠️ Bạn không có quyền thao tác! Chỉ Giám Đốc mới có thể thao tác.', 'error');
        return;
    }

    const catId = document.getElementById('mktCatId') ? document.getElementById('mktCatId').value : '';
    const group_type = document.getElementById('mktCatGroupType').value;
    const parent_id = document.getElementById('mktCatParentSelect').value;
    const pancake_page_id = document.getElementById('mktCatPancakePageSelect').value;
    const name = document.getElementById('mktCatName').value;
    const icon = document.getElementById('mktCatIcon').value;
    const sourceVal = document.getElementById('mktCatSourceSelect').value;
    const ads_handler_name = document.getElementById('mktCatAdsHandlerSelect') ? document.getElementById('mktCatAdsHandlerSelect').value : null;

    const pageObj = _mktNavState.pages.find(p => String(p.id) === String(pancake_page_id));

    let linked_source_type = null;
    let linked_source_name = null;

    if (sourceVal && sourceVal.includes(':')) {
        const parts = sourceVal.split(':');
        linked_source_type = parts[0];
        linked_source_name = parts.slice(1).join(':');
    } else if (pageObj && pageObj.default_source) {
        linked_source_type = 'sale';
        linked_source_name = pageObj.default_source;
    }

    const selectedReporters = Array.from(document.querySelectorAll('#mktCatReportersBox input[name="mkt_reporter"]:checked')).map(cb => cb.value);

    const payload = {
        group_type, 
        parent_id: parent_id || null,
        name, 
        icon,
        linked_source_type,
        linked_source_name,
        ads_handler_name: ads_handler_name || (pageObj ? pageObj.ads_handler : null),
        allowed_reporter_names: JSON.stringify(selectedReporters),
        pancake_page_id: pageObj ? pageObj.id : null,
        pancake_page_name: pageObj ? pageObj.name : null
    };

    try {
        let res;
        if (catId) {
            res = await apiCall(`/api/marketing-categories/${catId}`, 'PUT', payload);
        } else {
            res = await apiCall('/api/marketing-categories', 'POST', payload);
        }

        if (res.success) {
            showToast(catId ? '✅ Đã cập nhật cấu hình & phân công thành công!' : '✅ Đã tạo mục Marketing mới!', 'success');
            _mktCloseCatModal();
            const catRes = await apiCall('/api/marketing-categories');
            if (catRes.success) {
                _mktNavState.categories = catRes.data || [];
            }
            _mktRenderSidebar();
            _mktLoadBudgets();
        }
    } catch(err) {
        showToast('❌ Lỗi: ' + err.message, 'error');
    }
}

async function _mktDeleteCat(catId, catName) {
    if (!_mktIsGiamDoc()) {
        showToast('⚠️ Bạn không có quyền thao tác! Chỉ Giám Đốc mới có thể xóa mục.', 'error');
        return;
    }

    if (!confirm(`Bạn có chắc chắn muốn XÓA mục "${catName}" và các mục con trực thuộc không?`)) return;
    try {
        const res = await apiCall(`/api/marketing-categories/${catId}`, 'DELETE');
        if (res.success) {
            showToast(`✅ Đã xóa mục "${catName}"!`, 'success');
            if (Number(_mktNavState.selectedCatId) === Number(catId)) {
                _mktNavState.selectedCatId = 'all';
            }
            const catRes = await apiCall('/api/marketing-categories');
            if (catRes.success) {
                _mktNavState.categories = catRes.data || [];
            }
            _mktRenderSidebar();
            _mktLoadBudgets();
        }
    } catch(e) {
        showToast('❌ Lỗi xóa mục: ' + e.message, 'error');
    }
}
