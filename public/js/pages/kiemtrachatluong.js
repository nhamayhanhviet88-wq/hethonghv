// ========== KIỂM TRA CHẤT LƯỢNG — Desktop SPA Embed ==========

function renderKiemtrachatluongPage(content) {
    // Check if css is already injected
    if (!document.getElementById('_ktclS')) {
        const st = document.createElement('style');
        st.id = '_ktclS';
        st.textContent = `
            .ktcl-desktop-container {
                display: flex;
                gap: 32px;
                padding: 24px;
                align-items: flex-start;
                justify-content: center;
                max-width: 1200px;
                margin: 0 auto;
                min-height: calc(100vh - 80px);
            }
            .ktcl-info-panel {
                flex: 1.2;
                background: linear-gradient(135deg, #1e293b, #0f172a);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 20px;
                padding: 30px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
                color: #f3f4f6;
            }
            .ktcl-info-panel h2 {
                font-size: 24px;
                font-weight: 800;
                margin-bottom: 16px;
                background: linear-gradient(to right, #2dd4bf, #06b6d4);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .ktcl-intro-text {
                font-size: 14px;
                line-height: 1.6;
                color: #94a3b8;
                margin-bottom: 24px;
            }
            .ktcl-mobile-btn {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                background: linear-gradient(135deg, #0d9488, #14b8a6);
                color: white;
                text-decoration: none;
                padding: 12px 24px;
                border-radius: 12px;
                font-weight: 700;
                font-size: 14px;
                box-shadow: 0 4px 15px rgba(20, 184, 166, 0.35);
                transition: all 0.2s;
                border: none;
                cursor: pointer;
            }
            .ktcl-mobile-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(20, 184, 166, 0.45);
            }
            
            /* Workflow Steps */
            .workflow-section {
                margin-top: 30px;
                border-top: 1px solid rgba(255, 255, 255, 0.08);
                padding-top: 24px;
            }
            .workflow-section h3 {
                font-size: 16px;
                font-weight: 700;
                color: #e2e8f0;
                margin-bottom: 16px;
            }
            .step-list {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            .step-item {
                display: flex;
                gap: 14px;
                align-items: flex-start;
            }
            .step-number {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: rgba(45, 212, 191, 0.12);
                border: 1px solid rgba(45, 212, 191, 0.25);
                color: #2dd4bf;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 12px;
                flex-shrink: 0;
            }
            .step-detail h4 {
                font-size: 13.5px;
                font-weight: 600;
                color: #f1f5f9;
                margin-bottom: 3px;
            }
            .step-detail p {
                font-size: 12px;
                color: #64748b;
                line-height: 1.5;
            }

            /* QR Container */
            .qr-container {
                margin-top: 30px;
                background: rgba(255, 255, 255, 0.03);
                border: 1px dashed rgba(255, 255, 255, 0.1);
                border-radius: 14px;
                padding: 16px;
                display: flex;
                align-items: center;
                gap: 20px;
            }
            .qr-image {
                width: 110px;
                height: 110px;
                background: white;
                border-radius: 8px;
                padding: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            .qr-image img {
                width: 100%;
                height: 100%;
            }
            .qr-info {
                flex: 1;
            }
            .qr-info h4 {
                font-size: 13px;
                font-weight: 700;
                color: #e2e8f0;
                margin-bottom: 4px;
            }
            .qr-info p {
                font-size: 11px;
                color: #64748b;
                line-height: 1.4;
            }

            /* Device Simulator */
            .device-simulator-panel {
                flex: 0.8;
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            .phone-frame {
                width: 360px;
                height: 720px;
                background: #000;
                border-radius: 40px;
                border: 12px solid #27272a;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
                position: relative;
                overflow: hidden;
            }
            /* Speaker/Camera Notch */
            .phone-notch {
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 150px;
                height: 24px;
                background: #27272a;
                border-radius: 0 0 16px 16px;
                z-index: 10;
            }
            .phone-frame iframe {
                width: 100%;
                height: 100%;
                border: none;
                border-radius: 28px;
            }
            .device-label {
                margin-top: 14px;
                font-size: 12px;
                font-weight: 600;
                color: #64748b;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .device-dot {
                width: 8px;
                height: 8px;
                background: #10b981;
                border-radius: 50%;
                animation: pulse 1.5s infinite;
            }

            @media (max-width: 900px) {
                .ktcl-desktop-container {
                    flex-direction: column;
                    align-items: center;
                }
                .device-simulator-panel {
                    margin-top: 20px;
                }
            }
        `;
        document.head.appendChild(st);
    }

    // Dynamic Host & URL for the QR code and Simulator
    const origin = window.location.origin;
    const mobileUrl = `${origin}/m/kiemtrachatluong`;
    const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(mobileUrl)}`;

    content.innerHTML = `
        <div class="ktcl-desktop-container">
            <!-- Left Info Panel -->
            <div class="ktcl-info-panel">
                <h2>🔍 Mobile Quality Control & Handover</h2>
                <p class="ktcl-intro-text">
                    Trang này được thiết kế tối ưu hóa 100% cho màn hình điện thoại giúp Quản Lý Được và bộ phận kiểm tra 
                    vận hành linh hoạt, nhanh chóng ngay tại xưởng sản xuất hoặc giao nhận gia công ngoài.
                </p>

                <div style="display:flex; gap:12px;">
                    <a href="${mobileUrl}" target="_blank" class="ktcl-mobile-btn">
                        📱 MỞ TRANG ĐIỆN THOẠI (TAB MỚI)
                    </a>
                </div>

                <!-- Workflow steps -->
                <div class="workflow-section">
                    <h3>📋 Quy trình nghiệp vụ 4 bước trên Mobile</h3>
                    <div class="step-list">
                        <div class="step-item">
                            <div class="step-number">1</div>
                            <div class="step-detail">
                                <h4>Đơn Hàng Đến Hẹn (May trong nhà)</h4>
                                <p>Hiển thị danh sách các đơn hàng nội bộ hôm nay đến ngày hạn hoặc các đơn quá hạn cần may hoàn tất.</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <div class="step-number">2</div>
                            <div class="step-detail">
                                <h4>Đơn Hàng Hẹn Lại (Phòng chờ)</h4>
                                <p>Chứa các đơn hàng đã được đổi lịch hẹn hoặc các đơn trong tương lai chưa đến hẹn.</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <div class="step-number">3</div>
                            <div class="step-detail">
                                <h4>Phân Đơn Tổ May (Chưa chia tổ)</h4>
                                <p>Nơi tập trung các đơn may nội bộ chưa bàn giao cho tổ. Quản lý có thể tách đơn chia đều cho nhiều tổ cùng lúc.</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <div class="step-number">4</div>
                            <div class="step-detail">
                                <h4>Kiểm Tra Chất Lượng (Nghiệm thu & QC)</h4>
                                <p>Áp dụng cho cả đơn trong nhà và gia công ngoài. Tại đây quản lý sẽ nhập Đơn Giá QC, chụp ảnh thực tế, và bấm "May Xong" để tính lương tự động cho thợ.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- QR Generator -->
                <div class="qr-container">
                    <div class="qr-image">
                        <img src="${qrCodeApiUrl}" alt="Mã QR Truy Cập Mobile">
                    </div>
                    <div class="qr-info">
                        <h4>Quét mã QR truy cập nhanh</h4>
                        <p>Dùng camera điện thoại của bạn hoặc Zalo để quét mã QR này để truy cập trực tiếp hệ thống kiểm tra chất lượng trên điện thoại.</p>
                        <p style="color:#2dd4bf; font-weight:600; margin-top:6px; font-size:11px; word-break:break-all;">
                            ${mobileUrl}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Right Mobile Phone Emulator Panel -->
            <div class="device-simulator-panel">
                <div class="phone-frame">
                    <div class="phone-notch"></div>
                    <iframe src="/m/kiemtrachatluong" title="Mobile QC Simulator"></iframe>
                </div>
                <div class="device-label">
                    <div class="device-dot"></div>
                    <span>Trình giả lập kiểm tra chất lượng (Mobile View)</span>
                </div>
            </div>
        </div>
    `;
}
