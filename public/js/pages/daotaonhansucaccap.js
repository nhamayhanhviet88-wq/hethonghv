// ========== ĐÀO TẠO NHÂN SỰ CÁC CẤP — PAGE COMPONENT ==========

(function() {
    'use strict';

    function renderDaotaonhansucaccapPage(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="daotao-nhansu-container" style="padding: 20px; max-width: 1400px; margin: 0 auto;">
                <!-- Header Banner -->
                <div class="daotao-header-card" style="
                    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%);
                    border-radius: 20px;
                    padding: 32px 28px;
                    color: #ffffff;
                    box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.3);
                    margin-bottom: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 16px;
                ">
                    <div style="display: flex; align-items: center; gap: 18px;">
                        <div style="
                            width: 64px;
                            height: 64px;
                            background: rgba(255, 255, 255, 0.2);
                            backdrop-filter: blur(8px);
                            border-radius: 16px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 32px;
                            border: 1px solid rgba(255, 255, 255, 0.3);
                        ">
                            🎓
                        </div>
                        <div>
                            <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
                                ĐÀO TẠO NHÂN SỰ CÁC CẤP
                            </h1>
                            <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9; font-weight: 500;">
                                Hệ Thống Quản Lý & Đào Tạo Nhân Sự Nội Bộ — Đồng Phục HV
                            </p>
                        </div>
                    </div>

                    <div style="
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(8px);
                        padding: 8px 16px;
                        border-radius: 12px;
                        border: 1px solid rgba(255, 255, 255, 0.25);
                        font-size: 13px;
                        font-weight: 600;
                    ">
                        ⚡ Đã sẵn sàng khởi tạo
                    </div>
                </div>

                <!-- Main Content Placeholder Card -->
                <div class="card" style="
                    background: #ffffff;
                    border-radius: 16px;
                    border: 1.5px solid #e2e8f0;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
                    padding: 48px 24px;
                    text-align: center;
                ">
                    <div style="
                        width: 80px;
                        height: 80px;
                        margin: 0 auto 20px auto;
                        background: #f1f5f9;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 40px;
                        color: #6366f1;
                    ">
                        🚀
                    </div>
                    <h3 style="font-size: 20px; font-weight: 700; color: #1e293b; margin: 0 0 10px 0;">
                        Trang Đào Tạo Nhân Sự Các Cấp
                    </h3>
                    <p style="font-size: 14px; color: #64748b; max-width: 540px; margin: 0 auto 24px auto; line-height: 1.6;">
                        Hệ thống đã thiết lập đường dẫn <code>http://localhost:11000/daotaonhansucaccap</code> và vị trí Menu <strong>ĐÀO TẠO NHÂN SỰ</strong>. Nội dung chi tiết trang sẽ được triển khai theo yêu cầu của bạn.
                    </p>
                </div>
            </div>
        `;
    }

    window.renderDaotaonhansucaccapPage = renderDaotaonhansucaccapPage;
})();
