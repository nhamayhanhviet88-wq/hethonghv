-- Hệ Thống Quản Trị Đồng Phục HV - PostgreSQL Schema

-- App config (generic key-value store)
CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tầng chiết khấu hoa hồng
CREATE TABLE IF NOT EXISTS commission_tiers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    percentage DOUBLE PRECISION NOT NULL DEFAULT 0,
    parent_percentage DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Nguồn khách hàng
CREATE TABLE IF NOT EXISTS settings_sources (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Khuyến mãi
CREATE TABLE IF NOT EXISTS settings_promotions (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Lĩnh vực
CREATE TABLE IF NOT EXISTS settings_industries (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Chức danh theo CRM
CREATE TABLE IF NOT EXISTS settings_job_titles (
    id SERIAL PRIMARY KEY,
    crm_type TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tài khoản người dùng (tất cả vai trò)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    role TEXT NOT NULL CHECK (role IN ('giam_doc', 'quan_ly', 'truong_phong', 'nhan_vien', 'hoa_hong', 'ctv', 'nuoi_duong', 'sinh_vien', 'ke_toan', 'nhan_su', 'thu_quy', 'thu_kho', 'pho_giam_doc', 'thu_ky', 'trinh', 'nhan_vien_parttime', 'tkaffiliate')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resigned', 'locked')),
    contract_info TEXT,
    start_date TEXT,
    id_card_front TEXT,
    id_card_back TEXT,
    telegram_group_id TEXT,
    commission_tier_id INTEGER REFERENCES commission_tiers(id) ON DELETE SET NULL,
    assigned_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    balance DOUBLE PRECISION DEFAULT 0,
    bank_name TEXT,
    bank_account TEXT,
    bank_holder TEXT,
    order_code_prefix TEXT,
    contract_file TEXT,
    rules_file TEXT,
    managed_by_user_id INTEGER REFERENCES users(id),
    source_customer_id INTEGER,
    province TEXT,
    source_crm_type TEXT,
    department_id INTEGER,
    birth_date TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- TEAM
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    leader_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Thành viên TEAM
CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(team_id, user_id)
);

-- Khách hàng
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    crm_type TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    birthday TEXT,
    appointment_date TEXT,
    source_id INTEGER REFERENCES settings_sources(id),
    promotion_id INTEGER REFERENCES settings_promotions(id),
    industry_id INTEGER REFERENCES settings_industries(id),
    receiver_id INTEGER REFERENCES users(id),
    assigned_to_id INTEGER REFERENCES users(id),
    referrer_id INTEGER REFERENCES users(id),
    referrer_customer_id INTEGER,
    handover_date TEXT DEFAULT CURRENT_DATE::TEXT,
    order_status TEXT DEFAULT 'dang_tu_van' CHECK (order_status IN (
        'dang_tu_van', 'bao_gia', 'gui_stk_coc', 'dat_coc', 'chot_don', 'sau_ban_hang', 'san_xuat', 'giao_hang', 'hoan_thanh', 'duyet_huy'
    )),
    notes TEXT,
    daily_order_number INTEGER DEFAULT 0,
    cancel_requested INTEGER DEFAULT 0,
    cancel_reason TEXT,
    cancel_requested_by INTEGER REFERENCES users(id),
    cancel_requested_at TEXT,
    cancel_approved INTEGER DEFAULT 0,
    cancel_approved_by INTEGER REFERENCES users(id),
    cancel_approved_at TEXT,
    created_by INTEGER REFERENCES users(id),
    job TEXT,
    customer_holidays TEXT,
    province TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Cơ cấu tổ chức (must exist before FK references)
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    parent_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    head_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add self-referencing FK after table creation
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'customers_referrer_customer_id_fkey') THEN
        ALTER TABLE customers ADD CONSTRAINT customers_referrer_customer_id_fkey FOREIGN KEY (referrer_customer_id) REFERENCES customers(id);
    END IF;
END $$;

-- Add deferred FKs after both tables exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_source_customer_id_fkey') THEN
        ALTER TABLE users ADD CONSTRAINT users_source_customer_id_fkey FOREIGN KEY (source_customer_id) REFERENCES customers(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_department_id_fkey') THEN
        ALTER TABLE users ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Chi tiết đơn hàng (nhiều dòng sản phẩm)
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    description TEXT,
    quantity INTEGER DEFAULT 0,
    unit_price DOUBLE PRECISION DEFAULT 0,
    total DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Mã đơn kinh doanh
CREATE TABLE IF NOT EXISTS order_codes (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    order_code TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    deposit_amount DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Bàn giao mạng xã hội
CREATE TABLE IF NOT EXISTS social_handovers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    account_name TEXT,
    acc TEXT,
    pass TEXT,
    two_fa TEXT,
    link TEXT,
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Bàn giao công cụ làm việc
CREATE TABLE IF NOT EXISTS tool_handovers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    handover_date TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Lịch sử tư vấn
CREATE TABLE IF NOT EXISTS consultation_logs (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    log_type TEXT NOT NULL CHECK (log_type IN (
        'goi_dien','nhan_tin','gap_truc_tiep','gui_bao_gia','gui_mau',
        'thiet_ke','bao_sua','dat_coc','chot_don','hoan_thanh','sau_ban_hang','huy','cap_cuu_sep','huy_coc','hoan_thanh_cap_cuu'
    )),
    content TEXT,
    image_path TEXT,
    logged_by INTEGER REFERENCES users(id),
    deposit_amount INTEGER DEFAULT 0,
    next_consult_type TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Cấp cứu sếp
CREATE TABLE IF NOT EXISTS emergencies (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    requested_by INTEGER NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
    resolved_by INTEGER REFERENCES users(id),
    resolved_note TEXT,
    handler_id INTEGER REFERENCES users(id),
    handover_to INTEGER REFERENCES users(id),
    handover_at TEXT,
    handover_status TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    assigned_at TIMESTAMP DEFAULT NOW(),
    resolved_at TEXT
);

-- Lịch sử rút tiền hoa hồng
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount DOUBLE PRECISION NOT NULL,
    bank_name TEXT,
    bank_account TEXT,
    bank_holder TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by INTEGER REFERENCES users(id),
    approved_at TEXT,
    reject_reason TEXT,
    transfer_image TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- (departments table already created above)

-- Phân quyền
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    target_type TEXT NOT NULL CHECK (target_type IN ('department','user')),
    target_id INTEGER NOT NULL,
    feature TEXT NOT NULL,
    can_view INTEGER DEFAULT 0,
    can_create INTEGER DEFAULT 0,
    can_edit INTEGER DEFAULT 0,
    can_delete INTEGER DEFAULT 0,
    UNIQUE(target_type, target_id, feature)
);

-- App config (key-value store for global settings)
CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Giải thưởng BXH Affiliate
CREATE TABLE IF NOT EXISTS leaderboard_prizes (
    id SERIAL PRIMARY KEY,
    board_key TEXT NOT NULL,
    month TEXT NOT NULL,
    top_rank INTEGER NOT NULL CHECK (top_rank BETWEEN 1 AND 10),
    prize_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    prize_description TEXT,
    conditions TEXT DEFAULT '',
    departments TEXT DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(board_key, month, top_rank)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_assigned_to ON users(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_crm ON customers(crm_type);
CREATE INDEX IF NOT EXISTS idx_customers_assigned ON customers(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_customers_receiver ON customers(receiver_id);
CREATE INDEX IF NOT EXISTS idx_customers_referrer ON customers(referrer_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(order_status);
CREATE INDEX IF NOT EXISTS idx_order_items_customer ON order_items(customer_id);
CREATE INDEX IF NOT EXISTS idx_emergencies_status ON emergencies(status);
CREATE INDEX IF NOT EXISTS idx_consultation_logs_customer ON consultation_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_consultation_logs_type ON consultation_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_customers_referrer_customer ON customers(referrer_customer_id);
CREATE INDEX IF NOT EXISTS idx_social_handovers_user ON social_handovers(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_handovers_user ON tool_handovers(user_id);

-- Multi-order support: add columns if not exist
ALTER TABLE order_codes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE order_codes ADD COLUMN IF NOT EXISTS deposit_amount DOUBLE PRECISION DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS order_code_id INTEGER REFERENCES order_codes(id);

-- Multi-level affiliate: add parent_percentage to commission_tiers
ALTER TABLE commission_tiers ADD COLUMN IF NOT EXISTS parent_percentage DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Prize conditions and departments
ALTER TABLE leaderboard_prizes ADD COLUMN IF NOT EXISTS conditions TEXT DEFAULT '';
ALTER TABLE leaderboard_prizes ADD COLUMN IF NOT EXISTS departments TEXT DEFAULT '[]';

-- Display order for departments
ALTER TABLE departments ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Trao giải thưởng
CREATE TABLE IF NOT EXISTS prize_awards (
    id SERIAL PRIMARY KEY,
    board_key TEXT NOT NULL,
    month TEXT NOT NULL,
    top_rank INTEGER NOT NULL,
    winner_type TEXT NOT NULL DEFAULT 'individual' CHECK (winner_type IN ('individual', 'team')),
    winner_user_id INTEGER REFERENCES users(id),
    winner_team_id INTEGER REFERENCES teams(id),
    winner_name TEXT NOT NULL,
    prize_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    prize_description TEXT DEFAULT '',
    photo_winner TEXT,
    photo_certificate TEXT,
    awarded_by INTEGER REFERENCES users(id),
    awarded_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(board_key, month, top_rank)
);

CREATE INDEX IF NOT EXISTS idx_prize_awards_month ON prize_awards(month);
CREATE INDEX IF NOT EXISTS idx_prize_awards_board ON prize_awards(board_key, month);

-- Comment chúc mừng giải thưởng
CREATE TABLE IF NOT EXISTS prize_award_comments (
    id SERIAL PRIMARY KEY,
    award_id INTEGER NOT NULL REFERENCES prize_awards(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    user_name TEXT NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pac_award ON prize_award_comments(award_id);

-- Tracking đã xem popup chúc mừng
CREATE TABLE IF NOT EXISTS prize_award_views (
    id SERIAL PRIMARY KEY,
    award_id INTEGER NOT NULL REFERENCES prize_awards(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    has_commented BOOLEAN DEFAULT false,
    viewed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(award_id, user_id)
);

-- Multi-period support: daily, weekly, monthly, quarterly
ALTER TABLE leaderboard_prizes ADD COLUMN IF NOT EXISTS period_type TEXT DEFAULT 'monthly';
ALTER TABLE prize_awards ADD COLUMN IF NOT EXISTS period_type TEXT DEFAULT 'monthly';

-- Update UNIQUE constraints to include period_type
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'leaderboard_prizes_board_key_month_top_rank_key') THEN
        ALTER TABLE leaderboard_prizes DROP CONSTRAINT leaderboard_prizes_board_key_month_top_rank_key;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'leaderboard_prizes_board_period_rank_key') THEN
        ALTER TABLE leaderboard_prizes ADD CONSTRAINT leaderboard_prizes_board_period_rank_key UNIQUE(board_key, period_type, month, top_rank);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'prize_awards_board_key_month_top_rank_key') THEN
        ALTER TABLE prize_awards DROP CONSTRAINT prize_awards_board_key_month_top_rank_key;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'prize_awards_board_period_rank_key') THEN
        ALTER TABLE prize_awards ADD CONSTRAINT prize_awards_board_period_rank_key UNIQUE(board_key, period_type, month, top_rank);
    END IF;
END $$;

-- Bàn giao công việc điểm (weekly task point templates)
CREATE TABLE IF NOT EXISTS task_point_templates (
    id SERIAL PRIMARY KEY,
    target_type TEXT NOT NULL CHECK (target_type IN ('team', 'individual')),
    target_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    task_name TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    min_quantity INTEGER NOT NULL DEFAULT 1,
    time_start TEXT NOT NULL,
    time_end TEXT NOT NULL,
    guide_url TEXT,
    requires_approval BOOLEAN DEFAULT false,
    week_only DATE DEFAULT NULL,
    sort_order INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_points_target ON task_point_templates(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_task_points_day ON task_point_templates(day_of_week);
CREATE INDEX IF NOT EXISTS idx_task_points_week ON task_point_templates(week_only);

-- Migration: add week_only + requires_approval columns
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_point_templates' AND column_name = 'week_only') THEN
        ALTER TABLE task_point_templates ADD COLUMN week_only DATE DEFAULT NULL;
        CREATE INDEX IF NOT EXISTS idx_task_points_week ON task_point_templates(week_only);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_point_templates' AND column_name = 'requires_approval') THEN
        ALTER TABLE task_point_templates ADD COLUMN requires_approval BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Ngày nghỉ lễ
CREATE TABLE IF NOT EXISTS holidays (
    id SERIAL PRIMARY KEY,
    holiday_date DATE NOT NULL UNIQUE,
    holiday_name TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(holiday_date);

-- Seed Vietnamese holidays for current year
INSERT INTO holidays (holiday_date, holiday_name) VALUES
    ('2026-01-01', 'Tết Dương lịch'),
    ('2026-01-27', 'Tết Nguyên đán (27 Tết)'),
    ('2026-01-28', 'Tết Nguyên đán (28 Tết)'),
    ('2026-01-29', 'Tết Nguyên đán (29 Tết)'),
    ('2026-01-30', 'Tết Nguyên đán (30 Tết)'),
    ('2026-01-31', 'Tết Nguyên đán (Mùng 1)'),
    ('2026-02-01', 'Tết Nguyên đán (Mùng 2)'),
    ('2026-02-02', 'Tết Nguyên đán (Mùng 3)'),
    ('2026-04-30', 'Giải phóng miền Nam'),
    ('2026-05-01', 'Quốc tế Lao động'),
    ('2026-09-02', 'Quốc khánh')
ON CONFLICT (holiday_date) DO NOTHING;

-- Add requires_approval flag to templates
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_point_templates' AND column_name = 'requires_approval') THEN
        ALTER TABLE task_point_templates ADD COLUMN requires_approval BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Báo cáo công việc điểm
CREATE TABLE IF NOT EXISTS task_point_reports (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES task_point_templates(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    report_date DATE NOT NULL,
    report_type TEXT NOT NULL CHECK (report_type IN ('link', 'image', 'both')),
    report_value TEXT,
    report_image TEXT,
    quantity INTEGER DEFAULT 0,
    content TEXT,
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    points_earned INTEGER DEFAULT 0,
    approved_by INTEGER REFERENCES users(id),
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(template_id, user_id, report_date)
);
CREATE INDEX IF NOT EXISTS idx_reports_user_date ON task_point_reports(user_id, report_date);
CREATE INDEX IF NOT EXISTS idx_reports_status ON task_point_reports(status);

-- Daily task snapshots: freeze tasks for past days
CREATE TABLE IF NOT EXISTS daily_task_snapshots (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    snapshot_date DATE NOT NULL,
    template_id INTEGER REFERENCES task_point_templates(id) ON DELETE SET NULL,
    day_of_week INTEGER NOT NULL,
    task_name TEXT NOT NULL,
    points INTEGER DEFAULT 0,
    min_quantity INTEGER DEFAULT 1,
    time_start TEXT NOT NULL,
    time_end TEXT NOT NULL,
    guide_url TEXT,
    requires_approval BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, snapshot_date, template_id)
);
CREATE INDEX IF NOT EXISTS idx_snapshots_user_date ON daily_task_snapshots(user_id, snapshot_date);

-- Kho Công Việc (Task Library)
CREATE TABLE IF NOT EXISTS task_library (
    id SERIAL PRIMARY KEY,
    task_name TEXT NOT NULL,
    points INTEGER DEFAULT 0,
    min_quantity INTEGER DEFAULT 1,
    guide_url TEXT,
    requires_approval BOOLEAN DEFAULT false,
    department_id INTEGER REFERENCES departments(id),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Allow Sunday (day_of_week = 7) in task templates
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name LIKE '%day_of_week%' AND check_clause LIKE '%1 AND 6%') THEN
        ALTER TABLE task_point_templates DROP CONSTRAINT IF EXISTS task_point_templates_day_of_week_check;
        ALTER TABLE task_point_templates ADD CONSTRAINT task_point_templates_day_of_week_check CHECK (day_of_week BETWEEN 1 AND 7);
    END IF;
END $$;

-- Phân quyền duyệt công việc (ai duyệt cho phòng nào)
CREATE TABLE IF NOT EXISTS task_approvers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, department_id)
);
CREATE INDEX IF NOT EXISTS idx_task_approvers_user ON task_approvers(user_id);
CREATE INDEX IF NOT EXISTS idx_task_approvers_dept ON task_approvers(department_id);

-- Add reject/redo columns to task_point_reports
ALTER TABLE task_point_reports ADD COLUMN IF NOT EXISTS reject_reason TEXT;
ALTER TABLE task_point_reports ADD COLUMN IF NOT EXISTS redo_count INTEGER DEFAULT 0;
ALTER TABLE task_point_reports ADD COLUMN IF NOT EXISTS redo_deadline TIMESTAMP;
ALTER TABLE task_point_reports ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;

-- Default redo limit config
INSERT INTO app_config (key, value) VALUES ('task_redo_max', '1')
ON CONFLICT (key) DO NOTHING;

-- ========== SẾP HỖ TRỢ (Manager Support Requests) ==========
CREATE TABLE IF NOT EXISTS task_support_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    template_id INTEGER NOT NULL REFERENCES task_point_templates(id),
    task_name TEXT NOT NULL,
    task_date DATE NOT NULL,
    deadline DATE NOT NULL,
    manager_id INTEGER REFERENCES users(id),
    department_id INTEGER REFERENCES departments(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'supported', 'expired')),
    manager_note TEXT,
    supported_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, template_id, task_date)
);

-- Penalty columns on support requests
ALTER TABLE task_support_requests ADD COLUMN IF NOT EXISTS penalty_amount INTEGER DEFAULT 0;
ALTER TABLE task_support_requests ADD COLUMN IF NOT EXISTS penalty_reason TEXT;
ALTER TABLE task_support_requests ADD COLUMN IF NOT EXISTS acknowledged BOOLEAN DEFAULT false;
ALTER TABLE task_support_requests ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP;

-- ========== PENALTY CONFIG (mức phạt cho từng CV) ==========
CREATE TABLE IF NOT EXISTS task_penalty_config (
    id SERIAL PRIMARY KEY,
    task_name TEXT NOT NULL UNIQUE,
    template_id INTEGER REFERENCES task_point_templates(id),
    penalty_amount INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ========== LEAVE REQUESTS (Xin nghỉ NV) ==========
CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    department_id INTEGER REFERENCES departments(id),
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    first_day_session TEXT DEFAULT 'full' CHECK (first_day_session IN ('full','morning','afternoon')),
    last_day_session TEXT DEFAULT 'full' CHECK (last_day_session IN ('full','morning','afternoon')),
    total_days NUMERIC(4,1) NOT NULL,
    reason TEXT NOT NULL,
    handover_user_id INTEGER REFERENCES users(id),
    proof_image TEXT NOT NULL,
    telegram_sent BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active' CHECK (status IN ('active','cancelled')),
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========== DEADLINE & AUTO-LOCK ==========
-- Deadline chính xác cho pending reports (quản lý cần duyệt trước thời điểm này)
ALTER TABLE task_point_reports ADD COLUMN IF NOT EXISTS approval_deadline TIMESTAMP;

-- Deadline chính xác (timestamp) cho support requests
ALTER TABLE task_support_requests ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMP;

-- Người chịu trách nhiệm trong penalty config
ALTER TABLE task_penalty_config ADD COLUMN IF NOT EXISTS responsible_role TEXT DEFAULT 'quan_ly';

-- Ngày lễ (GĐ cấu hình)
CREATE TABLE IF NOT EXISTS holidays (
    id SERIAL PRIMARY KEY,
    holiday_date DATE NOT NULL UNIQUE,
    holiday_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Default Vietnam holidays 2026
INSERT INTO holidays (holiday_date, holiday_name) VALUES
('2026-01-01', 'Tết Dương lịch'),
('2026-01-28', 'Tết Nguyên đán'),
('2026-01-29', 'Tết Nguyên đán'),
('2026-01-30', 'Tết Nguyên đán'),
('2026-01-31', 'Tết Nguyên đán'),
('2026-02-01', 'Tết Nguyên đán'),
('2026-04-30', 'Giải phóng miền Nam'),
('2026-05-01', 'Quốc tế Lao động'),
('2026-09-02', 'Quốc khánh')
ON CONFLICT DO NOTHING;

-- ========== DEPT PENALTY CONFIG (mức phạt theo phòng ban) ==========
CREATE TABLE IF NOT EXISTS dept_penalty_config (
    id SERIAL PRIMARY KEY,
    department_id INTEGER NOT NULL UNIQUE REFERENCES departments(id),
    penalty_amount INTEGER NOT NULL DEFAULT 50000,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ========== BÀN GIAO CV KHÓA ==========
-- Định nghĩa công việc khóa (QL/GĐ tạo)
CREATE TABLE IF NOT EXISTS lock_tasks (
    id SERIAL PRIMARY KEY,
    task_name TEXT NOT NULL,
    task_content TEXT,
    guide_link TEXT,
    input_requirements TEXT,
    output_requirements TEXT,
    recurrence_type TEXT NOT NULL DEFAULT 'administrative' CHECK (recurrence_type IN ('weekly','monthly','once','administrative','daily')),
    recurrence_value TEXT,
    requires_approval BOOLEAN DEFAULT false,
    max_redo_count INTEGER DEFAULT 3,
    penalty_amount INTEGER DEFAULT 50000,
    created_by INTEGER REFERENCES users(id),
    department_id INTEGER REFERENCES departments(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Gán CV khóa cho NV cụ thể
CREATE TABLE IF NOT EXISTS lock_task_assignments (
    id SERIAL PRIMARY KEY,
    lock_task_id INTEGER NOT NULL REFERENCES lock_tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    assigned_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(lock_task_id, user_id)
);

-- NV nộp bài / hoàn thành hàng ngày (lưu lịch sử nhiều lần nộp)
CREATE TABLE IF NOT EXISTS lock_task_completions (
    id SERIAL PRIMARY KEY,
    lock_task_id INTEGER NOT NULL REFERENCES lock_tasks(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    completion_date DATE NOT NULL,
    redo_count INTEGER DEFAULT 0,
    proof_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    reject_reason TEXT,
    redo_deadline TIMESTAMP,
    penalty_amount INTEGER DEFAULT 0,
    penalty_applied BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(lock_task_id, user_id, completion_date, redo_count)
);

-- Migration: add new columns if table already exists
ALTER TABLE lock_tasks ADD COLUMN IF NOT EXISTS max_redo_count INTEGER DEFAULT 3;
ALTER TABLE lock_task_completions ADD COLUMN IF NOT EXISTS redo_count INTEGER DEFAULT 0;
ALTER TABLE lock_task_completions ADD COLUMN IF NOT EXISTS redo_deadline TIMESTAMP;
ALTER TABLE lock_task_completions ADD COLUMN IF NOT EXISTS acknowledged BOOLEAN DEFAULT false;

-- Drop old unique constraint and add new one (safe migration)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lock_task_completions_lock_task_id_user_id_completion_date_key') THEN
        ALTER TABLE lock_task_completions DROP CONSTRAINT lock_task_completions_lock_task_id_user_id_completion_date_key;
    END IF;
    -- Add new constraint with redo_count
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lock_task_completions_task_user_date_redo_key') THEN
        ALTER TABLE lock_task_completions ADD CONSTRAINT lock_task_completions_task_user_date_redo_key UNIQUE(lock_task_id, user_id, completion_date, redo_count);
    END IF;
END $$;

-- Add source_type to task_support_requests (diem/khoa)
ALTER TABLE task_support_requests ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'diem';
-- Make template_id nullable for CV Khóa support requests
ALTER TABLE task_support_requests ALTER COLUMN template_id DROP NOT NULL;
-- Add lock_task_id column for CV Khóa references
ALTER TABLE task_support_requests ADD COLUMN IF NOT EXISTS lock_task_id INTEGER REFERENCES lock_tasks(id);

-- Add max_redo_count to task_point_templates (CV Điểm)
ALTER TABLE task_point_templates ADD COLUMN IF NOT EXISTS max_redo_count INTEGER DEFAULT 3;

-- Add updated_at to lock_task_completions (for tracking stacking penalties)
ALTER TABLE lock_task_completions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
-- Add content column for report text
ALTER TABLE lock_task_completions ADD COLUMN IF NOT EXISTS content TEXT;

-- Add 'resolved' status to task_support_requests
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_support_requests_status_check') THEN
        ALTER TABLE task_support_requests DROP CONSTRAINT task_support_requests_status_check;
    END IF;
    ALTER TABLE task_support_requests ADD CONSTRAINT task_support_requests_status_check
        CHECK (status IN ('pending', 'supported', 'expired', 'resolved'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ========== CV ĐIỂM: Multi-row redo history (like CV Khóa) ==========
-- Change unique constraint: (template_id, user_id, report_date) → (template_id, user_id, report_date, redo_count)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_point_reports_template_id_user_id_report_date_key') THEN
        ALTER TABLE task_point_reports DROP CONSTRAINT task_point_reports_template_id_user_id_report_date_key;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_point_reports_template_user_date_redo_key') THEN
        ALTER TABLE task_point_reports ADD CONSTRAINT task_point_reports_template_user_date_redo_key
            UNIQUE(template_id, user_id, report_date, redo_count);
    END IF;
END $$;

-- Add 'expired' to task_point_reports status check
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_point_reports_status_check') THEN
        ALTER TABLE task_point_reports DROP CONSTRAINT task_point_reports_status_check;
    END IF;
    ALTER TABLE task_point_reports ADD CONSTRAINT task_point_reports_status_check
        CHECK (status IN ('pending', 'approved', 'rejected', 'expired'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add input/output requirements to CV Điểm templates (matching CV Khóa)
ALTER TABLE task_point_templates ADD COLUMN IF NOT EXISTS input_requirements TEXT;
ALTER TABLE task_point_templates ADD COLUMN IF NOT EXISTS output_requirements TEXT;

-- ========== CV KHÓA: Quantity tracking ==========
ALTER TABLE lock_tasks ADD COLUMN IF NOT EXISTS min_quantity INTEGER DEFAULT 1;
ALTER TABLE lock_task_completions ADD COLUMN IF NOT EXISTS quantity_done INTEGER DEFAULT 0;
