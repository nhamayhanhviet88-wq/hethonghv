// ========== HƯỚNG DẪN SỬ DỤNG — Premium Landing Page ==========
// Cleanup state
var _hdsdParticleId = null;
var _hdsdObserver = null;
var _hdsdScrollHandler = null;
var _hdsdTocObserver = null;
var _hdsdCountedSet = new WeakSet();

function _hdsdCleanup() {
    if (_hdsdParticleId) { cancelAnimationFrame(_hdsdParticleId); _hdsdParticleId = null; }
    if (_hdsdObserver) { _hdsdObserver.disconnect(); _hdsdObserver = null; }
    if (_hdsdTocObserver) { _hdsdTocObserver.disconnect(); _hdsdTocObserver = null; }
    if (_hdsdScrollHandler) { window.removeEventListener('scroll', _hdsdScrollHandler); _hdsdScrollHandler = null; }
    var oldBtn = document.getElementById('hdsdScrollTop');
    if (oldBtn) oldBtn.remove();
}

function renderHuongDanSuDungPage(container) {
    _hdsdCleanup();

    container.innerHTML = '<div class="hdsd-page">' +
        _hdsdHeroHTML() +
        '<div class="hdsd-layout">' +
            _hdsdTocHTML() +
            '<div class="hdsd-main-content">' +
                _hdsdWelcomeHTML() +
                _hdsdCommissionHTML() +
                _hdsdStepsHTML() +
                _hdsdFeaturesHTML() +
                _hdsdCtaHTML() +
            '</div>' +
        '</div>' +
    '</div>';

    _hdsdInitParticles();
    _hdsdInitScrollAnimations();
    _hdsdInitScrollTop();
    _hdsdInitToc();
    _hdsdInitCountUp();
    _hdsdInitLightbox();
}

// ========== HERO ==========
function _hdsdHeroHTML() {
    return '<section class="hdsd-hero" id="hdsd-hero">' +
        '<canvas class="hdsd-hero-canvas" id="hdsdCanvas" aria-hidden="true"></canvas>' +
        '<div class="hdsd-hero-glow"></div>' +
        '<div class="hdsd-hero-content">' +
            '<div class="hdsd-hero-badge">🌟 CỔNG ĐỐI TÁC CHIẾT KHẤU</div>' +
            '<h1 class="hdsd-hero-title">Lời Chào Mừng &<br>Hướng Dẫn Hệ Thống</h1>' +
            '<p class="hdsd-hero-subtitle">Giới Thiệu Khách – Không Tư Vấn - Không Bỏ Vốn - Đồng Phục HV Tư Vấn - Trả Hoa Hồng Ngay</p>' +
            '<p class="hdsd-hero-desc" style="text-align:center;margin-left:auto;margin-right:auto">Tài liệu hướng dẫn chi tiết giúp Quý đối tác sử dụng hệ thống Đồng Phục HV một cách hiệu quả nhất, từ giới thiệu khách hàng đến nhận hoa hồng.</p>' +
            '<div style="display:flex;gap:24px;justify-content:center;margin-top:20px;flex-wrap:wrap;animation:hdsdFadeUp .8s ease .8s both">' +
                '<div style="display:flex;align-items:center;gap:6px;font-size:13px;color:rgba(255,255,255,.7)"><span style="color:#10b981;font-size:16px">✅</span> Miễn phí 100%</div>' +
                '<div style="display:flex;align-items:center;gap:6px;font-size:13px;color:rgba(255,255,255,.7)"><span style="color:#fad24c;font-size:16px">⭐</span> Hoa hồng 10%</div>' +
                '<div style="display:flex;align-items:center;gap:6px;font-size:13px;color:rgba(255,255,255,.7)"><span style="color:#3b82f6;font-size:16px">🔒</span> Minh bạch tuyệt đối</div>' +
                '<div style="display:flex;align-items:center;gap:6px;font-size:13px;color:rgba(255,255,255,.7)"><span style="color:#f59e0b;font-size:16px">♻️</span> Thu nhập trọn đời</div>' +
            '</div>' +
            '<div class="hdsd-hero-actions">' +
                '<a class="hdsd-btn-gold" href="/chuyen-so" onclick="event.preventDefault();window.location.href=\'/chuyen-so\';">🚀 Chuyển Số Ngay</a>' +
                '<a class="hdsd-btn-outline" href="/bao-cao-hoa-hong-hv" onclick="event.preventDefault();window.location.href=\'/bao-cao-hoa-hong-hv\';">📊 Xem Báo Cáo</a>' +
            '</div>' +
        '</div>' +
    '</section>';
}

// ========== WELCOME ==========
function _hdsdWelcomeHTML() {
    return '<section class="hdsd-section" id="hdsd-welcome">' +
        '<div class="hdsd-section-tag hdsd-section-tag-dark hdsd-animate">💌 LỜI CHÀO MỪNG TỪ ĐỒNG PHỤC HV</div>' +
        '<div class="hdsd-welcome-card hdsd-animate">' +
            '<blockquote class="hdsd-quote-hero">"Trân trọng kính chào Quý anh/chị – những người đồng hành quý giá nhất của Đồng Phục HV!"</blockquote>' +
            '<p class="hdsd-welcome-text"><strong>Đồng Phục HV</strong> xin gửi lời chào nồng nhiệt và lòng biết ơn chân thành đến Quý anh/chị. Sự hiện diện của anh/chị hôm nay không chỉ là một người giới thiệu — mà là <strong>đại sứ thương hiệu</strong>, là người đồng kiến tạo nên hành trình phát triển của Đồng Phục HV.</p>' +
            '' +
            '<div class="hdsd-role-grid">' +
                '<div class="hdsd-role-card hdsd-animate hdsd-animate-delay-1"><div class="hdsd-role-icon">🤝</div><div class="hdsd-role-title">Người đồng hành chiến lược</div><div class="hdsd-role-desc">Cùng HV mang giá trị đến cộng đồng</div></div>' +
                '<div class="hdsd-role-card hdsd-animate hdsd-animate-delay-2"><div class="hdsd-role-icon">🌟</div><div class="hdsd-role-title">Đại sứ thương hiệu</div><div class="hdsd-role-desc">Đại diện cho uy tín và chất lượng HV</div></div>' +
                '<div class="hdsd-role-card hdsd-animate hdsd-animate-delay-3"><div class="hdsd-role-icon">💼</div><div class="hdsd-role-title">Đối tác kinh doanh đẳng cấp</div><div class="hdsd-role-desc">Chia sẻ lợi nhuận công bằng, bền vững</div></div>' +
            '</div>' +
            '<div class="hdsd-stats-grid hdsd-animate">' +
                '<div class="hdsd-stat-item"><div class="hdsd-stat-num">10+</div><div class="hdsd-stat-label">Năm kinh nghiệm</div></div>' +
                '<div class="hdsd-stat-item"><div class="hdsd-stat-num">2000+</div><div class="hdsd-stat-label">Đối tác tin cậy</div></div>' +
                '<div class="hdsd-stat-item"><div class="hdsd-stat-num">55000+</div><div class="hdsd-stat-label">Đơn hàng hoàn thành</div></div>' +
                '<div class="hdsd-stat-item"><div class="hdsd-stat-num">100%</div><div class="hdsd-stat-label">Minh bạch hoa hồng</div></div>' +
            '</div>' +
            '<p class="hdsd-welcome-text hdsd-animate">Chúng tôi tin rằng thành công bền vững đến từ sự <strong>hợp tác chân thành</strong>. Mỗi đối tác khi đồng hành cùng HV không chỉ nhận được hoa hồng — mà còn được <strong>hỗ trợ toàn diện</strong> về tư liệu marketing, hình ảnh sản phẩm chuyên nghiệp, và đội ngũ tư vấn sẵn sàng chăm sóc khách hàng thay anh/chị.</p>' +
            '<p class="hdsd-welcome-text hdsd-animate">Hệ thống của HV được xây dựng trên nền tảng <strong>công nghệ hiện đại</strong>, cho phép anh/chị theo dõi mọi diễn biến đơn hàng theo thời gian thực — từ lúc giới thiệu khách, qua quá trình tư vấn, đến khi chốt đơn và nhận hoa hồng. <strong>Không che giấu, không trung gian.</strong></p>' +
            '<div class="hdsd-tip hdsd-animate">💡 <strong>Bạn biết không?</strong> Một đối tác trung bình của HV kiếm được <strong>3-5 triệu/tháng</strong> chỉ từ việc giới thiệu 2-3 khách hàng. Những đối tác tích cực có thể đạt <strong>10-20 triệu/tháng</strong> nhờ xây dựng hệ thống Affiliate trong hệ thống.</div>' +
            '<div class="hdsd-highlight-navy hdsd-animate">' +
                '<div class="hdsd-commitment-title">🙏 Cam kết từ Đồng Phục HV</div>' +
                '<div class="hdsd-commitment-list">' +
                    '<span>✨ Minh bạch tuyệt đối</span>' +
                    '<span>✨ Đồng hành lâu dài</span>' +
                    '<span>✨ Tri ân xứng đáng</span>' +
                    '<span>✨ Hỗ trợ tận tâm 24/7</span>' +
                '</div>' +
            '</div>' +
            '<div class="hdsd-welcome-closing hdsd-animate">Chào mừng anh/chị đến với gia đình Đồng Phục HV! 🎉</div>' +
        '</div>' +
    '</section>';
}

// ========== COMMISSION ==========
function _hdsdCommissionHTML() {
    return '<section class="hdsd-section" id="hdsd-commission">' +
        '<div style="text-align:center">' +
            '<div class="hdsd-section-tag hdsd-section-tag-light hdsd-animate">💰 MÔ HÌNH HOA HỒNG</div>' +
            '<h2 class="hdsd-section-title hdsd-animate">Giới Thiệu Về Mô Hình Hoa Hồng</h2>' +
        '</div>' +
        '<div class="hdsd-comm-grid">' +
            '<div class="hdsd-comm-card hdsd-comm-gold hdsd-animate hdsd-animate-delay-1">' +
                '<div class="hdsd-comm-icon">🎯</div>' +
                '<div class="hdsd-comm-label">Giới thiệu khách hàng</div>' +
                '<div class="hdsd-comm-rate" data-countup="10">10<span style="font-size:.5em">%</span></div>' +
                '<div class="hdsd-comm-desc">Hưởng trực tiếp từ mỗi đơn hàng</div>' +
            '</div>' +
            '<div class="hdsd-comm-card hdsd-comm-navy hdsd-animate hdsd-animate-delay-2">' +
                '<div class="hdsd-comm-icon">🤝</div>' +
                '<div class="hdsd-comm-label">Từ khách hàng của Affiliate trong hệ thống</div>' +
                '<div class="hdsd-comm-rate" data-countup="5">5<span style="font-size:.5em">%</span></div>' +
                '<div class="hdsd-comm-desc">Affiliate trong hệ thống được 10%, anh/chị hưởng thêm 5%</div>' +
            '</div>' +
        '</div>' +
        '<div class="hdsd-example-box hdsd-animate">' +
            '<div class="hdsd-example-title">📊 Ví Dụ Tính Hoa Hồng Cụ Thể</div>' +
            '<p style="font-size:13px;color:#92400e;margin-bottom:16px">Giả sử anh/chị giới thiệu 1 công ty đặt đồng phục <strong>50.000.000đ</strong>. Đồng thời, Affiliate trong hệ thống của anh/chị cũng giới thiệu 1 khách hàng chốt đơn <strong>30.000.000đ</strong> với HV:</p>' +
            '<div class="hdsd-example-row"><span class="hdsd-example-label">🎯 Đơn anh/chị trực tiếp giới thiệu: 50.000.000đ × 10%</span><span class="hdsd-example-val">= 5.000.000đ</span></div>' +
            '<div class="hdsd-example-row"><span class="hdsd-example-label">🤝 Affiliate trong hệ thống chốt đơn 30.000.000đ → họ được 10%, anh/chị hưởng thêm 5%</span><span class="hdsd-example-val">= 1.500.000đ</span></div>' +
            '<div class="hdsd-example-row"><span class="hdsd-example-label">🔄 Khách cũ quay lại mua tiếp: 20.000.000đ × 10%</span><span class="hdsd-example-val">= 2.000.000đ</span></div>' +
            '<div class="hdsd-example-total">💰 Tổng thu nhập của anh/chị: 8.500.000đ</div>' +
            '<p style="font-size:12px;color:#b8901c;margin-top:12px;text-align:center;font-style:italic">Càng nhiều Affiliate trong hệ thống = càng nhiều nguồn thu 5% thụ động — nhân rộng lợi nhuận không giới hạn!</p>' +
        '</div>' +
        '<div class="hdsd-comm-banner hdsd-animate">' +
            '💎 <strong>ĐẶC QUYỀN VƯỢT TRỘI:</strong> Khách hàng quay lại mua tiếp — anh/chị <strong>VẪN nhận hoa hồng</strong> như lần đầu. Không giới hạn số lần!' +
        '</div>' +
    '</section>';
}

// ========== TOC ==========
function _hdsdTocHTML() {
    return '<nav class="hdsd-toc" aria-label="Mục lục" id="hdsdToc">' +
        '<div class="hdsd-toc-title">Mục lục</div>' +
        '<ul class="hdsd-toc-list">' +
            '<li><a class="hdsd-toc-item hdsd-toc-active" data-target="hdsd-welcome" onclick="_hdsdScrollTo(\'hdsd-welcome\')">💌 Lời chào mừng</a></li>' +
            '<li><a class="hdsd-toc-item" data-target="hdsd-commission" onclick="_hdsdScrollTo(\'hdsd-commission\')">💰 Mô hình hoa hồng</a></li>' +
            '<li><a class="hdsd-toc-item" data-target="hdsd-steps" onclick="_hdsdScrollTo(\'hdsd-steps\')">📘 5 bước sử dụng</a></li>' +
            '<li><a class="hdsd-toc-item" data-target="hdsd-features" onclick="_hdsdScrollTo(\'hdsd-features\')">⭐ Tại sao chọn HV</a></li>' +
            '<li><a class="hdsd-toc-item" data-target="hdsd-cta" onclick="_hdsdScrollTo(\'hdsd-cta\')">🎯 Bắt đầu ngay</a></li>' +
        '</ul>' +
    '</nav>';
}

// ========== 5 STEPS ==========
function _hdsdStepsHTML() {
    return '<section class="hdsd-section" id="hdsd-steps">' +
        '<div style="text-align:center">' +
            '<div class="hdsd-section-tag hdsd-section-tag-dark hdsd-animate">📘 5 BƯỚC SỬ DỤNG HỆ THỐNG</div>' +
            '<h2 class="hdsd-section-title hdsd-animate">Đơn Giản – Minh Bạch – Hiệu Quả</h2>' +
        '</div>' +
        '<div class="hdsd-timeline">' +
            // STEP 1
            '<div class="hdsd-step-item hdsd-animate">' +
                '<div class="hdsd-step-num" aria-hidden="true">1</div>' +
                '<div class="hdsd-step-card">' +
                    '<h3 class="hdsd-step-title">🔹 Tìm Kiếm Khách Hàng</h3>' +
                    '<div class="hdsd-step-content">' +
                        '<p style="margin-bottom:16px"><strong>3 cách hiệu quả để tìm kiếm khách hàng:</strong></p>' +

                        // Cách 1
                        '<div class="hdsd-subcard" style="margin-bottom:16px;padding:20px">' +
                            '<div class="hdsd-subcard-title" style="font-size:16px;margin-bottom:10px">✅ Cách 1 – Tận dụng mối quan hệ sẵn có</div>' +
                            '<p style="line-height:1.8;color:var(--hdsd-slate-600)">Nếu anh/chị đang làm việc tại các doanh nghiệp, công ty, xí nghiệp, tập đoàn lớn, hoặc có bạn bè – người thân – đồng nghiệp – đối tác đang làm tại những nơi đó – đây chính là <strong>"mỏ vàng"</strong> khách hàng tiềm năng ngay trong tầm tay anh/chị.</p>' +
                            '<div class="hdsd-tip" style="margin-top:12px">💡 <strong>Mẹo nhỏ:</strong> Mỗi công ty trung bình cần đặt đồng phục 1–2 lần/năm cho nhân viên (áo polo, áo gió, áo bảo hộ, đồng phục sự kiện…). Chỉ cần giới thiệu thành công 1 công ty 50 nhân viên, anh/chị đã có thể nhận hoa hồng từ <strong>vài triệu đến vài chục triệu đồng</strong>.</div>' +
                        '</div>' +

                        // Cách 2
                        '<div class="hdsd-subcard" style="margin-bottom:16px;padding:20px">' +
                            '<div class="hdsd-subcard-title" style="font-size:16px;margin-bottom:10px">✅ Cách 2 – Lan tỏa qua mạng xã hội & các kênh online</div>' +
                            '<p style="line-height:1.8;color:var(--hdsd-slate-600);margin-bottom:12px">Anh/chị có thể lấy các bài viết, hình ảnh, video do Đồng Phục HV cung cấp sẵn và đăng tải lên:</p>' +
                            '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:16px">' +
                                '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--hdsd-slate-50);border-radius:8px;font-size:13px">📘 Trang cá nhân Facebook</div>' +
                                '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--hdsd-slate-50);border-radius:8px;font-size:13px">📱 Zalo cá nhân – story, nhật ký</div>' +
                                '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--hdsd-slate-50);border-radius:8px;font-size:13px">🎵 TikTok – viral hàng triệu người</div>' +
                                '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--hdsd-slate-50);border-radius:8px;font-size:13px">📸 Instagram – feed và story</div>' +
                                '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--hdsd-slate-50);border-radius:8px;font-size:13px">💼 LinkedIn – HR, sếp công ty</div>' +
                                '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--hdsd-slate-50);border-radius:8px;font-size:13px">🧵 Threads, X, Pinterest…</div>' +
                            '</div>' +
                            '<p style="font-weight:600;color:var(--hdsd-navy-800);margin-bottom:8px">👥 Các HỘI NHÓM (GROUP) FACEBOOK chuyên ngành:</p>' +
                            '<div style="display:flex;flex-wrap:wrap;gap:6px">' +
                                '<span style="padding:5px 12px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:20px;font-size:12px;color:#1e40af;font-weight:500">Chợ cư dân – chung cư</span>' +
                                '<span style="padding:5px 12px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:20px;font-size:12px;color:#1e40af;font-weight:500">Hội Đồng phục Việt Nam</span>' +
                                '<span style="padding:5px 12px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:20px;font-size:12px;color:#1e40af;font-weight:500">Cộng đồng khu đô thị</span>' +
                                '<span style="padding:5px 12px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:20px;font-size:12px;color:#1e40af;font-weight:500">Group HR – Tuyển dụng</span>' +
                                '<span style="padding:5px 12px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:20px;font-size:12px;color:#1e40af;font-weight:500">Chủ doanh nghiệp – Startup</span>' +
                                '<span style="padding:5px 12px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:20px;font-size:12px;color:#1e40af;font-weight:500">Trường học – cựu sinh viên</span>' +
                            '</div>' +
                        '</div>' +

                        // Cách 3
                        '<div class="hdsd-subcard" style="margin-bottom:16px;padding:20px">' +
                            '<div class="hdsd-subcard-title" style="font-size:16px;margin-bottom:10px">✅ Cách 3 – Tự sáng tạo nội dung video <span style="color:#ef4444;font-weight:800">(LỢI THẾ CỰC LỚN!)</span></div>' +
                            '<p style="line-height:1.8;color:var(--hdsd-slate-600);margin-bottom:12px">Đây là <strong>"vũ khí bí mật"</strong> giúp anh/chị bùng nổ doanh số trong thời đại video ngắn lên ngôi:</p>' +
                            '<div style="display:grid;grid-template-columns:1fr;gap:8px">' +
                                '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:linear-gradient(135deg,#fef3c7,#fffbeb);border-radius:10px;font-size:13px;line-height:1.6"><span style="font-size:18px;flex-shrink:0">🎥</span><span>Tự quay video về sản phẩm đồng phục – giới thiệu chất liệu, mẫu mã, thiết kế đẹp</span></div>' +
                                '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:linear-gradient(135deg,#fef3c7,#fffbeb);border-radius:10px;font-size:13px;line-height:1.6"><span style="font-size:18px;flex-shrink:0">🎬</span><span>Quay clip TikTok/Reels/Shorts – review áo, unbox đơn hàng, kể câu chuyện đồng phục</span></div>' +
                                '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:linear-gradient(135deg,#fef3c7,#fffbeb);border-radius:10px;font-size:13px;line-height:1.6"><span style="font-size:18px;flex-shrink:0">📺</span><span>Livestream Facebook/TikTok – tư vấn trực tiếp, giải đáp thắc mắc khách hàng</span></div>' +
                                '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:linear-gradient(135deg,#fef3c7,#fffbeb);border-radius:10px;font-size:13px;line-height:1.6"><span style="font-size:18px;flex-shrink:0">🎨</span><span>Tạo nội dung sáng tạo – góc nhìn cá nhân, trải nghiệm thực tế, before-after</span></div>' +
                            '</div>' +
                            '<div class="hdsd-highlight-fire" style="margin-top:12px">🔥 <strong>Sức mạnh của video:</strong> Viral hàng triệu view chỉ sau 1 đêm — khách tự tìm đến anh/chị!</div>' +
                        '</div>' +

                        '<div class="hdsd-step-banner">📌 Sau khi có khách: Chỉ cần <strong>xin SĐT</strong> gửi về HV. Đội ngũ HV lo <strong>TẤT CẢ</strong> — anh/chị chỉ cần GIỚI THIỆU! ⚡</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            // STEP 2
            '<div class="hdsd-step-item hdsd-animate">' +
                '<div class="hdsd-step-num" aria-hidden="true">2</div>' +
                '<div class="hdsd-step-card">' +
                    '<h3 class="hdsd-step-title">🔹 Chuyển Số Vào Hệ Thống</h3>' +
                    '<div class="hdsd-step-content">' +
                        '<p>Truy cập <strong>"Chuyển Số Khách Hàng"</strong> và chọn đúng biểu mẫu:</p>' +
                        '<div class="hdsd-form-cards">' +
                            '<div class="hdsd-form-card hdsd-form-card-green"><strong>🟢 Khách hàng</strong><br>→ Điền "CRM Chăm Sóc KH Nhu Cầu"<br><br><em>Họ tên — SĐT — Link FB/Zalo (nếu có)</em></div>' +
                            '<div class="hdsd-form-card hdsd-form-card-blue"><strong>🔵 Affiliate đối tác</strong><br>→ Điền "CRM Chăm Sóc Affiliate"<br><br><em>Họ tên — SĐT — Link FB/Zalo (nếu có)</em></div>' +
                        '</div>' +
                        '<div style="margin-top:20px;text-align:center">' +
                            '<img src="/images/huongdan-chuyenso.png" alt="Minh họa biểu mẫu Chuyển Số Khách Hàng" style="max-width:100%;border-radius:16px;box-shadow:0 8px 32px rgba(18,37,70,.15);border:1px solid rgba(18,37,70,.08)" loading="lazy">' +
                            '<p style="font-size:12px;color:var(--hdsd-slate-500);margin-top:10px;font-style:italic">📸 Minh họa giao diện biểu mẫu "Chuyển Số Khách Hàng" trên hệ thống</p>' +
                            '<a class="hdsd-btn-sparkle" href="/chuyen-so" onclick="event.preventDefault();window.location.href=\'/chuyen-so\';" style="margin-top:14px">📋 Xem Chuyển Số</a>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            // STEP 3
            '<div class="hdsd-step-item hdsd-animate">' +
                '<div class="hdsd-step-num" aria-hidden="true">3</div>' +
                '<div class="hdsd-step-card">' +
                    '<h3 class="hdsd-step-title">🔹 Theo Dõi Tiến Độ — Minh Bạch Tuyệt Đối</h3>' +
                    '<div class="hdsd-step-content">' +
                        '<p><strong>📋 3.1. Theo Dõi Tư Vấn Khách</strong> — Toàn bộ hành trình hiển thị real-time:</p>' +
                        '<div class="hdsd-pipeline">' +
                            '<span class="hdsd-pipeline-step">💬 Tư vấn</span><span class="hdsd-pipeline-arrow">→</span>' +
                            '<span class="hdsd-pipeline-step">🎨 Thiết kế</span><span class="hdsd-pipeline-arrow">→</span>' +
                            '<span class="hdsd-pipeline-step">💵 Báo giá</span><span class="hdsd-pipeline-arrow">→</span>' +
                            '<span class="hdsd-pipeline-step">✅ Chốt đơn</span><span class="hdsd-pipeline-arrow">→</span>' +
                            '<span class="hdsd-pipeline-step">🔄 Tư vấn lại</span>' +
                        '</div>' +
                        '<div style="margin-top:14px;text-align:center">' +
                            '<img src="/images/huongdan-theodoisuvankhach.png" alt="Minh họa trang Theo Dõi Tư Vấn Khách" style="max-width:100%;border-radius:16px;box-shadow:0 8px 32px rgba(18,37,70,.15);border:1px solid rgba(18,37,70,.08)" loading="lazy">' +
                            '<p style="font-size:12px;color:var(--hdsd-slate-500);margin-top:10px;font-style:italic">📸 Minh họa giao diện "Theo Dõi Tư Vấn Khách" trên hệ thống</p>' +
                            '<a class="hdsd-btn-sparkle" href="/tu-van-khach-aff" onclick="event.preventDefault();window.location.href=\'/tu-van-khach-aff\';" style="margin-top:14px">👁️ Xem Theo Dõi Tư Vấn Khách</a>' +
                        '</div>' +
                        '<div class="hdsd-highlight-fire">🔥 <strong>Đặc biệt:</strong> Khi Affiliate trong hệ thống giới thiệu khách chốt đơn → họ được 10%, anh/chị tự động hưởng thêm 5%. Toàn bộ tiến độ hiển thị real-time trên hệ thống.</div>' +
                        '<p style="margin-top:16px"><strong>🤝 3.2. Theo Dõi Tư Vấn Affiliate</strong> — Xem ngay: Affiliate đã có tài khoản chưa? Đang tư vấn giai đoạn nào? Có doanh số chưa?</p>' +
                        '<div style="margin-top:14px;text-align:center">' +
                            '<img src="/images/huongdan-theodoituvan.png" alt="Minh họa trang Theo Dõi Tư Vấn Affiliate" style="max-width:100%;border-radius:16px;box-shadow:0 8px 32px rgba(18,37,70,.15);border:1px solid rgba(18,37,70,.08)" loading="lazy">' +
                            '<p style="font-size:12px;color:var(--hdsd-slate-500);margin-top:10px;font-style:italic">📸 Minh họa giao diện "Theo Dõi Tư Vấn Affiliate" trên hệ thống</p>' +
                            '<a class="hdsd-btn-sparkle" href="/theo-doi-tu-van-aff" onclick="event.preventDefault();window.location.href=\'/theo-doi-tu-van-aff\';" style="margin-top:14px">🤝 Xem Theo Dõi Affiliate</a>' +
                        '</div>' +
                        '<p style="margin-top:12px"><strong>📊 3.3. Quản Lý Hệ Thống Affiliate</strong> — Theo dõi toàn bộ: số Affiliate trong hệ thống, KH giới thiệu, doanh số, đơn chốt.</p>' +
                        '<div style="margin-top:14px;text-align:center">' +
                            '<img src="/images/huongdan-quanlyhethong.png" alt="Minh họa trang Quản Lý Hệ Thống Affiliate" style="max-width:100%;border-radius:16px;box-shadow:0 8px 32px rgba(18,37,70,.15);border:1px solid rgba(18,37,70,.08)" loading="lazy">' +
                            '<p style="font-size:12px;color:var(--hdsd-slate-500);margin-top:10px;font-style:italic">📸 Minh họa giao diện "Quản Lý Hệ Thống Affiliate" trên hệ thống</p>' +
                            '<a class="hdsd-btn-sparkle" href="/quanlytkhethongaff" onclick="event.preventDefault();window.location.href=\'/quanlytkhethongaff\';" style="margin-top:14px">📊 Xem Quản Lý Affiliate</a>' +
                        '</div>' +
                        '<div class="hdsd-subcards" style="grid-template-columns:repeat(3,1fr);margin-top:16px">' +
                            '<div class="hdsd-subcard" style="text-align:center"><div style="font-size:24px;margin-bottom:4px">🔔</div><div class="hdsd-subcard-title">Thông báo tự động</div>Hệ thống gửi thông báo khi có đơn mới, khách mới, hoặc hoa hồng được ghi nhận.</div>' +
                            '<div class="hdsd-subcard" style="text-align:center"><div style="font-size:24px;margin-bottom:4px">📱</div><div class="hdsd-subcard-title">Truy cập mọi nơi</div>Giao diện tối ưu cho điện thoại — quản lý mọi lúc mọi nơi.</div>' +
                            '<div class="hdsd-subcard" style="text-align:center"><div style="font-size:24px;margin-bottom:4px">📈</div><div class="hdsd-subcard-title">Biểu đồ trực quan</div>Nhìn nhanh doanh số, hoa hồng, đơn hàng theo thời gian.</div>' +
                        '</div>' +
                        '<div class="hdsd-highlight-gold">💡 <strong>TƯ DUY LÀM GIÀU:</strong> Mỗi Affiliate trong hệ thống giới thiệu khách chốt đơn → họ được 10%, anh/chị hưởng thêm 5%. Càng nhiều Affiliate trong hệ thống = càng nhiều nguồn thu nhập thụ động — nhân rộng lợi nhuận không giới hạn!</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            // STEP 4
            '<div class="hdsd-step-item hdsd-animate">' +
                '<div class="hdsd-step-num" aria-hidden="true">4</div>' +
                '<div class="hdsd-step-card">' +
                    '<h3 class="hdsd-step-title">🔹 Rút Tiền Linh Hoạt</h3>' +
                    '<div class="hdsd-step-content">' +
                        '<p>Mỗi đơn hoàn thành, hệ thống <strong>TỰ ĐỘNG</strong> cập nhật hoa hồng. Vào trang <strong>"Rút Tiền"</strong>:</p>' +
                        '<ul style="margin:12px 0;padding-left:4px">' +
                            '<li style="margin-bottom:6px">💰 Xem số dư khả dụng</li>' +
                            '<li style="margin-bottom:6px">📝 Nhập số tiền (tối thiểu <strong>100.000đ</strong>)</li>' +
                            '<li style="margin-bottom:6px">🏦 Điền thông tin ngân hàng</li>' +
                            '<li style="margin-bottom:6px">✅ Bấm <strong>"Gửi Yêu Cầu"</strong></li>' +
                        '</ul>' +
                        '<div style="margin-top:14px;margin-bottom:14px;text-align:center">' +
                            '<img src="/images/huongdan-ruttien.png" alt="Minh họa trang Rút Tiền" style="max-width:100%;border-radius:16px;box-shadow:0 8px 32px rgba(18,37,70,.15);border:1px solid rgba(18,37,70,.08)" loading="lazy">' +
                            '<p style="font-size:12px;color:var(--hdsd-slate-500);margin-top:10px;font-style:italic">📸 Minh họa giao diện "Rút Tiền" trên hệ thống</p>' +
                            '<a class="hdsd-btn-sparkle" href="/rut-tien-affiliate" onclick="event.preventDefault();window.location.href=\'/rut-tien-affiliate\';" style="margin-top:14px">💰 Xem Rút Tiền</a>' +
                        '</div>' +
                        '<div class="hdsd-step-banner">⚡ Chủ động rút <strong>bất cứ lúc nào</strong> — không cần chờ cuối tháng. HV chuyển khoản và gửi bill xác nhận ngay.</div>' +
                        '<div class="hdsd-subcards" style="grid-template-columns:repeat(2,1fr);margin-top:16px">' +
                            '<div class="hdsd-subcard"><div class="hdsd-subcard-title">❓ Rút tối thiểu bao nhiêu?</div>Tối thiểu <strong>100.000đ</strong> mỗi lần rút. Không giới hạn số lần.</div>' +
                            '<div class="hdsd-subcard"><div class="hdsd-subcard-title">❓ Nhận tiền trong bao lâu?</div>HV xử lý trong <strong>24-48h</strong> làm việc. Bill chuyển khoản được gửi ngay.</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            // STEP 5
            '<div class="hdsd-step-item hdsd-animate">' +
                '<div class="hdsd-step-num" aria-hidden="true">5</div>' +
                '<div class="hdsd-step-card">' +
                    '<h3 class="hdsd-step-title">🔹 Báo Cáo Hoa Hồng</h3>' +
                    '<div class="hdsd-step-content">' +
                        '<p>Trang <strong>"Báo Cáo Hoa Hồng HV"</strong> hiển thị toàn cảnh:</p>' +
                        '<div class="hdsd-subcards" style="grid-template-columns:repeat(3,1fr)">' +
                            '<div class="hdsd-subcard" style="text-align:center"><div style="font-size:24px;margin-bottom:4px">💵</div><div class="hdsd-subcard-title">Tổng Hoa Hồng</div>10% từ KH trực tiếp + 5% từ KH của Affiliate trong hệ thống</div>' +
                            '<div class="hdsd-subcard" style="text-align:center"><div style="font-size:24px;margin-bottom:4px">📦</div><div class="hdsd-subcard-title">Tổng Đơn Hàng</div>Đã chốt thành công</div>' +
                            '<div class="hdsd-subcard" style="text-align:center"><div style="font-size:24px;margin-bottom:4px">👥</div><div class="hdsd-subcard-title">KH & Affiliate</div>Phân loại chi tiết</div>' +
                        '</div>' +
                        '<div style="margin-top:14px;text-align:center">' +
                            '<img src="/images/huongdan-baocaohoahong.png" alt="Minh họa trang Báo Cáo Hoa Hồng HV" style="max-width:100%;border-radius:16px;box-shadow:0 8px 32px rgba(18,37,70,.15);border:1px solid rgba(18,37,70,.08)" loading="lazy">' +
                            '<p style="font-size:12px;color:var(--hdsd-slate-500);margin-top:10px;font-style:italic">📸 Minh họa giao diện "Báo Cáo Hoa Hồng HV" trên hệ thống</p>' +
                            '<a class="hdsd-btn-sparkle" href="/bao-cao-hoa-hong-hv" onclick="event.preventDefault();window.location.href=\'/bao-cao-hoa-hong-hv\';" style="margin-top:14px">📊 Xem Báo Cáo</a>' +
                        '</div>' +
                        '<div class="hdsd-tip">🔍 Lọc theo: Hôm nay / Hôm qua / 7 ngày / Tháng / Tùy chọn ngày</div>' +
                        '<p style="margin-top:16px;font-size:14px;color:var(--hdsd-slate-600);line-height:1.7">Ngoài ra, hệ thống còn hiển thị <strong>trạng thái từng đơn hàng</strong> (đang tư vấn, báo giá, chốt đơn, sản xuất, giao hàng, hoàn thành), giúp anh/chị nắm rõ tiến độ và ước tính thu nhập. Mọi thông tin đều cập nhật <strong>real-time</strong> — chỉ cần mở trang là thấy ngay.</p>' +
                        '<div class="hdsd-highlight-gold">🎯 <strong>Lưu ý quan trọng:</strong> Hệ thống tự động tính hoa hồng khi đơn hàng được ghi nhận doanh thu. Anh/chị không cần liên hệ xác nhận — mọi thứ đều minh bạch và tự động!</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>' +
    '</section>';
}

// ========== FEATURES ==========
function _hdsdFeaturesHTML() {
    return '<section class="hdsd-section hdsd-features-bg" id="hdsd-features">' +
        '<div style="text-align:center">' +
            '<div class="hdsd-section-tag hdsd-section-tag-light hdsd-animate">⭐ TẠI SAO CHỌN ĐỒNG PHỤC HV</div>' +
            '<h2 class="hdsd-section-title hdsd-animate">Lợi Ích Vượt Trội Cho Đối Tác</h2>' +
        '</div>' +
        '<div class="hdsd-feature-table-wrap hdsd-animate">' +
            '<table class="hdsd-table">' +
                '<thead><tr><th style="width:40%">Lợi ích</th><th>Chi tiết</th></tr></thead>' +
                '<tbody>' +
                    '<tr><td><strong>✅ Không cần vốn</strong></td><td>Không nhập hàng, không tồn kho — hoàn toàn miễn phí</td></tr>' +
                    '<tr><td><strong>✅ Không cần nghiệp vụ</strong></td><td>HV lo từ A–Z: tư vấn, thiết kế, sản xuất, giao hàng</td></tr>' +
                    '<tr><td><strong>✅ Minh bạch 100%</strong></td><td>Real-time mọi đơn hàng — theo dõi trực tiếp trên hệ thống</td></tr>' +
                    '<tr><td><strong>✅ Hoa hồng cao</strong></td><td>10% từ KH trực tiếp + 5% từ KH của Affiliate trong hệ thống — cao hơn thị trường</td></tr>' +
                    '<tr><td><strong>✅ Thu nhập trọn đời</strong></td><td>Khách quay lại — hoa hồng nhận tiếp, không giới hạn</td></tr>' +
                    '<tr><td><strong>✅ Xây hệ thống riêng</strong></td><td>Affiliate trong hệ thống chốt đơn → họ được 10%, anh/chị hưởng thêm 5% — nhân rộng lợi nhuận</td></tr>' +
                    '<tr><td><strong>✅ Rút tiền linh hoạt</strong></td><td>Có bill xác nhận, tối thiểu 100.000đ, bất cứ lúc nào</td></tr>' +
                    '<tr><td><strong>✅ Hỗ trợ tận tâm</strong></td><td>Đội ngũ chăm sóc đối tác 24/7 — giải đáp mọi thắc mắc</td></tr>' +
                    '<tr><td><strong>✅ Tư liệu marketing</strong></td><td>Cung cấp hình ảnh, video, nội dung sẵn sàng đăng bài</td></tr>' +
                '</tbody>' +
            '</table>' +
        '</div>' +
        '<div class="hdsd-highlight-gold hdsd-animate" style="max-width:800px;margin:24px auto 0">🏆 <strong>Đồng Phục HV — Đối tác được tin tưởng bởi hàng trăm doanh nghiệp, trường học và tổ chức trên toàn quốc.</strong> Khi anh/chị giới thiệu HV, anh/chị đang giới thiệu một thương hiệu có <strong>uy tín đã được chứng minh</strong>.</div>' +
    '</section>';
}

// ========== CTA ==========
function _hdsdCtaHTML() {
    return '<section class="hdsd-cta-section" id="hdsd-cta">' +
        '<div class="hdsd-cta-glow"></div>' +
        '<div style="position:relative;z-index:1;max-width:750px;margin:0 auto">' +
            '<div class="hdsd-section-tag hdsd-section-tag-dark hdsd-animate" style="border:1px solid rgba(250,210,76,.25)">🎯 LỜI KẾT</div>' +
            '<h2 class="hdsd-section-title hdsd-animate" style="color:#fff">Bắt Đầu Hành Trình Của Bạn</h2>' +
            '<p class="hdsd-cta-text hdsd-animate">Trong thời đại biến động, thu nhập thụ động là chìa khóa tự do tài chính. Đồng Phục HV mang đến cơ hội đó — <strong style="color:#fad24c">không vốn, không giới hạn, không rủi ro.</strong></p>' +
            '<blockquote class="hdsd-quote-final hdsd-animate">"Điều quý giá nhất tại HV không phải 10% hay 5% hoa hồng — mà là quyền lợi <strong>NHẬN HOA HỒNG TRỌN ĐỜI</strong> từ mọi lần khách quay lại. Đây chính là tài sản dài hạn mà anh/chị xây dựng cho chính mình."</blockquote>' +
            '<p class="hdsd-cta-closing hdsd-animate">Hãy bắt đầu ngay hôm nay — Đồng Phục HV luôn đồng hành! 🚀</p>' +
            '<div class="hdsd-cta-actions hdsd-animate">' +
                '<a class="hdsd-btn-gold" href="/chuyen-so" onclick="event.preventDefault();window.location.href=\'/chuyen-so\';">🚀 Chuyển Số Ngay</a>' +
                '<a class="hdsd-btn-outline" href="/bao-cao-hoa-hong-hv" onclick="event.preventDefault();window.location.href=\'/bao-cao-hoa-hong-hv\';">📊 Xem Báo Cáo</a>' +
            '</div>' +
            '<div class="hdsd-support-grid hdsd-animate" style="margin-top:40px">' +
                '<div class="hdsd-support-item"><div class="hdsd-support-icon">📞</div><div class="hdsd-support-name">Hotline hỗ trợ</div><div class="hdsd-support-val">Liên hệ nhân viên phụ trách</div></div>' +
                '<div class="hdsd-support-item"><div class="hdsd-support-icon">💬</div><div class="hdsd-support-name">Zalo / Messenger</div><div class="hdsd-support-val">Chat trực tiếp 24/7</div></div>' +
                '<div class="hdsd-support-item"><div class="hdsd-support-icon">🌐</div><div class="hdsd-support-name">Website</div><div class="hdsd-support-val">dongphuchv.vn</div></div>' +
            '</div>' +
            '<p class="hdsd-animate" style="font-size:12px;color:rgba(255,255,255,.45);margin-top:24px;text-align:center">© 2026 Đồng Phục HV — Cổng Đối Tác Chiết Khấu. Mọi quyền được bảo lưu.</p>' +
        '</div>' +
    '</section>';
}

// ========== SMOOTH SCROLL ==========
function _hdsdScrollTo(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var topbar = document.querySelector('.topbar');
    var offset = topbar ? topbar.offsetHeight + 16 : 80;
    var y = el.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: y, behavior: 'smooth' });
}

// ========== PARTICLES CANVAS ==========
function _hdsdInitParticles() {
    var canvas = document.getElementById('hdsdCanvas');
    if (!canvas) return;
    // Disable on mobile or reduced-motion
    if (window.innerWidth < 768 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var ctx = canvas.getContext('2d');
    var particles = [];
    var count = 30;

    function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
    resize();

    for (var i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 2 + 1,
            dx: (Math.random() - 0.5) * 0.4,
            dy: (Math.random() - 0.5) * 0.3,
            a: Math.random() * 0.4 + 0.2
        });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(250,210,76,' + p.a + ')';
            ctx.fill();
            p.x += p.dx; p.y += p.dy;
            if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
        }
        _hdsdParticleId = requestAnimationFrame(draw);
    }

    var resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resize, 200);
    });
    draw();
}

// ========== SCROLL ANIMATIONS (Intersection Observer) ==========
function _hdsdInitScrollAnimations() {
    var els = document.querySelectorAll('.hdsd-animate');
    if (!els.length) return;
    _hdsdObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('hdsd-visible');
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function(el) { _hdsdObserver.observe(el); });
}

// ========== SCROLL-TO-TOP ==========
function _hdsdInitScrollTop() {
    var btn = document.createElement('button');
    btn.id = 'hdsdScrollTop';
    btn.className = 'hdsd-scroll-top';
    btn.setAttribute('aria-label', 'Cuộn lên đầu trang');
    btn.innerHTML = '▲';
    btn.onclick = function() { window.scrollTo({ top: 0, behavior: 'smooth' }); };
    document.body.appendChild(btn);

    _hdsdScrollHandler = function() {
        if (window.pageYOffset > 400) {
            btn.classList.add('hdsd-scroll-visible');
        } else {
            btn.classList.remove('hdsd-scroll-visible');
        }
    };
    window.addEventListener('scroll', _hdsdScrollHandler, { passive: true });
}

// ========== TOC TRACKING ==========
function _hdsdInitToc() {
    var sections = ['hdsd-welcome', 'hdsd-commission', 'hdsd-steps', 'hdsd-features', 'hdsd-cta'];
    var items = document.querySelectorAll('.hdsd-toc-item');
    if (!items.length) return;

    var currentIdx = 0;
    _hdsdTocObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                var idx = sections.indexOf(entry.target.id);
                if (idx !== -1) currentIdx = idx;
            }
        });
        items.forEach(function(item, i) {
            if (i === currentIdx) {
                item.classList.add('hdsd-toc-active');
            } else {
                item.classList.remove('hdsd-toc-active');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '-80px 0px -50% 0px'
    });

    sections.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) _hdsdTocObserver.observe(el);
    });
}

// ========== COUNT-UP ANIMATION ==========
function _hdsdInitCountUp() {
    var els = document.querySelectorAll('[data-countup]');
    if (!els.length) return;

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting && !_hdsdCountedSet.has(entry.target)) {
                _hdsdCountedSet.add(entry.target);
                observer.unobserve(entry.target);
                var target = parseInt(entry.target.getAttribute('data-countup'), 10);
                var suffix = entry.target.querySelector('span') ? entry.target.querySelector('span').outerHTML : '%';
                var duration = 1500;
                var start = performance.now();

                function step(now) {
                    var elapsed = now - start;
                    var progress = Math.min(elapsed / duration, 1);
                    // easeOutExpo
                    var ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
                    var current = Math.round(ease * target);
                    entry.target.innerHTML = current + suffix;
                    if (progress < 1) requestAnimationFrame(step);
                }
                requestAnimationFrame(step);
            }
        });
    }, { threshold: 0.5 });

    els.forEach(function(el) { observer.observe(el); });
}

// ========== LIGHTBOX ==========
function _hdsdInitLightbox() {
    // Create lightbox DOM
    var lb = document.createElement('div');
    lb.className = 'hdsd-lightbox';
    lb.innerHTML = '<button class="hdsd-lightbox-close" aria-label="Đóng">✕</button><img src="" alt="">';
    document.body.appendChild(lb);

    var lbImg = lb.querySelector('img');
    var lbClose = lb.querySelector('.hdsd-lightbox-close');

    function closeLightbox() {
        lb.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Click on any guide image
    var container = document.querySelector('.hdsd-page');
    if (!container) return;

    container.addEventListener('click', function(e) {
        var img = e.target;
        if (img.tagName !== 'IMG' || !img.closest('.hdsd-step-content')) return;
        e.preventDefault();
        lbImg.src = img.src;
        lbImg.alt = img.alt;
        lb.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // Close on backdrop click (not on the image itself)
    lb.addEventListener('click', function(e) {
        if (e.target === lb || e.target === lbClose) closeLightbox();
    });
    lbClose.addEventListener('click', closeLightbox);

    // Close on ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && lb.classList.contains('active')) closeLightbox();
    });
}
