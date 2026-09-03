// ========== ĐÁNH GIÁ NHÂN SỰ — CUỘC HỌP CÔNG TY ==========
(function() {
    var _eeState = {
        filterYear: '2026',
        filterMonth: 'all',
        department: 'all',
        employeeName: 'all',
        status: 'all',
        statFilter: 'all', // 'all' | 'pending_employee' | 'pending_progress' | 'completed_progress'
        search: '',
        viewMode: 'compact', // 'compact' | 'cards' | 'excel'
        items: [],
        stats: { total: 0, pending_employee: 0, pending_progress: 0, completed_progress: 0 },
        users: []
    };

    var DEPARTMENTS = ['Kinh Doanh', 'Sale', 'Marketing', 'Sản Xuất', 'Văn Phòng', 'Thiết Kế', 'May', 'Cắt', 'In', 'Ép', 'Hoàn Thiện', 'Kho', 'Khác'];

    function _getDeptBadgeHtml(deptName) {
        if (!deptName || deptName === '--') {
            return '<span style="display: inline-block; padding: 2px 7px; border-radius: 5px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; font-weight: 800; font-size: 11px;">--</span>';
        }
        var d = deptName.trim();
        var bg = '#f1f5f9', color = '#334155', border = '#cbd5e1';

        if (d === 'Kinh Doanh') { bg = '#dbeafe'; color = '#1e40af'; border = '#bfdbfe'; }
        else if (d === 'Sale') { bg = '#e0e7ff'; color = '#3730a3'; border = '#c7d2fe'; }
        else if (d === 'Marketing') { bg = '#fae8ff'; color = '#86198f'; border = '#f5d0fe'; }
        else if (d === 'Sản Xuất') { bg = '#fef3c7'; color = '#92400e'; border = '#fde68a'; }
        else if (d === 'Văn Phòng') { bg = '#e0f2fe'; color = '#075985'; border = '#bae6fd'; }
        else if (d === 'Thiết Kế') { bg = '#f3e8ff'; color = '#6b21a8'; border = '#e9d5ff'; }
        else if (d === 'May') { bg = '#dcfce7'; color = '#166534'; border = '#bbf7d0'; }
        else if (d === 'Cắt') { bg = '#ffedd5'; color = '#9a3412'; border = '#fed7aa'; }
        else if (d === 'In') { bg = '#ccfbf1'; color = '#115e59'; border = '#99f6e4'; }
        else if (d === 'Ép') { bg = '#fee2e2'; color = '#991b1b'; border = '#fca5a5'; }
        else if (d === 'Hoàn Thiện') { bg = '#ecfdf5'; color = '#065f46'; border = '#a7f3d0'; }
        else if (d === 'Kho') { bg = '#f1f5f9'; color = '#1e293b'; border = '#cbd5e1'; }
        else { bg = '#f3f4f6'; color = '#374151'; border = '#d1d5db'; }

        return `<span style="display: inline-block; padding: 3px 8px; border-radius: 6px; background: ${bg}; color: ${color}; border: 1px solid ${border}; font-weight: 800; font-size: 11px; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">${d}</span>`;
    }

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
                <div id="eeStatsContainer" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 18px;">
                    <!-- Injected by JS -->
                </div>

                <!-- Filter Controls & View Mode Toggle Bar -->
                <div style="background: white; border-radius: 12px; padding: 12px 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.04); margin-bottom: 16px; border: 1px solid #e2e8f0; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between;">
                    <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
                        <!-- Select Year -->
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <label style="font-size: 12px; font-weight: 700; color: #475569;">📅 Năm:</label>
                            <select id="eeFilterYear" onchange="window._eeOnFilterChange()" style="padding: 7px 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; font-weight: 600; background: #f8fafc; outline: none;">
                                <option value="2026">2026</option>
                                <option value="2025">2025</option>
                                <option value="2024">2024</option>
                                <option value="all">Tất Cả Năm</option>
                            </select>
                        </div>

                        <!-- Select Month -->
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <label style="font-size: 12px; font-weight: 700; color: #475569;">📅 Tháng:</label>
                            <select id="eeFilterMonthNum" onchange="window._eeOnFilterChange()" style="padding: 7px 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; font-weight: 600; background: #f8fafc; outline: none;">
                                <option value="all">Tất Cả Tháng</option>
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
                        </div>

                        <!-- Department Filter -->
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <label style="font-size: 12px; font-weight: 700; color: #475569;">🏢 Bộ phận:</label>
                            <select id="eeFilterDept" onchange="window._eeOnFilterChange()" style="padding: 7px 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; font-weight: 600; background: #f8fafc; outline: none;">
                                <option value="all">Tất Cả Bộ Phận</option>
                            </select>
                        </div>

                        <!-- Employee Name Filter -->
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <label style="font-size: 12px; font-weight: 700; color: #475569;">👤 Nhân sự:</label>
                            <select id="eeFilterEmployee" onchange="window._eeOnFilterChange()" style="padding: 7px 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; font-weight: 600; background: #f8fafc; outline: none; max-width: 180px;">
                                <option value="all">Tất Cả Nhân Sự</option>
                            </select>
                        </div>
                        
                        <!-- Active Stat Filter Indicator -->
                        <div id="eeActiveStatFilterTag" style="display: none; align-items: center; gap: 6px; background: #eff6ff; color: #1d4ed8; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; border: 1px solid #bfdbfe;">
                            <span id="eeActiveStatFilterText">Đang lọc</span>
                            <button onclick="window._eeSelectStatFilter('all')" style="border: none; background: transparent; color: #1d4ed8; font-weight: 900; cursor: pointer; font-size: 12px; line-height: 1;">✕</button>
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

        // Set initial dropdown values
        var filterYearEl = document.getElementById('eeFilterYear');
        var filterMonthEl = document.getElementById('eeFilterMonthNum');
        if (filterYearEl) filterYearEl.value = _eeState.filterYear;
        if (filterMonthEl) filterMonthEl.value = _eeState.filterMonth;

        // Fetch users for form dropdown
        try {
            var uRes = await apiCall('/api/users/dropdown');
            _eeState.users = (uRes && uRes.users) ? uRes.users : [];
        } catch(e) {
            console.warn('Could not fetch users list:', e);
        }

        // Fetch evaluated metadata (employees & departments & years) for filter dropdowns
        await _eeLoadEvaluatedMetadata();
        await _eeLoadData();
    }

    async function _eeLoadEvaluatedMetadata() {
        try {
            var res = await apiCall('/api/employee-evaluations?month_year=all');
            if (res && res.items) {
                var empSet = new Set();
                var deptSet = new Set();
                var yearSet = new Set(['2026', '2025', '2024']);
                res.items.forEach(function(i) {
                    if (i.employee_name && i.employee_name.trim()) empSet.add(i.employee_name.trim());
                    if (i.department && i.department.trim()) deptSet.add(i.department.trim());
                    if (i.month_year) {
                        var parts = i.month_year.split('/');
                        if (parts.length === 2 && parts[1]) yearSet.add(parts[1].trim());
                    }
                });
                _eeState.evaluatedEmployees = Array.from(empSet).sort();
                _eeState.evaluatedDepartments = Array.from(deptSet).sort();
                _eeState.evaluatedYears = Array.from(yearSet).sort().reverse();
            }
        } catch(e) {
            console.warn('Could not fetch evaluated metadata:', e);
        }
    }

    async function _eeLoadData() {
        try {
            var params = new URLSearchParams();
            if (_eeState.filterYear) params.append('year', _eeState.filterYear);
            if (_eeState.filterMonth) params.append('month', _eeState.filterMonth);
            params.append('department', _eeState.department);
            if (_eeState.employeeName && _eeState.employeeName !== 'all') {
                params.append('employee_name', _eeState.employeeName);
            }
            params.append('status', _eeState.status);
            if (_eeState.statFilter && _eeState.statFilter !== 'all') {
                params.append('stat_filter', _eeState.statFilter);
            }
            if (_eeState.search) params.append('search', _eeState.search);

            var res = await apiCall('/api/employee-evaluations?' + params.toString());
            _eeState.items = (res && res.items) ? res.items : [];

            var statsRes = await apiCall('/api/employee-evaluations/stats?year=' + encodeURIComponent(_eeState.filterYear) + '&month=' + encodeURIComponent(_eeState.filterMonth));
            if (statsRes && statsRes.stats) {
                _eeState.stats = statsRes.stats;
            }

            _eePopulateYearDropdown();
            _eePopulateDepartmentDropdown();
            _eePopulateEmployeeDropdown();
            _eeRenderStats();
            _eeRenderCurrentView();
        } catch(err) {
            console.error('Error loading employee evaluation data:', err);
            showToast('⚠️ Không thể tải dữ liệu đánh giá nhân sự', 'error');
        }
    }

    function _eePopulateYearDropdown() {
        var selectEl = document.getElementById('eeFilterYear');
        if (!selectEl) return;

        var currentVal = _eeState.filterYear || '2026';
        var html = '<option value="all">Tất Cả Năm</option>';

        var years = _eeState.evaluatedYears || ['2026', '2025', '2024'];
        years.forEach(function(y) {
            var selected = (y === currentVal) ? 'selected' : '';
            html += `<option value="${y}" ${selected}>${y}</option>`;
        });

        selectEl.innerHTML = html;
    }

    function _eePopulateDepartmentDropdown() {
        var selectEl = document.getElementById('eeFilterDept');
        if (!selectEl) return;

        var currentVal = _eeState.department || 'all';
        var html = '<option value="all">Tất Cả Bộ Phận</option>';

        var deptsSet = new Set(_eeState.evaluatedDepartments || []);
        (_eeState.items || []).forEach(function(i) {
            if (i.department && i.department.trim()) {
                deptsSet.add(i.department.trim());
            }
        });

        Array.from(deptsSet).sort().forEach(function(d) {
            var selected = (d === currentVal) ? 'selected' : '';
            html += `<option value="${d}" ${selected}>${d}</option>`;
        });

        selectEl.innerHTML = html;
    }

    function _eePopulateEmployeeDropdown() {
        var selectEl = document.getElementById('eeFilterEmployee');
        if (!selectEl) return;

        var currentVal = _eeState.employeeName || 'all';
        var html = '<option value="all">Tất Cả Nhân Sự</option>';

        var namesSet = new Set(_eeState.evaluatedEmployees || []);
        (_eeState.items || []).forEach(function(i) {
            if (i.employee_name && i.employee_name.trim()) {
                namesSet.add(i.employee_name.trim());
            }
        });

        Array.from(namesSet).sort().forEach(function(n) {
            var selected = (n === currentVal) ? 'selected' : '';
            html += `<option value="${n}" ${selected}>${n}</option>`;
        });

        selectEl.innerHTML = html;
    }

    window._eeSelectStatFilter = function(filter) {
        if (_eeState.statFilter === filter && filter !== 'all') {
            _eeState.statFilter = 'all'; // Toggle back to all if clicked again
        } else {
            _eeState.statFilter = filter;
        }
        _eeLoadData();
    };

    function _eeRenderStats() {
        var container = document.getElementById('eeStatsContainer');
        if (!container) return;
        var s = _eeState.stats || {};
        var sf = _eeState.statFilter;

        var activeTag = document.getElementById('eeActiveStatFilterTag');
        var activeText = document.getElementById('eeActiveStatFilterText');
        if (activeTag && activeText) {
            if (sf === 'pending_employee') {
                activeTag.style.display = 'inline-flex';
                activeText.innerText = '🔍 Đang lọc: Chưa xử lý ý kiến & cam kết NS';
            } else if (sf === 'pending_progress') {
                activeTag.style.display = 'inline-flex';
                activeText.innerText = '🔍 Đang lọc: Chưa hoàn thành báo cáo tiến độ';
            } else if (sf === 'completed_progress') {
                activeTag.style.display = 'inline-flex';
                activeText.innerText = '🔍 Đang lọc: Đã hoàn thành báo cáo tiến độ';
            } else {
                activeTag.style.display = 'none';
            }
        }

        container.innerHTML = `
            <!-- Card 1 -->
            <div onclick="window._eeSelectStatFilter('all')" title="Click để xem tất cả phiếu đánh giá" style="background: white; border-radius: 12px; padding: 14px 16px; border: ${sf === 'all' ? '2px solid #1e3a8a' : '1px solid #e2e8f0'}; box-shadow: ${sf === 'all' ? '0 4px 14px rgba(30,58,138,0.15)' : '0 2px 8px rgba(0,0,0,0.03)'}; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                <div style="width: 42px; height: 42px; border-radius: 10px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 20px; shrink: 0;">👨‍💼</div>
                <div>
                    <div style="font-size: 11px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; line-height: 1.25;">👨‍💼 TỔNG ĐÁNH GIÁ QUẢN LÝ</div>
                    <div style="font-size: 22px; font-weight: 900; color: #0f172a; margin-top: 2px;">${s.total || 0}</div>
                </div>
            </div>

            <!-- Card 2 -->
            <div onclick="window._eeSelectStatFilter('pending_employee')" title="Click để xem các phiếu nhân sự chưa xử lý" style="background: ${sf === 'pending_employee' ? '#fff1f2' : 'white'}; border-radius: 12px; padding: 14px 16px; border: ${sf === 'pending_employee' ? '2px solid #be185d' : '1px solid #fbcfe8'}; box-shadow: ${sf === 'pending_employee' ? '0 4px 14px rgba(190,24,93,0.2)' : '0 2px 8px rgba(219,39,119,0.06)'}; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                <div style="width: 42px; height: 42px; border-radius: 10px; background: #fdf2f8; color: #be185d; display: flex; align-items: center; justify-content: center; font-size: 20px; shrink: 0;">🔴</div>
                <div>
                    <div style="font-size: 11px; font-weight: 800; color: #be185d; text-transform: uppercase; line-height: 1.25;">🔴 CHƯA XỬ LÝ<br><span style="font-size: 10px; color: #9d174d;">💬 Ý KIẾN & CAM KẾT NHÂN SỰ</span></div>
                    <div style="font-size: 22px; font-weight: 900; color: #dc2626; margin-top: 2px;">${s.pending_employee || 0}</div>
                </div>
            </div>

            <!-- Card 3 -->
            <div onclick="window._eeSelectStatFilter('pending_progress')" title="Click để xem các phiếu chưa hoàn thành tiến độ" style="background: ${sf === 'pending_progress' ? '#fffbeb' : 'white'}; border-radius: 12px; padding: 14px 16px; border: ${sf === 'pending_progress' ? '2px solid #d97706' : '1px solid #fef3c7'}; box-shadow: ${sf === 'pending_progress' ? '0 4px 14px rgba(217,119,6,0.2)' : '0 2px 8px rgba(245,158,11,0.06)'}; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                <div style="width: 42px; height: 42px; border-radius: 10px; background: #fef3c7; color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 20px; shrink: 0;">🟡</div>
                <div>
                    <div style="font-size: 11px; font-weight: 800; color: #92400e; text-transform: uppercase; line-height: 1.25;">🟡 CHƯA HOÀN THÀNH<br><span style="font-size: 10px; color: #b45309;">📊 BÁO CÁO TIẾN ĐỘ</span></div>
                    <div style="font-size: 22px; font-weight: 900; color: #d97706; margin-top: 2px;">${s.pending_progress || 0}</div>
                </div>
            </div>

            <!-- Card 4 -->
            <div onclick="window._eeSelectStatFilter('completed_progress')" title="Click để xem các phiếu đã hoàn thành tiến độ" style="background: ${sf === 'completed_progress' ? '#ecfdf5' : 'white'}; border-radius: 12px; padding: 14px 16px; border: ${sf === 'completed_progress' ? '2px solid #059669' : '1px solid #d1fae5'}; box-shadow: ${sf === 'completed_progress' ? '0 4px 14px rgba(5,150,105,0.2)' : '0 2px 8px rgba(16,185,129,0.06)'}; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                <div style="width: 42px; height: 42px; border-radius: 10px; background: #d1fae5; color: #059669; display: flex; align-items: center; justify-content: center; font-size: 20px; shrink: 0;">🟢</div>
                <div>
                    <div style="font-size: 11px; font-weight: 800; color: #065f46; text-transform: uppercase; line-height: 1.25;">🟢 HOÀN THÀNH<br><span style="font-size: 10px; color: #047857;">📊 BÁO CÁO TIẾN ĐỘ</span></div>
                    <div style="font-size: 22px; font-weight: 900; color: #059669; margin-top: 2px;">${s.completed_progress || 0}</div>
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

    // 📋 VIEW MODE 1: COMPACT FIT TABLE WITH READABLE 12PX FONT
    function _eeRenderCompactTableView(container) {
        var html = `
            <div style="background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; overflow-x: auto; width: 100%;">
                <table style="width: 100%; min-width: 1350px; border-collapse: collapse; text-align: left; font-size: 12px; table-layout: fixed;">
                    <thead>
                        <!-- Row 1: Category Groups -->
                        <tr style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px; font-weight: 900; color: white;">
                            <th rowspan="2" style="padding: 10px 4px; background: #1e3a8a; width: 3.5%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.2);">Kỳ</th>
                            <th rowspan="2" style="padding: 10px 4px; background: #1e3a8a; width: 2.5%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.2);">STT</th>
                            <th rowspan="2" style="padding: 10px 6px; background: #1e3a8a; width: 7.5%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="Họ Tên">Họ Tên</th>
                            <th rowspan="2" style="padding: 10px 4px; background: #1e3a8a; width: 6%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="Bộ Phận">Bộ Phận</th>
                            
                            <!-- Group 1: Manager Eval -->
                            <th colspan="5" style="padding: 8px 6px; background: #1e3a8a; text-align: center; vertical-align: middle; border-bottom: 1px solid rgba(255,255,255,0.2); border-right: 1px solid rgba(255,255,255,0.2);">👨‍💼 ĐÁNH GIÁ TỪ QUẢN LÝ</th>
                            
                            <!-- Group 2: Employee Opinion -->
                            <th colspan="3" style="padding: 8px 6px; background: #be185d; text-align: center; vertical-align: middle; border-bottom: 1px solid rgba(255,255,255,0.2); border-right: 1px solid rgba(255,255,255,0.2);">💬 Ý KIẾN & CAM KẾT NHÂN SỰ</th>
                            
                            <!-- Group 3: Progress Report -->
                            <th colspan="2" style="padding: 8px 6px; background: #0369a1; text-align: center; vertical-align: middle; border-bottom: 1px solid rgba(255,255,255,0.2); border-right: 1px solid rgba(255,255,255,0.2);">📊 BÁO CÁO TIẾN ĐỘ</th>
                            
                            <th rowspan="2" style="padding: 10px 4px; background: #334155; width: 6%; text-align: center; vertical-align: middle;">Thao Tác</th>
                        </tr>
                        <!-- Row 2: Sub-headers centered with Multiline Linebreaks -->
                        <tr style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: white; text-align: center; vertical-align: middle;">
                            <th style="padding: 8px 4px; background: #1d4ed8; width: 8.5%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Cải Thiện<br>/ Lỗi</th>
                            <th style="padding: 8px 4px; background: #1d4ed8; width: 10.5%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Đánh Giá<br>Quản Lý</th>
                            <th style="padding: 8px 4px; background: #1d4ed8; width: 9%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Nội Dung<br>Khắc Phục</th>
                            <th style="padding: 8px 4px; background: #1d4ed8; width: 8.5%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Hướng<br>Đào Tạo</th>
                            <th style="padding: 8px 4px; background: #1d4ed8; width: 8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Quản Lý<br>Cam Kết</th>
                            
                            <th style="padding: 8px 4px; background: #db2777; width: 8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Ý Kiến<br>Nhân Sự</th>
                            <th style="padding: 8px 4px; background: #db2777; width: 5.5%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Hạn<br>Xử Lý</th>
                            <th style="padding: 8px 4px; background: #db2777; width: 8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Nhân Sự<br>Cam Kết</th>
                            
                            <th style="padding: 8px 4px; background: #0284c7; width: 8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Quản Lý<br>Báo Cáo</th>
                            <th style="padding: 8px 4px; background: #0284c7; width: 8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Nhân Sự<br>Báo Cáo</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        _eeState.items.forEach(function(item, idx) {
            var monthShort = item.month_year ? item.month_year.replace('Tháng ', 'T') : '--';

            html += `
                <tr style="border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.15s;" onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='white'" onclick="window._eeOpenDetailModal(${item.id})">
                    <td style="padding: 8px 4px; text-align: center; font-weight: 700; color: #1e40af; background: #f0f9ff; border-right: 1px solid #e2e8f0; font-size: 11.5px;">${monthShort}</td>
                    <td style="padding: 8px 4px; text-align: center; font-weight: 700; color: #64748b; border-right: 1px solid #e2e8f0; font-size: 11.5px;">${idx + 1}</td>
                    <td style="padding: 8px 6px; font-weight: 800; color: #0f172a; border-right: 1px solid #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px;" title="${item.employee_name}">${item.employee_name || '--'}</td>
                    <td style="padding: 8px 4px; border-right: 1px solid #e2e8f0; text-align: center;" title="${item.department}">${_getDeptBadgeHtml(item.department)}</td>
                    
                    <td style="padding: 8px 6px; border-right: 1px solid #e2e8f0; color: #dc2626; font-weight: 600; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.improvement_errors}">${_clampText(item.improvement_errors)}</td>
                    <td style="padding: 8px 6px; border-right: 1px solid #e2e8f0; color: #334155; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.manager_evaluation}">${_clampText(item.manager_evaluation)}</td>
                    <td style="padding: 8px 6px; border-right: 1px solid #e2e8f0; color: #2563eb; font-weight: 600; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.remediation_action}">${_clampText(item.remediation_action)}</td>
                    <td style="padding: 8px 6px; border-right: 1px solid #e2e8f0; color: #7c3aed; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.training_direction}">${_clampText(item.training_direction)}</td>
                    <td style="padding: 8px 6px; border-right: 1px solid #e2e8f0; color: #059669; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.manager_commitment}">${_clampText(item.manager_commitment)}</td>
                    
                    <!-- Pink Section: Employee Input -->
                    <td style="padding: 8px 6px; background: #fdf2f8; border-right: 1px solid #fbcfe8; color: #be185d; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.employee_opinion}">${_clampText(item.employee_opinion)}</td>
                    <td style="padding: 8px 4px; background: #fdf2f8; border-right: 1px solid #fbcfe8; font-weight: 700; color: #9d174d; font-size: 11.5px; text-align: center;" title="${item.resolution_deadline}">${item.resolution_deadline || '--'}</td>
                    <td style="padding: 8px 6px; background: #fdf2f8; border-right: 1px solid #fbcfe8; color: #be185d; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.employee_commitment}">${_clampText(item.employee_commitment)}</td>
                    
                    <!-- Teal Section: Progress Report -->
                    <td style="padding: 8px 6px; background: #f0f9ff; border-right: 1px solid #bae6fd; color: #0369a1; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.manager_report}">${_clampText(item.manager_report)}</td>
                    <td style="padding: 8px 6px; background: #f0f9ff; border-right: 1px solid #bae6fd; color: #0369a1; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.employee_report}">${_clampText(item.employee_report)}</td>
                    
                    <!-- Actions -->
                    <td style="padding: 8px 4px; text-align: center;" onclick="event.stopPropagation()">
                        <div style="display: flex; gap: 4px; justify-content: center;">
                            <button onclick="window._eeOpenDetailModal(${item.id})" title="Xem Chi Tiết" style="padding: 3px 6px; background: #e0e7ff; color: #4338ca; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">👁️</button>
                            <button onclick="window._eeOpenFormModal(${item.id})" title="Chỉnh Sửa" style="padding: 3px 6px; background: #f1f5f9; color: #475569; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">✏️</button>
                            <button onclick="window._eeDelete(${item.id})" title="Xóa" style="padding: 3px 6px; background: #fee2e2; color: #dc2626; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">🗑️</button>
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
                                ${_getDeptBadgeHtml(item.department)}
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
                        <div style="background: #f8fafc; padding: 12px; border-radius: 10px; border-left: 4px solid #1e40af;">
                            <div style="font-size: 11px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin-bottom: 6px;">👨‍💼 Đánh Giá Từ Quản Lý</div>
                            <div style="font-size: 12px; color: #dc2626; font-weight: 700; margin-bottom: 4px; white-space: pre-wrap;">⚠️ Cải thiện / Lỗi: <span style="font-weight: 500; color: #334155;">${item.improvement_errors || '--'}</span></div>
                            <div style="font-size: 12px; color: #334155; margin-bottom: 4px; white-space: pre-wrap;">📊 Đánh giá năng lực: <span>${item.manager_evaluation || '--'}</span></div>
                            <div style="font-size: 12px; color: #2563eb; font-weight: 700; margin-bottom: 4px; white-space: pre-wrap;">🛠️ Khắc phục: <span style="font-weight: 500; color: #334155;">${item.remediation_action || '--'}</span></div>
                            <div style="font-size: 12px; color: #7c3aed; font-weight: 700; margin-bottom: 4px; white-space: pre-wrap;">🎓 Hướng đào tạo: <span style="font-weight: 500; color: #334155;">${item.training_direction || '--'}</span></div>
                            <div style="font-size: 12px; color: #059669; font-weight: 700; white-space: pre-wrap;">🤝 Cam kết QL: <span style="font-weight: 500; color: #334155;">${item.manager_commitment || '--'}</span></div>
                        </div>

                        <!-- Employee Section -->
                        <div style="background: #fdf2f8; padding: 12px; border-radius: 10px; border-left: 4px solid #db2777;">
                            <div style="font-size: 11px; font-weight: 800; color: #be185d; text-transform: uppercase; margin-bottom: 6px;">💬 Ý Kiến & Cam Kết Nhân Sự</div>
                            <div style="font-size: 12px; color: #be185d; margin-bottom: 4px; white-space: pre-wrap;">Ý kiến: <span style="color: #334155;">${item.employee_opinion || '--'}</span></div>
                            <div style="font-size: 12px; color: #be185d; margin-bottom: 4px;">⏰ Hạn xử lý: <span style="font-weight: 800; color: #9d174d;">${item.resolution_deadline || '--'}</span></div>
                            <div style="font-size: 12px; color: #be185d; white-space: pre-wrap;">Cam kết: <span style="color: #334155;">${item.employee_commitment || '--'}</span></div>
                        </div>

                        <!-- Progress Report Section -->
                        <div style="background: #f0f9ff; padding: 12px; border-radius: 10px; border-left: 4px solid #0284c7;">
                            <div style="font-size: 11px; font-weight: 800; color: #0369a1; text-transform: uppercase; margin-bottom: 6px;">📊 Báo Cáo Tiến Độ</div>
                            <div style="font-size: 12px; color: #0369a1; margin-bottom: 4px; white-space: pre-wrap;">Quản lý báo cáo: <span style="color: #334155;">${item.manager_report || '--'}</span></div>
                            <div style="font-size: 12px; color: #0369a1; white-space: pre-wrap;">Nhân sự báo cáo: <span style="color: #334155;">${item.employee_report || '--'}</span></div>
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
                                <div style="white-space: pre-wrap;"><strong style="color: #dc2626;">Cải thiện / Lỗi:</strong> ${item.improvement_errors || '--'}</div>
                                <div style="white-space: pre-wrap;"><strong style="color: #334155;">Đánh giá năng lực:</strong> ${item.manager_evaluation || '--'}</div>
                                <div style="white-space: pre-wrap;"><strong style="color: #2563eb;">Nhân sự khắc phục:</strong> ${item.remediation_action || '--'}</div>
                                <div style="white-space: pre-wrap;"><strong style="color: #7c3aed;">Hướng đào tạo:</strong> ${item.training_direction || '--'}</div>
                                <div style="grid-column: span 2; white-space: pre-wrap;"><strong style="color: #059669;">Cam kết của Quản lý:</strong> ${item.manager_commitment || '--'}</div>
                            </div>
                        </div>

                        <div style="background: #fdf2f8; padding: 16px; border-radius: 12px; border: 1px solid #fbcfe8;">
                            <h4 style="margin: 0 0 10px 0; color: #be185d; font-size: 14px; font-weight: 800;">💬 2. Ý KIẾN & CAM KẾT TỪ NHÂN SỰ</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
                                <div style="white-space: pre-wrap;"><strong style="color: #be185d;">Ý kiến nhân sự:</strong> ${item.employee_opinion || '--'}</div>
                                <div><strong style="color: #9d174d;">Hạn xử lý (Time):</strong> ${item.resolution_deadline || '--'}</div>
                                <div style="grid-column: span 2; white-space: pre-wrap;"><strong style="color: #be185d;">Cam kết nhân sự:</strong> ${item.employee_commitment || '--'}</div>
                            </div>
                        </div>

                        <div style="background: #f0f9ff; padding: 16px; border-radius: 12px; border: 1px solid #bae6fd;">
                            <h4 style="margin: 0 0 10px 0; color: #0284c7; font-size: 14px; font-weight: 800;">📊 3. BÁO CÁO TIẾN ĐỘ THỰC HIỆN</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
                                <div style="white-space: pre-wrap;"><strong style="color: #0369a1;">Quản lý báo cáo:</strong> ${item.manager_report || '--'}</div>
                                <div style="white-space: pre-wrap;"><strong style="color: #0369a1;">Nhân sự báo cáo:</strong> ${item.employee_report || '--'}</div>
                            </div>
                        </div>
                    </div>��:</strong> ${item.employee_commitment || '--'}</div>
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
        var y = document.getElementById('eeFilterYear');
        var m = document.getElementById('eeFilterMonthNum');
        var d = document.getElementById('eeFilterDept');
        var e = document.getElementById('eeFilterEmployee');
        if (y) _eeState.filterYear = y.value;
        if (m) _eeState.filterMonth = m.value;
        if (d) _eeState.department = d.value;
        if (e) _eeState.employeeName = e.value;
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

    // Modal Form (Add / Edit 3-Section Sequential Flow)
    window._eeOpenFormModal = function(editId) {
        var item = editId ? _eeState.items.find(i => i.id === editId) : null;
        var modalContainer = document.getElementById('eeModalContainer');
        if (!modalContainer) return;

        var userOptions = _eeState.users.map(u => `<option value="${u.id}" data-name="${u.full_name || u.name}" data-dept="${u.department || u.team_name || ''}">${u.full_name || u.username}</option>`).join('');
        var defaultMY = 'Tháng ' + (new Date().getMonth() + 1) + '/' + new Date().getFullYear();
        if (_eeState.filterYear && _eeState.filterYear !== 'all') {
            var mStr = (_eeState.filterMonth && _eeState.filterMonth !== 'all') ? _eeState.filterMonth : (new Date().getMonth() + 1);
            defaultMY = 'Tháng ' + mStr + '/' + _eeState.filterYear;
        }

        modalContainer.innerHTML = `
            <div style="position: fixed; inset: 0; background: rgba(15,23,42,0.65); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
                <div style="background: white; border-radius: 20px; width: 100%; max-width: 920px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                    <!-- Header -->
                    <div style="padding: 18px 24px; background: linear-gradient(135deg, #1e3a8a, #1e40af); border-radius: 20px 20px 0 0; color: white; display: flex; justify-content: space-between; align-items: center; sticky: top: 0; z-index: 10;">
                        <div>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                                <span>${item ? '✏️ Chỉnh Sửa' : '➕ Thêm'} Đánh Giá Nhân Sự</span>
                            </h3>
                            <div style="font-size: 11px; color: #93c5fd; margin-top: 2px;">Vui lòng nhập tuần tự từ Mục 1 đến Mục 3. Mục 1 là bắt buộc để lưu.</div>
                        </div>
                        <button onclick="window._eeCloseModal()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 8px; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;">✕</button>
                    </div>

                    <!-- Body Form with 3 Sequential Sections -->
                    <div style="padding: 24px; display: flex; flex-direction: column; gap: 20px;">
                        
                        <!-- 👨‍💼 MỤC 1: ĐÁNH GIÁ TỪ QUẢN LÝ -->
                        <div id="sec1Card" style="background: #f8fafc; padding: 18px; border-radius: 14px; border: 2px solid #1e40af;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                                <h4 style="margin: 0; font-size: 14px; font-weight: 800; color: #1e3a8a; display: flex; align-items: center; gap: 6px;">
                                    <span>👨‍💼 MỤC 1: ĐÁNH GIÁ TỪ QUẢN LÝ</span>
                                </h4>
                                <span style="font-size: 11px; font-weight: 800; background: #dbeafe; color: #1e40af; padding: 3px 10px; border-radius: 12px;">Bắt buộc hoàn thành Mục 1</span>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                                <div>
                                    <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">📅 Kỳ Đánh Giá (Tháng/Năm) <span style="color: #dc2626;">*</span></label>
                                    <input id="formMonthYear" type="text" value="${item ? (item.month_year || '') : defaultMY}" placeholder="Tháng 9/2026" style="width: 100%; padding: 9px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; box-sizing: border-box;" oninput="window._eeCheckSectionLocks()">
                                </div>

                                <div>
                                    <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">👤 Chọn Nhân Sự / Nhập Tên <span style="color: #dc2626;">*</span></label>
                                    <div style="display: flex; gap: 8px;">
                                        <select id="formUserSelect" onchange="window._eeOnUserSelect(this)" style="flex: 1; padding: 9px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px;">
                                            <option value="">-- Chọn từ danh sách --</option>
                                            ${userOptions}
                                        </select>
                                        <input id="formEmpName" type="text" value="${item ? (item.employee_name || '') : ''}" placeholder="Họ và Tên" style="flex: 1; padding: 9px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; box-sizing: border-box;" oninput="window._eeCheckSectionLocks()">
                                    </div>
                                </div>

                                <div>
                                    <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">🏢 Bộ Phận <span style="color: #dc2626;">*</span></label>
                                    <select id="formDepartment" style="width: 100%; padding: 9px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; box-sizing: border-box;" onchange="window._eeCheckSectionLocks()">
                                        ${DEPARTMENTS.map(d => `<option value="${d}" ${(item && item.department === d) ? 'selected' : ''}>${d}</option>`).join('')}
                                    </select>
                                </div>

                                <div>
                                    <label style="display: block; font-size: 12px; font-weight: 700; color: #dc2626; margin-bottom: 6px;">⚠️ Cải Thiện / Lỗi <span style="color: #dc2626;">*</span></label>
                                    <textarea id="formImprovementErrors" rows="2" placeholder="VD: Hay đi muộn, ẩu kích thước..." style="width: 100%; padding: 9px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; box-sizing: border-box; resize: vertical;" oninput="window._eeCheckSectionLocks()">${item ? (item.improvement_errors || '') : ''}</textarea>
                                </div>

                                <div style="grid-column: span 2;">
                                    <label style="display: block; font-size: 12px; font-weight: 700; color: #1e3a8a; margin-bottom: 6px;">📊 Đánh Giá Năng Lực NV Của Quản Lý</label>
                                    <textarea id="formManagerEval" rows="2" placeholder="Nội dung đánh giá từ quản lý..." style="width: 100%; padding: 9px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; box-sizing: border-box; resize: vertical;" oninput="window._eeCheckSectionLocks()">${item ? (item.manager_evaluation || '') : ''}</textarea>
                                </div>

                                <div>
                                    <label style="display: block; font-size: 12px; font-weight: 700; color: #2563eb; margin-bottom: 6px;">🛠️ Nội Dung Khắc Phục (Hành động)</label>
                                    <textarea id="formRemediation" rows="2" placeholder="Công việc cần làm để sửa..." style="width: 100%; padding: 9px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; box-sizing: border-box; resize: vertical;">${item ? (item.remediation_action || '') : ''}</textarea>
                                </div>

                                <div>
                                    <label style="display: block; font-size: 12px; font-weight: 700; color: #7c3aed; margin-bottom: 6px;">🎓 Hướng Đào Tạo</label>
                                    <textarea id="formTraining" rows="2" placeholder="Cần đào tạo thêm gì..." style="width: 100%; padding: 9px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; box-sizing: border-box; resize: vertical;">${item ? (item.training_direction || '') : ''}</textarea>
                                </div>

                                <div style="grid-column: span 2;">
                                    <label style="display: block; font-size: 12px; font-weight: 700; color: #059669; margin-bottom: 6px;">🤝 Cam Kết Của Quản Lý</label>
                                    <textarea id="formManagerCommit" rows="2" placeholder="Hỗ trợ của quản lý..." style="width: 100%; padding: 9px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; box-sizing: border-box; resize: vertical;">${item ? (item.manager_commitment || '') : ''}</textarea>
                                </div>
                            </div>
                        </div>

                        <!-- 💬 MỤC 2: Ý KIẾN & CAM KẾT NHÂN SỰ -->
                        <div id="sec2Card" style="background: #fdf2f8; padding: 18px; border-radius: 14px; border: 2px solid #db2777; transition: all 0.2s;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                                <h4 style="margin: 0; font-size: 14px; font-weight: 800; color: #be185d; display: flex; align-items: center; gap: 6px;">
                                    <span>💬 MỤC 2: Ý KIẾN & CAM KẾT NHÂN SỰ</span>
                                </h4>
                                <span id="sec2Badge" style="font-size: 11px; font-weight: 800; background: #fee2e2; color: #991b1b; padding: 3px 10px; border-radius: 12px;">🔒 Khóa — Cần nhập xong Mục 1</span>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                                <div>
                                    <label style="display: block; font-size: 11px; font-weight: 700; color: #be185d; margin-bottom: 4px;">Ý Kiến Nhân Sự</label>
                                    <textarea id="formEmpOpinion" rows="2" placeholder="Ý kiến phản hồi..." style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #f472b6; font-size: 12px; box-sizing: border-box; resize: vertical;" oninput="window._eeCheckSectionLocks()">${item ? (item.employee_opinion || '') : ''}</textarea>
                                </div>
                                <div>
                                    <label style="display: block; font-size: 11px; font-weight: 700; color: #be185d; margin-bottom: 4px;">Time Xử Lý (Hạn khắc phục)</label>
                                    <input id="formResolutionDeadline" type="date" value="${item ? (item.resolution_deadline || '') : ''}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #f472b6; font-size: 12px; box-sizing: border-box;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 11px; font-weight: 700; color: #be185d; margin-bottom: 4px;">Cam Kết Của Nhân Sự</label>
                                    <textarea id="formEmpCommitment" rows="2" placeholder="Cam kết thực hiện..." style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #f472b6; font-size: 12px; box-sizing: border-box; resize: vertical;" oninput="window._eeCheckSectionLocks()">${item ? (item.employee_commitment || '') : ''}</textarea>
                                </div>
                            </div>
                        </div>

                        <!-- 📊 MỤC 3: BÁO CÁO TIẾN ĐỘ -->
                        <div id="sec3Card" style="background: #f0f9ff; padding: 18px; border-radius: 14px; border: 2px solid #0284c7; transition: all 0.2s;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                                <h4 style="margin: 0; font-size: 14px; font-weight: 800; color: #0369a1; display: flex; align-items: center; gap: 6px;">
                                    <span>📊 MỤC 3: BÁO CÁO TIẾN ĐỘ</span>
                                </h4>
                                <span id="sec3Badge" style="font-size: 11px; font-weight: 800; background: #fee2e2; color: #991b1b; padding: 3px 10px; border-radius: 12px;">🔒 Khóa — Cần nhập xong Mục 2</span>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div>
                                    <label style="display: block; font-size: 11px; font-weight: 700; color: #0369a1; margin-bottom: 4px;">Quản Lý Báo Cáo (Xử lý thế nào?)</label>
                                    <textarea id="formManagerReport" rows="2" placeholder="Cập nhật từ quản lý..." style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #38bdf8; font-size: 12px; box-sizing: border-box; resize: vertical;">${item ? (item.manager_report || '') : ''}</textarea>
                                </div>
                                <div>
                                    <label style="display: block; font-size: 11px; font-weight: 700; color: #0369a1; margin-bottom: 4px;">Nhân Sự Báo Cáo</label>
                                    <textarea id="formEmpReport" rows="2" placeholder="Báo cáo kết quả từ nhân sự..." style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #38bdf8; font-size: 12px; box-sizing: border-box; resize: vertical;">${item ? (item.employee_report || '') : ''}</textarea>
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- Footer Actions -->
                    <div style="padding: 16px 24px; background: #f8fafc; border-radius: 0 0 20px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px;">
                        <button onclick="window._eeCloseModal()" style="padding: 9px 18px; background: #e2e8f0; color: #475569; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">Hủy</button>
                        <button id="btnSaveEvaluation" onclick="window._eeSaveForm(${item ? item.id : 'null'})" style="padding: 9px 24px; background: #1e40af; color: white; border: none; border-radius: 8px; font-weight: 800; cursor: pointer; box-shadow: 0 2px 8px rgba(30,64,175,0.3); transition: all 0.2s;">Lưu Đánh Giá</button>
                    </div>
                </div>
            </div>
        `;

        // Check locks immediately on load
        window._eeCheckSectionLocks();
    };

    window._eeCheckSectionLocks = function() {
        var empName = document.getElementById('formEmpName') ? document.getElementById('formEmpName').value.trim() : '';
        var dept = document.getElementById('formDepartment') ? document.getElementById('formDepartment').value : '';
        var errors = document.getElementById('formImprovementErrors') ? document.getElementById('formImprovementErrors').value.trim() : '';
        var evalText = document.getElementById('formManagerEval') ? document.getElementById('formManagerEval').value.trim() : '';

        var sec1Complete = (empName !== '') && (dept !== '') && (errors !== '' || evalText !== '');

        var sec2Card = document.getElementById('sec2Card');
        var sec2Badge = document.getElementById('sec2Badge');
        var sec2Inputs = sec2Card ? sec2Card.querySelectorAll('input, select, textarea') : [];

        if (sec1Complete) {
            if (sec2Card) { sec2Card.style.opacity = '1'; sec2Card.style.pointerEvents = 'auto'; }
            if (sec2Badge) { sec2Badge.innerHTML = '🟢 Đã sẵn sàng nhập'; sec2Badge.style.background = '#dcfce7'; sec2Badge.style.color = '#166534'; }
            sec2Inputs.forEach(el => el.removeAttribute('disabled'));
        } else {
            if (sec2Card) { sec2Card.style.opacity = '0.5'; sec2Card.style.pointerEvents = 'none'; }
            if (sec2Badge) { sec2Badge.innerHTML = '🔒 Khóa — Cần nhập xong Mục 1'; sec2Badge.style.background = '#fee2e2'; sec2Badge.style.color = '#991b1b'; }
            sec2Inputs.forEach(el => el.setAttribute('disabled', 'disabled'));
        }

        var empOpinion = document.getElementById('formEmpOpinion') ? document.getElementById('formEmpOpinion').value.trim() : '';
        var empCommit = document.getElementById('formEmpCommitment') ? document.getElementById('formEmpCommitment').value.trim() : '';

        var sec2Complete = sec1Complete && (empOpinion !== '' || empCommit !== '');

        var sec3Card = document.getElementById('sec3Card');
        var sec3Badge = document.getElementById('sec3Badge');
        var sec3Inputs = sec3Card ? sec3Card.querySelectorAll('input, select, textarea') : [];

        if (sec2Complete) {
            if (sec3Card) { sec3Card.style.opacity = '1'; sec3Card.style.pointerEvents = 'auto'; }
            if (sec3Badge) { sec3Badge.innerHTML = '🟢 Đã sẵn sàng nhập'; sec3Badge.style.background = '#dcfce7'; sec3Badge.style.color = '#166534'; }
            sec3Inputs.forEach(el => el.removeAttribute('disabled'));
        } else {
            if (sec3Card) { sec3Card.style.opacity = '0.5'; sec3Card.style.pointerEvents = 'none'; }
            if (sec3Badge) { sec3Badge.innerHTML = '🔒 Khóa — Cần nhập xong Mục 2'; sec3Badge.style.background = '#fee2e2'; sec3Badge.style.color = '#991b1b'; }
            sec3Inputs.forEach(el => el.setAttribute('disabled', 'disabled'));
        }

        var btnSave = document.getElementById('btnSaveEvaluation');
        if (btnSave) {
            if (sec1Complete) {
                btnSave.removeAttribute('disabled');
                btnSave.style.opacity = '1';
                btnSave.style.cursor = 'pointer';
            } else {
                btnSave.setAttribute('disabled', 'disabled');
                btnSave.style.opacity = '0.5';
                btnSave.style.cursor = 'not-allowed';
            }
        }
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
        window._eeCheckSectionLocks();
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

        var errors = document.getElementById('formImprovementErrors').value.trim();
        var managerEval = document.getElementById('formManagerEval').value.trim();

        if (!empName || (!errors && !managerEval)) {
            showToast('⚠️ Vui lòng nhập đầy đủ thông tin Mục 1 (Tên Nhân Sự & Lỗi/Đánh Giá)', 'warning');
            return;
        }

        var defaultMY = 'Tháng ' + (new Date().getMonth() + 1) + '/' + new Date().getFullYear();
        if (_eeState.filterYear && _eeState.filterYear !== 'all') {
            var mStr = (_eeState.filterMonth && _eeState.filterMonth !== 'all') ? _eeState.filterMonth : (new Date().getMonth() + 1);
            defaultMY = 'Tháng ' + mStr + '/' + _eeState.filterYear;
        }

        var body = {
            month_year: monthYear || defaultMY,
            user_id: userId || null,
            employee_name: empName,
            department: dept,
            improvement_errors: errors,
            manager_evaluation: managerEval,
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
