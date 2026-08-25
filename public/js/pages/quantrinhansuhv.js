/**
 * Trang Quản Trị Nhân Sự & Hành Chính HV
 * Standardized Senior System Architecture
 */
(function() {
    'use strict';

    // Current State Management
    let currentMainTab = localStorage.getItem('qtns_main_tab') || 'muc1_tuyendung';
    let currentSubTab1 = localStorage.getItem('qtns_sub_tab1') || 'td_quytrinh';
    let currentSubTab2 = localStorage.getItem('qtns_sub_tab2') || 'dt_nhanvien';
    let currentSubTab3 = localStorage.getItem('qtns_sub_tab3') || 'cd_luongthuong';

    // Helper: Check Management Permissions
    function _qtnsCanManage() {
        if (!window.currentUser) return true;
        const role = window.currentUser.role;
        const uname = (window.currentUser.username || '').toLowerCase();
        return role === 'giam_doc' || role === 'quan_ly_cap_cao' || role === 'quan_ly' || uname === 'leviettrinh';
    }

    function _qtnsHasValidUrl(url) {
        if (!url) return false;
        const str = String(url).trim();
        return str !== '' && str !== '#' && str.toLowerCase() !== 'javascript:void(0)';
    }

    function _qtnsFormatTitle(title) {
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

    // Clean question text for 1-Click Copy
    window._qtnsCleanQuestionText = function(str) {
        if (!str) return '';
        let cleaned = String(str).trim();
        cleaned = cleaned.replace(/^(?:🗣️\s*)?(?:Câu\s*Hỏi\s*\d+\s*:\s*)?/i, '').trim();
        cleaned = cleaned.replace(/^["'“«]+|["'”»]+$/g, '').trim();
        return cleaned;
    };

    window._qtnsCopyQuestionText = function(text) {
        const cleanText = window._qtnsCleanQuestionText(text);
        if (!cleanText) return;

        navigator.clipboard.writeText(cleanText).then(() => {
            _qtnsShowToast('📋 Đã sao chép nội dung câu hỏi!');
        }).catch(() => {
            const textArea = document.createElement('textarea');
            textArea.value = cleanText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            _qtnsShowToast('📋 Đã sao chép nội dung câu hỏi!');
        });
    };

    // Central Server Sync
    async function _qtnsSyncLoadFromServer() {
        let loaded = false;
        try {
            const res = await fetch('/api/quantrinhansuhv/config');
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
                        _qtnsRenderCurrentMainTab();
                        loaded = true;
                    }
                }
            }
        } catch (e) {
            console.warn('Sync load qtns_store error:', e);
        }

        if (!loaded && _qtnsCanManage()) {
            _qtnsSyncSaveToServer();
        }
    }

    let _syncSaveTimer = null;
    function _qtnsSyncSaveToServer() {
        if (_syncSaveTimer) clearTimeout(_syncSaveTimer);
        _syncSaveTimer = setTimeout(async () => {
            try {
                const store = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith('qtns_')) {
                        store[k] = localStorage.getItem(k);
                    }
                }
                await fetch('/api/quantrinhansuhv/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ value: store })
                });
            } catch (e) {
                console.warn('Sync save qtns_store error:', e);
            }
        }, 500);
    }

    // Default Subtabs Configuration
    const DEFAULT_SUBTABS_MUC1 = [
        { id: 'td_quytrinh', title: 'Quy Trình Tuyển Dụng', icon: '📋', isCustom: false },
        { id: 'hc_thutuc', title: 'Thủ Tục Hành Chính & Hợp Đồng', icon: '📁', isCustom: false }
    ];

    const DEFAULT_SUBTABS_MUC2 = [
        { id: 'dt_nhanvien', title: 'Đào Tạo Nhân Viên Mới', icon: '🎓', isCustom: false },
        { id: 'dt_kynang', title: 'Đào Tạo Kỹ Năng & Văn Hóa', icon: '🚀', isCustom: false }
    ];

    const DEFAULT_SUBTABS_MUC3 = [
        { id: 'cd_luongthuong', title: 'Chế Độ Lương & Phụ Cấp', icon: '💰', isCustom: false },
        { id: 'cd_danhgia', title: 'Đánh Giá KPI & Khen Thưởng', icon: '📊', isCustom: false }
    ];

    function _qtnsGetSubtabs(scope) {
        try {
            const raw = localStorage.getItem('qtns_subtabs_' + scope);
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}

        if (scope === 'muc1_tuyendung') return DEFAULT_SUBTABS_MUC1;
        if (scope === 'muc2_daotao') return DEFAULT_SUBTABS_MUC2;
        return DEFAULT_SUBTABS_MUC3;
    }

    // Category Management
    const DEFAULT_CATEGORIES = ['Chung', 'Tuyển Dụng', 'Hành Chính', 'Đào Tạo', 'Lương Thưởng', 'Đánh Giá KPI'];

    function _qtnsGetCategories(scope) {
        try {
            const raw = localStorage.getItem('qtns_categories_' + scope);
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}
        return DEFAULT_CATEGORIES;
    }

    function _qtnsGetCustomSubtabLinks(subId) {
        if (!subId) return [];
        try {
            const raw = localStorage.getItem('qtns_links_' + subId);
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {}
        return [];
    }

    function _qtnsSaveCustomSubtabLinks(subId, links) {
        if (!subId) return;
        localStorage.setItem('qtns_links_' + subId, JSON.stringify(links));
        _qtnsSyncSaveToServer();
    }

    // Toast Alert Notification
    function _qtnsShowToast(msg) {
        let toast = document.getElementById('qtnsToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'qtnsToast';
            toast.className = 'qtns-toast';
            document.body.appendChild(toast);
        }
        toast.innerText = msg;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Main Entry Function
    window.renderQuantrinhansuhvPage = function(container) {
        if (!container) return;
        _qtnsSyncLoadFromServer();

        container.innerHTML = `
            <div class="qtns-wrapper">
                <!-- Top Executive Banner Header -->
                <div class="qtns-header">
                    <div class="qtns-header-left">
                        <div class="qtns-icon-bg">👔</div>
                        <div>
                            <h1 class="qtns-title">QUẢN TRỊ NHÂN SỰ & HÀNH CHÍNH HV</h1>
                            <p class="qtns-subtitle">Hệ Thống Quản Lý Quy Trình Nhân Sự, Đào Tạo Khóa Học, Đánh Giá KPI & Quy Địn Chế Độ Doanh Nghiệp</p>
                        </div>
                    </div>
                    <div class="qtns-header-right">
                        <span class="qtns-badge-live">● Hệ Thống Hoạt Động</span>
                    </div>
                </div>

                <!-- Level 1 Main Tabs Navigation -->
                <div class="qtns-tabs-main">
                    <button class="qtns-tab-btn ${currentMainTab === 'muc1_tuyendung' ? 'active' : ''}" data-maintab="muc1_tuyendung" onclick="window._qtnsSwitchMainTab('muc1_tuyendung')">
                        <span class="tab-num">MỤC 1</span>
                        <span class="tab-label">📋 Quy Trình Hành Chính & Tuyển Dụng</span>
                    </button>
                    <button class="qtns-tab-btn ${currentMainTab === 'muc2_daotao' ? 'active' : ''}" data-maintab="muc2_daotao" onclick="window._qtnsSwitchMainTab('muc2_daotao')">
                        <span class="tab-num">MỤC 2</span>
                        <span class="tab-label">💼 Đào Tạo & Phát Triển Nhân Sự</span>
                    </button>
                    <button class="qtns-tab-btn ${currentMainTab === 'muc3_chedo' ? 'active' : ''}" data-maintab="muc3_chedo" onclick="window._qtnsSwitchMainTab('muc3_chedo')">
                        <span class="tab-num">MỤC 3</span>
                        <span class="tab-label">⚖️ Chế Độ, Lương Thưởng & Đánh Giá</span>
                    </button>
                </div>

                <!-- Main Dynamic Content Container -->
                <div class="qtns-content-container" id="qtnsContentContainer">
                </div>
            </div>

            ${_qtnsGetStyles()}
        `;

        _qtnsRenderCurrentMainTab();
    };

    // Main Tab Switching
    window._qtnsSwitchMainTab = function(tabId) {
        currentMainTab = tabId;
        localStorage.setItem('qtns_main_tab', tabId);

        // Instant visual feedback for main tabs
        document.querySelectorAll('.qtns-tab-btn').forEach(btn => {
            if (btn.getAttribute('data-maintab') === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        _qtnsRenderCurrentMainTab();
    };

    function _qtnsRenderCurrentMainTab() {
        const container = document.getElementById('qtnsContentContainer');
        if (!container) return;

        let subtabs = [];
        let currentSub = currentSubTab1;
        if (currentMainTab === 'muc1_tuyendung') {
            subtabs = _qtnsGetSubtabs('muc1_tuyendung');
            currentSub = currentSubTab1;
        } else if (currentMainTab === 'muc2_daotao') {
            subtabs = _qtnsGetSubtabs('muc2_daotao');
            currentSub = currentSubTab2;
        } else {
            subtabs = _qtnsGetSubtabs('muc3_chedo');
            currentSub = currentSubTab3;
        }

        if (!subtabs.some(s => s.id === currentSub)) {
            currentSub = subtabs[0] ? subtabs[0].id : '';
        }

        const activeSubtab = subtabs.find(s => s.id === currentSub) || subtabs[0] || { id: '', title: '' };

        container.innerHTML = `
            <!-- Search Bar -->
            <div style="margin-bottom:20px; position:relative;">
                <div style="position:relative; display:flex; align-items:center;">
                    <span style="position:absolute; left:18px; font-size:18px; color:#7c3aed; pointer-events:none; z-index:2;">🔍</span>
                    <input type="text" id="qtnsSearchInput" value="${currentSearchQuery || ''}" 
                        placeholder="Nhập tên quy trình, cẩm nang nhân sự, từ khóa hoặc tiêu đề cần tìm kiếm..." 
                        style="width:100%; border:2px solid #e9d5ff; border-radius:18px; padding:13px 48px 13px 48px; font-size:14.5px; font-weight:700; background:#ffffff; outline:none; color:#0f172a; box-shadow:0 4px 16px rgba(124,58,237,0.08);"
                        oninput="window._qtnsOnSearchInput(this.value)">
                    ${currentSearchQuery ? `
                        <button onclick="window._qtnsClearSearch()" style="position:absolute; right:16px; background:#e2e8f0; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer; font-weight:bold; color:#475569;">✕</button>
                    ` : ''}
                </div>
            </div>

            <!-- Subtabs Control Bar -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:22px; flex-wrap:wrap; gap:14px; background:linear-gradient(135deg, rgba(250,245,255,0.95), rgba(243,232,255,0.98)); backdrop-filter:blur(16px); padding:14px 22px; border-radius:20px; border:1.5px solid #e9d5ff; box-shadow:0 12px 32px -8px rgba(109,40,217,0.15);">
                <div class="qtns-subtabs" style="margin:0; display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
                    ${subtabs.map(st => `
                        <button class="qtns-subtab-btn ${currentSub === st.id ? 'active' : ''}" onclick="window._qtnsSwitchSubTab('${st.id}')" 
                            style="display:inline-flex; align-items:center; gap:8px; font-size:14px; font-weight:850; padding:10px 22px; border-radius:30px; cursor:pointer; ${currentSub === st.id ? 'background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; border:none; box-shadow:0 6px 18px rgba(109,40,217,0.45);' : 'background:#ffffff; color:#0f172a; border:1.5px solid #cbd5e1;'}">
                            ${st.icon || '📌'} ${st.title}
                        </button>
                    `).join('')}
                </div>
                <div style="display:flex; align-items:center; gap:12px;">
                    <button class="qtns-btn primary" onclick="window._qtnsOpenAddLinkModal('${activeSubtab.id}')" style="border-radius:14px; padding:10px 22px; font-size:13.5px; font-weight:900; background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; border:none; box-shadow:0 6px 18px rgba(109,40,217,0.35); cursor:pointer;">
                        ➕ Tạo Đường Link Mới
                    </button>
                </div>
            </div>

            <!-- Content Grid Area -->
            <div id="qtnsTabContentBody" class="qtns-tab-body"></div>
        `;

        _qtnsRenderSubTabContent(activeSubtab.id);
    }

    let currentSearchQuery = '';
    window._qtnsOnSearchInput = function(val) {
        currentSearchQuery = val;
        let currentSub = currentSubTab1;
        if (currentMainTab === 'muc2_daotao') currentSub = currentSubTab2;
        else if (currentMainTab === 'muc3_chedo') currentSub = currentSubTab3;
        _qtnsRenderSubTabContent(currentSub);
    };

    window._qtnsClearSearch = function() {
        currentSearchQuery = '';
        _qtnsRenderCurrentMainTab();
    };

    window._qtnsSwitchSubTab = function(subId) {
        if (currentMainTab === 'muc1_tuyendung') {
            currentSubTab1 = subId;
            localStorage.setItem('qtns_sub_tab1', subId);
        } else if (currentMainTab === 'muc2_daotao') {
            currentSubTab2 = subId;
            localStorage.setItem('qtns_sub_tab2', subId);
        } else {
            currentSubTab3 = subId;
            localStorage.setItem('qtns_sub_tab3', subId);
        }
        _qtnsRenderCurrentMainTab();
    };

    function _qtnsRenderSubTabContent(subId) {
        const body = document.getElementById('qtnsTabContentBody');
        if (!body) return;

        let links = _qtnsGetCustomSubtabLinks(subId);

        // Filter search query
        if (currentSearchQuery && currentSearchQuery.trim()) {
            const q = currentSearchQuery.toLowerCase().trim();
            links = links.filter(l => {
                const title = (l.title || '').toLowerCase();
                const desc = (l.subtitle || '').toLowerCase();
                const cat = (l.category || '').toLowerCase();
                return title.includes(q) || desc.includes(q) || cat.includes(q);
            });
        }

        // Separate Pinned and Unpinned
        const pinnedLinks = links.filter(l => l.isPinned);
        const normalLinks = links.filter(l => !l.isPinned);
        const sortedLinks = [...pinnedLinks, ...normalLinks];

        if (sortedLinks.length === 0) {
            body.innerHTML = `
                <div style="text-align:center; padding:48px 20px; background:#ffffff; border-radius:20px; border:2px dashed #e9d5ff; margin-top:10px;">
                    <div style="font-size:48px; margin-bottom:12px;">📁</div>
                    <h3 style="font-size:18px; font-weight:850; color:#4c1d95; margin:0 0 6px 0;">Chưa Có Link Tài Liệu Nhân Sự Nào</h3>
                    <p style="font-size:14px; color:#64748b; margin:0 0 16px 0;">Hãy bấm "➕ Tạo Đường Link Mới" ở trên để bổ sung quy trình hoặc cẩm nang nhân sự!</p>
                </div>
            `;
            return;
        }

        body.innerHTML = `
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:20px;">
                ${sortedLinks.map(link => _qtnsRenderCardHTML(link, subId)).join('')}
            </div>
        `;
    }

    function _qtnsRenderCardHTML(link, subId) {
        const hasValidUrl = _qtnsHasValidUrl(link.url);
        const themeName = link.theme || 'purple';

        return `
            <div class="qtns-card-item theme-${themeName} ${link.isPinned ? 'is-pinned-card' : ''}" style="background:#ffffff; border:1.5px solid #e9d5ff; border-radius:20px; padding:20px; box-shadow:0 6px 20px rgba(109,40,217,0.06); display:flex; flex-direction:column; justify-content:space-between; position:relative;">
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:24px;">${link.icon || '👔'}</span>
                            <span style="background:#f3e8ff; color:#6b21a8; font-size:11.5px; font-weight:850; padding:3px 10px; border-radius:12px; border:1px solid #d8b4fe;">📌 ${link.category || 'Chung'}</span>
                        </div>
                        ${_qtnsCanManage() ? `
                            <div style="display:flex; gap:6px;">
                                <button onclick="window._qtnsOpenEditLinkModal('${link.id}', '${subId}')" style="background:#f3e8ff; color:#6b21a8; border:1px solid #d8b4fe; border-radius:8px; padding:4px 8px; font-size:12px; cursor:pointer;">✏️</button>
                                <button onclick="window._qtnsDeleteLink('${link.id}', '${subId}')" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; border-radius:8px; padding:4px 8px; font-size:12px; cursor:pointer;">🗑️</button>
                            </div>
                        ` : ''}
                    </div>
                    <h3 style="font-size:16.5px; font-weight:900; color:#1e1b4b; margin:0 0 8px 0; line-height:1.4;">${_qtnsFormatTitle(link.title)}</h3>
                    <p style="font-size:13.5px; color:#475569; margin:0 0 16px 0; line-height:1.55; white-space:pre-line;">${link.subtitle || ''}</p>
                </div>

                <!-- Side-by-Side 1-Row Compact Buttons -->
                <div style="display:flex; gap:8px; margin-top:14px; align-items:center;">
                    <button type="button" onclick="window._qtnsOpenDetailModal('${link.id}', '${subId}')" 
                        style="flex:1; min-width:0; border:none; background:linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%); color:#ffffff; font-weight:850; font-size:12.5px; padding:10px 10px; border-radius:12px; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:4px; box-shadow:0 4px 12px rgba(109,40,217,0.25); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="Xem Chi Tiết Quy Trình">
                        📋 <span>${hasValidUrl ? 'Xem Chi Tiết ➔' : 'Xem Chi Tiết Quy Trình ➔'}</span>
                    </button>
                    ${hasValidUrl ? `
                        <a href="${link.url}" target="_blank" rel="noopener" style="flex:1; min-width:0; padding:10px 10px; font-size:12.5px; font-weight:850; border-radius:12px; background:#f3e8ff; color:#6b21a8; border:1.5px solid #c084fc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-decoration:none; display:flex; justify-content:center; align-items:center; gap:4px;" title="Mở Bản Gốc Tài Liệu">
                            🔗 <span>Mở Bản Gốc ↗</span>
                        </a>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Ensure Link Modal is attached to body cleanly
    function _qtnsEnsureLinkModalInDOM() {
        let modal = document.getElementById('qtnsLinkModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'qtns-modal-overlay';
            modal.id = 'qtnsLinkModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:99999; align-items:center; justify-content:center; padding:20px;';
            modal.innerHTML = `
                <div class="qtns-modal-card" style="max-height:88vh; display:flex; flex-direction:column; width:100%; max-width:640px; border-radius:24px; overflow:hidden; background:#ffffff; box-shadow:0 25px 50px -12px rgba(91,33,182,0.35);">
                    <div class="qtns-modal-header" style="flex-shrink:0; padding:18px 24px; background:linear-gradient(135deg, #4c1d95, #6d28d9); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                        <h3 id="qtnsModalTitle" style="margin:0; font-size:17.5px; font-weight:900;">➕ TẠO ĐƯỜNG LINK TÀI LIỆU NHÂN SỰ MỚI</h3>
                        <button class="qtns-modal-close" onclick="window._qtnsCloseLinkModal()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:30px; height:30px; border-radius:50%; cursor:pointer; font-size:16px; font-weight:bold;">✕</button>
                    </div>

                    <div class="qtns-modal-body" style="flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:14px; background:#fcfafc;">
                        <input type="hidden" id="qtnsFormLinkId" value="">

                        <!-- Modal Tabs Navigation -->
                        <div id="qtnsModalTabNav" style="display:flex; gap:10px; border-bottom:2px solid #e9d5ff; padding-bottom:12px; margin-bottom:6px;">
                            <button type="button" id="qtnsTabBtnBasic" onclick="window._qtnsSwitchModalTab('basic')" style="flex:1; padding:10px 14px; border-radius:12px; border:none; background:#7c3aed; color:#ffffff; font-weight:800; font-size:14px; cursor:pointer; transition:all 0.2s ease;">
                                📁 TAB 1: Thông Tin & Link (*)
                            </button>
                            <button type="button" id="qtnsTabBtnScript" onclick="window._qtnsSwitchModalTab('script')" style="flex:1; padding:10px 14px; border-radius:12px; border:1.5px solid #cbd5e1; background:#f8fafc; color:#0f172a; font-weight:800; font-size:14px; cursor:pointer; transition:all 0.2s ease;">
                                📋 TAB 2: Quy Trình & Hướng Dẫn*
                            </button>
                        </div>

                        <!-- PANEL 1: BASIC INFO & LINK -->
                        <div id="qtnsModalPanelBasic" style="display:block;">
                            <div class="qtns-form-group" style="margin-bottom:14px;">
                                <label style="color:#5b21b6; font-weight:900; display:block; margin-bottom:6px;">📁 Danh Mục Quản Trị (* BẮT BUỘC):</label>
                                <select id="qtnsFormSubtab" required style="width:100%; border: 2px solid #7c3aed; background: #f3e8ff; font-weight: 800; color: #4c1d95; padding:10px 14px; border-radius:12px;" onchange="window._qtnsOnFormSubtabChange()">
                                </select>
                            </div>
                            <div class="qtns-form-group" style="margin-bottom:14px;">
                                <label style="color:#6b21a8; font-weight:900; display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                    <span>📌 Lĩnh Vực Tài Liệu (* BẮT BUỘC - Chọn nhiều):</span>
                                </label>
                                <div id="qtnsFormCategoryCheckboxes" style="display:flex; flex-wrap:wrap; gap:10px; padding:12px; border:2px solid #a855f7; background:#faf5ff; border-radius:16px; max-height:150px; overflow-y:auto;">
                                </div>
                            </div>
                            <div class="qtns-form-group" style="margin-bottom:14px;">
                                <label style="color:#0f172a; font-weight:850; display:block; margin-bottom:6px;">Tiêu đề đường link tài liệu (*):</label>
                                <input type="text" id="qtnsFormTitle" placeholder="Ví dụ: Quy trình tuyển dụng nhân sự thử việc..." required style="width:100%; border:2px solid #e9d5ff; border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:700; color:#0f172a;">
                            </div>
                            <div class="qtns-form-group" style="margin-bottom:14px;">
                                <label style="color:#334155; font-weight:850; display:block; margin-bottom:6px;">📝 Mô tả / Ghi chú (tự động xuống dòng):</label>
                                <textarea id="qtnsFormSubtitle" rows="3" placeholder="Mô tả tóm tắt nội dung quy trình hoặc cẩm nang hướng dẫn..." style="width:100%; border:2px solid #e9d5ff; border-radius:14px; padding:10px 14px; font-size:13.5px; font-weight:600; line-height:1.55; outline:none; resize:vertical; min-height:75px; color:#0f172a; font-family:inherit;"></textarea>
                            </div>
                            <div class="qtns-form-group" style="margin-bottom:14px;">
                                <label id="qtnsUrlLabel" style="color:#0f172a; font-weight:850; display:block; margin-bottom:6px;">Đường link URL tài liệu (Google Sheets / Word / Link ngoài):</label>
                                <input type="url" id="qtnsFormUrl" placeholder="https://docs.google.com/..." style="width:100%; border:2px solid #e9d5ff; border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:700; color:#0f172a;">
                            </div>
                            <div class="qtns-form-row" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                                <div class="qtns-form-group">
                                    <label style="color:#334155; font-weight:850; display:block; margin-bottom:6px;">Icon Biểu Tượng:</label>
                                    <select id="qtnsFormIcon" style="width:100%; border:1.5px solid #cbd5e1; border-radius:12px; padding:9px 12px; font-size:13px; font-weight:700;">
                                        <option value="👔">👔 Quản Trị Nhân Sự</option>
                                        <option value="📋">📋 Quy Trình Hành Chính</option>
                                        <option value="🎓">🎓 Khóa Đào Tạo</option>
                                        <option value="⚖️">⚖️ Chế Độ Quy Định</option>
                                        <option value="💰">💰 Lương & Phụ Cấp</option>
                                        <option value="📊">📊 Đánh Giá KPI</option>
                                        <option value="🚀">🚀 Kỹ Năng Mềm</option>
                                        <option value="📁">📁 Hồ Sơ File</option>
                                    </select>
                                </div>
                                <div class="qtns-form-group">
                                    <label style="color:#334155; font-weight:850; display:block; margin-bottom:6px;">Tông Màu Hiển Thị:</label>
                                    <select id="qtnsFormTheme" style="width:100%; border:1.5px solid #cbd5e1; border-radius:12px; padding:9px 12px; font-size:13px; font-weight:700;">
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
                        <div id="qtnsModalPanelScript" style="display:none;">
                            <div style="border:2px dashed #c084fc; background:#faf5ff; padding:16px; border-radius:18px;">
                                <!-- 1. STEPS -->
                                <div class="qtns-form-group" style="margin-bottom:14px;">
                                    <label style="color:#5b21b6; font-weight:900; display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                        <span>📋 QUY TRÌNH THỰC THI TỪNG BƯỚC:</span>
                                        <span style="font-size:12px; color:#6b21a8; font-weight:700;">(Xuống dòng tự động tạo Bước)</span>
                                    </label>
                                    <textarea id="qtnsFormSteps" rows="8" placeholder="Bước 1: Tiếp nhận nhu cầu tuyển dụng&#10;Bước 2: Sàng lọc hồ sơ ứng viên..." style="width:100%; border:2px solid #d8b4fe; border-radius:16px; padding:14px 18px; font-size:13.5px; font-weight:700; line-height:1.6; outline:none; resize:vertical; min-height:220px; color:#4c1d95; font-family:inherit; background:#ffffff;"></textarea>
                                </div>

                                <!-- 2. GUIDE -->
                                <div class="qtns-form-group" style="margin-bottom:14px;">
                                    <label style="color:#4c1d95; font-weight:900; display:block; margin-bottom:6px;">
                                        🗣️ HƯỚNG DẪN TRAO ĐỔI & CÂU HỎI MẪU:
                                    </label>
                                    <div id="qtnsSaleGuideContainer" style="display:flex; flex-direction:column; gap:10px;">
                                    </div>
                                    <button type="button" onclick="window._qtnsAddSaleGuideRow()" style="margin-top:8px; background:#f3e8ff; color:#6b21a8; border:1.5px solid #d8b4fe; border-radius:10px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer;">
                                        ➕ Thêm Câu Hỏi & Mục Tiêu
                                    </button>
                                </div>

                                <!-- 3. WARRANTY / POLICY -->
                                <div class="qtns-form-group" style="margin-bottom:6px;">
                                    <label style="color:#6b21a8; font-weight:900; display:block; margin-bottom:6px;">
                                        ⚖️ ĐIỀU KHOẢN QUY ĐỊNH & CAM KẾT:
                                    </label>
                                    <div id="qtnsWarrantyContainer" style="display:flex; flex-direction:column; gap:8px;">
                                    </div>
                                    <button type="button" onclick="window._qtnsAddWarrantyRow()" style="margin-top:8px; background:#faf5ff; color:#7e22ce; border:1.5px solid #e9d5ff; border-radius:10px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer;">
                                        ➕ Thêm Điều Khoản Quy Định
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="qtns-modal-footer" style="flex-shrink:0; padding:14px 24px; background:#ffffff; border-top:1.5px solid #e2e8f0; display:flex; justify-content:flex-end; gap:12px;">
                        <button class="qtns-btn secondary" onclick="window._qtnsCloseLinkModal()" style="padding:10px 20px; border-radius:12px; font-weight:800;">Hủy Bỏ</button>
                        <button class="qtns-btn primary" onclick="window._qtnsSaveLinkFromModal()" style="padding:10px 24px; border-radius:12px; font-weight:900; background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; cursor:pointer;">💾 Lưu Đường Link</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    }

    // Modal Details Window
    function _qtnsEnsureDetailModalInDOM() {
        let modal = document.getElementById('qtnsDetailModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'qtns-modal-overlay';
            modal.id = 'qtnsDetailModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:99999; align-items:center; justify-content:center; padding:20px;';
            modal.innerHTML = `
                <div class="qtns-modal-card" style="max-height:90vh; display:flex; flex-direction:column; width:100%; max-width:720px; border-radius:24px; overflow:hidden; background:#ffffff; box-shadow:0 25px 50px -12px rgba(0,0,0,0.35); border:1.5px solid #d8b4fe;">
                    <div id="qtnsDetailModalHeader" style="flex-shrink:0; padding:20px 26px; background:linear-gradient(135deg, #4c1d95, #6d28d9); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <span id="qtnsDetailIcon" style="font-size:26px; background:rgba(255,255,255,0.2); padding:8px 12px; border-radius:14px;">📖</span>
                            <div>
                                <h3 id="qtnsDetailTitle" style="margin:0; font-size:18px; font-weight:900; color:#ffffff; line-height:1.3;">Chi Tiết Tài Liệu Quản Trị Nhân Sự</h3>
                            </div>
                        </div>
                        <button class="qtns-modal-close" onclick="window._qtnsCloseDetailModal()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:34px; height:34px; border-radius:50%; cursor:pointer; font-size:18px; font-weight:bold;">✕</button>
                    </div>

                    <div class="qtns-modal-body" style="flex:1; overflow-y:auto; padding:22px 26px; display:flex; flex-direction:column; gap:18px; background:#fcfafc;">
                        <div id="qtnsDetailSubtitleBox" style="display:none; background:#ffffff; border:1.5px solid #e9d5ff; border-radius:16px; padding:16px 20px;">
                            <div style="font-size:13px; font-weight:850; color:#6b21a8; margin-bottom:6px;">📝 MÔ TẢ & GHI CHÚ:</div>
                            <div id="qtnsDetailSubtitleText" style="font-size:14px; font-weight:600; color:#1e293b; line-height:1.65; white-space:pre-line;"></div>
                        </div>

                        <div id="qtnsDetailStepsBox" style="display:none; background:linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border:1.5px solid #d8b4fe; border-radius:18px; padding:18px 20px;">
                            <div style="font-size:14px; font-weight:900; color:#4c1d95; margin-bottom:12px;">📋 QUY TRÌNH THỰC THI TỪNG BƯỚC</div>
                            <div id="qtnsDetailStepsList" style="display:flex; flex-direction:column; gap:10px;"></div>
                        </div>

                        <div id="qtnsDetailGuideBox" style="display:none; background:linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border:1.5px solid #93c5fd; border-radius:18px; padding:18px 20px;">
                            <div style="font-size:14px; font-weight:900; color:#1e3a8a; margin-bottom:12px;">🗣️ HƯỚNG DẪN TRAO ĐỔI & CÂU HỎI MẪU</div>
                            <div id="qtnsDetailGuideList" style="display:flex; flex-direction:column; gap:12px;"></div>
                        </div>

                        <div id="qtnsDetailWarrantyBox" style="display:none; background:linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%); border:1.5px solid #f5d0fe; border-radius:18px; padding:18px 20px;">
                            <div style="font-size:14px; font-weight:900; color:#701a75; margin-bottom:12px;">⚖️ ĐIỀU KHOẢN QUY ĐỊNH & CAM KẾT</div>
                            <div id="qtnsDetailWarrantyList" style="display:flex; flex-direction:column; gap:8px;"></div>
                        </div>
                    </div>

                    <div class="qtns-modal-footer" style="flex-shrink:0; padding:16px 26px; background:#ffffff; border-top:1.5px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                        <button class="qtns-btn secondary" onclick="window._qtnsCloseDetailModal()" style="padding:10px 22px; border-radius:12px; font-weight:800;">Đóng Window</button>
                        <div id="qtnsDetailFooterAction"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    }

    window._qtnsOpenDetailModal = function(id, targetSub = null) {
        let links = _qtnsGetCustomSubtabLinks(targetSub);
        let item = links.find(l => String(l.id) === String(id));
        if (!item) return;

        const modal = _qtnsEnsureDetailModalInDOM();

        document.getElementById('qtnsDetailIcon').innerText = item.icon || '👔';
        document.getElementById('qtnsDetailTitle').innerText = _qtnsFormatTitle(item.title || 'Chi Tiết Tài Liệu');

        const subtitleBox = document.getElementById('qtnsDetailSubtitleBox');
        const subtitleText = document.getElementById('qtnsDetailSubtitleText');
        if (item.subtitle && item.subtitle.trim()) {
            subtitleText.innerText = item.subtitle;
            subtitleBox.style.display = 'block';
        } else {
            subtitleBox.style.display = 'none';
        }

        // Steps
        const stepsBox = document.getElementById('qtnsDetailStepsBox');
        const stepsList = document.getElementById('qtnsDetailStepsList');
        const steps = Array.isArray(item.steps) ? item.steps : (typeof item.steps === 'string' ? item.steps.split('\n').filter(Boolean) : []);
        if (steps.length > 0) {
            stepsList.innerHTML = steps.map((s, idx) => `
                <div style="background:#ffffff; border:1.5px solid #d8b4fe; border-radius:12px; padding:12px 16px; display:flex; align-items:flex-start; gap:12px;">
                    <div style="background:#6d28d9; color:#ffffff; font-size:12px; font-weight:900; padding:4px 10px; border-radius:20px;">Bước ${idx + 1}</div>
                    <div style="font-size:14px; font-weight:700; color:#4c1d95; line-height:1.55; flex:1;">${s.replace(/^Bước\s+\d+\s*:\s*/i, '')}</div>
                </div>
            `).join('');
            stepsBox.style.display = 'block';
        } else {
            stepsBox.style.display = 'none';
        }

        // Guides
        const guideBox = document.getElementById('qtnsDetailGuideBox');
        const guideList = document.getElementById('qtnsDetailGuideList');
        const guides = Array.isArray(item.saleGuide) ? item.saleGuide : [];
        if (guides.length > 0) {
            guideList.innerHTML = guides.map((g, idx) => {
                const questionTxt = typeof g === 'object' ? (g.question || '') : String(g);
                const cleanQ = _qtnsCleanQuestionText(questionTxt);
                return `
                    <div style="background:#ffffff; border:1.5px solid #bfdbfe; border-radius:14px; padding:14px 16px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
                        <div style="font-size:13.5px; font-weight:750; color:#1e3a8a; flex:1;">
                            🗣️ <strong>Câu Hỏi Mẫu ${idx + 1}:</strong> "${cleanQ}"
                        </div>
                        <button type="button" onclick="event.stopPropagation(); window._qtnsCopyQuestionText(\`${cleanQ.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`)" style="background:#2563eb; color:#ffffff; border:none; padding:6px 14px; border-radius:8px; font-size:12px; font-weight:850; cursor:pointer;" title="Sao chép nội dung câu hỏi">
                            📋 Copy
                        </button>
                    </div>
                `;
            }).join('');
            guideBox.style.display = 'block';
        } else {
            guideBox.style.display = 'none';
        }

        // Warranty / Policy
        const warrantyBox = document.getElementById('qtnsDetailWarrantyBox');
        const warrantyList = document.getElementById('qtnsDetailWarrantyList');
        const warranty = Array.isArray(item.warranty) ? item.warranty : [];
        if (warranty.length > 0) {
            warrantyList.innerHTML = warranty.map((w, idx) => `
                <div style="background:#ffffff; border:1.5px solid #f5d0fe; border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:750; color:#701a75;">
                    ⚖️ <strong>Quy Định ${idx + 1}:</strong> ${typeof w === 'object' ? (w.text || '') : String(w)}
                </div>
            `).join('');
            warrantyBox.style.display = 'block';
        } else {
            warrantyBox.style.display = 'none';
        }

        // Footer Action
        const footerAction = document.getElementById('qtnsDetailFooterAction');
        if (_qtnsHasValidUrl(item.url)) {
            footerAction.innerHTML = `
                <a href="${item.url}" target="_blank" rel="noopener" class="qtns-btn primary" style="background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; font-weight:900; padding:10px 20px; border-radius:12px; text-decoration:none;">
                    🔗 <span>Mở Bản Gốc Tài Liệu</span>
                </a>
            `;
        } else {
            footerAction.innerHTML = '';
        }

        modal.style.display = 'flex';
    };

    window._qtnsCloseDetailModal = function() {
        const modal = document.getElementById('qtnsDetailModal');
        if (modal) modal.style.display = 'none';
    };

    // Form Modal Openers
    window._qtnsOpenAddLinkModal = function(targetSub) {
        const modal = _qtnsEnsureLinkModalInDOM();
        document.getElementById('qtnsModalTitle').innerText = '➕ TẠO ĐƯỜNG LINK TÀI LIỆU NHÂN SỰ MỚI';
        document.getElementById('qtnsFormLinkId').value = '';
        document.getElementById('qtnsFormTitle').value = '';
        document.getElementById('qtnsFormSubtitle').value = '';
        document.getElementById('qtnsFormUrl').value = '';

        window._qtnsSwitchModalTab('basic');
        window._qtnsPopulateSubtabOptions(targetSub);
        modal.style.display = 'flex';
    };

    window._qtnsOpenEditLinkModal = function(id, targetSub) {
        let links = _qtnsGetCustomSubtabLinks(targetSub);
        let item = links.find(l => String(l.id) === String(id));
        if (!item) return;

        const modal = _qtnsEnsureLinkModalInDOM();

        document.getElementById('qtnsModalTitle').innerText = '✏️ CHỈNH SỬA ĐƯỜNG LINK TÀI LIỆU NHÂN SỰ';
        document.getElementById('qtnsFormLinkId').value = item.id;
        document.getElementById('qtnsFormTitle').value = item.title || '';
        document.getElementById('qtnsFormSubtitle').value = item.subtitle || '';
        document.getElementById('qtnsFormUrl').value = item.url || '';
        document.getElementById('qtnsFormIcon').value = item.icon || '👔';
        document.getElementById('qtnsFormTheme').value = item.theme || 'purple';

        window._qtnsSwitchModalTab('basic');
        window._qtnsPopulateSubtabOptions(targetSub);
        modal.style.display = 'flex';
    };

    window._qtnsCloseLinkModal = function() {
        const modal = document.getElementById('qtnsLinkModal');
        if (modal) modal.style.display = 'none';
    };

    window._qtnsPopulateSubtabOptions = function(selectedSub) {
        const subSelect = document.getElementById('qtnsFormSubtab');
        const box = document.getElementById('qtnsFormCategoryCheckboxes');
        if (!subSelect || !box) return;

        let scope = 'muc1_tuyendung';
        if (currentMainTab === 'muc2_daotao') scope = 'muc2_daotao';
        else if (currentMainTab === 'muc3_chedo') scope = 'muc3_chedo';

        const subtabs = _qtnsGetSubtabs(scope);
        const activeSub = selectedSub || (subtabs[0] ? subtabs[0].id : '');
        subSelect.innerHTML = subtabs.map(s => `<option value="${s.id}" ${s.id === activeSub ? 'selected' : ''}>📁 ${s.title}</option>`).join('');

        const cats = _qtnsGetCategories(scope);
        box.innerHTML = cats.map(c => `
            <label style="display:inline-flex; align-items:center; gap:7px; background:#ffffff; border:1.5px solid #d8b4fe; padding:7px 14px; border-radius:12px; font-size:13.5px; font-weight:800; color:#5b21b6; cursor:pointer;">
                <input type="checkbox" name="qtnsCategoryCheck" value="${c}" checked style="width:16px; height:16px; accent-color:#7c3aed;">
                <span>📌 ${c}</span>
            </label>
        `).join('');
    };

    window._qtnsOnFormSubtabChange = function() {
        window._qtnsPopulateSubtabOptions(document.getElementById('qtnsFormSubtab')?.value);
    };

    window._qtnsSwitchModalTab = function(tabName) {
        const tabBasic = document.getElementById('qtnsTabBtnBasic');
        const tabScript = document.getElementById('qtnsTabBtnScript');
        const panelBasic = document.getElementById('qtnsModalPanelBasic');
        const panelScript = document.getElementById('qtnsModalPanelScript');

        if (!panelBasic || !panelScript) return;

        if (tabName === 'basic') {
            panelBasic.style.display = 'block';
            panelScript.style.display = 'none';
            if (tabBasic) { tabBasic.style.background = '#7c3aed'; tabBasic.style.color = '#ffffff'; }
            if (tabScript) { tabScript.style.background = '#f8fafc'; tabScript.style.color = '#0f172a'; }
        } else {
            panelBasic.style.display = 'none';
            panelScript.style.display = 'block';
            if (tabBasic) { tabBasic.style.background = '#f8fafc'; tabBasic.style.color = '#0f172a'; }
            if (tabScript) { tabScript.style.background = '#6d28d9'; tabScript.style.color = '#ffffff'; }
        }
    };

    window._qtnsAddSaleGuideRow = function(goal = '', question = '') {
        const container = document.getElementById('qtnsSaleGuideContainer');
        if (!container) return;
        const index = container.children.length + 1;
        const div = document.createElement('div');
        div.className = 'qtns-sale-guide-item';
        div.style.cssText = 'background:#ffffff; border:1.5px solid #c084fc; border-radius:12px; padding:10px 12px; position:relative;';

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="font-size:12px; font-weight:850; color:#6d28d9;">📌 Câu hỏi mẫu ${index}</span>
                <button type="button" onclick="this.parentElement.parentElement.remove()" style="background:#fee2e2; color:#dc2626; border:none; border-radius:6px; padding:2px 8px; font-size:11px; font-weight:800; cursor:pointer;">❌ Xóa</button>
            </div>
            <textarea class="qtns-guide-question" rows="2" placeholder="Câu hỏi mẫu ${index}..." style="width:100%; border:1px solid #d8b4fe; border-radius:8px; padding:8px 10px; font-size:13px; font-weight:700; color:#4c1d95; background:#faf5ff; resize:vertical; min-height:50px; font-family:inherit; line-height:1.5; box-sizing:border-box;" oninput="this.style.height='auto'; this.style.height=(this.scrollHeight)+'px';">${question}</textarea>
        `;
        container.appendChild(div);
    };

    window._qtnsAddWarrantyRow = function(text = '') {
        const container = document.getElementById('qtnsWarrantyContainer');
        if (!container) return;
        const index = container.children.length + 1;
        const div = document.createElement('div');
        div.className = 'qtns-warranty-item';
        div.style.cssText = 'display:flex; align-items:flex-start; gap:8px; background:#ffffff; border:1.5px solid #e9d5ff; border-radius:10px; padding:8px 10px;';

        div.innerHTML = `
            <span style="font-size:12px; font-weight:850; color:#7e22ce; white-space:nowrap; margin-top:6px;">Quy Định ${index}:</span>
            <textarea class="qtns-warranty-text" rows="2" placeholder="Nội dung quy định ${index}" style="flex:1; border:1px solid #d8b4fe; border-radius:8px; padding:6px 10px; font-size:13px; font-weight:700; color:#581c87; resize:vertical; min-height:45px; font-family:inherit; line-height:1.45; box-sizing:border-box;" oninput="this.style.height='auto'; this.style.height=(this.scrollHeight)+'px';">${text}</textarea>
            <button type="button" onclick="this.parentElement.remove()" style="background:#fee2e2; color:#dc2626; border:none; border-radius:6px; padding:4px 8px; font-size:11px; font-weight:800; cursor:pointer; margin-top:6px;">❌</button>
        `;
        container.appendChild(div);
    };

    window._qtnsSaveLinkFromModal = function() {
        const id = document.getElementById('qtnsFormLinkId').value;
        const title = document.getElementById('qtnsFormTitle').value.trim();
        const subtitle = document.getElementById('qtnsFormSubtitle').value.trim();
        const url = document.getElementById('qtnsFormUrl').value.trim();
        const icon = document.getElementById('qtnsFormIcon').value;
        const theme = document.getElementById('qtnsFormTheme').value;
        const subtabId = document.getElementById('qtnsFormSubtab').value;

        if (!title) {
            alert('⚠️ BẮT BUỘC: Vui lòng nhập tiêu đề đường link tài liệu!');
            return;
        }

        const stepsText = (document.getElementById('qtnsFormSteps')?.value || '').trim();
        const steps = stepsText ? stepsText.split('\n').map(s => s.trim()).filter(Boolean) : [];

        const saleGuideItems = [];
        document.querySelectorAll('.qtns-guide-question').forEach(q => {
            if (q.value.trim()) saleGuideItems.push({ question: q.value.trim() });
        });

        const warrantyItems = [];
        document.querySelectorAll('.qtns-warranty-text').forEach(w => {
            if (w.value.trim()) warrantyItems.push(w.value.trim());
        });

        let links = _qtnsGetCustomSubtabLinks(subtabId);
        if (id) {
            links = links.map(l => {
                if (l.id === id) {
                    return { ...l, title, subtitle, url, icon, theme, steps, saleGuide: saleGuideItems, warranty: warrantyItems, updatedAt: new Date().toISOString() };
                }
                return l;
            });
        } else {
            const newId = 'qtns_link_' + Date.now();
            links.push({ id: newId, title, subtitle, url, icon, theme, steps, saleGuide: saleGuideItems, warranty: warrantyItems, createdAt: new Date().toISOString() });
        }

        _qtnsSaveCustomSubtabLinks(subtabId, links);
        window._qtnsCloseLinkModal();
        _qtnsRenderCurrentMainTab();
        _qtnsShowToast('💾 Đã lưu đường link tài liệu Quản Trị Nhân Sự thành công!');
    };

    window._qtnsDeleteLink = function(id, subId) {
        if (!confirm('Bạn có chắc chắn muốn xóa đường link tài liệu này không?')) return;
        let links = _qtnsGetCustomSubtabLinks(subId);
        links = links.filter(l => l.id !== id);
        _qtnsSaveCustomSubtabLinks(subId, links);
        _qtnsShowToast('🗑️ Đã xóa đường link!');
        _qtnsRenderCurrentMainTab();
    };

    // CSS Styles Embedding
    function _qtnsGetStyles() {
        return `
            <style>
                .qtns-wrapper {
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
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
                }
                .qtns-subtitle {
                    font-size: 13.5px;
                    margin: 0;
                    opacity: 0.9;
                    font-weight: 500;
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
                    padding: 16px 20px;
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
                    font-size: 11px;
                    font-weight: 900;
                    color: #7c3aed;
                    background: #f3e8ff;
                    padding: 3px 10px;
                    border-radius: 12px;
                    margin-bottom: 8px;
                }
                .qtns-tab-btn.active .tab-num {
                    color: #ffffff !important;
                    background: rgba(255, 255, 255, 0.25) !important;
                }
                .qtns-tab-btn .tab-label {
                    font-size: 14.5px;
                    font-weight: 850;
                    color: #1e293b;
                }
                .qtns-tab-btn.active .tab-label {
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

})();
