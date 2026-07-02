/**
 * Báo Giá CTV/HH Page Controller
 * Path: public/js/pages/baogiactvhh.js
 */

async function renderBaogiactvhhPage(content) {
    if (!document.getElementById('_baogiactvhh_styles')) {
        const style = document.createElement('style');
        style.id = '_baogiactvhh_styles';
        style.textContent = `
            .baogiactvhh-container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 24px;
                font-family: 'Inter', sans-serif;
            }
            .baogiactvhh-header {
                background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                border-radius: 16px;
                padding: 24px;
                color: white;
                margin-bottom: 24px;
                box-shadow: 0 10px 25px rgba(59, 130, 246, 0.15);
            }
            .baogiactvhh-header h2 {
                margin: 0;
                font-size: 26px;
                font-weight: 800;
                color: #ffffff;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .baogiactvhh-header p {
                margin: 6px 0 0 0;
                font-size: 14px;
                color: rgba(255, 255, 255, 0.85);
            }
            .baogiactvhh-card {
                background: white;
                border-radius: 16px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
                border: 1px solid #f1f5f9;
                padding: 40px;
                text-align: center;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 400px;
            }
            .baogiactvhh-icon {
                font-size: 72px;
                margin-bottom: 16px;
                animation: baogiactvhhFloat 3s ease-in-out infinite;
            }
            .baogiactvhh-card h3 {
                font-size: 20px;
                font-weight: 800;
                color: #1e293b;
                margin: 0 0 8px 0;
            }
            .baogiactvhh-card p {
                font-size: 14px;
                color: #64748b;
                max-width: 480px;
                line-height: 1.6;
                margin: 0 0 24px 0;
            }
            .baogiactvhh-btn {
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: white;
                border: none;
                border-radius: 10px;
                padding: 12px 24px;
                font-size: 14px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
                text-decoration: none;
            }
            .baogiactvhh-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3);
            }
            @keyframes baogiactvhhFloat {
                0% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
                100% { transform: translateY(0px); }
            }
        `;
        document.head.appendChild(style);
    }

    content.innerHTML = `
        <div class="baogiactvhh-container">
            <div class="baogiactvhh-header">
                <h2>🤝 Báo Giá CTV/HH</h2>
                <p>Hệ thống tra cứu, quản lý chính sách và tính toán báo giá dành cho Cộng Tác Viên & Đại Lý đối tác</p>
            </div>
            
            <div class="baogiactvhh-card">
                <div class="baogiactvhh-icon">🤝</div>
                <h3>Đang cấu hình tính năng</h3>
                <p>Trang Báo Giá CTV/HH đang được thiết lập. Hệ thống sẽ sớm cập nhật các công thức tính toán chiết khấu, tỷ lệ hoa hồng và bảng giá đại lý chi tiết tại đây.</p>
                <button class="baogiactvhh-btn" onclick="saveSidebarScrollAndNavigate('/baogiagoc')">🧮 Quay lại Báo Giá Gốc</button>
            </div>
        </div>
    `;
}
