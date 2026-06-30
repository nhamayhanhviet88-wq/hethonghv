// ========== GIÁ NHẬP GỐC — Desktop SPA (Master-Detail Design) ==========
var _gng = {
    prices: [],
    history: [],
    pending: [],
    filter: {
        tab: 'approved', // 'approved', 'history', 'pending'
        search: '',
        supplierId: 'all', // 'all', 'pending_all', or number (source_id)
        supplierSearch: '',
        type: '' // '', 'fabric', 'material'
    },
    sidebarExpanded: {
        fabric: true,
        material: true
    },
    isDuyetUser: false
};

function _gngSaveState() {
    try {
        const state = {
            filter: _gng.filter,
            sidebarExpanded: _gng.sidebarExpanded
        };
        sessionStorage.setItem('gng_state', JSON.stringify(state));
    } catch (e) {
        console.error('Failed to save GNG state', e);
    }
}

function _gngFormatRatioAndPriceHtml(p) {
    const ratioAdult = Number(p.fabric_cut_ratio_adult) || 0;
    const ratioChild = Number(p.fabric_cut_ratio_child) || 0;
    const ratioOversize = Number(p.fabric_cut_ratio_oversize) || 0;

    const priceAdult = ratioAdult > 0 ? Math.round(Number(p.price) / ratioAdult) : 0;
    const priceChild = ratioChild > 0 ? Math.round(Number(p.price) / ratioChild) : 0;
    const priceOversize = ratioOversize > 0 ? Math.round(Number(p.price) / ratioOversize) : 0;

    const cutRatioHtml = `
        <div style="line-height: 1.6; text-align: left; font-size: 12px; font-family: inherit; display: inline-block;">
            <div style="display: flex; gap: 8px; justify-content: space-between;">
                <span style="color: #64748b; font-weight: 500;">🧑 Lớn:</span>
                <span style="font-weight: 700; color: #2563eb;">${ratioAdult > 0 ? (ratioAdult + ' sp/kg') : '---'}</span>
            </div>
            <div style="display: flex; gap: 8px; justify-content: space-between; margin-top: 2px;">
                <span style="color: #64748b; font-weight: 500;">👶 Trẻ:</span>
                <span style="font-weight: 700; color: #059669;">${ratioChild > 0 ? (ratioChild + ' sp/kg') : '---'}</span>
            </div>
            <div style="display: flex; gap: 8px; justify-content: space-between; margin-top: 2px;">
                <span style="color: #64748b; font-weight: 500;">👕 Over:</span>
                <span style="font-weight: 700; color: #ea580c;">${ratioOversize > 0 ? (ratioOversize + ' sp/kg') : '---'}</span>
            </div>
        </div>
    `;

    const finishedPriceHtml = `
        <div style="line-height: 1.6; text-align: right; font-size: 12px; font-family: inherit; display: inline-block;">
            <div>
                <span style="color: #64748b; font-weight: 500; font-size: 11px;">🧑 Lớn:</span>
                <span style="font-weight: 700; color: #2563eb; margin-left: 4px;">${priceAdult > 0 ? (priceAdult.toLocaleString('vi-VN') + ' đ') : '---'}</span>
            </div>
            <div style="margin-top: 2px;">
                <span style="color: #64748b; font-weight: 500; font-size: 11px;">👶 Trẻ:</span>
                <span style="font-weight: 700; color: #059669; margin-left: 4px;">${priceChild > 0 ? (priceChild.toLocaleString('vi-VN') + ' đ') : '---'}</span>
            </div>
            <div style="margin-top: 2px;">
                <span style="color: #64748b; font-weight: 500; font-size: 11px;">👕 Over:</span>
                <span style="font-weight: 700; color: #ea580c; margin-left: 4px;">${priceOversize > 0 ? (priceOversize.toLocaleString('vi-VN') + ' đ') : '---'}</span>
            </div>
        </div>
    `;

    return { cutRatioHtml, finishedPriceHtml };
}

function _gngFormatRatioAndPriceRangeHtml(g, minBasePrice, maxBasePrice) {
    const ratioAdult = Number(g.items[0]?.fabric_cut_ratio_adult) || 0;
    const ratioChild = Number(g.items[0]?.fabric_cut_ratio_child) || 0;
    const ratioOversize = Number(g.items[0]?.fabric_cut_ratio_oversize) || 0;

    function getRangeText(ratio, color) {
        if (ratio <= 0) return '---';
        const minP = Math.round(minBasePrice / ratio);
        const maxP = Math.round(maxBasePrice / ratio);
        if (minP === maxP) {
            return `<span style="color: ${color}; font-weight: 700;">${minP.toLocaleString('vi-VN')} đ</span>`;
        }
        return `<span style="color: ${color}; font-weight: 700;">${minP.toLocaleString('vi-VN')} đ</span> <span style="color: #64748b; font-weight: normal;">-</span> <span style="color: ${color}; font-weight: 700;">${maxP.toLocaleString('vi-VN')} đ</span>`;
    }

    const cutRatioHtml = `
        <div style="line-height: 1.6; text-align: left; font-size: 12px; font-family: inherit; display: inline-block;">
            <div style="display: flex; gap: 8px; justify-content: space-between;">
                <span style="color: #64748b; font-weight: 500;">🧑 Lớn:</span>
                <span style="font-weight: 700; color: #2563eb;">${ratioAdult > 0 ? (ratioAdult + ' sp/kg') : '---'}</span>
            </div>
            <div style="display: flex; gap: 8px; justify-content: space-between; margin-top: 2px;">
                <span style="color: #64748b; font-weight: 500;">👶 Trẻ:</span>
                <span style="font-weight: 700; color: #059669;">${ratioChild > 0 ? (ratioChild + ' sp/kg') : '---'}</span>
            </div>
            <div style="display: flex; gap: 8px; justify-content: space-between; margin-top: 2px;">
                <span style="color: #64748b; font-weight: 500;">👕 Over:</span>
                <span style="font-weight: 700; color: #ea580c;">${ratioOversize > 0 ? (ratioOversize + ' sp/kg') : '---'}</span>
            </div>
        </div>
    `;

    const finishedPriceHtml = `
        <div style="line-height: 1.6; text-align: right; font-size: 12px; font-family: inherit; display: inline-block;">
            <div>
                <span style="color: #64748b; font-weight: 500; font-size: 11px;">🧑 Lớn:</span>
                <span style="margin-left: 4px;">${getRangeText(ratioAdult, '#2563eb')}</span>
            </div>
            <div style="margin-top: 2px;">
                <span style="color: #64748b; font-weight: 500; font-size: 11px;">👶 Trẻ:</span>
                <span style="margin-left: 4px;">${getRangeText(ratioChild, '#059669')}</span>
            </div>
            <div style="margin-top: 2px;">
                <span style="color: #64748b; font-weight: 500; font-size: 11px;">👕 Over:</span>
                <span style="margin-left: 4px;">${getRangeText(ratioOversize, '#ea580c')}</span>
            </div>
        </div>
    `;

    return { cutRatioHtml, finishedPriceHtml };
}

function _gngFormatDateTime(dateVal) {
    if (!dateVal) return '---';
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return '---';
    
    try {
        const options = {
            timeZone: 'Asia/Ho_Chi_Minh',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            day: 'numeric',
            month: 'numeric',
            year: 'numeric'
        };
        const formatter = new Intl.DateTimeFormat('vi-VN', options);
        const parts = formatter.formatToParts(date);
        
        let hour = '';
        let minute = '';
        let day = '';
        let month = '';
        let year = '';
        
        for (const part of parts) {
            if (part.type === 'hour') hour = part.value;
            if (part.type === 'minute') minute = part.value;
            if (part.type === 'day') day = part.value;
            if (part.type === 'month') month = part.value;
            if (part.type === 'year') year = part.value;
        }
        
        hour = String(hour).padStart(2, '0');
        minute = String(minute).padStart(2, '0');
        const yr2 = String(year).slice(-2);
        
        // Safe weekday calculations in Vietnam offset
        const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
        const vnTime = new Date(utcTime + (3600000 * 7));
        const dayOfWeekIndex = vnTime.getDay();
        const dayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        const dayName = dayNames[dayOfWeekIndex];
        
        return `${hour}:${minute} ${dayName} - ${day}/${month}/${yr2}`;
    } catch (e) {
        const pad = (num) => String(num).padStart(2, '0');
        const h = pad(date.getHours());
        const m = pad(date.getMinutes());
        const d = date.getDate();
        const mo = date.getMonth() + 1;
        const y = String(date.getFullYear()).slice(-2);
        
        const dayOfWeekIndex = date.getDay();
        const dayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        const dayName = dayNames[dayOfWeekIndex];
        
        return `${h}:${m} ${dayName} - ${d}/${mo}/${y}`;
    }
}

async function renderGiaNhapGocPage(content) {
    if (!content) content = document.getElementById('contentArea');
    if (!content) return;

    // Load state from sessionStorage
    try {
        const savedStateStr = sessionStorage.getItem('gng_state');
        if (savedStateStr) {
            const savedState = JSON.parse(savedStateStr);
            if (savedState) {
                if (savedState.filter) _gng.filter = { ..._gng.filter, ...savedState.filter };
                if (savedState.sidebarExpanded) _gng.sidebarExpanded = { ..._gng.sidebarExpanded, ...savedState.sidebarExpanded };
            }
        }
    } catch (e) {
        console.error('Failed to load GNG state', e);
    }

    // Inject custom premium CSS for Master-Detail layout
    if (!document.getElementById('_gngStyles')) {
        const style = document.createElement('style');
        style.id = '_gngStyles';
        style.textContent = `
            .gng-container {
                padding: 24px;
                background: #f8fafc;
                min-height: 100%;
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                animation: gngFadeIn 0.3s ease-out;
            }
            @keyframes gngFadeIn {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .gng-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 16px;
            }
            .gng-title-area h2 {
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
            .gng-title-area p {
                font-size: 13px;
                color: #64748b;
                margin: 4px 0 0 0;
            }
            
            /* Stats Overview */
            .gng-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                gap: 20px;
                margin-bottom: 24px;
            }
            .gng-stat-card {
                border-radius: 16px;
                padding: 20px;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                cursor: pointer;
                position: relative;
                overflow: hidden;
                border: 2px solid transparent;
            }
            .gng-stat-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 100%);
                pointer-events: none;
            }
            .gng-stat-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 12px 20px -8px rgba(0,0,0,0.15);
            }
            .gng-stat-card:active {
                transform: translateY(-1px);
            }
            .gng-stat-card-total {
                background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
            }
            .gng-stat-card-bills {
                background: linear-gradient(135deg, #0d9488 0%, #115e59 100%);
            }
            .gng-stat-card-items {
                background: linear-gradient(135deg, #e11d48 0%, #9f1239 100%);
            }
            
            /* White active bottom line indicator */
            .gng-stat-card.active::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 10%;
                width: 80%;
                height: 4px;
                background: #ffffff;
                border-radius: 4px 4px 0 0;
                box-shadow: 0 0 8px rgba(255,255,255,0.8);
            }
            .gng-stat-card.active {
                border-color: rgba(255,255,255,0.4);
            }
            .gng-stat-val {
                font-size: 30px;
                font-weight: 800;
                color: #ffffff;
                margin-bottom: 6px;
                text-shadow: 0 1px 2px rgba(0,0,0,0.15);
            }
            .gng-stat-label {
                font-size: 13px;
                color: rgba(255, 255, 255, 0.95);
                font-weight: 600;
                text-shadow: 0 1px 2px rgba(0,0,0,0.15);
            }

            /* Master-Detail Layout */
            .gng-layout {
                display: flex;
                gap: 20px;
                min-height: calc(100vh - 240px);
                align-items: stretch;
            }
            
            /* Left Sidebar: Supplier List */
            .gng-sidebar {
                width: 280px;
                background: white;
                border-radius: 16px;
                border: 1px solid #e2e8f0;
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
            }
            .gng-sidebar-header {
                font-size: 12px;
                font-weight: 700;
                color: #475569;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .gng-sidebar-search {
                padding: 8px 12px;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                font-size: 13px;
                outline: none;
                width: 100%;
                transition: all 0.2s;
            }
            .gng-sidebar-search:focus {
                border-color: #4f46e5;
                box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
            }
            .gng-sidebar-list {
                display: flex;
                flex-direction: column;
                gap: 4px;
                overflow-y: auto;
                flex: 1;
                max-height: calc(100vh - 380px);
            }
            .gng-sidebar-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 12px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 13px;
                font-weight: 600;
                color: #475569;
                border: 1px solid transparent;
            }
            .gng-sidebar-item:hover {
                background: #f1f5f9;
                color: #0f172a;
            }
            .gng-sidebar-item.active {
                background: #e0e7ff;
                color: #4338ca;
                border-color: #c7d2fe;
            }
            .gng-sidebar-sub-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 10px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.15s;
                border: 1px solid transparent;
            }
            .gng-sidebar-sub-item:hover {
                background: #f1f5f9;
                color: #0f172a;
            }
            .gng-sidebar-sub-item.active {
                background: #4f46e5;
                color: white;
                font-weight: 700;
            }
            .gng-sidebar-sub-item.active .gng-sidebar-item-name {
                color: white;
            }
            .gng-sidebar-item-name {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 160px;
            }
            .gng-sidebar-badges {
                display: flex;
                gap: 4px;
                align-items: center;
            }
            .gng-sidebar-badge-count {
                font-size: 10px;
                background: #f1f5f9;
                color: #64748b;
                padding: 2px 6px;
                border-radius: 6px;
            }
            .gng-sidebar-item.active .gng-sidebar-badge-count {
                background: #c7d2fe;
                color: #4338ca;
            }
            .gng-sidebar-badge-pending {
                font-size: 10px;
                background: #fee2e2;
                color: #b91c1c;
                padding: 2px 6px;
                border-radius: 6px;
                font-weight: 700;
                animation: gngPulse 2s infinite;
            }
            @keyframes gngPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }

            /* Right Content: Material details */
            .gng-detail-panel {
                flex: 1;
                background: white;
                border-radius: 16px;
                border: 1px solid #e2e8f0;
                padding: 20px;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            
            /* Tabs Navigation */
            .gng-tabs {
                display: flex;
                gap: 8px;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 1px;
            }
            .gng-tab-btn {
                padding: 10px 16px;
                font-size: 13px;
                font-weight: 600;
                color: #64748b;
                background: transparent;
                border: none;
                border-bottom: 2px solid transparent;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .gng-tab-btn:hover {
                color: #4f46e5;
                background: #f1f5f9;
                border-radius: 8px 8px 0 0;
            }
            .gng-tab-btn.active {
                color: #4f46e5;
                border-bottom-color: #4f46e5;
                font-weight: 700;
            }
            .gng-tab-badge {
                font-size: 10px;
                background: #ef4444;
                color: white;
                padding: 1px 6px;
                border-radius: 9999px;
                font-weight: 700;
            }

            /* Controls and filters */
            .gng-controls {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
                align-items: center;
            }
            .gng-input {
                flex: 1;
                min-width: 200px;
                padding: 9px 12px;
                border-radius: 8px;
                border: 1px solid #cbd5e1;
                font-size: 13px;
                outline: none;
                transition: all 0.2s;
            }
            .gng-input:focus {
                border-color: #4f46e5;
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
            }
            .gng-select {
                padding: 9px 12px;
                border-radius: 8px;
                border: 1px solid #cbd5e1;
                font-size: 13px;
                background-color: white;
                outline: none;
                cursor: pointer;
                transition: all 0.2s;
            }

            /* Tables and cards */
            .gng-table-card {
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                overflow: hidden;
            }
            .gng-table {
                width: 100%;
                border-collapse: collapse;
                text-align: left;
            }
            .gng-table th {
                background: #f8fafc;
                padding: 12px 14px;
                font-size: 11px;
                font-weight: 700;
                color: #475569;
                text-transform: uppercase;
                border-bottom: 1px solid #e2e8f0;
            }
            .gng-table td {
                padding: 12px 14px;
                font-size: 13px;
                color: #334155;
                border-bottom: 1px solid #f1f5f9;
            }
            .gng-table tr:last-child td {
                border-bottom: none;
            }
            .gng-table tr:hover td {
                background: #f8fafc;
            }

            /* Pending approvals list */
            .gng-pending-list {
                display: flex;
                flex-direction: column;
                gap: 14px;
            }
            .gng-pending-card {
                background: white;
                border-radius: 12px;
                border: 1px solid #e2e8f0;
                padding: 16px;
            }
            .gng-pending-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-bottom: 1px solid #f1f5f9;
                padding-bottom: 10px;
                margin-bottom: 12px;
            }
            .gng-pending-title {
                font-size: 14px;
                font-weight: 700;
                color: #0f172a;
            }
            .gng-pending-meta {
                font-size: 12px;
                color: #64748b;
                margin-top: 4px;
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
            }
            .gng-pending-actions {
                display: flex;
                gap: 8px;
            }
            .gng-btn-approve {
                background: #10b981;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 6px;
                font-weight: 700;
                font-size: 12px;
                cursor: pointer;
            }
            .gng-btn-approve:hover {
                background: #059669;
            }
            .gng-disc-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 6px;
            }
            .gng-disc-table th {
                background: #fffbeb;
                color: #b45309;
                font-size: 11px;
                padding: 6px 10px;
                text-align: left;
            }
            .gng-disc-table td {
                padding: 8px 10px;
                font-size: 12px;
                border-bottom: 1px solid #fef3c7;
            }
             .gng-badge-type {
                font-size: 11px;
                padding: 4px 8px;
                border-radius: 6px;
                font-weight: 700;
                text-transform: uppercase;
                white-space: nowrap;
                display: inline-block;
            }
            .gng-badge-fabric { background: #dbeafe; color: #1e40af; }
            .gng-badge-material { background: #ffedd5; color: #9a3412; }

            .gng-badge {
                font-size: 11px;
                padding: 2px 6px;
                border-radius: 6px;
                font-weight: 600;
            }
            .gng-badge-stable { background: #dcfce7; color: #15803d; }
            .gng-badge-alert { background: #fee2e2; color: #b91c1c; }
            .gng-badge-warning { background: #fef3c7; color: #d97706; }

            /* Modal Styles */
            .gng-modal-backdrop {
                position: fixed;
                top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(15, 23, 42, 0.4);
                backdrop-filter: blur(4px);
                display: flex; align-items: center; justify-content: center;
                z-index: 1000;
            }
            .gng-modal-card {
                background: white; border-radius: 12px; width: 100%; max-width: 500px;
                border: 1px solid #e2e8f0; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            .gng-modal-header {
                padding: 12px 16px; border-bottom: 1px solid #e2e8f0;
                display: flex; justify-content: space-between; align-items: center;
                background: #f8fafc;
            }
            .gng-modal-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; }
            .gng-modal-close { background: transparent; border: none; font-size: 18px; cursor: pointer; color: #64748b; }
            .gng-modal-body { padding: 16px; max-height: 60vh; overflow-y: auto; }
            .gng-modal-footer { padding: 12px 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 8px; background: #f8fafc; }
            .gng-form-group { margin-bottom: 12px; }
            .gng-form-group label { display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px; }
            .gng-btn-primary { background: #4f46e5; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 13px; cursor: pointer; }
            .gng-btn-primary:hover { background: #4338ca; }
            .gng-btn-secondary { background: #e2e8f0; color: #475569; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 13px; cursor: pointer; }
            .gng-btn-secondary:hover { background: #cbd5e1; }
            .gng-empty { padding: 32px; text-align: center; color: #64748b; }
            .gng-empty-icon { font-size: 32px; margin-bottom: 8px; }

            /* Accordion Styling */
            .gng-group-header {
                cursor: pointer;
                background: #f8fafc !important;
                font-weight: 700;
                color: #0f172a;
                border-bottom: 1px solid #e2e8f0;
                transition: background 0.15s ease;
            }
            .gng-group-header:hover {
                background: #f1f5f9 !important;
            }
            .gng-sub-row {
                background: #ffffff;
            }
            .gng-sub-row td {
                padding: 10px 14px 10px 32px !important;
                font-size: 12.5px;
                border-bottom: 1px solid #f1f5f9;
            }
            .gng-group-arrow {
                display: inline-block;
                transition: transform 0.2s ease;
                margin-right: 8px;
                font-size: 11px;
                color: #64748b;
            }
            .gng-sidebar-category-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 12px;
                font-size: 11px;
                font-weight: 800;
                color: #1e293b;
                background: #f8fafc;
                border-radius: 8px;
                cursor: pointer;
                user-select: none;
                margin-top: 12px;
                margin-bottom: 6px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                border: 1px solid #e2e8f0;
                transition: all 0.15s ease;
            }
            .gng-sidebar-category-header:hover {
                background: #f1f5f9;
                border-color: #cbd5e1;
            }
            .gng-category-arrow {
                font-size: 9px;
                color: #64748b;
            }
        `;
        document.head.appendChild(style);
    }

    _gng.content = content;

    // Fetch user permissions
    try {
        const permRes = await apiCall('/api/import/check-duyet-perm', 'GET');
        _gng.isDuyetUser = !!permRes.allowed;
    } catch(e) {
        _gng.isDuyetUser = false;
    }

    await _gngLoadData();
}

async function _gngLoadData() {
    if (!document.getElementById('gngBlinkStyles')) {
        var style = document.createElement('style');
        style.id = 'gngBlinkStyles';
        style.innerHTML = `
            @keyframes gngBlink {
                0% { opacity: 1; }
                50% { opacity: 0.15; }
                100% { opacity: 1; }
            }
            .gng-blink {
                animation: gngBlink 1.2s infinite;
            }
        `;
        document.head.appendChild(style);
    }
    try {
        const [pricesRes, historyRes, pendingRes] = await Promise.all([
            apiCall('/api/gianhapgoc/prices', 'GET'),
            apiCall('/api/gianhapgoc/history', 'GET'),
            apiCall('/api/gianhapgoc/pending', 'GET')
        ]);

        _gng.prices = pricesRes.prices || [];
        _gng.history = historyRes.history || [];
        _gng.pending = pendingRes.pending || [];

        _gngRenderLayout();
    } catch(err) {
        console.error('[GNG Load error]', err);
        if (typeof showToast === 'function') showToast('Không thể tải dữ liệu giá nhập gốc: ' + err.message, 'error');
    }
}

function _gngRenderLayout() {
    if (!_gng.content) return;

    // Compute stats
    const totalPrices = _gng.prices.length;
    const totalPending = _gng.pending.length;
    const totalDiff = _gng.pending.reduce((acc, curr) => acc + (curr.discrepancies?.length || 0), 0);

    // Render header and overall stats
    _gng.content.innerHTML = `
        <div class="gng-container">
            <div class="gng-header">
                <div class="gng-title-area">
                    <h2>🏷️ Giá Nhập Gốc</h2>
                    <p>Quản lý, tra cứu và duyệt đơn giá nguyên vật liệu & phụ liệu sản xuất</p>
                </div>
            </div>

            <!-- Stats Overview -->
            <div class="gng-stats">
                <div class="gng-stat-card gng-stat-card-total ${_gng.filter.supplierId === 'all' && _gng.filter.tab === 'approved' ? 'active' : ''}" onclick="_gngSelectStatCard('approved')">
                    <div class="gng-stat-val">${totalPrices}</div>
                    <div class="gng-stat-label">Tổng Vật Tư Đã Lưu Giá Gốc</div>
                </div>
                <div class="gng-stat-card gng-stat-card-bills ${_gng.filter.supplierId === 'pending_all' && _gng.filter.tab === 'pending' ? 'active' : ''}" onclick="_gngSelectStatCard('pending')">
                    <div class="gng-stat-val">${totalPending}</div>
                    <div class="gng-stat-label">Hóa Đơn Chờ Duyệt Lệch Giá</div>
                </div>
                <div class="gng-stat-card gng-stat-card-items ${_gng.filter.supplierId === 'pending_all' && _gng.filter.tab === 'pending' ? 'active' : ''}" onclick="_gngSelectStatCard('pending')">
                    <div class="gng-stat-val">${totalDiff}</div>
                    <div class="gng-stat-label">Mục Bị Chênh Lệch Đang Chờ Duyệt</div>
                </div>
            </div>

            <!-- Master-Detail Structure -->
            <div class="gng-layout">
                <!-- Left Sidebar: Supplier List -->
                <div class="gng-sidebar">
                    <div class="gng-sidebar-header">
                        <span>🏢 Nhà cung cấp</span>
                        <button class="gng-btn-secondary" style="padding:2px 6px; font-size:10px;" onclick="_gngLoadData()">🔄 Tải lại</button>
                    </div>
                    <input type="text" id="gngSidebarSearch" class="gng-sidebar-search" placeholder="Tìm kiếm nhà cung cấp..." value="${_gng.filter.supplierSearch || ''}">
                    <div class="gng-sidebar-list" id="gngSidebarListArea">
                        <!-- Suppliers loaded dynamically -->
                    </div>
                </div>

                <!-- Right Detail Panel -->
                <div class="gng-detail-panel" id="gngDetailPanelArea">
                    <!-- Dynamic details -->
                </div>
            </div>
        </div>
    `;

    // Bind sidebar search event
    const sidebarSearch = document.getElementById('gngSidebarSearch');
    if (sidebarSearch) {
        sidebarSearch.addEventListener('input', function(e) {
            _gng.filter.supplierSearch = e.target.value;
            _gngSaveState();
            _gngRenderSidebar();
        });
    }

    _gngRenderSidebar();
    _gngRenderDetailPanel();
}

function _gngAutoExpandActiveCategory() {
    if (_gng.filter.supplierId === 'all' || _gng.filter.supplierId === 'pending_all') return;
    
    // Find the active supplier's type
    const sId = _gng.filter.supplierId;
    const hasFabric = _gng.prices.some(p => p.source_id == sId && p.item_type === 'fabric') ||
                      _gng.history.some(h => h.source_id == sId && h.item_type === 'fabric') ||
                      _gng.pending.some(rec => rec.source_id == sId && rec.record_type === 'fabric');
    const type = hasFabric ? 'fabric' : 'material';
    
    // Expand it
    _gng.sidebarExpanded[type] = true;
}

function _gngToggleSidebarCategory(type) {
    _gng.sidebarExpanded[type] = !_gng.sidebarExpanded[type];
    _gngSaveState();
    _gngRenderSidebar();
}

function _gngRenderSidebar() {
    const listArea = document.getElementById('gngSidebarListArea');
    if (!listArea) return;

    // Auto expand category containing active supplier
    _gngAutoExpandActiveCategory();

    // Process unique suppliers and their statistics
    const suppliersMap = new Map(); // source_id -> { name, priceCount, pendingCount }
    
    _gng.prices.forEach(p => {
        if (p.source_id) {
            if (!suppliersMap.has(p.source_id)) {
                suppliersMap.set(p.source_id, { name: p.source_name, priceCount: 0, pendingCount: 0 });
            }
            suppliersMap.get(p.source_id).priceCount++;
        }
    });

    _gng.pending.forEach(rec => {
        if (rec.source_id) {
            if (!suppliersMap.has(rec.source_id)) {
                suppliersMap.set(rec.source_id, { name: rec.source_name, priceCount: 0, pendingCount: 0 });
            }
            suppliersMap.get(rec.source_id).pendingCount += (rec.discrepancies?.length || 0);
        }
    });

    const suppliersList = [];
    suppliersMap.forEach((val, key) => {
        suppliersList.push({ id: key, ...val });
    });

    // Sort alphabetically by name
    suppliersList.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));

    // Global Statistics
    const totalPendingCount = _gng.pending.reduce((acc, curr) => acc + (curr.discrepancies?.length || 0), 0);

    let html = `
        <div class="gng-sidebar-item ${_gng.filter.supplierId === 'all' ? 'active' : ''}" onclick="_gngSelectSupplier('all')">
            <span class="gng-sidebar-item-name">🌍 Tất cả nhà cung cấp</span>
            <div class="gng-sidebar-badges">
                <span class="gng-sidebar-badge-count">${_gng.prices.length}</span>
            </div>
        </div>
        <div class="gng-sidebar-item ${_gng.filter.supplierId === 'pending_all' ? 'active' : ''}" onclick="_gngSelectSupplier('pending_all')">
            <span class="gng-sidebar-item-name">⚠️ Tổng hợp chờ duyệt</span>
            <div class="gng-sidebar-badges">
                ${totalPendingCount > 0 ? `<span class="gng-sidebar-badge-pending">${totalPendingCount}</span>` : `<span class="gng-sidebar-badge-count">0</span>`}
            </div>
        </div>
        <hr style="border:0; border-top: 1px solid #e2e8f0; margin: 4px 0;" />
    `;

    // Filter suppliers
    const q = (_gng.filter.supplierSearch || '').toLowerCase().trim();
    const filteredSuppliers = suppliersList.filter(s => (s.name || '').toLowerCase().includes(q));

    // Group into Fabric vs Material
    const fabricList = [];
    const materialList = [];

    filteredSuppliers.forEach(s => {
        // Classify supplier
        const hasFabric = _gng.prices.some(p => p.source_id == s.id && p.item_type === 'fabric') ||
                          _gng.history.some(h => h.source_id == s.id && h.item_type === 'fabric') ||
                          _gng.pending.some(rec => rec.source_id == s.id && rec.record_type === 'fabric');
        if (hasFabric) {
            fabricList.push(s);
        } else {
            materialList.push(s);
        }
    });

    // Helper to render supplier items
    function renderSupplierItem(s) {
        const isActive = _gng.filter.supplierId == s.id;
        
        // Find materials for this supplier
        const materialsSet = new Set();
        _gng.prices.forEach(p => {
            if (p.source_id == s.id) {
                const name = p.item_type === 'fabric' ? p.fabric_material_name : p.item_name;
                if (name) materialsSet.add(name);
            }
        });
        const materials = Array.from(materialsSet);
        materials.sort((a, b) => a.localeCompare(b, 'vi'));

        let itemHtml = `
            <div class="gng-sidebar-item ${isActive ? 'active' : ''}" onclick="_gngSelectSupplier(${s.id})">
                <span class="gng-sidebar-item-name" title="${s.name}">${s.name}</span>
                <div class="gng-sidebar-badges">
                    <span class="gng-sidebar-badge-count">${s.priceCount}</span>
                    ${s.pendingCount > 0 ? `<span class="gng-sidebar-badge-pending">${s.pendingCount}</span>` : ''}
                </div>
            </div>
        `;

        if (isActive && materials.length > 0) {
            let subItemsHtml = '';
            materials.forEach(m => {
                const isSubActive = _gng.filter.materialName === m;
                subItemsHtml += `
                    <div class="gng-sidebar-sub-item ${isSubActive ? 'active' : ''}" onclick="event.stopPropagation(); _gngSelectMaterial(${s.id}, '${escapeJS(m)}')">
                        <span class="gng-sidebar-item-name" style="font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;" title="${m}">🧵 ${m}</span>
                    </div>
                `;
            });
            itemHtml += `
                <div class="gng-sidebar-sub-list" style="margin-left: 16px; padding-left: 8px; border-left: 1.5px solid #cbd5e1; display: flex; flex-direction: column; gap: 4px; margin-top: 4px; margin-bottom: 4px;">
                    ${subItemsHtml}
                </div>
            `;
        }
        return itemHtml;
    }

    const isSearching = q.length > 0;
    const isFabricExpanded = isSearching || _gng.sidebarExpanded.fabric;
    const isMaterialExpanded = isSearching || _gng.sidebarExpanded.material;

    // Build categories html
    html += `
        <div class="gng-sidebar-category-header" onclick="_gngToggleSidebarCategory('fabric')">
            <span>🧵 NGUỒN NHẬP VẢI</span>
            <span class="gng-category-arrow">${isFabricExpanded ? '▼' : '▶'}</span>
        </div>
        <div class="gng-sidebar-category-content" style="display: ${isFabricExpanded ? 'flex' : 'none'}; flex-direction: column; gap: 4px; padding-left: 4px;">
            ${fabricList.length > 0 ? fabricList.map(renderSupplierItem).join('') : '<div style="font-size:11px; color:#94a3b8; padding:8px; text-align:center;">Không có nguồn nhập vải</div>'}
        </div>
        
        <div class="gng-sidebar-category-header" onclick="_gngToggleSidebarCategory('material')">
            <span>📦 NGUỒN NHẬP VẬT LIỆU</span>
            <span class="gng-category-arrow">${isMaterialExpanded ? '▼' : '▶'}</span>
        </div>
        <div class="gng-sidebar-category-content" style="display: ${isMaterialExpanded ? 'flex' : 'none'}; flex-direction: column; gap: 4px; padding-left: 4px;">
            ${materialList.length > 0 ? materialList.map(renderSupplierItem).join('') : '<div style="font-size:11px; color:#94a3b8; padding:8px; text-align:center;">Không có nguồn nhập vật liệu</div>'}
        </div>
    `;

    listArea.innerHTML = html;
}

function _gngSelectSupplier(id) {
    _gng.filter.supplierId = id;
    
    // Auto shift tab if 'pending_all' is selected
    if (id === 'pending_all') {
        _gng.filter.tab = 'pending';
        _gng.filter.materialName = null;
    } else if (id === 'all') {
        _gng.filter.materialName = null;
    } else {
        // Auto select first material for this supplier
        const materialsSet = new Set();
        _gng.prices.forEach(p => {
            if (p.source_id == id) {
                const name = p.item_type === 'fabric' ? p.fabric_material_name : p.item_name;
                if (name) materialsSet.add(name);
            }
        });
        const materials = Array.from(materialsSet);
        materials.sort((a, b) => a.localeCompare(b, 'vi'));

        if (materials.length > 0) {
            if (!_gng.filter.materialName || !materials.includes(_gng.filter.materialName)) {
                _gng.filter.materialName = materials[0];
            }
        } else {
            _gng.filter.materialName = null;
        }

        if (_gng.filter.tab === 'pending') {
            const hasPending = _gng.pending.some(rec => rec.source_id == id);
            if (!hasPending) _gng.filter.tab = 'approved';
        }
    }

    _gngSaveState();
    _gngRenderSidebar();
    _gngRenderDetailPanel();
}

function _gngSelectMaterial(supplierId, materialName) {
    _gng.filter.supplierId = supplierId;
    _gng.filter.materialName = materialName;
    _gngSaveState();
    _gngRenderSidebar();
    _gngRenderDetailPanel();
}

function _gngRenderDetailPanel() {
    const detailPanel = document.getElementById('gngDetailPanelArea');
    if (!detailPanel) return;

    // Determine Title name
    let titleName = 'Tất cả nhà cung cấp';
    if (_gng.filter.supplierId === 'pending_all') {
        titleName = 'Tổng hợp yêu cầu chờ duyệt giá';
    } else if (_gng.filter.supplierId !== 'all') {
        // Find supplier name
        const match = _gng.prices.find(p => p.source_id == _gng.filter.supplierId) || 
                      _gng.history.find(h => h.source_id == _gng.filter.supplierId) ||
                      _gng.pending.find(r => r.source_id == _gng.filter.supplierId);
        titleName = match ? match.source_name : `Nhà cung cấp #${_gng.filter.supplierId}`;
        if (_gng.filter.materialName) {
            titleName += ` &gt; <span style="color: #4f46e5;">🧵 ${_gng.filter.materialName}</span>`;
        }
    }

    // Number of pending records specifically for selected supplier
    const pendingFiltered = _gng.pending.filter(rec => _gng.filter.supplierId === 'all' || _gng.filter.supplierId === 'pending_all' || rec.source_id == _gng.filter.supplierId);
    const pendingCount = pendingFiltered.length;

    detailPanel.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0; font-size:16px; font-weight:800; color:#0f172a;">🏢 ${titleName}</h3>
        </div>

        <!-- Detail Tabs -->
        <div class="gng-tabs">
            ${_gng.filter.supplierId !== 'pending_all' ? `
                <button class="gng-tab-btn ${_gng.filter.tab === 'approved' ? 'active' : ''}" onclick="_gngSwitchDetailTab('approved')">
                    📋 Bảng Giá Gốc
                </button>
                <button class="gng-tab-btn ${_gng.filter.tab === 'history' ? 'active' : ''}" onclick="_gngSwitchDetailTab('history')">
                    ⏳ Lịch Sử Nhập Hàng
                </button>
            ` : ''}
            <button class="gng-tab-btn ${_gng.filter.tab === 'pending' ? 'active' : ''}" onclick="_gngSwitchDetailTab('pending')">
                ⚠️ Chờ Duyệt Giá ${pendingCount > 0 ? `<span class="gng-tab-badge">${pendingCount}</span>` : ''}
            </button>
        </div>

        <!-- Right Side search/type filter -->
        ${_gng.filter.tab !== 'pending' ? `
            <div class="gng-controls">
                <input type="text" id="gngDetailSearch" class="gng-input" placeholder="🔍 Tìm tên vật tư, màu sắc..." value="${_gng.filter.search}">
                <select id="gngDetailType" class="gng-select" onchange="_gngUpdateDetailFilters()">
                    <option value="" ${_gng.filter.type === '' ? 'selected' : ''}>Loại: Tất cả</option>
                    <option value="fabric" ${_gng.filter.type === 'fabric' ? 'selected' : ''}>🧵 Vải (Fabric)</option>
                    <option value="material" ${_gng.filter.type === 'material' ? 'selected' : ''}>📦 Phụ liệu</option>
                </select>
            </div>
        ` : ''}

        <!-- Tab content container -->
        <div id="gngDetailContentArea"></div>
    `;

    // Bind inputs
    const detailSearch = document.getElementById('gngDetailSearch');
    if (detailSearch) {
        detailSearch.addEventListener('input', function(e) {
            _gng.filter.search = e.target.value;
            _gngSaveState();
            _gngRenderDetailTabContent();
        });
    }

    _gngRenderDetailTabContent();
}

function _gngSwitchDetailTab(tabName) {
    _gng.filter.tab = tabName;
    _gngSaveState();
    _gngRenderDetailPanel();
}

function _gngUpdateDetailFilters() {
    const typeEl = document.getElementById('gngDetailType');
    if (typeEl) _gng.filter.type = typeEl.value;
    _gngSaveState();
    _gngRenderDetailTabContent();
}

function _gngRenderDetailTabContent() {
    const target = document.getElementById('gngDetailContentArea');
    if (!target) return;

    if (_gng.filter.tab === 'approved') {
        _gngRenderDetailApproved(target);
    } else if (_gng.filter.tab === 'history') {
        _gngRenderDetailHistory(target);
    } else if (_gng.filter.tab === 'pending') {
        _gngRenderDetailPending(target);
    }
}

function _gngRenderDetailApproved(target) {
    const q = (_gng.filter.search || '').toLowerCase().trim();
    const filtered = _gng.prices.filter(p => {
        // Supplier filter
        if (_gng.filter.supplierId !== 'all' && p.source_id != _gng.filter.supplierId) return false;
        // Material filter
        if (_gng.filter.supplierId !== 'all' && _gng.filter.materialName) {
            const name = p.item_type === 'fabric' ? p.fabric_material_name : p.item_name;
            if (name !== _gng.filter.materialName) return false;
        }
        // Type filter
        if (_gng.filter.type && p.item_type !== _gng.filter.type) return false;
        // Search filter
        if (q) {
            const matches = (p.item_name || '').toLowerCase().includes(q) ||
                            (p.fabric_material_name || '').toLowerCase().includes(q) ||
                            (p.fabric_color_name || '').toLowerCase().includes(q);
            if (!matches) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        const showInitBtn = _gng.isDuyetUser && _gng.prices.length === 0;
        target.innerHTML = `
            <div class="gng-empty">
                <div class="gng-empty-icon">📂</div>
                <h3>Không tìm thấy giá nhập gốc</h3>
                <p>Nhà cung cấp chưa có giá gốc lưu trữ hoặc không khớp bộ lọc.</p>
                ${showInitBtn ? `
                    <button class="gng-btn-primary" style="margin-top: 15px; padding: 10px 20px; font-weight:700;" onclick="_gngInitializeFromHistory()">
                        ⚡ Khởi tạo nhanh Giá Gốc từ Lịch Sử Nhập Hàng
                    </button>
                ` : ''}
            </div>
        `;
        return;
    }

    const isSingleMaterialMode = (_gng.filter.supplierId !== 'all' && _gng.filter.materialName);
    const isFabricSupplier = _gngIsFabricSupplier(_gng.filter.supplierId);

    if (isSingleMaterialMode) {
        let rowsHtml = '';
        filtered.forEach(p => {
            const formattedPrice = Number(p.price).toLocaleString('vi-VN') + ' đ';
            const formattedDate = _gngFormatDateTime(p.updated_at);
            const isFabric = p.item_type === 'fabric';

            const { cutRatioHtml, finishedPriceHtml } = _gngFormatRatioAndPriceHtml(p);

            rowsHtml += `
                <tr>
                    <td>
                        <span class="gng-badge-type ${isFabric ? 'gng-badge-fabric' : 'gng-badge-material'}">
                            ${isFabric ? '🧵 Vải' : '📦 Phụ liệu'}
                        </span>
                    </td>
                    <td style="font-weight: 600; color: #475569;">
                        ${isFabric ? (p.fabric_material_name || '---') : (p.item_name || '---')}
                    </td>
                    <td style="color: #0f172a; font-weight: 700;">
                        ${isFabric ? `🎨 ${p.fabric_color_name || 'Màu sắc'}` : `🏢 ${p.warehouse_name || '---'}`}
                    </td>
                    <td style="text-align: right; font-weight: 700; color: #059669;">${formattedPrice}</td>
                    ${isFabricSupplier ? `
                        <td style="vertical-align: middle;">${cutRatioHtml}</td>
                        <td style="vertical-align: middle; text-align: right;">${finishedPriceHtml}</td>
                    ` : ''}
                    <td>${formattedDate}</td>
                    <td>
                        <button class="gng-btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="event.stopPropagation(); _gngShowItemHistory('${p.item_type}', ${isFabric ? p.fabric_color_id : p.material_item_id}, ${p.source_id}, '${escapeJS(p.item_name || p.fabric_material_name)}')">
                            📈 Lịch sử
                        </button>
                    </td>
                </tr>
            `;
        });

        target.innerHTML = `
            <div class="gng-table-card">
                <table class="gng-table">
                    <thead>
                        <tr>
                            <th style="width: 80px;">Loại</th>
                            <th>${isFabricSupplier ? 'Chất Liệu' : 'Vật Liệu'}</th>
                            <th>${isFabricSupplier ? 'Màu Sắc' : 'Kho'}</th>
                            <th style="text-align: right;">Đơn Giá Gốc</th>
                            ${isFabricSupplier ? `
                                <th style="text-align: center;">Tỉ Lệ Cắt</th>
                                <th style="text-align: right;">Giá Thành Phẩm</th>
                            ` : ''}
                            <th>Cập Nhật Cuối</th>
                            <th>Hành Động</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
        return;
    }

    // Group items by unique material + supplier combination
    const groupsMap = {};
    let groupIndex = 0;
    filtered.forEach(p => {
        const isFabric = p.item_type === 'fabric';
        const mapKey = isFabric ? `fabric_${p.fabric_material_name}_${p.source_id}` : `material_${p.item_name}_${p.source_id}`;
        if (!groupsMap[mapKey]) {
            groupIndex++;
            groupsMap[mapKey] = {
                key: `gng_group_${groupIndex}`,
                name: isFabric ? p.fabric_material_name : p.item_name,
                item_type: p.item_type,
                source_id: p.source_id,
                source_name: p.source_name,
                items: []
            };
        }
        groupsMap[mapKey].items.push(p);
    });

    const groups = Object.values(groupsMap);
    // Sort groups: fabric first, material second. Within each type, sort alphabetically by name.
    groups.sort((a, b) => {
        const typeOrderA = a.item_type === 'fabric' ? 0 : 1;
        const typeOrderB = b.item_type === 'fabric' ? 0 : 1;
        if (typeOrderA !== typeOrderB) {
            return typeOrderA - typeOrderB;
        }
        return (a.name || '').localeCompare(b.name || '', 'vi');
    });

    let rowsHtml = '';
    groups.forEach(g => {
        const isFabric = g.item_type === 'fabric';
        
        // Calculate price range
        const pricesList = g.items.map(it => Number(it.price) || 0);
        const minPrice = Math.min(...pricesList);
        const maxPrice = Math.max(...pricesList);
        let priceRangeText = '';
        if (minPrice === maxPrice) {
            priceRangeText = minPrice.toLocaleString('vi-VN') + ' đ';
        } else {
            priceRangeText = `<span style="color: #312e81;">${minPrice.toLocaleString('vi-VN')} đ</span> <span style="color: #64748b; font-weight: normal;">-</span> <span style="color: #be123c;">${maxPrice.toLocaleString('vi-VN')} đ</span>`;
        }

        // Get latest update date
        const datesList = g.items.map(it => it.updated_at ? new Date(it.updated_at).getTime() : 0);
        const latestTime = Math.max(...datesList);
        const latestDateText = latestTime > 0 ? _gngFormatDateTime(latestTime) : '---';

        // Render Group Header
        const showExpanded = (q.length > 0);
        const { cutRatioHtml, finishedPriceHtml } = _gngFormatRatioAndPriceRangeHtml(g, minPrice, maxPrice);

        rowsHtml += `
            <tr class="gng-group-header" onclick="_gngToggleGroup('${g.key}')">
                <td>
                    <span class="gng-badge-type ${isFabric ? 'gng-badge-fabric' : 'gng-badge-material'}">
                        ${isFabric ? '🧵 Vải' : '📦 Phụ liệu'}
                    </span>
                </td>
                <td style="font-weight: 700; color: #1e293b;">
                    <span class="gng-group-arrow" id="arrow_${g.key}" style="${showExpanded ? 'transform: rotate(90deg);' : ''}">▶</span>
                    ${_gngCleanMaterialName(g.name)}
                </td>
                <td style="color: #64748b; font-style: italic; font-size:12px;">${_gng.filter.supplierId === 'all' ? '' : '(Nhấp để xem chi tiết)'}</td>
                ${_gng.filter.supplierId === 'all' ? `<td>${_gngGetSupplierBadgeHtml(g.source_name)}</td>` : ''}
                <td style="text-align: right; font-weight: 700; color: #4f46e5;">${priceRangeText}</td>
                ${isFabricSupplier ? `
                    <td style="vertical-align: middle;">${cutRatioHtml}</td>
                    <td style="vertical-align: middle; text-align: right;">${finishedPriceHtml}</td>
                ` : ''}
                <td>${latestDateText}</td>
                <td>
                    <span style="font-size: 11px; color: #64748b; font-weight:600;">Xem ${g.items.length} mục</span>
                </td>
            </tr>
        `;

        // Render Sub-rows
        g.items.forEach(p => {
            const formattedPrice = Number(p.price).toLocaleString('vi-VN') + ' đ';
            const formattedDate = _gngFormatDateTime(p.updated_at);
            const { cutRatioHtml, finishedPriceHtml } = _gngFormatRatioAndPriceHtml(p);
            
            rowsHtml += `
                <tr class="gng-sub-row ${g.key}" style="${showExpanded ? '' : 'display: none;'}">
                    <td></td>
                    <td></td>
                    <td style="color: #0f172a; font-weight: 600;">
                        ${isFabric ? `🎨 ${p.fabric_color_name || 'Màu sắc'}` : `🏢 ${p.warehouse_name || '---'}`}
                    </td>
                    ${_gng.filter.supplierId === 'all' ? `<td></td>` : ''}
                    <td style="text-align: right; font-weight: 700; color: #059669;">${formattedPrice}</td>
                    ${isFabricSupplier ? `
                        <td style="vertical-align: middle;">${cutRatioHtml}</td>
                        <td style="vertical-align: middle; text-align: right;">${finishedPriceHtml}</td>
                    ` : ''}
                    <td>${formattedDate}</td>
                    <td>
                        <button class="gng-btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="event.stopPropagation(); _gngShowItemHistory('${p.item_type}', ${isFabric ? p.fabric_color_id : p.material_item_id}, ${p.source_id}, '${escapeJS(p.item_name || p.fabric_material_name)}')">
                            📈 Lịch sử
                        </button>
                    </td>
                </tr>
            `;
        });
    });

    target.innerHTML = `
        <div class="gng-table-card">
            <table class="gng-table">
                <thead>
                    <tr>
                        <th style="width: 80px;">Loại</th>
                        <th>${_gng.filter.supplierId === 'all' ? 'Tên Chất Liệu / Vật Tư' : (isFabricSupplier ? 'Chất Liệu' : 'Vật Liệu')}</th>
                        <th>${_gng.filter.supplierId === 'all' ? 'Màu Sắc / Vật Liệu' : (isFabricSupplier ? 'Màu Sắc' : 'Kho')}</th>
                        ${_gng.filter.supplierId === 'all' ? '<th>Nhà Cung Cấp</th>' : ''}
                        <th style="text-align: right;">Đơn Giá Gốc</th>
                        ${isFabricSupplier ? `
                            <th style="text-align: center;">Tỉ Lệ Cắt</th>
                            <th style="text-align: right;">Giá Thành Phẩm</th>
                        ` : ''}
                        <th>Cập Nhật Cuối</th>
                        <th>Hành Động</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    `;
}

function _gngRenderDetailHistory(target) {
    const q = (_gng.filter.search || '').toLowerCase().trim();
    const filtered = _gng.history.filter(h => {
        // Supplier filter
        if (_gng.filter.supplierId !== 'all' && h.source_id != _gng.filter.supplierId) return false;
        // Material filter
        if (_gng.filter.supplierId !== 'all' && _gng.filter.materialName) {
            const name = h.material_name;
            if (name !== _gng.filter.materialName) return false;
        }
        // Type filter
        if (_gng.filter.type && h.item_type !== _gng.filter.type) return false;
        // Search filter
        if (q) {
            const matches = (h.material_name || '').toLowerCase().includes(q) ||
                            (h.color_name || '').toLowerCase().includes(q);
            if (!matches) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        target.innerHTML = `
            <div class="gng-empty">
                <div class="gng-empty-icon">⏳</div>
                <h3>Chưa có lịch sử nhập hàng</h3>
                <p>Nhà cung cấp chưa có hóa đơn hoàn thành trong lịch sử.</p>
            </div>
        `;
        return;
    }

    // Group by unique (item_type, item_id, source_id)
    const groupsMap = {};
    filtered.forEach(h => {
        const itemId = h.item_type === 'fabric' ? h.fabric_color_id : h.material_item_id;
        const key = `${h.item_type}_${itemId}_${h.source_id}`;
        if (!groupsMap[key]) {
            groupsMap[key] = [];
        }
        groupsMap[key].push(h);
    });

    // Extract latest and sort descending
    const groupedList = Object.values(groupsMap).map(group => {
        const sortedGroup = [...group].sort((a, b) => {
            const dateA = new Date(a.import_date || 0);
            const dateB = new Date(b.import_date || 0);
            if (dateB - dateA !== 0) return dateB - dateA;
            return b.import_id - a.import_id;
        });
        return {
            latest: sortedGroup[0],
            records: sortedGroup
        };
    });

    // Sort grouped list: fabric first, material second. Within type, sort alphabetically.
    groupedList.sort((a, b) => {
        const typeOrderA = a.latest.item_type === 'fabric' ? 0 : 1;
        const typeOrderB = b.latest.item_type === 'fabric' ? 0 : 1;
        if (typeOrderA !== typeOrderB) {
            return typeOrderA - typeOrderB;
        }
        const nameA = a.latest.material_name || '';
        const nameB = b.latest.material_name || '';
        const comp = nameA.localeCompare(nameB, 'vi');
        if (comp !== 0) return comp;
        const colorA = a.latest.color_name || '';
        const colorB = b.latest.color_name || '';
        return colorA.localeCompare(colorB, 'vi');
    });

    const isSingleMaterialMode = (_gng.filter.supplierId !== 'all' && _gng.filter.materialName);

    let rowsHtml = '';
    groupedList.forEach(g => {
        const h = g.latest;
        const formattedPrice = Number(h.unit_price).toLocaleString('vi-VN') + ' đ';
        const formattedDate = h.import_date ? new Date(h.import_date).toLocaleDateString('vi-VN') : '---';
        const isFabric = h.item_type === 'fabric';
        const itemId = isFabric ? h.fabric_color_id : h.material_item_id;

        rowsHtml += `
            <tr style="cursor: pointer;" onclick="_gngShowItemHistory('${h.item_type}', ${itemId}, ${h.source_id}, '${escapeJS(h.material_name)}')">
                <td>
                    <span class="gng-badge-type ${isFabric ? 'gng-badge-fabric' : 'gng-badge-material'}">
                        ${isFabric ? '🧵 Vải' : '📦 Phụ liệu'}
                    </span>
                </td>
                <td style="font-weight: 700; color: #1e293b;">
                    ${_gngCleanMaterialName(h.material_name || 'Chất liệu')}
                </td>
                <td>
                    ${isFabric ? (h.color_name || '---') : '---'}
                </td>
                ${_gng.filter.supplierId === 'all' ? `<td>${_gngGetSupplierBadgeHtml(h.source_name)}</td>` : ''}
                <td style="text-align: right; font-weight: 700; color: #4f46e5;">${formattedPrice}</td>
                <td>${formattedDate}</td>
                <td>
                    <button class="gng-btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="event.stopPropagation(); _gngShowItemHistory('${h.item_type}', ${itemId}, ${h.source_id}, '${escapeJS(h.material_name)}')">
                        📈 Lịch sử (${g.records.length})
                    </button>
                </td>
            </tr>
        `;
    });

    target.innerHTML = `
        <div class="gng-table-card">
            <table class="gng-table">
                <thead>
                    <tr>
                        <th style="width: 80px;">Loại</th>
                        <th>Chất Liệu / Vật Liệu</th>
                        <th>Màu Sắc</th>
                        ${_gng.filter.supplierId === 'all' ? '<th>Nhà Cung Cấp</th>' : ''}
                        <th style="text-align: right;">Đơn Giá Nhập Gần Nhất</th>
                        <th>Ngày Nhập Gần Nhất</th>
                        <th>Hành Động</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    `;
}

function _gngRenderDetailPending(target) {
    const filtered = _gng.pending.filter(rec => 
        _gng.filter.supplierId === 'all' || 
        _gng.filter.supplierId === 'pending_all' || 
        rec.source_id == _gng.filter.supplierId
    );

    let cardsHtml = '';
    filtered.forEach(rec => {
        const isFabric = rec.record_type === 'fabric';
        const formattedDate = rec.import_date ? new Date(rec.import_date).toLocaleDateString('vi-VN') : '---';
        const totalCostStr = Number(rec.total_amount || rec.cost).toLocaleString('vi-VN') + ' đ';

        let discList = rec.discrepancies || [];
        if (discList.length === 0) return;

        let discrepanciesHtml = '';
        discList.forEach(d => {
            const unitPriceStr = Number(d.unit_price).toLocaleString('vi-VN') + ' đ';
            const approvedPriceStr = d.approved_price !== null 
                ? Number(d.approved_price).toLocaleString('vi-VN') + ' đ' 
                : 'Lần đầu nhập (Mới)';
            
            let diffHtml = '';
            if (d.approved_price !== null) {
                if (d.difference > 0) {
                    diffHtml = `<span style="color:#ef4444; font-weight:700;">📈 Tăng +${d.difference.toLocaleString('vi-VN')} đ</span>`;
                } else if (d.difference < 0) {
                    diffHtml = `<span style="color:#10b981; font-weight:700;">📉 Giảm ${d.difference.toLocaleString('vi-VN')} đ</span>`;
                } else {
                    diffHtml = `<span style="color:#64748b;">Khớp</span>`;
                }
            } else {
                diffHtml = `<span style="color:#3b82f6; font-weight:700;">✨ Giá mới</span>`;
            }

            discrepanciesHtml += `
                <tr>
                    <td style="font-weight:600;">${d.item_name}</td>
                    <td style="color:#ef4444; font-weight:700;">${unitPriceStr}</td>
                    <td style="color:#64748b;">${approvedPriceStr}</td>
                    <td>${diffHtml}</td>
                </tr>
            `;
        });

        cardsHtml += `
            <div class="gng-pending-card">
                <div class="gng-pending-header">
                    <div>
                        <div class="gng-pending-title">
                            <span class="gng-badge-type ${isFabric ? 'gng-badge-fabric' : 'gng-badge-material'}">
                                ${isFabric ? '🧵 Vải' : '📦 Phụ liệu'}
                            </span>
                            Hóa đơn #${rec.fabric_import_code || rec.id}
                        </div>
                        <div class="gng-pending-meta">
                            <span>🏢 Nhà cung cấp: <b>${rec.source_name || '---'}</b></span>
                            <span>👤 Người nhập: <b>${rec.importer_name || '---'}</b></span>
                            <span>📅 Ngày nhập: <b>${formattedDate}</b></span>
                            <span>💰 Giá trị bill: <b>${totalCostStr}</b></span>
                        </div>
                    </div>
                    <div class="gng-pending-actions">
                        ${_gng.isDuyetUser ? `
                            <button class="gng-btn-approve" onclick="_gngShowApprovalDialog(${rec.id})" style="background: linear-gradient(135deg, #4f46e5, #6366f1); color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 13px; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.15); transition: transform 0.15s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='none'">
                                🔍 Xem Chi Tiết & Duyệt Giá
                            </button>
                        ` : '<span style="color:#ef4444; font-weight:600; font-size:12px;">⏳ Đang chờ Giám đốc duyệt giá</span>'}
                    </div>
                </div>
                <div>
                    <h5 style="margin: 0 0 6px 0; color:#475569; font-size:12px; font-weight:700;">CHI TIẾT LỆCH GIÁ:</h5>
                    <table class="gng-disc-table">
                        <thead>
                            <tr>
                                <th>Tên Vật Tư / Chất Liệu</th>
                                <th>Giá Trên Bill</th>
                                <th>Giá Gốc Cũ</th>
                                <th>Chênh Lệch</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${discrepanciesHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });

    if (cardsHtml === '') {
        target.innerHTML = `
            <div class="gng-empty">
                <div class="gng-empty-icon">✅</div>
                <h3>Không có hóa đơn lệch giá</h3>
                <p>Tất cả hóa đơn nhập hàng của nhà cung cấp này đều khớp giá gốc.</p>
            </div>
        `;
        return;
    }

    target.innerHTML = `<div class="gng-pending-list">${cardsHtml}</div>`;
}

function _gngFormatFullDateTime(importDate, createdAt) {
    var dObj = null;
    var hasTime = false;
    if (createdAt) {
        dObj = new Date(createdAt);
        hasTime = true;
    } else if (importDate) {
        dObj = new Date(importDate);
        hasTime = true;
    }
    if (!dObj || isNaN(dObj.getTime())) return '—';

    var utc = dObj.getTime() + (dObj.getTimezoneOffset() * 60000);
    var vnTime = new Date(utc + (3600000 * 7));

    var day = vnTime.getDate();
    var month = vnTime.getMonth() + 1;
    var year2D = String(vnTime.getFullYear()).slice(-2);
    var days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    var dayOfWeekStr = days[vnTime.getDay()];

    if (hasTime) {
        var hh = String(vnTime.getHours()).padStart(2, '0');
        var mi = String(vnTime.getMinutes()).padStart(2, '0');
        return hh + ':' + mi + ' - ' + dayOfWeekStr + ' - ' + day + '/' + month + '/' + year2D;
    } else {
        return dayOfWeekStr + ' - ' + day + '/' + month + '/' + year2D;
    }
}

function _gngViewImage(src) {
    if (!src) return;
    var ov = document.createElement('div');
    ov.id = '_gngImgOv';
    ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.8);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity 0.2s ease-out;';
    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = 'position:absolute;top:20px;right:20px;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);color:#fff;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s ease;box-shadow:0 4px 12px rgba(0,0,0,0.3);outline:none;z-index:1000000;';
    closeBtn.onmouseover = function() {
        closeBtn.style.background = 'rgba(255,255,255,0.3)';
        closeBtn.style.transform = 'scale(1.1) rotate(90deg)';
    };
    closeBtn.onmouseout = function() {
        closeBtn.style.background = 'rgba(255,255,255,0.15)';
        closeBtn.style.transform = 'scale(1) rotate(0deg)';
    };
    var img = document.createElement('img');
    img.src = src;
    img.style.cssText = 'max-width:90%;max-height:90%;object-fit:contain;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.6);border:3px solid rgba(255,255,255,0.95);transform:scale(0.95);transition:transform 0.2s cubic-bezier(0.34,1.56,0.64,1);';
    ov.appendChild(closeBtn);
    ov.appendChild(img);
    var close = function() {
        ov.style.opacity = '0';
        img.style.transform = 'scale(0.95)';
        document.removeEventListener('keydown', escClose);
        setTimeout(function() { 
            ov.remove(); 
        }, 200);
    };
    var escClose = function(e) { if (e.key === 'Escape') close(); };
    ov.onclick = close;
    closeBtn.onclick = function(e) { e.stopPropagation(); close(); };
    img.onclick = function(e) { e.stopPropagation(); };
    document.addEventListener('keydown', escClose);
    document.body.appendChild(ov);
    requestAnimationFrame(function() {
        ov.style.opacity = '1';
        img.style.transform = 'scale(1)';
    });
}

function _gngOpenImportBill(importId) {
    var runDetail = async function() {
        var checkInterval = setInterval(function() {
            var detailOv = document.getElementById('_fabDetailOv');
            if (detailOv) {
                detailOv.style.zIndex = '100000';
            }
        }, 30);
        
        try {
            await _bnhFabDetail(importId);
        } catch (e) {
            console.error(e);
        }
        
        clearInterval(checkInterval);
        var detailOv = document.getElementById('_fabDetailOv');
        if (detailOv) {
            detailOv.style.zIndex = '100000';
        }
    };

    if (typeof _bnhFabDetail === 'function') {
        runDetail();
    } else {
        var s = document.createElement('script');
        s.src = '/js/pages/fab-import-v4.js?v=20260630_vdecimal_v3';
        s.onload = runDetail;
        document.head.appendChild(s);
    }
}
window._gngOpenImportBill = _gngOpenImportBill;

function _gngOpenHistoryBill(itemType, importId) {
    var runDetail = async function() {
        var overlayId = itemType === 'fabric' ? '_fabDetailOv' : '_bvlDetailOv';
        var checkInterval = setInterval(function() {
            var detailOv = document.getElementById(overlayId);
            if (detailOv) {
                detailOv.style.zIndex = '100000';
            }
        }, 30);
        
        try {
            if (itemType === 'fabric') {
                await _bnhFabDetail(importId);
            } else {
                await _bvlDetail(importId);
            }
        } catch (e) {
            console.error(e);
        }
        
        clearInterval(checkInterval);
        var detailOv = document.getElementById(overlayId);
        if (detailOv) {
            detailOv.style.zIndex = '100000';
        }
    };

    if (itemType === 'fabric') {
        if (typeof _bnhFabDetail === 'function') {
            runDetail();
        } else {
            var s = document.createElement('script');
            s.src = '/js/pages/fab-import-v4.js?v=20260630_edit_v4';
            s.onload = runDetail;
            document.head.appendChild(s);
        }
    } else {
        if (typeof _bvlDetail === 'function') {
            runDetail();
        } else {
            var s = document.createElement('script');
            s.src = '/js/pages/billvatlieu.js?v=20260701_price_edit_validation_v1';
            s.onload = runDetail;
            document.head.appendChild(s);
        }
    }
}
window._gngOpenHistoryBill = _gngOpenHistoryBill;

function _gngSelectStatCard(mode) {
    if (mode === 'approved') {
        _gng.filter.supplierId = 'all';
        _gng.filter.tab = 'approved';
        _gng.filter.materialName = null;
    } else if (mode === 'pending') {
        _gng.filter.supplierId = 'pending_all';
        _gng.filter.tab = 'pending';
        _gng.filter.materialName = null;
    }
    _gngSaveState();
    _gngRenderLayout();
}
window._gngSelectStatCard = _gngSelectStatCard;

function _gngShowConfirmPopup(title, message, type, onConfirm) {
    const overlay = document.createElement('div');
    overlay.id = 'gngConfirmPopup';
    overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(15, 23, 42, 0.7);
        backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 1000000;
        opacity: 0; transition: opacity 0.2s ease;
    `;
    
    let accentColor = '#3b82f6';
    let icon = '❓';
    if (type === 'approve_once') {
        accentColor = '#3b82f6';
        icon = '🔹';
    } else if (type === 'approve_update') {
        accentColor = '#10b981';
        icon = '✅';
    } else if (type === 'disapprove') {
        accentColor = '#ef4444';
        icon = '❌';
    }
    
    overlay.innerHTML = `
        <div style="background:#fff; border-radius:16px; width:440px; max-width:90%; box-shadow: 0 20px 40px rgba(0,0,0,0.3); overflow:hidden; border: 1px solid #cbd5e1; transform: scale(0.9); transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);">
            <div style="background: linear-gradient(135deg, ${accentColor}, ${accentColor}dd); color:#fff; padding:18px 24px; font-weight:800; font-size:16px; display:flex; align-items:center; gap:10px;">
                <span>${icon}</span> ${title}
            </div>
            <div style="padding:24px; font-size:14px; color:#334155; line-height:1.6; text-align:left; white-space:pre-line;">
                ${message}
            </div>
            <div style="background:#f8fafc; padding:16px 24px; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:10px;">
                <button id="gngConfirmCancel" style="background:#e2e8f0; color:#475569; border:none; padding:10px 18px; border-radius:8px; font-weight:700; font-size:13px; cursor:pointer; transition: background-color 0.15s;" onmouseover="this.style.backgroundColor='#cbd5e1'" onmouseout="this.style.backgroundColor='#e2e8f0'">
                    Hủy bỏ
                </button>
                <button id="gngConfirmOk" style="background:${accentColor}; color:#fff; border:none; padding:10px 20px; border-radius:8px; font-weight:800; font-size:13px; cursor:pointer; box-shadow:0 4px 10px rgba(0,0,0,0.15); transition: opacity 0.15s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                    Đồng ý
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    
    const popup = overlay.firstElementChild;
    setTimeout(() => {
        overlay.style.opacity = '1';
        popup.style.transform = 'scale(1)';
    }, 10);
    
    const closePopup = () => {
        overlay.style.opacity = '0';
        popup.style.transform = 'scale(0.9)';
        setTimeout(() => {
            overlay.remove();
        }, 200);
    };
    
    overlay.querySelector('#gngConfirmCancel').onclick = closePopup;
    overlay.querySelector('#gngConfirmOk').onclick = () => {
        closePopup();
        onConfirm();
    };
    
    overlay.onclick = (e) => { if (e.target === overlay) closePopup(); };
    const keyHandler = (e) => { if (e.key === 'Escape') closePopup(); };
    document.addEventListener('keydown', keyHandler);
    
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.removedNodes.forEach((node) => {
                if (node === overlay) {
                    document.removeEventListener('keydown', keyHandler);
                    observer.disconnect();
                }
            });
        });
    });
    observer.observe(document.body, { childList: true });
}

async function _gngShowApprovalDialog(id) {
    const rec = _gng.pending.find(r => r.id == id);
    if (!rec) return;

    let modal = document.getElementById('gngApprovalModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'gngApprovalModal';
        modal.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.65);
            backdrop-filter: blur(6px);
            display: flex; align-items: center; justify-content: center;
            z-index: 99999;
            opacity: 0; transition: opacity 0.2s ease-out;
        `;
        document.body.appendChild(modal);
    }

    const isFabric = rec.record_type === 'fabric';
    const formattedDate = _gngFormatFullDateTime(rec.import_date, rec.created_at);
    const totalCostStr = Number(rec.total_amount || rec.cost).toLocaleString('vi-VN') + ' đ';

    let discrepanciesHtml = '';
    const discList = rec.discrepancies || [];
    discList.forEach(d => {
        const unitPriceStr = Number(d.unit_price).toLocaleString('vi-VN') + ' đ';
        const approvedPriceStr = d.approved_price !== null 
            ? Number(d.approved_price).toLocaleString('vi-VN') + ' đ' 
            : 'Mới';
        
        let diffHtml = '';
        if (d.approved_price !== null) {
            if (d.difference > 0) {
                diffHtml = `<span style="color:#ef4444; font-weight:700;" class="gng-blink">📈 +${d.difference.toLocaleString('vi-VN')} đ</span>`;
            } else if (d.difference < 0) {
                diffHtml = `<span style="color:#10b981; font-weight:700;">📉 ${d.difference.toLocaleString('vi-VN')} đ</span>`;
            } else {
                diffHtml = `<span style="color:#64748b;">Khớp</span>`;
            }
        } else {
            diffHtml = `<span style="color:#3b82f6; font-weight:700;">✨ Giá mới</span>`;
        }

        let qtyText = '';
        if (d.record_type === 'fabric') {
            qtyText = `<span style="font-weight:700; color:#4f46e5;">${d.roll_count} cây</span> / <span style="font-weight:700; color:#7c3aed;">${Number(d.quantity).toLocaleString('vi-VN')} kg</span>`;
        } else {
            qtyText = `<span style="font-weight:700; color:#1e293b;">${Number(d.quantity).toLocaleString('vi-VN')} ${d.unit || ''}</span>`;
        }
        discrepanciesHtml += `
            <tr>
                <td style="font-weight:600; padding:12px 14px; border-bottom:1px solid #e2e8f0; font-size:13px; text-align:left; color:#1e293b;">${d.item_name}</td>
                <td style="padding:12px 14px; border-bottom:1px solid #e2e8f0; font-size:13px; text-align:center; white-space:nowrap;">${qtyText}</td>
                <td style="color:#ef4444; font-weight:700; padding:12px 14px; border-bottom:1px solid #e2e8f0; font-size:13px; text-align:right; white-space:nowrap;">${unitPriceStr}</td>
                <td style="color:#64748b; padding:12px 14px; border-bottom:1px solid #e2e8f0; font-size:13px; text-align:right; white-space:nowrap;">${approvedPriceStr}</td>
                <td style="padding:12px 14px; border-bottom:1px solid #e2e8f0; font-size:13px; text-align:center; white-space:nowrap;">${diffHtml}</td>
                <td style="padding:12px 14px; border-bottom:1px solid #e2e8f0; font-size:13px; text-align:center;">
                    <input type="checkbox" class="gng-row-checkbox" data-id="${d.fabric_color_id || d.material_item_id || ''}" style="cursor:pointer; width:16px; height:16px;" checked>
                </td>
            </tr>
        `;
    });

    let imgHtml = '';
    if (rec.bill_image_url) {
        imgHtml = `
            <div style="flex: 0.9; min-width: 280px; display:flex; flex-direction:column; gap:8px;">
                <div style="font-weight:700; color:#475569; font-size:12px; letter-spacing:0.5px;">📸 ẢNH HÓA ĐƠN GỐC:</div>
                <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow:hidden; background:#f8fafc; display:flex; align-items:center; justify-content:center; position:relative; cursor:zoom-in; height:320px; transition:border-color 0.15s;" onclick="_gngViewImage('${rec.bill_image_url}')" title="Bấm để xem ảnh gốc kích thước đầy đủ" onmouseover="this.style.borderColor='#cbd5e1'" onmouseout="this.style.borderColor='#e2e8f0'">
                    <img src="${rec.bill_image_url}" style="max-width:100%; max-height:100%; object-fit:contain;">
                    <div style="position:absolute; bottom:12px; right:12px; background:rgba(15, 23, 42, 0.75); color:#fff; font-size:11px; padding:4px 10px; border-radius:6px; font-weight:600;">🔍 Xem ảnh gốc</div>
                </div>
            </div>
        `;
    } else {
        imgHtml = `
            <div style="flex: 0.9; min-width: 280px; display:flex; flex-direction:column; gap:8px; align-items:center; justify-content:center; border: 2px dashed #cbd5e1; border-radius:12px; height:320px; background:#f8fafc;">
                <span style="font-size:36px; margin-bottom:8px;">🖼️</span>
                <span style="color:#94a3b8; font-weight:700; font-size:13px;">Không có ảnh hóa đơn</span>
            </div>
        `;
    }

    modal.innerHTML = `
        <div style="background: #ffffff; border-radius: 16px; width: 95%; max-width: 1100px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); display: flex; flex-direction: column; overflow: hidden; transform: scale(0.95); transition: transform 0.2s ease-out; border: 1px solid #cbd5e1;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0f172a, #1e293b); color:#fff; padding: 18px 24px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1e293b;">
                <h3 style="margin:0; font-size:16px; font-weight:800; display:flex; align-items:center; gap:10px; letter-spacing:0.3px; color:#fff !important;">
                    <span style="background: #ef4444; color:#fff; padding: 3px 8px; border-radius:6px; font-size:11px; font-weight:800; letter-spacing:0.5px;" class="gng-blink">
                        ⚠️ LỆCH GIÁ NHẬP
                    </span>
                    DUYỆT GIÁ HOÁ ĐƠN #${rec.fabric_import_code || rec.id}
                    ${rec.record_type === 'fabric' ? `<a href="javascript:void(0)" onclick="_gngOpenImportBill(${rec.id})" style="color:#a78bfa; font-size:12px; font-weight:800; text-decoration:none; margin-left:15px; border:1px solid #a78bfa; padding:4px 10px; border-radius:6px; background:rgba(167,139,250,0.1); transition:all 0.15s; display:inline-flex; align-items:center; gap:4px;" onmouseover="this.style.background='rgba(167,139,250,0.2)'" onmouseout="this.style.background='rgba(167,139,250,0.1)'">🧵 Xem Bill Vải</a>` : ''}
                </h3>
                <button onclick="_gngCloseApprovalDialog()" style="background:none; border:none; color:#94a3b8; font-size:26px; cursor:pointer; font-weight:300; transition:color 0.15s;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#94a3b8'">&times;</button>
            </div>

            <!-- Body -->
            <div style="padding: 24px; overflow-y:auto; max-height: calc(85vh - 120px); display:flex; flex-wrap:wrap; gap:24px;">
                <!-- Left: Bill Details -->
                <div style="flex: 1.6; min-width: 380px; display:flex; flex-direction:column; gap:18px;">
                    <!-- Meta Grid -->
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; background:#f8fafc; padding:16px; border-radius:12px; border:1px solid #e2e8f0;">
                        <div>
                            <div style="font-size:11px; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px;">🏪 Nhà cung cấp</div>
                            <div style="font-weight:800; color:#1e293b; font-size:14px;">${rec.source_name || '---'}</div>
                        </div>
                        <div>
                            <div style="font-size:11px; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px;">👤 Người nhập</div>
                            <div style="font-weight:800; color:#1e293b; font-size:14px;">${rec.importer_name || '---'}</div>
                        </div>
                        <div>
                            <div style="font-size:11px; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px;">📅 Ngày nhập</div>
                            <div style="font-weight:800; color:#1e293b; font-size:14px;">${formattedDate}</div>
                        </div>
                        <div>
                            <div style="font-size:11px; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px;">💰 Tổng tiền bill</div>
                            <div style="font-weight:900; color:#4f46e5; font-size:14px;">${totalCostStr}</div>
                        </div>
                    </div>

                    <!-- Items Table -->
                    <div>
                        <div style="font-weight:700; color:#475569; font-size:12px; margin-bottom:8px; letter-spacing:0.5px;">📋 BẢNG SO SÁNH GIÁ CHI TIẾT:</div>
                        <div style="border:1px solid #cbd5e1; border-radius:10px; overflow-x:auto; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                            <table style="width:100%; border-collapse:collapse; margin:0; background:#fff;">
                                <thead>
                                    <tr style="background:#1e293b; border-bottom:1px solid #334155;">
                                        <th style="padding:10px 8px; font-weight:800; color:#ffffff !important; font-size:11px; text-transform:uppercase; text-align:left; letter-spacing:0.5px; white-space:nowrap;">Tên Vật Tư / Chất Liệu</th>
                                        <th style="padding:10px 8px; font-weight:800; color:#ffffff !important; font-size:11px; text-transform:uppercase; text-align:center; letter-spacing:0.5px; white-space:nowrap;">Số Lượng</th>
                                        <th style="padding:10px 8px; font-weight:800; color:#ffffff !important; font-size:11px; text-transform:uppercase; text-align:right; width:85px; letter-spacing:0.5px; white-space:nowrap;">Giá Bill</th>
                                        <th style="padding:10px 8px; font-weight:800; color:#ffffff !important; font-size:11px; text-transform:uppercase; text-align:right; width:85px; letter-spacing:0.5px; white-space:nowrap;">Giá Gốc Cũ</th>
                                        <th style="padding:10px 8px; font-weight:800; color:#ffffff !important; font-size:11px; text-transform:uppercase; text-align:center; width:90px; letter-spacing:0.5px; white-space:nowrap;">Chênh Lệch</th>
                                        <th style="padding:10px 8px; font-weight:800; color:#ffffff !important; font-size:11px; text-transform:uppercase; text-align:center; width:80px; letter-spacing:0.5px; white-space:nowrap;">Giá Gốc Mới?<br><input type="checkbox" id="gngSelectAll" style="cursor:pointer; margin-top:4px; vertical-align:middle;" checked onclick="_gngToggleAllCheckboxes(this)"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${discrepanciesHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Right: Image -->
                ${imgHtml}
            </div>

            <!-- Footer -->
            <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; display:flex; justify-content:flex-end; align-items:center; gap:12px; flex-wrap:wrap;">
                <button onclick="_gngConfirmChoice(${rec.id}, 'disapprove')" style="background-color:#ef4444; color:#fff; border:none; padding:10px 18px; border-radius:8px; cursor:pointer; font-weight:700; font-size:13px; transition:background-color 0.15s; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 4px rgba(239,68,68,0.2);" onmouseover="this.style.backgroundColor='#dc2626'" onmouseout="this.style.backgroundColor='#ef4444'">
                    ❌ Không Duyệt (Sửa Bill)
                </button>
                <button onclick="_gngConfirmChoice(${rec.id}, 'approve_once')" style="background-color:#3b82f6; color:#fff; border:none; padding:10px 18px; border-radius:8px; cursor:pointer; font-weight:700; font-size:13px; transition:background-color 0.15s; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 4px rgba(59,130,246,0.2);" onmouseover="this.style.backgroundColor='#2563eb'" onmouseout="this.style.backgroundColor='#3b82f6'">
                    🔹 Duyệt riêng bill này
                </button>
                <button onclick="_gngConfirmChoice(${rec.id}, 'approve_update')" style="background-color:#10b981; color:#fff; border:none; padding:10px 18px; border-radius:8px; cursor:pointer; font-weight:700; font-size:13px; transition:background-color 0.15s; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 4px rgba(16,185,129,0.2);" onmouseover="this.style.backgroundColor='#059669'" onmouseout="this.style.backgroundColor='#10b981'">
                    ✅ Cập nhật làm Giá Gốc
                </button>
                <button onclick="_gngCloseApprovalDialog()" style="background-color:#e2e8f0; color:#475569; border:none; padding:10px 18px; border-radius:8px; cursor:pointer; font-weight:700; font-size:13px; transition:background-color 0.15s;" onmouseover="this.style.backgroundColor='#cbd5e1'" onmouseout="this.style.backgroundColor='#e2e8f0'">
                    Đóng
                </button>
            </div>
        </div>
    `;

    setTimeout(() => {
        modal.style.opacity = '1';
        modal.firstElementChild.style.transform = 'scale(1)';
    }, 10);
}

function _gngCloseApprovalDialog() {
    const modal = document.getElementById('gngApprovalModal');
    if (!modal) return;
    modal.style.opacity = '0';
    modal.firstElementChild.style.transform = 'scale(0.95)';
    setTimeout(() => {
        if (modal.parentNode) modal.parentNode.removeChild(modal);
    }, 200);
}

async function _gngConfirmChoice(id, choice) {
    const rec = _gng.pending.find(r => r.id == id);
    if (!rec) return;

    let confirmTitle = '';
    let confirmMsg = '';
    let payload = {};
    const code = rec.fabric_import_code || rec.id;

    if (choice === 'approve_once') {
        confirmTitle = 'Duyệt Riêng Đơn Giá';
        confirmMsg = `Bạn có chắc chắn muốn DUYỆT RIÊNG đơn giá của bill #${code}?\n\n- Chỉ duyệt đơn giá của hóa đơn này để hoạt động (cho phép xuất kho/giao đơn).\n- Bảng giá gốc cũ vẫn được giữ nguyên.`;
        payload = { action: 'check', price_only: true, update_base_price: false };
    } else if (choice === 'approve_update') {
        confirmTitle = 'Duyệt & Cập Nhật Giá Gốc';
        confirmMsg = `Bạn có chắc chắn muốn DUYỆT & CẬP NHẬT GIÁ GỐC mới từ bill #${code}?\n\n- Duyệt đơn giá của hóa đơn này để hoạt động (cho phép xuất kho/giao đơn).\n- Giá trên bill này sẽ được lưu làm giá gốc mới cho các lần nhập sau.`;
        const checkedIds = [];
        const checkboxes = document.querySelectorAll('.gng-row-checkbox');
        checkboxes.forEach(cb => {
            if (cb.checked) {
                const val = Number(cb.getAttribute('data-id'));
                if (val) checkedIds.push(val);
            }
        });
        payload = { action: 'check', price_only: true, update_base_price: true, update_item_ids: checkedIds };
    } else if (choice === 'disapprove') {
        confirmTitle = 'Từ Chối Đơn Giá';
        confirmMsg = `Bạn có chắc chắn muốn TỪ CHỐI đơn giá của bill #${code}?\n\n- Từ chối đơn giá nhập của hóa đơn này.\n- Yêu cầu kế toán sửa lại thông tin/đơn giá bill này.`;
        payload = { action: 'disapprove', price_only: true };
    }

    _gngShowConfirmPopup(confirmTitle, confirmMsg, choice, async () => {
        _gngCloseApprovalDialog();

        try {
            const res = await apiCall('/api/import/toggle/' + id, 'POST', payload);
            if (res.success) {
                let toastMsg = '';
                if (choice === 'approve_once') toastMsg = `Đã duyệt riêng đơn giá của hóa đơn #${code}`;
                if (choice === 'approve_update') toastMsg = `Đã duyệt đơn giá và cập nhật giá gốc mới cho hóa đơn #${code}`;
                if (choice === 'disapprove') toastMsg = `Đã từ chối đơn giá của hóa đơn #${code}`;
                
                if (typeof showToast === 'function') showToast(toastMsg, 'success');
                await _gngLoadData();
            } else {
                throw new Error(res.error || 'Thao tác thất bại');
            }
        } catch (e) {
            if (typeof showToast === 'function') showToast(e.message, 'error');
        }
    });
}

window._gngToggleAllCheckboxes = function(master) {
    const checkboxes = document.querySelectorAll('.gng-row-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = master.checked;
    });
};

function _gngShowItemHistory(itemType, itemId, sourceId, itemName) {
    const filtered = _gng.history.filter(h => 
        h.item_type === itemType && 
        (itemType === 'fabric' ? h.fabric_color_id === itemId : h.material_item_id === itemId) &&
        h.source_id === sourceId
    );

    const sorted = [...filtered].sort((a, b) => {
        const dateA = new Date(a.created_at || a.import_date || 0);
        const dateB = new Date(b.created_at || b.import_date || 0);
        if (dateB - dateA !== 0) return dateB - dateA;
        return b.import_id - a.import_id;
    });

    let modalRowsHtml = '';
    sorted.forEach(h => {
        let statusText = 'Khớp giá';
        let badgeClass = 'gng-badge-stable';
        if (!h.price_approved_at && h.requires_price_approval) {
            if (h.is_disapproved) {
                statusText = '❌ Từ chối duyệt';
                badgeClass = 'gng-badge-alert';
            } else {
                statusText = '⚠️ Chờ duyệt';
                badgeClass = 'gng-badge-warning';
            }
        }
        
        const dateStr = _gngFormatDateTime(h.created_at || h.import_date);

        modalRowsHtml += `
            <tr>
                <td>${dateStr}</td>
                <td style="text-align:center;">
                    <a href="javascript:void(0)" onclick="_gngOpenHistoryBill('${h.item_type}', ${h.import_id})" style="color:#2563eb;text-decoration:underline;font-weight:800;font-size:12px;">Xem bill</a>
                </td>
                <td style="font-weight:700; text-align:right;">${Number(h.unit_price).toLocaleString('vi-VN')} đ</td>
                <td>
                    <span class="gng-badge ${badgeClass}">
                        ${statusText}
                    </span>
                </td>
            </tr>
        `;
    });

    const modalHtml = `
        <div class="gng-modal-backdrop" id="gngHistoryModal">
            <div class="gng-modal-card">
                <div class="gng-modal-header">
                    <h3>📈 Lịch Sử Biến Động Đơn Giá</h3>
                    <button class="gng-modal-close" onclick="_gngCloseModal('gngHistoryModal')">&times;</button>
                </div>
                <div class="gng-modal-body">
                    <div style="margin-bottom:12px; font-size:13px; color:#475569;">
                        Vật tư: <b style="color:#0f172a;">${_gngCleanMaterialName(itemName)}</b><br>
                        Nhà cung cấp: <b style="color:#0f172a;">${filtered[0]?.source_name || '---'}</b>
                    </div>
                    <table class="gng-disc-table" style="width:100%;">
                        <thead>
                            <tr style="background:#f1f5f9;">
                                <th style="color:#475569; background:#f1f5f9;">Ngày nhập</th>
                                <th style="color:#475569; background:#f1f5f9; text-align:center;">Bill</th>
                                <th style="color:#475569; background:#f1f5f9; text-align:right;">Đơn giá</th>
                                <th style="color:#475569; background:#f1f5f9;">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${modalRowsHtml || '<tr><td colspan="4" style="text-align:center; padding:16px;">Không có dữ liệu lịch sử</td></tr>'}
                        </tbody>
                    </table>
                </div>
                <div class="gng-modal-footer">
                    <button class="gng-btn-secondary" onclick="_gngCloseModal('gngHistoryModal')">Đóng</button>
                </div>
            </div>
        </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.id = 'gngHistoryModalWrapper';
    wrapper.innerHTML = modalHtml;
    document.body.appendChild(wrapper);
}

function _gngOpenEditPriceModal(itemType, itemId, sourceId, currentPrice, itemName) {
    const modalHtml = `
        <div class="gng-modal-backdrop" id="gngEditPriceModal">
            <div class="gng-modal-card" style="max-width: 400px;">
                <div class="gng-modal-header">
                    <h3>✏️ Cập Nhật Đơn Giá Gốc</h3>
                    <button class="gng-modal-close" onclick="_gngCloseModal('gngEditPriceModal')">&times;</button>
                </div>
                <div class="gng-modal-body">
                    <div style="margin-bottom:12px; font-size:12px; color:#64748b;">
                        Thay đổi đơn giá gốc tiêu chuẩn cho vật tư:<br>
                        <b style="color:#0f172a;">${_gngCleanMaterialName(itemName)}</b>
                    </div>
                    <div class="gng-form-group">
                        <label for="gngNewPriceInput">Đơn Giá Gốc Mới (đ):</label>
                        <input type="number" id="gngNewPriceInput" class="gng-input" style="width:100%;" value="${currentPrice}">
                    </div>
                </div>
                <div class="gng-modal-footer">
                    <button class="gng-btn-secondary" onclick="_gngCloseModal('gngEditPriceModal')">Hủy</button>
                    <button class="gng-btn-primary" onclick="_gngSubmitEditPrice('${itemType}', ${itemId}, ${sourceId})">Lưu Thay Đổi</button>
                </div>
            </div>
        </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.id = 'gngEditPriceModalWrapper';
    wrapper.innerHTML = modalHtml;
    document.body.appendChild(wrapper);
}

async function _gngSubmitEditPrice(itemType, itemId, sourceId) {
    const priceInput = document.getElementById('gngNewPriceInput');
    if (!priceInput) return;
    const newPrice = Number(priceInput.value);
    if (isNaN(newPrice) || newPrice < 0) {
        alert('Vui lòng nhập đơn giá hợp lệ');
        return;
    }

    try {
        const body = {
            item_type: itemType,
            source_id: sourceId,
            price: newPrice
        };
        if (itemType === 'fabric') {
            body.fabric_color_id = itemId;
        } else {
            body.material_item_id = itemId;
        }

        const res = await apiCall('/api/gianhapgoc/set-price', 'POST', body);
        if (res.success) {
            if (typeof showToast === 'function') showToast('Cập nhật giá gốc thành công', 'success');
            _gngCloseModal('gngEditPriceModal');
            await _gngLoadData();
        } else {
            throw new Error(res.error || 'Lỗi lưu giá');
        }
    } catch(e) {
        alert(e.message);
    }
}

function _gngCloseModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
        const wrapper = document.getElementById(modalId + 'Wrapper');
        if (wrapper) wrapper.remove();
    }
}

function escapeJS(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function _gngCleanMaterialName(name) {
    if (!name) return '';
    return name.replace(/\s+\d+\s*màu/gi, '').replace(/\s+\d+\s*kho\/mục/gi, '').replace(/\s+\d+\s*kho/gi, '').trim();
}

function _gngGetSupplierBadgeHtml(name) {
    if (!name) return '---';
    const cleanName = name.trim().toLowerCase();
    let bg = '#f1f5f9';
    let color = '#475569';
    
    if (cleanName.includes('ngọc hân') || cleanName.includes('ngoc han')) {
        bg = '#e0e7ff';
        color = '#4338ca';
    } else if (cleanName.includes('ngọc ngà') || cleanName.includes('ngoc nga')) {
        bg = '#ecfdf5';
        color = '#047857';
    } else if (cleanName.includes('dung pet') || cleanName.includes('a dung')) {
        bg = '#fff7ed';
        color = '#c2410c';
    } else if (cleanName.includes('sbc')) {
        bg = '#f0f9ff';
        color = '#0369a1';
    } else {
        let hash = 0;
        for (let i = 0; i < cleanName.length; i++) {
            hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % 5;
        const palettes = [
            { bg: '#fdf2f8', color: '#be185d' },
            { bg: '#faf5ff', color: '#7e22ce' },
            { bg: '#f5f5f4', color: '#44403c' },
            { bg: '#f0fdf4', color: '#15803d' },
            { bg: '#fef2f2', color: '#b91c1c' }
        ];
        bg = palettes[index].bg;
        color = palettes[index].color;
    }
    
    return `<span class="gng-sup-badge" style="background: ${bg}; color: ${color}; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; white-space: nowrap; display: inline-block;">${name}</span>`;
}

function _gngIsFabricSupplier(supplierId) {
    if (supplierId === 'all' || supplierId === 'pending_all') return false;
    return _gng.prices.some(p => p.source_id == supplierId && p.item_type === 'fabric');
}

async function _gngInitializeFromHistory() {
    if (!confirm('Bạn có muốn tự động lấy Đơn giá nhập gần đây nhất của từng vật tư trong Lịch sử để làm Giá Gốc không?')) {
        return;
    }
    
    try {
        const res = await apiCall('/api/gianhapgoc/initialize-from-history', 'POST');
        if (res.error) {
            alert('Lỗi: ' + res.error);
        } else {
            alert(`Thành công! Đã khởi tạo ${res.count} đơn giá gốc từ lịch sử nhập hàng.`);
            await _gngLoadData();
        }
    } catch (e) {
        console.error(e);
        alert('Có lỗi xảy ra khi khởi tạo.');
    }
}

function _gngToggleGroup(groupKey) {
    const rows = document.querySelectorAll('.' + groupKey);
    const arrow = document.getElementById('arrow_' + groupKey);
    if (!rows || rows.length === 0) return;
    
    const isCollapsed = rows[0].style.display === 'none';
    rows.forEach(r => {
        r.style.display = isCollapsed ? 'table-row' : 'none';
    });
    
    if (arrow) {
        arrow.style.transform = isCollapsed ? 'rotate(90deg)' : 'rotate(0deg)';
    }
}

