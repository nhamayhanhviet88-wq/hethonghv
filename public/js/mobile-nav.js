// Force HTTPS context (required for camera/QR scanner API on mobile)
if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('192.168.')) {
    window.location.href = window.location.href.replace('http:', 'https:');
}

// Central Mobile Navigation & Drawer Component
const MOBILE_MENU_CONFIG = [
    { id: 'hub', label: 'Trang chủ Mobile', icon: '🏠', href: '/m', permKey: null },
    { id: 'quanlynhapkho', label: 'Quản Lý Nhập Kho Vải', icon: '🗺️', href: '/m/quanlykhovai', permKey: 'quan_ly_nhap_kho_vai' },
    { id: 'xuatvaicat', label: 'Xuất Vải Để Cắt', icon: '✂️', href: '/m/xuatvaicat', permKey: 'xuat_vai_cat' },
    { id: 'baogiagoc', label: 'Báo Giá Gốc', icon: '🧮', href: '/m/baogiagoc', permKey: 'gia_nhap_goc' },
    { id: 'baogiactvhh', label: 'Báo Giá CTV/HH', icon: '🤝', href: '/m/baogiactvhh', permKey: 'gia_nhap_goc' },
    { id: 'gianhapgoc', label: 'Giá Nhập Gốc', icon: '🏷️', href: '/m/gianhapgoc', permKey: 'gia_nhap_goc' },
    { id: 'tilecatgoc', label: 'Tỉ Lệ Cắt Gốc', icon: '📏', href: '/m/tilecatgoc', permKey: 'ti_le_cat_goc' },
    { id: 'bophancat', label: 'Bộ Phận Cắt', icon: '✂️', href: '/m/bophancathv', permKey: 'bo_phan_cat' },
    { id: 'bophanin', label: 'Bộ Phận In', icon: '🖨️', href: '/m/bophaninhv', permKey: 'bo_phan_in' },
    { id: 'bophanep', label: 'Bộ Phận Ép', icon: '🔥', href: '/m/bophanephv', permKey: 'bo_phan_ep' },
    { id: 'bophanmay', label: 'Bộ Phận May', icon: '🧵', href: '/m/bophanmayhv', permKey: 'bo_phan_may' },
    { id: 'kiemtrachatluong', label: 'Kiểm Tra Chất Lượng', icon: '🔍', href: '/m/kiemtrachatluong', permKey: 'kiem_tra_chat_luong' },
    { id: 'bophanhoanthien', label: 'Bộ Phận Hoàn Thiện', icon: '✅', href: '/m/bophanhoanthienhv', permKey: 'bo_phan_hoan_thien' },
    { id: 'trasoatdonhang', label: 'Tra Soát Đơn Hàng', icon: '🔍', href: '/m/trasoatdonhang', permKey: 'tra_soat_don_hang' },
    { id: 'chuyenso', label: 'Chuyển Số NV Kinh Doanh', icon: '📱', href: '/m/chuyen-so', permKey: 'chuyen_so' },
    { id: 'chuyensosale', label: 'Chuyển Số Sale', icon: '📱', href: '/m/chuyensosale', permKey: 'chuyen_so_sale' },
    { id: 'donhangchuathutien', label: 'Đơn Hàng Chưa Thu Tiền', icon: '💰', href: '/m/donhangchuathutien', permKey: 'don_hang_chua_thu_tien' },
    { id: 'donhanghomnayqlx', label: 'Đơn Hôm Nay QLX', icon: '🏭', href: '/m/donhanghomnayqlx', permKey: 'don_hang_hom_nay_qlx' },
    { id: 'timkiem', label: 'Tìm Kiếm KH', icon: '🔍', href: '/m/tim-kiem', permKey: 'tim_kiem_kh' },
    { id: 'accounts', label: 'Tài Khoản Nhân Viên', icon: '👥', href: '/m/accounts', permKey: 'nhan_vien' },
    { id: 'billnhaphang', label: 'Bill Nhập Vải', icon: '🧾', href: '/m/billnhaphang', permKey: 'bill_nhap_hang' },
    { id: 'nhapxuathoanvai', label: 'Nhập Xuất Hoàn Vải', icon: '🔄', href: '/m/nhapxuathoanvai', permKey: 'nhap_xuat_hoan_vai' },
    { id: 'kiemkho', label: 'Kiểm Kho Vải', icon: '📝', href: '/m/kiemkhohv', permKey: 'kiem_kho' },
    { id: 'vatlieutempet', label: 'Vật Liệu PET/TEM', icon: '🏷️', href: '/m/vatlieutempet', permKey: 'vat_lieu_tem_pet' },
    { id: 'xinnghi', label: 'Xin Nghỉ Nhân Viên', icon: '📋', href: '/m/xinnghinhanvien', permKey: 'xin_nghi_nv' }
];

const ROLE_MAP = { 
    giam_doc: 'Giám Đốc', 
    quan_ly_cap_cao: 'QL Cấp Cao', 
    quan_ly: 'Quản Lý', 
    truong_phong: 'Trưởng Phòng', 
    nhan_vien: 'Nhân Viên', 
    thu_viec: 'Thử Việc', 
    part_time: 'Part Time',
    tkaffiliate: 'TK Affiliate'
};

async function initMobileNavigation() {
    try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.status === 401 || res.status === 403) {
            window.location.href = '/index.html';
            return;
        }
        const data = await res.json();
        if (!data.user) {
            window.location.href = '/index.html';
            return;
        }

        const user = data.user;
        const perms = user.permissions || {};
        
        // Find current page info based on path
        const currentPath = window.location.pathname.toLowerCase().replace(/\/$/, '');
        const currentPage = MOBILE_MENU_CONFIG.find(item => {
            const cleanHref = item.href.toLowerCase();
            return currentPath === cleanHref || 
                   (item.href === '/m/bophancathv' && (currentPath === '/m/bophancat' || currentPath === '/m/bophancathv')) ||
                   (item.href === '/m/bophaninhv' && (currentPath === '/m/bophanin' || currentPath === '/m/bophaninhv')) ||
                   (item.href === '/m/bophanmayhv' && (currentPath === '/m/bophanmay' || currentPath === '/m/bophanmayhv')) ||
                   (item.href === '/m/bophanhoanthienhv' && (currentPath === '/m/bophanhoanthien' || currentPath === '/m/bophanhoanthienhv')) ||
                   (item.href === '/m/bophanephv' && (currentPath === '/m/bophanep' || currentPath === '/m/bophanephv')) ||
                   (item.href === '/m/kiemkhohv' && (currentPath === '/m/kiemkho' || currentPath === '/m/kiemkhohv'));
        });

        // 1. Authorize current page
        if (currentPage && currentPage.permKey && user.role !== 'giam_doc') {
            const userPerm = perms[currentPage.permKey];
            if (!userPerm || !userPerm.can_view) {
                sessionStorage.setItem('unauthorized_redirect_toast', `🔒 Bạn không có quyền truy cập trang mobile ${currentPage.label}!`);
                window.location.href = '/m';
                return;
            }
        }

        // 2. Hide old layout headers if they exist
        const oldHeaders = document.querySelectorAll('.mh, header:not(.mobile-nav-header)');
        oldHeaders.forEach(el => el.style.display = 'none');
        
        // Also hide any desktop link buttons (like Về trang Desktop class .mb)
        const oldDesktopButtons = document.querySelectorAll('.mb');
        oldDesktopButtons.forEach(btn => {
            if (btn.textContent.includes('Desktop') || btn.getAttribute('href') === '/accounts') {
                btn.style.display = 'none';
            }
        });

        // 3. Setup Title Tag of the page if it's generic
        const pageTitle = currentPage ? currentPage.label : document.title;
        document.title = `${pageTitle} — Đồng Phục HV`;

        // 4. Inject Mobile Nav Header
        const header = document.createElement('header');
        header.className = 'mobile-nav-header';
        header.innerHTML = `
            <div class="logo-group" onclick="window.location.href='/m'">
                <img src="/images/logo.png" alt="HV Logo">
                <h1>Đồng Phục <span>HV</span></h1>
            </div>
            <div style="color: #fbbf24; font-weight: 800; font-size: 13px; text-transform: uppercase; text-shadow: 0 1px 4px rgba(0,0,0,0.3); max-width: 45%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${pageTitle}
            </div>
            <button class="menu-toggle" id="mobileMenuToggle">☰</button>
        `;
        document.body.insertBefore(header, document.body.firstChild);

        // 5. Inject Sidebar Drawer & Backdrop Overlay
        const overlay = document.createElement('div');
        overlay.className = 'mobile-drawer-overlay';
        overlay.id = 'mobileDrawerOverlay';
        document.body.appendChild(overlay);

        const drawer = document.createElement('div');
        drawer.className = 'mobile-drawer';
        drawer.id = 'mobileDrawer';
        
        const initials = user.full_name ? user.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
        const roleLabel = ROLE_MAP[user.role] || user.role;
        const activeClass = (user.role === 'giam_doc') ? 'profile-role-giam_doc' : `profile-role-${user.role}`;

        // Build list of permitted menu items
        let menuItemsHtml = '';
        MOBILE_MENU_CONFIG.forEach(item => {
            let isPermitted = false;
            if (user.role === 'giam_doc') {
                isPermitted = true;
            } else if (!item.permKey) {
                isPermitted = true; // Open to all (like Home)
            } else {
                const userPerm = perms[item.permKey];
                if (userPerm && userPerm.can_view) {
                    isPermitted = true;
                }
            }

            if (isPermitted) {
                const isCurrent = currentPage && currentPage.id === item.id;
                menuItemsHtml += `
                    <a href="${item.href}" class="drawer-item ${isCurrent ? 'active' : ''}">
                        <span class="item-icon">${item.icon}</span>
                        <span>${item.label}</span>
                    </a>
                `;
            }
        });

        drawer.innerHTML = `
            <div class="mobile-drawer-profile">
                <button class="mobile-drawer-close" id="mobileDrawerClose">✕</button>
                <div class="profile-avatar-row">
                    <div class="profile-avatar">${initials}</div>
                    <div class="profile-info">
                        <div class="profile-name" title="${user.full_name}">${user.full_name}</div>
                        <div class="profile-role-badge ${activeClass}">${roleLabel}</div>
                    </div>
                </div>
            </div>
            <div class="mobile-drawer-body">
                <div class="drawer-section-title">Danh mục Mobile</div>
                <nav class="drawer-menu-list">
                    ${menuItemsHtml}
                </nav>
            </div>
            <div class="drawer-footer">
                <a href="#" class="drawer-footer-btn desktop-btn" id="switchToDesktopBtn">🖥️ Giao diện Máy Tính</a>
                <a href="#" class="drawer-footer-btn" id="logoutMobileBtn">🚪 Đăng xuất</a>
            </div>
        `;
        document.body.appendChild(drawer);

        // 6. Navigation Event Listeners
        const desktopBtn = document.getElementById('switchToDesktopBtn');
        const logoutBtn = document.getElementById('logoutMobileBtn');

        const openDrawer = () => {
            overlay.classList.add('active');
            drawer.classList.add('active');
        };

        const closeDrawer = () => {
            overlay.classList.remove('active');
            drawer.classList.remove('active');
        };

        // Resilient Event Delegation for Drawer Open/Close Toggles
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (target.closest('#mobileMenuToggle, .menu-toggle')) {
                e.preventDefault();
                openDrawer();
            } else if (target.closest('#mobileDrawerClose, .mobile-drawer-close') || target === overlay) {
                e.preventDefault();
                closeDrawer();
            }
        });

        // Switch to desktop site
        desktopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.setItem('preferDesktop', 'true');
            window.location.href = '/dashboard';
        });

        // Logout
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                try {
                    await fetch('/api/auth/logout', { method: 'POST' });
                } catch(e) {}
                window.location.href = '/index.html';
            }
        });

    } catch (err) {
        console.error('Error initializing mobile navigation:', err);
    }
}

// Resilient DOM ready checker
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileNavigation);
} else {
    initMobileNavigation();
}
