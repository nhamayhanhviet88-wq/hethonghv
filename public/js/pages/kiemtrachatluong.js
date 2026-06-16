// ========== KIỂM TRA CHẤT LƯỢNG — Desktop SPA Embed ==========

var _ktclState = {
    activeTab: '4',
    originalRecords: [],
    teams: [],
    contractors: [],
    holidays: [],
    search: '',
    teamFilterVal: '',
    timeFilterVal: 'undone_past_today',
    filterMissingTech: false,
    doneDate: '',
    doneMonth: '',
    showSimulator: false,
    currentRecordId: null,
    currentPage: 1
};

// Formatter Helpers
function _ktclFormatVnDate(dStr) {
    if (!dStr) return '—';
    try {
        const parts = dStr.split('T')[0].split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    } catch(e) {
        return dStr;
    }
}

function _ktclFormatVnDateTime(dStr) {
    if (!dStr) return '—';
    try {
        const dt = new Date(dStr);
        return dt.toLocaleString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit'
        }).replace(',', '').trim();
    } catch(e) {
        return dStr;
    }
}

function _ktclGetVnTodayStr() {
    const now = new Date();
    return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function _ktclIsHolidayDate(dateStr) {
    return _ktclState.holidays.includes(dateStr);
}

// Render Page Entry Point
function renderKiemtrachatluongPage(content) {
    if (!document.getElementById('_ktclS')) {
        const st = document.createElement('style');
        st.id = '_ktclS';
        st.textContent = `
            .ktcl-page-wrapper {
                display: flex;
                flex-direction: column;
                gap: 24px;
                padding: 24px;
                background: linear-gradient(135deg, #f1f5f9 0%, #f8fafc 100%);
                min-height: calc(100vh - 80px);
                font-family: 'Inter', sans-serif;
                color: #1e293b;
                box-sizing: border-box;
            }
            .ktcl-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #e2e8f0;
                padding-bottom: 20px;
            }
            .ktcl-header-left {
                display: flex;
                align-items: center;
                gap: 16px;
            }
            .ktcl-header-icon {
                font-size: 28px;
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                color: #ffffff;
                padding: 12px;
                border-radius: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);
            }
            .ktcl-title {
                font-size: 22px;
                font-weight: 900;
                color: #0f172a;
                margin: 0;
                letter-spacing: -0.5px;
            }
            .ktcl-subtitle {
                font-size: 13.5px;
                color: #64748b;
                margin: 4px 0 0;
                font-weight: 500;
            }
            .ktcl-btn-secondary {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: #ffffff;
                border: 1.5px solid #cbd5e1;
                color: #334155;
                padding: 10px 18px;
                border-radius: 10px;
                font-weight: 700;
                font-size: 12.5px;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            }
            .ktcl-btn-secondary:hover {
                background: #f8fafc;
                border-color: #94a3b8;
                transform: translateY(-1px);
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
            }
            .ktcl-body-container {
                display: flex;
                gap: 24px;
                align-items: flex-start;
                width: 100%;
            }
            .ktcl-audit-area {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 24px;
            }
            .ktcl-kpi-grid {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 20px;
            }
            .ktcl-kpi-card {
                border-radius: 16px;
                padding: 20px;
                display: flex;
                align-items: center;
                gap: 16px;
                cursor: pointer;
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.02);
            }
            .ktcl-kpi-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%);
                pointer-events: none;
            }
            .ktcl-kpi-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 12px 20px -8px rgba(0, 0, 0, 0.15);
            }
            
            /* KPI Card Custom Color Themes */
            .ktcl-kpi-card.kpi-tab-1 {
                background: linear-gradient(135deg, #eff6ff, #dbeafe);
                border: 1.5px solid #bfdbfe;
            }
            .ktcl-kpi-card.kpi-tab-1 .ktcl-kpi-label { color: #1e40af; opacity: 0.85; }
            .ktcl-kpi-card.kpi-tab-1 .ktcl-kpi-val { color: #1e3a8a; }
            .ktcl-kpi-card.kpi-tab-1 .ktcl-kpi-icon { background: #dbeafe; color: #1d4ed8; }

            .ktcl-kpi-card.kpi-tab-2 {
                background: linear-gradient(135deg, #fffbeb, #fef3c7);
                border: 1.5px solid #fde68a;
            }
            .ktcl-kpi-card.kpi-tab-2 .ktcl-kpi-label { color: #92400e; opacity: 0.85; }
            .ktcl-kpi-card.kpi-tab-2 .ktcl-kpi-val { color: #78350f; }
            .ktcl-kpi-card.kpi-tab-2 .ktcl-kpi-icon { background: #fef3c7; color: #d97706; }

            .ktcl-kpi-card.kpi-tab-3 {
                background: linear-gradient(135deg, #fef2f2, #fee2e2);
                border: 1.5px solid #fecaca;
            }
            .ktcl-kpi-card.kpi-tab-3 .ktcl-kpi-label { color: #991b1b; opacity: 0.85; }
            .ktcl-kpi-card.kpi-tab-3 .ktcl-kpi-val { color: #7f1d1d; }
            .ktcl-kpi-card.kpi-tab-3 .ktcl-kpi-icon { background: #fee2e2; color: #dc2626; }

            .ktcl-kpi-card.kpi-tab-4 {
                background: linear-gradient(135deg, #ecfdf5, #d1fae5);
                border: 1.5px solid #a7f3d0;
            }
            .ktcl-kpi-card.kpi-tab-4 .ktcl-kpi-label { color: #065f46; opacity: 0.85; }
            .ktcl-kpi-card.kpi-tab-4 .ktcl-kpi-val { color: #064e3b; }
            .ktcl-kpi-card.kpi-tab-4 .ktcl-kpi-icon { background: #d1fae5; color: #059669; }

            .ktcl-kpi-card.kpi-tab-5 {
                background: linear-gradient(135deg, #fff5f5, #fed7d7);
                border: 1.5px solid #feb2b2;
            }
            .ktcl-kpi-card.kpi-tab-5 .ktcl-kpi-label { color: #9b2c2c; opacity: 0.85; }
            .ktcl-kpi-card.kpi-tab-5 .ktcl-kpi-val { color: #742a2a; }
            .ktcl-kpi-card.kpi-tab-5 .ktcl-kpi-icon { background: #fed7d7; color: #e53e3e; }

            /* KPI Card Active States: Opaque glowing gradients with white text */
            .ktcl-kpi-card.kpi-tab-1.active {
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                border-color: #1e40af;
                box-shadow: 0 15px 25px -5px rgba(37, 99, 235, 0.4);
            }
            .ktcl-kpi-card.kpi-tab-1.active .ktcl-kpi-label { color: rgba(255, 255, 255, 0.9); }
            .ktcl-kpi-card.kpi-tab-1.active .ktcl-kpi-val { color: #ffffff; }
            .ktcl-kpi-card.kpi-tab-1.active .ktcl-kpi-icon { background: rgba(255, 255, 255, 0.25); color: #ffffff; }

            .ktcl-kpi-card.kpi-tab-2.active {
                background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
                border-color: #92400e;
                box-shadow: 0 15px 25px -5px rgba(217, 119, 6, 0.4);
            }
            .ktcl-kpi-card.kpi-tab-2.active .ktcl-kpi-label { color: rgba(255, 255, 255, 0.9); }
            .ktcl-kpi-card.kpi-tab-2.active .ktcl-kpi-val { color: #ffffff; }
            .ktcl-kpi-card.kpi-tab-2.active .ktcl-kpi-icon { background: rgba(255, 255, 255, 0.25); color: #ffffff; }

            .ktcl-kpi-card.kpi-tab-3.active {
                background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
                border-color: #7f1d1d;
                box-shadow: 0 15px 25px -5px rgba(220, 38, 38, 0.4);
            }
            .ktcl-kpi-card.kpi-tab-3.active .ktcl-kpi-label { color: rgba(255, 255, 255, 0.9); }
            .ktcl-kpi-card.kpi-tab-3.active .ktcl-kpi-val { color: #ffffff; }
            .ktcl-kpi-card.kpi-tab-3.active .ktcl-kpi-icon { background: rgba(255, 255, 255, 0.25); color: #ffffff; }

            .ktcl-kpi-card.kpi-tab-4.active {
                background: linear-gradient(135deg, #059669 0%, #047857 100%);
                border-color: #065f46;
                box-shadow: 0 15px 25px -5px rgba(5, 150, 101, 0.4);
            }
            .ktcl-kpi-card.kpi-tab-4.active .ktcl-kpi-label { color: rgba(255, 255, 255, 0.9); }
            .ktcl-kpi-card.kpi-tab-4.active .ktcl-kpi-val { color: #ffffff; }
            .ktcl-kpi-card.kpi-tab-4.active .ktcl-kpi-icon { background: rgba(255, 255, 255, 0.25); color: #ffffff; }

            .ktcl-kpi-card.kpi-tab-5.active {
                background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);
                border-color: #9b2c2c;
                box-shadow: 0 15px 25px -5px rgba(229, 62, 62, 0.4);
            }
            .ktcl-kpi-card.kpi-tab-5.active .ktcl-kpi-label { color: rgba(255, 255, 255, 0.9); }
            .ktcl-kpi-card.kpi-tab-5.active .ktcl-kpi-val { color: #ffffff; }
            .ktcl-kpi-card.kpi-tab-5.active .ktcl-kpi-icon { background: rgba(255, 255, 255, 0.25); color: #ffffff; }

            .ktcl-kpi-icon {
                font-size: 24px;
                width: 46px;
                height: 46px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            .ktcl-kpi-info {
                display: flex;
                flex-direction: column;
            }
            .ktcl-kpi-label {
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 0.5px;
            }
            .ktcl-kpi-val {
                font-size: 22px;
                font-weight: 900;
                margin-top: 2px;
            }
            .ktcl-metrics-summary {
                display: flex;
                gap: 16px;
                flex-wrap: wrap;
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                border: 1.5px solid #cbd5e1;
                border-radius: 14px;
                padding: 16px 20px;
                font-size: 13px;
                font-weight: 600;
                color: #334155;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03);
            }
            .ktcl-metric-item {
                display: flex;
                align-items: center;
                gap: 8px;
                background: #ffffff;
                padding: 6px 14px;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 1px 2px rgba(0,0,0,0.02);
            }
            .ktcl-metric-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                box-shadow: 0 0 4px rgba(0,0,0,0.1);
            }
            .ktcl-filter-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 16px;
                flex-wrap: wrap;
                background: #ffffff;
                padding: 16px 20px;
                border-radius: 14px;
                border: 1.5px solid #e2e8f0;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03);
            }
            .ktcl-search-wrapper input {
                width: 300px;
                padding: 10px 16px;
                border: 1.5px solid #cbd5e1;
                border-radius: 10px;
                font-size: 13.5px;
                outline: none;
                background: #f8fafc;
                font-weight: 600;
                color: #1e293b;
                transition: all 0.2s;
            }
            .ktcl-search-wrapper input:focus {
                background: #ffffff;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
            }
            .ktcl-filters-group {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .ktcl-filters-group select {
                padding: 10px 16px;
                border: 1.5px solid #cbd5e1;
                border-radius: 10px;
                font-size: 13.5px;
                outline: none;
                background: #f8fafc;
                font-weight: 600;
                color: #1e293b;
                transition: all 0.2s;
                cursor: pointer;
            }
            .ktcl-filters-group select:focus {
                background: #ffffff;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
            }
            .ktcl-checkbox-wrapper {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 13px;
                font-weight: 600;
                color: #334155;
                user-select: none;
                cursor: pointer;
            }
            .ktcl-table-card {
                background: #ffffff;
                border: 1.5px solid #e2e8f0;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02);
            }
            .ktcl-table-responsive {
                overflow-x: auto;
            }
            .ktcl-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12.5px;
                text-align: left;
            }
            .ktcl-table th {
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                color: #f1f5f9;
                font-weight: 700;
                padding: 14px 16px;
                border-bottom: 3px solid #3b82f6;
                white-space: nowrap;
                letter-spacing: 0.5px;
            }
            .ktcl-table td {
                padding: 14px 16px;
                border-bottom: 1px solid #f1f5f9;
                vertical-align: middle;
            }
            .ktcl-table tr:nth-child(even) {
                background: #fdfdfd;
            }
            .ktcl-table tr:hover {
                background: #f1f5f9 !important;
                transition: background 0.15s ease-in-out;
            }
            .ktcl-btn-sm {
                padding: 5px 10px;
                font-size: 10.5px;
                font-weight: 700;
                border-radius: 6px;
                border: none;
                cursor: pointer;
                transition: all 0.15s;
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }
            .ktcl-btn-primary { background: #3b82f6; color: white; }
            .ktcl-btn-primary:hover { background: #2563eb; }
            .ktcl-btn-danger { background: #ef4444; color: white; }
            .ktcl-btn-danger:hover { background: #dc2626; }
            .ktcl-btn-success { background: #10b981; color: white; }
            .ktcl-btn-success:hover { background: #059669; }
            .ktcl-btn-info { background: #6366f1; color: white; }
            .ktcl-btn-info:hover { background: #4f46e5; }
            .ktcl-btn-warning { background: #f59e0b; color: white; }
            .ktcl-btn-warning:hover { background: #d97706; }
            .ktcl-btn-outline { background: #ffffff; border: 1px solid #cbd5e1; color: #475569; }
            .ktcl-btn-outline:hover { background: #f1f5f9; }

            /* Badges */
            .ktcl-badge {
                display: inline-flex;
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 10px;
                font-weight: 800;
                line-height: 1;
            }
            .ktcl-badge-urgent { background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; }
            .ktcl-badge-ship { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
            .ktcl-badge-normal { background: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe; }

            .ktcl-simulator-panel {
                width: 360px;
                flex-shrink: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                position: sticky;
                top: 20px;
            }
            .ktcl-phone-frame {
                width: 340px;
                height: 680px;
                background: #000;
                border-radius: 40px;
                border: 12px solid #27272a;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
                position: relative;
                overflow: hidden;
            }
            .ktcl-phone-notch {
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 140px;
                height: 20px;
                background: #27272a;
                border-radius: 0 0 14px 14px;
                z-index: 10;
            }
            .ktcl-phone-frame iframe {
                width: 100%;
                height: 100%;
                border: none;
            }
            .ktcl-simulator-label {
                margin-top: 12px;
                font-size: 11px;
                font-weight: 600;
                color: #64748b;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .ktcl-simulator-dot {
                width: 8px;
                height: 8px;
                background: #10b981;
                border-radius: 50%;
                animation: pulse 1.5s infinite;
            }
            .ktcl-qc-img-thumb {
                width: 36px;
                height: 36px;
                object-fit: cover;
                border-radius: 6px;
                border: 1px solid #cbd5e1;
                cursor: pointer;
                transition: all 0.15s;
            }
            .ktcl-qc-img-thumb:hover {
                transform: scale(1.1);
                border-color: #3b82f6;
            }
            .ktcl-timeline {
                display: flex;
                flex-direction: column;
                gap: 14px;
                position: relative;
                padding-left: 20px;
                border-left: 2px solid #e2e8f0;
                margin: 10px 0;
            }
            .ktcl-timeline-item {
                position: relative;
            }
            .ktcl-timeline-dot {
                position: absolute;
                left: -26px;
                top: 2px;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: #3b82f6;
                border: 2px solid white;
            }
            .ktcl-timeline-time {
                font-size: 10px;
                color: #94a3b8;
                font-weight: 700;
            }
            .ktcl-timeline-detail {
                font-size: 11.5px;
                color: #334155;
                margin-top: 2px;
            }
            .ktcl-timeline-user {
                font-weight: 800;
                color: #0d9488;
            }
            @media(max-width:900px){
                .ktcl-kpi-grid {
                    grid-template-columns: repeat(2, 1fr) !important;
                }
                .ktcl-body-container {
                    flex-direction: column !important;
                }
                .ktcl-simulator-panel {
                    width: 100% !important;
                    position: static !important;
                }
            }
            @media(max-width:500px){
                .ktcl-kpi-grid {
                    grid-template-columns: 1fr !important;
                }
            }
            .qlx-cl-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(15,23,42,0.6);
                backdrop-filter: blur(4px);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: qlxFadeIn .2s;
            }
            @keyframes qlxFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .qlx-cl-popup {
                background: #fff;
                border-radius: 16px;
                width: 520px;
                max-width: 95vw;
                max-height: 85vh;
                overflow-y: auto;
                box-shadow: 0 25px 50px rgba(0,0,0,0.25);
                animation: qlxSlideUp .3s;
            }
            @keyframes qlxSlideUp {
                from { transform: translateY(30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .qlx-cl-header {
                background: linear-gradient(135deg, #0f172a, #1e3a5f, #0369a1);
                color: #fff;
                padding: 20px 24px;
                border-radius: 16px 16px 0 0;
            }
            .qlx-cl-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 800;
                letter-spacing: 0.5px;
            }
            .qlx-cl-header p {
                margin: 4px 0 0;
                font-size: 11px;
                opacity: 0.8;
            }

            /* QC detail premium styles */
            .ktcl-qc-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                max-height: 70vh;
                overflow-y: auto;
                padding: 24px;
                background: #f8fafc;
            }
            @media (max-width: 820px) {
                .ktcl-qc-grid {
                    grid-template-columns: 1fr;
                }
            }
            .qc-section-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 16px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            }
            .qc-section-title {
                font-size: 11px;
                font-weight: 800;
                color: #4f46e5;
                letter-spacing: 0.5px;
                margin-bottom: 12px;
                text-transform: uppercase;
                border-bottom: 1.5px solid #e2e8f0;
                padding-bottom: 6px;
            }
            .qc-info-grid {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .qc-info-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 12.5px;
                border-bottom: 1px solid #f1f5f9;
                padding-bottom: 6px;
            }
            .qc-info-row:last-child {
                border-bottom: none;
                padding-bottom: 0;
            }
            .qc-info-label {
                color: #64748b;
                font-size: 12px;
            }
            .qc-info-val {
                color: #1e293b;
                text-align: right;
                word-break: break-word;
            }
            .badge-material {
                background: rgba(245, 158, 11, 0.1) !important;
                color: #d97706 !important;
                border: 1px solid rgba(245, 158, 11, 0.25);
                padding: 2px 8px;
                border-radius: 30px;
                font-size: 11px;
                font-weight: 700;
                display: inline-block;
            }
            .badge-color {
                background: rgba(16, 185, 129, 0.1) !important;
                color: #059669 !important;
                border: 1px solid rgba(16, 185, 129, 0.25);
                padding: 2px 8px;
                border-radius: 30px;
                font-size: 11px;
                font-weight: 700;
                display: inline-block;
            }
            .badge-category {
                background: rgba(59, 130, 246, 0.1) !important;
                color: #2563eb !important;
                border: 1px solid rgba(59, 130, 246, 0.25);
                padding: 2px 8px;
                border-radius: 30px;
                font-size: 11px;
                font-weight: 700;
                display: inline-block;
            }
            .qc-tech-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
                margin-top: 6px;
                color: #1e293b;
            }
            .qc-tech-table th {
                text-align: left;
                padding: 8px 6px;
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
                color: #64748b;
                border-bottom: 2px solid #e2e8f0;
            }
            .qc-tech-table td {
                padding: 10px 6px;
                border-bottom: 1px solid #e2e8f0;
                vertical-align: middle;
            }
            .qc-tech-table tr:last-child td {
                border-bottom: none;
            }
            .qc-tech-total-box {
                background: #fffbeb;
                border: 1px solid #fef3c7;
                border-radius: 10px;
                padding: 12px 14px;
                margin-top: 14px;
                font-size: 12px;
                font-weight: 700;
                text-align: center;
                color: #b45309;
                box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);
            }
            .qc-image-wrapper {
                position: relative;
                width: 80px;
                height: 80px;
                border-radius: 12px;
                overflow: hidden;
                border: 1.5px solid #cbd5e1;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                transition: all 0.2s ease;
            }
            .qc-image-wrapper:hover {
                border-color: #3b82f6;
                transform: translateY(-2px);
                box-shadow: 0 6px 12px -2px rgba(59, 130, 246, 0.15);
            }
            .qc-image-wrapper img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                cursor: pointer;
                border-radius: 12px;
                transition: transform 0.2s ease;
            }
            .qc-image-wrapper img:hover {
                transform: scale(1.08);
            }
            .qc-image-delete-btn {
                position: absolute;
                top: 4px;
                right: 4px;
                background: rgba(239, 68, 68, 0.9);
                color: white;
                border: none;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                font-size: 11px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 800;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                transition: all 0.15s ease;
                z-index: 10;
            }
            .qc-image-delete-btn:hover {
                background: #ef4444;
                transform: scale(1.15);
            }
            #ktclQCModal textarea, #ktclQCModal input.form-input,
            .qlx-cl-popup textarea, .qlx-cl-popup input.form-input {
                border-radius: 12px !important;
                border: 1.5px solid #cbd5e1 !important;
                padding: 10px 14px !important;
                font-size: 13px !important;
                outline: none !important;
                transition: all 0.2s ease-in-out !important;
                box-sizing: border-box !important;
                width: 100% !important;
            }
            #ktclQCModal textarea:focus, #ktclQCModal input.form-input:focus {
                border-color: #3b82f6 !important;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15) !important;
                background-color: #ffffff !important;
            }
            #ktclMissingPriceDetails {
                background: #fff5f5 !important;
                border-color: #fca5a5 !important;
                color: #b91c1c !important;
                border-radius: 12px !important;
            }
            #ktclMissingPriceDetails:focus {
                border-color: #f87171 !important;
                box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15) !important;
            }
            .ktcl-pag-btn {
                background: #ffffff;
                border: 1.5px solid #cbd5e1;
                color: #334155;
                padding: 6px 14px;
                border-radius: 8px;
                font-weight: 700;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s;
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }
            .ktcl-pag-btn:hover:not(:disabled) {
                background: #f1f5f9;
                border-color: #94a3b8;
                color: #0f172a;
            }
            .ktcl-pag-btn-num {
                background: #ffffff;
                border: 1.5px solid #cbd5e1;
                color: #334155;
                width: 34px;
                height: 34px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
                font-weight: 700;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .ktcl-pag-btn-num:hover {
                background: #f1f5f9;
                border-color: #94a3b8;
                color: #0f172a;
            }
            .ktcl-pag-btn-num.active {
                background: #2563eb;
                border-color: #2563eb;
                color: #ffffff;
                box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.25);
            }
        `;
        document.head.appendChild(st);
    }

    content.innerHTML = `
        <div class="ktcl-page-wrapper">
            <!-- Header Area -->
            <div class="ktcl-header">
                <div class="ktcl-header-left">
                    <span class="ktcl-header-icon">🔍</span>
                    <div>
                        <h1 class="ktcl-title">KIỂM TRA CHẤT LƯỢNG — Độc lập & Giám sát</h1>
                        <p class="ktcl-subtitle">Xem báo cáo chất lượng, tiến độ may và truy vết lịch sử nghiệp vụ</p>
                    </div>
                </div>
                <div class="ktcl-header-right" style="display:flex; gap:10px;">
                    ${(typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc') ? `
                        <button class="ktcl-btn-secondary" onclick="_ktclChecklistSetup()" style="background:linear-gradient(135deg,#0f172a,#1e3a5f);color:#fff;border:none;">
                            ⚙️ Setup Checklist QC
                        </button>
                    ` : ''}
                    <button class="ktcl-btn-secondary" onclick="_ktclToggleSimulator()">
                        📱 Trình Giả Lập Mobile
                    </button>
                </div>
            </div>

            <!-- Main Layout Container: split into main table and optional simulator -->
            <div class="ktcl-body-container">
                <!-- Main Audit Area -->
                <div class="ktcl-audit-area" id="ktclAuditArea">
                    <!-- KPI Cards Block -->
                    <div class="ktcl-kpi-grid">
                        <div class="ktcl-kpi-card kpi-tab-4 active" onclick="_ktclSwitchTab('4')" id="ktclKpiCard4">
                            <div class="ktcl-kpi-icon">✅</div>
                            <div class="ktcl-kpi-info">
                                <div class="ktcl-kpi-label">CẦN KIỂM TRA / QC</div>
                                <div class="ktcl-kpi-val" id="ktclCountTab4">0</div>
                            </div>
                        </div>
                        <div class="ktcl-kpi-card kpi-tab-1" onclick="_ktclSwitchTab('1')" id="ktclKpiCard1">
                            <div class="ktcl-kpi-icon">📅</div>
                            <div class="ktcl-kpi-info">
                                <div class="ktcl-kpi-label">ĐẾN HẸN</div>
                                <div class="ktcl-kpi-val" id="ktclCountTab1">0</div>
                            </div>
                        </div>
                        <div class="ktcl-kpi-card kpi-tab-2" onclick="_ktclSwitchTab('2')" id="ktclKpiCard2">
                            <div class="ktcl-kpi-icon">⏳</div>
                            <div class="ktcl-kpi-info">
                                <div class="ktcl-kpi-label">ĐƠN HẸN LẠI (PHÒNG CHỜ)</div>
                                <div class="ktcl-kpi-val" id="ktclCountTab2">0</div>
                            </div>
                        </div>
                        <div class="ktcl-kpi-card kpi-tab-3" onclick="_ktclSwitchTab('3')" id="ktclKpiCard3">
                            <div class="ktcl-kpi-icon">❌</div>
                            <div class="ktcl-kpi-info">
                                <div class="ktcl-kpi-label">CHƯA PHÂN TỔ MAY</div>
                                <div class="ktcl-kpi-val" id="ktclCountTab3">0</div>
                            </div>
                        </div>
                        <div class="ktcl-kpi-card kpi-tab-5" onclick="_ktclSwitchTab('5')" id="ktclKpiCard5">
                            <div class="ktcl-kpi-icon">⚠️</div>
                            <div class="ktcl-kpi-info">
                                <div class="ktcl-kpi-label">ĐƠN LỖI</div>
                                <div class="ktcl-kpi-val" id="ktclCountTab5">0</div>
                            </div>
                        </div>
                    </div>

                    <!-- Audit Metrics Bar -->
                    <div class="ktcl-metrics-summary" id="ktclMetricsSummary">
                        <!-- Filled on data load -->
                    </div>

                    <!-- Filters Bar -->
                    <div class="ktcl-filter-bar">
                        <div class="ktcl-search-wrapper">
                            <input type="text" id="ktclSearch" placeholder="Tìm theo mã đơn, sản phẩm..." oninput="_ktclHandleSearch(this.value)">
                        </div>
                        <div class="ktcl-filters-group">
                            <select id="ktclTeamFilter" onchange="_ktclFilterTeam(this.value)" style="width: 220px;">
                                <option value="">Tất cả Tổ/Gia công</option>
                            </select>
                            <select id="ktclTimeFilter" onchange="_ktclHandleTimeFilterChange(this.value)" style="width: 240px; display: ${_ktclState.activeTab === '4' ? 'block' : 'none'};">
                                <option value="undone_past_today">⏳ Chưa xong QK & Hôm nay</option>
                                <option value="undone">⏳ Chưa xong tất cả</option>
                                <option value="today">✅ Xong hôm nay</option>
                                <option value="custom_date">📅 Xong ngày khác...</option>
                                <option value="custom_month">🗓️ Xong tháng/năm...</option>
                                <option value="done_all">📁 Xong tất cả</option>
                                <option value="all">📦 Tất cả</option>
                            </select>
                            <div id="ktclCustomDateContainer" style="display: ${_ktclState.activeTab === '4' && _ktclState.timeFilterVal === 'custom_date' ? 'flex' : 'none'}; align-items: center; gap: 6px;">
                                <input type="date" id="ktclDoneDate" onchange="_ktclHandleCustomDateChange(this.value)" style="padding: 8px 12px; border-radius: 8px; border: 1px solid #cbd5e1; outline: none; background: #ffffff; font-size: 13px; color: #334155; font-weight: 600;">
                            </div>
                            <div id="ktclCustomMonthContainer" style="display: ${_ktclState.activeTab === '4' && _ktclState.timeFilterVal === 'custom_month' ? 'flex' : 'none'}; align-items: center; gap: 6px;">
                                <input type="month" id="ktclDoneMonth" onchange="_ktclHandleCustomMonthChange(this.value)" style="padding: 8px 12px; border-radius: 8px; border: 1px solid #cbd5e1; outline: none; background: #ffffff; font-size: 13px; color: #334155; font-weight: 600;">
                            </div>
                            <label id="ktclMissingTechFilterLabel" style="display: ${_ktclState.activeTab === '4' ? 'flex' : 'none'}; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: #ef4444; cursor: pointer; user-select: none; margin-left: 10px;">
                                <input type="checkbox" id="ktclMissingTechFilter" onchange="_ktclHandleMissingTechFilterChange(this.checked)" style="width: 16px; height: 16px; cursor: pointer;">
                                ⚠️ Thiếu kỹ thuật
                            </label>
                        </div>
                    </div>

                    <!-- Records Table Card -->
                    <div class="ktcl-table-card">
                        <div class="ktcl-table-responsive">
                            <table class="ktcl-table">
                                <thead>
                                    <tr>
                                        <th style="width: 50px; text-align: center;">STT</th>
                                        <th style="text-align: center; white-space: nowrap;">Thao Tác</th>
                                        <th style="text-align: left; white-space: nowrap;">Mã Đơn / Sản Phẩm / CSKH</th>
                                        <th style="text-align: left; white-space: nowrap;">Vải / Màu</th>
                                        <th style="text-align: center; white-space: nowrap; width: 120px;">SL Đơn / SL May</th>
                                        <th style="text-align: left; white-space: nowrap;">Phân Công Cho</th>
                                        <th style="text-align: center; white-space: nowrap; width: 120px;">Hạn Trả / QLX Hẹn</th>
                                        <th style="text-align: center; white-space: nowrap; width: 100px;">QC / Lương</th>
                                        <th style="text-align: left; white-space: nowrap; width: 150px;">QLX Lưu Ý May</th>
                                    </tr>
                                </thead>
                                <tbody id="ktclTableBody">
                                    <tr>
                                        <td colspan="9" style="text-align: center; padding: 40px; color: #64748b;">
                                            ⏳ Đang tải dữ liệu...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Collapsible Phone Simulator Panel -->
                <div class="ktcl-simulator-panel" id="ktclSimulatorPanel" style="display: none;">
                    <div class="ktcl-phone-frame">
                        <div class="ktcl-phone-notch"></div>
                        <iframe src="/m/kiemtrachatluong" title="Mobile QC Simulator"></iframe>
                    </div>
                    <div class="ktcl-simulator-label">
                        <div class="ktcl-simulator-dot"></div>
                        <span>Trình giả lập Kiểm tra chất lượng (Mobile View)</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Trigger initial data load
    _ktclLoadInitialData().then(() => {
        _ktclLoadData();
    });
}

// Initial Data loaders
async function _ktclLoadInitialData() {
    try {
        const [teamRes, contractorRes] = await Promise.all([
            apiCall('/api/sewing/teams').catch(() => ({ teams: [] })),
            apiCall('/api/sewing/contractors').catch(() => ({ contractors: [] }))
        ]);
        _ktclState.teams = teamRes.teams || [];
        _ktclState.contractors = contractorRes.contractors || [];
        
        await _ktclLoadHolidays();
        _ktclPopulateDropdowns();
    } catch(err) {
        console.error('Lỗi tải dữ liệu ban đầu:', err);
    }
}

async function _ktclLoadHolidays() {
    try {
        const currentYear = new Date().getFullYear();
        const [h1, h2] = await Promise.all([
            apiCall(`/api/holidays?year=${currentYear}`).catch(() => ({ holidays: [] })),
            apiCall(`/api/holidays?year=${currentYear + 1}`).catch(() => ({ holidays: [] }))
        ]);
        _ktclState.holidays = [
            ...(h1.holidays || []),
            ...(h2.holidays || [])
        ].map(h => {
            if (!h.holiday_date) return '';
            return typeof h.holiday_date === 'string' ? h.holiday_date.split('T')[0] : '';
        }).filter(Boolean);
    } catch(e) {
        console.error('Lỗi tải danh sách ngày lễ:', e);
    }
}

function _ktclPopulateDropdowns() {
    // Dynamically populated in _ktclLoadData
}

// Switch tabs and load corresponding tab records
function _ktclSwitchTab(tab) {
    _ktclState.activeTab = tab;
    _ktclState.currentPage = 1;
    
    // Toggle active classes on KPI cards
    for (let i = 1; i <= 5; i++) {
        const el = document.getElementById(`ktclKpiCard${i}`);
        if (el) {
            if (String(i) === tab) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        }
    }
    
    // Reset filters state when tab changes
    _ktclState.teamFilterVal = '';
    const teamSel = document.getElementById('ktclTeamFilter');
    if (teamSel) teamSel.value = '';
    
    // Show/hide time filter based on Tab 4
    const timeFilter = document.getElementById('ktclTimeFilter');
    const customDateContainer = document.getElementById('ktclCustomDateContainer');
    const customMonthContainer = document.getElementById('ktclCustomMonthContainer');
    
    const missingTechLabel = document.getElementById('ktclMissingTechFilterLabel');
    const missingTechFilter = document.getElementById('ktclMissingTechFilter');
    if (missingTechFilter) missingTechFilter.checked = false;
    _ktclState.filterMissingTech = false;

    if (tab === '4') {
        if (timeFilter) {
            timeFilter.style.display = 'block';
            timeFilter.value = _ktclState.timeFilterVal || 'undone_past_today';
        }
        if (customDateContainer) customDateContainer.style.display = _ktclState.timeFilterVal === 'custom_date' ? 'flex' : 'none';
        if (customMonthContainer) customMonthContainer.style.display = _ktclState.timeFilterVal === 'custom_month' ? 'flex' : 'none';
        if (missingTechLabel) missingTechLabel.style.display = 'flex';
    } else {
        if (timeFilter) timeFilter.style.display = 'none';
        if (customDateContainer) customDateContainer.style.display = 'none';
        if (customMonthContainer) customMonthContainer.style.display = 'none';
        if (missingTechLabel) missingTechLabel.style.display = 'none';
    }
    
    _ktclLoadData();
}

async function _ktclLoadData() {
    try {
        // Load counts for badges
        const counts = await apiCall(`/api/sewing/counts`);
        const countTabs = ['1', '2', '3', '4', '5'];
        
        for (let i = 0; i < countTabs.length; i++) {
            const count = counts[`tab${countTabs[i]}`] || 0;
            const el = document.getElementById(`ktclCountTab${countTabs[i]}`);
            if (el) el.textContent = count;
        }

        // Load active tab records
        let url = `/api/sewing/records?tab=${_ktclState.activeTab}`;
        if (_ktclState.activeTab === '4') {
            const timeVal = _ktclState.timeFilterVal || 'undone_past_today';
            if (timeVal === 'today') {
                url += `&status=done_today`;
            } else if (timeVal === 'custom_date') {
                url += `&status=done_all`;
                if (_ktclState.doneDate) url += `&done_date=${encodeURIComponent(_ktclState.doneDate)}`;
            } else if (timeVal === 'custom_month') {
                url += `&status=done_all`;
                if (_ktclState.doneMonth) {
                    const parts = _ktclState.doneMonth.split('-');
                    url += `&done_year=${parts[0]}&done_month=${parts[1]}`;
                }
            } else if (timeVal === 'done_all') {
                url += `&status=done_all`;
            } else if (timeVal === 'all') {
                url += `&status=all`;
            } else if (timeVal === 'undone') {
                url += `&status=incomplete`;
            } else {
                url += `&status=undone_past_today`;
            }
        }
        const res = await apiCall(url);
        _ktclState.originalRecords = res.records || [];
        
        // Fill Team/Gia công filter dropdown dynamically
        const sel = document.getElementById('ktclTeamFilter');
        if (sel) {
            const currentSelVal = _ktclState.teamFilterVal;
            sel.innerHTML = '<option value="">Tất cả Tổ/Gia công</option>';
            const added = new Set();
            _ktclState.originalRecords.forEach(r => {
                if (r.contractor_id) {
                    const val = `c_${r.contractor_id}`;
                    if (!added.has(val)) {
                        added.add(val);
                        sel.innerHTML += `<option value="${val}">🏭 ${r.contractor_name || 'Gia công'}</option>`;
                    }
                } else if (r.sewing_team_id) {
                    const val = `t_${r.sewing_team_id}`;
                    if (!added.has(val)) {
                        added.add(val);
                        sel.innerHTML += `<option value="${val}">🧵 ${r.sewer_name || 'Tổ may'}</option>`;
                    }
                }
            });
            sel.value = currentSelVal;
            if (sel.value !== currentSelVal) {
                _ktclState.teamFilterVal = '';
                sel.value = '';
            }
        }
        
        _ktclRenderTable();
        _ktclRenderMetrics();
    } catch(err) {
        console.error('Lỗi tải dữ liệu:', err);
        showToast(err.message || 'Lỗi tải dữ liệu', 'error');
    }
}

// Render Metrics & KPIs block
function _ktclRenderMetrics() {
    const todayStr = _ktclGetVnTodayStr();
    const records = _ktclState.originalRecords;
    
    const total = records.length;
    const overdue = records.filter(r => !r.done_date && r.expected_date && r.expected_date.split('T')[0] < todayStr).length;
    const errorCount = records.filter(r => r.error_reported).length;
    const doneToday = records.filter(r => r.done_date && r.done_date.split('T')[0] === todayStr).length;
    
    let html = `
        <div class="ktcl-metric-item">
            <span class="ktcl-metric-dot" style="background: #3b82f6;"></span>
            <span>Tổng số đơn: <strong>${total}</strong></span>
        </div>
        <div class="ktcl-metric-item" style="margin-left: 20px;">
            <span class="ktcl-metric-dot" style="background: #ef4444;"></span>
            <span>Đơn trễ hẹn: <strong style="color: #ef4444;">${overdue}</strong></span>
        </div>
        <div class="ktcl-metric-item" style="margin-left: 20px;">
            <span class="ktcl-metric-dot" style="background: #f59e0b;"></span>
            <span>Đơn lỗi nội bộ: <strong style="color: #d97706;">${errorCount}</strong></span>
        </div>
    `;
    if (_ktclState.activeTab === '4') {
        html += `
            <div class="ktcl-metric-item" style="margin-left: 20px;">
                <span class="ktcl-metric-dot" style="background: #10b981;"></span>
                <span>QC hoàn thành hôm nay: <strong style="color: #10b981;">${doneToday}</strong></span>
            </div>
        `;
    }
    
    const el = document.getElementById('ktclMetricsSummary');
    if (el) el.innerHTML = html;
}

// Render Records Table
function _ktclRenderTable() {
    const body = document.getElementById('ktclTableBody');
    if (!body) return;
    
    let filtered = _ktclState.originalRecords.slice();
    
    // Apply search filter
    if (_ktclState.search) {
        const q = _ktclState.search.toLowerCase().trim();
        filtered = filtered.filter(r => 
            (r.order_code || '').toLowerCase().includes(q) ||
            (r.product_name || '').toLowerCase().includes(q) ||
            (r.cut_product_name || '').toLowerCase().includes(q)
        );
    }
    
    // Apply team/contractor filter
    if (_ktclState.teamFilterVal) {
        if (_ktclState.teamFilterVal.startsWith('c_')) {
            const cid = Number(_ktclState.teamFilterVal.split('_')[1]);
            filtered = filtered.filter(r => r.contractor_id === cid);
        } else if (_ktclState.teamFilterVal.startsWith('t_')) {
            const tid = Number(_ktclState.teamFilterVal.split('_')[1]);
            filtered = filtered.filter(r => r.sewing_team_id === tid);
        }
    }

    // Apply missing technique filter
    if (_ktclState.activeTab === '4' && _ktclState.filterMissingTech) {
        filtered = filtered.filter(r => r.notes && r.notes.startsWith('[THIẾU GIÁ CHI TIẾT]'));
    }
    
    const totalCount = filtered.length;
    const itemsPerPage = 50;
    const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
    
    if (!_ktclState.currentPage) _ktclState.currentPage = 1;
    if (_ktclState.currentPage > totalPages) _ktclState.currentPage = totalPages;
    if (_ktclState.currentPage < 1) _ktclState.currentPage = 1;
    
    const startIdx = (_ktclState.currentPage - 1) * itemsPerPage;
    const paginatedRecords = filtered.slice(startIdx, startIdx + itemsPerPage);
    
    let pagEl = document.getElementById('ktclPagination');
    if (!pagEl) {
        pagEl = document.createElement('div');
        pagEl.id = 'ktclPagination';
        pagEl.style.cssText = 'display:flex; justify-content:center; align-items:center; gap:12px; padding: 20px; border-top: 1px solid #e2e8f0; background: #ffffff; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;';
        const tableCard = document.querySelector('.ktcl-table-card');
        if (tableCard) tableCard.appendChild(pagEl);
    }
    
    if (!filtered.length) {
        body.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #64748b;">
                    📭 Không tìm thấy đơn hàng nào khớp bộ lọc.
                </td>
            </tr>
        `;
        if (pagEl) pagEl.style.display = 'none';
        return;
    }
    
    if (pagEl) {
        pagEl.style.display = 'flex';
        if (totalPages <= 1) {
            pagEl.innerHTML = '';
            pagEl.style.borderTop = 'none';
            pagEl.style.padding = '0';
        } else {
            pagEl.style.borderTop = '1px solid #e2e8f0';
            pagEl.style.padding = '20px';
            
            let pagesHtml = '';
            const maxVisiblePages = 5;
            let startPage = Math.max(1, _ktclState.currentPage - 2);
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
            if (endPage - startPage < maxVisiblePages - 1) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }
            
            pagesHtml += `<button class="ktcl-pag-btn" onclick="_ktclPrevPage()" ${_ktclState.currentPage === 1 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>&lt; Trước</button>`;
            
            if (startPage > 1) {
                pagesHtml += `<button class="ktcl-pag-btn-num" onclick="_ktclGoToPage(1)">1</button>`;
                if (startPage > 2) {
                    pagesHtml += `<span style="color:#64748b; padding: 0 4px;">...</span>`;
                }
            }
            
            for (let p = startPage; p <= endPage; p++) {
                const activeClass = p === _ktclState.currentPage ? 'active' : '';
                pagesHtml += `<button class="ktcl-pag-btn-num ${activeClass}" onclick="_ktclGoToPage(${p})">${p}</button>`;
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    pagesHtml += `<span style="color:#64748b; padding: 0 4px;">...</span>`;
                }
                pagesHtml += `<button class="ktcl-pag-btn-num" onclick="_ktclGoToPage(${totalPages})">${totalPages}</button>`;
            }
            
            pagesHtml += `<button class="ktcl-pag-btn" onclick="_ktclNextPage()" ${_ktclState.currentPage === totalPages ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>Sau &gt;</button>`;
            
            pagEl.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%; font-family:'Inter',sans-serif;">
                    <div style="font-size:13px; color:#64748b; font-weight:600;">
                        Hiển thị <strong>${startIdx + 1}</strong> - <strong>${Math.min(startIdx + itemsPerPage, totalCount)}</strong> trên tổng số <strong>${totalCount}</strong> đơn
                    </div>
                    <div style="display:flex; gap:6px; align-items:center;">
                        ${pagesHtml}
                    </div>
                </div>
            `;
        }
    }
    
    body.innerHTML = paginatedRecords.map((r, idx) => {
        // Actions cell
        let actionsHtml = '';
        if (r.done_date) {
            // Already checked
            const errBtn = _ktclState.activeTab === '5'
                ? `<button class="ktcl-btn-sm" style="background: rgba(239, 68, 68, 0.08); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); opacity: 0.6; cursor: default; pointer-events: none; white-space: nowrap; gap: 4px; display: inline-flex; align-items: center; justify-content: center;">🚨 Đã Báo Lỗi</button>`
                : `<button class="ktcl-btn-sm ktcl-btn-danger" onclick="_ktclReportError(${r.id})" style="justify-content:center; white-space:nowrap;">⚠️ Báo Lỗi</button>`;
            
            actionsHtml = `
                <button class="ktcl-btn-sm ktcl-btn-outline" onclick="_ktclOpenQCModal(${r.id})" style="justify-content:center; white-space:nowrap;">
                    🔎 Xem Chi Tiết
                </button>
                <button class="ktcl-btn-sm ktcl-btn-warning" onclick="_ktclOpenQCModal(${r.id})" style="justify-content:center; white-space:nowrap;">
                    📝 Sửa Báo Cáo
                </button>
                ${errBtn}
            `;
        } else {
            // Not checked yet
            if (_ktclState.activeTab === '1' || _ktclState.activeTab === '2') {
                actionsHtml = `
                    <button class="ktcl-btn-sm ktcl-btn-outline" onclick="_ktclOpenHenLai(${r.id})" style="justify-content:center; white-space:nowrap;">
                        📅 Hẹn Lại
                    </button>
                    <button class="ktcl-btn-sm ktcl-btn-danger" onclick="_ktclReportError(${r.id})" style="justify-content:center; white-space:nowrap;">
                        ⚠️ Báo Lỗi
                    </button>
                `;
            } else if (_ktclState.activeTab === '3') {
                actionsHtml = `
                    <button class="ktcl-btn-sm ktcl-btn-primary" onclick="_ktclOpenPhanTo(${r.id})" style="justify-content:center; white-space:nowrap;">
                        👥 Phân Tổ
                    </button>
                `;
            } else if (_ktclState.activeTab === '4') {
                actionsHtml = `
                    <button class="ktcl-btn-sm ktcl-btn-success" onclick="_ktclOpenQCModal(${r.id})" style="justify-content:center; white-space:nowrap;">
                        🔍 Kiểm Tra Chất Lượng (QC)
                    </button>
                    <button class="ktcl-btn-sm ktcl-btn-danger" onclick="_ktclReportError(${r.id})" style="justify-content:center; white-space:nowrap;">
                        ⚠️ Báo Lỗi
                    </button>
                `;
            } else if (_ktclState.activeTab === '5') {
                actionsHtml = `
                    <button class="ktcl-btn-sm ktcl-btn-success" onclick="_ktclOpenQCModal(${r.id})" style="justify-content:center; white-space:nowrap;">
                        🔍 QC & Nghiệm Thu
                    </button>
                    <button class="ktcl-btn-sm" style="background: rgba(239, 68, 68, 0.08); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); opacity: 0.6; cursor: default; pointer-events: none; white-space: nowrap; gap: 4px; display: inline-flex; align-items: center; justify-content: center;">🚨 Đã Báo Lỗi</button>
                `;
            }
            
            // Add audit history button to all rows
            actionsHtml += `
                <button class="ktcl-btn-sm ktcl-btn-outline" onclick="_ktclOpenHistory(${r.id})" style="justify-content:center; white-space:nowrap;">
                    📜 Lịch Sử
                </button>
            `;
        }
        
        // Wrap everything in a nowrap flex container
        actionsHtml = `<div style="display:flex; gap:6px; align-items:center; justify-content:center; white-space:nowrap;">${actionsHtml}</div>`;
        
        // Order Info
        const priority = (r.shipping_priority || 'CHUẨN').toUpperCase();
        let priBadge = '';
        if (priority === 'GẤP') {
            priBadge = '<span class="ktcl-badge ktcl-badge-urgent">Gấp</span>';
        } else if (priority === 'GỬI') {
            priBadge = '<span class="ktcl-badge ktcl-badge-ship">Gửi</span>';
        } else {
            priBadge = '<span class="ktcl-badge ktcl-badge-normal">Chuẩn</span>';
        }
        
        let prodName = _ktclCleanProdName(r);
        const orderInfoHtml = `
            <div style="font-weight: 700; color: #1e3a8a; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                ${priBadge}
                <span>${r.order_code || '—'}</span>
                ${r.notes && r.notes.startsWith('[THIẾU GIÁ CHI TIẾT]') ? 
                    `<span class="ktcl-badge" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5;">⚠️ Thiếu kỹ thuật</span>` : ''
                }
            </div>
            <div style="font-weight: 600; color: #334155; margin-top: 4px; font-size:11.5px;">${prodName}</div>
            <div style="font-size: 10.5px; color: #64748b; margin-top: 2px;">CSKH: <strong>${r.cskh_name || '—'}</strong></div>
            ${r.notes && r.notes.startsWith('[THIẾU GIÁ CHI TIẾT]') ? 
                `<div style="font-size:11px; color:#b91c1c; font-weight:700; margin-top:4px; font-style:italic;">⚠️ Thiếu: ${r.notes.replace('[THIẾU GIÁ CHI TIẾT] ', '')}</div>` : ''
            }
        `;
        
        // Fabrics / techniques info
        const fabricInfoHtml = `
            <div style="color: #475569;">Vải: <strong>${r.material_name || '—'}</strong></div>
            <div style="color: #475569; margin-top: 2px;">Màu: <strong>${r.color_name || '—'}</strong></div>
        `;
        
        // Quantities
        const qtyHtml = `
            <div style="font-size: 13px; font-weight: 800; color: #2563eb; text-align: center;">${r.order_qty || r.quantity}</div>
            <div style="font-size: 11px; color: #64748b; text-align: center; border-top: 1px dashed #e2e8f0; margin-top: 4px; padding-top: 4px;">
                May: <strong style="color: #059669;">${r.quantity}</strong>
            </div>
        `;
        
        // Assigned to (Team or Contractor)
        let assignedHtml = '';
        if (r.contractor_id) {
            assignedHtml = `<span style="background: #f5f5f4; color: #44403c; border: 1px solid #e7e5e4; padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 11px; white-space: nowrap; display: inline-block;">🏭 ${r.contractor_name || 'Gia công'}</span>`;
        } else if (r.sewing_team_id) {
            assignedHtml = `<span style="background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 11px; white-space: nowrap; display: inline-block;">👥 ${r.sewer_name || 'Tổ may'}</span>`;
        } else {
            assignedHtml = `<span style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 11px; white-space: nowrap; display: inline-block;">❌ Chưa phân tổ</span>`;
        }
        
        // Dates
        const datesHtml = `
            <div style="font-size: 11px; color: #475569; text-align: center;">
                Hẹn trả: <strong>${_ktclFormatVnDate(r.expected_ship_date || r.shipping_date)}</strong>
            </div>
            <div style="font-size: 11px; color: #4f46e5; text-align: center; font-weight: 700; margin-top: 4px;">
                QLX Hẹn: <strong>${_ktclFormatVnDate(r.expected_date)}</strong>
            </div>
            ${r.done_date ? 
                `<div style="font-size: 10px; color: #059669; text-align: center; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 4px; margin-top: 6px; padding: 2px 4px; font-weight: 700;">
                    Xong: ${_ktclFormatVnDate(r.done_date)}
                </div>` : ''
            }
        `;
        
        // QC / Salary info
        const qcHtml = `
            <div style="font-weight: 700; color: #b91c1c;">${r.checked_price ? r.checked_price.toLocaleString('vi-VN') + ' đ' : '—'}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
                Lương: <strong style="color: #0d9488;">${r.salary ? r.salary.toLocaleString('vi-VN') + ' đ' : '0 đ'}</strong>
            </div>
            ${r.salary_approved ? 
                `<div style="font-size: 9px; color: #2563eb; font-weight: 700; margin-top: 2px;">✓ Đã tính lương</div>` : ''
            }
        `;
        
        // Notes and QC photos
        let imagesHtml = '—';
        try {
            const imgs = JSON.parse(r.finish_images || '[]');
            if (imgs.length > 0) {
                const t = Date.now();
                imagesHtml = `
                    <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px;">
                        ${imgs.map(src => {
                            const buster = src.includes('?') ? `&t=${t}` : `?t=${t}`;
                            return `<img src="${src}${buster}" class="ktcl-qc-img-thumb" onclick="_ktclViewFullImage('${src}${buster}', ${r.id})">`;
                        }).join('')}
                    </div>
                `;
            }
        } catch(e) {}
        
        const qlxNotes = (r.notes && !r.notes.startsWith('[THIẾU GIÁ CHI TIẾT]')) ? r.notes : '';
        const notesHtml = `
            <div style="font-size: 11px; max-width: 250px; word-break: break-word;">
                ${qlxNotes ? `<div style="color: #334155; margin-bottom: 4px;">📝 <strong>QLX Lưu Ý May:</strong> <span style="color:#ef4444; font-style:italic; font-weight:700;">${qlxNotes}</span></div>` : ''}
                ${r.sew_notes ? `<div style="color: #0d9488; margin-bottom: 4px;">📝 <strong>QL May Ghi Chú:</strong> <span style="font-style:italic; font-weight:700;">${r.sew_notes}</span></div>` : ''}
                ${r.sewing_details ? `<div style="color: #0f766e; font-style: italic;">🧵 <strong>Chi tiết:</strong> ${r.sewing_details}</div>` : ''}
                ${!qlxNotes && !r.sew_notes && !r.sewing_details ? '<span style="color:#94a3b8; font-style:italic;">Không có lưu ý</span>' : ''}
            </div>
        `;
        
        return `
            <tr>
                <td style="text-align: center; font-weight: 700; color: #94a3b8; vertical-align: middle;">${startIdx + idx + 1}</td>
                <td style="text-align: center; vertical-align: middle;">${actionsHtml}</td>
                <td>${orderInfoHtml}</td>
                <td>${fabricInfoHtml}</td>
                <td style="vertical-align: middle;">${qtyHtml}</td>
                <td style="vertical-align: middle;">${assignedHtml}</td>
                <td style="vertical-align: middle;">${datesHtml}</td>
                <td style="vertical-align: middle;">${qcHtml}</td>
                <td>${notesHtml}</td>
            </tr>
        `;
    }).join('');
}

// Advanced Audit History logger popup
async function _ktclOpenHistory(recordId) {
    try {
        const res = await apiCall(`/api/sewing/history/${recordId}`);
        const list = res.history || [];
        
        let timelineHtml = '';
        if (list.length === 0) {
            timelineHtml = '<div style="text-align:center; padding:20px; color:#64748b;">Chưa có lịch sử cập nhật cho đơn hàng này.</div>';
        } else {
            timelineHtml = `
                <div class="ktcl-timeline">
                    ${list.map(h => `
                        <div class="ktcl-timeline-item">
                            <div class="ktcl-timeline-dot"></div>
                            <div class="ktcl-timeline-time">${_ktclFormatVnDateTime(h.performed_at)}</div>
                            <div class="ktcl-timeline-detail">
                                <span class="ktcl-timeline-user">${h.performer_name || 'Hệ thống'}</span>: 
                                <strong>${h.details || h.action}</strong>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        const modalHtml = `
            <div class="bpm-modal-overlay show" id="ktclHistoryModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:80px;overflow-y:auto">
                <div style="background:#fff;border-radius:16px;width:550px;max-width:95vw;box-shadow:0 25px 50px rgba(0,0,0,0.25);overflow:hidden;animation:qlxSlideUp .3s">
                    <div style="background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:center">
                        <div style="font-weight:800; font-size:15px;">📜 LỊCH SỬ CHI TIẾT ĐƠN MAY #${recordId}</div>
                        <button onclick="_ktclCloseModal('ktclHistoryModal')" style="background:none; border:none; color:white; font-size:18px; cursor:pointer;">✕</button>
                    </div>
                    <div style="padding:24px; max-height:60vh; overflow-y:auto;">
                        ${timelineHtml}
                    </div>
                    <div style="padding:14px 24px; background:#f8fafc; border-top:1px solid #e2e8f0; text-align:right;">
                        <button onclick="_ktclCloseModal('ktclHistoryModal')" class="ktcl-btn-sm ktcl-btn-outline" style="padding:8px 16px;">Đóng</button>
                    </div>
                </div>
            </div>
        `;
        
        _ktclCloseModal('ktclHistoryModal');
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    } catch(err) {
        showToast('Không tải được lịch sử: ' + err.message, 'error');
    }
}

// Modal closing helper
function _ktclCloseModal(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// Reschedule Modal
function _ktclOpenHenLai(recordId) {
    const r = _ktclState.originalRecords.find(x => x.id === recordId);
    if (!r) return;
    
    _ktclState.currentRecordId = recordId;
    const expectedVal = r.expected_date ? r.expected_date.split('T')[0] : '';
    const todayStr = _ktclGetVnTodayStr();
    
    const modalHtml = `
        <div class="bpm-modal-overlay show" id="ktclHenLaiModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:100px;">
            <div style="background:#fff;border-radius:16px;width:400px;max-width:95vw;box-shadow:0 25px 50px rgba(0,0,0,0.25);overflow:hidden;animation:qlxSlideUp .3s">
                <div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:center">
                    <div style="font-weight:800; font-size:15px;">📅 LÙI LỊCH HẸN ĐƠN HÀNG</div>
                    <button onclick="_ktclCloseModal('ktclHenLaiModal')" style="background:none; border:none; color:white; font-size:18px; cursor:pointer;">✕</button>
                </div>
                <div style="padding:24px; font-size:13px; color:#334155;">
                    <div style="margin-bottom:12px;"><strong>Mã Đơn:</strong> ${r.order_code || '—'}</div>
                    <div style="margin-bottom:16px;"><strong>Sản phẩm:</strong> ${r.product_name || '—'}</div>
                    
                    <label style="display:block; font-weight:800; margin-bottom:6px; color:#475569;">CHỌN NGÀY HẸN MỚI</label>
                    <input type="date" id="ktclNewDate" min="${todayStr}" value="${expectedVal}" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; outline:none; box-sizing:border-box;">
                </div>
                <div style="padding:14px 24px; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:10px;">
                    <button onclick="_ktclCloseModal('ktclHenLaiModal')" class="ktcl-btn-sm ktcl-btn-outline" style="padding:8px 16px;">Đóng</button>
                    <button onclick="_ktclSubmitHenLai()" class="ktcl-btn-sm ktcl-btn-primary" style="padding:8px 20px;">Lưu Hẹn</button>
                </div>
            </div>
        </div>
    `;
    
    _ktclCloseModal('ktclHenLaiModal');
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Bind change listener for inline warning
    const dateInput = document.getElementById('ktclNewDate');
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            const val = this.value;
            if (!val) return;
            if (val < todayStr) {
                showToast('Chỉ được hẹn từ ngày hôm nay trở đi!', 'error');
                this.value = '';
                return;
            }
            if (_ktclIsHolidayDate(val)) {
                showToast('Không được chọn ngày nghỉ lễ!', 'error');
                this.value = '';
                return;
            }
        });
    }
}

async function _ktclSubmitHenLai() {
    const val = document.getElementById('ktclNewDate').value;
    if (!val) {
        showToast('Vui lòng chọn ngày hẹn mới', 'error');
        return;
    }
    
    const todayStr = _ktclGetVnTodayStr();
    if (val < todayStr) {
        showToast('Chỉ được hẹn từ ngày hôm nay trở đi!', 'error');
        return;
    }
    if (_ktclIsHolidayDate(val)) {
        showToast('Không được chọn ngày nghỉ lễ!', 'error');
        return;
    }
    
    try {
        await apiCall(`/api/sewing/records/${_ktclState.currentRecordId}/field`, 'PATCH', {
            field: 'expected_date',
            value: val
        });
        showToast('Cập nhật lịch hẹn thành công!');
        _ktclCloseModal('ktclHenLaiModal');
        await _ktclLoadData();
    } catch(err) {
        showToast(err.message || 'Lỗi cập nhật', 'error');
    }
}

// Phân Tổ Modal
function _ktclOpenPhanTo(recordId) {
    const r = _ktclState.originalRecords.find(x => x.id === recordId);
    if (!r) return;
    
    _ktclState.currentRecordId = recordId;
    
    const currentTeamId = r.sewing_team_id || '';
    const currentContractorId = r.contractor_id || '';
    
    const teamOpts = _ktclState.teams.map(t => {
        const selected = String(t.id) === String(currentTeamId) && !currentContractorId ? 'selected' : '';
        return `<option value="team_${t.id}" ${selected}>👥 Tổ: ${t.name}</option>`;
    }).join('');
    
    const contractorOpts = _ktclState.contractors.map(c => {
        const selected = String(c.id) === String(currentContractorId) ? 'selected' : '';
        return `<option value="contractor_${c.id}" ${selected}>🏭 Gia công: ${c.name}</option>`;
    }).join('');
    
    const modalHtml = `
        <div class="bpm-modal-overlay show" id="ktclPhanToModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:100px;">
            <div style="background:#fff;border-radius:16px;width:400px;max-width:95vw;box-shadow:0 25px 50px rgba(0,0,0,0.25);overflow:hidden;animation:qlxSlideUp .3s">
                <div style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:center">
                    <div style="font-weight:800; font-size:15px;">👥 BÀN GIAO & PHÂN TỔ MAY</div>
                    <button onclick="_ktclCloseModal('ktclPhanToModal')" style="background:none; border:none; color:white; font-size:18px; cursor:pointer;">✕</button>
                </div>
                <div style="padding:24px; font-size:13px; color:#334155;">
                    <div style="margin-bottom:12px;"><strong>Mã Đơn:</strong> ${r.order_code || '—'}</div>
                    <div style="margin-bottom:16px;"><strong>Sản phẩm:</strong> ${r.product_name || '—'}</div>
                    
                    <label style="display:block; font-weight:800; margin-bottom:6px; color:#475569;">CHỌN ĐƠN VỊ THỰC HIỆN</label>
                    <select id="ktclPhanToSelect" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; outline:none; background:white; box-sizing:border-box;">
                        <option value="">-- Chưa Phân Tổ --</option>
                        <optgroup label="Tổ May Trong Xưởng">
                            ${teamOpts}
                        </optgroup>
                        <optgroup label="Nhà Gia Công Ngoài">
                            ${contractorOpts}
                        </optgroup>
                    </select>
                </div>
                <div style="padding:14px 24px; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:10px;">
                    <button onclick="_ktclCloseModal('ktclPhanToModal')" class="ktcl-btn-sm ktcl-btn-outline" style="padding:8px 16px;">Đóng</button>
                    <button onclick="_ktclSubmitPhanTo()" class="ktcl-btn-sm ktcl-btn-primary" style="padding:8px 20px;">Lưu Phân Phối</button>
                </div>
            </div>
        </div>
    `;
    
    _ktclCloseModal('ktclPhanToModal');
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function _ktclSubmitPhanTo() {
    const selectVal = document.getElementById('ktclPhanToSelect').value;
    
    let field = 'sewing_team_id';
    let value = null;
    
    if (selectVal.startsWith('team_')) {
        field = 'sewing_team_id';
        value = parseInt(selectVal.replace('team_', ''));
    } else if (selectVal.startsWith('contractor_')) {
        field = 'contractor_id';
        value = parseInt(selectVal.replace('contractor_', ''));
    }
    
    try {
        if (field === 'sewing_team_id') {
            await apiCall(`/api/sewing/records/${_ktclState.currentRecordId}/field`, 'PATCH', { field: 'contractor_id', value: null });
            await apiCall(`/api/sewing/records/${_ktclState.currentRecordId}/field`, 'PATCH', { field: 'sewing_team_id', value: value });
        } else {
            await apiCall(`/api/sewing/records/${_ktclState.currentRecordId}/field`, 'PATCH', { field: 'sewing_team_id', value: null });
            await apiCall(`/api/sewing/records/${_ktclState.currentRecordId}/field`, 'PATCH', { field: 'contractor_id', value: value });
        }
        
        showToast('Phân công thành công!');
        _ktclCloseModal('ktclPhanToModal');
        await _ktclLoadData();
    } catch(err) {
        showToast(err.message || 'Lỗi phân công', 'error');
    }
}

// Helper to clean product names
function _ktclCleanProdName(r) {
    if (!r) return 'Sản phẩm';
    var name = r.cut_product_name || r.product_name || '';
    if (!name) return 'Sản phẩm';
    var parts = name.split(/—/).map(function(p) { return p.trim(); }).filter(Boolean);
    var orderCode = r.order_code || '';
    var ticketPart = '';
    var prodNamePart = '';
    parts.forEach(function(p) {
        var upper = p.toUpperCase();
        if (orderCode && upper === orderCode.toUpperCase()) return;
        var ticketMatch = p.match(/(?:Phiếu\s*|P)(\d+)/i);
        if (ticketMatch) {
            if (!ticketPart) ticketPart = 'Phiếu ' + ticketMatch[1];
            return;
        }
        if (!prodNamePart) prodNamePart = p;
        else prodNamePart += ' — ' + p;
    });
    var res = [];
    if (orderCode) res.push(orderCode);
    if (ticketPart) res.push(ticketPart);
    if (prodNamePart) res.push(prodNamePart);
    else res.push(r.product_name || 'Sản phẩm');
    return res.join(' — ');
}

// Helper to determine unit text
function getUnitText(r) {
    if (!r) return 'Cái';
    const name = ((r.cut_product_name || r.product_name || '').toLowerCase());
    if (name.includes('áo')) return 'Áo';
    if (name.includes('quần')) return 'Quần';
    if (name.includes('mũ') || name.includes('nón')) return 'Mũ';
    if (name.includes('váy') || name.includes('đầm')) return 'Váy';
    if (name.includes('tạp dề')) return 'Cái';
    return 'Cái';
}

// Helper to recalculate prices from checked techniques
function _ktclRecalcTechPrices() {
    const checkboxes = document.querySelectorAll('.ktcl-tech-cb');
    let totalFP = 0;
    let totalPP = 0;
    const checkedIds = [];
    const uncheckedNames = [];
    checkboxes.forEach(cb => {
        if (cb.checked) {
            totalFP += Number(cb.dataset.fp) || 0;
            totalPP += Number(cb.dataset.pp) || 0;
            checkedIds.push(Number(cb.dataset.id));
        } else {
            uncheckedNames.push(cb.dataset.name || '');
        }
    });
    
    const totalHomeEl = document.getElementById('ktclTotalHomePrice');
    const totalGCEl = document.getElementById('ktclTotalGCOrderPrice');
    if (totalHomeEl) totalHomeEl.textContent = totalFP.toLocaleString('vi-VN') + 'đ';
    if (totalGCEl) totalGCEl.textContent = totalPP.toLocaleString('vi-VN') + 'đ';
    
    // Auto fill the checked price input field
    const r = _ktclState.originalRecords.find(x => x.id === _ktclState.currentRecordId);
    if (r) {
        const checkedPriceInput = document.getElementById('ktclCheckedPriceInput');
        const checkedGCPriceInput = document.getElementById('ktclCheckedGCPriceInput');
        if (checkedPriceInput) checkedPriceInput.value = totalFP;
        if (checkedGCPriceInput) checkedGCPriceInput.value = totalPP;
    }

    // Show validation warning dynamically
    const isNotAllTechs = checkboxes.length > 0 && checkedIds.length > 0 && checkedIds.length < checkboxes.length;
    
    const missingStr = isNotAllTechs && uncheckedNames.length > 0 ? ('May Thiếu: ' + uncheckedNames.filter(Boolean).join(', ')) : '';
    const notesDisplay = document.getElementById('ktclQCMissingNotesDisplay');
    const notesInput = document.getElementById('ktclQCMissingNotes');
    if (notesDisplay) notesDisplay.textContent = missingStr;
    if (notesInput) notesInput.value = missingStr;

    _ktclUpdateEvidenceGroupVisibility();
}

// Helper to toggle missing price textarea
function _ktclToggleMissingPriceArea() {
    const checkbox = document.getElementById('ktclMissingPriceCheckbox');
    const group = document.getElementById('ktclMissingPriceDetailsGroup');
    if (checkbox && group) {
        group.style.display = checkbox.checked ? 'block' : 'none';
    }
    _ktclUpdateEvidenceGroupVisibility();
}

function _ktclUpdateEvidenceGroupVisibility() {
    const isMissingPrice = document.getElementById('ktclMissingPriceCheckbox').checked;
    const checkboxes = document.querySelectorAll('.ktcl-tech-cb');
    const checkedIds = [];
    checkboxes.forEach(cb => {
        if (cb.checked) checkedIds.push(Number(cb.dataset.id));
    });
    const isNotAllTechs = checkboxes.length > 0 && checkedIds.length > 0 && checkedIds.length < checkboxes.length;

    // 1. Evidence Card for Checklist "Ảnh May Thiếu"
    const evidenceCard = document.getElementById('ktclQCEvidenceCard');
    if (evidenceCard) {
        if (isNotAllTechs) {
            evidenceCard.style.display = 'block';
        } else {
            evidenceCard.style.display = 'none';
            document.getElementById('ktclQCMissingNotes').value = '';
            document.getElementById('ktclQCMissingNotesDisplay').textContent = '';
            const statusEl = document.getElementById('ktclEvidenceUploadStatus');
            if (statusEl) statusEl.textContent = 'Chưa chọn ảnh';
            const container = document.getElementById('ktclQCEvidenceImagesContainer');
            if (container) container.innerHTML = '<span style="color:#94a3b8; font-style:italic;">Chưa có ảnh dẫn chứng.</span>';
            const r = _ktclState.originalRecords.find(x => x.id === _ktclState.currentRecordId);
            if (r) r.qc_evidence_images = '[]';
        }
    }

    // 2. Evidence Card for "Ảnh Thiếu Kỹ Thuật"
    const mpEvidenceCard = document.getElementById('ktclQCMissingPriceEvidenceCard');
    if (mpEvidenceCard) {
        if (isMissingPrice) {
            mpEvidenceCard.style.display = 'block';
        } else {
            mpEvidenceCard.style.display = 'none';
            const statusEl = document.getElementById('ktclMissingPriceEvidenceUploadStatus');
            if (statusEl) statusEl.textContent = 'Chưa chọn ảnh';
            const container = document.getElementById('ktclQCMissingPriceEvidenceImagesContainer');
            if (container) container.innerHTML = '<span style="color:#94a3b8; font-style:italic;">Chưa có ảnh dẫn chứng.</span>';
            const r = _ktclState.originalRecords.find(x => x.id === _ktclState.currentRecordId);
            if (r) r.qc_missing_price_images = '[]';
        }
    }
}

// Helper to load QC Checklist questions
async function _ktclLoadQcChecklist(recordId) {
    const container = document.getElementById('ktclQcChecklistContainer');
    const group = document.getElementById('ktclQcChecklistGroup');
    if (!container || !group) return;

    container.innerHTML = '<div style="font-size:12px;color:#64748b;">⏳ Đang tải câu hỏi QC...</div>';
    group.style.display = 'block';

    try {
        const res = await apiCall(`/api/qc/checklist/answers/${recordId}`);
        const templates = res.templates || [];
        const answers = res.answers || [];

        if (templates.length === 0) {
            group.style.display = 'none';
            return;
        }

        container.innerHTML = '';
        templates.forEach(q => {
            const ans = answers.find(a => a.template_id === q.id);
            const val = ans ? ans.answer_value : '';

            const row = document.createElement('div');
            row.className = 'ktcl-qc-question-row';
            row.dataset.id = q.id;
            row.dataset.type = q.type;
            row.style.cssText = 'display: flex; flex-direction: column; gap: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-top: 10px;';
            
            if (q.type === 'yes_no') {
                const hasYes = val === 'yes';
                const hasNo = val === 'no';
                row.innerHTML = `
                    <div style="font-size: 13px; font-weight: 700; color: #1e293b; line-height: 1.4;">${q.content} <span style="color: #ef4444;">*</span></div>
                    <div style="display: flex; gap: 24px; margin-top: 4px;">
                        <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; color: #334155; user-select: none;">
                            <input type="radio" class="ktcl-qc-radio" name="ktcl_question_${q.id}" value="yes" ${hasYes ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: #0d9488;"> Có
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; color: #334155; user-select: none;">
                            <input type="radio" class="ktcl-qc-radio" name="ktcl_question_${q.id}" value="no" ${hasNo ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: #ef4444;"> Không
                        </label>
                    </div>
                `;
            } else if (q.type === 'percentage') {
                const pctVal = val !== '' ? val : '50';
                row.innerHTML = `
                    <div style="font-size: 13px; font-weight: 700; color: #1e293b; line-height: 1.4;">${q.content} <span style="color: #ef4444;">*</span></div>
                    <div style="display: flex; align-items: center; gap: 12px; margin-top: 4px;">
                        <input type="range" class="ktcl-qc-range" name="ktcl_question_${q.id}" min="0" max="100" value="${pctVal}" style="flex: 1; height: 6px; border-radius: 3px; accent-color: #10b981; cursor: pointer;" oninput="this.nextElementSibling.textContent = this.value + '%'">
                        <span style="font-size: 14px; font-weight: 800; color: #10b981; min-width: 45px; text-align: right;">${pctVal}%</span>
                    </div>
                `;
            } else {
                row.innerHTML = `
                    <div style="font-size: 13px; font-weight: 700; color: #1e293b; line-height: 1.4;">${q.content} <span style="color: #ef4444;">*</span></div>
                    <input type="text" class="form-input ktcl-qc-text-input" value="${val}" placeholder="Nhập câu trả lời..." style="background: #ffffff; border: 1px solid #cbd5e1; color: #1e293b; font-size: 13px; border-radius: 8px; padding: 8px 12px; width: 100%; outline: none; box-sizing: border-box;">
                `;
            }
            container.appendChild(row);
        });
    } catch(e) {
        container.innerHTML = `<div style="font-size:12px;color:#ef4444;">⚠️ Lỗi tải checklist: ${e.message}</div>`;
    }
}

// QC / Audit Modal (Checked price, notes, images upload/delete)
async function _ktclOpenQCModal(recordId) {
    const r = _ktclState.originalRecords.find(x => x.id === recordId);
    if (!r) return;
    
    _ktclState.currentRecordId = recordId;
    const generalNotes = r.sew_notes || '';
    const qlxNotes = (r.notes && !r.notes.startsWith('[THIẾU GIÁ CHI TIẾT]')) ? r.notes : '';
    
    const assignee = r.contractor_id ? r.contractor_name : r.sewer_name;
    const isTeam = !!(r.sewing_team_id !== null && r.sewing_team_id !== undefined && !r.contractor_id);
    
    // Preview images
    let imagesHtml = '';
    try {
        const imgs = JSON.parse(r.finish_images || '[]');
        if (imgs.length > 0) {
            const t = Date.now();
            imagesHtml = imgs.map(src => {
                const buster = src.includes('?') ? `&t=${t}` : `?t=${t}`;
                return `
                <div class="qc-image-wrapper">
                    <img src="${src}${buster}" onclick="window.open('${src}${buster}', '_blank')">
                    <button onclick="_ktclDeleteQCImage('${src}')" class="qc-image-delete-btn">✕</button>
                </div>
                `;
            }).join('');
        }
    } catch(e) {}

    // Preview evidence images
    let evidenceImagesHtml = '';
    try {
        const evidImgs = JSON.parse(r.qc_evidence_images || '[]');
        if (evidImgs.length > 0) {
            const t = Date.now();
            evidenceImagesHtml = evidImgs.map(src => {
                const buster = src.includes('?') ? `&t=${t}` : `?t=${t}`;
                return `
                <div class="qc-image-wrapper">
                    <img src="${src}${buster}" onclick="window.open('${src}${buster}', '_blank')">
                    <button onclick="_ktclDeleteEvidenceImage('${src}')" class="qc-image-delete-btn">✕</button>
                </div>
                `;
            }).join('');
        }
    } catch(e) {}
    
    // Preview missing price evidence images
    let missingPriceEvidenceImagesHtml = '';
    try {
        const mpEvidImgs = JSON.parse(r.qc_missing_price_images || '[]');
        if (mpEvidImgs.length > 0) {
            const t = Date.now();
            missingPriceEvidenceImagesHtml = mpEvidImgs.map(src => {
                const buster = src.includes('?') ? `&t=${t}` : `?t=${t}`;
                return `
                <div class="qc-image-wrapper">
                    <img src="${src}${buster}" onclick="window.open('${src}${buster}', '_blank')">
                    <button onclick="_ktclDeleteMissingPriceEvidenceImage('${src}')" class="qc-image-delete-btn">✕</button>
                </div>
                `;
            }).join('');
        }
    } catch(e) {}
    
    const modalHtml = `
        <div class="bpm-modal-overlay show" id="ktclQCModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:40px;overflow-y:auto">
            <div style="background:#fff;border-radius:16px;width:900px;max-width:95vw;box-shadow:0 25px 50px rgba(0,0,0,0.25);overflow:hidden;animation:qlxSlideUp .3s;margin-bottom:40px;">
                <div style="background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:center">
                    <div style="font-weight:800; font-size:16px; display:flex; align-items:center; gap:8px;">
                        <span>🔎 Chi Tiết Kiểm Tra & Đơn Giá</span>
                    </div>
                    <button onclick="_ktclCloseModal('ktclQCModal')" style="background:none; border:none; color:white; font-size:20px; cursor:pointer; font-weight:bold;">✕</button>
                </div>
                
                <div class="ktcl-qc-grid">
                    <!-- LEFT COLUMN: PRODUCT INFO & SPECS -->
                    <div>
                        <!-- Card 1: Thông tin sản phẩm -->
                        <div class="qc-section-card">
                            <div class="qc-section-title">📦 THÔNG TIN SẢN PHẨM</div>
                            <div class="qc-info-grid">
                                <div class="qc-info-row">
                                    <span class="qc-info-label">📋 Mã Đơn</span>
                                    <span class="qc-info-val" id="ktclQcDetOrderCode" style="font-weight:700; color:#1e3a8a;">${r.order_code || '—'}</span>
                                </div>
                                <div class="qc-info-row">
                                    <span class="qc-info-label">📋 Tên SP</span>
                                    <span class="qc-info-val" id="ktclQcDetProdName">${_ktclCleanProdName(r)}</span>
                                </div>
                                <div class="qc-info-row">
                                    <span class="qc-info-label">👤 CSKH</span>
                                    <span class="qc-info-val" id="ktclQcDetCskh">${r.cskh_name || '—'}</span>
                                </div>
                                <div class="qc-info-row">
                                    <span class="qc-info-label">🧵 Chất liệu</span>
                                    <span class="badge-material" id="ktclQcDetMaterial">${r.material_name || '—'}</span>
                                </div>
                                <div class="qc-info-row">
                                    <span class="qc-info-label">🎨 Màu</span>
                                    <span class="badge-color" id="ktclQcDetColor">${r.color_name || '—'}</span>
                                </div>
                                <div class="qc-info-row">
                                    <span class="qc-info-label">🏷️ Sản phẩm May</span>
                                    <span class="badge-category" id="ktclQcDetCategory">${r.category_name || '—'}</span>
                                </div>
                                <div class="qc-info-row">
                                    <span class="qc-info-label">👤 NV May</span>
                                    <span class="qc-info-val" id="ktclQcDetAssignee" style="color: #0d9488; font-weight: 700;">${assignee || '—'}</span>
                                </div>
                                <div class="qc-info-row" id="ktclQcDetQlxNotesRow" style="${qlxNotes ? 'display:flex;' : 'display:none;'}">
                                    <span class="qc-info-label">📝 QLX Lưu Ý May</span>
                                    <span class="qc-info-val" id="ktclQcDetQlxNotes" style="font-style: italic; color: #ef4444; font-weight: 700;">${qlxNotes || ''}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Card 2: Số lượng May / Thực tế -->
                        <div class="qc-section-card">
                            <div class="qc-section-title">📦 SỐ LƯỢNG MAY / THỰC TẾ</div>
                            <div class="qc-info-grid">
                                <div class="qc-info-row">
                                    <span class="qc-info-label">📦 SL Thực Tế</span>
                                    <span class="qc-info-val" id="ktclQcDetQtyActual" style="color: #2563eb; font-weight: 800;">${r.order_qty || 0} ${getUnitText(r)}</span>
                                </div>
                                <div class="qc-info-row">
                                    <span class="qc-info-label">📦 SL May</span>
                                    <span class="qc-info-val" id="ktclQcDetQtySew" style="color: #059669; font-weight: 800;">${r.quantity || 0} ${getUnitText(r)}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Card 3: Thông số mẫu áo -->
                        <div class="qc-section-card" id="ktclQcSpecCard" style="display:none;">
                            <div class="qc-section-title">📐 THÔNG SỐ MẪU ÁO</div>
                            <div class="qc-info-grid" style="margin-bottom: 10px;">
                                <div class="qc-info-row">
                                    <span class="qc-info-label">Mẫu áo</span>
                                    <span class="qc-info-val" id="ktclQcDetSpecName" style="color: #7c3aed; font-weight: 700;">${r.pattern_name || ''}</span>
                                </div>
                            </div>
                            <div id="ktclQcSpecImageArea" style="border: 1px dashed #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; background: #f8fafc; display: none;">
                                <div style="font-size: 11px; color: #0d9488; font-weight: 700; margin-bottom: 6px;">📷 Hình Ảnh Thông Số</div>
                                <img id="ktclQcSpecImg" src="${r.ts_spec_image || ''}" style="max-width: 100%; max-height:250px; border-radius: 6px; cursor: pointer; object-fit: contain;" onclick="window.open(this.src, '_blank')">
                            </div>
                        </div>
                    </div>

                    <!-- RIGHT COLUMN: TECHNIQUES & CHECKLIST -->
                    <div>
                        <!-- Card 4: Kỹ thuật may -->
                        <div class="qc-section-card" id="ktclQcTechCard" style="display:none;">
                            <div class="qc-section-title">✂️ KỸ THUẬT MAY</div>
                            <div style="overflow-x: auto; max-height: 200px; border: 1px solid #e2e8f0; border-radius: 8px;">
                                <table class="qc-tech-table">
                                    <thead>
                                        <tr style="background: #0f172a !important;">
                                            <th style="width: 50px; text-align: center; color: #f1f5f9 !important;">Tích</th>
                                            <th style="color: #f1f5f9 !important;">Kỹ thuật</th>
                                            <th style="width: 50px; text-align: center; color: #f1f5f9 !important;">SL</th>
                                            <th style="text-align: right; padding-right:10px; color: #4ade80 !important;">May nhà</th>
                                            <th style="text-align: right; padding-right:10px; color: #60a5fa !important;">May GC</th>
                                        </tr>
                                    </thead>
                                    <tbody id="ktclQcTechTableBody">
                                        <!-- Rendered dynamically -->
                                    </tbody>
                                </table>
                            </div>
                            <div class="qc-tech-total-box" id="ktclQcTechTotalBox">
                                💰 Tổng giá may &nbsp;|&nbsp; 
                                <span style="color: #059669;">MAY NHÀ: <strong id="ktclTotalHomePrice">0đ</strong></span> &nbsp;•&nbsp; 
                                <span style="color: #2563eb;">MAY GC: <strong id="ktclTotalGCOrderPrice">0đ</strong></span>
                            </div>
                        </div>

                        <!-- Card 4b: Ảnh Dẫn Chứng Thiếu (Bắt buộc khi thiếu kỹ thuật) -->
                        <div class="qc-section-card" id="ktclQCEvidenceCard" style="display:none; border: 1px dashed #fca5a5; background: #fff5f5;">
                            <div class="qc-section-title" style="color:#ef4444;">⚠️ CHI TIẾT KỸ THUẬT MAY THIẾU</div>
                            
                            <div class="form-group">
                                <div id="ktclQCMissingNotesDisplay" style="background: #fef2f2; color: #ef4444; border: 1px solid #fca5a5; border-radius: 6px; padding: 10px 12px; font-weight: 600; margin-bottom: 12px; font-size: 13.5px; line-height: 1.4;">${r.qc_missing_notes || ''}</div>
                                <input type="hidden" id="ktclQCMissingNotes" value="${r.qc_missing_notes || ''}">
                            </div>

                            <div class="form-group" style="margin-top:12px;">
                                <label class="form-label" style="color:#ef4444; font-weight:700;">Ảnh May Thiếu (Chụp Ảnh) <span style="color:#ef4444;">*</span></label>
                                <div style="display:flex; gap:12px; align-items:center; margin-bottom: 12px;">
                                    <button class="ktcl-btn-sm ktcl-btn-outline" style="padding:8px 14px; font-weight:700; border-color:#fca5a5; color:#ef4444;" onclick="document.getElementById('ktclQCEvidenceFileInput').click()"> Tải ảnh dẫn chứng</button>
                                    <span style="font-size:12px; color:#64748b;" id="ktclEvidenceUploadStatus">Chưa chọn ảnh</span>
                                    <input type="file" multiple id="ktclQCEvidenceFileInput" accept="image/*" style="display:none;" onchange="_ktclUploadEvidenceImages(event)">
                                </div>
                                <div style="display:flex; gap:8px; flex-wrap:wrap;" id="ktclQCEvidenceImagesContainer">
                                    <!-- Rendered dynamically -->
                                </div>
                            </div>
                        </div>

                        <!-- Card 5: Báo Lỗi / Thiếu Giá -->
                        <div class="qc-section-card">
                            <div class="qc-section-title">⚠️ BÁO LỖI / THIẾU KỸ THUẬT</div>
                            
                            <div style="display:flex; align-items:center; gap:8px; margin-bottom: 12px;">
                                <input type="checkbox" id="ktclMissingPriceCheckbox" onchange="_ktclToggleMissingPriceArea()" style="width:18px; height:18px; cursor:pointer;">
                                <label for="ktclMissingPriceCheckbox" style="font-size:13px; font-weight:700; color:#ef4444; cursor:pointer;">Thiếu Kỹ Thuật May</label>
                            </div>

                            <div id="ktclMissingPriceDetailsGroup" style="display:none; margin-bottom: 12px;">
                                <label class="form-label" style="color:#ef4444; font-weight: 700;">Chi tiết thiếu kỹ thuật may (Bắt buộc):</label>
                                <textarea id="ktclMissingPriceDetails" class="form-input" rows="2" placeholder="Nhập tên chi tiết/kỹ thuật may còn thiếu..." style="background: #fef2f2; border-color: #fca5a5; color: #b91c1c;"></textarea>
                            </div>

                            <!-- Ảnh Thiếu Kỹ Thuật May (Bắt buộc khi tích Thiếu Kỹ Thuật May) -->
                            <div id="ktclQCMissingPriceEvidenceCard" style="display:none; border: 1px dashed #fca5a5; background: #fff5f5; border-radius: 8px; padding: 12px; margin-bottom: 12px; margin-top: 12px;">
                                <div class="form-group">
                                    <label class="form-label" style="color:#ef4444; font-weight:700; margin-bottom:6px;">Ảnh Thiếu Kỹ Thuật (Bắt buộc) <span style="color:#ef4444;">*</span></label>
                                    <div style="display:flex; gap:12px; align-items:center; margin-bottom: 12px;">
                                        <button class="ktcl-btn-sm ktcl-btn-outline" style="padding:8px 14px; font-weight:700; border-color:#fca5a5; color:#ef4444;" onclick="document.getElementById('ktclQCMissingPriceEvidenceFileInput').click()"> Tải ảnh thiếu kỹ thuật</button>
                                        <span style="font-size:12px; color:#64748b;" id="ktclMissingPriceEvidenceUploadStatus">Chưa chọn ảnh</span>
                                        <input type="file" multiple id="ktclQCMissingPriceEvidenceFileInput" accept="image/*" style="display:none;" onchange="_ktclUploadMissingPriceImages(event)">
                                    </div>
                                    <div style="display:flex; gap:8px; flex-wrap:wrap;" id="ktclQCMissingPriceEvidenceImagesContainer">
                                        ${missingPriceEvidenceImagesHtml || '<span style="color:#94a3b8; font-style:italic;">Chưa có ảnh thiếu kỹ thuật.</span>'}
                                    </div>
                                </div>
                            </div>

                            <div class="form-group" style="margin-top:12px;">
                                <label class="form-label">Giá Kiểm Tra May Nhà</label>
                                <input type="number" id="ktclCheckedPriceInput" value="${isTeam ? (r.checked_price || '') : ''}" class="form-input" placeholder="Giá tự động tính..." readonly style="background: #f1f5f9; color: #64748b; cursor: not-allowed;">
                            </div>

                            <div class="form-group" style="margin-top:12px;">
                                <label class="form-label">Giá Kiểm Tra May GC</label>
                                <input type="number" id="ktclCheckedGCPriceInput" value="${!isTeam ? (r.checked_price || '') : ''}" class="form-input" placeholder="Giá tự động tính..." readonly style="background: #f1f5f9; color: #64748b; cursor: not-allowed;">
                            </div>
                        </div>

                        <!-- Card 5b: Nhắc Nhở Phân Tổ May / Kiểm Tra QC -->
                        <div class="qc-section-card" id="ktclQcRemindersGroup" style="display:none; border: 1.5px solid #ef4444; background: #fff5f5; border-radius: 8px; padding: 12px; margin-bottom: 12px; margin-top: 12px;">
                            <div class="qc-section-title" style="color: #ef4444; font-weight: 800; display: flex; align-items: center; gap: 6px; font-size: 14px;">
                                🔔 Nhắc Nhở Phân Tổ May / Kiểm Tra QC
                            </div>
                            <div id="ktclQcRemindersContainer" style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
                                <!-- Reminders will be rendered dynamically here -->
                            </div>
                        </div>

                        <!-- Card 6: QC Checklist Questions -->
                        <div class="qc-section-card" id="ktclQcChecklistGroup" style="display:none;">
                            <div class="qc-section-title" style="color: #d97706;">🔍 KIỂM TRA CHẤT LƯỢNG (QC) <span style="font-size: 10px; font-weight: normal; color: #ef4444;">(Bắt buộc trả lời tất cả)</span></div>
                            <div id="ktclQcChecklistContainer" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 12px;">
                                <!-- QC questions will be rendered dynamically here -->
                            </div>
                        </div>

                        <!-- Card 7: Ảnh QC Thành Phẩm -->
                        <div class="qc-section-card">
                            <div class="qc-section-title">📸 ẢNH QC THÀNH PHẨM <span style="color:#ef4444;">*</span></div>
                            <div style="display:flex; gap:12px; align-items:center; margin-bottom: 12px;">
                                <button class="ktcl-btn-sm ktcl-btn-outline" style="padding:8px 14px; font-weight:700;" onclick="document.getElementById('ktclQCFileInput').click()"> Tải ảnh lên</button>
                                <span style="font-size:12px; color:#64748b;" id="ktclUploadStatus">Chưa chọn ảnh</span>
                                <input type="file" multiple id="ktclQCFileInput" accept="image/*" style="display:none;" onchange="_ktclUploadQCImages(event)">
                            </div>
                            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;" id="ktclQCImagesContainer">
                                ${imagesHtml || '<span style="color:#94a3b8; font-style:italic;">Chưa có ảnh chụp thực tế.</span>'}
                            </div>

                            <div class="form-group" style="margin-top:12px; border-top: 1px solid #e2e8f0; padding-top:12px;">
                                <label class="form-label" id="ktclQCNotesLabel">Ghi chú quản lý may <span style="font-weight: normal; color: #64748b;">(Không bắt buộc)</span></label>
                                <textarea id="ktclQCNotes" class="form-input" rows="2" placeholder="Nhập ghi chú của quản lý may...">${generalNotes}</textarea>
                            </div>
                        </div>

                        <div style="font-size:11.5px; color:#64748b; margin-top:10px; padding-top:8px; border-top:1px solid #e2e8f0; line-height:1.4; display:none;" id="ktclQcUpdateHistory"></div>
                    </div>
                </div>

                <div style="padding:16px 24px; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:12px; border-radius: 0 0 16px 16px;">
                    <button onclick="_ktclCloseModal('ktclQCModal')" class="ktcl-btn-sm ktcl-btn-outline" style="padding:10px 20px; font-weight:700;">Đóng</button>
                    <button onclick="_ktclSubmitQC()" class="ktcl-btn-sm ktcl-btn-success" style="padding:10px 24px; font-weight:700; background:linear-gradient(135deg,#0d9488,#14b8a6); color:#fff; border:none; border-radius:8px; cursor:pointer;">Xác Nhận</button>
                </div>
            </div>
        </div>
    `;
    
    _ktclCloseModal('ktclQCModal');
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Populate missing price details
    const noteText = r.notes || '';
    if (noteText.startsWith('[THIẾU GIÁ CHI TIẾT] ')) {
        document.getElementById('ktclMissingPriceCheckbox').checked = true;
        document.getElementById('ktclMissingPriceDetailsGroup').style.display = 'block';
        document.getElementById('ktclMissingPriceDetails').value = noteText.replace('[THIẾU GIÁ CHI TIẾT] ', '');
    } else {
        document.getElementById('ktclMissingPriceCheckbox').checked = false;
        document.getElementById('ktclMissingPriceDetailsGroup').style.display = 'none';
        document.getElementById('ktclMissingPriceDetails').value = '';
    }

    // Populate Spec / Techniques
    if (r.pattern_name) {
        document.getElementById('ktclQcSpecCard').style.display = 'block';
        document.getElementById('ktclQcTechCard').style.display = 'block';
        
        if (r.ts_spec_image) {
            document.getElementById('ktclQcSpecImageArea').style.display = 'block';
        }
        
        // Combine techniques
        let tsamTechs = [];
        try {
            tsamTechs = typeof r.ts_sewing_tech === 'string' ? JSON.parse(r.ts_sewing_tech) : (r.ts_sewing_tech || []);
        } catch (e) { tsamTechs = []; }
        if (!Array.isArray(tsamTechs)) tsamTechs = [];

        let orderTechs = [];
        try {
            orderTechs = typeof r.sewing_techniques === 'string' ? JSON.parse(r.sewing_techniques) : (r.sewing_techniques || []);
        } catch (e) { orderTechs = []; }
        if (!Array.isArray(orderTechs)) orderTechs = [];

        const techniques = [];
        const seenIds = new Set();
        [...tsamTechs, ...orderTechs].forEach(tech => {
            if (tech && tech.id && !seenIds.has(tech.id)) {
                seenIds.add(tech.id);
                techniques.push(tech);
            }
        });

        let checkedIds = [];
        try {
            checkedIds = JSON.parse(r.checked_techniques || '[]');
        } catch (e) { checkedIds = []; }

        const tbody = document.getElementById('ktclQcTechTableBody');
        tbody.innerHTML = '';
        if (techniques.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#64748b; padding: 12px 0;">Không có dữ liệu kỹ thuật</td></tr>';
        } else {
            techniques.forEach(tech => {
                const isChecked = checkedIds.includes(tech.id);
                const checkedAttr = isChecked ? 'checked' : '';
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="text-align: center;">
                        <input type="checkbox" class="ktcl-tech-cb" data-id="${tech.id}" data-name="${tech.name || ''}" data-fp="${tech.fp || 0}" data-pp="${tech.pp || 0}" ${checkedAttr} onchange="_ktclRecalcTechPrices()" style="width:18px; height:18px; cursor:pointer;">
                    </td>
                    <td style="font-weight: 600; color: #1e293b;">${tech.name || ''}</td>
                    <td style="text-align: center; color: #64748b;">${tech.qty || 1}</td>
                    <td style="text-align: right; color: #059669; font-weight: 600; padding-right:10px;">${Number(tech.fp || 0).toLocaleString('vi-VN')}đ</td>
                    <td style="text-align: right; color: #2563eb; font-weight: 600; padding-right:10px;">${Number(tech.pp || 0).toLocaleString('vi-VN')}đ</td>
                `;
                tbody.appendChild(row);
            });
        }
        _ktclRecalcTechPrices();
        let evidCount = 0;
        try { evidCount = JSON.parse(r.qc_evidence_images || '[]').length; } catch(e){}
        const evidStatusEl = document.getElementById('ktclEvidenceUploadStatus');
        if (evidStatusEl) {
            evidStatusEl.textContent = evidCount > 0 ? `Đã tải lên ${evidCount} ảnh dẫn chứng.` : 'Chưa chọn ảnh';
        }
    } else {
        document.getElementById('ktclQcSpecCard').style.display = 'none';
        document.getElementById('ktclQcTechCard').style.display = 'none';
    }

    let finishCount = 0;
    try { finishCount = JSON.parse(r.finish_images || '[]').length; } catch(e){}
    const finishStatusEl = document.getElementById('ktclUploadStatus');
    if (finishStatusEl) {
        finishStatusEl.textContent = finishCount > 0 ? `Đã tải lên ${finishCount} ảnh.` : 'Chưa chọn ảnh';
    }

    // Display history
    const historyEl = document.getElementById('ktclQcUpdateHistory');
    if (historyEl) {
        if (r.last_update_at) {
            const updater = r.last_update_by || 'Hệ thống';
            const updateTime = typeof vnFormat === 'function' ? vnFormat(r.last_update_at, 'HH:mm DD/MM/YYYY') : new Date(r.last_update_at).toLocaleString();
            const detail = r.last_update_detail ? ` (${r.last_update_detail})` : '';
            historyEl.innerHTML = `✍️ Cập nhật cuối: <strong>${updater}</strong> lúc <strong>${updateTime}</strong>${detail}`;
            historyEl.style.display = 'block';
        } else {
            historyEl.style.display = 'none';
        }
    }

    // Load checklist
    await _ktclLoadQcChecklist(recordId);
    _ktclFetchRemindersForQC(r);
    _ktclUpdateEvidenceGroupVisibility();
}

async function _ktclFetchRemindersForQC(r) {
    const group = document.getElementById('ktclQcRemindersGroup');
    const container = document.getElementById('ktclQcRemindersContainer');
    if (!group || !container) return;

    if (!document.getElementById('bptReminderPulseStyle')) {
        const style = document.createElement('style');
        style.id = 'bptReminderPulseStyle';
        style.innerHTML = `
            @keyframes bptReminderPulse {
                0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                70% { transform: scale(1.02); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
                100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            }
        `;
        document.head.appendChild(style);
    }

    group.style.display = 'none';
    container.innerHTML = '';

    try {
        const url = `/api/qlx/reminders?order_id=${r.dht_order_id}&dept=may&item_id=${r.order_item_id}&record_type=sewing_qc&record_id=${r.id}`;
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        const reminders = data.reminders || [];
        const reminderIds = data.reminder_ids || [];
        const viewedIds = data.viewed_ids || [];

        if (reminders.length > 0) {
            group.style.display = 'block';
            reminders.forEach((remContent, idx) => {
                const remId = reminderIds[idx];
                const isViewed = viewedIds.includes(remId);

                const itemDiv = document.createElement('div');
                itemDiv.style.display = 'flex';
                itemDiv.style.alignItems = 'center';
                itemDiv.style.gap = '10px';
                itemDiv.style.background = '#fff';
                itemDiv.style.border = `1.5px solid ${isViewed ? '#10b981' : '#ef4444'}`;
                itemDiv.style.borderRadius = '8px';
                itemDiv.style.padding = '8px 12px';
                itemDiv.style.marginBottom = '6px';
                itemDiv.style.transition = 'all 0.3s';

                const text = document.createElement('div');
                text.style.flex = '1';
                text.style.fontSize = '12.5px';
                text.style.fontWeight = '700';
                text.style.color = isViewed ? '#065f46' : '#991b1b';
                text.textContent = remContent;
                itemDiv.appendChild(text);

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.style.flexShrink = '0';
                btn.style.padding = '5px 10px';
                btn.style.borderRadius = '6px';
                btn.style.fontSize = '11px';
                btn.style.fontWeight = '800';
                btn.style.cursor = 'pointer';
                btn.style.display = 'flex';
                btn.style.alignItems = 'center';
                btn.style.gap = '4px';
                btn.style.transition = 'all 0.2s';

                if (isViewed) {
                    btn.style.border = '1.5px solid #10b981';
                    btn.style.background = '#ecfdf5';
                    btn.style.color = '#047857';
                    btn.innerHTML = '✅ Đã Xem và Làm';
                } else {
                    btn.className = 'ktcl-unviewed-btn';
                    btn.style.border = '1.5px solid #ef4444';
                    btn.style.background = '#fef2f2';
                    btn.style.color = '#b91c1c';
                    btn.style.animation = 'bptReminderPulse 2s infinite';
                    btn.innerHTML = '👉 Đã Xem và Làm';
                }

                btn.onclick = async () => {
                    if (btn.disabled || !btn.classList.contains('ktcl-unviewed-btn')) return;
                    try {
                        btn.disabled = true;
                        const saveRes = await fetch('/api/qlx/reminders/viewed', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                reminder_ids: [remId],
                                record_type: 'sewing_qc',
                                record_id: r.id
                            }),
                            credentials: 'include'
                        });
                        if (!saveRes.ok) {
                            const errData = await saveRes.json();
                            throw new Error(errData.error || 'Lỗi lưu nhắc nhở');
                        }
                        showToast('Đã xác nhận xem nhắc nhở', 'success');
                        btn.classList.remove('ktcl-unviewed-btn');
                        btn.style.border = '1.5px solid #10b981';
                        btn.style.background = '#ecfdf5';
                        btn.style.color = '#047857';
                        btn.style.animation = 'none';
                        btn.innerHTML = '✅ Đã Xem và Làm';
                        itemDiv.style.borderColor = '#10b981';
                        itemDiv.style.color = '#065f46';
                    } catch (err) {
                        btn.disabled = false;
                        showToast(err.message, 'error');
                    }
                };

                itemDiv.appendChild(btn);
                container.appendChild(itemDiv);
            });
        }
    } catch (err) {
        console.error('[QLX] Error loading QC reminders:', err);
    }
}

function _ktclResizeImage(file, maxW = 800, maxH = 800, quality = 0.6) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxW) {
                        height = Math.round((height * maxW) / width);
                        width = maxW;
                    }
                } else {
                    if (height > maxH) {
                        width = Math.round((width * maxH) / height);
                        height = maxH;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                }, 'image/jpeg', quality);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function _ktclUploadQCImages(event) {
    const files = event.target.files;
    if (!files.length) return;
    
    const statusEl = document.getElementById('ktclUploadStatus');
    try {
        if (statusEl) statusEl.textContent = 'Đang xử lý ảnh...';
        const fd = new FormData();
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
                const resized = await _ktclResizeImage(file, 800, 800, 0.6);
                fd.append('file', resized);
            } else {
                fd.append('file', file);
            }
        }
        
        if (statusEl) statusEl.textContent = 'Đang tải lên...';
        
        const res = await fetch(`/api/sewing/records/${_ktclState.currentRecordId}/images`, {
            method: 'POST',
            body: fd,
            credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi upload');
        
        showToast('Tải ảnh thành công!');
        if (statusEl) statusEl.textContent = `Đã tải lên ${data.images.length} ảnh.`;
        
        const container = document.getElementById('ktclQCImagesContainer');
        if (container) {
            container.innerHTML = data.images.map(src => `
                <div class="qc-image-wrapper">
                    <img src="${src}" onclick="window.open('${src}', '_blank')">
                    <button onclick="_ktclDeleteQCImage('${src}')" class="qc-image-delete-btn">✕</button>
                </div>
            `).join('');
        }
        
        const r = _ktclState.originalRecords.find(x => x.id === _ktclState.currentRecordId);
        if (r) r.finish_images = JSON.stringify(data.images);
        
    } catch(err) {
        showToast(err.message || 'Lỗi tải lên', 'error');
        if (statusEl) statusEl.textContent = 'Lỗi tải ảnh!';
    }
}

async function _ktclDeleteQCImage(imgSrc) {
    const r = _ktclState.originalRecords.find(x => x.id === _ktclState.currentRecordId);
    if (!r) return;
    
    let currentImgs = [];
    try {
        currentImgs = JSON.parse(r.finish_images || '[]');
    } catch(e) {}
    
    const updatedImgs = currentImgs.filter(src => src !== imgSrc);
    
    try {
        await apiCall(`/api/sewing/records/${_ktclState.currentRecordId}/field`, 'PATCH', {
            field: 'finish_images',
            value: JSON.stringify(updatedImgs)
        });
        
        r.finish_images = JSON.stringify(updatedImgs);
        showToast('Đã xóa ảnh.');
        
        const container = document.getElementById('ktclQCImagesContainer');
        if (container) {
            if (updatedImgs.length === 0) {
                container.innerHTML = '<span style="color:#94a3b8; font-style:italic;">Chưa có ảnh chụp thực tế.</span>';
            } else {
                container.innerHTML = updatedImgs.map(src => `
                    <div class="qc-image-wrapper">
                        <img src="${src}" onclick="window.open('${src}', '_blank')">
                        <button onclick="_ktclDeleteQCImage('${src}')" class="qc-image-delete-btn">✕</button>
                    </div>
                `).join('');
            }
        }
    } catch(err) {
        showToast('Lỗi khi xóa ảnh: ' + err.message, 'error');
    }
}

async function _ktclUploadEvidenceImages(event) {
    const files = event.target.files;
    if (!files.length) return;
    
    const statusEl = document.getElementById('ktclEvidenceUploadStatus');
    try {
        if (statusEl) statusEl.textContent = 'Đang xử lý ảnh...';
        const fd = new FormData();
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
                const resized = await _ktclResizeImage(file, 800, 800, 0.6);
                fd.append('file', resized);
            } else {
                fd.append('file', file);
            }
        }
        
        if (statusEl) statusEl.textContent = 'Đang tải lên...';
        
        const res = await fetch(`/api/sewing/records/${_ktclState.currentRecordId}/evidence-images`, {
            method: 'POST',
            body: fd,
            credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi upload');
        
        showToast('Tải ảnh dẫn chứng thành công!');
        if (statusEl) statusEl.textContent = `Đã tải lên ${data.images.length} ảnh dẫn chứng.`;
        
        const container = document.getElementById('ktclQCEvidenceImagesContainer');
        if (container) {
            container.innerHTML = data.images.map(src => `
                <div class="qc-image-wrapper">
                    <img src="${src}" onclick="window.open('${src}', '_blank')">
                    <button onclick="_ktclDeleteEvidenceImage('${src}')" class="qc-image-delete-btn">✕</button>
                </div>
            `).join('');
        }
        
        const r = _ktclState.originalRecords.find(x => x.id === _ktclState.currentRecordId);
        if (r) r.qc_evidence_images = JSON.stringify(data.images);
        
    } catch(err) {
        showToast(err.message || 'Lỗi tải lên', 'error');
        if (statusEl) statusEl.textContent = 'Lỗi tải ảnh!';
    }
}

async function _ktclDeleteEvidenceImage(imgSrc) {
    const r = _ktclState.originalRecords.find(x => x.id === _ktclState.currentRecordId);
    if (!r) return;
    
    let currentImgs = [];
    try {
        currentImgs = JSON.parse(r.qc_evidence_images || '[]');
    } catch(e) {}
    
    const updatedImgs = currentImgs.filter(src => src !== imgSrc);
    
    try {
        await apiCall(`/api/sewing/records/${_ktclState.currentRecordId}/field`, 'PATCH', {
            field: 'qc_evidence_images',
            value: JSON.stringify(updatedImgs)
        });
        
        r.qc_evidence_images = JSON.stringify(updatedImgs);
        showToast('Đã xóa ảnh dẫn chứng.');
        
        const container = document.getElementById('ktclQCEvidenceImagesContainer');
        if (container) {
            if (updatedImgs.length === 0) {
                container.innerHTML = '<span style="color:#94a3b8; font-style:italic;">Chưa có ảnh dẫn chứng.</span>';
            } else {
                container.innerHTML = updatedImgs.map(src => `
                    <div class="qc-image-wrapper">
                        <img src="${src}" onclick="window.open('${src}', '_blank')">
                        <button onclick="_ktclDeleteEvidenceImage('${src}')" class="qc-image-delete-btn">✕</button>
                    </div>
                `).join('');
            }
        }
    } catch(err) {
        showToast('Lỗi khi xóa ảnh: ' + err.message, 'error');
    }
}

async function _ktclUploadMissingPriceImages(event) {
    const files = event.target.files;
    if (!files.length) return;
    
    const statusEl = document.getElementById('ktclMissingPriceEvidenceUploadStatus');
    try {
        if (statusEl) statusEl.textContent = 'Đang xử lý ảnh...';
        const fd = new FormData();
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
                const resized = await _ktclResizeImage(file, 800, 800, 0.6);
                fd.append('file', resized);
            } else {
                fd.append('file', file);
            }
        }
        
        if (statusEl) statusEl.textContent = 'Đang tải lên...';
        
        const res = await fetch(`/api/sewing/records/${_ktclState.currentRecordId}/missing-price-images`, {
            method: 'POST',
            body: fd,
            credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi upload');
        
        showToast('Tải ảnh thiếu kỹ thuật thành công!');
        if (statusEl) statusEl.textContent = `Đã tải lên ${data.images.length} ảnh thiếu kỹ thuật.`;
        
        _ktclRenderMissingPriceEvidenceImages(JSON.stringify(data.images));
        
        const r = _ktclState.originalRecords.find(x => x.id === _ktclState.currentRecordId);
        if (r) r.qc_missing_price_images = JSON.stringify(data.images);
        
    } catch(err) {
        showToast(err.message || 'Lỗi tải lên', 'error');
        if (statusEl) statusEl.textContent = 'Lỗi tải ảnh!';
    }
}

function _ktclRenderMissingPriceEvidenceImages(imagesStr) {
    const container = document.getElementById('ktclQCMissingPriceEvidenceImagesContainer');
    if (!container) return;
    
    let arr = [];
    try { arr = JSON.parse(imagesStr || '[]'); } catch(e) {}
    
    if (arr.length === 0) {
        container.innerHTML = '<span style="color:#94a3b8; font-style:italic;">Chưa có ảnh thiếu kỹ thuật.</span>';
    } else {
        container.innerHTML = arr.map(src => `
            <div class="qc-image-wrapper">
                <img src="${src}" onclick="window.open('${src}', '_blank')">
                <button onclick="_ktclDeleteMissingPriceEvidenceImage('${src}')" class="qc-image-delete-btn">✕</button>
            </div>
        `).join('');
    }
}

async function _ktclDeleteMissingPriceEvidenceImage(imgSrc) {
    const r = _ktclState.originalRecords.find(x => x.id === _ktclState.currentRecordId);
    if (!r) return;
    
    let currentImgs = [];
    try {
        currentImgs = JSON.parse(r.qc_missing_price_images || '[]');
    } catch(e) {}
    
    const updatedImgs = currentImgs.filter(src => src !== imgSrc);
    
    try {
        await apiCall(`/api/sewing/records/${_ktclState.currentRecordId}/field`, 'PATCH', {
            field: 'qc_missing_price_images',
            value: JSON.stringify(updatedImgs)
        });
        
        r.qc_missing_price_images = JSON.stringify(updatedImgs);
        showToast('Đã xóa ảnh thiếu kỹ thuật.');
        _ktclRenderMissingPriceEvidenceImages(JSON.stringify(updatedImgs));
        
        const statusEl = document.getElementById('ktclMissingPriceEvidenceUploadStatus');
        if (statusEl) {
            statusEl.textContent = updatedImgs.length > 0 ? `Đã tải lên ${updatedImgs.length} ảnh thiếu kỹ thuật.` : 'Chưa chọn ảnh';
        }
    } catch(err) {
        showToast('Lỗi khi xóa ảnh: ' + err.message, 'error');
    }
}

async function _ktclSubmitQC() {
    // Validation: Must view all reminders
    const unviewedBtns = document.querySelectorAll('#ktclQcRemindersContainer .ktcl-unviewed-btn');
    if (unviewedBtns.length > 0) {
        showToast('🔔 Bạn phải bấm xác nhận "Đã Xem và Làm" tất cả các nhắc nhở trước khi Xác Nhận!', 'error');
        return;
    }

    const isMissingPrice = document.getElementById('ktclMissingPriceCheckbox').checked;
    let finalNotes = '';

    if (isMissingPrice) {
        const details = document.getElementById('ktclMissingPriceDetails').value.trim();
        if (!details) {
            showToast('Vui lòng nhập chi tiết phần thiếu giá!', 'error');
            return;
        }
        finalNotes = `[THIẾU GIÁ CHI TIẾT] ${details}`;
    } else {
        finalNotes = document.getElementById('ktclQCNotes') ? document.getElementById('ktclQCNotes').value.trim() : '';
    }

    const r = _ktclState.originalRecords.find(x => x.id === _ktclState.currentRecordId);
    const isTeam = !!(r && r.sewing_team_id !== null && r.sewing_team_id !== undefined && !r.contractor_id);
    const cpVal = isTeam 
        ? document.getElementById('ktclCheckedPriceInput').value 
        : document.getElementById('ktclCheckedGCPriceInput').value;

    const checkboxes = document.querySelectorAll('.ktcl-tech-cb');
    const checkedIds = [];
    checkboxes.forEach(cb => {
        if (cb.checked) {
            checkedIds.push(Number(cb.dataset.id));
        }
    });

    const isAlreadyDone = !!(r && r.done_date);

    // Validation: QC Checklist answers are mandatory if NOT missing price
    const qcRows = document.querySelectorAll('.ktcl-qc-question-row');
    const qcAnswers = [];
    
    if (!isMissingPrice && qcRows.length > 0) {
        for (const row of qcRows) {
            const qId = Number(row.dataset.id);
            const qType = row.dataset.type;
            let val = '';
            
            if (qType === 'yes_no') {
                const selectedRadio = row.querySelector(`.ktcl-qc-radio[name="ktcl_question_${qId}"]:checked`);
                if (!selectedRadio) {
                    showToast('Vui lòng trả lời đầy đủ các câu hỏi QC!', 'error');
                    return;
                }
                val = selectedRadio.value;
            } else if (qType === 'percentage') {
                const rangeInput = row.querySelector(`.ktcl-qc-range[name="ktcl_question_${qId}"]`);
                val = rangeInput ? rangeInput.value : '50';
            } else {
                const txtInput = row.querySelector('.ktcl-qc-text-input');
                val = txtInput ? txtInput.value.trim() : '';
                if (!val) {
                    showToast('Vui lòng nhập đầy đủ câu trả lời cho các câu hỏi QC!', 'error');
                    if (txtInput) txtInput.focus();
                    return;
                }
            }
            qcAnswers.push({ template_id: qId, answer_value: val });
        }
    } else if (isMissingPrice && qcRows.length > 0) {
        // If missing price, collect whatever they answered so far (optional)
        for (const row of qcRows) {
            const qId = Number(row.dataset.id);
            const qType = row.dataset.type;
            let val = '';
            if (qType === 'yes_no') {
                const selectedRadio = row.querySelector(`.ktcl-qc-radio[name="ktcl_question_${qId}"]:checked`);
                val = selectedRadio ? selectedRadio.value : '';
            } else if (qType === 'percentage') {
                const rangeInput = row.querySelector(`.ktcl-qc-range[name="ktcl_question_${qId}"]`);
                val = rangeInput ? rangeInput.value : '50';
            } else {
                const txtInput = row.querySelector('.ktcl-qc-text-input');
                val = txtInput ? txtInput.value.trim() : '';
            }
            if (val) {
                qcAnswers.push({ template_id: qId, answer_value: val });
            }
        }
    }

    // Validation: Checked price must be >= 0 if techniques ticked, otherwise > 0 if NOT missing price
    const hasCheckedTechs = checkboxes.length > 0 && checkedIds.length > 0;
    const isValidPrice = hasCheckedTechs ? (Number(cpVal) >= 0) : (Number(cpVal) > 0);
    if (!isMissingPrice && (!cpVal || !isValidPrice)) {
        showToast('Vui lòng nhập Giá Kiểm Tra hợp lệ trước khi hoàn thành đơn!', 'error');
        return;
    }

    // Validation: Must select at least 1 technique if checkboxes exist and NOT missing price
    if (!isMissingPrice && checkboxes.length > 0 && checkedIds.length === 0) {
        showToast('Vui lòng tích chọn ít nhất 1 kỹ thuật may!', 'error');
        return;
    }

    // Validation: QC Image is mandatory if NOT missing price
    if (!isMissingPrice) {
        const finishImagesStr = r ? (r.finish_images || '[]') : '[]';
        let imagesArr = [];
        try { imagesArr = JSON.parse(finishImagesStr); } catch(e){}
        if (!imagesArr || imagesArr.length === 0) {
            showToast('Vui lòng chụp/tải ảnh QC thành phẩm trước khi xác nhận!', 'error');
            return;
        }
    }

    if (isMissingPrice) {
        const mpEvidImagesStr = r ? (r.qc_missing_price_images || '[]') : '[]';
        let mpEvidImagesArr = [];
        try { mpEvidImagesArr = JSON.parse(mpEvidImagesStr); } catch(e){}
        if (!mpEvidImagesArr || mpEvidImagesArr.length === 0) {
            showToast('⚠️ Vui lòng chụp/tải lên "Ảnh Thiếu Kỹ Thuật"!', 'error');
            return;
        }
    }

    // Validation: Must provide notes & evidence image if not all techniques checked
    const isNotAllTechs = checkboxes.length > 0 && checkedIds.length > 0 && checkedIds.length < checkboxes.length;
    if (!isMissingPrice && isNotAllTechs) {
        const missingNotesVal = document.getElementById('ktclQCMissingNotes').value.trim();
        if (!missingNotesVal) {
            showToast('⚠️ Vui lòng nhập lý do/nội dung giải trình tại mục "Thiếu chi tiết kỹ thuật nào mà không tích đánh dấu"!', 'error');
            document.getElementById('ktclQCMissingNotes').focus();
            return;
        }
        
        const evidImagesStr = r ? (r.qc_evidence_images || '[]') : '[]';
        let evidImagesArr = [];
        try { evidImagesArr = JSON.parse(evidImagesStr); } catch(e){}
        if (!evidImagesArr || evidImagesArr.length === 0) {
            showToast('⚠️ Vui lòng chụp/tải lên "Ảnh Dẫn Chứng Thiếu"!', 'error');
            return;
        }
    }

    try {
        // Save QC Checklist Answers
        if (qcAnswers.length > 0) {
            await apiCall(`/api/qc/checklist/answers/${_ktclState.currentRecordId}`, 'POST', { answers: qcAnswers });
        }

        // Save checked_price
        await apiCall(`/api/sewing/records/${_ktclState.currentRecordId}/field`, 'PATCH', {
            field: 'checked_price',
            value: cpVal ? Number(cpVal) : null
        });

        // Save sew_notes (Ghi chú quản lý may)
        const genNotesVal = document.getElementById('ktclQCNotes') ? document.getElementById('ktclQCNotes').value.trim() : '';
        await apiCall(`/api/sewing/records/${_ktclState.currentRecordId}/field`, 'PATCH', {
            field: 'sew_notes',
            value: genNotesVal || null
        });

        // Save notes (Thiếu giá chi tiết or preserve/clear QLX note)
        const preservedNotes = (r && r.notes && !r.notes.startsWith('[THIẾU GIÁ CHI TIẾT]')) ? r.notes : null;
        await apiCall(`/api/sewing/records/${_ktclState.currentRecordId}/field`, 'PATCH', {
            field: 'notes',
            value: isMissingPrice ? finalNotes : preservedNotes
        });

        // Save qc_missing_notes
        await apiCall(`/api/sewing/records/${_ktclState.currentRecordId}/field`, 'PATCH', {
            field: 'qc_missing_notes',
            value: isNotAllTechs ? document.getElementById('ktclQCMissingNotes').value.trim() : null
        });

        // Save qc_evidence_images
        const evidenceImagesVal = r ? (r.qc_evidence_images || '[]') : '[]';
        await apiCall(`/api/sewing/records/${_ktclState.currentRecordId}/field`, 'PATCH', {
            field: 'qc_evidence_images',
            value: isNotAllTechs ? evidenceImagesVal : '[]'
        });

        // Save qc_missing_price_images
        const mpEvidenceImagesVal = r ? (r.qc_missing_price_images || '[]') : '[]';
        await apiCall(`/api/sewing/records/${_ktclState.currentRecordId}/field`, 'PATCH', {
            field: 'qc_missing_price_images',
            value: isMissingPrice ? mpEvidenceImagesVal : '[]'
        });

        // Save checked_techniques
        if (checkboxes.length > 0) {
            await apiCall(`/api/sewing/records/${_ktclState.currentRecordId}/field`, 'PATCH', {
                field: 'checked_techniques',
                value: JSON.stringify(checkedIds)
            });
        } else {
            await apiCall(`/api/sewing/records/${_ktclState.currentRecordId}/field`, 'PATCH', {
                field: 'checked_techniques',
                value: null
            });
        }

        // Automatically mark done if not already done
        if (!isAlreadyDone) {
            await apiCall(`/api/sewing/toggle/${_ktclState.currentRecordId}`, 'POST', { action: 'mark_done' });
            if (isMissingPrice) {
                showToast('Đã ghi nhận báo thiếu kỹ thuật may và hoàn thành đơn!');
            } else {
                showToast('Đã lưu thông tin và hoàn thành đơn may!');
            }
        } else {
            if (isMissingPrice) {
                showToast('Đã cập nhật báo thiếu kỹ thuật may!');
            } else {
                showToast('Đã lưu thông tin kiểm tra!');
            }
        }

        // Send Telegram Notification
        try {
            await apiCall(`/api/qc/checklist/notify/${_ktclState.currentRecordId}`, 'POST');
        } catch (tgErr) {
            console.error('Lỗi gửi Telegram:', tgErr);
        }

        _ktclCloseModal('ktclQCModal');
        await _ktclLoadData();
    } catch(err) {
        showToast(err.message, 'error');
    }
}

// Complete sewing done / Undo done
async function _ktclToggleDone(recordId, action) {
    if (action === 'mark_done') {
        const r = _ktclState.originalRecords.find(x => x.id === recordId);
        if (r) {
            const isMissingPrice = !!(r.notes && r.notes.startsWith('[THIẾU GIÁ CHI TIẾT]'));
            let hasCheckedTechs = false;
            if (r.checked_techniques) {
                try {
                    const parsed = JSON.parse(r.checked_techniques);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        hasCheckedTechs = true;
                    }
                } catch (e) {}
            }
            const isValidPrice = (isMissingPrice || hasCheckedTechs) ? (Number(r.checked_price) >= 0) : (Number(r.checked_price) > 0);
            if (!isValidPrice) {
                _ktclOpenQCModal(recordId);
                showToast('Vui lòng nhập Giá Kiểm Tra trước khi hoàn thành đơn!', 'error');
                return;
            }
        }
    }
    
    try {
        await apiCall(`/api/sewing/toggle/${recordId}`, 'POST', { action });
        showToast(action === 'mark_done' ? '✅ Đã hoàn thành đơn may!' : '↩️ Đã hoàn tác!');
        await _ktclLoadData();
    } catch(err) {
        showToast(err.message || 'Lỗi', 'error');
    }
}

// Resolve error (mark as fixed)
async function _ktclResolveError(recordId) {
    if (!confirm('Bạn có chắc chắn đã sửa xong lỗi cho đơn này?')) return;
    try {
        await apiCall(`/api/sewing/toggle/${recordId}`, 'POST', { action: 'resolve_error' });
        showToast('✅ Đã sửa xong lỗi!');
        await _ktclLoadData();
    } catch(err) {
        showToast(err.message || 'Lỗi', 'error');
    }
}

// Report Error Action (Sets error_reported = true)
window._blErrorDesktopImages = [];
window._blErrorDesktopVideo = null;
let currentBlDesktopRecordId = null;

function _ktclBlDesktopRenderImagePreviews() {
    const container = document.getElementById('ktclBlDesktopImagesContainer');
    if (!container) return;
    container.innerHTML = '';
    window._blErrorDesktopImages.forEach((file, index) => {
        const url = URL.createObjectURL(file);
        container.innerHTML += `
            <div class="qc-image-wrapper" style="position:relative; width:80px; height:80px;">
                <img src="${url}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">
                <button onclick="_ktclBlDesktopRemoveImage(${index})" class="qc-image-delete-btn" style="position:absolute; top:4px; right:4px;">✕</button>
            </div>
        `;
    });
}

function _ktclBlDesktopRemoveImage(index) {
    window._blErrorDesktopImages.splice(index, 1);
    _ktclBlDesktopRenderImagePreviews();
    const statusEl = document.getElementById('ktclBlDesktopUploadStatus');
    if (statusEl) {
        statusEl.textContent = window._blErrorDesktopImages.length > 0 ? `Đã chọn ${window._blErrorDesktopImages.length} ảnh.` : 'Chưa chọn ảnh';
    }
}

async function _ktclUploadBlDesktopImages(event) {
    const files = event.target.files;
    if (!files.length) return;
    const statusEl = document.getElementById('ktclBlDesktopUploadStatus');
    if (statusEl) statusEl.textContent = 'Đang xử lý ảnh...';
    try {
        const p = [];
        for (let i = 0; i < files.length; i++) {
            p.push(_ktclResizeImage(files[i], 800, 800, 0.6));
        }
        const resized = await Promise.all(p);
        window._blErrorDesktopImages = window._blErrorDesktopImages.concat(resized);
        _ktclBlDesktopRenderImagePreviews();
        if (statusEl) statusEl.textContent = `Đã chọn ${window._blErrorDesktopImages.length} ảnh.`;
    } catch (e) {
        showToast('Lỗi xử lý ảnh: ' + e.message, 'error');
        if (statusEl) statusEl.textContent = 'Lỗi ảnh!';
    }
    event.target.value = '';
}

function _ktclUploadBlDesktopVideo(event) {
    const file = event.target.files[0];
    const statusEl = document.getElementById('ktclBlDesktopVideoStatus');
    if (file) {
        window._blErrorDesktopVideo = file;
        if (statusEl) statusEl.textContent = 'Đã chọn video.';
    } else {
        window._blErrorDesktopVideo = null;
        if (statusEl) statusEl.textContent = 'Chưa chọn video';
    }
}

async function _ktclOpenBaoLoiModal(recordId) {
    const r = _ktclState.originalRecords.find(x => x.id === recordId);
    if (!r) return;
    
    currentBlDesktopRecordId = recordId;
    window._blErrorDesktopImages = [];
    window._blErrorDesktopVideo = null;

    let reporterName = 'BP Kiểm Tra Chất Lượng';
    if (typeof currentUser !== 'undefined' && currentUser) {
        if (currentUser.role === 'giam_doc') {
            reporterName = 'Giám Đốc - BP Kiểm Tra Chất Lượng';
        } else {
            reporterName = 'BP Kiểm Tra Chất Lượng - ' + (currentUser.full_name || currentUser.username || 'Nhân viên');
        }
    }

    const modalHtml = `
        <div class="bpm-modal-overlay show" id="ktclBaoLoiModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:80px;overflow-y:auto">
            <div style="background:#fff;border-radius:16px;width:650px;max-width:95vw;box-shadow:0 25px 50px rgba(0,0,0,0.25);overflow:hidden;animation:qlxSlideUp .3s;margin-bottom:40px;">
                <div style="background:linear-gradient(135deg,#ef4444,#b91c1c);color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:center">
                    <div style="font-weight:800; font-size:16px; display:flex; align-items:center; gap:8px;">
                        <span>🚨 Báo Đơn Lỗi - Bộ Phận Kiểm Tra Chất Lượng</span>
                    </div>
                    <button onclick="_ktclCloseModal('ktclBaoLoiModal')" style="background:none; border:none; color:white; font-size:20px; cursor:pointer; font-weight:bold;">✕</button>
                </div>
                
                <div style="padding:24px; display:flex; flex-direction:column; gap:16px; background:#f8fafc; max-height: 70vh; overflow-y: auto;">
                    <!-- Thông tin đơn hàng -->
                    <div style="background:#fff; border: 1.5px solid #e2e8f0; border-radius:12px; padding:16px; display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                        <div style="font-size:13px; color:#475569;"><strong>Mã Đơn:</strong> <span style="color:#1e3a8a; font-weight:700;">${r.order_code || '—'}</span></div>
                        <div style="font-size:13px; color:#475569;"><strong>Khách Hàng:</strong> <span style="color:#1e293b; font-weight:700;">${r.customer_name || '—'}</span></div>
                        <div style="font-size:13px; color:#475569; grid-column: span 2;"><strong>Sản phẩm:</strong> <span style="color:#1e293b; font-weight:700;">${_ktclCleanProdName(r)}</span></div>
                        <div style="font-size:13px; color:#475569;"><strong>CSKH:</strong> <span style="color:#1e293b; font-weight:700;">${r.cskh_name || '—'}</span></div>
                        <div style="font-size:13px; color:#475569;"><strong>SL Sản Xuất:</strong> <span style="color:#10b981; font-weight:700;">${r.quantity || r.order_qty || 0}</span></div>
                        <div style="font-size:13px; color:#475569; grid-column: span 2;"><strong>Người Báo Lỗi:</strong> <span style="color:#c084fc; font-weight:700;">${reporterName}</span></div>
                    </div>

                    <!-- Input số lượng lỗi -->
                    <div class="form-group">
                        <label class="form-label" style="color:#ef4444; font-weight:700;">Số lượng lỗi <span style="color:#ef4444;">*</span></label>
                        <input type="number" id="ktclBlDesktopErrorQty" class="form-input" placeholder="Nhập số lượng sản phẩm lỗi..." min="1" style="background:#fff !important;">
                    </div>

                    <!-- Nội dung chi tiết lỗi -->
                    <div class="form-group">
                        <label class="form-label" style="color:#ef4444; font-weight:700;">Nội dung chi tiết lỗi <span style="color:#ef4444;">*</span></label>
                        <textarea id="ktclBlDesktopErrorContent" class="form-input" rows="3" placeholder="Mô tả chi tiết các lỗi phát hiện..." style="background:#fff !important;"></textarea>
                    </div>

                    <!-- Hình ảnh minh họa bắt buộc -->
                    <div class="form-group">
                        <label class="form-label" style="color:#ef4444; font-weight:700;">Hình Ảnh Minh Họa <span style="color:#ef4444;">*</span></label>
                        <div style="display:flex; gap:12px; align-items:center; margin-bottom: 12px;">
                            <button class="ktcl-btn-sm ktcl-btn-outline" style="padding:8px 14px; font-weight:700; border-color:#fca5a5; color:#ef4444;" onclick="document.getElementById('ktclBlDesktopFileInput').click()">📸 Tải ảnh lên</button>
                            <span style="font-size:12px; color:#64748b;" id="ktclBlDesktopUploadStatus">Chưa chọn ảnh</span>
                            <input type="file" multiple id="ktclBlDesktopFileInput" accept="image/*" style="display:none;" onchange="_ktclUploadBlDesktopImages(event)">
                        </div>
                        <div style="display:flex; gap:8px; flex-wrap:wrap;" id="ktclBlDesktopImagesContainer"></div>
                    </div>

                    <!-- Video minh họa không bắt buộc -->
                    <div class="form-group">
                        <label class="form-label">Video Minh Họa (Không bắt buộc)</label>
                        <div style="display:flex; gap:12px; align-items:center; margin-bottom: 12px;">
                            <button class="ktcl-btn-sm ktcl-btn-outline" style="padding:8px 14px; font-weight:700;" onclick="document.getElementById('ktclBlDesktopVideoInput').click()">🎥 Tải video lên</button>
                            <span style="font-size:12px; color:#64748b;" id="ktclBlDesktopVideoStatus">Chưa chọn video</span>
                            <input type="file" id="ktclBlDesktopVideoInput" accept="video/*" style="display:none;" onchange="_ktclUploadBlDesktopVideo(event)">
                        </div>
                    </div>
                </div>

                <div style="padding:16px 24px; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:12px; border-radius: 0 0 16px 16px;">
                    <button onclick="_ktclCloseModal('ktclBaoLoiModal')" class="ktcl-btn-sm ktcl-btn-outline" style="padding:10px 20px; font-weight:700;">Hủy</button>
                    <button onclick="_ktclSubmitBaoLoiDesktop()" class="ktcl-btn-sm ktcl-btn-danger" style="padding:10px 24px; font-weight:700; background:linear-gradient(135deg,#ef4444,#dc2626); color:#fff; border:none; border-radius:8px; cursor:pointer;">🚨 Báo Lỗi</button>
                </div>
            </div>
        </div>
    `;

    _ktclCloseModal('ktclBaoLoiModal');
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function _ktclSubmitBaoLoiDesktop() {
    const qtyVal = document.getElementById('ktclBlDesktopErrorQty').value;
    const qty = Number(qtyVal) || 0;
    if (qty <= 0) {
        showToast('⚠️ Vui lòng nhập số lượng lỗi hợp lệ!', 'error');
        return;
    }

    const content = document.getElementById('ktclBlDesktopErrorContent').value.trim();
    if (!content) {
        showToast('⚠️ Vui lòng mô tả chi tiết lỗi!', 'error');
        return;
    }

    if (window._blErrorDesktopImages.length === 0) {
        showToast('⚠️ Vui lòng tải lên ít nhất 1 ảnh minh họa bắt buộc!', 'error');
        return;
    }

    const r = _ktclState.originalRecords.find(x => x.id === currentBlDesktopRecordId);
    if (!r) return;

    try {
        let today = _ktclGetVnTodayStr();

        let reporterName = 'BP Kiểm Tra Chất Lượng';
        if (typeof currentUser !== 'undefined' && currentUser) {
            if (currentUser.role === 'giam_doc') {
                reporterName = 'Giám Đốc - BP Kiểm Tra Chất Lượng';
            } else {
                reporterName = 'BP Kiểm Tra Chất Lượng - ' + (currentUser.full_name || currentUser.username || 'Nhân viên');
            }
        }

        const body = {
            report_date: today,
            common_error_type: '',
            order_code: r.order_code,
            cskh_name: reporterName,
            error_quantity: qty,
            error_content: content,
            dht_order_id: r.dht_order_id,
            customer_name: r.customer_name,
            production_quantity: r.quantity || r.order_qty || 0,
            error_department: null,
            error_type: 'Nội Bộ'
        };

        const result = await apiCall('/api/customer-errors', 'POST', body);
        if (result.error) throw new Error(result.error);

        // Upload hình ảnh
        if (window._blErrorDesktopImages.length > 0 && result.id) {
            const fd = new FormData();
            window._blErrorDesktopImages.forEach((file, index) => {
                fd.append('file_' + index, file, `image_${index}.jpeg`);
            });
            await fetch('/api/customer-errors/' + result.id + '/images', {
                method: 'POST',
                body: fd,
                credentials: 'include'
            });
        }

        // Upload video
        if (window._blErrorDesktopVideo && result.id) {
            const fdv = new FormData();
            fdv.append('video', window._blErrorDesktopVideo);
            await fetch('/api/customer-errors/' + result.id + '/video', {
                method: 'POST',
                body: fdv,
                credentials: 'include'
            });
        }

        // Cập nhật trạng thái sewing record
        await apiCall('/api/sewing/toggle/' + currentBlDesktopRecordId, 'POST', {
            action: 'report_error',
            error_order_id: result.id
        });

        showToast('⚠️ Đã báo đơn lỗi thành công!');
        _ktclCloseModal('ktclBaoLoiModal');
        await _ktclLoadData();
    } catch(e) {
        showToast(e.message, 'error');
    }
}

async function _ktclReportError(recordId) {
    _ktclOpenBaoLoiModal(recordId);
}

// Image Viewer Modal
function _ktclCloseModal(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function _ktclViewFullImage(src, recordId) {
    const modalHtml = `
        <div class="bpm-modal-overlay show" id="ktclImageOverlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.8);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:40px;" onclick="_ktclCloseModal('ktclImageOverlay')">
            <div style="position:relative; max-width:90vw; max-height:90vh; text-align:center;" onclick="event.stopPropagation()">
                <img src="${src}" style="max-width:100%; max-height:80vh; object-fit:contain; border-radius:8px; border:3px solid white; box-shadow:0 25px 50px rgba(0,0,0,0.5);">
                <div style="margin-top:12px; color:white; font-size:13px; font-weight:700;">Ảnh chụp thực tế đơn may #${recordId}</div>
                <button onclick="_ktclCloseModal('ktclImageOverlay')" style="position:absolute; top:-30px; right:0; background:none; border:none; color:white; font-size:24px; cursor:pointer; font-weight:700;">✕</button>
            </div>
        </div>
    `;
    _ktclCloseModal('ktclImageOverlay');
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Toggle Simulator Panel
function _ktclToggleSimulator() {
    _ktclState.showSimulator = !_ktclState.showSimulator;
    const panel = document.getElementById('ktclSimulatorPanel');
    const button = document.querySelector('.ktcl-btn-secondary');
    if (panel) {
        if (_ktclState.showSimulator) {
            panel.style.display = 'flex';
            if (button) button.style.background = '#cbd5e1';
        } else {
            panel.style.display = 'none';
            if (button) button.style.background = '#ffffff';
        }
    }
}

// Filters listeners
function _ktclHandleSearch(val) {
    _ktclState.currentPage = 1;
    _ktclState.search = val;
    
    if (_ktclState.activeTab === '4') {
        const searchVal = val.trim();
        if (searchVal !== '') {
            let changed = false;
            
            // 1. Reset team filter to "All" (Tất cả tổ/gia công)
            if (_ktclState.teamFilterVal !== '') {
                _ktclState.teamFilterVal = '';
                const teamSel = document.getElementById('ktclTeamFilter');
                if (teamSel) teamSel.value = '';
                changed = true;
            }
            
            // 2. Reset time filter to "All" (Tất cả)
            if (_ktclState.timeFilterVal !== 'all') {
                _ktclState.timeFilterVal = 'all';
                const timeSel = document.getElementById('ktclTimeFilter');
                if (timeSel) timeSel.value = 'all';
                
                const customDateContainer = document.getElementById('ktclCustomDateContainer');
                const customMonthContainer = document.getElementById('ktclCustomMonthContainer');
                if (customDateContainer) customDateContainer.style.display = 'none';
                if (customMonthContainer) customMonthContainer.style.display = 'none';
                changed = true;
            }
            
            if (changed) {
                _ktclLoadData();
                return;
            }
        } else {
            // If search is cleared, restore default filterTime
            if (_ktclState.timeFilterVal !== 'undone_past_today') {
                _ktclState.timeFilterVal = 'undone_past_today';
                const timeSel = document.getElementById('ktclTimeFilter');
                if (timeSel) timeSel.value = 'undone_past_today';
                
                const customDateContainer = document.getElementById('ktclCustomDateContainer');
                const customMonthContainer = document.getElementById('ktclCustomMonthContainer');
                if (customDateContainer) customDateContainer.style.display = 'none';
                if (customMonthContainer) customMonthContainer.style.display = 'none';
                
                _ktclLoadData();
                return;
            }
        }
    }
    _ktclRenderTable();
}

function _ktclFilterTeam(val) {
    _ktclState.currentPage = 1;
    _ktclState.teamFilterVal = val;
    _ktclRenderTable();
}

// Filters listeners
function _ktclHandleMissingTechFilterChange(checked) {
    _ktclState.currentPage = 1;
    _ktclState.filterMissingTech = checked;
    _ktclRenderTable();
}

function _ktclHandleTimeFilterChange(val) {
    _ktclState.currentPage = 1;
    _ktclState.timeFilterVal = val;
    
    const customDateContainer = document.getElementById('ktclCustomDateContainer');
    const customMonthContainer = document.getElementById('ktclCustomMonthContainer');
    
    if (customDateContainer) customDateContainer.style.display = val === 'custom_date' ? 'flex' : 'none';
    if (customMonthContainer) customMonthContainer.style.display = val === 'custom_month' ? 'flex' : 'none';
    
    if (val === 'custom_date') {
        const dateInput = document.getElementById('ktclDoneDate');
        if (dateInput && !dateInput.value) {
            dateInput.value = _ktclGetVnTodayStr();
            _ktclState.doneDate = dateInput.value;
        }
    } else if (val === 'custom_month') {
        const monthInput = document.getElementById('ktclDoneMonth');
        if (monthInput && !monthInput.value) {
            const todayStr = _ktclGetVnTodayStr();
            monthInput.value = todayStr.substring(0, 7);
            _ktclState.doneMonth = monthInput.value;
        }
    }
    
    _ktclLoadData();
}

function _ktclHandleCustomDateChange(val) {
    _ktclState.currentPage = 1;
    _ktclState.doneDate = val;
    _ktclLoadData();
}

function _ktclHandleCustomMonthChange(val) {
    _ktclState.currentPage = 1;
    _ktclState.doneMonth = val;
    _ktclLoadData();
}

// ========== QC CHECKLIST SETUP (Giám Đốc) ==========
async function _ktclChecklistSetup() {
    try {
        const data = await apiCall('/api/qc/checklist/templates/all');
        const templates = data.templates || [];
        let html = '<div style="padding:20px"><h3 style="margin:0 0 16px;color:#0f172a">⚙️ Quản Lý Checklist Kiểm Tra Chất Lượng (QC)</h3>';
        html += '<div style="background:#f8fafc;border-radius:10px;padding:14px;margin-bottom:20px;border:1px solid #e2e8f0">';
        html += '<div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:8px">➕ Thêm Mới Câu Hỏi/Checklist</div>';
        html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">';
        html += '<select id="_qcClNewType" style="padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px"><option value="yes_no">✔️ Câu hỏi (Có/Không)</option><option value="text">📝 Câu hỏi (Văn bản)</option><option value="percentage">📈 Thanh kéo (0% - 100%)</option></select>';
        html += '<input id="_qcClNewContent" placeholder="Nội dung câu hỏi..." style="flex:1;min-width:200px;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px">';
        html += '<input id="_qcClNewOrder" type="number" value="0" placeholder="TT" style="width:60px;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;text-align:center">';
        html += '<button onclick="_qcClAdd()" style="padding:8px 16px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer">Thêm</button>';
        html += '</div></div>';
        if (templates.length) {
            html += '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#f1f5f9"><th style="padding:8px;text-align:left">Loại</th><th style="padding:8px;text-align:left">Nội dung</th><th style="padding:8px;text-align:center">TT</th><th style="padding:8px;text-align:center">Trạng thái</th><th style="padding:8px;text-align:center">Thao tác</th></tr></thead><tbody>';
            templates.forEach(function(t) {
                let tp = '';
                if (t.type === 'yes_no') {
                    tp = '<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">✔️ Có/Không</span>';
                } else if (t.type === 'percentage') {
                    tp = '<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">📈 Thanh kéo (%)</span>';
                } else {
                    tp = '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">📝 Văn bản</span>';
                }
                const st = t.is_active ? '<span style="color:#059669;font-weight:700">Bật</span>' : '<span style="color:#dc2626;font-weight:700">Tắt</span>';
                html += `<tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px">${tp}</td><td style="padding:8px;font-weight:600">${t.content}</td><td style="padding:8px;text-align:center">${t.sort_order}</td><td style="padding:8px;text-align:center">${st}</td>`;
                html += `<td style="padding:8px;text-align:center"><button onclick="_qcClToggleActive(${t.id},${!t.is_active})" style="padding:4px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:10px;cursor:pointer;background:#fff;margin-right:4px">${t.is_active ? '🔇 Tắt' : '🔔 Bật'}</button>`;
                html += `<button onclick="_qcClDelete(${t.id})" style="padding:4px 10px;border:1px solid #fca5a5;border-radius:6px;font-size:10px;cursor:pointer;background:#fef2f2;color:#dc2626">🗑️ Xóa</button></td></tr>`;
            });
            html += '</tbody></table>';
        } else { html += '<div style="text-align:center;padding:30px;color:#94a3b8;font-size:13px">Chưa có câu hỏi nào</div>'; }
        html += '<div style="padding:16px 20px;border-top:1px solid #e2e8f0;text-align:right"><button onclick="document.getElementById(\'_qcSetupOverlay\').remove()" style="padding:8px 20px;background:#f1f5f9;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;color:#475569">Đóng</button></div>';
        html += '</div>';
        
        let old = document.getElementById('_qcSetupOverlay'); if (old) old.remove();
        let ov = document.createElement('div');
        ov.className = 'qlx-cl-overlay'; ov.id = '_qcSetupOverlay';
        ov.onclick = function(e) { if (e.target === ov) ov.remove(); };
        ov.innerHTML = '<div class="qlx-cl-popup" style="width:700px"><div class="qlx-cl-header"><h3>⚙️ Setup Checklist QC</h3><p>Quản lý câu hỏi kiểm tra chất lượng sản phẩm</p></div>' + html + '</div>';
        document.body.appendChild(ov);
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function _qcClAdd() {
    const t = document.getElementById('_qcClNewType').value;
    const c = document.getElementById('_qcClNewContent').value;
    const s = parseInt(document.getElementById('_qcClNewOrder').value) || 0;
    if (!c.trim()) return showToast('Nhập nội dung câu hỏi', 'error');
    try {
        await apiCall('/api/qc/checklist/templates', 'POST', { type: t, content: c, sort_order: s });
        showToast('✅ Đã thêm');
        _ktclChecklistSetup();
    } catch(e) { showToast(e.message, 'error'); }
}

async function _qcClToggleActive(id, val) {
    try {
        await apiCall('/api/qc/checklist/templates/' + id, 'PUT', { is_active: val });
        showToast('✅ Cập nhật');
        _ktclChecklistSetup();
    } catch(e) { showToast(e.message, 'error'); }
}

async function _qcClDelete(id) {
    if (!confirm('Xóa câu hỏi này?')) return;
    try {
        await apiCall('/api/qc/checklist/templates/' + id, 'DELETE');
        showToast('✅ Đã xóa');
        _ktclChecklistSetup();
    } catch(e) { showToast(e.message, 'error'); }
}

function _ktclPrevPage() {
    if (_ktclState.currentPage > 1) {
        _ktclState.currentPage--;
        _ktclRenderTable();
        document.querySelector('.ktcl-table-responsive')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function _ktclNextPage() {
    let filtered = _ktclState.originalRecords.slice();
    if (_ktclState.search) {
        const q = _ktclState.search.toLowerCase().trim();
        filtered = filtered.filter(r => 
            (r.order_code || '').toLowerCase().includes(q) ||
            (r.product_name || '').toLowerCase().includes(q) ||
            (r.cut_product_name || '').toLowerCase().includes(q)
        );
    }
    if (_ktclState.teamFilterVal) {
        if (_ktclState.teamFilterVal.startsWith('c_')) {
            const cid = Number(_ktclState.teamFilterVal.split('_')[1]);
            filtered = filtered.filter(r => r.contractor_id === cid);
        } else if (_ktclState.teamFilterVal.startsWith('t_')) {
            const tid = Number(_ktclState.teamFilterVal.split('_')[1]);
            filtered = filtered.filter(r => r.sewing_team_id === tid);
        }
    }
    if (_ktclState.activeTab === '4' && _ktclState.filterMissingTech) {
        filtered = filtered.filter(r => r.notes && r.notes.startsWith('[THIẾU GIÁ CHI TIẾT]'));
    }
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / 50) || 1;
    if (_ktclState.currentPage < totalPages) {
        _ktclState.currentPage++;
        _ktclRenderTable();
        document.querySelector('.ktcl-table-responsive')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function _ktclGoToPage(p) {
    _ktclState.currentPage = p;
    _ktclRenderTable();
    document.querySelector('.ktcl-table-responsive')?.scrollTo({ top: 0, behavior: 'smooth' });
}

