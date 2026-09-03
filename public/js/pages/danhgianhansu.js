// ========== ĐÁNH GIÁ NHÂN SỰ — CUỘC HỌP CÔNG TY ==========
(function() {
    var _eeState = {
        monthYear: 'Tháng ' + (new Date().getMonth() + 1) + '/' + new Date().getFullYear(),
        department: 'all',
        status: 'all',
        search: '',
        viewMode: 'compact', // 'compact' | 'cards' | 'excel'
        items: [],
        stats: { total: 0, pending: 0, in_progress: 0, completed: 0 },
        users: []
    };

    var DEPARTMENTS = ['Kinh Doanh', 'Sale', 'Marketing', 'Sản Xuất', 'Văn Phòng', 'Thiết Kế', 'May', 'Cắt', 'In', 'Ép', 'Hoàn Thiện', 'Kho', 'Khác'];

    async function renderDanhgianhansuPage(container) {
        var c = container || document.getElementById('mainContent');
        if (!c) return;

        c.innerHTML = `
            <div class="ee-container" style="padding: 16px 20px; width: 100%; box-sizing: border-box; font-family: Inter, system-ui, sans-serif; color: #1e293b;">
                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 16px;">
                    <div>
                        <h1 style="font-size: 22px; font-weight: 900; color: #0f172a; margin: 0 0 4px 0; display: flex; align-items: center; gap: 10px;">
                            <span>📝</span> ĐÁNH GIÁ NHÂN SỰ — CUỘC HỌP CÔNG TY
                        </h1>
                        <p style="font-size: 13px; color: #64748b; margin: 0;">
                            Quản lý đánh giá năng lực, theo dõi các lỗi & kế hoạch đào tạo, cam kết khắc phục của từng nhân sự.
                        </p>
                    </div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button onclick="window._eeExportExcel()" style="padding: 8px 14px; background: #16a34a; color: white; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(22,163,74,0.25);">
                            📊 Xuất Excel
                        </button>
                        <button onclick="window._eeOpenFormModal()" style="padding: 8px 16px; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; border: none; border-radius: 8px; font-size: 12px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(124,58,237,0.3);">
                            ➕ Thêm Đánh Giá Mới
                        </button>
                    </div>
                </div>

                <!-- KPI Summary Cards -->
                <div id="eeStatsContainer" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 18px;">
                    <!-- Injected by JS -->
                </div>

                <!-- Filter Controls & View Mode Toggle Bar -->
                <div style="background: white; border-radius: 12px; padding: 12px 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.04); margin-bottom: 16px; border: 1px solid #e2e8f0; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between;">
                    <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
                        <!-- Select Month / Year -->
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <label style="font-size: 12px; font-weight: 700; color: #475569;">📅 Kỳ đánh giá:</label>
                            <select id="eeFilterMonth" onchange="window._eeOnFilterChange()" style="padding: 7px 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; font-weight: 600; background: #f8fafc; outline: none;">
                                <option value="Tháng 3/2026">Tháng 3/2026</option>
                                <option value="Tháng 9/2026">Tháng 9/2026</option>
                                <option value="Tháng 8/2026">Tháng 8/2026</option>
                                <option value="Tháng 7/2026">Tháng 7/2026</option>
                                <option value="Tháng 6/2026">Tháng 6/2026</option>
                                <option value="Tháng 5/2026">Tháng 5/2026</option>
                                <option value="Tháng 4/2026">Tháng 4/2026</option>
                                <option value="all">Tất Cả Kỳ</option>
                            </select>
                        </div>

                        <!-- Department Filter -->
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <label style="font-size: 12px; font-weight: 700; color: #475569;">🏢 Bộ phận:</label>
                            <select id="eeFilterDept" onchange="window._eeOnFilterChange()" style="padding: 7px 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; font-weight: 600; background: #f8fafc; outline: none;">
                                <option value="all">Tất Cả Bộ Phận</option>
                                ${DEPARTMENTS.map(d => `<option value="${d}">${d}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
                        <!-- Search Input -->
                        <div style="position: relative; width: 220px;">
                            <input id="eeSearchInput" type="text" placeholder="🔍 Tìm nhân sự, lỗi..." oninput="window._eeOnSearchInput()" style="width: 100%; padding: 7px 10px 7px 30px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; outline: none; box-sizing: border-box;">
                            <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 12px;">🔍</span>
                        </div>

                        <!-- View Mode Switcher -->
                        <div style="display: flex; background: #f1f5f9; padding: 3px; border-radius: 8px; border: 1px solid #cbd5e1;">
                            <button id="btnViewCompact" onclick="window._eeSetViewMode('compact')" style="padding: 5px 10px; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; background: #1e40af; color: white;">📋 Bảng Gọn (100% Màn)</button>
                            <button id="btnViewCards" onclick="window._eeSetViewMode('cards')" style="padding: 5px 10px; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; background: transparent; color: #475569;">🎴 Dạng Thẻ (Card)</button>
                        </div>
                    </div>
                </div>

                <!-- Main View Display Area -->
                <div id="eeMainViewArea" style="width: 100%;">
                    <!-- Injected by JS -->
                </div>
            </div>

            <!-- Modal Container Placeholder -->
            <div id="eeModalContainer"></div>
        `;

        // Set initial dropdown value
        var filterMonthEl = document.getElementById('eeFilterMonth');
        if (filterMonthEl) filterMonthEl.value = _eeState.monthYear;

        // Fetch users for dropdown
        try {
            var uRes = await apiCall('/api/users/dropdown');
            _eeState.users = (uRes && uRes.users) ? uRes.users : [];
        } catch(e) {
            console.warn('Could not fetch users list:', e);
        }

        await _eeLoadData();
    }

    async function _eeLoadData() {
        try {
            var params = new URLSearchParams();
            params.append('month_year', _eeState.monthYear);
            params.append('department', _eeState.department);
            params.append('status', _eeState.status);
            if (_eeState.search) params.append('search', _eeState.search);

            var res = await apiCall('/api/employee-evaluations?' + params.toString());
            _eeState.items = (res && res.items) ? res.items : [];

            var statsRes = await apiCall('/api/employee-evaluations/stats?month_year=' + encodeURIComponent(_eeState.monthYear));
            if (statsRes && statsRes.stats) {
                _eeState.stats = statsRes.stats;
            }

            _eeRenderStats();
            _eeRenderCurrentView();
        } catch(err) {
            console.error('Error loading employee evaluation data:', err);
            showToast('⚠️ Không thể tải dữ liệu đánh giá nhân sự', 'error');
        }
    }

    function _eeRenderStats() {
        var container = document.getElementById('eeStatsContainer');
        if (!container) return;
        var s = _eeState.stats;

        container.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 14px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.03); display: flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; border-radius: 10px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 18px;">📋</div>
                <div>
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">TỔNG ĐÁNH GIÁ</div>
                    <div style="font-size: 20px; font-weight: 900; color: #0f172a;">${s.total}</div>
                </div>
            </div>

            <div style="background: white; border-radius: 12px; padding: 14px; border: 1px solid #fee2e2; box-shadow: 0 2px 8px rgba(239,68,68,0.06); display: flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; border-radius: 10px; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 18px;">🔴</div>
                <div>
                    <div style="font-size: 11px; font-weight: 700; color: #991b1b; text-transform: uppercase;">CHƯA XỬ LÝ</div>
                    <div style="font-size: 20px; font-weight: 900; color: #dc2626;">${s.pending}</div>
                </div>
            </div>

            <div style="background: white; border-radius: 12px; padding: 14px; border: 1px solid #fef3c7; box-shadow: 0 2px 8px rgba(245,158,11,0.06); display: flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; border-radius: 10px; background: #fef3c7; color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 18px;">🟡</div>
                <div>
                    <div style="font-size: 11px; font-weight: 700; color: #92400e; text-transform: uppercase;">ĐANG KHẮC PHỤC</div>
                    <div style="font-size: 20px; font-weight: 900; color: #d97706;">${s.in_progress}</div>
                </div>
            </div>

            <div style="background: white; border-radius: 12px; padding: 14px; border: 1px solid #d1fae5; box-shadow: 0 2px 8px rgba(16,185,129,0.06); display: flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; border-radius: 10px; background: #d1fae5; color: #059669; display: flex; align-items: center; justify-content: center; font-size: 18px;">🟢</div>
                <div>
                    <div style="font-size: 11px; font-weight: 700; color: #065f46; text-transform: uppercase;">HOÀN THÀNH</div>
                    <div style="font-size: 20px; font-weight: 900; color: #059669;">${s.completed}</div>
                </div>
            </div>
        `;
    }

    window._eeSetViewMode = function(mode) {
        _eeState.viewMode = mode;

        var bCompact = document.getElementById('btnViewCompact');
        var bCards = document.getElementById('btnViewCards');

        if (bCompact && bCards) {
            if (mode === 'compact') {
                bCompact.style.background = '#1e40af'; bCompact.style.color = 'white';
                bCards.style.background = 'transparent'; bCards.style.color = '#475569';
            } else {
                bCards.style.background = '#1e40af'; bCards.style.color = 'white';
                bCompact.style.background = 'transparent'; bCompact.style.color = '#475569';
            }
        }

        _eeRenderCurrentView();
    };

    function _eeRenderCurrentView() {
        var container = document.getElementById('eeMainViewArea');
        if (!container) return;

        if (_eeState.items.length === 0) {
            container.innerHTML = `
                <div style="background: white; border-radius: 14px; padding: 40px; text-align: center; color: #94a3b8; border: 1px solid #e2e8f0;">
                    <div style="font-size: 36px; margin-bottom: 8px;">📭</div>
                    <div style="font-size: 14px; font-weight: 700; color: #475569;">Không có dữ liệu đánh giá nhân sự nào</div>
                    <div style="font-size: 12px; margin-top: 4px;">Vui lòng chọn kỳ khác hoặc bấm "+ Thêm Đánh Giá Mới".</div>
                </div>
            `;
            return;
        }

        if (_eeState.viewMode === 'cards') {
            _eeRenderCardsView(container);
        } else {
            _eeRenderCompactTableView(container);
        }
    }

    // 📋 VIEW MODE 1: COMPACT 100% FIT TABLE (NOT A SINGLE SCROLLBAR)
    function _eeRenderCompactTableView(container) {
        var html = `
            <div style="background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; overflow: hidden; width: 100%;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 8.5px; table-layout: fixed;">
                    <thead>
                        <!-- Row 1: Category Groups -->
                        <tr style="font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.2px; font-weight: 900; color: white;">
                            <th rowspan="2" style="padding: 6px 2px; background: #1e3a8a; width: 3.5%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.2);">Kỳ</th>
                            <th rowspan="2" style="padding: 6px 2px; background: #1e3a8a; width: 2.5%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.2);">STT</th>
                            <th rowspan="2" style="padding: 6px 3px; background: #1e3a8a; width: 7%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="Họ Tên">Họ Tên</th>
                            <th rowspan="2" style="padding: 6px 2px; background: #1e3a8a; width: 5.5%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="Bộ Phận">Bộ Phận</th>
                            
                            <!-- Group 1: Manager Eval -->
                            <th colspan="5" style="padding: 5px 4px; background: #1e3a8a; text-align: center; vertical-align: middle; border-bottom: 1px solid rgba(255,255,255,0.2); border-right: 1px solid rgba(255,255,255,0.2);">👨‍💼 ĐÁNH GIÁ TỪ QUẢN LÝ</th>
                            
                            <!-- Group 2: Employee Opinion -->
                            <th colspan="3" style="padding: 5px 4px; background: #be185d; text-align: center; vertical-align: middle; border-bottom: 1px solid rgba(255,255,255,0.2); border-right: 1px solid rgba(255,255,255,0.2);">💬 Ý KIẾN & CAM KẾT NHÂN SỰ</th>
                            
                            <!-- Group 3: Progress Report -->
                            <th colspan="2" style="padding: 5px 4px; background: #0369a1; text-align: center; vertical-align: middle; border-bottom: 1px solid rgba(255,255,255,0.2); border-right: 1px solid rgba(255,255,255,0.2);">📊 BÁO CÁO TIẾN ĐỘ</th>
                            
                            <th rowspan="2" style="padding: 6px 2px; background: #334155; width: 5%; text-align: center; vertical-align: middle;">Thao Tác</th>
                        </tr>
                        <!-- Row 2: Sub-headers centered with Multiline Linebreaks -->
                        <tr style="font-size: 8px; text-transform: uppercase; font-weight: 800; color: white; text-align: center; vertical-align: middle;">
                            <th style="padding: 5px 2px; background: #1d4ed8; width: 8.5%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.25;">Cải Thiện<br>/ Lỗi</th>
                            <th style="padding: 5px 2px; background: #1d4ed8; width: 10.5%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.25;">Đánh Giá<br>Quản Lý</th>
                            <th style="padding: 5px 2px; background: #1d4ed8; width: 9%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.25;">Nội Dung<br>Khắc Phục</th>
                            <th style="padding: 5px 2px; background: #1d4ed8; width: 8.5%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.25;">Hướng<br>Đào Tạo</th>
                            <th style="padding: 5px 2px; background: #1d4ed8; width: 8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.25;">Quản Lý<br>Cam Kết</th>
                            
                            <th style="padding: 5px 2px; background: #db2777; width: 8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.25;">Ý Kiến<br>Nhân Sự</th>
                            <th style="padding: 5px 2px; background: #db2777; width: 5.5%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.25;">Hạn<br>Xử Lý</th>
                            <th style="padding: 5px 2px; background: #db2777; width: 8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.25;">Nhân Sự<br>Cam Kết</th>
                            
                            <th style="padding: 5px 2px; background: #0284c7; width: 8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.25;">Quản Lý<br>Báo Cáo</th>
                            <th style="padding: 5px 2px; background: #0284c7; width: 8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.25;">Nhân Sự<br>Báo Cáo</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        _eeState.items.forEach(function(item, idx) {
            var monthShort = item.month_year ? item.month_year.replace('Tháng ', 'T') : '--';

            html += `
                <tr style="border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.15s;" onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='white'" onclick="window._eeOpenDetailModal(${item.id})">
                    <td style="padding: 5px 2px; text-align: center; font-weight: 700; color: #1e40af; background: #f0f9ff; border-right: 1px solid #e2e8f0; font-size: 8.5px;">${monthShort}</td>
                    <td style="padding: 5px 2px; text-align: center; font-weight: 700; color: #64748b; border-right: 1px solid #e2e8f0; font-size: 8.5px;">${idx + 1}</td>
                    <td style="padding: 5px 3px; font-weight: 800; color: #0f172a; border-right: 1px solid #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 8.5px;" title="${item.employee_name}">${item.employee_name || '--'}</td>
                    <td style="padding: 5px 2px; border-right: 1px solid #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 8.5px;" title="${item.department}"><span style="padding: 1px 4px; border-radius: 4px; background: #f1f5f9; font-weight: 700; color: #334155; font-size: 8.5px;">${item.department || '--'}</span></td>
                    
                    <td style="padding: 5px 3px; border-right: 1px solid #e2e8f0; color: #dc2626; font-weight: 600; word-break: break-word; line-height: 1.25; font-size: 8.5px;" title="${item.improvement_errors}">${_clampText(item.improvement_errors)}</td>
                    <td style="padding: 5px 3px; border-right: 1px solid #e2e8f0; color: #334155; word-break: break-word; line-height: 1.25; font-size: 8.5px;" title="${item.manager_evaluation}">${_clampText(item.manager_evaluation)}</td>
                    <td style="padding: 5px 3px; border-right: 1px solid #e2e8f0; color: #2563eb; font-weight: 600; word-break: break-word; line-height: 1.25; font-size: 8.5px;" title="${item.remediation_action}">${_clampText(item.remediation_action)}</td>
                    <td style="padding: 5px 3px; border-right: 1px solid #e2e8f0; color: #7c3aed; word-break: break-word; line-height: 1.25; font-size: 8.5px;" title="${item.training_direction}">${_clampText(item.training_direction)}</td>
                    <td style="padding: 5px 3px; border-right: 1px solid #e2e8f0; color: #059669; word-break: break-word; line-height: 1.25; font-size: 8.5px;" title="${item.manager_commitment}">${_clampText(item.manager_commitment)}</td>
                    
                    <!-- Pink Section: Employee Input -->
                    <td style="padding: 5px 3px; background: #fdf2f8; border-right: 1px solid #fbcfe8; color: #be185d; word-break: break-word; line-height: 1.25; font-size: 8.5px;" title="${item.employee_opinion}">${_clampText(item.employee_opinion)}</td>
                    <td style="padding: 5px 2px; background: #fdf2f8; border-right: 1px solid #fbcfe8; font-weight: 700; color: #9d174d; font-size: 8.5px;" title="${item.resolution_deadline}">${item.resolution_deadline || '--'}</td>
                    <td style="padding: 5px 3px; background: #fdf2f8; border-right: 1px solid #fbcfe8; color: #be185d; word-break: break-word; line-height: 1.25; font-size: 8.5px;" title="${item.employee_commitment}">${_clampText(item.employee_commitment)}</td>
                    
                    <!-- Teal Section: Progress Report -->
                    <td style="padding: 5px 3px; background: #f0f9ff; border-right: 1px solid #bae6fd; color: #0369a1; word-break: break-word; line-height: 1.25; font-size: 8.5px;" title="${item.manager_report}">${_clampText(item.manager_report)}</td>
                    <td style="padding: 5px 3px; background: #f0f9ff; border-right: 1px solid #bae6fd; color: #0369a1; word-break: break-word; line-height: 1.25; font-size: 8.5px;" title="${item.employee_report}">${_clampText(item.employee_report)}</td>
                    
                    <!-- Actions -->
                    <td style="padding: 5px 2px; text-align: center;" onclick="event.stopPropagation()">
                        <div style="display: flex; gap: 3px; justify-content: center;">
                            <button onclick="window._eeOpenDetailModal(${item.id})" title="Xem Chi Tiết" style="padding: 2px 4px; background: #e0e7ff; color: #4338ca; border: none; border-radius: 4px; cursor: pointer; font-size: 9px;">👁️</button>
                            <button onclick="window._eeOpenFormModal(${item.id})" title="Chỉnh Sửa" style="padding: 2px 4px; background: #f1f5f9; color: #475569; border: none; border-radius: 4px; cursor: pointer; font-size: 9px;">✏️</button>
                            <button onclick="window._eeDelete(${item.id})" title="Xóa" style="padding: 2px 4px; background: #fee2e2; color: #dc2626; border: none; border-radius: 4px; cursor: pointer; font-size: 9px;">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
            <div style="margin-top: 8px; font-size: 11px; color: #64748b; text-align: right; font-style: italic;">
                💡 Mẹo: Bảng được tự động căn vừa 100% màn hình. Rê chuột vào ô bất kỳ để xem toàn bộ nội dung hoặc bấm icon 👁️ để xem dạng hồ sơ.
            </div>
        `;

        container.innerHTML = html;
    }

    // 🎴 VIEW MODE 2: CARD GRID VIEW (EACH EMPLOYEE IN A BEAUTIFUL CARD)
    function _eeRenderCardsView(container) {
        var html = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 16px;">`;

        _eeState.items.forEach(function(item, idx) {
            html += `
                <div style="background: white; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 14px rgba(0,0,0,0.04); overflow: hidden; display: flex; flex-direction: column;">
                    <!-- Card Header -->
                    <div style="padding: 14px 18px; background: linear-gradient(135deg, #1e3a8a, #1e40af); color: white; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 16px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                                <span>👤 ${item.employee_name}</span>
                                <span style="font-size: 10px; font-weight: 700; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 10px;">${item.department || '--'}</span>
                            </div>
                            <div style="font-size: 11px; color: #93c5fd; margin-top: 2px;">📅 ${item.month_year || '--'} • STT: #${idx + 1}</div>
                        </div>
                        <div style="display: flex; gap: 6px;">
                            <button onclick="window._eeOpenFormModal(${item.id})" style="padding: 6px 10px; background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;">✏️ Sửa</button>
                            <button onclick="window._eeDelete(${item.id})" style="padding: 6px 10px; background: rgba(239,68,68,0.3); color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;">🗑️</button>
                        </div>
                    </div>

                    <!-- Card Body -->
                    <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px; flex: 1;">
                        <!-- Manager Section -->
                        <div style="background: #f8fafc; padding: 12px; border-radius: 10px; border-left: 4px solid #1e3a8a;">
                            <div style="font-size: 11px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin-bottom: 6px;">👨‍💼 Đánh Giá Từ Quản Lý</div>
                            <div style="font-size: 12px; color: #dc2626; font-weight: 700; margin-bottom: 4px;">⚠️ Lỗi/Cải thiện: <span style="font-weight: 500; color: #334155;">${item.improvement_errors || '--'}</span></div>
                            <div style="font-size: 12px; color: #334155; margin-bottom: 4px;">📊 Đánh giá năng lực: <span>${item.manager_evaluation || '--'}</span></div>
                            <div style="font-size: 12px; color: #2563eb; font-weight: 700; margin-bottom: 4px;">🛠️ Khắc phục: <span style="font-weight: 500; color: #334155;">${item.remediation_action || '--'}</span></div>
                            <div style="font-size: 12px; color: #7c3aed; font-weight: 700; margin-bottom: 4px;">🎓 Hướng đào tạo: <span style="font-weight: 500; color: #334155;">${item.training_direction || '--'}</span></div>
                            <div style="font-size: 12px; color: #059669; font-weight: 700;">🤝 Cam kết QL: <span style="font-weight: 500; color: #334155;">${item.manager_commitment || '--'}</span></div>
                        </div>

                        <!-- Employee Section -->
                        <div style="background: #fdf2f8; padding: 12px; border-radius: 10px; border-left: 4px solid #db2777;">
                            <div style="font-size: 11px; font-weight: 800; color: #be185d; text-transform: uppercase; margin-bottom: 6px;">💬 Ý Kiến & Cam Kết Nhân Sự</div>
                            <div style="font-size: 12px; color: #be185d; margin-bottom: 4px;">Ý kiến: <span style="color: #334155;">${item.employee_opinion || '--'}</span></div>
                            <div style="font-size: 12px; color: #be185d; margin-bottom: 4px;">⏰ Hạn xử lý: <span style="font-weight: 800; color: #9d174d;">${item.resolution_deadline || '--'}</span></div>
                            <div style="font-size: 12px; color: #be185d;">Cam kết: <span style="color: #334155;">${item.employee_commitment || '--'}</span></div>
                        </div>

                        <!-- Progress Report Section -->
                        <div style="background: #f0f9ff; padding: 12px; border-radius: 10px; border-left: 4px solid #0284c7;">
                            <div style="font-size: 11px; font-weight: 800; color: #0369a1; text-transform: uppercase; margin-bottom: 6px;">📊 Báo Cáo Tiến Độ</div>
                            <div style="font-size: 12px; color: #0369a1; margin-bottom: 4px;">Quản lý báo cáo: <span style="color: #334155;">${item.manager_report || '--'}</span></div>
                            <div style="font-size: 12px; color: #0369a1;">Nhân sự báo cáo: <span style="color: #334155;">${item.employee_report || '--'}</span></div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    }

    function _clampText(txt) {
        if (!txt) return '--';
        return txt.length > 45 ? txt.substring(0, 42) + '...' : txt;
    }

    // Modal Detail View
    window._eeOpenDetailModal = function(id) {
        var item = _eeState.items.find(i => i.id === id);
        if (!item) return;

        var modalContainer = document.getElementById('eeModalContainer');
        if (!modalContainer) return;

        modalContainer.innerHTML = `
            <div style="position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
                <div style="background: white; border-radius: 18px; width: 100%; max-width: 750px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
                    <div style="padding: 20px 24px; background: linear-gradient(135deg, #1e3a8a, #1e40af); border-radius: 18px 18px 0 0; color: white; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 800;">👤 Hồ Sơ Đánh Giá: ${item.employee_name}</h3>
                            <div style="font-size: 12px; color: #93c5fd; margin-top: 4px;">Bộ phận: ${item.department} • Kỳ: ${item.month_year}</div>
                        </div>
                        <button onclick="window._eeCloseModal()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 8px; font-size: 18px; cursor: pointer;">✕</button>
                    </div>

                    <div style="padding: 24px; display: flex; flex-direction: column; gap: 16px;">
                        <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0;">
                            <h4 style="margin: 0 0 10px 0; color: #1e3a8a; font-size: 14px; font-weight: 800;">👨‍💼 1. ĐÁNH GIÁ TỪ QUẢN LÝ</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
                                <div><strong style="color: #dc2626;">Cải thiện / Lỗi:</strong> ${item.improvement_errors || '--'}</div>
                                <div><strong style="color: #334155;">Đánh giá năng lực:</strong> ${item.manager_evaluation || '--'}</div>
                                <div><strong style="color: #2563eb;">Nhân sự khắc phục:</strong> ${item.remediation_action || '--'}</div>
                                <div><strong style="color: #7c3aed;">Hướng đào tạo:</strong> ${item.training_direction || '--'}</div>
                                <div style="grid-column: span 2;"><strong style="color: #059669;">Cam kết của Quản lý:</strong> ${item.manager_commitment || '--'}</div>
                            </div>
                        </div>

                        <div style="background: #fdf2f8; padding: 16px; border-radius: 12px; border: 1px solid #fbcfe8;">
                            <h4 style="margin: 0 0 10px 0; color: #be185d; font-size: 14px; font-weight: 800;">💬 2. Ý KIẾN & CAM KẾT TỪ NHÂN SỰ</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
                                <div><strong style="color: #be185d;">Ý kiến nhân sự:</strong> ${item.employee_opinion || '--'}</div>
                                <div><strong style="color: #9d174d;">Hạn xử lý (Time):</strong> ${item.resolution_deadline || '--'}</div>
                                <div style="grid-column: span 2;"><strong style="color: #be185d;">Cam kết nhân sự:</strong> ${item.employee_commitment || '--'}</div>
                            </div>
                        </div>

                        <div style="background: #f0f9ff; padding: 16px; border-radius: 12px; border: 1px solid #bae6fd;">
                            <h4 style="margin: 0 0 10px 0; color: #0284c7; font-size: 14px; font-weight: 800;">📊 3. BÁO CÁO TIẾN ĐỘ THỰC HIỆN</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
                                <div><strong style="color: #0369a1;">Quản lý báo cáo:</strong> ${item.manager_report || '--'}</div>
                                <div><strong style="color: #0369a1;">Nhân sự báo cáo:</strong> ${item.employee_report || '--'}</div>
                            </div>
                        </div>
                    </div>

                    <div style="padding: 16px 24px; background: #f8fafc; border-radius: 0 0 18px 18px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
                        <button onclick="window._eeOpenFormModal(${item.id})" style="padding: 8px 18px; background: #1e40af; color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">Chỉnh Sửa</button>
                        <button onclick="window._eeCloseModal()" style="padding: 8px 16px; background: #e2e8f0; color: #475569; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">Đóng</button>
                    </div>
                </div>
            </div>
        `;
    };

    // Filter Handlers
    window._eeOnFilterChange = function() {
        var m = document.getElementById('eeFilterMonth');
        var d = document.getElementById('eeFilterDept');
        if (m) _eeState.monthYear = m.value;
        if (d) _eeState.department = d.value;
        _eeLoadData();
    };

    var _searchDebounce = null;
    window._eeOnSearchInput = function() {
        clearTimeout(_searchDebounce);
        _searchDebounce = setTimeout(function() {
            var inp = document.getElementById('eeSearchInput');
            if (inp) {
                _eeState.search = inp.value;
                _eeLoadData();
            }
        }, 300);
    };

    // Modal Form (Add / Edit)
    window._eeOpenFormModal = function(editId) {
        var item = editId ? _eeState.items.find(i => i.id === editId) : null;
        var modalContainer = document.getElementById('eeModalContainer');
        if (!modalContainer) return;

        var userOptions = _eeState.users.map(u => `<option value="${u.id}" data-name="${u.full_name || u.name}" data-dept="${u.department || u.team_name || ''}">${u.full_name || u.username}</option>`).join('');

        modalContainer.innerHTML = `
            <div style="position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
                <div style="background: white; border-radius: 18px; width: 100%; max-width: 900px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
                    <!-- Header -->
                    <div style="padding: 20px 24px; background: linear-gradient(135deg, #1e3a8a, #1e40af); border-radius: 18px 18px 0 0; color: white; display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; font-size: 18px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                            <span>${item ? '✏️ Chỉnh Sửa' : '➕ Thêm'} Đánh Giá Nhân Sự</span>
                        </h3>
                        <button onclick="window._eeCloseModal()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 8px; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;">✕</button>
                    </div>

                    <!-- Body Form -->
                    <div style="padding: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">📅 Kỳ Đánh Giá (Tháng/Năm) <span style="color: #dc2626;">*</span></label>
                            <input id="formMonthYear" type="text" value="${item ? (item.month_year || '') : _eeState.monthYear}" placeholder="Tháng 3/2026" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; box-sizing: border-box;">
                        </div>

                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">👤 Chọn Nhân Sự / Nhập Tên <span style="color: #dc2626;">*</span></label>
                            <div style="display: flex; gap: 8px;">
                                <select id="formUserSelect" onchange="window._eeOnUserSelect(this)" style="flex: 1; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px;">
                                    <option value="">-- Chọn từ danh sách --</option>
                                    ${userOptions}
                                </select>
                                <input id="formEmpName" type="text" value="${item ? (item.employee_name || '') : ''}" placeholder="Họ và Tên" style="flex: 1; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; box-sizing: border-box;">
                            </div>
                        </div>

                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">🏢 Bộ Phận <span style="color: #dc2626;">*</span></label>
                            <select id="formDepartment" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; box-sizing: border-box;">
                                ${DEPARTMENTS.map(d => `<option value="${d}" ${(item && item.department === d) ? 'selected' : ''}>${d}</option>`).join('')}
                            </select>
                        </div>

                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 700; color: #dc2626; margin-bottom: 6px;">⚠️ Cải Thiện / Lỗi</label>
                            <input id="formImprovementErrors" type="text" value="${item ? (item.improvement_errors || '') : ''}" placeholder="VD: Hay đi muộn, ẩu kích thước..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; box-sizing: border-box;">
                        </div>

                        <div style="grid-column: span 2;">
                            <label style="display: block; font-size: 12px; font-weight: 700; color: #1e3a8a; margin-bottom: 6px;">📊 Đánh Giá Năng Lực NV Của Quản Lý</label>
                            <textarea id="formManagerEval" rows="2" placeholder="Nội dung đánh giá từ quản lý..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; box-sizing: border-box;">${item ? (item.manager_evaluation || '') : ''}</textarea>
                        </div>

                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 700; color: #2563eb; margin-bottom: 6px;">🛠️ Nhân Sự Khắc Phục (Hành động)</label>
                            <input id="formRemediation" type="text" value="${item ? (item.remediation_action || '') : ''}" placeholder="Công việc cần làm để sửa..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; box-sizing: border-box;">
                        </div>

                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 700; color: #7c3aed; margin-bottom: 6px;">🎓 Hướng Đào Tạo</label>
                            <input id="formTraining" type="text" value="${item ? (item.training_direction || '') : ''}" placeholder="Cần đào tạo thêm gì..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; box-sizing: border-box;">
                        </div>

                        <div style="grid-column: span 2;">
                            <label style="display: block; font-size: 12px; font-weight: 700; color: #059669; margin-bottom: 6px;">🤝 Cam Kết Của Quản Lý</label>
                            <input id="formManagerCommit" type="text" value="${item ? (item.manager_commitment || '') : ''}" placeholder="Hỗ trợ của quản lý..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; box-sizing: border-box;">
                        </div>

                        <!-- Section: Nhân Sự Ý Kiến & Cam Kết (Pink) -->
                        <div style="grid-column: span 2; background: #fdf2f8; padding: 16px; border-radius: 12px; border: 1px solid #fbcfe8;">
                            <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 800; color: #db2777;">💬 Phản Hồi & Cam Kết Từ Nhân Sự</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                                <div>
                                    <label style="display: block; font-size: 11px; font-weight: 700; color: #be185d; margin-bottom: 4px;">Ý Kiến Nhân Sự</label>
                                    <input id="formEmpOpinion" type="text" value="${item ? (item.employee_opinion || '') : ''}" placeholder="Ý kiến phản hồi..." style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #f472b6; font-size: 12px; box-sizing: border-box;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 11px; font-weight: 700; color: #be185d; margin-bottom: 4px;">Time Xử Lý (Hạn khắc phục)</label>
                                    <input id="formResolutionDeadline" type="date" value="${item ? (item.resolution_deadline || '') : ''}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #f472b6; font-size: 12px; box-sizing: border-box;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 11px; font-weight: 700; color: #be185d; margin-bottom: 4px;">Cam Kết Của Nhân Sự</label>
                                    <input id="formEmpCommitment" type="text" value="${item ? (item.employee_commitment || '') : ''}" placeholder="Cam kết thực hiện..." style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #f472b6; font-size: 12px; box-sizing: border-box;">
                                </div>
                            </div>
                        </div>

                        <!-- Section: Báo Cáo Tiến Độ (Teal) -->
                        <div style="grid-column: span 2; background: #f0f9ff; padding: 16px; border-radius: 12px; border: 1px solid #bae6fd;">
                            <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 800; color: #0284c7;">📊 Báo Cáo Tiến Độ Realtime</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div>
                                    <label style="display: block; font-size: 11px; font-weight: 700; color: #0369a1; margin-bottom: 4px;">Quản Lý Báo Cáo (Xử lý thế nào?)</label>
                                    <input id="formManagerReport" type="text" value="${item ? (item.manager_report || '') : ''}" placeholder="Cập nhật từ quản lý..." style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #38bdf8; font-size: 12px; box-sizing: border-box;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 11px; font-weight: 700; color: #0369a1; margin-bottom: 4px;">Nhân Sự Báo Cáo</label>
                                    <input id="formEmpReport" type="text" value="${item ? (item.employee_report || '') : ''}" placeholder="Báo cáo kết quả từ nhân sự..." style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #38bdf8; font-size: 12px; box-sizing: border-box;">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer Actions -->
                    <div style="padding: 16px 24px; background: #f8fafc; border-radius: 0 0 18px 18px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px;">
                        <button onclick="window._eeCloseModal()" style="padding: 9px 18px; background: #e2e8f0; color: #475569; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">Hủy</button>
                        <button onclick="window._eeSaveForm(${item ? item.id : 'null'})" style="padding: 9px 24px; background: #1e40af; color: white; border: none; border-radius: 8px; font-weight: 800; cursor: pointer; box-shadow: 0 2px 8px rgba(30,64,175,0.3);">Lưu Đánh Giá</button>
                    </div>
                </div>
            </div>
        `;
    };

    window._eeOnUserSelect = function(sel) {
        var opt = sel.options[sel.selectedIndex];
        if (!opt || !opt.value) return;
        var name = opt.getAttribute('data-name');
        var dept = opt.getAttribute('data-dept');
        var empNameInp = document.getElementById('formEmpName');
        var deptSel = document.getElementById('formDepartment');

        if (name && empNameInp) empNameInp.value = name;
        if (dept && deptSel) {
            for (var i = 0; i < deptSel.options.length; i++) {
                if (deptSel.options[i].value.toLowerCase() === dept.toLowerCase()) {
                    deptSel.selectedIndex = i;
                    break;
                }
            }
        }
    };

    window._eeCloseModal = function() {
        var container = document.getElementById('eeModalContainer');
        if (container) container.innerHTML = '';
    };

    window._eeSaveForm = async function(editId) {
        var monthYear = document.getElementById('formMonthYear').value.trim();
        var empName = document.getElementById('formEmpName').value.trim();
        var dept = document.getElementById('formDepartment').value;
        var userSelect = document.getElementById('formUserSelect');
        var userId = userSelect ? userSelect.value : null;

        if (!empName) {
            showToast('⚠️ Vui lòng nhập tên nhân sự', 'warning');
            return;
        }

        var body = {
            month_year: monthYear || _eeState.monthYear,
            user_id: userId || null,
            employee_name: empName,
            department: dept,
            improvement_errors: document.getElementById('formImprovementErrors').value.trim(),
            manager_evaluation: document.getElementById('formManagerEval').value.trim(),
            remediation_action: document.getElementById('formRemediation').value.trim(),
            training_direction: document.getElementById('formTraining').value.trim(),
            manager_commitment: document.getElementById('formManagerCommit').value.trim(),
            employee_opinion: document.getElementById('formEmpOpinion').value.trim(),
            resolution_deadline: document.getElementById('formResolutionDeadline').value,
            employee_commitment: document.getElementById('formEmpCommitment').value.trim(),
            manager_report: document.getElementById('formManagerReport').value.trim(),
            employee_report: document.getElementById('formEmpReport').value.trim()
        };

        try {
            if (editId) {
                await apiCall('/api/employee-evaluations/' + editId, 'PUT', body);
                showToast('✅ Đã cập nhật đánh giá nhân sự!', 'success');
            } else {
                await apiCall('/api/employee-evaluations', 'POST', body);
                showToast('✅ Đã thêm đánh giá nhân sự mới!', 'success');
            }
            window._eeCloseModal();
            _eeLoadData();
        } catch(err) {
            console.error('Error saving evaluation:', err);
            showToast('❌ Có lỗi khi lưu dữ liệu đánh giá', 'error');
        }
    };

    // Quick Report Modal
    window._eeOpenReportModal = function(id) {
        var item = _eeState.items.find(i => i.id === id);
        if (!item) return;

        var modalContainer = document.getElementById('eeModalContainer');
        if (!modalContainer) return;

        modalContainer.innerHTML = `
            <div style="position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
                <div style="background: white; border-radius: 18px; width: 100%; max-width: 550px; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
                    <div style="padding: 18px 24px; background: linear-gradient(135deg, #0284c7, #0369a1); border-radius: 18px 18px 0 0; color: white; display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; font-size: 16px; font-weight: 800;">📊 Cập Nhật Báo Cáo — ${item.employee_name}</h3>
                        <button onclick="window._eeCloseModal()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 30px; height: 30px; border-radius: 8px; cursor: pointer;">✕</button>
                    </div>

                    <div style="padding: 24px; display: flex; flex-direction: column; gap: 16px;">
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 700; color: #0369a1; margin-bottom: 6px;">👨‍💼 Quản Lý Báo Cáo (Xử lý như thế nào?)</label>
                            <textarea id="rptManagerReport" rows="3" placeholder="Ghi nhận báo cáo từ Quản lý..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; box-sizing: border-box;">${item.manager_report || ''}</textarea>
                        </div>

                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 700; color: #0369a1; margin-bottom: 6px;">👷 Nhân Sự Báo Cáo</label>
                            <textarea id="rptEmpReport" rows="3" placeholder="Ghi nhận báo cáo từ Nhân sự..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; box-sizing: border-box;">${item.employee_report || ''}</textarea>
                        </div>
                    </div>

                    <div style="padding: 16px 24px; background: #f8fafc; border-radius: 0 0 18px 18px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
                        <button onclick="window._eeCloseModal()" style="padding: 8px 16px; background: #e2e8f0; color: #475569; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">Hủy</button>
                        <button onclick="window._eeSaveReport(${item.id})" style="padding: 8px 20px; background: #0284c7; color: white; border: none; border-radius: 8px; font-weight: 800; cursor: pointer;">Lưu Báo Cáo</button>
                    </div>
                </div>
            </div>
        `;
    };

    window._eeSaveReport = async function(id) {
        var mReport = document.getElementById('rptManagerReport').value.trim();
        var eReport = document.getElementById('rptEmpReport').value.trim();

        try {
            await apiCall('/api/employee-evaluations/' + id, 'PUT', {
                manager_report: mReport,
                employee_report: eReport
            });
            showToast('✅ Đã cập nhật báo cáo!', 'success');
            window._eeCloseModal();
            _eeLoadData();
        } catch(err) {
            console.error('Error saving report:', err);
            showToast('❌ Có lỗi khi lưu báo cáo', 'error');
        }
    };

    // Delete Item
    window._eeDelete = async function(id) {
        if (!confirm('Bạn có chắc chắn muốn xóa bản đánh giá nhân sự này?')) return;
        try {
            await apiCall('/api/employee-evaluations/' + id, 'DELETE');
            showToast('🗑️ Đã xóa bản đánh giá!', 'success');
            _eeLoadData();
        } catch(err) {
            console.error('Error deleting evaluation:', err);
            showToast('❌ Không thể xóa bản đánh giá', 'error');
        }
    };

    // Export to Excel
    window._eeExportExcel = function() {
        if (typeof XLSX === 'undefined') {
            showToast('⚠️ Thư viện Excel đang tải, vui lòng thử lại sau 2 giây', 'warning');
            return;
        }

        var data = _eeState.items.map(function(item, idx) {
            return {
                'Tháng': item.month_year || '',
                'STT': idx + 1,
                'Họ Tên': item.employee_name || '',
                'Bộ Phận': item.department || '',
                'Cải Thiện / Lỗi': item.improvement_errors || '',
                'Đánh Giá Năng Lực NV Quản Lý': item.manager_evaluation || '',
                'Nhân Sự Khắc Phục': item.remediation_action || '',
                'Hướng Đào Tạo': item.training_direction || '',
                'Cam Kết Của Quản Lý': item.manager_commitment || '',
                'Ý Kiến Của Nhân Sự': item.employee_opinion || '',
                'Time Xử Lý Của Nhân Sự': item.resolution_deadline || '',
                'Cam Kết Của Nhân Sự': item.employee_commitment || '',
                'Quản Lý Báo Cáo': item.manager_report || '',
                'Nhân Sự Báo Cáo': item.employee_report || ''
            };
        });

        var ws = XLSX.utils.json_to_sheet(data);
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Đánh Giá Nhân Sự");
        XLSX.writeFile(wb, "Danh_Gia_Nhan_Su_" + (_eeState.monthYear.replace(/[/ ]/g, '_')) + ".xlsx");
    };

    // Register globally
    window.renderDanhgianhansuPage = renderDanhgianhansuPage;
})();
