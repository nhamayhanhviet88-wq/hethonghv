// ========== CHIẾN DỊCH VIDEO/ẢNH ADS PAGE ==========

async function renderChiendichadsPage(container) {
    if (!container || !(container instanceof HTMLElement)) {
        container = document.getElementById('mainContent') || document.getElementById('app') || document.querySelector('.main-content') || document.body;
    }
    if (!container) return;

    container.innerHTML = `
        <div style="padding: 24px; max-width: 1400px; margin: 0 auto; font-family: 'Inter', sans-serif;">
            <!-- Header Banner -->
            <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); border-radius: 20px; padding: 32px 40px; color: white; margin-bottom: 28px; box-shadow: 0 10px 25px -5px rgba(67, 56, 202, 0.3); position: relative; overflow: hidden; display: flex; justify-content: space-between; align-items: center;">
                <div style="position: absolute; right: 260px; bottom: -30px; font-size: 160px; opacity: 0.12; user-select: none;">🚀</div>
                <div style="z-index: 1;">
                    <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(255, 255, 255, 0.18); backdrop-filter: blur(8px); padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 12px;">
                        <span>📢 Bộ Phận Marketing Ads</span>
                    </div>
                    <h2 style="margin: 0 0 8px; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">🚀 Chiến Dịch Video / Ảnh Ads</h2>
                    <p style="margin: 0; font-size: 14px; opacity: 0.9; max-width: 650px; line-height: 1.5;">
                        Quản lý và theo dõi danh sách các Chiến Dịch Quảng Cáo Video & Hình Ảnh (Chi phí, hiệu quả, trạng thái chạy).
                    </p>
                </div>
                <div style="z-index: 1; display: flex; gap: 12px; align-items: center;">
                    <button onclick="alert('Tính năng Tạo Chiến Dịch Ads Mới đang được khởi tạo!')" style="background: #10b981; color: white; border: none; padding: 14px 24px; border-radius: 12px; font-weight: 700; font-size: 15px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4); transition: all 0.2s ease;">
                        <span style="font-size: 18px;">➕</span> Tạo Chiến Dịch Mới
                    </button>
                </div>
            </div>

            <!-- Main Content Card -->
            <div style="background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 15px -2px rgba(0,0,0,0.04); text-align: center;">
                <div style="font-size: 48px; margin-bottom: 16px;">🚀</div>
                <h3 style="margin: 0 0 8px; font-size: 20px; font-weight: 800; color: #0f172a;">Quản Lý Chiến Dịch Video & Ảnh Ads</h3>
                <p style="color: #64748b; font-size: 14px; max-width: 500px; margin: 0 auto 24px;">Trang theo dõi và quản lý hiệu suất chiến dịch Video/Ảnh Ads.</p>
                <div style="display: inline-flex; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 700; color: #4338ca;">
                    <span>📍 Đường dẫn: <b>http://localhost:11000/chiendichads</b></span>
                </div>
            </div>
        </div>
    `;
}

window.renderChiendichadsPage = renderChiendichadsPage;
