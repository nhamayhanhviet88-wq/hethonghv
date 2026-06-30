// ========== TỈ LỆ CẮT GỐC — Desktop SPA ==========
var _tlcg = {
    materials: [],
    categories: [],
    targets: [],
    filter: {
        search: ''
    },
    isGD: false
};

async function renderTilecatgocPage(content) {
    if (!content) content = document.getElementById('contentArea');
    if (!content) return;

    // Inject custom CSS
    if (!document.getElementById('_tlcgStyles')) {
        const style = document.createElement('style');
        style.id = '_tlcgStyles';
        style.textContent = `
            .tlcg-container {
                padding: 24px;
                background: #f8fafc;
                min-height: 100%;
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                animation: tlcgFadeIn 0.3s ease-out;
            }
            @keyframes tlcgFadeIn {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .tlcg-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 16px;
            }
            .tlcg-title-area h2 {
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
            .tlcg-title-area p {
                font-size: 13px;
                color: #64748b;
                margin: 4px 0 0 0;
            }
            .tlcg-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                gap: 20px;
                margin-bottom: 24px;
            }
            .tlcg-stat-card {
                background: white;
                border-radius: 16px;
                padding: 20px;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
                border: 1px solid #e2e8f0;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
            }
            .tlcg-stat-val {
                font-size: 28px;
                font-weight: 800;
                color: #4f46e5;
                margin-bottom: 6px;
            }
            .tlcg-stat-label {
                font-size: 13px;
                color: #64748b;
                font-weight: 600;
            }
            .tlcg-card {
                background: white;
                border-radius: 16px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
                padding: 24px;
            }
            .tlcg-controls {
                display: flex;
                gap: 12px;
                margin-bottom: 20px;
                align-items: center;
                justify-content: space-between;
            }
            .tlcg-search-box {
                position: relative;
                flex: 1;
                max-width: 400px;
            }
            .tlcg-search-input {
                width: 100%;
                padding: 10px 16px 10px 40px;
                border: 1px solid #cbd5e1;
                border-radius: 10px;
                font-size: 13.5px;
                outline: none;
                transition: all 0.2s;
            }
            .tlcg-search-input:focus {
                border-color: #4f46e5;
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
            }
            .tlcg-search-icon {
                position: absolute;
                left: 14px;
                top: 50%;
                transform: translateY(-50%);
                color: #94a3b8;
                font-size: 16px;
                pointer-events: none;
            }
            .tlcg-table-wrapper {
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                overflow: hidden;
            }
            .tlcg-table {
                width: 100%;
                border-collapse: collapse;
                text-align: left;
            }
            .tlcg-table th {
                background: #f8fafc;
                padding: 14px 16px;
                font-size: 11px;
                font-weight: 700;
                color: #475569;
                text-transform: uppercase;
                border-bottom: 1px solid #e2e8f0;
            }
            .tlcg-table td {
                padding: 14px 16px;
                font-size: 13.5px;
                color: #334155;
                border-bottom: 1px solid #f1f5f9;
            }
            .tlcg-table tr:last-child td {
                border-bottom: none;
            }
            .tlcg-table tr:hover td {
                background: #f8fafc;
            }
            .tlcg-ratio-badge {
                padding: 4px 8px;
                border-radius: 6px;
                font-weight: 700;
                font-size: 12px;
                display: inline-block;
            }
            .tlcg-ratio-ao { background: #dbeafe; color: #1e40af; }
            .tlcg-ratio-tre { background: #dcfce7; color: #15803d; }
            .tlcg-ratio-over { background: #fef3c7; color: #d97706; }
            
            .tlcg-btn-edit {
                background: #ede9fe;
                color: #5b21b6;
                border: none;
                padding: 6px 12px;
                border-radius: 8px;
                font-weight: 700;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.15s;
            }
            .tlcg-btn-edit:hover {
                background: #ddd6fe;
            }
            .tlcg-btn-save-all {
                background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 10px;
                font-weight: 700;
                font-size: 13.5px;
                cursor: pointer;
                box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .tlcg-btn-save-all:hover {
                transform: translateY(-1px);
                box-shadow: 0 8px 12px -1px rgba(79, 70, 229, 0.3);
            }
            .tlcg-ratio-input {
                width: 70px;
                padding: 6px 8px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 700;
                text-align: center;
                outline: none;
            }
            .tlcg-ratio-input:focus {
                border-color: #4f46e5;
                box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
            }
        `;
        document.head.appendChild(style);
    }

    _tlcg.content = content;
    _tlcg.isGD = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';

    await _tlcgLoadData();
}

async function _tlcgLoadData() {
    try {
        const res = await apiCall('/api/cutting/target-ratios', 'GET');
        _tlcg.materials = res.materials || [];
        _tlcg.categories = res.categories || [];
        _tlcg.targets = res.targets || [];
        _tlcgRenderPage();
    } catch (err) {
        console.error('[TLCG load error]', err);
        if (typeof showToast === 'function') showToast('Không thể tải dữ liệu tỉ lệ cắt gốc: ' + err.message, 'error');
    }
}

function _tlcgRenderPage() {
    if (!_tlcg.content) return;

    // Calculate statistics
    const totalMaterials = _tlcg.materials.length;
    const configuredCount = new Set(_tlcg.targets.map(t => t.material_id)).size;

    let html = `
        <div class="tlcg-container">
            <div class="tlcg-header">
                <div class="tlcg-title-area">
                    <h2>📏 Tỉ Lệ Cắt Gốc</h2>
                    <p>Cấu hình định lượng số sản phẩm cắt được trên mỗi kg vải (sp/kg)</p>
                </div>
                ${_tlcg.isGD ? `
                    <button class="tlcg-btn-save-all" onclick="_tlcgSaveAll()">
                        💾 Lưu Cấu Hình
                    </button>
                ` : ''}
            </div>

            <div class="tlcg-stats">
                <div class="tlcg-stat-card">
                    <span class="tlcg-stat-val">${totalMaterials}</span>
                    <span class="tlcg-stat-label">Tổng số loại vải</span>
                </div>
                <div class="tlcg-stat-card">
                    <span class="tlcg-stat-val" style="color: #10b981;">${configuredCount}</span>
                    <span class="tlcg-stat-label">Loại vải đã cấu hình tỉ lệ</span>
                </div>
                <div class="tlcg-stat-card">
                    <span class="tlcg-stat-val" style="color: #f59e0b;">${totalMaterials - configuredCount}</span>
                    <span class="tlcg-stat-label">Chưa cấu hình</span>
                </div>
            </div>

            <div class="tlcg-card">
                <div class="tlcg-controls">
                    <div class="tlcg-search-box">
                        <span class="tlcg-search-icon">🔍</span>
                        <input type="text" class="tlcg-search-input" id="tlcgSearch" placeholder="Tìm kiếm loại vải..." value="${_tlcg.filter.search}" oninput="_tlcgHandleSearch(this.value)">
                    </div>
                </div>

                <div class="tlcg-table-wrapper">
                    <table class="tlcg-table">
                        <thead>
                            <tr>
                                <th style="width: 60px; text-align: center;">STT</th>
                                <th>Loại Vải</th>
                                <th>Kho Vải</th>
                                <th style="text-align: center;">👔 Áo (sp/kg)</th>
                                <th style="text-align: center;">👶 Áo Trẻ Em (sp/kg)</th>
                                <th style="text-align: center;">👕 Áo Oversize (sp/kg)</th>
                            </tr>
                        </thead>
                        <tbody id="tlcgTbody">
                            ${_tlcgRenderRows()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    _tlcg.content.innerHTML = html;
}

function _tlcgRenderRows() {
    const q = (_tlcg.filter.search || '').trim().toLowerCase();
    const filtered = _tlcg.materials.filter(m => {
        return !q || (m.name || '').toLowerCase().indexOf(q) >= 0 || (m.warehouse_name || '').toLowerCase().indexOf(q) >= 0;
    });

    if (filtered.length === 0) {
        return `<tr><td colspan="6" style="text-align: center; padding: 40px; color: #64748b;">Không tìm thấy loại vải nào</td></tr>`;
    }

    return filtered.map((m, idx) => {
        const targetAo = _tlcg.targets.find(t => t.material_id === m.id && t.cutting_category === 'Áo')?.target_ratio || 0;
        const targetTre = _tlcg.targets.find(t => t.material_id === m.id && t.cutting_category === 'Áo Trẻ Em')?.target_ratio || 0;
        const targetOver = _tlcg.targets.find(t => t.material_id === m.id && t.cutting_category === 'Áo Oversize')?.target_ratio || 0;

        return `
            <tr>
                <td style="text-align: center; color: #94a3b8; font-weight: 600;">${idx + 1}</td>
                <td style="font-weight: 700; color: #1e293b;">${m.name}</td>
                <td><span class="badge badge-secondary" style="font-size: 11px; padding: 4px 8px;">${m.warehouse_name || 'Kho vải'}</span></td>
                <td style="text-align: center;">
                    ${_tlcg.isGD ? `
                        <input type="number" step="0.1" min="0" class="tlcg-ratio-input" data-mat="${m.id}" data-cat="Áo" value="${targetAo}">
                    ` : `
                        <span class="tlcg-ratio-badge tlcg-ratio-ao">${targetAo > 0 ? targetAo + ' sp/kg' : '---'}</span>
                    `}
                </td>
                <td style="text-align: center;">
                    ${_tlcg.isGD ? `
                        <input type="number" step="0.1" min="0" class="tlcg-ratio-input" data-mat="${m.id}" data-cat="Áo Trẻ Em" value="${targetTre}">
                    ` : `
                        <span class="tlcg-ratio-badge tlcg-ratio-tre">${targetTre > 0 ? targetTre + ' sp/kg' : '---'}</span>
                    `}
                </td>
                <td style="text-align: center;">
                    ${_tlcg.isGD ? `
                        <input type="number" step="0.1" min="0" class="tlcg-ratio-input" data-mat="${m.id}" data-cat="Áo Oversize" value="${targetOver}">
                    ` : `
                        <span class="tlcg-ratio-badge tlcg-ratio-over">${targetOver > 0 ? targetOver + ' sp/kg' : '---'}</span>
                    `}
                </td>
            </tr>
        `;
    }).join('');
}

function _tlcgHandleSearch(val) {
    _tlcg.filter.search = val;
    const tbody = document.getElementById('tlcgTbody');
    if (tbody) {
        tbody.innerHTML = _tlcgRenderRows();
    }
}

async function _tlcgSaveAll() {
    const inputs = document.querySelectorAll('.tlcg-ratio-input');
    const ratios = [];
    
    for (const inp of inputs) {
        const matId = parseInt(inp.dataset.mat);
        const cat = inp.dataset.cat;
        const val = parseFloat(inp.value) || 0;
        
        if (val < 0) {
            if (typeof showToast === 'function') showToast('Tỉ lệ không được âm!', 'error');
            inp.focus();
            return;
        }
        
        ratios.push({
            material_id: matId,
            cutting_category: cat,
            target_ratio: val
        });
    }

    try {
        const res = await apiCall('/api/cutting/target-ratios', 'POST', { ratios });
        if (res.success) {
            if (typeof showToast === 'function') showToast('Đã lưu cấu hình tỉ lệ cắt gốc thành công!', 'success');
            await _tlcgLoadData();
        } else {
            if (typeof showToast === 'function') showToast(res.error || 'Có lỗi xảy ra khi lưu', 'error');
        }
    } catch (err) {
        console.error('[TLCG save error]', err);
        if (typeof showToast === 'function') showToast('Không thể lưu cấu hình: ' + err.message, 'error');
    }
}
