/**
 * Page: /kpimktview — renderKpimktviewPage(container)
 * KPI Marketing View (Trang đang chuẩn bị phát triển)
 */
function renderKpimktviewPage(container) {
    if (!container) return;
    container.innerHTML = `
        <div style="padding: 40px 20px; text-align: center; max-width: 800px; margin: 40px auto;">
            <div style="background: white; border-radius: 20px; padding: 40px 30px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01); border: 1px solid #e2e8f0;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #0284c7, #38bdf8); color: white; border-radius: 24px; display: inline-flex; align-items: center; justify-content: center; font-size: 36px; margin-bottom: 20px; box-shadow: 0 10px 20px -5px rgba(2,132,199,0.4);">
                    🎯
                </div>
                <h1 style="font-size: 26px; font-weight: 800; color: #0f172a; margin-bottom: 12px; font-family: sans-serif;">KPI Marketing View</h1>
                <p style="font-size: 15px; color: #64748b; margin-bottom: 24px; line-height: 1.6;">
                    Trang <strong>KPI Marketing View</strong> đang được chuẩn bị để khởi tạo và phát triển các tính năng theo dõi chỉ số chuyên sâu.
                </p>
                <div style="display: inline-flex; align-items: center; gap: 8px; background: #f0f9ff; border: 1px solid #bae6fd; color: #0284c7; padding: 8px 18px; border-radius: 30px; font-weight: 700; font-size: 13px;">
                    <span>🚀 Đường dẫn hệ thống:</span>
                    <code style="background: white; padding: 2px 8px; border-radius: 6px; border: 1px solid #7dd3fc; font-family: monospace;">http://localhost:11000/kpimktview</code>
                </div>
            </div>
        </div>
    `;
}
