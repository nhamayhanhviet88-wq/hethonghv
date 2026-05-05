// ===== CAM KẾT CUỘC HỌP =====
// Placeholder page - sẽ phát triển sau

function renderCamketcuochop() {
    var container = document.getElementById('main-content');
    if (!container) return;

    container.innerHTML = ''
        + '<div style="max-width:900px;margin:0 auto;padding:30px 20px">'

        // Header
        + '<div style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);border-radius:16px;padding:40px;margin-bottom:30px;text-align:center;color:#fff;box-shadow:0 10px 40px rgba(0,0,0,0.2)">'
        + '<div style="font-size:48px;margin-bottom:12px">📝</div>'
        + '<h1 style="font-size:28px;font-weight:800;margin:0 0 8px 0;background:linear-gradient(90deg,#fbbf24,#f59e0b);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Cam Kết Cuộc Họp</h1>'
        + '<p style="font-size:14px;color:#94a3b8;margin:0">Quản lý cam kết & theo dõi thực hiện sau cuộc họp</p>'
        + '</div>'

        // Coming soon card
        + '<div style="background:#fff;border-radius:16px;padding:60px 40px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.06);border:2px dashed #e2e8f0">'
        + '<div style="font-size:64px;margin-bottom:20px;animation:ckchPulse 2s infinite">🚧</div>'
        + '<h2 style="font-size:22px;font-weight:700;color:#1e293b;margin:0 0 12px 0">Tính Năng Đang Phát Triển</h2>'
        + '<p style="font-size:15px;color:#64748b;margin:0 0 30px 0;max-width:500px;display:inline-block">Hệ thống quản lý cam kết cuộc họp sẽ sớm được triển khai. Tính năng này giúp theo dõi các cam kết, deadline và tiến độ thực hiện sau mỗi cuộc họp.</p>'

        // Feature preview
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;text-align:left;margin-top:20px">'

        + '<div style="background:#f0fdf4;border-radius:12px;padding:20px;border-left:4px solid #22c55e">'
        + '<div style="font-size:20px;margin-bottom:8px">✅</div>'
        + '<div style="font-weight:700;color:#166534;font-size:14px">Tạo Cam Kết</div>'
        + '<div style="font-size:12px;color:#4ade80;margin-top:4px">Ghi nhận cam kết của từng NV sau cuộc họp</div>'
        + '</div>'

        + '<div style="background:#eff6ff;border-radius:12px;padding:20px;border-left:4px solid #3b82f6">'
        + '<div style="font-size:20px;margin-bottom:8px">📅</div>'
        + '<div style="font-weight:700;color:#1e40af;font-size:14px">Theo Dõi Deadline</div>'
        + '<div style="font-size:12px;color:#60a5fa;margin-top:4px">Cảnh báo khi cam kết sắp hết hạn</div>'
        + '</div>'

        + '<div style="background:#fef3c7;border-radius:12px;padding:20px;border-left:4px solid #f59e0b">'
        + '<div style="font-size:20px;margin-bottom:8px">📊</div>'
        + '<div style="font-weight:700;color:#92400e;font-size:14px">Báo Cáo Tiến Độ</div>'
        + '<div style="font-size:12px;color:#d97706;margin-top:4px">Thống kê hoàn thành theo NV, Team</div>'
        + '</div>'

        + '</div>'
        + '</div>'

        + '</div>'

        // CSS animation
        + '<style>'
        + '@keyframes ckchPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }'
        + '</style>';
}
