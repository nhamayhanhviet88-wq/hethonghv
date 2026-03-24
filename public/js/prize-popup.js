// ========== PRIZE CELEBRATION POPUP ==========
// Polling system that shows celebration popups for awarded prizes

var _prizePopupInterval = null;
var _prizePopupShowing = false;

function initPrizePopupSystem() {
    // Start polling every 30 seconds
    _checkPrizePopup();
    _prizePopupInterval = setInterval(_checkPrizePopup, 30000);
}

async function _checkPrizePopup() {
    if (_prizePopupShowing) return; // Don't check if popup is already showing
    try {
        var res = await apiCall('/api/affiliate/awards/popup');
        if (res.popup) {
            _showPrizePopup(res.popup);
        }
    } catch(e) { /* silent */ }
}

function _showPrizePopup(award) {
    _prizePopupShowing = true;

    // Mark as viewed
    apiCall('/api/affiliate/awards/' + award.id + '/view', 'POST').catch(function(){});

    var existingOverlay = document.getElementById('prizeCelebrationOverlay');
    if (existingOverlay) existingOverlay.remove();

    var overlay = document.createElement('div');
    overlay.id = 'prizeCelebrationOverlay';
    overlay.innerHTML = '\
        <style>\
            #prizeCelebrationOverlay { position:fixed; top:0; left:0; right:0; bottom:0; z-index:99999; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.7); backdrop-filter:blur(5px); animation:pcFadeIn .5s; }\
            @keyframes pcFadeIn { from{opacity:0} to{opacity:1} }\
            .pc-container { background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460); border-radius:24px; max-width:480px; width:95%; max-height:92vh; overflow-y:auto; overflow-x:hidden; position:relative; color:white; box-shadow:0 25px 80px rgba(0,0,0,.5); animation:pcSlideUp .6s cubic-bezier(.34,1.56,.64,1); }\
            @keyframes pcSlideUp { from{transform:translateY(60px) scale(.9);opacity:0} to{transform:translateY(0) scale(1);opacity:1} }\
            .pc-confetti { position:absolute; top:0; left:0; right:0; height:200px; overflow:hidden; pointer-events:none; }\
            .pc-confetti span { position:absolute; width:8px; height:8px; border-radius:2px; animation:pcFall linear infinite; opacity:.8; }\
            @keyframes pcFall { 0%{transform:translateY(-20px) rotate(0deg)} 100%{transform:translateY(200px) rotate(720deg)} }\
            .pc-photo { width:100%; height:280px; object-fit:cover; border-radius:24px 24px 0 0; }\
            .pc-badge { position:absolute; top:20px; right:20px; background:linear-gradient(135deg,#fbbf24,#f59e0b); color:#1a1a2e; padding:6px 14px; border-radius:20px; font-weight:900; font-size:13px; box-shadow:0 4px 15px rgba(245,158,11,.4); }\
            .pc-content { padding:20px 24px; text-align:center; }\
            .pc-trophy { font-size:50px; margin-bottom:8px; animation:pcBounce 1s infinite; }\
            @keyframes pcBounce { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }\
            .pc-title { font-size:14px; text-transform:uppercase; letter-spacing:2px; color:#fbbf24; font-weight:700; margin-bottom:4px; }\
            .pc-winner-name { font-size:26px; font-weight:900; margin:8px 0; background:linear-gradient(90deg,#fbbf24,#fff,#fbbf24); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; background-size:200% 100%; animation:pcShimmer 2s ease-in-out infinite; }\
            @keyframes pcShimmer { 0%{background-position:100% 0} 100%{background-position:-100% 0} }\
            .pc-prize-info { font-size:13px; opacity:.7; margin:4px 0; }\
            .pc-amount { font-size:22px; font-weight:900; color:#fbbf24; margin:8px 0; }\
            .pc-congrats-section { margin-top:16px; padding-top:16px; border-top:1px solid rgba(255,255,255,.1); }\
            .pc-emoji-bar { display:flex; gap:6px; justify-content:center; flex-wrap:wrap; margin-bottom:12px; }\
            .pc-emoji-btn { background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.15); border-radius:10px; padding:6px 10px; font-size:18px; cursor:pointer; transition:all .2s; }\
            .pc-emoji-btn:hover { background:rgba(255,255,255,.2); transform:scale(1.15); }\
            .pc-comment-input { display:flex; gap:6px; margin-bottom:12px; }\
            .pc-comment-input input { flex:1; background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.2); border-radius:10px; padding:8px 12px; color:white; font-size:13px; outline:none; }\
            .pc-comment-input input::placeholder { color:rgba(255,255,255,.4); }\
            .pc-comment-input button { background:linear-gradient(135deg,#22c55e,#16a34a); border:none; border-radius:10px; padding:8px 14px; color:white; font-weight:700; font-size:12px; cursor:pointer; white-space:nowrap; }\
            .pc-comments-list { max-height:150px; overflow-y:auto; text-align:left; }\
            .pc-comment-item { padding:6px 0; border-bottom:1px solid rgba(255,255,255,.05); font-size:12px; }\
            .pc-comment-name { font-weight:700; color:#fbbf24; }\
            .pc-comment-text { color:rgba(255,255,255,.8); }\
            .pc-close-btn { position:absolute; top:14px; left:14px; background:rgba(0,0,0,.4); border:none; color:white; width:32px; height:32px; border-radius:50%; font-size:16px; cursor:pointer; z-index:2; backdrop-filter:blur(10px); }\
            .pc-close-btn:hover { background:rgba(0,0,0,.6); }\
        </style>\
        <div class="pc-container">\
            <div class="pc-confetti" id="pcConfetti"></div>\
            <button class="pc-close-btn" onclick="closePrizePopup()">✕</button>\
            <img class="pc-photo" src="' + (award.photo_winner || '') + '" alt="Winner" onerror="this.style.height=\'120px\';this.style.background=\'linear-gradient(135deg,#0f3460,#1a1a2e)\'">\
            <div class="pc-badge">' + _pcGetMedal(award.top_rank) + ' TOP ' + award.top_rank + '</div>\
            <div class="pc-content">\
                <div class="pc-trophy">🏆</div>\
                <div class="pc-title">🎉 Chúc Mừng Người Nhận Giải 🎉</div>\
                <div class="pc-winner-name">' + award.winner_name + '</div>\
                <div class="pc-prize-info">' + (award.prize_description || '') + '</div>\
                <div class="pc-amount">' + _pcFmt(award.prize_amount) + ' VNĐ</div>\
                <div class="pc-prize-info" style="opacity:.5;">Hãy cùng gửi lời chúc mừng nồng nhiệt! 👏</div>\
                <div class="pc-congrats-section">\
                    <div class="pc-emoji-bar">\
                        <button class="pc-emoji-btn" onclick="_pcAddEmoji(\'👏\')">👏</button>\
                        <button class="pc-emoji-btn" onclick="_pcAddEmoji(\'🎉\')">🎉</button>\
                        <button class="pc-emoji-btn" onclick="_pcAddEmoji(\'❤️\')">❤️</button>\
                        <button class="pc-emoji-btn" onclick="_pcAddEmoji(\'🔥\')">🔥</button>\
                        <button class="pc-emoji-btn" onclick="_pcAddEmoji(\'💪\')">💪</button>\
                        <button class="pc-emoji-btn" onclick="_pcAddEmoji(\'⭐\')">⭐</button>\
                        <button class="pc-emoji-btn" onclick="_pcAddEmoji(\'🥳\')">🥳</button>\
                        <button class="pc-emoji-btn" onclick="_pcAddEmoji(\'👑\')">👑</button>\
                    </div>\
                    <div class="pc-comment-input">\
                        <input type="text" id="pcCommentInput" placeholder="Viết lời chúc mừng..." maxlength="200" onkeydown="if(event.key===\'Enter\'){event.preventDefault();submitPrizeComment(' + award.id + ')}">\
                        <button onclick="submitPrizeComment(' + award.id + ')">🎉 Gửi</button>\
                    </div>\
                    <div class="pc-comments-list" id="pcCommentsList"></div>\
                </div>\
            </div>\
        </div>\
    ';

    document.body.appendChild(overlay);

    // Click outside popup to close
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay || e.target === overlay.firstElementChild) closePrizePopup();
    });
    overlay.querySelector('.pc-container').addEventListener('click', function(e) { e.stopPropagation(); });

    // Generate confetti
    _pcGenerateConfetti();

    // Render existing comments
    _pcRenderComments(award.comments || []);
}

function _pcGetMedal(rank) {
    return ['🥇','🥈','🥉'][rank - 1] || '🏅';
}

function _pcFmt(n) {
    return n ? Number(n).toLocaleString('vi-VN') : '0';
}

function _pcGenerateConfetti() {
    var container = document.getElementById('pcConfetti');
    if (!container) return;
    var colors = ['#fbbf24','#ef4444','#22c55e','#3b82f6','#a855f7','#ec4899','#f97316'];
    for (var i = 0; i < 40; i++) {
        var span = document.createElement('span');
        span.style.left = Math.random() * 100 + '%';
        span.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        span.style.animationDuration = (1.5 + Math.random() * 2) + 's';
        span.style.animationDelay = Math.random() * 2 + 's';
        span.style.width = (5 + Math.random() * 8) + 'px';
        span.style.height = (5 + Math.random() * 8) + 'px';
        container.appendChild(span);
    }
}

function _pcAddEmoji(emoji) {
    var input = document.getElementById('pcCommentInput');
    if (input) input.value += emoji;
}

function _pcRenderComments(comments) {
    var el = document.getElementById('pcCommentsList');
    if (!el) return;
    if (comments.length === 0) {
        el.innerHTML = '<div style="text-align:center;opacity:.4;font-size:11px;padding:10px;">Chưa có lời chúc mừng nào — Hãy là người đầu tiên! 🎉</div>';
        return;
    }
    el.innerHTML = comments.map(function(c) {
        return '<div class="pc-comment-item"><span class="pc-comment-name">' + c.user_name + ':</span> <span class="pc-comment-text">' + c.comment_text + '</span></div>';
    }).join('');
    el.scrollTop = el.scrollHeight;
}

async function submitPrizeComment(awardId) {
    var input = document.getElementById('pcCommentInput');
    var text = input ? input.value.trim() : '';
    if (!text) { return; }

    try {
        var res = await apiCall('/api/affiliate/awards/' + awardId + '/comment', 'POST', { comment_text: text });
        if (res.success) {
            input.value = '';
            // Reload comments
            var cRes = await apiCall('/api/affiliate/awards/' + awardId + '/comments');
            _pcRenderComments(cRes.comments || []);
            if (typeof showToast === 'function') showToast('🎉 Đã gửi lời chúc mừng!');
        }
    } catch(e) {}
}

function closePrizePopup() {
    var overlay = document.getElementById('prizeCelebrationOverlay');
    if (overlay) {
        overlay.style.animation = 'pcFadeIn .3s reverse';
        setTimeout(function() { overlay.remove(); }, 300);
    }
    _prizePopupShowing = false;
}

// Preview popup with mock/real data
async function previewPrizePopup() {
    // Try to get a real award first
    var now = new Date();
    var month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    try {
        var res = await apiCall('/api/affiliate/awards?month=' + month);
        if (res.awards && res.awards.length > 0) {
            var award = res.awards[0];
            var cRes = await apiCall('/api/affiliate/awards/' + award.id + '/comments');
            award.comments = cRes.comments || [];
            _showPrizePopup(award);
            return;
        }
    } catch(e) {}

    // Fallback: mock data
    _showPrizePopup({
        id: 0,
        winner_name: 'Nguyễn Văn A',
        top_rank: 1,
        prize_amount: 5000000,
        prize_description: 'Nhân Viên Doanh Số Affiliate Cao Nhất',
        photo_winner: '',
        photo_certificate: '',
        board_key: 'demo',
        comments: [
            { user_name: 'Trần B', comment_text: 'Chúc mừng anh! 🎉🔥' },
            { user_name: 'Lê C', comment_text: 'Xứng đáng lắm! 👏👏' }
        ]
    });
}

