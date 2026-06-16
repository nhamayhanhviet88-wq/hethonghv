// ========== LỊCH RA ĐƠN HÀNG — Pages Controller ==========

(function() {
    let selectedYear = vnNow().getFullYear();
    let selectedQuarter = 'all';
    let selectedMonth = vnNow().getMonth() + 1;
    let searchQuery = '';
    let debounceTimer = null;
    let activeView = 'all';
    let cachedRows = [];
    let cachedHolidaysList = [];
    let cachedCellsMap = {};

    // Standard Vietnamese month name options
    const MONTH_LABELS = {
        1: 'Tháng 1', 2: 'Tháng 2', 3: 'Tháng 3', 4: 'Tháng 4',
        5: 'Tháng 5', 6: 'Tháng 6', 7: 'Tháng 7', 8: 'Tháng 8',
        9: 'Tháng 9', 10: 'Tháng 10', 11: 'Tháng 11', 12: 'Tháng 12'
    };

    // Department configs
    const DEPARTMENTS = [
        // { key: 'fabric', label: 'Chuẩn bị vải', emoji: '🧵', cls: 'dept-fabric' },
        { key: 'cut', label: 'Cắt', emoji: '✂️', cls: 'dept-cut' },
        { key: 'in', label: 'In', emoji: '🖨️', cls: 'dept-in' },
        { key: 'ep', label: 'Ép', emoji: '🔥', cls: 'dept-ep' },
        { key: 'may', label: 'May/QC/HT', emoji: '🪡', cls: 'dept-may' },
        { key: 'gui', label: 'Giao hàng', emoji: '🚚', cls: 'dept-gui' }
    ];

    // Priority colors for card indicators
    const PRIORITY_MAP = {
        'GẤP': { border: '#ef4444', text: '#fca5a5', bg: 'rgba(239,68,68,0.1)' },
        'GỬI': { border: '#3b82f6', text: '#93c5fd', bg: 'rgba(59,130,246,0.1)' },
        'CHUẨN': { border: '#10b981', text: '#86efac', bg: 'rgba(16,185,129,0.1)' }
    };

    window.renderLichradonhangPage = function(content) {
        content.innerHTML = `
            <div class="cal-wrap">
                <style>
                    .cal-wrap {
                        font-family: 'Inter', system-ui, -apple-system, sans-serif;
                        color: #1e293b;
                        padding: 10px 4px;
                    }
                    /* Filter Bar */
                    .cal-filter-bar {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 16px;
                        background: #ffffff;
                        border: 1px solid #e2e8f0;
                        border-radius: 16px;
                        padding: 18px 24px;
                        margin-bottom: 20px;
                        align-items: center;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
                    }
                    .cal-title-group {
                        flex: 1;
                        min-width: 200px;
                    }
                    .cal-title-group h2 {
                        margin: 0;
                        font-size: 20px;
                        font-weight: 800;
                        color: #0f172a;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .cal-title-group p {
                        margin: 4px 0 0;
                        font-size: 12px;
                        color: #475569;
                    }
                    .cal-filters-group {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 14px;
                        align-items: center;
                    }
                    .cal-filter-item {
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                    }
                    .cal-filter-item label {
                        font-size: 11px;
                        font-weight: 700;
                        color: #475569;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                    }
                    .cal-select {
                        background: #ffffff;
                        border: 1.5px solid #cbd5e1;
                        color: #1e293b;
                        padding: 10px 16px;
                        border-radius: 10px;
                        font-size: 13px;
                        font-weight: 600;
                        outline: none;
                        cursor: pointer;
                        transition: all 0.2s;
                        min-width: 110px;
                    }
                    .cal-select:focus {
                        border-color: #3b82f6;
                        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
                    }
                    .cal-search-wrapper {
                        position: relative;
                        display: flex;
                        align-items: center;
                    }
                    .cal-input {
                        background: #ffffff;
                        border: 1.5px solid #cbd5e1;
                        color: #1e293b;
                        padding: 10px 36px 10px 16px;
                        border-radius: 10px;
                        font-size: 13px;
                        font-weight: 600;
                        outline: none;
                        width: 240px;
                        transition: all 0.2s;
                    }
                    .cal-input:focus {
                        border-color: #3b82f6;
                        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
                        width: 300px;
                    }
                    .cal-search-clear {
                        position: absolute;
                        right: 12px;
                        color: #64748b;
                        font-size: 18px;
                        font-weight: bold;
                        cursor: pointer;
                        display: none;
                        user-select: none;
                    }
                    .cal-search-clear:hover {
                        color: #1e293b;
                    }

                    /* Stats Bar */
                    .cal-stats-bar {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                        gap: 12px;
                        margin-bottom: 20px;
                    }
                    .cal-stat-card {
                        background: #ffffff;
                        border: 1.5px solid #e2e8f0;
                        border-radius: 14px;
                        padding: 12px 18px;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
                        cursor: pointer;
                        transition: all 0.2s ease;
                        user-select: none;
                    }
                    .cal-stat-card:hover {
                        border-color: #cbd5e1;
                        transform: translateY(-1px);
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                    }
                    .cal-stat-icon {
                        font-size: 24px;
                        background: #f1f5f9;
                        width: 44px;
                        height: 44px;
                        border-radius: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .cal-stat-info {
                        display: flex;
                        flex-direction: column;
                    }
                    .cal-stat-num {
                        font-size: 18px;
                        font-weight: 900;
                        color: #0f172a;
                    }
                    .cal-stat-lbl {
                        font-size: 11px;
                        font-weight: 700;
                        color: #475569;
                        margin-top: 2px;
                    }
                    
                    /* Active states for each card */
                    .cal-stat-card.active.active-all {
                        border-color: #3b82f6;
                        background: #f0f9ff;
                        box-shadow: 0 4px 6px rgba(59, 130, 246, 0.08);
                    }
                    .cal-stat-card.active.active-sale {
                        border-color: #6366f1;
                        background: #eef2ff;
                        box-shadow: 0 4px 6px rgba(99, 102, 241, 0.08);
                    }
                    .cal-stat-card.active.active-fabric {
                        border-color: #d97706;
                        background: #fffbeb;
                        box-shadow: 0 4px 6px rgba(217, 119, 6, 0.08);
                    }
                    .cal-stat-card.active.active-cut {
                        border-color: #ea580c;
                        background: #fff7ed;
                        box-shadow: 0 4px 6px rgba(234, 88, 12, 0.08);
                    }
                    .cal-stat-card.active.active-in {
                        border-color: #2563eb;
                        background: #eff6ff;
                        box-shadow: 0 4px 6px rgba(37, 99, 235, 0.08);
                    }
                    .cal-stat-card.active.active-ep {
                        border-color: #9333ea;
                        background: #faf5ff;
                        box-shadow: 0 4px 6px rgba(147, 51, 234, 0.08);
                    }
                    .cal-stat-card.active.active-may {
                        border-color: #16a34a;
                        background: #f0fdf4;
                        box-shadow: 0 4px 6px rgba(22, 163, 74, 0.08);
                    }
                    .cal-stat-card.active.active-gui {
                        border-color: #475569;
                        background: #f8fafc;
                        box-shadow: 0 4px 6px rgba(71, 85, 105, 0.08);
                    }

                    /* Calendar Layout */
                    .cal-grid-container {
                        background: #ffffff;
                        border: 1px solid #cbd5e1;
                        border-radius: 16px;
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    }
                    .cal-grid-header {
                        display: grid;
                        grid-template-columns: repeat(7, 1fr);
                        background: #f1f5f9;
                        border-bottom: 1.5px solid #cbd5e1;
                        text-align: center;
                        font-weight: 800;
                        font-size: 13px;
                        color: #334155;
                    }
                    .cal-grid-header > div {
                        padding: 14px 8px;
                        border-right: 1px solid #cbd5e1;
                    }
                    .cal-grid-header > div:last-child {
                        border-right: none;
                        color: #ef4444;
                        background: rgba(239, 68, 68, 0.04);
                    }
                    
                    .cal-grid-body {
                        display: grid;
                        grid-template-columns: repeat(7, 1fr);
                        grid-auto-rows: minmax(180px, auto);
                    }
                    
                    /* Cell Styling */
                    .cal-cell {
                        border-right: 1px solid #cbd5e1;
                        border-bottom: 1px solid #cbd5e1;
                        padding: 10px;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        transition: background 0.15s;
                        position: relative;
                        background: #ffffff;
                        min-width: 0;
                    }
                    .cal-cell:nth-child(7n) {
                        border-right: none;
                        background: rgba(239, 68, 68, 0.01);
                    }
                    .cal-cell.other-month {
                        background: #f8fafc;
                        color: #94a3b8;
                    }
                    .cal-cell.other-month .cal-cell-num {
                        color: #cbd5e1;
                    }
                    .cal-cell.today {
                        box-shadow: inset 0 0 0 2px #3b82f6;
                        background: rgba(59, 130, 246, 0.02);
                    }
                    .cal-cell.holiday {
                        background: rgba(239, 68, 68, 0.03) !important;
                    }
                    
                    /* Cell Header */
                    .cal-cell-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .cal-cell-num {
                        font-size: 15px;
                        font-weight: 900;
                        color: #334155;
                    }
                    .cal-cell.today .cal-cell-num {
                        color: #2563eb;
                    }
                    .cal-cell.holiday .cal-cell-num {
                        color: #ef4444;
                    }
                    .cal-cell-holiday-name {
                        font-size: 9px;
                        font-weight: 800;
                        color: #ef4444;
                        background: rgba(239, 68, 68, 0.08);
                        padding: 2px 6px;
                        border-radius: 4px;
                        max-width: 70%;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                    
                    /* Cell Department Totals */
                    .cal-cell-depts {
                        display: flex;
                        flex-direction: column;
                        gap: 3px;
                        padding-bottom: 6px;
                        border-bottom: 1px dashed #cbd5e1;
                    }
                    .cal-dept-pill {
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        font-size: 9.5px;
                        font-weight: 700;
                        padding: 2px 6px;
                        border-radius: 6px;
                        line-height: 1.3;
                    }
                    .dept-emoji {
                        flex-shrink: 0;
                    }
                    .dept-text {
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                    /* Colors for departments */
                    .cal-dept-pill.dept-fabric { background: rgba(217, 119, 6, 0.08); color: #b45309; }
                    .cal-dept-pill.dept-cut { background: rgba(249, 115, 22, 0.08); color: #c2410c; }
                    .cal-dept-pill.dept-in { background: rgba(59, 130, 246, 0.08); color: #1d4ed8; }
                    .cal-dept-pill.dept-ep { background: rgba(168, 85, 247, 0.08); color: #7e22ce; }
                    .cal-dept-pill.dept-may { background: rgba(34, 197, 94, 0.08); color: #15803d; }
                    .cal-dept-pill.dept-gui { background: rgba(148, 163, 184, 0.1); color: #475569; }
                    .cal-dept-pill.dept-sale { background: rgba(99, 102, 241, 0.08); color: #4f46e5; }

                    /* Cell Order Cards container */
                    .cal-cell-orders {
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                        overflow-y: auto;
                        max-height: 220px;
                        padding-right: 2px;
                    }
                    /* Scrollbar custom for cards list */
                    .cal-cell-orders::-webkit-scrollbar {
                        width: 4px;
                    }
                    .cal-cell-orders::-webkit-scrollbar-thumb {
                        background: #cbd5e1;
                        border-radius: 2px;
                    }

                    /* Order Card styling */
                    .cal-order-card {
                        background: #f8fafc;
                        border: 1px solid #cbd5e1;
                        border-radius: 10px;
                        padding: 8px 10px;
                        cursor: pointer;
                        transition: all 0.15s;
                        display: flex;
                        flex-direction: column;
                        gap: 5px;
                        position: relative;
                        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
                    }
                    .cal-order-card:hover {
                        background: #ffffff;
                        border-color: #cbd5e1;
                        transform: translateY(-1px);
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    }
                    .cal-order-code {
                        font-size: 11.5px;
                        font-weight: 800;
                        color: #4f46e5;
                    }
                    .cal-order-cust {
                        font-size: 10px;
                        color: #334155;
                        font-weight: 600;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                    .cal-order-qty {
                        font-size: 10px;
                        font-weight: 800;
                        color: #b45309;
                        margin-top: 1px;
                    }
                    
                    /* Step Schedule Buttons */
                    .order-step-badges {
                        display: grid;
                        grid-template-columns: repeat(5, 1fr);
                        gap: 2px;
                        margin-top: 3px;
                    }
                    .order-step-btn {
                        border: none;
                        border-radius: 4px;
                        padding: 2.5px 0;
                        cursor: pointer;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.15s;
                        position: relative;
                        outline: none;
                    }
                    .order-step-btn.inactive {
                        background: #f1f5f9;
                        color: #94a3b8;
                        border: 0.5px solid #e2e8f0;
                    }
                    .order-step-btn.inactive:hover {
                        background: #cbd5e1;
                    }
                    .order-step-btn.inactive .step-time {
                        display: none;
                    }
                    .order-step-btn .step-emoji {
                        font-size: 9px;
                    }
                    .order-step-btn .step-time {
                        font-size: 7.5px;
                        font-weight: 800;
                        margin-top: 1px;
                        line-height: 1;
                    }
                    
                    /* Specific active buttons */
                    .order-step-btn.badge-cut.active { background: rgba(249, 115, 22, 0.1); color: #c2410c; border: 0.5px solid rgba(249, 115, 22, 0.3); }
                    .order-step-btn.badge-in.active { background: rgba(59, 130, 246, 0.1); color: #1d4ed8; border: 0.5px solid rgba(59, 130, 246, 0.3); }
                    .order-step-btn.badge-ep.active { background: rgba(168, 85, 247, 0.1); color: #7e22ce; border: 0.5px solid rgba(168, 85, 247, 0.3); }
                    .order-step-btn.badge-may.active { background: rgba(34, 197, 94, 0.1); color: #15803d; border: 0.5px solid rgba(34, 197, 94, 0.3); }
                    .order-step-btn.badge-gui.active { background: rgba(148, 163, 184, 0.1); color: #475569; border: 0.5px solid rgba(148, 163, 184, 0.3); }

                    .order-step-btn.active:hover {
                        transform: scale(1.08);
                        z-index: 2;
                    }

                    @media (max-width: 1024px) {
                        .cal-grid-header > div {
                            font-size: 11px;
                            padding: 10px 4px;
                        }
                        .cal-cell {
                            min-height: 140px;
                        }
                    }
                    @media (max-width: 768px) {
                        .cal-filter-bar {
                            padding: 12px 16px;
                            flex-direction: column;
                            align-items: stretch;
                        }
                        .cal-filters-group {
                            flex-direction: column;
                            align-items: stretch;
                        }
                        .cal-input {
                            width: 100% !important;
                        }
                        .cal-grid-body {
                            grid-template-columns: 1fr;
                        }
                        .cal-grid-header {
                            display: none;
                        }
                        .cal-cell {
                            border-right: none !important;
                            border-bottom: 1.5px solid #cbd5e1 !important;
                        }
                    }

                    /* Compact Order Strip for Calendar Day Cell */
                    .cal-order-strip {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: #f8fafc;
                        border: 1px solid #cbd5e1;
                        border-radius: 6px;
                        padding: 4px 8px;
                        cursor: default;
                        transition: all 0.15s ease;
                        font-size: 11px;
                        margin-bottom: 2px;
                        user-select: none;
                        gap: 4px;
                    }
                    .cal-order-strip:hover {
                        background: #f1f5f9;
                        border-color: #94a3b8;
                    }
                    .cal-trace-icon {
                        cursor: pointer;
                        transition: transform 0.1s ease-in-out;
                        user-select: none;
                    }
                    .cal-trace-icon:hover {
                        transform: scale(1.25);
                    }
                    .cal-order-strip .cal-order-code {
                        font-weight: 800;
                        color: #2563eb;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                    .cal-order-strip .cal-order-qty {
                        font-weight: 700;
                        color: #b45309;
                        white-space: nowrap;
                        flex-shrink: 0;
                    }
                    
                    /* More orders link button */
                    .cal-more-orders-btn {
                        font-size: 10.5px;
                        font-weight: 800;
                        color: #2563eb;
                        text-align: center;
                        padding: 4px;
                        cursor: pointer;
                        border-radius: 4px;
                        background: rgba(37, 99, 235, 0.05);
                        margin-top: 2px;
                        transition: all 0.15s;
                    }
                    .cal-more-orders-btn:hover {
                        background: rgba(37, 99, 235, 0.1);
                        text-decoration: underline;
                    }

                    /* Day Details Modal Overlay */
                    .day-modal-overlay {
                        position: fixed;
                        inset: 0;
                        background: rgba(15, 23, 42, 0.4);
                        backdrop-filter: blur(8px);
                        -webkit-backdrop-filter: blur(8px);
                        z-index: 9999;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        animation: dayModalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    }
                    @keyframes dayModalFadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    
                    /* Day Details Modal Content Card */
                    .day-modal-content {
                        background: #ffffff;
                        border-radius: 20px;
                        width: 90%;
                        max-width: 680px;
                        max-height: 85vh;
                        display: flex;
                        flex-direction: column;
                        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                        border: 1px solid #e2e8f0;
                        animation: dayModalSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                        overflow: hidden;
                    }
                    @keyframes dayModalSlideUp {
                        from { opacity: 0; transform: translateY(12px) scale(0.98); }
                        to { opacity: 1; transform: translateY(0) scale(1); }
                    }

                    .day-modal-header {
                        padding: 18px 24px;
                        border-bottom: 1px solid #f1f5f9;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .day-modal-title {
                        font-size: 17px;
                        font-weight: 900;
                        color: #0f172a;
                        margin: 0;
                    }
                    .day-modal-close {
                        background: none;
                        border: none;
                        font-size: 20px;
                        font-weight: 800;
                        color: #64748b;
                        cursor: pointer;
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.15s;
                    }
                    .day-modal-close:hover {
                        background: #f1f5f9;
                        color: #0f172a;
                    }
                    
                    .day-modal-summary {
                        background: #f8fafc;
                        padding: 12px 24px;
                        border-bottom: 1px solid #f1f5f9;
                        font-size: 11px;
                        font-weight: 700;
                        color: #475569;
                        display: flex;
                        flex-wrap: wrap;
                        gap: 12px;
                    }
                    
                    .day-modal-search-wrapper {
                        padding: 12px 24px;
                        border-bottom: 1px solid #f1f5f9;
                    }
                    .day-modal-search {
                        width: 100%;
                        border: 1.5px solid #cbd5e1;
                        border-radius: 10px;
                        padding: 8px 14px;
                        font-size: 12.5px;
                        font-weight: 600;
                        outline: none;
                        transition: all 0.15s;
                    }
                    .day-modal-search:focus {
                        border-color: #3b82f6;
                        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                    }
                    
                    .day-modal-body {
                        padding: 16px 24px;
                        overflow-y: auto;
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }
                    
                    .day-modal-footer {
                        padding: 14px 24px;
                        border-top: 1px solid #f1f5f9;
                        display: flex;
                        justify-content: flex-end;
                        background: #f8fafc;
                    }
                    .day-modal-btn {
                        padding: 8px 20px;
                        border-radius: 10px;
                        font-size: 12.5px;
                        font-weight: 800;
                        cursor: pointer;
                        transition: all 0.15s;
                        border: 1px solid #cbd5e1;
                        background: #ffffff;
                        color: #334155;
                    }
                    .day-modal-btn:hover {
                        background: #f1f5f9;
                        border-color: #cbd5e1;
                    }
                </style>

                <div class="cal-filter-bar">
                    <div class="cal-title-group">
                        <h2>📅 Lịch Ra Đơn Hàng</h2>
                        <p>Theo dõi ngày gửi dự kiến và tổng hợp năng suất xưởng</p>
                    </div>
                    <div class="cal-filters-group">
                        <div class="cal-filter-item">
                            <label>Năm</label>
                            <select class="cal-select" id="calYearSelect"></select>
                        </div>
                        <div class="cal-filter-item">
                            <label>Quý</label>
                            <select class="cal-select" id="calQuarterSelect">
                                <option value="all">Tất cả Quý</option>
                                <option value="1">Quý 1 (T1-T3)</option>
                                <option value="2">Quý 2 (T4-T6)</option>
                                <option value="3">Quý 3 (T7-T9)</option>
                                <option value="4">Quý 4 (T10-T12)</option>
                            </select>
                        </div>
                        <div class="cal-filter-item">
                            <label>Tháng</label>
                            <select class="cal-select" id="calMonthSelect"></select>
                        </div>
                        <div class="cal-filter-item">
                            <label>Tìm kiếm đơn</label>
                            <div class="cal-search-wrapper">
                                <input type="text" class="cal-input" id="calSearchInput" placeholder="Mã đơn, tên KH, sản phẩm..." autocomplete="off">
                                <span class="cal-search-clear" id="calSearchClearBtn">&times;</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="cal-stats-bar" id="calStatsContainer">
                    <!-- Dynamic stats cards -->
                </div>

                <div class="cal-grid-container">
                    <div class="cal-grid-header">
                        <div>Thứ Hai</div>
                        <div>Thứ Ba</div>
                        <div>Thứ Tư</div>
                        <div>Thứ Năm</div>
                        <div>Thứ Sáu</div>
                        <div>Thứ Bảy</div>
                        <div>Chủ Nhật</div>
                    </div>
                    <div class="cal-grid-body" id="calGridBody">
                        <!-- Dynamic cells -->
                    </div>
                </div>
            </div>
        `;

        initYearSelect();
        initQuarterSelect();
        initMonthSelect();
        initSearchInput();

        loadCalendarData();
    };

    function initYearSelect() {
        const select = document.getElementById('calYearSelect');
        if (!select) return;
        select.innerHTML = '';
        const currentYear = new Date().getFullYear();
        for (let y = currentYear; y >= currentYear - 3; y--) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            if (y === selectedYear) opt.selected = true;
            select.appendChild(opt);
        }
        select.onchange = function() {
            selectedYear = Number(this.value);
            loadCalendarData();
        };
    }

    function initQuarterSelect() {
        const select = document.getElementById('calQuarterSelect');
        if (!select) return;
        select.value = selectedQuarter;
        select.onchange = function() {
            selectedQuarter = this.value;
            syncMonthDropdownOptions();
            loadCalendarData();
        };
    }

    function initMonthSelect() {
        syncMonthDropdownOptions();
    }

    function syncMonthDropdownOptions() {
        const select = document.getElementById('calMonthSelect');
        if (!select) return;
        select.innerHTML = '';

        let months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        if (selectedQuarter === '1') months = [1, 2, 3];
        else if (selectedQuarter === '2') months = [4, 5, 6];
        else if (selectedQuarter === '3') months = [7, 8, 9];
        else if (selectedQuarter === '4') months = [10, 11, 12];

        // If currently selected month is not in the allowed list, auto-choose first allowed
        if (!months.includes(selectedMonth)) {
            selectedMonth = months[0];
        }

        months.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = MONTH_LABELS[m];
            if (m === selectedMonth) opt.selected = true;
            select.appendChild(opt);
        });

        select.onchange = function() {
            selectedMonth = Number(this.value);
            loadCalendarData();
        };
    }

    function initSearchInput() {
        const input = document.getElementById('calSearchInput');
        const clearBtn = document.getElementById('calSearchClearBtn');
        if (!input || !clearBtn) return;

        input.value = searchQuery;
        clearBtn.style.display = searchQuery ? 'block' : 'none';

        input.oninput = function() {
            searchQuery = this.value;
            clearBtn.style.display = searchQuery ? 'block' : 'none';
            
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                loadCalendarData();
            }, 300);
        };

        clearBtn.onclick = function() {
            searchQuery = '';
            input.value = '';
            this.style.display = 'none';
            loadCalendarData();
        };
    }

    async function loadCalendarData() {
        const gridBody = document.getElementById('calGridBody');
        const statsBar = document.getElementById('calStatsContainer');
        if (!gridBody) return;

        gridBody.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 60px; color: #64748b; font-size: 14px; font-weight: 600;">⏳ Đang tải dữ liệu lịch...</div>`;
        if (statsBar) {
            statsBar.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 10px; color: #64748b; font-size: 11px;">Đang tính toán số liệu...</div>`;
        }

        try {
            const params = new URLSearchParams({
                year: selectedYear,
                month: selectedMonth
            });
            if (searchQuery.trim()) {
                params.set('search', searchQuery.trim());
            }

            const res = await apiCall('/api/qlx/order-calendar?' + params.toString());
            if (!res.success) {
                throw new Error(res.error || 'Server error');
            }

            cachedRows = res.orders || [];
            cachedHolidaysList = res.holidays || [];
            renderCalendar(cachedRows, cachedHolidaysList);
        } catch (e) {
            console.error('Calendar load error:', e);
            gridBody.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 60px; color: #ef4444; font-size: 14px; font-weight: 700;">❌ Không thể tải dữ liệu lịch ra đơn. Vui lòng thử lại.</div>`;
        }
    }

    function getFabricPrepDateStr(createdTimeStr, holidaysMap) {
        if (!createdTimeStr) return null;
        const createdDate = new Date(createdTimeStr);
        if (isNaN(createdDate.getTime())) return null;

        let localYear = createdDate.getFullYear();
        let localMonth = createdDate.getMonth() + 1;
        let localDay = createdDate.getDate();

        try {
            const vnStr = createdDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
            const parts = vnStr.split('-').map(Number);
            localYear = parts[0];
            localMonth = parts[1];
            localDay = parts[2];
        } catch(e) {}

        const date = new Date(localYear, localMonth - 1, localDay);
        date.setDate(date.getDate() + 1);

        const checkSundayOrHoliday = (dt) => {
            if (dt.getDay() === 0) return true;
            const y = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, '0');
            const d = String(dt.getDate()).padStart(2, '0');
            const ds = `${y}-${m}-${d}`;
            return !!holidaysMap[ds];
        };

        let safety = 0;
        while (checkSundayOrHoliday(date) && safety < 30) {
            date.setDate(date.getDate() + 1);
            safety++;
        }

        const resY = date.getFullYear();
        const resM = String(date.getMonth() + 1).padStart(2, '0');
        const resD = String(date.getDate()).padStart(2, '0');
        return `${resY}-${resM}-${resD}`;
    }

    function buildOrdersMap(rows) {
        const ordersMap = {};
        rows.forEach(row => {
            if (!ordersMap[row.order_id]) {
                ordersMap[row.order_id] = {
                    id: row.order_id,
                    order_code: row.order_code,
                    customer_name: row.customer_name,
                    expected_ship_date: row.expected_ship_date,
                    shipping_priority: row.shipping_priority,
                    cskh_name: row.cskh_name,
                    order_created_at: row.order_created_at,
                    items: []
                };
            }
            if (row.item_id) {
                ordersMap[row.order_id].items.push({
                    id: row.item_id,
                    product_name: row.product_name,
                    item_desc: row.item_desc,
                    quantity: row.item_quantity,
                    cutting_category_name: row.cutting_category_name || 'Áo',
                    cut_expected_at: row.cut_expected_at,
                    in_expected_at: row.in_expected_at,
                    ep_expected_at: row.ep_expected_at,
                    may_qc_ht_expected_at: row.may_qc_ht_expected_at,
                    gui_expected_at: row.gui_expected_at
                });
            }
        });
        Object.values(ordersMap).forEach(order => {
            order.items.sort((a, b) => a.id - b.id);
        });
        return ordersMap;
    }

    function renderCalendar(rows, holidaysList) {
        const holidaysMap = {};
        holidaysList.forEach(h => {
            if (h.holiday_date) {
                const dateStr = h.holiday_date.split('T')[0];
                holidaysMap[dateStr] = h.name;
            }
        });

        const ordersMap = buildOrdersMap(rows);

        let totalMonthlyQty = 0;
        const monthlyDeptTotals = { fabric: 0, cut: 0, in: 0, ep: 0, may: 0, gui: 0 };

        rows.forEach(row => {
            if (!row.item_id) return;
            const qty = Number(row.item_quantity) || 0;
            totalMonthlyQty += qty;

            const addMonthlyTotal = (dateField, deptKey) => {
                if (row[dateField]) {
                    const schedDate = new Date(row[dateField]);
                    if (schedDate.getFullYear() === selectedYear && (schedDate.getMonth() + 1) === selectedMonth) {
                        monthlyDeptTotals[deptKey] += qty;
                    }
                }
            };

            addMonthlyTotal('cut_expected_at', 'cut');
            addMonthlyTotal('in_expected_at', 'in');
            addMonthlyTotal('ep_expected_at', 'ep');
            addMonthlyTotal('may_qc_ht_expected_at', 'may');
            addMonthlyTotal('gui_expected_at', 'gui');
        });

        Object.values(ordersMap).forEach(order => {
            const prepDateStr = getFabricPrepDateStr(order.order_created_at, holidaysMap);
            if (prepDateStr) {
                const [y, m, d] = prepDateStr.split('-').map(Number);
                if (y === selectedYear && m === selectedMonth) {
                    order.items.forEach(item => {
                        monthlyDeptTotals.fabric += (Number(item.quantity) || 0);
                    });
                }
            }
        });

        renderStatsBar(Object.keys(ordersMap).length, totalMonthlyQty, monthlyDeptTotals);
        renderCalendarGridOnly(ordersMap, holidaysMap, holidaysList);
    }

    function renderCalendarGridOnly(ordersMap, holidaysMap, holidaysList) {
        const gridBody = document.getElementById('calGridBody');
        if (!gridBody) return;
        gridBody.innerHTML = '';

        const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
        const startDayIndex = firstDay.getDay();
        const paddingDays = startDayIndex === 0 ? 6 : startDayIndex - 1;

        const totalDaysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
        const totalCells = Math.ceil((paddingDays + totalDaysInMonth) / 7) * 7;

        const cells = [];
        const todayStr = vnDateStr(vnNow());

        const prevMonthLastDate = new Date(selectedYear, selectedMonth - 1, 0).getDate();
        for (let i = paddingDays - 1; i >= 0; i--) {
            const d = new Date(selectedYear, selectedMonth - 2, prevMonthLastDate - i);
            cells.push({
                date: d,
                dateStr: d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }),
                isCurrentMonth: false
            });
        }

        for (let i = 1; i <= totalDaysInMonth; i++) {
            const d = new Date(selectedYear, selectedMonth - 1, i);
            cells.push({
                date: d,
                dateStr: d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }),
                isCurrentMonth: true
            });
        }

        const remainingCells = totalCells - cells.length;
        for (let i = 1; i <= remainingCells; i++) {
            const d = new Date(selectedYear, selectedMonth, i);
            cells.push({
                date: d,
                dateStr: d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }),
                isCurrentMonth: false
            });
        }

        const cellsMap = {};
        cells.forEach(cell => {
            cellsMap[cell.dateStr] = {
                ...cell,
                orders: [],
                deptTotals: {
                    fabric: {},
                    cut: {},
                    in: {},
                    ep: {},
                    may: {},
                    gui: {},
                    sale: {}
                }
            };
        });

        Object.values(ordersMap).forEach(order => {
            if (activeView === 'all' || activeView === 'sale') {
                if (order.expected_ship_date) {
                    const dateStr = order.expected_ship_date.split('T')[0];
                    if (cellsMap[dateStr]) {
                        cellsMap[dateStr].orders.push({
                            ...order,
                            displayCode: order.order_code,
                            customQtyText: null
                        });
                    }
                }
            } else if (activeView === 'fabric') {
                const prepDateStr = getFabricPrepDateStr(order.order_created_at, holidaysMap);
                if (prepDateStr && cellsMap[prepDateStr]) {
                    const qtyMap = {};
                    order.items.forEach(item => {
                        const cat = item.cutting_category_name || 'Áo';
                        qtyMap[cat] = (qtyMap[cat] || 0) + (Number(item.quantity) || 0);
                    });
                    const qtyParts = Object.entries(qtyMap).map(([cat, qty]) => `${qty} ${cat}`);
                    cellsMap[prepDateStr].orders.push({
                        ...order,
                        displayCode: order.order_code,
                        customQtyText: qtyParts.join(', ')
                    });
                }
            } else {
                const deptDateKeyMap = {
                    cut: 'cut_expected_at',
                    in: 'in_expected_at',
                    ep: 'ep_expected_at',
                    may: 'may_qc_ht_expected_at',
                    gui: 'gui_expected_at'
                };
                const dateKey = deptDateKeyMap[activeView];
                if (!dateKey) return;

                const datesSet = new Set();
                order.items.forEach(item => {
                    if (item[dateKey]) {
                        datesSet.add(item[dateKey].split('T')[0]);
                    }
                });

                datesSet.forEach(dateStr => {
                    if (cellsMap[dateStr]) {
                        const qtyMap = {};
                        const scheduledPhieuNumbers = [];

                        order.items.forEach((item, index) => {
                            if (item[dateKey] && item[dateKey].split('T')[0] === dateStr) {
                                const cat = item.cutting_category_name || 'Áo';
                                qtyMap[cat] = (qtyMap[cat] || 0) + (Number(item.quantity) || 0);
                                scheduledPhieuNumbers.push(index + 1);
                            }
                        });

                        const qtyParts = Object.entries(qtyMap).map(([cat, qty]) => `${qty} ${cat}`);
                        let displayCode = order.order_code;
                        if (scheduledPhieuNumbers.length > 0) {
                            displayCode += ' — Phiếu ' + scheduledPhieuNumbers.join(', ');
                        }

                        cellsMap[dateStr].orders.push({
                            ...order,
                            displayCode: displayCode,
                            customQtyText: qtyParts.join(', ')
                        });
                    }
                });
            }
        });

        cells.forEach(cell => {
            const dataCell = cellsMap[cell.dateStr];
            dataCell.orders.forEach(order => {
                // Populate sale totals for the orders in this cell
                order.items.forEach(item => {
                    const qty = Number(item.quantity) || 0;
                    const cat = item.cutting_category_name || 'Áo';
                    dataCell.deptTotals.sale[cat] = (dataCell.deptTotals.sale[cat] || 0) + qty;
                });

                if (activeView === 'all') {
                    order.items.forEach(item => {
                        const qty = Number(item.quantity) || 0;
                        const cat = item.cutting_category_name || 'Áo';
                        if (item.cut_expected_at && item.cut_expected_at.split('T')[0] === cell.dateStr) {
                            dataCell.deptTotals.cut[cat] = (dataCell.deptTotals.cut[cat] || 0) + qty;
                        }
                        if (item.in_expected_at && item.in_expected_at.split('T')[0] === cell.dateStr) {
                            dataCell.deptTotals.in[cat] = (dataCell.deptTotals.in[cat] || 0) + qty;
                        }
                        if (item.ep_expected_at && item.ep_expected_at.split('T')[0] === cell.dateStr) {
                            dataCell.deptTotals.ep[cat] = (dataCell.deptTotals.ep[cat] || 0) + qty;
                        }
                        if (item.may_qc_ht_expected_at && item.may_qc_ht_expected_at.split('T')[0] === cell.dateStr) {
                            dataCell.deptTotals.may[cat] = (dataCell.deptTotals.may[cat] || 0) + qty;
                        }
                        if (item.gui_expected_at && item.gui_expected_at.split('T')[0] === cell.dateStr) {
                            dataCell.deptTotals.gui[cat] = (dataCell.deptTotals.gui[cat] || 0) + qty;
                        }
                    });
                    const prepDateStr = getFabricPrepDateStr(order.order_created_at, holidaysMap);
                    if (prepDateStr === cell.dateStr) {
                        order.items.forEach(item => {
                            const qty = Number(item.quantity) || 0;
                            const cat = item.cutting_category_name || 'Áo';
                            dataCell.deptTotals.fabric[cat] = (dataCell.deptTotals.fabric[cat] || 0) + qty;
                        });
                    }
                } else if (activeView === 'sale') {
                    order.items.forEach(item => {
                        const qty = Number(item.quantity) || 0;
                        const cat = item.cutting_category_name || 'Áo';
                        dataCell.deptTotals.sale[cat] = (dataCell.deptTotals.sale[cat] || 0) + qty;
                    });
                } else if (activeView === 'fabric') {
                    order.items.forEach(item => {
                        const qty = Number(item.quantity) || 0;
                        const cat = item.cutting_category_name || 'Áo';
                        dataCell.deptTotals.fabric[cat] = (dataCell.deptTotals.fabric[cat] || 0) + qty;
                    });
                } else {
                    const deptDateKeyMap = {
                        cut: 'cut_expected_at',
                        in: 'in_expected_at',
                        ep: 'ep_expected_at',
                        may: 'may_qc_ht_expected_at',
                        gui: 'gui_expected_at'
                    };
                    const dateKey = deptDateKeyMap[activeView];
                    order.items.forEach(item => {
                        if (item[dateKey] && item[dateKey].split('T')[0] === cell.dateStr) {
                            const qty = Number(item.quantity) || 0;
                            const cat = item.cutting_category_name || 'Áo';
                            dataCell.deptTotals[activeView][cat] = (dataCell.deptTotals[activeView][cat] || 0) + qty;
                        }
                    });
                }
            });
        });

        cells.forEach(cell => {
            const dataCell = cellsMap[cell.dateStr];

            // Sort orders: CHUẨN first, then GẤP, then GỬI
            dataCell.orders.sort((a, b) => {
                const priorityWeight = (p) => {
                    const up = String(p || '').toUpperCase();
                    if (up === 'CHUẨN') return 3;
                    if (up === 'GẤP') return 2;
                    if (up === 'GỬI') return 1;
                    return 0;
                };
                return priorityWeight(b.shipping_priority) - priorityWeight(a.shipping_priority);
            });

            const isToday = cell.dateStr === todayStr;
            const holidayName = holidaysMap[cell.dateStr];

            let cellClass = 'cal-cell';
            if (!cell.isCurrentMonth) cellClass += ' other-month';
            if (isToday) cellClass += ' today';
            if (holidayName) cellClass += ' holiday';

            const holidayHtml = holidayName ? `<div class="cal-cell-holiday-name" title="${holidayName}">🎉 ${holidayName}</div>` : '';
            const deptsHtml = renderCellDepts(dataCell.deptTotals);
            const ordersHtml = renderCellOrders(dataCell.orders, cell.dateStr);

            const cellHtml = `
                <div class="${cellClass}" onclick="window.openDayDetailModal('${cell.dateStr}')" style="cursor: pointer;" title="Bấm vào khoảng trống để xem chi tiết tất cả đơn ngày này">
                    <div class="cal-cell-header">
                        <span class="cal-cell-num">${cell.date.getDate()}</span>
                        ${holidayHtml}
                    </div>
                    ${deptsHtml}
                    <div class="cal-cell-orders">
                        ${ordersHtml}
                    </div>
                </div>
            `;
            gridBody.insertAdjacentHTML('beforeend', cellHtml);
        });

        cachedCellsMap = cellsMap;
    }

    function renderStatsBar(ordersCount, totalQty, deptTotals) {
        const container = document.getElementById('calStatsContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="cal-stat-card ${activeView === 'all' ? 'active active-all' : ''}" data-view="all">
                <div class="cal-stat-icon">📊</div>
                <div class="cal-stat-info">
                    <span class="cal-stat-num">${totalQty.toLocaleString('vi-VN')}</span>
                    <span class="cal-stat-lbl">Tổng Sản Phẩm</span>
                </div>
            </div>
            <div class="cal-stat-card ${activeView === 'sale' ? 'active active-sale' : ''}" data-view="sale">
                <div class="cal-stat-icon">📅</div>
                <div class="cal-stat-info">
                    <span class="cal-stat-num">${ordersCount}</span>
                    <span class="cal-stat-lbl">Đơn ra dự kiến (Sale)</span>
                </div>
            </div>
            <div class="cal-stat-card ${activeView === 'fabric' ? 'active active-fabric' : ''}" data-view="fabric" style="display: none;">
                <div class="cal-stat-icon">🧵</div>
                <div class="cal-stat-info">
                    <span class="cal-stat-num" style="color: #b45309">${deptTotals.fabric.toLocaleString('vi-VN')}</span>
                    <span class="cal-stat-lbl">Chuẩn bị vải</span>
                </div>
            </div>
            <div class="cal-stat-card ${activeView === 'cut' ? 'active active-cut' : ''}" data-view="cut">
                <div class="cal-stat-icon">✂️</div>
                <div class="cal-stat-info">
                    <span class="cal-stat-num" style="color: #ea580c">${deptTotals.cut.toLocaleString('vi-VN')}</span>
                    <span class="cal-stat-lbl">Cắt</span>
                </div>
            </div>
            <div class="cal-stat-card ${activeView === 'in' ? 'active active-in' : ''}" data-view="in">
                <div class="cal-stat-icon">🖨️</div>
                <div class="cal-stat-info">
                    <span class="cal-stat-num" style="color: #2563eb">${deptTotals.in.toLocaleString('vi-VN')}</span>
                    <span class="cal-stat-lbl">In</span>
                </div>
            </div>
            <div class="cal-stat-card ${activeView === 'ep' ? 'active active-ep' : ''}" data-view="ep">
                <div class="cal-stat-icon">🔥</div>
                <div class="cal-stat-info">
                    <span class="cal-stat-num" style="color: #9333ea">${deptTotals.ep.toLocaleString('vi-VN')}</span>
                    <span class="cal-stat-lbl">Ép</span>
                </div>
            </div>
            <div class="cal-stat-card ${activeView === 'may' ? 'active active-may' : ''}" data-view="may">
                <div class="cal-stat-icon">🪡</div>
                <div class="cal-stat-info">
                    <span class="cal-stat-num" style="color: #16a34a">${deptTotals.may.toLocaleString('vi-VN')}</span>
                    <span class="cal-stat-lbl">May/QC/HT</span>
                </div>
            </div>
            <div class="cal-stat-card ${activeView === 'gui' ? 'active active-gui' : ''}" data-view="gui">
                <div class="cal-stat-icon">🚚</div>
                <div class="cal-stat-info">
                    <span class="cal-stat-num" style="color: #475569">${deptTotals.gui.toLocaleString('vi-VN')}</span>
                    <span class="cal-stat-lbl">Giao hàng</span>
                </div>
            </div>
        `;

        container.querySelectorAll('.cal-stat-card').forEach(card => {
            card.onclick = function() {
                const view = this.getAttribute('data-view');
                if (view && view !== activeView) {
                    activeView = view;
                    renderStatsBar(ordersCount, totalQty, deptTotals);
                    const ordersMap = buildOrdersMap(cachedRows);
                    const holidaysMap = {};
                    cachedHolidaysList.forEach(h => {
                        if (h.holiday_date) {
                            holidaysMap[h.holiday_date.split('T')[0]] = h.name;
                        }
                    });
                    renderCalendarGridOnly(ordersMap, holidaysMap, cachedHolidaysList);
                }
            };
        });
    }

    function renderCellDepts(deptTotals) {
        let html = '';
        let deptsToRender = [];
        if (activeView === 'all') {
            deptsToRender = DEPARTMENTS;
        } else {
            const d = DEPARTMENTS.find(dept => dept.key === activeView);
            if (d) {
                deptsToRender = [d];
            } else if (activeView === 'sale') {
                deptsToRender = [{ key: 'sale', label: 'Đơn giao', emoji: '📅', cls: 'dept-sale' }];
            }
        }

        deptsToRender.forEach(d => {
            const catMap = deptTotals[d.key] || {};
            const parts = [];
            Object.entries(catMap).forEach(([cat, qty]) => {
                if (qty > 0) {
                    parts.push(`${qty} ${cat}`);
                }
            });
            if (parts.length > 0) {
                let pillClass = `cal-dept-pill ${d.cls || ''}`;
                if (d.key === 'sale') {
                    pillClass += ' dept-sale';
                }
                html += `
                    <div class="${pillClass}" title="${d.label}: ${parts.join(', ')}">
                        <span class="dept-emoji">${d.emoji}</span>
                        <span class="dept-text">${parts.join(', ')}</span>
                    </div>
                `;
            }
        });
        return html ? `<div class="cal-cell-depts">${html}</div>` : '';
    }

    function renderCellOrders(orders, cellDateStr) {
        if (!orders.length) return '';
        let html = '';

        const MAX_VISIBLE = 5;
        const visibleOrders = orders.slice(0, MAX_VISIBLE);
        const remainingCount = orders.length - MAX_VISIBLE;

        visibleOrders.forEach(o => {
            let qtyText = '';
            if (o.customQtyText !== undefined && o.customQtyText !== null) {
                qtyText = o.customQtyText;
            } else {
                const qtyMap = {};
                o.items.forEach(item => {
                    const cat = item.cutting_category_name || 'Áo';
                    qtyMap[cat] = (qtyMap[cat] || 0) + (Number(item.quantity) || 0);
                });
                const qtyParts = Object.entries(qtyMap).map(([cat, qty]) => `${qty} ${cat}`);
                qtyText = qtyParts.join(', ');
            }

            const priority = (o.shipping_priority || 'CHUẨN').toUpperCase();
            const pStyle = PRIORITY_MAP[priority] || PRIORITY_MAP['CHUẨN'];

            html += `
                <div class="cal-order-strip" 
                     style="border-left: 3px solid ${pStyle.border};"
                     onclick="event.stopPropagation();"
                     title="Đơn hàng ${o.displayCode || o.order_code}">
                    <span class="cal-order-code">${o.displayCode || o.order_code}</span>
                    <span class="cal-order-qty" style="display: inline-flex; align-items: center; gap: 4px;">
                        <span class="cal-trace-icon" 
                              onclick="event.stopPropagation(); navigateToOrderTrace('${o.order_code}')" 
                              title="Nhấp để tra soát đơn hàng ${o.order_code}">🔍</span>
                        (${qtyText})
                    </span>
                </div>
            `;
        });

        if (remainingCount > 0) {
            html += `
                <div class="cal-more-orders-btn" 
                     onclick="event.stopPropagation(); window.openDayDetailModal('${cellDateStr}')"
                     title="Xem toàn bộ ${orders.length} đơn hàng của ngày này">
                    + Xem thêm ${remainingCount} đơn...
                </div>
            `;
        }

        return html;
    }

    function renderOrderStepsHtml(order) {
        const firstItem = order.items[0] || {};
        
        const steps = [
            { key: 'cut_expected_at', label: 'Cắt', labelTS: 'Cắt', emoji: '✂️', cls: 'badge-cut' },
            { key: 'in_expected_at', label: 'In', labelTS: 'In', emoji: '🖨️', cls: 'badge-in' },
            { key: 'ep_expected_at', label: 'Ép', labelTS: 'Ép', emoji: '🔥', cls: 'badge-ep' },
            { key: 'may_qc_ht_expected_at', label: 'May', labelTS: 'May', emoji: '🧵', cls: 'badge-may' },
            { key: 'gui_expected_at', label: 'Gửi', labelTS: 'Gửi Hàng', emoji: '📦', cls: 'badge-gui' }
        ];

        let html = '<div class="order-step-badges">';
        steps.forEach(s => {
            const timeVal = firstItem[s.key];
            const timeText = timeVal ? formatStepTime(timeVal) : '--';
            const hasTime = !!timeVal;
            html += `
                <button class="order-step-btn ${s.cls} ${hasTime ? 'active' : 'inactive'}" 
                        onclick="event.stopPropagation(); _tsOpenStepModal(${order.id}, '${s.labelTS}', ${firstItem.id || 'null'})"
                        title="Bấm để xem báo cáo chặng ${s.label}: ${timeVal ? vnFormat(timeVal) : 'Chưa xếp lịch'}">
                    <span class="step-emoji">${s.emoji}</span>
                    <span class="step-time">${timeText}</span>
                </button>
            `;
        });
        html += '</div>';
        return html;
    }

    function formatStepTime(isoStr) {
        if (!isoStr) return '--';
        const d = new Date(isoStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const hour = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${day}/${month} ${hour}:${min}`;
    }

    window.openDayDetailModal = function(dateStr) {
        const cellData = cachedCellsMap[dateStr];
        if (!cellData) return;

        // Remove existing modal if any
        const existing = document.getElementById('dayDetailModal');
        if (existing) existing.remove();

        const [y, m, d] = dateStr.split('-');
        const formattedDate = `${d}/${m}/${y}`;

        // Build summary counts for the day
        const summaryParts = [];
        const depts = [
            { key: 'sale', label: 'Đơn hàng dự kiến (Sale)', emoji: '📅' },
            { key: 'cut', label: 'Cắt', emoji: '✂️' },
            { key: 'in', label: 'In', emoji: '🖨️' },
            { key: 'ep', label: 'Ép', emoji: '🔥' },
            { key: 'may', label: 'May/QC/HT', emoji: '🪡' },
            { key: 'gui', label: 'Giao hàng', emoji: '🚚' }
        ];

        depts.forEach(dept => {
            const catMap = cellData.deptTotals[dept.key] || {};
            const parts = [];
            Object.entries(catMap).forEach(([cat, qty]) => {
                if (qty > 0) parts.push(`${qty} ${cat}`);
            });
            if (parts.length > 0) {
                summaryParts.push(`<span style="margin-right: 15px;">${dept.emoji} <strong>${dept.label}</strong>: ${parts.join(', ')}</span>`);
            }
        });

        const summaryHtml = summaryParts.length > 0 
            ? summaryParts.join(' | ') 
            : 'Không có sản phẩm nào được xếp lịch sản xuất cho ngày này.';

        const overlay = document.createElement('div');
        overlay.id = 'dayDetailModal';
        overlay.className = 'day-modal-overlay';
        overlay.onclick = function(e) {
            if (e.target === this) overlay.remove();
        };

        let activeFilterText = '';
        if (activeView !== 'all' && activeView !== 'sale') {
            const viewDept = depts.find(d => d.key === activeView);
            if (viewDept) {
                activeFilterText = ` (Chặng: ${viewDept.label})`;
            }
        } else if (activeView === 'sale') {
            activeFilterText = ` (Đơn ra Sale)`;
        }

        overlay.innerHTML = `
            <div class="day-modal-content">
                <div class="day-modal-header">
                    <h3 class="day-modal-title">📅 Chi tiết ngày ${formattedDate}${activeFilterText}</h3>
                    <button class="day-modal-close" onclick="document.getElementById('dayDetailModal').remove()">&times;</button>
                </div>
                <div class="day-modal-summary">
                    ${summaryHtml}
                </div>
                <div class="day-modal-search-wrapper">
                    <input type="text" id="dayModalSearchInput" class="day-modal-search" placeholder="Tìm nhanh mã đơn, tên khách hàng..." autocomplete="off">
                </div>
                <div class="day-modal-body" id="dayModalBodyList">
                    <!-- Orders will be rendered here dynamically -->
                </div>
                <div class="day-modal-footer">
                    <button class="day-modal-btn" onclick="document.getElementById('dayDetailModal').remove()">Đóng</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const searchInput = document.getElementById('dayModalSearchInput');
        const listContainer = document.getElementById('dayModalBodyList');

        function renderModalOrders(filterQuery = '') {
            listContainer.innerHTML = '';
            const query = filterQuery.toLowerCase().trim();

            const filteredOrders = cellData.orders.filter(o => {
                const codeMatch = o.order_code.toLowerCase().includes(query);
                const nameMatch = (o.customer_name || '').toLowerCase().includes(query);
                return codeMatch || nameMatch;
            });

            if (filteredOrders.length === 0) {
                listContainer.innerHTML = `<div style="text-align: center; padding: 40px; color: #94a3b8; font-size: 13px; font-weight: 600;">Không tìm thấy đơn hàng nào.</div>`;
                return;
            }

            filteredOrders.forEach(o => {
                let qtyText = '';
                if (o.customQtyText !== undefined && o.customQtyText !== null) {
                    qtyText = o.customQtyText;
                } else {
                    const qtyMap = {};
                    o.items.forEach(item => {
                        const cat = item.cutting_category_name || 'Áo';
                        qtyMap[cat] = (qtyMap[cat] || 0) + (Number(item.quantity) || 0);
                    });
                    const qtyParts = Object.entries(qtyMap).map(([cat, qty]) => `${qty} ${cat}`);
                    qtyText = qtyParts.join(', ');
                }

                const priority = (o.shipping_priority || 'CHUẨN').toUpperCase();
                const pStyle = PRIORITY_MAP[priority] || PRIORITY_MAP['CHUẨN'];

                const cardHtml = `
                    <div class="cal-order-card" style="border-left: 4px solid ${pStyle.border}; margin-bottom: 2px;" onclick="navigateToOrderTrace('${o.order_code}')">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div>
                                <span class="cal-order-code" style="font-size: 13px;">${o.displayCode || o.order_code}</span>
                                <span style="font-size: 11px; font-weight: 700; color: #475569; margin-left: 10px;">${o.customer_name || 'Không tên KH'}</span>
                            </div>
                            <span style="font-size: 11px; font-weight: 800; background: ${pStyle.border}22; color: ${pStyle.border}; padding: 2px 6px; border-radius: 4px;">${priority}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                            <span class="cal-order-qty" style="font-size: 11px; font-weight: 800;">${qtyText}</span>
                            <span style="font-size: 10.5px; font-weight: 700; color: #64748b;">CSKH: ${o.cskh_name || '--'}</span>
                        </div>
                    </div>
                `;
                listContainer.insertAdjacentHTML('beforeend', cardHtml);
            });
        }

        searchInput.oninput = function() {
            renderModalOrders(this.value);
        };

        // Focus search if many orders
        if (cellData.orders.length > 5) {
            searchInput.focus();
        }

        renderModalOrders();
    };

    window.navigateToOrderTrace = function(orderCode) {
        history.pushState(null, '', '/trasoatdonhang?search=' + encodeURIComponent(orderCode));
        if (typeof handleRoute === 'function') {
            handleRoute();
        }
    };
})();
