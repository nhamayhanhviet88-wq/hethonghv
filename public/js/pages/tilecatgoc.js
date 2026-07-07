// ========== TỈ LỆ CẮT GỐC — Desktop SPA ==========
var _tlcg = {
    materials: [],
    colors: [],
    ranges: [],
    stats: [],
    products: [],
    selectedRangeId: '',
    drawerRangeFilterId: '',
    drawerSegmentFilter: '',
    selectedGroup: 'ALL', // 'ALL', 'KG', 'MET', 'SAN'
    statsFilter: 'ALL', // 'ALL', 'CONFIGURED', 'UNCONFIGURED'
    filter: {
        search: ''
    },
    isGD: false,
    activeMaterial: null,
    expandedMonths: new Set(),
    sizeSegments: []
};

async function renderTilecatgocPage(content) {
    if (!content) content = document.getElementById('contentArea');
    if (!content) return;

    // Inject custom CSS
    if (!document.getElementById('_tlcgStyles')) {
        const style = document.createElement('style');
        style.id = '_tlcgStyles';
        style.textContent = `
            .tlcg-container {
                padding: 24px;
                background: #f8fafc;
                min-height: 100%;
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                animation: tlcgFadeIn 0.3s ease-out;
            }
            @keyframes tlcgFadeIn {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .tlcg-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 24px;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 16px;
                gap: 16px;
                flex-wrap: wrap;
            }
            .tlcg-title-area h2 {
                font-size: 24px;
                font-weight: 800;
                color: #0f172a;
                margin: 0;
                background: linear-gradient(135deg, #1e293b, #475569);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .tlcg-title-area p {
                font-size: 13px;
                color: #64748b;
                margin: 4px 0 0 0;
            }
            .tlcg-header-actions {
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
            }
            .tlcg-btn {
                padding: 9px 16px;
                border-radius: 10px;
                font-weight: 700;
                font-size: 13.5px;
                cursor: pointer;
                transition: all 0.2s;
                border: 1px solid #cbd5e1;
                background: white;
                color: #334155;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .tlcg-btn:hover {
                background: #f1f5f9;
                border-color: #94a3b8;
            }
            .tlcg-btn-primary {
                background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
                color: white;
                border: none;
                box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
            }
            .tlcg-btn-primary:hover {
                background: linear-gradient(135deg, #4338ca 0%, #2e288a 100%);
                box-shadow: 0 6px 12px -1px rgba(79, 70, 229, 0.3);
                transform: translateY(-1px);
            }
            
            /* Stats Row */
            .tlcg-stats-row {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }
            .tlcg-stat-card {
                border-radius: 16px;
                padding: 18px 22px;
                display: flex;
                flex-direction: column;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
                border: 2px solid transparent;
            }
            .tlcg-stat-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02);
            }
            
            /* Card 1: All */
            .tlcg-stat-card#stat-card-all {
                background: linear-gradient(135deg, #f0f2ff 0%, #e0e7ff 100%);
                border-color: #e0e7ff;
            }
            .tlcg-stat-card#stat-card-all .tlcg-stat-val {
                color: #4f46e5;
            }
            .tlcg-stat-card#stat-card-all .tlcg-stat-label {
                color: #4338ca;
            }
            .tlcg-stat-card#stat-card-all.active {
                border-color: #4f46e5;
                box-shadow: 0 0 0 2px #c7d2fe, 0 10px 20px rgba(79, 70, 229, 0.1);
                transform: translateY(-2px) scale(1.02);
            }

            /* Card 2: Configured */
            .tlcg-stat-card#stat-card-configured {
                background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
                border-color: #d1fae5;
            }
            .tlcg-stat-card#stat-card-configured .tlcg-stat-val {
                color: #10b981;
            }
            .tlcg-stat-card#stat-card-configured .tlcg-stat-label {
                color: #047857;
            }
            .tlcg-stat-card#stat-card-configured.active {
                border-color: #10b981;
                box-shadow: 0 0 0 2px #a7f3d0, 0 10px 20px rgba(16, 185, 129, 0.1);
                transform: translateY(-2px) scale(1.02);
            }

            /* Card 3: Unconfigured */
            .tlcg-stat-card#stat-card-unconfigured {
                background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
                border-color: #fef3c7;
            }
            .tlcg-stat-card#stat-card-unconfigured .tlcg-stat-val {
                color: #f59e0b;
            }
            .tlcg-stat-card#stat-card-unconfigured .tlcg-stat-label {
                color: #b45309;
            }
            .tlcg-stat-card#stat-card-unconfigured.active {
                border-color: #f59e0b;
                box-shadow: 0 0 0 2px #fde68a, 0 10px 20px rgba(245, 158, 11, 0.1);
                transform: translateY(-2px) scale(1.02);
            }

            .tlcg-stat-val {
                font-size: 28px;
                font-weight: 800;
                margin-bottom: 6px;
            }
            .tlcg-stat-label {
                font-size: 13.5px;
                font-weight: 700;
            }
            
            /* Toolbar & Tabs */
            .tlcg-toolbar {
                background: white;
                border-radius: 16px;
                padding: 16px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
                margin-bottom: 24px;
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            .tlcg-toolbar-top {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 16px;
                flex-wrap: wrap;
            }
            .tlcg-search-box {
                position: relative;
                flex: 1;
                max-width: 400px;
            }
            .tlcg-search-input {
                width: 100%;
                padding: 9px 16px 9px 40px;
                border: 1px solid #cbd5e1;
                border-radius: 10px;
                font-size: 13.5px;
                outline: none;
                transition: all 0.2s;
            }
            .tlcg-search-input:focus {
                border-color: #4f46e5;
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
            }
            .tlcg-search-icon {
                position: absolute;
                left: 14px;
                top: 50%;
                transform: translateY(-50%);
                color: #94a3b8;
                font-size: 16px;
                pointer-events: none;
            }
            .tlcg-range-select-wrapper {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .tlcg-range-label {
                font-size: 13px;
                font-weight: 700;
                color: #475569;
            }
            .tlcg-range-select {
                padding: 8px 12px;
                border: 1px solid #cbd5e1;
                border-radius: 10px;
                font-size: 13.5px;
                font-weight: 600;
                color: #334155;
                outline: none;
                background-color: white;
                cursor: pointer;
            }
            
            /* Warehouse tab pills */
            .tlcg-tabs {
                display: flex;
                gap: 8px;
                border-bottom: 1px solid #f1f5f9;
                padding-bottom: 12px;
                flex-wrap: wrap;
            }
            .tlcg-tab {
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 700;
                color: #64748b;
                background: #f1f5f9;
                border: none;
                cursor: pointer;
                transition: all 0.15s;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .tlcg-tab:hover {
                background: #e2e8f0;
                color: #1e293b;
            }
            .tlcg-tab.active {
                background: #4f46e5;
                color: white;
                box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
            }
            .tlcg-tab-badge {
                background: rgba(255,255,255,0.25);
                color: inherit;
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 10.5px;
            }
            .tlcg-tab:not(.active) .tlcg-tab-badge {
                background: #cbd5e1;
                color: #475569;
            }
            
            /* Material Grid */
            .tlcg-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 20px;
            }
            .tlcg-mat-card {
                background: white;
                border-radius: 16px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
                padding: 20px;
                cursor: pointer;
                transition: all 0.2s ease-in-out;
                position: relative;
                overflow: hidden;
            }
            .tlcg-mat-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.03);
                border-color: #cbd5e1;
            }
            .tlcg-mat-badge {
                position: absolute;
                top: 20px;
                right: 20px;
                font-size: 11px;
                padding: 3px 8px;
                border-radius: 6px;
                font-weight: 700;
                background: #f1f5f9;
                color: #475569;
            }
            .tlcg-mat-name {
                font-size: 16px;
                font-weight: 800;
                color: #0f172a;
                margin: 0 0 16px 0;
                padding-right: 60px;
                line-height: 1.3;
            }
            .tlcg-segment-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px dashed #f1f5f9;
            }
            .tlcg-segment-row:last-child {
                border-bottom: none;
            }
            .tlcg-segment-name {
                font-size: 13px;
                color: #64748b;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .tlcg-segment-val {
                font-size: 13px;
                font-weight: 700;
                color: #1e293b;
            }
            .tlcg-segment-val.val-active {
                color: #4f46e5;
            }
            
            /* Side Drawer */
            .tlcg-drawer-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(15, 23, 42, 0.4);
                backdrop-filter: blur(4px);
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }
            .tlcg-drawer-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            .tlcg-drawer {
                position: fixed;
                top: 0;
                right: -909px;
                width: 909px;
                height: 100%;
                background: white;
                box-shadow: -10px 0 25px -5px rgba(0,0,0,0.1), -10px 0 10px -5px rgba(0,0,0,0.04);
                z-index: 1001;
                transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                flex-direction: column;
            }
            .tlcg-drawer.active {
                right: 0;
            }
            .tlcg-drawer-header {
                padding: 20px 24px;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #f8fafc;
            }
            .tlcg-drawer-title h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 800;
                color: #0f172a;
            }
            .tlcg-drawer-title p {
                margin: 2px 0 0 0;
                font-size: 12px;
                color: #64748b;
            }
            .tlcg-drawer-close {
                background: #f1f5f9;
                border: none;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #64748b;
                font-weight: 700;
                font-size: 16px;
                transition: background 0.15s;
            }
            .tlcg-drawer-close:hover {
                background: #e2e8f0;
                color: #0f172a;
            }
            .tlcg-drawer-body {
                padding: 24px;
                overflow-y: auto;
                flex: 1;
                background: #f8fafc;
            }
            
            /* Accordion month grouping */
            .tlcg-accordion-item {
                background: white;
                border-radius: 12px;
                border: 1px solid #e2e8f0;
                margin-bottom: 12px;
                overflow: hidden;
            }
            .tlcg-accordion-header {
                padding: 14px 18px;
                background: white;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                user-select: none;
                transition: background 0.15s;
            }
            .tlcg-accordion-header:hover {
                background: #f8fafc;
            }
            .tlcg-accordion-title {
                font-size: 14px;
                font-weight: 800;
                color: #1e293b;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .tlcg-accordion-stats {
                font-size: 12px;
                color: #64748b;
                font-weight: 600;
                margin-top: 2px;
            }
            .tlcg-accordion-right {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .tlcg-accordion-arrow {
                font-size: 12px;
                color: #94a3b8;
                transition: transform 0.2s;
            }
            .tlcg-accordion-item.expanded .tlcg-accordion-arrow {
                transform: rotate(90deg);
            }
            .tlcg-accordion-body {
                border-top: 1px solid #f1f5f9;
                padding: 16px;
                display: none;
                background: white;
            }
            .tlcg-accordion-item.expanded .tlcg-accordion-body {
                display: block;
            }
            
            /* Ticket table inside drawer */
            .tlcg-ticket-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 11.5px;
            }
            .tlcg-ticket-table th {
                background: #f8fafc;
                padding: 8px 6px;
                color: #475569;
                font-weight: 700;
                text-transform: uppercase;
                border-bottom: 1px solid #e2e8f0;
                text-align: left;
            }
            .tlcg-ticket-table td {
                padding: 8px 6px;
                color: #334155;
                border-bottom: 1px solid #f1f5f9;
            }
            .tlcg-ticket-table tr.pending-row {
                background: #fffbeb;
            }
            .tlcg-ticket-table tr.pending-row:hover {
                background: #fef3c7;
            }
            .tlcg-ticket-table tr.rejected-row {
                background: #fef2f2;
            }
            .tlcg-ticket-table tr.rejected-row:hover {
                background: #fee2e2;
            }
            
            /* Modal overlay */
            .tlcg-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(15, 23, 42, 0.4);
                backdrop-filter: blur(4px);
                z-index: 1010;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: all 0.25s ease;
            }
            .tlcg-modal-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            .tlcg-modal {
                background: white;
                border-radius: 16px;
                width: 90%;
                max-width: 650px;
                max-height: 85vh;
                box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                transform: translateY(20px);
                transition: transform 0.25s ease;
            }
            .tlcg-modal-overlay.active .tlcg-modal {
                transform: translateY(0);
            }
            .tlcg-modal-header {
                padding: 16px 20px;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #f8fafc;
            }
            .tlcg-modal-title {
                margin: 0;
                font-size: 16px;
                font-weight: 800;
                color: #0f172a;
            }
            .tlcg-modal-body {
                padding: 20px;
                overflow-y: auto;
                flex: 1;
            }
            .tlcg-modal-footer {
                padding: 14px 20px;
                border-top: 1px solid #e2e8f0;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                background: #f8fafc;
            }
            
            /* Range manager table */
            .tlcg-range-row {
                display: flex;
                gap: 10px;
                align-items: center;
                margin-bottom: 10px;
            }
            .tlcg-range-input {
                padding: 8px 12px;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                font-size: 13px;
                width: 120px;
                text-align: center;
                outline: none;
            }
            .tlcg-range-input:focus {
                border-color: #4f46e5;
            }
            
            /* Product list for mapping */
            .tlcg-prod-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-height: 400px;
                overflow-y: auto;
                padding-right: 4px;
            }
            .tlcg-prod-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 12px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
            }
            .tlcg-prod-name {
                font-weight: 700;
                font-size: 13px;
                color: #1e293b;
            }
            .tlcg-prod-select {
                padding: 6px 10px;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                font-size: 12.5px;
                font-weight: 600;
                color: #334155;
                outline: none;
                background: white;
            }
            
            /* Detailed cutting ticket modal styles */
            .bpc-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(15,23,42,0.6);
                backdrop-filter: blur(6px);
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.25s ease;
            }
            .bpc-modal-overlay.show {
                opacity: 1;
                pointer-events: auto;
            }
            .bpc-modal {
                background: #fff;
                border-radius: 16px;
                width: 540px;
                max-width: 92vw;
                box-shadow: 0 25px 60px rgba(0,0,0,0.25);
                transform: scale(0.85);
                transition: transform .35s cubic-bezier(0.34,1.56,0.64,1);
                overflow: hidden;
            }
            .bpc-modal-overlay.show .bpc-modal {
                transform: scale(1);
            }
            .bpc-modal-header {
                color: #fff;
                padding: 18px 24px;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .bpc-modal-header .m-icon {
                font-size: 28px;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
            }
            .bpc-modal-header .m-title {
                font-size: 16px;
                font-weight: 800;
                letter-spacing: 0.3px;
                font-family: Inter,system-ui,sans-serif;
            }
            .bpc-modal-header .m-sub {
                font-size: 11px;
                opacity: 0.85;
                margin-top: 2px;
            }
            .bpc-modal-body {
                padding: 20px 24px;
            }
            .bpc-modal-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid #f1f5f9;
                font-family: Inter,system-ui,sans-serif;
            }
            .bpc-modal-row:last-child {
                border-bottom: none;
            }
            .bpc-modal-lbl {
                font-size: 12px;
                color: #64748b;
                font-weight: 600;
            }
            .bpc-modal-val {
                font-size: 13px;
                color: #1e293b;
                font-weight: 700;
                text-align: right;
                max-width: 60%;
            }
            .bpc-modal-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 10px;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s;
                font-family: Inter,system-ui,sans-serif;
            }
            .bpc-modal-btn.cancel {
                background: #f1f5f9;
                color: #64748b;
            }
            .bpc-modal-btn.cancel:hover {
                background: #e2e8f0;
            }

            /* Custom overrides for Dark-Blue/Navy theme modals */
            #tlcgRangeTicketsOverlay .tlcg-modal {
                background: #0f172a !important;
                color: #ffffff !important;
                border: 1px solid rgba(255,255,255,0.15) !important;
            }
            #tlcgRangeTicketsOverlay .tlcg-modal-header {
                background: #1e293b !important;
                border-bottom: 1px solid rgba(255,255,255,0.15) !important;
            }
            #tlcgRangeTicketsOverlay .tlcg-modal-title {
                color: #ffffff !important;
            }
            #tlcgRangeTicketsOverlay .tlcg-drawer-close {
                color: #ffffff !important;
                opacity: 0.8;
            }
            #tlcgRangeTicketsOverlay .tlcg-drawer-close:hover {
                opacity: 1;
            }
            #tlcgRangeTicketsOverlay .tlcg-ticket-table th {
                background: #1e293b !important;
                color: #94a3b8 !important;
                border-bottom: 1px solid rgba(255,255,255,0.1) !important;
            }
            #tlcgRangeTicketsOverlay .tlcg-ticket-table td {
                color: #cbd5e1 !important;
                border-bottom: 1px solid rgba(255,255,255,0.05) !important;
            }
            #tlcgRangeTicketsOverlay .tlcg-ticket-table tr:hover {
                background: rgba(255,255,255,0.03) !important;
            }
            #tlcgRangeTicketsOverlay .tlcg-modal-footer {
                background: #1e293b !important;
                border-top: 1px solid rgba(255,255,255,0.1) !important;
            }
            #tlcgRangeTicketsOverlay .tlcg-btn {
                background: rgba(255,255,255,0.1) !important;
                color: #cbd5e1 !important;
                border: none !important;
            }
            #tlcgRangeTicketsOverlay .tlcg-btn:hover {
                background: rgba(255,255,255,0.15) !important;
                color: #ffffff !important;
            }

            #_bpcDetailModal .bpc-modal {
                background: #0f172a !important;
                color: #ffffff !important;
                border: 1px solid rgba(255,255,255,0.15) !important;
            }
            #_bpcDetailModal .bpc-modal-header {
                border-bottom: 1px solid rgba(255,255,255,0.1) !important;
            }
            #_bpcDetailModal .bpc-modal-row {
                border-bottom: 1px solid rgba(255,255,255,0.05) !important;
            }
            #_bpcDetailModal .bpc-modal-lbl {
                color: #94a3b8 !important;
            }
            #_bpcDetailModal .bpc-modal-val {
                color: #ffffff !important;
            }
            #_bpcDetailModal .bpc-modal-btn.cancel {
                background: rgba(255,255,255,0.1) !important;
                color: #cbd5e1 !important;
                border: none !important;
            }
            #_bpcDetailModal .bpc-modal-btn.cancel:hover {
                background: rgba(255,255,255,0.15) !important;
                color: #ffffff !important;
            }
            #_bpcDetailModal div[style*="border:1.5px solid #f1f5f9"],
            #_bpcDetailModal div[style*="border: 1.5px solid #f1f5f9"] {
                border-color: rgba(255,255,255,0.1) !important;
                color: #ffffff !important;
                background: rgba(255,255,255,0.03) !important;
            }
            #_bpcDetailModal div[style*="border-top:2px solid #e2e8f0"],
            #_bpcDetailModal div[style*="border-top: 2px solid #e2e8f0"] {
                border-top: 1px solid rgba(255,255,255,0.1) !important;
            }
            #_bpcDetailModal div[style*="background:#fef2f2"],
            #_bpcDetailModal div[style*="background: #fef2f2"] {
                background: rgba(220,38,38,0.1) !important;
                border-color: rgba(220,38,38,0.2) !important;
            }
            #_bpcDetailModal span[style*="color:#991b1b"],
            #_bpcDetailModal span[style*="color: #991b1b"] {
                color: #f87171 !important;
            }
            #_bpcDetailModal div[style*="color:#374151"],
            #_bpcDetailModal div[style*="color: #374151"] {
                color: #cbd5e1 !important;
            }
            #_bpcDetailModal div[style*="background:#fef3c7"],
            #_bpcDetailModal div[style*="background: #fef3c7"] {
                background: rgba(245,158,11,0.15) !important;
            }
            #_bpcDetailModal div[style*="color:#92400e"],
            #_bpcDetailModal div[style*="color: #92400e"] {
                color: #fbbf24 !important;
            }
            #_bpcDetailModal div[style*="color:#b45309"],
            #_bpcDetailModal div[style*="color: #b45309"] {
                color: #fbbf24 !important;
            }
            #_bpcDetailModal div[style*="background:#dcfce7"],
            #_bpcDetailModal div[style*="background: #dcfce7"] {
                background: rgba(16,185,129,0.15) !important;
            }
            #_bpcDetailModal div[style*="color:#166534"],
            #_bpcDetailModal div[style*="color: #166534"] {
                color: #34d399 !important;
            }
            #_bpcDetailModal div[style*="color:#059669"],
            #_bpcDetailModal div[style*="color: #059669"] {
                color: #34d399 !important;
            }
            #_bpcDetailModal div[style*="background:#fee2e2"],
            #_bpcDetailModal div[style*="background: #fee2e2"] {
                background: rgba(239,68,68,0.15) !important;
            }
            #_bpcDetailModal div[style*="color:#991b1b"],
            #_bpcDetailModal div[style*="color: #991b1b"] {
                color: #f87171 !important;
            }
            #_bpcDetailModal div[style*="color:#dc2626"],
            #_bpcDetailModal div[style*="color: #dc2626"] {
                color: #f87171 !important;
            }
            #_bpcDetailModal div[style*="background:#dbeafe"],
            #_bpcDetailModal div[style*="background: #dbeafe"] {
                background: rgba(59,130,246,0.15) !important;
            }
            #_bpcDetailModal div[style*="color:#1e40af"],
            #_bpcDetailModal div[style*="color: #1e40af"] {
                color: #60a5fa !important;
            }
            #_bpcDetailModal div[style*="color:#2563eb"],
            #_bpcDetailModal div[style*="color: #2563eb"] {
                color: #60a5fa !important;
            }
        `;
        document.head.appendChild(style);
    }

    _tlcg.content = content;
    _tlcg.isGD = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';

    await _tlcgLoadData();
}

function _tlcgGetWarehouseGroup(mat) {
    const whName = (mat.warehouse_name || '').toUpperCase();
    const unit = (mat.unit || '').toLowerCase();
    
    if (whName.includes('KG') || unit === 'kg') {
        return 'KG';
    }
    if (whName.includes('MÉT') || whName.includes('MET') || unit === 'mét' || unit === 'met' || unit === 'm') {
        return 'MET';
    }
    if (whName.includes('SẴN') || whName.includes('SAN') || unit === 'cái' || unit === 'cai') {
        return 'SAN';
    }
    return 'OTHER';
}

function _tlcgParseProductName(prodName, orderCode) {
    if (!prodName) return { code: orderCode || '---', product: '---' };
    
    // Normalize dashes
    const normalized = prodName.replace(/\s*[—–-]\s*/g, ' - ');
    const parts = normalized.split(' - ');
    
    const code = orderCode || parts[0] || '---';
    let phieuNum = null;
    let phoiNum = null;
    let productParts = [];
    
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        if (!part) continue;
        
        const lowerPart = part.toLowerCase();
        if (['aff', 'ctv', 'kol', 'koc', 'svd', 'dt', 'off'].includes(lowerPart)) {
            continue;
        }
        
        if (i === 0 && lowerPart === code.toLowerCase()) {
            continue;
        }
        
        const phieuMatch = part.match(/^Phi\u1ebfu\s+(\d+)$/i);
        if (phieuMatch) {
            phieuNum = phieuMatch[1];
            continue;
        }
        
        const phoiMatch = part.match(/^P\s*(\d+)$/i);
        if (phoiMatch) {
            phoiNum = phoiMatch[1];
            continue;
        }
        
        if (lowerPart === code.toLowerCase()) {
            continue;
        }
        
        productParts.push(part);
    }
    
    let displayCode = code;
    if (phieuNum !== null) {
        displayCode += ` - P.${phieuNum}`;
    }
    if (phoiNum !== null) {
        displayCode += ` - ${phoiNum}`;
    }
    
    let displayProduct = '---';
    if (productParts.length > 0) {
        displayProduct = productParts.join(' - ');
    } else if (parts.length > 1 && !phieuNum && !phoiNum) {
        displayProduct = parts.slice(1).join(' - ');
    }
    
    return {
        code: displayCode,
        product: displayProduct
    };
}

async function _tlcgLoadData() {
    try {
        const query = _tlcg.selectedRangeId ? `?range_id=${_tlcg.selectedRangeId}` : '';
        const res = await apiCall(`/api/cutting/ratio-stats${query}`, 'GET');
        _tlcg.materials = res.materials || [];
        _tlcg.colors = res.colors || [];
        _tlcg.ranges = res.ranges || [];
        _tlcg.stats = res.stats || [];

        // Fetch size segments
        try {
            const segRes = await apiCall('/api/cutting/size-segments', 'GET');
            _tlcg.sizeSegments = segRes.segments || [];
        } catch (e) {
            console.error('Failed to load size segments:', e);
            _tlcg.sizeSegments = [
                { name: 'Người Lớn' },
                { name: 'Tiểu Học' },
                { name: 'Mầm Non' },
                { name: 'Oversize' }
            ];
        }

        _tlcgRenderPage();
    } catch (err) {
        console.error('[TLCG load error]', err);
        if (typeof showToast === 'function') showToast('Không thể tải dữ liệu tỉ lệ cắt thực tế: ' + err.message, 'error');
    }
}

function _tlcgRenderPage() {
    if (!_tlcg.content) return;

    // Calculate count for each group
    const counts = { ALL: 0, KG: 0, MET: 0, SAN: 0 };
    _tlcg.materials.forEach(m => {
        counts.ALL++;
        const grp = _tlcgGetWarehouseGroup(m);
        if (counts[grp] !== undefined) {
            counts[grp]++;
        }
    });

    const totalMaterials = _tlcg.materials.length;
    // Count how many materials have at least one approved ratio in current range
    const activeMaterialsSet = new Set();
    _tlcg.stats.forEach(s => {
        if (Number(s.total_kg) > 0) {
            const mat = _tlcg.materials.find(m => m.name.trim().toLowerCase() === s.material_name.trim().toLowerCase());
            if (mat) activeMaterialsSet.add(mat.id);
        }
    });
    const configuredCount = activeMaterialsSet.size;

    let html = `
        <div class="tlcg-container">
            <div class="tlcg-header">
                <div class="tlcg-title-area">
                    <h2>📏 Tỉ Lệ Cắt Gốc Thực Tế</h2>
                    <p>Số liệu sản phẩm cắt được trên mỗi kg/mét/cái từ các đơn cắt thành công</p>
                </div>
                <div class="tlcg-header-actions">
                    <button class="tlcg-btn tlcg-btn-primary" onclick="navigate('baogiagoc')">
                        🧮 Tra Cứu & So Sánh Giá
                    </button>
                    <button class="tlcg-btn" onclick="_tlcgOpenProductSegmentModal()">
                        ⚙️ Cấu Hình Phân Loại
                    </button>
                    ${_tlcg.isGD ? `
                        <button class="tlcg-btn" onclick="_tlcgOpenSizeSegmentsModal()">
                            ⚙️ Cấu Hình Phân Khúc
                        </button>
                        <button class="tlcg-btn" onclick="_tlcgOpenRangeModal()">
                            ⚙️ Cấu Hình Khung Số Lượng
                        </button>
                    ` : ''}
                </div>
            </div>

            <div class="tlcg-stats-row">
                <div class="tlcg-stat-card ${_tlcg.statsFilter === 'ALL' ? 'active' : ''}" id="stat-card-all" onclick="_tlcgSetStatsFilter('ALL')">
                    <span class="tlcg-stat-val">${totalMaterials}</span>
                    <span class="tlcg-stat-label">Tổng số loại vải</span>
                </div>
                <div class="tlcg-stat-card ${_tlcg.statsFilter === 'CONFIGURED' ? 'active' : ''}" id="stat-card-configured" onclick="_tlcgSetStatsFilter('CONFIGURED')">
                    <span class="tlcg-stat-val">${configuredCount}</span>
                    <span class="tlcg-stat-label">Loại vải có tỉ lệ thực tế</span>
                </div>
                <div class="tlcg-stat-card ${_tlcg.statsFilter === 'UNCONFIGURED' ? 'active' : ''}" id="stat-card-unconfigured" onclick="_tlcgSetStatsFilter('UNCONFIGURED')">
                    <span class="tlcg-stat-val">${totalMaterials - configuredCount}</span>
                    <span class="tlcg-stat-label">Chưa có số liệu thực tế</span>
                </div>
            </div>

            <div class="tlcg-toolbar">
                <div class="tlcg-tabs">
                    <button class="tlcg-tab ${_tlcg.selectedGroup === 'ALL' ? 'active' : ''}" onclick="_tlcgSelectGroup('ALL')">
                        Tất cả <span class="tlcg-tab-badge">${counts.ALL}</span>
                    </button>
                    <button class="tlcg-tab ${_tlcg.selectedGroup === 'KG' ? 'active' : ''}" onclick="_tlcgSelectGroup('KG')">
                        Kho Vải KG <span class="tlcg-tab-badge">${counts.KG}</span>
                    </button>
                    <button class="tlcg-tab ${_tlcg.selectedGroup === 'MET' ? 'active' : ''}" onclick="_tlcgSelectGroup('MET')">
                        Kho Vải Mét <span class="tlcg-tab-badge">${counts.MET}</span>
                    </button>
                    <button class="tlcg-tab ${_tlcg.selectedGroup === 'SAN' ? 'active' : ''}" onclick="_tlcgSelectGroup('SAN')">
                        Kho Vải Sẵn (cái) <span class="tlcg-tab-badge">${counts.SAN}</span>
                    </button>
                </div>
                
                <div class="tlcg-toolbar-top">
                    <div class="tlcg-search-box">
                        <span class="tlcg-search-icon">🔍</span>
                        <input type="text" class="tlcg-search-input" id="tlcgSearch" placeholder="Tìm kiếm loại vải..." value="${_tlcg.filter.search}" oninput="_tlcgHandleSearch(this.value)">
                    </div>
                    
                    <div class="tlcg-range-select-wrapper">
                        <span class="tlcg-range-label">Khung Số Lượng:</span>
                        <select class="tlcg-range-select" onchange="_tlcgChangeRange(this.value)">
                            <option value="">-- Tất cả số lượng --</option>
                            ${_tlcg.ranges.map(r => {
                                const label = r.max_qty >= 999999 ? `Từ ${r.min_qty} sp trở lên` : `${r.min_qty} - ${r.max_qty} sp`;
                                const selected = String(_tlcg.selectedRangeId) === String(r.id) ? 'selected' : '';
                                return `<option value="${r.id}" ${selected}>${label}</option>`;
                            }).join('')}
                        </select>
                    </div>
                </div>
            </div>

            <div class="tlcg-grid" id="tlcgGrid">
                ${_tlcgRenderGrid()}
            </div>
        </div>
    `;

    _tlcg.content.innerHTML = html;
}

function _tlcgSelectGroup(group) {
    _tlcg.selectedGroup = group;
    // Re-render tab classes
    const tabs = document.querySelectorAll('.tlcg-tab');
    tabs.forEach(t => t.classList.remove('active'));
    
    // Find active tab
    const grpIdx = ['ALL', 'KG', 'MET', 'SAN'].indexOf(group);
    if (tabs[grpIdx]) tabs[grpIdx].classList.add('active');

    const grid = document.getElementById('tlcgGrid');
    if (grid) {
        grid.innerHTML = _tlcgRenderGrid();
    }
}

function _tlcgSetStatsFilter(filterVal) {
    _tlcg.statsFilter = filterVal;
    
    // Re-render active card borders and glows
    document.querySelectorAll('.tlcg-stat-card').forEach(c => c.classList.remove('active'));
    const activeCard = document.getElementById(`stat-card-${filterVal.toLowerCase()}`);
    if (activeCard) activeCard.classList.add('active');
    
    const grid = document.getElementById('tlcgGrid');
    if (grid) {
        grid.innerHTML = _tlcgRenderGrid();
    }
}

function _tlcgGetSegmentBadge(segment) {
    if (!segment) {
        return `<span style="color:#ef4444; font-style:italic; font-size: 11.5px;">Chưa phân loại</span>`;
    }
    const cleanSegment = segment.trim();
    let bg = '#e2e8f0';
    let color = '#475569';
    const segObj = (_tlcg.sizeSegments || []).find(s => s.name === cleanSegment);
    let icon = segObj && segObj.icon ? segObj.icon : '🧑';
    
    if (cleanSegment === 'Người Lớn') {
        bg = '#dbeafe'; // Light blue
        color = '#1e40af'; // Dark blue
    } else if (cleanSegment === 'Mầm Non') {
        bg = '#fce7f3'; // Light pink
        color = '#9d174d'; // Dark pink
    } else if (cleanSegment === 'Tiểu Học') {
        bg = '#dcfce7'; // Light green
        color = '#166534'; // Dark green
    } else if (cleanSegment === 'Oversize') {
        bg = '#f3e8ff'; // Light purple
        color = '#6b21a8'; // Dark purple
    }
    
    return `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; font-size: 11.5px; font-weight: 700; background-color: ${bg}; color: ${color}; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">${icon} ${cleanSegment}</span>`;
}

function _tlcgGetActiveSegmentsForMaterial(mat) {
    if (mat && mat.active_segments) {
        try {
            const parsed = JSON.parse(mat.active_segments);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const globalNames = (_tlcg.sizeSegments || []).map(s => s.name);
                return parsed.filter(name => globalNames.includes(name));
            }
        } catch(e) {
            console.error('Error parsing active segments:', e);
        }
    }
    // Fallback to ONLY the default base segments that exist globally
    const defaultBase = ['Người Lớn', 'Tiểu Học', 'Mầm Non', 'Oversize'];
    const globalNames = (_tlcg.sizeSegments || []).map(s => s.name);
    return defaultBase.filter(name => globalNames.includes(name));
}

function _tlcgGetMaterialStats(matName, mat) {
    const mStats = _tlcg.stats.filter(s => s.material_name.trim().toLowerCase() === matName.trim().toLowerCase());
    const activeSegs = _tlcgGetActiveSegmentsForMaterial(mat);
    
    const segments = {};
    activeSegs.forEach(seg => {
        segments[seg] = { qty: 0, kg: 0 };
    });
    
    mStats.forEach(s => {
        if (segments[s.size_segment]) {
            segments[s.size_segment].qty += Number(s.total_qty);
            segments[s.size_segment].kg += Number(s.total_kg);
        }
    });

    return activeSegs.map(seg => {
        const data = segments[seg];
        let ratioText = '---';
        if (data && data.kg > 0) {
            ratioText = `${(data.qty / data.kg).toFixed(2)} sp/${mat.unit || 'kg'}`;
        }
        
        const segObj = (_tlcg.sizeSegments || []).find(s => s.name === seg);
        const icon = segObj && segObj.icon ? segObj.icon : '🧑';
        
        return {
            name: seg,
            icon,
            ratioText,
            isActive: ratioText !== '---'
        };
    });
}

function _tlcgRenderGrid() {
    const q = (_tlcg.filter.search || '').trim().toLowerCase();
    
    // Build active materials set
    const activeMaterialsSet = new Set();
    _tlcg.stats.forEach(s => {
        if (Number(s.total_kg) > 0) {
            const mat = _tlcg.materials.find(m => m.name.trim().toLowerCase() === s.material_name.trim().toLowerCase());
            if (mat) activeMaterialsSet.add(mat.id);
        }
    });

    const filtered = _tlcg.materials.filter(m => {
        // Filter by search query
        const matchQuery = !q || (m.name || '').toLowerCase().indexOf(q) >= 0 || (m.warehouse_name || '').toLowerCase().indexOf(q) >= 0;
        if (!matchQuery) return false;

        // Filter by selected warehouse group
        if (_tlcg.selectedGroup !== 'ALL') {
            const grp = _tlcgGetWarehouseGroup(m);
            if (grp !== _tlcg.selectedGroup) return false;
        }

        // Filter by statsFilter
        if (_tlcg.statsFilter === 'CONFIGURED') {
            if (!activeMaterialsSet.has(m.id)) return false;
        } else if (_tlcg.statsFilter === 'UNCONFIGURED') {
            if (activeMaterialsSet.has(m.id)) return false;
        }

        return true;
    });

    if (filtered.length === 0) {
        return `<div style="grid-column: 1 / -1; text-align: center; padding: 60px; color: #64748b; font-weight: 600;">Không tìm thấy loại vải nào</div>`;
    }

    return filtered.map(m => {
        const segStats = _tlcgGetMaterialStats(m.name, m);
        const segmentsHtml = segStats.map(s => `
            <div class="tlcg-segment-row">
                <span class="tlcg-segment-name">${s.icon} ${s.name}</span>
                <span class="tlcg-segment-val ${s.isActive ? 'val-active' : ''}">${s.ratioText}</span>
            </div>
        `).join('');

        return `
            <div class="tlcg-mat-card" onclick="_tlcgOpenMaterialDrawer(${m.id})" style="${m.is_active === false || m.is_active === 0 ? 'opacity: 0.8; border-color: #fca5a5; background: #fff5f5;' : ''}">
                <span class="tlcg-mat-badge">${m.unit || 'kg'}</span>
                <h4 class="tlcg-mat-name" style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                    <span>${m.name}</span>
                    ${m.is_active === false || m.is_active === 0 ? '<span style="color: #dc2626; font-size: 10px; font-weight: bold; background: #fee2e2; padding: 2px 6px; border-radius: 4px; display: inline-block;">DỪNG BÁN</span>' : ''}
                </h4>
                ${segmentsHtml}
            </div>
        `;
    }).join('');
}

function _tlcgHandleSearch(val) {
    _tlcg.filter.search = val;
    const grid = document.getElementById('tlcgGrid');
    if (grid) {
        grid.innerHTML = _tlcgRenderGrid();
    }
}

async function _tlcgChangeRange(val) {
    _tlcg.selectedRangeId = val;
    await _tlcgLoadData();
}

// ========== DRAWER FUNCTIONS (Monthly grouping & approvals) ==========

async function _tlcgOpenMaterialDrawer(matId) {
    const mat = _tlcg.materials.find(m => m.id === matId);
    if (!mat) return;
    _tlcg.activeMaterial = mat;
    _tlcg.expandedMonths.clear();
    _tlcg.activeFilter = 'all';
    _tlcg.drawerRangeFilterId = _tlcg.selectedRangeId || '';
    _tlcg.drawerSegmentFilter = '';
    _tlcg.initialOrderMap = null;

    // Inject drawer overlay and drawer if not present
    if (!document.getElementById('tlcgDrawerOverlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'tlcgDrawerOverlay';
        overlay.className = 'tlcg-drawer-overlay';
        overlay.onclick = _tlcgCloseDrawer;
        document.body.appendChild(overlay);
    }
    
    if (!document.getElementById('tlcgDrawer')) {
        const drawer = document.createElement('div');
        drawer.id = 'tlcgDrawer';
        drawer.className = 'tlcg-drawer';
        document.body.appendChild(drawer);
    }

    const overlay = document.getElementById('tlcgDrawerOverlay');
    const drawer = document.getElementById('tlcgDrawer');

    // Load ticket list and stats details
    let drawerHtml = `
        <div class="tlcg-drawer-header">
            <div class="tlcg-drawer-title">
                <h3>${mat.name}</h3>
                <p>Chi tiết tỉ lệ cắt thực tế gom nhóm theo Tháng/Năm</p>
            </div>
            <button class="tlcg-drawer-close" onclick="_tlcgCloseDrawer()">×</button>
        </div>
        <div class="tlcg-drawer-body">
            <div id="tlcgDrawerLoading" style="text-align: center; padding: 40px; color: #64748b; font-weight: 600;">
                ⏳ Đang tải dữ liệu...
            </div>
            <div id="tlcgDrawerContent" style="display: none;"></div>
        </div>
    `;
    drawer.innerHTML = drawerHtml;

    overlay.classList.add('active');
    drawer.classList.add('active');

    await _tlcgLoadDrawerContent(mat);
}

function _tlcgCloseDrawer() {
    const overlay = document.getElementById('tlcgDrawerOverlay');
    const drawer = document.getElementById('tlcgDrawer');
    if (overlay) overlay.classList.remove('active');
    if (drawer) drawer.classList.remove('active');
    _tlcg.initialOrderMap = null;
    _tlcg.activeMaterial = null;
    _tlcg.expandedMonths.clear();
}

async function _tlcgLoadDrawerContent(mat) {
    try {
        const contentDiv = document.getElementById('tlcgDrawerContent');
        const loadingDiv = document.getElementById('tlcgDrawerLoading');
        
        // Fetch tickets matching the material
        const rangeId = _tlcg.drawerRangeFilterId || '';
        const segment = _tlcg.drawerSegmentFilter || '';
        const queryParams = `?material_name=${encodeURIComponent(mat.name)}${rangeId ? `&range_id=${rangeId}` : ''}${segment ? `&size_segment=${encodeURIComponent(segment)}` : ''}`;
        const res = await apiCall(`/api/cutting/material-tickets${queryParams}`, 'GET');
        const tickets = res.tickets || [];
        const activeSegmentsList = _tlcgGetActiveSegmentsForMaterial(mat);

        // Sort tickets globally (in-place persistence until drawer close / page refresh)
        if (_tlcg.initialOrderMap) {
            tickets.sort((a, b) => {
                const idxA = _tlcg.initialOrderMap.has(a.id) ? _tlcg.initialOrderMap.get(a.id) : 99999;
                const idxB = _tlcg.initialOrderMap.has(b.id) ? _tlcg.initialOrderMap.get(b.id) : 99999;
                return idxA - idxB;
            });
        } else {
            tickets.sort((a, b) => {
                // Sort by Month descending first
                const dateA = a.cut_date || '';
                const dateB = b.cut_date || '';
                const monthA = dateA.substring(0, 7); // 'YYYY-MM'
                const monthB = dateB.substring(0, 7);
                const monthCmp = monthB.localeCompare(monthA);
                if (monthCmp !== 0) return monthCmp;

                // Sort by Pending first (neither approved nor rejected)
                const pendingA = (!a.ratio_approved && !a.ratio_rejected) ? 0 : 1;
                const pendingB = (!b.ratio_approved && !b.ratio_rejected) ? 0 : 1;
                if (pendingA !== pendingB) return pendingA - pendingB;

                // Sort by code naturally
                const parsedA = _tlcgParseProductName(a.product_name, a.order_code);
                const parsedB = _tlcgParseProductName(b.product_name, b.order_code);
                const codeCmp = parsedA.code.localeCompare(parsedB.code, undefined, { numeric: true, sensitivity: 'base' });
                if (codeCmp !== 0) return codeCmp;

                // Sort by fabric color
                const colorCmp = (a.fabric_color || '').localeCompare(b.fabric_color || '');
                if (colorCmp !== 0) return colorCmp;

                return a.id - b.id;
            });
            _tlcg.initialOrderMap = new Map(tickets.map((t, idx) => [t.id, idx]));
        }

        // Apply active filter
        const activeFilter = _tlcg.activeFilter || 'all';
        let filteredTickets = tickets;
        if (activeFilter === 'pending') {
            filteredTickets = tickets.filter(t => !t.ratio_approved && !t.ratio_rejected);
        } else if (activeFilter === 'approved') {
            filteredTickets = tickets.filter(t => t.ratio_approved);
        } else if (activeFilter === 'rejected') {
            filteredTickets = tickets.filter(t => t.ratio_rejected);
        }

        // Group tickets by Month
        const grouped = {};
        filteredTickets.forEach(t => {
            const parts = (t.cut_date || '').split('-');
            if (parts.length < 2) return;
            const key = `${parts[0]}-${parts[1]}`; // 'YYYY-MM'
            const display = `Tháng ${parts[1]}/${parts[0]}`;
            
            if (!grouped[key]) {
                grouped[key] = {
                    key,
                    display,
                    tickets: [],
                    totalQty: 0,
                    totalKg: 0,
                    approvedQty: 0,
                    approvedKg: 0,
                    pendingIds: [],
                    pendingCount: 0,
                    approvedCount: 0
                };
            }
            
            grouped[key].tickets.push(t);
            const qty = Number(t.cut_quantity) || 0;
            const kg = Number(t.kg_cut) || 0;
            
            grouped[key].totalQty += qty;
            grouped[key].totalKg += kg;
            
            if (t.ratio_approved) {
                grouped[key].approvedQty += qty;
                grouped[key].approvedKg += kg;
                grouped[key].approvedCount++;
            } else if (!t.ratio_rejected) {
                grouped[key].pendingIds.push(t.id);
                grouped[key].pendingCount++;
            }
        });

        const monthKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a)); // Sort months descending

        // Auto-expand the first/latest month
        if (monthKeys.length > 0 && _tlcg.expandedMonths.size === 0) {
            _tlcg.expandedMonths.add(monthKeys[0]);
        }

        let html = '';

        // 1. Overall stats panel in drawer
        const segStatsOverall = _tlcgGetMaterialStats(mat.name, mat);
        const overallHtml = segStatsOverall.map(s => `
            <div style="background: #f8fafc; padding: 10px; border-radius: 8px; text-align: center;">
                <div style="font-size: 11px; color: #64748b; font-weight: 600;">${s.name}</div>
                <div style="font-size: 14px; font-weight: 800; color: #4f46e5; margin-top: 4px;">${s.ratioText}</div>
            </div>
        `).join('');
        
        html += `
            <div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(${segStatsOverall.length || 4}, 1fr); gap: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.01);">
                ${overallHtml}
            </div>
        `;

        if (_tlcg.isGD) {
            // Segment Selection checkboxes
            const activeSegmentsList = _tlcgGetActiveSegmentsForMaterial(mat);
            const checkboxesHtml = (_tlcg.sizeSegments || []).map(seg => {
                const checked = activeSegmentsList.includes(seg.name) ? 'checked' : '';
                return `
                    <label style="display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; color: #334155; cursor: pointer;">
                        <input type="checkbox" class="material-segment-checkbox" value="${seg.name}" ${checked} onchange="_tlcgUpdateMaterialSegments(${mat.id})" style="accent-color: #4f46e5; width: 16px; height: 16px;">
                        ${seg.name}
                    </label>
                `;
            }).join(' ');

            html += `
                <div style="background: #eef2ff; border: 1px dashed #c7d2fe; border-radius: 12px; padding: 12px; margin-bottom: 20px;">
                    <div style="font-size: 12px; font-weight: 800; color: #4f46e5; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
                        ⚙️ Cấu Hình Phân Khúc Cho Chất Liệu Này:
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 14px;">
                        ${checkboxesHtml}
                    </div>
                </div>
            `;
        }

        // 2. Month Accordions
        html += `<h4 style="margin: 0 0 12px 0; color: #334155; font-size: 14.5px; font-weight: 800;">📅 Danh sách phiếu cắt theo tháng</h4>`;
        
        // Add status filter tabs & quantity range filter
        html += `
            <div class="tlcg-drawer-filters" style="display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 16px; flex-wrap: wrap;">
                <div style="display: flex; gap: 8px;">
                    <button class="tlcg-filter-tab" onclick="_tlcgSetFilter('all')" style="border: 1px solid #cbd5e1; background: ${activeFilter === 'all' ? '#cbd5e1' : 'white'}; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; cursor: pointer; color: #334155; outline: none; transition: all 0.2s;">Tất cả</button>
                    <button class="tlcg-filter-tab" onclick="_tlcgSetFilter('pending')" style="border: 1px solid #fef3c7; background: ${activeFilter === 'pending' ? '#fef3c7' : 'white'}; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; cursor: pointer; color: #d97706; outline: none; transition: all 0.2s;">Chờ xử lý</button>
                    <button class="tlcg-filter-tab" onclick="_tlcgSetFilter('approved')" style="border: 1px solid #dcfce7; background: ${activeFilter === 'approved' ? '#dcfce7' : 'white'}; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; cursor: pointer; color: #15803d; outline: none; transition: all 0.2s;">Đã duyệt</button>
                    <button class="tlcg-filter-tab" onclick="_tlcgSetFilter('rejected')" style="border: 1px solid #fee2e2; background: ${activeFilter === 'rejected' ? '#fee2e2' : 'white'}; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; cursor: pointer; color: #ef4444; outline: none; transition: all 0.2s;">Không duyệt</button>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span style="font-size: 11px; font-weight: 700; color: #475569;">Phân khúc:</span>
                    <select style="padding: 6px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; color: #334155; border: 1px solid #cbd5e1; outline: none; background: white; cursor: pointer;" onchange="_tlcgSetDrawerSegmentFilter(this.value)">
                        <option value="">-- Tất cả phân khúc --</option>
                        ${activeSegmentsList.map(seg => {
                            const selected = String(_tlcg.drawerSegmentFilter || '') === String(seg) ? 'selected' : '';
                            return `<option value="${seg}" ${selected}>${seg}</option>`;
                        }).join('')}
                    </select>

                    <span style="font-size: 11px; font-weight: 700; color: #475569; margin-left: 8px;">Số lượng:</span>
                    <select style="padding: 6px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; color: #334155; border: 1px solid #cbd5e1; outline: none; background: white; cursor: pointer;" onchange="_tlcgSetDrawerRangeFilter(this.value)">
                        <option value="">-- Tất cả số lượng --</option>
                        ${_tlcg.ranges.map(r => {
                            const label = r.max_qty >= 999999 ? `Từ ${r.min_qty} sp trở lên` : `${r.min_qty} - ${r.max_qty} sp`;
                            const selected = String(_tlcg.drawerRangeFilterId || '') === String(r.id) ? 'selected' : '';
                            return `<option value="${r.id}" ${selected}>${label}</option>`;
                        }).join('')}
                    </select>
                </div>
            </div>
        `;

        if (monthKeys.length === 0) {
            html += `<div style="text-align: center; padding: 30px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; color: #64748b; font-size: 13.5px;">Không phát sinh đơn cắt lẻ nào thỏa mãn điều kiện lọc</div>`;
        } else {
            monthKeys.forEach(key => {
                const group = grouped[key];
                const isExpanded = _tlcg.expandedMonths.has(key);
                
                // Calculations for ratios
                const totalRatio = group.totalKg > 0 ? (group.totalQty / group.totalKg).toFixed(2) : '---';
                const approvedRatio = group.approvedKg > 0 ? (group.approvedQty / group.approvedKg).toFixed(2) : '---';

                html += `
                    <div class="tlcg-accordion-item ${isExpanded ? 'expanded' : ''}" id="accordion-${key}">
                        <div class="tlcg-accordion-header" onclick="_tlcgToggleAccordion('${key}')">
                            <div>
                                <div class="tlcg-accordion-title">
                                    📁 ${group.display}
                                    <span style="font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 10px; background: ${group.pendingCount > 0 ? '#fef3c7; color:#d97706;' : '#dcfce7; color:#15803d;'}">
                                        ${group.pendingCount > 0 ? `${group.pendingCount} chờ duyệt` : 'Đã duyệt hết'}
                                    </span>
                                </div>
                                <div class="tlcg-accordion-stats" style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 6px; font-size: 11.5px; color: #475569;">
                                    <span style="background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 6px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                                        ✅ Đã duyệt: <strong style="font-size: 12.5px; color: #02507d;">${approvedRatio} ${approvedRatio !== '---' ? 'sp/' + (mat.unit || 'kg') : ''}</strong>
                                        <span style="font-weight: 500; font-size: 10.5px; opacity: 0.85;">(${group.approvedQty} sp / ${group.approvedKg.toFixed(1)} ${mat.unit || 'kg'})</span>
                                    </span>
                                    ${group.pendingCount > 0 ? `
                                    <span style="background: #f1f5f9; color: #475569; padding: 3px 8px; border-radius: 6px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                                        📊 Toàn bộ: <strong style="font-size: 12.5px; color: #1e293b;">${totalRatio} ${totalRatio !== '---' ? 'sp/' + (mat.unit || 'kg') : ''}</strong>
                                    </span>
                                    ` : ''}
                                </div>
                            </div>
                            
                            <div class="tlcg-accordion-right" onclick="event.stopPropagation()">
                                ${_tlcg.isGD && group.pendingCount > 0 ? `
                                    <button class="btn btn-sm btn-success" style="font-size: 11px; padding: 4px 10px; font-weight: 700; border-radius: 6px;" onclick="_tlcgApproveBatch([${group.pendingIds.join(',')}])">
                                        ✔️ Duyệt tất cả (${group.pendingCount})
                                    </button>
                                ` : ''}
                                <span class="tlcg-accordion-arrow" onclick="_tlcgToggleAccordion('${key}')">▶</span>
                            </div>
                        </div>
                        
                        <div class="tlcg-accordion-body" style="padding: 16px 8px;">
                            <div style="overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch;">
                                <table class="tlcg-ticket-table" style="min-width: 580px;">
                                    <thead>
                                        <tr>
                                        <th>Mã Đơn</th>
                                        <th>Sản phẩm</th>
                                        <th>Phân khúc</th>
                                        <th>Màu sắc</th>
                                        <th style="text-align: center;">SL / Trọng lượng</th>
                                        <th style="text-align: center;">Tỉ lệ</th>
                                        <th style="text-align: center; width: 150px;">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${group.tickets.map(t => {
                                        const isPending = !t.ratio_approved && !t.ratio_rejected;
                                        const rowClass = isPending ? 'pending-row' : (t.ratio_rejected ? 'rejected-row' : '');
                                        const isActiveSeg = t.size_segment && activeSegmentsList.includes(t.size_segment);
                                        const segmentLabel = isActiveSeg ? _tlcgGetSegmentBadge(t.size_segment) : `<span style="color:#ef4444; font-style:italic; font-size: 11.5px;">Chưa phân loại</span>`;
                                        const parsed = _tlcgParseProductName(t.product_name, t.order_code);
                                        return `
                                            <tr class="${rowClass}">
                                                <td style="cursor: pointer;" onclick="_tlcgShowTicketDetail(${t.id})" title="Nhấp để xem chi tiết đơn cắt">
                                                    <div style="font-weight: 800; color: #2563eb; text-decoration: underline; transition: color 0.15s;" onmouseover="this.style.color='#1d4ed8'" onmouseout="this.style.color='#2563eb'">${parsed.code}</div>
                                                </td>
                                                <td style="font-weight: 500; font-size: 11.5px; color: #334155; max-width: 200px; word-break: break-word;">${parsed.product}</td>
                                                <td style="font-weight: 600;">${segmentLabel}</td>
                                                <td style="font-weight: 600;">${t.fabric_color}</td>
                                                <td style="text-align: center; font-weight: 600;">${t.cut_quantity} áo / ${t.kg_cut} ${mat.unit || 'kg'}</td>
                                                <td style="text-align: center; font-weight: 800; color: #4f46e5;">${Number(t.cut_ratio).toFixed(2)}</td>
                                                <td style="text-align: center;">
                                                    ${_tlcg.isGD ? `
                                                        ${isPending ? `
                                                            <div style="display: flex; gap: 4px; justify-content: center;">
                                                                <button class="btn btn-sm btn-success" style="font-size: 11px; padding: 3px 8px; font-weight: 700;" onclick="_tlcgApproveTicket(${t.id})">Duyệt</button>
                                                                <button class="btn btn-sm btn-danger" style="font-size: 11px; padding: 3px 8px; font-weight: 700;" onclick="_tlcgRejectTicket(${t.id})">Không duyệt</button>
                                                            </div>
                                                        ` : (t.ratio_approved ? `
                                                            <button class="btn btn-sm btn-success" style="font-size: 11px; padding: 3px 8px; font-weight: 700; width: 100%;" onclick="_tlcgUnapproveTicket(${t.id}, 'Bạn có chắc chắn muốn hủy duyệt đơn cắt này?')">✔️ Đã duyệt</button>
                                                        ` : `
                                                            <button class="btn btn-sm btn-danger" style="font-size: 11px; padding: 3px 8px; font-weight: 700; width: 100%;" onclick="_tlcgUnapproveTicket(${t.id}, 'Bạn có chắc chắn muốn hủy trạng thái không duyệt đơn cắt này?')">❌ Không duyệt</button>
                                                        `)}
                                                    ` : `
                                                        <span style="font-size: 11px; font-weight: 700; color: ${t.ratio_approved ? '#10b981' : (t.ratio_rejected ? '#ef4444' : '#f59e0b')}; padding: 4px 8px; background: ${t.ratio_approved ? '#dcfce7' : (t.ratio_rejected ? '#fee2e2' : '#fef3c7')}; border-radius: 6px; display: inline-block;">
                                                            ${t.ratio_approved ? 'Đã duyệt' : (t.ratio_rejected ? 'Không duyệt' : 'Chờ duyệt')}
                                                        </span>
                                                    `}
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        loadingDiv.style.display = 'none';
        contentDiv.innerHTML = html;
        contentDiv.style.display = 'block';

    } catch (err) {
        console.error('[TLCG load drawer error]', err);
        const loadingDiv = document.getElementById('tlcgDrawerLoading');
        if (loadingDiv) loadingDiv.innerHTML = '❌ Lỗi tải dữ liệu chi tiết!';
    }
}

function _tlcgToggleAccordion(monthKey) {
    const item = document.getElementById(`accordion-${monthKey}`);
    if (!item) return;
    
    if (_tlcg.expandedMonths.has(monthKey)) {
        _tlcg.expandedMonths.delete(monthKey);
        item.classList.remove('expanded');
    } else {
        _tlcg.expandedMonths.add(monthKey);
        item.classList.add('expanded');
    }
}

async function _tlcgApproveTicket(id) {
    try {
        const res = await apiCall(`/api/cutting/approve-ratio/${id}`, 'POST');
        if (res.success) {
            if (typeof showToast === 'function') showToast('Đã duyệt tỉ lệ đơn cắt thành công!', 'success');
            await _tlcgLoadDrawerContent(_tlcg.activeMaterial);
            await _tlcgLoadData();
        } else {
            if (typeof showToast === 'function') showToast(res.error || 'Duyệt thất bại', 'error');
        }
    } catch (err) {
        console.error('[Approve ticket error]', err);
        if (typeof showToast === 'function') showToast(err.message, 'error');
    }
}

async function _tlcgUnapproveTicket(id, confirmMsg) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    try {
        const res = await apiCall(`/api/cutting/unapprove-ratio/${id}`, 'POST');
        if (res.success) {
            if (typeof showToast === 'function') showToast('Đã hủy trạng thái đơn cắt!', 'success');
            await _tlcgLoadDrawerContent(_tlcg.activeMaterial);
            await _tlcgLoadData();
        } else {
            if (typeof showToast === 'function') showToast(res.error || 'Hủy trạng thái thất bại', 'error');
        }
    } catch (err) {
        console.error('[Unapprove ticket error]', err);
        if (typeof showToast === 'function') showToast(err.message, 'error');
    }
}

async function _tlcgRejectTicket(id) {
    if (!confirm('Bạn có chắc chắn muốn chuyển trạng thái đơn cắt này thành không duyệt?')) return;
    try {
        const res = await apiCall(`/api/cutting/reject-ratio/${id}`, 'POST');
        if (res.success) {
            if (typeof showToast === 'function') showToast('Đã chuyển trạng thái đơn cắt thành không duyệt!', 'success');
            await _tlcgLoadDrawerContent(_tlcg.activeMaterial);
            await _tlcgLoadData();
        } else {
            if (typeof showToast === 'function') showToast(res.error || 'Thao tác thất bại', 'error');
        }
    } catch (err) {
        console.error('[Reject ticket error]', err);
        if (typeof showToast === 'function') showToast(err.message, 'error');
    }
}

function _tlcgSetFilter(val) {
    _tlcg.activeFilter = val;
    _tlcgLoadDrawerContent(_tlcg.activeMaterial);
}

function _tlcgSetDrawerRangeFilter(val) {
    _tlcg.drawerRangeFilterId = val;
    _tlcg.initialOrderMap = null;
    _tlcgLoadDrawerContent(_tlcg.activeMaterial);
}

function _tlcgSetDrawerSegmentFilter(val) {
    _tlcg.drawerSegmentFilter = val;
    _tlcg.initialOrderMap = null;
    _tlcgLoadDrawerContent(_tlcg.activeMaterial);
}

async function _tlcgApproveBatch(ids) {
    if (!ids || ids.length === 0) return;
    if (!confirm(`Bạn có chắc chắn muốn DUYỆT TẤT CẢ ${ids.length} đơn cắt chờ xử lý này không?`)) return;
    try {
        const res = await apiCall('/api/cutting/approve-ratio-batch', 'POST', { ids });
        if (res.success) {
            if (typeof showToast === 'function') showToast(`Đã duyệt thành công ${ids.length} đơn cắt!`, 'success');
            await _tlcgLoadDrawerContent(_tlcg.activeMaterial);
            await _tlcgLoadData();
        } else {
            if (typeof showToast === 'function') showToast(res.error || 'Duyệt hàng loạt thất bại', 'error');
        }
    } catch (err) {
        console.error('[Approve batch error]', err);
        if (typeof showToast === 'function') showToast(err.message, 'error');
    }
}

// ========== PRODUCT SEGMENT MODAL ==========

async function _tlcgOpenProductSegmentModal() {
    if (!document.getElementById('tlcgModalOverlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'tlcgModalOverlay';
        overlay.className = 'tlcg-modal-overlay';
        document.body.appendChild(overlay);
    }
    const overlay = document.getElementById('tlcgModalOverlay');
    
    overlay.innerHTML = `
        <div class="tlcg-modal">
            <div class="tlcg-modal-header">
                <h4 class="tlcg-modal-title">⚙️ Cấu Hình Phân Loại Sản Phẩm Nhóm "Bán"</h4>
                <button class="tlcg-drawer-close" onclick="_tlcgCloseModal()">×</button>
            </div>
            <div class="tlcg-modal-body">
                <div style="margin-bottom: 16px;">
                    <input type="text" class="tlcg-search-input" id="tlcgProdSearch" placeholder="Tìm tên sản phẩm..." oninput="_tlcgFilterModalProducts(this.value)">
                </div>
                <div class="tlcg-prod-list" id="tlcgProdList">
                    ⏳ Đang tải danh sách sản phẩm...
                </div>
            </div>
            <div class="tlcg-modal-footer">
                <button class="tlcg-btn" onclick="_tlcgCloseModal()">Hủy</button>
                <button class="tlcg-btn tlcg-btn-primary" onclick="_tlcgSaveProductSegments()">Lưu Cấu Hình</button>
            </div>
        </div>
    `;
    overlay.classList.add('active');

    try {
        const res = await apiCall('/api/cutting/products-segment', 'GET');
        _tlcg.products = res.products || [];
        _tlcgRenderModalProducts();
    } catch (err) {
        console.error('[Load prod segments error]', err);
        document.getElementById('tlcgProdList').innerText = '❌ Không thể tải danh sách sản phẩm!';
    }
}

function _tlcgCloseModal() {
    const overlay = document.getElementById('tlcgModalOverlay');
    if (overlay) overlay.classList.remove('active');
}

function _tlcgRenderModalProducts() {
    const listDiv = document.getElementById('tlcgProdList');
    if (!listDiv) return;

    const q = (document.getElementById('tlcgProdSearch')?.value || '').trim().toLowerCase();
    const filtered = _tlcg.products.filter(p => !q || p.name.toLowerCase().includes(q));

    // Sort to prioritize products that already have a size segment, then alphabetically by name
    filtered.sort((a, b) => {
        const hasSegA = a.size_segment ? 1 : 0;
        const hasSegB = b.size_segment ? 1 : 0;
        if (hasSegA !== hasSegB) {
            return hasSegB - hasSegA; // 1 (has segment) comes before 0 (no segment)
        }
        return a.name.localeCompare(b.name, 'vi');
    });

    if (filtered.length === 0) {
        listDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: #64748b;">Không tìm thấy sản phẩm nào</div>';
        return;
    }

    listDiv.innerHTML = filtered.map(p => {
        const seg = p.size_segment || '';
        const optionsHtml = (_tlcg.sizeSegments || []).map(s => {
            const icon = s.icon || '🧑';
            return `<option value="${s.name}" ${seg === s.name ? 'selected' : ''}>${icon} ${s.name}</option>`;
        }).join('');

        return `
            <div class="tlcg-prod-row" data-id="${p.id}">
                <span class="tlcg-prod-name">${p.name}</span>
                <select class="tlcg-prod-select" data-id="${p.id}">
                    <option value="" ${seg === '' ? 'selected' : ''}>-- Chưa phân loại --</option>
                    ${optionsHtml}
                </select>
            </div>
        `;
    }).join('');
}

function _tlcgFilterModalProducts(val) {
    _tlcgRenderModalProducts();
}

async function _tlcgSaveProductSegments() {
    const selects = document.querySelectorAll('.tlcg-prod-select');
    const updates = [];
    selects.forEach(sel => {
        updates.push({
            id: Number(sel.dataset.id),
            size_segment: sel.value || null
        });
    });

    try {
        const res = await apiCall('/api/cutting/products-segment', 'POST', { updates });
        if (res.success) {
            if (typeof showToast === 'function') showToast('Lưu cấu hình phân loại thành công!', 'success');
            _tlcgCloseModal();
            await _tlcgLoadData();
        } else {
            if (typeof showToast === 'function') showToast(res.error || 'Có lỗi xảy ra', 'error');
        }
    } catch (err) {
        console.error('[Save product segment error]', err);
        if (typeof showToast === 'function') showToast(err.message, 'error');
    }
}

// ========== QUANTITY RANGES MODAL ==========

async function _tlcgOpenRangeModal() {
    if (!document.getElementById('tlcgModalOverlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'tlcgModalOverlay';
        overlay.className = 'tlcg-modal-overlay';
        document.body.appendChild(overlay);
    }
    const overlay = document.getElementById('tlcgModalOverlay');

    overlay.innerHTML = `
        <div class="tlcg-modal" style="max-width: 450px;">
            <div class="tlcg-modal-header">
                <h4 class="tlcg-modal-title">⚙️ Cấu Hình Khung Số Lượng Thống Kê</h4>
                <button class="tlcg-drawer-close" onclick="_tlcgCloseModal()">×</button>
            </div>
            <div class="tlcg-modal-body">
                <p style="font-size: 12px; color: #64748b; margin: 0 0 16px 0;">Định nghĩa các khung số lượng để hệ thống phân loại thống kê tỉ lệ. Nhập số cực đại lớn (ví dụ: 999999) cho khung "Từ ... trở lên".</p>
                <div id="tlcgRangeList">
                    <!-- Loaded dynamically -->
                </div>
                <button class="tlcg-btn" style="width: 100%; border-style: dashed; border-color: #4f46e5; color: #4f46e5; margin-top: 12px; justify-content: center;" onclick="_tlcgAddEmptyRangeRow()">
                    ➕ Thêm khung mới
                </button>
            </div>
            <div class="tlcg-modal-footer">
                <button class="tlcg-btn" onclick="_tlcgCloseModal()">Hủy</button>
                <button class="tlcg-btn tlcg-btn-primary" onclick="_tlcgSaveRanges()">Lưu Cấu Hình</button>
            </div>
        </div>
    `;
    overlay.classList.add('active');

    _tlcgRenderRangesModalContent();
}

function _tlcgRenderRangesModalContent() {
    const listDiv = document.getElementById('tlcgRangeList');
    if (!listDiv) return;

    listDiv.innerHTML = _tlcg.ranges.map((r, idx) => `
        <div class="tlcg-range-row" data-idx="${idx}">
            <input type="number" class="tlcg-range-input r-min" placeholder="Từ (Min)" value="${r.min_qty}">
            <span style="color: #64748b; font-weight: 700;">➔</span>
            <input type="number" class="tlcg-range-input r-max" placeholder="Đến (Max)" value="${r.max_qty >= 999999 ? '' : r.max_qty}">
            <span style="font-size: 11px; color: #64748b; flex: 1;">${r.max_qty >= 999999 ? 'Trở lên' : 'sản phẩm'}</span>
            <button class="tlcg-drawer-close" style="background:#fee2e2; color:#ef4444; width: 28px; height: 28px;" onclick="_tlcgRemoveRangeRow(${idx})">×</button>
        </div>
    `).join('');
}

function _tlcgAddEmptyRangeRow() {
    _tlcg.ranges.push({ min_qty: 0, max_qty: 999999 });
    _tlcgRenderRangesModalContent();
}

function _tlcgRemoveRangeRow(idx) {
    _tlcg.ranges.splice(idx, 1);
    _tlcgRenderRangesModalContent();
}

async function _tlcgSaveRanges() {
    const rows = document.querySelectorAll('.tlcg-range-row');
    const ranges = [];
    
    for (const r of rows) {
        const minVal = parseInt(r.querySelector('.r-min').value);
        let maxVal = parseInt(r.querySelector('.r-max').value);
        if (isNaN(maxVal) || !maxVal) {
            maxVal = 999999;
        }

        if (isNaN(minVal) || minVal < 0 || maxVal < minVal) {
            if (typeof showToast === 'function') showToast('Giá trị khoảng số lượng không hợp lệ!', 'error');
            return;
        }

        ranges.push({ min_qty: minVal, max_qty: maxVal });
    }

    ranges.sort((a, b) => a.min_qty - b.min_qty);

    try {
        const res = await apiCall('/api/cutting/quantity-ranges', 'POST', { ranges });
        if (res.success) {
            if (typeof showToast === 'function') showToast('Cấu hình khung số lượng thành công!', 'success');
            _tlcgCloseModal();
            await _tlcgLoadData();
        } else {
            if (typeof showToast === 'function') showToast(res.error || 'Có lỗi xảy ra', 'error');
        }
    } catch (err) {
        console.error('[Save ranges error]', err);
        if (typeof showToast === 'function') showToast(err.message, 'error');
    }
}

async function _tlcgShowTicketDetail(recordId) {
    if (window._tlcgDetailBusy) return;
    window._tlcgDetailBusy = true;
    try {
        const res = await apiCall('/api/cutting/records/' + recordId);
        const r = res.record;
        if (!r) {
            if (typeof showToast === 'function') showToast('Không tìm thấy dữ liệu đơn cắt', 'error');
            return;
        }

        // Fetch reminders
        let cutReminders = [];
        let cutReminderIds = [];
        let cutViewedIds = [];
        try {
            let remUrl = '/api/qlx/reminders?order_id=' + r.dht_order_id + '&dept=cat&record_type=cutting&record_id=' + recordId;
            if (r.order_item_id) remUrl += '&item_id=' + r.order_item_id;
            if (r.phoi_index !== undefined && r.phoi_index !== null) remUrl += '&phoi_index=' + r.phoi_index;
            const remRes = await apiCall(remUrl);
            cutReminders = remRes.reminders || [];
            cutReminderIds = remRes.reminder_ids || [];
            cutViewedIds = remRes.viewed_ids || [];
        } catch(e) {
            console.error('[TLCG] Load reminders error:', e);
        }

        let rolls = [];
        try { rolls = typeof r.selected_roll_ids === 'string' ? JSON.parse(r.selected_roll_ids) : (r.selected_roll_ids || []); } catch(e) {}
        const statusTxt = r.is_cut_done ? '✅ Đã cắt xong' : r.is_cutting ? '✂️ Đang cắt' : '📋 Chờ cắt';
        const statusBg = r.is_cut_done ? '#059669' : r.is_cutting ? '#dc2626' : '#6366f1';

        // Helpers
        const localFmtKg = (val) => {
            if (val === null || val === undefined || val === '' || val === '—') return '—';
            const str = String(val).replace(',', '.');
            const num = Number(str);
            if (isNaN(num)) return val;
            const parts = str.split('.');
            if (parts.length > 1 && parts[1].length > 0) {
                return parts[0] + '.' + parts[1].substring(0, 1);
            }
            return parts[0];
        };

        const localFormatOrderQty = (qty, productName, cuttingCategory) => {
            if (qty === null || qty === undefined || qty === '' || qty === '—') return '—';
            let phoiInItem = 1;
            if (productName) {
                const match = productName.match(/— P(\d+)/);
                if (match) phoiInItem = parseInt(match[1]);
            }
            if (phoiInItem === 1) {
                const suffix = cuttingCategory ? (' ' + cuttingCategory) : '';
                return qty + suffix;
            } else {
                return qty + ' Phối';
            }
        };

        const localFormatVNTime = (isoStr) => {
            if (!isoStr) return '—';
            try {
                const d = new Date(isoStr);
                if (isNaN(d.getTime())) return isoStr;
                const vnDate = new Date(d.getTime() + 7 * 3600000);
                const pad = (n) => String(n).padStart(2, '0');
                const hour = pad(vnDate.getUTCHours());
                const min = pad(vnDate.getUTCMinutes());
                const date = pad(vnDate.getUTCDate());
                const month = pad(vnDate.getUTCMonth() + 1);
                const year = vnDate.getUTCFullYear();
                return `${hour}:${min} ${date}/${month}/${year}`;
            } catch (e) {
                return isoStr;
            }
        };

        let h = '<div class="bpc-modal-overlay" id="_bpcDetailModal" onclick="if(event.target===this)this.classList.remove(\'show\'),setTimeout(function(){document.getElementById(\'_bpcDetailModal\').remove()},300)">';
        h += '<div class="bpc-modal" style="width:540px">';
        h += '<div class="bpc-modal-header" style="background:linear-gradient(135deg,'+statusBg+','+statusBg+'cc)"><div class="m-icon">📋</div><div><div class="m-title">CHI TIẾT ĐƠN CẮT</div><div class="m-sub">' + statusTxt + '</div></div></div>';
        h += '<div class="bpc-modal-body" style="max-height:65vh;overflow-y:auto">';
        
        // Order info
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📋 Tên SP</span><span class="bpc-modal-val" style="font-size:12px">' + (r.product_name||r.order_code||'—') + '</span></div>';
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">🧵 Chất liệu</span><span class="bpc-modal-val"><span style="background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:6px;font-size:12px;font-weight:700">' + (r.material_name||'—') + '</span></span></div>';
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">🎨 Màu</span><span class="bpc-modal-val"><span style="background:#1e293b;color:#fff;padding:2px 10px;border-radius:6px;font-size:12px;font-weight:700">' + (r.fabric_color||'—') + '</span></span></div>';
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">🏷️ Sản Phẩm Cắt</span><span class="bpc-modal-val"><span style="background:#dbeafe;color:#1d4ed8;padding:2px 10px;border-radius:6px;font-size:12px;font-weight:700">' + (r.cutting_category||'—') + '</span></span></div>';
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">👤 NV Cắt</span><span class="bpc-modal-val" style="color:#059669">' + (r.cutter_name||'—') + '</span></div>';
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📅 Cắt Xong</span><span class="bpc-modal-val">' + (r.cut_done_at ? localFormatVNTime(r.cut_done_at) : (r.cut_date ? localFormatVNTime(r.cut_date) : '—')) + '</span></div>';
        h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📦 SL Đơn</span><span class="bpc-modal-val" style="color:#0369a1;font-size:15px">' + localFormatOrderQty(r.order_quantity, r.product_name, r.cutting_category) + '</span></div>';

        // Wash reported details
        if (r.wash_reported) {
            h += '<div style="border-top:2px solid #e2e8f0;margin:12px 0;padding-top:12px">';
            h += '<div style="font-size:11px;font-weight:800;color:#6366f1;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">🫧 CHI TIẾT GIẶT VẢI</div>';
            h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📅 Thời gian báo giặt</span><span class="bpc-modal-val">' + localFormatVNTime(r.wash_reported_at) + '</span></div>';
            h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">👤 Người báo giặt</span><span class="bpc-modal-val" style="color:#6366f1">' + (r.wash_reported_by_name || '—') + '</span></div>';
            
            let washItems = [];
            try { washItems = typeof r.wash_items === 'string' ? JSON.parse(r.wash_items) : (r.wash_items || []); } catch(e) {}
            if (Array.isArray(washItems) && washItems.length > 0) {
                h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">👕 Bộ phận cần giặt</span><span class="bpc-modal-val">';
                washItems.forEach(item => {
                    h += '<span style="background:#e0e7ff;color:#4338ca;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;margin-left:4px;display:inline-block">' + item + '</span>';
                });
                h += '</span></div>';
            }
            h += '</div>';
        }

        // Error reported details
        if (r.error_reported) {
            h += '<div style="border-top:2px solid #e2e8f0;margin:12px 0;padding-top:12px">';
            h += '<div style="font-size:11px;font-weight:800;color:#dc2626;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">🚨 CHI TIẾT BÁO LỖI</div>';
            h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📅 Thời gian báo lỗi</span><span class="bpc-modal-val">' + localFormatVNTime(r.error_reported_at) + '</span></div>';
            h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">👤 Người báo lỗi</span><span class="bpc-modal-val" style="color:#dc2626">' + (r.error_reporter_name || '—') + '</span></div>';
            if (r.error_common_type) {
                h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">⚠️ Loại lỗi</span><span class="bpc-modal-val" style="color:#d97706">' + r.error_common_type + '</span></div>';
            }
            h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📦 Số lượng lỗi</span><span class="bpc-modal-val" style="color:#dc2626;font-weight:800">' + (r.error_quantity_reported || 0) + ' sp</span></div>';
            h += '<div style="margin-top:6px;padding:8px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;font-size:12px">';
            h += '<span style="font-weight:700;color:#991b1b">📝 Nội dung lỗi:</span>';
            h += '<div style="white-space:pre-wrap;color:#374151;margin-top:4px;font-weight:500;text-align:left">' + (r.error_content_reported || '—') + '</div>';
            h += '</div>';

            let errImages = [];
            try { errImages = typeof r.error_images_json === 'string' ? JSON.parse(r.error_images_json) : (r.error_images_json || []); } catch(e) {}
            if (Array.isArray(errImages) && errImages.length > 0) {
                h += '<div style="margin-top:8px;">';
                h += '<div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px;text-align:left">📷 Hình ảnh lỗi:</div>';
                h += '<div style="display:flex;flex-wrap:wrap;gap:8px">';
                errImages.forEach(imgUrl => {
                    h += '<img src="' + imgUrl + '" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;cursor:pointer" onclick="window.open(\'' + imgUrl + '\',\'_blank\')">';
                });
                h += '</div>';
                h += '</div>';
            }
            h += '</div>';
        }

        // Selected rolls
        h += '<div style="border-top:2px solid #e2e8f0;margin:12px 0;padding-top:12px"><div style="font-size:11px;font-weight:800;color:#059669;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">📦 CÂY VẢI ĐÃ CHỌN (' + rolls.length + ')</div>';
        if (rolls.length) {
            rolls.forEach((rl, idx) => {
                let locBadge = '';
                if (rl.roll_loc_name) {
                    let bColor = '#64748b';
                    let bBg = 'rgba(100,116,139,0.08)';
                    if (rl.roll_loc_name.indexOf('Chưa Phân Vị Trí') !== -1) {
                        if (rl.roll_loc_name.indexOf('Cây Nguyên') !== -1) {
                            bColor = '#b45309';
                            bBg = '#fef3c7';
                        } else {
                            bColor = '#b91c1c';
                            bBg = '#fee2e2';
                        }
                    } else {
                        bColor = '#2563eb';
                        bBg = '#dbeafe';
                    }
                    locBadge = '<div style="margin-top:4px;font-size:10px;font-weight:800;color:'+bColor+';background:'+bBg+';padding:2px 6px;border-radius:6px;border:1px solid ' + bColor + '40;display:inline-block">📍 '+rl.roll_loc_name+'</div>';
                }
                let imgHtml = '';
                if (rl.image_path) {
                    imgHtml = '<img src="' + rl.image_path + '" style="width:36px;height:36px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1;cursor:pointer;flex-shrink:0;margin-right:8px" onclick="event.preventDefault(); event.stopPropagation(); window.open(\'' + rl.image_path + '\', \'_blank\')">';
                }
                h += '<div style="padding:8px 14px;border:1.5px solid #f1f5f9;border-radius:10px;margin-bottom:6px;font-size:13px;font-weight:600;color:#1e293b;display:flex;align-items:center">';
                if (imgHtml) h += imgHtml;
                h += '<div style="flex:1;display:flex;flex-direction:column;align-items:flex-start"><span>' + (idx+1) + '. ' + (rl.label || rl.roll_code || 'Cây '+(idx+1)) + '</span>' + locBadge + '</div></div>';
            });
        } else {
            h += '<div style="text-align:center;padding:12px;color:#94a3b8;font-size:12px">Chưa có dữ liệu cây vải</div>';
        }
        h += '</div>';

        // Kg stats
        h += '<div style="border-top:2px solid #e2e8f0;margin:12px 0;padding-top:12px">';
        h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
        h += '<div style="background:#fef3c7;padding:10px;border-radius:10px;text-align:center"><div style="font-size:9px;font-weight:700;color:#92400e">⚖️ KG ĐẦU</div><div style="font-size:18px;font-weight:900;color:#b45309">' + localFmtKg(r.kg_start) + '</div></div>';
        h += '<div style="background:#dcfce7;padding:10px;border-radius:10px;text-align:center"><div style="font-size:9px;font-weight:700;color:#166534">✂️ KG CẮT</div><div style="font-size:18px;font-weight:900;color:#059669">' + localFmtKg(r.kg_cut) + '</div></div>';
        h += '<div style="background:#fee2e2;padding:10px;border-radius:10px;text-align:center"><div style="font-size:9px;font-weight:700;color:#991b1b">⚖️ KG CUỐI</div><div style="font-size:18px;font-weight:900;color:#dc2626">' + localFmtKg(r.kg_end) + '</div></div>';
        h += '<div style="background:#dbeafe;padding:10px;border-radius:10px;text-align:center"><div style="font-size:9px;font-weight:700;color:#1e40af">📦 SL CẮT</div><div style="font-size:18px;font-weight:900;color:#2563eb">' + (r.cut_quantity||'—') + '</div></div>';
        h += '</div></div>';

        // Ratio
        if (r.cut_ratio) {
            let rc = '#3b82f6';
            const tr = Number(r.target_cut_ratio) || 0;
            if (tr > 0) {
                rc = Number(r.cut_ratio) >= tr ? '#059669' : '#dc2626';
            }
            h += '<div style="border-top:2px solid #e2e8f0;margin:12px 0;padding-top:12px">';
            h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📊 Định Lượng Thực Tế</span><span class="bpc-modal-val" style="color:'+rc+';font-size:18px">' + Number(r.cut_ratio).toFixed(2) + ' sp/' + (r.fabric_unit || 'kg') + '</span></div>';
            if (tr > 0) {
                h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">⚖️ Định Lượng Cắt Yêu Cầu</span><span class="bpc-modal-val" style="color:#059669;font-weight:700">' + tr + ' sp/' + (r.fabric_unit || 'kg') + '</span></div>';
            }
            if (r.ratio_reason) h += '<div class="bpc-modal-row"><span class="bpc-modal-lbl">📝 Lý do sai định lượng :</span><span class="bpc-modal-val" style="font-size:11px;color:#64748b;white-space:pre-wrap">' + r.ratio_reason + '</span></div>';
            h += '</div>';
        }

        h += '</div>'; // bpc-modal-body end
        h += '<div style="padding:12px 24px;border-top:1px solid #f1f5f9;text-align:center"><button class="bpc-modal-btn cancel" style="width:100%" onclick="var m=document.getElementById(\'_bpcDetailModal\');if(m){m.classList.remove(\'show\');setTimeout(function(){m.remove()},300)}">Đóng</button></div>';
        h += '</div></div>';

        document.body.insertAdjacentHTML('beforeend', h);
        requestAnimationFrame(() => {
            const m = document.getElementById('_bpcDetailModal');
            if (m) m.classList.add('show');
        });

    } catch (err) {
        console.error('[TLCG Detail error]', err);
        if (typeof showToast === 'function') showToast(err.message, 'error');
    } finally {
        window._tlcgDetailBusy = false;
    }
}

// ========== CUSTOMER PRICE INQUIRY CALCULATOR ==========

// ========== PET PRINTING UTILITIES ==========
function _tlcgLoadPetConfigs() {
    _tlcg.petEnabled = localStorage.getItem('tlcg_pet_enabled') === 'true';
    _tlcg.petSheetPrice = Number(localStorage.getItem('tlcg_pet_sheet_price')) || 40000;
    const storedSpacing = localStorage.getItem('tlcg_pet_spacing');
    if (storedSpacing === null || storedSpacing === '0.3' || storedSpacing === '3' || storedSpacing === '03') {
        _tlcg.petSpacing = 0.4;
        localStorage.setItem('tlcg_pet_spacing', '0.4');
    } else {
        _tlcg.petSpacing = Number(storedSpacing);
    }
    _tlcg.petCalcMode = localStorage.getItem('tlcg_pet_calc_mode') || 'aligned';
    try {
        const storedShapes = localStorage.getItem('tlcg_pet_shapes');
        if (storedShapes) {
            const parsed = JSON.parse(storedShapes);
            if (Array.isArray(parsed)) {
                // Filter out null/invalid elements AND ghost shapes (all fields empty)
                const cleaned = parsed.filter(s => {
                    if (!s || typeof s !== 'object') return false;
                    // Keep only shapes that have at least some real data
                    const hasName = s.name && s.name.trim() !== '';
                    const hasWidth = s.width !== '' && s.width !== undefined && s.width !== null && Number(s.width) > 0;
                    const hasHeight = s.height !== '' && s.height !== undefined && s.height !== null && Number(s.height) > 0;
                    return hasName || hasWidth || hasHeight;
                });
                _tlcg.petShapes = cleaned;
                // Persist the cleaned version
                if (cleaned.length !== parsed.length) {
                    localStorage.setItem('tlcg_pet_shapes', JSON.stringify(cleaned));
                }
            } else {
                _tlcg.petShapes = [];
                localStorage.setItem('tlcg_pet_shapes', JSON.stringify([]));
            }
        } else {
            _tlcg.petShapes = [];
        }
    } catch(e) {
        _tlcg.petShapes = [];
    }
}

function _tlcgSavePetConfigs() {
    const enableCb = document.getElementById('calc_enable_pet');
    if (enableCb) {
        localStorage.setItem('tlcg_pet_enabled', enableCb.checked ? 'true' : 'false');
    }
    const priceInput = document.getElementById('pet_sheet_price');
    if (priceInput) {
        localStorage.setItem('tlcg_pet_sheet_price', priceInput.value);
    }
    const spacingInput = document.getElementById('pet_spacing');
    if (spacingInput) {
        localStorage.setItem('tlcg_pet_spacing', spacingInput.value);
    }
    if (Array.isArray(_tlcg.petShapes)) {
        const cleanShapes = _tlcg.petShapes.filter(s => s && typeof s === 'object');
        localStorage.setItem('tlcg_pet_shapes', JSON.stringify(cleanShapes));
    }
}

function _tlcgTogglePetSection(enabled) {
    const globalDiv = document.getElementById('pet_global_settings');
    const containerDiv = document.getElementById('pet_shapes_container');
    if (globalDiv && containerDiv) {
        globalDiv.style.display = enabled ? 'flex' : 'none';
        containerDiv.style.display = enabled ? 'block' : 'none';
    }
    _tlcgSavePetConfigs();
    _tlcgRenderPetShapeRows();
    _tlcgRenderCalcResults();
}

function _tlcgRenderPetShapeRows() {
    const list = document.getElementById('pet_shapes_rows');
    if (!list) return;
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '8px';
    
    if (!Array.isArray(_tlcg.petShapes)) {
        _tlcg.petShapes = [];
    }
    const shapes = _tlcg.petShapes.filter(s => s && typeof s === 'object');
    if (shapes.length === 0) {
        list.innerHTML = `<div style="font-size: 12px; color: #166534; font-style: italic;">Chưa có hình in nào. Vui lòng bấm nút Thêm hình in ở dưới.</div>`;
        return;
    }
    
    list.innerHTML = shapes.map((s, idx) => `
        <div class="pet-shape-row" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;" data-idx="${idx}">
            <input type="text" class="tlcg-search-input p-name" placeholder="Tên hình (vd: Logo ngực...)" style="flex: 2; min-width: 140px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; font-size: 12px; background: white;" value="${s.name || ''}" onchange="_tlcgUpdatePetShape(${idx}, 'name', this.value)">
            <div style="display: flex; align-items: center; gap: 4px;">
                <input type="text" class="tlcg-search-input p-width" placeholder="Rộng" style="width: 70px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 12px; background: white;" value="${s.width || ''}" oninput="this.value = this.value.replace(/,/g, '.').replace(/[^0-9.]/g, '')" onchange="_tlcgUpdatePetShape(${idx}, 'width', this.value)">
                <span style="font-size: 12px; color: #64748b;">x</span>
                <input type="text" class="tlcg-search-input p-height" placeholder="Cao" style="width: 70px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 12px; background: white;" value="${s.height || ''}" oninput="this.value = this.value.replace(/,/g, '.').replace(/[^0-9.]/g, '')" onchange="_tlcgUpdatePetShape(${idx}, 'height', this.value)">
                <span style="font-size: 12px; color: #166534; font-weight: 600;">cm</span>
            </div>
            <button class="tlcg-btn" style="background: #fee2e2; color: #ef4444; border: none; padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;" onclick="_tlcgRemovePetShapeRow(${idx})">Xóa</button>
        </div>
    `).join('');
}

function _tlcgAddPetShapeRow() {

    if (!Array.isArray(_tlcg.petShapes)) {
        _tlcg.petShapes = [];
    }
    _tlcg.petShapes = _tlcg.petShapes.filter(s => s && typeof s === 'object');
    _tlcg.petShapes.push({ name: '', width: '', height: '' });

    _tlcgRenderPetShapeRows();
    _tlcgSavePetConfigs();
    _tlcgRenderCalcResults();
}

function _tlcgRemovePetShapeRow(idx) {
    if (Array.isArray(_tlcg.petShapes)) {
        _tlcg.petShapes = _tlcg.petShapes.filter(s => s && typeof s === 'object');
        _tlcg.petShapes.splice(idx, 1);
        _tlcgRenderPetShapeRows();
        _tlcgSavePetConfigs();
        _tlcgRenderCalcResults();
    }
}

function _tlcgUpdatePetShape(idx, field, val) {
    if (Array.isArray(_tlcg.petShapes)) {
        _tlcg.petShapes = _tlcg.petShapes.filter(s => s && typeof s === 'object');
        if (_tlcg.petShapes[idx]) {
            if (field === 'width' || field === 'height') {
                const cleanVal = String(val).replace(/,/g, '.');
                _tlcg.petShapes[idx][field] = cleanVal !== '' ? Number(cleanVal) : '';
            } else {
                _tlcg.petShapes[idx][field] = val;
            }
            _tlcgSavePetConfigs();
            _tlcgRenderCalcResults();
        }
    }
}

function _tlcgUpdatePetMode(val) {
    localStorage.setItem('tlcg_pet_calc_mode', val);
    _tlcgRenderCalcResults();
}

function _tlcgCalculatePacking(W_sheet, H_sheet, w, h, s) {
    if (w <= 0 || h <= 0 || W_sheet <= 0 || H_sheet <= 0) return { aligned: 0, optimized: 0 };
    
    s = Number(s) || 0;
    
    // Option 1: Horizontal packing (all items w wide, h high)
    const nw_horiz = Math.floor((W_sheet + s) / (w + s));
    const nh_horiz = Math.floor((H_sheet + s) / (h + s));
    const countHoriz = (nw_horiz > 0 && nh_horiz > 0) ? nw_horiz * nh_horiz : 0;
    
    // Option 2: Vertical packing (all items h wide, w high)
    const nw_vert = Math.floor((W_sheet + s) / (h + s));
    const nh_vert = Math.floor((H_sheet + s) / (w + s));
    const countVert = (nw_vert > 0 && nh_vert > 0) ? nw_vert * nh_vert : 0;
    
    const aligned = Math.max(countHoriz, countVert);
    
    let optimized = aligned;
    
    // Helper to calculate count for a horizontal split
    function checkHorizontalSplit(wA, hA, wB, hB) {
        const maxA = Math.floor((H_sheet + s) / (hA + s));
        for (let rA = 0; rA <= maxA; rA++) {
            const heightA = rA > 0 ? (rA * (hA + s) - s) : 0;
            const remainH = H_sheet - heightA - (rA > 0 ? s : 0);
            const rB = remainH >= hB ? Math.floor((remainH + s) / (hB + s)) : 0;
            
            const cA = Math.floor((W_sheet + s) / (wA + s));
            const cB = Math.floor((W_sheet + s) / (wB + s));
            
            const total = (rA * cA) + (rB * cB);
            if (total > optimized) optimized = total;
        }
    }
    
    // Helper to calculate count for a vertical split
    function checkVerticalSplit(wA, hA, wB, hB) {
        const maxA = Math.floor((W_sheet + s) / (wA + s));
        for (let cA = 0; cA <= maxA; cA++) {
            const widthA = cA > 0 ? (cA * (wA + s) - s) : 0;
            const remainW = W_sheet - widthA - (cA > 0 ? s : 0);
            const cB = remainW >= wB ? Math.floor((remainW + s) / (wB + s)) : 0;
            
            const rA = Math.floor((H_sheet + s) / (hA + s));
            const rB = Math.floor((H_sheet + s) / (hB + s));
            
            const total = (cA * rA) + (cB * rB);
            if (total > optimized) optimized = total;
        }
    }
    
    checkHorizontalSplit(w, h, h, w);
    checkHorizontalSplit(h, w, w, h);
    checkVerticalSplit(w, h, h, w);
    checkVerticalSplit(h, w, w, h);
    
    return { aligned, optimized };
}

function _tlcgGetPetCosts() {
    const enabled = document.getElementById('calc_enable_pet')?.checked;
    if (!enabled) return { enabled: false, alignedCost: 0, optimizedCost: 0, details: [] };
    
    const shapes = _tlcg.petShapes || [];
    const validShapes = shapes.filter(s => Number(s.width) > 0 && Number(s.height) > 0);
    if (validShapes.length === 0) {
        return { enabled: false, alignedCost: 0, optimizedCost: 0, details: [] };
    }
    
    const price = Number(document.getElementById('pet_sheet_price')?.value) || 0;
    const spacing = Number(document.getElementById('pet_spacing')?.value) || 0;
    
    let alignedCost = 0;
    let optimizedCost = 0;
    const details = [];
    
    shapes.forEach(s => {
        const w = Number(s.width);
        const h = Number(s.height);
        if (w > 0 && h > 0) {
            const packing = _tlcgCalculatePacking(58, 100, w, h, spacing);
            const aCost = packing.aligned > 0 ? (price / packing.aligned) : 0;
            const oCost = packing.optimized > 0 ? (price / packing.optimized) : 0;
            alignedCost += aCost;
            optimizedCost += oCost;
            details.push({
                name: s.name || 'Hình in',
                width: w,
                height: h,
                packing,
                aCost,
                oCost
            });
        }
    });
    
    return {
        enabled: true,
        alignedCost: Math.round(alignedCost),
        optimizedCost: Math.round(optimizedCost),
        details
    };
}

async function _tlcgOpenPricingCalculatorModal() {
    if (!document.getElementById('tlcgModalOverlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'tlcgModalOverlay';
        overlay.className = 'tlcg-modal-overlay';
        document.body.appendChild(overlay);
    }
    const overlay = document.getElementById('tlcgModalOverlay');

    _tlcgLoadPetConfigs();

    overlay.innerHTML = `
        <div class="tlcg-modal" style="max-width: 800px; width: 90%;">
            <div class="tlcg-modal-header" style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); color: white; padding: 16px 20px;">
                <h4 class="tlcg-modal-title" style="color: white; font-weight: 800; font-size: 16px; margin: 0; display: flex; align-items: center; gap: 8px;">
                    🧮 Tra Cứu & So Sánh Giá Vải Thành Phẩm
                </h4>
                <button class="tlcg-drawer-close" style="color: white; background: rgba(255,255,255,0.2); border-radius: 50%; width: 28px; height: 28px; line-height: 28px; font-size: 16px;" onclick="_tlcgCloseModal()">×</button>
            </div>
            <div class="tlcg-modal-body" style="max-height: 75vh; overflow-y: auto; padding: 20px;">
                <div class="calculator-inputs" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 20px; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">Chất liệu *</label>
                        <select id="calc_material_id" class="tlcg-search-input" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px;" onchange="_tlcgCalcHandleMaterialChange(this.value)">
                            <option value="">-- Chọn chất liệu --</option>
                            ${_tlcg.materials.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">Màu sắc *</label>
                        <select id="calc_color_id" class="tlcg-search-input" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px;">
                            <option value="">-- Chọn màu sắc --</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">Phân khúc</label>
                        <select id="calc_segment" class="tlcg-search-input" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px;">
                            <option value="">-- Tất cả phân khúc --</option>
                            ${(_tlcg.sizeSegments || []).map(s => {
                                return `<option value="${s.name}">${s.icon || '🧑'} ${s.name}</option>`;
                            }).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">Số lượng áo</label>
                        <input type="number" id="calc_quantity" class="tlcg-search-input" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px;" placeholder="Tự điền (tùy chọn)">
                    </div>
                </div>

                <!-- PET Printing Setup Section -->
                <div class="pet-setup-section" style="margin-bottom: 20px; background: #f0fdf4; padding: 16px; border-radius: 12px; border: 1px solid #bbf7d0;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                        <label style="font-weight: 800; font-size: 13.5px; color: #166534; display: flex; align-items: center; gap: 6px; cursor: pointer; margin: 0;">
                            <input type="checkbox" id="calc_enable_pet" style="width: 16px; height: 16px; cursor: pointer;" onchange="_tlcgTogglePetSection(this.checked)" ${_tlcg.petEnabled ? 'checked' : ''}>
                            🖨️ Tính thêm chi phí in PET
                        </label>
                        
                        <div id="pet_global_settings" style="display: ${_tlcg.petEnabled ? 'flex' : 'none'}; align-items: center; gap: 12px; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span style="font-size: 11px; font-weight: 700; color: #166534;">Giá khổ 58x100:</span>
                                <input type="number" id="pet_sheet_price" class="tlcg-search-input" style="width: 90px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; font-size: 12px; background: white;" value="${_tlcg.petSheetPrice}" oninput="_tlcgSavePetConfigs()">
                                <span style="font-size: 11px; color: #166534; font-weight: 600;">đ</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span style="font-size: 11px; font-weight: 700; color: #166534;">Khoảng cách:</span>
                                <input type="text" id="pet_spacing" class="tlcg-search-input" style="width: 60px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; font-size: 12px; background: white;" value="${_tlcg.petSpacing}" oninput="this.value = this.value.replace(/,/g, '.').replace(/[^0-9.]/g, ''); _tlcgSavePetConfigs()">
                                <span style="font-size: 11px; color: #166534; font-weight: 600;">cm</span>
                            </div>
                        </div>
                    </div>
                    
                    <div id="pet_shapes_container" style="display: ${_tlcg.petEnabled ? 'block' : 'none'}; border-top: 1px dashed #bbf7d0; padding-top: 12px;">
                        <div id="pet_shapes_rows" style="display: flex; flex-direction: column; gap: 8px;">
                            <!-- Shape rows rendered here -->
                        </div>
                        <button class="tlcg-btn" style="margin-top: 10px; font-size: 12px; padding: 6px 12px; background: #166534; color: white; border: none; border-radius: 6px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;" onclick="_tlcgAddPetShapeRow()">
                            ➕ Thêm hình in
                        </button>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 20px;">
                    <button class="tlcg-btn" style="border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 8px; font-weight: 600;" onclick="_tlcgCloseModal()">Hủy</button>
                    <button class="tlcg-btn tlcg-btn-primary" style="padding: 8px 16px; border-radius: 8px; font-weight: 600;" onclick="_tlcgRunCalculation()">🧮 Tính toán & So sánh</button>
                </div>

                <div id="calc_results" style="display: none;">
                    <!-- Calculations will be rendered here dynamically -->
                </div>
            </div>
        </div>
    `;
    overlay.classList.add('active');
    _tlcgRenderPetShapeRows();
}

function _tlcgCalcHandleMaterialChange(matId) {
    const colorSelect = document.getElementById('calc_color_id');
    const segmentSelect = document.getElementById('calc_segment');
    if (!colorSelect || !segmentSelect) return;
    
    colorSelect.innerHTML = '<option value="">-- Chọn màu sắc --</option>';
    
    if (!matId) {
        segmentSelect.innerHTML = `
            <option value="">-- Tất cả phân khúc --</option>
            ${(_tlcg.sizeSegments || []).map(s => {
                return `<option value="${s.name}">${s.icon || '🧑'} ${s.name}</option>`;
            }).join('')}
        `;
        return;
    }

    // Filter colors by material_id
    const filteredColors = _tlcg.colors.filter(c => String(c.material_id) === String(matId));
    filteredColors.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.color_name;
        colorSelect.appendChild(opt);
    });

    // Populate active segments for this material
    const mat = _tlcg.materials.find(m => m.id === Number(matId));
    const activeSegs = _tlcgGetActiveSegmentsForMaterial(mat);
    segmentSelect.innerHTML = `
        <option value="">-- Tất cả phân khúc --</option>
        ${activeSegs.map(seg => {
            const segObj = (_tlcg.sizeSegments || []).find(s => s.name === seg);
            const icon = segObj && segObj.icon ? segObj.icon : '🧑';
            return `<option value="${seg}">${icon} ${seg}</option>`;
        }).join('')}
    `;
}

async function _tlcgRunCalculation() {
    const matId = document.getElementById('calc_material_id').value;
    const colorId = document.getElementById('calc_color_id').value;
    const segment = document.getElementById('calc_segment').value;
    const qty = document.getElementById('calc_quantity').value;

    if (!matId || !colorId) {
        if (typeof showToast === 'function') showToast('Vui lòng chọn đầy đủ chất liệu và màu sắc!', 'error');
        return;
    }

    const petEnabled = document.getElementById('calc_enable_pet')?.checked;
    if (petEnabled) {
        const shapes = _tlcg.petShapes || [];
        if (shapes.length === 0) {
            if (typeof showToast === 'function') showToast('Vui lòng thêm ít nhất một hình in PET!', 'error');
            return;
        }
        
        let hasInvalidShape = false;
        for (const s of shapes) {
            const w = Number(s.width);
            const h = Number(s.height);
            if (!s.name || isNaN(w) || w <= 0 || isNaN(h) || h <= 0) {
                hasInvalidShape = true;
                break;
            }
        }
        
        if (hasInvalidShape) {
            if (typeof showToast === 'function') showToast('Vui lòng điền đầy đủ tên và kích thước (> 0) cho tất cả hình in PET!', 'error');
            return;
        }
    }

    const resultsDiv = document.getElementById('calc_results');
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = '<div style="text-align: center; padding: 40px; color: #64748b; font-weight: 600; font-size: 14px;">⏳ Đang tính toán dữ liệu...</div>';

    try {
        const payload = {
            material_id: Number(matId),
            fabric_color_id: Number(colorId)
        };
        if (segment) payload.size_segment = segment;
        if (qty !== '') payload.quantity = Number(qty);

        const res = await apiCall('/api/pricing/calculate', 'POST', payload);
        if (!res.success) {
            resultsDiv.innerHTML = `<div style="padding: 16px; background: #fee2e2; color: #b91c1c; border-radius: 8px; font-weight: 600;">❌ Lỗi: ${res.error || 'Có lỗi xảy ra'}</div>`;
            return;
        }

        // Save last response and default selected supplier
        _tlcg.lastCalcResponse = res;
        _tlcg.selectedCalcSupplierId = 'all';

        // Render the results
        _tlcgRenderCalcResults();
    } catch (err) {
        console.error('[Run calculation error]', err);
        resultsDiv.innerHTML = `<div style="padding: 16px; background: #fee2e2; color: #b91c1c; border-radius: 8px; font-weight: 600;">❌ Lỗi: ${err.message}</div>`;
    }
}

function _tlcgSelectCalcSupplier(supplierId) {
    _tlcg.selectedCalcSupplierId = String(supplierId);
    _tlcgRenderCalcResults();
}

function _tlcgRenderCalcResults() {
    const res = _tlcg.lastCalcResponse;
    const resultsDiv = document.getElementById('calc_results');
    if (!res || !resultsDiv) return;

    const selectedId = _tlcg.selectedCalcSupplierId || 'all';

    // Get PET cost details
    const petInfo = _tlcgGetPetCosts();
    const petCost = petInfo.enabled ? (localStorage.getItem('tlcg_pet_calc_mode') === 'optimized' ? petInfo.optimizedCost : petInfo.alignedCost) : 0;

    const getRankStyles = (idx) => {
        const icons = ['🏆 ', '🥈 ', '🥉 ', '• '];
        const icon = icons[Math.min(idx, 3)];
        
        let nameColor = '#1e293b';
        let priceColor = '#334155';
        let fontWeight = '600';
        
        if (idx === 0) {
            priceColor = '#15803d'; // Green 700
            nameColor = '#1e3a8a';  // Navy 800
            fontWeight = '800';
        } else if (idx === 1) {
            priceColor = '#c2410c'; // Orange 700
            nameColor = '#0369a1';  // Light Navy 700
            fontWeight = '700';
        } else if (idx === 2) {
            priceColor = '#b91c1c'; // Red 700
            nameColor = '#4f46e5';  // Indigo 600
            fontWeight = '700';
        } else {
            priceColor = '#475569'; // Slate 600
            nameColor = '#475569';  // Slate 600
            fontWeight = '500';
        }
        
        return { icon, nameColor, priceColor, fontWeight };
    };

    let html = '';

    // Render PET Print summary at top if enabled
    if (petInfo.enabled) {
        const selectedMode = localStorage.getItem('tlcg_pet_calc_mode') || 'aligned';
        html += `
            <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 12px; padding: 14px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <div style="font-size: 13px; font-weight: 800; color: #166534; text-transform: uppercase; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                    🖨️ Chi phí in PET dự kiến (cho 1 áo)
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
                    <label style="background: white; border: 1.5px solid ${selectedMode === 'aligned' ? '#166534' : '#e2e8f0'}; border-radius: 8px; padding: 10px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); margin: 0;">
                        <input type="radio" name="pet_calc_mode" value="aligned" ${selectedMode === 'aligned' ? 'checked' : ''} onchange="_tlcgUpdatePetMode(this.value)">
                        <div>
                            <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Xếp Thẳng Hàng (Dễ Cắt)</div>
                            <div style="font-size: 15px; font-weight: 800; color: #166534;">${Number(petInfo.alignedCost).toLocaleString('vi-VN')} đ / áo</div>
                        </div>
                    </label>
                    <label style="background: white; border: 1.5px solid ${selectedMode === 'optimized' ? '#166534' : '#e2e8f0'}; border-radius: 8px; padding: 10px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); margin: 0;">
                        <input type="radio" name="pet_calc_mode" value="optimized" ${selectedMode === 'optimized' ? 'checked' : ''} onchange="_tlcgUpdatePetMode(this.value)">
                        <div>
                            <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Xếp Tối Ưu (Tiết Kiệm)</div>
                            <div style="font-size: 15px; font-weight: 800; color: #166534;">${Number(petInfo.optimizedCost).toLocaleString('vi-VN')} đ / áo</div>
                        </div>
                    </label>
                </div>
                <div style="font-size: 11.5px; color: #166534; font-weight: 500; margin-top: 12px; border-top: 1px dashed #bbf7d0; padding-top: 8px; line-height: 1.6;">
                    ${petInfo.details.map((d, i) => `
                        <div>
                            <strong>• ${d.name || `Hình in ${i+1}`}</strong> (${d.width}x${d.height}cm): 
                            Thẳng hàng: <strong>${d.packing.aligned}</strong> hình/khổ (${Math.round(d.aCost).toLocaleString('vi-VN')}đ) | 
                            Tối ưu: <strong>${d.packing.optimized}</strong> hình/khổ (${Math.round(d.oCost).toLocaleString('vi-VN')}đ)
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // 1. Supplier Base Prices Table
    html += `
        <div style="margin-bottom: 24px;">
            <h5 style="margin: 0 0 12px 0; font-size: 13.5px; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 6px;">
                🏢 ĐƠN GIÁ NHẬP VẢI GỐC CÁC NGUỒN
            </h5>
            <div style="overflow-x: auto; border: 1.5px solid #e2e8f0; border-radius: 10px;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                    <thead>
                        <tr>
                            <th style="padding: 10px 12px; font-weight: 700; background: #0f172a !important; color: #ffffff !important; width: 50px; text-align: center;">Chọn</th>
                            <th style="padding: 10px 12px; font-weight: 700; background: #0f172a !important; color: #ffffff !important;">Nhà cung cấp (Nguồn nhập)</th>
                            <th style="padding: 10px 12px; font-weight: 700; background: #0f172a !important; color: #ffffff !important; text-align: right;">Giá Vải Gốc</th>
                            <th style="padding: 10px 12px; font-weight: 700; background: #0f172a !important; color: #ffffff !important; text-align: right;">Giá Thành Phẩm</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    if (res.suppliers && res.suppliers.length > 0) {
        html += `
            <tr style="border-bottom: 1px solid #f1f5f9; background: ${selectedId === 'all' ? '#f0f9ff' : 'transparent'}; cursor: pointer;" onclick="_tlcgSelectCalcSupplier('all')">
                <td style="padding: 10px 12px; text-align: center;">
                    <input type="radio" name="calc_supplier_radio" value="all" ${selectedId === 'all' ? 'checked' : ''} style="cursor: pointer;" onclick="event.stopPropagation(); _tlcgSelectCalcSupplier('all')">
                </td>
                <td style="padding: 10px 12px; font-weight: 700; color: #4f46e5;">🏆 Tất cả (Tự động so sánh rẻ nhất)</td>
                <td style="padding: 10px 12px; text-align: right; font-weight: 600; color: #64748b; font-style: italic;">So sánh tối ưu</td>
                <td style="padding: 10px 12px; text-align: right; font-weight: 500; color: #94a3b8;">—</td>
            </tr>
        `;

        res.suppliers.forEach(s => {
            const isChecked = selectedId === String(s.source_id);
            
            let priceTexts = [];
            if (res.calculations && res.calculations.length > 0) {
                res.calculations.forEach(calc => {
                    const rangeCalc = calc.range_calcs && calc.range_calcs.length > 0 ? calc.range_calcs[0] : null;
                    const hasQty = res.quantity !== null && res.quantity > 0;
                    const price = (hasQty && rangeCalc && rangeCalc.range_prices[s.source_id])
                        ? rangeCalc.range_prices[s.source_id]
                        : calc.overall_prices[s.source_id];
                    if (price) {
                        const finalPrice = Number(price) + petCost;
                        const cleanSeg = (calc.segment || '').trim();
                        let color = '#2563eb'; // Default royal blue
                        if (cleanSeg === 'Người Lớn') color = '#2563eb'; // Blue
                        else if (cleanSeg === 'Mầm Non') color = '#db2777'; // Pink
                        else if (cleanSeg === 'Tiểu Học') color = '#059669'; // Green
                        else if (cleanSeg === 'Oversize') color = '#ea580c'; // Orange
                        else {
                            const hash = cleanSeg.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                            const colors = ['#2563eb', '#059669', '#db2777', '#ea580c', '#4f46e5', '#a855f7', '#06b6d4'];
                            color = colors[hash % colors.length];
                        }

                        if (res.calculations.length > 1) {
                            priceTexts.push(`<span style="color: ${color}; font-weight: 700;">${calc.segment}: ${Number(finalPrice).toLocaleString('vi-VN')} đ</span>`);
                        } else {
                            priceTexts.push(`<span style="color: ${color}; font-weight: 700;">${Number(finalPrice).toLocaleString('vi-VN')} đ</span>`);
                        }
                    }
                });
            }
            const priceDisplay = priceTexts.length > 0 ? priceTexts.join('<br>') : '—';

            html += `
                <tr style="border-bottom: 1px solid #f1f5f9; background: ${isChecked ? '#f0f9ff' : 'transparent'}; cursor: pointer;" onclick="_tlcgSelectCalcSupplier('${s.source_id}')">
                    <td style="padding: 10px 12px; text-align: center;">
                        <input type="radio" name="calc_supplier_radio" value="${s.source_id}" ${isChecked ? 'checked' : ''} style="cursor: pointer;" onclick="event.stopPropagation(); _tlcgSelectCalcSupplier('${s.source_id}')">
                    </td>
                    <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">${s.source_name}</td>
                    <td style="padding: 10px 12px; text-align: right; font-weight: 800; color: #4f46e5;">${Number(s.price).toLocaleString('vi-VN')} đ / ${res.unit}</td>
                    <td style="padding: 10px 12px; text-align: right; font-weight: 800; color: #1e293b; font-size: 13px;">${priceDisplay}</td>
                </tr>
            `;
        });
    } else {
        html += `
            <tr>
                <td colspan="4" style="padding: 16px; text-align: center; color: #64748b; font-style: italic;">Chưa có giá nhập gốc nào được duyệt cho màu này.</td>
            </tr>
        `;
    }

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // 2. Calculations (by segment / qty range)
    html += `
        <h5 style="margin: 0 0 12px 0; font-size: 13.5px; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 6px; text-transform: uppercase;">
            📊 CHI TIẾT GIÁ THÀNH PHẨM SO SÁNH
        </h5>
    `;

    if (res.calculations && res.calculations.length > 0) {
        res.calculations.forEach((calc, calcIndex) => {
            const hasQty = res.quantity !== null && res.quantity > 0;
            const rangeCalc = calc.range_calcs && calc.range_calcs.length > 0 ? calc.range_calcs[0] : null;

            // Resolve target cheapest object based on selected supplier
            let activeCheapestRange = null;
            let activeCheapestOverall = null;

            if (selectedId === 'all') {
                activeCheapestRange = rangeCalc ? rangeCalc.cheapest_range : null;
                activeCheapestOverall = calc.cheapest_overall;
            } else {
                const selSupplier = res.suppliers.find(s => String(s.source_id) === selectedId);
                if (selSupplier) {
                    if (rangeCalc) {
                        const rPrice = rangeCalc.range_prices[selSupplier.source_id];
                        if (rPrice) {
                            activeCheapestRange = {
                                source_id: selSupplier.source_id,
                                source_name: selSupplier.source_name,
                                price: rPrice,
                                base_price: selSupplier.price
                            };
                        }
                    }
                    const oPrice = calc.overall_prices[selSupplier.source_id];
                    if (oPrice) {
                        activeCheapestOverall = {
                            source_id: selSupplier.source_id,
                            source_name: selSupplier.source_name,
                            price: oPrice,
                            base_price: selSupplier.price
                        };
                    }
                }
            }

            // Collect all supplier overall prices
            const overallSupplierPrices = [];
            res.suppliers.forEach(s => {
                const oPrice = calc.overall_prices[s.source_id];
                if (oPrice) {
                    overallSupplierPrices.push({
                        source_id: s.source_id,
                        source_name: s.source_name,
                        price: oPrice,
                        base_price: s.price
                    });
                }
            });
            overallSupplierPrices.sort((a, b) => a.price - b.price);

            // Collect all supplier range prices if rangeCalc exists
            const rangeSupplierPrices = [];
            if (rangeCalc) {
                res.suppliers.forEach(s => {
                    const rPrice = rangeCalc.range_prices[s.source_id];
                    if (rPrice) {
                        rangeSupplierPrices.push({
                            source_id: s.source_id,
                            source_name: s.source_name,
                            price: rPrice,
                            base_price: s.price
                        });
                    }
                });
                rangeSupplierPrices.sort((a, b) => a.price - b.price);
            }

            let subCardsHtml = '';
            if (hasQty && rangeCalc) {
                const rangeKgNeeded = rangeCalc.range_ratio > 0 ? (res.quantity / rangeCalc.range_ratio).toFixed(2) : null;
                const overallKgNeeded = calc.overall_ratio > 0 ? (res.quantity / calc.overall_ratio).toFixed(2) : null;
                
                const rangeHasData = rangeCalc.range_ratio > 0 && rangeSupplierPrices.length > 0;
                const rangeBg = rangeHasData ? '#eff6ff' : '#fef2f2';
                const rangeBorder = rangeHasData ? '#bfdbfe' : '#fca5a5';
                const rangeText = rangeHasData ? '#1d4ed8' : '#991b1b';
                const rangeSub = rangeHasData ? '#1e40af' : '#b91c1c';

                const overallHasData = calc.overall_ratio > 0 && overallSupplierPrices.length > 0;
                const overallBg = overallHasData ? '#ecfdf5' : '#fef2f2';
                const overallBorder = overallHasData ? '#a7f3d0' : '#fca5a5';
                const overallText = overallHasData ? '#047857' : '#991b1b';
                const overallSub = overallHasData ? '#065f46' : '#b91c1c';

                subCardsHtml = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
                        <!-- Column 1: Range Specific -->
                        <div style="background: ${rangeBg}; border: 1.5px solid ${rangeBorder}; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
                            <div>
                                <div style="font-size: 11.5px; font-weight: 800; color: ${rangeText}; text-transform: uppercase; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
                                    📦 Theo Khung Số Lượng [${rangeCalc.range_label}]
                                </div>
                                <div style="font-size: 18px; font-weight: 900; color: ${rangeSub}; margin-bottom: 6px;">
                                    ${rangeCalc.range_ratio ? rangeCalc.range_ratio.toFixed(2) + ' sp/' + res.unit : 'Chưa có dữ liệu'}
                                </div>
                                ${rangeKgNeeded ? `
                                    <div style="font-size: 12px; color: ${rangeSub}; font-weight: 600; margin-bottom: 8px;">
                                        ⚖️ Số kg vải dự kiến: <strong style="font-size: 13.5px; color: ${rangeText};">${rangeKgNeeded} kg</strong>
                                    </div>
                                ` : ''}
                            </div>
                            ${rangeHasData ? `
                                <div style="font-size: 12px; border-top: 1px dashed ${rangeBorder}; padding-top: 8px; margin-top: 8px; line-height: 1.5;">
                                    ${rangeSupplierPrices.map((sp, idx) => {
                                        const isSelected = selectedId === 'all' || selectedId === String(sp.source_id);
                                        const styles = getRankStyles(idx);
                                        const finalNameColor = isSelected ? styles.nameColor : '#64748b';
                                        const finalPriceColor = isSelected ? styles.priceColor : '#64748b';
                                        const finalWeight = isSelected ? styles.fontWeight : 'normal';
                                        return `
                                            <div style="display: flex; justify-content: space-between; align-items: center; font-weight: ${finalWeight}; padding: 2px 0;">
                                                <span style="color: ${finalNameColor}; font-weight: 600;">${styles.icon}${sp.source_name}</span>
                                                <span style="color: ${finalPriceColor}; font-weight: 800;">
                                                    ${Number(sp.price + petCost).toLocaleString('vi-VN')} đ / áo
                                                    ${petInfo.enabled ? `<span style="font-size: 10.5px; font-weight: normal; color: #64748b;">(Vải: ${Number(sp.price).toLocaleString('vi-VN')}đ + In: ${Number(petCost).toLocaleString('vi-VN')}đ)</span>` : ''}
                                                </span>
                                            </div>
                                        `;
                                    }).join('')}
                                    ${selectedId !== 'all' && activeCheapestRange ? `
                                        <div style="font-size: 13px; font-weight: 800; color: ${rangeText}; margin-top: 6px; background: #dbeafe; padding: 4px 8px; border-radius: 6px; display: inline-block;">
                                            💰 Tổng tiền: ${Math.round((activeCheapestRange.price + petCost) * res.quantity).toLocaleString('vi-VN')} đ
                                        </div>
                                    ` : selectedId === 'all' && rangeSupplierPrices.length > 0 ? `
                                        <div style="font-size: 13px; font-weight: 800; color: ${rangeText}; margin-top: 6px; background: #dbeafe; padding: 4px 8px; border-radius: 6px; display: inline-block;">
                                            💰 Tổng tiền (tối ưu): ${Math.round((rangeSupplierPrices[0].price + petCost) * res.quantity).toLocaleString('vi-VN')} đ
                                        </div>
                                    ` : ''}
                                </div>
                            ` : `<div style="font-size: 12px; color: ${rangeSub}; font-style: italic; border-top: 1px dashed ${rangeBorder}; padding-top: 8px; margin-top: 8px;">Không có thực tế cho khung này hoặc chưa có giá</div>`}
                        </div>

                        <!-- Column 2: Overall -->
                        <div style="background: ${overallBg}; border: 1.5px solid ${overallBorder}; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
                            <div>
                                <div style="font-size: 11.5px; font-weight: 800; color: ${overallText}; text-transform: uppercase; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
                                    📊 Trung Bình Toàn Chất Liệu
                                </div>
                                <div style="font-size: 18px; font-weight: 900; color: ${overallSub}; margin-bottom: 6px;">
                                    ${calc.overall_ratio ? calc.overall_ratio.toFixed(2) + ' sp/' + res.unit : 'Chưa có dữ liệu'}
                                </div>
                                ${overallKgNeeded ? `
                                    <div style="font-size: 12px; color: ${overallSub}; font-weight: 600; margin-bottom: 8px;">
                                        ⚖️ Số kg vải dự kiến: <strong style="font-size: 13.5px; color: ${overallText};">${overallKgNeeded} kg</strong>
                                    </div>
                                ` : ''}
                            </div>
                            ${overallHasData ? `
                                <div style="font-size: 12px; border-top: 1px dashed ${overallBorder}; padding-top: 8px; margin-top: 8px; line-height: 1.5;">
                                    ${overallSupplierPrices.map((sp, idx) => {
                                        const isSelected = selectedId === 'all' || selectedId === String(sp.source_id);
                                        const styles = getRankStyles(idx);
                                        const finalNameColor = isSelected ? styles.nameColor : '#64748b';
                                        const finalPriceColor = isSelected ? styles.priceColor : '#64748b';
                                        const finalWeight = isSelected ? styles.fontWeight : 'normal';
                                        return `
                                            <div style="display: flex; justify-content: space-between; align-items: center; font-weight: ${finalWeight}; padding: 2px 0;">
                                                <span style="color: ${finalNameColor}; font-weight: 600;">${styles.icon}${sp.source_name}</span>
                                                <span style="color: ${finalPriceColor}; font-weight: 800;">
                                                    ${Number(sp.price + petCost).toLocaleString('vi-VN')} đ / áo
                                                    ${petInfo.enabled ? `<span style="font-size: 10.5px; font-weight: normal; color: #64748b;">(Vải: ${Number(sp.price).toLocaleString('vi-VN')}đ + In: ${Number(petCost).toLocaleString('vi-VN')}đ)</span>` : ''}
                                                </span>
                                            </div>
                                        `;
                                    }).join('')}
                                    ${selectedId !== 'all' && activeCheapestOverall ? `
                                        <div style="font-size: 13px; font-weight: 800; color: ${overallText}; margin-top: 6px; background: #d1fae5; padding: 4px 8px; border-radius: 6px; display: inline-block;">
                                            💰 Tổng tiền: ${Math.round((activeCheapestOverall.price + petCost) * res.quantity).toLocaleString('vi-VN')} đ
                                        </div>
                                    ` : selectedId === 'all' && overallSupplierPrices.length > 0 ? `
                                        <div style="font-size: 13px; font-weight: 800; color: ${overallText}; margin-top: 6px; background: #d1fae5; padding: 4px 8px; border-radius: 6px; display: inline-block;">
                                            💰 Tổng tiền (tối ưu): ${Math.round((overallSupplierPrices[0].price + petCost) * res.quantity).toLocaleString('vi-VN')} đ
                                        </div>
                                    ` : ''}
                                </div>
                            ` : `<div style="font-size: 12px; color: ${overallSub}; font-style: italic; border-top: 1px dashed ${overallBorder}; padding-top: 8px; margin-top: 8px;">Không có thực tế toàn chất liệu hoặc chưa có giá</div>`}
                        </div>
                    </div>
                `;
            } else {
                const overallHasData = calc.overall_ratio > 0 && overallSupplierPrices.length > 0;
                const ovBg = overallHasData ? '#f8fafc' : '#fef2f2';
                const ovBorder = overallHasData ? '#e2e8f0' : '#fca5a5';
                const ovText = overallHasData ? '#334155' : '#991b1b';
                const ovLabelText = overallHasData ? '#64748b' : '#b91c1c';

                subCardsHtml = `
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <!-- Overall Summary Card -->
                        <div style="background: ${ovBg}; border: 1px solid ${ovBorder}; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                            <div>
                                <div style="font-size: 11px; font-weight: 800; color: ${ovLabelText}; text-transform: uppercase;">📊 Trung Bình Toàn Chất Liệu</div>
                                <div style="font-size: 16px; font-weight: 900; color: ${ovText};">
                                    ${calc.overall_ratio ? calc.overall_ratio.toFixed(2) + ' sp/' + res.unit : 'Chưa có dữ liệu'}
                                </div>
                            </div>
                            ${overallHasData ? `
                                <div style="text-align: right; line-height: 1.5; font-size: 12.5px;">
                                    ${overallSupplierPrices.map((sp, idx) => {
                                        const isSelected = selectedId === 'all' || selectedId === String(sp.source_id);
                                        const styles = getRankStyles(idx);
                                        const finalNameColor = isSelected ? styles.nameColor : '#64748b';
                                        const finalPriceColor = isSelected ? styles.priceColor : '#64748b';
                                        const finalWeight = isSelected ? styles.fontWeight : 'normal';
                                        return `
                                            <div style="font-weight: ${finalWeight}; color: ${finalNameColor};">
                                                ${styles.icon}${sp.source_name}: <span style="color: ${finalPriceColor}; font-weight: 800;">
                                                    ${Number(sp.price + petCost).toLocaleString('vi-VN')} đ / áo
                                                    ${petInfo.enabled ? `<span style="font-size: 10.5px; font-weight: normal; color: #64748b;">(Vải: ${Number(sp.price).toLocaleString('vi-VN')}đ + In: ${Number(petCost).toLocaleString('vi-VN')}đ)</span>` : ''}
                                                </span>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            ` : ''}
                        </div>

                        <div style="font-size: 12px; font-weight: 800; color: #475569; margin: 4px 0 -4px 0; text-transform: uppercase; display: flex; align-items: center; gap: 4px;">
                            📦 Chi tiết các khung số lượng:
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
                            ${calc.range_calcs.map((rc, rcIndex) => {
                                const rcSupplierPrices = [];
                                res.suppliers.forEach(s => {
                                    const rPrice = rc.range_prices[s.source_id];
                                    if (rPrice) {
                                        rcSupplierPrices.push({
                                            source_id: s.source_id,
                                            source_name: s.source_name,
                                            price: rPrice,
                                            base_price: s.price
                                        });
                                    }
                                });
                                rcSupplierPrices.sort((a, b) => a.price - b.price);

                                const rcHasData = rc.range_ratio > 0 && rcSupplierPrices.length > 0;
                                const rcBg = rcHasData ? '#eff6ff' : '#fef2f2';
                                const rcBorder = rcHasData ? '#bfdbfe' : '#fca5a5';
                                const rcText = rcHasData ? '#1d4ed8' : '#991b1b';
                                const rcSub = rcHasData ? '#1e40af' : '#b91c1c';

                                return `
                                    <div style="background: ${rcBg}; border: 1.5px solid ${rcBorder}; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between;">
                                        <div>
                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                                <div style="font-size: 11px; font-weight: 800; color: ${rcText}; text-transform: uppercase;">
                                                    Khung: ${rc.range_label}
                                                </div>
                                                ${rcHasData ? `
                                                    <a href="javascript:void(0)" onclick="_tlcgShowRangeTicketsModal(${calcIndex}, ${rcIndex})" style="font-size: 11px; font-weight: 700; color: #2563eb; text-decoration: underline; display: flex; align-items: center; gap: 2px;">
                                                        🔍 Xem Đơn
                                                    </a>
                                                ` : ''}
                                            </div>
                                            <div style="font-size: 15px; font-weight: 800; color: ${rcSub}; margin-bottom: 4px;">
                                                Tỉ lệ: ${rc.range_ratio ? rc.range_ratio.toFixed(2) + ' sp/' + res.unit : 'Chưa có dữ liệu'}
                                            </div>
                                        </div>
                                        ${rcHasData ? `
                                            <div style="border-top: 1px dashed ${rcBorder}; padding-top: 6px; margin-top: 6px; font-size: 11.5px; line-height: 1.5;">
                                                ${rcSupplierPrices.map((sp, idx) => {
                                                    const isSelected = selectedId === 'all' || selectedId === String(sp.source_id);
                                                    const styles = getRankStyles(idx);
                                                    const finalNameColor = isSelected ? styles.nameColor : '#64748b';
                                                    const finalPriceColor = isSelected ? styles.priceColor : '#64748b';
                                                    const finalWeight = isSelected ? styles.fontWeight : 'normal';
                                                    return `
                                                        <div style="display: flex; justify-content: space-between; align-items: center; font-weight: ${finalWeight}; padding: 1px 0;">
                                                            <span style="color: ${finalNameColor}; font-weight: 600;">${styles.icon}${sp.source_name}</span>
                                                            <span style="font-weight: 800; color: ${finalPriceColor};">
                                                                ${Number(sp.price + petCost).toLocaleString('vi-VN')} đ
                                                                ${petInfo.enabled ? `<span style="font-size: 10.5px; font-weight: normal; color: #64748b;">(Vải: ${Number(sp.price).toLocaleString('vi-VN')}đ + In: ${Number(petCost).toLocaleString('vi-VN')}đ)</span>` : ''}
                                                            </span>
                                                        </div>
                                                    `;
                                                }).join('')}
                                            </div>
                                        ` : `<div style="font-size: 11px; color: ${rcSub}; font-style: italic; border-top: 1px dashed ${rcBorder}; padding-top: 6px; margin-top: 6px;">Chưa có dữ liệu thực tế</div>`}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }

            let tableHeaderHtml = '';
            let tableBodyHtml = '';

            if (hasQty && rangeCalc) {
                tableHeaderHtml = `
                    <tr>
                        <th style="padding: 8px 10px; font-weight: 700; background: #0f172a !important; color: #ffffff !important;">Nguồn nhập</th>
                        <th style="padding: 8px 10px; font-weight: 700; background: #0f172a !important; color: #ffffff !important; text-align: right;">Giá vải gốc</th>
                        <th style="padding: 8px 10px; font-weight: 700; background: #0f172a !important; color: #ffffff !important; text-align: right;">Theo Khung [${rangeCalc.range_label}]</th>
                        <th style="padding: 8px 10px; font-weight: 700; background: #0f172a !important; color: #ffffff !important; text-align: right;">Theo Trung Bình Chung</th>
                    </tr>
                `;

                res.suppliers.forEach(s => {
                    const rangePriceRaw = rangeCalc.range_prices[s.source_id];
                    const overallPriceRaw = calc.overall_prices[s.source_id];

                    const rangePriceText = rangePriceRaw 
                        ? `<span style="font-weight: 800; color: #1d4ed8;">${Number(rangePriceRaw + petCost).toLocaleString('vi-VN')} đ</span><br><span style="font-size: 10px; color: #64748b;">Tổng: ${Math.round((rangePriceRaw + petCost) * res.quantity).toLocaleString('vi-VN')}đ</span>` 
                        : '—';
                    
                    const overallPriceText = overallPriceRaw 
                        ? `<span style="font-weight: 800; color: #059669;">${Number(overallPriceRaw + petCost).toLocaleString('vi-VN')} đ</span><br><span style="font-size: 10px; color: #64748b;">Tổng: ${Math.round((overallPriceRaw + petCost) * res.quantity).toLocaleString('vi-VN')}đ</span>` 
                        : '—';

                    const isRangeBest = rangeCalc.cheapest_range && String(rangeCalc.cheapest_range.source_id) === String(s.source_id);
                    const isOverallBest = calc.cheapest_overall && String(calc.cheapest_overall.source_id) === String(s.source_id);

                    const isRowSelected = selectedId === String(s.source_id);

                    tableBodyHtml += `
                        <tr style="border-bottom: 1px solid #f1f5f9; ${isRowSelected ? 'background: #eff6ff;' : ''}">
                            <td style="padding: 8px 10px; font-weight: 600; color: #1e293b;">${s.source_name}</td>
                            <td style="padding: 8px 10px; text-align: right; color: #64748b;">${Number(s.price).toLocaleString('vi-VN')} đ / ${res.unit}</td>
                            <td style="padding: 8px 10px; text-align: right; ${isRangeBest ? 'background: rgba(239,246,255,0.7); font-weight: bold;' : ''}">
                                ${rangePriceText} ${isRangeBest ? '🏆' : ''}
                            </td>
                            <td style="padding: 8px 10px; text-align: right; ${isOverallBest ? 'background: rgba(236,253,245,0.7); font-weight: bold;' : ''}">
                                ${overallPriceText} ${isOverallBest ? '🏆' : ''}
                            </td>
                        </tr>
                    `;
                });
            } else {
                tableHeaderHtml = `
                    <tr>
                        <th style="padding: 8px 10px; font-weight: 700; background: #0f172a !important; color: #ffffff !important;">Nguồn nhập</th>
                        <th style="padding: 8px 10px; font-weight: 700; background: #0f172a !important; color: #ffffff !important; text-align: right;">Giá vải gốc</th>
                        <th style="padding: 8px 10px; font-weight: 700; background: #0f172a !important; color: #ffffff !important; text-align: right;">Giá theo Trung Bình Chung</th>
                    </tr>
                `;

                res.suppliers.forEach(s => {
                    const overallPriceRaw = calc.overall_prices[s.source_id];
                    const overallPriceText = overallPriceRaw ? `${Number(overallPriceRaw + petCost).toLocaleString('vi-VN')} đ` : '—';
                    const isOverallBest = calc.cheapest_overall && String(calc.cheapest_overall.source_id) === String(s.source_id);

                    const isRowSelected = selectedId === String(s.source_id);

                    tableBodyHtml += `
                        <tr style="border-bottom: 1px solid #f1f5f9; ${isRowSelected ? 'background: #eff6ff;' : ''}">
                            <td style="padding: 8px 10px; font-weight: 600; color: #1e293b;">${s.source_name}</td>
                            <td style="padding: 8px 10px; text-align: right; color: #64748b;">${Number(s.price).toLocaleString('vi-VN')} đ / ${res.unit}</td>
                            <td style="padding: 8px 10px; text-align: right; font-weight: 700; color: ${isOverallBest ? '#059669' : '#475569'}; background: ${isOverallBest ? 'rgba(236,253,245,0.6)' : 'transparent'};">
                                ${overallPriceText} ${isOverallBest ? '🏆' : ''}
                            </td>
                        </tr>
                    `;
                });
            }

            html += `
                <div style="background: white; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 12px;">
                        <span style="font-weight: 800; font-size: 14.5px; color: #1e293b; display: flex; align-items: center; gap: 6px;">
                            ${(() => {
                                const segObj = (_tlcg.sizeSegments || []).find(s => s.name === calc.segment);
                                return segObj && segObj.icon ? segObj.icon : '🧑';
                            })()} 
                            Phân khúc: ${calc.segment} 
                        </span>
                    </div>
                    
                    <div style="margin-bottom: 12px;">
                        ${subCardsHtml}
                    </div>
                    
                    <!-- Full comparison table for this range -->
                    <div style="margin-top: 10px;">
                        <span style="font-size: 11.5px; font-weight: 700; color: #4f46e5; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" onclick="const t = this.nextElementSibling; t.style.display = t.style.display === 'none' ? 'block' : 'none'">
                            🔍 Xem chi tiết bảng so sánh các nguồn ▾
                        </span>
                        <div style="display: none; margin-top: 8px; border: 1.5px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                                <thead>
                                    ${tableHeaderHtml}
                                </thead>
                                <tbody>
                                    ${tableBodyHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        html += `
            <div style="text-align: center; padding: 20px; color: #64748b; font-style: italic;">
                Không tìm thấy dữ liệu tính toán phù hợp.
            </div>
        `;
    }

    resultsDiv.innerHTML = html;
}


async function _tlcgOpenSizeSegmentsModal() {
    if (!document.getElementById('tlcgModalOverlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'tlcgModalOverlay';
        overlay.className = 'tlcg-modal-overlay';
        document.body.appendChild(overlay);
    }
    const overlay = document.getElementById('tlcgModalOverlay');
    
    overlay.innerHTML = `
        <div class="tlcg-modal" style="max-width: 500px; width: 90%;">
            <div class="tlcg-modal-header">
                <h4 class="tlcg-modal-title">⚙️ Cấu Hình Phân Khúc</h4>
                <button class="tlcg-drawer-close" onclick="_tlcgCloseModal()">×</button>
            </div>
            <div class="tlcg-modal-body">
                <div style="margin-bottom: 16px; display: flex; gap: 8px; align-items: center;">
                    <input type="text" class="tlcg-search-input" id="newSizeSegmentIcon" placeholder="Icon (vd: 👦)" style="width: 80px; text-align: center;">
                    <input type="text" class="tlcg-search-input" id="newSizeSegmentName" placeholder="Tên phân khúc mới..." style="flex: 2;">
                    <input type="text" class="tlcg-search-input" id="newSizeSegmentAbbr" placeholder="Viết tắt..." style="width: 100px;">
                    <button class="tlcg-btn tlcg-btn-primary" onclick="_tlcgAddSizeSegmentRow()">Thêm</button>
                </div>
                <div class="tlcg-segment-list-area" id="tlcgSegmentList" style="max-height: 50vh; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #f8fafc;">
                    <!-- Rows will be rendered here -->
                </div>
            </div>
            <div class="tlcg-modal-footer">
                <button class="tlcg-btn" onclick="_tlcgCloseModal()">Hủy</button>
                <button class="tlcg-btn tlcg-btn-primary" onclick="_tlcgSaveSizeSegments()">Lưu Cấu Hình</button>
            </div>
        </div>
    `;
    overlay.classList.add('active');
    _tlcgRenderSizeSegmentsRows();
}

function _tlcgRenderSizeSegmentsRows() {
    const listDiv = document.getElementById('tlcgSegmentList');
    if (!listDiv) return;

    if (!_tlcg.sizeSegments || _tlcg.sizeSegments.length === 0) {
        listDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: #64748b;">Chưa có phân khúc nào. Vui lòng thêm phân khúc mới.</div>';
        return;
    }

    listDiv.innerHTML = _tlcg.sizeSegments.map((s, idx) => `
        <div class="tlcg-segment-config-row" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; background: white; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;" data-idx="${idx}">
            <span style="font-weight: 700; color: #64748b; font-size: 14px; cursor: grab;">☰</span>
            <input type="text" class="tlcg-segment-icon-input tlcg-search-input" value="${s.icon || '🧑'}" style="width: 50px; padding: 4px; font-size: 13px; text-align: center;" placeholder="Icon" data-id="${s.id || ''}">
            <input type="text" class="tlcg-segment-name-input tlcg-search-input" value="${s.name}" style="flex: 2; padding: 4px 8px; font-size: 13px;" placeholder="Tên phân khúc..." data-id="${s.id || ''}">
            <input type="text" class="tlcg-segment-abbr-input tlcg-search-input" value="${s.abbreviation || s.name.substring(0, 5)}" style="width: 90px; padding: 4px 8px; font-size: 13px;" placeholder="Viết tắt" data-id="${s.id || ''}">
            <button class="tlcg-btn" onclick="_tlcgRemoveSizeSegmentRow(${idx})" style="padding: 4px 8px; font-size: 11px; background: #fee2e2; color: #ef4444; border: none;">Xóa</button>
        </div>
    `).join('');
}

function _tlcgAddSizeSegmentRow() {
    const inputIcon = document.getElementById('newSizeSegmentIcon');
    const inputName = document.getElementById('newSizeSegmentName');
    const inputAbbr = document.getElementById('newSizeSegmentAbbr');
    if (!inputName || !inputName.value.trim()) return;
    
    const name = inputName.value.trim();
    const icon = inputIcon && inputIcon.value.trim() ? inputIcon.value.trim() : '🧑';
    const abbreviation = inputAbbr && inputAbbr.value.trim() ? inputAbbr.value.trim() : name.substring(0, 5);
    
    if (!_tlcg.sizeSegments) _tlcg.sizeSegments = [];
    _tlcg.sizeSegments.push({
        name,
        icon,
        abbreviation
    });
    
    if (inputIcon) inputIcon.value = '';
    if (inputName) inputName.value = '';
    if (inputAbbr) inputAbbr.value = '';
    _tlcgRenderSizeSegmentsRows();
}

function _tlcgRemoveSizeSegmentRow(idx) {
    if (!_tlcg.sizeSegments) return;
    _tlcg.sizeSegments.splice(idx, 1);
    _tlcgRenderSizeSegmentsRows();
}

async function _tlcgSaveSizeSegments() {
    const rows = document.querySelectorAll('.tlcg-segment-config-row');
    const segments = [];
    rows.forEach(row => {
        const inputIcon = row.querySelector('.tlcg-segment-icon-input');
        const inputName = row.querySelector('.tlcg-segment-name-input');
        const inputAbbr = row.querySelector('.tlcg-segment-abbr-input');
        if (inputName && inputName.value.trim()) {
            segments.push({
                id: inputName.dataset.id ? Number(inputName.dataset.id) : null,
                name: inputName.value.trim(),
                abbreviation: inputAbbr ? inputAbbr.value.trim() : inputName.value.trim().substring(0, 5),
                icon: inputIcon ? inputIcon.value.trim() : '🧑'
            });
        }
    });

    try {
        const res = await apiCall('/api/cutting/size-segments/update-bulk', 'POST', { segments });
        if (res.success) {
            if (typeof showToast === 'function') showToast('Lưu cấu hình phân khúc thành công!', 'success');
            _tlcgCloseModal();
            await _tlcgLoadData();
        } else {
            if (typeof showToast === 'function') showToast(res.error || 'Có lỗi xảy ra', 'error');
        }
    } catch (err) {
        console.error('[Save size segments error]', err);
        if (typeof showToast === 'function') showToast(err.message, 'error');
    }
}

async function _tlcgUpdateMaterialSegments(matId) {
    const checkboxes = document.querySelectorAll('.material-segment-checkbox');
    const checkedValues = [];
    checkboxes.forEach(cb => {
        if (cb.checked) {
            checkedValues.push(cb.value);
        }
    });

    try {
        const res = await apiCall(`/api/cutting/materials/${matId}/active-segments`, 'POST', { active_segments: checkedValues });
        if (res.success) {
            if (typeof showToast === 'function') showToast('Cập nhật phân khúc chất liệu thành công!', 'success');
            // Update in local memory
            const mat = _tlcg.materials.find(m => m.id === matId);
            if (mat) {
                mat.active_segments = JSON.stringify(checkedValues);
            }
            // Re-render grid
            const grid = document.getElementById('tlcgGrid');
            if (grid) {
                grid.innerHTML = _tlcgRenderGrid();
            }
            // Re-render drawer content
            if (mat) {
                await _tlcgLoadDrawerContent(mat);
            }
        } else {
            if (typeof showToast === 'function') showToast(res.error || 'Có lỗi xảy ra', 'error');
        }
    } catch (err) {
        console.error('[Update material segments error]', err);
        if (typeof showToast === 'function') showToast(err.message, 'error');
    }
}

function _tlcgCloseRangeTicketsModal() {
    const overlay = document.getElementById('tlcgRangeTicketsOverlay');
    if (overlay) overlay.classList.remove('active');
}

function _tlcgFormatCutDoneTime(isoStr) {
    if (!isoStr) return '—';
    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return isoStr;
        // Shift to VN timezone (UTC+7)
        const vnDate = new Date(d.getTime() + 7 * 3600000);
        const pad = (n) => String(n).padStart(2, '0');
        const hour = pad(vnDate.getUTCHours());
        const min = pad(vnDate.getUTCMinutes());
        
        // Day of week
        const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        const dayOfWeek = days[vnDate.getUTCDay()];
        
        const date = pad(vnDate.getUTCDate());
        const month = pad(vnDate.getUTCMonth() + 1);
        const yearFull = String(vnDate.getUTCFullYear());
        const yearShort = yearFull.substring(yearFull.length - 2);
        
        return `${hour}:${min} ${dayOfWeek} - ${date}/${month}/${yearShort}`;
    } catch(e) {
        return '—';
    }
}

function _tlcgShowRangeTicketsModal(calcIndex, rcIndex) {
    const res = _tlcg.lastCalcResponse;
    if (!res) return;
    const calc = res.calculations[calcIndex];
    if (!calc) return;
    const rc = calc.range_calcs[rcIndex];
    if (!rc) return;
    
    const tickets = rc.tickets || [];
    
    if (!document.getElementById('tlcgRangeTicketsOverlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'tlcgRangeTicketsOverlay';
        overlay.className = 'tlcg-modal-overlay';
        overlay.style.zIndex = '1020';
        overlay.onclick = function(e) {
            if (e.target === this) {
                _tlcgCloseRangeTicketsModal();
            }
        };
        document.body.appendChild(overlay);
    }
    const overlay = document.getElementById('tlcgRangeTicketsOverlay');

    let rowsHtml = '';
    if (tickets.length === 0) {
        rowsHtml = `
            <tr>
                <td colspan="8" style="text-align: center; color: #64748b; font-style: italic; padding: 20px;">
                    Không có đơn nào trong khung này.
                </td>
            </tr>
        `;
    } else {
        rowsHtml = tickets.map(t => {
            const segmentLabel = t.size_segment ? _tlcgGetSegmentBadge(t.size_segment) : `<span style="color:#ef4444; font-style:italic; font-size: 11.5px;">Chưa phân loại</span>`;
            const parsed = _tlcgParseProductName(t.product_name, t.order_code);
            const cutDoneTimeFormatted = _tlcgFormatCutDoneTime(t.cut_done_at || t.cut_date);
            return `
                <tr>
                    <td style="padding: 10px 8px; font-weight: 600; color: #475569; font-size: 12px; white-space: nowrap;">${cutDoneTimeFormatted}</td>
                    <td style="cursor: pointer; padding: 10px 8px;" onclick="_tlcgShowTicketDetail(${t.id})" title="Nhấp để xem chi tiết đơn cắt">
                        <div style="font-weight: 800; color: #2563eb; text-decoration: underline; transition: color 0.15s;" onmouseover="this.style.color='#1d4ed8'" onmouseout="this.style.color='#2563eb'">${parsed.code}</div>
                    </td>
                    <td style="font-weight: 500; font-size: 11.5px; color: #334155; max-width: 200px; word-break: break-word; padding: 10px 8px;">${parsed.product}</td>
                    <td style="font-weight: 600; padding: 10px 8px;">${segmentLabel}</td>
                    <td style="font-weight: 600; padding: 10px 8px;">${t.fabric_color || '—'}</td>
                    <td style="text-align: center; font-weight: 600; padding: 10px 8px;">${t.cut_quantity} áo / ${t.kg_cut} kg</td>
                    <td style="text-align: center; font-weight: 800; color: #4f46e5; padding: 10px 8px;">${Number(t.cut_ratio).toFixed(2)}</td>
                    <td style="text-align: center; padding: 10px 8px;">
                        <span style="font-size: 11px; font-weight: 700; color: #10b981; padding: 4px 8px; background: #dcfce7; border-radius: 6px; display: inline-block;">
                            ✔️ Đã duyệt
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    overlay.innerHTML = `
        <div class="tlcg-modal" style="max-width: 1000px; width: 95%;">
            <div class="tlcg-modal-header">
                <h4 class="tlcg-modal-title">🔍 Danh Sách Đơn Đã Duyệt - Khung ${rc.range_label} (${calc.segment})</h4>
                <button class="tlcg-drawer-close" onclick="_tlcgCloseRangeTicketsModal()">×</button>
            </div>
            <div class="tlcg-modal-body" style="padding: 16px 8px; max-height: 70vh; overflow-y: auto;">
                <div style="overflow-x: auto; width: 100%;">
                    <table class="tlcg-ticket-table" style="min-width: 900px; width: 100%;">
                        <thead>
                            <tr>
                                <th>Cắt Xong</th>
                                <th>Mã Đơn</th>
                                <th>Sản phẩm</th>
                                <th>Phân khúc</th>
                                <th>Màu sắc</th>
                                <th style="text-align: center;">SL / Trọng lượng</th>
                                <th style="text-align: center;">Tỉ lệ</th>
                                <th style="text-align: center;">Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="tlcg-modal-footer">
                <button class="tlcg-btn" onclick="_tlcgCloseRangeTicketsModal()">Đóng</button>
            </div>
        </div>
    `;
    overlay.classList.add('active');
}
