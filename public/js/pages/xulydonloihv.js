// ========== KỊCH BẢN TƯ VẤN & XỬ LÝ LỖI — PREMIUM FULL SCREEN UI ==========

(function() {
    'use strict';

    // State Management
    let currentMainTab = localStorage.getItem('xldl_main_tab') || 'muc1_error';
    let currentSubTab1 = localStorage.getItem('xldl_sub_tab1') || 'test_kNM';
    let currentSubTab2 = localStorage.getItem('xldl_sub_tab2') || 'telesale';
    let currentSubtabScope = 'muc2_probation';
    
    // Quiz state
    let quizCurrentIdx = 0;
    let quizAnswers = {};
    let quizSubmitted = false;

    // Flashcard state
    let flashcardCurrentIdx = 0;
    let flashcardFlipped = false;
    let flashcardCategory = 'all';

    let currentEditingTarget = 'knm'; // 'knm' hoặc 'htkt'

    // Error Playbook state
    let globalSearchQuery = '';
    let errorSearchQuery = '';
    let errorSelectedDept = 'all';
    let errorList = [];
    let isLoadingErrors = false;

    // Dynamic Custom Links for KNM (Test Kỹ Năng Mềm)
    const DEFAULT_KNM_LINKS = [
        {
            id: 'knm_link_default_1',
            title: 'ĐÀO TẠO SALE THỬ VIỆC - TEST KĨ NĂNG MỀM',
            subtitle: 'Bao gồm 5 chuyên mục đào tạo chuẩn hóa: Đánh văn bản, Telesale giọng nói, Kỹ năng phím tắt máy tính & Lưu ý chốt đơn.',
            url: 'https://docs.google.com/spreadsheets/d/1uuSXaFSdxyk22wJ0t_JPjn8Fgp2XQx_KljRg0B_ATDI/edit?gid=669639339#gid=669639339',
            icon: '📊',
            theme: 'green',
            createdAt: '2026-08-25T08:00:00.000Z',
            createdBy: 'Giám Đốc',
            updatedAt: '2026-08-25T08:00:00.000Z',
            updatedBy: 'Giám Đốc'
        }
    ];

    function _xldlGetKnmLinks() {
        try {
            const raw = localStorage.getItem('xldl_knm_links');
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    let modified = false;
                    const normalized = parsed.map((item, index) => {
                        let newItem = { ...item };
                        if (!newItem.updatedAt) {
                            const baseTime = new Date(Date.now() - (parsed.length - index) * 3600000).toISOString();
                            newItem.createdAt = item.createdAt || baseTime;
                            newItem.updatedAt = item.updatedAt || item.createdAt || baseTime;
                            newItem.updatedBy = item.updatedBy || item.createdBy || 'Giám Đốc';
                            newItem.createdBy = item.createdBy || 'Giám Đốc';
                            modified = true;
                        }
                        return newItem;
                    });
                    if (modified) _xldlSaveKnmLinks(normalized);
                    return normalized;
                }
            }
        } catch (e) {}
        return DEFAULT_KNM_LINKS;
    }

    function _xldlSaveKnmLinks(links) {
        localStorage.setItem('xldl_knm_links', JSON.stringify(links));
        _xldlSyncSaveToServer();
    }

    // Dynamic Custom Links for HTKT (Học Thuộc Kiến Thức)
    const DEFAULT_HTKT_LINKS = [
        {
            id: 'htkt_link_default_1',
            title: 'HỌC THUỘC KIẾN THỨC SẢN PHẨM & QUY TRÌNH HV',
            subtitle: 'Tài liệu chi tiết về đặc tính vải Cotton, quy trình sản xuất, bảng giá chốt đơn & chính sách bảo hành xưởng HV.',
            url: 'https://docs.google.com/spreadsheets/d/1uuSXaFSdxyk22wJ0t_JPjn8Fgp2XQx_KljRg0B_ATDI/edit?gid=669639339#gid=669639339',
            icon: '📚',
            theme: 'blue',
            createdAt: '2026-08-25T08:00:00.000Z',
            createdBy: 'Giám Đốc',
            updatedAt: '2026-08-25T08:00:00.000Z',
            updatedBy: 'Giám Đốc'
        }
    ];

    function _xldlGetHtktLinks() {
        try {
            const raw = localStorage.getItem('xldl_htkt_links');
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    let modified = false;
                    const normalized = parsed.map((item, index) => {
                        let newItem = { ...item };
                        if (!newItem.updatedAt) {
                            const baseTime = new Date(Date.now() - (parsed.length - index) * 3600000).toISOString();
                            newItem.createdAt = item.createdAt || baseTime;
                            newItem.updatedAt = item.updatedAt || item.createdAt || baseTime;
                            newItem.updatedBy = item.updatedBy || item.createdBy || 'Giám Đốc';
                            newItem.createdBy = item.createdBy || 'Giám Đốc';
                            modified = true;
                        }
                        return newItem;
                    });
                    if (modified) _xldlSaveHtktLinks(normalized);
                    return normalized;
                }
            }
        } catch (e) {}
        return DEFAULT_HTKT_LINKS;
    }

    function _xldlSaveHtktLinks(links) {
        localStorage.setItem('xldl_htkt_links', JSON.stringify(links));
        _xldlSyncSaveToServer();
    }

    // Category Filter State per Scope (knm, htkt, muc1_error, muc3_official)
    let activeCatFilter = {
        knm: 'all',
        htkt: 'all',
        muc1_error: 'all',
        muc3_official: 'all'
    };

    function _xldlGetCategories(scope) {
        try {
            const raw = localStorage.getItem('xldl_cats_' + scope);
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}

        if (scope === 'knm') {
            return ['Đào Tạo Thử Việc', 'Kỹ Năng Máy Tính', 'Telesale Cơ Bản', 'Lưu Ý Chốt Đơn'];
        } else if (scope === 'htkt') {
            return ['Kiến Thức Vải Vóc', 'Quy Trình Sản Xuất', 'Bảng Giá & Chiết Khấu', 'Chính Sách Bảo Hành'];
        } else if (scope === 'muc1_error') {
            return ['Lỗi Size Áo', 'Lỗi Màu Áo', 'Lỗi In Ấn', 'Lỗi Tiến Độ Giao Hàng', 'Khách Thái Độ Gắt Gỏng'];
        } else if (scope === 'muc3_official') {
            return ['Kịch Bản Telesale', 'Nhắn Tin Zalo Chốt Đơn', 'Xử Lý Từ Chối Giá', 'Chăm Sóc Sau Bán'];
        }
        return ['Chung'];
    }

    function _xldlSaveCategories(scope, cats) {
        localStorage.setItem('xldl_cats_' + scope, JSON.stringify(cats));
        _xldlSyncSaveToServer();
    }

    // Category Modal Handlers
    let editingCatIndex = -1;

    window._xldlOpenManageCatModal = function(scope = null) {
        if (!_xldlCanManage()) {
            alert('Chỉ Giám Đốc và Quản Lý Cấp Cao Lê Việt Trinh mới có quyền cài đặt lĩnh vực!');
            return;
        }
        if (!scope) {
            if (currentMainTab === 'muc1_error' || currentMainTab === 'muc3') scope = 'muc1_error';
            else if (currentMainTab === 'muc3_official' || currentMainTab === 'muc2') scope = 'muc3_official';
            else scope = currentSubTab1 === 'knowledge' ? 'htkt' : 'knm';
        }

        const modal = document.getElementById('xldlCategoryModal');
        if (!modal) return;

        let scopeTitle = 'MỤC 2: TEST KỸ NĂNG MỀM';
        if (scope === 'htkt') scopeTitle = 'MỤC 2: HỌC THUỘC KIẾN THỨC';
        else if (scope === 'muc1_error') scopeTitle = 'MỤC 1: TÌNH HUỐNG XỬ LÝ LỖI';
        else if (scope === 'muc3_official') scopeTitle = 'MỤC 3: ĐÀO TẠO SALE CHÍNH THỨC';

        document.getElementById('xldlCatModalTitle').innerText = `⚙️ CÀI ĐẶT LĨNH VỰC (${scopeTitle})`;
        document.getElementById('xldlCatFormScope').value = scope;
        document.getElementById('xldlCatFormName').value = '';
        editingCatIndex = -1;

        _xldlRenderCatListInModal(scope);
        modal.style.display = 'flex';
    };

    window._xldlCloseCatModal = function() {
        editingCatIndex = -1;
        const modal = document.getElementById('xldlCategoryModal');
        if (modal) modal.style.display = 'none';
    };

    function _xldlRenderCatListInModal(scope) {
        const container = document.getElementById('xldlCatListContainer');
        if (!container) return;

        const cats = _xldlGetCategories(scope);
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
                            <input type="text" id="xldlEditCatInput_${idx}" value="${cat.replace(/"/g, '&quot;')}" style="flex:1; padding:8px 12px; border-radius:10px; border:1.5px solid #f59e0b; font-size:14px; font-weight:800; color:#0f172a; outline:none; background:#ffffff;" onkeypress="if(event.key==='Enter') window._xldlSaveCategoryEditFromModal('${scope}', ${idx})">
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button onclick="window._xldlSaveCategoryEditFromModal('${scope}', ${idx})" title="Lưu tên mới" style="background:#22c55e; color:#ffffff; border:none; border-radius:10px; padding:7px 14px; font-size:12.5px; font-weight:900; cursor:pointer; box-shadow:0 2px 6px rgba(34, 197, 94, 0.3);">💾 Lưu</button>
                            <button onclick="window._xldlCancelCategoryEditFromModal('${scope}')" title="Hủy bỏ" style="background:#e2e8f0; color:#475569; border:none; border-radius:10px; padding:7px 12px; font-size:12.5px; font-weight:800; cursor:pointer;">✕ Hủy</button>
                        </div>
                    </div>
                `;
            }

            return `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; padding:12px 16px; border-radius:14px; border:1.5px solid #e2e8f0; box-shadow:0 2px 8px rgba(0,0,0,0.02); transition:all 0.2s ease;" onmouseover="this.style.borderColor='#93c5fd'; this.style.boxShadow='0 4px 12px rgba(2,132,199,0.08)'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.02)'">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:32px; height:32px; background:#eff6ff; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:15px; color:#0284c7; border:1px solid #e0f2fe; flex-shrink:0;">📌</div>
                        <span style="font-size:14.5px; font-weight:800; color:#0f172a;">${cat}</span>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button onclick="window._xldlStartCategoryEditFromModal('${scope}', ${idx})" title="Chỉnh sửa tên lĩnh vực" style="background:#fef3c7; color:#d97706; border:1px solid #fde047; border-radius:10px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer; transition:all 0.15s ease;" onmouseover="this.style.background='#fde047'" onmouseout="this.style.background='#fef3c7'">✏️ Sửa Tên</button>
                        <button onclick="window._xldlDeleteCategoryFromModal('${scope}', ${idx})" title="Xóa lĩnh vực" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; border-radius:10px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer; transition:all 0.15s ease;" onmouseover="this.style.background='#fca5a5'" onmouseout="this.style.background='#fee2e2'">🗑️ Xóa</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window._xldlStartCategoryEditFromModal = function(scope, index) {
        editingCatIndex = index;
        _xldlRenderCatListInModal(scope);
        setTimeout(() => {
            const input = document.getElementById(`xldlEditCatInput_${index}`);
            if (input) { input.focus(); input.select(); }
        }, 50);
    };

    window._xldlCancelCategoryEditFromModal = function(scope) {
        editingCatIndex = -1;
        _xldlRenderCatListInModal(scope);
    };

    window._xldlSaveCategoryEditFromModal = function(scope, index) {
        const input = document.getElementById(`xldlEditCatInput_${index}`);
        if (!input) return;
        const newName = input.value.trim();

        let cats = _xldlGetCategories(scope);
        const oldName = cats[index];

        if (!newName) {
            alert('Vui lòng nhập tên lĩnh vực hợp lệ!');
            return;
        }

        if (newName !== oldName && cats.includes(newName)) {
            alert('Tên lĩnh vực này đã tồn tại!');
            return;
        }

        // Save updated category list
        cats[index] = newName;
        _xldlSaveCategories(scope, cats);

        // Update active filter if matching oldName
        if (activeCatFilter[scope] === oldName) {
            activeCatFilter[scope] = newName;
        }

        // Update link category references automatically
        if (scope === 'knm') {
            let links = _xldlGetKnmLinks();
            let changed = false;
            links.forEach(l => {
                if (l.category === oldName) {
                    l.category = newName;
                    changed = true;
                }
            });
            if (changed) _xldlSaveKnmLinks(links);
        } else if (scope === 'htkt') {
            let links = _xldlGetHtktLinks();
            let changed = false;
            links.forEach(l => {
                if (l.category === oldName) {
                    l.category = newName;
                    changed = true;
                }
            });
            if (changed) _xldlSaveHtktLinks(links);
        }

        editingCatIndex = -1;
        _xldlRenderCatListInModal(scope);
        _xldlRenderCurrentMainTab();
    };

    window._xldlAddCategoryFromModal = function() {
        const scope = document.getElementById('xldlCatFormScope').value;
        const nameInput = document.getElementById('xldlCatFormName');
        const name = nameInput.value.trim();

        if (!name) {
            alert('Vui lòng nhập tên lĩnh vực mới!');
            return;
        }

        let cats = _xldlGetCategories(scope);
        if (cats.includes(name)) {
            alert('Lĩnh vực này đã tồn tại!');
            return;
        }

        cats.push(name);
        _xldlSaveCategories(scope, cats);
        nameInput.value = '';
        _xldlRenderCatListInModal(scope);
        _xldlRenderCurrentMainTab();
    };

    window._xldlDeleteCategoryFromModal = function(scope, index) {
        let cats = _xldlGetCategories(scope);
        if (cats.length <= 1) {
            alert('Cần giữ lại ít nhất 1 lĩnh vực!');
            return;
        }
        if (!confirm(`Bạn có chắc muốn xóa lĩnh vực "${cats[index]}" không?`)) return;

        cats.splice(index, 1);
        _xldlSaveCategories(scope, cats);
        _xldlRenderCatListInModal(scope);
        _xldlRenderCurrentMainTab();
    };

    window._xldlSelectCatFilter = function(scope, catName) {
        activeCatFilter[scope] = catName;
        _xldlRenderCurrentMainTab();
    };

    function _xldlGetCurrentUser() {
        try {
            const u = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || localStorage.getItem('userData') || '{}');
            const name = u.fullname || u.name || u.full_name || u.username;
            if (name && name !== 'HV Admin' && name !== 'Admin') return name;
            return 'Giám Đốc';
        } catch (e) {
            return 'Giám Đốc';
        }
    }

    // Helper: Permission Check — Only Giám Đốc and Quản Lý Cấp Cao Lê Việt Trinh can Create / Edit / Manage
    function _xldlCanManage() {
        try {
            let u = null;
            if (typeof currentUser !== 'undefined' && currentUser) {
                u = currentUser;
            } else if (window.__currentUser || window._currentUser || window.currentUser) {
                u = window.__currentUser || window._currentUser || window.currentUser;
            } else {
                const raw = localStorage.getItem('currentUser') || localStorage.getItem('user') || localStorage.getItem('userData');
                if (raw) u = JSON.parse(raw);
            }

            if (!u || !u.role) return true; // Default fallback in dev environment

            const role = String(u.role || u.chuc_vu || '').toLowerCase();
            const username = String(u.username || u.user_name || '').toLowerCase();
            const fullname = String(u.full_name || u.fullname || u.name || '').toLowerCase();

            // 1. Giám Đốc / Admin
            if (role === 'giam_doc' || role === 'admin' || username === 'admin' || fullname.includes('giám đốc') || fullname.includes('giam doc')) {
                return true;
            }

            // 2. Quản Lý Cấp Cao Lê Việt Trinh
            if (username.includes('trinh') || fullname.includes('trinh') || fullname.includes('lê việt trinh') || fullname.includes('le viet trinh')) {
                return true;
            }

            // All other staff (nhân viên), trưởng phòng, quản lý khác: FALSE
            return false;
        } catch (e) {
            return true;
        }
    }

    function _xldlFormatDateTime(isoStr) {
        let d;
        if (!isoStr) {
            d = new Date();
        } else {
            d = new Date(isoStr);
            if (isNaN(d.getTime())) d = new Date();
        }

        try {
            const options = {
                timeZone: 'Asia/Ho_Chi_Minh',
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            };
            const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(d);
            let hh = '00', mm = '00', DD = '01', MM = '01', YYYY = '2026';
            for (const p of parts) {
                if (p.type === 'hour') hh = p.value;
                if (p.type === 'minute') mm = p.value;
                if (p.type === 'day') DD = p.value;
                if (p.type === 'month') MM = p.value;
                if (p.type === 'year') YYYY = p.value;
            }
            return `${hh}:${mm} ${DD}/${MM}/${YYYY}`;
        } catch (e) {
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            const DD = String(d.getDate()).padStart(2, '0');
            const MM = String(d.getMonth() + 1).padStart(2, '0');
            const YYYY = d.getFullYear();
            return `${hh}:${mm} ${DD}/${MM}/${YYYY}`;
        }
    }

    // Helper to format link title: Auto space after "X." and Capitalize Each Word
    window._xldlFormatTitle = function(str) {
        if (!str) return '';
        let trimmed = str.trim();

        // 1. Ensure space after STT dot (e.g., "2.Tư duy" -> "2. Tư duy")
        trimmed = trimmed.replace(/^(\d+\.)\s*/, '$1 ');

        // 2. Capitalize First Letter of Each Word
        const match = trimmed.match(/^(\d+\.\s*)(.*)$/);
        let prefix = '';
        let body = trimmed;
        if (match) {
            prefix = match[1];
            body = match[2];
        }

        const words = body.split(/\s+/);
        const capitalizedBody = words.map(w => {
            if (!w) return '';
            return w.split(/([\/\-\&])/).map(part => {
                if (part === '/' || part === '-' || part === '&') return part;
                if (!part) return '';
                return part.charAt(0).toUpperCase() + part.slice(1);
            }).join('');
        }).join(' ');

        return prefix + capitalizedBody;
    };

    // Input handlers to PREVENT deleting STT prefix (e.g. "2. ")
    window._xldlOnTitleInput = function(inputEl) {
        if (!inputEl) return;
        const prefix = inputEl.dataset.prefix || '';
        if (!prefix) return;

        let val = inputEl.value;
        if (!val.startsWith(prefix)) {
            const cleanBody = val.replace(/^\d*[\.\s]*/, '');
            inputEl.value = prefix + cleanBody;
            if (inputEl.selectionStart < prefix.length) {
                inputEl.setSelectionRange(prefix.length, prefix.length);
            }
        }
    };

    window._xldlOnTitleKeyDown = function(e, inputEl) {
        if (!inputEl) return;
        const prefix = inputEl.dataset.prefix || '';
        if (!prefix) return;

        const selStart = inputEl.selectionStart;
        const selEnd = inputEl.selectionEnd;

        if (e.key === 'Backspace' && selStart <= prefix.length && selEnd <= prefix.length) {
            e.preventDefault();
            inputEl.setSelectionRange(prefix.length, prefix.length);
            return;
        }

        if (e.key === 'Delete' && selStart < prefix.length) {
            e.preventDefault();
            inputEl.setSelectionRange(prefix.length, prefix.length);
            return;
        }

        if (selStart < prefix.length && selEnd > prefix.length) {
            if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                const textAfterPrefix = inputEl.value.slice(selEnd);
                inputEl.value = prefix + textAfterPrefix;
                inputEl.setSelectionRange(prefix.length, prefix.length);
            }
        }
    };

    window._xldlOnTitleClick = function(inputEl) {
        if (!inputEl) return;
        const prefix = inputEl.dataset.prefix || '';
        if (!prefix) return;
        if (inputEl.selectionStart < prefix.length) {
            inputEl.setSelectionRange(prefix.length, prefix.length);
        }
    };

    function _xldlGetNextSubtabSTT(subtabId) {
        if (!subtabId) return 1;
        let links = [];
        if (subtabId === 'knowledge' || subtabId === 'htkt') {
            links = _xldlGetHtktLinks();
        } else if (subtabId === 'test_kNM' || subtabId === 'knm') {
            links = _xldlGetKnmLinks();
        } else {
            links = _xldlGetCustomSubtabLinks(subtabId);
        }
        return (links ? links.length : 0) + 1;
    }

    // Event handler when Danh Mục (Subtab) selection changes in Modal
    window._xldlOnFormSubtabChange = function(selectedCategories = null) {
        const subSelect = document.getElementById('xldlFormSubtab');
        const box = document.getElementById('xldlFormCategoryCheckboxes');
        if (!subSelect || !box) return;

        const subId = subSelect.value;
        let scope = 'muc2_probation';
        if (currentMainTab === 'muc3_official' || currentMainTab === 'muc2') {
            scope = 'muc3_official';
        } else if (currentMainTab === 'muc1_error' || currentMainTab === 'muc3') {
            scope = 'muc1_error';
        } else if (subId === 'test_kNM' || subId === 'knm') {
            scope = 'knm';
        } else if (subId === 'knowledge' || subId === 'htkt') {
            scope = 'htkt';
        }

        // Auto update STT prefix if creating a new link
        const linkIdInput = document.getElementById('xldlFormLinkId');
        const isEdit = linkIdInput && linkIdInput.value;
        if (!isEdit && subId) {
            const titleInput = document.getElementById('xldlFormTitle');
            if (titleInput) {
                const nextNum = _xldlGetNextSubtabSTT(subId);
                const prefix = `${nextNum}. `;
                const curVal = (titleInput.value || '').trim();
                const bodyText = curVal.replace(/^\d+[\.\s]*/, '');
                titleInput.dataset.prefix = prefix;
                titleInput.value = `${prefix}${bodyText}`;
            }
        }

        // Toggle Muc 1 Extra Fields & Tab 2 Button & URL Mandatory status in Modal
        const tabBtnScript = document.getElementById('xldlTabBtnScript');
        const urlLabel = document.getElementById('xldlUrlLabel');
        const urlInput = document.getElementById('xldlFormUrl');

        const isMuc1 = scope === 'muc1_error' || currentMainTab === 'muc1_error' || currentMainTab === 'muc1' || subId === 'muc1';
        if (tabBtnScript) {
            tabBtnScript.style.display = isMuc1 ? 'block' : 'none';
            tabBtnScript.innerHTML = isMuc1 ? '📋 TAB 2: Kịch Bản & Bảo Hành*' : '📋 TAB 2: Kịch Bản & Bảo Hành';
        }
        if (urlLabel) {
            urlLabel.innerHTML = isMuc1 ? 'Đường link URL (không bắt buộc cho Mục 1):' : 'Đường link URL (* BẮT BUỘC):';
        }
        if (urlInput) {
            if (isMuc1) {
                urlInput.removeAttribute('required');
            } else {
                urlInput.setAttribute('required', 'required');
            }
        }
        // Always reset to Tab 1 basic when subtab changes
        window._xldlSwitchModalTab('basic');

        const cats = _xldlGetCategories(scope);

        let selectedArr = [];
        if (Array.isArray(selectedCategories)) {
            selectedArr = selectedCategories;
        } else if (typeof selectedCategories === 'string' && selectedCategories) {
            selectedArr = [selectedCategories];
        }

        if (cats.length === 0) {
            box.innerHTML = `<div style="color:#64748b; font-size:13px; font-weight:600; padding:4px;">Chưa có lĩnh vực nào. Hãy bấm Cài Đặt Lĩnh Vực để tạo thêm!</div>`;
            return;
        }

        box.innerHTML = cats.map(c => {
            const isChecked = selectedArr.includes(c);
            return `
                <label style="display:inline-flex; align-items:center; gap:7px; background:${isChecked ? '#e0f2fe' : '#ffffff'}; border:1.5px solid ${isChecked ? '#0284c7' : '#bae6fd'}; padding:7px 14px; border-radius:12px; font-size:13.5px; font-weight:800; color:${isChecked ? '#0369a1' : '#334155'}; cursor:pointer; user-select:none; transition:all 0.15s ease;">
                    <input type="checkbox" name="xldlCategoryCheck" value="${c.replace(/"/g, '&quot;')}" ${isChecked ? 'checked' : ''} style="width:16px; height:16px; accent-color:#0284c7; cursor:pointer;" onchange="this.parentElement.style.background=this.checked?'#e0f2fe':'#ffffff'; this.parentElement.style.borderColor=this.checked?'#0284c7':'#bae6fd'; this.parentElement.style.color=this.checked?'#0369a1':'#334155';">
                    <span>📌 ${c}</span>
                </label>
            `;
        }).join('');
    };

    // Helper functions for Modal Tabs & Muc 1 Extra Fields
    window._xldlSwitchModalTab = function(tabName) {
        const tabBasic = document.getElementById('xldlTabBtnBasic');
        const tabScript = document.getElementById('xldlTabBtnScript');
        const panelBasic = document.getElementById('xldlModalPanelBasic');
        const panelScript = document.getElementById('xldlModalPanelScript');

        if (!panelBasic || !panelScript) return;

        const fontStack = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

        if (tabName === 'basic') {
            panelBasic.style.display = 'block';
            panelScript.style.display = 'none';
            if (tabBasic) {
                tabBasic.style.background = '#0284c7';
                tabBasic.style.color = '#ffffff';
                tabBasic.style.border = 'none';
                tabBasic.style.boxShadow = '0 3px 10px rgba(2, 132, 199, 0.25)';
                tabBasic.style.fontFamily = fontStack;
                tabBasic.style.fontWeight = '800';
                tabBasic.style.fontSize = '14px';
            }
            if (tabScript) {
                tabScript.style.background = '#f8fafc';
                tabScript.style.color = '#0f172a';
                tabScript.style.border = '1.5px solid #cbd5e1';
                tabScript.style.boxShadow = 'none';
                tabScript.style.fontFamily = fontStack;
                tabScript.style.fontWeight = '800';
                tabScript.style.fontSize = '14px';
            }
        } else {
            panelBasic.style.display = 'none';
            panelScript.style.display = 'block';
            if (tabBasic) {
                tabBasic.style.background = '#f8fafc';
                tabBasic.style.color = '#0f172a';
                tabBasic.style.border = '1.5px solid #cbd5e1';
                tabBasic.style.boxShadow = 'none';
                tabBasic.style.fontFamily = fontStack;
                tabBasic.style.fontWeight = '800';
                tabBasic.style.fontSize = '14px';
            }
            if (tabScript) {
                tabScript.style.background = '#16a34a';
                tabScript.style.color = '#ffffff';
                tabScript.style.border = 'none';
                tabScript.style.boxShadow = '0 3px 10px rgba(22, 163, 74, 0.25)';
                tabScript.style.fontFamily = fontStack;
                tabScript.style.fontWeight = '800';
                tabScript.style.fontSize = '14px';
            }
        }
    };

    window._xldlCapitalizeFirstLetter = function(el) {
        if (!el || !el.value) return;
        const val = el.value;
        const firstChar = val.charAt(0);
        const upperFirst = firstChar.toUpperCase();
        if (firstChar !== upperFirst) {
            const start = el.selectionStart;
            const end = el.selectionEnd;
            el.value = upperFirst + val.slice(1);
            if (typeof start === 'number' && typeof end === 'number') {
                el.setSelectionRange(start, end);
            }
        }
    };

    window._xldlOnStepsFocus = function(el) {
        if (!el.value || !el.value.trim()) {
            el.value = 'Bước 1: ';
        }
    };

    window._xldlOnStepsKeyDown = function(e, el) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = el.value;
            const lines = val.split('\n');
            const nextStepNum = lines.length + 1;
            const prefix = `\nBước ${nextStepNum}: `;
            
            const start = el.selectionStart;
            const end = el.selectionEnd;
            el.value = val.substring(0, start) + prefix + val.substring(end);
            el.selectionStart = el.selectionEnd = start + prefix.length;
        }
    };

    window._xldlOnStepsInput = function(el) {
        if (!el) return;

        // Auto-expand height to fit content like Image 2
        el.style.height = 'auto';
        el.style.height = Math.max(220, el.scrollHeight + 4) + 'px';

        if (!el.value) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        
        let val = el.value;
        const lines = val.split('\n');
        let formatted = false;

        const newLines = lines.map(line => {
            const m = line.match(/^(Bước\s+\d+\s*:\s*)(.*)$/i);
            if (m) {
                const prefix = m[1];
                const content = m[2];
                if (content && content.length > 0) {
                    const firstChar = content.charAt(0);
                    const upperFirst = firstChar.toUpperCase();
                    if (firstChar !== upperFirst) {
                        formatted = true;
                        return prefix + upperFirst + content.slice(1);
                    }
                }
            }
            return line;
        });

        if (formatted) {
            el.value = newLines.join('\n');
            if (typeof start === 'number' && typeof end === 'number') {
                el.setSelectionRange(start, end);
            }
        }
    };

    window._xldlAddStepLine = function() {
        const el = document.getElementById('xldlFormSteps');
        if (!el) return;
        if (!el.value || !el.value.trim()) {
            el.value = 'Bước 1: ';
            el.focus();
            return;
        }
        const lines = el.value.split('\n').filter(l => l.trim());
        const nextNum = lines.length + 1;
        el.value = el.value.trim() + `\nBước ${nextNum}: `;
        el.focus();
    };

    window._xldlAddSaleGuideRow = function(goal = '', question = '') {
        const container = document.getElementById('xldlSaleGuideContainer');
        if (!container) return;
        const index = container.children.length + 1;
        const div = document.createElement('div');
        div.className = 'xldl-sale-guide-item';
        div.style.cssText = 'background:#ffffff; border:1.5px solid #bfdbfe; border-radius:12px; padding:10px 12px; position:relative;';

        const formattedGoal = goal ? (goal.charAt(0).toUpperCase() + goal.slice(1)) : '';
        const escapeHTML = str => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="font-size:12px; font-weight:850; color:#1d4ed8;">📌 Câu hỏi & Mục tiêu ${index}</span>
                <button type="button" onclick="this.parentElement.parentElement.remove()" style="background:#fee2e2; color:#dc2626; border:none; border-radius:6px; padding:2px 8px; font-size:11px; font-weight:800; cursor:pointer;">❌ Xóa</button>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
                <textarea class="xldl-guide-goal" rows="2" placeholder="Mục tiêu câu hỏi ${index}: (Ví dụ: Xác định số lượng áo lỗi)" style="width:100%; border:1px solid #cbd5e1; border-radius:8px; padding:6px 10px; font-size:12.5px; font-weight:700; color:#1e293b; resize:vertical; min-height:42px; font-family:inherit; line-height:1.45; box-sizing:border-box;" oninput="window._xldlCapitalizeFirstLetter(this); this.style.height='auto'; this.style.height=(this.scrollHeight)+'px';">${escapeHTML(formattedGoal)}</textarea>
                <textarea class="xldl-guide-question" rows="3" placeholder="Câu Hỏi ${index}: (Ví dụ: Anh/Chị cho em xin giúp hình ảnh hoặc video...)" style="width:100%; border:1.5px solid #93c5fd; border-radius:8px; padding:8px 10px; font-size:13px; font-weight:700; color:#1e40af; background:#eff6ff; resize:vertical; min-height:65px; font-family:inherit; line-height:1.5; box-sizing:border-box;" oninput="this.style.height='auto'; this.style.height=(this.scrollHeight)+'px';">${escapeHTML(question)}</textarea>
            </div>
        `;
        container.appendChild(div);

        setTimeout(() => {
            const goalEl = div.querySelector('.xldl-guide-goal');
            const qEl = div.querySelector('.xldl-guide-question');
            if (goalEl && goalEl.value) { goalEl.style.height = 'auto'; goalEl.style.height = goalEl.scrollHeight + 'px'; }
            if (qEl && qEl.value) { qEl.style.height = 'auto'; qEl.style.height = qEl.scrollHeight + 'px'; }
        }, 10);
    };

    window._xldlAddWarrantyRow = function(text = '') {
        const container = document.getElementById('xldlWarrantyContainer');
        if (!container) return;
        const index = container.children.length + 1;
        const div = document.createElement('div');
        div.className = 'xldl-warranty-item';
        div.style.cssText = 'display:flex; align-items:flex-start; gap:8px; background:#ffffff; border:1.5px solid #e9d5ff; border-radius:10px; padding:8px 10px;';

        const escapeHTML = str => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        div.innerHTML = `
            <span style="font-size:12px; font-weight:850; color:#7e22ce; white-space:nowrap; margin-top:6px;">Bảo Hành ${index}:</span>
            <textarea class="xldl-warranty-text" rows="2" placeholder="Nội dung bảo hành ${index}" style="flex:1; border:1px solid #d8b4fe; border-radius:8px; padding:6px 10px; font-size:13px; font-weight:700; color:#581c87; resize:vertical; min-height:45px; font-family:inherit; line-height:1.45; box-sizing:border-box;" oninput="this.style.height='auto'; this.style.height=(this.scrollHeight)+'px';">${escapeHTML(text)}</textarea>
            <button type="button" onclick="this.parentElement.remove()" style="background:#fee2e2; color:#dc2626; border:none; border-radius:6px; padding:4px 8px; font-size:11px; font-weight:800; cursor:pointer; margin-top:6px;">❌</button>
        `;
        container.appendChild(div);

        setTimeout(() => {
            const wEl = div.querySelector('.xldl-warranty-text');
            if (wEl && wEl.value) { wEl.style.height = 'auto'; wEl.style.height = wEl.scrollHeight + 'px'; }
        }, 10);
    };

    // Modal Link Functions
    window._xldlOpenAddLinkModal = function(target = null) {
        if (!_xldlCanManage()) {
            alert('Chỉ Giám Đốc và Quản Lý Cấp Cao Lê Việt Trinh mới có quyền tạo đường link mới!');
            return;
        }
        let scope = 'muc2_probation';
        if (currentMainTab === 'muc3_official' || currentMainTab === 'muc2') {
            scope = 'muc3_official';
            if (!target) target = currentSubTab2;
        } else if (currentMainTab === 'muc1_error' || currentMainTab === 'muc3') {
            scope = 'muc1_error';
            if (!target) target = 'all_dept';
        } else {
            if (!target) target = currentSubTab1;
        }
        currentEditingTarget = target;

        const modal = document.getElementById('xldlLinkModal');
        if (!modal) return;

        // Populate Subtabs Dropdown (Danh Mục - Lấy đúng Scope theo Tab Đang Mở)
        const subtabs = _xldlGetSubtabs(scope);
        const subSelect = document.getElementById('xldlFormSubtab');
        const currentSel = target || (subtabs[0] ? subtabs[0].id : '');

        if (subSelect) {
            subSelect.innerHTML = `<option value="">-- Chọn Danh Mục (* BẮT BUỘC) --</option>` + 
                subtabs.map(s => `<option value="${s.id}" ${s.id === currentSel ? 'selected' : ''}>📁 ${s.title}</option>`).join('');
        }

        const nextNum = _xldlGetNextSubtabSTT(currentSel);
        const prefix = `${nextNum}. `;
        const titleInput = document.getElementById('xldlFormTitle');

        document.getElementById('xldlModalTitle').innerText = `➕ TẠO ĐƯỜNG LINK TÀI LIỆU MỚI`;
        document.getElementById('xldlFormLinkId').value = '';
        if (titleInput) {
            titleInput.dataset.prefix = prefix;
            titleInput.value = prefix;
        }
        document.getElementById('xldlFormSubtitle').value = '';
        document.getElementById('xldlFormUrl').value = '';
        document.getElementById('xldlFormIcon').value = (target === 'htkt' || target === 'knowledge') ? '📚' : '📊';
        document.getElementById('xldlFormTheme').value = (target === 'htkt' || target === 'knowledge') ? 'blue' : 'green';

        const stepsEl = document.getElementById('xldlFormSteps');
        if (stepsEl) {
            stepsEl.value = 'Bước 1: ';
            setTimeout(() => window._xldlOnStepsInput(stepsEl), 50);
        }

        // Switch to Tab 1 basic on open
        window._xldlSwitchModalTab('basic');

        // Trigger change to populate Categories Checkboxes (Lĩnh Vực)
        window._xldlOnFormSubtabChange();

        modal.style.display = 'flex';
    };

    window._xldlOpenEditLinkModal = function(id, target = null) {
        let scope = 'muc2_probation';
        if (currentMainTab === 'muc3_official' || currentMainTab === 'muc2') {
            scope = 'muc3_official';
            if (!target) target = currentSubTab2;
        } else if (currentMainTab === 'muc1_error' || currentMainTab === 'muc3') {
            scope = 'muc1_error';
            if (!target) target = 'all_dept';
        } else {
            if (!target) target = currentSubTab1;
        }
        currentEditingTarget = target;

        let item = null;
        if (id.startsWith('htkt_')) {
            const links = _xldlGetHtktLinks();
            item = links.find(l => String(l.id) === String(id));
            target = 'knowledge';
        } else if (id.startsWith('knm_')) {
            const links = _xldlGetKnmLinks();
            item = links.find(l => String(l.id) === String(id));
            target = 'test_kNM';
        } else {
            if (target) {
                const links = _xldlGetCustomSubtabLinks(target);
                item = links.find(l => String(l.id) === String(id));
            }
            if (!item) {
                const allSubtabs = _xldlGetSubtabs(scope);
                for (const sub of allSubtabs) {
                    const links = _xldlGetCustomSubtabLinks(sub.id);
                    const found = links.find(l => String(l.id) === String(id));
                    if (found) {
                        item = found;
                        target = sub.id;
                        break;
                    }
                }
            }
        }

        if (!item) return;

        const modal = document.getElementById('xldlLinkModal');
        if (!modal) return;
        document.getElementById('xldlModalTitle').innerText = '✏️ CHỈNH SỬA ĐƯỜNG LINK TÀI LIỆU';
        document.getElementById('xldlFormLinkId').value = item.id;

        const titleInput = document.getElementById('xldlFormTitle');
        if (titleInput) {
            const match = (item.title || '').match(/^(\d+\.\s*)/);
            titleInput.dataset.prefix = match ? match[1] : '';
            titleInput.value = item.title || '';
        }
        document.getElementById('xldlFormSubtitle').value = item.subtitle || '';
        document.getElementById('xldlFormUrl').value = item.url || '';
        document.getElementById('xldlFormIcon').value = item.icon || '📊';
        document.getElementById('xldlFormTheme').value = item.theme || 'green';

        // Populate Subtabs Dropdown (Danh Mục) cho đúng Scope
        const subtabs = _xldlGetSubtabs(scope);
        const subSelect = document.getElementById('xldlFormSubtab');
        if (subSelect) {
            subSelect.innerHTML = `<option value="">-- Chọn Danh Mục (* BẮT BUỘC) --</option>` + 
                subtabs.map(s => `<option value="${s.id}" ${s.id === target ? 'selected' : ''}>📁 ${s.title}</option>`).join('');
        }

        // Populate Muc 1 Extra Fields (TAB 2)
        const stepsEl = document.getElementById('xldlFormSteps');
        if (stepsEl) {
            if (Array.isArray(item.steps) && item.steps.length > 0) {
                stepsEl.value = item.steps.join('\n');
            } else if (typeof item.steps === 'string' && item.steps.trim()) {
                stepsEl.value = item.steps;
            } else if (typeof item.fix_guide === 'string' && item.fix_guide.trim()) {
                stepsEl.value = item.fix_guide;
            } else {
                stepsEl.value = 'Bước 1: ';
            }
            setTimeout(() => window._xldlOnStepsInput(stepsEl), 50);
        }

        const guideBox = document.getElementById('xldlSaleGuideContainer');
        if (guideBox) {
            guideBox.innerHTML = '';
            const guides = item.saleGuide || item.sale_guide;
            if (Array.isArray(guides) && guides.length > 0) {
                guides.forEach(g => {
                    if (typeof g === 'object' && g !== null) {
                        window._xldlAddSaleGuideRow(g.goal || g.objective || '', g.question || g.text || '');
                    } else {
                        window._xldlAddSaleGuideRow('', String(g));
                    }
                });
            } else if (typeof guides === 'string' && guides.trim()) {
                window._xldlAddSaleGuideRow('', guides);
            } else {
                window._xldlAddSaleGuideRow();
            }
        }

        const warrantyBox = document.getElementById('xldlWarrantyContainer');
        if (warrantyBox) {
            warrantyBox.innerHTML = '';
            const warrs = item.warranty || item.resps || item.responsibility;
            if (Array.isArray(warrs) && warrs.length > 0) {
                warrs.forEach(w => {
                    if (typeof w === 'string') {
                        window._xldlAddWarrantyRow(w);
                    } else if (typeof w === 'object' && w !== null) {
                        window._xldlAddWarrantyRow(w.text || w.content || w.title || JSON.stringify(w));
                    }
                });
            } else if (typeof warrs === 'string' && warrs.trim()) {
                window._xldlAddWarrantyRow(warrs);
            } else {
                window._xldlAddWarrantyRow();
            }
        }

        // Trigger change to populate Categories Checkboxes with existing selected categories
        window._xldlOnFormSubtabChange(item.categories || item.category);

        modal.style.display = 'flex';
    };

    window._xldlCloseLinkModal = function() {
        const modal = document.getElementById('xldlLinkModal');
        if (modal) modal.style.display = 'none';
    };

    function _xldlEnsureDetailModalInDOM() {
        let modal = document.getElementById('xldlDetailModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'xldl-modal-overlay';
            modal.id = 'xldlDetailModal';
            modal.style.cssText = 'display:none; z-index:1050;';
            modal.innerHTML = `
                <div class="xldl-modal-card" style="max-height:90vh; display:flex; flex-direction:column; width:100%; max-width:720px; border-radius:24px; overflow:hidden; background:#ffffff; box-shadow:0 25px 50px -12px rgba(0,0,0,0.35); border:1.5px solid #bfdbfe;">
                    <!-- Modal Header Cố Định -->
                    <div id="xldlDetailModalHeader" style="flex-shrink:0; padding:20px 26px; background:linear-gradient(135deg, #1e3a8a, #2563eb); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <span id="xldlDetailIcon" style="font-size:26px; background:rgba(255,255,255,0.2); padding:8px 12px; border-radius:14px;">📖</span>
                            <div>
                                <h3 id="xldlDetailTitle" style="margin:0; font-size:18px; font-weight:900; color:#ffffff; line-height:1.3;">Chi Tiết Tài Liệu Kịch Bản</h3>
                                <div id="xldlDetailCategories" style="display:flex; flex-wrap:wrap; gap:6px; margin-top:6px;"></div>
                            </div>
                        </div>
                        <button class="xldl-modal-close" onclick="window._xldlCloseDetailModal()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:34px; height:34px; border-radius:50%; cursor:pointer; font-size:18px; font-weight:bold;">✕</button>
                    </div>

                    <!-- Modal Body Cuộn Độc Lập -->
                    <div class="xldl-modal-body" style="flex:1; overflow-y:auto; padding:22px 26px; display:flex; flex-direction:column; gap:18px; background:#f8fafc;">
                        <!-- Mô Tả Tình Huống -->
                        <div id="xldlDetailSubtitleBox" style="display:none; background:#ffffff; border:1.5px solid #e2e8f0; border-radius:16px; padding:16px 20px; box-shadow:0 2px 8px rgba(0,0,0,0.03);">
                            <div style="font-size:13px; font-weight:850; color:#334155; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                                <span>📝 MÔ TẢ TÌNH HUỐNG / SỰ CỐ:</span>
                            </div>
                            <div id="xldlDetailSubtitleText" style="font-size:14px; font-weight:600; color:#1e293b; line-height:1.65; white-space:pre-line;"></div>
                        </div>

                        <!-- 1. QUY TRÌNH XỬ LÝ TỪNG BƯỚC -->
                        <div id="xldlDetailStepsBox" style="display:none; background:linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border:1.5px solid #86efac; border-radius:18px; padding:18px 20px; box-shadow:0 4px 14px rgba(22, 163, 74, 0.08);">
                            <div style="font-size:14px; font-weight:900; color:#14532d; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                                <span style="font-size:18px;">📋</span> QUY TRÌNH XỬ LÝ TỪNG BƯỚC (STEP-BY-STEP)
                            </div>
                            <div id="xldlDetailStepsList" style="display:flex; flex-direction:column; gap:10px;"></div>
                        </div>

                        <!-- 2. HƯỚNG DẪN SALE TRAO ĐỔI VỚI KHÁCH -->
                        <div id="xldlDetailGuideBox" style="display:none; background:linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border:1.5px solid #93c5fd; border-radius:18px; padding:18px 20px; box-shadow:0 4px 14px rgba(37, 99, 235, 0.08);">
                            <div style="font-size:14px; font-weight:900; color:#1e3a8a; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                                <span style="font-size:18px;">🗣️</span> HƯỚNG DẪN SALE TRAO ĐỔI VỚI KHÁCH
                            </div>
                            <div id="xldlDetailGuideList" style="display:flex; flex-direction:column; gap:12px;"></div>
                        </div>

                        <!-- 3. TRÁCH NHIỆM & BẢO HÀNH -->
                        <div id="xldlDetailWarrantyBox" style="display:none; background:linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border:1.5px solid #d8b4fe; border-radius:18px; padding:18px 20px; box-shadow:0 4px 14px rgba(168, 85, 247, 0.08);">
                            <div style="font-size:14px; font-weight:900; color:#581c87; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                                <span style="font-size:18px;">⚖️</span> TRÁCH NHIỆM & BẢO HÀNH
                            </div>
                            <div id="xldlDetailWarrantyList" style="display:flex; flex-direction:column; gap:8px;"></div>
                        </div>

                        <!-- Meta Info Footer -->
                        <div id="xldlDetailMetaInfo" style="font-size:11.5px; color:#64748b; font-weight:700; background:#ffffff; padding:10px 16px; border-radius:12px; border:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                            <div>👤 Người tạo/cập nhật: <strong id="xldlDetailUser" style="color:#0f172a;">Giám Đốc</strong></div>
                            <div>🕒 Thời gian: <span id="xldlDetailTime" style="color:#475569;">Vừa xong</span></div>
                        </div>
                    </div>

                    <!-- Modal Footer Cố Định -->
                    <div class="xldl-modal-footer" style="flex-shrink:0; padding:16px 26px; background:#ffffff; border-top:1.5px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; gap:12px;">
                        <button class="xldl-btn secondary" onclick="window._xldlCloseDetailModal()" style="padding:10px 22px; border-radius:12px; font-weight:800;">Đóng Window</button>
                        <div id="xldlDetailFooterAction"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    }

    window._xldlOpenDetailModal = function(id, target = null) {
        let item = null;
        let scope = 'muc1_error';
        if (currentMainTab === 'muc3_official' || currentMainTab === 'muc2') {
            scope = 'muc3_official';
        } else if (currentMainTab === 'muc1_error' || currentMainTab === 'muc3') {
            scope = 'muc1_error';
        }

        if (id.startsWith('htkt_')) {
            const links = _xldlGetHtktLinks();
            item = links.find(l => String(l.id) === String(id));
        } else if (id.startsWith('knm_')) {
            const links = _xldlGetKnmLinks();
            item = links.find(l => String(l.id) === String(id));
        } else {
            if (target) {
                const links = _xldlGetCustomSubtabLinks(target);
                item = links.find(l => String(l.id) === String(id));
            }
            if (!item) {
                const allSubtabs = _xldlGetSubtabs(scope);
                for (const sub of allSubtabs) {
                    const links = _xldlGetCustomSubtabLinks(sub.id);
                    const found = links.find(l => String(l.id) === String(id));
                    if (found) {
                        item = found;
                        break;
                    }
                }
            }
        }

        if (!item) return;

        const modal = _xldlEnsureDetailModalInDOM();

        // Title & Icon
        document.getElementById('xldlDetailIcon').innerText = item.icon || '📖';
        document.getElementById('xldlDetailTitle').innerText = _xldlFormatTitle(item.title || 'Chi Tiết Kịch Bản');

        // Categories Badges
        const catsBox = document.getElementById('xldlDetailCategories');
        const cats = _xldlGetLinkCategories(item);
        if (catsBox) {
            catsBox.innerHTML = cats.map(c => `<span style="background:rgba(255,255,255,0.25); color:#ffffff; border:1px solid rgba(255,255,255,0.4); padding:2px 8px; border-radius:6px; font-size:11.5px; font-weight:800;">📌 ${c}</span>`).join('');
        }

        // Subtitle / Description
        const subtitleBox = document.getElementById('xldlDetailSubtitleBox');
        const subtitleText = document.getElementById('xldlDetailSubtitleText');
        if (item.subtitle && item.subtitle.trim()) {
            subtitleText.innerHTML = _xldlFormatDescription(item.subtitle);
            subtitleBox.style.display = 'block';
        } else {
            subtitleBox.style.display = 'none';
        }

        // 1. Steps (Quy Trình Xử Lý Từng Bước)
        let steps = [];
        if (Array.isArray(item.steps) && item.steps.length > 0) {
            steps = item.steps;
        } else if (typeof item.steps === 'string' && item.steps.trim()) {
            steps = item.steps.split('\n').filter(Boolean);
        } else if (typeof item.fix_guide === 'string' && item.fix_guide.trim()) {
            steps = item.fix_guide.split('\n').filter(Boolean);
        }

        const stepsBox = document.getElementById('xldlDetailStepsBox');
        const stepsList = document.getElementById('xldlDetailStepsList');
        if (steps.length > 0) {
            stepsList.innerHTML = steps.map((s, idx) => {
                const txt = typeof s === 'string' ? s : (s.text || s.step || JSON.stringify(s));
                const matchStep = txt.match(/^Bước\s+\d+/i);
                const stepBadge = matchStep ? matchStep[0] : `Bước ${idx + 1}`;
                const stepContent = txt.replace(/^Bước\s+\d+\s*:\s*/i, '');
                return `
                    <div style="background:#ffffff; border:1.5px solid #bbf7d0; border-radius:12px; padding:12px 16px; display:flex; align-items:flex-start; gap:12px; box-shadow:0 2px 6px rgba(22,163,74,0.05);">
                        <div style="background:#16a34a; color:#ffffff; font-size:12px; font-weight:900; padding:4px 10px; border-radius:20px; white-space:nowrap; flex-shrink:0; margin-top:2px;">${stepBadge}</div>
                        <div style="font-size:14px; font-weight:700; color:#14532d; line-height:1.55; flex:1;">${stepContent}</div>
                    </div>
                `;
            }).join('');
            stepsBox.style.display = 'block';
        } else {
            stepsBox.style.display = 'none';
        }

        // 2. Sale Guide (Hướng Dẫn Sale Trao Đổi)
        let saleGuide = [];
        if (Array.isArray(item.saleGuide) && item.saleGuide.length > 0) {
            saleGuide = item.saleGuide;
        } else if (Array.isArray(item.sale_guide) && item.sale_guide.length > 0) {
            saleGuide = item.sale_guide;
        } else if (typeof item.sale_guide === 'string' && item.sale_guide.trim()) {
            saleGuide = [{ question: item.sale_guide }];
        }

        const guideBox = document.getElementById('xldlDetailGuideBox');
        const guideList = document.getElementById('xldlDetailGuideList');
        if (saleGuide.length > 0) {
            guideList.innerHTML = saleGuide.map((sg, idx) => {
                if (typeof sg === 'object' && sg !== null) {
                    const goalTxt = sg.goal || sg.objective || sg.target || '';
                    const questionTxt = sg.question || sg.text || sg.content || '';
                    const cleanQ = _xldlCleanQuestionText(questionTxt);
                    return `
                        <div style="background:#ffffff; border:1.5px solid #bfdbfe; border-radius:14px; padding:14px 16px; display:flex; flex-direction:column; gap:8px; box-shadow:0 2px 8px rgba(37,99,235,0.05);">
                            ${goalTxt ? `
                                <div style="display:inline-flex; align-items:center; gap:6px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:4px 12px; border-radius:8px; font-size:12.5px; font-weight:850; width:fit-content;">
                                    <span>🎯 Mục tiêu câu hỏi ${idx + 1}:</span>
                                    <span>${goalTxt}</span>
                                </div>
                            ` : ''}
                            ${questionTxt ? `
                                <div style="background:#f8fafc; border-left:4px solid #2563eb; padding:10px 14px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
                                    <div style="font-size:13.5px; font-weight:750; color:#1e3a8a; line-height:1.55; flex:1;">
                                        🗣️ <strong>Câu Hỏi ${idx + 1}:</strong> "${cleanQ}"
                                    </div>
                                    <button type="button" onclick="event.stopPropagation(); window._xldlCopyQuestionText(\`${cleanQ.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`)" style="background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color:#ffffff; border:none; padding:6px 14px; border-radius:8px; font-size:12px; font-weight:850; cursor:pointer; display:inline-flex; align-items:center; gap:4px; flex-shrink:0; box-shadow:0 2px 6px rgba(37,99,235,0.25); transition:all 0.2s ease;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'" title="Sao chép nội dung câu hỏi">
                                        📋 Copy
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    `;
                } else {
                    const rawStr = String(sg);
                    const cleanQ = _xldlCleanQuestionText(rawStr);
                    return `
                        <div style="background:#ffffff; border:1.5px solid #bfdbfe; border-radius:12px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
                            <div style="font-size:13.5px; font-weight:750; color:#1e3a8a; flex:1;">
                                🗣️ ${rawStr}
                            </div>
                            <button type="button" onclick="event.stopPropagation(); window._xldlCopyQuestionText(\`${cleanQ.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`)" style="background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color:#ffffff; border:none; padding:6px 14px; border-radius:8px; font-size:12px; font-weight:850; cursor:pointer; display:inline-flex; align-items:center; gap:4px; flex-shrink:0; box-shadow:0 2px 6px rgba(37,99,235,0.25);" title="Sao chép nội dung câu hỏi">
                                📋 Copy
                            </button>
                        </div>
                    `;
                }
            }).join('');
            guideBox.style.display = 'block';
        } else {
            guideBox.style.display = 'none';
        }

        // 3. Warranty (Trách Nhiệm & Bảo Hành)
        let warranty = [];
        if (Array.isArray(item.warranty) && item.warranty.length > 0) {
            warranty = item.warranty;
        } else if (Array.isArray(item.resps) && item.resps.length > 0) {
            warranty = item.resps;
        } else if (Array.isArray(item.responsibility) && item.responsibility.length > 0) {
            warranty = item.responsibility;
        } else if (typeof item.responsibility === 'string' && item.responsibility.trim()) {
            warranty = [item.responsibility];
        }

        const warrantyBox = document.getElementById('xldlDetailWarrantyBox');
        const warrantyList = document.getElementById('xldlDetailWarrantyList');
        if (warranty.length > 0) {
            warrantyList.innerHTML = warranty.map((w, idx) => {
                const txt = typeof w === 'string' ? w : (w.text || w.content || w.title || JSON.stringify(w));
                return `
                    <div style="background:#ffffff; border:1.5px solid #e9d5ff; border-radius:12px; padding:10px 14px; display:flex; align-items:center; gap:10px; font-size:13.5px; font-weight:750; color:#581c87;">
                        <span style="background:#7e22ce; color:#ffffff; font-size:11px; font-weight:900; padding:2px 8px; border-radius:6px; white-space:nowrap;">Bảo Hành ${idx + 1}</span>
                        <div style="flex:1;">${txt}</div>
                    </div>
                `;
            }).join('');
            warrantyBox.style.display = 'block';
        } else {
            warrantyBox.style.display = 'none';
        }

        // Meta Info
        document.getElementById('xldlDetailUser').innerText = item.updatedBy || item.createdBy || 'Giám Đốc';
        document.getElementById('xldlDetailTime').innerText = _xldlFormatDateTime(item.updatedAt || item.createdAt);

        // Footer Actions: Show "🔗 Mở Bản Gốc Tài Liệu" ONLY if url is valid!
        const footerAction = document.getElementById('xldlDetailFooterAction');
        if (_xldlHasValidUrl(item.url)) {
            footerAction.innerHTML = `
                <a href="${item.url}" target="_blank" rel="noopener" class="xldl-btn primary" style="background:linear-gradient(135deg, #16a34a, #15803d); color:#ffffff; font-weight:900; padding:10px 20px; border-radius:12px; text-decoration:none; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 14px rgba(22,163,74,0.35);">
                    🔗 <span>Mở Bản Gốc Tài Liệu</span>
                </a>
            `;
        } else {
            footerAction.innerHTML = '';
        }

        modal.style.display = 'flex';
    };

    window._xldlCloseDetailModal = function() {
        const modal = document.getElementById('xldlDetailModal');
        if (modal) modal.style.display = 'none';
    };

    window._xldlSaveLinkFromModal = function() {
        const id = document.getElementById('xldlFormLinkId').value;
        const title = document.getElementById('xldlFormTitle').value.trim();
        const subtitle = document.getElementById('xldlFormSubtitle').value.trim();
        let url = document.getElementById('xldlFormUrl').value.trim();
        const icon = document.getElementById('xldlFormIcon').value;
        const theme = document.getElementById('xldlFormTheme').value;
        const subtabId = document.getElementById('xldlFormSubtab') ? document.getElementById('xldlFormSubtab').value : '';

        const checkedInputs = document.querySelectorAll('input[name="xldlCategoryCheck"]:checked');
        const categories = Array.from(checkedInputs).map(cb => cb.value);

        const isMuc1 = subtabId === 'muc1_error' || currentMainTab === 'muc1_error' || currentMainTab === 'muc1' || subtabId.includes('error') || (_xldlGetSubtabs('muc1_error') || []).some(s => s.id === subtabId);

        if (!subtabId) {
            alert('⚠️ BẮT BUỘC: Vui lòng chọn Danh Mục Đào Tạo!');
            return;
        }
        if (categories.length === 0) {
            alert('⚠️ BẮT BUỘC: Vui lòng chọn ít nhất 1 Lĩnh Vực Tài Liệu!');
            return;
        }
        if (!title) {
            alert('⚠️ BẮT BUỘC: Vui lòng nhập tiêu đề đường link!');
            window._xldlSwitchModalTab('basic');
            document.getElementById('xldlFormTitle').focus();
            return;
        }

        let finalTitle = title;
        if (!id && !/^\d+\.\s*/.test(finalTitle)) {
            const nextNum = _xldlGetNextSubtabSTT(subtabId);
            finalTitle = `${nextNum}. ${finalTitle}`;
        }
        finalTitle = _xldlFormatTitle(finalTitle);

        const category = categories[0] || 'Chung';

        // Read Muc 1 Extra Fields
        const stepsText = (document.getElementById('xldlFormSteps')?.value || '').trim();
        const steps = stepsText ? stepsText.split('\n').map(s => s.trim()).filter(Boolean) : [];

        const saleGuideItems = [];
        const guideRows = document.querySelectorAll('.xldl-sale-guide-item');
        guideRows.forEach(row => {
            const goal = (row.querySelector('.xldl-guide-goal')?.value || '').trim();
            const question = (row.querySelector('.xldl-guide-question')?.value || '').trim();
            if (goal || question) {
                saleGuideItems.push({ goal, question });
            }
        });

        const warrantyItems = [];
        const warrantyRows = document.querySelectorAll('.xldl-warranty-item');
        warrantyRows.forEach(row => {
            const text = (row.querySelector('.xldl-warranty-text')?.value || '').trim();
            if (text) {
                warrantyItems.push(text);
            }
        });

        const hasValidUrl = url !== '';
        const validSteps = steps.filter(s => s !== 'Bước 1:' && s !== 'Bước 2:' && s.length > 2);
        const validGuide = saleGuideItems.filter(g => (g.goal && g.goal.length > 2) || (g.question && g.question.length > 2));
        const validWarranty = warrantyItems.filter(w => w.length > 2);
        const hasFullTab2 = (validSteps.length > 0) && (validGuide.length > 0) && (validWarranty.length > 0);

        // Flexible Validation: Condition 1 (Valid URL present) OR Condition 2 (Full Tab 2 data filled)
        if (!hasValidUrl && !hasFullTab2) {
            let missingTab2Details = [];
            if (validSteps.length === 0) missingTab2Details.push('• 📋 QUY TRÌNH THỰC THI TỪNG BƯỚC');
            if (validGuide.length === 0) missingTab2Details.push('• 🗣️ HƯỚNG DẪN TRAO ĐỔI & CÂU HỎI MẪU');
            if (validWarranty.length === 0) missingTab2Details.push('• ⚖️ ĐIỀU KHOẢN QUY ĐỊNH & CAM KẾT');

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

        if (!hasValidUrl && hasFullTab2) {
            url = '#';
        }

        const currentUser = _xldlGetCurrentUser();
        const nowIso = new Date().toISOString();

        const isHtkt = subtabId === 'knowledge' || subtabId === 'htkt';
        const isKnm = subtabId === 'test_kNM' || subtabId === 'knm';

        let links = _xldlGetCustomSubtabLinks(subtabId);
        if (id) {
            if (currentEditingTarget && currentEditingTarget !== subtabId && !isHtkt && !isKnm) {
                let oldLinks = _xldlGetCustomSubtabLinks(currentEditingTarget);
                oldLinks = oldLinks.filter(l => l.id !== id);
                _xldlSaveCustomSubtabLinks(currentEditingTarget, oldLinks);
            }

            let found = false;
            links = links.map(l => {
                if (l.id === id) {
                    found = true;
                    return {
                        ...l,
                        id,
                        title: finalTitle,
                        subtitle,
                        url,
                        icon,
                        theme,
                        category,
                        categories,
                        steps,
                        saleGuide: saleGuideItems,
                        warranty: warrantyItems,
                        updatedAt: nowIso,
                        updatedBy: currentUser.fullname || currentUser.username || 'Giám Đốc',
                        createdAt: l.createdAt || nowIso,
                        createdBy: l.createdBy || currentUser.fullname || currentUser.username || 'Giám Đốc'
                    };
                }
                return l;
            });

            if (!found) {
                links.push({
                    id,
                    title: finalTitle,
                    subtitle,
                    url,
                    icon,
                    theme,
                    category,
                    categories,
                    steps,
                    saleGuide: saleGuideItems,
                    warranty: warrantyItems,
                    createdAt: nowIso,
                    createdBy: currentUser.fullname || currentUser.username || 'Giám Đốc',
                    updatedAt: nowIso,
                    updatedBy: currentUser.fullname || currentUser.username || 'Giám Đốc'
                });
            }
        } else {
            const prefix = isHtkt ? 'htkt_link_' : isKnm ? 'knm_link_' : 'custom_link_';
            const newId = prefix + Date.now();
            links.push({
                id: newId,
                title: finalTitle,
                subtitle,
                url,
                icon,
                theme,
                category,
                categories,
                steps,
                saleGuide: saleGuideItems,
                warranty: warrantyItems,
                createdAt: nowIso,
                createdBy: currentUser.fullname || currentUser.username || 'Giám Đốc',
                updatedAt: nowIso,
                updatedBy: currentUser.fullname || currentUser.username || 'Giám Đốc'
            });
        }
        _xldlSaveCustomSubtabLinks(subtabId, links);

        window._xldlCloseLinkModal();
        if (currentMainTab === 'muc3_official' || currentMainTab === 'muc2') {
            currentSubTab2 = subtabId;
            localStorage.setItem('xldl_sub_tab2', subtabId);
        } else {
            currentSubTab1 = subtabId;
            localStorage.setItem('xldl_sub_tab1', subtabId);
        }
        _xldlRenderCurrentMainTab();
        _xldlShowToast('💾 Đã lưu đường link tài liệu thành công!');
    };

    window._xldlDeleteLink = function(id, targetSub = null) {
        if (!confirm('Bạn có chắc chắn muốn xóa đường link tài liệu này không?')) return;
        
        if (id.startsWith('htkt_')) {
            let links = _xldlGetHtktLinks();
            links = links.filter(l => l.id !== id);
            _xldlSaveHtktLinks(links);
        } else if (id.startsWith('knm_')) {
            let links = _xldlGetKnmLinks();
            links = links.filter(l => l.id !== id);
            _xldlSaveKnmLinks(links);
        } else {
            const subId = targetSub || currentSubTab1;
            let links = _xldlGetCustomSubtabLinks(subId);
            links = links.filter(l => l.id !== id);
            _xldlSaveCustomSubtabLinks(subId, links);
        }

        _xldlShowToast('🗑️ Đã xóa đường link!');
        _xldlRenderCurrentMainTab();
    };

    window._xldlTogglePinLink = function(id, targetSub = null) {
        if (!_xldlCanManage()) {
            alert('Chỉ Giám Đốc và Quản Lý Cấp Cao Lê Việt Trinh mới có quyền ghim/bỏ ghim tài liệu!');
            return;
        }

        let subId = targetSub;
        if (!subId) {
            if (currentMainTab === 'muc3_official' || currentMainTab === 'muc2') subId = currentSubTab2;
            else subId = currentSubTab1;
        }

        let links = _xldlGetCustomSubtabLinks(subId);
        let isPinnedNow = false;
        links = links.map(l => {
            if (l.id === id) {
                isPinnedNow = !l.isPinned;
                return { ...l, isPinned: isPinnedNow };
            }
            return l;
        });

        _xldlSaveCustomSubtabLinks(subId, links);
        _xldlRenderCurrentMainTab();
        _xldlShowToast(isPinnedNow ? '📌⭐ Đã ghim tài liệu quan trọng lên vị trí ĐẦU TIÊN!' : '📌 Đã bỏ ghim tài liệu!');
    };

    // Default Soft Skill Questions for Probationary Sales
    const QUIZ_QUESTIONS = [
        {
            id: 1,
            category: 'Lắng nghe & Thấu hiểu',
            question: 'Khi khách hàng mới gọi điện đến và tỏ thái độ gắt gỏng vì xưởng cũ vừa làm hỏng đơn của họ, bạn nên làm gì đầu tiên?',
            options: [
                { key: 'A', text: 'Ngắt lời ngay để giới thiệu bảng giá ưu đãi của Đồng Phục HV.' },
                { key: 'B', text: 'Giữ thái độ điềm tĩnh, lắng nghe trọn vẹn, đồng cảm với sự cố của khách và khẳng định HV sẵn sàng hỗ trợ tháo gỡ.' },
                { key: 'C', text: 'Giải thích rằng lỗi đó là do xưởng cũ kém uy tín, HV không liên quan.' },
                { key: 'D', text: 'Yêu cầu khách gửi hợp đồng xưởng cũ để bạn phân tích lỗi sai giúp họ.' }
            ],
            correct: 'B',
            explanation: 'Đồng cảm và lắng nghe chủ động giúp giải tỏa tâm lý tiêu cực của khách, tạo sự tin tưởng ban đầu trước khi tư vấn giải pháp.'
        },
        {
            id: 2,
            category: 'Xử lý từ chối giá',
            question: 'Khách hàng chê "Giá bên em đắt hơn bên X 10.000đ/áo". Phản ứng nào chuẩn mực nhất?',
            options: [
                { key: 'A', text: 'Đồng ý giảm ngay 10.000đ/áo để chốt đơn nhanh.' },
                { key: 'B', text: 'Tỏ thái độ không hài lòng và bảo khách sang bên X mà đặt.' },
                { key: 'C', text: 'Xác nhận mức giá, phân tích giá trị khác biệt (chất liệu vải 100% cotton không xù, mực in Hàn Quốc bảo hành 24 tháng, bao đổi trả).' },
                { key: 'D', text: 'Nói rằng bên X chắc chắn làm vải kém chất lượng nên mới có giá đó.' }
            ],
            correct: 'C',
            explanation: 'Không nên giảm giá vô điều kiện làm giảm giá trị thương hiệu. Hãy tập trung nêu bật GIÁ TRỊ VƯỢT TRỘI và chính sách bảo hành.'
        },
        {
            id: 3,
            category: 'Tạo niềm tin & Cam kết',
            question: 'Khách hàng hỏi: "Anh cần gấp 200 áo trong 3 ngày, xưởng em có cam kết chuẩn tiến độ không?"',
            options: [
                { key: 'A', text: 'Hứa bừa là làm kịp để lấy tiền cọc trước rồi tính sau.' },
                { key: 'B', text: 'Từ chối ngay lập tức vì xưởng không bao giờ làm gấp.' },
                { key: 'C', text: 'Kiểm tra ngay năng lực xưởng sản xuất, nếu nhận thì lập hợp đồng ghi rõ cam kết thưởng/phạt tiến độ để khách yên tâm.' },
                { key: 'D', text: 'Yêu cầu khách trả gấp đôi tiền mới chịu làm.' }
            ],
            correct: 'C',
            explanation: 'Trung thực và minh bạch về năng lực xưởng là chìa khóa xây dựng uy tín lâu dài. Cam kết tiến độ bằng hợp đồng giúp khách hoàn toàn tin tưởng.'
        },
        {
            id: 4,
            category: 'Tư vấn giải pháp',
            question: 'Khách chưa có mẫu thiết kế, chỉ có ý tưởng mờ nhạt. Bạn nên hướng dẫn khách như thế nào?',
            options: [
                { key: 'A', text: 'Bảo khách tự thuê thiết kế ngoài rồi quay lại sau.' },
                { key: 'B', text: 'Khai thác ngành nghề, màu sắc thương hiệu, gửi Bộ Sưu Tập (BST) mẫu sẵn của HV và đề xuất đội ngũ Designer HV vẽ demo 2D miễn phí.' },
                { key: 'C', text: 'Gửi ngẫu nhiên 50 hình ảnh áo lên Zalo để khách tự chọn.' },
                { key: 'D', text: 'Yêu cầu khách phải chuyển khoản cọc trước 1 triệu thì mới cho xem thiết kế.' }
            ],
            correct: 'B',
            explanation: 'Đồng Phục HV hỗ trợ thiết kế 2D/3D chuyên nghiệp miễn phí. Khai thác chuẩn nhu cầu + gửi BST đúng mục tiêu sẽ chốt thiết kế rất nhanh.'
        },
        {
            id: 5,
            category: 'Chăm sóc & Chốt cọc',
            question: 'Sau khi đã báo giá và gửi bản vẽ 2D nhưng 2 ngày khách không trả lời tin nhắn, bạn nên nhắn tin bám sát ra sao?',
            options: [
                { key: 'A', text: 'Nhắn: "Sao anh không phản hồi lại em?"' },
                { key: 'B', text: 'Gửi thông báo cập nhật ưu đãi combo quà tặng/miễn phí vận chuyển sắp hết hạn trong hôm nay để kích thích khách quyết định.' },
                { key: 'C', text: 'Spam liên tục 10 tin nhắn mỗi giờ cho tới khi khách đọc.' },
                { key: 'D', text: 'Bỏ qua khách đó và tìm khách mới.' }
            ],
            correct: 'B',
            explanation: 'Follow-up thông minh bằng cách tạo giá trị gia tăng (urgency / quà tặng) giúp khách có lý do hợp lý để đưa ra quyết định đặt cọc.'
        }
    ];

    // Default Flashcard Data for Probationary Knowledge
    const FLASHCARDS_DATA = [
        {
            id: 1,
            category: 'Chất liệu vải',
            title: 'Vải Cotton 100% 4 Chiều',
            front: 'Đặc tính & Ưu điểm vải Cotton 100% 4 Chiều là gì?',
            back: '• Thành phần: 100% sợi bông tự nhiên.\n• Ưu điểm: Siêu thấm hút mồ hôi, co giãn 4 chiều mềm mại, mặc cực mát, thân thiện với da.\n• Thích hợp: Áo phông lớp, áo sự kiện cao cấp, áo văn phòng.\n• Lưu ý tư vấn: Giặt lần đầu nên giặt nước mát, không ngâm xà phòng tẩy mạnh.'
        },
        {
            id: 2,
            category: 'Chất liệu vải',
            title: 'Vải Thun Cá Sấu CVC (65/35)',
            front: 'Cách phân biệt & Ưu điểm vải Cá Sấu CVC 65/35?',
            back: '• Thành phần: 65% Cotton, 35% Polyester.\n• Ưu điểm: Đứng phom áo cổ bẻ (Polo), mắt dệt cá sấu đứng dáng, không xù lông, độ bền màu cực cao.\n• Thích hợp: Áo đồng phục công ty, nhà hàng, quán cafe, công sở.\n• Lưu ý: Là sự lựa chọn tối ưu giữa độ bền và độ mát.'
        },
        {
            id: 3,
            category: 'Bảng Size Áo',
            title: 'Thông Số Size Áo Nam / Nữ',
            front: 'Quy tắc tư vấn chọn Size áo theo Cân nặng & Chiều cao?',
            back: '• Size S: 42kg - 52kg (Cao 1m50 - 1m60)\n• Size M: 53kg - 62kg (Cao 1m60 - 1m68)\n• Size L: 63kg - 72kg (Cao 1m68 - 1m74)\n• Size XL: 73kg - 82kg (Cao 1m74 - 1m80)\n• Size XXL/3XL: Trên 83kg (Có áo Oversize cho khách thích mặc rộng).'
        },
        {
            id: 4,
            category: 'Quy trình sản xuất',
            title: 'Tiến Độ 4 Bước Ra Đơn Sản Xuất',
            front: 'Bốn giai đoạn chính trong quy trình xưởng là gì?',
            back: '1. Xưởng Cắt: Ra sơ đồ, cắt bán thành phẩm (1-2 ngày).\n2. Bộ phận In/Ép: In lụa / in chuyển nhiệt / ép PET decal (1-2 ngày).\n3. Bộ phận May: Ráp thân, may bo cổ, tra tay (2-3 ngày).\n4. QC & Hoàn thiện: Cắt chỉ, kiểm lỗi, ủi hơi, đóng gói (1 ngày).'
        },
        {
            id: 5,
            category: 'Giá & Chiết khấu',
            title: 'Chính Sách Chiết Khấu Số Lượng Lớn (SLL)',
            front: 'Khung giảm giá theo số lượng đơn hàng?',
            back: '• 10 - 30 áo: Báo giá niêm yết theo bảng giá.\n• 31 - 100 áo: Giảm 5% + Miễn phí 1 áo cho trưởng nhóm.\n• 101 - 300 áo: Giảm 10% + Miễn phí thêu logo + Free ship toàn quốc.\n• Từ 500 áo trở lên: Giá gốc trực tiếp tại xưởng, duyệt mẫu thật miễn phí.'
        },
        {
            id: 6,
            category: 'Chính sách bảo hành',
            title: 'Chính Sách Bảo Hành 1 Đổi 1',
            front: 'Đồng Phục HV bảo hành những lỗi nào?',
            back: '• Bảo hành 100% 1 ĐỔI 1 MIỄN PHÍ đối với:\n  - Lỗi vải (rách, bẩn từ xưởng, xù lông).\n  - Lỗi in/thêu (bong tróc, sai màu so với bản vẽ đã duyệt).\n  - Lỗi may (tuột chỉ, sai thông số size > 2cm).\n• Thời hạn khiếu nại: Trong vòng 7 ngày kể từ khi nhận hàng.'
        }
    ];

    // Telesale Call Scripts & Objection Handling
    const TELESALE_SCRIPTS = [
        {
            step: 'Bước 1',
            title: 'Lời Chào Ấn Tượng (10 Giây Đầu)',
            script: '“Dạ em chào anh/chị [Tên Khách] ạ! Em là [Tên Sale] gọi cho mình từ thương hiệu Đồng Phục HV. Em thấy anh/chị vừa để lại thông tin cần tư vấn mẫu áo đồng phục cho [Công ty/Lớp/Nhóm] đúng không ạ?”',
            note: 'Giọng nói tươi vui, hào hứng, tốc độ vừa phải. Không nói quá nhanh như máy đọc.'
        },
        {
            step: 'Bước 2',
            title: 'Khai Thác Nhu Cầu & Quy Mô (30 Giây)',
            script: '“Dạ anh/chị đang cần làm áo cho khoảng bao nhiêu người ạ? Mình dự định dùng cho sự kiện sắp tới hay làm đồng phục mặc hằng ngày ạ? Anh/chị đã chọn được màu chủ đạo hay dáng áo cổ tròn/cổ bẻ chưa ạ?”',
            note: 'Đặt câu hỏi gợi mở để khách chia sẻ chi tiết nhu cầu.'
        },
        {
            step: 'Bước 3',
            title: 'Giới Thiệu Giải Pháp & Khác Biệt (45 Giây)',
            script: '“Dạ với nhu cầu của bên mình, em khuyên anh/chị nên dùng dòng vải [Cotton 100% / Cá Sấu CVC]. Bên em đang áp dụng công nghệ in PET Hàn Quốc mực kháng nước, đảm bảo không bong tróc, bảo hành 24 tháng. Em sẽ gửi ngay BST mẫu áo thực tế qua Zalo cho anh/chị xem thử nhé!”',
            note: 'Nêu bật chất liệu vải + độ bền công nghệ in của Đồng Phục HV.'
        },
        {
            step: 'Bước 4',
            title: 'Ứng Phó Từ Chối / Phản Hồi',
            script: '“Dạ em hiểu anh/chị cần tham khảo thêm ý kiến các thành viên. Tuy nhiên bên em đang có chương trình tặng kèm [Băng rôn/Áo mẫu/Voucher 500k] áp dụng cho các đơn chốt trong hôm nay. Em cứ lên bản vẽ 2D logo của bên mình trước hoàn toàn miễn phí nhé!”',
            note: 'Xem thêm các Tab xử lý từ chối chi tiết bên dưới.'
        },
        {
            step: 'Bước 5',
            title: 'Chốt Hẹn Zalo & Gửi Mẫu Demo',
            script: '“Dạ vậy em xin phép kết bạn Zalo số này của anh/chị ngay nhé. Tầm 15 phút nữa Designer bên em sẽ gửi bản mô phỏng áo lên logo bên mình để anh/chị xem trước ạ. Em cảm ơn anh/chị!”',
            note: 'Tạo cam kết hành động ngay (gửi bản vẽ 2D trong 15-30 phút).'
        }
    ];

    // Quick Objection Handling Cards
    const OBJECTION_HANDLERS = [
        {
            title: '💰 Khách chê: "Giá bên em cao quá!"',
            answer: '• Đồng cảm: "Dạ em hiểu ngân sách luôn là ưu tiên hàng đầu của anh/chị."\n• Giá trị: "Tuy nhiên giá bên em đã bao gồm chất liệu vải kháng khuẩn không xù, công nghệ in bảo hành 2 năm và miễn phí vận chuyển tận nơi."\n• Phương án phụ: "Nếu ngân sách mình cố định ở mức X, em có thể tinh chỉnh chất liệu vải dòng Cotton 65/35 vẫn cực đẹp mà đúng tầm giá mình mong muốn ạ!"'
        },
        {
            title: '⏳ Khách bảo: "Để anh hỏi lại sếp / tập thể đã!"',
            answer: '• Tỏ ra thấu hiểu: "Dạ vâng, việc thống nhất ý kiến tập thể là rất quan trọng ạ."\n• Tạo công cụ hỗ trợ: "Để sếp anh duyệt nhanh hơn, em xin phép gửi bản báo giá chi tiết kèm bản vẽ mô phỏng 2D logo nét căng qua Zalo để anh đưa sếp xem là sếp gật đầu ngay ạ!"'
        },
        {
            title: '🔍 Khách nói: "Anh đang khảo giá 3 xưởng khác nhau."',
            answer: '• Tự tin khẳng định: "Dạ rất tốt ạ, tham khảo nhiều nơi sẽ giúp anh thấy rõ chất lượng vượt trội của HV."\n• Cam kết: "Bên em là XƯỞNG SẢN XUẤT TRỰC TIẾP không qua trung gian. Em cam kết nếu bên khác cùng chất lượng vải & công nghệ in mà rẻ hơn, HV xin hoàn tiền chênh lệch ạ!"'
        },
        {
            title: '🛡️ Khách lo: "Sợ áo nhận về không giống ảnh / bị lệch màu."',
            answer: '• Đưa bằng chứng: "Dạ HV có hợp đồng bảo hành 1 đổi 1 trong 7 ngày nếu sai màu hoặc lỗi vải."\n• Giải pháp xem mẫu: "Bên em sẵn sàng gửi áo mẫu thực tế đến tận văn phòng cho anh/chị sờ tận tay chất vải và kiểm tra hình in trước khi đặt cọc ạ!"'
        }
    ];

    // Categorized Chat Scripts for Closing Orders
    const CHAT_SCRIPTS = [
        {
            cat: '1. Chào mừng & Mở đầu',
            title: 'Mẫu 1: Chào mừng khách mới gửi yêu cầu trên Fanpage/Zalo',
            content: 'Dạ em chào anh/chị [Tên Khách]! 🌸\nEm là tư vấn viên từ Đồng Phục HV. Em rất vui được hỗ trợ mình chọn mẫu đồng phục đẹp nhất cho [Tên công ty/nhóm].\n\nAnh/chị cho em xin số lượng dự kiến và màu sắc yêu thích để em gửi ngay BST mẫu áo thực tế kèm bảng giá ưu đãi hôm nay nhé! 👕✨'
        },
        {
            cat: '1. Chào mừng & Mở đầu',
            title: 'Mẫu 2: Gửi Bộ Sưu Tập (BST) Mẫu Áo & Vải',
            content: 'Dạ em gửi anh/chị xem qua Bộ Sưu Tập các mẫu áo đồng phục hot nhất mùa này bên em ạ! 👇\n\n- Chất liệu: Thun Cotton 100% 4 chiều mát mịn / Cá sấu CVC đứng dáng.\n- Công nghệ in: In PET siêu nét Hàn Quốc, giặt máy không lo bong tróc.\n\nAnh/chị thích dáng áo Cổ Tròn trẻ trung hay Cổ Bẻ thanh lịch ạ?'
        },
        {
            cat: '2. Báo giá & Khuyến mãi',
            title: 'Mẫu 3: Báo giá chi tiết kèm combo quà tặng khẩn cấp',
            content: 'Dạ em gửi anh/chị Báo Giá Chi Tiết cho số lượng [Số lượng] áo ạ:\n📌 Đơn giá: [Giá tiền]đ / áo (Đã bao gồm in/thêu logo 2 vị trí + Free ship toàn quốc).\n\n🎁 ĐẶC BIỆT TRONG HÔM NAY:\n- Tặng miễn phí 01 áo cho Trưởng nhóm / Người đặt.\n- Miễn phí thiết kế 2D/3D chỉnh sửa đến khi hài lòng.\n- Voucher giảm thêm 200.000đ cho đơn hàng tiếp theo.\n\nƯu đãi này bên em áp dụng cho 5 đơn chốt cọc đầu tiên trong ngày thôi ạ! ❤️'
        },
        {
            cat: '3. Chốt Cọc & Gửi STK',
            title: 'Mẫu 4: Gửi thông tin tài khoản chuyển khoản cọc',
            content: 'Dạ bản vẽ thiết kế 2D áo của mình đã chuẩn hoàn toàn rồi ạ! 🥰\nĐể xưởng bên em tiến hành ra rập cắt vải và in mẫu ngay cho kịp tiến độ ngày [Ngày giao], anh/chị hỗ trợ chuyển cọc trước 50% giúp em nhé:\n\n🏦 NGÂN HÀNG: MB Bank (Ngoại Thương)\n💳 STK: 8888999999\n👤 CHỦ TK: CÔNG TY ĐỒNG PHỤC HV\n💰 Số tiền cọc: [Số tiền cọc] VNĐ\n📝 Nội dung CK: Cọc đh [Tên Khách] - [Số điện thoại]\n\nNgay khi nhận cọc em sẽ báo xưởng chạy đơn ngay lập tức ạ! 🚀'
        },
        {
            cat: '4. Bám sát khách chưa phản hồi',
            title: 'Mẫu 5: Follow-up nhắc khéo sau 24h - 48h',
            content: 'Dạ anh/chị [Tên Khách] ơi, mẫu thiết kế áo đồng phục hôm qua Designer bên em làm mình xem có cần chỉnh sửa thêm chi tiết nào không ạ? 🎨\n\nDo vải màu [Màu vải] đợt này ở xưởng đang rất hot và sắp cháy hàng, anh/chị chốt sớm để em giữ vải xịn và làm kịp ngày cho bên mình nhé! Cần hỗ trợ thêm gì anh/chị nhắn em ngay nha! ❤️'
        }
    ];

    // Default Garment Factory Error Playbook (used if backend API is empty or offline)
    const DEFAULT_ERROR_PLAYBOOK = [
        {
            id: 901,
            error_name: 'Lỗi in lệch màu / bong tróc hình in',
            category_name: 'Sự cố Sản Xuất In/Ép',
            departments: ['Bộ Phận In', 'Bộ Phận Ép'],
            status: 'resolved',
            cause: 'Nhiệt độ máy ép chưa đủ 160°C hoặc mực in pha sai tỉ lệ màu chuẩn Pantone.',
            fix_guide: 'Step 1: Thu hồi toàn bộ áo lỗi về xưởng ép.\nStep 2: Dùng hóa chất bóc keo chuyên dụng xử lý hình in hỏng mà không làm sờn vải.\nStep 3: Canh chỉnh lại máy ép đạt nhiệt độ 165°C trong 15s, in lại hình mới đúng màu Pantone khách duyệt.\nStep 4: Kiểm tra giặt sấy mẫu thử 3 lần trước khi đóng gói lại.',
            sale_guide: 'Thành thật nhận lỗi chậm 1-2 ngày do QC phát hiện màu in chưa đạt độ sắc nét tiêu chuẩn HV. Khẳng định HV chủ động làm lại mới 100% để đảm bảo chất lượng hoàn hảo nhất khi tới tay khách.',
            responsibility: ['Bộ Phận In chịu 50% tiền mực', 'Bộ Phận Ép chịu 50% công ép lại']
        },
        {
            id: 902,
            error_name: 'Lỗi may sai thông số size / lệch bo cổ',
            category_name: 'Sự cố Xưởng May',
            departments: ['Bộ Phận May', 'Bộ Phận Cắt'],
            status: 'in_progress',
            cause: 'Thợ cắt canh lệch đường may 1.5cm hoặc thợ may tra bo cổ bị co rút vải.',
            fix_guide: 'Step 1: Phân loại danh sách số áo bị sai size.\nStep 2: Tháo bo cổ và đường may sườn áo.\nStep 3: May lại theo thông số rập chuẩn, ủi định hình bo cổ bẻ.\nStep 4: Trường hợp không thể sửa, xuất kho vải mới cắt may bù bổ sung ngay trong 24h.',
            sale_guide: 'Gửi lời xin lỗi chân thành đến khách hàng. Gửi gấp số áo bị lỗi trước cho những nhân sự cần dùng gấp, các áo may bù xưởng sẽ giao tận nhà trong 48h kèm phần quà đền bù.',
            responsibility: ['Thợ may nhận đơn chịu chi phí sửa', 'QC xưởng phạt 100k do bỏ sót lỗi']
        },
        {
            id: 903,
            error_name: 'Lỗi trễ hạn giao hàng do đứt cuộn vải',
            category_name: 'Sự cố Tiến Độ & Vật Tư',
            departments: ['Kho Vải', 'Bộ Phận Cắt'],
            status: 'pending',
            cause: 'Nhà cung cấp vải giao thiếu cuộn màu đỏ đô, xưởng cắt phải chờ nhập kho bù.',
            fix_guide: 'Step 1: Quản lý xưởng liên hệ ngay đại lý vải cấp 1 điều xe máy chở gấp 2 cuộn vải trong 2h.\nStep 2: Tăng ca ca đêm cho thợ cắt và thợ may để bù tiến độ 1 ngày bị trễ.\nStep 3: Đặt dịch vụ hỏa tốc GHTK/Ahamove giao thẳng tới tay khách.',
            sale_guide: 'Báo khách hàng trước 24h: "Do xưởng nâng cấp công nghệ kiểm định chất lượng nghiêm ngặt nên tiến độ trễ 1 ngày". Tặng khách Voucher 300k và miễn phí 100% cước hỏa tốc.',
            responsibility: ['Thủ kho vải chịu phạt trễ hạn kiểm kho', 'Xưởng SX tài trợ phí giao hỏa tốc']
        },
        {
            id: 904,
            error_name: 'Lỗi sai tên / sai số thêu logo thành viên',
            category_name: 'Sự cố Thiết Kế & Thêu',
            departments: ['Bộ Phận In', 'Kinh Doanh'],
            status: 'resolved',
            cause: 'Sale gửi nhầm file danh sách tên cũ chưa cập nhật bản chốt cuối cùng của khách.',
            fix_guide: 'Step 1: Đối chiếu file chốt cuối cùng trên Zalo với bản thêu.\nStep 2: Tháo chỉ thêu tên sai bằng máy rọc chỉ chuyên dụng.\nStep 3: Lên lập trình thêu lại tên chuẩn xác.\nStep 4: Ủi phẳng vết thêu cũ.',
            sale_guide: 'Nếu lỗi do Sale gửi sai file: Sale chủ động nhận trách nhiệm, báo xưởng thêu lại siêu tốc trong ngày và gửi shiper tận nơi cho khách.',
            responsibility: ['Sale gửi sai file chịu 100% phí thêu lại', 'Nếu lỗi xưởng thì xưởng thêu chịu']
        }
    ];

    // Centralized Server Sync Handlers
    async function _xldlSyncLoadFromServer() {
        let loaded = false;
        try {
            const res = await fetch('/api/daotaosalekd/config');
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
                        _xldlRenderCurrentMainTab();
                        loaded = true;
                    }
                }
            }
        } catch (e) {
            console.warn('Sync load xldl_store error:', e);
        }

        if (!loaded && _xldlCanManage()) {
            _xldlSyncSaveToServer();
        }
    }

    let _syncSaveTimer = null;
    function _xldlSyncSaveToServer() {
        if (_syncSaveTimer) clearTimeout(_syncSaveTimer);
        const saveNow = async () => {
            try {
                const store = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith('xldl_')) {
                        store[k] = localStorage.getItem(k);
                    }
                }
                await fetch('/api/daotaosalekd/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ value: store })
                });
            } catch (e) {
                console.warn('Sync save xldl_store error:', e);
            }
        };
        saveNow();
    }

    // Main Render Entry Point
    window.renderXulydonloihvPage = function(container) {
        if (!container) return;
        _xldlSyncLoadFromServer();

        container.innerHTML = `
            <div class="xldl-wrapper">
                <!-- Top Header Banner -->
                <div class="xldl-header">
                    <div class="xldl-header-left">
                        <div class="xldl-icon-bg">🔧</div>
                        <div>
                            <h1 class="xldl-title">ĐÀO TẠO SALE/KD & XỬ LÝ LỖI</h1>
                            <p class="xldl-subtitle">Hệ thống Đào tạo Sale Thử Việc, Sale Chính Thức & Cẩm Nang Xử Lý Sự Cố Chuẩn Doanh Nghiệp</p>
                        </div>
                    </div>
                    <div class="xldl-header-right">
                        <span class="xldl-badge-live">● Đang hoạt động</span>
                    </div>
                </div>

                <!-- Main Level 1 Navigation Tabs -->
                <div class="xldl-tabs-main">
                    <button class="xldl-tab-btn ${(currentMainTab === 'muc1_error' || currentMainTab === 'muc1') ? 'active' : ''}" onclick="window._xldlSwitchMainTab('muc1_error')">
                        <span class="tab-num">MỤC 1</span>
                        <span class="tab-label">🚨 Tình Huống Xử Lý Lỗi</span>
                    </button>
                    <button class="xldl-tab-btn ${(currentMainTab === 'muc3_official' || currentMainTab === 'muc2') ? 'active' : ''}" onclick="window._xldlSwitchMainTab('muc3_official')">
                        <span class="tab-num">MỤC 2</span>
                        <span class="tab-label">💼 Đào Tạo Sale Chính Thức</span>
                    </button>
                    <button class="xldl-tab-btn ${(currentMainTab === 'muc2_probation' || currentMainTab === 'muc3') ? 'active' : ''}" onclick="window._xldlSwitchMainTab('muc2_probation')">
                        <span class="tab-num">MỤC 3</span>
                        <span class="tab-label">🎓 Đào Tạo Sale Thử Việc</span>
                    </button>
                </div>

                <!-- Main Content Area -->
                <div class="xldl-content-container" id="xldlContentContainer">
                    <!-- Dynamic view rendered here -->
                </div>
            </div>

            <!-- Modal Tạo & Sửa Link Tài Liệu (Dạng Sticky Footer + 2 Tab Nhập Liệu Gọn Gàng) -->
            <div class="xldl-modal-overlay" id="xldlLinkModal" style="display:none;">
                <div class="xldl-modal-card" style="max-height:88vh; display:flex; flex-direction:column; width:100%; max-width:620px; border-radius:24px; overflow:hidden; background:#ffffff; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
                    <!-- Modal Header Cố Định -->
                    <div class="xldl-modal-header" style="flex-shrink:0; padding:18px 24px; background:linear-gradient(135deg, #1e3a8a, #2563eb); color:#ffffff; display:flex; justify-content:space-between; align-items:center;">
                        <h3 id="xldlModalTitle" style="margin:0; font-size:17.5px; font-weight:900;">➕ TẠO ĐƯỜNG LINK TÀI LIỆU MỚI</h3>
                        <button class="xldl-modal-close" onclick="window._xldlCloseLinkModal()" style="background:rgba(255,255,255,0.2); border:none; color:#ffffff; width:30px; height:30px; border-radius:50%; cursor:pointer; font-size:16px; font-weight:bold;">✕</button>
                    </div>

                    <!-- Modal Body Cuộn Độc Lập -->
                    <div class="xldl-modal-body" style="flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:14px;">
                        <input type="hidden" id="xldlFormLinkId" value="">

                        <!-- Thanh Nav 2 Tab Nhập Liệu -->
                        <div id="xldlModalTabNav" style="display:flex; gap:10px; border-bottom:2px solid #e2e8f0; padding-bottom:12px; margin-bottom:6px;">
                            <button type="button" id="xldlTabBtnBasic" onclick="window._xldlSwitchModalTab('basic')" style="flex:1; padding:10px 14px; border-radius:12px; border:none; background:#0284c7; color:#ffffff; font-weight:800; font-size:14px; font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing:-0.2px; cursor:pointer; transition:all 0.2s ease;">
                                📁 TAB 1: Thông Tin & Link (*)
                            </button>
                            <button type="button" id="xldlTabBtnScript" onclick="window._xldlSwitchModalTab('script')" style="flex:1; padding:10px 14px; border-radius:12px; border:1.5px solid #cbd5e1; background:#f8fafc; color:#0f172a; font-weight:800; font-size:14px; font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing:-0.2px; cursor:pointer; transition:all 0.2s ease;">
                                📋 TAB 2: Kịch Bản & Bảo Hành*
                            </button>
                        </div>

                        <!-- PANEL 1: THÔNG TIN CƠ BẢN & LINK -->
                        <div id="xldlModalPanelBasic" style="display:block;">
                            <!-- Dropdown 1: Danh Mục (Lấy ở Ảnh 3 - Các mục đào tạo) -->
                            <div class="xldl-form-group" style="margin-bottom:14px;">
                                <label style="color:#1e40af; font-weight:900; display:block; margin-bottom:6px;">📁 Danh Mục Đào Tạo (* BẮT BUỘC KHÔNG ĐƯỢC ĐỂ TRỐNG):</label>
                                <select id="xldlFormSubtab" required style="width:100%; border: 2px solid #2563eb; background: #eff6ff; font-weight: 800; color: #1e40af; padding:10px 14px; border-radius:12px;" onchange="window._xldlOnFormSubtabChange()">
                                    <!-- Subtabs populated dynamically -->
                                </select>
                            </div>
                            <!-- Multi-select Checkboxes: Lĩnh Vực (Chọn 1 hoặc nhiều Lĩnh Vực) -->
                            <div class="xldl-form-group" style="margin-bottom:14px;">
                                <label style="color:#0369a1; font-weight:900; display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                    <span>📌 Lĩnh Vực Tài Liệu (* BẮT BUỘC - Có thể chọn nhiều):</span>
                                    <span style="font-size:12px; color:#64748b; font-weight:700;">(Chọn 1 hoặc nhiều Lĩnh Vực)</span>
                                </label>
                                <div id="xldlFormCategoryCheckboxes" style="display:flex; flex-wrap:wrap; gap:10px; padding:12px; border:2px solid #0284c7; background:#f0f9ff; border-radius:16px; max-height:150px; overflow-y:auto; box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);">
                                    <!-- Categories populated dynamically as multi-select checkboxes -->
                                </div>
                            </div>
                            <div class="xldl-form-group" style="margin-bottom:14px;">
                                <label style="color:#0f172a; font-weight:850; display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                    <span>Tiêu đề đường link (*):</span>
                                    <span style="font-size:12px; color:#0284c7; font-weight:700;">🔒 Tiền tố số STT cố định không thể xóa</span>
                                </label>
                                <input type="text" id="xldlFormTitle" placeholder="Ví dụ: Kịch Bản Làm Quen/Nuôi Dưỡng..." required style="width:100%; border:2px solid #bae6fd; border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:700; color:#0f172a;" oninput="window._xldlOnTitleInput(this)" onkeydown="window._xldlOnTitleKeyDown(event, this)" onclick="window._xldlOnTitleClick(this)" onblur="this.value = window._xldlFormatTitle(this.value)">
                            </div>
                            <div class="xldl-form-group" style="margin-bottom:14px;">
                                <label style="color:#334155; font-weight:850; display:block; margin-bottom:6px;">
                                    📝 Mô tả tình huống (không bắt buộc - hỗ trợ xuống dòng):
                                </label>
                                <textarea id="xldlFormSubtitle" rows="6" 
                                    placeholder="Ví dụ: Mô tả chi tiết tình huống lỗi hoặc kịch bản hướng dẫn nhân viên tiếp cận..." 
                                    style="width:100%; border:2px solid #bae6fd; border-radius:16px; padding:12px 16px; font-size:13.5px; font-weight:600; line-height:1.55; outline:none; resize:vertical; min-height:160px; color:#0f172a; font-family:inherit; background:#ffffff; box-sizing:border-box;"></textarea>
                            </div>
                            <div class="xldl-form-group" style="margin-bottom:14px;">
                                <label id="xldlUrlLabel" style="color:#0f172a; font-weight:850; display:block; margin-bottom:6px;">Đường link URL (không bắt buộc cho Mục 1):</label>
                                <input type="url" id="xldlFormUrl" placeholder="https://docs.google.com/spreadsheets/d/... (không bắt buộc cho Mục 1)" style="width:100%; border:2px solid #bae6fd; border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:700; color:#0f172a;">
                            </div>
                            <div class="xldl-form-row" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                                <div class="xldl-form-group">
                                    <label style="color:#334155; font-weight:850; display:block; margin-bottom:6px;">Biểu tượng (Icon):</label>
                                    <select id="xldlFormIcon" style="width:100%; border:1.5px solid #cbd5e1; border-radius:12px; padding:9px 12px; font-size:13px; font-weight:700;">
                                        <option value="📊">📊 Bảng tính Google Sheets</option>
                                        <option value="📗">📗 Sách hướng dẫn Excel</option>
                                        <option value="📑">📑 Tài liệu Word / Docs</option>
                                        <option value="📁">📁 Thư mục tổng hợp</option>
                                        <option value="🔗">🔗 Đường link liên kết</option>
                                        <option value="🚀">🚀 Quy trình thực chiến</option>
                                        <option value="🎓">🎓 Khóa học đào tạo</option>
                                    </select>
                                </div>
                                <div class="xldl-form-group">
                                    <label style="color:#334155; font-weight:850; display:block; margin-bottom:6px;">Tông màu hiển thị:</label>
                                    <select id="xldlFormTheme" style="width:100%; border:1.5px solid #cbd5e1; border-radius:12px; padding:9px 12px; font-size:13px; font-weight:700;">
                                        <option value="green">🟢 Xanh Lá (Google Sheets)</option>
                                        <option value="blue">🔵 Xanh Dương (Royal Blue)</option>
                                        <option value="purple">🟣 Tím (Thạch Anh)</option>
                                        <option value="amber">🟠 Cam Hổ Phách</option>
                                        <option value="rose">🔴 Đỏ Ruby</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- PANEL 2: KỊCH BẢN & BẢO HÀNH CHI TIẾT (MỤC 1) -->
                        <div id="xldlModalPanelScript" style="display:none;">
                            <div style="border:2px dashed #93c5fd; background:#f0f9ff; padding:16px; border-radius:18px;">
                                <!-- 1. QUY TRÌNH XỬ LÝ TỪNG BƯỚC (STEP-BY-STEP) -->
                                <div class="xldl-form-group" style="margin-bottom:14px;">
                                    <label style="color:#166534; font-weight:900; display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                        <span>📋 QUY TRÌNH XỬ LÝ TỪNG BƯỚC* :</span>
                                        <span style="font-size:12px; color:#15803d; font-weight:700;">(Xuống dòng tự động tạo Bước)</span>
                                    </label>
                                    <textarea id="xldlFormSteps" rows="8" 
                                        placeholder="Bước 1: Xác thực thông tin hỏi khách&#10;Bước 2: Kiểm tra đơn hàng lỗi..."
                                        style="width:100%; border:2px solid #86efac; border-radius:16px; padding:14px 18px; font-size:13.5px; font-weight:700; line-height:1.6; outline:none; resize:vertical; min-height:220px; color:#14532d; font-family:inherit; background:#ffffff; box-shadow:0 2px 8px rgba(22,163,74,0.06);"
                                        onfocus="window._xldlOnStepsFocus(this)"
                                        onkeydown="window._xldlOnStepsKeyDown(event, this)"
                                        oninput="window._xldlOnStepsInput(this)"></textarea>
                                    <div style="display:flex; justify-content:flex-end; margin-top:4px;">
                                        <button type="button" onclick="window._xldlAddStepLine()" style="background:#dcfce7; color:#15803d; border:1px solid #86efac; border-radius:8px; padding:4px 10px; font-size:12px; font-weight:800; cursor:pointer;">
                                            ➕ Thêm Bước Xử Lý
                                        </button>
                                    </div>
                                </div>

                                <!-- 2. HƯỚNG DẪN SALE TRAO ĐỔI VỚI KHÁCH -->
                                <div class="xldl-form-group" style="margin-bottom:14px;">
                                    <label style="color:#1e40af; font-weight:900; display:block; margin-bottom:6px;">
                                        🗣️ HƯỚNG DẪN SALE TRAO ĐỔI VỚI KHÁCH* :
                                    </label>
                                    <div id="xldlSaleGuideContainer" style="display:flex; flex-direction:column; gap:10px;">
                                        <!-- Dynamic rows of Goal & Question -->
                                    </div>
                                    <button type="button" onclick="window._xldlAddSaleGuideRow()" style="margin-top:8px; background:#dbeafe; color:#1d4ed8; border:1.5px solid #93c5fd; border-radius:10px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
                                        ➕ Thêm Câu Hỏi & Mục Tiêu
                                    </button>
                                </div>

                                <!-- 3. TRÁCH NHIỆM & BẢO HÀNH -->
                                <div class="xldl-form-group" style="margin-bottom:6px;">
                                    <label style="color:#6b21a8; font-weight:900; display:block; margin-bottom:6px;">
                                        ⚖️ TRÁCH NHIỆM & BẢO HÀNH* :
                                    </label>
                                    <div id="xldlWarrantyContainer" style="display:flex; flex-direction:column; gap:8px;">
                                        <!-- Dynamic rows of Warranty Items -->
                                    </div>
                                    <button type="button" onclick="window._xldlAddWarrantyRow()" style="margin-top:8px; background:#f3e8ff; color:#7e22ce; border:1.5px solid #d8b4fe; border-radius:10px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
                                        ➕ Thêm Điều Khoản Bảo Hành
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Modal Footer Cố Định 100% ⚡ STICKY FOOTER -->
                    <div class="xldl-modal-footer" style="flex-shrink:0; padding:14px 24px; background:#ffffff; border-top:1.5px solid #e2e8f0; display:flex; justify-content:flex-end; gap:12px; box-shadow:0 -4px 16px rgba(0,0,0,0.05); z-index:100;">
                        <button class="xldl-btn secondary" onclick="window._xldlCloseLinkModal()" style="padding:10px 20px; border-radius:12px; font-weight:800;">Hủy Bỏ</button>
                        <button class="xldl-btn primary" onclick="window._xldlSaveLinkFromModal()" style="padding:10px 24px; border-radius:12px; font-weight:900; background:linear-gradient(135deg, #1d4ed8, #2563eb); color:#ffffff; box-shadow:0 4px 14px rgba(37, 99, 235, 0.35);">💾 Lưu Đường Link</button>
                    </div>
                </div>
            </div>

            <!-- Modal Cài Đặt & Tạo Lĩnh Vực -->
            <div class="xldl-modal-overlay" id="xldlCategoryModal" style="display:none;">
                <div class="xldl-modal-card" style="border-radius:24px; border:1.5px solid #93c5fd; box-shadow: 0 25px 50px -12px rgba(2, 132, 199, 0.25); overflow:hidden;">
                    <div class="xldl-modal-header" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding:22px 28px;">
                        <h3 id="xldlCatModalTitle" style="font-size:18.5px; font-weight:900; letter-spacing:-0.3px; color:#ffffff; margin:0;">⚙️ CÀI ĐẶT LĨNH VỰC TÀI LIỆU</h3>
                        <button class="xldl-modal-close" onclick="window._xldlCloseCatModal()">✕</button>
                    </div>
                    <div class="xldl-modal-body" style="padding:24px 28px; background:#f8fafc;">
                        <input type="hidden" id="xldlCatFormScope" value="">
                        
                        <!-- Create New Category Box -->
                        <div style="background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%); padding:20px; border-radius:18px; border:1.5px solid #93c5fd; margin-bottom:22px; box-shadow:0 4px 14px rgba(2, 132, 199, 0.08);">
                            <label style="font-size:14px; font-weight:900; color:#0369a1; display:flex; align-items:center; gap:8px; margin-bottom:10px;">
                                <span style="font-size:18px;">➕</span> Tạo Lĩnh Vực Mới:
                            </label>
                            <div style="display:flex; gap:10px;">
                                <input type="text" id="xldlCatFormName" placeholder="Nhập tên lĩnh vực mới (ví dụ: Quy Trình Giao Hàng...)" 
                                    style="flex:1; border:1.5px solid #93c5fd; border-radius:12px; padding:11px 16px; font-size:14px; font-weight:700; background:#ffffff; outline:none; color:#0f172a;"
                                    onkeypress="if(event.key==='Enter') window._xldlAddCategoryFromModal()">
                                <button class="xldl-btn primary" onclick="window._xldlAddCategoryFromModal()" 
                                    style="border-radius:12px; padding:11px 22px; font-size:14px; font-weight:900; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); border:none; box-shadow:0 4px 12px rgba(2, 132, 199, 0.3);">
                                    ➕ Thêm Mới
                                </button>
                            </div>
                        </div>

                        <!-- Existing Categories List -->
                        <div>
                            <label style="font-size:14px; font-weight:900; color:#0f172a; display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                                <span style="font-size:18px;">📌</span> Danh Sách Lĩnh Vực Hiện Tại:
                            </label>
                            <div id="xldlCatListContainer" style="display:flex; flex-direction:column; gap:10px; max-height:280px; overflow-y:auto; padding-right:4px;">
                                <!-- Dynamic Categories list -->
                            </div>
                        </div>
                    </div>
                    <div class="xldl-modal-footer" style="padding:18px 28px; background:#ffffff; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end;">
                        <button class="xldl-btn secondary" onclick="window._xldlCloseCatModal()" style="border-radius:12px; padding:10px 24px; font-weight:800; font-size:14px;">Đóng</button>
                    </div>
                </div>
            </div>

            <!-- Modal Cài Đặt Mục Đào Tạo -->
            <div class="xldl-modal-overlay" id="xldlSubtabModal" style="display:none;">
                <div class="xldl-modal-card" style="border-radius:24px; border:1.5px solid #93c5fd; box-shadow: 0 25px 50px -12px rgba(2, 132, 199, 0.25); overflow:hidden; max-width:580px; width:92%;">
                    <div class="xldl-modal-header" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding:22px 28px;">
                        <h3 style="font-size:18.5px; font-weight:900; letter-spacing:-0.3px; color:#ffffff; margin:0;">⚙️ CÀI ĐẶT MỤC ĐÀO TẠO (MỤC 2)</h3>
                        <button class="xldl-modal-close" onclick="window._xldlCloseSubtabModal()">✕</button>
                    </div>
                    <div class="xldl-modal-body" style="padding:24px 28px; background:#f8fafc;">
                        <!-- Create New Subtab Box -->
                        <div style="background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%); padding:20px; border-radius:18px; border:1.5px solid #93c5fd; margin-bottom:22px; box-shadow:0 4px 14px rgba(2, 132, 199, 0.08);">
                            <label style="font-size:14px; font-weight:900; color:#0369a1; display:flex; align-items:center; gap:8px; margin-bottom:10px;">
                                <span style="font-size:18px;">➕</span> Tạo Mục Đào Tạo Mới:
                            </label>
                            <div style="display:flex; flex-direction:column; gap:10px;">
                                <div style="display:flex; gap:10px;">
                                    <select id="xldlSubtabFormIcon" style="width:145px; border:1.5px solid #93c5fd; border-radius:12px; padding:11px 10px; font-size:13.5px; font-weight:800; background:#ffffff; outline:none; color:#0f172a;">
                                        <option value="📝">📝 Bài Test</option>
                                        <option value="📚">📚 Học Thuộc</option>
                                        <option value="🎓">🎓 Học Tập</option>
                                        <option value="💻">💻 Máy Tính</option>
                                        <option value="🚀">🚀 Thực Chiến</option>
                                        <option value="🎯">🎯 Mục Tiêu</option>
                                        <option value="💡">💡 Kịch Bản</option>
                                        <option value="📊">📊 Google Sheets</option>
                                        <option value="📗">📗 File Excel</option>
                                        <option value="📑">📑 File Word</option>
                                        <option value="📁">📁 Thư Mục</option>
                                        <option value="🔗">🔗 Đường Link</option>
                                        <option value="📢">📢 Kịch Bản TV</option>
                                        <option value="📞">📞 Telesale</option>
                                        <option value="🛡️">🛡️ Xử Lý Lỗi</option>
                                        <option value="⭐">⭐ Tiêu Chuẩn</option>
                                        <option value="🏆">🏆 Thành Tích</option>
                                        <option value="🧩">🧩 Kỹ Năng Mềm</option>
                                        <option value="📌">📌 Ghi Chú</option>
                                    </select>
                                    <input type="text" id="xldlSubtabFormTitle" placeholder="Nhập tên mục mới (ví dụ: Kỹ Năng Máy Tính...)" 
                                        style="flex:1; border:1.5px solid #93c5fd; border-radius:12px; padding:11px 16px; font-size:14px; font-weight:700; background:#ffffff; outline:none; color:#0f172a;"
                                        onkeypress="if(event.key==='Enter') window._xldlAddSubtabFromModal()">
                                </div>
                                <button class="xldl-btn primary" onclick="window._xldlAddSubtabFromModal()" 
                                    style="border-radius:12px; padding:11px 22px; font-size:14px; font-weight:900; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); border:none; box-shadow:0 4px 12px rgba(2, 132, 199, 0.3);">
                                    ➕ Thêm Mục Mới
                                </button>
                            </div>
                        </div>

                        <!-- Existing Subtabs List -->
                        <div>
                            <label style="font-size:14px; font-weight:900; color:#0f172a; display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                                <span style="font-size:18px;">📌</span> Danh Sách Mục Đào Tạo Hiện Tại:
                            </label>
                            <div id="xldlSubtabListContainer" style="display:flex; flex-direction:column; gap:10px; max-height:280px; overflow-y:auto; padding-right:4px;">
                                <!-- Dynamic Subtab list -->
                            </div>
                        </div>
                    </div>
                    <div class="xldl-modal-footer" style="padding:18px 28px; background:#ffffff; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end;">
                        <button class="xldl-btn secondary" onclick="window._xldlCloseSubtabModal()" style="border-radius:12px; padding:10px 24px; font-weight:800; font-size:14px;">Đóng</button>
                    </div>
                </div>
            </div>

            ${_xldlGetStyles()}
        `;

        // Render current main tab
        _xldlRenderCurrentMainTab();
    };

    // Switch Main Tabs (Mục 1, Mục 2, Mục 3)
    window._xldlSwitchMainTab = function(tabId) {
        currentMainTab = tabId;
        localStorage.setItem('xldl_main_tab', tabId);
        
        const buttons = document.querySelectorAll('.xldl-tab-btn');
        buttons.forEach((btn, idx) => {
            if (
                ((tabId === 'muc1_error' || tabId === 'muc1') && idx === 0) ||
                ((tabId === 'muc3_official' || tabId === 'muc2') && idx === 1) ||
                ((tabId === 'muc2_probation' || tabId === 'muc3') && idx === 2)
            ) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        _xldlRenderCurrentMainTab();
    };

    // Render logic for Main Tabs
    function _xldlRenderCurrentMainTab() {
        const container = document.getElementById('xldlContentContainer');
        if (!container) return;

        if (currentMainTab === 'muc1_error' || currentMainTab === 'muc1') {
            _xldlRenderMuc3(container);
        } else if (currentMainTab === 'muc3_official' || currentMainTab === 'muc2') {
            _xldlRenderMuc2(container);
        } else if (currentMainTab === 'muc2_probation' || currentMainTab === 'muc3') {
            _xldlRenderMuc1(container);
        }
    }

    // ==========================================
    // MỤC 1: ĐÀO TẠO SALE THỬ VIỆC
    // ==========================================
    let currentSubTab1Error = localStorage.getItem('xldl_sub_tab1_error') || 'all_error';

    const DEFAULT_SUBTABS_MUC1 = [
        { id: 'all_error', title: 'Tất Cả Sự Cố Lỗi', icon: '🚨', isCustom: false },
        { id: 'in_dept', title: 'Bộ Phận In', icon: '🖨️', isCustom: false },
        { id: 'ep_dept', title: 'Bộ Phận Ép', icon: '🔥', isCustom: false },
        { id: 'may_dept', title: 'Bộ Phận May', icon: '🪡', isCustom: false }
    ];

    const DEFAULT_SUBTABS_MUC2 = [
        { id: 'test_kNM', title: 'Test Kỹ Năng Mềm', icon: '📝', isCustom: false },
        { id: 'knowledge', title: 'Học Thuộc Kiến Thức', icon: '📚', isCustom: false }
    ];

    const DEFAULT_SUBTABS_MUC3 = [
        { id: 'telesale', title: 'Kịch Bản Telesale (Cuộc Gọi 5 Bước)', icon: '📞', isCustom: false },
        { id: 'chat', title: 'Kịch Bản Nhắn Tin Chốt Đơn (Coppy 1-Click)', icon: '💬', isCustom: false }
    ];

    function _xldlGetSubtabs(scope) {
        try {
            const raw = localStorage.getItem('xldl_subtabs_' + scope);
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}

        if (scope === 'muc3_official') return DEFAULT_SUBTABS_MUC3;
        if (scope === 'muc1_error') return DEFAULT_SUBTABS_MUC1;
        return DEFAULT_SUBTABS_MUC2;
    }

    function _xldlSaveSubtabs(scope, subtabs) {
        localStorage.setItem('xldl_subtabs_' + scope, JSON.stringify(subtabs));
        _xldlSyncSaveToServer();
    }

    function _xldlGetSubtabsMuc2() {
        return _xldlGetSubtabs('muc2_probation');
    }

    function _xldlGetSubtabsMuc3() {
        return _xldlGetSubtabs('muc3_official');
    }

    // Modal Subtabs (Mục Đào Tạo) Management
    let editingSubtabId = null;

    const SUBTAB_ICON_OPTIONS = [
        { value: '📝', label: '📝 Bài Test' },
        { value: '📚', label: '📚 Học Thuộc' },
        { value: '🎓', label: '🎓 Học Tập' },
        { value: '💻', label: '💻 Máy Tính' },
        { value: '🚀', label: '🚀 Thực Chiến' },
        { value: '🎯', label: '🎯 Mục Tiêu' },
        { value: '💡', label: '💡 Kịch Bản' },
        { value: '📊', label: '📊 Google Sheets' },
        { value: '📗', label: '📗 File Excel' },
        { value: '📑', label: '📑 File Word' },
        { value: '📁', label: '📁 Thư Mục' },
        { value: '🔗', label: '🔗 Đường Link' },
        { value: '📢', label: '📢 Kịch Bản TV' },
        { value: '📞', label: '📞 Telesale' },
        { value: '🛡️', label: '🛡️ Xử Lý Lỗi' },
        { value: '⭐', label: '⭐ Tiêu Chuẩn' },
        { value: '🏆', label: '🏆 Thành Tích' },
        { value: '🧩', label: '🧩 Kỹ Năng Mềm' },
        { value: '📌', label: '📌 Ghi Chú' }
    ];

    window._xldlOpenManageSubtabModal = function(scope = null) {
        if (!_xldlCanManage()) {
            alert('Chỉ Giám Đốc và Quản Lý Cấp Cao Lê Việt Trinh mới có quyền cài đặt mục!');
            return;
        }
        if (!scope) {
            if (currentMainTab === 'muc1_error' || currentMainTab === 'muc3') scope = 'muc1_error';
            else if (currentMainTab === 'muc3_official' || currentMainTab === 'muc2') scope = 'muc3_official';
            else scope = 'muc2_probation';
        }
        currentSubtabScope = scope;

        editingSubtabId = null;
        const modal = document.getElementById('xldlSubtabModal');
        if (!modal) return;
        const titleInput = document.getElementById('xldlSubtabFormTitle');
        if (titleInput) titleInput.value = '';

        const titleEl = document.getElementById('xldlSubtabModalTitle');
        if (titleEl) {
            let scopeTitle = 'MỤC 2: ĐÀO TẠO SALE THỬ VIỆC';
            if (scope === 'muc3_official') scopeTitle = 'MỤC 3: ĐÀO TẠO SALE CHÍNH THỨC';
            else if (scope === 'muc1_error') scopeTitle = 'MỤC 1: TÌNH HUỐNG XỬ LÝ LỖI';
            titleEl.innerText = `⚙️ CÀI ĐẶT MỤC (${scopeTitle})`;
        }

        _xldlRenderSubtabListInModal();
        modal.style.display = 'flex';
    };

    window._xldlCloseSubtabModal = function() {
        const modal = document.getElementById('xldlSubtabModal');
        if (modal) modal.style.display = 'none';
    };

    window._xldlAddSubtabFromModal = function() {
        const titleInput = document.getElementById('xldlSubtabFormTitle');
        const iconSelect = document.getElementById('xldlSubtabFormIcon');
        if (!titleInput || !iconSelect) return;

        const title = titleInput.value.trim();
        const icon = iconSelect.value;

        if (!title) {
            alert('Vui lòng nhập tên mục đào tạo mới!');
            return;
        }

        const subtabs = _xldlGetSubtabs(currentSubtabScope);
        const newId = 'custom_subtab_' + Date.now();
        subtabs.push({
            id: newId,
            title: title,
            icon: icon || '📌',
            isCustom: true
        });

        _xldlSaveSubtabs(currentSubtabScope, subtabs);
        titleInput.value = '';
        _xldlRenderSubtabListInModal();
        _xldlRenderCurrentMainTab();
        _xldlShowToast(`✅ Đã tạo mục mới "${title}"!`);
    };

    window._xldlStartSubtabEdit = function(subId) {
        editingSubtabId = subId;
        _xldlRenderSubtabListInModal();
    };

    window._xldlSaveSubtabEdit = function(subId) {
        const titleInput = document.getElementById('xldlEditSubtabTitle_' + subId);
        const iconSelect = document.getElementById('xldlEditSubtabIcon_' + subId);
        if (!titleInput || !iconSelect) return;

        const newTitle = titleInput.value.trim();
        const newIcon = iconSelect.value;

        if (!newTitle) {
            alert('Tên mục không được để trống!');
            return;
        }

        const subtabs = _xldlGetSubtabs(currentSubtabScope);
        const item = subtabs.find(s => s.id === subId);
        if (item) {
            item.title = newTitle;
            item.icon = newIcon;
            _xldlSaveSubtabs(currentSubtabScope, subtabs);
        }

        editingSubtabId = null;
        _xldlRenderSubtabListInModal();
        _xldlRenderCurrentMainTab();
        _xldlShowToast('💾 Đã cập nhật mục đào tạo!');
    };

    window._xldlCancelSubtabEdit = function() {
        editingSubtabId = null;
        _xldlRenderSubtabListInModal();
    };

    window._xldlDeleteSubtabFromModal = function(subId) {
        let subtabs = _xldlGetSubtabs(currentSubtabScope);
        const item = subtabs.find(s => s.id === subId);
        if (!item) return;

        if (!confirm(`Bạn có chắc muốn xóa mục đào tạo "${item.title}" không?`)) return;

        subtabs = subtabs.filter(s => s.id !== subId);
        _xldlSaveSubtabs(currentSubtabScope, subtabs);

        if (currentSubTab1 === subId) {
            currentSubTab1 = subtabs[0] ? subtabs[0].id : 'test_kNM';
            localStorage.setItem('xldl_sub_tab1', currentSubTab1);
        }
        if (currentSubTab2 === subId) {
            currentSubTab2 = subtabs[0] ? subtabs[0].id : 'telesale';
            localStorage.setItem('xldl_sub_tab2', currentSubTab2);
        }

        _xldlRenderSubtabListInModal();
        _xldlRenderCurrentMainTab();
        _xldlShowToast('🗑️ Đã xóa mục đào tạo!');
    };

    window._xldlMoveSubtabUp = function(subId) {
        const subtabs = _xldlGetSubtabs(currentSubtabScope);
        const idx = subtabs.findIndex(s => s.id === subId);
        if (idx <= 0) return;

        const temp = subtabs[idx];
        subtabs[idx] = subtabs[idx - 1];
        subtabs[idx - 1] = temp;

        _xldlSaveSubtabs(currentSubtabScope, subtabs);
        _xldlRenderSubtabListInModal();
        _xldlRenderCurrentMainTab();
        _xldlShowToast('⬆️ Đã chuyển vị trí mục lên trước!');
    };

    window._xldlMoveSubtabDown = function(subId) {
        const subtabs = _xldlGetSubtabs(currentSubtabScope);
        const idx = subtabs.findIndex(s => s.id === subId);
        if (idx < 0 || idx >= subtabs.length - 1) return;

        const temp = subtabs[idx];
        subtabs[idx] = subtabs[idx + 1];
        subtabs[idx + 1] = temp;

        _xldlSaveSubtabs(currentSubtabScope, subtabs);
        _xldlRenderSubtabListInModal();
        _xldlRenderCurrentMainTab();
        _xldlShowToast('⬇️ Đã chuyển vị trí mục xuống sau!');
    };

    function _xldlRenderSubtabListInModal() {
        const container = document.getElementById('xldlSubtabListContainer');
        if (!container) return;

        const subtabs = _xldlGetSubtabs(currentSubtabScope);
        if (subtabs.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:16px; color:#64748b; font-weight:700;">Chưa có mục nào</div>`;
            return;
        }

        container.innerHTML = subtabs.map((item, idx) => {
            const isEditing = editingSubtabId === item.id;

            if (isEditing) {
                return `
                    <div style="background:#ffffff; border:1.5px solid #2563eb; border-radius:14px; padding:14px 16px; display:flex; flex-direction:column; gap:10px; box-shadow:0 4px 14px rgba(37,99,235,0.12);">
                        <div style="display:flex; gap:8px;">
                            <select id="xldlEditSubtabIcon_${item.id}" style="width:140px; border:1.5px solid #93c5fd; border-radius:10px; padding:9px; font-weight:800; font-size:13.5px;">
                                ${SUBTAB_ICON_OPTIONS.map(o => `<option value="${o.value}" ${o.value === (item.icon || '📌') ? 'selected' : ''}>${o.label}</option>`).join('')}
                            </select>
                            <input type="text" id="xldlEditSubtabTitle_${item.id}" value="${item.title}" style="flex:1; border:1.5px solid #93c5fd; border-radius:10px; padding:9px 14px; font-weight:700; font-size:14px;">
                        </div>
                        <div style="display:flex; justify-content:flex-end; gap:8px;">
                            <button onclick="window._xldlCancelSubtabEdit()" class="xldl-btn secondary" style="padding:6px 14px; font-size:13px; border-radius:8px;">✕ Hủy</button>
                            <button onclick="window._xldlSaveSubtabEdit('${item.id}')" class="xldl-btn primary" style="padding:6px 16px; font-size:13px; border-radius:8px; background:#0284c7;">💾 Lưu Thay Đổi</button>
                        </div>
                    </div>
                `;
            }

            const isFirst = idx === 0;
            const isLast = idx === subtabs.length - 1;

            return `
                <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:10px 14px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 2px 6px rgba(0,0,0,0.02); gap:10px;">
                    <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:0;">
                        <span style="font-size:12px; font-weight:850; color:#0284c7; background:#e0f2fe; padding:3px 8px; border-radius:6px; flex-shrink:0;">${idx + 1}</span>
                        <span style="font-size:19px; flex-shrink:0;">${item.icon || '📌'}</span>
                        <span style="font-size:14px; font-weight:800; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title}</span>
                    </div>
                    <div style="display:flex; gap:5px; align-items:center; flex-shrink:0;">
                        <div style="display:flex; gap:3px;">
                            <button onclick="window._xldlMoveSubtabUp('${item.id}')" ${isFirst ? 'disabled style="opacity:0.35; cursor:not-allowed; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:8px; padding:6px 10px; font-size:12px;"' : 'style="background:#eff6ff; color:#1d4ed8; border:1.5px solid #bfdbfe; border-radius:8px; padding:6px 10px; font-size:12px; font-weight:850; cursor:pointer; transition:all 0.15s ease;"'} title="Chuyển mục lên trước">
                                ⬆️ Lên
                            </button>
                            <button onclick="window._xldlMoveSubtabDown('${item.id}')" ${isLast ? 'disabled style="opacity:0.35; cursor:not-allowed; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:8px; padding:6px 10px; font-size:12px;"' : 'style="background:#eff6ff; color:#1d4ed8; border:1.5px solid #bfdbfe; border-radius:8px; padding:6px 10px; font-size:12px; font-weight:850; cursor:pointer; transition:all 0.15s ease;"'} title="Chuyển mục xuống sau">
                                ⬇️ Xuống
                            </button>
                        </div>
                        <button onclick="window._xldlStartSubtabEdit('${item.id}')" style="background:#fef3c7; color:#d97706; border:1px solid #fde68a; border-radius:8px; padding:6px 10px; font-size:12px; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:3px;">
                            ✏️ Sửa
                        </button>
                        <button onclick="window._xldlDeleteSubtabFromModal('${item.id}')" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; border-radius:8px; padding:6px 10px; font-size:12px; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:3px;">
                            🗑️ Xóa
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function _xldlGetLinkCategories(link) {
        if (!link) return ['Chung'];
        if (Array.isArray(link.categories) && link.categories.length > 0) return link.categories;
        if (link.category) return [link.category];
        return ['Chung'];
    }

    function _xldlFormatDescription(text) {
        if (!text) return '';
        let str = String(text).trim();
        if (!str) return '';

        // If URL string, return clean fallback
        if (str.startsWith('http')) {
            return str.includes('docs.google.com') ? 'Tài liệu Bảng tính Google Sheets' : 'Tài liệu liên kết kịch bản sale';
        }

        // Escape HTML
        let escaped = str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Convert **bold** to plain black bold text
        escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#0f172a; font-weight:800;">$1</strong>');

        // Convert *italic* to <em>italic</em>
        escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Convert newlines \n to <br>
        escaped = escaped.replace(/\n/g, '<br>');

        return escaped;
    }

    function _xldlGetCustomSubtabLinks(subId) {
        if (subId === 'test_kNM' || subId === 'knm') return _xldlGetKnmLinks();
        if (subId === 'knowledge' || subId === 'htkt') return _xldlGetHtktLinks();
        try {
            const raw = localStorage.getItem('xldl_links_' + subId);
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    let modified = false;
                    const normalized = parsed.map((item, index) => {
                        let newItem = { ...item };
                        if (!newItem.updatedAt) {
                            const baseTime = new Date(Date.now() - (parsed.length - index) * 3600000).toISOString();
                            newItem.createdAt = item.createdAt || baseTime;
                            newItem.updatedAt = item.updatedAt || item.createdAt || baseTime;
                            newItem.updatedBy = item.updatedBy || item.createdBy || 'Giám Đốc';
                            newItem.createdBy = item.createdBy || 'Giám Đốc';
                            modified = true;
                        }
                        return newItem;
                    });
                    if (modified) {
                        localStorage.setItem('xldl_links_' + subId, JSON.stringify(normalized));
                    }
                    return normalized;
                }
            }
        } catch (e) {}
        return [];
    }

    function _xldlSaveCustomSubtabLinks(subId, links) {
        if (subId === 'test_kNM' || subId === 'knm') {
            _xldlSaveKnmLinks(links);
        } else if (subId === 'knowledge' || subId === 'htkt') {
            _xldlSaveHtktLinks(links);
        } else {
            localStorage.setItem('xldl_links_' + subId, JSON.stringify(links));
            _xldlSyncSaveToServer();
        }
    }

    function _xldlRenderMuc1(container) {
        const subtabs = _xldlGetSubtabsMuc2();
        if (!subtabs.some(s => s.id === currentSubTab1)) {
            currentSubTab1 = subtabs[0].id;
        }
        const activeSubtab = subtabs.find(s => s.id === currentSubTab1) || subtabs[0];

        container.innerHTML = `
            <!-- Global Search Bar for Section 2 (Cho NẰM TRÊN thanh Sub-tabs theo yêu cầu) -->
            <div style="margin-bottom:20px; position:relative;">
                <div style="position:relative; display:flex; align-items:center;">
                    <span style="position:absolute; left:18px; font-size:18px; color:#0284c7; pointer-events:none; z-index:2;">🔍</span>
                    <input type="text" id="xldlSearchInput" value="${globalSearchQuery || currentSearchQuery || ''}" 
                        placeholder="Nhập tên lỗi, từ khóa, tiêu đề, kịch bản hoặc mã sự cố cần tra cứu (Tìm toàn bộ 3 Mục)..." 
                        style="width:100%; border:2px solid #bae6fd; border-radius:18px; padding:13px 48px 13px 48px; font-size:14.5px; font-weight:700; background:#ffffff; outline:none; color:#0f172a; box-shadow:0 4px 16px rgba(2, 132, 199, 0.08); transition:all 0.2s ease;"
                        oninput="window._xldlOnGlobalSearchInput(this.value, 'xldlSearchInput')"
                        onfocus="this.style.borderColor='#0284c7'; this.style.boxShadow='0 6px 20px rgba(2, 132, 199, 0.2)';"
                        onblur="this.style.borderColor='#bae6fd'; this.style.boxShadow='0 4px 16px rgba(2, 132, 199, 0.08)';">
                    <button id="xldlSearchInputClearBtn" onclick="window._xldlClearGlobalSearch()" style="position:absolute; right:16px; background:#e2e8f0; border:none; border-radius:50%; width:24px; height:24px; display:${(globalSearchQuery || currentSearchQuery) ? 'flex' : 'none'}; align-items:center; justify-content:center; cursor:pointer; font-weight:bold; color:#475569;" title="Xóa tìm kiếm">✕</button>
                </div>
            </div>

            <!-- Sub-tabs Bar & Actions (Nền Nhạt Lấp Lánh - Glossy Shimmer Effects) -->
            <div style="
                display:flex; 
                justify-content:space-between; 
                align-items:center; 
                margin-bottom:22px; 
                flex-wrap:wrap; 
                gap:14px; 
                background: linear-gradient(135deg, rgba(239, 246, 255, 0.95) 0%, rgba(224, 242, 254, 0.98) 40%, rgba(243, 232, 255, 0.95) 100%); 
                backdrop-filter: blur(16px); 
                -webkit-backdrop-filter: blur(16px); 
                padding:14px 22px; 
                border-radius:20px; 
                border: 1.5px solid rgba(186, 230, 253, 0.9); 
                box-shadow: 0 12px 32px -8px rgba(2, 132, 199, 0.18), inset 0 2px 4px rgba(255, 255, 255, 0.95), inset 0 -2px 4px rgba(147, 197, 253, 0.25);
                position: relative;
                overflow: hidden;
            ">
                <!-- Ambient Sparkling Overlay -->
                <div style="position:absolute; top:-50%; left:-20%; width:140%; height:200%; background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.8) 0%, rgba(255,255,255,0) 60%); pointer-events:none; opacity:0.75;"></div>

                <div class="xldl-subtabs" style="margin:0; display:flex; gap:12px; flex-wrap:wrap; align-items:center; position:relative; z-index:2;">
                    ${subtabs.map(st => `
                        <button class="xldl-subtab-btn ${currentSubTab1 === st.id ? 'active' : ''}" onclick="window._xldlSwitchSubTab1('${st.id}')" 
                            style="
                                display:inline-flex; 
                                align-items:center; 
                                gap:8px; 
                                font-size:14px; 
                                font-weight:850; 
                                padding:10px 22px; 
                                border-radius:30px; 
                                transition: all 0.25s ease;
                                cursor:pointer;
                                ${currentSubTab1 === st.id 
                                    ? 'background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); color:#ffffff; border:none; box-shadow: 0 6px 18px rgba(37, 99, 235, 0.45), inset 0 1px 2px rgba(255,255,255,0.4); text-shadow:0 1px 2px rgba(0,0,0,0.25);' 
                                    : 'background: rgba(255, 255, 255, 0.9); color:#0f172a; border:1.5px solid #cbd5e1; box-shadow: 0 3px 10px rgba(0,0,0,0.04);'}
                            "
                            onmouseover="if(this.className.indexOf('active')===-1){this.style.background='#ffffff'; this.style.borderColor='#93c5fd'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 15px rgba(2, 132, 199, 0.15)';}"
                            onmouseout="if(this.className.indexOf('active')===-1){this.style.background='rgba(255, 255, 255, 0.9)'; this.style.borderColor='#cbd5e1'; this.style.transform='translateY(0)'; this.style.boxShadow='0 3px 10px rgba(0,0,0,0.04)';}">
                            ${st.icon || '📌'} ${st.title}
                        </button>
                    `).join('')}
                </div>
                <div style="display:flex; align-items:center; gap:12px; position:relative; z-index:2;">
                    <button class="xldl-btn primary" onclick="window._xldlOpenAddLinkModal('${activeSubtab.id}')" 
                        style="
                            border-radius:14px; 
                            padding:10px 20px; 
                            font-size:13.5px; 
                            font-weight:900; 
                            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); 
                            color:#ffffff;
                            border:none; 
                            box-shadow: 0 6px 18px rgba(2, 132, 199, 0.4), inset 0 1px 2px rgba(255,255,255,0.4);
                            text-shadow:0 1px 2px rgba(0,0,0,0.2);
                            transition: all 0.2s ease;
                        "
                        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 22px rgba(2, 132, 199, 0.5)';"
                        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 6px 18px rgba(2, 132, 199, 0.4)';">
                        ➕ Tạo Đường Link Mới
                    </button>
                    <button class="xldl-btn secondary" onclick="window._xldlOpenManageSubtabModal()" 
                        style="
                            border-radius:14px; 
                            padding:10px 20px; 
                            font-size:13.5px; 
                            font-weight:900; 
                            background: rgba(255, 255, 255, 0.95);
                            color:#0284c7;
                            border: 1.5px solid #7dd3fc; 
                            box-shadow: 0 4px 14px rgba(2, 132, 199, 0.15);
                            transition: all 0.2s ease;
                        "
                        onmouseover="this.style.background='#ffffff'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 18px rgba(2, 132, 199, 0.25)';"
                        onmouseout="this.style.background='rgba(255, 255, 255, 0.95)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 14px rgba(2, 132, 199, 0.15)';">
                        ⚙️ Cài Đặt Mục
                    </button>
                </div>
            </div>

            <div id="xldlMuc1Content" class="xldl-tab-body"></div>
        `;
        _xldlRenderSubTab1();
    }

    let currentSearchQuery = '';

    window._xldlOnGlobalSearchInput = function(val, inputId) {
        globalSearchQuery = (val || '').trim();
        errorSearchQuery = globalSearchQuery;
        currentSearchQuery = globalSearchQuery;
        currentSearchQuery3 = globalSearchQuery;

        ['errorSearchClearBtn', 'xldlSearchInput3ClearBtn', 'xldlSearchInputClearBtn'].forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) btn.style.display = globalSearchQuery ? 'flex' : 'none';
        });

        ['errorSearchInput', 'xldlSearchInput3', 'xldlSearchInput'].forEach(id => {
            if (id !== inputId) {
                const el = document.getElementById(id);
                if (el && el.value !== val) el.value = val;
            }
        });

        const q = globalSearchQuery.toLowerCase();

        let targetBody = null;
        if (currentMainTab === 'muc1_error' || currentMainTab === 'muc3') {
            targetBody = document.getElementById('xldlMuc3ContentBody');
        } else if (currentMainTab === 'muc3_official' || currentMainTab === 'muc2') {
            targetBody = document.getElementById('xldlMuc2Content');
        } else {
            targetBody = document.getElementById('xldlMuc1Content');
        }

        if (!targetBody) {
            _xldlRenderCurrentMainTab();
            return;
        }

        if (q !== '') {
            _xldlRenderGlobalSearchResults(targetBody, q);
        } else {
            if (currentMainTab === 'muc1_error' || currentMainTab === 'muc3') {
                _xldlRenderMuc3Body(targetBody);
            } else if (currentMainTab === 'muc3_official' || currentMainTab === 'muc2') {
                _xldlRenderSubTab2();
            } else {
                _xldlRenderSubTab1();
            }
        }
    };

    window._xldlOnSearchInput = function(val) {
        window._xldlOnGlobalSearchInput(val, 'xldlSearchInput');
    };

    window._xldlClearGlobalSearch = function() {
        globalSearchQuery = '';
        errorSearchQuery = '';
        currentSearchQuery = '';
        currentSearchQuery3 = '';

        ['errorSearchInput', 'xldlSearchInput3', 'xldlSearchInput'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        ['errorSearchClearBtn', 'xldlSearchInput3ClearBtn', 'xldlSearchInputClearBtn'].forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) btn.style.display = 'none';
        });

        _xldlRenderCurrentMainTab();
    };

    window._xldlClearSearch = window._xldlClearGlobalSearch;

    window._xldlSwitchSubTab1 = function(subId) {
        currentSubTab1 = subId;
        localStorage.setItem('xldl_sub_tab1', subId);
        _xldlRenderCurrentMainTab();
    };

    function _xldlRenderSubTab1() {
        const body = document.getElementById('xldlMuc1Content');
        if (!body) return;

        const activeSearchQuery = (globalSearchQuery || currentSearchQuery || '').trim().toLowerCase();
        if (activeSearchQuery !== '') {
            _xldlRenderGlobalSearchResults(body, activeSearchQuery);
            return;
        }

        if (currentSubTab1 === 'test_kNM') {
            _xldlRenderQuiz(body);
        } else if (currentSubTab1 === 'knowledge') {
            _xldlRenderFlashcards(body);
        } else {
            _xldlRenderCustomSubtabView(body, currentSubTab1);
        }
    }

    function _xldlRenderExtraCardSections(link) {
        let html = '';

        // 1. Steps (Quy Trình Xử Lý Từng Bước)
        let steps = [];
        if (Array.isArray(link.steps) && link.steps.length > 0) {
            steps = link.steps;
        } else if (typeof link.steps === 'string' && link.steps.trim()) {
            steps = link.steps.split('\n').filter(Boolean);
        } else if (typeof link.fix_guide === 'string' && link.fix_guide.trim()) {
            steps = link.fix_guide.split('\n').filter(Boolean);
        }

        if (steps.length > 0) {
            html += `
                <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #16a34a; border-radius:12px; padding:12px 14px; margin-top:12px;">
                    <div style="font-size:12.5px; font-weight:900; color:#166534; margin-bottom:6px;">📋 QUY TRÌNH XỬ LÝ TỪNG BƯỚC (STEP-BY-STEP)</div>
                    <div style="font-size:13px; font-weight:600; color:#15803d; line-height:1.6;">
                        ${steps.map(s => {
                            const txt = typeof s === 'string' ? s : (s.text || s.step || JSON.stringify(s));
                            return `<div>${txt}</div>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        // 2. Sale Guide (Hướng Dẫn Ứng Xử Cho Sale)
        let saleGuide = [];
        if (Array.isArray(link.saleGuide) && link.saleGuide.length > 0) {
            saleGuide = link.saleGuide;
        } else if (Array.isArray(link.sale_guide) && link.sale_guide.length > 0) {
            saleGuide = link.sale_guide;
        } else if (typeof link.sale_guide === 'string' && link.sale_guide.trim()) {
            saleGuide = [{ question: link.sale_guide }];
        }

        if (saleGuide.length > 0) {
            html += `
                <div style="background:#eff6ff; border:1px solid #bfdbfe; border-left:4px solid #2563eb; border-radius:12px; padding:12px 14px; margin-top:12px;">
                    <div style="font-size:12.5px; font-weight:900; color:#1e40af; margin-bottom:6px;">🗣️ HƯỚNG DẪN SALE TRAO ĐỔI VỚI KHÁCH</div>
                    <div style="font-size:13px; font-weight:600; color:#1e3a8a; line-height:1.6; display:flex; flex-direction:column; gap:6px;">
                        ${saleGuide.map((sg, idx) => {
                            if (typeof sg === 'object' && sg !== null) {
                                const g = sg.goal ? `<div style="color:#1d4ed8; font-size:12.5px; font-weight:800;">🎯 Mục tiêu câu hỏi ${idx + 1}: ${sg.goal}</div>` : '';
                                const questionTxt = sg.question || sg.text || sg.content || '';
                                const cleanQ = _xldlCleanQuestionText(questionTxt);
                                const q = questionTxt ? `
                                    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:2px;">
                                        <div style="color:#1e40af; font-size:13px; font-weight:700; flex:1;">🗣️ Câu Hỏi ${idx + 1}: "${cleanQ}"</div>
                                        <button type="button" onclick="event.stopPropagation(); window._xldlCopyQuestionText(\`${cleanQ.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`)" style="background:#2563eb; color:#ffffff; border:none; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:800; cursor:pointer; flex-shrink:0;" title="Copy nội dung câu hỏi">
                                            📋 Copy
                                        </button>
                                    </div>
                                ` : '';
                                return `
                                    <div style="background:#ffffff; border:1px solid #dbeafe; padding:8px 10px; border-radius:8px;">
                                        ${g}
                                        ${q}
                                    </div>
                                `;
                            } else {
                                const rawStr = String(sg);
                                const cleanQ = _xldlCleanQuestionText(rawStr);
                                return `
                                    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                                        <div>🗣️ ${rawStr}</div>
                                        <button type="button" onclick="event.stopPropagation(); window._xldlCopyQuestionText(\`${cleanQ.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`)" style="background:#2563eb; color:#ffffff; border:none; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:800; cursor:pointer; flex-shrink:0;" title="Copy nội dung câu hỏi">
                                            📋 Copy
                                        </button>
                                    </div>
                                `;
                            }
                        }).join('')}
                    </div>
                </div>
            `;
        }

        // 3. Warranty (Trách Nhiệm & Bảo Hành)
        let warranty = [];
        if (Array.isArray(link.warranty) && link.warranty.length > 0) {
            warranty = link.warranty;
        } else if (Array.isArray(link.resps) && link.resps.length > 0) {
            warranty = link.resps;
        } else if (Array.isArray(link.responsibility) && link.responsibility.length > 0) {
            warranty = link.responsibility;
        } else if (typeof link.responsibility === 'string' && link.responsibility.trim()) {
            warranty = [link.responsibility];
        }

        if (warranty.length > 0) {
            html += `
                <div style="background:#faf5ff; border:1px solid #f3e8ff; border-left:4px solid #a855f7; border-radius:12px; padding:12px 14px; margin-top:12px;">
                    <div style="font-size:12.5px; font-weight:900; color:#6b21a8; margin-bottom:6px;">⚖️ TRÁCH NHIỆM & BẢO HÀNH</div>
                    <div style="font-size:13px; font-weight:600; color:#581c87; line-height:1.6; display:flex; flex-direction:column; gap:4px;">
                        ${warranty.map((w, idx) => {
                            const txt = typeof w === 'string' ? w : (w.text || w.content || JSON.stringify(w));
                            return `<div>• <strong>Bảo Hành ${idx + 1}:</strong> ${txt}</div>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        return html;
    }

    function _xldlHasValidUrl(url) {
        if (!url || typeof url !== 'string') return false;
        const trimmed = url.trim();
        if (!trimmed || trimmed === '#' || trimmed === 'javascript:void(0)') return false;
        return true;
    }

    function _xldlRenderCardHTML(link, subId) {
        const themeName = link.theme || 'blue';
        const linkCats = _xldlGetLinkCategories(link);
        const hasValidUrl = _xldlHasValidUrl(link.url);

        return `
            <div class="xldl-card-item theme-${themeName} ${link.isPinned ? 'is-pinned-card' : ''}">
                <div class="card-accent-bar theme-${themeName}"></div>
                <div class="card-inner">
                    <div class="card-head-row">
                        <div class="card-icon-box theme-${themeName}">${link.icon || '📞'}</div>
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
                        ${_xldlCanManage() ? `
                            <div class="card-quick-actions">
                                <button class="card-action-btn pin ${link.isPinned ? 'active-pin' : ''}" 
                                    title="${link.isPinned ? 'Bỏ ghim quan trọng' : 'Ghim quan trọng lên đầu'}" 
                                    onclick="window._xldlTogglePinLink('${link.id}', '${subId}')"
                                    style="${link.isPinned ? 'background:#fef3c7; color:#d97706; border-color:#fde68a; font-weight:900;' : ''}">
                                    ${link.isPinned ? '⭐' : '📌'}
                                </button>
                                <button class="card-action-btn edit" title="Chỉnh sửa link" onclick="window._xldlOpenEditLinkModal('${link.id}', '${subId}')">✏️</button>
                                <button class="card-action-btn delete" title="Xóa link" onclick="window._xldlDeleteLink('${link.id}', '${subId}')">🗑️</button>
                            </div>
                        ` : ''}
                    </div>
                    <div class="card-main-content" style="cursor:pointer;" onclick="window._xldlOpenDetailModal('${link.id}', '${subId}')" title="Nhấp để xem chi tiết đầy đủ kịch bản & quy trình">
                        <h3 class="card-title">${_xldlFormatTitle(link.title)}</h3>
                        <div class="card-desc">${_xldlFormatDescription(link.subtitle || link.url)}</div>
                    </div>

                    <!-- Nút Hành Động Trên Card -->
                    <div style="display:flex; gap:8px; margin-top:14px; align-items:center;">
                        <button type="button" onclick="window._xldlOpenDetailModal('${link.id}', '${subId}')" 
                            style="flex:1; min-width:0; border:none; background:linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); color:#ffffff; font-weight:850; font-size:12.5px; padding:10px 10px; border-radius:12px; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:4px; box-shadow:0 4px 12px rgba(37,99,235,0.25); transition:all 0.2s ease; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="Xem Chi Tiết Kịch Bản & Quy Trình">
                            📋 <span>${hasValidUrl ? 'Xem Chi Tiết ➔' : 'Xem Chi Tiết Kịch Bản & Quy Trình ➔'}</span>
                        </button>
                        ${hasValidUrl ? `
                            <a href="${link.url}" target="_blank" rel="noopener" class="card-btn-open theme-${themeName}" style="flex:1; min-width:0; padding:10px 10px; font-size:12.5px; font-weight:850; border-radius:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-decoration:none; display:flex; justify-content:center; align-items:center; gap:4px;" title="Mở Tài Liệu Trực Tiếp">
                                🔗 <span>Mở Tài Liệu ↗</span>
                            </a>
                        ` : ''}
                    </div>

                    <div class="card-updated-info" style="font-size:10.5px; color:#94a3b8; font-weight:600; margin-top:12px; display:flex; align-items:center; gap:5px; flex-wrap:wrap; background:#f8fafc; padding:4px 10px; border-radius:8px; border:1px solid #f1f5f9; width:fit-content;">
                        <span>🕒 Cập nhật:</span>
                        <strong style="color:#475569; font-weight:750;">${link.updatedBy || link.createdBy || 'Giám Đốc'}</strong>
                        <span style="color:#cbd5e1;">•</span>
                        <span style="color:#64748b;">${_xldlFormatDateTime(link.updatedAt || link.createdAt)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    function _xldlMatchLink(l, query) {
        if (!l || !query) return false;
        const q = query.toLowerCase();
        const lCats = _xldlGetLinkCategories(l);

        if ((l.title || '').toLowerCase().includes(q)) return true;
        if ((l.subtitle || '').toLowerCase().includes(q)) return true;
        if ((l.url || '').toLowerCase().includes(q)) return true;
        if ((l.category || '').toLowerCase().includes(q)) return true;
        if (lCats.some(c => c.toLowerCase().includes(q))) return true;

        if (Array.isArray(l.steps)) {
            if (l.steps.some(s => (typeof s === 'string' ? s : (s.text || s.step || '')).toLowerCase().includes(q))) return true;
        } else if (typeof l.steps === 'string') {
            if (l.steps.toLowerCase().includes(q)) return true;
        } else if (typeof l.fix_guide === 'string') {
            if (l.fix_guide.toLowerCase().includes(q)) return true;
        }

        if (Array.isArray(l.saleGuide)) {
            if (l.saleGuide.some(sg => (typeof sg === 'string' ? sg : (sg.question || sg.goal || sg.text || '')).toLowerCase().includes(q))) return true;
        } else if (typeof l.sale_guide === 'string') {
            if (l.sale_guide.toLowerCase().includes(q)) return true;
        }

        if (Array.isArray(l.warranty)) {
            if (l.warranty.some(w => (typeof w === 'string' ? w : (w.text || w.content || '')).toLowerCase().includes(q))) return true;
        } else if (typeof l.responsibility === 'string') {
            if (l.responsibility.toLowerCase().includes(q)) return true;
        }

        return false;
    }

    function _xldlRenderGlobalSearchResults(container, query) {
        const q = (query || '').trim().toLowerCase();
        if (!q) return;

        // 1. MỤC 1: Tình Huống Xử Lý Lỗi (muc1_error)
        const subtabs1 = _xldlGetSubtabs('muc1_error');
        let muc1Links = [];
        const seenIds1 = new Set();
        subtabs1.forEach(sub => {
            const links = _xldlGetCustomSubtabLinks(sub.id);
            links.forEach(l => {
                if (!seenIds1.has(l.id) && _xldlMatchLink(l, q)) {
                    seenIds1.add(l.id);
                    muc1Links.push({ ...l, subtabId: sub.id, subtabTitle: sub.title });
                }
            });
        });

        let muc1ErrorItems = (errorList || []).filter(item => {
            let depts = []; try { depts = typeof item.departments === 'string' ? JSON.parse(item.departments) : (item.departments || []); } catch(e) {}
            return (item.error_name || '').toLowerCase().includes(q) ||
                   (item.cause || '').toLowerCase().includes(q) ||
                   (item.fix_guide || '').toLowerCase().includes(q) ||
                   (item.sale_guide || '').toLowerCase().includes(q) ||
                   (item.category_name || '').toLowerCase().includes(q) ||
                   depts.some(d => d.toLowerCase().includes(q));
        });

        const countMuc1 = muc1Links.length + muc1ErrorItems.length;

        // 2. MỤC 2: Đào Tạo Sale Chính Thức (muc3_official)
        const subtabs2 = _xldlGetSubtabs('muc3_official');
        let muc2Links = [];
        const seenIds2 = new Set();
        subtabs2.forEach(sub => {
            const links = _xldlGetCustomSubtabLinks(sub.id);
            links.forEach(l => {
                if (!seenIds2.has(l.id) && _xldlMatchLink(l, q)) {
                    seenIds2.add(l.id);
                    muc2Links.push({ ...l, subtabId: sub.id, subtabTitle: sub.title });
                }
            });
        });

        const matchedTelesale = TELESALE_SCRIPTS.filter(item => 
            (item.step || '').toLowerCase().includes(q) ||
            (item.title || '').toLowerCase().includes(q) ||
            (item.script || '').toLowerCase().includes(q) ||
            (item.note || '').toLowerCase().includes(q)
        );

        const matchedObjections = OBJECTION_HANDLERS.filter(obj => 
            (obj.title || '').toLowerCase().includes(q) ||
            (obj.answer || '').toLowerCase().includes(q)
        );

        const matchedChats = CHAT_SCRIPTS.filter(script => 
            (script.cat || '').toLowerCase().includes(q) ||
            (script.title || '').toLowerCase().includes(q) ||
            (script.content || '').toLowerCase().includes(q)
        );

        const countMuc2 = muc2Links.length + matchedTelesale.length + matchedObjections.length + matchedChats.length;

        // 3. MỤC 3: Đào Tạo Sale Thử Việc (muc2_probation)
        const subtabs3 = _xldlGetSubtabs('muc2_probation');
        let muc3Links = [];
        const seenIds3 = new Set();
        subtabs3.forEach(sub => {
            const links = _xldlGetCustomSubtabLinks(sub.id);
            links.forEach(l => {
                if (!seenIds3.has(l.id) && _xldlMatchLink(l, q)) {
                    seenIds3.add(l.id);
                    muc3Links.push({ ...l, subtabId: sub.id, subtabTitle: sub.title });
                }
            });
        });

        const matchedFlashcards = FLASHCARDS_DATA.filter(f => 
            (f.title || '').toLowerCase().includes(q) ||
            (f.front || '').toLowerCase().includes(q) ||
            (f.back || '').toLowerCase().includes(q) ||
            (f.category || '').toLowerCase().includes(q)
        );

        const countMuc3 = muc3Links.length + matchedFlashcards.length;
        const totalCount = countMuc1 + countMuc2 + countMuc3;

        let html = `
            <!-- Global Search Banner -->
            <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1.5px solid #93c5fd; border-radius: 18px; padding: 16px 22px; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 16px rgba(2, 132, 199, 0.1);">
                <div style="display:flex; align-items:center; gap:12px;">
                    <span style="font-size: 24px;">🔍</span>
                    <div>
                        <h4 style="margin:0; font-size:16.5px; font-weight:900; color:#1e40af;">
                            KẾT QUẢ TÌM KIẾM TOÀN BỘ TRANG (3 MỤC): "${query}"
                        </h4>
                        <p style="margin:3px 0 0 0; font-size:13.5px; font-weight:700; color:#0284c7;">
                            Tìm thấy ${totalCount} nội dung phù hợp (Mục 1: ${countMuc1}, Mục 2: ${countMuc2}, Mục 3: ${countMuc3}).
                        </p>
                    </div>
                </div>
                <button onclick="window._xldlClearGlobalSearch()" style="background:#ffffff; color:#dc2626; border:1px solid #fca5a5; border-radius:10px; padding:8px 16px; font-size:13px; font-weight:800; cursor:pointer;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#ffffff'">
                    ✕ Xóa Tìm Kiếm
                </button>
            </div>
        `;

        if (totalCount === 0) {
            html += `
                <div style="text-align:center; padding:48px 20px; background:#ffffff; border:2px dashed #bae6fd; border-radius:22px; box-shadow:0 6px 20px rgba(2, 132, 199, 0.06); margin-top:10px;">
                    <div style="font-size:52px; margin-bottom:12px;">🔍</div>
                    <h4 style="font-size:18px; font-weight:900; color:#1e40af; margin:0 0 8px 0;">
                        Không tìm thấy kết quả nào khớp với từ khóa "${query}" trên toàn bộ trang
                    </h4>
                    <p style="font-size:14px; font-weight:600; color:#64748b; margin:0 0 20px 0;">
                        Anh/Chị hãy thử tìm kiếm lại với các từ khóa khác (ví dụ: tên lỗi, kịch bản, sản phẩm, quy trình, giá...)
                    </p>
                    <button onclick="window._xldlClearGlobalSearch()" class="xldl-btn primary" style="border-radius:14px; padding:11px 24px; font-size:14px; font-weight:900;">
                        ✕ Xóa Tìm Kiếm
                    </button>
                </div>
            `;
            container.innerHTML = html;
            return;
        }

        // Render GROUP 1: MỤC 1
        if (countMuc1 > 0) {
            html += `
                <div style="margin-bottom:32px;">
                    <div style="margin:0 0 16px 0; background:linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); color:#ffffff; padding:12px 20px; border-radius:16px; font-size:16px; font-weight:900; display:flex; align-items:center; justify-content:space-between; box-shadow:0 4px 14px rgba(37,99,235,0.25);">
                        <span>🚨 MỤC 1: TÌNH HUỐNG XỬ LÝ LỖI (${countMuc1})</span>
                        <span style="font-size:12.5px; font-weight:700; background:rgba(255,255,255,0.2); padding:3px 10px; border-radius:10px;">Hiển thị ${muc1Links.length} tài liệu ${muc1ErrorItems.length ? `, ${muc1ErrorItems.length} sự cố` : ''}</span>
                    </div>

                    ${muc1Links.length > 0 ? `
                        <div class="xldl-link-grid" style="margin-bottom:20px;">
                            ${muc1Links.map(link => _xldlRenderCardHTML(link, link.subtabId)).join('')}
                        </div>
                    ` : ''}

                    ${muc1ErrorItems.length > 0 ? `
                        <div style="display:flex; flex-direction:column; gap:16px;">
                            ${muc1ErrorItems.map(item => {
                                let depts = []; try { depts = typeof item.departments === 'string' ? JSON.parse(item.departments) : (item.departments || []); } catch(e) {}
                                return `
                                    <div class="error-playbook-card">
                                        <div class="ep-card-header">
                                            <div class="ep-title-group">
                                                <span class="ep-cat-badge">${item.category_name || 'Sự Cố Doanh Nghiệp'}</span>
                                                <h3 class="ep-error-title">🚨 ${item.error_name}</h3>
                                            </div>
                                            <div class="ep-dept-tags">
                                                ${depts.map(d => `<span class="dept-tag">🏢 ${d}</span>`).join('')}
                                            </div>
                                        </div>
                                        <div class="ep-card-body">
                                            ${item.cause ? `<div class="ep-section cause-box"><strong>⚠️ Nguyên nhân cốt lõi:</strong> ${item.cause}</div>` : ''}
                                            <div class="ep-section fix-steps-box">
                                                <h4 class="ep-section-title">📋 QUY TRÌNH XỬ LÝ TỪNG BƯỚC (STEP-BY-STEP)</h4>
                                                <div class="ep-steps-text">${(item.fix_guide || 'Chưa cập nhật quy trình').replace(/\n/g, '<br>')}</div>
                                            </div>
                                            ${item.sale_guide ? `
                                                <div class="ep-section sale-guide-box">
                                                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                                        <h4 class="ep-section-title" style="margin:0;">🗣️ HƯỚNG DẪN ỨNG XỬ CHO SALE KHI NÓI CHUYỆN VỚI KHÁCH</h4>
                                                        <button type="button" onclick="event.stopPropagation(); window._xldlCopyQuestionText(\`${_xldlCleanQuestionText(item.sale_guide).replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`)" style="background:#2563eb; color:#ffffff; border:none; padding:5px 12px; border-radius:8px; font-size:11.5px; font-weight:800; cursor:pointer;">📋 Copy Câu Hỏi</button>
                                                    </div>
                                                    <div class="ep-sale-text">${item.sale_guide.replace(/\n/g, '<br>')}</div>
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // Render GROUP 2: MỤC 2
        if (countMuc2 > 0) {
            html += `
                <div style="margin-bottom:32px;">
                    <div style="margin:0 0 16px 0; background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color:#ffffff; padding:12px 20px; border-radius:16px; font-size:16px; font-weight:900; display:flex; align-items:center; justify-content:space-between; box-shadow:0 4px 14px rgba(2, 132, 199, 0.25);">
                        <span>💼 MỤC 2: ĐÀO TẠO SALE CHÍNH THỨC (${countMuc2})</span>
                        <span style="font-size:12.5px; font-weight:700; background:rgba(255,255,255,0.2); padding:3px 10px; border-radius:10px;">Hiển thị ${muc2Links.length} tài liệu ${matchedTelesale.length ? `, ${matchedTelesale.length} telesale` : ''} ${matchedChats.length ? `, ${matchedChats.length} chat` : ''}</span>
                    </div>

                    ${muc2Links.length > 0 ? `
                        <div class="xldl-link-grid" style="margin-bottom:20px;">
                            ${muc2Links.map(link => _xldlRenderCardHTML(link, link.subtabId)).join('')}
                        </div>
                    ` : ''}

                    ${matchedTelesale.length > 0 || matchedObjections.length > 0 ? `
                        <div class="xldl-telesale-layout" style="margin-bottom:20px;">
                            ${matchedTelesale.length > 0 ? `
                                <div class="ts-steps-section">
                                    <div class="ts-steps-timeline">
                                        ${matchedTelesale.map(item => `
                                            <div class="ts-step-card">
                                                <div class="ts-step-badge">${item.step}</div>
                                                <div class="ts-step-content">
                                                    <h4>${item.title}</h4>
                                                    <div class="ts-script-text">${item.script}</div>
                                                    <div class="ts-script-note">💡 <strong>Mẹo Sale:</strong> ${item.note}</div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}

                            ${matchedObjections.length > 0 ? `
                                <div class="ts-objections-section">
                                    <h3 class="ts-section-title">🛡️ Ứng Phó Tức Thì Tình Huống Từ Chối</h3>
                                    <div class="ts-objection-grid">
                                        ${matchedObjections.map(obj => `
                                            <div class="ts-obj-card">
                                                <h4>${obj.title}</h4>
                                                <div class="ts-obj-ans">${obj.answer.replace(/\n/g, '<br>')}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}

                    ${matchedChats.length > 0 ? `
                        <div style="margin-bottom:20px;">
                            <h4 style="font-size:14.5px; font-weight:900; color:#0369a1; margin:0 0 12px 0;">💬 Kịch Bản Nhắn Tin Zalo/Pancake (${matchedChats.length})</h4>
                            <div class="chat-cards-list">
                                ${matchedChats.map((script, idx) => `
                                    <div class="chat-script-card">
                                        <div class="chat-card-head">
                                            <span class="chat-cat-tag">${script.cat}</span>
                                            <h4 class="chat-script-title">${script.title}</h4>
                                        </div>
                                        <div class="chat-card-body">
                                            <pre class="chat-content-text" id="chatSearchContent_${idx}">${script.content}</pre>
                                        </div>
                                        <div class="chat-card-footer">
                                            <button class="xldl-btn primary" onclick="window._xldlCopySearchChatScript(${idx})">
                                                📋 Sao chép kịch bản (1-Click)
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // Render GROUP 3: MỤC 3
        if (countMuc3 > 0) {
            html += `
                <div style="margin-bottom:32px;">
                    <div style="margin:0 0 16px 0; background:linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color:#ffffff; padding:12px 20px; border-radius:16px; font-size:16px; font-weight:900; display:flex; align-items:center; justify-content:space-between; box-shadow:0 4px 14px rgba(124, 58, 237, 0.25);">
                        <span>🎓 MỤC 3: ĐÀO TẠO SALE THỬ VIỆC (${countMuc3})</span>
                        <span style="font-size:12.5px; font-weight:700; background:rgba(255,255,255,0.2); padding:3px 10px; border-radius:10px;">Hiển thị ${muc3Links.length} tài liệu ${matchedFlashcards.length ? `, ${matchedFlashcards.length} thẻ ghi nhớ` : ''}</span>
                    </div>

                    ${muc3Links.length > 0 ? `
                        <div class="xldl-link-grid" style="margin-bottom:20px;">
                            ${muc3Links.map(link => _xldlRenderCardHTML(link, link.subtabId)).join('')}
                        </div>
                    ` : ''}

                    ${matchedFlashcards.length > 0 ? `
                        <div>
                            <h4 style="font-size:14.5px; font-weight:900; color:#6d28d9; margin:0 0 12px 0;">📚 Thẻ Ghi Nhớ Kiến Thức Flashcards (${matchedFlashcards.length})</h4>
                            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:14px;">
                                ${matchedFlashcards.map(fc => `
                                    <div style="background:#ffffff; border:1.5px solid #d8b4fe; border-radius:16px; padding:16px; box-shadow:0 4px 14px rgba(124, 58, 237, 0.08);">
                                        <span style="font-size:11px; font-weight:900; color:#7c3aed; background:#f3e8ff; padding:3px 8px; border-radius:6px; display:inline-block; margin-bottom:8px;">📌 ${fc.category}</span>
                                        <h5 style="margin:0 0 8px 0; font-size:14px; font-weight:900; color:#0f172a;">${fc.title}</h5>
                                        <div style="font-size:13px; font-weight:700; color:#334155; margin-bottom:6px;"><strong>Q:</strong> ${fc.front}</div>
                                        <div style="font-size:13px; font-weight:600; color:#6d28d9; background:#faf5ff; padding:8px 10px; border-radius:8px;"><strong>A:</strong> ${fc.back}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        container.innerHTML = html;
    }

    function _xldlFormatSheetEmbedUrl(url) {
        if (!url) return '';
        if (url.includes('docs.google.com/spreadsheets')) {
            let base = url.split('#')[0];
            const hashMatch = url.match(/#gid=\d+/);
            const gidHash = hashMatch ? hashMatch[0] : '';

            if (base.includes('/edit')) {
                base = base.replace(/\/edit.*$/, '/preview?rm=minimal');
            } else if (!base.includes('/preview') && !base.includes('/pubhtml')) {
                base = base.replace(/\/$/, '') + '/preview?rm=minimal';
            } else if (base.includes('/preview') && !base.includes('rm=minimal')) {
                base += base.includes('?') ? '&rm=minimal' : '?rm=minimal';
            }
            return base + (gidHash ? '&' + gidHash.replace('#', '') : '');
        }
        return url;
    }

    window._xldlToggleEmbedSheet = function(linkId) {
        const box = document.getElementById('xldlEmbedSheetContainer_' + linkId);
        if (!box) return;

        if (box.style.display === 'none' || !box.style.display) {
            const iframe = box.querySelector('iframe');
            if (iframe && !iframe.getAttribute('src')) {
                const targetUrl = iframe.getAttribute('data-src');
                if (targetUrl) iframe.setAttribute('src', targetUrl);
            }
            box.style.display = 'block';
        } else {
            box.style.display = 'none';
        }
    };

    function _xldlRenderCustomSubtabView(container, subId, scope = null) {
        if (!scope) {
            if (currentMainTab === 'muc1_error' || currentMainTab === 'muc3') scope = 'muc1_error';
            else if (currentMainTab === 'muc3_official' || currentMainTab === 'muc2') scope = 'muc3_official';
            else scope = 'knm';
        }

        const links = _xldlGetCustomSubtabLinks(subId);

        const categories = _xldlGetCategories(scope);
        const activeCat = activeCatFilter[scope] || 'all';
        const query = ((scope === 'muc3_official' ? currentSearchQuery3 : currentSearchQuery) || '').trim().toLowerCase();

        const displayLinks = links.filter(l => {
            const lCats = _xldlGetLinkCategories(l);
            const matchQ = !query || (l.title || '').toLowerCase().includes(query) || (l.subtitle || '').toLowerCase().includes(query) || lCats.some(c => c.toLowerCase().includes(query));
            const matchC = activeCat === 'all' || lCats.includes(activeCat);
            return matchQ && matchC;
        });

        const pinnedLinks = displayLinks.filter(l => l.isPinned);
        const normalLinks = displayLinks.filter(l => !l.isPinned);

        container.innerHTML = `
            <!-- Category Filter Bar (Luôn hiển thị tất cả & Cài Đặt Lĩnh Vực) -->
            <div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; padding:14px 20px; border-radius:18px; border:1.5px solid #e2e8f0; margin-bottom:22px; box-shadow:0 4px 14px rgba(0,0,0,0.03); flex-wrap:wrap; gap:12px;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <span style="font-size:13.5px; font-weight:900; color:#334155; margin-right:4px;">📌 Lĩnh vực:</span>
                    <button class="dept-pill ${activeCat === 'all' ? 'active' : ''}" onclick="window._xldlSelectCatFilter('${scope}', 'all')">
                        🌐 Tất Cả Lĩnh Vực (${links.length})
                    </button>
                    ${categories.map(cat => {
                        const count = links.filter(l => _xldlGetLinkCategories(l).includes(cat)).length;
                        return `
                            <button class="dept-pill ${activeCat === cat ? 'active' : ''}" onclick="window._xldlSelectCatFilter('${scope}', '${cat.replace(/'/g, "\\'")}')">
                                📌 ${cat} (${count})
                            </button>
                        `;
                    }).join('')}
                </div>
                ${_xldlCanManage() ? `
                    <button class="xldl-btn secondary" onclick="window._xldlOpenManageCatModal('${scope}')" style="border-radius:12px; padding:9px 18px; font-size:13.5px; font-weight:800; border-color:#7dd3fc; color:#0284c7; background:#ffffff;">
                        ⚙️ Cài Đặt Lĩnh Vực
                    </button>
                ` : ''}
            </div>

            <!-- Link Cards Section -->
            ${displayLinks.length === 0 ? `
                <div style="text-align:center; padding:44px 20px; background:#ffffff; border:2px dashed #bae6fd; border-radius:20px; box-shadow:0 4px 16px rgba(2, 132, 199, 0.04);">
                    <div style="font-size:48px; margin-bottom:12px;">📭</div>
                    <div style="font-size:16.5px; font-weight:850; color:#1e293b; margin-bottom:6px;">Chưa có tài liệu/đường link nào thuộc Lĩnh Vực "${activeCat === 'all' ? 'Tất cả' : activeCat}"</div>
                    <p style="font-size:14px; color:#64748b; margin:0 0 20px 0; font-weight:600;">Anh/Chị hãy nhấn nút bên dưới để tạo đường link tài liệu kịch bản mới cho mục này nhé.</p>
                    <button class="xldl-btn primary" onclick="window._xldlOpenAddLinkModal('${subId}')" style="border-radius:14px; padding:12px 26px; font-size:14px; font-weight:900; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color:#ffffff; border:none; box-shadow: 0 6px 18px rgba(2, 132, 199, 0.4);">
                        ➕ Tạo Đường Link Đầu Tiên
                    </button>
                </div>
            ` : `
                ${pinnedLinks.length > 0 ? `
                    <!-- HÀNG TÀI LIỆU QUAN TRỌNG ĐẢM BẢO RIÊNG BIỆT NẰM Ở HÀNG ĐẦU TIÊN -->
                    <div style="margin-bottom:28px;">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px; font-size:13.5px; font-weight:900; color:#b45309; background:linear-gradient(135deg, #fffbe6 0%, #fef3c7 100%); padding:9px 16px; border-radius:12px; border:1.5px solid #fde68a; width:fit-content; box-shadow:0 4px 12px rgba(217, 119, 6, 0.1);">
                            <span style="font-size:16px;">📌⭐</span>
                            <span>MỤC QUAN TRỌNG (${pinnedLinks.length})</span>
                        </div>
                        <div class="xldl-link-grid">
                            ${pinnedLinks.map(link => _xldlRenderCardHTML(link, subId)).join('')}
                        </div>
                    </div>
                ` : ''}

                ${normalLinks.length > 0 ? `
                    <!-- HÀNG TÀI LIỆU THÔNG THƯỜNG -->
                    ${pinnedLinks.length > 0 ? `
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px; font-size:13px; font-weight:850; color:#64748b; padding-top:4px;">
                            <span>📁</span>
                            <span>DANH SÁCH TÀI LIỆU BÌNH THƯỜNG (${normalLinks.length})</span>
                        </div>
                    ` : ''}
                    <div class="xldl-link-grid">
                        ${normalLinks.map(link => _xldlRenderCardHTML(link, subId)).join('')}
                    </div>
                ` : ''}
            `}
        `;
    }

    // Quiz View (Dynamic Link Management)
    function _xldlRenderQuiz(container) {
        _xldlRenderCustomSubtabView(container, 'test_kNM', 'knm');
    }

    // Dynamic Link View for Học Thuộc Kiến Thức (HTKT)
    function _xldlRenderFlashcards(container) {
        _xldlRenderCustomSubtabView(container, 'knowledge', 'htkt');
    }

    window._xldlToggleFlipCard = function() {
        flashcardFlipped = !flashcardFlipped;
        const mainCard = document.querySelector('.fc-main-card');
        if (mainCard) {
            mainCard.classList.toggle('flipped', flashcardFlipped);
        }
    };

    window._xldlSetFcCat = function(cat) {
        flashcardCategory = cat;
        flashcardCurrentIdx = 0;
        flashcardFlipped = false;
        _xldlRenderSubTab1();
    };

    window._xldlNextFc = function() {
        const filtered = flashcardCategory === 'all' ? FLASHCARDS_DATA : FLASHCARDS_DATA.filter(c => c.category === flashcardCategory);
        if (flashcardCurrentIdx < filtered.length - 1) {
            flashcardCurrentIdx++;
        } else {
            flashcardCurrentIdx = 0;
        }
        flashcardFlipped = false;
        _xldlRenderSubTab1();
    };

    window._xldlPrevFc = function() {
        const filtered = flashcardCategory === 'all' ? FLASHCARDS_DATA : FLASHCARDS_DATA.filter(c => c.category === flashcardCategory);
        if (flashcardCurrentIdx > 0) {
            flashcardCurrentIdx--;
        } else {
            flashcardCurrentIdx = filtered.length - 1;
        }
        flashcardFlipped = false;
        _xldlRenderSubTab1();
    };

    // ==========================================
    // MỤC 2 (HIỂN THỊ LÀ MỤC 3 TRÊN UI): ĐÀO TẠO SALE CHÍNH THỨC
    // ==========================================
    let currentSearchQuery3 = '';

    window._xldlOnSearchInput3 = function(val) {
        window._xldlOnGlobalSearchInput(val, 'xldlSearchInput3');
    };

    window._xldlClearSearch3 = function() {
        window._xldlClearGlobalSearch();
    };

    function _xldlRenderMuc2(container) {
        const subtabs = _xldlGetSubtabsMuc3();
        if (!subtabs.some(s => s.id === currentSubTab2)) {
            currentSubTab2 = subtabs[0] ? subtabs[0].id : 'telesale';
        }

        container.innerHTML = `
            <!-- Global Search Bar for Section 3 (Nằm Trên Thanh Sub-tabs) -->
            <div style="margin-bottom:20px; position:relative;">
                <div style="position:relative; display:flex; align-items:center;">
                    <span style="position:absolute; left:18px; font-size:18px; color:#0284c7; pointer-events:none; z-index:2;">🔍</span>
                    <input type="text" id="xldlSearchInput3" value="${globalSearchQuery || currentSearchQuery3 || ''}" 
                        placeholder="Nhập tên lỗi, từ khóa, tiêu đề, kịch bản hoặc mã sự cố cần tra cứu (Tìm toàn bộ 3 Mục)..." 
                        style="width:100%; border:2px solid #bae6fd; border-radius:18px; padding:13px 48px 13px 48px; font-size:14.5px; font-weight:700; background:#ffffff; outline:none; color:#0f172a; box-shadow:0 4px 16px rgba(2, 132, 199, 0.08); transition:all 0.2s ease;"
                        oninput="window._xldlOnGlobalSearchInput(this.value, 'xldlSearchInput3')"
                        onfocus="this.style.borderColor='#0284c7'; this.style.boxShadow='0 6px 20px rgba(2, 132, 199, 0.2)';"
                        onblur="this.style.borderColor='#bae6fd'; this.style.boxShadow='0 4px 16px rgba(2, 132, 199, 0.08)';">
                    <button id="xldlSearchInput3ClearBtn" onclick="window._xldlClearGlobalSearch()" style="position:absolute; right:16px; background:#e2e8f0; border:none; border-radius:50%; width:24px; height:24px; display:${(globalSearchQuery || currentSearchQuery3) ? 'flex' : 'none'}; align-items:center; justify-content:center; cursor:pointer; font-weight:bold; color:#475569;" title="Xóa tìm kiếm">✕</button>
                </div>
            </div>

            <!-- Sub-tabs Bar & Actions (Nền Nhạt Lấp Lánh - Glossy Shimmer Effects) -->
            <div style="
                display:flex; 
                justify-content:space-between; 
                align-items:center; 
                margin-bottom:22px; 
                flex-wrap:wrap; 
                gap:14px; 
                background: linear-gradient(135deg, rgba(239, 246, 255, 0.95) 0%, rgba(224, 242, 254, 0.98) 40%, rgba(243, 232, 255, 0.95) 100%); 
                backdrop-filter: blur(16px); 
                -webkit-backdrop-filter: blur(16px); 
                padding:14px 22px; 
                border-radius:20px; 
                border: 1.5px solid rgba(186, 230, 253, 0.9); 
                box-shadow: 0 12px 32px -8px rgba(2, 132, 199, 0.18), inset 0 2px 4px rgba(255, 255, 255, 0.95), inset 0 -2px 4px rgba(147, 197, 253, 0.25);
                position: relative;
                overflow: hidden;
            ">
                <!-- Ambient Sparkling Overlay -->
                <div style="position:absolute; top:-50%; left:-20%; width:140%; height:200%; background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.8) 0%, rgba(255,255,255,0) 60%); pointer-events:none; opacity:0.75;"></div>

                <div class="xldl-subtabs" style="margin:0; display:flex; gap:12px; flex-wrap:wrap; align-items:center; position:relative; z-index:2;">
                    ${subtabs.map(st => `
                        <button class="xldl-subtab-btn ${currentSubTab2 === st.id ? 'active' : ''}" onclick="window._xldlSwitchSubTab2('${st.id}')"
                            style="
                                display:inline-flex; align-items:center; gap:8px; font-size:14px; font-weight:850; padding:10px 22px; border-radius:30px; transition: all 0.25s ease; cursor:pointer;
                                ${currentSubTab2 === st.id 
                                    ? 'background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); color:#ffffff; border:none; box-shadow: 0 6px 18px rgba(37, 99, 235, 0.45);' 
                                    : 'background: rgba(255, 255, 255, 0.9); color:#0f172a; border:1.5px solid #cbd5e1;'}
                            ">
                            ${st.icon || '📌'} ${st.title}
                        </button>
                    `).join('')}
                </div>

                ${_xldlCanManage() ? `
                    <div style="display:flex; align-items:center; gap:12px; position:relative; z-index:2;">
                        <button class="xldl-btn primary" onclick="window._xldlOpenAddLinkModal('${currentSubTab2}')" 
                            style="border-radius:14px; padding:10px 20px; font-size:13.5px; font-weight:900; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color:#ffffff; border:none; box-shadow: 0 6px 18px rgba(2, 132, 199, 0.4);">
                            ➕ Tạo Đường Link Mới
                        </button>
                        <button class="xldl-btn secondary" onclick="window._xldlOpenManageSubtabModal('muc3_official')" 
                            style="border-radius:14px; padding:10px 20px; font-size:13.5px; font-weight:900; background: rgba(255, 255, 255, 0.95); color:#0284c7; border: 1.5px solid #7dd3fc; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.15);">
                            ⚙️ Cài Đặt Mục
                        </button>
                    </div>
                ` : ''}
            </div>

            <div id="xldlMuc2Content" class="xldl-tab-body"></div>
        `;
        _xldlRenderSubTab2();
    }

    window._xldlSwitchSubTab2 = function(subId) {
        currentSubTab2 = subId;
        activeCatFilter['muc3_official'] = 'all';
        localStorage.setItem('xldl_sub_tab2', subId);
        _xldlRenderCurrentMainTab();
    };

    function _xldlRenderSubTab2() {
        const body = document.getElementById('xldlMuc2Content');
        if (!body) return;

        _xldlRenderCustomSubtabView(body, currentSubTab2, 'muc3_official');
    }

    // Telesale Script View
    function _xldlRenderTelesaleView(container) {
        const query = (currentSearchQuery3 || '').trim().toLowerCase();
        const categories = _xldlGetCategories('muc3_official');
        const activeCat = activeCatFilter['muc3_official'] || 'all';

        const filteredSteps = TELESALE_SCRIPTS.filter(item => {
            const matchQ = !query || item.title.toLowerCase().includes(query) || item.script.toLowerCase().includes(query) || item.note.toLowerCase().includes(query);
            const matchC = activeCat === 'all' || activeCat === 'Kịch Bản Telesale' || item.title.toLowerCase().includes(activeCat.toLowerCase());
            return matchQ && matchC;
        });

        const filteredObjs = OBJECTION_HANDLERS.filter(obj => {
            const matchQ = !query || obj.title.toLowerCase().includes(query) || obj.answer.toLowerCase().includes(query);
            const matchC = activeCat === 'all' || activeCat === 'Xử Lý Từ Chối Giá' || obj.title.toLowerCase().includes(activeCat.toLowerCase());
            return matchQ && matchC;
        });

        const totalCount = TELESALE_SCRIPTS.length + OBJECTION_HANDLERS.length;

        container.innerHTML = `
            <!-- Category Filter Bar (Mục 3 Telesale - Render Lĩnh Vực Động từ LocalStorage) -->
            <div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; padding:14px 22px; border-radius:18px; border:1.5px solid #e2e8f0; margin-bottom:22px; box-shadow:0 4px 14px rgba(0,0,0,0.03); flex-wrap:wrap; gap:12px;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <span style="font-size:13.5px; font-weight:900; color:#334155; margin-right:4px;">📌 Lĩnh vực:</span>
                    <button class="dept-pill ${activeCat === 'all' ? 'active' : ''}" onclick="window._xldlSelectCatFilter('muc3_official', 'all')">
                        🌐 Tất Cả Lĩnh Vực (${totalCount})
                    </button>
                    ${categories.map(cat => {
                        let count = 0;
                        if (cat === 'Kịch Bản Telesale') count = TELESALE_SCRIPTS.length;
                        else if (cat === 'Xử Lý Từ Chối Giá') count = OBJECTION_HANDLERS.length;
                        else count = TELESALE_SCRIPTS.filter(s => s.title.toLowerCase().includes(cat.toLowerCase())).length + OBJECTION_HANDLERS.filter(o => o.title.toLowerCase().includes(cat.toLowerCase())).length;

                        return `
                            <button class="dept-pill ${activeCat === cat ? 'active' : ''}" onclick="window._xldlSelectCatFilter('muc3_official', '${cat.replace(/'/g, "\\'")}')">
                                📌 ${cat} (${count})
                            </button>
                        `;
                    }).join('')}
                </div>
                <button class="xldl-btn secondary" onclick="window._xldlOpenManageCatModal('muc3_official')" style="border-radius:12px; padding:9px 18px; font-size:13.5px; font-weight:800; border-color:#7dd3fc; color:#0284c7; background:#ffffff;">
                    ⚙️ Cài Đặt Lĩnh Vực
                </button>
            </div>

            <div class="xldl-telesale-layout">
                ${(activeCat === 'all' || activeCat === 'Kịch Bản Telesale' || filteredSteps.length > 0) ? `
                    <div class="ts-steps-section">
                        <div class="ts-steps-timeline">
                            ${filteredSteps.map((item, idx) => `
                                <div class="ts-step-card">
                                    <div class="ts-step-badge">${item.step}</div>
                                    <div class="ts-step-content">
                                        <h4>${item.title}</h4>
                                        <div class="ts-script-text">${item.script}</div>
                                        <div class="ts-script-note">💡 <strong>Mẹo Sale:</strong> ${item.note}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${(activeCat === 'all' || activeCat === 'Xử Lý Từ Chối Giá' || filteredObjs.length > 0) ? `
                    <div class="ts-objections-section">
                        <h3 class="ts-section-title">🛡️ Ứng Phó Tức Thì Tình Huống Từ Chối</h3>
                        <div class="ts-objection-grid">
                            ${filteredObjs.map(obj => `
                                <div class="ts-obj-card">
                                    <h4>${obj.title}</h4>
                                    <div class="ts-obj-ans">${obj.answer.replace(/\n/g, '<br>')}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Chat Scripts View with 1-Click Copy
    function _xldlRenderChatView(container) {
        const query = (currentSearchQuery3 || '').trim().toLowerCase();
        const categories = _xldlGetCategories('muc3_official');
        const activeCat = activeCatFilter['muc3_official'] || 'all';

        const filteredChats = CHAT_SCRIPTS.filter(script => {
            const matchesQuery = !query || script.title.toLowerCase().includes(query) || script.content.toLowerCase().includes(query) || script.cat.toLowerCase().includes(query);
            const matchesCat = activeCat === 'all' || script.cat.toLowerCase().includes(activeCat.toLowerCase()) || activeCat.toLowerCase().includes(script.cat.toLowerCase());
            return matchesQuery && matchesCat;
        });

        container.innerHTML = `
            <!-- Category Filter Bar (Mục 3 Chat - Render Lĩnh Vực Động từ LocalStorage) -->
            <div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; padding:14px 22px; border-radius:18px; border:1.5px solid #e2e8f0; margin-bottom:22px; box-shadow:0 4px 14px rgba(0,0,0,0.03); flex-wrap:wrap; gap:12px;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <span style="font-size:13.5px; font-weight:900; color:#334155; margin-right:4px;">📌 Lĩnh vực:</span>
                    <button class="dept-pill ${activeCat === 'all' ? 'active' : ''}" onclick="window._xldlSelectCatFilter('muc3_official', 'all')">
                        🌐 Tất Cả Lĩnh Vực (${CHAT_SCRIPTS.length})
                    </button>
                    ${categories.map(cat => {
                        const count = CHAT_SCRIPTS.filter(s => s.cat.toLowerCase().includes(cat.toLowerCase()) || cat.toLowerCase().includes(s.cat.toLowerCase())).length;
                        return `
                            <button class="dept-pill ${activeCat === cat ? 'active' : ''}" onclick="window._xldlSelectCatFilter('muc3_official', '${cat.replace(/'/g, "\\'")}')">
                                📌 ${cat} (${count})
                            </button>
                        `;
                    }).join('')}
                </div>
                ${_xldlCanManage() ? `
                    <button class="xldl-btn secondary" onclick="window._xldlOpenManageCatModal('muc3_official')" style="border-radius:12px; padding:9px 18px; font-size:13.5px; font-weight:800; border-color:#7dd3fc; color:#0284c7; background:#ffffff;">
                        ⚙️ Cài Đặt Lĩnh Vực
                    </button>
                ` : ''}
            </div>

            <div class="xldl-chat-layout">
                <div class="chat-intro-banner">
                    <div>
                        <h3>💬 Thư Viện Kịch Bản Nhắn Tin Zalo / Pancake</h3>
                        <p>Bấm nút <strong>📋 Sao chép kịch bản</strong> để dán trực tiếp vào phần mềm chat gửi cho khách hàng.</p>
                    </div>
                </div>

                <div class="chat-cards-list">
                    ${filteredChats.map((script, idx) => `
                        <div class="chat-script-card">
                            <div class="chat-card-head">
                                <span class="chat-cat-tag">${script.cat}</span>
                                <h4 class="chat-script-title">${script.title}</h4>
                            </div>
                            <div class="chat-card-body">
                                <pre class="chat-content-text" id="chatContent_${idx}">${script.content}</pre>
                            </div>
                            <div class="chat-card-footer">
                                <button class="xldl-btn primary" onclick="window._xldlCopyChatScript(${idx})">
                                    📋 Sao chép kịch bản (1-Click)
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    window._xldlCopyChatScript = function(idx) {
        const textEl = document.getElementById(`chatContent_${idx}`);
        if (!textEl) return;
        const text = textEl.innerText || textEl.textContent;

        navigator.clipboard.writeText(text).then(() => {
            _xldlShowToast('📋 Đã sao chép kịch bản nhắn tin vào khay nhớ tạm!');
        }).catch(() => {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            _xldlShowToast('📋 Đã sao chép kịch bản!');
        });
    };

    // ==========================================
    // MỤC 1 (HIỂN THỊ LÀ MỤC 1 TRÊN UI): TÌNH HUỐNG XỬ LÝ LỖI
    // ==========================================
    window._xldlOnSearchError = function(val) {
        window._xldlOnGlobalSearchInput(val, 'errorSearchInput');
    };

    window._xldlClearErrorSearch = function() {
        window._xldlClearGlobalSearch();
    };

    window._xldlSelectSubtab1Error = function(subId) {
        currentSubTab1Error = subId;
        localStorage.setItem('xldl_sub_tab1_error', subId);
        _xldlRenderCurrentMainTab();
    };

    function _xldlRenderMuc3(container) {
        const subtabs = _xldlGetSubtabs('muc1_error');
        if (!subtabs.some(s => s.id === currentSubTab1Error)) {
            currentSubTab1Error = subtabs[0] ? subtabs[0].id : 'all_error';
        }

        container.innerHTML = `
            <!-- Global Search Bar for Section 1 (Nằm Trên Thanh Sub-tabs) -->
            <div style="margin-bottom:20px; position:relative;">
                <div style="position:relative; display:flex; align-items:center;">
                    <span style="position:absolute; left:18px; font-size:18px; color:#0284c7; pointer-events:none; z-index:2;">🔍</span>
                    <input type="text" id="errorSearchInput" value="${globalSearchQuery || errorSearchQuery || ''}" 
                        placeholder="Nhập tên lỗi, từ khóa, tiêu đề, kịch bản hoặc mã sự cố cần tra cứu (Tìm toàn bộ 3 Mục)..." 
                        style="width:100%; border:2px solid #bae6fd; border-radius:18px; padding:13px 48px 13px 48px; font-size:14.5px; font-weight:700; background:#ffffff; outline:none; color:#0f172a; box-shadow:0 4px 16px rgba(2, 132, 199, 0.08); transition:all 0.2s ease;"
                        oninput="window._xldlOnGlobalSearchInput(this.value, 'errorSearchInput')"
                        onfocus="this.style.borderColor='#0284c7'; this.style.boxShadow='0 6px 20px rgba(2, 132, 199, 0.2)';"
                        onblur="this.style.borderColor='#bae6fd'; this.style.boxShadow='0 4px 16px rgba(2, 132, 199, 0.08)';">
                    <button id="errorSearchClearBtn" onclick="window._xldlClearGlobalSearch()" style="position:absolute; right:16px; background:#e2e8f0; border:none; border-radius:50%; width:24px; height:24px; display:${(globalSearchQuery || errorSearchQuery) ? 'flex' : 'none'}; align-items:center; justify-content:center; cursor:pointer; font-weight:bold; color:#475569;" title="Xóa tìm kiếm">✕</button>
                </div>
            </div>

            <div id="xldlMuc3ContentBody"></div>
        `;

        const body = document.getElementById('xldlMuc3ContentBody');
        if (!body) return;

        const activeSearchQuery = (globalSearchQuery || errorSearchQuery || '').trim().toLowerCase();
        if (activeSearchQuery !== '') {
            _xldlRenderGlobalSearchResults(body, activeSearchQuery);
        } else {
            _xldlRenderMuc3Body(body);
        }
    }

    function _xldlRenderMuc3Body(body) {
        if (!body) return;
        const subtabs = _xldlGetSubtabs('muc1_error');
        const scope = 'muc1_error';
        const categories = _xldlGetCategories(scope);
        const activeCat = activeCatFilter[scope] || 'all';

        // Gather custom links for Section 1
        let section1Links = [];
        subtabs.forEach(s => {
            const lks = _xldlGetCustomSubtabLinks(s.id);
            lks.forEach(l => section1Links.push({ ...l, subtabId: s.id, subtabTitle: s.title, subtabIcon: s.icon }));
        });

        const displayLinks = section1Links.filter(l => {
            const matchSub = (currentSubTab1Error === 'all_error' || currentSubTab1Error === subtabs[0]?.id) ? true : (l.subtabId === currentSubTab1Error);
            const lCats = _xldlGetLinkCategories(l);
            const matchCat = activeCat === 'all' || lCats.includes(activeCat);
            return matchSub && matchCat;
        });

        const pinnedLinks = displayLinks.filter(l => l.isPinned);
        const normalLinks = displayLinks.filter(l => !l.isPinned);

        body.innerHTML = `

            <!-- Sub-tabs Bar (Thanh Mục) & Actions -->
            <div style="
                display:flex; 
                justify-content:space-between; 
                align-items:center; 
                margin-bottom:22px; 
                flex-wrap:wrap; 
                gap:14px; 
                background: linear-gradient(135deg, rgba(239, 246, 255, 0.95) 0%, rgba(224, 242, 254, 0.98) 40%, rgba(243, 232, 255, 0.95) 100%); 
                backdrop-filter: blur(16px); 
                -webkit-backdrop-filter: blur(16px); 
                padding:14px 22px; 
                border-radius:20px; 
                border: 1.5px solid rgba(186, 230, 253, 0.9); 
                box-shadow: 0 12px 32px -8px rgba(2, 132, 199, 0.18), inset 0 2px 4px rgba(255, 255, 255, 0.95), inset 0 -2px 4px rgba(147, 197, 253, 0.25);
                position: relative;
                overflow: hidden;
            ">
                <!-- Ambient Sparkling Overlay -->
                <div style="position:absolute; top:-50%; left:-20%; width:140%; height:200%; background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.8) 0%, rgba(255,255,255,0) 60%); pointer-events:none; opacity:0.75;"></div>

                <!-- Dynamic Subtabs (Thanh Mục Đào Tạo thuộc Mục 1) -->
                <div class="xldl-subtabs" style="margin:0; display:flex; gap:10px; flex-wrap:wrap; align-items:center; position:relative; z-index:2;">
                    ${subtabs.map(sub => `
                        <button class="xldl-subtab-btn ${currentSubTab1Error === sub.id ? 'active' : ''}" 
                            onclick="window._xldlSelectSubtab1Error('${sub.id}')"
                            style="display:inline-flex; align-items:center; gap:8px; font-size:14px; font-weight:850; padding:10px 22px; border-radius:30px; transition: all 0.25s ease; cursor:pointer; ${currentSubTab1Error === sub.id ? 'background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); color:#ffffff; border:none; box-shadow: 0 6px 18px rgba(37, 99, 235, 0.45);' : 'background: rgba(255, 255, 255, 0.9); color:#0f172a; border:1.5px solid #cbd5e1;'}">
                            ${sub.icon || '📌'} ${sub.title}
                        </button>
                    `).join('')}
                </div>

                <!-- Action Buttons: Tạo Đường Link Mới & Cài Đặt MỤC -->
                ${_xldlCanManage() ? `
                    <div style="display:flex; align-items:center; gap:12px; position:relative; z-index:2;">
                        <button class="xldl-btn primary" onclick="window._xldlOpenAddLinkModal('${currentSubTab1Error}')" 
                            style="border-radius:14px; padding:10px 20px; font-size:13.5px; font-weight:900; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color:#ffffff; border:none; box-shadow: 0 6px 18px rgba(2, 132, 199, 0.4);">
                            ➕ Tạo Đường Link Mới
                        </button>
                        <button class="xldl-btn secondary" onclick="window._xldlOpenManageSubtabModal('muc1_error')" 
                            style="border-radius:14px; padding:10px 20px; font-size:13.5px; font-weight:900; background: rgba(255, 255, 255, 0.95); color:#0284c7; border: 1.5px solid #7dd3fc; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.15);">
                            ⚙️ Cài Đặt Mục
                        </button>
                    </div>
                ` : ''}
            </div>

            <!-- Category Filter Bar (Mục 1 - Thanh LĨNH VỰC render ĐỘNG từ Cài Đặt Lĩnh Vực) -->
            <div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; padding:14px 22px; border-radius:18px; border:1.5px solid #e2e8f0; margin-bottom:22px; box-shadow:0 4px 14px rgba(0,0,0,0.03); flex-wrap:wrap; gap:12px;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <span style="font-size:13.5px; font-weight:900; color:#334155; margin-right:4px;">📌 Lĩnh vực:</span>
                    <button class="dept-pill ${activeCat === 'all' ? 'active' : ''}" onclick="window._xldlSelectCatFilter('muc1_error', 'all')">
                        🌐 Tất Cả Lĩnh Vực (${displayLinks.length})
                    </button>
                    ${categories.map(cat => {
                        const count = displayLinks.filter(l => _xldlGetLinkCategories(l).includes(cat)).length;
                        return `
                            <button class="dept-pill ${activeCat === cat ? 'active' : ''}" onclick="window._xldlSelectCatFilter('muc1_error', '${cat.replace(/'/g, "\\'")}')">
                                📌 ${cat} (${count})
                            </button>
                        `;
                    }).join('')}
                </div>
                ${_xldlCanManage() ? `
                    <button class="xldl-btn secondary" onclick="window._xldlOpenManageCatModal('muc1_error')" style="border-radius:12px; padding:9px 18px; font-size:13.5px; font-weight:800; border-color:#7dd3fc; color:#0284c7; background:#ffffff;">
                        ⚙️ Cài Đặt Lĩnh Vực
                    </button>
                ` : ''}
            </div>

            <!-- Modern Card Grid for Section 1 -->
            ${displayLinks.length === 0 ? `
                <div class="xldl-empty-box" style="background:#ffffff; border:2px dashed #bae6fd; border-radius:20px; padding:40px 20px; text-align:center; margin-top:20px;">
                    <div style="font-size:36px; margin-bottom:10px;">📫</div>
                    <h4 style="margin:0 0 6px 0; font-size:16px; font-weight:850; color:#1e40af;">
                        Chưa có tài liệu/đường link nào thuộc Lĩnh Vực "${activeCat === 'all' ? 'Tất cả' : activeCat}"
                    </h4>
                    <p style="margin:0 0 16px 0; font-size:13px; font-weight:600; color:#64748b;">
                        Anh/Chị hãy nhấn nút bên dưới để tạo đường link tài liệu kịch bản mới cho mục này nhé.
                    </p>
                    ${_xldlCanManage() ? `
                        <button class="xldl-btn primary" onclick="window._xldlOpenAddLinkModal('${currentSubTab1Error}')" style="border-radius:14px; padding:10px 22px; font-size:13.5px; font-weight:900;">
                            ➕ Tạo Đường Link Đầu Tiên
                        </button>
                    ` : ''}
                </div>
            ` : `
                ${pinnedLinks.length > 0 ? `
                    <div style="margin-bottom:26px;">
                        <div style="font-size:13px; font-weight:900; color:#b45309; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
                            <span>📌⭐ MỤC QUAN TRỌNG (${pinnedLinks.length})</span>
                        </div>
                        <div class="xldl-link-grid">
                            ${pinnedLinks.map(link => _xldlRenderCardHTML(link, link.subtabId || currentSubTab1Error)).join('')}
                        </div>
                    </div>
                ` : ''}

                ${normalLinks.length > 0 ? `
                    <div>
                        ${pinnedLinks.length > 0 ? `
                            <div style="font-size:13px; font-weight:900; color:#334155; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
                                <span>📑 DANH SÁCH TÀI LIỆU BÌNH THƯỜNG (${normalLinks.length})</span>
                            </div>
                        ` : ''}
                        <div class="xldl-link-grid">
                            ${normalLinks.map(link => _xldlRenderCardHTML(link, link.subtabId || currentSubTab1Error)).join('')}
                        </div>
                    </div>
                ` : ''}
            `}
        `;
    }

    async function _xldlLoadErrorData() {
        try {
            isLoadingErrors = true;
            const res = await fetch('/api/common-errors-tpl');
            if (res.ok) {
                const data = await res.json();
                errorList = (data.items && data.items.length > 0) ? data.items : DEFAULT_ERROR_PLAYBOOK;
            } else {
                errorList = DEFAULT_ERROR_PLAYBOOK;
            }
        } catch (e) {
            console.warn('[XLDLH] API error, falling back to defaults:', e);
            errorList = DEFAULT_ERROR_PLAYBOOK;
        } finally {
            isLoadingErrors = false;
            _xldlRenderErrorList();
        }
    }

    window._xldlOnSearchError = function(val) {
        errorSearchQuery = val.toLowerCase().trim();
        _xldlRenderErrorList();

        setTimeout(() => {
            const inp = document.getElementById('errorSearchInput');
            if (inp) {
                inp.focus();
                inp.setSelectionRange(inp.value.length, inp.value.length);
            }
        }, 10);
    };

    window._xldlSelectDeptFilter = function(dept) {
        errorSelectedDept = dept;
        _xldlRenderCurrentMainTab();
    };

    function _xldlRenderErrorList() {
        const container = document.getElementById('errorCardsContainer');
        const filterContainer = document.getElementById('errorDeptFilters');
        if (!container) return;

        // Build unique list of departments
        let allDepts = new Set(['all']);
        errorList.forEach(item => {
            let depts = [];
            try {
                depts = typeof item.departments === 'string' ? JSON.parse(item.departments) : (item.departments || []);
            } catch(e) {
                depts = item.departments || [];
            }
            depts.forEach(d => allDepts.add(d));
        });

        if (filterContainer) {
            filterContainer.innerHTML = Array.from(allDepts).map(d => `
                <button class="dept-pill ${errorSelectedDept === d ? 'active' : ''}" onclick="window._xldlSelectDeptFilter('${d}')">
                    ${d === 'all' ? '🌐 Tất cả bộ phận' : d}
                </button>
            `).join('');
        }

        // Filter items
        const filtered = errorList.filter(item => {
            const nameMatch = (item.error_name || '').toLowerCase().includes(errorSearchQuery) || 
                              (item.fix_guide || '').toLowerCase().includes(errorSearchQuery) ||
                              (item.cause || '').toLowerCase().includes(errorSearchQuery);
            
            let depts = [];
            try {
                depts = typeof item.departments === 'string' ? JSON.parse(item.departments) : (item.departments || []);
            } catch(e) {
                depts = item.departments || [];
            }

            const deptMatch = errorSelectedDept === 'all' || depts.includes(errorSelectedDept);
            return nameMatch && deptMatch;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="error-empty-state">
                    <div class="empty-icon">🔍</div>
                    <h4>Không tìm thấy tình huống lỗi nào phù hợp</h4>
                    <p>Thử tìm kiếm với từ khóa khác hoặc chọn tất cả bộ phận.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(item => {
            let depts = [];
            try { depts = typeof item.departments === 'string' ? JSON.parse(item.departments) : (item.departments || []); } catch(e) {}
            let resps = [];
            try { resps = typeof item.responsibility === 'string' ? JSON.parse(item.responsibility) : (item.responsibility || []); } catch(e) {}

            return `
                <div class="error-playbook-card">
                    <div class="ep-card-header">
                        <div class="ep-title-group">
                            <span class="ep-cat-badge">${item.category_name || 'Sự Cố Doanh Nghiệp'}</span>
                            <h3 class="ep-error-title">🚨 ${item.error_name}</h3>
                        </div>
                        <div class="ep-dept-tags">
                            ${depts.map(d => `<span class="dept-tag">🏢 ${d}</span>`).join('')}
                        </div>
                    </div>

                    <div class="ep-card-body">
                        ${item.cause ? `
                            <div class="ep-section cause-box">
                                <strong>⚠️ Nguyên nhân cốt lõi:</strong> ${item.cause}
                            </div>
                        ` : ''}

                        <div class="ep-section fix-steps-box">
                            <h4 class="ep-section-title">📋 QUY TRÌNH XỬ LÝ TỪNG BƯỚC (STEP-BY-STEP)</h4>
                            <div class="ep-steps-text">${(item.fix_guide || 'Chưa cập nhật quy trình').replace(/\n/g, '<br>')}</div>
                        </div>

                        ${item.sale_guide ? `
                            <div class="ep-section sale-guide-box">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                    <h4 class="ep-section-title" style="margin:0;">🗣️ HƯỚNG DẪN ỨNG XỬ CHO SALE KHI NÓI CHUYỆN VỚI KHÁCH</h4>
                                    <button type="button" onclick="event.stopPropagation(); window._xldlCopyQuestionText(\`${_xldlCleanQuestionText(item.sale_guide).replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`)" style="background:#2563eb; color:#ffffff; border:none; padding:5px 12px; border-radius:8px; font-size:11.5px; font-weight:800; cursor:pointer;" title="Copy nội dung câu hỏi">
                                        📋 Copy Câu Hỏi
                                    </button>
                                </div>
                                <div class="ep-sale-text">${item.sale_guide.replace(/\n/g, '<br>')}</div>
                            </div>
                        ` : ''}

                        ${resps.length > 0 ? `
                            <div class="ep-section resp-box">
                                <strong>⚖️ TRÁCH NHIỆM & BẢO HÀNH:</strong>
                                <ul>
                                    ${resps.map(r => `<li>• ${r}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Helper Question Text Cleaner & Copy Handler
    window._xldlCleanQuestionText = function(str) {
        if (!str) return '';
        let cleaned = String(str).trim();
        cleaned = cleaned.replace(/^(?:🗣️\s*)?(?:Câu\s*Hỏi\s*\d+\s*:\s*)?/i, '').trim();
        cleaned = cleaned.replace(/^["'“«]+|["'”»]+$/g, '').trim();
        return cleaned;
    };

    window._xldlCopyQuestionText = function(text) {
        const cleanText = window._xldlCleanQuestionText(text);
        if (!cleanText) return;

        navigator.clipboard.writeText(cleanText).then(() => {
            _xldlShowToast('📋 Đã sao chép nội dung câu hỏi!');
        }).catch(() => {
            const textArea = document.createElement('textarea');
            textArea.value = cleanText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            _xldlShowToast('📋 Đã sao chép nội dung câu hỏi!');
        });
    };

    // Helper Toast Notification
    function _xldlShowToast(msg) {
        let toast = document.getElementById('xldlToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'xldlToast';
            toast.className = 'xldl-toast';
            document.body.appendChild(toast);
        }
        toast.innerText = msg;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    window._xldlShowToast = _xldlShowToast;

    // Embedded Premium CSS Styles (Bright Light Theme)
    function _xldlGetStyles() {
        return `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Comfortaa:wght@500;600;700&display=swap');

                .xldl-wrapper, .xldl-wrapper button, .xldl-wrapper input, .xldl-wrapper div, .xldl-wrapper span {
                    font-family: 'Nunito', 'Comfortaa', system-ui, -apple-system, sans-serif !important;
                }
                .xldl-wrapper {
                    padding: 24px;
                    background: #f8fafc;
                    min-height: calc(100vh - 70px);
                    color: #0f172a;
                }
                @keyframes xldlSparkle {
                    0% { background-position: 0% 50%, 0 0, 0 0; }
                    50% { background-position: 100% 50%, 100px 100px, -50px -50px; }
                    100% { background-position: 0% 50%, 0 0, 0 0; }
                }
                @keyframes xldlShimmerSweep {
                    0% { transform: translate(-30%, -30%) rotate(0deg); }
                    100% { transform: translate(30%, 30%) rotate(0deg); }
                }

                .xldl-header {
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
                    animation: xldlSparkle 8s ease infinite;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    padding: 34px 38px;
                    border-radius: 24px;
                    box-shadow: 0 12px 35px -5px rgba(37,99,235,0.35), 0 4px 15px rgba(0,0,0,0.1);
                    margin-bottom: 28px;
                    min-height: 120px;
                }

                .xldl-header::before {
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
                    animation: xldlShimmerSweep 4s infinite linear;
                    pointer-events: none;
                }

                .xldl-header-left {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    position: relative;
                    z-index: 2;
                }
                .xldl-icon-bg {
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
                .xldl-title {
                    font-size: 26px;
                    font-weight: 900;
                    color: #ffffff;
                    margin: 0 0 6px 0;
                    letter-spacing: -0.5px;
                    text-shadow: 0 2px 10px rgba(0,0,0,0.35);
                }
                .xldl-subtitle {
                    font-size: 15px;
                    color: rgba(255, 255, 255, 0.95);
                    font-weight: 600;
                    margin: 0;
                    text-shadow: 0 1px 4px rgba(0,0,0,0.25);
                }
                .xldl-badge-live {
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

                /* Main Tabs Level 1 */
                .xldl-tabs-main {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                    margin-bottom: 24px;
                }
                .xldl-tab-btn {
                    background: #ffffff;
                    border: 2px solid #cbd5e1;
                    border-radius: 16px;
                    padding: 20px 24px;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    cursor: pointer;
                    transition: all 0.25s ease;
                    color: #1d4ed8;
                    box-shadow: 0 4px 14px rgba(0,0,0,0.04);
                    -webkit-font-smoothing: antialiased;
                }
                .xldl-tab-btn:hover {
                    background: #f0f6ff;
                    border-color: #93c5fd;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 18px rgba(37,99,235,0.12);
                }
                .xldl-tab-btn.active {
                    background: linear-gradient(135deg, #2563eb, #1d4ed8);
                    border-color: #1d4ed8;
                    color: #ffffff;
                    box-shadow: 0 8px 24px rgba(37,99,235,0.35);
                }
                .xldl-tab-btn .tab-num {
                    font-size: 13.5px;
                    font-weight: 900;
                    color: #1d4ed8;
                    letter-spacing: 0.8px;
                    margin-bottom: 6px;
                    text-transform: uppercase;
                }
                .xldl-tab-btn.active .tab-num {
                    color: rgba(255, 255, 255, 0.95);
                }
                .xldl-tab-btn .tab-label {
                    font-size: 19px;
                    font-weight: 900;
                    color: #1d4ed8;
                    line-height: 1.35;
                    letter-spacing: -0.3px;
                }
                .xldl-tab-btn.active .tab-label {
                    color: #ffffff;
                }

                /* Sub Tabs Level 2 */
                .xldl-subtabs {
                    display: flex;
                    gap: 14px;
                    margin-bottom: 22px;
                    border-bottom: 2px solid #e2e8f0;
                    padding-bottom: 14px;
                }
                .xldl-subtab-btn {
                    background: #ffffff;
                    border: 1.5px solid #cbd5e1;
                    color: #1e40af;
                    padding: 12px 28px;
                    border-radius: 30px;
                    font-size: 16.5px;
                    font-weight: 900;
                    letter-spacing: -0.2px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.03);
                    -webkit-font-smoothing: antialiased;
                }
                .xldl-subtab-btn:hover {
                    color: #1d4ed8;
                    background: #eff6ff;
                    border-color: #93c5fd;
                }
                .xldl-subtab-btn.active {
                    background: linear-gradient(135deg, #2563eb, #1d4ed8);
                    color: #ffffff;
                    border-color: #2563eb;
                    font-weight: 900;
                    box-shadow: 0 4px 16px rgba(37,99,235,0.35);
                }

                /* Buttons */
                .xldl-btn {
                    padding: 11px 20px;
                    border-radius: 12px;
                    font-size: 14px;
                    font-weight: 800;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }
                .xldl-btn.primary {
                    background: linear-gradient(135deg, #2563eb, #1d4ed8);
                    color: #ffffff;
                    box-shadow: 0 4px 14px rgba(37,99,235,0.3);
                }
                .xldl-btn.primary:hover {
                    background: linear-gradient(135deg, #1d4ed8, #1e40af);
                    transform: translateY(-1px);
                }
                .xldl-btn.secondary {
                    background: #f1f5f9;
                    border: 1px solid #cbd5e1;
                    color: #334155;
                }
                .xldl-btn.secondary:hover {
                    background: #e2e8f0;
                    color: #0f172a;
                }
                .xldl-btn.success {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: #ffffff;
                    box-shadow: 0 4px 14px rgba(16,185,129,0.3);
                }

                /* Dynamic Link Card Themes */
                /* Dynamic Card Grid (2-3 Columns Layout) */
                .xldl-link-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                    gap: 22px;
                    margin-bottom: 24px;
                }
                .xldl-card-item {
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
                .xldl-card-item:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 18px 40px rgba(37, 99, 235, 0.12);
                    border-color: #93c5fd;
                }
                .card-accent-bar {
                    height: 5px;
                    width: 100%;
                }
                .card-accent-bar.theme-green { background: linear-gradient(90deg, #107c41, #22c55e); }
                .card-accent-bar.theme-blue { background: linear-gradient(90deg, #1e40af, #3b82f6); }
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
                .card-icon-box.theme-green { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
                .card-icon-box.theme-blue { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
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
                    text-transform: none;
                    opacity: 0.88;
                }
                .card-badge.theme-green { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
                .card-badge.theme-blue { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
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

                .card-footer-actions {
                    display: block;
                    width: 100%;
                    border-top: 1.5.px solid #f1f5f9;
                    padding-top: 14px;
                }
                .card-btn-open {
                    width: 100%;
                    padding: 12px 18px;
                    border-radius: 14px;
                    font-size: 14px;
                    font-weight: 900;
                    text-decoration: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    color: #ffffff;
                    box-shadow: 0 4px 14px rgba(0,0,0,0.12);
                    transition: all 0.22s ease;
                }
                .card-btn-open.theme-green { background: linear-gradient(135deg, #107c41, #16a34a); }
                .card-btn-open.theme-blue { background: linear-gradient(135deg, #1d4ed8, #2563eb); }
                .card-btn-open.theme-purple { background: linear-gradient(135deg, #7e22ce, #9333ea); }
                .card-btn-open.theme-amber { background: linear-gradient(135deg, #b45309, #d97706); }
                .card-btn-open.theme-rose { background: linear-gradient(135deg, #be123c, #e11d48); }

                .card-btn-open:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 22px rgba(0,0,0,0.2);
                    color: #ffffff;
                }
                .card-btn-preview {
                    padding: 10px 14px;
                    border-radius: 12px;
                    font-size: 13px;
                    font-weight: 900;
                    background: #f1f5f9;
                    border: 1.5px solid #cbd5e1;
                    color: #334155;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    transition: all 0.2s ease;
                }
                .card-btn-preview:hover {
                    background: #e2e8f0;
                    color: #0f172a;
                    border-color: #94a3b8;
                }

                .card-embed-box {
                    background: #f8fafc;
                    border-top: 2px solid #cbd5e1;
                    padding: 16px;
                    grid-column: 1 / -1;
                }
                .embed-box-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 12px;
                    font-size: 13.5px;
                    color: #1e293b;
                }
                .embed-close-btn {
                    background: #fee2e2;
                    color: #991b1b;
                    border: 1px solid #fca5a5;
                    padding: 4px 12px;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 800;
                    cursor: pointer;
                }
                .embed-close-btn:hover { background: #fecaca; }

                .dot-live {
                    display: inline-block;
                    width: 7px;
                    height: 7px;
                    background: #22c55e;
                    border-radius: 50%;
                    margin-right: 5px;
                    box-shadow: 0 0 6px #22c55e;
                    vertical-align: middle;
                    animation: pulseDot 1.8s infinite;
                }
                @keyframes pulseDot {
                    0% { transform: scale(0.95); opacity: 0.8; }
                    50% { transform: scale(1.3); opacity: 1; }
                    100% { transform: scale(0.95); opacity: 0.8; }
                }
                .gsheet-action-icon-btn {
                    background: rgba(255, 255, 255, 0.2);
                    border: 1.5px solid rgba(255, 255, 255, 0.4);
                    color: #ffffff;
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 15px;
                    cursor: pointer;
                    backdrop-filter: blur(4px);
                    transition: all 0.2s ease;
                }
                .gsheet-action-icon-btn.edit-btn {
                    background: rgba(245, 158, 11, 0.25);
                    border-color: rgba(253, 230, 138, 0.6);
                }
                .gsheet-action-icon-btn.edit-btn:hover {
                    background: rgba(245, 158, 11, 0.5);
                    transform: scale(1.1);
                    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
                }
                .gsheet-action-icon-btn.delete-btn {
                    background: rgba(239, 68, 68, 0.25);
                    border-color: rgba(254, 202, 202, 0.6);
                }
                .gsheet-action-icon-btn.delete-btn:hover {
                    background: rgba(239, 68, 68, 0.5);
                    transform: scale(1.1);
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
                }

                /* Modal Styling */
                .xldl-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(15, 23, 42, 0.65);
                    backdrop-filter: blur(8px);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    animation: fadeIn 0.2s ease-out;
                }
                .xldl-modal-card {
                    background: #ffffff;
                    border-radius: 24px;
                    width: 100%;
                    max-width: 580px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                    animation: popIn 0.25s ease-out;
                }
                @keyframes popIn {
                    0% { transform: scale(0.92); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .xldl-modal-header {
                    padding: 20px 26px;
                    background: linear-gradient(135deg, #1e3a8a, #2563eb);
                    color: #ffffff;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .xldl-modal-header h3 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 900;
                }
                .xldl-modal-close {
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: #ffffff;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .xldl-modal-close:hover {
                    background: rgba(255,255,255,0.35);
                }
                .xldl-modal-body {
                    padding: 24px 26px;
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                }
                .xldl-form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .xldl-form-group label {
                    font-size: 13.5px;
                    font-weight: 800;
                    color: #1e293b;
                }
                  .xldl-card-item.is-pinned-card {
                    border: 2px solid #f59e0b !important;
                    box-shadow: 0 8px 24px rgba(245, 158, 11, 0.18) !important;
                    background: linear-gradient(180deg, #fffdf5 0%, #ffffff 100%) !important;
                }

                .card-action-btn.pin {
                    color: #d97706;
                }
                .card-action-btn.pin:hover {
                    background: #fef3c7;
                    color: #b45309;
                }          .xldl-form-group input, .xldl-form-group select {
                    padding: 12px 16px;
                    border-radius: 12px;
                    border: 1.5px solid #cbd5e1;
                    font-size: 14px;
                    font-weight: 600;
                    outline: none;
                    transition: border-color 0.2s;
                    font-family: inherit;
                }
                .xldl-form-group input:focus, .xldl-form-group select:focus {
                    border-color: #2563eb;
                    box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
                }
                .xldl-form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }
                .xldl-modal-footer {
                    padding: 16px 26px 24px 26px;
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    background: #f8fafc;
                    border-top: 1px solid #f1f5f9;
                }
                    font-weight: 900;
                    color: #ffffff;
                    margin: 0 0 4px 0;
                    letter-spacing: -0.3px;
                }
                .gsheet-sub-text {
                    font-size: 13.5px;
                    color: rgba(255, 255, 255, 0.9);
                    margin: 0;
                    font-weight: 600;
                }
                .gsheet-btn-group {
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                }
                .gsheet-link-btn {
                    background: #ffffff;
                    color: #0d7a3e;
                    padding: 12px 22px;
                    border-radius: 14px;
                    font-size: 14.5px;
                    font-weight: 900;
                    text-decoration: none;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 4px 14px rgba(0,0,0,0.15);
                    transition: all 0.2s ease;
                }
                .gsheet-link-btn:hover {
                    background: #f0fdf4;
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(0,0,0,0.2);
                    color: #053b1e;
                }
                .gsheet-toggle-btn {
                    background: rgba(255, 255, 255, 0.2);
                    border: 1.5px solid rgba(255, 255, 255, 0.45);
                    color: #ffffff;
                    padding: 12px 20px;
                    border-radius: 14px;
                    font-size: 14px;
                    font-weight: 900;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    backdrop-filter: blur(6px);
                    transition: all 0.2s ease;
                }
                .gsheet-toggle-btn:hover {
                    background: rgba(255, 255, 255, 0.35);
                    border-color: #ffffff;
                }

                /* Image 2 Specs Content Panel */
                .xldl-sheets-specs-container {
                    background: #ffffff;
                    border: 2px solid #e2e8f0;
                    border-radius: 20px;
                    padding: 24px;
                    margin-bottom: 28px;
                    box-shadow: 0 6px 20px rgba(0,0,0,0.03);
                }
                .specs-header-bar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 2px solid #f1f5f9;
                    padding-bottom: 16px;
                    margin-bottom: 20px;
                }
                .specs-header-title {
                    font-size: 17px;
                    font-weight: 900;
                    color: #0f172a;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .specs-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
                    gap: 16px;
                }
                .specs-card {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 18px;
                    transition: all 0.2s ease;
                }
                .specs-card:hover {
                    border-color: #93c5fd;
                    background: #f0f6ff;
                }
                .specs-card-head {
                    font-size: 15px;
                    font-weight: 900;
                    color: #1e40af;
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .specs-card-body {
                    font-size: 13.5px;
                    color: #334155;
                    line-height: 1.6;
                    font-weight: 600;
                }
                .shortcut-key {
                    background: #ffffff;
                    border: 1px solid #cbd5e1;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    padding: 2px 8px;
                    border-radius: 6px;
                    font-family: monospace;
                    font-size: 12.5px;
                    font-weight: 800;
                    color: #2563eb;
                }

                /* Quiz Styles */
                .xldl-quiz-box {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 30px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                }
                .quiz-progress-bar {
                    height: 10px;
                    background: #e2e8f0;
                    border-radius: 10px;
                    overflow: hidden;
                    margin-bottom: 20px;
                }
                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #2563eb, #10b981);
                    transition: width 0.3s ease;
                }
                .quiz-header-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }
                .quiz-cat-tag {
                    background: #eff6ff;
                    color: #1d4ed8;
                    border: 1px solid #bfdbfe;
                    padding: 5px 14px;
                    border-radius: 8px;
                    font-size: 12.5px;
                    font-weight: 800;
                }
                .quiz-counter {
                    font-size: 13.5px;
                    color: #475569;
                    font-weight: 700;
                }
                .quiz-question-title {
                    font-size: 19px;
                    font-weight: 800;
                    color: #0f172a;
                    line-height: 1.5;
                    margin-bottom: 24px;
                }
                .quiz-options-list {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                    margin-bottom: 28px;
                }
                .quiz-option-card {
                    background: #f8fafc;
                    border: 2px solid #e2e8f0;
                    border-radius: 14px;
                    padding: 16px 20px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .quiz-option-card:hover {
                    border-color: #94a3b8;
                    background: #ffffff;
                }
                .quiz-option-card.selected {
                    border-color: #2563eb;
                    background: #eff6ff;
                    box-shadow: 0 4px 12px rgba(37,99,235,0.12);
                }
                .opt-key {
                    width: 34px;
                    height: 34px;
                    border-radius: 10px;
                    background: #cbd5e1;
                    color: #0f172a;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 900;
                    font-size: 15px;
                }
                .quiz-option-card.selected .opt-key {
                    background: #2563eb;
                    color: #ffffff;
                }
                .opt-text {
                    font-size: 15px;
                    color: #1e293b;
                    font-weight: 600;
                    line-height: 1.4;
                }
                .quiz-actions {
                    display: flex;
                    justify-content: space-between;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 20px;
                }

                /* Result Card */
                .xldl-quiz-result-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 32px;
                    text-align: center;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                }
                .result-badge {
                    display: inline-block;
                    padding: 6px 18px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 900;
                    margin-bottom: 12px;
                }
                .result-badge.pass { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
                .result-badge.fail { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
                .score-display {
                    font-size: 44px;
                    font-weight: 900;
                    color: #1d4ed8;
                    margin-bottom: 12px;
                }
                .score-desc {
                    font-size: 15px;
                    color: #334155;
                    font-weight: 600;
                }
                .quiz-review-list {
                    text-align: left;
                    margin: 24px 0;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .review-item {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 14px;
                    padding: 18px 20px;
                }
                .review-item.correct { border-left: 5px solid #10b981; }
                .review-item.wrong { border-left: 5px solid #ef4444; }
                .review-head {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    font-size: 13.5px;
                    font-weight: 800;
                    color: #0f172a;
                }
                .q-text {
                    color: #1e293b;
                    font-weight: 600;
                    margin-bottom: 10px;
                }
                .q-ans-box {
                    font-size: 13.5px;
                    color: #334155;
                    line-height: 1.5;
                }
                .q-explain {
                    background: #eff6ff;
                    border: 1px solid #bfdbfe;
                    padding: 12px 16px;
                    border-radius: 10px;
                    margin-top: 12px;
                    font-size: 13.5px;
                    color: #1e40af;
                    font-weight: 600;
                }

                /* Flashcard Styles */
                .xldl-flashcards-box {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .fc-filter-bar {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 24px;
                }
                .filter-label {
                    font-size: 14px;
                    font-weight: 800;
                    color: #0f172a;
                }
                .fc-pill {
                    background: #ffffff;
                    border: 1px solid #cbd5e1;
                    color: #1e40af;
                    padding: 8px 22px;
                    border-radius: 30px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.02);
                }
                .fc-pill:hover {
                    color: #1d4ed8;
                    background: #eff6ff;
                    border-color: #93c5fd;
                }
                .fc-pill.active {
                    background: linear-gradient(135deg, #2563eb, #1d4ed8);
                    color: #ffffff;
                    border-color: #2563eb;
                    font-weight: 700;
                    box-shadow: 0 4px 12px rgba(37,99,235,0.25);
                }
                .fc-main-card {
                    width: 100%;
                    max-width: 680px;
                    height: 380px;
                    perspective: 1000px;
                    cursor: pointer;
                    margin-bottom: 24px;
                }
                .fc-card-inner {
                    width: 100%;
                    height: 100%;
                    position: relative;
                    transform-style: preserve-3d;
                    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .fc-main-card.flipped .fc-card-inner {
                    transform: rotateY(180deg);
                }
                .fc-front, .fc-back {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    backface-visibility: hidden;
                    border-radius: 20px;
                    padding: 32px;
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                }
                .fc-front {
                    background: linear-gradient(135deg, #ffffff, #f8fafc);
                    border: 2px solid #2563eb;
                    box-shadow: 0 15px 35px rgba(37,99,235,0.12);
                }
                .fc-back {
                    background: linear-gradient(135deg, #f0fdf4, #dcfce7);
                    border: 2px solid #10b981;
                    transform: rotateY(180deg);
                    box-shadow: 0 15px 35px rgba(16,185,129,0.15);
                }
                .fc-badge {
                    align-self: flex-start;
                    background: #eff6ff;
                    color: #1d4ed8;
                    border: 1px solid #bfdbfe;
                    padding: 5px 14px;
                    border-radius: 12px;
                    font-size: 12.5px;
                    font-weight: 800;
                    margin-bottom: 16px;
                }
                .fc-badge.back { background: #dcfce7; color: #15803d; border-color: #86efac; }
                .fc-title {
                    font-size: 24px;
                    font-weight: 900;
                    color: #0f172a;
                    margin: 0 0 16px 0;
                }
                .fc-back-title {
                    font-size: 20px;
                    font-weight: 900;
                    color: #065f46;
                    margin: 0 0 14px 0;
                }
                .fc-question {
                    font-size: 18px;
                    color: #1e293b;
                    font-weight: 700;
                    line-height: 1.5;
                    flex: 1;
                }
                .fc-answer-text {
                    font-size: 15px;
                    color: #064e3b;
                    font-weight: 600;
                    line-height: 1.6;
                    flex: 1;
                    overflow-y: auto;
                }
                .fc-hint {
                    font-size: 13px;
                    color: #64748b;
                    font-weight: 600;
                    text-align: center;
                }
                .fc-counter {
                    font-size: 14px;
                    font-weight: 800;
                    color: #0f172a;
                }
                .fc-controls {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }

                /* Telesale & Chat Layouts */
                .ts-section-title {
                    font-size: 17px;
                    font-weight: 800;
                    color: #0f172a;
                    margin: 0 0 18px 0;
                }
                .ts-steps-timeline {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    margin-bottom: 32px;
                }
                .ts-step-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 22px;
                    display: flex;
                    gap: 20px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.03);
                }
                .ts-step-badge {
                    background: linear-gradient(135deg, #2563eb, #1d4ed8);
                    color: #ffffff;
                    font-weight: 900;
                    font-size: 13px;
                    padding: 8px 14px;
                    border-radius: 10px;
                    height: fit-content;
                    white-space: nowrap;
                    box-shadow: 0 4px 12px rgba(37,99,235,0.25);
                }
                .ts-step-content { flex: 1; }
                .ts-step-content h4 {
                    font-size: 17px;
                    margin: 0 0 10px 0;
                    color: #1d4ed8;
                    font-weight: 800;
                }
                .ts-script-text {
                    background: #f8fafc;
                    border: 1px solid #cbd5e1;
                    border-left: 4px solid #2563eb;
                    padding: 16px;
                    border-radius: 10px;
                    font-size: 14.5px;
                    color: #0f172a;
                    font-weight: 600;
                    line-height: 1.5;
                    margin-bottom: 10px;
                }
                .ts-script-note {
                    font-size: 13.5px;
                    color: #475569;
                    font-weight: 600;
                }

                .ts-objection-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 16px;
                }
                .ts-obj-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 22px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.03);
                }
                .ts-obj-card h4 {
                    font-size: 16px;
                    color: #b45309;
                    font-weight: 800;
                    margin: 0 0 12px 0;
                }
                .ts-obj-ans {
                    font-size: 14px;
                    color: #1e293b;
                    font-weight: 600;
                    line-height: 1.65;
                }

                /* Chat Copy Cards */
                .chat-intro-banner {
                    background: #eff6ff;
                    border: 1px solid #bfdbfe;
                    border-radius: 14px;
                    padding: 16px 20px;
                    margin-bottom: 20px;
                    color: #1e40af;
                }
                .chat-intro-banner h3 { margin: 0 0 4px 0; font-size: 16px; font-weight: 800; }
                .chat-intro-banner p { margin: 0; font-size: 13.5px; font-weight: 600; }
                .chat-cards-list {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .chat-script-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 22px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.03);
                }
                .chat-card-head {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 14px;
                }
                .chat-cat-tag {
                    background: #ecfdf5;
                    color: #059669;
                    border: 1px solid #a7f3d0;
                    padding: 4px 12px;
                    border-radius: 8px;
                    font-size: 12.5px;
                    font-weight: 800;
                }
                .chat-script-title {
                    font-size: 16.5px;
                    color: #0f172a;
                    font-weight: 800;
                    margin: 0;
                }
                .chat-content-text {
                    background: #f8fafc;
                    border: 1px solid #cbd5e1;
                    border-radius: 12px;
                    padding: 18px;
                    font-family: 'Consolas', 'Courier New', monospace;
                    font-size: 14px;
                    color: #0f172a;
                    font-weight: 600;
                    white-space: pre-wrap;
                    line-height: 1.6;
                    margin-bottom: 16px;
                }

                /* Error Playbook Section */
                .error-filter-header {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    margin-bottom: 24px;
                }
                .error-search-wrap {
                    position: relative;
                    width: 100%;
                }
                .search-icon {
                    position: absolute;
                    left: 16px;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 18px;
                }
                .error-search-input {
                    width: 100%;
                    padding: 14px 16px 14px 48px;
                    background: #ffffff;
                    border: 2px solid #cbd5e1;
                    border-radius: 14px;
                    color: #0f172a;
                    font-size: 15px;
                    font-weight: 600;
                    box-sizing: border-box;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.03);
                }
                .error-search-input:focus {
                    outline: none;
                    border-color: #2563eb;
                    box-shadow: 0 0 0 4px rgba(37,99,235,0.15);
                }
                .error-dept-filters {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                .dept-pill {
                    background: #ffffff;
                    border: 1px solid #cbd5e1;
                    color: #1e40af;
                    padding: 8px 22px;
                    border-radius: 30px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.02);
                }
                .dept-pill:hover {
                    color: #1d4ed8;
                    background: #eff6ff;
                    border-color: #93c5fd;
                }
                .dept-pill.active {
                    background: linear-gradient(135deg, #2563eb, #1d4ed8);
                    color: #ffffff;
                    border-color: #2563eb;
                    font-weight: 700;
                    box-shadow: 0 4px 12px rgba(37,99,235,0.25);
                }

                .error-cards-container {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .error-playbook-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 24px;
                    box-shadow: 0 6px 20px rgba(0,0,0,0.04);
                }
                .ep-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 20px;
                    border-bottom: 1px solid #e2e8f0;
                    padding-bottom: 16px;
                }
                .ep-cat-badge {
                    background: #fef2f2;
                    color: #dc2626;
                    border: 1px solid #fecaca;
                    padding: 4px 12px;
                    border-radius: 8px;
                    font-size: 12.5px;
                    font-weight: 800;
                    margin-bottom: 6px;
                    display: inline-block;
                }
                .ep-error-title {
                    font-size: 19px;
                    font-weight: 900;
                    color: #0f172a;
                    margin: 0;
                }
                .dept-tag {
                    background: #f1f5f9;
                    color: #334155;
                    border: 1px solid #cbd5e1;
                    padding: 4px 12px;
                    border-radius: 8px;
                    font-size: 12.5px;
                    font-weight: 700;
                    margin-left: 6px;
                }

                .ep-card-body {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .ep-section {
                    border-radius: 12px;
                    padding: 18px;
                    font-size: 14px;
                    line-height: 1.6;
                    font-weight: 500;
                }
                .cause-box { 
                    background: #fffbeb; 
                    border-left: 5px solid #f59e0b; 
                    color: #92400e; 
                    border-top: 1px solid #fef3c7;
                    border-right: 1px solid #fef3c7;
                    border-bottom: 1px solid #fef3c7;
                }
                .fix-steps-box { 
                    background: #f0fdf4; 
                    border-left: 5px solid #10b981; 
                    color: #065f46; 
                    border-top: 1px solid #dcfce7;
                    border-right: 1px solid #dcfce7;
                    border-bottom: 1px solid #dcfce7;
                }
                .sale-guide-box { 
                    background: #eff6ff; 
                    border-left: 5px solid #2563eb; 
                    color: #1e40af; 
                    border-top: 1px solid #dbeafe;
                    border-right: 1px solid #dbeafe;
                    border-bottom: 1px solid #dbeafe;
                }
                .resp-box { 
                    background: #faf5ff; 
                    border-left: 5px solid #a855f7; 
                    color: #6b21a8; 
                    border-top: 1px solid #f3e8ff;
                    border-right: 1px solid #f3e8ff;
                    border-bottom: 1px solid #f3e8ff;
                }
                .ep-section-title {
                    font-size: 13.5px;
                    font-weight: 900;
                    margin: 0 0 10px 0;
                    letter-spacing: 0.5px;
                }

                .xldl-toast {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    background: #10b981;
                    color: #ffffff;
                    padding: 14px 24px;
                    border-radius: 12px;
                    font-weight: 800;
                    font-size: 14px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.18);
                    z-index: 99999;
                    opacity: 0;
                    transform: translateY(20px);
                    transition: all 0.3s ease;
                    pointer-events: none;
                }
                .xldl-toast.show {
                    opacity: 1;
                    transform: translateY(0);
                }

                @media (max-width: 768px) {
                    .xldl-tabs-main { grid-template-columns: 1fr; }
                    .ts-objection-grid { grid-template-columns: 1fr; }
                }
            </style>
        `;
    }

})();
