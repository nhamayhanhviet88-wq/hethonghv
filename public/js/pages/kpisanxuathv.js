/* ===== KPI SẢN XUẤT — BỘ PHẬN CẮT — DESKTOP PAGE ===== */

(function () {
    var _kpiProdState = {
        year: new Date().getFullYear(),
        department: 'cutting',
        selectedStaffId: 'all',
        expandedQuarters: {},
        data: null,
        loading: false,
        userRole: 'unknown'
    };

    // Department label/icon mapping
    var _kpiProdDeptInfo = {
        cutting:   { label: 'Bộ Phận Cắt',         icon: '✂️', productLabel: 'Sản Phẩm Cắt',     color: '#f59e0b' },
        printing:  { label: 'Bộ Phận In',          icon: '🖨️', productLabel: 'Sản Phẩm In',      color: '#3b82f6' },
        pressing:  { label: 'Bộ Phận Ép',          icon: '🔥', productLabel: 'Sản Phẩm Ép',      color: '#ef4444' },
        sewing:    { label: 'Bộ Phận May',         icon: '🪡', productLabel: 'Sản Phẩm May',     color: '#10b981' },
        qc:        { label: 'Kiểm Tra CL',           icon: '✅', productLabel: 'Đơn Kiểm Tra',      color: '#8b5cf6' },
        finishing: { label: 'Hoàn Thiện',           icon: '📦', productLabel: 'Sản Phẩm HT',      color: '#06b6d4' }
    };

    window._kpiProdChangeStaffFilter = function(staffId) {
        _kpiProdState.selectedStaffId = staffId === 'all' ? 'all' : parseInt(staffId, 10);
        if (_kpiProdState.data) {
            const contentEl = document.getElementById('kpiProdContent');
            if (contentEl) _kpiProdRenderContent(contentEl, _kpiProdState.data);
        }
    };

    window._kpiProdToggleQuarterExpand = function(quarterId) {
        if (!_kpiProdState.expandedQuarters) _kpiProdState.expandedQuarters = {};
        _kpiProdState.expandedQuarters[quarterId] = !_kpiProdState.expandedQuarters[quarterId];
        if (_kpiProdState.data) {
            const contentEl = document.getElementById('kpiProdContent');
            if (contentEl) _kpiProdRenderContent(contentEl, _kpiProdState.data);
        }
    };

    var _resizeHandler = null;

    function _canEditReconfiguration() {
        if (typeof currentUser === 'undefined' || !currentUser) return false;
        if (currentUser.role === 'giam_doc' || currentUser.role === 'admin' || currentUser.username === 'admin') return true;
        if (currentUser.username === 'trinh') return true;
        return false;
    }

    function _isMonthConfigured(m) {
        if (!_kpiProdState.data) return false;

        // 1. Check if team/staff targets exist in target_rows for this month
        const tRows = _kpiProdState.data.target_rows || [];
        const hasTeamTarget = tRows.some(r => parseInt(r.month, 10) === parseInt(m, 10) && (
            Number(r.target_products || 0) > 0 ||
            Number(r.target_errors || 0) > 0 ||
            Number(r.target_rate || 0) > 0 ||
            (r.reward_text && String(r.reward_text).trim() !== '')
        ));
        if (hasTeamTarget) return true;

        // 2. Check if specific month commitments, supports, or reward text exist
        const cfg = _kpiProdState.data.dept_configs?.[m] || _kpiProdState.data.monthly_data?.[m]?.config || null;
        if (cfg) {
            if (Array.isArray(cfg.commitments) && cfg.commitments.some(c => String(c).trim() !== '')) return true;
            if (Array.isArray(cfg.supports) && cfg.supports.some(s => String(s).trim() !== '')) return true;
            if (cfg.reward_text && String(cfg.reward_text).trim() !== '') return true;
        }

        return false;
    }

    function _computeRollingTargets(md, staff, currentMonth, isCurrentYear) {
        const rolling = {};
        for (let m = 1; m <= 12; m++) rolling[m] = {};

        staff.forEach(st => {
            let quarterExtraShortfall = 0;

            for (let q = 1; q <= 4; q++) {
                const qMonths = [(q - 1) * 3 + 1, (q - 1) * 3 + 2, (q - 1) * 3 + 3];
                const remQuarters = 4 - q + 1;
                const extraPerMonthFromPastQuarters = Math.round(quarterExtraShortfall / (remQuarters * 3));

                let qTotalBaseTarget = 0;
                let qTotalActual = 0;
                let qIsCompleted = true;
                let monthInQuarterShortfall = 0;

                for (let idx = 0; idx < qMonths.length; idx++) {
                    const m = qMonths[idx];
                    const sEntry = md[m]?.staff?.find(s => s.user_id === st.id) || {};
                    const baseTarget = sEntry.target_products || 0;
                    const actual = sEntry.products_done || 0;
                    const totalMins = sEntry.total_minutes || 0;

                    qTotalBaseTarget += baseTarget;
                    qTotalActual += actual;

                    const isPast = isCurrentYear ? (m < currentMonth || totalMins > 0) : (totalMins > 0);
                    if (!isPast) qIsCompleted = false;

                    const remMonthsInQ = 3 - idx;
                    const extraFromInQuarter = Math.round(monthInQuarterShortfall / remMonthsInQ);

                    const adjustedTarget = isPast
                        ? baseTarget
                        : (baseTarget + extraFromInQuarter + extraPerMonthFromPastQuarters);

                    const rolledGap = adjustedTarget - baseTarget;

                    rolling[m][st.id] = {
                        base_target: baseTarget,
                        adjusted_target: adjustedTarget,
                        rolled_gap: rolledGap > 0 ? rolledGap : 0,
                        is_past: isPast
                    };

                    if (isPast) {
                        const shortfall = Math.max(0, adjustedTarget - actual);
                        monthInQuarterShortfall += shortfall;
                    }
                }

                if (qIsCompleted) {
                    const qShortfall = Math.max(0, qTotalBaseTarget - qTotalActual);
                    if (qShortfall > 0) {
                        quarterExtraShortfall += qShortfall;
                    }
                }
            }
        });

        return rolling;
    }

    function _canInputKpiProd() {
        if (typeof currentUser === 'undefined' || !currentUser) return false;
        if (currentUser.role === 'giam_doc' || currentUser.role === 'admin' || currentUser.username === 'admin') return true;
        
        if (typeof canDo === 'function') {
            if (typeof userPermissions !== 'undefined' && userPermissions && userPermissions['kpi_san_xuat']) {
                return canDo('kpi_san_xuat', 'create');
            }
            if (typeof userPermissions !== 'undefined' && userPermissions && userPermissions['kpi_san_xuat_nhap_lieu']) {
                return canDo('kpi_san_xuat_nhap_lieu', 'create') || canDo('kpi_san_xuat_nhap_lieu', 'edit');
            }
        }

        return ['quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(currentUser.role);
    }

    async function renderKpisanxuathvPage(container) {
        if (!container) {
            container = document.getElementById('contentArea') || document.getElementById('ceoMain') || document.getElementById('mainContent');
        }
        if (!container) return;

        const isDirectorUser = typeof currentUser !== 'undefined' && currentUser && (currentUser.role === 'giam_doc' || currentUser.role === 'admin' || currentUser.username === 'admin');
        const canEditConfig = isDirectorUser || (typeof canDo === 'function' && canDo('kpi_san_xuat', 'edit'));
        const canInputData = _canInputKpiProd();
        const canSaveAll = isDirectorUser || canEditConfig || canInputData;

        // Fetch or get user department permissions for KPI production
        let allowedDepts = null;
        if (typeof currentUser !== 'undefined' && currentUser && currentUser.kpi_production_departments !== undefined) {
            allowedDepts = currentUser.kpi_production_departments;
        } else {
            try {
                const meResp = await fetch('/api/auth/me', {
                    headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') }
                });
                if (meResp.ok) {
                    const me = await meResp.json();
                    if (me.user) {
                        if (typeof currentUser !== 'undefined' && currentUser) currentUser.kpi_production_departments = me.user.kpi_production_departments;
                        allowedDepts = me.user.kpi_production_departments;
                    }
                }
            } catch(e) {}
        }
        _kpiProdState.allowedDepts = allowedDepts;

        if (Array.isArray(allowedDepts)) {
            if (allowedDepts.length > 0 && !allowedDepts.includes(_kpiProdState.department)) {
                _kpiProdState.department = allowedDepts[0];
            }
        }

        const now = typeof vnNow === 'function' ? vnNow() : new Date();
        const realCurrentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        const topYear = Math.max(realCurrentYear, _kpiProdState.year);
        const yearList = [];
        for (let y = topYear; y >= 2024; y--) yearList.push(y);
        if (!yearList.includes(_kpiProdState.year)) {
            yearList.push(_kpiProdState.year);
            yearList.sort((a, b) => b - a);
        }

        const yearOptionsHtml = yearList.map(y => `<option value="${y}" ${y === _kpiProdState.year ? 'selected' : ''}>Năm ${y}</option>`).join('');

        container.innerHTML = `
        <div class="kpi-prod-wrap" style="font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif; padding: 4px; color: #0f172a;">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800;900&display=swap');

                .kpi-prod-wrap * { box-sizing: border-box; }
                .kpi-prod-header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 24px; background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%); padding: 18px 24px; border-radius: 20px; border: 1.5px solid #dbe2ea; box-shadow: 0 14px 30px -10px rgba(15, 23, 42, 0.10), 0 6px 14px -4px rgba(15, 23, 42, 0.06); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
                .kpi-prod-title { margin: 0; font-size: 22px; font-weight: 900; color: #0f172a; display: flex; align-items: center; gap: 12px; letter-spacing: -0.3px; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; }
                .kpi-prod-title span { display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; border-radius: 12px; font-size: 22px; box-shadow: 0 6px 18px rgba(245,158,11,0.4); }
                .kpi-prod-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

                /* Dept Tabs */
                .kpi-dept-tabs { display: flex; background: #f1f5f9; padding: 4px; border-radius: 12px; border: 1.5px solid #cbd5e1; }
                .kpi-dept-btn {
                    border: none; background: transparent; padding: 9px 18px; border-radius: 99px;
                    font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
                    font-size: 13.5px; font-weight: 800; color: #475569; cursor: pointer;
                    transition: all 0.2s; white-space: nowrap; letter-spacing: -0.2px;
                }
                .kpi-dept-btn.active {
                    background: #ffffff; color: #0f172a;
                    box-shadow: 0 3px 12px rgba(15, 23, 42, 0.12); font-weight: 900;
                }
                .kpi-dept-btn:hover:not(.active) { color: #0f172a; }

                .kpi-prod-year-select { padding: 9px 16px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13.5px; font-weight: 900; color: #0f172a; background: #fff; cursor: pointer; outline: none; transition: all 0.2s; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; }
                .kpi-prod-year-select:focus { border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,0.15); }

                .btn-save-kpi-prod { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; padding: 10px 20px; border-radius: 11px; font-weight: 900; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(245,158,11,0.3); transition: all 0.2s; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; }
                .btn-save-kpi-prod:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(245,158,11,0.4); }

                .btn-config-kpi-prod { background: linear-gradient(135deg, #4f46e5, #3730a3); color: white; border: none; padding: 10px 18px; border-radius: 11px; font-weight: 900; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(79,70,229,0.3); transition: all 0.2s; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; }
                .btn-config-kpi-prod:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(79,70,229,0.4); }

                /* Card Base - 3D Elevated Frame Effect for Khung 2, Khung 3, Khung 4 */
                .kpi-prod-card {
                    background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
                    border: 1.5px solid #dbe2ea;
                    border-radius: 20px;
                    padding: 24px;
                    box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.12), 0 8px 16px -6px rgba(15, 23, 42, 0.08), 0 1px 3px 0 rgba(15, 23, 42, 0.04);
                    margin-bottom: 24px;
                    width: 100%;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                }
                .kpi-prod-card:hover {
                    box-shadow: 0 26px 52px -15px rgba(15, 23, 42, 0.16), 0 12px 24px -6px rgba(15, 23, 42, 0.10), 0 2px 4px 0 rgba(15, 23, 42, 0.05);
                    transform: translateY(-2px);
                }
                .kpi-prod-card-title { font-size: 15.5px; font-weight: 900; color: #0f172a; margin: 0 0 18px 0; display: flex; justify-content: space-between; align-items: center; letter-spacing: -0.2px; flex-wrap: wrap; gap: 10px; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; }

                /* Top Layout */
                .kpi-prod-top-row { display: grid; grid-template-columns: 280px 1fr; gap: 24px; align-items: stretch; }
                @media (max-width: 992px) { .kpi-prod-top-row { grid-template-columns: 1fr; } }

                /* Donut Frame */
                .kpi-prod-donut-frame {
                    background: #ffffff; border: 1.5px solid #dbe2ea; border-radius: 16px;
                    padding: 18px 16px; display: flex; flex-direction: column; align-items: center; justify-content: center;
                    box-shadow: 0 8px 20px -4px rgba(15, 23, 42, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.9);
                }
                .kpi-prod-donut-canvas-wrap { position: relative; width: 155px; height: 155px; }
                .kpi-prod-donut-legend { display: flex; justify-content: center; gap: 10px; font-size: 11.5px; font-weight: 800; margin-top: 12px; flex-wrap: wrap; }
                .kpi-prod-legend-item { display: flex; align-items: center; gap: 4px; }
                .kpi-prod-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }

                /* Chart Frame */
                .kpi-prod-chart-frame {
                    background: #ffffff; border: 1.5px solid #dbe2ea; border-radius: 16px;
                    padding: 18px 14px 14px 14px; box-shadow: 0 8px 24px -6px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9); position: relative;
                }

                /* Table */
                .kpi-prod-table-responsive { width: 100%; overflow-x: auto; border-radius: 16px; border: 1.5px solid #1e293b; box-shadow: 0 12px 30px -6px rgba(15, 23, 42, 0.25), 0 4px 12px rgba(15, 23, 42, 0.12); }
                .kpi-prod-quarter-table { width: 100%; border-collapse: collapse; font-size: 12px; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; }
                .kpi-prod-quarter-table th {
                    background: linear-gradient(180deg, #283a62 0%, #172554 48%, #0f172a 100%);
                    color: #ffffff; padding: 10px 6px; text-align: center; border-bottom: 2px solid #0f172a;
                    white-space: nowrap; font-weight: 900; text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.15);
                }
                .kpi-prod-quarter-table th.th-tong {
                    background: linear-gradient(180deg, #d97706 0%, #b45309 48%, #853205 100%) !important;
                    color: #ffffff !important; text-shadow: 0 1px 2px rgba(0,0,0,0.5) !important;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.2) !important;
                }
                .kpi-prod-quarter-table td { padding: 8px 5px; text-align: center; border-bottom: 1px solid #f1f5f9; font-weight: 700; vertical-align: middle; white-space: nowrap; color: #1e293b; }
                .kpi-prod-quarter-table tr.row-total { background: #fef3c7 !important; font-weight: 900; color: #92400e !important; border-top: 2px solid #fde68a; }
                .kpi-prod-quarter-table tr.row-total td { color: #92400e; border-bottom: none; font-size: 12px; }
                .kpi-prod-badge {
                    display: inline-flex; align-items: center; justify-content: center;
                    padding: 3px 10px; border-radius: 8px; font-size: 10.5px; font-weight: 900;
                    text-transform: uppercase; white-space: nowrap; letter-spacing: -0.1px;
                    font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
                }
                .kpi-prod-badge-success { background: #dcfce7; color: #15803d; border: 1.5px solid #bbf7d0; }
                .kpi-prod-badge-danger { background: #fee2e2; color: #b91c1c; border: 1.5px solid #fca5a5; }
                .kpi-prod-badge-pending { background: #f1f5f9; color: #64748b; border: 1.5px solid #cbd5e1; }

                /* Monthly Grid */
                .kpi-prod-monthly-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 16px; }
                @media (max-width: 768px) { .kpi-prod-monthly-grid { grid-template-columns: 1fr; } }

                .kpi-prod-m-card {
                    background: #ffffff; border: 1.5px solid #dbe2ea; border-radius: 16px;
                    padding: 14px; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); position: relative;
                    box-shadow: 0 4px 16px -4px rgba(15, 23, 42, 0.06); font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
                }
                .kpi-prod-m-card:hover {
                    border-color: #f59e0b; transform: translateY(-3px);
                    box-shadow: 0 12px 28px -6px rgba(245, 158, 11, 0.22), 0 4px 12px -4px rgba(15, 23, 42, 0.1);
                }

                @keyframes _kpiProdBorderGlow {
                    0% { border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.45), 0 4px 22px rgba(245, 158, 11, 0.25); }
                    25% { border-color: #ec4899; box-shadow: 0 0 0 3.5px rgba(236, 72, 153, 0.45), 0 4px 24px rgba(236, 72, 153, 0.3); }
                    50% { border-color: #6366f1; box-shadow: 0 0 0 3.5px rgba(99, 102, 241, 0.45), 0 4px 24px rgba(99, 102, 241, 0.3); }
                    75% { border-color: #10b981; box-shadow: 0 0 0 3.5px rgba(16, 185, 129, 0.45), 0 4px 24px rgba(16, 185, 129, 0.3); }
                    100% { border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.45), 0 4px 22px rgba(245, 158, 11, 0.25); }
                }
                .kpi-prod-m-card.is-current-month {
                    border: 2.5px solid #f59e0b !important;
                    background: linear-gradient(180deg, #fffdf5 0%, #ffffff 100%) !important;
                    animation: _kpiProdBorderGlow 3s infinite linear !important;
                    z-index: 2;
                }

                .kpi-prod-m-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1.5px solid #f1f5f9; padding-bottom: 6px; }
                .kpi-prod-m-title { font-size: 14px; font-weight: 900; color: #0f172a; letter-spacing: -0.2px; }

                .kpi-prod-m-stats { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
                .kpi-prod-m-stat-pill {
                    display: inline-flex; align-items: center; gap: 3px;
                    padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800;
                    background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;
                }

                /* Staff table inside month card */
                .kpi-prod-staff-table { width: 100%; border-collapse: collapse; font-size: 11px; }
                .kpi-prod-staff-table th {
                    background: linear-gradient(180deg, #334155, #1e293b); color: #fff;
                    padding: 6px 5px; font-weight: 800; text-align: center; font-size: 10px;
                    white-space: nowrap;
                }
                .kpi-prod-staff-table td {
                    padding: 6px 5px; text-align: center; border-bottom: 1px solid #f1f5f9;
                    font-weight: 700; vertical-align: middle; white-space: nowrap; color: #1e293b; font-size: 11px;
                }
                .kpi-prod-staff-table td:first-child { text-align: left; }
                .kpi-prod-staff-table tbody tr:hover { background: #fffbeb; }

                .kpi-prod-input {
                    width: 52px; padding: 3px 4px; border: 1.5px solid #cbd5e1; border-radius: 6px;
                    font-size: 11px; font-weight: 900; color: #d97706; text-align: center;
                    outline: none; background: #ffffff; transition: all 0.2s;
                    font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
                }
                .kpi-prod-input:focus { border-color: #f59e0b; background: #fffdf5; box-shadow: 0 0 0 2px rgba(245,158,11,0.18); }
                .kpi-prod-input.saved-flash { border-color: #10b981 !important; box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.35) !important; background: #f0fdf4 !important; }

                /* Loading overlay */
                .kpi-prod-loading { text-align: center; padding: 60px; font-size: 16px; font-weight: 800; color: #94a3b8; }
            </style>

            <!-- Top Header -->
            <div class="kpi-prod-header">
                <h1 class="kpi-prod-title">
                    <span>🏭</span> KPI Sản Xuất
                </h1>
                <div class="kpi-prod-actions">
                    <!-- Dept Tabs -->
                    <div class="kpi-dept-tabs">
                        ${Object.entries(_kpiProdDeptInfo)
                            .filter(([key]) => !_kpiProdState.allowedDepts || _kpiProdState.allowedDepts.includes(key))
                            .map(([key, info]) => `
                                <button class="kpi-dept-btn ${_kpiProdState.department === key ? 'active' : ''}" onclick="window._kpiProdSwitchDept('${key}')">${info.icon} ${info.label}</button>
                            `).join('')}
                    </div>
                    <select class="kpi-prod-year-select" onchange="window._kpiProdChangeYear(this.value)">
                        ${yearOptionsHtml}
                    </select>
                    ${isDirectorUser ? `
                    <button id="kpiProdTopConfigBtn" class="btn-config-kpi-prod" onclick="window._openKpiProdConfigModal(0)" title="Mở Quy trình Cấu Hình KPI cho ${(_kpiProdDeptInfo[_kpiProdState.department] || _kpiProdDeptInfo.cutting).label}">
                        ⚙️ Cấu Hình KPI - ${(_kpiProdDeptInfo[_kpiProdState.department] || _kpiProdDeptInfo.cutting).label}
                    </button>
                    ` : ''}
                    <button id="kpiProdSaveAllBtn" class="btn-save-kpi-prod" onclick="window._kpiProdSaveAll()" style="display: ${isDirectorUser ? 'none' : 'inline-flex'};">
                        💾 Lưu KPI Tháng
                    </button>
                </div>
            </div>

            <!-- Main Content -->
            <div id="kpiProdContent">
                <div class="kpi-prod-loading">⏳ Đang tải dữ liệu KPI Sản Xuất...</div>
            </div>

            <!-- Modal Cấu Hình KPI & Cam Kết Bộ Phận Cắt (Chuẩn Ảnh 2) -->
            <div id="kpiProdConfigModalOverlay" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:9999; align-items:center; justify-content:center; padding:16px;">
                <style>
                    #kpiProdConfigModalOverlay button,
                    #kpiProdConfigModalOverlay input,
                    #kpiProdConfigModalOverlay label,
                    #kpiProdConfigModalOverlay span,
                    #kpiProdConfigModalOverlay th,
                    #kpiProdConfigModalOverlay td {
                        font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                    }
                </style>
                <div style="background:#ffffff; width:100%; max-width:680px; border-radius:18px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); border:1px solid #e2e8f0; overflow:hidden; display:flex; flex-direction:column; max-height:90vh; font-family:'Plus Jakarta Sans','Inter',sans-serif;">
                    <!-- Modal Header -->
                    <div style="background:linear-gradient(135deg,#1e293b,#0f172a); color:#ffffff; padding:16px 20px; display:flex; align-items:center; justify-content:space-between;">
                        <div id="kpiProdConfigModalTitle" style="font-size:15px; font-weight:900; letter-spacing:.2px;">⚙️ QUY TRÌNH CẤU HÌNH & PHÂN BỔ KPI TOP-DOWN</div>
                        <button onclick="window._closeKpiProdConfigModal()" style="background:none; border:none; color:#94a3b8; font-size:20px; font-weight:900; cursor:pointer; line-height:1;">✕</button>
                    </div>

                    <!-- Wizard Steps Bar -->
                    <div id="kpiProdWizardTabsHeader" style="display:flex; background:#0f172a; border-bottom:1.5px solid #334155; padding:6px 12px; gap:6px; flex-wrap:wrap;">
                        <button type="button" id="kpiProdWizardTab1" onclick="window._kpiProdSetWizardStep(1)" style="flex:1; padding:8px 10px; border-radius:8px; border:none; font-size:12px; font-weight:900; cursor:pointer; transition:all 0.2s; background:#38bdf8; color:#0f172a;">
                            1. 🎯 Cấu Hình Cả Năm
                        </button>
                        <button type="button" id="kpiProdWizardTab2" onclick="window._kpiProdSetWizardStep(2)" style="flex:1; padding:8px 10px; border-radius:8px; border:none; font-size:12px; font-weight:900; cursor:pointer; transition:all 0.2s; background:#334155; color:#94a3b8;">
                            2. 📊 Phân Bổ 4 Quý
                        </button>
                        <button type="button" id="kpiProdWizardTab3" onclick="window._kpiProdSetWizardStep(3)" style="flex:1; padding:8px 10px; border-radius:8px; border:none; font-size:12px; font-weight:900; cursor:pointer; transition:all 0.2s; background:#334155; color:#94a3b8;">
                            3. 📅 Phân Bổ 12 Tháng
                        </button>
                    </div>

                    <!-- Modal Body -->
                    <div style="padding:20px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:16px;">
                        <input type="hidden" id="kpiProdConfigMonth" value="0">

                        <!-- ========== STEP 1: CẤU HÌNH NĂM ========== -->
                        <div id="kpiProdWizardStep1" style="display:flex; flex-direction:column; gap:14px;">
                            <!-- Benchmark Box -->
                            <div id="kpiProdBenchmarkBox" style="background:#f0fdf4; border:1.5px solid #86efac; border-radius:12px; padding:12px;">
                                <div style="font-size:12.5px; font-weight:900; color:#166534; margin-bottom:4px;">💡 Gợi Ý Chỉ Số Thực Tế Năm Ngoái (Năm <span id="kpiProdBenchmarkPrevYear">2025</span>):</div>
                                <div id="kpiProdBenchmarkContent" style="font-size:12px; font-weight:700; color:#15803d;">
                                    ⏳ Đang tải số liệu lịch sử năm trước...
                                </div>
                            </div>

                            <!-- Year Target TOTAL Section (replaces per-team table) -->
                            <div id="kpiProdModalStaffTargetsSection" style="background:#f8fafc; border:1.5px solid #cbd5e1; border-radius:12px; padding:14px;">
                                <label id="kpiProdModalStaffSubtitle" style="font-size:13px; font-weight:900; color:#0f172a; display:block; margin-bottom:12px;">🎯 Chỉ Tiêu KPI TỔNG Bộ Phận — Cả Năm:</label>
                                <div style="display:flex; flex-direction:column; gap:10px;">
                                    <div style="display:flex; align-items:center; gap:10px;">
                                        <label style="font-size:12.5px; font-weight:800; color:#0284c7; min-width:160px;">KPI Target TỔNG (SP):</label>
                                        <input type="number" id="kpiProdYearTotalProducts" min="0" placeholder="Ví dụ: 20000" style="flex:1; padding:8px 12px; border:1.5px solid #bae6fd; border-radius:8px; font-size:14px; font-weight:900; color:#0284c7; text-align:center; max-width:200px;">
                                    </div>
                                    <div style="display:flex; align-items:center; gap:10px;">
                                        <label style="font-size:12.5px; font-weight:800; color:#b91c1c; min-width:160px;">KPI Lỗi Max TỔNG:</label>
                                        <input type="number" id="kpiProdYearTotalErrors" min="0" placeholder="Ví dụ: 10000" style="flex:1; padding:8px 12px; border:1.5px solid #fca5a5; border-radius:8px; font-size:14px; font-weight:900; color:#b91c1c; text-align:center; max-width:200px;">
                                    </div>
                                    <div style="display:flex; align-items:center; gap:10px;">
                                        <label style="font-size:12.5px; font-weight:800; color:#4f46e5; min-width:160px;">KPI Năng Suất TB:</label>
                                        <input type="text" inputmode="decimal" id="kpiProdYearTotalRate" placeholder="Ví dụ: 9,00" style="flex:1; padding:8px 12px; border:1.5px solid #c7d2fe; border-radius:8px; font-size:14px; font-weight:900; color:#4f46e5; text-align:center; max-width:200px;">
                                    </div>
                                </div>
                            </div>

                            <!-- Month-specific: Shortfall Warning (hidden by default) -->
                            <div id="kpiProdMonthShortfallBox" style="display:none; background:#fef2f2; border:1.5px solid #fca5a5; border-radius:12px; padding:12px;">
                                <div id="kpiProdMonthShortfallContent" style="font-size:12.5px; font-weight:800; color:#991b1b;"></div>
                            </div>

                            <!-- Month-specific: Team Allocation Table (hidden by default) -->
                            <div id="kpiProdMonthTeamAllocSection" style="display:none; background:#f8fafc; border:1.5px solid #cbd5e1; border-radius:12px; padding:14px;">
                                <!-- Month-specific: 3-Year Benchmark Suggestion Box -->
                                <div id="kpiProdMonthBenchmarkBox" style="display:none; background:#f0fdf4; border:1.5px solid #86efac; border-radius:10px; padding:10px 14px; margin-bottom:12px;"></div>
                                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; flex-wrap:wrap; gap:6px;">
                                    <label style="font-size:13px; font-weight:900; color:#0f172a;">👥 Phân Bổ KPI Cho Từng Team:</label>
                                    <button type="button" onclick="window._kpiProdAutoSplitTeams()" style="padding:5px 10px; background:#eff6ff; color:#2563eb; border:1.5px solid #bfdbfe; border-radius:6px; font-size:11.5px; font-weight:800; cursor:pointer;" title="Chia đều cho các team">
                                        ⚡ Chia Đều
                                    </button>
                                </div>
                                <div id="kpiProdMonthTargetRefBox" style="background:#e0f2fe; border:1px solid #7dd3fc; border-radius:8px; padding:8px 12px; margin-bottom:10px; font-size:12px; font-weight:800; color:#0369a1;"></div>
                                <div style="overflow-x:auto; border:1px solid #cbd5e1; border-radius:8px; background:#ffffff;">
                                    <table style="width:100%; border-collapse:collapse; font-size:12px;">
                                        <thead style="background:#0f172a; position:sticky; top:0; z-index:1;">
                                            <tr>
                                                <th style="padding:10px 12px; text-align:left; color:#ffffff; font-weight:800; font-size:12.5px;">Team</th>
                                                <th id="kpiProdModalProductTh" style="padding:10px 8px; text-align:center; color:#38bdf8; font-weight:800; font-size:12.5px; width:120px;">KPI (SP)</th>
                                                <th style="padding:10px 8px; text-align:center; color:#f87171; font-weight:800; font-size:12.5px; width:120px;">KPI Lỗi Max</th>
                                                <th style="padding:10px 8px; text-align:center; color:#818cf8; font-weight:800; font-size:12.5px; width:120px;">KPI Năng Suất</th>
                                            </tr>
                                        </thead>
                                        <tbody id="kpiProdModalStaffTargetsList">
                                            <!-- Dynamically populated per team for month mode -->
                                        </tbody>
                                        <tfoot id="kpiProdTeamAllocTotalsRow" style="font-weight:900; font-size:12px;">
                                             <tr style="background:#f1f5f9;">
                                                 <td style="padding:8px 12px; font-weight:900; color:#0f172a; border-top:2px solid #cbd5e1;">TỔNG</td>
                                                 <td id="kpiProdTeamAllocTotalProducts" style="padding:8px; text-align:center; color:#0284c7; font-weight:900; border-top:2px solid #cbd5e1;">0</td>
                                                 <td id="kpiProdTeamAllocTotalErrors" style="padding:8px; text-align:center; color:#b91c1c; font-weight:900; border-top:2px solid #cbd5e1;">0</td>
                                                 <td id="kpiProdTeamAllocTotalRate" style="padding:8px; text-align:center; color:#4f46e5; font-weight:900; border-top:2px solid #cbd5e1;">—</td>
                                             </tr>
                                             <tr style="background:#e0f2fe;">
                                                 <td id="kpiProdTeamAllocMonthRefLabel" style="padding:6px 12px; font-weight:800; color:#0369a1;">🎯 THÁNG</td>
                                                 <td id="kpiProdTeamAllocMonthRefProducts" style="padding:6px; text-align:center; color:#0369a1; font-weight:800;">0</td>
                                                 <td id="kpiProdTeamAllocMonthRefErrors" style="padding:6px; text-align:center; color:#0369a1; font-weight:800;">0</td>
                                                 <td id="kpiProdTeamAllocMonthRefRate" style="padding:6px; text-align:center; color:#0369a1; font-weight:800;">—</td>
                                             </tr>
                                             <tr id="kpiProdTeamAllocPrevShortfallRow" style="background:#fff7ed; display:none;">
                                                 <td id="kpiProdTeamAllocPrevShortfallLabel" style="padding:6px 12px; font-weight:800; color:#c2410c;">⚠️ THÁNG THIẾU</td>
                                                 <td id="kpiProdTeamAllocPrevShortfallProducts" style="padding:6px; text-align:center; color:#c2410c; font-weight:900;">0</td>
                                                 <td style="padding:6px; text-align:center; color:#94a3b8; font-weight:800;">0</td>
                                                 <td style="padding:6px; text-align:center; color:#94a3b8; font-weight:800;">—</td>
                                             </tr>
                                             <tr id="kpiProdTeamAllocDiffRow" style="background:#fef9c3;">
                                                 <td style="padding:6px 12px; font-weight:800; color:#92400e;">⚖️ CHÊNH LỆCH</td>
                                                 <td id="kpiProdTeamAllocDiffProducts" style="padding:6px; text-align:center; font-weight:800;">—</td>
                                                 <td id="kpiProdTeamAllocDiffErrors" style="padding:6px; text-align:center; font-weight:800;">—</td>
                                                 <td id="kpiProdTeamAllocDiffRate" style="padding:6px; text-align:center; font-weight:800;">—</td>
                                             </tr>
                                         </tfoot>
                                    </table>
                                </div>
                                <div id="kpiProdTeamAllocValidation" style="margin-top:8px; font-size:12px; font-weight:800; color:#16a34a;"></div>
                            </div>

                            <!-- Evaluation Rule Selection -->
                            <div style="background:#fffbeb; border:1.5px solid #fde68a; padding:12px; border-radius:12px;">
                                <label style="font-size:12.5px; font-weight:900; color:#92400e; display:block; margin-bottom:6px;">⚖️ Quy Tắc Đánh Giá Đạt KPI:</label>
                                <div style="display:flex; flex-direction:column; gap:6px;">
                                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12px; font-weight:700; color:#78350f;">
                                        <input type="radio" name="kpiProdEvalRule" value="ALL" checked style="accent-color:#d97706; transform:scale(1.15);">
                                        <span>🟢 <b>Bắt buộc ĐẠT KPI TẤT CẢ tiêu chí</b></span>
                                    </label>
                                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12px; font-weight:700; color:#78350f;">
                                        <input type="radio" name="kpiProdEvalRule" value="ANY" style="accent-color:#d97706; transform:scale(1.15);">
                                        <span>🟡 <b>Chỉ cần ĐẠT 1 TRONG CÁC TIÊU CHÍ</b></span>
                                    </label>
                                </div>
                            </div>


                            <!-- Commitments Section -->
                            <div id="kpiProdCommitmentsContainerSection" style="background:#f8fafc; border:1.5px solid #e2e8f0; padding:12px; border-radius:12px;">
                                <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:8px;">
                                    <label style="font-size:12.5px; font-weight:900; color:#0f172a;"><span id="kpiProdCommitLabel">📋 Các Điều Cam Kết Thực Hiện Cả Năm:</span></label>
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <button type="button" onclick="window._toggleKpiProdCommitmentSuggestions()" style="padding:4px 9px; background:#fef3c7; color:#b45309; border:1px solid #fde68a; border-radius:6px; font-size:11.5px; font-weight:800; cursor:pointer;">💡 Xem Gợi Ý Cam Kết</button>
                                        <button type="button" onclick="window._addKpiProdCommitmentRow('')" style="padding:4px 9px; background:#4f46e5; color:#ffffff; border:none; border-radius:6px; font-size:11.5px; font-weight:800; cursor:pointer;">➕ Thêm Cam Kết</button>
                                    </div>
                                </div>
                                <div id="kpiProdCommitmentSuggestionsPanel" style="display:none; background:#fffbeb; border:1.5px dashed #f59e0b; border-radius:10px; padding:10px; margin-bottom:8px;">
                                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
                                        <span style="font-size:12px; font-weight:900; color:#92400e;">💡 Gợi ý mẫu:</span>
                                        <button type="button" onclick="window._toggleKpiProdCommitmentSuggestions(false)" style="background:none; border:none; color:#92400e; font-size:14px; font-weight:900; cursor:pointer;">✕</button>
                                    </div>
                                    <div style="display:flex; flex-direction:column; gap:6px;" id="kpiProdCommitmentSuggestionsList"></div>
                                </div>
                                <div id="kpiProdCommitmentsList" style="display:flex; flex-direction:column; gap:6px;"></div>
                            </div>

                            <!-- Supports Section -->
                            <div id="kpiProdSupportsContainerSection" style="background:#f8fafc; border:1.5px solid #e2e8f0; padding:12px; border-radius:12px;">
                                <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:8px;">
                                    <label style="font-size:12.5px; font-weight:900; color:#0f172a;"><span id="kpiProdSupportLabel">🤝 Nội Dung Cần Công Ty Hỗ Trợ:</span></label>
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <button type="button" onclick="window._toggleKpiProdSupportSuggestions()" style="padding:4px 9px; background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; border-radius:6px; font-size:11.5px; font-weight:800; cursor:pointer;">💡 Xem Gợi Ý Hỗ Trợ</button>
                                        <button type="button" onclick="window._addKpiProdSupportRow('')" style="padding:4px 9px; background:#0284c7; color:#ffffff; border:none; border-radius:6px; font-size:11.5px; font-weight:800; cursor:pointer;">➕ Thêm Hỗ Trợ</button>
                                    </div>
                                </div>
                                <div id="kpiProdSupportSuggestionsPanel" style="display:none; background:#f0f9ff; border:1.5px dashed #0284c7; border-radius:10px; padding:10px; margin-bottom:8px;">
                                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
                                        <span style="font-size:12px; font-weight:900; color:#0369a1;">💡 Gợi ý mẫu:</span>
                                        <button type="button" onclick="window._toggleKpiProdSupportSuggestions(false)" style="background:none; border:none; color:#0369a1; font-size:14px; font-weight:900; cursor:pointer;">✕</button>
                                    </div>
                                    <div style="display:flex; flex-direction:column; gap:6px;" id="kpiProdSupportSuggestionsList"></div>
                                </div>
                                <div id="kpiProdSupportsList" style="display:flex; flex-direction:column; gap:6px;"></div>
                            </div>
                        </div>

                        <!-- ========== STEP 2: PHÂN BỔ 4 QUÝ ========== -->
                        <div id="kpiProdWizardStep2" style="display:none; flex-direction:column; gap:14px;">
                            <!-- 3-Year Quarter Benchmark Box -->
                            <div id="kpiProdQBenchmarkBox" style="background:#f0fdf4; border:1.5px solid #86efac; border-radius:12px; padding:12px;">
                                <div style="font-size:12.5px; font-weight:900; color:#166534; margin-bottom:4px;">💡 Gợi Ý Sản Lượng & Tỷ Trọng 4 Quý Của Các Năm (Từ Năm 2025):</div>
                                <div id="kpiProdQBenchmarkContent" style="font-size:12px; font-weight:700; color:#15803d;">
                                    ⏳ Đang tải số liệu 4 Quý năm trước...
                                </div>
                            </div>

                            <div style="background:#f8fafc; border:1.5px solid #cbd5e1; border-radius:12px; padding:14px;">
                                <label style="font-size:13px; font-weight:900; color:#0f172a; display:block; margin-bottom:8px;">⚙️ Lựa Chọn Phương Thức Phân Bổ Mục Tiêu Cho 4 Quý:</label>
                                <div style="display:flex; flex-direction:column; gap:8px;">
                                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12.5px; font-weight:700; color:#1e293b;">
                                        <input type="radio" name="kpiProdQAllocMethod" value="equal" checked onchange="window._kpiProdApplyQAllocMethod()" style="accent-color:#2563eb; transform:scale(1.15);">
                                        <span>🔹 <b>Lựa chọn 1: Chia đều Năm</b> (25% sản lượng mỗi Quý)</span>
                                    </label>
                                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12.5px; font-weight:700; color:#1e293b;">
                                        <input type="radio" name="kpiProdQAllocMethod" value="growth" onchange="window._kpiProdApplyQAllocMethod()" style="accent-color:#2563eb; transform:scale(1.15);">
                                        <span>📈 <b>Lựa chọn 2: Phân bổ theo tỷ lệ tăng trưởng Quý trước</b></span>
                                    </label>
                                    <div id="kpiProdQRefYearBox" style="display:none; margin-left:32px; padding:6px 12px; background:#e0f2fe; border-radius:8px; font-size:12px; font-weight:700; color:#0369a1;">
                                        📅 Năm tham chiếu: <select id="kpiProdQRefYear" onchange="window._kpiProdApplyQAllocMethod()" style="padding:3px 8px; border:1.5px solid #7dd3fc; border-radius:6px; font-size:12px; font-weight:800; color:#0369a1; background:#fff; cursor:pointer;"></select>
                                    </div>
                                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12.5px; font-weight:700; color:#1e293b;">
                                        <input type="radio" name="kpiProdQAllocMethod" value="custom" onchange="window._kpiProdApplyQAllocMethod()" style="accent-color:#2563eb; transform:scale(1.15);">
                                        <span>✏️ <b>Lựa chọn 3: Tự điền chỉ tiêu từng Quý</b></span>
                                    </label>
                                </div>
                            </div>

                            <div style="background:#ffffff; border:1.5px solid #cbd5e1; border-radius:12px; padding:14px;">
                                <label style="font-size:13px; font-weight:900; color:#0f172a; display:block; margin-bottom:10px;">📊 Bảng Chỉ Tiêu Chi Tiết 4 Quý:</label>
                                <table style="width:100%; border-collapse:collapse; font-size:12px;">
                                    <thead style="background:#0f172a; color:#ffffff;">
                                        <tr>
                                            <th style="padding:8px 10px; text-align:left;">Quý</th>
                                            <th style="padding:8px 10px; text-align:center; color:#38bdf8;">KPI Target (SP)</th>
                                            <th style="padding:8px 10px; text-align:center; color:#f87171;">KPI Lỗi Max</th>
                                            <th style="padding:8px 10px; text-align:center; color:#818cf8;">KPI Năng Suất</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td id="kpiProdQ1Label" style="padding:8px 10px; font-weight:800;">Quý 1</td>
                                            <td style="text-align:center;"><input type="number" id="kpiProdQ1Products" class="kpi-prod-input" style="width:100px;" min="0" oninput="window._kpiProdUpdateQTotals()" onfocus="window._kpiProdShowSmartHint(this,'products')" onblur="setTimeout(window._kpiProdHideSmartHint,200)"></td>
                                            <td style="text-align:center;"><input type="number" id="kpiProdQ1Errors" class="kpi-prod-input" style="width:70px;" min="0" oninput="window._kpiProdUpdateQTotals()" onfocus="window._kpiProdShowSmartHint(this,'errors')" onblur="setTimeout(window._kpiProdHideSmartHint,200)"></td>
                                            <td style="text-align:center;"><input type="text" inputmode="decimal" id="kpiProdQ1Rate" class="kpi-prod-input" style="width:70px; text-align:center;" oninput="window._kpiProdUpdateQTotals()" onfocus="window._kpiProdShowSmartHint(this,'rate')" onblur="setTimeout(window._kpiProdHideSmartHint,200)"></td>
                                        </tr>
                                        <tr>
                                            <td id="kpiProdQ2Label" style="padding:8px 10px; font-weight:800;">Quý 2</td>
                                            <td style="text-align:center;"><input type="number" id="kpiProdQ2Products" class="kpi-prod-input" style="width:100px;" min="0" oninput="window._kpiProdUpdateQTotals()" onfocus="window._kpiProdShowSmartHint(this,'products')" onblur="setTimeout(window._kpiProdHideSmartHint,200)"></td>
                                            <td style="text-align:center;"><input type="number" id="kpiProdQ2Errors" class="kpi-prod-input" style="width:70px;" min="0" oninput="window._kpiProdUpdateQTotals()" onfocus="window._kpiProdShowSmartHint(this,'errors')" onblur="setTimeout(window._kpiProdHideSmartHint,200)"></td>
                                            <td style="text-align:center;"><input type="text" inputmode="decimal" id="kpiProdQ2Rate" class="kpi-prod-input" style="width:70px; text-align:center;" oninput="window._kpiProdUpdateQTotals()" onfocus="window._kpiProdShowSmartHint(this,'rate')" onblur="setTimeout(window._kpiProdHideSmartHint,200)"></td>
                                        </tr>
                                        <tr>
                                            <td id="kpiProdQ3Label" style="padding:8px 10px; font-weight:800;">Quý 3</td>
                                            <td style="text-align:center;"><input type="number" id="kpiProdQ3Products" class="kpi-prod-input" style="width:100px;" min="0" oninput="window._kpiProdUpdateQTotals()" onfocus="window._kpiProdShowSmartHint(this,'products')" onblur="setTimeout(window._kpiProdHideSmartHint,200)"></td>
                                            <td style="text-align:center;"><input type="number" id="kpiProdQ3Errors" class="kpi-prod-input" style="width:70px;" min="0" oninput="window._kpiProdUpdateQTotals()" onfocus="window._kpiProdShowSmartHint(this,'errors')" onblur="setTimeout(window._kpiProdHideSmartHint,200)"></td>
                                            <td style="text-align:center;"><input type="text" inputmode="decimal" id="kpiProdQ3Rate" class="kpi-prod-input" style="width:70px; text-align:center;" oninput="window._kpiProdUpdateQTotals()" onfocus="window._kpiProdShowSmartHint(this,'rate')" onblur="setTimeout(window._kpiProdHideSmartHint,200)"></td>
                                        </tr>
                                        <tr>
                                            <td id="kpiProdQ4Label" style="padding:8px 10px; font-weight:800;">Quý 4</td>
                                            <td style="text-align:center;"><input type="number" id="kpiProdQ4Products" class="kpi-prod-input" style="width:100px;" min="0" oninput="window._kpiProdUpdateQTotals()" onfocus="window._kpiProdShowSmartHint(this,'products')" onblur="setTimeout(window._kpiProdHideSmartHint,200)"></td>
                                            <td style="text-align:center;"><input type="number" id="kpiProdQ4Errors" class="kpi-prod-input" style="width:70px;" min="0" oninput="window._kpiProdUpdateQTotals()" onfocus="window._kpiProdShowSmartHint(this,'errors')" onblur="setTimeout(window._kpiProdHideSmartHint,200)"></td>
                                            <td style="text-align:center;"><input type="text" inputmode="decimal" id="kpiProdQ4Rate" class="kpi-prod-input" style="width:70px; text-align:center;" oninput="window._kpiProdUpdateQTotals()" onfocus="window._kpiProdShowSmartHint(this,'rate')" onblur="setTimeout(window._kpiProdHideSmartHint,200)"></td>
                                        </tr>
                                    </tbody>
                                    <tfoot style="font-weight:900; font-size:12px;">
                                        <tr style="background:#f1f5f9;">
                                            <td style="padding:8px 10px; font-weight:900; color:#0f172a; border-top:2px solid #cbd5e1;">TỔNG</td>
                                            <td id="kpiProdQTotalProducts" style="padding:8px; text-align:center; color:#0284c7; font-weight:900; border-top:2px solid #cbd5e1;">0</td>
                                            <td id="kpiProdQTotalErrors" style="padding:8px; text-align:center; color:#b91c1c; font-weight:900; border-top:2px solid #cbd5e1;">0</td>
                                            <td id="kpiProdQTotalRate" style="padding:8px; text-align:center; color:#4f46e5; font-weight:900; border-top:2px solid #cbd5e1;">—</td>
                                        </tr>
                                        <tr style="background:#e0f2fe;">
                                            <td style="padding:6px 10px; font-weight:800; color:#0369a1;">🎯 NĂM</td>
                                            <td id="kpiProdQYearRefProducts" style="padding:6px; text-align:center; color:#0369a1; font-weight:800;">0</td>
                                            <td id="kpiProdQYearRefErrors" style="padding:6px; text-align:center; color:#0369a1; font-weight:800;">0</td>
                                            <td id="kpiProdQYearRefRate" style="padding:6px; text-align:center; color:#0369a1; font-weight:800;">—</td>
                                        </tr>
                                        <tr id="kpiProdQDiffRow" style="background:#fef9c3;">
                                            <td style="padding:6px 10px; font-weight:800; color:#92400e;">⚖️ CHÊNH LỆCH</td>
                                            <td id="kpiProdQDiffProducts" style="padding:6px; text-align:center; font-weight:800;">—</td>
                                            <td id="kpiProdQDiffErrors" style="padding:6px; text-align:center; font-weight:800;">—</td>
                                            <td id="kpiProdQDiffRate" style="padding:6px; text-align:center; font-weight:800;">—</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <!-- ========== STEP 3: PHÂN BỔ 12 THÁNG ========== -->
                        <div id="kpiProdWizardStep3" style="display:none; flex-direction:column; gap:14px;">
                            <!-- 12-Month Benchmark Box for History Years -->
                            <div id="kpiProdMBenchmarkBox" style="background:#f0fdf4; border:1.5px solid #86efac; border-radius:12px; padding:12px;">
                                <div style="font-size:12.5px; font-weight:900; color:#166534; margin-bottom:4px;">💡 Gợi Ý Sản Lượng 12 Tháng Của Các Năm (Từ Năm 2025):</div>
                                <div id="kpiProdMBenchmarkContent" style="font-size:12px; font-weight:700; color:#15803d; overflow-x:auto;">
                                    ⏳ Đang tải số liệu 12 Tháng lịch sử...
                                </div>
                            </div>

                            <div style="background:#f8fafc; border:1.5px solid #cbd5e1; border-radius:12px; padding:14px;">
                                <label style="font-size:13px; font-weight:900; color:#0f172a; display:block; margin-bottom:8px;">⚙️ Lựa Chọn Phương Thức Phân Bổ Cho 12 Tháng Trong Quý:</label>
                                <div style="display:flex; flex-direction:column; gap:8px;">
                                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12.5px; font-weight:700; color:#1e293b;">
                                        <input type="radio" name="kpiProdMAllocMethod" value="equal" checked onchange="window._kpiProdApplyMAllocMethod()" style="accent-color:#2563eb; transform:scale(1.15);">
                                        <span>🔹 <b>Lựa chọn 1: Chia đều Quý</b> (33.3%/Tháng trong Quý)</span>
                                    </label>
                                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12.5px; font-weight:700; color:#1e293b;">
                                        <input type="radio" name="kpiProdMAllocMethod" value="growth" onchange="window._kpiProdApplyMAllocMethod()" style="accent-color:#2563eb; transform:scale(1.15);">
                                        <span>📈 <b>Lựa chọn 2: Tỉ lệ tăng trưởng tương tự Tháng trước</b></span>
                                    </label>
                                    <div id="kpiProdMRefYearBox" style="display:none; margin-left:32px; padding:6px 12px; background:#e0f2fe; border-radius:8px; font-size:12px; font-weight:700; color:#0369a1;">
                                        📅 Năm tham chiếu: <select id="kpiProdMRefYear" onchange="window._kpiProdApplyMAllocMethod()" style="padding:3px 8px; border:1.5px solid #7dd3fc; border-radius:6px; font-size:12px; font-weight:800; color:#0369a1; background:#fff; cursor:pointer;"></select>
                                    </div>
                                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12.5px; font-weight:700; color:#1e293b;">
                                        <input type="radio" name="kpiProdMAllocMethod" value="custom" onchange="window._kpiProdApplyMAllocMethod()" style="accent-color:#2563eb; transform:scale(1.15);">
                                        <span>✏️ <b>Lựa chọn 3: Tự điền chỉ tiêu từng Tháng</b></span>
                                    </label>
                                </div>
                            </div>

                            <div style="background:#ffffff; border:1.5px solid #cbd5e1; border-radius:12px; padding:14px; max-height:300px; overflow-y:auto;">
                                <label style="font-size:13px; font-weight:900; color:#0f172a; display:block; margin-bottom:10px;">📊 Bảng Chỉ Tiêu Chi Tiết 12 Tháng (Năm 2026):</label>
                                <table style="width:100%; border-collapse:collapse; font-size:12px;">
                                    <thead style="background:#0f172a; color:#ffffff; position:sticky; top:0; z-index:2;">
                                        <tr>
                                            <th style="padding:8px 10px; text-align:left;">Tháng</th>
                                            <th style="padding:8px 10px; text-align:center; color:#38bdf8;">KPI Target (SP)</th>
                                            <th style="padding:8px 10px; text-align:center; color:#f87171;">KPI Lỗi Max</th>
                                            <th style="padding:8px 10px; text-align:center; color:#818cf8;">KPI Năng Suất</th>
                                        </tr>
                                    </thead>
                                    <tbody id="kpiProdModal12MonthsTableList">
                                        <!-- Dynamically populated 12 months rows -->
                                    </tbody>
                                    <tfoot style="font-weight:900; font-size:12px;">
                                        <tr style="background:#f1f5f9;">
                                            <td style="padding:8px 10px; font-weight:900; color:#0f172a; border-top:2px solid #cbd5e1;">TỔNG</td>
                                            <td id="kpiProdMTotalProducts" style="padding:8px; text-align:center; color:#0284c7; font-weight:900; border-top:2px solid #cbd5e1;">0</td>
                                            <td id="kpiProdMTotalErrors" style="padding:8px; text-align:center; color:#b91c1c; font-weight:900; border-top:2px solid #cbd5e1;">0</td>
                                            <td id="kpiProdMTotalRate" style="padding:8px; text-align:center; color:#4f46e5; font-weight:900; border-top:2px solid #cbd5e1;">—</td>
                                        </tr>
                                        <tr style="background:#e0f2fe;">
                                            <td style="padding:6px 10px; font-weight:800; color:#0369a1;">🎯 NĂM</td>
                                            <td id="kpiProdMYearRefProducts" style="padding:6px; text-align:center; color:#0369a1; font-weight:800;">0</td>
                                            <td id="kpiProdMYearRefErrors" style="padding:6px; text-align:center; color:#0369a1; font-weight:800;">0</td>
                                            <td id="kpiProdMYearRefRate" style="padding:6px; text-align:center; color:#0369a1; font-weight:800;">—</td>
                                        </tr>
                                        <tr id="kpiProdMDiffRow" style="background:#fef9c3;">
                                            <td style="padding:6px 10px; font-weight:800; color:#92400e;">⚖️ CHÊNH LỆCH</td>
                                            <td id="kpiProdMDiffProducts" style="padding:6px; text-align:center; font-weight:800;">—</td>
                                            <td id="kpiProdMDiffErrors" style="padding:6px; text-align:center; font-weight:800;">—</td>
                                            <td id="kpiProdMDiffRate" style="padding:6px; text-align:center; font-weight:800;">—</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Modal Footer -->
                    <div style="background:#f8fafc; padding:12px 20px; border-top:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between; gap:10px;">
                        <button type="button" onclick="window._closeKpiProdConfigModal()" style="padding:9px 16px; background:#ffffff; color:#475569; border:1.5px solid #cbd5e1; border-radius:8px; font-size:13px; font-weight:800; cursor:pointer;">Hủy</button>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <button type="button" id="kpiProdWizardPrevBtn" onclick="window._kpiProdWizardPrevStep()" style="display:none; padding:9px 16px; background:#f1f5f9; color:#334155; border:1.5px solid #cbd5e1; border-radius:8px; font-size:13px; font-weight:800; cursor:pointer;">⬅ Quay Lại</button>
                            <button type="button" id="kpiProdWizardNextBtn" onclick="window._kpiProdWizardNextStep()" style="padding:9px 20px; background:linear-gradient(135deg,#2563eb,#1d4ed8); color:#ffffff; border:none; border-radius:8px; font-size:13px; font-weight:900; cursor:pointer; box-shadow:0 4px 12px rgba(37,99,235,0.35);">Tiếp Theo: Phân Bổ Quý ➔</button>
                            <button type="button" id="kpiProdWizardEditBtn" onclick="window._kpiProdUnlockModalForEdit()" style="display:none; padding:9px 20px; background:linear-gradient(135deg,#d97706,#b45309); color:#ffffff; border:none; border-radius:8px; font-size:13px; font-weight:900; cursor:pointer; box-shadow:0 4px 12px rgba(217,119,6,0.35);">✏️ Chỉnh Sửa Cấu Hình</button>
                            <button type="button" id="kpiProdWizardSaveBtn" onclick="window._saveKpiProdConfig()" style="display:none; padding:9px 22px; background:linear-gradient(135deg,#16a34a,#15803d); color:#ffffff; border:none; border-radius:8px; font-size:13px; font-weight:900; cursor:pointer; box-shadow:0 4px 12px rgba(22,163,74,0.35);">💾 Lưu Cấu Hình Top-Down</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal Đánh Giá Cam Kết Bộ Phận Cắt (Chuẩn Ảnh 3) -->
            <div id="kpiProdEvalModalOverlay" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:9999; align-items:center; justify-content:center; padding:16px;">
                <style>
                    #kpiProdEvalModalOverlay button,
                    #kpiProdEvalModalOverlay input,
                    #kpiProdEvalModalOverlay label,
                    #kpiProdEvalModalOverlay span,
                    #kpiProdEvalModalOverlay th,
                    #kpiProdEvalModalOverlay td {
                        font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                    }
                </style>
                <div style="background:#ffffff; width:100%; max-width:680px; border-radius:16px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); border:1px solid #e2e8f0; overflow:hidden; display:flex; flex-direction:column; max-height:90vh; font-family:'Plus Jakarta Sans','Inter',sans-serif;">
                    <!-- Modal Header -->
                    <div style="background:linear-gradient(135deg,#312e81,#4338ca); color:#ffffff; padding:16px 20px; display:flex; align-items:center; justify-content:space-between;">
                        <div id="kpiProdEvalModalTitle" style="font-size:15px; font-weight:900; letter-spacing:.2px;">📊 Đánh Giá Cam Kết Bộ Phận Cắt</div>
                        <button onclick="window._closeKpiProdEvalModal()" style="background:none; border:none; color:#c7d2fe; font-size:20px; font-weight:900; cursor:pointer; line-height:1;">✕</button>
                    </div>

                    <!-- Modal Body -->
                    <div style="padding:20px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:14px;">
                        <input type="hidden" id="kpiProdEvalMonth" value="0">
                        <div id="kpiProdEvalModalHeaderInfo" style="background:#f8fafc; border:1px solid #cbd5e1; padding:12px 14px; border-radius:10px;"></div>
                        <div>
                            <div style="font-size:13px; font-weight:900; color:#0f172a; margin-bottom:8px;">📋 Đánh Giá Từng Cam Kết :</div>
                            <div id="kpiProdEvalItemsList" style="display:flex; flex-direction:column; gap:10px;"></div>
                        </div>

                        <!-- Company Support Info Box in Eval Modal -->
                        <div id="kpiProdEvalSupportBox" style="background:linear-gradient(180deg,#ffffff 0%,#f0f9ff 100%); border:1.5px solid #bae6fd; border-radius:12px; padding:12px 14px; box-shadow:0 2px 8px rgba(2,132,199,0.04);">
                            <div style="font-size:12.5px; font-weight:900; color:#0369a1; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
                                <span id="kpiProdEvalSupportLabel">🤝 Nội Dung Bộ Phận Cắt Cần Công Ty Hỗ Trợ:</span>
                                <span id="kpiProdEvalSupportCountBadge" style="background:#e0f2fe; color:#0369a1; font-size:10px; padding:1px 6px; border-radius:99px; font-weight:900;">0</span>
                            </div>
                            <div id="kpiProdEvalSupportItemsList" style="display:flex; flex-direction:column; gap:6px;"></div>
                        </div>
                    </div>

                    <!-- Modal Footer -->
                    <div style="background:#f1f5f9; padding:12px 20px; display:flex; align-items:center; justify-content:space-between; border-top:1px solid #e2e8f0; flex-wrap:wrap; gap:10px;">
                        <div id="kpiProdEvalProgressSummary" style="font-size:12.5px; font-weight:900; color:#4338ca;"></div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <button onclick="window._closeKpiProdEvalModal()" style="padding:8px 14px; background:#ffffff; border:1.5px solid #cbd5e1; color:#475569; font-weight:800; border-radius:8px; cursor:pointer;">Hủy</button>
                            <button id="btnSaveKpiProdEval" onclick="window._saveKpiProdEvalModal()" style="padding:8px 20px; background:linear-gradient(135deg,#4f46e5,#4338ca); color:#ffffff; border:none; font-weight:900; border-radius:8px; cursor:pointer; box-shadow:0 4px 12px rgba(79,70,229,0.25);">💾 Lưu Đánh Giá</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;

        // Fetch data
        await _kpiProdFetchAndRender();
    }

    async function _kpiProdFetchAndRender(preserveScroll = true) {
        const contentEl = document.getElementById('kpiProdContent');
        if (!contentEl) return;

        const savedScrollPos = preserveScroll ? (window.scrollY || window.pageYOffset || document.documentElement.scrollTop) : 0;

        _kpiProdState.loading = true;
        if (!preserveScroll || !contentEl.children.length) {
            contentEl.innerHTML = '<div class="kpi-prod-loading">⏳ Đang tải dữ liệu KPI Sản Xuất...</div>';
        }

        try {
            if (Array.isArray(_kpiProdState.allowedDepts) && _kpiProdState.allowedDepts.length === 0) {
                contentEl.innerHTML = '<div class="kpi-prod-loading" style="color:#ef4444; padding:60px; text-align:center; font-size:16px; font-weight:800;">🚫 Bạn chưa được phân quyền xem KPI cho bộ phận nào.</div>';
                _kpiProdState.loading = false;
                return;
            }

            const resp = await fetch(`/api/kpi-production/stats?year=${_kpiProdState.year}&department=${_kpiProdState.department}`, {
                headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') }
            });
            if (!resp.ok) throw new Error('Lỗi API: ' + resp.status);
            const data = await resp.json();
            _kpiProdState.data = data;

            // Try to get user role & permissions
            try {
                const meResp = await fetch('/api/auth/me', {
                    headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') }
                });
                if (meResp.ok) {
                    const me = await meResp.json();
                    _kpiProdState.userRole = me.user?.role || me.role || 'unknown';
                    if (me.user && me.user.kpi_production_departments !== undefined) {
                        _kpiProdState.allowedDepts = me.user.kpi_production_departments;
                    }
                }
            } catch(e) {}

            _kpiProdRenderContent(contentEl, data);

            // Update top action buttons visibility dynamically according to current department and user role
            const deptInfo = _kpiProdDeptInfo[_kpiProdState.department] || _kpiProdDeptInfo.cutting;
            const topConfigBtn = document.getElementById('kpiProdTopConfigBtn');
            const saveAllBtn = document.getElementById('kpiProdSaveAllBtn');
            const isDirector = _isKpiProdDirectorUser();

            if (topConfigBtn) {
                topConfigBtn.innerText = `⚙️ Cấu Hình KPI - ${deptInfo.label}`;
                topConfigBtn.title = `Mở Quy trình Cấu Hình KPI cho ${deptInfo.label}`;
                topConfigBtn.style.display = isDirector ? 'inline-flex' : 'none';
            }
            if (saveAllBtn) {
                saveAllBtn.style.display = isDirector ? 'none' : 'inline-flex';
            }

            // Update active department tab button styling in top header
            document.querySelectorAll('.kpi-dept-tabs .kpi-dept-btn').forEach(btn => {
                const isMatch = btn.getAttribute('onclick')?.includes(`'${_kpiProdState.department}'`);
                if (isMatch) btn.classList.add('active');
                else btn.classList.remove('active');
            });

            if (preserveScroll && savedScrollPos > 0) {
                setTimeout(() => {
                    window.scrollTo({ top: savedScrollPos, behavior: 'instant' });
                }, 10);
            }
        } catch (err) {
            contentEl.innerHTML = `<div class="kpi-prod-loading" style="color:#ef4444;">❌ Lỗi tải dữ liệu: ${err.message}</div>`;
        } finally {
            _kpiProdState.loading = false;
        }
    }

    function _isKpiProdDirectorUser() {
        if (_kpiProdState.userRole) {
            const r = String(_kpiProdState.userRole).toLowerCase();
            if (r === 'giam_doc' || r === 'admin' || r === 'giamdoc' || r === 'ban_giam_doc') return true;
        }
        if (typeof currentUser !== 'undefined' && currentUser) {
            const r = String(currentUser.role || '').toLowerCase();
            const u = String(currentUser.username || '').toLowerCase();
            if (r === 'giam_doc' || r === 'admin' || u === 'admin' || r === 'giamdoc' || r === 'ban_giam_doc') return true;
        }
        return false;
    }

    function _parseRewardAmount(txt) {
        if (!txt) return 0;
        const str = String(txt).trim();
        const digitsOnly = str.replace(/\D/g, '');
        if (digitsOnly) return parseInt(digitsOnly, 10);
        return 0;
    }

    function _renderMiniStatusBadge(isPass, hasLogged) {
        if (!hasLogged) {
            return '<span class="kpi-prod-badge kpi-prod-badge-pending" style="font-size:8.5px; padding:1px 5px; opacity:0.75;">⏳</span>';
        }
        if (isPass === true) {
            return '<span class="kpi-prod-badge kpi-prod-badge-success" style="font-size:8.5px; padding:1px 5px;">🟢 ĐẠT</span>';
        }
        if (isPass === false) {
            return '<span class="kpi-prod-badge kpi-prod-badge-danger" style="font-size:8.5px; padding:1px 5px;">🔴 CHƯA ĐẠT</span>';
        }
        return '<span class="kpi-prod-badge kpi-prod-badge-pending" style="font-size:8.5px; padding:1px 5px; opacity:0.75;">⏳</span>';
    }

    function _kpiProdRenderContent(contentEl, data) {
        const isDirectorUser = typeof currentUser !== 'undefined' && currentUser && (currentUser.role === 'giam_doc' || currentUser.role === 'admin' || currentUser.username === 'admin');
        const canEditConfig = isDirectorUser || (typeof canDo === 'function' && canDo('kpi_san_xuat', 'edit'));

        const now = typeof vnNow === 'function' ? vnNow() : new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const isCurrentYear = _kpiProdState.year === currentYear;

        const md = data.monthly_data;
        const ys = data.yearly_summary;
        const staff = data.staff || [];
        const selectedStaffId = _kpiProdState.selectedStaffId || 'all';
        const deptInfo = _kpiProdDeptInfo[_kpiProdState.department] || _kpiProdDeptInfo.cutting;

        const rollingMap = _computeRollingTargets(md, staff, currentMonth, isCurrentYear);

        // Visible Staff Filter Tabs Bar
        const staffTabsHtml = `
            <div class="kpi-prod-staff-tabs" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <button onclick="window._kpiProdChangeStaffFilter('all')" 
                    style="padding:5px 12px; border-radius:20px; font-size:12px; font-weight:800; font-family:'Plus Jakarta Sans', sans-serif; cursor:pointer; transition:all 0.2s ease; border:1.5px solid ${selectedStaffId === 'all' ? '#2563eb' : '#cbd5e1'}; background:${selectedStaffId === 'all' ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : '#ffffff'}; color:${selectedStaffId === 'all' ? '#ffffff' : '#475569'}; box-shadow:${selectedStaffId === 'all' ? '0 2px 6px rgba(37,99,235,0.25)' : '0 1px 2px rgba(0,0,0,0.04)'};"
                    title="Xem báo cáo tổng quan bộ phận">
                    👥 Tất Cả (${staff.length})
                </button>
                ${staff.map(s => {
                    const isSel = selectedStaffId === s.id;
                    return `
                        <button onclick="window._kpiProdChangeStaffFilter(${s.id})" 
                            style="padding:5px 12px; border-radius:20px; font-size:12px; font-weight:800; font-family:'Plus Jakarta Sans', sans-serif; cursor:pointer; transition:all 0.2s ease; border:1.5px solid ${isSel ? '#2563eb' : '#cbd5e1'}; background:${isSel ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : '#ffffff'}; color:${isSel ? '#ffffff' : '#475569'}; box-shadow:${isSel ? '0 2px 6px rgba(37,99,235,0.25)' : '0 1px 2px rgba(0,0,0,0.04)'};"
                            title="Xem báo cáo KPI cá nhân của ${_escapeHtml(s.full_name)}">
                            👤 ${_escapeHtml(s.full_name)}
                        </button>
                    `;
                }).join('')}
            </div>
        `;

        // Quarter data
        const quarters = [
            { quarter: 1, label: 'Quý 1', months: [1,2,3] },
            { quarter: 2, label: 'Quý 2', months: [4,5,6] },
            { quarter: 3, label: 'Quý 3', months: [7,8,9] },
            { quarter: 4, label: 'Quý 4', months: [10,11,12] }
        ];

        // Build quarter rows
        let quarterRowsHtml = '';
        quarters.forEach(q => {
            const qCfg = data.dept_configs?.[100 + q.quarter] || data.dept_configs?.[0] || {};
            const qEvalRule = qCfg.eval_rule || 'ALL';

            let qProducts = 0, qMinutes = 0, qErrors = 0;
            let qTargetProducts = 0, qTargetErrors = 0, qTargetRateSum = 0, qTargetRateCount = 0;
            let qAchievedCount = 0, qNotAchievedCount = 0, qPendingCount = 0;
            let qTotalRewardSum = 0;
            let qRewardBadgeHtml = '';

            if (selectedStaffId === 'all') {
                // Ưu tiên lấy Target từ cấu hình Top-Down Quý (tránh phồng do bù sản lượng)
                const qFixedCfg = data.dept_configs?.[100 + q.quarter];

                q.months.forEach(m => {
                    const mData = md[m]?.totals || {};
                    qProducts += mData.total_products || 0;
                    qMinutes += mData.total_minutes || 0;
                    qErrors += mData.total_errors || 0;
                    // Chỉ cộng dồn nếu KHÔNG có cấu hình Top-Down Quý
                    if (!qFixedCfg || !(qFixedCfg.target_products > 0)) {
                        qTargetProducts += mData.total_target_products || 0;
                    }
                    if (!qFixedCfg || !(qFixedCfg.target_errors > 0)) {
                        qTargetErrors += mData.total_target_errors || 0;
                    }
                    if (mData.avg_target_rate > 0) {
                        qTargetRateSum += mData.avg_target_rate;
                        qTargetRateCount++;
                    }
                });

                // Ghi đè bằng giá trị Top-Down cố định nếu có
                if (qFixedCfg && qFixedCfg.target_products > 0) {
                    qTargetProducts = qFixedCfg.target_products;
                }
                if (qFixedCfg && qFixedCfg.target_errors > 0) {
                    qTargetErrors = qFixedCfg.target_errors;
                }

                // Evaluate achievement for EACH staff member in Quarter q
                staff.forEach(st => {
                    let stProducts = 0, stMinutes = 0, stErrors = 0;
                    let stTargetProducts = 0, stTargetErrors = 0, stTargetRateSum = 0, stTargetRateCount = 0;
                    let stRewardText = '';

                    const qMonthCode = 100 + q.quarter;
                    const savedQTarget = (data.target_rows || []).find(t => parseInt(t.user_id, 10) === parseInt(st.id, 10) && parseInt(t.month, 10) === parseInt(qMonthCode, 10));

                    q.months.forEach(m => {
                        const sEntry = md[m]?.staff?.find(s => s.user_id === st.id);
                        if (sEntry) {
                            stProducts += sEntry.products_done || 0;
                            stMinutes += sEntry.total_minutes || 0;
                            stErrors += sEntry.error_count || 0;
                            stTargetProducts += sEntry.target_products || 0;
                            stTargetErrors += sEntry.target_errors || 0;
                            if (sEntry.target_rate > 0) {
                                stTargetRateSum += sEntry.target_rate;
                                stTargetRateCount++;
                            }
                            if (!stRewardText && sEntry.reward_text) stRewardText = sEntry.reward_text;
                        }
                    });

                    // Note: Quarter targets are strictly aggregated from the 3 months of the quarter

                    const stTargetRate = stTargetRateCount > 0 ? (stTargetRateSum / stTargetRateCount) : 0;
                    const stRate = stMinutes > 0 ? (stProducts / stMinutes) : 0;
                    const hasLogged = stMinutes > 0;

                    let stPass = null;
                    if (hasLogged) {
                        const isPassP = stTargetProducts > 0 ? stProducts >= stTargetProducts : true;
                        const isPassE = stTargetErrors > 0 ? stErrors <= stTargetErrors : true;
                        const isPassR = stTargetRate > 0 ? stRate >= stTargetRate : true;

                        if (qEvalRule === 'ANY') {
                            stPass = (isPassP || isPassE || isPassR);
                        } else {
                            if (isPassP === false || isPassE === false || isPassR === false) stPass = false;
                            else if (isPassP === true || isPassE === true || isPassR === true) stPass = true;
                        }
                    }

                    if (stPass === true) {
                        qAchievedCount++;
                        qTotalRewardSum += _parseRewardAmount(stRewardText || qCfg.reward_text);
                    } else if (stPass === false) {
                        qNotAchievedCount++;
                    } else {
                        qPendingCount++;
                    }
                });

                if (qTotalRewardSum > 0) {
                    qRewardBadgeHtml = `<div style="font-size:10px; font-weight:900; color:#15803d; background:#dcfce7; border:1px solid #86efac; padding:1px 6px; border-radius:6px; display:inline-block; margin-top:3px;" title="Tổng tiền thưởng KPI các nhân viên đạt quý">✅ Tổng thưởng đạt: ${qTotalRewardSum.toLocaleString('vi-VN')}đ</div>`;
                } else if (qAchievedCount === 0 && qNotAchievedCount > 0) {
                    qRewardBadgeHtml = `<div style="font-size:10px; font-weight:800; color:#b91c1c; background:#fee2e2; border:1px solid #fca5a5; padding:1px 6px; border-radius:6px; display:inline-block; margin-top:3px;" title="Không có nhân viên đạt KPI quý">❌ Không có thưởng</div>`;
                } else {
                    // Sum target budget if pending
                    let qBudgetSum = 0;
                    staff.forEach(st => {
                        q.months.forEach(m => {
                            const sEntry = md[m]?.staff?.find(s => s.user_id === st.id);
                            if (sEntry && sEntry.reward_text) {
                                qBudgetSum += _parseRewardAmount(sEntry.reward_text);
                            }
                        });
                    });
                    if (qBudgetSum > 0) {
                        qRewardBadgeHtml = `<div style="font-size:10px; font-weight:800; color:#475569; background:#f1f5f9; border:1px solid #cbd5e1; padding:1px 6px; border-radius:6px; display:inline-block; margin-top:3px;" title="Tổng định mức thưởng nếu tất cả nhân viên đạt KPI quý">🎯 Định mức thưởng: ${qBudgetSum.toLocaleString('vi-VN')}đ</div>`;
                    }
                }
            } else {
                // Single staff view
                let stRewardText = '';
                q.months.forEach(m => {
                    const sEntry = md[m]?.staff?.find(s => s.user_id === selectedStaffId);
                    if (sEntry) {
                        qProducts += sEntry.products_done || 0;
                        qMinutes += sEntry.total_minutes || 0;
                        qErrors += sEntry.error_count || 0;
                        qTargetProducts += sEntry.target_products || 0;
                        qTargetErrors += sEntry.target_errors || 0;
                        if (sEntry.target_rate > 0) {
                            qTargetRateSum += sEntry.target_rate;
                            qTargetRateCount++;
                        }
                        if (!stRewardText && sEntry.reward_text) stRewardText = sEntry.reward_text;
                    }
                });

                const qRate = qMinutes > 0 ? (qProducts / qMinutes) : 0;
                const qTargetRate = qTargetRateCount > 0 ? (qTargetRateSum / qTargetRateCount) : 0;
                const hasLogged = qMinutes > 0;

                let stPass = null;
                if (hasLogged) {
                    const isPassP = qTargetProducts > 0 ? qProducts >= qTargetProducts : true;
                    const isPassE = qTargetErrors > 0 ? qErrors <= qTargetErrors : true;
                    const isPassR = qTargetRate > 0 ? qRate >= qTargetRate : true;

                    if (qEvalRule === 'ANY') {
                        stPass = (isPassP || isPassE || isPassR);
                    } else {
                        if (isPassP === false || isPassE === false || isPassR === false) stPass = false;
                        else if (isPassP === true || isPassE === true || isPassR === true) stPass = true;
                    }
                }

                if (stPass === true) {
                    qAchievedCount = 1;
                    const rewAmt = _parseRewardAmount(stRewardText || qCfg.reward_text);
                    const rewStr = rewAmt > 0 ? `${rewAmt.toLocaleString('vi-VN')}đ` : (stRewardText || 'Đã đạt');
                    qRewardBadgeHtml = `<div style="font-size:10px; font-weight:900; color:#15803d; background:#dcfce7; border:1px solid #86efac; padding:1px 6px; border-radius:6px; display:inline-block; margin-top:3px;" title="Thưởng KPI cá nhân đạt được">✅ Được thưởng: ${rewStr}</div>`;
                } else if (stPass === false) {
                    qNotAchievedCount = 1;
                    const rewAmt = _parseRewardAmount(stRewardText || qCfg.reward_text);
                    const rewStr = rewAmt > 0 ? `${rewAmt.toLocaleString('vi-VN')}đ` : (stRewardText || '');
                    qRewardBadgeHtml = `<div style="font-size:10px; font-weight:800; color:#b91c1c; background:#fee2e2; border:1px solid #fca5a5; padding:1px 6px; border-radius:6px; display:inline-block; margin-top:3px;" title="Mất thưởng KPI cá nhân do không đạt">❌ Mất thưởng ${rewStr ? `(${rewStr})` : ''}</div>`;
                } else {
                    qPendingCount = 1;
                    const rewAmt = _parseRewardAmount(stRewardText || qCfg.reward_text);
                    const rewStr = rewAmt > 0 ? `${rewAmt.toLocaleString('vi-VN')}đ` : (stRewardText || '');
                    if (rewStr) {
                        qRewardBadgeHtml = `<div style="font-size:10px; font-weight:800; color:#475569; background:#f1f5f9; border:1px solid #cbd5e1; padding:1px 6px; border-radius:6px; display:inline-block; margin-top:3px;" title="Định mức thưởng nếu đạt KPI">🎁 Thưởng nếu đạt: ${rewStr}</div>`;
                    }
                }
            }

            const qRate = qMinutes > 0 ? (qProducts / qMinutes) : 0;
            const qTargetRate = qTargetRateCount > 0 ? (qTargetRateSum / qTargetRateCount) : 0;
            const isFuture = isCurrentYear && q.months[0] > currentMonth;
            const hasLogged = qMinutes > 0 && !isFuture;

            // Evaluate individual 3 criteria badges
            let prodPass = null, errPass = null, ratePass = null;
            if (hasLogged) {
                if (selectedStaffId === 'all') {
                    let pF = false, eF = false, rF = false;
                    staff.forEach(st => {
                        let stP = 0, stM = 0, stE = 0, stTP = 0, stTE = 0, stTRSum = 0, stTRCnt = 0;
                        q.months.forEach(m => {
                            const sEntry = md[m]?.staff?.find(s => s.user_id === st.id);
                            if (sEntry) {
                                stP += sEntry.products_done || 0;
                                stM += sEntry.total_minutes || 0;
                                stE += sEntry.error_count || 0;
                                stTP += sEntry.target_products || 0;
                                stTE += sEntry.target_errors || 0;
                                if (sEntry.target_rate > 0) { stTRSum += sEntry.target_rate; stTRCnt++; }
                            }
                        });
                        if (stM > 0) {
                            const stTRate = stTRCnt > 0 ? (stTRSum / stTRCnt) : 0;
                            const stRate = stP / stM;
                            if (stTP > 0 && stP < stTP) pF = true;
                            if (stTE > 0 && stE > stTE) eF = true;
                            if (stTRate > 0 && stRate < stTRate) rF = true;
                        }
                    });
                    prodPass = pF ? false : true;
                    errPass = eF ? false : true;
                    ratePass = rF ? false : true;
                } else {
                    prodPass = qTargetProducts > 0 ? qProducts >= qTargetProducts : true;
                    errPass = qTargetErrors > 0 ? qErrors <= qTargetErrors : true;
                    ratePass = qTargetRate > 0 ? qRate >= qTargetRate : true;
                }
            }

            let statusBadge = '';
            if (isFuture) {
                statusBadge = '<span class="kpi-prod-badge kpi-prod-badge-pending">⏳ CHƯA ĐẾN</span>';
            } else if (qMinutes === 0) {
                statusBadge = '<span class="kpi-prod-badge kpi-prod-badge-pending">⏳ CHƯA CÓ DỮ LIỆU</span>';
            } else if (qNotAchievedCount === 0 && qAchievedCount > 0) {
                statusBadge = '<span class="kpi-prod-badge kpi-prod-badge-success">✅ ĐẠT</span>';
            } else if (qNotAchievedCount > 0) {
                statusBadge = '<span class="kpi-prod-badge kpi-prod-badge-danger">❌ CHƯA ĐẠT</span>';
            } else {
                statusBadge = '<span class="kpi-prod-badge kpi-prod-badge-pending">⏳ CHƯA CÓ DỮ LIỆU</span>';
            }

            const isExpanded = !!_kpiProdState.expandedQuarters?.[q.quarter];
            let expandBtnHtml = '';
            if (selectedStaffId === 'all' && staff.length > 0) {
                expandBtnHtml = `
                    <div>
                        <button onclick="window._kpiProdToggleQuarterExpand(${q.quarter})" style="font-family:'Plus Jakarta Sans', sans-serif; font-size:9.5px; font-weight:800; color:#2563eb; background:#eff6ff; border:1px solid #bfdbfe; padding:2px 6px; border-radius:6px; margin-top:3px; cursor:pointer; display:inline-flex; align-items:center; gap:2px;" title="Mở rộng / thu gọn chi tiết từng nhân viên">
                            ${isExpanded ? '▲ Thu gọn' : '▼ Chi tiết NV (' + staff.length + ')'}
                        </button>
                    </div>
                `;
            }

            quarterRowsHtml += `
                <tr>
                    <td style="font-weight:900; text-align:left;">
                        <div>${q.label}</div>
                        ${qRewardBadgeHtml}
                        ${expandBtnHtml}
                    </td>
                    <td style="font-weight:900;">${_kpiProdFmt(qProducts)}</td>
                    <td style="color:#0284c7;font-weight:800;">${_kpiProdFmt(qTargetProducts)}</td>
                    <td style="text-align:center;">${_renderMiniStatusBadge(prodPass, hasLogged)}</td>

                    <td style="color:#b45309;font-weight:800;">${_kpiProdFmt(qErrors)}</td>
                    <td style="color:#b91c1c;font-weight:800;">${_kpiProdFmt(qTargetErrors)}</td>
                    <td style="text-align:center;">${_renderMiniStatusBadge(errPass, hasLogged)}</td>

                    <td>${qRate > 0 ? _kpiProdFmtRate(qRate) : '-'}</td>
                    <td style="color:#4f46e5;font-weight:800;">${qTargetRate > 0 ? _kpiProdFmtRate(qTargetRate) : '-'}</td>
                    <td style="text-align:center;">${_renderMiniStatusBadge(ratePass, hasLogged)}</td>

                    <td>${_kpiProdFmt(qMinutes)}</td>
                    <td>${statusBadge}</td>
                    <td>
                        ${isDirectorUser ? `
                        <button onclick="window._openKpiProdConfigModal(${100 + q.quarter})" 
                            style="padding:4px 10px; background:#eff6ff; color:#2563eb; border:1.5px solid #bfdbfe; border-radius:6px; font-size:11.5px; font-weight:800; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif;" 
                            title="Bấm để mở quy trình phân bổ chỉ tiêu Quý ${q.quarter}">
                            ⚙️ Cấu Hình Quý
                        </button>
                        ` : ''}
                    </td>
                </tr>
            `;

            if (selectedStaffId === 'all' && isExpanded) {
                staff.forEach(st => {
                    let stProducts = 0, stMinutes = 0, stErrors = 0;
                    let stTargetProducts = 0, stTargetErrors = 0, stTargetRateSum = 0, stTargetRateCount = 0;
                    let stRewardText = '';

                    q.months.forEach(m => {
                        const sEntry = md[m]?.staff?.find(s => s.user_id === st.id);
                        if (sEntry) {
                            stProducts += sEntry.products_done || 0;
                            stMinutes += sEntry.total_minutes || 0;
                            stErrors += sEntry.error_count || 0;
                            stTargetProducts += sEntry.target_products || 0;
                            stTargetErrors += sEntry.target_errors || 0;
                            if (sEntry.target_rate > 0) { stTargetRateSum += sEntry.target_rate; stTargetRateCount++; }
                            if (!stRewardText && sEntry.reward_text) stRewardText = sEntry.reward_text;
                        }
                    });

                    const stRate = stMinutes > 0 ? (stProducts / stMinutes) : 0;
                    const stTargetRate = stTargetRateCount > 0 ? (stTargetRateSum / stTargetRateCount) : 0;
                    const stHasLogged = stMinutes > 0 && !isFuture;

                    let stPPass = stHasLogged ? (stTargetProducts > 0 ? stProducts >= stTargetProducts : true) : null;
                    let stEPass = stHasLogged ? (stTargetErrors > 0 ? stErrors <= stTargetErrors : true) : null;
                    let stRPass = stHasLogged ? (stTargetRate > 0 ? stRate >= stTargetRate : true) : null;

                    let stPass = null;
                    if (stHasLogged) {
                        if (qEvalRule === 'ANY') stPass = (stPPass || stEPass || stRPass);
                        else stPass = (stPPass && stEPass && stRPass);
                    }

                    const rewAmt = _parseRewardAmount(stRewardText || qCfg.reward_text);
                    const rewStr = rewAmt > 0 ? `${rewAmt.toLocaleString('vi-VN')}đ` : (stRewardText || '');
                    let stBadge = '<span class="kpi-prod-badge kpi-prod-badge-pending" style="font-size:8.5px;">⏳</span>';
                    if (stPass === true) stBadge = `<span class="kpi-prod-badge kpi-prod-badge-success" style="font-size:8.5px;">✅ ĐẠT ${rewStr ? `(${rewStr})` : ''}</span>`;
                    else if (stPass === false) stBadge = `<span class="kpi-prod-badge kpi-prod-badge-danger" style="font-size:8.5px;">❌ MẤT THƯỞNG</span>`;

                    quarterRowsHtml += `
                        <tr style="background:#f8fafc; font-size:11px; border-bottom:1px solid #e2e8f0;">
                            <td style="padding-left:24px; text-align:left; font-weight:700; color:#334155;">
                                👤 ${_escapeHtml(st.full_name)}
                            </td>
                            <td style="font-weight:700; color:#0f172a;">${_kpiProdFmt(stProducts)}</td>
                            <td style="color:#0284c7;">${_kpiProdFmt(stTargetProducts)}</td>
                            <td style="text-align:center;">${_renderMiniStatusBadge(stPPass, stHasLogged)}</td>

                            <td style="color:#b45309;">${_kpiProdFmt(stErrors)}</td>
                            <td style="color:#b91c1c;">${_kpiProdFmt(stTargetErrors)}</td>
                            <td style="text-align:center;">${_renderMiniStatusBadge(stEPass, stHasLogged)}</td>

                            <td>${stRate > 0 ? _kpiProdFmtRate(stRate) : '-'}</td>
                            <td style="color:#4f46e5;">${stTargetRate > 0 ? _kpiProdFmtRate(stTargetRate) : '-'}</td>
                            <td style="text-align:center;">${_renderMiniStatusBadge(stRPass, stHasLogged)}</td>

                            <td>${_kpiProdFmt(stMinutes)}</td>
                            <td>${stBadge}</td>
                            <td><span style="color:#94a3b8; font-size:11px; font-weight:700;">—</span></td>
                        </tr>
                    `;
                });
            }
        });

        // Year total row
        const yCfg = data.dept_configs?.[0] || {};
        const yEvalRule = yCfg.eval_rule || 'ALL';

        let yProducts = 0, yMinutes = 0, yErrors = 0;
        let yTargetProducts = 0, yTargetErrors = 0, yTargetRateSum = 0, yTargetRateCount = 0;
        let yAchievedCount = 0, yNotAchievedCount = 0, yPendingCount = 0;
        let yTotalRewardSum = 0;
        let yRewardBadgeHtml = '';

        if (selectedStaffId === 'all') {
            // Ưu tiên lấy Target từ cấu hình Top-Down Năm (tránh phồng do bù sản lượng)
            const yFixedCfg = data.dept_configs?.[0];

            for (let m = 1; m <= 12; m++) {
                const mData = md[m]?.totals || {};
                yProducts += mData.total_products || 0;
                yMinutes += mData.total_minutes || 0;
                yErrors += mData.total_errors || 0;
                // Chỉ cộng dồn nếu KHÔNG có cấu hình Top-Down Năm
                if (!yFixedCfg || !(yFixedCfg.target_products > 0)) {
                    yTargetProducts += mData.total_target_products || 0;
                }
                if (!yFixedCfg || !(yFixedCfg.target_errors > 0)) {
                    yTargetErrors += mData.total_target_errors || 0;
                }
                if (mData.avg_target_rate > 0) {
                    yTargetRateSum += mData.avg_target_rate;
                    yTargetRateCount++;
                }
            }

            // Ghi đè bằng giá trị Top-Down cố định nếu có
            if (yFixedCfg && yFixedCfg.target_products > 0) {
                yTargetProducts = yFixedCfg.target_products;
            }
            if (yFixedCfg && yFixedCfg.target_errors > 0) {
                yTargetErrors = yFixedCfg.target_errors;
            }

            staff.forEach(st => {
                let stProducts = 0, stMinutes = 0, stErrors = 0;
                let stTargetProducts = 0, stTargetErrors = 0, stTargetRateSum = 0, stTargetRateCount = 0;
                let stRewardText = '';

                for (let m = 1; m <= 12; m++) {
                    const sEntry = md[m]?.staff?.find(s => s.user_id === st.id);
                    if (sEntry) {
                        stProducts += sEntry.products_done || 0;
                        stMinutes += sEntry.total_minutes || 0;
                        stErrors += sEntry.error_count || 0;
                        stTargetProducts += sEntry.target_products || 0;
                        stTargetErrors += sEntry.target_errors || 0;
                        if (sEntry.target_rate > 0) {
                            stTargetRateSum += sEntry.target_rate;
                            stTargetRateCount++;
                        }
                        if (!stRewardText && sEntry.reward_text) stRewardText = sEntry.reward_text;
                    }
                }

                const stTargetRate = stTargetRateCount > 0 ? (stTargetRateSum / stTargetRateCount) : 0;
                const stRate = stMinutes > 0 ? (stProducts / stMinutes) : 0;
                const hasLogged = stMinutes > 0;

                let stPass = null;
                if (hasLogged) {
                    const isPassP = stTargetProducts > 0 ? stProducts >= stTargetProducts : true;
                    const isPassE = stTargetErrors > 0 ? stErrors <= stTargetErrors : true;
                    const isPassR = stTargetRate > 0 ? stRate >= stTargetRate : true;

                    if (yEvalRule === 'ANY') {
                        stPass = (isPassP || isPassE || isPassR);
                    } else {
                        if (isPassP === false || isPassE === false || isPassR === false) stPass = false;
                        else if (isPassP === true || isPassE === true || isPassR === true) stPass = true;
                    }
                }

                if (stPass === true) {
                    yAchievedCount++;
                    yTotalRewardSum += _parseRewardAmount(stRewardText || yCfg.reward_text);
                } else if (stPass === false) {
                    yNotAchievedCount++;
                } else {
                    yPendingCount++;
                }
            });

            if (yTotalRewardSum > 0) {
                yRewardBadgeHtml = `<div style="font-size:10px; font-weight:900; color:#15803d; background:#dcfce7; border:1px solid #86efac; padding:1px 6px; border-radius:6px; display:inline-block; margin-top:3px;" title="Tổng tiền thưởng KPI cả năm cho các nhân viên đạt">✅ Tổng thưởng đạt: ${yTotalRewardSum.toLocaleString('vi-VN')}đ</div>`;
            } else if (yAchievedCount === 0 && yNotAchievedCount > 0) {
                yRewardBadgeHtml = `<div style="font-size:10px; font-weight:800; color:#b91c1c; background:#fee2e2; border:1px solid #fca5a5; padding:1px 6px; border-radius:6px; display:inline-block; margin-top:3px;" title="Không có nhân viên đạt KPI cả năm">❌ Không có thưởng</div>`;
            } else {
                let yBudgetSum = 0;
                staff.forEach(st => {
                    for (let m = 1; m <= 12; m++) {
                        const sEntry = md[m]?.staff?.find(s => s.user_id === st.id);
                        if (sEntry && sEntry.reward_text) {
                            yBudgetSum += _parseRewardAmount(sEntry.reward_text);
                        }
                    }
                });
                if (yBudgetSum > 0) {
                    yRewardBadgeHtml = `<div style="font-size:10px; font-weight:800; color:#475569; background:#f1f5f9; border:1px solid #cbd5e1; padding:1px 6px; border-radius:6px; display:inline-block; margin-top:3px;" title="Tổng định mức thưởng cả năm nếu tất cả nhân viên đạt KPI">🎯 Định mức thưởng: ${yBudgetSum.toLocaleString('vi-VN')}đ</div>`;
                }
            }
        } else {
            // Single staff
            let stRewardText = '';
            for (let m = 1; m <= 12; m++) {
                const sEntry = md[m]?.staff?.find(s => s.user_id === selectedStaffId);
                if (sEntry) {
                    yProducts += sEntry.products_done || 0;
                    yMinutes += sEntry.total_minutes || 0;
                    yErrors += sEntry.error_count || 0;
                    yTargetProducts += sEntry.target_products || 0;
                    yTargetErrors += sEntry.target_errors || 0;
                    if (sEntry.target_rate > 0) {
                        yTargetRateSum += sEntry.target_rate;
                        yTargetRateCount++;
                    }
                    if (!stRewardText && sEntry.reward_text) stRewardText = sEntry.reward_text;
                }
            }

            const yRate = yMinutes > 0 ? (yProducts / yMinutes) : 0;
            const yTargetRate = yTargetRateCount > 0 ? (yTargetRateSum / yTargetRateCount) : 0;
            const hasLogged = yMinutes > 0;

            let stPass = null;
            if (hasLogged) {
                const isPassP = yTargetProducts > 0 ? yProducts >= yTargetProducts : true;
                const isPassE = yTargetErrors > 0 ? yErrors <= yTargetErrors : true;
                const isPassR = yTargetRate > 0 ? yRate >= yTargetRate : true;

                if (yEvalRule === 'ANY') {
                    stPass = (isPassP || isPassE || isPassR);
                } else {
                    if (isPassP === false || isPassE === false || isPassR === false) stPass = false;
                    else if (isPassP === true || isPassE === true || isPassR === true) stPass = true;
                }
            }

            if (stPass === true) {
                yAchievedCount = 1;
                const rewAmt = _parseRewardAmount(stRewardText || yCfg.reward_text);
                const rewStr = rewAmt > 0 ? `${rewAmt.toLocaleString('vi-VN')}đ` : (stRewardText || 'Đã đạt');
                yRewardBadgeHtml = `<div style="font-size:10px; font-weight:900; color:#15803d; background:#dcfce7; border:1px solid #86efac; padding:1px 6px; border-radius:6px; display:inline-block; margin-top:3px;" title="Thưởng KPI cá nhân cả năm đạt được">✅ Được thưởng: ${rewStr}</div>`;
            } else if (stPass === false) {
                yNotAchievedCount = 1;
                const rewAmt = _parseRewardAmount(stRewardText || yCfg.reward_text);
                const rewStr = rewAmt > 0 ? `${rewAmt.toLocaleString('vi-VN')}đ` : (stRewardText || '');
                yRewardBadgeHtml = `<div style="font-size:10px; font-weight:800; color:#b91c1c; background:#fee2e2; border:1px solid #fca5a5; padding:1px 6px; border-radius:6px; display:inline-block; margin-top:3px;" title="Mất thưởng KPI cá nhân cả năm">❌ Mất thưởng ${rewStr ? `(${rewStr})` : ''}</div>`;
            } else {
                yPendingCount = 1;
                const rewAmt = _parseRewardAmount(stRewardText || yCfg.reward_text);
                const rewStr = rewAmt > 0 ? `${rewAmt.toLocaleString('vi-VN')}đ` : (stRewardText || '');
                if (rewStr) {
                    yRewardBadgeHtml = `<div style="font-size:10px; font-weight:800; color:#475569; background:#f1f5f9; border:1px solid #cbd5e1; padding:1px 6px; border-radius:6px; display:inline-block; margin-top:3px;" title="Định mức thưởng cả năm nếu đạt KPI">🎁 Thưởng nếu đạt: ${rewStr}</div>`;
                }
            }
        }

        const yearRate = yMinutes > 0 ? (yProducts / yMinutes) : 0;
        const yearTargetRate = yTargetRateCount > 0 ? (yTargetRateSum / yTargetRateCount) : 0;
        const hasLoggedY = yMinutes > 0;

        let yProdPass = null, yErrPass = null, yRatePass = null;
        if (hasLoggedY) {
            if (selectedStaffId === 'all') {
                let pF = false, eF = false, rF = false;
                staff.forEach(st => {
                    let stP = 0, stM = 0, stE = 0, stTP = 0, stTE = 0, stTRSum = 0, stTRCnt = 0;
                    for (let m = 1; m <= 12; m++) {
                        const sEntry = md[m]?.staff?.find(s => s.user_id === st.id);
                        if (sEntry) {
                            stP += sEntry.products_done || 0;
                            stM += sEntry.total_minutes || 0;
                            stE += sEntry.error_count || 0;
                            stTP += sEntry.target_products || 0;
                            stTE += sEntry.target_errors || 0;
                            if (sEntry.target_rate > 0) { stTRSum += sEntry.target_rate; stTRCnt++; }
                        }
                    }
                    if (stM > 0) {
                        const stTRate = stTRCnt > 0 ? (stTRSum / stTRCnt) : 0;
                        const stRate = stP / stM;
                        if (stTP > 0 && stP < stTP) pF = true;
                        if (stTE > 0 && stE > stTE) eF = true;
                        if (stTRate > 0 && stRate < stTRate) rF = true;
                    }
                });
                yProdPass = pF ? false : true;
                yErrPass = eF ? false : true;
                yRatePass = rF ? false : true;
            } else {
                yProdPass = yTargetProducts > 0 ? yProducts >= yTargetProducts : true;
                yErrPass = yTargetErrors > 0 ? yErrors <= yTargetErrors : true;
                yRatePass = yearTargetRate > 0 ? yearRate >= yearTargetRate : true;
            }
        }

        let yStatusBadge = '';
        if (yMinutes === 0) {
            yStatusBadge = '<span class="kpi-prod-badge kpi-prod-badge-pending">⏳ CHƯA CÓ DỮ LIỆU</span>';
        } else if (yNotAchievedCount === 0 && yAchievedCount > 0) {
            yStatusBadge = '<span class="kpi-prod-badge kpi-prod-badge-success">✅ ĐẠT</span>';
        } else if (yNotAchievedCount > 0) {
            yStatusBadge = '<span class="kpi-prod-badge kpi-prod-badge-danger">❌ CHƯA ĐẠT</span>';
        } else {
            yStatusBadge = '<span class="kpi-prod-badge kpi-prod-badge-pending">⏳ CHƯA CÓ DỮ LIỆU</span>';
        }

        quarterRowsHtml += `
            <tr class="row-total">
                <td style="font-weight:900; text-align:left;">
                    <div>Cả Năm ${_kpiProdState.year}</div>
                    ${yRewardBadgeHtml}
                </td>
                <td style="font-weight:900;">${_kpiProdFmt(yProducts)}</td>
                <td style="color:#0284c7;font-weight:900;">${_kpiProdFmt(yTargetProducts)}</td>
                <td style="text-align:center;">${_renderMiniStatusBadge(yProdPass, hasLoggedY)}</td>

                <td style="color:#b45309;font-weight:900;">${_kpiProdFmt(yErrors)}</td>
                <td style="color:#b91c1c;font-weight:900;">${_kpiProdFmt(yTargetErrors)}</td>
                <td style="text-align:center;">${_renderMiniStatusBadge(yErrPass, hasLoggedY)}</td>

                <td>${yearRate > 0 ? _kpiProdFmtRate(yearRate) : '-'}</td>
                <td style="color:#4f46e5;font-weight:900;">${yearTargetRate > 0 ? _kpiProdFmtRate(yearTargetRate) : '-'}</td>
                <td style="text-align:center;">${_renderMiniStatusBadge(yRatePass, hasLoggedY)}</td>

                <td>${_kpiProdFmt(yMinutes)}</td>
                <td>${yStatusBadge}</td>
                <td>
                    ${isDirectorUser ? `
                    <button onclick="window._openKpiProdConfigModal(0)" 
                        style="padding:5px 14px; background:linear-gradient(135deg,#2563eb,#1d4ed8); color:#ffffff; border:none; border-radius:6px; font-size:12px; font-weight:900; cursor:pointer; box-shadow:0 3px 8px rgba(37,99,235,0.3); font-family:'Plus Jakarta Sans',sans-serif;" 
                        title="Bấm để cài đặt Cấu Hình KPI Cả Năm (Bước 1)">
                        ⚙️ Cấu Hình Năm
                    </button>
                    ` : ''}
                </td>
            </tr>
        `;

        // ========== MONTHLY CARDS ==========
        let monthlyCardsHtml = '';
        for (let m = 1; m <= 12; m++) {
            const mData = md[m] || { staff: [], totals: {} };
            const isCurrent = isCurrentYear && m === currentMonth;
            const isFuture = isCurrentYear && m > currentMonth;
            const monthNames = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

            let cardClass = 'kpi-prod-m-card';
            if (isCurrent) cardClass += ' is-current-month';

            // Month badge
            let monthBadge = '';
            if (isCurrent) monthBadge = '<span style="background:#f59e0b;color:#fff;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:900;">THÁNG NÀY</span>';
            else if (isFuture) monthBadge = '<span style="background:#e2e8f0;color:#94a3b8;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:900;">SẮP TỚI</span>';

            // Summary stats
            const totals = mData.totals || {};

            const cfgDataForCheck = mData.config || {};
            const commitEvalsCheck = Array.isArray(cfgDataForCheck.commitment_evals) ? cfgDataForCheck.commitment_evals : [];
            const supportEvalsCheck = Array.isArray(cfgDataForCheck.support_evals) ? cfgDataForCheck.support_evals : [];
            const isMonthEvaluated = commitEvalsCheck.some(e => e) || supportEvalsCheck.some(e => e);
            const isDirectorUser = typeof currentUser !== 'undefined' && currentUser && (currentUser.role === 'giam_doc' || currentUser.role === 'admin' || currentUser.username === 'admin');

            const canInput = _canInputKpiProd();
            const canEditThisMonth = !isMonthEvaluated && canInput;

            const isMonthCfg = _isMonthConfigured(m);

            // Staff rows inside card
            let staffRowsHtml = '';
            const staffList = mData.staff || [];
            if (staffList.length === 0) {
                staffRowsHtml = '<tr><td colspan="10" style="text-align:center;color:#94a3b8;padding:16px;">Chưa có nhân viên cắt</td></tr>';
            } else {
                staffList.forEach((s, idx) => {
                    const rInfo = rollingMap[m]?.[s.user_id] || { base_target: s.target_products || 0, adjusted_target: s.target_products || 0, rolled_gap: 0, is_past: false };
                    const baseTargetProducts = rInfo.base_target;

                    // Evaluate achievement using base target (rolling system disabled)
                    const actualRate = s.total_minutes > 0 ? s.products_done / s.total_minutes : 0;
                    let staffAchieved = s.achieved;
                    if (s.total_minutes > 0 && baseTargetProducts > 0 && isMonthCfg) {
                        const prodPass = s.products_done >= baseTargetProducts;
                        const errPass = s.target_errors > 0 ? s.error_count <= s.target_errors : true;
                        const ratePass = s.target_rate > 0 ? actualRate >= s.target_rate : true;
                        staffAchieved = prodPass && errPass && ratePass;
                    }

                    const rateDisplay = s.total_minutes > 0 ? _kpiProdFmtRate(s.actual_rate) : '-';
                    let statusHtml = '';
                    if (staffAchieved === true) statusHtml = '<span class="kpi-prod-badge kpi-prod-badge-success" style="font-size:9px;">✅ ĐẠT</span>';
                    else if (staffAchieved === false) statusHtml = '<span class="kpi-prod-badge kpi-prod-badge-danger" style="font-size:9px;">❌ CHƯA ĐẠT</span>';
                    else statusHtml = '<span class="kpi-prod-badge kpi-prod-badge-pending" style="font-size:9px;">⏳</span>';

                    const disMinutesAttr = !canEditThisMonth 
                        ? `disabled title="${isMonthEvaluated ? 'Tháng này đã hoàn tất đánh giá, không thể sửa đổi số phút!' : 'Bạn không có quyền điền hoặc chỉnh sửa Phút Làm'}" style="background:#f1f5f9; cursor:not-allowed; opacity:0.85;"` 
                        : '';

                    const disErrorsAttr = !canEditThisMonth 
                        ? `disabled title="${isMonthEvaluated ? 'Tháng me này đã hoàn tất đánh giá, không thể sửa đổi số lỗi!' : 'Bạn không có quyền điền hoặc chỉnh sửa Số Lỗi'}" style="color:#b45309; border-color:#cbd5e1; background:#f1f5f9; cursor:not-allowed; opacity:0.85;"` 
                        : 'style="color:#b45309; border-color:#fde68a;"';

                    let targetProductsCellHtml = '-';
                    if (isMonthCfg && rInfo.base_target > 0) {
                        targetProductsCellHtml = `<span style="color:#0284c7; font-weight:800;">${_kpiProdFmt(rInfo.base_target)}</span>`;
                    }

                    staffRowsHtml += `
                        <tr>
                            <td style="text-align:left;max-width:90px;overflow:hidden;text-overflow:ellipsis;font-weight:700;" title="${s.full_name}">${s.full_name}</td>
                            <td>
                                <input type="number" class="kpi-prod-input" 
                                    data-uid="${s.user_id}" data-month="${m}" data-field="minutes"
                                    value="${s.total_minutes || ''}" 
                                    placeholder="0"
                                    onblur="window._kpiProdAutoSave(this)"
                                    min="0" ${disMinutesAttr}>
                            </td>
                            <td style="font-weight:900;color:#0f172a;">${_kpiProdFmt(s.products_done)}</td>
                            <td>${targetProductsCellHtml}</td>
                            <td>
                                <input type="number" class="kpi-prod-input" 
                                    data-uid="${s.user_id}" data-month="${m}" data-field="errors"
                                    value="${s.error_count || ''}" 
                                    placeholder="0"
                                    ${disErrorsAttr}
                                    onblur="window._kpiProdAutoSave(this)"
                                    min="0">
                            </td>
                            <td style="color:#b91c1c;font-weight:800;">${(isMonthCfg && s.target_errors > 0) ? _kpiProdFmt(s.target_errors) : '-'}</td>
                            <td style="font-weight:900;color:${staffAchieved === true ? '#15803d' : staffAchieved === false ? '#b91c1c' : '#64748b'};">${rateDisplay}</td>
                            <td style="color:#4f46e5;font-weight:800;">${(isMonthCfg && s.target_rate > 0) ? _kpiProdFmtRate(s.target_rate) : '-'}</td>
                            <td>${statusHtml}</td>
                        </tr>
                    `;
                });
            }

            const canEditConfig = isDirectorUser || (typeof canDo === 'function' && canDo('kpi_san_xuat', 'edit'));
            let configBtnHtml = '';
            if (isDirectorUser || (!isMonthEvaluated && (canEditConfig || canInput))) {
                configBtnHtml = `<button onclick="window._openKpiProdConfigModal(${m})" style="font-family:'Plus Jakarta Sans', sans-serif; font-size:11px; font-weight:800; ${isMonthCfg ? 'color:#15803d; background:linear-gradient(135deg,#dcfce7 0%,#bbf7d0 100%); border:1.5px solid #86efac;' : 'color:#3730a3; background:linear-gradient(135deg,#eef2ff 0%,#e0e7ff 100%); border:1.5px solid #c7d2fe;'} padding:4px 10px; border-radius:8px; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,0.06); transition:all 0.2s;" title="${isMonthCfg ? 'Đã cấu hình KPI tháng ' + m : 'Cấu hình KPI tháng ' + m}">${isMonthCfg ? '✅ Đã Cấu Hình' : '⚙️ Cấu Hình'}</button>`;
            }

            monthlyCardsHtml += `
                <div class="${cardClass}">
                    <div class="kpi-prod-m-header">
                        <div class="kpi-prod-m-title">${monthNames[m]}/${_kpiProdState.year}</div>
                        <div style="display:flex; align-items:center; gap:6px;">
                            ${monthBadge}
                            ${configBtnHtml}
                        </div>
                    </div>
                    <div class="kpi-prod-m-stats">
                        <div class="kpi-prod-m-stat-pill">📦 SP: <strong style="color:#0f172a;margin-left:3px;">${_kpiProdFmt(totals.total_products || 0)}</strong></div>
                        <div class="kpi-prod-m-stat-pill">⏱️ Phút: <strong style="color:#0f172a;margin-left:3px;">${_kpiProdFmt(totals.total_minutes || 0)}</strong></div>
                        <div class="kpi-prod-m-stat-pill" style="color:#b45309;">⚠️ Lỗi: <strong style="color:#92400e;margin-left:3px;">${_kpiProdFmt(totals.total_errors || 0)}</strong></div>
                        <div class="kpi-prod-m-stat-pill" style="color:#15803d;">✅ ${totals.achieved_count || 0}</div>
                        <div class="kpi-prod-m-stat-pill" style="color:#b91c1c;">❌ ${totals.not_achieved_count || 0}</div>
                    </div>
                    <div style="overflow-x:auto;border-radius:10px;border:1px solid #e2e8f0;">
                        <table class="kpi-prod-staff-table">
                            <thead>
                                <tr>
                                    <th rowspan="2" style="text-align:left;padding-left:6px;vertical-align:middle;">Nhân Viên</th>
                                    <th rowspan="2" style="vertical-align:middle;">Phút Làm</th>
                                    <th colspan="2" style="text-align:center;border-bottom:1px solid #334155;">${deptInfo.productLabel.toUpperCase()} (SP)</th>
                                    <th colspan="2" style="text-align:center;border-bottom:1px solid #334155;">SỐ LỖI (Đơn)</th>
                                    <th colspan="2" style="text-align:center;border-bottom:1px solid #334155;">NĂNG SUẤT (SP/phút)</th>
                                    <th rowspan="2" style="vertical-align:middle;">Kết Quả</th>
                                </tr>
                                <tr>
                                    <th style="font-size:9.5px;color:#cbd5e1;font-weight:700;">Thực Tế</th>
                                    <th style="font-size:9.5px;color:#7dd3fc;font-weight:800;">KPI Target</th>
                                    <th style="font-size:9.5px;color:#cbd5e1;font-weight:700;">Thực Tế</th>
                                    <th style="font-size:9.5px;color:#fca5a5;font-weight:800;">KPI Max</th>
                                    <th style="font-size:9.5px;color:#cbd5e1;font-weight:700;">Thực Tế</th>
                                    <th style="font-size:9.5px;color:#c7d2fe;font-weight:800;">KPI Target</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${staffRowsHtml}
                            </tbody>
                        </table>
                    </div>

                    ${(() => {
                        const cfgData = mData.config || {};
                        const commitments = Array.isArray(cfgData.commitments) ? cfgData.commitments : [];
                        const supports = Array.isArray(cfgData.supports) ? cfgData.supports : [];
                        const commitmentEvals = Array.isArray(cfgData.commitment_evals) ? cfgData.commitment_evals : [];
                        const supportEvals = Array.isArray(cfgData.support_evals) ? cfgData.support_evals : [];
                        const hasConfiguredKpi = staffList.some(s => s.target_products > 0 || s.target_errors > 0 || s.target_rate > 0);
                        const achievedAll = staffList.length > 0 && staffList.every(s => s.achieved === true);
                        const hasAnyData = commitments.length > 0 || supports.length > 0;
                        const commitPassedCount = commitmentEvals.filter(e => e && e.passed).length;
                        const completionPct = commitments.length > 0 ? Math.round((commitPassedCount / commitments.length) * 100) : 0;
                        const hasEvals = commitmentEvals.some(e => e) || supportEvals.some(e => e);

                        if (!hasAnyData && !hasConfiguredKpi) return '';

                        let html = '';

                        // Render Commitments Box
                        let commitBoxHtml = '';
                        if (commitments.length > 0) {
                            commitBoxHtml += '<div style="flex:1; min-width:0; background:linear-gradient(180deg,#ffffff 0%,#f8fafc 100%); border:1.5px solid #e2e8f0; border-radius:12px; padding:10px 12px; box-shadow:0 2px 8px rgba(15,23,42,0.03);"><div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #f1f5f9; padding-bottom:6px;"><span style="font-size:11.5px; font-weight:900; color:#0f172a; display:flex; align-items:center; gap:6px;">📋 Cam Kết ' + _escapeHtml(deptInfo.label) + ' <span style="background:#e0e7ff; color:#4338ca; font-size:10px; padding:1px 6px; border-radius:99px; font-weight:900;">' + commitments.length + '</span></span></div><div style="display:flex; flex-direction:column; gap:6px;">';
                            commitments.forEach((c, idx) => {
                                const ev = commitmentEvals[idx];
                                let badge = '<span style="font-size:10px; font-weight:800; color:#94a3b8; background:#f1f5f9; padding:2px 7px; border-radius:99px; border:1px solid #cbd5e1; white-space:nowrap;">⏳ Chưa đánh giá</span>';
                                let note = '';
                                let rs = 'border-left:4px solid #cbd5e1; background:#fff; border:1px solid #e2e8f0; border-left-color:#cbd5e1;';
                                if (ev) {
                                    if (ev.passed) {
                                        badge = '<span style="font-size:10px; font-weight:900; color:#15803d; background:#dcfce7; padding:2px 8px; border-radius:99px; border:1px solid #86efac; white-space:nowrap;">✅ ĐẠT</span>';
                                        rs = 'border-left:4px solid #22c55e; background:#fff; border:1px solid #dcfce7; border-left-color:#22c55e;';
                                    } else {
                                        badge = '<span style="font-size:10px; font-weight:900; color:#b91c1c; background:#fee2e2; padding:2px 8px; border-radius:99px; border:1px solid #fca5a5; white-space:nowrap;">❌ CHƯA ĐẠT</span>';
                                        rs = 'border-left:4px solid #ef4444; background:#fff; border:1px solid #fee2e2; border-left-color:#ef4444;';
                                    }
                                    if (ev.note) {
                                        note = '<div style="margin-top:4px; padding:5px 8px; background:' + (ev.passed ? '#f0fdf4' : '#fef2f2') + '; border-radius:6px; border:1px solid ' + (ev.passed ? '#bbf7d0' : '#fecaca') + '; font-size:10.5px; font-weight:700; color:' + (ev.passed ? '#166534' : '#991b1b') + '; display:flex; align-items:flex-start; gap:4px;"><span>💬</span> <span><b>Ghi chú:</b> ' + _escapeHtml(ev.note) + '</span></div>';
                                    }
                                }
                                commitBoxHtml += '<div style="display:flex; flex-direction:column; gap:4px; padding:8px 10px; border-radius:8px; ' + rs + ' font-size:11.5px; line-height:1.4; box-shadow:0 1px 3px rgba(0,0,0,0.03);"><div style="display:flex; align-items:flex-start; justify-content:space-between; gap:8px;"><div style="font-weight:800; color:#0f172a; flex:1; word-break:break-word;"><span style="color:#64748b; font-weight:900;">' + (idx + 1) + '.</span> ' + _escapeHtml(c) + '</div><div style="flex-shrink:0;">' + badge + '</div></div>' + note + '</div>';
                            });
                            commitBoxHtml += '</div></div>';
                        }

                        // Render Supports Box
                        let supportBoxHtml = '';
                        if (supports.length > 0) {
                            const deptShort = deptInfo.label.replace('Bộ Phận ', '');
                            supportBoxHtml += '<div style="flex:1; min-width:0; background:linear-gradient(180deg,#ffffff 0%,#f0f9ff 100%); border:1.5px solid #bae6fd; border-radius:12px; padding:10px 12px; box-shadow:0 2px 8px rgba(2,132,199,0.03);"><div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #e0f2fe; padding-bottom:6px;"><span style="font-size:11.5px; font-weight:900; color:#0369a1; display:flex; align-items:center; gap:6px;">🤝 ' + _escapeHtml(deptShort) + ' Cần Công Ty Hỗ Trợ <span style="background:#e0f2fe; color:#0369a1; font-size:10px; padding:1px 6px; border-radius:99px; font-weight:900;">' + supports.length + '</span></span></div><div style="display:flex; flex-direction:column; gap:6px;">';
                            supports.forEach((s2, idx) => {
                                const ev = supportEvals[idx];
                                let badge = '<span style="font-size:10px; font-weight:800; color:#94a3b8; background:#f1f5f9; padding:2px 7px; border-radius:99px; border:1px solid #cbd5e1; white-space:nowrap;">⏳ Chưa đánh giá</span>';
                                let note = '';
                                let rs = 'border-left:4px solid #cbd5e1; background:#fff; border:1px solid #bae6fd; border-left-color:#cbd5e1;';
                                if (ev) {
                                    if (ev.passed) {
                                        badge = '<span style="font-size:10px; font-weight:900; color:#15803d; background:#dcfce7; padding:2px 8px; border-radius:99px; border:1px solid #86efac; white-space:nowrap;">✅ ĐÃ HỖ TRỢ</span>';
                                        rs = 'border-left:4px solid #22c55e; background:#fff; border:1px solid #dcfce7; border-left-color:#22c55e;';
                                    } else {
                                        badge = '<span style="font-size:10px; font-weight:900; color:#b91c1c; background:#fee2e2; padding:2px 8px; border-radius:99px; border:1px solid #fca5a5; white-space:nowrap;">❌ CHƯA HỖ TRỢ</span>';
                                        rs = 'border-left:4px solid #ef4444; background:#fff; border:1px solid #fee2e2; border-left-color:#ef4444;';
                                    }
                                    if (ev.note) {
                                        note = '<div style="margin-top:4px; padding:5px 8px; background:' + (ev.passed ? '#f0fdf4' : '#fef2f2') + '; border-radius:6px; border:1px solid ' + (ev.passed ? '#bbf7d0' : '#fecaca') + '; font-size:10.5px; font-weight:700; color:' + (ev.passed ? '#166534' : '#991b1b') + '; display:flex; align-items:flex-start; gap:4px;"><span>💬</span> <span><b>Ghi chú:</b> ' + _escapeHtml(ev.note) + '</span></div>';
                                    }
                                }
                                supportBoxHtml += '<div style="display:flex; flex-direction:column; gap:4px; padding:8px 10px; border-radius:8px; ' + rs + ' font-size:11.5px; line-height:1.4; box-shadow:0 1px 3px rgba(0,0,0,0.03);"><div style="display:flex; align-items:flex-start; justify-content:space-between; gap:8px;"><div style="font-weight:800; color:#0f172a; flex:1; word-break:break-word;"><span style="color:#0284c7; font-weight:900;">' + (idx + 1) + '.</span> ' + _escapeHtml(s2) + '</div><div style="flex-shrink:0;">' + badge + '</div></div>' + note + '</div>';
                            });
                            supportBoxHtml += '</div></div>';
                        }

                        // Compact Side-by-Side or Stacked layout for Commitments & Supports
                        if (commitments.length > 0 && supports.length > 0) {
                            html += '<div style="margin-top:10px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">' + commitBoxHtml + supportBoxHtml + '</div>';
                        } else if (commitments.length > 0) {
                            html += '<div style="margin-top:10px;">' + commitBoxHtml + '</div>';
                        } else if (supports.length > 0) {
                            html += '<div style="margin-top:10px;">' + supportBoxHtml + '</div>';
                        }

                        // Summary & Button Section
                        if (hasConfiguredKpi || commitments.length > 0) {
                            const kpiResultBox = hasConfiguredKpi 
                                ? '<div style="background:' + (achievedAll ? 'linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)' : 'linear-gradient(135deg,#fef2f2 0%,#fee2e2 100%)') + '; border:1.5px solid ' + (achievedAll ? '#86efac' : '#fca5a5') + '; border-radius:10px; padding:8px 12px; display:flex; flex-direction:column; justify-content:center; gap:3px; box-shadow:0 2px 6px rgba(0,0,0,0.04);"><div style="font-size:10.5px; font-weight:800; color:' + (achievedAll ? '#166534' : '#991b1b') + ';">' + (achievedAll ? '🏆 Kết Quả KPI' : '❌ Kết Quả KPI') + '</div><div style="font-size:13.5px; font-weight:900; color:' + (achievedAll ? '#15803d' : '#b91c1c') + ';">' + (achievedAll ? '🎉 ĐẠT KPI THÁNG' : '❌ KHÔNG ĐẠT KPI') + '</div></div>'
                                : '<div style="background:#f8fafc; border:1.5px dashed #cbd5e1; border-radius:10px; padding:8px 12px; display:flex; flex-direction:column; justify-content:center; gap:3px;"><div style="font-size:10.5px; font-weight:800; color:#64748b;">⏳ Kết Quả KPI</div><div style="font-size:13.5px; font-weight:900; color:#64748b;">⚙️ CHƯA CẤU HÌNH KPI</div></div>';

                            const progressBox = '<div style="background:linear-gradient(135deg,#f5f3ff 0%,#ede9fe 100%); border:1.5px solid #ddd6fe; border-radius:10px; padding:8px 12px; display:flex; flex-direction:column; justify-content:center; gap:3px; box-shadow:0 2px 6px rgba(124,58,237,0.05);"><div style="font-size:10.5px; font-weight:800; color:#6d28d9; display:flex; align-items:center; justify-content:space-between;"><span>📊 Tiến Độ Cam Kết</span><span style="font-size:10px; font-weight:900; color:#5b21b6; background:#ffffff; padding:1px 6px; border-radius:99px; border:1px solid #c4b5fd;">' + commitPassedCount + '/' + commitments.length + ' điều đạt</span></div><div style="font-size:15.5px; font-weight:900; color:#4c1d95; display:flex; align-items:baseline; gap:4px;">' + completionPct + '% <span style="font-size:10px; font-weight:700; color:#6d28d9;">hoàn thành</span></div></div>';

                            html += '<div style="margin-top:10px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">' + kpiResultBox + progressBox + '</div>';
                        }

                        if (hasConfiguredKpi || commitments.length > 0 || hasEvals) {
                            if (hasEvals) {
                                html += '<div style="margin-top:12px;"><div style="width:100%; padding:10px 12px; background:#059669; color:#ffffff; border-radius:8px; font-size:13px; font-weight:900; text-align:center; box-shadow:0 4px 12px rgba(5,150,105,0.25); cursor:default; user-select:none;">📋 ĐÃ ĐÁNH GIÁ</div></div>';
                            } else {
                                html += '<div style="margin-top:12px;"><button onclick="window._openKpiProdEvalModal(' + m + ')" style="width:100%; padding:10px 12px; background:linear-gradient(135deg,#4f46e5,#3730a3); color:#ffffff; border:none; border-radius:8px; font-size:13px; font-weight:900; text-align:center; box-shadow:0 4px 12px rgba(79,70,229,0.3); cursor:pointer;">📊 Đánh Giá Cam Kết ' + _escapeHtml(deptInfo.label) + '</button></div>';
                            }
                        }

                        return html;
                    })()}
                </div>
            `;
        }

        // ========== RENDER FULL CONTENT ==========
        contentEl.innerHTML = `
            <!-- Tổng Quan Card -->
            <div class="kpi-prod-card">
                <div class="kpi-prod-card-title" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span>📊 Tổng Quan Tiến Độ & Năng Suất Phân Kỳ (${_kpiProdState.year})</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:12px; font-weight:800; color:#475569;">${_kpiProdState.department === 'sewing' ? 'Team:' : 'Nhân Viên:'}</span>
                        ${staffTabsHtml}
                    </div>
                </div>
                <div class="kpi-prod-top-row">
                    <!-- Donut -->
                    <div class="kpi-prod-donut-frame">
                        <div style="font-size:13px;font-weight:900;color:#0f172a;margin-bottom:8px;">🏭 Tổng Kết Năm</div>
                        <div class="kpi-prod-donut-canvas-wrap">
                            <canvas id="kpiProdDonut" width="155" height="155"></canvas>
                        </div>
                        <div style="text-align:center;margin-top:6px;">
                            <div style="font-size:22px;font-weight:900;color:#0f172a;">${_kpiProdFmt(ys.total_products)}</div>
                            <div style="font-size:11px;color:#64748b;font-weight:700;">${deptInfo.productLabel}</div>
                        </div>
                        <div class="kpi-prod-donut-legend">
                            <div class="kpi-prod-legend-item"><span class="kpi-prod-dot" style="background:#10b981;"></span> Đạt ${ys.achieved_count}</div>
                            <div class="kpi-prod-legend-item"><span class="kpi-prod-dot" style="background:#ef4444;"></span> Chưa Đạt ${ys.not_achieved_count}</div>
                            <div class="kpi-prod-legend-item"><span class="kpi-prod-dot" style="background:#cbd5e1;"></span> Chưa CÓ ${ys.pending_count}</div>
                        </div>
                    </div>

                    <!-- Quarter Table -->
                    <div class="kpi-prod-table-responsive">
                        <table class="kpi-prod-quarter-table">
                            <thead>
                                <tr>
                                    <th rowspan="2" style="vertical-align:middle; min-width:130px; font-family:'Plus Jakarta Sans', sans-serif; font-size:12.5px; font-weight:900; color:#ffffff; text-shadow:0 1px 2px rgba(0,0,0,0.5);">Kỳ</th>
                                    <th colspan="3" style="text-align:center; border-bottom:1.5px solid #3b82f6; background:linear-gradient(180deg,#1e3a8a 0%,#1e40af 100%); color:#ffffff; font-family:'Plus Jakarta Sans', sans-serif; font-size:12.5px; font-weight:900; padding:8px; text-shadow:0 1px 2px rgba(0,0,0,0.6);">📦 ${deptInfo.productLabel.toUpperCase()} (SP)</th>
                                    <th colspan="3" style="text-align:center; border-bottom:1.5px solid #eab308; background:linear-gradient(180deg,#854d0e 0%,#713f12 100%); color:#fef08a; font-family:'Plus Jakarta Sans', sans-serif; font-size:12.5px; font-weight:900; padding:8px; text-shadow:0 1px 2px rgba(0,0,0,0.6);">🚨 SỐ LỖI (Đơn)</th>
                                    <th colspan="3" style="text-align:center; border-bottom:1.5px solid #818cf8; background:linear-gradient(180deg,#312e81 0%,#3730a3 100%); color:#e0e7ff; font-family:'Plus Jakarta Sans', sans-serif; font-size:12.5px; font-weight:900; padding:8px; text-shadow:0 1px 2px rgba(0,0,0,0.6);">📊 NĂNG SUẤT TB (SP/phút)</th>
                                    <th rowspan="2" style="vertical-align:middle; font-family:'Plus Jakarta Sans', sans-serif; font-size:12.5px; font-weight:900; color:#ffffff; text-shadow:0 1px 2px rgba(0,0,0,0.5);">Tổng Phút</th>
                                    <th rowspan="2" style="vertical-align:middle; font-family:'Plus Jakarta Sans', sans-serif; font-size:12.5px; font-weight:900; color:#86efac; text-shadow:0 1px 2px rgba(0,0,0,0.5);">🏆 Kết Quả Tổng</th>
                                    <th rowspan="2" style="vertical-align:middle; font-family:'Plus Jakarta Sans', sans-serif; font-size:12.5px; font-weight:900; color:#ffffff; text-shadow:0 1px 2px rgba(0,0,0,0.5);">⚙️ Cấu Hình</th>
                                </tr>
                                <tr>
                                    <th style="font-size:11px; font-family:'Plus Jakarta Sans', sans-serif; color:#ffffff; font-weight:800; background:#1e3a8a; padding:6px; letter-spacing:0.3px;">Thực Tế</th>
                                    <th style="font-size:11px; font-family:'Plus Jakarta Sans', sans-serif; color:#7dd3fc; font-weight:900; background:#1e3a8a; padding:6px; letter-spacing:0.3px; text-shadow:0 1px 2px rgba(0,0,0,0.4);">KPI Target</th>
                                    <th style="font-size:11px; font-family:'Plus Jakarta Sans', sans-serif; color:#86efac; font-weight:900; background:#1e3a8a; padding:6px; letter-spacing:0.3px; text-shadow:0 1px 2px rgba(0,0,0,0.4);">🏆 Kết Quả</th>

                                    <th style="font-size:11px; font-family:'Plus Jakarta Sans', sans-serif; color:#ffffff; font-weight:800; background:#854d0e; padding:6px; letter-spacing:0.3px;">Thực Tế</th>
                                    <th style="font-size:11px; font-family:'Plus Jakarta Sans', sans-serif; color:#fde047; font-weight:900; background:#854d0e; padding:6px; letter-spacing:0.3px; text-shadow:0 1px 2px rgba(0,0,0,0.4);">KPI Max</th>
                                    <th style="font-size:11px; font-family:'Plus Jakarta Sans', sans-serif; color:#86efac; font-weight:900; background:#854d0e; padding:6px; letter-spacing:0.3px; text-shadow:0 1px 2px rgba(0,0,0,0.4);">🏆 Kết Quả</th>

                                    <th style="font-size:11px; font-family:'Plus Jakarta Sans', sans-serif; color:#ffffff; font-weight:800; background:#312e81; padding:6px; letter-spacing:0.3px;">Thực Tế</th>
                                    <th style="font-size:11px; font-family:'Plus Jakarta Sans', sans-serif; color:#c7d2fe; font-weight:900; background:#312e81; padding:6px; letter-spacing:0.3px; text-shadow:0 1px 2px rgba(0,0,0,0.4);">KPI Target</th>
                                    <th style="font-size:11px; font-family:'Plus Jakarta Sans', sans-serif; color:#86efac; font-weight:900; background:#312e81; padding:6px; letter-spacing:0.3px; text-shadow:0 1px 2px rgba(0,0,0,0.4);">🏆 Kết Quả</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${quarterRowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Biểu Đồ 12 Tháng -->
            <div class="kpi-prod-card">
                <div class="kpi-prod-card-title">
                    <span id="kpiProdChart12Title">📈 Biểu Đồ Năng Suất, ${deptInfo.productLabel} & Số Lỗi 12 Tháng (${_kpiProdState.year})${selectedStaffId !== 'all' ? (' — ' + (staff.find(s => s.id === selectedStaffId)?.full_name || '')) : ''}</span>
                </div>
                <div class="kpi-prod-chart-frame">
                    <canvas id="kpiProdChart12" height="300" style="width:100%; display:block;"></canvas>
                </div>
            </div>

            <!-- Chi Tiết Dữ Liệu Tra Soát & Chỉ Số KPI 12 Tháng -->
            <div class="kpi-prod-card">
                <div class="kpi-prod-card-title">
                    <span>📋 Chi Tiết Dữ Liệu Tra Soát & Chỉ Số KPI 12 Tháng</span>
                </div>
                <div class="kpi-prod-monthly-grid">
                    ${monthlyCardsHtml}
                </div>
            </div>
        `;

        // Draw donut chart
        _kpiProdDrawDonut(ys);

        // Draw 12-month chart after layout reflow
        setTimeout(function() {
            _kpiProdDrawChart12(md, selectedStaffId, deptInfo);
        }, 50);

        // Attach resize handler
        if (_resizeHandler) window.removeEventListener('resize', _resizeHandler);
        _resizeHandler = function() {
            if (_kpiProdState.data && _kpiProdState.data.monthly_data) {
                _kpiProdDrawChart12(_kpiProdState.data.monthly_data, _kpiProdState.selectedStaffId, _kpiProdDeptInfo[_kpiProdState.department] || _kpiProdDeptInfo.cutting);
            }
        };
        window.addEventListener('resize', _resizeHandler);
    }

    // ========== DONUT CHART ==========
    function _kpiProdDrawDonut(ys) {
        const canvas = document.getElementById('kpiProdDonut');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        const cx = w / 2, cy = h / 2, r = 60, lineW = 18;

        ctx.clearRect(0, 0, w, h);

        const slices = [
            { val: ys.achieved_count || 0, color: '#10b981' },
            { val: ys.not_achieved_count || 0, color: '#ef4444' },
            { val: ys.pending_count || 0, color: '#e2e8f0' }
        ];

        const total = slices.reduce((s, sl) => s + sl.val, 0) || 1;
        let startAngle = -Math.PI / 2;

        slices.forEach(sl => {
            if (sl.val === 0) return;
            const sweepAngle = (sl.val / total) * 2 * Math.PI;
            ctx.beginPath();
            ctx.arc(cx, cy, r, startAngle, startAngle + sweepAngle);
            ctx.strokeStyle = sl.color;
            ctx.lineWidth = lineW;
            ctx.lineCap = 'round';
            ctx.stroke();
            startAngle += sweepAngle;
        });

        // If all zero, draw grey circle
        if (total <= 1 && slices.every(s => s.val === 0)) {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, 2 * Math.PI);
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = lineW;
            ctx.stroke();
        }
    }

    // ========== 12-MONTH BAR + LINE CHART ==========
    function _kpiProdDrawChart12(md, selectedStaffId, deptInfo) {
        deptInfo = deptInfo || _kpiProdDeptInfo.cutting;
        const canvas = document.getElementById('kpiProdChart12');
        if (!canvas) return;

        const parentW = canvas.parentElement ? canvas.parentElement.getBoundingClientRect().width - 24 : 1000;
        const displayW = Math.max(parentW, 400);
        const displayH = 300;

        canvas.width = displayW;
        canvas.height = displayH;

        const ctx = canvas.getContext('2d');
        const padL = 55, padR = 40, padT = 36, padB = 40;
        const chartW = displayW - padL - padR;
        const chartH = displayH - padT - padB;

        ctx.clearRect(0, 0, displayW, displayH);

        // Collect monthly data (filtered by staff if needed)
        const months = [];
        let maxProducts = 0;
        let maxErrors = 0;
        for (let m = 1; m <= 12; m++) {
            const mData = md[m] || { staff: [], totals: {} };
            let products = 0, errors = 0, rate = 0, achieved = 0, notAchieved = 0;

            if (!selectedStaffId || selectedStaffId === 'all') {
                const t = mData.totals || {};
                products = t.total_products || 0;
                errors = t.total_errors || 0;
                rate = t.avg_rate || 0;
                achieved = t.achieved_count || 0;
                notAchieved = t.not_achieved_count || 0;
            } else {
                const staffArr = mData.staff || [];
                const st = staffArr.find(s => parseInt(s.user_id) === parseInt(selectedStaffId));
                if (st) {
                    products = st.products_done || 0;
                    errors = st.error_count || 0;
                    rate = st.actual_rate || 0;
                    achieved = st.achieved === true ? 1 : 0;
                    notAchieved = st.achieved === false ? 1 : 0;
                }
            }

            months.push({ month: m, products, errors, rate, achieved, notAchieved });
            if (products > maxProducts) maxProducts = products;
            if (errors > maxErrors) maxErrors = errors;
        }
        if (maxProducts === 0) maxProducts = 10;
        const combinedMax = Math.max(maxProducts, maxErrors);
        const yMax = Math.ceil(combinedMax * 1.2 / 5) * 5 || 10;

        const barW = chartW / 12;
        const halfBarW = Math.min(barW * 0.32, 22);

        // Y-axis gridlines & labels
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const yVal = (yMax / 4) * i;
            const yPos = padT + chartH - (chartH * (yVal / yMax));
            ctx.beginPath();
            ctx.moveTo(padL, yPos);
            ctx.lineTo(padL + chartW, yPos);
            ctx.stroke();
            ctx.fillText(Math.round(yVal), padL - 8, yPos + 4);
        }

        // Draw paired bars
        months.forEach((m, i) => {
            const centerX = padL + barW * i + barW / 2;
            const rr = Math.min(4, halfBarW / 2);

            // Products bar (left)
            const pX = centerX - halfBarW - 1;
            const pBarH = yMax > 0 ? (m.products / yMax) * chartH : 0;
            const pY = padT + chartH - pBarH;
            const pGrad = ctx.createLinearGradient(pX, pY, pX, padT + chartH);
            if (m.achieved > 0) { pGrad.addColorStop(0, '#10b981'); pGrad.addColorStop(1, '#6ee7b7'); }
            else { pGrad.addColorStop(0, '#f59e0b'); pGrad.addColorStop(1, '#fcd34d'); }
            ctx.fillStyle = pGrad;
            if (pBarH > 0) {
                ctx.beginPath();
                ctx.moveTo(pX, padT + chartH);
                ctx.lineTo(pX, pY + rr);
                ctx.quadraticCurveTo(pX, pY, pX + rr, pY);
                ctx.lineTo(pX + halfBarW - rr, pY);
                ctx.quadraticCurveTo(pX + halfBarW, pY, pX + halfBarW, pY + rr);
                ctx.lineTo(pX + halfBarW, padT + chartH);
                ctx.closePath();
                ctx.fill();
            }
            if (m.products > 0) {
                ctx.fillStyle = '#0f172a';
                ctx.font = '800 9px "Plus Jakarta Sans", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(_kpiProdFmt(m.products), pX + halfBarW / 2, pY - 5);
            }

            // Errors bar (right, red)
            const eX = centerX + 1;
            const eBarH = yMax > 0 ? (m.errors / yMax) * chartH : 0;
            const eY = padT + chartH - eBarH;
            const eGrad = ctx.createLinearGradient(eX, eY, eX, padT + chartH);
            eGrad.addColorStop(0, '#ef4444');
            eGrad.addColorStop(1, '#fca5a5');
            ctx.fillStyle = eGrad;
            if (eBarH > 0) {
                ctx.beginPath();
                ctx.moveTo(eX, padT + chartH);
                ctx.lineTo(eX, eY + rr);
                ctx.quadraticCurveTo(eX, eY, eX + rr, eY);
                ctx.lineTo(eX + halfBarW - rr, eY);
                ctx.quadraticCurveTo(eX + halfBarW, eY, eX + halfBarW, eY + rr);
                ctx.lineTo(eX + halfBarW, padT + chartH);
                ctx.closePath();
                ctx.fill();
            }
            if (m.errors > 0) {
                ctx.fillStyle = '#dc2626';
                ctx.font = '800 9px "Plus Jakarta Sans", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(m.errors, eX + halfBarW / 2, eY - 5);
            }

            // X-axis label
            ctx.fillStyle = '#64748b';
            ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('T' + m.month, padL + barW * i + barW / 2, padT + chartH + 18);
        });

        // Rate line
        const rates = months.map(m => m.rate);
        const maxRate = Math.max(...rates, 0.001);
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        let lineStarted = false;
        months.forEach((m, i) => {
            if (m.rate <= 0) return;
            const x = padL + barW * i + barW / 2;
            const y = padT + chartH - (m.rate / maxRate) * chartH * 0.85;
            if (!lineStarted) { ctx.moveTo(x, y); lineStarted = true; }
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Rate dots + labels
        months.forEach((m, i) => {
            if (m.rate <= 0) return;
            const x = padL + barW * i + barW / 2;
            const y = padT + chartH - (m.rate / maxRate) * chartH * 0.85;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = '#6366f1';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#6366f1';
            ctx.font = '800 9px "Plus Jakarta Sans", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(_kpiProdFmtRate(m.rate), x, y - 10);
        });

        // Legend
        const legendY = 12;
        ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
        let legendX = padL;
        // Products
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(legendX, legendY - 6, 10, 8);
        ctx.fillStyle = '#475569';
        ctx.textAlign = 'left';
        ctx.fillText(deptInfo.productLabel, legendX + 14, legendY + 2);
        legendX += 100;
        // Errors
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(legendX, legendY - 6, 10, 8);
        ctx.fillStyle = '#475569';
        ctx.fillText('Số Lỗi', legendX + 14, legendY + 2);
        legendX += 60;
        // Rate line
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(legendX, legendY - 2);
        ctx.lineTo(legendX + 15, legendY - 2);
        ctx.stroke();
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.arc(legendX + 7, legendY - 2, 3, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#475569';
        ctx.fillText('Năng Suất (SP/phút)', legendX + 20, legendY + 2);
    }

    // ========== AUTO-SAVE on blur ==========
    window._kpiProdAutoSave = async function(inputEl) {
        if (!_canInputKpiProd()) {
            _kpiProdShowToast('⚠️ Bạn không có quyền điền hoặc chỉnh sửa Phút Làm và Số Lỗi!', '#ef4444');
            _kpiProdFetchAndRender(true);
            return;
        }

        const uid = parseInt(inputEl.dataset.uid);
        const month = parseInt(inputEl.dataset.month);
        const field = inputEl.dataset.field;
        const valStr = String(inputEl.value || '').replace(',', '.');
        const value = parseFloat(valStr) || 0;

        if (!uid || !month) return;

        // Find current values for this user+month from the data
        const mData = _kpiProdState.data?.monthly_data?.[month];
        const staffEntry = mData?.staff?.find(s => s.user_id === uid);
        if (!staffEntry) return;

        // Check if month is already evaluated
        const cfgData = mData?.config || {};
        const commitmentEvals = Array.isArray(cfgData.commitment_evals) ? cfgData.commitment_evals : [];
        const supportEvals = Array.isArray(cfgData.support_evals) ? cfgData.support_evals : [];
        const hasEvals = commitmentEvals.some(e => e) || supportEvals.some(e => e);

        if (hasEvals) {
            _kpiProdShowToast('⚠️ Tháng này đã hoàn tất đánh giá cam kết, không thể chỉnh sửa chỉ số nữa!', true);
            _kpiProdFetchAndRender(true);
            return;
        }

        const targets = [{
            user_id: uid,
            total_minutes: field === 'minutes' ? value : (staffEntry.total_minutes || 0),
            target_rate: field === 'target' ? value : (staffEntry.target_rate || 0),
            error_count: field === 'errors' ? value : (staffEntry.error_count || 0),
            target_products: field === 'target_products' ? value : (staffEntry.target_products || 0),
            target_errors: field === 'target_errors' ? value : (staffEntry.target_errors || 0),
            notes: staffEntry.notes || ''
        }];

        try {
            const resp = await fetch('/api/kpi-production/targets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
                },
                body: JSON.stringify({
                    year: _kpiProdState.year,
                    month: month,
                    department: _kpiProdState.department,
                    targets: targets
                })
            });

            if (resp.ok) {
                // Flash green
                inputEl.classList.add('saved-flash');
                setTimeout(() => inputEl.classList.remove('saved-flash'), 1500);

                // Update local data
                if (field === 'minutes') staffEntry.total_minutes = value;
                else if (field === 'target') staffEntry.target_rate = value;
                else if (field === 'errors') staffEntry.error_count = value;
                else if (field === 'target_products') staffEntry.target_products = value;
                else if (field === 'target_errors') staffEntry.target_errors = value;

                // Refresh UI totals (Month header, Quarter table & Year summary)
                await _kpiProdFetchAndRender();
            }
        } catch(e) {
            console.error('[KPI Prod] Auto-save error:', e);
        }
    };

    // ========== SAVE ALL ==========
    window._kpiProdSaveAll = async function() {
        const isDirectorUser = typeof currentUser !== 'undefined' && currentUser && (currentUser.role === 'giam_doc' || currentUser.role === 'admin' || currentUser.username === 'admin');
        const canEditConfig = isDirectorUser || (typeof canDo === 'function' && canDo('kpi_san_xuat', 'edit'));
        if (!_canInputKpiProd() && !canEditConfig) {
            _kpiProdShowToast('⚠️ Bạn không có quyền chỉnh sửa dữ liệu KPI!', '#ef4444');
            return;
        }
        const allInputs = document.querySelectorAll('.kpi-prod-input');
        const byMonth = {};

        allInputs.forEach(inp => {
            const uid = parseInt(inp.dataset.uid);
            const month = parseInt(inp.dataset.month);
            const field = inp.dataset.field;
            const valStr = String(inp.value || '').replace(',', '.');
            const value = parseFloat(valStr) || 0;

            if (!uid || !month) return;
            if (!byMonth[month]) byMonth[month] = {};
            if (!byMonth[month][uid]) byMonth[month][uid] = { user_id: uid, total_minutes: 0, target_rate: 0, error_count: 0, target_products: 0, target_errors: 0 };
            if (field === 'minutes') byMonth[month][uid].total_minutes = value;
            if (field === 'target') byMonth[month][uid].target_rate = value;
            if (field === 'errors') byMonth[month][uid].error_count = value;
            if (field === 'target_products') byMonth[month][uid].target_products = value;
            if (field === 'target_errors') byMonth[month][uid].target_errors = value;
        });

        let totalSaved = 0;
        for (const [month, users] of Object.entries(byMonth)) {
            const targets = Object.values(users).filter(t => t.total_minutes > 0 || t.target_rate > 0 || t.error_count > 0 || t.target_products > 0 || t.target_errors > 0);
            if (targets.length === 0) continue;

            try {
                const resp = await fetch('/api/kpi-production/targets', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
                    },
                    body: JSON.stringify({
                        year: _kpiProdState.year,
                        month: parseInt(month),
                        department: _kpiProdState.department,
                        targets: targets
                    })
                });
                if (resp.ok) {
                    const result = await resp.json();
                    totalSaved += result.saved || 0;
                }
            } catch(e) {
                console.error('[KPI Prod] Save error for month', month, e);
            }
        }

        // Show success notification
        if (totalSaved > 0) {
            _kpiProdShowToast(`✅ Đã lưu ${totalSaved} mục KPI thành công!`, '#10b981');
        } else {
            _kpiProdShowToast('⚠️ Không có dữ liệu để lưu', '#f59e0b');
        }

        // Refresh data
        await _kpiProdFetchAndRender();
    };

    // ========== CHANGE YEAR ==========
    window._kpiProdChangeYear = function(year) {
        _kpiProdState.year = parseInt(year, 10);
        _kpiProdFetchAndRender(false);
    };

    // ========== SWITCH DEPARTMENT ==========
    window._kpiProdSwitchDept = function(dept) {
        if (_kpiProdState.allowedDepts && !_kpiProdState.allowedDepts.includes(dept)) return;
        _kpiProdState.department = dept;
        _kpiProdState.selectedStaffId = 'all';
        _kpiProdState.expandedQuarters = {};
        // Update tab active
        document.querySelectorAll('.kpi-dept-btn').forEach(b => b.classList.remove('active'));
        if (typeof event !== 'undefined' && event && event.target) {
            const btn = event.target.closest ? event.target.closest('.kpi-dept-btn') : event.target;
            if (btn && btn.classList) btn.classList.add('active');
        }
        _kpiProdFetchAndRender(false);
    };

    // ========== TOAST ==========
    function _kpiProdShowToast(msg, color) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 99999;
            background: ${color || '#10b981'}; color: #fff;
            padding: 14px 24px; border-radius: 12px;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 14px; font-weight: 800;
            box-shadow: 0 8px 30px rgba(0,0,0,0.2);
            animation: _kpiProdToastIn 0.3s ease;
        `;
        toast.innerHTML = msg;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ========== FORMAT NUMBER ==========
    function _kpiProdFmt(n) {
        if (n == null || isNaN(n)) return '0';
        return Number(n).toLocaleString('vi-VN');
    }

    function _kpiProdFmtRate(n) {
        if (n == null || isNaN(n) || Number(n) <= 0) return '0,00';
        const num = Number(n);
        // Truncate to 2 decimal places (e.g., 239/121 = 1.9752... -> 1,97)
        return (Math.floor(num * 100) / 100).toFixed(2).replace('.', ',');
    }

    function _escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function _escapeJs(str) {
        if (!str) return '';
        return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
    }

    function _getModalYearSum() {
        let modalYearSum = 0;
        // Check dept-level total input first
        const deptTotalInp = document.getElementById('kpiProdYearTotalProducts');
        if (deptTotalInp && deptTotalInp.value) {
            const deptVal = parseInt(String(deptTotalInp.value).replace(/\D/g, ''), 10);
            if (deptVal > 0) modalYearSum += deptVal;
        }
        // Also check per-staff/team rows
        const rows = document.querySelectorAll('#kpiProdModalStaffTargetsList tr');
        rows.forEach(r => {
            const inp = r.querySelector('.kpi-prod-staff-m-target-products');
            if (inp && inp.value) {
                const val = parseInt(inp.value.replace(/\D/g, ''), 10);
                if (val > 0) modalYearSum += val;
            }
        });
        return modalYearSum;
    }

    function _isYearConfiguredInDb() {
        const data = _kpiProdState.data;
        if (!data) return false;
        const yearCfg = data.dept_configs?.[0];
        if (yearCfg && yearCfg.target_products > 0) return true;
        const yearTargets = (data.target_rows || []).filter(t => parseInt(t.month, 10) === 0 && parseInt(t.target_products, 10) > 0);
        return yearTargets.length > 0;
    }

    function _isYearConfigured() {
        return _getModalYearSum() > 0 || _isYearConfiguredInDb();
    }

    let _kpiProdWizardStep = 1;
    window._kpiProdSetWizardStep = function(step) {
        if (step > 1) {
            const modalSum = _getModalYearSum();
            const dbHasConfig = _isYearConfiguredInDb();
            if (modalSum === 0 && !dbHasConfig) {
                alert('🔒 Bộ phận này chưa được nhập chỉ tiêu KPI Cả Năm! Vui lòng nhập chỉ tiêu KPI Cả Năm cho ít nhất 1 nhân viên ở Bước 1 trước khi tiến hành phân bổ Quý & Tháng.');
                step = 1;
            }
        }
        _kpiProdWizardStep = step;

        const t1 = document.getElementById('kpiProdWizardTab1');
        const t2 = document.getElementById('kpiProdWizardTab2');
        const t3 = document.getElementById('kpiProdWizardTab3');

        const s1 = document.getElementById('kpiProdWizardStep1');
        const s2 = document.getElementById('kpiProdWizardStep2');
        const s3 = document.getElementById('kpiProdWizardStep3');

        const prevBtn = document.getElementById('kpiProdWizardPrevBtn');
        const nextBtn = document.getElementById('kpiProdWizardNextBtn');
        const editBtn = document.getElementById('kpiProdWizardEditBtn');
        const saveBtn = document.getElementById('kpiProdWizardSaveBtn');

        if (t1) { t1.style.background = step === 1 ? '#38bdf8' : '#334155'; t1.style.color = step === 1 ? '#0f172a' : '#94a3b8'; }
        if (t2) { t2.style.background = step === 2 ? '#38bdf8' : '#334155'; t2.style.color = step === 2 ? '#0f172a' : '#94a3b8'; }
        if (t3) { t3.style.background = step === 3 ? '#38bdf8' : '#334155'; t3.style.color = step === 3 ? '#0f172a' : '#94a3b8'; }

        if (s1) s1.style.display = step === 1 ? 'flex' : 'none';
        if (s2) s2.style.display = step === 2 ? 'flex' : 'none';
        if (s3) s3.style.display = step === 3 ? 'flex' : 'none';

        if (prevBtn) prevBtn.style.display = step > 1 ? 'inline-block' : 'none';
        if (nextBtn) {
            nextBtn.style.display = step < 3 ? 'inline-block' : 'none';
            if (nextBtn) nextBtn.innerText = step === 1 ? 'Tiếp Theo: Phân Bổ Quý ➔' : 'Tiếp Theo: Phân Bổ 12 Tháng ➔';
        }

        const isLocked = _kpiProdState.isLocked;
        if (isLocked) {
            if (editBtn) editBtn.style.display = 'inline-block';
            if (saveBtn) saveBtn.style.display = 'none';
        } else {
            if (editBtn) editBtn.style.display = 'none';
            if (saveBtn) {
                saveBtn.style.display = step === 3 ? 'inline-block' : 'none';
                if (step === 3) saveBtn.innerText = '💾 Lưu Cấu Hình Top-Down';
            }
        }

        if (step === 2) window._kpiProdApplyQAllocMethod();
        if (step === 3) window._kpiProdApplyMAllocMethod();
    };

    window._kpiProdApplyModalLockState = function(isLocked) {
        _kpiProdState.isLocked = isLocked;

        // Hide smart hint if open
        const hint = document.getElementById('kpiProdSmartHintTooltip');
        if (hint) hint.style.display = 'none';

        // Helper to format lock styling on inputs
        const formatInputLock = function(inp) {
            if (!inp || inp.type === 'button' || inp.type === 'submit') return;
            inp.readOnly = isLocked;
            inp.disabled = isLocked;
            inp.style.pointerEvents = isLocked ? 'none' : 'auto';
            inp.style.background = isLocked ? '#f1f5f9' : '#ffffff';
            inp.style.cursor = isLocked ? 'not-allowed' : 'text';
            inp.tabIndex = isLocked ? -1 : 0;
        };

        // 1. Step 1 inputs (Cả Năm)
        const s1Step = document.getElementById('kpiProdWizardStep1');
        if (s1Step) s1Step.querySelectorAll('input, select, textarea').forEach(formatInputLock);

        // 2. Step 2 inputs (4 Quý) - Target entire container
        const s2Step = document.getElementById('kpiProdWizardStep2');
        if (s2Step) s2Step.querySelectorAll('input, select, textarea').forEach(formatInputLock);

        // 3. Step 3 inputs (12 Tháng) - Target entire container
        const s3Step = document.getElementById('kpiProdWizardStep3');
        if (s3Step) s3Step.querySelectorAll('input, select, textarea').forEach(formatInputLock);

        // 4. Update Footer Buttons
        const editBtn = document.getElementById('kpiProdWizardEditBtn');
        const saveBtn = document.getElementById('kpiProdWizardSaveBtn');

        if (isLocked) {
            if (editBtn) editBtn.style.display = 'inline-block';
            if (saveBtn) saveBtn.style.display = 'none';
        } else {
            if (editBtn) editBtn.style.display = 'none';
            if (saveBtn) {
                saveBtn.style.display = _kpiProdWizardStep === 3 ? 'inline-block' : 'none';
                if (_kpiProdWizardStep === 3) saveBtn.innerText = '💾 Lưu Cấu Hình Top-Down';
            }
        }
    };

    window._kpiProdUnlockModalForEdit = function() {
        window._kpiProdApplyModalLockState(false);
        if (_kpiProdWizardStep === 2) window._kpiProdApplyQAllocMethod();
        if (_kpiProdWizardStep === 3) window._kpiProdApplyMAllocMethod();
        _kpiProdShowToast('🔓 Đã mở khóa cấu hình! Bạn có thể chỉnh sửa các thông số và bấm 💾 Lưu Cấu Hình Top-Down.', '#d97706');
    };

    window._kpiProdWizardNextStep = function() {
        // Block Step 2 → Step 3 if quarter total ≠ year total
        if (_kpiProdWizardStep === 2) {
            const q1P = parseInt(String(document.getElementById('kpiProdQ1Products')?.value || '').replace(/\D/g, '') || '0', 10);
            const q2P = parseInt(String(document.getElementById('kpiProdQ2Products')?.value || '').replace(/\D/g, '') || '0', 10);
            const q3P = parseInt(String(document.getElementById('kpiProdQ3Products')?.value || '').replace(/\D/g, '') || '0', 10);
            const q4P = parseInt(String(document.getElementById('kpiProdQ4Products')?.value || '').replace(/\D/g, '') || '0', 10);
            const totalQP = q1P + q2P + q3P + q4P;
            const { yearTargetTotal } = _getKpiProdYearTotals();

            if (yearTargetTotal > 0 && totalQP !== yearTargetTotal) {
                const diff = totalQP - yearTargetTotal;
                const diffTxt = diff > 0 ? `vượt ${_kpiProdFmt(diff)} SP` : `thiếu ${_kpiProdFmt(Math.abs(diff))} SP`;
                alert(`⚠️ Tổng KPI 4 Quý (${_kpiProdFmt(totalQP)} SP) CHƯA BẰNG KPI Cả Năm (${_kpiProdFmt(yearTargetTotal)} SP) — ${diffTxt}!\n\nVui lòng chỉnh sửa lại sao cho Tổng 4 Quý = Năm trước khi sang Bước 3.`);
                return;
            }
        }
        if (_kpiProdWizardStep < 3) window._kpiProdSetWizardStep(_kpiProdWizardStep + 1);
    };

    window._kpiProdWizardPrevStep = function() {
        if (_kpiProdWizardStep > 1) window._kpiProdSetWizardStep(_kpiProdWizardStep - 1);
    };

    // Read year TOTAL values from 3 simple inputs (new model)
    function _getKpiProdYearTotals() {
        const pStr = String(document.getElementById('kpiProdYearTotalProducts')?.value || '').replace(/\D/g, '');
        const yearTargetTotal = parseInt(pStr || '0', 10);
        const yearTotalErrors = parseInt(document.getElementById('kpiProdYearTotalErrors')?.value || '0', 10);
        const rStr = String(document.getElementById('kpiProdYearTotalRate')?.value || '0').replace(',', '.');
        const avgDeptRate = parseFloat(rStr) || 0;
        return { yearTargetTotal, yearTotalErrors, avgDeptRate };
    }

    window._kpiProdApplyQAllocMethod = function() {
        if (_kpiProdState.isLocked) {
            try { window._kpiProdUpdateQTotals(); } catch(e){}
            return;
        }
        const rad = document.querySelector('input[name="kpiProdQAllocMethod"]:checked');
        const val = rad ? rad.value : 'equal';

        const { yearTargetTotal, yearTotalErrors, avgDeptRate } = _getKpiProdYearTotals();

        // Show/hide reference year dropdown
        const refYearBox = document.getElementById('kpiProdQRefYearBox');
        const refYearSel = document.getElementById('kpiProdQRefYear');
        if (refYearBox) {
            refYearBox.style.display = val === 'growth' ? 'block' : 'none';
        }
        // Populate year dropdown if empty
        if (refYearSel && refYearSel.options.length === 0) {
            const configYear = _kpiProdState.year || new Date().getFullYear();
            const bData = _kpiProdState.benchmarkData || {};
            let hYears = bData.history_years || [];
            if (!Array.isArray(hYears) || hYears.length === 0) {
                hYears = [configYear - 1];
            }
            // Strictly filter out any year >= configYear and year < 2025
            let validYears = hYears.map(y => parseInt(y, 10)).filter(y => y < configYear && y >= 2025);
            if (validYears.length === 0) {
                validYears = [configYear - 1];
            }
            validYears.sort((a, b) => b - a);
            refYearSel.innerHTML = '';
            validYears.forEach(y => {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = `Năm ${y}`;
                refYearSel.appendChild(opt);
            });
        }

        // Divide year total errors across 4 quarters
        const qErrorBase = Math.floor(yearTotalErrors / 4);
        const qErrorRem = yearTotalErrors % 4;
        const q1E = qErrorBase + (qErrorRem >= 1 ? 1 : 0);
        const q2E = qErrorBase + (qErrorRem >= 2 ? 1 : 0);
        const q3E = qErrorBase + (qErrorRem >= 3 ? 1 : 0);
        const q4E = qErrorBase;

        const q1Inp = document.getElementById('kpiProdQ1Products');
        const q2Inp = document.getElementById('kpiProdQ2Products');
        const q3Inp = document.getElementById('kpiProdQ3Products');
        const q4Inp = document.getElementById('kpiProdQ4Products');

        const q1EInp = document.getElementById('kpiProdQ1Errors');
        const q2EInp = document.getElementById('kpiProdQ2Errors');
        const q3EInp = document.getElementById('kpiProdQ3Errors');
        const q4EInp = document.getElementById('kpiProdQ4Errors');

        const q1RInp = document.getElementById('kpiProdQ1Rate');
        const q2RInp = document.getElementById('kpiProdQ2Rate');
        const q3RInp = document.getElementById('kpiProdQ3Rate');
        const q4RInp = document.getElementById('kpiProdQ4Rate');

        const allInputs = [q1Inp, q2Inp, q3Inp, q4Inp, q1EInp, q2EInp, q3EInp, q4EInp, q1RInp, q2RInp, q3RInp, q4RInp];
        const isCustom = val === 'custom';

        // Lock/unlock inputs
        allInputs.forEach(inp => {
            if (!inp) return;
            inp.readOnly = !isCustom;
            inp.style.opacity = isCustom ? '1' : '0.7';
            inp.style.background = isCustom ? '#fff' : '#f1f5f9';
            inp.style.cursor = isCustom ? 'text' : 'not-allowed';
        });

        const q1Label = document.getElementById('kpiProdQ1Label');
        const q2Label = document.getElementById('kpiProdQ2Label');
        const q3Label = document.getElementById('kpiProdQ3Label');
        const q4Label = document.getElementById('kpiProdQ4Label');

        if (val === 'equal') {
            if (q1EInp) q1EInp.value = yearTotalErrors > 0 ? q1E : '';
            if (q2EInp) q2EInp.value = yearTotalErrors > 0 ? q2E : '';
            if (q3EInp) q3EInp.value = yearTotalErrors > 0 ? q3E : '';
            if (q4EInp) q4EInp.value = yearTotalErrors > 0 ? q4E : '';

            const rateFmt = avgDeptRate > 0 ? _kpiProdFmtRate(avgDeptRate) : '';
            [q1RInp, q2RInp, q3RInp, q4RInp].forEach(inp => { if (inp) inp.value = rateFmt; });

            const qBase = Math.floor(yearTargetTotal / 4);
            const qRem = yearTargetTotal % 4;
            if (q1Inp) q1Inp.value = qBase;
            if (q2Inp) q2Inp.value = qBase;
            if (q3Inp) q3Inp.value = qBase;
            if (q4Inp) q4Inp.value = qBase + qRem;

            if (q1Label) q1Label.innerHTML = 'Quý 1 <span style="font-size:11px; font-weight:700; color:#64748b; margin-left:4px;">(25.0%)</span>';
            if (q2Label) q2Label.innerHTML = 'Quý 2 <span style="font-size:11px; font-weight:700; color:#64748b; margin-left:4px;">(25.0%)</span>';
            if (q3Label) q3Label.innerHTML = 'Quý 3 <span style="font-size:11px; font-weight:700; color:#64748b; margin-left:4px;">(25.0%)</span>';
            if (q4Label) q4Label.innerHTML = 'Quý 4 <span style="font-size:11px; font-weight:700; color:#64748b; margin-left:4px;">(25.0%)</span>';
        } else if (val === 'growth') {
            if (q1EInp) q1EInp.value = yearTotalErrors > 0 ? q1E : '';
            if (q2EInp) q2EInp.value = yearTotalErrors > 0 ? q2E : '';
            if (q3EInp) q3EInp.value = yearTotalErrors > 0 ? q3E : '';
            if (q4EInp) q4EInp.value = yearTotalErrors > 0 ? q4E : '';

            const rateFmt = avgDeptRate > 0 ? _kpiProdFmtRate(avgDeptRate) : '';
            [q1RInp, q2RInp, q3RInp, q4RInp].forEach(inp => { if (inp) inp.value = rateFmt; });

            const bData = _kpiProdState.benchmarkData || {};
            const selYear = refYearSel ? parseInt(refYearSel.value, 10) : 0;
            const yInfo = (selYear && bData.years_data) ? bData.years_data[selYear] : null;
            const qRatios = (yInfo && yInfo.q_ratios) || bData.q_ratios || { 1: 0.25, 2: 0.25, 3: 0.25, 4: 0.25 };

            const q1Val = Math.floor(yearTargetTotal * (qRatios[1] || 0.25));
            const q2Val = Math.floor(yearTargetTotal * (qRatios[2] || 0.25));
            const q3Val = Math.floor(yearTargetTotal * (qRatios[3] || 0.25));
            const q4Val = Math.max(0, yearTargetTotal - (q1Val + q2Val + q3Val));

            if (q1Inp) q1Inp.value = q1Val;
            if (q2Inp) q2Inp.value = q2Val;
            if (q3Inp) q3Inp.value = q3Val;
            if (q4Inp) q4Inp.value = q4Val;

            const r1Pct = ((qRatios[1] || 0.25) * 100).toFixed(1) + '%';
            const r2Pct = ((qRatios[2] || 0.25) * 100).toFixed(1) + '%';
            const r3Pct = ((qRatios[3] || 0.25) * 100).toFixed(1) + '%';
            const r4Pct = ((qRatios[4] || 0.25) * 100).toFixed(1) + '%';

            if (q1Label) q1Label.innerHTML = `Quý 1 <span style="font-size:11px; font-weight:700; color:#0284c7; margin-left:4px;">(${r1Pct})</span>`;
            if (q2Label) q2Label.innerHTML = `Quý 2 <span style="font-size:11px; font-weight:700; color:#0284c7; margin-left:4px;">(${r2Pct})</span>`;
            if (q3Label) q3Label.innerHTML = `Quý 3 <span style="font-size:11px; font-weight:700; color:#0284c7; margin-left:4px;">(${r3Pct})</span>`;
            if (q4Label) q4Label.innerHTML = `Quý 4 <span style="font-size:11px; font-weight:700; color:#0284c7; margin-left:4px;">(${r4Pct})</span>`;
        } else {
            if (q1Label) q1Label.innerHTML = 'Quý 1';
            if (q2Label) q2Label.innerHTML = 'Quý 2';
            if (q3Label) q3Label.innerHTML = 'Quý 3';
            if (q4Label) q4Label.innerHTML = 'Quý 4';
        }
        // custom: do not fill, just unlock inputs for manual editing

        // Always update TỔNG row after allocation
        window._kpiProdUpdateQTotals();
    };

    // ========== SMART HINT: Gợi ý "Nhập X để khớp" ==========
    // Creates or gets the floating hint tooltip element
    function _getSmartHintEl() {
        let el = document.getElementById('kpiProdSmartHintTooltip');
        if (!el) {
            el = document.createElement('div');
            el.id = 'kpiProdSmartHintTooltip';
            el.style.cssText = 'position:absolute; z-index:99999; background:linear-gradient(135deg,#1e40af,#1d4ed8); color:#fff; padding:6px 12px; border-radius:8px; font-size:11.5px; font-weight:800; box-shadow:0 4px 16px rgba(0,0,0,0.25); display:none; white-space:nowrap; pointer-events:auto; cursor:pointer; transition:opacity 0.15s;';
            document.body.appendChild(el);
        }
        return el;
    }

    // Show smart hint on focus of a Quarter input
    window._kpiProdShowSmartHint = function(inputEl, type) {
        if (_kpiProdState.isLocked) { window._kpiProdHideSmartHint(); return; }
        const hint = _getSmartHintEl();
        const { yearTargetTotal, yearTotalErrors, avgDeptRate } = _getKpiProdYearTotals();

        let yearTarget = 0;
        let otherSum = 0;
        let inputIds = [];

        if (type === 'products') {
            yearTarget = yearTargetTotal;
            inputIds = ['kpiProdQ1Products', 'kpiProdQ2Products', 'kpiProdQ3Products', 'kpiProdQ4Products'];
        } else if (type === 'errors') {
            yearTarget = yearTotalErrors;
            inputIds = ['kpiProdQ1Errors', 'kpiProdQ2Errors', 'kpiProdQ3Errors', 'kpiProdQ4Errors'];
        } else if (type === 'rate') {
            // Rate: calculate value needed so that average of 4 quarters = year target
            if (avgDeptRate > 0) {
                const rateIds = ['kpiProdQ1Rate', 'kpiProdQ2Rate', 'kpiProdQ3Rate', 'kpiProdQ4Rate'];
                let otherRateSum = 0;
                let otherCount = 0;
                rateIds.forEach(id => {
                    const el = document.getElementById(id);
                    if (el && el !== inputEl) {
                        const rv = parseFloat(String(el.value || '0').replace(',', '.')) || 0;
                        otherRateSum += rv;
                        otherCount++;
                    }
                });
                // Need: (otherRateSum + X) / 4 = avgDeptRate => X = avgDeptRate * 4 - otherRateSum
                const suggested = Math.round((avgDeptRate * 4 - otherRateSum) * 100) / 100;
                const rect = inputEl.getBoundingClientRect();
                if (suggested <= 0) {
                    hint.innerHTML = `⚠️ Các quý khác quá thấp — cần tăng quý khác để TB đạt ${_kpiProdFmtRate(avgDeptRate)}`;
                    hint.style.background = 'linear-gradient(135deg,#b91c1c,#dc2626)';
                } else {
                    hint.innerHTML = `💡 Nhập <b>${_kpiProdFmtRate(suggested)}</b> để TB 4 Quý = ${_kpiProdFmtRate(avgDeptRate)} — <span style="text-decoration:underline;">Bấm để điền</span>`;
                    hint.style.background = 'linear-gradient(135deg,#1e40af,#1d4ed8)';
                }
                hint.style.display = 'block';
                hint.style.left = (rect.left + window.scrollX) + 'px';
                hint.style.top = (rect.bottom + window.scrollY + 4) + 'px';
                hint.onclick = suggested > 0 ? function() {
                    inputEl.value = _kpiProdFmtRate(suggested);
                    inputEl.dispatchEvent(new Event('input'));
                    hint.style.display = 'none';
                } : null;
            }
            return;
        }

        if (yearTarget <= 0) { hint.style.display = 'none'; return; }

        // Sum of OTHER inputs (not the focused one)
        inputIds.forEach(id => {
            const el = document.getElementById(id);
            if (el && el !== inputEl) {
                const val = parseInt(String(el.value || '').replace(/\D/g, '') || '0', 10);
                otherSum += val;
            }
        });

        const suggested = yearTarget - otherSum;
        if (suggested < 0) {
            const rect = inputEl.getBoundingClientRect();
            hint.innerHTML = `⚠️ Các quý khác đã vượt ${_kpiProdFmt(Math.abs(suggested))} — cần giảm quý khác`;
            hint.style.background = 'linear-gradient(135deg,#b91c1c,#dc2626)';
            hint.style.display = 'block';
            hint.style.left = (rect.left + window.scrollX) + 'px';
            hint.style.top = (rect.bottom + window.scrollY + 4) + 'px';
            hint.onclick = null;
        } else {
            const rect = inputEl.getBoundingClientRect();
            hint.innerHTML = `💡 Nhập <b>${_kpiProdFmt(suggested)}</b> để khớp Năm — <span style="text-decoration:underline;">Bấm để điền</span>`;
            hint.style.background = 'linear-gradient(135deg,#1e40af,#1d4ed8)';
            hint.style.display = 'block';
            hint.style.left = (rect.left + window.scrollX) + 'px';
            hint.style.top = (rect.bottom + window.scrollY + 4) + 'px';
            hint.onclick = function() {
                inputEl.value = suggested;
                inputEl.dispatchEvent(new Event('input'));
                hint.style.display = 'none';
            };
        }
    };

    // Show smart hint for 12-Month table inputs (Scoped strictly to its own Quarter)
    window._kpiProdShowSmartHintMonth = function(inputEl, type) {
        if (_kpiProdState.isLocked) { window._kpiProdHideSmartHint(); return; }
        const hint = _getSmartHintEl();
        const tr = inputEl.closest('tr[data-month]');
        if (!tr) return;

        const mNum = parseInt(tr.getAttribute('data-month'), 10);
        if (!mNum) return;

        const qNum = Math.ceil(mNum / 3);
        const qStart = (qNum - 1) * 3 + 1;
        const qEnd = qNum * 3;

        if (type === 'products') {
            const qTargetEl = document.getElementById(`kpiProdQ${qNum}Products`);
            const qTarget = parseInt(String(qTargetEl?.value || '').replace(/\D/g, '') || '0', 10);
            if (qTarget <= 0) { hint.style.display = 'none'; return; }

            let otherSum = 0;
            for (let m = qStart; m <= qEnd; m++) {
                if (m === mNum) continue;
                const row = document.querySelector(`#kpiProdModal12MonthsTableList tr[data-month="${m}"]`);
                if (row) {
                    const inp = row.querySelector('.kpi-prod-m-target-products');
                    otherSum += parseInt(String(inp?.value || '').replace(/\D/g, '') || '0', 10);
                }
            }

            const suggested = qTarget - otherSum;
            const rect = inputEl.getBoundingClientRect();
            if (suggested < 0) {
                hint.innerHTML = `⚠️ Các tháng khác trong Quý ${qNum} đã vượt ${_kpiProdFmt(Math.abs(suggested))} SP — cần giảm tháng khác`;
                hint.style.background = 'linear-gradient(135deg,#b91c1c,#dc2626)';
                hint.style.display = 'block';
                hint.style.left = (rect.left + window.scrollX) + 'px';
                hint.style.top = (rect.bottom + window.scrollY + 4) + 'px';
                hint.onclick = null;
            } else {
                hint.innerHTML = `💡 Nhập <b>${_kpiProdFmt(suggested)}</b> để cân đủ Target Quý ${qNum} (${_kpiProdFmt(qTarget)} SP) — <span style="text-decoration:underline;">Bấm để điền</span>`;
                hint.style.background = 'linear-gradient(135deg,#1e40af,#1d4ed8)';
                hint.style.display = 'block';
                hint.style.left = (rect.left + window.scrollX) + 'px';
                hint.style.top = (rect.bottom + window.scrollY + 4) + 'px';
                hint.onclick = function() {
                    inputEl.value = suggested;
                    inputEl.dispatchEvent(new Event('input'));
                    hint.style.display = 'none';
                };
            }
        } else if (type === 'errors') {
            const qTargetEl = document.getElementById(`kpiProdQ${qNum}Errors`);
            const qTarget = parseInt(qTargetEl?.value || '0', 10);
            if (qTarget <= 0) { hint.style.display = 'none'; return; }

            let otherSum = 0;
            for (let m = qStart; m <= qEnd; m++) {
                if (m === mNum) continue;
                const row = document.querySelector(`#kpiProdModal12MonthsTableList tr[data-month="${m}"]`);
                if (row) {
                    const inp = row.querySelector('.kpi-prod-m-target-errors');
                    otherSum += parseInt(inp?.value || '0', 10);
                }
            }

            const suggested = qTarget - otherSum;
            const rect = inputEl.getBoundingClientRect();
            if (suggested < 0) {
                hint.innerHTML = `⚠️ Các tháng khác trong Quý ${qNum} đã vượt ${Math.abs(suggested)} Lỗi — cần giảm tháng khác`;
                hint.style.background = 'linear-gradient(135deg,#b91c1c,#dc2626)';
                hint.style.display = 'block';
                hint.style.left = (rect.left + window.scrollX) + 'px';
                hint.style.top = (rect.bottom + window.scrollY + 4) + 'px';
                hint.onclick = null;
            } else {
                hint.innerHTML = `💡 Nhập <b>${suggested}</b> để cân đủ Target Quý ${qNum} (${qTarget} Lỗi) — <span style="text-decoration:underline;">Bấm để điền</span>`;
                hint.style.background = 'linear-gradient(135deg,#1e40af,#1d4ed8)';
                hint.style.display = 'block';
                hint.style.left = (rect.left + window.scrollX) + 'px';
                hint.style.top = (rect.bottom + window.scrollY + 4) + 'px';
                hint.onclick = function() {
                    inputEl.value = suggested;
                    inputEl.dispatchEvent(new Event('input'));
                    hint.style.display = 'none';
                };
            }
        } else if (type === 'rate') {
            const qTargetEl = document.getElementById(`kpiProdQ${qNum}Rate`);
            const qRate = parseFloat(String(qTargetEl?.value || '0').replace(',', '.')) || 0;
            if (qRate <= 0) { hint.style.display = 'none'; return; }

            let otherRateSum = 0;
            for (let m = qStart; m <= qEnd; m++) {
                if (m === mNum) continue;
                const row = document.querySelector(`#kpiProdModal12MonthsTableList tr[data-month="${m}"]`);
                if (row) {
                    const inp = row.querySelector('.kpi-prod-m-target-rate');
                    otherRateSum += parseFloat(String(inp?.value || '0').replace(',', '.')) || 0;
                }
            }

            const suggested = Math.round((qRate * 3 - otherRateSum) * 100) / 100;
            const rect = inputEl.getBoundingClientRect();
            if (suggested <= 0) {
                hint.innerHTML = `⚠️ Các tháng khác trong Quý ${qNum} quá thấp — cần tăng để TB đạt ${_kpiProdFmtRate(qRate)}`;
                hint.style.background = 'linear-gradient(135deg,#b91c1c,#dc2626)';
            } else {
                hint.innerHTML = `💡 Nhập <b>${_kpiProdFmtRate(suggested)}</b> để TB Quý ${qNum} = ${_kpiProdFmtRate(qRate)} — <span style="text-decoration:underline;">Bấm để điền</span>`;
                hint.style.background = 'linear-gradient(135deg,#1e40af,#1d4ed8)';
            }
            hint.style.display = 'block';
            hint.style.left = (rect.left + window.scrollX) + 'px';
            hint.style.top = (rect.bottom + window.scrollY + 4) + 'px';
            hint.onclick = suggested > 0 ? function() {
                inputEl.value = _kpiProdFmtRate(suggested);
                inputEl.dispatchEvent(new Event('input'));
                hint.style.display = 'none';
            } : null;
        }
    };

    window._kpiProdHideSmartHint = function() {
        const hint = document.getElementById('kpiProdSmartHintTooltip');
        if (hint) hint.style.display = 'none';
    };

    function _getKpiProdCumulativeShortfall(month) {
        if (!month || month <= 1) return { totalShortfall: 0, lastShortMonth: 0, shortfallMonthLabel: 'THÁNG TRƯỚC', shortMonthsList: [] };

        const deptConfigs = _kpiProdState.data?.dept_configs || {};
        const monthlyData = _kpiProdState.data?.monthly_data || {};

        let accumShortfall = 0;
        const shortMonthsList = [];

        for (let m = 1; m < month; m++) {
            const cfg = deptConfigs[m];
            if (!cfg || !cfg.target_products || cfg.target_products <= 0) continue;

            const baseTarget = parseInt(cfg.target_products, 10);
            const mData = monthlyData[m];
            const actual = mData?.totals?.total_products || 0;

            if (actual < baseTarget) {
                const s = baseTarget - actual;
                accumShortfall += s;
                shortMonthsList.push(m);
            } else if (actual > baseTarget && accumShortfall > 0) {
                const comp = actual - baseTarget;
                accumShortfall = Math.max(0, accumShortfall - comp);
            }
        }

        const lastShortMonth = shortMonthsList.length > 0 ? shortMonthsList[shortMonthsList.length - 1] : 0;
        let label = 'CÁC THÁNG TRƯỚC';
        if (shortMonthsList.length === 1) {
            label = `THÁNG ${shortMonthsList[0]}`;
        } else if (shortMonthsList.length > 1) {
            label = `T${shortMonthsList.join('+T')}`;
        }

        return { totalShortfall: accumShortfall, lastShortMonth, shortfallMonthLabel: label, shortMonthsList };
    }

    // Show smart hint for Team Allocation table in Month Modal (Ảnh 3)
    window._kpiProdShowSmartHintTeam = function(inputEl, type) {
        if (_kpiProdState.isLocked) { window._kpiProdHideSmartHint(); return; }
        const hint = _getSmartHintEl();
        const tr = inputEl.closest('tr[data-uid]');
        if (!tr) return;

        const month = parseInt(document.getElementById('kpiProdConfigMonth')?.value || '0', 10);
        if (!month) return;

        const deptConfigs = _kpiProdState.data?.dept_configs || {};
        const monthCfg = deptConfigs[month] || {};
        const monthTargetP = monthCfg.target_products || 0;
        const monthTargetE = monthCfg.target_errors || 0;
        const monthTargetR = monthCfg.target_rate || 0;

        const allRows = document.querySelectorAll('#kpiProdModalStaffTargetsList tr[data-uid]');
        const rect = inputEl.getBoundingClientRect();

        if (type === 'products') {
            if (monthTargetP <= 0) { hint.style.display = 'none'; return; }
            let otherSum = 0;
            allRows.forEach(r => {
                if (r === tr) return;
                const inp = r.querySelector('.kpi-prod-staff-m-target-products');
                otherSum += parseInt(String(inp?.value || '').replace(/\D/g, '') || '0', 10);
            });
            const suggestedBase = monthTargetP - otherSum;

            // Check cumulative shortfall from past months
            const { totalShortfall: prevShortfall, lastShortMonth } = _getKpiProdCumulativeShortfall(month);
            const shortTxt = lastShortMonth > 0 ? `Tháng ${lastShortMonth}` : `các tháng trước`;

            const suggestedComp = suggestedBase + prevShortfall;

            if (suggestedBase < 0) {
                hint.innerHTML = `⚠️ Các team khác đã vượt ${_kpiProdFmt(Math.abs(suggestedBase))} SP — cần giảm team khác`;
                hint.style.background = 'linear-gradient(135deg,#b91c1c,#dc2626)';
                hint.style.display = 'block';
                hint.style.left = (rect.left + window.scrollX) + 'px';
                hint.style.top = (rect.bottom + window.scrollY + 4) + 'px';
                hint.onclick = null;
            } else if (prevShortfall > 0) {
                hint.innerHTML = `
                    <div style="font-size:11px; line-height:1.4;">
                        <div>💡 <b>Chọn Target cho Team (Thiếu ${_kpiProdFmt(prevShortfall)} SP ${shortTxt}):</b></div>
                        <div style="margin-top:6px; display:flex; gap:6px; flex-wrap:wrap;">
                            <span id="kpiProdHintBtnBase" style="background:#1d4ed8; color:#ffffff; padding:4px 8px; border-radius:4px; font-weight:800; cursor:pointer; font-size:11px;">🎯 Target Gốc: ${_kpiProdFmt(suggestedBase)} SP</span>
                            <span id="kpiProdHintBtnComp" style="background:#d97706; color:#ffffff; padding:4px 8px; border-radius:4px; font-weight:800; cursor:pointer; font-size:11px;">🔄 Có Bù: ${_kpiProdFmt(suggestedComp)} SP</span>
                        </div>
                    </div>
                `;
                hint.style.background = 'linear-gradient(135deg,#0f172a,#1e293b)';
                hint.style.display = 'block';
                hint.style.left = (rect.left + window.scrollX) + 'px';
                hint.style.top = (rect.bottom + window.scrollY + 4) + 'px';
                hint.onclick = null;

                setTimeout(() => {
                    const btnBase = document.getElementById('kpiProdHintBtnBase');
                    const btnComp = document.getElementById('kpiProdHintBtnComp');
                    if (btnBase) {
                        btnBase.onclick = function(e) {
                            e.stopPropagation();
                            inputEl.value = suggestedBase;
                            inputEl.dispatchEvent(new Event('input'));
                            hint.style.display = 'none';
                        };
                    }
                    if (btnComp) {
                        btnComp.onclick = function(e) {
                            e.stopPropagation();
                            inputEl.value = suggestedComp;
                            inputEl.dispatchEvent(new Event('input'));
                            hint.style.display = 'none';
                        };
                    }
                }, 50);
            } else {
                hint.innerHTML = `💡 Nhập <b>${_kpiProdFmt(suggestedBase)}</b> để cân đủ Target Tháng (${_kpiProdFmt(monthTargetP)} SP) — <span style="text-decoration:underline;">Bấm để điền</span>`;
                hint.style.background = 'linear-gradient(135deg,#1e40af,#1d4ed8)';
                hint.style.display = 'block';
                hint.style.left = (rect.left + window.scrollX) + 'px';
                hint.style.top = (rect.bottom + window.scrollY + 4) + 'px';
                hint.onclick = function() {
                    inputEl.value = suggestedBase;
                    inputEl.dispatchEvent(new Event('input'));
                    hint.style.display = 'none';
                };
            }
        } else if (type === 'errors') {
            if (monthTargetE <= 0) { hint.style.display = 'none'; return; }
            let otherSum = 0;
            allRows.forEach(r => {
                if (r === tr) return;
                const inp = r.querySelector('.kpi-prod-staff-m-target-errors');
                otherSum += parseInt(String(inp?.value || '').replace(/\D/g, '') || '0', 10);
            });
            const suggested = monthTargetE - otherSum;
            if (suggested < 0) {
                hint.innerHTML = `⚠️ Các team khác đã vượt ${_kpiProdFmt(Math.abs(suggested))} Lỗi — cần giảm team khác`;
                hint.style.background = 'linear-gradient(135deg,#b91c1c,#dc2626)';
                hint.style.display = 'block';
                hint.style.left = (rect.left + window.scrollX) + 'px';
                hint.style.top = (rect.bottom + window.scrollY + 4) + 'px';
                hint.onclick = null;
            } else {
                hint.innerHTML = `💡 Nhập <b>${_kpiProdFmt(suggested)}</b> để cân đủ Target Tháng (${_kpiProdFmt(monthTargetE)} Lỗi) — <span style="text-decoration:underline;">Bấm để điền</span>`;
                hint.style.background = 'linear-gradient(135deg,#1e40af,#1d4ed8)';
                hint.style.display = 'block';
                hint.style.left = (rect.left + window.scrollX) + 'px';
                hint.style.top = (rect.bottom + window.scrollY + 4) + 'px';
                hint.onclick = function() {
                    inputEl.value = suggested;
                    inputEl.dispatchEvent(new Event('input'));
                    hint.style.display = 'none';
                };
            }
        } else if (type === 'rate') {
            if (monthTargetR <= 0) { hint.style.display = 'none'; return; }
            const rateFmt = _kpiProdFmtRate(monthTargetR);
            hint.innerHTML = `💡 Nhập <b>${rateFmt}</b> để bằng Năng suất Target Tháng (${rateFmt} SP/phút) — <span style="text-decoration:underline;">Bấm để điền</span>`;
            hint.style.background = 'linear-gradient(135deg,#1e40af,#1d4ed8)';
            hint.style.display = 'block';
            hint.style.left = (rect.left + window.scrollX) + 'px';
            hint.style.top = (rect.bottom + window.scrollY + 4) + 'px';
            hint.onclick = function() {
                inputEl.value = rateFmt;
                inputEl.dispatchEvent(new Event('input'));
                hint.style.display = 'none';
            };
        }
    };

    // Real-time update TỔNG row in quarter table + validation against year total
    window._kpiProdUpdateQTotals = function() {
        const q1P = parseInt(String(document.getElementById('kpiProdQ1Products')?.value || '').replace(/\D/g, '') || '0', 10);
        const q2P = parseInt(String(document.getElementById('kpiProdQ2Products')?.value || '').replace(/\D/g, '') || '0', 10);
        const q3P = parseInt(String(document.getElementById('kpiProdQ3Products')?.value || '').replace(/\D/g, '') || '0', 10);
        const q4P = parseInt(String(document.getElementById('kpiProdQ4Products')?.value || '').replace(/\D/g, '') || '0', 10);
        const totalP = q1P + q2P + q3P + q4P;

        const q1E = parseInt(document.getElementById('kpiProdQ1Errors')?.value || '0', 10);
        const q2E = parseInt(document.getElementById('kpiProdQ2Errors')?.value || '0', 10);
        const q3E = parseInt(document.getElementById('kpiProdQ3Errors')?.value || '0', 10);
        const q4E = parseInt(document.getElementById('kpiProdQ4Errors')?.value || '0', 10);
        const totalE = q1E + q2E + q3E + q4E;

        // Compute average rate from 4 quarters
        const rates = [
            parseFloat(String(document.getElementById('kpiProdQ1Rate')?.value || '0').replace(',', '.')) || 0,
            parseFloat(String(document.getElementById('kpiProdQ2Rate')?.value || '0').replace(',', '.')) || 0,
            parseFloat(String(document.getElementById('kpiProdQ3Rate')?.value || '0').replace(',', '.')) || 0,
            parseFloat(String(document.getElementById('kpiProdQ4Rate')?.value || '0').replace(',', '.')) || 0
        ];
        const nonZeroRates = rates.filter(r => r > 0);
        const avgRate = nonZeroRates.length > 0 ? (nonZeroRates.reduce((a, b) => a + b, 0) / nonZeroRates.length) : 0;

        // Row 1: TỔNG
        const totalPEl = document.getElementById('kpiProdQTotalProducts');
        const totalEEl = document.getElementById('kpiProdQTotalErrors');
        const totalREl = document.getElementById('kpiProdQTotalRate');
        if (totalPEl) totalPEl.innerText = _kpiProdFmt(totalP);
        if (totalEEl) totalEEl.innerText = _kpiProdFmt(totalE);
        if (totalREl) totalREl.innerText = avgRate > 0 ? _kpiProdFmtRate(avgRate) : '—';

        // Row 2: NĂM reference
        const { yearTargetTotal, yearTotalErrors, avgDeptRate } = _getKpiProdYearTotals();
        const yearRefPEl = document.getElementById('kpiProdQYearRefProducts');
        const yearRefEEl = document.getElementById('kpiProdQYearRefErrors');
        const yearRefREl = document.getElementById('kpiProdQYearRefRate');
        if (yearRefPEl) yearRefPEl.innerText = _kpiProdFmt(yearTargetTotal);
        if (yearRefEEl) yearRefEEl.innerText = _kpiProdFmt(yearTotalErrors);
        if (yearRefREl) yearRefREl.innerText = avgDeptRate > 0 ? _kpiProdFmtRate(avgDeptRate) : '—';

        // Row 3: CHÊNH LỆCH
        const diffPEl = document.getElementById('kpiProdQDiffProducts');
        const diffEEl = document.getElementById('kpiProdQDiffErrors');
        const diffREl = document.getElementById('kpiProdQDiffRate');
        const diffRow = document.getElementById('kpiProdQDiffRow');

        if (diffPEl && yearTargetTotal > 0) {
            const diffP = totalP - yearTargetTotal;
            if (diffP === 0) {
                diffPEl.innerHTML = '✅ Chính xác';
                diffPEl.style.color = '#16a34a';
            } else if (diffP > 0) {
                diffPEl.innerHTML = `❌ Thừa +${_kpiProdFmt(diffP)}`;
                diffPEl.style.color = '#dc2626';
            } else {
                diffPEl.innerHTML = `❌ Thiếu ${_kpiProdFmt(diffP)}`;
                diffPEl.style.color = '#dc2626';
            }
        } else if (diffPEl) {
            diffPEl.innerHTML = '—'; diffPEl.style.color = '#94a3b8';
        }

        if (diffEEl && yearTotalErrors > 0) {
            const diffE = totalE - yearTotalErrors;
            if (diffE === 0) {
                diffEEl.innerHTML = '✅ Chính xác';
                diffEEl.style.color = '#16a34a';
            } else if (diffE > 0) {
                diffEEl.innerHTML = `⚠️ Thừa +${_kpiProdFmt(diffE)}`;
                diffEEl.style.color = '#f59e0b';
            } else {
                diffEEl.innerHTML = `⚠️ Thiếu ${_kpiProdFmt(diffE)}`;
                diffEEl.style.color = '#f59e0b';
            }
        } else if (diffEEl) {
            diffEEl.innerHTML = '—'; diffEEl.style.color = '#94a3b8';
        }

        if (diffREl && avgDeptRate > 0) {
            if (avgRate >= avgDeptRate) {
                diffREl.innerHTML = '✅ Đạt';
                diffREl.style.color = '#16a34a';
            } else {
                diffREl.innerHTML = `⚠️ Thấp hơn`;
                diffREl.style.color = '#f59e0b';
            }
        } else if (diffREl) {
            diffREl.innerHTML = '—'; diffREl.style.color = '#94a3b8';
        }

        // Update diff row background
        if (diffRow) {
            const isAllGood = (yearTargetTotal <= 0 || totalP === yearTargetTotal) && (yearTotalErrors <= 0 || totalE === yearTotalErrors);
            diffRow.style.background = isAllGood ? '#dcfce7' : '#fef9c3';
        }
    };

    window._kpiProdApplyMAllocMethod = function() {
        const tbody = document.getElementById('kpiProdModal12MonthsTableList');
        if (!tbody) return;

        if (_kpiProdState.isLocked) {
            try { window._kpiProdUpdateMTotals(); } catch(e){}
            return;
        }

        const rad = document.querySelector('input[name="kpiProdMAllocMethod"]:checked');
        const method = rad ? rad.value : 'equal';

        // Show/hide reference year dropdown for 12-month allocation
        const refYearBox = document.getElementById('kpiProdMRefYearBox');
        const refYearSel = document.getElementById('kpiProdMRefYear');
        if (refYearBox) {
            refYearBox.style.display = method === 'growth' ? 'block' : 'none';
        }
        if (refYearSel && refYearSel.options.length === 0) {
            const configYear = _kpiProdState.year || new Date().getFullYear();
            const bData = _kpiProdState.benchmarkData || {};
            let hYears = bData.history_years || [];
            if (!Array.isArray(hYears) || hYears.length === 0) {
                hYears = [configYear - 1];
            }
            let validYears = hYears.map(y => parseInt(y, 10)).filter(y => y < configYear && y >= 2025);
            if (validYears.length === 0) validYears = [configYear - 1];
            validYears.sort((a, b) => b - a);
            refYearSel.innerHTML = '';
            validYears.forEach(y => {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = `Năm ${y}`;
                refYearSel.appendChild(opt);
            });
        }

        // If custom option is selected and rows already exist, unlock inputs and return without overwriting values
        if (method === 'custom' && tbody.querySelectorAll('tr[data-month]').length > 0) {
            tbody.querySelectorAll('input').forEach(inp => {
                inp.readOnly = false;
                inp.style.opacity = '1';
                inp.style.background = '#fff';
                inp.style.cursor = 'text';
            });
            window._kpiProdUpdateMTotals();
            return;
        }

        const qProducts = {
            1: parseInt(String(document.getElementById('kpiProdQ1Products')?.value || '').replace(/\D/g, '') || '0', 10),
            2: parseInt(String(document.getElementById('kpiProdQ2Products')?.value || '').replace(/\D/g, '') || '0', 10),
            3: parseInt(String(document.getElementById('kpiProdQ3Products')?.value || '').replace(/\D/g, '') || '0', 10),
            4: parseInt(String(document.getElementById('kpiProdQ4Products')?.value || '').replace(/\D/g, '') || '0', 10)
        };

        // Read per-quarter errors from Step 2 inputs
        const qErrors = {
            1: parseInt(document.getElementById('kpiProdQ1Errors')?.value || '0', 10),
            2: parseInt(document.getElementById('kpiProdQ2Errors')?.value || '0', 10),
            3: parseInt(document.getElementById('kpiProdQ3Errors')?.value || '0', 10),
            4: parseInt(document.getElementById('kpiProdQ4Errors')?.value || '0', 10)
        };

        // Read per-quarter rates from Step 2 inputs
        const qRates = {
            1: parseFloat(String(document.getElementById('kpiProdQ1Rate')?.value || '0').replace(',', '.')) || 0,
            2: parseFloat(String(document.getElementById('kpiProdQ2Rate')?.value || '0').replace(',', '.')) || 0,
            3: parseFloat(String(document.getElementById('kpiProdQ3Rate')?.value || '0').replace(',', '.')) || 0,
            4: parseFloat(String(document.getElementById('kpiProdQ4Rate')?.value || '0').replace(',', '.')) || 0
        };

        const { yearTotalErrors, avgDeptRate } = _getKpiProdYearTotals();

        const bData = _kpiProdState.benchmarkData || {};
        const selYear = refYearSel ? parseInt(refYearSel.value, 10) : 0;
        const yInfo = (selYear && bData.years_data) ? bData.years_data[selYear] : null;
        const prevMonths = (yInfo && yInfo.months) || bData.prev_months || {};

        // Pre-calculate products per month for each quarter to ensure 0 remainder
        const mProducts = {};
        const mRatios = {};
        for (let qNum = 1; qNum <= 4; qNum++) {
            const qTarget = qProducts[qNum] || 0;
            const qMStart = (qNum - 1) * 3 + 1;
            let m1 = 0, m2 = 0, m3 = 0;
            let r1 = 1/3, r2 = 1/3, r3 = 1/3;

            if (method === 'growth') {
                const qMSum = (prevMonths[qMStart] || 0) + (prevMonths[qMStart + 1] || 0) + (prevMonths[qMStart + 2] || 0);
                if (qMSum > 0) {
                    r1 = (prevMonths[qMStart] || 0) / qMSum;
                    r2 = (prevMonths[qMStart + 1] || 0) / qMSum;
                    r3 = (prevMonths[qMStart + 2] || 0) / qMSum;
                    m1 = Math.floor(qTarget * r1);
                    m2 = Math.floor(qTarget * r2);
                    m3 = Math.max(0, qTarget - (m1 + m2));
                } else {
                    const mBase = Math.floor(qTarget / 3);
                    const mRem = qTarget % 3;
                    m1 = mBase; m2 = mBase; m3 = mBase + mRem;
                }
            } else {
                const mBase = Math.floor(qTarget / 3);
                const mRem = qTarget % 3;
                m1 = mBase; m2 = mBase; m3 = mBase + mRem;
            }

            mProducts[qMStart] = m1; mRatios[qMStart] = r1;
            mProducts[qMStart + 1] = m2; mRatios[qMStart + 1] = r2;
            mProducts[qMStart + 2] = m3; mRatios[qMStart + 2] = r3;
        }

        let rowsHtml = '';
        for (let m = 1; m <= 12; m++) {
            const qNum = Math.ceil(m / 3);
            const qTarget = qProducts[qNum] || 0;
            const mProd = mProducts[m] || 0;
            const ratioPct = (mRatios[m] ? (mRatios[m] * 100).toFixed(1) : '33.3') + '%';

            // Use per-quarter errors: distribute quarter errors evenly across 3 months
            const qErr = qErrors[qNum] || 0;
            const qMPos = m - ((qNum - 1) * 3); // position within quarter: 1, 2, or 3
            const mErrBase = Math.floor(qErr / 3);
            const mErrRem = qErr % 3;
            const mErr = mErrBase + (qMPos <= mErrRem ? 1 : 0);

            // Use per-quarter rate instead of year-average rate
            const qRate = qRates[qNum] || 0;
            const rateFmt = qRate > 0 ? _kpiProdFmtRate(qRate) : (avgDeptRate > 0 ? _kpiProdFmtRate(avgDeptRate) : '');

            const isQHeader = (m === 1 || m === 4 || m === 7 || m === 10);

            if (isQHeader) {
                rowsHtml += `
                    <tr style="background:#f1f5f9; font-weight:900; color:#1e293b;">
                        <td colspan="4" id="kpiProdQHeader_${qNum}" style="padding:6px 10px; background:#e2e8f0; font-size:12px;">
                            📌 QUÝ ${qNum} (Target Quý: ${_kpiProdFmt(qTarget)} SP)
                        </td>
                    </tr>
                `;
            }

            const monthLabel = method === 'growth'
                ? `Tháng ${m} <span style="font-size:11px; font-weight:700; color:#0284c7; margin-left:4px;">(${ratioPct})</span>`
                : `Tháng ${m}`;

            rowsHtml += `
                <tr data-month="${m}">
                    <td style="padding:8px 10px; font-weight:800; color:#0f172a;">${monthLabel}</td>
                    <td style="text-align:center; padding:4px 6px;">
                        <input type="number" class="kpi-prod-m-target-products" value="${mProd}" min="0" oninput="window._kpiProdUpdateMTotals()" onfocus="window._kpiProdShowSmartHintMonth(this,'products')" onblur="setTimeout(window._kpiProdHideSmartHint,200)" style="width:100px; padding:4px 8px; border:1px solid #bae6fd; border-radius:6px; font-size:12px; font-weight:800; color:#0284c7; text-align:center;">
                    </td>
                    <td style="text-align:center; padding:4px 6px;">
                        <input type="number" class="kpi-prod-m-target-errors" value="${qErr > 0 ? mErr : ''}" min="0" oninput="window._kpiProdUpdateMTotals()" onfocus="window._kpiProdShowSmartHintMonth(this,'errors')" onblur="setTimeout(window._kpiProdHideSmartHint,200)" style="width:70px; padding:4px 8px; border:1px solid #fca5a5; border-radius:6px; font-size:12px; font-weight:800; color:#b91c1c; text-align:center;">
                    </td>
                    <td style="text-align:center; padding:4px 6px;">
                        <input type="text" inputmode="decimal" class="kpi-prod-m-target-rate" value="${rateFmt}" oninput="window._kpiProdUpdateMTotals()" onfocus="window._kpiProdShowSmartHintMonth(this,'rate')" onblur="setTimeout(window._kpiProdHideSmartHint,200)" style="width:70px; padding:4px 8px; border:1px solid #c7d2fe; border-radius:6px; font-size:12px; font-weight:800; color:#4f46e5; text-align:center;">
                    </td>
                </tr>
            `;
        }

        tbody.innerHTML = rowsHtml;

        // Lock/unlock 12-month inputs based on method
        const isCustomM = method === 'custom';
        tbody.querySelectorAll('input').forEach(inp => {
            inp.readOnly = !isCustomM;
            inp.style.opacity = isCustomM ? '1' : '0.7';
            inp.style.background = isCustomM ? '#fff' : '#f1f5f9';
            inp.style.cursor = isCustomM ? 'text' : 'not-allowed';
        });

        // Update 12-month totals after rendering
        window._kpiProdUpdateMTotals();
    };

    // Real-time update 12-month total + validation against year total
    window._kpiProdUpdateMTotals = function() {
        const mRows = document.querySelectorAll('#kpiProdModal12MonthsTableList tr[data-month]');
        let totalP = 0, totalE = 0;
        const rateVals = [];
        mRows.forEach(r => {
            totalP += parseInt(String(r.querySelector('.kpi-prod-m-target-products')?.value || '').replace(/\D/g, '') || '0', 10);
            totalE += parseInt(r.querySelector('.kpi-prod-m-target-errors')?.value || '0', 10);
            const rv = parseFloat(String(r.querySelector('.kpi-prod-m-target-rate')?.value || '0').replace(',', '.')) || 0;
            if (rv > 0) rateVals.push(rv);
        });
        const avgRateRaw = rateVals.length > 0 ? (rateVals.reduce((a, b) => a + b, 0) / rateVals.length) : 0;
        const avgRate = Math.round(avgRateRaw * 100) / 100; // Round to 2 decimal places to avoid floating-point display issues

        // Update Real-time Quarter Header Feedback for each of the 4 Quarters
        for (let q = 1; q <= 4; q++) {
            const headerTd = document.getElementById(`kpiProdQHeader_${q}`);
            const qTargetEl = document.getElementById(`kpiProdQ${q}Products`);
            const qTargetP = parseInt(String(qTargetEl?.value || '').replace(/\D/g, '') || '0', 10);

            const qStart = (q - 1) * 3 + 1;
            const qEnd = q * 3;
            let qSumP = 0;
            for (let m = qStart; m <= qEnd; m++) {
                const row = document.querySelector(`#kpiProdModal12MonthsTableList tr[data-month="${m}"]`);
                if (row) {
                    const inp = row.querySelector('.kpi-prod-m-target-products');
                    qSumP += parseInt(String(inp?.value || '').replace(/\D/g, '') || '0', 10);
                }
            }

            if (headerTd && qTargetP > 0) {
                const diffP = qSumP - qTargetP;
                let badgeHtml = '';
                if (diffP === 0) {
                    badgeHtml = `<span style="background:#dcfce7; color:#15803d; padding:2px 8px; border-radius:10px; font-weight:800; margin-left:8px; font-size:11.5px;">✅ Cân đủ</span>`;
                } else if (diffP > 0) {
                    badgeHtml = `<span style="background:#fee2e2; color:#b91c1c; padding:2px 8px; border-radius:10px; font-weight:800; margin-left:8px; font-size:11.5px;">❌ Vượt +${_kpiProdFmt(diffP)} SP</span>`;
                } else {
                    badgeHtml = `<span style="background:#fef3c7; color:#b45309; padding:2px 8px; border-radius:10px; font-weight:800; margin-left:8px; font-size:11.5px;">❌ Thiếu ${_kpiProdFmt(diffP)} SP</span>`;
                }
                headerTd.innerHTML = `📌 <b>QUÝ ${q}</b> (Target Quý: ${_kpiProdFmt(qTargetP)} SP &nbsp;|&nbsp; Đã nhập: ${_kpiProdFmt(qSumP)} SP ${badgeHtml})`;
            }
        }

        // Row 1: TỔNG
        const totalPEl = document.getElementById('kpiProdMTotalProducts');
        const totalEEl = document.getElementById('kpiProdMTotalErrors');
        const totalREl = document.getElementById('kpiProdMTotalRate');
        if (totalPEl) totalPEl.innerText = _kpiProdFmt(totalP);
        if (totalEEl) totalEEl.innerText = _kpiProdFmt(totalE);
        if (totalREl) totalREl.innerText = avgRate > 0 ? _kpiProdFmtRate(avgRate) : '—';

        // Row 2: NĂM reference
        const { yearTargetTotal, yearTotalErrors, avgDeptRate } = _getKpiProdYearTotals();
        const yearRefPEl = document.getElementById('kpiProdMYearRefProducts');
        const yearRefEEl = document.getElementById('kpiProdMYearRefErrors');
        const yearRefREl = document.getElementById('kpiProdMYearRefRate');
        if (yearRefPEl) yearRefPEl.innerText = _kpiProdFmt(yearTargetTotal);
        if (yearRefEEl) yearRefEEl.innerText = _kpiProdFmt(yearTotalErrors);
        if (yearRefREl) yearRefREl.innerText = avgDeptRate > 0 ? _kpiProdFmtRate(avgDeptRate) : '—';

        // Row 3: CHÊNH LỆCH
        const diffPEl = document.getElementById('kpiProdMDiffProducts');
        const diffEEl = document.getElementById('kpiProdMDiffErrors');
        const diffREl = document.getElementById('kpiProdMDiffRate');
        const diffRow = document.getElementById('kpiProdMDiffRow');

        if (diffPEl && yearTargetTotal > 0) {
            const diffP = totalP - yearTargetTotal;
            if (diffP === 0) {
                diffPEl.innerHTML = '✅ Chính xác';
                diffPEl.style.color = '#16a34a';
            } else if (diffP > 0) {
                diffPEl.innerHTML = `❌ Thừa +${_kpiProdFmt(diffP)}`;
                diffPEl.style.color = '#dc2626';
            } else {
                diffPEl.innerHTML = `❌ Thiếu ${_kpiProdFmt(diffP)}`;
                diffPEl.style.color = '#dc2626';
            }
        } else if (diffPEl) {
            diffPEl.innerHTML = '—'; diffPEl.style.color = '#94a3b8';
        }

        if (diffEEl && yearTotalErrors > 0) {
            const diffE = totalE - yearTotalErrors;
            if (diffE === 0) {
                diffEEl.innerHTML = '✅ Chính xác';
                diffEEl.style.color = '#16a34a';
            } else if (diffE > 0) {
                diffEEl.innerHTML = `⚠️ Thừa +${_kpiProdFmt(diffE)}`;
                diffEEl.style.color = '#f59e0b';
            } else {
                diffEEl.innerHTML = `⚠️ Thiếu ${_kpiProdFmt(diffE)}`;
                diffEEl.style.color = '#f59e0b';
            }
        } else if (diffEEl) {
            diffEEl.innerHTML = '—'; diffEEl.style.color = '#94a3b8';
        }

        if (diffREl && avgDeptRate > 0) {
            if (Math.abs(avgRate - avgDeptRate) < 0.02 || avgRate >= avgDeptRate) {
                diffREl.innerHTML = '✅ Đạt';
                diffREl.style.color = '#16a34a';
            } else {
                diffREl.innerHTML = `⚠️ Thấp hơn`;
                diffREl.style.color = '#f59e0b';
            }
        } else if (diffREl) {
            diffREl.innerHTML = '—'; diffREl.style.color = '#94a3b8';
        }

        // Update diff row background
        if (diffRow) {
            const isAllGood = (yearTargetTotal <= 0 || totalP === yearTargetTotal) && (yearTotalErrors <= 0 || totalE === yearTotalErrors);
            diffRow.style.background = isAllGood ? '#dcfce7' : '#fef9c3';
        }
    };

    // ========== CONFIG MODAL HANDLERS ==========
    window._openKpiProdConfigModal = async function(month = 0) {
        const overlay = document.getElementById('kpiProdConfigModalOverlay');
        if (!overlay) return;

        const isDirector = _isKpiProdDirectorUser();
        if ((month === 0 || (month >= 101 && month <= 104)) && !isDirector) {
            alert('🔒 Chỉ Giám Đốc mới có quyền Cấu Hình KPI Cả Năm và Cấu Hình KPI Quý!');
            return;
        }

        const canEditConfig = isDirector || (typeof canDo === 'function' && canDo('kpi_san_xuat', 'edit'));

        if (!canEditConfig) {
            alert('⚠️ Bạn không có quyền chỉnh sửa cấu hình Target & Cam Kết!');
            return;
        }

        const hasYearConfig = _isYearConfigured();
        if (month > 0 && !hasYearConfig) {
            alert('🔒 Bộ phận này chưa được cài đặt Cấu Hình KPI Cả Năm! Vui lòng cài đặt KPI Cả Năm trước khi phân bổ Quý và Tháng.');
            return;
        }

        // Fetch Benchmark stats for 3 preceding years (Y-1, Y-2, Y-3)
        try {
            const bResp = await fetch(`/api/kpi-production/benchmark?year=${_kpiProdState.year}&department=${_kpiProdState.department}`, {
                headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') }
            });
            if (bResp.ok) {
                const bData = await bResp.json();
                _kpiProdState.benchmarkData = bData;
                const refYearSel = document.getElementById('kpiProdQRefYear');
                if (refYearSel) refYearSel.innerHTML = '';
                const refMYearSel = document.getElementById('kpiProdMRefYear');
                if (refMYearSel) refMYearSel.innerHTML = '';
                const bBox = document.getElementById('kpiProdBenchmarkContent');
                const qBox = document.getElementById('kpiProdQBenchmarkContent');
                const bPrevYear = document.getElementById('kpiProdBenchmarkPrevYear');

                let hYears = (bData.history_years || [bData.prev_year]).map(y => parseInt(y, 10)).filter(y => y >= 2025);
                if (bPrevYear) bPrevYear.innerText = hYears.length > 0 ? hYears.join(', ') : '2025';

                // Step 1: Render 3-Year Annual Benchmark Box
                if (bBox) {
                    let bHtml = '';
                    hYears.forEach(y => {
                        const yInfo = bData.years_data?.[y] || {};
                        bHtml += `
                            <div style="margin-bottom:4px; padding-bottom:4px; border-bottom:1px dashed #bbf7d0; font-size:12px;">
                                📅 <b>Năm ${y}:</b> Sản Lượng Thực Tế: <b style="color:#0284c7;">${_kpiProdFmt(yInfo.target_products || 0)} SP</b> &nbsp;|&nbsp; 
                                Tổng Lỗi: <b style="color:#b91c1c;">${_kpiProdFmt(yInfo.target_errors || 0)}</b> &nbsp;|&nbsp; 
                                Năng Suất TB: <b style="color:#4f46e5;">${_kpiProdFmtRate(yInfo.target_rate || 0)} SP/phút</b>
                            </div>
                        `;
                    });
                    bBox.innerHTML = bHtml;
                }

                // Step 2: Render 3-Year 4-Quarters Benchmark Box
                if (qBox) {
                    let qHtml = '';
                    hYears.forEach(y => {
                        const yInfo = bData.years_data?.[y] || {};
                        const q = yInfo.quarters || { 1: 0, 2: 0, 3: 0, 4: 0 };
                        const r = yInfo.q_ratios || { 1: 0.25, 2: 0.25, 3: 0.25, 4: 0.25 };
                        qHtml += `
                            <div style="margin-bottom:4px; padding-bottom:4px; border-bottom:1px dashed #bbf7d0; font-size:12px;">
                                📅 <b>Năm ${y}:</b> 
                                Q1: <b style="color:#0284c7;">${_kpiProdFmt(q[1])} SP (${(r[1]*100).toFixed(1)}%)</b> &nbsp;|&nbsp; 
                                Q2: <b style="color:#0284c7;">${_kpiProdFmt(q[2])} SP (${(r[2]*100).toFixed(1)}%)</b> &nbsp;|&nbsp; 
                                Q3: <b style="color:#0284c7;">${_kpiProdFmt(q[3])} SP (${(r[3]*100).toFixed(1)}%)</b> &nbsp;|&nbsp; 
                                Q4: <b style="color:#0284c7;">${_kpiProdFmt(q[4])} SP (${(r[4]*100).toFixed(1)}%)</b>
                            </div>
                        `;
                    });
                    qBox.innerHTML = qHtml;
                }

                // Step 3: Render 12-Month Benchmark Box for history years (2023+)
                const mBox = document.getElementById('kpiProdMBenchmarkContent');
                if (mBox) {
                    let mHtml = '';
                    hYears.forEach(y => {
                        const yInfo = bData.years_data?.[y] || {};
                        const m = yInfo.months || {};
                        const monthStrs = [];
                        for (let i = 1; i <= 12; i++) {
                            monthStrs.push(`Tháng ${i}: <b style="color:#0284c7;">${_kpiProdFmt(m[i] || 0)}</b>`);
                        }
                        mHtml += `
                            <div style="margin-bottom:4px; padding-bottom:4px; border-bottom:1px dashed #bbf7d0; font-size:11.5px; white-space:nowrap;">
                                📅 <b>Năm ${y}:</b> ${monthStrs.join(' &nbsp;|&nbsp; ')}
                            </div>
                        `;
                    });
                    mBox.innerHTML = mHtml;
                }
            }
        } catch(e) {
            console.warn('[KPI Prod] Could not fetch benchmark:', e);
        }

        let targetStep = 1;
        if (month >= 101 && month <= 104) targetStep = 2;
        else if (month >= 1 && month <= 12) targetStep = 1;

        const titleEl = document.getElementById('kpiProdConfigModalTitle');
        const monthInput = document.getElementById('kpiProdConfigMonth');
        const rewardInput = document.getElementById('kpiProdConfigReward');

        if (monthInput) monthInput.value = month;
        const subtitleEl = document.getElementById('kpiProdModalStaffSubtitle');
        const dl = (_kpiProdDeptInfo[_kpiProdState.department] || _kpiProdDeptInfo.cutting).label;
        const pLabel = (_kpiProdDeptInfo[_kpiProdState.department] || _kpiProdDeptInfo.cutting).productLabel;
        const prodShort = pLabel.replace('Sản Phẩm ', '').replace('Đơn Kiểm Tra', 'Kiểm Tra');

        const productTh = document.getElementById('kpiProdModalProductTh');
        if (productTh) productTh.innerText = `KPI ${prodShort} (SP)`;


        if (titleEl) {
            if (month === 0) {
                titleEl.innerText = `⚙️ Cấu Hình KPI & Cam Kết ${dl} — Cả Năm ${_kpiProdState.year}`;
                if (subtitleEl) subtitleEl.innerText = `👤 Tùy Chỉnh KPI Cho Từng NV ${dl} trong Cả Năm:`;
            } else if (month >= 101 && month <= 104) {
                const qNum = month - 100;
                titleEl.innerText = `⚙️ Cấu Hình KPI & Cam Kết ${dl} — Quý ${qNum}/${_kpiProdState.year}`;
                if (subtitleEl) subtitleEl.innerText = `👤 Tùy Chỉnh KPI Cho Từng NV ${dl} trong Quý ${qNum}:`;
            } else {
                titleEl.innerText = `⚙️ Cấu Hình KPI & Cam Kết ${dl} — Tháng ${month}/${_kpiProdState.year}`;
                if (subtitleEl) subtitleEl.innerText = `👤 Tùy Chỉnh KPI Cho Từng NV ${dl} trong Tháng ${month}:`;
            }
        }

        // Update commitment/support labels dynamically
        const commitLabel = document.getElementById('kpiProdCommitLabel');
        if (commitLabel) commitLabel.innerText = `📋 Các Điều ${dl} Cam Kết Thực Hiện:`;
        const supportLabel = document.getElementById('kpiProdSupportLabel');
        if (supportLabel) supportLabel.innerText = `🤝 Nội Dung ${dl} Cần Công Ty Hỗ Trợ:`;

        // Section visibility toggles for new elements
        const yearTotalSection = document.getElementById('kpiProdModalStaffTargetsSection');
        const monthTeamSection = document.getElementById('kpiProdMonthTeamAllocSection');
        const shortfallBox = document.getElementById('kpiProdMonthShortfallBox');
        const commitSec = document.getElementById('kpiProdCommitmentsContainerSection');
        const supportSec = document.getElementById('kpiProdSupportsContainerSection');
        const benchmarkBox = document.getElementById('kpiProdBenchmarkBox');
        const tabsHeader = document.getElementById('kpiProdWizardTabsHeader');
        const prevBtn = document.getElementById('kpiProdWizardPrevBtn');
        const nextBtn = document.getElementById('kpiProdWizardNextBtn');
        const saveBtn = document.getElementById('kpiProdWizardSaveBtn');

        if (month === 0 || (month >= 101 && month <= 104)) {
            // Top-Down Year Modal: Show Year Tabs & Annual Benchmark, Hide Commitments & Supports
            if (commitSec) commitSec.style.display = 'none';
            if (supportSec) supportSec.style.display = 'none';
            if (benchmarkBox) benchmarkBox.style.display = 'block';
            if (tabsHeader) tabsHeader.style.display = 'flex';
            // Year mode: show TOTAL inputs, hide team allocation
            if (yearTotalSection) yearTotalSection.style.display = 'block';
            if (monthTeamSection) monthTeamSection.style.display = 'none';
            if (shortfallBox) shortfallBox.style.display = 'none';
        } else {
            // Specific Month Modal: Show Commitments & Supports, Hide Year Tabs & Annual Benchmark
            if (commitSec) commitSec.style.display = 'block';
            if (supportSec) supportSec.style.display = 'block';
            if (benchmarkBox) benchmarkBox.style.display = 'none';
            if (tabsHeader) tabsHeader.style.display = 'none';
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
            if (saveBtn) { saveBtn.style.display = 'inline-block'; saveBtn.innerText = `💾 Lưu Cấu Hình Tháng ${month}`; }
            // Month mode: hide TOTAL inputs, show team allocation
            if (yearTotalSection) yearTotalSection.style.display = 'none';
            if (monthTeamSection) monthTeamSection.style.display = 'block';

            // Force show Step 1 content only, hide Step 2 & 3
            const s1 = document.getElementById('kpiProdWizardStep1');
            const s2 = document.getElementById('kpiProdWizardStep2');
            const s3 = document.getElementById('kpiProdWizardStep3');
            if (s1) s1.style.display = 'flex';
            if (s2) s2.style.display = 'none';
            if (s3) s3.style.display = 'none';
        }

        // Reset inputs
        if (rewardInput) rewardInput.value = '';

        // Reset commitments & supports lists
        const cList = document.getElementById('kpiProdCommitmentsList');
        const sList = document.getElementById('kpiProdSupportsList');
        if (cList) cList.innerHTML = '';
        if (sList) sList.innerHTML = '';

        const baseStaff = _kpiProdState.data?.staff || [];

        // ALWAYS fetch fresh data from API to avoid stale cache
        let targetRowsAll = _kpiProdState.data?.target_rows || [];
        try {
            const freshResp = await fetch(`/api/kpi-production/stats?year=${_kpiProdState.year}&department=${_kpiProdState.department}`, {
                headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') }
            });
            if (freshResp.ok) {
                const freshData = await freshResp.json();
                _kpiProdState.data = freshData;
                targetRowsAll = freshData.target_rows || [];
            }
        } catch(e) {
            console.warn('[KPI Prod] Could not refresh target_rows:', e);
        }

        const deptConfigs = _kpiProdState.data?.dept_configs || {};

        if (month === 0 || (month >= 101 && month <= 104)) {
            // === YEAR MODE: Populate 3 TOTAL inputs from dept_configs month=0 ===
            const yearCfg = deptConfigs[0] || {};
            const yP = document.getElementById('kpiProdYearTotalProducts');
            const yE = document.getElementById('kpiProdYearTotalErrors');
            const yR = document.getElementById('kpiProdYearTotalRate');
            if (yP) yP.value = yearCfg.target_products > 0 ? yearCfg.target_products : '';
            if (yE) yE.value = yearCfg.target_errors > 0 ? yearCfg.target_errors : '';
            if (yR) yR.value = yearCfg.target_rate > 0 ? String(yearCfg.target_rate).replace('.', ',') : '';

            // Set Step 1 eval rule
            if (yearCfg.eval_rule) {
                const rad = document.querySelector(`input[name="kpiProdEvalRule"][value="${yearCfg.eval_rule}"]`);
                if (rad) rad.checked = true;
            }

            // Step 2 Quarters: Check if quarter configs exist in deptConfigs[101..104]
            let hasAnyQConfig = false;
            for (let q = 1; q <= 4; q++) {
                if (deptConfigs[100 + q] && deptConfigs[100 + q].target_products > 0) {
                    hasAnyQConfig = true;
                    break;
                }
            }
            if (hasAnyQConfig) {
                const radQCustom = document.querySelector('input[name="kpiProdQAllocMethod"][value="custom"]');
                if (radQCustom) radQCustom.checked = true;
            }

            // Pre-populate Step 2 & 3 tables
            try {
                window._kpiProdApplyQAllocMethod();
                window._kpiProdApplyMAllocMethod();
            } catch(e) {}

            // Populate exact saved values for Step 2 Quarters
            for (let q = 1; q <= 4; q++) {
                const qCfg = deptConfigs[100 + q];
                if (qCfg) {
                    const qInp = document.getElementById(`kpiProdQ${q}Products`);
                    const qEInp = document.getElementById(`kpiProdQ${q}Errors`);
                    const qRInp = document.getElementById(`kpiProdQ${q}Rate`);
                    if (qInp && qCfg.target_products > 0) qInp.value = qCfg.target_products;
                    if (qEInp && qCfg.target_errors >= 0) qEInp.value = qCfg.target_errors;
                    if (qRInp && qCfg.target_rate > 0) qRInp.value = _kpiProdFmtRate(qCfg.target_rate);
                }
            }
            try { window._kpiProdUpdateQTotals(); } catch(e) {}

            // Step 3 Months: If month configs exist, populate exact saved values
            const mTbody = document.getElementById('kpiProdModal12MonthsTableList');
            if (mTbody) {
                let hasAnyMonthCfg = false;
                for (let m = 1; m <= 12; m++) {
                    if (deptConfigs[m] && deptConfigs[m].target_products > 0) { hasAnyMonthCfg = true; break; }
                }
                if (hasAnyMonthCfg) {
                    const radCustom = document.querySelector('input[name="kpiProdMAllocMethod"][value="custom"]');
                    if (radCustom) radCustom.checked = true;

                    for (let m = 1; m <= 12; m++) {
                        const mCfg = deptConfigs[m];
                        if (mCfg) {
                            const row = mTbody.querySelector(`tr[data-month="${m}"]`);
                            if (row) {
                                const pInp = row.querySelector('.kpi-prod-m-target-products');
                                const eInp = row.querySelector('.kpi-prod-m-target-errors');
                                const rInp = row.querySelector('.kpi-prod-m-target-rate');
                                if (pInp && mCfg.target_products > 0) pInp.value = mCfg.target_products;
                                if (eInp && mCfg.target_errors >= 0) eInp.value = mCfg.target_errors;
                                if (rInp && mCfg.target_rate > 0) rInp.value = _kpiProdFmtRate(mCfg.target_rate);
                            }
                        }
                    }
                    try { window._kpiProdUpdateMTotals(); } catch(e) {}
                }
            }

            // Lock / Edit Mode setup
            if (hasYearConfig) {
                // If year configuration already exists, open in LOCKED VIEW MODE
                window._kpiProdApplyModalLockState(true);
            } else {
                // If new configuration, open in EDIT MODE
                window._kpiProdApplyModalLockState(false);
            }

        } else {
            // === MONTH MODE: Show team allocation with shortfall ===
            const monthCfg = deptConfigs[month] || {};
            const monthTargetProducts = monthCfg.target_products || 0;
            const monthTargetErrors = monthCfg.target_errors || 0;
            const monthTargetRate = monthCfg.target_rate || 0;

            // Calculate cumulative shortfall from previous months
            const { totalShortfall: prevShortfall, lastShortMonth } = _getKpiProdCumulativeShortfall(month);
            const shortTxt = lastShortMonth > 0 ? (lastShortMonth === month - 1 ? `Tháng ${lastShortMonth}` : `Các tháng trước (T${lastShortMonth})`) : `Các tháng trước`;

            // Always hide top pink banner as requested (Ảnh 2 hidden)
            if (shortfallBox) shortfallBox.style.display = 'none';

            // Render 3-Year Benchmark Suggestion Box for Month `month`
            const mBenchmarkBox = document.getElementById('kpiProdMonthBenchmarkBox');
            if (mBenchmarkBox && month > 0 && month <= 12) {
                const bData = _kpiProdState.benchmarkData || {};
                const hYears = bData.history_years || [];
                let mBHtml = `
                    <div style="font-size:12px; font-weight:800; color:#166534; margin-bottom:6px;">
                        💡 <b>Gợi Ý Chỉ Số Thực Tế Tháng ${month} Của Các Năm Trước:</b>
                    </div>
                `;
                let countYear = 0;
                hYears.forEach(y => {
                    const yInfo = bData.years_data?.[y] || {};
                    const mProd = (yInfo.months && yInfo.months[month] !== undefined) ? yInfo.months[month] : 0;
                    const mErr = (yInfo.month_errors && yInfo.month_errors[month] !== undefined) ? yInfo.month_errors[month] : 0;
                    const mRate = (yInfo.month_rates && yInfo.month_rates[month] !== undefined) ? yInfo.month_rates[month] : 0;

                    mBHtml += `
                        <div style="margin-bottom:4px; padding-bottom:4px; border-bottom:1px dashed #bbf7d0; font-size:11.5px; color:#1e293b;">
                            📅 <b>Năm ${y} (Tháng ${month}):</b> 
                            Sản Lượng Thực Tế: <b style="color:#0284c7;">${_kpiProdFmt(mProd)} SP</b> &nbsp;|&nbsp; 
                            Tổng Lỗi: <b style="color:#b91c1c;">${_kpiProdFmt(mErr)} Lỗi</b> &nbsp;|&nbsp; 
                            Năng Suất TB: <b style="color:#4f46e5;">${mRate > 0 ? _kpiProdFmtRate(mRate) : '—'} SP/phút</b>
                        </div>
                    `;
                    countYear++;
                });
                if (countYear > 0) {
                    mBenchmarkBox.innerHTML = mBHtml;
                    mBenchmarkBox.style.display = 'block';
                } else {
                    mBenchmarkBox.style.display = 'none';
                }
            }

            // Show month target reference box cleanly without extra shortfall tag
            const refBox = document.getElementById('kpiProdMonthTargetRefBox');
            if (refBox) {
                refBox.innerHTML = `📊 <b>Target Tháng ${month}:</b> KPI Target = <b style="color:#0284c7;">${_kpiProdFmt(monthTargetProducts)} SP</b> &nbsp;|&nbsp; Lỗi Max = <b style="color:#b91c1c;">${_kpiProdFmt(monthTargetErrors)}</b> &nbsp;|&nbsp; Năng Suất = <b style="color:#4f46e5;">${monthTargetRate > 0 ? _kpiProdFmtRate(monthTargetRate) : '—'} SP/phút</b>`;
            }

            // Auto-suggest: split month target equally among teams with remainder absorption
            const numTeams = baseStaff.length || 1;
            const baseP = Math.floor(monthTargetProducts / numTeams);
            const remP = monthTargetProducts % numTeams;
            const baseE = Math.floor(monthTargetErrors / numTeams);
            const remE = monthTargetErrors % numTeams;

            const mStaff = baseStaff.map((st, stIdx) => {
                const saved = targetRowsAll.find(t => parseInt(t.user_id, 10) === parseInt(st.id, 10) && parseInt(t.month, 10) === parseInt(month, 10));
                if (saved && (saved.target_products > 0 || saved.target_errors > 0)) {
                    return {
                        user_id: st.id,
                        full_name: st.full_name,
                        target_products: parseInt(saved.target_products || 0, 10),
                        target_errors: parseInt(saved.target_errors || 0, 10),
                        target_rate: parseFloat(saved.target_rate || 0)
                    };
                }
                const teamP = baseP + (stIdx < remP ? 1 : 0);
                const teamE = baseE + (stIdx < remE ? 1 : 0);
                return {
                    user_id: st.id,
                    full_name: st.full_name,
                    target_products: monthTargetProducts > 0 ? teamP : 0,
                    target_errors: monthTargetErrors > 0 ? teamE : 0,
                    target_rate: monthTargetRate
                };
            });

            const staffListContainer = document.getElementById('kpiProdModalStaffTargetsList');
            if (staffListContainer) {
                if (mStaff.length === 0) {
                    staffListContainer.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:12px;">Chưa có dữ liệu team</td></tr>';
                } else {
                    staffListContainer.innerHTML = mStaff.map(s => {
                        const pVal = s.target_products > 0 ? s.target_products : '';
                        const eVal = s.target_errors > 0 ? s.target_errors : '';
                        const rVal = s.target_rate > 0 ? String(s.target_rate).replace('.', ',') : '';
                        return `
                        <tr data-uid="${s.user_id}">
                            <td style="padding:6px 10px; font-weight:700; color:#0f172a; border-bottom:1px solid #f1f5f9;">${_escapeHtml(s.full_name)}</td>
                            <td style="padding:4px 6px; border-bottom:1px solid #f1f5f9;">
                                <input type="number" min="0" class="kpi-prod-staff-m-target-products" value="${pVal}" placeholder="—" oninput="window._kpiProdUpdateTeamTotals()" onfocus="window._kpiProdShowSmartHintTeam(this,'products')" onblur="setTimeout(window._kpiProdHideSmartHint,200)" style="width:100%; padding:4px 8px; border:1px solid #bae6fd; border-radius:6px; font-size:12px; font-weight:800; color:#0284c7; text-align:center;">
                            </td>
                            <td style="padding:4px 6px; border-bottom:1px solid #f1f5f9;">
                                <input type="number" min="0" class="kpi-prod-staff-m-target-errors" value="${eVal}" placeholder="—" oninput="window._kpiProdUpdateTeamTotals()" onfocus="window._kpiProdShowSmartHintTeam(this,'errors')" onblur="setTimeout(window._kpiProdHideSmartHint,200)" style="width:100%; padding:4px 8px; border:1px solid #fca5a5; border-radius:6px; font-size:12px; font-weight:800; color:#b91c1c; text-align:center;">
                            </td>
                            <td style="padding:4px 6px; border-bottom:1px solid #f1f5f9;">
                                <input type="text" inputmode="decimal" class="kpi-prod-staff-m-target-rate" value="${rVal}" placeholder="—" oninput="window._kpiProdUpdateTeamTotals()" onfocus="window._kpiProdShowSmartHintTeam(this,'rate')" onblur="setTimeout(window._kpiProdHideSmartHint,200)" style="width:100%; padding:4px 8px; border:1px solid #c7d2fe; border-radius:6px; font-size:12px; font-weight:800; color:#4f46e5; text-align:center;">
                            </td>
                        </tr>
                        `;
                    }).join('');
                }
            }

            // Update totals row
            window._kpiProdUpdateTeamTotals();
        }

        // Helper to format currency numbers with dots (10000000 -> 10.000.000)
        function _formatRewardVal(val) {
            if (!val) return '';
            const str = String(val).trim();
            const digitsOnly = str.replace(/\D/g, '');
            if (digitsOnly && /^[\d\.\s]*$/.test(str)) {
                return parseInt(digitsOnly, 10).toLocaleString('vi-VN').replace(/,/g, '.');
            }
            return str;
        }

        window._formatRewardInput = function(inp) {
            if (!inp) return;
            let val = inp.value;
            if (!val) return;
            const digitsOnly = val.replace(/\D/g, '');
            if (!digitsOnly) return;
            if (/^[\d\.\s]*$/.test(val)) {
                const formatted = parseInt(digitsOnly, 10).toLocaleString('vi-VN').replace(/,/g, '.');
                if (inp.value !== formatted) {
                    inp.value = formatted;
                }
            }
        };


        // Fetch existing config from API
        try {
            const resp = await fetch(`/api/kpi-production/config?year=${_kpiProdState.year}&month=${month}&department=${_kpiProdState.department}`, {
                headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') }
            });
            if (resp.ok) {
                const cfg = await resp.json();
                if (cfg) {
                    if (rewardInput && cfg.reward_text) rewardInput.value = cfg.reward_text;

                    // Eval rule
                    const evalRadio = document.querySelector(`input[name="kpiProdEvalRule"][value="${cfg.eval_rule || 'ALL'}"]`);
                    if (evalRadio) evalRadio.checked = true;

                    // Populate commitments
                    if (Array.isArray(cfg.commitments) && cfg.commitments.length > 0) {
                        cfg.commitments.forEach(c => window._addKpiProdCommitmentRow(c));
                    } else {
                        window._addKpiProdCommitmentRow('');
                    }

                    // Populate supports
                    if (Array.isArray(cfg.supports) && cfg.supports.length > 0) {
                        cfg.supports.forEach(s => window._addKpiProdSupportRow(s));
                    } else {
                        window._addKpiProdSupportRow('');
                    }
                }
            }
        } catch(e) {
            console.error('[KPI Prod] Error fetching config:', e);
            window._addKpiProdCommitmentRow('');
            window._addKpiProdSupportRow('');
        }

        // Set active wizard step at the very end to guarantee correct tab & button state
        if (month === 0 || (month >= 101 && month <= 104)) {
            window._kpiProdSetWizardStep(targetStep);
        }

        // Show modal
        overlay.style.display = 'flex';
    };

    window._fillKpiProdModalStaffTargetsFromFirstRow = function() {
        const firstRow = document.querySelector('#kpiProdModalStaffTargetsList tr');
        if (!firstRow) return;
        const pVal = firstRow.querySelector('.kpi-prod-staff-m-target-products')?.value || '';
        const eVal = firstRow.querySelector('.kpi-prod-staff-m-target-errors')?.value || '';
        const rVal = firstRow.querySelector('.kpi-prod-staff-m-target-rate')?.value || '';

        if (!pVal && !eVal && !rVal) {
            alert('Vui lòng điền thông tin KPI cho nhân viên đầu tiên trước khi bấm Gán Nhanh!');
            return;
        }

        const rows = document.querySelectorAll('#kpiProdModalStaffTargetsList tr');
        rows.forEach(row => {
            const pInp = row.querySelector('.kpi-prod-staff-m-target-products');
            const eInp = row.querySelector('.kpi-prod-staff-m-target-errors');
            const rInp = row.querySelector('.kpi-prod-staff-m-target-rate');

            if (pInp) pInp.value = pVal;
            if (eInp) eInp.value = eVal;
            if (rInp) rInp.value = rVal;
        });
    };

    window._kpiProdQuickSplitYearTarget = function() {
        const valStr = prompt("🎯 Nhập tổng Target sản phẩm mong muốn cho CẢ NĂM (Ví dụ: 120000 hoặc 300000):");
        if (!valStr) return;
        const num = parseInt(valStr.replace(/\D/g, ''), 10);
        if (!num || num <= 0) {
            alert("⚠️ Vui lòng nhập số hợp lệ lớn hơn 0!");
            return;
        }
        
        const monthTarget = Math.round(num / 12);
        const rows = document.querySelectorAll('#kpiProdModalStaffTargetsList tr');
        if (rows.length === 0) return;
        
        const perStaffMonthTarget = Math.round(monthTarget / rows.length);
        
        rows.forEach(r => {
            const inp = r.querySelector('.kpi-prod-staff-m-target-products');
            if (inp) inp.value = perStaffMonthTarget;
        });

        alert(`✅ Đã phân bổ thành công:\n• Tổng Target Năm = ${num.toLocaleString('vi-VN')} SP\n• Mỗi Tháng toàn bộ phận = ${monthTarget.toLocaleString('vi-VN')} SP\n• Mỗi Nhân Viên/Tháng = ${perStaffMonthTarget.toLocaleString('vi-VN')} SP.`);
    };

    window._closeKpiProdConfigModal = function() {
        const overlay = document.getElementById('kpiProdConfigModalOverlay');
        if (overlay) overlay.style.display = 'none';
    };

    // Real-time update TỔNG & 🎯 THÁNG & ⚖️ CHÊNH LỆCH rows in team allocation table (month mode) (Ảnh 4 & Ảnh 5)
    window._kpiProdUpdateTeamTotals = function() {
        const rows = document.querySelectorAll('#kpiProdModalStaffTargetsList tr');
        let totalP = 0, totalE = 0;
        let rateSum = 0, rateCount = 0;

        rows.forEach(r => {
            totalP += parseInt(String(r.querySelector('.kpi-prod-staff-m-target-products')?.value || '').replace(/\D/g, '') || '0', 10);
            totalE += parseInt(String(r.querySelector('.kpi-prod-staff-m-target-errors')?.value || '').replace(/\D/g, '') || '0', 10);
            const rVal = parseFloat(String(r.querySelector('.kpi-prod-staff-m-target-rate')?.value || '0').replace(',', '.')) || 0;
            if (rVal > 0) {
                rateSum += rVal;
                rateCount++;
            }
        });

        const avgRate = rateCount > 0 ? (rateSum / rateCount) : 0;

        const totalPEl = document.getElementById('kpiProdTeamAllocTotalProducts');
        const totalEEl = document.getElementById('kpiProdTeamAllocTotalErrors');
        const totalREl = document.getElementById('kpiProdTeamAllocTotalRate');
        if (totalPEl) totalPEl.innerText = _kpiProdFmt(totalP);
        if (totalEEl) totalEEl.innerText = _kpiProdFmt(totalE);
        if (totalREl) totalREl.innerText = avgRate > 0 ? _kpiProdFmtRate(avgRate) : '—';

        // Validation & Reference Month Target
        const month = parseInt(document.getElementById('kpiProdConfigMonth')?.value || '0', 10);
        const deptConfigs = _kpiProdState.data?.dept_configs || {};
        const monthCfg = deptConfigs[month] || {};
        const monthTargetP = monthCfg.target_products || 0;
        const monthTargetE = monthCfg.target_errors || 0;
        const monthTargetR = monthCfg.target_rate || 0;

        // Render Row 2: 🎯 THÁNG N (Reference Target)
        const refLabelEl = document.getElementById('kpiProdTeamAllocMonthRefLabel');
        const refPEl = document.getElementById('kpiProdTeamAllocMonthRefProducts');
        const refEEl = document.getElementById('kpiProdTeamAllocMonthRefErrors');
        const refREl = document.getElementById('kpiProdTeamAllocMonthRefRate');
        if (refLabelEl) refLabelEl.innerText = `🎯 THÁNG ${month > 0 ? month : ''}`;
        if (refPEl) refPEl.innerText = _kpiProdFmt(monthTargetP);
        if (refEEl) refEEl.innerText = _kpiProdFmt(monthTargetE);
        if (refREl) refREl.innerText = monthTargetR > 0 ? _kpiProdFmtRate(monthTargetR) : '—';

        // Render Row 3: ⚖️ CHÊNH LỆCH
        const diffPEl = document.getElementById('kpiProdTeamAllocDiffProducts');
        const diffEEl = document.getElementById('kpiProdTeamAllocDiffErrors');
        const diffREl = document.getElementById('kpiProdTeamAllocDiffRate');

        const { totalShortfall: prevShortfall, lastShortMonth, shortfallMonthLabel } = _getKpiProdCumulativeShortfall(month);
        const targetWithCompP = monthTargetP + prevShortfall;

        // Render Prev Shortfall Row — show REMAINING shortfall after partial compensation
        const prevShortfallRow = document.getElementById('kpiProdTeamAllocPrevShortfallRow');
        const prevShortfallLabel = document.getElementById('kpiProdTeamAllocPrevShortfallLabel');
        const prevShortfallProducts = document.getElementById('kpiProdTeamAllocPrevShortfallProducts');
        const usedFromShortfall = Math.max(0, Math.min(totalP - monthTargetP, prevShortfall));
        const remainingShortfall = prevShortfall - usedFromShortfall;
        if (prevShortfallRow) {
            if (prevShortfall > 0) {
                if (prevShortfallLabel) prevShortfallLabel.innerText = `⚠️ ${shortfallMonthLabel} THIẾU`;
                if (prevShortfallProducts) {
                    if (usedFromShortfall <= 0) {
                        prevShortfallProducts.innerHTML = `<span style="color:#c2410c; font-weight:900;">${_kpiProdFmt(prevShortfall)} SP</span> <span style="font-size:10px; color:#94a3b8;">(chưa bù)</span>`;
                    } else if (remainingShortfall <= 0) {
                        prevShortfallProducts.innerHTML = `<span style="color:#16a34a; font-weight:900;">✅ Đã bù hết ${_kpiProdFmt(prevShortfall)} SP</span>`;
                    } else {
                        prevShortfallProducts.innerHTML = `<span style="color:#d97706; font-weight:900;">Còn ${_kpiProdFmt(remainingShortfall)} SP</span> <span style="font-size:10px; color:#64748b;">(đã bù ${_kpiProdFmt(usedFromShortfall)}/${_kpiProdFmt(prevShortfall)})</span>`;
                    }
                }
                prevShortfallRow.style.display = 'table-row';
            } else {
                prevShortfallRow.style.display = 'none';
            }
        }

        if (diffPEl) {
            if (monthTargetP <= 0) {
                diffPEl.innerHTML = '—';
            } else if (totalP < monthTargetP) {
                diffPEl.innerHTML = `<span style="color:#dc2626; font-weight:900;">❌ Thiếu ${_kpiProdFmt(monthTargetP - totalP)} SP</span>`;
            } else if (totalP === monthTargetP) {
                diffPEl.innerHTML = '<span style="color:#16a34a; font-weight:900;">✅ Chính xác</span>';
            } else if (prevShortfall > 0 && totalP <= targetWithCompP) {
                // Partial or full compensation — any value in range (monthTargetP, targetWithCompP]
                const tTag = lastShortMonth > 0 ? ` T${lastShortMonth}` : '';
                if (totalP === targetWithCompP) {
                    diffPEl.innerHTML = `<span style="color:#15803d; font-weight:900;">✅ Chính xác (Bù đủ ${_kpiProdFmt(prevShortfall)} SP${tTag})</span>`;
                } else {
                    diffPEl.innerHTML = `<span style="color:#15803d; font-weight:900;">✅ Chính xác (Bù ${_kpiProdFmt(usedFromShortfall)}/${_kpiProdFmt(prevShortfall)} SP${tTag})</span>`;
                }
            } else {
                diffPEl.innerHTML = `<span style="color:#dc2626; font-weight:900;">❌ Vượt ${_kpiProdFmt(totalP - targetWithCompP)} SP</span>`;
            }
        }

        if (diffEEl) {
            if (monthTargetE <= 0) {
                diffEEl.innerHTML = '—';
            } else if (totalE === monthTargetE) {
                diffEEl.innerHTML = '<span style="color:#16a34a; font-weight:900;">✅ Chính xác</span>';
            } else if (totalE > monthTargetE) {
                diffEEl.innerHTML = `<span style="color:#dc2626; font-weight:900;">❌ Vượt ${_kpiProdFmt(totalE - monthTargetE)} Lỗi</span>`;
            } else {
                diffEEl.innerHTML = `<span style="color:#dc2626; font-weight:900;">❌ Thiếu ${_kpiProdFmt(monthTargetE - totalE)} Lỗi</span>`;
            }
        }

        if (diffREl) {
            if (monthTargetR <= 0) {
                diffREl.innerHTML = '—';
            } else if (avgRate >= monthTargetR) {
                diffREl.innerHTML = '<span style="color:#16a34a; font-weight:900;">✅ Đạt</span>';
            } else {
                diffREl.innerHTML = '<span style="color:#d97706; font-weight:900;">⚠️ Chưa đạt</span>';
            }
        }

        // Toggle Save Button & Validation Box (Ảnh 5)
        const validEl = document.getElementById('kpiProdTeamAllocValidation');
        const saveBtn = document.getElementById('kpiProdWizardSaveBtn');

        // Flexible range: totalP must be in [monthTargetP … targetWithCompP]
        const isProductsMatched = (monthTargetP <= 0) || (totalP >= monthTargetP && totalP <= targetWithCompP);

        const isErrorsMatched = (monthTargetE <= 0 || totalE === monthTargetE);
        const isFullyBalanced = isProductsMatched && isErrorsMatched;

        if (saveBtn && month > 0 && month <= 12) {
            saveBtn.style.display = isFullyBalanced ? 'inline-block' : 'none';
        }

        if (validEl && monthTargetP > 0) {
            if (isFullyBalanced) {
                let compText = '';
                if (usedFromShortfall > 0 && prevShortfall > 0) {
                    const tTag = lastShortMonth > 0 ? ` T${lastShortMonth}` : '';
                    if (usedFromShortfall >= prevShortfall) {
                        compText = ` (Bù đủ ${_kpiProdFmt(prevShortfall)} SP${tTag})`;
                    } else {
                        compText = ` (Bù ${_kpiProdFmt(usedFromShortfall)}/${_kpiProdFmt(prevShortfall)} SP${tTag}, còn ${_kpiProdFmt(remainingShortfall)} SP dồn tháng sau)`;
                    }
                }
                validEl.innerHTML = `✅ <b>Tổng ${_kpiProdFmt(totalP)} SP | ${_kpiProdFmt(totalE)} Lỗi${compText} — ĐÃ CÂN KHỚP!</b> (Cho phép Lưu)`;
                validEl.style.color = '#15803d';
                validEl.style.background = '#f0fdf4';
                validEl.style.border = '1.5px solid #86efac';
                validEl.style.padding = '8px 12px';
                validEl.style.borderRadius = '8px';
            } else {
                let msg = '';
                if (totalP > targetWithCompP) {
                    msg = `⚠️ <b>Tổng SP (${_kpiProdFmt(totalP)}) > Giới hạn tối đa (${_kpiProdFmt(targetWithCompP)}) — Vượt ${_kpiProdFmt(totalP - targetWithCompP)} SP</b>`;
                } else if (totalP < monthTargetP) {
                    msg = `❌ <b>Tổng SP (${_kpiProdFmt(totalP)}) < Target Tháng Gốc (${_kpiProdFmt(monthTargetP)}) — Thiếu ${_kpiProdFmt(monthTargetP - totalP)} SP</b>`;
                } else if (totalE !== monthTargetE) {
                    msg = `⚠️ <b>Tổng Lỗi (${_kpiProdFmt(totalE)}) khác Lỗi Max Target (${_kpiProdFmt(monthTargetE)})</b>`;
                }
                validEl.innerHTML = `${msg}<br>👉 <i>Vui lòng điều chỉnh sao cho Tổng SP nằm trong khoảng <b>${_kpiProdFmt(monthTargetP)} … ${_kpiProdFmt(targetWithCompP)} SP</b> và Lỗi = <b>${_kpiProdFmt(monthTargetE)}</b> thì nút <b>💾 Lưu Cấu Hình</b> mới xuất hiện!</i>`;
                validEl.style.color = '#b91c1c';
                validEl.style.background = '#fef2f2';
                validEl.style.border = '1.5px solid #fca5a5';
                validEl.style.padding = '8px 12px';
                validEl.style.borderRadius = '8px';
            }
        } else if (validEl) {
            validEl.innerHTML = '';
            validEl.style.border = 'none';
            validEl.style.background = 'transparent';
        }
    };

    // Auto split month target equally among teams with remainder absorption
    window._kpiProdAutoSplitTeams = function() {
        const month = parseInt(document.getElementById('kpiProdConfigMonth')?.value || '0', 10);
        const deptConfigs = _kpiProdState.data?.dept_configs || {};
        const monthCfg = deptConfigs[month] || {};
        const monthTargetProducts = monthCfg.target_products || 0;
        const monthTargetErrors = monthCfg.target_errors || 0;
        const monthTargetRate = monthCfg.target_rate || 0;

        const rows = document.querySelectorAll('#kpiProdModalStaffTargetsList tr');
        const numTeams = rows.length || 1;

        const baseP = Math.floor(monthTargetProducts / numTeams);
        const remP = monthTargetProducts % numTeams;

        const baseE = Math.floor(monthTargetErrors / numTeams);
        const remE = monthTargetErrors % numTeams;

        const rateFmt = monthTargetRate > 0 ? String(monthTargetRate).replace('.', ',') : '';

        rows.forEach((r, idx) => {
            const pInp = r.querySelector('.kpi-prod-staff-m-target-products');
            const eInp = r.querySelector('.kpi-prod-staff-m-target-errors');
            const rInp = r.querySelector('.kpi-prod-staff-m-target-rate');

            const teamP = baseP + (idx < remP ? 1 : 0);
            const teamE = baseE + (idx < remE ? 1 : 0);

            if (pInp) pInp.value = teamP > 0 ? teamP : '';
            if (eInp) eInp.value = teamE > 0 ? teamE : '';
            if (rInp) rInp.value = rateFmt;
        });

        window._kpiProdUpdateTeamTotals();
    };

    window._addKpiProdCommitmentRow = function(text = '') {
        const container = document.getElementById('kpiProdCommitmentsList');
        if (!container) return;

        // Smart fill: If text is provided and there is an existing empty row, fill it first
        if (text) {
            const emptyInput = Array.from(container.querySelectorAll('.kpi-prod-commitment-input')).find(inp => !inp.value.trim());
            if (emptyInput) {
                emptyInput.value = text;
                return;
            }
        }

        const rowIdx = container.children.length + 1;
        const div = document.createElement('div');
        div.style.cssText = 'display:flex; align-items:center; gap:8px;';
        div.innerHTML = `
            <span style="font-size:12px; font-weight:800; color:#64748b; width:24px;">#${rowIdx}</span>
            <input type="text" class="kpi-prod-commitment-input" value="${_escapeHtml(text)}" placeholder="Nhập điều cam kết thực hiện..." style="flex:1; padding:8px 12px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:12.5px; font-weight:700; color:#0f172a; outline:none;">
            <button type="button" onclick="this.parentElement.remove(); window._reindexKpiProdCommitmentRows();" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; width:32px; height:32px; border-radius:8px; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center;">🗑️</button>
        `;
        container.appendChild(div);
    };

    window._addKpiProdSupportRow = function(text = '') {
        const container = document.getElementById('kpiProdSupportsList');
        if (!container) return;

        // Smart fill: If text is provided and there is an existing empty row, fill it first
        if (text) {
            const emptyInput = Array.from(container.querySelectorAll('.kpi-prod-support-input')).find(inp => !inp.value.trim());
            if (emptyInput) {
                emptyInput.value = text;
                return;
            }
        }

        const rowIdx = container.children.length + 1;
        const div = document.createElement('div');
        div.style.cssText = 'display:flex; align-items:center; gap:8px;';
        div.innerHTML = `
            <span style="font-size:12px; font-weight:800; color:#0284c7; width:24px;">#${rowIdx}</span>
            <input type="text" class="kpi-prod-support-input" value="${_escapeHtml(text)}" placeholder="Nhập nội dung cần hỗ trợ..." style="flex:1; padding:8px 12px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:12.5px; font-weight:700; color:#0f172a; outline:none;">
            <button type="button" onclick="this.parentElement.remove(); window._reindexKpiProdSupportRows();" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; width:32px; height:32px; border-radius:8px; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center;">🗑️</button>
        `;
        container.appendChild(div);
    };

    window._reindexKpiProdCommitmentRows = function() {
        const container = document.getElementById('kpiProdCommitmentsList');
        if (!container) return;
        Array.from(container.children).forEach((row, idx) => {
            const span = row.querySelector('span');
            if (span) span.innerText = `#${idx + 1}`;
        });
    };

    window._reindexKpiProdSupportRows = function() {
        const container = document.getElementById('kpiProdSupportsList');
        if (!container) return;
        Array.from(container.children).forEach((row, idx) => {
            const span = row.querySelector('span');
            if (span) span.innerText = `#${idx + 1}`;
        });
    };

    const DEPT_COMMITMENT_PRESETS = {
        cutting: [
            '✂️ Đảm bảo cắt đúng sơ đồ, đúng kích thước thiết kế, tỷ lệ chính xác > 98%',
            '⏱️ Đảm bảo hoàn thành đúng 100% tiến độ đơn hàng cắt gấp theo yêu cầu',
            '📉 Quản lý tiết kiệm vải tối đa, kiểm soát tỷ lệ hao hụt vải cắt < 2%',
            '🧹 Giữ vệ sinh bàn cắt và bảo dưỡng định kỳ máy cắt mỗi tuần',
            '🎯 Đạt mục tiêu năng suất sản phẩm cắt trung bình bộ phận'
        ],
        printing: [
            '🖨️ Đảm bảo chất lượng in sắc nét, đúng mẫu thiết kế và đúng màu sắc > 98%',
            '⏱️ Đảm bảo hoàn thành đúng 100% tiến độ in các đơn hàng gấp',
            '📉 Kiểm soát tỷ lệ hàng in lỗi, hư hỏng dưới 1.5%',
            '🧹 Vệ sinh đầu in, bàn in và bảo dưỡng định kỳ máy in mỗi tuần',
            '🎯 Đạt mục tiêu năng suất sản phẩm in trung bình bộ phận'
        ],
        pressing: [
            '🔥 Đảm bảo lực ép, nhiệt độ và thời gian chuẩn, độ bám dính bền > 98%',
            '⏱️ Hoàn thành đúng 100% tiến độ ép decal/PET cho các đơn hàng',
            '📉 Kiểm soát tỷ lệ ép bong tróc, lệch vị trí < 1%',
            '🧹 Vệ sinh mặt kính, bàn ép và bảo dưỡng máy ép định kỳ mỗi tuần',
            '🎯 Đạt mục tiêu năng suất sản phẩm ép trung bình bộ phận'
        ],
        sewing: [
            '🪡 Đảm bảo đường may chuẩn nét, đúng thông số kỹ thuật và đúng mẫu > 98%',
            '⏱️ Đảm bảo hoàn thành đúng 100% tiến độ may theo lịch sản xuất',
            '📉 Kiểm soát và giảm thiểu tỷ lệ sản phẩm may lỗi dưới 2%',
            '🧹 Vệ sinh máy may, bế gọn gàng khu vực may mỗi cuối ngày',
            '🎯 Đạt mục tiêu năng suất sản phẩm may trung bình tổ/bộ phận'
        ],
        qc: [
            '✅ Kiểm tra 100% sản phẩm trước khi chuyển bước tiếp theo',
            '⏱️ Đảm bảo thời gian kiểm tra chất lượng không làm chậm tiến độ',
            '📉 Phát hiện sớm 100% lỗi sản xuất phát sinh tại các công đoạn',
            '📝 Ghi chép đầy đủ báo cáo lỗi và phản hồi kịp thời cho các tổ',
            '🎯 Đạt mục tiêu năng suất đơn kiểm tra chất lượng bộ phận'
        ],
        finishing: [
            '📦 Đảm bảo cắt chỉ sạch, ủi phẳng và đóng gói đúng quy cách 100%',
            '⏱️ Đảm bảo hoàn thành tiến độ hoàn thiện giao hàng đúng hạn',
            '📉 Kiểm soát lỗi đóng gói, nhầm size/màu dưới 0.5%',
            '🧹 Giữ gìn vệ sinh kho hoàn thiện và bảo quản hàng hóa ngăn nắp',
            '🎯 Đạt mục tiêu năng suất sản phẩm hoàn thiện trung bình bộ phận'
        ]
    };

    const DEPT_SUPPORT_PRESETS = {
        cutting: [
            '✂️ Cung cấp thêm máy cắt tự động / lưỡi cắt dự phòng chất lượng cao',
            '⚡ Hỗ trợ thêm nguồn điện, hệ thống đèn chiếu sáng tiêu chuẩn bàn cắt',
            '💰 Tăng ngân sách thưởng/tăng ca thúc đẩy tiến độ bộ phận cắt',
            '📐 Hỗ trợ cập nhật phần mềm giác sơ đồ tự động tối ưu vải'
        ],
        printing: [
            '🖨️ Trang bị thêm mực in, vật tư in cao cấp và linh kiện máy in dự phòng',
            '⚡ Tăng cường hệ thống sấy khô và thông gió khu vực máy in',
            '💰 Tăng ngân sách thưởng/tăng ca cho bộ phận in khi chạy hàng gấp',
            '🎨 Hỗ trợ duyệt mẫu in và file in chuẩn kỹ thuật từ phòng thiết kế'
        ],
        pressing: [
            '🔥 Cung cấp thêm máy ép nhiệt tự động, cao su chịu nhiệt chất lượng',
            '⚡ Đảm bảo nguồn điện ổn định công suất cao cho dàn máy ép',
            '💰 Tăng ngân sách thưởng/tăng ca thúc đẩy tiến độ bộ phận ép',
            '📦 Hỗ trợ vật tư PET/Decal đạt tiêu chuẩn độ bám dính tốt'
        ],
        sewing: [
            '🪡 Bổ sung máy may chuyên dụng / phụ tùng may dự phòng chất lượng',
            '⚡ Nâng cấp hệ thống ánh sáng và quạt mát xưởng may',
            '💰 Tăng ngân sách thưởng năng suất và tăng ca cho các team may',
            '🧵 Cung cấp đầy đủ chỉ may, phụ liệu đạt chuẩn đúng tiến độ'
        ],
        qc: [
            '✅ Trang bị bàn kiểm hàng chuẩn ánh sáng và dụng cụ đo kiểm chính xác',
            '⚡ Hỗ trợ phần mềm/biểu mẫu ghi nhận lỗi nhanh chóng',
            '💰 Tăng ngân sách thưởng phát hiện lỗi sớm cho bộ phận QC',
            '📢 Phối hợp chặt chẽ giữa các quản lý xưởng để xử lý lỗi phát sinh'
        ],
        finishing: [
            '📦 Trang bị thêm bàn ủi hơi nước công nghiệp, kéo cắt chỉ và bao bì đóng gói',
            '⚡ Mở rộng không gian phân loại và đóng gói hàng hóa',
            '💰 Tăng ngân sách thưởng thúc đẩy tiến độ hoàn thiện giao hàng',
            '🚚 Hỗ trợ phương tiện luân chuyển hàng hóa sang kho thành phẩm'
        ]
    };

    function _getStoredProdCommitmentPresets() {
        const dept = _kpiProdState.department || 'cutting';
        try {
            const raw = localStorage.getItem('kpi_prod_preset_commitments_' + dept);
            if (raw) return JSON.parse(raw);
        } catch(e) {}
        return [...(DEPT_COMMITMENT_PRESETS[dept] || DEPT_COMMITMENT_PRESETS.cutting)];
    }

    function _saveStoredProdCommitmentPresets(arr) {
        const dept = _kpiProdState.department || 'cutting';
        localStorage.setItem('kpi_prod_preset_commitments_' + dept, JSON.stringify(arr));
    }

    function _getStoredProdSupportPresets() {
        const dept = _kpiProdState.department || 'cutting';
        try {
            const raw = localStorage.getItem('kpi_prod_preset_supports_' + dept);
            if (raw) return JSON.parse(raw);
        } catch(e) {}
        return [...(DEPT_SUPPORT_PRESETS[dept] || DEPT_SUPPORT_PRESETS.cutting)];
    }

    function _saveStoredProdSupportPresets(arr) {
        const dept = _kpiProdState.department || 'cutting';
        localStorage.setItem('kpi_prod_preset_supports_' + dept, JSON.stringify(arr));
    }

    window._renderKpiProdCommitmentPresetSuggestions = function() {
        const cList = document.getElementById('kpiProdCommitmentSuggestionsList');
        if (!cList) return;
        const presets = _getStoredProdCommitmentPresets();
        if (presets.length === 0) {
            cList.innerHTML = '<div style="color:#94a3b8; font-size:11.5px; text-align:center; padding:6px;">Chưa có gợi ý mẫu. Bấm "+ Thêm Gợi Ý Mới" để tạo mới.</div>';
            return;
        }
        cList.innerHTML = presets.map((txt, idx) => `
            <div style="display:flex; align-items:center; justify-content:space-between; background:#ffffff; border:1px solid #fde68a; border-radius:8px; padding:5px 9px; gap:8px;">
                <button type="button" onclick="window._addKpiProdCommitmentRow('${_escapeJs(txt)}');" style="flex:1; text-align:left; background:none; border:none; color:#78350f; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px;">
                    <span style="color:#d97706; font-weight:900;">➕</span>
                    <span>${_escapeHtml(txt)}</span>
                </button>
                <div style="display:flex; align-items:center; gap:4px;">
                    <button type="button" onclick="window._editKpiProdCommitmentPreset(${idx});" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; border-radius:5px; padding:2px 6px; font-size:11px; font-weight:700; cursor:pointer;" title="Chỉnh sửa câu gợi ý">✏️ Sửa</button>
                    <button type="button" onclick="window._deleteKpiProdCommitmentPreset(${idx});" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; border-radius:5px; padding:2px 6px; font-size:11px; font-weight:700; cursor:pointer;" title="Xóa câu gợi ý">🗑️ Xóa</button>
                </div>
            </div>
        `).join('');
    };

    window._renderKpiProdSupportPresetSuggestions = function() {
        const sList = document.getElementById('kpiProdSupportSuggestionsList');
        if (!sList) return;
        const presets = _getStoredProdSupportPresets();
        if (presets.length === 0) {
            sList.innerHTML = '<div style="color:#94a3b8; font-size:11.5px; text-align:center; padding:6px;">Chưa có gợi ý mẫu. Bấm "+ Thêm Gợi Ý Mới" để tạo mới.</div>';
            return;
        }
        sList.innerHTML = presets.map((txt, idx) => `
            <div style="display:flex; align-items:center; justify-content:space-between; background:#ffffff; border:1px solid #bae6fd; border-radius:8px; padding:5px 9px; gap:8px;">
                <button type="button" onclick="window._addKpiProdSupportRow('${_escapeJs(txt)}');" style="flex:1; text-align:left; background:none; border:none; color:#0369a1; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px;">
                    <span style="color:#0284c7; font-weight:900;">➕</span>
                    <span>${_escapeHtml(txt)}</span>
                </button>
                <div style="display:flex; align-items:center; gap:4px;">
                    <button type="button" onclick="window._editKpiProdSupportPreset(${idx});" style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; border-radius:5px; padding:2px 6px; font-size:11px; font-weight:700; cursor:pointer;" title="Chỉnh sửa câu gợi ý">✏️ Sửa</button>
                    <button type="button" onclick="window._deleteKpiProdSupportPreset(${idx});" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; border-radius:5px; padding:2px 6px; font-size:11px; font-weight:700; cursor:pointer;" title="Xóa câu gợi ý">🗑️ Xóa</button>
                </div>
            </div>
        `).join('');
    };

    window._addKpiProdCommitmentPreset = function() {
        const val = prompt('Nhập câu gợi ý cam kết mẫu mới muốn thêm vào danh sách:');
        if (!val || !val.trim()) return;
        const presets = _getStoredProdCommitmentPresets();
        presets.push(val.trim());
        _saveStoredProdCommitmentPresets(presets);
        window._renderKpiProdCommitmentPresetSuggestions();
    };

    window._editKpiProdCommitmentPreset = function(idx) {
        const presets = _getStoredProdCommitmentPresets();
        if (!presets[idx]) return;
        const val = prompt('Chỉnh sửa nội dung câu gợi ý cam kết mẫu:', presets[idx]);
        if (val === null || !val.trim()) return;
        presets[idx] = val.trim();
        _saveStoredProdCommitmentPresets(presets);
        window._renderKpiProdCommitmentPresetSuggestions();
    };

    window._deleteKpiProdCommitmentPreset = function(idx) {
        if (!confirm('Bạn có chắc chắn muốn xóa câu gợi ý cam kết mẫu này không?')) return;
        const presets = _getStoredProdCommitmentPresets();
        presets.splice(idx, 1);
        _saveStoredProdCommitmentPresets(presets);
        window._renderKpiProdCommitmentPresetSuggestions();
    };

    window._resetKpiProdCommitmentPresetsDefault = function() {
        if (!confirm('Khôi phục lại danh sách các câu gợi ý cam kết mặc định?')) return;
        const dept = _kpiProdState.department || 'cutting';
        localStorage.removeItem('kpi_prod_preset_commitments_' + dept);
        window._renderKpiProdCommitmentPresetSuggestions();
    };

    window._addKpiProdSupportPreset = function() {
        const val = prompt('Nhập câu gợi ý hỗ trợ mẫu mới muốn thêm vào danh sách:');
        if (!val || !val.trim()) return;
        const presets = _getStoredProdSupportPresets();
        presets.push(val.trim());
        _saveStoredProdSupportPresets(presets);
        window._renderKpiProdSupportPresetSuggestions();
    };

    window._editKpiProdSupportPreset = function(idx) {
        const presets = _getStoredProdSupportPresets();
        if (!presets[idx]) return;
        const val = prompt('Chỉnh sửa nội dung câu gợi ý hỗ trợ mẫu:', presets[idx]);
        if (val === null || !val.trim()) return;
        presets[idx] = val.trim();
        _saveStoredProdSupportPresets(presets);
        window._renderKpiProdSupportPresetSuggestions();
    };

    window._deleteKpiProdSupportPreset = function(idx) {
        if (!confirm('Bạn có chắc chắn muốn xóa câu gợi ý hỗ trợ mẫu này không?')) return;
        const presets = _getStoredProdSupportPresets();
        presets.splice(idx, 1);
        _saveStoredProdSupportPresets(presets);
        window._renderKpiProdSupportPresetSuggestions();
    };

    window._resetKpiProdSupportPresetsDefault = function() {
        if (!confirm('Khôi phục lại danh sách các câu gợi ý hỗ trợ mặc định?')) return;
        const dept = _kpiProdState.department || 'cutting';
        localStorage.removeItem('kpi_prod_preset_supports_' + dept);
        window._renderKpiProdSupportPresetSuggestions();
    };

    function _initKpiProdSuggestions() {
        window._renderKpiProdCommitmentPresetSuggestions();
        window._renderKpiProdSupportPresetSuggestions();
    }

    window._toggleKpiProdCommitmentSuggestions = function(show) {
        const panel = document.getElementById('kpiProdCommitmentSuggestionsPanel');
        if (!panel) return;
        if (show === undefined) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        } else {
            panel.style.display = show ? 'block' : 'none';
        }
        if (panel.style.display !== 'none') {
            window._renderKpiProdCommitmentPresetSuggestions();
        }
    };

    window._toggleKpiProdSupportSuggestions = function(show) {
        const panel = document.getElementById('kpiProdSupportSuggestionsPanel');
        if (!panel) return;
        if (show === undefined) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        } else {
            panel.style.display = show ? 'block' : 'none';
        }
        if (panel.style.display !== 'none') {
            window._renderKpiProdSupportPresetSuggestions();
        }
    };

    window._saveKpiProdConfig = async function() {
        const month = parseInt(document.getElementById('kpiProdConfigMonth')?.value || '0', 10);
        const isAlreadyConfigured = _isMonthConfigured(month);
        const canReconfigure = _canEditReconfiguration();

        if (isAlreadyConfigured && !canReconfigure) {
            alert('🔒 Cấu hình thời gian này đã được thiết lập! Chỉ Giám Đốc và Quản Lý Cấp Cao (Lê Việt Trình) mới có quyền chỉnh sửa lại cấu hình.');
            return;
        }

        const rewardText = document.getElementById('kpiProdConfigReward')?.value || '';
        const evalRuleEl = document.querySelector('input[name="kpiProdEvalRule"]:checked');
        const evalRule = evalRuleEl ? evalRuleEl.value : 'ALL';

        const commitmentInputs = document.querySelectorAll('.kpi-prod-commitment-input');
        const commitments = Array.from(commitmentInputs).map(inp => inp.value.trim()).filter(Boolean);
        const supportInputs = document.querySelectorAll('.kpi-prod-support-input');
        const supports = Array.from(supportInputs).map(inp => inp.value.trim()).filter(Boolean);

        const authHeader = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') };

        try {
            if (month === 0) {
                // === YEAR MODE: Save TOTAL dept config + quarters + 12 months ===
                const { yearTargetTotal, yearTotalErrors, avgDeptRate } = _getKpiProdYearTotals();

                if (yearTargetTotal <= 0) {
                    alert('⚠️ Vui lòng nhập KPI Target TỔNG Bộ Phận lớn hơn 0!');
                    return;
                }

                // Validate: Sum of 4 quarters must equal year total
                const q1P = parseInt(String(document.getElementById('kpiProdQ1Products')?.value || '').replace(/\D/g, '') || '0', 10);
                const q2P = parseInt(String(document.getElementById('kpiProdQ2Products')?.value || '').replace(/\D/g, '') || '0', 10);
                const q3P = parseInt(String(document.getElementById('kpiProdQ3Products')?.value || '').replace(/\D/g, '') || '0', 10);
                const q4P = parseInt(String(document.getElementById('kpiProdQ4Products')?.value || '').replace(/\D/g, '') || '0', 10);
                const totalQP = q1P + q2P + q3P + q4P;
                if (totalQP !== yearTargetTotal) {
                    alert(`⚠️ Tổng KPI 4 Quý (${_kpiProdFmt(totalQP)} SP) ≠ KPI Năm (${_kpiProdFmt(yearTargetTotal)} SP)!\n\nVui lòng chỉnh sửa Bước 2 sao cho Tổng 4 Quý = Năm.`);
                    return;
                }

                // Validate: Sum of 12 months must equal year total
                const mRows = document.querySelectorAll('#kpiProdModal12MonthsTableList tr[data-month]');
                let totalMP = 0;
                mRows.forEach(r => {
                    totalMP += parseInt(String(r.querySelector('.kpi-prod-m-target-products')?.value || '').replace(/\D/g, '') || '0', 10);
                });
                if (totalMP !== yearTargetTotal) {
                    alert(`⚠️ Tổng KPI 12 Tháng (${_kpiProdFmt(totalMP)} SP) ≠ KPI Năm (${_kpiProdFmt(yearTargetTotal)} SP)!\n\nVui lòng chỉnh sửa Bước 3 sao cho Tổng 12 Tháng = Năm.`);
                    return;
                }

                // 1. Save Year (month=0) dept config with TOTAL values
                await fetch('/api/kpi-production/config', {
                    method: 'POST',
                    headers: authHeader,
                    body: JSON.stringify({
                        year: _kpiProdState.year,
                        month: 0,
                        department: _kpiProdState.department,
                        target_products: yearTargetTotal,
                        target_errors: yearTotalErrors,
                        target_rate: avgDeptRate,
                        eval_rule: evalRule,
                        reward_text: rewardText,
                        commitments: commitments,
                        supports: supports,
                        apply_to_all_staff: false
                    })
                });

                // 2. Save 4 Quarters (month=101..104)
                const qConfigs = [
                    { month: 101, products: parseInt(String(document.getElementById('kpiProdQ1Products')?.value || '').replace(/\D/g, '') || '0', 10), errors: parseInt(document.getElementById('kpiProdQ1Errors')?.value || '0', 10), rate: parseFloat(String(document.getElementById('kpiProdQ1Rate')?.value || '0').replace(',', '.')) || 0 },
                    { month: 102, products: parseInt(String(document.getElementById('kpiProdQ2Products')?.value || '').replace(/\D/g, '') || '0', 10), errors: parseInt(document.getElementById('kpiProdQ2Errors')?.value || '0', 10), rate: parseFloat(String(document.getElementById('kpiProdQ2Rate')?.value || '0').replace(',', '.')) || 0 },
                    { month: 103, products: parseInt(String(document.getElementById('kpiProdQ3Products')?.value || '').replace(/\D/g, '') || '0', 10), errors: parseInt(document.getElementById('kpiProdQ3Errors')?.value || '0', 10), rate: parseFloat(String(document.getElementById('kpiProdQ3Rate')?.value || '0').replace(',', '.')) || 0 },
                    { month: 104, products: parseInt(String(document.getElementById('kpiProdQ4Products')?.value || '').replace(/\D/g, '') || '0', 10), errors: parseInt(document.getElementById('kpiProdQ4Errors')?.value || '0', 10), rate: parseFloat(String(document.getElementById('kpiProdQ4Rate')?.value || '0').replace(',', '.')) || 0 }
                ];

                for (const qc of qConfigs) {
                    if (qc.products > 0 || qc.errors > 0 || qc.rate > 0) {
                        await fetch('/api/kpi-production/config', {
                            method: 'POST',
                            headers: authHeader,
                            body: JSON.stringify({
                                year: _kpiProdState.year,
                                month: qc.month,
                                department: _kpiProdState.department,
                                target_products: qc.products,
                                target_errors: qc.errors,
                                target_rate: qc.rate,
                                eval_rule: evalRule,
                                commitments: commitments,
                                supports: supports
                            })
                        });
                    }
                }

                // 3. Save 12 Months (month=1..12) dept configs ONLY (no per-team targets)
                const mTableRows = document.querySelectorAll('#kpiProdModal12MonthsTableList tr[data-month]');
                for (const tr of Array.from(mTableRows)) {
                    const mVal = parseInt(tr.dataset.month, 10);
                    if (!mVal) continue;
                    const mP = parseInt(String(tr.querySelector('.kpi-prod-m-target-products')?.value || '').replace(/\D/g, '') || '0', 10);
                    const mE = parseInt(tr.querySelector('.kpi-prod-m-target-errors')?.value || '0', 10);
                    const mR = parseFloat(String(tr.querySelector('.kpi-prod-m-target-rate')?.value || '0').replace(',', '.')) || 0;

                    if (mP > 0 || mE > 0 || mR > 0) {
                        await fetch('/api/kpi-production/config', {
                            method: 'POST',
                            headers: authHeader,
                            body: JSON.stringify({
                                year: _kpiProdState.year,
                                month: mVal,
                                department: _kpiProdState.department,
                                target_products: mP,
                                target_errors: mE,
                                target_rate: mR,
                                eval_rule: evalRule,
                                commitments: commitments,
                                supports: supports
                            })
                        });
                    }
                }

            } else if (month >= 1 && month <= 12) {
                // === MONTH MODE: Save per-team targets ===
                const staffRows = document.querySelectorAll('#kpiProdModalStaffTargetsList tr');
                const staffTargets = [];

                staffRows.forEach(r => {
                    const uid = parseInt(r.dataset.uid, 10);
                    if (!uid) return;
                    const pStr = String(r.querySelector('.kpi-prod-staff-m-target-products')?.value || '').replace(/\D/g, '');
                    const pVal = parseInt(pStr || '0', 10);
                    const eVal = parseInt(r.querySelector('.kpi-prod-staff-m-target-errors')?.value || '0', 10);
                    const rStr = String(r.querySelector('.kpi-prod-staff-m-target-rate')?.value || '0').replace(',', '.');
                    const rVal = parseFloat(rStr) || 0;

                    staffTargets.push({
                        user_id: uid,
                        month: month,
                        total_minutes: 0,
                        error_count: 0,
                        target_products: pVal,
                        target_errors: eVal,
                        target_rate: rVal,
                        reward_text: '',
                        notes: ''
                    });
                });

                const hasAnyTarget = staffTargets.some(t => t.target_products > 0 || t.target_errors > 0 || t.target_rate > 0);
                if (!hasAnyTarget) {
                    alert('⚠️ Vui lòng nhập chỉ tiêu KPI cho ít nhất 1 team trước khi lưu!');
                    return;
                }

                // Save per-team targets
                if (staffTargets.length > 0) {
                    await fetch('/api/kpi-production/targets', {
                        method: 'POST',
                        headers: authHeader,
                        body: JSON.stringify({
                            year: _kpiProdState.year,
                            month: month,
                            department: _kpiProdState.department,
                            targets: staffTargets
                        })
                    });
                }

                // Also save month-level dept config with commitments/supports
                // IMPORTANT: Preserve original month target from dept_configs (e.g. 1.663)
                // Do NOT overwrite with totalP (e.g. 2.100) which may include shortfall compensation
                const deptConfigs = _kpiProdState.data?.dept_configs || {};
                const existingMonthCfg = deptConfigs[month] || {};
                const originalMonthTargetP = existingMonthCfg.target_products || 0;
                const originalMonthTargetE = existingMonthCfg.target_errors || 0;
                const originalMonthTargetR = existingMonthCfg.target_rate || 0;

                // Preserve existing commitments/supports if form inputs are empty
                const existingCommitments = Array.isArray(existingMonthCfg.commitments) ? existingMonthCfg.commitments : [];
                const existingSupports = Array.isArray(existingMonthCfg.supports) ? existingMonthCfg.supports : [];
                const existingEvalRule = existingMonthCfg.eval_rule || 'ALL';
                const existingRewardText = existingMonthCfg.reward_text || '';
                const finalCommitments = commitments.length > 0 ? commitments : existingCommitments;
                const finalSupports = supports.length > 0 ? supports : existingSupports;
                const finalEvalRule = evalRule || existingEvalRule;
                const finalRewardText = rewardText || existingRewardText;

                await fetch('/api/kpi-production/config', {
                    method: 'POST',
                    headers: authHeader,
                    body: JSON.stringify({
                        year: _kpiProdState.year,
                        month: month,
                        department: _kpiProdState.department,
                        target_products: originalMonthTargetP,
                        target_errors: originalMonthTargetE,
                        target_rate: originalMonthTargetR,
                        eval_rule: finalEvalRule,
                        reward_text: finalRewardText,
                        commitments: finalCommitments,
                        supports: finalSupports,
                        apply_to_all_staff: false
                    })
                });
            }

            window._closeKpiProdConfigModal();
            const msg = month === 0 ? '✅ Đã lưu Cấu hình KPI Top-Down 3 Cấp thành công!' : `✅ Đã lưu Cấu hình Tháng ${month} thành công!`;
            _kpiProdShowToast(msg, '#10b981');
            await _kpiProdFetchAndRender();
        } catch(e) {
            alert('❌ Lỗi khi lưu cấu hình KPI: ' + e.message);
        }
    };

    // ========== EVALUATION MODAL LOGIC (Chuẩn Ảnh 3) ==========
    window._openKpiProdEvalModal = function(month) {
        const overlay = document.getElementById('kpiProdEvalModalOverlay');
        if (!overlay) return;

        const mData = _kpiProdState.data?.monthly_data?.[month] || {};
        const cfg = mData.config || {};
        const commitments = Array.isArray(cfg.commitments) ? cfg.commitments : [];
        const supports = Array.isArray(cfg.supports) ? cfg.supports : [];
        const commitmentEvals = Array.isArray(cfg.commitment_evals) ? cfg.commitment_evals : [];
        const supportEvals = Array.isArray(cfg.support_evals) ? cfg.support_evals : [];
        const totals = mData.totals || {};

        if (commitments.length === 0) {
            alert('⚠️ Tháng này chưa có điều cam kết nào để đánh giá! Vui lòng bấm "⚙️ Cấu Hình" để thêm điều cam kết trước.');
            return;
        }

        // Check if Phút Làm and actual data have been filled
        const staffList = Array.isArray(mData.staff_data) ? mData.staff_data : [];
        const hasMinutesData = (totals.total_minutes > 0) || staffList.some(s => Number(s.total_minutes || 0) > 0);
        
        const minInputs = document.querySelectorAll(`.kpi-prod-input[data-month="${month}"][data-field="minutes"]`);
        let domMinutesSum = 0;
        minInputs.forEach(inp => { domMinutesSum += parseFloat(inp.value || 0); });

        if (!hasMinutesData && domMinutesSum <= 0) {
            alert('⚠️ Vui lòng điền số liệu Phút Làm và Số Lỗi Thực Tế của nhân viên trước khi thực hiện đánh giá cam kết!');
            return;
        }

        const monthInp = document.getElementById('kpiProdEvalMonth');
        if (monthInp) monthInp.value = month;

        const titleEl = document.getElementById('kpiProdEvalModalTitle');
        const _evalDl = (_kpiProdDeptInfo[_kpiProdState.department] || _kpiProdDeptInfo.cutting);
        if (titleEl) titleEl.innerText = `📊 Đánh Giá Cam Kết ${_evalDl.label} — Tháng ${month}/${_kpiProdState.year}`;

        const infoEl = document.getElementById('kpiProdEvalModalHeaderInfo');
        if (infoEl) {
            infoEl.innerHTML = `
                <div style="font-size:12.5px; font-weight:800; color:#1e293b; display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                    <span>📦 ${_evalDl.productLabel}: <b>${_kpiProdFmt(totals.total_products || 0)} SP</b> | ⏱️ Tổng phút: <b>${_kpiProdFmt(totals.total_minutes || 0)} phút</b></span>
                    <span>⚠️ Tổng lỗi: <b>${_kpiProdFmt(totals.total_errors || 0)} đơn</b></span>
                </div>
            `;
        }
        // Update eval support label
        const evalSupportLabel = document.getElementById('kpiProdEvalSupportLabel');
        if (evalSupportLabel) evalSupportLabel.innerText = `🤝 Nội Dung ${_evalDl.label} Cần Công Ty Hỗ Trợ:`;

        // Render commitments
        const itemsList = document.getElementById('kpiProdEvalItemsList');
        if (itemsList) {
            itemsList.innerHTML = commitments.map((cText, idx) => {
                const existing = commitmentEvals[idx];
                const hasValue = existing && (existing.passed === true || existing.passed === false);
                const isPassed = hasValue ? existing.passed === true : null;
                const isFailed = hasValue ? existing.passed === false : null;
                const noteVal = (existing && existing.note) ? existing.note : '';

                return `
                <div class="kpi-eval-item-row" data-index="${idx}" style="background:#f8fafc; border:1.5px solid #cbd5e1; border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px;">
                    <div style="font-size:12.5px; font-weight:800; color:#0f172a;">
                        📌 <span class="eval-commitment-text">${_escapeHtml(cText)}</span>
                    </div>
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <label style="display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:800; background:${isPassed ? '#dcfce7' : '#ffffff'}; color:${isPassed ? '#15803d' : '#64748b'}; border:1.5px solid ${isPassed ? '#86efac' : '#cbd5e1'};">
                                <input type="radio" name="eval_prod_passed_${idx}" value="true" ${isPassed === true ? 'checked' : ''} onchange="window._onKpiProdEvalRadioChange(this)" style="accent-color:#16a34a;"> ✅ ĐẠT
                            </label>
                            <label style="display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:800; background:${isFailed ? '#fee2e2' : '#ffffff'}; color:${isFailed ? '#dc2626' : '#64748b'}; border:1.5px solid ${isFailed ? '#fca5a5' : '#cbd5e1'};">
                                <input type="radio" name="eval_prod_passed_${idx}" value="false" ${isFailed === true ? 'checked' : ''} onchange="window._onKpiProdEvalRadioChange(this)" style="accent-color:#dc2626;"> ❌ CHƯA ĐẠT
                            </label>
                        </div>
                        <input type="text" class="kpi-prod-eval-note-ipt" value="${_escapeHtml(noteVal)}" placeholder="Ghi chú đánh giá ngắn (tuỳ chọn)..." style="flex:1; min-width:200px; padding:6px 10px; border:1.5px solid #cbd5e1; border-radius:6px; font-size:12px; font-weight:600; outline:none; background:#ffffff;">
                    </div>
                </div>
                `;
            }).join('');
        }

        // Render supports
        const supportCountBadge = document.getElementById('kpiProdEvalSupportCountBadge');
        if (supportCountBadge) supportCountBadge.innerText = supports.length;

        const supportItemsList = document.getElementById('kpiProdEvalSupportItemsList');
        if (supportItemsList) {
            if (supports.length > 0) {
                supportItemsList.innerHTML = supports.map((sText, idx) => {
                    const existing = supportEvals[idx];
                    const hasValue = existing && (existing.passed === true || existing.passed === false);
                    const isPassed = hasValue ? existing.passed === true : null;
                    const isFailed = hasValue ? existing.passed === false : null;
                    const noteVal = (existing && existing.note) ? existing.note : '';

                    return `
                    <div class="kpi-eval-support-item-row" data-index="${idx}" style="background:#ffffff; border:1.5px solid #bae6fd; border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px;">
                        <div style="font-size:12.5px; font-weight:800; color:#0f172a;">
                            📌 <span class="eval-support-text">${_escapeHtml(sText)}</span>
                        </div>
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <label style="display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:800; background:${isPassed ? '#dcfce7' : '#ffffff'}; color:${isPassed ? '#15803d' : '#64748b'}; border:1.5px solid ${isPassed ? '#86efac' : '#cbd5e1'};">
                                    <input type="radio" name="eval_prod_support_passed_${idx}" value="true" ${isPassed === true ? 'checked' : ''} onchange="window._onKpiProdEvalRadioChange(this)" style="accent-color:#16a34a;"> ✅ ĐÃ HỖ TRỢ
                                </label>
                                <label style="display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:800; background:${isFailed ? '#fee2e2' : '#ffffff'}; color:${isFailed ? '#dc2626' : '#64748b'}; border:1.5px solid ${isFailed ? '#fca5a5' : '#cbd5e1'};">
                                    <input type="radio" name="eval_prod_support_passed_${idx}" value="false" ${isFailed === true ? 'checked' : ''} onchange="window._onKpiProdEvalRadioChange(this)" style="accent-color:#dc2626;"> ❌ CHƯA HỖ TRỢ
                                </label>
                            </div>
                            <input type="text" class="kpi-prod-eval-support-note-ipt" value="${_escapeHtml(noteVal)}" placeholder="Ghi chú phản hồi / lý do (tuỳ chọn)..." style="flex:1; min-width:200px; padding:6px 10px; border:1.5px solid #cbd5e1; border-radius:6px; font-size:12px; font-weight:600; outline:none; background:#ffffff;">
                        </div>
                    </div>
                    `;
                }).join('');
            } else {
                supportItemsList.innerHTML = '<div style="font-size:11.5px; font-style:italic; color:#94a3b8; text-align:center; padding:4px 0;">Chưa ghi nhận nội dung công ty hỗ trợ.</div>';
            }
        }

        window._updateKpiProdEvalSummary();
        overlay.style.display = 'flex';
    };

    window._closeKpiProdEvalModal = function() {
        const overlay = document.getElementById('kpiProdEvalModalOverlay');
        if (overlay) overlay.style.display = 'none';
    };

    window._onKpiProdEvalRadioChange = function(inputEl) {
        if (!inputEl) return;
        const row = inputEl.closest('.kpi-eval-item-row') || inputEl.closest('.kpi-eval-support-item-row');
        if (row) {
            const labels = row.querySelectorAll('label');
            labels.forEach(lbl => {
                const rad = lbl.querySelector('input[type="radio"]');
                if (rad && rad.checked) {
                    if (rad.value === 'true') {
                        lbl.style.background = '#dcfce7';
                        lbl.style.color = '#15803d';
                        lbl.style.borderColor = '#86efac';
                    } else {
                        lbl.style.background = '#fee2e2';
                        lbl.style.color = '#dc2626';
                        lbl.style.borderColor = '#fca5a5';
                    }
                } else {
                    lbl.style.background = '#ffffff';
                    lbl.style.color = '#64748b';
                    lbl.style.borderColor = '#cbd5e1';
                }
            });
        }
        window._updateKpiProdEvalSummary();
    };

    window._updateKpiProdEvalSummary = function() {
        const rows = document.querySelectorAll('#kpiProdEvalItemsList .kpi-eval-item-row');
        let total = rows.length;
        let selectedCount = 0;
        let passed = 0;
        rows.forEach(r => {
            const idx = r.dataset.index;
            const checked = r.querySelector(`input[name="eval_prod_passed_${idx}"]:checked`);
            if (checked) {
                selectedCount++;
                if (checked.value === 'true') passed++;
            }
        });
        const pct = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

        const sumEl = document.getElementById('kpiProdEvalProgressSummary');
        if (sumEl) {
            sumEl.innerHTML = `📊 Tỉ lệ hoàn thành: <b>${passed}/${total}</b> điều cam kết (<b>${pct}%</b>) ${selectedCount < total ? ' — <span style="color:#b91c1c;">⚠️ Chưa chọn đủ (' + (total - selectedCount) + ' mục)</span>' : ''}`;
        }
    };

    window._saveKpiProdEvalModal = async function() {
        const month = parseInt(document.getElementById('kpiProdEvalMonth')?.value || 0, 10);
        if (!month) return;

        const reviews = [];

        // Commitments
        document.querySelectorAll('#kpiProdEvalItemsList .kpi-eval-item-row').forEach(row => {
            const idx = parseInt(row.dataset.index, 10);
            const checked = row.querySelector(`input[name="eval_prod_passed_${idx}"]:checked`);
            const note = row.querySelector('.kpi-prod-eval-note-ipt')?.value?.trim() || '';
            if (checked) {
                reviews.push({
                    item_type: 'commitment',
                    item_index: idx,
                    passed: checked.value === 'true',
                    note: note
                });
            }
        });

        // Supports
        document.querySelectorAll('#kpiProdEvalSupportItemsList .kpi-eval-support-item-row').forEach(row => {
            const idx = parseInt(row.dataset.index, 10);
            const checked = row.querySelector(`input[name="eval_prod_support_passed_${idx}"]:checked`);
            const note = row.querySelector('.kpi-prod-eval-support-note-ipt')?.value?.trim() || '';
            if (checked) {
                reviews.push({
                    item_type: 'support',
                    item_index: idx,
                    passed: checked.value === 'true',
                    note: note
                });
            }
        });

        if (reviews.length === 0) {
            alert('⚠️ Vui lòng chọn kết quả đánh giá (ĐẠT / CHƯA ĐẠT) cho ít nhất 1 điều cam kết hoặc hỗ trợ!');
            return;
        }

        try {
            const resp = await fetch('/api/kpi-production/evaluations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
                },
                body: JSON.stringify({
                    year: _kpiProdState.year,
                    month: month,
                    department: _kpiProdState.department,
                    reviews: reviews
                })
            });

            if (!resp.ok) {
                const err = await resp.json();
                throw new Error(err.error || 'Lỗi khi lưu đánh giá');
            }

            window._closeKpiProdEvalModal();
            _kpiProdShowToast('✅ Đã lưu đánh giá cam kết thành công!', '#10b981');
            await _kpiProdFetchAndRender();
        } catch(e) {
            alert('❌ Lỗi khi lưu đánh giá cam kết: ' + e.message);
        }
    };

    // Expose to global
    window.renderKpisanxuathvPage = renderKpisanxuathvPage;

})();

