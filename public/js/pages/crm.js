// ========== CRM PAGE (shared for all 4 CRM types) ==========
async function renderCRMPage(container, crmType) {
    const label = CRM_LABELS[crmType] || 'CRM';
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const curDay = now.getDate();

    // Load staff list for TP/QL employee filter
    let employeeOptions = '';
    if (['giam_doc', 'quan_ly', 'truong_phong'].includes(currentUser.role)) {
        const staff = await apiCall('/api/managed-staff');
        const staffUsers = (staff.users || []).filter(u => ['nhan_vien', 'truong_phong'].includes(u.role));
        employeeOptions = staffUsers.map(u => `<option value="${u.id}">${u.full_name} (${ROLE_LABELS[u.role]})</option>`).join('');
    }

    // Generate year options (2024 to current year + 1)
    let yearOpts = '';
    for (let y = 2024; y <= curYear + 1; y++) {
        yearOpts += `<option value="${y}" ${y === curYear ? 'selected' : ''}>${y}</option>`;
    }

    // Generate month options
    let monthOpts = '';
    for (let m = 1; m <= 12; m++) {
        monthOpts += `<option value="${m}" ${m === curMonth ? 'selected' : ''}>Tháng ${m}</option>`;
    }

    // Generate day options
    let dayOpts = '';
    for (let d = 1; d <= 31; d++) {
        dayOpts += `<option value="${d}" ${d === curDay ? 'selected' : ''}>Ngày ${d}</option>`;
    }

    container.innerHTML = `
        <div style="display:flex; gap:0; min-height:calc(100vh - 120px);">
            <!-- FILTER SIDEBAR -->
            <div class="crm-filter-panel" id="crmFilterPanel">
                <div class="filter-section">
                    <div class="filter-title">📅 BỘ LỌC</div>
                    
                    <div class="filter-group">
                        <label class="filter-label">
                            <input type="checkbox" id="filterYearOn" checked> Năm
                        </label>
                        <select id="crmFilterYear" class="filter-select">${yearOpts}</select>
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">
                            <input type="checkbox" id="filterMonthOn" checked> Tháng
                        </label>
                        <select id="crmFilterMonth" class="filter-select">${monthOpts}</select>
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">
                            <input type="checkbox" id="filterDayOn"> Ngày
                        </label>
                        <select id="crmFilterDay" class="filter-select" disabled>${dayOpts}</select>
                    </div>

                    ${['giam_doc','quan_ly','truong_phong'].includes(currentUser.role) ? `
                    <div class="filter-group" style="margin-top:8px;">
                        <label class="filter-label">
                            <input type="checkbox" id="filterEmpOn"> Nhân Viên
                        </label>
                        <select id="crmFilterEmployee" class="filter-select" disabled>
                            <option value="">Tất cả NV</option>
                            ${employeeOptions}
                        </select>
                    </div>
                    ` : ''}

                    <button class="btn btn-primary" onclick="applyCrmFilter()" style="width:100%;margin-top:12px;padding:8px;font-size:13px;">🔍 Lọc Dữ Liệu</button>
                    <button class="btn btn-secondary" onclick="resetCrmFilter()" style="width:100%;margin-top:8px;padding:6px;font-size:12px;">↩️ Mặc Định</button>
                </div>

                <div class="filter-stats" id="filterStats">
                    <div class="filter-stat-label">Kết quả</div>
                    <div class="filter-stat-value" id="filterResultCount">--</div>
                </div>
            </div>

            <!-- MAIN TABLE AREA -->
            <div style="flex:1; min-width:0;">
                <div style="display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; align-items:center;">
                    <select id="crmFilterStatus" class="form-control" style="width:auto;min-width:160px;">
                        <option value="">Tất cả trạng thái</option>
                        <option value="dang_tu_van">Đang Tư Vấn</option>
                        <option value="bao_gia">Báo Giá</option>
                        <option value="dat_coc">Đã Đặt Cọc</option>
                        <option value="chot_don">Chốt Đơn</option>
                        <option value="san_xuat">Sản Xuất</option>
                        <option value="giao_hang">Giao Hàng</option>
                        <option value="hoan_thanh">Hoàn Thành</option>
                    </select>
                    <input type="text" id="crmSearch" class="form-control" placeholder="🔍 Tìm tên hoặc SĐT..." style="width:auto;min-width:250px;">
                    <div style="margin-left:auto;font-size:13px;color:var(--gray-400);" id="crmFilterInfo"></div>
                </div>
                <div class="card">
                    <div class="card-body" style="overflow-x:auto;">
                        <table class="table" id="crmTable">
                            <thead><tr>
                                <th>Mã</th><th>Khách Hàng</th><th>SĐT</th><th>Nguồn</th>
                                <th>Người Nhận</th><th>Trạng Thái</th><th>Ngày</th><th>Thao Tác</th>
                            </tr></thead>
                            <tbody id="crmTbody"><tr><td colspan="8" style="text-align:center;padding:40px;">⏳ Đang tải...</td></tr></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Store current CRM type globally for reload
    window._currentCrmType = crmType;

    // Checkbox toggles
    document.getElementById('filterYearOn').addEventListener('change', (e) => {
        document.getElementById('crmFilterYear').disabled = !e.target.checked;
    });
    document.getElementById('filterMonthOn').addEventListener('change', (e) => {
        document.getElementById('crmFilterMonth').disabled = !e.target.checked;
    });
    document.getElementById('filterDayOn').addEventListener('change', (e) => {
        document.getElementById('crmFilterDay').disabled = !e.target.checked;
    });
    const empCheckbox = document.getElementById('filterEmpOn');
    if (empCheckbox) {
        empCheckbox.addEventListener('change', (e) => {
            document.getElementById('crmFilterEmployee').disabled = !e.target.checked;
        });
    }

    // Auto-load on status/search change
    document.getElementById('crmFilterStatus').addEventListener('change', () => loadCrmData(crmType));
    let searchTimeout;
    document.getElementById('crmSearch').addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => loadCrmData(crmType), 400);
    });

    // Initial load with year+month
    await loadCrmData(crmType);
}

async function loadCrmData(crmType) {
    const status = document.getElementById('crmFilterStatus')?.value || '';
    const search = document.getElementById('crmSearch')?.value || '';
    let url = `/api/customers?crm_type=${crmType}`;
    if (status) url += `&order_status=${status}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    // Date filters
    const yearOn = document.getElementById('filterYearOn')?.checked;
    const monthOn = document.getElementById('filterMonthOn')?.checked;
    const dayOn = document.getElementById('filterDayOn')?.checked;
    if (yearOn) {
        const year = document.getElementById('crmFilterYear')?.value;
        if (year) url += `&year=${year}`;
    }
    if (monthOn) {
        const month = document.getElementById('crmFilterMonth')?.value;
        if (month) url += `&month=${month}`;
    }
    if (dayOn) {
        const day = document.getElementById('crmFilterDay')?.value;
        if (day) url += `&day=${day}`;
    }

    // Employee filter
    const empOn = document.getElementById('filterEmpOn')?.checked;
    if (empOn) {
        const empId = document.getElementById('crmFilterEmployee')?.value;
        if (empId) url += `&employee_id=${empId}`;
    }

    const data = await apiCall(url);
    const tbody = document.getElementById('crmTbody');
    const resultCount = document.getElementById('filterResultCount');

    if (!data.customers || data.customers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="icon">📭</div><h3>Chưa có khách hàng</h3></div></td></tr>`;
        if (resultCount) resultCount.textContent = '0';
        updateFilterInfo();
        return;
    }

    const filtered = data.customers.filter(c => !c.cancel_approved);
    if (resultCount) resultCount.textContent = filtered.length;
    updateFilterInfo();

    tbody.innerHTML = filtered.map(c => `<tr>
        <td><strong style="color:var(--gold)">${getCustomerCode(c)}</strong></td>
        <td>${c.customer_name}</td>
        <td>${c.readonly ? '<span style="color:var(--gray-400)">' + c.phone + '</span>' : '<a href="tel:' + c.phone + '" style="color:var(--info)">' + c.phone + '</a>'}</td>
        <td>${c.source_name || '-'}</td>
        <td>${c.assigned_to_name || '-'}</td>
        <td>${getStatusBadge(c.order_status)}</td>
        <td>${formatDate(c.created_at)}</td>
        <td>
            <button class="btn btn-sm" onclick="showCustomerDetail(${c.id})" title="Chi tiết">👁️</button>
            ${!c.readonly && ['giam_doc','quan_ly','truong_phong','nhan_vien'].includes(currentUser.role)
                ? `<button class="btn btn-sm" onclick="showEditStatus(${c.id}, '${c.order_status}')" title="Cập nhật">📝</button>`
                : ''}
        </td>
    </tr>`).join('');
}

function applyCrmFilter() {
    loadCrmData(window._currentCrmType);
}

function resetCrmFilter() {
    const now = new Date();
    document.getElementById('filterYearOn').checked = true;
    document.getElementById('filterMonthOn').checked = true;
    document.getElementById('filterDayOn').checked = false;
    document.getElementById('crmFilterYear').value = now.getFullYear();
    document.getElementById('crmFilterYear').disabled = false;
    document.getElementById('crmFilterMonth').value = now.getMonth() + 1;
    document.getElementById('crmFilterMonth').disabled = false;
    document.getElementById('crmFilterDay').disabled = true;
    document.getElementById('crmFilterStatus').value = '';
    document.getElementById('crmSearch').value = '';

    const empOn = document.getElementById('filterEmpOn');
    if (empOn) {
        empOn.checked = false;
        document.getElementById('crmFilterEmployee').disabled = true;
        document.getElementById('crmFilterEmployee').value = '';
    }

    loadCrmData(window._currentCrmType);
}

function updateFilterInfo() {
    const info = document.getElementById('crmFilterInfo');
    if (!info) return;
    const parts = [];
    if (document.getElementById('filterYearOn')?.checked) parts.push('Năm ' + (document.getElementById('crmFilterYear')?.value || ''));
    if (document.getElementById('filterMonthOn')?.checked) parts.push('T' + (document.getElementById('crmFilterMonth')?.value || ''));
    if (document.getElementById('filterDayOn')?.checked) parts.push('Ngày ' + (document.getElementById('crmFilterDay')?.value || ''));
    const empOn = document.getElementById('filterEmpOn');
    if (empOn?.checked) {
        const sel = document.getElementById('crmFilterEmployee');
        if (sel?.value) parts.push(sel.options[sel.selectedIndex]?.text || '');
    }
    info.textContent = parts.length > 0 ? '🔍 ' + parts.join(' • ') : '';
}

// ========== SỐ HÔM NAY PHẢI XỬ LÝ (placeholder) ==========
function renderSoHomNayPage(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header"><h3>📌 Số Hôm Nay Phải Xử Lý</h3></div>
            <div class="card-body">
                <div class="empty-state">
                    <div class="icon">🚧</div>
                    <h3>Tính năng đang phát triển</h3>
                    <p style="color:var(--gray-400);">Tính năng này sẽ được cập nhật sớm.</p>
                </div>
            </div>
        </div>
    `;
}

// ========== CUSTOMER DETAIL MODAL ==========
async function showCustomerDetail(id) {
    const data = await apiCall(`/api/customers/${id}`);
    if (!data.customer) { showToast('Không tìm thấy', 'error'); return; }
    const c = data.customer;
    const items = data.items || [];

    const grandTotal = items.reduce((s, i) => s + (i.total || 0), 0);

    let bodyHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom:16px;">
            <div><strong>Mã:</strong> <span style="color:var(--gold)">${getCustomerCode(c)}</span></div>
            <div><strong>CRM:</strong> ${CRM_LABELS[c.crm_type] || c.crm_type}</div>
            <div><strong>Khách hàng:</strong> ${c.customer_name}</div>
            <div><strong>SĐT:</strong> <a href="tel:${c.phone}">${c.phone}</a></div>
            <div><strong>Nguồn:</strong> ${c.source_name || '-'}</div>
            <div><strong>Khuyến mãi:</strong> ${c.promotion_name || '-'}</div>
            <div><strong>Lĩnh vực:</strong> ${c.industry_name || '-'}</div>
            <div><strong>Người nhận:</strong> ${c.assigned_to_name || '-'}</div>
            <div><strong>Trạng thái:</strong> ${getStatusBadge(c.order_status)}</div>
            <div><strong>Ngày bàn giao:</strong> ${formatDate(c.handover_date)}</div>
            ${c.referrer_name ? `<div><strong>CTV giới thiệu:</strong> ${c.referrer_name}</div>` : ''}
            ${c.notes ? `<div style="grid-column:1/-1"><strong>Ghi chú:</strong> ${c.notes}</div>` : ''}
        </div>
        <hr style="border-color: var(--gray-700); margin: 16px 0;">
        <h4 style="margin-bottom: 12px;">📦 Chi Tiết Đơn Hàng</h4>
        <div id="orderItemsArea">
            <table class="table" style="font-size:13px;" id="orderItemsTable">
                <thead><tr><th>Mô tả</th><th style="width:80px">SL</th><th style="width:120px">Đơn giá</th><th style="width:120px">Thành tiền</th><th style="width:50px"></th></tr></thead>
                <tbody>
                    ${items.length > 0 ? items.map((it, i) => `<tr>
                        <td><input class="form-control oi-desc" value="${it.description || ''}" style="font-size:13px;padding:6px 8px;"></td>
                        <td><input type="number" class="form-control oi-qty" value="${it.quantity || 0}" min="0" style="font-size:13px;padding:6px 8px;"></td>
                        <td><input type="number" class="form-control oi-price" value="${it.unit_price || 0}" min="0" style="font-size:13px;padding:6px 8px;"></td>
                        <td class="oi-total" style="text-align:right;font-weight:600">${formatCurrency(it.total)}</td>
                        <td><button class="btn btn-sm" onclick="this.closest('tr').remove();calcOrderTotal();" style="color:var(--danger)">✕</button></td>
                    </tr>`).join('') : ''}
                </tbody>
            </table>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <button class="btn btn-sm" onclick="addOrderItemRow()" style="font-size:12px;">➕ Thêm dòng</button>
                <div style="font-size:16px;font-weight:700;">Tổng: <span id="orderGrandTotal" style="color:var(--gold)">${formatCurrency(grandTotal)}</span> VNĐ</div>
            </div>
        </div>
    `;

    const isReadonly = c.readonly;
    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
        ${!isReadonly && ['giam_doc','quan_ly','truong_phong','nhan_vien'].includes(currentUser.role)
            ? `<button class="btn btn-primary" onclick="saveOrderItems(${c.id})" style="width:auto;">💾 Lưu Đơn Hàng</button>
               <button class="btn" onclick="requestCancel(${c.id})" style="width:auto;background:var(--danger);color:white;">❌ Hủy KH</button>`
            : ''}
    `;

    openModal(`📋 Chi Tiết Khách Hàng #${getCustomerCode(c)}`, bodyHTML, footerHTML);

    // Attach input handlers for live total calculation
    setTimeout(() => {
        document.querySelectorAll('.oi-qty, .oi-price').forEach(el => {
            el.addEventListener('input', calcOrderTotal);
        });
    }, 100);
}

function addOrderItemRow() {
    const tbody = document.querySelector('#orderItemsTable tbody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input class="form-control oi-desc" value="" style="font-size:13px;padding:6px 8px;" placeholder="Mô tả sản phẩm"></td>
        <td><input type="number" class="form-control oi-qty" value="0" min="0" style="font-size:13px;padding:6px 8px;"></td>
        <td><input type="number" class="form-control oi-price" value="0" min="0" style="font-size:13px;padding:6px 8px;"></td>
        <td class="oi-total" style="text-align:right;font-weight:600">0</td>
        <td><button class="btn btn-sm" onclick="this.closest('tr').remove();calcOrderTotal();" style="color:var(--danger)">✕</button></td>
    `;
    tbody.appendChild(tr);
    tr.querySelectorAll('.oi-qty, .oi-price').forEach(el => el.addEventListener('input', calcOrderTotal));
}

function calcOrderTotal() {
    let grand = 0;
    document.querySelectorAll('#orderItemsTable tbody tr').forEach(row => {
        const qty = Number(row.querySelector('.oi-qty')?.value) || 0;
        const price = Number(row.querySelector('.oi-price')?.value) || 0;
        const total = qty * price;
        const td = row.querySelector('.oi-total');
        if (td) td.textContent = formatCurrency(total);
        grand += total;
    });
    const el = document.getElementById('orderGrandTotal');
    if (el) el.textContent = formatCurrency(grand);
}

async function saveOrderItems(customerId) {
    const items = [];
    document.querySelectorAll('#orderItemsTable tbody tr').forEach(row => {
        items.push({
            description: row.querySelector('.oi-desc')?.value || '',
            quantity: Number(row.querySelector('.oi-qty')?.value) || 0,
            unit_price: Number(row.querySelector('.oi-price')?.value) || 0
        });
    });

    const data = await apiCall(`/api/customers/${customerId}/items`, 'POST', { items });
    if (data.success) {
        showToast(`💾 Đã lưu! Tổng đơn: ${formatCurrency(data.grand_total)} VNĐ`);
    } else {
        showToast(data.error || 'Lỗi lưu đơn', 'error');
    }
}

// ========== UPDATE STATUS ==========
function showEditStatus(id, currentStatus) {
    const statuses = ['dang_tu_van','bao_gia','dat_coc','chot_don','san_xuat','giao_hang','hoan_thanh'];
    const bodyHTML = `
        <div class="form-group">
            <label>Chọn trạng thái mới</label>
            <select id="newStatus" class="form-control">
                ${statuses.map(s => `<option value="${s}" ${s === currentStatus ? 'selected' : ''}>${STATUS_LABELS[s].text}</option>`).join('')}
            </select>
        </div>
    `;
    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="updateCustomerStatus(${id})" style="width:auto;">Cập Nhật</button>
    `;
    openModal('📝 Cập Nhật Trạng Thái', bodyHTML, footerHTML);
}

async function updateCustomerStatus(id) {
    const status = document.getElementById('newStatus').value;
    const data = await apiCall(`/api/customers/${id}/status`, 'PUT', { order_status: status });
    if (data.success) {
        showToast('✅ ' + data.message);
        closeModal();
        // Reload just the CRM table, preserving filters/scroll
        if (window._currentCrmType) {
            await loadCrmData(window._currentCrmType);
        }
    } else {
        showToast(data.error, 'error');
    }
}

// ========== CANCEL REQUEST ==========
function requestCancel(id) {
    const bodyHTML = `
        <div class="form-group">
            <label>Lý do hủy khách hàng <span style="color:var(--danger)">*</span></label>
            <textarea id="cancelReason" class="form-control" rows="3" placeholder="Nhập lý do hủy..."></textarea>
        </div>
    `;
    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Quay lại</button>
        <button class="btn" onclick="submitCancel(${id})" style="width:auto;background:var(--danger);color:white;">❌ Xác Nhận Hủy</button>
    `;
    openModal('❌ Hủy Khách Hàng', bodyHTML, footerHTML);
}

async function submitCancel(id) {
    const reason = document.getElementById('cancelReason').value;
    if (!reason) { showToast('Vui lòng nhập lý do hủy', 'error'); return; }

    const data = await apiCall(`/api/customers/${id}/cancel`, 'POST', { reason });
    if (data.success) {
        showToast('✅ ' + data.message);
        closeModal();
        handleRoute();
    } else {
        showToast(data.error, 'error');
    }
}
