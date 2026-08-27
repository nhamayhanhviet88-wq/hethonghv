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

        // Check explicit permissions system if configured by Giám Đốc in Phân Quyền
        if (typeof window.canDo === 'function' && role !== 'giam_doc') {
            const hasPerm = window.canDo('quan_tri_nhan_su', 'create') || window.canDo('quan_tri_nhan_su', 'edit') || window.canDo('quan_tri_nhan_su', 'delete');
            if (hasPerm) return true;
        }

        // Strict rule: Only Giám Đốc, Quản Lý Cấp Cao, or Lê Việt Trinh can manage.
        // All other staff (quản lý, trưởng phòng, nhân viên, v.v.) are View-Only!
        return role === 'giam_doc' || role === 'quan_ly_cap_cao' || isLeVietTrinh;
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

    // Category & Subtab Management State
    let activeCatFilter = { muc1_tuyendung: 'all', muc2_daotao: 'all', muc3_chedo: 'all' };

    function _qtnsGetLinkCategories(link) {
        if (!link) return ['Chung'];
        if (Array.isArray(link.categories) && link.categories.length > 0) return link.categories;
        if (link.category) return [link.category];
        return ['Chung'];
    }

    function _qtnsSaveSubtabs(scope, subtabs) {
        localStorage.setItem('qtns_subtabs_' + scope, JSON.stringify(subtabs));
        _qtnsSyncSaveToServer();
    }

    function _qtnsSaveCategories(scope, cats) {
        localStorage.setItem('qtns_categories_' + scope, JSON.stringify(cats));
        _qtnsSyncSaveToServer();
    }

    window._qtnsSelectCatFilter = function(scope, cat) {
        activeCatFilter[scope] = cat;
        _qtnsRenderCurrentMainTab();
    };

    // Category Modal Handlers (Match Image 5)
    let editingCatIndex = -1;

    window._qtnsOpenManageCatModal = function(scope = null) {
        if (!_qtnsCanManage()) {
            alert('Chỉ Giám Đốc và Quản Lý mới có quyền cài đặt lĩnh vực!');
            return;
        }
        if (!scope) scope = currentMainTab;

        const modal = _qtnsEnsureCategoryModalInDOM();
        let scopeTitle = 'MỤC 1: QUY TRÌNH HÀNH CHÍNH & TUYỂN DỤNG';
        if (scope === 'muc2_daotao') scopeTitle = 'MỤC 2: ĐÀO TẠO & PHÁT TRIỂN NHÂN SỰ';
        else if (scope === 'muc3_chedo') scopeTitle = 'MỤC 3: CHẾ ĐỘ, LƯƠNG THƯỞNG & ĐÁNH GIÁ';

        document.getElementById('qtnsCatModalTitle').innerText = `⚙️ CÀI ĐẶT LĨNH VỰC (${scopeTitle})`;
        document.getElementById('qtnsCatFormScope').value = scope;
        document.getElementById('qtnsCatFormName').value = '';
        editingCatIndex = -1;

        _qtnsRenderCatListInModal(scope);
        modal.style.display = 'flex';
    };

    window._qtnsCloseCatModal = function() {
        editingCatIndex = -1;
        const modal = document.getElementById('qtnsCategoryModal');
        if (modal) modal.style.display = 'none';
    };

    function _qtnsRenderCatListInModal(scope) {
        const container = document.getElementById('qtnsCatListContainer');
        if (!container) return;

        const cats = _qtnsGetCategories(scope);
        if (cats.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:16px; color:#94a3b8; font-weight:600;">Chưa có lĩnh vực nào</div>`;
            return;
        }

        container.innerHTML = cats.map((cat, idx) => {
            if (editingCatIndex === idx) {
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#fffbeb; padding:10px 14px; border-radius:14px; border:2px solid #f59e0b; box-shadow:0 4px 12px rgba(245, 158, 11, 0.15); gap:10px;">
                        <div style="display:flex; align-items:center; gap:8px; flex:1;">
                            <span style="font-size:16px;">📌</span>
                            <input type="text" id="qtnsEditCatInput_${idx}" value="${cat.replace(/"/g, '&quot;')}" style="flex:1; padding:8px 12px; border-radius:10px; border:1.5px solid #f59e0b; font-size:14px; font-weight:800; color:#0f172a; outline:none; background:#ffffff;" onkeypress="if(event.key==='Enter') window._qtnsSaveCategoryEditFromModal('${scope}', ${idx})">
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button onclick="window._qtnsSaveCategoryEditFromModal('${scope}', ${idx})" title="Lưu tên mới" style="background:#22c55e; color:#ffffff; border:none; border-radius:10px; padding:7px 14px; font-size:12.5px; font-weight:900; cursor:pointer; box-shadow:0 2px 6px rgba(34, 197, 94, 0.3);">💾 Lưu</button>
                            <button onclick="window._qtnsCancelCategoryEditFromModal('${scope}')" title="Hủy bỏ" style="background:#e2e8f0; color:#475569; border:none; border-radius:10px; padding:7px 12px; font-size:12.5px; font-weight:800; cursor:pointer;">✕ Hủy</button>
                        </div>
                    </div>
                `;
            }

            return `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; padding:12px 16px; border-radius:14px; border:1.5px solid #e2e8f0; box-shadow:0 2px 8px rgba(0,0,0,0.02); transition:all 0.2s ease;" onmouseover="this.style.borderColor='#c084fc'; this.style.boxShadow='0 4px 12px rgba(109,40,217,0.08)'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.02)'">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:32px; height:32px; background:#f3e8ff; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:15px; color:#6d28d9; border:1px solid #e9d5ff; flex-shrink:0;">📌</div>
                        <span style="font-size:14.5px; font-weight:800; color:#0f172a;">${cat}</span>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button onclick="window._qtnsStartCategoryEditFromModal('${scope}', ${idx})" title="Chỉnh sửa tên lĩnh vực" style="background:#fef3c7; color:#d97706; border:1px solid #fde047; border-radius:10px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer; transition:all 0.15s ease;" onmouseover="this.style.background='#fde047'" onmouseout="this.style.background='#fef3c7'">✏️ Sửa Tên</button>
                        <button onclick="window._qtnsDeleteCategoryFromModal('${scope}', ${idx})" title="Xóa lĩnh vực" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; border-radius:10px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer; transition:all 0.15s ease;" onmouseover="this.style.background='#fca5a5'" onmouseout="this.style.background='#fee2e2'">🗑️ Xóa</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window._qtnsAddCategoryFromModal = function() {
        const input = document.getElementById('qtnsCatFormName');
        const scope = document.getElementById('qtnsCatFormScope')?.value || currentMainTab;
        if (!input) return;
        const name = input.value.trim();
        if (!name) {
            alert('Vui lòng nhập tên lĩnh vực mới!');
            return;
        }

        let cats = _qtnsGetCategories(scope);
        if (cats.includes(name)) {
            alert('Lĩnh vực này đã tồn tại!');
            return;
        }

        cats.push(name);
        _qtnsSaveCategories(scope, cats);
        input.value = '';
        _qtnsRenderCatListInModal(scope);
        _qtnsRenderCurrentMainTab();
        _qtnsShowToast(`✅ Đã thêm lĩnh vực mới "${name}"!`);
    };

    window._qtnsStartCategoryEditFromModal = function(scope, index) {
        editingCatIndex = index;
        _qtnsRenderCatListInModal(scope);
        setTimeout(() => {
            const input = document.getElementById(`qtnsEditCatInput_${index}`);
            if (input) { input.focus(); input.select(); }
        }, 50);
    };

    window._qtnsCancelCategoryEditFromModal = function(scope) {
        editingCatIndex = -1;
        _qtnsRenderCatListInModal(scope);
    };

    window._qtnsSaveCategoryEditFromModal = function(scope, index) {
        const input = document.getElementById(`qtnsEditCatInput_${index}`);
        if (!input) return;
        const newName = input.value.trim();
        let cats = _qtnsGetCategories(scope);
        const oldName = cats[index];

        if (!newName) {
            alert('Vui lòng nhập tên lĩnh vực hợp lệ!');
            return;
        }

        if (newName !== oldName && cats.includes(newName)) {
            alert('Tên lĩnh vực này đã tồn tại!');
            return;
        }

        cats[index] = newName;
        _qtnsSaveCategories(scope, cats);

        if (activeCatFilter[scope] === oldName) {
            activeCatFilter[scope] = newName;
        }

        editingCatIndex = -1;
        _qtnsRenderCatListInModal(scope);
        _qtnsRenderCurrentMainTab();
        _qtnsShowToast('💾 Đã cập nhật tên lĩnh vực!');
    };

    window._qtnsDeleteCategoryFromModal = function(scope, index) {
        let cats = _qtnsGetCategories(scope);
        const catName = cats[index];
        if (!catName) return;

        if (!confirm(`Bạn có chắc muốn xóa lĩnh vực "${catName}" không?`)) return;

        cats = cats.filter((_, i) => i !== index);
        _qtnsSaveCategories(scope, cats);

        if (activeCatFilter[scope] === catName) {
            activeCatFilter[scope] = 'all';
        }

        _qtnsRenderCatListInModal(scope);
        _qtnsRenderCurrentMainTab();
        _qtnsShowToast(`🗑️ Đã xóa lĩnh vực "${catName}"!`);
    };

    function _qtnsEnsureCategoryModalInDOM() {
        let modal = document.getElementById('qtnsCategoryModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'qtns-modal-overlay';
            modal.id = 'qtnsCategoryModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:99999; align-items:center; justify-content:center; padding:20px;';
            modal.innerHTML = `
                <div class="qtns-modal-card" style="max-height:88vh; display:flex; flex-direction:column; width:100%; max-width:600px; border-radius:24px; overflow:hidden; background:#ffffff; box-shadow:0 25px 50px -12px rgba(109,40,217,0.35);">
                    <div style="flex-shrink:0; padding:18px 24px; background:linear-gradient(135deg, #4c1d95, #6d28d9); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                        <h3 id="qtnsCatModalTitle" style="margin:0; font-size:17.5px; font-weight:900;">⚙️ CÀI ĐẶT LĨNH VỰC</h3>
                        <button onclick="window._qtnsCloseCatModal()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:30px; height:30px; border-radius:50%; cursor:pointer; font-size:16px; font-weight:bold;">✕</button>
                    </div>

                    <div style="flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:16px; background:#fcfafc;">
                        <input type="hidden" id="qtnsCatFormScope" value="">
                        
                        <!-- Form Add New Category -->
                        <div style="background:#ffffff; border:1.5px solid #e9d5ff; border-radius:18px; padding:16px; box-shadow:0 4px 14px rgba(109,40,217,0.05);">
                            <label style="font-size:13.5px; font-weight:900; color:#5b21b6; display:block; margin-bottom:8px;">➕ Tạo Lĩnh Vực Mới:</label>
                            <div style="display:flex; gap:10px;">
                                <input type="text" id="qtnsCatFormName" placeholder="Nhập tên lĩnh vực mới (ví dụ: Quy Trình Giao Việc, Tuyển Dụng...)" style="flex:1; border:2px solid #e9d5ff; border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:700; color:#0f172a; outline:none;" onkeypress="if(event.key==='Enter') window._qtnsAddCategoryFromModal()">
                                <button onclick="window._qtnsAddCategoryFromModal()" style="background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; border:none; border-radius:12px; padding:10px 18px; font-size:13.5px; font-weight:900; cursor:pointer; box-shadow:0 4px 12px rgba(109,40,217,0.3); white-space:nowrap;">➕ Thêm Mới</button>
                            </div>
                        </div>

                        <!-- Current Categories List -->
                        <div>
                            <div style="font-size:13.5px; font-weight:900; color:#334155; margin-bottom:10px;">📌 Danh Sách Lĩnh Vực Hiện Tại:</div>
                            <div id="qtnsCatListContainer" style="display:flex; flex-direction:column; gap:10px;"></div>
                        </div>
                    </div>

                    <div style="flex-shrink:0; padding:14px 24px; background:#ffffff; border-top:1.5px solid #e2e8f0; display:flex; justify-content:flex-end;">
                        <button onclick="window._qtnsCloseCatModal()" style="padding:10px 22px; border-radius:12px; font-weight:900; background:#f1f5f9; color:#475569; border:none; cursor:pointer;">Đóng</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    }

    // Modal Subtab Manager
    let currentSubtabScope = 'muc1_tuyendung';
    let editingSubtabId = null;

    window._qtnsOpenManageSubtabModal = function(scope = null) {
        if (!_qtnsCanManage()) {
            alert('Chỉ Giám Đốc và Quản Lý mới có quyền cài đặt mục!');
            return;
        }
        if (!scope) scope = currentMainTab;
        currentSubtabScope = scope;
        editingSubtabId = null;

        const modal = _qtnsEnsureSubtabModalInDOM();
        const titleInput = document.getElementById('qtnsSubtabFormTitle');
        if (titleInput) titleInput.value = '';

        let scopeTitle = 'MỤC 1: QUY TRÌNH HÀNH CHÍNH & TUYỂN DỤNG';
        if (scope === 'muc2_daotao') scopeTitle = 'MỤC 2: ĐÀO TẠO & PHÁT TRIỂN NHÂN SỰ';
        else if (scope === 'muc3_chedo') scopeTitle = 'MỤC 3: CHẾ ĐỘ, LƯƠNG THƯỞNG & ĐÁNH GIÁ';

        const titleEl = document.getElementById('qtnsSubtabModalTitle');
        if (titleEl) titleEl.innerText = `⚙️ CÀI ĐẶT MỤC (${scopeTitle})`;

        _qtnsRenderSubtabListInModal();
        modal.style.display = 'flex';
    };

    window._qtnsCloseSubtabModal = function() {
        const modal = document.getElementById('qtnsSubtabModal');
        if (modal) modal.style.display = 'none';
    };

    function _qtnsRenderSubtabListInModal() {
        const container = document.getElementById('qtnsSubtabListContainer');
        if (!container) return;

        const subtabs = _qtnsGetSubtabs(currentSubtabScope);
        container.innerHTML = subtabs.map(st => {
            if (editingSubtabId === st.id) {
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#fffbeb; padding:10px 14px; border-radius:14px; border:2px solid #f59e0b; gap:10px;">
                        <div style="display:flex; align-items:center; gap:8px; flex:1;">
                            <input type="text" id="qtnsEditSubtabTitle_${st.id}" value="${st.title.replace(/"/g, '&quot;')}" style="flex:1; padding:8px 12px; border-radius:10px; border:1.5px solid #f59e0b; font-size:14px; font-weight:800; color:#0f172a; outline:none; background:#ffffff;">
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button onclick="window._qtnsSaveSubtabEdit('${st.id}')" style="background:#22c55e; color:#ffffff; border:none; border-radius:10px; padding:7px 14px; font-size:12.5px; font-weight:900; cursor:pointer;">💾 Lưu</button>
                            <button onclick="window._qtnsCancelSubtabEdit()" style="background:#e2e8f0; color:#475569; border:none; border-radius:10px; padding:7px 12px; font-size:12.5px; font-weight:800; cursor:pointer;">✕ Hủy</button>
                        </div>
                    </div>
                `;
            }

            return `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; padding:12px 16px; border-radius:14px; border:1.5px solid #e2e8f0;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:18px;">${st.icon || '📌'}</span>
                        <span style="font-size:14.5px; font-weight:800; color:#0f172a;">${st.title}</span>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button onclick="window._qtnsStartSubtabEdit('${st.id}')" style="background:#fef3c7; color:#d97706; border:1px solid #fde047; border-radius:10px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer;">✏️ Sửa Tên</button>
                        <button onclick="window._qtnsDeleteSubtabFromModal('${st.id}')" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; border-radius:10px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer;">🗑️ Xóa</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window._qtnsAddSubtabFromModal = function() {
        const titleInput = document.getElementById('qtnsSubtabFormTitle');
        if (!titleInput) return;
        const title = titleInput.value.trim();
        if (!title) {
            alert('Vui lòng nhập tên mục mới!');
            return;
        }

        const subtabs = _qtnsGetSubtabs(currentSubtabScope);
        const newId = 'qtns_sub_' + Date.now();
        subtabs.push({ id: newId, title: title, icon: '📋', isCustom: true });

        _qtnsSaveSubtabs(currentSubtabScope, subtabs);
        titleInput.value = '';
        _qtnsRenderSubtabListInModal();
        _qtnsRenderCurrentMainTab();
        _qtnsShowToast(`✅ Đã tạo mục mới "${title}"!`);
    };

    window._qtnsStartSubtabEdit = function(subId) {
        editingSubtabId = subId;
        _qtnsRenderSubtabListInModal();
    };

    window._qtnsSaveSubtabEdit = function(subId) {
        const titleInput = document.getElementById('qtnsEditSubtabTitle_' + subId);
        if (!titleInput) return;
        const newTitle = titleInput.value.trim();
        if (!newTitle) {
            alert('Tên mục không được để trống!');
            return;
        }

        const subtabs = _qtnsGetSubtabs(currentSubtabScope);
        const item = subtabs.find(s => s.id === subId);
        if (item) {
            item.title = newTitle;
            _qtnsSaveSubtabs(currentSubtabScope, subtabs);
        }

        editingSubtabId = null;
        _qtnsRenderSubtabListInModal();
        _qtnsRenderCurrentMainTab();
        _qtnsShowToast('💾 Đã cập nhật mục!');
    };

    window._qtnsCancelSubtabEdit = function() {
        editingSubtabId = null;
        _qtnsRenderSubtabListInModal();
    };

    window._qtnsDeleteSubtabFromModal = function(subId) {
        let subtabs = _qtnsGetSubtabs(currentSubtabScope);
        const item = subtabs.find(s => s.id === subId);
        if (!item) return;

        if (!confirm(`Bạn có chắc muốn xóa mục "${item.title}" không?`)) return;

        subtabs = subtabs.filter(s => s.id !== subId);
        _qtnsSaveSubtabs(currentSubtabScope, subtabs);

        _qtnsRenderSubtabListInModal();
        _qtnsRenderCurrentMainTab();
        _qtnsShowToast(`🗑️ Đã xóa mục "${item.title}"!`);
    };

    function _qtnsEnsureSubtabModalInDOM() {
        let modal = document.getElementById('qtnsSubtabModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'qtns-modal-overlay';
            modal.id = 'qtnsSubtabModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:99999; align-items:center; justify-content:center; padding:20px;';
            modal.innerHTML = `
                <div class="qtns-modal-card" style="max-height:88vh; display:flex; flex-direction:column; width:100%; max-width:600px; border-radius:24px; overflow:hidden; background:#ffffff; box-shadow:0 25px 50px -12px rgba(109,40,217,0.35);">
                    <div style="flex-shrink:0; padding:18px 24px; background:linear-gradient(135deg, #4c1d95, #6d28d9); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                        <h3 id="qtnsSubtabModalTitle" style="margin:0; font-size:17.5px; font-weight:900;">⚙️ CÀI ĐẶT MỤC</h3>
                        <button onclick="window._qtnsCloseSubtabModal()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:30px; height:30px; border-radius:50%; cursor:pointer; font-size:16px; font-weight:bold;">✕</button>
                    </div>

                    <div style="flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:16px; background:#fcfafc;">
                        <div style="background:#ffffff; border:1.5px solid #e9d5ff; border-radius:18px; padding:16px;">
                            <label style="font-size:13.5px; font-weight:900; color:#5b21b6; display:block; margin-bottom:8px;">➕ Tạo Mục Mới:</label>
                            <div style="display:flex; gap:10px;">
                                <input type="text" id="qtnsSubtabFormTitle" placeholder="Nhập tên mục mới..." style="flex:1; border:2px solid #e9d5ff; border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:700; color:#0f172a; outline:none;" onkeypress="if(event.key==='Enter') window._qtnsAddSubtabFromModal()">
                                <button onclick="window._qtnsAddSubtabFromModal()" style="background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; border:none; border-radius:12px; padding:10px 18px; font-size:13.5px; font-weight:900; cursor:pointer;">➕ Thêm Mới</button>
                            </div>
                        </div>

                        <div>
                            <div style="font-size:13.5px; font-weight:900; color:#334155; margin-bottom:10px;">📌 Danh Sách Mục Hiện Tại:</div>
                            <div id="qtnsSubtabListContainer" style="display:flex; flex-direction:column; gap:10px;"></div>
                        </div>
                    </div>

                    <div style="flex-shrink:0; padding:14px 24px; background:#ffffff; border-top:1.5px solid #e2e8f0; display:flex; justify-content:flex-end;">
                        <button onclick="window._qtnsCloseSubtabModal()" style="padding:10px 22px; border-radius:12px; font-weight:900; background:#f1f5f9; color:#475569; border:none; cursor:pointer;">Đóng</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    }

    // Global Search Renderer for HR
    function _qtnsRenderGlobalSearchResults(container, query) {
        if (!container) return;
        const q = (query || '').toLowerCase().trim();

        const allSections = [
            { scope: 'muc1_tuyendung', title: 'MỤC 1: QUY TRÌNH HÀNH CHÍNH & TUYỂN DỤNG', icon: '📋' },
            { scope: 'muc2_daotao', title: 'MỤC 2: ĐÀO TẠO & PHÁT TRIỂN NHÂN SỰ', icon: '💼' },
            { scope: 'muc3_chedo', title: 'MỤC 3: CHẾ ĐỘ, LƯƠNG THƯỞNG & ĐÁNH GIÁ', icon: '⚖️' }
        ];

        let totalMatches = 0;
        const sectionResults = allSections.map(sec => {
            const subtabs = _qtnsGetSubtabs(sec.scope);
            let matches = [];
            subtabs.forEach(st => {
                const links = _qtnsGetCustomSubtabLinks(st.id);
                links.forEach(l => {
                    const title = (l.title || '').toLowerCase();
                    const subtitle = (l.subtitle || '').toLowerCase();
                    const categories = _qtnsGetLinkCategories(l).join(' ').toLowerCase();
                    const steps = (l.steps || []).join(' ').toLowerCase();

                    if (title.includes(q) || subtitle.includes(q) || categories.includes(q) || steps.includes(q)) {
                        matches.push({ ...l, subtabId: st.id, subtabTitle: st.title });
                    }
                });
            });
            totalMatches += matches.length;
            return { ...sec, matches };
        });

        if (totalMatches === 0) {
            container.innerHTML = `
                <div style="background:#ffffff; border:2px dashed #e9d5ff; border-radius:20px; padding:40px 20px; text-align:center; margin-top:10px;">
                    <div style="font-size:40px; margin-bottom:10px;">🔍</div>
                    <h4 style="margin:0 0 6px 0; font-size:16px; font-weight:850; color:#4c1d95;">
                        Không tìm thấy nội dung phù hợp với từ khóa "${query}"
                    </h4>
                    <p style="margin:0; font-size:13px; color:#64748b; font-weight:600;">
                        Anh/Chị hãy thử tra cứu với từ khóa khác xem sao nhé.
                    </p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="background:linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border:1.5px solid #d8b4fe; border-radius:18px; padding:16px 20px; margin-bottom:20px;">
                <div style="font-size:15px; font-weight:900; color:#4c1d95;">
                    🔍 KẾT QUẢ TÌM KIẾM TOÀN BỘ TRANG NHÂN SỰ: "${query}"
                </div>
                <div style="font-size:13px; font-weight:700; color:#6b21a8; margin-top:4px;">
                    Tìm thấy ${totalMatches} nội dung phù hợp (${sectionResults.map(s => `${s.title.split(':')[0]}: ${s.matches.length}`).join(', ')}).
                </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:24px;">
                ${sectionResults.filter(s => s.matches.length > 0).map(sec => `
                    <div style="background:#ffffff; border:1.5px solid #e9d5ff; border-radius:20px; padding:20px; box-shadow:0 4px 16px rgba(109,40,217,0.05);">
                        <div style="font-size:14px; font-weight:900; color:#4c1d95; margin-bottom:14px; padding-bottom:8px; border-bottom:2px solid #f3e8ff;">
                            ${sec.icon} ${sec.title} (${sec.matches.length})
                        </div>
                        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:18px;">
                            ${sec.matches.map(link => _qtnsRenderCardHTML(link, link.subtabId)).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
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
        const categories = _qtnsGetCategories(currentMainTab);
        const activeCat = activeCatFilter[currentMainTab] || 'all';

        const subtabLinks = _qtnsGetCustomSubtabLinks(activeSubtab.id);

        container.innerHTML = `
            <!-- Search Bar -->
            <div style="margin-bottom:20px; position:relative;">
                <div style="position:relative; display:flex; align-items:center;">
                    <span style="position:absolute; left:18px; font-size:18px; color:#7c3aed; pointer-events:none; z-index:2;">🔍</span>
                    <input type="text" id="qtnsSearchInput" value="${currentSearchQuery || ''}" 
                        placeholder="Nhập tên quy trình, cẩm nang nhân sự, từ khóa hoặc tiêu đề cần tìm kiếm (Tìm toàn bộ 3 Mục)..." 
                        style="width:100%; border:2px solid #e9d5ff; border-radius:18px; padding:13px 48px 13px 48px; font-size:14.5px; font-weight:700; background:#ffffff; outline:none; color:#0f172a; box-shadow:0 4px 16px rgba(124,58,237,0.08);"
                        oninput="window._qtnsOnSearchInput(this.value)">
                    <button id="qtnsSearchClearBtn" onclick="window._qtnsClearSearch()" style="position:absolute; right:16px; background:#e2e8f0; border:none; border-radius:50%; width:24px; height:24px; display:${currentSearchQuery ? 'flex' : 'none'}; align-items:center; justify-content:center; cursor:pointer; font-weight:bold; color:#475569;" title="Xóa tìm kiếm">✕</button>
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
                    ${_qtnsCanManage() ? `
                        <button class="qtns-btn primary" onclick="window._qtnsOpenAddLinkModal('${activeSubtab.id}')" style="border-radius:14px; padding:10px 20px; font-size:13.5px; font-weight:900; background:linear-gradient(135deg, #6d28d9, #7c3aed); color:#ffffff; border:none; box-shadow:0 6px 18px rgba(109,40,217,0.35); cursor:pointer;">
                            ➕ Tạo Đường Link Mới
                        </button>
                        <button class="qtns-btn secondary" onclick="window._qtnsOpenManageSubtabModal('${currentMainTab}')" style="border-radius:14px; padding:10px 20px; font-size:13.5px; font-weight:900; background:rgba(255,255,255,0.95); color:#6d28d9; border:1.5px solid #d8b4fe; box-shadow:0 4px 14px rgba(109,40,217,0.15); cursor:pointer;">
                            ⚙️ Cài Đặt Mục
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- Department Filter Bar (Thanh Bộ Phận Động - Giống Hợp Đồng & Tuyển Dụng) -->
            <div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; padding:14px 22px; border-radius:18px; border:1.5px solid #e9d5ff; margin-bottom:22px; box-shadow:0 4px 14px rgba(109,40,217,0.04); flex-wrap:wrap; gap:12px;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <span style="font-size:13.5px; font-weight:900; color:#4c1d95; margin-right:4px;">🏢 Bộ phận:</span>
                    <button class="dept-pill ${activeCat === 'all' ? 'active' : ''}" onclick="window._qtnsSelectCatFilter('${currentMainTab}', 'all')">
                        🌐 Tất Cả Bộ Phận (${subtabLinks.length})
                    </button>
                    ${categories.map(cat => {
                        const count = subtabLinks.filter(l => _qtnsGetLinkCategories(l).includes(cat)).length;
                        return `
                            <button class="dept-pill ${activeCat === cat ? 'active' : ''}" onclick="window._qtnsSelectCatFilter('${currentMainTab}', '${cat.replace(/'/g, "\\'")}')">
                                🏢 ${cat} (${count})
                            </button>
                        `;
                    }).join('')}
                </div>
                ${_qtnsCanManage() ? `
                    <button class="qtns-btn secondary" onclick="window._qtnsOpenManageCatModal('${currentMainTab}')" style="border-radius:12px; padding:9px 18px; font-size:13.5px; font-weight:800; border-color:#d8b4fe; color:#6d28d9; background:#ffffff; cursor:pointer;">
                        ⚙️ Cài Đặt Bộ Phận
                    </button>
                ` : ''}
            </div>

            <!-- Content Grid Area -->
            <div id="qtnsTabContentBody" class="qtns-tab-body"></div>
        `;

        if (currentSearchQuery && currentSearchQuery.trim() !== '') {
            const body = document.getElementById('qtnsTabContentBody');
            _qtnsRenderGlobalSearchResults(body, currentSearchQuery.trim().toLowerCase());
        } else {
            _qtnsRenderSubTabContent(activeSubtab.id);
        }
    }

    let currentSearchQuery = '';
    window._qtnsOnSearchInput = function(val) {
        currentSearchQuery = (val || '').trim();
        const clearBtn = document.getElementById('qtnsSearchClearBtn');
        if (clearBtn) clearBtn.style.display = currentSearchQuery ? 'flex' : 'none';

        const body = document.getElementById('qtnsTabContentBody');
        if (!body) return;

        const q = currentSearchQuery.toLowerCase();
        if (q !== '') {
            _qtnsRenderGlobalSearchResults(body, q);
        } else {
            let currentSub = currentSubTab1;
            if (currentMainTab === 'muc2_daotao') currentSub = currentSubTab2;
            else if (currentMainTab === 'muc3_chedo') currentSub = currentSubTab3;
            _qtnsRenderSubTabContent(currentSub);
        }
    };

    window._qtnsClearSearch = function() {
        currentSearchQuery = '';
        const inp = document.getElementById('qtnsSearchInput');
        if (inp) inp.value = '';
        const clearBtn = document.getElementById('qtnsSearchClearBtn');
        if (clearBtn) clearBtn.style.display = 'none';

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

    function _qtnsFormatDateTime(isoStr) {
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

    function _qtnsFormatDescription(text) {
        if (!text) return '';
        let str = String(text).trim();
        if (!str) return '';

        if (str.startsWith('http')) {
            return str.includes('docs.google.com') ? 'Tài liệu Bảng tính / Văn bản Google' : 'Tài liệu liên kết quy trình nhân sự';
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

    window._qtnsTogglePinLink = function(id, subId) {
        let links = _qtnsGetCustomSubtabLinks(subId);
        let isPinnedNow = false;
        links = links.map(l => {
            if (l.id === id) {
                isPinnedNow = !l.isPinned;
                return { ...l, isPinned: isPinnedNow };
            }
            return l;
        });
        _qtnsSaveCustomSubtabLinks(subId, links);
        _qtnsShowToast(isPinnedNow ? '📌⭐ Đã ghim tài liệu quan trọng lên vị trí ĐẦU TIÊN!' : '📌 Đã bỏ ghim tài liệu!');
        _qtnsRenderCurrentMainTab();
    };

    function _qtnsRenderSubTabContent(subId) {
        const body = document.getElementById('qtnsTabContentBody');
        if (!body) return;

        let links = _qtnsGetCustomSubtabLinks(subId);
        const activeCat = activeCatFilter[currentMainTab] || 'all';

        // Filter category filter
        if (activeCat !== 'all') {
            links = links.filter(l => _qtnsGetLinkCategories(l).includes(activeCat));
        }

        // Filter search query if present
        if (currentSearchQuery && currentSearchQuery.trim()) {
            const q = currentSearchQuery.toLowerCase().trim();
            links = links.filter(l => {
                const title = (l.title || '').toLowerCase();
                const desc = (l.subtitle || '').toLowerCase();
                const categories = _qtnsGetLinkCategories(l).join(' ').toLowerCase();
                return title.includes(q) || desc.includes(q) || categories.includes(q);
            });
        }

        // Separate Pinned and Unpinned
        const pinnedLinks = links.filter(l => l.isPinned);
        const normalLinks = links.filter(l => !l.isPinned);

        if (links.length === 0) {
            body.innerHTML = `
                <div style="text-align:center; padding:48px 20px; background:#ffffff; border-radius:20px; border:2px dashed #e9d5ff; margin-top:10px;">
                    <div style="font-size:48px; margin-bottom:12px;">📁</div>
                    <h3 style="font-size:18px; font-weight:850; color:#4c1d95; margin:0 0 6px 0;">Chưa Có Link Tài Liệu Nhân Sự Nào thuộc Lĩnh Vực "${activeCat === 'all' ? 'Tất cả' : activeCat}"</h3>
                    <p style="font-size:14px; color:#64748b; margin:0 0 16px 0;">Hãy bấm "➕ Tạo Đường Link Mới" ở trên để bổ sung quy trình hoặc cẩm nang nhân sự!</p>
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
                    <div class="qtns-link-grid">
                        ${pinnedLinks.map(link => _qtnsRenderCardHTML(link, subId)).join('')}
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
                    <div class="qtns-link-grid">
                        ${normalLinks.map(link => _qtnsRenderCardHTML(link, subId)).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    }

    function _qtnsRenderCardHTML(link, subId) {
        const hasValidUrl = _qtnsHasValidUrl(link.url);
        const themeName = link.theme || 'purple';
        const linkCats = _qtnsGetLinkCategories(link);

        return `
            <div class="qtns-card-item theme-${themeName} ${link.isPinned ? 'is-pinned-card' : ''}">
                <div class="card-accent-bar theme-${themeName}"></div>
                ${link.imageUrl ? `
                    <div style="position:relative; width:100%; height:140px; overflow:hidden; background:#f1f5f9; cursor:pointer;" onclick="window._qtnsOpenDetailModal('${link.id}', '${subId}')" title="Click để xem chi tiết tài liệu & quy trình">
                        <img src="${link.imageUrl}" style="width:100%; height:100%; object-fit:cover; display:block; transition:transform 0.3s ease;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        <div style="position:absolute; bottom:8px; right:8px; background:rgba(15,23,42,0.75); color:#ffffff; font-size:11px; font-weight:800; padding:4px 10px; border-radius:8px; backdrop-filter:blur(4px); display:flex; align-items:center; gap:4px;">
                            📋 Xem Chi Tiết
                        </div>
                    </div>
                ` : ''}
                <div class="card-inner">
                    <div class="card-head-row">
                        <div class="card-icon-box theme-${themeName}">${link.icon || '👔'}</div>
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
                        ${_qtnsCanManage() ? `
                            <div class="card-quick-actions">
                                <button class="card-action-btn pin ${link.isPinned ? 'active-pin' : ''}" 
                                    title="${link.isPinned ? 'Bỏ ghim quan trọng' : 'Ghim quan trọng lên đầu'}" 
                                    onclick="window._qtnsTogglePinLink('${link.id}', '${subId}')"
                                    style="${link.isPinned ? 'background:#fef3c7; color:#d97706; border-color:#fde68a; font-weight:900;' : ''}">
                                    ${link.isPinned ? '⭐' : '📌'}
                                </button>
                                <button class="card-action-btn edit" title="Chỉnh sửa link" onclick="window._qtnsOpenEditLinkModal('${link.id}', '${subId}')">✏️</button>
                                <button class="card-action-btn delete" title="Xóa link" onclick="window._qtnsDeleteLink('${link.id}', '${subId}')">🗑️</button>
                            </div>
                        ` : ''}
                    </div>
                    <div class="card-main-content" style="cursor:pointer;" onclick="window._qtnsOpenDetailModal('${link.id}', '${subId}')" title="Nhấp để xem chi tiết đầy đủ quy trình">
                        <h3 class="card-title">${_qtnsFormatTitle(link.title)}</h3>
                        <div class="card-desc">${_qtnsFormatDescription(link.subtitle || link.url)}</div>
                    </div>

                    <!-- Side-by-Side 1-Row Compact Buttons -->
                    <div style="display:flex; gap:8px; margin-top:14px; align-items:center;">
                        <button type="button" onclick="window._qtnsOpenDetailModal('${link.id}', '${subId}')" 
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
                        <span style="color:#64748b;">${_qtnsFormatDateTime(link.updatedAt || link.createdAt)}</span>
                    </div>
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
                                    <span>🏢 Bộ Phận Tài Liệu (* BẮT BUỘC - Chọn nhiều):</span>
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
                                <textarea id="qtnsFormSubtitle" rows="6" placeholder="Mô tả tóm tắt nội dung quy trình hoặc cẩm nang hướng dẫn..." style="width:100%; border:2px solid #e9d5ff; border-radius:16px; padding:12px 16px; font-size:13.5px; font-weight:600; line-height:1.55; outline:none; resize:vertical; min-height:160px; color:#0f172a; font-family:inherit; background:#ffffff; box-sizing:border-box;"></textarea>
                            </div>
                            <div class="qtns-form-group" style="margin-bottom:14px;">
                                <label id="qtnsUrlLabel" style="color:#0f172a; font-weight:850; display:block; margin-bottom:6px;">Đường link URL tài liệu (Google Sheets / Word / Link ngoài):</label>
                                <input type="url" id="qtnsFormUrl" placeholder="https://docs.google.com/..." style="width:100%; border:2px solid #e9d5ff; border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:700; color:#0f172a;">
                            </div>
                            <div class="qtns-form-group" style="margin-bottom:14px;">
                                <label style="color:#0f172a; font-weight:850; display:block; margin-bottom:6px;">🖼️ Hình Ảnh Minh Họa / Sơ Đồ / Mẫu (Không bắt buộc):</label>
                                <div style="display:flex; flex-direction:column; gap:8px;">
                                    <input type="file" id="qtnsFormImageFile" accept="image/*" style="display:none;" onchange="window._qtnsOnImageSelected(this)">
                                    <input type="hidden" id="qtnsFormImageUrl" value="">
                                    <div style="display:flex; gap:10px; align-items:center;">
                                        <button type="button" onclick="document.getElementById('qtnsFormImageFile').click()" style="background:#f3e8ff; color:#6b21a8; border:1.5px solid #d8b4fe; border-radius:12px; padding:9px 16px; font-size:13px; font-weight:800; cursor:pointer;">
                                            📷 Chọn Hình Ảnh Từ Máy Tính
                                        </button>
                                        <button type="button" id="qtnsFormImageRemoveBtn" onclick="window._qtnsRemoveSelectedImage()" style="display:none; background:#fee2e2; color:#dc2626; border:none; border-radius:10px; padding:8px 14px; font-size:12.5px; font-weight:800; cursor:pointer;">
                                            ✕ Xóa Ảnh
                                        </button>
                                    </div>
                                    <div id="qtnsFormImagePreviewBox" style="display:none; margin-top:6px; border:1.5px dashed #c084fc; border-radius:14px; padding:8px; background:#faf5ff; width:fit-content; max-width:100%;">
                                        <img id="qtnsFormImagePreviewImg" src="" style="max-height:160px; border-radius:10px; object-fit:contain;">
                                    </div>
                                </div>
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
                                    <textarea id="qtnsFormSteps" rows="8" 
                                        placeholder="Bước 1: Tiếp nhận nhu cầu tuyển dụng&#10;Bước 2: Sàng lọc hồ sơ ứng viên..." 
                                        style="width:100%; border:2px solid #d8b4fe; border-radius:16px; padding:14px 18px; font-size:13.5px; font-weight:700; line-height:1.6; outline:none; resize:vertical; min-height:220px; color:#4c1d95; font-family:inherit; background:#ffffff;"
                                        onfocus="window._qtnsOnStepsFocus(this)"
                                        onkeydown="window._qtnsOnStepsKeyDown(event, this)"></textarea>
                                    <div style="display:flex; justify-content:flex-end; margin-top:4px;">
                                        <button type="button" onclick="window._qtnsAddStepLine()" style="background:#f3e8ff; color:#6b21a8; border:1px solid #d8b4fe; border-radius:8px; padding:4px 10px; font-size:12px; font-weight:800; cursor:pointer;">
                                            ➕ Thêm Bước Thực Thi
                                        </button>
                                    </div>
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
                        <div id="qtnsDetailImageBox" style="display:none; background:#ffffff; border:1.5px solid #e9d5ff; border-radius:18px; padding:16px; text-align:center;">
                            <div style="font-size:13px; font-weight:850; color:#6b21a8; margin-bottom:8px; text-align:left;">🖼️ HÌNH ẢNH MINH HỌA:</div>
                            <img id="qtnsDetailImg" src="" style="max-height:300px; max-width:100%; border-radius:12px; cursor:pointer; object-fit:contain;" onclick="window._qtnsOpenLightbox(this.src)" title="Click để phóng to ảnh nét căng">
                        </div>

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
        let item = null;
        if (targetSub) {
            const links = _qtnsGetCustomSubtabLinks(targetSub);
            item = links.find(l => String(l.id) === String(id));
        }
        if (!item) {
            const allScopes = ['muc1_tuyendung', 'muc2_daotao', 'muc3_chedo'];
            for (const scope of allScopes) {
                const subtabs = _qtnsGetSubtabs(scope);
                for (const sub of subtabs) {
                    const links = _qtnsGetCustomSubtabLinks(sub.id);
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

        const modal = _qtnsEnsureDetailModalInDOM();

        document.getElementById('qtnsDetailIcon').innerText = item.icon || '👔';
        document.getElementById('qtnsDetailTitle').innerText = _qtnsFormatTitle(item.title || 'Chi Tiết Tài Liệu');

        const imgBox = document.getElementById('qtnsDetailImageBox');
        const imgEl = document.getElementById('qtnsDetailImg');
        if (item.imageUrl && imgBox && imgEl) {
            imgEl.src = item.imageUrl;
            imgBox.style.display = 'block';
        } else if (imgBox) {
            imgBox.style.display = 'none';
        }

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
        window._qtnsRemoveSelectedImage();

        const stepsInput = document.getElementById('qtnsFormSteps');
        if (stepsInput) stepsInput.value = '';

        const guideContainer = document.getElementById('qtnsGuideQuestionsContainer');
        if (guideContainer) guideContainer.innerHTML = '';

        const warrantyContainer = document.getElementById('qtnsWarrantyContainer');
        if (warrantyContainer) warrantyContainer.innerHTML = '';

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

        if (item.imageUrl) {
            document.getElementById('qtnsFormImageUrl').value = item.imageUrl;
            const previewBox = document.getElementById('qtnsFormImagePreviewBox');
            const previewImg = document.getElementById('qtnsFormImagePreviewImg');
            const removeBtn = document.getElementById('qtnsFormImageRemoveBtn');
            if (previewImg) previewImg.src = item.imageUrl;
            if (previewBox) previewBox.style.display = 'block';
            if (removeBtn) removeBtn.style.display = 'inline-flex';
        } else {
            window._qtnsRemoveSelectedImage();
        }

        // Populate Tab 2 fields
        const stepsText = Array.isArray(item.steps) ? item.steps.join('\n') : (item.steps || '');
        const stepsInput = document.getElementById('qtnsFormSteps');
        if (stepsInput) stepsInput.value = stepsText;

        const guideContainer = document.getElementById('qtnsGuideQuestionsContainer');
        if (guideContainer) {
            guideContainer.innerHTML = '';
            const guides = Array.isArray(item.saleGuide) ? item.saleGuide : [];
            if (guides.length > 0) {
                guides.forEach(g => {
                    const qText = typeof g === 'object' ? (g.question || '') : String(g);
                    window._qtnsAddGuideQuestionItem(qText);
                });
            }
        }

        const warrantyContainer = document.getElementById('qtnsWarrantyContainer');
        if (warrantyContainer) {
            warrantyContainer.innerHTML = '';
            const warranty = Array.isArray(item.warranty) ? item.warranty : [];
            if (warranty.length > 0) {
                warranty.forEach(w => {
                    const wText = typeof w === 'object' ? (w.text || '') : String(w);
                    window._qtnsAddWarrantyItem(wText);
                });
            }
        }

        window._qtnsSwitchModalTab('basic');
        const selectedCats = _qtnsGetLinkCategories(item);
        window._qtnsPopulateSubtabOptions(targetSub, selectedCats);
        modal.style.display = 'flex';
    };

    window._qtnsCloseLinkModal = function() {
        const modal = document.getElementById('qtnsLinkModal');
        if (modal) modal.style.display = 'none';
    };

    window._qtnsPopulateSubtabOptions = function(selectedSub, selectedCategories) {
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

        let selectedArr = [];
        if (Array.isArray(selectedCategories)) {
            selectedArr = selectedCategories;
        } else if (typeof selectedCategories === 'string' && selectedCategories) {
            selectedArr = [selectedCategories];
        } else {
            selectedArr = []; // Un-checked by default when creating a new link
        }

        if (cats.length === 0) {
            box.innerHTML = `<div style="color:#64748b; font-size:13px; font-weight:600; padding:4px;">Chưa có bộ phận nào. Hãy bấm Cài Đặt Bộ Phận để tạo thêm!</div>`;
            return;
        }

        box.innerHTML = cats.map(c => {
            const isChecked = selectedArr.includes(c);
            return `
                <label style="display:inline-flex; align-items:center; gap:7px; background:${isChecked ? '#f3e8ff' : '#ffffff'}; border:1.5px solid ${isChecked ? '#7c3aed' : '#d8b4fe'}; padding:7px 14px; border-radius:12px; font-size:13.5px; font-weight:800; color:${isChecked ? '#5b21b6' : '#334155'}; cursor:pointer; user-select:none; transition:all 0.15s ease;">
                    <input type="checkbox" name="qtnsCategoryCheck" value="${c.replace(/"/g, '&quot;')}" ${isChecked ? 'checked' : ''} style="width:16px; height:16px; accent-color:#7c3aed; cursor:pointer;" onchange="this.parentElement.style.background=this.checked?'#f3e8ff':'#ffffff'; this.parentElement.style.borderColor=this.checked?'#7c3aed':'#d8b4fe'; this.parentElement.style.color=this.checked?'#5b21b6':'#334155';">
                    <span>📌 ${c}</span>
                </label>
            `;
        }).join('');
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
        const imageUrl = document.getElementById('qtnsFormImageUrl')?.value || '';
        const icon = document.getElementById('qtnsFormIcon').value;
        const theme = document.getElementById('qtnsFormTheme').value;
        const subtabId = document.getElementById('qtnsFormSubtab').value;

        const checkedInputs = document.querySelectorAll('input[name="qtnsCategoryCheck"]:checked');
        const categories = Array.from(checkedInputs).map(cb => cb.value);

        if (!subtabId) {
            alert('⚠️ BẮT BUỘC: Vui lòng chọn Danh Mục Quản Trị!');
            window._qtnsSwitchModalTab('basic');
            return;
        }

        if (categories.length === 0) {
            alert('⚠️ BẮT BUỘC: Vui lòng chọn ít nhất 1 Bộ Phận Tài Liệu!');
            window._qtnsSwitchModalTab('basic');
            return;
        }

        if (!title) {
            alert('⚠️ BẮT BUỘC: Vui lòng nhập tiêu đề đường link tài liệu!');
            window._qtnsSwitchModalTab('basic');
            document.getElementById('qtnsFormTitle').focus();
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

        const hasValidUrl = url !== '';
        const hasFullTab2 = (steps.length > 0) && (saleGuideItems.length > 0) && (warrantyItems.length > 0);

        // Validation rule: Condition 1 (URL present) OR Condition 2 (All 3 parts of TAB 2 filled)
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
            finalUrl = '#'; // Fallback link when Tab 2 is fully filled
        }

        const category = categories[0] || 'Chung';

        let links = _qtnsGetCustomSubtabLinks(subtabId);
        if (id) {
            links = links.map(l => {
                if (l.id === id) {
                    return { ...l, title, subtitle, url: finalUrl, imageUrl, icon, theme, category, categories, steps, saleGuide: saleGuideItems, warranty: warrantyItems, updatedAt: new Date().toISOString() };
                }
                return l;
            });
        } else {
            const newId = 'qtns_link_' + Date.now();
            links.push({ id: newId, title, subtitle, url: finalUrl, imageUrl, icon, theme, category, categories, steps, saleGuide: saleGuideItems, warranty: warrantyItems, createdAt: new Date().toISOString() });
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

                /* Dynamic Card Grid & Item Styling */
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
                .card-accent-bar.theme-green { background: linear-gradient(90deg, #107c41, #22c55e); }
                .card-accent-bar.theme-blue { background: linear-gradient(90deg, #1e40af, #3b82f6); }
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
                .card-icon-box.theme-green { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
                .card-icon-box.theme-blue { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
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
                .card-badge.theme-purple { background: #faf5ff; color: #7e22ce; border: 1px solid #e9d5ff; }
                .card-badge.theme-green { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
                .card-badge.theme-blue { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
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

    window._qtnsOnImageSelected = async function(input) {
        if (!input || !input.files || !input.files[0]) return;
        const file = input.files[0];
        try {
            const compressedDataUrl = await _qtnsCompressImageToDataUrl(file, 1200, 0.82);
            if (compressedDataUrl) {
                document.getElementById('qtnsFormImageUrl').value = compressedDataUrl;
                const previewBox = document.getElementById('qtnsFormImagePreviewBox');
                const previewImg = document.getElementById('qtnsFormImagePreviewImg');
                const removeBtn = document.getElementById('qtnsFormImageRemoveBtn');
                if (previewImg) previewImg.src = compressedDataUrl;
                if (previewBox) previewBox.style.display = 'block';
                if (removeBtn) removeBtn.style.display = 'inline-flex';
                _qtnsShowToast('📷 Đã tải và nén hình ảnh mượt mà!');
            }
        } catch (e) {
            console.error('Lỗi nén ảnh:', e);
            alert('Có lỗi xảy ra khi nén hình ảnh, vui lòng thử lại!');
        }
    };

    window._qtnsRemoveSelectedImage = function() {
        const hiddenInput = document.getElementById('qtnsFormImageUrl');
        const fileInput = document.getElementById('qtnsFormImageFile');
        const previewBox = document.getElementById('qtnsFormImagePreviewBox');
        const removeBtn = document.getElementById('qtnsFormImageRemoveBtn');

        if (hiddenInput) hiddenInput.value = '';
        if (fileInput) fileInput.value = '';
        if (previewBox) previewBox.style.display = 'none';
        if (removeBtn) removeBtn.style.display = 'none';
    };

    function _qtnsCompressImageToDataUrl(file, maxDimension = 1200, quality = 0.82) {
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

    window._qtnsOpenLightbox = function(imageUrlOrId, subId) {
        let imgUrl = imageUrlOrId;
        let title = 'Hình Ảnh Minh Họa';
        if (subId) {
            const links = _qtnsGetCustomSubtabLinks(subId);
            const link = links.find(l => String(l.id) === String(imageUrlOrId));
            if (link && link.imageUrl) {
                imgUrl = link.imageUrl;
                title = link.title || title;
            }
        }

        if (!imgUrl) return;

        const modal = _qtnsEnsureLightboxInDOM();
        const imgEl = document.getElementById('qtnsLightboxImg');
        const dlBtn = document.getElementById('qtnsLightboxDownloadBtn');
        const titleEl = document.getElementById('qtnsLightboxTitle');

        imgEl.src = imgUrl;
        dlBtn.href = imgUrl;
        if (titleEl) titleEl.innerText = title;

        currentLightboxScale = 1;
        imgEl.style.transform = 'scale(1)';
        modal.style.display = 'flex';
    };

    window._qtnsCloseLightbox = function() {
        const modal = document.getElementById('qtnsLightboxModal');
        if (modal) modal.style.display = 'none';
    };

    window._qtnsZoomLightbox = function(factor) {
        currentLightboxScale *= factor;
        if (currentLightboxScale < 0.4) currentLightboxScale = 0.4;
        if (currentLightboxScale > 4) currentLightboxScale = 4;
        const imgEl = document.getElementById('qtnsLightboxImg');
        if (imgEl) imgEl.style.transform = `scale(${currentLightboxScale})`;
    };

    window._qtnsResetLightboxZoom = function() {
        currentLightboxScale = 1;
        const imgEl = document.getElementById('qtnsLightboxImg');
        if (imgEl) imgEl.style.transform = 'scale(1)';
    };

    function _qtnsEnsureLightboxInDOM() {
        let modal = document.getElementById('qtnsLightboxModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'qtns-modal-overlay';
            modal.id = 'qtnsLightboxModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,23,42,0.92); backdrop-filter:blur(10px); z-index:100000; align-items:center; justify-content:center; padding:20px;';
            modal.innerHTML = `
                <div style="position:relative; max-width:94vw; max-height:94vh; display:flex; flex-direction:column; align-items:center;">
                    <div style="width:100%; display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; background:rgba(255,255,255,0.1); padding:10px 18px; border-radius:14px; backdrop-filter:blur(8px);">
                        <span id="qtnsLightboxTitle" style="color:#ffffff; font-size:15px; font-weight:850; max-width:60%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">🖼️ Xem Ảnh Minh Họa</span>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <button onclick="window._qtnsZoomLightbox(1.25)" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; padding:6px 14px; border-radius:10px; font-weight:850; font-size:13px; cursor:pointer;" title="Phóng to">🔍 Zoom +</button>
                            <button onclick="window._qtnsZoomLightbox(0.8)" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; padding:6px 14px; border-radius:10px; font-weight:850; font-size:13px; cursor:pointer;" title="Thu nhỏ">🔍 Zoom -</button>
                            <button onclick="window._qtnsResetLightboxZoom()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; padding:6px 14px; border-radius:10px; font-weight:850; font-size:13px; cursor:pointer;" title="Đặt lại size">🔄 Reset</button>
                            <a id="qtnsLightboxDownloadBtn" href="" download="hinh-anh-tai-lieu.jpg" style="background:linear-gradient(135deg, #10b981, #059669); color:#ffffff; padding:6px 16px; border-radius:10px; font-weight:900; text-decoration:none; font-size:13px; box-shadow:0 4px 12px rgba(16,185,129,0.3);">⬇️ Tải Ảnh Về</a>
                            <button onclick="window._qtnsCloseLightbox()" style="background:#ef4444; color:#ffffff; border:none; width:34px; height:34px; border-radius:50%; font-weight:bold; cursor:pointer; font-size:16px;">✕</button>
                        </div>
                    </div>
                    <div style="overflow:auto; max-height:82vh; max-width:92vw; border-radius:18px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5); background:rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; padding:10px;" onclick="if(event.target===this) window._qtnsCloseLightbox()">
                        <img id="qtnsLightboxImg" src="" style="display:block; max-width:100%; max-height:78vh; object-fit:contain; border-radius:12px; transition:transform 0.2s ease;">
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    }

    window._qtnsOnStepsFocus = function (el) {
        if (!el || el.value.trim()) return;
        el.value = 'Bước 1: ';
    };

    window._qtnsAddStepLine = function () {
        const el = document.getElementById('qtnsFormSteps');
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

    window._qtnsOnStepsKeyDown = function (e, el) {
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
