// ============================================================================
// ⏰ 3. HẸN GIỜ BẬT CAMP — FRONTEND PAGE RENDERER (PLACEHOLDER)
// ============================================================================

window.renderHengiobatcampPage = function(container) {
    if (!container) return;
    
    container.innerHTML = `
        <style>
            .hengiobatcamp-wrapper {
                padding: 16px;
                max-width: 1400px;
                margin: 0 auto;
            }
            .hengiobatcamp-header {
                background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
                color: #ffffff;
                padding: 24px;
                border-radius: 16px;
                box-shadow: 0 10px 25px -5px rgba(49, 46, 129, 0.3);
                margin-bottom: 24px;
            }
            .hengiobatcamp-title {
                font-size: 24px;
                font-weight: 800;
                display: flex;
                align-items: center;
                gap: 10px;
                margin: 0 0 8px 0;
            }
            .hengiobatcamp-subtitle {
                font-size: 14px;
                opacity: 0.85;
                margin: 0;
            }
            .hengiobatcamp-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                padding: 32px;
                text-align: center;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            }
            .hengiobatcamp-card-icon {
                font-size: 48px;
                margin-bottom: 16px;
            }
            .hengiobatcamp-card-title {
                font-size: 18px;
                font-weight: 700;
                color: #1e293b;
                margin-bottom: 8px;
            }
            .hengiobatcamp-card-desc {
                font-size: 14px;
                color: #64748b;
                max-width: 500px;
                margin: 0 auto 20px auto;
                line-height: 1.5;
            }
            .hengiobatcamp-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: #e0e7ff;
                color: #3730a3;
                padding: 6px 14px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 600;
            }
        </style>

        <div class="hengiobatcamp-wrapper">
            <div class="hengiobatcamp-header">
                <h1 class="hengiobatcamp-title">⏰ 3. Hẹn Giờ Bật Camp</h1>
                <p class="hengiobatcamp-subtitle">Lên lịch & tự động hẹn giờ BẬT chiến dịch Facebook Ads theo thời gian tùy chỉnh</p>
            </div>

            <div class="hengiobatcamp-card">
                <div class="hengiobatcamp-card-icon">⏳</div>
                <div class="hengiobatcamp-card-title">Tính Năng Đang Trong Quá Trình Chuẩn Bị</div>
                <div class="hengiobatcamp-card-desc">
                    Menu & đường dẫn <strong>/hengiobatcamp</strong> đã được khởi tạo thành công. Giao diện chi tiết sẽ được tích hợp theo yêu cầu phát triển tiếp theo.
                </div>
                <div>
                    <span class="hengiobatcamp-badge">⚙️ Đã sẵn sàng cho giai đoạn phát triển</span>
                </div>
            </div>
        </div>
    `;
};
