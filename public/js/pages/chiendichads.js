// ========== CHIẾN DỊCH VIDEO/ẢNH ADS PAGE ==========

function _cdAdsGetAuthHeaders() {
    const headers = {};
    const token = localStorage.getItem('token') || (document.cookie.match(/token=([^;]+)/) || [])[1];
    if (token && token !== 'null' && token !== 'undefined') {
        headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
}

function _cdAdsIsSuperUser() {
    const u = window._currentUser || window.currentUser;
    if (!u) return false;
    return u.role === 'giam_doc' || u.role === 'admin' || !!u.is_admin;
}

function _cdAdsIsManager() {
    const u = window._currentUser || window.currentUser;
    if (!u) return false;
    const r = (u.role || '').toLowerCase();
    return r === 'quan_ly' || r === 'quan_ly_cap_cao' || r === 'quan_ly_xuong';
}

function _cdAdsIsTruongPhong() {
    const u = window._currentUser || window.currentUser;
    if (!u) return false;
    const r = (u.role || '').toLowerCase();
    return r === 'truong_phong' || r === 'leader' || r === 'truong_nhom';
}

async function _cdAdsApi(url, method = 'GET', body = null) {
    const opts = {
        method,
        headers: _cdAdsGetAuthHeaders(),
        credentials: 'include'
    };
    if (body) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    return await res.json();
}

var _cdAdsState = window._cdAdsState || {
    campaigns: [],
    channels: [],
    myItems: [],
    filterStatus: 'all',
    filterChannel: 'all',
    filterSearch: '',
    filterDateMode: 'month',
    filterMonth: 'all',
    filterYear: new Date().getFullYear(),
    filterQuarter: Math.ceil((new Date().getMonth() + 1) / 3),
    filterStartDate: '',
    filterEndDate: '',
    winRateThreshold: 50,
    currentPage: 1,
    pageSize: 20,
    sortField: 'eff_rate',
    sortDir: 'desc'
};
window._cdAdsState = _cdAdsState;

function _cdAdsSortIcon(field) {
    if (_cdAdsState.sortField !== field) {
        return `<span style="font-size:10px;opacity:0.35;margin-left:3px;display:inline-block;">↕</span>`;
    }
    return _cdAdsState.sortDir === 'asc' 
        ? `<span style="font-size:11px;color:#38bdf8;margin-left:3px;display:inline-block;">▲</span>` 
        : `<span style="font-size:11px;color:#38bdf8;margin-left:3px;display:inline-block;">▼</span>`;
}

function _cdAdsToggleSort(field) {
    if (_cdAdsState.sortField === field) {
        _cdAdsState.sortDir = _cdAdsState.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
        _cdAdsState.sortField = field;
        const isStringField = ['campaign_name', 'channel_name', 'post_id', 'camp_id', 'status', 'created_by_name'].includes(field);
        _cdAdsState.sortDir = isStringField ? 'asc' : 'desc';
    }
    _cdAdsFilterAndRender();
}
window._cdAdsToggleSort = _cdAdsToggleSort;

// ========== DATE FILTER HELPERS ==========

function _cdAdsGetDateRange() {
    const mode = _cdAdsState.filterDateMode || 'month';
    const year = _cdAdsState.filterYear;

    if (mode === 'month') {
        const m = _cdAdsState.filterMonth;
        if (year === 'all') {
            return { startDate: '', endDate: '' };
        }
        const yNum = parseInt(year, 10) || new Date().getFullYear();
        if (m === 'all') {
            return { startDate: `${yNum}-01-01`, endDate: `${yNum}-12-31` };
        }
        const mNum = parseInt(m, 10) || (new Date().getMonth() + 1);
        const mm = String(mNum).padStart(2, '0');
        const lastDay = new Date(yNum, mNum, 0).getDate();
        return { startDate: `${yNum}-${mm}-01`, endDate: `${yNum}-${mm}-${String(lastDay).padStart(2, '0')}` };
    }

    if (mode === 'quarter') {
        if (year === 'all') {
            return { startDate: '', endDate: '' };
        }
        const q = parseInt(_cdAdsState.filterQuarter, 10) || 1;
        const qYear = parseInt(year, 10) || new Date().getFullYear();
        if (q === 1) return { startDate: `${qYear}-01-01`, endDate: `${qYear}-03-31` };
        if (q === 2) return { startDate: `${qYear}-04-01`, endDate: `${qYear}-06-30` };
        if (q === 3) return { startDate: `${qYear}-07-01`, endDate: `${qYear}-09-30` };
        if (q === 4) return { startDate: `${qYear}-10-01`, endDate: `${qYear}-12-31` };
    }

    if (mode === 'daterange') {
        return {
            startDate: _cdAdsState.filterStartDate || '',
            endDate: _cdAdsState.filterEndDate || ''
        };
    }

    return { startDate: '', endDate: '' };
}

function _cdAdsPopulateDateSelectors() {
    const monthSel = document.getElementById('cdAdsMonthSelect');
    const yearSel = document.getElementById('cdAdsYearSelect');
    const qYearSel = document.getElementById('cdAdsQYearSelect');
    const qSel = document.getElementById('cdAdsQuarterSelect');

    const curYear = new Date().getFullYear();

    if (monthSel && monthSel.options.length === 0) {
        monthSel.innerHTML = '<option value="all">🌐 Tất cả các tháng</option>';
        for (let m = 1; m <= 12; m++) {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = `Tháng ${m}`;
            if (String(m) === String(_cdAdsState.filterMonth)) opt.selected = true;
            monthSel.appendChild(opt);
        }
        if (String(_cdAdsState.filterMonth) === 'all') monthSel.value = 'all';
    }

    const fillYears = (sel, curVal) => {
        if (!sel) return;
        sel.innerHTML = '<option value="all">🌐 Tất cả các năm</option>';
        for (let y = curYear; y >= curYear - 5; y--) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = `Năm ${y}`;
            if (String(y) === String(curVal)) opt.selected = true;
            sel.appendChild(opt);
        }
        if (String(curVal) === 'all') sel.value = 'all';
    };

    fillYears(yearSel, _cdAdsState.filterYear);
    fillYears(qYearSel, _cdAdsState.filterYear);

    if (qSel) qSel.value = String(_cdAdsState.filterQuarter);
}

function _cdAdsOnDateModeChange() {
    const mode = document.getElementById('cdAdsDateModeSelect')?.value || 'month';
    _cdAdsState.filterDateMode = mode;

    const monthBox = document.getElementById('cdAdsMonthControls');
    const quarterBox = document.getElementById('cdAdsQuarterControls');
    const rangeBox = document.getElementById('cdAdsDateRangeControls');

    if (monthBox) monthBox.style.display = mode === 'month' ? 'flex' : 'none';
    if (quarterBox) quarterBox.style.display = mode === 'quarter' ? 'flex' : 'none';
    if (rangeBox) rangeBox.style.display = mode === 'daterange' ? 'flex' : 'none';

    _cdAdsLoadCampaigns();
}

function _cdAdsOnDateChange() {
    const mode = _cdAdsState.filterDateMode || 'month';
    if (mode === 'month') {
        _cdAdsState.filterMonth = document.getElementById('cdAdsMonthSelect')?.value || 'all';
        _cdAdsState.filterYear = parseInt(document.getElementById('cdAdsYearSelect')?.value, 10) || new Date().getFullYear();
    } else if (mode === 'quarter') {
        _cdAdsState.filterQuarter = parseInt(document.getElementById('cdAdsQuarterSelect')?.value, 10) || 1;
        _cdAdsState.filterYear = parseInt(document.getElementById('cdAdsQYearSelect')?.value, 10) || new Date().getFullYear();
    } else if (mode === 'daterange') {
        _cdAdsState.filterStartDate = document.getElementById('cdAdsStartDate')?.value || '';
        _cdAdsState.filterEndDate = document.getElementById('cdAdsEndDate')?.value || '';
    }
    _cdAdsLoadCampaigns();
}

window._cdAdsOnDateModeChange = _cdAdsOnDateModeChange;
window._cdAdsOnDateChange = _cdAdsOnDateChange;

// ========== MAIN RENDER ==========

async function renderChiendichadsPage(container) {
    if (!container || !(container instanceof HTMLElement)) {
        container = document.getElementById('mainContent') || document.getElementById('app') || document.querySelector('.main-content') || document.body;
    }
    if (!container) return;

    const isGD = _cdAdsIsSuperUser();
    const isQL = _cdAdsIsManager();
    const isTP = _cdAdsIsTruongPhong();
    const showUserFilter = isGD || isQL || isTP;

    container.innerHTML = `
        <div style="padding: 24px 32px; width: 100%; box-sizing: border-box; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;">
            <!-- Header Banner -->
            <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); border-radius: 20px; padding: 32px 40px; color: white; margin-bottom: 24px; box-shadow: 0 10px 25px -5px rgba(67, 56, 202, 0.3); position: relative; overflow: hidden; display: flex; justify-content: space-between; align-items: center;">
                <div style="position: absolute; right: 260px; bottom: -30px; font-size: 160px; opacity: 0.12; user-select: none;">🚀</div>
                <div style="z-index: 1;">
                    <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(255, 255, 255, 0.18); backdrop-filter: blur(8px); padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 12px;">
                        <span>📢 Bộ Phận Marketing Ads</span>
                    </div>
                    <h2 style="margin: 0 0 8px; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">🚀 Chiến Dịch Test Ads</h2>
                    <p style="margin: 0; font-size: 14px; opacity: 0.9; max-width: 650px; line-height: 1.5;">
                        Quản lý và theo dõi danh sách các Chiến Dịch Quảng Cáo Video & Hình Ảnh (Chi phí, hiệu quả, trạng thái chạy).
                    </p>
                </div>
                <div style="z-index: 1; display: flex; gap: 12px; align-items: center;">
                    <button onclick="_cdAdsOpenPerfModal()" style="background: rgba(255, 255, 255, 0.2); color: white; border: 1.5px solid rgba(255,255,255,0.4); padding: 13px 22px; border-radius: 12px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 800; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; backdrop-filter: blur(8px); transition: all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.3)';this.style.transform='translateY(-1px)'" onmouseout="this.style.background='rgba(255,255,255,0.2)';this.style.transform='translateY(0)'" title="Xem/Cài đặt tiêu chí & ngưỡng hiệu quả quảng cáo">
                        <span style="font-size: 18px;">📊</span> Cài Đặt Hiệu Quả
                    </button>
                    <button onclick="_cdAdsOpenCreateModal()" style="background: #10b981; color: white; border: none; padding: 14px 24px; border-radius: 12px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 800; font-size: 15px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4); transition: all 0.2s ease;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                        <span style="font-size: 18px;">➕</span> Tạo Chiến Dịch Mới
                    </button>
                </div>
            </div>

            <!-- Cảnh báo chưa báo cáo -->
            <div id="cdAdsUnreportedWarning" style="display: none;"></div>

            <!-- Stats Summary (Ảnh 3: Đặt lên trên Thanh Bộ Lọc) -->
            <div id="cdAdsStatsSummary" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;"></div>

            <!-- Filter Toolbar (Ảnh 2) -->
            <div style="background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 20px 24px; margin-bottom: 24px; box-shadow: 0 4px 15px -2px rgba(0,0,0,0.04);">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px;">
                    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 800; color: #0f172a;">
                            <span>🔍</span> TÌM KIẾM & LỌC CHIẾN DỊCH ADS
                        </div>
                        <!-- Date Filter Mode & Controls -->
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; background: #f8fafc; padding: 4px 10px; border-radius: 12px; border: 1px solid #e2e8f0;">
                            <label style="font-weight: 700; font-size: 12.5px; color: #1e293b; white-space: nowrap;">📅 Lọc theo:</label>
                            <select id="cdAdsDateModeSelect" onchange="_cdAdsOnDateModeChange()" style="padding: 6px 12px; border-radius: 8px; border: 1.5px solid #cbd5e1; font-size: 12.5px; font-weight: 700; background: white; cursor: pointer; color: #1d4ed8; outline: none;">
                                <option value="month">📅 Theo Tháng</option>
                                <option value="quarter">📊 Theo Quý</option>
                                <option value="daterange">📆 Theo Ngày (Bảng Lịch)</option>
                            </select>

                            <!-- Month Controls -->
                            <div id="cdAdsMonthControls" style="display: flex; align-items: center; gap: 6px;">
                                <select id="cdAdsMonthSelect" onchange="_cdAdsOnDateChange()" style="padding: 6px 10px; border-radius: 8px; border: 1.5px solid #cbd5e1; font-size: 12.5px; font-weight: 700; background: white; cursor: pointer; outline: none;"></select>
                                <select id="cdAdsYearSelect" onchange="_cdAdsOnDateChange()" style="padding: 6px 10px; border-radius: 8px; border: 1.5px solid #cbd5e1; font-size: 12.5px; font-weight: 700; background: white; cursor: pointer; outline: none;"></select>
                            </div>

                            <!-- Quarter Controls -->
                            <div id="cdAdsQuarterControls" style="display: none; align-items: center; gap: 6px;">
                                <select id="cdAdsQuarterSelect" onchange="_cdAdsOnDateChange()" style="padding: 6px 10px; border-radius: 8px; border: 1.5px solid #cbd5e1; font-size: 12.5px; font-weight: 700; background: white; cursor: pointer; color: #0f172a; outline: none;">
                                    <option value="1">Quý 1 (Tháng 1 - Tháng 3)</option>
                                    <option value="2">Quý 2 (Tháng 4 - Tháng 6)</option>
                                    <option value="3">Quý 3 (Tháng 7 - Tháng 9)</option>
                                    <option value="4">Quý 4 (Tháng 10 - Tháng 12)</option>
                                </select>
                                <select id="cdAdsQYearSelect" onchange="_cdAdsOnDateChange()" style="padding: 6px 10px; border-radius: 8px; border: 1.5px solid #cbd5e1; font-size: 12.5px; font-weight: 700; background: white; cursor: pointer; outline: none;"></select>
                            </div>

                            <!-- Date Range Controls -->
                            <div id="cdAdsDateRangeControls" style="display: none; align-items: center; gap: 6px;">
                                <input type="date" id="cdAdsStartDate" onchange="_cdAdsOnDateChange()" style="padding: 5px 8px; border-radius: 8px; border: 1.5px solid #cbd5e1; font-size: 12px; font-weight: 700;">
                                <span style="font-size: 12px; font-weight: 700; color: #64748b;">➔</span>
                                <input type="date" id="cdAdsEndDate" onchange="_cdAdsOnDateChange()" style="padding: 5px 8px; border-radius: 8px; border: 1.5px solid #cbd5e1; font-size: 12px; font-weight: 700;">
                            </div>
                        </div>
                    </div>
                    <div id="cdAdsResultCount" style="font-size: 12px; font-weight: 800; color: #4338ca; background: #eef2ff; padding: 6px 14px; border-radius: 20px; border: 1px solid #c7d2fe;">
                        Hiển thị 0 chiến dịch
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 2fr 1fr 1fr ${showUserFilter ? '1fr' : ''} auto; gap: 12px; align-items: center;">
                    <div style="position: relative;">
                        <input type="text" id="cdAdsSearchInput" onkeyup="_cdAdsApplyFilters()" placeholder="🔍 Tìm tên chiến dịch, Post ID, ID Camp..." style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 600; background: #fafafa; outline: none; box-sizing: border-box;" onfocus="this.style.borderColor='#4338ca';this.style.background='white'" onblur="this.style.borderColor='#cbd5e1'">
                    </div>
                    <select id="cdAdsFilterLinhVuc" onchange="_cdAdsApplyFilters()" style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 600; color: #1e293b; background: #fafafa; cursor: pointer; outline: none;">
                        <option value="all">🏢 Tất cả Lĩnh Vực Ads</option>
                    </select>
                    <select id="cdAdsFilterChannel" onchange="_cdAdsApplyFilters()" style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 600; color: #1e293b; background: #fafafa; cursor: pointer; outline: none;">
                        <option value="all">📺 Tất cả kênh</option>
                    </select>
                    ${showUserFilter ? `
                    <select id="cdAdsFilterUser" onchange="_cdAdsApplyFilters()" style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 600; color: #1e293b; background: #fafafa; cursor: pointer; outline: none;">
                        <option value="all">👤 Tất cả nhân viên</option>
                    </select>
                    ` : ''}
                    <button onclick="_cdAdsResetFilters()" style="padding: 10px 16px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 700; color: #475569; cursor: pointer; white-space: nowrap;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">🔄 Đặt Lại</button>
                </div>
            </div>

            <!-- Main Table -->
            <div style="background: white; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 15px -2px rgba(0,0,0,0.04);">
                <div id="cdAdsTableContainer" style="overflow-x: auto; overflow-y: visible; border-radius: 16px;">
                    <div style="text-align: center; padding: 60px; color: #64748b; font-size: 15px;">⏳ Đang tải dữ liệu chiến dịch...</div>
                </div>
            </div>
        </div>

        <!-- MODAL: Tạo Chiến Dịch Mới -->
        <div id="cdAdsCreateModal" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); z-index: 9999; justify-content: center; align-items: center; padding: 24px;">
            <div style="background: white; border-radius: 20px; width: 100%; max-width: 720px; max-height: 90vh; box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.35); overflow: hidden; display: flex; flex-direction: column;">
                <div style="background: linear-gradient(135deg, #1e1b4b, #4338ca); padding: 20px 24px; color: white; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 22px;">🚀</span>
                        <div>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 800;">Tạo Chiến Dịch Ads Mới</h3>
                            <div style="font-size: 12px; opacity: 0.85;">Chọn mẫu → Chọn kênh → Chọn tài khoản QC → Chọn chiến dịch Camp</div>
                        </div>
                    </div>
                    <button onclick="_cdAdsCloseCreateModal()" style="background: rgba(255,255,255,0.2); border: none; font-size: 16px; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: white; font-weight: bold;">✕</button>
                </div>
                <div style="padding: 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 18px;">
                    <!-- Chọn Công Việc Test Camp -->
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">📋 Chọn Công Việc Test Camp (Từ Bảng Công Việc) <span id="cdAdsTaskReqStar" style="color:#dc2626;display:none">* (BẮT BUỘC CHỌN)</span></label>
                        <select id="cdAdsCreateTaskSelect" style="width: 100%; padding: 11px 12px; border: 1.5px solid #8b5cf6; border-radius: 10px; font-size: 13.5px; font-weight: 700; outline: none; background: #f5f3ff; color: #5b21b6;">
                            <option value="">-- Tải danh sách công việc... --</option>
                        </select>
                    </div>
                    <!-- Bước 1: Chọn mẫu -->
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">📦 Bước 1: Chọn Mẫu Từ Kho Ads <span style="color:#dc2626">*</span></label>
                        <select id="cdAdsCreateItemSelect" onchange="_cdAdsOnItemSelect()" style="width: 100%; padding: 11px 12px; border: 1.5px solid #6366f1; border-radius: 10px; font-size: 13.5px; font-weight: 700; outline: none; background: #eef2ff; color: #3730a3;">
                            <option value="">-- Chọn mẫu Video/Ảnh Ads --</option>
                        </select>
                        <div id="cdAdsCreateItemPreview" style="display: none; margin-top: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; gap: 12px; align-items: center;"></div>
                    </div>
                    <!-- Bước 2: Chọn kênh -->
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">📺 Bước 2: Chọn Kênh Quảng Cáo (Từ Cài Đặt Tài Khoản Ads) <span style="color:#dc2626">*</span></label>
                        <div id="cdAdsCreateChannelList" style="display: flex; gap: 10px; flex-wrap: wrap;"></div>
                    </div>
                    <!-- Bước 3: Chọn Tài Khoản Quảng Cáo -->
                    <div id="cdAdsStep3Box" style="display: none;">
                        <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">💳 Bước 3: Chọn Tài Khoản Quảng Cáo <span style="color:#dc2626">*</span></label>
                        <select id="cdAdsCreateAdAccountSelect" onchange="_cdAdsOnAdAccountSelect()" style="width: 100%; padding: 11px 12px; border: 1.5px solid #0284c7; border-radius: 10px; font-size: 13.5px; font-weight: 700; outline: none; background: #f0f9ff; color: #0369a1;">
                            <option value="">-- Chọn Tài Khoản QC đã liên kết --</option>
                        </select>
                    </div>
                    <!-- Bước 4: Chọn Chiến Dịch Camp từ Tài Khoản QC -->
                    <div id="cdAdsStep4Box" style="display: none;">
                        <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">🎯 Bước 4: Chọn Chiến Dịch Camp Từ Tài Khoản QC <span style="color:#dc2626">*</span></label>
                        <select id="cdAdsCreateCampaignSelect" onchange="_cdAdsOnCampaignSelect()" style="width: 100%; padding: 11px 12px; border: 1.5px solid #16a34a; border-radius: 10px; font-size: 13.5px; font-weight: 700; outline: none; background: #f0fdf4; color: #15803d;">
                            <option value="">-- Chọn Chiến Dịch --</option>
                        </select>
                    </div>
                    <!-- Post ID + ID Camp -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">🆔 Post ID <span style="font-size:11px;font-weight:600;color:#64748b;">(Tự động liên kết)</span></label>
                            <input type="text" id="cdAdsCreatePostId" readonly placeholder="Tự động liên kết..." style="width: 100%; padding: 11px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13.5px; font-weight: 700; outline: none; background: #f1f5f9; color: #334155; cursor: not-allowed; box-sizing: border-box;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">🏷️ ID Camp <span style="font-size:11px;font-weight:600;color:#64748b;">(Tự động liên kết)</span></label>
                            <input type="text" id="cdAdsCreateCampId" readonly placeholder="Tự động liên kết..." style="width: 100%; padding: 11px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13.5px; font-weight: 700; outline: none; background: #f1f5f9; color: #334155; cursor: not-allowed; box-sizing: border-box;">
                        </div>
                    </div>
                    <!-- Tên chiến dịch (tự động) -->
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">📌 Tên Chiến Dịch <span style="font-size:11px;font-weight:600;color:#64748b;">(Tự động liên kết mẫu + kênh/TK + camp)</span></label>
                        <input type="text" id="cdAdsCreateCampaignName" readonly placeholder="Tự động liên kết..." style="width: 100%; padding: 11px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13.5px; font-weight: 700; outline: none; background: #f1f5f9; color: #334155; cursor: not-allowed; box-sizing: border-box;">
                    </div>
                </div>
                <div style="padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; flex-shrink: 0;">
                    <button onclick="_cdAdsCloseCreateModal()" style="padding: 10px 20px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; font-weight: 700; color: #475569; cursor: pointer;">Hủy</button>
                    <button onclick="_cdAdsSubmitCreate()" style="padding: 10px 24px; background: linear-gradient(135deg, #4338ca, #6366f1); color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 14px rgba(67,56,202,0.3);">🚀 Tạo Chiến Dịch</button>
                </div>
            </div>
        </div>

        <!-- MODAL: Xem Chi Tiết -->
        <div id="cdAdsDetailModal" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); z-index: 9999; justify-content: center; align-items: center; padding: 24px; overflow-y: auto;">
            <div style="background: white; border-radius: 20px; width: 94vw; max-width: 1280px; max-height: 90vh; box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.35); overflow: hidden; display: flex; flex-direction: column;">
                <div style="background: linear-gradient(135deg, #0f172a, #4338ca); padding: 20px 24px; color: white; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 22px;">📋</span>
                        <div>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 800;" id="cdAdsDetailTitle">Chi Tiết Chiến Dịch</h3>
                            <div style="font-size: 12px; opacity: 0.8;">Lịch sử báo cáo hàng ngày</div>
                        </div>
                    </div>
                    <button onclick="_cdAdsCloseDetailModal()" style="background: rgba(255,255,255,0.2); border: none; font-size: 16px; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: white; font-weight: bold;">✕</button>
                </div>
                <div id="cdAdsDetailBody" style="padding: 24px; overflow-y: auto; flex: 1;">
                    <div style="text-align: center; color: #64748b; padding: 40px;">⏳ Đang tải...</div>
                </div>
            </div>
        </div>

        <!-- MODAL: Gắn Thêm ID Camp / Post ID Bổ Sung -->
        <div id="cdAdsAddExtraCampModal" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); z-index: 10000; justify-content: center; align-items: center; padding: 24px;">
            <div style="background: white; border-radius: 20px; width: 100%; max-width: 680px; max-height: 90vh; box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.35); overflow: hidden; display: flex; flex-direction: column;">
                <div style="background: linear-gradient(135deg, #1e1b4b, #4338ca); padding: 20px 24px; color: white; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 22px;">➕</span>
                        <div>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 800;">Gắn Thêm ID Camp / Post ID Bổ Sung</h3>
                            <div id="cdAdsExtraModalSub" style="font-size: 12px; opacity: 0.85; margin-top: 2px;">Tải chiến dịch live từ Tài Khoản QC & Gắn số liệu cộng dồn</div>
                        </div>
                    </div>
                    <button onclick="_cdAdsCloseAddExtraCampModal()" style="background: rgba(255,255,255,0.2); border: none; font-size: 16px; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: white; font-weight: bold;">✕</button>
                </div>
                <input type="hidden" id="cdAdsExtraCampaignId">
                <input type="hidden" id="cdAdsExtraPlatform">
                <div style="padding: 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 18px;">
                    <!-- Bước 2 (Ảnh 3): Chọn Tài Khoản Quảng Cáo -->
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">💳 Chọn Tài Khoản Quảng Cáo <span style="color:#dc2626">*</span></label>
                        <select id="cdAdsExtraAdAccountSelect" onchange="_cdAdsOnExtraAdAccountSelect()" style="width: 100%; padding: 11px 12px; border: 1.5px solid #0284c7; border-radius: 10px; font-size: 13.5px; font-weight: 700; outline: none; background: #f0f9ff; color: #0369a1;">
                            <option value="">-- Chọn Tài Khoản QC đã liên kết --</option>
                        </select>
                    </div>

                    <!-- Bước 3 (Ảnh 3): Chọn Chiến Dịch Camp Từ Tài Khoản QC -->
                    <div id="cdAdsExtraStep3Box" style="display: none;">
                        <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">🎯 Chọn Chiến Dịch Camp Từ Tài Khoản QC <span style="color:#dc2626">*</span></label>
                        <select id="cdAdsExtraCampaignSelect" onchange="_cdAdsOnExtraCampaignSelect()" style="width: 100%; padding: 11px 12px; border: 1.5px solid #16a34a; border-radius: 10px; font-size: 13.5px; font-weight: 700; outline: none; background: #f0fdf4; color: #15803d;">
                            <option value="">-- Chọn Chiến Dịch --</option>
                        </select>
                    </div>

                    <!-- Post ID + ID Camp -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">🆔 ID Post <span style="font-size:11px;font-weight:600;color:#64748b;">(Tự động điền)</span></label>
                            <input type="text" id="cdAdsExtraPostIdInput" readonly placeholder="Tự động lấy theo chiến dịch..." style="width: 100%; padding: 11px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13.5px; font-weight: 700; outline: none; background: #f1f5f9; color: #475569; cursor: not-allowed; box-sizing: border-box;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">🏷️ ID Camp <span style="color:#dc2626">*</span> <span style="font-size:11px;font-weight:600;color:#64748b;">(Tự động điền)</span></label>
                            <input type="text" id="cdAdsExtraCampIdInput" readonly placeholder="Tự động lấy theo chiến dịch..." style="width: 100%; padding: 11px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13.5px; font-weight: 700; outline: none; background: #f1f5f9; color: #475569; cursor: not-allowed; box-sizing: border-box;">
                        </div>
                    </div>

                    <!-- Ghi chú / Tên gợi nhớ -->
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">📝 Ghi Chú / Tên Gợi Nhớ <span style="font-size:11px;font-weight:600;color:#64748b;">(Tự động lấy tên chiến dịch)</span></label>
                        <input type="text" id="cdAdsExtraNoteInput" readonly placeholder="Tự động lấy tên chiến dịch..." style="width: 100%; padding: 11px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13.5px; font-weight: 700; outline: none; background: #f1f5f9; color: #475569; cursor: not-allowed; box-sizing: border-box;">
                    </div>
                </div>
                <div style="padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; flex-shrink: 0;">
                    <button onclick="_cdAdsCloseAddExtraCampModal()" style="padding: 10px 20px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; font-weight: 700; color: #475569; cursor: pointer;">Hủy</button>
                    <button onclick="_cdAdsSubmitAddExtraCamp()" style="padding: 10px 24px; background: linear-gradient(135deg, #4338ca, #6366f1); color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 14px rgba(67,56,202,0.3);">💾 Lưu & Gắn Camp Bổ Sung</button>
                </div>
            </div>
        </div>
    `;

    // Init date selectors
    _cdAdsPopulateDateSelectors();

    // Load data
    await _cdAdsLoadAll();
}

// ========== DATA LOADING ==========

async function _cdAdsLoadAll() {
    await Promise.all([
        _cdAdsLoadLinhVuc(),
        _cdAdsLoadChannels(),
        _cdAdsLoadCampaigns(),
        _cdAdsCheckUnreported()
    ]);
}

async function _cdAdsLoadLinhVuc() {
    try {
        const res = await _cdAdsApi('/api/kho-ads/linh-vuc');
        const list = res.linh_vuc_list || res.items || res.data || [];
        const sel = document.getElementById('cdAdsFilterLinhVuc');
        if (sel) {
            sel.innerHTML = '<option value="all">🏢 Tất cả Lĩnh Vực Ads</option>' +
                list.map(item => {
                    const name = typeof item === 'string' ? item : (item.name || item.title || '');
                    const code = typeof item === 'object' && item.code ? `[${item.code}] ` : '';
                    return `<option value="${name}">${code}${name}</option>`;
                }).join('');
        }
    } catch(e) { console.error('[cdAds loadLinhVuc]', e); }
}

async function _cdAdsLoadChannels() {
    try {
        const data = await _cdAdsApi('/api/ads-campaigns/linked-platforms');
        _cdAdsState.channels = data.platforms || [];
        // Update filter dropdown
        const sel = document.getElementById('cdAdsFilterChannel');
        if (sel) {
            sel.innerHTML = '<option value="all">📺 Tất cả kênh</option>' +
                _cdAdsState.channels.map(ch => `<option value="${ch.id}">${ch.icon || '📺'} ${ch.name}</option>`).join('');
        }
    } catch(e) { console.error('[cdAds loadChannels]', e); }
}

async function _cdAdsLoadCampaigns() {
    try {
        const params = new URLSearchParams();
        const search = document.getElementById('cdAdsSearchInput')?.value || '';
        const linhVuc = document.getElementById('cdAdsFilterLinhVuc')?.value || 'all';
        const channel = document.getElementById('cdAdsFilterChannel')?.value || 'all';

        if (search) params.set('search', search);
        if (linhVuc !== 'all') params.set('linh_vuc', linhVuc);
        if (channel !== 'all') params.set('channel_id', channel);

        const { startDate, endDate } = _cdAdsGetDateRange();
        if (startDate) params.set('start_date', startDate);
        if (endDate) params.set('end_date', endDate);

        const data = await _cdAdsApi(`/api/ads-campaigns?${params.toString()}`);
        _cdAdsState.campaigns = data.campaigns || [];

        _cdAdsRenderStats();
        _cdAdsRenderTable();
        _cdAdsPopulateUserFilter();
    } catch(e) {
        console.error('[cdAds loadCampaigns]', e);
    }
}

function _cdAdsApplyFilters() {
    _cdAdsLoadCampaigns();
}
window._cdAdsApplyFilters = _cdAdsApplyFilters;

function _cdAdsResetFilters() {
    const searchInp = document.getElementById('cdAdsSearchInput');
    const lvSel = document.getElementById('cdAdsFilterLinhVuc');
    const chSel = document.getElementById('cdAdsFilterChannel');
    const uSel = document.getElementById('cdAdsFilterUser');
    if (searchInp) searchInp.value = '';
    if (lvSel) lvSel.value = 'all';
    if (chSel) chSel.value = 'all';
    if (uSel) uSel.value = 'all';
    _cdAdsState.filterStatus = 'all';
    _cdAdsLoadCampaigns();
}
window._cdAdsResetFilters = _cdAdsResetFilters;

async function _cdAdsCheckUnreported() {
    const box = document.getElementById('cdAdsUnreportedWarning');
    if (box) box.style.display = 'none';
}

// ========== RENDER STATS ==========

function _cdAdsRenderStats() {
    const box = document.getElementById('cdAdsStatsSummary');
    if (!box) return;
    const all = _cdAdsState.campaigns;
    const winThreshold = _cdAdsState.winRateThreshold || 50;

    const calcEffRate = (c) => {
        const gt = Number(c.run_count_gt70k) || 0;
        const eff = Number(c.total_effective_count) || 0;
        return gt > 0 ? (eff / gt) * 100 : 0;
    };

    const win = all.filter(c => calcEffRate(c) >= winThreshold).length;
    const lose = all.filter(c => calcEffRate(c) < winThreshold).length;

    const curStatus = _cdAdsState.filterStatus || 'all';

    const cards = [
        { key: 'all', label: 'Tổng Chiến Dịch', value: all.length, icon: '📊', bg: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', activeBg: 'linear-gradient(135deg, #c7d2fe, #a5b4fc)', color: '#3730a3', borderColor: '#818cf8' },
        { key: 'mau_win', label: `Mẫu Win ≥ ${winThreshold}%`, value: win, icon: '✅', bg: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', activeBg: 'linear-gradient(135deg, #bbf7d0, #86efac)', color: '#166534', borderColor: '#4ade80' },
        { key: 'mau_lose', label: `Mẫu Lose < ${winThreshold}%`, value: lose, icon: '❌', bg: 'linear-gradient(135deg, #fef2f2, #fee2e2)', activeBg: 'linear-gradient(135deg, #fecaca, #fca5a5)', color: '#991b1b', borderColor: '#f87171' }
    ];

    box.innerHTML = cards.map(c => {
        const isActive = curStatus === c.key;
        return `
            <div onclick="_cdAdsSelectStatusFilter('${c.key}')" style="
                background: ${isActive ? c.activeBg : c.bg};
                border: ${isActive ? '2.5px solid ' + c.borderColor : '1.5px solid ' + c.borderColor};
                border-radius: 14px; padding: 16px 20px; display: flex; align-items: center;
                justify-content: space-between; cursor: pointer; transition: all 0.2s ease;
                box-shadow: ${isActive ? '0 6px 20px rgba(0,0,0,0.12)' : '0 2px 6px rgba(0,0,0,0.03)'};
                transform: ${isActive ? 'translateY(-2px)' : 'none'};
            " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="if(!${isActive}) this.style.transform='none'" title="Bấm để lọc theo: ${c.label}">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <span style="font-size: 28px;">${c.icon}</span>
                    <div>
                        <div style="font-size: 24px; font-weight: 800; color: ${c.color};">${c.value}</div>
                        <div style="font-size: 12px; font-weight: 700; color: ${c.color}; opacity: 0.9;">${c.label}</div>
                    </div>
                </div>
                ${isActive ? `<span style="font-size: 14px; background: ${c.color}; color: white; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-weight: 800;">✓</span>` : ''}
            </div>
        `;
    }).join('');
}

function _cdAdsSelectStatusFilter(statusKey) {
    _cdAdsState.filterStatus = statusKey;
    _cdAdsRenderStats();
    _cdAdsRenderTable();
}
window._cdAdsSelectStatusFilter = _cdAdsSelectStatusFilter;

// ========== RENDER TABLE ==========

function _cdAdsRenderTable() {
    const container = document.getElementById('cdAdsTableContainer');
    if (!container) return;

    let filtered = [..._cdAdsState.campaigns];

    // Client-side status filter (from Stat Cards)
    const statusFilter = _cdAdsState.filterStatus || 'all';
    const winThreshold = _cdAdsState.winRateThreshold || 50;

    const calcRate = (c) => {
        const gt = Number(c.run_count_gt70k) || 0;
        const eff = Number(c.total_effective_count) || 0;
        return gt > 0 ? (eff / gt) * 100 : 0;
    };

    if (statusFilter === 'mau_win') {
        filtered = filtered.filter(c => calcRate(c) >= winThreshold);
    } else if (statusFilter === 'mau_lose') {
        filtered = filtered.filter(c => calcRate(c) < winThreshold);
    }

    // Client-side user filter
    const userFilter = document.getElementById('cdAdsFilterUser')?.value || 'all';
    if (userFilter !== 'all') {
        filtered = filtered.filter(c => String(c.created_by) === String(userFilter));
    }

    // Client-side linh_vuc filter
    const linhVucFilter = document.getElementById('cdAdsFilterLinhVuc')?.value || 'all';
    if (linhVucFilter !== 'all') {
        const targetStr = linhVucFilter.toLowerCase().trim();
        let keywords = [targetStr];
        if (targetStr.includes('spa') || targetStr.includes('thẩm mỹ')) {
            keywords.push('spa', 'thẩm mỹ');
        } else if (targetStr.includes('công ty')) {
            keywords.push('công ty');
        } else if (targetStr.includes('áo lớp')) {
            keywords.push('áo lớp');
        } else if (targetStr.includes('mầm non')) {
            keywords.push('mầm non');
        }

        filtered = filtered.filter(c => {
            const lvStr = (c.linh_vuc || c.item_linh_vuc || c.linh_vuc_name || c.campaign_name || '').toLowerCase();
            return keywords.some(kw => lvStr.includes(kw));
        });
    }

    // Sort logic
    if (_cdAdsState.sortField) {
        const field = _cdAdsState.sortField;
        const dir = _cdAdsState.sortDir === 'asc' ? 1 : -1;
        filtered.sort((a, b) => {
            let valA = a[field];
            let valB = b[field];
            if (valA === null || valA === undefined) valA = '';
            if (valB === null || valB === undefined) valB = '';

            if (field === 'created_at') {
                const dA = new Date(valA).getTime() || 0;
                const dB = new Date(valB).getTime() || 0;
                return (dA - dB) * dir;
            }

            if (field === 'eff_rate') {
                const gtA = Number(a.run_count_gt70k) || 0;
                const effA = Number(a.total_effective_count) || 0;
                const rateA = gtA > 0 ? (effA / gtA) * 100 : 0;

                const gtB = Number(b.run_count_gt70k) || 0;
                const effB = Number(b.total_effective_count) || 0;
                const rateB = gtB > 0 ? (effB / gtB) * 100 : 0;

                if (rateA !== rateB) return (rateA - rateB) * dir;
                return (effA - effB) * dir;
            }

            if (field === 'total_effective_count') {
                const gtA = Number(a.run_count_gt70k) || 0;
                const effA = Number(a.total_effective_count) || 0;
                const rateA = gtA > 0 ? (effA / gtA) * 100 : 0;

                const gtB = Number(b.run_count_gt70k) || 0;
                const effB = Number(b.total_effective_count) || 0;
                const rateB = gtB > 0 ? (effB / gtB) * 100 : 0;

                if (effA !== effB) return (effA - effB) * dir;
                return (rateA - rateB) * dir;
            }

            const numA = Number(valA);
            const numB = Number(valB);
            if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '' && typeof valA !== 'boolean' && typeof valB !== 'boolean') {
                return (numA - numB) * dir;
            }

            return String(valA).localeCompare(String(valB), 'vi', { numeric: true }) * dir;
        });
    }

    // Update count
    const countEl = document.getElementById('cdAdsResultCount');
    if (countEl) countEl.textContent = `Hiển thị ${filtered.length} chiến dịch`;

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px; color: #64748b;">
                <div style="font-size: 48px; margin-bottom: 12px;">📭</div>
                <div style="font-size: 16px; font-weight: 800; color: #334155; margin-bottom: 6px;">Chưa có chiến dịch nào</div>
                <div style="font-size: 13px;">Nhấn "➕ Tạo Chiến Dịch Mới" để bắt đầu</div>
            </div>
        `;
        return;
    }

    const isGD = _cdAdsIsSuperUser();
    const curUser = window._currentUser || window.currentUser || {};

    const statusBadge = (s) => {
        if (s === 'chay_test') return '<span style="background:#dbeafe;color:#1d4ed8;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:800;white-space:nowrap;">🔵 Chạy Test</span>';
        if (s === 'mau_win') return '<span style="background:#dcfce7;color:#15803d;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:800;white-space:nowrap;">✅ Mẫu Win</span>';
        if (s === 'mau_lose') return '<span style="background:#fee2e2;color:#b91c1c;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:800;white-space:nowrap;">❌ Mẫu Lose</span>';
        return s;
    };

    const fmtNum = (n) => {
        if (!n && n !== 0) return '-';
        return Number(n).toLocaleString('vi-VN');
    };

    const fmtMoney = (n) => {
        if (!n && n !== 0) return '-';
        return Math.round(Number(n)).toLocaleString('vi-VN') + 'đ';
    };

    const maxEffCount = Math.max(1, ...filtered.map(c => Number(c.total_effective_count) || 0));

    let rows = filtered.map((c, idx) => {
        const isCreator = Number(c.created_by) === Number(curUser.id);
        const canEdit = isGD || isCreator;
        const thumbStyle = c.thumbnail_url 
            ? `background-image:url('${c.thumbnail_url}');background-size:cover;background-position:center;` 
            : 'background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:20px;';
        const thumbContent = c.thumbnail_url ? '' : (c.media_type === 'video' ? '🎥' : '🖼️');

        let adAccountLink = c.fb_ad_account_link || '';
        if (!adAccountLink && c.fb_ad_account_id) {
            const rawId = String(c.fb_ad_account_id).replace(/^act_/i, '');
            adAccountLink = `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${rawId}`;
        }

        let campFbLink = '';
        if (c.camp_id) {
            const campId = String(c.camp_id).trim();
            if (adAccountLink) {
                const sep = adAccountLink.includes('?') ? '&' : '?';
                campFbLink = `${adAccountLink}${sep}selected_campaign_ids=${campId}`;
            } else {
                campFbLink = `https://adsmanager.facebook.com/adsmanager/manage/campaigns?selected_campaign_ids=${campId}`;
            }
        }

        const effCount = Number(c.total_effective_count) || 0;
        const ratio = maxEffCount > 0 ? effCount / maxEffCount : 0;
        let effBadgeStyle = '';
        if (effCount === 0) {
            effBadgeStyle = 'background: #fee2e2; color: #dc2626; font-weight: 700; border: 1px solid #fca5a5;';
        } else if (effCount === maxEffCount || ratio >= 0.95) {
            effBadgeStyle = 'background: linear-gradient(135deg, #d946ef, #ec4899); color: white; font-weight: 900; box-shadow: 0 4px 12px rgba(217,70,239,0.45); text-shadow: 0 1px 2px rgba(0,0,0,0.3);';
        } else if (ratio >= 0.85) {
            effBadgeStyle = 'background: #00ff66; color: #052e16; font-weight: 900; box-shadow: 0 0 10px rgba(0,255,102,0.45);';
        } else if (ratio >= 0.75) {
            effBadgeStyle = 'background: #10b981; color: white; font-weight: 800; box-shadow: 0 2px 6px rgba(16,185,129,0.3);';
        } else if (ratio >= 0.65) {
            effBadgeStyle = 'background: #34d399; color: #064e3b; font-weight: 800;';
        } else if (ratio >= 0.50) {
            effBadgeStyle = 'background: #6ee7b7; color: #064e3b; font-weight: 800;';
        } else if (ratio >= 0.35) {
            effBadgeStyle = 'background: #a7f3d0; color: #065f46; font-weight: 800;';
        } else if (ratio >= 0.20) {
            effBadgeStyle = 'background: #dcfce7; color: #15803d; font-weight: 700;';
        } else {
            effBadgeStyle = 'background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; font-weight: 700;';
        }

        const gt70k = Number(c.run_count_gt70k) || 0;
        const effRate = gt70k > 0 ? (effCount / gt70k) * 100 : 0;
        const effRateStr = gt70k > 0 ? effRate.toFixed(2).replace('.', ',') + '%' : '-';

        let effRateBadgeStyle = '';
        if (gt70k === 0) {
            effRateBadgeStyle = 'background: #f1f5f9; color: #94a3b8; border: 1px solid #cbd5e1; font-weight: 700;';
        } else if (effRate >= 100) {
            effRateBadgeStyle = 'background: #eff6ff; color: #1d4ed8; border: 1.5px solid #93c5fd; font-weight: 900; box-shadow: 0 2px 6px rgba(29,78,216,0.15);';
        } else if (effRate >= 80) {
            effRateBadgeStyle = 'background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; font-weight: 800;';
        } else if (effRate >= 65) {
            effRateBadgeStyle = 'background: #dcfce7; color: #15803d; border: 1px solid #86efac; font-weight: 800;';
        } else if (effRate >= 50) {
            effRateBadgeStyle = 'background: #fef3c7; color: #b45309; border: 1px solid #fde68a; font-weight: 800;';
        } else {
            effRateBadgeStyle = 'background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; font-weight: 800;';
        }

        return `<tr style="border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.15s;" onmouseover="this.style.background='#fafbff'" onmouseout="this.style.background='white'" onclick="if(!event.target.closest('button') && !event.target.closest('a') && !event.target.closest('.no-row-click')) _cdAdsViewDetail(${c.id})">
            <td style="padding:10px 12px;font-size:12px;font-weight:800;color:#64748b;text-align:center;">${idx + 1}</td>
            <td class="no-row-click" onclick="event.stopPropagation(); _cdAdsGoToKhoAdsItem(${c.kho_ads_item_id || 'null'})" style="padding:10px 8px;cursor:pointer;" title="Xem mẫu tại Kho Video/Ảnh Ads">
                <div style="width:44px;height:44px;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;${thumbStyle}">${thumbContent}</div>
            </td>
            <td class="no-row-click" onclick="event.stopPropagation(); _cdAdsGoToKhoAdsItem(${c.kho_ads_item_id || 'null'})" style="padding:10px 8px;cursor:pointer;" title="Xem mẫu tại Kho Video/Ảnh Ads">
                <div style="font-size:13px;font-weight:800;color:#0f172a;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(c.campaign_name || '').replace(/"/g, '&quot;')}">${c.campaign_name || '-'}</div>
                <div style="font-size:11px;color:#64748b;font-weight:600;">${c.linh_vuc || ''} ${c.media_type === 'video' ? '🎥' : '🖼️'}</div>
            </td>
            <td style="padding:10px 8px;text-align:center;">
                <span style="background:${c.channel_color || '#6366f1'}22;color:${c.channel_color || '#6366f1'};padding:4px 10px;border-radius:8px;font-size:11px;font-weight:800;white-space:nowrap;">${c.channel_icon || '📺'} ${c.channel_name || '-'}</span>
                ${c.ad_account_name ? `
                    <div class="no-row-click" ${adAccountLink ? `onclick="event.stopPropagation(); window.open('${adAccountLink}', '_blank')" style="font-size:10.5px;font-weight:700;color:#0284c7;margin-top:3px;cursor:pointer;text-decoration:underline;" title="Mở Trực Tiếp Tài Khoản Quảng Cáo Meta: ${adAccountLink}"` : `style="font-size:10.5px;font-weight:700;color:#0284c7;margin-top:3px;"`}>
                        💳 ${c.ad_account_name}
                    </div>
                ` : ''}
            </td>
            <td class="no-row-click" style="padding:10px 8px;text-align:center;">
                ${c.post_id ? `
                    <a href="https://fb.com/${c.post_id}" target="_blank" onclick="event.stopPropagation();" style="font-size:12px;font-weight:700;color:#2563eb;text-decoration:underline;display:block;" title="Mở Facebook: https://fb.com/${c.post_id}">${c.post_id}</a>
                ` : `<div style="font-size:12px;font-weight:600;color:#94a3b8;">-</div>`}
                ${c.camp_id ? `
                    <div style="font-family: monospace; font-size: 11px; color: #64748b; margin-top: 2px;" title="ID Camp chính: ${c.camp_id}">${c.camp_id}</div>
                ` : ''}
                ${(c.extra_camps && c.extra_camps.length > 0) ? c.extra_camps.map(ec => `
                    <div style="font-family: monospace; font-size: 11px; color: #64748b; margin-top: 2px;" title="ID Camp phụ: ${ec.camp_id || ec.post_id}${ec.note ? ' (' + ec.note + ')' : ''}">${ec.camp_id || ec.post_id}</div>
                `).join('') : ''}
                <div style="margin-top: 5px; display: flex; align-items: center; justify-content: center; gap: 4px; flex-wrap: wrap;">
                    ${c.board_task_code ? `
                        <span style="background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; border-radius: 6px; padding: 3px 8px; font-weight: 800; font-size: 11px; box-shadow: 0 2px 5px rgba(124,58,237,0.3); display: inline-flex; align-items: center; gap: 3px;" title="Công việc liên kết từ Bảng Công Việc: ${c.board_task_code}${c.board_task_title ? ' - ' + (c.board_task_title || '').replace(/"/g, '&quot;') : ''}">
                            📋 ${c.board_task_code}
                        </span>
                    ` : ''}
                    <button onclick="event.stopPropagation(); _cdAdsOpenAddExtraCampModal(${c.id})" style="background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; border-radius: 6px; padding: 3px 8px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 800; font-size: 11.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 3px;" title="Gắn Thêm ID Camp / Post ID cho chiến dịch này" onmouseover="this.style.background='#4338ca';this.style.color='white'" onmouseout="this.style.background='#eef2ff';this.style.color='#4338ca'">
                        <span>➕ Gắn Camp</span>
                    </button>
                </div>
            </td>
            <td style="padding:10px 8px;font-size:12px;font-weight:700;color:#0f172a;text-align:right;">${fmtMoney(c.total_spend)}</td>
            <td style="padding:10px 8px;font-size:12px;font-weight:700;color:#334155;text-align:center;">${fmtNum(c.total_messages)}</td>
            <td style="padding:10px 8px;font-size:12px;font-weight:700;color:${Number(c.avg_cpa) > 0 && Number(c.avg_cpa) <= 75000 ? '#16a34a' : '#334155'};text-align:right;">${(!c.total_messages || Number(c.total_messages) === 0 || Number(c.avg_cpa) >= 999999 || Number(c.avg_cpa) <= 0) ? '<span style="color:#94a3b8;font-weight:600;">-</span>' : fmtMoney(c.avg_cpa)}</td>
            <td style="padding:10px 8px;font-size:12px;font-weight:700;color:#334155;text-align:right;">${fmtMoney(c.avg_cpc)}</td>
            <td style="padding:10px 8px;font-size:12px;font-weight:700;color:#334155;text-align:center;">${c.avg_ctr ? Number(c.avg_ctr).toFixed(2) + '%' : '-'}</td>
            <td style="padding:10px 8px;font-size:12px;font-weight:700;color:#334155;text-align:right;">${fmtMoney(c.avg_cpm)}</td>
            <td style="padding:10px 8px;font-size:12px;font-weight:700;color:#334155;text-align:center;">${fmtNum(c.total_run_count)}</td>
            <td style="padding:10px 8px;text-align:center;">
                <span style="background:#f3e8ff;color:#7e22ce;padding:3px 8px;border-radius:10px;font-size:11.5px;font-weight:800;">${fmtNum(c.run_count_gt70k)}</span>
            </td>
            <td style="padding:10px 8px;text-align:center;">
                <span style="display:inline-block;padding:4px 12px;border-radius:8px;font-size:12.5px;${effBadgeStyle}">${fmtNum(effCount)}</span>
            </td>
            <td style="padding:10px 8px;text-align:center;">
                <span style="display:inline-block;padding:4px 10px;border-radius:10px;font-size:12.5px;${effRateBadgeStyle}">${effRateStr}</span>
            </td>
            <td style="padding:10px 8px;text-align:center;">
                <div style="font-size:12px;font-weight:700;color:#334155;">${c.created_by_name || '-'}</div>
                <div style="font-size:10px;color:#94a3b8;font-weight:600;">${c.created_at ? new Date(c.created_at).toLocaleDateString('vi-VN') : '-'}</div>
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <table style="width: 100%; border-collapse: collapse; min-width: 1400px;">
            <thead>
                <tr style="background: linear-gradient(135deg, #0f172a, #1e1b4b); border-bottom: 2px solid #334155;">
                    <th onclick="_cdAdsToggleSort('id')" style="padding:12px 12px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:center;white-space:nowrap;letter-spacing:0.5px;cursor:pointer;user-select:none;" title="Sắp xếp theo STT / ID">STT ${_cdAdsSortIcon('id')}</th>
                    <th style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:center;white-space:nowrap;letter-spacing:0.5px;">ẢNH</th>
                    <th onclick="_cdAdsToggleSort('campaign_name')" style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:left;white-space:nowrap;letter-spacing:0.5px;cursor:pointer;user-select:none;" title="Sắp xếp theo Tên Chiến Dịch">TÊN CHIẾN DỊCH ${_cdAdsSortIcon('campaign_name')}</th>
                    <th onclick="_cdAdsToggleSort('channel_name')" style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:center;white-space:nowrap;letter-spacing:0.5px;cursor:pointer;user-select:none;" title="Sắp xếp theo Kênh / Tài Khoản">KÊNH ${_cdAdsSortIcon('channel_name')}</th>
                    <th onclick="_cdAdsToggleSort('post_id')" style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:center;white-space:nowrap;letter-spacing:0.5px;cursor:pointer;user-select:none;" title="Sắp xếp theo ID Post / ID Camp">ID POST / ID CAMP ${_cdAdsSortIcon('post_id')}</th>
                    <th onclick="_cdAdsToggleSort('total_spend')" style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:right;white-space:nowrap;letter-spacing:0.5px;cursor:pointer;user-select:none;" data-tooltip="Số tiền chi cho quảng cáo chiến dịch.">NGÂN SÁCH ${_cdAdsSortIcon('total_spend')}</th>
                    <th onclick="_cdAdsToggleSort('total_messages')" style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:center;white-space:nowrap;letter-spacing:0.5px;cursor:pointer;user-select:none;" data-tooltip="Số mess tin nhắn từ khách hàng.">TIN NHẮN ${_cdAdsSortIcon('total_messages')}</th>
                    <th onclick="_cdAdsToggleSort('avg_cpa')" style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:right;white-space:nowrap;letter-spacing:0.5px;cursor:pointer;user-select:none;" data-tooltip="Chi phí giá tiền / tin nhắn khách.">CPA ${_cdAdsSortIcon('avg_cpa')}</th>
                    <th onclick="_cdAdsToggleSort('avg_cpc')" style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:right;white-space:nowrap;letter-spacing:0.5px;cursor:pointer;user-select:none;" data-tooltip="Chi phí / mỗi lượt click vào quảng cáo.&#10;Ví dụ: Bạn chạy quảng cáo hết 1.000.000đ và có 2.000 lượt click&#10;CPC = 1.000.000 ÷ 2.000 = 500đ/click&#10;CPC càng thấp → Bạn đang mua được lượt click càng rẻ.">CPC ${_cdAdsSortIcon('avg_cpc')}</th>
                    <th onclick="_cdAdsToggleSort('avg_ctr')" style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:center;white-space:nowrap;letter-spacing:0.5px;cursor:pointer;user-select:none;" data-tooltip="Tỷ lệ % nhấp vào quảng cáo.&#10;Ví dụ: Quảng cáo hiển thị: 10.000 lần, có 300 lượt click&#10;CTR = 300 ÷ 10.000 × 100% = 3%&#10;CTR càng cao → Quảng cáo càng thu hút người xem nhấp.">CTR ${_cdAdsSortIcon('avg_ctr')}</th>
                    <th onclick="_cdAdsToggleSort('avg_cpm')" style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:right;white-space:nowrap;letter-spacing:0.5px;cursor:pointer;user-select:none;" data-tooltip="Chi phí cho 1.000 lượt hiển thị quảng cáo.&#10;Ví dụ: Chi phí quảng cáo: 500.000đ, lượt hiển thị: 100.000&#10;CPM = 500.000 ÷ 100.000 × 1.000 = 5.000đ&#10;CPM càng thấp → Bạn mua được 1.000 lượt hiển thị càng rẻ.">CPM ${_cdAdsSortIcon('avg_cpm')}</th>
                    <th onclick="_cdAdsToggleSort('total_run_count')" style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:center;white-space:nowrap;letter-spacing:0.5px;cursor:pointer;user-select:none;" data-tooltip="Số lần quảng cáo chạy mất tiền,&#10;bao gồm cả những lần chạy vài nghìn,&#10;vài trăm đồng.">SL CHẠY TỔNG ${_cdAdsSortIcon('total_run_count')}</th>
                    <th onclick="_cdAdsToggleSort('run_count_gt70k')" style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:center;white-space:nowrap;letter-spacing:0.5px;cursor:pointer;user-select:none;" data-tooltip="Số lần chạy thực tế đạt ngưỡng chi tiêu&#10;(loại bỏ các ngân sách chạy dở vài nghìn,&#10;vài trăm đồng không có tin nhắn).">SL CHẠY THỰC ${_cdAdsSortIcon('run_count_gt70k')}</th>
                    <th onclick="_cdAdsToggleSort('total_effective_count')" style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:center;white-space:nowrap;letter-spacing:0.5px;cursor:pointer;user-select:none;" data-tooltip="Số lần quảng cáo được đánh giá là đạt&#10;hiệu quả theo tiêu chí CPA.">SL HIỆU QUẢ ${_cdAdsSortIcon('total_effective_count')}</th>
                    <th onclick="_cdAdsToggleSort('eff_rate')" style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:center;white-space:nowrap;letter-spacing:0.5px;cursor:pointer;user-select:none;" data-tooltip="Tỷ lệ % Hiệu Quả =&#10;(SL Hiệu Quả / SL Chạy Thực) * 100%">% HIỆU QUẢ ${_cdAdsSortIcon('eff_rate')}</th>
                    <th onclick="_cdAdsToggleSort('created_at')" style="padding:12px 8px;font-size:11.5px;font-weight:800;color:#ffffff;text-align:center;white-space:nowrap;letter-spacing:0.5px;cursor:pointer;user-select:none;" title="Sắp xếp theo Người Tạo / Ngày">NGƯỜI TẠO ${_cdAdsSortIcon('created_at')}</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

function _cdAdsPopulateUserFilter() {
    const sel = document.getElementById('cdAdsFilterUser');
    if (!sel) return;
    const userMap = {};
    _cdAdsState.campaigns.forEach(c => {
        if (c.created_by && c.created_by_name) {
            userMap[c.created_by] = c.created_by_name;
        }
    });
    const current = sel.value;
    sel.innerHTML = '<option value="all">👤 Tất cả nhân viên</option>' +
        Object.entries(userMap).map(([id, name]) => `<option value="${id}">${name}</option>`).join('');
    sel.value = current;
}

// ========== FILTERS ==========

function _cdAdsApplyFilters() {
    _cdAdsLoadCampaigns();
}

function _cdAdsResetFilters() {
    _cdAdsState.filterStatus = 'all';
    _cdAdsState.filterChannel = 'all';
    _cdAdsState.filterSearch = '';
    _cdAdsState.filterDateMode = 'month';
    _cdAdsState.filterMonth = 'all';
    _cdAdsState.filterYear = new Date().getFullYear();
    _cdAdsState.filterQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
    _cdAdsState.filterStartDate = '';
    _cdAdsState.filterEndDate = '';

    const searchInput = document.getElementById('cdAdsSearchInput');
    const channelSel = document.getElementById('cdAdsFilterChannel');
    const userSel = document.getElementById('cdAdsFilterUser');
    const dateModeSel = document.getElementById('cdAdsDateModeSelect');
    const monthSel = document.getElementById('cdAdsMonthSelect');

    if (searchInput) searchInput.value = '';
    if (channelSel) channelSel.value = 'all';
    if (userSel) userSel.value = 'all';
    if (dateModeSel) dateModeSel.value = 'month';
    if (monthSel) monthSel.value = 'all';

    _cdAdsOnDateModeChange();
}

// ========== CHANNEL MODAL ==========

function _cdAdsOpenChannelModal() {
    // Deprecated modal
}

function _cdAdsCloseChannelModal() {
    // Deprecated modal
}

// ========== CREATE CAMPAIGN MODAL (4 BƯỚC LIÊN KẾT TÀI KHOẢN ADS & META GRAPH API) ==========

async function _cdAdsOpenCreateModal() {
    document.getElementById('cdAdsCreateModal').style.display = 'flex';
    // Load pending test tasks từ Bảng Công Việc
    const taskSel = document.getElementById('cdAdsCreateTaskSelect');
    const taskReqStar = document.getElementById('cdAdsTaskReqStar');
    if (taskSel) {
        taskSel.innerHTML = '<option value="">⏳ Đang tải danh sách công việc từ Bảng Công Việc...</option>';
        try {
            const tData = await _cdAdsApi('/api/chiendich-ads/pending-test-tasks');
            const pendingTasks = tData.tasks || [];
            window._cdAdsPendingTasks = pendingTasks;

            if (pendingTasks.length > 0) {
                if (taskReqStar) taskReqStar.style.display = 'inline';
                taskSel.innerHTML = '<option value="">-- Chọn Công Việc Test Camp liên kết --</option>' +
                    pendingTasks.map(t => `<option value="${t.id}">${t.task_code} (${t.linked_count}/${t.target_quantity} Test Camp) - ${t.title}</option>`).join('');
            } else {
                if (taskReqStar) taskReqStar.style.display = 'none';
                taskSel.innerHTML = '<option value="">-- Không có công việc test camp cần liên kết --</option>';
            }
        } catch(e) {
            console.error('Pending tasks fetch error:', e);
            if (taskSel) taskSel.innerHTML = '<option value="">-- Không có công việc test camp cần liên kết --</option>';
        }
    }

    // Load items từ kho ads
    try {
        const data = await _cdAdsApi('/api/ads-campaigns/my-items');
        _cdAdsState.myItems = data.items || [];
        const sel = document.getElementById('cdAdsCreateItemSelect');
        if (sel) {
            sel.innerHTML = '<option value="">-- Chọn mẫu Video/Ảnh Ads --</option>' +
                _cdAdsState.myItems.map(i => `<option value="${i.id}">${i.title} (${i.linh_vuc || ''} • ${i.media_type === 'video' ? '🎥 Video' : '🖼️ Ảnh'})</option>`).join('');
        }
    } catch(e) { console.error(e); }

    // Load channel buttons từ Cài Đặt Tài Khoản Ads
    _cdAdsRenderCreateChannels();

    // Reset form states
    window._cdAdsSelectedPlatform = null;
    window._cdAdsSelectedAdAccount = null;
    window._cdAdsSelectedCampaign = null;
    window._cdAdsCurrentAccountCampaigns = [];

    const postIdInput = document.getElementById('cdAdsCreatePostId');
    const campIdInput = document.getElementById('cdAdsCreateCampId');
    const campNameInput = document.getElementById('cdAdsCreateCampaignName');
    if (postIdInput) postIdInput.value = '';
    if (campIdInput) campIdInput.value = '';
    if (campNameInput) campNameInput.value = '';

    const step3Box = document.getElementById('cdAdsStep3Box');
    const step4Box = document.getElementById('cdAdsStep4Box');
    if (step3Box) step3Box.style.display = 'none';
    if (step4Box) step4Box.style.display = 'none';
}

function _cdAdsCloseCreateModal() {
    document.getElementById('cdAdsCreateModal').style.display = 'none';
}

function _cdAdsRenderCreateChannels() {
    const box = document.getElementById('cdAdsCreateChannelList');
    if (!box) return;
    box.innerHTML = _cdAdsState.channels.map(ch => `
        <button onclick="_cdAdsSelectChannel('${ch.id}', this)" data-channel-id="${ch.id}" style="padding:10px 18px;border:2px solid #e2e8f0;border-radius:12px;background:white;cursor:pointer;font-size:14px;font-weight:700;color:#334155;display:flex;align-items:center;gap:8px;transition:all 0.2s;">
            <span style="font-size:18px;">${ch.icon || '📺'}</span>
            <span>${ch.name}</span>
        </button>
    `).join('');
}

async function _cdAdsSelectChannel(platformId, btn) {
    window._cdAdsSelectedPlatform = platformId;
    window._cdAdsSelectedAdAccount = null;
    window._cdAdsSelectedCampaign = null;
    window._cdAdsCurrentAccountCampaigns = [];

    // Highlight selected button
    const allBtns = document.querySelectorAll('#cdAdsCreateChannelList button');
    allBtns.forEach(b => {
        b.style.borderColor = '#e2e8f0';
        b.style.background = 'white';
        b.style.color = '#334155';
    });
    if (btn) {
        btn.style.borderColor = '#4338ca';
        btn.style.background = '#eef2ff';
        btn.style.color = '#4338ca';
    }

    // Load ad accounts for this platform
    await _cdAdsLoadAccountsForPlatform(platformId);
}

async function _cdAdsLoadAccountsForPlatform(platformId) {
    const step3Box = document.getElementById('cdAdsStep3Box');
    const accSelect = document.getElementById('cdAdsCreateAdAccountSelect');
    const step4Box = document.getElementById('cdAdsStep4Box');

    if (step4Box) step4Box.style.display = 'none';
    const campIdInput = document.getElementById('cdAdsCreateCampId');
    if (campIdInput) campIdInput.value = '';

    if (!step3Box || !accSelect) return;
    step3Box.style.display = 'block';
    accSelect.innerHTML = '<option value="">⏳ Đang tải tài khoản QC từ Cài Đặt Tài Khoản Ads... </option>';

    try {
        const res = await _cdAdsApi(`/api/ads-campaigns/accounts-by-platform?platform=${encodeURIComponent(platformId)}`);
        const accounts = res.accounts || [];
        window._cdAdsPlatformAccounts = accounts;

        if (accounts.length === 0) {
            accSelect.innerHTML = `<option value="">⚠️ Chưa có "Tài khoản chạy test" nào cho kênh "${platformId.toUpperCase()}" ở Cài Đặt Tài Khoản Ads</option>`;
        } else {
            accSelect.innerHTML = `<option value="">-- Chọn Tài Khoản QC Chạy Test (${accounts.length} tài khoản) --</option>` +
                accounts.map(acc => `<option value="${acc.id}">🧪 ${acc.account_name} (${acc.fb_ad_account_id || acc.platform}) ${acc.linh_vuc_name ? '• LV: ' + acc.linh_vuc_name : ''} ${acc.assigned_staff_name ? '• NV: ' + acc.assigned_staff_name : ''}</option>`).join('');
        }
    } catch(e) {
        accSelect.innerHTML = '<option value="">🔴 Lỗi tải danh sách tài khoản QC</option>';
    }

    _cdAdsUpdateCampaignName();
}

async function _cdAdsOnAdAccountSelect() {
    const accId = document.getElementById('cdAdsCreateAdAccountSelect')?.value;
    window._cdAdsSelectedAdAccount = accId || null;
    window._cdAdsSelectedCampaign = null;
    window._cdAdsCurrentAccountCampaigns = [];

    const step4Box = document.getElementById('cdAdsStep4Box');
    const campSelect = document.getElementById('cdAdsCreateCampaignSelect');
    const campIdInput = document.getElementById('cdAdsCreateCampId');
    if (campIdInput) campIdInput.value = '';

    if (!accId) {
        if (step4Box) step4Box.style.display = 'none';
        _cdAdsUpdateCampaignName();
        return;
    }

    if (step4Box) step4Box.style.display = 'block';
    if (campSelect) campSelect.innerHTML = '<option value="">⏳ Đang tải danh sách chiến dịch Camp từ Facebook API...</option>';

    try {
        const res = await _cdAdsApi(`/api/ads-campaigns/ad-account-campaigns?account_id=${accId}`);
        if (res.error) {
            alert(res.error);
            if (campSelect) campSelect.innerHTML = `<option value="">🔴 ${res.error}</option>`;
            _cdAdsUpdateCampaignName();
            return;
        }

        const rawCampaigns = res.campaigns || [];

        // Tập hợp tất cả các mã Camp ID đã được gắn ở bất kỳ mẫu nào trong hệ thống
        const attachedCampIds = new Set();
        (_cdAdsState.campaigns || []).forEach(c => {
            if (c.camp_id) attachedCampIds.add(String(c.camp_id).trim());
            if (c.extra_camps && Array.isArray(c.extra_camps)) {
                c.extra_camps.forEach(ec => {
                    if (ec.camp_id) attachedCampIds.add(String(ec.camp_id).trim());
                });
            }
        });

        // Lọc bỏ những chiến dịch có ID đã được gắn trong hệ thống
        const campaigns = rawCampaigns.filter(c => !attachedCampIds.has(String(c.id).trim()));
        window._cdAdsCurrentAccountCampaigns = campaigns;

        if (campSelect) {
            if (campaigns.length === 0) {
                campSelect.innerHTML = '<option value="">⚠️ Tất cả chiến dịch trong tài khoản QC này đều đã được gắn trong hệ thống</option>';
            } else {
                campSelect.innerHTML = `<option value="">-- Chọn Chiến Dịch (${campaigns.length} chiến dịch chưa gắn) --</option>` +
                    campaigns.map(c => `<option value="${c.id}">[${c.effective_status || c.status || 'OFF'}] ${c.name} (ID: ${c.id})</option>`).join('');
            }
        }
    } catch(e) {
        if (campSelect) campSelect.innerHTML = '<option value="">🔴 Lỗi kết nối lấy danh sách chiến dịch</option>';
    }

    _cdAdsUpdateCampaignName();
}

function _cdAdsOnCampaignSelect() {
    const campId = document.getElementById('cdAdsCreateCampaignSelect')?.value;
    const campInput = document.getElementById('cdAdsCreateCampId');
    const postInput = document.getElementById('cdAdsCreatePostId');

    if (campId) {
        if (campInput) campInput.value = campId;
        const campObj = (window._cdAdsCurrentAccountCampaigns || []).find(c => String(c.id) === String(campId));
        window._cdAdsSelectedCampaign = campObj || null;
        if (postInput) {
            postInput.value = (campObj && campObj.post_id) ? campObj.post_id : campId;
        }
    } else {
        window._cdAdsSelectedCampaign = null;
        if (campInput) campInput.value = '';
        if (postInput) postInput.value = '';
    }

    _cdAdsUpdateCampaignName();
}

function _cdAdsOnItemSelect() {
    const sel = document.getElementById('cdAdsCreateItemSelect');
    const itemId = sel?.value;
    const preview = document.getElementById('cdAdsCreateItemPreview');

    if (itemId && preview) {
        const item = _cdAdsState.myItems.find(i => String(i.id) === String(itemId));
        if (item) {
            preview.style.display = 'flex';
            preview.innerHTML = `
                <div style="width:60px;height:60px;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;flex-shrink:0;${item.thumbnail_url ? `background-image:url('${item.thumbnail_url}');background-size:cover;background-position:center;` : 'background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:24px;'}">
                    ${item.thumbnail_url ? '' : (item.media_type === 'video' ? '🎥' : '🖼️')}
                </div>
                <div>
                    <div style="font-size:13px;font-weight:800;color:#0f172a;">${item.title}</div>
                    <div style="font-size:11px;color:#64748b;font-weight:600;">${item.linh_vuc || ''} • ${item.media_type === 'video' ? '🎥 Video Ads' : '🖼️ Ảnh Ads'} • Tạo bởi: ${item.created_by_name || ''}</div>
                </div>
            `;
        }
    } else if (preview) {
        preview.style.display = 'none';
    }
    _cdAdsUpdateCampaignName();
}

function _cdAdsUpdateCampaignName() {
    const itemId = document.getElementById('cdAdsCreateItemSelect')?.value;
    const platformId = window._cdAdsSelectedPlatform;
    const accId = window._cdAdsSelectedAdAccount;
    const campObj = window._cdAdsSelectedCampaign;
    const nameInput = document.getElementById('cdAdsCreateCampaignName');
    if (!nameInput) return;

    const item = _cdAdsState.myItems.find(i => String(i.id) === String(itemId));
    const channel = _cdAdsState.channels.find(ch => String(ch.id) === String(platformId));
    const accObj = (window._cdAdsPlatformAccounts || []).find(a => String(a.id) === String(accId));

    let parts = [];
    if (item) parts.push(item.title);
    if (accObj) parts.push(accObj.account_name);
    else if (channel) parts.push(channel.name);

    if (campObj && campObj.name) parts.push(campObj.name);

    nameInput.value = parts.join(' - ');
}

async function _cdAdsSubmitCreate() {
    const taskSelVal = document.getElementById('cdAdsCreateTaskSelect')?.value;
    const itemId = document.getElementById('cdAdsCreateItemSelect')?.value;
    const platformId = window._cdAdsSelectedPlatform;
    const accId = window._cdAdsSelectedAdAccount;
    const campId = document.getElementById('cdAdsCreateCampId')?.value;
    const postId = document.getElementById('cdAdsCreatePostId')?.value;
    const campaignName = document.getElementById('cdAdsCreateCampaignName')?.value;

    const pendingTasks = window._cdAdsPendingTasks || [];
    if (pendingTasks.length > 0 && !taskSelVal) {
        return alert('⚠️ Vui lòng chọn Công Việc Test Camp liên kết từ Bảng Công Việc!');
    }

    if (!itemId) return alert('Vui lòng chọn mẫu từ Kho Ads (Bước 1)!');
    if (!platformId) return alert('Vui lòng chọn kênh quảng cáo (Bước 2)!');
    if (!accId) return alert('Vui lòng chọn tài khoản quảng cáo (Bước 3)!');
    if (!campId) return alert('Vui lòng chọn hoặc nhập ID Camp (Bước 4)!');

    const channelObj = _cdAdsState.channels.find(ch => String(ch.id) === String(platformId));

    try {
        const res = await _cdAdsApi('/api/ads-campaigns', 'POST', {
            board_task_id: taskSelVal ? Number(taskSelVal) : null,
            kho_ads_item_id: Number(itemId),
            ad_account_id: Number(accId),
            channel_name: channelObj ? channelObj.name : platformId,
            post_id: postId,
            camp_id: campId,
            campaign_name: campaignName
        });
        if (res.error) return alert(res.error);
        _cdAdsCloseCreateModal();
        await _cdAdsLoadAll();
        alert('🎉 Liên kết mẫu & chiến dịch camp thành công!');
    } catch(e) { alert('Lỗi: ' + e.message); }
}

// ========== REPORT MODAL ==========

function _cdAdsOpenReportModal(campaignId, campaignName) {
    document.getElementById('cdAdsReportModal').style.display = 'flex';
    document.getElementById('cdAdsReportCampaignId').value = campaignId;
    document.getElementById('cdAdsReportModalSub').textContent = campaignName || '';
    // Set default date to today
    document.getElementById('cdAdsReportDate').value = new Date().toISOString().split('T')[0];
    // Clear fields
    ['cdAdsRptNganSach', 'cdAdsRptTinNhan', 'cdAdsRptCpa', 'cdAdsRptCtr', 'cdAdsRptCpm', 'cdAdsRptSoLanChay', 'cdAdsRptHieuQua'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    // Load existing report for today if any
    _cdAdsLoadExistingReport(campaignId);
}

async function _cdAdsLoadExistingReport(campaignId) {
    try {
        const data = await _cdAdsApi(`/api/ads-campaigns/${campaignId}/reports`);
        const reports = data.reports || [];
        const today = new Date().toISOString().split('T')[0];
        const todayReport = reports.find(r => r.report_date && r.report_date.startsWith(today));
        if (todayReport) {
            document.getElementById('cdAdsRptNganSach').value = todayReport.tong_ngan_sach || '';
            document.getElementById('cdAdsRptTinNhan').value = todayReport.tin_nhan || '';
            document.getElementById('cdAdsRptCpa').value = todayReport.cpa || '';
            document.getElementById('cdAdsRptCtr').value = todayReport.ctr || '';
            document.getElementById('cdAdsRptCpm').value = todayReport.cpm || '';
            document.getElementById('cdAdsRptSoLanChay').value = todayReport.so_lan_chay || '';
            document.getElementById('cdAdsRptHieuQua').value = todayReport.so_lan_hieu_qua || '';
        }
    } catch(e) { /* ignore */ }
}

function _cdAdsCloseReportModal() {
    document.getElementById('cdAdsReportModal').style.display = 'none';
}

async function _cdAdsSubmitReport() {
    const campaignId = document.getElementById('cdAdsReportCampaignId')?.value;
    if (!campaignId) return;

    const body = {
        report_date: document.getElementById('cdAdsReportDate')?.value,
        tong_ngan_sach: document.getElementById('cdAdsRptNganSach')?.value || 0,
        tin_nhan: document.getElementById('cdAdsRptTinNhan')?.value || 0,
        cpa: document.getElementById('cdAdsRptCpa')?.value || 0,
        ctr: document.getElementById('cdAdsRptCtr')?.value || 0,
        cpm: document.getElementById('cdAdsRptCpm')?.value || 0,
        so_lan_chay: document.getElementById('cdAdsRptSoLanChay')?.value || 0,
        so_lan_hieu_qua: document.getElementById('cdAdsRptHieuQua')?.value || 0
    };

    try {
        const res = await _cdAdsApi(`/api/ads-campaigns/${campaignId}/reports`, 'POST', body);
        if (res.error) return alert(res.error);
        _cdAdsCloseReportModal();
        await _cdAdsLoadAll();
        alert('✅ Đã lưu báo cáo thành công!');
    } catch(e) { alert('Lỗi: ' + e.message); }
}

// ========== CHANGE STATUS ==========

async function _cdAdsChangeStatus(campaignId) {
    const choice = prompt('Nhập trạng thái mới:\n1 = Mẫu Win ✅\n2 = Mẫu Lose ❌\n3 = Quay lại Chạy Test 🔵');
    if (!choice) return;

    let status;
    if (choice === '1') status = 'mau_win';
    else if (choice === '2') status = 'mau_lose';
    else if (choice === '3') status = 'chay_test';
    else return alert('Lựa chọn không hợp lệ!');

    if (!confirm(`Xác nhận đổi trạng thái sang "${status === 'mau_win' ? '✅ Mẫu Win' : status === 'mau_lose' ? '❌ Mẫu Lose' : '🔵 Chạy Test'}"?`)) return;

    try {
        const res = await _cdAdsApi(`/api/ads-campaigns/${campaignId}/status`, 'PUT', { status });
        if (res.error) return alert(res.error);
        await _cdAdsLoadAll();
        alert('✅ Đã cập nhật trạng thái!');
    } catch(e) { alert('Lỗi: ' + e.message); }
}

// ========== VIEW DETAIL ==========

async function _cdAdsViewDetail(campaignId) {
    document.getElementById('cdAdsDetailModal').style.display = 'flex';
    const body = document.getElementById('cdAdsDetailBody');
    body.innerHTML = '<div style="text-align:center;color:#64748b;padding:40px;">⏳ Đang tải...</div>';

    try {
        const camp = _cdAdsState.campaigns.find(c => c.id === campaignId);
        const data = await _cdAdsApi(`/api/ads-campaigns/${campaignId}/reports`);
        const reports = data.reports || [];

        if (camp) {
            document.getElementById('cdAdsDetailTitle').textContent = camp.campaign_name || 'Chi Tiết Chiến Dịch';
        }

        const statusBadge = (s) => {
            if (s === 'chay_test') return '<span style="background:#dbeafe;color:#1d4ed8;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:800;">🔵 Chạy Test</span>';
            if (s === 'mau_win') return '<span style="background:#dcfce7;color:#15803d;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:800;">✅ Mẫu Win</span>';
            if (s === 'mau_lose') return '<span style="background:#fee2e2;color:#b91c1c;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:800;">❌ Mẫu Lose</span>';
            return s;
        };

        const fmtNum = (n) => n ? Number(n).toLocaleString('vi-VN') : '0';
        const fmtMoney = (n) => n ? Math.round(Number(n)).toLocaleString('vi-VN') + 'đ' : '0đ';

        // Summary section
        let html = '';
        if (camp) {
            let modalAdAccLink = camp.fb_ad_account_link || '';
            if (!modalAdAccLink && camp.fb_ad_account_id) {
                const rawId = String(camp.fb_ad_account_id).replace(/^act_/i, '');
                modalAdAccLink = `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${rawId}`;
            }
            let modalCampFbLink = '';
            if (camp.camp_id) {
                const campId = String(camp.camp_id).trim();
                if (modalAdAccLink) {
                    const sep = modalAdAccLink.includes('?') ? '&' : '?';
                    modalCampFbLink = `${modalAdAccLink}${sep}selected_campaign_ids=${campId}`;
                } else {
                    modalCampFbLink = `https://adsmanager.facebook.com/adsmanager/manage/campaigns?selected_campaign_ids=${campId}`;
                }
            }

            html += `
                <div style="display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap;">
                    ${camp.thumbnail_url ? `<div style="width:100px;height:100px;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;flex-shrink:0;background-image:url('${camp.thumbnail_url}');background-size:cover;background-position:center;"></div>` : ''}
                    <div style="flex:1;min-width:200px;">
                        <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:6px;">${camp.campaign_name || '-'}</div>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px;">
                            <span style="background:${camp.channel_color || '#6366f1'}22;color:${camp.channel_color || '#6366f1'};padding:3px 10px;border-radius:6px;font-size:12px;font-weight:800;">${camp.channel_icon || '📺'} ${camp.channel_name || ''}</span>
                            ${statusBadge(camp.status)}
                        </div>
                        <div style="font-size:12px;color:#64748b;font-weight:600;">
                            Post ID: ${camp.post_id ? `<a href="https://fb.com/${camp.post_id}" target="_blank" style="color:#2563eb;font-weight:700;text-decoration:underline;">${camp.post_id}</a>` : '<strong>-</strong>'} &nbsp;|&nbsp; 
                            Camp ID: <strong>${camp.camp_id || '-'}</strong>
                            &nbsp;|&nbsp; Người tạo: <strong>${camp.created_by_name || '-'}</strong>
                            &nbsp;|&nbsp; Ngày tạo: <strong>${camp.created_at ? new Date(camp.created_at).toLocaleDateString('vi-VN') : '-'}</strong>
                        </div>
                        ${camp.board_task_code ? `
                            <div style="margin-top: 8px; background: #f3e8ff; border: 1.5px solid #d8b4fe; border-radius: 10px; padding: 8px 12px; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 2px 6px rgba(124,58,237,0.1);">
                                <span style="font-size: 13px; font-weight: 900; color: #6b21a8;">📋 Liên kết Công việc:</span>
                                <span style="background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; padding: 3px 10px; border-radius: 6px; font-weight: 900; font-size: 12px; box-shadow: 0 2px 5px rgba(124,58,237,0.3);">${camp.board_task_code}</span>
                                ${camp.board_task_title ? `<span style="font-size: 12px; font-weight: 700; color: #581c87;">— ${camp.board_task_title}</span>` : ''}
                            </div>
                        ` : ''}
                        ${camp.drive_url ? `<div style="margin-top:6px;"><a href="${camp.drive_url}" target="_blank" style="font-size:12px;color:#2563eb;font-weight:700;text-decoration:none;">🔗 Mở Google Drive ↗</a></div>` : ''}

                        <!-- KHỐI QUẢN LÝ CAMP ID / POST ID BỔ SUNG -->
                        <div style="margin-top: 12px; padding: 12px 14px; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; display: flex; flex-direction: column; gap: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                                <span style="font-size: 13px; font-weight: 800; color: #1e1b4b; display: inline-flex; align-items: center; gap: 6px;">
                                    <span>🏷️ Mã ID Camp / Post ID Gắn Chạy Ads</span>
                                    <span style="background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 800;">${(camp.extra_camps || []).length + (camp.camp_id ? 1 : 0)} mã Camp (${camp.camp_id ? '1 chính, ' : ''}${(camp.extra_camps || []).length} phụ)</span>
                                </span>
                                <button onclick="_cdAdsOpenAddExtraCampModal(${camp.id})" style="padding: 6px 16px; background: #4338ca; color: white; border: none; border-radius: 8px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 800; font-size: 12.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 2px 6px rgba(67,56,202,0.25); transition: all 0.2s;" onmouseover="this.style.background='#3730a3'" onmouseout="this.style.background='#4338ca'">
                                    <span>➕</span> <span>Gắn Thêm ID Camp / Post ID</span>
                                </button>
                            </div>

                            <div id="cdAdsExtraCampsList_${camp.id}" style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">
                                ${_cdAdsRenderExtraCampsHTML(camp)}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Totals
            html += `
                <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:20px;">
                    <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:10px 14px;text-align:center;">
                        <div style="font-size:15px;font-weight:800;color:#4338ca;">${fmtMoney(camp.total_spend)}</div>
                        <div style="font-size:10px;font-weight:700;color:#6366f1;">Tổng Ngân Sách</div>
                    </div>
                    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:10px 14px;text-align:center;">
                        <div style="font-size:15px;font-weight:800;color:#16a34a;">${fmtNum(camp.total_messages)}</div>
                        <div style="font-size:10px;font-weight:700;color:#22c55e;">Tổng Tin Nhắn</div>
                    </div>
                    <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:10px;padding:10px 14px;text-align:center;">
                        <div style="font-size:15px;font-weight:800;color:#2563eb;">${fmtNum(camp.total_run_count)}</div>
                        <div style="font-size:10px;font-weight:700;color:#3b82f6;">Tổng Lần Chạy</div>
                    </div>
                    <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;padding:10px 14px;text-align:center;">
                        <div style="font-size:15px;font-weight:800;color:#7e22ce;">${fmtNum(camp.run_count_gt70k)}</div>
                        <div style="font-size:10px;font-weight:700;color:#9333ea;">Lần Chạy >70K</div>
                    </div>
                    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:10px 14px;text-align:center;">
                        <div style="font-size:15px;font-weight:800;color:#a16207;">${fmtNum(camp.total_effective_count)}</div>
                        <div style="font-size:10px;font-weight:700;color:#ca8a04;">Tổng Hiệu Quả</div>
                    </div>
                </div>
            `;
        }

        // Reports table
        html += `
            <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:10px;">📅 Nhật Ký Đồng Bộ Theo Ngày (${reports.length} bản ghi)</div>
        `;

        if (reports.length === 0) {
            html += '<div style="text-align:center;padding:30px;color:#9ca3af;font-size:13px;">Chưa có dữ liệu đồng bộ</div>';
        } else {
            html += `
                <div style="overflow-x:auto;border:1px solid #e2e8f0;border-radius:10px;">
                    <table style="width:100%;border-collapse:collapse;min-width:1150px;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #0f172a, #1e1b4b);">
                                <th style="padding:10px 12px;font-size:11px;font-weight:800;color:#ffffff;text-align:center;border-bottom:1px solid #334155;white-space:nowrap;">NGÀY</th>
                                <th style="padding:10px 12px;font-size:11px;font-weight:800;color:#ffffff;text-align:left;border-bottom:1px solid #334155;white-space:nowrap;">CHIẾN DỊCH / ID CAMP <span style="font-size:10px;opacity:0.6;">↕</span></th>
                                <th style="padding:10px 8px;font-size:11px;font-weight:800;color:#ffffff;text-align:right;border-bottom:1px solid #334155;white-space:nowrap;">NGÂN SÁCH</th>
                                <th style="padding:10px 8px;font-size:11px;font-weight:800;color:#ffffff;text-align:center;border-bottom:1px solid #334155;white-space:nowrap;">TIN NHẮN</th>
                                <th style="padding:10px 8px;font-size:11px;font-weight:800;color:#ffffff;text-align:right;border-bottom:1px solid #334155;white-space:nowrap;">CPA</th>
                                <th style="padding:10px 8px;font-size:11px;font-weight:800;color:#ffffff;text-align:right;border-bottom:1px solid #334155;white-space:nowrap;">CPC</th>
                                <th style="padding:10px 8px;font-size:11px;font-weight:800;color:#ffffff;text-align:center;border-bottom:1px solid #334155;white-space:nowrap;">CTR</th>
                                <th style="padding:10px 8px;font-size:11px;font-weight:800;color:#ffffff;text-align:right;border-bottom:1px solid #334155;white-space:nowrap;">CPM</th>
                                <th style="padding:10px 8px;font-size:11px;font-weight:800;color:#ffffff;text-align:center;border-bottom:1px solid #334155;white-space:nowrap;">SL CHẠY</th>
                                <th style="padding:10px 8px;font-size:11px;font-weight:800;color:#ffffff;text-align:center;border-bottom:1px solid #334155;white-space:nowrap;">HIỆU QUẢ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reports.map(r => `
                                <tr style="border-bottom:1px solid #f1f5f9;">
                                    <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#334155;text-align:center;white-space:nowrap;">${r.report_date ? new Date(r.report_date).toLocaleDateString('vi-VN') : '-'}</td>
                                    <td style="padding:8px 12px;text-align:left;">
                                        <div style="font-size:12.5px;font-weight:800;color:#0f172a;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(r.row_camp_name || '-').replace(/"/g, '&quot;')}">${r.row_camp_name || '-'}</div>
                                        <div style="font-family:monospace;font-size:11px;color:#64748b;font-weight:600;margin-top:1px;">${r.row_camp_id || '-'}</div>
                                    </td>
                                    <td style="padding:8px;font-size:12px;font-weight:700;color:#0f172a;text-align:right;">${fmtMoney(r.tong_ngan_sach)}</td>
                                    <td style="padding:8px;font-size:12px;font-weight:700;color:#334155;text-align:center;">${fmtNum(r.tin_nhan)}</td>
                                    <td style="padding:8px;font-size:12px;font-weight:700;color:${Number(r.cpa) > 0 && Number(r.cpa) <= 75000 ? '#16a34a' : '#334155'};text-align:right;">${fmtMoney(r.cpa)}</td>
                                    <td style="padding:8px;font-size:12px;font-weight:700;color:#334155;text-align:right;">${fmtMoney(r.cpc)}</td>
                                    <td style="padding:8px;font-size:12px;font-weight:700;color:#334155;text-align:center;">${r.ctr ? Number(r.ctr).toFixed(2) + '%' : '0%'}</td>
                                    <td style="padding:8px;font-size:12px;font-weight:700;color:#334155;text-align:right;">${fmtMoney(r.cpm)}</td>
                                    <td style="padding:8px;font-size:12px;font-weight:700;color:#334155;text-align:center;">${fmtNum(r.so_lan_chay)}</td>
                                    <td style="padding:8px;font-size:12px;font-weight:700;text-align:center;">${r.so_lan_hieu_qua ? '<span style="color:#16a34a;">✅ Đạt</span>' : '<span style="color:#94a3b8;">-</span>'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        body.innerHTML = html;
    } catch(e) {
        body.innerHTML = '<div style="color:red;padding:20px;">Lỗi tải chi tiết: ' + e.message + '</div>';
    }
}

function _cdAdsCloseDetailModal() {
    document.getElementById('cdAdsDetailModal').style.display = 'none';
}

// ========== DELETE CAMPAIGN ==========

async function _cdAdsDeleteCampaign(campaignId) {
    if (!confirm('Bạn có chắc muốn xóa chiến dịch này? Toàn bộ báo cáo hàng ngày sẽ bị xóa theo!')) return;
    try {
        const res = await _cdAdsApi(`/api/ads-campaigns/${campaignId}`, 'DELETE');
        if (res.error) return alert(res.error);
        await _cdAdsLoadAll();
        alert('✅ Đã xóa chiến dịch!');
    } catch(e) { alert('Lỗi: ' + e.message); }
}

function _cdAdsEnsureKhoAdsModalInDOM() {
    if (document.getElementById('modalCreateKhoAdsItem')) return;

    const div = document.createElement('div');
    div.id = 'cdAdsKhoModalContainer';
    div.innerHTML = `
        <div id="modalCreateKhoAdsItem" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); z-index: 9999; justify-content: center; align-items: center; padding: 20px; overflow-y: auto;">
            <div style="background: white; border-radius: 20px; width: 100%; max-width: 1100px; max-height: 92vh; box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.35); overflow: hidden; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <div style="background: linear-gradient(135deg, #0f172a, #4338ca); padding: 18px 24px; color: white; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;" id="lblKhoAdsModalIcon">📋</span>
                        <div>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 800;" id="lblKhoAdsModalTitle">Chi Tiết & Quản Lý Tư Liệu Ads Công Việc</h3>
                            <div style="font-size: 12px; opacity: 0.8;">Đăng tài nguyên Video/Ảnh chạy Quảng Cáo</div>
                        </div>
                    </div>
                    <button onclick="closeModalCreateKhoAdsItem()" style="background: rgba(255,255,255,0.2); border: none; font-size: 16px; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: white; font-weight: bold;">✕</button>
                </div>

                <div style="padding: 16px 24px 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 10px; flex-shrink: 0;">
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">🔗 Liên Kết Với Công Việc (PHÒNG MARKETING) <span style="color:#dc2626">*</span></label>
                        <select id="selKhoAdsTaskId" onchange="onKhoAdsTaskSelectChange()" style="width: 100%; padding: 11px 12px; border: 1.5px solid #6366f1; border-radius: 10px; font-size: 13.5px; font-weight: 700; outline: none; background: #eef2ff; color: #3730a3;">
                            <option value="">-- Vui lòng chọn Công Việc liên kết --</option>
                        </select>
                    </div>

                    <div id="boxKhoAdsTargetInfo" style="display: none; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 10px 16px; flex-direction: column; gap: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                            <div style="font-size: 13px; font-weight: 800; color: #3730a3;" id="lblKhoAdsTargetQtyText">
                                🔢 SỐ LƯỢNG CẦN SẢN XUẤT: <strong>1</strong> sản phẩm / video / ảnh
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                                <div style="font-size: 12px; font-weight: 800; color: #059669; background: #d1fae5; padding: 4px 12px; border-radius: 20px;" id="lblKhoAdsProgressCounter">
                                    📊 Tiến độ hoàn thành: 0 / 1
                                </div>
                                <div id="boxKhoAdsApprovalStatus" style="display: flex; align-items: center; gap: 8px;"></div>
                            </div>
                        </div>

                        <div id="boxKhoAdsSubItemTabs" style="display: flex; gap: 8px; flex-wrap: wrap; border-top: 1px dashed #a5b4fc; padding-top: 8px;">
                        </div>
                    </div>
                </div>

                <div id="boxKhoAdsMainFormBody" style="padding: 20px 24px; display: none; grid-template-columns: 360px 1fr; gap: 24px; overflow-y: auto; flex: 1;">
                    <div style="display: flex; flex-direction: column; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; height: 100%;">
                        <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a;">🖼️ Hình Ảnh / Thumbnail <span style="color:#dc2626">*</span></label>
                        <div id="boxKhoAdsThumbPreview" style="width: 100%; flex: 1; min-height: 360px; border: 2px dashed #a5b4fc; border-radius: 12px; background: #eef2ff; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; overflow: hidden; position: relative; padding: 10px; transition: border-color 0.2s;">
                            <div style="font-size: 36px; margin-bottom: 8px;">🖼️</div>
                            <div style="font-size: 13px; font-weight: 800; color: #4338ca; margin-bottom: 4px;">Dán ảnh qua Ctrl + V</div>
                            <div style="font-size: 11.5px; color: #64748b; font-weight: 600;">(Bắt buộc dán ảnh cho từng tư liệu)</div>
                        </div>
                        <input type="hidden" id="iptKhoAdsThumbnailUrl">
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 14px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">📌 Tên Video/Ảnh Ads <span style="color:#dc2626">*</span> <span style="font-size:11px;font-weight:600;color:#64748b;">(Tự động)</span></label>
                            <input type="text" id="iptKhoAdsTitle" readonly placeholder="Tự động sinh ra..." style="width: 100%; padding: 11px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13.5px; font-weight: 700; outline: none; background: #f1f5f9; color: #334155; cursor: not-allowed;">
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div>
                                <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">🏢 Lĩnh Vực Ads <span style="color:#dc2626">*</span> <span style="font-size:11px;font-weight:600;color:#64748b;">(Tự động)</span></label>
                                <select id="selKhoAdsLinhVuc" disabled style="width: 100%; padding: 11px 12px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 700; outline: none; background: #f1f5f9; color: #334155; cursor: not-allowed;">
                                    <option value="">-- Lĩnh Vực Tự Động --</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">🎬 Loại Tư Liệu <span style="color:#dc2626">*</span></label>
                                <select id="selKhoAdsMediaType" onchange="onKhoAdsSubItemInput('media_type', this.value)" style="width: 100%; padding: 11px 12px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 600; outline: none; background: white;">
                                    <option value="video">🎥 Video Ads</option>
                                    <option value="image">🖼️ Ảnh Ads</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <label style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0;">📝 Content Ads <span style="color:#dc2626">*</span></label>
                                <button id="btnCopyKhoAdsContent" onclick="copyKhoAdsContentText()" style="padding: 5px 12px; background: #eef2ff; color: #4338ca; border: 1.5px solid #c7d2fe; border-radius: 8px; font-size: 12px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                                    <span>📋</span> <span>Copy Content</span>
                                </button>
                            </div>
                            <textarea id="txtKhoAdsDescription" oninput="onKhoAdsSubItemInput('description', this.value)" rows="10" placeholder="Mô tả Content Ads..." style="width: 100%; padding: 14px; border: 1.5px solid #cbd5e1; border-radius: 12px; font-size: 13.5px; outline: none; font-family: inherit; resize: vertical; min-height: 260px;"></textarea>
                        </div>

                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <label style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0;">🔗 Link Google Drive <span style="color:#dc2626">*</span></label>
                                <button id="btnOpenKhoAdsDriveUrl" onclick="openKhoAdsDriveUrlTab()" style="padding: 5px 12px; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: 12px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                                    <span>🔗</span> <span>Mở Link Drive ↗</span>
                                </button>
                            </div>
                            <input type="url" id="iptKhoAdsDriveUrl" oninput="onKhoAdsSubItemInput('drive_url', this.value)" placeholder="https://drive.google.com/drive..." style="width: 100%; padding: 11px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13.5px; outline: none;">
                        </div>
                    </div>
                </div>

                <div id="boxKhoAdsFooterActions" style="padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: none; justify-content: space-between; align-items: center;">
                    <div style="display: flex; gap: 8px;">
                        <button id="btnKhoAdsPrevTab" onclick="navKhoAdsSubItemTab(-1)" style="padding: 8px 14px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; color: #475569; font-weight: 700; font-size: 12.5px; cursor: pointer;">⬅️ Tư liệu trước</button>
                        <button id="btnKhoAdsNextTab" onclick="navKhoAdsSubItemTab(1)" style="padding: 8px 14px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; color: #475569; font-weight: 700; font-size: 12.5px; cursor: pointer;">Tư liệu tiếp ➡️</button>
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <button id="btnKhoAdsCloseModal" onclick="closeModalCreateKhoAdsItem()" style="padding: 10px 20px; border-radius: 10px; border: 1px solid #cbd5e1; background: white; color: #475569; font-weight: 700; font-size: 13px; cursor: pointer;">Đóng</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(div);
}

async function _cdAdsGoToKhoAdsItem(khoAdsItemId) {
    if (!khoAdsItemId || khoAdsItemId === 'null') {
        return alert('⚠️ Chiến dịch này chưa được liên kết với Mẫu Kho Ads!');
    }

    // Load khoads.js script if functions not available yet
    if (typeof openKhoAdsTaskDetailModal !== 'function') {
        if (typeof _loadScript === 'function') {
            await _loadScript('/js/pages/khoads.js');
        }
    }

    _cdAdsEnsureKhoAdsModalInDOM();

    window._khoAdsData = window._khoAdsData || {
        activeMainTab: 'tasks',
        tasks: [],
        items: [],
        linhVucList: [],
        editingId: null
    };

    try {
        const token = localStorage.getItem('token') || (document.cookie.match(/token=([^;]+)/) || [])[1];
        const headers = {};
        if (token && token !== 'null') headers['Authorization'] = 'Bearer ' + token;

        // Fetch linh_vuc if empty
        if (!_khoAdsData.linhVucList || _khoAdsData.linhVucList.length === 0) {
            const resLV = await fetch('/api/kho-ads/linh-vuc', { headers }).then(r => r.json());
            if (resLV && resLV.ok) _khoAdsData.linhVucList = resLV.linh_vuc_list || [];
        }

        // Fetch tasks if empty
        if (!_khoAdsData.tasks || _khoAdsData.tasks.length === 0) {
            const res = await fetch('/api/kho-ads/tasks-grouped', { headers }).then(r => r.json());
            if (res && res.ok) _khoAdsData.tasks = res.tasks || [];
        }

        // Find target task matching khoAdsItemId
        let targetTask = null;
        for (const t of (_khoAdsData.tasks || [])) {
            if (t.items && t.items.some(i => Number(i.id) === Number(khoAdsItemId))) {
                targetTask = t;
                break;
            }
        }

        if (targetTask && typeof openKhoAdsTaskDetailModal === 'function') {
            openKhoAdsTaskDetailModal(targetTask.id, Number(khoAdsItemId));
        } else if (typeof openKhoAdsItemDetailFromPersonal === 'function') {
            openKhoAdsItemDetailFromPersonal(Number(khoAdsItemId));
        } else {
            alert('⚠️ Không tìm thấy chi tiết Mẫu Ads!');
        }
    } catch(e) {
        console.error('[cdAdsGoToKhoAdsItem error]', e);
        alert('⚠️ Lỗi tải dữ liệu Mẫu Ads: ' + e.message);
    }
}

async function _cdAdsOpenPerfModal(accIdSelect = null) {
    let accounts = [];
    try {
        const res = await fetch('/api/thongkeads/accounts', { credentials: 'include' });
        const data = await res.json();
        if (data.ok) accounts = data.accounts || [];
    } catch(e) {
        console.error('[cdAds load accounts error]', e);
    }

    const fbAccs = accounts.filter(a => a.platform === 'facebook');
    if (fbAccs.length === 0) {
        alert('Chưa có tài khoản quảng cáo nào được cài đặt!');
        return;
    }

    const selectedAcc = fbAccs.find(a => String(a.id) === String(accIdSelect)) || fbAccs[0];
    const isGD = _cdAdsIsSuperUser();
    const isReadonly = !isGD;
    const disabledAttr = isReadonly ? 'disabled style="background:#f1f5f9;cursor:not-allowed;"' : '';

    const existingModal = document.getElementById('cd-ads-perf-modal');
    if (existingModal) existingModal.remove();

    const overlay = document.createElement('div');
    overlay.id = 'cd-ads-perf-modal';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(6px);
        z-index: 10000; display: flex; align-items: center; justify-content: center;
        animation: fadeIn 0.2s ease;
    `;

    const fmtNum = (val) => {
        if (val === null || val === undefined || val === '') return '0';
        return Number(val).toLocaleString('vi-VN');
    };

    const cleanNum = (val, defaultVal = 0) => {
        if (val === null || val === undefined || val === '') return defaultVal;
        const str = String(val).replace(/\./g, '').replace(/,/g, '').trim();
        const num = parseFloat(str);
        return isNaN(num) ? defaultVal : num;
    };

    const renderModalBody = (acc) => `
        <div style="
            background: white; border-radius: 20px; width: 95%; max-width: 560px;
            max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px rgba(0,0,0,0.25);
            animation: slideUp 0.3s ease; font-family: inherit;
        ">
            <div style="padding: 22px 28px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:22px;">📊</span>
                    <h3 style="margin: 0; font-size: 18px; font-weight: 800; color: #1e293b;">Cài Đặt Hiệu Quả Quảng Cáo</h3>
                    ${isReadonly ? '<span style="font-size:11px;font-weight:700;color:#64748b;background:#f1f5f9;padding:2px 8px;border-radius:6px;margin-left:6px;">👁️ Chỉ xem</span>' : ''}
                </div>
                <button id="cd-perf-modal-close" style="
                    width: 36px; height: 36px; border-radius: 10px; border: none;
                    background: #f1f5f9; cursor: pointer; font-size: 18px; display: flex;
                    align-items: center; justify-content: center; color: #64748b;
                ">✕</button>
            </div>
            <div style="padding: 24px 28px;">

                <div style="margin-bottom: 20px;">
                    <label style="display:block;font-size:13px;font-weight:700;color:#1e293b;margin-bottom:6px;">
                        Chọn Tài Khoản Quảng Cáo *
                    </label>
                    <select id="cd-perf-f-account-id" style="width:100%;padding:11px 14px;border-radius:12px;border:1.5px solid #cbd5e1;font-size:14px;font-weight:700;color:#0f172a;background:white;outline:none;">
                        ${fbAccs.map(a => `
                            <option value="${a.id}" ${String(a.id) === String(acc.id) ? 'selected' : ''}>
                                📘 ${a.account_name} (${a.fb_ad_account_id || 'ID chưa cài'})
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div style="background: #fafbfc; padding: 20px; border-radius: 16px; border: 1.5px solid #e2e8f0; margin-bottom: 10px;">
                    <h4 style="margin: 0 0 16px; font-size: 15px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 6px;">
                        📊 Tiêu Chí & Ngưỡng Đánh Giá
                    </h4>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                        <div>
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:6px;">Tiêu chí hiệu quả</label>
                            <select id="cd-perf-f-metric" ${disabledAttr} style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid #cbd5e1;font-size:13px;font-weight:600;${isReadonly ? 'background:#f1f5f9;cursor:not-allowed;' : 'background:white;'}">
                                <option value="cpa" ${(acc.effectiveness_metric || 'cpa') === 'cpa' ? 'selected' : ''}>CPA (Chi phí / Tin nhắn)</option>
                                <option value="ctr" ${acc.effectiveness_metric === 'ctr' ? 'selected' : ''}>CTR (Tỷ lệ click)</option>
                                <option value="cpm" ${acc.effectiveness_metric === 'cpm' ? 'selected' : ''}>CPM (Chi phí / 1000 hiển thị)</option>
                            </select>
                        </div>
                        <div>
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:6px;">Ngưỡng hiệu quả (đ)</label>
                            <input id="cd-perf-f-threshold" type="text"
                                value="${fmtNum(acc.effectiveness_threshold || 75000)}"
                                placeholder="75.000"
                                ${isReadonly ? 'disabled style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid #cbd5e1;font-size:13px;font-weight:700;color:#0f172a;background:#f1f5f9;cursor:not-allowed;outline:none;box-sizing:border-box;"' : 'style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid #cbd5e1;font-size:13px;font-weight:700;color:#0f172a;outline:none;box-sizing:border-box;"'}
                                oninput="let raw = this.value.replace(/[^0-9]/g, ''); this.value = raw ? Number(raw).toLocaleString('vi-VN') : '';">
                        </div>
                    </div>

                    <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #cbd5e1;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:6px;">
                            SL Chạy Thực (Không tính số lần chạy không ra tin nhắn < đ)
                        </label>
                        <input id="cd-perf-f-ignore-no-msg-thresh" type="text"
                            value="${fmtNum(acc.ignore_no_msg_spend_threshold || 70000)}"
                            placeholder="70.000"
                            ${isReadonly ? 'disabled style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid #cbd5e1;font-size:13px;font-weight:700;color:#0f172a;background:#f1f5f9;cursor:not-allowed;outline:none;box-sizing:border-box;"' : 'style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid #cbd5e1;font-size:13px;font-weight:700;color:#0f172a;outline:none;box-sizing:border-box;"'}
                            oninput="let raw = this.value.replace(/[^0-9]/g, ''); this.value = raw ? Number(raw).toLocaleString('vi-VN') : '';">
                        <div style="font-size: 11.5px; color: #64748b; margin-top: 5px;">
                            💡 Các ngày chạy dở có Chi tiêu < số tiền này VÀ không ra tin nhắn sẽ không bị tính là 1 lần chạy.
                        </div>
                    </div>

                    <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #cbd5e1;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:6px;">
                            🏆 Ngưỡng % Tỷ Lệ Mẫu Win (%)
                        </label>
                        ${(() => {
                            let winVal = 50;
                            if (acc.win_rate_threshold != null && acc.win_rate_threshold !== '') {
                                const parsed = parseFloat(acc.win_rate_threshold);
                                if (!isNaN(parsed) && parsed > 0 && parsed <= 100) winVal = Math.round(parsed);
                            } else if (_cdAdsState.winRateThreshold) {
                                winVal = Math.round(_cdAdsState.winRateThreshold);
                            }
                            return `<input id="cd-perf-f-win-rate-thresh" type="number" min="0" max="100" step="1"
                                value="${winVal}"
                                placeholder="50"
                                ${isReadonly ? 'disabled style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid #cbd5e1;font-size:13px;font-weight:700;color:#0f172a;background:#f1f5f9;cursor:not-allowed;outline:none;box-sizing:border-box;"' : 'style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid #cbd5e1;font-size:13px;font-weight:700;color:#0f172a;outline:none;box-sizing:border-box;"'}>`;
                        })()}
                        <div style="font-size: 11.5px; color: #64748b; margin-top: 5px;">
                            💡 Chiến dịch có % HIỆU QUẢ ≥ số này sẽ được xếp vào Mẫu Win, ngược lại là Mẫu Lose.
                        </div>
                    </div>
                </div>
            </div>

            <div style="padding: 18px 28px; display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #e2e8f0; background: white; border-radius: 0 0 20px 20px;">
                <button id="cd-perf-modal-cancel" style="
                    padding: 11px 22px; border-radius: 12px; border: 1.5px solid #cbd5e1;
                    background: white; color: #475569; font-size: 13px; font-weight: 700;
                    cursor: pointer;
                ">${isReadonly ? 'Đóng' : 'Hủy'}</button>
                ${isReadonly ? `
                    <button disabled style="
                        padding: 11px 22px; border-radius: 12px; border: none;
                        background: #e2e8f0; color: #64748b; font-size: 13px; font-weight: 700;
                        cursor: not-allowed; display: flex; align-items: center; gap: 6px;
                    ">🔒 Chỉ Giám Đốc/Admin Mới Có Quyền Chỉnh Sửa</button>
                ` : `
                    <button id="cd-perf-modal-save" style="
                        padding: 11px 24px; border-radius: 12px; border: none;
                        background: linear-gradient(135deg, #1877f2, #2563eb);
                        color: white; font-size: 13px; font-weight: 800;
                        cursor: pointer; display: flex; align-items: center; gap: 8px;
                        box-shadow: 0 4px 12px rgba(37,99,235,0.3);
                    ">💾 Lưu Cấu Hình Hiệu Quả</button>
                `}
            </div>
        </div>
    `;

    overlay.innerHTML = renderModalBody(selectedAcc);
    document.body.appendChild(overlay);

    const setupModalListeners = () => {
        const accSelect = overlay.querySelector('#cd-perf-f-account-id');
        if (accSelect) {
            accSelect.addEventListener('change', () => {
                const newAccId = accSelect.value;
                const found = fbAccs.find(a => String(a.id) === String(newAccId));
                if (found) {
                    overlay.innerHTML = renderModalBody(found);
                    setupModalListeners();
                }
            });
        }

        overlay.querySelector('#cd-perf-modal-close')?.addEventListener('click', () => overlay.remove());
        overlay.querySelector('#cd-perf-modal-cancel')?.addEventListener('click', () => overlay.remove());

        const saveBtn = overlay.querySelector('#cd-perf-modal-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const targetId = overlay.querySelector('#cd-perf-f-account-id').value;
                const metric = overlay.querySelector('#cd-perf-f-metric').value;
                const threshold = cleanNum(overlay.querySelector('#cd-perf-f-threshold').value, 75000);
                const ignoreThresh = cleanNum(overlay.querySelector('#cd-perf-f-ignore-no-msg-thresh').value, 70000);

                const winInputVal = overlay.querySelector('#cd-perf-f-win-rate-thresh')?.value;
                const parsedWin = parseFloat(winInputVal);
                const winThresh = (!isNaN(parsedWin) && parsedWin >= 0 && parsedWin <= 100) ? parsedWin : 50;

                saveBtn.disabled = true;
                saveBtn.textContent = '⏳ Đang lưu...';

                try {
                    const res = await fetch(`/api/thongkeads/accounts/${targetId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            ..._cdAdsGetAuthHeaders()
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            effectiveness_metric: metric,
                            effectiveness_threshold: threshold,
                            ignore_no_msg_spend_threshold: ignoreThresh,
                            win_rate_threshold: winThresh
                        })
                    });
                    const data = await res.json();
                    if (!data.ok) throw new Error(data.error);

                    _cdAdsState.winRateThreshold = winThresh;

                    overlay.remove();
                    alert('✅ Đã lưu cài đặt hiệu quả thành công!');
                    _cdAdsLoadCampaigns();
                } catch(e) {
                    alert(`❌ Lỗi: ${e.message}`);
                    saveBtn.disabled = false;
                    saveBtn.textContent = '💾 Lưu Cấu Hình Hiệu Quả';
                }
            });
        }
    };

    setupModalListeners();
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

function _cdAdsSetupGlobalTooltip() {
    if (window._cdAdsTooltipInitialized) return;
    window._cdAdsTooltipInitialized = true;

    let tip = document.getElementById('cd-global-tooltip');
    if (!tip) {
        tip = document.createElement('div');
        tip.id = 'cd-global-tooltip';
        tip.style.cssText = `
            position: fixed;
            background: #0f172a;
            color: #ffffff;
            padding: 9px 13px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 600;
            line-height: 1.45;
            white-space: pre-line;
            width: max-content;
            max-width: 300px;
            text-align: left;
            pointer-events: none;
            z-index: 999999;
            box-shadow: 0 12px 28px -5px rgba(0,0,0,0.5), 0 4px 10px -2px rgba(0,0,0,0.3);
            border: 1px solid #334155;
            opacity: 0;
            transform: translateY(4px);
            transition: opacity 0.15s ease, transform 0.15s ease;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            display: none;
        `;
        document.body.appendChild(tip);
    }

    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('[data-tooltip]');
        if (!target) return;

        // Skip sidebar menu items when sidebar is expanded
        if (target.closest('.nav-item, #sidebar, .sidebar')) {
            const sidebar = target.closest('#sidebar, .sidebar') || document.querySelector('#sidebar, .sidebar');
            if (!sidebar || !sidebar.classList.contains('collapsed')) return;
        }

        const text = target.getAttribute('data-tooltip');
        if (!text) return;

        tip.innerText = text;
        tip.style.display = 'block';

        const rect = target.getBoundingClientRect();
        const tipRect = tip.getBoundingClientRect();

        let top = rect.top - tipRect.height - 8;
        let left = rect.left + (rect.width / 2) - (tipRect.width / 2);

        if (top < 10) top = rect.bottom + 8;
        if (left < 10) left = 10;
        if (left + tipRect.width > window.innerWidth - 10) left = window.innerWidth - tipRect.width - 10;

        tip.style.top = `${top}px`;
        tip.style.left = `${left}px`;
        requestAnimationFrame(() => {
            tip.style.opacity = '1';
            tip.style.transform = 'translateY(0)';
        });
    });

    document.addEventListener('mouseout', (e) => {
        const target = e.target.closest('[data-tooltip]');
        if (!target) return;
        tip.style.opacity = '0';
        tip.style.transform = 'translateY(4px)';
    });
}

_cdAdsSetupGlobalTooltip();

function _cdAdsGetShortCampName(fullName) {
    if (!fullName) return 'Chiến dịch gốc';
    const str = String(fullName).trim();

    // Nếu tên chứa ' - CÔNG TY', loại bỏ phần tiền tố mẫu/tài khoản phía trước
    const idx = str.indexOf(' - CÔNG TY');
    if (idx !== -1) {
        return str.substring(idx + 3).trim();
    }
    if (str.startsWith('CÔNG TY')) return str;

    // Nếu có 4 phần trở lên tách bởi ' - ', chỉ lấy phần tên Meta Campaign ở sau
    const parts = str.split(' - ');
    if (parts.length >= 4) {
        return parts.slice(3).join(' - ').trim();
    }
    return str;
}

function _cdAdsRenderExtraCampsHTML(camp) {
    if (!camp) return '';
    const campaignId = camp.id;
    const extraCamps = camp.extra_camps || [];
    let items = [];

    // 1. Hiển thị Camp ID chính (đã được rút gọn tiền tố mẫu / tài khoản QC)
    if (camp.camp_id || camp.post_id) {
        const shortName = _cdAdsGetShortCampName(camp.campaign_name);
        items.push(`
            <div style="background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 12px;">
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: nowrap; overflow: hidden; flex: 1;">
                    <span style="background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; flex-shrink: 0;">⭐ Camp Chính</span>
                    ${camp.camp_id ? `<span style="font-family: monospace; font-weight: 700; color: #4338ca; background: #eef2ff; padding: 2px 8px; border-radius: 6px; flex-shrink: 0;">🆔 Camp: ${escapeHtml(camp.camp_id)}</span>` : ''}
                    ${camp.post_id ? `<span style="font-family: monospace; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 2px 8px; border-radius: 6px; flex-shrink: 0;">📌 Post: ${escapeHtml(camp.post_id)}</span>` : ''}
                    <span style="color: #64748b; font-weight: 600; max-width: 450px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 1;" title="${escapeHtml(camp.campaign_name || '')}">📝 ${escapeHtml(shortName)}</span>
                    <span style="color: #94a3b8; font-size: 11px; flex-shrink: 0;">👤 ${escapeHtml(camp.created_by_name || 'Giám Đốc')}</span>
                </div>
                <span style="font-size: 11px; font-weight: 700; color: #64748b; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 3px 8px; flex-shrink: 0;" title="Mã Camp ID chính cố định theo chiến dịch">🔒 Cố định</span>
            </div>
        `);
    }

    // 2. Hiển thị các Camp ID phụ
    extraCamps.forEach(ec => {
        items.push(`
            <div style="background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 12px;">
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: nowrap; overflow: hidden; flex: 1;">
                    <span style="background: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; flex-shrink: 0;">➕ Camp Phụ</span>
                    ${ec.camp_id ? `<span style="font-family: monospace; font-weight: 700; color: #4338ca; background: #eef2ff; padding: 2px 8px; border-radius: 6px; flex-shrink: 0;">🆔 Camp: ${escapeHtml(ec.camp_id)}</span>` : ''}
                    ${ec.post_id ? `<span style="font-family: monospace; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 2px 8px; border-radius: 6px; flex-shrink: 0;">📌 Post: ${escapeHtml(ec.post_id)}</span>` : ''}
                    ${ec.note ? `<span style="color: #64748b; font-weight: 600; max-width: 450px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 1;" title="${escapeHtml(ec.note)}">📝 ${escapeHtml(ec.note)}</span>` : ''}
                    <span style="color: #94a3b8; font-size: 11px; flex-shrink: 0;">👤 ${escapeHtml(ec.created_by_name || 'Hệ thống')}</span>
                </div>
                <button onclick="_cdAdsDeleteExtraCamp(${ec.id}, ${campaignId})" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; border-radius: 6px; padding: 3px 8px; font-size: 11px; font-weight: 700; cursor: pointer; flex-shrink: 0;" title="Gỡ mã Camp phụ này">🗑️ Gỡ</button>
            </div>
        `);
    });

    if (items.length === 0) {
        return `<div style="font-size: 12px; color: #94a3b8; font-style: italic;">Chưa có Mã Camp ID nào được gắn. Bấm "+ Gắn Thêm ID Camp / Post ID" để bổ sung!</div>`;
    }

    return items.join('');
}

async function _cdAdsOpenAddExtraCampModal(campaignId) {
    const camp = _cdAdsState.campaigns.find(c => c.id === campaignId);
    if (!camp) return alert('Không tìm thấy thông tin chiến dịch!');

    const modal = document.getElementById('cdAdsAddExtraCampModal');
    if (!modal) return;
    modal.style.display = 'flex';

    document.getElementById('cdAdsExtraCampaignId').value = campaignId;
    const platform = (camp.channel_name || 'facebook').toLowerCase().trim();
    document.getElementById('cdAdsExtraPlatform').value = platform;
    document.getElementById('cdAdsExtraModalSub').textContent = `Chiến dịch: ${camp.campaign_name || ''} • Kênh: ${camp.channel_icon || '📺'} ${camp.channel_name || 'Facebook'}`;

    // Reset inputs
    document.getElementById('cdAdsExtraPostIdInput').value = '';
    document.getElementById('cdAdsExtraCampIdInput').value = '';
    document.getElementById('cdAdsExtraNoteInput').value = '';
    const step3Box = document.getElementById('cdAdsExtraStep3Box');
    if (step3Box) step3Box.style.display = 'none';

    // Load ad accounts for this platform
    const accSelect = document.getElementById('cdAdsExtraAdAccountSelect');
    accSelect.innerHTML = '<option value="">⏳ Đang tải tài khoản QC từ Cài Đặt Tài Khoản Ads...</option>';

    try {
        const res = await _cdAdsApi(`/api/ads-campaigns/accounts-by-platform?platform=${encodeURIComponent(platform)}`);
        const accounts = res.accounts || [];
        window._cdAdsExtraPlatformAccounts = accounts;

        if (accounts.length === 0) {
            accSelect.innerHTML = `<option value="">⚠️ Chưa có tài khoản QC nào cho kênh "${platform.toUpperCase()}" ở Cài Đặt Tài Khoản Ads</option>`;
        } else {
            accSelect.innerHTML = `<option value="">-- Chọn Tài Khoản QC Chạy Test (${accounts.length} tài khoản) --</option>` +
                accounts.map(acc => `<option value="${acc.id}">🧪 ${acc.account_name} (${acc.fb_ad_account_id || acc.platform}) ${acc.linh_vuc_name ? '• LV: ' + acc.linh_vuc_name : ''}</option>`).join('');
            
            // Auto select if campaign already has ad_account_id
            if (camp.ad_account_id && accounts.some(a => a.id === camp.ad_account_id)) {
                accSelect.value = camp.ad_account_id;
                _cdAdsOnExtraAdAccountSelect();
            }
        }
    } catch(e) {
        accSelect.innerHTML = '<option value="">🔴 Lỗi tải danh sách tài khoản QC</option>';
    }
}

function _cdAdsCloseAddExtraCampModal() {
    const modal = document.getElementById('cdAdsAddExtraCampModal');
    if (modal) modal.style.display = 'none';
}

async function _cdAdsOnExtraAdAccountSelect() {
    const accId = document.getElementById('cdAdsExtraAdAccountSelect')?.value;
    const step3Box = document.getElementById('cdAdsExtraStep3Box');
    const campSelect = document.getElementById('cdAdsExtraCampaignSelect');

    document.getElementById('cdAdsExtraCampIdInput').value = '';
    document.getElementById('cdAdsExtraPostIdInput').value = '';

    if (!accId) {
        if (step3Box) step3Box.style.display = 'none';
        return;
    }

    if (step3Box) step3Box.style.display = 'block';
    if (campSelect) campSelect.innerHTML = '<option value="">⏳ Đang tải danh sách chiến dịch Camp từ Facebook API...</option>';

    try {
        const res = await _cdAdsApi(`/api/ads-campaigns/ad-account-campaigns?account_id=${accId}`);
        if (res.error) {
            alert(res.error);
            if (campSelect) campSelect.innerHTML = `<option value="">🔴 ${res.error}</option>`;
            return;
        }

        const rawCampaigns = res.campaigns || [];

        // Tập hợp tất cả các mã Camp ID đã được gắn ở bất kỳ mẫu nào trong hệ thống
        const attachedCampIds = new Set();
        (_cdAdsState.campaigns || []).forEach(c => {
            if (c.camp_id) attachedCampIds.add(String(c.camp_id).trim());
            if (c.extra_camps && Array.isArray(c.extra_camps)) {
                c.extra_camps.forEach(ec => {
                    if (ec.camp_id) attachedCampIds.add(String(ec.camp_id).trim());
                });
            }
        });

        // Lọc bỏ những chiến dịch có ID đã được gắn trong hệ thống
        const campaigns = rawCampaigns.filter(c => !attachedCampIds.has(String(c.id).trim()));
        window._cdAdsExtraCurrentAccountCampaigns = campaigns;

        if (campSelect) {
            if (campaigns.length === 0) {
                campSelect.innerHTML = '<option value="">⚠️ Tất cả chiến dịch trong tài khoản QC này đều đã được gắn trong hệ thống</option>';
            } else {
                campSelect.innerHTML = `<option value="">-- Chọn Chiến Dịch (${campaigns.length} chiến dịch chưa gắn) --</option>` +
                    campaigns.map(c => `<option value="${c.id}">[${c.effective_status || c.status || 'OFF'}] ${c.name} (ID: ${c.id})</option>`).join('');
            }
        }
    } catch(e) {
        if (campSelect) campSelect.innerHTML = '<option value="">🔴 Lỗi kết nối lấy danh sách chiến dịch</option>';
    }
}

function _cdAdsOnExtraCampaignSelect() {
    const campId = document.getElementById('cdAdsExtraCampaignSelect')?.value;
    const campInput = document.getElementById('cdAdsExtraCampIdInput');
    const postInput = document.getElementById('cdAdsExtraPostIdInput');
    const noteInput = document.getElementById('cdAdsExtraNoteInput');

    if (campId) {
        if (campInput) campInput.value = campId;
        const campObj = (window._cdAdsExtraCurrentAccountCampaigns || []).find(c => String(c.id) === String(campId));
        if (postInput) {
            postInput.value = (campObj && campObj.post_id) ? campObj.post_id : '';
        }
        if (noteInput) {
            noteInput.value = (campObj && campObj.name) ? campObj.name : '';
        }
    } else {
        if (campInput) campInput.value = '';
        if (postInput) postInput.value = '';
        if (noteInput) noteInput.value = '';
    }
}

async function _cdAdsSubmitAddExtraCamp() {
    const campaignId = document.getElementById('cdAdsExtraCampaignId')?.value;
    const campId = document.getElementById('cdAdsExtraCampIdInput')?.value;
    const postId = document.getElementById('cdAdsExtraPostIdInput')?.value;
    const note = document.getElementById('cdAdsExtraNoteInput')?.value;

    const cleanCampId = (campId || '').trim();
    const cleanPostId = (postId || '').trim();

    if (!cleanCampId && !cleanPostId) {
        return alert('Vui lòng chọn chiến dịch hoặc nhập ít nhất ID Camp hoặc ID Post!');
    }

    try {
        const res = await _cdAdsApi(`/api/ads-campaigns/${campaignId}/extra-camps`, 'POST', {
            camp_id: cleanCampId,
            post_id: cleanPostId,
            note: (note || '').trim()
        });
        if (res.error) return alert(res.error);

        _cdAdsCloseAddExtraCampModal();
        alert('🎉 Gắn thêm Mã ID Camp / Post ID thành công!');
        await _cdAdsLoadCampaigns();

        // Refresh detail modal if open
        const detailModal = document.getElementById('cdAdsDetailModal');
        if (detailModal && detailModal.style.display !== 'none') {
            _cdAdsViewDetail(Number(campaignId));
        }
    } catch(e) { alert('Lỗi: ' + e.message); }
}

async function _cdAdsDeleteExtraCamp(extraId, campaignId) {
    if (!confirm('Xác nhận gỡ bỏ mã Camp phụ này khỏi chiến dịch?')) return;
    try {
        const res = await _cdAdsApi(`/api/ads-campaigns/extra-camps/${extraId}`, 'DELETE');
        if (res.error) return alert(res.error);
        await _cdAdsLoadCampaigns();
        _cdAdsViewDetail(campaignId);
    } catch(e) { alert('Lỗi: ' + e.message); }
}

window.renderChiendichadsPage = renderChiendichadsPage;
window._cdAdsGoToKhoAdsItem = _cdAdsGoToKhoAdsItem;
window._cdAdsOpenPerfModal = _cdAdsOpenPerfModal;
window._cdAdsOpenAddExtraCampModal = _cdAdsOpenAddExtraCampModal;
window._cdAdsCloseAddExtraCampModal = _cdAdsCloseAddExtraCampModal;
window._cdAdsOnExtraAdAccountSelect = _cdAdsOnExtraAdAccountSelect;
window._cdAdsOnExtraCampaignSelect = _cdAdsOnExtraCampaignSelect;
window._cdAdsSubmitAddExtraCamp = _cdAdsSubmitAddExtraCamp;
window._cdAdsDeleteExtraCamp = _cdAdsDeleteExtraCamp;
