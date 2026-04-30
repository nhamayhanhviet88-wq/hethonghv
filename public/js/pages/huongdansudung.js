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
}

// ========== HERO ==========
function _hdsdHeroHTML() {
    return '<section class="hdsd-hero" id="hdsd-hero">' +
        '<canvas class="hdsd-hero-canvas" id="hdsdCanvas" aria-hidden="true"></canvas>' +
        '<div class="hdsd-hero-glow"></div>' +
        '<div class="hdsd-hero-content">' +
            '<div class="hdsd-hero-badge">🌟 CỔNG ĐỐI TÁC CHIẾT KHẤU</div>' +
            '<h1 class="hdsd-hero-title">Hướng Dẫn Sử Dụng Hệ Thống</h1>' +
            '<p class="hdsd-hero-subtitle">Kiếm Thu Nhập Bền Vững – Minh Bạch – Không Cần Vốn</p>' +
            '<p class="hdsd-hero-desc">Tài liệu hướng dẫn chi tiết giúp Quý đối tác sử dụng hệ thống Đồng Phục HV một cách hiệu quả nhất, từ giới thiệu khách hàng đến nhận hoa hồng.</p>' +
            '<div class="hdsd-hero-actions">' +
                '<a class="hdsd-btn-gold" href="#hdsd-steps" onclick="event.preventDefault();_hdsdScrollTo(\'hdsd-steps\')">🚀 Bắt Đầu Ngay</a>' +
                '<a class="hdsd-btn-outline" href="#hdsd-welcome" onclick="event.preventDefault();_hdsdScrollTo(\'hdsd-welcome\')">📖 Xem Hướng Dẫn</a>' +
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
            '<p class="hdsd-welcome-text">Trong mắt chúng tôi, anh/chị là:</p>' +
            '<div class="hdsd-role-grid">' +
                '<div class="hdsd-role-card hdsd-animate hdsd-animate-delay-1"><div class="hdsd-role-icon">🤝</div><div class="hdsd-role-title">Người đồng hành chiến lược</div><div class="hdsd-role-desc">Cùng HV mang giá trị đến cộng đồng</div></div>' +
                '<div class="hdsd-role-card hdsd-animate hdsd-animate-delay-2"><div class="hdsd-role-icon">🌟</div><div class="hdsd-role-title">Đại sứ thương hiệu</div><div class="hdsd-role-desc">Đại diện cho uy tín và chất lượng HV</div></div>' +
                '<div class="hdsd-role-card hdsd-animate hdsd-animate-delay-3"><div class="hdsd-role-icon">💼</div><div class="hdsd-role-title">Đối tác kinh doanh đẳng cấp</div><div class="hdsd-role-desc">Chia sẻ lợi nhuận công bằng, bền vững</div></div>' +
            '</div>' +
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
                '<div class="hdsd-comm-label">Giới thiệu Affiliate đối tác</div>' +
                '<div class="hdsd-comm-rate" data-countup="5">5<span style="font-size:.5em">%</span></div>' +
                '<div class="hdsd-comm-desc">Hưởng từ mọi đơn của Affiliate</div>' +
            '</div>' +
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
                        '<p><strong>3 cách hiệu quả:</strong></p>' +
                        '<div class="hdsd-subcards">' +
                            '<div class="hdsd-subcard"><div class="hdsd-subcard-title">✅ Cách 1 — Mối quan hệ</div>Giới thiệu doanh nghiệp, công ty, bạn bè, đồng nghiệp có nhu cầu đồng phục.</div>' +
                            '<div class="hdsd-subcard"><div class="hdsd-subcard-title">✅ Cách 2 — Mạng xã hội</div>Đăng bài HV lên Facebook, Zalo, TikTok, Instagram, LinkedIn, các Group chuyên ngành.</div>' +
                            '<div class="hdsd-subcard"><div class="hdsd-subcard-title">✅ Cách 3 — Video 🔥</div>Quay video sản phẩm, clip TikTok/Reels review, livestream tư vấn trực tiếp.</div>' +
                        '</div>' +
                        '<div class="hdsd-tip">💡 <strong>Mẹo:</strong> Mỗi công ty 50 nhân viên có thể mang về vài triệu — vài chục triệu đồng hoa hồng.</div>' +
                        '<div class="hdsd-highlight-fire">🔥 <strong>Sức mạnh của video:</strong> Viral hàng triệu view chỉ sau 1 đêm — khách tự tìm đến anh/chị!</div>' +
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
                        '<div class="hdsd-highlight-fire">🔥 <strong>Đặc biệt:</strong> Khách hàng từ Affiliate của anh/chị cũng hiển thị đầy đủ tiến độ — tự động hưởng 5% khi đơn hoàn thành.</div>' +
                        '<p style="margin-top:16px"><strong>🤝 3.2. Theo Dõi Tư Vấn Affiliate</strong> — Xem ngay: Affiliate đã có tài khoản chưa? Đang tư vấn giai đoạn nào? Có doanh số chưa?</p>' +
                        '<p style="margin-top:12px"><strong>📊 3.3. Quản Lý Hệ Thống Affiliate</strong> — Theo dõi toàn bộ: số Affiliate con, KH giới thiệu, doanh số, đơn chốt.</p>' +
                        '<div class="hdsd-highlight-gold">💡 <strong>TƯ DUY LÀM GIÀU:</strong> Xây dựng HỆ THỐNG AFFILIATE CON — mỗi đối tác tự kiếm tiền cho anh/chị. Thu nhập thụ động đúng nghĩa!</div>' +
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
                        '<div class="hdsd-step-banner">⚡ Chủ động rút <strong>bất cứ lúc nào</strong> — không cần chờ cuối tháng. HV chuyển khoản và gửi bill xác nhận ngay.</div>' +
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
                            '<div class="hdsd-subcard" style="text-align:center"><div style="font-size:24px;margin-bottom:4px">💵</div><div class="hdsd-subcard-title">Tổng Hoa Hồng</div>10% trực tiếp + 5% gián tiếp</div>' +
                            '<div class="hdsd-subcard" style="text-align:center"><div style="font-size:24px;margin-bottom:4px">📦</div><div class="hdsd-subcard-title">Tổng Đơn Hàng</div>Đã chốt thành công</div>' +
                            '<div class="hdsd-subcard" style="text-align:center"><div style="font-size:24px;margin-bottom:4px">👥</div><div class="hdsd-subcard-title">KH & Affiliate</div>Phân loại chi tiết</div>' +
                        '</div>' +
                        '<div class="hdsd-tip">🔍 Lọc theo: Hôm nay / Hôm qua / 7 ngày / Tháng / Tùy chọn ngày</div>' +
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
                    '<tr><td><strong>✅ Hoa hồng cao</strong></td><td>10% trực tiếp + 5% gián tiếp — cao hơn thị trường</td></tr>' +
                    '<tr><td><strong>✅ Thu nhập trọn đời</strong></td><td>Khách quay lại — hoa hồng nhận tiếp, không giới hạn</td></tr>' +
                    '<tr><td><strong>✅ Xây hệ thống riêng</strong></td><td>Affiliate con tự sinh lợi — thu nhập thụ động</td></tr>' +
                    '<tr><td><strong>✅ Rút tiền linh hoạt</strong></td><td>Có bill xác nhận, tối thiểu 100.000đ, bất cứ lúc nào</td></tr>' +
                '</tbody>' +
            '</table>' +
        '</div>' +
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
                '<a class="hdsd-btn-gold" href="#" onclick="event.preventDefault();if(typeof handleRoute===\'function\'){window.location.hash=\'chuyen-so\';handleRoute();}">🚀 Chuyển Số Ngay</a>' +
                '<a class="hdsd-btn-outline" href="#" onclick="event.preventDefault();if(typeof handleRoute===\'function\'){window.location.hash=\'bao-cao-hoa-hong-hv\';handleRoute();}">📊 Xem Báo Cáo</a>' +
            '</div>' +
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
