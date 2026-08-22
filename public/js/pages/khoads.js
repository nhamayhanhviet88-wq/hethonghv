// ========== KHO VIDEO/ẢNH ADS PAGE ==========

function _khoAdsGetAuthHeaders() {
    const headers = {};
    const token = localStorage.getItem('token') || (document.cookie.match(/token=([^;]+)/) || [])[1];
    if (token && token !== 'null' && token !== 'undefined') {
        headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
}

function _khoAdsIsSuperUser() {
    const u = window._currentUser;
    if (!u) return false;
    return u.role === 'giam_doc' || u.role === 'admin' || !!u.is_admin;
}

async function _khoAdsApi(url, method = 'GET', body = null) {
    const opts = {
        method,
        headers: _khoAdsGetAuthHeaders(),
        credentials: 'include'
    };
    if (body) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    return await res.json();
}

var _khoAdsData = window._khoAdsData || {
    activeMainTab: 'tasks', // 'tasks' or 'items'
    viewMode: 'grid', // 'grid' or 'table'
    currentPage: 1,
    pageSize: 12,
    tasks: [],
    items: [],
    linhVucList: [],
    editingId: null
};
window._khoAdsData = _khoAdsData;

async function renderKhoadsPage(container) {
    if (!container || !(container instanceof HTMLElement)) {
        container = document.getElementById('mainContent') || document.getElementById('app') || document.querySelector('.main-content') || document.body;
    }
    if (!container) return;

    const isGiamDoc = _khoAdsIsSuperUser();

    container.innerHTML = `
        <div style="padding: 24px 32px; width: 100%; box-sizing: border-box; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;">
            <!-- Header Banner -->
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #4338ca 100%); border-radius: 20px; padding: 32px 40px; color: white; margin-bottom: 24px; box-shadow: 0 10px 25px -5px rgba(67, 56, 202, 0.3); position: relative; overflow: hidden; display: flex; justify-content: space-between; align-items: center;">
                <div style="position: absolute; right: 260px; bottom: -30px; font-size: 160px; opacity: 0.12; user-select: none;">🎬</div>
                <div style="z-index: 1;">
                    <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(255, 255, 255, 0.18); backdrop-filter: blur(8px); padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 12px;">
                        <span>📢 Bộ Phận Marketing Ads</span>
                    </div>
                    <h2 style="margin: 0 0 8px; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">🎬 Kho Video / Ảnh Ads</h2>
                    <p style="margin: 0; font-size: 14px; opacity: 0.9; max-width: 650px; line-height: 1.5;">
                        Kho lưu trữ tư liệu, tài nguyên Video & Hình Ảnh phục vụ các chiến dịch chạy Quảng Cáo (Facebook Ads, TikTok Ads, Google Ads).
                    </p>
                </div>
                <div style="z-index: 1; display: flex; gap: 12px; align-items: center;">
                    ${isGiamDoc ? `
                        <button onclick="openModalManageLinhVucKhoAds()" style="background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(8px); color: white; border: 1px solid rgba(255, 255, 255, 0.4); padding: 12px 18px; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                            <span style="font-size: 16px;">⚙️</span> Cấu Hình Lĩnh Vực
                        </button>
                    ` : ''}
                    <button onclick="openModalCreateKhoAdsItem()" style="background: #10b981; color: white; border: none; padding: 12px 22px; border-radius: 12px; font-weight: 700; font-size: 14.5px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4); transition: all 0.2s ease;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                        <span style="font-size: 18px;">➕</span> Thêm Tư Liệu Ads Mới
                    </button>
                </div>
            </div>

            <!-- MAIN VIEW TABS: MỤC 1 VS MỤC 2 -->
            <div style="display: flex; gap: 12px; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 2px;">
                <button id="btnKhoAdsTabTasks" onclick="switchKhoAdsMainTab('tasks')" style="padding: 12px 24px; border: none; background: transparent; font-size: 16px; font-weight: 800; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.3px; color: #4338ca; border-bottom: 3px solid #4338ca; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
                    <span>📋</span> <span id="lblKhoAdsTabTasksText">Mục 1: Theo Công Việc</span>
                </button>
                <button id="btnKhoAdsTabItems" onclick="switchKhoAdsMainTab('items')" style="padding: 12px 24px; border: none; background: transparent; font-size: 16px; font-weight: 800; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.3px; color: #64748b; border-bottom: 3px solid transparent; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
                    <span>📦</span> <span id="lblKhoAdsTabItemsText">Mục 2: Kho Ads Cá Nhân</span>
                </button>
            </div>

            <!-- Filter Toolbar -->
            <div style="background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 20px 24px; margin-bottom: 24px; box-shadow: 0 4px 15px -2px rgba(0,0,0,0.04); display: flex; flex-direction: column; gap: 14px;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 800; color: #0f172a; font-family: 'Inter', sans-serif;">
                        <span>🔍</span>
                        <span id="lblKhoAdsFilterTitle">TÌM KIẾM & LỌC CÔNG VIỆC MARKETING ADS</span>
                    </div>

                    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                        <!-- View Mode Switcher for Muc 2 -->
                        <div id="boxKhoAdsViewModeSwitch" style="display: flex; background: #f1f5f9; padding: 3px; border-radius: 10px; gap: 4px; border: 1px solid #cbd5e1;">
                            <button id="btnKhoAdsViewGrid" onclick="setKhoAdsViewMode('grid')" style="padding: 7px 15px; border: none; border-radius: 7px; background: white; color: #4338ca; font-weight: 800; font-size: 13px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); white-space: nowrap; transition: all 0.2s;">
                                <span>🖼️</span> <span>Xem Lưới</span>
                            </button>
                            <button id="btnKhoAdsViewTable" onclick="setKhoAdsViewMode('table')" style="padding: 7px 15px; border: none; border-radius: 7px; background: transparent; color: #64748b; font-weight: 800; font-size: 13px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; cursor: pointer; display: flex; align-items: center; gap: 6px; white-space: nowrap; transition: all 0.2s;">
                                <span>📋</span> <span>Xem Bảng</span>
                            </button>
                        </div>

                        <div id="khoAdsResultCount" style="font-size: 12px; font-weight: 800; color: #4338ca; background: #eef2ff; padding: 6px 14px; border-radius: 20px; border: 1px solid #c7d2fe; font-family: 'Inter', sans-serif;">
                            Hiển thị 0 mục
                        </div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 2fr 1.2fr 1fr 1fr auto; gap: 12px; align-items: center;">
                    <!-- 1. Search Box -->
                    <div style="position: relative;">
                        <input type="text" id="iptSearchKhoAds" onkeyup="applyKhoAdsFilters()" placeholder="🔍 Tìm mã công việc, tên công việc, tư liệu..." style="width: 100%; padding: 10px 14px 10px 36px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 600; background: #fafafa; outline: none; transition: all 0.2s;" onfocus="this.style.borderColor='#4338ca';this.style.background='white';this.style.boxShadow='0 0 0 3px rgba(67,56,202,0.1)'" onblur="this.style.borderColor='#cbd5e1';this.style.boxShadow='none'">
                        <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 14px; opacity: 0.5;">🔍</span>
                    </div>

                    <!-- 2. Select Lĩnh Vực -->
                    <div>
                        <select id="selFilterKhoAdsLinhVuc" onchange="applyKhoAdsFilters()" style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 600; color: #1e293b; background: #fafafa; cursor: pointer; outline: none;">
                            <option value="">🏢 Tất cả Lĩnh Vực Ads</option>
                        </select>
                    </div>

                    <!-- 3. Select Loại Tư Liệu -->
                    <div>
                        <select id="selFilterKhoAdsMediaType" onchange="applyKhoAdsFilters()" style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 600; color: #1e293b; background: #fafafa; cursor: pointer; outline: none;">
                            <option value="">🎬 Tất cả loại tư liệu</option>
                            <option value="video">🎥 Video Ads</option>
                            <option value="image">🖼️ Ảnh Ads</option>
                        </select>
                    </div>

                    <!-- 4. Select Sắp Xếp -->
                    <div>
                        <select id="selFilterKhoAdsSort" onchange="applyKhoAdsFilters()" style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 600; color: #1e293b; background: #fafafa; cursor: pointer; outline: none;">
                            <option value="newest">🕒 Mới nhất trước</option>
                            <option value="oldest">⏳ Cũ nhất trước</option>
                            <option value="az">🔤 Tên A - Z</option>
                        </select>
                    </div>

                    <!-- 5. Reset Button -->
                    <div>
                        <button onclick="resetKhoAdsFilters()" style="padding: 10px 16px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 700; color: #475569; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='#e2e8f0';this.style.color='#0f172a'" onmouseout="this.style.background='#f1f5f9';this.style.color='#475569'">🔄 Đặt Lại</button>
                    </div>
                </div>
            </div>

            <!-- Items List Container -->
            <div id="khoAdsGridContainer">
                <div style="text-align: center; padding: 60px; color: #64748b; font-size: 15px;">⏳ Đang tải dữ liệu Kho Ads...</div>
            </div>
        </div>

        <!-- MODAL CẤU HÌNH LĨNH VỰC ADS -->
        <div id="modalManageLinhVucKhoAds" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); z-index: 9999; justify-content: center; align-items: center; padding: 24px;">
            <div style="background: white; border-radius: 20px; width: 100%; max-width: 580px; box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.35); overflow: hidden; display: flex; flex-direction: column;">
                <div style="background: linear-gradient(135deg, #1e1b4b, #4338ca); padding: 20px 24px; color: white; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 22px;">⚙️</span>
                        <div>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 800;">Cấu Hình Lĩnh Vực Ads</h3>
                            <div style="font-size: 12px; opacity: 0.8;">Tạo danh mục Lĩnh Vực chạy Quảng Cáo</div>
                        </div>
                    </div>
                    <button onclick="closeModalManageLinhVucKhoAds()" style="background: rgba(255,255,255,0.2); border: none; font-size: 16px; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: white; font-weight: bold;">✕</button>
                </div>

                <div style="padding: 24px; display: flex; flex-direction: column; gap: 20px;">
                    <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0;">
                        <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 10px;">➕ Thêm Lĩnh Vực Ads Mới:</label>
                        <div style="display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap;">
                            <div style="flex: 1.5; min-width: 180px;">
                                <label style="display: block; font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 4px;">TÊN LĨNH VỰC *</label>
                                <input type="text" id="iptNewLinhVucKhoAdsName" placeholder="VD: Spa, Áo Lớp, Xưởng May..." style="width: 100%; box-sizing: border-box; padding: 9px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; outline: none; background: white;">
                            </div>
                            <div style="flex: 1; min-width: 120px;">
                                <label style="display: block; font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 4px;">MÃ (CODE) *</label>
                                <input type="text" id="iptNewLinhVucKhoAdsCode" placeholder="VD: SPA, AL..." style="width: 100%; box-sizing: border-box; padding: 9px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 800; text-transform: uppercase; outline: none; background: white;">
                            </div>
                        </div>
                        <div style="display: flex; justify-content: flex-end;">
                            <button onclick="addNewLinhVucKhoAds()" style="background: #4338ca; color: white; border: none; padding: 9px 20px; border-radius: 8px; font-weight: 800; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 3px 10px rgba(67,56,202,0.25); transition: all 0.2s;" onmouseover="this.style.background='#3730a3'" onmouseout="this.style.background='#4338ca'">➕ Thêm Lĩnh Vực Mới</button>
                        </div>
                    </div>

                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 10px;">Danh Sách Lĩnh Vực Ads Hiện Tại:</label>
                        <div id="listLinhVucManageKhoAds" style="display: flex; flex-direction: column; gap: 8px; max-height: 250px; overflow-y: auto;"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL THÊM / SỬA TƯ LIỆU ADS -->
        <div id="modalCreateKhoAdsItem" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); z-index: 9999; justify-content: center; align-items: center; padding: 20px; overflow-y: auto;">
            <div style="background: white; border-radius: 20px; width: 100%; max-width: 1100px; max-height: 92vh; box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.35); overflow: hidden; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <!-- HEADER MODAL -->
                <div style="background: linear-gradient(135deg, #0f172a, #4338ca); padding: 18px 24px; color: white; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;" id="lblKhoAdsModalIcon">➕</span>
                        <div>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 800;" id="lblKhoAdsModalTitle">Thêm Tư Liệu Ads Mới</h3>
                            <div style="font-size: 12px; opacity: 0.8;">Đăng tài nguyên Video/Ảnh chạy Quảng Cáo</div>
                        </div>
                    </div>
                    <button onclick="closeModalCreateKhoAdsItem()" style="background: rgba(255,255,255,0.2); border: none; font-size: 16px; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: white; font-weight: bold;">✕</button>
                </div>

                <!-- TOP SELECTION: CHỌN TASK LIÊN KẾT -->
                <div style="padding: 16px 24px 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 10px; flex-shrink: 0;">
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">🔗 Liên Kết Với Công Việc (PHÒNG MARKETING) <span style="color:#dc2626">*</span></label>
                        <select id="selKhoAdsTaskId" onchange="onKhoAdsTaskSelectChange()" style="width: 100%; padding: 11px 12px; border: 1.5px solid #6366f1; border-radius: 10px; font-size: 13.5px; font-weight: 700; outline: none; background: #eef2ff; color: #3730a3;">
                            <option value="">-- Vui lòng chọn Công Việc liên kết --</option>
                        </select>
                    </div>

                    <!-- BANNER SỐ LƯỢNG CẦN SẢN XUẤT & THANH TABS N TƯ LIỆU -->
                    <div id="boxKhoAdsTargetInfo" style="display: none; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 10px 16px; flex-direction: column; gap: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                            <div style="font-size: 13px; font-weight: 800; color: #3730a3;" id="lblKhoAdsTargetQtyText">
                                🔢 SỐ LƯỢNG CẦN SẢN XUẤT: <strong>5</strong> sản phẩm / video / ảnh
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                                <div style="font-size: 12px; font-weight: 800; color: #059669; background: #d1fae5; padding: 4px 12px; border-radius: 20px;" id="lblKhoAdsProgressCounter">
                                    📊 Tiến độ hoàn thành: 0 / 5
                                </div>
                                <div id="boxKhoAdsApprovalStatus" style="display: flex; align-items: center; gap: 8px;"></div>
                            </div>
                        </div>

                        <!-- TABS SUB-ITEMS 1..N -->
                        <div id="boxKhoAdsSubItemTabs" style="display: flex; gap: 8px; flex-wrap: wrap; border-top: 1px dashed #a5b4fc; padding-top: 8px;">
                            <!-- Dynamic Tabs render here -->
                        </div>
                    </div>
                </div>

                <!-- MAIN FORM 2 CỘT (MẶC ĐỊNH ẨN KHI CHƯA CHỌN TASK - ANH 3) -->
                <div id="boxKhoAdsMainFormBody" style="padding: 20px 24px; display: none; grid-template-columns: 360px 1fr; gap: 24px; overflow-y: auto; flex: 1;">
                    <!-- CỘT BÊN TRÁI: 🖼️ HÌNH ẢNH / THUMBNAIL (DÁN CTRL + V) -->
                    <div style="display: flex; flex-direction: column; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; height: 100%;">
                        <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a;">🖼️ Hình Ảnh / Thumbnail <span style="color:#dc2626">*</span></label>

                        <!-- Khung xem trước & dán ảnh qua Ctrl + V -->
                        <div id="boxKhoAdsThumbPreview" style="width: 100%; flex: 1; min-height: 360px; border: 2px dashed #a5b4fc; border-radius: 12px; background: #eef2ff; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; overflow: hidden; position: relative; padding: 10px; transition: border-color 0.2s;">
                            <div style="font-size: 36px; margin-bottom: 8px;">🖼️</div>
                            <div style="font-size: 13px; font-weight: 800; color: #4338ca; margin-bottom: 4px;">Dán ảnh qua Ctrl + V</div>
                            <div style="font-size: 11.5px; color: #64748b; font-weight: 600;">(Bắt buộc dán ảnh cho từng tư liệu)</div>
                        </div>
                        <input type="hidden" id="iptKhoAdsThumbnailUrl">
                    </div>

                    <!-- CỘT BÊN PHẢI: THÔNG TIN TƯ LIỆU ADS -->
                    <div style="display: flex; flex-direction: column; gap: 14px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">📌 Tên Video/Ảnh Ads <span style="color:#dc2626">*</span> <span style="font-size:11px;font-weight:600;color:#64748b;">(Tự động)</span></label>
                            <input type="text" id="iptKhoAdsTitle" readonly placeholder="Tự động sinh ra dạng ADSCT001-1 - Công Ty..." style="width: 100%; padding: 11px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13.5px; font-weight: 700; outline: none; background: #f1f5f9; color: #334155; cursor: not-allowed;">
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div>
                                <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">🏢 Lĩnh Vực Ads <span style="color:#dc2626">*</span> <span style="font-size:11px;font-weight:600;color:#64748b;">(Tự động)</span></label>
                                <select id="selKhoAdsLinhVuc" disabled style="width: 100%; padding: 11px 12px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 700; outline: none; background: #f1f5f9; color: #334155; cursor: not-allowed;">
                                    <option value="">-- Lĩnh Vực Tự Động --</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">🎬 Loại Tư Liệu <span style="color:#dc2626">*</span></label>
                                <select id="selKhoAdsMediaType" onchange="onKhoAdsSubItemInput('media_type', this.value)" style="width: 100%; padding: 11px 12px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 600; outline: none; background: white;">
                                    <option value="video">🎥 Video Ads</option>
                                    <option value="image">🖼️ Ảnh Ads</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <label style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0;">📝 Content Ads <span style="color:#dc2626">*</span></label>
                                <button id="btnCopyKhoAdsContent" onclick="copyKhoAdsContentText()" style="padding: 5px 12px; background: #eef2ff; color: #4338ca; border: 1.5px solid #c7d2fe; border-radius: 8px; font-size: 12px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s;" onmouseover="this.style.background='#e0e7ff'" onmouseout="this.style.background='#eef2ff'">
                                    <span>📋</span> <span>Copy Content</span>
                                </button>
                            </div>
                            <textarea id="txtKhoAdsDescription" oninput="onKhoAdsSubItemInput('description', this.value)" rows="10" placeholder="Nhập nội dung kịch bản / bài viết / mô tả Content Ads..." style="width: 100%; padding: 14px; border: 1.5px solid #cbd5e1; border-radius: 12px; font-size: 13.5px; outline: none; font-family: inherit; resize: vertical; min-height: 260px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.03);"></textarea>
                        </div>

                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <label style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0;">🔗 Link Google Drive <span style="color:#dc2626">*</span> <span style="font-size:11px;font-weight:600;color:#64748b;">(bắt đầu bằng https://drive.google.com/drive...)</span></label>
                                <button id="btnOpenKhoAdsDriveUrl" onclick="openKhoAdsDriveUrlTab()" style="padding: 5px 12px; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: 12px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(37,99,235,0.25); transition: all 0.2s;" onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">
                                    <span>🔗</span> <span>Mở Link Drive ↗</span>
                                </button>
                            </div>
                            <input type="url" id="iptKhoAdsDriveUrl" oninput="onKhoAdsSubItemInput('drive_url', this.value)" placeholder="https://drive.google.com/drive..." style="width: 100%; padding: 11px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13.5px; outline: none;">
                        </div>
                    </div>
                </div>

                <!-- FOOTER ACTIONS & NAVIGATION -->
                <div id="boxKhoAdsFooterActions" style="padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: none; justify-content: space-between; align-items: center;">
                    <div style="display: flex; gap: 8px;">
                        <button id="btnKhoAdsPrevTab" onclick="navKhoAdsSubItemTab(-1)" style="padding: 8px 14px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; color: #475569; font-weight: 700; font-size: 12.5px; cursor: pointer;">⬅️ Tư liệu trước</button>
                        <button id="btnKhoAdsNextTab" onclick="navKhoAdsSubItemTab(1)" style="padding: 8px 14px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; color: #475569; font-weight: 700; font-size: 12.5px; cursor: pointer;">Tư liệu tiếp ➡️</button>
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <button id="btnKhoAdsCloseModal" onclick="closeModalCreateKhoAdsItem()" style="padding: 10px 20px; border-radius: 10px; border: 1px solid #cbd5e1; background: white; color: #475569; font-weight: 700; font-size: 13px; cursor: pointer;">Hủy</button>
                        <button id="btnKhoAdsSubmitAll" onclick="submitCreateKhoAdsItem()" style="padding: 10px 24px; border-radius: 10px; border: none; background: linear-gradient(135deg, #10b981, #059669); color: white; font-weight: 800; font-size: 13.5px; cursor: pointer; box-shadow: 0 4px 12px rgba(16,185,129,0.3);">💾 Lưu Tất Cả Tư Liệu Ads</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    await loadKhoAdsData();
}

function updateKhoAdsMainTabBadges() {
    const taskCount = (_khoAdsData.tasks || []).length;
    const itemCount = (_khoAdsData.items || []).length;

    const elTasks = document.getElementById('lblKhoAdsTabTasksText');
    const elItems = document.getElementById('lblKhoAdsTabItemsText');

    if (elTasks) elTasks.innerText = `Mục 1: Theo Công Việc (${taskCount})`;
    if (elItems) elItems.innerText = `Mục 2: Kho Ads Cá Nhân (${itemCount})`;
}

async function loadKhoAdsData() {
    const gridContainer = document.getElementById('khoAdsGridContainer');
    if (!gridContainer) return;

    try {
        const [resLinhVuc, resTasks, resItems] = await Promise.all([
            _khoAdsApi('/api/kho-ads/linh-vuc'),
            _khoAdsApi('/api/kho-ads/tasks-grouped'),
            _khoAdsApi('/api/kho-ads/items')
        ]);

        _khoAdsData.linhVucList = (resLinhVuc && resLinhVuc.linh_vuc_list) || [];
        _khoAdsData.tasks = (resTasks && resTasks.tasks) || [];
        _khoAdsData.items = (resItems && resItems.items) || [];

        updateKhoAdsMainTabBadges();
        populateKhoAdsLinhVucSelects();
        switchKhoAdsMainTab(_khoAdsData.activeMainTab || 'tasks', false);
        applyKhoAdsFilters();
    } catch(e) {
        console.error('[loadKhoAdsData error]', e);
        gridContainer.innerHTML = `<div style="color: #ef4444; padding: 20px; text-align: center;">❌ Lỗi khi tải dữ liệu Kho Ads: ${e.message}</div>`;
    }
}

function setKhoAdsViewMode(mode) {
    _khoAdsData.viewMode = mode;
    _khoAdsData.currentPage = 1;
    const btnGrid = document.getElementById('btnKhoAdsViewGrid');
    const btnTable = document.getElementById('btnKhoAdsViewTable');

    if (mode === 'grid') {
        if (btnGrid) {
            btnGrid.style.background = 'white';
            btnGrid.style.color = '#4338ca';
            btnGrid.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        }
        if (btnTable) {
            btnTable.style.background = 'transparent';
            btnTable.style.color = '#64748b';
            btnTable.style.boxShadow = 'none';
        }
    } else {
        if (btnGrid) {
            btnGrid.style.background = 'transparent';
            btnGrid.style.color = '#64748b';
            btnGrid.style.boxShadow = 'none';
        }
        if (btnTable) {
            btnTable.style.background = 'white';
            btnTable.style.color = '#4338ca';
            btnTable.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        }
    }
    applyKhoAdsFilters();
}

function changeKhoAdsPage(page) {
    _khoAdsData.currentPage = Number(page);
    applyKhoAdsFilters();
    const container = document.getElementById('khoAdsGridContainer');
    if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function switchKhoAdsMainTab(tabName, triggerFilter = true) {
    _khoAdsData.activeMainTab = tabName;
    _khoAdsData.currentPage = 1;

    const btnTasks = document.getElementById('btnKhoAdsTabTasks');
    const btnItems = document.getElementById('btnKhoAdsTabItems');
    const titleFilter = document.getElementById('lblKhoAdsFilterTitle');
    const iptSearch = document.getElementById('iptSearchKhoAds');
    const boxViewMode = document.getElementById('boxKhoAdsViewModeSwitch');
    const selSort = document.getElementById('selFilterKhoAdsSort');

    if (tabName === 'tasks') {
        if (btnTasks) {
            btnTasks.style.color = '#4338ca';
            btnTasks.style.borderBottom = '3px solid #4338ca';
        }
        if (btnItems) {
            btnItems.style.color = '#64748b';
            btnItems.style.borderBottom = '3px solid transparent';
        }
        if (boxViewMode) boxViewMode.style.display = 'none';
        if (selSort && selSort.parentElement) selSort.parentElement.style.display = 'none';
        if (titleFilter) titleFilter.innerText = 'TÌM KIẾM & LỌC CÔNG VIỆC MARKETING ADS';
        if (iptSearch) iptSearch.placeholder = '🔍 Tìm mã công việc, tên công việc, tư liệu Ads...';
    } else {
        if (btnTasks) {
            btnTasks.style.color = '#64748b';
            btnTasks.style.borderBottom = '3px solid transparent';
        }
        if (btnItems) {
            btnItems.style.color = '#4338ca';
            btnItems.style.borderBottom = '3px solid #4338ca';
        }
        if (boxViewMode) boxViewMode.style.display = 'flex';
        if (selSort && selSort.parentElement) selSort.parentElement.style.display = 'block';
        if (titleFilter) titleFilter.innerText = 'TÌM KIẾM & LỌC KHO ADS CÁ NHÂN';
        if (iptSearch) iptSearch.placeholder = '🔍 Tìm tiêu đề, nội dung tư liệu Ads cá nhân...';
    }

    if (triggerFilter) applyKhoAdsFilters();
}

function populateKhoAdsLinhVucSelects() {
    const list = _khoAdsData.linhVucList || [];

    // 1. Filter Select
    const filterSel = document.getElementById('selFilterKhoAdsLinhVuc');
    if (filterSel) {
        const curVal = filterSel.value;
        let html = '<option value="">🏢 Tất cả Lĩnh Vực Ads</option>';
        list.forEach(item => {
            const label = item.code ? `🏢 ${escapeHtml(item.name)} (${escapeHtml(item.code)})` : `🏢 ${escapeHtml(item.name)}`;
            html += `<option value="${escapeHtml(item.name)}">${label}</option>`;
        });
        filterSel.innerHTML = html;
        if (curVal) filterSel.value = curVal;
    }

    // 2. Create Modal Select
    const modalSel = document.getElementById('selKhoAdsLinhVuc');
    if (modalSel) {
        const curVal = modalSel.value;
        let html = '<option value="">-- Chọn Lĩnh Vực --</option>';
        list.forEach(item => {
            const label = item.code ? `🏢 ${escapeHtml(item.name)} (${escapeHtml(item.code)})` : `🏢 ${escapeHtml(item.name)}`;
            html += `<option value="${escapeHtml(item.name)}">${label}</option>`;
        });
        modalSel.innerHTML = html;
        if (curVal) modalSel.value = curVal;
    }
}

function applyKhoAdsFilters() {
    if (_khoAdsData.activeMainTab === 'tasks') {
        renderKhoAdsTasksGroupedView();
    } else {
        renderKhoAdsItemsGridCardsView();
    }
}

async function openKhoAdsTaskDetailModal(taskId, initialItemId = null) {
    const task = (_khoAdsData.tasks || []).find(t => Number(t.id) === Number(taskId));
    if (!task) return;

    _khoAdsData.editingId = null;
    _khoAdsData.targetQty = task.target_quantity || 1;
    _khoAdsData.subItems = [];
    _khoAdsData.activeSubIndex = 0;

    document.getElementById('lblKhoAdsModalTitle').innerText = 'Chi Tiết & Quản Lý Tư Liệu Ads Công Việc';
    document.getElementById('lblKhoAdsModalIcon').innerText = '📋';

    setKhoAdsModalReadonlyMode(true);

    populateKhoAdsLinhVucSelects();
    window.removeEventListener('paste', handlePasteKhoAdsThumbnail);
    window.addEventListener('paste', handlePasteKhoAdsThumbnail);

    await loadMarketingTasksForKhoAdsModal(task.id, false, task);

    const existingItems = task.items || [];
    const targetQty = task.target_quantity || Math.max(existingItems.length, 1);

    _khoAdsData.targetQty = targetQty;
    _khoAdsData.subItems = [];

    let targetSubIndex = 0;

    for (let i = 0; i < targetQty; i++) {
        if (existingItems[i]) {
            if (initialItemId && Number(existingItems[i].id) === Number(initialItemId)) {
                targetSubIndex = i;
            }
            _khoAdsData.subItems.push({
                id: existingItems[i].id,
                title: existingItems[i].title,
                linh_vuc: existingItems[i].linh_vuc,
                media_type: existingItems[i].media_type || 'video',
                drive_url: existingItems[i].drive_url || '',
                thumbnail_url: existingItems[i].thumbnail_url || '',
                description: existingItems[i].description || ''
            });
        } else {
            const autoTitle = buildKhoAdsSubItemTitle(task.title, task.ads_linh_vuc || 'Công Ty', i);
            _khoAdsData.subItems.push({
                title: autoTitle,
                linh_vuc: task.ads_linh_vuc || 'Công Ty',
                media_type: 'video',
                drive_url: '',
                thumbnail_url: '',
                description: ''
            });
        }
    }

    _khoAdsData.activeSubIndex = targetSubIndex;
    renderKhoAdsSubItemTabs();
    loadActiveSubItemToForm(targetSubIndex);

    // Render Approval Status & Button (Điều Kiện 2) in Modal
    const statusBox = document.getElementById('boxKhoAdsApprovalStatus');
    if (statusBox) {
        const curUser = window._currentUser || {};
        const curUserId = Number(curUser.id || 0);
        const userRole = (curUser.role || '').toLowerCase();
        const isDirector = ['giam_doc', 'admin', 'ban_giam_doc', 'quan_ly_cap_cao'].includes(userRole) || !!curUser.is_admin;
        const isAssignor = Number(task.created_by) === curUserId;

        if (task.kho_ads_approved) {
            statusBox.innerHTML = `<div style="font-size: 12px; font-weight: 800; color: #15803d; background: #dcfce7; border: 1px solid #86efac; padding: 4px 12px; border-radius: 20px; display: inline-flex; align-items: center; gap: 6px;"><span>✅</span> <span>ĐÃ PHÊ DUYỆT TƯ LIỆU ADS (Bởi ${escapeHtml(task.kho_ads_approved_by_name || 'Người giao việc')})</span></div>`;
        } else if (isAssignor || isDirector) {
            statusBox.innerHTML = `<button onclick="approveKhoAdsTaskFromModal(${task.id})" style="padding: 6px 16px; background: linear-gradient(135deg, #16a34a, #15803d); color: white; border: none; border-radius: 20px; font-size: 12px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(22,163,74,0.35); font-family: 'Inter', sans-serif;" onmouseover="this.style.background='#15803d'" onmouseout="this.style.background='linear-gradient(135deg, #16a34a, #15803d)'"><span>✅</span> <span>DUYỆT TƯ LIỆU ADS CÔNG VIỆC (ĐK 2)</span></button>`;
        } else {
            statusBox.innerHTML = `<div style="font-size: 12px; font-weight: 800; color: #d97706; background: #fef3c7; border: 1px solid #fde68a; padding: 4px 12px; border-radius: 20px; display: inline-flex; align-items: center; gap: 6px;"><span>⏳</span> <span>Chờ Người Giao Việc (${escapeHtml(task.creator_name || 'Người giao việc')}) Phê Duyệt Ads</span></div>`;
        }
    }

    const modal = document.getElementById('modalCreateKhoAdsItem');
    if (modal) modal.style.display = 'flex';
}

async function approveKhoAdsTaskFromModal(taskId) {
    if (!confirm('Bạn có chắc chắn muốn PHÊ DUYỆT TƯ LIỆU ADS cho công việc này tại Kho Ads?')) return;
    try {
        const res = await fetch(`/api/kho-ads/tasks/${taskId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            },
            body: JSON.stringify({})
        }).then(r => r.json());

        if (res && res.ok) {
            alert('🎉 Đã phê duyệt Tư Liệu Ads Công Việc thành công!');
            await loadKhoAdsData();
            openKhoAdsTaskDetailModal(taskId);
        } else {
            alert((res && res.error) || 'Lỗi khi phê duyệt tư liệu Ads!');
        }
    } catch(e) {
        console.error('[approveKhoAdsTaskFromModal error]', e);
        alert('Lỗi kết nối máy chủ!');
    }
}

function openKhoAdsItemDetailFromPersonal(itemId) {
    const item = (_khoAdsData.items || []).find(i => Number(i.id) === Number(itemId));
    if (!item) return;

    if (item.task_id) {
        openKhoAdsTaskDetailModal(item.task_id, item.id);
    } else {
        _khoAdsData.editingId = null;
        _khoAdsData.targetQty = 1;
        _khoAdsData.subItems = [{
            id: item.id,
            title: item.title,
            linh_vuc: item.linh_vuc,
            media_type: item.media_type || 'video',
            drive_url: item.drive_url || '',
            thumbnail_url: item.thumbnail_url || '',
            description: item.description || ''
        }];
        _khoAdsData.activeSubIndex = 0;

        document.getElementById('lblKhoAdsModalTitle').innerText = 'Chi Tiết Tư Liệu Ads';
        document.getElementById('lblKhoAdsModalIcon').innerText = '📋';

        setKhoAdsModalReadonlyMode(true);
        populateKhoAdsLinhVucSelects();

        renderKhoAdsSubItemTabs();
        loadActiveSubItemToForm(0);

        const modal = document.getElementById('modalCreateKhoAdsItem');
        if (modal) modal.style.display = 'flex';
    }
}

async function openKhoAdsTaskEditModal(taskId) {
    const task = (_khoAdsData.tasks || []).find(t => Number(t.id) === Number(taskId));
    if (!task) return;

    const isGiamDoc = _khoAdsIsSuperUser();
    if (task.kho_ads_approved && !isGiamDoc) {
        alert('⚠️ Công việc này đã được Phê Duyệt tư liệu Ads (ĐK 2). Chỉ Giám Đốc mới có quyền chỉnh sửa thêm!');
        return;
    }

    _khoAdsData.editingId = null;
    _khoAdsData.targetQty = task.target_quantity || 1;
    _khoAdsData.subItems = [];
    _khoAdsData.activeSubIndex = 0;

    document.getElementById('lblKhoAdsModalTitle').innerText = '✏️ Chỉnh Sửa Tư Liệu Ads Công Việc';
    document.getElementById('lblKhoAdsModalIcon').innerText = '✏️';

    setKhoAdsModalReadonlyMode(false);

    populateKhoAdsLinhVucSelects();
    window.removeEventListener('paste', handlePasteKhoAdsThumbnail);
    window.addEventListener('paste', handlePasteKhoAdsThumbnail);

    await loadMarketingTasksForKhoAdsModal(task.id, false, task);

    const existingItems = task.items || [];
    const targetQty = task.target_quantity || Math.max(existingItems.length, 1);

    _khoAdsData.targetQty = targetQty;
    _khoAdsData.subItems = [];

    for (let i = 0; i < targetQty; i++) {
        if (existingItems[i]) {
            _khoAdsData.subItems.push({
                id: existingItems[i].id,
                title: existingItems[i].title,
                linh_vuc: existingItems[i].linh_vuc,
                media_type: existingItems[i].media_type || 'video',
                drive_url: existingItems[i].drive_url || '',
                thumbnail_url: existingItems[i].thumbnail_url || '',
                description: existingItems[i].description || ''
            });
        } else {
            const autoTitle = buildKhoAdsSubItemTitle(task.title, task.ads_linh_vuc || 'Công Ty', i);
            _khoAdsData.subItems.push({
                title: autoTitle,
                linh_vuc: task.ads_linh_vuc || 'Công Ty',
                media_type: 'video',
                drive_url: '',
                thumbnail_url: '',
                description: ''
            });
        }
    }

    _khoAdsData.activeSubIndex = 0;
    renderKhoAdsSubItemTabs();
    loadActiveSubItemToForm(0);

    const modal = document.getElementById('modalCreateKhoAdsItem');
    if (modal) modal.style.display = 'flex';
}

// MỤC 1: THEO CÔNG VIỆC (TASK VIEW)
function renderKhoAdsTasksGroupedView() {
    const gridContainer = document.getElementById('khoAdsGridContainer');
    const countBadge = document.getElementById('khoAdsResultCount');
    if (!gridContainer) return;

    const keyword = (document.getElementById('iptSearchKhoAds')?.value || '').trim().toLowerCase();
    const selectedLinhVuc = document.getElementById('selFilterKhoAdsLinhVuc')?.value || '';
    const selectedType = document.getElementById('selFilterKhoAdsMediaType')?.value || '';

    let tasks = _khoAdsData.tasks || [];

    if (keyword) {
        tasks = tasks.filter(t => 
            (t.title && t.title.toLowerCase().includes(keyword)) ||
            (t.task_code && t.task_code.toLowerCase().includes(keyword)) ||
            (t.items && t.items.some(i => (i.title && i.title.toLowerCase().includes(keyword)) || (i.description && i.description.toLowerCase().includes(keyword))))
        );
    }

    if (countBadge) {
        countBadge.innerText = `Hiển thị ${tasks.length} công việc`;
    }

    if (tasks.length === 0) {
        gridContainer.innerHTML = `
            <div style="background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 48px 24px; text-align: center; color: #64748b;">
                <div style="font-size: 44px; margin-bottom: 12px;">📋</div>
                <div style="font-size: 16px; font-weight: 800; color: #1e293b; margin-bottom: 4px;">Chưa Có Công Việc Marketing Ads Nào Đã Tạo Tư Liệu</div>
                <div style="font-size: 13px;">Khi có tư liệu Ads mới được nộp cho công việc, công việc sẽ tự động xuất hiện tại đây!</div>
            </div>
        `;
        return;
    }

    const isGiamDoc = _khoAdsIsSuperUser();
    const curUserId = window._currentUser ? Number(window._currentUser.id) : null;

    let html = `<div style="display: flex; flex-direction: column; gap: 16px;">`;

    tasks.forEach(task => {
        const subItems = task.items || [];
        const targetQty = task.target_quantity || 1;
        const progressCount = subItems.length;
        const isCompleted = progressCount >= targetQty;

        html += `
            <div style="background: white; border-radius: 16px; border: 1.5px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 15px -2px rgba(0,0,0,0.04); transition: border-color 0.2s;">
                <!-- TASK HEADER BANNER (CLICK TO OPEN MODAL DETAIL - ANH 1) -->
                <div onclick="openKhoAdsTaskDetailModal(${task.id})" style="background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%); padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)'" onmouseout="this.style.background='linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)'">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 22px;">📋</span>
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                <span style="background: #4338ca; color: white; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 800;">${escapeHtml(task.task_code || ('CV-MKT-' + task.id))}</span>
                                <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">${escapeHtml(task.title)}</h3>
                            </div>
                            <div style="font-size: 12px; color: #64748b; font-weight: 600; margin-top: 4px; display: flex; gap: 14px; flex-wrap: wrap;">
                                <span>👤 Người phụ trách: <strong>${escapeHtml(task.assignee_name || 'Hệ thống')}</strong></span>
                                <span>🏢 Phòng ban: <strong>${escapeHtml(task.department_name || 'PHÒNG MARKETING')}</strong></span>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <div style="font-size: 12px; font-weight: 800; color: ${isCompleted ? '#059669' : '#d97706'}; background: ${isCompleted ? '#d1fae5' : '#fef3c7'}; padding: 5px 14px; border-radius: 20px; border: 1px solid ${isCompleted ? '#a7f3d0' : '#fde68a'};">
                            📊 Tiến độ: ${progressCount} / ${targetQty} tư liệu
                        </div>

                        <button onclick="openKhoAdsTaskDetailModal(${task.id}); event.stopPropagation();" style="padding: 9px 18px; background: #4338ca; color: white; border: none; border-radius: 10px; font-size: 14.5px; font-weight: 800; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.3px; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(67,56,202,0.3); transition: all 0.2s;" onmouseover="this.style.background='#3730a3'" onmouseout="this.style.background='#4338ca'">
                            <span>👁️</span> <span>Xem Chi Tiết (${progressCount} tư liệu)</span>
                        </button>

                        ${(_khoAdsIsSuperUser() || !task.kho_ads_approved) ? `
                            <button onclick="openKhoAdsTaskEditModal(${task.id}); event.stopPropagation();" style="padding: 9px 16px; background: white; color: #4338ca; border: 1.5px solid #c7d2fe; border-radius: 10px; font-size: 14.5px; font-weight: 800; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.3px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;" onmouseover="this.style.background='#eef2ff'" onmouseout="this.style.background='white'">
                                <span>✏️</span> <span>Chỉnh Sửa</span>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    gridContainer.innerHTML = html;
}

// MỤC 2: KHO ADS CÁ NHÂN (GRID CARDS & TABLE VIEW WITH PAGINATION)
function renderKhoAdsItemsGridCardsView() {
    const gridContainer = document.getElementById('khoAdsGridContainer');
    const countBadge = document.getElementById('khoAdsResultCount');
    if (!gridContainer) return;

    const keyword = (document.getElementById('iptSearchKhoAds')?.value || '').trim().toLowerCase();
    const selectedLinhVuc = document.getElementById('selFilterKhoAdsLinhVuc')?.value || '';
    const selectedType = document.getElementById('selFilterKhoAdsMediaType')?.value || '';
    const sortVal = document.getElementById('selFilterKhoAdsSort')?.value || 'newest';

    let filtered = _khoAdsData.items || [];

    if (keyword) {
        filtered = filtered.filter(item => 
            (item.title && item.title.toLowerCase().includes(keyword)) ||
            (item.linh_vuc && item.linh_vuc.toLowerCase().includes(keyword)) ||
            (item.description && item.description.toLowerCase().includes(keyword))
        );
    }

    if (selectedLinhVuc) {
        filtered = filtered.filter(item => item.linh_vuc === selectedLinhVuc);
    }

    if (selectedType) {
        filtered = filtered.filter(item => item.media_type === selectedType);
    }

    // Sort items
    if (sortVal === 'newest') {
        filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (sortVal === 'oldest') {
        filtered.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    } else if (sortVal === 'az') {
        filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    if (countBadge) {
        countBadge.innerText = `Hiển thị ${filtered.length} tư liệu`;
    }

    if (filtered.length === 0) {
        gridContainer.innerHTML = `
            <div style="background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 48px 24px; text-align: center; color: #64748b;">
                <div style="font-size: 44px; margin-bottom: 12px;">📭</div>
                <div style="font-size: 16px; font-weight: 800; color: #1e293b; margin-bottom: 4px;">Chưa Có Tư Liệu Ads Nào</div>
                <div style="font-size: 13px;">Hãy bấm "➕ Thêm Tư Liệu Ads Mới" để đăng tải tư liệu đầu tiên!</div>
            </div>
        `;
        return;
    }

    // Pagination calculation
    const pageSize = _khoAdsData.pageSize || 12;
    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    if (_khoAdsData.currentPage > totalPages) _khoAdsData.currentPage = totalPages;
    if (_khoAdsData.currentPage < 1) _khoAdsData.currentPage = 1;
    const currentPage = _khoAdsData.currentPage || 1;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filtered.length);
    const paginatedItems = filtered.slice(startIndex, endIndex);

    const isGiamDoc = _khoAdsIsSuperUser();
    const curUserId = window._currentUser ? Number(window._currentUser.id) : null;
    const isTable = _khoAdsData.viewMode === 'table';

    let contentHtml = '';

    if (isTable) {
        // Table View
        contentHtml += `
            <div style="background: white; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 15px -2px rgba(0,0,0,0.04);">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <thead>
                        <tr style="background: linear-gradient(135deg, #0f172a, #1e1b4b); border-bottom: 2px solid #e2e8f0; color: white; font-weight: 800; font-size: 12px; font-family: 'Inter', sans-serif;">
                            <th style="padding: 14px 16px; width: 50px; text-align: center; white-space: nowrap;">STT</th>
                            <th style="padding: 14px 16px; width: 80px; text-align: center; white-space: nowrap;">ẢNH</th>
                            <th style="padding: 14px 16px; white-space: nowrap;">TÊN & CONTENT ADS</th>
                            <th style="padding: 14px 16px; width: 170px; white-space: nowrap;">LĨNH VỰC & TASK</th>
                            <th style="padding: 14px 16px; width: 130px; text-align: center; white-space: nowrap;">LOẠI ADS</th>
                            <th style="padding: 14px 16px; width: 180px; white-space: nowrap;">NGƯỜI TẠO / NGÀY TẠO</th>
                            <th style="padding: 14px 16px; text-align: center; width: 160px; white-space: nowrap;">HÀNH ĐỘNG</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        paginatedItems.forEach((item, idx) => {
            const isVideo = item.media_type === 'video';
            const typeBadge = isVideo 
                ? `<span style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 4px 12px; border-radius: 20px; font-size: 11.5px; font-weight: 800; font-family: 'Inter', sans-serif; white-space: nowrap; display: inline-flex; align-items: center; justify-content: center; gap: 5px;">🎥 Video Ads</span>`
                : `<span style="background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; padding: 4px 12px; border-radius: 20px; font-size: 11.5px; font-weight: 800; font-family: 'Inter', sans-serif; white-space: nowrap; display: inline-flex; align-items: center; justify-content: center; gap: 5px;">🖼️ Ảnh Ads</span>`;
            
            const defaultThumb = isVideo 
                ? 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=600&q=80'
                : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80';
            
            const thumbUrl = item.thumbnail_url || defaultThumb;
            const isApproved = Boolean(item.kho_ads_approved);
            const canManage = isGiamDoc || ((curUserId && Number(item.created_by) === curUserId) && !isApproved);
            const canEdit = isGiamDoc || !isApproved;

            contentHtml += `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                    <td style="padding: 12px 16px; text-align: center; font-weight: 700; color: #64748b;">${startIndex + idx + 1}</td>
                    <td style="padding: 12px 16px; text-align: center;">
                        <div onclick="openKhoAdsItemDetailFromPersonal(${item.id})" style="width: 52px; height: 52px; border-radius: 8px; overflow: hidden; background: #0f172a; cursor: pointer; margin: 0 auto; border: 1px solid #cbd5e1; box-shadow: 0 2px 5px rgba(0,0,0,0.08);">
                            <img src="${escapeHtml(thumbUrl)}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                    </td>
                    <td style="padding: 12px 16px;">
                        <div onclick="openKhoAdsItemDetailFromPersonal(${item.id})" style="cursor: pointer;">
                            <div style="font-weight: 800; color: #0f172a; font-size: 14px; margin-bottom: 3px; font-family: 'Inter', sans-serif;">${escapeHtml(item.title)}</div>
                            ${item.description ? `<div style="font-size: 12px; color: #64748b; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${escapeHtml(item.description)}</div>` : ''}
                        </div>
                    </td>
                    <td style="padding: 12px 16px;">
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <span style="font-weight: 800; color: #4338ca; font-size: 12px; font-family: 'Inter', sans-serif;">🏢 ${escapeHtml(item.linh_vuc)}</span>
                            ${item.task_id ? `
                                <button onclick="openKhoAdsItemDetailFromPersonal(${item.id})" style="background: #e0e7ff; color: #3730a3; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; font-family: 'Inter', sans-serif; border: 1px solid #c7d2fe; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; width: fit-content; white-space: nowrap;">
                                    📋 Task: ${escapeHtml(item.task_code || ('CV-MKT-' + item.task_id))} ↗
                                </button>
                            ` : '<span style="font-size: 11px; color: #94a3b8;">Chưa gắn Task</span>'}
                        </div>
                    </td>
                    <td style="padding: 12px 16px; text-align: center; white-space: nowrap;">${typeBadge}</td>
                    <td style="padding: 12px 16px;">
                        <div style="font-size: 12px; color: #334155; font-weight: 700;">👤 ${escapeHtml(item.created_by_name || 'Hệ thống')}</div>
                        <div style="font-size: 11px; color: #64748b;">📅 ${formatDateTime(item.created_at)}</div>
                    </td>
                    <td style="padding: 12px 16px; text-align: center;">
                        <div style="display: flex; gap: 6px; justify-content: center; align-items: center;">
                            ${item.drive_url ? `
                                <a href="${escapeHtml(item.drive_url)}" target="_blank" style="text-decoration: none; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 800; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(37,99,235,0.25);" title="Mở Link Google Drive">
                                    🔗 Drive ↗
                                </a>
                            ` : ''}
                            ${canEdit ? `
                                <button onclick="openKhoAdsItemDetailFromPersonal(${item.id})" style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; width: 32px; height: 32px; border-radius: 8px; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Xem & Sửa">✏️</button>
                            ` : `
                                <button onclick="openKhoAdsItemDetailFromPersonal(${item.id})" style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; width: 32px; height: 32px; border-radius: 8px; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Xem Chi Tiết (Đã Duyệt)">👁️</button>
                            `}
                            ${canManage ? `
                                <button onclick="deleteKhoAdsItem(${item.id})" style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; width: 32px; height: 32px; border-radius: 8px; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Xóa">🗑️</button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        });

        contentHtml += `
                    </tbody>
                </table>
            </div>
        `;
    } else {
        // Grid View
        contentHtml += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">`;
        paginatedItems.forEach(item => {
            const isVideo = item.media_type === 'video';
            const typeBadge = isVideo 
                ? `<span style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 3px 10px; border-radius: 20px; font-size: 11.5px; font-weight: 800;">🎥 Video Ads</span>`
                : `<span style="background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; padding: 3px 10px; border-radius: 20px; font-size: 11.5px; font-weight: 800;">🖼️ Ảnh Ads</span>`;
            
            const defaultThumb = isVideo 
                ? 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=600&q=80'
                : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80';
            
            const thumbUrl = item.thumbnail_url || defaultThumb;
            const isApproved = Boolean(item.kho_ads_approved);
            const canManage = isGiamDoc || ((curUserId && Number(item.created_by) === curUserId) && !isApproved);
            const canEdit = isGiamDoc || !isApproved;

            contentHtml += `
                <div style="background: white; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04); display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 10px 25px rgba(0,0,0,0.08)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.04)'">
                    <div onclick="openKhoAdsItemDetailFromPersonal(${item.id})" style="height: 180px; position: relative; background: #0f172a; overflow: hidden; cursor: pointer;">
                        <img src="${escapeHtml(thumbUrl)}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.85;">
                        <div style="position: absolute; top: 12px; left: 12px; display: flex; gap: 6px;">
                            <span style="background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); color: white; padding: 4px 12px; border-radius: 20px; font-size: 11.5px; font-weight: 800; border: 1px solid rgba(255,255,255,0.2);">🏢 ${escapeHtml(item.linh_vuc)}</span>
                        </div>
                        <div style="position: absolute; top: 12px; right: 12px;">
                            ${typeBadge}
                        </div>
                    </div>
                    <div style="padding: 18px; display: flex; flex-direction: column; flex: 1; justify-content: space-between; gap: 14px;">
                        <div onclick="openKhoAdsItemDetailFromPersonal(${item.id})" style="cursor: pointer;">
                            <h4 style="margin: 0 0 8px; font-size: 16px; font-weight: 800; color: #0f172a; line-height: 1.4;">${escapeHtml(item.title)}</h4>
                            ${item.description ? `<p style="margin: 0; font-size: 12.5px; color: #64748b; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${escapeHtml(item.description)}</p>` : ''}
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 10px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: #64748b; font-weight: 600;">
                                <span>👤 ${escapeHtml(item.created_by_name || 'Hệ thống')}</span>
                                <span>📅 Ngày tạo: <strong>${formatDateTime(item.created_at)}</strong></span>
                            </div>
                            ${item.task_id ? `
                                <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                                    <button onclick="openKhoAdsItemDetailFromPersonal(${item.id})" style="background: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 8px; font-size: 11.5px; font-weight: 800; border: 1px solid #c7d2fe; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;">
                                        📋 Task: ${escapeHtml(item.task_code || ('CV-MKT-' + item.task_id))} ↗
                                    </button>
                                </div>
                            ` : ''}

                            <div style="display: flex; gap: 8px; align-items: center;">
                                ${item.drive_url ? `
                                    <a href="${escapeHtml(item.drive_url)}" target="_blank" style="flex: 1; text-decoration: none; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 800; text-align: center; display: inline-flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 6px rgba(37,99,235,0.25);">
                                        🔗 Mở Google Drive ↗
                                    </a>
                                ` : `
                                    <span style="flex: 1; background: #f1f5f9; color: #94a3b8; padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; text-align: center;">Chưa có link Drive</span>
                                `}

                                ${canEdit ? `
                                    <button onclick="openKhoAdsItemDetailFromPersonal(${item.id})" style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; width: 32px; height: 32px; border-radius: 8px; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Xem & Sửa">✏️</button>
                                ` : `
                                    <button onclick="openKhoAdsItemDetailFromPersonal(${item.id})" style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; width: 32px; height: 32px; border-radius: 8px; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Xem Chi Tiết (Đã Duyệt)">👁️</button>
                                `}
                                ${canManage ? `
                                    <button onclick="deleteKhoAdsItem(${item.id})" style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; width: 32px; height: 32px; border-radius: 8px; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Xóa">🗑️</button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        contentHtml += `</div>`;
    }

    // Append Pagination Bar
    contentHtml += `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding: 14px 20px; background: white; border-radius: 14px; border: 1px solid #e2e8f0; flex-wrap: wrap; gap: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
            <div style="font-size: 13px; font-weight: 700; color: #64748b;">
                Hiển thị <strong>${startIndex + 1} - ${endIndex}</strong> trên tổng số <strong>${filtered.length}</strong> tư liệu Ads
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
                <button onclick="changeKhoAdsPage(1)" ${currentPage === 1 ? 'disabled' : ''} style="padding: 6px 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: ${currentPage === 1 ? '#f8fafc' : 'white'}; color: ${currentPage === 1 ? '#94a3b8' : '#334155'}; font-weight: 800; font-size: 12px; cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'};">⏮️ Đầu</button>
                <button onclick="changeKhoAdsPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} style="padding: 6px 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: ${currentPage === 1 ? '#f8fafc' : 'white'}; color: ${currentPage === 1 ? '#94a3b8' : '#334155'}; font-weight: 800; font-size: 12px; cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'};">◀️ Trước</button>
                <span style="padding: 6px 14px; font-weight: 800; font-size: 13px; color: #4338ca; background: #eef2ff; border-radius: 8px; border: 1px solid #c7d2fe;">Trang ${currentPage} / ${totalPages}</span>
                <button onclick="changeKhoAdsPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} style="padding: 6px 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: ${currentPage === totalPages ? '#f8fafc' : 'white'}; color: ${currentPage === totalPages ? '#94a3b8' : '#334155'}; font-weight: 800; font-size: 12px; cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'};">Sau ▶️</button>
                <button onclick="changeKhoAdsPage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''} style="padding: 6px 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: ${currentPage === totalPages ? '#f8fafc' : 'white'}; color: ${currentPage === totalPages ? '#94a3b8' : '#334155'}; font-weight: 800; font-size: 12px; cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'};">Cuối ⏭️</button>
            </div>
        </div>
    `;

    gridContainer.innerHTML = contentHtml;
}

function resetKhoAdsFilters() {
    const iptSearch = document.getElementById('iptSearchKhoAds');
    const selLinhVuc = document.getElementById('selFilterKhoAdsLinhVuc');
    const selType = document.getElementById('selFilterKhoAdsMediaType');
    if (iptSearch) iptSearch.value = '';
    if (selLinhVuc) selLinhVuc.value = '';
    if (selType) selType.value = '';
    applyKhoAdsFilters();
}

// Modal Lĩnh Vực
function openModalManageLinhVucKhoAds() {
    if (!_khoAdsIsSuperUser()) {
        return alert('Chỉ Giám Đốc / Admin mới có quyền quản lý Lĩnh Vực Ads!');
    }
    renderLinhVucManageListKhoAds();
    const modal = document.getElementById('modalManageLinhVucKhoAds');
    if (modal) modal.style.display = 'flex';
}

function closeModalManageLinhVucKhoAds() {
    const modal = document.getElementById('modalManageLinhVucKhoAds');
    if (modal) modal.style.display = 'none';
}

function renderLinhVucManageListKhoAds() {
    const container = document.getElementById('listLinhVucManageKhoAds');
    if (!container) return;
    const list = _khoAdsData.linhVucList || [];
    if (list.length === 0) {
        container.innerHTML = '<div style="color: #94a3b8; font-size: 13px; text-align: center; padding: 12px;">(Chưa có Lĩnh Vực Ads nào)</div>';
        return;
    }

    container.innerHTML = list.map(item => {
        const isEditing = _khoAdsData.editingLinhVucId === item.id;
        if (isEditing) {
            return `
                <div style="background: #eef2ff; border: 1.5px solid #6366f1; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 4px 12px rgba(99,102,241,0.15);">
                    <div style="font-size: 12px; font-weight: 800; color: #4338ca;">✏️ Chỉnh Sửa Lĩnh Vực Ads:</div>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="iptEditLinhVucName_${item.id}" value="${escapeHtml(item.name)}" placeholder="Tên Lĩnh Vực Ads..." style="flex: 1.5; padding: 8px 10px; border: 1px solid #c7d2fe; border-radius: 6px; font-size: 13px; font-weight: 600; outline: none; background: white;">
                        <input type="text" id="iptEditLinhVucCode_${item.id}" value="${escapeHtml(item.code || '')}" placeholder="Mã (VD: SPA...)" style="flex: 1; padding: 8px 10px; border: 1px solid #c7d2fe; border-radius: 6px; font-size: 13px; font-weight: 800; text-transform: uppercase; outline: none; background: white;">
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 2px;">
                        <button onclick="cancelEditLinhVucKhoAds()" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">✕ Hủy</button>
                        <button onclick="saveEditLinhVucKhoAds(${item.id})" style="background: #10b981; color: white; border: none; padding: 6px 16px; border-radius: 6px; font-size: 12px; font-weight: 800; cursor: pointer; box-shadow: 0 2px 6px rgba(16,185,129,0.3);">💾 Lưu Cập Nhật</button>
                    </div>
                </div>
            `;
        }
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: white; border: 1px solid #e2e8f0; border-radius: 10px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    ${item.code ? `<span style="background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; padding: 3px 9px; border-radius: 6px; font-weight: 800; font-size: 11.5px;">🏷️ ${escapeHtml(item.code)}</span>` : '<span style="background: #f1f5f9; color: #94a3b8; padding: 3px 9px; border-radius: 6px; font-weight: 600; font-size: 11.5px; font-style: italic;">Chưa có mã</span>'}
                    <span style="font-weight: 700; font-size: 13.5px; color: #1e293b;">🏢 ${escapeHtml(item.name)}</span>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button onclick="startEditLinhVucKhoAds(${item.id})" style="background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">✏️ Sửa</button>
                    <button onclick="deleteLinhVucKhoAds(${item.id})" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">🗑️ Xóa</button>
                </div>
            </div>
        `;
    }).join('');
}

function startEditLinhVucKhoAds(id) {
    _khoAdsData.editingLinhVucId = id;
    renderLinhVucManageListKhoAds();
}

function cancelEditLinhVucKhoAds() {
    _khoAdsData.editingLinhVucId = null;
    renderLinhVucManageListKhoAds();
}

async function saveEditLinhVucKhoAds(id) {
    const iptName = document.getElementById(`iptEditLinhVucName_${id}`);
    const iptCode = document.getElementById(`iptEditLinhVucCode_${id}`);
    if (!iptName) return;

    const nameVal = iptName.value.trim();
    const codeVal = iptCode ? iptCode.value.trim().toUpperCase() : '';
    if (!nameVal) return alert('Tên Lĩnh Vực Ads không được để trống!');

    try {
        const res = await _khoAdsApi(`/api/kho-ads/linh-vuc/${id}`, 'PUT', { name: nameVal, code: codeVal });
        if (res && res.ok) {
            _khoAdsData.editingLinhVucId = null;
            await loadKhoAdsData();
            renderLinhVucManageListKhoAds();
            alert('🎉 Đã cập nhật Tên & Mã Lĩnh Vực Ads thành công!');
        } else {
            alert('❌ Lỗi: ' + (res.error || 'Thất bại'));
        }
    } catch(e) {
        alert('❌ Lỗi: ' + e.message);
    }
}

async function addNewLinhVucKhoAds() {
    const iptName = document.getElementById('iptNewLinhVucKhoAdsName');
    const iptCode = document.getElementById('iptNewLinhVucKhoAdsCode');
    if (!iptName) return;
    const nameVal = iptName.value.trim();
    const codeVal = iptCode ? iptCode.value.trim().toUpperCase() : '';
    if (!nameVal) return alert('Vui lòng nhập Tên Lĩnh Vực Ads!');

    try {
        const res = await _khoAdsApi('/api/kho-ads/linh-vuc', 'POST', { name: nameVal, code: codeVal });
        if (res && res.ok) {
            iptName.value = '';
            if (iptCode) iptCode.value = '';
            await loadKhoAdsData();
            renderLinhVucManageListKhoAds();
            alert('🎉 Đã thêm Lĩnh Vực Ads mới thành công!');
        } else {
            alert('❌ Lỗi: ' + (res.error || 'Thất bại'));
        }
    } catch(e) {
        alert('❌ Lỗi: ' + e.message);
    }
}

async function deleteLinhVucKhoAds(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa Lĩnh Vực Ads này?')) return;
    try {
        const res = await _khoAdsApi(`/api/kho-ads/linh-vuc/${id}`, 'DELETE');
        if (res && res.ok) {
            await loadKhoAdsData();
            renderLinhVucManageListKhoAds();
        } else {
            alert('❌ Lỗi: ' + (res.error || 'Thất bại'));
        }
    } catch(e) {
        alert('❌ Lỗi: ' + e.message);
    }
}

function setKhoAdsModalReadonlyMode(isReadonly) {
    _khoAdsData.isReadonly = isReadonly;

    const selTask = document.getElementById('selKhoAdsTaskId');
    const selMediaType = document.getElementById('selKhoAdsMediaType');
    const txtDesc = document.getElementById('txtKhoAdsDescription');
    const iptDrive = document.getElementById('iptKhoAdsDriveUrl');
    const btnSubmit = document.getElementById('btnKhoAdsSubmitAll');
    const btnClose = document.getElementById('btnKhoAdsCloseModal');

    if (selTask) {
        selTask.disabled = isReadonly;
        selTask.style.cursor = isReadonly ? 'not-allowed' : 'pointer';
    }
    if (selMediaType) {
        selMediaType.disabled = isReadonly;
        selMediaType.style.background = isReadonly ? '#f8fafc' : 'white';
        selMediaType.style.color = isReadonly ? '#334155' : '#0f172a';
        selMediaType.style.cursor = isReadonly ? 'not-allowed' : 'pointer';
    }
    if (txtDesc) {
        txtDesc.readOnly = isReadonly;
        txtDesc.style.background = isReadonly ? '#f8fafc' : 'white';
        txtDesc.style.cursor = isReadonly ? 'default' : 'text';
    }
    if (iptDrive) {
        iptDrive.readOnly = isReadonly;
        iptDrive.style.background = isReadonly ? '#f8fafc' : 'white';
        iptDrive.style.cursor = isReadonly ? 'default' : 'text';
    }
    if (btnSubmit) {
        btnSubmit.style.display = isReadonly ? 'none' : 'inline-flex';
    }
    if (btnClose) {
        btnClose.innerText = isReadonly ? '✕ Đóng' : 'Hủy';
    }
}

async function copyKhoAdsContentText() {
    const el = document.getElementById('txtKhoAdsDescription');
    const btn = document.getElementById('btnCopyKhoAdsContent');
    if (!el || !el.value) {
        alert('⚠️ Không có nội dung Content Ads để copy!');
        return;
    }
    try {
        await navigator.clipboard.writeText(el.value);
        if (btn) {
            const oldHtml = btn.innerHTML;
            btn.innerHTML = '<span>✅</span> <span>Đã Copy!</span>';
            btn.style.background = '#d1fae5';
            btn.style.color = '#059669';
            btn.style.borderColor = '#6ee7b7';
            setTimeout(() => {
                btn.innerHTML = oldHtml;
                btn.style.background = '#eef2ff';
                btn.style.color = '#4338ca';
                btn.style.borderColor = '#c7d2fe';
            }, 2000);
        }
    } catch (err) {
        el.select();
        document.execCommand('copy');
        alert('✅ Đã copy Content Ads!');
    }
}

function openKhoAdsDriveUrlTab() {
    const el = document.getElementById('iptKhoAdsDriveUrl');
    let url = (el ? el.value : '').trim();
    if (!url) {
        const activeIdx = _khoAdsData.activeSubIndex || 0;
        if (_khoAdsData.subItems && _khoAdsData.subItems[activeIdx]) {
            url = (_khoAdsData.subItems[activeIdx].drive_url || '').trim();
        }
    }
    if (!url) {
        return alert('⚠️ Chưa có Link Google Drive nào để mở!');
    }
    const normUrl = normalizeGoogleDriveUrl(url);
    window.open(normUrl, '_blank');
}

// Modal Item & Task Linkage & Clipboard Paste
function handlePasteKhoAdsThumbnail(e) {
    const modal = document.getElementById('modalCreateKhoAdsItem');
    if (!modal || modal.style.display === 'none') return;
    if (_khoAdsData.isReadonly) return;

    const items = (e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData))?.items;
    if (!items) return;

    for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
            e.preventDefault();
            const file = item.getAsFile();
            if (file) uploadKhoAdsThumbnailFile(file);
            break;
        }
    }
}

async function onKhoAdsThumbFilePicked(inp) {
    if (inp && inp.files && inp.files[0]) {
        await uploadKhoAdsThumbnailFile(inp.files[0]);
    }
}

async function compressImageClient(file, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve) => {
        if (!file || !file.type || !file.type.startsWith('image/')) return resolve(file);
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const resizedFile = new File([blob], 'thumb_' + Date.now() + '.jpg', { type: 'image/jpeg' });
                        resolve(resizedFile);
                    } else {
                        resolve(file);
                    }
                }, 'image/jpeg', quality);
            };
            img.onerror = () => resolve(file);
            img.src = e.target.result;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
}

async function uploadKhoAdsThumbnailFile(file) {
    const prevEl = document.getElementById('boxKhoAdsThumbPreview');
    if (prevEl) prevEl.innerHTML = '<div style="color:#6366f1;font-weight:800;font-size:13px">⏳ Đang tự động nén & giảm dung lượng ảnh...</div>';

    try {
        const compressedFile = await compressImageClient(file, 800, 0.8);
        const formData = new FormData();
        formData.append('file', compressedFile);

        const token = localStorage.getItem('token') || '';
        const res = await fetch('/api/kho-ads/upload-file', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
        });
        const data = await res.json();
        if (data && data.ok && data.url) {
            const activeIdx = _khoAdsData.activeSubIndex || 0;
            if (_khoAdsData.subItems && _khoAdsData.subItems[activeIdx]) {
                _khoAdsData.subItems[activeIdx].thumbnail_url = data.url;
            }

            const iptUrl = document.getElementById('iptKhoAdsThumbnailUrl');
            if (iptUrl) iptUrl.value = data.url;
            if (prevEl) {
                prevEl.innerHTML = `<img src="${data.url}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
            }
            renderKhoAdsSubItemTabs();
        } else {
            alert('❌ Upload ảnh thất bại: ' + (data.error || 'Lỗi không xác định'));
            if (prevEl) prevEl.innerHTML = '<div style="font-size:36px;margin-bottom:8px">🖼️</div><div style="font-size:13px;font-weight:800;color:#4338ca;margin-bottom:4px">Dán ảnh qua Ctrl + V</div><div style="font-size:11.5px;color:#64748b;font-weight:600">(Bắt buộc dán ảnh cho từng tư liệu)</div>';
        }
    } catch(err) {
        alert('❌ Lỗi tải ảnh: ' + err.message);
        if (prevEl) prevEl.innerHTML = '<div style="font-size:36px;margin-bottom:8px">🖼️</div><div style="font-size:13px;font-weight:800;color:#4338ca;margin-bottom:4px">Dán ảnh qua Ctrl + V</div><div style="font-size:11.5px;color:#64748b;font-weight:600">(Bắt buộc dán ảnh cho từng tư liệu)</div>';
    }
}

async function loadMarketingTasksForKhoAdsModal(selectedTaskId, onlyIncomplete = false, fallbackTaskObject = null) {
    const sel = document.getElementById('selKhoAdsTaskId');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Đang tải danh sách công việc... --</option>';
    try {
        const endpoint = onlyIncomplete ? '/api/kho-ads/marketing-tasks?only_incomplete=true' : '/api/kho-ads/marketing-tasks';
        const res = await _khoAdsApi(endpoint, 'GET');
        if (res && res.ok && Array.isArray(res.tasks)) {
            _khoAdsData.marketingTasks = res.tasks;
            const defaultLabel = (onlyIncomplete && res.tasks.length === 0) 
                ? '-- Tất cả công việc Ads đã hoàn thành (Không có task chưa xong) --' 
                : '-- Vui lòng chọn Công Việc liên kết --';
            let optHtml = `<option value="">${defaultLabel}</option>`;
            res.tasks.forEach(t => {
                const codeStr = t.task_code || ('CV-MKT-' + t.id);
                const targetQty = (t.target_quantity && Number(t.target_quantity) > 0) ? Number(t.target_quantity) : 1;
                const label = `${codeStr}: ${t.title} [Số lượng: ${targetQty}]`;
                optHtml += `<option value="${t.id}" data-linh-vuc="${escapeHtml(t.ads_linh_vuc || '')}" data-title="${escapeHtml(t.title || '')}" data-target-qty="${targetQty}">${escapeHtml(label)}</option>`;
            });
            sel.innerHTML = optHtml;

            if (selectedTaskId) {
                const targetIdStr = String(selectedTaskId);
                sel.value = targetIdStr;

                // Nếu chưa khớp được option (do thiếu trong list API), chèn fallbackTaskObject
                if (sel.value !== targetIdStr && (fallbackTaskObject || _khoAdsData.tasks)) {
                    const taskObj = fallbackTaskObject || (_khoAdsData.tasks || []).find(x => String(x.id) === targetIdStr);
                    if (taskObj) {
                        const opt = document.createElement('option');
                        opt.value = String(taskObj.id);
                        opt.setAttribute('data-linh-vuc', taskObj.ads_linh_vuc || 'Công Ty');
                        opt.setAttribute('data-title', taskObj.title || '');
                        opt.setAttribute('data-target-qty', taskObj.target_quantity || 1);
                        const codeStr = taskObj.task_code || ('CV-MKT-' + taskObj.id);
                        opt.textContent = `${codeStr}: ${taskObj.title} [Số lượng: ${taskObj.target_quantity || 1}]`;
                        sel.appendChild(opt);
                        sel.value = String(taskObj.id);
                    }
                }
                onKhoAdsTaskSelectChange();
            } else {
                sel.value = '';
                onKhoAdsTaskSelectChange();
            }
        } else {
            sel.innerHTML = '<option value="">-- Tất cả công việc Ads đã hoàn thành (Không có task chưa xong) --</option>';
            onKhoAdsTaskSelectChange();
        }
    } catch(e) {
        sel.innerHTML = '<option value="">-- Lỗi tải danh sách công việc --</option>';
    }
}

function onKhoAdsTaskSelectChange() {
    const sel = document.getElementById('selKhoAdsTaskId');
    const boxTargetInfo = document.getElementById('boxKhoAdsTargetInfo');
    const boxFormBody = document.getElementById('boxKhoAdsMainFormBody');
    const boxFooter = document.getElementById('boxKhoAdsFooterActions');

    if (!sel || !sel.value) {
        _khoAdsData.targetQty = 1;
        _khoAdsData.subItems = [];
        _khoAdsData.activeSubIndex = 0;
        if (boxTargetInfo) boxTargetInfo.style.display = 'none';
        if (boxFormBody) boxFormBody.style.display = 'none';
        if (boxFooter) boxFooter.style.display = 'none';
        return;
    }

    if (boxTargetInfo) boxTargetInfo.style.display = 'flex';
    if (boxFormBody) boxFormBody.style.display = 'grid';
    if (boxFooter) boxFooter.style.display = 'flex';

    const selectedOpt = sel.options[sel.selectedIndex];
    if (!selectedOpt) return;

    const taskLinhVuc = (selectedOpt.getAttribute('data-linh-vuc') || '').trim();
    const taskTitle = (selectedOpt.getAttribute('data-title') || '').trim();
    const targetQty = Number(selectedOpt.getAttribute('data-target-qty') || 1);

    // Lĩnh vực tự động từ Task
    const selLinhVuc = document.getElementById('selKhoAdsLinhVuc');
    if (selLinhVuc && taskLinhVuc) {
        let matched = false;
        for (let i = 0; i < selLinhVuc.options.length; i++) {
            const optVal = (selLinhVuc.options[i].value || '').trim();
            if (optVal.toLowerCase() === taskLinhVuc.toLowerCase() ||
                optVal.toLowerCase().includes(taskLinhVuc.toLowerCase()) ||
                taskLinhVuc.toLowerCase().includes(optVal.toLowerCase())) {
                selLinhVuc.selectedIndex = i;
                matched = true;
                break;
            }
        }
        if (!matched) {
            const newOpt = document.createElement('option');
            newOpt.value = taskLinhVuc;
            newOpt.textContent = `🏢 ${taskLinhVuc}`;
            selLinhVuc.appendChild(newOpt);
            selLinhVuc.value = taskLinhVuc;
        } else {
            selLinhVuc.value = taskLinhVuc;
        }
    }

    // Nếu tạo mới tư liệu Ads batch
    if (!_khoAdsData.editingId) {
        _khoAdsData.targetQty = targetQty;
        _khoAdsData.subItems = [];
        for (let i = 0; i < targetQty; i++) {
            const autoTitle = buildKhoAdsSubItemTitle(taskTitle, taskLinhVuc, i);
            _khoAdsData.subItems.push({
                title: autoTitle,
                linh_vuc: taskLinhVuc,
                media_type: 'video',
                drive_url: '',
                thumbnail_url: '',
                description: ''
            });
        }
        _khoAdsData.activeSubIndex = 0;
        renderKhoAdsSubItemTabs();
        loadActiveSubItemToForm(0);
        saveKhoAdsDraft();
    }
}

function buildKhoAdsSubItemTitle(rawTaskTitle, taskLinhVuc, subIndex) {
    const defaultLinhVuc = taskLinhVuc || 'Công Ty';
    if (!rawTaskTitle) {
        return `ADSCT001-${subIndex + 1} - ${defaultLinhVuc}`;
    }

    let cleanStr = rawTaskTitle.replace(/^CV-[A-Z0-9]+:\s*/i, '').trim();
    const parts = cleanStr.split('-').map(p => p.trim());
    const codePrefix = parts[0] || 'ADSCT001';

    return `${codePrefix}-${subIndex + 1} - ${defaultLinhVuc}`;
}

function saveKhoAdsDraft() {
    if (_khoAdsData.editingId) return; // Không lưu nháp khi đang sửa 1 tư liệu có sẵn
    saveActiveSubItemFromForm();
    const taskId = document.getElementById('selKhoAdsTaskId')?.value || '';

    const draft = {
        task_id: taskId,
        targetQty: _khoAdsData.targetQty || 1,
        activeSubIndex: _khoAdsData.activeSubIndex || 0,
        subItems: _khoAdsData.subItems || []
    };
    try {
        localStorage.setItem('kho_ads_draft_form', JSON.stringify(draft));
    } catch(e) { console.error('Error saving draft', e); }
}

function clearKhoAdsDraft() {
    try {
        localStorage.removeItem('kho_ads_draft_form');
    } catch(e) {}
}

function restoreKhoAdsDraft() {
    try {
        const str = localStorage.getItem('kho_ads_draft_form');
        if (!str) return false;
        const draft = JSON.parse(str);
        if (!draft || !Array.isArray(draft.subItems) || draft.subItems.length === 0) return false;

        _khoAdsData.targetQty = draft.targetQty || 1;
        _khoAdsData.subItems = draft.subItems;
        _khoAdsData.activeSubIndex = draft.activeSubIndex || 0;

        const selTask = document.getElementById('selKhoAdsTaskId');
        if (selTask && draft.task_id) {
            selTask.value = draft.task_id;
        }

        renderKhoAdsSubItemTabs();
        loadActiveSubItemToForm(_khoAdsData.activeSubIndex);
        return true;
    } catch(e) { return false; }
}

function saveActiveSubItemFromForm() {
    const idx = _khoAdsData.activeSubIndex || 0;
    if (!_khoAdsData.subItems || !_khoAdsData.subItems[idx]) return;

    const selTask = document.getElementById('selKhoAdsTaskId');
    const selectedOpt = selTask && selTask.selectedIndex >= 0 ? selTask.options[selTask.selectedIndex] : null;
    const taskTitle = (selectedOpt ? selectedOpt.getAttribute('data-title') : '') || '';
    const taskLinhVuc = (selectedOpt ? selectedOpt.getAttribute('data-linh-vuc') : '') || '';

    // Auto title format: ADSCT001-1 - Công Ty - 22/08/26
    const autoTitle = buildKhoAdsSubItemTitle(taskTitle, taskLinhVuc, idx);
    _khoAdsData.subItems[idx].title = autoTitle;
    const iptTitle = document.getElementById('iptKhoAdsTitle');
    if (iptTitle) iptTitle.value = autoTitle;

    _khoAdsData.subItems[idx].media_type = document.getElementById('selKhoAdsMediaType')?.value || 'video';
    _khoAdsData.subItems[idx].description = document.getElementById('txtKhoAdsDescription')?.value || '';
    _khoAdsData.subItems[idx].drive_url = (document.getElementById('iptKhoAdsDriveUrl')?.value || '').trim();
    _khoAdsData.subItems[idx].thumbnail_url = (document.getElementById('iptKhoAdsThumbnailUrl')?.value || '').trim();

    const selLinhVuc = document.getElementById('selKhoAdsLinhVuc');
    if (selLinhVuc && selLinhVuc.value) {
        _khoAdsData.subItems[idx].linh_vuc = selLinhVuc.value;
    }
}

function onKhoAdsSubItemInput(field, val) {
    const idx = _khoAdsData.activeSubIndex || 0;
    if (_khoAdsData.subItems && _khoAdsData.subItems[idx]) {
        if (field === 'description') {
            _khoAdsData.subItems[idx].description = val || '';
        } else if (field === 'drive_url') {
            _khoAdsData.subItems[idx].drive_url = (val || '').trim();
        } else if (field === 'media_type') {
            _khoAdsData.subItems[idx].media_type = val || 'video';
        } else {
            _khoAdsData.subItems[idx][field] = val || '';
        }
    }
    renderKhoAdsSubItemTabs();
    saveKhoAdsDraft();
}

function loadActiveSubItemToForm(idx) {
    if (!_khoAdsData.subItems || !_khoAdsData.subItems[idx]) return;

    const item = _khoAdsData.subItems[idx];
    
    // Auto format title if not matching template
    const selTask = document.getElementById('selKhoAdsTaskId');
    const selectedOpt = selTask && selTask.selectedIndex >= 0 ? selTask.options[selTask.selectedIndex] : null;
    const taskTitle = (selectedOpt ? selectedOpt.getAttribute('data-title') : '') || '';
    const taskLinhVuc = (selectedOpt ? selectedOpt.getAttribute('data-linh-vuc') : '') || '';
    
    const formattedTitle = buildKhoAdsSubItemTitle(taskTitle || item.title, taskLinhVuc || item.linh_vuc, idx);
    item.title = formattedTitle;

    document.getElementById('iptKhoAdsTitle').value = formattedTitle;
    document.getElementById('selKhoAdsMediaType').value = item.media_type || 'video';
    document.getElementById('txtKhoAdsDescription').value = item.description || '';
    document.getElementById('iptKhoAdsDriveUrl').value = item.drive_url || '';
    document.getElementById('iptKhoAdsThumbnailUrl').value = item.thumbnail_url || '';

    const selLinhVuc = document.getElementById('selKhoAdsLinhVuc');
    if (selLinhVuc && item.linh_vuc) {
        selLinhVuc.value = item.linh_vuc;
    }

    const prevEl = document.getElementById('boxKhoAdsThumbPreview');
    if (prevEl) {
        if (item.thumbnail_url) {
            prevEl.innerHTML = `<img src="${escapeHtml(item.thumbnail_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
        } else {
            prevEl.innerHTML = '<div style="font-size:36px;margin-bottom:8px">🖼️</div><div style="font-size:13px;font-weight:800;color:#4338ca;margin-bottom:4px">Dán ảnh qua Ctrl + V</div><div style="font-size:11.5px;color:#64748b;font-weight:600">(Bắt buộc dán ảnh cho từng tư liệu)</div>';
        }
    }
}

function renderKhoAdsSubItemTabs() {
    const bannerBox = document.getElementById('boxKhoAdsTargetInfo');
    const tabsContainer = document.getElementById('boxKhoAdsSubItemTabs');
    const counterLbl = document.getElementById('lblKhoAdsProgressCounter');
    const targetQtyText = document.getElementById('lblKhoAdsTargetQtyText');
    if (!bannerBox || !tabsContainer) return;

    const items = _khoAdsData.subItems || [];
    const targetQty = _khoAdsData.targetQty || 1;

    bannerBox.style.display = 'flex';
    if (targetQtyText) {
        targetQtyText.innerHTML = `🔢 SỐ LƯỢNG CẦN SẢN XUẤT: <strong>${targetQty}</strong> sản phẩm / video / ảnh`;
    }

    let completedCount = 0;
    let tabsHtml = '';

    items.forEach((it, idx) => {
        const isComplete = !!(it.title && it.thumbnail_url && it.description && it.drive_url && it.media_type);
        if (isComplete) completedCount++;

        const isActive = idx === _khoAdsData.activeSubIndex;
        const activeStyle = isActive 
            ? 'background: #4338ca; color: white; border-color: #4338ca; shadow: 0 4px 10px rgba(67,56,202,0.3);' 
            : (isComplete ? 'background: #f0fdf4; color: #166534; border-color: #bbf7d0;' : 'background: #fff1f2; color: #9f1239; border-color: #fecdd3;');

        const badgeIcon = isComplete ? '✅' : '⚠️';
        tabsHtml += `
            <button onclick="switchKhoAdsSubItemTab(${idx})" style="padding: 6px 14px; border-radius: 8px; border: 1.5px solid; font-size: 12.5px; font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.2s; ${activeStyle}">
                ${badgeIcon} Tư liệu #${idx + 1}
            </button>
        `;
    });

    tabsContainer.innerHTML = tabsHtml;

    if (counterLbl) {
        counterLbl.innerHTML = `📊 Tiến độ hoàn thành: ${completedCount} / ${targetQty}`;
        if (completedCount === targetQty && targetQty > 0) {
            counterLbl.style.background = '#d1fae5';
            counterLbl.style.color = '#059669';
        } else {
            counterLbl.style.background = '#fef3c7';
            counterLbl.style.color = '#d97706';
        }
    }
}

function switchKhoAdsSubItemTab(idx) {
    if (idx === _khoAdsData.activeSubIndex) return;
    saveActiveSubItemFromForm();
    _khoAdsData.activeSubIndex = idx;
    renderKhoAdsSubItemTabs();
    loadActiveSubItemToForm(idx);
    saveKhoAdsDraft();
}

function navKhoAdsSubItemTab(delta) {
    const cur = _khoAdsData.activeSubIndex || 0;
    const target = cur + delta;
    if (target >= 0 && target < (_khoAdsData.subItems || []).length) {
        switchKhoAdsSubItemTab(target);
    }
}

async function openModalCreateKhoAdsItem() {
    _khoAdsData.editingId = null;
    _khoAdsData.targetQty = 1;
    _khoAdsData.subItems = [];
    _khoAdsData.activeSubIndex = 0;

    document.getElementById('lblKhoAdsModalTitle').innerText = 'Thêm Tư Liệu Ads Mới';
    document.getElementById('lblKhoAdsModalIcon').innerText = '➕';
    
    setKhoAdsModalReadonlyMode(false);

    populateKhoAdsLinhVucSelects();
    document.getElementById('iptKhoAdsTitle').value = '';
    document.getElementById('selKhoAdsLinhVuc').value = '';
    document.getElementById('selKhoAdsMediaType').value = 'video';
    document.getElementById('iptKhoAdsDriveUrl').value = '';
    document.getElementById('iptKhoAdsThumbnailUrl').value = '';
    document.getElementById('txtKhoAdsDescription').value = '';

    const prevEl = document.getElementById('boxKhoAdsThumbPreview');
    if (prevEl) prevEl.innerHTML = '<div style="font-size:36px;margin-bottom:8px">🖼️</div><div style="font-size:13px;font-weight:800;color:#4338ca;margin-bottom:4px">Dán ảnh qua Ctrl + V</div><div style="font-size:11.5px;color:#64748b;font-weight:600">(Bắt buộc dán ảnh cho từng tư liệu)</div>';

    window.removeEventListener('paste', handlePasteKhoAdsThumbnail);
    window.addEventListener('paste', handlePasteKhoAdsThumbnail);

    await loadMarketingTasksForKhoAdsModal(null, true);

    clearKhoAdsDraft();
    document.getElementById('boxKhoAdsTargetInfo').style.display = 'none';

    const modal = document.getElementById('modalCreateKhoAdsItem');
    if (modal) modal.style.display = 'flex';
}

function closeModalCreateKhoAdsItem() {
    saveKhoAdsDraft();
    setKhoAdsModalReadonlyMode(false);
    window.removeEventListener('paste', handlePasteKhoAdsThumbnail);
    const modal = document.getElementById('modalCreateKhoAdsItem');
    if (modal) modal.style.display = 'none';
}

function editKhoAdsItem(id) {
    const item = (_khoAdsData.items || []).find(x => Number(x.id) === Number(id));
    if (!item) return;

    _khoAdsData.editingId = id;
    _khoAdsData.targetQty = 1;
    _khoAdsData.subItems = [{
        title: item.title || '',
        linh_vuc: item.linh_vuc || '',
        media_type: item.media_type || 'video',
        drive_url: item.drive_url || '',
        thumbnail_url: item.thumbnail_url || '',
        description: item.description || ''
    }];
    _khoAdsData.activeSubIndex = 0;

    document.getElementById('lblKhoAdsModalTitle').innerText = 'Chỉnh Sửa Tư Liệu Ads';
    document.getElementById('lblKhoAdsModalIcon').innerText = '✏️';

    setKhoAdsModalReadonlyMode(false);

    populateKhoAdsLinhVucSelects();
    document.getElementById('iptKhoAdsTitle').value = item.title || '';
    document.getElementById('selKhoAdsLinhVuc').value = item.linh_vuc || '';
    document.getElementById('selKhoAdsMediaType').value = item.media_type || 'video';
    document.getElementById('iptKhoAdsDriveUrl').value = item.drive_url || '';
    document.getElementById('iptKhoAdsThumbnailUrl').value = item.thumbnail_url || '';
    document.getElementById('txtKhoAdsDescription').value = item.description || '';

    const prevEl = document.getElementById('boxKhoAdsThumbPreview');
    if (prevEl) {
        if (item.thumbnail_url) {
            prevEl.innerHTML = `<img src="${escapeHtml(item.thumbnail_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
        } else {
            prevEl.innerHTML = '<div style="font-size:36px;margin-bottom:8px">🖼️</div><div style="font-size:13px;font-weight:800;color:#4338ca;margin-bottom:4px">Dán ảnh qua Ctrl + V</div><div style="font-size:11.5px;color:#64748b;font-weight:600">(Bắt buộc dán ảnh cho từng tư liệu)</div>';
        }
    }

    renderKhoAdsSubItemTabs();

    window.removeEventListener('paste', handlePasteKhoAdsThumbnail);
    window.addEventListener('paste', handlePasteKhoAdsThumbnail);

    loadMarketingTasksForKhoAdsModal(item.task_id || null);

    const modal = document.getElementById('modalCreateKhoAdsItem');
    if (modal) modal.style.display = 'flex';
}

function normalizeGoogleDriveUrl(url) {
    if (!url) return '';
    let str = url.trim();
    if (!/^https?:\/\//i.test(str)) {
        str = 'https://' + str;
    }
    return str;
}

function isValidGoogleDriveUrl(url) {
    if (!url) return false;
    const normalized = normalizeGoogleDriveUrl(url).toLowerCase();
    return normalized.startsWith('https://drive.google.com/') || normalized.startsWith('https://drive.google.com/drive');
}

async function submitCreateKhoAdsItem() {
    saveActiveSubItemFromForm();

    const task_id = document.getElementById('selKhoAdsTaskId')?.value || '';
    if (!task_id) return alert('⚠️ Vui lòng chọn Công Việc liên kết (PHÒNG MARKETING) bắt buộc!');

    const items = _khoAdsData.subItems || [];
    const targetQty = _khoAdsData.targetQty || 1;

    if (_khoAdsData.editingId) {
        // Edit single item
        const singleItem = items[0];
        if (!singleItem.title) return alert('⚠️ Tiêu đề Tư Liệu Ads không được để trống!');
        if (!singleItem.thumbnail_url) return alert('⚠️ Vui lòng dán Ảnh Đại Diện / Thumbnail (bấm Ctrl + V) bắt buộc!');
        if (!singleItem.description) return alert('⚠️ Vui lòng nhập Content Ads bắt buộc!');
        if (!singleItem.drive_url) return alert('⚠️ Vui lòng nhập Đường Link Google Drive bắt buộc!');
        
        singleItem.drive_url = normalizeGoogleDriveUrl(singleItem.drive_url);
        if (!isValidGoogleDriveUrl(singleItem.drive_url)) return alert('⚠️ Đường Link Google Drive không hợp lệ! Vui lòng nhập link bắt đầu bằng "https://drive.google.com/drive..."');

        const payload = {
            title: singleItem.title,
            linh_vuc: singleItem.linh_vuc,
            media_type: singleItem.media_type,
            drive_url: singleItem.drive_url,
            thumbnail_url: singleItem.thumbnail_url,
            description: singleItem.description,
            task_id: Number(task_id)
        };

        try {
            const res = await _khoAdsApi(`/api/kho-ads/items/${_khoAdsData.editingId}`, 'PUT', payload);
            if (res && res.ok) {
                closeModalCreateKhoAdsItem();
                await loadKhoAdsData();
                alert('🎉 Đã cập nhật Tư Liệu Ads thành công!');
            } else {
                alert('❌ Lỗi: ' + (res.error || 'Thất bại'));
            }
        } catch(e) { alert('❌ Lỗi: ' + e.message); }
        return;
    }

    // Creating new batch N items
    if (items.length < targetQty) {
        return alert(`⚠️ Công việc này yêu cầu nhập đủ ${targetQty} Tư Liệu Ads! Bạn mới khởi tạo ${items.length}/${targetQty} tư liệu.`);
    }

    const driveSet = new Set();
    for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it.title) {
            switchKhoAdsSubItemTab(i);
            return alert(`⚠️ Tư liệu #${i + 1} chưa có Tên Video/Ads!`);
        }
        if (!it.thumbnail_url) {
            switchKhoAdsSubItemTab(i);
            return alert(`⚠️ Tư liệu #${i + 1} (${it.title}) chưa dán Ảnh Đại Diện (bấm Ctrl + V) bắt buộc!`);
        }
        if (!it.description) {
            switchKhoAdsSubItemTab(i);
            return alert(`⚠️ Tư liệu #${i + 1} (${it.title}) chưa nhập Content Ads bắt buộc!`);
        }
        if (!it.drive_url) {
            switchKhoAdsSubItemTab(i);
            return alert(`⚠️ Tư liệu #${i + 1} (${it.title}) chưa nhập Đường Link Google Drive bắt buộc!`);
        }

        const normDrive = normalizeGoogleDriveUrl(it.drive_url);
        it.drive_url = normDrive;

        if (!isValidGoogleDriveUrl(normDrive)) {
            switchKhoAdsSubItemTab(i);
            return alert(`⚠️ Tư liệu #${i + 1} (${it.title}) có Đường Link Google Drive không hợp lệ! Vui lòng dán đường link bắt đầu bằng "https://drive.google.com/drive..."`);
        }

        const normLower = normDrive.toLowerCase();
        if (driveSet.has(normLower)) {
            switchKhoAdsSubItemTab(i);
            return alert(`⚠️ Tư liệu #${i + 1} (${it.title}) có Link Google Drive bị TRÙNG LẶP với tư liệu khác trong cùng đợt nhập! Mỗi tư liệu phải dán 1 link Drive riêng biệt.`);
        }
        driveSet.add(normLower);
    }

    try {
        const payload = {
            task_id: Number(task_id),
            items: items
        };
        const res = await _khoAdsApi('/api/kho-ads/items/batch', 'POST', payload);

        if (res && res.ok) {
            clearKhoAdsDraft();
            closeModalCreateKhoAdsItem();
            await loadKhoAdsData();
            alert(`🎉 Đã thêm thành công ĐỦ ${res.count} Tư Liệu Ads cho Công Việc!`);
        } else {
            alert('❌ Lỗi: ' + (res.error || 'Thất bại'));
        }
    } catch(e) {
        alert('❌ Lỗi: ' + e.message);
    }
}

async function deleteKhoAdsItem(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa Tư Liệu Ads này?')) return;
    try {
        const res = await _khoAdsApi(`/api/kho-ads/items/${id}`, 'DELETE');
        if (res && res.ok) {
            await loadKhoAdsData();
            alert('🗑️ Đã xóa tư liệu Ads!');
        } else {
            alert('❌ Lỗi: ' + (res.error || 'Thất bại'));
        }
    } catch(e) {
        alert('❌ Lỗi: ' + e.message);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDate(dStr) {
    if (!dStr) return '';
    try {
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return dStr;
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    } catch(e) { return dStr; }
}

function formatDateTime(dStr) {
    if (!dStr) return '';
    try {
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return dStr;
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${hh}:${min} - ${dd}/${mm}/${yyyy}`;
    } catch(e) { return dStr; }
}

window.renderKhoadsPage = renderKhoadsPage;
window.openModalManageLinhVucKhoAds = openModalManageLinhVucKhoAds;
window.closeModalManageLinhVucKhoAds = closeModalManageLinhVucKhoAds;
window.addNewLinhVucKhoAds = addNewLinhVucKhoAds;
window.startEditLinhVucKhoAds = startEditLinhVucKhoAds;
window.cancelEditLinhVucKhoAds = cancelEditLinhVucKhoAds;
window.saveEditLinhVucKhoAds = saveEditLinhVucKhoAds;
window.deleteLinhVucKhoAds = deleteLinhVucKhoAds;
window.openModalCreateKhoAdsItem = openModalCreateKhoAdsItem;
window.closeModalCreateKhoAdsItem = closeModalCreateKhoAdsItem;
window.submitCreateKhoAdsItem = submitCreateKhoAdsItem;
window.editKhoAdsItem = editKhoAdsItem;
window.deleteKhoAdsItem = deleteKhoAdsItem;
window.applyKhoAdsFilters = applyKhoAdsFilters;
window.resetKhoAdsFilters = resetKhoAdsFilters;
window.onKhoAdsTaskSelectChange = onKhoAdsTaskSelectChange;
window.onKhoAdsSubItemInput = onKhoAdsSubItemInput;
window.switchKhoAdsSubItemTab = switchKhoAdsSubItemTab;
window.navKhoAdsSubItemTab = navKhoAdsSubItemTab;
window.copyKhoAdsContentText = copyKhoAdsContentText;
window.openKhoAdsDriveUrlTab = openKhoAdsDriveUrlTab;
window.openKhoAdsTaskDetailModal = openKhoAdsTaskDetailModal;
window.openKhoAdsTaskEditModal = openKhoAdsTaskEditModal;
window.openKhoAdsItemDetailFromPersonal = openKhoAdsItemDetailFromPersonal;
window.setKhoAdsViewMode = setKhoAdsViewMode;
window.changeKhoAdsPage = changeKhoAdsPage;
