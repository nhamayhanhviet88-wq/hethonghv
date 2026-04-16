// ========== GLOBAL STATE ==========
let currentUser = null;
let currentPage = 'dashboard';
let userPermissions = {};
let _configCache = {}; // Cache for app-config values

// ========== ROLE CONFIG ==========
const ROLE_LABELS = {
    giam_doc: 'Giám Đốc',
    quan_ly_cap_cao: 'Quản Lý Cấp Cao',
    quan_ly: 'Quản Lý',
    truong_phong: 'Trưởng Phòng',
    nhan_vien: 'Nhân Viên',
    part_time: 'Part Time',
    tkaffiliate: 'TK Affiliate'
};

const STATUS_LABELS = {
    dang_tu_van: { text: 'Đang Tư Vấn', class: 'status-consulting' },
    bao_gia: { text: 'Báo Giá', class: 'status-quoted' },
    dat_coc: { text: 'Đã Đặt Cọc', class: 'status-deposit' },
    chot_don: { text: 'Chốt Đơn', class: 'status-closed' },
    san_xuat: { text: 'Sản Xuất', class: 'status-production' },
    giao_hang: { text: 'Giao Hàng', class: 'status-shipping' },
    hoan_thanh: { text: 'Hoàn Thành', class: 'status-done' }
};

const CRM_LABELS = {
    nhu_cau: 'Chăm Sóc KH Nhu Cầu',
    ctv_hoa_hong: 'Chăm Sóc CTV / Hoa Hồng',
    ctv: 'Chăm Sóc CTV',
    hoa_hong_crm: 'CRM Tự Tìm Kiếm',
    nuoi_duong: 'CRM Gọi Điện Hợp Tác',
    sinh_vien: 'CRM Gọi Điện Bán Hàng',
    koc_tiktok: 'CRM KOL/KOC Tiktok'
};

const MENU_CONFIG = [
    { id: 'dashboard', label: 'Các Chỉ Số Tổng Quan', icon: '📊', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','part_time'], section: 'TỔNG QUAN' },
    { id: 'goidien', label: 'Gọi Điện Telesale', icon: '📞', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','part_time'], section: 'KINH DOANH TELESALE', href: '/goidien' },
    { id: 'hethonggoidien', label: 'Hệ Thống Phân Chia Gọi Điện', icon: '📡', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','part_time'], section: 'KINH DOANH TELESALE', href: '/hethonggoidien' },
    { id: 'crm-nhu-cau', label: 'Chăm Sóc KH Nhu Cầu', icon: '📋', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','part_time'], section: 'KINH DOANH CHĂM SÓC' },
    { id: 'crm-ctv', label: 'Chăm Sóc CTV', icon: '🤝', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','part_time'], section: 'KINH DOANH CHĂM SÓC' },
    { id: 'cham-soc-affiliate', label: 'Chăm Sóc Affiliate', icon: '💝', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','part_time'], section: 'KINH DOANH CHĂM SÓC', href: '/chamsocaffiliate' },
    { id: 'crm-tu-tim-kiem', label: 'CRM Tự Tìm Kiếm', icon: '🌹', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','part_time'], section: 'KINH DOANH CRM NUÔI DƯỠNG' },
    { id: 'crm-goi-hop-tac', label: 'CRM Gọi Điện Hợp Tác', icon: '🌱', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','part_time'], section: 'KINH DOANH CRM NUÔI DƯỠNG' },
    { id: 'crm-goi-ban-hang', label: 'CRM Gọi Điện Bán Hàng', icon: '👟', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','part_time'], section: 'KINH DOANH CRM NUÔI DƯỠNG' },
    { id: 'crm-koc-tiktok', label: 'CRM KOL/KOC Tiktok', icon: '🎵', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','part_time'], section: 'KINH DOANH CRM NUÔI DƯỠNG', href: '/koctiktok' },
    { id: 'affiliate-hv', label: 'CRM Affiliate Giới Thiệu', icon: '🤝', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','part_time'], section: 'KINH DOANH CRM NUÔI DƯỠNG', href: '/affiliate' },
    { id: 'tai-khoan-affiliate', label: 'Tài Khoản Affiliate', icon: '🔑', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'QUẢN LÝ AFFILIATE' },
    { id: 'quan-ly-affiliate', label: 'Chỉ Số Affiliate HV', icon: '🤝', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'QUẢN LÝ AFFILIATE' },
    { id: 'bang-xep-hang-affiliate', label: 'Bảng Xếp Hạng Affiliate', icon: '🏆', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'BXH & GIẢI THƯỞNG', href: '/bangxephangaffiliate', dynamicRoles: 'leaderboard_allowed_roles' },
    { id: 'bang-xep-hang-kinh-doanh', label: 'Bảng Xếp Hạng Kinh Doanh', icon: '📊', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'BXH & GIẢI THƯỞNG', href: '/bangxephangkinhdoanh', dynamicRoles: 'bxh_kinhdoanh_allowed_roles' },
    { id: 'bang-xep-hang-sale', label: 'Bảng Xếp Hạng Sale', icon: '💼', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'BXH & GIẢI THƯỞNG', href: '/bangxephangsale', dynamicRoles: 'bxh_sale_allowed_roles' },
    { id: 'bang-xep-hang-ctv', label: 'Bảng Xếp Hạng CTV', icon: '🤝', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'BXH & GIẢI THƯỞNG', href: '/bangxephangctv', dynamicRoles: 'bxh_ctv_allowed_roles' },
    { id: 'bxh-san-xuat', label: 'BXH Khối Sản Xuất', icon: '🏭', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'BXH & GIẢI THƯỞNG', href: '/bxhsanxuat', dynamicRoles: 'bxh_sanxuat_allowed_roles' },
    { id: 'bxh-van-phong', label: 'BXH Khối Văn Phòng', icon: '🏢', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'BXH & GIẢI THƯỞNG', href: '/bxhvanphong', dynamicRoles: 'bxh_vanphong_allowed_roles' },
    { id: 'giai-thuong-game', label: 'Setup Giải Thưởng Game', icon: '🎮', roles: ['giam_doc'], section: 'BXH & GIẢI THƯỞNG', href: '/giaithuonggame' },
    { id: 'trao-giai-thuong', label: 'Trao Giải Thưởng', icon: '🏆', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'BXH & GIẢI THƯỞNG', href: '/traogiaithuong' },
    { id: 'withdraw-manage', label: 'Duyệt Rút Tiền', icon: '🏦', roles: ['giam_doc','quan_ly_cap_cao'], section: 'QUẢN LÝ AFFILIATE' },
    { id: 'cap-cuu-sep', label: 'Cấp Cứu Sếp', icon: '🚨', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','part_time'], section: 'HỖ TRỢ NHÂN VIÊN HV' },
    { id: 'huy-khach', label: 'Hủy Khách Hàng', icon: '❌', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'HỖ TRỢ NHÂN VIÊN HV' },
    { id: 'chuyen-so', label: 'Hệ Thống Chuyển Số', icon: '📱', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','part_time','hoa_hong','tkaffiliate'], section: 'HỖ TRỢ NHÂN VIÊN HV' },
    { id: 'accounts', label: 'Tài Khoản Nhân Viên', icon: '👥', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'QUẢN LÝ NHÂN VIÊN HV' },
    // { id: 'quan-ly-tk-affiliate', label: 'Quản Lý TK Affiliate', icon: '🔑', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'QUẢN LÝ NHÂN VIÊN HV', href: '/quanlyaffiliate' },
    { id: 'teams', label: 'Cơ Cấu Tổ Chức', icon: '🏢', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'QUẢN LÝ NHÂN VIÊN HV' },
    { id: 'permissions', label: 'Phân Quyền', icon: '🔐', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'QUẢN LÝ NHÂN VIÊN HV' },
    { id: 'khoa-tk-nv', label: 'Nhân Viên Bị Phạt Tiền', icon: '💰', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','part_time'], section: 'QUẢN LÝ NHÂN VIÊN HV', href: '/khoatknv' },
    { id: 'xin-nghi-nv', label: 'Xin Nghỉ NV', icon: '📋', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','part_time'], section: 'QUẢN LÝ NHÂN VIÊN HV', href: '/xinnghinhanvien' },
    { id: 'setup-ngay-le', label: 'Setup Ngày Lễ', icon: '📅', roles: ['giam_doc','quan_ly_cap_cao'], section: 'QUẢN LÝ NHÂN VIÊN HV', href: '/setupngayle' },
    { id: 'settings', label: 'Cài Đặt Phân Tầng', icon: '⚙️', roles: ['giam_doc'], section: 'HỆ THỐNG' },
    { id: 'my-customers', label: 'Khách Hàng Của Tôi', icon: '👤', roles: ['hoa_hong'], section: 'HOA HỒNG' },
    { id: 'withdraw', label: 'Rút Tiền', icon: '💰', roles: ['hoa_hong'], section: 'HOA HỒNG' },
    { id: 'bao-cao-hoa-hong', label: 'Báo Cáo Hoa Hồng', icon: '💰', roles: ['tkaffiliate'], section: 'AFFILIATE' },
    { id: 'rut-tien-affiliate', label: 'Rút Tiền', icon: '🏦', roles: ['tkaffiliate'], section: 'AFFILIATE' },
    // ========== QUẢN LÝ CÔNG VIỆC ==========
    { id: 'lich-khoa-bieu', label: 'Lịch Khóa Biểu Công Việc', icon: '📅', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','part_time'], section: 'CÔNG VIỆC HẰNG NGÀY', href: '/lichkhoabieu' },
    { id: 'congvieckhoaxuly', label: 'CV Phạt Phải Xử Lý', icon: '⚠️', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','part_time'], section: 'CÔNG VIỆC HẰNG NGÀY', href: '/congvieckhoaxuly' },
    { id: 'lich-su-bao-cao', label: 'Lịch Sử Báo Cáo CV', icon: '📊', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','part_time'], section: 'CÔNG VIỆC HẰNG NGÀY', href: '/lichsubaocaocv' },
    { id: 'bangiao-diem-kd', label: 'Bàn Giao CV Điểm', icon: '🏪', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','part_time'], section: 'CÔNG VIỆC HẰNG NGÀY', href: '/bangiaodiem' },
    { id: 'bangiao-khoa', label: 'Bàn Giao CV Khóa - Chuỗi', icon: '🔐', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','part_time'], section: 'CÔNG VIỆC HẰNG NGÀY', href: '/bangiaokhoa' },
    { id: 'don-khach-sll', label: 'Đơn Khách SLL', icon: '📦', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','part_time'], section: 'CÔNG VIỆC CHĂM SÓC KHÁCH', href: '/donkhachsll' },
    { id: 'don-khach-nhieu-lan', label: 'Đơn Khách Nhiều Lần', icon: '🔄', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','part_time'], section: 'CÔNG VIỆC CHĂM SÓC KHÁCH', href: '/donkhachnhieulan' },
    { id: 'don-khach-moi', label: 'Đơn Khách Mới', icon: '🆕', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','part_time'], section: 'CÔNG VIỆC CHĂM SÓC KHÁCH', href: '/donkhachmoi' },
    { id: 'don-quan-he', label: 'Đơn Quan Hệ', icon: '🤝', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','part_time'], section: 'CÔNG VIỆC CHĂM SÓC KHÁCH', href: '/donquanhe' },
];

// Map menu IDs to permission feature keys
const MENU_PERM_MAP = {
    'dashboard': 'tong_quan',
    'crm-nhu-cau': 'crm_nhu_cau',
    'crm-ctv': 'crm_ctv',
    'crm-tu-tim-kiem': 'crm_tu_tim_kiem',
    'crm-goi-hop-tac': 'crm_goi_hop_tac',
    'crm-goi-ban-hang': 'crm_goi_ban_hang',
    'affiliate-hv': 'affiliate_hv',
    'huy-khach': 'huy_khach',
    'accounts': 'nhan_vien',
    'teams': 'co_cau_to_chuc',
    'permissions': 'phan_quyen',
    'cap-cuu-sep': 'cap_cuu_sep',
    'chuyen-so': 'chuyen_so',
    'settings': 'cai_dat',
    'trao-giai-thuong': 'trao_giai_thuong',
    'lich-su-bao-cao': 'lich_su_bao_cao',
};

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    setupEventListeners();
    handleRoute();

    // Start prize celebration popup polling (skip for affiliate accounts)
    const AFFILIATE_POPUP_BLOCK = ['tkaffiliate', 'hoa_hong', 'ctv', 'nuoi_duong', 'sinh_vien'];
    if (currentUser && !AFFILIATE_POPUP_BLOCK.includes(currentUser.role)) {
        setTimeout(function() {
            if (typeof initPrizePopupSystem === 'function') initPrizePopupSystem();
        }, 2000);
    }

    // Restore scroll position after F5
    const savedScroll = sessionStorage.getItem('scrollPos');
    if (savedScroll) {
        setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 100);
        sessionStorage.removeItem('scrollPos');
    }

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
        handleRoute();
    });

    // Save scroll position before unload (F5 / close)
    window.addEventListener('beforeunload', () => {
        sessionStorage.setItem('scrollPos', window.scrollY.toString());
    });

    // Start emergency popup checker for QL/TP
    if (currentUser && ['quan_ly', 'truong_phong'].includes(currentUser.role)) {
        emPopupCheck();
        setInterval(emPopupCheck, 60000);
    }

    // Check if user has unacknowledged penalties → show lock popup (once per day, server-tracked)
    if (currentUser && ['quan_ly_cap_cao', 'quan_ly', 'truong_phong', 'nhan_vien', 'part_time'].includes(currentUser.role)) {
        setTimeout(async () => {
            try {
                const data = await apiCall('/api/penalty/my-pending');
                if (data.pending && data.pending.length > 0) {
                    _showPenaltyLockPopup(data.pending, data.total, data.penaltyDate);
                }
            } catch(e) {}
        }, 1500);
    }

    // Manager penalty popup — show team penalties (once per day, server-tracked)
    if (currentUser && ['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(currentUser.role)) {
        setTimeout(async () => {
            try {
                const data = await apiCall('/api/penalty/team-today');
                if (data.penalties && data.penalties.length > 0) {
                    _showMgrPenaltyPopup(data.penalties, data.total, data.departments, data.penaltyDate);
                }
            } catch(e) {}
        }, 3000);
    }

    // Cancel popup checker for NV (9:30, 15:00)
    if (currentUser && ['nhan_vien', 'truong_phong'].includes(currentUser.role)) {
        cancelNVPopupCheck();
        setInterval(cancelNVPopupCheck, 60000);
    }

    // Cancel popup checker for QL/GĐ (17:00)
    if (currentUser && ['quan_ly', 'giam_doc'].includes(currentUser.role)) {
        cancelManagerPopupCheck();
        setInterval(cancelManagerPopupCheck, 60000);
    }

    // Withdrawal request polling for GĐ/Trinh
    if (currentUser && ['giam_doc', 'quan_ly_cap_cao'].includes(currentUser.role)) {
        window._wdLastPendingCount = -1;
        wdPollPending();
        setInterval(wdPollPending, 15000);
    }
});

// ========== WITHDRAWAL PENDING POLLING (GĐ/TRINH) ==========
async function wdPollPending() {
    try {
        const data = await apiCall('/api/withdrawals/pending-alert');
        if (data.count > 0 && window._wdLastPendingCount !== -1 && data.count > window._wdLastPendingCount && data.latest) {
            wdShowNewRequestPopup(data.latest);
        }
        window._wdLastPendingCount = data.count;
    } catch (e) { /* silent */ }
}

function wdShowNewRequestPopup(info) {
    const old = document.getElementById('wdNewReqPopup');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'wdNewReqPopup';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    const amount = Number(info.amount || 0).toLocaleString('vi-VN');

    overlay.innerHTML = `
        <div style="background:white;border-radius:20px;max-width:400px;width:100%;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.4);animation:wdPopIn 0.4s ease;">
            <div style="background:#122546;padding:20px;text-align:center;">
                <div style="width:56px;height:56px;background:#fad24c;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:24px;">🔔</div>
                <div style="color:#fad24c;font-size:16px;font-weight:800;">Yêu Cầu Rút Tiền Mới!</div>
            </div>
            <div style="padding:20px;text-align:center;">
                <div style="font-size:14px;color:#374151;line-height:1.7;margin-bottom:16px;">
                    Tài khoản Affiliate <strong style="color:#122546;">${info.user_name || '-'}</strong><br>
                    yêu cầu rút <strong style="color:#f59e0b;font-size:16px;">${amount} đ</strong><br>
                    về STK: <strong>${info.bank_account || '-'}</strong> (${info.bank_name || '-'})
                </div>
                <button onclick="document.getElementById('wdNewReqPopup').remove(); navigate('withdraw-manage');"
                    style="padding:12px 28px;border:none;background:#fad24c;color:#122546;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;margin-right:8px;font-family:inherit;">
                    🏦 Duyệt ngay
                </button>
                <button onclick="document.getElementById('wdNewReqPopup').remove()"
                    style="padding:12px 20px;border:1px solid #e2e8f0;background:white;color:#6b7280;border-radius:10px;font-size:13px;cursor:pointer;">
                    Để sau
                </button>
            </div>
        </div>
    `;
    const style = document.createElement('style');
    style.textContent = '@keyframes wdPopIn { from { transform: scale(0.8) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }';
    overlay.appendChild(style);
    document.body.appendChild(overlay);
}

// ========== EMERGENCY POPUP ALERT ==========
async function emPopupCheck() {
    try {
        const now = new Date();
        const hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

        // Get configurable popup times (use cache or fetch in parallel)
        const [t1, t2] = await Promise.all([
            apiCall('/api/app-config/emergency_popup_time_1'),
            apiCall('/api/app-config/emergency_popup_time_2')
        ]);
        const time1 = t1?.value || '11:00';
        const time2 = t2?.value || '16:00';

        // Check if current time is within 1 minute of a popup time
        const dateStr = now.toISOString().split('T')[0];
        const shouldShow = (hhmm >= time1 && !sessionStorage.getItem('emPopup_' + dateStr + '_' + time1))
            || (hhmm >= time2 && !sessionStorage.getItem('emPopup_' + dateStr + '_' + time2));

        if (!shouldShow) return;

        // Fetch pending emergencies for this user
        const data = await apiCall('/api/emergencies?status_filter=pending');
        const emergencies = (data.emergencies || []).filter(e => e.status !== 'resolved');
        if (!emergencies || emergencies.length <= 0) {
            // Mark as shown even with 0 so we don't keep checking
            if (hhmm >= time1) sessionStorage.setItem('emPopup_' + dateStr + '_' + time1, '1');
            if (hhmm >= time2) sessionStorage.setItem('emPopup_' + dateStr + '_' + time2, '1');
            return;
        }

        // Mark as shown
        if (hhmm >= time1) sessionStorage.setItem('emPopup_' + dateStr + '_' + time1, '1');
        if (hhmm >= time2) sessionStorage.setItem('emPopup_' + dateStr + '_' + time2, '1');

        // Count overdue
        const overdueCount = emergencies.filter(e => e.created_at && (Date.now() - new Date(e.created_at).getTime()) > 24 * 3600000).length;

        emShowPopup(emergencies.length, overdueCount);
    } catch (e) { /* silent */ }
}

function emShowPopup(total, overdue) {
    if (document.getElementById('emPopupOverlay')) return; // Already showing

    const overdueMsg = overdue > 0
        ? `<div style="margin-top:10px;padding:10px 16px;background:rgba(0,0,0,0.3);border-radius:10px;font-size:14px;">
            ❌ Trong đó <strong>${overdue} khách đã QUÁ HẠN 24h!</strong>
           </div>`
        : '';

    const overlay = document.createElement('div');
    overlay.id = 'emPopupOverlay';
    overlay.innerHTML = `
        <div style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99998;display:flex;align-items:center;justify-content:center;animation:emPopFadeIn 0.3s ease;">
            <div style="background:linear-gradient(135deg,#dc2626,#991b1b);color:white;border-radius:20px;padding:40px 50px;text-align:center;max-width:500px;width:90%;box-shadow:0 20px 60px rgba(220,38,38,0.5);animation:emPopBounce 0.5s ease;">
                <div style="font-size:60px;margin-bottom:12px;animation:emPopShake 0.5s ease infinite;">🚨</div>
                <div style="font-size:24px;font-weight:900;letter-spacing:1px;text-transform:uppercase;text-shadow:0 2px 10px rgba(0,0,0,0.3);">CẢNH BÁO CẤP CỨU</div>
                <div style="margin-top:16px;font-size:40px;font-weight:900;color:#fbbf24;text-shadow:0 2px 10px rgba(0,0,0,0.3);">${total} KHÁCH</div>
                <div style="font-size:16px;font-weight:600;opacity:0.9;margin-top:4px;">cần được xử lý ngay!</div>
                ${overdueMsg}
                <div style="margin-top:24px;display:flex;gap:12px;justify-content:center;">
                    <button onclick="navigate('cap-cuu-sep');document.getElementById('emPopupOverlay').remove();"
                        style="padding:14px 32px;background:#fbbf24;color:#991b1b;border:none;border-radius:12px;font-size:16px;font-weight:900;cursor:pointer;box-shadow:0 4px 20px rgba(251,191,36,0.4);text-transform:uppercase;letter-spacing:1px;">
                        ⚡ Xử Lý Ngay
                    </button>
                    <button onclick="document.getElementById('emPopupOverlay').remove();"
                        style="padding:14px 24px;background:rgba(255,255,255,0.15);color:white;border:1px solid rgba(255,255,255,0.3);border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;">
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    `;

    // Inject popup animations
    if (!document.getElementById('emPopupStyles')) {
        const st = document.createElement('style');
        st.id = 'emPopupStyles';
        st.textContent = `
            @keyframes emPopFadeIn { from { opacity:0 } to { opacity:1 } }
            @keyframes emPopBounce { 0% { transform:scale(0.5);opacity:0 } 60% { transform:scale(1.05) } 100% { transform:scale(1);opacity:1 } }
            @keyframes emPopShake { 0%,100% { transform:rotate(0) } 15% { transform:rotate(-15deg) } 30% { transform:rotate(15deg) } 45% { transform:rotate(-10deg) } 60% { transform:rotate(10deg) } }
        `;
        document.head.appendChild(st);
    }

    document.body.appendChild(overlay);
}

// ========== CANCEL POPUP FOR NV (9:30, 15:00) ==========
async function cancelNVPopupCheck() {
    try {
        const now = new Date();
        const hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        const dateStr = now.toISOString().split('T')[0];

        const [t1, t2] = await Promise.all([
            apiCall('/api/app-config/cancel_nv_popup_time_1'),
            apiCall('/api/app-config/cancel_nv_popup_time_2')
        ]);
        const time1 = t1?.value || '09:30';
        const time2 = t2?.value || '15:00';

        const shouldShow = (hhmm >= time1 && !sessionStorage.getItem('cancelNV_' + dateStr + '_' + time1))
            || (hhmm >= time2 && !sessionStorage.getItem('cancelNV_' + dateStr + '_' + time2));
        if (!shouldShow) return;

        // Trigger auto-revert first
        try { await apiCall('/api/cancel/auto-revert-expired', 'POST'); } catch(e) {}

        const data = await apiCall('/api/cancel/reverted-for-me');
        if (hhmm >= time1) sessionStorage.setItem('cancelNV_' + dateStr + '_' + time1, '1');
        if (hhmm >= time2) sessionStorage.setItem('cancelNV_' + dateStr + '_' + time2, '1');

        if (!data.count || Number(data.count) <= 0) return;
        cancelNVShowPopup(Number(data.count), data.customers || []);
    } catch(e) {}
}

function cancelNVShowPopup(total, customers) {
    if (document.getElementById('cancelNVPopupOverlay')) return;

    const listHTML = customers.slice(0, 5).map(c => 
        `<div style="padding:6px 12px;background:rgba(0,0,0,0.15);border-radius:8px;font-size:13px;margin-bottom:4px;">
            👤 <strong>${c.customer_name}</strong> — ${c.phone}
        </div>`
    ).join('') + (customers.length > 5 ? `<div style="font-size:12px;opacity:0.8;margin-top:4px;">...và ${customers.length - 5} khách khác</div>` : '');

    const overlay = document.createElement('div');
    overlay.id = 'cancelNVPopupOverlay';
    overlay.innerHTML = `
        <div style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99998;display:flex;align-items:center;justify-content:center;animation:emPopFadeIn 0.3s ease;">
            <div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;border-radius:20px;padding:36px 44px;text-align:center;max-width:520px;width:90%;box-shadow:0 20px 60px rgba(245,158,11,0.5);animation:emPopBounce 0.5s ease;">
                <div style="font-size:55px;margin-bottom:10px;animation:emPopShake 0.5s ease infinite;">⚠️</div>
                <div style="font-size:22px;font-weight:900;letter-spacing:1px;text-transform:uppercase;text-shadow:0 2px 10px rgba(0,0,0,0.2);">CHĂM SÓC LẠI KHÁCH</div>
                <div style="margin-top:12px;font-size:38px;font-weight:900;color:#1e293b;text-shadow:0 2px 8px rgba(0,0,0,0.15);">${total} KHÁCH</div>
                <div style="font-size:15px;font-weight:600;opacity:0.95;margin-top:6px;">Quản lý không duyệt hủy — hãy tư vấn lại ngay!</div>
                <div style="margin-top:14px;text-align:left;">${listHTML}</div>
                <div style="margin-top:10px;padding:10px 16px;background:rgba(0,0,0,0.2);border-radius:10px;font-size:13px;font-weight:600;">
                    📋 Khách đã được trả về CRM. Hãy liên hệ chăm sóc ngay hôm nay!
                </div>
                <div style="margin-top:20px;display:flex;gap:12px;justify-content:center;">
                    <button onclick="navigate('crm-nhu-cau');document.getElementById('cancelNVPopupOverlay').remove();"
                        style="padding:12px 28px;background:#1e293b;color:#fbbf24;border:none;border-radius:12px;font-size:15px;font-weight:900;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.3);text-transform:uppercase;letter-spacing:1px;">
                        📋 Xem CRM Ngay
                    </button>
                    <button onclick="document.getElementById('cancelNVPopupOverlay').remove();"
                        style="padding:12px 20px;background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3);border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;">
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    `;
    if (!document.getElementById('emPopupStyles')) {
        const st = document.createElement('style'); st.id = 'emPopupStyles';
        st.textContent = '@keyframes emPopFadeIn{from{opacity:0}to{opacity:1}}@keyframes emPopBounce{0%{transform:scale(.5);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}@keyframes emPopShake{0%,100%{transform:rotate(0)}15%{transform:rotate(-15deg)}30%{transform:rotate(15deg)}45%{transform:rotate(-10deg)}60%{transform:rotate(10deg)}}';
        document.head.appendChild(st);
    }
    document.body.appendChild(overlay);
}

// ========== CANCEL POPUP FOR QL/GĐ (17:00) ==========
async function cancelManagerPopupCheck() {
    try {
        const now = new Date();
        const hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        const dateStr = now.toISOString().split('T')[0];

        const t1 = await apiCall('/api/app-config/cancel_mgr_popup_time');
        const time1 = t1?.value || '17:00';

        if (hhmm < time1 || sessionStorage.getItem('cancelMgr_' + dateStr + '_' + time1)) return;
        sessionStorage.setItem('cancelMgr_' + dateStr + '_' + time1, '1');

        const data = await apiCall('/api/cancel/pending-count');
        if (!data.count || Number(data.count) <= 0) return;

        cancelManagerShowPopup(Number(data.count));
    } catch(e) {}
}

function cancelManagerShowPopup(total) {
    if (document.getElementById('cancelMgrPopupOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'cancelMgrPopupOverlay';
    overlay.innerHTML = `
        <div style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99998;display:flex;align-items:center;justify-content:center;animation:emPopFadeIn 0.3s ease;">
            <div style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;border-radius:20px;padding:36px 44px;text-align:center;max-width:500px;width:90%;box-shadow:0 20px 60px rgba(59,130,246,0.5);animation:emPopBounce 0.5s ease;">
                <div style="font-size:55px;margin-bottom:10px;">📋</div>
                <div style="font-size:22px;font-weight:900;letter-spacing:1px;text-transform:uppercase;text-shadow:0 2px 10px rgba(0,0,0,0.2);">YÊU CẦU DUYỆT HỦY</div>
                <div style="margin-top:12px;font-size:38px;font-weight:900;color:#fbbf24;text-shadow:0 2px 8px rgba(0,0,0,0.2);">${total} KHÁCH</div>
                <div style="font-size:15px;font-weight:600;opacity:0.95;margin-top:6px;">đang chờ bạn duyệt hủy!</div>
                <div style="margin-top:14px;padding:12px 16px;background:rgba(0,0,0,0.2);border-radius:10px;font-size:13px;">
                    🤝 <strong>Hỗ trợ nhân viên</strong> xử lý khách không chất lượng.<br>
                    Duyệt hoặc từ chối để nhân viên tiếp tục công việc.
                </div>
                <div style="margin-top:20px;display:flex;gap:12px;justify-content:center;">
                    <button onclick="navigate('huy-khach-hang');document.getElementById('cancelMgrPopupOverlay').remove();"
                        style="padding:12px 28px;background:#fbbf24;color:#1e3a5f;border:none;border-radius:12px;font-size:15px;font-weight:900;cursor:pointer;box-shadow:0 4px 20px rgba(251,191,36,0.4);text-transform:uppercase;letter-spacing:1px;">
                        ✅ Duyệt Ngay
                    </button>
                    <button onclick="document.getElementById('cancelMgrPopupOverlay').remove();"
                        style="padding:12px 20px;background:rgba(255,255,255,0.15);color:white;border:1px solid rgba(255,255,255,0.3);border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;">
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    `;
    if (!document.getElementById('emPopupStyles')) {
        const st = document.createElement('style'); st.id = 'emPopupStyles';
        st.textContent = '@keyframes emPopFadeIn{from{opacity:0}to{opacity:1}}@keyframes emPopBounce{0%{transform:scale(.5);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}@keyframes emPopShake{0%,100%{transform:rotate(0)}15%{transform:rotate(-15deg)}30%{transform:rotate(15deg)}45%{transform:rotate(-10deg)}60%{transform:rotate(10deg)}}';
        document.head.appendChild(st);
    }
    document.body.appendChild(overlay);
}

async function checkAuth() {
    try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (!data.user) {
            window.location.href = '/index.html';
            return;
        }
        currentUser = data.user;
        userPermissions = data.user.permissions || {};

        // Load dynamic roles for menu items (in parallel)
        const dynamicItems = MENU_CONFIG.filter(item => item.dynamicRoles);
        if (dynamicItems.length > 0) {
            const configResults = await Promise.all(
                dynamicItems.map(item =>
                    fetch('/api/app-config/' + item.dynamicRoles).then(r => r.json()).catch(() => ({}))
                )
            );
            dynamicItems.forEach((item, i) => {
                if (configResults[i]?.value) {
                    item.roles = JSON.parse(configResults[i].value);
                    _configCache[item.dynamicRoles] = configResults[i].value;
                }
            });
        }

        renderSidebar();
        // Restore sidebar scroll position after href navigation
        var savedSidebarScroll = sessionStorage.getItem('sidebarScrollPos');
        if (savedSidebarScroll) {
            var navEl = document.getElementById('sidebarNav');
            if (navEl) navEl.scrollTop = parseInt(savedSidebarScroll);
            sessionStorage.removeItem('sidebarScrollPos');
        }
        renderUserInfo();
        renderAffiliateFloatingButtons();
    } catch (err) {
        window.location.href = '/';
    }
}

// ========== SIDEBAR SCROLL PRESERVATION ==========
function saveSidebarScrollAndNavigate(href) {
    var nav = document.getElementById('sidebarNav');
    if (nav) sessionStorage.setItem('sidebarScrollPos', nav.scrollTop.toString());
    window.location.href = href;
}

// ========== SIDEBAR ==========
var _sidebarCollapsed = JSON.parse(localStorage.getItem('sidebarCollapsed') || '{}');
var _sidebarParentCollapsed = JSON.parse(localStorage.getItem('sidebarParentCollapsed') || '{}');
var _sidebarSectionKeys = [];

// Parent group definitions: parent name -> list of child section names (in order)
var PARENT_SECTIONS = [
    { name: 'KẾT QUẢ & VINH DANH', sections: ['TỔNG QUAN', 'BXH & GIẢI THƯỞNG'] },
    { name: 'QUẢN LÝ CÔNG VIỆC', sections: ['CÔNG VIỆC HẰNG NGÀY', 'CÔNG VIỆC CHĂM SÓC KHÁCH'] },
    { name: 'BỘ PHẬN KINH DOANH', sections: ['KINH DOANH TELESALE', 'KINH DOANH CHĂM SÓC', 'KINH DOANH CRM NUÔI DƯỠNG', 'QUẢN LÝ AFFILIATE'] },
    { name: 'NHÂN SỰ & VẬN HÀNH', sections: ['HỖ TRỢ NHÂN VIÊN HV', 'QUẢN LÝ NHÂN VIÊN HV', 'HỆ THỐNG'] }
];

function renderSidebar() {
    var nav = document.getElementById('sidebarNav');
    var html = '';
    var sectionItems = {};
    var sectionOrder = [];

    // Group items by section
    MENU_CONFIG.forEach(function(item) {
        if (!item.roles.includes(currentUser.role)) return;
        if (currentUser.role !== 'giam_doc') {
            var permKey = MENU_PERM_MAP[item.id];
            if (permKey && userPermissions[permKey] && !userPermissions[permKey].can_view) return;
            if (permKey && !userPermissions[permKey]) return;
        }
        if (!sectionItems[item.section]) { sectionItems[item.section] = []; sectionOrder.push(item.section); }
        sectionItems[item.section].push(item);
    });

    _sidebarSectionKeys = sectionOrder;

    // Toggle all button (sections only, not parents)
    var allSectionsCollapsed = sectionOrder.every(function(s) { return _sidebarCollapsed[s]; });
    var toggleLabel = allSectionsCollapsed ? '\u25BC M\u1EDF r\u1ED9ng t\u1EA5t c\u1EA3' : '\u25B2 R\u00FAt g\u1ECDn t\u1EA5t c\u1EA3';
    html += '<div style="padding:6px 14px 10px;display:flex;">';
    html += '<button id="sidebarToggleAll" style="flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.5);padding:5px 8px;border-radius:6px;font-size:10px;cursor:pointer;font-weight:600;transition:all .2s;">' + toggleLabel + '</button>';
    html += '</div>';

    // Track which sections are rendered (to handle orphans)
    var renderedSections = {};

    // Render parent groups
    PARENT_SECTIONS.forEach(function(parent, pidx) {
        var parentCollapsed = _sidebarParentCollapsed[parent.name] || false;
        var parentChevron = parentCollapsed ? '\u25B6' : '\u25BC';

        // Check if parent has any visible sections
        var hasVisibleSections = parent.sections.some(function(s) { return sectionItems[s]; });
        if (!hasVisibleSections) return;

        html += '<div class="nav-parent-wrap">';
        html += '<div class="nav-parent-header" data-pidx="' + pidx + '">';
        html += '<span class="nav-parent-text">' + parent.name + '</span>';
        html += '<span class="nav-parent-chevron">' + parentChevron + '</span>';
        html += '</div>';
        html += '<div class="nav-parent-content" style="' + (parentCollapsed ? 'display:none;' : '') + '">';

        // Render child sections
        parent.sections.forEach(function(sectionName) {
            var items = sectionItems[sectionName];
            if (!items) return;
            renderedSections[sectionName] = true;
            var sidx = sectionOrder.indexOf(sectionName);
            var isCollapsed = _sidebarCollapsed[sectionName] || false;
            var chevron = isCollapsed ? '\u25B6' : '\u25BC';

            html += '<div class="nav-section-wrap">';
            html += '<div class="nav-section-header" data-sidx="' + sidx + '">';
            html += '<span class="nav-section-text">' + sectionName + '</span>';
            html += '<span class="nav-section-chevron">' + chevron + '</span>';
            html += '</div>';
            html += '<div class="nav-section-items" style="' + (isCollapsed ? 'display:none;' : '') + '">';

            items.forEach(function(item) {
                var itemHref = item.href || ('/' + item.id);
                var isActive = currentPage === item.id ? 'active' : '';
                var clickAction = item.href ? "saveSidebarScrollAndNavigate('" + item.href + "')" : "navigate('" + item.id + "')";
                html += '<a class="nav-item ' + isActive + '" data-page="' + item.id + '" href="' + itemHref + '" onclick="event.preventDefault(); ' + clickAction + '">';
                html += '<span class="nav-icon">' + item.icon + '</span> ' + item.label;
                html += '</a>';
            });
            html += '</div></div>';
        });

        html += '</div></div>';
    });

    // Render orphan sections (HOA HỒNG, AFFILIATE, etc.)
    sectionOrder.forEach(function(sectionName, sidx) {
        if (renderedSections[sectionName]) return;
        var items = sectionItems[sectionName];
        if (!items) return;
        var isCollapsed = _sidebarCollapsed[sectionName] || false;
        var chevron = isCollapsed ? '\u25B6' : '\u25BC';

        html += '<div class="nav-section-wrap">';
        html += '<div class="nav-section-header" data-sidx="' + sidx + '">';
        html += '<span class="nav-section-text">' + sectionName + '</span>';
        html += '<span class="nav-section-chevron">' + chevron + '</span>';
        html += '</div>';
        html += '<div class="nav-section-items" style="' + (isCollapsed ? 'display:none;' : '') + '">';

        items.forEach(function(item) {
            var itemHref = item.href || ('/' + item.id);
            var isActive = currentPage === item.id ? 'active' : '';
            var clickAction = item.href ? "saveSidebarScrollAndNavigate('" + item.href + "')" : "navigate('" + item.id + "')";
            html += '<a class="nav-item ' + isActive + '" data-page="' + item.id + '" href="' + itemHref + '" onclick="event.preventDefault(); ' + clickAction + '">';
            html += '<span class="nav-icon">' + item.icon + '</span> ' + item.label;
            html += '</a>';
        });
        html += '</div></div>';
    });

    nav.innerHTML = html;

    // Attach section header click handlers
    nav.querySelectorAll('.nav-section-header').forEach(function(header) {
        header.addEventListener('click', function() {
            var sidx = parseInt(this.getAttribute('data-sidx'));
            var section = _sidebarSectionKeys[sidx];
            if (!section) return;
            _sidebarCollapsed[section] = !_sidebarCollapsed[section];
            localStorage.setItem('sidebarCollapsed', JSON.stringify(_sidebarCollapsed));
            var wrap = this.parentElement;
            var items = wrap.querySelector('.nav-section-items');
            var chevron = this.querySelector('.nav-section-chevron');
            if (items) items.style.display = _sidebarCollapsed[section] ? 'none' : '';
            if (chevron) chevron.textContent = _sidebarCollapsed[section] ? '\u25B6' : '\u25BC';
            _updateToggleBtnLabel();
        });
    });

    // Attach parent header click handlers
    nav.querySelectorAll('.nav-parent-header').forEach(function(header) {
        header.addEventListener('click', function() {
            var pidx = parseInt(this.getAttribute('data-pidx'));
            var parent = PARENT_SECTIONS[pidx];
            if (!parent) return;
            _sidebarParentCollapsed[parent.name] = !_sidebarParentCollapsed[parent.name];
            localStorage.setItem('sidebarParentCollapsed', JSON.stringify(_sidebarParentCollapsed));
            var wrap = this.parentElement;
            var content = wrap.querySelector('.nav-parent-content');
            var chevron = this.querySelector('.nav-parent-chevron');
            if (content) content.style.display = _sidebarParentCollapsed[parent.name] ? 'none' : '';
            if (chevron) chevron.textContent = _sidebarParentCollapsed[parent.name] ? '\u25B6' : '\u25BC';
        });
    });

    // Attach toggle-all button handler (sections only, not parents)
    var toggleBtn = document.getElementById('sidebarToggleAll');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            var allCollapsed = _sidebarSectionKeys.every(function(s) { return _sidebarCollapsed[s]; });
            _sidebarSectionKeys.forEach(function(k) { _sidebarCollapsed[k] = !allCollapsed; });
            localStorage.setItem('sidebarCollapsed', JSON.stringify(_sidebarCollapsed));
            nav.querySelectorAll('.nav-section-wrap').forEach(function(wrap, i) {
                var items = wrap.querySelector('.nav-section-items');
                var chevron = wrap.querySelector('.nav-section-chevron');
                var sidx = wrap.querySelector('.nav-section-header');
                if (sidx) {
                    var idx = parseInt(sidx.getAttribute('data-sidx'));
                    var section = _sidebarSectionKeys[idx];
                    if (items) items.style.display = _sidebarCollapsed[section] ? 'none' : '';
                    if (chevron) chevron.textContent = _sidebarCollapsed[section] ? '\u25B6' : '\u25BC';
                }
            });
            _updateToggleBtnLabel();
        });
    }
}

function _updateToggleBtnLabel() {
    var btn = document.getElementById('sidebarToggleAll');
    if (!btn) return;
    var allCollapsed = _sidebarSectionKeys.every(function(s) { return _sidebarCollapsed[s]; });
    btn.textContent = allCollapsed ? '\u25BC M\u1EDF r\u1ED9ng t\u1EA5t c\u1EA3' : '\u25B2 R\u00FAt g\u1ECDn t\u1EA5t c\u1EA3';
}

function _updateToggleAllBtn() {
    const btn = document.getElementById('sidebarToggleAll');
    if (!btn) return;
    const anyExpanded = Object.values(_sidebarCollapsed).some(v => !v) || Object.keys(_sidebarCollapsed).length === 0;
    btn.innerHTML = anyExpanded ? '\u25B2 R\u00FAt g\u1ECDn t\u1EA5t c\u1EA3' : '\u25BC M\u1EDF r\u1ED9ng t\u1EA5t c\u1EA3';
    _sidebarAllCollapsed = !anyExpanded;
}

function renderUserInfo() {
    const initials = currentUser.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const avatar = document.getElementById('userAvatar');
    avatar.textContent = initials;
    avatar.className = `user-avatar`;
    avatar.style.cursor = 'pointer';
    avatar.onclick = () => showProfilePopup();
    document.getElementById('userName').textContent = currentUser.full_name;

    const roleBadge = document.getElementById('userRole');
    roleBadge.textContent = currentUser.username;
    roleBadge.className = `role-badge role-${currentUser.role}`;
}

function showProfilePopup() {
    const ROLE_MAP = { giam_doc:'Giám Đốc', quan_ly_cap_cao:'Quản Lý Cấp Cao', quan_ly:'Quản Lý', truong_phong:'Trưởng Phòng', nhan_vien:'Nhân Viên', part_time:'Part Time', tkaffiliate:'TK Affiliate' };
    const u = currentUser;
    const overlay = document.createElement('div');
    overlay.id = 'profileOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s;';
    overlay.innerHTML = `
        <div style="background:white;border-radius:16px;width:440px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.3);overflow:hidden;">
            <div style="background:linear-gradient(135deg,#122546,#1e3a5f);padding:28px 24px;text-align:center;position:relative;">
                <span onclick="document.getElementById('profileOverlay').remove()" style="position:absolute;top:12px;right:16px;cursor:pointer;color:rgba(255,255,255,0.7);font-size:20px;">✕</span>
                <div style="width:88px;height:88px;border-radius:50%;overflow:hidden;margin:0 auto 12px;border:3px solid rgba(250,210,76,0.5);box-shadow:0 4px 24px rgba(250,210,76,0.4);">
                    <img src="/images/logo-profile.png" alt="Logo" style="width:100%;height:100%;object-fit:cover;">
                </div>
                <div style="color:white;font-size:20px;font-weight:700;">${u.full_name}</div>
                <div style="color:#fad24c;font-size:13px;margin-top:4px;font-weight:600;">${ROLE_MAP[u.role] || u.role}</div>
                <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.15);">
                    <div style="color:white;font-size:15px;font-weight:800;letter-spacing:1px;">ĐỒNG PHỤC HV</div>
                    <a href="https://www.dongphuchv.vn" target="_blank" style="color:#fad24c;font-size:12px;text-decoration:none;opacity:0.9;">🌐 www.dongphuchv.vn</a>
                </div>
            </div>
            <div style="padding:24px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
                    <div style="background:#f8fafc;padding:12px;border-radius:10px;">
                        <div style="font-size:11px;color:#6b7280;margin-bottom:2px;">👤 Username</div>
                        <div style="font-weight:700;color:#122546;">${u.username}</div>
                    </div>
                    <div style="background:#f8fafc;padding:12px;border-radius:10px;">
                        <div style="font-size:11px;color:#6b7280;margin-bottom:2px;">📱 Số điện thoại</div>
                        <div style="font-weight:700;color:#122546;">${u.phone || '—'}</div>
                    </div>
                    <div style="background:#f8fafc;padding:12px;border-radius:10px;">
                        <div style="font-size:11px;color:#6b7280;margin-bottom:2px;">🏢 Chức vụ</div>
                        <div style="font-weight:700;color:#122546;">${ROLE_MAP[u.role] || u.role}</div>
                    </div>
                    <div style="background:#f8fafc;padding:12px;border-radius:10px;">
                        <div style="font-size:11px;color:#6b7280;margin-bottom:2px;">📋 Trạng thái</div>
                        <div style="font-weight:700;color:#10b981;">${u.status === 'active' ? '✅ Hoạt động' : u.status}</div>
                    </div>
                </div>
                <div style="border-top:1px solid #e5e7eb;padding-top:16px;">
                    <div style="font-weight:700;font-size:14px;color:#122546;margin-bottom:12px;">🔒 Đổi Mật Khẩu</div>
                    <input type="password" id="profOldPw" class="form-control" placeholder="Mật khẩu hiện tại" style="margin-bottom:8px;">
                    <input type="password" id="profNewPw" class="form-control" placeholder="Mật khẩu mới" style="margin-bottom:8px;">
                    <input type="password" id="profNewPw2" class="form-control" placeholder="Xác nhận mật khẩu mới" style="margin-bottom:12px;">
                    <div style="display:flex;gap:10px;justify-content:flex-end;">
                        <button class="btn btn-secondary" onclick="document.getElementById('profileOverlay').remove()">Đóng</button>
                        <button class="btn btn-primary" onclick="submitProfilePassword()" style="width:auto;">🔒 Đổi mật khẩu</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
}

async function submitProfilePassword() {
    const oldPw = document.getElementById('profOldPw').value;
    const newPw = document.getElementById('profNewPw').value;
    const newPw2 = document.getElementById('profNewPw2').value;
    if (!oldPw || !newPw) { showToast('Vui lòng nhập đầy đủ', 'error'); return; }
    if (newPw !== newPw2) { showToast('Mật khẩu mới không khớp', 'error'); return; }
    if (newPw.length < 4) { showToast('Mật khẩu mới ít nhất 4 ký tự', 'error'); return; }
    
    const data = await apiCall('/api/auth/change-password', 'POST', { currentPassword: oldPw, newPassword: newPw });
    if (data.success) {
        showToast('✅ Đổi mật khẩu thành công!');
        document.getElementById('profileOverlay')?.remove();
    } else {
        showToast(data.error || 'Lỗi đổi mật khẩu', 'error');
    }
}

function renderAffiliateFloatingButtons() {
    if (currentUser.role !== 'tkaffiliate' || !currentUser.manager_phone) return;
    
    // Remove if existing
    document.getElementById('affFloatingBtns')?.remove();
    
    // Inject pulse animation
    if (!document.getElementById('affFloatingStyle')) {
        const style = document.createElement('style');
        style.id = 'affFloatingStyle';
        style.textContent = `
            @keyframes affPulse {
                0% { box-shadow: 0 0 0 0 rgba(250,210,76,0.6); }
                70% { box-shadow: 0 0 0 14px rgba(250,210,76,0); }
                100% { box-shadow: 0 0 0 0 rgba(250,210,76,0); }
            }
            @keyframes affBounce {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            .aff-float-btn {
                width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                font-size: 26px; transition: all .2s;
                animation: affPulse 2s infinite, affBounce 3s infinite;
                box-shadow: 0 4px 16px rgba(0,0,0,0.3);
                text-decoration: none;
            }
            .aff-float-btn:hover { transform: scale(1.15) !important; }
        `;
        document.head.appendChild(style);
    }

    const phone = currentUser.manager_phone;
    const name = currentUser.manager_name || 'NV Quản Lý';
    
    const wrap = document.createElement('div');
    wrap.id = 'affFloatingBtns';
    wrap.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9990;display:flex;flex-direction:column;gap:14px;align-items:center;';
    wrap.innerHTML = `
        <a href="https://zalo.me/${phone}" target="_blank" class="aff-float-btn" 
           style="background:transparent;padding:0;overflow:hidden;" title="Zalo: ${name} - ${phone}">
            <img src="/img/zalo-icon.png" alt="Zalo" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">
        </a>
        <a href="tel:${phone}" class="aff-float-btn"
           style="background:transparent;padding:0;overflow:hidden;animation-delay:1s;" title="Gọi: ${name} - ${phone}">
            <img src="/img/phone-icon.png" alt="Gọi Điện" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">
        </a>
    `;
    document.body.appendChild(wrap);
}

// ========== ROUTING ==========
function navigate(page) {
    currentPage = page;
    history.pushState({ page }, '', '/' + page);
    handleRoute();

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('show');
}

async function handleRoute() {
    // Read page from pathname (e.g. /crm-nhu-cau → crm-nhu-cau)
    const pathname = window.location.pathname.replace(/^\//, '') || 'dashboard';

    // Block tkaffiliate from dashboard — redirect to bao-cao-hoa-hong
    if (pathname === 'dashboard' && currentUser && currentUser.role === 'tkaffiliate') {
        window.location.href = '/bao-cao-hoa-hong';
        return;
    }

    currentPage = pathname;

    // If pathname doesn't match any menu ID, look up by href
    var foundById = MENU_CONFIG.find(function(m) { return m.id === currentPage; });
    if (!foundById) {
        var foundByHref = MENU_CONFIG.find(function(m) { return m.href && m.href.replace(/^\//, '') === pathname; });
        if (foundByHref) currentPage = foundByHref.id;
    }

    // Update active menu
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === currentPage);
    });

    // Update page title
    const menuItem = MENU_CONFIG.find(m => m.id === currentPage);
    document.getElementById('pageTitle').textContent = menuItem ? menuItem.label : 'Dashboard';

    // Render page content
    const content = document.getElementById('contentArea');

    // Show loading spinner immediately
    content.innerHTML = '<div class="spa-loading"><div class="spa-spinner"></div><div class="spa-loading-text">Đang tải trang...</div></div>';

    // Inject spinner CSS once
    if (!document.getElementById('spaLoadingStyle')) {
        const style = document.createElement('style');
        style.id = 'spaLoadingStyle';
        style.textContent = `
            .spa-loading { display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;gap:16px; }
            .spa-spinner { width:40px;height:40px;border:4px solid var(--gray-200);border-top:4px solid #e65100;border-radius:50%;animation:spaSpinAnim .7s linear infinite; }
            @keyframes spaSpinAnim { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
            .spa-loading-text { color:var(--gray-400);font-size:13px;font-weight:600; }
        `;
        document.head.appendChild(style);
    }

    // Scroll content to top
    content.scrollTo(0, 0);

    // Track current page for F5 detection (bangiao-khoa + lichsu-baocao)
    if (currentPage !== 'bangiao-khoa' && currentPage !== 'bangiaokhoa') {
        sessionStorage.setItem('_lk_lastPage', currentPage);
    }
    if (currentPage !== 'lich-su-bao-cao' && currentPage !== 'lichsubaocaocv') {
        sessionStorage.setItem('_rh_lastPage', currentPage);
    }

    // Use setTimeout to let spinner render before heavy sync work
    await new Promise(r => setTimeout(r, 10));

    switch (currentPage) {
        case 'accounts': renderAccountsPage(content); break;
        case 'teams': renderTeamsPage(content); break;
        case 'permissions': renderPermissionsPage(content); break;
        case 'quan-ly-affiliate': renderQuanLyAffiliatePage(content); break;
        case 'settings': renderSettingsPage(content); break;
        case 'dashboard': renderDashboardPage(content); break;
        case 'chuyen-so': renderChuyenSoPage(content); break;
        case 'bao-cao-hoa-hong': case 'baocaohoahong': renderBaoCaoHoaHongPage(content); break;
        case 'crm-nhu-cau': renderCRMNhuCauPage(content); break;
        case 'crm-ctv': renderCRMCtvPage(content); break;
        case 'crm-tu-tim-kiem': renderCRMPage(content, 'tu_tim_kiem'); break;
        case 'crm-goi-hop-tac': renderCRMPage(content, 'goi_hop_tac'); break;
        case 'crm-goi-ban-hang': renderCRMPage(content, 'goi_ban_hang'); break;
        case 'cap-cuu-sep': renderEmergencyPage(content); break;
        case 'huy-khach': renderCancelPage(content); break;
        case 'tai-khoan-affiliate': renderTaiKhoanAffiliatePage(content); break;
        case 'my-customers': renderMyCustomersPage(content); break;
        case 'withdraw': renderWithdrawPage(content); break;
        case 'withdraw-manage': renderWithdrawManagePage(content); break;
        case 'rut-tien-affiliate': renderWithdrawAffiliatePage(content); break;
        case 'bang-xep-hang-affiliate': case 'bangxephangaffiliate': renderBangXepHangAffiliatePage(content); break;
        case 'bang-xep-hang-kinh-doanh': case 'bangxephangkinhdoanh': renderBangXepHangKinhDoanhPage(content); break;
        case 'bang-xep-hang-sale': case 'bangxephangsale': renderBangXepHangSalePage(content); break;
        case 'bang-xep-hang-ctv': case 'bangxephangctv': renderBangXepHangCtvPage(content); break;
        case 'bxh-san-xuat': case 'bxhsanxuat': renderBangXepHangSanXuatPage(content); break;
        case 'bxh-van-phong': case 'bxhvanphong': renderBangXepHangVanPhongPage(content); break;
        case 'giai-thuong-game': case 'giaithuonggame': renderGiaiThuongGamePage(content); break;
        case 'trao-giai-thuong': case 'traogiaithuong': renderTraoGiaiThuongPage(content); break;
        case 'bangiao-diem-kd': case 'bangiaodiem': renderBanGiaoDiemPage(content); break;
        case 'lich-khoa-bieu': case 'lichkhoabieu': renderLichKhoaBieuPage(content); break;
        case 'congvieckhoaxuly': renderCongViecPhatPage(content); break;
        case 'lich-su-bao-cao': case 'lichsubaocaocv': renderLichSuBaoCaoPage(content); break;
        case 'khoa-tk-nv': case 'khoatknv': renderKhoaTKNVPage(content); break;
        case 'xin-nghi-nv': case 'xinnghinhanvien': renderXinNghiPage(content); break;
        case 'setup-ngay-le': case 'setupngayle': renderSetupNgayLePage(content); break;
        case 'bangiao-khoa': case 'bangiaokhoa': renderBanGiaoKhoaPage(content); break;
        case 'goidien': renderGoiDienPage(content); break;
        case 'hethonggoidien': renderHeThongGoiDienPage(content); break;
        case 'quytacnuttuvancrmnhucau': renderQuyTacTuVanPage(content); break;
        case 'quytacnuttuvancrmctv': renderQuyTacTuVanCtvPage(content); break;
        default: renderComingSoon(content); break;
    }

    // Refresh sidebar badges after every navigation
    setTimeout(_globalRefreshBadges, 500);
}

// ========== GLOBAL SIDEBAR BADGES ==========
function _setBadge(menuText, count) {
    const menuItems = document.querySelectorAll('.sidebar-menu-item, [data-page]');
    menuItems.forEach(el => {
        if (el.textContent.includes(menuText) && !el.querySelector('.sb-badge-' + menuText.substring(0,4))) {
            // Clean existing badge
            const old = el.querySelector('.sb-badge');
            if (old) old.remove();
        }
        if (el.textContent.includes(menuText)) {
            let badge = el.querySelector('.sb-badge');
            if (count > 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'sb-badge';
                    badge.style.cssText = 'background:#dc2626;color:white;font-size:10px;font-weight:800;padding:1px 6px;border-radius:8px;margin-left:6px;line-height:1.3;display:inline-block;animation:_kbPulse 2s infinite;';
                    el.appendChild(badge);
                }
                badge.textContent = count;
            } else if (badge) {
                badge.remove();
            }
        }
    });
}

async function _globalRefreshBadges() {
    // Badge phạt cho TẤT CẢ users
    try {
        const penaltyRes = await apiCall('/api/penalty-tasks/count').catch(() => ({ count: 0 }));
        _setBadge('CV Phạt Phải Xử Lý', penaltyRes.count || 0);
    } catch(e) {}

    const isManager = ['giam_doc','quan_ly','truong_phong','quan_ly_cap_cao'].includes(currentUser?.role);
    if (!isManager) return;
    try {
        const [scheduleRes, cancelRes, emergencyRes] = await Promise.all([
            apiCall('/api/schedule/pending-count').catch(() => ({ count: 0 })),
            apiCall('/api/cancel/pending-count').catch(() => ({ count: 0 })),
            apiCall('/api/emergency/pending-count').catch(() => ({ count: 0 }))
        ]);
        // Lịch Khóa Biểu Công Việc
        if (typeof _kbUpdateSidebarBadge === 'function') {
            _kbUpdateSidebarBadge(scheduleRes.count || 0);
        } else {
            _setBadge('Lịch Khóa Biểu', scheduleRes.count || 0);
        }
        // Hủy Khách Hàng
        _setBadge('Hủy Khách Hàng', cancelRes.count || 0);
        // Cấp Cứu Sếp
        _setBadge('Cấp Cứu Sếp', emergencyRes.count || 0);
    } catch(e) {}
}

// ========== DASHBOARD ==========
async function renderDashboardPage(container) {
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 30px;" id="statsGrid">
            <div class="card stat-card" style="border-top: 3px solid var(--gold);">
                <div class="card-body" style="text-align:center; padding: 30px;">
                    <div id="statCustomers" style="font-size: 36px; font-weight: 800; color: var(--gold);">...</div>
                    <div style="color: var(--gray-500); margin-top: 8px; font-size: 13px;">Tổng Khách Hàng</div>
                </div>
            </div>
            <div class="card stat-card" style="border-top: 3px solid var(--success);">
                <div class="card-body" style="text-align:center; padding: 30px;">
                    <div id="statRevenue" style="font-size: 36px; font-weight: 800; color: var(--success);">...</div>
                    <div style="color: var(--gray-500); margin-top: 8px; font-size: 13px;">Doanh Số Chốt</div>
                </div>
            </div>
            <div class="card stat-card" style="border-top: 3px solid var(--info);">
                <div class="card-body" style="text-align:center; padding: 30px;">
                    <div id="statToday" style="font-size: 36px; font-weight: 800; color: var(--info);">...</div>
                    <div style="color: var(--gray-500); margin-top: 8px; font-size: 13px;">Khách Mới Hôm Nay</div>
                </div>
            </div>
            <div class="card stat-card" style="border-top: 3px solid var(--warning);">
                <div class="card-body" style="text-align:center; padding: 30px;">
                    <div id="statRate" style="font-size: 36px; font-weight: 800; color: var(--warning);">...</div>
                    <div style="color: var(--gray-500); margin-top: 8px; font-size: 13px;">Tỷ Lệ Chốt Đơn</div>
                </div>
            </div>
        </div>
        ${['giam_doc','quan_ly_cap_cao','quan_ly'].includes(currentUser.role) ? `
        <div id="pendingArea" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 24px;"></div>
        ` : ''}
        <div class="card">
            <div class="card-header"><h3>🏆 Bảng Xếp Hạng Nhân Viên</h3></div>
            <div class="card-body" id="leaderboardArea">
                <div class="empty-state"><div class="icon">⏳</div><h3>Đang tải...</h3></div>
            </div>
        </div>
    `;

    try {
        const data = await apiCall('/api/dashboard/stats');
        document.getElementById('statCustomers').textContent = data.totalCustomers || 0;
        document.getElementById('statRevenue').textContent = formatCurrency(data.totalRevenue);
        document.getElementById('statToday').textContent = data.newToday || 0;
        document.getElementById('statRate').textContent = (data.closeRate || 0) + '%';

        // Pending items for managers
        const pendingArea = document.getElementById('pendingArea');
        if (pendingArea) {
            let pendingHTML = '';
            if (data.pendingEmergency > 0) {
                pendingHTML += `<div class="card" style="border-left:4px solid var(--danger);cursor:pointer;" onclick="navigate('cap-cuu-sep')">
                    <div class="card-body" style="display:flex;align-items:center;gap:12px;padding:16px;">
                        <span style="font-size:28px;">🚨</span>
                        <div><div style="font-size:24px;font-weight:800;color:var(--danger);">${data.pendingEmergency}</div><div style="font-size:12px;color:var(--gray-500);">Cấp Cứu Chờ Xử Lý</div></div>
                    </div>
                </div>`;
            }
            if (data.pendingCancel > 0) {
                pendingHTML += `<div class="card" style="border-left:4px solid var(--warning);cursor:pointer;" onclick="navigate('huy-khach')">
                    <div class="card-body" style="display:flex;align-items:center;gap:12px;padding:16px;">
                        <span style="font-size:28px;">❌</span>
                        <div><div style="font-size:24px;font-weight:800;color:var(--warning);">${data.pendingCancel}</div><div style="font-size:12px;color:var(--gray-500);">Hủy KH Chờ Duyệt</div></div>
                    </div>
                </div>`;
            }
            if (data.pendingWithdraw > 0) {
                pendingHTML += `<div class="card" style="border-left:4px solid var(--gold);cursor:pointer;" onclick="navigate('withdraw-manage')">
                    <div class="card-body" style="display:flex;align-items:center;gap:12px;padding:16px;">
                        <span style="font-size:28px;">💰</span>
                        <div><div style="font-size:24px;font-weight:800;color:var(--gold);">${data.pendingWithdraw}</div><div style="font-size:12px;color:var(--gray-500);">Rút Tiền Chờ Duyệt</div></div>
                    </div>
                </div>`;
            }
            pendingArea.innerHTML = pendingHTML;
        }

        const lb = document.getElementById('leaderboardArea');
        if (data.topEmployees && data.topEmployees.length > 0) {
            lb.innerHTML = `<table class="table"><thead><tr>
                <th>#</th><th>Nhân Viên</th><th>Tổng KH</th><th>Chốt Đơn</th>
            </tr></thead><tbody>${data.topEmployees.map((e, i) => `<tr>
                <td>${i + 1}</td><td>${e.full_name}</td><td>${e.customer_count}</td><td>${e.closed_count}</td>
            </tr>`).join('')}</tbody></table>`;
        } else {
            lb.innerHTML = `<div class="empty-state"><div class="icon">📈</div><h3>Chưa có dữ liệu</h3><p>Bắt đầu chuyển số để hiển thị bảng xếp hạng</p></div>`;
        }
    } catch (err) {
        console.error('Dashboard error:', err);
    }
}

function renderComingSoon(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-body">
                <div class="empty-state">
                    <div class="icon">🚧</div>
                    <h3>Tính năng đang phát triển</h3>
                    <p>Tính năng này sẽ được triển khai trong giai đoạn tiếp theo</p>
                </div>
            </div>
        </div>
    `;
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
    });

    document.getElementById('changePasswordBtn').addEventListener('click', () => {
        showChangePasswordModal();
    });

    document.getElementById('modalClose').addEventListener('click', closeModal);

    window.addEventListener('hashchange', handleRoute);
}

// ========== MODAL ==========
function openModal(title, bodyHTML, footerHTML = '') {
    document.getElementById('modalTitle').innerHTML = title;
    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modalFooter').innerHTML = footerHTML;
    document.getElementById('modalOverlay').classList.add('show');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('show');
}

// ========== TOAST ==========
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// ========== CHANGE PASSWORD ==========
function showChangePasswordModal() {
    const bodyHTML = `
        <div class="form-group">
            <label>Mật khẩu hiện tại</label>
            <input type="password" id="cpCurrentPass" class="form-control" placeholder="Nhập mật khẩu hiện tại">
        </div>
        <div class="form-group">
            <label>Mật khẩu mới</label>
            <input type="password" id="cpNewPass" class="form-control" placeholder="Nhập mật khẩu mới">
        </div>
        <div class="form-group">
            <label>Xác nhận mật khẩu mới</label>
            <input type="password" id="cpConfirmPass" class="form-control" placeholder="Nhập lại mật khẩu mới">
        </div>
    `;
    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="submitChangePassword()" style="width:auto;">Đổi Mật Khẩu</button>
    `;
    openModal('🔒 Đổi Mật Khẩu', bodyHTML, footerHTML);
}

async function submitChangePassword() {
    const current = document.getElementById('cpCurrentPass').value;
    const newPass = document.getElementById('cpNewPass').value;
    const confirm = document.getElementById('cpConfirmPass').value;

    if (!current || !newPass) { showToast('Vui lòng nhập đầy đủ', 'error'); return; }
    if (newPass !== confirm) { showToast('Mật khẩu xác nhận không khớp', 'error'); return; }
    if (newPass.length < 4) { showToast('Mật khẩu phải ít nhất 4 ký tự', 'error'); return; }

    try {
        const res = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword: current, newPassword: newPass })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Đổi mật khẩu thành công!');
            closeModal();
        } else {
            showToast(data.error, 'error');
        }
    } catch (err) {
        showToast('Lỗi kết nối', 'error');
    }
}

// ========== API HELPER ==========
async function apiCall(url, method = 'GET', body = null) {
    const options = { method, headers: {} };
    if (body && !(body instanceof FormData)) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    } else if (body instanceof FormData) {
        options.body = body;
    }
    const res = await fetch(url, options);
    return res.json();
}

// ========== FORMAT HELPERS ==========
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN');
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(amount) {
    if (!amount) return '0';
    return Number(amount).toLocaleString('vi-VN');
}

function getStatusBadge(status) {
    const s = STATUS_LABELS[status] || { text: status, class: '' };
    return `<span class="badge ${s.class}">${s.text}</span>`;
}

// Build customer code: dailyNum-day-month
function getCustomerCode(customer) {
    const d = new Date(customer.created_at || customer.handover_date);
    const yearSuffix = 'Y' + String(d.getFullYear()).slice(-2);
    return `${customer.daily_order_number || 0}-${d.getDate()}-${d.getMonth() + 1}-${yearSuffix}`;
}

// ========== SIDEBAR TOGGLE ==========
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const btn = document.getElementById('sidebarToggleBtn');
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    btn.textContent = isCollapsed ? '▶' : '◀';
    localStorage.setItem('sidebarCollapsed', isCollapsed ? '1' : '0');
}

// Restore sidebar state on load
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('sidebarCollapsed') === '1') {
        const sidebar = document.getElementById('sidebar');
        const btn = document.getElementById('sidebarToggleBtn');
        if (sidebar) { sidebar.classList.add('collapsed'); }
        if (btn) { btn.textContent = '▶'; }
    }
    // Check birthday after small delay (skip for affiliate accounts)
    const AFFILIATE_ROLES_BD = ['tkaffiliate', 'hoa_hong', 'ctv', 'nuoi_duong', 'sinh_vien'];
    if (!currentUser || !AFFILIATE_ROLES_BD.includes(currentUser.role)) {
        setTimeout(checkBirthdayToday, 2000);
    }
});

// ========== BIRTHDAY POPUP ==========
async function checkBirthdayToday() {
    const today = new Date().toISOString().split('T')[0];
    const storageKey = 'birthday_shown_' + today;
    if (localStorage.getItem(storageKey)) return; // Already shown today

    try {
        const data = await apiCall('/api/users/birthdays-today');
        if (!data.users || data.users.length === 0) return;

        localStorage.setItem(storageKey, '1');
        showBirthdayPopup(data.users);
    } catch (e) {
        console.error('Birthday check failed:', e);
    }
}

function showBirthdayPopup(birthdayUsers) {
    const ROLE_LABELS_BD = {
        giam_doc: 'Giám Đốc', quan_ly_cap_cao: 'Quản Lý Cấp Cao', quan_ly: 'Quản Lý',
        truong_phong: 'Trưởng Phòng', nhan_vien: 'Nhân Viên',
        part_time: 'Part Time', hoa_hong: 'Hoa Hồng', ctv: 'CTV',
        tkaffiliate: 'TK Affiliate'
    };

    const usersHTML = birthdayUsers.map(u => {
        const role = ROLE_LABELS_BD[u.role] || u.role;
        const firstName = u.full_name.split(' ').pop();
        return `
            <div style="margin:12px 0;">
                <div style="font-size:22px;font-weight:800;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,0.3);">
                    🎂 Hôm nay là sinh nhật của <span style="color:#fde68a;">${u.full_name}</span>
                </div>
                <div style="font-size:15px;color:#fcd34d;margin-top:4px;">(${role})</div>
                <div style="font-size:17px;color:#fff;margin-top:8px;">
                    Mọi người cùng Chúc mừng sinh nhật bạn <strong style="color:#fde68a;">${firstName}</strong> nhé 🎉
                </div>
            </div>`;
    }).join('<hr style="border:none;border-top:1px solid rgba(255,255,255,0.2);margin:16px 0;">');

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'birthdayOverlay';
    overlay.innerHTML = `
        <style>
            #birthdayOverlay {
                position:fixed;top:0;left:0;width:100%;height:100%;
                background:rgba(0,0,0,0.7);z-index:99999;display:flex;
                align-items:center;justify-content:center;
                animation:bdFadeIn 0.5s ease;
            }
            @keyframes bdFadeIn { from { opacity:0; } to { opacity:1; } }
            @keyframes bdScaleIn { from { transform:scale(0.7);opacity:0; } to { transform:scale(1);opacity:1; } }
            @keyframes bdFloat { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
            @keyframes confettiFall {
                0% { transform:translateY(-100vh) rotate(0deg); opacity:1; }
                100% { transform:translateY(100vh) rotate(720deg); opacity:0; }
            }
            .bd-confetti {
                position:fixed;width:10px;height:10px;top:-10px;z-index:100000;
                animation:confettiFall linear forwards;pointer-events:none;
            }
            .bd-popup {
                background:linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
                border-radius:24px;padding:40px 48px;max-width:560px;width:90%;
                text-align:center;position:relative;overflow:hidden;
                box-shadow:0 25px 80px rgba(102,126,234,0.5);
                animation:bdScaleIn 0.6s cubic-bezier(0.34,1.56,0.64,1);
            }
            .bd-popup::before {
                content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;
                background:radial-gradient(circle,rgba(255,255,255,0.1) 0%,transparent 60%);
                pointer-events:none;
            }
            .bd-cake { font-size:72px;animation:bdFloat 2s ease-in-out infinite; }
            .bd-close {
                margin-top:24px;padding:12px 40px;border:2px solid white;
                background:rgba(255,255,255,0.15);color:white;border-radius:30px;
                font-size:15px;font-weight:700;cursor:pointer;
                backdrop-filter:blur(4px);transition:all 0.3s;
            }
            .bd-close:hover { background:rgba(255,255,255,0.3);transform:scale(1.05); }
        </style>
        <div class="bd-popup">
            <div class="bd-cake">🎂</div>
            <div style="font-size:28px;font-weight:900;color:#fff;margin:8px 0 20px;text-shadow:0 2px 10px rgba(0,0,0,0.3);">
                🎉 Chúc Mừng Sinh Nhật! 🎉
            </div>
            ${usersHTML}
            <button class="bd-close" onclick="closeBirthdayPopup()">🎊 Đóng</button>
        </div>
    `;
    document.body.appendChild(overlay);

    // Spawn confetti
    const colors = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff6eb4','#a855f7','#f97316','#06b6d4'];
    for (let i = 0; i < 60; i++) {
        setTimeout(() => {
            const c = document.createElement('div');
            c.className = 'bd-confetti';
            c.style.left = Math.random() * 100 + 'vw';
            c.style.background = colors[Math.floor(Math.random() * colors.length)];
            c.style.width = (6 + Math.random() * 10) + 'px';
            c.style.height = (6 + Math.random() * 10) + 'px';
            c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            c.style.animationDuration = (2 + Math.random() * 3) + 's';
            c.style.animationDelay = (Math.random() * 0.5) + 's';
            document.body.appendChild(c);
            setTimeout(() => c?.remove(), 6000);
        }, i * 80);
    }
}

function closeBirthdayPopup() {
    const overlay = document.getElementById('birthdayOverlay');
    if (overlay) {
        overlay.style.animation = 'bdFadeIn 0.3s ease reverse';
        setTimeout(() => overlay.remove(), 300);
    }
}

// ========== GLOBAL NUMBER INPUT FORMATTING (2000000 → 2.000.000) ==========

/** Format a number with dot separators: 2000000 → "2.000.000" */
function _formatNumStr(val) {
    var s = String(val).replace(/[^0-9]/g, '');
    if (!s) return '';
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Parse formatted string back to number: "2.000.000" → 2000000 */
function _parseNumInput(val) {
    if (typeof val === 'number') return val;
    var s = String(val).replace(/\./g, '').replace(/[^0-9\-]/g, '');
    return s === '' ? 0 : parseInt(s, 10);
}

// Capture native getter/setter BEFORE override
var _nativeInputDesc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
var _nativeGet = _nativeInputDesc.get;
var _nativeSet = _nativeInputDesc.set;

/** Apply formatting to a single input element */
function _applyNumFormat(input) {
    if (input.dataset.numFormatted) return;
    input.dataset.numFormatted = '1';

    // Convert type=number to type=text
    if (input.type === 'number') {
        var oldVal = _nativeGet.call(input);
        input.type = 'text';
        input.inputMode = 'numeric';
        input.pattern = '[0-9.]*';
        input.removeAttribute('step');
        if (oldVal) _nativeSet.call(input, _formatNumStr(oldVal));
    }

    // Format on input (use native getter/setter to avoid override recursion)
    input.addEventListener('input', function() {
        var pos = this.selectionStart;
        var rawDisplay = _nativeGet.call(this);
        var oldLen = rawDisplay.length;
        var raw = rawDisplay.replace(/[^0-9]/g, '');
        var formatted = _formatNumStr(raw);
        _nativeSet.call(this, formatted);
        var newLen = formatted.length;
        var newPos = pos + (newLen - oldLen);
        if (newPos < 0) newPos = 0;
        try { this.setSelectionRange(newPos, newPos); } catch(e) {}
    });

    // Format existing value if present
    var curVal = _nativeGet.call(input);
    if (curVal && /\d/.test(curVal)) {
        _nativeSet.call(input, _formatNumStr(curVal));
    }
}

/** Scan and apply formatting to all number inputs in a container */
function _scanNumInputs(root) {
    var inputs = (root || document).querySelectorAll('input[type="number"]:not([data-num-formatted]), input[data-format-number]:not([data-num-formatted])');
    inputs.forEach(_applyNumFormat);
}

/** Override .value getter/setter so code reads raw number but display shows formatted */
Object.defineProperty(HTMLInputElement.prototype, 'value', {
    get: function() {
        var val = _nativeGet.call(this);
        // For formatted inputs, strip dots so JS code gets raw number
        if (this.dataset && this.dataset.numFormatted && val && /\./.test(val) && /^\d[\d.]*$/.test(val)) {
            return val.replace(/\./g, '');
        }
        return val;
    },
    set: function(v) {
        // For formatted inputs, auto-add dots when value is set programmatically
        if (this.dataset && this.dataset.numFormatted && v !== '' && v !== null && v !== undefined) {
            var num = String(v).replace(/[^0-9]/g, '');
            if (num) {
                _nativeSet.call(this, _formatNumStr(num));
                return;
            }
        }
        _nativeSet.call(this, v);
    },
    configurable: true
});

// MutationObserver to auto-detect new number inputs added dynamically
var _numFmtObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
        m.addedNodes.forEach(function(node) {
            if (node.nodeType === 1) {
                if (node.tagName === 'INPUT' && (node.type === 'number' || (node.dataset && node.dataset.formatNumber))) {
                    _applyNumFormat(node);
                }
                _scanNumInputs(node);
            }
        });
    });
});

// Start observing when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        _scanNumInputs();
        _numFmtObserver.observe(document.body, { childList: true, subtree: true });
    });
} else {
    _scanNumInputs();
    _numFmtObserver.observe(document.body, { childList: true, subtree: true });
}

// ========== MANAGER PENALTY POPUP ==========
function _showMgrPenaltyPopup(penalties, total, departments, penaltyDate) {
    if (document.getElementById('mgrPenaltyPopupOverlay')) return;
    const ROLE_LABEL = { giam_doc: 'GĐ', quan_ly_cap_cao: 'QLCC', quan_ly: 'QL', truong_phong: 'TP', nhan_vien: 'NV', part_time: 'PT' };
    const ROLE_COLOR = { giam_doc: '#7c3aed', quan_ly_cap_cao: '#2563eb', quan_ly: '#0891b2', truong_phong: '#d97706', nhan_vien: '#6b7280', part_time: '#9ca3af' };
    const SOURCE_COLOR = { 'CV Khóa': '#dc2626', 'CV Chuỗi': '#7c3aed', 'CV Điểm': '#2563eb', 'Hỗ trợ NV': '#d97706' };
    // Sử dụng ngày từ API (ngày hôm qua) thay vì ngày hôm nay
    const dateObj = penaltyDate ? new Date(penaltyDate + 'T00:00:00') : new Date();
    const todayLabel = dateObj.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

    // Group penalties by user
    const userMap = {};
    penalties.forEach(p => {
        const uid = p.penalized_user_id;
        if (!userMap[uid]) userMap[uid] = { name: p.penalized_name, username: p.penalized_username, role: p.penalized_role, dept_id: p.penalized_dept_id, items: [], total: 0 };
        userMap[uid].items.push(p);
        userMap[uid].total += (p.penalty_amount || 0);
    });
    const userCount = Object.keys(userMap).length;

    // Build dept tree
    const deptMap = {};
    (departments || []).forEach(d => { deptMap[d.id] = { ...d, children: [] }; });
    const roots = [];
    Object.values(deptMap).forEach(d => {
        if (d.parent_id && deptMap[d.parent_id]) deptMap[d.parent_id].children.push(d);
        else roots.push(d);
    });

    // Get users in a dept (direct, not children)
    function getDeptUsers(deptId) {
        return Object.entries(userMap).filter(([_, u]) => u.dept_id === deptId).sort((a, b) => {
            const rp = { giam_doc: 0, quan_ly_cap_cao: 1, quan_ly: 2, truong_phong: 3, nhan_vien: 4, part_time: 5 };
            return (rp[a[1].role] || 9) - (rp[b[1].role] || 9);
        });
    }

    // Get total penalty for dept + children
    function getDeptTotal(dept) {
        let sum = getDeptUsers(dept.id).reduce((s, [_, u]) => s + u.total, 0);
        (dept.children || []).forEach(c => { sum += getDeptTotal(c); });
        return sum;
    }

    // Render user row
    function renderUser(uid, u) {
        const roleBadge = `<span style="background:${ROLE_COLOR[u.role] || '#6b7280'};color:white;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">${ROLE_LABEL[u.role] || 'NV'}</span>`;
        let itemsHtml = u.items.map(p => {
            const srcColor = SOURCE_COLOR[p.source] || '#6b7280';
            return `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:11px;">
                <span style="background:${srcColor}15;color:${srcColor};padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;border:1px solid ${srcColor}30;">${p.source}</span>
                <span style="color:#334155;flex:1;">${p.task_name}${p.related_user ? ' <span style="color:#9ca3af;">(' + p.related_user + ')</span>' : ''}</span>
                <span style="color:#dc2626;font-weight:700;white-space:nowrap;">${(p.penalty_amount || 0).toLocaleString()}đ</span>
            </div>`;
        }).join('');

        return `<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 12px;background:#fafafa;border-radius:8px;margin-bottom:4px;">
            <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#e2e8f0,#cbd5e1);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;">👤</div>
            <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    <span style="font-weight:700;font-size:12px;color:#1e293b;">${u.name || u.username}</span>
                    ${roleBadge}
                    <span style="margin-left:auto;font-weight:800;color:#dc2626;font-size:12px;">${u.total.toLocaleString()}đ</span>
                </div>
                <div style="margin-top:4px;">${itemsHtml}</div>
            </div>
        </div>`;
    }

    // Render dept node recursively
    function renderDept(dept, depth) {
        const deptTotal = getDeptTotal(dept);
        if (deptTotal === 0) return '';
        const users = getDeptUsers(dept.id);
        const indent = depth * 12;
        const isTeam = depth >= 2;
        const bgColor = depth === 0 ? 'linear-gradient(135deg,#122546,#1e3a5f)' : depth === 1 ? 'linear-gradient(135deg,#2563eb,#3b82f6)' : '#f1f5f9';
        const textColor = depth <= 1 ? 'white' : '#334155';
        const icon = depth === 0 ? '🏛️' : depth === 1 ? '📁' : '🏷️';

        let html = `<div style="margin-left:${indent}px;margin-bottom:${depth === 0 ? 12 : 6}px;">
            <div style="background:${bgColor};padding:${depth <= 1 ? '8px 14px' : '6px 12px'};border-radius:${depth <= 1 ? 8 : 6}px;display:flex;align-items:center;justify-content:space-between;${depth >= 2 ? 'border:1px solid #e2e8f0;' : ''}">
                <span style="color:${textColor};font-weight:${depth <= 1 ? 800 : 700};font-size:${depth <= 1 ? 13 : 11}px;">${icon} ${dept.name}</span>
                <span style="color:${depth <= 1 ? 'rgba(255,255,255,0.9)' : '#dc2626'};font-weight:800;font-size:${depth <= 1 ? 13 : 11}px;">${deptTotal.toLocaleString()}đ</span>
            </div>`;

        if (users.length > 0) {
            html += `<div style="margin-top:4px;margin-left:8px;">`;
            users.forEach(([uid, u]) => { html += renderUser(uid, u); });
            html += `</div>`;
        }

        (dept.children || []).forEach(child => {
            html += renderDept(child, depth + 1);
        });

        html += '</div>';
        return html;
    }

    // Build tree HTML
    let treeHtml = '';
    roots.forEach(r => { treeHtml += renderDept(r, 0); });

    // Handle ungrouped users (dept_id not in tree)
    const groupedDeptIds = new Set();
    function collectIds(dept) { groupedDeptIds.add(dept.id); (dept.children || []).forEach(collectIds); }
    roots.forEach(collectIds);
    const ungrouped = Object.entries(userMap).filter(([_, u]) => !groupedDeptIds.has(u.dept_id));
    if (ungrouped.length > 0) {
        treeHtml += `<div style="margin-bottom:6px;"><div style="background:#f1f5f9;padding:6px 12px;border-radius:6px;border:1px solid #e2e8f0;font-weight:700;font-size:11px;color:#64748b;">📋 Khác</div><div style="margin-top:4px;margin-left:8px;">`;
        ungrouped.forEach(([uid, u]) => { treeHtml += renderUser(uid, u); });
        treeHtml += '</div></div>';
    }

    const overlay = document.createElement('div');
    overlay.id = 'mgrPenaltyPopupOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;animation:mgrPenFadeIn 0.3s;backdrop-filter:blur(4px);';
    overlay.innerHTML = `
        <style>
            @keyframes mgrPenFadeIn { from { opacity:0; } to { opacity:1; } }
            @keyframes mgrPenSlideUp { from { transform:translateY(30px);opacity:0; } to { transform:translateY(0);opacity:1; } }
        </style>
        <div style="background:white;border-radius:16px;width:95%;max-width:560px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:mgrPenSlideUp 0.4s;overflow:hidden;">
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:20px 24px 24px;position:relative;">
                <div style="position:absolute;top:-20px;right:-20px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,0.08);"></div>
                <div style="position:absolute;bottom:-30px;left:-10px;width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.05);"></div>
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:22px;">⚠️</div>
                    <div>
                        <div style="color:white;font-weight:800;font-size:16px;">THÔNG BÁO PHẠT NHÂN SỰ</div>
                        <div style="color:rgba(255,255,255,0.8);font-size:11px;margin-top:2px;">📅 ${todayLabel}</div>
                    </div>
                </div>
                <div style="margin-top:12px;display:flex;gap:12px;">
                    <div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 14px;flex:1;text-align:center;">
                        <div style="color:rgba(255,255,255,0.7);font-size:10px;font-weight:600;">SỐ NHÂN SỰ</div>
                        <div style="color:white;font-size:20px;font-weight:800;">${userCount}</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 14px;flex:1;text-align:center;">
                        <div style="color:rgba(255,255,255,0.7);font-size:10px;font-weight:600;">TỔNG PHẠT</div>
                        <div style="color:#fbbf24;font-size:20px;font-weight:800;">${total.toLocaleString()}đ</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 14px;flex:1;text-align:center;">
                        <div style="color:rgba(255,255,255,0.7);font-size:10px;font-weight:600;">VI PHẠM</div>
                        <div style="color:white;font-size:20px;font-weight:800;">${penalties.length}</div>
                    </div>
                </div>
            </div>

            <!-- Body -->
            <div style="flex:1;overflow-y:auto;padding:16px 20px;">
                <div style="font-size:12px;color:#64748b;font-weight:600;margin-bottom:10px;">📋 Chi tiết phạt theo phòng ban:</div>
                ${treeHtml}
            </div>

            <!-- Footer -->
            <div style="padding:14px 20px;border-top:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;background:#fafafa;">
                <div style="font-size:11px;color:#9ca3af;">Popup hiện 1 lần/ngày</div>
                <button onclick="_mgrPenaltyAcknowledge()" style="padding:10px 28px;border:none;border-radius:10px;background:linear-gradient(135deg,#059669,#10b981);color:white;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 3px 10px rgba(5,150,105,0.3);transition:transform 0.15s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">✅ Đã xem</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function _mgrPenaltyAcknowledge() {
    try { await apiCall('/api/penalty/team-today/acknowledge', 'POST'); } catch(e) {}
    const el = document.getElementById('mgrPenaltyPopupOverlay');
    if (el) { el.style.animation = 'mgrPenFadeIn 0.2s reverse'; setTimeout(() => el.remove(), 200); }
}

// ========== CRM NHU CẦU — 14-column layout with consultation system ==========

// Format deposit input with thousand separators (500000 → 500.000)
function formatDepositInput(el) {
    const cursor = el.selectionStart;
    const oldLen = el.value.length;
    const raw = el.value.replace(/\D/g, '');
    el.value = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const newLen = el.value.length;
    const newCursor = cursor + (newLen - oldLen);
    el.setSelectionRange(newCursor, newCursor);
}

const VN_PROVINCES = [
    'An Giang','Bà Rịa - Vũng Tàu','Bắc Giang','Bắc Kạn','Bạc Liêu','Bắc Ninh','Bến Tre','Bình Định','Bình Dương',
    'Bình Phước','Bình Thuận','Cà Mau','Cần Thơ','Cao Bằng','Đà Nẵng','Đắk Lắk','Đắk Nông','Điện Biên','Đồng Nai',
    'Đồng Tháp','Gia Lai','Hà Giang','Hà Nam','Hà Nội','Hà Tĩnh','Hải Dương','Hải Phòng','Hậu Giang','Hòa Bình',
    'Hưng Yên','Khánh Hòa','Kiên Giang','Kon Tum','Lai Châu','Lâm Đồng','Lạng Sơn','Lào Cai','Long An','Nam Định',
    'Nghệ An','Ninh Bình','Ninh Thuận','Phú Thọ','Phú Yên','Quảng Bình','Quảng Nam','Quảng Ngãi','Quảng Ninh','Quảng Trị',
    'Sóc Trăng','Sơn La','Tây Ninh','Thái Bình','Thái Nguyên','Thanh Hóa','Thừa Thiên Huế','Tiền Giang','TP. Hồ Chí Minh',
    'Trà Vinh','Tuyên Quang','Vĩnh Long','Vĩnh Phúc','Yên Bái'
];
// Birthday countdown helper: returns { html, class } based on days until birthday
function getBirthdayDisplay(birthdayStr) {
    if (!birthdayStr) return { html: '<span style="color:var(--gray-600)">—</span>', tdClass: '' };
    const today = new Date();
    // Parse birthday as "day/month" format (e.g. "23/10")
    let day, month;
    if (birthdayStr.includes('/')) {
        const parts = birthdayStr.split('/');
        day = parseInt(parts[0]); month = parseInt(parts[1]);
    } else if (birthdayStr.includes('-')) {
        const parts = birthdayStr.split('-');
        // Could be YYYY-MM-DD or DD-MM
        if (parts.length === 3) { month = parseInt(parts[1]); day = parseInt(parts[2]); }
        else { day = parseInt(parts[0]); month = parseInt(parts[1]); }
    } else {
        return { html: '<span style="color:var(--gray-600)">—</span>', tdClass: '' };
    }
    if (isNaN(day) || isNaN(month)) return { html: '<span style="color:var(--gray-600)">—</span>', tdClass: '' };

    let nextBday = new Date(today.getFullYear(), month - 1, day);
    if (nextBday < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        nextBday = new Date(today.getFullYear() + 1, month - 1, day);
    }
    const diffMs = nextBday - new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const dateStr = `${day}/${month}`;

    if (daysUntil === 0) {
        return { html: `<span class="bday-today">🎉 ${dateStr} <b>HÔM NAY!</b></span>`, tdClass: 'bday-cell-today' };
    } else if (daysUntil === 1) {
        return { html: `<span class="bday-urgent">🎂🔥 ${dateStr} <b>NGÀY MAI</b></span>`, tdClass: 'bday-cell-1' };
    } else if (daysUntil === 2) {
        return { html: `<span class="bday-urgent">🎂🔥 ${dateStr} <small>(${daysUntil} ngày)</small></span>`, tdClass: 'bday-cell-2' };
    } else if (daysUntil === 3) {
        return { html: `<span class="bday-warn">🎂 ${dateStr} <small>(${daysUntil} ngày)</small></span>`, tdClass: 'bday-cell-3' };
    } else if (daysUntil <= 5) {
        return { html: `<span class="bday-near">🎂 ${dateStr} <small>(${daysUntil} ngày)</small></span>`, tdClass: 'bday-cell-5' };
    } else if (daysUntil <= 7) {
        return { html: `<span class="bday-soon">🎂 ${dateStr} <small>(${daysUntil} ngày)</small></span>`, tdClass: 'bday-cell-7' };
    }
    return { html: dateStr, tdClass: '' };
}

// Check if today is the customer's birthday (day+month match, ignore year)
function _crmIsBirthdayToday(birthdayStr) {
    if (!birthdayStr) return false;
    const today = new Date();
    let day, month;
    if (birthdayStr.includes('/')) {
        const parts = birthdayStr.split('/');
        day = parseInt(parts[0]); month = parseInt(parts[1]);
    } else if (birthdayStr.includes('-')) {
        const parts = birthdayStr.split('-');
        if (parts.length === 3) { month = parseInt(parts[1]); day = parseInt(parts[2]); }
        else { day = parseInt(parts[0]); month = parseInt(parts[1]); }
    } else {
        return false;
    }
    if (isNaN(day) || isNaN(month)) return false;
    return today.getDate() === day && (today.getMonth() + 1) === month;
}

let CONSULT_TYPES = {
    lam_quen_tuong_tac: { label: 'Làm Quen Tương Tác', icon: '👋', color: '#14b8a6' },
    goi_dien: { label: 'Gọi Điện', icon: '📞', color: '#3b82f6' },
    nhan_tin: { label: 'Nhắn Tin', icon: '💬', color: '#8b5cf6' },
    tuong_tac_ket_noi: { label: 'Tương Tác Kết Nối Lại', icon: '🔗', color: '#6366f1' },
    gap_truc_tiep: { label: 'Gặp Trực Tiếp', icon: '🤝', color: '#10b981' },
    gui_bao_gia: { label: 'Gửi Báo Giá', icon: '📄', color: '#f59e0b' },
    gui_mau: { label: 'Gửi Mẫu Vải/Áo', icon: '👔', color: '#ec4899' },
    thiet_ke: { label: 'Thiết Kế', icon: '🎨', color: '#6366f1' },
    bao_sua: { label: 'Sửa Thiết Kế', icon: '🔧', color: '#ef4444' },
    gui_stk_coc: { label: 'Gửi STK Cọc', icon: '🏦', color: '#f59e0b' },
    giuc_coc: { label: 'Giục Cọc', icon: '⏰', color: '#ea580c' },
    dat_coc: { label: 'Đặt Cọc', icon: '💵', color: '#f97316' },
    chot_don: { label: 'Chốt Đơn', icon: '✅', color: '#22c55e' },
    dang_san_xuat: { label: 'Đang Sản Xuất', icon: '🏭', color: '#8b5cf6' },
    hoan_thanh: { label: 'Hoàn Thành Đơn', icon: '🏆', color: '#0d9488', textColor: 'white' },
    sau_ban_hang: { label: 'Chăm Sóc Sau Bán', icon: '📦', color: '#0ea5e9' },
    cap_cuu_sep: { label: 'Cấp Cứu Sếp', icon: '🚨', color: '#ef4444' },
    huy_coc: { label: 'Hủy Cọc', icon: '🚫', color: '#dc2626' },
    hoan_thanh_cap_cuu: { label: 'Hoàn Thành Cấp Cứu', icon: '🏥', color: '#122546', textColor: '#fad24c' },
    huy: { label: 'Hủy Khách', icon: '❌', color: '#dc2626' },
    giam_gia: { label: 'Giảm Giá', icon: '🎁', color: '#e11d48' },
    tu_van_lai: { label: 'Tư Vấn Lại', icon: '🔄', color: '#0891b2' },
    gui_ct_kh_cu: { label: 'Gửi Chương Trình KH Cũ', icon: '🎟️', color: '#7c3aed' },
};

// Merge dynamic types from consult_type_configs API into CONSULT_TYPES
async function _crmSyncConsultTypes() {
    try {
        const data = await apiCall('/api/consult-types');
        if (data.types && Array.isArray(data.types)) {
            for (const t of data.types) {
                if (!t.key || !t.is_active) continue;
                // Add or update (API types override defaults)
                CONSULT_TYPES[t.key] = {
                    label: t.label || t.key,
                    icon: t.icon || '📋',
                    color: t.color || '#6b7280',
                    textColor: t.text_color || 'white',
                    maxAppointmentDays: t.max_appointment_days || 0
                };
            }
        }
    } catch(e) { /* silent — fallback to hardcoded */ }
}

async function renderCRMNhuCauPage(container) {
    let topStaffOptions = '';
    if (['giam_doc', 'quan_ly', 'truong_phong'].includes(currentUser.role)) {
        const staff = await apiCall('/api/managed-staff');
        const staffUsers = (staff.users || []).filter(u => ['nhan_vien', 'truong_phong', 'quan_ly'].includes(u.role));
        topStaffOptions = staffUsers
            .map(u => '<option value="' + u.id + '"' + ((['quan_ly','truong_phong'].includes(currentUser.role)) && u.id === currentUser.id ? ' selected' : '') + '>' + u.full_name + ' (' + (ROLE_LABELS[u.role] || u.role) + ')' + '</option>').join('');
    }

    container.innerHTML = `
        <style>
            .crm-stat-cards { display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap; }
            .crm-stat-card { flex:1; min-width:130px; padding:14px 16px; border-radius:12px; cursor:pointer; transition:all .25s; border:2px solid transparent; position:relative; overflow:hidden; }
            .crm-stat-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,.2); }
            .crm-stat-card.active { border:3px solid #fff; box-shadow:0 0 0 3px var(--navy), 0 8px 30px rgba(18,37,70,.4); transform:translateY(-4px) scale(1.03); z-index:2; }
            .crm-stat-cards.has-active .crm-stat-card:not(.active) { opacity:.55; transform:scale(.97); }
            .crm-stat-card .stat-icon { font-size:24px; margin-bottom:6px; }
            .crm-stat-card .stat-count { font-size:28px; font-weight:900; line-height:1; }
            .crm-stat-card .stat-label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.5px; margin-top:4px; opacity:.8; }
            .crm-stat-card::after { content:''; position:absolute; right:-10px; bottom:-10px; width:60px; height:60px; border-radius:50%; background:rgba(255,255,255,.15); }
            .crm-date-filter { display:none; padding:10px 16px; background:linear-gradient(135deg,#1e293b,#334155); border-radius:10px; margin-bottom:12px; align-items:center; gap:12px; flex-wrap:wrap; animation:crmSlideIn .25s ease; }
            .crm-date-filter.visible { display:flex; }
            .crm-date-filter label { color:#94a3b8; font-size:12px; font-weight:600; margin:0; }
            .crm-date-filter select { background:#0f172a; color:white; border:1px solid #475569; border-radius:6px; padding:5px 10px; font-size:13px; font-weight:600; cursor:pointer; }
            .crm-date-filter select:focus { border-color:#3b82f6; outline:none; }
            .crm-date-filter .df-label { color:#f59e0b; font-size:13px; font-weight:700; }
            @keyframes crmSlideIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
            .crm-section-header td { background:linear-gradient(135deg,#1e293b,#334155); color:white; font-weight:700; font-size:13px; padding:10px 16px !important; border:none; letter-spacing:.5px; }
            .crm-section-header td .section-icon { margin-right:8px; }
            .crm-section-header td .section-count { float:right; background:rgba(255,255,255,.15); padding:2px 10px; border-radius:12px; font-size:11px; }
            .crm-pagination { display:flex; align-items:center; justify-content:center; gap:6px; padding:12px 0; flex-wrap:wrap; }
            .crm-pagination button { min-width:36px; height:36px; border:1px solid #334155; background:#1e293b; color:#94a3b8; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; display:flex; align-items:center; justify-content:center; }
            .crm-pagination button:hover { background:#334155; color:white; }
            .crm-pagination button.active { background:linear-gradient(135deg,#3b82f6,#2563eb); color:white; border-color:#3b82f6; box-shadow:0 2px 8px rgba(59,130,246,.4); }
            .crm-pagination button:disabled { opacity:.4; cursor:not-allowed; }
            .crm-pagination .pg-info { color:#94a3b8; font-size:12px; font-weight:600; margin:0 8px; }
        </style>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <div></div>
            <a href="/quytacnuttuvancrmnhucau" onclick="event.preventDefault();navigate('quytacnuttuvancrmnhucau')"
                style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:10px;
                border:2px solid #f97316;color:#f97316;font-size:13px;font-weight:800;cursor:pointer;
                background:rgba(249,115,22,.08);text-decoration:none;transition:all .2s;"
                onmouseover="this.style.background='rgba(249,115,22,.18)';this.style.transform='translateY(-2px)'"
                onmouseout="this.style.background='rgba(249,115,22,.08)';this.style.transform=''">
                ⚙️ Quy Tắc Nút Tư Vấn
            </a>
        </div>
        <div class="crm-stat-cards" id="crmStatCards">
            <div class="crm-stat-card" data-cat="phai_xu_ly" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:white;" onclick="_crmFilterByCat('phai_xu_ly')">
                <div class="stat-icon">🔥</div>
                <div class="stat-count" id="crmStatPhaiXuLy">0</div>
                <div class="stat-label">Phải xử lý hôm nay</div>
            </div>
            <div class="crm-stat-card" data-cat="da_xu_ly" style="background:linear-gradient(135deg,#10b981,#059669);color:white;" onclick="_crmFilterByCat('da_xu_ly')">
                <div class="stat-icon">✅</div>
                <div class="stat-count" id="crmStatDaXuLy">0</div>
                <div class="stat-label">Đã xử lý hôm nay</div>
            </div>
            <div class="crm-stat-card" data-cat="xu_ly_tre" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;" onclick="_crmFilterByCat('xu_ly_tre')">
                <div class="stat-icon">⚠️</div>
                <div class="stat-count" id="crmStatXuLyTre">0</div>
                <div class="stat-label">Khách xử lý trễ</div>
            </div>
            <div class="crm-stat-card" data-cat="cho_xu_ly" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;" onclick="_crmFilterByCat('cho_xu_ly')">
                <div class="stat-icon">⏳</div>
                <div class="stat-count" id="crmStatChoXuLy">0</div>
                <div class="stat-label">Chờ xử lý</div>
            </div>
            <div class="crm-stat-card" data-cat="huy_khach" style="background:linear-gradient(135deg,#6b7280,#4b5563);color:white;" onclick="_crmFilterByCat('huy_khach')">
                <div class="stat-icon">🚫</div>
                <div class="stat-count" id="crmStatHuyKhach">0</div>
                <div class="stat-label">Hủy khách</div>
            </div>
        </div>
        <div class="crm-date-filter" id="crmDateFilter">
            <span class="df-label" id="crmDateFilterLabel">📅 Lọc theo:</span>
            <label>Ngày</label>
            <select id="crmDateDay" onchange="_crmUpdateDateFilterCounts();_crmRenderFilteredTable()">
                <option value="">Tất Cả</option>
                ${(() => { let o = ''; for (let d = 1; d <= 31; d++) o += '<option value="' + d + '">Ngày ' + d + '</option>'; return o; })()}
            </select>
            <label>Tháng</label>
            <select id="crmDateMonth" onchange="_crmUpdateDateFilterCounts();_crmRenderFilteredTable()">
                <option value="" selected>Tất Cả</option>
                ${(() => { let o = ''; for (let m = 1; m <= 12; m++) o += '<option value="' + m + '">Tháng ' + m + '</option>'; return o; })()}
            </select>
            <label>Năm</label>
            <select id="crmDateYear" onchange="_crmUpdateDateFilterCounts();_crmRenderFilteredTable()">
                ${(() => { const now = new Date(); let o = ''; for (let y = 2024; y <= now.getFullYear()+1; y++) o += '<option value="' + y + '"' + (y === now.getFullYear() ? ' selected' : '') + '>' + y + '</option>'; return o; })()}
            </select>
            <span id="crmDateFilterCount" style="color:#94a3b8;font-size:12px;margin-left:auto;"></span>
        </div>

        <div style="display:flex; gap:12px; margin-bottom:12px; flex-wrap:wrap; align-items:center;">
            <select id="crmFilterConsultType" class="form-control" style="width:auto;min-width:200px;" onchange="_crmRenderFilteredTable()">
                <option value="">Tất cả trạng thái</option>
            </select>
            <input type="text" id="crmSearch" class="form-control" placeholder="🔍 Tìm tên hoặc SĐT..." style="width:auto;min-width:200px;">
            ${['giam_doc','quan_ly','truong_phong'].includes(currentUser.role) ? '<select id="crmTopStaffFilter" class="form-control" style="width:auto;min-width:180px;"><option value="">👤 Tất cả NV</option>' + topStaffOptions + '</select>' : ''}
        </div>
        <div class="card">
            <div class="card-body" style="overflow-x:auto; padding:8px;">
                <table class="table crm-nhucau-table" id="crmNhuCauTable">
                    <thead><tr>
                        <th style="min-width:30px;text-align:center;padding:4px 2px" title="Pin khách">📌</th>
                        <th style="min-width:45px;text-align:center">STT</th>
                        <th style="min-width:100px">NV Phụ Trách</th>
                        <th style="min-width:80px">Mã Đơn</th>
                        <th style="min-width:120px">Nút Tư Vấn</th>
                        <th style="min-width:160px">Nội Dung TV</th>
                        <th style="min-width:70px;text-align:center">Lần Chăm</th>
                        <th style="min-width:140px">Ngày Hẹn</th>
                        <th style="min-width:80px">Mã KH</th>
                        <th style="min-width:150px">Tên KH</th>
                        <th style="min-width:110px">SĐT</th>
                        <th style="min-width:110px">Link FB</th>
                        <th style="min-width:130px">Địa Chỉ</th>
                        <th style="min-width:100px">Nguồn</th>
                        <th style="min-width:120px">Người GT</th>
                        <th style="min-width:110px">CRM Người GT</th>
                        <th style="min-width:100px">Chức Danh</th>
                        <th style="min-width:70px;text-align:center">Lần Đặt</th>
                        <th style="min-width:110px;text-align:right">Doanh Số</th>
                    </tr></thead>
                    <tbody id="crmNhuCauTbody"><tr><td colspan="18" style="text-align:center;padding:40px;">⏳ Đang tải...</td></tr></tbody>
                </table>
                <div id="crmPagination" class="crm-pagination"></div>
            </div>
        </div>
    `;

    document.getElementById('crmFilterConsultType').addEventListener('change', () => _crmRenderFilteredTable());
    const topStaffEl = document.getElementById('crmTopStaffFilter');
    if (topStaffEl) topStaffEl.addEventListener('change', () => loadCrmNhuCauData());
    let st;
    document.getElementById('crmSearch').addEventListener('input', () => { clearTimeout(st); st = setTimeout(loadCrmNhuCauData, 400); });

    await loadCrmNhuCauData();

    // Auto-select 'Phải xử lý hôm nay' on page load
    _crmActiveCat = null;
    _crmFilterByCat('phai_xu_ly');
}

var _crmActiveCat = null; // null = all, or 'phai_xu_ly'|'moi_chuyen'|'da_xu_ly'|'cho_xu_ly'|'huy_khach'
var _crmAllCustomers = []; // full list for re-filtering
var _crmAllStats = {}; // consult stats
var _crmCurrentPage = 1;
var _crmPageSize = 50;

function _crmFilterByCat(cat) {
    if (_crmActiveCat === cat) { _crmActiveCat = null; } else { _crmActiveCat = cat; }
    _crmCurrentPage = 1; // reset page on category change
    document.querySelectorAll('.crm-stat-card').forEach(c => c.classList.remove('active'));
    const cardsContainer = document.getElementById('crmStatCards');
    if (_crmActiveCat) {
        const el = document.querySelector('.crm-stat-card[data-cat="' + _crmActiveCat + '"]');
        if (el) el.classList.add('active');
        if (cardsContainer) cardsContainer.classList.add('has-active');
    } else {
        if (cardsContainer) cardsContainer.classList.remove('has-active');
    }
    // Show/hide date filter for cho_xu_ly and huy_khach
    const dateFilter = document.getElementById('crmDateFilter');
    const dateLabel = document.getElementById('crmDateFilterLabel');
    // Reset date filter to defaults (Tất Cả) when switching cards
    const ms = document.getElementById('crmDateMonth');
    const ys = document.getElementById('crmDateYear');
    const ds = document.getElementById('crmDateDay');
    if (ms) { ms.value = ''; }
    if (ys) { ys.value = new Date().getFullYear(); }
    if (ds) { ds.value = ''; }
    if (dateFilter) {
        if (_crmActiveCat === 'cho_xu_ly') {
            dateFilter.classList.add('visible');
            if (dateLabel) dateLabel.textContent = '📅 Lọc theo ngày hẹn:';
            _crmUpdateDateFilterCounts();
        } else if (_crmActiveCat === 'huy_khach') {
            dateFilter.classList.add('visible');
            if (dateLabel) dateLabel.textContent = '📅 Lọc theo ngày hủy:';
            _crmUpdateDateFilterCounts();
        } else if (_crmActiveCat === 'xu_ly_tre') {
            dateFilter.classList.add('visible');
            if (dateLabel) dateLabel.textContent = '📅 Lọc theo ngày hẹn trễ:';
            _crmUpdateDateFilterCounts();
        } else {
            dateFilter.classList.remove('visible');
        }
    }
    _crmUpdateConsultTypeDropdown();
    _crmRenderFilteredTable();
}

function _crmUpdateDateFilterCounts() {
    const cat = _crmActiveCat;
    if (cat !== 'cho_xu_ly' && cat !== 'huy_khach' && cat !== 'xu_ly_tre') return;
    const catCustomers = _crmAllCustomers.filter(c => _crmGetCategory(c, _crmAllStats) === cat);

    function getDateField(c) {
        if (cat === 'cho_xu_ly' || cat === 'xu_ly_tre') return c.appointment_date;
        return c.cancel_approved_at || c.created_at;
    }

    const monthYearCounts = {};
    const yearCounts = {};
    catCustomers.forEach(c => {
        const df = getDateField(c);
        if (!df) return;
        const d = new Date(df);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        monthYearCounts[m + '_' + y] = (monthYearCounts[m + '_' + y] || 0) + 1;
        yearCounts[y] = (yearCounts[y] || 0) + 1;
    });

    const monthSel = document.getElementById('crmDateMonth');
    const yearSel = document.getElementById('crmDateYear');
    if (!monthSel || !yearSel) return;
    const selYear = yearSel.value ? parseInt(yearSel.value) : new Date().getFullYear();

    // Calculate total for 'Tất Cả' options
    const totalCat = catCustomers.length;
    let totalInYear = 0;

    for (const opt of monthSel.options) {
        if (!opt.value) { opt.textContent = 'Tất Cả' + (totalCat > 0 ? ' (' + totalCat + ')' : ''); continue; }
        const m = parseInt(opt.value);
        const cnt = monthYearCounts[m + '_' + selYear] || 0;
        opt.textContent = 'Tháng ' + m + (cnt > 0 ? ' (' + cnt + ')' : '');
        totalInYear += cnt;
    }
    for (const opt of yearSel.options) {
        if (!opt.value) { opt.textContent = 'Tất Cả'; continue; }
        const y = parseInt(opt.value);
        const cnt = yearCounts[y] || 0;
        opt.textContent = y + (cnt > 0 ? ' (' + cnt + ')' : '');
    }
}


function _crmGetCategory(c, stats) {
    // Priority 0.5: Chờ Duyệt Hủy (NV đã ấn hủy, chờ sếp)
    if (c.cancel_requested === 1 && c.cancel_approved === 0) return 'da_xu_ly';

    // Priority 1: Hủy khách (sếp đã duyệt)
    if (c.cancel_approved === 1) return 'huy_khach';

    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
    const s = stats[c.id] || {};

    // Check if consulted today
    let consultedToday = false;
    if (s.lastLog && s.lastLog.created_at) {
        const logDate = new Date(s.lastLog.created_at);
        const logStr = logDate.getFullYear() + '-' + String(logDate.getMonth()+1).padStart(2,'0') + '-' + String(logDate.getDate()).padStart(2,'0');
        consultedToday = (logStr === todayStr);
    }

    // Priority 2: Đã xử lý hôm nay
    if (consultedToday) return 'da_xu_ly';

    // Check appointment date
    let appointIsToday = false;
    let appointIsFuture = false;
    if (c.appointment_date) {
        const apptDate = new Date(c.appointment_date);
        const apptStr = apptDate.getFullYear() + '-' + String(apptDate.getMonth()+1).padStart(2,'0') + '-' + String(apptDate.getDate()).padStart(2,'0');
        appointIsToday = (apptStr === todayStr);
        appointIsFuture = (apptStr > todayStr);
    }

    // Check if today is customer's birthday
    const isBirthdayToday = _crmIsBirthdayToday(c.birthday);

    // Check created today
    let createdToday = false;
    if (c.created_at) {
        const cDate = new Date(c.created_at);
        const cStr = cDate.getFullYear() + '-' + String(cDate.getMonth()+1).padStart(2,'0') + '-' + String(cDate.getDate()).padStart(2,'0');
        createdToday = (cStr === todayStr);
    }

    // Priority 3: Mới chuyển hôm nay (trước Phải xử lý)
    if (createdToday) return 'moi_chuyen';

    // Priority 4: Phải xử lý hôm nay (appointment today OR birthday today)
    if (appointIsToday || isBirthdayToday) return 'phai_xu_ly';

    // Priority 5: Khách xử lý trễ (appointment was in the past, not consulted today)
    if (c.appointment_date && !appointIsToday && !appointIsFuture) return 'xu_ly_tre';

    // Priority 6: Chờ xử lý (future appointment or remaining)
    if (appointIsFuture) return 'cho_xu_ly';

    // Default: chờ xử lý
    return 'cho_xu_ly';
}

function _crmUpdateConsultTypeDropdown(filteredList) {
    const sel = document.getElementById('crmFilterConsultType');
    if (!sel) return;
    const prevVal = sel.value;

    // Use provided filtered list or default to category-filtered
    let custs = filteredList;
    if (!custs) {
        custs = _crmAllCustomers;
        if (_crmActiveCat) {
            custs = _crmAllCustomers.filter(c => _crmGetCategory(c, _crmAllStats) === _crmActiveCat);
        }
    }

    // Count consult types from last log
    const typeCounts = {};
    let noLogCount = 0;
    custs.forEach(c => {
        const s = _crmAllStats[c.id] || {};
        if (s.lastLog && s.lastLog.log_type) {
            const lt = s.lastLog.log_type;
            typeCounts[lt] = (typeCounts[lt] || 0) + 1;
        } else {
            noLogCount++;
        }
    });

    // Build options
    let html = '<option value="">Tất cả trạng thái (' + custs.length + ')</option>';
    // Sort by count desc
    const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([key, count]) => {
        const t = CONSULT_TYPES[key];
        if (t) {
            html += '<option value="' + key + '">' + t.icon + ' ' + t.label + ' (' + count + ')</option>';
        }
    });
    if (noLogCount > 0) {
        html += '<option value="__none__">📋 Chưa tư vấn (' + noLogCount + ')</option>';
    }
    sel.innerHTML = html;

    // Restore previous selection if still exists
    if (prevVal) {
        const exists = [...sel.options].some(o => o.value === prevVal);
        if (exists) sel.value = prevVal;
    }
}
function _crmRenderFilteredTable() {
    const customers = _crmAllCustomers;
    const stats = _crmAllStats;
    const tbody = document.getElementById('crmNhuCauTbody');
    
    let filtered = customers;
    if (_crmActiveCat) {
        if (_crmActiveCat === 'phai_xu_ly') {
            // Include both phai_xu_ly and moi_chuyen
            filtered = customers.filter(c => {
                const cat = _crmGetCategory(c, stats);
                return cat === 'phai_xu_ly' || cat === 'moi_chuyen';
            });
        } else {
            filtered = customers.filter(c => _crmGetCategory(c, stats) === _crmActiveCat);
        }
    }

    // Apply date filter for cho_xu_ly and huy_khach (BEFORE consult type filter)
    const isDateCat = (_crmActiveCat === 'cho_xu_ly' || _crmActiveCat === 'huy_khach' || _crmActiveCat === 'xu_ly_tre');
    if (isDateCat) {
        const selDay = document.getElementById('crmDateDay')?.value;
        const selMonth = document.getElementById('crmDateMonth')?.value;
        const selYear = document.getElementById('crmDateYear')?.value;
        const hasMonth = selMonth && parseInt(selMonth);
        const hasYear = selYear && parseInt(selYear);
        const hasDay = selDay && parseInt(selDay);
        if (hasYear || hasMonth || hasDay) {
            filtered = filtered.filter(c => {
                let dateField;
                if (_crmActiveCat === 'cho_xu_ly' || _crmActiveCat === 'xu_ly_tre') {
                    dateField = c.appointment_date;
                } else {
                    dateField = c.cancel_approved_at || c.created_at;
                }
                if (!dateField) return false;
                const d = new Date(dateField);
                if (hasYear && d.getFullYear() !== parseInt(selYear)) return false;
                if (hasMonth && d.getMonth() + 1 !== parseInt(selMonth)) return false;
                if (hasDay && d.getDate() !== parseInt(selDay)) return false;
                return true;
            });
        }
    }

    // Update consult type dropdown AFTER date filter
    _crmUpdateConsultTypeDropdown(filtered);

    // Card counts always show TOTAL (not date-filtered)

    // Apply consult type filter
    const consultTypeVal = document.getElementById('crmFilterConsultType')?.value;
    if (consultTypeVal) {
        if (consultTypeVal === '__none__') {
            filtered = filtered.filter(c => {
                const s = stats[c.id] || {};
                return !s.lastLog || !s.lastLog.log_type;
            });
        } else {
            filtered = filtered.filter(c => {
                const s = stats[c.id] || {};
                return s.lastLog && s.lastLog.log_type === consultTypeVal;
            });
        }
    }



    // Sort: pinned first, then by appointment_date ASC
    filtered = [...filtered].sort((a, b) => {
        // Pinned customers always first
        const pinA = a.is_pinned ? 1 : 0;
        const pinB = b.is_pinned ? 1 : 0;
        if (pinA !== pinB) return pinB - pinA;
        // Both pinned: most recent pin first
        if (pinA && pinB) return new Date(b.pinned_at || 0) - new Date(a.pinned_at || 0);
        if (_crmActiveCat === 'huy_khach') {
            const dateA = a.cancel_approved_at || a.created_at;
            const dateB = b.cancel_approved_at || b.created_at;
            return new Date(dateB || 0) - new Date(dateA || 0);
        }
        // All other categories: nearest appointment_date first
        const dateA = a.appointment_date;
        const dateB = b.appointment_date;
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return new Date(dateA) - new Date(dateB);
    });

    // Update count display
    const countEl = document.getElementById('crmDateFilterCount');
    if (countEl && isDateCat) {
        countEl.textContent = 'Kết quả: ' + filtered.length;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="19"><div class="empty-state"><div class="icon">📭</div><h3>Không có khách hàng</h3></div></td></tr>`;
        document.getElementById('crmPagination').innerHTML = '';
        return;
    }

    // Pagination
    const totalPages = Math.ceil(filtered.length / _crmPageSize);
    if (_crmCurrentPage > totalPages) _crmCurrentPage = totalPages;
    const startIdx = (_crmCurrentPage - 1) * _crmPageSize;
    const paged = filtered.slice(startIdx, startIdx + _crmPageSize);

    // Split table into two sections for phai_xu_ly
    if (_crmActiveCat === 'phai_xu_ly') {
        const moiChuyenRows = paged.filter(c => _crmGetCategory(c, stats) === 'moi_chuyen');
        const phaiXuLyRows = paged.filter(c => _crmGetCategory(c, stats) === 'phai_xu_ly');
        let html = '';
        let stt = startIdx + 1;
        if (moiChuyenRows.length > 0) {
            html += `<tr class="crm-section-header"><td colspan="19"><span class="section-icon">📥</span>Mới chuyển hôm nay<span class="section-count">${moiChuyenRows.length}</span></td></tr>`;
            html += moiChuyenRows.map(c => _crmRenderCustomerRow(c, stats, stt++)).join('');
        }
        if (phaiXuLyRows.length > 0) {
            html += `<tr class="crm-section-header"><td colspan="19"><span class="section-icon">🔥</span>Phải xử lý hôm nay<span class="section-count">${phaiXuLyRows.length}</span></td></tr>`;
            html += phaiXuLyRows.map(c => _crmRenderCustomerRow(c, stats, stt++)).join('');
        }
        tbody.innerHTML = html;
    } else {
        tbody.innerHTML = paged.map((c, idx) => _crmRenderCustomerRow(c, stats, startIdx + idx + 1)).join('');
    }

    // Render pagination
    const pgEl = document.getElementById('crmPagination');
    if (totalPages <= 1) { pgEl.innerHTML = ''; return; }
    let pgHtml = '<button ' + (_crmCurrentPage <= 1 ? 'disabled' : '') + ' onclick="_crmGoToPage(' + (_crmCurrentPage - 1) + ')">◀</button>';
    for (let p = 1; p <= totalPages; p++) {
        pgHtml += '<button class="' + (p === _crmCurrentPage ? 'active' : '') + '" onclick="_crmGoToPage(' + p + ')">' + p + '</button>';
    }
    pgHtml += '<button ' + (_crmCurrentPage >= totalPages ? 'disabled' : '') + ' onclick="_crmGoToPage(' + (_crmCurrentPage + 1) + ')">▶</button>';
    pgHtml += '<span class="pg-info">' + (startIdx+1) + '–' + Math.min(startIdx + _crmPageSize, filtered.length) + ' / ' + filtered.length + '</span>';
    pgEl.innerHTML = pgHtml;
}

function _crmGoToPage(page) {
    _crmCurrentPage = page;
    _crmRenderFilteredTable();
    // Scroll to table top
    document.getElementById('crmNhuCauTable')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// _crmDateShowAll removed - filtering now uses dropdown values directly

function _crmRenderCustomerRow(c, stats, stt) {
    const s = stats[c.id] || { consultCount: 0, chotDonCount: 0, lastLog: null, revenue: 0 };
    const OVERRIDE_STATUSES = ['tu_van_lai', 'cho_duyet_huy', 'duyet_huy'];
    let lastType = s.lastLog ? CONSULT_TYPES[s.lastLog.log_type] : null;
    // Override: special cancel statuses always show their own label
    if (OVERRIDE_STATUSES.includes(c.order_status) && CONSULT_TYPES[c.order_status]) {
        lastType = CONSULT_TYPES[c.order_status];
    }
    let lastContent = s.lastLog?.content || '';
    if (lastContent && lastType) {
        lastContent = lastContent.replace(/^(?:✅|🏥|📦|💵|📝|📢|🚨|🚫|❌|🔧|🎨|👔|📄|🤝|💬|📞|✔️)?\s*(?:Tư vấn Sếp|Cấp cứu hoàn thành|Chốt đơn|Đặt cọc|Sau bán hàng|Hoàn Thành Cấp Cứu|Cấp Cứu Sếp)[:\s]+/i, '').trim();
    }
    const shortContent = lastContent.length > 30 ? lastContent.substring(0, 30) + '...' : lastContent;

    let appointDisplay = '';
    if (c.appointment_date) {
        const d = new Date(c.appointment_date);
        const days = ['CN','T2','T3','T4','T5','T6','T7'];
        const dayName = days[d.getDay()];
        appointDisplay = `<span style="color:#e65100;font-weight:600">${dayName} - ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}</span>`;
    }

    const _pinClass = c.is_pinned ? ' crm-row-pinned' : '';
    return `<tr class="${_pinClass}">
        <td style="text-align:center;padding:4px 2px;">
            ${!c.readonly ? `<span class="crm-pin-btn ${c.is_pinned ? 'active' : ''}" onclick="event.stopPropagation();_crmTogglePin(${c.id})" title="${c.is_pinned ? 'Bỏ pin' : 'Pin khách'}">${c.is_pinned ? '📌' : '<span style="opacity:0.3">📌</span>'}</span>` : ''}
        </td>
        <td style="text-align:center;font-weight:700;color:#64748b;font-size:12px;">${stt || ''}</td>
        <td style="font-size:12px;font-weight:600;">${c.assigned_to_name || '<span style="color:var(--gray-500)">—</span>'}</td>
        <td style="font-size:11px;font-weight:700;color:#e65100;cursor:pointer;" onclick="openOrderCodesPopup(${c.id})">${s.latestOrderCode || '—'}</td>
        <td>
            ${c.readonly ? (
                (c.cancel_requested === 1 && c.cancel_approved === 0) ? `
                <span style="font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;background:var(--gray-700);color:var(--gray-400);opacity:0.6;cursor:not-allowed;">
                    ⏳ Chờ Duyệt Hủy
                </span>
            ` : (c.cancel_approved === -2) ? `
                <span style="font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;background:#dc2626;color:white;opacity:0.6;cursor:not-allowed;">
                    ❌ Hủy Khách (nhắc lại)
                </span>
            ` : (c.cancel_approved === -1) ? `
                <span style="font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;background:${lastType?.color || '#f59e0b'};color:${lastType?.textColor || 'white'};opacity:0.6;cursor:not-allowed;">
                    ${lastType ? lastType.icon + ' ' + lastType.label : '🔄 Tư Vấn Lại'}
                </span>
            ` : `
                <span style="font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;background:${lastType?.color || 'var(--gray-600)'};color:${lastType?.textColor || 'white'};opacity:0.6;cursor:not-allowed;">
                    ${lastType ? lastType.icon + ' ' + lastType.label : '📋 Tư Vấn'}
                </span>
            `) : (c.cancel_requested === 1 && c.cancel_approved === 0) ? `
                <button class="btn btn-sm" disabled style="font-size:11px;padding:4px 8px;background:var(--gray-700);color:var(--gray-400);cursor:not-allowed;">
                    ⏳ Chờ Duyệt Hủy
                </button>
            ` : (c.cancel_approved === -2) ? `
                <button class="btn btn-sm consult-btn" onclick="openConsultModal(${c.id})" 
                    style="font-size:11px;padding:4px 8px;background:#dc2626;color:white;animation:emBlink 2s infinite;">
                    ❌ Hủy Khách
                </button>
            ` : (c.cancel_approved === -1) ? `
                <button class="btn btn-sm consult-btn" onclick="openConsultModal(${c.id})" 
                    style="font-size:11px;padding:4px 8px;background:${lastType?.color || '#f59e0b'};color:${lastType?.textColor || 'white'};animation:emBlink 2s infinite;">
                    ${lastType ? lastType.icon + ' ' + lastType.label : '🔄 Tư Vấn Lại'}
                </button>
            ` : `
                <button class="btn btn-sm consult-btn" onclick="openConsultModal(${c.id})" 
                    style="font-size:11px;padding:4px 8px;background:${lastType?.color || 'var(--gray-600)'};color:${lastType?.textColor || 'white'};">
                    ${lastType ? lastType.icon + ' ' + lastType.label : '📋 Tư Vấn'}
                </button>
            `}
        </td>
        <td style="font-size:12px;color:#e65100;font-weight:600;cursor:pointer;" onclick="openCustomerDetail(${c.id}).then(()=>setTimeout(()=>switchCDTab('history'),100))" title="${lastContent}">
            ${shortContent || '<span style="color:var(--gray-500)">—</span>'}
        </td>
        <td style="text-align:center;font-weight:700;color:#122546;font-size:14px;">${s.consultCount}</td>
        <td style="font-size:12px;">
            ${appointDisplay || '<span style="color:var(--gray-500)">—</span>'}
        </td>
        <td><strong style="color:#e65100">${getCustomerCode(c)}</strong></td>
        <td>
            ${!c.readonly ? '<button class="btn btn-sm" onclick="event.stopPropagation();openCustomerInfo(' + c.id + ')" style="font-size:9px;padding:1px 5px;margin-right:4px;background:var(--gray-700);color:var(--gold);" title="Cập nhật thông tin">✏️</button>' : ''}
            ${(() => {
                const _colors = [
                    {bg:'rgba(239,68,68,0.12)',text:'#dc2626',border:'rgba(239,68,68,0.25)'},
                    {bg:'rgba(249,115,22,0.12)',text:'#ea580c',border:'rgba(249,115,22,0.25)'},
                    {bg:'rgba(234,179,8,0.12)',text:'#ca8a04',border:'rgba(234,179,8,0.25)'},
                    {bg:'rgba(34,197,94,0.12)',text:'#16a34a',border:'rgba(34,197,94,0.25)'},
                    {bg:'rgba(20,184,166,0.12)',text:'#0d9488',border:'rgba(20,184,166,0.25)'},
                    {bg:'rgba(6,182,212,0.12)',text:'#0891b2',border:'rgba(6,182,212,0.25)'},
                    {bg:'rgba(59,130,246,0.12)',text:'#2563eb',border:'rgba(59,130,246,0.25)'},
                    {bg:'rgba(139,92,246,0.12)',text:'#7c3aed',border:'rgba(139,92,246,0.25)'},
                    {bg:'rgba(236,72,153,0.12)',text:'#db2777',border:'rgba(236,72,153,0.25)'},
                    {bg:'rgba(244,63,94,0.12)',text:'#e11d48',border:'rgba(244,63,94,0.25)'},
                ];
                const _ci = (c.id || 0) % _colors.length;
                const _cc = _colors[_ci];
                const _bdayIcon = _crmIsBirthdayToday(c.birthday) ? '🎂🎉 ' : '';
                return `<span onclick="openCustomerDetail(${c.id})" style="cursor:pointer;display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;background:${_cc.bg};color:${_cc.text};border:1px solid ${_cc.border};transition:all 0.2s;white-space:nowrap;" onmouseover="this.style.boxShadow='0 2px 8px ${_cc.border}'" onmouseout="this.style.boxShadow='none'">${_bdayIcon}${c.customer_name}</span>`;
            })()}
        </td>
        <td>${c.readonly ? '<span style="color:var(--gray-400)">' + c.phone + '</span>' : '<a href="tel:' + c.phone + '" style="color:var(--info)">' + c.phone + '</a>'}</td>
        <td style="font-size:11px;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.facebook_link ? '<a href="' + c.facebook_link + '" target="_blank" style="color:#1877F2;font-weight:600;" title="' + c.facebook_link + '">🔗 FB</a>' : '<span style="color:var(--gray-600)">—</span>'}</td>
        <td style="font-size:12px">${c.address || '<span style="color:var(--gray-600)">—</span>'}</td>
        <td style="font-size:12px">${c.source_name || '—'}</td>
        <td style="font-size:12px;${currentUser.role === 'giam_doc' ? 'cursor:pointer;' : ''}" onclick="${currentUser.role === 'giam_doc' && !c.referrer_id ? 'openReferrerSearch(' + c.id + ')' : ''}">
            ${c.referrer_id ? `<span style="cursor:pointer;text-decoration:underline;color:var(--info);font-weight:600;" onclick="event.stopPropagation();openAffiliateDetail(${c.referrer_id})">${c.referrer_name || c.referrer_customer_name}</span>` : (currentUser.role === 'giam_doc' ? '<span style="color:var(--gray-500)" title="Click để tìm">🔍 Tìm</span>' : '<span style="color:var(--gray-500)">—</span>')}
        </td>
        <td style="font-size:11px">${(c.referrer_user_crm_type || c.referrer_crm_type) ? (CRM_LABELS[c.referrer_user_crm_type || c.referrer_crm_type] || c.referrer_user_crm_type || c.referrer_crm_type) : '—'}</td>
        <td style="font-size:12px;font-weight:600;color:#122546;">${c.job || '<span style="color:var(--gray-600)">—</span>'}</td>
        <td style="text-align:center;font-weight:700;color:#122546;font-size:14px;">${s.chotDonCount}</td>
        <td style="text-align:right;font-weight:700;color:var(--success);font-size:14px;">${s.revenue > 0 ? formatCurrency(s.revenue) : '0'}</td>
    </tr>`;
}

async function loadCrmNhuCauData() {
    // Sync dynamic consult types from API (adds any new types created in settings)
    await _crmSyncConsultTypes();

    let url = '/api/customers?crm_type=nhu_cau';
    const search = document.getElementById('crmSearch')?.value;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    const topStaff = document.getElementById('crmTopStaffFilter')?.value;
    if (topStaff) url += `&employee_id=${topStaff}`;

    const data = await apiCall(url);
    const tbody = document.getElementById('crmNhuCauTbody');

    // Include ALL customers (including cancelled) for categorization
    const customers = data.customers || [];

    // Affiliate: readonly + mask phone for child referrals
    if (currentUser.role === 'tkaffiliate') {
        customers.forEach(c => {
            c.readonly = true;
            if (c.referrer_id && c.referrer_id !== currentUser.id && c.phone && c.phone.length >= 4) {
                c.phone = c.phone.substring(0, 2) + 'xx xxx xx' + c.phone.substring(c.phone.length - 1);
            }
        });
    }

    // Fetch consultation stats in batch
    const ids = customers.map(c => c.id).join(',');
    let stats = {};
    if (ids) {
        const statsData = await apiCall(`/api/customers/consult-stats?customer_ids=${ids}`);
        stats = statsData.stats || {};
    }

    // Store for re-filtering
    _crmAllCustomers = customers;
    _crmAllStats = stats;

    // Count categories
    const counts = { phai_xu_ly: 0, moi_chuyen: 0, da_xu_ly: 0, xu_ly_tre: 0, cho_xu_ly: 0, huy_khach: 0 };
    customers.forEach(c => { const cat = _crmGetCategory(c, stats); counts[cat]++; });

    // Update stat cards - show TOTAL counts (not monthly filtered)
    const el = (id) => document.getElementById(id);
    if (el('crmStatPhaiXuLy')) el('crmStatPhaiXuLy').textContent = counts.phai_xu_ly + counts.moi_chuyen;
    if (el('crmStatDaXuLy')) el('crmStatDaXuLy').textContent = counts.da_xu_ly;
    if (el('crmStatXuLyTre')) el('crmStatXuLyTre').textContent = counts.xu_ly_tre;
    if (el('crmStatChoXuLy')) el('crmStatChoXuLy').textContent = counts.cho_xu_ly;
    if (el('crmStatHuyKhach')) el('crmStatHuyKhach').textContent = counts.huy_khach;

    // Re-highlight active card
    document.querySelectorAll('.crm-stat-card').forEach(c => c.classList.remove('active'));
    if (_crmActiveCat) {
        const activeEl = document.querySelector('.crm-stat-card[data-cat="' + _crmActiveCat + '"]');
        if (activeEl) activeEl.classList.add('active');
    }

    // Update consult type dropdown
    _crmUpdateConsultTypeDropdown();

    // Render table
    // Auto-select 'Phải xử lý hôm nay' on first load
    if (!_crmActiveCat) {
        _crmFilterByCat('phai_xu_ly');
    } else {
        _crmRenderFilteredTable();
    }
}

function applyCrmNhuCauFilter() { loadCrmNhuCauData(); }

// ========== PIN KHÁCH HÀNG ==========
async function _crmTogglePin(customerId) {
    try {
        const res = await apiCall(`/api/customers/${customerId}/pin`, 'PATCH');
        if (res.success) {
            // Update local data
            const c = _crmAllCustomers.find(x => x.id === customerId);
            if (c) {
                c.is_pinned = res.is_pinned;
                c.pinned_at = res.is_pinned ? new Date().toISOString() : null;
                if (res.next_appointment) c.appointment_date = res.next_appointment;
            }
            _crmRenderFilteredTable();
            showToast(res.message, res.is_pinned ? 'success' : 'info');
        } else {
            showToast(res.error || 'Lỗi!', 'error');
        }
    } catch(e) {
        showToast('Lỗi pin khách hàng!', 'error');
    }
}

// CSS for pinned rows
(function() {
    const style = document.createElement('style');
    style.textContent = `
        .crm-row-pinned {
            background: linear-gradient(90deg, rgba(245,158,11,0.10), transparent) !important;
            border-left: 3px solid #f59e0b !important;
        }
        .crm-row-pinned:hover {
            background: linear-gradient(90deg, rgba(245,158,11,0.18), transparent) !important;
        }
        .crm-pin-btn {
            cursor: pointer;
            font-size: 15px;
            transition: all 0.2s;
            display: inline-block;
        }
        .crm-pin-btn:hover {
            transform: scale(1.3);
        }
        .crm-pin-btn.active {
            filter: drop-shadow(0 0 4px #f59e0b);
            animation: pinPulse 2s infinite;
        }
        @keyframes pinPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
        }
    `;
    document.head.appendChild(style);
})();
function resetCrmNhuCauFilter() {
    _crmActiveCat = null;
    document.querySelectorAll('.crm-stat-card').forEach(c => c.classList.remove('active'));
    document.getElementById('crmFilterConsultType').value = '';
    document.getElementById('crmSearch').value = '';
    const topStaff = document.getElementById('crmTopStaffFilter');
    if (topStaff) topStaff.value = '';
    loadCrmNhuCauData();
}

// ========== CONSULTATION MODAL ==========
async function openConsultModal(customerId) {
    window._currentConsultCustomerId = customerId;
    // Check if customer has a pending emergency
    let pendingEmergency = null;
    let handlerOptions = '';
    let customerInfo = {};
    let existingItems = [];
    let consultLogs = [];
    try {
        // Load all data in parallel
        const [pendingData, hData, custData, logData] = await Promise.all([
            apiCall(`/api/emergencies/pending/${customerId}`).catch(() => ({})),
            apiCall('/api/emergencies/handlers').catch(() => ({})),
            apiCall(`/api/customers/${customerId}`).catch(() => ({})),
            apiCall(`/api/customers/${customerId}/consult-logs`).catch(() => ({}))
        ]);
        if (pendingData.hasPending) pendingEmergency = pendingData.emergency;
        const ROLE_LABELS_H = { giam_doc: 'Giám Đốc', quan_ly: 'Quản Lý', truong_phong: 'Trưởng Phòng' };
        handlerOptions = (hData.handlers || [])
            .map(u => '<option value="' + u.id + '"' + (pendingEmergency && pendingEmergency.handler_id === u.id ? ' selected' : '') + '>' + u.full_name + ' (' + (ROLE_LABELS_H[u.role] || u.role) + ')</option>')
            .join('');
        customerInfo = custData.customer || {};
        existingItems = custData.items || [];
        window._currentConsultCustomerPinned = !!customerInfo.is_pinned;
        consultLogs = logData.logs || [];
    } catch(e) {}
    const grandTotal = existingItems.reduce((s, i) => s + (i.total || 0), 0);

    // Load flow rules from API for dynamic allowed types
    let flowRules = {};
    let maxDaysPerStatus = {};
    try {
        const frData = await apiCall('/api/consult-flow-rules');
        flowRules = frData.rules || {};
        maxDaysPerStatus = frData.maxDaysPerStatus || {};
    } catch(e) {}

    // Determine allowed types based on order_status and consultation history
    const orderStatus = customerInfo.order_status || 'dang_tu_van';
    const allTypes = Object.entries(CONSULT_TYPES);

    // Helper: get allowed types from flow rules for a given status
    function _getFlowRuleTypes(status) {
        const rules = flowRules[status];
        if (!rules || rules.length === 0) return null;
        return rules
            .map(r => [r.to_type_key, CONSULT_TYPES[r.to_type_key]])
            .filter(([k, v]) => v); // only include types that exist
    }

    // Check if customer already has a sau_ban_hang consultation
    const hasSauBanHang = consultLogs.some(l => l.log_type === 'sau_ban_hang');

    let allowedTypes;
    // ★ Use last consultation log type (represents actual workflow state)
    const lastLogEntry = consultLogs.length > 0 ? consultLogs[0] : null;
    // Override: special cancel statuses always take priority over last log
    const OVERRIDE_STATUSES_MODAL = ['tu_van_lai', 'cho_duyet_huy', 'duyet_huy'];
    const effectiveStatus = OVERRIDE_STATUSES_MODAL.includes(orderStatus) ? orderStatus : (lastLogEntry ? lastLogEntry.log_type : orderStatus);
    const frTypes = _getFlowRuleTypes(effectiveStatus);

    // ★ PRIORITY 1: Dynamic flow rules from last log type (always wins if configured)
    if (frTypes) {
        allowedTypes = frTypes;
    } else if (hasSauBanHang && orderStatus === 'sau_ban_hang') {
        allowedTypes = _getFlowRuleTypes('sau_ban_hang') || allTypes.filter(([k]) => ['tuong_tac_ket_noi'].includes(k));
    } else if (orderStatus === 'tuong_tac_ket_noi') {
        allowedTypes = _getFlowRuleTypes('tuong_tac_ket_noi') || allTypes.filter(([k]) => ['gui_ct_kh_cu'].includes(k));
    } else if (orderStatus === 'gui_ct_kh_cu') {
        allowedTypes = _getFlowRuleTypes('gui_ct_kh_cu') || allTypes.filter(([k]) => ['lam_quen_tuong_tac','goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua','gui_stk_coc','giuc_coc','dat_coc'].includes(k));
    } else if (orderStatus === 'lam_quen_tuong_tac') {
        allowedTypes = _getFlowRuleTypes('lam_quen_tuong_tac') || allTypes.filter(([k]) => ['lam_quen_tuong_tac','goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke'].includes(k));
    } else if (orderStatus === 'hoan_thanh') {
        allowedTypes = _getFlowRuleTypes('hoan_thanh') || allTypes.filter(([k]) => ['sau_ban_hang'].includes(k));
    } else if (orderStatus === 'chot_don') {
        allowedTypes = _getFlowRuleTypes('chot_don') || allTypes.filter(([k]) => ['dang_san_xuat','hoan_thanh','cap_cuu_sep'].includes(k));
    } else if (orderStatus === 'dat_coc') {
        allowedTypes = _getFlowRuleTypes('dat_coc') || allTypes.filter(([k]) => ['chot_don','cap_cuu_sep','huy_coc'].includes(k));
    } else if (orderStatus === 'gui_stk_coc') {
        const fr = _getFlowRuleTypes('gui_stk_coc');
        if (fr) { allowedTypes = fr; }
        else { const order = ['giuc_coc','dat_coc','nhan_tin','cap_cuu_sep']; allowedTypes = order.map(k => [k, CONSULT_TYPES[k]]).filter(([,v]) => v); }
    } else if (orderStatus === 'huy_coc') {
        allowedTypes = _getFlowRuleTypes('huy_coc') || allTypes.filter(([k]) => ['tuong_tac_ket_noi','nhan_tin','goi_dien','gap_truc_tiep','cap_cuu_sep'].includes(k));
    } else if (orderStatus === 'duyet_huy') {
        allowedTypes = _getFlowRuleTypes('duyet_huy') || allTypes.filter(([k]) => ['nhan_tin'].includes(k));
    } else if (orderStatus === 'tu_van_lai') {
        allowedTypes = _getFlowRuleTypes('tu_van_lai') || allTypes.filter(([k]) => ['giam_gia','thiet_ke'].includes(k));
    } else if (orderStatus === 'giam_gia') {
        allowedTypes = _getFlowRuleTypes('giam_gia') || allTypes.filter(([k]) => ['goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua','gui_stk_coc','giuc_coc','dat_coc'].includes(k));
    } else {
        // Fallback: consultation phase types only
        const normalTypes = ['lam_quen_tuong_tac','goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua','gui_stk_coc','giuc_coc','dat_coc','cap_cuu_sep','huy'];
        allowedTypes = allTypes.filter(([k]) => normalTypes.includes(k));
    }

    // Pre-select next logical type
    const lastLog = consultLogs.length > 0 ? consultLogs[0] : null;

    // Override: after Hoàn Thành Cấp Cứu → show full consultation types with Giảm Giá
    if (lastLog && lastLog.log_type === 'hoan_thanh_cap_cuu') {
        allowedTypes = allTypes.filter(([k]) => ['giam_gia','lam_quen_tuong_tac','goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua','gui_stk_coc','giuc_coc','dat_coc'].includes(k));
    }

    // Override: if customer has a PENDING emergency → lock to cap_cuu_sep only
    if (pendingEmergency) {
        allowedTypes = allTypes.filter(([k]) => k === 'cap_cuu_sep');
    }

    // Override: if customer cancel was auto-reverted (24h no response) → lock to Hủy Khách only
    if (customerInfo.cancel_approved === -2) {
        allowedTypes = allTypes.filter(([k]) => k === 'huy');
    }

    // ★ Use admin-configured flow rule defaults (⭐ Mặc định from Quy Tắc Liên Kết)
    const effectiveRules = flowRules[effectiveStatus] || [];
    const defaultRule = effectiveRules.find(r => r.is_default);
    let defaultType = defaultRule ? defaultRule.to_type_key : (allowedTypes.length > 0 ? allowedTypes[0][0] : 'goi_dien');

    // ★ Store section key + max days for max_appointment_days enforcement in onConsultTypeChange
    window._currentConsultSectionKey = effectiveStatus;
    window._currentConsultMaxDays = maxDaysPerStatus[effectiveStatus] || 0;

    // Force overrides (system logic, takes priority over flow rules)
    if (pendingEmergency) defaultType = 'cap_cuu_sep';
    if (customerInfo.cancel_approved === -2) defaultType = 'huy';

    const typeOptions = allowedTypes.map(([k, v]) =>
        `<option value="${k}" ${k === defaultType ? 'selected' : ''}>${v.icon} ${v.label}</option>`
    ).join('');

    // Collapsible consultation history (grouped by month)
    const historyHTML = consultLogs.length > 0 ? `
        <div style="margin-bottom:12px;">
            <button type="button" onclick="toggleConsultHistory()" style="background:none;border:1px solid var(--gray-200);border-radius:6px;padding:5px 12px;font-size:11px;color:var(--gray-500);cursor:pointer;display:flex;align-items:center;gap:4px;width:100%;">
                📜 Xem lịch sử (${consultLogs.length}) <span id="historyArrow" style="margin-left:auto;">▼</span>
            </button>
            <div id="consultHistoryPanel" style="display:none;max-height:300px;overflow-y:auto;padding:10px;background:var(--gray-50);border-radius:0 0 8px 8px;border:1px solid var(--gray-200);border-top:none;">
                ${buildGroupedHistoryHTML(consultLogs, { compact: true })}
            </div>
        </div>
    ` : '';

    const bodyHTML = `
        ${historyHTML}
        <div class="form-group">
            <label>Loại Tư Vấn <span style="color:var(--danger)">*</span></label>
            <select id="consultType" class="form-control" onchange="onConsultTypeChange()">
                ${typeOptions}
            </select>
        </div>
        <div class="form-group" id="consultDepositGroup" style="display:none;">
            <label>Số Tiền Đặt Cọc <span style="color:var(--danger)">*</span></label>
            <input type="text" id="consultDepositAmount" class="form-control" placeholder="Nhập số tiền đặt cọc..." 
                style="font-size:14px;font-weight:600;color:#e65100;"
                oninput="formatDepositInput(this)">
        </div>
        <div class="form-group" id="consultContentGroup">
            <label>Nội Dung Tư Vấn <span style="color:var(--danger)">*</span></label>
            <textarea id="consultContent" class="form-control" rows="3" placeholder="Nhập nội dung tư vấn..."></textarea>
        </div>
        <div class="form-group" id="consultImageGroup">
            <label>Hình Ảnh <span id="consultImageReq" style="color:var(--danger)">*</span> (Ctrl+V để dán)</label>
            <div id="consultImageArea" class="image-paste-area" tabindex="0">
                <div id="consultImagePlaceholder">📋 Click vào đây rồi Ctrl+V để dán hình ảnh</div>
                <img id="consultImagePreview" style="display:none;max-width:100%;max-height:200px;border-radius:8px;">
                <input type="file" id="consultImageFile" accept="image/*" style="display:none">
                <button id="consultImageRemove" class="btn btn-sm" style="display:none;position:absolute;top:8px;right:8px;background:var(--danger);color:white;font-size:11px;padding:2px 8px;" onclick="removeConsultImage()">✕</button>
            </div>
        </div>
        <div class="form-group" id="consultNextTypeGroup" style="display:none">
            <label>Tư Vấn Tiếp Theo <span style="color:var(--danger)">*</span></label>
            <select id="consultNextType" class="form-control" onchange="updateApptLabel()">
                ${Object.entries(CONSULT_TYPES).filter(([k]) => ['goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua','dat_coc','chot_don','cap_cuu_sep','huy'].includes(k)).map(([k, v]) =>
                    `<option value="${k}" ${k === (lastLog?.next_consult_type || 'goi_dien') ? 'selected' : ''}>${v.icon} ${v.label}</option>`
                ).join('')}
            </select>
        </div>
        <div class="form-group" id="consultAppointmentGroup">
            <label>Ngày Hẹn Làm Việc <span style="color:var(--danger)">*</span></label>
            <input type="date" id="consultAppointment" class="form-control" min="${(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); })()}">
        </div>
        <div class="form-group" id="consultCancelGroup" style="display:none">
            <label>Lý Do Hủy <span style="color:var(--danger)">*</span></label>
            <textarea id="consultCancelReason" class="form-control" rows="3" placeholder="Nhập lý do hủy khách hàng..."></textarea>
            <div style="margin-top:8px;padding:10px;background:rgba(220,38,38,0.15);border-radius:6px;border:1px solid rgba(220,38,38,0.3);font-size:12px;color:#fca5a5;">
                ⚠️ Hủy khách hàng sẽ cần Quản Lý/Giám Đốc duyệt.
            </div>
        </div>
        <div class="form-group" id="consultHandlerGroup" style="display:none">
            <label>Chọn Người Xử Lý <span style="color:var(--danger)">*</span></label>
            <select id="consultHandler" class="form-control" ${pendingEmergency ? 'disabled style="opacity:0.7;cursor:not-allowed;background:var(--gray-100);"' : ''}>
                ${pendingEmergency ? '' : '<option value="">-- Chọn Sếp --</option>'}
                ${handlerOptions}
            </select>
            <div style="margin-top:8px;padding:10px;background:rgba(239,68,68,0.1);border-radius:6px;font-size:12px;color:#fca5a5;">
                🚨 Khách hàng sẽ hiện ở trang Cấp Cứu Sếp của người được chọn.
            </div>
        </div>
        ${pendingEmergency ? `
        <div style="margin:12px 0;padding:12px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);border-radius:8px;">
            <div style="font-size:13px;font-weight:700;color:#fca5a5;margin-bottom:4px;">🚨 Khách đang có cấp cứu sếp chưa giải quyết</div>
            <div style="font-size:11px;color:#94a3b8;">Ấn "GHI NHẬN" sẽ nhắc lại cho sếp xử lý. Ngày hẹn tự động đặt sang ngày mai.</div>
        </div>` : ''}
        <div id="consultOrderGroup" style="display:none">
            <div class="form-group" id="consultOrderCodeGroup" style="display:none;">
                <label>Mã Đơn <span style="color:var(--gray-500);font-size:11px;">(Tự động)</span></label>
                <input type="text" id="consultOrderCode" class="form-control" readonly style="background:var(--gray-100);font-weight:700;color:var(--navy);font-size:16px;cursor:not-allowed;border:2px solid var(--gold);">
            </div>
            <div class="form-group">
                <label>SĐT Khách Hàng</label>
                <input type="text" id="consultPhone" class="form-control" value="${customerInfo.phone || ''}" maxlength="10" pattern="[0-9]{10}" oninput="this.value=this.value.replace(/[^0-9]/g,'')" placeholder="10 chữ số">
            </div>
            <div class="form-group">
                <label>Đơn Hàng <span style="color:var(--danger)">*</span></label>
                <table class="table" style="font-size:13px;" id="consultOrderTable">
                    <thead><tr><th>Mô tả</th><th style="width:80px">SL</th><th style="width:120px">Đơn giá</th><th style="width:120px">Thành tiền</th><th style="width:50px"></th></tr></thead>
                    <tbody>
                        ${existingItems.length > 0 ? existingItems.map(it => `<tr>
                            <td><input class="form-control oi-desc" value="${it.description||''}" style="font-size:13px;padding:6px 8px;"></td>
                            <td><input type="number" class="form-control oi-qty" value="${it.quantity||0}" min="0" style="font-size:13px;padding:6px 8px;width:70px;"></td>
                            <td><input type="text" class="form-control oi-price" value="${formatCurrency(it.unit_price||0)}" style="font-size:13px;padding:6px 8px;" oninput="formatDepositInput(this);calcConsultOrderTotal()"></td>
                            <td class="oi-total" style="text-align:right;font-weight:600">${formatCurrency(it.total)}</td>
                            <td><button class="btn btn-sm" onclick="this.closest('tr').remove();calcConsultOrderTotal();" style="color:var(--danger)">✕</button></td>
                        </tr>`).join('') : ''}
                    </tbody>
                </table>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
                    <button class="btn btn-sm" onclick="addConsultOrderRow()" style="font-size:12px;">➕ Thêm dòng</button>
                    <div style="text-align:right;">
                        <div style="font-size:16px;font-weight:700;">Tổng: <span id="consultOrderTotal" style="color:#d4a843;font-size:18px;">${formatCurrency(grandTotal)}</span> VNĐ</div>
                        <div id="consultDepositInfo" style="display:none;margin-top:4px;font-size:13px;">
                            <span style="color:#6b7280;">Đã cọc:</span> <span id="consultDepositDisplay" style="color:#10b981;font-weight:600;">0</span> VNĐ
                            <br><span style="color:#6b7280;">Còn lại:</span> <span id="consultRemainingDisplay" style="color:#e65100;font-weight:700;font-size:15px;">0</span> VNĐ
                        </div>
                    </div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group">
                    <label>Địa Chỉ Cụ Thể <span style="color:var(--danger)">*</span></label>
                    <input type="text" id="consultAddress" class="form-control" value="${customerInfo.address || ''}" placeholder="Nhập địa chỉ cụ thể">
                </div>
                <div class="form-group">
                    <label>Thành Phố <span style="color:var(--danger)">*</span></label>
                    <select id="consultCity" class="form-control">
                        <option value="">-- Chọn tỉnh/thành --</option>
                        ${VN_PROVINCES.map(p => `<option value="${p}" ${customerInfo.province === p ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group" style="display:none">
                <label>Tư Vấn Tiếp Theo <span style="color:var(--danger)">*</span></label>
                <select id="consultChotDonNextType" class="form-control" onchange="updateChotDonApptLabel()">
                    <option value="dang_san_xuat">🏭 Đang Sản Xuất</option>
                    <option value="hoan_thanh">🏆 Hoàn Thành Đơn</option>
                </select>
            </div>
            <div class="form-group">
                <label id="consultChotDonApptLabel">Ngày Hẹn Làm Việc Khách <span style="color:var(--danger)">*</span></label>
                <input type="date" id="consultSBHDate" class="form-control" min="${(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); })()}">
            </div>
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-primary" id="consultSubmitBtn" onclick="submitConsultLog(${customerId})" style="width:auto;">📝 GHI NHẬN</button>
    `;

    openModal('📋 Ghi Nhận Tư Vấn', bodyHTML, footerHTML);

    // Setup image paste + trigger initial type change
    setTimeout(() => {
        const area = document.getElementById('consultImageArea');
        if (area) {
            area.addEventListener('paste', handleConsultImagePaste);
            area.addEventListener('click', () => area.focus());
        }
        document.querySelectorAll('#consultOrderTable .oi-qty, #consultOrderTable .oi-price').forEach(el => el.addEventListener('input', calcConsultOrderTotal));
        onConsultTypeChange(); // trigger to show/hide correct fields
    }, 100);
}

window._consultImageBlob = null;

function handleConsultImagePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            e.preventDefault();
            const blob = item.getAsFile();
            window._consultImageBlob = blob;
            const reader = new FileReader();
            reader.onload = (ev) => {
                document.getElementById('consultImagePreview').src = ev.target.result;
                document.getElementById('consultImagePreview').style.display = 'block';
                document.getElementById('consultImagePlaceholder').style.display = 'none';
                document.getElementById('consultImageRemove').style.display = 'block';
            };
            reader.readAsDataURL(blob);
            break;
        }
    }
}

function removeConsultImage() {
    window._consultImageBlob = null;
    document.getElementById('consultImagePreview').style.display = 'none';
    document.getElementById('consultImagePlaceholder').style.display = 'block';
    document.getElementById('consultImageRemove').style.display = 'none';
}

function onConsultTypeChange() {
    const type = document.getElementById('consultType').value;
    const cancelGroup = document.getElementById('consultCancelGroup');
    const contentGroup = document.getElementById('consultContentGroup');
    const imageGroup = document.getElementById('consultImageGroup');
    const appointmentGroup = document.getElementById('consultAppointmentGroup');
    const orderGroup = document.getElementById('consultOrderGroup');
    const handlerGroup = document.getElementById('consultHandlerGroup');
    const imageReq = document.getElementById('consultImageReq');

    // Reset all
    if (cancelGroup) cancelGroup.style.display = 'none';
    if (handlerGroup) handlerGroup.style.display = 'none';
    if (orderGroup) orderGroup.style.display = 'none';
    const depositGroup = document.getElementById('consultDepositGroup');
    if (depositGroup) depositGroup.style.display = 'none';
    if (contentGroup) contentGroup.style.display = 'block';
    if (imageGroup) imageGroup.style.display = 'block';
    if (appointmentGroup) appointmentGroup.style.display = 'block';


    // Reset labels back to default FIRST (before applying max_appointment_days)
    const contentLabel = contentGroup?.querySelector('label');
    if (contentLabel) contentLabel.innerHTML = 'Nội Dung Tư Vấn <span style="color:var(--danger)">*</span>';
    const contentArea = document.getElementById('consultContent');
    if (contentArea) contentArea.placeholder = 'Nhập nội dung tư vấn...';
    const apptLabel = appointmentGroup?.querySelector('label');
    if (apptLabel) apptLabel.innerHTML = 'Ngày Hẹn Tiếp Theo <span style="color:var(--danger)">*</span>';

    // ★ Apply max_appointment_days from SECTION config (customer's current status, not selected button)
    const apptInput = document.getElementById('consultAppointment');
    if (apptInput) {
        const today = new Date();
        const todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
        apptInput.min = todayStr;
        // Use SECTION's maxAppointmentDays (from flow rules API, inherits group leader)
        const maxDays = window._currentConsultMaxDays || 0;
        if (maxDays > 0) {
            const maxDate = new Date();
            maxDate.setDate(maxDate.getDate() + maxDays);
            apptInput.max = maxDate.getFullYear() + '-' + String(maxDate.getMonth()+1).padStart(2,'0') + '-' + String(maxDate.getDate()).padStart(2,'0');
            // Update label to show max days
            const apptLabelEl = appointmentGroup?.querySelector('label');
            if (apptLabelEl) apptLabelEl.innerHTML = `Ngày Hẹn Tiếp Theo <span style="color:var(--danger)">*</span> <span style="font-size:10px;color:#f59e0b;font-weight:600;">(tối đa ${maxDays} ngày)</span>`;
        } else {
            apptInput.removeAttribute('max');
        }
    }

    // Pinned customers: override label + disable datepicker (AFTER all resets)
    if (window._currentConsultCustomerPinned) {
        const _apptInput2 = document.getElementById('consultAppointment');
        if (_apptInput2) { _apptInput2.disabled = true; _apptInput2.style.opacity = '0.5'; }
        const _apptLbl2 = appointmentGroup?.querySelector('label');
        if (_apptLbl2) _apptLbl2.innerHTML = '📌 Ngày Hẹn Tiếp Theo <span style="color:#f59e0b;font-size:11px;">(Pin khách — tự động ngày làm việc tiếp theo)</span>';
    }

    const nextTypeGroup = document.getElementById('consultNextTypeGroup');
    if (nextTypeGroup) nextTypeGroup.style.display = 'none';

    // Image required: hide * for goi_dien, dat_coc, cap_cuu_sep, sau_ban_hang
    const imageOptionalTypes = ['goi_dien', 'dat_coc', 'cap_cuu_sep', 'sau_ban_hang'];
    if (imageReq) imageReq.style.display = imageOptionalTypes.includes(type) ? 'none' : 'inline';

    // HỦY flow
    if (type === 'huy') {
        if (cancelGroup) cancelGroup.style.display = 'block';
        if (contentGroup) contentGroup.style.display = 'none';
        if (imageGroup) imageGroup.style.display = 'none';
        if (appointmentGroup) appointmentGroup.style.display = 'none';
        if (nextTypeGroup) nextTypeGroup.style.display = 'none';
    }

    // Đặt Cọc flow — show Mã Đơn + deposit amount + content + image + appointment
    if (type === 'dat_coc') {
        if (contentGroup) contentGroup.style.display = 'block';
        if (imageGroup) imageGroup.style.display = 'block';
        if (appointmentGroup) appointmentGroup.style.display = 'block';
        // Show deposit amount field
        const depositGroup = document.getElementById('consultDepositGroup');
        if (depositGroup) depositGroup.style.display = 'block';
        // Show only the Mã Đơn field from orderGroup
        const ocGroup = document.getElementById('consultOrderCodeGroup');
        if (ocGroup) ocGroup.style.display = 'block';
        fetchOrderCode();
    }

    // Chốt Đơn flow
    if (type === 'chot_don') {
        if (orderGroup) orderGroup.style.display = 'block';
        if (contentGroup) contentGroup.style.display = 'none';
        if (imageGroup) imageGroup.style.display = 'none';
        if (appointmentGroup) appointmentGroup.style.display = 'none';
        if (nextTypeGroup) nextTypeGroup.style.display = 'none';
        // Fetch order code (reuses existing from đặt cọc if any)
        fetchOrderCode();
        // Fetch deposit amount from dat_coc log
        window._currentDepositAmount = 0;
        const customerId = window._currentConsultCustomerId;
        if (customerId) {
            apiCall(`/api/customers/${customerId}/consult`).then(data => {
                const datCocLog = (data.logs || []).find(l => l.log_type === 'dat_coc' && l.deposit_amount > 0);
                if (datCocLog) {
                    window._currentDepositAmount = datCocLog.deposit_amount;
                    calcConsultOrderTotal();
                }
            });
        }
    }

    // Cấp Cứu Sếp flow
    if (type === 'cap_cuu_sep') {
        if (handlerGroup) handlerGroup.style.display = 'block';
        if (appointmentGroup) appointmentGroup.style.display = 'none';
        if (nextTypeGroup) nextTypeGroup.style.display = 'none';
    }

    // Sau Bán Hàng flow - just content + appointment
    if (type === 'sau_ban_hang') {
        if (imageGroup) imageGroup.style.display = 'none';
    }

    // Hoàn Thành Đơn flow - content + appointment
    if (type === 'hoan_thanh') {
        if (imageGroup) imageGroup.style.display = 'none';
        if (appointmentGroup) appointmentGroup.style.display = 'block';
    }

    // Hủy Cọc flow - content (lý do) + appointment date
    if (type === 'huy_coc') {
        if (contentGroup) contentGroup.style.display = 'block';
        if (imageGroup) imageGroup.style.display = 'none';
        if (appointmentGroup) appointmentGroup.style.display = 'block';
        // Relabel
        const contentLabel = contentGroup?.querySelector('label');
        if (contentLabel) contentLabel.innerHTML = 'Lý Do Hủy Cọc <span style="color:var(--danger)">*</span>';
        const contentArea = document.getElementById('consultContent');
        if (contentArea) contentArea.placeholder = 'Nhập lý do hủy cọc...';
        const apptLabel = appointmentGroup?.querySelector('label');
        if (apptLabel) apptLabel.innerHTML = 'Ngày Hẹn Làm Việc <span style="color:var(--danger)">*</span>';
    }
}

function updateApptLabel() {
    const sel = document.getElementById('consultNextType');
    const apptGroup = document.getElementById('consultAppointmentGroup');
    if (!sel || !apptGroup) return;
    const val = sel.value;
    const typeInfo = CONSULT_TYPES[val];
    const label = typeInfo ? typeInfo.label : 'Tiếp Theo';
    const apptLabel = apptGroup.querySelector('label');
    if (apptLabel) apptLabel.innerHTML = `Ngày Hẹn ${label} <span style="color:var(--danger)">*</span>`;
}

function updateChotDonApptLabel() {
    const sel = document.getElementById('consultChotDonNextType');
    const lbl = document.getElementById('consultChotDonApptLabel');
    if (!sel || !lbl) return;
    const labels = { dang_san_xuat: 'Đang Sản Xuất', hoan_thanh: 'Hoàn Thành Đơn' };
    lbl.innerHTML = `Ngày Hẹn ${labels[sel.value] || 'Hoàn Thành Đơn'} <span style="color:var(--danger)">*</span>`;
}

// ========== SHARED GROUPED HISTORY BUILDER ==========
function buildGroupedHistoryHTML(logs, options = {}) {
    const { compact = false } = options;
    if (logs.length === 0) return compact ? '' : '<div style="text-align:center;padding:40px 20px;"><div style="font-size:40px;margin-bottom:8px;">📭</div><div style="color:#94a3b8;font-size:14px;">Chưa có lịch sử tư vấn</div></div>';

    const now = new Date();
    const currentKey = `${now.getMonth()+1}/${now.getFullYear()}`;

    // Group by month/year
    const groups = {};
    logs.forEach(log => {
        const d = new Date(log.created_at);
        const key = `${d.getMonth()+1}/${d.getFullYear()}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(log);
    });

    const MONTH_NAMES = ['','Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

    return Object.entries(groups).map(([key, items]) => {
        const [m, y] = key.split('/');
        const isCurrentMonth = key === currentKey;
        const groupId = 'hg_' + key.replace('/', '_') + '_' + Math.random().toString(36).slice(2,6);

        const logsHTML = items.map((log, idx) => {
            const t = CONSULT_TYPES[log.log_type] || { icon: '📋', label: log.log_type, color: '#6b7280' };
            const d = new Date(log.created_at);
            const days = ['CN','T2','T3','T4','T5','T6','T7'];
            const dayName = days[d.getDay()];
            const dateStr = compact
                ? `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`
                : `${dayName} ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
            const userName = log.logged_by_name || 'N/A';

            if (compact) {
                let extra = '';
                if (log.content) {
                    const sc = log.content.length > 80 ? log.content.substring(0,80)+'...' : log.content;
                    extra += `<div style="font-size:10px;color:var(--gray-500);margin-top:2px;padding-left:18px;">📝 ${sc}</div>`;
                }
                if (log.image_path) {
                    extra += `<div style="margin-top:3px;padding-left:18px;"><img src="${log.image_path}" style="max-width:80px;max-height:50px;border-radius:4px;border:1px solid var(--gray-200);cursor:pointer;" onclick="window.open('${log.image_path}','_blank')"></div>`;
                }
                return `<div style="font-size:11px;padding:4px 0;border-bottom:1px solid var(--gray-100);">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                        <span style="color:${t.color};font-weight:600;">${t.icon} ${t.label}</span>
                        <span style="color:var(--gray-400);font-size:10px;text-align:right;">${dateStr}<br><span style="color:#8b5cf6;font-weight:500;">${userName}</span></span>
                    </div>
                    ${extra}
                </div>`;
            } else {
                const isLast = idx === items.length - 1;
                return `<div style="display:flex;gap:12px;position:relative;padding-bottom:${isLast ? '4' : '16'}px;">
                    <!-- Timeline line -->
                    ${!isLast ? `<div style="position:absolute;left:15px;top:32px;bottom:0;width:2px;background:linear-gradient(to bottom,${t.color}22,#e2e8f0);"></div>` : ''}
                    <!-- Timeline dot -->
                    <div style="flex-shrink:0;width:32px;height:32px;border-radius:50%;background:${t.color};display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px ${t.color}44;z-index:1;">
                        ${t.icon}
                    </div>
                    <!-- Card -->
                    <div style="flex:1;min-width:0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;transition:box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 2px 12px rgba(0,0,0,0.06)'" onmouseout="this.style.boxShadow='none'">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:${log.content || log.image_path ? '8' : '0'}px;">
                            <span style="font-size:12px;font-weight:700;color:${t.color};background:${t.color}12;padding:2px 10px;border-radius:6px;">${t.label}</span>
                            <div style="text-align:right;flex-shrink:0;">
                                <div style="font-size:11px;color:#94a3b8;">${dateStr}</div>
                                <div style="font-size:11px;color:#8b5cf6;font-weight:600;">${userName}</div>
                            </div>
                        </div>
                        ${log.content ? `<div style="font-size:13px;color:#1e293b;line-height:1.5;padding:8px 12px;background:white;border-radius:8px;border:1px solid #f1f5f9;">${log.content}</div>` : ''}
                        ${log.image_path ? `<div style="margin-top:8px;"><img src="${log.image_path}" style="max-width:200px;max-height:140px;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer;transition:transform 0.15s;" onclick="window.open('${log.image_path}','_blank')" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform=''"></div>` : ''}
                    </div>
                </div>`;
            }
        }).join('');

        const headerStyle = compact
            ? 'cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:#122546;color:#fad24c;border-radius:6px;font-size:12px;font-weight:700;margin-bottom:4px;'
            : 'cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:linear-gradient(135deg,#0f172a,#1e3a5f);color:#fff;border-radius:10px;font-size:13px;font-weight:700;margin-bottom:12px;';

        return `<div style="margin-bottom:${compact ? '6' : '8'}px;">
            <div style="${headerStyle}" onclick="var p=document.getElementById('${groupId}');p.style.display=p.style.display==='none'?'block':'none';this.querySelector('.hg-arrow').textContent=p.style.display==='none'?'▶':'▼';">
                <span>📅 ${MONTH_NAMES[Number(m)]} ${y} <span style="background:rgba(250,210,76,0.2);color:#fad24c;padding:2px 8px;border-radius:10px;font-size:11px;margin-left:6px;">${items.length}</span></span>
                <span class="hg-arrow" style="font-size:12px;">${isCurrentMonth ? '▼' : '▶'}</span>
            </div>
            <div id="${groupId}" style="display:${isCurrentMonth ? 'block' : 'none'};">
                ${logsHTML}
            </div>
        </div>`;
    }).join('');
}

// ========== SHARED ORDER CARD BUILDER ==========
function buildOrderCardHTML(codes, customer) {
    if (codes.length === 0) return '<p style="color:#6b7280;text-align:center;padding:20px;">Chưa có mã đơn nào</p>';

    let allOrdersTotal = 0;

    const cardsHTML = codes.map(oc => {
        const d = new Date(oc.created_at);
        const dateStr = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
        const orderItems = oc.items || [];
        const orderDeposit = oc.deposit || 0;
        const orderTotal = orderItems.reduce((s, i) => s + (i.total || 0), 0);
        if (oc.status !== 'cancelled') allOrdersTotal += orderTotal;
        const statusBadge = oc.status === 'completed' 
            ? '<span style="background:#10b981;color:white;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;">✅ Hoàn thành</span>'
            : oc.status === 'cancelled'
            ? '<span style="background:#ef4444;color:white;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;">❌ Đã hủy</span>'
            : '<span style="background:#f59e0b;color:white;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;">🔄 Đang xử lý</span>';
        
        const actionBtns = '';

        return `
            <div style="padding:12px;border:1px solid ${oc.status === 'completed' ? '#10b981' : oc.status === 'cancelled' ? '#ef4444' : '#e5e7eb'};border-radius:10px;margin-bottom:8px;background:${oc.status === 'completed' ? '#f0fdf4' : oc.status === 'cancelled' ? '#fef2f2' : '#fafafa'};">
                <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:8px;">
                    <div style="min-width:90px;">
                        <div style="font-size:10px;color:#6b7280;">Mã Đơn</div>
                        <div style="font-weight:700;color:#e65100;font-size:15px;">${oc.order_code}</div>
                    </div>
                    <div style="min-width:80px;">
                        <div style="font-size:10px;color:#6b7280;">NV Tạo</div>
                        <div style="font-weight:600;color:#122546;font-size:12px;">${oc.user_name || '—'}</div>
                    </div>
                    <div style="min-width:80px;">
                        <div style="font-size:10px;color:#6b7280;">Ngày</div>
                        <div style="font-weight:600;color:#122546;font-size:12px;">${dateStr}</div>
                    </div>
                    <div>${statusBadge}</div>
                </div>
                ${orderItems.length > 0 ? `
                    <table style="width:100%;font-size:12px;border-collapse:collapse;border-radius:6px;overflow:hidden;">
                        <thead><tr style="background:#122546;">
                            <th style="text-align:left;padding:6px 8px;color:#fad24c;font-weight:700;">TÊN SP</th>
                            <th style="text-align:center;padding:6px 8px;color:#fad24c;font-weight:700;width:45px;">SL</th>
                            <th style="text-align:right;padding:6px 8px;color:#fad24c;font-weight:700;width:90px;">GIÁ</th>
                            <th style="text-align:right;padding:6px 8px;color:#fad24c;font-weight:700;width:100px;">THÀNH TIỀN</th>
                            <th style="text-align:right;padding:6px 8px;color:#fad24c;font-weight:700;width:90px;">CỌC</th>
                            <th style="text-align:right;padding:6px 8px;color:#fad24c;font-weight:700;width:100px;">CÒN LẠI</th>
                        </tr></thead>
                        <tbody>
                            ${orderItems.map(it => {
                                const itemDeposit = orderItems.length === 1 ? orderDeposit : Math.round(orderDeposit * (it.total || 0) / orderTotal);
                                const itemRemain = Math.max(0, (it.total || 0) - itemDeposit);
                                return `<tr style="border-top:1px solid #e5e7eb;">
                                    <td style="padding:5px 8px;color:#122546;">${it.description || '—'}</td>
                                    <td style="padding:5px 8px;text-align:center;color:#122546;font-weight:600;">${it.quantity}</td>
                                    <td style="padding:5px 8px;text-align:right;color:#122546;">${formatCurrency(it.unit_price || 0)}đ</td>
                                    <td style="padding:5px 8px;text-align:right;font-weight:600;color:#e65100;">${formatCurrency(it.total)}đ</td>
                                    <td style="padding:5px 8px;text-align:right;color:#10b981;font-weight:600;">${orderDeposit > 0 ? formatCurrency(itemDeposit) + 'đ' : '—'}</td>
                                    <td style="padding:5px 8px;text-align:right;font-weight:700;color:#e65100;">${orderDeposit > 0 ? formatCurrency(itemRemain) + 'đ' : formatCurrency(it.total) + 'đ'}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                    <div style="text-align:right;font-size:13px;font-weight:600;margin-top:4px;color:#122546;">Tổng đơn: <span style="color:#e65100;">${formatCurrency(orderTotal)}</span> VNĐ${orderDeposit > 0 ? ` | Cọc: <span style="color:#10b981;">${formatCurrency(orderDeposit)}</span> VNĐ` : ''}</div>
                ` : '<p style="color:#9ca3af;font-size:12px;text-align:center;">Chưa có sản phẩm</p>'}
                ${actionBtns}
            </div>
        `;
    }).join('');

    return cardsHTML + (allOrdersTotal > 0 ? `<div style="text-align:right;font-size:16px;font-weight:700;margin-top:8px;padding-top:8px;border-top:2px solid #e5e7eb;">Tổng doanh số: <span style="color:#e65100;">${formatCurrency(allOrdersTotal)}</span> VNĐ</div>` : '');
}

// ========== ORDER CODES POPUP ==========
async function openOrderCodesPopup(customerId) {
    // Open full customer detail popup with "Đơn Hàng" tab pre-selected
    await openCustomerDetail(customerId);
    setTimeout(() => switchCDTab('orders'), 100);
}

// Per-order completion
async function completeOrder(orderId, customerId) {
    if (!confirm('Xác nhận hoàn thành đơn này? Hoa hồng sẽ được tính cho affiliate.')) return;
    try {
        const res = await apiCall(`/api/order-codes/${orderId}/complete`, 'POST');
        if (res.success) {
            showToast('✅ ' + res.message);
            closeModal();
            openOrderCodesPopup(customerId);
        } else {
            showToast(res.error, 'error');
        }
    } catch(e) { showToast('Lỗi: ' + (e.message || ''), 'error'); }
}

// Per-order cancellation
async function cancelOrder(orderId, customerId) {
    if (!confirm('Xác nhận hủy đơn này?')) return;
    try {
        const res = await apiCall(`/api/order-codes/${orderId}/cancel`, 'POST');
        if (res.success) {
            showToast('🚫 ' + res.message);
            closeModal();
            openOrderCodesPopup(customerId);
        } else {
            showToast(res.error, 'error');
        }
    } catch(e) { showToast('Lỗi: ' + (e.message || ''), 'error'); }
}

// Toggle collapsible history panel
function toggleConsultHistory() {
    const panel = document.getElementById('consultHistoryPanel');
    const arrow = document.getElementById('historyArrow');
    if (panel) {
        const isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? 'block' : 'none';
        if (arrow) arrow.textContent = isHidden ? '▲' : '▼';
    }
}

// Fetch order code for current customer (always generates new)
function fetchOrderCode() {
    const ocGroup = document.getElementById('consultOrderCodeGroup');
    const ocInput = document.getElementById('consultOrderCode');
    if (!ocGroup || !ocInput) return;
    ocInput.value = 'Đang tải...';
    ocGroup.style.display = 'block';
    const customerId = window._currentConsultCustomerId;
    apiCall(`/api/order-codes/next${customerId ? '?customer_id=' + customerId : ''}`).then(res => {
        if (res.order_code) {
            ocInput.value = res.order_code;
            // New order = clear items table
            const tbody = document.querySelector('#consultOrderTable tbody');
            if (tbody) {
                tbody.innerHTML = '';
                addConsultOrderRow();
            }
            // Reset totals
            const totalEl = document.getElementById('consultOrderTotal');
            if (totalEl) totalEl.textContent = '0';
            const depInfo = document.getElementById('consultDepositInfo');
            if (depInfo) depInfo.style.display = 'none';
        } else {
            ocInput.value = 'Chưa cài mã đơn';
        }
    }).catch(() => { ocInput.value = 'Lỗi tải mã'; });
}

// Order table helpers for Chốt Đơn
function addConsultOrderRow() {
    const tbody = document.querySelector('#consultOrderTable tbody');
    tbody.insertAdjacentHTML('beforeend', `<tr>
        <td><input class="form-control oi-desc" value="" style="font-size:13px;padding:6px 8px;"></td>
        <td><input type="number" class="form-control oi-qty" value="0" min="0" style="font-size:13px;padding:6px 8px;width:70px;" oninput="calcConsultOrderTotal()"></td>
        <td><input type="text" class="form-control oi-price" value="0" style="font-size:13px;padding:6px 8px;" oninput="formatDepositInput(this);calcConsultOrderTotal()"></td>
        <td class="oi-total" style="text-align:right;font-weight:600">0</td>
        <td><button class="btn btn-sm" onclick="this.closest('tr').remove();calcConsultOrderTotal();" style="color:var(--danger)">✕</button></td>
    </tr>`);
}

function calcConsultOrderTotal() {
    let grand = 0;
    document.querySelectorAll('#consultOrderTable tbody tr').forEach(row => {
        const qty = Number(row.querySelector('.oi-qty')?.value) || 0;
        const price = Number((row.querySelector('.oi-price')?.value || '').replace(/\./g, '')) || 0;
        const total = qty * price;
        row.querySelector('.oi-total').textContent = formatCurrency(total);
        grand += total;
    });
    const el = document.getElementById('consultOrderTotal');
    if (el) el.textContent = formatCurrency(grand);
    // Update deposit subtraction
    const deposit = window._currentDepositAmount || 0;
    const depositInfo = document.getElementById('consultDepositInfo');
    if (deposit > 0 && depositInfo) {
        depositInfo.style.display = 'block';
        document.getElementById('consultDepositDisplay').textContent = formatCurrency(deposit);
        document.getElementById('consultRemainingDisplay').textContent = formatCurrency(Math.max(0, grand - deposit));
    }
}

// Disable submit button to prevent double-click
function disableSubmitBtn() {
    const btn = document.getElementById('consultSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang xử lý...'; }
}
function enableSubmitBtn() {
    const btn = document.getElementById('consultSubmitBtn');
    if (btn) { btn.disabled = false; btn.textContent = '📝 GHI NHẬN'; }
}

async function submitConsultLog(customerId) {
    // Debounce: disable button immediately
    disableSubmitBtn();
    const log_type = document.getElementById('consultType').value;
    const content = document.getElementById('consultContent')?.value;
    const appointment_date = document.getElementById('consultAppointment')?.value;

    // ========== HỦY flow ==========
    if (log_type === 'huy') {
        const reason = document.getElementById('consultCancelReason')?.value;
        if (!reason) { showToast('Vui lòng nhập lý do hủy!', 'error'); enableSubmitBtn(); return; }
        try {
            const data = await apiCall(`/api/customers/${customerId}/cancel`, 'POST', { reason });
            if (data.success) { showToast('✅ ' + data.message); closeModal(); loadCrmNhuCauData(); }
            else { showToast(data.error || 'Lỗi!', 'error'); enableSubmitBtn(); }
        } catch (err) { showToast('Lỗi kết nối!', 'error'); enableSubmitBtn(); }
        return;
    }

    // ========== Cấp Cứu Sếp flow ==========
    if (log_type === 'cap_cuu_sep') {
        const handler_id = document.getElementById('consultHandler')?.value;
        if (!content) { showToast('Vui lòng nhập nội dung tình huống!', 'error'); enableSubmitBtn(); return; }
        if (!handler_id) { showToast('Vui lòng chọn Sếp xử lý!', 'error'); enableSubmitBtn(); return; }
        try {
            // Upload image first via consultation
            const formData = new FormData();
            formData.append('log_type', 'cap_cuu_sep');
            formData.append('content', content);
            if (window._consultImageBlob) {
                formData.append('image', window._consultImageBlob, 'screenshot.png');
            }
            await fetch(`/api/customers/${customerId}/consult`, { method: 'POST', body: formData });

            // Create emergency
            const data = await apiCall('/api/emergencies', 'POST', {
                customer_id: customerId, reason: content, handler_id: Number(handler_id)
            });
            if (data.success) {
                showToast('🚨 ' + data.message); closeModal(); window._consultImageBlob = null; loadCrmNhuCauData();
            } else { showToast(data.error || 'Lỗi!', 'error'); enableSubmitBtn(); }
        } catch (err) { showToast('Lỗi kết nối!', 'error'); enableSubmitBtn(); }
        return;
    }

    // ========== Đặt Cọc flow ==========
    if (log_type === 'dat_coc') {
        const depositAmount = Number((document.getElementById('consultDepositAmount')?.value || '').replace(/\./g, '')) || 0;
        if (depositAmount <= 0) {
            showToast('Vui lòng nhập số tiền đặt cọc!', 'error'); enableSubmitBtn(); return;
        }
        const contentText = content || `Đặt cọc: ${formatCurrency(depositAmount)} VNĐ`;

        try {

            // Submit consultation log
            const formData = new FormData();
            formData.append('log_type', 'dat_coc');
            formData.append('content', contentText);
            formData.append('deposit_amount', depositAmount);
            if (appointment_date) formData.append('appointment_date', appointment_date);
            if (window._consultImageBlob) {
                formData.append('image', window._consultImageBlob, 'screenshot.png');
            }
            const res = await fetch(`/api/customers/${customerId}/consult`, { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                showToast('✅ Đặt cọc thành công!'); closeModal(); window._consultImageBlob = null; loadCrmNhuCauData();
            } else { showToast(data.error || 'Lỗi!', 'error'); enableSubmitBtn(); }
        } catch (err) { showToast('Lỗi kết nối!', 'error'); enableSubmitBtn(); }
        return;
    }

    // ========== Chốt Đơn flow ==========
    if (log_type === 'chot_don') {
        const address = document.getElementById('consultAddress')?.value;
        const city = document.getElementById('consultCity')?.value;
        const phone = document.getElementById('consultPhone')?.value;
        const sbhDate = document.getElementById('consultSBHDate')?.value;
        if (!address) { showToast('Vui lòng nhập địa chỉ!', 'error'); enableSubmitBtn(); return; }
        if (!city) { showToast('Vui lòng chọn thành phố!', 'error'); enableSubmitBtn(); return; }
        if (!sbhDate) { showToast('Vui lòng chọn ngày hẹn sau bán hàng!', 'error'); enableSubmitBtn(); return; }

        // Phone validate
        if (phone && !/^\d{10}$/.test(phone)) {
            showToast('SĐT phải đúng 10 chữ số', 'error'); enableSubmitBtn(); return;
        }

        // Collect order items
        const rows = document.querySelectorAll('#consultOrderTable tbody tr');
        if (rows.length === 0) { showToast('Vui lòng thêm ít nhất 1 sản phẩm!', 'error'); enableSubmitBtn(); return; }
        const items = [];
        for (const row of rows) {
            const desc = row.querySelector('.oi-desc')?.value;
            const qty = Number(row.querySelector('.oi-qty')?.value) || 0;
            const price = Number((row.querySelector('.oi-price')?.value || '').replace(/\./g, '')) || 0;
            if (desc && qty > 0 && price > 0) items.push({ description: desc, quantity: qty, unit_price: price });
        }
        if (items.length === 0) { showToast('Vui lòng nhập sản phẩm hợp lệ!', 'error'); enableSubmitBtn(); return; }

        try {
            // Generate order code FIRST so items link to new order
            const orderCodeEl = document.getElementById('consultOrderCode');
            if (orderCodeEl && orderCodeEl.value) {
                await apiCall('/api/order-codes', 'POST', { customer_id: customerId });
            }

            // Save order items (now linked to the newly created order)
            await apiCall(`/api/customers/${customerId}/items`, 'PUT', { items });

            // Sync phone + address + province
            const syncBody = { address, province: city };
            if (phone) syncBody.phone = phone;
            await apiCall(`/api/customers/${customerId}/info`, 'PUT', syncBody);

            // Submit consultation log with chot_don type
            const formData = new FormData();
            formData.append('log_type', 'chot_don');
            formData.append('content', `Chốt đơn: ${items.length} SP — ${address}, ${city}`);
            formData.append('address', address);
            formData.append('appointment_date', sbhDate);
            const chotDonNextType = document.getElementById('consultChotDonNextType')?.value;
            if (chotDonNextType) formData.append('next_consult_type', chotDonNextType);
            const res = await fetch(`/api/customers/${customerId}/consult`, { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                showToast('✅ Chốt đơn thành công! Chuyển sang Sau Bán Hàng.'); closeModal(); window._consultImageBlob = null; loadCrmNhuCauData();
            } else { showToast(data.error || 'Lỗi!', 'error'); enableSubmitBtn(); }
        } catch (err) { showToast('Lỗi kết nối!', 'error'); enableSubmitBtn(); }
        return;
    }

    // ========== Normal consultation flow ==========
    if (!content) { showToast('Vui lòng nhập nội dung tư vấn!', 'error'); enableSubmitBtn(); return; }
    const imageRequiredTypes = ['nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua'];
    if (imageRequiredTypes.includes(log_type) && !window._consultImageBlob) {
        showToast('Vui lòng dán hình ảnh (Ctrl+V)!', 'error'); enableSubmitBtn(); return;
    }
    if (!appointment_date) { showToast('Vui lòng chọn ngày hẹn!', 'error'); enableSubmitBtn(); return; }

    const formData = new FormData();
    formData.append('log_type', log_type);
    formData.append('content', content);
    formData.append('appointment_date', appointment_date);
    const nextType = document.getElementById('consultNextType')?.value;
    if (nextType) formData.append('next_consult_type', nextType);
    if (window._consultImageBlob) {
        formData.append('image', window._consultImageBlob, 'screenshot.png');
    }

    try {
        const res = await fetch(`/api/customers/${customerId}/consult`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            showToast('✅ ' + data.message); closeModal(); window._consultImageBlob = null; loadCrmNhuCauData();
        } else { showToast(data.error || 'Lỗi!', 'error'); enableSubmitBtn(); }
    } catch (err) { showToast('Lỗi kết nối!', 'error'); enableSubmitBtn(); }
}

// ========== CONSULTATION HISTORY ==========
async function openConsultHistory(customerId) {
    const [custData, logData, codesData] = await Promise.all([
        apiCall(`/api/customers/${customerId}`),
        apiCall(`/api/customers/${customerId}/consult`),
        apiCall(`/api/customers/${customerId}/order-codes`)
    ]);
    
    const c = custData.customer;
    if (!c) { showToast('Không tìm thấy', 'error'); return; }
    const logs = logData.logs || [];
    const items = custData.items || [];
    const codes = codesData.codes || [];
    const totalDeposit = codesData.total_deposit || 0;

    let bodyHTML = `
        <div style="display:flex;gap:8px;margin-bottom:16px;">
            <button class="btn btn-sm tab-btn active" onclick="switchConsultTab('info', this)" style="font-size:12px;">📋 Thông Tin</button>
            <button class="btn btn-sm tab-btn" onclick="switchConsultTab('history', this)" style="font-size:12px;">📜 Lịch Sử (${logs.length})</button>
            <button class="btn btn-sm tab-btn" onclick="switchConsultTab('order', this)" style="font-size:12px;">📦 Đơn Hàng</button>
        </div>

        <div id="tabInfo">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">
                <div><strong>Mã:</strong> <span style="color:var(--gold)">${getCustomerCode(c)}</span></div>
                <div><strong>Trạng thái:</strong> ${getStatusBadge(c.order_status)}</div>
                <div><strong>Khách hàng:</strong> ${c.customer_name}</div>
                <div><strong>SĐT:</strong> <a href="tel:${c.phone}">${c.phone}</a></div>
                <div><strong>Nguồn:</strong> ${c.source_name || '—'}</div>
                <div><strong>Ngày bàn giao:</strong> ${formatDate(c.handover_date)}</div>
                <div><strong>Địa chỉ:</strong> ${c.address || '—'}</div>
                <div><strong>Ngày sinh:</strong> ${c.birthday ? formatDate(c.birthday) : '—'}</div>
                <div><strong>Ngày hẹn:</strong> ${c.appointment_date || '—'}</div>
                <div><strong>Người nhận:</strong> ${c.assigned_to_name || '—'}</div>
                ${(c.referrer_name || c.referrer_customer_name) ? `<div><strong>Người GT:</strong> <span style="cursor:pointer;text-decoration:underline;color:var(--info);" onclick="openAffiliateDetail(${c.referrer_id})">${c.referrer_name || c.referrer_customer_name}</span></div>` : ''}
                ${(c.referrer_user_crm_type || c.referrer_crm_type) ? `<div><strong>CRM người GT:</strong> ${CRM_LABELS[c.referrer_user_crm_type || c.referrer_crm_type] || c.referrer_user_crm_type || c.referrer_crm_type}</div>` : ''}
                ${c.notes ? `<div style="grid-column:1/-1"><strong>Ghi chú:</strong> ${c.notes}</div>` : ''}
            </div>
        </div>

        <div id="tabHistory" style="display:none;">
            ${logs.length === 0 ? '<div class="empty-state"><div class="icon">📭</div><h3>Chưa có lịch sử</h3></div>' :
            `<div style="max-height:350px;overflow-y:auto;">
                ${buildGroupedHistoryHTML(logs)}
            </div>`}
        </div>

        <div id="tabOrder" style="display:none;">
            ${buildOrderCardHTML(codes, items, c, totalDeposit)}
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
        <button class="btn btn-primary" onclick="openConsultModal(${c.id})" style="width:auto;">📝 Tư Vấn</button>
        <button class="btn btn-primary" onclick="saveOrderItems(${c.id})" style="width:auto;">💾 Lưu Đơn</button>
        <button class="btn" onclick="requestCancel(${c.id})" style="width:auto;background:var(--danger);color:white;">❌ Hủy KH</button>
    `;

    openModal(`📋 ${c.customer_name} — ${getCustomerCode(c)}`, bodyHTML, footerHTML);

    setTimeout(() => {
        document.querySelectorAll('.oi-qty, .oi-price').forEach(el => el.addEventListener('input', calcOrderTotal));
    }, 100);
}

function switchConsultTab(tab, btn) {
    document.getElementById('tabInfo').style.display = tab === 'info' ? 'block' : 'none';
    document.getElementById('tabHistory').style.display = tab === 'history' ? 'block' : 'none';
    document.getElementById('tabOrder').style.display = tab === 'order' ? 'block' : 'none';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

// ========== UPDATE APPOINTMENT ==========
async function updateAppointment(customerId, date) {
    const data = await apiCall(`/api/customers/${customerId}/appointment`, 'PUT', { appointment_date: date });
    if (data.success) showToast('📅 Đã cập nhật ngày hẹn!');
}

// ========== REFERRER SEARCH ==========
let _allReferrerCustomers = [];
async function openReferrerSearch(customerId) {
    const bodyHTML = `
        <div class="form-group">
            <label>Tìm Người Giới Thiệu (tên hoặc SĐT)</label>
            <input type="text" id="referrerSearchInput" class="form-control" placeholder="Nhập tên hoặc SĐT để lọc..." oninput="filterReferrerList(${customerId})">
        </div>
        <div id="referrerSearchResults" style="max-height:350px;overflow-y:auto;">
            <p style="color:var(--gray-400);text-align:center;padding:20px;">Đang tải...</p>
        </div>
    `;
    openModal('🔍 Tìm Người Giới Thiệu', bodyHTML, `<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>`);

    // Load all referrer-eligible customers (CTV, Hoa Hồng, Sinh Viên, Nuôi Dưỡng)
    try {
        const data = await apiCall('/api/customers/referrer-search?q=&all=1');
        _allReferrerCustomers = data.customers || [];
        renderReferrerList(customerId, _allReferrerCustomers);
    } catch(e) {
        document.getElementById('referrerSearchResults').innerHTML = '<p style="color:var(--danger);text-align:center;">Lỗi tải dữ liệu</p>';
    }
    setTimeout(() => document.getElementById('referrerSearchInput')?.focus(), 200);
}

function filterReferrerList(customerId) {
    const q = (document.getElementById('referrerSearchInput')?.value || '').toLowerCase().trim();
    const filtered = q ? _allReferrerCustomers.filter(c =>
        (c.customer_name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q)
    ) : _allReferrerCustomers;
    renderReferrerList(customerId, filtered);
}

function renderReferrerList(customerId, customers) {
    const results = document.getElementById('referrerSearchResults');
    if (!results) return;
    if (customers.length === 0) {
        results.innerHTML = '<p style="color:var(--gray-400);text-align:center;padding:20px;">Không tìm thấy</p>';
        return;
    }
    const CRM_TYPE_COLORS = { 'ctv': '#10b981', 'hoa_hong': '#f59e0b', 'sinh_vien': '#3b82f6', 'nuoi_duong': '#8b5cf6' };
    results.innerHTML = customers.map(c => {
        const typeLabel = CRM_LABELS[c.crm_type] || c.crm_type;
        const typeColor = CRM_TYPE_COLORS[c.crm_type] || '#6b7280';
        return `
            <div onclick="selectReferrer(${customerId}, ${c.id})" 
                style="padding:10px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:6px;cursor:pointer;transition:all 0.2s;display:flex;justify-content:space-between;align-items:center;"
                onmouseover="this.style.borderColor='#fad24c';this.style.background='#fefce8'" onmouseout="this.style.borderColor='#e5e7eb';this.style.background='white'">
                <div>
                    <div style="font-weight:600;color:#122546;">${c.customer_name}</div>
                    <div style="font-size:12px;color:#6b7280;">${c.phone || '—'}</div>
                </div>
                <span style="font-size:11px;padding:3px 8px;border-radius:12px;background:${typeColor}20;color:${typeColor};font-weight:600;">${typeLabel}</span>
            </div>
        `;
    }).join('');
}

async function selectReferrer(customerId, referrerCustomerId) {
    const data = await apiCall(`/api/customers/${customerId}/referrer`, 'PUT', { referrer_customer_id: referrerCustomerId });
    if (data.success) {
        showToast('✅ Đã chọn người giới thiệu: ' + data.referrer_name);
        closeModal();
        loadCrmNhuCauData();
    } else {
        showToast(data.error || 'Lỗi!', 'error');
    }
}

// ========== CẬP NHẬT THÔNG TIN KHÁCH HÀNG ==========
// ========== DANH SÁCH TỈNH/THÀNH PHỐ ==========
const PROVINCES = [
    'An Giang','Bà Rịa - Vũng Tàu','Bắc Giang','Bắc Kạn','Bạc Liêu','Bắc Ninh','Bến Tre',
    'Bình Định','Bình Dương','Bình Phước','Bình Thuận','Cà Mau','Cần Thơ','Cao Bằng',
    'Đà Nẵng','Đắk Lắk','Đắk Nông','Điện Biên','Đồng Nai','Đồng Tháp','Gia Lai',
    'Hà Giang','Hà Nam','Hà Nội','Hà Tĩnh','Hải Dương','Hải Phòng','Hậu Giang',
    'Hòa Bình','Hưng Yên','Khánh Hòa','Kiên Giang','Kon Tum','Lai Châu','Lâm Đồng',
    'Lạng Sơn','Lào Cai','Long An','Nam Định','Nghệ An','Ninh Bình','Ninh Thuận',
    'Phú Thọ','Phú Yên','Quảng Bình','Quảng Nam','Quảng Ngãi','Quảng Ninh','Quảng Trị',
    'Sóc Trăng','Sơn La','Tây Ninh','Thái Bình','Thái Nguyên','Thanh Hóa',
    'Thừa Thiên Huế','Tiền Giang','TP. Hồ Chí Minh','Trà Vinh','Tuyên Quang',
    'Vĩnh Long','Vĩnh Phúc','Yên Bái'
];

async function openCustomerInfo(customerId) {
    const data = await apiCall(`/api/customers/${customerId}`);
    const c = data.customer || {};
    let holidays = [];
    try { holidays = JSON.parse(c.customer_holidays || '[]'); } catch(e) {}

    // Convert birthday from various formats to day and month
    let bdDay = '', bdMonth = '';
    if (c.birthday) {
        if (c.birthday.includes('-')) {
            const parts = c.birthday.split('-');
            bdMonth = parseInt(parts[1]) || '';
            bdDay = parseInt(parts[2]) || '';
        } else if (c.birthday.includes('/')) {
            const parts = c.birthday.split('/');
            bdDay = parseInt(parts[0]) || '';
            bdMonth = parseInt(parts[1]) || '';
        }
    }

    // Generate day and month options
    let dayOpts = '<option value="">Ngày</option>';
    for (let d = 1; d <= 31; d++) dayOpts += `<option value="${d}" ${d == bdDay ? 'selected' : ''}>${d}</option>`;
    let monthOpts = '<option value="">Tháng</option>';
    for (let m = 1; m <= 12; m++) monthOpts += `<option value="${m}" ${m == bdMonth ? 'selected' : ''}>Tháng ${m}</option>`;

    const provinceOptions = PROVINCES.map(p => 
        `<option value="${p}" ${c.province === p ? 'selected' : ''}>${p}</option>`
    ).join('');

    // Helper: generate holiday day/month selects
    function holidayDateSelects(dateStr) {
        let hDay = '', hMonth = '';
        if (dateStr) {
            if (dateStr.includes('/')) { const p = dateStr.split('/'); hDay = parseInt(p[0])||''; hMonth = parseInt(p[1])||''; }
            else if (dateStr.includes('-')) { const p = dateStr.split('-'); hMonth = parseInt(p[1])||''; hDay = parseInt(p[2])||''; }
        }
        let dOpts = '<option value="">Ngày</option>';
        for (let d = 1; d <= 31; d++) dOpts += `<option value="${d}" ${d == hDay ? 'selected' : ''}>${d}</option>`;
        let mOpts = '<option value="">Tháng</option>';
        for (let m = 1; m <= 12; m++) mOpts += `<option value="${m}" ${m == hMonth ? 'selected' : ''}>T${m}</option>`;
        return `<select class="form-control ci-hday" style="width:70px;font-size:13px;">${dOpts}</select>
                <select class="form-control ci-hmonth" style="width:90px;font-size:13px;">${mOpts}</select>`;
    }

    const bodyHTML = `
        <div class="form-group">
            <label>Tên Khách Hàng</label>
            <input type="text" id="ciName" class="form-control" value="${c.customer_name || ''}">
        </div>
        <div class="form-group">
            <label>Số Điện Thoại</label>
            <input type="text" id="ciPhone" class="form-control" value="${c.phone || ''}" maxlength="10" pattern="[0-9]{10}" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
                <label>Địa Chỉ</label>
                <input type="text" id="ciAddress" class="form-control" value="${c.address || ''}">
            </div>
            <div class="form-group">
                <label>Tỉnh / Thành Phố</label>
                <select id="ciProvince" class="form-control">
                    <option value="">-- Chọn --</option>
                    ${provinceOptions}
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Công Việc</label>
            <input type="text" id="ciJob" class="form-control" value="${c.job || ''}" placeholder="VD: Giám đốc công ty ABC">
        </div>
        <div class="form-group">
            <label>Ngày Sinh Nhật</label>
            <div style="display:flex;gap:8px;">
                <select id="ciBdDay" class="form-control" style="width:80px;">${dayOpts}</select>
                <select id="ciBdMonth" class="form-control" style="width:120px;">${monthOpts}</select>
            </div>
        </div>
        <div class="form-group">
            <label>Ngày Lễ Của KH</label>
            <div id="ciHolidays">
                ${holidays.length > 0 ? holidays.map((h, i) => `
                    <div class="ci-holiday-row" style="display:flex;gap:8px;margin-bottom:6px;align-items:center;">
                        <input type="text" class="form-control ci-hname" value="${h.name || ''}" placeholder="Tên ngày lễ" style="flex:1;font-size:13px;">
                        ${holidayDateSelects(h.date)}
                        <button class="btn btn-sm" onclick="this.parentElement.remove();" style="color:var(--danger);font-size:14px;">✕</button>
                    </div>
                `).join('') : ''}
            </div>
            <button class="btn btn-sm" onclick="addHolidayRow()" style="font-size:12px;margin-top:6px;">➕ Thêm ngày lễ</button>
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="saveCustomerInfo(${customerId})" style="width:auto;">💾 LƯU</button>
    `;

    openModal('✏️ Cập Nhật Thông Tin KH', bodyHTML, footerHTML);
}

function addHolidayRow() {
    let dOpts = '<option value="">Ngày</option>';
    for (let d = 1; d <= 31; d++) dOpts += `<option value="${d}">${d}</option>`;
    let mOpts = '<option value="">Tháng</option>';
    for (let m = 1; m <= 12; m++) mOpts += `<option value="${m}">T${m}</option>`;
    const container = document.getElementById('ciHolidays');
    container.insertAdjacentHTML('beforeend', `
        <div class="ci-holiday-row" style="display:flex;gap:8px;margin-bottom:6px;align-items:center;">
            <input type="text" class="form-control ci-hname" value="" placeholder="Tên ngày lễ" style="flex:1;font-size:13px;">
            <select class="form-control ci-hday" style="width:70px;font-size:13px;">${dOpts}</select>
            <select class="form-control ci-hmonth" style="width:90px;font-size:13px;">${mOpts}</select>
            <button class="btn btn-sm" onclick="this.parentElement.remove();" style="color:var(--danger);font-size:14px;">✕</button>
        </div>
    `);
}

async function saveCustomerInfo(customerId) {
    const customer_name = document.getElementById('ciName').value;
    const phone = document.getElementById('ciPhone').value;
    if (phone && !/^\d{10}$/.test(phone)) {
        showToast('Số điện thoại phải đúng 10 chữ số', 'error');
        return;
    }
    const address = document.getElementById('ciAddress').value;
    const province = document.getElementById('ciProvince').value;
    const job = document.getElementById('ciJob').value;

    // Read birthday from day/month selects
    const bdDay = document.getElementById('ciBdDay')?.value;
    const bdMonth = document.getElementById('ciBdMonth')?.value;
    const birthday = (bdDay && bdMonth) ? `${bdDay}/${bdMonth}` : '';

    // Collect holidays from day/month selects
    const holidayRows = document.querySelectorAll('#ciHolidays .ci-holiday-row');
    const customer_holidays = [];
    holidayRows.forEach(row => {
        const name = row.querySelector('.ci-hname')?.value;
        const hDay = row.querySelector('.ci-hday')?.value;
        const hMonth = row.querySelector('.ci-hmonth')?.value;
        const date = (hDay && hMonth) ? `${hDay}/${hMonth}` : '';
        if (name || date) customer_holidays.push({ name: name || '', date });
    });

    if (!customer_name) { showToast('Tên KH không được trống!', 'error'); return; }

    try {
        const data = await apiCall(`/api/customers/${customerId}/info`, 'PUT', {
            customer_name, phone, address, province, job, birthday, customer_holidays
        });
        if (data.success) {
            showToast('✅ ' + data.message);
            closeModal();
            loadCrmNhuCauData();
        } else {
            showToast(data.error || 'Lỗi!', 'error');
        }
    } catch (err) {
        showToast('Lỗi kết nối!', 'error');
    }
}

// ========== CHI TIẾT KHÁCH HÀNG ==========
async function openCustomerDetail(customerId) {
    // Load all customer data in parallel
    const [data, logsData, orderData, orderCodesData] = await Promise.all([
        apiCall(`/api/customers/${customerId}`),
        apiCall(`/api/customers/${customerId}/consult-logs`),
        apiCall(`/api/customers/${customerId}/orders`),
        apiCall(`/api/customers/${customerId}/order-codes`)
    ]);
    const c = data.customer || {};
    const items = data.items || [];
    let holidays = [];
    try { holidays = JSON.parse(c.customer_holidays || '[]'); } catch(e) {}

    const createdDate = c.created_at ? new Date(c.created_at) : null;
    const connectDays = createdDate ? Math.floor((Date.now() - createdDate.getTime()) / 86400000) : 0;

    const logs = logsData.logs || [];

    const orders = orderData.items || [];
    const grandTotal = orders.reduce((s, i) => s + (i.total || 0), 0);

    const orderCodes = orderCodesData.codes || [];
    const cdTotalDeposit = orderCodesData.total_deposit || 0;

    const lastLogPopup = logs.length > 0 ? logs[0] : null;
    const lastConsultTypePopup = lastLogPopup ? CONSULT_TYPES[lastLogPopup.log_type] : null;
    const statusBadge = getStatusBadge ? getStatusBadge(c.order_status) : c.order_status;
    const initials = (c.customer_name || '?').split(' ').map(w => w[0]).join('').slice(-2).toUpperCase();

    const infoTab = `
        <div style="margin:-12px -12px 0;font-family:'Segoe UI',system-ui,sans-serif;">
            <!-- CUSTOMER HEADER -->
            <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%);padding:22px 22px 18px;border-radius:10px;position:relative;overflow:hidden;margin-bottom:14px;">
                <div style="position:absolute;top:-20px;right:-20px;width:100px;height:100px;background:rgba(250,210,76,0.06);border-radius:50%;"></div>
                <div style="display:flex;align-items:center;gap:14px;position:relative;z-index:1;">
                    <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#fad24c,#f59e0b);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#0f172a;box-shadow:0 3px 12px rgba(250,210,76,0.35);flex-shrink:0;">
                        ${initials}
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:3px;">${c.customer_name}</div>
                        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                            <span style="font-size:13px;color:#fad24c;font-weight:700;font-family:'Courier New',monospace;letter-spacing:0.5px;background:rgba(250,210,76,0.12);padding:2px 8px;border-radius:6px;">${getCustomerCode(c)}</span>
                            ${(c.cancel_requested === 1 && c.cancel_approved === 0)
                                ? `<span style="font-size:11px;padding:3px 10px;border-radius:6px;font-weight:600;background:var(--gray-700);color:var(--gray-400);">⏳ Chờ Duyệt Hủy</span>`
                                : (c.cancel_approved === -1)
                                    ? `<span style="font-size:11px;padding:3px 10px;border-radius:6px;font-weight:600;background:#f59e0b;color:white;">🔄 Tư Vấn Lại</span>`
                                    : lastConsultTypePopup
                                        ? `<span style="font-size:11px;padding:3px 10px;border-radius:6px;font-weight:600;background:${lastConsultTypePopup.color || 'var(--gray-600)'};color:${lastConsultTypePopup.textColor || 'white'};">${lastConsultTypePopup.icon} ${lastConsultTypePopup.label}</span>`
                                        : `<span style="font-size:12px;">${statusBadge}</span>`
                            }
                        </div>
                    </div>
                    <div style="text-align:right;flex-shrink:0;">
                        <div style="font-size:22px;font-weight:800;color:#fad24c;">${logs.length}</div>
                        <div style="font-size:10px;color:rgba(255,255,255,0.5);font-weight:600;">LẦN CHĂM</div>
                    </div>
                </div>
            </div>

            <!-- INFO GRID -->
            <div style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;overflow:hidden;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">📞 SĐT</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;"><a href="tel:${c.phone}" style="color:#3b82f6;text-decoration:none;">${c.phone}</a></div>
                    </div>
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">🏠 Địa chỉ</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${c.address || '—'}</div>
                    </div>
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">📍 Tỉnh/TP</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${c.province || '—'}</div>
                    </div>
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">🎂 Sinh nhật</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${c.birthday || '—'}</div>
                    </div>
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">📡 Nguồn</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${c.source_name || '—'}</div>
                    </div>
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">💼 Công việc</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${c.job || '—'}</div>
                    </div>
                    <div style="padding:12px 14px;border-right:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">👤 NV phụ trách</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${c.assigned_to_name || '—'}</div>
                    </div>
                    <div style="padding:12px 14px;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">📅 Kết nối từ</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${createdDate ? formatDateTime(c.created_at) : '—'}</div>
                    </div>
                </div>
            </div>
            ${(c.referrer_name || c.referrer_customer_name) ? `
                <div style="margin-top:10px;padding:10px 14px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:8px;border:1px solid #bfdbfe;font-size:13px;">
                    <strong style="color:#1e40af;">🤝 Người GT:</strong> 
                    <span style="cursor:pointer;text-decoration:underline;color:#3b82f6;font-weight:600;" onclick="openAffiliateDetail(${c.referrer_id})">${c.referrer_name || c.referrer_customer_name}</span>
                    ${(c.referrer_user_crm_type || c.referrer_crm_type) ? ` · <span style="color:#64748b;">${CRM_LABELS[c.referrer_user_crm_type || c.referrer_crm_type] || c.referrer_user_crm_type || c.referrer_crm_type}</span>` : ''}
                </div>
            ` : ''}
        </div>
        ${holidays.length > 0 ? '<div style="margin-top:8px;font-size:12px;"><strong>Ngày lễ:</strong> ' + holidays.map(h => h.name + ' (' + h.date + ')').join(', ') + '</div>' : ''}
    `;

    // Tab: Lịch Sử (grouped by month)
    const historyTab = `
        <div style="max-height:350px;overflow-y:auto;">
            ${buildGroupedHistoryHTML(logs)}
        </div>
    `;

    // Tab: Đơn Hàng (using shared helper)
    const orderTab = buildOrderCardHTML(orderCodes, orders, c, cdTotalDeposit);

    const bodyHTML = `
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
            <span class="cdtab-btn" onclick="switchCDTab('info')" id="cdtab-info-btn"
                style="display:inline-block;font-size:13px;padding:8px 16px;background:var(--gold);color:#122546;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap;">📋 Thông Tin</span>
            <span class="cdtab-btn" onclick="switchCDTab('history')" id="cdtab-history-btn"
                style="display:inline-block;font-size:13px;padding:8px 16px;background:#334155;color:white;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap;">📝 Lịch Sử (${logs.length})</span>
            <span class="cdtab-btn" onclick="switchCDTab('orders')" id="cdtab-orders-btn"
                style="display:inline-block;font-size:13px;padding:8px 16px;background:#334155;color:white;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap;">🛒 Đơn Hàng</span>
        </div>
        <div id="cdtab-info">${infoTab}</div>
        <div id="cdtab-history" style="display:none;">${historyTab}</div>
        <div id="cdtab-orders" style="display:none;">${orderTab}</div>
    `;

    // Determine last consultation type for button label
    const lastLog = logs.length > 0 ? logs[0] : null;
    const lastConsultType = lastLog ? CONSULT_TYPES[lastLog.log_type] : null;
    const consultBtnLabel = lastConsultType ? `${lastConsultType.icon} ${lastConsultType.label}` : '📝 TƯ VẤN';
    const consultBtnColor = lastConsultType ? lastConsultType.color : '';

    const consultBtnTextColor = lastConsultType?.textColor || 'white';

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
        ${!c.cancel_requested && !c.cancel_approved ? `
            <button class="btn btn-primary" onclick="closeModal();openConsultModal(${customerId});" style="width:auto;${consultBtnColor ? 'background:' + consultBtnColor + ';color:' + consultBtnTextColor + ';' : ''}">${consultBtnLabel}</button>
        ` : ''}
    `;

    openModal(``, bodyHTML, footerHTML);
}

function switchCDTab(tab) {
    const activeStyle = 'display:inline-block;font-size:13px;padding:8px 16px;background:#fad24c;color:#122546;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap;';
    const inactiveStyle = 'display:inline-block;font-size:13px;padding:8px 16px;background:#334155;color:white;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap;';
    ['info','history','orders'].forEach(t => {
        const el = document.getElementById('cdtab-' + t);
        const btn = document.getElementById('cdtab-' + t + '-btn');
        if (el) el.style.display = t === tab ? 'block' : 'none';
        if (btn) btn.style.cssText = t === tab ? activeStyle : inactiveStyle;
    });
}

// ========== AFFILIATE DETAIL POPUP ==========
const CRM_LABELS_AFF = { nhu_cau: 'Chăm Sóc KH Nhu Cầu', ctv: 'Chăm Sóc CTV', tu_tim_kiem: 'CRM Tự Tìm Kiếm', goi_hop_tac: 'CRM Gọi Điện Hợp Tác', goi_ban_hang: 'CRM Gọi Điện Bán Hàng', koc_tiktok: 'CRM KOL/KOC Tiktok' };
const ROLE_LABELS_AFF = { giam_doc:'Giám Đốc', quan_ly_cap_cao:'Quản Lý Cấp Cao', quan_ly:'Quản Lý', truong_phong:'Trưởng Phòng', nhan_vien:'Nhân Viên', part_time:'Part Time', hoa_hong:'Hoa Hồng', ctv:'CTV', nuoi_duong:'Nuôi Dưỡng', sinh_vien:'Sinh Viên', tkaffiliate:'TK Affiliate' };

async function openAffiliateDetail(userId) {
    if (!userId) return;
    try {
        const [userData, countData] = await Promise.all([
            apiCall(`/api/users/${userId}`),
            apiCall(`/api/customers?referrer_id_count=${userId}`)
        ]);
        const u = userData.user;
        if (!u) { showToast('Không tìm thấy tài khoản', 'error'); return; }

        const totalReferrals = countData.totalReferrals || 0;
        const createdAt = u.created_at ? new Date(u.created_at) : null;
        const daysCooperation = createdAt ? Math.floor((Date.now() - createdAt.getTime()) / 86400000) : 0;
        const isGD = currentUser.role === 'giam_doc';
        const isLocked = u.status === 'locked';
        const initials = (u.full_name || '?').split(' ').map(w => w[0]).join('').slice(-2).toUpperCase();

        const statusColor = isLocked ? '#ef4444' : '#22c55e';
        const statusText = isLocked ? '🔒 Đã dừng hợp tác' : '✅ Đang hợp tác';
        const statusBg = isLocked ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)';

        const bodyHTML = `
            <div style="margin:-20px -24px -10px;font-family:'Segoe UI',system-ui,sans-serif;">
                <!-- HEADER -->
                <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%);padding:28px 28px 22px;border-radius:12px 12px 0 0;position:relative;overflow:hidden;">
                    <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;background:rgba(250,210,76,0.08);border-radius:50%;"></div>
                    <div style="position:absolute;bottom:-20px;left:-20px;width:80px;height:80px;background:rgba(59,130,246,0.08);border-radius:50%;"></div>
                    <div style="display:flex;align-items:center;gap:18px;position:relative;z-index:1;">
                        <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#fad24c,#f59e0b);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#0f172a;box-shadow:0 4px 14px rgba(250,210,76,0.4);flex-shrink:0;">
                            ${initials}
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:20px;font-weight:700;color:#fff;margin-bottom:4px;text-shadow:0 1px 3px rgba(0,0,0,0.3);">${u.full_name}</div>
                            <div style="font-size:13px;color:rgba(255,255,255,0.6);margin-bottom:8px;">@${u.username}</div>
                            <div style="display:inline-flex;align-items:center;gap:6px;background:${statusBg};border:1px solid ${statusColor};color:${statusColor};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">
                                <span style="width:8px;height:8px;border-radius:50%;background:${statusColor};display:inline-block;${isLocked ? '' : 'animation:pulse-dot 2s infinite;'}"></span>
                                ${statusText}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- STAT CARDS -->
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;padding:18px 24px 14px;">
                    <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:12px;padding:14px;text-align:center;border:1px solid #bfdbfe;">
                        <div style="font-size:28px;font-weight:800;color:#1e40af;line-height:1;">${totalReferrals}</div>
                        <div style="font-size:11px;color:#3b82f6;font-weight:600;margin-top:4px;">Người giới thiệu</div>
                    </div>
                    <div style="background:linear-gradient(135deg,#fefce8,#fef3c7);border-radius:12px;padding:14px;text-align:center;border:1px solid #fde68a;">
                        <div style="font-size:28px;font-weight:800;color:#92400e;line-height:1;">${daysCooperation}</div>
                        <div style="font-size:11px;color:#d97706;font-weight:600;margin-top:4px;">Ngày hợp tác</div>
                    </div>
                    <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:12px;padding:14px;text-align:center;border:1px solid #bbf7d0;">
                        <div style="font-size:14px;font-weight:800;color:#166534;line-height:1.2;">${createdAt ? createdAt.toLocaleDateString('vi-VN') : '—'}</div>
                        <div style="font-size:11px;color:#16a34a;font-weight:600;margin-top:4px;">Ngày bắt đầu</div>
                    </div>
                </div>

                <!-- INFO GRID -->
                <div style="padding:6px 24px 20px;">
                    <div style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
                            <div style="padding:14px 16px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                                <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">📞 Số điện thoại</div>
                                <div style="font-size:14px;font-weight:600;color:#1e293b;">${u.phone || '—'}</div>
                            </div>
                            <div style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">
                                <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">📋 Loại CRM</div>
                                <div style="font-size:14px;font-weight:600;color:#1e293b;">${CRM_LABELS_AFF[u.source_crm_type] || u.source_crm_type || '—'}</div>
                            </div>
                            <div style="padding:14px 16px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                                <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">👨‍💼 NV Quản lý</div>
                                <div style="font-size:14px;font-weight:600;color:#1e293b;">${u.manager_name || '—'}</div>
                            </div>
                            <div style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">
                                <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">🏷️ Vai trò</div>
                                <div style="font-size:14px;font-weight:600;color:#1e293b;">${ROLE_LABELS_AFF[u.role] || u.role}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style>
                @keyframes pulse-dot { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
            </style>
        `;

        let footerHTML = '';
        if (isGD) {
            if (isLocked) {
                footerHTML += `<button class="btn" onclick="toggleAffiliateStatus(${u.id}, 'active')" style="background:linear-gradient(135deg,#22c55e,#16a34a);color:white;padding:10px 22px;border-radius:10px;font-weight:600;margin-right:10px;border:none;box-shadow:0 2px 8px rgba(34,197,94,0.3);transition:transform 0.15s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">▶️ Tiếp tục hợp tác</button>`;
            } else {
                footerHTML += `<button class="btn" onclick="toggleAffiliateStatus(${u.id}, 'locked')" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:white;padding:10px 22px;border-radius:10px;font-weight:600;margin-right:10px;border:none;box-shadow:0 2px 8px rgba(239,68,68,0.3);transition:transform 0.15s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">⏸️ Dừng hợp tác</button>`;
            }
            footerHTML += `<button class="btn" onclick="openEditAffiliateFromCrm(${u.id})" style="background:linear-gradient(135deg,#fad24c,#f59e0b);color:#0f172a;padding:10px 22px;border-radius:10px;font-weight:600;border:none;box-shadow:0 2px 8px rgba(250,210,76,0.3);transition:transform 0.15s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">✏️ Sửa tài khoản</button>`;
        }

        openModal(``, bodyHTML, footerHTML);
    } catch (err) {
        console.error('Affiliate detail error:', err);
        showToast('Lỗi tải thông tin affiliate', 'error');
    }
}

async function toggleAffiliateStatus(userId, newStatus) {
    try {
        const data = await apiCall(`/api/users/${userId}/status`, 'PUT', { status: newStatus });
        if (data.success) {
            showToast(`✅ ${data.message}`);
            closeModal();
            // Re-open to refresh data
            openAffiliateDetail(userId);
        } else {
            showToast(data.error, 'error');
        }
    } catch (err) {
        showToast('Lỗi cập nhật trạng thái', 'error');
    }
}

async function openEditAffiliateFromCrm(userId) {
    try {
        const userData = await apiCall(`/api/users/${userId}`);
        const u = userData.user;
        if (!u) { showToast('Không tìm thấy tài khoản', 'error'); return; }

        const bodyHTML = `
            <form id="editAffCrmForm" style="max-width:500px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                    <div class="form-group">
                        <label>Họ tên</label>
                        <input type="text" id="eafFullName" class="form-control" value="${u.full_name || ''}">
                    </div>
                    <div class="form-group">
                        <label>SĐT</label>
                        <input type="text" id="eafPhone" class="form-control" value="${u.phone || ''}">
                    </div>
                    <div class="form-group">
                        <label>Địa chỉ</label>
                        <input type="text" id="eafAddress" class="form-control" value="${u.address || ''}">
                    </div>
                    <div class="form-group">
                        <label>Tỉnh/TP</label>
                        <input type="text" id="eafProvince" class="form-control" value="${u.province || ''}">
                    </div>
                    <div class="form-group">
                        <label>Ngân hàng</label>
                        <input type="text" id="eafBankName" class="form-control" value="${u.bank_name || ''}">
                    </div>
                    <div class="form-group">
                        <label>Số TK</label>
                        <input type="text" id="eafBankAccount" class="form-control" value="${u.bank_account || ''}">
                    </div>
                    <div class="form-group" style="grid-column:1/-1;">
                        <label>Chủ TK</label>
                        <input type="text" id="eafBankHolder" class="form-control" value="${u.bank_holder || ''}">
                    </div>
                </div>
            </form>
        `;

        const footerHTML = `<button class="btn" onclick="submitEditAffFromCrm(${u.id})" style="background:var(--gold);color:#122546;padding:8px 24px;border-radius:8px;font-weight:600;">💾 Lưu thay đổi</button>`;

        openModal(`✏️ Sửa TK Affiliate: ${u.full_name}`, bodyHTML, footerHTML);
    } catch (err) {
        showToast('Lỗi tải thông tin', 'error');
    }
}

async function submitEditAffFromCrm(userId) {
    const body = {
        full_name: document.getElementById('eafFullName').value,
        phone: document.getElementById('eafPhone').value,
        address: document.getElementById('eafAddress').value,
        province: document.getElementById('eafProvince').value,
        bank_name: document.getElementById('eafBankName').value,
        bank_account: document.getElementById('eafBankAccount').value,
        bank_holder: document.getElementById('eafBankHolder').value,
        sync_source: true
    };

    if (body.phone && !/^\d{10}$/.test(body.phone)) {
        showToast('SĐT phải đúng 10 chữ số', 'error');
        return;
    }

    try {
        const data = await apiCall(`/api/users/${userId}`, 'PUT', body);
        if (data.success) {
            showToast('✅ Cập nhật thành công!');
            closeModal();
            openAffiliateDetail(userId);
        } else {
            showToast(data.error, 'error');
        }
    } catch (err) {
        showToast('Lỗi cập nhật', 'error');
    }
}

// ========== CRM CTV CẦU — 14-column layout with consultation system ==========

// Format deposit input with thousand separators (500000 → 500.000)
function _ctvFormatDepositInput(el) {
    const cursor = el.selectionStart;
    const oldLen = el.value.length;
    const raw = el.value.replace(/\D/g, '');
    el.value = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const newLen = el.value.length;
    const newCursor = cursor + (newLen - oldLen);
    el.setSelectionRange(newCursor, newCursor);
}

const CTV_VN_PROVINCES = [
    'An Giang','Bà Rịa - Vũng Tàu','Bắc Giang','Bắc Kạn','Bạc Liêu','Bắc Ninh','Bến Tre','Bình Định','Bình Dương',
    'Bình Phước','Bình Thuận','Cà Mau','Cần Thơ','Cao Bằng','Đà Nẵng','Đắk Lắk','Đắk Nông','Điện Biên','Đồng Nai',
    'Đồng Tháp','Gia Lai','Hà Giang','Hà Nam','Hà Nội','Hà Tĩnh','Hải Dương','Hải Phòng','Hậu Giang','Hòa Bình',
    'Hưng Yên','Khánh Hòa','Kiên Giang','Kon Tum','Lai Châu','Lâm Đồng','Lạng Sơn','Lào Cai','Long An','Nam Định',
    'Nghệ An','Ninh Bình','Ninh Thuận','Phú Thọ','Phú Yên','Quảng Bình','Quảng Nam','Quảng Ngãi','Quảng Ninh','Quảng Trị',
    'Sóc Trăng','Sơn La','Tây Ninh','Thái Bình','Thái Nguyên','Thanh Hóa','Thừa Thiên Huế','Tiền Giang','TP. Hồ Chí Minh',
    'Trà Vinh','Tuyên Quang','Vĩnh Long','Vĩnh Phúc','Yên Bái'
];
// Birthday countdown helper: returns { html, class } based on days until birthday
function _ctvGetBirthdayDisplay(birthdayStr) {
    if (!birthdayStr) return { html: '<span style="color:var(--gray-600)">—</span>', tdClass: '' };
    const today = new Date();
    // Parse birthday as "day/month" format (e.g. "23/10")
    let day, month;
    if (birthdayStr.includes('/')) {
        const parts = birthdayStr.split('/');
        day = parseInt(parts[0]); month = parseInt(parts[1]);
    } else if (birthdayStr.includes('-')) {
        const parts = birthdayStr.split('-');
        // Could be YYYY-MM-DD or DD-MM
        if (parts.length === 3) { month = parseInt(parts[1]); day = parseInt(parts[2]); }
        else { day = parseInt(parts[0]); month = parseInt(parts[1]); }
    } else {
        return { html: '<span style="color:var(--gray-600)">—</span>', tdClass: '' };
    }
    if (isNaN(day) || isNaN(month)) return { html: '<span style="color:var(--gray-600)">—</span>', tdClass: '' };

    let nextBday = new Date(today.getFullYear(), month - 1, day);
    if (nextBday < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        nextBday = new Date(today.getFullYear() + 1, month - 1, day);
    }
    const diffMs = nextBday - new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const dateStr = `${day}/${month}`;

    if (daysUntil === 0) {
        return { html: `<span class="bday-today">🎉 ${dateStr} <b>HÔM NAY!</b></span>`, tdClass: 'bday-cell-today' };
    } else if (daysUntil === 1) {
        return { html: `<span class="bday-urgent">🎂🔥 ${dateStr} <b>NGÀY MAI</b></span>`, tdClass: 'bday-cell-1' };
    } else if (daysUntil === 2) {
        return { html: `<span class="bday-urgent">🎂🔥 ${dateStr} <small>(${daysUntil} ngày)</small></span>`, tdClass: 'bday-cell-2' };
    } else if (daysUntil === 3) {
        return { html: `<span class="bday-warn">🎂 ${dateStr} <small>(${daysUntil} ngày)</small></span>`, tdClass: 'bday-cell-3' };
    } else if (daysUntil <= 5) {
        return { html: `<span class="bday-near">🎂 ${dateStr} <small>(${daysUntil} ngày)</small></span>`, tdClass: 'bday-cell-5' };
    } else if (daysUntil <= 7) {
        return { html: `<span class="bday-soon">🎂 ${dateStr} <small>(${daysUntil} ngày)</small></span>`, tdClass: 'bday-cell-7' };
    }
    return { html: dateStr, tdClass: '' };
}

// Check if today is the customer's birthday (day+month match, ignore year)
function _ctvIsBirthdayToday(birthdayStr) {
    if (!birthdayStr) return false;
    const today = new Date();
    let day, month;
    if (birthdayStr.includes('/')) {
        const parts = birthdayStr.split('/');
        day = parseInt(parts[0]); month = parseInt(parts[1]);
    } else if (birthdayStr.includes('-')) {
        const parts = birthdayStr.split('-');
        if (parts.length === 3) { month = parseInt(parts[1]); day = parseInt(parts[2]); }
        else { day = parseInt(parts[0]); month = parseInt(parts[1]); }
    } else {
        return false;
    }
    if (isNaN(day) || isNaN(month)) return false;
    return today.getDate() === day && (today.getMonth() + 1) === month;
}

let CTV_CONSULT_TYPES = {
    lam_quen_tuong_tac: { label: 'Làm Quen Tương Tác', icon: '👋', color: '#14b8a6' },
    goi_dien: { label: 'Gọi Điện', icon: '📞', color: '#3b82f6' },
    nhan_tin: { label: 'Nhắn Tin', icon: '💬', color: '#8b5cf6' },
    tuong_tac_ket_noi: { label: 'Tương Tác Kết Nối Lại', icon: '🔗', color: '#6366f1' },
    gap_truc_tiep: { label: 'Gặp Trực Tiếp', icon: '🤝', color: '#10b981' },
    gui_bao_gia: { label: 'Gửi Báo Giá', icon: '📄', color: '#f59e0b' },
    gui_mau: { label: 'Gửi Mẫu Vải/Áo', icon: '👔', color: '#ec4899' },
    thiet_ke: { label: 'Thiết Kế', icon: '🎨', color: '#6366f1' },
    bao_sua: { label: 'Sửa Thiết Kế', icon: '🔧', color: '#ef4444' },
    gui_stk_coc: { label: 'Gửi STK Cọc', icon: '🏦', color: '#f59e0b' },
    giuc_coc: { label: 'Giục Cọc', icon: '⏰', color: '#ea580c' },
    dat_coc: { label: 'Đặt Cọc', icon: '💵', color: '#f97316' },
    chot_don: { label: 'Chốt Đơn', icon: '✅', color: '#22c55e' },
    dang_san_xuat: { label: 'Đang Sản Xuất', icon: '🏭', color: '#8b5cf6' },
    hoan_thanh: { label: 'Hoàn Thành Đơn', icon: '🏆', color: '#0d9488', textColor: 'white' },
    sau_ban_hang: { label: 'Chăm Sóc Sau Bán', icon: '📦', color: '#0ea5e9' },
    cap_cuu_sep: { label: 'Cấp Cứu Sếp', icon: '🚨', color: '#ef4444' },
    huy_coc: { label: 'Hủy Cọc', icon: '🚫', color: '#dc2626' },
    hoan_thanh_cap_cuu: { label: 'Hoàn Thành Cấp Cứu', icon: '🏥', color: '#122546', textColor: '#fad24c' },
    huy: { label: 'Hủy Khách', icon: '❌', color: '#dc2626' },
    giam_gia: { label: 'Giảm Giá', icon: '🎁', color: '#e11d48' },
    tu_van_lai: { label: 'Tư Vấn Lại', icon: '🔄', color: '#0891b2' },
    gui_ct_kh_cu: { label: 'Gửi Chương Trình KH Cũ', icon: '🎟️', color: '#7c3aed' },
};

// Merge dynamic types from consult_type_configs API into CTV_CONSULT_TYPES
async function _ctvSyncConsultTypes() {
    try {
        const data = await apiCall('/api/consult-types?crm_menu=ctv');
        if (data.types && Array.isArray(data.types)) {
            for (const t of data.types) {
                if (!t.key || !t.is_active) continue;
                // Add or update (API types override defaults)
                CTV_CONSULT_TYPES[t.key] = {
                    label: t.label || t.key,
                    icon: t.icon || '📋',
                    color: t.color || '#6b7280',
                    textColor: t.text_color || 'white',
                    maxAppointmentDays: t.max_appointment_days || 0
                };
            }
        }
    } catch(e) { /* silent — fallback to hardcoded */ }
}

async function renderCRMCtvPage(container) {
    let topStaffOptions = '';
    if (['giam_doc', 'quan_ly', 'truong_phong'].includes(currentUser.role)) {
        const staff = await apiCall('/api/managed-staff');
        const staffUsers = (staff.users || []).filter(u => ['nhan_vien', 'truong_phong', 'quan_ly'].includes(u.role));
        topStaffOptions = staffUsers
            .map(u => '<option value="' + u.id + '"' + ((['quan_ly','truong_phong'].includes(currentUser.role)) && u.id === currentUser.id ? ' selected' : '') + '>' + u.full_name + ' (' + (ROLE_LABELS[u.role] || u.role) + ')' + '</option>').join('');
    }

    container.innerHTML = `
        <style>
            .crm-stat-cards { display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap; }
            .crm-stat-card { flex:1; min-width:130px; padding:14px 16px; border-radius:12px; cursor:pointer; transition:all .25s; border:2px solid transparent; position:relative; overflow:hidden; }
            .crm-stat-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,.2); }
            .crm-stat-card.active { border:3px solid #fff; box-shadow:0 0 0 3px var(--navy), 0 8px 30px rgba(18,37,70,.4); transform:translateY(-4px) scale(1.03); z-index:2; }
            .crm-stat-cards.has-active .crm-stat-card:not(.active) { opacity:.55; transform:scale(.97); }
            .crm-stat-card .stat-icon { font-size:24px; margin-bottom:6px; }
            .crm-stat-card .stat-count { font-size:28px; font-weight:900; line-height:1; }
            .crm-stat-card .stat-label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.5px; margin-top:4px; opacity:.8; }
            .crm-stat-card::after { content:''; position:absolute; right:-10px; bottom:-10px; width:60px; height:60px; border-radius:50%; background:rgba(255,255,255,.15); }
            .crm-date-filter { display:none; padding:10px 16px; background:linear-gradient(135deg,#1e293b,#334155); border-radius:10px; margin-bottom:12px; align-items:center; gap:12px; flex-wrap:wrap; animation:crmSlideIn .25s ease; }
            .crm-date-filter.visible { display:flex; }
            .crm-date-filter label { color:#94a3b8; font-size:12px; font-weight:600; margin:0; }
            .crm-date-filter select { background:#0f172a; color:white; border:1px solid #475569; border-radius:6px; padding:5px 10px; font-size:13px; font-weight:600; cursor:pointer; }
            .crm-date-filter select:focus { border-color:#3b82f6; outline:none; }
            .crm-date-filter .df-label { color:#f59e0b; font-size:13px; font-weight:700; }
            @keyframes crmSlideIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
            .crm-section-header td { background:linear-gradient(135deg,#1e293b,#334155); color:white; font-weight:700; font-size:13px; padding:10px 16px !important; border:none; letter-spacing:.5px; }
            .crm-section-header td .section-icon { margin-right:8px; }
            .crm-section-header td .section-count { float:right; background:rgba(255,255,255,.15); padding:2px 10px; border-radius:12px; font-size:11px; }
            .crm-pagination { display:flex; align-items:center; justify-content:center; gap:6px; padding:12px 0; flex-wrap:wrap; }
            .crm-pagination button { min-width:36px; height:36px; border:1px solid #334155; background:#1e293b; color:#94a3b8; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; display:flex; align-items:center; justify-content:center; }
            .crm-pagination button:hover { background:#334155; color:white; }
            .crm-pagination button.active { background:linear-gradient(135deg,#3b82f6,#2563eb); color:white; border-color:#3b82f6; box-shadow:0 2px 8px rgba(59,130,246,.4); }
            .crm-pagination button:disabled { opacity:.4; cursor:not-allowed; }
            .crm-pagination .pg-info { color:#94a3b8; font-size:12px; font-weight:600; margin:0 8px; }
        </style>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <div></div>
            <a href="/quytacnuttuvancrmctv" onclick="event.preventDefault();navigate('quytacnuttuvancrmctv')"
                style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:10px;
                border:2px solid #f97316;color:#f97316;font-size:13px;font-weight:800;cursor:pointer;
                background:rgba(249,115,22,.08);text-decoration:none;transition:all .2s;"
                onmouseover="this.style.background='rgba(249,115,22,.18)';this.style.transform='translateY(-2px)'"
                onmouseout="this.style.background='rgba(249,115,22,.08)';this.style.transform=''">
                ⚙️ Quy Tắc Nút Tư Vấn
            </a>
        </div>
        <div class="crm-stat-cards" id="crmStatCards">
            <div class="crm-stat-card" data-cat="phai_xu_ly" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:white;" onclick="_ctvFilterByCat('phai_xu_ly')">
                <div class="stat-icon">🔥</div>
                <div class="stat-count" id="crmStatPhaiXuLy">0</div>
                <div class="stat-label">Phải xử lý hôm nay</div>
            </div>
            <div class="crm-stat-card" data-cat="da_xu_ly" style="background:linear-gradient(135deg,#10b981,#059669);color:white;" onclick="_ctvFilterByCat('da_xu_ly')">
                <div class="stat-icon">✅</div>
                <div class="stat-count" id="crmStatDaXuLy">0</div>
                <div class="stat-label">Đã xử lý hôm nay</div>
            </div>
            <div class="crm-stat-card" data-cat="xu_ly_tre" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;" onclick="_ctvFilterByCat('xu_ly_tre')">
                <div class="stat-icon">⚠️</div>
                <div class="stat-count" id="crmStatXuLyTre">0</div>
                <div class="stat-label">Khách xử lý trễ</div>
            </div>
            <div class="crm-stat-card" data-cat="cho_xu_ly" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;" onclick="_ctvFilterByCat('cho_xu_ly')">
                <div class="stat-icon">⏳</div>
                <div class="stat-count" id="crmStatChoXuLy">0</div>
                <div class="stat-label">Chờ xử lý</div>
            </div>
            <div class="crm-stat-card" data-cat="huy_khach" style="background:linear-gradient(135deg,#6b7280,#4b5563);color:white;" onclick="_ctvFilterByCat('huy_khach')">
                <div class="stat-icon">🚫</div>
                <div class="stat-count" id="crmStatHuyKhach">0</div>
                <div class="stat-label">Hủy khách</div>
            </div>
        </div>
        <div class="crm-date-filter" id="crmDateFilter">
            <span class="df-label" id="crmDateFilterLabel">📅 Lọc theo:</span>
            <label>Ngày</label>
            <select id="crmDateDay" onchange="_ctvUpdateDateFilterCounts();_ctvRenderFilteredTable()">
                <option value="">Tất Cả</option>
                ${(() => { let o = ''; for (let d = 1; d <= 31; d++) o += '<option value="' + d + '">Ngày ' + d + '</option>'; return o; })()}
            </select>
            <label>Tháng</label>
            <select id="crmDateMonth" onchange="_ctvUpdateDateFilterCounts();_ctvRenderFilteredTable()">
                <option value="" selected>Tất Cả</option>
                ${(() => { let o = ''; for (let m = 1; m <= 12; m++) o += '<option value="' + m + '">Tháng ' + m + '</option>'; return o; })()}
            </select>
            <label>Năm</label>
            <select id="crmDateYear" onchange="_ctvUpdateDateFilterCounts();_ctvRenderFilteredTable()">
                ${(() => { const now = new Date(); let o = ''; for (let y = 2024; y <= now.getFullYear()+1; y++) o += '<option value="' + y + '"' + (y === now.getFullYear() ? ' selected' : '') + '>' + y + '</option>'; return o; })()}
            </select>
            <span id="crmDateFilterCount" style="color:#94a3b8;font-size:12px;margin-left:auto;"></span>
        </div>

        <div style="display:flex; gap:12px; margin-bottom:12px; flex-wrap:wrap; align-items:center;">
            <select id="crmFilterConsultType" class="form-control" style="width:auto;min-width:200px;" onchange="_ctvRenderFilteredTable()">
                <option value="">Tất cả trạng thái</option>
            </select>
            <input type="text" id="crmSearch" class="form-control" placeholder="🔍 Tìm tên hoặc SĐT..." style="width:auto;min-width:200px;">
            ${['giam_doc','quan_ly','truong_phong'].includes(currentUser.role) ? '<select id="crmTopStaffFilter" class="form-control" style="width:auto;min-width:180px;"><option value="">👤 Tất cả NV</option>' + topStaffOptions + '</select>' : ''}
        </div>
        <div class="card">
            <div class="card-body" style="overflow-x:auto; padding:8px;">
                <table class="table crm-ctv-table" id="crmCtvTable">
                    <thead><tr>
                        <th style="min-width:30px;text-align:center;padding:4px 2px" title="Pin khách">📌</th>
                        <th style="min-width:45px;text-align:center">STT</th>
                        <th style="min-width:100px">NV Phụ Trách</th>
                        <th style="min-width:80px">Mã Đơn</th>
                        <th style="min-width:120px">Nút Tư Vấn</th>
                        <th style="min-width:160px">Nội Dung TV</th>
                        <th style="min-width:70px;text-align:center">Lần Chăm</th>
                        <th style="min-width:140px">Ngày Hẹn</th>
                        <th style="min-width:80px">Mã KH</th>
                        <th style="min-width:150px">Tên KH</th>
                        <th style="min-width:110px">SĐT</th>
                        <th style="min-width:110px">Link FB</th>
                        <th style="min-width:130px">Địa Chỉ</th>
                        <th style="min-width:100px">Nguồn</th>
                        <th style="min-width:120px">Người GT</th>
                        <th style="min-width:110px">CRM Người GT</th>
                        <th style="min-width:100px">Chức Danh</th>
                        <th style="min-width:70px;text-align:center">Lần Đặt</th>
                        <th style="min-width:110px;text-align:right">Doanh Số</th>
                    </tr></thead>
                    <tbody id="crmCtvTbody"><tr><td colspan="18" style="text-align:center;padding:40px;">⏳ Đang tải...</td></tr></tbody>
                </table>
                <div id="crmPagination" class="crm-pagination"></div>
            </div>
        </div>
    `;

    document.getElementById('crmFilterConsultType').addEventListener('change', () => _ctvRenderFilteredTable());
    const topStaffEl = document.getElementById('crmTopStaffFilter');
    if (topStaffEl) topStaffEl.addEventListener('change', () => loadCrmCtvData());
    let st;
    document.getElementById('crmSearch').addEventListener('input', () => { clearTimeout(st); st = setTimeout(loadCrmCtvData, 400); });

    await loadCrmCtvData();

    // Auto-select 'Phải xử lý hôm nay' on page load
    _ctvActiveCat = null;
    _ctvFilterByCat('phai_xu_ly');
}

var _ctvActiveCat = null; // null = all, or 'phai_xu_ly'|'moi_chuyen'|'da_xu_ly'|'cho_xu_ly'|'huy_khach'
var _ctvAllCustomers = []; // full list for re-filtering
var _ctvAllStats = {}; // consult stats
var _ctvCurrentPage = 1;
var _ctvPageSize = 50;

function _ctvFilterByCat(cat) {
    if (_ctvActiveCat === cat) { _ctvActiveCat = null; } else { _ctvActiveCat = cat; }
    _ctvCurrentPage = 1; // reset page on category change
    document.querySelectorAll('.crm-stat-card').forEach(c => c.classList.remove('active'));
    const cardsContainer = document.getElementById('crmStatCards');
    if (_ctvActiveCat) {
        const el = document.querySelector('.crm-stat-card[data-cat="' + _ctvActiveCat + '"]');
        if (el) el.classList.add('active');
        if (cardsContainer) cardsContainer.classList.add('has-active');
    } else {
        if (cardsContainer) cardsContainer.classList.remove('has-active');
    }
    // Show/hide date filter for cho_xu_ly and huy_khach
    const dateFilter = document.getElementById('crmDateFilter');
    const dateLabel = document.getElementById('crmDateFilterLabel');
    // Reset date filter to defaults (Tất Cả) when switching cards
    const ms = document.getElementById('crmDateMonth');
    const ys = document.getElementById('crmDateYear');
    const ds = document.getElementById('crmDateDay');
    if (ms) { ms.value = ''; }
    if (ys) { ys.value = new Date().getFullYear(); }
    if (ds) { ds.value = ''; }
    if (dateFilter) {
        if (_ctvActiveCat === 'cho_xu_ly') {
            dateFilter.classList.add('visible');
            if (dateLabel) dateLabel.textContent = '📅 Lọc theo ngày hẹn:';
            _ctvUpdateDateFilterCounts();
        } else if (_ctvActiveCat === 'huy_khach') {
            dateFilter.classList.add('visible');
            if (dateLabel) dateLabel.textContent = '📅 Lọc theo ngày hủy:';
            _ctvUpdateDateFilterCounts();
        } else if (_ctvActiveCat === 'xu_ly_tre') {
            dateFilter.classList.add('visible');
            if (dateLabel) dateLabel.textContent = '📅 Lọc theo ngày hẹn trễ:';
            _ctvUpdateDateFilterCounts();
        } else {
            dateFilter.classList.remove('visible');
        }
    }
    _ctvUpdateConsultTypeDropdown();
    _ctvRenderFilteredTable();
}

function _ctvUpdateDateFilterCounts() {
    const cat = _ctvActiveCat;
    if (cat !== 'cho_xu_ly' && cat !== 'huy_khach' && cat !== 'xu_ly_tre') return;
    const catCustomers = _ctvAllCustomers.filter(c => _ctvGetCategory(c, _ctvAllStats) === cat);

    function getDateField(c) {
        if (cat === 'cho_xu_ly' || cat === 'xu_ly_tre') return c.appointment_date;
        return c.cancel_approved_at || c.created_at;
    }

    const monthYearCounts = {};
    const yearCounts = {};
    catCustomers.forEach(c => {
        const df = getDateField(c);
        if (!df) return;
        const d = new Date(df);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        monthYearCounts[m + '_' + y] = (monthYearCounts[m + '_' + y] || 0) + 1;
        yearCounts[y] = (yearCounts[y] || 0) + 1;
    });

    const monthSel = document.getElementById('crmDateMonth');
    const yearSel = document.getElementById('crmDateYear');
    if (!monthSel || !yearSel) return;
    const selYear = yearSel.value ? parseInt(yearSel.value) : new Date().getFullYear();

    // Calculate total for 'Tất Cả' options
    const totalCat = catCustomers.length;
    let totalInYear = 0;

    for (const opt of monthSel.options) {
        if (!opt.value) { opt.textContent = 'Tất Cả' + (totalCat > 0 ? ' (' + totalCat + ')' : ''); continue; }
        const m = parseInt(opt.value);
        const cnt = monthYearCounts[m + '_' + selYear] || 0;
        opt.textContent = 'Tháng ' + m + (cnt > 0 ? ' (' + cnt + ')' : '');
        totalInYear += cnt;
    }
    for (const opt of yearSel.options) {
        if (!opt.value) { opt.textContent = 'Tất Cả'; continue; }
        const y = parseInt(opt.value);
        const cnt = yearCounts[y] || 0;
        opt.textContent = y + (cnt > 0 ? ' (' + cnt + ')' : '');
    }
}


function _ctvGetCategory(c, stats) {
    // Priority 0.5: Chờ Duyệt Hủy (NV đã ấn hủy, chờ sếp)
    if (c.cancel_requested === 1 && c.cancel_approved === 0) return 'da_xu_ly';

    // Priority 1: Hủy khách (sếp đã duyệt)
    if (c.cancel_approved === 1) return 'huy_khach';

    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
    const s = stats[c.id] || {};

    // Check if consulted today
    let consultedToday = false;
    if (s.lastLog && s.lastLog.created_at) {
        const logDate = new Date(s.lastLog.created_at);
        const logStr = logDate.getFullYear() + '-' + String(logDate.getMonth()+1).padStart(2,'0') + '-' + String(logDate.getDate()).padStart(2,'0');
        consultedToday = (logStr === todayStr);
    }

    // Priority 2: Đã xử lý hôm nay
    if (consultedToday) return 'da_xu_ly';

    // Check appointment date
    let appointIsToday = false;
    let appointIsFuture = false;
    if (c.appointment_date) {
        const apptDate = new Date(c.appointment_date);
        const apptStr = apptDate.getFullYear() + '-' + String(apptDate.getMonth()+1).padStart(2,'0') + '-' + String(apptDate.getDate()).padStart(2,'0');
        appointIsToday = (apptStr === todayStr);
        appointIsFuture = (apptStr > todayStr);
    }

    // Check if today is customer's birthday
    const isBirthdayToday = _ctvIsBirthdayToday(c.birthday);

    // Check created today
    let createdToday = false;
    if (c.created_at) {
        const cDate = new Date(c.created_at);
        const cStr = cDate.getFullYear() + '-' + String(cDate.getMonth()+1).padStart(2,'0') + '-' + String(cDate.getDate()).padStart(2,'0');
        createdToday = (cStr === todayStr);
    }

    // Priority 3: Mới chuyển hôm nay (trước Phải xử lý)
    if (createdToday) return 'moi_chuyen';

    // Priority 4: Phải xử lý hôm nay (appointment today OR birthday today)
    if (appointIsToday || isBirthdayToday) return 'phai_xu_ly';

    // Priority 5: Khách xử lý trễ (appointment was in the past, not consulted today)
    if (c.appointment_date && !appointIsToday && !appointIsFuture) return 'xu_ly_tre';

    // Priority 6: Chờ xử lý (future appointment or remaining)
    if (appointIsFuture) return 'cho_xu_ly';

    // Default: chờ xử lý
    return 'cho_xu_ly';
}

function _ctvUpdateConsultTypeDropdown(filteredList) {
    const sel = document.getElementById('crmFilterConsultType');
    if (!sel) return;
    const prevVal = sel.value;

    // Use provided filtered list or default to category-filtered
    let custs = filteredList;
    if (!custs) {
        custs = _ctvAllCustomers;
        if (_ctvActiveCat) {
            custs = _ctvAllCustomers.filter(c => _ctvGetCategory(c, _ctvAllStats) === _ctvActiveCat);
        }
    }

    // Count consult types from last log
    const typeCounts = {};
    let noLogCount = 0;
    custs.forEach(c => {
        const s = _ctvAllStats[c.id] || {};
        if (s.lastLog && s.lastLog.log_type) {
            const lt = s.lastLog.log_type;
            typeCounts[lt] = (typeCounts[lt] || 0) + 1;
        } else {
            noLogCount++;
        }
    });

    // Build options
    let html = '<option value="">Tất cả trạng thái (' + custs.length + ')</option>';
    // Sort by count desc
    const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([key, count]) => {
        const t = CTV_CONSULT_TYPES[key];
        if (t) {
            html += '<option value="' + key + '">' + t.icon + ' ' + t.label + ' (' + count + ')</option>';
        }
    });
    if (noLogCount > 0) {
        html += '<option value="__none__">📋 Chưa tư vấn (' + noLogCount + ')</option>';
    }
    sel.innerHTML = html;

    // Restore previous selection if still exists
    if (prevVal) {
        const exists = [...sel.options].some(o => o.value === prevVal);
        if (exists) sel.value = prevVal;
    }
}
function _ctvRenderFilteredTable() {
    const customers = _ctvAllCustomers;
    const stats = _ctvAllStats;
    const tbody = document.getElementById('crmCtvTbody');
    
    let filtered = customers;
    if (_ctvActiveCat) {
        if (_ctvActiveCat === 'phai_xu_ly') {
            // Include both phai_xu_ly and moi_chuyen
            filtered = customers.filter(c => {
                const cat = _ctvGetCategory(c, stats);
                return cat === 'phai_xu_ly' || cat === 'moi_chuyen';
            });
        } else {
            filtered = customers.filter(c => _ctvGetCategory(c, stats) === _ctvActiveCat);
        }
    }

    // Apply date filter for cho_xu_ly and huy_khach (BEFORE consult type filter)
    const isDateCat = (_ctvActiveCat === 'cho_xu_ly' || _ctvActiveCat === 'huy_khach' || _ctvActiveCat === 'xu_ly_tre');
    if (isDateCat) {
        const selDay = document.getElementById('crmDateDay')?.value;
        const selMonth = document.getElementById('crmDateMonth')?.value;
        const selYear = document.getElementById('crmDateYear')?.value;
        const hasMonth = selMonth && parseInt(selMonth);
        const hasYear = selYear && parseInt(selYear);
        const hasDay = selDay && parseInt(selDay);
        if (hasYear || hasMonth || hasDay) {
            filtered = filtered.filter(c => {
                let dateField;
                if (_ctvActiveCat === 'cho_xu_ly' || _ctvActiveCat === 'xu_ly_tre') {
                    dateField = c.appointment_date;
                } else {
                    dateField = c.cancel_approved_at || c.created_at;
                }
                if (!dateField) return false;
                const d = new Date(dateField);
                if (hasYear && d.getFullYear() !== parseInt(selYear)) return false;
                if (hasMonth && d.getMonth() + 1 !== parseInt(selMonth)) return false;
                if (hasDay && d.getDate() !== parseInt(selDay)) return false;
                return true;
            });
        }
    }

    // Update consult type dropdown AFTER date filter
    _ctvUpdateConsultTypeDropdown(filtered);

    // Card counts always show TOTAL (not date-filtered)

    // Apply consult type filter
    const consultTypeVal = document.getElementById('crmFilterConsultType')?.value;
    if (consultTypeVal) {
        if (consultTypeVal === '__none__') {
            filtered = filtered.filter(c => {
                const s = stats[c.id] || {};
                return !s.lastLog || !s.lastLog.log_type;
            });
        } else {
            filtered = filtered.filter(c => {
                const s = stats[c.id] || {};
                return s.lastLog && s.lastLog.log_type === consultTypeVal;
            });
        }
    }



    // Sort: pinned first, then by appointment_date ASC
    filtered = [...filtered].sort((a, b) => {
        // Pinned customers always first
        const pinA = a.is_pinned ? 1 : 0;
        const pinB = b.is_pinned ? 1 : 0;
        if (pinA !== pinB) return pinB - pinA;
        // Both pinned: most recent pin first
        if (pinA && pinB) return new Date(b.pinned_at || 0) - new Date(a.pinned_at || 0);
        if (_ctvActiveCat === 'huy_khach') {
            const dateA = a.cancel_approved_at || a.created_at;
            const dateB = b.cancel_approved_at || b.created_at;
            return new Date(dateB || 0) - new Date(dateA || 0);
        }
        // All other categories: nearest appointment_date first
        const dateA = a.appointment_date;
        const dateB = b.appointment_date;
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return new Date(dateA) - new Date(dateB);
    });

    // Update count display
    const countEl = document.getElementById('crmDateFilterCount');
    if (countEl && isDateCat) {
        countEl.textContent = 'Kết quả: ' + filtered.length;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="19"><div class="empty-state"><div class="icon">📭</div><h3>Không có khách hàng</h3></div></td></tr>`;
        document.getElementById('crmPagination').innerHTML = '';
        return;
    }

    // Pagination
    const totalPages = Math.ceil(filtered.length / _ctvPageSize);
    if (_ctvCurrentPage > totalPages) _ctvCurrentPage = totalPages;
    const startIdx = (_ctvCurrentPage - 1) * _ctvPageSize;
    const paged = filtered.slice(startIdx, startIdx + _ctvPageSize);

    // Split table into two sections for phai_xu_ly
    if (_ctvActiveCat === 'phai_xu_ly') {
        const moiChuyenRows = paged.filter(c => _ctvGetCategory(c, stats) === 'moi_chuyen');
        const phaiXuLyRows = paged.filter(c => _ctvGetCategory(c, stats) === 'phai_xu_ly');
        let html = '';
        let stt = startIdx + 1;
        if (moiChuyenRows.length > 0) {
            html += `<tr class="crm-section-header"><td colspan="19"><span class="section-icon">📥</span>Mới chuyển hôm nay<span class="section-count">${moiChuyenRows.length}</span></td></tr>`;
            html += moiChuyenRows.map(c => _ctvRenderCustomerRow(c, stats, stt++)).join('');
        }
        if (phaiXuLyRows.length > 0) {
            html += `<tr class="crm-section-header"><td colspan="19"><span class="section-icon">🔥</span>Phải xử lý hôm nay<span class="section-count">${phaiXuLyRows.length}</span></td></tr>`;
            html += phaiXuLyRows.map(c => _ctvRenderCustomerRow(c, stats, stt++)).join('');
        }
        tbody.innerHTML = html;
    } else {
        tbody.innerHTML = paged.map((c, idx) => _ctvRenderCustomerRow(c, stats, startIdx + idx + 1)).join('');
    }

    // Render pagination
    const pgEl = document.getElementById('crmPagination');
    if (totalPages <= 1) { pgEl.innerHTML = ''; return; }
    let pgHtml = '<button ' + (_ctvCurrentPage <= 1 ? 'disabled' : '') + ' onclick="_ctvGoToPage(' + (_ctvCurrentPage - 1) + ')">◀</button>';
    for (let p = 1; p <= totalPages; p++) {
        pgHtml += '<button class="' + (p === _ctvCurrentPage ? 'active' : '') + '" onclick="_ctvGoToPage(' + p + ')">' + p + '</button>';
    }
    pgHtml += '<button ' + (_ctvCurrentPage >= totalPages ? 'disabled' : '') + ' onclick="_ctvGoToPage(' + (_ctvCurrentPage + 1) + ')">▶</button>';
    pgHtml += '<span class="pg-info">' + (startIdx+1) + '–' + Math.min(startIdx + _ctvPageSize, filtered.length) + ' / ' + filtered.length + '</span>';
    pgEl.innerHTML = pgHtml;
}

function _ctvGoToPage(page) {
    _ctvCurrentPage = page;
    _ctvRenderFilteredTable();
    // Scroll to table top
    document.getElementById('crmCtvTable')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// _crmDateShowAll removed - filtering now uses dropdown values directly

function _ctvRenderCustomerRow(c, stats, stt) {
    const s = stats[c.id] || { consultCount: 0, chotDonCount: 0, lastLog: null, revenue: 0 };
    const OVERRIDE_STATUSES = ['tu_van_lai', 'cho_duyet_huy', 'duyet_huy'];
    let lastType = s.lastLog ? CTV_CONSULT_TYPES[s.lastLog.log_type] : null;
    // Override: special cancel statuses always show their own label
    if (OVERRIDE_STATUSES.includes(c.order_status) && CTV_CONSULT_TYPES[c.order_status]) {
        lastType = CTV_CONSULT_TYPES[c.order_status];
    }
    let lastContent = s.lastLog?.content || '';
    if (lastContent && lastType) {
        lastContent = lastContent.replace(/^(?:✅|🏥|📦|💵|📝|📢|🚨|🚫|❌|🔧|🎨|👔|📄|🤝|💬|📞|✔️)?\s*(?:Tư vấn Sếp|Cấp cứu hoàn thành|Chốt đơn|Đặt cọc|Sau bán hàng|Hoàn Thành Cấp Cứu|Cấp Cứu Sếp)[:\s]+/i, '').trim();
    }
    const shortContent = lastContent.length > 30 ? lastContent.substring(0, 30) + '...' : lastContent;

    let appointDisplay = '';
    if (c.appointment_date) {
        const d = new Date(c.appointment_date);
        const days = ['CN','T2','T3','T4','T5','T6','T7'];
        const dayName = days[d.getDay()];
        appointDisplay = `<span style="color:#e65100;font-weight:600">${dayName} - ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}</span>`;
    }

    const _pinClass = c.is_pinned ? ' crm-row-pinned' : '';
    return `<tr class="${_pinClass}">
        <td style="text-align:center;padding:4px 2px;">
            ${!c.readonly ? `<span class="crm-pin-btn ${c.is_pinned ? 'active' : ''}" onclick="event.stopPropagation();_ctvTogglePin(${c.id})" title="${c.is_pinned ? 'Bỏ pin' : 'Pin khách'}">${c.is_pinned ? '📌' : '<span style="opacity:0.3">📌</span>'}</span>` : ''}
        </td>
        <td style="text-align:center;font-weight:700;color:#64748b;font-size:12px;">${stt || ''}</td>
        <td style="font-size:12px;font-weight:600;">${c.assigned_to_name || '<span style="color:var(--gray-500)">—</span>'}</td>
        <td style="font-size:11px;font-weight:700;color:#e65100;cursor:pointer;" onclick="_ctvOpenOrderCodesPopup(${c.id})">${s.latestOrderCode || '—'}</td>
        <td>
            ${c.readonly ? (
                (c.cancel_requested === 1 && c.cancel_approved === 0) ? `
                <span style="font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;background:var(--gray-700);color:var(--gray-400);opacity:0.6;cursor:not-allowed;">
                    ⏳ Chờ Duyệt Hủy
                </span>
            ` : (c.cancel_approved === -2) ? `
                <span style="font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;background:#dc2626;color:white;opacity:0.6;cursor:not-allowed;">
                    ❌ Hủy Khách (nhắc lại)
                </span>
            ` : (c.cancel_approved === -1) ? `
                <span style="font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;background:${lastType?.color || '#f59e0b'};color:${lastType?.textColor || 'white'};opacity:0.6;cursor:not-allowed;">
                    ${lastType ? lastType.icon + ' ' + lastType.label : '🔄 Tư Vấn Lại'}
                </span>
            ` : `
                <span style="font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;background:${lastType?.color || 'var(--gray-600)'};color:${lastType?.textColor || 'white'};opacity:0.6;cursor:not-allowed;">
                    ${lastType ? lastType.icon + ' ' + lastType.label : '📋 Tư Vấn'}
                </span>
            `) : (c.cancel_requested === 1 && c.cancel_approved === 0) ? `
                <button class="btn btn-sm" disabled style="font-size:11px;padding:4px 8px;background:var(--gray-700);color:var(--gray-400);cursor:not-allowed;">
                    ⏳ Chờ Duyệt Hủy
                </button>
            ` : (c.cancel_approved === -2) ? `
                <button class="btn btn-sm consult-btn" onclick="_ctvOpenConsultModal(${c.id})" 
                    style="font-size:11px;padding:4px 8px;background:#dc2626;color:white;animation:emBlink 2s infinite;">
                    ❌ Hủy Khách
                </button>
            ` : (c.cancel_approved === -1) ? `
                <button class="btn btn-sm consult-btn" onclick="_ctvOpenConsultModal(${c.id})" 
                    style="font-size:11px;padding:4px 8px;background:${lastType?.color || '#f59e0b'};color:${lastType?.textColor || 'white'};animation:emBlink 2s infinite;">
                    ${lastType ? lastType.icon + ' ' + lastType.label : '🔄 Tư Vấn Lại'}
                </button>
            ` : `
                <button class="btn btn-sm consult-btn" onclick="_ctvOpenConsultModal(${c.id})" 
                    style="font-size:11px;padding:4px 8px;background:${lastType?.color || 'var(--gray-600)'};color:${lastType?.textColor || 'white'};">
                    ${lastType ? lastType.icon + ' ' + lastType.label : '📋 Tư Vấn'}
                </button>
            `}
        </td>
        <td style="font-size:12px;color:#e65100;font-weight:600;cursor:pointer;" onclick="_ctvOpenCustomerDetail(${c.id}).then(()=>setTimeout(()=>_ctvSwitchCDTab('history'),100))" title="${lastContent}">
            ${shortContent || '<span style="color:var(--gray-500)">—</span>'}
        </td>
        <td style="text-align:center;font-weight:700;color:#122546;font-size:14px;">${s.consultCount}</td>
        <td style="font-size:12px;">
            ${appointDisplay || '<span style="color:var(--gray-500)">—</span>'}
        </td>
        <td><strong style="color:#e65100">${getCustomerCode(c)}</strong></td>
        <td>
            ${!c.readonly ? '<button class="btn btn-sm" onclick="event.stopPropagation();_ctvOpenCustomerInfo(' + c.id + ')" style="font-size:9px;padding:1px 5px;margin-right:4px;background:var(--gray-700);color:var(--gold);" title="Cập nhật thông tin">✏️</button>' : ''}
            ${(() => {
                const _colors = [
                    {bg:'rgba(239,68,68,0.12)',text:'#dc2626',border:'rgba(239,68,68,0.25)'},
                    {bg:'rgba(249,115,22,0.12)',text:'#ea580c',border:'rgba(249,115,22,0.25)'},
                    {bg:'rgba(234,179,8,0.12)',text:'#ca8a04',border:'rgba(234,179,8,0.25)'},
                    {bg:'rgba(34,197,94,0.12)',text:'#16a34a',border:'rgba(34,197,94,0.25)'},
                    {bg:'rgba(20,184,166,0.12)',text:'#0d9488',border:'rgba(20,184,166,0.25)'},
                    {bg:'rgba(6,182,212,0.12)',text:'#0891b2',border:'rgba(6,182,212,0.25)'},
                    {bg:'rgba(59,130,246,0.12)',text:'#2563eb',border:'rgba(59,130,246,0.25)'},
                    {bg:'rgba(139,92,246,0.12)',text:'#7c3aed',border:'rgba(139,92,246,0.25)'},
                    {bg:'rgba(236,72,153,0.12)',text:'#db2777',border:'rgba(236,72,153,0.25)'},
                    {bg:'rgba(244,63,94,0.12)',text:'#e11d48',border:'rgba(244,63,94,0.25)'},
                ];
                const _ci = (c.id || 0) % _colors.length;
                const _cc = _colors[_ci];
                const _bdayIcon = _ctvIsBirthdayToday(c.birthday) ? '🎂🎉 ' : '';
                return `<span onclick="_ctvOpenCustomerDetail(${c.id})" style="cursor:pointer;display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;background:${_cc.bg};color:${_cc.text};border:1px solid ${_cc.border};transition:all 0.2s;white-space:nowrap;" onmouseover="this.style.boxShadow='0 2px 8px ${_cc.border}'" onmouseout="this.style.boxShadow='none'">${_bdayIcon}${c.customer_name}</span>`;
            })()}
        </td>
        <td>${c.readonly ? '<span style="color:var(--gray-400)">' + c.phone + '</span>' : '<a href="tel:' + c.phone + '" style="color:var(--info)">' + c.phone + '</a>'}</td>
        <td style="font-size:11px;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.facebook_link ? '<a href="' + c.facebook_link + '" target="_blank" style="color:#1877F2;font-weight:600;" title="' + c.facebook_link + '">🔗 FB</a>' : '<span style="color:var(--gray-600)">—</span>'}</td>
        <td style="font-size:12px">${c.address || '<span style="color:var(--gray-600)">—</span>'}</td>
        <td style="font-size:12px">${c.source_name || '—'}</td>
        <td style="font-size:12px;${currentUser.role === 'giam_doc' ? 'cursor:pointer;' : ''}" onclick="${currentUser.role === 'giam_doc' && !c.referrer_id ? '_ctvOpenReferrerSearch(' + c.id + ')' : ''}">
            ${c.referrer_id ? `<span style="cursor:pointer;text-decoration:underline;color:var(--info);font-weight:600;" onclick="event.stopPropagation();_ctvOpenAffiliateDetail(${c.referrer_id})">${c.referrer_name || c.referrer_customer_name}</span>` : (currentUser.role === 'giam_doc' ? '<span style="color:var(--gray-500)" title="Click để tìm">🔍 Tìm</span>' : '<span style="color:var(--gray-500)">—</span>')}
        </td>
        <td style="font-size:11px">${(c.referrer_user_crm_type || c.referrer_crm_type) ? (CRM_LABELS[c.referrer_user_crm_type || c.referrer_crm_type] || c.referrer_user_crm_type || c.referrer_crm_type) : '—'}</td>
        <td style="font-size:12px;font-weight:600;color:#122546;">${c.job || '<span style="color:var(--gray-600)">—</span>'}</td>
        <td style="text-align:center;font-weight:700;color:#122546;font-size:14px;">${s.chotDonCount}</td>
        <td style="text-align:right;font-weight:700;color:var(--success);font-size:14px;">${s.revenue > 0 ? formatCurrency(s.revenue) : '0'}</td>
    </tr>`;
}

async function loadCrmCtvData() {
    // Sync dynamic consult types from API (adds any new types created in settings)
    await _ctvSyncConsultTypes();

    let url = '/api/customers?crm_type=ctv';
    const search = document.getElementById('crmSearch')?.value;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    const topStaff = document.getElementById('crmTopStaffFilter')?.value;
    if (topStaff) url += `&employee_id=${topStaff}`;

    const data = await apiCall(url);
    const tbody = document.getElementById('crmCtvTbody');

    // Include ALL customers (including cancelled) for categorization
    const customers = data.customers || [];

    // Affiliate: readonly + mask phone for child referrals
    if (currentUser.role === 'tkaffiliate') {
        customers.forEach(c => {
            c.readonly = true;
            if (c.referrer_id && c.referrer_id !== currentUser.id && c.phone && c.phone.length >= 4) {
                c.phone = c.phone.substring(0, 2) + 'xx xxx xx' + c.phone.substring(c.phone.length - 1);
            }
        });
    }

    // Fetch consultation stats in batch
    const ids = customers.map(c => c.id).join(',');
    let stats = {};
    if (ids) {
        const statsData = await apiCall(`/api/customers/consult-stats?customer_ids=${ids}`);
        stats = statsData.stats || {};
    }

    // Store for re-filtering
    _ctvAllCustomers = customers;
    _ctvAllStats = stats;

    // Count categories
    const counts = { phai_xu_ly: 0, moi_chuyen: 0, da_xu_ly: 0, xu_ly_tre: 0, cho_xu_ly: 0, huy_khach: 0 };
    customers.forEach(c => { const cat = _ctvGetCategory(c, stats); counts[cat]++; });

    // Update stat cards - show TOTAL counts (not monthly filtered)
    const el = (id) => document.getElementById(id);
    if (el('crmStatPhaiXuLy')) el('crmStatPhaiXuLy').textContent = counts.phai_xu_ly + counts.moi_chuyen;
    if (el('crmStatDaXuLy')) el('crmStatDaXuLy').textContent = counts.da_xu_ly;
    if (el('crmStatXuLyTre')) el('crmStatXuLyTre').textContent = counts.xu_ly_tre;
    if (el('crmStatChoXuLy')) el('crmStatChoXuLy').textContent = counts.cho_xu_ly;
    if (el('crmStatHuyKhach')) el('crmStatHuyKhach').textContent = counts.huy_khach;

    // Re-highlight active card
    document.querySelectorAll('.crm-stat-card').forEach(c => c.classList.remove('active'));
    if (_ctvActiveCat) {
        const activeEl = document.querySelector('.crm-stat-card[data-cat="' + _ctvActiveCat + '"]');
        if (activeEl) activeEl.classList.add('active');
    }

    // Update consult type dropdown
    _ctvUpdateConsultTypeDropdown();

    // Render table
    // Auto-select 'Phải xử lý hôm nay' on first load
    if (!_ctvActiveCat) {
        _ctvFilterByCat('phai_xu_ly');
    } else {
        _ctvRenderFilteredTable();
    }
}

function applyCrmCtvFilter() { loadCrmCtvData(); }

// ========== PIN KHÁCH HÀNG ==========
async function _ctvTogglePin(customerId) {
    try {
        const res = await apiCall(`/api/customers/${customerId}/pin`, 'PATCH');
        if (res.success) {
            // Update local data
            const c = _ctvAllCustomers.find(x => x.id === customerId);
            if (c) {
                c.is_pinned = res.is_pinned;
                c.pinned_at = res.is_pinned ? new Date().toISOString() : null;
                if (res.next_appointment) c.appointment_date = res.next_appointment;
            }
            _ctvRenderFilteredTable();
            showToast(res.message, res.is_pinned ? 'success' : 'info');
        } else {
            showToast(res.error || 'Lỗi!', 'error');
        }
    } catch(e) {
        showToast('Lỗi pin khách hàng!', 'error');
    }
}

// CSS for pinned rows
(function() {
    const style = document.createElement('style');
    style.textContent = `
        .crm-row-pinned {
            background: linear-gradient(90deg, rgba(245,158,11,0.10), transparent) !important;
            border-left: 3px solid #f59e0b !important;
        }
        .crm-row-pinned:hover {
            background: linear-gradient(90deg, rgba(245,158,11,0.18), transparent) !important;
        }
        .crm-pin-btn {
            cursor: pointer;
            font-size: 15px;
            transition: all 0.2s;
            display: inline-block;
        }
        .crm-pin-btn:hover {
            transform: scale(1.3);
        }
        .crm-pin-btn.active {
            filter: drop-shadow(0 0 4px #f59e0b);
            animation: pinPulse 2s infinite;
        }
        @keyframes pinPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
        }
    `;
    document.head.appendChild(style);
})();
function resetCrmCtvFilter() {
    _ctvActiveCat = null;
    document.querySelectorAll('.crm-stat-card').forEach(c => c.classList.remove('active'));
    document.getElementById('crmFilterConsultType').value = '';
    document.getElementById('crmSearch').value = '';
    const topStaff = document.getElementById('crmTopStaffFilter');
    if (topStaff) topStaff.value = '';
    loadCrmCtvData();
}

// ========== CONSULTATION MODAL ==========
async function _ctvOpenConsultModal(customerId) {
    window._currentConsultCustomerId = customerId;
    // Check if customer has a pending emergency
    let pendingEmergency = null;
    let handlerOptions = '';
    let customerInfo = {};
    let existingItems = [];
    let consultLogs = [];
    try {
        // Load all data in parallel
        const [pendingData, hData, custData, logData] = await Promise.all([
            apiCall(`/api/emergencies/pending/${customerId}`).catch(() => ({})),
            apiCall('/api/emergencies/handlers').catch(() => ({})),
            apiCall(`/api/customers/${customerId}`).catch(() => ({})),
            apiCall(`/api/customers/${customerId}/consult-logs`).catch(() => ({}))
        ]);
        if (pendingData.hasPending) pendingEmergency = pendingData.emergency;
        const ROLE_LABELS_H = { giam_doc: 'Giám Đốc', quan_ly: 'Quản Lý', truong_phong: 'Trưởng Phòng' };
        handlerOptions = (hData.handlers || [])
            .map(u => '<option value="' + u.id + '"' + (pendingEmergency && pendingEmergency.handler_id === u.id ? ' selected' : '') + '>' + u.full_name + ' (' + (ROLE_LABELS_H[u.role] || u.role) + ')</option>')
            .join('');
        customerInfo = custData.customer || {};
        existingItems = custData.items || [];
        window._currentConsultCustomerPinned = !!customerInfo.is_pinned;
        consultLogs = logData.logs || [];
    } catch(e) {}
    const grandTotal = existingItems.reduce((s, i) => s + (i.total || 0), 0);

    // Load flow rules from API for dynamic allowed types
    let flowRules = {};
    let maxDaysPerStatus = {};
    try {
        const frData = await apiCall('/api/consult-flow-rules?crm_menu=ctv');
        flowRules = frData.rules || {};
        maxDaysPerStatus = frData.maxDaysPerStatus || {};
    } catch(e) {}

    // Determine allowed types based on order_status and consultation history
    const orderStatus = customerInfo.order_status || 'dang_tu_van';
    const allTypes = Object.entries(CTV_CONSULT_TYPES);

    // Helper: get allowed types from flow rules for a given status
    function _getFlowRuleTypes(status) {
        const rules = flowRules[status];
        if (!rules || rules.length === 0) return null;
        return rules
            .map(r => [r.to_type_key, CTV_CONSULT_TYPES[r.to_type_key]])
            .filter(([k, v]) => v); // only include types that exist
    }

    // Check if customer already has a sau_ban_hang consultation
    const hasSauBanHang = consultLogs.some(l => l.log_type === 'sau_ban_hang');

    let allowedTypes;
    // ★ Use last consultation log type (represents actual workflow state)
    const lastLogEntry = consultLogs.length > 0 ? consultLogs[0] : null;
    // Override: special cancel statuses always take priority over last log
    const OVERRIDE_STATUSES_MODAL = ['tu_van_lai', 'cho_duyet_huy', 'duyet_huy'];
    const effectiveStatus = OVERRIDE_STATUSES_MODAL.includes(orderStatus) ? orderStatus : (lastLogEntry ? lastLogEntry.log_type : orderStatus);
    const frTypes = _getFlowRuleTypes(effectiveStatus);

    // ★ PRIORITY 1: Dynamic flow rules from last log type (always wins if configured)
    if (frTypes) {
        allowedTypes = frTypes;
    } else if (hasSauBanHang && orderStatus === 'sau_ban_hang') {
        allowedTypes = _getFlowRuleTypes('sau_ban_hang') || allTypes.filter(([k]) => ['tuong_tac_ket_noi'].includes(k));
    } else if (orderStatus === 'tuong_tac_ket_noi') {
        allowedTypes = _getFlowRuleTypes('tuong_tac_ket_noi') || allTypes.filter(([k]) => ['gui_ct_kh_cu'].includes(k));
    } else if (orderStatus === 'gui_ct_kh_cu') {
        allowedTypes = _getFlowRuleTypes('gui_ct_kh_cu') || allTypes.filter(([k]) => ['lam_quen_tuong_tac','goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua','gui_stk_coc','giuc_coc','dat_coc'].includes(k));
    } else if (orderStatus === 'lam_quen_tuong_tac') {
        allowedTypes = _getFlowRuleTypes('lam_quen_tuong_tac') || allTypes.filter(([k]) => ['lam_quen_tuong_tac','goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke'].includes(k));
    } else if (orderStatus === 'hoan_thanh') {
        allowedTypes = _getFlowRuleTypes('hoan_thanh') || allTypes.filter(([k]) => ['sau_ban_hang'].includes(k));
    } else if (orderStatus === 'chot_don') {
        allowedTypes = _getFlowRuleTypes('chot_don') || allTypes.filter(([k]) => ['dang_san_xuat','hoan_thanh','cap_cuu_sep'].includes(k));
    } else if (orderStatus === 'dat_coc') {
        allowedTypes = _getFlowRuleTypes('dat_coc') || allTypes.filter(([k]) => ['chot_don','cap_cuu_sep','huy_coc'].includes(k));
    } else if (orderStatus === 'gui_stk_coc') {
        const fr = _getFlowRuleTypes('gui_stk_coc');
        if (fr) { allowedTypes = fr; }
        else { const order = ['giuc_coc','dat_coc','nhan_tin','cap_cuu_sep']; allowedTypes = order.map(k => [k, CTV_CONSULT_TYPES[k]]).filter(([,v]) => v); }
    } else if (orderStatus === 'huy_coc') {
        allowedTypes = _getFlowRuleTypes('huy_coc') || allTypes.filter(([k]) => ['tuong_tac_ket_noi','nhan_tin','goi_dien','gap_truc_tiep','cap_cuu_sep'].includes(k));
    } else if (orderStatus === 'duyet_huy') {
        allowedTypes = _getFlowRuleTypes('duyet_huy') || allTypes.filter(([k]) => ['nhan_tin'].includes(k));
    } else if (orderStatus === 'tu_van_lai') {
        allowedTypes = _getFlowRuleTypes('tu_van_lai') || allTypes.filter(([k]) => ['giam_gia','thiet_ke'].includes(k));
    } else if (orderStatus === 'giam_gia') {
        allowedTypes = _getFlowRuleTypes('giam_gia') || allTypes.filter(([k]) => ['goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua','gui_stk_coc','giuc_coc','dat_coc'].includes(k));
    } else {
        // Fallback: consultation phase types only
        const normalTypes = ['lam_quen_tuong_tac','goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua','gui_stk_coc','giuc_coc','dat_coc','cap_cuu_sep','huy'];
        allowedTypes = allTypes.filter(([k]) => normalTypes.includes(k));
    }

    // Pre-select next logical type
    const lastLog = consultLogs.length > 0 ? consultLogs[0] : null;

    // Override: after Hoàn Thành Cấp Cứu → show full consultation types with Giảm Giá
    if (lastLog && lastLog.log_type === 'hoan_thanh_cap_cuu') {
        allowedTypes = allTypes.filter(([k]) => ['giam_gia','lam_quen_tuong_tac','goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua','gui_stk_coc','giuc_coc','dat_coc'].includes(k));
    }

    // Override: if customer has a PENDING emergency → lock to cap_cuu_sep only
    if (pendingEmergency) {
        allowedTypes = allTypes.filter(([k]) => k === 'cap_cuu_sep');
    }

    // Override: if customer cancel was auto-reverted (24h no response) → lock to Hủy Khách only
    if (customerInfo.cancel_approved === -2) {
        allowedTypes = allTypes.filter(([k]) => k === 'huy');
    }

    // ★ Use admin-configured flow rule defaults (⭐ Mặc định from Quy Tắc Liên Kết)
    const effectiveRules = flowRules[effectiveStatus] || [];
    const defaultRule = effectiveRules.find(r => r.is_default);
    let defaultType = defaultRule ? defaultRule.to_type_key : (allowedTypes.length > 0 ? allowedTypes[0][0] : 'goi_dien');

    // ★ Store section key + max days for max_appointment_days enforcement in _ctvOnConsultTypeChange
    window._currentConsultSectionKey = effectiveStatus;
    window._currentConsultMaxDays = maxDaysPerStatus[effectiveStatus] || 0;

    // Force overrides (system logic, takes priority over flow rules)
    if (pendingEmergency) defaultType = 'cap_cuu_sep';
    if (customerInfo.cancel_approved === -2) defaultType = 'huy';

    const typeOptions = allowedTypes.map(([k, v]) =>
        `<option value="${k}" ${k === defaultType ? 'selected' : ''}>${v.icon} ${v.label}</option>`
    ).join('');

    // Collapsible consultation history (grouped by month)
    const historyHTML = consultLogs.length > 0 ? `
        <div style="margin-bottom:12px;">
            <button type="button" onclick="_ctvToggleConsultHistory()" style="background:none;border:1px solid var(--gray-200);border-radius:6px;padding:5px 12px;font-size:11px;color:var(--gray-500);cursor:pointer;display:flex;align-items:center;gap:4px;width:100%;">
                📜 Xem lịch sử (${consultLogs.length}) <span id="historyArrow" style="margin-left:auto;">▼</span>
            </button>
            <div id="consultHistoryPanel" style="display:none;max-height:300px;overflow-y:auto;padding:10px;background:var(--gray-50);border-radius:0 0 8px 8px;border:1px solid var(--gray-200);border-top:none;">
                ${_ctvBuildGroupedHistoryHTML(consultLogs, { compact: true })}
            </div>
        </div>
    ` : '';

    const bodyHTML = `
        ${historyHTML}
        <div class="form-group">
            <label>Loại Tư Vấn <span style="color:var(--danger)">*</span></label>
            <select id="consultType" class="form-control" onchange="_ctvOnConsultTypeChange()">
                ${typeOptions}
            </select>
        </div>
        <div class="form-group" id="consultDepositGroup" style="display:none;">
            <label>Số Tiền Đặt Cọc <span style="color:var(--danger)">*</span></label>
            <input type="text" id="consultDepositAmount" class="form-control" placeholder="Nhập số tiền đặt cọc..." 
                style="font-size:14px;font-weight:600;color:#e65100;"
                oninput="_ctvFormatDepositInput(this)">
        </div>
        <div class="form-group" id="consultContentGroup">
            <label>Nội Dung Tư Vấn <span style="color:var(--danger)">*</span></label>
            <textarea id="consultContent" class="form-control" rows="3" placeholder="Nhập nội dung tư vấn..."></textarea>
        </div>
        <div class="form-group" id="consultImageGroup">
            <label>Hình Ảnh <span id="consultImageReq" style="color:var(--danger)">*</span> (Ctrl+V để dán)</label>
            <div id="consultImageArea" class="image-paste-area" tabindex="0">
                <div id="consultImagePlaceholder">📋 Click vào đây rồi Ctrl+V để dán hình ảnh</div>
                <img id="consultImagePreview" style="display:none;max-width:100%;max-height:200px;border-radius:8px;">
                <input type="file" id="consultImageFile" accept="image/*" style="display:none">
                <button id="consultImageRemove" class="btn btn-sm" style="display:none;position:absolute;top:8px;right:8px;background:var(--danger);color:white;font-size:11px;padding:2px 8px;" onclick="_ctvRemoveConsultImage()">✕</button>
            </div>
        </div>
        <div class="form-group" id="consultNextTypeGroup" style="display:none">
            <label>Tư Vấn Tiếp Theo <span style="color:var(--danger)">*</span></label>
            <select id="consultNextType" class="form-control" onchange="_ctvUpdateApptLabel()">
                ${Object.entries(CTV_CONSULT_TYPES).filter(([k]) => ['goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua','dat_coc','chot_don','cap_cuu_sep','huy'].includes(k)).map(([k, v]) =>
                    `<option value="${k}" ${k === (lastLog?.next_consult_type || 'goi_dien') ? 'selected' : ''}>${v.icon} ${v.label}</option>`
                ).join('')}
            </select>
        </div>
        <div class="form-group" id="consultAppointmentGroup">
            <label>Ngày Hẹn Làm Việc <span style="color:var(--danger)">*</span></label>
            <input type="date" id="consultAppointment" class="form-control" min="${(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); })()}">
        </div>
        <div class="form-group" id="consultCancelGroup" style="display:none">
            <label>Lý Do Hủy <span style="color:var(--danger)">*</span></label>
            <textarea id="consultCancelReason" class="form-control" rows="3" placeholder="Nhập lý do hủy khách hàng..."></textarea>
            <div style="margin-top:8px;padding:10px;background:rgba(220,38,38,0.15);border-radius:6px;border:1px solid rgba(220,38,38,0.3);font-size:12px;color:#fca5a5;">
                ⚠️ Hủy khách hàng sẽ cần Quản Lý/Giám Đốc duyệt.
            </div>
        </div>
        <div class="form-group" id="consultHandlerGroup" style="display:none">
            <label>Chọn Người Xử Lý <span style="color:var(--danger)">*</span></label>
            <select id="consultHandler" class="form-control" ${pendingEmergency ? 'disabled style="opacity:0.7;cursor:not-allowed;background:var(--gray-100);"' : ''}>
                ${pendingEmergency ? '' : '<option value="">-- Chọn Sếp --</option>'}
                ${handlerOptions}
            </select>
            <div style="margin-top:8px;padding:10px;background:rgba(239,68,68,0.1);border-radius:6px;font-size:12px;color:#fca5a5;">
                🚨 Khách hàng sẽ hiện ở trang Cấp Cứu Sếp của người được chọn.
            </div>
        </div>
        ${pendingEmergency ? `
        <div style="margin:12px 0;padding:12px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);border-radius:8px;">
            <div style="font-size:13px;font-weight:700;color:#fca5a5;margin-bottom:4px;">🚨 Khách đang có cấp cứu sếp chưa giải quyết</div>
            <div style="font-size:11px;color:#94a3b8;">Ấn "GHI NHẬN" sẽ nhắc lại cho sếp xử lý. Ngày hẹn tự động đặt sang ngày mai.</div>
        </div>` : ''}
        <div id="consultOrderGroup" style="display:none">
            <div class="form-group" id="consultOrderCodeGroup" style="display:none;">
                <label>Mã Đơn <span style="color:var(--gray-500);font-size:11px;">(Tự động)</span></label>
                <input type="text" id="consultOrderCode" class="form-control" readonly style="background:var(--gray-100);font-weight:700;color:var(--navy);font-size:16px;cursor:not-allowed;border:2px solid var(--gold);">
            </div>
            <div class="form-group">
                <label>SĐT Khách Hàng</label>
                <input type="text" id="consultPhone" class="form-control" value="${customerInfo.phone || ''}" maxlength="10" pattern="[0-9]{10}" oninput="this.value=this.value.replace(/[^0-9]/g,'')" placeholder="10 chữ số">
            </div>
            <div class="form-group">
                <label>Đơn Hàng <span style="color:var(--danger)">*</span></label>
                <table class="table" style="font-size:13px;" id="consultOrderTable">
                    <thead><tr><th>Mô tả</th><th style="width:80px">SL</th><th style="width:120px">Đơn giá</th><th style="width:120px">Thành tiền</th><th style="width:50px"></th></tr></thead>
                    <tbody>
                        ${existingItems.length > 0 ? existingItems.map(it => `<tr>
                            <td><input class="form-control oi-desc" value="${it.description||''}" style="font-size:13px;padding:6px 8px;"></td>
                            <td><input type="number" class="form-control oi-qty" value="${it.quantity||0}" min="0" style="font-size:13px;padding:6px 8px;width:70px;"></td>
                            <td><input type="text" class="form-control oi-price" value="${formatCurrency(it.unit_price||0)}" style="font-size:13px;padding:6px 8px;" oninput="_ctvFormatDepositInput(this);_ctvCalcConsultOrderTotal()"></td>
                            <td class="oi-total" style="text-align:right;font-weight:600">${formatCurrency(it.total)}</td>
                            <td><button class="btn btn-sm" onclick="this.closest('tr').remove();_ctvCalcConsultOrderTotal();" style="color:var(--danger)">✕</button></td>
                        </tr>`).join('') : ''}
                    </tbody>
                </table>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
                    <button class="btn btn-sm" onclick="_ctvAddConsultOrderRow()" style="font-size:12px;">➕ Thêm dòng</button>
                    <div style="text-align:right;">
                        <div style="font-size:16px;font-weight:700;">Tổng: <span id="consultOrderTotal" style="color:#d4a843;font-size:18px;">${formatCurrency(grandTotal)}</span> VNĐ</div>
                        <div id="consultDepositInfo" style="display:none;margin-top:4px;font-size:13px;">
                            <span style="color:#6b7280;">Đã cọc:</span> <span id="consultDepositDisplay" style="color:#10b981;font-weight:600;">0</span> VNĐ
                            <br><span style="color:#6b7280;">Còn lại:</span> <span id="consultRemainingDisplay" style="color:#e65100;font-weight:700;font-size:15px;">0</span> VNĐ
                        </div>
                    </div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group">
                    <label>Địa Chỉ Cụ Thể <span style="color:var(--danger)">*</span></label>
                    <input type="text" id="consultAddress" class="form-control" value="${customerInfo.address || ''}" placeholder="Nhập địa chỉ cụ thể">
                </div>
                <div class="form-group">
                    <label>Thành Phố <span style="color:var(--danger)">*</span></label>
                    <select id="consultCity" class="form-control">
                        <option value="">-- Chọn tỉnh/thành --</option>
                        ${CTV_VN_CTV_PROVINCES.map(p => `<option value="${p}" ${customerInfo.province === p ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group" style="display:none">
                <label>Tư Vấn Tiếp Theo <span style="color:var(--danger)">*</span></label>
                <select id="consultChotDonNextType" class="form-control" onchange="_ctvUpdateChotDonApptLabel()">
                    <option value="dang_san_xuat">🏭 Đang Sản Xuất</option>
                    <option value="hoan_thanh">🏆 Hoàn Thành Đơn</option>
                </select>
            </div>
            <div class="form-group">
                <label id="consultChotDonApptLabel">Ngày Hẹn Làm Việc Khách <span style="color:var(--danger)">*</span></label>
                <input type="date" id="consultSBHDate" class="form-control" min="${(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); })()}">
            </div>
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-primary" id="consultSubmitBtn" onclick="_ctvSubmitConsultLog(${customerId})" style="width:auto;">📝 GHI NHẬN</button>
    `;

    openModal('📋 Ghi Nhận Tư Vấn', bodyHTML, footerHTML);

    // Setup image paste + trigger initial type change
    setTimeout(() => {
        const area = document.getElementById('consultImageArea');
        if (area) {
            area.addEventListener('paste', _ctvHandleConsultImagePaste);
            area.addEventListener('click', () => area.focus());
        }
        document.querySelectorAll('#consultOrderTable .oi-qty, #consultOrderTable .oi-price').forEach(el => el.addEventListener('input', calcConsultOrderTotal));
        _ctvOnConsultTypeChange(); // trigger to show/hide correct fields
    }, 100);
}

window._consultImageBlob = null;

function _ctvHandleConsultImagePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            e.preventDefault();
            const blob = item.getAsFile();
            window._consultImageBlob = blob;
            const reader = new FileReader();
            reader.onload = (ev) => {
                document.getElementById('consultImagePreview').src = ev.target.result;
                document.getElementById('consultImagePreview').style.display = 'block';
                document.getElementById('consultImagePlaceholder').style.display = 'none';
                document.getElementById('consultImageRemove').style.display = 'block';
            };
            reader.readAsDataURL(blob);
            break;
        }
    }
}

function _ctvRemoveConsultImage() {
    window._consultImageBlob = null;
    document.getElementById('consultImagePreview').style.display = 'none';
    document.getElementById('consultImagePlaceholder').style.display = 'block';
    document.getElementById('consultImageRemove').style.display = 'none';
}

function _ctvOnConsultTypeChange() {
    const type = document.getElementById('consultType').value;
    const cancelGroup = document.getElementById('consultCancelGroup');
    const contentGroup = document.getElementById('consultContentGroup');
    const imageGroup = document.getElementById('consultImageGroup');
    const appointmentGroup = document.getElementById('consultAppointmentGroup');
    const orderGroup = document.getElementById('consultOrderGroup');
    const handlerGroup = document.getElementById('consultHandlerGroup');
    const imageReq = document.getElementById('consultImageReq');

    // Reset all
    if (cancelGroup) cancelGroup.style.display = 'none';
    if (handlerGroup) handlerGroup.style.display = 'none';
    if (orderGroup) orderGroup.style.display = 'none';
    const depositGroup = document.getElementById('consultDepositGroup');
    if (depositGroup) depositGroup.style.display = 'none';
    if (contentGroup) contentGroup.style.display = 'block';
    if (imageGroup) imageGroup.style.display = 'block';
    if (appointmentGroup) appointmentGroup.style.display = 'block';


    // Reset labels back to default FIRST (before applying max_appointment_days)
    const contentLabel = contentGroup?.querySelector('label');
    if (contentLabel) contentLabel.innerHTML = 'Nội Dung Tư Vấn <span style="color:var(--danger)">*</span>';
    const contentArea = document.getElementById('consultContent');
    if (contentArea) contentArea.placeholder = 'Nhập nội dung tư vấn...';
    const apptLabel = appointmentGroup?.querySelector('label');
    if (apptLabel) apptLabel.innerHTML = 'Ngày Hẹn Tiếp Theo <span style="color:var(--danger)">*</span>';

    // ★ Apply max_appointment_days from SECTION config (customer's current status, not selected button)
    const apptInput = document.getElementById('consultAppointment');
    if (apptInput) {
        const today = new Date();
        const todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
        apptInput.min = todayStr;
        // Use SECTION's maxAppointmentDays (from flow rules API, inherits group leader)
        const maxDays = window._currentConsultMaxDays || 0;
        if (maxDays > 0) {
            const maxDate = new Date();
            maxDate.setDate(maxDate.getDate() + maxDays);
            apptInput.max = maxDate.getFullYear() + '-' + String(maxDate.getMonth()+1).padStart(2,'0') + '-' + String(maxDate.getDate()).padStart(2,'0');
            // Update label to show max days
            const apptLabelEl = appointmentGroup?.querySelector('label');
            if (apptLabelEl) apptLabelEl.innerHTML = `Ngày Hẹn Tiếp Theo <span style="color:var(--danger)">*</span> <span style="font-size:10px;color:#f59e0b;font-weight:600;">(tối đa ${maxDays} ngày)</span>`;
        } else {
            apptInput.removeAttribute('max');
        }
    }

    // Pinned customers: override label + disable datepicker (AFTER all resets)
    if (window._currentConsultCustomerPinned) {
        const _apptInput2 = document.getElementById('consultAppointment');
        if (_apptInput2) { _apptInput2.disabled = true; _apptInput2.style.opacity = '0.5'; }
        const _apptLbl2 = appointmentGroup?.querySelector('label');
        if (_apptLbl2) _apptLbl2.innerHTML = '📌 Ngày Hẹn Tiếp Theo <span style="color:#f59e0b;font-size:11px;">(Pin khách — tự động ngày làm việc tiếp theo)</span>';
    }

    const nextTypeGroup = document.getElementById('consultNextTypeGroup');
    if (nextTypeGroup) nextTypeGroup.style.display = 'none';

    // Image required: hide * for goi_dien, dat_coc, cap_cuu_sep, sau_ban_hang
    const imageOptionalTypes = ['goi_dien', 'dat_coc', 'cap_cuu_sep', 'sau_ban_hang'];
    if (imageReq) imageReq.style.display = imageOptionalTypes.includes(type) ? 'none' : 'inline';

    // HỦY flow
    if (type === 'huy') {
        if (cancelGroup) cancelGroup.style.display = 'block';
        if (contentGroup) contentGroup.style.display = 'none';
        if (imageGroup) imageGroup.style.display = 'none';
        if (appointmentGroup) appointmentGroup.style.display = 'none';
        if (nextTypeGroup) nextTypeGroup.style.display = 'none';
    }

    // Đặt Cọc flow — show Mã Đơn + deposit amount + content + image + appointment
    if (type === 'dat_coc') {
        if (contentGroup) contentGroup.style.display = 'block';
        if (imageGroup) imageGroup.style.display = 'block';
        if (appointmentGroup) appointmentGroup.style.display = 'block';
        // Show deposit amount field
        const depositGroup = document.getElementById('consultDepositGroup');
        if (depositGroup) depositGroup.style.display = 'block';
        // Show only the Mã Đơn field from orderGroup
        const ocGroup = document.getElementById('consultOrderCodeGroup');
        if (ocGroup) ocGroup.style.display = 'block';
        _ctvFetchOrderCode();
    }

    // Chốt Đơn flow
    if (type === 'chot_don') {
        if (orderGroup) orderGroup.style.display = 'block';
        if (contentGroup) contentGroup.style.display = 'none';
        if (imageGroup) imageGroup.style.display = 'none';
        if (appointmentGroup) appointmentGroup.style.display = 'none';
        if (nextTypeGroup) nextTypeGroup.style.display = 'none';
        // Fetch order code (reuses existing from đặt cọc if any)
        _ctvFetchOrderCode();
        // Fetch deposit amount from dat_coc log
        window._currentDepositAmount = 0;
        const customerId = window._currentConsultCustomerId;
        if (customerId) {
            apiCall(`/api/customers/${customerId}/consult`).then(data => {
                const datCocLog = (data.logs || []).find(l => l.log_type === 'dat_coc' && l.deposit_amount > 0);
                if (datCocLog) {
                    window._currentDepositAmount = datCocLog.deposit_amount;
                    _ctvCalcConsultOrderTotal();
                }
            });
        }
    }

    // Cấp Cứu Sếp flow
    if (type === 'cap_cuu_sep') {
        if (handlerGroup) handlerGroup.style.display = 'block';
        if (appointmentGroup) appointmentGroup.style.display = 'none';
        if (nextTypeGroup) nextTypeGroup.style.display = 'none';
    }

    // Sau Bán Hàng flow - just content + appointment
    if (type === 'sau_ban_hang') {
        if (imageGroup) imageGroup.style.display = 'none';
    }

    // Hoàn Thành Đơn flow - content + appointment
    if (type === 'hoan_thanh') {
        if (imageGroup) imageGroup.style.display = 'none';
        if (appointmentGroup) appointmentGroup.style.display = 'block';
    }

    // Hủy Cọc flow - content (lý do) + appointment date
    if (type === 'huy_coc') {
        if (contentGroup) contentGroup.style.display = 'block';
        if (imageGroup) imageGroup.style.display = 'none';
        if (appointmentGroup) appointmentGroup.style.display = 'block';
        // Relabel
        const contentLabel = contentGroup?.querySelector('label');
        if (contentLabel) contentLabel.innerHTML = 'Lý Do Hủy Cọc <span style="color:var(--danger)">*</span>';
        const contentArea = document.getElementById('consultContent');
        if (contentArea) contentArea.placeholder = 'Nhập lý do hủy cọc...';
        const apptLabel = appointmentGroup?.querySelector('label');
        if (apptLabel) apptLabel.innerHTML = 'Ngày Hẹn Làm Việc <span style="color:var(--danger)">*</span>';
    }
}

function _ctvUpdateApptLabel() {
    const sel = document.getElementById('consultNextType');
    const apptGroup = document.getElementById('consultAppointmentGroup');
    if (!sel || !apptGroup) return;
    const val = sel.value;
    const typeInfo = CTV_CONSULT_TYPES[val];
    const label = typeInfo ? typeInfo.label : 'Tiếp Theo';
    const apptLabel = apptGroup.querySelector('label');
    if (apptLabel) apptLabel.innerHTML = `Ngày Hẹn ${label} <span style="color:var(--danger)">*</span>`;
}

function _ctvUpdateChotDonApptLabel() {
    const sel = document.getElementById('consultChotDonNextType');
    const lbl = document.getElementById('consultChotDonApptLabel');
    if (!sel || !lbl) return;
    const labels = { dang_san_xuat: 'Đang Sản Xuất', hoan_thanh: 'Hoàn Thành Đơn' };
    lbl.innerHTML = `Ngày Hẹn ${labels[sel.value] || 'Hoàn Thành Đơn'} <span style="color:var(--danger)">*</span>`;
}

// ========== SHARED GROUPED HISTORY BUILDER ==========
function _ctvBuildGroupedHistoryHTML(logs, options = {}) {
    const { compact = false } = options;
    if (logs.length === 0) return compact ? '' : '<div style="text-align:center;padding:40px 20px;"><div style="font-size:40px;margin-bottom:8px;">📭</div><div style="color:#94a3b8;font-size:14px;">Chưa có lịch sử tư vấn</div></div>';

    const now = new Date();
    const currentKey = `${now.getMonth()+1}/${now.getFullYear()}`;

    // Group by month/year
    const groups = {};
    logs.forEach(log => {
        const d = new Date(log.created_at);
        const key = `${d.getMonth()+1}/${d.getFullYear()}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(log);
    });

    const MONTH_NAMES = ['','Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

    return Object.entries(groups).map(([key, items]) => {
        const [m, y] = key.split('/');
        const isCurrentMonth = key === currentKey;
        const groupId = 'hg_' + key.replace('/', '_') + '_' + Math.random().toString(36).slice(2,6);

        const logsHTML = items.map((log, idx) => {
            const t = CTV_CONSULT_TYPES[log.log_type] || { icon: '📋', label: log.log_type, color: '#6b7280' };
            const d = new Date(log.created_at);
            const days = ['CN','T2','T3','T4','T5','T6','T7'];
            const dayName = days[d.getDay()];
            const dateStr = compact
                ? `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`
                : `${dayName} ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
            const userName = log.logged_by_name || 'N/A';

            if (compact) {
                let extra = '';
                if (log.content) {
                    const sc = log.content.length > 80 ? log.content.substring(0,80)+'...' : log.content;
                    extra += `<div style="font-size:10px;color:var(--gray-500);margin-top:2px;padding-left:18px;">📝 ${sc}</div>`;
                }
                if (log.image_path) {
                    extra += `<div style="margin-top:3px;padding-left:18px;"><img src="${log.image_path}" style="max-width:80px;max-height:50px;border-radius:4px;border:1px solid var(--gray-200);cursor:pointer;" onclick="window.open('${log.image_path}','_blank')"></div>`;
                }
                return `<div style="font-size:11px;padding:4px 0;border-bottom:1px solid var(--gray-100);">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                        <span style="color:${t.color};font-weight:600;">${t.icon} ${t.label}</span>
                        <span style="color:var(--gray-400);font-size:10px;text-align:right;">${dateStr}<br><span style="color:#8b5cf6;font-weight:500;">${userName}</span></span>
                    </div>
                    ${extra}
                </div>`;
            } else {
                const isLast = idx === items.length - 1;
                return `<div style="display:flex;gap:12px;position:relative;padding-bottom:${isLast ? '4' : '16'}px;">
                    <!-- Timeline line -->
                    ${!isLast ? `<div style="position:absolute;left:15px;top:32px;bottom:0;width:2px;background:linear-gradient(to bottom,${t.color}22,#e2e8f0);"></div>` : ''}
                    <!-- Timeline dot -->
                    <div style="flex-shrink:0;width:32px;height:32px;border-radius:50%;background:${t.color};display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px ${t.color}44;z-index:1;">
                        ${t.icon}
                    </div>
                    <!-- Card -->
                    <div style="flex:1;min-width:0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;transition:box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 2px 12px rgba(0,0,0,0.06)'" onmouseout="this.style.boxShadow='none'">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:${log.content || log.image_path ? '8' : '0'}px;">
                            <span style="font-size:12px;font-weight:700;color:${t.color};background:${t.color}12;padding:2px 10px;border-radius:6px;">${t.label}</span>
                            <div style="text-align:right;flex-shrink:0;">
                                <div style="font-size:11px;color:#94a3b8;">${dateStr}</div>
                                <div style="font-size:11px;color:#8b5cf6;font-weight:600;">${userName}</div>
                            </div>
                        </div>
                        ${log.content ? `<div style="font-size:13px;color:#1e293b;line-height:1.5;padding:8px 12px;background:white;border-radius:8px;border:1px solid #f1f5f9;">${log.content}</div>` : ''}
                        ${log.image_path ? `<div style="margin-top:8px;"><img src="${log.image_path}" style="max-width:200px;max-height:140px;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer;transition:transform 0.15s;" onclick="window.open('${log.image_path}','_blank')" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform=''"></div>` : ''}
                    </div>
                </div>`;
            }
        }).join('');

        const headerStyle = compact
            ? 'cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:#122546;color:#fad24c;border-radius:6px;font-size:12px;font-weight:700;margin-bottom:4px;'
            : 'cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:linear-gradient(135deg,#0f172a,#1e3a5f);color:#fff;border-radius:10px;font-size:13px;font-weight:700;margin-bottom:12px;';

        return `<div style="margin-bottom:${compact ? '6' : '8'}px;">
            <div style="${headerStyle}" onclick="var p=document.getElementById('${groupId}');p.style.display=p.style.display==='none'?'block':'none';this.querySelector('.hg-arrow').textContent=p.style.display==='none'?'▶':'▼';">
                <span>📅 ${MONTH_NAMES[Number(m)]} ${y} <span style="background:rgba(250,210,76,0.2);color:#fad24c;padding:2px 8px;border-radius:10px;font-size:11px;margin-left:6px;">${items.length}</span></span>
                <span class="hg-arrow" style="font-size:12px;">${isCurrentMonth ? '▼' : '▶'}</span>
            </div>
            <div id="${groupId}" style="display:${isCurrentMonth ? 'block' : 'none'};">
                ${logsHTML}
            </div>
        </div>`;
    }).join('');
}

// ========== SHARED ORDER CARD BUILDER ==========
function _ctvBuildOrderCardHTML(codes, customer) {
    if (codes.length === 0) return '<p style="color:#6b7280;text-align:center;padding:20px;">Chưa có mã đơn nào</p>';

    let allOrdersTotal = 0;

    const cardsHTML = codes.map(oc => {
        const d = new Date(oc.created_at);
        const dateStr = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
        const orderItems = oc.items || [];
        const orderDeposit = oc.deposit || 0;
        const orderTotal = orderItems.reduce((s, i) => s + (i.total || 0), 0);
        if (oc.status !== 'cancelled') allOrdersTotal += orderTotal;
        const statusBadge = oc.status === 'completed' 
            ? '<span style="background:#10b981;color:white;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;">✅ Hoàn thành</span>'
            : oc.status === 'cancelled'
            ? '<span style="background:#ef4444;color:white;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;">❌ Đã hủy</span>'
            : '<span style="background:#f59e0b;color:white;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;">🔄 Đang xử lý</span>';
        
        const actionBtns = '';

        return `
            <div style="padding:12px;border:1px solid ${oc.status === 'completed' ? '#10b981' : oc.status === 'cancelled' ? '#ef4444' : '#e5e7eb'};border-radius:10px;margin-bottom:8px;background:${oc.status === 'completed' ? '#f0fdf4' : oc.status === 'cancelled' ? '#fef2f2' : '#fafafa'};">
                <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:8px;">
                    <div style="min-width:90px;">
                        <div style="font-size:10px;color:#6b7280;">Mã Đơn</div>
                        <div style="font-weight:700;color:#e65100;font-size:15px;">${oc.order_code}</div>
                    </div>
                    <div style="min-width:80px;">
                        <div style="font-size:10px;color:#6b7280;">NV Tạo</div>
                        <div style="font-weight:600;color:#122546;font-size:12px;">${oc.user_name || '—'}</div>
                    </div>
                    <div style="min-width:80px;">
                        <div style="font-size:10px;color:#6b7280;">Ngày</div>
                        <div style="font-weight:600;color:#122546;font-size:12px;">${dateStr}</div>
                    </div>
                    <div>${statusBadge}</div>
                </div>
                ${orderItems.length > 0 ? `
                    <table style="width:100%;font-size:12px;border-collapse:collapse;border-radius:6px;overflow:hidden;">
                        <thead><tr style="background:#122546;">
                            <th style="text-align:left;padding:6px 8px;color:#fad24c;font-weight:700;">TÊN SP</th>
                            <th style="text-align:center;padding:6px 8px;color:#fad24c;font-weight:700;width:45px;">SL</th>
                            <th style="text-align:right;padding:6px 8px;color:#fad24c;font-weight:700;width:90px;">GIÁ</th>
                            <th style="text-align:right;padding:6px 8px;color:#fad24c;font-weight:700;width:100px;">THÀNH TIỀN</th>
                            <th style="text-align:right;padding:6px 8px;color:#fad24c;font-weight:700;width:90px;">CỌC</th>
                            <th style="text-align:right;padding:6px 8px;color:#fad24c;font-weight:700;width:100px;">CÒN LẠI</th>
                        </tr></thead>
                        <tbody>
                            ${orderItems.map(it => {
                                const itemDeposit = orderItems.length === 1 ? orderDeposit : Math.round(orderDeposit * (it.total || 0) / orderTotal);
                                const itemRemain = Math.max(0, (it.total || 0) - itemDeposit);
                                return `<tr style="border-top:1px solid #e5e7eb;">
                                    <td style="padding:5px 8px;color:#122546;">${it.description || '—'}</td>
                                    <td style="padding:5px 8px;text-align:center;color:#122546;font-weight:600;">${it.quantity}</td>
                                    <td style="padding:5px 8px;text-align:right;color:#122546;">${formatCurrency(it.unit_price || 0)}đ</td>
                                    <td style="padding:5px 8px;text-align:right;font-weight:600;color:#e65100;">${formatCurrency(it.total)}đ</td>
                                    <td style="padding:5px 8px;text-align:right;color:#10b981;font-weight:600;">${orderDeposit > 0 ? formatCurrency(itemDeposit) + 'đ' : '—'}</td>
                                    <td style="padding:5px 8px;text-align:right;font-weight:700;color:#e65100;">${orderDeposit > 0 ? formatCurrency(itemRemain) + 'đ' : formatCurrency(it.total) + 'đ'}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                    <div style="text-align:right;font-size:13px;font-weight:600;margin-top:4px;color:#122546;">Tổng đơn: <span style="color:#e65100;">${formatCurrency(orderTotal)}</span> VNĐ${orderDeposit > 0 ? ` | Cọc: <span style="color:#10b981;">${formatCurrency(orderDeposit)}</span> VNĐ` : ''}</div>
                ` : '<p style="color:#9ca3af;font-size:12px;text-align:center;">Chưa có sản phẩm</p>'}
                ${actionBtns}
            </div>
        `;
    }).join('');

    return cardsHTML + (allOrdersTotal > 0 ? `<div style="text-align:right;font-size:16px;font-weight:700;margin-top:8px;padding-top:8px;border-top:2px solid #e5e7eb;">Tổng doanh số: <span style="color:#e65100;">${formatCurrency(allOrdersTotal)}</span> VNĐ</div>` : '');
}

// ========== ORDER CODES POPUP ==========
async function _ctvOpenOrderCodesPopup(customerId) {
    // Open full customer detail popup with "Đơn Hàng" tab pre-selected
    await _ctvOpenCustomerDetail(customerId);
    setTimeout(() => _ctvSwitchCDTab('orders'), 100);
}

// Per-order completion
async function _ctvCompleteOrder(orderId, customerId) {
    if (!confirm('Xác nhận hoàn thành đơn này? Hoa hồng sẽ được tính cho affiliate.')) return;
    try {
        const res = await apiCall(`/api/order-codes/${orderId}/complete`, 'POST');
        if (res.success) {
            showToast('✅ ' + res.message);
            closeModal();
            _ctvOpenOrderCodesPopup(customerId);
        } else {
            showToast(res.error, 'error');
        }
    } catch(e) { showToast('Lỗi: ' + (e.message || ''), 'error'); }
}

// Per-order cancellation
async function _ctvCancelOrder(orderId, customerId) {
    if (!confirm('Xác nhận hủy đơn này?')) return;
    try {
        const res = await apiCall(`/api/order-codes/${orderId}/cancel`, 'POST');
        if (res.success) {
            showToast('🚫 ' + res.message);
            closeModal();
            _ctvOpenOrderCodesPopup(customerId);
        } else {
            showToast(res.error, 'error');
        }
    } catch(e) { showToast('Lỗi: ' + (e.message || ''), 'error'); }
}

// Toggle collapsible history panel
function _ctvToggleConsultHistory() {
    const panel = document.getElementById('consultHistoryPanel');
    const arrow = document.getElementById('historyArrow');
    if (panel) {
        const isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? 'block' : 'none';
        if (arrow) arrow.textContent = isHidden ? '▲' : '▼';
    }
}

// Fetch order code for current customer (always generates new)
function _ctvFetchOrderCode() {
    const ocGroup = document.getElementById('consultOrderCodeGroup');
    const ocInput = document.getElementById('consultOrderCode');
    if (!ocGroup || !ocInput) return;
    ocInput.value = 'Đang tải...';
    ocGroup.style.display = 'block';
    const customerId = window._currentConsultCustomerId;
    apiCall(`/api/order-codes/next${customerId ? '?customer_id=' + customerId : ''}`).then(res => {
        if (res.order_code) {
            ocInput.value = res.order_code;
            // New order = clear items table
            const tbody = document.querySelector('#consultOrderTable tbody');
            if (tbody) {
                tbody.innerHTML = '';
                _ctvAddConsultOrderRow();
            }
            // Reset totals
            const totalEl = document.getElementById('consultOrderTotal');
            if (totalEl) totalEl.textContent = '0';
            const depInfo = document.getElementById('consultDepositInfo');
            if (depInfo) depInfo.style.display = 'none';
        } else {
            ocInput.value = 'Chưa cài mã đơn';
        }
    }).catch(() => { ocInput.value = 'Lỗi tải mã'; });
}

// Order table helpers for Chốt Đơn
function _ctvAddConsultOrderRow() {
    const tbody = document.querySelector('#consultOrderTable tbody');
    tbody.insertAdjacentHTML('beforeend', `<tr>
        <td><input class="form-control oi-desc" value="" style="font-size:13px;padding:6px 8px;"></td>
        <td><input type="number" class="form-control oi-qty" value="0" min="0" style="font-size:13px;padding:6px 8px;width:70px;" oninput="_ctvCalcConsultOrderTotal()"></td>
        <td><input type="text" class="form-control oi-price" value="0" style="font-size:13px;padding:6px 8px;" oninput="_ctvFormatDepositInput(this);_ctvCalcConsultOrderTotal()"></td>
        <td class="oi-total" style="text-align:right;font-weight:600">0</td>
        <td><button class="btn btn-sm" onclick="this.closest('tr').remove();_ctvCalcConsultOrderTotal();" style="color:var(--danger)">✕</button></td>
    </tr>`);
}

function _ctvCalcConsultOrderTotal() {
    let grand = 0;
    document.querySelectorAll('#consultOrderTable tbody tr').forEach(row => {
        const qty = Number(row.querySelector('.oi-qty')?.value) || 0;
        const price = Number((row.querySelector('.oi-price')?.value || '').replace(/\./g, '')) || 0;
        const total = qty * price;
        row.querySelector('.oi-total').textContent = formatCurrency(total);
        grand += total;
    });
    const el = document.getElementById('consultOrderTotal');
    if (el) el.textContent = formatCurrency(grand);
    // Update deposit subtraction
    const deposit = window._currentDepositAmount || 0;
    const depositInfo = document.getElementById('consultDepositInfo');
    if (deposit > 0 && depositInfo) {
        depositInfo.style.display = 'block';
        document.getElementById('consultDepositDisplay').textContent = formatCurrency(deposit);
        document.getElementById('consultRemainingDisplay').textContent = formatCurrency(Math.max(0, grand - deposit));
    }
}

// Disable submit button to prevent double-click
function _ctvDisableSubmitBtn() {
    const btn = document.getElementById('consultSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang xử lý...'; }
}
function _ctvEnableSubmitBtn() {
    const btn = document.getElementById('consultSubmitBtn');
    if (btn) { btn.disabled = false; btn.textContent = '📝 GHI NHẬN'; }
}

async function _ctvSubmitConsultLog(customerId) {
    // Debounce: disable button immediately
    _ctvDisableSubmitBtn();
    const log_type = document.getElementById('consultType').value;
    const content = document.getElementById('consultContent')?.value;
    const appointment_date = document.getElementById('consultAppointment')?.value;

    // ========== HỦY flow ==========
    if (log_type === 'huy') {
        const reason = document.getElementById('consultCancelReason')?.value;
        if (!reason) { showToast('Vui lòng nhập lý do hủy!', 'error'); _ctvEnableSubmitBtn(); return; }
        try {
            const data = await apiCall(`/api/customers/${customerId}/cancel`, 'POST', { reason });
            if (data.success) { showToast('✅ ' + data.message); closeModal(); loadCrmCtvData(); }
            else { showToast(data.error || 'Lỗi!', 'error'); _ctvEnableSubmitBtn(); }
        } catch (err) { showToast('Lỗi kết nối!', 'error'); _ctvEnableSubmitBtn(); }
        return;
    }

    // ========== Cấp Cứu Sếp flow ==========
    if (log_type === 'cap_cuu_sep') {
        const handler_id = document.getElementById('consultHandler')?.value;
        if (!content) { showToast('Vui lòng nhập nội dung tình huống!', 'error'); _ctvEnableSubmitBtn(); return; }
        if (!handler_id) { showToast('Vui lòng chọn Sếp xử lý!', 'error'); _ctvEnableSubmitBtn(); return; }
        try {
            // Upload image first via consultation
            const formData = new FormData();
            formData.append('log_type', 'cap_cuu_sep');
            formData.append('content', content);
            if (window._consultImageBlob) {
                formData.append('image', window._consultImageBlob, 'screenshot.png');
            }
            await fetch(`/api/customers/${customerId}/consult`, { method: 'POST', body: formData });

            // Create emergency
            const data = await apiCall('/api/emergencies', 'POST', {
                customer_id: customerId, reason: content, handler_id: Number(handler_id)
            });
            if (data.success) {
                showToast('🚨 ' + data.message); closeModal(); window._consultImageBlob = null; loadCrmCtvData();
            } else { showToast(data.error || 'Lỗi!', 'error'); _ctvEnableSubmitBtn(); }
        } catch (err) { showToast('Lỗi kết nối!', 'error'); _ctvEnableSubmitBtn(); }
        return;
    }

    // ========== Đặt Cọc flow ==========
    if (log_type === 'dat_coc') {
        const depositAmount = Number((document.getElementById('consultDepositAmount')?.value || '').replace(/\./g, '')) || 0;
        if (depositAmount <= 0) {
            showToast('Vui lòng nhập số tiền đặt cọc!', 'error'); _ctvEnableSubmitBtn(); return;
        }
        const contentText = content || `Đặt cọc: ${formatCurrency(depositAmount)} VNĐ`;

        try {

            // Submit consultation log
            const formData = new FormData();
            formData.append('log_type', 'dat_coc');
            formData.append('content', contentText);
            formData.append('deposit_amount', depositAmount);
            if (appointment_date) formData.append('appointment_date', appointment_date);
            if (window._consultImageBlob) {
                formData.append('image', window._consultImageBlob, 'screenshot.png');
            }
            const res = await fetch(`/api/customers/${customerId}/consult`, { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                showToast('✅ Đặt cọc thành công!'); closeModal(); window._consultImageBlob = null; loadCrmCtvData();
            } else { showToast(data.error || 'Lỗi!', 'error'); _ctvEnableSubmitBtn(); }
        } catch (err) { showToast('Lỗi kết nối!', 'error'); _ctvEnableSubmitBtn(); }
        return;
    }

    // ========== Chốt Đơn flow ==========
    if (log_type === 'chot_don') {
        const address = document.getElementById('consultAddress')?.value;
        const city = document.getElementById('consultCity')?.value;
        const phone = document.getElementById('consultPhone')?.value;
        const sbhDate = document.getElementById('consultSBHDate')?.value;
        if (!address) { showToast('Vui lòng nhập địa chỉ!', 'error'); _ctvEnableSubmitBtn(); return; }
        if (!city) { showToast('Vui lòng chọn thành phố!', 'error'); _ctvEnableSubmitBtn(); return; }
        if (!sbhDate) { showToast('Vui lòng chọn ngày hẹn sau bán hàng!', 'error'); _ctvEnableSubmitBtn(); return; }

        // Phone validate
        if (phone && !/^\d{10}$/.test(phone)) {
            showToast('SĐT phải đúng 10 chữ số', 'error'); _ctvEnableSubmitBtn(); return;
        }

        // Collect order items
        const rows = document.querySelectorAll('#consultOrderTable tbody tr');
        if (rows.length === 0) { showToast('Vui lòng thêm ít nhất 1 sản phẩm!', 'error'); _ctvEnableSubmitBtn(); return; }
        const items = [];
        for (const row of rows) {
            const desc = row.querySelector('.oi-desc')?.value;
            const qty = Number(row.querySelector('.oi-qty')?.value) || 0;
            const price = Number((row.querySelector('.oi-price')?.value || '').replace(/\./g, '')) || 0;
            if (desc && qty > 0 && price > 0) items.push({ description: desc, quantity: qty, unit_price: price });
        }
        if (items.length === 0) { showToast('Vui lòng nhập sản phẩm hợp lệ!', 'error'); _ctvEnableSubmitBtn(); return; }

        try {
            // Generate order code FIRST so items link to new order
            const orderCodeEl = document.getElementById('consultOrderCode');
            if (orderCodeEl && orderCodeEl.value) {
                await apiCall('/api/order-codes', 'POST', { customer_id: customerId });
            }

            // Save order items (now linked to the newly created order)
            await apiCall(`/api/customers/${customerId}/items`, 'PUT', { items });

            // Sync phone + address + province
            const syncBody = { address, province: city };
            if (phone) syncBody.phone = phone;
            await apiCall(`/api/customers/${customerId}/info`, 'PUT', syncBody);

            // Submit consultation log with chot_don type
            const formData = new FormData();
            formData.append('log_type', 'chot_don');
            formData.append('content', `Chốt đơn: ${items.length} SP — ${address}, ${city}`);
            formData.append('address', address);
            formData.append('appointment_date', sbhDate);
            const chotDonNextType = document.getElementById('consultChotDonNextType')?.value;
            if (chotDonNextType) formData.append('next_consult_type', chotDonNextType);
            const res = await fetch(`/api/customers/${customerId}/consult`, { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                showToast('✅ Chốt đơn thành công! Chuyển sang Sau Bán Hàng.'); closeModal(); window._consultImageBlob = null; loadCrmCtvData();
            } else { showToast(data.error || 'Lỗi!', 'error'); _ctvEnableSubmitBtn(); }
        } catch (err) { showToast('Lỗi kết nối!', 'error'); _ctvEnableSubmitBtn(); }
        return;
    }

    // ========== Normal consultation flow ==========
    if (!content) { showToast('Vui lòng nhập nội dung tư vấn!', 'error'); _ctvEnableSubmitBtn(); return; }
    const imageRequiredTypes = ['nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau','thiet_ke','bao_sua'];
    if (imageRequiredTypes.includes(log_type) && !window._consultImageBlob) {
        showToast('Vui lòng dán hình ảnh (Ctrl+V)!', 'error'); _ctvEnableSubmitBtn(); return;
    }
    if (!appointment_date) { showToast('Vui lòng chọn ngày hẹn!', 'error'); _ctvEnableSubmitBtn(); return; }

    const formData = new FormData();
    formData.append('log_type', log_type);
    formData.append('content', content);
    formData.append('appointment_date', appointment_date);
    const nextType = document.getElementById('consultNextType')?.value;
    if (nextType) formData.append('next_consult_type', nextType);
    if (window._consultImageBlob) {
        formData.append('image', window._consultImageBlob, 'screenshot.png');
    }

    try {
        const res = await fetch(`/api/customers/${customerId}/consult`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            showToast('✅ ' + data.message); closeModal(); window._consultImageBlob = null; loadCrmCtvData();
        } else { showToast(data.error || 'Lỗi!', 'error'); _ctvEnableSubmitBtn(); }
    } catch (err) { showToast('Lỗi kết nối!', 'error'); _ctvEnableSubmitBtn(); }
}

// ========== CONSULTATION HISTORY ==========
async function _ctvOpenConsultHistory(customerId) {
    const [custData, logData, codesData] = await Promise.all([
        apiCall(`/api/customers/${customerId}`),
        apiCall(`/api/customers/${customerId}/consult`),
        apiCall(`/api/customers/${customerId}/order-codes`)
    ]);
    
    const c = custData.customer;
    if (!c) { showToast('Không tìm thấy', 'error'); return; }
    const logs = logData.logs || [];
    const items = custData.items || [];
    const codes = codesData.codes || [];
    const totalDeposit = codesData.total_deposit || 0;

    let bodyHTML = `
        <div style="display:flex;gap:8px;margin-bottom:16px;">
            <button class="btn btn-sm tab-btn active" onclick="_ctvSwitchConsultTab('info', this)" style="font-size:12px;">📋 Thông Tin</button>
            <button class="btn btn-sm tab-btn" onclick="_ctvSwitchConsultTab('history', this)" style="font-size:12px;">📜 Lịch Sử (${logs.length})</button>
            <button class="btn btn-sm tab-btn" onclick="_ctvSwitchConsultTab('order', this)" style="font-size:12px;">📦 Đơn Hàng</button>
        </div>

        <div id="tabInfo">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">
                <div><strong>Mã:</strong> <span style="color:var(--gold)">${getCustomerCode(c)}</span></div>
                <div><strong>Trạng thái:</strong> ${getStatusBadge(c.order_status)}</div>
                <div><strong>Khách hàng:</strong> ${c.customer_name}</div>
                <div><strong>SĐT:</strong> <a href="tel:${c.phone}">${c.phone}</a></div>
                <div><strong>Nguồn:</strong> ${c.source_name || '—'}</div>
                <div><strong>Ngày bàn giao:</strong> ${formatDate(c.handover_date)}</div>
                <div><strong>Địa chỉ:</strong> ${c.address || '—'}</div>
                <div><strong>Ngày sinh:</strong> ${c.birthday ? formatDate(c.birthday) : '—'}</div>
                <div><strong>Ngày hẹn:</strong> ${c.appointment_date || '—'}</div>
                <div><strong>Người nhận:</strong> ${c.assigned_to_name || '—'}</div>
                ${(c.referrer_name || c.referrer_customer_name) ? `<div><strong>Người GT:</strong> <span style="cursor:pointer;text-decoration:underline;color:var(--info);" onclick="_ctvOpenAffiliateDetail(${c.referrer_id})">${c.referrer_name || c.referrer_customer_name}</span></div>` : ''}
                ${(c.referrer_user_crm_type || c.referrer_crm_type) ? `<div><strong>CRM người GT:</strong> ${CRM_LABELS[c.referrer_user_crm_type || c.referrer_crm_type] || c.referrer_user_crm_type || c.referrer_crm_type}</div>` : ''}
                ${c.notes ? `<div style="grid-column:1/-1"><strong>Ghi chú:</strong> ${c.notes}</div>` : ''}
            </div>
        </div>

        <div id="tabHistory" style="display:none;">
            ${logs.length === 0 ? '<div class="empty-state"><div class="icon">📭</div><h3>Chưa có lịch sử</h3></div>' :
            `<div style="max-height:350px;overflow-y:auto;">
                ${_ctvBuildGroupedHistoryHTML(logs)}
            </div>`}
        </div>

        <div id="tabOrder" style="display:none;">
            ${_ctvBuildOrderCardHTML(codes, items, c, totalDeposit)}
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
        <button class="btn btn-primary" onclick="_ctvOpenConsultModal(${c.id})" style="width:auto;">📝 Tư Vấn</button>
        <button class="btn btn-primary" onclick="_ctvSaveOrderItems(${c.id})" style="width:auto;">💾 Lưu Đơn</button>
        <button class="btn" onclick="_ctvRequestCancel(${c.id})" style="width:auto;background:var(--danger);color:white;">❌ Hủy KH</button>
    `;

    openModal(`📋 ${c.customer_name} — ${getCustomerCode(c)}`, bodyHTML, footerHTML);

    setTimeout(() => {
        document.querySelectorAll('.oi-qty, .oi-price').forEach(el => el.addEventListener('input', calcOrderTotal));
    }, 100);
}

function _ctvSwitchConsultTab(tab, btn) {
    document.getElementById('tabInfo').style.display = tab === 'info' ? 'block' : 'none';
    document.getElementById('tabHistory').style.display = tab === 'history' ? 'block' : 'none';
    document.getElementById('tabOrder').style.display = tab === 'order' ? 'block' : 'none';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

// ========== UPDATE APPOINTMENT ==========
async function _ctvUpdateAppointment(customerId, date) {
    const data = await apiCall(`/api/customers/${customerId}/appointment`, 'PUT', { appointment_date: date });
    if (data.success) showToast('📅 Đã cập nhật ngày hẹn!');
}

// ========== REFERRER SEARCH ==========
let _ctvAllReferrerCustomers = [];
async function _ctvOpenReferrerSearch(customerId) {
    const bodyHTML = `
        <div class="form-group">
            <label>Tìm Người Giới Thiệu (tên hoặc SĐT)</label>
            <input type="text" id="referrerSearchInput" class="form-control" placeholder="Nhập tên hoặc SĐT để lọc..." oninput="_ctvFilterReferrerList(${customerId})">
        </div>
        <div id="referrerSearchResults" style="max-height:350px;overflow-y:auto;">
            <p style="color:var(--gray-400);text-align:center;padding:20px;">Đang tải...</p>
        </div>
    `;
    openModal('🔍 Tìm Người Giới Thiệu', bodyHTML, `<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>`);

    // Load all referrer-eligible customers (CTV, Hoa Hồng, Sinh Viên, Nuôi Dưỡng)
    try {
        const data = await apiCall('/api/customers/referrer-search?q=&all=1');
        _ctvAllReferrerCustomers = data.customers || [];
        _ctvRenderReferrerList(customerId, _ctvAllReferrerCustomers);
    } catch(e) {
        document.getElementById('referrerSearchResults').innerHTML = '<p style="color:var(--danger);text-align:center;">Lỗi tải dữ liệu</p>';
    }
    setTimeout(() => document.getElementById('referrerSearchInput')?.focus(), 200);
}

function _ctvFilterReferrerList(customerId) {
    const q = (document.getElementById('referrerSearchInput')?.value || '').toLowerCase().trim();
    const filtered = q ? _ctvAllReferrerCustomers.filter(c =>
        (c.customer_name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q)
    ) : _ctvAllReferrerCustomers;
    _ctvRenderReferrerList(customerId, filtered);
}

function _ctvRenderReferrerList(customerId, customers) {
    const results = document.getElementById('referrerSearchResults');
    if (!results) return;
    if (customers.length === 0) {
        results.innerHTML = '<p style="color:var(--gray-400);text-align:center;padding:20px;">Không tìm thấy</p>';
        return;
    }
    const CRM_TYPE_COLORS = { 'ctv': '#10b981', 'hoa_hong': '#f59e0b', 'sinh_vien': '#3b82f6', 'nuoi_duong': '#8b5cf6' };
    results.innerHTML = customers.map(c => {
        const typeLabel = CRM_LABELS[c.crm_type] || c.crm_type;
        const typeColor = CRM_TYPE_COLORS[c.crm_type] || '#6b7280';
        return `
            <div onclick="_ctvSelectReferrer(${customerId}, ${c.id})" 
                style="padding:10px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:6px;cursor:pointer;transition:all 0.2s;display:flex;justify-content:space-between;align-items:center;"
                onmouseover="this.style.borderColor='#fad24c';this.style.background='#fefce8'" onmouseout="this.style.borderColor='#e5e7eb';this.style.background='white'">
                <div>
                    <div style="font-weight:600;color:#122546;">${c.customer_name}</div>
                    <div style="font-size:12px;color:#6b7280;">${c.phone || '—'}</div>
                </div>
                <span style="font-size:11px;padding:3px 8px;border-radius:12px;background:${typeColor}20;color:${typeColor};font-weight:600;">${typeLabel}</span>
            </div>
        `;
    }).join('');
}

async function _ctvSelectReferrer(customerId, referrerCustomerId) {
    const data = await apiCall(`/api/customers/${customerId}/referrer`, 'PUT', { referrer_customer_id: referrerCustomerId });
    if (data.success) {
        showToast('✅ Đã chọn người giới thiệu: ' + data.referrer_name);
        closeModal();
        loadCrmCtvData();
    } else {
        showToast(data.error || 'Lỗi!', 'error');
    }
}

// ========== CẬP NHẬT THÔNG TIN KHÁCH HÀNG ==========
// ========== DANH SÁCH TỈNH/THÀNH PHỐ ==========
const CTV_PROVINCES = [
    'An Giang','Bà Rịa - Vũng Tàu','Bắc Giang','Bắc Kạn','Bạc Liêu','Bắc Ninh','Bến Tre',
    'Bình Định','Bình Dương','Bình Phước','Bình Thuận','Cà Mau','Cần Thơ','Cao Bằng',
    'Đà Nẵng','Đắk Lắk','Đắk Nông','Điện Biên','Đồng Nai','Đồng Tháp','Gia Lai',
    'Hà Giang','Hà Nam','Hà Nội','Hà Tĩnh','Hải Dương','Hải Phòng','Hậu Giang',
    'Hòa Bình','Hưng Yên','Khánh Hòa','Kiên Giang','Kon Tum','Lai Châu','Lâm Đồng',
    'Lạng Sơn','Lào Cai','Long An','Nam Định','Nghệ An','Ninh Bình','Ninh Thuận',
    'Phú Thọ','Phú Yên','Quảng Bình','Quảng Nam','Quảng Ngãi','Quảng Ninh','Quảng Trị',
    'Sóc Trăng','Sơn La','Tây Ninh','Thái Bình','Thái Nguyên','Thanh Hóa',
    'Thừa Thiên Huế','Tiền Giang','TP. Hồ Chí Minh','Trà Vinh','Tuyên Quang',
    'Vĩnh Long','Vĩnh Phúc','Yên Bái'
];

async function _ctvOpenCustomerInfo(customerId) {
    const data = await apiCall(`/api/customers/${customerId}`);
    const c = data.customer || {};
    let holidays = [];
    try { holidays = JSON.parse(c.customer_holidays || '[]'); } catch(e) {}

    // Convert birthday from various formats to day and month
    let bdDay = '', bdMonth = '';
    if (c.birthday) {
        if (c.birthday.includes('-')) {
            const parts = c.birthday.split('-');
            bdMonth = parseInt(parts[1]) || '';
            bdDay = parseInt(parts[2]) || '';
        } else if (c.birthday.includes('/')) {
            const parts = c.birthday.split('/');
            bdDay = parseInt(parts[0]) || '';
            bdMonth = parseInt(parts[1]) || '';
        }
    }

    // Generate day and month options
    let dayOpts = '<option value="">Ngày</option>';
    for (let d = 1; d <= 31; d++) dayOpts += `<option value="${d}" ${d == bdDay ? 'selected' : ''}>${d}</option>`;
    let monthOpts = '<option value="">Tháng</option>';
    for (let m = 1; m <= 12; m++) monthOpts += `<option value="${m}" ${m == bdMonth ? 'selected' : ''}>Tháng ${m}</option>`;

    const provinceOptions = CTV_PROVINCES.map(p => 
        `<option value="${p}" ${c.province === p ? 'selected' : ''}>${p}</option>`
    ).join('');

    // Helper: generate holiday day/month selects
    function holidayDateSelects(dateStr) {
        let hDay = '', hMonth = '';
        if (dateStr) {
            if (dateStr.includes('/')) { const p = dateStr.split('/'); hDay = parseInt(p[0])||''; hMonth = parseInt(p[1])||''; }
            else if (dateStr.includes('-')) { const p = dateStr.split('-'); hMonth = parseInt(p[1])||''; hDay = parseInt(p[2])||''; }
        }
        let dOpts = '<option value="">Ngày</option>';
        for (let d = 1; d <= 31; d++) dOpts += `<option value="${d}" ${d == hDay ? 'selected' : ''}>${d}</option>`;
        let mOpts = '<option value="">Tháng</option>';
        for (let m = 1; m <= 12; m++) mOpts += `<option value="${m}" ${m == hMonth ? 'selected' : ''}>T${m}</option>`;
        return `<select class="form-control ci-hday" style="width:70px;font-size:13px;">${dOpts}</select>
                <select class="form-control ci-hmonth" style="width:90px;font-size:13px;">${mOpts}</select>`;
    }

    const bodyHTML = `
        <div class="form-group">
            <label>Tên Khách Hàng</label>
            <input type="text" id="ciName" class="form-control" value="${c.customer_name || ''}">
        </div>
        <div class="form-group">
            <label>Số Điện Thoại</label>
            <input type="text" id="ciPhone" class="form-control" value="${c.phone || ''}" maxlength="10" pattern="[0-9]{10}" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
                <label>Địa Chỉ</label>
                <input type="text" id="ciAddress" class="form-control" value="${c.address || ''}">
            </div>
            <div class="form-group">
                <label>Tỉnh / Thành Phố</label>
                <select id="ciProvince" class="form-control">
                    <option value="">-- Chọn --</option>
                    ${provinceOptions}
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Công Việc</label>
            <input type="text" id="ciJob" class="form-control" value="${c.job || ''}" placeholder="VD: Giám đốc công ty ABC">
        </div>
        <div class="form-group">
            <label>Ngày Sinh Nhật</label>
            <div style="display:flex;gap:8px;">
                <select id="ciBdDay" class="form-control" style="width:80px;">${dayOpts}</select>
                <select id="ciBdMonth" class="form-control" style="width:120px;">${monthOpts}</select>
            </div>
        </div>
        <div class="form-group">
            <label>Ngày Lễ Của KH</label>
            <div id="ciHolidays">
                ${holidays.length > 0 ? holidays.map((h, i) => `
                    <div class="ci-holiday-row" style="display:flex;gap:8px;margin-bottom:6px;align-items:center;">
                        <input type="text" class="form-control ci-hname" value="${h.name || ''}" placeholder="Tên ngày lễ" style="flex:1;font-size:13px;">
                        ${holidayDateSelects(h.date)}
                        <button class="btn btn-sm" onclick="this.parentElement.remove();" style="color:var(--danger);font-size:14px;">✕</button>
                    </div>
                `).join('') : ''}
            </div>
            <button class="btn btn-sm" onclick="_ctvAddHolidayRow()" style="font-size:12px;margin-top:6px;">➕ Thêm ngày lễ</button>
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="_ctvSaveCustomerInfo(${customerId})" style="width:auto;">💾 LƯU</button>
    `;

    openModal('✏️ Cập Nhật Thông Tin KH', bodyHTML, footerHTML);
}

function _ctvAddHolidayRow() {
    let dOpts = '<option value="">Ngày</option>';
    for (let d = 1; d <= 31; d++) dOpts += `<option value="${d}">${d}</option>`;
    let mOpts = '<option value="">Tháng</option>';
    for (let m = 1; m <= 12; m++) mOpts += `<option value="${m}">T${m}</option>`;
    const container = document.getElementById('ciHolidays');
    container.insertAdjacentHTML('beforeend', `
        <div class="ci-holiday-row" style="display:flex;gap:8px;margin-bottom:6px;align-items:center;">
            <input type="text" class="form-control ci-hname" value="" placeholder="Tên ngày lễ" style="flex:1;font-size:13px;">
            <select class="form-control ci-hday" style="width:70px;font-size:13px;">${dOpts}</select>
            <select class="form-control ci-hmonth" style="width:90px;font-size:13px;">${mOpts}</select>
            <button class="btn btn-sm" onclick="this.parentElement.remove();" style="color:var(--danger);font-size:14px;">✕</button>
        </div>
    `);
}

async function _ctvSaveCustomerInfo(customerId) {
    const customer_name = document.getElementById('ciName').value;
    const phone = document.getElementById('ciPhone').value;
    if (phone && !/^\d{10}$/.test(phone)) {
        showToast('Số điện thoại phải đúng 10 chữ số', 'error');
        return;
    }
    const address = document.getElementById('ciAddress').value;
    const province = document.getElementById('ciProvince').value;
    const job = document.getElementById('ciJob').value;

    // Read birthday from day/month selects
    const bdDay = document.getElementById('ciBdDay')?.value;
    const bdMonth = document.getElementById('ciBdMonth')?.value;
    const birthday = (bdDay && bdMonth) ? `${bdDay}/${bdMonth}` : '';

    // Collect holidays from day/month selects
    const holidayRows = document.querySelectorAll('#ciHolidays .ci-holiday-row');
    const customer_holidays = [];
    holidayRows.forEach(row => {
        const name = row.querySelector('.ci-hname')?.value;
        const hDay = row.querySelector('.ci-hday')?.value;
        const hMonth = row.querySelector('.ci-hmonth')?.value;
        const date = (hDay && hMonth) ? `${hDay}/${hMonth}` : '';
        if (name || date) customer_holidays.push({ name: name || '', date });
    });

    if (!customer_name) { showToast('Tên KH không được trống!', 'error'); return; }

    try {
        const data = await apiCall(`/api/customers/${customerId}/info`, 'PUT', {
            customer_name, phone, address, province, job, birthday, customer_holidays
        });
        if (data.success) {
            showToast('✅ ' + data.message);
            closeModal();
            loadCrmCtvData();
        } else {
            showToast(data.error || 'Lỗi!', 'error');
        }
    } catch (err) {
        showToast('Lỗi kết nối!', 'error');
    }
}

// ========== CHI TIẾT KHÁCH HÀNG ==========
async function _ctvOpenCustomerDetail(customerId) {
    // Load all customer data in parallel
    const [data, logsData, orderData, orderCodesData] = await Promise.all([
        apiCall(`/api/customers/${customerId}`),
        apiCall(`/api/customers/${customerId}/consult-logs`),
        apiCall(`/api/customers/${customerId}/orders`),
        apiCall(`/api/customers/${customerId}/order-codes`)
    ]);
    const c = data.customer || {};
    const items = data.items || [];
    let holidays = [];
    try { holidays = JSON.parse(c.customer_holidays || '[]'); } catch(e) {}

    const createdDate = c.created_at ? new Date(c.created_at) : null;
    const connectDays = createdDate ? Math.floor((Date.now() - createdDate.getTime()) / 86400000) : 0;

    const logs = logsData.logs || [];

    const orders = orderData.items || [];
    const grandTotal = orders.reduce((s, i) => s + (i.total || 0), 0);

    const orderCodes = orderCodesData.codes || [];
    const cdTotalDeposit = orderCodesData.total_deposit || 0;

    const lastLogPopup = logs.length > 0 ? logs[0] : null;
    const lastConsultTypePopup = lastLogPopup ? CTV_CONSULT_TYPES[lastLogPopup.log_type] : null;
    const statusBadge = getStatusBadge ? getStatusBadge(c.order_status) : c.order_status;
    const initials = (c.customer_name || '?').split(' ').map(w => w[0]).join('').slice(-2).toUpperCase();

    const infoTab = `
        <div style="margin:-12px -12px 0;font-family:'Segoe UI',system-ui,sans-serif;">
            <!-- CUSTOMER HEADER -->
            <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%);padding:22px 22px 18px;border-radius:10px;position:relative;overflow:hidden;margin-bottom:14px;">
                <div style="position:absolute;top:-20px;right:-20px;width:100px;height:100px;background:rgba(250,210,76,0.06);border-radius:50%;"></div>
                <div style="display:flex;align-items:center;gap:14px;position:relative;z-index:1;">
                    <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#fad24c,#f59e0b);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#0f172a;box-shadow:0 3px 12px rgba(250,210,76,0.35);flex-shrink:0;">
                        ${initials}
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:3px;">${c.customer_name}</div>
                        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                            <span style="font-size:13px;color:#fad24c;font-weight:700;font-family:'Courier New',monospace;letter-spacing:0.5px;background:rgba(250,210,76,0.12);padding:2px 8px;border-radius:6px;">${getCustomerCode(c)}</span>
                            ${(c.cancel_requested === 1 && c.cancel_approved === 0)
                                ? `<span style="font-size:11px;padding:3px 10px;border-radius:6px;font-weight:600;background:var(--gray-700);color:var(--gray-400);">⏳ Chờ Duyệt Hủy</span>`
                                : (c.cancel_approved === -1)
                                    ? `<span style="font-size:11px;padding:3px 10px;border-radius:6px;font-weight:600;background:#f59e0b;color:white;">🔄 Tư Vấn Lại</span>`
                                    : lastConsultTypePopup
                                        ? `<span style="font-size:11px;padding:3px 10px;border-radius:6px;font-weight:600;background:${lastConsultTypePopup.color || 'var(--gray-600)'};color:${lastConsultTypePopup.textColor || 'white'};">${lastConsultTypePopup.icon} ${lastConsultTypePopup.label}</span>`
                                        : `<span style="font-size:12px;">${statusBadge}</span>`
                            }
                        </div>
                    </div>
                    <div style="text-align:right;flex-shrink:0;">
                        <div style="font-size:22px;font-weight:800;color:#fad24c;">${logs.length}</div>
                        <div style="font-size:10px;color:rgba(255,255,255,0.5);font-weight:600;">LẦN CHĂM</div>
                    </div>
                </div>
            </div>

            <!-- INFO GRID -->
            <div style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;overflow:hidden;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">📞 SĐT</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;"><a href="tel:${c.phone}" style="color:#3b82f6;text-decoration:none;">${c.phone}</a></div>
                    </div>
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">🏠 Địa chỉ</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${c.address || '—'}</div>
                    </div>
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">📍 Tỉnh/TP</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${c.province || '—'}</div>
                    </div>
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">🎂 Sinh nhật</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${c.birthday || '—'}</div>
                    </div>
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">📡 Nguồn</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${c.source_name || '—'}</div>
                    </div>
                    <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">💼 Công việc</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${c.job || '—'}</div>
                    </div>
                    <div style="padding:12px 14px;border-right:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">👤 NV phụ trách</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${c.assigned_to_name || '—'}</div>
                    </div>
                    <div style="padding:12px 14px;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">📅 Kết nối từ</div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${createdDate ? formatDateTime(c.created_at) : '—'}</div>
                    </div>
                </div>
            </div>
            ${(c.referrer_name || c.referrer_customer_name) ? `
                <div style="margin-top:10px;padding:10px 14px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:8px;border:1px solid #bfdbfe;font-size:13px;">
                    <strong style="color:#1e40af;">🤝 Người GT:</strong> 
                    <span style="cursor:pointer;text-decoration:underline;color:#3b82f6;font-weight:600;" onclick="_ctvOpenAffiliateDetail(${c.referrer_id})">${c.referrer_name || c.referrer_customer_name}</span>
                    ${(c.referrer_user_crm_type || c.referrer_crm_type) ? ` · <span style="color:#64748b;">${CRM_LABELS[c.referrer_user_crm_type || c.referrer_crm_type] || c.referrer_user_crm_type || c.referrer_crm_type}</span>` : ''}
                </div>
            ` : ''}
        </div>
        ${holidays.length > 0 ? '<div style="margin-top:8px;font-size:12px;"><strong>Ngày lễ:</strong> ' + holidays.map(h => h.name + ' (' + h.date + ')').join(', ') + '</div>' : ''}
    `;

    // Tab: Lịch Sử (grouped by month)
    const historyTab = `
        <div style="max-height:350px;overflow-y:auto;">
            ${_ctvBuildGroupedHistoryHTML(logs)}
        </div>
    `;

    // Tab: Đơn Hàng (using shared helper)
    const orderTab = _ctvBuildOrderCardHTML(orderCodes, orders, c, cdTotalDeposit);

    const bodyHTML = `
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
            <span class="cdtab-btn" onclick="_ctvSwitchCDTab('info')" id="cdtab-info-btn"
                style="display:inline-block;font-size:13px;padding:8px 16px;background:var(--gold);color:#122546;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap;">📋 Thông Tin</span>
            <span class="cdtab-btn" onclick="_ctvSwitchCDTab('history')" id="cdtab-history-btn"
                style="display:inline-block;font-size:13px;padding:8px 16px;background:#334155;color:white;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap;">📝 Lịch Sử (${logs.length})</span>
            <span class="cdtab-btn" onclick="_ctvSwitchCDTab('orders')" id="cdtab-orders-btn"
                style="display:inline-block;font-size:13px;padding:8px 16px;background:#334155;color:white;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap;">🛒 Đơn Hàng</span>
        </div>
        <div id="cdtab-info">${infoTab}</div>
        <div id="cdtab-history" style="display:none;">${historyTab}</div>
        <div id="cdtab-orders" style="display:none;">${orderTab}</div>
    `;

    // Determine last consultation type for button label
    const lastLog = logs.length > 0 ? logs[0] : null;
    const lastConsultType = lastLog ? CTV_CONSULT_TYPES[lastLog.log_type] : null;
    const consultBtnLabel = lastConsultType ? `${lastConsultType.icon} ${lastConsultType.label}` : '📝 TƯ VẤN';
    const consultBtnColor = lastConsultType ? lastConsultType.color : '';

    const consultBtnTextColor = lastConsultType?.textColor || 'white';

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
        ${!c.cancel_requested && !c.cancel_approved ? `
            <button class="btn btn-primary" onclick="closeModal();_ctvOpenConsultModal(${customerId});" style="width:auto;${consultBtnColor ? 'background:' + consultBtnColor + ';color:' + consultBtnTextColor + ';' : ''}">${consultBtnLabel}</button>
        ` : ''}
    `;

    openModal(``, bodyHTML, footerHTML);
}

function _ctvSwitchCDTab(tab) {
    const activeStyle = 'display:inline-block;font-size:13px;padding:8px 16px;background:#fad24c;color:#122546;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap;';
    const inactiveStyle = 'display:inline-block;font-size:13px;padding:8px 16px;background:#334155;color:white;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap;';
    ['info','history','orders'].forEach(t => {
        const el = document.getElementById('cdtab-' + t);
        const btn = document.getElementById('cdtab-' + t + '-btn');
        if (el) el.style.display = t === tab ? 'block' : 'none';
        if (btn) btn.style.cssText = t === tab ? activeStyle : inactiveStyle;
    });
}

// ========== AFFILIATE DETAIL POPUP ==========
const CTV_CRM_LABELS_AFF = { nhu_cau: 'Chăm Sóc KH Nhu Cầu', ctv: 'Chăm Sóc CTV', tu_tim_kiem: 'CRM Tự Tìm Kiếm', goi_hop_tac: 'CRM Gọi Điện Hợp Tác', goi_ban_hang: 'CRM Gọi Điện Bán Hàng', koc_tiktok: 'CRM KOL/KOC Tiktok' };
const CTV_ROLE_LABELS_AFF = { giam_doc:'Giám Đốc', quan_ly_cap_cao:'Quản Lý Cấp Cao', quan_ly:'Quản Lý', truong_phong:'Trưởng Phòng', nhan_vien:'Nhân Viên', part_time:'Part Time', hoa_hong:'Hoa Hồng', ctv:'CTV', nuoi_duong:'Nuôi Dưỡng', sinh_vien:'Sinh Viên', tkaffiliate:'TK Affiliate' };

async function _ctvOpenAffiliateDetail(userId) {
    if (!userId) return;
    try {
        const [userData, countData] = await Promise.all([
            apiCall(`/api/users/${userId}`),
            apiCall(`/api/customers?referrer_id_count=${userId}`)
        ]);
        const u = userData.user;
        if (!u) { showToast('Không tìm thấy tài khoản', 'error'); return; }

        const totalReferrals = countData.totalReferrals || 0;
        const createdAt = u.created_at ? new Date(u.created_at) : null;
        const daysCooperation = createdAt ? Math.floor((Date.now() - createdAt.getTime()) / 86400000) : 0;
        const isGD = currentUser.role === 'giam_doc';
        const isLocked = u.status === 'locked';
        const initials = (u.full_name || '?').split(' ').map(w => w[0]).join('').slice(-2).toUpperCase();

        const statusColor = isLocked ? '#ef4444' : '#22c55e';
        const statusText = isLocked ? '🔒 Đã dừng hợp tác' : '✅ Đang hợp tác';
        const statusBg = isLocked ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)';

        const bodyHTML = `
            <div style="margin:-20px -24px -10px;font-family:'Segoe UI',system-ui,sans-serif;">
                <!-- HEADER -->
                <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%);padding:28px 28px 22px;border-radius:12px 12px 0 0;position:relative;overflow:hidden;">
                    <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;background:rgba(250,210,76,0.08);border-radius:50%;"></div>
                    <div style="position:absolute;bottom:-20px;left:-20px;width:80px;height:80px;background:rgba(59,130,246,0.08);border-radius:50%;"></div>
                    <div style="display:flex;align-items:center;gap:18px;position:relative;z-index:1;">
                        <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#fad24c,#f59e0b);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#0f172a;box-shadow:0 4px 14px rgba(250,210,76,0.4);flex-shrink:0;">
                            ${initials}
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:20px;font-weight:700;color:#fff;margin-bottom:4px;text-shadow:0 1px 3px rgba(0,0,0,0.3);">${u.full_name}</div>
                            <div style="font-size:13px;color:rgba(255,255,255,0.6);margin-bottom:8px;">@${u.username}</div>
                            <div style="display:inline-flex;align-items:center;gap:6px;background:${statusBg};border:1px solid ${statusColor};color:${statusColor};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">
                                <span style="width:8px;height:8px;border-radius:50%;background:${statusColor};display:inline-block;${isLocked ? '' : 'animation:pulse-dot 2s infinite;'}"></span>
                                ${statusText}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- STAT CARDS -->
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;padding:18px 24px 14px;">
                    <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:12px;padding:14px;text-align:center;border:1px solid #bfdbfe;">
                        <div style="font-size:28px;font-weight:800;color:#1e40af;line-height:1;">${totalReferrals}</div>
                        <div style="font-size:11px;color:#3b82f6;font-weight:600;margin-top:4px;">Người giới thiệu</div>
                    </div>
                    <div style="background:linear-gradient(135deg,#fefce8,#fef3c7);border-radius:12px;padding:14px;text-align:center;border:1px solid #fde68a;">
                        <div style="font-size:28px;font-weight:800;color:#92400e;line-height:1;">${daysCooperation}</div>
                        <div style="font-size:11px;color:#d97706;font-weight:600;margin-top:4px;">Ngày hợp tác</div>
                    </div>
                    <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:12px;padding:14px;text-align:center;border:1px solid #bbf7d0;">
                        <div style="font-size:14px;font-weight:800;color:#166534;line-height:1.2;">${createdAt ? createdAt.toLocaleDateString('vi-VN') : '—'}</div>
                        <div style="font-size:11px;color:#16a34a;font-weight:600;margin-top:4px;">Ngày bắt đầu</div>
                    </div>
                </div>

                <!-- INFO GRID -->
                <div style="padding:6px 24px 20px;">
                    <div style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
                            <div style="padding:14px 16px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                                <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">📞 Số điện thoại</div>
                                <div style="font-size:14px;font-weight:600;color:#1e293b;">${u.phone || '—'}</div>
                            </div>
                            <div style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">
                                <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">📋 Loại CRM</div>
                                <div style="font-size:14px;font-weight:600;color:#1e293b;">${CTV_CRM_LABELS_AFF[u.source_crm_type] || u.source_crm_type || '—'}</div>
                            </div>
                            <div style="padding:14px 16px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                                <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">👨‍💼 NV Quản lý</div>
                                <div style="font-size:14px;font-weight:600;color:#1e293b;">${u.manager_name || '—'}</div>
                            </div>
                            <div style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">
                                <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">🏷️ Vai trò</div>
                                <div style="font-size:14px;font-weight:600;color:#1e293b;">${CTV_ROLE_LABELS_AFF[u.role] || u.role}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style>
                @keyframes pulse-dot { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
            </style>
        `;

        let footerHTML = '';
        if (isGD) {
            if (isLocked) {
                footerHTML += `<button class="btn" onclick="_ctvToggleAffiliateStatus(${u.id}, 'active')" style="background:linear-gradient(135deg,#22c55e,#16a34a);color:white;padding:10px 22px;border-radius:10px;font-weight:600;margin-right:10px;border:none;box-shadow:0 2px 8px rgba(34,197,94,0.3);transition:transform 0.15s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">▶️ Tiếp tục hợp tác</button>`;
            } else {
                footerHTML += `<button class="btn" onclick="_ctvToggleAffiliateStatus(${u.id}, 'locked')" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:white;padding:10px 22px;border-radius:10px;font-weight:600;margin-right:10px;border:none;box-shadow:0 2px 8px rgba(239,68,68,0.3);transition:transform 0.15s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">⏸️ Dừng hợp tác</button>`;
            }
            footerHTML += `<button class="btn" onclick="_ctvOpenEditAffiliateFromCrm(${u.id})" style="background:linear-gradient(135deg,#fad24c,#f59e0b);color:#0f172a;padding:10px 22px;border-radius:10px;font-weight:600;border:none;box-shadow:0 2px 8px rgba(250,210,76,0.3);transition:transform 0.15s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">✏️ Sửa tài khoản</button>`;
        }

        openModal(``, bodyHTML, footerHTML);
    } catch (err) {
        console.error('Affiliate detail error:', err);
        showToast('Lỗi tải thông tin affiliate', 'error');
    }
}

async function _ctvToggleAffiliateStatus(userId, newStatus) {
    try {
        const data = await apiCall(`/api/users/${userId}/status`, 'PUT', { status: newStatus });
        if (data.success) {
            showToast(`✅ ${data.message}`);
            closeModal();
            // Re-open to refresh data
            _ctvOpenAffiliateDetail(userId);
        } else {
            showToast(data.error, 'error');
        }
    } catch (err) {
        showToast('Lỗi cập nhật trạng thái', 'error');
    }
}

async function _ctvOpenEditAffiliateFromCrm(userId) {
    try {
        const userData = await apiCall(`/api/users/${userId}`);
        const u = userData.user;
        if (!u) { showToast('Không tìm thấy tài khoản', 'error'); return; }

        const bodyHTML = `
            <form id="editAffCrmForm" style="max-width:500px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                    <div class="form-group">
                        <label>Họ tên</label>
                        <input type="text" id="eafFullName" class="form-control" value="${u.full_name || ''}">
                    </div>
                    <div class="form-group">
                        <label>SĐT</label>
                        <input type="text" id="eafPhone" class="form-control" value="${u.phone || ''}">
                    </div>
                    <div class="form-group">
                        <label>Địa chỉ</label>
                        <input type="text" id="eafAddress" class="form-control" value="${u.address || ''}">
                    </div>
                    <div class="form-group">
                        <label>Tỉnh/TP</label>
                        <input type="text" id="eafProvince" class="form-control" value="${u.province || ''}">
                    </div>
                    <div class="form-group">
                        <label>Ngân hàng</label>
                        <input type="text" id="eafBankName" class="form-control" value="${u.bank_name || ''}">
                    </div>
                    <div class="form-group">
                        <label>Số TK</label>
                        <input type="text" id="eafBankAccount" class="form-control" value="${u.bank_account || ''}">
                    </div>
                    <div class="form-group" style="grid-column:1/-1;">
                        <label>Chủ TK</label>
                        <input type="text" id="eafBankHolder" class="form-control" value="${u.bank_holder || ''}">
                    </div>
                </div>
            </form>
        `;

        const footerHTML = `<button class="btn" onclick="_ctvSubmitEditAffFromCrm(${u.id})" style="background:var(--gold);color:#122546;padding:8px 24px;border-radius:8px;font-weight:600;">💾 Lưu thay đổi</button>`;

        openModal(`✏️ Sửa TK Affiliate: ${u.full_name}`, bodyHTML, footerHTML);
    } catch (err) {
        showToast('Lỗi tải thông tin', 'error');
    }
}

async function _ctvSubmitEditAffFromCrm(userId) {
    const body = {
        full_name: document.getElementById('eafFullName').value,
        phone: document.getElementById('eafPhone').value,
        address: document.getElementById('eafAddress').value,
        province: document.getElementById('eafProvince').value,
        bank_name: document.getElementById('eafBankName').value,
        bank_account: document.getElementById('eafBankAccount').value,
        bank_holder: document.getElementById('eafBankHolder').value,
        sync_source: true
    };

    if (body.phone && !/^\d{10}$/.test(body.phone)) {
        showToast('SĐT phải đúng 10 chữ số', 'error');
        return;
    }

    try {
        const data = await apiCall(`/api/users/${userId}`, 'PUT', body);
        if (data.success) {
            showToast('✅ Cập nhật thành công!');
            closeModal();
            _ctvOpenAffiliateDetail(userId);
        } else {
            showToast(data.error, 'error');
        }
    } catch (err) {
        showToast('Lỗi cập nhật', 'error');
    }
}

