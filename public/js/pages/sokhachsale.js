// PUBLIC/JS/PAGES/SOKHACHSALE.JS
// Shared CRM page wrapper for Sổ Khách Sale module

async function renderSokhachsalePage(container) {
    if (typeof renderCRMPage === 'function') {
        await renderCRMPage(container, 'sale');
    } else {
        container.innerHTML = `
            <div class="card">
                <div class="card-header"><h3>📖 Sổ Khách Sale</h3></div>
                <div class="card-body">
                    <div class="alert alert-danger">Lỗi: Không tìm thấy hàm renderCRMPage!</div>
                </div>
            </div>
        `;
    }
}
