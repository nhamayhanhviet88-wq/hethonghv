// ========== BẢNG XẾP HẠNG KHỐI VĂN PHÒNG ==========
function renderBangXepHangVanPhongPage(container) {
    renderBxhPlaceholderPage(container, {
        title: 'Bảng Xếp Hạng Khối Văn Phòng',
        icon: '🏢',
        boards: [
            { key: 'vp_board1', name: 'Hạng mục 1', subtitle: 'Chưa thiết lập', icon: '🏆', color: '#e65100' },
            { key: 'vp_board2', name: 'Hạng mục 2', subtitle: 'Chưa thiết lập', icon: '👑', color: '#1565c0' },
            { key: 'vp_board3', name: 'Hạng mục 3', subtitle: 'Chưa thiết lập', icon: '🎯', color: '#2e7d32' },
            { key: 'vp_board4', name: 'Hạng mục 4', subtitle: 'Chưa thiết lập', icon: '⚡', color: '#6a1b9a' },
            { key: 'vp_board5', name: 'Hạng mục 5', subtitle: 'Chưa thiết lập', icon: '🔥', color: '#c62828' },
            { key: 'vp_board6', name: 'Hạng mục 6', subtitle: 'Chưa thiết lập', icon: '🧲', color: '#00838f' },
        ]
    });
}
