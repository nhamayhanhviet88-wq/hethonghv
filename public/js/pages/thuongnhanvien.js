// ========== TRANG THƯỞNG NHÂN VIÊN (SETUP THƯỞNG THEO THÁNG) ==========

let _tnvSelectedYear = 'all';
let _tnvSelectedMonth = 'all';
let _tnvSelectedDept = 'all';
let _tnvSelectedUser = 'all';
let _tnvAllRewards = [];
let _tnvDepts = [];
let _tnvStaff = [];
let _tnvEditId = null;
let _tnvModalAssignedUserIds = new Set();
let _tnvModalAssignedDeptRewardDeptIds = new Set();
let _tnvModalAssignedTeamRewardDeptIds = new Set();

function _tnvFmtMoney(n) {
    return n ? Number(n).toLocaleString('vi-VN') + ' VNĐ' : '0 VNĐ';
}

function _tnvCapitalize(str) {
    if (!str || typeof str !== 'string') return '';
    str = str.trim();
    if (!str) return '';
    return str.split(/\s+/).map(word => {
        if (!word) return '';
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

function _tnvFmtMonthYear(myStr) {
    if (!myStr || typeof myStr !== 'string') return '-';
    const parts = myStr.trim().split('-');
    if (parts.length === 2) {
        return `${parts[1]}/${parts[0]}`;
    }
    return myStr;
}

const ROLE_PRIORITY = {
    'quan_ly_cap_cao': 1,
    'giam_doc': 1,
    'quan_ly': 2,
    'truong_phong': 3,
    'nhan_vien': 4,
    'thu_viec': 5,
    'part_time': 6
};

function tnvGetRoleLabel(role) {
    const labels = {
        'quan_ly_cap_cao': 'Quản lý cấp cao',
        'giam_doc': 'Giám đốc',
        'quan_ly': 'Quản lý',
        'truong_phong': 'Trưởng phòng',
        'nhan_vien': 'Nhân viên',
        'thu_viec': 'Thử việc',
        'part_time': 'Part-time'
    };
    return labels[role] || role || 'NV';
}

async function renderThuongNhanVienPage(container) {
    const now = new Date();
    const curYear = String(now.getFullYear());
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');

    _tnvSelectedYear = curYear;
    _tnvSelectedMonth = curMonth;
    _tnvSelectedDept = 'all';
    _tnvSelectedUser = 'all';
    _tnvEditId = null;

    // Build Year Options (2024 to 2035)
    let yearOpts = '<option value="all">-- Tất cả năm --</option>';
    for (let y = 2024; y <= 2035; y++) {
        yearOpts += `<option value="${y}" ${String(y) === curYear ? 'selected' : ''}>Năm ${y}</option>`;
    }

    // Build Month Options (1 to 12 + All)
    let monthOpts = '<option value="all">-- Tất cả tháng --</option>';
    for (let m = 1; m <= 12; m++) {
        const mStr = String(m).padStart(2, '0');
        monthOpts += `<option value="${mStr}" ${mStr === curMonth ? 'selected' : ''}>Tháng ${mStr}</option>`;
    }

    container.innerHTML = `
        <style>
            @keyframes tnvGlow { 0%,100%{box-shadow:0 0 15px rgba(245,124,0,.2)} 50%{box-shadow:0 0 25px rgba(245,124,0,.4)} }
            @keyframes tnvFadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
            
            .tnv-hero-card {
                background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                border-radius: 16px;
                padding: 22px 26px;
                color: white;
                margin-bottom: 20px;
                box-shadow: 0 10px 25px rgba(15,23,42,0.15);
                position: relative;
                overflow: hidden;
            }
            .tnv-hero-card::after {
                content: "";
                position: absolute;
                top: -50%;
                right: -10%;
                width: 300px;
                height: 300px;
                background: radial-gradient(circle, rgba(245,124,0,0.15) 0%, transparent 70%);
                pointer-events: none;
            }
            .tnv-stat-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 14px;
                margin-top: 18px;
            }
            .tnv-stat-box {
                background: rgba(255,255,255,0.06);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                padding: 14px 18px;
                backdrop-filter: blur(8px);
                transition: transform .2s ease;
            }
            .tnv-stat-box:hover {
                transform: translateY(-3px);
                background: rgba(255,255,255,0.1);
            }
            .tnv-stat-val {
                font-size: 22px;
                font-weight: 800;
                color: #fbbf24;
            }
            .tnv-stat-label {
                font-size: 12px;
                color: #94a3b8;
                margin-top: 4px;
                font-weight: 600;
            }
            
            .tnv-badge-money {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 700;
                background: rgba(16,185,129,0.12);
                color: #059669;
                border: 1px solid rgba(16,185,129,0.3);
                white-space: nowrap !important;
            }
            .tnv-badge-gift {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 700;
                background: rgba(147,51,234,0.12);
                color: #7c3aed;
                border: 1px solid rgba(147,51,234,0.3);
                white-space: nowrap !important;
            }
            
            .tnv-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
            }
            .tnv-table th {
                background: #f8fafc;
                color: #475569;
                font-weight: 700;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                padding: 12px 16px;
                border-bottom: 2px solid #e2e8f0;
            }
            .tnv-table td {
                padding: 14px 16px;
                border-bottom: 1px solid #f1f5f9;
                font-size: 13px;
                color: #1e293b;
                vertical-align: middle;
            }
            .tnv-table tr:hover td {
                background: #f8fafc;
            }
            
            .tnv-modal-backdrop {
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(15,23,42,0.6);
                backdrop-filter: blur(4px);
                z-index: 9999;
                display: flex; align-items: center; justify-content: center;
                animation: tnvFadeUp 0.25s ease;
            }
            .tnv-modal-content {
                background: white;
                border-radius: 16px;
                width: 100%;
                max-width: 650px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
            }
            .tnv-modal-header {
                padding: 18px 24px;
                background: linear-gradient(135deg, #1e293b, #0f172a);
                color: white;
                border-radius: 16px 16px 0 0;
                display: flex; align-items: center; justify-content: space-between;
            }
            .tnv-modal-body {
                padding: 22px 24px;
            }

            /* Custom Searchable Combobox CSS */
            .tnv-combobox-wrapper { position: relative; }
            .tnv-combobox-input { font-weight: 600; padding-right: 46px !important; cursor: pointer; background-color: #fff; text-overflow: ellipsis; }
            .tnv-arrow-btn {
                position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
                pointer-events: none; color: #94a3b8; font-size: 10px; transition: transform 0.2s;
            }
            .tnv-clear-btn {
                position: absolute; right: 26px; top: 50%; transform: translateY(-50%);
                cursor: pointer; color: #94a3b8; font-size: 13px; font-weight: 700;
                display: none; padding: 2px 4px; border-radius: 50%;
            }
            .tnv-clear-btn:hover { color: #ef4444; background: #fee2e2; }
            .tnv-dd-menu {
                display: none; position: absolute; top: 100%; left: 0;
                min-width: 100%; width: max-content; max-width: 420px;
                max-height: 300px; overflow-y: auto; overflow-x: hidden; background: white;
                border: 1px solid #cbd5e1; border-radius: 12px;
                box-shadow: 0 12px 28px rgba(0,0,0,0.15); z-index: 99999; margin-top: 4px;
            }
            .tnv-dd-item {
                padding: 9px 14px; cursor: pointer; font-size: 13px; font-weight: 600;
                border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between;
                gap: 12px; white-space: nowrap; transition: all 0.15s ease;
            }
            .tnv-dd-item:hover, .tnv-dd-item.focused { background: #fff7ed; color: #e65100; }
            .tnv-dd-item.active { background: #ffebd2; color: #e65100; font-weight: 800; }
            .tnv-dd-role { font-size: 11px; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 12px; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
            /* Award Status & Gatekeeper CSS */
            .tnv-status-badge {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 3px 10px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 700;
                white-space: nowrap !important;
                box-shadow: 0 1px 2px rgba(0,0,0,0.04);
            }
            .tnv-status-badge.pending { background: #fff7ed; color: #c2410c; border: 1px solid #ffedd5; }
            .tnv-status-badge.not_achieved { background: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; }
            .tnv-status-badge.achieved { background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; }
            .tnv-status-badge.handed_over { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
            
            /* Award Status Select Pill CSS (Option 1) */
            .tnv-status-select {
                font-size: 12px;
                font-weight: 700;
                padding: 6px 28px 6px 12px;
                border-radius: 20px;
                cursor: pointer;
                outline: none;
                transition: all 0.2s ease;
                text-align: center;
                text-align-last: center;
                appearance: none;
                -webkit-appearance: none;
                -moz-appearance: none;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%2364748b' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 10px center;
                border: 1px solid transparent;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            }
            .tnv-status-select.pending {
                background-color: #f8fafc;
                color: #475569;
                border-color: #cbd5e1;
            }
            .tnv-status-select.pending:hover { background-color: #f1f5f9; }

            .tnv-status-select.not_achieved {
                background-color: #fef2f2;
                color: #dc2626;
                border-color: #fca5a5;
            }
            .tnv-status-select.not_achieved:hover { background-color: #fee2e2; }

            .tnv-status-select.achieved {
                background-color: #eff6ff;
                color: #1d4ed8;
                border-color: #93c5fd;
            }
            .tnv-status-select.achieved:hover { background-color: #dbeafe; }

            .tnv-status-select.handed_over {
                background-color: #ecfdf5;
                color: #047857;
                border-color: #6ee7b7;
            }
            .tnv-status-select.handed_over:hover { background-color: #d1fae5; }
        </style>

        <div class="tnv-hero-card">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
                <div>
                    <h2 style="margin:0;font-size:22px;font-weight:800;color:#f8fafc;">🎁 Quản Lý & Setup Thưởng Nhân Viên</h2>
                    <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;">Gom nhóm và thiết lập các giải thưởng, thành tích cho từng nhân viên theo tháng</p>
                </div>
                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                    <button class="btn" onclick="tnvOpenCompareModal()" style="background:rgba(255,255,255,0.15);color:white;font-weight:800;padding:10px 18px;border-radius:12px;border:1px solid rgba(255,255,255,0.3);cursor:pointer;backdrop-filter:blur(5px);transition:all 0.2s ease;">
                        📊 So Sánh Cùng Kỳ
                    </button>
                    <button class="btn" onclick="tnvOpenModal()" style="background:linear-gradient(135deg,#f57c00,#e65100);color:white;font-weight:800;padding:10px 22px;border-radius:12px;border:none;cursor:pointer;box-shadow:0 4px 14px rgba(245,124,0,0.35);">
                        ➕ Setup Thưởng Mới
                    </button>
                </div>
            </div>

            <div class="tnv-stat-grid" id="tnvStatGrid">
                <div class="tnv-stat-box">
                    <div class="tnv-stat-val" id="stTotalRewards">0</div>
                    <div class="tnv-stat-label">🏆 Tổng Số Giải Thưởng</div>
                </div>
                <div class="tnv-stat-box">
                    <div class="tnv-stat-val" id="stTotalMoney" style="color:#34d399;">0 VNĐ</div>
                    <div class="tnv-stat-label">💰 Tổng Tiền Thưởng</div>
                </div>
                <div class="tnv-stat-box">
                    <div class="tnv-stat-val" id="stTotalGifts" style="color:#c084fc;">0 quà</div>
                    <div class="tnv-stat-label">🎁 Tổng Phần Quà</div>
                </div>
                <div class="tnv-stat-box">
                    <div class="tnv-stat-val" id="stTotalUsers" style="color:#60a5fa;">0 nhân viên</div>
                    <div class="tnv-stat-label">👥 NV Nhận Thưởng</div>
                </div>
            </div>
        </div>

        <div class="card" style="border-radius:14px;border:1px solid #e2e8f0;margin-bottom:20px;overflow:visible !important;z-index:100;position:relative;">
            <div class="card-body" style="padding:16px 20px;overflow:visible !important;position:relative;">
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
                    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;flex:1;">
                        <div>
                            <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">📅 NĂM</label>
                            <select id="tnvYearSelect" class="form-control" style="width:130px;font-weight:700;" onchange="tnvOnFilterChange()">
                                ${yearOpts}
                            </select>
                        </div>
                        <div>
                            <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">📅 THÁNG</label>
                            <select id="tnvMonthSelect" class="form-control" style="width:145px;font-weight:700;" onchange="tnvOnFilterChange()">
                                ${monthOpts}
                            </select>
                        </div>
                        <div id="tnvQuickPastContainer" style="display:flex;gap:6px;align-items:center;margin-top:14px;"></div>
                        <div>
                            <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">🏢 PHÒNG BAN</label>
                            <select id="tnvDeptFilter" class="form-control" style="width:190px;font-weight:600;" onchange="tnvOnDeptFilterChange()">
                                <option value="all">-- Tất cả phòng ban --</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">👤 TÊN NHÂN VIÊN</label>
                            <div class="tnv-combobox-wrapper" style="width:290px;">
                                <input type="text" id="tnvUserSearchInput" class="form-control tnv-combobox-input" placeholder="🔍 Gõ tìm hoặc chọn NV..." autocomplete="off" onfocus="tnvOpenUserDd('filter')" onclick="tnvOpenUserDd('filter')" oninput="tnvFilterUserDd('filter')" onkeydown="tnvKeyUserDd(event, 'filter')">
                                <span id="tnvUserClearBtn" class="tnv-clear-btn" onclick="tnvClearUserFilter()">✕</span>
                                <span class="tnv-arrow-btn" onclick="tnvToggleUserDd('filter', event)" style="cursor:pointer;pointer-events:auto;">▼</span>
                                <input type="hidden" id="tnvUserFilter" value="all">
                                <div id="tnvUserDdMenu" class="tnv-dd-menu"></div>
                            </div>
                        </div>
                        <div style="flex:1;min-width:180px;">
                            <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">🔍 TÌM KIẾM</label>
                            <input type="text" id="tnvSearchInput" class="form-control" placeholder="Tìm tiêu đề, nội dung..." oninput="tnvRenderTable()">
                        </div>
                    </div>
                    <button class="btn btn-secondary" onclick="tnvLoadData()" style="height:38px;margin-top:auto;font-weight:700;">🔄 Làm Mới</button>
                </div>
            </div>
        </div>

        <div class="card" style="border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;">
            <div style="overflow-x:auto;">
                <table class="tnv-table">
                    <thead>
                        <tr>
                            <th style="width:50px;text-align:center;">STT</th>
                            <th style="width:110px;">Tháng Setup</th>
                            <th style="width:160px;">Phòng Ban</th>
                            <th style="width:160px;">Nhân Viên</th>
                            <th>Tiêu Đề Giải Thưởng</th>
                            <th>Nội Dung / Điều Kiện Kết Quả</th>
                            <th style="width:170px;">Hình Thức & Giá Trị</th>
                            <th style="width:220px;text-align:center;">Trạng Thái & Trao Giải</th>
                            <th style="width:90px;text-align:center;">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody id="tnvTbody">
                        <tr><td colspan="9" style="text-align:center;padding:30px;color:#94a3b8;">⏳ Đang tải dữ liệu...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Modal setup reward -->
        <div id="tnvModal" class="tnv-modal-backdrop" style="display:none;">
            <div class="tnv-modal-content">
                <div class="tnv-modal-header">
                    <h3 id="modalHeadTitle" style="margin:0;font-size:18px;font-weight:800;">🎁 Setup Thưởng Nhân Viên Mới</h3>
                    <button onclick="tnvCloseModal()" style="background:none;border:none;color:white;font-size:20px;cursor:pointer;">✕</button>
                </div>
                <div class="tnv-modal-body">
                    <form id="tnvForm" onsubmit="tnvSaveReward(event)">
                        
                        <!-- 1. Đối tượng nhận thưởng FIRST -->
                        <div style="margin-bottom:14px;background:#f8fafc;padding:12px 14px;border-radius:10px;border:1px solid #cbd5e1;">
                            <label style="font-weight:700;font-size:12px;color:#334155;display:block;margin-bottom:8px;">🎯 Đối Tượng Nhận Thưởng <span style="color:red">*</span></label>
                            <div style="display:flex;gap:16px;flex-wrap:wrap;">
                                <label style="font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:13px;color:#0f172a;">
                                    <input type="radio" name="mTargetType" value="single" checked onchange="tnvToggleTargetType()"> 👤 Thưởng Cá Nhân (1 NV)
                                </label>
                                <label style="font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:13px;color:#c2410c;">
                                    <input type="radio" name="mTargetType" value="team" onchange="tnvToggleTargetType()"> 👥 Thưởng Cả Team
                                </label>
                                <label style="font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:13px;color:#1e3a8a;">
                                    <input type="radio" name="mTargetType" value="department" onchange="tnvToggleTargetType()"> 🏢 Thưởng Cả Phòng Ban
                                </label>
                            </div>
                        </div>

                        <!-- 2. Tháng Setup & Phòng Ban/Team -->
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                            <div>
                                <label style="font-weight:700;font-size:12px;color:#334155;display:block;margin-bottom:6px;">📅 Tháng Setup <span style="color:red">*</span></label>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                                    <select id="mSetupMonth" class="form-control" style="font-weight:700;" onchange="tnvOnSetupMonthYearChange()"></select>
                                    <select id="mSetupYear" class="form-control" style="font-weight:700;" onchange="tnvOnSetupMonthYearChange()"></select>
                                </div>
                                <input type="hidden" id="mMonthYear">
                            </div>
                            <div>
                                <label id="lblDeptOrTeam" style="font-weight:700;font-size:12px;color:#334155;display:block;margin-bottom:6px;">🏢 Phòng Ban <span style="color:red">*</span></label>
                                <select id="mDeptId" class="form-control" required onchange="tnvOnModalDeptChange()">
                                    <option value="">-- Chọn phòng ban --</option>
                                </select>
                            </div>
                        </div>

                        <!-- 3. Tên Nhân Viên (Chỉ hiển thị khi chọn Thưởng Cá Nhân) -->
                        <div id="singleUserBox" style="margin-bottom:14px;">
                            <label style="font-weight:700;font-size:12px;color:#334155;display:block;margin-bottom:6px;">👤 Tên Nhân Viên <span style="color:red">*</span></label>
                            <div class="tnv-combobox-wrapper">
                                <input type="text" id="mUserSearchInput" class="form-control tnv-combobox-input" placeholder="🔍 Gõ tên nhân viên để tìm nhanh..." autocomplete="off" onfocus="tnvOpenUserDd('modal')" onclick="tnvOpenUserDd('modal')" oninput="tnvFilterUserDd('modal')" onkeydown="tnvKeyUserDd(event, 'modal')">
                                <span id="mUserClearBtn" class="tnv-clear-btn" onclick="tnvClearModalUser()">✕</span>
                                <span class="tnv-arrow-btn" onclick="tnvToggleUserDd('modal', event)" style="cursor:pointer;pointer-events:auto;">▼</span>
                                <input type="hidden" id="mUserId">
                                <div id="mUserDdMenu" class="tnv-dd-menu"></div>
                            </div>
                        </div>

                        <!-- 4. Team Member Preview Box (Chỉ hiển thị khi chọn Thưởng Cả Team) -->
                        <div id="teamPreviewBox" style="margin-bottom:14px;display:none;background:#fff7ed;padding:12px 14px;border-radius:10px;border:1px solid #fed7aa;">
                            <label id="teamMemberTitle" style="font-weight:700;font-size:12px;color:#c2410c;display:block;margin-bottom:8px;">👥 Áp dụng tạo thưởng cho tất cả nhân viên trong Team:</label>
                            <div id="teamMemberBadges" style="display:flex;flex-wrap:wrap;gap:6px;max-height:120px;overflow-y:auto;padding:4px 0;"></div>
                        </div>

                        <div style="margin-bottom:14px;">
                            <label style="font-weight:700;font-size:12px;color:#334155;display:block;margin-bottom:6px;">🏆 Tiêu Đề Giải Thưởng <span style="color:red">*</span></label>
                            <input type="text" id="mRewardTitle" class="form-control" placeholder="Ví dụ: Thủ Lĩnh Doanh Số Tháng, Nhân Viên Bứt Phá Xuất Sắc" oninput="tnvValidateModalState()" required>
                        </div>

                        <div style="margin-bottom:14px;">
                            <label style="font-weight:700;font-size:12px;color:#334155;display:block;margin-bottom:6px;">📝 Nội Dung Thưởng / Điều Kiện Kết Quả Đạt Được</label>
                            <textarea id="mRewardCondition" class="form-control" rows="3" placeholder="Mô tả tiêu chí hoặc kết quả nhân viên cần đạt được (ví dụ: Đạt doanh số affiliate 100M trong tháng...)"></textarea>
                        </div>

                        <div style="margin-bottom:14px;background:#f8fafc;padding:14px;border-radius:10px;border:1px solid #e2e8f0;">
                            <label style="font-weight:700;font-size:12px;color:#334155;display:block;margin-bottom:8px;">🎁 Hình Thức Thưởng <span style="color:red">*</span></label>
                            <div style="display:flex;gap:20px;margin-bottom:12px;">
                                <label style="font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;">
                                    <input type="radio" name="mType" value="money" checked onchange="tnvToggleRewardType()"> 💵 Thưởng Tiền Mặt
                                </label>
                                <label style="font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;">
                                    <input type="radio" name="mType" value="gift" onchange="tnvToggleRewardType()"> 🎁 Thưởng Phần Quà
                                </label>
                            </div>

                            <div id="typeMoneyBox">
                                <label style="font-weight:700;font-size:12px;color:#059669;display:block;margin-bottom:6px;">💰 Số Tiền Thưởng (VNĐ)</label>
                                <input type="number" id="mAmount" class="form-control" min="0" step="10000" placeholder="Nhập số tiền VNĐ (ví dụ: 2000000)">
                            </div>

                            <div id="typeGiftBox" style="display:none;">
                                <label style="font-weight:700;font-size:12px;color:#7c3aed;display:block;margin-bottom:6px;">🎁 Nội Dung Phần Quà</label>
                                <textarea id="mGiftDesc" class="form-control" rows="2" placeholder="Ví dụ: 1 Chuyến du lịch Phú Quốc 3N2Đ hoặc 1 Chiếc tai nghe AirPods Pro"></textarea>
                            </div>
                        </div>

                        <div style="display:flex;justify-content:end;gap:10px;margin-top:20px;">
                            <button type="button" class="btn btn-secondary" onclick="tnvCloseModal()">Hủy Bỏ</button>
                            <button type="submit" id="btnSaveReward" class="btn" style="background:linear-gradient(135deg,#f57c00,#e65100);color:white;font-weight:800;padding:8px 24px;border:none;transition:all 0.2s ease;">💾 Lưu Thưởng</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- Modal Gatekeeper Warning: Yêu cầu hoàn thành giải thưởng các tháng trước -->
        <div id="tnvGatekeeperModal" class="tnv-modal-backdrop" style="display:none;">
            <div class="tnv-modal-content" style="max-width:720px;border-top:5px solid #ef4444;">
                <div class="tnv-modal-header" style="background:linear-gradient(135deg,#991b1b,#7f1d1d);">
                    <h3 style="margin:0;font-size:18px;font-weight:800;color:white;display:flex;align-items:center;gap:8px;">
                        ⚠️ Chưa Thể Setup Thưởng Mới Cho Tháng Này
                    </h3>
                    <button onclick="tnvCloseGatekeeperModal()" style="background:none;border:none;color:white;font-size:20px;cursor:pointer;">✕</button>
                </div>
                <div class="tnv-modal-body">
                    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:12px;padding:16px;margin-bottom:16px;color:#991b1b;font-size:13px;line-height:1.6;">
                        <strong>🛑 Quy Định Bắt Buộc:</strong> Để thiết lập thưởng mới cho tháng tiếp theo, <strong>tất cả các giải thưởng trong các tháng trước</strong> phải được hoàn thành xử lý:
                        <ul style="margin:6px 0 0 18px;padding:0;">
                            <li>Giải thưởng không đạt: Phải bấm chọn 🔴 <b>Báo Không Đạt</b></li>
                            <li>Giải thưởng đạt: Phải bấm chọn 🟢 <b>Báo Đạt Giải</b>, sau đó bấm 🎁 <b>Xác Nhận Đã Trao Giải</b></li>
                        </ul>
                    </div>
                    <h4 style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:10px;">📋 Các giải thưởng chưa hoàn tất ở tháng trước:</h4>
                    <div id="tnvIncompleteList" style="max-height:280px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:10px;padding:12px;background:#f8fafc;">
                    </div>
                    <div style="display:flex;justify-content:end;margin-top:20px;">
                        <button type="button" class="btn btn-danger" onclick="tnvCloseGatekeeperModal()" style="font-weight:800;padding:9px 24px;border-radius:10px;">Đã Hiểu - Hoàn Thành Giải Thưởng Cũ Trước</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Popup So Sánh Khen Thưởng Cùng Kỳ Qua Các Năm -->
        <div id="tnvCompareModal" class="tnv-modal-backdrop" style="display:none;z-index:9999;">
            <div class="tnv-modal-content" style="max-width:920px;width:92%;border-radius:16px;overflow:hidden;">
                <div class="tnv-modal-header" style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:18px 24px;">
                    <h3 style="margin:0;font-size:18px;font-weight:800;color:white;display:flex;align-items:center;gap:8px;">
                        📊 So Sánh Khen Thưởng Cùng Kỳ Qua Các Năm
                    </h3>
                    <button onclick="tnvCloseCompareModal()" style="background:none;border:none;color:white;font-size:22px;cursor:pointer;">✕</button>
                </div>
                <div class="tnv-modal-body" style="padding:24px;max-height:80vh;overflow-y:auto;">
                    <div id="tnvCompareContent">
                        <div style="text-align:center;padding:40px;color:#64748b;font-weight:700;">⏳ Đang tải dữ liệu so sánh...</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Global listener to close dropdown when clicking outside
    if (!window._tnvDropdownListenerAdded) {
        document.addEventListener('click', function(e) {
            if (!e.target.closest('#tnvUserSearchInput') && !e.target.closest('#tnvUserDdMenu')) {
                const fMenu = document.getElementById('tnvUserDdMenu');
                if (fMenu) fMenu.style.display = 'none';
            }
            if (!e.target.closest('#mUserSearchInput') && !e.target.closest('#mUserDdMenu')) {
                const mMenu = document.getElementById('mUserDdMenu');
                if (mMenu) mMenu.style.display = 'none';
            }
            if (!e.target.closest('#tnvPastDdBtn') && !e.target.closest('#tnvPastDropdownMenu')) {
                const pMenu = document.getElementById('tnvPastDropdownMenu');
                if (pMenu) pMenu.style.display = 'none';
            }
        });
        window._tnvDropdownListenerAdded = true;
    }

    // Load staff/depts and rewards data concurrently in parallel for 3x faster page render
    await Promise.all([
        tnvLoadDeptsAndStaff(),
        tnvLoadData()
    ]);
}

function tnvIsMainDeptOrSystem(d) {
    if (!d || !d.name) return false;
    const uName = d.name.toUpperCase().trim();
    if (uName.startsWith('TEAM ') || uName.includes('CẤT CÁNH') || uName.includes('TIÊN PHONG') || uName.includes('TINH HOA') || uName.includes('BỨT PHÁ')) return false;
    return true;
}

function tnvGetDeptPriority(deptId, deptName) {
    const id = Number(deptId);
    const name = (deptName || '').toUpperCase();

    // 1. Explicit ID Priority Map matching System & Sub-department hierarchy (Image 4)
    const ID_MAP = {
        10: 100, // HỆ THỐNG VĂN PHÒNG HV
        1:  110, // PHÒNG KINH DOANH
        4:  120, // PHÒNG SALE
        5:  130, // PHÒNG THIẾT KẾ
        6:  140, // PHÒNG MARKETING
        16: 150, // PHÒNG KẾ TOÁN
        17: 160, // PHÒNG HÀNH CHÍNH NHÂN SỰ
        19: 170, // PHÒNG THỦ QUỸ
        11: 200, // HỆ THỐNG XƯỞNG HV
        8:  210, // PHÒNG CẮT
        12: 220, // PHÒNG IN
        13: 230, // PHÒNG ÉP
        14: 240, // PHÒNG MAY
        15: 250, // PHÒNG HOÀN THIỆN
        18: 260, // PHÒNG THỦ KHO
        20: 300, // HỆ THỐNG AFFILIATE HV
        21: 310  // AFFILIATE TOÀN QUỐC
    };

    if (ID_MAP[id]) return ID_MAP[id];

    // 2. Parent lookup if available in _tnvDepts (Sub-teams follow their parent department's priority)
    if (typeof _tnvDepts !== 'undefined' && Array.isArray(_tnvDepts) && _tnvDepts.length > 0) {
        const dObj = _tnvDepts.find(d => Number(d.id) === id);
        if (dObj && dObj.parent_id) {
            const parentPrio = tnvGetDeptPriority(dObj.parent_id, '');
            if (parentPrio < 900) return parentPrio + 0.1;
        }
    }

    // 3. Fallback name-based matching
    if (name.includes('VĂN PHÒNG')) return 100;
    if (name.includes('KINH DOANH')) return 110;
    if (name.includes('SALE')) return 120;
    if (name.includes('THIẾT KẾ')) return 130;
    if (name.includes('MARKETING') || name.includes('MKT')) return 140;
    if (name.includes('KẾ TOÁN')) return 150;
    if (name.includes('HÀNH CHÍNH') || name.includes('NHÂN SỰ') || name.includes('HCNS')) return 160;
    if (name.includes('THỦ QUỸ')) return 170;

    if (name.includes('XƯỞNG')) return 200;
    if (name.includes('CẮT')) return 210;
    if (name.includes('IN')) return 220;
    if (name.includes('ÉP')) return 230;
    if (name.includes('MAY')) return 240;
    if (name.includes('HOÀN THIỆN')) return 250;
    if (name.includes('THỦ KHO') || name.includes('KHO')) return 260;

    if (name.includes('AFFILIATE')) return 300;

    return 999;
}

function tnvSortDepts(depts) {
    return [...depts].sort((a, b) => {
        const pA = tnvGetDeptPriority(a.id, a.name);
        const pB = tnvGetDeptPriority(b.id, b.name);
        if (pA !== pB) return pA - pB;
        return (a.name || '').localeCompare(b.name || '', 'vi');
    });
}

function tnvGetSubtreeDeptIds(targetDeptId) {
    const targetIdNum = Number(targetDeptId);
    const ids = new Set([targetIdNum]);
    if (!targetIdNum) return ids;

    let added = true;
    while (added) {
        added = false;
        _tnvDepts.forEach(d => {
            if (d.parent_id && ids.has(Number(d.parent_id)) && !ids.has(Number(d.id))) {
                ids.add(Number(d.id));
                added = true;
            }
        });
    }
    return ids;
}

function tnvIsTeamDept(deptId) {
    if (!deptId) return false;
    const dept = _tnvDepts.find(d => Number(d.id) === Number(deptId));
    if (!dept || !dept.parent_id) return false;
    const parent = _tnvDepts.find(p => Number(p.id) === Number(dept.parent_id));
    return Boolean(parent && parent.parent_id);
}

function tnvIsMainDept(deptId) {
    if (!deptId) return false;
    const dept = _tnvDepts.find(d => Number(d.id) === Number(deptId));
    if (!dept || !dept.parent_id) return false;
    const parent = _tnvDepts.find(p => Number(p.id) === Number(dept.parent_id));
    return Boolean(parent && !parent.parent_id);
}

function tnvValidateModalState() {
    const btnSave = document.getElementById('btnSaveReward');
    if (!btnSave) return true;

    const targetType = document.querySelector('input[name="mTargetType"]:checked')?.value || 'single';
    const deptId = document.getElementById('mDeptId')?.value;
    const userId = document.getElementById('mUserId')?.value;
    const title = (document.getElementById('mRewardTitle')?.value || '').trim();

    let isValid = true;
    let invalidReason = '';

    if (!title) {
        isValid = false;
        invalidReason = 'Vui lòng nhập Tiêu Đề Giải Thưởng';
    } else if (targetType === 'team') {
        if (!deptId || !tnvIsTeamDept(deptId)) {
            isValid = false;
            invalidReason = 'Vui lòng chọn đúng 👥 Team nhận thưởng (không chọn Phòng ban hoặc Hệ thống)';
        }
    } else if (targetType === 'department') {
        if (!deptId || !tnvIsMainDept(deptId)) {
            isValid = false;
            invalidReason = 'Vui lòng chọn đúng 🏢 Phòng Ban nhận thưởng (không chọn Hệ thống hoặc Team)';
        }
    } else if (targetType === 'single') {
        if (!deptId) {
            isValid = false;
            invalidReason = 'Vui lòng chọn 🏢 Phòng Ban / Hệ Thống';
        } else if (!userId) {
            isValid = false;
            invalidReason = 'Vui lòng chọn Tên Nhân Viên nhận thưởng';
        }
    }

    if (isValid) {
        btnSave.disabled = false;
        btnSave.style.opacity = '1';
        btnSave.style.cursor = 'pointer';
        btnSave.style.filter = 'none';
        btnSave.style.pointerEvents = 'auto';
        btnSave.title = 'Bấm để lưu thưởng';
    } else {
        btnSave.disabled = true;
        btnSave.style.opacity = '0.4';
        btnSave.style.cursor = 'not-allowed';
        btnSave.style.filter = 'grayscale(80%)';
        btnSave.style.pointerEvents = 'none';
        btnSave.title = invalidReason;
    }

    return isValid;
}

function tnvBuildDeptTreeOptions(depts, mode = 'single') {
    const sorted = [...depts].sort((a, b) => {
        const pA = tnvGetDeptPriority(a.id, a.name);
        const pB = tnvGetDeptPriority(b.id, b.name);
        if (pA !== pB) return pA - pB;
        return (a.name || '').localeCompare(b.name || '', 'vi');
    });

    const roots = sorted.filter(d => !d.parent_id);
    const getChildren = (parentId) => sorted.filter(d => Number(d.parent_id) === Number(parentId));

    let placeholder = '-- Chọn phòng ban --';
    if (mode === 'team') placeholder = '-- Chọn Team nhận thưởng --';
    else if (mode === 'department') placeholder = '-- Chọn Phòng Ban nhận thưởng --';
    else if (mode === 'filter') placeholder = '-- Tất cả phòng ban --';

    let html = `<option value="">${placeholder}</option>`;

    roots.forEach(sys => {
        const isSysDisabled = mode === 'team' || mode === 'department';
        const sysDisAttr = isSysDisabled ? 'disabled' : '';
        const sysColor = isSysDisabled ? '#94a3b8' : '#0f172a';
        const sysBg = isSysDisabled ? '#f1f5f9' : '#ffffff';
        html += `<option value="${sys.id}" ${sysDisAttr} style="font-weight:800;color:${sysColor};background:${sysBg};">🏢 ${sys.name}</option>`;

        const mainDepts = getChildren(sys.id);
        mainDepts.forEach(mainD => {
            let isMainDDisabled = mode === 'team';
            const mainDisAttr = isMainDDisabled ? 'disabled' : '';
            const mainColor = isMainDDisabled ? '#94a3b8' : '#334155';
            const mainBg = isMainDDisabled ? '#f8fafc' : '#ffffff';
            const mainLabel = `&nbsp;&nbsp;📁 ${mainD.name}`;

            html += `<option value="${mainD.id}" ${mainDisAttr} style="font-weight:700;color:${mainColor};background:${mainBg};">${mainLabel}</option>`;

            if (mode === 'team' || mode === 'filter') {
                const subTeams = getChildren(mainD.id);
                subTeams.forEach(team => {
                    let isTeamDisabled = false;
                    const teamDisAttr = isTeamDisabled ? 'disabled' : '';
                    const teamColor = isTeamDisabled ? '#94a3b8' : '#0f172a';
                    const teamBg = isTeamDisabled ? '#f8fafc' : '#ffffff';
                    const teamLabel = `&nbsp;&nbsp;&nbsp;&nbsp;👥 ${team.name}`;

                    html += `<option value="${team.id}" ${teamDisAttr} style="font-weight:600;color:${teamColor};background:${teamBg};">${teamLabel}</option>`;
                });
            }
        });
    });

    const handledIds = new Set();
    roots.forEach(r => {
        handledIds.add(r.id);
        getChildren(r.id).forEach(c => {
            handledIds.add(c.id);
            getChildren(c.id).forEach(gc => handledIds.add(gc.id));
        });
    });

    sorted.forEach(d => {
        if (!handledIds.has(d.id)) {
            if ((mode === 'single' || mode === 'department') && d.parent_id) {
                const parent = depts.find(p => Number(p.id) === Number(d.parent_id));
                if (parent && parent.parent_id) {
                    return;
                }
            }
            const isTeam = tnvIsTeamDept(d.id);
            const isMain = tnvIsMainDept(d.id);
            let isDisabled = false;

            if (mode === 'team') {
                if (!isTeam) isDisabled = true;
            }
            if (mode === 'department') {
                if (!isMain) isDisabled = true;
            }

            const disabledAttr = isDisabled ? 'disabled' : '';
            const color = isDisabled ? '#94a3b8' : '#0f172a';
            const bg = isDisabled ? '#f8fafc' : '#ffffff';
            const labelText = isTeam ? `&nbsp;&nbsp;&nbsp;&nbsp;👥 ${d.name}` : `&nbsp;&nbsp;📁 ${d.name}`;

            html += `<option value="${d.id}" ${disabledAttr} style="font-weight:600;color:${color};background:${bg};">${labelText}</option>`;
        }
    });

    return html;
}

async function tnvLoadDeptsAndStaff() {
    try {
        const [staffRes, deptsRes] = window._crmGetStaffAndDepts 
            ? await window._crmGetStaffAndDepts()
            : await Promise.all([apiCall('/api/managed-staff'), apiCall('/api/departments')]);

        _tnvStaff = staffRes && staffRes.users ? staffRes.users : [];
        _tnvDepts = deptsRes && deptsRes.departments ? deptsRes.departments : (deptsRes || []);

        const deptFilter = document.getElementById('tnvDeptFilter');
        const modalDept = document.getElementById('mDeptId');

        if (deptFilter) deptFilter.innerHTML = tnvBuildDeptTreeOptions(_tnvDepts, 'filter');
        if (modalDept) modalDept.innerHTML = tnvBuildDeptTreeOptions(_tnvDepts, 'single');

    } catch (e) {
        console.error('Error loading depts & staff in tnv:', e);
    }
}

async function tnvToggleTargetType() {
    const targetType = document.querySelector('input[name="mTargetType"]:checked')?.value || 'single';
    const isTeam = targetType === 'team';
    const isDepartment = targetType === 'department';
    const isBatch = isTeam || isDepartment;

    const selectedMonth = document.getElementById('mMonthYear')?.value || '';
    await tnvFetchMonthAssignedUserIds(selectedMonth, targetType);

    const singleBox = document.getElementById('singleUserBox');
    const teamBox = document.getElementById('teamPreviewBox');
    const lblDeptOrTeam = document.getElementById('lblDeptOrTeam');
    const modalDeptSelect = document.getElementById('mDeptId');

    if (lblDeptOrTeam) {
        if (isTeam) {
            lblDeptOrTeam.innerHTML = '👥 Chọn Team Nhận Thưởng <span style="color:red">*</span>';
        } else if (isDepartment) {
            lblDeptOrTeam.innerHTML = '🏢 Chọn Phòng Ban Nhận Thưởng <span style="color:red">*</span>';
        } else {
            lblDeptOrTeam.innerHTML = '🏢 Phòng Ban <span style="color:red">*</span>';
        }
    }

    if (modalDeptSelect) {
        const curVal = modalDeptSelect.value;
        modalDeptSelect.innerHTML = tnvBuildDeptTreeOptions(_tnvDepts, targetType);
        
        let isValidVal = false;
        if (isTeam) {
            isValidVal = tnvIsTeamDept(curVal);
        } else if (isDepartment || targetType === 'single') {
            isValidVal = tnvIsMainDept(curVal);
        }

        if (isValidVal) {
            modalDeptSelect.value = curVal;
        } else {
            modalDeptSelect.value = '';
        }
    }

    if (singleBox) singleBox.style.display = isBatch ? 'none' : 'block';
    if (teamBox) teamBox.style.display = isBatch ? 'block' : 'none';

    if (isBatch) {
        tnvUpdateTeamMemberPreview();
    } else {
        tnvCheckModalDeptSelected();
    }

    tnvValidateModalState();
}

// ========== SEARCHABLE COMBOBOX LOGIC FOR STAFF ==========

function tnvRemoveAccents(str) {
    if (!str || typeof str !== 'string') return '';
    return str.normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/đ/g, 'd')
              .replace(/Đ/g, 'D')
              .toLowerCase();
}

async function tnvFetchMonthAssignedUserIds(monthYearStr, targetType = null) {
    if (!targetType) {
        targetType = document.querySelector('input[name="mTargetType"]:checked')?.value || 'single';
    }
    _tnvModalAssignedUserIds = new Set();
    _tnvModalAssignedDeptRewardDeptIds = new Set();
    _tnvModalAssignedTeamRewardDeptIds = new Set();

    if (!monthYearStr) return;

    try {
        const res = await apiCall(`/api/thuong-nhan-vien?month_year=${monthYearStr}`);
        const rewards = res && res.rewards ? res.rewards : [];
        rewards.forEach(r => {
            if (!_tnvEditId || Number(r.id) !== Number(_tnvEditId)) {
                const titleLower = (r.reward_title || '').toLowerCase();
                const rTargetType = r.target_type || (titleLower.includes('phòng') ? 'department' : (titleLower.includes('team') ? 'team' : 'single'));
                
                if (r.user_id && rTargetType === 'single') {
                    _tnvModalAssignedUserIds.add(Number(r.user_id));
                }
                if (r.department_id) {
                    if (rTargetType === 'department' || titleLower.includes('phòng')) {
                        _tnvModalAssignedDeptRewardDeptIds.add(Number(r.department_id));
                    }
                    if (rTargetType === 'team' || titleLower.includes('team')) {
                        _tnvModalAssignedTeamRewardDeptIds.add(Number(r.department_id));
                    }
                }
            }
        });
    } catch (e) {
        console.error('Error fetching month assigned user/dept IDs:', e);
    }
}

function tnvRenderUserDdList(target, filterKw = '') {
    const isFilter = target === 'filter';
    const menuEl = document.getElementById(isFilter ? 'tnvUserDdMenu' : 'mUserDdMenu');
    const selectedVal = document.getElementById(isFilter ? 'tnvUserFilter' : 'mUserId')?.value;
    const deptVal = document.getElementById(isFilter ? 'tnvDeptFilter' : 'mDeptId')?.value;

    if (!menuEl) return;

    if (isFilter) {
        const rawKw = (filterKw || '').trim();
        const cleanKw = tnvRemoveAccents(rawKw);

        let html = '';
        const isAllActive = selectedVal === 'all' ? 'active' : '';
        html += `<div class="tnv-dd-item ${isAllActive}" onclick="tnvSelectUser('filter', 'all', '-- Tất cả nhân viên --', '')">
            <span>-- Tất cả nhân viên --</span>
        </div>`;

        // Use GROUPED data (same as what the table renders) to extract unique column values
        const groupedList = tnvGroupRewards(_tnvAllRewards);
        const addedKeys = new Set();
        let matchCount = 0;

        groupedList.forEach(r => {
            const isDeptReward = r.target_type === 'department';
            const isTeamReward = r.isGroup && !isDeptReward;

            if (r.isGroup) {
                if (isDeptReward) {
                    if (!addedKeys.has('dept_all')) {
                        addedKeys.add('dept_all');
                        if (!cleanKw || tnvRemoveAccents('Tat ca phong').includes(cleanKw)) {
                            matchCount++;
                            const isSel = selectedVal === 'dept_all' ? 'active' : '';
                            html += `
                                <div class="tnv-dd-item ${isSel}" onclick="tnvSelectUser('filter', 'dept_all', '🏢 Tất cả phòng', '')">
                                    <span style="font-weight:700;color:#c2410c;">🏢 Tất cả phòng</span>
                                    <span class="tnv-dd-role" style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;">Thưởng Phòng</span>
                                </div>
                            `;
                        }
                    }
                } else {
                    if (!addedKeys.has('team_all')) {
                        addedKeys.add('team_all');
                        if (!cleanKw || tnvRemoveAccents('Tat ca team').includes(cleanKw)) {
                            matchCount++;
                            const isSel = selectedVal === 'team_all' ? 'active' : '';
                            html += `
                                <div class="tnv-dd-item ${isSel}" onclick="tnvSelectUser('filter', 'team_all', '👥 Tất cả team', '')">
                                    <span style="font-weight:700;color:#c2410c;">👥 Tất cả team</span>
                                    <span class="tnv-dd-role" style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;">Thưởng Team</span>
                                </div>
                            `;
                        }
                    }
                }
            } else {
                // Individual reward - show specific user
                if (r.user_id) {
                    const uId = Number(r.user_id);
                    if (!addedKeys.has(uId)) {
                        addedKeys.add(uId);
                        const staffObj = _tnvStaff.find(u => Number(u.id) === uId);
                        const uName = staffObj ? staffObj.full_name : (r.user_name || 'Nhân viên');
                        const roleLbl = staffObj ? tnvGetRoleLabel(staffObj.role) : 'NV';

                        const nameClean = tnvRemoveAccents(uName);
                        const roleClean = tnvRemoveAccents(roleLbl);

                        if (!cleanKw || nameClean.includes(cleanKw) || roleClean.includes(cleanKw)) {
                            matchCount++;
                            const isSel = String(selectedVal) === String(uId) ? 'active' : '';
                            html += `
                                <div class="tnv-dd-item ${isSel}" onclick="tnvSelectUser('filter', ${uId}, '${uName.replace(/'/g, "\\'")}', '${roleLbl.replace(/'/g, "\\'")}')">
                                    <span>👤 ${uName}</span>
                                    <span class="tnv-dd-role">${roleLbl}</span>
                                </div>
                            `;
                        }
                    }
                }
            }
        });

        if (addedKeys.size === 0) {
            html += `<div style="padding:12px;text-align:center;color:#94a3b8;font-size:12px;">Không có dữ liệu thưởng nào trong tháng này</div>`;
        } else if (matchCount === 0 && cleanKw) {
            html += `<div style="padding:12px;text-align:center;color:#94a3b8;font-size:12px;">Không tìm thấy kết quả phù hợp với "${rawKw}"</div>`;
        }

        menuEl.innerHTML = html;
        return;
    }

    let filteredUsers = [..._tnvStaff];

    if (deptVal && deptVal !== 'all' && deptVal !== '') {
        const allowedDeptIds = tnvGetSubtreeDeptIds(deptVal);
        filteredUsers = filteredUsers.filter(u => allowedDeptIds.has(Number(u.department_id)));
    }

    const rawKw = (filterKw || '').trim();
    const cleanKw = tnvRemoveAccents(rawKw);

    if (cleanKw) {
        filteredUsers = filteredUsers.filter(u => {
            const nameClean = tnvRemoveAccents(u.full_name || '');
            const roleClean = tnvRemoveAccents(tnvGetRoleLabel(u.role));
            return nameClean.includes(cleanKw) || roleClean.includes(cleanKw);
        });
    }

    // Sort by role hierarchy priority
    filteredUsers.sort((a, b) => {
        const pA = ROLE_PRIORITY[a.role] || 99;
        const pB = ROLE_PRIORITY[b.role] || 99;
        if (pA !== pB) return pA - pB;
        return (a.full_name || '').localeCompare(b.full_name || '', 'vi');
    });

    let html = '';
    if (filteredUsers.length === 0) {
        html += `<div style="padding:12px;text-align:center;color:#94a3b8;font-size:12px;">Không tìm thấy nhân viên "${rawKw}"</div>`;
    } else {
        filteredUsers.forEach(u => {
            const roleLbl = tnvGetRoleLabel(u.role);
            const isSel = String(selectedVal) === String(u.id) ? 'active' : '';
            const displayName = `${u.full_name}`;
            html += `
                <div class="tnv-dd-item ${isSel}" onclick="tnvSelectUser('${target}', ${u.id}, '${displayName.replace(/'/g, "\\'")}', '${roleLbl.replace(/'/g, "\\'")}')">
                    <span>${u.full_name}</span>
                    <span class="tnv-dd-role">${roleLbl}</span>
                </div>
            `;
        });
    }

    menuEl.innerHTML = html;
}

function tnvOpenUserDd(target) {
    const isFilter = target === 'filter';

    if (!isFilter) {
        const deptId = document.getElementById('mDeptId')?.value;
        if (!deptId) {
            alert('⚠️ Vui lòng chọn 🏢 Phòng Ban trước khi chọn Nhân Viên!');
            const deptEl = document.getElementById('mDeptId');
            if (deptEl) deptEl.focus();
            const inputEl = document.getElementById('mUserSearchInput');
            if (inputEl) inputEl.blur();
            return;
        }
    }

    const menuEl = document.getElementById(isFilter ? 'tnvUserDdMenu' : 'mUserDdMenu');
    const inputEl = document.getElementById(isFilter ? 'tnvUserSearchInput' : 'mUserSearchInput');
    
    if (inputEl) {
        inputEl.select(); // Highlight text so user can immediately type to overwrite
    }

    if (menuEl) {
        // Show complete list on open focus if text hasn't been modified to a query
        tnvRenderUserDdList(target, inputEl ? inputEl.value : '');
        menuEl.style.display = 'block';
    }
}

function tnvToggleUserDd(target, event) {
    if (event) event.stopPropagation();
    const isFilter = target === 'filter';
    const menuEl = document.getElementById(isFilter ? 'tnvUserDdMenu' : 'mUserDdMenu');

    if (menuEl && menuEl.style.display === 'block' && event && event.target && event.target.classList.contains('tnv-arrow-btn')) {
        menuEl.style.display = 'none';
        return;
    }

    tnvOpenUserDd(target);
}

function tnvFilterUserDd(target) {
    const isFilter = target === 'filter';

    if (!isFilter) {
        const deptId = document.getElementById('mDeptId')?.value;
        if (!deptId) {
            alert('⚠️ Vui lòng chọn 🏢 Phòng Ban trước khi chọn Nhân Viên!');
            const deptEl = document.getElementById('mDeptId');
            if (deptEl) deptEl.focus();
            const inputEl = document.getElementById('mUserSearchInput');
            if (inputEl) {
                inputEl.value = '';
                inputEl.blur();
            }
            return;
        }
    }

    const menuEl = document.getElementById(isFilter ? 'tnvUserDdMenu' : 'mUserDdMenu');
    const inputEl = document.getElementById(isFilter ? 'tnvUserSearchInput' : 'mUserSearchInput');
    const clearBtn = document.getElementById(isFilter ? 'tnvUserClearBtn' : 'mUserClearBtn');

    if (clearBtn) {
        clearBtn.style.display = (inputEl && inputEl.value) ? 'block' : 'none';
    }

    if (menuEl) {
        menuEl.style.display = 'block';
        tnvRenderUserDdList(target, inputEl ? inputEl.value : '');
    }
}

function tnvKeyUserDd(e, target) {
    const isFilter = target === 'filter';
    const menuEl = document.getElementById(isFilter ? 'tnvUserDdMenu' : 'mUserDdMenu');
    if (!menuEl || menuEl.style.display === 'none') return;

    const items = Array.from(menuEl.querySelectorAll('.tnv-dd-item'));
    if (!items.length) return;

    let focusedIdx = items.findIndex(item => item.classList.contains('focused'));

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (focusedIdx >= 0) items[focusedIdx].classList.remove('focused');
        focusedIdx = (focusedIdx + 1) % items.length;
        items[focusedIdx].classList.add('focused');
        items[focusedIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (focusedIdx >= 0) items[focusedIdx].classList.remove('focused');
        focusedIdx = (focusedIdx - 1 + items.length) % items.length;
        items[focusedIdx].classList.add('focused');
        items[focusedIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (focusedIdx >= 0) {
            items[focusedIdx].click();
        }
    } else if (e.key === 'Escape') {
        menuEl.style.display = 'none';
    }
}

function tnvSelectUser(target, userId, userName, roleLabel) {
    const isFilter = target === 'filter';
    const inputEl = document.getElementById(isFilter ? 'tnvUserSearchInput' : 'mUserSearchInput');
    const hiddenEl = document.getElementById(isFilter ? 'tnvUserFilter' : 'mUserId');
    const clearBtn = document.getElementById(isFilter ? 'tnvUserClearBtn' : 'mUserClearBtn');
    const menuEl = document.getElementById(isFilter ? 'tnvUserDdMenu' : 'mUserDdMenu');

    if (hiddenEl) hiddenEl.value = userId;
    if (inputEl) {
        inputEl.value = (userId === 'all' || !userId) ? '' : userName;
    }
    if (clearBtn) {
        clearBtn.style.display = (userId !== 'all' && userId) ? 'block' : 'none';
    }
    if (menuEl) menuEl.style.display = 'none';

    if (isFilter) {
        tnvOnFilterChange();
    } else {
        tnvValidateModalState();
    }
}

function tnvClearUserFilter() {
    tnvSelectUser('filter', 'all', '-- Tất cả nhân viên --', '');
    // Re-open dropdown after clearing so user can pick a new option
    setTimeout(() => {
        const inputEl = document.getElementById('tnvUserSearchInput');
        if (inputEl) {
            inputEl.focus();
            tnvOpenUserDd('filter');
        }
    }, 100);
}

function tnvClearModalUser() {
    tnvSelectUser('modal', '', '', '');
}

function tnvOnDeptFilterChange() {
    // Reset user filter when department changes
    tnvClearUserFilter();
    tnvOnFilterChange();
}

function tnvCheckModalDeptSelected() {
    const deptId = document.getElementById('mDeptId')?.value;
    const userInput = document.getElementById('mUserSearchInput');
    
    if (!userInput) return;

    if (!deptId) {
        userInput.placeholder = "⚠️ Vui lòng chọn Phòng Ban trước (*)...";
        userInput.style.backgroundColor = "#f8fafc";
    } else {
        userInput.placeholder = "🔍 Gõ tên nhân viên để tìm nhanh...";
        userInput.style.backgroundColor = "#ffffff";
    }
}



function tnvUpdateTeamMemberPreview() {
    const targetType = document.querySelector('input[name="mTargetType"]:checked')?.value || 'single';
    const deptId = document.getElementById('mDeptId')?.value;
    const teamContainer = document.getElementById('teamMemberBadges');
    const teamTitleEl = document.getElementById('teamMemberTitle');
    if (!teamTitleEl) return;

    if (!deptId) {
        teamTitleEl.innerHTML = '⚠️ <i>Vui lòng chọn 🏢 Phòng Ban / Team ở trên trước...</i>';
        if (teamContainer) teamContainer.style.display = 'none';
        return;
    }

    const deptObj = _tnvDepts.find(d => Number(d.id) === Number(deptId));
    const deptName = deptObj ? deptObj.name : 'Team / Phòng Ban';
    const isSubTeam = deptObj && deptObj.parent_id;

    const allowedDeptIds = tnvGetSubtreeDeptIds(deptId);
    const members = _tnvStaff.filter(u => allowedDeptIds.has(Number(u.department_id)));

    const iconStr = targetType === 'department' ? '🏢' : (isSubTeam ? '👥' : '🏢');
    const typeStr = targetType === 'department' ? 'CẢ PHÒNG BAN' : (isSubTeam ? 'CẢ TEAM' : 'CẢ PHÒNG');

    if (members.length === 0) {
        teamTitleEl.innerHTML = `${iconStr} <strong>${deptName}</strong> chưa có nhân viên nào trong hệ thống`;
        if (teamContainer) teamContainer.style.display = 'none';
        return;
    }

    teamTitleEl.innerHTML = `${iconStr} Áp dụng giải thưởng cho <strong>${typeStr}: ${deptName}</strong> (${members.length} nhân viên nhận giải)`;

    if (teamContainer) {
        teamContainer.style.display = 'none';
        teamContainer.innerHTML = '';
    }
}

function tnvOnModalDeptChange() {
    tnvClearModalUser();
    tnvCheckModalDeptSelected();

    const targetType = document.querySelector('input[name="mTargetType"]:checked')?.value || 'single';
    const deptSelect = document.getElementById('mDeptId');
    const deptId = deptSelect?.value;

    if (targetType === 'team' && deptId && !tnvIsTeamDept(deptId)) {
        if (deptSelect) deptSelect.value = '';
    } else if (targetType === 'department' && deptId && !tnvIsMainDept(deptId)) {
        if (deptSelect) deptSelect.value = '';
    }

    tnvUpdateTeamMemberPreview();

    const isBatch = targetType === 'team' || targetType === 'department';
    const validDeptId = document.getElementById('mDeptId')?.value;
    if (validDeptId && !isBatch) {
        const userInput = document.getElementById('mUserSearchInput');
        if (userInput) {
            userInput.focus();
            tnvOpenUserDd('modal');
        }
    }

    tnvValidateModalState();
}

async function tnvLoadData() {
    const yrEl = document.getElementById('tnvYearSelect');
    const mEl = document.getElementById('tnvMonthSelect');
    const deptFilter = document.getElementById('tnvDeptFilter');
    const userFilter = document.getElementById('tnvUserFilter');

    if (yrEl) _tnvSelectedYear = yrEl.value;
    if (mEl) _tnvSelectedMonth = mEl.value;
    if (deptFilter) _tnvSelectedDept = deptFilter.value;
    if (userFilter) _tnvSelectedUser = userFilter.value;

    try {
        // When filtering by dept_all or team_all, send user_id=all to API (filter client-side in tnvRenderTable)
        const apiUserId = (_tnvSelectedUser === 'dept_all' || _tnvSelectedUser === 'team_all') ? 'all' : _tnvSelectedUser;
        const query = `year=${_tnvSelectedYear}&month=${_tnvSelectedMonth}&department_id=${_tnvSelectedDept}&user_id=${apiUserId}`;
        const res = await apiCall(`/api/thuong-nhan-vien?${query}`);
        _tnvAllRewards = res && res.rewards ? res.rewards : [];

        // Auto reset user filter if currently selected employee is not in this month's active reward list
        // Skip reset for special filter values 'dept_all' and 'team_all' (these are client-side filters, not user IDs)
        if (_tnvSelectedUser !== 'all' && _tnvSelectedUser !== 'dept_all' && _tnvSelectedUser !== 'team_all') {
            const activeUserIds = new Set();
            _tnvAllRewards.forEach(r => {
                if (r.user_id) activeUserIds.add(Number(r.user_id));
                if (r.department_id) {
                    const allowedDeptIds = tnvGetSubtreeDeptIds(r.department_id);
                    _tnvStaff.forEach(u => {
                        if (allowedDeptIds.has(Number(u.department_id))) {
                            activeUserIds.add(Number(u.id));
                        }
                    });
                }
            });
            if (!activeUserIds.has(Number(_tnvSelectedUser))) {
                _tnvSelectedUser = 'all';
                const hiddenEl = document.getElementById('tnvUserFilter');
                const inputEl = document.getElementById('tnvUserSearchInput');
                const clearBtn = document.getElementById('tnvUserClearBtn');
                if (hiddenEl) hiddenEl.value = 'all';
                if (inputEl) inputEl.value = '';
                if (clearBtn) clearBtn.style.display = 'none';
            }
        }
        
        tnvUpdateStats();
        tnvRenderTable();
    } catch (e) {
        console.error('Error loading rewards data:', e);
        const tbody = document.getElementById('tnvTbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:red;padding:20px;">❌ Lỗi tải dữ liệu: ${e.message}</td></tr>`;
    }
}

function tnvUpdateStats() {
    const groupedList = tnvGroupRewards(_tnvAllRewards);
    let totalCount = groupedList.length;
    let totalMoney = 0;
    let totalGifts = 0;
    let userSet = new Set();

    _tnvAllRewards.forEach(r => {
        if (r.user_id) userSet.add(r.user_id);
        if (r.reward_type === 'gift') {
            totalGifts++;
        } else {
            totalMoney += Number(r.reward_amount) || 0;
        }
    });

    const elCount = document.getElementById('stTotalRewards');
    const elMoney = document.getElementById('stTotalMoney');
    const elGifts = document.getElementById('stTotalGifts');
    const elUsers = document.getElementById('stTotalUsers');

    if (elCount) elCount.innerText = totalCount;
    if (elMoney) elMoney.innerText = _tnvFmtMoney(totalMoney);
    if (elGifts) elGifts.innerText = totalGifts + ' phần quà';
    if (elUsers) elUsers.innerText = userSet.size + ' nhân viên';

    // 1. Dynamic Archive Banner Theme
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const curMonthStr = `${curYear}-${String(curMonth).padStart(2, '0')}`;

    const isPastYear = (_tnvSelectedYear !== 'all' && parseInt(_tnvSelectedYear, 10) < curYear);
    const isPastMonthInCurYear = (_tnvSelectedYear !== 'all' && parseInt(_tnvSelectedYear, 10) === curYear && _tnvSelectedMonth !== 'all' && parseInt(_tnvSelectedMonth, 10) < curMonth);
    const isPast = isPastYear || isPastMonthInCurYear;

    const heroCard = document.querySelector('.tnv-hero-card');
    const heroTitle = heroCard ? heroCard.querySelector('h2') : null;
    const heroDesc = heroCard ? heroCard.querySelector('p') : null;

    if (heroCard) {
        if (isPast && _tnvSelectedYear !== 'all' && _tnvSelectedMonth !== 'all') {
            heroCard.style.background = 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)';
            if (heroTitle) heroTitle.innerHTML = `🏛️ Hồ Sơ Lưu Trữ Thưởng Tháng ${_tnvSelectedMonth}/${_tnvSelectedYear} <span style="font-size:12px;background:rgba(255,255,255,0.2);color:#fef08a;padding:3px 10px;border-radius:12px;vertical-align:middle;margin-left:8px;font-weight:700;">📜 HỒ SƠ QUÁ KHỨ</span>`;
            if (heroDesc) heroDesc.innerText = `Dữ liệu lịch sử khen thưởng thành tích đã chốt của Tháng ${_tnvSelectedMonth}/${_tnvSelectedYear}`;
        } else {
            heroCard.style.background = 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)';
            if (heroTitle) heroTitle.innerHTML = `🎁 Quản Lý & Setup Thưởng Nhân Viên`;
            if (heroDesc) heroDesc.innerText = `Gom nhóm và thiết lập các giải thưởng, thành tích cho từng nhân viên theo tháng`;
        }
    }

    // 2. Render Quick Jump Buttons for Past Years
    tnvRenderQuickPastButtons();
}

function tnvRenderQuickPastButtons() {
    const container = document.getElementById('tnvQuickPastContainer');
    if (!container) return;

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;

    const yrEl = document.getElementById('tnvYearSelect');
    const mEl = document.getElementById('tnvMonthSelect');

    const selYStr = yrEl ? yrEl.value : String(curYear);
    const selMStr = mEl ? mEl.value : String(curMonth).padStart(2, '0');

    if (selMStr === 'all') {
        container.innerHTML = '';
        return;
    }

    const selY = parseInt(selYStr, 10);
    const isPastViewing = (selYStr !== 'all' && selY < curYear);

    // Build items for the dropdown menu (only past years < curYear)
    let menuItemsHtml = '';
    for (let y = curYear - 1; y >= 2024; y--) {
        const isSelected = (y === selY);
        const yearsAgo = curYear - y;
        const yearsAgoText = yearsAgo === 1 ? 'Năm ngoái' : `${yearsAgo} năm trước`;
        menuItemsHtml += `
            <div class="tnv-dd-item ${isSelected ? 'active' : ''}" onclick="tnvQuickJumpYear('${y}'); tnvClosePastDropdownMenu();" style="padding:9px 14px;cursor:pointer;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #f1f5f9;white-space:nowrap;color:${isSelected ? '#e65100' : '#334155'};background:${isSelected ? '#fff7ed' : 'white'};">
                <span>📁 Tháng ${selMStr} / Năm ${y}</span>
                <span style="font-size:10px;color:#64748b;background:#f1f5f9;padding:2px 6px;border-radius:8px;font-weight:600;">${yearsAgoText}</span>
            </div>
        `;
    }

    if (!menuItemsHtml) {
        container.innerHTML = '';
        return;
    }

    let returnBtnHtml = '';
    if (isPastViewing) {
        returnBtnHtml = `
            <button class="btn btn-sm" onclick="tnvQuickJumpYear('${curYear}')" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;font-size:11px;font-weight:700;padding:5px 12px;border-radius:16px;cursor:pointer;white-space:nowrap;transition:all 0.15s ease;" title="Trở về xem tháng hiện tại năm nay">
                🔴 Quay Về Hiện Tại (${selMStr}/${curYear})
            </button>
        `;
    }

    const menuBtnText = isPastViewing ? `📜 Đổi Năm Quá Khứ ▾` : `⏪ Lịch Sử Tháng ${selMStr} ▾`;

    container.innerHTML = `
        ${returnBtnHtml}
        <div style="position:relative;display:inline-block;">
            <button id="tnvPastDdBtn" class="btn btn-sm" onclick="tnvTogglePastDropdownMenu(event)" style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;font-size:11px;font-weight:700;padding:5px 12px;border-radius:16px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;box-shadow:0 1px 2px rgba(0,0,0,0.04);transition:all 0.15s ease;" title="Bấm để chọn xem tháng ${selMStr} các năm trong quá khứ">
                ${menuBtnText}
            </button>
            <div id="tnvPastDropdownMenu" class="tnv-dd-menu" style="display:none;position:absolute;top:100%;left:0;margin-top:6px;min-width:210px;max-height:260px;overflow-y:auto;z-index:999;background:white;border:1px solid #cbd5e1;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.15);padding:4px 0;">
                <div style="padding:6px 12px;font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
                    📜 Chọn Năm Tra Cứu (Tháng ${selMStr})
                </div>
                ${menuItemsHtml}
            </div>
        </div>
    `;
}

function tnvTogglePastDropdownMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('tnvPastDropdownMenu');
    if (menu) {
        menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
    }
}

function tnvClosePastDropdownMenu() {
    const menu = document.getElementById('tnvPastDropdownMenu');
    if (menu) menu.style.display = 'none';
}

function tnvQuickJumpYear(yearStr) {
    const yrEl = document.getElementById('tnvYearSelect');
    if (yrEl) {
        yrEl.value = yearStr;
        tnvOnFilterChange();
    }
}

async function tnvOpenCompareModal() {
    const modal = document.getElementById('tnvCompareModal');
    const content = document.getElementById('tnvCompareContent');
    if (!modal || !content) return;

    modal.style.display = 'flex';
    content.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b;font-weight:700;">⏳ Đang tải dữ liệu so sánh cùng kỳ...</div>';

    const now = new Date();
    const curYear = now.getFullYear();
    const mEl = document.getElementById('tnvMonthSelect');
    let selM = mEl ? mEl.value : 'all';
    if (selM === 'all') {
        selM = String(now.getMonth() + 1).padStart(2, '0');
    }

    try {
        const res = await apiCall(`/api/thuong-nhan-vien?year=all&month=${selM}`);
        const rewards = res && res.rewards ? res.rewards : [];

        // Group rewards by year (only include past & present years <= curYear)
        const yearData = {};
        for (let y = curYear; y >= 2024; y--) {
            yearData[y] = [];
        }

        rewards.forEach(r => {
            const [yStr] = (r.month_year || '').split('-');
            const y = parseInt(yStr, 10);
            if (y && y <= curYear && yearData[y] !== undefined) {
                yearData[y].push(r);
            }
        });

        // Compute metrics for each year
        const statsByYear = {};
        const availableYears = [];

        for (let y = curYear; y >= 2024; y--) {
            const list = yearData[y] || [];
            availableYears.push(y);
            const groupedList = tnvGroupRewards(list);
            let totalMoney = 0;
            let totalGifts = 0;
            const userSet = new Set();

            list.forEach(r => {
                if (r.user_id) userSet.add(r.user_id);
                if (r.reward_type === 'gift') totalGifts++;
                else totalMoney += Number(r.reward_amount) || 0;
            });

            statsByYear[y] = {
                year: y,
                totalRewards: groupedList.length,
                totalMoney: totalMoney,
                totalGifts: totalGifts,
                userCount: userSet.size,
                rawCount: list.length
            };
        }

        // Render Side-by-Side Comparison UI
        let cardsHtml = '';
        availableYears.forEach((y) => {
            const st = statsByYear[y];
            const isCur = (y === curYear);
            const cardBg = isCur ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' : '#f8fafc';
            const borderCol = isCur ? '#2563eb' : '#cbd5e1';
            const badgeText = isCur ? `Năm Hiện Tại (${y})` : `Năm Quá Khứ (${y})`;

            // Calculate growth compared to previous year if available
            let growthHtml = '';
            const prevY = y - 1;
            if (statsByYear[prevY]) {
                const prevMoney = statsByYear[prevY].totalMoney;
                if (prevMoney > 0) {
                    const diffPct = (((st.totalMoney - prevMoney) / prevMoney) * 100).toFixed(1);
                    const isUp = diffPct >= 0;
                    growthHtml = `<div style="font-size:12px;font-weight:800;color:${isUp ? '#059669' : '#dc2626'};margin-top:8px;background:white;padding:4px 8px;border-radius:8px;border:1px solid #e2e8f0;display:inline-block;">${isUp ? '▲ +' : '▼ '}${diffPct}% so với ${prevY}</div>`;
                } else if (st.totalMoney > 0) {
                    growthHtml = `<div style="font-size:12px;font-weight:800;color:#059669;margin-top:8px;background:white;padding:4px 8px;border-radius:8px;border:1px solid #e2e8f0;display:inline-block;">▲ +100% so với ${prevY}</div>`;
                }
            }

            cardsHtml += `
                <div style="flex:1;min-width:240px;background:${cardBg};border:2px solid ${borderCol};border-radius:14px;padding:18px;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #cbd5e1;padding-bottom:8px;">
                        <span style="font-size:17px;font-weight:800;color:#0f172a;">📅 Tháng ${selM}/${y}</span>
                        <span style="font-size:11px;font-weight:700;background:${isCur ? '#2563eb' : '#64748b'};color:white;padding:3px 10px;border-radius:12px;">${badgeText}</span>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:10px;font-size:13px;">
                        <div style="display:flex;justify-content:space-between;">
                            <span style="color:#64748b;font-weight:600;">🏆 Số giải thưởng:</span>
                            <strong style="color:#0f172a;">${st.totalRewards} giải</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;">
                            <span style="color:#64748b;font-weight:600;">💰 Tổng tiền thưởng:</span>
                            <strong style="color:#059669;font-size:15px;">${st.totalMoney.toLocaleString('vi-VN')} VNĐ</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;">
                            <span style="color:#64748b;font-weight:600;">🎁 Tổng phần quà:</span>
                            <strong style="color:#7c3aed;">${st.totalGifts} quà</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;">
                            <span style="color:#64748b;font-weight:600;">👥 Nhân viên đạt:</span>
                            <strong style="color:#2563eb;">${st.userCount} NV</strong>
                        </div>
                        ${growthHtml}
                    </div>
                </div>
            `;
        });

        content.innerHTML = `
            <div style="margin-bottom:20px;background:#f1f5f9;padding:14px 18px;border-radius:12px;border:1px solid #cbd5e1;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                <div>
                    <span style="font-weight:800;color:#1e293b;font-size:16px;">📊 Bảng Đối Chiếu Thưởng Tháng ${selM} Qua Các Năm</span>
                    <p style="margin:2px 0 0;font-size:12px;color:#64748b;">So sánh chi tiết quỹ thưởng, số giải và nhân viên nhận thưởng cùng kỳ</p>
                </div>
            </div>
            <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px;">
                ${cardsHtml}
            </div>
            <div style="display:flex;justify-content:end;">
                <button type="button" class="btn btn-secondary" onclick="tnvCloseCompareModal()" style="font-weight:800;padding:10px 24px;border-radius:10px;">Đóng Bảng So Sánh</button>
            </div>
        `;

    } catch (e) {
        content.innerHTML = `<div style="padding:20px;color:red;text-align:center;font-weight:700;">❌ Lỗi tải dữ liệu so sánh: ${e.message}</div>`;
    }
}

function tnvCloseCompareModal() {
    const modal = document.getElementById('tnvCompareModal');
    if (modal) modal.style.display = 'none';
}

function tnvGroupRewards(rewardsList) {
    if (!Array.isArray(rewardsList)) return [];
    const grouped = [];
    const teamGroups = {};

    // Count occurrences of (month_year + title + amount) across all items
    const titleCounts = {};
    for (const r of rewardsList) {
        const titleLower = (r.reward_title || '').toLowerCase().trim();
        const countKey = `${r.month_year}_${titleLower}_${r.reward_amount || 0}`;
        titleCounts[countKey] = (titleCounts[countKey] || 0) + 1;
    }

    for (const r of rewardsList) {
        const titleLower = (r.reward_title || '').toLowerCase().trim();
        const countKey = `${r.month_year}_${titleLower}_${r.reward_amount || 0}`;

        const isBatch = Boolean(r.batch_id) ||
                        r.target_type === 'team' ||
                        r.target_type === 'department' ||
                        titleCounts[countKey] > 1 ||
                        titleLower.includes('giải nhất') ||
                        titleLower.includes('giải nhát') ||
                        titleLower.includes('pk') ||
                        titleLower.includes('thủ lĩnh') ||
                        titleLower.includes('team') ||
                        titleLower.includes('phòng') ||
                        titleLower === '23423';

        if (!isBatch) {
            grouped.push({
                ...r,
                isGroup: false
            });
        } else {
            const key = r.batch_id ? r.batch_id : countKey;
            const isDept = r.target_type === 'department' || titleLower.includes('phòng');
            if (!teamGroups[key]) {
                teamGroups[key] = {
                    ...r,
                    isGroup: true,
                    target_type: isDept ? 'department' : (r.target_type || 'team'),
                    ids: [r.id],
                    memberNames: r.user_name ? [r.user_name] : [],
                    memberCount: 1,
                    _statuses: [r.award_status || 'pending']
                };
                grouped.push(teamGroups[key]);
            } else {
                teamGroups[key].ids.push(r.id);
                if (r.user_name && !teamGroups[key].memberNames.includes(r.user_name)) {
                    teamGroups[key].memberNames.push(r.user_name);
                }
                teamGroups[key].memberCount = teamGroups[key].ids.length;
                teamGroups[key]._statuses.push(r.award_status || 'pending');
                if (isDept) {
                    teamGroups[key].target_type = 'department';
                }
            }
        }
    }

    // Compute aggregated status for each group
    for (const key in teamGroups) {
        const group = teamGroups[key];
        const stList = group._statuses || [];
        if (stList.length > 0) {
            if (stList.every(st => st === 'handed_over')) {
                group.award_status = 'handed_over';
            } else if (stList.every(st => st === 'not_achieved')) {
                group.award_status = 'not_achieved';
            } else if (stList.some(st => st === 'pending' || !st)) {
                group.award_status = 'pending';
            } else if (stList.some(st => st === 'achieved')) {
                group.award_status = 'achieved';
            }
        }
    }

    return grouped;
}

function tnvRenderTable() {
    const tbody = document.getElementById('tnvTbody');
    if (!tbody) return;

    const keyword = (document.getElementById('tnvSearchInput')?.value || '').toLowerCase().trim();

    let list = _tnvAllRewards.filter(r => {
        if (!keyword) return true;
        const uName = (r.user_name || '').toLowerCase();
        const dName = (r.department_name || '').toLowerCase();
        const title = (r.reward_title || '').toLowerCase();
        const cond = (r.reward_condition || '').toLowerCase();
        const gift = (r.reward_gift_description || '').toLowerCase();
        return uName.includes(keyword) || dName.includes(keyword) || title.includes(keyword) || cond.includes(keyword) || gift.includes(keyword);
    });

    // Group team rewards so batch items display as 1 single row
    let groupedList = tnvGroupRewards(list);

    // Apply special filters for "Tất cả phòng" and "Tất cả team" dropdown selections
    if (_tnvSelectedUser === 'dept_all') {
        groupedList = groupedList.filter(r => {
            const titleLower = (r.reward_title || '').toLowerCase();
            return r.target_type === 'department' || titleLower.includes('phòng');
        });
    } else if (_tnvSelectedUser === 'team_all') {
        groupedList = groupedList.filter(r => {
            const titleLower = (r.reward_title || '').toLowerCase();
            return (r.target_type === 'team' || titleLower.includes('team') || titleLower.includes('bứt phá') || titleLower.includes('xã hội')) && r.target_type !== 'department';
        });
    }

    // Sort list by Department priority hierarchy
    groupedList.sort((a, b) => {
        const pA = tnvGetDeptPriority(a.department_id, a.department_name);
        const pB = tnvGetDeptPriority(b.department_id, b.department_name);
        if (pA !== pB) return pA - pB;
        return a.id - b.id;
    });

    if (groupedList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#94a3b8;">📭 Chưa có khoản thưởng nào phù hợp với bộ lọc tìm kiếm</td></tr>`;
        return;
    }

    tbody.innerHTML = groupedList.map((r, idx) => {
        const isGift = r.reward_type === 'gift';
        const giftText = _tnvCapitalize(r.reward_gift_description || 'Phần quà');
        const valBadge = isGift
            ? `<div class="tnv-badge-gift">🎁 ${giftText}</div>`
            : `<div class="tnv-badge-money">💰 ${Number(r.reward_amount || 0).toLocaleString('vi-VN')} VNĐ</div>`;

        const titleCap = _tnvCapitalize(r.reward_title);
        const condCap = _tnvCapitalize(r.reward_condition || '');

        const status = r.award_status || 'pending';
        const selectHtml = `
            <select class="tnv-status-select ${status}" onchange="tnvUpdateAwardStatus(${r.id}, this.value, this, '${status}')" title="Nhấp để thay đổi trạng thái giải thưởng">
                <option value="pending" ${status === 'pending' ? 'selected' : ''}>⏳ Chưa Đánh Giá</option>
                <option value="not_achieved" ${status === 'not_achieved' ? 'selected' : ''}>❌ Không Đạt</option>
                <option value="achieved" ${status === 'achieved' ? 'selected' : ''}>🎖️ Đạt Giải (Chờ Trao)</option>
                <option value="handed_over" ${status === 'handed_over' ? 'selected' : ''}>🏆 Đã Trao Giải</option>
            </select>
        `;

        const titleLower = (r.reward_title || '').toLowerCase();
        const isDeptReward = r.target_type === 'department';
        const isTeamReward = r.isGroup || r.target_type === 'team' || isDeptReward || titleLower.includes('giải nhất') || titleLower.includes('giải nhát') || titleLower.includes('pk') || titleLower.includes('thủ lĩnh') || titleLower.includes('team') || titleLower === '23423';
        let deptCellContent = `<span style="font-weight:600;color:#334155;">${r.department_name || '-'}</span>`;
        let userCellContent = `<span style="font-weight:700;color:#1e293b;white-space:nowrap;">👤 ${r.user_name || '-'}</span>`;
        const isUserFiltered = (_tnvSelectedUser !== 'all' && _tnvSelectedUser !== 'dept_all' && _tnvSelectedUser !== 'team_all') || (keyword && r.user_name && r.user_name.toLowerCase().includes(keyword));

        if (isTeamReward) {
            deptCellContent = `<span style="font-weight:700;color:#0f172a;">${r.department_name || '-'}</span>`;
            if (isUserFiltered && r.user_name) {
                const badgeTag = isDeptReward 
                    ? `<span style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;font-weight:700;padding:2px 7px;border-radius:10px;font-size:10px;margin-left:6px;display:inline-block;">🏢 Thưởng Phòng</span>`
                    : `<span style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;font-weight:700;padding:2px 7px;border-radius:10px;font-size:10px;margin-left:6px;display:inline-block;">👥 Thưởng Team</span>`;
                userCellContent = `<span style="font-weight:700;color:#1e293b;white-space:nowrap;">👤 ${r.user_name}</span> ${badgeTag}`;
            } else {
                const mCount = r.memberCount || 1;
                const namesStr = r.memberNames ? r.memberNames.join(', ') : (r.user_name || '');
                const badgeIcon = isDeptReward ? '🏢' : '👥';
                const badgeText = isDeptReward ? 'Tất cả phòng' : 'Tất cả team';
                const badgeLabel = `${badgeIcon} ${badgeText}`;
                userCellContent = `<span title="Danh sách nhân viên nhận giải (${mCount} NV): ${namesStr}" style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;font-weight:700;padding:3px 10px;border-radius:12px;font-size:12px;display:inline-block;cursor:help;">${badgeLabel}</span>`;
            }
        }

        const batchParam = isTeamReward ? 'true' : 'false';
        const deleteIds = r.ids ? r.ids.join(',') : r.id;

        return `
            <tr>
                <td style="text-align:center;font-weight:700;color:#64748b;">${idx + 1}</td>
                <td style="white-space:nowrap;"><span style="font-weight:700;color:#0f172a;">${_tnvFmtMonthYear(r.month_year)}</span></td>
                <td style="white-space:nowrap;">${deptCellContent}</td>
                <td style="white-space:nowrap;">${userCellContent}</td>
                <td><span style="font-weight:800;color:#e65100;">🏆 ${titleCap}</span></td>
                <td style="max-width:280px;white-space:pre-wrap;color:#475569;font-size:12px;">${condCap || '<i>Chưa có nội dung mô tả</i>'}</td>
                <td style="white-space:nowrap;">${valBadge}</td>
                <td style="text-align:center;vertical-align:middle;padding:8px 6px;">
                    ${selectHtml}
                </td>
                <td style="text-align:center;">
                    <button class="btn btn-sm btn-outline-primary" onclick="tnvEditReward(${r.id})" style="padding:4px 8px;font-size:11px;" title="Sửa">✏️</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="tnvDeleteReward(${r.id}, ${batchParam}, '${deleteIds}')" style="padding:4px 8px;font-size:11px;" title="Xóa">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function tnvOnFilterChange() {
    tnvLoadData();
}

function tnvToggleRewardType() {
    const isMoney = document.querySelector('input[name="mType"]:checked')?.value === 'money';
    const moneyBox = document.getElementById('typeMoneyBox');
    const giftBox = document.getElementById('typeGiftBox');

    if (moneyBox) moneyBox.style.display = isMoney ? 'block' : 'none';
    if (giftBox) giftBox.style.display = isMoney ? 'none' : 'block';
}

async function tnvCheckSetupEligibility(targetMonthStr) {
    if (!targetMonthStr) return { eligible: true };
    try {
        const res = await apiCall(`/api/thuong-nhan-vien/check-eligible?target_month_year=${targetMonthStr}`);
        if (res && res.eligible === false) {
            if (res.isPastMaxMonth || res.isPastMonth) {
                alert(res.error || '⚠️ Không được chọn hoặc tạo thưởng cho các tháng trong quá khứ.');
                return { eligible: false, maxMonthStr: res.maxMonthStr };
            }
            const list = res.pendingRewards || res.incomplete_awards || [];
            tnvShowGatekeeperModal(targetMonthStr, list);
            return { eligible: false, incomplete_awards: list };
        }
        return { eligible: true };
    } catch (e) {
        console.error('Error checking setup eligibility:', e);
        return { eligible: true };
    }
}

function tnvShowGatekeeperModal(targetMonthStr, incompleteAwards) {
    const modal = document.getElementById('tnvGatekeeperModal');
    const container = document.getElementById('tnvIncompleteList');
    if (!modal || !container) return;

    let html = '';
    if (!incompleteAwards || incompleteAwards.length === 0) {
        html = '<div style="padding:10px;color:#64748b;">Tất cả các giải thưởng tháng trước đều đã hoàn tất.</div>';
    } else {
        const groupedIncomplete = tnvGroupRewards(incompleteAwards);
        const groups = {};
        groupedIncomplete.forEach(item => {
            const m = item.month_year || 'Tháng trước';
            if (!groups[m]) groups[m] = [];
            groups[m].push(item);
        });

        for (const [m, items] of Object.entries(groups)) {
            html += `<div style="font-weight:700;color:#e65100;margin-top:8px;margin-bottom:6px;font-size:13px;border-bottom:1px solid #fed7aa;padding-bottom:4px;">📅 Tháng ${m} (${items.length} giải chưa xong):</div>`;
            items.forEach(it => {
                let stLabel = '⏳ Chưa Đánh Giá';
                if (it.award_status === 'achieved') stLabel = '🎖️ Đạt Giải (Chờ Trao)';
                
                let targetBadgeHtml = `<strong>👤 ${it.user_name || 'NV'}</strong>`;
                if (it.target_type === 'department' || (it.reward_title || '').toLowerCase().includes('phòng')) {
                    targetBadgeHtml = `<span style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;font-weight:700;padding:2px 8px;border-radius:10px;font-size:11px;">🏢 Tất cả phòng</span>`;
                } else if (it.target_type === 'team' || it.isGroup) {
                    targetBadgeHtml = `<span style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;font-weight:700;padding:2px 8px;border-radius:10px;font-size:11px;">👥 Tất cả team</span>`;
                }

                html += `
                    <div style="background:white;border:1px solid #cbd5e1;border-radius:8px;padding:8px 12px;margin-bottom:6px;font-size:12px;display:flex;align-items:center;justify-content:space-between;">
                        <div>
                            ${targetBadgeHtml} - <span style="color:#0f172a;font-weight:700;">🏆 ${_tnvCapitalize(it.reward_title)}</span>
                            <div style="font-size:11px;color:#64748b;">${it.department_name || ''}</div>
                        </div>
                        <span style="font-weight:700;color:#c2410c;background:#fff7ed;padding:3px 8px;border-radius:6px;border:1px solid #ffedd5;">${stLabel}</span>
                    </div>
                `;
            });
        }
    }

    container.innerHTML = html;
    modal.style.display = 'flex';
}

function tnvCloseGatekeeperModal() {
    const modal = document.getElementById('tnvGatekeeperModal');
    if (modal) modal.style.display = 'none';
}

async function tnvUpdateAwardStatus(id, newStatus, selectElem = null, oldStatus = 'pending') {
    if (newStatus === oldStatus) return;

    let msg = '';
    if (newStatus === 'not_achieved') msg = 'Anh có chắc chắn muốn báo KHÔNG ĐẠT cho giải thưởng này?';
    else if (newStatus === 'achieved') msg = 'Xác nhận ĐẠT GIẢI THƯỞNG?\n\n(Lưu ý: Sau khi đạt giải, anh có thể chọn Đã Trao Giải ở bước tiếp theo)';
    else if (newStatus === 'handed_over') msg = 'Xác nhận ĐÃ TRAO GIẢI THƯỞNG cho nhân viên?';
    else if (newStatus === 'pending') msg = 'Đặt lại trạng thái giải thưởng về Chưa Đánh Giá?';

    if (msg && !confirm(msg)) {
        if (selectElem) selectElem.value = oldStatus;
        return;
    }

    try {
        const res = await apiCall(`/api/thuong-nhan-vien/${id}/award-status`, 'PATCH', { award_status: newStatus });
        if (res && res.success) {
            await tnvLoadData();
        } else {
            if (selectElem) selectElem.value = oldStatus;
            alert('❌ Lỗi cập nhật trạng thái: ' + (res.error || 'Thất bại'));
        }
    } catch (e) {
        if (selectElem) selectElem.value = oldStatus;
        alert('❌ Lỗi kết nối: ' + e.message);
    }
}

function tnvInitSetupMonthYearSelects(targetMonthStr = null) {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const curMonthStr = `${curYear}-${String(curMonth).padStart(2, '0')}`;

    const monthSelect = document.getElementById('mSetupMonth');
    const yearSelect = document.getElementById('mSetupYear');
    const hiddenMonthYear = document.getElementById('mMonthYear');

    if (!monthSelect || !yearSelect) return;

    let [selY, selM] = (targetMonthStr || curMonthStr).split('-');
    selY = parseInt(selY, 10);
    selM = parseInt(selM, 10);

    const selMStr = String(selM).padStart(2, '0');

    let mHtml = '';
    for (let m = 1; m <= 12; m++) {
        const mStr = String(m).padStart(2, '0');
        const isSel = (mStr === selMStr) ? 'selected' : '';
        mHtml += `<option value="${mStr}" ${isSel}>Tháng ${mStr}</option>`;
    }
    monthSelect.innerHTML = mHtml;
    monthSelect.value = selMStr;

    let yHtml = '';
    const startY = Math.min(curYear, selY);
    for (let y = startY; y <= curYear + 10; y++) {
        const isSel = (y === selY) ? 'selected' : '';
        yHtml += `<option value="${y}" ${isSel}>Năm ${y}</option>`;
    }
    yearSelect.innerHTML = yHtml;
    yearSelect.value = String(selY);

    if (hiddenMonthYear) {
        hiddenMonthYear.value = `${selY}-${selMStr}`;
    }
}

async function tnvOnSetupMonthYearChange() {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const curMonthStr = `${curYear}-${String(curMonth).padStart(2, '0')}`;

    const mVal = document.getElementById('mSetupMonth')?.value || '01';
    const yVal = document.getElementById('mSetupYear')?.value || String(curYear);
    let selectedMonth = `${yVal}-${mVal}`;

    const hiddenInput = document.getElementById('mMonthYear');

    if (selectedMonth < curMonthStr) {
        alert(`⚠️ Không thể chọn hoặc tạo thưởng cho các tháng trong quá khứ (${selectedMonth})!\n\nVui lòng chọn Tháng Hiện Tại (${curMonthStr}) hoặc Tháng Tương Lai.`);
        const [cy, cm] = curMonthStr.split('-');
        if (document.getElementById('mSetupMonth')) document.getElementById('mSetupMonth').value = cm;
        if (document.getElementById('mSetupYear')) document.getElementById('mSetupYear').value = cy;
        selectedMonth = curMonthStr;
    }

    const check = await tnvCheckSetupEligibility(selectedMonth);
    if (!check.eligible) {
        const revertTarget = check.maxMonthStr || curMonthStr;
        const [cy, cm] = revertTarget.split('-');
        if (document.getElementById('mSetupMonth')) document.getElementById('mSetupMonth').value = cm;
        if (document.getElementById('mSetupYear')) document.getElementById('mSetupYear').value = cy;
        selectedMonth = revertTarget;
    }

    if (hiddenInput) {
        hiddenInput.value = selectedMonth;
    }

    await tnvToggleTargetType();

    const curUserId = Number(document.getElementById('mUserId')?.value);
    if (curUserId && _tnvModalAssignedUserIds.has(curUserId)) {
        tnvClearModalUser();
    }
}

async function tnvOpenModal(editItem = null) {
    _tnvEditId = editItem ? editItem.id : null;

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonthStr = `${curYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const modal = document.getElementById('tnvModal');
    const headTitle = document.getElementById('modalHeadTitle');
    const form = document.getElementById('tnvForm');

    if (!modal) return;

    let targetMonth = curMonthStr;
    if (editItem) {
        targetMonth = editItem.month_year;
    } else {
        const filterY = document.getElementById('tnvYearSelect')?.value;
        const filterM = document.getElementById('tnvMonthSelect')?.value;
        const selY = (filterY && filterY !== 'all') ? filterY : String(curYear);
        const selM = (filterM && filterM !== 'all') ? filterM : String(now.getMonth() + 1).padStart(2, '0');
        targetMonth = `${selY}-${selM}`;
    }

    if (!editItem) {
        if (targetMonth < curMonthStr) {
            alert(`⚠️ Không thể tạo thưởng cho các tháng trong quá khứ (${targetMonth})!\n\nVui lòng chọn Tháng Hiện Tại (${curMonthStr}) hoặc Tháng Tương Lai.`);
            return;
        }

        const check = await tnvCheckSetupEligibility(targetMonth);
        if (!check.eligible) {
            return;
        }
    }

    tnvInitSetupMonthYearSelects(targetMonth);
    await tnvFetchMonthAssignedUserIds(targetMonth);

    if (headTitle) {
        headTitle.innerText = _tnvEditId ? '✏️ Chỉnh Sửa Thưởng Nhân Viên' : '🎁 Setup Thưởng Nhân Viên Mới';
    }

    document.getElementById('mDeptId').value = editItem ? editItem.department_id : '';

    if (editItem) {
        const userObj = _tnvStaff.find(u => u.id === editItem.user_id);
        const uLabel = userObj ? tnvGetRoleLabel(userObj.role) : '';
        tnvSelectUser('modal', editItem.user_id, editItem.user_name || '', uLabel);

        document.getElementById('mRewardTitle').value = _tnvCapitalize(editItem.reward_title);
        document.getElementById('mRewardCondition').value = _tnvCapitalize(editItem.reward_condition || '');
        
        const typeRadio = document.querySelector(`input[name="mType"][value="${editItem.reward_type === 'gift' ? 'gift' : 'money'}"]`);
        if (typeRadio) typeRadio.checked = true;

        document.getElementById('mAmount').value = editItem.reward_amount || '';
        document.getElementById('mGiftDesc').value = _tnvCapitalize(editItem.reward_gift_description || '');
    } else {
        if (form) form.reset();
        tnvClearModalUser();
        tnvInitSetupMonthYearSelects(targetMonth);
        const defaultRadio = document.querySelector('input[name="mType"][value="money"]');
        if (defaultRadio) defaultRadio.checked = true;
    }

    modal.style.display = 'flex';

    tnvCheckModalDeptSelected();
    tnvToggleRewardType();

    if (editItem) {
        const editTargetType = editItem.target_type || 'single';
        const targetTypeRadio = document.querySelector(`input[name="mTargetType"][value="${editTargetType}"]`);
        if (targetTypeRadio) targetTypeRadio.checked = true;
    } else {
        const targetTypeRadio = document.querySelector('input[name="mTargetType"][value="single"]');
        if (targetTypeRadio) targetTypeRadio.checked = true;
    }
    await tnvToggleTargetType();

    // Re-apply department_id AFTER tnvToggleTargetType() has rebuilt the <select> options
    if (editItem && editItem.department_id) {
        const deptSelect = document.getElementById('mDeptId');
        if (deptSelect) {
            deptSelect.value = editItem.department_id;
            // Trigger preview update for team/department rewards
            tnvUpdateTeamMemberPreview();
        }
    }

    tnvValidateModalState();
}

function tnvCloseModal() {
    const modal = document.getElementById('tnvModal');
    if (modal) modal.style.display = 'none';
    _tnvEditId = null;
}

function tnvEditReward(id) {
    const item = _tnvAllRewards.find(r => r.id === id);
    if (item) tnvOpenModal(item);
}

async function tnvDeleteReward(id, isBatch = false, ids = '') {
    const msg = isBatch 
        ? 'Anh có chắc chắn muốn xóa giải thưởng này cho TẤT CẢ nhân viên trong Team / Phòng Ban không?' 
        : 'Anh có chắc chắn muốn xóa khoản thưởng này không?';
    if (!confirm(msg)) return;

    try {
        let url = `/api/thuong-nhan-vien/${id}`;
        if (ids && String(ids).includes(',')) {
            url += `?ids=${ids}`;
        } else if (isBatch) {
            url += `?batch=true`;
        }

        const res = await apiCall(url, 'DELETE');
        if (res && res.success) {
            alert('✅ Đã xóa giải thưởng thành công!');
            tnvLoadData();
        } else {
            alert('❌ Lỗi: ' + (res.error || 'Không thể xóa'));
        }
    } catch (e) {
        alert('❌ Lỗi kết nối: ' + e.message);
    }
}

async function tnvSaveReward(event) {
    event.preventDefault();

    if (!tnvValidateModalState()) return;

    const month_year = document.getElementById('mMonthYear').value;
    const department_id = document.getElementById('mDeptId').value;
    const target_type = document.querySelector('input[name="mTargetType"]:checked')?.value || 'single';
    const reward_title = _tnvCapitalize(document.getElementById('mRewardTitle').value);
    const reward_condition = _tnvCapitalize(document.getElementById('mRewardCondition').value);
    const reward_type = document.querySelector('input[name="mType"]:checked')?.value || 'money';
    const reward_amount = document.getElementById('mAmount').value;
    const reward_gift_description = _tnvCapitalize(document.getElementById('mGiftDesc').value);

    if (!month_year || !department_id || !reward_title) {
        alert('Vui lòng điền các thông tin bắt buộc (*)');
        return;
    }

    if (target_type === 'team' || target_type === 'department') {
        const payload = {
            month_year,
            department_id: Number(department_id),
            reward_title,
            reward_condition,
            reward_type,
            reward_amount: reward_type === 'money' ? Number(reward_amount) : 0,
            reward_gift_description: reward_type === 'gift' ? reward_gift_description : '',
            target_type: target_type
        };

        try {
            const res = await apiCall('/api/thuong-nhan-vien/batch', 'POST', payload);
            if (res && res.success) {
                const targetLabel = target_type === 'department' ? 'Phòng Ban' : 'Team';
                alert(res.message || `🎉 Đã tạo thưởng thành công cho ${res.count} nhân viên thuộc ${targetLabel}!`);
                tnvCloseModal();

                if (month_year) {
                    const parts = month_year.split('-');
                    if (parts.length === 2) {
                        const yrSelect = document.getElementById('tnvYearSelect');
                        const mSelect = document.getElementById('tnvMonthSelect');
                        if (yrSelect) yrSelect.value = parts[0];
                        if (mSelect) mSelect.value = parts[1];
                    }
                }
                const searchInp = document.getElementById('tnvSearchInput');
                if (searchInp) searchInp.value = '';

                await tnvLoadData();
            } else {
                if (res && res.eligible === false && res.incomplete_awards) {
                    tnvCloseModal();
                    tnvShowGatekeeperModal(month_year, res.incomplete_awards);
                } else {
                    const targetLabel = target_type === 'department' ? 'phòng ban' : 'team';
                    alert('❌ Lỗi: ' + (res.error || `Tạo thưởng cả ${targetLabel} thất bại`));
                }
            }
        } catch (e) {
            alert('❌ Lỗi kết nối: ' + e.message);
        }
        return;
    }

    const user_id = document.getElementById('mUserId').value;
    if (!user_id) {
        alert('Vui lòng chọn Tên Nhân Viên!');
        return;
    }

    const payload = {
        month_year,
        department_id: Number(department_id),
        user_id: Number(user_id),
        reward_title,
        reward_condition,
        reward_type,
        reward_amount: reward_type === 'money' ? Number(reward_amount) : 0,
        reward_gift_description: reward_type === 'gift' ? reward_gift_description : '',
        target_type: 'single'
    };

    try {
        let res;
        if (_tnvEditId) {
            res = await apiCall(`/api/thuong-nhan-vien/${_tnvEditId}`, 'PUT', payload);
        } else {
            res = await apiCall('/api/thuong-nhan-vien', 'POST', payload);
        }

        if (res && res.success) {
            alert('✅ Lưu thưởng nhân viên thành công!');
            tnvCloseModal();

            // Auto-align filter bar to the saved year & month so item displays immediately
            if (month_year) {
                const parts = month_year.split('-');
                if (parts.length === 2) {
                    const yrSelect = document.getElementById('tnvYearSelect');
                    const mSelect = document.getElementById('tnvMonthSelect');
                    if (yrSelect) yrSelect.value = parts[0];
                    if (mSelect) mSelect.value = parts[1];
                }
            }
            // Clear text search input to make sure table filter doesn't hide it
            const searchInp = document.getElementById('tnvSearchInput');
            if (searchInp) searchInp.value = '';

            await tnvLoadData();
        } else {
            if (res && res.eligible === false && res.incomplete_awards) {
                tnvCloseModal();
                tnvShowGatekeeperModal(month_year, res.incomplete_awards);
            } else {
                alert('❌ Lỗi: ' + (res.error || 'Lưu thất bại'));
            }
        }
    } catch (e) {
        alert('❌ Lỗi kết nối: ' + e.message);
    }
}
