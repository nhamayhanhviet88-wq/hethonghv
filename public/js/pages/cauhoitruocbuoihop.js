(function () {
    let _allQuestions = [];
    let _editingQuestionId = null;

    async function initCauHoiTruocBuoiHop(container) {
        if (!container) return;

        // User authority check: Giám Đốc, Quản Lý Cấp Cao, hoặc anh Lê Việt Trình (username = 'trinh')
        const user = window.currentUser || window._currentUser || {};
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
                        <button id="chAddBtn" style="background:#ffffff;color:#4f46e5;border:none;padding:10px 20px;border-radius:10px;font-weight:800;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                            <span>➕</span> Thêm Câu Hỏi Mới
                        </button>
                    ` : ''}
                </div>

                <!-- Filter & Control Bar -->
                <div style="background:white;border-radius:14px;padding:16px 20px;box-shadow:0 4px 15px rgba(0,0,0,0.05);margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;">
                    <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:280px;">
                        <div style="position:relative;flex:1;">
                            <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:16px;color:#94a3b8;">🔍</span>
                            <input type="text" id="chSearchInput" placeholder="Tìm kiếm nội dung câu hỏi, người tạo..." style="width:100%;padding:10px 14px 10px 40px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:14px;outline:none;transition:border-color 0.2s;box-sizing:border-box;" onfocus="this.style.borderColor='#4f46e5'" onblur="this.style.borderColor='#cbd5e1'">
                        </div>
                    </div>

                    <div style="display:flex;align-items:center;gap:12px;">
                        <label style="font-size:13px;font-weight:700;color:#475569;">Trạng thái:</label>
                        <select id="chStatusFilter" style="padding:9px 14px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:13px;font-weight:600;color:#1e293b;outline:none;cursor:pointer;background:white;">
                            <option value="all">Tất cả trạng thái</option>
                            <option value="pending" selected>🟠 Chưa trao đổi</option>
                            <option value="completed">🟢 Đã trao đổi</option>
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
                            <textarea id="chTitleInput" rows="3" placeholder="Nhập câu hỏi hoặc vấn đề cần thảo luận..." style="width:100%;padding:10px 14px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:14px;outline:none;box-sizing:border-box;" required></textarea>
                        </div>

                        <div>
                            <label style="display:block;font-size:13px;font-weight:700;color:#334155;margin-bottom:6px;">Ghi chú thêm (nếu có)</label>
                            <textarea id="chContentInput" rows="2" placeholder="Ghi chú thêm thông tin chi tiết..." style="width:100%;padding:10px 14px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:13px;outline:none;box-sizing:border-box;"></textarea>
                        </div>

                        <div>
                            <label style="display:block;font-size:13px;font-weight:700;color:#334155;margin-bottom:6px;">Trạng thái ban đầu</label>
                            <select id="chStatusInput" style="width:100%;padding:10px 14px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:13px;font-weight:600;outline:none;box-sizing:border-box;">
                                <option value="pending">🟠 Chưa trao đổi</option>
                                <option value="completed">🟢 Đã trao đổi</option>
                            </select>
                        </div>

                        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px;">
                            <button type="button" id="chModalCancelBtn" style="padding:9px 18px;background:#f1f5f9;color:#475569;border:none;border-radius:8px;font-weight:700;cursor:pointer;">Hủy</button>
                            <button type="submit" style="padding:9px 22px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(79,70,229,0.3);">Lưu lại</button>
                        </div>
                    </form>
                </div>
            </div>
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

        const form = document.getElementById('chForm');
        if (form) form.onsubmit = handleFormSubmit;

        // Set default filter to 'pending' (Chưa trao đổi)
        if (statusFilter) statusFilter.value = 'pending';

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
                filterAndRender();
            } else {
                listEl.innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444;">⚠️ ${data.error || 'Lỗi nạp dữ liệu'}</div>`;
            }
        } catch (e) {
            listEl.innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444;">⚠️ Lỗi kết nối: ${e.message}</div>`;
        }
    }

    function removeAccents(str) {
        if (!str) return '';
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }

    function filterAndRender() {
        const listEl = document.getElementById('chListContainer');
        if (!listEl) return;

        const searchVal = removeAccents(document.getElementById('chSearchInput')?.value.trim() || '');
        const statusVal = document.getElementById('chStatusFilter')?.value || 'all';

        let filtered = _allQuestions.filter(q => {
            if (statusVal !== 'all' && q.status !== statusVal) return false;
            if (searchVal) {
                const title = removeAccents(q.title || '');
                const content = removeAccents(q.content || '');
                const creator = removeAccents(q.creator_name || '');
                return title.includes(searchVal) || content.includes(searchVal) || creator.includes(searchVal);
            }
            return true;
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
        const canManage = user.role === 'giam_doc' || user.role === 'quan_ly_cap_cao' || user.username === 'trinh';

        listEl.innerHTML = filtered.map(q => {
            const isCompleted = q.status === 'completed';
            const dateStr = q.created_at ? new Date(q.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
            const canEditThis = canManage || q.creator_id === user.id;

            return `
                <div style="background:white;border-radius:10px;padding:12px 16px;box-shadow:0 2px 8px rgba(0,0,0,0.03);border-left:4px solid ${isCompleted ? '#22c55e' : '#f97316'};display:flex;align-items:center;gap:14px;transition:all 0.15s;" onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.07)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.03)'">
                    <button onclick="window.togglePreMeetingQuestionStatus(${q.id}, '${isCompleted ? 'pending' : 'completed'}')" ${canManage ? '' : 'disabled'} title="${canManage ? 'Nhấp để đổi trạng thái' : ''}" style="background:${isCompleted ? '#dcfce7' : '#ffedd5'};border:1.5px solid ${isCompleted ? '#86efac' : '#fed7aa'};color:${isCompleted ? '#15803d' : '#c2410c'};padding:5px 12px;border-radius:16px;font-weight:800;font-size:11px;cursor:${canManage ? 'pointer' : 'default'};white-space:nowrap;flex-shrink:0;">
                        ${isCompleted ? '🟢 Đã' : '🟠 Chưa'}
                    </button>

                    <div style="flex:1;min-width:0;font-size:14px;font-weight:700;color:#1e293b;text-decoration:${isCompleted ? 'line-through' : 'none'};opacity:${isCompleted ? '0.65' : '1'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(q.content || q.title).replace(/"/g, '&quot;')}">
                        ${q.title}
                    </div>

                    <div style="font-size:11px;color:#94a3b8;white-space:nowrap;text-align:right;flex-shrink:0;line-height:1.5;">
                        <div>👤 ${q.creator_name || q.creator_username || ''}</div>
                        <div>📅 ${dateStr}</div>
                    </div>

                    ${canEditThis ? `<button onclick="window.editPreMeetingQuestion(${q.id})" style="background:#f1f5f9;color:#475569;border:none;width:30px;height:30px;border-radius:8px;font-size:13px;cursor:pointer;flex-shrink:0;" title="Chỉnh sửa">✏️</button>` : ''}
                </div>
            `;
        }).join('');
    }

    function openModal(question = null) {
        const modal = document.getElementById('chModal');
        const modalTitle = document.getElementById('chModalTitle');
        const titleInput = document.getElementById('chTitleInput');
        const contentInput = document.getElementById('chContentInput');
        const statusInput = document.getElementById('chStatusInput');

        if (!modal) return;

        if (question) {
            _editingQuestionId = question.id;
            modalTitle.textContent = 'CHỈNH SỬA CÂU HỎI TRƯỚC BUỔI HỌP';
            titleInput.value = question.title || '';
            contentInput.value = question.content || '';
            statusInput.value = question.status || 'pending';
        } else {
            _editingQuestionId = null;
            modalTitle.textContent = 'TẠO CÂU HỎI TRƯỚC BUỔI HỌP';
            titleInput.value = '';
            contentInput.value = '';
            statusInput.value = 'pending';
        }

        modal.style.display = 'flex';
        setTimeout(() => titleInput.focus(), 100);
    }

    function closeModal() {
        const modal = document.getElementById('chModal');
        if (modal) modal.style.display = 'none';
        _editingQuestionId = null;
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const title = document.getElementById('chTitleInput')?.value.trim();
        const content = document.getElementById('chContentInput')?.value.trim();
        const status = document.getElementById('chStatusInput')?.value || 'pending';

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
                    body: JSON.stringify({ title, content, status })
                });
            } else {
                res = await fetch('/api/pre-meeting-questions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ title, content, status })
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
