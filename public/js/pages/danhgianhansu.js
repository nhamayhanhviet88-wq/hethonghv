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
                        <button onclick="window._eeSetViewMode('analysis')" style="padding: 8px 14px; background: linear-gradient(135deg, #059669, #047857); color: white; border: none; border-radius: 8px; font-size: 12px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(5,150,105,0.25);">
                            📊 Báo Cáo Phân Tích Nhân Sự
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
                            <button id="btnViewAnalysis" onclick="window._eeSetViewMode('analysis')" style="padding: 5px 10px; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; background: transparent; color: #475569;">📊 Báo Cáo Phân Tích (Ma Trận)</button>
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
            if (_eeState.evalTypeFilter && _eeState.evalTypeFilter !== 'all') {
                params.append('eval_type', _eeState.evalTypeFilter);
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
        _eeState.evalTypeFilter = 'all'; // Reset eval_type filter when using stat_filter
        if (_eeState.statFilter === filter && filter !== 'all') {
            _eeState.statFilter = 'all';
        } else {
            _eeState.statFilter = filter;
        }
        _eeLoadData();
    };

    window._eeSelectEvalTypeFilter = function(type) {
        _eeState.statFilter = 'all'; // Reset stat_filter when using eval_type filter
        if (_eeState.evalTypeFilter === type && type !== 'all') {
            _eeState.evalTypeFilter = 'all';
        } else {
            _eeState.evalTypeFilter = type;
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
                activeText.innerText = '🔍 Đang lọc: 🔴 Chưa xử lý ý kiến & cam kết NS';
            } else if (sf === 'pending_progress') {
                activeTag.style.display = 'inline-flex';
                activeText.innerText = '🔍 Đang lọc: 🟡 Chưa hoàn thành báo cáo tiến độ';
            } else if (sf === 'completed_progress') {
                activeTag.style.display = 'inline-flex';
                activeText.innerText = '🔍 Đang lọc: 🟢 Đã hoàn thành báo cáo tiến độ';
            } else {
                activeTag.style.display = 'none';
            }
        }

        container.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 18px;';

        container.innerHTML = `
            <!-- Card 1: Tổng Đánh Giá Quản Lý -->
            <div onclick="window._eeSelectStatFilter('all')" title="Click để xem tất cả phiếu đánh giá" style="background: ${sf === 'all' ? '#eff6ff' : 'white'}; border-radius: 12px; padding: 14px 16px; border: ${sf === 'all' ? '2px solid #2563eb' : '1px solid #e2e8f0'}; box-shadow: 0 2px 10px rgba(0,0,0,0.03); display: flex; align-items: center; gap: 12px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                <div style="width: 44px; height: 44px; border-radius: 12px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">👨‍💼</div>
                <div>
                    <div style="font-size: 11px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; line-height: 1.2;">TỔNG ĐÁNH GIÁ QUẢN LÝ</div>
                    <div style="font-size: 22px; font-weight: 900; color: #0f172a; margin-top: 2px;">${s.total || 0}</div>
                </div>
            </div>

            <!-- Card 2: Chưa xử lý ý kiến & cam kết NS -->
            <div onclick="window._eeSelectStatFilter('pending_employee')" title="Click để lọc các phiếu Nhân sự chưa xử lý" style="background: ${sf === 'pending_employee' ? '#fff1f2' : 'white'}; border-radius: 12px; padding: 14px 16px; border: ${sf === 'pending_employee' ? '2px solid #e11d48' : '1px solid #fecdd3'}; box-shadow: 0 2px 10px rgba(0,0,0,0.03); display: flex; align-items: center; gap: 12px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                <div style="width: 44px; height: 44px; border-radius: 12px; background: #ffe4e6; color: #e11d48; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">🔴</div>
                <div>
                    <div style="font-size: 11px; font-weight: 800; color: #be123c; text-transform: uppercase; line-height: 1.2;">CHƯA XỬ LÝ 💬 Ý KIẾN & CAM KẾT NS</div>
                    <div style="font-size: 22px; font-weight: 900; color: #e11d48; margin-top: 2px;">${s.pending_employee || 0}</div>
                </div>
            </div>

            <!-- Card 3: Chưa hoàn thành báo cáo tiến độ -->
            <div onclick="window._eeSelectStatFilter('pending_progress')" title="Click để lọc các phiếu chưa hoàn thành báo cáo tiến độ" style="background: ${sf === 'pending_progress' ? '#fffbeb' : 'white'}; border-radius: 12px; padding: 14px 16px; border: ${sf === 'pending_progress' ? '2px solid #d97706' : '1px solid #fef3c7'}; box-shadow: 0 2px 10px rgba(0,0,0,0.03); display: flex; align-items: center; gap: 12px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                <div style="width: 44px; height: 44px; border-radius: 12px; background: #fef3c7; color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">🟡</div>
                <div>
                    <div style="font-size: 11px; font-weight: 800; color: #92400e; text-transform: uppercase; line-height: 1.2;">CHƯA HOÀN THÀNH 📊 BÁO CÁO TIẾN ĐỘ</div>
                    <div style="font-size: 22px; font-weight: 900; color: #d97706; margin-top: 2px;">${s.pending_progress || 0}</div>
                </div>
            </div>

            <!-- Card 4: Hoàn thành báo cáo tiến độ -->
            <div onclick="window._eeSelectStatFilter('completed_progress')" title="Click để lọc các phiếu đã hoàn thành" style="background: ${sf === 'completed_progress' ? '#ecfdf5' : 'white'}; border-radius: 12px; padding: 14px 16px; border: ${sf === 'completed_progress' ? '2px solid #059669' : '1px solid #d1fae5'}; box-shadow: 0 2px 10px rgba(0,0,0,0.03); display: flex; align-items: center; gap: 12px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                <div style="width: 44px; height: 44px; border-radius: 12px; background: #d1fae5; color: #059669; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">🟢</div>
                <div>
                    <div style="font-size: 11px; font-weight: 800; color: #065f46; text-transform: uppercase; line-height: 1.2;">HOÀN THÀNH 📊 BÁO CÁO TIẾN ĐỘ</div>
                    <div style="font-size: 22px; font-weight: 900; color: #059669; margin-top: 2px;">${s.completed_progress || 0}</div>
                </div>
            </div>
        `;
    }

    window._eeSetViewMode = function(mode) {
        _eeState.viewMode = mode;

        var bCompact = document.getElementById('btnViewCompact');
        var bCards = document.getElementById('btnViewCards');
        var bAnalysis = document.getElementById('btnViewAnalysis');

        if (bCompact) {
            bCompact.style.background = mode === 'compact' ? '#1e40af' : 'transparent';
            bCompact.style.color = mode === 'compact' ? 'white' : '#475569';
        }
        if (bCards) {
            bCards.style.background = mode === 'cards' ? '#1e40af' : 'transparent';
            bCards.style.color = mode === 'cards' ? 'white' : '#475569';
        }
        if (bAnalysis) {
            bAnalysis.style.background = mode === 'analysis' ? '#059669' : 'transparent';
            bAnalysis.style.color = mode === 'analysis' ? 'white' : '#475569';
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
        } else if (_eeState.viewMode === 'analysis') {
            _eeRenderEmployeeAnalysisView(container);
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
                            <th rowspan="2" style="padding: 10px 2px; background: #1e3a8a; width: 5%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.2);">Kỳ</th>
                            <th rowspan="2" style="padding: 10px 2px; background: #1e3a8a; width: 2.8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.2);">STT</th>
                            <th rowspan="2" style="padding: 10px 4px; background: #1e3a8a; width: 8.5%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="Tên Nhân Sự">Tên Nhân Sự</th>
                            <th rowspan="2" style="padding: 10px 4px; background: #1e3a8a; width: 5.8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="Bộ Phận">Bộ Phận</th>
                            
                            <!-- Group 1: Manager Eval (6 columns) -->
                            <th colspan="6" style="padding: 8px 6px; background: #1e3a8a; text-align: center; vertical-align: middle; border-bottom: 1px solid rgba(255,255,255,0.2); border-right: 1px solid rgba(255,255,255,0.2);">👨‍💼 ĐÁNH GIÁ TỪ QUẢN LÝ</th>
                            
                            <!-- Group 2: Employee Opinion -->
                            <th colspan="3" style="padding: 8px 6px; background: #be185d; text-align: center; vertical-align: middle; border-bottom: 1px solid rgba(255,255,255,0.2); border-right: 1px solid rgba(255,255,255,0.2);">💬 Ý KIẾN & CAM KẾT NHÂN SỰ</th>
                            
                            <!-- Group 3: Progress Report -->
                            <th colspan="2" style="padding: 8px 6px; background: #0369a1; text-align: center; vertical-align: middle; border-bottom: 1px solid rgba(255,255,255,0.2);">📊 BÁO CÁO TIẾN ĐỘ</th>
                        </tr>
                        <!-- Row 2: Sub-headers centered with Multiline Linebreaks -->
                        <tr style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: white; text-align: center; vertical-align: middle;">
                            <th style="padding: 8px 2px; background: #1d4ed8; width: 5.8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Phân<br>Loại</th>
                            <th style="padding: 8px 4px; background: #1d4ed8; width: 9%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Cải Thiện<br>/ Lỗi</th>
                            <th style="padding: 8px 4px; background: #1d4ed8; width: 10.5%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Đánh Giá<br>Quản Lý</th>
                            <th style="padding: 8px 4px; background: #1d4ed8; width: 9%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Nội Dung<br>Khắc Phục</th>
                            <th style="padding: 8px 4px; background: #1d4ed8; width: 8.5%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Hướng<br>Đào Tạo</th>
                            <th style="padding: 8px 4px; background: #1d4ed8; width: 8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Quản Lý<br>Cam Kết</th>
                            
                            <th style="padding: 8px 4px; background: #db2777; width: 8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Ý Kiến<br>Nhân Sự</th>
                            <th style="padding: 8px 4px; background: #db2777; width: 5.8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Hạn<br>Xử Lý</th>
                            <th style="padding: 8px 4px; background: #db2777; width: 8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Nhân Sự<br>Cam Kết</th>
                            
                            <th style="padding: 8px 4px; background: #0284c7; width: 7.8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Quản Lý<br>Báo Cáo</th>
                            <th style="padding: 8px 4px; background: #0284c7; width: 7.5%; text-align: center; vertical-align: middle; line-height: 1.3;">Nhân Sự<br>Báo Cáo</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        _eeState.items.forEach(function(item, idx) {
            var shortKyHtml = _formatShortKy(item.month_year);
            var typeBadgeHtml = (item.eval_type === 'Lỗi Vi Phạm')
                ? '<span style="background: #fee2e2; color: #991b1b; padding: 2px 5px; border-radius: 4px; font-weight: 800; font-size: 10px; display: inline-block;">⚠️ LỖI</span>'
                : '<span style="background: #fef3c7; color: #92400e; padding: 2px 5px; border-radius: 4px; font-weight: 800; font-size: 10px; display: inline-block;">💡 CẢI THIỆN</span>';

            html += `
                <tr style="border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.15s;" onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='white'" onclick="window._eeOpenDetailModal(${item.id})">
                    <td style="padding: 6px 2px; text-align: center; font-weight: 700; color: #1e40af; background: #f0f9ff; border-right: 1px solid #e2e8f0; font-size: 11px; line-height: 1.25; word-break: break-word;">${shortKyHtml}</td>
                    <td style="padding: 8px 2px; text-align: center; font-weight: 700; color: #64748b; border-right: 1px solid #e2e8f0; font-size: 11.5px;">${idx + 1}</td>
                    <td style="padding: 8px 6px; font-weight: 800; color: #0f172a; border-right: 1px solid #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px;" title="${item.employee_name}">${item.employee_name || '--'}</td>
                    <td style="padding: 8px 4px; border-right: 1px solid #e2e8f0; text-align: center;" title="${item.department}">${_getDeptBadgeHtml(item.department)}</td>
                    
                    <!-- Group 1: Manager Evaluation (6 columns) -->
                    <td style="padding: 8px 2px; border-right: 1px solid #e2e8f0; text-align: center;" title="${item.eval_type || 'Cần Cải Thiện'}">${typeBadgeHtml}</td>
                    <td style="padding: 8px 6px; border-right: 1px solid #e2e8f0; color: #dc2626; font-weight: 600; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.improvement_errors}">${_clampText(item.improvement_errors)}</td>
                    <td style="padding: 8px 6px; border-right: 1px solid #e2e8f0; color: #334155; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.manager_evaluation}">${_clampText(item.manager_evaluation)}</td>
                    <td style="padding: 8px 6px; border-right: 1px solid #e2e8f0; color: #2563eb; font-weight: 600; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.remediation_action}">${_clampText(item.remediation_action)}</td>
                    <td style="padding: 8px 6px; border-right: 1px solid #e2e8f0; color: #7c3aed; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.training_direction}">${_clampText(item.training_direction)}</td>
                    <td style="padding: 8px 6px; border-right: 1px solid #e2e8f0; color: #059669; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.manager_commitment}">${_clampText(item.manager_commitment)}</td>
                    
                    <!-- Group 2: Employee Input -->
                    <td style="padding: 8px 6px; background: #fdf2f8; border-right: 1px solid #fbcfe8; color: #be185d; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.employee_opinion}">${_clampText(item.employee_opinion)}</td>
                    <td style="padding: 8px 4px; background: #fdf2f8; border-right: 1px solid #fbcfe8; font-weight: 700; color: #9d174d; font-size: 11.5px; text-align: center;" title="${item.resolution_deadline}">${_formatShortDate(item.resolution_deadline)}</td>
                    <td style="padding: 8px 6px; background: #fdf2f8; border-right: 1px solid #fbcfe8; color: #be185d; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.employee_commitment}">${_clampText(item.employee_commitment)}</td>
                    
                    <!-- Group 3: Progress Report -->
                    <td style="padding: 8px 6px; background: #f0f9ff; border-right: 1px solid #bae6fd; color: #0369a1; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.manager_report}">${_clampText(item.manager_report)}</td>
                    <td style="padding: 8px 6px; background: #f0f9ff; color: #0369a1; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.employee_report}">${_clampText(item.employee_report)}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
            <div style="margin-top: 8px; font-size: 11px; color: #64748b; text-align: right; font-style: italic;">
                💡 Mẹo: Bảng được tự động căn vừa 100% màn hình. Bấm vào bất kỳ hàng nào để xem hồ sơ chi tiết và Chỉnh Sửa / Xóa.
            </div>
        `;

        container.innerHTML = html;
    }

    // 📊 VIEW MODE 3: DIRECT MAIN PAGE EMPLOYEE ANALYTICAL BREAKDOWN SECTION (OPTION 2)
    function _eeRenderEmployeeAnalysisView(container) {
        var items = _eeState.items || [];

        // Group items by Employee Name
        var empMap = {};
        items.forEach(function(item) {
            var empName = item.employee_name || 'Khác';
            if (!empMap[empName]) {
                empMap[empName] = {
                    name: empName,
                    dept: item.department || 'Kinh Doanh',
                    errors: [],
                    improvements: [],
                    total: 0
                };
            }
            empMap[empName].total++;
            if (item.eval_type === 'Lỗi Vi Phạm') {
                empMap[empName].errors.push(item);
            } else {
                empMap[empName].improvements.push(item);
            }
        });

        var empList = Object.values(empMap);

        var html = `
            <div style="background: white; border-radius: 12px; border: 1px solid #cbd5e1; box-shadow: 0 4px 20px rgba(0,0,0,0.04); overflow: hidden; padding: 16px 20px;">
                <!-- Header -->
                <div style="padding-bottom: 12px; margin-bottom: 14px; border-bottom: 2px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <h2 style="font-size: 17px; font-weight: 900; color: #0f172a; margin: 0; display: flex; align-items: center; gap: 8px;">
                            <span>📊</span> BẢNG MA TRẬN PHÂN TÍCH NHÂN SỰ — SIÊU GỌN GÀNG DÀNH CHO QUẢN LÝ
                        </h2>
                        <p style="margin: 2px 0 0 0; font-size: 11.5px; color: #64748b;">
                            Nén gọn 10 lần cho hàng trăm nhân sự • Click vào từng dòng nội dung để xem chi tiết đầy đủ
                        </p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 11.5px; font-weight: 700; color: #475569;">🔍 Lọc Nhân Sự:</span>
                        <input id="eeEmpSearchInputDirect" type="text" placeholder="Gõ tên nhân sự hoặc bộ phận..." style="padding: 5px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 11.5px; width: 230px; outline: none;" />
                    </div>
                </div>

                <!-- Executive Matrix Table -->
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; table-layout: fixed;">
                        <thead>
                            <tr style="background: #1e3a8a; color: white; font-weight: 900; font-size: 11.5px; text-transform: uppercase;">
                                <th style="padding: 10px 12px; width: 18%; border-right: 1px solid rgba(255,255,255,0.2);">👤 NHÂN SỰ & BỘ PHẬN</th>
                                <th style="padding: 10px 12px; width: 41%; background: #991b1b; border-right: 1px solid rgba(255,255,255,0.2);">🔴 ⚠️ PHÂN LOẠI LỖI VI PHẠM</th>
                                <th style="padding: 10px 12px; width: 41%; background: #92400e;">💡 💡 PHÂN LOẠI CẦN CẢI THIỆN</th>
                            </tr>
                        </thead>
                        <tbody id="eeEmployeeTableBodyDirect">
        `;

        var renderTableRowsHtml = function(filterText) {
            filterText = (filterText || '').toLowerCase().trim();
            var filtered = empList.filter(function(e) {
                return e.name.toLowerCase().includes(filterText) || e.dept.toLowerCase().includes(filterText);
            });

            if (filtered.length === 0) {
                return `
                    <tr>
                        <td colspan="3" style="padding: 30px; text-align: center; color: #94a3b8; font-size: 13px;">
                            <div style="font-size: 28px; margin-bottom: 4px;">📭</div>
                            <div style="font-weight: 700;">Không tìm thấy nhân sự nào phù hợp</div>
                        </td>
                    </tr>
                `;
            }

            var rowsHtml = '';
            filtered.forEach(function(emp, rIdx) {
                var rowBg = (rIdx % 2 === 0) ? '#ffffff' : '#f8fafc';
                rowsHtml += `
                    <tr style="border-bottom: 2.5px solid #cbd5e1; background: ${rowBg}; transition: background 0.15s;" onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='${rowBg}'">
                        <!-- Col 1: Employee info -->
                        <td style="padding: 10px 12px; vertical-align: top; border-right: 1.5px solid #cbd5e1; background: #fafafa;">
                            <div style="font-size: 13.5px; font-weight: 900; color: #0f172a; display: flex; align-items: center; gap: 6px;">
                                <span>👤 ${emp.name}</span>
                                ${_getDeptBadgeHtml(emp.dept)}
                            </div>
                            <div style="font-size: 11px; color: #64748b; margin-top: 4px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                                <span style="background: #ffe4e6; color: #be123c; padding: 1px 6px; border-radius: 10px; font-weight: 800; font-size: 10.5px; border: 1px solid #fecdd3;">⚠️ ${emp.errors.length} Lỗi</span>
                                <span style="background: #fef3c7; color: #92400e; padding: 1px 6px; border-radius: 10px; font-weight: 800; font-size: 10.5px; border: 1px solid #fde68a;">💡 ${emp.improvements.length} Cải thiện</span>
                            </div>
                        </td>

                        <!-- Col 2: Violations list -->
                        <td style="padding: 8px 10px; vertical-align: top; border-right: 1.5px solid #cbd5e1; background: #fff1f2;">
                            ${emp.errors.length === 0 ? '<div style="font-size: 11.5px; color: #9f1239; font-style: italic; padding: 4px 0;">Không có lỗi vi phạm</div>' : ''}
                            ${emp.errors.map(function(errItem) {
                                return `
                                    <div onclick="window._eeOpenDetailModal(${errItem.id});" title="Click để xem chi tiết đầy đủ" style="padding: 5px 9px; margin-bottom: 5px; background: white; border-radius: 6px; border-left: 3.5px solid #e11d48; border-top: 1px solid #fecdd3; border-right: 1px solid #fecdd3; border-bottom: 1px solid #fecdd3; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 8px; transition: all 0.15s; box-shadow: 0 1px 3px rgba(0,0,0,0.03);" onmouseover="this.style.background='#ffe4e6'; this.style.transform='translateX(2px)';" onmouseout="this.style.background='white'; this.style.transform='translateX(0)';">
                                        <div style="font-size: 12px; font-weight: 800; color: #991b1b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">
                                            <span style="background: #be123c; color: white; padding: 1px 6px; border-radius: 4px; font-weight: 900; font-size: 10.5px; margin-right: 6px; display: inline-block;">👤 ${emp.name}</span>
                                            ⚠️ <span style="font-size: 10.5px; color: #64748b; font-weight: 600;">[${_formatShortKy(errItem.month_year)}]</span> ${errItem.improvement_errors || 'Lỗi vi phạm'}
                                        </div>
                                        <span style="font-size: 10px; font-weight: 800; color: #be123c; flex-shrink: 0; background: #fff1f2; padding: 2px 6px; border-radius: 4px; border: 1px solid #fecdd3;">Hạn: ${_formatShortDate(errItem.resolution_deadline)}</span>
                                    </div>
                                `;
                            }).join('')}
                        </td>

                        <!-- Col 3: Improvements list -->
                        <td style="padding: 8px 10px; vertical-align: top; background: #fffbeb;">
                            ${emp.improvements.length === 0 ? '<div style="font-size: 11.5px; color: #92400e; font-style: italic; padding: 4px 0;">Không có nội dung cần cải thiện</div>' : ''}
                            ${emp.improvements.map(function(impItem) {
                                return `
                                    <div onclick="window._eeOpenDetailModal(${impItem.id});" title="Click để xem chi tiết đầy đủ" style="padding: 5px 9px; margin-bottom: 5px; background: white; border-radius: 6px; border-left: 3.5px solid #d97706; border-top: 1px solid #fde68a; border-right: 1px solid #fde68a; border-bottom: 1px solid #fde68a; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 8px; transition: all 0.15s; box-shadow: 0 1px 3px rgba(0,0,0,0.03);" onmouseover="this.style.background='#fef3c7'; this.style.transform='translateX(2px)';" onmouseout="this.style.background='white'; this.style.transform='translateX(0)';">
                                        <div style="font-size: 12px; font-weight: 800; color: #92400e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">
                                            <span style="background: #d97706; color: white; padding: 1px 6px; border-radius: 4px; font-weight: 900; font-size: 10.5px; margin-right: 6px; display: inline-block;">👤 ${emp.name}</span>
                                            💡 <span style="font-size: 10.5px; color: #64748b; font-weight: 600;">[${_formatShortKy(impItem.month_year)}]</span> ${impItem.improvement_errors || 'Nội dung cải thiện'}
                                        </div>
                                        <span style="font-size: 10px; font-weight: 800; color: #059669; flex-shrink: 0; background: #f0fdf4; padding: 2px 6px; border-radius: 4px; border: 1px solid #bbf7d0;">${impItem.status === 'completed' ? '🟢 Hoàn thành' : '🟡 Đang theo dõi'}</span>
                                    </div>
                                `;
                            }).join('')}
                        </td>
                    </tr>
                `;
            });
            return rowsHtml;
        };

        html += renderTableRowsHtml('');
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Wire search input listener
        var searchInput = container.querySelector('#eeEmpSearchInputDirect');
        var tableBody = container.querySelector('#eeEmployeeTableBodyDirect');
        if (searchInput && tableBody) {
            searchInput.oninput = function() {
                tableBody.innerHTML = renderTableRowsHtml(this.value);
            };
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
                            <th rowspan="2" style="padding: 10px 2px; background: #1e3a8a; width: 5%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.2);">Kỳ</th>
                            <th rowspan="2" style="padding: 10px 2px; background: #1e3a8a; width: 2.8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.2);">STT</th>
                            <th rowspan="2" style="padding: 10px 4px; background: #1e3a8a; width: 8.5%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="Tên Nhân Sự">Tên Nhân Sự</th>
                            <th rowspan="2" style="padding: 10px 4px; background: #1e3a8a; width: 5.8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="Bộ Phận">Bộ Phận</th>
                            
                            <!-- Group 1: Manager Eval (6 columns) -->
                            <th colspan="6" style="padding: 8px 6px; background: #1e3a8a; text-align: center; vertical-align: middle; border-bottom: 1px solid rgba(255,255,255,0.2); border-right: 1px solid rgba(255,255,255,0.2);">👨‍💼 ĐÁNH GIÁ TỪ QUẢN LÝ</th>
                            
                            <!-- Group 2: Employee Opinion -->
                            <th colspan="3" style="padding: 8px 6px; background: #be185d; text-align: center; vertical-align: middle; border-bottom: 1px solid rgba(255,255,255,0.2); border-right: 1px solid rgba(255,255,255,0.2);">💬 Ý KIẾN & CAM KẾT NHÂN SỰ</th>
                            
                            <!-- Group 3: Progress Report -->
                            <th colspan="2" style="padding: 8px 6px; background: #0369a1; text-align: center; vertical-align: middle; border-bottom: 1px solid rgba(255,255,255,0.2);">📊 BÁO CÁO TIẾN ĐỘ</th>
                        </tr>
                        <!-- Row 2: Sub-headers centered with Multiline Linebreaks -->
                        <tr style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: white; text-align: center; vertical-align: middle;">
                            <th style="padding: 8px 2px; background: #1d4ed8; width: 5.8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Phân<br>Loại</th>
                            <th style="padding: 8px 4px; background: #1d4ed8; width: 9%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Cải Thiện<br>/ Lỗi</th>
                            <th style="padding: 8px 4px; background: #1d4ed8; width: 10.5%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Đánh Giá<br>Quản Lý</th>
                            <th style="padding: 8px 4px; background: #1d4ed8; width: 9%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Nội Dung<br>Khắc Phục</th>
                            <th style="padding: 8px 4px; background: #1d4ed8; width: 8.5%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Hướng<br>Đào Tạo</th>
                            <th style="padding: 8px 4px; background: #1d4ed8; width: 8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Quản Lý<br>Cam Kết</th>
                            
                            <th style="padding: 8px 4px; background: #db2777; width: 8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Ý Kiến<br>Nhân Sự</th>
                            <th style="padding: 8px 4px; background: #db2777; width: 5.8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Hạn<br>Xử Lý</th>
                            <th style="padding: 8px 4px; background: #db2777; width: 8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Nhân Sự<br>Cam Kết</th>
                            
                            <th style="padding: 8px 4px; background: #0284c7; width: 7.8%; text-align: center; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.15); line-height: 1.3;">Quản Lý<br>Báo Cáo</th>
                            <th style="padding: 8px 4px; background: #0284c7; width: 7.5%; text-align: center; vertical-align: middle; line-height: 1.3;">Nhân Sự<br>Báo Cáo</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        _eeState.items.forEach(function(item, idx) {
            var shortKyHtml = _formatShortKy(item.month_year);
            var typeBadgeHtml = (item.eval_type === 'Lỗi Vi Phạm')
                ? '<span style="background: #fee2e2; color: #991b1b; padding: 2px 5px; border-radius: 4px; font-weight: 800; font-size: 10px; display: inline-block;">⚠️ LỖI</span>'
                : '<span style="background: #fef3c7; color: #92400e; padding: 2px 5px; border-radius: 4px; font-weight: 800; font-size: 10px; display: inline-block;">💡 CẢI THIỆN</span>';

            html += `
                <tr style="border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.15s;" onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='white'" onclick="window._eeOpenDetailModal(${item.id})">
                    <td style="padding: 6px 2px; text-align: center; font-weight: 700; color: #1e40af; background: #f0f9ff; border-right: 1px solid #e2e8f0; font-size: 11px; line-height: 1.25; word-break: break-word;">${shortKyHtml}</td>
                    <td style="padding: 8px 2px; text-align: center; font-weight: 700; color: #64748b; border-right: 1px solid #e2e8f0; font-size: 11.5px;">${idx + 1}</td>
                    <td style="padding: 8px 6px; font-weight: 800; color: #0f172a; border-right: 1px solid #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px;" title="${item.employee_name}">${item.employee_name || '--'}</td>
                    <td style="padding: 8px 4px; border-right: 1px solid #e2e8f0; text-align: center;" title="${item.department}">${_getDeptBadgeHtml(item.department)}</td>
                    
                    <!-- Group 1: Manager Evaluation (6 columns) -->
                    <td style="padding: 8px 2px; border-right: 1px solid #e2e8f0; text-align: center;" title="${item.eval_type || 'Cần Cải Thiện'}">${typeBadgeHtml}</td>
                    <td style="padding: 8px 6px; border-right: 1px solid #e2e8f0; color: #dc2626; font-weight: 600; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.improvement_errors}">${_clampText(item.improvement_errors)}</td>
                    <td style="padding: 8px 6px; border-right: 1px solid #e2e8f0; color: #334155; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.manager_evaluation}">${_clampText(item.manager_evaluation)}</td>
                    <td style="padding: 8px 6px; border-right: 1px solid #e2e8f0; color: #2563eb; font-weight: 600; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.remediation_action}">${_clampText(item.remediation_action)}</td>
                    <td style="padding: 8px 6px; border-right: 1px solid #e2e8f0; color: #7c3aed; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.training_direction}">${_clampText(item.training_direction)}</td>
                    <td style="padding: 8px 6px; border-right: 1px solid #e2e8f0; color: #059669; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.manager_commitment}">${_clampText(item.manager_commitment)}</td>
                    
                    <!-- Group 2: Employee Input -->
                    <td style="padding: 8px 6px; background: #fdf2f8; border-right: 1px solid #fbcfe8; color: #be185d; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.employee_opinion}">${_clampText(item.employee_opinion)}</td>
                    <td style="padding: 8px 4px; background: #fdf2f8; border-right: 1px solid #fbcfe8; font-weight: 700; color: #9d174d; font-size: 11.5px; text-align: center;" title="${item.resolution_deadline}">${_formatShortDate(item.resolution_deadline)}</td>
                    <td style="padding: 8px 6px; background: #fdf2f8; border-right: 1px solid #fbcfe8; color: #be185d; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.employee_commitment}">${_clampText(item.employee_commitment)}</td>
                    
                    <!-- Group 3: Progress Report -->
                    <td style="padding: 8px 6px; background: #f0f9ff; border-right: 1px solid #bae6fd; color: #0369a1; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.manager_report}">${_clampText(item.manager_report)}</td>
                    <td style="padding: 8px 6px; background: #f0f9ff; color: #0369a1; word-break: break-word; line-height: 1.35; font-size: 12px; white-space: pre-wrap;" title="${item.employee_report}">${_clampText(item.employee_report)}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
            <div style="margin-top: 8px; font-size: 11px; color: #64748b; text-align: right; font-style: italic;">
                💡 Mẹo: Bảng được tự động căn vừa 100% màn hình. Bấm vào bất kỳ hàng nào để xem hồ sơ chi tiết và Chỉnh Sửa / Xóa.
            </div>
        `;

        container.innerHTML = html;
    }

    // 📊 VIEW MODE 3: DIRECT MAIN PAGE EMPLOYEE ANALYTICAL BREAKDOWN SECTION (OPTION 2)
    function _getFormattedNow() {
        var d = new Date();
        var hh = String(d.getHours()).padStart(2, '0');
        var mm = String(d.getMinutes()).padStart(2, '0');
        var dd = String(d.getDate()).padStart(2, '0');
        var mo = String(d.getMonth() + 1).padStart(2, '0');
        var yy = String(d.getFullYear()).slice(-2);
        return `${hh}:${mm} ${dd}/${mo}/${yy}`;
    }

    
    function _formatShortDate(dateStr) {
        if (!dateStr || dateStr === '--') return '--';
        if (dateStr.includes('-')) {
            var parts = dateStr.split('-');
            if (parts.length === 3) {
                var yy = parts[0].slice(-2);
                return `${parts[2]}/${parts[1]}/${yy}`;
            }
        }
        return dateStr.replace('/2026', '/26').replace('/2025', '/25').replace('/2024', '/24');
    }
    
    function _formatShortKy(txt) {
        if (!txt) return '--';
        var s = txt.replace('/2026', '/26').replace('/2025', '/25').replace('/2024', '/24').replace('Tháng ', 'T');
        var parts = s.split(' ');
        if (parts.length === 2) {
            return `${parts[0]}<br>${parts[1]}`;
        }
        return s;
    }

    function _clampText(txt) {
        if (!txt) return '--';
        return txt.length > 45 ? txt.substring(0, 42) + '...' : txt;
    }

    // Modal Detail View
    window._eeOpenDetailModal = function(id) {
        var item = _eeState.items.find(function(x) { return x.id === id; });
        if (!item) return;

        var existing = document.getElementById('eeDetailModal');
        if (existing) existing.remove();

        var modal = document.createElement('div');
        modal.id = 'eeDetailModal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15,23,42,0.65); backdrop-filter: blur(4px); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';

        var typeBadgeHtml = (item.eval_type === 'Lỗi Vi Phạm')
            ? '<span style="background: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px;">⚠️ LỖI VI PHẠM</span>'
            : '<span style="background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px;">💡 CẦN CẢI THIỆN</span>';

        // Short date formatting helper (YYYY -> YY)
        var shortMonthYear = (item.month_year || '--').replace('/2026', '/26').replace('/2025', '/25').replace('/2024', '/24');
        var shortDeadline = (item.resolution_deadline || '--').replace('2026-', '').replace('2025-', '').replace('2024-', '');
        if (item.resolution_deadline && item.resolution_deadline.includes('-')) {
            var dParts = item.resolution_deadline.split('-');
            if (dParts.length === 3) {
                var yyShort = dParts[0].slice(-2);
                shortDeadline = `${dParts[2]}/${dParts[1]}/${yyShort}`;
            }
        }

        var hasSec2Data = (item.employee_opinion && item.employee_opinion.trim()) || (item.employee_commitment && item.employee_commitment.trim());
        var hasSec3Data = (item.manager_report && item.manager_report.trim()) || (item.employee_report && item.employee_report.trim());

        modal.innerHTML = `
            <div style="background: white; border-radius: 18px; width: 100%; max-width: 820px; max-height: 88vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); border: 1px solid #e2e8f0; font-family: Inter, system-ui, sans-serif;">
                <!-- Fixed Header Bar -->
                <div style="padding: 16px 24px; background: linear-gradient(135deg, #1e3a8a, #2563eb); color: white; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                    <div>
                        <h2 style="font-size: 17px; font-weight: 900; margin: 0; display: flex; align-items: center; gap: 8px;">
                            <span>👤</span> Hồ Sơ Đánh Giá: ${item.employee_name || '--'}
                        </h2>
                        <p style="margin: 4px 0 0 0; font-size: 12px; color: #93c5fd;">
                            Bộ phận: <strong style="color: white;">${item.department || '--'}</strong> • Kỳ đánh giá: <strong style="color: white;">${shortMonthYear}</strong>
                        </p>
                    </div>
                    <button onclick="document.getElementById('eeDetailModal').remove()" style="background: rgba(255,255,255,0.15); border: none; color: white; width: 32px; height: 32px; border-radius: 8px; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">✕</button>
                </div>

                <!-- Scrollable Body (Spacious 20px gaps between sections) -->
                <div style="padding: 20px 24px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 20px;">
                    
                    <!-- Section 1: Manager Eval -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
                            <h3 style="font-size: 14px; font-weight: 800; color: #1e3a8a; margin: 0; display: flex; align-items: center; gap: 6px;">
                                <span>👨‍💼</span> 1. ĐÁNH GIÁ TỪ QUẢN LÝ
                            </h3>
                            <div>${typeBadgeHtml}</div>
                        </div>

                        <!-- 16px vertical gaps between internal elements for maximum clarity -->
                        <div style="display: flex; flex-direction: column; gap: 16px; font-size: 12.5px;">
                            
                            <!-- Position 1: PRIMARY CONTENT - NỘI DUNG CHI TIẾT (CẢI THIỆN / LỖI) -->
                            <div>
                                <div style="color: #be123c; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 6px;">⚠️ NỘI DUNG CHI TIẾT (CẢI THIỆN / LỖI) — NỘI DUNG CHÍNH:</div>
                                <div style="color: #9f1239; background: #fff1f2; padding: 12px 16px; border-radius: 10px; border: 1px solid #fecdd3; border-left: 5px solid #e11d48; font-weight: 700; white-space: pre-wrap; font-size: 13.5px; line-height: 1.45; box-shadow: 0 2px 8px rgba(225,29,72,0.06);">${item.improvement_errors || '--'}</div>
                            </div>

                            <!-- Position 2: FRAMED CARD - ĐÁNH GIÁ NĂNG LỰC -->
                            <div>
                                <div style="color: #475569; font-size: 12px; font-weight: 700; margin-bottom: 6px;">📊 Đánh giá năng lực:</div>
                                <div style="color: #0f172a; background: white; border: 1px solid #cbd5e1; padding: 10px 14px; border-radius: 8px; font-weight: 600; white-space: pre-wrap; font-size: 12.5px; line-height: 1.45;">${item.manager_evaluation || '--'}</div>
                            </div>

                            <!-- Position 3: 2 Cột song song: Khắc phục & Đào tạo -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                                <div>
                                    <div style="color: #2563eb; font-weight: 700; font-size: 12px; margin-bottom: 6px;">🛠️ Nội dung khắc phục:</div>
                                    <div style="color: #1d4ed8; background: #eff6ff; border: 1px solid #bfdbfe; padding: 10px 14px; border-radius: 8px; white-space: pre-wrap; font-size: 12.5px; line-height: 1.45;">${item.remediation_action || '--'}</div>
                                </div>
                                <div>
                                    <div style="color: #7c3aed; font-weight: 700; font-size: 12px; margin-bottom: 6px;">🎓 Hướng đào tạo:</div>
                                    <div style="color: #6d28d9; background: #f5f3ff; border: 1px solid #ddd6fe; padding: 10px 14px; border-radius: 8px; white-space: pre-wrap; font-size: 12.5px; line-height: 1.45;">${item.training_direction || '--'}</div>
                                </div>
                            </div>

                            <!-- Position 4: Cam kết quản lý -->
                            <div>
                                <div style="color: #059669; font-weight: 700; font-size: 12px; margin-bottom: 6px;">🤝 Cam kết của Quản lý:</div>
                                <div style="color: #047857; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 10px 14px; border-radius: 8px; white-space: pre-wrap; font-size: 12.5px; line-height: 1.45;">${item.manager_commitment || '--'}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Section 2: Employee Input -->
                    <div style="background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 14px; padding: 18px 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                            <h3 style="font-size: 14px; font-weight: 800; color: #be185d; margin: 0; display: flex; align-items: center; gap: 6px;">
                                <span>💬</span> 2. Ý KIẾN & CAM KẾT TỪ NHÂN SỰ
                            </h3>
                            ${(shortDeadline && shortDeadline !== '--') ? `<span style="background: #fce7f3; color: #9d174d; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 11.5px;">📅 Hạn xử lý: ${shortDeadline}</span>` : ''}
                        </div>

                        ${!hasSec2Data ? `
                            <div style="padding: 12px 16px; background: #fffbebf5; border: 1px dashed #fcd34d; border-radius: 8px; color: #b45309; font-size: 12.5px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                                <span>⏳</span> Đang chờ Nhân sự phản hồi ý kiến & cam kết khắc phục.
                            </div>
                        ` : `
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 12.5px;">
                                <div>
                                    <div style="color: #9d174d; font-size: 12px; font-weight: 700; margin-bottom: 6px;">Ý kiến nhân sự:</div>
                                    <div style="color: #831843; background: white; padding: 10px 14px; border-radius: 8px; border: 1px solid #fbcfe8; white-space: pre-wrap; font-size: 12.5px; line-height: 1.45;">${item.employee_opinion || '--'}</div>
                                </div>
                                <div>
                                    <div style="color: #9d174d; font-size: 12px; font-weight: 700; margin-bottom: 6px;">Cam kết nhân sự:</div>
                                    <div style="color: #831843; background: white; padding: 10px 14px; border-radius: 8px; border: 1px solid #fbcfe8; white-space: pre-wrap; font-size: 12.5px; line-height: 1.45;">${item.employee_commitment || '--'}</div>
                                </div>
                            </div>
                        `}
                    </div>

                    <!-- Section 3: Progress Report -->
                    <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 14px; padding: 18px 20px;">
                        <h3 style="font-size: 14px; font-weight: 800; color: #0369a1; margin: 0 0 14px 0; display: flex; align-items: center; gap: 6px;">
                            <span>📊</span> 3. BÁO CÁO TIẾN ĐỘ THỰC HIỆN
                        </h3>

                        ${!hasSec3Data ? `
                            <div style="padding: 12px 16px; background: white; border: 1px dashed #cbd5e1; border-radius: 8px; color: #64748b; font-size: 12.5px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                                <span>⚪</span> Chưa tới thời hạn cập nhật Báo cáo tiến độ thực hiện.
                            </div>
                        ` : `
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 12.5px;">
                                <div>
                                    <div style="color: #0369a1; font-size: 12px; font-weight: 700; margin-bottom: 6px;">Quản lý báo cáo:</div>
                                    <div style="color: #0c4a6e; background: white; padding: 10px 14px; border-radius: 8px; border: 1px solid #bae6fd; white-space: pre-wrap; font-size: 12.5px; line-height: 1.45;">${item.manager_report || '--'}</div>
                                </div>
                                <div>
                                    <div style="color: #0369a1; font-size: 12px; font-weight: 700; margin-bottom: 6px;">Nhân sự báo cáo:</div>
                                    <div style="color: #0c4a6e; background: white; padding: 10px 14px; border-radius: 8px; border: 1px solid #bae6fd; white-space: pre-wrap; font-size: 12.5px; line-height: 1.45;">${item.employee_report || '--'}</div>
                                </div>
                            </div>
                        `}
                    </div>

                </div>

                <!-- Sticky Compact Footer Bar -->
                <div style="padding: 14px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; flex-shrink: 0;">
                    <div style="font-size: 12px; color: #64748b;">
                        💡 ID Hồ sơ: <strong>#${item.id}</strong> • Thời gian tạo: <strong>${shortMonthYear}</strong>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="document.getElementById('eeDetailModal').remove(); window._eeOpenFormModal(${item.id});" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: 700; font-size: 12.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(59,130,246,0.3); transition: transform 0.1s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                            ✏️ Chỉnh Sửa
                        </button>
                        <button onclick="document.getElementById('eeDetailModal').remove(); window._eeDelete(${item.id});" style="padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: 700; font-size: 12.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(239,68,68,0.3); transition: transform 0.1s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                            🗑️ Xóa Hồ Sơ
                        </button>
                        <button onclick="document.getElementById('eeDetailModal').remove()" style="padding: 8px 14px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 8px; font-weight: 700; font-size: 12.5px; cursor: pointer;">
                            ✖️ Đóng
                        </button>
                    </div>
                </div>

            </div>
        `;

        document.body.appendChild(modal);
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
    window._eeOpenFormModal = async function(editId) {
        if (!_eeState.users || _eeState.users.length === 0) {
            try {
                var uRes = await apiCall('/api/users/dropdown');
                _eeState.users = (uRes && uRes.users) ? uRes.users : [];
            } catch(e) {}
        }
        var item = editId ? _eeState.items.find(i => i.id === editId) : null;
        var modalContainer = document.getElementById('eeModalContainer');
        if (!modalContainer) return;

        var nowFormatted = _getFormattedNow();
        var timeValue = item ? (item.month_year || nowFormatted) : nowFormatted;
        var currentEvalType = item ? (item.eval_type || 'Cần Cải Thiện') : 'Cần Cải Thiện';

        modalContainer.innerHTML = `
            <div style="position: fixed; inset: 0; background: rgba(15,23,42,0.65); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
                <div style="background: white; border-radius: 20px; width: 100%; max-width: 920px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                    <!-- Header -->
                    <div style="padding: 18px 24px; background: linear-gradient(135deg, #1e3a8a, #1e40af); border-radius: 20px 20px 0 0; color: white; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                                <span>${item ? '✏️ Chỉnh Sửa' : '➕ Thêm'} Đánh Giá Nhân Sự</span>
                            </h3>
                            <div style="font-size: 11px; color: #93c5fd; margin-top: 2px;">Vui lòng chọn Bộ Phận -> Nhân Sự -> Phân Loại và nhập đủ các trường ở Mục 1 để lưu.</div>
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
                                <span style="font-size: 11px; font-weight: 800; background: #dbeafe; color: #1e40af; padding: 3px 10px; border-radius: 12px;">Bắt buộc điền đủ 100% Mục 1</span>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                                <!-- Row 1: Time & Department -->
                                <div>
                                    <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">🕒 Thời Gian Đánh Giá <span style="color: #dc2626;">*</span></label>
                                    <input id="formMonthYear" type="text" value="${timeValue}" readonly style="width: 100%; padding: 9px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; box-sizing: border-box; background: #f1f5f9; cursor: not-allowed; font-weight: 700; color: #1e40af;">
                                </div>

                                <div>
                                    <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">🏢 1. Chọn Bộ Phận <span style="color: #dc2626;">*</span></label>
                                    <select id="formDepartment" style="width: 100%; padding: 9px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; box-sizing: border-box;" onchange="window._eeOnDeptChange()">
                                        <option value="">-- Chọn Bộ Phận --</option>
                                        ${DEPARTMENTS.map(d => `<option value="${d}" ${(item && item.department === d) ? 'selected' : ''}>${d}</option>`).join('')}
                                    </select>
                                </div>

                                <!-- Row 2: Employee Select & Eval Classification -->
                                <div>
                                    <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">👤 2. Chọn Nhân Sự <span style="color: #dc2626;">*</span></label>
                                    <select id="formEmpSelect" style="width: 100%; padding: 9px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; box-sizing: border-box;" onchange="window._eeCheckSectionLocks()">
                                        <option value="">-- Vui lòng chọn Bộ Phận trước --</option>
                                    </select>
                                </div>

                                <div>
                                    <label style="display: block; font-size: 12px; font-weight: 700; color: #dc2626; margin-bottom: 6px;">🏷️ 3. Phân Loại Đánh Giá <span style="color: #dc2626;">*</span></label>
                                    <select id="formEvalType" style="width: 100%; padding: 9px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; box-sizing: border-box; font-weight: 700;" onchange="window._eeCheckSectionLocks()">
                                        <option value="Cần Cải Thiện" ${currentEvalType === 'Cần Cải Thiện' ? 'selected' : ''}>💡 Cần Cải Thiện</option>
                                        <option value="Lỗi Vi Phạm" ${currentEvalType === 'Lỗi Vi Phạm' ? 'selected' : ''}>⚠️ Lỗi Vi Phạm</option>
                                    </select>
                                </div>

                                <!-- Row 3: Full Width Content Area -->
                                <div style="grid-column: span 2;">
                                    <label style="display: block; font-size: 12px; font-weight: 700; color: #dc2626; margin-bottom: 6px;">⚠️ Nội Dung Chi Tiết (Cải Thiện / Lỗi) <span style="color: #dc2626;">*</span></label>
                                    <textarea id="formImprovementErrors" rows="2" placeholder="VD: Hay đi muộn, ẩu kích thước..." style="width: 100%; padding: 9px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; box-sizing: border-box; resize: vertical;" oninput="window._eeCheckSectionLocks()">${item ? (item.improvement_errors || '') : ''}</textarea>
                                </div>

                                <!-- Row 4: Full Width Manager Evaluation -->
                                <div style="grid-column: span 2;">
                                    <label style="display: block; font-size: 12px; font-weight: 700; color: #1e3a8a; margin-bottom: 6px;">📊 Đánh Giá Năng Lực NV Của Quản Lý <span style="color: #dc2626;">*</span></label>
                                    <textarea id="formManagerEval" rows="2" placeholder="Nội dung đánh giá từ quản lý..." style="width: 100%; padding: 9px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; box-sizing: border-box; resize: vertical;" oninput="window._eeCheckSectionLocks()">${item ? (item.manager_evaluation || '') : ''}</textarea>
                                </div>

                                <!-- Row 5: Remediation Action & Training Direction -->
                                <div>
                                    <label style="display: block; font-size: 12px; font-weight: 700; color: #2563eb; margin-bottom: 6px;">🛠️ Nội Dung Khắc Phục (Hành động) <span style="color: #dc2626;">*</span></label>
                                    <textarea id="formRemediation" rows="2" placeholder="Công việc cần làm để sửa..." style="width: 100%; padding: 9px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; box-sizing: border-box; resize: vertical;" oninput="window._eeCheckSectionLocks()">${item ? (item.remediation_action || '') : ''}</textarea>
                                </div>

                                <div>
                                    <label style="display: block; font-size: 12px; font-weight: 700; color: #7c3aed; margin-bottom: 6px;">🎓 Hướng Đào Tạo <span style="color: #dc2626;">*</span></label>
                                    <textarea id="formTraining" rows="2" placeholder="Cần đào tạo thêm gì..." style="width: 100%; padding: 9px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; box-sizing: border-box; resize: vertical;" oninput="window._eeCheckSectionLocks()">${item ? (item.training_direction || '') : ''}</textarea>
                                </div>

                                <!-- Row 6: Manager Commitment -->
                                <div style="grid-column: span 2;">
                                    <label style="display: block; font-size: 12px; font-weight: 700; color: #059669; margin-bottom: 6px;">🤝 Cam Kết Của Quản Lý <span style="color: #dc2626;">*</span></label>
                                    <textarea id="formManagerCommit" rows="2" placeholder="Hỗ trợ của quản lý..." style="width: 100%; padding: 9px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; box-sizing: border-box; resize: vertical;" oninput="window._eeCheckSectionLocks()">${item ? (item.manager_commitment || '') : ''}</textarea>
                                </div>
                            </div>
                        </div>

                        <!-- 💬 MỤC 2: Ý KIẾN & CAM KẾT NHÂN SỰ -->
                        <div id="sec2Card" style="background: #fdf2f8; padding: 18px; border-radius: 14px; border: 2px solid #db2777; transition: all 0.2s;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                                <h4 style="margin: 0; font-size: 14px; font-weight: 800; color: #be185d; display: flex; align-items: center; gap: 6px;">
                                    <span>💬 MỤC 2: Ý KIẾN & CAM KẾT NHÂN SỰ</span>
                                </h4>
                                <span id="sec2Badge" style="font-size: 11px; font-weight: 800; background: #fee2e2; color: #991b1b; padding: 3px 10px; border-radius: 12px;">🔒 Khóa — Cần điền đủ Mục 1</span>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                                <div>
                                    <label style="display: block; font-size: 11px; font-weight: 700; color: #be185d; margin-bottom: 4px;">💬 Ý Kiến Nhân Sự <span style="color: #dc2626;">*</span></label>
                                    <textarea id="formEmpOpinion" rows="2" placeholder="Ý kiến phản hồi..." style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #f472b6; font-size: 12px; box-sizing: border-box; resize: vertical;" oninput="window._eeCheckSectionLocks()">${item ? (item.employee_opinion || '') : ''}</textarea>
                                </div>
                                <div>
                                    <label style="display: block; font-size: 11px; font-weight: 700; color: #be185d; margin-bottom: 4px;">⏰ Time Xử Lý (Hạn khắc phục) <span style="color: #dc2626;">*</span></label>
                                    <input id="formResolutionDeadline" type="date" value="${item ? (item.resolution_deadline || '') : ''}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #f472b6; font-size: 12px; box-sizing: border-box;" onchange="window._eeCheckSectionLocks()">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 11px; font-weight: 700; color: #be185d; margin-bottom: 4px;">🤝 Cam Kết Của Nhân Sự <span style="color: #dc2626;">*</span></label>
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
                                <span id="sec3Badge" style="font-size: 11px; font-weight: 800; background: #fee2e2; color: #991b1b; padding: 3px 10px; border-radius: 12px;">🔒 Khóa — Cần điền đủ Mục 2</span>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div>
                                    <label style="display: block; font-size: 11px; font-weight: 700; color: #0369a1; margin-bottom: 4px;">📝 Quản Lý Báo Cáo (Xử lý thế nào?) <span style="color: #dc2626;">*</span></label>
                                    <textarea id="formManagerReport" rows="2" placeholder="Cập nhật từ quản lý..." style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #38bdf8; font-size: 12px; box-sizing: border-box; resize: vertical;" oninput="window._eeCheckSectionLocks()">${item ? (item.manager_report || '') : ''}</textarea>
                                </div>
                                <div>
                                    <label style="display: block; font-size: 11px; font-weight: 700; color: #0369a1; margin-bottom: 4px;">📝 Nhân Sự Báo Cáo <span style="color: #dc2626;">*</span></label>
                                    <textarea id="formEmpReport" rows="2" placeholder="Báo cáo kết quả từ nhân sự..." style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #38bdf8; font-size: 12px; box-sizing: border-box; resize: vertical;" oninput="window._eeCheckSectionLocks()">${item ? (item.employee_report || '') : ''}</textarea>
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

        // Populate employee dropdown based on department selection
        window._eeOnDeptChange(item ? item.employee_name : null);
    };

    function _eeMatchDept(u, selectedDept) {
        if (!selectedDept || selectedDept === 'all') return true;
        if (!u) return false;

        var uDeptName = u.department_name || u.department || u.team_name || '';
        var uDeptId = Number(u.department_id) || 0;
        var uDeptLower = uDeptName.toLowerCase().trim();
        var selDeptLower = selectedDept.toLowerCase().trim();

        // Separate Kinh Doanh (IDs 1, 2, 3, 22, 23) vs Sale (IDs 4, 27) matching Teams (/teams) structure
        if (selDeptLower === 'kinh doanh') {
            if ([1, 2, 3, 22, 23].includes(uDeptId)) return true;
            if (uDeptLower.includes('kinh doanh') || uDeptLower.includes('cất cánh') || uDeptLower.includes('xã hội')) return true;
            return false;
        }
        if (selDeptLower === 'sale') {
            if ([4, 27].includes(uDeptId)) return true;
            if (uDeptLower.includes('sale') || uDeptLower.includes('bứt phá')) return true;
            return false;
        }
        if (selDeptLower === 'marketing') {
            if (uDeptId === 6 || uDeptLower.includes('marketing')) return true;
            return false;
        }
        if (selDeptLower === 'thiết kế') {
            if (uDeptId === 5 || uDeptLower.includes('thiết kế')) return true;
            return false;
        }
        if (selDeptLower === 'may') {
            if ([14, 24, 26].includes(uDeptId) || uDeptLower.includes('may')) return true;
            return false;
        }
        if (selDeptLower === 'cắt') {
            if (uDeptId === 8 || uDeptLower.includes('cắt')) return true;
            return false;
        }
        if (selDeptLower === 'in') {
            if (uDeptId === 12 || uDeptLower.includes('in')) return true;
            return false;
        }
        if (selDeptLower === 'ép') {
            if (uDeptId === 13 || uDeptLower.includes('ép')) return true;
            return false;
        }
        if (selDeptLower === 'hoàn thiện') {
            if (uDeptId === 15 || uDeptLower.includes('hoàn thiện')) return true;
            return false;
        }
        if (selDeptLower === 'kho') {
            if (uDeptId === 18 || uDeptLower.includes('kho')) return true;
            return false;
        }
        if (selDeptLower === 'văn phòng') {
            if ([10, 17, 19].includes(uDeptId) || uDeptLower.includes('văn phòng') || uDeptLower.includes('hành chính') || uDeptLower.includes('thủ quỹ')) return true;
            return false;
        }

        if (uDeptLower && (uDeptLower.includes(selDeptLower) || selDeptLower.includes(uDeptLower))) return true;

        return false;
    }

    window._eeOnDeptChange = function(selectedEmpName) {
        var deptSel = document.getElementById('formDepartment');
        var empSel = document.getElementById('formEmpSelect');
        if (!deptSel || !empSel) return;

        var selectedDept = deptSel.value;
        empSel.innerHTML = '';

        if (!selectedDept) {
            empSel.disabled = true;
            empSel.innerHTML = '<option value="">-- Vui lòng chọn Bộ Phận trước --</option>';
        } else {
            empSel.disabled = false;
            var filteredUsers = _eeState.users.filter(function(u) {
                return _eeMatchDept(u, selectedDept);
            });

            if (filteredUsers.length === 0) {
                empSel.innerHTML = '<option value="">-- Không có nhân sự thuộc bộ phận này --</option>';
            } else {
                empSel.innerHTML = '<option value="">-- Chọn Nhân Sự --</option>';
                filteredUsers.forEach(function(u) {
                    var name = u.full_name || u.username;
                    var isSel = (selectedEmpName && selectedEmpName === name) ? 'selected' : '';
                    empSel.innerHTML += `<option value="${name}" data-id="${u.id}" ${isSel}>${name}</option>`;
                });
            }
        }

        window._eeCheckSectionLocks();
    };

    window._eeCheckSectionLocks = function() {
        var dept = document.getElementById('formDepartment') ? document.getElementById('formDepartment').value : '';
        var empSel = document.getElementById('formEmpSelect') ? document.getElementById('formEmpSelect').value : '';
        var evalType = document.getElementById('formEvalType') ? document.getElementById('formEvalType').value : '';
        var errors = document.getElementById('formImprovementErrors') ? document.getElementById('formImprovementErrors').value.trim() : '';
        var evalText = document.getElementById('formManagerEval') ? document.getElementById('formManagerEval').value.trim() : '';
        var remediation = document.getElementById('formRemediation') ? document.getElementById('formRemediation').value.trim() : '';
        var training = document.getElementById('formTraining') ? document.getElementById('formTraining').value.trim() : '';
        var managerCommit = document.getElementById('formManagerCommit') ? document.getElementById('formManagerCommit').value.trim() : '';

        // Strict Section 1 Validation: MUST fill ALL 8 fields
        var sec1Complete = Boolean(dept && empSel && evalType && errors && evalText && remediation && training && managerCommit);

        var sec2Card = document.getElementById('sec2Card');
        var sec2Badge = document.getElementById('sec2Badge');
        var sec2Inputs = sec2Card ? sec2Card.querySelectorAll('input, select, textarea') : [];

        if (sec1Complete) {
            if (sec2Card) { sec2Card.style.opacity = '1'; sec2Card.style.pointerEvents = 'auto'; }
            if (sec2Badge) { sec2Badge.innerHTML = '🟢 Đã sẵn sàng nhập'; sec2Badge.style.background = '#dcfce7'; sec2Badge.style.color = '#166534'; }
            sec2Inputs.forEach(el => el.removeAttribute('disabled'));
        } else {
            if (sec2Card) { sec2Card.style.opacity = '0.5'; sec2Card.style.pointerEvents = 'none'; }
            if (sec2Badge) { sec2Badge.innerHTML = '🔒 Khóa — Cần điền đủ 100% Mục 1'; sec2Badge.style.background = '#fee2e2'; sec2Badge.style.color = '#991b1b'; }
            sec2Inputs.forEach(el => el.setAttribute('disabled', 'disabled'));
        }

        var empOpinion = document.getElementById('formEmpOpinion') ? document.getElementById('formEmpOpinion').value.trim() : '';
        var deadline = document.getElementById('formResolutionDeadline') ? document.getElementById('formResolutionDeadline').value : '';
        var empCommit = document.getElementById('formEmpCommitment') ? document.getElementById('formEmpCommitment').value.trim() : '';

        // Strict Section 2 Validation: MUST fill ALL 3 fields
        var sec2Complete = sec1Complete && Boolean(empOpinion && deadline && empCommit);

        var sec3Card = document.getElementById('sec3Card');
        var sec3Badge = document.getElementById('sec3Badge');
        var sec3Inputs = sec3Card ? sec3Card.querySelectorAll('input, select, textarea') : [];

        if (sec2Complete) {
            if (sec3Card) { sec3Card.style.opacity = '1'; sec3Card.style.pointerEvents = 'auto'; }
            if (sec3Badge) { sec3Badge.innerHTML = '🟢 Đã sẵn sàng nhập'; sec3Badge.style.background = '#dcfce7'; sec3Badge.style.color = '#166534'; }
            sec3Inputs.forEach(el => el.removeAttribute('disabled'));
        } else {
            if (sec3Card) { sec3Card.style.opacity = '0.5'; sec3Card.style.pointerEvents = 'none'; }
            if (sec3Badge) { sec3Badge.innerHTML = '🔒 Khóa — Cần điền đủ 100% Mục 2'; sec3Badge.style.background = '#fee2e2'; sec3Badge.style.color = '#991b1b'; }
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

    window._eeCloseModal = function() {
        var container = document.getElementById('eeModalContainer');
        if (container) container.innerHTML = '';
    };

    window._eeSaveForm = async function(editId) {
        var monthYear = document.getElementById('formMonthYear').value.trim();
        var dept = document.getElementById('formDepartment').value;
        var empSel = document.getElementById('formEmpSelect');
        var empName = empSel ? empSel.value : '';
        var optSelected = empSel ? empSel.options[empSel.selectedIndex] : null;
        var userId = optSelected ? optSelected.getAttribute('data-id') : null;
        var evalType = document.getElementById('formEvalType') ? document.getElementById('formEvalType').value : 'Cần Cải Thiện';

        var errors = document.getElementById('formImprovementErrors').value.trim();
        var managerEval = document.getElementById('formManagerEval').value.trim();
        var remediation = document.getElementById('formRemediation').value.trim();
        var training = document.getElementById('formTraining').value.trim();
        var managerCommit = document.getElementById('formManagerCommit').value.trim();

        // 1. Strict Validation Section 1
        if (!dept || !empName || !evalType || !errors || !managerEval || !remediation || !training || !managerCommit) {
            showToast('⚠️ Vui lòng điền đầy đủ 100% tất cả các trường thông tin ở Mục 1 (👨‍💼 ĐÁNH GIÁ TỪ QUẢN LÝ)!', 'warning');
            return;
        }

        var empOpinion = document.getElementById('formEmpOpinion').value.trim();
        var deadline = document.getElementById('formResolutionDeadline').value;
        var empCommit = document.getElementById('formEmpCommitment').value.trim();

        // 2. Validation Section 2 if user filled any part of section 2
        if (empOpinion || deadline || empCommit) {
            if (!empOpinion || !deadline || !empCommit) {
                showToast('⚠️ Vui lòng điền đầy đủ 100% các trường ở Mục 2 (Ý Kiến, Hạn Xử Lý & Cam Kết Nhân Sự)!', 'warning');
                return;
            }
        }

        var managerReport = document.getElementById('formManagerReport').value.trim();
        var employeeReport = document.getElementById('formEmpReport').value.trim();

        // 3. Validation Section 3 if user filled any part of section 3
        if (managerReport || employeeReport) {
            if (!managerReport || !employeeReport) {
                showToast('⚠️ Vui lòng điền đầy đủ 100% các trường ở Mục 3 (Báo Cáo Tiến Độ từ Quản Lý và Nhân Sự)!', 'warning');
                return;
            }
        }

        var body = {
            month_year: monthYear,
            user_id: userId || null,
            employee_name: empName,
            department: dept,
            eval_type: evalType,
            improvement_errors: errors,
            manager_evaluation: managerEval,
            remediation_action: remediation,
            training_direction: training,
            manager_commitment: managerCommit,
            employee_opinion: empOpinion,
            resolution_deadline: deadline,
            employee_commitment: empCommit,
            manager_report: managerReport,
            employee_report: employeeReport
        };

        try {
            var url = '/api/employee-evaluations';
            var method = 'POST';
            if (editId) {
                url += '/' + editId;
                method = 'PUT';
            }

            var res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            var data = await res.json();
            if (data.success) {
                showToast(editId ? '✅ Cập nhật đánh giá thành công!' : '✅ Thêm mới đánh giá thành công!', 'success');
                window._eeCloseModal();

                // Auto-sync year filter to the year of the new record so it immediately shows up!
                var createdYear = '2026';
                if (monthYear.includes('2026') || monthYear.includes('/26')) createdYear = '2026';
                else if (monthYear.includes('2025') || monthYear.includes('/25')) createdYear = '2025';

                if (_eeState.filterYear !== 'all' && _eeState.filterYear !== createdYear) {
                    _eeState.filterYear = createdYear;
                    var ySelect = document.getElementById('eeFilterYear');
                    if (ySelect) ySelect.value = createdYear;
                }

                // Reset statFilter so active card filters do not hide the new record
                _eeState.statFilter = 'all';

                _eeLoadData();
            } else {
                showToast('❌ Lỗi: ' + (data.error || 'Không thể lưu'), 'error');
            }
        } catch (err) {
            console.error('Error saving evaluation:', err);
            showToast('❌ Lỗi kết nối hệ thống', 'error');
        }
    };
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
