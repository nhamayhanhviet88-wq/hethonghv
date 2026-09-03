// ========== ĐÁNH GIÁ NHÂN SỰ ==========
function renderDanhgianhansuPage(container) {
    var c = container || document.getElementById('mainContent');
    if (!c) return;
    var html = '';
    html += '<div style="padding: 24px; max-width: 1200px; margin: 0 auto;">';
    html += '<div style="background: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); text-align: center; border: 1px solid #f1f5f9;">';
    html += '<div style="font-size: 48px; margin-bottom: 16px;">📝</div>';
    html += '<h2 style="font-size: 22px; font-weight: 800; color: #1e293b; margin-bottom: 10px;">ĐÁNH GIÁ NHÂN SỰ</h2>';
    html += '<p style="font-size: 14px; color: #64748b; margin: 0;">Trang Đánh Giá Nhân Sự đang được khởi tạo. Nội dung sẽ được cập nhật tiếp theo.</p>';
    html += '</div>';
    html += '</div>';
    c.innerHTML = html;
}
window.renderDanhgianhansuPage = renderDanhgianhansuPage;
