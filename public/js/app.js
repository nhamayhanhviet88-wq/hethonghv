// ========== GLOBAL STATE ==========
let currentUser = null;
let currentPage = 'dashboard';
let userPermissions = {};

// ========== ROLE CONFIG ==========
const ROLE_LABELS = {
    giam_doc: 'Giám Đốc',
    pho_giam_doc: 'Phó Giám Đốc',
    quan_ly: 'Quản Lý',
    truong_phong: 'Trưởng Phòng',
    trinh: 'Trinh',
    thu_quy: 'Thủ Quỹ',
    ke_toan: 'Kế Toán',
    thu_kho: 'Thủ Kho',
    nhan_su: 'Nhân Sự',
    thu_ky: 'Thư Ký',
    nhan_vien: 'Nhân Viên',
    to_truong: 'Tổ Trưởng',
    kcs_hang: 'KCS Hàng',
    ky_thuat: 'Kỹ Thuật',
    nhan_vien_parttime: 'NV Part-Time',
    hoa_hong: 'Hoa Hồng',
    ctv: 'CTV',
    nuoi_duong: 'Nuôi Dưỡng',
    sinh_vien: 'Sinh Viên',
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
    hoa_hong_crm: 'CRM Giáo Viên/Học Sinh/Sinh Viên',
    nuoi_duong: 'CRM Nhân Sự/Kế Toán/P.Mua Hàng',
    sinh_vien: 'CRM Thể Thao/Thời Trang Local',
    koc_tiktok: 'CRM KOL Tiktok/Mẹ Bỉm Sữa'
};

const MENU_CONFIG = [
    { id: 'dashboard', label: 'Các Chỉ Số Tổng Quan', icon: '📊', roles: ['giam_doc','pho_giam_doc','quan_ly','truong_phong','trinh','nhan_vien','to_truong','kcs_hang','ky_thuat','nhan_vien_parttime','ke_toan','nhan_su','thu_quy','thu_kho','thu_ky'], section: 'TỔNG QUAN' },
    { id: 'goidien', label: 'Gọi Điện Telesale', icon: '📞', roles: ['giam_doc','pho_giam_doc','quan_ly','truong_phong','trinh','nhan_vien','to_truong','kcs_hang','ky_thuat','nhan_vien_parttime'], section: 'KINH DOANH TELESALE', href: '/goidien' },
    { id: 'hethonggoidien', label: 'Hệ Thống Phân Chia Gọi Điện', icon: '📡', roles: ['giam_doc','pho_giam_doc','quan_ly','truong_phong','trinh','nhan_vien','to_truong','kcs_hang','ky_thuat','nhan_vien_parttime'], section: 'KINH DOANH TELESALE', href: '/hethonggoidien' },
    { id: 'crm-nhu-cau', label: 'Chăm Sóc KH Nhu Cầu', icon: '📋', roles: ['giam_doc','pho_giam_doc','quan_ly','truong_phong','trinh','nhan_vien','to_truong','kcs_hang','ky_thuat','nhan_vien_parttime'], section: 'KINH DOANH CHĂM SÓC' },
    { id: 'crm-ctv', label: 'Chăm Sóc CTV', icon: '🤝', roles: ['giam_doc','pho_giam_doc','quan_ly','truong_phong','trinh','nhan_vien','to_truong','kcs_hang','ky_thuat','nhan_vien_parttime'], section: 'KINH DOANH CHĂM SÓC' },
    { id: 'cham-soc-affiliate', label: 'Chăm Sóc Affiliate', icon: '💝', roles: ['giam_doc','pho_giam_doc','quan_ly','truong_phong','trinh','nhan_vien','to_truong','kcs_hang','ky_thuat','nhan_vien_parttime'], section: 'KINH DOANH CHĂM SÓC', href: '/chamsocaffiliate' },
    { id: 'crm-hoa-hong', label: 'CRM Giáo Viên/Học Sinh/Sinh Viên', icon: '🌹', roles: ['giam_doc','pho_giam_doc','quan_ly','truong_phong','trinh','nhan_vien','to_truong','kcs_hang','ky_thuat','nhan_vien_parttime'], section: 'KINH DOANH CRM NUÔI DƯỠNG' },
    { id: 'crm-nuoi-duong', label: 'CRM Nhân Sự/Kế Toán/P.Mua Hàng', icon: '🌱', roles: ['giam_doc','pho_giam_doc','quan_ly','truong_phong','trinh','nhan_vien','to_truong','kcs_hang','ky_thuat','nhan_vien_parttime'], section: 'KINH DOANH CRM NUÔI DƯỠNG' },
    { id: 'crm-sinh-vien', label: 'CRM Thể Thao/Thời Trang Local', icon: '👟', roles: ['giam_doc','pho_giam_doc','quan_ly','truong_phong','trinh','nhan_vien','to_truong','kcs_hang','ky_thuat','nhan_vien_parttime'], section: 'KINH DOANH CRM NUÔI DƯỠNG' },
    { id: 'crm-koc-tiktok', label: 'CRM KOL Tiktok/Mẹ Bỉm Sữa', icon: '🎵', roles: ['giam_doc','pho_giam_doc','quan_ly','truong_phong','trinh','nhan_vien','to_truong','kcs_hang','ky_thuat','nhan_vien_parttime'], section: 'KINH DOANH CRM NUÔI DƯỠNG', href: '/koctiktok' },
    { id: 'crm-gioi-thieu', label: 'CRM Quà Tặng/Sự Kiện/Du Lịch', icon: '🎁', roles: ['giam_doc','pho_giam_doc','quan_ly','truong_phong','trinh','nhan_vien','to_truong','kcs_hang','ky_thuat','nhan_vien_parttime'], section: 'KINH DOANH CRM NUÔI DƯỠNG' },
    { id: 'crm-affiliate-hv', label: 'CRM Người Thân/Bạn Bè', icon: '👨‍👩‍👧‍👦', roles: ['giam_doc','pho_giam_doc','quan_ly','truong_phong','trinh','nhan_vien','to_truong','kcs_hang','ky_thuat','nhan_vien_parttime'], section: 'KINH DOANH CRM NUÔI DƯỠNG', href: '/crmaffiliate' },
    { id: 'affiliate-hv', label: 'CRM Affiliate Giới Thiệu', icon: '🤝', roles: ['giam_doc','pho_giam_doc','quan_ly','truong_phong','trinh','nhan_vien','to_truong','kcs_hang','ky_thuat','nhan_vien_parttime'], section: 'KINH DOANH CRM NUÔI DƯỠNG', href: '/affiliate' },
    { id: 'tai-khoan-affiliate', label: 'Tài Khoản Affiliate', icon: '🔑', roles: ['giam_doc','quan_ly','trinh'], section: 'QUẢN LÝ AFFILIATE' },
    { id: 'quan-ly-affiliate', label: 'Chỉ Số Affiliate HV', icon: '🤝', roles: ['giam_doc','quan_ly','trinh'], section: 'QUẢN LÝ AFFILIATE' },
    { id: 'bang-xep-hang-affiliate', label: 'Bảng Xếp Hạng Affiliate', icon: '🏆', roles: ['giam_doc','quan_ly','trinh'], section: 'BXH & GIẢI THƯỞNG', href: '/bangxephangaffiliate', dynamicRoles: 'leaderboard_allowed_roles' },
    { id: 'bang-xep-hang-kinh-doanh', label: 'Bảng Xếp Hạng Kinh Doanh', icon: '📊', roles: ['giam_doc','quan_ly','trinh'], section: 'BXH & GIẢI THƯỞNG', href: '/bangxephangkinhdoanh', dynamicRoles: 'bxh_kinhdoanh_allowed_roles' },
    { id: 'bang-xep-hang-sale', label: 'Bảng Xếp Hạng Sale', icon: '💼', roles: ['giam_doc','quan_ly','trinh'], section: 'BXH & GIẢI THƯỞNG', href: '/bangxephangsale', dynamicRoles: 'bxh_sale_allowed_roles' },
    { id: 'bang-xep-hang-ctv', label: 'Bảng Xếp Hạng CTV', icon: '🤝', roles: ['giam_doc','quan_ly','trinh'], section: 'BXH & GIẢI THƯỞNG', href: '/bangxephangctv', dynamicRoles: 'bxh_ctv_allowed_roles' },
    { id: 'bxh-san-xuat', label: 'BXH Khối Sản Xuất', icon: '🏭', roles: ['giam_doc','quan_ly','trinh'], section: 'BXH & GIẢI THƯỞNG', href: '/bxhsanxuat', dynamicRoles: 'bxh_sanxuat_allowed_roles' },
    { id: 'bxh-van-phong', label: 'BXH Khối Văn Phòng', icon: '🏢', roles: ['giam_doc','quan_ly','trinh'], section: 'BXH & GIẢI THƯỞNG', href: '/bxhvanphong', dynamicRoles: 'bxh_vanphong_allowed_roles' },
    { id: 'giai-thuong-game', label: 'Setup Giải Thưởng Game', icon: '🎮', roles: ['giam_doc'], section: 'BXH & GIẢI THƯỞNG', href: '/giaithuonggame' },
    { id: 'trao-giai-thuong', label: 'Trao Giải Thưởng', icon: '🏆', roles: ['giam_doc','quan_ly','trinh'], section: 'BXH & GIẢI THƯỞNG', href: '/traogiaithuong' },
    { id: 'withdraw-manage', label: 'Duyệt Rút Tiền', icon: '🏦', roles: ['giam_doc','trinh'], section: 'QUẢN LÝ AFFILIATE' },
    { id: 'cap-cuu-sep', label: 'Cấp Cứu Sếp', icon: '🚨', roles: ['giam_doc','pho_giam_doc','quan_ly','truong_phong','trinh','nhan_vien','to_truong','kcs_hang','ky_thuat','nhan_vien_parttime'], section: 'HỖ TRỢ NHÂN VIÊN HV' },
    { id: 'huy-khach', label: 'Hủy Khách Hàng', icon: '❌', roles: ['giam_doc','quan_ly','trinh'], section: 'HỖ TRỢ NHÂN VIÊN HV' },
    { id: 'chuyen-so', label: 'Hệ Thống Chuyển Số', icon: '📱', roles: ['giam_doc','pho_giam_doc','quan_ly','truong_phong','trinh','nhan_vien','to_truong','kcs_hang','ky_thuat','nhan_vien_parttime','hoa_hong','tkaffiliate'], section: 'HỖ TRỢ NHÂN VIÊN HV' },
    { id: 'accounts', label: 'Tài Khoản Nhân Viên', icon: '👥', roles: ['giam_doc','quan_ly','trinh'], section: 'QUẢN LÝ NHÂN VIÊN HV' },
    // { id: 'quan-ly-tk-affiliate', label: 'Quản Lý TK Affiliate', icon: '🔑', roles: ['giam_doc','quan_ly','trinh'], section: 'QUẢN LÝ NHÂN VIÊN HV', href: '/quanlyaffiliate' },
    { id: 'teams', label: 'Cơ Cấu Tổ Chức', icon: '🏢', roles: ['giam_doc','quan_ly','trinh'], section: 'QUẢN LÝ NHÂN VIÊN HV' },
    { id: 'permissions', label: 'Phân Quyền', icon: '🔐', roles: ['giam_doc','quan_ly','trinh'], section: 'QUẢN LÝ NHÂN VIÊN HV' },
    { id: 'settings', label: 'Cài Đặt Phân Tầng', icon: '⚙️', roles: ['giam_doc'], section: 'HỆ THỐNG' },
    { id: 'my-customers', label: 'Khách Hàng Của Tôi', icon: '👤', roles: ['hoa_hong'], section: 'HOA HỒNG' },
    { id: 'withdraw', label: 'Rút Tiền', icon: '💰', roles: ['hoa_hong'], section: 'HOA HỒNG' },
    { id: 'bao-cao-hoa-hong', label: 'Báo Cáo Hoa Hồng', icon: '💰', roles: ['tkaffiliate'], section: 'AFFILIATE' },
    { id: 'rut-tien-affiliate', label: 'Rút Tiền', icon: '🏦', roles: ['tkaffiliate'], section: 'AFFILIATE' },
];

// Map menu IDs to permission feature keys
const MENU_PERM_MAP = {
    'dashboard': 'tong_quan',
    'crm-nhu-cau': 'crm_nhu_cau',
    'crm-ctv': 'crm_ctv',
    'crm-hoa-hong': 'crm_hoa_hong',
    'crm-nuoi-duong': 'crm_nuoi_duong',
    'crm-sinh-vien': 'crm_sinh_vien',
    'affiliate-hv': 'affiliate_hv',
    'huy-khach': 'huy_khach',
    'accounts': 'nhan_vien',
    'teams': 'co_cau_to_chuc',
    'permissions': 'phan_quyen',
    'cap-cuu-sep': 'cap_cuu_sep',
    'chuyen-so': 'chuyen_so',
    'settings': 'cai_dat',
    'trao-giai-thuong': 'trao_giai_thuong',
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
    if (currentUser && ['giam_doc', 'trinh'].includes(currentUser.role)) {
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

        // Get configurable popup times
        const t1 = await apiCall('/api/app-config/emergency_popup_time_1');
        const t2 = await apiCall('/api/app-config/emergency_popup_time_2');
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
        if (emergencies.length === 0) {
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

        const t1 = await apiCall('/api/app-config/cancel_nv_popup_time_1');
        const t2 = await apiCall('/api/app-config/cancel_nv_popup_time_2');
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

        if (!data.count || data.count === 0) return;
        cancelNVShowPopup(data.count, data.customers || []);
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
        if (!data.count || data.count === 0) return;

        cancelManagerShowPopup(data.count);
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

        // Load dynamic roles for menu items (e.g. leaderboard)
        for (const item of MENU_CONFIG) {
            if (item.dynamicRoles) {
                try {
                    const cfg = await fetch('/api/app-config/' + item.dynamicRoles).then(r => r.json());
                    if (cfg.value) item.roles = JSON.parse(cfg.value);
                } catch(e) {}
            }
        }

        renderSidebar();
        renderUserInfo();
        renderAffiliateFloatingButtons();
    } catch (err) {
        window.location.href = '/';
    }
}

// ========== SIDEBAR ==========
var _sidebarCollapsed = JSON.parse(localStorage.getItem('sidebarCollapsed') || '{}');
var _sidebarParentCollapsed = JSON.parse(localStorage.getItem('sidebarParentCollapsed') || '{}');
var _sidebarSectionKeys = [];

// Parent group definitions: parent name -> list of child section names (in order)
var PARENT_SECTIONS = [
    { name: 'KẾT QUẢ & VINH DANH', sections: ['TỔNG QUAN', 'BXH & GIẢI THƯỞNG'] },
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
                var clickAction = item.href ? "window.location.href='" + item.href + "'" : "navigate('" + item.id + "')";
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
            var clickAction = item.href ? "window.location.href='" + item.href + "'" : "navigate('" + item.id + "')";
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
    const ROLE_MAP = { giam_doc:'Giám Đốc', pho_giam_doc:'Phó Giám Đốc', quan_ly:'Quản Lý', truong_phong:'Trưởng Phòng', trinh:'Trinh', nhan_vien:'Nhân Viên', nhan_vien_parttime:'NV Parttime', to_truong:'Tổ Trưởng', kcs_hang:'KCS Hàng', ky_thuat:'Kỹ Thuật', ke_toan:'Kế Toán', nhan_su:'Nhân Sự', thu_quy:'Thủ Quỹ', thu_kho:'Thủ Kho', thu_ky:'Thư Ký', hoa_hong:'Hoa Hồng', ctv:'CTV', nuoi_duong:'Nuôi Dưỡng', sinh_vien:'Sinh Viên', tkaffiliate:'TK Affiliate' };
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

function handleRoute() {
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
        case 'crm-ctv': renderCRMPage(content, 'ctv'); break;
        case 'crm-hoa-hong': renderCRMPage(content, 'hoa_hong_crm'); break;
        case 'crm-nuoi-duong': renderCRMPage(content, 'nuoi_duong'); break;
        case 'crm-sinh-vien': renderCRMPage(content, 'sinh_vien'); break;
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
        default: renderComingSoon(content); break;
    }
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
        ${['giam_doc','quan_ly'].includes(currentUser.role) ? `
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
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

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
        giam_doc: 'Giám Đốc', pho_giam_doc: 'Phó Giám Đốc', quan_ly: 'Quản Lý',
        truong_phong: 'Trưởng Phòng', trinh: 'Trinh', nhan_vien: 'Nhân Viên',
        to_truong: 'Tổ Trưởng', kcs_hang: 'KCS Hàng', ky_thuat: 'Kỹ Thuật',
        nhan_vien_parttime: 'NV Part-Time', hoa_hong: 'Hoa Hồng', ctv: 'CTV',
        nuoi_duong: 'Nuôi Dưỡng', sinh_vien: 'Sinh Viên', ke_toan: 'Kế Toán',
        nhan_su: 'Nhân Sự', thu_quy: 'Thủ Quỹ', thu_kho: 'Thủ Kho', thu_ky: 'Thư Ký'
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
