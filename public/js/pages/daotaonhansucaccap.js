/**
 * Trang Đào Tạo Nhân Sự Các Cấp — Đồng Phục HV
 * Architecture matching Quản Trị Nhân Sự HV (/quantrinhansuhv)
 * Full Dynamic Sections, Sub-tabs, Department Filters, Link Card Modals & Process Views
 */
(function() {
    'use strict';

    // State Management
    let currentMainTab = localStorage.getItem('dtns_main_tab') || 'muc1_xuong';
    let currentSubTab1 = localStorage.getItem('dtns_sub_tab1') || 'dt_quanlyxuong';
    let currentSubTab2 = localStorage.getItem('dtns_sub_tab2') || 'dt_vanphong';

    // Helper: Check Management Permissions
    function _dtnsCanManage() {
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
            const hasPerm = window.canDo('dao_tao_nhan_su_cac_cap', 'create') || window.canDo('dao_tao_nhan_su_cac_cap', 'edit') || window.canDo('dao_tao_nhan_su_cac_cap', 'delete');
            if (hasPerm) return true;
        }

        return role === 'giam_doc' || role === 'quan_ly_cap_cao' || isLeVietTrinh;
    }

    function _dtnsHasValidUrl(url) {
        if (!url) return false;
        const str = String(url).trim();
        return str !== '' && str !== '#' && str.toLowerCase() !== 'javascript:void(0)';
    }

    function _dtnsFormatTitle(title) {
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

    function _dtnsEscapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function _dtnsShowToast(message) {
        const existing = document.getElementById('dtnsToast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'dtnsToast';
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #1e293b;
            color: #ffffff;
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 700;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
            z-index: 999999;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: dtnsSlideUp 0.3s ease;
        `;
        toast.innerHTML = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // Central Server Sync
    async function _dtnsSyncLoadFromServer() {
        let loaded = false;
        try {
            const res = await fetch('/api/daotaonhansucaccap/config');
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
                        loaded = true;
                    }
                }
            }
        } catch (e) {
            console.warn('Sync load dtns_store error:', e);
        }

        // Always render interface immediately
        _dtnsRenderCurrentMainTab();

        if (!loaded && _dtnsCanManage()) {
            _dtnsSyncSaveToServer();
        }
    }

    let _syncSaveTimer = null;
    function _dtnsSyncSaveToServer() {
        if (_syncSaveTimer) clearTimeout(_syncSaveTimer);
        _syncSaveTimer = setTimeout(async () => {
            try {
                const store = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith('dtns_')) {
                        store[k] = localStorage.getItem(k);
                    }
                }
                await fetch('/api/daotaonhansucaccap/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ value: store })
                });
            } catch (e) {
                console.warn('Sync save dtns_store error:', e);
            }
        }, 500);
    }

    // Default Subtabs Configuration
    const DEFAULT_SUBTABS_MUC1 = [
        { id: 'dt_quanlyxuong', title: 'QUẢN LÝ XƯỞNG', icon: '🏭', isCustom: false },
        { id: 'dt_bophancat', title: 'BỘ PHẬN CẮT', icon: '✂️', isCustom: false },
        { id: 'dt_bophanin', title: 'BỘ PHẬN IN', icon: '🖨️', isCustom: false }
    ];

    const DEFAULT_SUBTABS_MUC2 = [
        { id: 'dt_vanphong', title: 'VĂN PHÒNG QUẢN LÝ', icon: '🏢', isCustom: false },
        { id: 'dt_thietke', title: 'BỘ PHẬN THIẾT KẾ', icon: '🎨', isCustom: false },
        { id: 'dt_sale_kdoanh', title: 'BỘ PHẬN SALE & KINH DOANH', icon: '💼', isCustom: false }
    ];

    function _dtnsGetSubtabs(scope) {
        try {
            const raw = localStorage.getItem('dtns_subtabs_' + scope);
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}

        if (scope === 'muc1_xuong') return DEFAULT_SUBTABS_MUC1;
        return DEFAULT_SUBTABS_MUC2;
    }

    // Category / Chức vụ Management
    const DEFAULT_CATEGORIES_MUC1 = ['Chung', 'Quản Lý Xưởng', 'Tổ Trưởng', 'Bộ Phận Cắt', 'Bộ Phận In', 'Bộ Phận Ép', 'Bộ Phận May', 'Hoàn Thiện QC'];
    const DEFAULT_CATEGORIES_MUC2 = ['Chung', 'Quản Lý Văn Phòng', 'Thiết Kế', 'Sale / Kinh Doanh', 'Marketing', 'Hành Chính Nhân Sự', 'Kế Toán'];

    function _dtnsGetCategories(scope) {
        try {
            const raw = localStorage.getItem('dtns_categories_' + scope);
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}
        return scope === 'muc1_xuong' ? DEFAULT_CATEGORIES_MUC1 : DEFAULT_CATEGORIES_MUC2;
    }

    function _dtnsGetCustomSubtabLinks(subId) {
        if (!subId) return [];
        try {
            const raw = localStorage.getItem('dtns_links_' + subId);
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {}
        return [];
    }

    function _dtnsSaveCustomSubtabLinks(subId, links) {
        if (!subId) return;
        localStorage.setItem('dtns_links_' + subId, JSON.stringify(links));
        _dtnsSyncSaveToServer();
    }

    // Category & Subtab Filter State
    let activeCatFilter = { muc1_xuong: 'all', muc2_vanphong: 'all' };

    function _dtnsGetLinkCategories(link) {
        if (!link) return ['Chung'];
        if (Array.isArray(link.categories) && link.categories.length > 0) return link.categories;
        if (link.category) return [link.category];
        return ['Chung'];
    }

    function _dtnsSaveSubtabs(scope, subtabs) {
        localStorage.setItem('dtns_subtabs_' + scope, JSON.stringify(subtabs));
        _dtnsSyncSaveToServer();
    }

    function _dtnsSaveCategories(scope, cats) {
        localStorage.setItem('dtns_categories_' + scope, JSON.stringify(cats));
        _dtnsSyncSaveToServer();
    }

    window._dtnsSelectCatFilter = function(scope, cat) {
        activeCatFilter[scope] = cat;
        _dtnsRenderCurrentMainTab();
    };

    // Category Modal Handlers
    let editingCatIndex = -1;

    window._dtnsOpenManageCatModal = function(scope = null) {
        if (!_dtnsCanManage()) {
            alert('Chỉ Giám Đốc và Quản Lý mới có quyền cài đặt bộ phận / chức vụ!');
            return;
        }
        if (!scope) scope = currentMainTab;

        const modal = _dtnsEnsureCategoryModalInDOM();
        let scopeTitle = 'MỤC 1: BỘ PHẬN XƯỞNG';
        if (scope === 'muc2_vanphong') scopeTitle = 'MỤC 2: BỘ PHẬN VĂN PHÒNG';

        document.getElementById('dtnsCatModalTitle').innerText = `⚙️ CÀI ĐẶT BỘ PHẬN & CHỨC VỤ (${scopeTitle})`;
        document.getElementById('dtnsCatFormScope').value = scope;
        document.getElementById('dtnsCatFormName').value = '';
        editingCatIndex = -1;

        _dtnsRenderCatListInModal(scope);
        modal.style.display = 'flex';
    };

    window._dtnsCloseCatModal = function() {
        editingCatIndex = -1;
        const modal = document.getElementById('dtnsCategoryModal');
        if (modal) modal.style.display = 'none';
    };

    function _dtnsRenderCatListInModal(scope) {
        const container = document.getElementById('dtnsCatListContainer');
        if (!container) return;

        const cats = _dtnsGetCategories(scope);
        if (cats.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:16px; color:#94a3b8; font-weight:600;">Chưa có bộ phận nào</div>`;
            return;
        }

        container.innerHTML = cats.map((cat, idx) => {
            if (editingCatIndex === idx) {
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#fffbeb; padding:10px 14px; border-radius:14px; border:2px solid #f59e0b; box-shadow:0 4px 12px rgba(245, 158, 11, 0.15); gap:10px;">
                        <div style="display:flex; align-items:center; gap:8px; flex:1;">
                            <span style="font-size:16px;">📌</span>
                            <input type="text" id="dtnsEditCatInput_${idx}" value="${_dtnsEscapeHTML(cat)}" style="flex:1; padding:8px 12px; border-radius:10px; border:1.5px solid #f59e0b; font-size:14px; font-weight:800; color:#0f172a; outline:none; background:#ffffff;" onkeypress="if(event.key==='Enter') window._dtnsSaveCategoryEditFromModal('${scope}', ${idx})">
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button onclick="window._dtnsSaveCategoryEditFromModal('${scope}', ${idx})" title="Lưu tên mới" style="background:#22c55e; color:#ffffff; border:none; border-radius:10px; padding:7px 14px; font-size:12.5px; font-weight:900; cursor:pointer; box-shadow:0 2px 6px rgba(34, 197, 94, 0.3);">💾 Lưu</button>
                            <button onclick="window._dtnsCancelCategoryEditFromModal('${scope}')" title="Hủy bỏ" style="background:#e2e8f0; color:#475569; border:none; border-radius:10px; padding:7px 12px; font-size:12.5px; font-weight:800; cursor:pointer;">✕ Hủy</button>
                        </div>
                    </div>
                `;
            }

            return `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; padding:12px 16px; border-radius:14px; border:1.5px solid #e2e8f0; box-shadow:0 2px 8px rgba(0,0,0,0.02); transition:all 0.2s ease;" onmouseover="this.style.borderColor='#818cf8'; this.style.boxShadow='0 4px 12px rgba(99,102,241,0.08)'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.02)'">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:32px; height:32px; background:#e0e7ff; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:15px; color:#4338ca; border:1px solid #c7d2fe; flex-shrink:0;">📌</div>
                        <span style="font-size:14.5px; font-weight:800; color:#0f172a;">${_dtnsEscapeHTML(cat)}</span>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button onclick="window._dtnsStartCategoryEditFromModal('${scope}', ${idx})" title="Chỉnh sửa tên bộ phận" style="background:#fef3c7; color:#d97706; border:1px solid #fde047; border-radius:10px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer;">✏️ Sửa Tên</button>
                        <button onclick="window._dtnsDeleteCategoryFromModal('${scope}', ${idx})" title="Xóa bộ phận" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; border-radius:10px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer;">🗑️ Xóa</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window._dtnsAddCategoryFromModal = function() {
        const input = document.getElementById('dtnsCatFormName');
        const scope = document.getElementById('dtnsCatFormScope')?.value || currentMainTab;
        if (!input) return;
        const name = input.value.trim();
        if (!name) {
            alert('Vui lòng nhập tên bộ phận / chức vụ mới!');
            return;
        }

        let cats = _dtnsGetCategories(scope);
        if (cats.includes(name)) {
            alert('Bộ phận / chức vụ này đã tồn tại!');
            return;
        }

        cats.push(name);
        _dtnsSaveCategories(scope, cats);
        input.value = '';
        _dtnsRenderCatListInModal(scope);
        _dtnsRenderCurrentMainTab();
        _dtnsShowToast(`✅ Đã thêm bộ phận/chức vụ "${name}"!`);
    };

    window._dtnsStartCategoryEditFromModal = function(scope, index) {
        editingCatIndex = index;
        _dtnsRenderCatListInModal(scope);
        setTimeout(() => {
            const input = document.getElementById(`dtnsEditCatInput_${index}`);
            if (input) { input.focus(); input.select(); }
        }, 50);
    };

    window._dtnsCancelCategoryEditFromModal = function(scope) {
        editingCatIndex = -1;
        _dtnsRenderCatListInModal(scope);
    };

    window._dtnsSaveCategoryEditFromModal = function(scope, index) {
        const input = document.getElementById(`dtnsEditCatInput_${index}`);
        if (!input) return;
        const newName = input.value.trim();
        let cats = _dtnsGetCategories(scope);
        const oldName = cats[index];

        if (!newName) {
            alert('Vui lòng nhập tên hợp lệ!');
            return;
        }

        if (newName !== oldName && cats.includes(newName)) {
            alert('Tên này đã tồn tại!');
            return;
        }

        cats[index] = newName;
        _dtnsSaveCategories(scope, cats);

        if (activeCatFilter[scope] === oldName) {
            activeCatFilter[scope] = newName;
        }

        editingCatIndex = -1;
        _dtnsRenderCatListInModal(scope);
        _dtnsRenderCurrentMainTab();
        _dtnsShowToast('💾 Đã cập nhật bộ phận / chức vụ!');
    };

    window._dtnsDeleteCategoryFromModal = function(scope, index) {
        let cats = _dtnsGetCategories(scope);
        const catName = cats[index];
        if (!catName) return;

        if (!confirm(`Bạn có chắc muốn xóa bộ phận / chức vụ "${catName}" không?`)) return;

        cats = cats.filter((_, i) => i !== index);
        _dtnsSaveCategories(scope, cats);

        if (activeCatFilter[scope] === catName) {
            activeCatFilter[scope] = 'all';
        }

        _dtnsRenderCatListInModal(scope);
        _dtnsRenderCurrentMainTab();
        _dtnsShowToast(`🗑️ Đã xóa bộ phận "${catName}"!`);
    };

    function _dtnsEnsureCategoryModalInDOM() {
        let modal = document.getElementById('dtnsCategoryModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'dtns-modal-overlay';
            modal.id = 'dtnsCategoryModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:99999; align-items:center; justify-content:center; padding:20px;';
            modal.innerHTML = `
                <div class="dtns-modal-card" style="max-height:88vh; display:flex; flex-direction:column; width:100%; max-width:600px; border-radius:24px; overflow:hidden; background:#ffffff; box-shadow:0 25px 50px -12px rgba(79,70,229,0.35);">
                    <div style="flex-shrink:0; padding:18px 24px; background:linear-gradient(135deg, #4f46e5, #7c3aed); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                        <h3 id="dtnsCatModalTitle" style="margin:0; font-size:17.5px; font-weight:900;">⚙️ CÀI ĐẶT BỘ PHẬN & CHỨC VỤ</h3>
                        <button onclick="window._dtnsCloseCatModal()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:30px; height:30px; border-radius:50%; cursor:pointer; font-size:16px; font-weight:bold;">✕</button>
                    </div>

                    <div style="flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:16px; background:#f8fafc;">
                        <input type="hidden" id="dtnsCatFormScope" value="">
                        
                        <div style="background:#ffffff; border:1.5px solid #c7d2fe; border-radius:18px; padding:16px; box-shadow:0 4px 14px rgba(79,70,229,0.05);">
                            <label style="font-size:13.5px; font-weight:900; color:#4338ca; display:block; margin-bottom:8px;">➕ Tạo Bộ Phận / Chức Vụ Mới:</label>
                            <div style="display:flex; gap:10px;">
                                <input type="text" id="dtnsCatFormName" placeholder="Nhập tên bộ phận / chức vụ mới..." style="flex:1; border:2px solid #c7d2fe; border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:700; color:#0f172a; outline:none;" onkeypress="if(event.key==='Enter') window._dtnsAddCategoryFromModal()">
                                <button onclick="window._dtnsAddCategoryFromModal()" style="background:linear-gradient(135deg, #4f46e5, #6366f1); color:#ffffff; border:none; border-radius:12px; padding:10px 18px; font-size:13.5px; font-weight:900; cursor:pointer; box-shadow:0 4px 12px rgba(79,70,229,0.3); white-space:nowrap;">➕ Thêm Mới</button>
                            </div>
                        </div>

                        <div>
                            <div style="font-size:13.5px; font-weight:900; color:#334155; margin-bottom:10px;">📌 Danh Sách Hiện Tại:</div>
                            <div id="dtnsCatListContainer" style="display:flex; flex-direction:column; gap:10px;"></div>
                        </div>
                    </div>

                    <div style="flex-shrink:0; padding:14px 24px; background:#ffffff; border-top:1.5px solid #e2e8f0; display:flex; justify-content:flex-end;">
                        <button onclick="window._dtnsCloseCatModal()" style="padding:10px 22px; border-radius:12px; font-weight:900; background:#f1f5f9; color:#475569; border:none; cursor:pointer;">Đóng</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    }

    // Modal Subtab Manager
    let currentSubtabScope = 'muc1_xuong';
    let editingSubtabId = null;

    window._dtnsOpenManageSubtabModal = function(scope = null) {
        if (!_dtnsCanManage()) {
            alert('Chỉ Giám Đốc và Quản Lý mới có quyền cài đặt mục!');
            return;
        }
        if (!scope) scope = currentMainTab;
        currentSubtabScope = scope;
        editingSubtabId = null;

        const modal = _dtnsEnsureSubtabModalInDOM();
        const titleInput = document.getElementById('dtnsSubtabFormTitle');
        if (titleInput) titleInput.value = '';

        let scopeTitle = 'MỤC 1: BỘ PHẬN XƯỞNG';
        if (scope === 'muc2_vanphong') scopeTitle = 'MỤC 2: BỘ PHẬN VĂN PHÒNG';

        const titleEl = document.getElementById('dtnsSubtabModalTitle');
        if (titleEl) titleEl.innerText = `⚙️ CÀI ĐẶT MỤC (${scopeTitle})`;

        _dtnsRenderSubtabListInModal();
        modal.style.display = 'flex';
    };

    window._dtnsCloseSubtabModal = function() {
        editingSubtabId = null;
        const modal = document.getElementById('dtnsSubtabModal');
        if (modal) modal.style.display = 'none';
    };

    function _dtnsRenderSubtabListInModal() {
        const container = document.getElementById('dtnsSubtabListContainer');
        if (!container) return;

        const subtabs = _dtnsGetSubtabs(currentSubtabScope);
        if (subtabs.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:16px; color:#94a3b8; font-weight:600;">Chưa có mục nào</div>`;
            return;
        }

        container.innerHTML = subtabs.map(st => {
            if (editingSubtabId === st.id) {
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#fffbeb; padding:10px 14px; border-radius:14px; border:2px solid #f59e0b; gap:10px;">
                        <div style="display:flex; align-items:center; gap:8px; flex:1;">
                            <input type="text" id="dtnsEditSubtabIcon_${st.id}" value="${st.icon || '📁'}" style="width:42px; text-align:center; padding:6px; border-radius:8px; border:1px solid #cbd5e1; font-size:16px;">
                            <input type="text" id="dtnsEditSubtabTitle_${st.id}" value="${_dtnsEscapeHTML(st.title)}" style="flex:1; padding:8px 12px; border-radius:10px; border:1.5px solid #f59e0b; font-size:14px; font-weight:800; color:#0f172a; outline:none; background:#ffffff;">
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button onclick="window._dtnsSaveSubtabEditFromModal('${st.id}')" style="background:#22c55e; color:#ffffff; border:none; border-radius:10px; padding:7px 14px; font-size:12.5px; font-weight:900; cursor:pointer;">💾 Lưu</button>
                            <button onclick="window._dtnsCancelSubtabEditFromModal()" style="background:#e2e8f0; color:#475569; border:none; border-radius:10px; padding:7px 12px; font-size:12.5px; font-weight:800; cursor:pointer;">✕ Hủy</button>
                        </div>
                    </div>
                `;
            }

            return `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; padding:12px 16px; border-radius:14px; border:1.5px solid #e2e8f0;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:20px;">${st.icon || '📁'}</span>
                        <div>
                            <div style="font-size:14.5px; font-weight:800; color:#0f172a;">${_dtnsEscapeHTML(st.title)}</div>
                            <div style="font-size:11.5px; color:#64748b; font-weight:600;">Mã ID: ${st.id} ${st.isCustom ? '• (Thêm thủ công)' : '• (Mặc định)'}</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button onclick="window._dtnsStartSubtabEditFromModal('${st.id}')" style="background:#fef3c7; color:#d97706; border:1px solid #fde047; border-radius:10px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer;">✏️ Sửa Tên</button>
                        <button onclick="window._dtnsDeleteSubtabFromModal('${st.id}')" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; border-radius:10px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer;">🗑️ Xóa</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window._dtnsAddSubtabFromModal = function() {
        const titleInput = document.getElementById('dtnsSubtabFormTitle');
        const iconInput = document.getElementById('dtnsSubtabFormIcon');
        if (!titleInput) return;

        const title = titleInput.value.trim();
        const icon = (iconInput?.value || '📁').trim();

        if (!title) {
            alert('Vui lòng nhập tên mục mới!');
            return;
        }

        let subtabs = _dtnsGetSubtabs(currentSubtabScope);
        const newId = 'custom_' + Date.now();
        subtabs.push({ id: newId, title, icon, isCustom: true });

        _dtnsSaveSubtabs(currentSubtabScope, subtabs);
        titleInput.value = '';
        _dtnsRenderSubtabListInModal();
        _dtnsRenderCurrentMainTab();
        _dtnsShowToast(`✅ Đã thêm mục "${title}"!`);
    };

    window._dtnsStartSubtabEditFromModal = function(subId) {
        editingSubtabId = subId;
        _dtnsRenderSubtabListInModal();
    };

    window._dtnsCancelSubtabEditFromModal = function() {
        editingSubtabId = null;
        _dtnsRenderSubtabListInModal();
    };

    window._dtnsSaveSubtabEditFromModal = function(subId) {
        const titleInput = document.getElementById(`dtnsEditSubtabTitle_${subId}`);
        const iconInput = document.getElementById(`dtnsEditSubtabIcon_${subId}`);
        if (!titleInput) return;

        const newTitle = titleInput.value.trim();
        const newIcon = (iconInput?.value || '📁').trim();

        if (!newTitle) {
            alert('Vui lòng nhập tên mục hợp lệ!');
            return;
        }

        let subtabs = _dtnsGetSubtabs(currentSubtabScope);
        const idx = subtabs.findIndex(s => s.id === subId);
        if (idx !== -1) {
            subtabs[idx].title = newTitle;
            subtabs[idx].icon = newIcon;
            _dtnsSaveSubtabs(currentSubtabScope, subtabs);
        }

        editingSubtabId = null;
        _dtnsRenderSubtabListInModal();
        _dtnsRenderCurrentMainTab();
        _dtnsShowToast('💾 Đã cập nhật mục đào tạo!');
    };

    window._dtnsDeleteSubtabFromModal = function(subId) {
        let subtabs = _dtnsGetSubtabs(currentSubtabScope);
        const target = subtabs.find(s => s.id === subId);
        if (!target) return;

        if (!confirm(`Bạn có chắc chắn muốn xóa mục "${target.title}" và toàn bộ link trong mục này không?`)) return;

        subtabs = subtabs.filter(s => s.id !== subId);
        _dtnsSaveSubtabs(currentSubtabScope, subtabs);
        localStorage.removeItem('dtns_links_' + subId);

        _dtnsRenderSubtabListInModal();
        _dtnsRenderCurrentMainTab();
        _dtnsShowToast(`🗑️ Đã xóa mục "${target.title}"!`);
    };

    function _dtnsEnsureSubtabModalInDOM() {
        let modal = document.getElementById('dtnsSubtabModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'dtns-modal-overlay';
            modal.id = 'dtnsSubtabModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:99999; align-items:center; justify-content:center; padding:20px;';
            modal.innerHTML = `
                <div class="dtns-modal-card" style="max-height:88vh; display:flex; flex-direction:column; width:100%; max-width:620px; border-radius:24px; overflow:hidden; background:#ffffff; box-shadow:0 25px 50px -12px rgba(79,70,229,0.35);">
                    <div style="flex-shrink:0; padding:18px 24px; background:linear-gradient(135deg, #4f46e5, #7c3aed); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                        <h3 id="dtnsSubtabModalTitle" style="margin:0; font-size:17.5px; font-weight:900;">⚙️ CÀI ĐẶT MỤC ĐÀO TẠO</h3>
                        <button onclick="window._dtnsCloseSubtabModal()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:30px; height:30px; border-radius:50%; cursor:pointer; font-size:16px; font-weight:bold;">✕</button>
                    </div>

                    <div style="flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:16px; background:#f8fafc;">
                        <div style="background:#ffffff; border:1.5px solid #c7d2fe; border-radius:18px; padding:16px;">
                            <label style="font-size:13.5px; font-weight:900; color:#4338ca; display:block; margin-bottom:8px;">➕ Tạo Mục Mới:</label>
                            <div style="display:flex; gap:8px;">
                                <input type="text" id="dtnsSubtabFormIcon" placeholder="Icon (🎓, 🏭...)" style="width:70px; border:2px solid #c7d2fe; border-radius:12px; padding:10px; font-size:16px; text-align:center; outline:none;">
                                <input type="text" id="dtnsSubtabFormTitle" placeholder="Nhập tên mục mới..." style="flex:1; border:2px solid #c7d2fe; border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:700; color:#0f172a; outline:none;" onkeypress="if(event.key==='Enter') window._dtnsAddSubtabFromModal()">
                                <button onclick="window._dtnsAddSubtabFromModal()" style="background:linear-gradient(135deg, #4f46e5, #6366f1); color:#ffffff; border:none; border-radius:12px; padding:10px 18px; font-size:13.5px; font-weight:900; cursor:pointer;">➕ Thêm</button>
                            </div>
                        </div>

                        <div>
                            <div style="font-size:13.5px; font-weight:900; color:#334155; margin-bottom:10px;">📌 Danh Sách Các Mục:</div>
                            <div id="dtnsSubtabListContainer" style="display:flex; flex-direction:column; gap:10px;"></div>
                        </div>
                    </div>

                    <div style="flex-shrink:0; padding:14px 24px; background:#ffffff; border-top:1.5px solid #e2e8f0; display:flex; justify-content:flex-end;">
                        <button onclick="window._dtnsCloseSubtabModal()" style="padding:10px 22px; border-radius:12px; font-weight:900; background:#f1f5f9; color:#475569; border:none; cursor:pointer;">Đóng</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    }

    // Link Creation / Edit Modal Handlers (Matches Images 3 & 4)
    let currentModalTab = 1;
    let editingLinkId = null;
    let editingLinkSubId = null;

    window._dtnsSwitchModalTab = function(tabNum) {
        currentModalTab = tabNum;
        const btn1 = document.getElementById('dtnsModalTabBtn1');
        const btn2 = document.getElementById('dtnsModalTabBtn2');
        const content1 = document.getElementById('dtnsModalTabContent1');
        const content2 = document.getElementById('dtnsModalTabContent2');

        if (tabNum === 1) {
            btn1.style.background = 'linear-gradient(135deg, #4f46e5, #6366f1)';
            btn1.style.color = '#ffffff';
            btn1.style.boxShadow = '0 4px 12px rgba(79,70,229,0.3)';
            btn2.style.background = '#ffffff';
            btn2.style.color = '#475569';
            btn2.style.boxShadow = 'none';

            content1.style.display = 'block';
            content2.style.display = 'none';
        } else {
            btn2.style.background = 'linear-gradient(135deg, #4f46e5, #6366f1)';
            btn2.style.color = '#ffffff';
            btn2.style.boxShadow = '0 4px 12px rgba(79,70,229,0.3)';
            btn1.style.background = '#ffffff';
            btn1.style.color = '#475569';
            btn1.style.boxShadow = 'none';

            content1.style.display = 'none';
            content2.style.display = 'block';
        }
    };

    window._dtnsOpenLinkModal = function(editLinkId = null, defaultSubId = null) {
        if (!_dtnsCanManage()) {
            alert('Chỉ Giám Đốc và Quản Lý mới có quyền tạo / sửa tài liệu!');
            return;
        }

        const modal = _dtnsEnsureLinkModalInDOM();
        editingLinkId = editLinkId;

        const scope = currentMainTab;
        const subtabs = _dtnsGetSubtabs(scope);
        const subSelect = document.getElementById('dtnsLinkFormSubtab');

        if (subSelect) {
            subSelect.innerHTML = subtabs.map(s => `<option value="${s.id}">${s.icon || '📁'} ${s.title}</option>`).join('');
            if (defaultSubId) subSelect.value = defaultSubId;
        }

        // Render categories checkboxes matching current main section
        const catContainer = document.getElementById('dtnsCatCheckboxesContainer');
        const cats = _dtnsGetCategories(scope);
        if (catContainer) {
            catContainer.innerHTML = cats.map((cat, idx) => `
                <label style="display:inline-flex; align-items:center; gap:6px; background:#ffffff; border:1.5px solid #cbd5e1; border-radius:10px; padding:6px 12px; font-size:13px; font-weight:700; color:#334155; cursor:pointer; user-select:none;">
                    <input type="checkbox" name="dtnsCategoryCheck" value="${_dtnsEscapeHTML(cat)}" ${idx === 0 ? 'checked' : ''} style="width:16px; height:16px; accent-color:#4f46e5;">
                    📌 ${cat}
                </label>
            `).join('');
        }

        const titleInput = document.getElementById('dtnsFormTitle');
        const descInput = document.getElementById('dtnsFormDesc');
        const urlInput = document.getElementById('dtnsFormUrl');
        const imgInput = document.getElementById('dtnsFormImg');
        const iconSelect = document.getElementById('dtnsFormIcon');
        const themeSelect = document.getElementById('dtnsFormTheme');
        const guideInput = document.getElementById('dtnsFormGuideContent');

        if (editLinkId) {
            document.getElementById('dtnsLinkModalTitle').innerText = '✏️ CHỈNH SỬA ĐƯỜNG LINK TÀI LIỆU ĐÀO TẠO';
            let foundLink = null;
            let foundSubId = null;

            subtabs.forEach(st => {
                const links = _dtnsGetCustomSubtabLinks(st.id);
                const l = links.find(x => x.id === editLinkId);
                if (l) { foundLink = l; foundSubId = st.id; }
            });

            if (foundLink) {
                editingLinkSubId = foundSubId;
                if (subSelect) subSelect.value = foundSubId;
                if (titleInput) titleInput.value = foundLink.title || '';
                if (descInput) descInput.value = foundLink.desc || '';
                if (urlInput) urlInput.value = foundLink.url || '';
                if (imgInput) imgInput.value = foundLink.img || '';
                if (iconSelect) iconSelect.value = foundLink.icon || '🎓';
                if (themeSelect) themeSelect.value = foundLink.theme || 'purple';
                if (guideInput) guideInput.value = foundLink.guideContent || '';

                const selectedCats = _dtnsGetLinkCategories(foundLink);
                const checkboxes = document.querySelectorAll('input[name="dtnsCategoryCheck"]');
                checkboxes.forEach(cb => {
                    cb.checked = selectedCats.includes(cb.value);
                });
            }
        } else {
            document.getElementById('dtnsLinkModalTitle').innerText = '➕ TẠO ĐƯỜNG LINK TÀI LIỆU NHÂN SỰ MỚI';
            editingLinkSubId = null;
            if (titleInput) titleInput.value = '';
            if (descInput) descInput.value = '';
            if (urlInput) urlInput.value = '';
            if (imgInput) imgInput.value = '';
            if (iconSelect) iconSelect.value = '🎓';
            if (themeSelect) themeSelect.value = 'purple';
            if (guideInput) guideInput.value = '';
        }

        window._dtnsSwitchModalTab(1);
        modal.style.display = 'flex';
    };

    window._dtnsCloseLinkModal = function() {
        const modal = document.getElementById('dtnsLinkModal');
        if (modal) modal.style.display = 'none';
    };

    window._dtnsSaveLinkFromModal = function() {
        const subId = document.getElementById('dtnsLinkFormSubtab')?.value;
        const title = document.getElementById('dtnsFormTitle')?.value.trim();
        const desc = document.getElementById('dtnsFormDesc')?.value.trim();
        const url = document.getElementById('dtnsFormUrl')?.value.trim();
        const img = document.getElementById('dtnsFormImg')?.value.trim();
        const icon = document.getElementById('dtnsFormIcon')?.value || '🎓';
        const theme = document.getElementById('dtnsFormTheme')?.value || 'purple';
        const guideContent = document.getElementById('dtnsFormGuideContent')?.value || '';

        const selectedCats = Array.from(document.querySelectorAll('input[name="dtnsCategoryCheck"]:checked')).map(c => c.value);

        if (!title) {
            alert('Vui lòng nhập tiêu đề đường link tài liệu!');
            return;
        }

        if (selectedCats.length === 0) {
            alert('Vui lòng chọn ít nhất 1 bộ phận / chức vụ tài liệu!');
            return;
        }

        let links = _dtnsGetCustomSubtabLinks(subId);

        if (editingLinkId) {
            // Remove from old subtab if subId changed
            if (editingLinkSubId && editingLinkSubId !== subId) {
                let oldLinks = _dtnsGetCustomSubtabLinks(editingLinkSubId);
                oldLinks = oldLinks.filter(x => x.id !== editingLinkId);
                _dtnsSaveCustomSubtabLinks(editingLinkSubId, oldLinks);
            }

            const idx = links.findIndex(x => x.id === editingLinkId);
            const updatedObj = {
                id: editingLinkId,
                title: _dtnsFormatTitle(title),
                desc,
                url,
                img,
                icon,
                theme,
                categories: selectedCats,
                category: selectedCats[0],
                guideContent,
                updatedAt: new Date().toISOString()
            };

            if (idx !== -1) {
                links[idx] = { ...links[idx], ...updatedObj };
            } else {
                links.push(updatedObj);
            }
        } else {
            const newLink = {
                id: 'link_' + Date.now(),
                title: _dtnsFormatTitle(title),
                desc,
                url,
                img,
                icon,
                theme,
                categories: selectedCats,
                category: selectedCats[0],
                guideContent,
                isPinned: false,
                createdAt: new Date().toISOString()
            };
            links.unshift(newLink);
        }

        _dtnsSaveCustomSubtabLinks(subId, links);
        window._dtnsCloseLinkModal();
        _dtnsRenderCurrentMainTab();
        _dtnsShowToast(editingLinkId ? '💾 Đã cập nhật thông tin tài liệu!' : '✨ Đã thêm đường link tài liệu mới!');
    };

    window._dtnsTriggerFileUpload = function() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                if (res.ok) {
                    const data = await res.json();
                    if (data.url) {
                        const imgInput = document.getElementById('dtnsFormImg');
                        if (imgInput) imgInput.value = data.url;
                        _dtnsShowToast('🖼️ Đã tải ảnh minh họa thành công!');
                    }
                } else {
                    alert('Lỗi tải ảnh. Vui lòng thử lại.');
                }
            } catch (err) {
                console.error(err);
                alert('Không thể kết nối máy chủ để tải ảnh.');
            }
        };
        fileInput.click();
    };

    function _dtnsEnsureLinkModalInDOM() {
        let modal = document.getElementById('dtnsLinkModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'dtns-modal-overlay';
            modal.id = 'dtnsLinkModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:99999; align-items:center; justify-content:center; padding:20px;';
            modal.innerHTML = `
                <div class="dtns-modal-card" style="max-height:92vh; display:flex; flex-direction:column; width:100%; max-width:760px; border-radius:24px; overflow:hidden; background:#ffffff; box-shadow:0 25px 50px -12px rgba(79,70,229,0.35);">
                    <!-- Modal Header -->
                    <div style="flex-shrink:0; padding:18px 24px; background:linear-gradient(135deg, #4f46e5, #7c3aed); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                        <h3 id="dtnsLinkModalTitle" style="margin:0; font-size:18px; font-weight:900;">➕ TẠO ĐƯỜNG LINK TÀI LIỆU NHÂN SỰ MỚI</h3>
                        <button onclick="window._dtnsCloseLinkModal()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:32px; height:32px; border-radius:50%; cursor:pointer; font-size:18px; font-weight:bold;">✕</button>
                    </div>

                    <!-- Modal Navigation Tabs -->
                    <div style="flex-shrink:0; background:#f1f5f9; padding:10px 24px; display:flex; gap:10px; border-bottom:1.5px solid #e2e8f0;">
                        <button id="dtnsModalTabBtn1" onclick="window._dtnsSwitchModalTab(1)" style="padding:10px 18px; border-radius:12px; font-weight:800; font-size:13.5px; border:none; cursor:pointer; transition:all 0.2s ease;">📁 TAB 1: Thông Tin & Link (*)</button>
                        <button id="dtnsModalTabBtn2" onclick="window._dtnsSwitchModalTab(2)" style="padding:10px 18px; border-radius:12px; font-weight:800; font-size:13.5px; border:none; cursor:pointer; transition:all 0.2s ease;">📋 TAB 2: Quy Trình & Hướng Dẫn*</button>
                    </div>

                    <!-- Modal Content Area -->
                    <div style="flex:1; overflow-y:auto; padding:24px; background:#f8fafc;">
                        <!-- TAB 1 CONTENT -->
                        <div id="dtnsModalTabContent1" style="display:block;">
                            <div style="display:flex; flex-direction:column; gap:18px;">
                                <div>
                                    <label style="font-size:13.5px; font-weight:900; color:#1e293b; display:block; margin-bottom:6px;">📁 Danh Mục Quản Trị (* BẮT BUỘC):</label>
                                    <select id="dtnsLinkFormSubtab" style="width:100%; border:2px solid #c7d2fe; border-radius:12px; padding:11px 14px; font-size:14px; font-weight:700; color:#0f172a; outline:none; background:#ffffff;"></select>
                                </div>

                                <div>
                                    <label style="font-size:13.5px; font-weight:900; color:#1e293b; display:block; margin-bottom:6px;">🏢 Bộ Phận Tài Liệu / Chức Vụ (* BẮT BUỘC - Chọn nhiều):</label>
                                    <div id="dtnsCatCheckboxesContainer" style="display:flex; flex-wrap:wrap; gap:8px; padding:12px; background:#ffffff; border:1.5px solid #c7d2fe; border-radius:14px;"></div>
                                </div>

                                <div>
                                    <label style="font-size:13.5px; font-weight:900; color:#1e293b; display:block; margin-bottom:6px;">Tiêu đề đường link tài liệu (*):</label>
                                    <input type="text" id="dtnsFormTitle" placeholder="Ví dụ: Quy trình đào tạo nhân sự kỹ thuật..." style="width:100%; border:2px solid #c7d2fe; border-radius:12px; padding:11px 14px; font-size:14px; font-weight:700; color:#0f172a; outline:none;">
                                </div>

                                <div>
                                    <label style="font-size:13.5px; font-weight:900; color:#1e293b; display:block; margin-bottom:6px;">📝 Mô tả / Ghi chú (tự động xuống dòng):</label>
                                    <textarea id="dtnsFormDesc" rows="3" placeholder="Mô tả tóm tắt nội dung quy trình hoặc cẩm nang hướng dẫn..." style="width:100%; border:2px solid #c7d2fe; border-radius:12px; padding:11px 14px; font-size:13.5px; font-weight:600; color:#0f172a; outline:none; resize:vertical;"></textarea>
                                </div>

                                <div>
                                    <label style="font-size:13.5px; font-weight:900; color:#1e293b; display:block; margin-bottom:6px;">Đường link URL tài liệu (Google Sheets / Word / Link ngoài):</label>
                                    <input type="url" id="dtnsFormUrl" placeholder="https://docs.google.com/..." style="width:100%; border:2px solid #c7d2fe; border-radius:12px; padding:11px 14px; font-size:13.5px; font-weight:600; color:#0f172a; outline:none;">
                                </div>

                                <div>
                                    <label style="font-size:13.5px; font-weight:900; color:#1e293b; display:block; margin-bottom:6px;">🖼️ Hình Ảnh Minh Họa / Sơ Đồ / Mẫu (Không bắt buộc):</label>
                                    <div style="display:flex; gap:10px;">
                                        <input type="text" id="dtnsFormImg" placeholder="Đường dẫn ảnh URL hoặc chọn từ máy..." style="flex:1; border:2px solid #c7d2fe; border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:600; color:#0f172a; outline:none;">
                                        <button type="button" onclick="window._dtnsTriggerFileUpload()" style="background:#e0e7ff; color:#4338ca; border:1.5px solid #c7d2fe; border-radius:12px; padding:10px 16px; font-size:13px; font-weight:800; cursor:pointer;">🖼️ Chọn Ảnh Từ Máy Tính</button>
                                    </div>
                                </div>

                                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
                                    <div>
                                        <label style="font-size:13.5px; font-weight:900; color:#1e293b; display:block; margin-bottom:6px;">Icon Biểu Tượng:</label>
                                        <select id="dtnsFormIcon" style="width:100%; border:2px solid #c7d2fe; border-radius:12px; padding:10px 14px; font-size:14px; font-weight:700; color:#0f172a; outline:none;">
                                            <option value="🎓">🎓 Đào Tạo / Khóa Học</option>
                                            <option value="🏭">🏭 Quản Lý Xưởng</option>
                                            <option value="✂️">✂️ Bộ Phận Cắt</option>
                                            <option value="🖨️">🖨️ Bộ Phận In</option>
                                            <option value="🔥">🔥 Bộ Phận Ép</option>
                                            <option value="🧵">🧵 Bộ Phận May</option>
                                            <option value="🏢">🏢 Văn Phòng Quản Lý</option>
                                            <option value="🎨">🎨 Bộ Phận Thiết Kế</option>
                                            <option value="💼">💼 Sale / Kinh Doanh</option>
                                            <option value="👔">👔 Quản Trị Nhân Sự</option>
                                            <option value="📋">📋 Quy Trình Nội Bộ</option>
                                            <option value="📜">📜 Cẩm Nang Hướng Dẫn</option>
                                            <option value="💡">💡 Kinh Nghiệm & Bí Quyết</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style="font-size:13.5px; font-weight:900; color:#1e293b; display:block; margin-bottom:6px;">Tông Màu Hiển Thị:</label>
                                        <select id="dtnsFormTheme" style="width:100%; border:2px solid #c7d2fe; border-radius:12px; padding:10px 14px; font-size:14px; font-weight:700; color:#0f172a; outline:none;">
                                            <option value="purple">🟣 Tím Hoàng Gia (Royal Purple)</option>
                                            <option value="blue">🔵 Xanh Dương (Ocean Blue)</option>
                                            <option value="emerald">🟢 Xanh Lá (Emerald Green)</option>
                                            <option value="amber">🟠 Cam Ấm (Warm Amber)</option>
                                            <option value="rose">🔴 Đỏ Nổi Bật (Rose Red)</option>
                                            <option value="slate">⚪ Xám Hiện Đại (Slate Gray)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- TAB 2 CONTENT -->
                        <div id="dtnsModalTabContent2" style="display:none;">
                            <div style="display:flex; flex-direction:column; gap:12px;">
                                <label style="font-size:13.5px; font-weight:900; color:#1e293b; display:block;">📋 Nội Dung Quy Trình & Hướng Dẫn Chi Tiết (Text / HTML / Các bước):</label>
                                <textarea id="dtnsFormGuideContent" rows="14" placeholder="Nhập chi tiết các bước quy trình, tài liệu đào tạo hoặc cẩm nang hướng dẫn tại đây..." style="width:100%; border:2px solid #c7d2fe; border-radius:16px; padding:16px; font-size:14px; font-family:inherit; font-weight:500; color:#0f172a; outline:none; resize:vertical; line-height:1.6; background:#ffffff;"></textarea>
                                <span style="font-size:12px; color:#64748b; font-weight:600;">💡 Gợi ý: Bạn có thể nhập văn bản thông thường hoặc định dạng HTML để hiển thị bài viết sinh động hơn.</span>
                            </div>
                        </div>
                    </div>

                    <!-- Modal Footer -->
                    <div style="flex-shrink:0; padding:16px 24px; background:#ffffff; border-top:1.5px solid #e2e8f0; display:flex; justify-content:flex-end; gap:12px;">
                        <button onclick="window._dtnsCloseLinkModal()" style="padding:11px 22px; border-radius:12px; font-weight:800; background:#f1f5f9; color:#475569; border:none; cursor:pointer;">Hủy Bỏ</button>
                        <button onclick="window._dtnsSaveLinkFromModal()" style="padding:11px 26px; border-radius:12px; font-weight:900; background:linear-gradient(135deg, #4f46e5, #7c3aed); color:#ffffff; border:none; cursor:pointer; box-shadow:0 4px 14px rgba(79,70,229,0.35);">💾 Lưu Đường Link</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    }

    // View Process / Detail Modal
    window._dtnsViewGuideModal = function(subId, linkId) {
        const links = _dtnsGetCustomSubtabLinks(subId);
        const link = links.find(x => x.id === linkId);
        if (!link) return;

        let modal = document.getElementById('dtnsGuideViewModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'dtnsGuideViewModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.7); backdrop-filter:blur(5px); z-index:999999; align-items:center; justify-content:center; padding:20px;';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="max-height:92vh; display:flex; flex-direction:column; width:100%; max-width:840px; border-radius:24px; overflow:hidden; background:#ffffff; box-shadow:0 25px 50px -12px rgba(79,70,229,0.35);">
                <div style="padding:20px 28px; background:linear-gradient(135deg, #4f46e5, #7c3aed); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <span style="font-size:24px;">${link.icon || '🎓'}</span>
                        <h3 style="margin:0; font-size:18px; font-weight:900;">${_dtnsEscapeHTML(link.title)}</h3>
                    </div>
                    <button onclick="document.getElementById('dtnsGuideViewModal').style.display='none'" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:32px; height:32px; border-radius:50%; cursor:pointer; font-size:18px; font-weight:bold;">✕</button>
                </div>

                <div style="flex:1; overflow-y:auto; padding:28px; background:#ffffff; color:#1e293b; font-size:15px; line-height:1.7;">
                    ${link.desc ? `<div style="background:#f8fafc; border-left:4px solid #6366f1; padding:14px 18px; border-radius:8px; margin-bottom:20px; font-weight:600; color:#475569;">${_dtnsEscapeHTML(link.desc)}</div>` : ''}
                    
                    ${link.img ? `<div style="text-align:center; margin-bottom:24px;"><img src="${_dtnsEscapeHTML(link.img)}" style="max-width:100%; max-height:420px; border-radius:16px; border:1px solid #e2e8f0; box-shadow:0 8px 24px rgba(0,0,0,0.06);"></div>` : ''}

                    <div style="white-space:pre-wrap; font-family:inherit;">${link.guideContent ? link.guideContent : '<p style="color:#94a3b8; font-style:italic; text-align:center;">Chưa có nội dung hướng dẫn chi tiết cho quy trình này.</p>'}</div>
                </div>

                <div style="padding:16px 28px; background:#f8fafc; border-top:1.5px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        ${_dtnsHasValidUrl(link.url) ? `<a href="${_dtnsEscapeHTML(link.url)}" target="_blank" style="display:inline-flex; align-items:center; gap:8px; background:#4f46e5; color:#ffffff; text-decoration:none; padding:10px 20px; border-radius:12px; font-weight:800; font-size:13.5px; box-shadow:0 4px 12px rgba(79,70,229,0.3);">🔗 Mở Link Tài Liệu</a>` : ''}
                    </div>
                    <button onclick="document.getElementById('dtnsGuideViewModal').style.display='none'" style="padding:10px 22px; border-radius:12px; font-weight:800; background:#e2e8f0; color:#475569; border:none; cursor:pointer;">Đóng</button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    };

    // Card Pin & Delete Actions
    window._dtnsTogglePinLink = function(subId, linkId) {
        let links = _dtnsGetCustomSubtabLinks(subId);
        const idx = links.findIndex(x => x.id === linkId);
        if (idx !== -1) {
            links[idx].isPinned = !links[idx].isPinned;
            _dtnsSaveCustomSubtabLinks(subId, links);
            _dtnsRenderCurrentMainTab();
            _dtnsShowToast(links[idx].isPinned ? '📌 Đã ghim vào Mục Quan Trọng!' : '📍 Đã bỏ ghim khỏi Mục Quan Trọng!');
        }
    };

    window._dtnsDeleteLink = function(subId, linkId) {
        if (!confirm('Bạn có chắc chắn muốn xóa tài liệu đào tạo này không?')) return;
        let links = _dtnsGetCustomSubtabLinks(subId);
        links = links.filter(x => x.id !== linkId);
        _dtnsSaveCustomSubtabLinks(subId, links);
        _dtnsRenderCurrentMainTab();
        _dtnsShowToast('🗑️ Đã xóa đường link tài liệu!');
    };

    // Render Main Tabs & Page Interface
    window._dtnsSelectMainTab = function(tabKey) {
        currentMainTab = tabKey;
        localStorage.setItem('dtns_main_tab', tabKey);
        _dtnsRenderCurrentMainTab();
    };

    window._dtnsSelectSubTab = function(subId) {
        if (currentMainTab === 'muc1_xuong') {
            currentSubTab1 = subId;
            localStorage.setItem('dtns_sub_tab1', subId);
        } else {
            currentSubTab2 = subId;
            localStorage.setItem('dtns_sub_tab2', subId);
        }
        _dtnsRenderCurrentMainTab();
    };

    let searchFilterQuery = '';
    window._dtnsOnSearchInput = function(val) {
        searchFilterQuery = (val || '').toLowerCase().trim();
        _dtnsRenderCurrentMainTab();
    };

    function _dtnsRenderCurrentMainTab() {
        const container = document.getElementById('dtnsMainContainer');
        if (!container) return;

        const scope = currentMainTab;
        const subtabs = _dtnsGetSubtabs(scope);

        let activeSubId = scope === 'muc1_xuong' ? currentSubTab1 : currentSubTab2;
        if (!subtabs.some(s => s.id === activeSubId)) {
            activeSubId = subtabs[0]?.id || 'dt_quanlyxuong';
        }

        const categories = _dtnsGetCategories(scope);
        const activeCat = activeCatFilter[scope] || 'all';

        // Fetch links for active subtab
        const allLinksInSub = _dtnsGetCustomSubtabLinks(activeSubId);

        // Filter by Category and Search Query
        let filteredLinks = allLinksInSub.filter(link => {
            if (activeCat !== 'all') {
                const cats = _dtnsGetLinkCategories(link);
                if (!cats.includes(activeCat)) return false;
            }
            if (searchFilterQuery) {
                const titleMatch = (link.title || '').toLowerCase().includes(searchFilterQuery);
                const descMatch = (link.desc || '').toLowerCase().includes(searchFilterQuery);
                const guideMatch = (link.guideContent || '').toLowerCase().includes(searchFilterQuery);
                if (!titleMatch && !descMatch && !guideMatch) return false;
            }
            return true;
        });

        const pinnedLinks = filteredLinks.filter(l => l.isPinned);
        const normalLinks = filteredLinks.filter(l => !l.isPinned);

        const canManage = _dtnsCanManage();

        container.innerHTML = `
            <div class="dtns-wrapper">
                <!-- Header Banner -->
                <div style="
                    background: linear-gradient(135deg, #3b0764 0%, #5b21b6 50%, #6d28d9 100%);
                    border-radius: 24px;
                    padding: 28px 32px;
                    color: #ffffff;
                    box-shadow: 0 14px 35px rgba(91, 33, 182, 0.25);
                    margin-bottom: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 16px;
                ">
                    <div style="display: flex; align-items: center; gap: 20px;">
                        <div style="
                            width: 68px;
                            height: 68px;
                            background: rgba(255, 255, 255, 0.18);
                            backdrop-filter: blur(10px);
                            border-radius: 18px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 34px;
                            border: 1px solid rgba(255, 255, 255, 0.3);
                        ">
                            🎓
                        </div>
                        <div>
                            <h1 style="margin: 0; font-size: 25px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">
                                ĐÀO TẠO NHÂN SỰ CÁC CẤP
                            </h1>
                            <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.92; font-weight: 600;">
                                Hệ Thống Quản Lý Quy Trình Đào Tạo Nhân Sự Nội Bộ & Các Cấp — Đồng Phục HV
                            </p>
                        </div>
                    </div>

                    <div style="
                        background: rgba(255, 255, 255, 0.18);
                        backdrop-filter: blur(10px);
                        padding: 8px 18px;
                        border-radius: 14px;
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        font-size: 13px;
                        font-weight: 700;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        <span style="width: 10px; height: 10px; background: #22c55e; border-radius: 50%; display: inline-block;"></span>
                        Hệ Thống Hoạt Động
                    </div>
                </div>

                <!-- Top Main Section Cards (Mục 1 & Mục 2) -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; margin-bottom: 24px;">
                    <!-- MỤC 1: BỘ PHẬN XƯỞNG -->
                    <div onclick="window._dtnsSelectMainTab('muc1_xuong')" style="
                        background: ${currentMainTab === 'muc1_xuong' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#ffffff'};
                        color: ${currentMainTab === 'muc1_xuong' ? '#ffffff' : '#1e293b'};
                        border-radius: 20px;
                        padding: 22px 26px;
                        cursor: pointer;
                        border: ${currentMainTab === 'muc1_xuong' ? 'none' : '1.5px solid #e2e8f0'};
                        box-shadow: ${currentMainTab === 'muc1_xuong' ? '0 10px 25px -5px rgba(79, 70, 229, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.03)'};
                        transition: all 0.25s ease;
                        display: flex;
                        align-items: center;
                        gap: 16px;
                    ">
                        <div style="
                            width: 52px;
                            height: 52px;
                            background: ${currentMainTab === 'muc1_xuong' ? 'rgba(255,255,255,0.2)' : '#e0e7ff'};
                            border-radius: 14px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 26px;
                            flex-shrink: 0;
                        ">
                            🏭
                        </div>
                        <div>
                            <span style="
                                font-size: 11px;
                                font-weight: 800;
                                text-transform: uppercase;
                                letter-spacing: 0.5px;
                                opacity: 0.9;
                                display: inline-block;
                                background: ${currentMainTab === 'muc1_xuong' ? 'rgba(255,255,255,0.2)' : '#f1f5f9'};
                                padding: 3px 10px;
                                border-radius: 8px;
                                margin-bottom: 4px;
                            ">MỤC 1</span>
                            <h3 style="margin: 0; font-size: 17.5px; font-weight: 900;">BỘ PHẬN XƯỞNG</h3>
                        </div>
                    </div>

                    <!-- MỤC 2: BỘ PHẬN VĂN PHÒNG -->
                    <div onclick="window._dtnsSelectMainTab('muc2_vanphong')" style="
                        background: ${currentMainTab === 'muc2_vanphong' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#ffffff'};
                        color: ${currentMainTab === 'muc2_vanphong' ? '#ffffff' : '#1e293b'};
                        border-radius: 20px;
                        padding: 22px 26px;
                        cursor: pointer;
                        border: ${currentMainTab === 'muc2_vanphong' ? 'none' : '1.5px solid #e2e8f0'};
                        box-shadow: ${currentMainTab === 'muc2_vanphong' ? '0 10px 25px -5px rgba(79, 70, 229, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.03)'};
                        transition: all 0.25s ease;
                        display: flex;
                        align-items: center;
                        gap: 16px;
                    ">
                        <div style="
                            width: 52px;
                            height: 52px;
                            background: ${currentMainTab === 'muc2_vanphong' ? 'rgba(255,255,255,0.2)' : '#e0e7ff'};
                            border-radius: 14px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 26px;
                            flex-shrink: 0;
                        ">
                            🏢
                        </div>
                        <div>
                            <span style="
                                font-size: 11px;
                                font-weight: 800;
                                text-transform: uppercase;
                                letter-spacing: 0.5px;
                                opacity: 0.9;
                                display: inline-block;
                                background: ${currentMainTab === 'muc2_vanphong' ? 'rgba(255,255,255,0.2)' : '#f1f5f9'};
                                padding: 3px 10px;
                                border-radius: 8px;
                                margin-bottom: 4px;
                            ">MỤC 2</span>
                            <h3 style="margin: 0; font-size: 17.5px; font-weight: 900;">BỘ PHẬN VĂN PHÒNG</h3>
                        </div>
                    </div>
                </div>

                <!-- Sub-tabs Navigation Bar -->
                <div style="
                    background: #ffffff;
                    border-radius: 18px;
                    padding: 12px;
                    border: 1.5px solid #e2e8f0;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    overflow-x: auto;
                ">
                    ${subtabs.map(st => `
                        <button onclick="window._dtnsSelectSubTab('${st.id}')" style="
                            background: ${activeSubId === st.id ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#f8fafc'};
                            color: ${activeSubId === st.id ? '#ffffff' : '#334155'};
                            border: ${activeSubId === st.id ? 'none' : '1px solid #e2e8f0'};
                            border-radius: 14px;
                            padding: 12px 22px;
                            font-size: 14px;
                            font-weight: 800;
                            cursor: pointer;
                            white-space: nowrap;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            box-shadow: ${activeSubId === st.id ? '0 4px 14px rgba(79, 70, 229, 0.3)' : 'none'};
                            transition: all 0.2s ease;
                        ">
                            <span style="font-size: 18px;">${st.icon || '📁'}</span>
                            ${_dtnsEscapeHTML(st.title)}
                        </button>
                    `).join('')}
                </div>

                <!-- Search Bar & Action Buttons -->
                <div style="
                    background: #ffffff;
                    border-radius: 18px;
                    padding: 16px 20px;
                    border: 1.5px solid #e2e8f0;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 14px;
                ">
                    <!-- Search Bar -->
                    <div style="position: relative; flex: 1; min-width: 280px;">
                        <span style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); font-size: 18px; color: #64748b;">🔍</span>
                        <input type="text" placeholder="Nhập tên quy trình, cẩm nang đào tạo nhân sự, từ khóa hoặc tiêu đề cần tìm kiếm..." value="${_dtnsEscapeHTML(searchFilterQuery)}" oninput="window._dtnsOnSearchInput(this.value)" style="
                            width: 100%;
                            padding: 12px 16px 12px 46px;
                            border-radius: 14px;
                            border: 1.5px solid #cbd5e1;
                            font-size: 14px;
                            font-weight: 600;
                            color: #0f172a;
                            outline: none;
                            background: #f8fafc;
                        ">
                    </div>

                    <!-- Action Buttons -->
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${canManage ? `
                            <button onclick="window._dtnsOpenLinkModal(null, '${activeSubId}')" style="
                                background: linear-gradient(135deg, #6366f1, #7c3aed);
                                color: #ffffff;
                                border: none;
                                border-radius: 14px;
                                padding: 12px 22px;
                                font-size: 14px;
                                font-weight: 900;
                                cursor: pointer;
                                box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
                                display: flex;
                                align-items: center;
                                gap: 8px;
                            ">
                                ➕ Tạo Đường Link Mới
                            </button>
                            <button onclick="window._dtnsOpenManageSubtabModal('${scope}')" style="
                                background: #ffffff;
                                color: #4338ca;
                                border: 1.5px solid #c7d2fe;
                                border-radius: 14px;
                                padding: 12px 18px;
                                font-size: 13.5px;
                                font-weight: 800;
                                cursor: pointer;
                            ">
                                ⚙️ Cài Đặt Mục
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Category Filters (Bộ Phận / Chức Vụ) Bar -->
                <div style="
                    background: #ffffff;
                    border-radius: 18px;
                    padding: 14px 20px;
                    border: 1.5px solid #e2e8f0;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
                    margin-bottom: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 12px;
                ">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <span style="font-size: 13.5px; font-weight: 900; color: #475569; margin-right: 4px;">🏢 Bộ Phận:</span>
                        <button onclick="window._dtnsSelectCatFilter('${scope}', 'all')" style="
                            background: ${activeCat === 'all' ? '#4f46e5' : '#f1f5f9'};
                            color: ${activeCat === 'all' ? '#ffffff' : '#475569'};
                            border: none;
                            border-radius: 12px;
                            padding: 8px 16px;
                            font-size: 13px;
                            font-weight: 800;
                            cursor: pointer;
                        ">
                            Tất Cả Bộ Phận (${allLinksInSub.length})
                        </button>

                        ${categories.map(cat => {
                            const count = allLinksInSub.filter(l => _dtnsGetLinkCategories(l).includes(cat)).length;
                            return `
                                <button onclick="window._dtnsSelectCatFilter('${scope}', '${_dtnsEscapeHTML(cat)}')" style="
                                    background: ${activeCat === cat ? '#4f46e5' : '#ffffff'};
                                    color: ${activeCat === cat ? '#ffffff' : '#334155'};
                                    border: ${activeCat === cat ? 'none' : '1.5px solid #cbd5e1'};
                                    border-radius: 12px;
                                    padding: 8px 16px;
                                    font-size: 13px;
                                    font-weight: 800;
                                    cursor: pointer;
                                ">
                                    📌 ${_dtnsEscapeHTML(cat)} (${count})
                                </button>
                            `;
                        }).join('')}
                    </div>

                    ${canManage ? `
                        <button onclick="window._dtnsOpenManageCatModal('${scope}')" style="
                            background: #f8fafc;
                            color: #4f46e5;
                            border: 1.5px solid #c7d2fe;
                            border-radius: 12px;
                            padding: 8px 16px;
                            font-size: 13px;
                            font-weight: 800;
                            cursor: pointer;
                            white-space: nowrap;
                        ">
                            ⚙️ Cài Đặt Bộ Phận
                        </button>
                    ` : ''}
                </div>

                <!-- PINNED / IMPORTANT SECTION -->
                ${pinnedLinks.length > 0 ? `
                    <div style="
                        background: #fff1f2;
                        border: 1.5px solid #fecdd3;
                        border-radius: 20px;
                        padding: 20px 24px;
                        margin-bottom: 28px;
                    ">
                        <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 900; color: #e11d48; display: flex; align-items: center; gap: 8px;">
                            📌 MỤC QUAN TRỌNG (${pinnedLinks.length})
                        </h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px;">
                            ${pinnedLinks.map(link => _dtnsRenderLinkCard(link, activeSubId, canManage)).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- STANDARD LINKS GRID -->
                <div>
                    ${normalLinks.length > 0 ? `
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px;">
                            ${normalLinks.map(link => _dtnsRenderLinkCard(link, activeSubId, canManage)).join('')}
                        </div>
                    ` : (pinnedLinks.length === 0 ? `
                        <div style="
                            background: #ffffff;
                            border-radius: 20px;
                            border: 2px dashed #cbd5e1;
                            padding: 60px 24px;
                            text-align: center;
                            color: #64748b;
                        ">
                            <div style="font-size: 48px; margin-bottom: 14px;">🎓</div>
                            <h3 style="font-size: 18px; color: #0f172a; font-weight: 850; margin: 0 0 8px 0;">Chưa có tài liệu đào tạo nào</h3>
                            <p style="font-size: 14px; margin: 0;">Nhấn <strong>➕ Tạo Đường Link Mới</strong> để bắt đầu tạo tài liệu đào tạo cho bộ phận này.</p>
                        </div>
                    ` : '')}
                </div>
            </div>
            ${_dtnsGetStyles()}
        `;
    }

    function _dtnsGetStyles() {
        return `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Comfortaa:wght@500;600;700&display=swap');

                .dtns-wrapper, .dtns-wrapper button, .dtns-wrapper input, .dtns-wrapper select, .dtns-wrapper textarea, .dtns-wrapper div, .dtns-wrapper span, .dtns-wrapper h1, .dtns-wrapper h2, .dtns-wrapper h3, .dtns-wrapper h4, .dtns-wrapper p, .dtns-wrapper a,
                .dtns-modal-overlay, .dtns-modal-overlay button, .dtns-modal-overlay input, .dtns-modal-overlay select, .dtns-modal-overlay textarea, .dtns-modal-overlay div, .dtns-modal-overlay span, .dtns-modal-overlay h1, .dtns-modal-overlay h2, .dtns-modal-overlay h3, .dtns-modal-overlay h4, .dtns-modal-overlay p, .dtns-modal-overlay a {
                    font-family: 'Nunito', 'Comfortaa', system-ui, -apple-system, sans-serif !important;
                }
                .dtns-wrapper {
                    padding: 24px;
                    background: #f8fafc;
                    min-height: 100vh;
                    width: 100%;
                    box-sizing: border-box;
                }
                .dtns-link-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 16px 32px rgba(79, 70, 229, 0.12) !important;
                    border-color: #818cf8 !important;
                }
                @media (max-width: 768px) {
                    .dtns-wrapper {
                        padding: 14px;
                    }
                }
            </style>
        `;
    }

    function _dtnsRenderLinkCard(link, subId, canManage) {
        const categories = _dtnsGetLinkCategories(link);
        const hasUrl = _dtnsHasValidUrl(link.url);
        const hasGuide = !!(link.guideContent && link.guideContent.trim());
        const isImportant = link.isPinned;

        return `
            <div class="dtns-link-card" style="
                background: #ffffff;
                border-radius: 20px;
                padding: 22px;
                border: ${isImportant ? '1.5px solid #ef4444' : '1.5px solid #e2e8f0'};
                box-shadow: ${isImportant ? '0 8px 24px rgba(239, 68, 68, 0.12)' : '0 4px 16px rgba(0, 0, 0, 0.03)'};
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                position: relative;
                transition: all 0.25s ease;
            ">
                <div>
                    <!-- Category Badges -->
                    <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;">
                        ${isImportant ? `<span style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; padding: 3px 10px; border-radius: 8px; font-size: 11.5px; font-weight: 900;">📌 Quan Trọng</span>` : ''}
                        ${categories.map(c => `<span style="background: #f1f5f9; color: #475569; padding: 3px 10px; border-radius: 8px; font-size: 11.5px; font-weight: 800;">📌 ${_dtnsEscapeHTML(c)}</span>`).join('')}
                    </div>

                    <!-- Title & Icon -->
                    <div style="display: flex; align-items: flex-start; gap: 14px; margin-bottom: 12px;">
                        <div style="
                            width: 44px;
                            height: 44px;
                            background: #f0fdf4;
                            border-radius: 12px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 22px;
                            flex-shrink: 0;
                            border: 1px solid #bbf7d0;
                        ">
                            ${link.icon || '🎓'}
                        </div>
                        <h4 style="margin: 0; font-size: 16px; font-weight: 900; color: #0f172a; line-height: 1.4;">
                            ${_dtnsEscapeHTML(link.title)}
                        </h4>
                    </div>

                    <!-- Description -->
                    ${link.desc ? `
                        <p style="font-size: 13.5px; color: #475569; margin: 0 0 16px 0; line-height: 1.5; white-space: pre-line;">
                            ${_dtnsEscapeHTML(link.desc)}
                        </p>
                    ` : ''}

                    <!-- Image Preview if available -->
                    ${link.img ? `
                        <div style="margin-bottom: 16px; overflow: hidden; border-radius: 14px; border: 1px solid #e2e8f0;">
                            <img src="${_dtnsEscapeHTML(link.img)}" style="width: 100%; height: 160px; object-fit: cover;">
                        </div>
                    ` : ''}
                </div>

                <!-- Footer Buttons -->
                <div style="border-top: 1.5px solid #f1f5f9; padding-top: 14px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        ${hasUrl ? `
                            <a href="${_dtnsEscapeHTML(link.url)}" target="_blank" style="
                                background: linear-gradient(135deg, #4f46e5, #6366f1);
                                color: #ffffff;
                                text-decoration: none;
                                padding: 8px 16px;
                                border-radius: 10px;
                                font-size: 12.5px;
                                font-weight: 800;
                                display: inline-flex;
                                align-items: center;
                                gap: 6px;
                                box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
                            ">
                                📖 Xem Chi Tiết
                            </a>
                        ` : ''}

                        ${hasGuide ? `
                            <button onclick="window._dtnsViewGuideModal('${subId}', '${link.id}')" style="
                                background: #f3e8ff;
                                color: #6d28d9;
                                border: 1px solid #d8b4fe;
                                padding: 8px 14px;
                                border-radius: 10px;
                                font-size: 12.5px;
                                font-weight: 800;
                                cursor: pointer;
                                display: inline-flex;
                                align-items: center;
                                gap: 6px;
                            ">
                                📋 Xem Quy Trình
                            </button>
                        ` : ''}
                    </div>

                    ${canManage ? `
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <button onclick="window._dtnsTogglePinLink('${subId}', '${link.id}')" title="${isImportant ? 'Bỏ ghim' : 'Ghim quan trọng'}" style="background: none; border: none; font-size: 16px; cursor: pointer; padding: 6px;">
                                ${isImportant ? '📍' : '📌'}
                            </button>
                            <button onclick="window._dtnsOpenLinkModal('${link.id}', '${subId}')" title="Sửa" style="background: none; border: none; font-size: 16px; cursor: pointer; padding: 6px;">
                                ✏️
                            </button>
                            <button onclick="window._dtnsDeleteLink('${subId}', '${link.id}')" title="Xóa" style="background: none; border: none; font-size: 16px; cursor: pointer; padding: 6px;">
                                🗑️
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Main Page Entry Point
    window.renderDaotaonhansucaccapPage = function(container) {
        if (!container) return;
        container.innerHTML = `<div id="dtnsMainContainer"></div>`;
        _dtnsRenderCurrentMainTab();
        _dtnsSyncLoadFromServer();
    };
})();
