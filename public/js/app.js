// ========== GLOBAL STATE ==========
let currentUser = null;
let currentPage = 'dashboard';
let userPermissions = {};
let _configCache = {}; // Cache for app-config values

// ========== PERMISSION HELPER ==========
// Usage: canDo('crm_nhu_cau', 'edit') → true/false
// Actions: 'view', 'create', 'edit', 'delete'
function canDo(featureKey, action) {
    if (!currentUser) return false;
    if (currentUser.role === 'giam_doc') return true;
    var p = userPermissions[featureKey];
    if (!p) return false;
    return p['can_' + action] > 0;
}

// ========== ROLE CONFIG ==========
const ROLE_LABELS = {
    giam_doc: 'Giám Đốc',
    quan_ly_cap_cao: 'Quản Lý Cấp Cao',
    quan_ly: 'Quản Lý',
    truong_phong: 'Trưởng Phòng',
    nhan_vien: 'Nhân Viên',
    thu_viec: 'Thử Việc',
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
    ctv_hoa_hong: 'Chăm Sóc Affiliate',
    ctv: 'Chăm Sóc CTV',
    koc_tiktok: 'Chăm Sóc KOL/KOC Tiktok'
};

const MENU_CONFIG = [
    { id: 'dashboard', label: 'Các Chỉ Số Tổng Quan', icon: '📊', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'TỔNG QUAN', permKey: 'tong_quan' },
    { id: 'timkiemkhachhang', label: 'Tìm Kiếm Khách Hàng', icon: '🔍', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'TỔNG QUAN', href: '/timkiemkhachhanghv', permKey: 'tim_kiem_kh' },
    { id: 'goidien', label: 'Gọi Điện Telesale', icon: '📞', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'CÔNG VIỆC NV KINH DOANH', href: '/goidien', permKey: 'goi_dien' },
    { id: 'hethonggoidien', label: 'Hệ Thống Phân Chia Gọi Điện', icon: '📡', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'CÔNG VIỆC NV KINH DOANH', href: '/hethonggoidien', permKey: 'he_thong_goi_dien' },
    { id: 'nhantintimdoitackh', label: 'Nhắn Tìm Đối Tác KH KOL Tiktok', icon: '💬', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'CÔNG VIỆC NV KINH DOANH', href: '/nhantintimdoitackh', permKey: 'nhan_tin_doi_tac' },
    { id: 'addcmtdoitackh', label: 'Add/Cmt Đối Tác KH', icon: '👥', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'CÔNG VIỆC NV KINH DOANH', href: '/addcmtdoitackh', permKey: 'add_cmt_doi_tac' },
    { id: 'dangvideo', label: 'Đăng Video Isocal', icon: '🎬', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'CÔNG VIỆC NV KINH DOANH', href: '/dangvideo', permKey: 'dang_video' },
    { id: 'dangcontent', label: 'Đăng Content Isocal', icon: '✍️', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'CÔNG VIỆC NV KINH DOANH', href: '/dangcontent', permKey: 'dang_content' },
    { id: 'danggruop', label: 'Đăng & Tìm KH Group', icon: '📢', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'CÔNG VIỆC NV KINH DOANH', href: '/danggruop', permKey: 'dang_group' },
    { id: 'seddingcongdong', label: 'Sedding Cộng Đồng & Lẫn Nhau', icon: '🌐', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'CÔNG VIỆC NV KINH DOANH', href: '/seddingcongdong', permKey: 'sedding_cong_dong' },
    { id: 'dangbanthansp', label: 'Đăng Bản Thân & Sản Phẩm', icon: '📸', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'CÔNG VIỆC NV KINH DOANH', href: '/dangbanthansp', permKey: 'dang_ban_than' },
    { id: 'timgrzalovathongke', label: 'Tìm Gr Zalo Và Join', icon: '🔍', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'CÔNG VIỆC NV KINH DOANH', href: '/timgrzalovathongke', permKey: 'tim_gr_zalo' },
    { id: 'hethongphanchiagrzalo', label: 'Nhóm Spam Zalo', icon: '📱', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong'], section: 'CÔNG VIỆC NV KINH DOANH', href: '/hethongphanchiagrzalo', permKey: 'nhom_spam_zalo' },
    { id: 'tuyendungsvkd', label: 'Tuyển Dụng SV KD', icon: '🎓', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'CÔNG VIỆC NV KINH DOANH', href: '/tuyendungsvkd', permKey: 'tuyen_dung_sv' },
    { id: 'crm-nhu-cau', label: 'Chăm Sóc KH Nhu Cầu', icon: '📋', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'KINH DOANH CHĂM SÓC', permKey: 'crm_nhu_cau' },
    { id: 'crm-ctv', label: 'Chăm Sóc CTV', icon: '🤝', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'KINH DOANH CHĂM SÓC', permKey: 'crm_ctv' },
    { id: 'cham-soc-affiliate', label: 'Chăm Sóc Affiliate', icon: '💝', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'KINH DOANH CHĂM SÓC', href: '/chamsocaffiliate', permKey: 'crm_affiliate' },
    { id: 'cham-soc-koc-kol', label: 'Chăm Sóc KOL/KOC Tiktok', icon: '🎵', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'KINH DOANH CHĂM SÓC', href: '/chamsockockol', permKey: 'crm_koc_kol' },
    { id: 'chap-nhan-ctv-affiliate', label: 'Chấp Nhận CTV / Affiliate', icon: '✅', roles: ['giam_doc'], section: 'KINH DOANH CHĂM SÓC', href: '/chapnhanctvaffliate' },
    { id: 'tai-khoan-affiliate', label: 'Tài Khoản Affiliate', icon: '🔑', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'QUẢN LÝ AFFILIATE', permKey: 'tk_affiliate' },
    { id: 'quanlytkhethongaff', label: 'QL Hệ Thống Affiliate', icon: '📊', roles: ['giam_doc'], section: 'QUẢN LÝ AFFILIATE', href: '/quanlytkhethongaff' },
    { id: 'quan-ly-affiliate', label: 'Chỉ Số Affiliate HV', icon: '🤝', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'QUẢN LÝ AFFILIATE', permKey: 'chi_so_affiliate' },
    { id: 'bang-xep-hang-affiliate', label: 'Bảng Xếp Hạng Affiliate', icon: '🏆', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'BXH & GIẢI THƯỞNG', href: '/bangxephangaffiliate', dynamicRoles: 'leaderboard_allowed_roles', permKey: 'bxh_affiliate' },
    { id: 'bang-xep-hang-kinh-doanh', label: 'Bảng Xếp Hạng Kinh Doanh', icon: '📊', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'BXH & GIẢI THƯỞNG', href: '/bangxephangkinhdoanh', dynamicRoles: 'bxh_kinhdoanh_allowed_roles', permKey: 'bxh_kinh_doanh' },
    { id: 'bang-xep-hang-sale', label: 'Bảng Xếp Hạng Sale', icon: '💼', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'BXH & GIẢI THƯỞNG', href: '/bangxephangsale', dynamicRoles: 'bxh_sale_allowed_roles', permKey: 'bxh_sale' },
    { id: 'bang-xep-hang-ctv', label: 'Bảng Xếp Hạng CTV', icon: '🤝', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'BXH & GIẢI THƯỞNG', href: '/bangxephangctv', dynamicRoles: 'bxh_ctv_allowed_roles', permKey: 'bxh_ctv' },
    { id: 'bxh-san-xuat', label: 'BXH Khối Sản Xuất', icon: '🏭', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'BXH & GIẢI THƯỞNG', href: '/bxhsanxuat', dynamicRoles: 'bxh_sanxuat_allowed_roles', permKey: 'bxh_san_xuat' },
    { id: 'bxh-van-phong', label: 'BXH Khối Văn Phòng', icon: '🏢', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'BXH & GIẢI THƯỞNG', href: '/bxhvanphong', dynamicRoles: 'bxh_vanphong_allowed_roles', permKey: 'bxh_van_phong' },
    { id: 'giai-thuong-game', label: 'Setup Giải Thưởng Game', icon: '🎮', roles: ['giam_doc'], section: 'BXH & GIẢI THƯỞNG', href: '/giaithuonggame' },
    { id: 'trao-giai-thuong', label: 'Trao Giải Thưởng', icon: '🏆', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'BXH & GIẢI THƯỞNG', href: '/traogiaithuong', permKey: 'trao_giai_thuong' },
    { id: 'withdraw-manage', label: 'Duyệt Rút Tiền', icon: '🏦', roles: ['giam_doc','quan_ly_cap_cao'], section: 'QUẢN LÝ AFFILIATE', permKey: 'duyet_rut_tien' },
    { id: 'cap-cuu-sep', label: 'Cấp Cứu Sếp', icon: '🚨', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'HỖ TRỢ NHÂN VIÊN HV', permKey: 'cap_cuu_sep' },
    { id: 'huy-khach', label: 'Hủy Khách Hàng', icon: '❌', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'HỖ TRỢ NHÂN VIÊN HV', permKey: 'huy_khach' },
    { id: 'chuyen-so', label: 'Chuyển Số NV Kinh Doanh', icon: '📱', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time','hoa_hong','tkaffiliate'], section: 'HỖ TRỢ NHÂN VIÊN HV', permKey: 'chuyen_so' },
    { id: 'quanlytkhethongaff', label: 'QL Hệ Thống Affiliate', icon: '📊', roles: ['tkaffiliate'], section: 'HỖ TRỢ NHÂN VIÊN HV', href: '/quanlytkhethongaff', strictRoles: true },
    { id: 'mo-khoa-tk-phat', label: 'Mở Khóa Phạt Tài Khoản', icon: '🔓', roles: ['giam_doc','quan_ly_cap_cao','quan_ly'], section: 'HỖ TRỢ NHÂN VIÊN HV', href: '/mokhoatkphat', permKey: 'mo_khoa_tk_phat' },
    { id: 'accounts', label: 'Tài Khoản Nhân Viên', icon: '👥', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'QUẢN LÝ NHÂN VIÊN HV', permKey: 'nhan_vien' },
    // { id: 'quan-ly-tk-affiliate', label: 'Quản Lý TK Affiliate', icon: '🔑', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'QUẢN LÝ NHÂN VIÊN HV', href: '/quanlyaffiliate' },
    { id: 'teams', label: 'Cơ Cấu Tổ Chức', icon: '🏢', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'QUẢN LÝ NHÂN VIÊN HV', permKey: 'co_cau_to_chuc' },
    { id: 'permissions', label: 'Phân Quyền', icon: '🔐', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'QUẢN LÝ NHÂN VIÊN HV', permKey: 'phan_quyen' },
    { id: 'khoa-tk-nv', label: 'Nhân Viên Bị Phạt Tiền', icon: '💰', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'QUẢN LÝ NHÂN VIÊN HV', href: '/khoatknv', permKey: 'khoa_tk_nv' },
    { id: 'xin-nghi-nv', label: 'Xin Nghỉ NV', icon: '📋', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'QUẢN LÝ NHÂN VIÊN HV', href: '/xinnghinhanvien', permKey: 'xin_nghi_nv' },
    { id: 'setup-ngay-le', label: 'Setup Ngày Lễ', icon: '📅', roles: ['giam_doc','quan_ly_cap_cao'], section: 'QUẢN LÝ NHÂN VIÊN HV', href: '/setupngayle', permKey: 'setup_ngay_le' },
    { id: 'settings', label: 'Cài Đặt Phân Tầng', icon: '⚙️', roles: ['giam_doc'], section: 'HỆ THỐNG', permKey: 'cai_dat' },
    { id: 'my-customers', label: 'Khách Hàng Của Tôi', icon: '👤', roles: ['hoa_hong'], section: 'HOA HỒNG' },
    { id: 'withdraw', label: 'Rút Tiền', icon: '💰', roles: ['hoa_hong'], section: 'HOA HỒNG' },
    { id: 'tu-van-khach-aff', label: 'Theo Dõi Tư Vấn Khách', icon: '📋', roles: ['tkaffiliate'], section: 'AFFILIATE' },
    { id: 'theo-doi-tu-van-aff', label: 'Theo Dõi Tư Vấn Affiliate', icon: '🤝', roles: ['tkaffiliate'], section: 'AFFILIATE' },
    { id: 'bao-cao-hoa-hong-hv', label: 'Báo Cáo Hoa Hồng HV', icon: '📊', roles: ['tkaffiliate'], section: 'BÁO CÁO', href: '/bao-cao-hoa-hong-hv', strictRoles: true },
    { id: 'rut-tien-affiliate', label: 'Rút Tiền', icon: '🏦', roles: ['tkaffiliate'], section: 'AFFILIATE' },
    { id: 'huong-dan-su-dung', label: 'Hướng Dẫn Sử Dụng', icon: '📖', roles: ['tkaffiliate'], section: 'BÁO CÁO', href: '/huong-dan-su-dung', strictRoles: true },

    // ========== QUẢN LÝ CÔNG VIỆC ==========
    { id: 'lich-khoa-bieu', label: 'Lịch Khóa Biểu Công Việc', icon: '📅', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'CÔNG VIỆC HẰNG NGÀY', href: '/lichkhoabieu', permKey: 'lich_khoa_bieu' },
    // { id: 'congvieckhoaxuly', label: 'CV Phạt Phải Xử Lý', icon: '⚠️', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'CÔNG VIỆC HẰNG NGÀY', href: '/congvieckhoaxuly' },
    { id: 'lich-su-bao-cao', label: 'Lịch Sử Báo Cáo CV', icon: '📊', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'CÔNG VIỆC HẰNG NGÀY', href: '/lichsubaocaocv', permKey: 'lich_su_bao_cao' },
    { id: 'bangiao-diem-kd', label: 'Bàn Giao CV Điểm', icon: '🏪', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'CÔNG VIỆC HẰNG NGÀY', href: '/bangiaodiem', permKey: 'bangiao_diem' },
    { id: 'bangiao-khoa', label: 'Bàn Giao CV Khóa - Chuỗi', icon: '🔐', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'CÔNG VIỆC HẰNG NGÀY', href: '/bangiaokhoa', permKey: 'bangiao_khoa' },
    { id: 'don-khach-sll', label: 'Đơn Khách SLL', icon: '📦', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'CÔNG VIỆC CHĂM SÓC KHÁCH', href: '/donkhachsll', permKey: 'don_khach_sll' },
    { id: 'don-khach-nhieu-lan', label: 'Đơn Khách Nhiều Lần', icon: '🔄', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'CÔNG VIỆC CHĂM SÓC KHÁCH', href: '/donkhachnhieulan', permKey: 'don_khach_nhieu_lan' },
    { id: 'don-khach-moi', label: 'Đơn Khách Mới', icon: '🆕', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'CÔNG VIỆC CHĂM SÓC KHÁCH', href: '/donkhachmoi', permKey: 'don_khach_moi' },
    { id: 'don-quan-he', label: 'Đơn Quan Hệ', icon: '🤝', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'CÔNG VIỆC CHĂM SÓC KHÁCH', href: '/donquanhe', permKey: 'don_quan_he' },
];

// permKey is now inline in MENU_CONFIG — no separate mapping needed

// ========== INIT ==========
var _isDoitacDomain = window.location.hostname.indexOf('dongphuchv.net') !== -1;

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    setupEventListeners();
    handleRoute();

    // ★ DOITAC PORTAL — skip ALL internal popups & polling for speed
    if (_isDoitacDomain) return;

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
    if (currentUser && ['quan_ly_cap_cao', 'quan_ly', 'truong_phong', 'nhan_vien', 'thu_viec', 'part_time'].includes(currentUser.role)) {
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
    if (currentUser && ['nhan_vien', 'thu_viec', 'truong_phong'].includes(currentUser.role)) {
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

    // CTV Conversion pending badge polling
    if (currentUser && ['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(currentUser.role)) {
        _ctvPollBadge();
        setInterval(_ctvPollBadge, 30000);
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

// ========== CTV CONVERSION PENDING BADGE POLLING ==========
async function _ctvPollBadge() {
    try {
        const data = await apiCall('/api/crm-conversion/pending-count');
        const badge = document.getElementById('ctvPendingBadge');
        if (badge) {
            if (data.count > 0) {
                badge.textContent = data.count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch(e) { /* silent */ }
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
            // Trên dongphuchv.net redirect về trang login affiliate
            window.location.href = window.location.hostname.indexOf('dongphuchv.net') !== -1 ? '/' : '/index.html';
            return;
        }
        currentUser = data.user;
        userPermissions = data.user.permissions || {};

        // ★ ACCESS BLOCK CHECK — chỉ GĐ được miễn
        if (data.user.access_blocked && data.user.role !== 'giam_doc') {
            _showAccessBlockScreen();
            return;
        }

        // ★ DOITAC PORTAL — skip heavy config loading for speed
        if (!_isDoitacDomain) {
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

            // Nhân Sự Toàn Quyền (HR) — cho thấy menu mở khóa dù role là nhan_vien
            try {
                const hrCfg = await fetch('/api/app-config/access_unblock_managers').then(r => r.json()).catch(() => ({}));
                if (hrCfg?.value) {
                    const hrIds = JSON.parse(hrCfg.value);
                    if (hrIds.includes(data.user.id)) {
                        const mkItem = MENU_CONFIG.find(m => m.id === 'mo-khoa-tk-phat');
                        if (mkItem && !mkItem.roles.includes(data.user.role)) mkItem.roles.push(data.user.role);
                    }
                }
            } catch(e) {}

            // CTV Approver — cho người được chỉ định thấy menu Chấp Nhận CTV
            try {
                const ctvCfg = await fetch('/api/app-config/crm_conversion_approver_ids').then(r => r.json()).catch(() => ({}));
                if (ctvCfg?.value) {
                    const ctvIds = JSON.parse(ctvCfg.value);
                    if (ctvIds.includes(data.user.id)) {
                        const ctvItem = MENU_CONFIG.find(m => m.id === 'chap-nhan-ctv-affiliate');
                        if (ctvItem && !ctvItem.roles.includes(data.user.role)) ctvItem.roles.push(data.user.role);
                    }
                }
            } catch(e) {}
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
    { name: 'KẾT QUẢ & VINH DANH', sections: ['BÁO CÁO', 'TỔNG QUAN', 'BXH & GIẢI THƯỞNG'] },
    { name: 'QUẢN LÝ CÔNG VIỆC', sections: ['CÔNG VIỆC HẰNG NGÀY', 'CÔNG VIỆC CHĂM SÓC KHÁCH'] },
    { name: 'BỘ PHẬN KINH DOANH', sections: ['CÔNG VIỆC NV KINH DOANH', 'KINH DOANH CHĂM SÓC', 'QUẢN LÝ AFFILIATE'] },
    { name: 'NHÂN SỰ & VẬN HÀNH', sections: ['HỖ TRỢ NHÂN VIÊN HV', 'QUẢN LÝ NHÂN VIÊN HV', 'HỆ THỐNG'] }
];

function renderSidebar() {
    var nav = document.getElementById('sidebarNav');
    var html = '';
    var sectionItems = {};
    var sectionOrder = [];

    // Group items by section
    // ★ DOITAC PORTAL — chỉ hiển thị menu affiliate trên dongphuchv.net
    var _isDoitacPortal = window.location.hostname.indexOf('dongphuchv.net') !== -1;
    var DOITAC_ALLOWED_IDS = ['tu-van-khach-aff', 'theo-doi-tu-van-aff', 'bao-cao-hoa-hong', 'rut-tien-affiliate', 'chuyen-so', 'quanlytkhethongaff', 'bao-cao-hoa-hong-hv', 'huong-dan-su-dung'];

    MENU_CONFIG.forEach(function(item) {
        // Trên dongphuchv.net: chỉ hiển thị menu affiliate
        if (_isDoitacPortal && DOITAC_ALLOWED_IDS.indexOf(item.id) === -1) return;

        if (item.strictRoles && !item.roles.includes(currentUser.role)) return;
        if (currentUser.role !== 'giam_doc') {
            var permKey = item.permKey;
            if (permKey) {
                // permKey is the SOLE authority — ignore roles[]
                // If user has can_view permission (direct or inherited), show it
                if (!userPermissions[permKey] || !userPermissions[permKey].can_view) return;
            } else {
                // No permKey — fall back to roles[] check
                if (!item.roles.includes(currentUser.role)) return;
            }
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
        // ★ DOITAC PORTAL — đổi tên parent cho affiliate portal
        var _doitacParentNames = { 'KẾT QUẢ & VINH DANH': 'BÁO CÁO & HƯỚNG DẪN', 'NHÂN SỰ & VẬN HÀNH': 'HỆ THỐNG QUẢN TRỊ' };
        var _doitacSectionNames = { 'HỖ TRỢ NHÂN VIÊN HV': 'CHUYỂN SỐ & QUẢN LÝ KHÁCH', 'AFFILIATE': 'THEO DÕI KHÁCH & RÚT TIỀN' };
        var displayParentName = (_isDoitacPortal && _doitacParentNames[parent.name]) ? _doitacParentNames[parent.name] : parent.name;
        html += '<span class="nav-parent-text">' + displayParentName + '</span>';
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
            var displaySectionName = (_isDoitacPortal && _doitacSectionNames[sectionName]) ? _doitacSectionNames[sectionName] : sectionName;
            html += '<span class="nav-section-text">' + displaySectionName + '</span>';
            html += '<span class="nav-section-chevron">' + chevron + '</span>';
            html += '</div>';
            html += '<div class="nav-section-items" style="' + (isCollapsed ? 'display:none;' : '') + '">';

            items.forEach(function(item) {
                var itemHref = item.href || ('/' + item.id);
                var isActive = currentPage === item.id ? 'active' : '';
                var clickAction = item.href ? "saveSidebarScrollAndNavigate('" + item.href + "')" : "navigate('" + item.id + "')";
                html += '<a class="nav-item ' + isActive + '" data-page="' + item.id + '" href="' + itemHref + '" onclick="event.preventDefault(); ' + clickAction + '">';
                html += '<span class="nav-icon">' + item.icon + '</span> ' + item.label;
                if (item.id === 'chap-nhan-ctv-affiliate') html += '<span id="ctvPendingBadge" style="display:none;margin-left:6px;background:#ef4444;color:white;font-size:10px;font-weight:800;padding:1px 6px;border-radius:8px;min-width:16px;text-align:center;"></span>';
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
        var displaySectionName = (_isDoitacPortal && _doitacSectionNames[sectionName]) ? _doitacSectionNames[sectionName] : sectionName;
        html += '<span class="nav-section-text">' + displaySectionName + '</span>';
        html += '<span class="nav-section-chevron">' + chevron + '</span>';
        html += '</div>';
        html += '<div class="nav-section-items" style="' + (isCollapsed ? 'display:none;' : '') + '">';

        items.forEach(function(item) {
            var itemHref = item.href || ('/' + item.id);
            var isActive = currentPage === item.id ? 'active' : '';
            var clickAction = item.href ? "saveSidebarScrollAndNavigate('" + item.href + "')" : "navigate('" + item.id + "')";
            html += '<a class="nav-item ' + isActive + '" data-page="' + item.id + '" href="' + itemHref + '" onclick="event.preventDefault(); ' + clickAction + '">';
            html += '<span class="nav-icon">' + item.icon + '</span> ' + item.label;
            if (item.id === 'chap-nhan-ctv-affiliate') html += '<span id="ctvPendingBadge" style="display:none;margin-left:6px;background:#ef4444;color:white;font-size:10px;font-weight:800;padding:1px 6px;border-radius:8px;min-width:16px;text-align:center;"></span>';
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
    const ROLE_MAP = { giam_doc:'Giám Đốc', quan_ly_cap_cao:'Quản Lý Cấp Cao', quan_ly:'Quản Lý', truong_phong:'Trưởng Phòng', nhan_vien:'Nhân Viên', thu_viec:'Thử Việc', part_time:'Part Time', tkaffiliate:'TK Affiliate' };
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

    // Block tkaffiliate from dashboard — redirect to bao-cao-hoa-hong-hv
    if (pathname === 'dashboard' && currentUser && currentUser.role === 'tkaffiliate') {
        currentPage = 'bao-cao-hoa-hong-hv';
        history.replaceState({ page: currentPage }, '', '/bao-cao-hoa-hong-hv');
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

    // Add "Chuyển Số" button for specific KD pages
    const CHUYEN_SO_PAGES = ['nhantintimdoitackh','addcmtdoitackh','dangvideo','dangcontent','danggruop','seddingcongdong','dangbanthansp','timgrzalovathongke','tuyendungsvkd','cham-soc-koc-kol'];
    const existingCsBtn = document.getElementById('topbarChuyenSoBtn');
    if (existingCsBtn) existingCsBtn.remove();
    if (CHUYEN_SO_PAGES.includes(currentPage)) {
        const csBtn = document.createElement('button');
        csBtn.id = 'topbarChuyenSoBtn';
        csBtn.onclick = function(){
            // Detect active Lĩnh Vực from current page category filter
            let linhVuc = '';
            // nhantintimdoitackh: _poSelectedCat + _po.categories
            if (typeof _poSelectedCat !== 'undefined' && _poSelectedCat && typeof _po !== 'undefined') {
                const cat = (_po.categories || []).find(c => c.id === _poSelectedCat);
                if (cat) linhVuc = cat.name;
            }
            // dailylinks (danggruop): _dlCatFilter + _dl.categories
            if (!linhVuc && typeof _dlCatFilter !== 'undefined' && _dlCatFilter !== 'all' && typeof _dl !== 'undefined') {
                const cat = (_dl.categories || []).find(c => String(c.id) === String(_dlCatFilter));
                if (cat) linhVuc = cat.name;
            }
            openChuyenSoMXH(currentPage, linhVuc);
        };
        csBtn.innerHTML = '📱 CHUYỂN SỐ';
        csBtn.style.cssText = 'background:#ea580c;color:white;border:none;padding:8px 20px;border-radius:10px;font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 3px 10px rgba(234,88,12,0.3);transition:all 0.2s;letter-spacing:0.5px;margin-left:16px;white-space:nowrap;font-family:Inter,system-ui,-apple-system,sans-serif;';
        csBtn.onmouseover = function(){ this.style.transform='scale(1.05)'; this.style.background='#c2410c'; };
        csBtn.onmouseout = function(){ this.style.transform='scale(1)'; this.style.background='#ea580c'; };
        document.querySelector('.topbar-left').appendChild(csBtn);
    }

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

    try {
        switch (currentPage) {
            case 'accounts': renderAccountsPage(content); break;
            case 'teams': renderTeamsPage(content); break;
            case 'permissions': renderPermissionsPage(content); break;
            case 'quan-ly-affiliate': renderQuanLyAffiliatePage(content); break;
            case 'settings': renderSettingsPage(content); break;
            case 'dashboard': renderDashboardPage(content); break;
            case 'chuyen-so': renderChuyenSoPage(content); break;
            case 'tu-van-khach-aff': renderBaoCaoHoaHongPage(content, 'nhu_cau'); break;
            case 'theo-doi-tu-van-aff': renderBaoCaoHoaHongPage(content, 'ctv_hoa_hong'); break;
            case 'bao-cao-hoa-hong': case 'baocaohoahong': renderBaoCaoHoaHongPage(content); break;
            case 'crm-nhu-cau': renderCRMNhuCauPage(content); break;
            case 'crm-ctv': renderCRMCtvPage(content); break;
            case 'cham-soc-affiliate': case 'chamsocaffiliate': renderCRMAffPage(content); break;
            case 'cham-soc-koc-kol': case 'chamsockockol': renderCRMKocKolPage(content); break;
            case 'chap-nhan-ctv-affiliate': case 'chapnhanctvaffliate': renderChapNhanCTVAffiliatePage(content); break;
            case 'cap-cuu-sep': renderEmergencyPage(content); break;
            case 'huy-khach': renderCancelPage(content); break;
            case 'tai-khoan-affiliate': renderTaiKhoanAffiliatePage(content); break;
            case 'my-customers': renderMyCustomersPage(content); break;
            case 'withdraw': renderWithdrawPage(content); break;
            case 'withdraw-manage': renderWithdrawManagePage(content); break;
            case 'rut-tien-affiliate': renderWithdrawAffiliatePage(content); break;
            case 'bao-cao-hoa-hong-hv': case 'baocaohoahonghv': renderBaoCaoHoaHongHVPage(content); break;
            case 'huong-dan-su-dung': case 'huongdansudung': renderHuongDanSuDungPage(content); break;
            case 'quanlytkhethongaff': renderQuanLyHTAffPage(content); break;
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
            case 'mo-khoa-tk-phat': case 'mokhoatkphat': renderMoKhoaTKPhatPage(content); break;
            case 'xin-nghi-nv': case 'xinnghinhanvien': renderXinNghiPage(content); break;
            case 'setup-ngay-le': case 'setupngayle': renderSetupNgayLePage(content); break;
            case 'bangiao-khoa': case 'bangiaokhoa': renderBanGiaoKhoaPage(content); break;
            case 'goidien': renderGoiDienPage(content); break;
            case 'hethonggoidien': renderHeThongGoiDienPage(content); break;
            case 'quytacnuttuvancrmnhucau': renderQuyTacTuVanPage(content); break;
            case 'quytacnuttuvancrmctv': renderQuyTacTuVanCtvPage(content); break;
            case 'quytacnuttuvancrmaffiliate': renderQuyTacTuVanAffPage(content); break;
            case 'quytacnuttuvancrmkockol': renderQuyTacTuVanKocKolPage(content); break;
            case 'dailylinks': renderDailyLinksPage(content); break;
            case 'timgrzalovathongke': content.innerHTML=''; setTimeout(function(){if(typeof _dlInit==='function')_dlInit();},50); break;
            case 'hethongphanchiagrzalo': content.innerHTML=''; setTimeout(function(){if(typeof _zpInit==='function')_zpInit();},50); break;
            case 'addcmtdoitackh': content.innerHTML=''; setTimeout(function(){if(typeof _acInit==='function')_acInit();},50); break;
            case 'timkiemkhachhang': case 'timkiemkhachhanghv': renderTimKiemKhachHang(content); break;
            default:
                // ========== CONVENTION-BASED AUTO-RENDER ==========
                // Try multiple naming patterns to auto-discover page render functions
                if (!_tryAutoRenderPage(currentPage, content)) {
                    renderComingSoon(content);
                }
                break;
        }
    } catch (err) {
        console.error('❌ Page render error:', err);
        content.innerHTML = '<div class="card"><div class="card-body"><div class="empty-state"><div class="icon">⚠️</div><h3>Lỗi tải trang</h3><p>' + (err.message || 'Không thể tải trang. Vui lòng thử lại.') + '</p><button class="btn btn-primary" onclick="handleRoute()" style="margin-top:12px;">🔄 Thử lại</button></div></div></div>';
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

    // Override badges for ALL users (show ✏️ TC on sidebar menu items with custom points/quantity)
    _refreshOverrideBadges();

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

// ========== OVERRIDE BADGES ON SIDEBAR MENU ==========
// Map task_name from schedule → sidebar menu item data-page
const _OVERRIDE_TASK_MAP = [
    { re: /gọi.*điện.*telesale/i, page: 'goidien' },
    { re: /tự.*tìm.*kiếm.*telesale/i, page: 'goidien' },
    { re: /nh[ắấ]n.*t[iì]m.*đ[ốồ]i.*t[áà]c/i, page: 'nhantintimdoitackh' },
    { re: /add.*cmt.*đối.*tác/i, page: 'addcmtdoitackh' },
    { re: /đăng.*video/i, page: 'dangvideo' },
    { re: /đăng.*content/i, page: 'dangcontent' },
    { re: /đăng.*tìm.*kh.*group/i, page: 'danggruop' },
    { re: /sedding.*cộng.*đồng/i, page: 'seddingcongdong' },
    { re: /đăng.*bản.*thân/i, page: 'dangbanthansp' },
    { re: /tìm.*gr.*zalo/i, page: 'timgrzalovathongke' },
    { re: /tuyển.*dụng.*sv/i, page: 'tuyendungsvkd' },
];

function _getOverrideMenuPage(taskName) {
    if (!taskName) return null;
    for (const m of _OVERRIDE_TASK_MAP) { if (m.re.test(taskName)) return m.page; }
    return null;
}

async function _refreshOverrideBadges() {
    try {
        const data = await apiCall('/api/schedule/my-override-tasks').catch(() => ({ overrides: [] }));
        const overrides = data.overrides || [];

        // Remove all existing override badges first
        document.querySelectorAll('.nav-override-badge').forEach(el => el.remove());

        if (overrides.length === 0) return;

        // Collect unique page IDs that have overrides
        const overridePages = new Set();
        overrides.forEach(ov => {
            if (ov.task_name) {
                const page = _getOverrideMenuPage(ov.task_name);
                if (page) overridePages.add(page);
            }
        });

        if (overridePages.size === 0) return;

        // Inject badge CSS once
        if (!document.getElementById('_overrideBadgeCSS')) {
            const st = document.createElement('style');
            st.id = '_overrideBadgeCSS';
            st.textContent = `
                .nav-override-badge {
                    display:inline-flex;align-items:center;justify-content:center;
                    background:linear-gradient(135deg,#f59e0b,#d97706);color:white;
                    font-size:8px;padding:2px 5px;border-radius:4px;font-weight:800;
                    line-height:1;margin-left:4px;flex-shrink:0;
                    box-shadow:0 1px 3px rgba(217,119,6,0.3);
                    animation:_ovBadgePulse 3s ease-in-out infinite;
                }
                @keyframes _ovBadgePulse {
                    0%,100% { opacity:0.85; }
                    50% { opacity:1; }
                }
            `;
            document.head.appendChild(st);
        }

        // Add badge to matching nav items
        overridePages.forEach(pageId => {
            const navItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
            if (navItem && !navItem.querySelector('.nav-override-badge')) {
                const badge = document.createElement('span');
                badge.className = 'nav-override-badge';
                badge.title = 'Đã tùy chỉnh điểm/số lượng';
                badge.textContent = '✏️ TC';
                navItem.appendChild(badge);
            }
        });
    } catch(e) { /* silent */ }
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

// ========== CONVENTION-BASED AUTO-RENDER ==========
// Registry cho các trang có tên hàm KHÔNG theo convention
// Key = page id (từ MENU_CONFIG), Value = tên hàm init
var _PAGE_INIT_REGISTRY = {
    'nhantintimdoitackh': '_poInit',
    'addcmtdoitackh': '_acInit',
    'dangvideo': '_dvInit',
    'dangcontent': '_dcInit',
    'danggruop': '_dgInit',
    'seddingcongdong': '_sdInit',
    'dangbanthansp': '_dbInit',
    'tuyendungsvkd': '_tdInit',
    'don-khach-sll': '_dkInit',
    'donkhachsll': '_dkInit',
    'don-khach-nhieu-lan': '_dnlInit',
    'donkhachnhieulan': '_dnlInit',
    'don-khach-moi': '_dkmInit',
    'donkhachmoi': '_dkmInit',
    'don-quan-he': '_dqhInit',
    'donquanhe': '_dqhInit',
};

function _tryAutoRenderPage(pageId, content) {
    // 1. Check registry first (pages with non-standard function names)
    var registryFn = _PAGE_INIT_REGISTRY[pageId];
    if (registryFn && typeof window[registryFn] === 'function') {
        console.log('[AutoRender] ✅ Found via registry:', pageId, '→', registryFn);
        content.innerHTML = '';
        setTimeout(function(){ window[registryFn](); }, 50);
        return true;
    }

    // 2. Try convention: renderXxxPage(content) — e.g. 'dangvideo' → renderDangvideoPage
    var cleanId = pageId.replace(/-/g, '');
    var capId = cleanId.charAt(0).toUpperCase() + cleanId.slice(1);
    var renderName = 'render' + capId + 'Page';
    if (typeof window[renderName] === 'function') {
        console.log('[AutoRender] ✅ Found via convention:', pageId, '→', renderName);
        window[renderName](content);
        return true;
    }

    // 3. Try _xxInit() pattern — common prefix from page id
    // e.g. 'dangvideo' → try '_dangvideoInit', '_dvInit'
    var initName = '_' + cleanId + 'Init';
    if (typeof window[initName] === 'function') {
        console.log('[AutoRender] ✅ Found via init:', pageId, '→', initName);
        content.innerHTML = '';
        setTimeout(function(){ window[initName](); }, 50);
        return true;
    }

    console.warn('[AutoRender] ❌ No render function found for page:', pageId,
        '| Tried:', renderName, ',', initName, ', registry:', registryFn || 'none');
    return false;
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

    // Mobile: close sidebar when tapping overlay
    var sidebarOverlay = document.getElementById('sidebarOverlay');
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function() {
            document.getElementById('sidebar').classList.remove('open');
            sidebarOverlay.classList.remove('show');
        });
    }
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
var _sidebarOpen = false;
function toggleSidebar(forceMode) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const btn = document.getElementById('sidebarToggleBtn');
    const menuBtn = document.getElementById('menuToggle');

    // Detect mobile: forceMode='mobile' OR narrow viewport OR menuToggle visible
    const isMobile = forceMode === 'mobile'
        || window.innerWidth <= 768
        || (menuBtn && menuBtn.offsetWidth > 0);

    if (isMobile) {
        // Mobile: use inline styles (highest CSS specificity, cannot be overridden)
        _sidebarOpen = !_sidebarOpen;
        if (_sidebarOpen) {
            sidebar.style.cssText = 'transform:translateX(0) !important;pointer-events:auto !important;z-index:99999 !important;box-shadow:4px 0 30px rgba(0,0,0,0.4) !important;width:270px !important;position:fixed !important;top:0 !important;left:0 !important;bottom:0 !important;';
            if (overlay) overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99998;display:block !important;';
        } else {
            sidebar.style.cssText = '';
            if (overlay) overlay.style.cssText = '';
        }
        return;
    }

    // Desktop mode: collapse/expand sidebar
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    if (btn) btn.textContent = isCollapsed ? '▶' : '◀';
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

// ========== CHUYỂN SỐ MXH — GLOBAL MODAL ==========
async function openChuyenSoMXH(pageId, linhVucName, onSuccess) {
    // Store callback globally for reliable access from submit handler
    window._csMxhOnSuccess = typeof onSuccess === 'function' ? onSuccess : null;
    // Load dropdown data
    const isPoPage = pageId === 'nhantintimdoitackh';
    const isDangGroup = pageId === 'danggruop';
    const needsLinhVucDropdown = isPoPage || isDangGroup;
    // Công Việc auto-mapping
    const _congViecMap = {
        'nhantintimdoitackh': 'Nhắn Tìm Đối Tác KH KOL Tiktok',
        'addcmtdoitackh': 'Add/Cmt Đối Tác KH',
        'dangvideo': 'Đăng Video Isocal',
        'dangcontent': 'Đăng Content Isocal',
        'danggruop': 'Đăng & Tìm KH Group',
        'seddingcongdong': 'Sedding Cộng Đồng & Lẫn Nhau',
        'dangbanthansp': 'Đăng Bản Thân & Sản Phẩm',
        'timgrzalovathongke': 'Tìm Gr Zalo Và Join',
        'tuyendungsvkd': 'Tuyển Dụng SV KD',
        'goidientelesale': 'Gọi Điện Telesale',
        'cham-soc-koc-kol': 'Nhắn Tìm Đối Tác KH KOL Tiktok'
    };
    const congViecValue = _congViecMap[pageId] || 'Mặc Định';
    const apiCalls = [
        apiCall('/api/settings/sources'),
        apiCall('/api/settings/promotions'),
        apiCall('/api/settings/industries'),
        apiCall('/api/users/dropdown'),
        apiCall('/api/departments'),
        apiCall('/api/app-config/chuyenso_allowed_depts')
    ];
    // Load categories for Lĩnh Vực dropdown
    if (isPoPage) apiCalls.push(apiCall('/api/partner-outreach/categories'));
    else if (isDangGroup) apiCalls.push(apiCall('/api/dailylinks/categories'));
    const results = await Promise.all(apiCalls);
    const [sources, promotions, industries, usersRes, deptData, configData] = results;
    const poCats = needsLinhVucDropdown ? (results[6]?.categories || []) : [];

    const allDepts = deptData.departments || [];
    const allowedDeptIds = configData.value ? JSON.parse(configData.value) : null;
    const ROLE_LABELS = { giam_doc: 'Giám Đốc', quan_ly_cap_cao: 'Quản Lý Cấp Cao', quan_ly: 'Quản Lý', truong_phong: 'Trưởng Phòng', nhan_vien: 'Nhân Viên', thu_viec: 'Thử Việc', part_time: 'Part Time' };

    function getDeptName(deptId) { const d = allDepts.find(x => x.id === deptId); return d ? d.name : ''; }
    function getParentCode(deptId) { const d = allDepts.find(x => x.id === deptId); if (!d || !d.parent_id) return ''; const p = allDepts.find(x => x.id === d.parent_id); return p ? p.code : ''; }
    function getAllChildDeptIds(parentId) { let ids = [parentId]; allDepts.filter(d => d.parent_id === parentId).forEach(c => { ids.push(...getAllChildDeptIds(c.id)); }); return ids; }

    const allUsers = (usersRes.users || []).filter(u => ['giam_doc','quan_ly','truong_phong','nhan_vien','quan_ly_cap_cao'].includes(u.role));
    let receiverUsers = allUsers;

    if (['nhan_vien','truong_phong'].includes(currentUser.role)) {
        receiverUsers = allUsers.filter(u => u.id === currentUser.id);
    } else if (allowedDeptIds && allowedDeptIds.length > 0) {
        let visibleDeptIds = [];
        allowedDeptIds.forEach(id => visibleDeptIds.push(...getAllChildDeptIds(id)));
        receiverUsers = allUsers.filter(u => {
            if (u.role === 'giam_doc') return currentUser.role === 'giam_doc';
            if (!u.department_id) return false;
            return visibleDeptIds.includes(u.department_id);
        });
    }

    function userLabel(u) {
        let label = `${u.full_name} (${ROLE_LABELS[u.role] || u.role})`;
        if (u.department_id) { const dn = getDeptName(u.department_id); const pc = getParentCode(u.department_id); if (dn) { label += ` — ${dn}`; if (pc) label += ` - ${pc.toUpperCase()}`; } }
        return label;
    }

    // Filter sources based on page
    const isZaloPage = pageId === 'timgrzalovathongke';
    const isTuyenDungPage = pageId === 'tuyendungsvkd';
    const isKocKolPage = pageId === 'cham-soc-koc-kol';
    let allowedSourceNames;
    if (isZaloPage) {
        allowedSourceNames = ['GRUOP ZALO'];
    } else if (isTuyenDungPage) {
        allowedSourceNames = ['TUYỂN DỤNG SV'];
    } else if (isKocKolPage) {
        allowedSourceNames = ['KOL / KOC'];
    } else {
        allowedSourceNames = ['MXH NHÂN VIÊN TỰ TÌM', 'MXH KHÁCH TỰ LIÊN HỆ'];
    }
    const filteredSources = (sources.items || []).filter(s => allowedSourceNames.some(n => s.name.toUpperCase().includes(n.toUpperCase())));
    const lockedSource = (isZaloPage || isTuyenDungPage || isKocKolPage) && filteredSources.length > 0 ? filteredSources[0] : null;

    const isNVorTP = ['nhan_vien','truong_phong'].includes(currentUser.role);

    // Build overlay
    const overlay = document.createElement('div');
    overlay.id = 'chuyenSoMXHOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;animation:_csMxhFadeIn 0.25s ease;';

    overlay.innerHTML = `
        <style>
            @keyframes _csMxhFadeIn { from { opacity:0; } to { opacity:1; } }
            @keyframes _csMxhSlideUp { from { transform:translateY(30px);opacity:0; } to { transform:translateY(0);opacity:1; } }
            ._csMxh-input { width:100%;padding:10px 14px;border:1.5px solid #d1d5db;border-radius:10px;font-size:13px;font-family:Inter,sans-serif;transition:border-color 0.2s;background:#fff; }
            ._csMxh-input:focus { outline:none;border-color:#f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,0.15); }
            ._csMxh-label { display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:6px; }
            ._csMxh-required { color:#dc2626; }
        </style>
        <div style="background:white;border-radius:16px;width:580px;max-width:94vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 80px rgba(0,0,0,0.3);animation:_csMxhSlideUp 0.3s ease;">
            <div style="background:linear-gradient(135deg,#f59e0b,#ea580c);padding:20px 24px;border-radius:16px 16px 0 0;display:flex;align-items:center;justify-content:space-between;">
                <div>
                    <h3 style="margin:0;color:white;font-size:18px;font-weight:800;">📱 Chuyển Số Khách Hàng</h3>
                    <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:12px;">Chuyển số từ công việc MXH</p>
                </div>
                <span onclick="document.getElementById('chuyenSoMXHOverlay').remove()" style="cursor:pointer;color:white;font-size:24px;font-weight:700;line-height:1;opacity:0.8;transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">✕</span>
            </div>
            <form id="csMxhForm" style="padding:24px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                    <div>
                        <label class="_csMxh-label">CRM <span class="_csMxh-required">*</span></label>
                        ${isTuyenDungPage ? `
                            <input type="text" class="_csMxh-input" value="Chăm Sóc Affiliate" disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;">
                            <input type="hidden" id="csMxhCrm" value="ctv_hoa_hong">
                        ` : isKocKolPage ? `
                            <input type="text" class="_csMxh-input" value="Chăm Sóc KOL/KOC Tiktok" disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;">
                            <input type="hidden" id="csMxhCrm" value="koc_tiktok">
                        ` : `
                        <select id="csMxhCrm" class="_csMxh-input" required>
                            <option value="">-- Chọn CRM --</option>
                            <option value="nhu_cau">Chăm Sóc KH Nhu Cầu</option>
                            <option value="ctv_hoa_hong">Chăm Sóc Affiliate</option>
                        </select>
                        `}
                    </div>
                    <div>
                        <label class="_csMxh-label">Nguồn Khách <span class="_csMxh-required">*</span></label>
                        ${lockedSource ? `
                            <input type="text" class="_csMxh-input" value="${lockedSource.name}" disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;">
                            <input type="hidden" id="csMxhSource" value="${lockedSource.id}">
                        ` : `
                        <select id="csMxhSource" class="_csMxh-input" required>
                            <option value="">-- Chọn nguồn --</option>
                            ${filteredSources.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                        </select>
                        `}
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                    <div>
                        <label class="_csMxh-label">Tên Khách Hàng <span class="_csMxh-required">*</span></label>
                        <input type="text" id="csMxhName" class="_csMxh-input" placeholder="Nhập tên khách hàng" required>
                    </div>
                    <div>
                        <label class="_csMxh-label">Số Điện Thoại <span class="_csMxh-required" id="csMxhPhoneStar">*</span></label>
                        <input type="text" id="csMxhPhone" class="_csMxh-input" placeholder="Nhập SĐT" oninput="_csMxhToggleReq()">
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                    <div>
                        <label class="_csMxh-label">🔗 Link Khách Hàng <span class="_csMxh-required" id="csMxhFbStar">*</span></label>
                        <input type="url" id="csMxhFacebook" class="_csMxh-input" placeholder="https://facebook.com, instagram.com, tiktok.cr..." oninput="_csMxhToggleReq();_csMxhValidateFb()">
                        <small id="csMxhFbHint" style="color:#9ca3af;font-size:10px;">Nhập SĐT hoặc Link MXH (ít nhất 1)</small>
                    </div>
                    <div>
                        <label class="_csMxh-label">Công Việc</label>
                        <input type="text" class="_csMxh-input" value="${congViecValue}" disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;">
                        <input type="hidden" id="csMxhCongViec" value="${congViecValue}">
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                    <div>
                        <label class="_csMxh-label">Khuyến Mãi</label>
                        <select id="csMxhPromotion" class="_csMxh-input">
                            <option value="">-- Chọn khuyến mãi --</option>
                            ${(promotions.items || []).map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="_csMxh-label">Sản Phẩm</label>
                        <select id="csMxhIndustry" class="_csMxh-input">
                            <option value="">-- Chọn sản phẩm --</option>
                            ${(industries.items || []).map(i => `<option value="${i.id}">${i.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                    <div>
                        <label class="_csMxh-label">Lĩnh Vực ${needsLinhVucDropdown ? '<span class="_csMxh-required">*</span>' : ''}</label>
                        ${(needsLinhVucDropdown && !linhVucName) ? `
                            <select id="csMxhLinhVuc" class="_csMxh-input" required>
                                <option value="">-- Chọn lĩnh vực --</option>
                                ${poCats.map(c => '<option value="' + c.name + '">' + c.name + '</option>').join('')}
                            </select>
                        ` : needsLinhVucDropdown && linhVucName ? `
                            <select id="csMxhLinhVuc" class="_csMxh-input" required>
                                <option value="">-- Chọn lĩnh vực --</option>
                                ${poCats.map(c => '<option value="' + c.name + '"' + (c.name === linhVucName ? ' selected' : '') + '>' + c.name + '</option>').join('')}
                            </select>
                        ` : `
                            <input type="text" id="csMxhLinhVuc" class="_csMxh-input" value="${linhVucName || ''}" disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;" placeholder="Tự động điền từ nguồn gọi điện / MXH">
                        `}
                    </div>
                    <div></div>
                </div>
                <div style="margin-bottom:16px;">
                    <label class="_csMxh-label">Người Nhận Số <span class="_csMxh-required">*</span></label>
                    ${isNVorTP ? `
                        <input type="text" class="_csMxh-input" value="${userLabel(receiverUsers[0] || {full_name:'', role:'', department_id:null})}" disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;">
                        <input type="hidden" id="csMxhReceiver" value="${receiverUsers[0]?.id || ''}">
                    ` : `
                        <select id="csMxhReceiver" class="_csMxh-input" required>
                            <option value="">-- Chọn người nhận --</option>
                            ${receiverUsers.map(u => `<option value="${u.id}" ${u.id === currentUser.id ? 'selected' : ''}>${userLabel(u)}</option>`).join('')}
                        </select>
                    `}
                </div>
                <div style="margin-bottom:20px;">
                    <label class="_csMxh-label">Ghi chú</label>
                    <textarea id="csMxhNotes" class="_csMxh-input" rows="3" placeholder="Ghi chú thêm..." style="resize:vertical;"></textarea>
                </div>
                <button type="submit" style="background:linear-gradient(135deg,#f59e0b,#ea580c);color:white;border:none;padding:14px 40px;border-radius:12px;font-size:16px;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(245,158,11,0.35);transition:all 0.2s;width:auto;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                    📱 CHUYỂN SỐ
                </button>
            </form>
        </div>
    `;
    document.body.appendChild(overlay);

    // ========== AUTO-CHECK PARTNER OUTREACH on phone/link input ==========
    let _csMxhCheckTimer = null;
    function _csMxhAutoCheckPO() {
        clearTimeout(_csMxhCheckTimer);
        _csMxhCheckTimer = setTimeout(async () => {
            const phone = document.getElementById('csMxhPhone')?.value?.trim();
            const link = document.getElementById('csMxhFacebook')?.value?.trim();
            if ((!phone || phone.length < 3) && (!link || link.length < 5)) return;
            try {
                const params = new URLSearchParams();
                if (phone) params.set('phone', phone);
                if (link) params.set('link', link);
                const data = await apiCall(`/api/customers/check-partner-outreach?${params}`);
                if (data.match && !data.match.already_transferred) {
                    const m = data.match;
                    // Auto-fill name + LOCK it
                    if (m.partner_name) { const n = document.getElementById('csMxhName'); if (n) { n.value = m.partner_name; n.readOnly = true; n.style.background = '#f5f3ff'; n.style.color = '#6d28d9'; n.style.fontWeight = '700'; n.style.cursor = 'not-allowed'; n.style.borderColor = '#c4b5fd'; } }
                    // Update Công Việc
                    const cvh = document.getElementById('csMxhCongViec');
                    if (cvh) cvh.value = 'Nhắn Tìm Đối Tác KH KOL Tiktok';
                    // Find & update display (the disabled input next to hidden)
                    const cvDisplay = cvh?.previousElementSibling;
                    if (cvDisplay && cvDisplay.tagName === 'INPUT') { cvDisplay.value = 'Nhắn Tìm Đối Tác KH KOL Tiktok'; cvDisplay.style.color = '#6d28d9'; cvDisplay.style.background = '#f5f3ff'; }
                    // Update Lĩnh Vực
                    if (m.category_name) {
                        const lv = document.getElementById('csMxhLinhVuc');
                        if (lv) {
                            if (lv.tagName === 'SELECT') {
                                // Try to select option, add if not exists
                                let found = false;
                                for (const opt of lv.options) { if (opt.value === m.category_name) { opt.selected = true; found = true; break; } }
                                if (!found) { const opt = new Option(m.category_name, m.category_name, true, true); lv.add(opt); }
                            } else {
                                lv.value = m.category_name; lv.style.color = '#6d28d9'; lv.style.background = '#f5f3ff';
                            }
                        }
                    }
                    showToast(`ℹ️ Phát hiện KH "${m.partner_name}" thuộc Nhắn Tìm Đối Tác KH KOL Tiktok (${m.category_name || ''}) → Đã tự động chuyển Công Việc & Lĩnh Vực`);
                } else if (data.match && data.match.already_transferred) {
                    showToast(`⛔ KH "${data.match.partner_name}" đã được chuyển số trước đó!`, 'error');
                }
            } catch(e) { /* silent */ }
        }, 600);
    }
    const _mxhPhoneEl = document.getElementById('csMxhPhone');
    const _mxhFbEl = document.getElementById('csMxhFacebook');
    if (_mxhPhoneEl) _mxhPhoneEl.addEventListener('input', _csMxhAutoCheckPO);
    if (_mxhFbEl) _mxhFbEl.addEventListener('input', _csMxhAutoCheckPO);

    // Submit handler
    document.getElementById('csMxhForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            crm_type: document.getElementById('csMxhCrm').value,
            customer_name: document.getElementById('csMxhName').value,
            phone: document.getElementById('csMxhPhone').value,
            source_id: document.getElementById('csMxhSource')?.value || null,
            promotion_id: document.getElementById('csMxhPromotion')?.value || null,
            industry_id: document.getElementById('csMxhIndustry')?.value || null,
            receiver_id: document.getElementById('csMxhReceiver').value,
            notes: document.getElementById('csMxhNotes').value,
            facebook_link: document.getElementById('csMxhFacebook')?.value?.trim() || null,
            job: document.getElementById('csMxhLinhVuc')?.value || null,
            cong_viec: document.getElementById('csMxhCongViec')?.value || null
        };
        if (!body.crm_type || !body.receiver_id) { showToast('Vui lòng điền đầy đủ thông tin bắt buộc', 'error'); return; }
        if (!body.customer_name || !body.customer_name.trim()) { showToast('Vui lòng nhập Tên Khách Hàng', 'error'); return; }
        if (!body.source_id) { showToast('Vui lòng chọn Nguồn Khách', 'error'); return; }
        if (!body.phone && !body.facebook_link) { showToast('Vui lòng nhập Số Điện Thoại hoặc Link MXH', 'error'); return; }
        if (body.facebook_link && !_csMxhIsValidSocialLink(body.facebook_link)) { showToast('Link không hợp lệ! Chỉ chấp nhận link từ Facebook, Instagram, TikTok, Threads, LinkedIn, Twitter/X', 'error'); return; }
        if ('${pageId}' === 'nhantintimdoitackh' && !body.job) { showToast('Vui lòng chọn Lĩnh Vực!', 'error'); return; }
        if ('${pageId}' === 'danggruop' && !body.job) { showToast('Vui lòng chọn Lĩnh Vực!', 'error'); return; }
        try {
            const data = await apiCall('/api/customers', 'POST', body);
            if (data.success) {
                showToast(`✅ Chuyển số thành công! Mã: ${data.dailyNum}`);
                document.getElementById('chuyenSoMXHOverlay').remove();
                if (window._csMxhOnSuccess) { window._csMxhOnSuccess(data); window._csMxhOnSuccess = null; }
            } else {
                showToast(data.error, 'error');
            }
        } catch (err) {
            showToast('Lỗi kết nối', 'error');
        }
    });
}

function _csMxhToggleReq() {
    const phone = document.getElementById('csMxhPhone')?.value?.trim();
    const fb = document.getElementById('csMxhFacebook')?.value?.trim();
    const ps = document.getElementById('csMxhPhoneStar');
    const fs = document.getElementById('csMxhFbStar');
    if (ps) ps.style.display = fb ? 'none' : '';
    if (fs) fs.style.display = phone ? 'none' : '';
}

function _csMxhIsValidSocialLink(url) {
    if (!url) return true;
    try {
        const u = new URL(url);
        const host = u.hostname.replace(/^www\./, '');
        // Allowed social media domains
        const allowedDomains = [
            'facebook.com', 'm.facebook.com',
            'instagram.com',
            'tiktok.com',
            'threads.net',
            'linkedin.com',
            'twitter.com', 'x.com'
        ];
        if (!allowedDomains.includes(host)) return false;
        // Facebook-specific: block non-profile pages
        if (host === 'facebook.com' || host === 'm.facebook.com') {
            const path = u.pathname.replace(/\/+$/, '');
            const blocked = ['/groups', '/posts', '/watch', '/reel', '/reels', '/stories', '/story', '/pages', '/events', '/marketplace', '/gaming', '/live', '/photo', '/photos', '/videos', '/notes', '/permalink'];
            for (const b of blocked) { if (path.startsWith(b + '/') || path === b) return false; }
            if (path === '' || path === '/') return false;
        }
        return true;
    } catch (e) { return false; }
}
// Keep old name as alias for compatibility
function _csMxhIsValidFbProfile(url) { return _csMxhIsValidSocialLink(url); }

function _csMxhValidateFb() {
    const input = document.getElementById('csMxhFacebook');
    const hint = document.getElementById('csMxhFbHint');
    if (!input || !hint) return;
    const val = input.value.trim();
    if (!val) {
        hint.style.color = '#9ca3af';
        hint.textContent = 'Nhập SĐT hoặc Link MXH (ít nhất 1). Chấp nhận: Facebook, Instagram, TikTok, Threads, LinkedIn, Twitter/X';
        input.style.borderColor = '';
        return;
    }
    if (_csMxhIsValidSocialLink(val)) {
        hint.style.color = '#10b981';
        hint.textContent = '✅ Link MXH hợp lệ';
        input.style.borderColor = '#10b981';
    } else {
        hint.style.color = '#ef4444';
        hint.textContent = '❌ Chỉ chấp nhận link từ Facebook, Instagram, TikTok, Threads, LinkedIn, Twitter/X';
        input.style.borderColor = '#ef4444';
    }
}

// ========== SCROLL TO TARGET CUSTOMER ROW (shared utility for CRM search navigation) ==========
function _tkkhScrollToRow(customerId) {
    const row = document.querySelector(`tr[data-customer-id="${customerId}"]`);
    if (!row) {
        if (typeof showToast === 'function') showToast('🔍 Không tìm thấy khách hàng trên trang hiện tại', 'info');
        return;
    }
    // Inject highlight animation CSS (once)
    if (!document.getElementById('_tkkhHighlightCSS')) {
        const style = document.createElement('style');
        style.id = '_tkkhHighlightCSS';
        style.textContent = `
            @keyframes _tkkhBlink {
                0%, 100% { background: transparent; }
                50% { background: linear-gradient(90deg, rgba(250,210,76,0.35), rgba(245,158,11,0.20), rgba(250,210,76,0.35)); }
            }
            @keyframes _tkkhNameBlink {
                0%, 100% { background: rgba(245,158,11,0.15); box-shadow: 0 0 0 2px transparent; transform: scale(1); }
                50% { background: rgba(245,158,11,0.5); box-shadow: 0 0 12px 3px rgba(245,158,11,0.4); transform: scale(1.08); }
            }
            tr._tkkh-highlight {
                animation: _tkkhBlink 0.8s ease-in-out 6;
                outline: 2px solid #f59e0b;
                outline-offset: -1px;
                border-radius: 4px;
            }
            ._tkkh-name-highlight {
                animation: _tkkhNameBlink 0.6s ease-in-out 10 !important;
                border-radius: 20px !important;
                z-index: 10;
                position: relative;
            }
        `;
        document.head.appendChild(style);
    }
    // Scroll into center of viewport
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Apply highlight class to row
    row.classList.add('_tkkh-highlight');
    // Find and highlight the customer NAME span inside the row (clickable span with onclick containing OpenCustomerDetail or openCustomerDetail)
    const nameSpan = row.querySelector('span[onclick*="OpenCustomerDetail"], span[onclick*="openCustomerDetail"]');
    if (nameSpan) {
        nameSpan.classList.add('_tkkh-name-highlight');
        // Remove name highlight after animation (10 cycles × 0.6s = 6s)
        setTimeout(() => nameSpan.classList.remove('_tkkh-name-highlight'), 6500);
    }
    // Remove row highlight after animation (6 cycles × 0.8s = 4.8s)
    setTimeout(() => {
        row.classList.remove('_tkkh-highlight');
    }, 5000);
}

// ========== ACCESS BLOCK SCREEN — Trang chặn full-screen ==========
async function _showAccessBlockScreen() {
    // Lấy chi tiết chặn
    let blockData = { blocked: true, penalties: [], unlockers: [] };
    try {
        blockData = await apiCall('/api/access-block/status');
    } catch(e) {}

    const penalties = blockData.penalties || [];
    const total = penalties.reduce((s, p) => s + (p.penalty_amount || 0), 0);
    const unlockers = blockData.unlockers || [];
    const blockedAt = blockData.blocked_at ? new Date(blockData.blocked_at).toLocaleString('vi-VN') : '---';

    const penaltyListHtml = penalties.map((p, i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.08);${i % 2 ? 'background:rgba(255,255,255,0.03);' : ''}">
            <div style="flex:0 0 28px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.5);text-align:center;">${i + 1}</div>
            <div style="flex:1;">
                <div style="font-size:13px;font-weight:700;color:white;">${p.task_name || 'Vi phạm'}</div>
                <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px;">${p.task_date ? '📅 ' + p.task_date.split('-').reverse().join('/') : ''}${p.penalty_reason ? ' — ' + p.penalty_reason : ''}</div>
            </div>
            <div style="font-size:14px;font-weight:800;color:#fbbf24;">${(p.penalty_amount || 0).toLocaleString()}đ</div>
        </div>
    `).join('');

    const unlockersHtml = unlockers.length > 0
        ? unlockers.map(u => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 14px;background:rgba(255,255,255,0.08);border-radius:10px;margin-bottom:6px;">
                <span style="font-size:20px;">👤</span>
                <div>
                    <div style="font-size:13px;font-weight:700;color:white;">${u.full_name}</div>
                    <div style="font-size:12px;color:#93c5fd;">${u.phone ? '📞 ' + u.phone : 'Liên hệ qua hệ thống'}</div>
                </div>
            </div>
        `).join('')
        : '<div style="font-size:12px;color:rgba(255,255,255,0.5);text-align:center;padding:10px;">Liên hệ Giám Đốc để được mở khóa</div>';

    // Thay thế TOÀN BỘ body
    document.body.innerHTML = `
    <style>
        @keyframes abPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4); } 50% { box-shadow: 0 0 0 20px rgba(220,38,38,0); } }
        @keyframes abFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes abSlideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        .ab-status-dot { width:8px;height:8px;border-radius:50%;background:#ef4444;animation:abPulse 2s infinite;display:inline-block;margin-right:6px; }
    </style>
    <div style="position:fixed;inset:0;background:linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%);z-index:999999;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:20px;">
        <div style="max-width:520px;width:100%;animation:abSlideUp 0.5s ease;">
            <!-- Logo + Header -->
            <div style="text-align:center;margin-bottom:24px;">
                <div style="width:90px;height:90px;background:linear-gradient(135deg,#dc2626,#991b1b);border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center;animation:abFloat 3s ease infinite;box-shadow:0 8px 30px rgba(220,38,38,0.4);">
                    <span style="font-size:42px;">🚫</span>
                </div>
                <h1 style="font-size:22px;font-weight:900;color:white;margin:16px 0 6px;letter-spacing:1px;">TÀI KHOẢN BỊ TẠM CHẶN</h1>
                <h2 style="font-size:15px;font-weight:700;color:#fbbf24;margin:0 0 8px;letter-spacing:0.5px;">DO KHÔNG BÁO CÁO CÔNG VIỆC</h2>
                <p style="font-size:13px;color:#94a3b8;margin:0;">Bạn chưa hoàn thành báo cáo công việc được giao. Vui lòng liên hệ Quản Lý để được mở khóa.</p>
                <div style="font-size:11px;color:#64748b;margin-top:6px;">⏰ Bị chặn lúc: ${blockedAt}</div>
            </div>

            <!-- Penalty Card -->
            <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;margin-bottom:16px;backdrop-filter:blur(10px);">
                <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:14px 18px;display:flex;align-items:center;justify-content:space-between;">
                    <span style="color:white;font-weight:800;font-size:14px;">📋 Chi tiết vi phạm (${penalties.length})</span>
                    <span style="background:rgba(0,0,0,0.3);color:#fbbf24;padding:4px 14px;border-radius:8px;font-size:15px;font-weight:900;">${total.toLocaleString()}đ</span>
                </div>
                <div style="max-height:250px;overflow-y:auto;">
                    ${penaltyListHtml || '<div style="padding:20px;text-align:center;color:rgba(255,255,255,0.4);">Không có chi tiết</div>'}
                </div>
            </div>

            <!-- Unlocker Info -->
            <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;margin-bottom:16px;backdrop-filter:blur(10px);">
                <div style="padding:12px 18px;border-bottom:1px solid rgba(255,255,255,0.08);">
                    <span style="color:#93c5fd;font-weight:700;font-size:13px;">🔑 Quản Lý phụ trách mở khóa</span>
                </div>
                <div style="padding:12px 16px;">
                    ${unlockersHtml}
                </div>
            </div>

            <!-- Status -->
            <div id="abStatusBox" style="background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:12px;padding:14px 18px;text-align:center;margin-bottom:16px;">
                <div style="display:flex;align-items:center;justify-content:center;gap:6px;">
                    <span class="ab-status-dot"></span>
                    <span style="font-size:13px;color:#fbbf24;font-weight:700;">Đang chờ mở khóa...</span>
                </div>
                <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Trang sẽ tự động mở khi được duyệt</div>
            </div>

            <!-- Buttons -->
            <div style="display:flex;gap:10px;justify-content:center;">
                <button onclick="_abCheckUnblock()" style="padding:12px 28px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;border:none;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 4px 15px rgba(37,99,235,0.4);transition:all 0.2s;"
                    onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                    🔃 Kiểm tra lại
                </button>
                <button onclick="fetch('/api/auth/logout',{method:'POST'}).then(()=>window.location.href='/')" style="padding:12px 24px;background:rgba(255,255,255,0.1);color:#94a3b8;border:1px solid rgba(255,255,255,0.2);border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;">
                    🚪 Đăng xuất
                </button>
            </div>

            <!-- Footer -->
            <div style="text-align:center;margin-top:24px;">
                <div style="font-size:11px;color:#475569;">ĐỒNG PHỤC HV — Hệ thống quản lý nhân sự</div>
            </div>
        </div>
    </div>`;

    // Auto-poll mỗi 30s để tự mở khi được duyệt (clear cũ tránh duplicate)
    if (window._abPollInterval) clearInterval(window._abPollInterval);
    window._abPollInterval = setInterval(_abCheckUnblock, 30000);
}

async function _abCheckUnblock() {
    try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.user && !data.user.access_blocked) {
            window.location.reload();
        }
    } catch(e) {}
}
