// ========== TỈ LỆ CẮT GỐC — Desktop SPA ==========
var _tlcg = {
    materials: [],
    colors: [],
    ranges: [],
    stats: [],
    products: [],
    selectedRangeId: '',
    selectedGroup: 'ALL', // 'ALL', 'KG', 'MET', 'SAN'
    statsFilter: 'ALL', // 'ALL', 'CONFIGURED', 'UNCONFIGURED'
    filter: {
        search: ''
    },
    isGD: false,
    activeMaterial: null,
    expandedMonths: new Set()
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
                    <button class="tlcg-btn tlcg-btn-primary" onclick="_tlcgOpenPricingCalculatorModal()">
                        🧮 Tra Cứu Giá Vải
                    </button>
                    <button class="tlcg-btn" onclick="_tlcgOpenProductSegmentModal()">
                        ⚙️ Cấu Hình Phân Loại
                    </button>
                    ${_tlcg.isGD ? `
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
    let icon = '❓';
    
    if (cleanSegment === 'Người Lớn') {
        bg = '#dbeafe'; // Light blue
        color = '#1e40af'; // Dark blue
        icon = '👔';
    } else if (cleanSegment === 'Mầm Non') {
        bg = '#fce7f3'; // Light pink
        color = '#9d174d'; // Dark pink
        icon = '👶';
    } else if (cleanSegment === 'Tiểu Học') {
        bg = '#dcfce7'; // Light green
        color = '#166534'; // Dark green
        icon = '🎒';
    } else if (cleanSegment === 'Oversize') {
        bg = '#f3e8ff'; // Light purple
        color = '#6b21a8'; // Dark purple
        icon = '👕';
    }
    
    return `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; font-size: 11.5px; font-weight: 700; background-color: ${bg}; color: ${color}; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">${icon} ${cleanSegment}</span>`;
}

function _tlcgGetMaterialStats(matName) {
    const mStats = _tlcg.stats.filter(s => s.material_name.trim().toLowerCase() === matName.trim().toLowerCase());
    
    // Group stats by size segment
    const segments = { 'Người Lớn': { qty: 0, kg: 0 }, 'Mầm Non': { qty: 0, kg: 0 }, 'Tiểu Học': { qty: 0, kg: 0 }, 'Oversize': { qty: 0, kg: 0 } };
    mStats.forEach(s => {
        if (segments[s.size_segment]) {
            segments[s.size_segment].qty += Number(s.total_qty);
            segments[s.size_segment].kg += Number(s.total_kg);
        }
    });

    const formatRatio = (seg, mat) => {
        const data = segments[seg];
        if (data.kg > 0) {
            return `${(data.qty / data.kg).toFixed(2)} sp/${mat.unit || 'kg'}`;
        }
        return '---';
    };

    return (mat) => ({
        adult: formatRatio('Người Lớn', mat),
        mamnon: formatRatio('Mầm Non', mat),
        tieuhoc: formatRatio('Tiểu Học', mat),
        oversize: formatRatio('Oversize', mat)
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
        const statsBuilder = _tlcgGetMaterialStats(m.name);
        const s = statsBuilder(m);
        return `
            <div class="tlcg-mat-card" onclick="_tlcgOpenMaterialDrawer(${m.id})">
                <span class="tlcg-mat-badge">${m.unit || 'kg'}</span>
                <h4 class="tlcg-mat-name">${m.name}</h4>
                <div class="tlcg-segment-row">
                    <span class="tlcg-segment-name">👔 Người Lớn</span>
                    <span class="tlcg-segment-val ${s.adult !== '---' ? 'val-active' : ''}">${s.adult}</span>
                </div>
                <div class="tlcg-segment-row">
                    <span class="tlcg-segment-name">👶 Mầm Non</span>
                    <span class="tlcg-segment-val ${s.mamnon !== '---' ? 'val-active' : ''}">${s.mamnon}</span>
                </div>
                <div class="tlcg-segment-row">
                    <span class="tlcg-segment-name">🎒 Tiểu Học</span>
                    <span class="tlcg-segment-val ${s.tieuhoc !== '---' ? 'val-active' : ''}">${s.tieuhoc}</span>
                </div>
                <div class="tlcg-segment-row">
                    <span class="tlcg-segment-name">👕 Oversize</span>
                    <span class="tlcg-segment-val ${s.oversize !== '---' ? 'val-active' : ''}">${s.oversize}</span>
                </div>
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
        const queryParams = `?material_name=${encodeURIComponent(mat.name)}${_tlcg.selectedRangeId ? `&range_id=${_tlcg.selectedRangeId}` : ''}`;
        const res = await apiCall(`/api/cutting/material-tickets${queryParams}`, 'GET');
        const tickets = res.tickets || [];

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
        const statsBuilder = _tlcgGetMaterialStats(mat.name);
        const sOverall = statsBuilder(mat);
        html += `
            <div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.01);">
                <div style="background: #f8fafc; padding: 10px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600;">Người Lớn</div>
                    <div style="font-size: 14px; font-weight: 800; color: #4f46e5; margin-top: 4px;">${sOverall.adult}</div>
                </div>
                <div style="background: #f8fafc; padding: 10px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600;">Mầm Non</div>
                    <div style="font-size: 14px; font-weight: 800; color: #4f46e5; margin-top: 4px;">${sOverall.mamnon}</div>
                </div>
                <div style="background: #f8fafc; padding: 10px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600;">Tiểu Học</div>
                    <div style="font-size: 14px; font-weight: 800; color: #4f46e5; margin-top: 4px;">${sOverall.tieuhoc}</div>
                </div>
                <div style="background: #f8fafc; padding: 10px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600;">Oversize</div>
                    <div style="font-size: 14px; font-weight: 800; color: #4f46e5; margin-top: 4px;">${sOverall.oversize}</div>
                </div>
            </div>
        `;

        // 2. Month Accordions
        html += `<h4 style="margin: 0 0 12px 0; color: #334155; font-size: 14.5px; font-weight: 800;">📅 Danh sách phiếu cắt theo tháng</h4>`;
        
        // Add status filter tabs
        html += `
            <div class="tlcg-drawer-filters" style="display: flex; gap: 8px; margin-bottom: 16px;">
                <button class="tlcg-filter-tab" onclick="_tlcgSetFilter('all')" style="border: 1px solid #cbd5e1; background: ${activeFilter === 'all' ? '#cbd5e1' : 'white'}; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; cursor: pointer; color: #334155; outline: none; transition: all 0.2s;">Tất cả</button>
                <button class="tlcg-filter-tab" onclick="_tlcgSetFilter('pending')" style="border: 1px solid #fef3c7; background: ${activeFilter === 'pending' ? '#fef3c7' : 'white'}; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; cursor: pointer; color: #d97706; outline: none; transition: all 0.2s;">Chờ xử lý</button>
                <button class="tlcg-filter-tab" onclick="_tlcgSetFilter('approved')" style="border: 1px solid #dcfce7; background: ${activeFilter === 'approved' ? '#dcfce7' : 'white'}; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; cursor: pointer; color: #15803d; outline: none; transition: all 0.2s;">Đã duyệt</button>
                <button class="tlcg-filter-tab" onclick="_tlcgSetFilter('rejected')" style="border: 1px solid #fee2e2; background: ${activeFilter === 'rejected' ? '#fee2e2' : 'white'}; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; cursor: pointer; color: #ef4444; outline: none; transition: all 0.2s;">Không duyệt</button>
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
                                        const segmentLabel = _tlcgGetSegmentBadge(t.size_segment);
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

    if (filtered.length === 0) {
        listDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: #64748b;">Không tìm thấy sản phẩm nào</div>';
        return;
    }

    listDiv.innerHTML = filtered.map(p => {
        const seg = p.size_segment || '';
        return `
            <div class="tlcg-prod-row" data-id="${p.id}">
                <span class="tlcg-prod-name">${p.name}</span>
                <select class="tlcg-prod-select" data-id="${p.id}">
                    <option value="" ${seg === '' ? 'selected' : ''}>-- Chưa phân loại --</option>
                    <option value="Người Lớn" ${seg === 'Người Lớn' ? 'selected' : ''}>👔 Người Lớn</option>
                    <option value="Mầm Non" ${seg === 'Mầm Non' ? 'selected' : ''}>👶 Mầm Non</option>
                    <option value="Tiểu Học" ${seg === 'Tiểu Học' ? 'selected' : ''}>🎒 Tiểu Học</option>
                    <option value="Oversize" ${seg === 'Oversize' ? 'selected' : ''}>👕 Oversize</option>
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

async function _tlcgOpenPricingCalculatorModal() {
    if (!document.getElementById('tlcgModalOverlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'tlcgModalOverlay';
        overlay.className = 'tlcg-modal-overlay';
        document.body.appendChild(overlay);
    }
    const overlay = document.getElementById('tlcgModalOverlay');

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
                            <option value="Người Lớn">👔 Người Lớn</option>
                            <option value="Mầm Non">👶 Mầm Non</option>
                            <option value="Tiểu Học">🎒 Tiểu Học</option>
                            <option value="Oversize">👕 Oversize</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">Số lượng áo</label>
                        <input type="number" id="calc_quantity" class="tlcg-search-input" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px;" placeholder="Tự điền (tùy chọn)">
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
}

function _tlcgCalcHandleMaterialChange(matId) {
    const colorSelect = document.getElementById('calc_color_id');
    if (!colorSelect) return;
    
    colorSelect.innerHTML = '<option value="">-- Chọn màu sắc --</option>';
    if (!matId) return;

    // Filter colors by material_id
    const filteredColors = _tlcg.colors.filter(c => String(c.material_id) === String(matId));
    filteredColors.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.color_name;
        colorSelect.appendChild(opt);
    });
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

        // Render results
        let html = '';

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
                                <th style="padding: 10px 12px; font-weight: 700; background: #0f172a !important; color: #ffffff !important;">Nhà cung cấp (Nguồn nhập)</th>
                                <th style="padding: 10px 12px; font-weight: 700; background: #0f172a !important; color: #ffffff !important; text-align: right;">Đơn giá gốc đã duyệt</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        if (res.suppliers && res.suppliers.length > 0) {
            res.suppliers.forEach(s => {
                html += `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">${s.source_name}</td>
                        <td style="padding: 10px 12px; text-align: right; font-weight: 800; color: #4f46e5;">${Number(s.price).toLocaleString('vi-VN')} đ / ${res.unit}</td>
                    </tr>
                `;
            });
        } else {
            html += `
                <tr>
                    <td colspan="2" style="padding: 16px; text-align: center; color: #64748b; font-style: italic;">Chưa có giá nhập gốc nào được duyệt cho màu này.</td>
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
            res.calculations.forEach(calc => {
                const targetCheapest = calc.cheapest_target;
                const actualCheapest = calc.cheapest_actual;

                html += `
                    <div style="background: white; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 12px;">
                            <span style="font-weight: 800; font-size: 14.5px; color: #1e293b; display: flex; align-items: center; gap: 6px;">
                                ${calc.segment === 'Người Lớn' ? '👔' : calc.segment === 'Mầm Non' ? '👶' : calc.segment === 'Tiểu Học' ? '🎒' : '👕'} 
                                Phân khúc: ${calc.segment} 
                                <span style="font-size: 11px; font-weight: 700; background: #e2e8f0; color: #475569; padding: 3px 8px; border-radius: 6px; margin-left: 6px;">
                                    📦 Khung: ${calc.range_label}
                                </span>
                            </span>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 12px;">
                            <!-- Target Ratio Column -->
                            <div style="background: #faf5ff; border: 1px solid #f3e8ff; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between;">
                                <div>
                                    <div style="font-size: 11.5px; font-weight: 700; color: #7e22ce; margin-bottom: 6px;">
                                        🎯 Tỉ Lệ Cắt Mục Tiêu
                                    </div>
                                    <div style="font-size: 16px; font-weight: 800; color: #6b21a8; margin-bottom: 8px;">
                                        ${calc.target_ratio ? calc.target_ratio.toFixed(2) + ' sp/' + res.unit : 'Chưa cấu hình'}
                                    </div>
                                </div>
                                ${calc.target_ratio > 0 && targetCheapest ? `
                                    <div style="font-size: 12px; color: #1e293b; border-top: 1px dashed #e9d5ff; padding-top: 8px; margin-top: 8px;">
                                        <div>🏆 Nguồn rẻ nhất: <strong style="color: #6b21a8;">${targetCheapest.source_name}</strong></div>
                                        <div style="font-size: 16px; font-weight: 900; color: #10b981; margin-top: 4px;">
                                            ${Number(targetCheapest.price).toLocaleString('vi-VN')} đ <span style="font-size: 11px; font-weight: normal; color: #64748b;">/ áo thành phẩm</span>
                                        </div>
                                        <div style="font-size: 10.5px; color: #64748b; margin-top: 2px;">
                                            (Đơn giá gốc: ${Number(targetCheapest.base_price).toLocaleString('vi-VN')}đ / ${res.unit})
                                        </div>
                                    </div>
                                ` : '<div style="font-size: 12px; color: #64748b; font-style: italic; border-top: 1px dashed #e9d5ff; padding-top: 8px; margin-top: 8px;">Không thể tính giá (tỉ lệ = 0 hoặc chưa có giá)</div>'}
                            </div>

                            <!-- Actual Ratio Column -->
                            <div style="background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between;">
                                <div>
                                    <div style="font-size: 11.5px; font-weight: 700; color: #047857; margin-bottom: 6px;">
                                        📊 Tỉ Lệ Cắt Thực Tế
                                    </div>
                                    <div style="font-size: 16px; font-weight: 800; color: #065f46; margin-bottom: 8px;">
                                        ${calc.actual_ratio ? calc.actual_ratio.toFixed(2) + ' sp/' + res.unit : 'Chưa có dữ liệu'}
                                    </div>
                                </div>
                                ${calc.actual_ratio > 0 && actualCheapest ? `
                                    <div style="font-size: 12px; color: #1e293b; border-top: 1px dashed #a7f3d0; padding-top: 8px; margin-top: 8px;">
                                        <div>🏆 Nguồn rẻ nhất: <strong style="color: #065f46;">${actualCheapest.source_name}</strong></div>
                                        <div style="font-size: 16px; font-weight: 900; color: #059669; margin-top: 4px;">
                                            ${Number(actualCheapest.price).toLocaleString('vi-VN')} đ <span style="font-size: 11px; font-weight: normal; color: #64748b;">/ áo thành phẩm</span>
                                        </div>
                                        <div style="font-size: 10.5px; color: #64748b; margin-top: 2px;">
                                            (Đơn giá gốc: ${Number(actualCheapest.base_price).toLocaleString('vi-VN')}đ / ${res.unit})
                                        </div>
                                    </div>
                                ` : '<div style="font-size: 12px; color: #64748b; font-style: italic; border-top: 1px dashed #a7f3d0; padding-top: 8px; margin-top: 8px;">Không có thực tế (chưa có đơn cắt thực tế hoặc chưa có giá)</div>'}
                            </div>
                        </div>

                        <!-- Full comparison table for this range -->
                        <div style="margin-top: 10px;">
                            <span style="font-size: 11.5px; font-weight: 700; color: #4f46e5; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" onclick="const t = this.nextElementSibling; t.style.display = t.style.display === 'none' ? 'block' : 'none'">
                                🔍 Xem chi tiết bảng so sánh các nguồn ▾
                            </span>
                            <div style="display: none; margin-top: 8px; border: 1.5px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                                <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                                    <thead>
                                        <tr>
                                            <th style="padding: 8px 10px; font-weight: 700; background: #0f172a !important; color: #ffffff !important;">Nguồn nhập</th>
                                            <th style="padding: 8px 10px; font-weight: 700; background: #0f172a !important; color: #ffffff !important; text-align: right;">Giá vải gốc</th>
                                            <th style="padding: 8px 10px; font-weight: 700; background: #0f172a !important; color: #ffffff !important; text-align: right;">Giá theo Mục Tiêu</th>
                                            <th style="padding: 8px 10px; font-weight: 700; background: #0f172a !important; color: #ffffff !important; text-align: right;">Giá theo Thực Tế</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                `;
                res.suppliers.forEach(s => {
                    const tgtP = calc.target_prices[s.source_id] ? Number(calc.target_prices[s.source_id]).toLocaleString('vi-VN') + ' đ' : '—';
                    const actP = calc.actual_prices[s.source_id] ? Number(calc.actual_prices[s.source_id]).toLocaleString('vi-VN') + ' đ' : '—';
                    
                    const isTgtBest = targetCheapest && String(targetCheapest.source_id) === String(s.source_id);
                    const isActBest = actualCheapest && String(actualCheapest.source_id) === String(s.source_id);

                    html += `
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px 10px; font-weight: 600; color: #1e293b;">${s.source_name}</td>
                            <td style="padding: 8px 10px; text-align: right; color: #64748b;">${Number(s.price).toLocaleString('vi-VN')} đ</td>
                            <td style="padding: 8px 10px; text-align: right; font-weight: 700; color: ${isTgtBest ? '#10b981' : '#475569'}; background: ${isTgtBest ? 'rgba(245,243,255,0.6)' : 'transparent'};">
                                ${tgtP} ${isTgtBest ? '🏆' : ''}
                            </td>
                            <td style="padding: 8px 10px; text-align: right; font-weight: 700; color: ${isActBest ? '#059669' : '#475569'}; background: ${isActBest ? 'rgba(236,253,245,0.6)' : 'transparent'};">
                                ${actP} ${isActBest ? '🏆' : ''}
                            </td>
                        </tr>
                    `;
                });
                html += `
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
    } catch (err) {
        console.error('[Run calculation error]', err);
        resultsDiv.innerHTML = `<div style="padding: 16px; background: #fee2e2; color: #b91c1c; border-radius: 8px; font-weight: 600;">❌ Lỗi: ${err.message}</div>`;
    }
}
