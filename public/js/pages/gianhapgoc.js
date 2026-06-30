// ========== GIÁ NHẬP GỐC — Desktop SPA ==========
var _gng = {
    mockData: [
        { id: 1, material: 'Cotton 100% 2 chiều', color: 'Đen Jet Black', supplier: 'Công ty Dệt May Thành Công', basePrice: 125000, vat: 8, finalPrice: 135000, date: '2026-06-28', status: 'Bình ổn' },
        { id: 2, material: 'Cotton 100% 2 chiều', color: 'Trắng Super White', supplier: 'Công ty Dệt May Thành Công', basePrice: 123000, vat: 8, finalPrice: 132840, date: '2026-06-28', status: 'Bình ổn' },
        { id: 3, material: 'Cotton 100% 4 chiều', color: 'Xanh Navy', supplier: 'Dệt Kim Phong Phú', basePrice: 142000, vat: 10, finalPrice: 156200, date: '2026-06-25', status: 'Tăng nhẹ' },
        { id: 4, material: 'CVC 65/35', color: 'Xám Melange', supplier: 'Công ty Dệt May Thành Công', basePrice: 98000, vat: 8, finalPrice: 105840, date: '2026-06-24', status: 'Bình ổn' },
        { id: 5, material: 'Lacoste 4 chiều (Cá sấu)', color: 'Đỏ Đô', supplier: 'Hạnh Vĩ Fabric', basePrice: 155000, vat: 10, finalPrice: 170500, date: '2026-06-22', status: 'Tăng nhẹ' },
        { id: 6, material: 'Poly 2 chiều (Mè)', color: 'Vàng Cúc', supplier: 'Hạnh Vĩ Fabric', basePrice: 65000, vat: 8, finalPrice: 70200, date: '2026-06-20', status: 'Bình ổn' },
        { id: 7, material: 'Khaki Chun', color: 'Vàng Cát', supplier: 'Hồng Phát Textile', basePrice: 85000, vat: 10, finalPrice: 93500, date: '2026-06-19', status: 'Bình ổn' },
        { id: 8, material: 'Cotton Tici 30s', color: 'Hồng Cam', supplier: 'Dệt Kim Phong Phú', basePrice: 110000, vat: 8, finalPrice: 118800, date: '2026-06-15', status: 'Giảm giá' }
    ],
    filter: {
        supplier: '',
        status: '',
        search: ''
    }
};

function renderGiaNhapGocPage(content) {
    if (!content) content = document.getElementById('contentArea');
    if (!content) return;

    // Inject custom premium CSS for this page
    if (!document.getElementById('_gngStyles')) {
        const style = document.createElement('style');
        style.id = '_gngStyles';
        style.textContent = `
            .gng-container {
                padding: 24px;
                background: #f8fafc;
                min-height: 100%;
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                animation: gngFadeIn 0.4s ease-out;
            }
            @keyframes gngFadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .gng-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 24px;
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
            .gng-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                gap: 20px;
                margin-bottom: 24px;
            }
            .gng-stat-card {
                background: white;
                border-radius: 16px;
                padding: 20px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02);
                transition: all 0.25s ease;
                position: relative;
                overflow: hidden;
            }
            .gng-stat-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.05);
            }
            .gng-stat-card::after {
                content: '';
                position: absolute;
                top: 0;
                right: 0;
                width: 96px;
                height: 96px;
                background: radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%);
                pointer-events: none;
            }
            .gng-stat-val {
                font-size: 28px;
                font-weight: 800;
                color: #0f172a;
                margin-bottom: 6px;
            }
            .gng-stat-label {
                font-size: 12px;
                font-weight: 600;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .gng-controls {
                background: white;
                border-radius: 16px;
                padding: 16px;
                border: 1px solid #e2e8f0;
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
                align-items: center;
                margin-bottom: 24px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            }
            .gng-input {
                padding: 10px 16px;
                border: 1px solid #cbd5e1;
                border-radius: 10px;
                font-size: 14px;
                outline: none;
                transition: all 0.2s;
                background: #f8fafc;
                min-width: 200px;
                flex: 1;
            }
            .gng-input:focus {
                border-color: #6366f1;
                background: white;
                box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
            }
            .gng-select {
                padding: 10px 16px;
                border: 1px solid #cbd5e1;
                border-radius: 10px;
                font-size: 14px;
                outline: none;
                background: #f8fafc;
                min-width: 160px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .gng-select:focus {
                border-color: #6366f1;
                background: white;
            }
            .gng-table-card {
                background: white;
                border-radius: 16px;
                border: 1px solid #e2e8f0;
                overflow: hidden;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
            }
            .gng-table {
                width: 100%;
                border-collapse: collapse;
                text-align: left;
                font-size: 14px;
            }
            .gng-table th {
                background: #f8fafc;
                padding: 14px 20px;
                font-weight: 700;
                color: #475569;
                border-bottom: 2px solid #e2e8f0;
                text-transform: uppercase;
                font-size: 11px;
                letter-spacing: 0.5px;
            }
            .gng-table td {
                padding: 16px 20px;
                border-bottom: 1px solid #f1f5f9;
                color: #334155;
            }
            .gng-table tr:last-child td {
                border-bottom: none;
            }
            .gng-table tr:hover td {
                background: #fafafa;
            }
            .gng-price-badge {
                font-weight: 700;
                color: #0f172a;
            }
            .gng-price-sub {
                font-size: 11px;
                color: #64748b;
                margin-top: 2px;
            }
            .gng-badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 700;
            }
            .gng-badge-stable { background: #e0f2fe; color: #0369a1; }
            .gng-badge-up { background: #fef3c7; color: #b45309; }
            .gng-badge-down { background: #dcfce7; color: #15803d; }
            .gng-btn-new {
                background: linear-gradient(135deg, #4f46e5, #6366f1);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 10px;
                font-size: 14px;
                font-weight: 700;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(99,102,241,0.25);
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .gng-btn-new:hover {
                transform: translateY(-1px);
                box-shadow: 0 6px 18px rgba(99,102,241,0.35);
            }
            .gng-btn-new:active {
                transform: translateY(0);
            }
            .gng-empty {
                padding: 48px;
                text-align: center;
                color: #94a3b8;
            }
            .gng-empty-icon {
                font-size: 48px;
                margin-bottom: 12px;
            }
        `;
        document.head.appendChild(style);
    }

    // Load structure
    content.innerHTML = `
        <div class="gng-container">
            <div class="gng-header">
                <div class="gng-title-area">
                    <h2>🏷️ Giá Nhập Gốc</h2>
                    <p>Quản lý và tra cứu đơn giá nhập khẩu/nhập gốc nguyên vật liệu & phụ liệu sản xuất</p>
                </div>
                <button class="gng-btn-new" onclick="_gngOpenCreateModal()">
                    <span>➕</span> Cập nhật giá mới
                </button>
            </div>

            <div class="gng-stats" id="gngStatsArea">
                <!-- Stats rendered dynamically -->
            </div>

            <div class="gng-controls">
                <input type="text" id="gngSearch" class="gng-input" placeholder="🔍 Tìm kiếm nguyên vật liệu, màu sắc, nhà cung cấp...">
                <select id="gngSupplierFilter" class="gng-select" onchange="_gngUpdateFilters()">
                    <option value="">Nhà cung cấp: Tất cả</option>
                    <option value="Thành Công">Dệt May Thành Công</option>
                    <option value="Phong Phú">Dệt Kim Phong Phú</option>
                    <option value="Hạnh Vĩ">Hạnh Vĩ Fabric</option>
                    <option value="Hồng Phát">Hồng Phát Textile</option>
                </select>
                <select id="gngStatusFilter" class="gng-select" onchange="_gngUpdateFilters()">
                    <option value="">Trạng thái: Tất cả</option>
                    <option value="Bình ổn">Bình ổn</option>
                    <option value="Tăng nhẹ">Tăng nhẹ</option>
                    <option value="Giảm giá">Giảm giá</option>
                </select>
            </div>

            <div class="gng-table-card">
                <table class="gng-table">
                    <thead>
                        <tr>
                            <th>Tên Nguyên Vật Liệu</th>
                            <th>Màu Sắc</th>
                            <th>Nhà Cung Cấp</th>
                            <th style="text-align: right;">Giá Nhập Gốc</th>
                            <th style="text-align: center;">Thuế VAT</th>
                            <th style="text-align: right;">Giá Sau Thuế</th>
                            <th>Ngày Cập Nhật</th>
                            <th style="text-align: center;">Trạng Thái</th>
                            <th>Hành Động</th>
                        </tr>
                    </thead>
                    <tbody id="gngTableBody">
                        <!-- Rows rendered dynamically -->
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Event listener for search
    var searchInput = document.getElementById('gngSearch');
    if (searchInput) {
        searchInput.value = _gng.filter.search;
        searchInput.addEventListener('input', function(e) {
            _gng.filter.search = e.target.value;
            _gngRenderTable();
        });
    }

    _gngRenderStats();
    _gngRenderTable();
}

function _gngRenderStats() {
    var statsArea = document.getElementById('gngStatsArea');
    if (!statsArea) return;

    var totalItems = _gng.mockData.length;
    var avgPrice = _gng.mockData.reduce((acc, curr) => acc + curr.basePrice, 0) / totalItems;
    var stableCount = _gng.mockData.filter(d => d.status === 'Bình ổn').length;

    statsArea.innerHTML = `
        <div class="gng-stat-card" style="border-top: 4px solid #6366f1;">
            <div class="gng-stat-val">${totalItems}</div>
            <div class="gng-stat-label">Tổng Nguyên Vật Liệu</div>
        </div>
        <div class="gng-stat-card" style="border-top: 4px solid #10b981;">
            <div class="gng-stat-val">${Number(avgPrice.toFixed(0)).toLocaleString('vi-VN')} đ</div>
            <div class="gng-stat-label">Đơn Giá Trung Bình</div>
        </div>
        <div class="gng-stat-card" style="border-top: 4px solid #3b82f6;">
            <div class="gng-stat-val">${stableCount} / ${totalItems}</div>
            <div class="gng-stat-label">Tỷ Lệ Giá Bình Ổn</div>
        </div>
    `;
}

function _gngUpdateFilters() {
    var supEl = document.getElementById('gngSupplierFilter');
    var statEl = document.getElementById('gngStatusFilter');

    if (supEl) _gng.filter.supplier = supEl.value;
    if (statEl) _gng.filter.status = statEl.value;

    _gngRenderTable();
}

function _gngRenderTable() {
    var tbody = document.getElementById('gngTableBody');
    if (!tbody) return;

    var filtered = _gng.mockData.filter(function(item) {
        // Search filter
        if (_gng.filter.search) {
            var q = _gng.filter.search.toLowerCase();
            var matchesSearch = item.material.toLowerCase().indexOf(q) >= 0 ||
                                item.color.toLowerCase().indexOf(q) >= 0 ||
                                item.supplier.toLowerCase().indexOf(q) >= 0;
            if (!matchesSearch) return false;
        }

        // Supplier filter
        if (_gng.filter.supplier && item.supplier.indexOf(_gng.filter.supplier) === -1) {
            return false;
        }

        // Status filter
        if (_gng.filter.status && item.status !== _gng.filter.status) {
            return false;
        }

        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="gng-empty">
                        <div class="gng-empty-icon">🔍</div>
                        <h3>Không tìm thấy kết quả phù hợp</h3>
                        <p>Vui lòng thử lại với từ khóa hoặc bộ lọc khác</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    var html = '';
    filtered.forEach(function(item) {
        var statusBadge = '';
        if (item.status === 'Bình ổn') {
            statusBadge = `<span class="gng-badge gng-badge-stable">Bình ổn</span>`;
        } else if (item.status === 'Tăng nhẹ') {
            statusBadge = `<span class="gng-badge gng-badge-up">📈 Tăng nhẹ</span>`;
        } else {
            statusBadge = `<span class="gng-badge gng-badge-down">📉 Giảm giá</span>`;
        }

        // Format dates
        var formattedDate = item.date;
        try {
            var parts = item.date.split('-');
            formattedDate = parts[2] + '/' + parts[1] + '/' + parts[0];
        } catch(e) {}

        html += `
            <tr>
                <td style="font-weight: 700; color: #1e293b;">${item.material}</td>
                <td><span style="display:inline-flex; align-items:center; gap:6px;">🎨 ${item.color}</span></td>
                <td style="color: #475569; font-weight: 500;">${item.supplier}</td>
                <td style="text-align: right; font-weight: 700; color: #0f172a;">${Number(item.basePrice).toLocaleString('vi-VN')} đ</td>
                <td style="text-align: center; color: #64748b; font-weight: 600;">${item.vat}%</td>
                <td style="text-align: right; font-weight: 800; color: #4f46e5;">${Number(item.finalPrice).toLocaleString('vi-VN')} đ</td>
                <td style="color: #64748b;">${formattedDate}</td>
                <td style="text-align: center;">${statusBadge}</td>
                <td>
                    <button class="btn btn-xs btn-secondary" onclick="_gngEditPrice(${item.id})" style="padding: 4px 8px; border-radius: 6px;">✏️ Sửa</button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function _gngOpenCreateModal() {
    if (typeof showToast === 'function') {
        showToast('💡 Chức năng sẽ khả dụng khi có dữ liệu chính thức từ xưởng', 'info');
    }
}

function _gngEditPrice(id) {
    if (typeof showToast === 'function') {
        showToast('💡 Đang xem chi tiết vật tư #' + id + '. Chức năng cập nhật sẽ được hoàn thiện tiếp theo.', 'info');
    }
}
