/**
 * Trợ Lý AI Thông Minh HV (Google Gemini AI Assistant)
 * Component dùng chung cho toàn bộ hệ thống HV
 */
(function() {
    if (window.HVAiAssistantInitialized) return;
    window.HVAiAssistantInitialized = true;

    var state = {
        isOpen: false,
        history: [],
        isThinking: false
    };

    function initHVAiAssistant() {
        injectStyles();
        createFloatingWidget();
    }

    function injectStyles() {
        if (document.getElementById('hvAiStyles')) return;
        var style = document.createElement('style');
        style.id = 'hvAiStyles';
        style.textContent = `
            /* Floating AI Widget Button */
            .hv-ai-float-btn {
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 99990;
                background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%);
                color: #fff;
                border: none;
                border-radius: 30px;
                padding: 12px 20px;
                font-size: 14px;
                font-weight: 800;
                cursor: pointer;
                box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.5);
                display: flex;
                align-items: center;
                gap: 8px;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            .hv-ai-float-btn:hover {
                transform: translateY(-3px) scale(1.03);
                box-shadow: 0 15px 30px -5px rgba(79, 70, 229, 0.6);
            }
            .hv-ai-pulse {
                width: 10px;
                height: 10px;
                background: #22c55e;
                border-radius: 50%;
                box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
                animation: hvAiPulse 1.6s infinite;
            }
            @keyframes hvAiPulse {
                0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
                100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
            }

            /* Chat Window */
            .hv-ai-chat-window {
                position: fixed;
                bottom: 90px;
                right: 24px;
                z-index: 99991;
                width: 400px;
                max-width: calc(100vw - 32px);
                height: 580px;
                max-height: calc(100vh - 120px);
                background: #ffffff;
                border-radius: 20px;
                box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.3);
                border: 1px solid #e2e8f0;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                animation: hvAiSlideUp 0.25s ease-out;
            }
            @keyframes hvAiSlideUp {
                from { opacity: 0; transform: translateY(20px) scale(0.96); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }

            .hv-ai-header {
                background: linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%);
                color: #fff;
                padding: 16px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .hv-ai-header-title {
                font-size: 15px;
                font-weight: 900;
                display: flex;
                align-items: center;
                gap: 8px;
                margin: 0;
            }
            .hv-ai-header-sub {
                font-size: 11px;
                color: #a5b4fc;
                font-weight: 600;
            }
            .hv-ai-hdr-btn {
                background: rgba(255,255,255,0.15);
                color: #fff;
                border: none;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                transition: background 0.2s;
            }
            .hv-ai-hdr-btn:hover { background: rgba(255,255,255,0.3); }

            /* Chat Body */
            .hv-ai-body {
                flex: 1;
                padding: 16px;
                overflow-y: auto;
                background: #f8fafc;
                display: flex;
                flex-direction: column;
                gap: 14px;
            }

            .hv-ai-msg {
                display: flex;
                flex-direction: column;
                max-width: 86%;
                font-size: 13px;
                line-height: 1.6;
                word-break: break-word;
            }
            .hv-ai-msg.user {
                align-self: flex-end;
                background: #4338ca;
                color: #fff;
                padding: 10px 14px;
                border-radius: 16px 16px 4px 16px;
                box-shadow: 0 2px 6px rgba(67, 56, 202, 0.2);
            }
            .hv-ai-msg.assistant {
                align-self: flex-start;
                background: #fff;
                color: #1e293b;
                padding: 14px 16px;
                border-radius: 16px 16px 16px 4px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 2px 6px rgba(0,0,0,0.04);
            }

            /* Suggestion Chips */
            .hv-ai-chips {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin-top: 6px;
            }
            .hv-ai-chip {
                background: #e0e7ff;
                color: #3730a3;
                border: 1px solid #c7d2fe;
                padding: 6px 10px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.15s;
            }
            .hv-ai-chip:hover {
                background: #4338ca;
                color: #fff;
                border-color: #4338ca;
            }

            /* Action Buttons inside AI response */
            .hv-ai-rule-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: linear-gradient(135deg, #059669, #10b981);
                color: #fff;
                padding: 6px 12px;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 800;
                border: none;
                cursor: pointer;
                margin-top: 6px;
                box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
                transition: transform 0.15s;
            }
            .hv-ai-rule-btn:hover { transform: scale(1.03); }

            /* Chat Footer Input */
            .hv-ai-footer {
                padding: 12px 16px;
                background: #fff;
                border-top: 1px solid #e2e8f0;
                display: flex;
                gap: 8px;
                align-items: center;
            }
            .hv-ai-input {
                flex: 1;
                padding: 10px 14px;
                border: 1px solid #cbd5e1;
                border-radius: 12px;
                font-size: 13px;
                outline: none;
                transition: border-color 0.2s;
            }
            .hv-ai-input:focus { border-color: #4338ca; box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.1); }
            .hv-ai-send-btn {
                background: #4338ca;
                color: #fff;
                border: none;
                padding: 10px 16px;
                border-radius: 12px;
                font-weight: 800;
                font-size: 13px;
                cursor: pointer;
                transition: background 0.2s;
            }
            .hv-ai-send-btn:hover { background: #3730a3; }
        `;
        document.head.appendChild(style);
    }

    function createFloatingWidget() {
        var btn = document.createElement('button');
        btn.className = 'hv-ai-float-btn';
        btn.id = 'hvAiFloatBtn';
        btn.innerHTML = `
            <div class="hv-ai-pulse"></div>
            <span>🤖 Trợ Lý AI HV</span>
        `;
        btn.onclick = toggleAiChatWindow;
        document.body.appendChild(btn);
    }

    function toggleAiChatWindow() {
        var win = document.getElementById('hvAiChatWindow');
        if (win) {
            win.remove();
            state.isOpen = false;
        } else {
            renderAiChatWindow();
            state.isOpen = true;
        }
    }

    function renderAiChatWindow() {
        var win = document.createElement('div');
        win.className = 'hv-ai-chat-window';
        win.id = 'hvAiChatWindow';

        var pagePath = (window.location.pathname || '') + (window.location.search || '') + (window.location.hash || '');
        var isOverview = pagePath.includes('cacchisotongquan') || pagePath.includes('kpimarketing') || pagePath.includes('overview');

        var chipsHtml = '';
        var welcomeSub = '';
        if (isOverview) {
            welcomeSub = 'Trợ lý AI đang hỗ trợ Anh/Chị ở màn hình: <strong>📊 Các Chỉ Số Tổng Quan Giám Đốc</strong>';
            chipsHtml = `
                <div class="hv-ai-chip" onclick="window._hvAiSendQuick('Phân tích tổng quan hiệu quả số liệu tháng này giúp tôi')">💡 Phân tích tổng quan số liệu</div>
                <div class="hv-ai-chip" onclick="window._hvAiSendQuick('Chi phí Marketing Ads và CPL đang ở mức thế nào?')">💡 Đánh giá chi phí MKT Ads & CPL</div>
                <div class="hv-ai-chip" onclick="window._hvAiSendQuick('Tỷ lệ chốt đơn và Giá/đơn (CPD) hiện tại bao nhiêu?')">💡 Tỷ lệ chốt & Giá đơn CPD</div>
            `;
        } else {
            welcomeSub = 'Tôi có thể hỗ trợ Anh/Chị tra cứu nhanh quy định nội quy, kiểm tra điều khoản và tư vấn số liệu công ty.';
            chipsHtml = `
                <div class="hv-ai-chip" onclick="window._hvAiSendQuick('Công ty quy định đi làm muộn phạt bao nhiêu tiền?')">💡 Phạt đi làm muộn thế nào?</div>
                <div class="hv-ai-chip" onclick="window._hvAiSendQuick('Quy định về việc duyệt phiếu thu chi tiền nằm ở đâu?')">💡 Quy định duyệt thu chi?</div>
                <div class="hv-ai-chip" onclick="window._hvAiSendQuick('Công ty đã có quy định bảo mật dữ liệu chưa?')">💡 Kiểm tra quy định bảo mật</div>
            `;
        }

        win.innerHTML = `
            <div class="hv-ai-header">
                <div>
                    <h3 class="hv-ai-header-title">🤖 Trợ Lý AI Thông Minh HV</h3>
                    <div class="hv-ai-header-sub">Hỗ trợ tra cứu & tư vấn (Google Gemini 1.5 Flash)</div>
                </div>
                <div style="display:flex;gap:6px">
                    <button class="hv-ai-hdr-btn" onclick="window._hvAiOpenConfigModal()" title="Cấu hình API Key">⚙️</button>
                    <button class="hv-ai-hdr-btn" onclick="document.getElementById('hvAiChatWindow').remove()" title="Đóng">✕</button>
                </div>
            </div>

            <div class="hv-ai-body" id="hvAiBody">
                <div class="hv-ai-msg assistant">
                    <strong>Xin chào Anh/Chị! 👋</strong><br>
                    ${welcomeSub}
                    <div style="margin-top:10px;font-weight:700;color:#4338ca">💡 Câu hỏi gợi ý nhanh:</div>
                    <div class="hv-ai-chips">
                        ${chipsHtml}
                    </div>
                </div>
            </div>

            <div class="hv-ai-footer">
                <input type="text" class="hv-ai-input" id="hvAiInput" placeholder="Nhập câu hỏi tra cứu..." onkeypress="if(event.key==='Enter') window._hvAiSubmitChat()">
                <button class="hv-ai-send-btn" onclick="window._hvAiSubmitChat()">Gửi 🚀</button>
            </div>
        `;

        document.body.appendChild(win);
        setTimeout(function() {
            var inp = document.getElementById('hvAiInput');
            if (inp) inp.focus();
        }, 100);
    }

    window._hvAiSendQuick = function(txt) {
        var inp = document.getElementById('hvAiInput');
        if (inp) {
            inp.value = txt;
            window._hvAiSubmitChat();
        }
    };

    window._hvAiSubmitChat = async function() {
        var inp = document.getElementById('hvAiInput');
        var body = document.getElementById('hvAiBody');
        if (!inp || !body || !inp.value.trim() || state.isThinking) return;

        var userMsg = inp.value.trim();
        inp.value = '';

        // Render User Msg
        var userDiv = document.createElement('div');
        userDiv.className = 'hv-ai-msg user';
        userDiv.textContent = userMsg;
        body.appendChild(userDiv);

        // Render Typing Msg
        var thinkDiv = document.createElement('div');
        thinkDiv.className = 'hv-ai-msg assistant';
        thinkDiv.id = 'hvAiThinking';
        thinkDiv.innerHTML = '<em>⏳ Trợ Lý AI đang suy nghĩ & đối soát CSDL...</em>';
        body.appendChild(thinkDiv);
        body.scrollTop = body.scrollHeight;

        state.isThinking = true;

        try {
            var token = localStorage.getItem('token') || (document.cookie.match(/token=([^;]+)/) || [])[1];
            var res = await fetch('/api/ai-assistant/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? ('Bearer ' + token) : ''
                },
                body: JSON.stringify({
                    message: userMsg,
                    page: window.location.pathname,
                    history: state.history
                })
            });

            var data = await res.json();
            thinkDiv.remove();

            if (!res.ok) {
                var errDiv = document.createElement('div');
                errDiv.className = 'hv-ai-msg assistant';
                if (data.error === 'MISSING_API_KEY') {
                    errDiv.innerHTML = `
                        <span style="color:#dc2626;font-weight:800">⚠️ Chưa cấu hình API Key!</span><br>
                        ${data.message}<br>
                        <button class="hv-ai-rule-btn" style="background:#4338ca" onclick="window._hvAiOpenConfigModal()">⚙️ Cấu Hình API Key Ngay</button>
                    `;
                } else {
                    errDiv.innerHTML = `<span style="color:#dc2626">⚠️ ${data.error || 'Lỗi xử lý'}</span>`;
                }
                body.appendChild(errDiv);
            } else {
                var replyText = data.reply || '';
                state.history.push({ role: 'user', text: userMsg });
                state.history.push({ role: 'assistant', text: replyText });

                var aiDiv = document.createElement('div');
                aiDiv.className = 'hv-ai-msg assistant';
                aiDiv.innerHTML = formatAiReply(replyText);
                body.appendChild(aiDiv);
            }
        } catch (e) {
            if (thinkDiv) thinkDiv.remove();
            var errDiv = document.createElement('div');
            errDiv.className = 'hv-ai-msg assistant';
            errDiv.innerHTML = `<span style="color:#dc2626">⚠️ Lỗi kết nối mạng: ${e.message}</span>`;
            body.appendChild(errDiv);
        }

        state.isThinking = false;
        body.scrollTop = body.scrollHeight;
    };

    function formatAiReply(text) {
        if (!text) return '';
        var formatted = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        formatted = formatted.replace(/\n/g, '<br>');

        // Replace [OPEN_RULE:123] or [RULE:NQ-...] with interactive buttons
        formatted = formatted.replace(/\[OPEN_RULE:(\d+)\]/g, function(match, id) {
            return `<br><button class="hv-ai-rule-btn" onclick="if(window._nqOpenDetailModal) window._nqOpenDetailModal(${id})">👉 Mở Chi Tiết Điều Khoản Này</button>`;
        });

        formatted = formatted.replace(/\[SUGGEST_NEW_RULE:([^\]]+)\]/g, function(match, title) {
            return `<br><button class="hv-ai-rule-btn" style="background:#2563eb" onclick="if(window._nqOpenAddModal) window._nqOpenAddModal();">➕ Tạo Nhanh Điều Khoản Mới</button>`;
        });

        return formatted;
    }

    // Modal Config API Key
    window._hvAiOpenConfigModal = function() {
        var existing = document.getElementById('hvAiConfigOverlay');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.className = 'nq-modal-overlay';
        overlay.id = 'hvAiConfigOverlay';
        overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

        overlay.innerHTML = `
            <div class="nq-modal" style="max-width:540px">
                <div class="nq-modal-hdr">
                    <h3>⚙️ Cấu Hình Google Gemini API Key</h3>
                    <button class="nq-modal-close" onclick="document.getElementById('hvAiConfigOverlay').remove()">✕</button>
                </div>
                <div class="nq-modal-body">
                    <div style="font-size:13px;color:#475569;line-height:1.5">
                        Nhập khóa <strong>Gemini API Key Miễn Phí</strong> tạo từ Google AI Studio (<a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:#4338ca;font-weight:700">aistudio.google.com</a>) để kích hoạt Trợ Lý AI cho toàn hệ thống HV.
                    </div>
                    <div class="nq-form-group">
                        <label>🔑 Nhập Gemini API Key:</label>
                        <input type="password" id="hvAiApiKeyInput" class="nq-input" placeholder="Dán mã AIzaSy... vào đây">
                    </div>
                    <div id="hvAiConfigStatus" style="font-size:13px;font-weight:700"></div>
                </div>
                <div class="nq-modal-ftr">
                    <button class="nq-btn-secondary" onclick="document.getElementById('hvAiConfigOverlay').remove()">Hủy</button>
                    <button class="nq-btn-primary" onclick="window._hvAiSaveConfig()">💾 Lưu API Key</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
    };

    window._hvAiSaveConfig = async function() {
        var inp = document.getElementById('hvAiApiKeyInput');
        var st = document.getElementById('hvAiConfigStatus');
        if (!inp || !inp.value.trim()) {
            if (st) st.innerHTML = '<span style="color:#dc2626">Vui lòng dán mã API Key!</span>';
            return;
        }

        try {
            var token = localStorage.getItem('token') || (document.cookie.match(/token=([^;]+)/) || [])[1];
            var res = await fetch('/api/ai-assistant/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? ('Bearer ' + token) : ''
                },
                body: JSON.stringify({ api_key: inp.value.trim() })
            });

            var data = await res.json();
            if (res.ok) {
                if (st) st.innerHTML = '<span style="color:#16a34a">✅ Đã lưu API Key thành công! Bạn có thể sử dụng Trợ Lý AI ngay bây giờ.</span>';
                setTimeout(function() {
                    var ov = document.getElementById('hvAiConfigOverlay');
                    if (ov) ov.remove();
                }, 1200);
            } else {
                if (st) st.innerHTML = `<span style="color:#dc2626">⚠️ ${data.error || 'Lỗi lưu API Key'}</span>`;
            }
        } catch (e) {
            if (st) st.innerHTML = `<span style="color:#dc2626">⚠️ Lỗi kết nối: ${e.message}</span>`;
        }
    };

    // Auto initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHVAiAssistant);
    } else {
        initHVAiAssistant();
    }
})();
