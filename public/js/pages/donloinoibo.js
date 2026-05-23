// ========== LỖI THƯỜNG GẶP & XỬ LÝ — Bộ Phận Văn Phòng ==========
function _ltgInit() {
    var content = document.getElementById('mainContent');
    if (!content) return;
    renderLoithuonggapPage(content);
}

function renderDonloinoiboPage(content) { renderLoithuonggapPage(content); }

function renderLoithuonggapPage(content) {
    content.innerHTML = `
        <div class="card">
            <div class="card-body">
                <div class="empty-state">
                    <div class="icon">📋</div>
                    <h3>Lỗi Thường Gặp & Xử Lý</h3>
                    <p>Tính năng đang được phát triển. Vui lòng quay lại sau.</p>
                </div>
            </div>
        </div>
    `;
}
