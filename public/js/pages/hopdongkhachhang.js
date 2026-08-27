/**
 * Trang Hợp Đồng KH & Chứng Từ - Đồng Phục HV
 * Quản Lý Tổng Hợp Biểu Mẫu Hợp Đồng, Biên Bản Bàn Giao, Phiếu Giao Hàng, Thanh Lý & Bảo Hành KH
 */
(function() {
    'use strict';

    let currentMainTab = 'muc1_hopdong'; // 'muc1_hopdong', 'muc2_biendan', 'muc3_thanhly'
    let currentSubTab1 = 'hop_dong_may_mac';
    let currentSubTab2 = 'bien_ban_ban_giao';
    let currentSubTab3 = 'thanh_ly_hop_dong';
    let currentSearchQuery = '';

    // Main Tab Configurations
    const MAIN_TABS = [
        { id: 'muc1_hopdong', label: '📜 Biểu Mẫu Hợp Đồng & Phụ Lục', num: 'MỤC 1' },
        { id: 'muc2_biendan', label: '📦 Biên Bản Bàn Giao & Phiếu Giao Hàng', num: 'MỤC 2' },
        { id: 'muc3_thanhly', label: '⚖️ Thanh Lý Hợp Đồng & Bảo Hành - Khiếu Nại', num: 'MỤC 3' }
    ];

    // Default Subtabs
    const DEFAULT_SUBTABS = {
        muc1_hopdong: [
            { id: 'hop_dong_may_mac', title: 'Hợp Đồng May Đồng Phục', icon: '📜' },
            { id: 'hop_dong_nguyen_tac', title: 'Hợp Đồng Nguyên Tắc', icon: '🏢' },
            { id: 'phu_luc_bao_gia', title: 'Phụ Lục & Báo Giá', icon: '📄' }
        ],
        muc2_biendan: [
            { id: 'bien_ban_ban_giao', title: 'Biên Bản Bàn Giao Sản Phẩm', icon: '📦' },
            { id: 'phieu_giao_hang', title: 'Phiếu Giao Hàng & Xuất Kho', icon: '🚚' },
            { id: 'kiem_dem_size', title: 'Biên Bản Kiểm Đếm Size', icon: '📏' }
        ],
        muc3_thanhly: [
            { id: 'thanh_ly_hop_dong', title: 'Biên Bản Thanh Lý Hợp Đồng', icon: '⚖️' },
            { id: 'bao_hanh_doi_tra', title: 'Biên Bản Bảo Hành & Đổi Trả', icon: '🛡️' },
            { id: 'khieu_nai_khach_hang', title: 'Tiếp Nhận Khiếu Nại KH', icon: '🗣️' }
        ]
    };

    // Default Categories
    const DEFAULT_CATEGORIES = {
        muc1_hopdong: ['Chung', 'Khách Doanh Nghiệp', 'Khách Trường Học', 'Khách Đại Lý / CTV', 'Mẫu Chuẩn HV'],
        muc2_biendan: ['Chung', 'Chứng Từ Vận Chuyển', 'Kiểm Đếm Size & Mẫu', 'Biên Bản Giao Hàng'],
        muc3_thanhly: ['Chung', 'Thanh Lý Hợp Đồng', 'Bảo Hành Sản Phẩm', 'Xử Lý Khiếu Nại']
    };

    // Preset Initial Template Links
    const PRESET_LINKS = {
        hop_dong_may_mac: [
            {
                id: 'hdkh_preset_1',
                title: '1. Mẫu Hợp Đồng Kinh Tế May Đồng Phục Chuẩn',
                subtitle: 'Mẫu hợp đồng kinh tế quy định chi tiết số lượng, chất liệu vải, tiến độ may, giao hàng và các điều khoản tạm ứng thanh toán cho khách hàng doanh nghiệp và trường học.',
                url: '#',
                icon: '📜',
                theme: 'blue',
                category: 'Khách Doanh Nghiệp',
                categories: ['Khách Doanh Nghiệp', 'Mẫu Chuẩn HV'],
                isPinned: true,
                steps: [
                    'Bước 1: Tiếp nhận thông tin nhu cầu & chốt bảng báo giá phụ lục đi kèm.',
                    'Bước 2: Soạn thảo thông tin tên pháp nhân, MST, địa chỉ khách hàng & đại diện ký hợp đồng.',
                    'Bước 3: Quy định rõ điều khoản tạm ứng đặt cọc (50%) và thanh toán nốt (50%) sau khi nghiệm thu.',
                    'Bước 4: In ấn 02 bản hợp đồng, ký tên đóng dấu pháp nhân và gửi cho đại diện khách hàng.'
                ],
                saleGuide: [
                    { question: 'Anh/Chị cho em xin thông tin tên công ty/trường học, MST, địa chỉ và đại diện ký hợp đồng nhé?' }
                ],
                warranty: [
                    'Cam kết bảo hành đường may và chất lượng in ấn trong vòng 12 tháng.',
                    'Giao hàng đúng tiến độ ghi rõ trên hợp đồng.'
                ],
                createdAt: new Date().toISOString(),
                createdBy: 'Giám Đốc'
            }
        ],
        bien_ban_ban_giao: [
            {
                id: 'hdkh_preset_2',
                title: '1. Mẫu Biên Bản Bàn Giao Hàng Hóa & Nghiệm Thu Size',
                subtitle: 'Biên bản xác nhận số lượng áo, bảng phân chia size áo, màu sắc và tình trạng sản phẩm sau khi đóng gói bàn giao tận nơi cho đại diện khách hàng.',
                url: '#',
                icon: '📦',
                theme: 'green',
                category: 'Biên Bản Giao Hàng',
                categories: ['Biên Bản Giao Hàng', 'Kiểm Đếm Size & Mẫu'],
                isPinned: true,
                steps: [
                    'Bước 1: Nhân viên giao hàng cùng đại diện khách hàng kiểm tra nguyên vẹn niêm phong thùng hàng.',
                    'Bước 2: Mở thùng hàng và đếm lại số lượng áo theo từng size (S, M, L, XL, XXL).',
                    'Bước 3: Đại diện hai bên ký tên xác nhận đủ số lượng và hàng hóa đúng quy cách.'
                ],
                saleGuide: [
                    { question: 'Khách hàng vui lòng kiểm đếm kỹ số lượng và size trước khi ký vào biên bản bàn giao.' }
                ],
                warranty: [
                    'Đổi trả 1-1 trong vòng 7 ngày nếu phát hiện sản phẩm bị lỗi từ nhà sản xuất.'
                ],
                createdAt: new Date().toISOString(),
                createdBy: 'Giám Đốc'
            }
        ],
        thanh_ly_hop_dong: [
            {
                id: 'hdkh_preset_3',
                title: '1. Mẫu Biên Bản Thanh Lý Hợp Đồng & Tất Toán Tài Chính',
                subtitle: 'Mẫu biên bản ghi nhận hai bên đã hoàn thành nghĩa vụ giao nhận hàng hóa, thanh toán dứt điểm giá trị hợp đồng và chính thức thanh lý hợp đồng kinh tế.',
                url: '#',
                icon: '⚖️',
                theme: 'purple',
                category: 'Thanh Lý Hợp Đồng',
                categories: ['Thanh Lý Hợp Đồng'],
                isPinned: true,
                steps: [
                    'Bước 1: Xác nhận số tiền khách hàng đã thanh toán và số tiền dứt điểm còn lại.',
                    'Bước 2: Ghi nhận ngày hoàn thành giao hàng và không còn vướng mắc khiếu nại.',
                    'Bước 3: Hai bên đại diện ký tên, đóng dấu thanh lý dứt điểm hợp đồng.'
                ],
                saleGuide: [
                    { question: 'Dạ em gửi Anh/Chị biên bản thanh lý hợp đồng sau khi đã dứt điểm thanh toán đủ ạ.' }
                ],
                warranty: [
                    'Chính thức hoàn thành và giải phóng mọi trách nhiệm ràng buộc của hợp đồng.'
                ],
                createdAt: new Date().toISOString(),
                createdBy: 'Giám Đốc'
            }
        ]
    };

    let activeCatFilter = { muc1_hopdong: 'all', muc2_biendan: 'all', muc3_thanhly: 'all' };

    // Helper functions for storage & API sync
    async function _hdkhInitStoreFromServer() {
        try {
            const res = await fetch('/api/hopdongkhachhang/config');
            if (res.ok) {
                const data = await res.json();
                if (data && data.value) {
                    const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
                    if (parsed && typeof parsed === 'object') {
                        Object.keys(parsed).forEach(k => {
                            localStorage.setItem(k, typeof parsed[k] === 'string' ? parsed[k] : JSON.stringify(parsed[k]));
                        });
                    }
                }
            }
        } catch (e) {
            console.warn('HDKH API load fallback:', e);
        }
    }

    async function _hdkhSyncSaveToServer() {
        try {
            const storeData = {};
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('hdkh_')) {
                    storeData[k] = localStorage.getItem(k);
                }
            }
            await fetch('/api/hopdongkhachhang/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: storeData })
            });
        } catch (e) {
            console.warn('HDKH API save error:', e);
        }
    }

    function _hdkhGetCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('user_info') || '{}');
        } catch (e) {
            return {};
        }
    }

    function _hdkhCanManage() {
        let user = window.currentUser || _hdkhGetCurrentUser();
        if (!user) return false;

        const role = user.role || user.chucvu || '';
        const name = (user.fullname || user.name || user.username || '').toLowerCase();
        const isLeVietTrinh = name.includes('trinh') || name.includes('lê việt trinh') || name.includes('le viet trinh');

        // Check explicit permissions system if configured by Giám Đốc in Phân Quyền
        if (typeof window.canDo === 'function' && role !== 'giam_doc') {
            const hasPerm = window.canDo('hop_dong_khach_hang', 'create') || window.canDo('hop_dong_khach_hang', 'edit') || window.canDo('hop_dong_khach_hang', 'delete');
            if (hasPerm) return true;
        }

        // Strict rule: Only Giám Đốc, Quản Lý Cấp Cao, or Lê Việt Trinh can manage.
        // All other staff (quản lý, trưởng phòng, nhân viên, v.v.) are View-Only!
        return role === 'giam_doc' || role === 'quan_ly_cap_cao' || isLeVietTrinh;
    }

    function _hdkhGetSubtabs(scope) {
        try {
            const raw = localStorage.getItem('hdkh_subtabs_' + scope);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return DEFAULT_SUBTABS[scope] || [];
    }

    function _hdkhSaveSubtabs(scope, subtabs) {
        localStorage.setItem('hdkh_subtabs_' + scope, JSON.stringify(subtabs));
        _hdkhSyncSaveToServer();
    }

    function _hdkhGetCategories(scope) {
        try {
            const raw = localStorage.getItem('hdkh_categories_' + scope);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return DEFAULT_CATEGORIES[scope] || ['Chung'];
    }

    function _hdkhSaveCategories(scope, cats) {
        localStorage.setItem('hdkh_categories_' + scope, JSON.stringify(cats));
        _hdkhSyncSaveToServer();
    }

    function _hdkhGetCustomSubtabLinks(subId) {
        try {
            const raw = localStorage.getItem('hdkh_links_' + subId);
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {}
        return PRESET_LINKS[subId] || [];
    }

    function _hdkhSaveCustomSubtabLinks(subId, links) {
        localStorage.setItem('hdkh_links_' + subId, JSON.stringify(links));
        _hdkhSyncSaveToServer();
    }

    function _hdkhGetLinkCategories(link) {
        if (!link) return ['Chung'];
        if (Array.isArray(link.categories) && link.categories.length > 0) return link.categories;
        if (link.category) return [link.category];
        return ['Chung'];
    }

    function _hdkhHasValidUrl(url) {
        if (!url) return false;
        const u = String(url).trim();
        return u !== '' && u !== '#' && u.toLowerCase() !== 'javascript:void(0)';
    }

    function _hdkhFormatTitle(title) {
        if (!title) return '';
        return String(title).trim();
    }

    function _hdkhFormatDescription(text) {
        if (!text) return '';
        let str = String(text).trim();
        if (!str) return '';

        if (str.startsWith('http')) {
            return str.includes('docs.google.com') ? 'Tài liệu Bảng tính / Văn bản Google' : 'Tài liệu liên kết biểu mẫu hợp đồng';
        }

        let escaped = str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#0f172a; font-weight:800;">$1</strong>');
        escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
        escaped = escaped.replace(/\n/g, '<br>');

        return escaped;
    }

    function _hdkhFormatDateTime(isoStr) {
        if (!isoStr) return '';
        try {
            const d = new Date(isoStr);
            if (isNaN(d.getTime())) return isoStr;
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const mo = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            return `${hh}:${mm} ${dd}/${mo}/${yyyy}`;
        } catch (e) {
            return isoStr;
        }
    }

    function _hdkhCleanQuestionText(q) {
        if (!q) return '';
        return String(q).trim().replace(/^câu\s*hỏi\s*\d*\s*:\s*/i, '').replace(/^"/, '').replace(/"$/, '');
    }

    // Main Page Entry Point
    window.renderHopdongkhachhangPage = async function(container) {
        await _hdkhInitStoreFromServer();

        const savedMain = localStorage.getItem('hdkh_main_tab');
        if (savedMain && MAIN_TABS.some(m => m.id === savedMain)) {
            currentMainTab = savedMain;
        }

        currentSubTab1 = localStorage.getItem('hdkh_sub_tab1') || 'hop_dong_may_mac';
        currentSubTab2 = localStorage.getItem('hdkh_sub_tab2') || 'bien_ban_ban_giao';
        currentSubTab3 = localStorage.getItem('hdkh_sub_tab3') || 'thanh_ly_hop_dong';

        container.innerHTML = `
            <div class="hdkh-wrapper">
                <!-- Header Banner - Ocean Blue & Deep Navy Theme -->
                <div class="hdkh-header">
                    <div class="hdkh-header-left">
                        <div class="hdkh-icon-bg">📑</div>
                        <div>
                            <h1 class="hdkh-title">HỢP ĐỒNG KHÁCH HÀNG & CHỨNG TỪ HV</h1>
                            <p class="hdkh-subtitle">Hệ Thống Tổng Hợp Biểu Mẫu Hợp Đồng, Biên Bản Bàn Giao, Phiếu Giao Hàng & Chứng Từ Pháp Lý Dành Cho Khách Hàng</p>
                        </div>
                    </div>
                    <div class="hdkh-header-right">
                        <span class="hdkh-badge-live">● Hệ Thống Chứng Từ</span>
                    </div>
                </div>

                <!-- Main Tabs Level 1 -->
                <div class="hdkh-tabs-main">
                    ${MAIN_TABS.map(tab => `
                        <button class="hdkh-tab-btn ${currentMainTab === tab.id ? 'active' : ''}" data-maintab="${tab.id}" onclick="window._hdkhSwitchMainTab('${tab.id}')">
                            <span class="tab-num">${tab.num}</span>
                            <span class="tab-label">${tab.label}</span>
                        </button>
                    `).join('')}
                </div>

                <!-- Main Dynamic Content Container -->
                <div class="hdkh-content-container" id="hdkhContentContainer">
                </div>
            </div>

            ${_hdkhGetStyles()}
        `;

        _hdkhRenderCurrentMainTab();
    };

    // Tab Switching
    window._hdkhSwitchMainTab = function(tabId) {
        currentMainTab = tabId;
        localStorage.setItem('hdkh_main_tab', tabId);

        document.querySelectorAll('.hdkh-tab-btn').forEach(btn => {
            if (btn.getAttribute('data-maintab') === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        _hdkhRenderCurrentMainTab();
    };

    function _hdkhRenderCurrentMainTab() {
        const container = document.getElementById('hdkhContentContainer');
        if (!container) return;

        let subtabs = [];
        let currentSub = currentSubTab1;
        if (currentMainTab === 'muc1_hopdong') {
            subtabs = _hdkhGetSubtabs('muc1_hopdong');
            currentSub = currentSubTab1;
        } else if (currentMainTab === 'muc2_biendan') {
            subtabs = _hdkhGetSubtabs('muc2_biendan');
            currentSub = currentSubTab2;
        } else {
            subtabs = _hdkhGetSubtabs('muc3_thanhly');
            currentSub = currentSubTab3;
        }

        if (!subtabs.some(s => s.id === currentSub)) {
            currentSub = subtabs[0] ? subtabs[0].id : '';
        }

        const activeSubtab = subtabs.find(s => s.id === currentSub) || subtabs[0] || { id: '', title: '' };
        const categories = _hdkhGetCategories(currentMainTab);
        const activeCat = activeCatFilter[currentMainTab] || 'all';

        const subtabLinks = _hdkhGetCustomSubtabLinks(activeSubtab.id);

        container.innerHTML = `
            <!-- Search Bar -->
            <div style="margin-bottom:20px; position:relative;">
                <div style="position:relative; display:flex; align-items:center;">
                    <span style="position:absolute; left:18px; font-size:18px; color:#0284c7; pointer-events:none; z-index:2;">🔍</span>
                    <input type="text" id="hdkhSearchInput" value="${currentSearchQuery || ''}" 
                        placeholder="Nhập tên hợp đồng, số biên bản, phiếu giao hàng, từ khóa hoặc biểu mẫu chứng từ (Tìm toàn bộ 3 Mục)..." 
                        style="width:100%; border:2px solid #bae6fd; border-radius:18px; padding:13px 48px 13px 48px; font-size:14.5px; font-weight:700; background:#ffffff; outline:none; color:#0f172a; box-shadow:0 4px 16px rgba(2,132,199,0.08);"
                        oninput="window._hdkhOnSearchInput(this.value)">
                    <button id="hdkhSearchClearBtn" onclick="window._hdkhClearSearch()" style="position:absolute; right:16px; background:#e2e8f0; border:none; border-radius:50%; width:24px; height:24px; display:${currentSearchQuery ? 'flex' : 'none'}; align-items:center; justify-content:center; cursor:pointer; font-weight:bold; color:#475569;" title="Xóa tìm kiếm">✕</button>
                </div>
            </div>

            <!-- Subtabs Control Bar -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:22px; flex-wrap:wrap; gap:14px; background:linear-gradient(135deg, rgba(240,249,255,0.95), rgba(224,242,254,0.98)); backdrop-filter:blur(16px); padding:14px 22px; border-radius:20px; border:1.5px solid #bae6fd; box-shadow:0 12px 32px -8px rgba(2,132,199,0.15);">
                <div class="hdkh-subtabs" style="margin:0; display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
                    ${subtabs.map(st => `
                        <button class="hdkh-subtab-btn ${currentSub === st.id ? 'active' : ''}" onclick="window._hdkhSwitchSubTab('${st.id}')" 
                            style="display:inline-flex; align-items:center; gap:8px; font-size:14px; font-weight:850; padding:10px 22px; border-radius:30px; cursor:pointer; ${currentSub === st.id ? 'background:linear-gradient(135deg, #0284c7, #0369a1); color:#ffffff; border:none; box-shadow:0 6px 18px rgba(2,132,199,0.45);' : 'background:#ffffff; color:#0f172a; border:1.5px solid #cbd5e1;'}">
                            ${st.icon || '📌'} ${st.title}
                        </button>
                    `).join('')}
                </div>
                <div style="display:flex; align-items:center; gap:12px;">
                    ${_hdkhCanManage() ? `
                        <button class="hdkh-btn primary" onclick="window._hdkhOpenAddLinkModal('${activeSubtab.id}')" style="border-radius:14px; padding:10px 20px; font-size:13.5px; font-weight:900; background:linear-gradient(135deg, #0284c7, #0369a1); color:#ffffff; border:none; box-shadow:0 6px 18px rgba(2,132,199,0.35); cursor:pointer;">
                            ➕ Tạo Đường Link Mới
                        </button>
                        <button class="hdkh-btn secondary" onclick="window._hdkhOpenManageSubtabModal('${currentMainTab}')" style="border-radius:14px; padding:10px 20px; font-size:13.5px; font-weight:900; background:rgba(255,255,255,0.95); color:#0284c7; border:1.5px solid #7dd3fc; box-shadow:0 4px 14px rgba(2,132,199,0.15); cursor:pointer;">
                            ⚙️ Cài Đặt Mục
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- Category Filter Bar -->
            <div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; padding:14px 22px; border-radius:18px; border:1.5px solid #bae6fd; margin-bottom:22px; box-shadow:0 4px 14px rgba(2,132,199,0.04); flex-wrap:wrap; gap:12px;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <span style="font-size:13.5px; font-weight:900; color:#0369a1; margin-right:4px;">📌 Lĩnh vực:</span>
                    <button class="dept-pill ${activeCat === 'all' ? 'active' : ''}" onclick="window._hdkhSelectCatFilter('${currentMainTab}', 'all')">
                        🌐 Tất Cả Lĩnh Vực (${subtabLinks.length})
                    </button>
                    ${categories.map(cat => {
                        const count = subtabLinks.filter(l => _hdkhGetLinkCategories(l).includes(cat)).length;
                        return `
                            <button class="dept-pill ${activeCat === cat ? 'active' : ''}" onclick="window._hdkhSelectCatFilter('${currentMainTab}', '${cat.replace(/'/g, "\\'")}')">
                                📌 ${cat} (${count})
                            </button>
                        `;
                    }).join('')}
                </div>
                ${_hdkhCanManage() ? `
                    <button class="hdkh-btn secondary" onclick="window._hdkhOpenManageCatModal('${currentMainTab}')" style="border-radius:12px; padding:9px 18px; font-size:13.5px; font-weight:800; border-color:#7dd3fc; color:#0284c7; background:#ffffff; cursor:pointer;">
                        ⚙️ Cài Đặt Lĩnh Vực
                    </button>
                ` : ''}
            </div>

            <!-- Content Grid Area -->
            <div id="hdkhTabContentBody" class="hdkh-tab-body"></div>
        `;

        if (currentSearchQuery && currentSearchQuery.trim() !== '') {
            const body = document.getElementById('hdkhTabContentBody');
            _hdkhRenderGlobalSearchResults(body, currentSearchQuery.trim().toLowerCase());
        } else {
            _hdkhRenderSubTabContent(activeSubtab.id);
        }
    }

    // Global Search Across All 3 Main Tabs
    function _hdkhRenderGlobalSearchResults(container, query) {
        const sectionResults = [];

        MAIN_TABS.forEach(mainTab => {
            const subtabs = _hdkhGetSubtabs(mainTab.id);
            subtabs.forEach(sub => {
                const links = _hdkhGetCustomSubtabLinks(sub.id);
                const matches = links.filter(l => {
                    const title = (l.title || '').toLowerCase();
                    const subtitle = (l.subtitle || '').toLowerCase();
                    const cats = _hdkhGetLinkCategories(l).join(' ').toLowerCase();
                    return title.includes(query) || subtitle.includes(query) || cats.includes(query);
                });
                if (matches.length > 0) {
                    sectionResults.push({
                        title: `${mainTab.label} › ${sub.title}`,
                        icon: sub.icon || '📌',
                        matches: matches,
                        subtabId: sub.id
                    });
                }
            });
        });

        const totalMatches = sectionResults.reduce((sum, s) => sum + s.matches.length, 0);

        if (totalMatches === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:48px 20px; background:#ffffff; border-radius:20px; border:2px dashed #bae6fd; margin-top:10px;">
                    <div style="font-size:48px; margin-bottom:12px;">🔎</div>
                    <h3 style="font-size:18px; font-weight:850; color:#0369a1; margin:0 0 6px 0;">Không Tìm Thấy Hợp Đồng / Chứng Từ Nào Với Từ Khóa "${query}"</h3>
                    <p style="font-size:14px; color:#64748b; margin:0 0 16px 0;">Anh/Chị hãy thử kiểm tra lại từ khóa hoặc tạo mới biểu mẫu hợp đồng nhé!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="background:linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border:1.5px solid #7dd3fc; border-radius:18px; padding:16px 20px; margin-bottom:20px;">
                <div style="font-size:15px; font-weight:900; color:#0369a1;">
                    🔍 KẾT QUẢ TÌM KIẾM TOÀN BỘ TRANG HỢP ĐỒNG KHÁCH HÀNG: "${query}"
                </div>
                <div style="font-size:13px; font-weight:700; color:#0284c7; margin-top:4px;">
                    Tìm thấy ${totalMatches} hợp đồng & chứng từ phù hợp.
                </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:24px;">
                ${sectionResults.map(sec => `
                    <div style="background:#ffffff; border:1.5px solid #bae6fd; border-radius:20px; padding:20px; box-shadow:0 4px 16px rgba(2,132,199,0.05);">
                        <div style="font-size:14px; font-weight:900; color:#0369a1; margin-bottom:14px; padding-bottom:8px; border-bottom:2px solid #e0f2fe;">
                            ${sec.icon} ${sec.title} (${sec.matches.length})
                        </div>
                        <div class="hdkh-link-grid">
                            ${sec.matches.map(link => _hdkhRenderCardHTML(link, link.subtabId)).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Search Controls
    window._hdkhOnSearchInput = function(val) {
        currentSearchQuery = (val || '').trim();
        const clearBtn = document.getElementById('hdkhSearchClearBtn');
        if (clearBtn) clearBtn.style.display = currentSearchQuery ? 'flex' : 'none';

        const body = document.getElementById('hdkhTabContentBody');
        if (!body) return;

        const q = currentSearchQuery.toLowerCase();
        if (q !== '') {
            _hdkhRenderGlobalSearchResults(body, q);
        } else {
            let currentSub = currentSubTab1;
            if (currentMainTab === 'muc2_biendan') currentSub = currentSubTab2;
            else if (currentMainTab === 'muc3_thanhly') currentSub = currentSubTab3;
            _hdkhRenderSubTabContent(currentSub);
        }
    };

    window._hdkhClearSearch = function() {
        currentSearchQuery = '';
        const inp = document.getElementById('hdkhSearchInput');
        if (inp) inp.value = '';
        const clearBtn = document.getElementById('hdkhSearchClearBtn');
        if (clearBtn) clearBtn.style.display = 'none';

        _hdkhRenderCurrentMainTab();
    };

    window._hdkhSwitchSubTab = function(subId) {
        if (currentMainTab === 'muc1_hopdong') {
            currentSubTab1 = subId;
            localStorage.setItem('hdkh_sub_tab1', subId);
        } else if (currentMainTab === 'muc2_biendan') {
            currentSubTab2 = subId;
            localStorage.setItem('hdkh_sub_tab2', subId);
        } else {
            currentSubTab3 = subId;
            localStorage.setItem('hdkh_sub_tab3', subId);
        }
        _hdkhRenderCurrentMainTab();
    };

    window._hdkhSelectCatFilter = function(scope, cat) {
        activeCatFilter[scope] = cat;
        _hdkhRenderCurrentMainTab();
    };

    window._hdkhTogglePinLink = function(id, subId) {
        let links = _hdkhGetCustomSubtabLinks(subId);
        let isPinnedNow = false;
        links = links.map(l => {
            if (l.id === id) {
                isPinnedNow = !l.isPinned;
                return { ...l, isPinned: isPinnedNow };
            }
            return l;
        });
        _hdkhSaveCustomSubtabLinks(subId, links);
        _hdkhShowToast(isPinnedNow ? '📌⭐ Đã ghim hợp đồng/chứng từ lên vị trí ĐẦU TIÊN!' : '📌 Đã bỏ ghim chứng từ!');
        _hdkhRenderCurrentMainTab();
    };

    function _hdkhRenderSubTabContent(subId) {
        const body = document.getElementById('hdkhTabContentBody');
        if (!body) return;

        let links = _hdkhGetCustomSubtabLinks(subId);
        const activeCat = activeCatFilter[currentMainTab] || 'all';

        if (activeCat !== 'all') {
            links = links.filter(l => _hdkhGetLinkCategories(l).includes(activeCat));
        }

        if (currentSearchQuery && currentSearchQuery.trim()) {
            const q = currentSearchQuery.toLowerCase().trim();
            links = links.filter(l => {
                const title = (l.title || '').toLowerCase();
                const desc = (l.subtitle || '').toLowerCase();
                const categories = _hdkhGetLinkCategories(l).join(' ').toLowerCase();
                return title.includes(q) || desc.includes(q) || categories.includes(q);
            });
        }

        const pinnedLinks = links.filter(l => l.isPinned);
        const normalLinks = links.filter(l => !l.isPinned);

        if (links.length === 0) {
            body.innerHTML = `
                <div style="text-align:center; padding:48px 20px; background:#ffffff; border-radius:20px; border:2px dashed #bae6fd; margin-top:10px;">
                    <div style="font-size:48px; margin-bottom:12px;">📁</div>
                    <h3 style="font-size:18px; font-weight:850; color:#0369a1; margin:0 0 6px 0;">Chưa Có Hợp Đồng / Chứng Từ Nào thuộc Lĩnh Vực "${activeCat === 'all' ? 'Tất cả' : activeCat}"</h3>
                    <p style="font-size:14px; color:#64748b; margin:0 0 16px 0;">Hãy bấm "➕ Tạo Đường Link Mới" ở trên để bổ sung mẫu hợp đồng mới cho khách hàng!</p>
                </div>
            `;
            return;
        }

        body.innerHTML = `
            ${pinnedLinks.length > 0 ? `
                <div style="margin-bottom:28px;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px; font-size:13.5px; font-weight:900; color:#b45309; background:linear-gradient(135deg, #fffbe6 0%, #fef3c7 100%); padding:9px 16px; border-radius:12px; border:1.5px solid #fde68a; width:fit-content; box-shadow:0 4px 12px rgba(217, 119, 6, 0.1);">
                        <span style="font-size:16px;">📌⭐</span>
                        <span>MỤC QUAN TRỌNG (${pinnedLinks.length})</span>
                    </div>
                    <div class="hdkh-link-grid">
                        ${pinnedLinks.map(link => _hdkhRenderCardHTML(link, subId)).join('')}
                    </div>
                </div>
            ` : ''}

            ${normalLinks.length > 0 ? `
                <div>
                    ${pinnedLinks.length > 0 ? `
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px; font-size:13px; font-weight:850; color:#64748b; padding-top:4px;">
                            <span>📁</span>
                            <span>DANH SÁCH TÀI LIỆU BÌNH THƯỜNG (${normalLinks.length})</span>
                        </div>
                    ` : ''}
                    <div class="hdkh-link-grid">
                        ${normalLinks.map(link => _hdkhRenderCardHTML(link, subId)).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    }

    function _hdkhRenderCardHTML(link, subId) {
        const hasValidUrl = _hdkhHasValidUrl(link.url);
        const themeName = link.theme || 'blue';
        const linkCats = _hdkhGetLinkCategories(link);

        return `
            <div class="hdkh-card-item theme-${themeName} ${link.isPinned ? 'is-pinned-card' : ''}">
                <div class="card-accent-bar theme-${themeName}"></div>
                ${link.imageUrl ? `
                    <div style="position:relative; width:100%; height:140px; overflow:hidden; background:#f1f5f9; cursor:pointer;" onclick="window._hdkhOpenDetailModal('${link.id}', '${subId}')" title="Click để xem chi tiết hợp đồng & chứng từ">
                        <img src="${link.imageUrl}" style="width:100%; height:100%; object-fit:cover; display:block; transition:transform 0.3s ease;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        <div style="position:absolute; bottom:8px; right:8px; background:rgba(15,23,42,0.75); color:#ffffff; font-size:11px; font-weight:800; padding:4px 10px; border-radius:8px; backdrop-filter:blur(4px); display:flex; align-items:center; gap:4px;">
                            📋 Xem Chi Tiết
                        </div>
                    </div>
                ` : ''}
                <div class="card-inner">
                    <div class="card-head-row">
                        <div class="card-icon-box theme-${themeName}">${link.icon || '📜'}</div>
                        <div class="card-badge-box" style="display:flex; flex-wrap:wrap; gap:4px; align-items:center;">
                            ${link.isPinned ? `
                                <span class="card-badge pinned-badge" style="background: linear-gradient(135deg, #fffbe6 0%, #fef3c7 100%); color:#b45309; border:1px solid #fcd34d; font-weight:900; box-shadow:0 2px 6px rgba(217, 119, 6, 0.12); display:inline-flex; align-items:center; gap:3px; padding:3px 8px; border-radius:6px; font-size:11px; white-space:nowrap; flex-shrink:0;">
                                    📌⭐ Quan Trọng
                                </span>
                            ` : ''}
                            ${linkCats.map(cat => `
                                <span class="card-badge theme-${themeName}">
                                    📌 ${cat}
                                </span>
                            `).join('')}
                        </div>
                        ${_hdkhCanManage() ? `
                            <div class="card-quick-actions">
                                <button class="card-action-btn pin ${link.isPinned ? 'active-pin' : ''}" 
                                    title="${link.isPinned ? 'Bỏ ghim quan trọng' : 'Ghim quan trọng lên đầu'}" 
                                    onclick="window._hdkhTogglePinLink('${link.id}', '${subId}')"
                                    style="${link.isPinned ? 'background:#fef3c7; color:#d97706; border-color:#fde68a; font-weight:900;' : ''}">
                                    ${link.isPinned ? '⭐' : '📌'}
                                </button>
                                <button class="card-action-btn edit" title="Chỉnh sửa link" onclick="window._hdkhOpenEditLinkModal('${link.id}', '${subId}')">✏️</button>
                                <button class="card-action-btn delete" title="Xóa link" onclick="window._hdkhDeleteLink('${link.id}', '${subId}')">🗑️</button>
                            </div>
                        ` : ''}
                    </div>
                    <div class="card-main-content" style="cursor:pointer;" onclick="window._hdkhOpenDetailModal('${link.id}', '${subId}')" title="Nhấp để xem chi tiết đầy đủ hợp đồng & chứng từ">
                        <h3 class="card-title">${_hdkhFormatTitle(link.title)}</h3>
                        <div class="card-desc">${_hdkhFormatDescription(link.subtitle || link.url)}</div>
                    </div>

                    <!-- Side-by-Side 1-Row Compact Buttons -->
                    <div style="display:flex; gap:8px; margin-top:14px; align-items:center;">
                        <button type="button" onclick="window._hdkhOpenDetailModal('${link.id}', '${subId}')" 
                            style="flex:1; min-width:0; border:none; background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color:#ffffff; font-weight:850; font-size:12.5px; padding:10px 10px; border-radius:12px; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:4px; box-shadow:0 4px 12px rgba(2,132,199,0.25); transition:all 0.2s ease; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="Xem Chi Tiết Hợp Đồng & Quy Trình">
                            📋 <span>${hasValidUrl ? 'Xem Chi Tiết ➔' : 'Xem Chi Tiết Hợp Đồng ➔'}</span>
                        </button>
                        ${hasValidUrl ? `
                            <a href="${link.url}" target="_blank" rel="noopener" class="card-btn-open" title="Mở / Tải Tài Liệu Hợp Đồng">
                                🔗 <span>Mở Tài Liệu ↗</span>
                            </a>
                        ` : ''}
                    </div>

                    <div class="card-updated-info" style="font-size:10.5px; color:#94a3b8; font-weight:600; margin-top:12px; display:flex; align-items:center; gap:5px; flex-wrap:wrap; background:#f8fafc; padding:4px 10px; border-radius:8px; border:1px solid #f1f5f9; width:fit-content;">
                        <span>🕒 Cập nhật:</span>
                        <strong style="color:#475569; font-weight:750;">${link.updatedBy || link.createdBy || 'Giám Đốc'}</strong>
                        <span style="color:#cbd5e1;">•</span>
                        <span style="color:#64748b;">${_hdkhFormatDateTime(link.updatedAt || link.createdAt)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Link Creation / Edit Modal
    function _hdkhEnsureLinkModalInDOM() {
        let modal = document.getElementById('hdkhLinkModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'hdkh-modal-overlay';
            modal.id = 'hdkhLinkModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:99999; align-items:center; justify-content:center; padding:20px;';
            modal.innerHTML = `
                <div class="hdkh-modal-card" style="max-height:88vh; display:flex; flex-direction:column; width:100%; max-width:640px; border-radius:24px; overflow:hidden; background:#ffffff; box-shadow:0 25px 50px -12px rgba(2,132,199,0.35);">
                    <div class="hdkh-modal-header" style="flex-shrink:0; padding:18px 24px; background:linear-gradient(135deg, #0f172a, #0369a1); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                        <h3 id="hdkhModalTitle" style="margin:0; font-size:17.5px; font-weight:900;">➕ TẠO ĐƯỜNG LINK HỢP ĐỒNG & CHỨNG TỪ MỚI</h3>
                        <button class="hdkh-modal-close" onclick="window._hdkhCloseLinkModal()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:30px; height:30px; border-radius:50%; cursor:pointer; font-size:16px; font-weight:bold;">✕</button>
                    </div>

                    <div class="hdkh-modal-body" style="flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:14px; background:#f0f9ff;">
                        <input type="hidden" id="hdkhFormLinkId" value="">

                        <!-- Modal Tabs Navigation -->
                        <div id="hdkhModalTabNav" style="display:flex; gap:10px; border-bottom:2px solid #bae6fd; padding-bottom:12px; margin-bottom:6px;">
                            <button type="button" id="hdkhTabBtnBasic" onclick="window._hdkhSwitchModalTab('basic')" style="flex:1; padding:10px 14px; border-radius:12px; border:none; background:#0284c7; color:#ffffff; font-weight:800; font-size:14px; cursor:pointer; transition:all 0.2s ease;">
                                📁 TAB 1: Thông Tin & Link (*)
                            </button>
                            <button type="button" id="hdkhTabBtnScript" onclick="window._hdkhSwitchModalTab('script')" style="flex:1; padding:10px 14px; border-radius:12px; border:1.5px solid #cbd5e1; background:#f8fafc; color:#0f172a; font-weight:800; font-size:14px; cursor:pointer; transition:all 0.2s ease;">
                                📋 TAB 2: Quy Trình & Hướng Dẫn*
                            </button>
                        </div>

                        <!-- PANEL 1: BASIC INFO & LINK -->
                        <div id="hdkhModalPanelBasic" style="display:block;">
                            <div class="hdkh-form-group" style="margin-bottom:14px;">
                                <label style="color:#0369a1; font-weight:900; display:block; margin-bottom:6px;">📁 Danh Mục Quản Trị (* BẮT BUỘC):</label>
                                <select id="hdkhFormSubtab" required style="width:100%; border: 2px solid #0284c7; background: #e0f2fe; font-weight: 800; color: #0369a1; padding:10px 14px; border-radius:12px;" onchange="window._hdkhOnFormSubtabChange()">
                                </select>
                            </div>
                            <div class="hdkh-form-group" style="margin-bottom:14px;">
                                <label style="color:#0284c7; font-weight:900; display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                    <span>📌 Lĩnh Vực Tài Liệu (* BẮT BUỘC - Chọn nhiều):</span>
                                </label>
                                <div id="hdkhFormCategoryCheckboxes" style="display:flex; flex-wrap:wrap; gap:10px; padding:12px; border:2px solid #38bdf8; background:#f0f9ff; border-radius:16px; max-height:150px; overflow-y:auto;">
                                </div>
                            </div>
                            <div class="hdkh-form-group" style="margin-bottom:14px;">
                                <label style="color:#0f172a; font-weight:850; display:block; margin-bottom:6px;">Tiêu đề đường link tài liệu hợp đồng (*):</label>
                                <input type="text" id="hdkhFormTitle" placeholder="Ví dụ: Mẫu Hợp Đồng May Đồng Phục Doanh Nghiệp..." required style="width:100%; border:2px solid #bae6fd; border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:700; color:#0f172a;">
                            </div>
                            <div class="hdkh-form-group" style="margin-bottom:14px;">
                                <label style="color:#334155; font-weight:850; display:block; margin-bottom:6px;">📝 Mô tả / Ghi chú (tự động xuống dòng):</label>
                                <textarea id="hdkhFormSubtitle" rows="6" placeholder="Mô tả tóm tắt nội dung biểu mẫu hợp đồng hoặc biên bản chứng từ..." style="width:100%; border:2px solid #bae6fd; border-radius:16px; padding:12px 16px; font-size:13.5px; font-weight:600; line-height:1.55; outline:none; resize:vertical; min-height:160px; color:#0f172a; font-family:inherit; background:#ffffff; box-sizing:border-box;"></textarea>
                            </div>
                            <div class="hdkh-form-group" style="margin-bottom:14px;">
                                <label id="hdkhUrlLabel" style="color:#0f172a; font-weight:850; display:block; margin-bottom:6px;">Đường link URL tài liệu (Google Sheets / Word / Link ngoài / File tải):</label>
                                <input type="url" id="hdkhFormUrl" placeholder="https://docs.google.com/..." style="width:100%; border:2px solid #bae6fd; border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:700; color:#0f172a;">
                            </div>
                            <div class="hdkh-form-group" style="margin-bottom:14px;">
                                <label style="color:#0f172a; font-weight:850; display:block; margin-bottom:6px;">🖼️ Hình Ảnh Minh Họa / Sơ Đồ / Mẫu (Không bắt buộc):</label>
                                <div style="display:flex; flex-direction:column; gap:8px;">
                                    <input type="file" id="hdkhFormImageFile" accept="image/*" style="display:none;" onchange="window._hdkhOnImageSelected(this)">
                                    <input type="hidden" id="hdkhFormImageUrl" value="">
                                    <div style="display:flex; gap:10px; align-items:center;">
                                        <button type="button" onclick="document.getElementById('hdkhFormImageFile').click()" style="background:#e0f2fe; color:#0284c7; border:1.5px solid #7dd3fc; border-radius:12px; padding:9px 16px; font-size:13px; font-weight:800; cursor:pointer;">
                                            📷 Chọn Hình Ảnh Từ Máy Tính
                                        </button>
                                        <button type="button" id="hdkhFormImageRemoveBtn" onclick="window._hdkhRemoveSelectedImage()" style="display:none; background:#fee2e2; color:#dc2626; border:none; border-radius:10px; padding:8px 14px; font-size:12.5px; font-weight:800; cursor:pointer;">
                                            ✕ Xóa Ảnh
                                        </button>
                                    </div>
                                    <div id="hdkhFormImagePreviewBox" style="display:none; margin-top:6px; border:1.5px dashed #38bdf8; border-radius:14px; padding:8px; background:#f0f9ff; width:fit-content; max-width:100%;">
                                        <img id="hdkhFormImagePreviewImg" src="" style="max-height:160px; border-radius:10px; object-fit:contain;">
                                    </div>
                                </div>
                            </div>
                            <div class="hdkh-form-row" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                                <div class="hdkh-form-group">
                                    <label style="color:#334155; font-weight:850; display:block; margin-bottom:6px;">Icon Biểu Tượng:</label>
                                    <select id="hdkhFormIcon" style="width:100%; border:1.5px solid #cbd5e1; border-radius:12px; padding:9px 12px; font-size:13px; font-weight:700;">
                                        <option value="📜">📜 Hợp Đồng Kinh Tế</option>
                                        <option value="🏢">🏢 Hợp Đồng Nguyên Tắc</option>
                                        <option value="📦">📦 Biên Bản Bàn Giao</option>
                                        <option value="🚚">🚚 Phiếu Giao Hàng</option>
                                        <option value="⚖️">⚖️ Biên Bản Thanh Lý</option>
                                        <option value="🛡️">🛡️ Bảo Hành & Đổi Trả</option>
                                    </select>
                                </div>
                                <div class="hdkh-form-group">
                                    <label style="color:#334155; font-weight:850; display:block; margin-bottom:6px;">Tông Màu Hiển Thị:</label>
                                    <select id="hdkhFormTheme" style="width:100%; border:1.5px solid #cbd5e1; border-radius:12px; padding:9px 12px; font-size:13px; font-weight:700;">
                                        <option value="blue">🟦 Xanh Biển Ocean Blue</option>
                                        <option value="green">🟩 Xanh Ngọc Emerald</option>
                                        <option value="purple">🟪 Tím Hoàng Gia Royal</option>
                                        <option value="amber">🟧 Hổ Phách Amber</option>
                                        <option value="rose">🟥 Đỏ Hồng Rose</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- PANEL 2: SCRIPT, STEPS, Q&A, WARRANTY -->
                        <div id="hdkhModalPanelScript" style="display:none;">
                            <div style="border:1.5px dashed #0284c7; background:#ffffff; border-radius:16px; padding:16px; margin-bottom:14px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                    <label style="color:#0284c7; font-weight:900; font-size:13.5px;">📋 QUY TRÌNH THỰC THI TỪNG BƯỚC:</label>
                                    <span style="font-size:11px; color:#64748b; font-weight:700;">(Xuống dòng tự động tạo Bước)</span>
                                </div>
                                <textarea id="hdkhFormSteps" rows="8" placeholder="Bước 1: Tiếp nhận thông tin pháp nhân khách hàng&#10;Bước 2: Soạn thảo hợp đồng..." style="width:100%; border:2px solid #bae6fd; border-radius:16px; padding:14px 18px; font-size:13.5px; font-weight:700; line-height:1.6; outline:none; resize:vertical; min-height:180px; color:#0369a1; font-family:inherit; background:#ffffff;"
                                    onfocus="window._hdkhOnStepsFocus(this)"
                                    onkeydown="window._hdkhOnStepsKeyDown(event, this)"
                                    oninput="window._hdkhOnStepsInput(this)"></textarea>
                                <div style="display:flex; justify-content:flex-end; margin-top:4px;">
                                    <button type="button" onclick="window._hdkhAddStepLine()" style="background:#e0f2fe; color:#0369a1; border:1px solid #7dd3fc; border-radius:8px; padding:4px 10px; font-size:12px; font-weight:800; cursor:pointer;">
                                        ➕ Thêm Bước Thực Thi
                                    </button>
                                </div>
                            </div>

                            <div style="border:1.5px dashed #38bdf8; background:#ffffff; border-radius:16px; padding:16px; margin-bottom:14px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                                    <label style="color:#0369a1; font-weight:900; font-size:13.5px;">🗣️ HƯỚNG DẪN TRAO ĐỔI & CÂU HỎI MẪU:</label>
                                    <button type="button" onclick="window._hdkhAddGuideQuestionItem()" style="background:#e0f2fe; color:#0284c7; border:1px solid #7dd3fc; padding:4px 12px; border-radius:8px; font-size:12px; font-weight:850; cursor:pointer;">+ Thêm Câu Hỏi & Mục Tiêu</button>
                                </div>
                                <div id="hdkhGuideQuestionsContainer" style="display:flex; flex-direction:column; gap:10px;">
                                </div>
                            </div>

                            <div style="border:1.5px dashed #7dd3fc; background:#ffffff; border-radius:16px; padding:16px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                                    <label style="color:#0c4a6e; font-weight:900; font-size:13.5px;">⚖️ ĐIỀU KHOẢN QUY ĐỊNH & CAM KẾT:</label>
                                    <button type="button" onclick="window._hdkhAddWarrantyItem()" style="background:#f0f9ff; color:#0369a1; border:1px solid #bae6fd; padding:4px 12px; border-radius:8px; font-size:12px; font-weight:850; cursor:pointer;">+ Thêm Điều Khoản Quy Định</button>
                                </div>
                                <div id="hdkhWarrantyContainer" style="display:flex; flex-direction:column; gap:8px;">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="hdkh-modal-footer" style="flex-shrink:0; padding:14px 24px; background:#ffffff; border-top:1.5px solid #e2e8f0; display:flex; justify-content:flex-end; gap:12px;">
                        <button class="hdkh-btn secondary" onclick="window._hdkhCloseLinkModal()" style="padding:10px 20px; border-radius:12px; font-weight:800; border:1.5px solid #cbd5e1; background:#ffffff; color:#334155; cursor:pointer;">Hủy Bỏ</button>
                        <button class="hdkh-btn primary" onclick="window._hdkhSaveLinkFromModal()" style="padding:10px 24px; border-radius:12px; font-weight:900; background:linear-gradient(135deg, #0284c7, #0369a1); color:#ffffff; cursor:pointer;">💾 Lưu Đường Link</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    }

    // Detail Modal Viewer
    function _hdkhEnsureDetailModalInDOM() {
        let modal = document.getElementById('hdkhDetailModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'hdkh-modal-overlay';
            modal.id = 'hdkhDetailModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:99999; align-items:center; justify-content:center; padding:20px;';
            modal.innerHTML = `
                <div class="hdkh-modal-card" style="max-height:88vh; display:flex; flex-direction:column; width:100%; max-width:680px; border-radius:24px; overflow:hidden; background:#ffffff; box-shadow:0 25px 50px -12px rgba(2,132,199,0.35);">
                    <div class="hdkh-modal-header" style="flex-shrink:0; padding:18px 24px; background:linear-gradient(135deg, #0f172a, #0369a1); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span id="hdkhDetailIcon" style="font-size:24px;">📜</span>
                            <h3 id="hdkhDetailTitle" style="margin:0; font-size:17.5px; font-weight:900; color:#ffffff;">Chi Tiết Hợp Đồng / Chứng Từ</h3>
                        </div>
                        <button class="hdkh-modal-close" onclick="window._hdkhCloseDetailModal()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:30px; height:30px; border-radius:50%; cursor:pointer; font-size:16px; font-weight:bold;">✕</button>
                    </div>

                    <div class="hdkh-modal-body" style="flex:1; overflow-y:auto; padding:22px 26px; display:flex; flex-direction:column; gap:16px; background:#f0f9ff;">
                        <div id="hdkhDetailImageBox" style="display:none; background:#ffffff; border:1.5px solid #bae6fd; border-radius:18px; padding:16px; text-align:center;">
                            <div style="font-size:13px; font-weight:850; color:#0369a1; margin-bottom:8px; text-align:left;">🖼️ HÌNH ẢNH MINH HỌA:</div>
                            <img id="hdkhDetailImg" src="" style="max-height:300px; max-width:100%; border-radius:12px; cursor:pointer; object-fit:contain;" onclick="window._hdkhOpenLightbox(this.src)" title="Click để phóng to ảnh nét căng">
                        </div>

                        <div id="hdkhDetailSubtitleBox" style="background:#ffffff; border:1.5px solid #bae6fd; border-radius:16px; padding:16px 20px; box-shadow:0 4px 14px rgba(2,132,199,0.06);">
                            <div style="font-size:12px; font-weight:900; color:#0369a1; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">📝 Mô tả / Ghi chú:</div>
                            <div id="hdkhDetailSubtitleText" style="font-size:14px; font-weight:600; color:#1e293b; line-height:1.6; white-space:pre-line;"></div>
                        </div>

                        <div id="hdkhDetailStepsBox" style="display:none; background:#ffffff; border:1.5px solid #7dd3fc; border-radius:18px; padding:18px 20px; box-shadow:0 4px 16px rgba(2,132,199,0.06);">
                            <div style="font-size:13.5px; font-weight:900; color:#0284c7; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
                                <span>📋 QUY TRÌNH THỰC THI TỪNG BƯỚC</span>
                            </div>
                            <div id="hdkhDetailStepsList" style="display:flex; flex-direction:column; gap:10px;"></div>
                        </div>

                        <div id="hdkhDetailGuideBox" style="display:none; background:#ffffff; border:1.5px solid #93c5fd; border-radius:18px; padding:18px 20px; box-shadow:0 4px 16px rgba(37,99,235,0.06);">
                            <div style="font-size:13.5px; font-weight:900; color:#1d4ed8; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
                                <span>🗣️ HƯỚNG DẪN TRAO ĐỔI & CÂU HỎI MẪU</span>
                            </div>
                            <div id="hdkhDetailGuideList" style="display:flex; flex-direction:column; gap:10px;"></div>
                        </div>

                        <div id="hdkhDetailWarrantyBox" style="display:none; background:#ffffff; border:1.5px solid #38bdf8; border-radius:18px; padding:18px 20px; box-shadow:0 4px 16px rgba(2,132,199,0.06);">
                            <div style="font-size:13.5px; font-weight:900; color:#0369a1; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
                                <span>⚖️ ĐIỀU KHOẢN QUY ĐỊNH & CAM KẾT</span>
                            </div>
                            <div id="hdkhDetailWarrantyList" style="display:flex; flex-direction:column; gap:8px;"></div>
                        </div>
                    </div>

                    <div class="hdkh-modal-footer" style="flex-shrink:0; padding:14px 24px; background:#ffffff; border-top:1.5px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                        <button class="hdkh-btn secondary" onclick="window._hdkhCloseDetailModal()" style="padding:10px 20px; border-radius:12px; font-weight:800; border:1.5px solid #cbd5e1; background:#ffffff; color:#334155; cursor:pointer;">Đóng Chi Tiết</button>
                        <div id="hdkhDetailFooterAction"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    }

    window._hdkhOpenDetailModal = function(id, subId = null) {
        let item = null;
        if (subId) {
            let links = _hdkhGetCustomSubtabLinks(subId);
            item = links.find(l => String(l.id) === String(id));
        }
        if (!item) {
            const allScopes = ['muc1_hopdong', 'muc2_biendan', 'muc3_thanhly'];
            for (const scope of allScopes) {
                const subtabs = _hdkhGetSubtabs(scope);
                for (const sub of subtabs) {
                    const links = _hdkhGetCustomSubtabLinks(sub.id);
                    const found = links.find(l => String(l.id) === String(id));
                    if (found) {
                        item = found;
                        break;
                    }
                }
                if (item) break;
            }
        }
        if (!item) return;

        const modal = _hdkhEnsureDetailModalInDOM();

        document.getElementById('hdkhDetailIcon').innerText = item.icon || '📜';
        document.getElementById('hdkhDetailTitle').innerText = _hdkhFormatTitle(item.title || 'Chi Tiết Hợp Đồng');

        const imgBox = document.getElementById('hdkhDetailImageBox');
        const imgEl = document.getElementById('hdkhDetailImg');
        if (item.imageUrl && imgBox && imgEl) {
            imgEl.src = item.imageUrl;
            imgBox.style.display = 'block';
        } else if (imgBox) {
            imgBox.style.display = 'none';
        }

        const subtitleBox = document.getElementById('hdkhDetailSubtitleBox');
        const subtitleText = document.getElementById('hdkhDetailSubtitleText');
        if (item.subtitle && item.subtitle.trim()) {
            subtitleText.innerText = item.subtitle;
            subtitleBox.style.display = 'block';
        } else {
            subtitleBox.style.display = 'none';
        }

        const stepsBox = document.getElementById('hdkhDetailStepsBox');
        const stepsList = document.getElementById('hdkhDetailStepsList');
        const steps = Array.isArray(item.steps) ? item.steps : (typeof item.steps === 'string' ? item.steps.split('\n').filter(Boolean) : []);
        if (steps.length > 0) {
            stepsList.innerHTML = steps.map((s, idx) => `
                <div style="background:#ffffff; border:1.5px solid #7dd3fc; border-radius:12px; padding:12px 16px; display:flex; align-items:flex-start; gap:12px;">
                    <div style="background:#0284c7; color:#ffffff; font-size:12px; font-weight:900; padding:4px 10px; border-radius:20px;">Bước ${idx + 1}</div>
                    <div style="font-size:14px; font-weight:700; color:#0369a1; line-height:1.55; flex:1;">${s.replace(/^Bước\s+\d+\s*:\s*/i, '')}</div>
                </div>
            `).join('');
            stepsBox.style.display = 'block';
        } else {
            stepsBox.style.display = 'none';
        }

        const guideBox = document.getElementById('hdkhDetailGuideBox');
        const guideList = document.getElementById('hdkhDetailGuideList');
        const guides = Array.isArray(item.saleGuide) ? item.saleGuide : [];
        if (guides.length > 0) {
            guideList.innerHTML = guides.map((g, idx) => {
                const questionTxt = typeof g === 'object' ? (g.question || '') : String(g);
                const cleanQ = _hdkhCleanQuestionText(questionTxt);
                return `
                    <div style="background:#ffffff; border:1.5px solid #bfdbfe; border-radius:14px; padding:14px 16px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
                        <div style="font-size:13.5px; font-weight:750; color:#1e3a8a; flex:1;">
                            🗣️ <strong>Câu Hỏi Mẫu ${idx + 1}:</strong> "${cleanQ}"
                        </div>
                        <button type="button" onclick="event.stopPropagation(); window._hdkhCopyQuestionText(\`${cleanQ.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`)" style="background:#2563eb; color:#ffffff; border:none; padding:6px 14px; border-radius:8px; font-size:12px; font-weight:850; cursor:pointer;" title="Sao chép nội dung câu hỏi">
                            📋 Copy
                        </button>
                    </div>
                `;
            }).join('');
            guideBox.style.display = 'block';
        } else {
            guideBox.style.display = 'none';
        }

        const warrantyBox = document.getElementById('hdkhDetailWarrantyBox');
        const warrantyList = document.getElementById('hdkhDetailWarrantyList');
        const warranty = Array.isArray(item.warranty) ? item.warranty : [];
        if (warranty.length > 0) {
            warrantyList.innerHTML = warranty.map((w, idx) => `
                <div style="background:#ffffff; border:1.5px solid #bae6fd; border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:750; color:#0369a1;">
                    ⚖️ <strong>Quy Định ${idx + 1}:</strong> ${typeof w === 'object' ? (w.text || '') : String(w)}
                </div>
            `).join('');
            warrantyBox.style.display = 'block';
        } else {
            warrantyBox.style.display = 'none';
        }

        const footerAction = document.getElementById('hdkhDetailFooterAction');
        if (_hdkhHasValidUrl(item.url)) {
            footerAction.innerHTML = `
                <a href="${item.url}" target="_blank" rel="noopener" class="card-btn-open" style="background:linear-gradient(135deg, #059669, #10b981); color:#ffffff; font-weight:900; padding:10px 20px; border-radius:12px; text-decoration:none;">
                    🔗 <span>Mở / Tải Tài Liệu Hợp Đồng</span>
                </a>
            `;
        } else {
            footerAction.innerHTML = '';
        }

        modal.style.display = 'flex';
    };

    window._hdkhCloseDetailModal = function() {
        const modal = document.getElementById('hdkhDetailModal');
        if (modal) modal.style.display = 'none';
    };

    window._hdkhCopyQuestionText = function(text) {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            _hdkhShowToast('📋 Đã sao chép nội dung trao đổi!');
        }).catch(() => {
            _hdkhShowToast('📋 Đã sao chép!');
        });
    };

    window._hdkhOpenAddLinkModal = function(targetSub) {
        const modal = _hdkhEnsureLinkModalInDOM();
        document.getElementById('hdkhModalTitle').innerText = '➕ TẠO ĐƯỜNG LINK HỢP ĐỒNG & CHỨNG TỪ MỚI';
        document.getElementById('hdkhFormLinkId').value = '';
        document.getElementById('hdkhFormTitle').value = '';
        document.getElementById('hdkhFormSubtitle').value = '';
        document.getElementById('hdkhFormUrl').value = '';
        window._hdkhRemoveSelectedImage();

        const stepsInput = document.getElementById('hdkhFormSteps');
        if (stepsInput) stepsInput.value = '';

        const guideContainer = document.getElementById('hdkhGuideQuestionsContainer');
        if (guideContainer) guideContainer.innerHTML = '';

        const warrantyContainer = document.getElementById('hdkhWarrantyContainer');
        if (warrantyContainer) warrantyContainer.innerHTML = '';

        window._hdkhSwitchModalTab('basic');
        window._hdkhPopulateSubtabOptions(targetSub);
        modal.style.display = 'flex';
    };

    window._hdkhOpenEditLinkModal = function(id, targetSub) {
        let links = _hdkhGetCustomSubtabLinks(targetSub);
        let item = links.find(l => String(l.id) === String(id));
        if (!item) return;

        const modal = _hdkhEnsureLinkModalInDOM();

        document.getElementById('hdkhModalTitle').innerText = '✏️ CHỈNH SỬA ĐƯỜNG LINK HỢP ĐỒNG & CHỨNG TỪ';
        document.getElementById('hdkhFormLinkId').value = item.id;
        document.getElementById('hdkhFormTitle').value = item.title || '';
        document.getElementById('hdkhFormSubtitle').value = item.subtitle || '';
        document.getElementById('hdkhFormUrl').value = item.url || '';
        document.getElementById('hdkhFormIcon').value = item.icon || '📜';
        document.getElementById('hdkhFormTheme').value = item.theme || 'blue';

        if (item.imageUrl) {
            document.getElementById('hdkhFormImageUrl').value = item.imageUrl;
            const previewBox = document.getElementById('hdkhFormImagePreviewBox');
            const previewImg = document.getElementById('hdkhFormImagePreviewImg');
            const removeBtn = document.getElementById('hdkhFormImageRemoveBtn');
            if (previewImg) previewImg.src = item.imageUrl;
            if (previewBox) previewBox.style.display = 'block';
            if (removeBtn) removeBtn.style.display = 'inline-flex';
        } else {
            window._hdkhRemoveSelectedImage();
        }

        const stepsText = Array.isArray(item.steps) ? item.steps.join('\n') : (item.steps || '');
        const stepsInput = document.getElementById('hdkhFormSteps');
        if (stepsInput) stepsInput.value = stepsText;

        const guideContainer = document.getElementById('hdkhGuideQuestionsContainer');
        if (guideContainer) {
            guideContainer.innerHTML = '';
            const guides = Array.isArray(item.saleGuide) ? item.saleGuide : [];
            if (guides.length > 0) {
                guides.forEach(g => {
                    const qText = typeof g === 'object' ? (g.question || '') : String(g);
                    window._hdkhAddGuideQuestionItem(qText);
                });
            }
        }

        const warrantyContainer = document.getElementById('hdkhWarrantyContainer');
        if (warrantyContainer) {
            warrantyContainer.innerHTML = '';
            const warranty = Array.isArray(item.warranty) ? item.warranty : [];
            if (warranty.length > 0) {
                warranty.forEach(w => {
                    const wText = typeof w === 'object' ? (w.text || '') : String(w);
                    window._hdkhAddWarrantyItem(wText);
                });
            }
        }

        window._hdkhSwitchModalTab('basic');
        const selectedCats = _hdkhGetLinkCategories(item);
        window._hdkhPopulateSubtabOptions(targetSub, selectedCats);
        modal.style.display = 'flex';
    };

    window._hdkhCloseLinkModal = function() {
        const modal = document.getElementById('hdkhLinkModal');
        if (modal) modal.style.display = 'none';
    };

    window._hdkhPopulateSubtabOptions = function(selectedSub, selectedCategories) {
        const subSelect = document.getElementById('hdkhFormSubtab');
        const box = document.getElementById('hdkhFormCategoryCheckboxes');
        if (!subSelect || !box) return;

        let scope = 'muc1_hopdong';
        if (currentMainTab === 'muc2_biendan') scope = 'muc2_biendan';
        else if (currentMainTab === 'muc3_thanhly') scope = 'muc3_thanhly';

        const subtabs = _hdkhGetSubtabs(scope);
        const activeSub = selectedSub || (subtabs[0] ? subtabs[0].id : '');
        subSelect.innerHTML = subtabs.map(s => `<option value="${s.id}" ${s.id === activeSub ? 'selected' : ''}>📁 ${s.title}</option>`).join('');

        const cats = _hdkhGetCategories(scope);

        let selectedArr = [];
        if (Array.isArray(selectedCategories)) {
            selectedArr = selectedCategories;
        } else if (typeof selectedCategories === 'string' && selectedCategories) {
            selectedArr = [selectedCategories];
        } else {
            selectedArr = []; // Un-checked by default when creating a new link
        }

        if (cats.length === 0) {
            box.innerHTML = `<div style="color:#64748b; font-size:13px; font-weight:600; padding:4px;">Chưa có lĩnh vực nào. Hãy bấm Cài Đặt Lĩnh Vực để tạo thêm!</div>`;
            return;
        }

        box.innerHTML = cats.map(c => {
            const isChecked = selectedArr.includes(c);
            return `
                <label style="display:inline-flex; align-items:center; gap:7px; background:${isChecked ? '#e0f2fe' : '#ffffff'}; border:1.5px solid ${isChecked ? '#0284c7' : '#7dd3fc'}; padding:7px 14px; border-radius:12px; font-size:13.5px; font-weight:800; color:${isChecked ? '#0369a1' : '#334155'}; cursor:pointer; user-select:none; transition:all 0.15s ease;">
                    <input type="checkbox" name="hdkhCategoryCheck" value="${c.replace(/"/g, '&quot;')}" ${isChecked ? 'checked' : ''} style="width:16px; height:16px; accent-color:#0284c7; cursor:pointer;" onchange="this.parentElement.style.background=this.checked?'#e0f2fe':'#ffffff'; this.parentElement.style.borderColor=this.checked?'#0284c7':'#7dd3fc'; this.parentElement.style.color=this.checked?'#0369a1':'#334155';">
                    <span>📌 ${c}</span>
                </label>
            `;
        }).join('');
    };

    window._hdkhOnFormSubtabChange = function() {
        window._hdkhPopulateSubtabOptions(document.getElementById('hdkhFormSubtab')?.value);
    };

    window._hdkhSwitchModalTab = function(tabName) {
        const tabBasic = document.getElementById('hdkhTabBtnBasic');
        const tabScript = document.getElementById('hdkhTabBtnScript');
        const panelBasic = document.getElementById('hdkhModalPanelBasic');
        const panelScript = document.getElementById('hdkhModalPanelScript');

        if (!panelBasic || !panelScript) return;

        if (tabName === 'basic') {
            panelBasic.style.display = 'block';
            panelScript.style.display = 'none';
            if (tabBasic) { tabBasic.style.background = '#0284c7'; tabBasic.style.color = '#ffffff'; }
            if (tabScript) { tabScript.style.background = '#f8fafc'; tabScript.style.color = '#0f172a'; }
        } else {
            panelBasic.style.display = 'none';
            panelScript.style.display = 'block';
            if (tabBasic) { tabBasic.style.background = '#f8fafc'; tabBasic.style.color = '#0f172a'; }
            if (tabScript) { tabScript.style.background = '#0369a1'; tabScript.style.color = '#ffffff'; }
        }
    };

    window._hdkhAddGuideQuestionItem = function(qVal = '') {
        const container = document.getElementById('hdkhGuideQuestionsContainer');
        if (!container) return;
        const div = document.createElement('div');
        div.className = 'hdkh-guide-item';
        div.style.cssText = 'display:flex; gap:8px; align-items:center; background:#f0f9ff; padding:8px 10px; border-radius:10px; border:1px solid #bae6fd;';
        const index = container.children.length + 1;
        div.innerHTML = `
            <textarea class="hdkh-guide-question" rows="2" placeholder="Câu hỏi mẫu ${index}..." style="width:100%; border:1px solid #7dd3fc; border-radius:8px; padding:8px 10px; font-size:13px; font-weight:700; color:#0369a1; background:#ffffff; resize:vertical; min-height:50px; font-family:inherit; line-height:1.5; box-sizing:border-box;" oninput="this.style.height='auto'; this.style.height=(this.scrollHeight)+'px';">${qVal}</textarea>
            <button type="button" onclick="this.parentElement.remove()" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; border-radius:8px; width:32px; height:32px; cursor:pointer; font-size:14px; font-weight:bold;">✕</button>
        `;
        container.appendChild(div);
    };

    window._hdkhAddWarrantyItem = function(tVal = '') {
        const container = document.getElementById('hdkhWarrantyContainer');
        if (!container) return;
        const div = document.createElement('div');
        div.className = 'hdkh-warranty-item';
        div.style.cssText = 'display:flex; gap:8px; align-items:center; background:#f8fafc; padding:6px 10px; border-radius:10px; border:1px solid #e2e8f0;';
        const index = container.children.length + 1;
        div.innerHTML = `
            <textarea class="hdkh-warranty-text" rows="2" placeholder="Nội dung điều khoản ${index}" style="flex:1; border:1px solid #7dd3fc; border-radius:8px; padding:6px 10px; font-size:13px; font-weight:700; color:#0369a1; resize:vertical; min-height:45px; font-family:inherit; line-height:1.45; box-sizing:border-box;" oninput="this.style.height='auto'; this.style.height=(this.scrollHeight)+'px';">${tVal}</textarea>
            <button type="button" onclick="this.parentElement.remove()" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; border-radius:8px; width:30px; height:30px; cursor:pointer; font-size:14px; font-weight:bold;">✕</button>
        `;
        container.appendChild(div);
    };

    // Save Link from Modal with Smart Validation Rules
    window._hdkhSaveLinkFromModal = function() {
        const id = document.getElementById('hdkhFormLinkId').value;
        const title = document.getElementById('hdkhFormTitle').value.trim();
        const subtitle = document.getElementById('hdkhFormSubtitle').value.trim();
        const url = document.getElementById('hdkhFormUrl').value.trim();
        const imageUrl = document.getElementById('hdkhFormImageUrl')?.value || '';
        const icon = document.getElementById('hdkhFormIcon').value;
        const theme = document.getElementById('hdkhFormTheme').value;
        const subtabId = document.getElementById('hdkhFormSubtab').value;

        const checkedInputs = document.querySelectorAll('input[name="hdkhCategoryCheck"]:checked');
        const categories = Array.from(checkedInputs).map(cb => cb.value);

        if (!subtabId) {
            alert('⚠️ BẮT BUỘC: Vui lòng chọn Danh Mục Quản Trị!');
            window._hdkhSwitchModalTab('basic');
            return;
        }

        if (categories.length === 0) {
            alert('⚠️ BẮT BUỘC: Vui lòng chọn ít nhất 1 Lĩnh Vực Tài Liệu!');
            window._hdkhSwitchModalTab('basic');
            return;
        }

        if (!title) {
            alert('⚠️ BẮT BUỘC: Vui lòng nhập tiêu đề đường link tài liệu hợp đồng!');
            window._hdkhSwitchModalTab('basic');
            document.getElementById('hdkhFormTitle').focus();
            return;
        }

        const stepsText = (document.getElementById('hdkhFormSteps')?.value || '').trim();
        const steps = stepsText ? stepsText.split('\n').map(s => s.trim()).filter(Boolean) : [];

        const saleGuideItems = [];
        document.querySelectorAll('.hdkh-guide-question').forEach(q => {
            if (q.value.trim()) saleGuideItems.push({ question: q.value.trim() });
        });

        const warrantyItems = [];
        document.querySelectorAll('.hdkh-warranty-text').forEach(w => {
            if (w.value.trim()) warrantyItems.push(w.value.trim());
        });

        const hasValidUrl = url !== '';
        const hasFullTab2 = (steps.length > 0) && (saleGuideItems.length > 0) && (warrantyItems.length > 0);

        if (!hasValidUrl && !hasFullTab2) {
            let missingTab2Details = [];
            if (steps.length === 0) missingTab2Details.push('• 📋 QUY TRÌNH THỰC THI TỪNG BƯỚC');
            if (saleGuideItems.length === 0) missingTab2Details.push('• 🗣️ HƯỚNG DẪN TRAO ĐỔI & CÂU HỎI MẪU');
            if (warrantyItems.length === 0) missingTab2Details.push('• ⚖️ ĐIỀU KHOẢN QUY ĐỊNH & CAM KẾT');

            let msg = '⚠️ YÊU CẦU ĐIỀU KIỆN LƯU TÀI LIỆU:\n\n';
            msg += 'Bạn cần hoàn thành 1 trong 2 Lựa Chọn sau:\n\n';
            msg += '👉 ĐIỀU KIỆN 1: Nhập "Đường link URL tài liệu" ở TAB 1 (Link Google Sheets, Word hoặc link ngoài).\n';
            msg += '👉 ĐIỀU KIỆN 2: Nếu không nhập URL, bạn phải điền ĐẦY ĐỦ CẢ 3 MỤC ở TAB 2 (Quy Trình & Hướng Dẫn).\n\n';
            if (missingTab2Details.length > 0) {
                msg += 'Hiện tại TAB 2 của bạn chưa điền đủ các mục sau:\n' + missingTab2Details.join('\n');
            }
            alert(msg);
            return;
        }

        let finalUrl = url;
        if (!hasValidUrl && hasFullTab2) {
            finalUrl = '#';
        }

        const category = categories[0] || 'Chung';
        const user = _hdkhGetCurrentUser();

        let links = _hdkhGetCustomSubtabLinks(subtabId);
        if (id) {
            links = links.map(l => {
                if (l.id === id) {
                    return { ...l, title, subtitle, url: finalUrl, imageUrl, icon, theme, category, categories, steps, saleGuide: saleGuideItems, warranty: warrantyItems, updatedAt: new Date().toISOString(), updatedBy: user.fullname || user.username || 'Giám Đốc' };
                }
                return l;
            });
        } else {
            const newId = 'hdkh_link_' + Date.now();
            links.push({ id: newId, title, subtitle, url: finalUrl, imageUrl, icon, theme, category, categories, steps, saleGuide: saleGuideItems, warranty: warrantyItems, createdAt: new Date().toISOString(), createdBy: user.fullname || user.username || 'Giám Đốc' });
        }

        _hdkhSaveCustomSubtabLinks(subtabId, links);
        window._hdkhCloseLinkModal();
        _hdkhRenderCurrentMainTab();
        _hdkhShowToast('💾 Đã lưu đường link hợp đồng & chứng từ thành công!');
    };

    window._hdkhDeleteLink = function(id, subId) {
        if (!confirm('Bạn có chắc chắn muốn xóa đường link hợp đồng này không?')) return;
        let links = _hdkhGetCustomSubtabLinks(subId);
        links = links.filter(l => l.id !== id);
        _hdkhSaveCustomSubtabLinks(subId, links);
        _hdkhShowToast('🗑️ Đã xóa đường link hợp đồng!');
        _hdkhRenderCurrentMainTab();
    };

    // Modal Subtab Settings
    window._hdkhOpenManageSubtabModal = function(scope) {
        const subtabs = _hdkhGetSubtabs(scope);
        const modal = document.createElement('div');
        modal.className = 'hdkh-modal-overlay';
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px;';
        modal.innerHTML = `
            <div style="background:#ffffff; border-radius:24px; width:100%; max-width:520px; overflow:hidden; box-shadow:0 25px 50px -12px rgba(2,132,199,0.35);">
                <div style="padding:18px 24px; background:linear-gradient(135deg, #0f172a, #0369a1); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0; font-size:17px; font-weight:900;">⚙️ CÀI ĐẶT MỤC HỢP ĐỒNG (MỤC: ${scope.toUpperCase()})</h3>
                    <button onclick="this.closest('.hdkh-modal-overlay').remove()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:30px; height:30px; border-radius:50%; cursor:pointer; font-weight:bold;">✕</button>
                </div>
                <div style="padding:20px 24px; max-height:60vh; overflow-y:auto; display:flex; flex-direction:column; gap:14px; background:#f0f9ff;">
                    <div style="background:#ffffff; border:1.5px solid #bae6fd; padding:14px; border-radius:14px;">
                        <label style="font-size:13.5px; font-weight:850; color:#0369a1; display:block; margin-bottom:8px;">+ Tạo Mục Hợp Đồng Mới:</label>
                        <div style="display:flex; gap:8px;">
                            <input type="text" id="hdkhNewSubtabIcon" placeholder="Biểu tượng (Icon)" value="📌" style="width:70px; border:1.5px solid #7dd3fc; border-radius:10px; padding:8px; text-align:center; font-size:16px;">
                            <input type="text" id="hdkhNewSubtabTitle" placeholder="Tên mục hợp đồng mới..." style="flex:1; border:1.5px solid #7dd3fc; border-radius:10px; padding:8px 12px; font-size:13.5px; font-weight:700;">
                            <button onclick="window._hdkhAddSubtabItem('${scope}')" style="background:#0284c7; color:#ffffff; border:none; padding:8px 16px; border-radius:10px; font-weight:850; cursor:pointer;">+ Thêm</button>
                        </div>
                    </div>

                    <div style="font-size:13.5px; font-weight:850; color:#0f172a; margin-top:6px;">📌 Danh Sách Các Mục Hiện Tại:</div>
                    <div id="hdkhSubtabManageList" style="display:flex; flex-direction:column; gap:8px;">
                        ${subtabs.map((st, i) => `
                            <div style="display:flex; align-items:center; justify-content:space-between; background:#ffffff; border:1.5px solid #cbd5e1; padding:10px 14px; border-radius:12px;">
                                <div style="display:flex; align-items:center; gap:8px; font-weight:800; color:#0369a1;">
                                    <span>${st.icon || '📌'}</span>
                                    <span>${st.title}</span>
                                </div>
                                <button onclick="window._hdkhDeleteSubtabItem('${scope}', '${st.id}')" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; border-radius:8px; padding:4px 10px; font-size:12px; font-weight:800; cursor:pointer;">🗑️ Xóa</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    };

    window._hdkhAddSubtabItem = function(scope) {
        const icon = (document.getElementById('hdkhNewSubtabIcon')?.value || '📌').trim();
        const title = (document.getElementById('hdkhNewSubtabTitle')?.value || '').trim();
        if (!title) {
            alert('Vui lòng nhập tên mục hợp đồng mới!');
            return;
        }

        let subtabs = _hdkhGetSubtabs(scope);
        const newId = 'hdkh_sub_' + Date.now();
        subtabs.push({ id: newId, title, icon });
        _hdkhSaveSubtabs(scope, subtabs);
        _hdkhShowToast('⚙️ Đã thêm mục hợp đồng mới thành công!');

        document.querySelector('.hdkh-modal-overlay')?.remove();
        _hdkhRenderCurrentMainTab();
    };

    window._hdkhDeleteSubtabItem = function(scope, subId) {
        let subtabs = _hdkhGetSubtabs(scope);
        if (subtabs.length <= 1) {
            alert('Không thể xóa! Phải giữ ít nhất 1 mục hợp đồng.');
            return;
        }
        if (!confirm('Bạn có chắc chắn muốn xóa mục này không? Các đường link thuộc mục này cũng sẽ bị xóa.')) return;

        subtabs = subtabs.filter(s => s.id !== subId);
        _hdkhSaveSubtabs(scope, subtabs);
        localStorage.removeItem('hdkh_links_' + subId);
        _hdkhShowToast('🗑️ Đã xóa mục hợp đồng!');

        document.querySelector('.hdkh-modal-overlay')?.remove();
        _hdkhRenderCurrentMainTab();
    };

    // Modal Category Settings (Lĩnh Vực)
    window._hdkhOpenManageCatModal = function(scope) {
        const cats = _hdkhGetCategories(scope);
        const modal = document.createElement('div');
        modal.className = 'hdkh-modal-overlay';
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px;';
        modal.innerHTML = `
            <div style="background:#ffffff; border-radius:24px; width:100%; max-width:500px; overflow:hidden; box-shadow:0 25px 50px -12px rgba(2,132,199,0.35);">
                <div style="padding:18px 24px; background:linear-gradient(135deg, #0f172a, #0369a1); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0; font-size:17px; font-weight:900;">⚙️ CÀI ĐẶT LĨNH VỰC (MỤC: ${scope.toUpperCase()})</h3>
                    <button onclick="this.closest('.hdkh-modal-overlay').remove()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:30px; height:30px; border-radius:50%; cursor:pointer; font-weight:bold;">✕</button>
                </div>
                <div style="padding:20px 24px; max-height:60vh; overflow-y:auto; display:flex; flex-direction:column; gap:14px; background:#f0f9ff;">
                    <div style="background:#ffffff; border:1.5px solid #bae6fd; padding:14px; border-radius:14px;">
                        <label style="font-size:13.5px; font-weight:850; color:#0369a1; display:block; margin-bottom:8px;">+ Tạo Lĩnh Vực Mới:</label>
                        <div style="display:flex; gap:8px;">
                            <input type="text" id="hdkhNewCatInput" placeholder="Tên lĩnh vực mới..." style="flex:1; border:1.5px solid #7dd3fc; border-radius:10px; padding:8px 12px; font-size:13.5px; font-weight:700;">
                            <button onclick="window._hdkhAddCategoryItem('${scope}')" style="background:#0284c7; color:#ffffff; border:none; padding:8px 16px; border-radius:10px; font-weight:850; cursor:pointer;">+ Thêm Mới</button>
                        </div>
                    </div>

                    <div style="font-size:13.5px; font-weight:850; color:#0f172a; margin-top:6px;">📌 Danh Sách Lĩnh Vực Hiện Tại:</div>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        ${cats.map((c, i) => `
                            <div style="display:flex; align-items:center; justify-content:space-between; background:#ffffff; border:1.5px solid #cbd5e1; padding:8px 12px; border-radius:12px;">
                                <span style="font-weight:800; color:#0369a1;">📌 ${c}</span>
                                <div style="display:flex; gap:6px;">
                                    <button onclick="window._hdkhEditCategoryItem('${scope}', ${i})" style="background:#e0f2fe; color:#0284c7; border:1px solid #7dd3fc; border-radius:6px; padding:4px 8px; font-size:12px; font-weight:800; cursor:pointer;">✏️ Sửa Tên</button>
                                    <button onclick="window._hdkhDeleteCategoryItem('${scope}', ${i})" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; border-radius:6px; padding:4px 8px; font-size:12px; font-weight:800; cursor:pointer;">🗑️ Xóa</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    };

    window._hdkhAddCategoryItem = function(scope) {
        const inp = document.getElementById('hdkhNewCatInput');
        const val = (inp?.value || '').trim();
        if (!val) {
            alert('Vui lòng nhập tên lĩnh vực!');
            return;
        }

        let cats = _hdkhGetCategories(scope);
        if (cats.includes(val)) {
            alert('Lĩnh vực này đã tồn tại!');
            return;
        }

        cats.push(val);
        _hdkhSaveCategories(scope, cats);
        _hdkhShowToast('⚙️ Đã thêm lĩnh vực mới!');

        document.querySelector('.hdkh-modal-overlay')?.remove();
        _hdkhRenderCurrentMainTab();
    };

    window._hdkhEditCategoryItem = function(scope, index) {
        let cats = _hdkhGetCategories(scope);
        const oldVal = cats[index];
        const newVal = prompt('Nhập tên lĩnh vực mới:', oldVal);
        if (!newVal || !newVal.trim() || newVal.trim() === oldVal) return;

        cats[index] = newVal.trim();
        _hdkhSaveCategories(scope, cats);
        _hdkhShowToast('✏️ Đã cập nhật tên lĩnh vực!');

        document.querySelector('.hdkh-modal-overlay')?.remove();
        _hdkhRenderCurrentMainTab();
    };

    window._hdkhDeleteCategoryItem = function(scope, index) {
        let cats = _hdkhGetCategories(scope);
        if (cats.length <= 1) {
            alert('Không thể xóa! Phải giữ ít nhất 1 lĩnh vực.');
            return;
        }
        if (!confirm(`Bạn có chắc chắn muốn xóa lĩnh vực "${cats[index]}" không?`)) return;

        cats.splice(index, 1);
        _hdkhSaveCategories(scope, cats);
        _hdkhShowToast('🗑️ Đã xóa lĩnh vực!');

        document.querySelector('.hdkh-modal-overlay')?.remove();
        _hdkhRenderCurrentMainTab();
    };

    // Toast Notification
    function _hdkhShowToast(msg) {
        let toast = document.getElementById('hdkhToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'hdkhToast';
            toast.className = 'hdkh-toast';
            document.body.appendChild(toast);
        }
        toast.innerText = msg;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    window._hdkhShowToast = _hdkhShowToast;

    // High-Contrast Ocean Blue / Deep Navy Theme CSS Styles Embedding
    function _hdkhGetStyles() {
        return `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Comfortaa:wght@500;600;700&display=swap');

                .hdkh-wrapper, .hdkh-wrapper button, .hdkh-wrapper input, .hdkh-wrapper select, .hdkh-wrapper textarea, .hdkh-wrapper div, .hdkh-wrapper span,
                .hdkh-modal-overlay, .hdkh-modal-overlay button, .hdkh-modal-overlay input, .hdkh-modal-overlay select, .hdkh-modal-overlay textarea, .hdkh-modal-overlay div, .hdkh-modal-overlay span {
                    font-family: 'Nunito', 'Comfortaa', system-ui, -apple-system, sans-serif !important;
                }
                .hdkh-wrapper {
                    padding: 24px;
                    background: #f8fafc;
                    min-height: 100vh;
                }
                .hdkh-header {
                    background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0284c7 100%);
                    border-radius: 24px;
                    padding: 28px 32px;
                    color: #ffffff;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: 0 14px 35px rgba(2, 132, 199, 0.25);
                    margin-bottom: 24px;
                }
                .hdkh-header-left {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }
                .hdkh-icon-bg {
                    font-size: 38px;
                    background: rgba(255, 255, 255, 0.15);
                    width: 68px;
                    height: 68px;
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1.5px solid rgba(255, 255, 255, 0.25);
                }
                .hdkh-title {
                    font-size: 22px;
                    font-weight: 900;
                    margin: 0 0 6px 0;
                    letter-spacing: 0.5px;
                }
                .hdkh-subtitle {
                    font-size: 13.5px;
                    margin: 0;
                    opacity: 0.9;
                    font-weight: 500;
                }
                .hdkh-badge-live {
                    background: #10b981;
                    color: #ffffff;
                    font-weight: 850;
                    font-size: 12px;
                    padding: 6px 14px;
                    border-radius: 20px;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                }

                .hdkh-tabs-main {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                    margin-bottom: 24px;
                }
                .hdkh-tab-btn {
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
                .hdkh-tab-btn:hover {
                    border-color: #38bdf8;
                    transform: translateY(-2px);
                }
                .hdkh-tab-btn.active {
                    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%) !important;
                    border-color: #0284c7 !important;
                    box-shadow: 0 8px 24px rgba(2, 132, 199, 0.45) !important;
                }
                .hdkh-tab-btn .tab-num {
                    font-size: 13.5px;
                    font-weight: 900;
                    color: #0284c7;
                    background: #e0f2fe;
                    padding: 4px 12px;
                    border-radius: 12px;
                    margin-bottom: 8px;
                    letter-spacing: 0.8px;
                    text-transform: uppercase;
                }
                .hdkh-tab-btn.active .tab-num {
                    color: #ffffff !important;
                    background: rgba(255, 255, 255, 0.25) !important;
                }
                .hdkh-tab-btn .tab-label {
                    font-size: 18.5px;
                    font-weight: 900;
                    color: #1e293b;
                    line-height: 1.35;
                    letter-spacing: -0.2px;
                }
                .hdkh-tab-btn.active .tab-label {
                    color: #ffffff !important;
                }

                .dept-pill {
                    background: rgba(255, 255, 255, 0.9);
                    border: 1.5px solid #7dd3fc;
                    color: #0369a1;
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 800;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .dept-pill:hover {
                    background: #e0f2fe;
                    transform: translateY(-1px);
                }
                .dept-pill.active {
                    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%) !important;
                    color: #ffffff !important;
                    border-color: #0284c7 !important;
                    box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3) !important;
                }

                /* Dynamic Card Grid & Item Styling */
                .hdkh-link-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                    gap: 22px;
                    margin-bottom: 24px;
                }
                .hdkh-card-item {
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
                .hdkh-card-item:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 18px 40px rgba(2, 132, 199, 0.12);
                    border-color: #38bdf8;
                }
                .hdkh-card-item.is-pinned-card {
                    border: 2px solid #f59e0b !important;
                    box-shadow: 0 8px 24px rgba(245, 158, 11, 0.18) !important;
                    background: linear-gradient(180deg, #fffdf5 0%, #ffffff 100%) !important;
                }
                .card-accent-bar {
                    height: 5px;
                    width: 100%;
                }
                .card-accent-bar.theme-blue { background: linear-gradient(90deg, #1e3a8a, #0284c7); }
                .card-accent-bar.theme-green { background: linear-gradient(90deg, #107c41, #22c55e); }
                .card-accent-bar.theme-purple { background: linear-gradient(90deg, #6b21a8, #a855f7); }
                .card-accent-bar.theme-amber { background: linear-gradient(90deg, #b45309, #f59e0b); }
                .card-accent-bar.theme-rose { background: linear-gradient(90deg, #be123c, #f43f5e); }

                .card-inner {
                    padding: 22px 24px;
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                }
                .card-head-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 16px;
                    gap: 10px;
                }
                .card-icon-box {
                    width: 52px;
                    height: 52px;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 26px;
                    box-shadow: 0 6px 16px rgba(0,0,0,0.06);
                    flex-shrink: 0;
                }
                .card-icon-box.theme-blue { background: #e0f2fe; border: 1px solid #7dd3fc; color: #0284c7; }
                .card-icon-box.theme-green { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
                .card-icon-box.theme-purple { background: #faf5ff; border: 1px solid #e9d5ff; color: #6b21a8; }
                .card-icon-box.theme-amber { background: #fffbeb; border: 1px solid #fde68a; color: #b45309; }
                .card-icon-box.theme-rose { background: #fff1f2; border: 1px solid #fecdd3; color: #be123c; }

                .card-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 3px;
                    font-size: 10.5px;
                    font-weight: 800;
                    letter-spacing: 0.2px;
                    padding: 3px 8px;
                    border-radius: 8px;
                    opacity: 0.88;
                }
                .card-badge.theme-blue { background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; }
                .card-badge.theme-green { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
                .card-badge.theme-purple { background: #faf5ff; color: #7e22ce; border: 1px solid #e9d5ff; }
                .card-badge.theme-amber { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
                .card-badge.theme-rose { background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; }

                .card-quick-actions {
                    display: flex;
                    gap: 6px;
                    margin-left: auto;
                }
                .card-action-btn {
                    width: 34px;
                    height: 34px;
                    border-radius: 10px;
                    border: 1px solid #cbd5e1;
                    background: #ffffff;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    transition: all 0.2s ease;
                }
                .card-action-btn.edit:hover { background: #fef3c7; border-color: #fde68a; transform: scale(1.08); }
                .card-action-btn.delete:hover { background: #ffe4e6; border-color: #fecdd3; transform: scale(1.08); }
                .card-action-btn.pin { color: #d97706; }
                .card-action-btn.pin:hover { background: #fef3c7; color: #b45309; }

                .card-main-content {
                    flex: 1;
                    margin-bottom: 18px;
                }
                .card-title {
                    font-size: 19px;
                    font-weight: 950;
                    color: #0f172a;
                    margin: 8px 0 10px 0;
                    line-height: 1.35;
                    letter-spacing: -0.4px;
                }
                .card-desc {
                    font-size: 13px;
                    color: #64748b;
                    margin: 0;
                    line-height: 1.55;
                    font-weight: 600;
                }

                .card-btn-open {
                    flex: 1;
                    min-width: 0;
                    padding: 10px 12px;
                    font-size: 12.5px;
                    font-weight: 850;
                    border-radius: 12px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
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
                }
                .card-btn-open:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 18px rgba(16, 185, 129, 0.5);
                    color: #ffffff !important;
                    background: linear-gradient(135deg, #047857 0%, #059669 100%) !important;
                }

                .hdkh-toast {
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
                    z-index: 99999;
                    opacity: 0;
                    transform: translateY(20px);
                    transition: all 0.3s ease;
                    pointer-events: none;
                }
                .hdkh-toast.show {
                    opacity: 1;
                    transform: translateY(0);
                }

                @media (max-width: 768px) {
                    .hdkh-tabs-main { grid-template-columns: 1fr; }
                    .hdkh-header { flex-direction: column; align-items: flex-start; gap: 16px; }
                }
            </style>
        `;
    }

    // Lightbox & Image Processing Engine
    let currentLightboxScale = 1;

    window._hdkhOnImageSelected = async function(input) {
        if (!input || !input.files || !input.files[0]) return;
        const file = input.files[0];
        try {
            const compressedDataUrl = await _hdkhCompressImageToDataUrl(file, 1200, 0.82);
            if (compressedDataUrl) {
                document.getElementById('hdkhFormImageUrl').value = compressedDataUrl;
                const previewBox = document.getElementById('hdkhFormImagePreviewBox');
                const previewImg = document.getElementById('hdkhFormImagePreviewImg');
                const removeBtn = document.getElementById('hdkhFormImageRemoveBtn');
                if (previewImg) previewImg.src = compressedDataUrl;
                if (previewBox) previewBox.style.display = 'block';
                if (removeBtn) removeBtn.style.display = 'inline-flex';
                _hdkhShowToast('📷 Đã tải và nén hình ảnh mượt mà!');
            }
        } catch (e) {
            console.error('Lỗi nén ảnh:', e);
            alert('Có lỗi xảy ra khi nén hình ảnh, vui lòng thử lại!');
        }
    };

    window._hdkhRemoveSelectedImage = function() {
        const hiddenInput = document.getElementById('hdkhFormImageUrl');
        const fileInput = document.getElementById('hdkhFormImageFile');
        const previewBox = document.getElementById('hdkhFormImagePreviewBox');
        const removeBtn = document.getElementById('hdkhFormImageRemoveBtn');

        if (hiddenInput) hiddenInput.value = '';
        if (fileInput) fileInput.value = '';
        if (previewBox) previewBox.style.display = 'none';
        if (removeBtn) removeBtn.style.display = 'none';
    };

    function _hdkhCompressImageToDataUrl(file, maxDimension = 1200, quality = 0.82) {
        return new Promise((resolve) => {
            if (!file || !file.type.startsWith('image/')) {
                resolve(null);
                return;
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
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
                    const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressedBase64);
                };
                img.onerror = () => resolve(null);
                img.src = e.target.result;
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        });
    }

    window._hdkhOpenLightbox = function(imageUrlOrId, subId) {
        let imgUrl = imageUrlOrId;
        let title = 'Hình Ảnh Minh Họa';
        if (subId) {
            const links = _hdkhGetCustomSubtabLinks(subId);
            const link = links.find(l => String(l.id) === String(imageUrlOrId));
            if (link && link.imageUrl) {
                imgUrl = link.imageUrl;
                title = link.title || title;
            }
        }

        if (!imgUrl) return;

        const modal = _hdkhEnsureLightboxInDOM();
        const imgEl = document.getElementById('hdkhLightboxImg');
        const dlBtn = document.getElementById('hdkhLightboxDownloadBtn');
        const titleEl = document.getElementById('hdkhLightboxTitle');

        imgEl.src = imgUrl;
        dlBtn.href = imgUrl;
        if (titleEl) titleEl.innerText = title;

        currentLightboxScale = 1;
        imgEl.style.transform = 'scale(1)';
        modal.style.display = 'flex';
    };

    window._hdkhCloseLightbox = function() {
        const modal = document.getElementById('hdkhLightboxModal');
        if (modal) modal.style.display = 'none';
    };

    window._hdkhZoomLightbox = function(factor) {
        currentLightboxScale *= factor;
        if (currentLightboxScale < 0.4) currentLightboxScale = 0.4;
        if (currentLightboxScale > 4) currentLightboxScale = 4;
        const imgEl = document.getElementById('hdkhLightboxImg');
        if (imgEl) imgEl.style.transform = `scale(${currentLightboxScale})`;
    };

    window._hdkhResetLightboxZoom = function() {
        currentLightboxScale = 1;
        const imgEl = document.getElementById('hdkhLightboxImg');
        if (imgEl) imgEl.style.transform = 'scale(1)';
    };

    function _hdkhEnsureLightboxInDOM() {
        let modal = document.getElementById('hdkhLightboxModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'hdkh-modal-overlay';
            modal.id = 'hdkhLightboxModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.92); backdrop-filter:blur(10px); z-index:100000; align-items:center; justify-content:center; padding:20px;';
            modal.innerHTML = `
                <div style="position:relative; max-width:94vw; max-height:94vh; display:flex; flex-direction:column; align-items:center;">
                    <div style="width:100%; display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; background:rgba(255,255,255,0.1); padding:10px 18px; border-radius:14px; backdrop-filter:blur(8px);">
                        <span id="hdkhLightboxTitle" style="color:#ffffff; font-size:15px; font-weight:850; max-width:60%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">🖼️ Xem Ảnh Minh Họa</span>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <button onclick="window._hdkhZoomLightbox(1.25)" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; padding:6px 14px; border-radius:10px; font-weight:850; font-size:13px; cursor:pointer;" title="Phóng to">🔍 Zoom +</button>
                            <button onclick="window._hdkhZoomLightbox(0.8)" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; padding:6px 14px; border-radius:10px; font-weight:850; font-size:13px; cursor:pointer;" title="Thu nhỏ">🔍 Zoom -</button>
                            <button onclick="window._hdkhResetLightboxZoom()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; padding:6px 14px; border-radius:10px; font-weight:850; font-size:13px; cursor:pointer;" title="Đặt lại size">🔄 Reset</button>
                            <a id="hdkhLightboxDownloadBtn" href="" download="hinh-anh-tai-lieu.jpg" style="background:linear-gradient(135deg, #10b981, #059669); color:#ffffff; padding:6px 16px; border-radius:10px; font-weight:900; text-decoration:none; font-size:13px; box-shadow:0 4px 12px rgba(16,185,129,0.3);">⬇️ Tải Ảnh Về</a>
                            <button onclick="window._hdkhCloseLightbox()" style="background:#ef4444; color:#ffffff; border:none; width:34px; height:34px; border-radius:50%; font-weight:bold; cursor:pointer; font-size:16px;">✕</button>
                        </div>
                    </div>
                    <div style="overflow:auto; max-height:82vh; max-width:92vw; border-radius:18px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5); background:rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; padding:10px;" onclick="if(event.target===this) window._hdkhCloseLightbox()">
                        <img id="hdkhLightboxImg" src="" style="display:block; max-width:100%; max-height:78vh; object-fit:contain; border-radius:12px; transition:transform 0.2s ease;">
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    }

    window._hdkhOnStepsFocus = function (el) {
        if (!el || el.value.trim()) return;
        el.value = 'Bước 1: ';
    };

    window._hdkhAddStepLine = function () {
        const el = document.getElementById('hdkhFormSteps');
        if (!el) return;
        if (!el.value.trim()) {
            el.value = 'Bước 1: ';
        } else {
            const text = el.value;
            const allLines = text.split('\n');
            let maxStepNum = 0;
            allLines.forEach(l => {
                const m = l.match(/^Bước\s*(\d+)/i);
                if (m) {
                    const num = parseInt(m[1], 10);
                    if (num > maxStepNum) maxStepNum = num;
                }
            });
            const nextNum = maxStepNum > 0 ? maxStepNum + 1 : (allLines.length + 1);
            el.value = text.trimEnd() + `\nBước ${nextNum}: `;
        }
        el.focus();
        el.selectionStart = el.selectionEnd = el.value.length;
    };

    window._hdkhOnStepsKeyDown = function (e, el) {
        if (e.key === 'Enter') {
            const cursorStart = el.selectionStart;
            const text = el.value;
            const textBefore = text.substring(0, cursorStart);
            const lines = textBefore.split('\n');
            const currentLine = lines[lines.length - 1];

            const emptyStepMatch = currentLine.match(/^Bước\s*(\d+)[\:\.\s]*$/i);
            if (emptyStepMatch) {
                e.preventDefault();
                const lastLineStart = cursorStart - currentLine.length;
                el.value = text.substring(0, lastLineStart) + text.substring(cursorStart);
                el.selectionStart = el.selectionEnd = lastLineStart;
                return;
            }

            const allLines = text.split('\n');
            let maxStepNum = 0;
            allLines.forEach(l => {
                const m = l.match(/^Bước\s*(\d+)/i);
                if (m) {
                    const num = parseInt(m[1], 10);
                    if (num > maxStepNum) maxStepNum = num;
                }
            });

            e.preventDefault();
            const nextNum = maxStepNum > 0 ? maxStepNum + 1 : (lines.length + 1);
            const prefix = `\nBước ${nextNum}: `;
            el.value = text.substring(0, cursorStart) + prefix + text.substring(cursorStart);
            el.selectionStart = el.selectionEnd = cursorStart + prefix.length;
        }
    };

    window._hdkhOnStepsInput = function (el) {
        if (!el || !el.value.trim()) return;
        const cursor = el.selectionStart;
        const lines = el.value.split('\n');
        let stepCount = 1;
        let modified = false;

        const formatted = lines.map((line, idx) => {
            if (!line.trim() && idx === lines.length - 1) return line;
            if (!line.trim()) return line;

            const stepMatch = line.match(/^Bước\s*(\d+)[\:\.\s]*(.*)/i);
            if (stepMatch) {
                const content = stepMatch[2];
                const num = stepCount++;
                return `Bước ${num}: ${content}`;
            } else {
                modified = true;
                const num = stepCount++;
                return `Bước ${num}: ${line.trim()}`;
            }
        });

        if (modified) {
            const newText = formatted.join('\n');
            const diffLength = newText.length - el.value.length;
            el.value = newText;
            el.selectionStart = el.selectionEnd = Math.max(0, Math.min(cursor + diffLength, el.value.length));
        }
    };

})();
