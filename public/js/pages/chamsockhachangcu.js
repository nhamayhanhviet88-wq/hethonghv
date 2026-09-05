// PUBLIC/JS/PAGES/CHAMSOCKHACHANGCU.JS
// Command Center Dashboard cho trang "Chăm Sóc Khách Hàng Cũ"
// Tổng hợp 5 mục: Tần Suất Thời Gian Đặt Hàng, Đơn Khách SLL, Đơn Khách Đặt Nhiều Lần, Đơn Khách Mới, Đơn Quan Hệ.

(function() {
    // Page state
    let _cskhActiveTab = 'all'; // 'all', 'tansuat', 'don_sll', 'dat_nhieu_lan', 'don_khach_moi', 'don_quan_he'
    let _cskhSearchText = '';
    let _cskhStaffFilter = 'all';
    let _cskhStatusFilter = 'all'; // 'all', 'can_cham_ngay', 'dang_cham_soc', 'da_chot_lai', 'tam_hoan'
    let _cskhFreqFilter = 'all'; // 'all', 'lt30', '30_60', '60_90', 'gt90'
    let _cskhViewMode = 'grid'; // 'grid' | 'table'
    let _cskhCurrentCustomerForLog = null;

    // Benchmark Mock Dataset cho Sale / Kinh Doanh trải nghiệm mượt mà
    let _cskhMockCustomers = [
        {
            id: 'KH-1001',
            name: 'Nguyễn Văn Minh',
            phone: '0988123456',
            zalo: '0988123456',
            company: 'Công ty Cổ phần Tập đoàn Hoàn Mỹ',
            saleName: 'Nguyễn Thị Hương (Sale 01)',
            saleId: 'S01',
            totalOrders: 6,
            totalValue: 345000000,
            lastOrderDate: '2026-05-10',
            lastOrderDaysAgo: 116,
            categories: ['don_sll', 'dat_nhieu_lan'],
            lastProduct: '1.200 Áo Polo Cao Cấp Thêu Logo & 1.200 Mũ Đồng Phục',
            careStatus: 'can_cham_ngay',
            nextCareDate: '2026-09-05',
            notes: 'Khách sắp đến kỳ may đồng phục Thu Đông hàng năm. Cần gọi chào mẫu vải mới.',
            history: [
                { date: '2026-08-20', staff: 'Nguyễn Thị Hương', text: 'Nhắn Zalo hỏi thăm tình hình sử dụng áo đợt Hè. Khách hẹn đầu tháng 9 xem mẫu Thu Đông.' },
                { date: '2026-05-10', staff: 'Nguyễn Thị Hương', text: 'Chốt đơn 1.200 Áo Polo cọc 50%. Đã giao đủ và thanh toán xong.' }
            ]
        },
        {
            id: 'KH-1002',
            name: 'Trần Thị Mai',
            phone: '0912345678',
            zalo: '0912345678',
            company: 'Hệ thống Trường Mầm Non Ban Mai',
            saleName: 'Trần Văn Nam (Sale 02)',
            saleId: 'S02',
            totalOrders: 4,
            totalValue: 185000000,
            lastOrderDate: '2026-07-02',
            lastOrderDaysAgo: 63,
            categories: ['don_sll', 'don_quan_he'],
            lastProduct: '800 Bộ Đồng Phục Học Sinh Mầm Non',
            careStatus: 'dang_cham_soc',
            nextCareDate: '2026-09-08',
            notes: 'Đã gửi catalog mẫu đồng phục thể thao mầm non mới 2026.',
            history: [
                { date: '2026-08-30', staff: 'Trần Văn Nam', text: 'Gửi bảng màu vải thun cotton 100% qua Zalo cho cô Mai.' }
            ]
        },
        {
            id: 'KH-1003',
            name: 'Lê Hoàng Long',
            phone: '0977889900',
            zalo: '0977889900',
            company: 'Chuỗi Nhà Hàng Ẩm Thực Phố Cổ',
            saleName: 'Nguyễn Thị Hương (Sale 01)',
            saleId: 'S01',
            totalOrders: 9,
            totalValue: 220000000,
            lastOrderDate: '2026-07-28',
            lastOrderDaysAgo: 38,
            categories: ['dat_nhieu_lan'],
            lastProduct: '150 Áo Tạp Về & Mũ Bếp Nhân Viên',
            careStatus: 'da_chot_lai',
            nextCareDate: '2026-09-20',
            notes: 'Đã chốt đơn bổ sung 80 áo nhân viên phục vụ mới mở cơ sở 4.',
            history: [
                { date: '2026-09-01', staff: 'Nguyễn Thị Hương', text: 'Chốt thành công đơn bổ sung 80c cọc 30%.' }
            ]
        },
        {
            id: 'KH-1004',
            name: 'Phạm Đức Anh',
            phone: '0936554433',
            zalo: '0936554433',
            company: 'Công ty TNHH Logistics Vận Tải Toàn Cầu',
            saleName: 'Lê Văn Hoàng (Sale 03)',
            saleId: 'S03',
            totalOrders: 1,
            totalValue: 95000000,
            lastOrderDate: '2026-08-15',
            lastOrderDaysAgo: 20,
            categories: ['don_sll', 'don_khach_moi'],
            lastProduct: '500 Áo Bảo Hộ Lao Động Phản Quang',
            careStatus: 'dang_cham_soc',
            nextCareDate: '2026-09-12',
            notes: 'Khách mới giao đơn đầu tiên tháng trước. Cần gọi hỏi thăm chất lượng may & in ấn.',
            history: [
                { date: '2026-08-20', staff: 'Lê Văn Hoàng', text: 'Khách phản hồi áo mặc thoáng mát, đường may chắc chắn.' }
            ]
        },
        {
            id: 'KH-1005',
            name: 'Vũ Thị Hồng',
            phone: '0904112233',
            zalo: '0904112233',
            company: 'Bệnh Viện Đa Khoa Quốc Tế An Thịnh',
            saleName: 'Trần Văn Nam (Sale 02)',
            saleId: 'S02',
            totalOrders: 3,
            totalValue: 410000000,
            lastOrderDate: '2026-04-12',
            lastOrderDaysAgo: 145,
            categories: ['don_sll', 'don_quan_he'],
            lastProduct: '1.500 Bộ Blouse Bác Sĩ & Điều Dưỡng',
            careStatus: 'can_cham_ngay',
            nextCareDate: '2026-09-04',
            notes: 'Khách VIP dự kiến mở rộng thêm khoa khám mới. Quá 140 ngày chưa tái đặt.',
            history: [
                { date: '2026-04-12', staff: 'Trần Văn Nam', text: 'Nghiệm thu đơn 1.500 bộ blouse thành công.' }
            ]
        },
        {
            id: 'KH-1006',
            name: 'Hoàng Minh Tuấn',
            phone: '0966778811',
            zalo: '0966778811',
            company: 'CLB Runner Hà Nội',
            saleName: 'Lê Văn Hoàng (Sale 03)',
            saleId: 'S03',
            totalOrders: 5,
            totalValue: 78000000,
            lastOrderDate: '2026-08-02',
            lastOrderDaysAgo: 33,
            categories: ['dat_nhieu_lan', 'don_khach_moi'],
            lastProduct: '300 Áo Running Chạy Bộ In Sublimation 3D',
            careStatus: 'dang_cham_soc',
            nextCareDate: '2026-09-15',
            notes: 'CLB chuẩn bị giải chạy Mùa Thu tháng 10. Đang gửi thiết kế mẫu áo giải mới.',
            history: [
                { date: '2026-09-02', staff: 'Lê Văn Hoàng', text: 'Gửi demo thiết kế phối màu cam chanh cho anh Tuấn.' }
            ]
        },
        {
            id: 'KH-1007',
            name: 'Đặng Ngọc Bích',
            phone: '0945998877',
            zalo: '0945998877',
            company: 'Công ty Dược Phẩm EcoPharm',
            saleName: 'Nguyễn Thị Hương (Sale 01)',
            saleId: 'S01',
            totalOrders: 2,
            totalValue: 125000000,
            lastOrderDate: '2026-06-20',
            lastOrderDaysAgo: 76,
            categories: ['don_sll'],
            lastProduct: '600 Áo Thun Teambuilding & Quà Tặng',
            careStatus: 'can_cham_ngay',
            nextCareDate: '2026-09-06',
            notes: 'Chuẩn bị sự kiện kỷ niệm 10 năm thành lập EcoPharm vào tháng 11.',
            history: []
        },
        {
            id: 'KH-1008',
            name: 'Bùi Quốc Khánh',
            phone: '0922334455',
            zalo: '0922334455',
            company: 'Chuỗi Cửa Hàng Trà Sữa KOI Cha',
            saleName: 'Trần Văn Nam (Sale 02)',
            saleId: 'S02',
            totalOrders: 12,
            totalValue: 168000000,
            lastOrderDate: '2026-08-25',
            lastOrderDaysAgo: 10,
            categories: ['dat_nhieu_lan'],
            lastProduct: '120 Áo Phông Đen In Kháng Nước',
            careStatus: 'da_chot_lai',
            nextCareDate: '2026-10-01',
            notes: 'Khách hàng quy mô vừa nhưng tần suất tái đặt rất đều đặn 1 tháng/lần.',
            history: [
                { date: '2026-08-25', staff: 'Trần Văn Nam', text: 'Khách nhận hàng khen chất lượng in sắc nét.' }
            ]
        },
        {
            id: 'KH-1009',
            name: 'Trịnh Xuân Thanh',
            phone: '0983119922',
            zalo: '0983119922',
            company: 'Ngân Hàng TMCP Việt Á - Chi Nhánh Hà Nội',
            saleName: 'Nguyễn Thị Hương (Sale 01)',
            saleId: 'S01',
            totalOrders: 3,
            totalValue: 290000000,
            lastOrderDate: '2026-05-30',
            lastOrderDaysAgo: 97,
            categories: ['don_sll', 'don_quan_he'],
            lastProduct: '700 Áo Sơ Mi Đồng Phục Công Sở Premium',
            careStatus: 'can_cham_ngay',
            nextCareDate: '2026-09-05',
            notes: 'Đã quá 90 ngày. Khách VIP phòng giao dịch cần tư vấn quà tặng Tết sớm.',
            history: []
        },
        {
            id: 'KH-1010',
            name: 'Đỗ Thị Thu',
            phone: '0915667788',
            zalo: '0915667788',
            company: 'Trung Tâm Thẩm Mỹ Beauty Queen',
            saleName: 'Lê Văn Hoàng (Sale 03)',
            saleId: 'S03',
            totalOrders: 1,
            totalValue: 42000000,
            lastOrderDate: '2026-08-10',
            lastOrderDaysAgo: 25,
            categories: ['don_khach_moi'],
            lastProduct: '60 Váy Kimono Spa & Khăn Bông Thêu Logo',
            careStatus: 'dang_cham_soc',
            nextCareDate: '2026-09-18',
            notes: 'Khách mới mở chi nhánh 2, đã tư vấn thêm gói khăn thêu cao cấp.',
            history: []
        }
    ];

    // Main Entry Function
    window.renderChamsockhachangcuPage = window.renderChamsockhachhangcuPage = window._cskhcuInit = function(container) {
        if (!container) return;

        // Build HTML Layout Structure
        container.innerHTML = `
            <div class="cskh-page-wrap">
                <!-- Inline Styles for Isolated Styling -->
                <style>
                    .cskh-page-wrap {
                        font-family: 'Inter', system-ui, -apple-system, sans-serif;
                        color: #1e293b;
                        background: #f8fafc;
                        min-height: calc(100vh - 80px);
                        padding: 20px;
                        box-sizing: border-box;
                    }
                    /* Header Bar */
                    .cskh-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                        flex-wrap: wrap;
                        gap: 15px;
                    }
                    .cskh-header-title {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }
                    .cskh-header-title h2 {
                        font-size: 22px;
                        font-weight: 700;
                        color: #0f172a;
                        margin: 0;
                    }
                    .cskh-badge-total {
                        background: rgba(14, 165, 233, 0.12);
                        color: #0284c7;
                        font-size: 13px;
                        font-weight: 600;
                        padding: 4px 12px;
                        border-radius: 20px;
                    }

                    /* KPI Summary Cards Grid */
                    .cskh-kpi-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
                        gap: 16px;
                        margin-bottom: 24px;
                    }
                    .cskh-kpi-card {
                        background: #ffffff;
                        border-radius: 16px;
                        padding: 18px 20px;
                        box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
                        border: 1px solid #e2e8f0;
                        transition: all 0.25s ease;
                        position: relative;
                        overflow: hidden;
                        cursor: pointer;
                    }
                    .cskh-kpi-card:hover {
                        transform: translateY(-3px);
                        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
                    }
                    .cskh-kpi-card.active {
                        border-color: #3b82f6;
                        background: #f0f9ff;
                    }
                    .cskh-kpi-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 10px;
                    }
                    .cskh-kpi-icon {
                        width: 42px;
                        height: 42px;
                        border-radius: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 20px;
                    }
                    .cskh-kpi-value {
                        font-size: 24px;
                        font-weight: 800;
                        color: #0f172a;
                        line-height: 1.2;
                    }
                    .cskh-kpi-label {
                        font-size: 13px;
                        color: #64748b;
                        font-weight: 500;
                        margin-top: 4px;
                    }
                    .cskh-kpi-sub {
                        font-size: 11px;
                        color: #94a3b8;
                        margin-top: 6px;
                        font-weight: 500;
                    }

                    /* Category Core Sub-Tabs Navigation */
                    .cskh-tabs-wrap {
                        background: #ffffff;
                        border-radius: 16px;
                        padding: 8px;
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
                        border: 1px solid #e2e8f0;
                        display: flex;
                        gap: 6px;
                        overflow-x: auto;
                        margin-bottom: 20px;
                        scrollbar-width: none;
                    }
                    .cskh-tabs-wrap::-webkit-scrollbar { display: none; }
                    .cskh-tab-btn {
                        padding: 10px 18px;
                        border-radius: 12px;
                        font-size: 13px;
                        font-weight: 600;
                        color: #64748b;
                        border: none;
                        background: transparent;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        white-space: nowrap;
                        transition: all 0.2s ease;
                    }
                    .cskh-tab-btn:hover {
                        background: #f1f5f9;
                        color: #334155;
                    }
                    .cskh-tab-btn.active {
                        background: #1e293b;
                        color: #ffffff;
                        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
                    }
                    .cskh-tab-count {
                        font-size: 11px;
                        padding: 2px 7px;
                        border-radius: 10px;
                        background: rgba(100, 116, 139, 0.15);
                        color: inherit;
                    }
                    .cskh-tab-btn.active .cskh-tab-count {
                        background: rgba(255, 255, 255, 0.25);
                        color: #ffffff;
                    }

                    /* Filter & Tool Bar */
                    .cskh-filter-bar {
                        background: #ffffff;
                        border-radius: 16px;
                        padding: 14px 18px;
                        border: 1px solid #e2e8f0;
                        margin-bottom: 20px;
                        display: flex;
                        flex-wrap: wrap;
                        align-items: center;
                        justify-content: space-between;
                        gap: 12px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.02);
                    }
                    .cskh-filter-left {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        flex-wrap: wrap;
                        flex: 1;
                    }
                    .cskh-search-box {
                        position: relative;
                        min-width: 260px;
                        flex: 1;
                        max-width: 380px;
                    }
                    .cskh-search-input {
                        width: 100%;
                        padding: 9px 36px 9px 14px;
                        border-radius: 10px;
                        border: 1px solid #cbd5e1;
                        font-size: 13px;
                        outline: none;
                        transition: all 0.2s;
                    }
                    .cskh-search-input:focus {
                        border-color: #3b82f6;
                        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
                    }
                    .cskh-select {
                        padding: 9px 12px;
                        border-radius: 10px;
                        border: 1px solid #cbd5e1;
                        font-size: 13px;
                        outline: none;
                        background: #ffffff;
                        color: #334155;
                        font-weight: 500;
                        cursor: pointer;
                    }
                    .cskh-view-mode-toggle {
                        display: flex;
                        background: #f1f5f9;
                        padding: 3px;
                        border-radius: 10px;
                        gap: 2px;
                    }
                    .cskh-view-btn {
                        padding: 7px 12px;
                        border-radius: 8px;
                        border: none;
                        background: transparent;
                        color: #64748b;
                        cursor: pointer;
                        font-size: 13px;
                        font-weight: 600;
                        transition: all 0.2s;
                    }
                    .cskh-view-btn.active {
                        background: #ffffff;
                        color: #0f172a;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.08);
                    }

                    /* Grid Cards View */
                    .cskh-grid-container {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
                        gap: 18px;
                    }
                    .cskh-card {
                        background: #ffffff;
                        border-radius: 16px;
                        border: 1px solid #e2e8f0;
                        padding: 18px;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.03);
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        transition: all 0.25s ease;
                    }
                    .cskh-card:hover {
                        border-color: #93c5fd;
                        box-shadow: 0 8px 25px rgba(59, 130, 246, 0.1);
                        transform: translateY(-2px);
                    }
                    .cskh-card-head {
                        display: flex;
                        align-items: flex-start;
                        justify-content: space-between;
                        gap: 12px;
                        margin-bottom: 12px;
                    }
                    .cskh-cust-name {
                        font-size: 15px;
                        font-weight: 700;
                        color: #0f172a;
                        margin-bottom: 2px;
                    }
                    .cskh-cust-company {
                        font-size: 12px;
                        color: #64748b;
                        font-weight: 500;
                    }
                    .cskh-status-tag {
                        font-size: 11px;
                        font-weight: 700;
                        padding: 4px 10px;
                        border-radius: 20px;
                        white-space: nowrap;
                    }
                    .cskh-status-can_cham_ngay { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
                    .cskh-status-dang_cham_soc { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
                    .cskh-status-da_chot_lai { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
                    .cskh-status-tam_hoan { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; }

                    .cskh-card-body {
                        margin-bottom: 14px;
                    }
                    .cskh-meta-row {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        font-size: 12px;
                        color: #475569;
                        padding: 6px 0;
                        border-bottom: 1px dashed #f1f5f9;
                    }
                    .cskh-meta-row:last-child { border-bottom: none; }
                    .cskh-meta-label { color: #64748b; font-weight: 500; }
                    .cskh-meta-val { font-weight: 600; color: #0f172a; }

                    .cskh-tags-wrap {
                        display: flex;
                        gap: 6px;
                        flex-wrap: wrap;
                        margin-top: 10px;
                    }
                    .cskh-cat-tag {
                        font-size: 10px;
                        font-weight: 700;
                        padding: 2px 8px;
                        border-radius: 6px;
                        text-transform: uppercase;
                    }
                    .cskh-tag-sll { background: #eff6ff; color: #2563eb; }
                    .cskh-tag-repeat { background: #f0fdf4; color: #15803d; }
                    .cskh-tag-new { background: #faf5ff; color: #9333ea; }
                    .cskh-tag-vip { background: #fff7ed; color: #c2410c; }

                    .cskh-freq-alert {
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 10px;
                        padding: 10px;
                        margin-top: 10px;
                        font-size: 12px;
                    }
                    .cskh-freq-urgent {
                        background: #fff1f2;
                        border-color: #fecdd3;
                        color: #be123c;
                    }

                    .cskh-card-foot {
                        display: flex;
                        gap: 8px;
                        padding-top: 12px;
                        border-top: 1px solid #f1f5f9;
                    }
                    .cskh-btn-action {
                        flex: 1;
                        padding: 8px;
                        border-radius: 10px;
                        border: 1px solid #cbd5e1;
                        background: #ffffff;
                        color: #334155;
                        font-size: 12px;
                        font-weight: 600;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                        transition: all 0.2s;
                    }
                    .cskh-btn-action:hover {
                        background: #f8fafc;
                        border-color: #94a3b8;
                    }
                    .cskh-btn-primary {
                        background: #3b82f6;
                        color: #ffffff;
                        border-color: #3b82f6;
                    }
                    .cskh-btn-primary:hover {
                        background: #2563eb;
                    }

                    /* Table View */
                    .cskh-table-wrap {
                        background: #ffffff;
                        border-radius: 16px;
                        border: 1px solid #e2e8f0;
                        overflow: hidden;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.03);
                    }
                    .cskh-table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 13px;
                        text-align: left;
                    }
                    .cskh-table th {
                        background: #f8fafc;
                        color: #475569;
                        font-weight: 700;
                        padding: 14px 16px;
                        border-bottom: 1px solid #e2e8f0;
                    }
                    .cskh-table td {
                        padding: 14px 16px;
                        border-bottom: 1px solid #f1f5f9;
                        color: #334155;
                    }
                    .cskh-table tr:hover td {
                        background: #f8fafc;
                    }

                    /* Empty State */
                    .cskh-empty-state {
                        text-align: center;
                        padding: 60px 20px;
                        background: #ffffff;
                        border-radius: 16px;
                        border: 1px dashed #cbd5e1;
                        color: #64748b;
                    }

                    /* Modal Styles */
                    .cskh-modal-backdrop {
                        position: fixed;
                        top: 0; left: 0; right: 0; bottom: 0;
                        background: rgba(15, 23, 42, 0.6);
                        backdrop-filter: blur(4px);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 9999;
                        padding: 20px;
                    }
                    .cskh-modal-card {
                        background: #ffffff;
                        width: 100%;
                        max-width: 580px;
                        border-radius: 20px;
                        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                        overflow: hidden;
                        animation: modalIn 0.25s ease-out;
                    }
                    @keyframes modalIn {
                        from { opacity: 0; transform: scale(0.95) translateY(10px); }
                        to { opacity: 1; transform: scale(1) translateY(0); }
                    }
                    .cskh-modal-header {
                        background: #0f172a;
                        color: #ffffff;
                        padding: 18px 24px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    }
                    .cskh-modal-body {
                        padding: 24px;
                        max-height: 75vh;
                        overflow-y: auto;
                    }
                    .cskh-timeline-item {
                        border-left: 2px solid #e2e8f0;
                        padding-left: 14px;
                        margin-bottom: 16px;
                        position: relative;
                    }
                    .cskh-timeline-item::before {
                        content: '';
                        position: absolute;
                        left: -6px; top: 4px;
                        width: 10px; height: 10px;
                        border-radius: 50%;
                        background: #3b82f6;
                    }
                </style>

                <!-- Page Header Bar -->
                <div class="cskh-header">
                    <div class="cskh-header-title">
                        <h2>💎 Trung Tâm Chăm Sóc Khách Hàng Cũ</h2>
                        <span class="cskh-badge-total" id="cskhTotalBadge">10 Khách Hàng</span>
                    </div>
                </div>

                <!-- KPI Summary Dashboard -->
                <div class="cskh-kpi-grid" id="cskhKpiGrid">
                    <!-- KPI Cards Rendered Dynamically -->
                </div>

                <!-- Category Sub-Tabs Navigation (5 Core Requested Categories) -->
                <div class="cskh-tabs-wrap" id="cskhTabsWrap">
                    <button class="cskh-tab-btn active" data-tab="all">
                        📋 Tất Cả Khách Hàng <span class="cskh-tab-count" id="count-all">0</span>
                    </button>
                    <button class="cskh-tab-btn" data-tab="tansuat">
                        ⏱️ Tần Suất Đặt Hàng <span class="cskh-tab-count" id="count-tansuat">0</span>
                    </button>
                    <button class="cskh-tab-btn" data-tab="don_sll">
                        📦 Đơn Khách SLL <span class="cskh-tab-count" id="count-don_sll">0</span>
                    </button>
                    <button class="cskh-tab-btn" data-tab="dat_nhieu_lan">
                        🔄 Đặt Nhiều Lần <span class="cskh-tab-count" id="count-dat_nhieu_lan">0</span>
                    </button>
                    <button class="cskh-tab-btn" data-tab="don_khach_moi">
                        🆕 Đơn Khách Mới <span class="cskh-tab-count" id="count-don_khach_moi">0</span>
                    </button>
                    <button class="cskh-tab-btn" data-tab="don_quan_he">
                        🤝 Đơn Quan Hệ <span class="cskh-tab-count" id="count-don_quan_he">0</span>
                    </button>
                </div>

                <!-- Filter Controls Bar -->
                <div class="cskh-filter-bar">
                    <div class="cskh-filter-left">
                        <div class="cskh-search-box">
                            <input type="text" id="cskhSearchInput" class="cskh-search-input" placeholder="🔍 Tìm tên KH, SĐT, công ty, sản phẩm..." autocomplete="off">
                        </div>
                        
                        <select id="cskhFreqSelect" class="cskh-select">
                            <option value="all">⏱️ Tất cả mốc thời gian</option>
                            <option value="lt30">🟢 Mới đặt trong 30 ngày</option>
                            <option value="30_60">🟡 30 - 60 ngày chưa đặt</option>
                            <option value="60_90">🟠 60 - 90 ngày chưa đặt</option>
                            <option value="gt90">🔴 > 90 ngày (Cảnh báo mất khách)</option>
                        </select>

                        <select id="cskhStatusSelect" class="cskh-select">
                            <option value="all">🎯 Tất cả trạng thái chăm sóc</option>
                            <option value="can_cham_ngay">🔴 Cần chăm sóc ngay</option>
                            <option value="dang_cham_soc">🟡 Đang chăm sóc</option>
                            <option value="da_chot_lai">🟢 Đã chốt đơn lại</option>
                            <option value="tam_hoan">⚪ Tạm hoãn / Chưa nhu cầu</option>
                        </select>

                        <select id="cskhStaffSelect" class="cskh-select">
                            <option value="all">👤 Tất cả Sale / Kinh Doanh</option>
                            <option value="S01">Nguyễn Thị Hương (Sale 01)</option>
                            <option value="S02">Trần Văn Nam (Sale 02)</option>
                            <option value="S03">Lê Văn Hoàng (Sale 03)</option>
                        </select>
                    </div>

                    <div class="cskh-view-mode-toggle">
                        <button class="cskh-view-btn active" id="btnViewGrid">🔲 Lưới Cards</button>
                        <button class="cskh-view-btn" id="btnViewTable">☰ Dạng Bảng</button>
                    </div>
                </div>

                <!-- Main Content Area (Cards / Table) -->
                <div id="cskhContentArea">
                    <!-- Dynamic Content Rendered Here -->
                </div>
            </div>

            <!-- Modal Log Care Note / Interaction Timeline -->
            <div id="cskhModalContainer"></div>
        `;

        // Attach Event Listeners & Initialize Page Data
        cskhInitEvents();
        cskhRenderAll();
    };

    function cskhInitEvents() {
        // Tab switching
        const tabBtns = document.querySelectorAll('.cskh-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                _cskhActiveTab = btn.getAttribute('data-tab');
                cskhRenderAll();
            });
        });

        // Search input
        const searchInput = document.getElementById('cskhSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                _cskhSearchText = e.target.value.trim().toLowerCase();
                cskhRenderAll();
            });
        }

        // Filter selects
        const freqSelect = document.getElementById('cskhFreqSelect');
        if (freqSelect) {
            freqSelect.addEventListener('change', (e) => {
                _cskhFreqFilter = e.target.value;
                cskhRenderAll();
            });
        }

        const statusSelect = document.getElementById('cskhStatusSelect');
        if (statusSelect) {
            statusSelect.addEventListener('change', (e) => {
                _cskhStatusFilter = e.target.value;
                cskhRenderAll();
            });
        }

        const staffSelect = document.getElementById('cskhStaffSelect');
        if (staffSelect) {
            staffSelect.addEventListener('change', (e) => {
                _cskhStaffFilter = e.target.value;
                cskhRenderAll();
            });
        }

        // View mode toggle
        const btnViewGrid = document.getElementById('btnViewGrid');
        const btnViewTable = document.getElementById('btnViewTable');
        if (btnViewGrid && btnViewTable) {
            btnViewGrid.addEventListener('click', () => {
                btnViewGrid.classList.add('active');
                btnViewTable.classList.remove('active');
                _cskhViewMode = 'grid';
                cskhRenderContent();
            });
            btnViewTable.addEventListener('click', () => {
                btnViewTable.classList.add('active');
                btnViewGrid.classList.remove('active');
                _cskhViewMode = 'table';
                cskhRenderContent();
            });
        }
    }

    function cskhFilterData() {
        return _cskhMockCustomers.filter(item => {
            // Category tab filter
            if (_cskhActiveTab === 'tansuat') {
                if (item.lastOrderDaysAgo < 30 && _cskhFreqFilter === 'all') return true; 
            } else if (_cskhActiveTab === 'don_sll') {
                if (!item.categories.includes('don_sll')) return false;
            } else if (_cskhActiveTab === 'dat_nhieu_lan') {
                if (!item.categories.includes('dat_nhieu_lan')) return false;
            } else if (_cskhActiveTab === 'don_khach_moi') {
                if (!item.categories.includes('don_khach_moi')) return false;
            } else if (_cskhActiveTab === 'don_quan_he') {
                if (!item.categories.includes('don_quan_he')) return false;
            }

            // Frequency mốc thời gian filter
            if (_cskhFreqFilter === 'lt30' && item.lastOrderDaysAgo >= 30) return false;
            if (_cskhFreqFilter === '30_60' && (item.lastOrderDaysAgo < 30 || item.lastOrderDaysAgo > 60)) return false;
            if (_cskhFreqFilter === '60_90' && (item.lastOrderDaysAgo < 60 || item.lastOrderDaysAgo > 90)) return false;
            if (_cskhFreqFilter === 'gt90' && item.lastOrderDaysAgo <= 90) return false;

            // Care status filter
            if (_cskhStatusFilter !== 'all' && item.careStatus !== _cskhStatusFilter) return false;

            // Staff filter
            if (_cskhStaffFilter !== 'all' && item.saleId !== _cskhStaffFilter) return false;

            // Search filter
            if (_cskhSearchText) {
                const matchName = item.name.toLowerCase().includes(_cskhSearchText);
                const matchPhone = item.phone.includes(_cskhSearchText);
                const matchCompany = item.company.toLowerCase().includes(_cskhSearchText);
                const matchProduct = item.lastProduct.toLowerCase().includes(_cskhSearchText);
                if (!matchName && !matchPhone && !matchCompany && !matchProduct) return false;
            }

            return true;
        });
    }

    function cskhRenderAll() {
        cskhUpdateTabCounts();
        cskhRenderKpi();
        cskhRenderContent();
    }

    function cskhUpdateTabCounts() {
        const counts = {
            all: _cskhMockCustomers.length,
            tansuat: _cskhMockCustomers.filter(i => i.lastOrderDaysAgo >= 30).length,
            don_sll: _cskhMockCustomers.filter(i => i.categories.includes('don_sll')).length,
            dat_nhieu_lan: _cskhMockCustomers.filter(i => i.categories.includes('dat_nhieu_lan')).length,
            don_khach_moi: _cskhMockCustomers.filter(i => i.categories.includes('don_khach_moi')).length,
            don_quan_he: _cskhMockCustomers.filter(i => i.categories.includes('don_quan_he')).length,
        };

        for (const [key, val] of Object.entries(counts)) {
            const el = document.getElementById(`count-${key}`);
            if (el) el.textContent = val;
        }

        const badge = document.getElementById('cskhTotalBadge');
        const filtered = cskhFilterData();
        if (badge) badge.textContent = `${filtered.length} / ${_cskhMockCustomers.length} Khách Hàng`;
    }

    function cskhRenderKpi() {
        const kpiGrid = document.getElementById('cskhKpiGrid');
        if (!kpiGrid) return;

        const totalRev = _cskhMockCustomers.reduce((acc, cur) => acc + cur.totalValue, 0);
        const urgentCount = _cskhMockCustomers.filter(i => i.careStatus === 'can_cham_ngay' || i.lastOrderDaysAgo > 60).length;
        const sllCount = _cskhMockCustomers.filter(i => i.categories.includes('don_sll')).length;
        const repeatCount = _cskhMockCustomers.filter(i => i.categories.includes('dat_nhieu_lan')).length;
        const vipCount = _cskhMockCustomers.filter(i => i.categories.includes('don_quan_he')).length;

        kpiGrid.innerHTML = `
            <div class="cskh-kpi-card ${(_cskhActiveTab === 'all') ? 'active' : ''}" onclick="window.cskhSelectTab('all')">
                <div class="cskh-kpi-header">
                    <div class="cskh-kpi-icon" style="background:#eff6ff; color:#3b82f6;">👥</div>
                </div>
                <div class="cskh-kpi-value">${_cskhMockCustomers.length}</div>
                <div class="cskh-kpi-label">Tổng Khách Hàng Cũ</div>
                <div class="cskh-kpi-sub">Doanh thu: ${(totalRev / 1e9).toFixed(2)} Tỷ VNĐ</div>
            </div>

            <div class="cskh-kpi-card ${(_cskhActiveTab === 'tansuat') ? 'active' : ''}" onclick="window.cskhSelectTab('tansuat')">
                <div class="cskh-kpi-header">
                    <div class="cskh-kpi-icon" style="background:#fff1f2; color:#e11d48;">⏱️</div>
                </div>
                <div class="cskh-kpi-value" style="color:#e11d48;">${urgentCount}</div>
                <div class="cskh-kpi-label">Cần Chăm Ngay (Đến Kỳ)</div>
                <div class="cskh-kpi-sub">Quá 60-90+ ngày chưa đặt lại</div>
            </div>

            <div class="cskh-kpi-card ${(_cskhActiveTab === 'don_sll') ? 'active' : ''}" onclick="window.cskhSelectTab('don_sll')">
                <div class="cskh-kpi-header">
                    <div class="cskh-kpi-icon" style="background:#f0fdf4; color:#16a34a;">📦</div>
                </div>
                <div class="cskh-kpi-value" style="color:#16a34a;">${sllCount}</div>
                <div class="cskh-kpi-label">Đơn Khách SLL</div>
                <div class="cskh-kpi-sub">Đơn hàng số lượng lớn / giá trị cao</div>
            </div>

            <div class="cskh-kpi-card ${(_cskhActiveTab === 'dat_nhieu_lan') ? 'active' : ''}" onclick="window.cskhSelectTab('dat_nhieu_lan')">
                <div class="cskh-kpi-header">
                    <div class="cskh-kpi-icon" style="background:#faf5ff; color:#9333ea;">🔄</div>
                </div>
                <div class="cskh-kpi-value" style="color:#9333ea;">${repeatCount}</div>
                <div class="cskh-kpi-label">Đặt Nhiều Lần (Thân Thiết)</div>
                <div class="cskh-kpi-sub">Khách hàng trung thành tái đặt nhiều đợt</div>
            </div>

            <div class="cskh-kpi-card ${(_cskhActiveTab === 'don_quan_he') ? 'active' : ''}" onclick="window.cskhSelectTab('don_quan_he')">
                <div class="cskh-kpi-header">
                    <div class="cskh-kpi-icon" style="background:#fff7ed; color:#ea580c;">🤝</div>
                </div>
                <div class="cskh-kpi-value" style="color:#ea580c;">${vipCount}</div>
                <div class="cskh-kpi-label">Đơn Quan Hệ & VIP</div>
                <div class="cskh-kpi-sub">Đối tác chiến lược & VIP network</div>
            </div>
        `;
    }

    window.cskhSelectTab = function(tabName) {
        _cskhActiveTab = tabName;
        const btns = document.querySelectorAll('.cskh-tab-btn');
        btns.forEach(b => {
            if (b.getAttribute('data-tab') === tabName) b.classList.add('active');
            else b.classList.remove('active');
        });
        cskhRenderAll();
    };

    function cskhRenderContent() {
        const area = document.getElementById('cskhContentArea');
        if (!area) return;

        const filtered = cskhFilterData();

        if (filtered.length === 0) {
            area.innerHTML = `
                <div class="cskh-empty-state">
                    <div style="font-size:48px; margin-bottom:12px;">🔍</div>
                    <h3 style="font-size:18px; font-weight:700; color:#334155; margin-bottom:6px;">Không tìm thấy khách hàng nào</h3>
                    <p style="font-size:13px; color:#64748b;">Vui lòng thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh bộ lọc mốc thời gian / trạng thái chăm sóc.</p>
                </div>
            `;
            return;
        }

        if (_cskhViewMode === 'grid') {
            area.innerHTML = `
                <div class="cskh-grid-container">
                    ${filtered.map(item => cskhBuildCardHtml(item)).join('')}
                </div>
            `;
        } else {
            area.innerHTML = `
                <div class="cskh-table-wrap">
                    <table class="cskh-table">
                        <thead>
                            <tr>
                                <th>Khách Hàng & Công Ty</th>
                                <th>Tổng Đơn & Doanh Thu</th>
                                <th>Lần Đặt Cuối</th>
                                <th>Phân Loại</th>
                                <th>Nhân Viên Sale</th>
                                <th>Trạng Thái Chăm Sóc</th>
                                <th>Thao Tác Nhanh</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filtered.map(item => cskhBuildTableRowHtml(item)).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    }

    function cskhBuildCardHtml(item) {
        const statusMap = {
            can_cham_ngay: { label: '🔴 Cần Chăm Ngay', cls: 'cskh-status-can_cham_ngay' },
            dang_cham_soc: { label: '🟡 Đang Chăm Sóc', cls: 'cskh-status-dang_cham_soc' },
            da_chot_lai: { label: '🟢 Đã Chốt Đơn Lại', cls: 'cskh-status-da_chot_lai' },
            tam_hoan: { label: '⚪ Tạm Hoãn', cls: 'cskh-status-tam_hoan' }
        };
        const statusObj = statusMap[item.careStatus] || statusMap.dang_cham_soc;

        const isUrgent = item.lastOrderDaysAgo > 60;

        return `
            <div class="cskh-card">
                <div>
                    <div class="cskh-card-head">
                        <div>
                            <div class="cskh-cust-name">${item.name} <span style="font-size:12px; font-weight:500; color:#64748b;">(${item.phone})</span></div>
                            <div class="cskh-cust-company">🏢 ${item.company}</div>
                        </div>
                        <span class="cskh-status-tag ${statusObj.cls}">${statusObj.label}</span>
                    </div>

                    <div class="cskh-card-body">
                        <div class="cskh-meta-row">
                            <span class="cskh-meta-label">Tổng tích lũy:</span>
                            <span class="cskh-meta-val" style="color:#2563eb;">${item.totalOrders} Đơn — ${(item.totalValue / 1e6).toLocaleString('vi-VN')} triệu VNĐ</span>
                        </div>
                        <div class="cskh-meta-row">
                            <span class="cskh-meta-label">Đơn gần nhất:</span>
                            <span class="cskh-meta-val">${item.lastOrderDate} (${item.lastOrderDaysAgo} ngày trước)</span>
                        </div>
                        <div class="cskh-meta-row">
                            <span class="cskh-meta-label">Sản phẩm đặt gần nhất:</span>
                            <span class="cskh-meta-val" style="font-size:11px; color:#475569;">${item.lastProduct}</span>
                        </div>
                        <div class="cskh-meta-row">
                            <span class="cskh-meta-label">Sale phụ trách:</span>
                            <span class="cskh-meta-val" style="color:#059669;">${item.saleName}</span>
                        </div>

                        <!-- Category Tags -->
                        <div class="cskh-tags-wrap">
                            ${item.categories.includes('don_sll') ? `<span class="cskh-cat-tag cskh-tag-sll">📦 Đơn SLL</span>` : ''}
                            ${item.categories.includes('dat_nhieu_lan') ? `<span class="cskh-cat-tag cskh-tag-repeat">🔄 Đặt Nhiều Lần</span>` : ''}
                            ${item.categories.includes('don_khach_moi') ? `<span class="cskh-cat-tag cskh-tag-new">🆕 Khách Mới</span>` : ''}
                            ${item.categories.includes('don_quan_he') ? `<span class="cskh-cat-tag cskh-tag-vip">🤝 VIP / Quan Hệ</span>` : ''}
                        </div>

                        <!-- Frequency Warning Box -->
                        <div class="cskh-freq-alert ${isUrgent ? 'cskh-freq-urgent' : ''}">
                            ⏱️ <strong>Tần suất:</strong> ${item.lastOrderDaysAgo} ngày chưa phát sinh đơn mới. 
                            ${item.nextCareDate ? `<br>⏰ Hẹn chăm lại: <strong>${item.nextCareDate}</strong>` : ''}
                            ${item.notes ? `<br>📝 Ghi chú: <em>"${item.notes}"</em>` : ''}
                        </div>
                    </div>
                </div>

                <div class="cskh-card-foot">
                    <a href="tel:${item.phone}" class="cskh-btn-action" style="text-decoration:none;" title="Gọi điện">📞 Gọi</a>
                    <a href="https://zalo.me/${item.phone}" target="_blank" class="cskh-btn-action" style="text-decoration:none; color:#0284c7; border-color:#93c5fd;" title="Nhắn Zalo">💬 Zalo</a>
                    <button class="cskh-btn-action cskh-btn-primary" onclick="window.cskhOpenLogModal('${item.id}')">📝 Ghi Chú & Nhật Ký</button>
                </div>
            </div>
        `;
    }

    function cskhBuildTableRowHtml(item) {
        const statusMap = {
            can_cham_ngay: { label: '🔴 Cần Chăm Ngay', cls: 'cskh-status-can_cham_ngay' },
            dang_cham_soc: { label: '🟡 Đang Chăm Sóc', cls: 'cskh-status-dang_cham_soc' },
            da_chot_lai: { label: '🟢 Đã Chốt Đơn Lại', cls: 'cskh-status-da_chot_lai' },
            tam_hoan: { label: '⚪ Tạm Hoãn', cls: 'cskh-status-tam_hoan' }
        };
        const statusObj = statusMap[item.careStatus] || statusMap.dang_cham_soc;

        return `
            <tr>
                <td>
                    <div style="font-weight:700; color:#0f172a;">${item.name}</div>
                    <div style="font-size:12px; color:#64748b;">📞 ${item.phone} — 🏢 ${item.company}</div>
                </td>
                <td>
                    <div style="font-weight:700; color:#2563eb;">${(item.totalValue / 1e6).toLocaleString('vi-VN')} triệu</div>
                    <div style="font-size:11px; color:#64748b;">${item.totalOrders} đơn hàng</div>
                </td>
                <td>
                    <div style="font-weight:600;">${item.lastOrderDate}</div>
                    <div style="font-size:11px; color:#e11d48; font-weight:600;">${item.lastOrderDaysAgo} ngày trước</div>
                </td>
                <td>
                    <div class="cskh-tags-wrap">
                        ${item.categories.includes('don_sll') ? `<span class="cskh-cat-tag cskh-tag-sll">📦 SLL</span>` : ''}
                        ${item.categories.includes('dat_nhieu_lan') ? `<span class="cskh-cat-tag cskh-tag-repeat">🔄 Tái Đặt</span>` : ''}
                        ${item.categories.includes('don_khach_moi') ? `<span class="cskh-cat-tag cskh-tag-new">🆕 Mới</span>` : ''}
                        ${item.categories.includes('don_quan_he') ? `<span class="cskh-cat-tag cskh-tag-vip">🤝 VIP</span>` : ''}
                    </div>
                </td>
                <td>
                    <div style="font-weight:600; color:#059669;">${item.saleName}</div>
                </td>
                <td>
                    <span class="cskh-status-tag ${statusObj.cls}">${statusObj.label}</span>
                </td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <a href="tel:${item.phone}" class="cskh-btn-action" style="padding:4px 8px; text-decoration:none;">📞</a>
                        <a href="https://zalo.me/${item.phone}" target="_blank" class="cskh-btn-action" style="padding:4px 8px; text-decoration:none; color:#0284c7;">💬</a>
                        <button class="cskh-btn-action cskh-btn-primary" style="padding:4px 10px; font-size:11px;" onclick="window.cskhOpenLogModal('${item.id}')">📝 Nhật ký</button>
                    </div>
                </td>
            </tr>
        `;
    }

    // Modal Interaction Handlers
    window.cskhOpenLogModal = function(custCode) {
        const item = _cskhMockCustomers.find(i => i.id === custCode);
        if (!item) return;
        _cskhCurrentCustomerForLog = item;

        const modalBox = document.getElementById('cskhModalContainer');
        if (!modalBox) return;

        modalBox.innerHTML = `
            <div class="cskh-modal-backdrop" onclick="if(event.target===this) window.cskhCloseModal()">
                <div class="cskh-modal-card">
                    <div class="cskh-modal-header">
                        <div>
                            <h3 style="margin:0; font-size:17px; font-weight:700;">📝 Nhật Ký Chăm Sóc — ${item.name}</h3>
                            <div style="font-size:12px; color:#cbd5e1; margin-top:2px;">🏢 ${item.company} | 📞 ${item.phone}</div>
                        </div>
                        <button onclick="window.cskhCloseModal()" style="background:none; border:none; color:#ffffff; font-size:20px; cursor:pointer;">✕</button>
                    </div>

                    <div class="cskh-modal-body">
                        <!-- Update Status & Next Date Form -->
                        <div style="background:#f8fafc; padding:16px; border-radius:12px; border:1px solid #e2e8f0; margin-bottom:20px;">
                            <h4 style="margin:0 0 12px 0; font-size:14px; font-weight:700; color:#0f172a;">➕ Thêm Nhật Ký Tương Tác Mới</h4>
                            
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
                                <div>
                                    <label style="font-size:12px; font-weight:600; color:#475569; display:block; margin-bottom:4px;">Cập nhật trạng thái:</label>
                                    <select id="modalStatusSelect" class="cskh-select" style="width:100%;">
                                        <option value="can_cham_ngay" ${item.careStatus === 'can_cham_ngay' ? 'selected' : ''}>🔴 Cần Chăm Ngay</option>
                                        <option value="dang_cham_soc" ${item.careStatus === 'dang_cham_soc' ? 'selected' : ''}>🟡 Đang Chăm Sóc</option>
                                        <option value="da_chot_lai" ${item.careStatus === 'da_chot_lai' ? 'selected' : ''}>🟢 Đã Chốt Đơn Lại</option>
                                        <option value="tam_hoan" ${item.careStatus === 'tam_hoan' ? 'selected' : ''}>⚪ Tạm Hoãn</option>
                                    </select>
                                </div>

                                <div>
                                    <label style="font-size:12px; font-weight:600; color:#475569; display:block; margin-bottom:4px;">Hẹn ngày chăm tiếp theo:</label>
                                    <input type="date" id="modalNextDate" class="cskh-search-input" value="${item.nextCareDate || ''}">
                                </div>
                            </div>

                            <div style="margin-bottom:12px;">
                                <label style="font-size:12px; font-weight:600; color:#475569; display:block; margin-bottom:4px;">Nội dung chăm sóc / Ghi chú phản hồi:</label>
                                <textarea id="modalNoteText" rows="3" class="cskh-search-input" style="height:auto;" placeholder="Nhập ghi chú phản hồi từ khách hàng (Ví dụ: Khách hẹn giữa tháng 9 may thêm 300 áo polo)..."></textarea>
                            </div>

                            <button onclick="window.cskhSaveLogNote()" class="cskh-btn-action cskh-btn-primary" style="width:100%; padding:10px; font-size:13px;">💾 Lưu Ghi Chú & Cập Nhật</button>
                        </div>

                        <!-- Timeline History -->
                        <h4 style="margin:0 0 14px 0; font-size:14px; font-weight:700; color:#0f172a;">📜 Lịch Sử Chăm Sóc Trước Đây</h4>
                        ${item.history && item.history.length > 0 ? item.history.map(h => `
                            <div class="cskh-timeline-item">
                                <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:700; color:#334155; margin-bottom:3px;">
                                    <span>👤 ${h.staff}</span>
                                    <span style="color:#64748b; font-weight:500;">📅 ${h.date}</span>
                                </div>
                                <div style="font-size:13px; color:#475569; line-height:1.4;">${h.text}</div>
                            </div>
                        `).join('') : '<p style="font-size:13px; color:#94a3b8; text-align:center; padding:15px 0;">Chưa có nhật ký ghi nhận trước đó.</p>'}
                    </div>
                </div>
            </div>
        `;
    };

    window.cskhCloseModal = function() {
        const modalBox = document.getElementById('cskhModalContainer');
        if (modalBox) modalBox.innerHTML = '';
        _cskhCurrentCustomerForLog = null;
    };

    window.cskhSaveLogNote = function() {
        if (!_cskhCurrentCustomerForLog) return;

        const statusSelect = document.getElementById('modalStatusSelect');
        const nextDateInput = document.getElementById('modalNextDate');
        const noteTextarea = document.getElementById('modalNoteText');

        const newStatus = statusSelect ? statusSelect.value : _cskhCurrentCustomerForLog.careStatus;
        const newNextDate = nextDateInput ? nextDateInput.value : _cskhCurrentCustomerForLog.nextCareDate;
        const newNote = noteTextarea ? noteTextarea.value.trim() : '';

        // Update item in mock data
        _cskhCurrentCustomerForLog.careStatus = newStatus;
        _cskhCurrentCustomerForLog.nextCareDate = newNextDate;
        if (newNote) {
            _cskhCurrentCustomerForLog.notes = newNote;
            const today = new Date().toISOString().split('T')[0];
            if (!_cskhCurrentCustomerForLog.history) _cskhCurrentCustomerForLog.history = [];
            _cskhCurrentCustomerForLog.history.unshift({
                date: today,
                staff: _cskhCurrentCustomerForLog.saleName || 'Sale Phụ Trách',
                text: newNote
            });
        }

        window.cskhCloseModal();
        cskhRenderAll();
    };

})();
