/**
 * Trang Hợp Đồng & Tuyển Dụng Các Bộ Phận Công Ty HV
 * Complete upgrade matching Quản Trị Nhân Sự HV (/quantrinhansuhv):
 * 1. ➕ Tạo Đường Link Mới Modal (Tab 1 + Tab 2, Multiple Department Checkboxes, Icon, Theme, Details View)
 * 2. ⚙️ Cài Đặt Mục Modal (Dynamic Subtabs Creation, Renaming, Deletion per Main Section)
 * 3. 🏢 Thanh Bộ Phận Động (Department Filter Bar)
 */
(function() {
    'use strict';

    // Current State Management
    let currentMainTab = localStorage.getItem('hdtd_main_tab') || 'muc3_bieumau';
    let currentSubTab1 = localStorage.getItem('hdtd_sub_tab1') || 'hd_laodong';
    let currentSubTab2 = localStorage.getItem('hdtd_sub_tab2') || 'td_kichban';
    let currentSubTab3 = localStorage.getItem('hdtd_sub_tab3') || 'bm_quytrinh';
    let activeCatFilter = { muc1_hopdong: 'all', muc2_tuyendung: 'all', muc3_bieumau: 'all' };
    let currentSearchQuery = '';

    // Default Subtabs Definitions
    const DEFAULT_SUBTABS_MUC1 = [
        { id: 'hd_laodong', title: 'HĐ Lao Động & Thử Việc', icon: '📄', isCustom: false },
        { id: 'hd_ctv', title: 'HĐ CTV & Đại Lý', icon: '🤝', isCustom: false },
        { id: 'hd_baomat', title: 'HĐ Bảo Mật NDA', icon: '🔒', isCustom: false }
    ];

    const DEFAULT_SUBTABS_MUC2 = [
        { id: 'td_kichban', title: 'JD & Kịch Bản Tuyển Dụng', icon: '📢', isCustom: false },
        { id: 'td_cauhoi', title: 'Bộ Câu Hỏi Phỏng Vấn', icon: '❓', isCustom: false },
        { id: 'td_test', title: 'Bài Test Năng Lực Đầu Vào', icon: '✍️', isCustom: false }
    ];

    const DEFAULT_SUBTABS_MUC3 = [
        { id: 'bm_quytrinh', title: 'Quy Trình Onboarding', icon: '📋', isCustom: false },
        { id: 'bm_danhgia', title: 'Biểu Mẫu Đánh Giá Nhân Sự', icon: '📊', isCustom: false }
    ];

    // Default Department Categories
    const DEFAULT_CATEGORIES = ['Chung', 'Kinh Doanh', 'Marketing', 'Hành Chính', 'Tuyển Dụng', 'Đào Tạo', 'Sản Xuất', 'Kế Toán', 'Pháp Lý'];

    // Helper: Check Management Permissions
    function _hdtdCanManage() {
        let user = window.currentUser;
        if (!user) {
            try {
                user = JSON.parse(localStorage.getItem('user_info') || '{}');
            } catch (e) {
                user = {};
            }
        }
        const role = user.role || user.chucvu || '';
        const name = (user.fullname || user.name || user.username || '').toLowerCase();
        const isLeVietTrinh = name.includes('trinh') || name.includes('lê việt trinh') || name.includes('le viet trinh');

        if (typeof window.canDo === 'function' && role !== 'giam_doc') {
            const hasPerm = window.canDo('quan_tri_nhan_su', 'create') || window.canDo('quan_tri_nhan_su', 'edit') || window.canDo('quan_tri_nhan_su', 'delete');
            if (hasPerm) return true;
        }

        return role === 'giam_doc' || role === 'quan_ly_cap_cao' || isLeVietTrinh;
    }

    function _hdtdHasValidUrl(url) {
        if (!url) return false;
        const str = String(url).trim();
        return str !== '' && str !== '#' && str.toLowerCase() !== 'javascript:void(0)';
    }

    function _hdtdFormatTitle(title) {
        if (!title) return '';
        let str = String(title).trim();
        if (!str) return '';
        const match = str.match(/^(\d+\.\s*)(.*)$/);
        if (match) {
            const prefix = match[1];
            const body = match[2];
            const upperBody = body.split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : '').join(' ');
            return prefix + upperBody;
        }
        return str.split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : '').join(' ');
    }

    function _hdtdFormatDescription(subtitle) {
        if (!subtitle) return '';
        let str = String(subtitle).trim();
        return str;
    }

    function _hdtdFormatDateTime(isoStr) {
        if (!isoStr) return '26/08/2026';
        try {
            const d = new Date(isoStr);
            if (isNaN(d.getTime())) return '26/08/2026';
            const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            return `${date} ${time}`;
        } catch (e) {
            return '26/08/2026';
        }
    }

    window._hdtdCleanText = function(str) {
        if (!str) return '';
        let cleaned = String(str).trim();
        cleaned = cleaned.replace(/^["'“«]+|["'”»]+$/g, '').trim();
        return cleaned;
    };

    window._hdtdCopyText = function(text) {
        const cleanText = window._hdtdCleanText(text);
        if (!cleanText) return;

        navigator.clipboard.writeText(cleanText).then(() => {
            _hdtdShowToast('📋 Đã sao chép nội dung văn bản!');
        }).catch(() => {
            const textArea = document.createElement('textarea');
            textArea.value = cleanText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            _hdtdShowToast('📋 Đã sao chép nội dung văn bản!');
        });
    };

    // Subtabs Getter & Saver
    function _hdtdGetSubtabs(scope) {
        try {
            const raw = localStorage.getItem('hdtd_subtabs_' + scope);
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}

        if (scope === 'muc1_hopdong') return DEFAULT_SUBTABS_MUC1;
        if (scope === 'muc2_tuyendung') return DEFAULT_SUBTABS_MUC2;
        return DEFAULT_SUBTABS_MUC3;
    }

    function _hdtdSaveSubtabs(scope, subtabs) {
        localStorage.setItem('hdtd_subtabs_' + scope, JSON.stringify(subtabs));
        _hdtdSyncSaveToServer();
    }

    // Categories Getter & Saver
    function _hdtdGetCategories(scope) {
        try {
            const raw = localStorage.getItem('hdtd_categories_' + scope);
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}
        return DEFAULT_CATEGORIES;
    }

    function _hdtdSaveCategories(scope, cats) {
        localStorage.setItem('hdtd_categories_' + scope, JSON.stringify(cats));
        _hdtdSyncSaveToServer();
    }

    // Links Getter & Saver per Subtab
    function _hdtdGetCustomSubtabLinks(subId) {
        if (!subId) return [];
        try {
            const raw = localStorage.getItem('hdtd_links_' + subId);
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {}

        // Legacy migration support from hdtd_items_muc1 / 2 / 3
        let legacyKey = 'hdtd_items_muc1';
        if (subId.startsWith('td_')) legacyKey = 'hdtd_items_muc2';
        else if (subId.startsWith('bm_')) legacyKey = 'hdtd_items_muc3';

        try {
            const legacyItems = JSON.parse(localStorage.getItem(legacyKey) || '[]');
            const subItems = legacyItems.filter(i => i.subTab === subId).map(i => ({
                id: i.id,
                title: i.title,
                subtitle: i.notes || '',
                url: i.link || '',
                icon: i.icon || '📄',
                theme: i.theme || 'purple',
                categories: [i.linhVuc || 'Chung'],
                important: !!i.important,
                createdAt: new Date().toISOString()
            }));
            if (subItems.length > 0) return subItems;
        } catch (e) {}

        return [];
    }

    function _hdtdSaveCustomSubtabLinks(subId, links) {
        if (!subId) return;
        localStorage.setItem('hdtd_links_' + subId, JSON.stringify(links));
        _hdtdSyncSaveToServer();
    }

    function _hdtdGetLinkCategories(link) {
        if (!link) return ['Chung'];
        if (Array.isArray(link.categories) && link.categories.length > 0) return link.categories;
        if (link.category) return [link.category];
        if (link.linhVuc) return [link.linhVuc];
        return ['Chung'];
    }

    window._hdtdSelectCatFilter = function(scope, cat) {
        activeCatFilter[scope] = cat;
        _hdtdRenderCurrentMainTab();
    };

    // Central Server Sync
    async function _hdtdSyncLoadFromServer() {
        let loaded = false;
        try {
            const res = await fetch('/api/hopdongtuyendung/config');
            if (res.ok) {
                const data = await res.json();
                if (data && data.value) {
                    const store = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
                    if (store && typeof store === 'object' && Object.keys(store).length > 0) {
                        Object.keys(store).forEach(key => {
                            if (store[key] !== undefined && store[key] !== null) {
                                localStorage.setItem(key, typeof store[key] === 'string' ? store[key] : JSON.stringify(store[key]));
                            }
                        });
                        _hdtdRenderCurrentMainTab();
                        loaded = true;
                    }
                }
            }
        } catch (e) {
            console.warn('Sync load hdtd_store error:', e);
        }

        if (!loaded && _hdtdCanManage()) {
            _hdtdSyncSaveToServer();
        }
    }

    let _syncSaveTimer = null;
    function _hdtdSyncSaveToServer() {
        if (_syncSaveTimer) clearTimeout(_syncSaveTimer);
        _syncSaveTimer = setTimeout(async () => {
            try {
                const store = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('hdtd_')) {
                        store[key] = localStorage.getItem(key);
                    }
                }
                await fetch('/api/hopdongtuyendung/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ value: store })
                });
            } catch (e) {
                console.warn('Sync save hdtd_store error:', e);
            }
        }, 800);
    }

    // Initial Seed Data if empty
    function _hdtdSeedDefaultData() {
        if (!localStorage.getItem('hdtd_links_hd_laodong')) {
            const seedHdLaodong = [
                {
                    id: 'hd_1',
                    title: '1. Hợp Đồng Lao Động Chính Thức HV (Full-time)',
                    subtitle: 'Áp dụng cho nhân viên chính thức ký hợp đồng 1-3 năm sau khi vượt qua 2 tháng thử việc.',
                    url: 'https://docs.google.com/document/u/0/?t=hd_chinhthuc_hv',
                    icon: '📄',
                    theme: 'purple',
                    categories: ['Hành Chính'],
                    important: true
                },
                {
                    id: 'hd_2',
                    title: '2. Hợp Đồng Thử Việc Nhân Viên Kinh Doanh & Telesale',
                    subtitle: 'Thời hạn thử việc 02 tháng, quy định thưởng KPI và chỉ tiêu chốt đơn tối thiểu theo tháng.',
                    url: 'https://docs.google.com/document/u/0/?t=hd_thuviec_sale',
                    icon: '📄',
                    theme: 'purple',
                    categories: ['Kinh Doanh'],
                    important: true
                }
            ];
            localStorage.setItem('hdtd_links_hd_laodong', JSON.stringify(seedHdLaodong));
        }

        if (!localStorage.getItem('hdtd_links_hd_ctv')) {
            const seedHdCtv = [
                {
                    id: 'hd_3',
                    title: '3. Hợp Đồng Cộng Tác Viên Sales & Đại Lý Affiliate',
                    subtitle: 'Thỏa thuận chiết khấu hoa hồng theo doanh số, thanh toán kỳ 15 và 30 hàng tháng.',
                    url: 'https://docs.google.com/document/u/0/?t=hd_ctv_affiliate',
                    icon: '🤝',
                    theme: 'emerald',
                    categories: ['Chung', 'Kinh Doanh'],
                    important: false
                }
            ];
            localStorage.setItem('hdtd_links_hd_ctv', JSON.stringify(seedHdCtv));
        }

        if (!localStorage.getItem('hdtd_links_hd_baomat')) {
            const seedHdBaomat = [
                {
                    id: 'hd_4',
                    title: '4. Cam Kết Bảo Mật Thông Tin & Dữ Liệu Khách Hàng (NDA)',
                    subtitle: 'Bắt buộc ký cùng hợp đồng thử việc cho tất cả nhân sự thuộc bộ phận Sales, MKT, IT và Kế toán.',
                    url: 'https://docs.google.com/document/u/0/?t=hd_nda_baomat',
                    icon: '🔒',
                    theme: 'amber',
                    categories: ['Pháp Lý', 'Hành Chính'],
                    important: true
                }
            ];
            localStorage.setItem('hdtd_links_hd_baomat', JSON.stringify(seedHdBaomat));
        }

        if (!localStorage.getItem('hdtd_links_td_kichban')) {
            const seedTdKichban = [
                {
                    id: 'td_1',
                    title: '1. Kịch Bản & Bài Đăng Tuyển Dụng Chuyên Viên Sales / Telesale',
                    subtitle: 'Mẫu JD tuyển dụng hấp dẫn, thu nhập 12-25 triệu/tháng, chế độ thưởng nóng theo đơn.',
                    url: 'https://docs.google.com/document/u/0/?t=jd_sale_hv',
                    icon: '📢',
                    theme: 'purple',
                    categories: ['Kinh Doanh', 'Tuyển Dụng'],
                    important: true
                },
                {
                    id: 'td_2',
                    title: '2. JD & Tiêu Chuẩn Tuyển Dụng Chuyên Viên Facebook Ads',
                    subtitle: 'Yêu cầu 1 năm kinh nghiệm chạy ads ngành may mặc/đồng phục, ngân sách quản lý >100M/tháng.',
                    url: 'https://docs.google.com/document/u/0/?t=jd_mkt_ads',
                    icon: '📢',
                    theme: 'blue',
                    categories: ['Marketing', 'Tuyển Dụng'],
                    important: true
                }
            ];
            localStorage.setItem('hdtd_links_td_kichban', JSON.stringify(seedTdKichban));
        }

        if (!localStorage.getItem('hdtd_links_td_cauhoi')) {
            const seedTdCauhoi = [
                {
                    id: 'td_3',
                    title: '3. Bộ 20 Câu Hỏi Phỏng Vấn Đánh Giá Kỹ Năng & Thái Độ Ứng Viên HV',
                    subtitle: 'Bộ tiêu chuẩn chấm điểm phỏng vấn dành cho Trưởng phòng & Quản lý cấp cao khi tuyển nhân sự.',
                    url: 'https://docs.google.com/document/u/0/?t=bo_cau_hoi_phong_van',
                    icon: '❓',
                    theme: 'amber',
                    categories: ['Tuyển Dụng'],
                    important: true
                }
            ];
            localStorage.setItem('hdtd_links_td_cauhoi', JSON.stringify(seedTdCauhoi));
        }

        if (!localStorage.getItem('hdtd_links_bm_quytrinh')) {
            const seedBmQuytrinh = [
                {
                    id: 'bm_1',
                    title: '1. Quy Trình Đón Nhân Sự Mới & Đào Tạo Onboarding 7 Ngày',
                    subtitle: 'Quy trình bàn giao máy tính, tài khoản CRM, cấp thẻ nhân viên và người hướng dẫn (mentor).',
                    url: 'https://docs.google.com/document/u/0/?t=onboarding_7ngay',
                    icon: '📋',
                    theme: 'purple',
                    categories: ['Đào Tạo', 'Hành Chính'],
                    important: true
                }
            ];
            localStorage.setItem('hdtd_links_bm_quytrinh', JSON.stringify(seedBmQuytrinh));
        }
    }

    // Main Page Entry Point
    window.renderHopdongtuyendungPage = function(container) {
        if (!container) return;
        _hdtdSeedDefaultData();

        container.innerHTML = `
            <div class="qtns-wrapper">
                <!-- Header Banner -->
                <div class="qtns-header">
                    <div class="qtns-header-left">
                        <div class="qtns-icon-bg">📝</div>
                        <div>
                            <h1 class="qtns-title">HỢP ĐỒNG & TUYỂN DỤNG NV CÁC BỘ PHẬN HV</h1>
                            <p class="qtns-subtitle">Hệ Thống Quản Lý Quy Trình Hợp Đồng Lao Động, Biểu Mẫu Pháp Lý, Kịch Bản Tuyển Dụng & Đón Nhân Sự Các Phòng Ban Doanh Nghiệp</p>
                        </div>
                    </div>
                    <div class="qtns-header-right">
                        <span class="qtns-badge-live">● Hệ Thống Hoạt Động</span>
                    </div>
                </div>

                <!-- 3 Main Section Tabs -->
                <div class="qtns-tabs-main">
                    <button class="qtns-tab-btn ${currentMainTab === 'muc3_bieumau' ? 'active' : ''}" data-maintab="muc3_bieumau" onclick="_hdtdSetMainTab('muc3_bieumau')">
                        <span class="tab-num">MỤC 1</span>
                        <span class="tab-label">📋 Hướng Dẫn & Đào Tạo Nhân Sự Mới</span>
                    </button>
                    <button class="qtns-tab-btn ${currentMainTab === 'muc2_tuyendung' ? 'active' : ''}" data-maintab="muc2_tuyendung" onclick="_hdtdSetMainTab('muc2_tuyendung')">
                        <span class="tab-num">MỤC 2</span>
                        <span class="tab-label">📢 JD & Hình Ảnh Tuyển Dụng</span>
                    </button>
                    <button class="qtns-tab-btn ${currentMainTab === 'muc1_hopdong' ? 'active' : ''}" data-maintab="muc1_hopdong" onclick="_hdtdSetMainTab('muc1_hopdong')">
                        <span class="tab-num">MỤC 3</span>
                        <span class="tab-label">📄 Hợp Đồng Các Bộ Phận</span>
                    </button>
                </div>

                <!-- Dynamic Content Container -->
                <div id="hdtdContentContainer" class="qtns-content-container"></div>
            </div>

            <div id="hdtdToast" class="qtns-toast"></div>
            ${_hdtdGetStyles()}
        `;

        _hdtdSyncLoadFromServer();
        _hdtdRenderCurrentMainTab();
    };

    window._hdtdShowToast = function(msg) {
        const toast = document.getElementById('hdtdToast');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => { toast.classList.remove('show'); }, 2500);
    };

    window._hdtdSetMainTab = function(tabKey) {
        currentMainTab = tabKey;
        localStorage.setItem('hdtd_main_tab', tabKey);

        document.querySelectorAll('.qtns-tab-btn').forEach(btn => {
            if (btn.getAttribute('data-maintab') === tabKey) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        _hdtdRenderCurrentMainTab();
    };

    window._hdtdSwitchSubTab = function(subId) {
        if (currentMainTab === 'muc1_hopdong') {
            currentSubTab1 = subId;
            localStorage.setItem('hdtd_sub_tab1', subId);
        } else if (currentMainTab === 'muc2_tuyendung') {
            currentSubTab2 = subId;
            localStorage.setItem('hdtd_sub_tab2', subId);
        } else {
            currentSubTab3 = subId;
            localStorage.setItem('hdtd_sub_tab3', subId);
        }
        _hdtdRenderCurrentMainTab();
    };

    function _hdtdRenderCurrentMainTab() {
        const container = document.getElementById('hdtdContentContainer');
        if (!container) return;

        let subtabs = _hdtdGetSubtabs(currentMainTab);
        let currentSub = currentSubTab1;
        if (currentMainTab === 'muc2_tuyendung') currentSub = currentSubTab2;
        else if (currentMainTab === 'muc3_bieumau') currentSub = currentSubTab3;

        if (!subtabs.some(s => s.id === currentSub)) {
            currentSub = subtabs[0] ? subtabs[0].id : '';
        }

        const activeSubtab = subtabs.find(s => s.id === currentSub) || subtabs[0] || { id: '', title: '' };
        const categories = _hdtdGetCategories(currentMainTab);
        const activeCat = activeCatFilter[currentMainTab] || 'all';

        const subtabLinks = _hdtdGetCustomSubtabLinks(activeSubtab.id);

        container.innerHTML = `
            <!-- Search Bar -->
            <div style="margin-bottom:20px; position:relative;">
                <div style="position:relative; display:flex; align-items:center;">
                    <span style="position:absolute; left:18px; font-size:18px; color:#7c3aed; pointer-events:none; z-index:2;">🔍</span>
                    <input type="text" id="hdtdSearchInput" value="${currentSearchQuery || ''}" 
                        placeholder="Nhập tên hợp đồng, bộ phận, từ khóa tuyển dụng hoặc tiêu đề cần tìm kiếm (Tìm toàn bộ 3 Mục)..." 
                        style="width:100%; border:2px solid #e9d5ff; border-radius:18px; padding:13px 48px 13px 48px; font-size:14.5px; font-weight:700; background:#ffffff; outline:none; color:#0f172a; box-shadow:0 4px 16px rgba(124,58,237,0.08);"
                        oninput="window._hdtdOnSearchInput(this.value)">
                    <button id="hdtdSearchClearBtn" onclick="window._hdtdClearSearch()" style="position:absolute; right:16px; background:#e2e8f0; border:none; border-radius:50%; width:24px; height:24px; display:${currentSearchQuery ? 'flex' : 'none'}; align-items:center; justify-content:center; cursor:pointer; font-weight:bold; color:#475569;" title="Xóa tìm kiếm">✕</button>
                </div>
            </div>

            <!-- Subtabs Control Bar (Matching Ảnh 2, 3) -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:22px; flex-wrap:wrap; gap:14px; background:linear-gradient(135deg, rgba(250,245,255,0.95), rgba(243,232,255,0.98)); backdrop-filter:blur(16px); padding:14px 22px; border-radius:20px; border:1.5px solid #e9d5ff; box-shadow:0 12px 32px -8px rgba(109,40,217,0.15);">
                <div class="qtns-subtabs" style="margin:0; display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
                    ${subtabs.map(st => `
                        <button class="qtns-subtab-btn ${currentSub === st.id ? 'active' : ''}" onclick="window._hdtdSwitchSubTab('${st.id}')" 
                            style="display:inline-flex; align-items:center; gap:8px; font-size:14px; font-weight:850; padding:10px 22px; border-radius:30px; cursor:pointer; ${currentSub === st.id ? 'background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; border:none; box-shadow:0 6px 18px rgba(109,40,217,0.45);' : 'background:#ffffff; color:#0f172a; border:1.5px solid #cbd5e1;'}">
                            ${st.icon || '📌'} ${st.title}
                        </button>
                    `).join('')}
                </div>
                <div style="display:flex; align-items:center; gap:12px;">
                    ${_hdtdCanManage() ? `
                        <button class="qtns-btn primary" onclick="window._hdtdOpenAddLinkModal('${activeSubtab.id}')" style="border-radius:14px; padding:10px 20px; font-size:13.5px; font-weight:900; background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; border:none; box-shadow:0 6px 18px rgba(109,40,217,0.35); cursor:pointer;">
                            ➕ Tạo Đường Link Mới
                        </button>
                        <button class="qtns-btn secondary" onclick="window._hdtdOpenManageSubtabModal('${currentMainTab}')" style="border-radius:14px; padding:10px 20px; font-size:13.5px; font-weight:900; background:rgba(255,255,255,0.95); color:#6d28d9; border:1.5px solid #d8b4fe; box-shadow:0 4px 14px rgba(109,40,217,0.15); cursor:pointer;">
                            ⚙️ Cài Đặt Mục
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- Department Filter Bar (🏢 Bộ phận Công Ty) -->
            <div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; padding:14px 22px; border-radius:18px; border:1.5px solid #e9d5ff; margin-bottom:22px; box-shadow:0 4px 14px rgba(109,40,217,0.04); flex-wrap:wrap; gap:12px;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <span style="font-size:13.5px; font-weight:900; color:#4c1d95; margin-right:4px;">🏢 Bộ phận:</span>
                    <button class="dept-pill ${activeCat === 'all' ? 'active' : ''}" onclick="window._hdtdSelectCatFilter('${currentMainTab}', 'all')">
                        🌐 Tất Cả Bộ Phận (${subtabLinks.length})
                    </button>
                    ${categories.map(cat => {
                        const count = subtabLinks.filter(l => _hdtdGetLinkCategories(l).includes(cat)).length;
                        return `
                            <button class="dept-pill ${activeCat === cat ? 'active' : ''}" onclick="window._hdtdSelectCatFilter('${currentMainTab}', '${cat.replace(/'/g, "\\'")}')">
                                🏢 ${cat} (${count})
                            </button>
                        `;
                    }).join('')}
                </div>
                ${_hdtdCanManage() ? `
                    <button class="qtns-btn secondary" onclick="window._hdtdOpenManageCatModal('${currentMainTab}')" style="border-radius:12px; padding:9px 18px; font-size:13.5px; font-weight:800; border-color:#d8b4fe; color:#6d28d9; background:#ffffff; cursor:pointer;">
                        ⚙️ Cài Đặt Bộ Phận
                    </button>
                ` : ''}
            </div>

            <!-- Content Grid Area -->
            <div id="hdtdTabContentBody" class="qtns-tab-body"></div>
        `;

        _hdtdRenderSubtabBody(activeSubtab.id, activeCat);
    }

    window._hdtdOnSearchInput = function(query) {
        currentSearchQuery = (query || '').trim();
        const clearBtn = document.getElementById('hdtdSearchClearBtn');
        if (clearBtn) clearBtn.style.display = currentSearchQuery ? 'flex' : 'none';
        _hdtdRenderCurrentMainTab();
    };

    window._hdtdClearSearch = function() {
        currentSearchQuery = '';
        const input = document.getElementById('hdtdSearchInput');
        if (input) input.value = '';
        const clearBtn = document.getElementById('hdtdSearchClearBtn');
        if (clearBtn) clearBtn.style.display = 'none';
        _hdtdRenderCurrentMainTab();
    };

    function _hdtdRenderSubtabBody(subId, activeCat) {
        const bodyEl = document.getElementById('hdtdTabContentBody');
        if (!bodyEl) return;

        let links = _hdtdGetCustomSubtabLinks(subId);

        // Global Search Filter
        if (currentSearchQuery) {
            const q = currentSearchQuery.toLowerCase();
            links = links.filter(l => 
                (l.title && l.title.toLowerCase().includes(q)) ||
                (l.subtitle && l.subtitle.toLowerCase().includes(q)) ||
                (_hdtdGetLinkCategories(l).some(c => c.toLowerCase().includes(q)))
            );
        }

        // Category Filter
        if (activeCat !== 'all') {
            links = links.filter(l => _hdtdGetLinkCategories(l).includes(activeCat));
        }

        const pinnedLinks = links.filter(l => l.important);
        const normalLinks = links.filter(l => !l.important);

        let html = '';

        if (pinnedLinks.length > 0) {
            html += `
                <div style="margin-bottom:24px;">
                    <div style="font-size:14.5px; font-weight:900; color:#b45309; margin-bottom:14px; display:flex; align-items:center; gap:8px;">
                        <span style="font-size:18px;">⭐</span> MỤC QUAN TRỌNG HÀNG ĐẦU (${pinnedLinks.length})
                    </div>
                    <div class="qtns-link-grid">
                        ${pinnedLinks.map(l => _hdtdBuildCardHtml(l, subId)).join('')}
                    </div>
                </div>
            `;
        }

        if (normalLinks.length > 0) {
            html += `
                <div>
                    <div style="font-size:14.5px; font-weight:900; color:#334155; margin-bottom:14px; display:flex; align-items:center; gap:8px;">
                        <span style="font-size:18px;">📂</span> DANH SÁCH HỒ SƠ & TÀI LIỆU (${normalLinks.length})
                    </div>
                    <div class="qtns-link-grid">
                        ${normalLinks.map(l => _hdtdBuildCardHtml(l, subId)).join('')}
                    </div>
                </div>
            `;
        }

        if (pinnedLinks.length === 0 && normalLinks.length === 0) {
            html = `
                <div style="text-align:center; padding:50px 20px; background:#ffffff; border:2px dashed #e2e8f0; border-radius:24px; color:#64748b;">
                    <div style="font-size:42px; margin-bottom:12px;">📂</div>
                    <h3 style="margin:0 0 6px 0; font-size:16px; font-weight:850; color:#334155;">Chưa có đường link tài liệu nào</h3>
                    <p style="margin:0 0 16px 0; font-size:13.5px; color:#94a3b8; font-weight:600;">Vui lòng bấm "+ Tạo Đường Link Mới" ở góc trên để thêm tài liệu hợp đồng hoặc kịch bản tuyển dụng.</p>
                    ${_hdtdCanManage() ? `
                        <button onclick="window._hdtdOpenAddLinkModal('${subId}')" style="background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; border:none; border-radius:14px; padding:10px 22px; font-weight:900; font-size:13.5px; cursor:pointer; box-shadow:0 6px 18px rgba(109,40,217,0.35);">
                            ➕ Tạo Đường Link Mới Ngay
                        </button>
                    ` : ''}
                </div>
            `;
        }

        bodyEl.innerHTML = html;
    }

    function _hdtdBuildCardHtml(link, subId) {
        const canManage = _hdtdCanManage();
        const hasValidUrl = _hdtdHasValidUrl(link.url);
        const categories = _hdtdGetLinkCategories(link);

        return `
            <div class="qtns-card-item ${link.important ? 'is-pinned-card' : ''}">
                <div class="card-accent-bar theme-${link.theme || 'purple'}"></div>
                ${link.imageUrl ? `
                    <div style="position:relative; width:100%; height:140px; overflow:hidden; background:#f1f5f9; cursor:pointer;" onclick="window._hdtdOpenDetailModal('${link.id}', '${subId}')" title="Click để xem chi tiết tài liệu & kịch bản">
                        <img src="${link.imageUrl}" style="width:100%; height:100%; object-fit:cover; display:block; transition:transform 0.3s ease;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        <div style="position:absolute; bottom:8px; right:8px; background:rgba(15,23,42,0.75); color:#ffffff; font-size:11px; font-weight:800; padding:4px 10px; border-radius:8px; backdrop-filter:blur(4px); display:flex; align-items:center; gap:4px;">
                            📋 Xem Chi Tiết
                        </div>
                    </div>
                ` : ''}
                <div class="card-inner">
                    <div class="card-head-row">
                        <div class="card-icon-box theme-${link.theme || 'purple'}">${link.icon || '📄'}</div>
                        <div style="display:flex; flex-wrap:wrap; gap:4px;">
                            ${categories.map(c => `<span class="card-badge theme-${link.theme || 'purple'}">🏢 ${c}</span>`).join('')}
                        </div>
                        ${canManage ? `
                            <div class="card-quick-actions">
                                <button class="card-action-btn pin" onclick="window._hdtdTogglePinLink('${link.id}', '${subId}')" title="${link.important ? 'Bỏ ghim' : 'Ghim hàng đầu'}">
                                    ${link.important ? '⭐' : '☆'}
                                </button>
                                <button class="card-action-btn edit" onclick="window._hdtdOpenEditLinkModal('${link.id}', '${subId}')" title="Sửa đường link">
                                    ✏️
                                </button>
                                <button class="card-action-btn delete" onclick="window._hdtdDeleteLink('${link.id}', '${subId}')" title="Xóa đường link">
                                    🗑️
                                </button>
                            </div>
                        ` : ''}
                    </div>

                    <div class="card-main-content" style="cursor:pointer;" onclick="window._hdtdOpenDetailModal('${link.id}', '${subId}')" title="Nhấp để xem chi tiết đầy đủ tài liệu">
                        <div class="card-title">${_hdtdFormatTitle(link.title)}</div>
                        <div class="card-desc">${_hdtdFormatDescription(link.subtitle || link.url)}</div>
                    </div>

                    <div style="display:flex; gap:8px; margin-top:14px; align-items:center;">
                        <button type="button" onclick="window._hdtdOpenDetailModal('${link.id}', '${subId}')" 
                            style="flex:1; min-width:0; border:none; background:linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%); color:#ffffff; font-weight:850; font-size:12.5px; padding:10px 10px; border-radius:12px; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:4px; box-shadow:0 4px 12px rgba(109,40,217,0.25); transition:all 0.2s ease; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="Xem Chi Tiết Quy Trình">
                            📋 <span>${hasValidUrl ? 'Xem Chi Tiết ➔' : 'Xem Chi Tiết Quy Trình ➔'}</span>
                        </button>
                        ${hasValidUrl ? `
                            <a href="${link.url}" target="_blank" rel="noopener" class="card-btn-open" title="Mở Tài Liệu Trực Tiếp">
                                🔗 <span>Mở Tài Liệu ↗</span>
                            </a>
                        ` : ''}
                    </div>

                    <div class="card-updated-info" style="font-size:10.5px; color:#94a3b8; font-weight:600; margin-top:12px; display:flex; align-items:center; gap:5px; flex-wrap:wrap; background:#f8fafc; padding:4px 10px; border-radius:8px; border:1px solid #f1f5f9; width:fit-content;">
                        <span>🕒 Cập nhật:</span>
                        <strong style="color:#475569; font-weight:750;">${link.updatedBy || link.createdBy || 'Giám Đốc'}</strong>
                        <span style="color:#cbd5e1;">•</span>
                        <span style="color:#64748b;">${_hdtdFormatDateTime(link.updatedAt || link.createdAt)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    window._hdtdTogglePinLink = function(id, subId) {
        let links = _hdtdGetCustomSubtabLinks(subId);
        links = links.map(l => {
            if (String(l.id) === String(id)) l.important = !l.important;
            return l;
        });
        _hdtdSaveCustomSubtabLinks(subId, links);
        _hdtdShowToast('⭐ Đã cập nhật trạng thái ghim!');
        _hdtdRenderCurrentMainTab();
    };

    window._hdtdDeleteLink = function(id, subId) {
        if (!confirm('Bạn có chắc chắn muốn xóa đường link tài liệu này không?')) return;
        let links = _hdtdGetCustomSubtabLinks(subId);
        links = links.filter(l => String(l.id) !== String(id));
        _hdtdSaveCustomSubtabLinks(subId, links);
        _hdtdShowToast('🗑️ Đã xóa đường link!');
        _hdtdRenderCurrentMainTab();
    };

    // ==========================================
    // 1. LINK MODAL SYSTEM (Matching Image 4)
    // ==========================================
    function _hdtdEnsureLinkModalInDOM() {
        let modal = document.getElementById('hdtdLinkModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'qtns-modal-overlay';
            modal.id = 'hdtdLinkModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:99999; align-items:center; justify-content:center; padding:20px;';
            modal.innerHTML = `
                <div class="qtns-modal-card" style="max-height:88vh; display:flex; flex-direction:column; width:100%; max-width:640px; border-radius:24px; overflow:hidden; background:#ffffff; box-shadow:0 25px 50px -12px rgba(91,33,182,0.35);">
                    <div class="qtns-modal-header" style="flex-shrink:0; padding:18px 24px; background:linear-gradient(135deg, #4c1d95, #6d28d9); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                        <h3 id="hdtdModalTitle" style="margin:0; font-size:17.5px; font-weight:900;">➕ TẠO ĐƯỜNG LINK TÀI LIỆU HỢP ĐỒNG & TUYỂN DỤNG MỚI</h3>
                        <button class="qtns-modal-close" onclick="window._hdtdCloseLinkModal()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:30px; height:30px; border-radius:50%; cursor:pointer; font-size:16px; font-weight:bold;">✕</button>
                    </div>

                    <div class="qtns-modal-body" style="flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:14px; background:#fcfafc;">
                        <input type="hidden" id="hdtdFormLinkId" value="">

                        <!-- Modal Tabs Navigation -->
                        <div id="hdtdModalTabNav" style="display:flex; gap:10px; border-bottom:2px solid #e9d5ff; padding-bottom:12px; margin-bottom:6px;">
                            <button type="button" id="hdtdTabBtnBasic" onclick="window._hdtdSwitchModalTab('basic')" style="flex:1; padding:10px 14px; border-radius:12px; border:none; background:#7c3aed; color:#ffffff; font-weight:800; font-size:14px; cursor:pointer; transition:all 0.2s ease;">
                                📁 TAB 1: Thông Tin & Link (*)
                            </button>
                            <button type="button" id="hdtdTabBtnScript" onclick="window._hdtdSwitchModalTab('script')" style="flex:1; padding:10px 14px; border-radius:12px; border:1.5px solid #cbd5e1; background:#f8fafc; color:#0f172a; font-weight:800; font-size:14px; cursor:pointer; transition:all 0.2s ease;">
                                📋 TAB 2: Quy Trình & Hướng Dẫn*
                            </button>
                        </div>

                        <!-- PANEL 1: BASIC INFO & LINK -->
                        <div id="hdtdModalPanelBasic" style="display:block;">
                            <div class="qtns-form-group" style="margin-bottom:14px;">
                                <label style="color:#5b21b6; font-weight:900; display:block; margin-bottom:6px;">📁 Danh Mục Quản Trị (* BẮT BUỘC):</label>
                                <select id="hdtdFormSubtab" required style="width:100%; border: 2px solid #7c3aed; background: #f3e8ff; font-weight: 800; color: #4c1d95; padding:10px 14px; border-radius:12px;" onchange="window._hdtdOnFormSubtabChange()">
                                </select>
                            </div>
                            <div class="qtns-form-group" style="margin-bottom:14px;">
                                <label style="color:#6b21a8; font-weight:900; display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                    <span>🏢 Bộ Phận Tài Liệu (* BẮT BUỘC - Chọn nhiều):</span>
                                </label>
                                <div id="hdtdFormCategoryCheckboxes" style="display:flex; flex-wrap:wrap; gap:10px; padding:12px; border:2px solid #a855f7; background:#faf5ff; border-radius:16px; max-height:150px; overflow-y:auto;">
                                </div>
                            </div>
                            <div class="qtns-form-group" style="margin-bottom:14px;">
                                <label style="color:#0f172a; font-weight:850; display:block; margin-bottom:6px;">Tiêu đề đường link tài liệu (*):</label>
                                <input type="text" id="hdtdFormTitle" placeholder="Ví dụ: Hợp đồng thử việc kinh doanh / Mẫu JD tuyển dụng Telesale..." required style="width:100%; border:2px solid #e9d5ff; border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:700; color:#0f172a;">
                            </div>
                            <div class="qtns-form-group" style="margin-bottom:14px;">
                                <label style="color:#334155; font-weight:850; display:block; margin-bottom:6px;">📝 Mô tả / Ghi chú (tự động xuống dòng):</label>
                                <textarea id="hdtdFormSubtitle" rows="6" placeholder="Mô tả tóm tắt nội dung quy trình hoặc ghi chú điều khoản hợp đồng..." style="width:100%; border:2px solid #e9d5ff; border-radius:16px; padding:12px 16px; font-size:13.5px; font-weight:600; line-height:1.55; outline:none; resize:vertical; min-height:160px; color:#0f172a; font-family:inherit; background:#ffffff; box-sizing:border-box;"></textarea>
                            </div>
                            <div class="qtns-form-group" style="margin-bottom:14px;">
                                <label style="color:#0f172a; font-weight:850; display:block; margin-bottom:6px;">Đường link URL tài liệu (Google Sheets / Word / Link ngoài):</label>
                                <input type="url" id="hdtdFormUrl" placeholder="https://docs.google.com/..." style="width:100%; border:2px solid #e9d5ff; border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:700; color:#0f172a;">
                            </div>
                            <div class="qtns-form-group" style="margin-bottom:14px;">
                                <label style="color:#0f172a; font-weight:850; display:block; margin-bottom:6px;">🖼️ Hình Ảnh Minh Họa / Sơ Đồ / Mẫu (Không bắt buộc):</label>
                                <div style="display:flex; flex-direction:column; gap:8px;">
                                    <input type="file" id="hdtdFormImageFile" accept="image/*" style="display:none;" onchange="window._hdtdOnImageSelected(this)">
                                    <input type="hidden" id="hdtdFormImageUrl" value="">
                                    <div style="display:flex; gap:10px; align-items:center;">
                                        <button type="button" onclick="document.getElementById('hdtdFormImageFile').click()" style="background:#f3e8ff; color:#6b21a8; border:1.5px solid #d8b4fe; border-radius:12px; padding:9px 16px; font-size:13px; font-weight:800; cursor:pointer;">
                                            📷 Chọn Hình Ảnh Từ Máy Tính
                                        </button>
                                        <button type="button" id="hdtdFormImageRemoveBtn" onclick="window._hdtdRemoveSelectedImage()" style="display:none; background:#fee2e2; color:#dc2626; border:none; border-radius:10px; padding:8px 14px; font-size:12.5px; font-weight:800; cursor:pointer;">
                                            ✕ Xóa Ảnh
                                        </button>
                                    </div>
                                    <div id="hdtdFormImagePreviewBox" style="display:none; margin-top:6px; border:1.5px dashed #c084fc; border-radius:14px; padding:8px; background:#faf5ff; width:fit-content; max-width:100%;">
                                        <img id="hdtdFormImagePreviewImg" src="" style="max-height:160px; border-radius:10px; object-fit:contain;">
                                    </div>
                                </div>
                            </div>
                            <div class="qtns-form-row" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                                <div class="qtns-form-group">
                                    <label style="color:#334155; font-weight:850; display:block; margin-bottom:6px;">Icon Biểu Tượng:</label>
                                    <select id="hdtdFormIcon" style="width:100%; border:1.5px solid #cbd5e1; border-radius:12px; padding:9px 12px; font-size:13px; font-weight:700;">
                                        <option value="📄">📄 Hợp Đồng Lao Động</option>
                                        <option value="📢">📢 JD Tuyển Dụng</option>
                                        <option value="❓">❓ Bộ Câu Hỏi Phỏng Vấn</option>
                                        <option value="✍️">✍️ Bài Test Năng Lực</option>
                                        <option value="📋">📋 Quy Trình Onboarding</option>
                                        <option value="🤝">🤝 HĐ CTV & Đại Lý</option>
                                        <option value="🔒">🔒 HĐ Bảo Mật NDA</option>
                                        <option value="⚖️">⚖️ Chế Độ Điều Khoản</option>
                                    </select>
                                </div>
                                <div class="qtns-form-group">
                                    <label style="color:#334155; font-weight:850; display:block; margin-bottom:6px;">Tông Màu Hiển Thị:</label>
                                    <select id="hdtdFormTheme" style="width:100%; border:1.5px solid #cbd5e1; border-radius:12px; padding:9px 12px; font-size:13px; font-weight:700;">
                                        <option value="purple">🟣 Tím Hoàng Gia (Royal Purple)</option>
                                        <option value="emerald">🟢 Xanh Ngọc Bích (Emerald)</option>
                                        <option value="blue">🔵 Xanh Dương (Royal Blue)</option>
                                        <option value="amber">🟠 Cam Hổ Phách</option>
                                        <option value="rose">🔴 Đỏ Ruby</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- PANEL 2: SCRIPT / GUIDE / POLICY -->
                        <div id="hdtdModalPanelScript" style="display:none;">
                            <div style="border:2px dashed #c084fc; background:#faf5ff; padding:16px; border-radius:18px;">
                                <!-- 1. STEPS -->
                                <div class="qtns-form-group" style="margin-bottom:14px;">
                                    <label style="color:#5b21b6; font-weight:900; display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                        <span>📋 QUY TRÌNH THỰC THI TỪNG BƯỚC:</span>
                                        <span style="font-size:12px; color:#6b21a8; font-weight:700;">(Xuống dòng tự động tạo Bước)</span>
                                    </label>
                                    <textarea id="hdtdFormSteps" rows="8" 
                                        placeholder="Bước 1: Tiếp nhận nhu cầu tuyển dụng&#10;Bước 2: Sàng lọc hồ sơ ứng viên..." 
                                        style="width:100%; border:2px solid #d8b4fe; border-radius:16px; padding:14px 18px; font-size:13.5px; font-weight:700; line-height:1.6; outline:none; resize:vertical; min-height:220px; color:#4c1d95; font-family:inherit; background:#ffffff;"
                                        onfocus="window._hdtdOnStepsFocus(this)"
                                        onkeydown="window._hdtdOnStepsKeyDown(event, this)"></textarea>
                                    <div style="display:flex; justify-content:flex-end; margin-top:4px;">
                                        <button type="button" onclick="window._hdtdAddStepLine()" style="background:#f3e8ff; color:#6b21a8; border:1px solid #d8b4fe; border-radius:8px; padding:4px 10px; font-size:12px; font-weight:800; cursor:pointer;">
                                            ➕ Thêm Bước Thực Thi
                                        </button>
                                    </div>
                                </div>

                                <!-- 2. GUIDE -->
                                <div class="qtns-form-group" style="margin-bottom:14px;">
                                    <label style="color:#4c1d95; font-weight:900; display:block; margin-bottom:6px;">
                                        🗣️ HƯỚNG DẪN TRAO ĐỔI & CÂU HỎI MẪU:
                                    </label>
                                    <div id="hdtdGuideQuestionsContainer" style="display:flex; flex-direction:column; gap:10px;"></div>
                                    <button type="button" onclick="window._hdtdAddGuideQuestionRow()" style="margin-top:8px; background:#f3e8ff; color:#6b21a8; border:1.5px solid #d8b4fe; border-radius:10px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer;">
                                        ➕ Thêm Câu Hỏi & Mục Tiêu
                                    </button>
                                </div>

                                <!-- 3. WARRANTY / POLICY -->
                                <div class="qtns-form-group" style="margin-bottom:6px;">
                                    <label style="color:#6b21a8; font-weight:900; display:block; margin-bottom:6px;">
                                        ⚖️ ĐIỀU KHOẢN QUY ĐỊNH & CAM KẾT:
                                    </label>
                                    <div id="hdtdWarrantyContainer" style="display:flex; flex-direction:column; gap:8px;"></div>
                                    <button type="button" onclick="window._hdtdAddWarrantyRow()" style="margin-top:8px; background:#faf5ff; color:#7e22ce; border:1.5px solid #e9d5ff; border-radius:10px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer;">
                                        ➕ Thêm Điều Khoản Quy Định
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="qtns-modal-footer" style="flex-shrink:0; padding:14px 24px; background:#ffffff; border-top:1.5px solid #e2e8f0; display:flex; justify-content:flex-end; gap:12px;">
                        <button class="qtns-btn secondary" onclick="window._hdtdCloseLinkModal()" style="padding:10px 20px; border-radius:12px; font-weight:800;">Hủy Bỏ</button>
                        <button class="qtns-btn primary" onclick="window._hdtdSaveLinkFromModal()" style="padding:10px 24px; border-radius:12px; font-weight:900; background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; cursor:pointer;">💾 Lưu Đường Link</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    }

    window._hdtdOpenAddLinkModal = function(targetSub) {
        const modal = _hdtdEnsureLinkModalInDOM();
        document.getElementById('hdtdModalTitle').innerText = '➕ TẠO ĐƯỜNG LINK TÀI LIỆU HỢP ĐỒNG & TUYỂN DỤNG MỚI';
        document.getElementById('hdtdFormLinkId').value = '';
        document.getElementById('hdtdFormTitle').value = '';
        document.getElementById('hdtdFormSubtitle').value = '';
        document.getElementById('hdtdFormUrl').value = '';
        window._hdtdRemoveSelectedImage();

        const stepsInput = document.getElementById('hdtdFormSteps');
        if (stepsInput) stepsInput.value = '';

        const guideContainer = document.getElementById('hdtdGuideQuestionsContainer');
        if (guideContainer) guideContainer.innerHTML = '';

        const warrantyContainer = document.getElementById('hdtdWarrantyContainer');
        if (warrantyContainer) warrantyContainer.innerHTML = '';

        window._hdtdSwitchModalTab('basic');
        window._hdtdPopulateSubtabOptions(targetSub);
        modal.style.display = 'flex';
    };

    window._hdtdOpenEditLinkModal = function(id, targetSub) {
        let links = _hdtdGetCustomSubtabLinks(targetSub);
        let item = links.find(l => String(l.id) === String(id));
        if (!item) return;

        const modal = _hdtdEnsureLinkModalInDOM();

        document.getElementById('hdtdModalTitle').innerText = '✏️ CHỈNH SỬA ĐƯỜNG LINK TÀI LIỆU HỢP ĐỒNG & TUYỂN DỤNG';
        document.getElementById('hdtdFormLinkId').value = item.id;
        document.getElementById('hdtdFormTitle').value = item.title || '';
        document.getElementById('hdtdFormSubtitle').value = item.subtitle || '';
        document.getElementById('hdtdFormUrl').value = item.url || '';
        document.getElementById('hdtdFormIcon').value = item.icon || '📄';
        document.getElementById('hdtdFormTheme').value = item.theme || 'purple';

        if (item.imageUrl) {
            document.getElementById('hdtdFormImageUrl').value = item.imageUrl;
            const previewBox = document.getElementById('hdtdFormImagePreviewBox');
            const previewImg = document.getElementById('hdtdFormImagePreviewImg');
            const removeBtn = document.getElementById('hdtdFormImageRemoveBtn');
            if (previewImg) previewImg.src = item.imageUrl;
            if (previewBox) previewBox.style.display = 'block';
            if (removeBtn) removeBtn.style.display = 'inline-flex';
        } else {
            window._hdtdRemoveSelectedImage();
        }

        // Populate Tab 2 fields
        const stepsText = Array.isArray(item.steps) ? item.steps.join('\n') : (item.steps || '');
        const stepsInput = document.getElementById('hdtdFormSteps');
        if (stepsInput) stepsInput.value = stepsText;

        const guideContainer = document.getElementById('hdtdGuideQuestionsContainer');
        if (guideContainer) {
            guideContainer.innerHTML = '';
            const guides = Array.isArray(item.saleGuide) ? item.saleGuide : [];
            if (guides.length > 0) {
                guides.forEach(g => {
                    const qText = typeof g === 'object' ? (g.question || '') : String(g);
                    window._hdtdAddGuideQuestionRow(qText);
                });
            }
        }

        const warrantyContainer = document.getElementById('hdtdWarrantyContainer');
        if (warrantyContainer) {
            warrantyContainer.innerHTML = '';
            const warranty = Array.isArray(item.warranty) ? item.warranty : [];
            if (warranty.length > 0) {
                warranty.forEach(w => {
                    const wText = typeof w === 'object' ? (w.text || '') : String(w);
                    window._hdtdAddWarrantyRow(wText);
                });
            }
        }

        window._hdtdSwitchModalTab('basic');
        const selectedCats = _hdtdGetLinkCategories(item);
        window._hdtdPopulateSubtabOptions(targetSub, selectedCats);
        modal.style.display = 'flex';
    };

    window._hdtdCloseLinkModal = function() {
        const modal = document.getElementById('hdtdLinkModal');
        if (modal) modal.style.display = 'none';
    };

    window._hdtdPopulateSubtabOptions = function(selectedSub, selectedCategories) {
        const subSelect = document.getElementById('hdtdFormSubtab');
        const box = document.getElementById('hdtdFormCategoryCheckboxes');
        if (!subSelect || !box) return;

        const subtabs = _hdtdGetSubtabs(currentMainTab);
        const activeSub = selectedSub || (subtabs[0] ? subtabs[0].id : '');
        subSelect.innerHTML = subtabs.map(s => `<option value="${s.id}" ${s.id === activeSub ? 'selected' : ''}>📁 ${s.title}</option>`).join('');

        const cats = _hdtdGetCategories(currentMainTab);

        let selectedArr = [];
        if (Array.isArray(selectedCategories)) {
            selectedArr = selectedCategories;
        } else if (typeof selectedCategories === 'string' && selectedCategories) {
            selectedArr = [selectedCategories];
        }

        if (cats.length === 0) {
            box.innerHTML = `<div style="color:#64748b; font-size:13px; font-weight:600; padding:4px;">Chưa có bộ phận nào. Hãy bấm Cài Đặt Bộ Phận để tạo thêm!</div>`;
            return;
        }

        box.innerHTML = cats.map(c => {
            const isChecked = selectedArr.includes(c);
            return `
                <label style="display:inline-flex; align-items:center; gap:7px; background:${isChecked ? '#f3e8ff' : '#ffffff'}; border:1.5px solid ${isChecked ? '#7c3aed' : '#d8b4fe'}; padding:7px 14px; border-radius:12px; font-size:13.5px; font-weight:800; color:${isChecked ? '#5b21b6' : '#334155'}; cursor:pointer; user-select:none; transition:all 0.15s ease;">
                    <input type="checkbox" name="hdtdCategoryCheck" value="${c.replace(/"/g, '&quot;')}" ${isChecked ? 'checked' : ''} style="width:16px; height:16px; accent-color:#7c3aed; cursor:pointer;" onchange="this.parentElement.style.background=this.checked?'#f3e8ff':'#ffffff'; this.parentElement.style.borderColor=this.checked?'#7c3aed':'#d8b4fe'; this.parentElement.style.color=this.checked?'#5b21b6':'#334155';">
                    <span>🏢 ${c}</span>
                </label>
            `;
        }).join('');
    };

    window._hdtdOnFormSubtabChange = function() {
        window._hdtdPopulateSubtabOptions(document.getElementById('hdtdFormSubtab')?.value);
    };

    window._hdtdSwitchModalTab = function(tabName) {
        const tabBasic = document.getElementById('hdtdTabBtnBasic');
        const tabScript = document.getElementById('hdtdTabBtnScript');
        const panelBasic = document.getElementById('hdtdModalPanelBasic');
        const panelScript = document.getElementById('hdtdModalPanelScript');

        if (tabName === 'basic') {
            tabBasic.style.background = '#7c3aed'; tabBasic.style.color = '#ffffff'; tabBasic.style.border = 'none';
            tabScript.style.background = '#f8fafc'; tabScript.style.color = '#0f172a'; tabScript.style.border = '1.5px solid #cbd5e1';
            panelBasic.style.display = 'block';
            panelScript.style.display = 'none';
        } else {
            tabScript.style.background = '#7c3aed'; tabScript.style.color = '#ffffff'; tabScript.style.border = 'none';
            tabBasic.style.background = '#f8fafc'; tabBasic.style.color = '#0f172a'; tabBasic.style.border = '1.5px solid #cbd5e1';
            panelScript.style.display = 'block';
            panelBasic.style.display = 'none';
        }
    };

    window._hdtdAddGuideQuestionRow = function(question = '') {
        const container = document.getElementById('hdtdGuideQuestionsContainer');
        if (!container) return;
        const index = container.children.length + 1;
        const div = document.createElement('div');
        div.style.cssText = 'background:#ffffff; border:1.5px solid #c084fc; border-radius:12px; padding:10px 12px; position:relative;';

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="font-size:12px; font-weight:850; color:#6d28d9;">📌 Câu hỏi / Yêu cầu mẫu ${index}</span>
                <button type="button" onclick="this.parentElement.parentElement.remove()" style="background:#fee2e2; color:#dc2626; border:none; border-radius:6px; padding:2px 8px; font-size:11px; font-weight:800; cursor:pointer;">❌ Xóa</button>
            </div>
            <textarea class="hdtd-guide-question" rows="2" placeholder="Câu hỏi hoặc tiêu chí phỏng vấn ${index}..." style="width:100%; border:1px solid #d8b4fe; border-radius:8px; padding:8px 10px; font-size:13px; font-weight:700; color:#4c1d95; background:#faf5ff; resize:vertical; min-height:50px; font-family:inherit; line-height:1.5; box-sizing:border-box;">${question}</textarea>
        `;
        container.appendChild(div);
    };

    window._hdtdAddWarrantyRow = function(text = '') {
        const container = document.getElementById('hdtdWarrantyContainer');
        if (!container) return;
        const index = container.children.length + 1;
        const div = document.createElement('div');
        div.style.cssText = 'display:flex; align-items:flex-start; gap:8px; background:#ffffff; border:1.5px solid #e9d5ff; border-radius:10px; padding:8px 10px;';

        div.innerHTML = `
            <span style="font-size:12px; font-weight:850; color:#7e22ce; white-space:nowrap; margin-top:6px;">Quy Định ${index}:</span>
            <textarea class="hdtd-warranty-text" rows="2" placeholder="Nội dung quy định / cam kết hợp đồng ${index}" style="flex:1; border:1px solid #d8b4fe; border-radius:8px; padding:6px 10px; font-size:13px; font-weight:700; color:#581c87; resize:vertical; min-height:45px; font-family:inherit; line-height:1.45; box-sizing:border-box;">${text}</textarea>
            <button type="button" onclick="this.parentElement.remove()" style="background:#fee2e2; color:#dc2626; border:none; border-radius:6px; padding:4px 8px; font-size:11px; font-weight:800; cursor:pointer; margin-top:6px;">❌</button>
        `;
        container.appendChild(div);
    };

    window._hdtdSaveLinkFromModal = function() {
        const id = document.getElementById('hdtdFormLinkId').value;
        const title = document.getElementById('hdtdFormTitle').value.trim();
        const subtitle = document.getElementById('hdtdFormSubtitle').value.trim();
        const url = document.getElementById('hdtdFormUrl').value.trim();
        const icon = document.getElementById('hdtdFormIcon').value;
        const theme = document.getElementById('hdtdFormTheme').value;
        const subtabId = document.getElementById('hdtdFormSubtab').value;

        const checkedInputs = document.querySelectorAll('input[name="hdtdCategoryCheck"]:checked');
        const categories = Array.from(checkedInputs).map(cb => cb.value);

        if (!subtabId) {
            alert('⚠️ BẮT BUỘC: Vui lòng chọn Danh Mục Quản Trị!');
            window._hdtdSwitchModalTab('basic');
            return;
        }

        if (categories.length === 0) {
            alert('⚠️ BẮT BUỘC: Vui lòng chọn ít nhất 1 Bộ Phận Tài Liệu!');
            window._hdtdSwitchModalTab('basic');
            return;
        }

        if (!title) {
            alert('⚠️ BẮT BUỘC: Vui lòng nhập tiêu đề đường link tài liệu!');
            window._hdtdSwitchModalTab('basic');
            document.getElementById('hdtdFormTitle').focus();
            return;
        }

        const stepsText = (document.getElementById('hdtdFormSteps')?.value || '').trim();
        const steps = stepsText ? stepsText.split('\n').map(s => s.trim()).filter(Boolean) : [];

        const saleGuideItems = [];
        document.querySelectorAll('.hdtd-guide-question').forEach(q => {
            if (q.value.trim()) saleGuideItems.push({ question: q.value.trim() });
        });

        const warrantyItems = [];
        document.querySelectorAll('.hdtd-warranty-text').forEach(w => {
            if (w.value.trim()) warrantyItems.push(w.value.trim());
        });

        const imageUrl = document.getElementById('hdtdFormImageUrl')?.value || '';
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

        let links = _hdtdGetCustomSubtabLinks(subtabId);
        if (id) {
            links = links.map(l => {
                if (String(l.id) === String(id)) {
                    return { ...l, title, subtitle, url: finalUrl, imageUrl, icon, theme, category, categories, steps, saleGuide: saleGuideItems, warranty: warrantyItems, updatedAt: new Date().toISOString() };
                }
                return l;
            });
        } else {
            const newId = 'hdtd_link_' + Date.now();
            links.push({ id: newId, title, subtitle, url: finalUrl, imageUrl, icon, theme, category, categories, steps, saleGuide: saleGuideItems, warranty: warrantyItems, createdAt: new Date().toISOString() });
        }

        _hdtdSaveCustomSubtabLinks(subtabId, links);
        window._hdtdCloseLinkModal();
        _hdtdRenderCurrentMainTab();
        _hdtdShowToast('💾 Đã lưu đường link tài liệu thành công!');
    };

    // ==========================================
    // 2. DETAIL VIEW MODAL
    // ==========================================
    function _hdtdEnsureDetailModalInDOM() {
        let modal = document.getElementById('hdtdDetailModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'qtns-modal-overlay';
            modal.id = 'hdtdDetailModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:99999; align-items:center; justify-content:center; padding:20px;';
            modal.innerHTML = `
                <div class="qtns-modal-card" style="max-height:90vh; display:flex; flex-direction:column; width:100%; max-width:720px; border-radius:24px; overflow:hidden; background:#ffffff; box-shadow:0 25px 50px -12px rgba(0,0,0,0.35); border:1.5px solid #d8b4fe;">
                    <div id="hdtdDetailModalHeader" style="flex-shrink:0; padding:20px 26px; background:linear-gradient(135deg, #4c1d95, #6d28d9); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <span id="hdtdDetailIcon" style="font-size:26px; background:rgba(255,255,255,0.2); padding:8px 12px; border-radius:14px;">📄</span>
                            <div>
                                <h3 id="hdtdDetailTitle" style="margin:0; font-size:18px; font-weight:900; color:#ffffff; line-height:1.3;">Chi Tiết Tài Liệu Hợp Đồng & Tuyển Dụng</h3>
                            </div>
                        </div>
                        <button class="qtns-modal-close" onclick="window._hdtdCloseDetailModal()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:34px; height:34px; border-radius:50%; cursor:pointer; font-size:18px; font-weight:bold;">✕</button>
                    </div>

                    <div class="qtns-modal-body" style="flex:1; overflow-y:auto; padding:22px 26px; display:flex; flex-direction:column; gap:18px; background:#fcfafc;">
                        <div id="hdtdDetailImageBox" style="display:none; background:#ffffff; border:1.5px solid #e9d5ff; border-radius:18px; padding:16px; text-align:center;">
                            <div style="font-size:13px; font-weight:850; color:#6b21a8; margin-bottom:8px; text-align:left;">🖼️ HÌNH ẢNH MINH HỌA:</div>
                            <img id="hdtdDetailImg" src="" style="max-height:300px; max-width:100%; border-radius:12px; cursor:pointer; object-fit:contain;" onclick="window._hdtdOpenLightbox(this.src)" title="Click để phóng to ảnh nét căng">
                        </div>

                        <div id="hdtdDetailSubtitleBox" style="display:none; background:#ffffff; border:1.5px solid #e9d5ff; border-radius:16px; padding:16px 20px;">
                            <div style="font-size:13px; font-weight:850; color:#6b21a8; margin-bottom:6px;">📝 MÔ TẢ & GHI CHÚ:</div>
                            <div id="hdtdDetailSubtitleText" style="font-size:14px; font-weight:600; color:#1e293b; line-height:1.65; white-space:pre-line;"></div>
                        </div>

                        <div id="hdtdDetailStepsBox" style="display:none; background:linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border:1.5px solid #d8b4fe; border-radius:18px; padding:18px 20px;">
                            <div style="font-size:14px; font-weight:900; color:#4c1d95; margin-bottom:12px;">📋 QUY TRÌNH THỰC THI TỪNG BƯỚC</div>
                            <div id="hdtdDetailStepsList" style="display:flex; flex-direction:column; gap:10px;"></div>
                        </div>

                        <div id="hdtdDetailGuideBox" style="display:none; background:linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border:1.5px solid #93c5fd; border-radius:18px; padding:18px 20px;">
                            <div style="font-size:14px; font-weight:900; color:#1e3a8a; margin-bottom:12px;">🗣️ HƯỚNG DẪN TRAO ĐỔI & CÂU HỎI MẪU</div>
                            <div id="hdtdDetailGuideList" style="display:flex; flex-direction:column; gap:12px;"></div>
                        </div>

                        <div id="hdtdDetailWarrantyBox" style="display:none; background:linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%); border:1.5px solid #f5d0fe; border-radius:18px; padding:18px 20px;">
                            <div style="font-size:14px; font-weight:900; color:#701a75; margin-bottom:12px;">⚖️ ĐIỀU KHOẢN QUY ĐỊNH & CAM KẾT</div>
                            <div id="hdtdDetailWarrantyList" style="display:flex; flex-direction:column; gap:8px;"></div>
                        </div>
                    </div>

                    <div class="qtns-modal-footer" style="flex-shrink:0; padding:16px 26px; background:#ffffff; border-top:1.5px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                        <button class="qtns-btn secondary" onclick="window._hdtdCloseDetailModal()" style="padding:10px 22px; border-radius:12px; font-weight:800;">Đóng Lại</button>
                        <div id="hdtdDetailFooterLinkBtn"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    }

    window._hdtdOpenDetailModal = function(id, subId = null) {
        let link = null;
        if (subId) {
            const links = _hdtdGetCustomSubtabLinks(subId);
            link = links.find(l => String(l.id) === String(id));
        }
        if (!link) {
            const allScopes = ['muc1_hopdong', 'muc2_tuyendung', 'muc3_bieumau'];
            for (const scope of allScopes) {
                const subtabs = _hdtdGetSubtabs(scope);
                for (const sub of subtabs) {
                    const links = _hdtdGetCustomSubtabLinks(sub.id);
                    const found = links.find(l => String(l.id) === String(id));
                    if (found) {
                        link = found;
                        break;
                    }
                }
                if (link) break;
            }
        }
        if (!link) return;

        const modal = _hdtdEnsureDetailModalInDOM();

        document.getElementById('hdtdDetailIcon').innerText = link.icon || '📄';
        document.getElementById('hdtdDetailTitle').innerText = _hdtdFormatTitle(link.title);

        const imgBox = document.getElementById('hdtdDetailImageBox');
        const imgEl = document.getElementById('hdtdDetailImg');
        if (link.imageUrl && imgBox && imgEl) {
            imgEl.src = link.imageUrl;
            imgBox.style.display = 'block';
        } else if (imgBox) {
            imgBox.style.display = 'none';
        }

        const subBox = document.getElementById('hdtdDetailSubtitleBox');
        const subText = document.getElementById('hdtdDetailSubtitleText');
        if (link.subtitle) {
            subText.innerText = link.subtitle;
            subBox.style.display = 'block';
        } else {
            subBox.style.display = 'none';
        }

        const stepsBox = document.getElementById('hdtdDetailStepsBox');
        const stepsList = document.getElementById('hdtdDetailStepsList');
        const stepsArr = Array.isArray(link.steps) ? link.steps : [];
        if (stepsArr.length > 0) {
            stepsList.innerHTML = stepsArr.map((s, idx) => `
                <div style="background:#ffffff; border:1px solid #e9d5ff; border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:700; color:#334155;">
                    <strong style="color:#6d28d9;">Bước ${idx + 1}:</strong> ${s}
                </div>
            `).join('');
            stepsBox.style.display = 'block';
        } else {
            stepsBox.style.display = 'none';
        }

        const guideBox = document.getElementById('hdtdDetailGuideBox');
        const guideList = document.getElementById('hdtdDetailGuideList');
        const guideArr = Array.isArray(link.saleGuide) ? link.saleGuide : [];
        if (guideArr.length > 0) {
            guideList.innerHTML = guideArr.map((g, idx) => {
                const q = typeof g === 'object' ? (g.question || '') : String(g);
                return `
                    <div style="background:#ffffff; border:1px solid #bfdbfe; border-radius:12px; padding:12px 14px;">
                        <div style="font-size:13.5px; font-weight:850; color:#1e40af; margin-bottom:4px;">📌 Câu hỏi / Yêu cầu ${idx + 1}:</div>
                        <div style="font-size:13px; font-weight:600; color:#334155; white-space:pre-line;">${q}</div>
                    </div>
                `;
            }).join('');
            guideBox.style.display = 'block';
        } else {
            guideBox.style.display = 'none';
        }

        const warrantyBox = document.getElementById('hdtdDetailWarrantyBox');
        const warrantyList = document.getElementById('hdtdDetailWarrantyList');
        const warrantyArr = Array.isArray(link.warranty) ? link.warranty : [];
        if (warrantyArr.length > 0) {
            warrantyList.innerHTML = warrantyArr.map((w, idx) => `
                <div style="background:#ffffff; border:1px solid #f5d0fe; border-radius:10px; padding:8px 12px; font-size:13px; font-weight:700; color:#701a75;">
                    ⚖️ <strong>Quy định ${idx + 1}:</strong> ${w}
                </div>
            `).join('');
            warrantyBox.style.display = 'block';
        } else {
            warrantyBox.style.display = 'none';
        }

        const footerBtn = document.getElementById('hdtdDetailFooterLinkBtn');
        if (_hdtdHasValidUrl(link.url)) {
            footerBtn.innerHTML = `
                <a href="${link.url}" target="_blank" rel="noopener" style="background:linear-gradient(135deg, #059669, #10b981); color:#ffffff; padding:10px 22px; border-radius:12px; font-weight:900; font-size:13.5px; text-decoration:none; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 14px rgba(16,185,129,0.35);">
                    🔗 Mở Tài Liệu Trực Tiếp ↗
                </a>
            `;
        } else {
            footerBtn.innerHTML = `
                <button onclick="_hdtdCopyText('${link.title}')" style="background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; padding:10px 22px; border-radius:12px; font-weight:900; font-size:13.5px; border:none; cursor:pointer; box-shadow:0 4px 14px rgba(109,40,217,0.35);">
                    📋 Sao Chép Tên Tài Liệu
                </button>
            `;
        }

        modal.style.display = 'flex';
    };

    window._hdtdCloseDetailModal = function() {
        const modal = document.getElementById('hdtdDetailModal');
        if (modal) modal.style.display = 'none';
    };

    // ==========================================
    // 3. SUBTAB MANAGEMENT MODAL (Matching Image 5)
    // ==========================================
    let editingSubtabId = null;

    window._hdtdOpenManageSubtabModal = function(scope = null) {
        if (!_hdtdCanManage()) {
            alert('Chỉ Giám Đốc và Quản Lý mới có quyền cài đặt mục!');
            return;
        }
        if (!scope) scope = currentMainTab;
        editingSubtabId = null;

        const modal = _hdtdEnsureSubtabModalInDOM();
        const titleInput = document.getElementById('hdtdSubtabFormTitle');
        if (titleInput) titleInput.value = '';

        let scopeTitle = 'MỤC 1: HƯỚNG DẪN & ĐÀO TẠO NHÂN SỰ MỚI';
        if (scope === 'muc2_tuyendung') scopeTitle = 'MỤC 2: JD & HÌNH ẢNH TUYỂN DỤNG';
        else if (scope === 'muc1_hopdong') scopeTitle = 'MỤC 3: HỢP ĐỒNG CÁC BỘ PHẬN';

        const titleEl = document.getElementById('hdtdSubtabModalTitle');
        if (titleEl) titleEl.innerText = `⚙️ CÀI ĐẶT MỤC (${scopeTitle})`;

        _hdtdRenderSubtabListInModal(scope);
        modal.style.display = 'flex';
    };

    window._hdtdCloseSubtabModal = function() {
        editingSubtabId = null;
        const modal = document.getElementById('hdtdSubtabModal');
        if (modal) modal.style.display = 'none';
    };

    function _hdtdRenderSubtabListInModal(scope = currentMainTab) {
        const container = document.getElementById('hdtdSubtabListContainer');
        if (!container) return;

        const subtabs = _hdtdGetSubtabs(scope);
        if (subtabs.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:16px; color:#94a3b8; font-weight:600;">Chưa có mục nào</div>`;
            return;
        }

        container.innerHTML = subtabs.map(st => {
            if (editingSubtabId === st.id) {
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#fffbeb; padding:10px 14px; border-radius:14px; border:2px solid #f59e0b; box-shadow:0 4px 12px rgba(245, 158, 11, 0.15); gap:10px;">
                        <div style="display:flex; align-items:center; gap:8px; flex:1;">
                            <span style="font-size:16px;">${st.icon || '📌'}</span>
                            <input type="text" id="hdtdEditSubtabInput_${st.id}" value="${st.title.replace(/"/g, '&quot;')}" style="flex:1; padding:8px 12px; border-radius:10px; border:1.5px solid #f59e0b; font-size:14px; font-weight:800; color:#0f172a; outline:none; background:#ffffff;" onkeypress="if(event.key==='Enter') window._hdtdSaveSubtabEditFromModal('${scope}', '${st.id}')">
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button onclick="window._hdtdSaveSubtabEditFromModal('${scope}', '${st.id}')" title="Lưu tên mới" style="background:#22c55e; color:#ffffff; border:none; border-radius:10px; padding:7px 14px; font-size:12.5px; font-weight:900; cursor:pointer; box-shadow:0 2px 6px rgba(34, 197, 94, 0.3);">💾 Lưu</button>
                            <button onclick="window._hdtdCancelSubtabEditFromModal('${scope}')" title="Hủy bỏ" style="background:#e2e8f0; color:#475569; border:none; border-radius:10px; padding:7px 12px; font-size:12.5px; font-weight:800; cursor:pointer;">✕ Hủy</button>
                        </div>
                    </div>
                `;
            }

            return `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; padding:12px 16px; border-radius:14px; border:1.5px solid #e2e8f0; box-shadow:0 2px 8px rgba(0,0,0,0.02); transition:all 0.2s ease;" onmouseover="this.style.borderColor='#c084fc'; this.style.boxShadow='0 4px 12px rgba(109,40,217,0.08)'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.02)'">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:32px; height:32px; background:#f3e8ff; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:15px; color:#6d28d9; border:1px solid #e9d5ff; flex-shrink:0;">${st.icon || '📌'}</div>
                        <span style="font-size:14.5px; font-weight:800; color:#0f172a;">${st.title}</span>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button onclick="window._hdtdStartSubtabEditFromModal('${scope}', '${st.id}')" title="Chỉnh sửa tên mục" style="background:#fef3c7; color:#d97706; border:1px solid #fde047; border-radius:10px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer; transition:all 0.15s ease;" onmouseover="this.style.background='#fde047'" onmouseout="this.style.background='#fef3c7'">✏️ Sửa Tên</button>
                        <button onclick="window._hdtdDeleteSubtabFromModal('${scope}', '${st.id}')" title="Xóa mục" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; border-radius:10px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer; transition:all 0.15s ease;" onmouseover="this.style.background='#fca5a5'" onmouseout="this.style.background='#fee2e2'">🗑️ Xóa</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window._hdtdAddSubtabFromModal = function() {
        const input = document.getElementById('hdtdSubtabFormTitle');
        if (!input) return;
        const title = input.value.trim();
        if (!title) {
            alert('Vui lòng nhập tên mục mới!');
            return;
        }

        let subtabs = _hdtdGetSubtabs(currentMainTab);
        const newId = 'sub_' + Date.now();

        subtabs.push({
            id: newId,
            title: title,
            icon: '📄',
            isCustom: true
        });

        _hdtdSaveSubtabs(currentMainTab, subtabs);
        input.value = '';
        _hdtdRenderSubtabListInModal(currentMainTab);
        _hdtdRenderCurrentMainTab();
        _hdtdShowToast(`✅ Đã thêm mục mới "${title}"!`);
    };

    window._hdtdStartSubtabEditFromModal = function(scope, subId) {
        editingSubtabId = subId;
        _hdtdRenderSubtabListInModal(scope);
        setTimeout(() => {
            const input = document.getElementById(`hdtdEditSubtabInput_${subId}`);
            if (input) { input.focus(); input.select(); }
        }, 50);
    };

    window._hdtdCancelSubtabEditFromModal = function(scope) {
        editingSubtabId = null;
        _hdtdRenderSubtabListInModal(scope);
    };

    window._hdtdSaveSubtabEditFromModal = function(scope, subId) {
        const input = document.getElementById(`hdtdEditSubtabInput_${subId}`);
        if (!input) return;
        const newTitle = input.value.trim();
        let subtabs = _hdtdGetSubtabs(scope);

        if (!newTitle) {
            alert('Vui lòng nhập tên mục hợp lệ!');
            return;
        }

        subtabs = subtabs.map(s => {
            if (s.id === subId) return { ...s, title: newTitle };
            return s;
        });

        _hdtdSaveSubtabs(scope, subtabs);
        editingSubtabId = null;
        _hdtdRenderSubtabListInModal(scope);
        _hdtdRenderCurrentMainTab();
        _hdtdShowToast('💾 Đã cập nhật tên mục!');
    };

    window._hdtdDeleteSubtabFromModal = function(scope, subId) {
        let subtabs = _hdtdGetSubtabs(scope);
        const target = subtabs.find(s => s.id === subId);
        if (!target) return;

        if (subtabs.length <= 1) {
            alert('⚠️ Hệ thống cần duy trì ít nhất 1 mục!');
            return;
        }

        if (!confirm(`Bạn có chắc muốn xóa mục "${target.title}" không? Tất cả đường link bên trong mục này cũng sẽ bị ẩn.`)) return;

        subtabs = subtabs.filter(s => s.id !== subId);
        _hdtdSaveSubtabs(scope, subtabs);

        _hdtdRenderSubtabListInModal(scope);
        _hdtdRenderCurrentMainTab();
        _hdtdShowToast(`🗑️ Đã xóa mục "${target.title}"!`);
    };

    function _hdtdEnsureSubtabModalInDOM() {
        let modal = document.getElementById('hdtdSubtabModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'qtns-modal-overlay';
            modal.id = 'hdtdSubtabModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:99999; align-items:center; justify-content:center; padding:20px;';
            modal.innerHTML = `
                <div class="qtns-modal-card" style="max-height:88vh; display:flex; flex-direction:column; width:100%; max-width:600px; border-radius:24px; overflow:hidden; background:#ffffff; box-shadow:0 25px 50px -12px rgba(109,40,217,0.35);">
                    <div style="flex-shrink:0; padding:18px 24px; background:linear-gradient(135deg, #4c1d95, #6d28d9); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                        <h3 id="hdtdSubtabModalTitle" style="margin:0; font-size:17.5px; font-weight:900;">⚙️ CÀI ĐẶT MỤC</h3>
                        <button onclick="window._hdtdCloseSubtabModal()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:30px; height:30px; border-radius:50%; cursor:pointer; font-size:16px; font-weight:bold;">✕</button>
                    </div>

                    <div style="flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:16px; background:#fcfafc;">
                        <!-- Form Add New Subtab -->
                        <div style="background:#ffffff; border:1.5px solid #e9d5ff; border-radius:18px; padding:16px; box-shadow:0 4px 14px rgba(109,40,217,0.05);">
                            <label style="font-size:13.5px; font-weight:900; color:#5b21b6; display:block; margin-bottom:8px;">➕ Tạo Mục Mới:</label>
                            <div style="display:flex; gap:10px;">
                                <input type="text" id="hdtdSubtabFormTitle" placeholder="Nhập tên mục mới..." style="flex:1; border:2px solid #e9d5ff; border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:700; color:#0f172a; outline:none;" onkeypress="if(event.key==='Enter') window._hdtdAddSubtabFromModal()">
                                <button onclick="window._hdtdAddSubtabFromModal()" style="background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; border:none; border-radius:12px; padding:10px 18px; font-size:13.5px; font-weight:900; cursor:pointer; box-shadow:0 4px 12px rgba(109,40,217,0.3); white-space:nowrap;">➕ Thêm Mới</button>
                            </div>
                        </div>

                        <!-- Current Subtabs List -->
                        <div>
                            <div style="font-size:13.5px; font-weight:900; color:#334155; margin-bottom:10px;">📌 Danh Sách Mục Hiện Tại:</div>
                            <div id="hdtdSubtabListContainer" style="display:flex; flex-direction:column; gap:10px;"></div>
                        </div>
                    </div>

                    <div style="flex-shrink:0; padding:14px 24px; background:#ffffff; border-top:1.5px solid #e2e8f0; display:flex; justify-content:flex-end;">
                        <button onclick="window._hdtdCloseSubtabModal()" style="padding:10px 22px; border-radius:12px; font-weight:900; background:#f1f5f9; color:#475569; border:none; cursor:pointer;">Đóng</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    }

    // ==========================================
    // 4. DEPARTMENT CATEGORY MANAGEMENT MODAL
    // ==========================================
    let editingCatIndex = -1;

    window._hdtdOpenManageCatModal = function(scope = null) {
        if (!_hdtdCanManage()) {
            alert('Chỉ Giám Đốc và Quản Lý mới có quyền cài đặt bộ phận!');
            return;
        }
        if (!scope) scope = currentMainTab;

        const modal = _hdtdEnsureCategoryModalInDOM();
        let scopeTitle = 'MỤC 1: HƯỚNG DẪN & ĐÀO TẠO NHÂN SỰ MỚI';
        if (scope === 'muc2_tuyendung') scopeTitle = 'MỤC 2: JD & HÌNH ẢNH TUYỂN DỤNG';
        else if (scope === 'muc1_hopdong') scopeTitle = 'MỤC 3: HỢP ĐỒNG CÁC BỘ PHẬN';

        const titleEl = document.getElementById('hdtdCatModalTitle');
        if (titleEl) titleEl.innerText = `⚙️ CÀI ĐẶT BỘ PHẬN (${scopeTitle})`;
        document.getElementById('hdtdCatFormScope').value = scope;
        document.getElementById('hdtdCatFormName').value = '';
        editingCatIndex = -1;

        _hdtdRenderCatListInModal(scope);
        modal.style.display = 'flex';
    };

    window._hdtdCloseCatModal = function() {
        editingCatIndex = -1;
        const modal = document.getElementById('hdtdCategoryModal');
        if (modal) modal.style.display = 'none';
    };

    function _hdtdRenderCatListInModal(scope) {
        const container = document.getElementById('hdtdCatListContainer');
        if (!container) return;

        const cats = _hdtdGetCategories(scope);
        if (cats.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:16px; color:#94a3b8; font-weight:600;">Chưa có bộ phận nào</div>`;
            return;
        }

        container.innerHTML = cats.map((cat, idx) => {
            if (editingCatIndex === idx) {
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#fffbeb; padding:10px 14px; border-radius:14px; border:2px solid #f59e0b; box-shadow:0 4px 12px rgba(245, 158, 11, 0.15); gap:10px;">
                        <div style="display:flex; align-items:center; gap:8px; flex:1;">
                            <span style="font-size:16px;">🏢</span>
                            <input type="text" id="hdtdEditCatInput_${idx}" value="${cat.replace(/"/g, '&quot;')}" style="flex:1; padding:8px 12px; border-radius:10px; border:1.5px solid #f59e0b; font-size:14px; font-weight:800; color:#0f172a; outline:none; background:#ffffff;" onkeypress="if(event.key==='Enter') window._hdtdSaveCategoryEditFromModal('${scope}', ${idx})">
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button onclick="window._hdtdSaveCategoryEditFromModal('${scope}', ${idx})" title="Lưu tên mới" style="background:#22c55e; color:#ffffff; border:none; border-radius:10px; padding:7px 14px; font-size:12.5px; font-weight:900; cursor:pointer; box-shadow:0 2px 6px rgba(34, 197, 94, 0.3);">💾 Lưu</button>
                            <button onclick="window._hdtdCancelCategoryEditFromModal('${scope}')" title="Hủy bỏ" style="background:#e2e8f0; color:#475569; border:none; border-radius:10px; padding:7px 12px; font-size:12.5px; font-weight:800; cursor:pointer;">✕ Hủy</button>
                        </div>
                    </div>
                `;
            }

            return `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; padding:12px 16px; border-radius:14px; border:1.5px solid #e2e8f0; box-shadow:0 2px 8px rgba(0,0,0,0.02); transition:all 0.2s ease;" onmouseover="this.style.borderColor='#c084fc'; this.style.boxShadow='0 4px 12px rgba(109,40,217,0.08)'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.02)'">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:32px; height:32px; background:#f3e8ff; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:15px; color:#6d28d9; border:1px solid #e9d5ff; flex-shrink:0;">🏢</div>
                        <span style="font-size:14.5px; font-weight:800; color:#0f172a;">${cat}</span>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button onclick="window._hdtdStartCategoryEditFromModal('${scope}', ${idx})" title="Chỉnh sửa tên bộ phận" style="background:#fef3c7; color:#d97706; border:1px solid #fde047; border-radius:10px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer; transition:all 0.15s ease;" onmouseover="this.style.background='#fde047'" onmouseout="this.style.background='#fef3c7'">✏️ Sửa Tên</button>
                        <button onclick="window._hdtdDeleteCategoryFromModal('${scope}', ${idx})" title="Xóa bộ phận" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; border-radius:10px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer; transition:all 0.15s ease;" onmouseover="this.style.background='#fca5a5'" onmouseout="this.style.background='#fee2e2'">🗑️ Xóa</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window._hdtdAddCategoryFromModal = function() {
        const input = document.getElementById('hdtdCatFormName');
        const scope = document.getElementById('hdtdCatFormScope')?.value || currentMainTab;
        if (!input) return;
        const name = input.value.trim();
        if (!name) {
            alert('Vui lòng nhập tên bộ phận mới!');
            return;
        }

        let cats = _hdtdGetCategories(scope);
        if (cats.includes(name)) {
            alert('Bộ phận này đã tồn tại!');
            return;
        }

        cats.push(name);
        _hdtdSaveCategories(scope, cats);
        input.value = '';
        _hdtdRenderCatListInModal(scope);
        _hdtdRenderCurrentMainTab();
        _hdtdShowToast(`✅ Đã thêm bộ phận mới "${name}"!`);
    };

    window._hdtdStartCategoryEditFromModal = function(scope, index) {
        editingCatIndex = index;
        _hdtdRenderCatListInModal(scope);
        setTimeout(() => {
            const input = document.getElementById(`hdtdEditCatInput_${index}`);
            if (input) { input.focus(); input.select(); }
        }, 50);
    };

    window._hdtdCancelCategoryEditFromModal = function(scope) {
        editingCatIndex = -1;
        _hdtdRenderCatListInModal(scope);
    };

    window._hdtdSaveCategoryEditFromModal = function(scope, index) {
        const input = document.getElementById(`hdtdEditCatInput_${index}`);
        if (!input) return;
        const newName = input.value.trim();
        let cats = _hdtdGetCategories(scope);
        const oldName = cats[index];

        if (!newName) {
            alert('Vui lòng nhập tên bộ phận hợp lệ!');
            return;
        }

        if (newName !== oldName && cats.includes(newName)) {
            alert('Tên bộ phận này đã tồn tại!');
            return;
        }

        cats[index] = newName;
        _hdtdSaveCategories(scope, cats);

        if (activeCatFilter[scope] === oldName) {
            activeCatFilter[scope] = newName;
        }

        editingCatIndex = -1;
        _hdtdRenderCatListInModal(scope);
        _hdtdRenderCurrentMainTab();
        _hdtdShowToast('💾 Đã cập nhật tên bộ phận!');
    };

    window._hdtdDeleteCategoryFromModal = function(scope, index) {
        let cats = _hdtdGetCategories(scope);
        const catName = cats[index];
        if (!catName) return;

        if (!confirm(`Bạn có chắc muốn xóa bộ phận "${catName}" không?`)) return;

        cats = cats.filter((_, i) => i !== index);
        _hdtdSaveCategories(scope, cats);

        if (activeCatFilter[scope] === catName) {
            activeCatFilter[scope] = 'all';
        }

        _hdtdRenderCatListInModal(scope);
        _hdtdRenderCurrentMainTab();
        _hdtdShowToast(`🗑️ Đã xóa bộ phận "${catName}"!`);
    };

    function _hdtdEnsureCategoryModalInDOM() {
        let modal = document.getElementById('hdtdCategoryModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'qtns-modal-overlay';
            modal.id = 'hdtdCategoryModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:99999; align-items:center; justify-content:center; padding:20px;';
            modal.innerHTML = `
                <div class="qtns-modal-card" style="max-height:88vh; display:flex; flex-direction:column; width:100%; max-width:600px; border-radius:24px; overflow:hidden; background:#ffffff; box-shadow:0 25px 50px -12px rgba(109,40,217,0.35);">
                    <div style="flex-shrink:0; padding:18px 24px; background:linear-gradient(135deg, #4c1d95, #6d28d9); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                        <h3 id="hdtdCatModalTitle" style="margin:0; font-size:17.5px; font-weight:900;">⚙️ CÀI ĐẶT BỘ PHẬN</h3>
                        <button onclick="window._hdtdCloseCatModal()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:30px; height:30px; border-radius:50%; cursor:pointer; font-size:16px; font-weight:bold;">✕</button>
                    </div>

                    <div style="flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:16px; background:#fcfafc;">
                        <input type="hidden" id="hdtdCatFormScope" value="">
                        
                        <!-- Form Add New Department Category -->
                        <div style="background:#ffffff; border:1.5px solid #e9d5ff; border-radius:18px; padding:16px; box-shadow:0 4px 14px rgba(109,40,217,0.05);">
                            <label style="font-size:13.5px; font-weight:900; color:#5b21b6; display:block; margin-bottom:8px;">➕ Tạo Bộ Phận Mới:</label>
                            <div style="display:flex; gap:10px;">
                                <input type="text" id="hdtdCatFormName" placeholder="Nhập tên bộ phận mới..." style="flex:1; border:2px solid #e9d5ff; border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:700; color:#0f172a; outline:none;" onkeypress="if(event.key==='Enter') window._hdtdAddCategoryFromModal()">
                                <button onclick="window._hdtdAddCategoryFromModal()" style="background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; border:none; border-radius:12px; padding:10px 18px; font-size:13.5px; font-weight:900; cursor:pointer; box-shadow:0 4px 12px rgba(109,40,217,0.3); white-space:nowrap;">➕ Thêm Mới</button>
                            </div>
                        </div>

                        <!-- Current Categories List -->
                        <div>
                            <div style="font-size:13.5px; font-weight:900; color:#334155; margin-bottom:10px;">🏢 Danh Sách Bộ Phận Hiện Tại:</div>
                            <div id="hdtdCatListContainer" style="display:flex; flex-direction:column; gap:10px;"></div>
                        </div>
                    </div>

                    <div style="flex-shrink:0; padding:14px 24px; background:#ffffff; border-top:1.5px solid #e2e8f0; display:flex; justify-content:flex-end;">
                        <button onclick="window._hdtdCloseCatModal()" style="padding:10px 22px; border-radius:12px; font-weight:900; background:#f1f5f9; color:#475569; border:none; cursor:pointer;">Đóng</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    }

    // Embed CSS styles matching Quản Trị Nhân Sự HV 100%
    function _hdtdGetStyles() {
        return `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Comfortaa:wght@500;600;700&display=swap');

                .qtns-wrapper, .qtns-wrapper button, .qtns-wrapper input, .qtns-wrapper select, .qtns-wrapper textarea, .qtns-wrapper div, .qtns-wrapper span,
                .qtns-modal-overlay, .qtns-modal-overlay button, .qtns-modal-overlay input, .qtns-modal-overlay select, .qtns-modal-overlay textarea, .qtns-modal-overlay div, .qtns-modal-overlay span {
                    font-family: 'Nunito', 'Comfortaa', system-ui, -apple-system, sans-serif !important;
                }
                .qtns-wrapper {
                    padding: 24px;
                    background: #f8fafc;
                    min-height: 100vh;
                }
                .qtns-header {
                    background: linear-gradient(135deg, #3b0764 0%, #5b21b6 50%, #6d28d9 100%);
                    border-radius: 24px;
                    padding: 28px 32px;
                    color: #ffffff;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: 0 14px 35px rgba(91, 33, 182, 0.25);
                    margin-bottom: 24px;
                }
                .qtns-header-left {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }
                .qtns-icon-bg {
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
                .qtns-title {
                    font-size: 22px;
                    font-weight: 900;
                    margin: 0 0 6px 0;
                    letter-spacing: 0.5px;
                    color: #ffffff !important;
                }
                .qtns-subtitle {
                    font-size: 13.5px;
                    margin: 0;
                    opacity: 0.9;
                    font-weight: 500;
                    color: #ffffff !important;
                }
                .qtns-badge-live {
                    background: #22c55e;
                    color: #ffffff;
                    font-weight: 850;
                    font-size: 12px;
                    padding: 6px 14px;
                    border-radius: 20px;
                    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
                }

                .qtns-tabs-main {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                    margin-bottom: 24px;
                }
                .qtns-tab-btn {
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
                .qtns-tab-btn:hover {
                    border-color: #c084fc;
                    transform: translateY(-2px);
                }
                .qtns-tab-btn.active {
                    background: linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%) !important;
                    border-color: #6d28d9 !important;
                    box-shadow: 0 8px 24px rgba(109, 40, 217, 0.45) !important;
                }
                .qtns-tab-btn .tab-num {
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
                .qtns-tab-btn.active .tab-num {
                    color: #ffffff !important;
                    background: rgba(255, 255, 255, 0.25) !important;
                }
                .qtns-tab-btn .tab-label {
                    font-size: 18.5px;
                    font-weight: 900;
                    color: #1e293b;
                    line-height: 1.35;
                    letter-spacing: -0.2px;
                }
                .qtns-tab-btn.active .tab-label {
                    color: #ffffff !important;
                }

                .dept-pill {
                    background: rgba(255, 255, 255, 0.9);
                    border: 1.5px solid #d8b4fe;
                    color: #6b21a8;
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 800;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .dept-pill:hover {
                    background: #f3e8ff;
                    transform: translateY(-1px);
                }
                .dept-pill.active {
                    background: linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%) !important;
                    color: #ffffff !important;
                    border-color: #6d28d9 !important;
                    box-shadow: 0 4px 12px rgba(109, 40, 217, 0.3) !important;
                }

                .qtns-link-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                    gap: 22px;
                    margin-bottom: 24px;
                }
                .qtns-card-item {
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
                .qtns-card-item:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 18px 40px rgba(109, 40, 217, 0.12);
                    border-color: #c084fc;
                }
                .qtns-card-item.is-pinned-card {
                    border: 2px solid #f59e0b !important;
                    box-shadow: 0 8px 24px rgba(245, 158, 11, 0.18) !important;
                    background: linear-gradient(180deg, #fffdf5 0%, #ffffff 100%) !important;
                }
                .card-accent-bar {
                    height: 5px;
                    width: 100%;
                }
                .card-accent-bar.theme-purple { background: linear-gradient(90deg, #6b21a8, #a855f7); }
                .card-accent-bar.theme-emerald { background: linear-gradient(90deg, #047857, #10b981); }
                .card-accent-bar.theme-blue { background: linear-gradient(90deg, #1d4ed8, #3b82f6); }
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
                .card-icon-box.theme-purple { background: #faf5ff; border: 1px solid #e9d5ff; color: #6b21a8; }
                .card-icon-box.theme-emerald { background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; }
                .card-icon-box.theme-blue { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
                .card-icon-box.theme-amber { background: #fffbeb; border: 1px solid #fef08a; color: #b45309; }
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
                .card-badge.theme-purple { background: #faf5ff; color: #7e22ce; border: 1px solid #e9d5ff; }
                .card-badge.theme-emerald { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
                .card-badge.theme-blue { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
                .card-badge.theme-amber { background: #fffbeb; color: #b45309; border: 1px solid #fef08a; }
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
                .card-action-btn.edit:hover { background: #fef3c7; border-color: #fde047; transform: scale(1.08); }
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
                }

                .qtns-toast {
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
                .qtns-toast.show {
                    opacity: 1;
                    transform: translateY(0);
                }

                @media (max-width: 768px) {
                    .qtns-tabs-main { grid-template-columns: 1fr; }
                    .qtns-header { flex-direction: column; align-items: flex-start; gap: 16px; }
                }
            </style>
        `;
    }

    // Lightbox & Image Processing Engine
    let currentLightboxScale = 1;

    window._hdtdOnImageSelected = async function(input) {
        if (!input || !input.files || !input.files[0]) return;
        const file = input.files[0];
        try {
            const compressedDataUrl = await _hdtdCompressImageToDataUrl(file, 1200, 0.82);
            if (compressedDataUrl) {
                document.getElementById('hdtdFormImageUrl').value = compressedDataUrl;
                const previewBox = document.getElementById('hdtdFormImagePreviewBox');
                const previewImg = document.getElementById('hdtdFormImagePreviewImg');
                const removeBtn = document.getElementById('hdtdFormImageRemoveBtn');
                if (previewImg) previewImg.src = compressedDataUrl;
                if (previewBox) previewBox.style.display = 'block';
                if (removeBtn) removeBtn.style.display = 'inline-flex';
                _hdtdShowToast('📷 Đã tải và nén hình ảnh mượt mà!');
            }
        } catch (e) {
            console.error('Lỗi nén ảnh:', e);
            alert('Có lỗi xảy ra khi nén hình ảnh, vui lòng thử lại!');
        }
    };

    window._hdtdRemoveSelectedImage = function() {
        const hiddenInput = document.getElementById('hdtdFormImageUrl');
        const fileInput = document.getElementById('hdtdFormImageFile');
        const previewBox = document.getElementById('hdtdFormImagePreviewBox');
        const removeBtn = document.getElementById('hdtdFormImageRemoveBtn');

        if (hiddenInput) hiddenInput.value = '';
        if (fileInput) fileInput.value = '';
        if (previewBox) previewBox.style.display = 'none';
        if (removeBtn) removeBtn.style.display = 'none';
    };

    function _hdtdCompressImageToDataUrl(file, maxDimension = 1200, quality = 0.82) {
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

    window._hdtdOpenLightbox = function(imageUrlOrId, subId) {
        let imgUrl = imageUrlOrId;
        let title = 'Hình Ảnh Minh Họa';
        if (subId) {
            const links = _hdtdGetCustomSubtabLinks(subId);
            const link = links.find(l => String(l.id) === String(imageUrlOrId));
            if (link && link.imageUrl) {
                imgUrl = link.imageUrl;
                title = link.title || title;
            }
        }

        if (!imgUrl) return;

        const modal = _hdtdEnsureLightboxInDOM();
        const imgEl = document.getElementById('hdtdLightboxImg');
        const dlBtn = document.getElementById('hdtdLightboxDownloadBtn');
        const titleEl = document.getElementById('hdtdLightboxTitle');

        imgEl.src = imgUrl;
        dlBtn.href = imgUrl;
        if (titleEl) titleEl.innerText = title;

        currentLightboxScale = 1;
        imgEl.style.transform = 'scale(1)';
        modal.style.display = 'flex';
    };

    window._hdtdCloseLightbox = function() {
        const modal = document.getElementById('hdtdLightboxModal');
        if (modal) modal.style.display = 'none';
    };

    window._hdtdZoomLightbox = function(factor) {
        currentLightboxScale *= factor;
        if (currentLightboxScale < 0.4) currentLightboxScale = 0.4;
        if (currentLightboxScale > 4) currentLightboxScale = 4;
        const imgEl = document.getElementById('hdtdLightboxImg');
        if (imgEl) imgEl.style.transform = `scale(${currentLightboxScale})`;
    };

    window._hdtdResetLightboxZoom = function() {
        currentLightboxScale = 1;
        const imgEl = document.getElementById('hdtdLightboxImg');
        if (imgEl) imgEl.style.transform = 'scale(1)';
    };

    function _hdtdEnsureLightboxInDOM() {
        let modal = document.getElementById('hdtdLightboxModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'qtns-modal-overlay';
            modal.id = 'hdtdLightboxModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.92); backdrop-filter:blur(10px); z-index:100000; align-items:center; justify-content:center; padding:20px;';
            modal.innerHTML = `
                <div style="position:relative; max-width:94vw; max-height:94vh; display:flex; flex-direction:column; align-items:center;">
                    <div style="width:100%; display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; background:rgba(255,255,255,0.1); padding:10px 18px; border-radius:14px; backdrop-filter:blur(8px);">
                        <span id="hdtdLightboxTitle" style="color:#ffffff; font-size:15px; font-weight:850; max-width:60%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">🖼️ Xem Ảnh Minh Họa</span>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <button onclick="window._hdtdZoomLightbox(1.25)" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; padding:6px 14px; border-radius:10px; font-weight:850; font-size:13px; cursor:pointer;" title="Phóng to">🔍 Zoom +</button>
                            <button onclick="window._hdtdZoomLightbox(0.8)" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; padding:6px 14px; border-radius:10px; font-weight:850; font-size:13px; cursor:pointer;" title="Thu nhỏ">🔍 Zoom -</button>
                            <button onclick="window._hdtdResetLightboxZoom()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; padding:6px 14px; border-radius:10px; font-weight:850; font-size:13px; cursor:pointer;" title="Đặt lại size">🔄 Reset</button>
                            <a id="hdtdLightboxDownloadBtn" href="" download="hinh-anh-tai-lieu.jpg" style="background:linear-gradient(135deg, #10b981, #059669); color:#ffffff; padding:6px 16px; border-radius:10px; font-weight:900; text-decoration:none; font-size:13px; box-shadow:0 4px 12px rgba(16,185,129,0.3);">⬇️ Tải Ảnh Về</a>
                            <button onclick="window._hdtdCloseLightbox()" style="background:#ef4444; color:#ffffff; border:none; width:34px; height:34px; border-radius:50%; font-weight:bold; cursor:pointer; font-size:16px;">✕</button>
                        </div>
                    </div>
                    <div style="overflow:auto; max-height:82vh; max-width:92vw; border-radius:18px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5); background:rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; padding:10px;" onclick="if(event.target===this) window._hdtdCloseLightbox()">
                        <img id="hdtdLightboxImg" src="" style="display:block; max-width:100%; max-height:78vh; object-fit:contain; border-radius:12px; transition:transform 0.2s ease;">
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    }

    window._hdtdOnStepsFocus = function (el) {
        if (!el || el.value.trim()) return;
        el.value = 'Bước 1: ';
    };

    window._hdtdAddStepLine = function () {
        const el = document.getElementById('hdtdFormSteps');
        if (!el) return;
        if (!el.value.trim()) {
            el.value = 'Bước 1: ';
        } else {
            const text = el.value;
            const matches = text.match(/^Bước\s*(\d+)/gm) || [];
            let maxStep = 0;
            matches.forEach(m => {
                const num = parseInt(m.replace(/\D/g, ''), 10);
                if (num > maxStep) maxStep = num;
            });
            const nextNum = maxStep > 0 ? maxStep + 1 : (text.split('\n').length + 1);
            el.value = text.trimEnd() + `\nBước ${nextNum}: `;
        }
        el.focus();
        el.selectionStart = el.selectionEnd = el.value.length;
    };

    window._hdtdOnStepsKeyDown = function (e, el) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const cursorStart = el.selectionStart !== undefined ? el.selectionStart : el.value.length;
            const text = el.value;

            const matches = text.match(/^Bước\s*(\d+)/gm) || [];
            let maxStep = 0;
            matches.forEach(m => {
                const num = parseInt(m.replace(/\D/g, ''), 10);
                if (num > maxStep) maxStep = num;
            });

            const nextNum = maxStep > 0 ? maxStep + 1 : (text.split('\n').length + 1);
            const insertText = `\nBước ${nextNum}: `;

            el.value = text.substring(0, cursorStart) + insertText + text.substring(cursorStart);
            el.selectionStart = el.selectionEnd = cursorStart + insertText.length;
        }
    };

})();
