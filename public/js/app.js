// Force HTTPS context (required for camera/QR scanner API on mobile)
if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('192.168.')) {
    window.location.href = window.location.href.replace('http:', 'https:');
}

// ========== MOBILE DEVICE REDIRECT ==========
if (window.innerWidth < 768 && localStorage.getItem('preferDesktop') !== 'true') {
    if (!window.location.pathname.startsWith('/m')) {
        if (window.location.hostname.indexOf('dongphuchv.net') === -1) {
            window.location.href = '/m';
        }
    }
}

// ========== GLOBAL STATE ==========
let currentUser = null;
let currentPage = 'dashboard';
let userPermissions = {};
let _configCache = {}; // Cache for app-config values

// ========== VIETNAM TIMEZONE HELPERS ==========
// Dùng ở mọi nơi trong frontend:
//   vnNow()           → Date object giờ VN
//   vnFormat(date)     → "00:35 12/05/2026"
//   vnISOStr(date)     → "2026-05-12T00:35"
//   vnDateStr(date)    → "2026-05-12"
var _VN_TZ = 'Asia/Ho_Chi_Minh';
function vnNow() { return new Date(new Date().toLocaleString('en-US', { timeZone: _VN_TZ })); }
function vnFormat(d) { if (!d) return '—'; return new Date(d).toLocaleString('vi-VN', { timeZone: _VN_TZ, day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
function vnISOStr(d) { var vn = new Date((d ? new Date(d) : new Date()).toLocaleString('en-US',{timeZone:_VN_TZ})); return vn.getFullYear()+'-'+String(vn.getMonth()+1).padStart(2,'0')+'-'+String(vn.getDate()).padStart(2,'0')+'T'+String(vn.getHours()).padStart(2,'0')+':'+String(vn.getMinutes()).padStart(2,'0'); }
function vnDateStr(d) { return vnISOStr(d).slice(0,10); }

function parseVNDate(str) {
    if (!str) return null;
    if (str instanceof Date) return str;
    let s = String(str).trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        s += 'T00:00:00+07:00';
    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) {
        s += '+07:00';
    }
    return new Date(s);
}

function formatVNDate(dateVal, formatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }) {
    const d = parseVNDate(dateVal);
    if (!d || isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        ...formatOptions
    }).format(d);
}

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
    hoan_thanh: { text: 'Hoàn Thành', class: 'status-done' },
    cho_duyet_huy_don: { text: '⏳ Chờ Duyệt Hủy Đơn', class: 'status-pending' },
    da_huy_don_tra_coc: { text: '🚫 Đã Hủy Đơn', class: 'status-cancelled' }
};

const CRM_LABELS = {
    nhu_cau: 'Chăm Sóc KH Nhu Cầu',
    ctv_hoa_hong: 'Chăm Sóc Affiliate',
    ctv: 'Chăm Sóc CTV',
    koc_tiktok: 'Chăm Sóc KOL/KOC Tiktok',
    sale: 'Chăm Sóc Khách Sale'
};

const MENU_CONFIG = [
    { id: 'quytrinhcuochop', label: 'Quy Trình Cuộc Họp', icon: '🏛️', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'TỔNG QUAN', href: '/quytrinhcuochop', permKey: 'quy_trinh_cuoc_hop' },
    { id: 'dashboard', label: 'Các Chỉ Số Tổng Quan', icon: '📊', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'TỔNG QUAN', permKey: 'tong_quan' },
    { id: 'muc-tieu-nam', label: 'Mục Tiêu Năm', icon: '🎯', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'TỔNG QUAN', href: '/muctieunam', mobileHref: '/m/muctieunam', permKey: 'muc_tieu_nam' },
    { id: 'topkhachhang', label: 'Top Khách & Sale KD', icon: '👑', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'TỔNG QUAN', href: '/topkhachhang', permKey: 'top_khach_hang' },
    { id: 'kpikdoanh', label: 'KPI P.Kinh Doanh', icon: '🎯', roles: ['giam_doc'], section: 'TỔNG QUAN', href: '/kpikdoanh', dynamicRoles: 'dashboard_kdoanh_allowed_roles', permKey: 'kpi_kdoanh' },
    { id: 'kpitilechamdon', label: 'KPI Tỉ Lệ Chậm Đơn', icon: '⏱️', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'TỔNG QUAN', href: '/kpitilechamdon', dynamicRoles: 'dashboard_kdoanh_allowed_roles', permKey: 'kpi_tile_cham_don' },
    { id: 'kpisanxuathv', label: 'KPI Sản Xuất', icon: '🏭', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'TỔNG QUAN', href: '/kpisanxuathv', permKey: 'kpi_san_xuat' },
    { id: 'kpisale', label: 'KPI P.Sale', icon: '🎯', roles: ['giam_doc'], section: 'TỔNG QUAN', href: '/kpisale', dynamicRoles: 'dashboard_kdoanh_allowed_roles', permKey: 'kpi_sale' },
    { id: 'kpimarketing', label: 'KPI Marketing Ads', icon: '🎯', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'TỔNG QUAN', href: '/kpimarketing', dynamicRoles: 'dashboard_kdoanh_allowed_roles', permKey: 'kpi_marketing' },
    { id: 'kpimktview', label: 'KPI Marketing View', icon: '🎯', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'TỔNG QUAN', href: '/kpimktview', dynamicRoles: 'dashboard_kdoanh_allowed_roles', permKey: 'kpi_marketing_view' },
    { id: 'ngansachmkt', label: 'Ngân Sách Marketing', icon: '💰', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'TỔNG QUAN', href: '/ngansachmkt', mobileHref: '/m/ngansachmkt', permKey: 'ngan_sach_mkt' },
    { id: 'camketcuochop', label: 'Cam Kết Cuộc Họp', icon: '📝', roles: ['giam_doc'], section: 'TỔNG QUAN', href: '/camketcuochop', dynamicRoles: 'dashboard_kdoanh_allowed_roles', permKey: 'cam_ket_cuoc_hop' },
    { id: 'bangcongviec', label: 'Bảng Công Việc', icon: '📋', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'TỔNG QUAN', href: '/bangcongviec', mobileHref: '/m/bangcongviec', permKey: 'bang_cong_viec' },
    { id: 'timkiemkhachhang', label: 'Tìm Kiếm Khách Hàng', icon: '🔍', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'TỔNG QUAN', href: '/timkiemkhachhanghv', permKey: 'tim_kiem_kh' },
    { id: 'dashboard-kdoanh', label: 'Dashboard P.Kinh Doanh', icon: '📈', roles: ['giam_doc'], section: 'TỔNG QUAN', href: '/dashboardkdoanh', dynamicRoles: 'dashboard_kdoanh_allowed_roles', permKey: 'dashboard_kdoanh' },
    { id: 'tong-doanh-so-sale', label: 'Tổng Doanh Số Sale KD', icon: '📊', roles: ['giam_doc'], section: 'TỔNG QUAN', href: '/tongdoansosale', permKey: 'tong_doanh_so_sale' },

    // ========== BỘ PHẬN MARKETING ==========
    { id: 'khoads', label: 'Kho Video/Ảnh Ads', icon: '🎬', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'Marketing Ads', href: '/khoads', permKey: 'kho_ads' },
    { id: 'caidattkads', label: 'Cài Đặt Tài Khoản Ads', icon: '⚙️', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'Marketing Ads', href: '/caidattaikhoanads', mobileHref: '/m/caidattaikhoanads', permKey: 'cai_dat_ads' },
    { id: 'chiendichads', label: 'Chiến Dịch Test Ads', icon: '🚀', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'Marketing Ads', href: '/chiendichads', permKey: 'chien_dich_ads' },
    { id: 'thongkeads', label: 'Thống Kê Camp Hiệu Quả', icon: '📊', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'Marketing Ads', href: '/thongkeads', mobileHref: '/m/thongkeads', permKey: 'thong_ke_ads' },

    // ========== FACEBOOK ADS ==========
    { id: 'gioihanchitieu', label: '1. Giới Hạn Chi Tiêu', icon: '💰', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'Facebook Ads', href: '/gioihanchitieu', mobileHref: '/m/gioihanchitieu', permKey: 'gioi_han_chi_tieu' },
    { id: 'tatbatfbads', label: '2. Tắt / Bật FB Ads', icon: '🔌', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'Facebook Ads', href: '/tatbatfbads', mobileHref: '/m/tatbatfbads', permKey: 'tat_bat_fb_ads' },
    { id: 'hengiobatcamp', label: '3. Hẹn Giờ Bật Camp', icon: '⏰', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'Facebook Ads', href: '/hengiobatcamp', mobileHref: '/m/hengiobatcamp', permKey: 'hen_gio_bat_camp' },


    // ========== BỘ PHẬN SALE ==========
    { id: 'xu-ly-don-loi', label: 'Đào Tạo Sale/KD & Xử Lý Lỗi', icon: '🔧', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'CÔNG VIỆC NV SALE', href: '/daotaosalekd', permKey: 'xu_ly_don_loi' },
    { id: 'chamsockhsale', label: 'Chăm Sóc Khách Sale', icon: '🤝', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'CÔNG VIỆC NV SALE', href: '/chamsockhsale', permKey: 'chamsockhsale' },
    { id: 'chamsockhtempet', label: 'Chăm Sóc Khách TEM/PET', icon: '🏷️', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'CÔNG VIỆC NV SALE', href: '/chamsockhtempet', permKey: 'chamsockhtempet' },
    { id: 'sokhachsale', label: 'Sổ Khách Sale', icon: '📖', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'CÔNG VIỆC NV SALE', href: '/sokhachsale', permKey: 'sokhachsale' },
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
    { id: 'chap-nhan-ctv-affiliate', label: 'Chấp Nhận CTV / Affiliate', icon: '✅', roles: ['giam_doc','quan_ly_cap_cao','quan_ly'], section: 'KINH DOANH CHĂM SÓC', href: '/chapnhanctvaffliate', permKey: 'chap_nhan_ctv_aff' },
    { id: 'tai-khoan-affiliate', label: 'Tài Khoản Affiliate', icon: '🔑', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'QUẢN LÝ AFFILIATE', permKey: 'tk_affiliate' },
    { id: 'quanlytkhethongaff', label: 'QL Hệ Thống Affiliate', icon: '📊', roles: ['giam_doc','quan_ly','quan_ly_cap_cao','truong_phong','nhan_vien','thu_viec','part_time'], section: 'QUẢN LÝ AFFILIATE', href: '/quanlytkhethongaff', permKey: 'ql_he_thong_aff' },
    { id: 'quan-ly-affiliate', label: 'Chỉ Số Affiliate HV', icon: '🤝', roles: ['giam_doc','quan_ly','quan_ly_cap_cao','truong_phong','nhan_vien','thu_viec','part_time'], section: 'QUẢN LÝ AFFILIATE', permKey: 'chi_so_affiliate' },
    { id: 'bang-xep-hang-affiliate', label: 'Bảng Xếp Hạng Affiliate', icon: '🏆', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'BXH & GIẢI THƯỞNG', href: '/bangxephangaffiliate', dynamicRoles: 'leaderboard_allowed_roles', permKey: 'bxh_affiliate' },
    { id: 'bang-xep-hang-kinh-doanh', label: 'Bảng Xếp Hạng Kinh Doanh', icon: '📊', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'BXH & GIẢI THƯỞNG', href: '/bangxephangkinhdoanh', dynamicRoles: 'bxh_kinhdoanh_allowed_roles', permKey: 'bxh_kinh_doanh' },
    { id: 'bang-xep-hang-sale', label: 'Bảng Xếp Hạng Sale', icon: '💼', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'BXH & GIẢI THƯỞNG', href: '/bangxephangsale', dynamicRoles: 'bxh_sale_allowed_roles', permKey: 'bxh_sale' },
    { id: 'bang-xep-hang-ctv', label: 'Bảng Xếp Hạng CTV', icon: '🤝', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'BXH & GIẢI THƯỞNG', href: '/bangxephangctv', dynamicRoles: 'bxh_ctv_allowed_roles', permKey: 'bxh_ctv' },
    { id: 'bxh-san-xuat', label: 'BXH Khối Sản Xuất', icon: '🏭', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'BXH & GIẢI THƯỞNG', href: '/bxhsanxuat', dynamicRoles: 'bxh_sanxuat_allowed_roles', permKey: 'bxh_san_xuat' },
    // { id: 'bxh-van-phong', label: 'BXH Khối Văn Phòng', icon: '🏢', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'BXH & GIẢI THƯỞNG', href: '/bxhvanphong', dynamicRoles: 'bxh_vanphong_allowed_roles', permKey: 'bxh_van_phong' },
    { id: 'giai-thuong-game', label: 'Setup Giải Thưởng Game', icon: '🎮', roles: ['giam_doc'], section: 'BXH & GIẢI THƯỞNG', href: '/giaithuonggame' },
    { id: 'trao-giai-thuong', label: 'Trao Giải Thưởng', icon: '🏆', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'BXH & GIẢI THƯỞNG', href: '/traogiaithuong', permKey: 'trao_giai_thuong' },
    // { id: 'withdraw-manage', label: 'Duyệt Rút Tiền', icon: '🏦', roles: ['giam_doc','quan_ly_cap_cao'], section: 'QUẢN LÝ AFFILIATE', permKey: 'duyet_rut_tien' },
    { id: 'cap-cuu-sep', label: 'Cấp Cứu Sếp', icon: '🚨', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'HỖ TRỢ NHÂN VIÊN HV', permKey: 'cap_cuu_sep' },
    { id: 'huy-khach', label: 'Hủy Khách Hàng', icon: '❌', roles: ['giam_doc','quan_ly','quan_ly_cap_cao'], section: 'HỖ TRỢ NHÂN VIÊN HV', permKey: 'huy_khach' },
    { id: 'chuyen-so', label: 'Chuyển Số NV Kinh Doanh', icon: '📱', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time','hoa_hong','tkaffiliate'], section: 'HỖ TRỢ NHÂN VIÊN HV', permKey: 'chuyen_so' },
    { id: 'chuyensosale', label: 'Chuyển Số Sale', icon: '📱', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time','hoa_hong','tkaffiliate'], section: 'HỖ TRỢ NHÂN VIÊN HV', href: '/chuyensosale', permKey: 'chuyen_so_sale' },
    { id: 'caidatpancake', label: 'Cài Đặt Pancake', icon: '⚙️', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time','hoa_hong','tkaffiliate'], section: 'HỖ TRỢ NHÂN VIÊN HV', href: '/caidatpancake', permKey: 'cai_dat_pancake' },
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
    { id: 'caidatsanxuat', label: 'Cài Đặt Sản Xuất', icon: '🏭', roles: ['giam_doc'], section: 'HỆ THỐNG', href: '/caidatsanxuat', permKey: 'cai_dat_san_xuat' },
    { id: 'my-customers', label: 'Khách Hàng Của Tôi', icon: '👤', roles: ['hoa_hong'], section: 'HOA HỒNG' },
    { id: 'withdraw', label: 'Rút Tiền', icon: '💰', roles: ['hoa_hong'], section: 'HOA HỒNG' },
    { id: 'tu-van-khach-aff', label: 'Theo Dõi Tư Vấn Khách', icon: '📋', roles: ['tkaffiliate'], section: 'AFFILIATE' },
    { id: 'theo-doi-tu-van-aff', label: 'Theo Dõi Tư Vấn Affiliate', icon: '🤝', roles: ['tkaffiliate'], section: 'AFFILIATE' },
    { id: 'huong-dan-su-dung', label: 'Lời Chào Mừng & Hướng Dẫn', icon: '📖', roles: ['tkaffiliate'], section: 'BÁO CÁO', href: '/huong-dan-su-dung', strictRoles: true },
    { id: 'bao-cao-hoa-hong-hv', label: 'Báo Cáo Hoa Hồng HV', icon: '📊', roles: ['tkaffiliate'], section: 'BÁO CÁO', href: '/bao-cao-hoa-hong-hv', strictRoles: true },
    { id: 'rut-tien-affiliate', label: 'Rút Tiền', icon: '🏦', roles: ['tkaffiliate'], section: 'AFFILIATE' },

    // ========== NỘI QUY & QUY TẮC LÀM VIỆC ==========
    { id: 'noi-quy-cong-ty', label: 'Nội Quy & Điều Khoản', icon: '📜', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'NỘI QUY & TƯ LIỆU NỘI BỘ', href: '/noiquycongtyhv', permKey: 'noi_quy_cong_ty' },
    { id: 'tu-lieu-xuong-vp', label: 'Tư Liệu Xưởng & VP', icon: '📂', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'NỘI QUY & TƯ LIỆU NỘI BỘ', href: '/tulieuxuongvp', permKey: 'tu_lieu_xuong_vp' },
    { id: 'bo-suu-tap', label: 'Bộ Sưu Tập / BST', icon: '🖼️', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'NỘI QUY & TƯ LIỆU NỘI BỘ', href: '/bosuutap', permKey: 'bo_suu_tap' },
    { id: 'chinh-sach-kh', label: 'Chính Sách Khách Hàng', icon: '📋', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'QUY TẮC & CHÍNH SÁCH KH', href: '/chinhsachkhhv', permKey: 'chinh_sach_kh' },
    { id: 'chuong-trinh-kh', label: 'Chương Trình & Quà Tặng KH', icon: '🎁', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'QUY TẮC & CHÍNH SÁCH KH', href: '/chuongtrinhkhhv', permKey: 'chuong_trinh_kh' },
    { id: 'khuyenmaigiamgia', label: 'Tạo Mã Giảm Giá', icon: '🏷️', roles: ['giam_doc','quan_ly_cap_cao'], section: 'QUY TẮC & CHÍNH SÁCH KH', href: '/khuyenmaigiamgia', permKey: 'khuyen_mai_giam_gia' },
    { id: 'hop-dong-khach-hang', label: 'Hợp Đồng KH & Chứng Từ', icon: '📑', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'QUY TẮC & CHÍNH SÁCH KH', href: '/hopdongkhachhang', permKey: 'hop_dong_khach_hang' },

    // ========== HÀNH CHÍNH & NHÂN SỰ ==========
    { id: 'quan-tri-nhan-su', label: 'Quản Trị Nhân Sự', icon: '👔', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'QUẢN TRỊ NHÂN SỰ', href: '/quantrinhansuhv', permKey: 'quan_tri_nhan_su' },
    { id: 'hop-dong-tuyen-dung', label: 'Hợp Đồng & Tuyển Dụng NV', icon: '📝', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'QUẢN TRỊ NHÂN SỰ', href: '/hopdongtuyendung', permKey: 'hop_dong_tuyen_dung' },


    // ========== BỘ PHẬN VĂN PHÒNG ==========
    { id: 'don-hang-tong', label: 'Đơn Hàng Tổng', icon: '📦', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'VĂN PHÒNG QUẢN LÝ', href: '/donhangtong', permKey: 'don_hang_tong' },
    { id: 'taophieudonhang', label: 'Tạo Phiếu Đơn Hàng', icon: '📝', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'VĂN PHÒNG QUẢN LÝ', href: '/taophieudonhang', permKey: 'taophieudonhang' },
    { id: 'xuatvathv', label: 'Xuất Hóa Đơn VAT', icon: '🧾', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'VĂN PHÒNG QUẢN LÝ', href: '/xuatvathv', permKey: 'don_hang_tong' },
    // { id: 'lich-ra-don-hang', label: 'Lịch Ra Đơn Hàng', icon: '📅', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'VĂN PHÒNG QUẢN LÝ', permKey: 'lich_ra_don_hang' },
    // [Moved to Cài Đặt Sản Xuất tab] { id: 'cai-dat-sp-qt', label: 'Cài Đặt SP & QT', icon: '⚙️', roles: ['giam_doc'], section: 'VĂN PHÒNG QUẢN LÝ', permKey: 'cai_dat_sp_qt' },
    { id: 'don-gui-ao-mau', label: 'Đơn Gửi Áo Mẫu', icon: '👕', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'VĂN PHÒNG QUẢN LÝ', href: '/donguiaomau', permKey: 'don_gui_ao_mau' },
    { id: 'so-ghi-nhan-tien', label: 'Sổ Ghi Nhận Tiền', icon: '💵', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'VĂN PHÒNG QUẢN LÝ', href: '/soghinhantien', permKey: 'so_ghi_nhan_tien' },
    { id: 'so-thu-chi', label: 'Sổ Thu Chi', icon: '📒', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'VĂN PHÒNG QUẢN LÝ', href: '/sothuchi', permKey: 'so_thu_chi' },
    { id: 'so-co-phan-may', label: 'Sổ Cổ Phần May', icon: '🧵', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'VĂN PHÒNG QUẢN LÝ', href: '/socophanmay', permKey: 'so_co_phan_may' },
    { id: 'ke-toan-gui-hang', label: 'Đơn Hàng Kế Toán Gửi', icon: '📋', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'VĂN PHÒNG QUẢN LÝ', href: '/ketoanguihang', permKey: 'ke_toan_gui_hang' },
    { id: 'don-hang-chua-thu-tien', label: 'Đơn Hàng Chưa Thu Tiền', icon: '💰', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'VĂN PHÒNG QUẢN LÝ', href: '/donhangchuathutien', permKey: 'don_hang_chua_thu_tien' },
    { id: 'tao-phieu-xu-ly-cv', label: 'Tạo Phiếu Xử Lý CV', icon: '📋', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'VĂN PHÒNG QUẢN LÝ', href: '/taophieuxulycv', permKey: 'tao_phieu_xu_ly_cv' },
    { id: 'don-loi-khach-hang', label: 'Đơn Lỗi Khách & Nội Bộ', icon: '⚠️', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'VĂN PHÒNG QUẢN LÝ', href: '/donloikhachhang', permKey: 'don_loi_khach_hang' },
    { id: 'loi-thuong-gap', label: 'Lỗi Thường Gặp \u0026 Xử Lý', icon: '📋', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'VĂN PHÒNG QUẢN LÝ', href: '/loithuonggap', permKey: 'don_loi_noi_bo' },

    // ========== BỘ PHẬN THIẾT KẾ ==========
    { id: 'don-hang-thiet-ke', label: 'Đơn Hàng Thiết Kế', icon: '🎨', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'BỘ PHẬN THIẾT KẾ', href: '/donhangthietke', permKey: 'don_hang_thiet_ke' },
    { id: 'cham-mau-thiet-ke', label: 'Maket & Chấm Màu Thiết Kế', icon: '🎨', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'BỘ PHẬN THIẾT KẾ', href: '/chammauthietke', permKey: 'cham_mau_thiet_ke' },

    // ========== BỘ PHẬN XƯỞNG SX ==========
    { id: 'bao-gia-goc', label: 'Báo Giá Gốc', icon: '🧮', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'XƯỞNG SẢN XUẤT', href: '/baogiagoc', permKey: 'gia_nhap_goc' },
    { id: 'bao-gia-ctv-hh', label: 'Báo Giá Khách / CTV', icon: '🤝', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'XƯỞNG SẢN XUẤT', href: '/baogiactvhh', permKey: 'gia_nhap_goc' },
    { id: 'gia-nhap-goc', label: 'Giá Nhập Gốc', icon: '🏷️', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'XƯỞNG SẢN XUẤT', href: '/gianhapgoc', permKey: 'gia_nhap_goc' },
    { id: 'ti-le-cat-goc', label: 'Tỉ Lệ Cắt Gốc', icon: '📏', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'XƯỞNG SẢN XUẤT', href: '/tilecatgoc', permKey: 'ti_le_cat_goc' },
    { id: 'luong-san-xuat', label: 'Lương Sản Xuất', icon: '💰', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'XƯỞNG SẢN XUẤT', href: '/luongsanxuat', permKey: 'luong_san_xuat' },
    { id: 'bang-mau-vai', label: 'Bảng Màu Vải', icon: '🎨', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'XƯỞNG SẢN XUẤT', href: '/bangmauvai', permKey: 'bang_mau_vai' },
    { id: 'kinh-doanh-gui-hang', label: 'Đơn Hàng Kinh Doanh Gửi', icon: '📦', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'XƯỞNG SẢN XUẤT', href: '/kinhdoanhguihang', permKey: 'kinh_doanh_gui_hang' },
    { id: 'bo-phan-cat', label: 'Bộ Phận Cắt', icon: '✂️', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'XƯỞNG SẢN XUẤT', href: '/bophancathv', permKey: 'bo_phan_cat' },
    { id: 'bo-phan-in', label: 'Bộ Phận In', icon: '🖨️', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'XƯỞNG SẢN XUẤT', href: '/bophaninhv', permKey: 'bo_phan_in' },
    { id: 'vat-lieu-tem-pet', label: 'Vật Liệu PET/TEM', icon: '🏷️', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'XƯỞNG SẢN XUẤT', href: '/vatlieutempet', permKey: 'vat_lieu_tem_pet' },
    { id: 'bo-phan-ep', label: 'Bộ Phận Ép', icon: '🔥', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'XƯỞNG SẢN XUẤT', href: '/bophanephv', permKey: 'bo_phan_ep' },
    { id: 'bo-phan-may', label: 'Bộ Phận May', icon: '🧵', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'XƯỞNG SẢN XUẤT', href: '/bophanmayhv', permKey: 'bo_phan_may' },
    { id: 'kiem-tra-chat-luong', label: 'Kiểm Tra Chất Lượng', icon: '🔍', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'XƯỞNG SẢN XUẤT', href: '/kiemtrachatluong', permKey: 'kiem_tra_chat_luong' },
    { id: 'bo-phan-hoan-thien', label: 'Cắt Chỉ & Hoàn Thiện', icon: '✅', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'XƯỞNG SẢN XUẤT', href: '/bophanhoanthienhv', permKey: 'bo_phan_hoan_thien' },
    // [Moved to Cài Đặt Sản Xuất tab] { id: 'bang-gia-may', label: 'Bảng Giá May', icon: '💲', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'MẪU & GIÁ SẢN XUẤT', href: '/banggiamay', permKey: 'bang_gia_may' },
    { id: 'bill-nhap-hang', label: 'Bill Nhập Vải', icon: '🧾', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'XƯỞNG SẢN XUẤT', href: '/billnhaphang', permKey: 'bill_nhap_hang' },
    { id: 'nhap-xuat-hoan-vai', label: 'Nhập Xuất Hoàn Vải', icon: '🔄', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'XƯỞNG SẢN XUẤT', href: '/nhapxuathoanvai', permKey: 'nhap_xuat_hoan_vai' },
    { id: 'bill-vat-lieu', label: 'Bill Nhập Vật Liệu', icon: '🧾', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'XƯỞNG SẢN XUẤT', href: '/billvatlieu', permKey: 'bill_vat_lieu' },
    { id: 'nhap-xuat-hoan-vat-lieu', label: 'Nhập Xuất Hoàn Vật Liệu', icon: '🔃', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'XƯỞNG SẢN XUẤT', href: '/nhapxuathoanvatlieu', permKey: 'nhap_xuat_hoan_vat_lieu' },
    { id: 'kiem-kho', label: 'Kiểm Kho Vải', icon: '📝', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'XƯỞNG SẢN XUẤT', href: '/kiemkhohv', permKey: 'kiem_kho' },
    { id: 'kho-vai', label: 'Kho Vải', icon: '🏬', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'XƯỞNG SẢN XUẤT', href: '/khovai', permKey: 'kho_vai' },
    { id: 'quanlykhovai', label: 'Quản Lý Nhập Kho Vải', icon: '🗺️', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'XƯỞNG SẢN XUẤT', href: '/quanlykhovai', permKey: 'quan_ly_nhap_kho_vai' },
    { id: 'xuatvaicat', label: 'Xuất Vải Để Cắt', icon: '✂️', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'XƯỞNG SẢN XUẤT', href: '/xuatvaicat', permKey: 'xuat_vai_cat' },
    // [Moved to Cài Đặt Sản Xuất tab] { id: 'caidat-kho-vai', label: 'Cài Đặt Kho Vải', icon: '⚙️', roles: ['giam_doc','quan_ly_cap_cao'], section: 'XƯỞNG SẢN XUẤT', href: '/caidatkhovai', permKey: 'kho_vai' },
    { id: 'kho-vat-lieu', label: 'Kho Vật Liệu', icon: '📦', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'XƯỞNG SẢN XUẤT', href: '/khovatlieu', permKey: 'kho_vat_lieu' },
    { id: 'thong-so-ao-mau', label: 'Thông Số Mẫu Áo', icon: '📐', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'XƯỞNG SẢN XUẤT', href: '/thongsoaomau', permKey: 'thong_so_ao_mau' },

    // ========== QUẢN LÝ XƯỞNG ==========
    { id: 'lich-ra-don-hang', label: 'Lịch Ra Đơn Hàng', icon: '📅', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'QUẢN LÝ XƯỞNG', href: '/lichradonhang', permKey: 'lich_ra_don_hang' },
    { id: 'donhanghomnayqlx', label: 'Đơn Hàng Hôm Nay QLX', icon: '🏭', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'QUẢN LÝ XƯỞNG', href: '/donhanghomnayqlx', permKey: 'don_hang_hom_nay_qlx' },
    { id: 'tra-soat-don-hang', label: 'Tra Soát Đơn Hàng', icon: '🔍', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'QUẢN LÝ XƯỞNG', href: '/trasoatdonhang', permKey: 'tra_soat_don_hang' },
    { id: 'congviec-qlx', label: 'Công Việc QLX', icon: '📋', roles: ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','thu_viec','part_time'], section: 'QUẢN LÝ XƯỞNG', href: '/congviecqlx', permKey: 'congviec_qlx' },

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

// ========== GLOBAL AUTOCOMPLETE PROTECTION ==========
// Prevents browser from suggesting previously entered customer data (names, phones, addresses)
// Uses MutationObserver to catch dynamically rendered inputs (modals, CRM forms, etc.)
// Covers ALL input types: text, tel, email, search, number, url, and inputs without type attribute
(function() {
    var _acSkipTypes = { password: 1, hidden: 1, checkbox: 1, radio: 1, file: 1, submit: 1, reset: 1, button: 1, image: 1, range: 1, color: 1 };
    function _killAutocomplete(root) {
        // Target ALL inputs and textareas that haven't been processed yet
        var els = (root || document).querySelectorAll('input:not([data-ac-ok]), textarea:not([data-ac-ok])');
        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            // Skip non-text-entry types, disabled, readonly
            if (el.disabled || el.readOnly) continue;
            var t = (el.type || 'text').toLowerCase();
            if (_acSkipTypes[t]) continue;
            // "one-time-code" is respected by Chrome/Edge even when "off" is ignored
            el.setAttribute('autocomplete', 'one-time-code');
            el.setAttribute('data-ac-ok', '1');
        }
        // Protect all forms
        var forms = (root || document).querySelectorAll('form:not([data-ac-ok])');
        for (var f = 0; f < forms.length; f++) {
            forms[f].setAttribute('autocomplete', 'off');
            forms[f].setAttribute('data-ac-ok', '1');
        }
    }
    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { _killAutocomplete(); });
    } else {
        _killAutocomplete();
    }
    // Watch for dynamically added inputs (CRM modals, popups, etc.)
    var _acTimer = null;
    var _acObserver = new MutationObserver(function() {
        // Debounce to avoid running on every tiny DOM mutation
        if (_acTimer) clearTimeout(_acTimer);
        _acTimer = setTimeout(function() { _killAutocomplete(); }, 50);
    });
    _acObserver.observe(document.documentElement, { childList: true, subtree: true });
})();

// ==================== CENTRALIZED HEARTBEAT SERVICE ====================
const _heartbeatTasks = [];
window.registerHeartbeatTask = function(name, taskFn, intervalSecs, conditionFn) {
    if (_heartbeatTasks.some(t => t.name === name)) return;
    
    const taskObj = {
        name: name,
        task: taskFn,
        intervalSecs: intervalSecs,
        condition: conditionFn || (() => true),
        lastRun: 0
    };
    _heartbeatTasks.push(taskObj);

    // Stagger initial run slightly to avoid parallel network requests on start
    const delay = (_heartbeatTasks.length * 1000) + 1000;
    setTimeout(() => {
        if (taskObj.condition() && taskObj.lastRun === 0) {
            taskObj.lastRun = Date.now();
            try {
                taskObj.task();
            } catch (e) {
                console.error(`[Heartbeat] Staggered initial execution error in ${name}:`, e);
            }
        }
    }, delay);
};

function startHeartbeatSystem() {
    setInterval(() => {
        const now = Date.now();
        _heartbeatTasks.forEach(t => {
            if (!t.condition()) return;
            const elapsed = (now - t.lastRun) / 1000;
            if (elapsed >= t.intervalSecs) {
                t.lastRun = now;
                try {
                    t.task();
                } catch (e) {
                    console.error(`[Heartbeat] Execution error in task ${t.name}:`, e);
                }
            }
        });
    }, 5000);
}

// ==================== DYNAMIC LAZY LOADER ====================
const _PAGE_SCRIPT_MAP = {
    'chammauthietke': '/js/pages/chammauthietke.js?v=' + Date.now(),
    'cham-mau-thiet-ke': '/js/pages/chammauthietke.js?v=' + Date.now(),
    'accounts': '/js/pages/accounts.js',
    'teams': '/js/pages/teams.js',
    'permissions': '/js/pages/permissions.js?v=20260726_v381',
    'quan-ly-affiliate': '/js/pages/quanlyaffiliate.js',
    'dashboard-kdoanh': '/js/pages/dashboardkdoanh.js',
    'dashboardkdoanh': '/js/pages/dashboardkdoanh.js',
    'settings': '/js/pages/settings.js?v=20260730_v4',
    'caidatpancake': '/js/pages/caidatpancake.js?v=20260727_v382',
    'caidattkads': '/js/pages/caidattaikhoanads.js',
    'caidattaikhoanads': '/js/pages/caidattaikhoanads.js',
    'cai-dat-tai-khoan-ads': '/js/pages/caidattaikhoanads.js',
    'cai-dat-ads': '/js/pages/caidattaikhoanads.js',
    'gioihanchitieu': '/js/pages/gioihanchitieu.js',
    'gioi-han-chi-tieu': '/js/pages/gioihanchitieu.js',
    'm/gioihanchitieu': '/js/pages/gioihanchitieu.js',
    'm_gioihanchitieu': '/js/pages/gioihanchitieu.js',
    'tu-van-khach-aff': '/js/pages/baocaohoahong.js',
    'theo-doi-tu-van-aff': '/js/pages/baocaohoahong.js',
    'bao-cao-hoa-hong': '/js/pages/baocaohoahong.js',
    'baocaohoahong': '/js/pages/baocaohoahong.js',
    'crm-nhu-cau': '/js/pages/crm-nhucau.js?v=20260725_v308',
    'crm-ctv': '/js/pages/crm-ctv-full.js?v=20260725_v308',
    'chamsockhsale': '/js/pages/chamsockhsale.js?v=20260726_v355',
    'chamsockhtempet': '/js/pages/chamsockhtempet.js?v=20260726_v355',
    'quytacnuttuvancrmsale': '/js/pages/quytac-tuvan-sale.js?v=20260725_v351',
    'quytacnuttuvancrmtempet': '/js/pages/quytac-tuvan-sale.js?v=20260725_v351',
    'sokhachsale': '/js/pages/sokhachsale.js',
    'cham-soc-affiliate': '/js/pages/crm-affiliate-full.js?v=20260725_v308',
    'chamsocaffiliate': '/js/pages/crm-affiliate-full.js?v=20260725_v308',
    'cham-soc-koc-kol': '/js/pages/crm-kockol-full.js?v=20260725_dat_coc_v1',
    'chamsockockol': '/js/pages/crm-kockol-full.js?v=20260725_dat_coc_v1',
    'chap-nhan-ctv-affiliate': '/js/pages/chapnhanctvaffliate.js',
    'chapnhanctvaffliate': '/js/pages/chapnhanctvaffliate.js',
    'cap-cuu-sep': '/js/pages/emergency.js',
    'huy-khach': '/js/pages/emergency.js',
    'huy-khach-hang': '/js/pages/emergency.js',
    'huykhachhang': '/js/pages/emergency.js',
    'tai-khoan-affiliate': '/js/pages/taikhoanaffiliate.js',
    'my-customers': '/js/pages/hoahong.js',
    'withdraw': '/js/pages/hoahong.js',
    'withdraw-manage': '/js/pages/hoahong.js',
    'rut-tien-affiliate': '/js/pages/rut-tien-affiliate.js',
    'bao-cao-hoa-hong-hv': '/js/pages/baocaohoahonghv.js',
    'baocaohoahonghv': '/js/pages/baocaohoahonghv.js',
    'huong-dan-su-dung': '/js/pages/huongdansudung.js',
    'huongdansudung': '/js/pages/huongdansudung.js',
    'quanlytkhethongaff': '/js/pages/quanly-hethong-aff.js',
    'bang-xep-hang-affiliate': '/js/pages/bangxephangaffiliate.js',
    'bangxephangaffiliate': '/js/pages/bangxephangaffiliate.js',
    'bang-xep-hang-kinh-doanh': '/js/pages/bangxephangkinhdoanh.js',
    'bangxephangkinhdoanh': '/js/pages/bangxephangkinhdoanh.js',
    'bang-xep-hang-sale': '/js/pages/bangxephangsale.js',
    'bangxephangsale': '/js/pages/bangxephangsale.js',
    'bang-xep-hang-ctv': '/js/pages/bangxephangctv.js',
    'bangxephangctv': '/js/pages/bangxephangctv.js',
    'bxh-san-xuat': '/js/pages/bxhsanxuat.js',
    'bxhsanxuat': '/js/pages/bxhsanxuat.js',
    'bxh-van-phong': '/js/pages/bxhvanphong.js',
    'bxhvanphong': '/js/pages/bxhvanphong.js',
    'giai-thuong-game': '/js/pages/giaithuonggame.js',
    'giaithuonggame': '/js/pages/giaithuonggame.js',
    'trao-giai-thuong': '/js/pages/traogiaithuong.js',
    'traogiaithuong': '/js/pages/traogiaithuong.js',
    'donloinoibo': '/js/pages/donloinoibo.js',
    'loithuonggap': '/js/pages/donloinoibo.js',
    'design-draft': '/js/pages/taophieudonhang.js?v=20260805_v303_FIXED_RENDER_IMAGE_TAINT',
    'designdraft': '/js/pages/taophieudonhang.js?v=20260805_v303_FIXED_RENDER_IMAGE_TAINT',
    'bangiao-diem-kd': '/js/pages/bangiao-diem.js',
    'bangiaodiem': '/js/pages/bangiao-diem.js',
    'lich-khoa-bieu': '/js/pages/lich-khoabieu.js',
    'lichkhoabieu': '/js/pages/lich-khoabieu.js',
    'congvieckhoaxuly': '/js/pages/congvieckhoaxuly.js',
    'lich-su-bao-cao': '/js/pages/lichsu-baocao.js',
    'lichsubaocaocv': '/js/pages/lichsu-baocao.js',
    'khoa-tk-nv': '/js/pages/khoatknv.js?v=20260817_cayle_v1',
    'mo-khoa-tk-phat': '/js/pages/mokhoatkphat.js',
    'mokhoatkphat': '/js/pages/mokhoatkphat.js',
    'setup-ngay-le': '/js/pages/setupngayle.js',
    'setupngayle': '/js/pages/setupngayle.js',
    'bangiao-khoa': '/js/pages/bangiao-khoa.js',
    'bangiaokhoa': '/js/pages/bangiao-khoa.js',
    'goidien': '/js/pages/goidien.js',
    'hethonggoidien': '/js/pages/hethonggoidien.js',
    'xin-nghi-nv': '/js/pages/xinnghi.js',
    'xinnghinhanvien': '/js/pages/xinnghi.js',
    'bophanhoanthien': '/js/pages/bophanhoanthienhv.js?v=20260722_fix_syntax_map_v1',
    'bophanhoanthienhv': '/js/pages/bophanhoanthienhv.js?v=20260722_fix_syntax_map_v1',
    'bo-phan-hoan-thien': '/js/pages/bophanhoanthienhv.js?v=20260722_fix_syntax_map_v1',
    'bophaninhv': '/js/pages/bophaninhv.js?v=' + Date.now(),
    'bophanin': '/js/pages/bophaninhv.js?v=' + Date.now(),
    'bo-phan-in': '/js/pages/bophaninhv.js?v=' + Date.now(),
    'bophanephv': '/js/pages/bophanephv.js',
    'bophanep': '/js/pages/bophanephv.js',
    'bo-phan-ep': '/js/pages/bophanephv.js',
    'bophancathv': '/js/pages/bophancathv.js?v=' + Date.now(),
    'bophancat': '/js/pages/bophancathv.js?v=' + Date.now(),
    'bo-phan-cat': '/js/pages/bophancathv.js?v=' + Date.now(),
    'bophanmayhv': '/js/pages/bophanmayhv.js',
    'bophanmay': '/js/pages/bophanmayhv.js',
    'bo-phan-may': '/js/pages/bophanmayhv.js',
    'donhangthietke': '/js/pages/donhangthietke.js',
    'donguiaomau': '/js/pages/donguiaomau.js',
    'socophanmay': '/js/pages/socophanmay.js',
    'soghinhantien': '/js/pages/soghinhantien.js',
    'sothuchi': '/js/pages/sothuchi.js',
    'donloikhachhang': '/js/pages/donloikhachhang.js',
    'donloinoibo': '/js/pages/donloinoibo.js',
    'loithuonggap': '/js/pages/donloinoibo.js',
    'loi-thuong-gap': '/js/pages/donloinoibo.js',
    'kiemkho': '/js/pages/kiemkho.js',
    'kiemtrachatluong': '/js/pages/kiemtrachatluong.js?v=20260725_ktcl_v5',
    'topkhachhang': '/js/pages/topkhachhang.js?v=20260727_v100',
    'top-khach-hang': '/js/pages/topkhachhang.js?v=20260727_v100',
    'kpikdoanh': '/js/pages/kpikdoanh.js?v=20260831_v90000_REMOVE_REWARD_FIELDS',
    'kpisale': '/js/pages/kpisale.js?v=20260813_v321_FIX_CD_CONVERSION_DETAILS_MODAL',
    'kpi-sale': '/js/pages/kpisale.js?v=20260813_v321_FIX_CD_CONVERSION_DETAILS_MODAL',
    'kpimarketing': '/js/pages/kpimarketing.js?v=20260831_v100003_UPDATE_MOC2_TITLE',
    'kpi-marketing': '/js/pages/kpimarketing.js?v=20260831_v100003_UPDATE_MOC2_TITLE',
    'kpimktview': '/js/pages/kpimktview.js?v=20260804_v100',
    'kpi-mkt-view': '/js/pages/kpimktview.js?v=20260804_v100',
    'quytrinhcuochop': '/js/pages/quytrinhcuochop.js?v=' + Date.now(),
    'quy-trinh-cuoc-hop': '/js/pages/quytrinhcuochop.js?v=' + Date.now(),
    'camketcuochop': '/js/pages/camketcuochop.js?v=20260803_v1010',
    'cam-ket-cuoc-hop': '/js/pages/camketcuochop.js?v=20260803_v1010',
    'muc-tieu-nam': '/js/pages/muctieunam.js?v=20260813_v112_FIX_PCT_Q_ORD',
    'muctieunam': '/js/pages/muctieunam.js?v=20260813_v112_FIX_PCT_Q_ORD',
    'bangcongviec': '/js/pages/bangcongviec.js?v=20260822_v597_CLEAN_COLLECTION_DROPDOWN_NAME',
    'bang-cong-viec': '/js/pages/bangcongviec.js?v=20260822_v597_CLEAN_COLLECTION_DROPDOWN_NAME',
    'bang_cong_viec': '/js/pages/bangcongviec.js?v=20260822_v597_CLEAN_COLLECTION_DROPDOWN_NAME',
    'bangcongviec/hoanthanh': '/js/pages/bangcongviec.js?v=20260822_v597_CLEAN_COLLECTION_DROPDOWN_NAME',
    'bang-cong-viec/hoan-thanh': '/js/pages/bangcongviec.js?v=20260822_v597_CLEAN_COLLECTION_DROPDOWN_NAME',
    'bang_cong_viec/hoan_thanh': '/js/pages/bangcongviec.js?v=20260822_v597_CLEAN_COLLECTION_DROPDOWN_NAME',
    'khovai': '/js/pages/khovai.js?v=20260817_tz_v12',
    'quanlykhovai': '/js/pages/quanlykhovai.js',
    'khovatlieu': '/js/pages/khovatlieu.js',
    'nhapxuathoanvai': '/js/pages/nhapxuathoanvai.js',
    'tong-doanh-so-sale': '/js/pages/tongdoansosale.js?v=20260726_v356',
    'tongdoansosale': '/js/pages/tongdoansosale.js?v=20260726_v356',
    'tongdoanhsosale': '/js/pages/tongdoansosale.js?v=20260726_v356',
    'ngansachmkt': '/js/pages/ngansachmkt.js?v=20260803_v2005_NGANSACHMKT_2_DECIMALS',
    'ngan-sach-mkt': '/js/pages/ngansachmkt.js?v=20260803_v2005_NGANSACHMKT_2_DECIMALS',
    'timkiemkhachhang': '/js/pages/timkiem-khachhang.js?v=20260726_v356',
    'timkiemkhachhanghv': '/js/pages/timkiem-khachhang.js?v=20260726_v356',
    'trasoatdonhang': '/js/pages/trasoatdonhang.js?v=20260721_ts_modal_lazy_v2',
    'tulieuxuongvp': '/js/pages/tulieuxuongvp.js',
    'noiquycongtyhv': '/js/pages/noiquycongtyhv.js',
    'noi-quy-cong-ty': '/js/pages/noiquycongtyhv.js',
    'donhangchuathutien': '/js/pages/donhangchuathutien.js?v=20260721_counting_fix_v7',
    'chuyenso': '/js/pages/chuyenso.js?v=20260807_v290_RECEIVER_GROUPING',
    'chuyen-so': '/js/pages/chuyenso.js?v=20260807_v290_RECEIVER_GROUPING',
    'taophieuxulycv': '/js/pages/taophieuxulycv.js',
    'tao-phieu-xu-ly-cv': '/js/pages/taophieuxulycv.js',
    'bxh-template': '/js/pages/bxh-template.js',
    'zalo-finder': '/js/pages/zalo-finder.js',
    'timgrzalovathongke': '/js/pages/zalo-finder.js',
    'hethongphanchiagrzalo': '/js/pages/zalo-finder.js',
    'nhantintimdoitackh': '/js/pages/nhantintimdoitackh.js',
    'dangvideo': '/js/pages/dailylinks.js',
    'dangcontent': '/js/pages/dailylinks.js',
    'danggruop': '/js/pages/dailylinks.js',
    'seddingcongdong': '/js/pages/dailylinks.js',
    'dangbanthansp': '/js/pages/dailylinks.js',
    'tuyendungsvkd': '/js/pages/dailylinks.js',
    'thongsoaomau': '/js/pages/thongsoaomau.js',
    'ketoanguihang': '/js/pages/ketoanguihang.js?v=20260721_counting_fix_v7',
    'kinhdoanhguihang': '/js/pages/kinhdoanhguihang.js',
    'fab-import-v4': '/js/pages/fab-import-v4.js',
    'billnhaphang': '/js/pages/billnhaphang.js',
    'billvatlieu': '/js/pages/billvatlieu.js',
    'vatlieutempet': '/js/pages/vatlieutempet.js',
    'gianhapgoc': '/js/pages/gianhapgoc.js',
    'baogiagoc': '/js/pages/baogiagoc.js',
    'baogiactvhh': '/js/pages/baogiactvhh.js',
    'tilecatgoc': '/js/pages/tilecatgoc.js',
    'luongsanxuat': '/js/pages/luongsanxuat.js',
    'trasoat-modal': '/js/pages/trasoat-modal.js?v=20260721_no_sew_wf_v2',
    'donhanghomnayqlx': '/js/pages/donhanghomnayqlx.js?v=20260721_counting_fix_v5',
    'lichradonhang': '/js/pages/lichradonhang.js?v=20260721_ts_modal_lazy_v2',
    'nhapxuathoanvatlieu': '/js/pages/nhapxuathoanvatlieu.js',
    'congviec-qlx': '/js/pages/congviecqlx.js?v=20260725_qlx_v103',
    'congviecqlx': '/js/pages/congviecqlx.js?v=20260725_qlx_v103',
    'chuanbiqlx': '/js/pages/chuanbiqlx.js?v=20260816_undo_cutting_fix',
    'quanlyxuongqlx': '/js/pages/chuanbiqlx.js?v=20260816_undo_cutting_fix',
    'chuyen-so': '/js/pages/chuyenso.js?v=20260730_v7',
    'chuyenso': '/js/pages/chuyenso.js?v=20260730_v7',
    'chuyensosale': '/js/pages/chuyensosale.js?v=20260730_v7',
    'caidatsanxuat': '/js/pages/caidatsanxuat.js?v=20260817_cayle_cutoff_v1',
    'don-hang-tong': '/js/pages/donhangtong.js',
    'donhangtong': '/js/pages/donhangtong.js',
    'taophieudonhang': '/js/pages/taophieudonhang.js?v=20260731_v301',
    'tao-phieu-don-hang': '/js/pages/taophieudonhang.js?v=20260731_v301',
    'xuatvathv': '/js/pages/xuatvathv.js',
    'xuat-hoa-don-vat': '/js/pages/xuatvathv.js',
    'don-gui-ao-mau': '/js/pages/donguiaomau.js',
    'ke-toan-gui-hang': '/js/pages/ketoanguihang.js',
    'don-hang-chua-thu-tien': '/js/pages/donhangchuathutien.js',
    'don-hang-thiet-ke': '/js/pages/donhangthietke.js',
    'don-loi-khach-hang': '/js/pages/donloikhachhang.js',
    'so-ghi-nhan-tien': '/js/pages/soghinhantien.js',
    'so-thu-chi': '/js/pages/sothuchi.js',
    'so-co-phan-may': '/js/pages/socophanmay.js',
    'bao-gia-goc': '/js/pages/baogiagoc.js',
    'bao-gia-ctv-hh': '/js/pages/baogiactvhh.js',
    'gia-nhap-goc': '/js/pages/gianhapgoc.js',
    'ti-le-cat-goc': '/js/pages/tilecatgoc.js',
    'luong-san-xuat': '/js/pages/luongsanxuat.js',
    'kinh-doanh-gui-hang': '/js/pages/kinhdoanhguihang.js',
    'vat-lieu-tem-pet': '/js/pages/vatlieutempet.js',
    'kiem-tra-chat-luong': '/js/pages/kiemtrachatluong.js?v=20260725_ktcl_v5',
    'bill-nhap-hang': '/js/pages/billnhaphang.js',
    'nhap-xuat-hoan-vai': '/js/pages/nhapxuathoanvai.js',
    'bill-vat-lieu': '/js/pages/billvatlieu.js',
    'nhap-xuat-hoan-vat-lieu': '/js/pages/nhapxuathoanvatlieu.js',
    'kiem-kho': '/js/pages/kiemkho.js',
    'kho-vai': '/js/pages/khovai.js?v=20260817_tz_v12',
    'xuat-vai-cat': '/js/pages/xuatvaicat.js',
    'kho-vat-lieu': '/js/pages/khovatlieu.js',
    'thong-so-ao-mau': '/js/pages/thongsoaomau.js',
    'lich-ra-don-hang': '/js/pages/lichradonhang.js?v=20260721_ts_modal_lazy_v2',
    'tra-soat-don-hang': '/js/pages/trasoatdonhang.js?v=20260721_ts_modal_lazy_v2',
    'khuyenmaigiamgia': '/js/pages/khuyenmaigiamgia.js',
    'khuyen-mai-giam-gia': '/js/pages/khuyenmaigiamgia.js',
    'xuatvaicat': '/js/pages/xuatvaicat.js',
    'bosuutap': '/js/pages/bosuutap.js?v=' + Date.now(),
    'bo-suu-tap': '/js/pages/bosuutap.js?v=' + Date.now(),
    'chinhsachkhhv': '/js/pages/chinhsachkhhv.js?v=' + Date.now(),
    'chinh-sach-kh': '/js/pages/chinhsachkhhv.js?v=' + Date.now(),
    'chuongtrinhkhhv': '/js/pages/chuongtrinhkhhv.js?v=' + Date.now(),
    'chuong-trinh-kh': '/js/pages/chuongtrinhkhhv.js?v=' + Date.now(),
    'daotaosalekd': '/js/pages/xulydonloihv.js?v=' + Date.now(),
    'xulydonloihv': '/js/pages/xulydonloihv.js?v=' + Date.now(),
    'xu-ly-don-loi': '/js/pages/xulydonloihv.js?v=' + Date.now(),
    'quantrinhansuhv': '/js/pages/quantrinhansuhv.js?v=' + Date.now(),
    'quan-tri-nhan-su': '/js/pages/quantrinhansuhv.js?v=' + Date.now(),
    'hopdongtuyendung': '/js/pages/hopdongtuyendung.js?v=' + Date.now(),
    'hop-dong-tuyen-dung': '/js/pages/hopdongtuyendung.js?v=' + Date.now(),
    'hopdongkhachhang': '/js/pages/hopdongkhachhang.js?v=' + Date.now(),
    'hop-dong-khach-hang': '/js/pages/hopdongkhachhang.js?v=' + Date.now(),
    'chammauthietke': '/js/pages/chammauthietke.js?v=' + Date.now(),
    'cham-mau-thiet-ke': '/js/pages/chammauthietke.js?v=' + Date.now()
};

const _loadedScripts = new Set();
async function _loadScript(src) {
    const cleanSrc = src.split('?')[0];
    const isVersioned = src.includes('?v=');
    const existing = document.querySelector(`script[data-src="${cleanSrc}"], script[src^="${cleanSrc}"]`);
    
    if (existing) {
        if (isVersioned) {
            existing.remove();
            _loadedScripts.delete(cleanSrc);
        } else {
            return Promise.resolve();
        }
    }

    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.setAttribute('data-src', cleanSrc);
        const ts = Date.now();
        s.src = src.includes('?') ? (src + '&_t=' + ts) : (src + '?v=' + ts);
        s.async = true;
        s.onload = () => {
            _loadedScripts.add(cleanSrc);
            _loadedScripts.add(src);
            _loadedScripts.add(s.src);
            resolve();
        };
        s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.body.appendChild(s);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await checkAuth();
        setupEventListeners();
        handleRoute();
    } catch (err) {
        console.error('[Auth/Route] Initial load error:', err.message);
    } finally {
        var _authOverlay = document.getElementById('authLoadingOverlay');
        if (_authOverlay) {
            _authOverlay.style.transition = 'opacity .2s';
            _authOverlay.style.opacity = '0';
            setTimeout(function() { if (_authOverlay.parentNode) _authOverlay.remove(); }, 200);
        }
    }

    if (_isDoitacDomain) return;

    // Start prize celebration popup polling (skip for affiliate accounts)
    const AFFILIATE_POPUP_BLOCK = ['tkaffiliate', 'hoa_hong', 'ctv', 'nuoi_duong', 'sinh_vien'];
    if (currentUser && !AFFILIATE_POPUP_BLOCK.includes(currentUser.role)) {
        setTimeout(function() {
            if (typeof initPrizePopupSystem === 'function') initPrizePopupSystem();
        }, 2000);
    }

    const savedScroll = sessionStorage.getItem('scrollPos');
    if (savedScroll) {
        setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 100);
        sessionStorage.removeItem('scrollPos');
    }

    window.addEventListener('popstate', () => {
        handleRoute();
    });

    window.addEventListener('beforeunload', () => {
        sessionStorage.setItem('scrollPos', window.scrollY.toString());
    });

    // Register global tasks in central HeartbeatService
    if (currentUser && ['quan_ly', 'truong_phong'].includes(currentUser.role)) {
        window.registerHeartbeatTask('emPopupCheck', emPopupCheck, 60, () => {
            return currentUser && ['quan_ly', 'truong_phong'].includes(currentUser.role);
        });
    }

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

    if (currentUser && ['nhan_vien', 'thu_viec', 'truong_phong'].includes(currentUser.role)) {
        window.registerHeartbeatTask('cancelNVPopupCheck', cancelNVPopupCheck, 60, () => {
            return currentUser && ['nhan_vien', 'thu_viec', 'truong_phong'].includes(currentUser.role);
        });
    }

    if (currentUser && ['quan_ly', 'giam_doc'].includes(currentUser.role)) {
        window.registerHeartbeatTask('cancelManagerPopupCheck', cancelManagerPopupCheck, 60, () => {
            return currentUser && ['quan_ly', 'giam_doc'].includes(currentUser.role);
        });
    }

    if (currentUser && ['giam_doc', 'quan_ly_cap_cao'].includes(currentUser.role)) {
        window._wdLastPendingCount = -1;
        window.registerHeartbeatTask('wdPollPending', wdPollPending, 15, () => {
            return currentUser && ['giam_doc', 'quan_ly_cap_cao'].includes(currentUser.role);
        });
    }

    if (currentUser && currentUser.role === 'giam_doc' && !sessionStorage.getItem('commCapChecked')) {
        setTimeout(async () => {
            try {
                const data = await apiCall('/api/admin/commission-cap-check');
                sessionStorage.setItem('commCapChecked', '1');
                if (data.alerts && data.alerts.length > 0) {
                    _showCommCapAlert(data.alerts);
                }
            } catch(e) {}
        }, 4000);
    }

    if (currentUser && ['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(currentUser.role)) {
        window.registerHeartbeatTask('_ctvPollBadge', _ctvPollBadge, 30, () => {
            return currentUser && ['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(currentUser.role);
        });
    }

    const COMMIT_BLOCK_ROLES = ['tkaffiliate', 'hoa_hong'];
    if (currentUser && !COMMIT_BLOCK_ROLES.includes(currentUser.role)) {
        setTimeout(_commitLoad, 1200);
        setTimeout(_commitPopupCheck, 60000);
    } else {
        var commitWrap = document.getElementById('commitBtnWrap');
        if (commitWrap) commitWrap.style.display = 'none';
    }

    startHeartbeatSystem();
});

// ========== COMMITMENT TOPBAR BUTTON ==========
var _commitOpen = false;
var _commitData = null;

function _commitToggle() {
    var dd = document.getElementById('commitDropdown');
    if (!dd) return;
    _commitOpen = !_commitOpen;
    dd.style.display = _commitOpen ? 'block' : 'none';
    if (_commitOpen && !_commitData) _commitLoad();
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    var wrap = document.getElementById('commitBtnWrap');
    if (wrap && _commitOpen && !wrap.contains(e.target)) {
        _commitOpen = false;
        var dd = document.getElementById('commitDropdown');
        if (dd) dd.style.display = 'none';
    }
});

async function _commitLoad() {
    var content = document.getElementById('commitDropdownContent');
    var badge = document.getElementById('commitBadge');
    if (!content) return;
    try {
        var data = await apiCall('/api/meeting-commitments/my-latest');
        _commitData = data;

        if (!data.session || !data.commitments || data.commitments.length === 0) {
            content.innerHTML = '<div style="text-align:center;padding:28px 16px">'
                + '<div style="font-size:40px;margin-bottom:10px">📋</div>'
                + '<div style="font-size:14px;font-weight:700;color:#374151">Chưa có cam kết</div>'
                + '<div style="font-size:12px;color:#9ca3af;margin-top:4px">Bạn chưa có cam kết trong tháng này</div>'
                + '</div>';
            if (badge) badge.style.display = 'none';
            return;
        }

        // Show badge count
        if (badge) {
            badge.textContent = data.commitments.length;
            badge.style.display = 'inline-block';
        }

        var h = '';
        var ddMeetingDate = data.session && data.session.meeting_date ? new Date(data.session.meeting_date).toLocaleDateString('vi-VN', { weekday:'long', day:'2-digit', month:'2-digit', year:'numeric' }) : '';
        // Header
        h += '<div style="padding:14px 16px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:white;border-radius:12px 12px 0 0;margin:-16px -16px 12px">';
        h += '<div style="font-size:14px;font-weight:800">📋 CAM KẾT CỦA TÔI</div>';
        h += '<div style="font-size:12px;color:#fbbf24;font-weight:700;margin-top:3px">' + (data.sessionTitle || '') + '</div>';
        h += '<div style="font-size:10px;opacity:0.75;margin-top:2px">📅 ' + ddMeetingDate + '</div>';
        h += '</div>';

        // Commitments list
        for (var i = 0; i < data.commitments.length; i++) {
            var c = data.commitments[i];
            var pct = c.completion_pct || 0;
            var isDone = c.is_completed;
            var barColor = isDone ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
            var statusIcon = isDone ? '✅' : '⏳';

            // Parse content (❓ question + ✅ answer)
            var lines = (c.content || '').split('\n');
            var question = '', answer = '';
            for (var li = 0; li < lines.length; li++) {
                var ln = lines[li].trim();
                if (ln.indexOf('❓') === 0) question = ln.substring(2).trim();
                else if (ln.indexOf('✅') === 0) answer = ln.substring(2).trim();
                else if (!question && !answer) answer = ln;
            }

            h += '<div style="padding:10px 12px;background:#f8fafc;border-radius:10px;margin-bottom:8px;border-left:3px solid ' + barColor + '">';
            h += '<div style="display:flex;justify-content:space-between;align-items:start;gap:8px">';
            h += '<div style="flex:1">';
            if (question) h += '<div style="font-size:11px;color:#6366f1;font-weight:700;margin-bottom:3px"><span style="display:inline-block;background:#6366f1;color:#fff;width:18px;height:18px;border-radius:50%;text-align:center;line-height:18px;font-size:10px;margin-right:4px">' + (i+1) + '</span>' + question + '</div>';
            h += '<div style="font-size:12px;color:#1e293b;font-weight:600">' + statusIcon + ' ' + (answer || c.content || '') + '</div>';
            if (c.target_revenue > 0) {
                h += '<div style="font-size:11px;color:#059669;font-weight:600;margin-top:3px">💰 Target: ' + Number(c.target_revenue).toLocaleString('vi-VN') + '</div>';
            }
            h += '</div>';
            h += '<div style="text-align:center;min-width:44px">';
            h += '<div style="font-size:16px;font-weight:900;color:' + barColor + '">' + pct + '%</div>';
            h += '</div></div>';
            // Progress bar
            h += '<div style="margin-top:6px;background:#e5e7eb;border-radius:4px;height:4px;overflow:hidden">';
            h += '<div style="width:' + pct + '%;height:100%;background:' + barColor + ';border-radius:4px;transition:width .3s"></div>';
            h += '</div></div>';
        }

        content.innerHTML = h;
    } catch(e) {
        content.innerHTML = '<div style="text-align:center;padding:20px;color:#ef4444;font-size:12px">⚠️ Lỗi tải cam kết</div>';
    }
}

// ========== COMMITMENT POPUP (auto after 60s) ==========
async function _commitPopupCheck() {
    try {
        // Make sure data is loaded
        if (!_commitData) {
            _commitData = await apiCall('/api/meeting-commitments/my-latest');
        }
        if (!_commitData || !_commitData.session || !_commitData.commitments || _commitData.commitments.length === 0) return;
        // Check if already seen TODAY (once per day only)
        var todayStr = new Date().toISOString().split('T')[0];
        var seenKey = 'commitPopupSeen_' + _commitData.session.id + '_' + todayStr;
        if (localStorage.getItem(seenKey)) return;
        _showCommitPopup();
    } catch(e) { /* silent */ }
}

function _showCommitPopup(forceShow) {
    if (!_commitData || !_commitData.commitments || _commitData.commitments.length === 0) {
        if (forceShow) { alert('Bạn chưa có cam kết trong tháng này'); }
        return;
    }
    if (document.getElementById('commitPopupOverlay')) return;

    var data = _commitData;
    // Only show latest 4 commitments
    var allCommits = data.commitments;
    var commits = allCommits.slice(-4);
    var sessionTitle = data.sessionTitle || '';
    var meetingDate = data.session && data.session.meeting_date ? new Date(data.session.meeting_date).toLocaleDateString('vi-VN', { weekday:'long', day:'2-digit', month:'2-digit', year:'numeric' }) : '';

    // Build commitment cards
    var cardsHtml = '';
    for (var i = 0; i < commits.length; i++) {
        var c = commits[i];
        var pct = c.completion_pct || 0;
        var isDone = c.is_completed;
        var barColor = isDone ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
        var statusIcon = isDone ? '✅' : '⏳';
        var bgGlow = isDone ? 'rgba(16,185,129,0.08)' : 'rgba(124,58,237,0.04)';

        // Parse content
        var lines = (c.content || '').split('\n');
        var question = '', answer = '';
        for (var li = 0; li < lines.length; li++) {
            var ln = lines[li].trim();
            if (ln.indexOf('❓') === 0) question = ln.substring(2).trim();
            else if (ln.indexOf('✅') === 0) answer = ln.substring(2).trim();
            else if (!question && !answer) answer = ln;
        }

        cardsHtml += '<div style="padding:16px 18px;background:' + bgGlow + ';border-radius:14px;border:1.5px solid rgba(124,58,237,0.12);margin-bottom:10px;transition:all .2s"'
            + ' onmouseover="this.style.transform=\'translateX(4px)\';this.style.borderColor=\'rgba(124,58,237,0.3)\'" onmouseout="this.style.transform=\'none\';this.style.borderColor=\'rgba(124,58,237,0.12)\'">';
        cardsHtml += '<div style="display:flex;align-items:start;gap:12px">';
        // Number circle
        cardsHtml += '<div style="flex-shrink:0;width:32px;height:32px;background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:14px;box-shadow:0 3px 10px rgba(124,58,237,0.3)">' + (i+1) + '</div>';
        cardsHtml += '<div style="flex:1;min-width:0">';
        if (question) {
            cardsHtml += '<div style="font-size:12px;color:#6366f1;font-weight:700;margin-bottom:4px;line-height:1.4">' + question + '</div>';
        }
        cardsHtml += '<div style="font-size:13px;color:#1e293b;font-weight:600;line-height:1.5">' + statusIcon + ' ' + (answer || c.content || '') + '</div>';
        if (c.target_revenue > 0) {
            cardsHtml += '<div style="margin-top:5px;display:inline-flex;align-items:center;gap:5px;background:linear-gradient(135deg,#ecfdf5,#d1fae5);padding:4px 12px;border-radius:8px;border:1px solid #6ee7b7">';
            cardsHtml += '<span style="font-size:12px">💰</span>';
            cardsHtml += '<span style="font-size:14px;font-weight:900;color:#059669">Target: ' + Number(c.target_revenue).toLocaleString('vi-VN') + '</span>';
            cardsHtml += '</div>';
        }
        // Progress bar
        cardsHtml += '<div style="margin-top:8px;display:flex;align-items:center;gap:8px">';
        cardsHtml += '<div style="flex:1;background:#e5e7eb;border-radius:6px;height:6px;overflow:hidden">';
        cardsHtml += '<div style="width:' + pct + '%;height:100%;background:' + barColor + ';border-radius:6px;transition:width .5s ease"></div>';
        cardsHtml += '</div>';
        cardsHtml += '<span style="font-size:13px;font-weight:900;color:' + barColor + ';min-width:40px;text-align:right">' + pct + '%</span>';
        cardsHtml += '</div>';
        cardsHtml += '</div></div></div>';
    }

    var overlay = document.createElement('div');
    overlay.id = 'commitPopupOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99997;display:flex;align-items:center;justify-content:center;padding:20px;animation:_cpFadeIn .4s ease';

    overlay.innerHTML = '<div style="background:white;border-radius:24px;max-width:520px;width:100%;max-height:85vh;overflow:hidden;box-shadow:0 30px 80px rgba(124,58,237,0.35);animation:_cpBounce .5s ease;display:flex;flex-direction:column">'
        // Header
        + '<div style="background:linear-gradient(135deg,#7c3aed,#6d28d9,#4c1d95);padding:28px 28px 22px;text-align:center;position:relative;overflow:hidden">'
        + '<div style="position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(circle at 20% 50%,rgba(255,255,255,0.1),transparent 50%),radial-gradient(circle at 80% 20%,rgba(255,255,255,0.08),transparent 40%)"></div>'
        + '<div style="position:relative;z-index:1">'
        + '<div style="font-size:48px;margin-bottom:8px;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.3))">📋</div>'
        + '<div style="font-size:22px;font-weight:900;color:white;letter-spacing:1px;text-shadow:0 2px 10px rgba(0,0,0,0.2)">CAM KẾT CỦA BẠN</div>'
        + '<div style="font-size:14px;color:#fbbf24;margin-top:8px;font-weight:800;letter-spacing:0.5px">' + sessionTitle + '</div>'
        + '<div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:4px;font-weight:500">📅 ' + meetingDate + '</div>'
        + '<div style="margin-top:10px;display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.15);padding:5px 14px;border-radius:20px;font-size:12px;color:rgba(255,255,255,0.95);font-weight:700;backdrop-filter:blur(4px)">'
        + '📌 ' + commits.length + ' cam kết mới nhất</div>'
        + '</div></div>'
        // Body (scrollable)
        + '<div style="flex:1;overflow-y:auto;padding:20px 24px">' + cardsHtml + '</div>'
        // Footer
        + '<div style="padding:16px 24px 20px;border-top:1px solid #f1f5f9;text-align:center;background:linear-gradient(180deg,#faf5ff,white)">'
        + '<button onclick="_commitPopupDismiss()" style="padding:14px 48px;border:none;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;border-radius:14px;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 6px 24px rgba(124,58,237,0.35);text-transform:uppercase;letter-spacing:1.5px;transition:all .2s" onmouseover="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 8px 30px rgba(124,58,237,0.5)\'" onmouseout="this.style.transform=\'none\';this.style.boxShadow=\'0 6px 24px rgba(124,58,237,0.35)\'">'
        + '✅ ĐÃ XEM</button>'
        + '<div style="margin-top:8px;font-size:11px;color:#9ca3af">Hãy nỗ lực hoàn thành cam kết! 💪</div>'
        + '</div></div>';

    // Inject animations
    if (!document.getElementById('_cpPopupStyles')) {
        var st = document.createElement('style');
        st.id = '_cpPopupStyles';
        st.textContent = '@keyframes _cpFadeIn{from{opacity:0}to{opacity:1}}@keyframes _cpBounce{0%{transform:scale(.8) translateY(30px);opacity:0}60%{transform:scale(1.02)}100%{transform:scale(1) translateY(0);opacity:1}}';
        document.head.appendChild(st);
    }

    document.body.appendChild(overlay);
}

function _commitPopupDismiss() {
    var overlay = document.getElementById('commitPopupOverlay');
    if (overlay) overlay.remove();
    // Mark as seen for TODAY (won't show again until tomorrow)
    if (_commitData && _commitData.session) {
        var todayStr = new Date().toISOString().split('T')[0];
        localStorage.setItem('commitPopupSeen_' + _commitData.session.id + '_' + todayStr, '1');
    }
}

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

// ========== COMMISSION CAP ALERT (>15%) FOR GIÁM ĐỐC ==========
function _showCommCapAlert(alerts) {
    if (document.getElementById('commCapAlertOverlay')) return;

    const fmtMoney = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';
    
    let tableRows = alerts.map(a => {
        const detailsHtml = a.details.map(d => 
            `<span style="display:inline-block;background:rgba(255,255,255,0.15);padding:2px 8px;border-radius:6px;margin:2px;font-size:11px;">
                ${d.type}: <strong>${d.username}</strong> ${d.rate}%
            </span>`
        ).join('');
        
        return `<tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
            <td style="padding:10px 8px;font-weight:700;color:#fbbf24;">${a.order_code}</td>
            <td style="padding:10px 8px;font-size:12px;">${a.customer_name}</td>
            <td style="padding:10px 8px;text-align:right;font-weight:600;">${fmtMoney(a.revenue)}</td>
            <td style="padding:10px 8px;text-align:center;">
                <span style="background:#dc2626;color:white;padding:3px 10px;border-radius:20px;font-weight:800;font-size:13px;">
                    ${a.total_percent}%
                </span>
            </td>
            <td style="padding:10px 8px;text-align:right;color:#fca5a5;font-weight:600;">+${fmtMoney(a.excess_amount)}</td>
            <td style="padding:10px 8px;">${detailsHtml}</td>
        </tr>`;
    }).join('');

    const totalExcess = alerts.reduce((s, a) => s + a.excess_amount, 0);

    const overlay = document.createElement('div');
    overlay.id = 'commCapAlertOverlay';
    overlay.innerHTML = `
        <div style="position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;animation:emPopFadeIn 0.3s ease;">
            <div style="background:linear-gradient(135deg,#991b1b,#7f1d1d);color:white;border-radius:20px;max-width:900px;width:100%;max-height:85vh;overflow:hidden;box-shadow:0 25px 80px rgba(220,38,38,0.6);animation:emPopBounce 0.5s ease;display:flex;flex-direction:column;">
                <div style="padding:24px 28px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.1);flex-shrink:0;">
                    <div style="font-size:50px;margin-bottom:8px;animation:emPopShake 0.5s ease infinite;">🚨</div>
                    <div style="font-size:22px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">CẢNH BÁO CHIẾT KHẤU VƯỢT MỨC</div>
                    <div style="margin-top:8px;font-size:14px;opacity:0.85;">Phát hiện <strong style="color:#fbbf24;font-size:18px;">${alerts.length}</strong> đơn hàng vượt giới hạn <strong>${alerts[0]?.cap_percent || 15}%</strong> chiết khấu</div>
                    <div style="margin-top:6px;background:rgba(0,0,0,0.3);display:inline-block;padding:6px 16px;border-radius:20px;font-size:13px;">
                        💸 Tổng vượt mức: <strong style="color:#fca5a5;font-size:15px;">${fmtMoney(totalExcess)}</strong>
                    </div>
                </div>
                <div style="overflow-y:auto;flex:1;padding:0 16px 16px;">
                    <table style="width:100%;border-collapse:collapse;margin-top:12px;">
                        <thead>
                            <tr style="border-bottom:2px solid rgba(255,255,255,0.2);font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.7;">
                                <th style="padding:8px;text-align:left;">Mã đơn</th>
                                <th style="padding:8px;text-align:left;">Khách hàng</th>
                                <th style="padding:8px;text-align:right;">Doanh thu</th>
                                <th style="padding:8px;text-align:center;">Tổng %</th>
                                <th style="padding:8px;text-align:right;">Vượt</th>
                                <th style="padding:8px;text-align:left;">Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
                <div style="padding:16px 28px;border-top:1px solid rgba(255,255,255,0.1);text-align:center;flex-shrink:0;">
                    <button id="commCapAckBtn" onclick="_commCapAck()"
                        style="padding:12px 36px;border:none;background:#fbbf24;color:#7f1d1d;border-radius:12px;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 4px 20px rgba(251,191,36,0.4);text-transform:uppercase;letter-spacing:1px;">
                        ✅ Đã Kiểm Tra
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

// ★ GĐ ấn "ĐÃ KIỂM TRA" → lưu mốc thời gian vào DB, lần sau chỉ hiện đơn mới
async function _commCapAck() {
    const btn = document.getElementById('commCapAckBtn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Đang lưu...';
    }
    try {
        await apiCall('/api/admin/commission-cap-ack', { method: 'POST' });
    } catch(e) {
        console.error('[CommCapAck] Error:', e);
    }
    const overlay = document.getElementById('commCapAlertOverlay');
    if (overlay) overlay.remove();
}

async function checkAuth(retryCount) {
    var _maxRetries = 3;
    var _attempt = retryCount || 0;
    try {
        // ★ TIMEOUT 5s — không để user chờ vĩnh viễn khi server/mạng lag
        var controller = new AbortController();
        var timeoutId = setTimeout(function() { controller.abort(); }, 5000);

        var res = await fetch('/api/auth/me', { signal: controller.signal });
        clearTimeout(timeoutId);

        // ★ Token hết hạn / không hợp lệ → redirect login
        if (res.status === 401 || res.status === 403) {
            window.location.href = _isDoitacDomain ? '/' : '/index.html';
            return;
        }

        var data = await res.json();
        if (!data.user) {
            // Trên dongphuchv.net redirect về trang login affiliate
            window.location.href = _isDoitacDomain ? '/' : '/index.html';
            return;
        }
        currentUser = data.user;
        window._currentUser = currentUser; // ★ Alias for page scripts that use window._currentUser
        userPermissions = data.user.permissions || {};

        // ★ ACCESS BLOCK CHECK — chỉ GĐ được miễn
        if (data.user.access_blocked && data.user.role !== 'giam_doc') {
            _showAccessBlockScreen();
            return;
        }

        // ★ DOITAC PORTAL — skip heavy config loading for speed
        if (!_isDoitacDomain) {
            // ★ TIMEOUT 2s — tất cả config loading phải xong trong 2s, nếu không thì tiếp tục với menu mặc định
            try {
                await Promise.race([
                    (async function _loadConfigs() {
                        var dynamicItems = MENU_CONFIG.filter(function(item) { return item.dynamicRoles; });
                        var keysToFetch = dynamicItems.map(function(item) { return item.dynamicRoles; });
                        keysToFetch.push('access_unblock_managers');
                        keysToFetch.push('crm_conversion_approver_ids');
                        
                        // Deduplicate keys
                        var uniqueKeys = Array.from(new Set(keysToFetch));
                        
                        var batchRes = await fetch('/api/app-configs/batch', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ keys: uniqueKeys })
                        }).then(function(r) { return r.json(); }).catch(function() { return {}; });

                        dynamicItems.forEach(function(item) {
                            var val = batchRes[item.dynamicRoles];
                            if (val) {
                                item.roles = JSON.parse(val);
                                _configCache[item.dynamicRoles] = val;
                            }
                        });

                        // Nhân Sự Toàn Quyền (HR) — cho thấy menu mở khóa dù role là nhan_vien
                        var hrVal = batchRes['access_unblock_managers'];
                        if (hrVal) {
                            try {
                                var hrIds = JSON.parse(hrVal);
                                if (hrIds.includes(data.user.id)) {
                                    var mkItem = MENU_CONFIG.find(function(m) { return m.id === 'mo-khoa-tk-phat'; });
                                    if (mkItem && !mkItem.roles.includes(data.user.role)) mkItem.roles.push(data.user.role);
                                }
                            } catch(e) {}
                        }

                        // CTV Approver — cho người được chỉ định thấy menu Chấp Nhận CTV
                        var ctvVal = batchRes['crm_conversion_approver_ids'];
                        if (ctvVal) {
                            try {
                                var ctvIds = JSON.parse(ctvVal);
                                if (ctvIds.includes(data.user.id)) {
                                    var ctvItem = MENU_CONFIG.find(function(m) { return m.id === 'chap-nhan-ctv-affiliate'; });
                                    if (ctvItem && !ctvItem.roles.includes(data.user.role)) ctvItem.roles.push(data.user.role);
                                }
                            } catch(e) {}
                        }
                    })(),
                    new Promise(function(_, reject) { setTimeout(function() { reject(new Error('Config loading timeout')); }, 2000); })
                ]);
            } catch(cfgErr) {
                console.warn('[Auth] Config loading bị timeout/lỗi — tiếp tục với menu mặc định:', cfgErr.message);
            }
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
        _toInit(); // Time override button (chỉ GĐ)
        _drInit(); // Daily report button (chỉ GĐ)

        var redirectToast = sessionStorage.getItem('unauthorized_redirect_toast');
        if (redirectToast) {
            sessionStorage.removeItem('unauthorized_redirect_toast');
            if (typeof showToast === 'function') {
                showToast(redirectToast, 'error');
            }
        }
    } catch (err) {
        // ★ Network error / Timeout → auto-retry (tối đa 3 lần) thay vì redirect login
        console.warn('[Auth] Lần ' + (_attempt + 1) + ' thất bại:', err.message);
        if (_attempt < _maxRetries - 1) {
            // Cập nhật overlay hiển thị đang thử lại
            var ov = document.getElementById('authLoadingOverlay');
            if (ov) {
                var msgEl = ov.querySelector('div');
                if (msgEl) msgEl.textContent = 'Đang thử kết nối lại... (' + (_attempt + 2) + '/' + _maxRetries + ')';
            }
            // Chờ 2s rồi thử lại
            await new Promise(function(r) { setTimeout(r, 2000); });
            return checkAuth(_attempt + 1);
        }
        // ★ Hết retry → hiện nút Thử Lại (KHÔNG redirect login, giữ session)
        _showAuthRetryScreen(err.name === 'AbortError' ? 'timeout' : 'network');
        throw err;
    }
}

// ★ Retry screen — hiện khi xác thực thất bại sau nhiều lần thử
function _showAuthRetryScreen(reason) {
    var overlay = document.getElementById('authLoadingOverlay');
    if (!overlay) return;
    var msg = reason === 'timeout'
        ? 'Server phản hồi quá chậm'
        : 'Không thể kết nối đến server';
    overlay.innerHTML = ''
        + '<img src="/images/logo.png" alt="Logo" style="width:60px;height:60px;border-radius:12px;opacity:0.8;">'
        + '<div style="color:#f87171;font-size:14px;font-weight:700;font-family:Inter,sans-serif;margin-top:12px;">⚠️ ' + msg + '</div>'
        + '<div style="color:rgba(255,255,255,0.5);font-size:12px;font-family:Inter,sans-serif;margin-top:4px;">Đã thử 3 lần — vui lòng kiểm tra mạng rồi thử lại</div>'
        + '<button onclick="location.reload()" style="margin-top:20px;padding:12px 32px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:white;border:none;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer;font-family:Inter,sans-serif;box-shadow:0 4px 16px rgba(99,102,241,0.4);transition:all .2s;" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'none\'">🔄 Thử Lại</button>';
}

// ========== SIDEBAR SCROLL PRESERVATION ==========
function saveSidebarScrollAndNavigate(href) {
    var nav = document.getElementById('sidebarNav');
    if (nav) sessionStorage.setItem('sidebarScrollPos', nav.scrollTop.toString());
    
    // Resolve menu items by matching custom href/path or ID
    var cleanRoute = href.replace(/^\//, '');
    var menuItem = findMenuItemForPage(cleanRoute);
    if (menuItem) {
        navigate(menuItem.id);
    } else {
        window.location.href = href;
    }
}

// ========== SIDEBAR ==========
if (!localStorage.getItem('sidebarDefaultsSet_v3')) {
    localStorage.removeItem('sidebarCollapsed');
    localStorage.removeItem('sidebarParentCollapsed');
    localStorage.setItem('sidebarDefaultsSet_v3', 'true');
}
var _sidebarCollapsed = JSON.parse(localStorage.getItem('sidebarCollapsed') || '{}');
var _sidebarParentCollapsed = JSON.parse(localStorage.getItem('sidebarParentCollapsed') || '{}');
var _sidebarSectionKeys = [];

// Parent group definitions: parent name -> list of child section names (in order)
var PARENT_SECTIONS = [
    { name: 'KẾT QUẢ & VINH DANH', sections: ['BÁO CÁO', 'TỔNG QUAN', 'BXH & GIẢI THƯỞNG'] },
    { name: 'QUẢN LÝ CÔNG VIỆC', sections: ['CÔNG VIỆC HẰNG NGÀY', 'CÔNG VIỆC CHĂM SÓC KHÁCH'] },
    { name: 'NỘI QUY & QUY TẮC LÀM VIỆC', sections: ['NỘI QUY & TƯ LIỆU NỘI BỘ', 'QUY TẮC & CHÍNH SÁCH KH'] },
    { name: 'HÀNH CHÍNH & NHÂN SỰ', sections: ['QUẢN TRỊ NHÂN SỰ'] },
    { name: 'BỘ PHẬN VĂN PHÒNG', sections: ['VĂN PHÒNG QUẢN LÝ', 'BỘ PHẬN THIẾT KẾ'] },
    { name: 'BỘ PHẬN XƯỞNG SX', sections: ['QUẢN LÝ XƯỞNG', 'XƯỞNG SẢN XUẤT', 'MẪU & GIÁ SẢN XUẤT'] },
    { name: 'BỘ PHẬN MARKETING', sections: ['Marketing Ads', 'Facebook Ads'] },
    { name: 'BỘ PHẬN SALE', sections: ['CÔNG VIỆC NV SALE'] },
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

    // Initialize collapse states (auto-expand active section and parent group)
    sectionOrder.forEach(function(sectionName) {
        var items = sectionItems[sectionName] || [];
        var containsActiveItem = items.some(function(item) { return item.id === currentPage; });
        if (containsActiveItem) {
            _sidebarCollapsed[sectionName] = false;
        } else if (_sidebarCollapsed[sectionName] === undefined) {
            _sidebarCollapsed[sectionName] = false;
        }
    });

    PARENT_SECTIONS.forEach(function(parent) {
        var containsActive = parent.sections.some(function(sectionName) {
            var items = sectionItems[sectionName] || [];
            return items.some(function(item) { return item.id === currentPage; });
        });
        if (containsActive) {
            _sidebarParentCollapsed[parent.name] = false;
        } else if (_sidebarParentCollapsed[parent.name] === undefined) {
            _sidebarParentCollapsed[parent.name] = false;
        }
    });

    // ★ SEARCH BOX — tìm kiếm menu nhanh
    html += '<div id="sidebarSearchWrap" style="padding:8px 14px 4px;">';
    html += '<div style="position:relative;">';
    html += '<input id="sidebarSearchInput" type="text" placeholder="🔍 Tìm menu..." autocomplete="off" spellcheck="false" style="width:100%;padding:8px 32px 8px 12px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:8px;color:rgba(255,255,255,.9);font-size:12px;font-family:Inter,sans-serif;outline:none;transition:all .2s;">';
    html += '<span id="sidebarSearchClear" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);cursor:pointer;color:rgba(255,255,255,.3);font-size:14px;display:none;transition:color .2s;" title="Xóa">✕</span>';
    html += '</div>';
    html += '</div>';

    // Toggle all button (sections only, not parents)
    var allSectionsCollapsed = sectionOrder.every(function(s) { return _sidebarCollapsed[s]; });
    var toggleLabel = allSectionsCollapsed ? '\u25BC M\u1EDF r\u1ED9ng t\u1EA5t c\u1EA3' : '\u25B2 R\u00FAt g\u1ECDn t\u1EA5t c\u1EA3';
    html += '<div id="sidebarToggleWrap" style="padding:6px 14px 10px;display:flex;">';
    html += '<button id="sidebarToggleAll" style="flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.5);padding:5px 8px;border-radius:6px;font-size:10px;cursor:pointer;font-weight:600;transition:all .2s;">' + toggleLabel + '</button>';
    html += '</div>';

    // Search results container (hidden by default)
    html += '<div id="sidebarSearchResults" style="display:none;padding:0 6px;"></div>';

    // Normal menu container (will be hidden when searching)
    html += '<div id="sidebarMenuContent">';

    // Track which sections are rendered (to handle orphans)
    var renderedSections = {};

    // ★ DOITAC PORTAL — đổi tên parent + section cho affiliate portal
    var _doitacParentNames = { 'KẾT QUẢ & VINH DANH': 'BÁO CÁO & HƯỚNG DẪN', 'NHÂN SỰ & VẬN HÀNH': 'HỆ THỐNG QUẢN TRỊ' };
    var _doitacSectionNames = { 'HỖ TRỢ NHÂN VIÊN HV': 'CHUYỂN SỐ & QUẢN LÝ KHÁCH', 'AFFILIATE': 'THEO DÕI KHÁCH & RÚT TIỀN' };
    var _doitacItemLabels = { 'chuyen-so': 'Chuyển Số Khách Hàng', 'quanlytkhethongaff': 'Quản Lý Tài Khoản Affiliate', 'huong-dan-su-dung': 'Lời Chào Mừng & Hướng Dẫn' };

    // Render parent groups
    PARENT_SECTIONS.forEach(function(parent, pidx) {
        var parentCollapsed = _sidebarParentCollapsed[parent.name] || false;
        var parentChevron = parentCollapsed ? '\u25B6' : '\u25BC';

        // Check if parent has any visible sections
        var hasVisibleSections = parent.sections.some(function(s) { return sectionItems[s]; });
        if (!hasVisibleSections) return;

        html += '<div class="nav-parent-wrap">';
        html += '<div class="nav-parent-header" data-pidx="' + pidx + '">';
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
                html += '<a class="nav-item ' + isActive + '" data-page="' + item.id + '" data-tooltip="' + ((_isDoitacPortal && _doitacItemLabels[item.id]) || item.label) + '" href="' + itemHref + '" onclick="event.preventDefault(); ' + clickAction + '">';
                html += '<span class="nav-icon">' + item.icon + '</span> ' + ((_isDoitacPortal && _doitacItemLabels[item.id]) || item.label);
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
            html += '<a class="nav-item ' + isActive + '" data-page="' + item.id + '" data-tooltip="' + ((_isDoitacPortal && _doitacItemLabels[item.id]) || item.label) + '" href="' + itemHref + '" onclick="event.preventDefault(); ' + clickAction + '">';
            html += '<span class="nav-icon">' + item.icon + '</span> ' + ((_isDoitacPortal && _doitacItemLabels[item.id]) || item.label);
            if (item.id === 'chap-nhan-ctv-affiliate') html += '<span id="ctvPendingBadge" style="display:none;margin-left:6px;background:#ef4444;color:white;font-size:10px;font-weight:800;padding:1px 6px;border-radius:8px;min-width:16px;text-align:center;"></span>';
            html += '</a>';
        });
        html += '</div></div>';
    });

    // Close normal menu container
    html += '</div>'; // #sidebarMenuContent

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

    // ★ SEARCH HANDLER — lọc menu realtime
    var searchInput = document.getElementById('sidebarSearchInput');
    var searchClear = document.getElementById('sidebarSearchClear');
    if (searchInput) {
        searchInput.addEventListener('focus', function() {
            this.style.borderColor = 'rgba(250,210,76,.5)';
            this.style.background = 'rgba(255,255,255,.12)';
            this.style.boxShadow = '0 0 0 2px rgba(250,210,76,.15)';
        });
        searchInput.addEventListener('blur', function() {
            this.style.borderColor = 'rgba(255,255,255,.12)';
            this.style.background = 'rgba(255,255,255,.08)';
            this.style.boxShadow = 'none';
        });
        searchInput.addEventListener('input', function() {
            _sidebarFilterMenu(this.value);
        });
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                this.value = '';
                _sidebarFilterMenu('');
                this.blur();
            }
        });
    }
    if (searchClear) {
        searchClear.addEventListener('click', function() {
            var inp = document.getElementById('sidebarSearchInput');
            if (inp) { inp.value = ''; _sidebarFilterMenu(''); inp.focus(); }
        });
    }

    // Restore scroll position
    var savedScroll = sessionStorage.getItem('sidebarScrollPos');
    if (savedScroll) {
        setTimeout(function() { if (nav) nav.scrollTop = parseInt(savedScroll); }, 50);
        sessionStorage.removeItem('sidebarScrollPos');
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

// ========== SIDEBAR MENU SEARCH ==========
function _removeVietnameseTones(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function _sidebarFilterMenu(query) {
    var menuContent = document.getElementById('sidebarMenuContent');
    var searchResults = document.getElementById('sidebarSearchResults');
    var toggleWrap = document.getElementById('sidebarToggleWrap');
    var clearBtn = document.getElementById('sidebarSearchClear');
    if (!menuContent || !searchResults) return;

    var q = query.trim().toLowerCase();
    var qNorm = _removeVietnameseTones(q);

    // Show/hide clear button
    if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';

    if (!q) {
        // No search: show normal menu, hide results
        menuContent.style.display = '';
        searchResults.style.display = 'none';
        searchResults.innerHTML = '';
        if (toggleWrap) toggleWrap.style.display = 'flex';
        return;
    }

    // Hide normal menu, show search results
    menuContent.style.display = 'none';
    if (toggleWrap) toggleWrap.style.display = 'none';
    searchResults.style.display = 'block';

    // Filter MENU_CONFIG
    var _isDoitacPortal = window.location.hostname.indexOf('dongphuchv.net') !== -1;
    var DOITAC_ALLOWED_IDS = ['tu-van-khach-aff', 'theo-doi-tu-van-aff', 'bao-cao-hoa-hong', 'rut-tien-affiliate', 'chuyen-so', 'quanlytkhethongaff', 'bao-cao-hoa-hong-hv', 'huong-dan-su-dung'];

    var matches = MENU_CONFIG.filter(function(item) {
        // Same permission checks as renderSidebar
        if (_isDoitacPortal && DOITAC_ALLOWED_IDS.indexOf(item.id) === -1) return false;
        if (item.strictRoles && !item.roles.includes(currentUser.role)) return false;
        if (currentUser.role !== 'giam_doc') {
            var permKey = item.permKey;
            if (permKey) {
                if (!userPermissions[permKey] || !userPermissions[permKey].can_view) return false;
            } else {
                if (!item.roles.includes(currentUser.role)) return false;
            }
        }
        // Match against label (with and without tones)
        var label = item.label.toLowerCase();
        var labelNorm = _removeVietnameseTones(label);
        return label.indexOf(q) !== -1 || labelNorm.indexOf(qNorm) !== -1;
    });

    if (matches.length === 0) {
        searchResults.innerHTML = '<div style="padding:20px 14px;text-align:center;">'
            + '<div style="font-size:28px;margin-bottom:8px;opacity:.5;">🔍</div>'
            + '<div style="font-size:12px;color:rgba(255,255,255,.4);font-weight:600;">Không tìm thấy menu nào</div>'
            + '<div style="font-size:10px;color:rgba(255,255,255,.25);margin-top:4px;">Thử từ khóa khác...</div>'
            + '</div>';
        return;
    }

    // Build flat results with section labels
    var h = '';
    var lastSection = '';
    matches.forEach(function(item) {
        if (item.section !== lastSection) {
            lastSection = item.section;
            h += '<div style="padding:6px 14px 3px;font-size:9px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:rgba(250,210,76,.5);">' + item.section + '</div>';
        }
        var itemHref = item.href || ('/' + item.id);
        var isActive = currentPage === item.id ? 'active' : '';
        var clickAction = item.href ? "saveSidebarScrollAndNavigate('" + item.href + "')" : "navigate('" + item.id + "')";

        // Highlight matched text
        var displayLabel = item.label;
        var matchIdx = displayLabel.toLowerCase().indexOf(q);
        if (matchIdx === -1) {
            // Try normalized match for highlight position
            var normLabel = _removeVietnameseTones(displayLabel.toLowerCase());
            matchIdx = normLabel.indexOf(qNorm);
        }
        if (matchIdx !== -1 && q.length > 0) {
            var before = displayLabel.substring(0, matchIdx);
            var matched = displayLabel.substring(matchIdx, matchIdx + q.length);
            var after = displayLabel.substring(matchIdx + q.length);
            displayLabel = before + '<span style="background:rgba(250,210,76,.25);color:#fde68a;border-radius:2px;padding:0 1px;">' + matched + '</span>' + after;
        }

        h += '<a class="nav-item ' + isActive + '" data-page="' + item.id + '" data-tooltip="' + item.label + '" href="' + itemHref + '" onclick="event.preventDefault(); ' + clickAction + '" style="animation:_sbSearchFadeIn .2s ease;">';
        h += '<span class="nav-icon">' + item.icon + '</span> ' + displayLabel;
        h += '</a>';
    });

    // Result count badge
    h = '<div style="padding:4px 14px 6px;display:flex;align-items:center;justify-content:space-between;">'
        + '<span style="font-size:10px;color:rgba(255,255,255,.35);font-weight:600;">KẾT QUẢ</span>'
        + '<span style="font-size:9px;background:rgba(250,210,76,.15);color:rgba(250,210,76,.8);padding:2px 8px;border-radius:10px;font-weight:700;">' + matches.length + ' menu</span>'
        + '</div>' + h;

    searchResults.innerHTML = h;
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
    
    // Find the menu item to get its custom href if it exists
    var menuItem = findMenuItemForPage(page);
    var targetPath = (menuItem && menuItem.href) ? menuItem.href : ('/' + page);
    
    history.pushState({ page }, '', targetPath);
    handleRoute();

    // Close mobile sidebar (reset inline styles + state)
    _sidebarOpen = false;
    var sb = document.getElementById('sidebar');
    var ov = document.getElementById('sidebarOverlay');
    if (sb) { sb.classList.remove('open'); sb.style.cssText = ''; }
    if (ov) { ov.classList.remove('show'); ov.style.cssText = ''; }
}

// ========== ROUTING HOOKS & HELPERS ==========
function findMenuItemForPage(pageId) {
    // Helper to check if a menu config item matches the pageId
    function isMatch(m, pid) {
        if (m.id === pid) return true;
        if (m.href && m.href.replace(/^\//, '') === pid) return true;
        if (m.mobileHref && m.mobileHref.replace(/^\//, '') === pid) return true;
        
        var aliasMap = {
            'm/gioihanchitieu': 'gioihanchitieu',
            'gioi-han-chi-tieu': 'gioihanchitieu',
            'bangcongviec/hoanthanh': 'bangcongviec',
            'bang-cong-viec/hoan-thanh': 'bangcongviec',
            'bang_cong_viec/hoan_thanh': 'bangcongviec',
            'baocaohoahong': 'bao-cao-hoa-hong',
            'chapnhanctvaffliate': 'chap-nhan-ctv-affiliate',
            'baocaohoahonghv': 'bao-cao-hoa-hong-hv',
            'huongdansudung': 'huong-dan-su-dung',
            'bangxephangaffiliate': 'bang-xep-hang-affiliate',
            'bangxephangkinhdoanh': 'bang-xep-hang-kinh-doanh',
            'bangxephangsale': 'bang-xep-hang-sale',
            'bangxephangctv': 'bang-xep-hang-ctv',
            'bxhsanxuat': 'bxh-san-xuat',
            'bxhvanphong': 'bxh-van-phong',
            'giaithuonggame': 'giai-thuong-game',
            'traogiaithuong': 'trao-giai-thuong',
            'bangiaodiem': 'bangiao-diem-kd',
            'lichkhoabieu': 'lich-khoa-bieu',
            'lichsubaocaocv': 'lich-su-bao-cao',
            'khoatknv': 'khoa-tk-nv',
            'mokhoatkphat': 'mo-khoa-tk-phat',
            'xinnghinhanvien': 'xin-nghi-nv',
            'setupngayle': 'setup-ngay-le',
            'bangiaokhoa': 'bangiao-khoa',
            'timkiemkhachhanghv': 'timkiemkhachhang',
            'chamsocaffiliate': 'cham-soc-affiliate',
            'chamsockockol': 'cham-soc-koc-kol',
            'luongsanxuat': 'luong-san-xuat',
            'tilecatgoc': 'ti-le-cat-goc',
            'baogiagoc': 'bao-gia-goc',
            'baogiactvhh': 'bao-gia-ctv-hh',
            'donkhachsll': 'don-khach-sll',
            'donkhachnhieulan': 'don-khach-nhieu-lan',
            'donkhachmoi': 'don-khach-moi',
            'donquanhe': 'don-quan-he'
        };
        var resolvedId = aliasMap[pid];
        if (resolvedId && m.id === resolvedId) return true;

        var cleanId = pid.replace(/-/g, '').toLowerCase();
        if (m.id.replace(/-/g, '').toLowerCase() === cleanId) return true;
        if (m.href && m.href.replace(/^\//, '').replace(/-/g, '').toLowerCase() === cleanId) return true;

        return false;
    }

    // Filter all items in MENU_CONFIG that match the pageId
    var matches = MENU_CONFIG.filter(function(m) {
        return isMatch(m, pageId);
    });

    if (matches.length === 0) return null;

    // From the matches, find one that the current user has permission to access
    for (var i = 0; i < matches.length; i++) {
        if (hasMenuPermission(matches[i])) {
            return matches[i];
        }
    }

    // If none has permission, fallback to the first match
    return matches[0];
}

function findPermissionMenuItem(pageId) {
    // Ánh xạ các trang con/trang quy tắc tư vấn về các menu cha để kiểm tra quyền
    var aliasMap = {
        'quytacnuttuvancrmnhucau': 'crm-nhu-cau',
        'quytacnuttuvancrmctv': 'crm-ctv',
        'quytacnuttuvancrmaffiliate': 'cham-soc-affiliate',
        'quytacnuttuvancrmkockol': 'cham-soc-koc-kol',
        'quytacnuttuvancrmsale': 'chamsockhsale',
        'quytacnuttuvancrmtempet': 'chamsockhtempet'
    };

    var targetId = aliasMap[pageId] || pageId;
    return findMenuItemForPage(targetId);
}

function hasMenuPermission(item) {
    if (!currentUser) return false;
    if (currentUser.role === 'giam_doc') return true;
    if (item.strictRoles && (!item.roles || !item.roles.includes(currentUser.role))) return false;
    var permKey = item.permKey;
    if (permKey) {
        if (!userPermissions[permKey] || !userPermissions[permKey].can_view) return false;
    } else if (item.roles) {
        if (!item.roles.includes(currentUser.role)) return false;
    }
    return true;
}

window._pageIntervals = window._pageIntervals || [];
window.registerPageInterval = function(intervalId) {
    window._pageIntervals.push(intervalId);
    return intervalId;
};
window.clearPageIntervals = function() {
    window._pageIntervals.forEach(id => {
        try { clearInterval(id); } catch(e) {}
    });
    window._pageIntervals = [];
};

window._loadScript = function(src) {
    return new Promise((resolve, reject) => {
        const baseSrc = src.split('?')[0];
        const s = document.createElement('script');
        s.src = baseSrc + '?_v=' + Date.now();
        s.onload = () => resolve(true);
        s.onerror = (e) => reject(e);
        document.head.appendChild(s);
    });
};

async function handleRoute() {
    // Clear all page-specific registered intervals/timers immediately
    window.clearPageIntervals();

    // Read page from pathname (e.g. /crm-nhu-cau → crm-nhu-cau)
    const pathname = window.location.pathname.replace(/^\//, '') || 'dashboard';

    if (pathname !== 'design-draft') {
        window._dhtFullPageMode = false;
        window._dhtFullPageContainer = null;
        if (window._tpdHeartbeatInterval) {
            clearInterval(window._tpdHeartbeatInterval);
            window._tpdHeartbeatInterval = null;
        }
    }

    if (pathname !== 'chuanbiqlx' && pathname !== 'congviecqlx') {
        if (window._qlxLockPollingInterval) {
            clearInterval(window._qlxLockPollingInterval);
            window._qlxLockPollingInterval = null;
        }
    }

    // Block tkaffiliate from dashboard — first 3 login sessions → guide, 4th+ → report
    // sessionStorage flag ensures redirect fires ONCE per login session (survives reload, clears on tab close)
    var _hdsdSessionKey = 'hdsd_done_' + (currentUser ? currentUser.id : '0');
    var _hdsdAlreadyDone = sessionStorage.getItem(_hdsdSessionKey);

    if ((pathname === 'dashboard' || pathname === 'bao-cao-hoa-hong-hv') && currentUser && currentUser.role === 'tkaffiliate'
        && !_hdsdAlreadyDone) {
        sessionStorage.setItem(_hdsdSessionKey, '1');
        var _hdsdCountKey = 'hdsd_login_count_' + currentUser.id;
        var _hdsdCount = parseInt(localStorage.getItem(_hdsdCountKey) || '0');
        if (_hdsdCount < 3) {
            localStorage.setItem(_hdsdCountKey, (_hdsdCount + 1).toString());
            currentPage = 'huong-dan-su-dung';
            history.replaceState({ page: currentPage }, '', '/huong-dan-su-dung');
        } else {
            currentPage = 'bao-cao-hoa-hong-hv';
            history.replaceState({ page: currentPage }, '', '/bao-cao-hoa-hong-hv');
        }
    } else if (pathname === 'dashboard' && currentUser) {
        // ★ Smart Default Page
        var _isDP = window.location.hostname.indexOf('dongphuchv.net') !== -1;
        if (_isDP) {
            // On dongphuchv.net partner portal: auto-redirect to first visible affiliate menu
            var _dpAllowed = ['tu-van-khach-aff', 'theo-doi-tu-van-aff', 'bao-cao-hoa-hong', 'rut-tien-affiliate', 'chuyen-so', 'quanlytkhethongaff', 'bao-cao-hoa-hong-hv', 'huong-dan-su-dung'];
            var _firstVisibleItem = null;
            for (var _mi = 0; _mi < MENU_CONFIG.length; _mi++) {
                var _item = MENU_CONFIG[_mi];
                if (_dpAllowed.indexOf(_item.id) === -1) continue;
                if (_item.strictRoles && !_item.roles.includes(currentUser.role)) continue;
                if (currentUser.role !== 'giam_doc') {
                    var _pk = _item.permKey;
                    if (_pk) {
                        if (!userPermissions[_pk] || !userPermissions[_pk].can_view) continue;
                    } else {
                        if (!_item.roles.includes(currentUser.role)) continue;
                    }
                }
                _firstVisibleItem = _item;
                break;
            }
            if (_firstVisibleItem && _firstVisibleItem.id !== 'dashboard') {
                currentPage = _firstVisibleItem.id;
                var _targetPath = _firstVisibleItem.href || ('/' + _firstVisibleItem.id);
                if (_firstVisibleItem.href) {
                    window.location.href = _firstVisibleItem.href;
                    return;
                }
                history.replaceState({ page: currentPage }, '', _targetPath);
            } else {
                currentPage = 'dashboard';
            }
        } else {
            // Main site: dashboard is always the default page
            currentPage = 'dashboard';
        }
    } else {
        currentPage = pathname;
    }

    // Normalize currentPage name using findMenuItemForPage (actual page mapping)
    var matchedItem = findMenuItemForPage(currentPage);
    if (matchedItem) {
        currentPage = matchedItem.id;
    }

    // Permission check for target page
    var targetMenuItem = findPermissionMenuItem(currentPage);
    if (targetMenuItem) {
        if (!hasMenuPermission(targetMenuItem)) {
            // Find the first menu item that this user HAS permission to view
            var firstAllowedItem = null;
            for (var mi = 0; mi < MENU_CONFIG.length; mi++) {
                var mItem = MENU_CONFIG[mi];
                if (hasMenuPermission(mItem)) {
                    firstAllowedItem = mItem;
                    break;
                }
            }

            if (firstAllowedItem) {
                var targetHref = firstAllowedItem.href || ('/' + firstAllowedItem.id);
                history.replaceState({ page: firstAllowedItem.id }, '', targetHref);
                currentPage = firstAllowedItem.id;
                targetMenuItem = firstAllowedItem;
            } else {
                const content = document.getElementById('contentArea');
                if (content) {
                    content.innerHTML = '<div style="text-align:center;padding:50px;color:#94a3b8;font-size:14px;font-weight:700;">🔒 Bạn không có quyền truy cập bất kỳ trang nào. Vui lòng liên hệ quản lý.</div>';
                }
                return;
            }
        }
    }

    // Update active menu
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === currentPage);
    });

    const pageTitleEl = document.getElementById('pageTitle');
    if (pageTitleEl) {
        const menuItem = targetMenuItem || matchedItem;
        pageTitleEl.textContent = menuItem ? ((typeof _dtPortal !== 'undefined' && typeof _dtItemLabels !== 'undefined' && _dtPortal && _dtItemLabels[menuItem.id]) || menuItem.label) : 'Dashboard';
    }

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
    const content = document.getElementById('contentArea') || document.getElementById('mainContent') || document.querySelector('.content-area') || document.querySelector('.main-content');

    // Show loading spinner immediately
    if (content) {
        content.innerHTML = '<div class="spa-loading"><div class="spa-spinner"></div><div class="spa-loading-text">Đang tải trang...</div></div>';
        if (typeof content.scrollTo === 'function') {
            content.scrollTo(0, 0);
        }
    }

    // Track current page for F5 detection (bangiao-khoa + lichsu-baocao)
    if (currentPage !== 'bangiao-khoa' && currentPage !== 'bangiaokhoa') {
        sessionStorage.setItem('_lk_lastPage', currentPage);
    }
    if (currentPage !== 'lich-su-bao-cao' && currentPage !== 'lichsubaocaocv') {
        sessionStorage.setItem('_rh_lastPage', currentPage);
    }
    if (currentPage !== 'quytrinhcuochop' && currentPage !== 'quy-trinh-cuoc-hop') {
        sessionStorage.setItem('_mp_lastPage', currentPage);
    }

    // Defer the script loading and actual rendering to let the skeleton paint immediately
    setTimeout(async () => {
        try {
            const cleanKey = currentPage.replace(/-/g, '').toLowerCase();
            if (cleanKey === 'trasoatdonhang' || cleanKey === 'lichradonhang') {
                await _loadScript('/js/pages/trasoat-modal.js');
            }
            if (cleanKey.startsWith('bangxephang') || cleanKey.startsWith('bxh')) {
                await _loadScript('/js/pages/bxh-template.js');
            }
            const scriptPath = _PAGE_SCRIPT_MAP[currentPage] || _PAGE_SCRIPT_MAP[cleanKey] || ('/js/pages/' + cleanKey + '.js');
            if (scriptPath) {
                try {
                    await _loadScript(scriptPath);
                } catch(e) {
                    console.warn('[LazyLoad] Auto-fallback script load notice:', currentPage, e.message);
                }
            }
            switch (currentPage) {
                case 'accounts': renderAccountsPage(content); break;
                case 'teams': renderTeamsPage(content); break;
                case 'permissions': renderPermissionsPage(content); break;
                case 'quan-ly-affiliate': renderQuanLyAffiliatePage(content); break;
                case 'settings': renderSettingsPage(content); break;
                case 'dashboard': renderDashboardPage(content); break;
                case 'chuyen-so': renderChuyenSoPage(content); break;
                case 'chuyensosale': renderChuyensosalePage(content); break;
                case 'caidatpancake': renderCaidatpancakePage(content); break;
                case 'tu-van-khach-aff': renderBaoCaoHoaHongPage(content, 'nhu_cau'); break;
                case 'theo-doi-tu-van-aff': renderBaoCaoHoaHongPage(content, 'ctv_hoa_hong'); break;
                case 'bao-cao-hoa-hong': case 'baocaohoahong': renderBaoCaoHoaHongPage(content); break;
                case 'crm-nhu-cau': renderCRMNhuCauPage(content); break;
                case 'crm-ctv': renderCRMCtvPage(content); break;
                case 'chamsockhsale': renderChamsockhsalePage(content); break;
                case 'chamsockhtempet': renderChamsockhtempetPage(content); break;
                case 'sokhachsale': renderSokhachsalePage(content); break;
                case 'cham-soc-affiliate': case 'chamsocaffiliate': renderCRMAffPage(content); break;
                case 'cham-soc-koc-kol': case 'chamsockockol': renderCRMKocKolPage(content); break;
                case 'chap-nhan-ctv-affiliate': case 'chapnhanctvaffliate': renderChapNhanCTVAffiliatePage(content); break;
                case 'cap-cuu-sep': renderEmergencyPage(content); break;
                case 'huy-khach': case 'huy-khach-hang': case 'huykhachhang': renderCancelPage(content); break;
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
                case 'quytacnuttuvancrmsale': case 'quytacnuttuvancrmtempet': renderQuyTacTuVanSalePage(content); break;
                case 'dailylinks': renderDailyLinksPage(content); break;
                case 'timgrzalovathongke': content.innerHTML=''; setTimeout(function(){if(typeof _zlInit==='function')_zlInit();},50); break;
                case 'hethongphanchiagrzalo': content.innerHTML=''; setTimeout(function(){if(typeof _zpInit==='function')_zpInit();},50); break;
                case 'addcmtdoitackh': content.innerHTML=''; setTimeout(function(){if(typeof _acInit==='function')_acInit();},50); break;
                case 'timkiemkhachhang': case 'timkiemkhachhanghv': renderTimKiemKhachHang(content); break;
                case 'ngansachmkt': case 'ngan-sach-mkt': renderNgansachmktPage(content); break;
                case 'muc-tieu-nam': case 'muctieunam': case 'm/muctieunam': if (typeof renderMucTieuNamPage === 'function') renderMucTieuNamPage(content); else if (typeof window.renderMucTieuNamPage === 'function') window.renderMucTieuNamPage(content); break;
                case 'bangcongviec': case 'bang-cong-viec': case 'bang_cong_viec': case 'bangcongviec/hoanthanh': case 'bang-cong-viec/hoan-thanh': case 'bang_cong_viec/hoan_thanh':
                    if (typeof window.renderBangcongviecPage === 'function') {
                        window.renderBangcongviecPage(content);
                    } else if (typeof renderBangcongviecPage === 'function') {
                        renderBangcongviecPage(content);
                    } else {
                        setTimeout(function() {
                            if (typeof window.renderBangcongviecPage === 'function') {
                                window.renderBangcongviecPage(content);
                            } else if (typeof renderBangcongviecPage === 'function') {
                                renderBangcongviecPage(content);
                            }
                        }, 150);
                    }
                    break;
                case 'xuatvathv': renderXuatvathvPage(content); break;
                case 'bo-phan-in': case 'bophanin': case 'bophaninhv': renderBophaninPage(content); break;
                case 'bo-phan-cat': case 'bophancat': case 'bophancathv': renderBophancatPage(content); break;
                case 'bo-phan-ep': case 'bophanep': case 'bophanephv': renderBophanepPage(content); break;
                case 'bo-phan-may': case 'bophanmay': case 'bophanmayhv': renderBophanmayPage(content); break;
                case 'bo-phan-hoan-thien': case 'bophanhoanthien': case 'bophanhoanthienhv': renderBophanhoanthienPage(content); break;
                case 'kpikdoanh': case 'kpi-kdoanh':
                    if (typeof window.renderKpikdoanhPage === 'function') {
                        window.renderKpikdoanhPage(content);
                    } else if (typeof renderKpikdoanhPage === 'function') {
                        renderKpikdoanhPage(content);
                    } else {
                        setTimeout(function() {
                            if (typeof window.renderKpikdoanhPage === 'function') {
                                window.renderKpikdoanhPage(content);
                            } else if (typeof renderKpikdoanhPage === 'function') {
                                renderKpikdoanhPage(content);
                            }
                        }, 150);
                    }
                    break;
                case 'kpitilechamdon': case 'kpi-tile-cham-don':
                    if (typeof window.renderKpitilechamdonPage === 'function') {
                        window.renderKpitilechamdonPage(content);
                    } else if (typeof renderKpitilechamdonPage === 'function') {
                        renderKpitilechamdonPage(content);
                    } else {
                        setTimeout(function() {
                            if (typeof window.renderKpitilechamdonPage === 'function') {
                                window.renderKpitilechamdonPage(content);
                            } else if (typeof renderKpitilechamdonPage === 'function') {
                                renderKpitilechamdonPage(content);
                            }
                        }, 150);
                    }
                    break;
                case 'kpisanxuathv': case 'kpi-san-xuat':
                    if (typeof window.renderKpisanxuathvPage === 'function') {
                        window.renderKpisanxuathvPage(content);
                    } else if (typeof renderKpisanxuathvPage === 'function') {
                        renderKpisanxuathvPage(content);
                    } else {
                        setTimeout(function() {
                            if (typeof window.renderKpisanxuathvPage === 'function') {
                                window.renderKpisanxuathvPage(content);
                            } else if (typeof renderKpisanxuathvPage === 'function') {
                                renderKpisanxuathvPage(content);
                            }
                        }, 150);
                    }
                    break;
                case 'kpisale': case 'kpi-sale':
                    if (typeof window.renderKpisalePage === 'function') {
                        window.renderKpisalePage(content);
                    } else if (typeof renderKpisalePage === 'function') {
                        renderKpisalePage(content);
                    } else {
                        setTimeout(function() {
                            if (typeof window.renderKpisalePage === 'function') {
                                window.renderKpisalePage(content);
                            } else if (typeof renderKpisalePage === 'function') {
                                renderKpisalePage(content);
                            }
                        }, 150);
                    }
                    break;
                case 'kpimarketing': case 'kpi-marketing':
                    if (typeof window.renderKpimarketingPage === 'function') {
                        window.renderKpimarketingPage(content);
                    } else if (typeof renderKpimarketingPage === 'function') {
                        renderKpimarketingPage(content);
                    } else {
                        setTimeout(function() {
                            if (typeof window.renderKpimarketingPage === 'function') {
                                window.renderKpimarketingPage(content);
                            } else if (typeof renderKpimarketingPage === 'function') {
                                renderKpimarketingPage(content);
                            }
                        }, 150);
                    }
                    break;
                case 'quytrinhcuochop': case 'quy-trinh-cuoc-hop':
                    if (typeof window.initQuyTrinhCuocHop === 'function') {
                        window.initQuyTrinhCuocHop(content);
                    }
                    break;
                case 'camketcuochop': case 'cam-ket-cuoc-hop':
                    if (typeof window.renderCamketcuochopPage === 'function') {
                        window.renderCamketcuochopPage(content);
                    } else if (typeof renderCamketcuochopPage === 'function') {
                        renderCamketcuochopPage(content);
                    }
                    break;
                case 'design-draft': case 'designdraft': renderDesignDraftPage(content); break;
                case 'noi-quy-cong-ty': case 'noiquycongtyhv': renderNoiquycongtyhvPage(content); break;
                case 'bosuutap': case 'bo-suu-tap':
                    if (typeof window.renderBosuutapPage === 'function') {
                        window.renderBosuutapPage(content);
                    } else if (typeof renderBosuutapPage === 'function') {
                        renderBosuutapPage(content);
                    } else {
                        setTimeout(function() {
                            if (typeof window.renderBosuutapPage === 'function') {
                                window.renderBosuutapPage(content);
                            } else if (typeof renderBosuutapPage === 'function') {
                                renderBosuutapPage(content);
                            }
                        }, 150);
                    }
                    break;
                case 'khoads': case 'kho-ads':
                    if (typeof window.renderKhoadsPage === 'function') {
                        window.renderKhoadsPage(content);
                    } else if (typeof renderKhoadsPage === 'function') {
                        renderKhoadsPage(content);
                    }
                    break;
                case 'caidattkads': case 'cai-dat-tai-khoan-ads': case 'caidattaikhoanads': case 'cai-dat-ads':
                    if (typeof window.renderCaidattaikhoanadsPage === 'function') {
                        window.renderCaidattaikhoanadsPage(content);
                    } else if (typeof renderCaidattaikhoanadsPage === 'function') {
                        renderCaidattaikhoanadsPage(content);
                    }
                    break;
                case 'chiendichads': case 'chien-dich-ads':
                    if (typeof window.renderChiendichadsPage === 'function') {
                        window.renderChiendichadsPage(content);
                    } else if (typeof renderChiendichadsPage === 'function') {
                        renderChiendichadsPage(content);
                    }
                    break;
                case 'gioihanchitieu': case 'gioi-han-chi-tieu': case 'm/gioihanchitieu': case 'm_gioihanchitieu':
                    if (typeof window.renderGioihanchitieuPage === 'function') {
                        window.renderGioihanchitieuPage(content);
                    } else if (typeof renderGioihanchitieuPage === 'function') {
                        renderGioihanchitieuPage(content);
                    }
                    break;
                case 'daotaosalekd': case 'xulydonloihv': case 'xu-ly-don-loi':
                    if (typeof window.renderXulydonloihvPage === 'function') {
                        window.renderXulydonloihvPage(content);
                    } else if (typeof renderXulydonloihvPage === 'function') {
                        renderXulydonloihvPage(content);
                    }
                    break;
                case 'quantrinhansuhv': case 'quan-tri-nhan-su':
                    if (typeof window.renderQuantrinhansuhvPage === 'function') {
                        window.renderQuantrinhansuhvPage(content);
                    } else if (typeof renderQuantrinhansuhvPage === 'function') {
                        renderQuantrinhansuhvPage(content);
                    }
                    break;
                case 'hopdongtuyendung': case 'hop-dong-tuyen-dung':
                    if (typeof window.renderHopdongtuyendungPage === 'function') {
                        window.renderHopdongtuyendungPage(content);
                    } else if (typeof renderHopdongtuyendungPage === 'function') {
                        renderHopdongtuyendungPage(content);
                    }
                    break;
                case 'hopdongkhachhang': case 'hop-dong-khach-hang':
                    if (typeof window.renderHopdongkhachhangPage === 'function') {
                        window.renderHopdongkhachhangPage(content);
                    } else if (typeof renderHopdongkhachhangPage === 'function') {
                        renderHopdongkhachhangPage(content);
                    }
                    break;
                case 'chammauthietke': case 'cham-mau-thiet-ke':
                    if (typeof window.renderChammauthietkePage === 'function') {
                        window.renderChammauthietkePage(content);
                    } else if (typeof renderChammauthietkePage === 'function') {
                        renderChammauthietkePage(content);
                    }
                    break;
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
        setTimeout(_globalRefreshBadges, 200);
    }, 0);
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

let _lastBadgeRefresh = 0;
let _badgeRefreshPromise = null;
async function _globalRefreshBadges() {
    const now = Date.now();
    if (now - _lastBadgeRefresh < 2000) {
        return _badgeRefreshPromise;
    }
    _lastBadgeRefresh = now;
    _badgeRefreshPromise = (async () => {
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
    })();
    return _badgeRefreshPromise;
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

async function syncMetaAdsFromDashboard(btnEl) {
    if (btnEl) {
        btnEl.disabled = true;
        btnEl.dataset.oldHtml = btnEl.innerHTML;
        btnEl.innerHTML = '⏳ Đang đồng bộ...';
        btnEl.style.opacity = '0.7';
    }

    try {
        const resAcc = await fetch('/api/thongkeads/accounts', { credentials: 'include' });
        const dataAcc = await resAcc.json();
        if (!dataAcc.ok || !dataAcc.accounts) throw new Error(dataAcc.error || 'Không lấy được danh sách tài khoản!');

        const fbAccs = dataAcc.accounts.filter(a => (a.platform || 'facebook') === 'facebook' && (a.is_active === undefined || a.is_active));
        if (fbAccs.length === 0) throw new Error('Không có tài khoản Meta Ads nào đang hoạt động!');

        const today = new Date();
        const twoDaysAgo = new Date(Date.now() - (2 * 86400000));
        const since = `${twoDaysAgo.getFullYear()}-${String(twoDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(twoDaysAgo.getDate()).padStart(2, '0')}`;
        const until = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        let totalSaved = 0;
        let errors = [];

        for (const acc of fbAccs) {
            try {
                const res = await fetch(`/api/thongkeads/accounts/${acc.id}/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ since, until })
                });
                const data = await res.json();
                if (!data.ok) throw new Error(data.error);
                if (data.result) totalSaved += (data.result.saved || 0);
            } catch(err) {
                errors.push(`${acc.account_name}: ${err.message}`);
            }
        }

        if (errors.length > 0 && fbAccs.length === 1) throw new Error(errors[0]);

        if (errors.length > 0) {
            alert(`⚠️ Đồng bộ hoàn tất với một số lưu ý:\n- Đã lưu: ${totalSaved} bản ghi\n- Lỗi (${errors.length} TK):\n${errors.join('\n')}`);
        } else {
            alert(`✅ Đồng bộ Meta Ads thành công ${fbAccs.length} tài khoản!\n- Tổng bản ghi đã lưu: ${totalSaved}`);
        }

        if (typeof _loadExecDashData === 'function') _loadExecDashData();
        if (typeof loadDashboardData === 'function') loadDashboardData();
    } catch(e) {
        alert(`❌ Lỗi đồng bộ Meta Ads: ${e.message}`);
    } finally {
        if (btnEl) {
            btnEl.disabled = false;
            btnEl.innerHTML = btnEl.dataset.oldHtml || '🔄 Đồng Bộ Từ Meta';
            btnEl.style.opacity = '1';
        }
    }
}
window.syncMetaAdsFromDashboard = syncMetaAdsFromDashboard;

function formatCurrency(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) return '0đ';
    return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + 'đ';
}

// ========== DASHBOARD GIÁM ĐỐC TỔNG QUAN ==========
let _dashPeriod = 'this_month';
let _execSegmentMode = 'dong_phuc'; // Default priority: Đồng Phục
let _dashData = null;
let _dashCharts = {};

function _setExecSegment(mode, btn) {
    if (!mode) return;
    _execSegmentMode = mode;
    window._execSegmentMode = mode;

    document.querySelectorAll('.exec-seg-pill, .modal-seg-pill').forEach(b => {
        const text = b.textContent || '';
        const bSeg = b.getAttribute('data-seg');
        if (bSeg === mode || 
           (mode === 'dong_phuc' && text.includes('Đồng Phục')) ||
           (mode === 'tem_pet' && (text.includes('Tem PET') || text.includes('TEM PET'))) ||
           (mode === 'tong' && (text.includes('Tất Cả') || text.includes('Tổng Công Ty')))) {
            b.classList.add('active');
            if (b.classList.contains('modal-seg-pill')) {
                b.style.background = '#2563eb';
                b.style.color = 'white';
                b.style.borderColor = '#2563eb';
                b.style.boxShadow = '0 2px 6px rgba(37,99,235,0.25)';
            }
        } else {
            b.classList.remove('active');
            if (b.classList.contains('modal-seg-pill')) {
                b.style.background = 'white';
                b.style.color = '#475569';
                b.style.borderColor = '#cbd5e1';
                b.style.boxShadow = 'none';
            }
        }
    });

    const segName = mode === 'dong_phuc' ? '👔 Đồng Phục' : (mode === 'tem_pet' ? '🏷️ TEM PET' : '🏢 Tất Cả');
    if (document.getElementById('mTrendSegmentLabel')) document.getElementById('mTrendSegmentLabel').innerText = segName;
    if (document.getElementById('mTrendSegmentLabel2')) document.getElementById('mTrendSegmentLabel2').innerText = segName;

    _loadExecDashData();
}
window._setExecSegment = _setExecSegment;
window.execSetModalSegment = _setExecSegment;

async function renderDashboardPage(container) {
    // Dynamic Chart.js loader if not present
    if (!window.Chart && !document.getElementById('chartjs-script')) {
        const s = document.createElement('script');
        s.id = 'chartjs-script';
        s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js';
        s.onload = () => {
            if (_dashData) {
                _updateTrendModeButtonsUI();
                _renderExecCharts();
            }
        };
        document.head.appendChild(s);
    }
    // Dynamic Inter font loader
    if (!document.getElementById('inter-font-link')) {
        const fontLink = document.createElement('link');
        fontLink.id = 'inter-font-link';
        fontLink.rel = 'stylesheet';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap';
        document.head.appendChild(fontLink);
    }

    container.innerHTML = `
        <style>
            .exec-dash-wrapper {
                font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                text-rendering: optimizeLegibility;
                color: #1e293b;
                max-width: 1440px;
                margin: 0 auto;
                padding: 4px;
            }
            .exec-banner {
                position: relative;
                background: linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 45%, #e0f2fe 100%);
                border-radius: 16px;
                padding: 22px 26px;
                color: #0f172a;
                margin-bottom: 20px;
                border: 1px solid rgba(199, 210, 254, 0.9);
                box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.15), 0 2px 6px rgba(0,0,0,0.04);
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 14px;
                overflow: hidden;
            }
            .exec-banner::before {
                content: '';
                position: absolute;
                top: 0; left: -100%;
                width: 60%; height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.65), transparent);
                transform: skewX(-25deg);
                animation: execShimmer 6s infinite;
                pointer-events: none;
            }
            @keyframes execShimmer {
                0% { left: -100%; }
                20% { left: 200%; }
                100% { left: 200%; }
            }
            .exec-banner-title {
                font-size: 22px;
                font-weight: 800;
                color: #1e1b4b;
                display: flex;
                align-items: center;
                gap: 12px;
                text-transform: uppercase;
                letter-spacing: -0.3px;
            }
            .exec-badge {
                background: linear-gradient(135deg, #4f46e5, #7c3aed);
                color: #ffffff;
                border: none;
                padding: 4px 14px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 800;
                letter-spacing: 0.5px;
                box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
            }
            .exec-btn-update {
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: #ffffff;
                border: none;
                padding: 10px 20px;
                border-radius: 12px;
                font-size: 13.5px;
                font-weight: 700;
                cursor: pointer;
                box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
                transition: all 0.2s ease;
            }
            .exec-btn-update:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
            }
            
            .exec-filter-bar {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
                margin-bottom: 20px;
                background: #ffffff;
                padding: 16px;
                border-radius: 12px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            }
            .exec-btn-pill {
                background: #f1f5f9;
                color: #1e1b4b;
                border: 1px solid #cbd5e1;
                padding: 9px 18px;
                border-radius: 8px;
                font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 13.5px;
                font-weight: 800;
                letter-spacing: -0.2px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .exec-btn-pill:hover {
                background: #e2e8f0;
                color: #0f172a;
            }
            .exec-btn-pill.active {
                background: #2563eb;
                color: #ffffff;
                border-color: #1d4ed8;
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
            }
            .exec-select {
                background: #ffffff;
                color: #1e1b4b;
                border: 1px solid #cbd5e1;
                padding: 8px 14px;
                border-radius: 8px;
                font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 13px;
                font-weight: 800;
                outline: none;
                cursor: pointer;
                transition: all 0.25s ease;
            }
            .exec-select.active {
                background: #2563eb !important;
                color: #ffffff !important;
                border-color: #1d4ed8 !important;
                box-shadow: 0 4px 14px rgba(37, 99, 235, 0.45) !important;
            }
            .exec-sparkle-badge {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
                border: 1.5px solid #818cf8;
                border-radius: 20px;
                padding: 5px 16px;
                font-size: 13.5px;
                font-weight: 800;
                color: #1e1b4b;
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
            }

            .exec-segment-bar {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
                margin-bottom: 20px;
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                padding: 14px 20px;
                border-radius: 12px;
                border: 1px solid #cbd5e1;
                box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            }
            .exec-seg-pill {
                background: #f1f5f9;
                color: #334155;
                border: 1px solid #cbd5e1;
                padding: 9px 20px;
                border-radius: 20px;
                font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 13.5px;
                font-weight: 800;
                cursor: pointer;
                transition: all 0.2s ease;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }
            .exec-seg-pill:hover {
                background: #e2e8f0;
                color: #0f172a;
            }
            .exec-seg-pill.active {
                background: linear-gradient(135deg, #2563eb, #1d4ed8);
                color: #ffffff;
                border-color: #1e40af;
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
            }

            .exec-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
            .exec-kpi-card { background: #ffffff; border-radius: 12px; padding: 18px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.06); transition: transform 0.15s ease; }
            .exec-kpi-title { font-size: 12.5px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.3px; display: flex; justify-content: space-between; align-items: center; }
            .exec-kpi-num { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 8px; line-height: 1.1; }
            .exec-kpi-sub { font-size: 11px; font-weight: 700; color: #64748b; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

            .exec-tabs {
                display: flex;
                gap: 8px;
                margin-bottom: 20px;
                border-bottom: 2px solid #e2e8f0;
                padding-bottom: 8px;
            }
            .exec-tab-item {
                background: #f1f5f9;
                border: 1px solid #cbd5e1;
                padding: 10px 20px;
                border-radius: 10px;
                font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                font-weight: 800;
                color: #1e1b4b;
                letter-spacing: -0.2px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .exec-tab-item:hover {
                background: #e2e8f0;
                color: #0f172a;
            }
            .exec-tab-item.active {
                background: #2563eb;
                color: #ffffff;
                border-color: #1d4ed8;
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
            }

            .exec-grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 16px; margin-bottom: 20px; }
            .exec-card-box { background: #ffffff; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
            .exec-card-title { font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; }

            .exec-chart-container { position: relative; width: 100%; height: 260px; }

            .exec-table { width: 100%; border-collapse: collapse; font-size: 13px; }
            .exec-table th { background: #f8fafc; color: #475569; font-weight: 700; text-align: left; padding: 10px 12px; border-bottom: 2px solid #e2e8f0; }
            .exec-table td { padding: 11px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
            
            .exec-badge-status { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; display: inline-block; }
            .st-chot_don { background: #dcfce7; color: #15803d; }
            .st-san_xuat { background: #dbeafe; color: #1d4ed8; }
            .st-giao_hang { background: #fef3c7; color: #b45309; }
            .st-hoan_thanh { background: #e0e7ff; color: #4338ca; }
            .st-huy { background: #fee2e2; color: #b91c1c; }

            @keyframes gentlePulseGlow {
                0%, 100% {
                    opacity: 1;
                    box-shadow: 0 2px 6px rgba(168, 85, 247, 0.2);
                    transform: scale(1);
                }
                50% {
                    opacity: 0.85;
                    box-shadow: 0 2px 14px rgba(168, 85, 247, 0.45);
                    transform: scale(1.02);
                }
            }
            @keyframes gentleTextGlow {
                0%, 100% {
                    opacity: 1;
                    filter: drop-shadow(0 0 0px transparent);
                }
                50% {
                    opacity: 0.80;
                    filter: drop-shadow(0 0 4px rgba(37, 99, 235, 0.5));
                }
            }
            .exec-mode-tag-pill-static {
                font-size: 12px;
                background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
                color: #1e40af;
                padding: 5px 16px;
                border-radius: 30px;
                font-weight: 800;
                border: 1.5px solid #3b82f6;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
                animation: gentlePulseGlow 3s infinite ease-in-out;
            }
            .exec-sub-tag-pulse {
                font-size: 11.5px;
                font-weight: 800;
                color: #1e40af;
                background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                border: 1px solid #93c5fd;
                padding: 3px 10px;
                border-radius: 20px;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                margin-left: 6px;
                box-shadow: 0 1px 4px rgba(37, 99, 235, 0.12);
                animation: gentlePulseGlow 3s infinite ease-in-out;
            }
        </style>

        <div class="exec-dash-wrapper">
            <div class="exec-banner">
                <div>
                    <div class="exec-banner-title">
                        <span>📊 Các Chỉ Số Tổng Quan Giám Đốc</span>
                        <span class="exec-badge">EXECUTIVE VIEW</span>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <button onclick="window.syncMetaAdsFromDashboard && window.syncMetaAdsFromDashboard(this)" class="exec-btn-update" style="background:linear-gradient(135deg, #059669, #10b981); border:none; box-shadow:0 4px 12px rgba(5,150,105,0.3);">
                        🔄 Đồng Bộ Từ Meta
                    </button>
                    <button onclick="_loadExecDashData()" class="exec-btn-update">
                        🔄 Cập nhật dữ liệu
                    </button>
                </div>
            </div>

            <!-- Segmented Control Bar (Bộ lọc mảng kinh doanh) -->
            <div class="exec-segment-bar">
                <span style="font-weight:800; font-size:13.5px; color:#0f172a; margin-right:6px; display:flex; align-items:center; gap:6px;">
                    🏷️ LỌC PHÂN KHÚC MẢNG:
                </span>
                <button class="exec-seg-pill active" data-seg="dong_phuc" onclick="_setExecSegment('dong_phuc', this)">👔 Đồng Phục (Ưu Tiên)</button>
                <button class="exec-seg-pill" data-seg="tong" onclick="_setExecSegment('tong', this)">🏢 Tất Cả (Tổng Công Ty)</button>
                <button class="exec-seg-pill" data-seg="tem_pet" onclick="_setExecSegment('tem_pet', this)">🏷️ Tem PET</button>
            </div>

            <!-- Filter Bar (Thời gian Streamlined) -->
            <div class="exec-filter-bar" style="display:flex; flex-direction:column; gap:10px; background:#ffffff; border:1px solid #cbd5e1; border-radius:12px; padding:12px 16px; box-shadow:0 1px 4px rgba(0,0,0,0.03);">
                <!-- Hàng 1: Nút Lọc Nhanh (Pills) -->
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <span style="font-weight:800; font-size:13px; color:#1e293b; margin-right:4px;">⏱️ BỘ LỌC THỜI GIAN:</span>
                    <button class="exec-btn-pill" onclick="_setExecPeriod('today', this)">Hôm nay</button>
                    <button class="exec-btn-pill" onclick="_setExecPeriod('yesterday', this)">Hôm qua</button>
                    <button class="exec-btn-pill" onclick="_setExecPeriod('first_10_days', this)">10 ngày đầu</button>
                    <button class="exec-btn-pill" onclick="_setExecPeriod('middle_10_days', this)">10 ngày giữa</button>
                    <button class="exec-btn-pill" onclick="_setExecPeriod('last_10_days', this)">10 ngày cuối</button>
                    <button class="exec-btn-pill active" onclick="_setExecPeriod('this_month', this)">Tháng này</button>
                </div>

                <!-- Hàng 2: Bộ Lọc Nâng Cao Tích Hợp (Smart Integrated Advanced Filters) -->
                <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; background:#f8fafc; padding:8px 12px; border-radius:10px; border:1px solid #e2e8f0;">
                    <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                        <span style="font-size:12px; font-weight:800; color:#475569;">⚡ Nâng cao:</span>
                        <select class="exec-select" id="execSelectSingleMonth" onchange="_setExecPeriod(this.value, this)" style="padding:4px 8px; font-size:12px;">
                            <option value="">-- Chọn 1 Tháng --</option>
                            <option value="month_2026-01">Tháng 1/2026</option>
                            <option value="month_2026-02">Tháng 2/2026</option>
                            <option value="month_2026-03">Tháng 3/2026</option>
                            <option value="month_2026-04">Tháng 4/2026</option>
                            <option value="month_2026-05">Tháng 5/2026</option>
                            <option value="month_2026-06">Tháng 6/2026</option>
                            <option value="month_2026-07">Tháng 7/2026</option>
                            <option value="month_2026-08">Tháng 8/2026</option>
                            <option value="month_2026-09">Tháng 9/2026</option>
                            <option value="month_2026-10">Tháng 10/2026</option>
                            <option value="month_2026-11">Tháng 11/2026</option>
                            <option value="month_2026-12">Tháng 12/2026</option>
                        </select>

                        <select class="exec-select" id="execSelectQuarter" onchange="_setExecPeriod(this.value, this)" style="padding:4px 8px; font-size:12px;">
                            <option value="">-- Chọn Quý --</option>
                            <option value="q1">Quý 1</option>
                            <option value="q2">Quý 2</option>
                            <option value="q3">Quý 3</option>
                            <option value="q4">Quý 4</option>
                        </select>

                        <select class="exec-select" id="execSelectYear" onchange="_setExecPeriod(this.value, this)" style="padding:4px 8px; font-size:12px;">
                            <option value="">-- Chọn Năm --</option>
                            <option value="year_2026">Năm 2026</option>
                            <option value="year_2025">Năm 2025</option>
                            <option value="year_2024">Năm 2024</option>
                        </select>
                    </div>

                    <div style="height:20px; width:1px; background:#cbd5e1; margin:0 2px;"></div>

                    <!-- Tab Switcher cho Khoảng Tự Chọn (Khoảng Tháng / Khoảng Ngày) -->
                    <div style="display:inline-flex; align-items:center; gap:6px; flex-wrap:wrap;">
                        <button type="button" id="btnToggleRangeMonth" onclick="execToggleCustomRangeMode('month')" style="padding:4px 10px; font-size:12px; font-weight:800; font-family:inherit; border-radius:8px; border:1px solid #2563eb; background:#2563eb; color:white; cursor:pointer; transition:all 0.2s;">🗓️ Khoảng Tháng</button>
                        <button type="button" id="btnToggleRangeDate" onclick="execToggleCustomRangeMode('date')" style="padding:4px 10px; font-size:12px; font-weight:800; font-family:inherit; border-radius:8px; border:1px solid #cbd5e1; background:#ffffff; color:#475569; cursor:pointer; transition:all 0.2s;">📅 Khoảng Ngày (Lịch)</button>

                        <!-- Box Khoảng Tháng -->
                        <div id="boxCustomMonthRange" style="display:inline-flex; align-items:center; gap:6px; background:#ffffff; padding:2px 8px; border-radius:8px; border:1px solid #cbd5e1;">
                            <span style="font-size:12px; font-weight:700; color:#334155;">Từ:</span>
                            <select class="exec-select" id="execRangeFromMonth" style="padding:3px 6px; font-size:12px;">
                                <option value="">-- Từ tháng --</option>
                                <option value="2026-01">T1/2026</option><option value="2026-02">T2/2026</option><option value="2026-03">T3/2026</option>
                                <option value="2026-04">T4/2026</option><option value="2026-05">T5/2026</option><option value="2026-06">T6/2026</option>
                                <option value="2026-07">T7/2026</option><option value="2026-08">T8/2026</option><option value="2026-09">T9/2026</option>
                                <option value="2026-10">T10/2026</option><option value="2026-11">T11/2026</option><option value="2026-12">T12/2026</option>
                            </select>
                            <span style="font-size:12px; font-weight:700; color:#334155;">Đến:</span>
                            <select class="exec-select" id="execRangeToMonth" style="padding:3px 6px; font-size:12px;">
                                <option value="">-- Đến tháng --</option>
                                <option value="2026-01">T1/2026</option><option value="2026-02">T2/2026</option><option value="2026-03">T3/2026</option>
                                <option value="2026-04">T4/2026</option><option value="2026-05">T5/2026</option><option value="2026-06">T6/2026</option>
                                <option value="2026-07">T7/2026</option><option value="2026-08">T8/2026</option><option value="2026-09">T9/2026</option>
                                <option value="2026-10">T10/2026</option><option value="2026-11">T11/2026</option><option value="2026-12">T12/2026</option>
                            </select>
                            <button class="exec-btn-pill" id="execBtnApplyMonthRange" style="padding:3px 10px; font-size:11.5px; background:#2563eb; color:#ffffff; border:none;" onclick="_applyExecMonthRange(this)">🚀 Lọc</button>
                        </div>

                        <!-- Box Khoảng Ngày (Lịch) -->
                        <div id="boxCustomDateRange" style="display:none; align-items:center; gap:6px; background:#ffffff; padding:2px 8px; border-radius:8px; border:1px solid #93c5fd;">
                            <span style="font-size:12px; font-weight:700; color:#334155;">Từ:</span>
                            <input type="date" id="execFilterFromDate" style="padding:2px 6px; font-size:12px; font-weight:700; border:1px solid #93c5fd; border-radius:6px; color:#0f172a; outline:none;" />
                            <span style="font-size:12px; font-weight:700; color:#334155;">Đến:</span>
                            <input type="date" id="execFilterToDate" style="padding:2px 6px; font-size:12px; font-weight:700; border:1px solid #93c5fd; border-radius:6px; color:#0f172a; outline:none;" />
                            <button class="exec-btn-pill" style="padding:3px 10px; font-size:11.5px; background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%); color:#ffffff; border:none;" onclick="execApplyDateRangeFilter()">🎯 Lọc</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SECTION 1: CHỈ SỐ TỔNG TOÀN CÔNG TY (ĐẶT Ở TRÊN) -->
            <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:16px; margin-bottom:20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display:flex; align-items:center; justify-content:space-between; font-weight:800; font-size:15px; color:#1e293b; margin-bottom:14px; padding-bottom:8px; border-bottom:2px solid #cbd5e1; flex-wrap:wrap; gap:10px;">
                    <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                        <span>🏛️ CHỈ SỐ TỔNG CÔNG TY (OVERALL PERFORMANCE)</span>
                        <div class="exec-sparkle-badge" style="background:linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border:1.5px solid #60a5fa; box-shadow:0 2px 8px rgba(37,99,235,0.12); padding:4px 14px; border-radius:30px; display:inline-flex; align-items:center; gap:6px;">
                            <span style="font-size:14px;">✨</span>
                            <span style="font-size:12px; font-weight:800; color:#1e3a8a;">ĐANG XEM DỮ LIỆU: <strong id="execPeriodLabel" style="color:#2563eb; text-transform:uppercase; font-size:13px; margin-left:3px;">THÁNG NÀY</strong></span>
                            <span id="execPeriodDateSub" style="font-size:11.5px; color:#475569; font-weight:700; margin-left:4px; background:white; padding:1px 8px; border-radius:10px; border:1px solid #93c5fd;"></span>
                        </div>
                    </div>
                    <span id="sec1ModeTag" class="exec-mode-tag-pill-static" style="border-color:#a855f7; color:#6b21a8; background:linear-gradient(135deg, #f3e8ff 0%, #faf5ff 100%);">[Đang hiển thị: 👔 Mảng Đồng Phục]</span>
                </div>
                <div class="exec-kpi-grid">
                    <div class="exec-kpi-card" style="border-top: 3px solid #16a34a; cursor: pointer;" onclick="execShowOrdersModal('current')">
                        <div class="exec-kpi-title">🎯 SỐ ĐƠN CHỐT</div>
                        <div class="exec-kpi-num" id="exOrders" style="color:#16a34a;">0 đơn</div>
                        <div class="exec-kpi-sub">(Loại trừ đơn Sửa & Gửi mẫu)</div>
                        <div id="exOrdersBreakdown" style="font-size:11.5px; font-weight:700; color:#475569; margin-top:8px; padding-top:8px; border-top:1px dashed #cbd5e1; display:flex; flex-direction:column; gap:4px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowOrdersModal('dp')">
                                <span>👔 Đồng Phục:</span>
                                <strong id="exDongPhucOrders" style="color:#2563eb;">0 đơn</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowOrdersModal('pettem')">
                                <span>🏷️ Tem PET:</span>
                                <strong id="exTemPetOrders" style="color:#7c3aed;">0 đơn</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; padding-top:2px; border-top:1px dotted #e2e8f0; cursor:pointer;" onclick="event.stopPropagation(); execShowOrdersModal('all')">
                                <span>🏢 Tổng Công Ty:</span>
                                <strong id="exTongOrders" style="color:#16a34a;">0 đơn</strong>
                            </div>
                        </div>
                    </div>
                    <div class="exec-kpi-card" style="border-top: 3px solid #0284c7; cursor: pointer;" onclick="execShowOrdersModal('current')">
                        <div class="exec-kpi-title">💵 DOANH SỐ CHỐT</div>
                        <div class="exec-kpi-num" id="exRevenueMktNum" style="color:#0284c7;">0đ</div>
                        <div class="exec-kpi-sub">(Loại trừ đơn Sửa & Gửi mẫu)</div>
                        <div id="exRevenueBreakdown" style="font-size:11.5px; font-weight:700; color:#475569; margin-top:8px; padding-top:8px; border-top:1px dashed #cbd5e1; display:flex; flex-direction:column; gap:4px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowOrdersModal('dp')">
                                <span>👔 Đồng Phục:</span>
                                <strong id="exDongPhucRev" style="color:#2563eb;">0đ</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowOrdersModal('pettem')">
                                <span>🏷️ Tem PET:</span>
                                <strong id="exTemPetRev" style="color:#7c3aed;">0đ</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; padding-top:2px; border-top:1px dotted #e2e8f0; cursor:pointer;" onclick="event.stopPropagation(); execShowOrdersModal('all')">
                                <span>🏢 Tổng Công Ty:</span>
                                <strong id="exTongRev" style="color:#0284c7;">0đ</strong>
                            </div>
                        </div>
                    </div>
                    <div class="exec-kpi-card" style="border-top: 3px solid #dc2626; cursor: pointer;" onclick="execShowMetricDetailModal('cpo', 'current')">
                        <div class="exec-kpi-title">🎯 GIÁ / ĐƠN (CPO)</div>
                        <div class="exec-kpi-num" id="exCPO" style="color:#dc2626;">0đ</div>
                        <div class="exec-kpi-sub">Chi phí thực tế / 1 đơn tổng</div>
                        <div id="exCPOBreakdown" style="font-size:11.5px; font-weight:700; color:#475569; margin-top:8px; padding-top:8px; border-top:1px dashed #cbd5e1; display:flex; flex-direction:column; gap:4px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('cpo', 'dp')">
                                <span>👔 Đồng Phục:</span>
                                <strong id="exDongPhucCPO" style="color:#2563eb;">0đ</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('cpo', 'pettem')">
                                <span>🏷️ Tem PET:</span>
                                <strong id="exTemPetCPO" style="color:#7c3aed;">0đ</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; padding-top:2px; border-top:1px dotted #e2e8f0; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('cpo', 'all')">
                                <span>🏢 Tổng Công Ty:</span>
                                <strong id="exTongCPO" style="color:#dc2626;">0đ</strong>
                            </div>
                        </div>
                    </div>
                    <div class="exec-kpi-card" style="border-top: 3px solid #4f46e5; cursor: pointer;" onclick="execShowMetricDetailModal('ratio', 'current')">
                        <div class="exec-kpi-title">📉 % CHI PHÍ / DT</div>
                        <div class="exec-kpi-num" id="exRatio" style="color:#4f46e5;">0%</div>
                        <div class="exec-kpi-sub">Tỷ lệ chi phí / Doanh thu tổng</div>
                        <div id="exRatioBreakdown" style="font-size:11.5px; font-weight:700; color:#475569; margin-top:8px; padding-top:8px; border-top:1px dashed #cbd5e1; display:flex; flex-direction:column; gap:4px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('ratio', 'dp')">
                                <span>👔 Đồng Phục:</span>
                                <strong id="exDongPhucRatio" style="color:#2563eb;">0%</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('ratio', 'pettem')">
                                <span>🏷️ Tem PET:</span>
                                <strong id="exTemPetRatio" style="color:#7c3aed;">0%</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; padding-top:2px; border-top:1px dotted #e2e8f0; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('ratio', 'all')">
                                <span>🏢 Tổng Công Ty:</span>
                                <strong id="exTongRatio" style="color:#4f46e5;">0%</strong>
                            </div>
                        </div>
                    </div>
                    <div class="exec-kpi-card" style="border-top: 3px solid #ea580c; cursor: pointer;" onclick="execShowMetricDetailModal('rate', 'current')">
                        <div class="exec-kpi-title">🎯 TỶ LỆ % CHỐT</div>
                        <div class="exec-kpi-num" id="exRate" style="color:#ea580c;">0%</div>
                        <div class="exec-kpi-sub">Tỷ lệ đơn tổng / Lead</div>
                        <div id="exRateBreakdown" style="font-size:11.5px; font-weight:700; color:#475569; margin-top:8px; padding-top:8px; border-top:1px dashed #cbd5e1; display:flex; flex-direction:column; gap:4px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('rate', 'dp')">
                                <span>👔 Đồng Phục:</span>
                                <strong id="exDongPhucRate" style="color:#2563eb;">0%</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('rate', 'pettem')">
                                <span>🏷️ Tem PET:</span>
                                <strong id="exTemPetRate" style="color:#7c3aed;">0%</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; padding-top:2px; border-top:1px dotted #e2e8f0; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('rate', 'all')">
                                <span>🏢 Tổng Công Ty:</span>
                                <strong id="exTongRate" style="color:#ea580c;">0%</strong>
                            </div>
                        </div>
                    </div>
                    <div class="exec-kpi-card" style="border-top: 3px solid #c026d3; cursor: pointer;" onclick="execShowMetricDetailModal('old_cust_rate', 'current')">
                        <div class="exec-kpi-title">🔄 TỶ LỆ % KHÁCH CŨ</div>
                        <div class="exec-kpi-num" id="exOldCustRateNum" style="color:#c026d3;">0%</div>
                        <div class="exec-kpi-sub">Tỷ lệ đơn Khách Cũ quay lại</div>
                        <div id="exOldCustRateBreakdown" style="font-size:11.5px; font-weight:700; color:#475569; margin-top:8px; padding-top:8px; border-top:1px dashed #cbd5e1; display:flex; flex-direction:column; gap:4px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('old_cust_rate', 'dp')">
                                <span>👔 Đồng Phục:</span>
                                <strong id="exDongPhucOldCustRate" style="color:#2563eb;">0%</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('old_cust_rate', 'pettem')">
                                <span>🏷️ Tem PET:</span>
                                <strong id="exTemPetOldCustRate" style="color:#7c3aed;">0%</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; padding-top:2px; border-top:1px dotted #e2e8f0; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('old_cust_rate', 'all')">
                                <span>🏢 Tổng Công Ty:</span>
                                <strong id="exTongOldCustRate" style="color:#c026d3;">0%</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SECTION 2: CHỈ SỐ QUẢNG CÁO MKT ADS (ĐẶT Ở DƯỚI) -->
            <div style="background:#faf5ff; border:1px solid #e9d5ff; border-radius:12px; padding:16px; margin-bottom:20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display:flex; align-items:center; justify-content:space-between; font-weight:800; font-size:15px; color:#581c87; margin-bottom:14px; padding-bottom:8px; border-bottom:2px solid #d8b4fe; flex-wrap:wrap; gap:8px;">
                    <span>📣 CHI PHÍ & HIỆU QUẢ QUẢNG CÁO ADS (MKT ADS PERFORMANCE)</span>
                    <span id="sec2ModeTag" class="exec-mode-tag-pill-static" style="border-color:#a855f7; color:#6b21a8; background:linear-gradient(135deg, #f3e8ff 0%, #faf5ff 100%);">[Đang hiển thị: 👔 Mảng Đồng Phục]</span>
                </div>
                <div class="exec-kpi-grid">
                    <div class="exec-kpi-card" style="border-top: 3px solid #16a34a; cursor: pointer;" onclick="execShowMktAdsOrdersModal('current')">
                        <div class="exec-kpi-title">🎯 SỐ ĐƠN ADS (MKT)</div>
                        <div class="exec-kpi-num" id="exMktAdsOrdersNum" style="color:#16a34a;">0 đơn</div>
                        <div class="exec-kpi-sub">(Đơn chốt từ Quảng cáo Ads)</div>
                        <div id="exMktAdsOrdersBreakdown" style="font-size:11.5px; font-weight:700; color:#475569; margin-top:8px; padding-top:8px; border-top:1px dashed #cbd5e1; display:flex; flex-direction:column; gap:4px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowMktAdsOrdersModal('dp')">
                                <span>👔 Đồng Phục:</span>
                                <strong id="exDongPhucMktOrders" style="color:#2563eb;">0 đơn</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowMktAdsOrdersModal('pettem')">
                                <span>🏷️ Tem PET:</span>
                                <strong id="exTemPetMktOrders" style="color:#7c3aed;">0 đơn</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; padding-top:2px; border-top:1px dotted #e2e8f0; cursor:pointer;" onclick="event.stopPropagation(); execShowMktAdsOrdersModal('all')">
                                <span>🏢 Tổng Công Ty:</span>
                                <strong id="exTongMktOrders" style="color:#16a34a;">0 đơn</strong>
                            </div>
                        </div>
                    </div>
                    <div class="exec-kpi-card" style="border-top: 3px solid #0284c7; cursor: pointer;" onclick="execShowMktAdsOrdersModal('current')">
                        <div class="exec-kpi-title">💵 DOANH SỐ ADS (MKT)</div>
                        <div class="exec-kpi-num" id="exMktAdsRevNum" style="color:#0284c7;">0đ</div>
                        <div class="exec-kpi-sub">(Doanh số từ Quảng cáo Ads)</div>
                        <div id="exMktAdsRevBreakdown" style="font-size:11.5px; font-weight:700; color:#475569; margin-top:8px; padding-top:8px; border-top:1px dashed #cbd5e1; display:flex; flex-direction:column; gap:4px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowMktAdsOrdersModal('dp')">
                                <span>👔 Đồng Phục:</span>
                                <strong id="exDongPhucMktRev" style="color:#2563eb;">0đ</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowMktAdsOrdersModal('pettem')">
                                <span>🏷️ Tem PET:</span>
                                <strong id="exTemPetMktRev" style="color:#7c3aed;">0đ</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; padding-top:2px; border-top:1px dotted #e2e8f0; cursor:pointer;" onclick="event.stopPropagation(); execShowMktAdsOrdersModal('all')">
                                <span>🏢 Tổng Công Ty:</span>
                                <strong id="exTongMktRev" style="color:#0284c7;">0đ</strong>
                            </div>
                        </div>
                    </div>
                    <div class="exec-kpi-card" style="border-top: 3px solid #e11d48; cursor: pointer;" onclick="execShowMetricDetailModal('cpo_ads', 'current')">
                        <div class="exec-kpi-title">🎯 GIÁ / ĐƠN ADS (CPO)</div>
                        <div class="exec-kpi-num" id="exCPOAdsNum" style="color:#e11d48;">0đ</div>
                        <div class="exec-kpi-sub">Chi phí thực tế / 1 đơn Ads</div>
                        <div id="exCPOAdsBreakdown" style="font-size:11.5px; font-weight:700; color:#475569; margin-top:8px; padding-top:8px; border-top:1px dashed #cbd5e1; display:flex; flex-direction:column; gap:4px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('cpo_ads', 'dp')">
                                <span>👔 Đồng Phục:</span>
                                <strong id="exDongPhucCPOAds" style="color:#2563eb;">0đ</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('cpo_ads', 'pettem')">
                                <span>🏷️ Tem PET:</span>
                                <strong id="exTemPetCPOAds" style="color:#7c3aed;">0đ</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; padding-top:2px; border-top:1px dotted #e2e8f0; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('cpo_ads', 'all')">
                                <span>🏢 Tổng Công Ty:</span>
                                <strong id="exTongCPOAds" style="color:#e11d48;">0đ</strong>
                            </div>
                        </div>
                    </div>
                    <div class="exec-kpi-card" style="border-top: 3px solid #4f46e5; cursor: pointer;" onclick="execShowMetricDetailModal('ratio_ads', 'current')">
                        <div class="exec-kpi-title">📉 % CHI PHÍ / DT ADS</div>
                        <div class="exec-kpi-num" id="exRatioAdsNum" style="color:#4f46e5;">0%</div>
                        <div class="exec-kpi-sub">Tỷ lệ chi phí QC / Doanh số Ads</div>
                        <div id="exRatioAdsBreakdown" style="font-size:11.5px; font-weight:700; color:#475569; margin-top:8px; padding-top:8px; border-top:1px dashed #cbd5e1; display:flex; flex-direction:column; gap:4px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('ratio_ads', 'dp')">
                                <span>👔 Đồng Phục:</span>
                                <strong id="exDongPhucRatioAds" style="color:#2563eb;">0%</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('ratio_ads', 'pettem')">
                                <span>🏷️ Tem PET:</span>
                                <strong id="exTemPetRatioAds" style="color:#7c3aed;">0%</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; padding-top:2px; border-top:1px dotted #e2e8f0; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('ratio_ads', 'all')">
                                <span>🏢 Tổng Công Ty:</span>
                                <strong id="exTongRatioAds" style="color:#4f46e5;">0%</strong>
                            </div>
                        </div>
                    </div>
                    <div class="exec-kpi-card" style="border-top: 3px solid #ea580c; cursor: pointer;" onclick="execShowMetricDetailModal('ads_rate', 'current')">
                        <div class="exec-kpi-title">🎯 TỶ LỆ % CHỐT ADS</div>
                        <div class="exec-kpi-num" id="exAdsRateNum" style="color:#ea580c;">0%</div>
                        <div class="exec-kpi-sub">Tỷ lệ đơn Ads / Lead MKT</div>
                        <div id="exAdsRateBreakdown" style="font-size:11.5px; font-weight:700; color:#475569; margin-top:8px; padding-top:8px; border-top:1px dashed #cbd5e1; display:flex; flex-direction:column; gap:4px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('ads_rate', 'dp')">
                                <span>👔 Đồng Phục:</span>
                                <strong id="exDongPhucAdsRate" style="color:#2563eb;">0%</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('ads_rate', 'pettem')">
                                <span>🏷️ Tem PET:</span>
                                <strong id="exTemPetAdsRate" style="color:#7c3aed;">0%</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; padding-top:2px; border-top:1px dotted #e2e8f0; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('ads_rate', 'all')">
                                <span>🏢 Tổng Công Ty:</span>
                                <strong id="exTongAdsRate" style="color:#ea580c;">0%</strong>
                            </div>
                        </div>
                    </div>
                    <div class="exec-kpi-card" style="border-top: 3px solid #7c3aed; cursor: pointer;" onclick="execShowMetricDetailModal('cpl', 'current')">
                        <div class="exec-kpi-title">📊 GIÁ ADS / LEAD (CPL)</div>
                        <div class="exec-kpi-num" id="exCPLNum" style="color:#7c3aed; font-size:20px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">0đ/lead</div>
                        <div class="exec-kpi-sub">Chi phí / 1 lead</div>
                        <div id="exCPLBreakdown" style="font-size:11.5px; font-weight:700; color:#475569; margin-top:8px; padding-top:8px; border-top:1px dashed #cbd5e1; display:flex; flex-direction:column; gap:4px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('cpl', 'dp')">
                                <span>👔 Đồng Phục:</span>
                                <strong id="exDongPhucCPL" style="color:#2563eb;">0đ/lead</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('cpl', 'pettem')">
                                <span>🏷️ Tem PET:</span>
                                <strong id="exTemPetCPL" style="color:#7c3aed;">0đ/lead</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; padding-top:2px; border-top:1px dotted #e2e8f0; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('cpl', 'all')">
                                <span>🏢 Tổng Công Ty:</span>
                                <strong id="exTongCPL" style="color:#7c3aed;">0đ/lead</strong>
                            </div>
                        </div>
                    </div>
                    <div class="exec-kpi-card" style="border-top: 3px solid #2563eb; cursor: pointer;" onclick="execShowMetricDetailModal('leads', 'current')">
                        <div class="exec-kpi-title">📥 SỐ LEAD (MKT)</div>
                        <div class="exec-kpi-num" id="exLeadNum" style="color:#2563eb; font-size:20px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">0 lead</div>
                        <div class="exec-kpi-sub">Tổng số lead thu về</div>
                        <div id="exLeadBreakdown" style="font-size:11.5px; font-weight:700; color:#475569; margin-top:8px; padding-top:8px; border-top:1px dashed #cbd5e1; display:flex; flex-direction:column; gap:4px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('leads', 'dp')">
                                <span>👔 Đồng Phục:</span>
                                <strong id="exDongPhucLeadCnt" style="color:#2563eb;">0 lead</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('leads', 'pettem')">
                                <span>🏷️ Tem PET:</span>
                                <strong id="exTemPetLeadCnt" style="color:#7c3aed;">0 lead</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; padding-top:2px; border-top:1px dotted #e2e8f0; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('leads', 'all')">
                                <span>🏢 Tổng Công Ty:</span>
                                <strong id="exTongLeadCnt" style="color:#2563eb;">0 lead</strong>
                            </div>
                        </div>
                    </div>
                    <div class="exec-kpi-card" style="border-top: 3px solid #d97706; cursor: pointer;" onclick="execShowMetricDetailModal('ad_spent', 'current')">
                        <div class="exec-kpi-title">📢 CHI PHÍ QUẢNG CÁO</div>
                        <div class="exec-kpi-num" id="exSpent" style="color:#d97706;">0đ</div>
                        <div class="exec-kpi-sub">Thực chi Marketing</div>
                        <div id="exSpentBreakdown" style="font-size:11.5px; font-weight:700; color:#475569; margin-top:8px; padding-top:8px; border-top:1px dashed #cbd5e1; display:flex; flex-direction:column; gap:4px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('ad_spent', 'dp')">
                                <span>👔 Đồng Phục:</span>
                                <strong id="exDongPhucSpent" style="color:#d97706;">0đ</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('ad_spent', 'pettem')">
                                <span>🏷️ Tem PET:</span>
                                <strong id="exTemPetSpent" style="color:#7c3aed;">0đ</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; padding-top:2px; border-top:1px dotted #e2e8f0; cursor:pointer;" onclick="event.stopPropagation(); execShowMetricDetailModal('ad_spent', 'all')">
                                <span>🏢 Tổng Công Ty:</span>
                                <strong id="exTongSpent" style="color:#d97706;">0đ</strong>
                            </div>
                        </div>
                    </div>
                </div>
            <!-- Executive View Switcher Tabs -->
            <div class="exec-tabs">
                <button class="exec-tab-item active" onclick="_switchExecTab('exTabOverview', this)">📊 Biểu Đồ & Overview</button>
                <button class="exec-tab-item" onclick="_switchExecTab('exTabMkt', this)">📢 Marketing Ads</button>
                <button class="exec-tab-item" onclick="_switchExecTab('exTabSale', this)">🛍️ KPI Phòng Sale</button>
                <button class="exec-tab-item" onclick="_switchExecTab('exTabKd', this)">💼 KPI Phòng Kinh Doanh</button>
            </div>

            <!-- Tab 1: Visual Charts -->
            <div id="exTabOverview" class="ex-tab-content">
                <!-- Sector Toolbar Inside Overview -->
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; background:#fff; border:1px solid #cbd5e1; border-radius:10px; padding:10px 16px; flex-wrap:wrap; gap:8px; box-shadow:0 1px 2px rgba(0,0,0,0.04);">
                    <span style="font-weight:800; font-size:13px; color:#0f172a; display:flex; align-items:center; gap:6px;">
                        🎯 CHỌN LĨNH VỰC LỌC DANH SÁCH & BIỂU ĐỒ:
                    </span>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="exec-seg-pill active" data-seg="dong_phuc" onclick="_setExecSegment('dong_phuc', this)">👔 Lĩnh Vực Đồng Phục</button>
                        <button class="exec-seg-pill" data-seg="tem_pet" onclick="_setExecSegment('tem_pet', this)">🏷️ Lĩnh Vực TEM PET</button>
                        <button class="exec-seg-pill" data-seg="tong" onclick="_setExecSegment('tong', this)">🏢 Tất Cả Công Ty</button>
                    </div>
                </div>

                <div class="exec-grid-2">
                    <!-- Chart 1: Revenue & Orders Trend -->
                    <div class="exec-card-box">
                        <div class="exec-card-title" id="exTitleTrend" style="display:flex; flex-direction:column; gap:10px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <span>📈 Xu Hướng Doanh Thu & Đơn Hàng</span>
                                    <button type="button" onclick="execOpenTrendExpandModal()" style="font-size:11.5px; font-weight:800; font-family:inherit; color:#2563eb; background:#eff6ff; border:1px solid #bfdbfe; padding:3px 10px; border-radius:20px; cursor:pointer; display:inline-flex; align-items:center; gap:4px; transition:all 0.2s; box-shadow:0 1px 3px rgba(37,99,235,0.1);" title="Mở rộng toàn màn hình để họp đội ngũ">
                                        🔍 Phóng To Họp Đội Ngũ
                                    </button>
                                </div>
                                <div style="display:inline-flex; background:#f1f5f9; padding:2px; border-radius:20px; border:1px solid #cbd5e1; gap:2px;">
                                    <button type="button" class="btn-trend-mode active" id="btnTrendRev" onclick="_execSetTrendMode('revenue', this)" style="padding:4px 12px; font-size:12px; font-weight:900; font-family:inherit; letter-spacing:-0.2px; border-radius:16px; border:none; background:#2563eb; color:white; cursor:pointer; transition:all 0.2s;">💵 Doanh Thu <span style="margin-left:4px; font-weight:900; background:rgba(255,255,255,0.28); border-radius:50%; width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; font-size:10px; line-height:1;">✖</span></button>
                                    <button type="button" class="btn-trend-mode active" id="btnTrendOrd" onclick="_execSetTrendMode('orders', this)" style="padding:4px 12px; font-size:12px; font-weight:900; font-family:inherit; letter-spacing:-0.2px; border-radius:16px; border:none; background:#16a34a; color:white; cursor:pointer; transition:all 0.2s;">📦 Số Đơn <span style="margin-left:4px; font-weight:900; background:rgba(255,255,255,0.28); border-radius:50%; width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; font-size:10px; line-height:1;">✖</span></button>
                                    <button type="button" class="btn-trend-mode active" id="btnTrendBoth" onclick="_execSetTrendMode('both', this)" style="padding:4px 12px; font-size:12px; font-weight:900; font-family:inherit; letter-spacing:-0.2px; border-radius:16px; border:none; background:#7c3aed; color:white; cursor:pointer; transition:all 0.2s;">✨ Cả Hai <span style="margin-left:4px; font-weight:900; background:rgba(255,255,255,0.28); border-radius:50%; width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; font-size:10px; line-height:1;">✖</span></button>
                                </div>
                            </div>
                            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px;">
                                <div style="display:flex; align-items:center; flex-wrap:wrap; gap:6px;">
                                    <span style="font-size:11px; font-weight:800; color:#581c87; text-transform:uppercase;">🎯 Hiệu Quả MKT & KH:</span>
                                    <div style="display:inline-flex; background:#f3e8ff; padding:3px; border-radius:20px; border:1.5px solid #d8b4fe; flex-wrap:wrap; gap:3px;">
                                        <button type="button" class="btn-trend-mode" id="btnTrendCpoMain" onclick="_execSetTrendMode('cpo', this)" style="padding:4px 10px; font-size:11.5px; font-weight:800; font-family:inherit; border-radius:16px; border:none; background:transparent; color:#3b0764; cursor:pointer; transition:all 0.2s;">🎯 Giá/Đơn (CPO)</button>
                                        <button type="button" class="btn-trend-mode" id="btnTrendCpoAdsMain" onclick="_execSetTrendMode('cpo_ads', this)" style="padding:4px 10px; font-size:11.5px; font-weight:800; font-family:inherit; border-radius:16px; border:none; background:transparent; color:#3b0764; cursor:pointer; transition:all 0.2s;">🎯 Giá/Đơn Ads</button>
                                        <button type="button" class="btn-trend-mode" id="btnTrendRateMain" onclick="_execSetTrendMode('close_rate', this)" style="padding:4px 10px; font-size:11.5px; font-weight:800; font-family:inherit; border-radius:16px; border:none; background:transparent; color:#3b0764; cursor:pointer; transition:all 0.2s;">🎯 % Chốt</button>
                                        <button type="button" class="btn-trend-mode" id="btnTrendAdsRateMain" onclick="_execSetTrendMode('ads_close_rate', this)" style="padding:4px 10px; font-size:11.5px; font-weight:800; font-family:inherit; border-radius:16px; border:none; background:transparent; color:#3b0764; cursor:pointer; transition:all 0.2s;">🎯 % Chốt Ads</button>
                                        <button type="button" class="btn-trend-mode" id="btnTrendOldCustMain" onclick="_execSetTrendMode('old_cust_rate', this)" style="padding:4px 10px; font-size:11.5px; font-weight:800; font-family:inherit; border-radius:16px; border:none; background:transparent; color:#3b0764; cursor:pointer; transition:all 0.2s;">🔄 % Khách Cũ</button>
                                    </div>
                                </div>
                                <div id="exTrendStatBadge" style="display:inline-flex; align-items:center; background:#eff6ff; border:1px solid #bfdbfe; color:#1e40af; font-size:12px; font-weight:800; padding:4px 12px; border-radius:20px; box-shadow:0 1px 2px rgba(30,64,175,0.08); transition:all 0.2s;">
                                    📌 Chỉ Số Cả Kỳ: --
                                </div>
                            </div>
                        </div>
                        <div class="exec-chart-container"><canvas id="exChartTrend"></canvas></div>
                    </div>
                    <!-- Chart 5: Top Sales Staff -->
                    <div class="exec-card-box">
                        <div class="exec-card-title" id="exTitleTopSales" style="cursor:pointer;" onclick="execShowOrdersModal(null, null, null, '🏆 Báo Cáo Doanh Thu Nhân Viên Bán Hàng')">🏆 Doanh Thu Theo Nhân Viên Bán Hàng 🔍</div>
                        <div class="exec-chart-container"><canvas id="exChartTopSales"></canvas></div>
                    </div>
                </div>

                <div class="exec-grid-2">
                    <!-- Chart 3: Top Products -->
                    <div class="exec-card-box">
                        <div class="exec-card-title" id="exTitleTopProd">🔥 Top Sản Phẩm Bán Chạy</div>
                        <div class="exec-chart-container"><canvas id="exChartTopProd"></canvas></div>
                    </div>
                    <!-- Chart 4: Top Customers -->
                    <div class="exec-card-box">
                        <div class="exec-card-title" id="exTitleTopCust" style="cursor:pointer;" onclick="execShowOrdersModal(null, null, null, '👑 Báo Cáo Top Khách Hàng Tiêu Biểu (VIP)')">👑 Top Khách Hàng Tiêu Biểu (VIP) 🔍</div>
                        <div class="exec-chart-container"><canvas id="exChartTopCust"></canvas></div>
                    </div>
                </div>

                <div class="exec-grid-2">
                    <!-- Chart 2: Order Statuses -->
                    <div class="exec-card-box">
                        <div class="exec-card-title" id="exTitleStatus" style="cursor:pointer;" onclick="execShowOrdersModal(null, null, null, '🍩 Chi Tiết Cơ Cấu Trạng Thái Đơn Hàng')">🍩 Cơ Cấu Trạng Thái Đơn Hàng 🔍</div>
                        <div class="exec-chart-container"><canvas id="exChartStatus"></canvas></div>
                    </div>
                    <!-- Recent Orders Table -->
                    <div class="exec-card-box">
                        <div class="exec-card-title" id="exTitleRecentOrders">📋 Đơn Hàng Gần Đây</div>
                        <div style="overflow-x:auto;">
                            <table class="exec-table">
                                <thead>
                                    <tr>
                                        <th>Mã đơn</th>
                                        <th>Khách hàng</th>
                                        <th>Nhân viên</th>
                                        <th>Tổng tiền</th>
                                        <th>Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody id="exTblRecentOrders">
                                    <tr><td colspan="5" style="text-align:center; color:#94a3b8;">Đang tải...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab 2: MKT Ads -->
            <div id="exTabMkt" class="ex-tab-content" style="display:none;">
                <div class="exec-card-box">
                    <div class="exec-card-title">📢 Chi Tiết Chỉ Số Marketing Ads</div>
                    <table class="exec-table">
                        <thead>
                            <tr>
                                <th>Chỉ số MKT</th>
                                <th>Thực tế</th>
                                <th>Đánh giá</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>Chi phí QC</td><td id="exMktSpent" style="font-weight:700;">0đ</td><td style="color:#059669; font-weight:600;">Hợp lệ</td></tr>
                            <tr><td>CPO (Giá/Đơn)</td><td id="exMktCPO" style="font-weight:700;">0đ</td><td style="color:#2563eb;">Tối ưu</td></tr>
                            <tr><td>% Chi phí/Doanh thu</td><td id="exMktRatio" style="font-weight:700;">0%</td><td style="color:#7c3aed;">Tốt</td></tr>
                            <tr><td>CPL (Giá/Lead)</td><td id="exMktCPL" style="font-weight:700;">0đ</td><td>Trung bình</td></tr>
                            <tr><td>Tỷ lệ chốt Data</td><td id="exMktRate" style="font-weight:700;">0%</td><td>Ổn định</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Tab 3: KPI Phòng Sale -->
            <div id="exTabSale" class="ex-tab-content" style="display:none;">
                <div class="exec-card-box">
                    <div class="exec-card-title">🛍️ Tổng Quan KPI Phòng Sale</div>
                    <div style="background:#f8fafc; padding:16px; border-radius:12px; margin-bottom:16px; border:1px solid #e2e8f0;">
                        <div style="display:flex; justify-content:space-between; font-weight:800; font-size:16px;">
                            <span>DT Thực Tế: <span id="exSaleRevActual" style="color:#059669;">0đ</span></span>
                            <span>Còn thiếu Mốc 1: <span id="exSaleRemainingM1" style="color:#dc2626;">0đ</span></span>
                        </div>
                    </div>
                    <table class="exec-table">
                        <thead>
                            <tr>
                                <th>Mốc KPI</th>
                                <th>Target Mục Tiêu</th>
                                <th>Mức Thưởng</th>
                                <th>Tỷ Lệ Đạt</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="font-weight:700;">KPI Mốc 1</td>
                                <td id="exSaleTargetM1" style="font-weight:700;">1.200.000.000đ</td>
                                <td id="exSaleBonusM1" style="color:#d97706; font-weight:700;">20.000.000đ</td>
                                <td id="exSaleCompM1" style="font-weight:700; color:#059669;">0%</td>
                            </tr>
                            <tr>
                                <td style="font-weight:700;">KPI Mốc 2 (120%)</td>
                                <td id="exSaleTargetM2" style="font-weight:700;">1.440.000.000đ</td>
                                <td id="exSaleBonusM2" style="color:#d97706; font-weight:700;">30.000.000đ</td>
                                <td id="exSaleCompM2" style="font-weight:700; color:#059669;">0%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Tab 4: KPI Phòng Kinh Doanh -->
            <div id="exTabKd" class="ex-tab-content" style="display:none;">
                <div class="exec-card-box">
                    <div class="exec-card-title">
                        <span>💼 Tổng Quan KPI Phòng Kinh Doanh</span>
                        <span style="font-size:13px; background:#dbeafe; color:#1e40af; padding:3px 10px; border-radius:12px; font-weight:700;">
                            ⏳ Còn <span id="exKdDaysLeft">0</span> ngày
                        </span>
                    </div>
                    <div style="background:#f8fafc; padding:16px; border-radius:12px; margin-bottom:16px; border:1px solid #e2e8f0;">
                        <div style="display:flex; justify-content:space-between; font-weight:800; font-size:16px;">
                            <span>DT Thực Thu: <span id="exKdRevActual" style="color:#059669;">0đ</span></span>
                            <span>Đã vượt Mốc 1: <span id="exKdExceededM1" style="color:#059669;">+0đ</span></span>
                        </div>
                    </div>
                    <table class="exec-table">
                        <thead>
                            <tr>
                                <th>Mốc KPI</th>
                                <th>Target Mục Tiêu</th>
                                <th>Tỷ Lệ Đạt</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="font-weight:700;">Mốc 1</td>
                                <td id="exKdTargetM1" style="font-weight:700;">25.000.000đ</td>
                                <td id="exKdCompM1" style="font-weight:700; color:#059669;">0%</td>
                            </tr>
                            <tr>
                                <td style="font-weight:700;">Mốc 120%</td>
                                <td id="exKdTargetM120" style="font-weight:700;">30.000.000đ</td>
                                <td id="exKdCompM120" style="font-weight:700; color:#059669;">0%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    _loadExecDashData();
}

function _updateExecMonthOptions(targetYear) {
    const yr = parseInt(targetYear) || new Date().getFullYear();

    const singleMonthSel = document.getElementById('execSelectSingleMonth');
    if (singleMonthSel) {
        const curVal = singleMonthSel.value;
        singleMonthSel.innerHTML = `<option value="">-- Chọn 1 Tháng (${yr}) --</option>` +
            Array.from({ length: 12 }, (_, i) => {
                const m = i + 1;
                const val = `month_${yr}-${String(m).padStart(2, '0')}`;
                return `<option value="${val}">Tháng ${m}/${yr}</option>`;
            }).join('');
        if (curVal && curVal.startsWith(`month_${yr}-`)) {
            singleMonthSel.value = curVal;
        }
    }

    const fromSel = document.getElementById('execRangeFromMonth');
    const toSel = document.getElementById('execRangeToMonth');
    if (fromSel && toSel) {
        const opts = Array.from({ length: 12 }, (_, i) => {
            const m = i + 1;
            const val = `${yr}-${String(m).padStart(2, '0')}`;
            return `<option value="${val}">T${m}/${yr}</option>`;
        }).join('');

        fromSel.innerHTML = opts;
        toSel.innerHTML = opts;

        fromSel.value = `${yr}-01`;
        toSel.value = `${yr}-12`;
    }
}
window._updateExecMonthOptions = _updateExecMonthOptions;

function _applyExecMonthRange(btn) {
    const fromVal = document.getElementById('execRangeFromMonth')?.value || '2026-01';
    const toVal = document.getElementById('execRangeToMonth')?.value || '2026-12';
    const period = `monthrange_${fromVal}_${toVal}`;

    document.querySelectorAll('.exec-btn-pill').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.exec-select').forEach(s => s.classList.remove('active'));
    
    const singleMonthSel = document.getElementById('execSelectSingleMonth');
    const selQ = document.getElementById('execSelectQuarter');
    const selY = document.getElementById('execSelectYear');
    if (singleMonthSel) singleMonthSel.value = '';
    if (selQ) selQ.value = '';

    // Auto-sync year select
    const yr = fromVal.split('-')[0];
    if (selY && yr) {
        selY.value = `year_${yr}`;
        selY.classList.add('active');
    }

    if (btn) btn.classList.add('active');

    _dashPeriod = period;
    _loadExecDashData();
}
window._applyExecMonthRange = _applyExecMonthRange;

function _setExecPeriod(period, element) {
    if (!period) return;
    _dashPeriod = period;

    document.querySelectorAll('.exec-btn-pill').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.exec-select').forEach(s => s.classList.remove('active'));

    const singleMonthSel = document.getElementById('execSelectSingleMonth');
    const selQ = document.getElementById('execSelectQuarter');
    const selY = document.getElementById('execSelectYear');
    const rangeBtn = document.getElementById('execBtnApplyMonthRange');

    if (element && element.tagName === 'BUTTON') {
        element.classList.add('active');
        if (singleMonthSel) singleMonthSel.value = '';
        if (selQ) selQ.value = '';
        if (selY) selY.value = '';
    } else if (element && element.tagName === 'SELECT') {
        element.classList.add('active');
        if (element.id === 'execSelectSingleMonth') {
            if (selQ) selQ.value = '';
            if (rangeBtn) rangeBtn.classList.remove('active');
            
            // Auto-sync year select when month is picked
            if (period.startsWith('month_')) {
                const yr = period.replace('month_', '').split('-')[0];
                if (selY && yr) {
                    selY.value = `year_${yr}`;
                    selY.classList.add('active');
                }
            }
        } else if (element.id === 'execSelectQuarter') {
            if (singleMonthSel) singleMonthSel.value = '';
            if (selY) selY.value = '';
            if (rangeBtn) rangeBtn.classList.remove('active');
        } else if (element.id === 'execSelectYear') {
            if (singleMonthSel) singleMonthSel.value = '';
            if (selQ) selQ.value = '';
            if (rangeBtn) rangeBtn.classList.remove('active');

            // Dynamically update Month selects to match selected Year!
            if (period.startsWith('year_')) {
                const yr = period.replace('year_', '');
                _updateExecMonthOptions(yr);
            }
        }
    }

    _loadExecDashData();
}

function _switchExecTab(tabId, btn) {
    document.querySelectorAll('.exec-tab-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.ex-tab-content').forEach(c => c.style.display = 'none');

    btn.classList.add('active');
    document.getElementById(tabId).style.display = 'block';
}

function _initExecYearAndMonthOptions() {
    const curYear = new Date().getFullYear();
    const selY = document.getElementById('execSelectYear');
    if (selY && (!selY.options || selY.options.length <= 1)) {
        let yearHtml = '<option value="">-- Chọn Năm --</option>';
        const startYr = curYear + 1;
        const endYr = 2024;
        for (let y = startYr; y >= endYr; y--) {
            yearHtml += `<option value="year_${y}">Năm ${y}</option>`;
        }
        selY.innerHTML = yearHtml;
    }

    const singleMonthSel = document.getElementById('execSelectSingleMonth');
    if (singleMonthSel && singleMonthSel.options.length <= 1) {
        _updateExecMonthOptions(curYear);
    }
}
window._initExecYearAndMonthOptions = _initExecYearAndMonthOptions;

async function _loadExecDashData() {
    try {
        _initExecYearAndMonthOptions();
        const mode = _execSegmentMode || window._execSegmentMode || 'dong_phuc';
        const response = await fetch(`/api/m/dashboard/summary?period=${encodeURIComponent(_dashPeriod)}&mode=${encodeURIComponent(mode)}`, { credentials: 'include' });
        if (response.status === 401 || response.status === 403) {
            window.location.href = '/index.html';
            return;
        }
        _dashData = await response.json();
        _renderExecDashboard();

        // If Modal is currently open, re-render Modal content immediately with new segment data!
        const modal = document.getElementById('exModalTrendExpand');
        if (modal && modal.style.display === 'block') {
            _renderExpandTrendModalContent();
        }
    } catch (err) {
        console.error('Error loading executive dashboard:', err);
    }
}

// --- KPI Orders Detail Modal Helper Functions ---
var _kpiModalOrders = _kpiModalOrders || [];
var _kpiModalFilterLv = _kpiModalFilterLv || 'all';
var _kpiModalFilterCust = _kpiModalFilterCust || 'all';
var _kpiModalFilterSale = _kpiModalFilterSale || 'all';

function kpiFmtFull(n) { return n != null ? Number(n).toLocaleString('vi-VN') : '-'; }

function _kpiCleanPhone(phone) {
    if (!phone || phone.startsWith('pancake_')) return '—';
    return phone;
}

function kpiCloseOrdersModal() {
    const modal = document.getElementById('kpiOrdersModal');
    if (modal) modal.style.display = 'none';
}
window.kpiCloseOrdersModal = kpiCloseOrdersModal;

function _kpiEnsureOrdersModal() {
    let modal = document.getElementById('kpiOrdersModal');
    if (modal) {
        modal.remove();
    }
    modal = document.createElement('div');
    modal.className = 'kpi-modal-overlay';
    modal.id = 'kpiOrdersModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,.6);z-index:99999!important;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);padding:20px';
    modal.innerHTML = `
        <div class="kpi-modal" style="background:#fff;border-radius:20px;width:1300px;max-width:95vw;max-height:90vh;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,.4);display:flex;flex-direction:column;padding:24px;color:#1e293b">
            <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:14px;margin-bottom:14px">
                <h3 style="font-size:16px;font-weight:800;color:#1e293b;margin:0;display:flex;align-items:center;gap:8px">📦 Chi Tiết Đơn Hàng — <span id="kpiOrdersModalTitle"></span></h3>
                <button type="button" onclick="kpiCloseOrdersModal()" style="background:#f1f5f9;border:none;color:#64748b;font-size:18px;font-weight:800;width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;transition:all .2s;flex-shrink:0" onmouseenter="this.style.background='#e2e8f0';this.style.color='#0f172a'" onmouseleave="this.style.background='#f1f5f9';this.style.color='#64748b'">✕</button>
            </div>
            <div id="kpiOrdersModalSummary" style="background:#f8fafc;padding:10px 14px;border-radius:10px;margin-bottom:12px;display:flex;align-items:center;gap:12px;font-size:12px;font-weight:700;flex-wrap:wrap"></div>
            <div style="max-height:60vh;overflow-y:auto">
                <table class="kpi-tbl" style="width:100%">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Mã đơn</th>
                            <th>Khách hàng</th>
                            <th>SĐT</th>
                            <th>NV Sale</th>
                            <th>Loại khách</th>
                            <th>Nguồn</th>
                            <th>Doanh số</th>
                            <th>Ngày chốt</th>
                        </tr>
                    </thead>
                    <tbody id="kpiOrdersModalBody"></tbody>
                </table>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

window.kpiFilterModalLv = function(lvType) {
    _kpiModalFilterLv = lvType;
    kpiApplyModalFilters();
};

window.kpiFilterModalCust = function(custType) {
    _kpiModalFilterCust = custType;
    kpiApplyModalFilters();
};

window.kpiFilterModalSale = function(saleVal) {
    _kpiModalFilterSale = saleVal;
    kpiApplyModalFilters();
};

function kpiBuildSaleOptionsHtml(orders) {
    if (!orders) return '<option value="all">Tất cả NV Sale</option>';
    const counts = {};
    orders.forEach(o => {
        const name = o.sale_name || 'Khác / Chưa gán';
        counts[name] = (counts[name] || 0) + 1;
    });
    const sortedNames = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    let optionsHtml = `<option value="all">Tất cả NV Sale (${orders.length} đơn)</option>`;
    sortedNames.forEach(name => {
        const isSel = _kpiModalFilterSale === name ? 'selected' : '';
        optionsHtml += `<option value="${name}" ${isSel}>${name} (${counts[name]} đơn)</option>`;
    });
    return optionsHtml;
}

function kpiApplyModalFilters() {
    const tbody = document.getElementById('kpiOrdersModalBody');
    if (!tbody || !_kpiModalOrders) return;

    document.querySelectorAll('.kpi-lv-btn').forEach(btn => {
        if (btn.getAttribute('data-lv') === _kpiModalFilterLv) {
            btn.style.outline = '2px solid #2563eb';
            btn.style.boxShadow = '0 2px 8px rgba(37,99,235,0.3)';
            btn.style.fontWeight = '800';
            btn.style.opacity = '1';
        } else {
            btn.style.outline = 'none';
            btn.style.boxShadow = 'none';
            btn.style.fontWeight = '600';
            btn.style.opacity = '0.75';
        }
    });

    // 1. Lĩnh Vực Filter
    let lvOrders = _kpiModalOrders;
    if (_kpiModalFilterLv === 'dp') {
        lvOrders = _kpiModalOrders.filter(o => !o.is_pet_tem);
    } else if (_kpiModalFilterLv === 'pettem') {
        lvOrders = _kpiModalOrders.filter(o => o.is_pet_tem);
    }

    // Dynamic update NV Sale dropdown options according to selected Lĩnh Vực
    const saleSel = document.getElementById('kpiModalFilterSaleSelect');
    if (saleSel) {
        const curSaleVal = _kpiModalFilterSale;
        saleSel.innerHTML = kpiBuildSaleOptionsHtml(lvOrders);
        if ([...saleSel.options].some(opt => opt.value === curSaleVal)) {
            saleSel.value = curSaleVal;
        } else {
            saleSel.value = 'all';
            _kpiModalFilterSale = 'all';
        }
    }

    // 2. NV Sale Filter
    let saleOrders = lvOrders;
    if (_kpiModalFilterSale && _kpiModalFilterSale !== 'all') {
        saleOrders = lvOrders.filter(o => (o.sale_name || 'Khác / Chưa gán') === _kpiModalFilterSale);
    }

    const countMoi = saleOrders.filter(o => o.customer_type === 'moi').length;
    const countCu = saleOrders.filter(o => o.customer_type === 'cu').length;

    const btnMoi = document.querySelector('.kpi-cust-btn[data-cust="moi"]');
    const btnCu = document.querySelector('.kpi-cust-btn[data-cust="cu"]');
    if (btnMoi) btnMoi.innerHTML = `🟢 Khách Mới (<strong style="color:#16a34a">${countMoi}</strong>)`;
    if (btnCu) btnCu.innerHTML = `🟧 Khách Cũ (<strong style="color:#b45309">${countCu}</strong>)`;

    document.querySelectorAll('.kpi-cust-btn').forEach(btn => {
        if (btn.getAttribute('data-cust') === _kpiModalFilterCust) {
            btn.style.outline = '2px solid #2563eb';
            btn.style.boxShadow = '0 2px 8px rgba(37,99,235,0.3)';
            btn.style.fontWeight = '800';
            btn.style.opacity = '1';
        } else {
            btn.style.outline = 'none';
            btn.style.boxShadow = 'none';
            btn.style.fontWeight = '600';
            btn.style.opacity = '0.75';
        }
    });

    // 3. Loại Khách Filter
    let filtered = saleOrders;
    if (_kpiModalFilterCust === 'moi') {
        filtered = filtered.filter(o => o.customer_type === 'moi');
    } else if (_kpiModalFilterCust === 'cu') {
        filtered = filtered.filter(o => o.customer_type === 'cu');
    }

    // 4. Customer Name Filter
    if (_kpiModalFilterCustomerName && _kpiModalFilterCustomerName !== 'all') {
        filtered = filtered.filter(o => (o.customer_name || '').trim().toLowerCase().includes(_kpiModalFilterCustomerName.toLowerCase()));
    }

    // 5. Status Code Filter
    if (typeof _kpiModalFilterStatusCode !== 'undefined' && _kpiModalFilterStatusCode && _kpiModalFilterStatusCode !== 'all') {
        if (_kpiModalFilterStatusCode === 'chot_don') {
            filtered = filtered.filter(o => o.customer_type === 'moi' || o.official_save_clicked || Number(o.revenue) > 0);
        } else if (_kpiModalFilterStatusCode === 'dat_coc') {
            filtered = filtered.filter(o => o.customer_type === 'cu' || Number(o.deposit_amount) > 0);
        } else {
            filtered = filtered.filter(o => (o.customer_type || '').toLowerCase() === _kpiModalFilterStatusCode.toLowerCase());
        }
    }

    const currentRevenue = filtered.reduce((acc, o) => acc + (Number(o.revenue) || 0), 0);
    const revEl = document.getElementById('kpiModalTotalRevenue');
    if (revEl) revEl.textContent = `${kpiFmtFull(currentRevenue)}đ`;

    const countEl = document.getElementById('kpiModalTotalOrdersCount');
    if (countEl) countEl.textContent = `${filtered.length} đơn`;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:24px;color:#94a3b8;font-weight:600">📭 Không có đơn hàng nào khớp bộ lọc đã chọn</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map((o, idx) => {
        let badgeHtml = o.customer_type === 'moi'
            ? '<span style="padding:2px 8px;border-radius:6px;font-size:11px;font-weight:800;background:#dcfce7;color:#15803d;border:1px solid #bbf7d0">🟢 Khách Mới</span>'
            : '<span style="padding:2px 8px;border-radius:6px;font-size:11px;font-weight:800;background:#fef3c7;color:#b45309;border:1px solid #fde68a">🟧 Khách Cũ</span>';

        return `
        <tr>
            <td style="text-align:center">${idx + 1}</td>
            <td style="font-weight:700;color:#2563eb">${o.order_code || '—'}</td>
            <td>${o.customer_name || '—'}</td>
            <td>${_kpiCleanPhone(o.customer_phone)}</td>
            <td style="font-weight:800;color:#1e1b4b">${o.sale_name || '—'}</td>
            <td style="text-align:center">${badgeHtml}</td>
            <td style="font-weight:600;color:#7c3aed">${o.source_name || '—'}</td>
            <td style="font-weight:800;color:#059669">${kpiFmtFull(o.revenue || 0)}đ</td>
            <td style="text-align:center">${o.created_at ? new Date(o.created_at).toLocaleDateString('vi-VN') : '—'}</td>
        </tr>
    `}).join('');
}

function kpiBuildModalSummaryHtml(s) {
    return `
    <div style="display:flex;flex-direction:column;gap:8px;width:100%">
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;flex-wrap:wrap">
            <span style="color:#475569;min-width:115px;display:flex;align-items:center;gap:4px">
                🏢 <strong>Lĩnh Vực:</strong>
            </span>
            <button type="button" class="kpi-lv-btn" data-lv="all" onclick="kpiFilterModalLv('all')" style="padding:4px 12px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-weight:700;font-size:12px;font-family:inherit;color:#1e293b">Tất cả lĩnh vực (<strong style="color:#2563eb">${s.total || 0}</strong>)</button>
            <button type="button" class="kpi-lv-btn" data-lv="dp" onclick="kpiFilterModalLv('dp')" style="padding:4px 12px;border-radius:8px;border:1px solid #fed7aa;background:#fff7ed;cursor:pointer;font-weight:700;font-size:12px;font-family:inherit;color:#c2410c">👔 LV Đồng Phục (<strong style="color:#c2410c">${s.total_lv_dp || 0}</strong>)</button>
            <button type="button" class="kpi-lv-btn" data-lv="pettem" onclick="kpiFilterModalLv('pettem')" style="padding:4px 12px;border-radius:8px;border:1px solid #fbcfe8;background:#fdf2f8;cursor:pointer;font-weight:700;font-size:12px;font-family:inherit;color:#be185d">🏷️ LV PET/TEM (<strong style="color:#be185d">${s.total_lv_pettem || 0}</strong>)</button>
        </div>
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;flex-wrap:wrap">
            <span style="color:#475569;min-width:115px;display:flex;align-items:center;gap:4px">
                👥 <strong>Loại Khách:</strong>
            </span>
            <button type="button" class="kpi-cust-btn" data-cust="all" onclick="kpiFilterModalCust('all')" style="padding:4px 12px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-weight:700;font-size:12px;font-family:inherit;color:#1e293b">Tất cả khách</button>
            <button type="button" class="kpi-cust-btn" data-cust="moi" onclick="kpiFilterModalCust('moi')" style="padding:4px 12px;border-radius:8px;border:1px solid #bbf7d0;background:#f0fdf4;cursor:pointer;font-weight:700;font-size:12px;font-family:inherit;color:#16a34a">🟢 Khách Mới (<strong style="color:#16a34a">${s.new_orders || 0}</strong>)</button>
            <button type="button" class="kpi-cust-btn" data-cust="cu" onclick="kpiFilterModalCust('cu')" style="padding:4px 12px;border-radius:8px;border:1px solid #fde68a;background:#fffbeb;cursor:pointer;font-weight:700;font-size:12px;font-family:inherit;color:#b45309">🟧 Khách Cũ (<strong style="color:#b45309">${s.old_orders || 0}</strong>)</button>
        </div>
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;flex-wrap:wrap">
            <span style="color:#475569;min-width:115px;display:flex;align-items:center;gap:4px">
                👤 <strong>NV Sale:</strong>
            </span>
            <select id="kpiModalFilterSaleSelect" onchange="kpiFilterModalSale(this.value)" style="padding:4px 12px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;font-weight:700;font-size:12px;font-family:inherit;color:#1e293b;cursor:pointer;outline:none">
                ${kpiBuildSaleOptionsHtml(_kpiModalOrders)}
            </select>

            <div style="margin-left:auto;display:flex;align-items:center;gap:10px">
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:4px 12px;border-radius:8px;font-size:12px;font-weight:800;color:#166534;box-shadow:0 1px 3px rgba(0,0,0,0.05);display:flex;align-items:center;gap:5px">
                    📦 <span>Số đơn:</span>
                    <strong id="kpiModalTotalOrdersCount" style="color:#15803d;font-size:13px;font-weight:800">${s.total || 0} đơn</strong>
                </div>
                <div style="background:#fef2f2;border:1px solid #fecaca;padding:4px 12px;border-radius:8px;font-size:12px;font-weight:800;color:#991b1b;box-shadow:0 1px 3px rgba(0,0,0,0.05);display:flex;align-items:center;gap:5px">
                    💰 <span>Tổng doanh số:</span>
                    <strong id="kpiModalTotalRevenue" style="color:#dc2626;font-size:13px;font-weight:800">${kpiFmtFull(s.total_revenue || 0)}đ</strong>
                </div>
            </div>
        </div>
    </div>
    `;
}
// --- Executive Custom Floating Tooltip Helper ---
function _execEnsureCustomTooltip() {
    let tooltip = document.getElementById('execCustomTooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'execCustomTooltip';
        tooltip.style.cssText = 'position:fixed;display:none;z-index:999999!important;pointer-events:none;background:#0f172a;color:#fff;padding:10px 14px;border-radius:10px;font-size:12px;font-family:inherit;box-shadow:0 10px 25px rgba(0,0,0,0.4);border:1px solid #3b82f6;max-width:420px;line-height:1.5;backdrop-filter:blur(4px)';
        document.body.appendChild(tooltip);
    }
    return tooltip;
}

function execShowHoverTooltip(e, text) {
    if (!text) return;
    const tooltip = _execEnsureCustomTooltip();
    tooltip.innerHTML = `
        <div style="font-size:11px;font-weight:800;color:#fbbf24;margin-bottom:4px;display:flex;align-items:center;gap:4px">
            💡 PHÉP TÍNH CHI TIẾT:
        </div>
        <div style="font-weight:600;color:#f8fafc">${text}</div>
    `;
    tooltip.style.display = 'block';
    execMoveHoverTooltip(e);
}

function execMoveHoverTooltip(e) {
    const tooltip = document.getElementById('execCustomTooltip');
    if (!tooltip || tooltip.style.display === 'none') return;
    const x = e.clientX + 14;
    const y = e.clientY + 14;
    
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    const rect = tooltip.getBoundingClientRect();

    let finalX = x;
    let finalY = y;
    if (x + rect.width > winWidth - 10) finalX = e.clientX - rect.width - 10;
    if (y + rect.height > winHeight - 10) finalY = e.clientY - rect.height - 10;

    tooltip.style.left = finalX + 'px';
    tooltip.style.top = finalY + 'px';
}

function execHideHoverTooltip() {
    const tooltip = document.getElementById('execCustomTooltip');
    if (tooltip) tooltip.style.display = 'none';
}

window.execShowHoverTooltip = execShowHoverTooltip;
window.execMoveHoverTooltip = execMoveHoverTooltip;
window.execHideHoverTooltip = execHideHoverTooltip;

// --- Executive KPI Metric Explanation Modal ---
var _metricModalCurrentKey = 'cpo';
var _metricModalCurrentLv = 'all';

function _execEnsureMetricModal() {
    let modal = document.getElementById('execMetricModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.className = 'exec-metric-modal-overlay';
    modal.id = 'execMetricModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,.65);z-index:99999!important;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);padding:20px';
    modal.innerHTML = `
        <div style="background:#fff;border-radius:20px;width:920px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,.4);display:flex;flex-direction:column;padding:24px;color:#1e293b;font-family:inherit">
            <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #e2e8f0;padding-bottom:14px;margin-bottom:16px">
                <h3 id="execMetricModalTitle" style="font-size:17px;font-weight:800;color:#0f172a;margin:0;display:flex;align-items:center;gap:8px"></h3>
                <button type="button" onclick="execCloseMetricModal()" style="background:#f1f5f9;border:none;color:#64748b;font-size:18px;font-weight:800;width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;transition:all .2s" onmouseenter="this.style.background='#e2e8f0';this.style.color='#0f172a'" onmouseleave="this.style.background='#f1f5f9';this.style.color='#64748b'">✕</button>
            </div>

            <!-- Segment Selector -->
            <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;margin-bottom:16px;flex-wrap:wrap;background:#f8fafc;padding:10px 14px;border-radius:10px;border:1px solid #e2e8f0">
                <span style="color:#475569;margin-right:4px">🏢 <strong>Ưu tiên mảng:</strong></span>
                <button type="button" class="exec-metric-lv-btn" data-lv="all" onclick="execSwitchMetricLv('all')" style="padding:5px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-weight:700;font-size:12px;font-family:inherit;color:#1e293b">🏢 Tất Cả (Tổng Công Ty)</button>
                <button type="button" class="exec-metric-lv-btn" data-lv="dp" onclick="execSwitchMetricLv('dp')" style="padding:5px 14px;border-radius:8px;border:1px solid #fed7aa;background:#fff7ed;cursor:pointer;font-weight:700;font-size:12px;font-family:inherit;color:#c2410c">👔 Mảng Đồng Phục</button>
                <button type="button" class="exec-metric-lv-btn" data-lv="pettem" onclick="execSwitchMetricLv('pettem')" style="padding:5px 14px;border-radius:8px;border:1px solid #fbcfe8;background:#fdf2f8;cursor:pointer;font-weight:700;font-size:12px;font-family:inherit;color:#be185d">🏷️ Mảng Tem PET</button>
            </div>

            <!-- Content Area -->
            <div id="execMetricModalBody"></div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

function execCloseMetricModal() {
    const modal = document.getElementById('execMetricModal');
    if (modal) modal.style.display = 'none';
}
window.execCloseMetricModal = execCloseMetricModal;

function execSwitchMetricLv(lv) {
    _metricModalCurrentLv = lv;
    execRenderMetricDetailContent();
}
window.execSwitchMetricLv = execSwitchMetricLv;

function execShowMetricDetailModal(metricKey, defaultLv) {
    _metricModalCurrentKey = metricKey;
    if (!defaultLv || defaultLv === 'current') {
        const segMode = typeof _execSegmentMode !== 'undefined' ? _execSegmentMode : 'dong_phuc';
        if (segMode === 'dong_phuc') defaultLv = 'dp';
        else if (segMode === 'tem_pet') defaultLv = 'pettem';
        else defaultLv = 'all';
    }
    _metricModalCurrentLv = defaultLv;

    const modal = _execEnsureMetricModal();
    modal.style.display = 'flex';
    execRenderMetricDetailContent();
}
window.execShowMetricDetailModal = execShowMetricDetailModal;

function execRenderMetricDetailContent() {
    const key = _metricModalCurrentKey;
    const lv = _metricModalCurrentLv;
    const mkt = (_dashData && _dashData.marketing) || {};
    const exec = (_dashData && _dashData.executive) || {};

    document.querySelectorAll('.exec-metric-lv-btn').forEach(btn => {
        if (btn.getAttribute('data-lv') === lv) {
            btn.style.outline = '2px solid #2563eb';
            btn.style.boxShadow = '0 2px 8px rgba(37,99,235,0.3)';
            btn.style.fontWeight = '800';
            btn.style.opacity = '1';
        } else {
            btn.style.outline = 'none';
            btn.style.boxShadow = 'none';
            btn.style.fontWeight = '600';
            btn.style.opacity = '0.75';
        }
    });

    const metricsDef = {
        cpo: {
            title: '🎯 CPO: GIÁ / ĐƠN (Chi Phí Quảng Cáo Để Ra 1 Đơn Tổng)',
            formulaDesc: 'Chi phí Marketing trung bình bỏ ra để thu về 1 đơn chốt thành công toàn hệ thống.',
            formulaMath: 'CPO = Tổng Chi Phí Quảng Cáo ÷ Tổng Số Đơn Chốt',
            unit: 'đ/đơn',
            getData: () => ({
                dp: { num: mkt.dong_phuc_spent || 0, den: exec.dong_phuc_orders || 0, val: mkt.dong_phuc_cpo || 0, numName: 'Chi phí QC Đồng phục', denName: 'Số đơn Đồng phục' },
                pettem: { num: mkt.tem_pet_spent || 0, den: exec.tem_pet_orders || 0, val: mkt.tem_pet_cpo || 0, numName: 'Chi phí QC Tem PET', denName: 'Số đơn Tem PET' },
                all: { num: mkt.spent_amount || 0, den: exec.total_orders || 0, val: mkt.cpo || 0, numName: 'Tổng chi phí QC Công ty', denName: 'Tổng số đơn Công ty' }
            }),
            formatVal: v => kpiFmtFull(v) + 'đ'
        },
        ratio: {
            title: '📊 % CHI PHÍ / DOANH THU (Tỷ Lệ Chi Phí QC / Doanh Số Tổng)',
            formulaDesc: 'Tỷ lệ phần trăm chi phí quảng cáo chiếm trên tổng doanh số chốt.',
            formulaMath: '% Chi Phí / DT = (Tổng Chi Phí QC ÷ Tổng Doanh Số Chốt) × 100%',
            unit: '%',
            getData: () => ({
                dp: { num: mkt.dong_phuc_spent || 0, den: exec.dong_phuc_revenue || 0, val: mkt.dong_phuc_cost_ratio || 0, numName: 'Chi phí QC Đồng phục', denName: 'Doanh số Đồng phục' },
                pettem: { num: mkt.tem_pet_spent || 0, den: exec.tem_pet_revenue || 0, val: mkt.tem_pet_cost_ratio || 0, numName: 'Chi phí QC Tem PET', denName: 'Doanh số Tem PET' },
                all: { num: mkt.spent_amount || 0, den: exec.total_revenue || 0, val: mkt.cost_ratio || 0, numName: 'Tổng chi phí QC Công ty', denName: 'Tổng doanh số Công ty' }
            }),
            formatVal: v => v + '%'
        },
        rate: {
            title: '📈 TỶ LỆ CHỐT TỔNG (Tỷ Lệ Chuyển Đổi Từng Data Khách)',
            formulaDesc: 'Tỷ lệ phần trăm cơ hội khách hàng (Lead) chuyển đổi thành đơn chốt thành công.',
            formulaMath: 'Tỷ Lệ Chốt = (Tổng Số Đơn Chốt ÷ Tổng Số Lead Marketing) × 100%',
            unit: '%',
            getData: () => ({
                dp: { num: exec.dong_phuc_orders || 0, den: mkt.dong_phuc_leads || 0, val: mkt.dong_phuc_close_rate || 0, numName: 'Số đơn Đồng phục', denName: 'Số Lead Đồng phục' },
                pettem: { num: exec.tem_pet_orders || 0, den: mkt.tem_pet_leads || 0, val: mkt.tem_pet_close_rate || 0, numName: 'Số đơn Tem PET', denName: 'Số Lead Tem PET' },
                all: { num: exec.total_orders || 0, den: mkt.lead_count || 0, val: mkt.close_rate || 0, numName: 'Tổng số đơn Công ty', denName: 'Tổng số Lead Công ty' }
            }),
            formatVal: v => v + '%'
        },
        old_cust_rate: {
            title: '👑 TỶ LỆ KHÁCH CŨ QUAY LẠI MUA TIẾP (Theo KPI P.Sale & P.Kinh Doanh)',
            formulaDesc: 'Tỷ lệ phần trăm khách hàng cũ trong tệp tích lũy phát sinh đơn quay lại mua tiếp trong kỳ.',
            formulaMath: 'Tỷ Lệ KH Cũ Quay Lại = (Số KH Cũ Quay Lại ÷ Tệp KH Cũ Đầu Kỳ) × 100%',
            unit: '%',
            getData: () => ({
                dp: { num: exec.dong_phuc_ret_cust || mkt.dong_phuc_ret_cust || 0, den: exec.dong_phuc_old_pool || mkt.dong_phuc_old_pool || 0, val: mkt.dong_phuc_old_cust_rate || 0, numName: 'Số KH cũ quay lại Đồng phục', denName: 'Tệp KH cũ tích lũy Đồng phục' },
                pettem: { num: exec.tem_pet_ret_cust || mkt.tem_pet_ret_cust || 0, den: exec.tem_pet_old_pool || mkt.tem_pet_old_pool || 0, val: mkt.tem_pet_old_cust_rate || 0, numName: 'Số KH cũ quay lại Tem PET', denName: 'Tệp KH cũ tích lũy Tem PET' },
                all: { num: exec.total_ret_cust || mkt.total_ret_cust || 0, den: exec.total_old_pool || mkt.total_old_pool || 0, val: mkt.old_customer_rate || 0, numName: 'Tổng số KH cũ quay lại Công ty', denName: 'Tổng tệp KH cũ tích lũy Công ty' }
            }),
            formatVal: v => v + '%'
        },
        cpo_ads: {
            title: '🏷️ CPO ADS: GIÁ / ĐƠN ADS (Chi Phí Quảng Cáo Cho 1 Đơn Nguồn Ads)',
            formulaDesc: 'Chi phí Marketing trung bình bỏ ra để có 1 đơn chốt trực tiếp từ Quảng cáo Ads.',
            formulaMath: 'CPO Ads = Tổng Chi Phí Quảng Cáo ÷ Số Đơn Chốt Nguồn Ads',
            unit: 'đ/đơn Ads',
            getData: () => ({
                dp: { num: mkt.dong_phuc_spent || 0, den: mkt.dong_phuc_mkt_ads_orders || 0, val: mkt.dong_phuc_cpo_ads || 0, numName: 'Chi phí QC Đồng phục', denName: 'Số đơn Ads Đồng phục' },
                pettem: { num: mkt.tem_pet_spent || 0, den: mkt.tem_pet_mkt_ads_orders || 0, val: mkt.tem_pet_cpo_ads || 0, numName: 'Chi phí QC Tem PET', denName: 'Số đơn Ads Tem PET' },
                all: { num: mkt.spent_amount || 0, den: mkt.mkt_ads_orders || 0, val: mkt.cpo_ads || 0, numName: 'Tổng chi phí QC Công ty', denName: 'Tổng số đơn Ads Công ty' }
            }),
            formatVal: v => kpiFmtFull(v) + 'đ'
        },
        ratio_ads: {
            title: '📉 % CHI PHÍ / DT ADS (Tỷ Lệ Chi Phí QC / Doanh Số Kênh Ads)',
            formulaDesc: 'Tỷ lệ phần trăm chi phí quảng cáo chiếm trên tổng doanh số thu được từ kênh Ads.',
            formulaMath: '% Chi Phí / DT Ads = (Tổng Chi Phí QC ÷ Doanh Số Ads) × 100%',
            unit: '%',
            getData: () => ({
                dp: { num: mkt.dong_phuc_spent || 0, den: mkt.dong_phuc_mkt_ads_revenue || 0, val: mkt.dong_phuc_cost_ratio_ads || 0, numName: 'Chi phí QC Đồng phục', denName: 'Doanh số Ads Đồng phục' },
                pettem: { num: mkt.tem_pet_spent || 0, den: mkt.tem_pet_mkt_ads_revenue || 0, val: mkt.tem_pet_cost_ratio_ads || 0, numName: 'Chi phí QC Tem PET', denName: 'Doanh số Ads Tem PET' },
                all: { num: mkt.spent_amount || 0, den: mkt.mkt_ads_revenue || 0, val: mkt.cost_ratio_ads || 0, numName: 'Tổng chi phí QC Công ty', denName: 'Doanh số Ads Công ty' }
            }),
            formatVal: v => v + '%'
        },
        ads_rate: {
            title: '📣 TỶ LỆ CHỐT ADS (Tỷ Lệ Đơn Ads Trên Lead MKT)',
            formulaDesc: 'Tỷ lệ chuyển đổi từ Lead Marketing thu về thành đơn hàng chốt từ kênh Ads.',
            formulaMath: 'Tỷ Lệ Chốt Ads = (Số Đơn Ads ÷ Tổng Số Lead Marketing) × 100%',
            unit: '%',
            getData: () => ({
                dp: { num: mkt.dong_phuc_mkt_ads_orders || 0, den: mkt.dong_phuc_leads || 0, val: mkt.dong_phuc_ads_close_rate || 0, numName: 'Số đơn Ads Đồng phục', denName: 'Số Lead Đồng phục' },
                pettem: { num: mkt.tem_pet_mkt_ads_orders || 0, den: mkt.tem_pet_leads || 0, val: mkt.tem_pet_ads_close_rate || 0, numName: 'Số đơn Ads Tem PET', denName: 'Số Lead Tem PET' },
                all: { num: mkt.mkt_ads_orders || 0, den: mkt.lead_count || 0, val: mkt.mkt_ads_close_rate || 0, numName: 'Tổng số đơn Ads', denName: 'Tổng số Lead MKT' }
            }),
            formatVal: v => v + '%'
        },
        ad_spent: {
            title: '📢 TỔNG CHI PHÍ QUẢNG CÁO (Thực Chi Marketing)',
            formulaDesc: 'Tổng số tiền đã chi trả thực tế cho các chiến dịch quảng cáo Marketing.',
            formulaMath: 'Tổng Chi Phí QC = Tổng Ngân Sách Thực Chi (FB, Google, TikTok...)',
            unit: 'đ',
            getData: () => ({
                dp: { num: mkt.dong_phuc_spent || 0, den: 1, val: mkt.dong_phuc_spent || 0, numName: 'Chi phí QC Đồng phục', denName: 'Mảng Đồng phục' },
                pettem: { num: mkt.tem_pet_spent || 0, den: 1, val: mkt.tem_pet_spent || 0, numName: 'Chi phí QC Tem PET', denName: 'Mảng Tem PET' },
                all: { num: mkt.spent_amount || 0, den: 1, val: mkt.spent_amount || 0, numName: 'Tổng chi phí QC Công ty', denName: 'Toàn Công ty' }
            }),
            formatVal: v => kpiFmtFull(v) + 'đ'
        },
        cpl: {
            title: '🎯 GIÁ CPL (MKT) (Chi Phí Thu Về 1 Lead Marketing)',
            formulaDesc: 'Số tiền trung bình phải bỏ ra để thu về 1 khách hàng tiềm năng (Lead).',
            formulaMath: 'Giá CPL = Tổng Chi Phí Quảng Cáo ÷ Tổng Số Lead Marketing',
            unit: 'đ/lead',
            getData: () => ({
                dp: { num: mkt.dong_phuc_spent || 0, den: mkt.dong_phuc_leads || 0, val: mkt.dong_phuc_cpl || 0, numName: 'Chi phí QC Đồng phục', denName: 'Số Lead Đồng phục' },
                pettem: { num: mkt.tem_pet_spent || 0, den: mkt.tem_pet_leads || 0, val: mkt.tem_pet_cpl || 0, numName: 'Chi phí QC Tem PET', denName: 'Số Lead Tem PET' },
                all: { num: mkt.spent_amount || 0, den: mkt.lead_count || 0, val: mkt.cpl || 0, numName: 'Tổng chi phí QC Công ty', denName: 'Tổng số Lead Công ty' }
            }),
            formatVal: v => kpiFmtFull(v) + 'đ/lead'
        },
        leads: {
            title: '📥 TỔNG SỐ LEAD MARKETING (Số Khách Hàng Tiềm Năng Thu Về)',
            formulaDesc: 'Tổng số lượt khách hàng quan tâm / liên hệ thu về từ các chiến dịch Marketing Quảng cáo.',
            formulaMath: 'Số Lead = Tổng Số Lead Đã Ghi Nhận Trong Kỳ',
            unit: 'lead',
            getData: () => ({
                dp: { num: mkt.dong_phuc_leads || 0, den: 1, val: mkt.dong_phuc_leads || 0, numName: 'Số Lead Đồng phục', denName: 'Mảng Đồng phục' },
                pettem: { num: mkt.tem_pet_leads || 0, den: 1, val: mkt.tem_pet_leads || 0, numName: 'Số Lead Tem PET', denName: 'Mảng Tem PET' },
                all: { num: mkt.lead_count || 0, den: 1, val: mkt.lead_count || 0, numName: 'Tổng số Lead Công ty', denName: 'Toàn Công ty' }
            }),
            formatVal: v => kpiFmtFull(v) + ' lead'
        }
    };

    const metric = metricsDef[key] || metricsDef['cpo'];
    const data = metric.getData();

    const titleEl = document.getElementById('execMetricModalTitle');
    if (titleEl) titleEl.innerHTML = metric.title;

    const bodyEl = document.getElementById('execMetricModalBody');
    if (!bodyEl) return;

    const renderCard = (mKey, mTitle, dObj, isSel) => {
        const bg = isSel ? 'background:#f0f9ff;border:2px solid #2563eb;box-shadow:0 4px 14px rgba(37,99,235,0.15)' : 'background:#fff;border:1px solid #cbd5e1';
        
        const formatCountOrMoney = (val, name) => {
            if (typeof val !== 'number') return val;
            const nameLower = (name || '').toLowerCase();
            const isMoney = nameLower.includes('chi phí') || nameLower.includes('doanh số') || nameLower.includes('giá') || nameLower.includes('tiền');
            if (isMoney) {
                return kpiFmtFull(val) + 'đ';
            }
            return kpiFmtFull(val);
        };

        const numStr = formatCountOrMoney(dObj.num, dObj.numName);
        const denStr = formatCountOrMoney(dObj.den, dObj.denName);

        let denDisplay = dObj.denName === 'Mảng Đồng phục' || dObj.denName === 'Mảng Tem PET' || dObj.denName === 'Toàn Công ty'
            ? `<div style="display:flex;justify-content:space-between;color:#475569"><span>📌 ${dObj.denName}:</span><strong style="color:#0f172a">Đã chọn</strong></div>`
            : `<div style="display:flex;justify-content:space-between;color:#475569"><span>📌 ${dObj.denName}:</span><strong style="color:#0f172a">${denStr}</strong></div>`;

        return `
        <div style="flex:1;min-width:260px;border-radius:14px;padding:16px;${bg};transition:all .2s">
            <div style="font-size:13px;font-weight:800;color:#1e293b;margin-bottom:10px;display:flex;align-items:center;gap:6px">
                ${mTitle} ${isSel ? '<span style="margin-left:auto;font-size:10px;background:#2563eb;color:#fff;padding:2px 8px;border-radius:10px">Đang xem</span>' : ''}
            </div>

            <div style="background:#f8fafc;padding:10px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:10px;font-size:12px">
                <div style="display:flex;justify-content:space-between;color:#475569;margin-bottom:4px">
                    <span>📌 ${dObj.numName}:</span>
                    <strong style="color:#0f172a">${numStr}</strong>
                </div>
                ${denDisplay}
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;padding-top:8px;border-top:1px dashed #cbd5e1">
                <span style="font-size:12px;font-weight:700;color:#475569">➔ Kết quả:</span>
                <strong style="font-size:15px;font-weight:800;color:#dc2626">${metric.formatVal(dObj.val)}</strong>
            </div>
        </div>
        `;
    };

    bodyEl.innerHTML = `
    <div style="background:linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);color:#fff;border-radius:14px;padding:18px;margin-bottom:16px;box-shadow:0 8px 20px rgba(30,27,75,0.25)">
        <div style="font-size:12px;color:#c7d2fe;font-weight:600;margin-bottom:6px">💡 Ý NGHĨA CHỈ SỐ</div>
        <div style="font-size:14px;font-weight:600;margin-bottom:12px;line-height:1.4">${metric.formulaDesc}</div>
        
        <div style="background:rgba(255,255,255,0.1);padding:10px 16px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);display:inline-block">
            <span style="font-size:11px;color:#a5b4fc;font-weight:700;display:block;margin-bottom:2px">📐 CÔNG THỨC CHUẨN:</span>
            <strong style="font-size:15px;color:#fbbf24;font-weight:800;letter-spacing:0.5px">${metric.formulaMath}</strong>
        </div>
    </div>

    <div style="font-size:13px;font-weight:800;color:#334155;margin-bottom:10px">
        📊 BÓC TÁCH CHI TIẾT DỮ LIỆU TÍNH TOÁN THEO LĨNH VỰC:
    </div>

    <div style="display:flex;gap:14px;flex-wrap:wrap">
        ${renderCard('dp', '👔 Mảng Đồng Phục', data.dp, lv === 'dp')}
        ${renderCard('pettem', '🏷️ Mảng Tem PET', data.pettem, lv === 'pettem')}
        ${renderCard('all', '🏢 Tất Cả (Tổng Công Ty)', data.all, lv === 'all')}
    </div>
    `;
}

async function execShowOrdersModal(defaultLvMode, preselectedSaleName, preselectedCustomerName, customTitle, preselectedStatusCode) {
    if (!defaultLvMode || defaultLvMode === 'current') {
        const segMode = typeof _execSegmentMode !== 'undefined' ? _execSegmentMode : 'dong_phuc';
        if (segMode === 'dong_phuc') defaultLvMode = 'dp';
        else if (segMode === 'tem_pet') defaultLvMode = 'pettem';
        else defaultLvMode = 'all';
    }

    const modal = typeof _kpiEnsureOrdersModal === 'function' ? _kpiEnsureOrdersModal() : null;
    if (!modal) return;

    const title = document.getElementById('kpiOrdersModalTitle');
    const summary = document.getElementById('kpiOrdersModalSummary');
    const tbody = document.getElementById('kpiOrdersModalBody');

    const periodLabel = document.getElementById('execPeriodLabel')?.innerText || 'Kỳ báo cáo';
    if (title) title.textContent = customTitle || `Executive View — ${periodLabel}`;
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:#94a3b8">⏳ Đang lấy chi tiết đơn hàng...</td></tr>';
    modal.style.display = 'flex';

    try {
        let queryStr = '';
        if (_dashData && _dashData.period) {
            const p = _dashData.period;
            const sDate = p.date_from || p.startDate;
            const eDate = p.date_to || p.endDate;
            if (sDate && eDate) {
                const s = String(sDate).trim().split(' ')[0];
                const e = String(eDate).trim().split(' ')[0];
                queryStr = `startDate=${encodeURIComponent(s)}&endDate=${encodeURIComponent(e)}`;
            } else if (p.month) {
                queryStr = `month=${encodeURIComponent(p.month)}`;
            } else if (p.year || p.key) {
                queryStr = `year=${encodeURIComponent(p.year || p.key)}`;
            }
        }
        if (!queryStr && typeof _dashPeriod !== 'undefined' && _dashPeriod) {
            if (_dashPeriod.startsWith('year_') || /^\d{4}$/.test(_dashPeriod)) {
                const yr = _dashPeriod.replace('year_', '');
                queryStr = `startDate=${yr}-01-01&endDate=${yr}-12-31`;
            } else {
                queryStr = `period=${encodeURIComponent(_dashPeriod)}`;
            }
        }
        if (!queryStr) {
            const now = new Date();
            queryStr = `month=${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }

        const res = await apiCall(`/api/kpi-kdoanh/company-orders?${queryStr}`);
        _kpiModalOrders = res.orders || [];
        _kpiModalFilterLv = defaultLvMode || 'all';
        _kpiModalFilterCust = 'all';
        _kpiModalFilterSale = preselectedSaleName || 'all';
        _kpiModalFilterCustomerName = preselectedCustomerName || 'all';
        _kpiModalFilterStatusCode = preselectedStatusCode || 'all';

        if (summary) {
            summary.innerHTML = kpiBuildModalSummaryHtml(res.summary || {});
        }

        kpiApplyModalFilters();
    } catch (err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:#ef4444">❌ Lỗi: ${err.message}</td></tr>`;
    }
}
window.execShowOrdersModal = execShowOrdersModal;

async function execShowMktAdsOrdersModal(defaultLvMode, preselectedSaleName, preselectedCustomerName, customTitle) {
    if (!defaultLvMode || defaultLvMode === 'current') {
        const segMode = typeof _execSegmentMode !== 'undefined' ? _execSegmentMode : 'dong_phuc';
        if (segMode === 'dong_phuc') defaultLvMode = 'dp';
        else if (segMode === 'tem_pet') defaultLvMode = 'pettem';
        else defaultLvMode = 'all';
    }

    let modal = document.getElementById('execMktAdsOrdersModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'execMktAdsOrdersModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:99999;display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:16px;width:1320px;max-width:96vw;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);overflow:hidden;font-family:Inter,Segoe UI,sans-serif;padding:24px;">
                <!-- Header -->
                <div style="border-bottom:2px solid #e2e8f0;padding-bottom:14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <div id="execMktOrdersModalTitle" style="font-size:18px;color:#0f172a;font-weight:800;display:flex;align-items:center;gap:8px;">📦 Danh Sách Đơn Hàng Marketing (First-Touch)</div>
                        <div id="execMktOrdersModalSub" style="font-size:12px;color:#64748b;margin-top:2px;font-weight:600;"></div>
                    </div>
                    <button style="cursor:pointer;background:#f1f5f9;border:none;width:32px;height:32px;border-radius:8px;font-weight:800;color:#64748b;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" onclick="document.getElementById('execMktAdsOrdersModal').style.display='none'">✕</button>
                </div>

                <!-- Rich Filter Bar (Image 1 Style) -->
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 18px;margin-bottom:14px;display:flex;flex-direction:column;gap:10px;">
                    <!-- Row 1: Lĩnh Vực Button Pills -->
                    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                        <span style="font-size:13px;font-weight:800;color:#334155;white-space:nowrap;display:flex;align-items:center;gap:4px;">🏢 Lĩnh Vực:</span>
                        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                            <button id="execMktBtnLvAll" style="padding:5px 14px;border-radius:20px;font-size:12.5px;font-weight:800;cursor:pointer;transition:all 0.2s;">
                                Tất cả lĩnh vực (<span id="execMktCntAll">0</span>)
                            </button>
                            <button id="execMktBtnLvDp" style="padding:5px 14px;border-radius:20px;font-size:12.5px;font-weight:800;cursor:pointer;transition:all 0.2s;">
                                👔 LV Đồng Phục (<span id="execMktCntDp">0</span>)
                            </button>
                            <button id="execMktBtnLvPet" style="padding:5px 14px;border-radius:20px;font-size:12.5px;font-weight:800;cursor:pointer;transition:all 0.2s;">
                                🏷️ LV PET/TEM (<span id="execMktCntPet">0</span>)
                            </button>
                        </div>
                    </div>

                    <!-- Row 2: Nguồn QC & NV Sale Dropdowns + Right Summary Badges -->
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding-top:8px;border-top:1px dashed #cbd5e1;">
                        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
                            <div style="display:flex;align-items:center;gap:6px;">
                                <span style="font-size:12.5px;font-weight:800;color:#334155;white-space:nowrap;display:flex;align-items:center;gap:4px;">🎯 Nguồn Quảng Cáo:</span>
                                <select id="execMktSourceSelect" style="padding:5px 12px;border-radius:8px;border:1.5px solid #cbd5e1;font-weight:700;font-size:12.5px;color:#0f172a;background:white;cursor:pointer;outline:none;box-shadow:0 2px 5px rgba(0,0,0,0.04);">
                                </select>
                            </div>
                            <div style="display:flex;align-items:center;gap:6px;">
                                <span style="font-size:12.5px;font-weight:800;color:#334155;white-space:nowrap;display:flex;align-items:center;gap:4px;">👤 NV Sale:</span>
                                <select id="execMktSaleSelect" style="padding:5px 12px;border-radius:8px;border:1.5px solid #cbd5e1;font-weight:700;font-size:12.5px;color:#0f172a;background:white;cursor:pointer;outline:none;box-shadow:0 2px 5px rgba(0,0,0,0.04);">
                                </select>
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:10px;font-size:13px;font-weight:800;">
                            <div style="background:#dcfce7;color:#15803d;padding:5px 14px;border-radius:20px;border:1px solid #bbf7d0;">
                                📦 Số đơn: <span id="execMktStatOrders">0 đơn</span>
                            </div>
                            <div style="background:#fef2f2;color:#b91c1c;padding:5px 14px;border-radius:20px;border:1px solid #fecaca;">
                                💰 Tổng doanh số: <span id="execMktStatRev">0đ</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Table Container -->
                <div id="execMktOrdersTableContainer" style="overflow-y:auto;max-height:65vh;border-radius:12px;border:1px solid #e2e8f0;">
                    <div style="text-align:center;padding:40px;color:#64748b;font-weight:700;">
                        ⏳ Đang truy vấn danh sách đơn hàng Marketing...
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const titleEl = modal.querySelector('#execMktOrdersModalTitle');
    const subEl = modal.querySelector('#execMktOrdersModalSub');
    const tableEl = modal.querySelector('#execMktOrdersTableContainer');

    if (titleEl) {
        titleEl.textContent = customTitle || '📦 Danh Sách Đơn Hàng Marketing (First-Touch)';
    }

    modal.style.display = 'flex';
    if (tableEl) tableEl.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b;font-weight:700;">⏳ Đang tải danh sách đơn hàng chốt thành công từ Quảng Cáo...</div>';

    try {
        let queryParams = [];
        if (_dashData && _dashData.period) {
            const p = _dashData.period;
            const sDate = p.date_from || p.startDate;
            const eDate = p.date_to || p.endDate;
            if (sDate && eDate) {
                const s = String(sDate).trim().split(' ')[0];
                const e = String(eDate).trim().split(' ')[0];
                queryParams.push(`startDate=${encodeURIComponent(s)}`);
                queryParams.push(`endDate=${encodeURIComponent(e)}`);
            } else if (p.month) {
                const [y, m] = p.month.split('-');
                queryParams.push(`year=${y}`);
                queryParams.push(`month=${parseInt(m, 10)}`);
            } else if (p.year || p.key) {
                queryParams.push(`year=${encodeURIComponent(p.year || p.key)}`);
            }
        }
        if (queryParams.length === 0 && typeof _dashPeriod !== 'undefined' && _dashPeriod) {
            if (_dashPeriod.startsWith('year_') || /^\d{4}$/.test(_dashPeriod)) {
                const yr = _dashPeriod.replace('year_', '');
                queryParams.push(`startDate=${yr}-01-01`);
                queryParams.push(`endDate=${yr}-12-31`);
            } else {
                queryParams.push(`period=${encodeURIComponent(_dashPeriod)}`);
            }
        }
        if (queryParams.length === 0) {
            const now = new Date();
            queryParams.push(`year=${now.getFullYear()}`);
            queryParams.push(`month=${now.getMonth() + 1}`);
        }
        queryParams.push('mkt_mode=all');

        const url = `/api/marketing-budgets/first-touch-orders?${queryParams.join('&')}`;
        const res = await apiCall(url);

        if (res.success && Array.isArray(res.orders)) {
            const rawOrders = res.orders;
            const periodTxt = document.getElementById('execPeriodLabel')?.innerText || 'Kỳ báo cáo';

            if (subEl) {
                subEl.textContent = `Báo cáo Đơn hàng First-Touch • ${periodTxt}`;
            }

            if (rawOrders.length === 0) {
                if (tableEl) tableEl.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:14px;font-weight:600;">📭 Chưa có đơn hàng Marketing nào được ghi nhận cho kỳ đang chọn.</div>';
                return;
            }

            // Filter state variables
            let selectedLv = defaultLvMode || 'all';
            let selectedSource = 'all';
            let selectedSale = preselectedSaleName || 'all';
            let selectedCustomer = preselectedCustomerName || 'all';

            // Counts for Lĩnh vực buttons
            const cntDp = rawOrders.filter(o => {
                const code = (o.order_code || '').toUpperCase();
                return !code.includes('GCPET') && !code.includes('GCTEM') && !code.includes('PET') && !code.includes('TEM');
            }).length;
            const cntPet = rawOrders.filter(o => {
                const code = (o.order_code || '').toUpperCase();
                return code.includes('GCPET') || code.includes('GCTEM') || code.includes('PET') || code.includes('TEM');
            }).length;
            const cntAll = rawOrders.length;

            const cntAllEl = document.getElementById('execMktCntAll');
            const cntDpEl = document.getElementById('execMktCntDp');
            const cntPetEl = document.getElementById('execMktCntPet');
            if (cntAllEl) cntAllEl.textContent = cntAll;
            if (cntDpEl) cntDpEl.textContent = cntDp;
            if (cntPetEl) cntPetEl.textContent = cntPet;

            const btnAll = document.getElementById('execMktBtnLvAll');
            const btnDp = document.getElementById('execMktBtnLvDp');
            const btnPet = document.getElementById('execMktBtnLvPet');

            const basePillStyle = 'font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:13px;font-weight:700;padding:6px 16px;border-radius:9999px;cursor:pointer;transition:all 0.2s;letter-spacing:-0.01em;display:inline-flex;align-items:center;gap:6px;';

            function updateLvButtonStyles() {
                if (btnAll) {
                    if (selectedLv === 'all') {
                        btnAll.style.cssText = basePillStyle + 'border:2px solid #2563eb;background:#2563eb;color:#ffffff;box-shadow:0 3px 8px rgba(37,99,235,0.3);';
                    } else {
                        btnAll.style.cssText = basePillStyle + 'border:1.5px solid #cbd5e1;background:#ffffff;color:#334155;box-shadow:none;';
                    }
                }
                if (btnDp) {
                    if (selectedLv === 'dp') {
                        btnDp.style.cssText = basePillStyle + 'border:2px solid #1d4ed8;background:linear-gradient(135deg,#2563eb,#3b82f6);color:#ffffff;box-shadow:0 3px 8px rgba(37,99,235,0.3);';
                    } else {
                        btnDp.style.cssText = basePillStyle + 'border:1.5px solid #cbd5e1;background:#ffffff;color:#334155;box-shadow:none;';
                    }
                }
                if (btnPet) {
                    if (selectedLv === 'pettem') {
                        btnPet.style.cssText = basePillStyle + 'border:2px solid #be185d;background:linear-gradient(135deg,#d946ef,#ec4899);color:#ffffff;box-shadow:0 3px 8px rgba(217,70,239,0.3);';
                    } else {
                        btnPet.style.cssText = basePillStyle + 'border:1.5px solid #cbd5e1;background:#ffffff;color:#334155;box-shadow:none;';
                    }
                }
            }

            if (btnAll) btnAll.onclick = () => { selectedLv = 'all'; updateLvButtonStyles(); populateDropdowns(); renderFilteredData(); };
            if (btnDp) btnDp.onclick = () => { selectedLv = 'dp'; updateLvButtonStyles(); populateDropdowns(); renderFilteredData(); };
            if (btnPet) btnPet.onclick = () => { selectedLv = 'pettem'; updateLvButtonStyles(); populateDropdowns(); renderFilteredData(); };

            updateLvButtonStyles();

            // Populate Nguồn QC & NV Sale dropdowns based on current Lĩnh vực
            function populateDropdowns() {
                let lvOrders = rawOrders;
                if (selectedLv === 'dp') {
                    lvOrders = rawOrders.filter(o => {
                        const code = (o.order_code || '').toUpperCase();
                        return !code.includes('GCPET') && !code.includes('GCTEM') && !code.includes('PET') && !code.includes('TEM');
                    });
                } else if (selectedLv === 'pettem') {
                    lvOrders = rawOrders.filter(o => {
                        const code = (o.order_code || '').toUpperCase();
                        return code.includes('GCPET') || code.includes('GCTEM') || code.includes('PET') || code.includes('TEM');
                    });
                }

                // Sources
                const uniqueSources = Array.from(new Set(lvOrders.map(o => (o.source || '').trim()).filter(Boolean))).sort();
                const sourceSelect = document.getElementById('execMktSourceSelect');
                if (sourceSelect) {
                    let optHtml = `<option value="all">🌐 Tất cả nguồn (${lvOrders.length} đơn)</option>`;
                    uniqueSources.forEach(s => {
                        const c = lvOrders.filter(o => (o.source || '').trim() === s).length;
                        optHtml += `<option value="${s}" ${selectedSource === s ? 'selected' : ''}>📍 ${s} (${c} đơn)</option>`;
                    });
                    sourceSelect.innerHTML = optHtml;
                    sourceSelect.onchange = function() { selectedSource = this.value; renderFilteredData(); };
                }

                // Sales
                const uniqueSales = Array.from(new Set(lvOrders.map(o => (o.sale_name || '').trim()).filter(Boolean))).sort();
                const saleSelect = document.getElementById('execMktSaleSelect');
                if (saleSelect) {
                    let optHtml = `<option value="all">Tất cả NV Sale (${lvOrders.length} đơn)</option>`;
                    uniqueSales.forEach(s => {
                        const c = lvOrders.filter(o => (o.sale_name || '').trim() === s).length;
                        optHtml += `<option value="${s}" ${selectedSale === s ? 'selected' : ''}>👤 ${s} (${c} đơn)</option>`;
                    });
                    saleSelect.innerHTML = optHtml;
                    saleSelect.onchange = function() { selectedSale = this.value; renderFilteredData(); };
                }
            }

            populateDropdowns();

            // Render table & stats
            function renderFilteredData() {
                let filtered = rawOrders;

                // Lĩnh vực filter
                if (selectedLv === 'dp') {
                    filtered = filtered.filter(o => {
                        const code = (o.order_code || '').toUpperCase();
                        return !code.includes('GCPET') && !code.includes('GCTEM') && !code.includes('PET') && !code.includes('TEM');
                    });
                } else if (selectedLv === 'pettem') {
                    filtered = filtered.filter(o => {
                        const code = (o.order_code || '').toUpperCase();
                        return code.includes('GCPET') || code.includes('GCTEM') || code.includes('PET') || code.includes('TEM');
                    });
                }

                // Source filter
                if (selectedSource && selectedSource !== 'all') {
                    filtered = filtered.filter(o => (o.source || '').trim() === selectedSource);
                }

                // Sale filter
                if (selectedSale && selectedSale !== 'all') {
                    filtered = filtered.filter(o => (o.sale_name || '').trim() === selectedSale);
                }

                // Customer filter
                if (selectedCustomer && selectedCustomer !== 'all') {
                    filtered = filtered.filter(o => (o.customer_name || '').trim().toLowerCase().includes(selectedCustomer.toLowerCase()));
                }

                // Recalculate stats
                let totalQty = 0, totalDeposit = 0, totalRev = 0;
                filtered.forEach(o => {
                    totalQty += Number(o.total_quantity || 0);
                    totalDeposit += Number(o.deposit_amount || 0);
                    totalRev += Number(o.total_amount || 0);
                });

                // Update right stats (Số đơn & Doanh số like Image 1)
                const statOrders = document.getElementById('execMktStatOrders');
                const statRev = document.getElementById('execMktStatRev');
                if (statOrders) statOrders.textContent = `${filtered.length} đơn`;
                if (statRev) statRev.textContent = `${totalRev.toLocaleString('vi-VN')}đ`;

                // Table Rows
                let rowsHtml = '';
                filtered.forEach((o, idx) => {
                    const orderCodeBadge = `<span style="background:#eff6ff;color:#2563eb;padding:3px 8px;border-radius:6px;font-weight:800;font-size:12px;border:1px solid #bfdbfe;">${o.order_code || '—'}</span>`;
                    const custTypeBadge = `<span style="background:#dcfce7;color:#15803d;padding:3px 8px;border-radius:12px;font-weight:700;font-size:11.5px;">🟢 Khách Mới</span>`;
                    const sourceBadge = `<span style="background:#f0f9ff;color:#0369a1;padding:3px 8px;border-radius:6px;font-weight:700;font-size:11.5px;border:1px solid #bae6fd;">📍 ${o.source || '—'}</span>`;

                    rowsHtml += `
                        <tr style="border-bottom:1px solid #f1f5f9;transition:background 0.15s;${idx % 2 === 1 ? 'background:#fafafa;' : ''}">
                            <td style="padding:10px 12px;text-align:center;font-weight:700;color:#64748b;font-size:12px;">${idx + 1}</td>
                            <td style="padding:10px 12px;font-size:12px;color:#475569;white-space:nowrap;font-weight:600;">🕒 ${o.order_time_str || o.dt_str || '—'}</td>
                            <td style="padding:10px 12px;white-space:nowrap;">${orderCodeBadge}</td>
                            <td style="padding:10px 12px;font-weight:800;color:#0f172a;font-size:13px;">${o.customer_name || 'Khách hàng'}</td>
                            <td style="padding:10px 12px;font-size:12px;color:#334155;font-weight:700;white-space:nowrap;">👤 ${o.sale_name || '—'}</td>
                            <td style="padding:10px 12px;white-space:nowrap;">${custTypeBadge}</td>
                            <td style="padding:10px 12px;white-space:nowrap;">${sourceBadge}</td>
                            <td style="padding:10px 12px;text-align:right;font-weight:800;color:#15803d;font-size:13px;">${Number(o.total_quantity || 0).toLocaleString('vi-VN')}</td>
                            <td style="padding:10px 12px;text-align:right;font-weight:800;color:#c2410c;font-size:13px;">${Number(o.deposit_amount || 0).toLocaleString('vi-VN')}đ</td>
                            <td style="padding:10px 12px;text-align:right;font-weight:800;color:#1d4ed8;font-size:13px;">${Number(o.total_amount || 0).toLocaleString('vi-VN')}đ</td>
                        </tr>
                    `;
                });

                if (tableEl) {
                    if (filtered.length === 0) {
                        tableEl.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:14px;font-weight:600;">📭 Không có đơn hàng nào thỏa mãn bộ lọc đang chọn.</div>';
                    } else {
                        tableEl.innerHTML = `
                            <table style="width:100%;border-collapse:collapse;text-align:left;font-size:13px;">
                                <thead>
                                    <tr style="background:#f8fafc;color:#475569;font-weight:800;font-size:12px;border-bottom:2px solid #e2e8f0;text-transform:uppercase;">
                                        <th style="padding:10px 12px;text-align:center;width:40px;">#</th>
                                        <th style="padding:10px 12px;">Thời Gian Chốt</th>
                                        <th style="padding:10px 12px;">Mã Đơn</th>
                                        <th style="padding:10px 12px;">Tên Khách Hàng</th>
                                        <th style="padding:10px 12px;">NVKD / Sale</th>
                                        <th style="padding:10px 12px;">Loại khách</th>
                                        <th style="padding:10px 12px;">Nguồn Quảng Cáo</th>
                                        <th style="padding:10px 12px;text-align:right;">Tổng SL</th>
                                        <th style="padding:10px 12px;text-align:right;">Đặt Cọc</th>
                                        <th style="padding:10px 12px;text-align:right;">Doanh Số</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rowsHtml}
                                </tbody>
                            </table>
                        `;
                    }
                }
            }

            renderFilteredData();
        } else {
            if (tableEl) tableEl.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;font-weight:700;">❌ Không thể lấy danh sách đơn hàng Marketing</div>';
        }
    } catch(err) {
        if (tableEl) tableEl.innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444;font-weight:700;">❌ Lỗi kết nối: ${err.message}</div>`;
    }
}
window.execShowMktAdsOrdersModal = execShowMktAdsOrdersModal;

window._execSelectedTrendModes = new Set(['revenue', 'orders']);
window._execTrendMode = 'both';

const _TREND_MODE_META = {
    'revenue': { label: '💵 Doanh Thu', color: '#2563eb', btnIdMain: 'btnTrendRev', btnIdModal: 'modalBtnTrendRev', btnIdMobile: 'mBtnTrendRev' },
    'orders': { label: '📦 Số Đơn', color: '#16a34a', btnIdMain: 'btnTrendOrd', btnIdModal: 'modalBtnTrendOrd', btnIdMobile: 'mBtnTrendOrd' },
    'cpo': { label: '🎯 Giá/Đơn (CPO)', color: '#dc2626', btnIdMain: 'btnTrendCpoMain', btnIdModal: 'modalBtnTrendCpo', btnIdMobile: 'mBtnTrendCpo' },
    'cpo_ads': { label: '🎯 Giá/Đơn Ads', color: '#e11d48', btnIdMain: 'btnTrendCpoAdsMain', btnIdModal: 'modalBtnTrendCpoAds', btnIdMobile: 'mBtnTrendCpoAds' },
    'close_rate': { label: '🎯 % Chốt', color: '#ea580c', btnIdMain: 'btnTrendRateMain', btnIdModal: 'modalBtnTrendRate', btnIdMobile: 'mBtnTrendRate' },
    'ads_close_rate': { label: '🎯 % Chốt Ads', color: '#d97706', btnIdMain: 'btnTrendAdsRateMain', btnIdModal: 'modalBtnTrendAdsRate', btnIdMobile: 'mBtnTrendAdsRate' },
    'old_cust_rate': { label: '🔄 % Khách Cũ', color: '#c026d3', btnIdMain: 'btnTrendOldCustMain', btnIdModal: 'modalBtnTrendOldCust', btnIdMobile: 'mBtnTrendOldCust' }
};

function _updateTrendModeButtonsUI() {
    if (!window._execSelectedTrendModes || window._execSelectedTrendModes.size === 0) {
        window._execSelectedTrendModes = new Set(['revenue', 'orders']);
    }
    const selected = window._execSelectedTrendModes;

    const styleButton = (btn, modeKey, isPurpleGroup) => {
        if (!btn) return;
        const meta = _TREND_MODE_META[modeKey];
        if (!meta) return;

        const isActive = selected.has(modeKey);
        if (isActive) {
            btn.classList.add('active');
            btn.style.background = meta.color;
            btn.style.color = '#ffffff';
            btn.style.fontWeight = '900';
            btn.innerHTML = `${meta.label} <span style="margin-left:4px; font-weight:900; background:rgba(255,255,255,0.28); border-radius:50%; width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; font-size:10px; line-height:1;">✖</span>`;
        } else {
            btn.classList.remove('active');
            btn.style.background = 'transparent';
            btn.style.color = isPurpleGroup ? '#3b0764' : '#475569';
            btn.style.fontWeight = '800';
            btn.innerHTML = meta.label;
        }
    };

    Object.keys(_TREND_MODE_META).forEach(k => {
        const meta = _TREND_MODE_META[k];
        const isPurple = ['cpo', 'cpo_ads', 'close_rate', 'ads_close_rate', 'old_cust_rate'].includes(k);
        styleButton(document.getElementById(meta.btnIdMain), k, isPurple);
        styleButton(document.getElementById(meta.btnIdModal), k, isPurple);
        styleButton(document.getElementById(meta.btnIdMobile), k, isPurple);
    });

    const bothActive = selected.has('revenue') && selected.has('orders');
    ['btnTrendBoth', 'modalBtnTrendBoth', 'mBtnTrendBoth'].forEach(id => {
        const b = document.getElementById(id);
        if (b) {
            if (bothActive) {
                b.classList.add('active');
                b.style.background = '#7c3aed';
                b.style.color = '#ffffff';
                b.style.fontWeight = '900';
                b.innerHTML = `✨ Cả Hai <span style="margin-left:4px; font-weight:900; background:rgba(255,255,255,0.28); border-radius:50%; width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; font-size:10px; line-height:1;">✖</span>`;
            } else {
                b.classList.remove('active');
                b.style.background = 'transparent';
                b.style.color = '#475569';
                b.style.fontWeight = '800';
                b.innerHTML = `✨ Cả Hai`;
            }
        }
    });
}

window._execSetTrendMode = function(mode, btn) {
    if (!mode) return;
    window._hasUserInteractedTrendMode = true;
    if (!window._execSelectedTrendModes) {
        window._execSelectedTrendModes = new Set(['revenue', 'orders']);
    }

    const set = window._execSelectedTrendModes;

    // Single-Select Mode: Clear previous selections so clicking a button switches cleanly to that metric!
    set.clear();

    if (mode === 'both') {
        set.add('revenue');
        set.add('orders');
    } else {
        set.add(mode);
    }

    window._execTrendMode = mode;

    _updateTrendModeButtonsUI();
    _renderExecCharts();
    const modalEl = document.getElementById('exModalTrendExpand');
    if (modalEl && modalEl.style.display !== 'none') {
        _renderExpandTrendModalContent();
    }
};

window.execSetModalTrendMode = window._execSetTrendMode;

let _trendExpandChartObj = null;

function _ensureTrendExpandModalHTML() {
    const existing = document.getElementById('exModalTrendExpand');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.id = 'exModalTrendExpand';
    div.className = 'exec-modal-overlay';
    div.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15, 23, 42, 0.85); backdrop-filter:blur(8px); z-index:99999; overflow-y:auto; padding:20px 15px;';
    div.innerHTML = `
        <div style="max-width:1240px; margin:0 auto; background:#ffffff; border-radius:20px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5); overflow:hidden; border:1px solid rgba(255,255,255,0.2); animation:fadeIn 0.2s ease-out;">
            
            <!-- Modal Header (Light Pastel Theme) -->
            <div style="background:linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%); padding:18px 24px; color:#0f172a; border-bottom:1px solid #cbd5e1;">
                <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:14px;">
                    <div>
                        <div style="font-size:18px; font-weight:900; letter-spacing:-0.3px; display:flex; align-items:center; gap:10px; color:#0f172a;">
                            <span>📊 BÁO CÁO PHÂN TÍCH XU HƯỚNG DOANH THU & ĐƠN HÀNG</span>
                            <span style="font-size:11px; background:#dbeafe; color:#1e40af; border:1px solid #93c5fd; padding:3px 10px; border-radius:20px; font-weight:800;">CHẾ ĐỘ HỌP DỰ ÁN</span>
                        </div>
                        <div style="font-size:12.5px; color:#475569; margin-top:4px; display:flex; align-items:center; gap:8px; font-weight:700;">
                            <span>🗓️ Kỳ xem: <strong id="mTrendPeriodLabel" style="color:#2563eb;">Tháng này</strong></span>
                            <span>•</span>
                            <span>👔 Phân khúc: <strong id="mTrendSegmentLabel" style="color:#7c3aed;">Đồng Phục</strong></span>
                        </div>
                    </div>

                    <!-- Close Button X -->
                    <button type="button" onclick="execCloseTrendExpandModal()" style="background:#ef4444; color:white; border:none; width:38px; height:38px; border-radius:50%; font-size:18px; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(239,68,68,0.3); transition:all 0.2s;" title="Đóng cửa sổ (hoặc bấm phím ESC)">
                        ✖
                    </button>
                </div>

                <!-- Modal Trend Toggle Buttons (Full-Width Sub-bar with High Contrast & Zero Overlap) -->
                <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; background:#ffffff; padding:10px 16px; border-radius:14px; border:1px solid #e2e8f0; box-shadow:0 2px 6px rgba(0,0,0,0.03);">
                    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                        <span style="font-size:11.5px; font-weight:800; color:#475569; text-transform:uppercase;">📊 DOANH THU & SẢN LƯỢNG:</span>
                        <div style="display:inline-flex; background:#f1f5f9; padding:3px; border-radius:20px; border:1px solid #cbd5e1; gap:2px;">
                            <button type="button" class="modal-trend-btn active" id="modalBtnTrendRev" onclick="execSetModalTrendMode('revenue', this)" style="padding:5px 14px; font-size:12px; font-weight:900; font-family:inherit; border-radius:16px; border:none; background:#2563eb; color:white; cursor:pointer; transition:all 0.2s;">💵 Doanh Thu</button>
                            <button type="button" class="modal-trend-btn" id="modalBtnTrendOrd" onclick="execSetModalTrendMode('orders', this)" style="padding:5px 14px; font-size:12px; font-weight:800; font-family:inherit; border-radius:16px; border:none; background:transparent; color:#1e293b; cursor:pointer; transition:all 0.2s;">📦 Số Đơn</button>
                            <button type="button" class="modal-trend-btn" id="modalBtnTrendBoth" onclick="execSetModalTrendMode('both', this)" style="padding:5px 14px; font-size:12px; font-weight:800; font-family:inherit; border-radius:16px; border:none; background:transparent; color:#1e293b; cursor:pointer; transition:all 0.2s;">✨ Cả Hai</button>
                        </div>
                    </div>

                    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                        <span style="font-size:11.5px; font-weight:800; color:#581c87; text-transform:uppercase;">🎯 HIỆU QUẢ MARKETING & KHÁCH HÀNG:</span>
                        <div style="display:inline-flex; background:#f3e8ff; padding:3px; border-radius:20px; border:1.5px solid #d8b4fe; flex-wrap:wrap; gap:3px;">
                            <button type="button" class="modal-trend-btn" id="modalBtnTrendCpo" onclick="execSetModalTrendMode('cpo', this)" style="padding:5px 12px; font-size:12px; font-weight:800; font-family:inherit; border-radius:16px; border:none; background:transparent; color:#3b0764; cursor:pointer; transition:all 0.2s;">🎯 Giá/Đơn (CPO)</button>
                            <button type="button" class="modal-trend-btn" id="modalBtnTrendCpoAds" onclick="execSetModalTrendMode('cpo_ads', this)" style="padding:5px 12px; font-size:12px; font-weight:800; font-family:inherit; border-radius:16px; border:none; background:transparent; color:#3b0764; cursor:pointer; transition:all 0.2s;">🎯 Giá/Đơn Ads</button>
                            <button type="button" class="modal-trend-btn" id="modalBtnTrendRate" onclick="execSetModalTrendMode('close_rate', this)" style="padding:5px 12px; font-size:12px; font-weight:800; font-family:inherit; border-radius:16px; border:none; background:transparent; color:#3b0764; cursor:pointer; transition:all 0.2s;">🎯 % Chốt</button>
                            <button type="button" class="modal-trend-btn" id="modalBtnTrendAdsRate" onclick="execSetModalTrendMode('ads_close_rate', this)" style="padding:5px 12px; font-size:12px; font-weight:800; font-family:inherit; border-radius:16px; border:none; background:transparent; color:#3b0764; cursor:pointer; transition:all 0.2s;">🎯 % Chốt Ads</button>
                            <button type="button" class="modal-trend-btn" id="modalBtnTrendOldCust" onclick="execSetModalTrendMode('old_cust_rate', this)" style="padding:5px 12px; font-size:12px; font-weight:800; font-family:inherit; border-radius:16px; border:none; background:transparent; color:#3b0764; cursor:pointer; transition:all 0.2s;">🔄 % Khách Cũ</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal Integrated Period Filters (Segment + Period Filters) -->
            <div style="background:#ffffff; border-bottom:1px solid #e2e8f0; padding:14px 24px; display:flex; flex-direction:column; gap:10px;">
                <!-- Nhóm 0: Lọc Phân Khúc Mảng (Mặc định Lĩnh Vực Đồng Phục - Ảnh 3) -->
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; background:#f8fafc; padding:6px 14px; border-radius:12px; border:1px solid #e2e8f0;">
                    <span style="font-size:12.5px; font-weight:800; color:#1e293b; display:flex; align-items:center; gap:4px;">🏷️ LỌC PHÂN KHÚC MẢNG:</span>
                    <button type="button" class="modal-seg-pill active" data-seg="dong_phuc" onclick="execSetModalSegment('dong_phuc', this)" style="padding:5px 14px; font-size:12px; font-weight:800; font-family:inherit; border-radius:20px; border:1.5px solid #2563eb; background:#2563eb; color:white; cursor:pointer; box-shadow:0 2px 6px rgba(37,99,235,0.25); transition:all 0.2s;">
                        👔 Lĩnh Vực Đồng Phục
                    </button>
                    <button type="button" class="modal-seg-pill" data-seg="tem_pet" onclick="execSetModalSegment('tem_pet', this)" style="padding:5px 14px; font-size:12px; font-weight:800; font-family:inherit; border-radius:20px; border:1px solid #cbd5e1; background:white; color:#475569; cursor:pointer; transition:all 0.2s;">
                        🏷️ Lĩnh Vực TEM PET
                    </button>
                    <button type="button" class="modal-seg-pill" data-seg="tong" onclick="execSetModalSegment('tong', this)" style="padding:5px 14px; font-size:12px; font-weight:800; font-family:inherit; border-radius:20px; border:1px solid #cbd5e1; background:white; color:#475569; cursor:pointer; transition:all 0.2s;">
                        🏢 Tất Cả Công Ty
                    </button>
                </div>

                <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
                    <!-- Nhóm 1: Chọn Nhanh Tháng / Quý / Năm (Ảnh 3) -->
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <span style="font-size:13px; font-weight:800; color:#475569; display:flex; align-items:center; gap:4px;">⚡ Lọc Nhanh:</span>
                        <select id="modalFilterMonth" onchange="execTriggerModalFilter('month')" style="padding:6px 12px; font-size:12.5px; font-weight:700; border-radius:10px; border:1px solid #cbd5e1; background:#ffffff; color:#0f172a; cursor:pointer;">
                            <option value="">-- Chọn 1 Tháng --</option>
                            <option value="1">Tháng 1</option><option value="2">Tháng 2</option><option value="3">Tháng 3</option>
                            <option value="4">Tháng 4</option><option value="5">Tháng 5</option><option value="6">Tháng 6</option>
                            <option value="7">Tháng 7</option><option value="8">Tháng 8</option><option value="9">Tháng 9</option>
                            <option value="10">Tháng 10</option><option value="11">Tháng 11</option><option value="12">Tháng 12</option>
                        </select>

                        <select id="modalFilterQuarter" onchange="execTriggerModalFilter('quarter')" style="padding:6px 12px; font-size:12.5px; font-weight:700; border-radius:10px; border:1px solid #cbd5e1; background:#ffffff; color:#0f172a; cursor:pointer;">
                            <option value="">-- Chọn Quý --</option>
                            <option value="q1">Quý 1</option><option value="q2">Quý 2</option><option value="q3">Quý 3</option><option value="q4">Quý 4</option>
                        </select>

                        <select id="modalFilterYear" onchange="execTriggerModalFilter('year')" style="padding:6px 12px; font-size:12.5px; font-weight:700; border-radius:10px; border:1px solid #cbd5e1; background:#ffffff; color:#0f172a; cursor:pointer;">
                            <option value="">-- Chọn Năm --</option>
                            <option value="2026">Năm 2026</option>
                            <option value="2025">Năm 2025</option>
                            <option value="2024">Năm 2024</option>
                        </select>
                    </div>

                    <!-- Nhóm 2: Lọc Tự Chọn Khoảng Tháng / Lịch Ngày với Tab Switcher -->
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; background:#ffffff; padding:4px 10px; border-radius:14px; border:1px solid #cbd5e1;">
                        <button type="button" id="btnModalToggleRangeMonth" onclick="execToggleModalCustomRangeMode('month')" style="padding:4px 10px; font-size:12px; font-weight:800; font-family:inherit; border-radius:8px; border:1px solid #2563eb; background:#2563eb; color:white; cursor:pointer;">🗓️ Khoảng Tháng</button>
                        <button type="button" id="btnModalToggleRangeDate" onclick="execToggleModalCustomRangeMode('date')" style="padding:4px 10px; font-size:12px; font-weight:800; font-family:inherit; border-radius:8px; border:1px solid #cbd5e1; background:#ffffff; color:#475569; cursor:pointer;">📅 Khoảng Ngày (Lịch)</button>

                        <!-- Box Khoảng Tháng Modal -->
                        <div id="boxModalCustomMonthRange" style="display:inline-flex; align-items:center; gap:6px; background:#f8fafc; padding:3px 10px; border-radius:10px; border:1px solid #cbd5e1;">
                            <span style="font-size:12px; font-weight:800; color:#334155;">Từ:</span>
                            <select id="modalFilterFromMonth" style="padding:3px 6px; font-size:12px; font-weight:700; border-radius:8px; border:1px solid #cbd5e1;">
                                <option value="">-- Từ tháng --</option>
                                <option value="2026-01">T1/2026</option><option value="2026-02">T2/2026</option><option value="2026-03">T3/2026</option>
                                <option value="2026-04">T4/2026</option><option value="2026-05">T5/2026</option><option value="2026-06">T6/2026</option>
                                <option value="2026-07">T7/2026</option><option value="2026-08">T8/2026</option><option value="2026-09">T9/2026</option>
                                <option value="2026-10">T10/2026</option><option value="2026-11">T11/2026</option><option value="2026-12">T12/2026</option>
                            </select>
                            <span style="font-size:12px; font-weight:800; color:#334155;">Đến:</span>
                            <select id="modalFilterToMonth" style="padding:3px 6px; font-size:12px; font-weight:700; border-radius:8px; border:1px solid #cbd5e1;">
                                <option value="">-- Đến tháng --</option>
                                <option value="2026-01">T1/2026</option><option value="2026-02">T2/2026</option><option value="2026-03">T3/2026</option>
                                <option value="2026-04">T4/2026</option><option value="2026-05">T5/2026</option><option value="2026-06">T6/2026</option>
                                <option value="2026-07">T7/2026</option><option value="2026-08">T8/2026</option><option value="2026-09">T9/2026</option>
                                <option value="2026-10">T10/2026</option><option value="2026-11">T11/2026</option><option value="2026-12">T12/2026</option>
                            </select>
                            <button type="button" onclick="execApplyModalRangeFilter()" style="padding:4px 10px; font-size:11.5px; font-weight:800; border-radius:8px; border:none; background:#2563eb; color:white; cursor:pointer;">🚀 Lọc</button>
                        </div>

                        <!-- Box Khoảng Ngày Modal -->
                        <div id="boxModalCustomDateRange" style="display:none; align-items:center; gap:6px; background:#ffffff; padding:3px 10px; border-radius:10px; border:1px solid #93c5fd;">
                            <span style="font-size:12px; font-weight:800; color:#334155;">Từ:</span>
                            <input type="date" id="modalFilterFromDate" style="padding:3px 6px; font-size:12px; font-weight:700; border-radius:8px; border:1px solid #cbd5e1; outline:none;" />
                            <span style="font-size:12px; font-weight:800; color:#334155;">Đến:</span>
                            <input type="date" id="modalFilterToDate" style="padding:3px 6px; font-size:12px; font-weight:700; border-radius:8px; border:1px solid #cbd5e1; outline:none;" />
                            <button type="button" onclick="execApplyModalDateRangeFilter()" style="padding:4px 10px; font-size:11.5px; font-weight:800; border-radius:8px; border:none; background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color:white; cursor:pointer;">🎯 Lọc</button>
                        </div>
                    </div>
                </div>

                <!-- Row 2: Prominent Active Filter Status Banner (Rõ Nổi Bật) -->
                <div style="background:linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%); border:1.5px solid #bfdbfe; border-radius:12px; padding:10px 16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; box-shadow:0 2px 6px rgba(37,99,235,0.06);">
                    <div style="font-size:14px; font-weight:800; color:#1e3a8a; display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                        <span>🗓️ Kỳ đang xem: <strong id="mTrendPeriodLabel2" style="color:#2563eb; font-size:15px; font-weight:900;">Tháng này</strong></span>
                        <span style="color:#cbd5e1;">•</span>
                        <span>👔 Phân khúc: <strong id="mTrendSegmentLabel2" style="color:#7c3aed; font-size:15px; font-weight:900;">👔 Đồng Phục</strong></span>
                        <span id="mTrendBackBtnWrapper" style="display:none; margin-left:10px;">
                            <button type="button" onclick="execGoBackParentPeriod()" style="padding:4px 12px; font-size:12px; font-weight:800; font-family:inherit; border-radius:8px; border:none; background:#0284c7; color:white; cursor:pointer; box-shadow:0 2px 6px rgba(2,132,199,0.3);">
                                ⬅️ Quay lại xem tổng quan Năm
                            </button>
                        </span>
                    </div>
                    <div style="font-size:12px; font-weight:700; color:#0369a1; background:#ffffff; padding:3px 10px; border-radius:20px; border:1px solid #bae6fd;">
                        ⚡ Số liệu đã tự động cập nhật theo bộ lọc ở trên
                    </div>
                </div>
            </div>

            <!-- Modal Body -->
            <div style="padding:24px; background:#f8fafc;">
                
                <!-- 4 Highlights KPI Cards -->
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:14px; margin-bottom:20px;">
                    <div id="mCard1" style="background:white; border-radius:14px; padding:14px 18px; border:1px solid #e2e8f0; border-top:4px solid #2563eb; box-shadow:0 2px 6px rgba(0,0,0,0.03);">
                        <div id="mCard1Title" style="font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">🏆 ĐỈNH DOANH THU (PEAK)</div>
                        <div id="mPeakRevVal" style="font-size:22px; font-weight:900; color:#2563eb; margin-top:4px;">0đ</div>
                        <div id="mPeakRevDate" style="font-size:12px; font-weight:700; color:#0f172a; margin-top:2px;">Mốc: --</div>
                    </div>
                    <div id="mCard2" style="background:white; border-radius:14px; padding:14px 18px; border:1px solid #e2e8f0; border-top:4px solid #16a34a; box-shadow:0 2px 6px rgba(0,0,0,0.03);">
                        <div id="mCard2Title" style="font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">📦 KỶ LỤC ĐƠN HÀNG (MAX)</div>
                        <div id="mPeakOrdVal" style="font-size:22px; font-weight:900; color:#16a34a; margin-top:4px;">0 đơn</div>
                        <div id="mPeakOrdDate" style="font-size:12px; font-weight:700; color:#0f172a; margin-top:2px;">Mốc: --</div>
                    </div>
                    <div id="mCard3" style="background:white; border-radius:14px; padding:14px 18px; border:1px solid #e2e8f0; border-top:4px solid #7c3aed; box-shadow:0 2px 6px rgba(0,0,0,0.03);">
                        <div id="mCard3Title" style="font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">💵 DOANH THU TRUNG BÌNH</div>
                        <div id="mAvgRevVal" style="font-size:22px; font-weight:900; color:#7c3aed; margin-top:4px;">0đ</div>
                        <div id="mAvgRevSub" style="font-size:12px; font-weight:700; color:#64748b; margin-top:2px;">Trung bình / mốc</div>
                    </div>
                    <div id="mCard4" style="background:white; border-radius:14px; padding:14px 18px; border:1px solid #e2e8f0; border-top:4px solid #0284c7; box-shadow:0 2px 6px rgba(0,0,0,0.03);">
                        <div id="mCard4Title" style="font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">🎯 TỔNG CỘNG TRONG KỲ</div>
                        <div id="mTotalRevVal" style="font-size:22px; font-weight:900; color:#0284c7; margin-top:4px;">0đ</div>
                        <div id="mTotalOrdVal" style="font-size:12px; font-weight:700; color:#0f172a; margin-top:2px;">Tổng: 0 đơn</div>
                    </div>
                </div>

                <!-- Magnified Chart Box (450px height) -->
                <div style="background:white; border-radius:16px; padding:20px; border:1px solid #cbd5e1; box-shadow:0 4px 12px rgba(0,0,0,0.04); margin-bottom:20px;">
                    <div style="position:relative; width:100%; height:450px;">
                        <canvas id="exChartTrendExpandCanvas"></canvas>
                    </div>
                </div>

                <!-- Detailed Period Analytics Table -->
                <div style="background:white; border-radius:16px; padding:20px; border:1px solid #cbd5e1; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
                    <div style="font-size:15px; font-weight:800; color:#0f172a; margin-bottom:14px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                        <span>📋 GHI CHÚ PHÂN TÍCH NHẬT KÝ CHI TIẾT SỐ LIỆU (HỌP DỰ ÁN)</span>
                        <span style="font-size:12px; color:#64748b; font-weight:600;">* Chi tiết theo từng mốc thời gian</span>
                    </div>
                    <div style="overflow-x:auto;">
                        <table style="width:100%; border-collapse:collapse; font-size:13px;">
                            <thead>
                                <tr style="background:#f1f5f9; color:#334155;">
                                    <th style="padding:10px 12px; text-align:left; border-bottom:2px solid #cbd5e1;">Mốc Thời Gian</th>
                                    <th style="padding:10px 12px; text-align:right; border-bottom:2px solid #cbd5e1;">Doanh Thu (VNĐ)</th>
                                    <th style="padding:10px 12px; text-align:center; border-bottom:2px solid #cbd5e1;">Số Đơn Hàng</th>
                                    <th style="padding:10px 12px; text-align:right; border-bottom:2px solid #cbd5e1;">Giá/Đơn CPO</th>
                                    <th style="padding:10px 12px; text-align:right; border-bottom:2px solid #cbd5e1;">Giá/Đơn Ads</th>
                                    <th style="padding:10px 12px; text-align:center; border-bottom:2px solid #cbd5e1;">% Chốt MKT</th>
                                    <th style="padding:10px 12px; text-align:center; border-bottom:2px solid #cbd5e1;">% Khách Cũ</th>
                                    <th style="padding:10px 12px; text-align:center; border-bottom:2px solid #cbd5e1;">Đánh Giá Hiệu Suất</th>
                                </tr>
                            </thead>
                            <tbody id="tblTrendExpandDetailBody">
                                <tr><td colspan="5" style="text-align:center; padding:20px; color:#94a3b8;">Đang tổng hợp nhật ký số liệu...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    `;
    document.body.appendChild(div);
}

function execOpenTrendExpandModal() {
    _ensureTrendExpandModalHTML();
    const modal = document.getElementById('exModalTrendExpand');
    if (!modal) return;

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    // Build dynamic year options for modal!
    buildModalYearOptions();

    // Reset all filter controls to blank/placeholder when opening modal!
    if (document.getElementById('modalFilterMonth')) document.getElementById('modalFilterMonth').value = '';
    if (document.getElementById('modalFilterQuarter')) document.getElementById('modalFilterQuarter').value = '';
    if (document.getElementById('modalFilterYear')) document.getElementById('modalFilterYear').value = '';
    if (document.getElementById('modalFilterFromMonth')) document.getElementById('modalFilterFromMonth').value = '';
    if (document.getElementById('modalFilterToMonth')) document.getElementById('modalFilterToMonth').value = '';

    // Dynamically initialize month range dropdowns matching current active year
    const activeYear = _dashData?.period?.label?.match(/\d{4}/)?.[0] || String(new Date().getFullYear());
    updateModalMonthRangeOptions(activeYear);

    // Set Default Segment in Modal to dong_phuc (👔 Lĩnh Vực Đồng Phục)!
    const currentMode = window._execSegmentMode || 'dong_phuc';
    execSetModalSegment(currentMode);

    _updateTrendModeButtonsUI();
    _renderExpandTrendModalContent();
}

function execCloseTrendExpandModal() {
    const modal = document.getElementById('exModalTrendExpand');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
    if (_trendExpandChartObj) {
        _trendExpandChartObj.destroy();
        _trendExpandChartObj = null;
    }
}


function _renderExpandTrendModalContent() {
    if (!_dashData || !window.Chart) return;

    // Update Header & Prominent Banner Labels inside Modal dynamically
    const pLabel = _dashData.period?.label || 'Tháng này';
    const mode = window._execSegmentMode || 'dong_phuc';
    const segName = mode === 'dong_phuc' ? '👔 Đồng Phục' : (mode === 'tem_pet' ? '🏷️ TEM PET' : '🏢 Tất Cả');

    if (document.getElementById('mTrendPeriodLabel')) {
        document.getElementById('mTrendPeriodLabel').innerText = pLabel;
    }
    if (document.getElementById('mTrendPeriodLabel2')) {
        document.getElementById('mTrendPeriodLabel2').innerText = pLabel;
    }
    if (document.getElementById('mTrendSegmentLabel')) {
        document.getElementById('mTrendSegmentLabel').innerText = segName;
    }
    if (document.getElementById('mTrendSegmentLabel2')) {
        document.getElementById('mTrendSegmentLabel2').innerText = segName;
    }

    const charts = _dashData.charts || {};
    const trendData = charts.revenue_trend || { labels: [], revenue: [], orders: [], month_keys: [], is_monthly: false };

    const labels = trendData.labels || [];
    const revenue = trendData.revenue || [];
    const orders = trendData.orders || [];
    const monthKeys = trendData.month_keys || [];
    const isMonthly = trendData.is_monthly || false;

    // Show/hide back button wrapper when drilled down
    const backWrap = document.getElementById('mTrendBackBtnWrapper');
    if (backWrap) {
        if (_dashData.period?.key?.startsWith('month_') && window._previousParentPeriod) {
            backWrap.style.display = 'inline-block';
        } else {
            backWrap.style.display = 'none';
        }
    }

    const cpoList = trendData.cpo || [];
    const cpoAdsList = trendData.cpo_ads || [];
    const closeRateList = trendData.close_rate || [];
    const adsCloseRateList = trendData.ads_close_rate || [];
    const oldCustRateList = trendData.old_cust_rate || [];

    // Calculate Peaks, Min/Lowest & Averages for all 8 metrics
    let maxRev = 0, maxRevIdx = -1, minRev = Infinity, minRevIdx = -1, sumRev = 0;
    let maxOrd = 0, maxOrdIdx = -1, minOrd = Infinity, minOrdIdx = -1, sumOrd = 0;
    let maxCpo = 0, maxCpoIdx = -1, minCpo = Infinity, minCpoIdx = -1, sumCpo = 0;
    let maxCpoAds = 0, maxCpoAdsIdx = -1, minCpoAds = Infinity, minCpoAdsIdx = -1, sumCpoAds = 0;
    let maxCloseRate = 0, maxCloseRateIdx = -1, minCloseRate = Infinity, minCloseRateIdx = -1, sumCloseRate = 0;
    let maxAdsCloseRate = 0, maxAdsCloseRateIdx = -1, minAdsCloseRate = Infinity, minAdsCloseRateIdx = -1, sumAdsCloseRate = 0;
    let maxOldCustRate = 0, maxOldCustRateIdx = -1, minOldCustRate = Infinity, minOldCustRateIdx = -1, sumOldCustRate = 0;

    for (let i = 0; i < labels.length; i++) {
        const r = parseFloat(revenue[i] || 0);
        const o = parseInt(orders[i] || 0);
        const c = parseFloat(cpoList[i] || 0);
        const ca = parseFloat(cpoAdsList[i] || 0);
        const cr = parseFloat(closeRateList[i] || 0);
        const acr = parseFloat(adsCloseRateList[i] || 0);
        const ocr = parseFloat(oldCustRateList[i] || 0);

        sumRev += r; sumOrd += o; sumCpo += c; sumCpoAds += ca;
        sumCloseRate += cr; sumAdsCloseRate += acr; sumOldCustRate += ocr;

        if (r > maxRev) { maxRev = r; maxRevIdx = i; }
        if (r < minRev) { minRev = r; minRevIdx = i; }
        if (o > maxOrd) { maxOrd = o; maxOrdIdx = i; }
        if (o < minOrd) { minOrd = o; minOrdIdx = i; }

        if (c > maxCpo) { maxCpo = c; maxCpoIdx = i; }
        if (c > 0 && c < minCpo) { minCpo = c; minCpoIdx = i; }

        if (ca > maxCpoAds) { maxCpoAds = ca; maxCpoAdsIdx = i; }
        if (ca > 0 && ca < minCpoAds) { minCpoAds = ca; minCpoAdsIdx = i; }

        if (cr > maxCloseRate) { maxCloseRate = cr; maxCloseRateIdx = i; }
        if (cr > 0 && cr < minCloseRate) { minCloseRate = cr; minCloseRateIdx = i; }

        if (acr > maxAdsCloseRate) { maxAdsCloseRate = acr; maxAdsCloseRateIdx = i; }
        if (acr > 0 && acr < minAdsCloseRate) { minAdsCloseRate = acr; minAdsCloseRateIdx = i; }

        if (ocr > maxOldCustRate) { maxOldCustRate = ocr; maxOldCustRateIdx = i; }
        if (ocr > 0 && ocr < minOldCustRate) { minOldCustRate = ocr; minOldCustRateIdx = i; }
    }

    if (minRev === Infinity) minRev = 0;
    if (minOrd === Infinity) minOrd = 0;
    if (minCpo === Infinity) minCpo = 0;
    if (minCpoAds === Infinity) minCpoAds = 0;
    if (minCloseRate === Infinity) minCloseRate = 0;
    if (minAdsCloseRate === Infinity) minAdsCloseRate = 0;
    if (minOldCustRate === Infinity) minOldCustRate = 0;

    const avgRev = labels.length > 0 ? sumRev / labels.length : 0;
    const avgOrd = labels.length > 0 ? (sumOrd / labels.length).toFixed(1) : '0';
    const avgCpo = labels.length > 0 ? Math.round(sumCpo / labels.length) : 0;
    const avgCpoAds = labels.length > 0 ? Math.round(sumCpoAds / labels.length) : 0;
    const avgCloseRate = labels.length > 0 ? (sumCloseRate / labels.length).toFixed(2) : '0';
    const avgAdsCloseRate = labels.length > 0 ? (sumAdsCloseRate / labels.length).toFixed(2) : '0';
    const avgOldCustRate = labels.length > 0 ? (sumOldCustRate / labels.length).toFixed(2) : '0';

    const trendObj = _dashData.charts?.revenue_trend || {};
    const overallSummary = trendObj.overall_summary || {};
    const mktSummary = _dashData.marketing || {};
    const currentTrendMode = window._execTrendMode || 'revenue';
    const segMode = window._execSegmentMode || 'dong_phuc';

    // Segment overall fallbacks from executive summary if needed
    let overallCpoVal = overallSummary.cpo;
    let overallCpoAdsVal = overallSummary.cpo_ads;
    let overallCloseRateVal = overallSummary.close_rate;
    let overallAdsCloseRateVal = overallSummary.ads_close_rate;
    let overallOldCustRateVal = overallSummary.old_customer_rate;

    if (overallCpoVal === undefined) {
        if (segMode === 'dong_phuc') overallCpoVal = mktSummary.dong_phuc_cpo || mktSummary.cpo || avgCpo;
        else if (segMode === 'tem_pet') overallCpoVal = mktSummary.tem_pet_cpo || mktSummary.cpo || avgCpo;
        else overallCpoVal = mktSummary.cpo || avgCpo;
    }
    if (overallCpoAdsVal === undefined) {
        if (segMode === 'dong_phuc') overallCpoAdsVal = mktSummary.dong_phuc_cpo_ads || mktSummary.cpo_ads || avgCpoAds;
        else if (segMode === 'tem_pet') overallCpoAdsVal = mktSummary.tem_pet_cpo_ads || mktSummary.cpo_ads || avgCpoAds;
        else overallCpoAdsVal = mktSummary.cpo_ads || avgCpoAds;
    }
    if (overallCloseRateVal === undefined) {
        if (segMode === 'dong_phuc') overallCloseRateVal = mktSummary.dong_phuc_close_rate || mktSummary.close_rate || avgCloseRate;
        else if (segMode === 'tem_pet') overallCloseRateVal = mktSummary.tem_pet_close_rate || mktSummary.close_rate || avgCloseRate;
        else overallCloseRateVal = mktSummary.close_rate || avgCloseRate;
    }
    if (overallAdsCloseRateVal === undefined) {
        if (segMode === 'dong_phuc') overallAdsCloseRateVal = mktSummary.dong_phuc_ads_close_rate || mktSummary.mkt_ads_close_rate || avgAdsCloseRate;
        else if (segMode === 'tem_pet') overallAdsCloseRateVal = mktSummary.tem_pet_ads_close_rate || mktSummary.mkt_ads_close_rate || avgAdsCloseRate;
        else overallAdsCloseRateVal = mktSummary.mkt_ads_close_rate || avgAdsCloseRate;
    }
    if (overallOldCustRateVal === undefined) {
        if (segMode === 'dong_phuc') overallOldCustRateVal = mktSummary.dong_phuc_old_cust_rate || mktSummary.old_customer_rate || avgOldCustRate;
        else if (segMode === 'tem_pet') overallOldCustRateVal = mktSummary.tem_pet_old_cust_rate || mktSummary.old_customer_rate || avgOldCustRate;
        else overallOldCustRateVal = mktSummary.old_customer_rate || avgOldCustRate;
    }

    // Helper set card
    const setCard = (num, title, val, sub, color) => {
        if (document.getElementById(`mCard${num}Title`)) document.getElementById(`mCard${num}Title`).innerText = title;
        const valEl = document.getElementById(num === 1 ? 'mPeakRevVal' : (num === 2 ? 'mPeakOrdVal' : (num === 3 ? 'mAvgRevVal' : 'mTotalRevVal')));
        if (valEl) { valEl.innerText = val; valEl.style.color = color; }
        const subEl = document.getElementById(num === 1 ? 'mPeakRevDate' : (num === 2 ? 'mPeakOrdDate' : (num === 3 ? 'mAvgRevSub' : 'mTotalOrdVal')));
        if (subEl) subEl.innerText = sub;
    };

    if (currentTrendMode === 'revenue') {
        setCard(1, '🏆 ĐỈNH DOANH THU (PEAK)', formatVND(maxRev), maxRevIdx >= 0 ? `Mốc: ${labels[maxRevIdx]}` : 'Mốc: --', '#2563eb');
        setCard(2, '📉 DOANH THU THẤP NHẤT', formatVND(minRev), minRevIdx >= 0 ? `Mốc: ${labels[minRevIdx]}` : 'Mốc: --', '#e11d48');
        setCard(3, '💵 DOANH THU TRUNG BÌNH', formatVND(avgRev), 'Trung bình / mốc', '#7c3aed');
        setCard(4, '🎯 TỔNG DOANH THU TRONG KỲ', formatVND(sumRev), 'Tổng doanh số chốt', '#0284c7');
    } else if (currentTrendMode === 'orders') {
        setCard(1, '📦 KỶ LỤC ĐƠN HÀNG (MAX)', maxOrd + ' đơn', maxOrdIdx >= 0 ? `Mốc: ${labels[maxOrdIdx]}` : 'Mốc: --', '#16a34a');
        setCard(2, '📉 ĐƠN HÀNG THẤP NHẤT', minOrd + ' đơn', minOrdIdx >= 0 ? `Mốc: ${labels[minOrdIdx]}` : 'Mốc: --', '#ea580c');
        setCard(3, '📊 SỐ ĐƠN TRUNG BÌNH', avgOrd + ' đơn/mốc', 'Trung bình / mốc', '#059669');
        setCard(4, '🎯 TỔNG SỐ ĐƠN TRONG KỲ', sumOrd + ' đơn', 'Tổng số đơn chốt', '#16a34a');
    } else if (currentTrendMode === 'cpo') {
        setCard(1, '🎯 CPO CAO NHẤT (PEAK)', formatVND(maxCpo), maxCpoIdx >= 0 ? `Mốc: ${labels[maxCpoIdx]}` : 'Mốc: --', '#dc2626');
        setCard(2, '📉 CPO TỐI ƯU NHẤT (MIN)', formatVND(minCpo), minCpoIdx >= 0 ? `Mốc: ${labels[minCpoIdx]}` : 'Mốc: --', '#16a34a');
        setCard(3, '💵 GIÁ/ĐƠN CPO TRUNG BÌNH', formatVND(overallCpoVal), 'Chi phí / 1 đơn tổng', '#9333ea');
        setCard(4, '🎯 CPO TỔNG CẢ KỲ', formatVND(overallCpoVal), 'CPO toàn mảng', '#2563eb');
    } else if (currentTrendMode === 'cpo_ads') {
        setCard(1, '🎯 CPO ADS CAO NHẤT (PEAK)', formatVND(maxCpoAds), maxCpoAdsIdx >= 0 ? `Mốc: ${labels[maxCpoAdsIdx]}` : 'Mốc: --', '#e11d48');
        setCard(2, '📉 CPO ADS TỐI ƯU (MIN)', formatVND(minCpoAds), minCpoAdsIdx >= 0 ? `Mốc: ${labels[minCpoAdsIdx]}` : 'Mốc: --', '#059669');
        setCard(3, '💵 GIÁ/ĐƠN ADS TRUNG BÌNH', formatVND(overallCpoAdsVal), 'Chi phí / 1 đơn Ads', '#c026d3');
        setCard(4, '🎯 CPO ADS CẢ KỲ', formatVND(overallCpoAdsVal), 'CPO kênh Ads', '#0284c7');
    } else if (currentTrendMode === 'close_rate') {
        setCard(1, '🎯 % CHỐT CAO NHẤT (MAX)', maxCloseRate + '%', maxCloseRateIdx >= 0 ? `Mốc: ${labels[maxCloseRateIdx]}` : 'Mốc: --', '#16a34a');
        setCard(2, '📉 % CHỐT THẤP NHẤT (MIN)', minCloseRate + '%', minCloseRateIdx >= 0 ? `Mốc: ${labels[minCloseRateIdx]}` : 'Mốc: --', '#dc2626');
        setCard(3, '📊 % CHỐT TRUNG BÌNH', overallCloseRateVal + '%', 'Tỷ lệ đơn / Lead', '#7c3aed');
        setCard(4, '🎯 TỶ LỆ % CHỐT CẢ KỲ', overallCloseRateVal + '%', 'Tỷ lệ chốt tổng thể', '#2563eb');
    } else if (currentTrendMode === 'ads_close_rate') {
        setCard(1, '🎯 % CHỐT ADS CAO NHẤT', maxAdsCloseRate + '%', maxAdsCloseRateIdx >= 0 ? `Mốc: ${labels[maxAdsCloseRateIdx]}` : 'Mốc: --', '#059669');
        setCard(2, '📉 % CHỐT ADS THẤP NHẤT', minAdsCloseRate + '%', minAdsCloseRateIdx >= 0 ? `Mốc: ${labels[minAdsCloseRateIdx]}` : 'Mốc: --', '#e11d48');
        setCard(3, '📊 % CHỐT ADS TRUNG BÌNH', overallAdsCloseRateVal + '%', 'Tỷ lệ đơn Ads / Lead MKT', '#9333ea');
        setCard(4, '🎯 TỶ LỆ % CHỐT ADS CẢ KỲ', overallAdsCloseRateVal + '%', 'Chuyển đổi kênh Ads', '#0284c7');
    } else if (currentTrendMode === 'old_cust_rate') {
        setCard(1, '🔄 % KHÁCH CŨ CAO NHẤT', maxOldCustRate + '%', maxOldCustRateIdx >= 0 ? `Mốc: ${labels[maxOldCustRateIdx]}` : 'Mốc: --', '#c026d3');
        setCard(2, '📉 % KHÁCH CŨ THẤP NHẤT', minOldCustRate + '%', minOldCustRateIdx >= 0 ? `Mốc: ${labels[minOldCustRateIdx]}` : 'Mốc: --', '#ea580c');
        setCard(3, '📊 % KHÁCH CŨ TRUNG BÌNH', overallOldCustRateVal + '%', 'Tỷ lệ KH cũ quay lại', '#7c3aed');
        setCard(4, '🔄 TỶ LỆ % KHÁCH CŨ CẢ KỲ', overallOldCustRateVal + '%', 'Tích lũy tệp KH cũ', '#2563eb');
    } else {
        // Mode 3: Both
        setCard(1, '🏆 ĐỈNH DOANH THU (PEAK)', formatVND(maxRev), maxRevIdx >= 0 ? `Mốc: ${labels[maxRevIdx]}` : 'Mốc: --', '#2563eb');
        setCard(2, '📦 KỶ LỤC ĐƠN HÀNG (MAX)', maxOrd + ' đơn', maxOrdIdx >= 0 ? `Mốc: ${labels[maxOrdIdx]}` : 'Mốc: --', '#16a34a');
        setCard(3, '💵 DOANH THU TRUNG BÌNH', formatVND(avgRev), 'Trung bình / mốc', '#7c3aed');
        setCard(4, '🎯 TỔNG CỘNG TRONG KỲ', formatVND(sumRev), `Tổng: ${sumOrd} đơn`, '#0284c7');
    }

    // Render Magnified Chart 450px
    const ctx = document.getElementById('exChartTrendExpandCanvas')?.getContext('2d');
    if (ctx) {
        if (_trendExpandChartObj) _trendExpandChartObj.destroy();

        const selected = window._execSelectedTrendModes || new Set(['revenue']);
        let datasets = [];
        let scalesConfig = {};

        const hasRev = selected.has('revenue');
        const hasCpo = selected.has('cpo') || selected.has('cpo_ads');
        const hasOrd = selected.has('orders');
        const hasPct = selected.has('close_rate') || selected.has('ads_close_rate') || selected.has('old_cust_rate');

        if (hasRev) {
            datasets.push({
                label: 'Doanh Thu (VNĐ)',
                data: revenue,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.12)',
                yAxisID: 'yRev',
                fill: selected.size === 1,
                tension: 0.3,
                borderWidth: 3,
                pointRadius: 5,
                pointHoverRadius: 8
            });
            scalesConfig.yRev = {
                type: 'linear',
                display: true,
                position: 'left',
                ticks: { callback: v => (v >= 1e6 ? (v/1e6).toFixed(1) + 'M' : (v >= 1e3 ? (v/1e3).toFixed(0) + 'k' : v)) + 'đ', font: { size: 12, weight: 'bold' } }
            };
        }

        const cpoAxis = hasRev ? 'yCpo' : 'yRev';
        if (selected.has('cpo')) {
            datasets.push({
                label: 'Giá/Đơn CPO (đ/đơn)',
                data: cpoList,
                borderColor: '#dc2626',
                backgroundColor: 'rgba(220, 38, 38, 0.12)',
                yAxisID: cpoAxis,
                fill: selected.size === 1,
                tension: 0.3,
                borderWidth: 3,
                pointRadius: 5,
                pointHoverRadius: 8
            });
        }
        if (selected.has('cpo_ads')) {
            datasets.push({
                label: 'Giá/Đơn Ads (đ/đơn Ads)',
                data: cpoAdsList,
                borderColor: '#e11d48',
                backgroundColor: 'rgba(225, 29, 72, 0.12)',
                yAxisID: cpoAxis,
                fill: selected.size === 1,
                tension: 0.3,
                borderWidth: 3,
                pointRadius: 5,
                pointHoverRadius: 8
            });
        }

        if (hasCpo) {
            scalesConfig[cpoAxis] = {
                type: 'linear',
                display: true,
                position: hasRev ? 'right' : 'left',
                grid: { drawOnChartArea: !hasRev },
                ticks: { callback: v => (v >= 1e6 ? (v/1e6).toFixed(1) + 'M' : (v >= 1e3 ? (v/1e3).toFixed(0) + 'k' : v)) + 'đ', font: { size: 12, weight: 'bold' } }
            };
        }

        if (hasOrd) {
            datasets.push({
                label: 'Số Đơn Hàng',
                data: orders,
                borderColor: '#16a34a',
                backgroundColor: 'rgba(22, 163, 74, 0.15)',
                yAxisID: 'yOrd',
                fill: selected.size === 1,
                tension: 0.3,
                borderWidth: 3,
                pointRadius: 5,
                pointHoverRadius: 8
            });
            scalesConfig.yOrd = {
                type: 'linear',
                display: true,
                position: (hasRev || hasCpo) ? 'right' : 'left',
                grid: { drawOnChartArea: !(hasRev || hasCpo) },
                ticks: { precision: 0, callback: v => v + ' đơn', font: { size: 12, weight: 'bold' } }
            };
        }

        if (selected.has('close_rate')) {
            datasets.push({
                label: 'Tỷ Lệ % Chốt MKT (%)',
                data: closeRateList,
                borderColor: '#ea580c',
                backgroundColor: 'rgba(234, 88, 12, 0.12)',
                yAxisID: 'yPct',
                fill: selected.size === 1,
                tension: 0.3,
                borderWidth: 3,
                pointRadius: 5,
                pointHoverRadius: 8
            });
        }
        if (selected.has('ads_close_rate')) {
            datasets.push({
                label: 'Tỷ Lệ % Chốt Ads (%)',
                data: adsCloseRateList,
                borderColor: '#d97706',
                backgroundColor: 'rgba(217, 119, 6, 0.12)',
                yAxisID: 'yPct',
                fill: selected.size === 1,
                tension: 0.3,
                borderWidth: 3,
                pointRadius: 5,
                pointHoverRadius: 8
            });
        }
        if (selected.has('old_cust_rate')) {
            datasets.push({
                label: 'Tỷ Lệ % Khách Cũ Quay Lại (%)',
                data: oldCustRateList,
                borderColor: '#c026d3',
                backgroundColor: 'rgba(192, 38, 211, 0.12)',
                yAxisID: 'yPct',
                fill: selected.size === 1,
                tension: 0.3,
                borderWidth: 3,
                pointRadius: 5,
                pointHoverRadius: 8
            });
        }

        if (hasPct) {
            scalesConfig.yPct = {
                type: 'linear',
                display: true,
                position: 'right',
                grid: { drawOnChartArea: !(hasRev || hasCpo || hasOrd) },
                ticks: { callback: v => v + '%', font: { size: 12, weight: 'bold' } }
            };
        }

        _trendExpandChartObj = new Chart(ctx, {
            type: 'line',
            data: { labels: labels, datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (evt, elements) => {
                    if (elements && elements.length > 0) {
                        const idx = elements[0].index;
                        if (monthKeys[idx]) {
                            window._previousParentPeriod = _dashData.period?.key || 'year_2026';
                            execTriggerMonthDrilldown(monthKeys[idx]);
                        }
                    }
                },
                plugins: {
                    legend: { display: datasets.length > 1, position: 'top', labels: { font: { size: 13, weight: 'bold' } } }
                },
                scales: scalesConfig
            }
        });
    }

    // Render Detailed Table Rows with All 8 Metrics
    const tbody = document.getElementById('tblTrendExpandDetailBody');
    if (tbody) {
        if (labels.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#94a3b8;">Không có dữ liệu trong kỳ này</td></tr>`;
        } else {
            let html = '';
            for (let i = 0; i < labels.length; i++) {
                const dateLabel = labels[i];
                const revVal = parseFloat(revenue[i] || 0);
                const ordVal = parseInt(orders[i] || 0);
                const cpoVal = parseFloat(cpoList[i] || 0);
                const cpoAdsVal = parseFloat(cpoAdsList[i] || 0);
                const closeRateVal = parseFloat(closeRateList[i] || 0);
                const oldCustRateVal = parseFloat(oldCustRateList[i] || 0);
                const mCode = monthKeys[i] || '';

                let badgeList = [];
                if (revVal === maxRev && maxRev > 0) {
                    badgeList.push(`<span style="background:#fee2e2; color:#b91c1c; padding:3px 8px; border-radius:12px; font-weight:800; font-size:11px;">🔥 ĐỈNH DT</span>`);
                }
                if (ordVal === maxOrd && maxOrd > 0) {
                    badgeList.push(`<span style="background:#dcfce7; color:#15803d; padding:3px 8px; border-radius:12px; font-weight:800; font-size:11px;">⭐ KỶ LỤC ĐƠN</span>`);
                }
                if (cpoVal > 0 && cpoVal === minCpo) {
                    badgeList.push(`<span style="background:#e0e7ff; color:#4338ca; padding:3px 8px; border-radius:12px; font-weight:800; font-size:11px;">💎 CPO TỐI ƯU</span>`);
                }
                if (badgeList.length === 0) {
                    badgeList.push(`<span style="color:#94a3b8; font-weight:600;">${isMonthly ? 'Nháy đúp xem ngày' : 'Ổn định'}</span>`);
                }

                const rowBg = i % 2 === 1 ? 'background:#f8fafc;' : 'background:#ffffff;';
                const cursorStyle = mCode ? 'cursor:pointer;' : '';
                const titleAttr = mCode ? 'title="Nháy đúp 2 lần để mở chi tiết các ngày trong tháng này"' : '';
                const dblClickAttr = mCode ? `ondblclick="window._previousParentPeriod = '${_dashData.period?.key || ''}'; execTriggerMonthDrilldown('${mCode}')"` : '';

                html += `
                    <tr style="${rowBg} ${cursorStyle}" ${titleAttr} ${dblClickAttr}>
                        <td style="padding:10px 12px; font-weight:800; color:#0f172a;">${dateLabel} ${mCode ? '<span style="font-size:10.5px; color:#2563eb; font-weight:700;">(Mở ngày)</span>' : ''}</td>
                        <td style="padding:10px 12px; text-align:right; font-weight:800; color:#2563eb;">${formatVND(revVal)}</td>
                        <td style="padding:10px 12px; text-align:center; font-weight:800; color:#16a34a;">${ordVal} đơn</td>
                        <td style="padding:10px 12px; text-align:right; font-weight:700; color:#dc2626;">${cpoVal > 0 ? formatVND(cpoVal) : '—'}</td>
                        <td style="padding:10px 12px; text-align:right; font-weight:700; color:#e11d48;">${cpoAdsVal > 0 ? formatVND(cpoAdsVal) : '—'}</td>
                        <td style="padding:10px 12px; text-align:center; font-weight:800; color:#ea580c;">${closeRateVal > 0 ? closeRateVal + '%' : '—'}</td>
                        <td style="padding:10px 12px; text-align:center; font-weight:800; color:#c026d3;">${oldCustRateVal > 0 ? oldCustRateVal + '%' : '—'}</td>
                        <td style="padding:10px 12px; text-align:center;">${badgeList.join(' ')}</td>
                    </tr>
                `;
            }
            tbody.innerHTML = html;
        }
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        execCloseTrendExpandModal();
        if (typeof mCloseTrendExpandModal === 'function') mCloseTrendExpandModal();
    }
});

function execGoBackParentPeriod() {
    const parentKey = window._previousParentPeriod || 'year_2026';
    if (parentKey.startsWith('year_')) {
        const yr = parentKey.replace('year_', '');
        const yearSel = document.getElementById('modalFilterYear');
        if (yearSel) yearSel.value = yr;
    }
    if (typeof _setExecPeriod === 'function') {
        _setExecPeriod(parentKey, document.getElementById('execSelectYear'));
    }
}
window.execGoBackParentPeriod = execGoBackParentPeriod;

function execTriggerMonthDrilldown(mCode) {
    if (!mCode) return;
    const cleanCode = mCode.replace('month_', '');
    const parts = cleanCode.split('-');
    if (parts.length === 2) {
        const monthSel = document.getElementById('modalFilterMonth');
        if (monthSel) monthSel.value = parseInt(parts[1]);
    }
    if (typeof _setExecPeriod === 'function') {
        _setExecPeriod(mCode, document.getElementById('execSelectSingleMonth'));
    }
}
window.execTriggerMonthDrilldown = execTriggerMonthDrilldown;

function buildModalYearOptions() {
    const yearSel = document.getElementById('modalFilterYear');
    if (!yearSel) return;

    const currentYear = new Date().getFullYear();
    const maxYear = Math.max(currentYear, 2026) + 1;
    const minYear = 2024;

    let html = `<option value="">-- Chọn Năm --</option>`;
    for (let y = maxYear; y >= minYear; y--) {
        html += `<option value="${y}">Năm ${y}</option>`;
    }
    yearSel.innerHTML = html;
}

function updateModalMonthRangeOptions(selectedYear) {
    const fromSel = document.getElementById('modalFilterFromMonth');
    const toSel = document.getElementById('modalFilterToMonth');
    const mainFromSel = document.getElementById('execRangeFromMonth');
    const mainToSel = document.getElementById('execRangeToMonth');

    const yr = selectedYear && String(selectedYear).trim() ? String(selectedYear).trim().replace('year_', '') : String(new Date().getFullYear());

    let fromHtml = `<option value="">-- Từ tháng --</option>`;
    for (let m = 1; m <= 12; m++) {
        const padM = String(m).padStart(2, '0');
        fromHtml += `<option value="${yr}-${padM}">T${m}/${yr}</option>`;
    }

    let toHtml = `<option value="">-- Đến tháng --</option>`;
    for (let m = 1; m <= 12; m++) {
        const padM = String(m).padStart(2, '0');
        toHtml += `<option value="${yr}-${padM}">T${m}/${yr}</option>`;
    }

    if (fromSel) fromSel.innerHTML = fromHtml;
    if (toSel) toSel.innerHTML = toHtml;
    if (mainFromSel) mainFromSel.innerHTML = fromHtml;
    if (mainToSel) mainToSel.innerHTML = toHtml;
}

function execApplyDateRangeFilter() {
    const fromEl = document.getElementById('execFilterFromDate');
    const toEl = document.getElementById('execFilterToDate');
    let fromVal = fromEl?.value?.trim() || '';
    let toVal = toEl?.value?.trim() || '';

    if (!fromVal && !toVal) {
        if (typeof showToast === 'function') showToast('Vui lòng chọn ngày từ lịch!', 'warning');
        else alert('Vui lòng chọn ngày từ lịch!');
        return;
    }

    if (!fromVal) fromVal = toVal;
    if (!toVal) toVal = fromVal;

    // Reset other main page dropdowns to prevent conflicting UX
    const monthSel = document.getElementById('execSelectSingleMonth');
    const quarterSel = document.getElementById('execSelectQuarter');
    const yearSel = document.getElementById('execSelectYear');
    const fromMSel = document.getElementById('execRangeFromMonth');
    const toMSel = document.getElementById('execRangeToMonth');
    if (monthSel) monthSel.value = '';
    if (quarterSel) quarterSel.value = '';
    if (yearSel) yearSel.value = '';
    if (fromMSel) fromMSel.value = '';
    if (toMSel) toMSel.value = '';

    const periodKey = `daterange_${fromVal}_${toVal}`;
    if (typeof _setExecPeriod === 'function') {
        _setExecPeriod(periodKey, document.getElementById('execBtnApplyMonthRange'));
    }
}
window.execApplyDateRangeFilter = execApplyDateRangeFilter;

function execToggleCustomRangeMode(mode) {
    const boxM = document.getElementById('boxCustomMonthRange');
    const boxD = document.getElementById('boxCustomDateRange');
    const btnM = document.getElementById('btnToggleRangeMonth');
    const btnD = document.getElementById('btnToggleRangeDate');

    if (mode === 'date') {
        if (boxM) boxM.style.display = 'none';
        if (boxD) boxD.style.display = 'inline-flex';
        if (btnM) { btnM.style.background = '#ffffff'; btnM.style.color = '#475569'; btnM.style.borderColor = '#cbd5e1'; }
        if (btnD) { btnD.style.background = '#2563eb'; btnD.style.color = '#ffffff'; btnD.style.borderColor = '#2563eb'; }
    } else {
        if (boxM) boxM.style.display = 'inline-flex';
        if (boxD) boxD.style.display = 'none';
        if (btnM) { btnM.style.background = '#2563eb'; btnM.style.color = '#ffffff'; btnM.style.borderColor = '#2563eb'; }
        if (btnD) { btnD.style.background = '#ffffff'; btnD.style.color = '#475569'; btnD.style.borderColor = '#cbd5e1'; }
    }
}
window.execToggleCustomRangeMode = execToggleCustomRangeMode;

function execToggleModalCustomRangeMode(mode) {
    const boxM = document.getElementById('boxModalCustomMonthRange');
    const boxD = document.getElementById('boxModalCustomDateRange');
    const btnM = document.getElementById('btnModalToggleRangeMonth');
    const btnD = document.getElementById('btnModalToggleRangeDate');

    if (mode === 'date') {
        if (boxM) boxM.style.display = 'none';
        if (boxD) boxD.style.display = 'inline-flex';
        if (btnM) { btnM.style.background = '#ffffff'; btnM.style.color = '#475569'; btnM.style.borderColor = '#cbd5e1'; }
        if (btnD) { btnD.style.background = '#2563eb'; btnD.style.color = '#ffffff'; btnD.style.borderColor = '#2563eb'; }
    } else {
        if (boxM) boxM.style.display = 'inline-flex';
        if (boxD) boxD.style.display = 'none';
        if (btnM) { btnM.style.background = '#2563eb'; btnM.style.color = '#ffffff'; btnM.style.borderColor = '#2563eb'; }
        if (btnD) { btnD.style.background = '#ffffff'; btnD.style.color = '#475569'; btnD.style.borderColor = '#cbd5e1'; }
    }
}
window.execToggleModalCustomRangeMode = execToggleModalCustomRangeMode;

function execSetModalSegment(segMode, btnEl) {
    _setExecSegment(segMode, btnEl);
}
window.execSetModalSegment = execSetModalSegment;

function execApplyModalDateRangeFilter() {
    const fromEl = document.getElementById('modalFilterFromDate');
    const toEl = document.getElementById('modalFilterToDate');
    let fromVal = fromEl?.value?.trim() || '';
    let toVal = toEl?.value?.trim() || '';

    if (!fromVal && !toVal) {
        if (typeof showToast === 'function') showToast('Vui lòng chọn ngày từ lịch!', 'warning');
        else alert('Vui lòng chọn ngày từ lịch!');
        return;
    }

    if (!fromVal) fromVal = toVal;
    if (!toVal) toVal = fromVal;

    // Reset other modal dropdowns to prevent conflicting UX
    const monthSel = document.getElementById('modalFilterMonth');
    const quarterSel = document.getElementById('modalFilterQuarter');
    const yearSel = document.getElementById('modalFilterYear');
    const fromMSel = document.getElementById('modalFilterFromMonth');
    const toMSel = document.getElementById('modalFilterToMonth');
    if (monthSel) monthSel.value = '';
    if (quarterSel) quarterSel.value = '';
    if (yearSel) yearSel.value = '';
    if (fromMSel) fromMSel.value = '';
    if (toMSel) toMSel.value = '';

    const periodKey = `daterange_${fromVal}_${toVal}`;
    if (typeof _setExecPeriod === 'function') {
        _setExecPeriod(periodKey, document.getElementById('modalFilterToMonth'));
    }
}
window.execApplyModalDateRangeFilter = execApplyModalDateRangeFilter;

function execTriggerModalFilter(type) {
    const monthSel = document.getElementById('modalFilterMonth');
    const quarterSel = document.getElementById('modalFilterQuarter');
    const yearSel = document.getElementById('modalFilterYear');

    if (type === 'month') {
        const monthVal = monthSel?.value;
        const yearVal = yearSel?.value || '2026';
        if (!monthVal) return;

        // Auto-clear Quarter dropdown to prevent UI confusion!
        if (quarterSel) quarterSel.value = '';

        const padMonth = String(monthVal).padStart(2, '0');
        const periodCode = `month_${yearVal}-${padMonth}`;
        const mainSel = document.getElementById('execSelectSingleMonth');
        if (mainSel) {
            mainSel.value = periodCode;
        }
        if (typeof _setExecPeriod === 'function') {
            _setExecPeriod(periodCode, mainSel);
        }
    } else if (type === 'quarter') {
        const qVal = quarterSel?.value;
        if (!qVal) return;

        // Auto-clear Month dropdown to prevent UI confusion!
        if (monthSel) monthSel.value = '';

        const periodCode = `q${qVal}`;
        const mainSel = document.getElementById('execSelectQuarter');
        if (mainSel) {
            mainSel.value = periodCode;
        }
        if (typeof _setExecPeriod === 'function') {
            _setExecPeriod(periodCode, mainSel);
        }
    } else if (type === 'year') {
        const yVal = yearSel?.value;
        if (!yVal) return;

        // Auto-clear Month & Quarter dropdowns on year change!
        if (monthSel) monthSel.value = '';
        if (quarterSel) quarterSel.value = '';

        // Dynamically update Month Range dropdowns to match selected year!
        updateModalMonthRangeOptions(yVal);

        const periodCode = `year_${yVal}`;
        const mainSel = document.getElementById('execSelectYear');
        if (mainSel) {
            mainSel.value = periodCode;
        }
        if (typeof _setExecPeriod === 'function') {
            _setExecPeriod(periodCode, mainSel);
        }
    }
}

function execApplyModalRangeFilter() {
    const monthSel = document.getElementById('modalFilterMonth');
    const quarterSel = document.getElementById('modalFilterQuarter');

    // Auto-clear Month & Quarter dropdowns when custom range is applied!
    if (monthSel) monthSel.value = '';
    if (quarterSel) quarterSel.value = '';

    const fromVal = document.getElementById('modalFilterFromMonth')?.value;
    const toVal = document.getElementById('modalFilterToMonth')?.value;
    
    const mainFrom = document.getElementById('execRangeFromMonth');
    const mainTo = document.getElementById('execRangeToMonth');
    const mainBtn = document.getElementById('execBtnApplyMonthRange');

    if (mainFrom && fromVal) mainFrom.value = fromVal;
    if (mainTo && toVal) mainTo.value = toVal;
    
    if (typeof _applyExecMonthRange === 'function') {
        _applyExecMonthRange(mainBtn);
    }
}

window.execTriggerModalFilter = execTriggerModalFilter;
window.execApplyModalRangeFilter = execApplyModalRangeFilter;
window.execOpenTrendExpandModal = execOpenTrendExpandModal;
window.execCloseTrendExpandModal = execCloseTrendExpandModal;
// execSetModalTrendMode already assigned at line 4824 via window._execSetTrendMode

function _renderExecDashboard() {
    if (!_dashData) return;

    // Period label & Date Subtitle
    if (document.getElementById('execPeriodLabel')) {
        const pLabel = _dashData.period?.label || 'Hôm nay';
        document.getElementById('execPeriodLabel').innerText = pLabel.toUpperCase();

        const subEl = document.getElementById('execPeriodDateSub');
        if (subEl) {
            let dateRangeStr = '';
            if (_dashData.period?.date_from && _dashData.period?.date_to) {
                const dFrom = String(_dashData.period.date_from).split(' ')[0];
                const dTo = String(_dashData.period.date_to).split(' ')[0];
                dateRangeStr = `(${dFrom} → ${dTo})`;
            }
            subEl.innerText = dateRangeStr;
        }
    }

    // Sync Filter Bar Active Class
    if (_dashPeriod) {
        document.querySelectorAll('.exec-btn-pill').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.exec-select').forEach(s => s.classList.remove('active'));

        const btn = Array.from(document.querySelectorAll('.exec-btn-pill')).find(b => b.getAttribute('onclick')?.includes(`'${_dashPeriod}'`));
        if (btn) {
            btn.classList.add('active');
            const selQ = document.getElementById('execSelectQuarter');
            const selY = document.getElementById('execSelectYear');
            if (selQ) selQ.value = '';
            if (selY) selY.value = '';
        } else {
            const selQ = document.getElementById('execSelectQuarter');
            const selY = document.getElementById('execSelectYear');
            if (selQ && selQ.value === _dashPeriod) {
                selQ.classList.add('active');
            } else if (selY) {
                const matchVal = _dashPeriod.startsWith('year_') ? _dashPeriod : `year_${_dashPeriod}`;
                if (Array.from(selY.options).some(o => o.value === matchVal)) {
                    selY.value = matchVal;
                    selY.classList.add('active');
                }
            }
        }
    }

    const mkt = _dashData.marketing || {};
    const exec = _dashData.executive || {};
    const mode = _execSegmentMode || 'dong_phuc';

    // Mode Label Updates
    const modeLabelText = mode === 'dong_phuc' ? '[Đang xem: 👔 Mảng Đồng Phục]' : (mode === 'tem_pet' ? '[Đang xem: 🏷️ Mảng Tem PET]' : '[Đang xem: 🏢 Tất Cả (Tổng Công Ty)]');
    if (document.getElementById('sec1ModeTag')) document.getElementById('sec1ModeTag').innerText = modeLabelText;
    if (document.getElementById('sec2ModeTag')) document.getElementById('sec2ModeTag').innerText = modeLabelText;

    const shortModeTag = mode === 'dong_phuc' ? '(👔 Mảng Đồng Phục)' : (mode === 'tem_pet' ? '(🏷️ Mảng TEM PET)' : '(🏢 Tất Cả)');
    const subTagHtml = `<span class="exec-sub-tag-pulse">${shortModeTag}</span>`;
    if (document.getElementById('exTitleTopProd')) document.getElementById('exTitleTopProd').innerHTML = `🔥 Top Sản Phẩm Bán Chạy ${subTagHtml}`;
    if (document.getElementById('exTitleTopCust')) document.getElementById('exTitleTopCust').innerHTML = `👑 Top Khách Hàng Tiêu Biểu (VIP) ${subTagHtml}`;
    if (document.getElementById('exTitleTopSales')) document.getElementById('exTitleTopSales').innerHTML = `🏆 Doanh Thu Theo Nhân Viên Bán Hàng ${subTagHtml}`;
    if (document.getElementById('exTitleRecentOrders')) document.getElementById('exTitleRecentOrders').innerHTML = `📋 Đơn Hàng Gần Đây ${subTagHtml}`;

    const _setTxt = (id1, id2, val) => {
        if (id1 && document.getElementById(id1)) document.getElementById(id1).innerText = val;
        if (id2 && document.getElementById(id2)) document.getElementById(id2).innerText = val;
    };

    // --- SECTION 1 & 2 BIG NUMBERS DEPENDING ON MODE ---
    // 1. Số Đơn Chốt
    let displayOrders = (exec.total_orders || mkt.closed_orders || 0) + ' đơn';
    if (mode === 'dong_phuc') displayOrders = (exec.dong_phuc_orders || 0) + ' đơn';
    else if (mode === 'tem_pet') displayOrders = (exec.tem_pet_orders || 0) + ' đơn';
    _setTxt('exOrders', 'mOrdersNum', displayOrders);

    // 2. Doanh Số Chốt
    let displayRev = formatCurrency(exec.total_revenue || mkt.revenue || 0);
    if (mode === 'dong_phuc') displayRev = formatCurrency(exec.dong_phuc_revenue || 0);
    else if (mode === 'tem_pet') displayRev = formatCurrency(exec.tem_pet_revenue || 0);
    _setTxt('exRevenueMktNum', 'mRevNum', displayRev);

    // 3. Giá / Đơn CPO (Toàn Bộ)
    let displayCPO = formatCurrency(mkt.cpo || 0);
    if (mode === 'dong_phuc') displayCPO = formatCurrency(mkt.dong_phuc_cpo || 0);
    else if (mode === 'tem_pet') displayCPO = formatCurrency(mkt.tem_pet_cpo || 0);
    _setTxt('exCPO', 'mCPONum', displayCPO);

    // 4. % Chi Phí / DT (Toàn Bộ)
    let displayRatio = (mkt.cost_ratio || 0) + '%';
    if (mode === 'dong_phuc') displayRatio = (mkt.dong_phuc_cost_ratio || 0) + '%';
    else if (mode === 'tem_pet') displayRatio = (mkt.tem_pet_cost_ratio || 0) + '%';
    _setTxt('exRatio', 'mRatioNum', displayRatio);

    // 5. Tỷ Lệ Chốt (Toàn Bộ)
    let displayRate = (mkt.close_rate || 0) + '%';
    if (mode === 'dong_phuc') displayRate = (mkt.dong_phuc_close_rate || 0) + '%';
    else if (mode === 'tem_pet') displayRate = (mkt.tem_pet_close_rate || 0) + '%';
    _setTxt('exRate', 'mRateNum', displayRate);

    // 6. Tỷ Lệ Đơn Khách Cũ
    let displayOldCustRate = (mkt.old_customer_rate || 0) + '%';
    if (mode === 'dong_phuc') displayOldCustRate = (mkt.dong_phuc_old_cust_rate || 0) + '%';
    else if (mode === 'tem_pet') displayOldCustRate = (mkt.tem_pet_old_cust_rate || 0) + '%';
    _setTxt('exOldCustRateNum', 'mOldCustRateNum', displayOldCustRate);

    // 7. Chi Phí QC
    let displaySpent = formatCurrency(mkt.spent_amount || 0);
    if (mode === 'dong_phuc') displaySpent = formatCurrency(mkt.dong_phuc_spent || 0);
    else if (mode === 'tem_pet') displaySpent = formatCurrency(mkt.tem_pet_spent || 0);
    _setTxt('exSpent', 'mSpentNum', displaySpent);

    // 8. Giá CPL
    let displayCPLValue = formatCurrency(mkt.cpl || 0) + 'đ/lead';
    if (mode === 'dong_phuc') displayCPLValue = formatCurrency(mkt.dong_phuc_cpl || 0) + 'đ/lead';
    else if (mode === 'tem_pet') displayCPLValue = formatCurrency(mkt.tem_pet_cpl || 0) + 'đ/lead';
    _setTxt('exCPLNum', 'mCPLNum', displayCPLValue);

    // 9. Số Lead
    let displayLeadsValue = (mkt.lead_count || 0) + ' lead';
    if (mode === 'dong_phuc') displayLeadsValue = (mkt.dong_phuc_leads || 0) + ' lead';
    else if (mode === 'tem_pet') displayLeadsValue = (mkt.tem_pet_leads || 0) + ' lead';
    _setTxt('exLeadNum', 'mLeadNum', displayLeadsValue);

    // 10. Số Đơn Ads (MKT)
    let displayMktAdsOrders = (mkt.mkt_ads_orders || mkt.closed_orders || 0) + ' đơn';
    if (mode === 'dong_phuc') displayMktAdsOrders = (mkt.dong_phuc_mkt_ads_orders || 0) + ' đơn';
    else if (mode === 'tem_pet') displayMktAdsOrders = (mkt.tem_pet_mkt_ads_orders || 0) + ' đơn';
    _setTxt('exMktAdsOrdersNum', 'mMktAdsOrdersNum', displayMktAdsOrders);

    // 11. Doanh Số Ads (MKT)
    let displayMktAdsRev = formatCurrency(mkt.mkt_ads_revenue || mkt.revenue || 0) + 'đ';
    if (mode === 'dong_phuc') displayMktAdsRev = formatCurrency(mkt.dong_phuc_mkt_ads_revenue || 0) + 'đ';
    else if (mode === 'tem_pet') displayMktAdsRev = formatCurrency(mkt.tem_pet_mkt_ads_revenue || 0) + 'đ';
    _setTxt('exMktAdsRevNum', 'mMktAdsRevNum', displayMktAdsRev);

    // 12. Giá / Đơn Ads (CPO Ads)
    let displayCPOAds = formatCurrency(mkt.cpo_ads || 0);
    if (mode === 'dong_phuc') displayCPOAds = formatCurrency(mkt.dong_phuc_cpo_ads || 0);
    else if (mode === 'tem_pet') displayCPOAds = formatCurrency(mkt.tem_pet_cpo_ads || 0);
    _setTxt('exCPOAdsNum', 'mCPOAdsNum', displayCPOAds);

    // 13. % Chi Phí / DT Ads
    let displayRatioAds = (mkt.cost_ratio_ads || 0) + '%';
    if (mode === 'dong_phuc') displayRatioAds = (mkt.dong_phuc_cost_ratio_ads || 0) + '%';
    else if (mode === 'tem_pet') displayRatioAds = (mkt.tem_pet_cost_ratio_ads || 0) + '%';
    _setTxt('exRatioAdsNum', 'mRatioAdsNum', displayRatioAds);

    // 14. Tỷ Lệ Chốt Ads
    let displayAdsRate = (mkt.mkt_ads_close_rate || mkt.close_rate || 0) + '%';
    if (mode === 'dong_phuc') displayAdsRate = (mkt.dong_phuc_ads_close_rate || 0) + '%';
    else if (mode === 'tem_pet') displayAdsRate = (mkt.tem_pet_ads_close_rate || 0) + '%';
    _setTxt('exAdsRateNum', 'mAdsRateNum', displayAdsRate);

    // --- SUB-BREAKDOWN DETAILED INDICATORS BELOW CARDS ---
    _setTxt('exDongPhucSpent', 'mDpSpent', formatCurrency(mkt.dong_phuc_spent || 0));
    _setTxt('exTemPetSpent', 'mPetSpent', formatCurrency(mkt.tem_pet_spent || 0));
    _setTxt('exTongSpent', 'mTongSpent', formatCurrency(mkt.spent_amount || 0));

    const dpOrders = exec.dong_phuc_orders || 0;
    const dpRev = exec.dong_phuc_revenue || 0;
    const petOrders = exec.tem_pet_orders || 0;
    const petRev = exec.tem_pet_revenue || 0;

    _setTxt('exDongPhucOrders', 'mDpOrders', `${dpOrders} đơn`);
    _setTxt('exDongPhucRev', 'mDpRev', formatCurrency(dpRev));
    _setTxt('exTemPetOrders', 'mPetOrders', `${petOrders} đơn`);
    _setTxt('exTemPetRev', 'mPetRev', formatCurrency(petRev));
    _setTxt('exTongOrders', 'mTongOrders', `${exec.total_orders || mkt.closed_orders || 0} đơn`);
    _setTxt('exTongRev', 'mTongRev', formatCurrency(exec.total_revenue || mkt.revenue || 0));

    _setTxt('exDongPhucMktOrders', 'mDpMktOrders', (mkt.dong_phuc_mkt_ads_orders || 0) + ' đơn');
    _setTxt('exTemPetMktOrders', 'mPetMktOrders', (mkt.tem_pet_mkt_ads_orders || 0) + ' đơn');
    _setTxt('exTongMktOrders', 'mTongMktOrders', (mkt.mkt_ads_orders || mkt.closed_orders || 0) + ' đơn');

    _setTxt('exDongPhucMktRev', 'mDpMktRev', formatCurrency(mkt.dong_phuc_mkt_ads_revenue || 0));
    _setTxt('exTemPetMktRev', 'mPetMktRev', formatCurrency(mkt.tem_pet_mkt_ads_revenue || 0));
    _setTxt('exTongMktRev', 'mTongMktRev', formatCurrency(mkt.mkt_ads_revenue || mkt.revenue || 0));

    _setTxt('exDongPhucCPO', 'mDpCPO', formatCurrency(mkt.dong_phuc_cpo || 0));
    _setTxt('exTemPetCPO', 'mPetCPO', formatCurrency(mkt.tem_pet_cpo || 0));
    _setTxt('exTongCPO', 'mTongCPO', formatCurrency(mkt.cpo || 0));

    _setTxt('exDongPhucCPOAds', 'mDpCPOAds', formatCurrency(mkt.dong_phuc_cpo_ads || 0));
    _setTxt('exTemPetCPOAds', 'mPetCPOAds', formatCurrency(mkt.tem_pet_cpo_ads || 0));
    _setTxt('exTongCPOAds', 'mTongCPOAds', formatCurrency(mkt.cpo_ads || 0));

    _setTxt('exDongPhucRatio', 'mDpRatio', (mkt.dong_phuc_cost_ratio || 0) + '%');
    _setTxt('exTemPetRatio', 'mPetRatio', (mkt.tem_pet_cost_ratio || 0) + '%');
    _setTxt('exTongRatio', 'mTongRatio', (mkt.cost_ratio || 0) + '%');

    _setTxt('exDongPhucRatioAds', 'mDpRatioAds', (mkt.dong_phuc_cost_ratio_ads || 0) + '%');
    _setTxt('exTemPetRatioAds', 'mPetRatioAds', (mkt.tem_pet_cost_ratio_ads || 0) + '%');
    _setTxt('exTongRatioAds', 'mTongRatioAds', (mkt.cost_ratio_ads || 0) + '%');

    _setTxt('exDongPhucCPL', 'mDpCPL', formatCurrency(mkt.dong_phuc_cpl || 0) + 'đ/lead');
    _setTxt('exTemPetCPL', 'mPetCPL', formatCurrency(mkt.tem_pet_cpl || 0) + 'đ/lead');
    _setTxt('exTongCPL', 'mTongCPL', formatCurrency(mkt.cpl || 0) + 'đ/lead');

    _setTxt('exDongPhucLeadCnt', 'mDpLeadCnt', (mkt.dong_phuc_leads || 0) + ' lead');
    _setTxt('exTemPetLeadCnt', 'mPetLeadCnt', (mkt.tem_pet_leads || 0) + ' lead');
    _setTxt('exTongLeadCnt', 'mTongLeadCnt', (mkt.lead_count || 0) + ' lead');

    _setTxt('exDongPhucRate', 'mDpRate', (mkt.dong_phuc_close_rate || 0) + '%');
    _setTxt('exTemPetRate', 'mPetRate', (mkt.tem_pet_close_rate || 0) + '%');
    _setTxt('exTongRate', 'mTongRate', (mkt.close_rate || 0) + '%');

    _setTxt('exDongPhucAdsRate', 'mDpAdsRate', (mkt.dong_phuc_ads_close_rate || 0) + '%');
    _setTxt('exTemPetAdsRate', 'mPetAdsRate', (mkt.tem_pet_ads_close_rate || 0) + '%');
    _setTxt('exTongAdsRate', 'mTongAdsRate', (mkt.mkt_ads_close_rate || mkt.close_rate || 0) + '%');

    _setTxt('exDongPhucOldCustRate', 'mDpOldCustRate', (mkt.dong_phuc_old_cust_rate || 0) + '%');
    _setTxt('exTemPetOldCustRate', 'mPetOldCustRate', (mkt.tem_pet_old_cust_rate || 0) + '%');
    _setTxt('exTongOldCustRate', 'mTongOldCustRate', (mkt.old_customer_rate || 0) + '%');

    // --- TOOLTIP CALCULATIONS ON HOVER & TOUCH ---
    const _setTooltip = (id1, id2, text) => {
        if (typeof id2 === 'string' && text === undefined) {
            text = id2;
            id2 = null;
        }
        [id1, id2].forEach(id => {
            if (!id) return;
            const el = document.getElementById(id);
            if (!el) return;
            el.removeAttribute('title');
            el.title = '';
            el.removeAttribute('data-tooltip');
            el.setAttribute('data-calc-text', text);

            el.onmouseenter = (e) => execShowHoverTooltip(e, text);
            el.onmousemove = (e) => execMoveHoverTooltip(e);
            el.onmouseleave = () => execHideHoverTooltip();
            el.ontouchstart = (e) => {
                const touch = e.touches[0];
                execShowHoverTooltip({ clientX: touch.clientX, clientY: touch.clientY }, text);
                setTimeout(() => execHideHoverTooltip(), 3500);
            };

            if (el.parentElement && el.parentElement.tagName === 'DIV') {
                const p = el.parentElement;
                p.removeAttribute('title');
                p.title = '';
                p.removeAttribute('data-tooltip');
                p.setAttribute('data-calc-text', text);
                p.onmouseenter = (e) => execShowHoverTooltip(e, text);
                p.onmousemove = (e) => execMoveHoverTooltip(e);
                p.onmouseleave = () => execHideHoverTooltip();
                p.ontouchstart = (e) => {
                    const touch = e.touches[0];
                    execShowHoverTooltip({ clientX: touch.clientX, clientY: touch.clientY }, text);
                    setTimeout(() => execHideHoverTooltip(), 3500);
                };
            }

            const card = el.closest('.exec-kpi-card') || el.closest('.kpi-card');
            if (card) {
                card.removeAttribute('title');
                card.title = '';
                card.removeAttribute('data-tooltip');
                if (!card.dataset.hasTooltip) {
                    card.dataset.hasTooltip = 'true';
                    card.onmouseenter = (e) => {
                        const curText = el.getAttribute('data-calc-text') || text;
                        execShowHoverTooltip(e, curText);
                    };
                    card.onmousemove = (e) => execMoveHoverTooltip(e);
                    card.onmouseleave = () => execHideHoverTooltip();
                    card.ontouchstart = (e) => {
                        const touch = e.touches[0];
                        const curText = el.getAttribute('data-calc-text') || text;
                        execShowHoverTooltip({ clientX: touch.clientX, clientY: touch.clientY }, curText);
                        setTimeout(() => execHideHoverTooltip(), 3500);
                    };
                }
            }
        });
    };

    // 1. CPO Tooltips
    const dpCPOCalc = `Phép tính CPO Đồng Phục: ${formatCurrency(mkt.dong_phuc_spent || 0)} (Chi Phí QC) ÷ ${exec.dong_phuc_orders || 0} (Số Đơn) = ${formatCurrency(mkt.dong_phuc_cpo || 0)}/đơn`;
    const petCPOCalc = `Phép tính CPO Tem PET: ${formatCurrency(mkt.tem_pet_spent || 0)} (Chi Phí QC) ÷ ${exec.tem_pet_orders || 0} (Số Đơn) = ${formatCurrency(mkt.tem_pet_cpo || 0)}/đơn`;
    const tongCPOCalc = `Phép tính CPO Công Ty: ${formatCurrency(mkt.spent_amount || 0)} (Chi Phí QC) ÷ ${exec.total_orders || 0} (Số Đơn) = ${formatCurrency(mkt.cpo || 0)}/đơn`;
    let mainCPOTitle = tongCPOCalc;
    if (mode === 'dong_phuc') mainCPOTitle = dpCPOCalc;
    else if (mode === 'tem_pet') mainCPOTitle = petCPOCalc;

    _setTooltip('exCPO', 'mCPONum', mainCPOTitle);
    _setTooltip('exDongPhucCPO', 'mDpCPO', dpCPOCalc);
    _setTooltip('exTemPetCPO', 'mPetCPO', petCPOCalc);
    _setTooltip('exTongCPO', 'mTongCPO', tongCPOCalc);

    // 2. % Chi Phí Tooltips
    const dpRatioCalc = `Phép tính % Chi Phí Đồng Phục: (${formatCurrency(mkt.dong_phuc_spent || 0)} ÷ ${formatCurrency(exec.dong_phuc_revenue || 0)}) × 100% = ${mkt.dong_phuc_cost_ratio || 0}%`;
    const petRatioCalc = `Phép tính % Chi Phí Tem PET: (${formatCurrency(mkt.tem_pet_spent || 0)} ÷ ${formatCurrency(exec.tem_pet_revenue || 0)}) × 100% = ${mkt.tem_pet_cost_ratio || 0}%`;
    const tongRatioCalc = `Phép tính % Chi Phí Công Ty: (${formatCurrency(mkt.spent_amount || 0)} ÷ ${formatCurrency(exec.total_revenue || 0)}) × 100% = ${mkt.cost_ratio || 0}%`;
    let mainRatioTitle = tongRatioCalc;
    if (mode === 'dong_phuc') mainRatioTitle = dpRatioCalc;
    else if (mode === 'tem_pet') mainRatioTitle = petRatioCalc;

    _setTooltip('exRatio', 'mRatioNum', mainRatioTitle);
    _setTooltip('exDongPhucRatio', 'mDpRatio', dpRatioCalc);
    _setTooltip('exTemPetRatio', 'mPetRatio', petRatioCalc);
    _setTooltip('exTongRatio', 'mTongRatio', tongRatioCalc);

    // 3. Tỷ Lệ Chốt Tooltips
    const dpRateCalc = `Phép tính Tỷ Lệ Chốt Đồng Phục: (${exec.dong_phuc_orders || 0} đơn ÷ ${mkt.dong_phuc_leads || 0} Lead) × 100% = ${mkt.dong_phuc_close_rate || 0}%`;
    const petRateCalc = `Phép tính Tỷ Lệ Chốt Tem PET: (${exec.tem_pet_orders || 0} đơn ÷ ${mkt.tem_pet_leads || 0} Lead) × 100% = ${mkt.tem_pet_close_rate || 0}%`;
    const tongRateCalc = `Phép tính Tỷ Lệ Chốt Công Ty: (${exec.total_orders || 0} đơn ÷ ${mkt.lead_count || 0} Lead) × 100% = ${mkt.close_rate || 0}%`;
    let mainRateTitle = tongRateCalc;
    if (mode === 'dong_phuc') mainRateTitle = dpRateCalc;
    else if (mode === 'tem_pet') mainRateTitle = petRateCalc;

    _setTooltip('exRate', 'mRateNum', mainRateTitle);
    _setTooltip('exDongPhucRate', 'mDpRate', dpRateCalc);
    _setTooltip('exTemPetRate', 'mPetRate', petRateCalc);
    _setTooltip('exTongRate', 'mTongRate', tongRateCalc);

    // 4. Số Đơn Chốt Tooltips
    const dpOrdersCalc = `Số Đơn Chốt Đồng Phục: ${dpOrders} đơn (loại trừ đơn hủy & gửi mẫu)`;
    const petOrdersCalc = `Số Đơn Chốt Tem PET: ${petOrders} đơn (loại trừ đơn hủy & gửi mẫu)`;
    const tongOrdersCalc = `Tổng Số Đơn Chốt Công Ty: ${exec.total_orders || mkt.closed_orders || 0} đơn (tất cả các mảng)`;
    let mainOrdersTitle = tongOrdersCalc;
    if (mode === 'dong_phuc') mainOrdersTitle = dpOrdersCalc;
    else if (mode === 'tem_pet') mainOrdersTitle = petOrdersCalc;

    _setTooltip('exOrdersNum', 'mOrdersNum', mainOrdersTitle);
    _setTooltip('exDongPhucOrders', 'mDpOrders', dpOrdersCalc);
    _setTooltip('exTemPetOrders', 'mPetOrders', petOrdersCalc);
    _setTooltip('exTongOrders', 'mTongOrders', tongOrdersCalc);

    // 5. Doanh Số Chốt Tooltips
    const dpRevCalc = `Doanh Số Chốt Đồng Phục: ${formatCurrency(dpRev)}`;
    const petRevCalc = `Doanh Số Chốt Tem PET: ${formatCurrency(petRev)}`;
    const tongRevCalc = `Tổng Doanh Số Chốt Công Ty: ${formatCurrency(exec.total_revenue || mkt.revenue || 0)}`;
    let mainRevTitle = tongRevCalc;
    if (mode === 'dong_phuc') mainRevTitle = dpRevCalc;
    else if (mode === 'tem_pet') mainRevTitle = petRevCalc;

    _setTooltip('exRevNum', 'mRevNum', mainRevTitle);
    _setTooltip('exDongPhucRev', 'mDpRev', dpRevCalc);
    _setTooltip('exTemPetRev', 'mPetRev', petRevCalc);
    _setTooltip('exTongRev', 'mTongRev', tongRevCalc);

    // 6. % Khách Cũ Tooltips
    const dpOldCustCalc = `Phép tính % Khách Cũ Đồng Phục: (${exec.dong_phuc_ret_cust || mkt.dong_phuc_ret_cust || 0} KH quay lại ÷ ${exec.dong_phuc_old_pool || mkt.dong_phuc_old_pool || 0} KH cũ đầu kỳ) × 100% = ${mkt.dong_phuc_old_cust_rate || 0}%`;
    const petOldCustCalc = `Phép tính % Khách Cũ Tem PET: (${exec.tem_pet_ret_cust || mkt.tem_pet_ret_cust || 0} KH quay lại ÷ ${exec.tem_pet_old_pool || mkt.tem_pet_old_pool || 0} KH cũ đầu kỳ) × 100% = ${mkt.tem_pet_old_cust_rate || 0}%`;
    const tongOldCustCalc = `Phép tính % Khách Cũ Công Ty: (${exec.total_ret_cust || mkt.total_ret_cust || 0} KH quay lại ÷ ${exec.total_old_pool || mkt.total_old_pool || 0} KH cũ đầu kỳ) × 100% = ${mkt.old_customer_rate || 0}%`;
    let mainOldCustTitle = tongOldCustCalc;
    if (mode === 'dong_phuc') mainOldCustTitle = dpOldCustCalc;
    else if (mode === 'tem_pet') mainOldCustTitle = petOldCustCalc;

    _setTooltip('exOldCustRateNum', 'mOldCustRateNum', mainOldCustTitle);
    _setTooltip('exDongPhucOldCustRate', 'mDpOldCustRate', dpOldCustCalc);
    _setTooltip('exTemPetOldCustRate', 'mPetOldCustRate', petOldCustCalc);
    _setTooltip('exTongOldCustRate', 'mTongOldCustRate', tongOldCustCalc);

    // 7. Số Đơn Ads (MKT) Tooltips
    const dpMktOrdersCalc = `Số Đơn Chốt Từ QC Ads Đồng Phục: ${mkt.dong_phuc_mkt_ads_orders || 0} đơn`;
    const petMktOrdersCalc = `Số Đơn Chốt Từ QC Ads Tem PET: ${mkt.tem_pet_mkt_ads_orders || 0} đơn`;
    const tongMktOrdersCalc = `Tổng Số Đơn Chốt Từ QC Ads Công Ty: ${mkt.mkt_ads_orders || mkt.closed_orders || 0} đơn`;
    let mainMktOrdersTitle = tongMktOrdersCalc;
    if (mode === 'dong_phuc') mainMktOrdersTitle = dpMktOrdersCalc;
    else if (mode === 'tem_pet') mainMktOrdersTitle = petMktOrdersCalc;

    _setTooltip('exMktAdsOrdersNum', 'mMktAdsOrdersNum', mainMktOrdersTitle);
    _setTooltip('exDongPhucMktOrders', 'mDpMktOrders', dpMktOrdersCalc);
    _setTooltip('exTemPetMktOrders', 'mPetMktOrders', petMktOrdersCalc);
    _setTooltip('exTongMktOrders', 'mTongMktOrders', tongMktOrdersCalc);

    // 8. Doanh Số Ads (MKT) Tooltips
    const dpMktRevCalc = `Doanh Số Từ QC Ads Đồng Phục: ${formatCurrency(mkt.dong_phuc_mkt_ads_revenue || 0)}`;
    const petMktRevCalc = `Doanh Số Từ QC Ads Tem PET: ${formatCurrency(mkt.tem_pet_mkt_ads_revenue || 0)}`;
    const tongMktRevCalc = `Tổng Doanh Số Từ QC Ads Công Ty: ${formatCurrency(mkt.mkt_ads_revenue || mkt.revenue || 0)}`;
    let mainMktRevTitle = tongMktRevCalc;
    if (mode === 'dong_phuc') mainMktRevTitle = dpMktRevCalc;
    else if (mode === 'tem_pet') mainMktRevTitle = petMktRevCalc;

    _setTooltip('exMktAdsRevNum', 'mMktAdsRevNum', mainMktRevTitle);
    _setTooltip('exDongPhucMktRev', 'mDpMktRev', dpMktRevCalc);
    _setTooltip('exTemPetMktRev', 'mPetMktRev', petMktRevCalc);
    _setTooltip('exTongMktRev', 'mTongMktRev', tongMktRevCalc);

    // 9. Giá / Đơn Ads (CPO Ads) Tooltips
    const dpCPOAdsCalc = `Phép tính CPO Ads Đồng Phục: ${formatCurrency(mkt.dong_phuc_spent || 0)} (Chi Phí QC) ÷ ${mkt.dong_phuc_mkt_ads_orders || 0} (Đơn Ads) = ${formatCurrency(mkt.dong_phuc_cpo_ads || 0)}/đơn Ads`;
    const petCPOAdsCalc = `Phép tính CPO Ads Tem PET: ${formatCurrency(mkt.tem_pet_spent || 0)} (Chi Phí QC) ÷ ${mkt.tem_pet_mkt_ads_orders || 0} (Đơn Ads) = ${formatCurrency(mkt.tem_pet_cpo_ads || 0)}/đơn Ads`;
    const tongCPOAdsCalc = `Phép tính CPO Ads Công Ty: ${formatCurrency(mkt.spent_amount || 0)} (Chi Phí QC) ÷ ${mkt.mkt_ads_orders || 0} (Đơn Ads) = ${formatCurrency(mkt.cpo_ads || 0)}/đơn Ads`;
    let mainCPOAdsTitle = tongCPOAdsCalc;
    if (mode === 'dong_phuc') mainCPOAdsTitle = dpCPOAdsCalc;
    else if (mode === 'tem_pet') mainCPOAdsTitle = petCPOAdsCalc;

    _setTooltip('exCPOAdsNum', 'mCPOAdsNum', mainCPOAdsTitle);
    _setTooltip('exDongPhucCPOAds', 'mDpCPOAds', dpCPOAdsCalc);
    _setTooltip('exTemPetCPOAds', 'mPetCPOAds', petCPOAdsCalc);
    _setTooltip('exTongCPOAds', 'mTongCPOAds', tongCPOAdsCalc);

    // 10. % Chi Phí / DT Ads Tooltips
    const dpRatioAdsCalc = `Phép tính % Chi Phí Ads Đồng Phục: (${formatCurrency(mkt.dong_phuc_spent || 0)} ÷ ${formatCurrency(mkt.dong_phuc_mkt_ads_revenue || 0)}) × 100% = ${mkt.dong_phuc_cost_ratio_ads || 0}%`;
    const petRatioAdsCalc = `Phép tính % Chi Phí Ads Tem PET: (${formatCurrency(mkt.tem_pet_spent || 0)} ÷ ${formatCurrency(mkt.tem_pet_mkt_ads_revenue || 0)}) × 100% = ${mkt.cost_ratio_ads || 0}%`;
    const tongRatioAdsCalc = `Phép tính % Chi Phí Ads Công Ty: (${formatCurrency(mkt.spent_amount || 0)} ÷ ${formatCurrency(mkt.mkt_ads_revenue || 0)}) × 100% = ${mkt.cost_ratio_ads || 0}%`;
    let mainRatioAdsTitle = tongRatioAdsCalc;
    if (mode === 'dong_phuc') mainRatioAdsTitle = dpRatioAdsCalc;
    else if (mode === 'tem_pet') mainRatioAdsTitle = petRatioAdsCalc;

    _setTooltip('exRatioAdsNum', 'mRatioAdsNum', mainRatioAdsTitle);
    _setTooltip('exDongPhucRatioAds', 'mDpRatioAds', dpRatioAdsCalc);
    _setTooltip('exTemPetRatioAds', 'mPetRatioAds', petRatioAdsCalc);
    _setTooltip('exTongRatioAds', 'mTongRatioAds', tongRatioAdsCalc);

    // 11. Tỷ Lệ Chốt Ads Tooltips
    const dpAdsRateCalc = `Phép tính Tỷ Lệ Chốt Ads Đồng Phục: (${mkt.dong_phuc_mkt_ads_orders || 0} đơn Ads ÷ ${mkt.dong_phuc_leads || 0} Lead) × 100% = ${mkt.dong_phuc_ads_close_rate || 0}%`;
    const petAdsRateCalc = `Phép tính Tỷ Lệ Chốt Ads Tem PET: (${mkt.tem_pet_mkt_ads_orders || 0} đơn Ads ÷ ${mkt.tem_pet_leads || 0} Lead) × 100% = ${mkt.tem_pet_ads_close_rate || 0}%`;
    const tongAdsRateCalc = `Phép tính Tỷ Lệ Chốt Ads Công Ty: (${mkt.mkt_ads_orders || 0} đơn Ads ÷ ${mkt.lead_count || 0} Lead) × 100% = ${mkt.mkt_ads_close_rate || 0}%`;
    let mainAdsRateTitle = tongAdsRateCalc;
    if (mode === 'dong_phuc') mainAdsRateTitle = dpAdsRateCalc;
    else if (mode === 'tem_pet') mainAdsRateTitle = petAdsRateCalc;

    _setTooltip('exAdsRateNum', 'mAdsRateNum', mainAdsRateTitle);
    _setTooltip('exDongPhucAdsRate', 'mDpAdsRate', dpAdsRateCalc);
    _setTooltip('exTemPetAdsRate', 'mPetAdsRate', petAdsRateCalc);
    _setTooltip('exTongAdsRate', 'mTongAdsRate', tongAdsRateCalc);

    // 12. Chi Phí Quảng Cáo Tooltips
    const dpSpentCalc = `Chi phí Marketing QC Đồng Phục: ${formatCurrency(mkt.dong_phuc_spent || 0)}`;
    const petSpentCalc = `Chi phí Marketing QC Tem PET: ${formatCurrency(mkt.tem_pet_spent || 0)}`;
    const tongSpentCalc = `Tổng chi phí Marketing QC Công Ty: ${formatCurrency(mkt.spent_amount || 0)}`;
    let mainSpentTitle = tongSpentCalc;
    if (mode === 'dong_phuc') mainSpentTitle = dpSpentCalc;
    else if (mode === 'tem_pet') mainSpentTitle = petSpentCalc;

    _setTooltip('exSpentNum', 'mSpentNum', mainSpentTitle);
    _setTooltip('exDongPhucSpent', 'mDpSpent', dpSpentCalc);
    _setTooltip('exTemPetSpent', 'mPetSpent', petSpentCalc);
    _setTooltip('exTongSpent', 'mTongSpent', tongSpentCalc);

    // 13. CPL & Lead Tooltips
    const dpCPLCalc = `Phép tính CPL Đồng Phục: ${formatCurrency(mkt.dong_phuc_spent || 0)} (Chi Phí QC) ÷ ${mkt.dong_phuc_leads || 0} (Lead) = ${formatCurrency(mkt.dong_phuc_cpl || 0)}/lead`;
    const petCPLCalc = `Phép tính CPL Tem PET: ${formatCurrency(mkt.tem_pet_spent || 0)} (Chi Phí QC) ÷ ${mkt.tem_pet_leads || 0} (Lead) = ${formatCurrency(mkt.tem_pet_cpl || 0)}/lead`;
    const tongCPLCalc = `Phép tính CPL Công Ty: ${formatCurrency(mkt.spent_amount || 0)} (Chi Phí QC) ÷ ${mkt.lead_count || 0} (Lead) = ${formatCurrency(mkt.cpl || 0)}/lead`;
    let mainCPLTitle = tongCPLCalc;
    if (mode === 'dong_phuc') mainCPLTitle = dpCPLCalc;
    else if (mode === 'tem_pet') mainCPLTitle = petCPLCalc;

    _setTooltip('exCPLNum', 'mCPLNum', mainCPLTitle);
    _setTooltip('exDongPhucCPL', 'mDpCPL', dpCPLCalc);
    _setTooltip('exTemPetCPL', 'mPetCPL', petCPLCalc);
    _setTooltip('exTongCPL', 'mTongCPL', tongCPLCalc);

    const dpLeadCalc = `Số Lead Đồng Phục: ${mkt.dong_phuc_leads || 0} lead MKT`;
    const petLeadCalc = `Số Lead Tem PET: ${mkt.tem_pet_leads || 0} lead MKT`;
    const tongLeadCalc = `Tổng Số Lead Công Ty: ${mkt.lead_count || 0} lead MKT`;
    let mainLeadTitle = tongLeadCalc;
    if (mode === 'dong_phuc') mainLeadTitle = dpLeadCalc;
    else if (mode === 'tem_pet') mainLeadTitle = petLeadCalc;

    _setTooltip('exLeadNum', 'mLeadNum', mainLeadTitle);
    _setTooltip('exDongPhucLeadCnt', 'mDpLeadCnt', dpLeadCalc);
    _setTooltip('exTemPetLeadCnt', 'mPetLeadCnt', petLeadCalc);
    _setTooltip('exTongLeadCnt', 'mTongLeadCnt', tongLeadCalc);

    // ★ Auto-render charts with default "both" (Doanh Thu + Số Đơn) selected on page load
    if (!window._hasUserInteractedTrendMode) {
        window._execSelectedTrendModes = new Set(['revenue', 'orders']);
        window._execTrendMode = 'both';
    }
    _updateTrendModeButtonsUI();
    if (typeof Chart !== 'undefined') {
        _renderExecCharts();
    }
}

function _formatGlobalStatusLabel(st) {
    if (!st) return 'Chưa xác định';
    const statusMap = {
        'moi': 'Mới',
        'dang_tu_van': 'Đang tư vấn',
        'chot_don': 'Chốt đơn',
        'gui_mau': 'Gửi mẫu',
        'san_xuat': 'Sản xuất',
        'hoan_thanh': 'Hoàn thành',
        'huy': 'Hủy',
        'da_thu_tien': 'Đã thu tiền'
    };
    return statusMap[st] || st;
}

function _renderExecCharts() {
    if (!_dashData || !window.Chart) return;
    const charts = _dashData.charts || {};

    // 1. Trend Chart
    ['exChartTrend', 'chartTrend'].forEach(canvasId => {
        const trendCtx = document.getElementById(canvasId)?.getContext('2d');
        if (trendCtx) {
            if (_dashCharts[canvasId]) _dashCharts[canvasId].destroy();
            const trendData = charts.revenue_trend || { labels: [], revenue: [], orders: [] };

            const selected = window._execSelectedTrendModes || new Set(['revenue', 'orders']);
            let datasets = [];
            let scalesConfig = {};

            let hasCurrency = false;
            let hasOrders = false;
            let hasPct = false;

            if (selected.has('revenue')) {
                hasCurrency = true;
                datasets.push({
                    label: 'Doanh Thu (VNĐ)',
                    data: trendData.revenue || [],
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                    yAxisID: 'yRev',
                    fill: selected.size === 1,
                    tension: 0.3,
                    borderWidth: 2.5
                });
            }
            if (selected.has('cpo')) {
                hasCurrency = true;
                datasets.push({
                    label: 'Giá/Đơn CPO (đ/đơn)',
                    data: trendData.cpo || [],
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(220, 38, 38, 0.08)',
                    yAxisID: 'yRev',
                    fill: selected.size === 1,
                    tension: 0.3,
                    borderWidth: 2.5
                });
            }
            if (selected.has('cpo_ads')) {
                hasCurrency = true;
                datasets.push({
                    label: 'Giá/Đơn Ads (đ/đơn Ads)',
                    data: trendData.cpo_ads || [],
                    borderColor: '#e11d48',
                    backgroundColor: 'rgba(225, 29, 72, 0.08)',
                    yAxisID: 'yRev',
                    fill: selected.size === 1,
                    tension: 0.3,
                    borderWidth: 2.5
                });
            }
            if (selected.has('orders')) {
                hasOrders = true;
                datasets.push({
                    label: 'Số Đơn Hàng',
                    data: trendData.orders || [],
                    borderColor: '#16a34a',
                    backgroundColor: 'rgba(22, 163, 74, 0.08)',
                    yAxisID: 'yOrd',
                    fill: selected.size === 1,
                    tension: 0.3,
                    borderWidth: 2.5
                });
            }
            if (selected.has('close_rate')) {
                hasPct = true;
                datasets.push({
                    label: 'Tỷ Lệ % Chốt MKT (%)',
                    data: trendData.close_rate || [],
                    borderColor: '#ea580c',
                    backgroundColor: 'rgba(234, 88, 12, 0.08)',
                    yAxisID: 'yPct',
                    fill: selected.size === 1,
                    tension: 0.3,
                    borderWidth: 2.5
                });
            }
            if (selected.has('ads_close_rate')) {
                hasPct = true;
                datasets.push({
                    label: 'Tỷ Lệ % Chốt Ads (%)',
                    data: trendData.ads_close_rate || [],
                    borderColor: '#d97706',
                    backgroundColor: 'rgba(217, 119, 6, 0.08)',
                    yAxisID: 'yPct',
                    fill: selected.size === 1,
                    tension: 0.3,
                    borderWidth: 2.5
                });
            }
            if (selected.has('old_cust_rate')) {
                hasPct = true;
                datasets.push({
                    label: 'Tỷ Lệ % Khách Cũ Quay Lại (%)',
                    data: trendData.old_cust_rate || [],
                    borderColor: '#c026d3',
                    backgroundColor: 'rgba(192, 38, 211, 0.08)',
                    yAxisID: 'yPct',
                    fill: selected.size === 1,
                    tension: 0.3,
                    borderWidth: 2.5
                });
            }

            if (hasCurrency) {
                scalesConfig.yRev = {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: { callback: v => (v >= 1e6 ? (v/1e6).toFixed(1) + 'M' : (v >= 1e3 ? (v/1e3).toFixed(0) + 'k' : v)) + 'đ' }
                };
            }
            if (hasOrders) {
                scalesConfig.yOrd = {
                    type: 'linear',
                    display: true,
                    position: hasCurrency ? 'right' : 'left',
                    grid: { drawOnChartArea: !hasCurrency },
                    ticks: { precision: 0, callback: v => v + ' đơn' }
                };
            }
            if (hasPct) {
                scalesConfig.yPct = {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: !(hasCurrency || hasOrders) },
                    ticks: { callback: v => v + '%' }
                };
            }

            // Update Stat Badge in header
            ['exTrendStatBadge', 'mTrendStatBadge'].forEach(statId => {
                const statBadgeEl = document.getElementById(statId);
                if (statBadgeEl) {
                    const overallSummary = trendData.overall_summary || {};
                    const mktSummary = _dashData.marketing || {};
                    const segMode = window._execSegmentMode || 'dong_phuc';
                    const selectedArr = Array.from(selected);

                    if (selectedArr.length === 1) {
                        const k = selectedArr[0];
                        let valStr = '';
                        if (k === 'revenue') valStr = `📌 Tổng Doanh Thu: ${formatCurrency((trendData.revenue || []).reduce((a, b) => a + b, 0))}`;
                        else if (k === 'orders') valStr = `📌 Tổng Số Đơn: ${(trendData.orders || []).reduce((a, b) => a + b, 0)} đơn`;
                        else if (k === 'cpo') valStr = `📌 CPO Tổng Cả Kỳ: ${formatCurrency(overallSummary.cpo ?? (segMode === 'dong_phuc' ? mktSummary.dong_phuc_cpo : mktSummary.cpo))}`;
                        else if (k === 'cpo_ads') valStr = `📌 CPO Ads Cả Kỳ: ${formatCurrency(overallSummary.cpo_ads ?? (segMode === 'dong_phuc' ? mktSummary.dong_phuc_cpo_ads : mktSummary.cpo_ads))}`;
                        else if (k === 'close_rate') valStr = `📌 % Chốt Cả Kỳ: ${overallSummary.close_rate ?? (segMode === 'dong_phuc' ? mktSummary.dong_phuc_close_rate : mktSummary.close_rate)}%`;
                        else if (k === 'ads_close_rate') valStr = `📌 % Chốt Ads Cả Kỳ: ${overallSummary.ads_close_rate ?? (segMode === 'dong_phuc' ? mktSummary.dong_phuc_ads_close_rate : mktSummary.mkt_ads_close_rate)}%`;
                        else if (k === 'old_cust_rate') valStr = `📌 % Khách Cũ Cả Kỳ: ${overallSummary.old_customer_rate ?? (segMode === 'dong_phuc' ? mktSummary.dong_phuc_old_cust_rate : mktSummary.old_customer_rate)}%`;
                        statBadgeEl.innerText = valStr;
                    } else {
                        statBadgeEl.innerText = `📌 Đã bật ${selectedArr.length} đường chỉ số cùng lúc`;
                    }
                }
            });

            _dashCharts[canvasId] = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: trendData.labels || [],
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    onClick: (evt, elements) => {
                        execOpenTrendExpandModal();
                    },
                    plugins: {
                        legend: { display: datasets.length > 1, position: 'top' },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) label += ': ';
                                    if (context.parsed.y !== null) {
                                        const val = context.parsed.y;
                                        const yId = context.dataset.yAxisID;
                                        if (yId === 'yRev') {
                                            label += formatCurrency(val);
                                        } else if (yId === 'yPct') {
                                            label += val + '%';
                                        } else if (yId === 'yOrd') {
                                            label += val + ' đơn';
                                        } else {
                                            label += val;
                                        }
                                    }
                                    return label;
                                }
                            }
                        }
                    },
                    scales: scalesConfig
                }
            });
        }
    });

    // 2. Status Chart
    const statusCtx = document.getElementById('exChartStatus')?.getContext('2d');
    if (statusCtx) {
        if (_dashCharts.status) _dashCharts.status.destroy();
        const statusList = charts.order_statuses || [];
        _dashCharts.status = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: statusList.map(s => _formatGlobalStatusLabel(s.label || s.status)),
                datasets: [{
                    data: statusList.map(s => s.count),
                    backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#6366f1', '#ef4444', '#94a3b8', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#a855f7']
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                onClick: (evt, elements) => {
                    if (elements && elements.length > 0) {
                        const idx = elements[0].index;
                        const stObj = statusList[idx];
                        const statusLabel = _formatGlobalStatusLabel(stObj?.label || stObj?.status || '');
                        const statusCode = stObj?.status || 'all';
                        execShowOrdersModal(null, null, null, `🍩 Báo Cáo Chi Tiết Đơn Hàng — Trạng Thái: ${statusLabel}`, statusCode);
                    } else {
                        execShowOrdersModal(null, null, null, '🍩 Chi Tiết Cơ Cấu Trạng Thái Đơn Hàng');
                    }
                },
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: { weight: 'bold' } } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const val = context.parsed || 0;
                                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                                return ` ${context.label}: ${val} đơn (${pct}%) — Bấm để xem chi tiết`;
                            }
                        }
                    }
                }
            }
        });
    }

    // 3. Top Products Chart
    const prodCtx = document.getElementById('exChartTopProd')?.getContext('2d');
    if (prodCtx) {
        if (_dashCharts.prod) _dashCharts.prod.destroy();
        const topProds = charts.top_products || [];
        _dashCharts.prod = new Chart(prodCtx, {
            type: 'bar',
            data: {
                labels: topProds.map(p => p.name),
                datasets: [{
                    label: 'Doanh Thu',
                    data: topProds.map(p => p.revenue),
                    backgroundColor: '#f59e0b', borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { ticks: { callback: v => (v >= 1e6 ? (v/1e6).toFixed(1) + 'M' : v) } } }
            }
        });
    }

    // 4. Top Customers Chart
    const custCtx = document.getElementById('exChartTopCust')?.getContext('2d');
    if (custCtx) {
        if (_dashCharts.cust) _dashCharts.cust.destroy();
        const topCusts = charts.top_customers || [];
        _dashCharts.cust = new Chart(custCtx, {
            type: 'bar',
            data: {
                labels: topCusts.map(c => c.name),
                datasets: [{
                    label: 'Doanh Thu',
                    data: topCusts.map(c => c.revenue),
                    backgroundColor: '#6366f1', borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                onClick: (evt, elements) => {
                    if (elements && elements.length > 0) {
                        const idx = elements[0].index;
                        const custName = topCusts[idx]?.name;
                        if (custName) {
                            execShowOrdersModal(null, null, custName, `👑 Báo Cáo Khách Hàng VIP - ${custName}`);
                        }
                    } else {
                        execShowOrdersModal(null, null, null, '👑 Top Khách Hàng Tiêu Biểu (VIP)');
                    }
                },
                plugins: { legend: { display: false } },
                scales: { x: { ticks: { callback: v => (v >= 1e6 ? (v/1e6).toFixed(1) + 'M' : v) } } }
            }
        });
    }

    // 5. Top Sales Chart
    const salesCtx = document.getElementById('exChartTopSales')?.getContext('2d');
    if (salesCtx) {
        if (_dashCharts.sales) _dashCharts.sales.destroy();
        const topSalesList = charts.top_sales || [];
        _dashCharts.sales = new Chart(salesCtx, {
            type: 'bar',
            data: {
                labels: topSalesList.map(s => s.name),
                datasets: [{
                    label: 'Doanh Thu',
                    data: topSalesList.map(s => s.revenue),
                    backgroundColor: '#10b981', borderRadius: 6
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                onClick: (evt, elements) => {
                    if (elements && elements.length > 0) {
                        const idx = elements[0].index;
                        const staffName = topSalesList[idx]?.name;
                        if (staffName) {
                            execShowOrdersModal(null, staffName, null, `🏆 Báo Cáo Doanh Thu Nhân Viên - ${staffName}`);
                        }
                    } else {
                        execShowOrdersModal(null, null, null, '🏆 Doanh Thu Theo Nhân Viên Bán Hàng');
                    }
                },
                plugins: { legend: { display: false } },
                scales: { y: { ticks: { callback: v => (v >= 1e6 ? (v/1e6).toFixed(1) + 'M' : v) } } }
            }
        });
    }
}

// ========== CONVENTION-BASED AUTO-RENDER ==========
// Registry cho các trang có tên hàm KHÔNG theo convention
// Key = page id (từ MENU_CONFIG), Value = tên hàm init
var _PAGE_INIT_REGISTRY = {
    'quytrinhcuochop': 'initQuyTrinhCuocHop',
    'quy-trinh-cuoc-hop': 'initQuyTrinhCuocHop',
    'camketcuochop': 'renderCamketcuochopPage',
    'cam-ket-cuoc-hop': 'renderCamketcuochopPage',
    'bangcongviec': 'renderBangcongviecPage',
    'bang-cong-viec': 'renderBangcongviecPage',
    'bang_cong_viec': 'renderBangcongviecPage',
    'bangcongviec/hoanthanh': 'renderBangcongviecPage',
    'bang-cong-viec/hoan-thanh': 'renderBangcongviecPage',
    'bang_cong_viec/hoan_thanh': 'renderBangcongviecPage',
    'tong-doanh-so-sale': 'renderTongdoanhsosalePage',
    'tongdoansosale': 'renderTongdoanhsosalePage',
    'ngansachmkt': 'renderNgansachmktPage',
    'ngan-sach-mkt': 'renderNgansachmktPage',
    'gia-nhap-goc': 'renderGiaNhapGocPage',
    'gianhapgoc': 'renderGiaNhapGocPage',
    'bao-gia-goc': 'renderBaogiagocPage',
    'baogiagoc': 'renderBaogiagocPage',
    'bao-gia-ctv-hh': 'renderBaogiactvhhPage',
    'baogiactvhh': 'renderBaogiactvhhPage',
    'm/baogiagoc': 'renderBaogiagocPage',
    'm-baogiagoc': 'renderBaogiagocPage',
    'm/bao-gia-goc': 'renderBaogiagocPage',
    'm-bao-gia-goc': 'renderBaogiagocPage',
    'luong-san-xuat': 'renderLuongSanXuatPage',
    'luongsanxuat': 'renderLuongSanXuatPage',
    'nhantintimdoitackh': '_poInit',
    'addcmtdoitackh': '_acInit',
    'dangvideo': '_dlInit',
    'dangcontent': '_dlInit',
    'danggruop': '_dlInit',
    'seddingcongdong': '_dlInit',
    'dangbanthansp': '_dlInit',
    'tuyendungsvkd': '_dlInit',
    'don-khach-sll': '_dkInit',
    'donkhachsll': '_dkInit',
    'don-khach-nhieu-lan': '_dnlInit',
    'donkhachnhieulan': '_dnlInit',
    'don-khach-moi': '_dkmInit',
    'donkhachmoi': '_dkmInit',
    'don-quan-he': '_dqhInit',
    'donquanhe': '_dqhInit',
    'loithuonggap': 'renderLoithuonggapPage',
    'loi-thuong-gap': 'renderLoithuonggapPage',
    'xuatvaicat': 'renderXuatvaicatPage',
    'chuanbiqlx': 'renderQuanlyxuongqlxPage',
    'taophieudonhang': 'renderTaophieudonhangPage',
    'tao-phieu-don-hang': 'renderTaophieudonhangPage',
    'don-hang-tong': 'renderDonhangtongPage',
    'donhangtong': 'renderDonhangtongPage',
    'xuatvathv': 'renderXuatvathvPage',
    'xuat-hoa-don-vat': 'renderXuatvathvPage',
    'design-draft': 'renderDesignDraftPage',
    'khuyenmaigiamgia': 'renderKhuyenMaiPage',
    'bosuutap': 'renderBosuutapPage',
    'bo-suu-tap': 'renderBosuutapPage',
    'timgrzalovathongke': '_zlInit',
    'hethongphanchiagrzalo': '_zpInit',
    'caidatsanxuat': 'renderCaidatsanxuatPage',
    'chuyen-so': 'renderChuyenSoPage',
    'chuyenso': 'renderChuyenSoPage',
    'chuyensosale': 'renderChuyensosalePage',
    'bo-phan-in': 'renderBophaninPage',
    'bophanin': 'renderBophaninPage',
    'bophaninhv': 'renderBophaninPage',
    'bo-phan-cat': 'renderBophancatPage',
    'bophancat': 'renderBophancatPage',
    'bophancathv': 'renderBophancatPage',
    'bo-phan-ep': 'renderBophanepPage',
    'bophanep': 'renderBophanepPage',
    'bophanephv': 'renderBophanepPage',
    'bo-phan-may': 'renderBophanmayPage',
    'bophanmay': 'renderBophanmayPage',
    'bophanmayhv': 'renderBophanmayPage',
    'bo-phan-hoan-thien': 'renderBophanhoanthienPage',
    'bophanhoanthien': 'renderBophanhoanthienPage',
    'bophanhoanthienhv': 'renderBophanhoanthienPage',
    'chinhsachkhhv': 'renderChinhsachkhhvPage',
    'chinh-sach-kh': 'renderChinhsachkhhvPage',
    'chuongtrinhkhhv': 'renderChuongtrinhkhhvPage',
    'chuong-trinh-kh': 'renderChuongtrinhkhhvPage',
    'thongkeads': 'renderThongkeadsPage',
    'thong-ke-ads': 'renderThongkeadsPage',
    'caidattkads': 'renderCaidattaikhoanadsPage',
    'caidattaikhoanads': 'renderCaidattaikhoanadsPage',
    'gioihanchitieu': 'renderGioihanchitieuPage',
    'gioi-han-chi-tieu': 'renderGioihanchitieuPage',
    'hengiobatcamp': 'renderHengiobatcampPage',
    'hen-gio-bat-camp': 'renderHengiobatcampPage',
    'daotaosalekd': 'renderXulydonloihvPage',
    'xulydonloihv': 'renderXulydonloihvPage',
    'xu-ly-don-loi': 'renderXulydonloihvPage',
};

function _tryAutoRenderPage(pageId, content) {
    // 1. Check registry first (pages with non-standard function names)
    var registryFn = _PAGE_INIT_REGISTRY[pageId];
    if (registryFn && typeof window[registryFn] === 'function') {
        console.log('[AutoRender] ✅ Found via registry:', pageId, '→', registryFn);
        content.innerHTML = '';
        setTimeout(function(){ window[registryFn](content); }, 50);
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
        setTimeout(function(){ window[initName](content); }, 50);
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

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/';
        });
    }

    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', () => {
            showChangePasswordModal();
        });
    }

    const modalClose = document.getElementById('modalClose');
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            if (typeof window._dhtRestoreModalFn === 'function') {
                const restore = window._dhtRestoreModalFn;
                window._dhtRestoreModalFn = null;
                restore();
            } else {
                closeModal();
            }
        });
    }

    window.addEventListener('hashchange', handleRoute);

    // Mobile: close sidebar when tapping overlay
    var sidebarOverlay = document.getElementById('sidebarOverlay');
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function() {
            _sidebarOpen = false;
            var sb = document.getElementById('sidebar');
            if (sb) { sb.classList.remove('open'); sb.style.cssText = ''; }
            sidebarOverlay.classList.remove('show');
            sidebarOverlay.style.cssText = '';
        });
    }
}

// ========== MODAL ==========
function openModal(title, bodyHTML, footerHTML = '', forcePopup = false) {
    const header = document.querySelector('#modalContainer .modal-header');
    const footer = document.getElementById('modalFooter');
    if (header) header.style.display = '';
    if (footer) footer.style.display = '';

    if (window._dhtFullPageMode && window._dhtFullPageContainer && !forcePopup) {
        const isDesignDraft = window.location.href.includes('design-draft');
        window._dhtFullPageContainer.innerHTML = `
            <div class="card dht-design-card" style="margin: 0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; background: #fff; overflow: hidden; animation: fadeInUp 0.4s ease;">
                <div class="card-header dht-design-header" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 18px 24px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e293b;">
                    <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #fbbf24; text-shadow: 0 1px 2px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 8px;">
                        🎨 ${title}
                    </h3>
                    <button class="btn btn-secondary btn-sm" onclick="${isDesignDraft ? 'renderDesignDraftPage(window._dhtFullPageContainer)' : 'closeModal()'}" style="padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; cursor: pointer; transition: all 0.2s;">
                        ← Quay lại
                    </button>
                </div>
                <div class="card-body dht-design-body" style="padding: 24px; color: #1e293b; max-height: unset; overflow-y: visible;">
                    ${bodyHTML}
                </div>
                <div class="card-footer dht-design-footer" style="padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; border-radius: 0 0 16px 16px;">
                    ${footerHTML}
                </div>
            </div>
        `;
        document.getElementById('modalOverlay').classList.remove('show');
        return;
    }
    document.getElementById('modalTitle').innerHTML = title;
    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modalFooter').innerHTML = footerHTML;
    document.getElementById('modalOverlay').classList.add('show');
}

function showModal(html) {
    const header = document.querySelector('#modalContainer .modal-header');
    const footer = document.getElementById('modalFooter');
    if (header) header.style.display = 'none';
    if (footer) footer.style.display = 'none';
    
    document.getElementById('modalTitle').innerHTML = '';
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modalFooter').innerHTML = '';
    
    const container = document.getElementById('modalContainer');
    if (container) {
        container.style.maxWidth = '600px';
        container.style.width = '90%';
    }
    
    document.getElementById('modalOverlay').classList.add('show');
}

function closeModal() {
    const header = document.querySelector('#modalContainer .modal-header');
    const footer = document.getElementById('modalFooter');
    if (header) header.style.display = '';
    if (footer) footer.style.display = '';

    var overlay = document.getElementById('modalOverlay');
    if (overlay && overlay.classList.contains('show')) {
        overlay.classList.remove('show');
        var container = document.getElementById('modalContainer');
        if (container) {
            container.classList.remove('modal-dark');
            container.style.maxWidth = '';
            container.style.width = '';
        }
        return;
    }
    if (window._dhtFullPageMode) {
        window._dhtFullPageMode = false;
        window._dhtFullPageContainer = null;
        if (window.history.length > 1) {
            window.history.back();
        } else {
            navigate('taophieudonhang');
        }
        return;
    }
    if (overlay) overlay.classList.remove('show');
    var container = document.getElementById('modalContainer');
    if (container) {
        container.classList.remove('modal-dark');
        container.style.maxWidth = '';
        container.style.width = '';
    }
}

// ========== TOAST ==========
function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;display:flex;flex-direction:column;gap:8px;max-width:420px;pointer-events:none;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = 'pointer-events:auto;white-space:pre-line;word-break:break-word;padding:12px 16px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-size:13px;line-height:1.4;font-weight:600;' +
        (type === 'error' ? 'background:#ef4444;color:#fff;' : type === 'warning' ? 'background:#f59e0b;color:#fff;' : 'background:#10b981;color:#fff;');
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), type === 'error' ? 6000 : 3500);
}

// ========== DELETE IMPACT CONFIRM POPUP ==========
function _showDeleteImpact(opts) {
    // opts: { code, amount, impacts[], onConfirm }
    return new Promise(function(resolve) {
        var overlay = document.createElement('div');
        overlay.id = '_delImpactOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:999999;display:flex;align-items:center;justify-content:center;animation:_diiFadeIn .25s ease';

        var amtStr = opts.amount ? Number(opts.amount).toLocaleString('vi-VN') + 'đ' : '';
        var impactHTML = '';
        if (opts.impacts && opts.impacts.length) {
            impactHTML = '<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:14px 16px;margin:14px 0">'
                + '<div style="font-weight:800;color:#92400e;font-size:13px;margin-bottom:8px">⚠️ SỔ SÁCH BỊ ẢNH HƯỞNG</div>';
            opts.impacts.forEach(function(i) {
                impactHTML += '<div style="padding:6px 0;border-top:1px solid rgba(245,158,11,0.2)">'
                    + '<div style="font-weight:700;color:#78350f;font-size:12px">' + i.module + '</div>'
                    + '<div style="color:#92400e;font-size:11px;margin-top:2px">→ ' + i.detail + '</div>'
                    + '<div style="color:#b45309;font-size:11px">→ ' + i.effect + '</div>'
                    + '</div>';
            });
            impactHTML += '</div>';
        } else {
            impactHTML = '<div style="background:#d1fae5;border:1px solid #34d399;border-radius:10px;padding:12px 16px;margin:14px 0;color:#065f46;font-size:12px;font-weight:600">✅ Không ảnh hưởng sổ sách khác</div>';
        }

        overlay.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:420px;width:92%;box-shadow:0 25px 60px rgba(0,0,0,0.3);animation:_diiScaleIn .3s cubic-bezier(0.34,1.56,0.64,1);overflow:hidden">'
            + '<div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:18px 24px;text-align:center">'
            + '<div style="font-size:36px;margin-bottom:4px">🗑️</div>'
            + '<div style="color:#fff;font-size:16px;font-weight:800">XÓA MÃ TIỀN</div>'
            + '</div>'
            + '<div style="padding:20px 24px">'
            + '<div style="text-align:center;margin-bottom:12px">'
            + '<div style="font-size:15px;font-weight:800;color:#1e293b">' + (opts.code || '') + '</div>'
            + (amtStr ? '<div style="font-size:20px;font-weight:900;color:#dc2626;margin-top:4px">' + amtStr + '</div>' : '')
            + '</div>'
            + impactHTML
            + '<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:10px 14px;text-align:center;margin-top:8px">'
            + '<span style="color:#991b1b;font-size:12px;font-weight:700">❌ Hành động này KHÔNG thể hoàn tác!</span>'
            + '</div>'
            + '<div style="display:flex;gap:10px;margin-top:18px">'
            + '<button id="_diiCancel" style="flex:1;padding:10px;border:2px solid #e2e8f0;background:#f8fafc;color:#475569;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s">Huỷ bỏ</button>'
            + '<button id="_diiConfirm" style="flex:1;padding:10px;border:none;background:linear-gradient(135deg,#dc2626,#991b1b);color:#fff;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(220,38,38,0.4);transition:all .15s">🗑️ Xác nhận XÓA</button>'
            + '</div>'
            + '</div></div>';

        if (!document.getElementById('_diiStyles')) {
            var st = document.createElement('style');
            st.id = '_diiStyles';
            st.textContent = '@keyframes _diiFadeIn{from{opacity:0}to{opacity:1}}@keyframes _diiScaleIn{from{transform:scale(.7);opacity:0}to{transform:scale(1);opacity:1}}';
            document.head.appendChild(st);
        }

        document.body.appendChild(overlay);

        function cleanup(result) {
            overlay.style.animation = '_diiFadeIn .2s ease reverse';
            setTimeout(function(){ overlay.remove(); }, 200);
            resolve(result);
        }

        overlay.querySelector('#_diiCancel').onclick = function(){ cleanup(false); };
        overlay.querySelector('#_diiConfirm').onclick = function(){ cleanup(true); };
        overlay.addEventListener('click', function(e){ if(e.target === overlay) cleanup(false); });
    });
}

// ========== GLOBAL: Mask phone number for privacy ==========
// GĐ + QLCC → always full. Owner → full. Others → 09******94
function _maskPhone(phone, ownerId) {
    if (!phone || phone.length < 4) return phone || '—';
    if (typeof currentUser !== 'undefined' && currentUser && ['giam_doc', 'quan_ly_cap_cao'].includes(currentUser.role)) return phone;
    if (ownerId && typeof currentUser !== 'undefined' && currentUser && currentUser.id === ownerId) return phone;
    return phone.substring(0, 2) + '*'.repeat(phone.length - 4) + phone.substring(phone.length - 2);
}
function _isPhoneMasked(phone, ownerId) {
    if (!phone || phone.length < 4) return true;
    if (typeof currentUser !== 'undefined' && currentUser && ['giam_doc', 'quan_ly_cap_cao'].includes(currentUser.role)) return false;
    if (ownerId && typeof currentUser !== 'undefined' && currentUser && currentUser.id === ownerId) return false;
    return true;
}

// ========== GLOBAL: Copy text to clipboard (dùng chung cho tất cả CRM modules) ==========
function _crmCopyText(text, el, label) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        // Visual feedback: change icon
        if (el) {
            const orig = el.textContent;
            el.textContent = '✅';
            el.style.color = '#10b981';
            setTimeout(() => { el.textContent = orig; el.style.color = ''; }, 1500);
        }
        if (typeof showToast === 'function') showToast('📋 Đã copy: ' + (label || text));
    }).catch(() => {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        if (el) {
            const orig = el.textContent;
            el.textContent = '✅';
            el.style.color = '#10b981';
            setTimeout(() => { el.textContent = orig; el.style.color = ''; }, 1500);
        }
        if (typeof showToast === 'function') showToast('📋 Đã copy: ' + (label || text));
    });
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

// ========== GLOBAL UTILITIES ==========
if (typeof window.escapeHTML !== 'function') {
    window.escapeHTML = function(str) {
        if (!str) return '';
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
    };
}

// ========== API HELPER ==========
async function apiCall(url, method = 'GET', body = null) {
    if (typeof method === 'object' && method !== null) {
        body = method.body || null;
        method = method.method || 'GET';
    }
    console.log("[apiCall LOG] url:", url, "body:", body, "typeof body:", typeof body, "isFormData:", body && (body instanceof FormData), "hasAppend:", body && typeof body.append);
    let finalUrl = url;
    if (String(method).toUpperCase() === 'GET') {
        const separator = url.includes('?') ? '&' : '?';
        finalUrl = url + separator + '_=' + Date.now();
    }
    const token = localStorage.getItem('token');
    const headers = {};
    if (token && token.length > 20) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const options = { method, credentials: 'include', headers };
    if (body && typeof body.append === 'function') {
        options.body = body;
    } else if (body) {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }
    const res = await fetch(finalUrl, options);
    let data = {};
    try {
        data = await res.json();
    } catch (jsonErr) {
        throw new Error('Lỗi phản hồi máy chủ. Vui lòng bấm Thử lại.');
    }
    if (!res.ok) {
        const err = new Error(data.error || data.message || ('Lỗi HTTP ' + res.status));
        err.status = res.status;
        err.data = data;
        err.warn_existing_deposit = data.warn_existing_deposit;
        throw err;
    }
    return data;
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

// Build customer code: dailyNum-day-month (uses effective_date for cutoff logic)
function getCustomerCode(customer) {
    const d = new Date(customer.effective_date || customer.created_at || customer.handover_date);
    const yearSuffix = 'Y' + String(d.getFullYear()).slice(-2);
    return `${customer.daily_order_number || 0}-${d.getDate()}-${d.getMonth() + 1}-${yearSuffix}`;
}

// Build UID badge: ẩn trên giao diện (UID chỉ dùng nội bộ hệ thống)
function getCustomerUidBadge(customer, opts) {
    return '';
}

// ========== SIDEBAR TOGGLE ==========
var _sidebarOpen = false;
function toggleSidebar(forceMode) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    // Detect mobile: viewport ≤ 768px
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        // Mobile: slide-in/out with overlay
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

    // Desktop: toggle icon-only collapsed mode
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('sidebarPanelCollapsed', isCollapsed ? '1' : '0');
}

// Restore sidebar panel state on load
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('sidebarPanelCollapsed') === '1') {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) { sidebar.classList.add('collapsed'); }
    }
    // Migrate old key if present (avoid stale '1'/'0' in sidebarCollapsed)
    var oldVal = localStorage.getItem('sidebarCollapsed');
    if (oldVal === '1' || oldVal === '0') {
        localStorage.setItem('sidebarPanelCollapsed', oldVal);
        localStorage.removeItem('sidebarCollapsed');
    }
    // Check birthday after small delay (skip for affiliate accounts)
    const AFFILIATE_ROLES_BD = ['tkaffiliate', 'hoa_hong', 'ctv', 'nuoi_duong', 'sinh_vien'];
    if (!currentUser || !AFFILIATE_ROLES_BD.includes(currentUser.role)) {
        setTimeout(checkBirthdayToday, 2000);
    }
});

// Global Event Delegation for Sidebar / Mobile Menu Toggles
document.addEventListener('click', function(e) {
    var target = e.target;
    var toggleBtn = target.closest('#menuToggle, .menu-toggle, #sidebarToggleBtn, .sidebar-toggle-btn');
    if (toggleBtn) {
        e.preventDefault();
        if (typeof toggleSidebar === 'function') {
            toggleSidebar();
        }
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
    const SOURCE_COLOR = { 'CV Khóa': '#dc2626', 'CV Chuỗi': '#7c3aed', 'CV Điểm': '#2563eb', 'Hỗ trợ NV': '#d97706', 'Cấp Cứu Sếp': '#ef4444', 'KH Chưa XL': '#e11d48', 'KH Trễ': '#f97316' };
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

// ========== TIME OVERRIDE — Chỉnh giờ hệ thống (chỉ GĐ) ==========
var _toOpen = false;
function _toToggle(e) {
    if (e) e.stopPropagation();
    _toOpen = !_toOpen;
    var dd = document.getElementById('toDropdown');
    dd.style.display = _toOpen ? 'block' : 'none';
    if (_toOpen) _toLoadState();
}

async function _toLoadState() {
    try {
        var data = await apiCall('/api/admin/time-override');
        var dateEl = document.getElementById('toDate');
        var timeEl = document.getElementById('toTime');
        var label = document.getElementById('toCurrentLabel');
        var badge = document.getElementById('toBadge');
        var btn = document.getElementById('timeOverrideBtn');
        var statusEl = document.getElementById('toStatus');

        if (data.enabled && data.datetime) {
            var d = new Date(data.datetime);
            dateEl.value = data.datetime.split('T')[0];
            timeEl.value = data.datetime.split('T')[1]?.substring(0, 5) || '23:45';
            label.textContent = d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
            label.style.color = '#dc2626';
            document.getElementById('toCurrentTime').style.background = '#fef2f2';
            document.getElementById('toCurrentTime').style.borderColor = '#fecaca';
            document.getElementById('toCurrentTime').querySelector('div').textContent = '⚡ GIỜ OVERRIDE';
            document.getElementById('toCurrentTime').querySelector('div').style.color = '#dc2626';
            badge.style.display = 'inline-block';
            btn.style.background = 'linear-gradient(135deg,#dc2626,#ef4444)';
            statusEl.textContent = '⚡ Override đang bật — hệ thống dùng giờ tùy chỉnh';
            statusEl.style.color = '#dc2626';
        } else {
            var now = new Date();
            var vnStr = now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
            label.textContent = vnStr;
            label.style.color = '#15803d';
            document.getElementById('toCurrentTime').style.background = '#f0fdf4';
            document.getElementById('toCurrentTime').style.borderColor = '#bbf7d0';
            document.getElementById('toCurrentTime').querySelector('div').textContent = 'Giờ hiện tại';
            document.getElementById('toCurrentTime').querySelector('div').style.color = '#16a34a';
            // Pre-fill with current VN time
            var vnNow = new Date(now.getTime() + (7 * 60 - now.getTimezoneOffset()) * 60000);
            dateEl.value = vnNow.toISOString().split('T')[0];
            timeEl.value = vnNow.toISOString().split('T')[1].substring(0, 5);
            badge.style.display = 'none';
            btn.style.background = 'linear-gradient(135deg,#059669,#10b981)';
            statusEl.textContent = '✅ Mặc định — hệ thống dùng giờ thực';
            statusEl.style.color = '#16a34a';
        }
    } catch(e) {}
}

async function _toApply() {
    var dateVal = document.getElementById('toDate').value;
    var timeVal = document.getElementById('toTime').value;
    if (!dateVal || !timeVal) { showToast('Vui lòng nhập ngày và giờ', 'error'); return; }
    var datetime = dateVal + 'T' + timeVal + ':00+07:00';
    try {
        var res = await apiCall('/api/admin/time-override', 'POST', { enabled: true, datetime: datetime });
        if (res.success) {
            showToast('⚡ Đã set giờ hệ thống: ' + dateVal + ' ' + timeVal);
            _toLoadState();
        }
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function _toReset() {
    try {
        var res = await apiCall('/api/admin/time-override', 'POST', { enabled: false });
        if (res.success) {
            showToast('✅ Đã reset về giờ thực');
            _toLoadState();
        }
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function _toTrigger() {
    var statusEl = document.getElementById('toStatus');
    statusEl.textContent = '⏳ Đang chạy deadline check...';
    statusEl.style.color = '#7c3aed';
    try {
        var res = await apiCall('/api/admin/trigger-deadline-check', 'POST', {});
        statusEl.textContent = '✅ Đã kích hoạt! Kiểm tra console server.';
        statusEl.style.color = '#16a34a';
        showToast('🚀 Deadline check đã chạy!');
    } catch(e) {
        statusEl.textContent = '❌ Lỗi: ' + e.message;
        statusEl.style.color = '#dc2626';
    }
}

function _toInit() {
    // Chỉ hiện cho GĐ
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc') {
        var wrap = document.getElementById('timeOverrideWrap');
        if (wrap) wrap.style.display = 'inline-block';
        // Load badge state
        (async () => {
            try {
                var data = await apiCall('/api/admin/time-override');
                if (data.enabled) {
                    document.getElementById('toBadge').style.display = 'inline-block';
                    document.getElementById('timeOverrideBtn').style.background = 'linear-gradient(135deg,#dc2626,#ef4444)';
                }
            } catch(e) {}
        })();
    }
}

// Close dropdown on outside click
document.addEventListener('click', function(e) {
    if (_toOpen && !e.target.closest('#timeOverrideWrap')) {
        _toOpen = false;
        var dd = document.getElementById('toDropdown');
        if (dd) dd.style.display = 'none';
    }
    if (_drOpen && !e.target.closest('#dailyReportWrap')) {
        _drOpen = false;
        var dd2 = document.getElementById('drDropdown');
        if (dd2) dd2.style.display = 'none';
    }
});

// ========== DAILY REPORT — Tổng Kết Hàng Ngày (chỉ GĐ) ==========
var _drOpen = false;
function _drToggle(e) {
    if (e) e.stopPropagation();
    _drOpen = !_drOpen;
    var dd = document.getElementById('drDropdown');
    dd.style.display = _drOpen ? 'block' : 'none';
    if (_drOpen) _drLoad();
}

var _DR_MODULES = [
    { key: 'payment_thu', label: '💰 Sổ Ghi Nhận Tiền', desc: 'Tổng THU: CK + TM' },
    { key: 'cashflow_chi', label: '💸 Sổ Thu Chi', desc: 'Tổng CHI: Công Ty + CP May' }
];

async function _drLoad() {
    var ct = document.getElementById('drContent');
    if (!ct) return;
    try {
        var data = await apiCall('/api/daily-report/config');
        var cfg = data.config || {};
        var groupId = cfg.group_id || '';
        var time = cfg.time || '21:00';
        var modules = cfg.modules || ['payment_thu', 'cashflow_chi'];

        var html = '<div style="display:grid;gap:12px">'
            + '<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);display:block;margin-bottom:4px">🆔 Group ID Telegram</label>'
            + '<input type="text" id="drGroupId" class="form-control" value="'+groupId+'" placeholder="-100xxxxxxxxxx" style="padding:8px 12px;font-size:13px"></div>'
            + '<div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--navy);display:block;margin-bottom:4px">⏰ Giờ gửi (VN)</label>'
            + '<input type="time" id="drTime" class="form-control" value="'+time+'" style="padding:8px 12px;font-size:13px" data-num-formatted="skip"></div>'
            + '<div style="font-size:12px;font-weight:700;color:var(--navy);margin-top:4px">📦 Nội dung gộp:</div>';

        _DR_MODULES.forEach(function(m) {
            var checked = modules.includes(m.key) ? 'checked' : '';
            html += '<label style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:' + (checked ? '#f0fdf4' : '#f9fafb') + ';border:1px solid ' + (checked ? '#bbf7d0' : '#e5e7eb') + ';border-radius:10px;cursor:pointer">'
                + '<input type="checkbox" class="drModuleCheck" value="'+m.key+'" '+checked+' style="width:16px;height:16px;accent-color:#059669">'
                + '<div><div style="font-size:12px;font-weight:700;color:#1e293b">'+m.label+'</div>'
                + '<div style="font-size:10px;color:#6b7280">'+m.desc+'</div></div></label>';
        });

        html += '<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:10px 12px;font-size:10px;color:#0369a1">'
            + '📋 <b>Ví dụ tin nhắn:</b><br>'
            + '📊 <b>TỔNG KẾT NGÀY 15/05/2026</b><br>'
            + '━━━━━━━━━━━━━━━━━<br>'
            + '<b>1</b> - 💰 <b>TỔNG THU:</b> 10.000.000đ CK + 5.000.000đ TM = <b>15.000.000đ</b><br>'
            + '<b>2</b> - 💸 <b>TỔNG CHI:</b> 8.000.000đ CT + 2.000.000đ CPM = <b>10.000.000đ</b></div>';

        html += '<div style="display:flex;gap:8px">'
            + '<button onclick="_drSave()" style="flex:1;padding:8px;background:linear-gradient(135deg,#0891b2,#06b6d4);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer">💾 Lưu</button>'
            + '<button onclick="_drTest()" style="flex:1;padding:8px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer">📤 Gửi Thử</button>'
            + '</div></div>';
        ct.innerHTML = html;
    } catch(e) { ct.innerHTML = '<div style="color:#dc2626;padding:12px">Lỗi: '+e.message+'</div>'; }
}

async function _drSave() {
    var groupId = document.getElementById('drGroupId')?.value || '';
    var time = document.getElementById('drTime')?.value || '21:00';
    var modules = [];
    document.querySelectorAll('.drModuleCheck:checked').forEach(function(c){ modules.push(c.value); });
    try {
        await apiCall('/api/daily-report/config','PUT',{group_id:groupId,time:time,modules:modules});
        showToast('✅ Đã lưu cài đặt Tổng Kết');
    } catch(e) { showToast('Lỗi: '+e.message,'error'); }
}

async function _drTest() {
    var groupId = document.getElementById('drGroupId')?.value || '';
    if (!groupId.trim()) { showToast('Vui lòng nhập Group ID!','error'); return; }
    var modules = [];
    document.querySelectorAll('.drModuleCheck:checked').forEach(function(c){ modules.push(c.value); });
    try {
        var r = await apiCall('/api/daily-report/send','POST',{group_id:groupId.trim(),modules:modules});
        if (r.success) showToast('✅ Đã gửi tổng kết! Kiểm tra Telegram.');
        else showToast('Lỗi: '+(r.error||'Gửi thất bại'),'error');
    } catch(e) { showToast('Lỗi: '+(e.message||'Gửi thất bại'),'error'); }
}

function _drInit() {
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc') {
        var wrap = document.getElementById('dailyReportWrap');
        if (wrap) wrap.style.display = 'inline-block';
    }
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

// ========== GLOBAL DOUBLE-CLICK PREVENTION ==========
// Automatically prevents double-click on ALL buttons, links with onclick,
// and interactive elements across the entire CRM — current and future.
(function() {
    var _lastClickedEl = null;
    var _lastClickTime = 0;
    var DEBOUNCE_MS = 400; // Block rapid clicks within 400ms

    // Elements that should NOT be debounced (safe to click rapidly)
    function _isExempt(el) {
        if (!el) return true;
        // Elements with inline onclick attributes — safe to run directly
        if (el.hasAttribute && el.hasAttribute('onclick')) return true;
        if (el.closest && el.closest('[onclick]')) return true;
        var tag = (el.tagName || '').toUpperCase();
        // Input fields, textareas, selects, labels — always safe
        if (['INPUT', 'TEXTAREA', 'SELECT', 'LABEL', 'OPTION'].indexOf(tag) >= 0) return true;
        // Sidebar navigation links (switching pages should be instant)
        if (el.closest && el.closest('.sidebar-link, .sidebar-nav, #sidebar')) return true;
        // Tab switches, accordion toggles
        if (el.closest && el.closest('[role="tab"], [data-toggle], .tab-btn, .nav-tab')) return true;
        // Close buttons (modals, popups) — always allow
        var txt = (el.textContent || '').trim();
        if (txt === '✕' || txt === '×' || txt === 'X' || txt === '✕ Đóng' || txt.indexOf('Bỏ qua') >= 0 || txt.indexOf('Hủy') >= 0 || txt.indexOf('Huy') >= 0) return true;
        // Elements explicitly marked as safe
        if (el.dataset && el.dataset.noDebounce) return true;
        // Copy buttons — safe to click multiple times
        if (txt.indexOf('Copy') >= 0 || txt.indexOf('📋') >= 0) return true;
        // Setup modals and pricing preset buttons — safe to click rapidly
        if (el.closest && el.closest('#bgg_setup_modal, .setup-modal, [id*="setup_modal"]')) return true;
        if (el.closest && el.closest('.bgg-btn-calc, .preset-btn, [onclick*="Preset"], [onclick*="Setup"]')) return true;
        // Step icons and timeline modal openers — exempt from debouncing
        if (el.closest && el.closest('.ts-step-icon, .order-step-btn, [onclick*="_tsOpenStepModal"], [onclick*="_tsShowRescheduleHistoryModal"]')) return true;
        // KPI table rows, team cards, and order modal triggers — safe to click
        if (el.closest && el.closest('.kpi-tbl, .kpi-lb-row, .kpi-tc-card, .kpi-modal, [onclick*="kpiShow"], [onclick*="kpiFilter"], [onclick*="kpiClose"]')) return true;
        // KPI Marketing buttons — exempt from anti-double click debouncing
        if (el.closest && el.closest('#kpiMktHandlersContainer, .kpi-v2-modal, [onclick*="kpiMkt"]')) return true;
        // Customer detail openers, customer pills, and consult history triggers — exempt from anti-double click debouncing
        // Bảng Công Việc & Quy Trình Họp buttons & modals — exempt from anti-double click debouncing
        if (el.closest && el.closest('[onclick*="_bcv"], [onclick*="bcv"], .bcv-modal, .bcv-card, .bcv-overlay')) return true;
        if (el.closest && el.closest('[onclick*="_mp"], [onclick*="mp"], [onclick*="SkipStep"], [onclick*="skipstep"]')) return true;
        if (el.closest && el.closest('[onclick*="_hvAi"], [onclick*="hvAi"], .hv-ai-chat-window, .hv-ai-float-btn, .hv-ai-rule-btn, #hvAiConfigOverlay')) return true;
        if (el.closest && el.closest('[onclick*="_qlx"], [onclick*="qlx"], [onclick*="UndoCutting"], [onclick*="_bpc"], .qlx-modal, .bpc-modal')) return true;
        if (txt.indexOf('Bỏ Qua') >= 0 || txt.indexOf('Bỏ qua') >= 0 || txt.indexOf('Bỏ gán') >= 0 || txt.indexOf('Bỏ Gán') >= 0 || txt.indexOf('Xóa Bảng') >= 0 || txt.indexOf('Cấu Hình API Key') >= 0 || txt.indexOf('DUYỆT VỀ NHẬN CẮT') >= 0 || txt.indexOf('TỪ CHỐI') >= 0) return true;
        return false;
    }

    // Check if element is a clickable action element
    function _isClickable(el) {
        if (!el) return false;
        var tag = (el.tagName || '').toUpperCase();
        if (tag === 'BUTTON') return true;
        if (tag === 'A' && el.hasAttribute('onclick')) return true;
        if (el.hasAttribute('onclick')) return true;
        if (el.style && el.style.cursor === 'pointer') return true;
        if (el.classList && (el.classList.contains('btn') || el.classList.contains('qlx-icon-btn'))) return true;
        return false;
    }

    // Find the nearest clickable ancestor (walk up max 3 levels)
    function _findClickable(el) {
        for (var i = 0; i < 4 && el; i++) {
            if (_isClickable(el)) return el;
            el = el.parentElement;
        }
        return null;
    }

    document.addEventListener('click', function(e) {
        var target = _findClickable(e.target);
        if (!target) return; // Not a clickable element
        if (_isExempt(target)) return; // Exempt elements

        var now = Date.now();

        // Same element clicked within debounce window → block it
        if (target === _lastClickedEl && (now - _lastClickTime) < DEBOUNCE_MS) {
            e.stopImmediatePropagation();
            e.preventDefault();
            console.log('[AntiDblClick] ⛔ Blocked rapid click on:', target.textContent?.trim()?.substring(0, 30));
            return false;
        }

        // Record this click
        _lastClickedEl = target;
        _lastClickTime = now;

        // Visual feedback: briefly dim the button to indicate it was clicked
        if (!target._antiDblActive) {
            target._antiDblActive = true;
            var origOpacity = target.style.opacity;
            var origPointer = target.style.pointerEvents;
            target.style.opacity = '0.6';
            // target.style.pointerEvents = 'none'; // Commented out to prevent canceling inline onclicks in Chrome
            setTimeout(function() {
                target.style.opacity = origOpacity || '';
                // target.style.pointerEvents = origPointer || ''; // Commented out to prevent canceling inline onclicks in Chrome
                target._antiDblActive = false;
            }, DEBOUNCE_MS);
        }
    }, true); // useCapture = true → fires BEFORE any onclick handlers

    console.log('[AntiDblClick] ✅ Global double-click prevention active (400ms debounce)');
})();

// Shared utility to generate options for period select picker across multiple pages (Setup Giai Thuong, Trao Giai Thuong, Leaderboard)
function _gtBuildPeriodOptions(periodType) {
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
    var html = '';
    if (periodType === 'daily') {
        for (var i = 0; i < 30; i++) {
            var dt = new Date(y, m - 1, d - i);
            var val = dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0');
            var label = dt.getDate() + '/' + (dt.getMonth()+1) + '/' + dt.getFullYear();
            if (i === 0) label += ' (Hôm nay)';
            html += '<option value="' + val + '"' + (i===0?' selected':'') + '>' + label + '</option>';
        }
    } else if (periodType === 'weekly') {
        var today = new Date(y, m - 1, d);
        var dayOfWeek = today.getDay() || 7;
        var monday = new Date(today);
        monday.setDate(today.getDate() - dayOfWeek + 1);
        for (var i = 0; i < 12; i++) {
            var wMon = new Date(monday);
            wMon.setDate(monday.getDate() - i * 7);
            var wSun = new Date(wMon);
            wSun.setDate(wMon.getDate() + 6);
            var tmpDate = new Date(wMon.getTime());
            tmpDate.setDate(tmpDate.getDate() + 3 - ((tmpDate.getDay() + 6) % 7));
            var weekYear = tmpDate.getFullYear();
            var week1 = new Date(weekYear, 0, 4);
            var weekNum = 1 + Math.round(((tmpDate - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
            var val = weekYear + '-W' + String(weekNum).padStart(2, '0');
            var label = 'Tuần ' + weekNum + ' (' + wMon.getDate() + '/' + (wMon.getMonth()+1) + ' - ' + wSun.getDate() + '/' + (wSun.getMonth()+1) + ')';
            html += '<option value="' + val + '"' + (i===0?' selected':'') + '>' + label + '</option>';
        }
    } else if (periodType === 'monthly') {
        for (var i = 0; i < 12; i++) {
            var mm = m - i, yy = y;
            if (mm <= 0) { mm += 12; yy--; }
            var val = yy + '-' + String(mm).padStart(2, '0');
            html += '<option value="' + val + '"' + (i===0?' selected':'') + '>Tháng ' + mm + '/' + yy + '</option>';
        }
    } else if (periodType === 'quarterly') {
        var curQ = Math.ceil(m / 3);
        for (var i = 0; i < 8; i++) {
            var qq = curQ - i, qy = y;
            while (qq <= 0) { qq += 4; qy--; }
            var val = qy + '-Q' + qq;
            html += '<option value="' + val + '"' + (i===0?' selected':'') + '>Quý ' + qq + '/' + qy + '</option>';
        }
    }
    return html;
}
