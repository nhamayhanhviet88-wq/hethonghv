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
        isThinking: false,
        canConfig: false,
        isEnabled: true,
        allowedRoles: 'all',
        hasKey: false
    };

    async function initHVAiAssistant() {
        injectStyles();
        await fetchAiConfig();
        if (state.isEnabled) {
            createFloatingWidget();
        }
    }

    async function fetchAiConfig() {
        try {
            var token = localStorage.getItem('token') || (document.cookie.match(/token=([^;]+)/) || [])[1];
            var res = await fetch('/api/ai-assistant/config', {
                headers: { 'Authorization': token ? ('Bearer ' + token) : '' }
            });
            if (res.ok) {
                var data = await res.json();
                state.canConfig = !!data.can_config;
                state.isEnabled = !!data.is_enabled;
                state.allowedRoles = data.allowed_roles || 'all';
                state.hasKey = !!data.has_key;
            }
        } catch (e) {}
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
                padding: 10px 14px;
                background: #fff;
                border-top: 1px solid #e2e8f0;
                display: flex;
                gap: 6px;
                align-items: center;
            }
            .hv-ai-icon-btn {
                background: #f1f5f9;
                color: #475569;
                border: 1px solid #cbd5e1;
                width: 36px;
                height: 36px;
                border-radius: 10px;
                font-size: 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                flex-shrink: 0;
            }
            .hv-ai-icon-btn:hover {
                background: #e2e8f0;
                color: #1e293b;
                border-color: #94a3b8;
            }
            .hv-ai-icon-btn.recording {
                background: #fee2e2;
                color: #dc2626;
                border-color: #fca5a5;
                animation: hvAiPulseRed 1.2s infinite;
            }
            @keyframes hvAiPulseRed {
                0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.5); }
                70% { box-shadow: 0 0 0 8px rgba(220, 38, 38, 0); }
                100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
            }
            .hv-ai-input {
                flex: 1;
                padding: 9px 12px;
                border: 1px solid #cbd5e1;
                border-radius: 10px;
                font-size: 13px;
                outline: none;
                transition: border-color 0.2s;
                box-sizing: border-box;
            }
            .hv-ai-input:focus { border-color: #4338ca; box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.1); }
            .hv-ai-send-btn {
                background: #4338ca;
                color: #fff;
                border: none;
                padding: 9px 14px;
                border-radius: 10px;
                font-weight: 800;
                font-size: 13px;
                cursor: pointer;
                transition: background 0.2s;
                flex-shrink: 0;
            }
            .hv-ai-send-btn:hover { background: #3730a3; }

            /* Modal Standalone Styles */
            .hv-ai-modal-overlay {
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(5px);
                display: flex; align-items: center; justify-content: center;
                z-index: 100005; padding: 20px; animation: hvAiSlideUp 0.2s ease-out;
            }
            .hv-ai-modal {
                background: #ffffff; border-radius: 16px; width: 100%; max-width: 520px;
                box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35); display: flex; flex-direction: column;
                overflow: hidden; border: 1px solid #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .hv-ai-modal-hdr {
                padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex;
                justify-content: space-between; align-items: center; background: #f8fafc;
            }
            .hv-ai-modal-hdr h3 { margin: 0; font-size: 17px; font-weight: 900; color: #0f172a; }
            .hv-ai-modal-close { background: none; border: none; font-size: 20px; font-weight: 700; color: #94a3b8; cursor: pointer; }
            .hv-ai-modal-body { padding: 22px 24px; display: flex; flex-direction: column; gap: 16px; }
            .hv-ai-modal-ftr { padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; background: #f8fafc; }
            .hv-ai-input-field {
                width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px;
                font-size: 13px; outline: none; transition: border-color 0.2s; box-sizing: border-box;
            }
            .hv-ai-input-field:focus { border-color: #4338ca; box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.1); }
            .hv-ai-btn-save { background: #4338ca; color: #fff; border: none; padding: 9px 18px; border-radius: 8px; font-size: 13px; font-weight: 800; cursor: pointer; }
            .hv-ai-btn-save:hover { background: #3730a3; }
            .hv-ai-btn-cancel { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 9px 18px; border-radius: 8px; font-size: 13px; font-weight: 800; cursor: pointer; }
            
            /* Responsive Mobile Styles */
            @media (max-width: 768px) {
                .hv-ai-float-btn {
                    bottom: 18px;
                    right: 18px;
                    padding: 10px 15px;
                    font-size: 12.5px;
                    box-shadow: 0 8px 20px rgba(79, 70, 229, 0.4);
                }
                .hv-ai-chat-window {
                    bottom: 70px;
                    right: 10px;
                    left: 10px;
                    width: auto;
                    max-width: calc(100vw - 20px);
                    height: 75vh;
                    max-height: calc(100vh - 90px);
                }
            }
            
            .hv-ai-radio-group { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
            .hv-ai-radio-lbl {
                display: flex; align-items: center; gap: 10px; padding: 10px 14px;
                border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-weight: 700;
                color: #334155; cursor: pointer; transition: background 0.15s, border-color 0.15s;
            }
            .hv-ai-radio-lbl:hover { background: #f8fafc; border-color: #cbd5e1; }
            .hv-ai-radio-lbl input:checked + span { color: #4338ca; }
        `;
        document.head.appendChild(style);
    }

    async function checkProactiveAlerts() {
        try {
            var token = localStorage.getItem('token');
            var res = await fetch('/api/ai-assistant/alerts', {
                headers: { 'Authorization': token ? ('Bearer ' + token) : '' }
            });
            if (res.ok) {
                var data = await res.json();
                if (data && data.alerts && data.alerts.length > 0) {
                    state.proactiveAlerts = data.alerts;
                    updateFloatBadgeAlerts(data.alerts.length);
                }
            }
        } catch(e) {}
    }

    function updateFloatBadgeAlerts(count) {
        var btn = document.getElementById('hvAiFloatBtn');
        if (btn) {
            btn.innerHTML = `
                <div class="hv-ai-pulse" style="background:#ef4444"></div>
                <span>🤖 Trợ Lý AI HV <span style="background:#ef4444;color:#fff;padding:2px 6px;border-radius:10px;font-size:11px;margin-left:4px;font-weight:900">🚨 ${count}</span></span>
            `;
        }
    }

    function createFloatingWidget() {
        if (document.getElementById('hvAiFloatBtn')) return;
        var btn = document.createElement('button');
        btn.className = 'hv-ai-float-btn';
        btn.id = 'hvAiFloatBtn';
        btn.innerHTML = `
            <div class="hv-ai-pulse"></div>
            <span>🤖 Trợ Lý AI HV</span>
        `;
        btn.onclick = toggleAiChatWindow;
        document.body.appendChild(btn);
        checkProactiveAlerts();
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

        var alertCardsHtml = '';
        if (state.proactiveAlerts && state.proactiveAlerts.length > 0) {
            var items = state.proactiveAlerts.map(function(a) {
                var bg = a.severity === 'danger' ? '#fef2f2' : '#fffbeb';
                var border = a.severity === 'danger' ? '#fecaca' : '#fef3c7';
                var color = a.severity === 'danger' ? '#991b1b' : '#92400e';
                return `<div style="background:${bg};border:1px solid ${border};border-radius:10px;padding:8px 12px;margin-bottom:8px;font-size:12.5px;color:${color};box-shadow:0 1px 3px rgba(0,0,0,0.04)">
                    <div style="font-weight:900;margin-bottom:2px;display:flex;align-items:center;gap:6px">${a.title}</div>
                    <div style="line-height:1.4">${a.message}</div>
                </div>`;
            }).join('');
            alertCardsHtml = `<div style="margin-top:10px">${items}</div>`;
        }

        // Render Gear config icon ONLY FOR DIRECTOR (state.canConfig === true)
        var gearBtnHtml = state.canConfig ? `<button class="hv-ai-hdr-btn" onclick="window._hvAiOpenConfigModal()" title="Cấu hình API Key & Phân Quyền (Độc Quyền Giám Đốc)">⚙️</button>` : '';
        var ttsColor = state.ttsEnabled ? '#22c55e' : '#ffffff';
        var ttsBtnHtml = `<button class="hv-ai-hdr-btn" id="hvAiTtsBtn" onclick="window._hvAiToggleVoiceSpeech()" style="color:${ttsColor}" title="Bật/Tắt Giọng đọc Tiếng Việt 2 chiều">🔊</button>`;

        var clearBtnHtml = `<button class="hv-ai-hdr-btn" onclick="window._hvAiClearHistory()" title="Xóa lịch sử đàm thoại dài hạn">🗑️</button>`;

        win.innerHTML = `
            <div class="hv-ai-header">
                <div>
                    <h3 class="hv-ai-header-title">🤖 Trợ Lý AI Thông Minh HV</h3>
                    <div class="hv-ai-header-sub">Hỗ trợ tra cứu & tư vấn (Google Gemini AI)</div>
                </div>
                <div style="display:flex;gap:6px">
                    ${ttsBtnHtml}
                    ${clearBtnHtml}
                    ${gearBtnHtml}
                    <button class="hv-ai-hdr-btn" onclick="document.getElementById('hvAiChatWindow').remove()" title="Đóng">✕</button>
                </div>
            </div>

            <div class="hv-ai-body" id="hvAiBody">
                <div class="hv-ai-msg assistant">
                    <strong>Xin chào Anh/Chị! 👋</strong><br>
                    ${welcomeSub}
                    ${alertCardsHtml}
                    <div style="margin-top:10px;font-weight:700;color:#4338ca">💡 Câu hỏi gợi ý nhanh:</div>
                    <div class="hv-ai-chips">
                        ${chipsHtml}
                    </div>
                </div>
            </div>

            <!-- Attached Image Preview Bar -->
            <div id="hvAiImgPreviewBar" style="display:none;padding:6px 12px;background:#f1f5f9;border-top:1px solid #cbd5e1;align-items:center;gap:10px">
                <img id="hvAiPreviewImgThumb" style="width:38px;height:38px;object-fit:cover;border-radius:8px;border:1px solid #cbd5e1">
                <div style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:700;color:#334155" id="hvAiPreviewImgName">Ảnh đính kèm</div>
                <button onclick="window._hvAiRemoveAttachedImage()" style="background:none;border:none;color:#ef4444;font-size:16px;font-weight:900;cursor:pointer" title="Xóa ảnh">✕</button>
            </div>

            <!-- Voice Recording Indicator Bar -->
            <div id="hvAiVoiceStatus" style="display:none;padding:6px 12px;background:#fef2f2;border-top:1px solid #fecaca;align-items:center;gap:8px;font-size:12px;font-weight:800;color:#dc2626">
                <div class="hv-ai-pulse" style="background:#dc2626"></div>
                <span id="hvAiVoiceText" style="flex:1">🎙️ Đang lắng nghe giọng nói... Hãy nói câu hỏi!</span>
                <button onclick="window._hvAiStopVoiceRecording()" style="background:#dc2626;color:#fff;border:none;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer">Dừng & Gửi</button>
            </div>

            <div class="hv-ai-footer">
                <input type="file" id="hvAiFileInput" accept="image/*" style="display:none" onchange="window._hvAiOnImageSelected(this)">
                <button class="hv-ai-icon-btn" onclick="document.getElementById('hvAiFileInput').click()" title="Đính kèm Hình ảnh / Chụp ảnh (Vision AI)">📷</button>
                <button class="hv-ai-icon-btn" id="hvAiVoiceBtn" onclick="window._hvAiToggleVoiceRecording()" title="Ghi âm giọng nói (Voice AI)">🎙️</button>
                <input type="text" class="hv-ai-input" id="hvAiInput" placeholder="Nhập câu hỏi hoặc chọn giọng nói/hình ảnh..." onkeypress="if(event.key==='Enter') window._hvAiSubmitChat()">
                <button class="hv-ai-send-btn" onclick="window._hvAiSubmitChat()">Gửi 🚀</button>
            </div>
        `;

        document.body.appendChild(win);
        loadPersistentHistory();
        setTimeout(function() {
            var inp = document.getElementById('hvAiInput');
            if (inp) inp.focus();
        }, 100);
    }

    async function loadPersistentHistory() {
        try {
            var token = localStorage.getItem('token') || (document.cookie.match(/token=([^;]+)/) || [])[1];
            var res = await fetch('/api/ai-assistant/history', {
                headers: { 'Authorization': token ? ('Bearer ' + token) : '' }
            });
            if (res.ok) {
                var data = await res.json();
                if (data && data.history && data.history.length > 0) {
                    state.history = data.history.map(function(h) { return { role: h.role, text: h.text }; });
                    var body = document.getElementById('hvAiBody');
                    if (body) {
                        data.history.forEach(function(item) {
                            var div = document.createElement('div');
                            div.className = 'hv-ai-msg ' + (item.role === 'user' ? 'user' : 'assistant');
                            if (item.role === 'user') {
                                div.innerHTML = `<span>${(item.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`;
                            } else {
                                div.innerHTML = formatAiReply(item.text);
                            }
                            body.appendChild(div);
                        });
                        body.scrollTop = body.scrollHeight;
                    }
                }
            }
        } catch(e) {}
    }

    window._hvAiClearHistory = async function() {
        if (!confirm('Anh/Chị có chắc chắn muốn xóa toàn bộ lịch sử đàm thoại dài hạn với Trợ lý AI không?')) return;
        try {
            var token = localStorage.getItem('token') || (document.cookie.match(/token=([^;]+)/) || [])[1];
            var res = await fetch('/api/ai-assistant/history', {
                method: 'DELETE',
                headers: { 'Authorization': token ? ('Bearer ' + token) : '' }
            });
            if (res.ok) {
                state.history = [];
                var win = document.getElementById('hvAiChatWindow');
                if (win) {
                    win.remove();
                    renderAiChatWindow();
                }
            }
        } catch(e) {
            alert('Lỗi xóa lịch sử: ' + e.message);
        }
    };

    // Voice & Image State Handlers
    window._hvAiOnImageSelected = function(inp) {
        if (!inp.files || !inp.files[0]) return;
        var file = inp.files[0];
        var reader = new FileReader();
        reader.onload = function(e) {
            var dataUrl = e.target.result;
            state.attachedImage = {
                data: dataUrl,
                mime_type: file.type || 'image/png',
                filename: file.name
            };

            var bar = document.getElementById('hvAiImgPreviewBar');
            var img = document.getElementById('hvAiPreviewImgThumb');
            var name = document.getElementById('hvAiPreviewImgName');
            if (bar && img && name) {
                img.src = dataUrl;
                name.textContent = file.name + ' (' + Math.round(file.size / 1024) + ' KB)';
                bar.style.display = 'flex';
            }
        };
        reader.readAsDataURL(file);
    };

    window._hvAiRemoveAttachedImage = function() {
        state.attachedImage = null;
        var bar = document.getElementById('hvAiImgPreviewBar');
        var inp = document.getElementById('hvAiFileInput');
        if (bar) bar.style.display = 'none';
        if (inp) inp.value = '';
    };

    window._hvAiToggleVoiceRecording = function() {
        if (state.isRecording) {
            window._hvAiStopVoiceRecording();
        } else {
            window._hvAiStartVoiceRecording();
        }
    };

    window._hvAiStartVoiceRecording = function() {
        var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói tự động. Vui lòng sử dụng Google Chrome, Microsoft Edge hoặc Safari mới nhất ạ!');
            return;
        }

        try {
            var rec = new SpeechRecognition();
            rec.lang = 'vi-VN';
            rec.continuous = true;
            rec.interimResults = true;

            var inp = document.getElementById('hvAiInput');
            var btn = document.getElementById('hvAiVoiceBtn');
            var voiceBar = document.getElementById('hvAiVoiceStatus');
            var voiceText = document.getElementById('hvAiVoiceText');

            var initialText = inp ? inp.value : '';

            rec.onstart = function() {
                state.isRecording = true;
                if (btn) btn.classList.add('recording');
                if (voiceBar) voiceBar.style.display = 'flex';
                if (voiceText) voiceText.textContent = '🎙️ Đang lắng nghe giọng nói... Hãy nói câu hỏi!';
            };

            rec.onresult = function(e) {
                var transcript = '';
                for (var i = e.resultIndex; i < e.results.length; i++) {
                    transcript += e.results[i][0].transcript;
                }
                if (inp) {
                    inp.value = (initialText ? (initialText + ' ') : '') + transcript;
                }
            };

            rec.onerror = function(err) {
                console.warn('Voice recognition error:', err);
                window._hvAiStopVoiceRecording();
            };

            rec.onend = function() {
                state.isRecording = false;
                if (btn) btn.classList.remove('recording');
                if (voiceBar) voiceBar.style.display = 'none';
            };

            state.voiceRecognition = rec;
            rec.start();
        } catch (e) {
            alert('Không thể kết nối Microphone: ' + e.message);
        }
    };

    window._hvAiStopVoiceRecording = function() {
        if (state.voiceRecognition) {
            try { state.voiceRecognition.stop(); } catch(e){}
            state.voiceRecognition = null;
        }
        state.isRecording = false;
        var btn = document.getElementById('hvAiVoiceBtn');
        var voiceBar = document.getElementById('hvAiVoiceStatus');
        if (btn) btn.classList.remove('recording');
        if (voiceBar) voiceBar.style.display = 'none';
    };

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
        var imgAttached = state.attachedImage;

        if (!inp || !body || state.isThinking) return;

        var userMsg = inp.value.trim();
        if (!userMsg && !imgAttached) return;

        // Reset state
        inp.value = '';
        if (state.isRecording) window._hvAiStopVoiceRecording();
        window._hvAiRemoveAttachedImage();

        // Render User Msg
        var userDiv = document.createElement('div');
        userDiv.className = 'hv-ai-msg user';

        var userInnerHtml = '';
        if (imgAttached) {
            userInnerHtml += `<img src="${imgAttached.data}" style="max-width:180px;max-height:140px;border-radius:10px;margin-bottom:6px;display:block;border:1px solid rgba(255,255,255,0.3)">`;
        }
        if (userMsg) {
            userInnerHtml += `<span>${userMsg.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`;
        } else {
            userInnerHtml += `<span>📷 [Ảnh gửi kèm - Phân tích Vision AI]</span>`;
        }
        userDiv.innerHTML = userInnerHtml;
        body.appendChild(userDiv);

        // Render Typing Msg
        var thinkDiv = document.createElement('div');
        thinkDiv.className = 'hv-ai-msg assistant';
        thinkDiv.id = 'hvAiThinking';
        thinkDiv.innerHTML = '<em>⏳ Trợ Lý AI đang suy nghĩ & phân tích hình ảnh/dữ liệu...</em>';
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
                    image_base64: imgAttached ? { data: imgAttached.data, mime_type: imgAttached.mime_type } : null,
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
                    var configBtnHtml = state.canConfig ? `<br><button class="hv-ai-rule-btn" style="background:#4338ca" onclick="window._hvAiOpenConfigModal()">⚙️ Cấu Hình API Key Ngay</button>` : '';
                    errDiv.innerHTML = `
                        <span style="color:#dc2626;font-weight:800">⚠️ Chưa cấu hình API Key!</span><br>
                        ${data.message}${configBtnHtml}
                    `;
                } else if (data.error === 'AI_DISABLED') {
                    errDiv.innerHTML = `<span style="color:#dc2626;font-weight:800">⚠️ Thông báo từ Ban Giám Đốc:</span><br>${data.message}`;
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
                speakText(replyText);
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

    function getVietnameseVoice() {
        if (!('speechSynthesis' in window)) return null;
        var voices = window.speechSynthesis.getVoices() || [];
        var viVoice = voices.find(function(v) {
            var lang = (v.lang || '').toLowerCase();
            var name = (v.name || '').toLowerCase();
            return lang.includes('vi') || name.includes('vietnam') || name.includes('hoaimy') || name.includes('namminh') || name.includes('tiếng việt');
        });
        return viVoice || null;
    }

    // Load voices eagerly for Web Speech API
    if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = function() {
            getVietnameseVoice();
        };
    }

    function speakText(text) {
        if (!state.ttsEnabled) return;
        try {
            var cleanText = text.replace(/<[^>]*>?/gm, '').replace(/\[\[.*?\]\]/g, '').trim();
            if (!cleanText) return;

            var viVoice = getVietnameseVoice();
            if (viVoice && ('speechSynthesis' in window)) {
                window.speechSynthesis.cancel();
                var utterance = new SpeechSynthesisUtterance(cleanText);
                utterance.voice = viVoice;
                utterance.lang = 'vi-VN';
                utterance.rate = 1.0;
                window.speechSynthesis.speak(utterance);
            } else {
                // High-quality Google Vietnamese Audio TTS Fallback for computers without vi-VN voice installed
                if (window._hvAiAudioTts) {
                    try { window._hvAiAudioTts.pause(); } catch(e){}
                }
                var shortText = cleanText.substring(0, 200);
                var ttsUrl = 'https://translate.google.com/translate_tts?ie=UTF-8&q=' + encodeURIComponent(shortText) + '&tl=vi&client=tw-ob';
                var audio = new Audio(ttsUrl);
                window._hvAiAudioTts = audio;
                audio.play().catch(function(err) {
                    console.warn('Audio TTS fallback playback prevented:', err);
                });
            }
        } catch(e) {
            console.warn('Speech synthesis error:', e);
        }
    }

    window._hvAiToggleVoiceSpeech = function() {
        state.ttsEnabled = !state.ttsEnabled;
        var btn = document.getElementById('hvAiTtsBtn');
        if (btn) {
            btn.style.color = state.ttsEnabled ? '#22c55e' : '#ffffff';
            btn.title = state.ttsEnabled ? 'Giọng đọc Tiếng Việt 2 Chiều: Đang BẬT 🔊' : 'Giọng đọc Tiếng Việt 2 Chiều: Đang TẮT 🔇';
        }
        if (state.ttsEnabled) {
            speakText('Đã bật giọng nói đàm thoại 2 chiều với Trợ lý AI.');
        } else {
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        }
    };

    window._hvAiExecuteAction = async function(actionType, target, label) {
        if (actionType === 'DOWNLOAD_REPORT') {
            var token = localStorage.getItem('token') || (document.cookie.match(/token=([^;]+)/) || [])[1];
            window.open('/api/ai-assistant/export-report?token=' + (token || ''), '_blank');
            var body = document.getElementById('hvAiBody');
            if (body) {
                var actMsgDiv = document.createElement('div');
                actMsgDiv.className = 'hv-ai-msg assistant';
                actMsgDiv.innerHTML = `<span style="color:#16a34a;font-weight:800">📥 Đã khởi chạy tải Báo cáo Executive Excel/CSV thành công!</span>`;
                body.appendChild(actMsgDiv);
                body.scrollTop = body.scrollHeight;
            }
            return;
        }
        try {
            var token = localStorage.getItem('token') || (document.cookie.match(/token=([^;]+)/) || [])[1];
            var res = await fetch('/api/ai-assistant/execute-action', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? ('Bearer ' + token) : ''
                },
                body: JSON.stringify({
                    action_type: actionType,
                    target: target
                })
            });

            var data = await res.json();
            var body = document.getElementById('hvAiBody');
            if (body) {
                var actMsgDiv = document.createElement('div');
                actMsgDiv.className = 'hv-ai-msg assistant';
                if (res.ok) {
                    actMsgDiv.innerHTML = `<span style="color:#16a34a;font-weight:800">${data.message || '⚡ Đã thực thi hành động 1-Click thành công!'}</span>`;
                } else {
                    actMsgDiv.innerHTML = `<span style="color:#dc2626;font-weight:800">⚠️ ${data.error || 'Lỗi thực thi'}</span>`;
                }
                body.appendChild(actMsgDiv);
                body.scrollTop = body.scrollHeight;
                speakText(data.message || 'Đã thực thi hành động thành công');
            }
        } catch(e) {
            alert('Lỗi thực thi hành động 1-Click: ' + e.message);
        }
    };

    function formatAiReply(text) {
        if (!text) return '';
        var formatted = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Clean up markdown headers ### Title -> <strong>Title</strong>
        formatted = formatted.replace(/^#{1,6}\s*(.*?)$/gm, '<strong style="display:block;font-size:14px;color:#1e1b4b;margin-top:10px;margin-bottom:4px;font-weight:900">$1</strong>');

        // Clean up markdown bullet items * text or - text -> • text
        formatted = formatted.replace(/^[\*\-]\s+/gm, '• ');

        // Bold **text** -> <strong>text</strong>
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#0f172a;font-weight:900">$1</strong>');

        // Italic *text* -> <em>text</em>
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Inline code `text`
        formatted = formatted.replace(/`([^`]+)`/g, '<code style="background:#e0e7ff;color:#3730a3;padding:2px 6px;border-radius:4px;font-size:12px;font-weight:700">$1</code>');

        // Replace 1-Click Actions [[ACTION:type|target|label]]
        formatted = formatted.replace(/\[\[ACTION:(.*?)\|(.*?)\|(.*?)\]\]/gi, function(match, type, target, label) {
            return `<br><button class="hv-ai-action-btn" onclick="window._hvAiExecuteAction('${type}', '${target}', '${label}')" style="background:#2563eb;color:#ffffff;border:none;padding:6px 14px;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer;margin-top:6px;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(37,99,235,0.25)">⚡ ${label}</button>`;
        });

        // Replace [OPEN_RULE:123] or [RULE:NQ-...] with interactive buttons
        formatted = formatted.replace(/\[OPEN_RULE:(\d+)\]/g, function(match, id) {
            return `<br><button class="hv-ai-rule-btn" onclick="if(window._nqOpenDetailModal) window._nqOpenDetailModal(${id})">👉 Mở Chi Tiết Điều Khoản Này</button>`;
        });

        formatted = formatted.replace(/\[SUGGEST_NEW_RULE:([^\]]+)\]/g, function(match, title) {
            return `<br><button class="hv-ai-rule-btn" style="background:#2563eb" onclick="if(window._nqOpenAddModal) window._nqOpenAddModal();">➕ Tạo Nhanh Điều Khoản Mới</button>`;
        });

        // Convert newlines to <br>
        formatted = formatted.replace(/\n/g, '<br>');

        return formatted;
    }

    // Modal Config API Key & Phân Quyền AI (DUY NHẤT GIÁM ĐỐC)
    window._hvAiOpenConfigModal = function() {
        if (!state.canConfig) {
            alert('Chỉ Ban Giám Đốc mới có quyền cấu hình API Key và Phân Quyền Trợ Lý AI!');
            return;
        }

        var existing = document.getElementById('hvAiConfigOverlay');
        if (existing) existing.remove();

        var pol = state.allowedRoles || 'all';

        var overlay = document.createElement('div');
        overlay.className = 'hv-ai-modal-overlay';
        overlay.id = 'hvAiConfigOverlay';
        overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

        overlay.innerHTML = `
            <div class="hv-ai-modal">
                <div class="hv-ai-modal-hdr">
                    <h3>⚙️ Cấu Hình API Key & Phân Quyền AI (Giám Đốc)</h3>
                    <button class="hv-ai-modal-close" onclick="document.getElementById('hvAiConfigOverlay').remove()">✕</button>
                </div>
                <div class="hv-ai-modal-body">
                    <div style="font-size:13px;color:#475569;line-height:1.5">
                        Nhập khóa <strong>Gemini API Key Miễn Phí</strong> tạo từ Google AI Studio (<a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:#4338ca;font-weight:700">aistudio.google.com</a>) và cài đặt nhóm người dùng được phép sử dụng Trợ Lý AI.
                    </div>
                    
                    <div style="display:flex;flex-direction:column;gap:6px">
                        <label style="font-size:13px;font-weight:800;color:#334155">🔑 Nhập Gemini API Key:</label>
                        <input type="password" id="hvAiApiKeyInput" class="hv-ai-input-field" placeholder="Dán mã AIzaSy... vào đây (Giữ nguyên nếu không đổi)">
                    </div>

                    <div style="display:flex;flex-direction:column;gap:6px;margin-top:10px">
                        <label style="font-size:13px;font-weight:800;color:#334155">👥 Phân Quyền Ai Được Phép Sử Dụng Trợ Lý AI HV:</label>
                        <div class="hv-ai-radio-group">
                            <label class="hv-ai-radio-lbl">
                                <input type="radio" name="hvAiPolicyRadio" value="all" ${pol === 'all' ? 'checked' : ''}>
                                <span>🌐 Cho phép Tất Cả Nhân Viên sử dụng Trợ Lý AI</span>
                            </label>
                            <label class="hv-ai-radio-lbl">
                                <input type="radio" name="hvAiPolicyRadio" value="exec_only" ${pol === 'exec_only' ? 'checked' : ''}>
                                <span>🔒 Chỉ Cho Phép Ban Giám Đốc, Lê Việt Trinh & Lê Công Thực</span>
                            </label>
                            <label class="hv-ai-radio-lbl">
                                <input type="radio" name="hvAiPolicyRadio" value="managers" ${pol === 'managers' ? 'checked' : ''}>
                                <span>👔 Cho Phép Ban Giám Đốc, Lê Việt Trinh, Lê Công Thực & Các Quản Lý</span>
                            </label>
                        </div>
                    </div>

                    <div id="hvAiConfigStatus" style="font-size:13px;font-weight:700"></div>
                </div>
                <div class="hv-ai-modal-ftr">
                    <button class="hv-ai-btn-cancel" onclick="document.getElementById('hvAiConfigOverlay').remove()">Hủy</button>
                    <button class="hv-ai-btn-save" onclick="window._hvAiSaveConfig()">💾 Lưu Cấu Hình</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
    };

    window._hvAiSaveConfig = async function() {
        var inp = document.getElementById('hvAiApiKeyInput');
        var st = document.getElementById('hvAiConfigStatus');
        var selectedRadio = document.querySelector('input[name="hvAiPolicyRadio"]:checked');
        var allowedRoles = selectedRadio ? selectedRadio.value : 'all';

        try {
            var token = localStorage.getItem('token') || (document.cookie.match(/token=([^;]+)/) || [])[1];
            var payload = { allowed_roles: allowedRoles };
            if (inp && inp.value.trim()) {
                payload.api_key = inp.value.trim();
            }

            var res = await fetch('/api/ai-assistant/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? ('Bearer ' + token) : ''
                },
                body: JSON.stringify(payload)
            });

            var data = await res.json();
            if (res.ok) {
                state.allowedRoles = allowedRoles;
                if (st) st.innerHTML = '<span style="color:#16a34a">✅ Đã lưu cấu hình API Key & Phân quyền AI thành công!</span>';
                setTimeout(function() {
                    var ov = document.getElementById('hvAiConfigOverlay');
                    if (ov) ov.remove();
                    window.location.reload();
                }, 1200);
            } else {
                if (st) st.innerHTML = `<span style="color:#dc2626">⚠️ ${data.error || 'Lỗi lưu cấu hình'}</span>`;
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
