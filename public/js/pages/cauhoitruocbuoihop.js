(function () {
    let _allQuestions = [];
    let _editingQuestionId = null;
    let _currentUser = null;
    let _hasManuallySetUserFilter = false;

    async function initCauHoiTruocBuoiHop(container) {
        if (!container) return;

        // Fetch current user if not available
        _currentUser = window.currentUser || window._currentUser || null;
        if (!_currentUser) {
            try {
                const meRes = await fetch('/api/auth/me', { credentials: 'include' });
                const meData = await meRes.json();
                if (meData && meData.user) {
                    _currentUser = meData.user;
                }
            } catch (e) {}
        }

        const user = _currentUser || {};
        const canManage = user.role === 'giam_doc' || user.role === 'quan_ly_cap_cao' || user.username === 'trinh';

        container.innerHTML = `
            <div style="padding:20px;max-width:1200px;margin:0 auto;font-family:inherit;">
                <!-- Header Banner -->
                <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:16px;padding:24px 28px;color:white;box-shadow:0 10px 25px rgba(79,70,229,0.3);margin-bottom:24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
                    <div>
                        <div style="display:flex;align-items:center;gap:10px;">
                            <span style="font-size:32px;">❓</span>
                            <div>
                                <h1 style="margin:0;font-size:22px;font-weight:900;letter-spacing:0.5px;">CÂU HỎI TRƯỚC BUỔI HỌP</h1>
                                <p style="margin:4px 0 0 0;font-size:13px;opacity:0.9;">Ghi nhận và theo dõi các vấn đề/câu hỏi cần thảo luận trước buổi họp công ty</p>
                            </div>
                        </div>
                    </div>
                    ${canManage ? `
                        <button id="chAddBtn" style="background:#ffffff;color:#4f46e5;border:none;padding:7px 18px;border-radius:20px;font-weight:800;font-size:13px;font-family:inherit;letter-spacing:-0.1px;line-height:1.2;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(0,0,0,0.12);transition:all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                            <span style="font-size:14px;font-weight:800;">➕</span> Thêm Câu Hỏi Mới
                        </button>
                    ` : ''}
                </div>

                <!-- Filter & Control Bar -->
                <div style="background:white;border-radius:14px;padding:16px 20px;box-shadow:0 4px 15px rgba(0,0,0,0.05);margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;">
                    <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:260px;">
                        <div style="position:relative;flex:1;">
                            <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:16px;color:#94a3b8;">🔍</span>
                            <input type="text" id="chSearchInput" placeholder="Tìm kiếm nội dung câu hỏi, người tạo..." style="width:100%;padding:10px 14px 10px 40px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:14px;outline:none;transition:border-color 0.2s;box-sizing:border-box;" onfocus="this.style.borderColor='#4f46e5'" onblur="this.style.borderColor='#cbd5e1'">
                        </div>
                    </div>

                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                        <label style="font-size:13px;font-weight:700;color:#475569;">Trạng thái:</label>
                        <select id="chStatusFilter" style="padding:9px 14px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:13px;font-weight:600;color:#1e293b;outline:none;cursor:pointer;background:white;">
                            <option value="all">Tất cả trạng thái</option>
                            <option value="pending" selected>🟠 Chưa trao đổi</option>
                            <option value="completed">🟢 Đã trao đổi</option>
                        </select>

                        <label style="font-size:13px;font-weight:700;color:#475569;margin-left:6px;">Tài khoản:</label>
                        <select id="chUserFilter" style="padding:9px 14px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:13px;font-weight:700;color:#4f46e5;outline:none;cursor:pointer;background:#f5f3ff;">
                            <option value="all">🌐 Tất cả tài khoản</option>
                        </select>

                        <label style="font-size:13px;font-weight:700;color:#475569;margin-left:6px;">Thời gian:</label>
                        <select id="chMonthFilter" style="padding:9px 12px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:13px;font-weight:600;color:#1e293b;outline:none;cursor:pointer;background:white;">
                            <option value="all">📅 Tất cả tháng</option>
                            <option value="1">Tháng 1</option>
                            <option value="2">Tháng 2</option>
                            <option value="3">Tháng 3</option>
                            <option value="4">Tháng 4</option>
                            <option value="5">Tháng 5</option>
                            <option value="6">Tháng 6</option>
                            <option value="7">Tháng 7</option>
                            <option value="8">Tháng 8</option>
                            <option value="9">Tháng 9</option>
                            <option value="10">Tháng 10</option>
                            <option value="11">Tháng 11</option>
                            <option value="12">Tháng 12</option>
                        </select>
                        <select id="chYearFilter" style="padding:9px 12px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:13px;font-weight:600;color:#1e293b;outline:none;cursor:pointer;background:white;">
                            <option value="all">📆 Tất cả năm</option>
                            <option value="2026" selected>Năm 2026</option>
                            <option value="2025">Năm 2025</option>
                            <option value="2024">Năm 2024</option>
                        </select>
                    </div>
                </div>

                <!-- Questions List Container -->
                <div id="chListContainer" style="display:flex;flex-direction:column;gap:12px;">
                    <div style="text-align:center;padding:40px;color:#64748b;">⏳ Đang tải danh sách câu hỏi...</div>
                </div>
            </div>

            <!-- Modal Add / Edit Question -->
            <div id="chModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;backdrop-filter:blur(4px);justify-content:center;align-items:center;">
                <div style="background:white;width:90%;max-width:550px;border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,0.25);overflow:hidden;animation:modalFadeIn 0.2s ease-out;">
                    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:16px 20px;color:white;display:flex;justify-content:space-between;align-items:center;">
                        <h3 id="chModalTitle" style="margin:0;font-size:17px;font-weight:800;">TẠO CÂU HỎI TRƯỚC BUỔI HỌP</h3>
                        <button id="chModalCloseBtn" style="background:rgba(255,255,255,0.2);border:none;color:white;width:30px;height:30px;border-radius:50%;font-size:16px;cursor:pointer;">✕</button>
                    </div>
                    <form id="chForm" style="padding:20px;display:flex;flex-direction:column;gap:16px;">
                        <div>
                            <label style="display:block;font-size:13px;font-weight:700;color:#334155;margin-bottom:6px;">Nội dung câu hỏi <span style="color:#ef4444;">*</span></label>
                            <textarea id="chTitleInput" rows="3" placeholder="Nhập câu hỏi hoặc vấn đề cần thảo luận..." autocapitalize="sentences" style="width:100%;padding:10px 14px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:14px;outline:none;box-sizing:border-box;" required></textarea>
                        </div>
                        <div>
                            <label style="display:block;font-size:13px;font-weight:700;color:#334155;margin-bottom:6px;">Mức độ ưu tiên</label>
                            <select id="chImportantInput" style="width:100%;padding:10px 14px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:14px;outline:none;box-sizing:border-box;background:white;">
                                <option value="false" selected>🔹 Thường</option>
                                <option value="true">🔥 Quan trọng (Ưu tiên đầu)</option>
                            </select>
                        </div>

                        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px;">
                            <button type="button" id="chModalCancelBtn" style="padding:9px 18px;background:#f1f5f9;color:#475569;border:none;border-radius:8px;font-weight:700;cursor:pointer;">Hủy</button>
                            <button type="submit" style="padding:9px 22px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(79,70,229,0.3);">Lưu lại</button>
                        </div>
                    </form>
                </div>
            </div>
            <style>
                .ch-badge-important {
                    display: inline-flex; align-items: center; justify-content: center;
                    background: #fef2f2; border: 1.5px solid #fca5a5;
                    width: 26px; height: 26px; border-radius: 50%; font-size: 14px;
                    flex-shrink: 0; cursor: default;
                }
            </style>
        `;

        // Event listeners
        const addBtn = document.getElementById('chAddBtn');
        if (addBtn) addBtn.onclick = () => openModal();

        const closeBtn = document.getElementById('chModalCloseBtn');
        if (closeBtn) closeBtn.onclick = closeModal;

        const cancelBtn = document.getElementById('chModalCancelBtn');
        if (cancelBtn) cancelBtn.onclick = closeModal;

        const searchInput = document.getElementById('chSearchInput');
        if (searchInput) searchInput.oninput = filterAndRender;

        const statusFilter = document.getElementById('chStatusFilter');
        if (statusFilter) statusFilter.onchange = filterAndRender;

        const userFilter = document.getElementById('chUserFilter');
        if (userFilter) {
            userFilter.onchange = () => {
                _hasManuallySetUserFilter = true;
                filterAndRender();
            };
        }

        const monthFilter = document.getElementById('chMonthFilter');
        if (monthFilter) monthFilter.onchange = filterAndRender;

        const yearFilter = document.getElementById('chYearFilter');
        if (yearFilter) yearFilter.onchange = filterAndRender;

        const form = document.getElementById('chForm');
        if (form) form.onsubmit = handleFormSubmit;

        // Set default filter to 'pending' (Chưa trao đổi) and year to 2026
        if (statusFilter) statusFilter.value = 'pending';
        if (yearFilter) yearFilter.value = '2026';

        // Load data
        await loadQuestions();
    }

    async function loadQuestions() {
        const listEl = document.getElementById('chListContainer');
        if (!listEl) return;

        try {
            const res = await fetch('/api/pre-meeting-questions', { credentials: 'include' });
            const data = await res.json();
            if (data && data.success) {
                _allQuestions = data.questions || [];
                updateUserFilterOptions();
                filterAndRender();
            } else {
                listEl.innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444;">⚠️ ${data.error || 'Lỗi nạp dữ liệu'}</div>`;
            }
        } catch (e) {
            listEl.innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444;">⚠️ Lỗi kết nối: ${e.message}</div>`;
        }
    }

    function updateUserFilterOptions() {
        const userSelect = document.getElementById('chUserFilter');
        if (!userSelect) return;

        const creatorsMap = new Map();

        // Add logged in user if available
        if (_currentUser && _currentUser.id) {
            const myName = _currentUser.full_name || _currentUser.name || _currentUser.username || 'Tôi';
            creatorsMap.set(String(_currentUser.id), `${myName} (Tôi)`);
        }

        // Add all unique creators from questions
        _allQuestions.forEach(q => {
            if (q.creator_id) {
                const idStr = String(q.creator_id);
                if (!creatorsMap.has(idStr)) {
                    const name = q.creator_name || q.creator_username || `Tài khoản ${q.creator_id}`;
                    creatorsMap.set(idStr, name);
                }
            }
        });

        const prevVal = userSelect.value;
        let html = `<option value="all">🌐 Tất cả tài khoản</option>`;
        creatorsMap.forEach((name, idStr) => {
            html += `<option value="${idStr}">👤 ${name}</option>`;
        });
        userSelect.innerHTML = html;

        // Auto-default to logged in user if user hasn't manually selected another filter
        if (!_hasManuallySetUserFilter && _currentUser && _currentUser.id && creatorsMap.has(String(_currentUser.id))) {
            userSelect.value = String(_currentUser.id);
        } else if (prevVal && (prevVal === 'all' || creatorsMap.has(prevVal))) {
            userSelect.value = prevVal;
        } else {
            userSelect.value = 'all';
        }
    }

    function isImportant(q) {
        if (!q) return false;
        return q.is_important === true || q.is_important === 'true' || q.is_important === 1 || q.is_important === '1' || q.is_important === 't';
    }

    function getUserBadgeStyle(creatorId, name) {
        const nameStr = String(name || creatorId || 'Ẩn danh').trim().toLowerCase();
        const palettes = [
            { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' }, // Blue
            { bg: '#f0fdf4', text: '#15803d', border: '#86efac' }, // Green
            { bg: '#faf5ff', text: '#7e22ce', border: '#d8b4fe' }, // Purple
            { bg: '#fff7ed', text: '#c2410c', border: '#fdba74' }, // Orange
            { bg: '#fdf2f8', text: '#be185d', border: '#f472b6' }, // Pink
            { bg: '#f0fdfa', text: '#0f766e', border: '#5eead4' }, // Teal
            { bg: '#fefce8', text: '#a16207', border: '#fde047' }, // Amber
            { bg: '#f1f5f9', text: '#0f172a', border: '#94a3b8' }, // Slate
            { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' }, // Sky
            { bg: '#ecfdf5', text: '#047857', border: '#6ee7b7' }, // Emerald
            { bg: '#f5f3ff', text: '#6d28d9', border: '#c4b5fd' }, // Violet
            { bg: '#fff1f2', text: '#be123c', border: '#fda4af' }, // Rose
        ];
        let hash = 0;
        for (let i = 0; i < nameStr.length; i++) {
            hash = (hash << 5) - hash + nameStr.charCodeAt(i);
            hash |= 0;
        }
        const index = Math.abs(hash) % palettes.length;
        return palettes[index];
    }

    function removeAccents(str) {
        if (!str) return '';
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }

    function capitalizeFirstLetter(str) {
        if (!str) return '';
        const trimmed = String(str).trim();
        if (!trimmed) return '';
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    }

    function filterAndRender() {
        const listEl = document.getElementById('chListContainer');
        if (!listEl) return;

        const searchVal = removeAccents(document.getElementById('chSearchInput')?.value.trim() || '');
        const statusVal = document.getElementById('chStatusFilter')?.value || 'all';
        const userVal = document.getElementById('chUserFilter')?.value || 'all';
        const monthVal = document.getElementById('chMonthFilter')?.value || 'all';
        const yearVal = document.getElementById('chYearFilter')?.value || 'all';

        let filtered = _allQuestions.filter(q => {
            if (statusVal !== 'all' && q.status !== statusVal) return false;
            if (userVal !== 'all' && String(q.creator_id) !== String(userVal)) return false;

            if (q.created_at) {
                const d = new Date(q.created_at);
                if (monthVal !== 'all' && (d.getMonth() + 1) !== parseInt(monthVal)) return false;
                if (yearVal !== 'all' && d.getFullYear() !== parseInt(yearVal)) return false;
            }

            if (searchVal) {
                const title = removeAccents(q.title || '');
                const content = removeAccents(q.content || '');
                const creator = removeAccents(q.creator_name || '');
                return title.includes(searchVal) || content.includes(searchVal) || creator.includes(searchVal);
            }
            return true;
        });

        filtered.sort((a, b) => {
            const aImp = isImportant(a);
            const bImp = isImportant(b);
            if (aImp && !bImp) return -1;
            if (!aImp && bImp) return 1;
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            return aTime - bTime;
        });

        if (filtered.length === 0) {
            listEl.innerHTML = `
                <div style="background:white;border-radius:14px;padding:40px;text-align:center;color:#94a3b8;box-shadow:0 4px 15px rgba(0,0,0,0.03);">
                    <span style="font-size:40px;display:block;margin-bottom:10px;">💬</span>
                    <p style="margin:0;font-size:15px;font-weight:600;">Chưa có câu hỏi nào trong danh sách</p>
                </div>
            `;
            return;
        }

        const user = window.currentUser || window._currentUser || {};

        listEl.innerHTML = filtered.map((q, idx) => {
            const isCompleted = q.status === 'completed';
            const dateStr = q.created_at ? new Date(q.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
            const isOwner = user && q.creator_id === user.id;
            const imp = isImportant(q);
            const creatorName = q.creator_name || q.creator_username || 'Ẩn danh';
            const uStyle = getUserBadgeStyle(q.creator_id, creatorName);
            const titleFormatted = capitalizeFirstLetter(q.title);

            return `
                <div style="background:${imp ? '#fff8f8' : 'white'};border-radius:12px;padding:14px 18px;box-shadow:${imp ? '0 3px 12px rgba(239,68,68,0.12)' : '0 2px 8px rgba(0,0,0,0.03)'};border:${imp ? '1.5px solid #ef4444;' : `1px solid #e2e8f0; border-left:4px solid ${isCompleted ? '#22c55e' : '#f97316'};`}display:flex;flex-direction:column;gap:10px;transition:all 0.15s;" onmouseover="this.style.boxShadow='${imp ? '0 4px 18px rgba(239,68,68,0.2)' : '0 4px 16px rgba(0,0,0,0.07)'}'" onmouseout="this.style.boxShadow='${imp ? '0 3px 12px rgba(239,68,68,0.12)' : '0 2px 8px rgba(0,0,0,0.03)'}'">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
                        <div style="font-size:14.5px;font-weight:600;color:#0f172a;line-height:1.5;opacity:${isCompleted ? '0.85' : '1'};word-break:break-word;white-space:pre-wrap;flex:1;">${idx + 1} - ${titleFormatted}</div>
                        ${imp ? `<span class="ch-badge-important" title="Quan trọng">🔥</span>` : ''}
                    </div>
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:8px;border-top:1px dashed #f1f5f9;">
                        <div style="font-size:12px;color:#64748b;display:flex;align-items:center;gap:12px;">
                            <span style="display:inline-flex;align-items:center;gap:4px;background:${uStyle.bg};color:${uStyle.text};border:1px solid ${uStyle.border};padding:2px 10px;border-radius:10px;font-weight:800;font-size:12px;font-family:inherit;letter-spacing:-0.1px;">
                                👤 ${creatorName}
                            </span>
                            <span style="font-weight:600;">📅 ${dateStr}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <button onclick="window.togglePreMeetingQuestionStatus(${q.id}, '${isCompleted ? 'pending' : 'completed'}')" ${isOwner ? '' : 'disabled'} title="${isOwner ? 'Nhấp để đổi trạng thái' : 'Chỉ người tạo mới được đổi trạng thái'}" style="background:${isCompleted ? '#dcfce7' : '#fff7ed'};border:1.5px solid ${isCompleted ? '#86efac' : '#fed7aa'};color:${isCompleted ? '#15803d' : '#c2410c'};padding:5px 14px;border-radius:16px;font-weight:800;font-size:12px;font-family:inherit;letter-spacing:-0.1px;cursor:${isOwner ? 'pointer' : 'not-allowed'};opacity:${isOwner ? '1' : '0.6'};white-space:nowrap;">
                                ${isCompleted ? '🟢 Đã trao đổi' : '🟠 Chưa trao đổi'}
                            </button>
                            ${isOwner ? `
                                <button onclick="window.editPreMeetingQuestion(${q.id})" style="background:#f1f5f9;color:#475569;border:none;width:30px;height:30px;border-radius:8px;font-size:13px;cursor:pointer;" title="Chỉnh sửa">✏️</button>
                                <button onclick="window.deletePreMeetingQuestion(${q.id})" style="background:#fef2f2;color:#ef4444;border:none;width:30px;height:30px;border-radius:8px;font-size:13px;cursor:pointer;" title="Xóa câu hỏi">🗑️</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function openModal(question = null) {
        const modal = document.getElementById('chModal');
        const modalTitle = document.getElementById('chModalTitle');
        const titleInput = document.getElementById('chTitleInput');
        const importantInput = document.getElementById('chImportantInput');

        if (!modal) return;

        if (question) {
            _editingQuestionId = question.id;
            modalTitle.textContent = 'CHỈNH SỬA CÂU HỎI TRƯỚC BUỔI HỌP';
            titleInput.value = capitalizeFirstLetter(question.title || '');
            const imp = isImportant(question);
            if (importantInput) {
                importantInput.selectedIndex = imp ? 1 : 0;
                importantInput.value = imp ? 'true' : 'false';
            }
        } else {
            _editingQuestionId = null;
            modalTitle.textContent = 'TẠO CÂU HỎI TRƯỚC BUỔI HỌP';
            titleInput.value = '';
            if (importantInput) {
                importantInput.selectedIndex = 0;
                importantInput.value = 'false';
            }
        }

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        setTimeout(() => titleInput.focus(), 100);
    }

    function closeModal() {
        const modal = document.getElementById('chModal');
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        _editingQuestionId = null;
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const rawTitle = document.getElementById('chTitleInput')?.value.trim();
        const title = capitalizeFirstLetter(rawTitle);
        const importantEl = document.getElementById('chImportantInput');
        const is_important = importantEl ? (importantEl.value === 'true' || importantEl.selectedIndex === 1) : false;
        const existing = _editingQuestionId ? _allQuestions.find(q => q.id === _editingQuestionId) : null;
        const content = existing ? (existing.content || '') : '';
        const status = existing ? (existing.status || 'pending') : 'pending';

        if (!title) {
            alert('Vui lòng nhập nội dung câu hỏi');
            return;
        }

        try {
            let res;
            if (_editingQuestionId) {
                res = await fetch(`/api/pre-meeting-questions/${_editingQuestionId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ title, content, status, is_important })
                });
            } else {
                res = await fetch('/api/pre-meeting-questions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ title, content, status, is_important })
                });
            }

            const data = await res.json();
            if (data && data.success) {
                closeModal();
                await loadQuestions();
            } else {
                alert('❌ Lỗi: ' + (data.error || 'Thao tác thất bại'));
            }
        } catch (err) {
            alert('❌ Lỗi kết nối: ' + err.message);
        }
    }

    // Global Action Handlers
    window.togglePreMeetingQuestionStatus = async function (id, newStatus) {
        const confirmMsg = newStatus === 'completed' 
            ? 'Xác nhận chuyển trạng thái câu hỏi này thành "🟢 Đã trao đổi"?'
            : 'Xác nhận chuyển trạng thái câu hỏi này thành "🟠 Chưa trao đổi"?';
            
        if (!confirm(confirmMsg)) return;

        try {
            const res = await fetch(`/api/pre-meeting-questions/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (data && data.success) {
                const target = _allQuestions.find(q => q.id === id);
                if (target) target.status = newStatus;
                filterAndRender();
            } else {
                alert('❌ Lỗi cập nhật trạng thái: ' + (data.error || 'Thất bại'));
            }
        } catch (e) {
            alert('❌ Lỗi kết nối: ' + e.message);
        }
    };

    window.editPreMeetingQuestion = function (id) {
        const question = _allQuestions.find(q => q.id === id);
        if (question) openModal(question);
    };

    window.deletePreMeetingQuestion = async function (id) {
        if (!confirm('⚠️ Bạn có chắc chắn muốn xóa câu hỏi này khỏi danh sách?')) return;
        try {
            const res = await fetch(`/api/pre-meeting-questions/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();
            if (data && data.success) {
                _allQuestions = _allQuestions.filter(q => q.id !== id);
                filterAndRender();
            } else {
                alert('❌ Lỗi xóa câu hỏi: ' + (data.error || 'Thất bại'));
            }
        } catch (e) {
            alert('❌ Lỗi kết nối: ' + e.message);
        }
    };

    // Expose init function
    window.initCauHoiTruocBuoiHop = initCauHoiTruocBuoiHop;
})();
