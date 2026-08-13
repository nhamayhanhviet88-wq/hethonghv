/* ===== MỤC TIÊU NĂM — EXECUTIVE YEARLY GOALS (SALE/KD, MARKETING, SẢN XUẤT) ===== */

(function() {
    window._mtnYear = new Date().getFullYear();
    window._mtnCategory = 'sale_kd'; // 'sale_kd', 'marketing', 'san_xuat'
    window._mtnData = {}; // month -> { target_revenue, target_orders, target_notes }

    // Format currency VND
    function formatVND(num) {
        if (!num || isNaN(num)) return '0 đ';
        return Number(num).toLocaleString('vi-VN') + ' đ';
    }

    // Format number
    function formatNum(num) {
        if (!num || isNaN(num)) return '0';
        return Number(num).toLocaleString('vi-VN');
    }

    // Render full page
    window.renderMucTieuNamPage = async function(container) {
        if (!container) return;

        var style = `<style>
            .mtn-page { background: #f8fafc; min-height: calc(100vh - 60px); padding-bottom: 50px; font-family: 'Inter', -apple-system, sans-serif; color: #1e293b; }
            .mtn-hero { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 45%, #2563eb 85%, #3b82f6 100%); padding: 28px 36px 36px; color: #fff; box-shadow: 0 10px 30px rgba(37,99,235,0.22); position: relative; overflow: hidden; }
            .mtn-hero::before { content: ''; position: absolute; top: -50%; right: -10%; width: 450px; height: 450px; background: radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%); border-radius: 50%; pointer-events: none; }
            .mtn-hero-top { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; }
            .mtn-hero-title h2 { margin: 0 0 6px; font-size: 24px; font-weight: 900; color: #fff; display: flex; align-items: center; gap: 10px; letter-spacing: -0.3px; }
            .mtn-hero-sub { font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 500; }
            
            /* Tabs */
            .mtn-tabs { display: flex; background: rgba(0,0,0,0.25); padding: 5px; border-radius: 14px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.15); gap: 4px; flex-wrap: wrap; }
            .mtn-tab-btn { padding: 10px 22px; border-radius: 10px; border: none; background: transparent; color: rgba(255,255,255,0.75); font-size: 13px; font-weight: 800; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; gap: 8px; font-family: inherit; }
            .mtn-tab-btn:hover { color: #fff; background: rgba(255,255,255,0.12); }
            .mtn-tab-btn.active { background: #fff; color: #1e3a5f; box-shadow: 0 4px 14px rgba(0,0,0,0.18); }

            /* Year & Actions Filter Bar */
            .mtn-filter-card { background: #fff; border-radius: 16px; box-shadow: 0 4px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; margin: -20px 36px 28px; padding: 16px 24px; position: relative; z-index: 10; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
            .mtn-year-select { padding: 9px 16px; border-radius: 10px; border: 1.5px solid #cbd5e1; font-size: 13px; font-weight: 800; background: #f8fafc; color: #1e293b; outline: none; cursor: pointer; transition: all 0.2s; font-family: inherit; }
            .mtn-year-select:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.15); background: #fff; }

            .mtn-btn-save { padding: 10px 24px; border-radius: 12px; border: none; background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; font-size: 13px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 16px rgba(22,163,74,0.35); transition: all 0.2s; display: flex; align-items: center; gap: 8px; font-family: inherit; }
            .mtn-btn-save:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(22,163,74,0.45); }

            /* Executive KPI Summary Cards */
            .mtn-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin: 0 36px 28px; }
            .mtn-summary-card { background: #fff; border-radius: 14px; padding: 18px 20px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04); position: relative; overflow: hidden; }
            .mtn-summary-card::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: #3b82f6; }
            .mtn-summary-card.full-year::before { background: linear-gradient(180deg, #f59e0b, #d97706); }
            .mtn-summary-card.q1::before { background: #3b82f6; }
            .mtn-summary-card.q2::before { background: #10b981; }
            .mtn-summary-card.q3::before { background: #8b5cf6; }
            .mtn-summary-card.q4::before { background: #ec4899; }
            .mtn-summary-title { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
            .mtn-summary-val { font-size: 18px; font-weight: 900; color: #0f172a; margin-bottom: 2px; }
            .mtn-summary-sub { font-size: 12px; font-weight: 700; color: #475569; }

            /* Quarters Layout */
            .mtn-container { padding: 0 36px; display: flex; flex-direction: column; gap: 28px; }
            .mtn-quarter-block { background: #fff; border-radius: 18px; border: 1.5px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.04); overflow: hidden; }
            .mtn-quarter-hdr { padding: 16px 24px; background: linear-gradient(135deg, #f8fafc, #f1f5f9); border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
            .mtn-quarter-hdr h3 { margin: 0; font-size: 16px; font-weight: 900; color: #1e293b; display: flex; align-items: center; gap: 10px; }
            .mtn-quarter-badge { font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
            .mtn-q1-badge { background: #dbeafe; color: #1e40af; }
            .mtn-q2-badge { background: #dcfce7; color: #15803d; }
            .mtn-q3-badge { background: #f3e8ff; color: #6b21a8; }
            .mtn-q4-badge { background: #fce7f3; color: #9d174d; }

            .mtn-quarter-totals { display: flex; gap: 20px; font-size: 13px; font-weight: 800; color: #334155; }
            .mtn-quarter-totals span strong { color: #2563eb; }

            /* Months Grid inside Quarter */
            .mtn-months-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 20px; }
            @media(max-width: 900px) { .mtn-months-grid { grid-template-columns: 1fr; } }
            
            .mtn-month-card { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 16px; transition: all 0.2s; }
            .mtn-month-card:hover { border-color: #93c5fd; box-shadow: 0 4px 12px rgba(59,130,246,0.1); background: #fff; }
            .mtn-month-title { font-size: 14px; font-weight: 900; color: #1e293b; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
            .mtn-month-title .m-badge { font-size: 10px; font-weight: 800; background: #e2e8f0; color: #475569; padding: 2px 8px; border-radius: 6px; }

            .mtn-field-group { margin-bottom: 10px; }
            .mtn-field-group label { display: block; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
            .mtn-input { width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; font-weight: 700; font-family: inherit; color: #0f172a; outline: none; background: #fff; transition: all 0.2s; box-sizing: border-box; }
            .mtn-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
            .mtn-textarea { width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; font-weight: 600; font-family: inherit; color: #334155; outline: none; background: #fff; transition: all 0.2s; box-sizing: border-box; resize: vertical; min-height: 52px; }
            .mtn-textarea:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
        </style>`;

        var html = style + `
        <div class="mtn-page">
            <!-- Hero Header -->
            <div class="mtn-hero">
                <div class="mtn-hero-top">
                    <div class="mtn-hero-title">
                        <h2>🎯 MỤC TIÊU NĂM BẮT BỘ SỐ KINH DOANH</h2>
                        <div class="mtn-hero-sub">Thiết lập & Theo dõi chỉ tiêu chiến lược theo 12 Tháng & 4 Quý</div>
                    </div>
                    <!-- Category Tabs -->
                    <div class="mtn-tabs">
                        <button class="mtn-tab-btn ${window._mtnCategory === 'sale_kd' ? 'active' : ''}" onclick="_mtnSwitchTab('sale_kd')">📈 Mục Tiêu Sale/KD</button>
                        <button class="mtn-tab-btn ${window._mtnCategory === 'marketing' ? 'active' : ''}" onclick="_mtnSwitchTab('marketing')">📢 Mục Tiêu Marketing</button>
                        <button class="mtn-tab-btn ${window._mtnCategory === 'san_xuat' ? 'active' : ''}" onclick="_mtnSwitchTab('san_xuat')">🏭 Mục Tiêu Sản Xuất</button>
                    </div>
                </div>
            </div>

            <!-- Filter Card -->
            <div class="mtn-filter-card">
                <div style="display:flex;align-items:center;gap:12px">
                    <span style="font-size:13px;font-weight:800;color:#475569">📅 Chọn Năm Mục Tiêu:</span>
                    <select class="mtn-year-select" id="mtnYearSelect" onchange="_mtnChangeYear(this.value)">
                        <option value="2024" ${window._mtnYear === 2024 ? 'selected' : ''}>Năm 2024</option>
                        <option value="2025" ${window._mtnYear === 2025 ? 'selected' : ''}>Năm 2025</option>
                        <option value="2026" ${window._mtnYear === 2026 ? 'selected' : ''}>Năm 2026</option>
                        <option value="2027" ${window._mtnYear === 2027 ? 'selected' : ''}>Năm 2027</option>
                    </select>
                </div>
                <button class="mtn-btn-save" onclick="_mtnSaveTargets()">
                    💾 Lưu Mục Tiêu Năm ${window._mtnYear}
                </button>
            </div>

            <!-- Executive KPI Summary -->
            <div class="mtn-summary-grid">
                <div class="mtn-summary-card full-year">
                    <div class="mtn-summary-title">🏆 TỔNG MỤC TIÊU NĂM ${window._mtnYear}</div>
                    <div class="mtn-summary-val" id="mtnSumYearRev">0 đ</div>
                    <div class="mtn-summary-sub" id="mtnSumYearOrders">0 đơn / sản lượng</div>
                </div>
                <div class="mtn-summary-card q1">
                    <div class="mtn-summary-title">📊 QUÝ 1 (THÁNG 1 - 3)</div>
                    <div class="mtn-summary-val" id="mtnSumQ1Rev">0 đ</div>
                    <div class="mtn-summary-sub" id="mtnSumQ1Orders">0 đơn / sản lượng</div>
                </div>
                <div class="mtn-summary-card q2">
                    <div class="mtn-summary-title">📊 QUÝ 2 (THÁNG 4 - 6)</div>
                    <div class="mtn-summary-val" id="mtnSumQ2Rev">0 đ</div>
                    <div class="mtn-summary-sub" id="mtnSumQ2Orders">0 đơn / sản lượng</div>
                </div>
                <div class="mtn-summary-card q3">
                    <div class="mtn-summary-title">📊 QUÝ 3 (THÁNG 7 - 9)</div>
                    <div class="mtn-summary-val" id="mtnSumQ3Rev">0 đ</div>
                    <div class="mtn-summary-sub" id="mtnSumQ3Orders">0 đơn / sản lượng</div>
                </div>
                <div class="mtn-summary-card q4">
                    <div class="mtn-summary-title">📊 QUÝ 4 (THÁNG 10 - 12)</div>
                    <div class="mtn-summary-val" id="mtnSumQ4Rev">0 đ</div>
                    <div class="mtn-summary-sub" id="mtnSumQ4Orders">0 đơn / sản lượng</div>
                </div>
            </div>

            <!-- Main Quarters Grid -->
            <div class="mtn-container" id="mtnQuartersContainer">
                <div style="text-align:center;padding:40px;color:#94a3b8;font-size:14px;font-weight:700">⏳ Đang tải dữ liệu mục tiêu năm...</div>
            </div>
        </div>`;

        container.innerHTML = html;
        await _mtnFetchAndRenderData();
    };

    // Fetch targets data from server
    async function _mtnFetchAndRenderData() {
        var container = document.getElementById('mtnQuartersContainer');
        if (!container) return;

        try {
            var res = await fetch(`/api/yearly-targets?year=${window._mtnYear}&category=${window._mtnCategory}`, { credentials: 'include' });
            var data = await res.json();
            var targets = (data && data.targets) || [];

            window._mtnData = {};
            targets.forEach(function(t) {
                window._mtnData[t.month] = t;
            });

            _mtnRenderQuartersUI(container);
            _mtnRecalculateTotals();
        } catch(e) {
            console.error('Err fetch yearly targets:', e);
            if (container) container.innerHTML = `<div style="text-align:center;color:#ef4444;font-weight:800;padding:40px">❌ Lỗi tải dữ liệu: ${e.message}</div>`;
        }
    }

    // Render Quarters and Months UI
    function _mtnRenderQuartersUI(container) {
        var quarters = [
            { id: 'q1', name: 'QUÝ 1', months: [1, 2, 3], badgeClass: 'mtn-q1-badge' },
            { id: 'q2', name: 'QUÝ 2', months: [4, 5, 6], badgeClass: 'mtn-q2-badge' },
            { id: 'q3', name: 'QUÝ 3', months: [7, 8, 9], badgeClass: 'mtn-q3-badge' },
            { id: 'q4', name: 'QUÝ 4', months: [10, 11, 12], badgeClass: 'mtn-q4-badge' }
        ];

        var categoryLabels = {
            'sale_kd': { revLabel: 'Mục tiêu Doanh số (VND)', orderLabel: 'Mục tiêu Số đơn hàng' },
            'marketing': { revLabel: 'Mục tiêu Chi phí Ads/MKT (VND)', orderLabel: 'Mục tiêu Số Lead/Đơn MKT' },
            'san_xuat': { revLabel: 'Mục tiêu Giá trị Sản xuất (VND)', orderLabel: 'Mục tiêu Sản lượng (Bộ/Áo)' }
        };
        var currentLabels = categoryLabels[window._mtnCategory] || categoryLabels['sale_kd'];

        var html = '';
        quarters.forEach(function(q) {
            html += `<div class="mtn-quarter-block">
                <div class="mtn-quarter-hdr">
                    <h3>
                        <span class="mtn-quarter-badge ${q.badgeClass}">${q.name}</span>
                        <span>Chi Tiết Chỉ Tiêu Các Tháng ${q.months.join(', ')}</span>
                    </h3>
                    <div class="mtn-quarter-totals">
                        <span>Tổng Quý Doanh số/Giá trị: <strong id="mtnQHeaderRev_${q.id}">0 đ</strong></span>
                        <span style="margin-left:14px">Số đơn/Sản lượng: <strong id="mtnQHeaderOrders_${q.id}">0</strong></span>
                    </div>
                </div>
                <div class="mtn-months-grid">`;

            q.months.forEach(function(m) {
                var mData = window._mtnData[m] || { target_revenue: 0, target_orders: 0, target_notes: '' };
                html += `
                <div class="mtn-month-card">
                    <div class="mtn-month-title">
                        <span>📅 THÁNG ${m}/${window._mtnYear}</span>
                        <span class="m-badge">T${m}</span>
                    </div>
                    <div class="mtn-field-group">
                        <label>${currentLabels.revLabel} *</label>
                        <input class="mtn-input" type="number" id="mtnRev_${m}" value="${mData.target_revenue || ''}" placeholder="Nhập số tiền..." oninput="_mtnRecalculateTotals()">
                    </div>
                    <div class="mtn-field-group">
                        <label>${currentLabels.orderLabel}</label>
                        <input class="mtn-input" type="number" id="mtnOrders_${m}" value="${mData.target_orders || ''}" placeholder="Nhập số lượng..." oninput="_mtnRecalculateTotals()">
                    </div>
                    <div class="mtn-field-group">
                        <label>📝 Ghi chú chiến lược tháng ${m}</label>
                        <textarea class="mtn-textarea" id="mtnNotes_${m}" placeholder="Nội dung kế hoạch/chỉ tiêu chi tiết...">${mData.target_notes || ''}</textarea>
                    </div>
                </div>`;
            });

            html += `</div>
            </div>`;
        });

        container.innerHTML = html;
    }

    // Real-time calculation of Quarters and Full Year totals
    window._mtnRecalculateTotals = function() {
        var quarters = [
            { id: 'q1', months: [1, 2, 3] },
            { id: 'q2', months: [4, 5, 6] },
            { id: 'q3', months: [7, 8, 9] },
            { id: 'q4', months: [10, 11, 12] }
        ];

        var totalYearRev = 0;
        var totalYearOrders = 0;

        quarters.forEach(function(q) {
            var qRev = 0;
            var qOrders = 0;

            q.months.forEach(function(m) {
                var revEl = document.getElementById('mtnRev_' + m);
                var ordEl = document.getElementById('mtnOrders_' + m);

                var revVal = revEl ? (Number(revEl.value) || 0) : 0;
                var ordVal = ordEl ? (Number(ordEl.value) || 0) : 0;

                qRev += revVal;
                qOrders += ordVal;
            });

            totalYearRev += qRev;
            totalYearOrders += qOrders;

            // Update Header Quý
            var qHdrRev = document.getElementById('mtnQHeaderRev_' + q.id);
            var qHdrOrd = document.getElementById('mtnQHeaderOrders_' + q.id);
            if (qHdrRev) qHdrRev.textContent = formatVND(qRev);
            if (qHdrOrd) qHdrOrd.textContent = formatNum(qOrders);

            // Update Executive Summary Cards
            var sumRev = document.getElementById('mtnSum' + q.id.toUpperCase() + 'Rev');
            var sumOrd = document.getElementById('mtnSum' + q.id.toUpperCase() + 'Orders');
            if (sumRev) sumRev.textContent = formatVND(qRev);
            if (sumOrd) sumOrd.textContent = formatNum(qOrders) + ' đơn / sản lượng';
        });

        // Update Full Year Executive Card
        var yrRev = document.getElementById('mtnSumYearRev');
        var yrOrd = document.getElementById('mtnSumYearOrders');
        if (yrRev) yrRev.textContent = formatVND(totalYearRev);
        if (yrOrd) yrOrd.textContent = formatNum(totalYearOrders) + ' đơn / sản lượng';
    };

    // Switch Category Tab
    window._mtnSwitchTab = function(category) {
        window._mtnCategory = category;
        var page = document.querySelector('.mtn-page');
        if (page && page.parentElement) {
            renderMucTieuNamPage(page.parentElement);
        }
    };

    // Switch Year Filter
    window._mtnChangeYear = function(year) {
        window._mtnYear = Number(year);
        var page = document.querySelector('.mtn-page');
        if (page && page.parentElement) {
            renderMucTieuNamPage(page.parentElement);
        }
    };

    // Save targets
    window._mtnSaveTargets = async function() {
        var items = [];
        for (var m = 1; m <= 12; m++) {
            var revEl = document.getElementById('mtnRev_' + m);
            var ordEl = document.getElementById('mtnOrders_' + m);
            var noteEl = document.getElementById('mtnNotes_' + m);

            items.push({
                month: m,
                target_revenue: revEl ? (Number(revEl.value) || 0) : 0,
                target_orders: ordEl ? (Number(ordEl.value) || 0) : 0,
                target_notes: noteEl ? (noteEl.value || '') : ''
            });
        }

        try {
            var res = await fetch('/api/yearly-targets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    year: window._mtnYear,
                    category: window._mtnCategory,
                    items: items
                })
            });

            var data = await res.json();
            if (res.ok && data.success) {
                alert(`✅ Đã lưu thành công Mục Tiêu Năm ${window._mtnYear} cho danh mục!`);
            } else {
                alert('❌ Lỗi lưu mục tiêu: ' + (data.error || 'Không xác định'));
            }
        } catch(e) {
            alert('❌ Lỗi kết nối máy chủ: ' + e.message);
        }
    };

})();
