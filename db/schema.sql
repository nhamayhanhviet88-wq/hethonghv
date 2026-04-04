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
    role TEXT NOT NULL,
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

-- ========== CÔNG VIỆC CHUỖI (Chain Tasks) ==========

-- 1. Kho mẫu chuỗi (Giám đốc tạo, theo phòng ban)
CREATE TABLE IF NOT EXISTS chain_task_templates (
    id SERIAL PRIMARY KEY,
    chain_name TEXT NOT NULL,
    description TEXT,
    execution_mode TEXT DEFAULT 'sequential' CHECK (execution_mode IN ('sequential','parallel')),
    department_id INTEGER REFERENCES departments(id),
    created_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
-- Migration: add department_id if missing
DO $$ BEGIN
    ALTER TABLE chain_task_templates ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id);
    -- Assign existing templates to first non-system dept (PHÒNG KINH DOANH)
    UPDATE chain_task_templates SET department_id = (
        SELECT id FROM departments WHERE name ILIKE '%kinh doanh%' AND parent_id IS NOT NULL LIMIT 1
    ) WHERE department_id IS NULL;
END $$;

-- 2. Task con mẫu trong kho
CREATE TABLE IF NOT EXISTS chain_task_template_items (
    id SERIAL PRIMARY KEY,
    chain_template_id INTEGER NOT NULL REFERENCES chain_task_templates(id) ON DELETE CASCADE,
    item_order INTEGER NOT NULL,
    task_name TEXT NOT NULL,
    task_content TEXT,
    guide_link TEXT,
    input_requirements TEXT,
    output_requirements TEXT,
    requires_approval BOOLEAN DEFAULT false,
    requires_report BOOLEAN DEFAULT true,
    min_quantity INTEGER DEFAULT 1,
    max_redo_count INTEGER DEFAULT 3,
    relative_days INTEGER DEFAULT 0,
    deadline DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Instance: khi triển khai chuỗi cho phòng ban
CREATE TABLE IF NOT EXISTS chain_task_instances (
    id SERIAL PRIMARY KEY,
    chain_template_id INTEGER REFERENCES chain_task_templates(id),
    chain_name TEXT NOT NULL,
    execution_mode TEXT DEFAULT 'sequential',
    department_id INTEGER REFERENCES departments(id),
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','cancelled')),
    penalty_amount INTEGER DEFAULT 50000,
    chain_penalty_amount INTEGER DEFAULT 100000,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Task con thực tế (đã triển khai)
CREATE TABLE IF NOT EXISTS chain_task_instance_items (
    id SERIAL PRIMARY KEY,
    chain_instance_id INTEGER NOT NULL REFERENCES chain_task_instances(id) ON DELETE CASCADE,
    template_item_id INTEGER REFERENCES chain_task_template_items(id),
    item_order INTEGER NOT NULL,
    task_name TEXT NOT NULL,
    task_content TEXT,
    guide_link TEXT,
    input_requirements TEXT,
    output_requirements TEXT,
    requires_approval BOOLEAN DEFAULT false,
    requires_report BOOLEAN DEFAULT true,
    min_quantity INTEGER DEFAULT 1,
    max_redo_count INTEGER DEFAULT 3,
    deadline DATE NOT NULL,
    deadline_time TIME,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','overdue')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Gán người cho task con
CREATE TABLE IF NOT EXISTS chain_task_assignments (
    id SERIAL PRIMARY KEY,
    chain_item_id INTEGER NOT NULL REFERENCES chain_task_instance_items(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    assigned_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(chain_item_id, user_id)
);

-- 6. Báo cáo / hoàn thành task con
CREATE TABLE IF NOT EXISTS chain_task_completions (
    id SERIAL PRIMARY KEY,
    chain_item_id INTEGER NOT NULL REFERENCES chain_task_instance_items(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    proof_url TEXT,
    content TEXT,
    quantity_done INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    reject_reason TEXT,
    redo_count INTEGER DEFAULT 0,
    approval_deadline TIMESTAMP,
    redo_deadline TIMESTAMP,
    penalty_amount INTEGER DEFAULT 0,
    penalty_applied BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Lịch sử lùi lịch
CREATE TABLE IF NOT EXISTS chain_task_postponements (
    id SERIAL PRIMARY KEY,
    chain_instance_id INTEGER REFERENCES chain_task_instances(id),
    chain_item_id INTEGER REFERENCES chain_task_instance_items(id),
    old_deadline DATE NOT NULL,
    new_deadline DATE NOT NULL,
    reason TEXT,
    cascade_applied BOOLEAN DEFAULT false,
    postponed_by INTEGER REFERENCES users(id),
    postponed_for INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Migration: chain task approval deadline columns
ALTER TABLE chain_task_template_items ADD COLUMN IF NOT EXISTS max_redo_count INTEGER DEFAULT 3;
ALTER TABLE chain_task_instance_items ADD COLUMN IF NOT EXISTS max_redo_count INTEGER DEFAULT 3;
ALTER TABLE chain_task_completions ADD COLUMN IF NOT EXISTS approval_deadline TIMESTAMP;
ALTER TABLE chain_task_completions ADD COLUMN IF NOT EXISTS redo_deadline TIMESTAMP;
ALTER TABLE chain_task_completions ADD COLUMN IF NOT EXISTS acknowledged BOOLEAN DEFAULT false;

-- Per-item penalty amount (mức phạt riêng cho mỗi task con)
ALTER TABLE chain_task_template_items ADD COLUMN IF NOT EXISTS penalty_amount INTEGER DEFAULT 0;
ALTER TABLE chain_task_instance_items ADD COLUMN IF NOT EXISTS penalty_amount INTEGER DEFAULT 0;

-- Emergency penalty tracking
ALTER TABLE emergencies ADD COLUMN IF NOT EXISTS penalty_amount INTEGER DEFAULT 0;
ALTER TABLE emergencies ADD COLUMN IF NOT EXISTS penalty_applied BOOLEAN DEFAULT false;
ALTER TABLE emergencies ADD COLUMN IF NOT EXISTS acknowledged BOOLEAN DEFAULT false;
ALTER TABLE emergencies ADD COLUMN IF NOT EXISTS last_penalty_at TIMESTAMP;

-- Emergency penalty config per department
ALTER TABLE dept_penalty_config ADD COLUMN IF NOT EXISTS emergency_penalty_amount INTEGER DEFAULT 50000;

-- Customer unhandled penalty config per department
ALTER TABLE dept_penalty_config ADD COLUMN IF NOT EXISTS customer_penalty_amount INTEGER DEFAULT 100000;

-- Bảng lưu kết quả phạt KH chưa xử lý hôm nay
CREATE TABLE IF NOT EXISTS customer_penalty_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    penalty_date DATE NOT NULL,
    crm_type TEXT NOT NULL,
    unhandled_count INTEGER DEFAULT 0,
    penalty_amount INTEGER NOT NULL DEFAULT 100000,
    acknowledged BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, penalty_date, crm_type)
);

-- ========== POSITIONS & ROLES SYSTEM ==========

-- Positions table (job titles)
CREATE TABLE IF NOT EXISTS positions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- System roles table
CREATE TABLE IF NOT EXISTS system_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    level INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add position_id to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS position_id INTEGER REFERENCES positions(id);

-- Drop old role CHECK constraint if exists
DO $$
BEGIN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Insert default system roles
INSERT INTO system_roles (name, slug, level) VALUES
    ('Giám Đốc', 'giam_doc', 5),
    ('Quản Lý Cấp Cao', 'quan_ly_cap_cao', 4),
    ('Quản Lý', 'quan_ly', 3),
    ('Trưởng Phòng', 'truong_phong', 2),
    ('Nhân Viên', 'nhan_vien', 1),
    ('Part Time', 'part_time', 0)
ON CONFLICT (slug) DO NOTHING;

-- Insert default positions
INSERT INTO positions (name) VALUES
    ('Giám Đốc'),('Phó Giám Đốc'),('Trinh'),('Quản Lý'),('Trưởng Phòng'),
    ('Kế Toán'),('Kinh Doanh'),('Sale'),('Thủ Quỹ'),('Nhân Sự'),
    ('Thủ Kho'),('Thư Ký'),('Tổ Trưởng'),('KCS Hàng'),('Kỹ Thuật'),
    ('Sinh Viên Part'),('Sinh Viên Full'),('Nhân Viên'),('NV Part-Time')
ON CONFLICT (name) DO NOTHING;

-- Migration: convert old roles to new roles + assign positions
DO $$
DECLARE
    pos_id INTEGER;
BEGIN
    -- pho_giam_doc → quan_ly_cap_cao + position 'Phó Giám Đốc'
    SELECT id INTO pos_id FROM positions WHERE name = 'Phó Giám Đốc';
    UPDATE users SET role = 'quan_ly_cap_cao', position_id = COALESCE(position_id, pos_id) WHERE role = 'pho_giam_doc';

    -- trinh → quan_ly_cap_cao + position 'Trinh'
    SELECT id INTO pos_id FROM positions WHERE name = 'Trinh';
    UPDATE users SET role = 'quan_ly_cap_cao', position_id = COALESCE(position_id, pos_id) WHERE role = 'trinh';

    -- ke_toan → nhan_vien + position 'Kế Toán'
    SELECT id INTO pos_id FROM positions WHERE name = 'Kế Toán';
    UPDATE users SET role = 'nhan_vien', position_id = COALESCE(position_id, pos_id) WHERE role = 'ke_toan';

    -- nhan_su → nhan_vien + position 'Nhân Sự'
    SELECT id INTO pos_id FROM positions WHERE name = 'Nhân Sự';
    UPDATE users SET role = 'nhan_vien', position_id = COALESCE(position_id, pos_id) WHERE role = 'nhan_su';

    -- thu_quy → nhan_vien + position 'Thủ Quỹ'
    SELECT id INTO pos_id FROM positions WHERE name = 'Thủ Quỹ';
    UPDATE users SET role = 'nhan_vien', position_id = COALESCE(position_id, pos_id) WHERE role = 'thu_quy';

    -- thu_kho → nhan_vien + position 'Thủ Kho'
    SELECT id INTO pos_id FROM positions WHERE name = 'Thủ Kho';
    UPDATE users SET role = 'nhan_vien', position_id = COALESCE(position_id, pos_id) WHERE role = 'thu_kho';

    -- thu_ky → nhan_vien + position 'Thư Ký'
    SELECT id INTO pos_id FROM positions WHERE name = 'Thư Ký';
    UPDATE users SET role = 'nhan_vien', position_id = COALESCE(position_id, pos_id) WHERE role = 'thu_ky';

    -- kinh_doanh → nhan_vien + position 'Kinh Doanh'
    SELECT id INTO pos_id FROM positions WHERE name = 'Kinh Doanh';
    UPDATE users SET role = 'nhan_vien', position_id = COALESCE(position_id, pos_id) WHERE role IN ('kinh_doanh', 'sale');

    -- to_truong → nhan_vien + position 'Tổ Trưởng'
    SELECT id INTO pos_id FROM positions WHERE name = 'Tổ Trưởng';
    UPDATE users SET role = 'nhan_vien', position_id = COALESCE(position_id, pos_id) WHERE role = 'to_truong';

    -- kcs_hang → nhan_vien + position 'KCS Hàng'
    SELECT id INTO pos_id FROM positions WHERE name = 'KCS Hàng';
    UPDATE users SET role = 'nhan_vien', position_id = COALESCE(position_id, pos_id) WHERE role = 'kcs_hang';

    -- ky_thuat → nhan_vien + position 'Kỹ Thuật'
    SELECT id INTO pos_id FROM positions WHERE name = 'Kỹ Thuật';
    UPDATE users SET role = 'nhan_vien', position_id = COALESCE(position_id, pos_id) WHERE role = 'ky_thuat';

    -- nhan_vien_parttime → part_time + position 'NV Part-Time'
    SELECT id INTO pos_id FROM positions WHERE name = 'NV Part-Time';
    UPDATE users SET role = 'part_time', position_id = COALESCE(position_id, pos_id) WHERE role = 'nhan_vien_parttime';

    -- sinh_vien → part_time + position 'Sinh Viên Full'
    SELECT id INTO pos_id FROM positions WHERE name = 'Sinh Viên Full';
    UPDATE users SET role = 'part_time', position_id = COALESCE(position_id, pos_id) WHERE role = 'sinh_vien';

    -- hoa_hong, ctv, nuoi_duong, sinh_vien, tkaffiliate → keep as-is (affiliate account types, NOT employee roles)
    -- No migration needed for these roles

    -- Assign default positions to users that don't have one yet
    SELECT id INTO pos_id FROM positions WHERE name = 'Giám Đốc';
    UPDATE users SET position_id = pos_id WHERE role = 'giam_doc' AND position_id IS NULL;

    SELECT id INTO pos_id FROM positions WHERE name = 'Quản Lý';
    UPDATE users SET position_id = pos_id WHERE role = 'quan_ly' AND position_id IS NULL;

    SELECT id INTO pos_id FROM positions WHERE name = 'Trưởng Phòng';
    UPDATE users SET position_id = pos_id WHERE role = 'truong_phong' AND position_id IS NULL;

    SELECT id INTO pos_id FROM positions WHERE name = 'Nhân Viên';
    UPDATE users SET position_id = pos_id WHERE role = 'nhan_vien' AND position_id IS NULL;

    SELECT id INTO pos_id FROM positions WHERE name = 'NV Part-Time';
    UPDATE users SET position_id = pos_id WHERE role = 'part_time' AND position_id IS NULL;
END $$;

-- ========== GLOBAL PENALTY CONFIG (mức phạt chung cho toàn hệ thống) ==========
CREATE TABLE IF NOT EXISTS global_penalty_config (
    key TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 50000,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed defaults
INSERT INTO global_penalty_config (key, label, amount) VALUES
    ('cv_diem_ql_khong_duyet',    'CV Điểm — QL/QLCC không duyệt', 50000),
    ('cv_diem_ql_khong_ho_tro',   'CV Điểm — QL/QLCC không hỗ trợ NV', 50000),
    ('cv_khoa_khong_nop',         'CV Khóa — NV/TP/QL/QLCC không nộp báo cáo', 50000),
    ('cv_khoa_ql_khong_duyet',    'CV Khóa — QL/QLCC không duyệt', 50000),
    ('cv_khoa_ql_khong_ho_tro',   'CV Khóa — QL/QLCC không hỗ trợ NV', 50000),
    ('cv_chuoi_khong_nop',        'CV Chuỗi — NV/TP/QL/QLCC không nộp báo cáo', 50000),
    ('cv_chuoi_ql_khong_duyet',   'CV Chuỗi — QL/QLCC không duyệt', 50000),
    ('cap_cuu_ql_khong_xu_ly',    'Cấp cứu sếp — QL/QLCC không xử lý', 50000),
    ('kh_chua_xu_ly_hom_nay',     'KH chưa xử lý hôm nay — Toàn bộ NV', 100000)
ON CONFLICT (key) DO NOTHING;

-- ========== HỆ THỐNG GỌI ĐIỆN TELESALE ==========

-- 1. Nguồn gọi điện (NHÂN SỰ, KẾ TOÁN, MẦM NON...)
CREATE TABLE IF NOT EXISTS telesale_sources (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT '📁',
    crm_type TEXT,
    daily_quota INTEGER DEFAULT 0,
    default_followup_days INTEGER DEFAULT 3,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Tình trạng khi bắt máy (GĐ tự thêm/xóa)
CREATE TABLE IF NOT EXISTS telesale_answer_statuses (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT '📞',
    action_type TEXT NOT NULL DEFAULT 'none'
        CHECK (action_type IN ('transfer','followup','cold','none')),
    default_followup_days INTEGER DEFAULT 0,
    counts_as_answered BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Data pool (tất cả SĐT khách hàng tiềm năng)
CREATE TABLE IF NOT EXISTS telesale_data (
    id SERIAL PRIMARY KEY,
    source_id INTEGER NOT NULL REFERENCES telesale_sources(id),
    company_name TEXT,
    group_name TEXT,
    post_link TEXT,
    post_content TEXT,
    customer_name TEXT,
    phone TEXT NOT NULL,
    address TEXT,
    extra_data JSONB DEFAULT '{}',
    status TEXT DEFAULT 'available'
        CHECK (status IN ('available','assigned','answered','cold','invalid')),
    invalid_count INTEGER DEFAULT 0,
    cold_until DATE,
    last_assigned_date DATE,
    last_assigned_user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_telesale_data_source ON telesale_data(source_id);
CREATE INDEX IF NOT EXISTS idx_telesale_data_status ON telesale_data(status);
CREATE INDEX IF NOT EXISTS idx_telesale_data_phone ON telesale_data(phone);

-- 4. Phân chia hàng ngày (NV nhận SĐT)
CREATE TABLE IF NOT EXISTS telesale_assignments (
    id SERIAL PRIMARY KEY,
    data_id INTEGER NOT NULL REFERENCES telesale_data(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    assigned_date DATE NOT NULL,
    call_status TEXT DEFAULT 'pending'
        CHECK (call_status IN ('pending','no_answer','busy','invalid','answered')),
    answer_status_id INTEGER REFERENCES telesale_answer_statuses(id),
    notes TEXT,
    callback_date DATE,
    callback_time TIME,
    transferred_customer_id INTEGER REFERENCES customers(id),
    called_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_telesale_assign_unique ON telesale_assignments(data_id, user_id, assigned_date);
CREATE INDEX IF NOT EXISTS idx_telesale_assign_user ON telesale_assignments(user_id, assigned_date);
CREATE INDEX IF NOT EXISTS idx_telesale_assign_status ON telesale_assignments(call_status);
CREATE INDEX IF NOT EXISTS idx_telesale_assign_callback ON telesale_assignments(callback_date);

-- 5. NV active trong hệ thống Telesale (GĐ thêm/bỏ)
CREATE TABLE IF NOT EXISTS telesale_active_members (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    daily_quota INTEGER DEFAULT 250,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Cấu hình cột import (tùy chỉnh)
CREATE TABLE IF NOT EXISTS telesale_import_columns (
    id SERIAL PRIMARY KEY,
    column_key TEXT NOT NULL UNIQUE,
    column_name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Kho số không tồn tại (để kiểm tra lại)
CREATE TABLE IF NOT EXISTS telesale_invalid_numbers (
    id SERIAL PRIMARY KEY,
    data_id INTEGER REFERENCES telesale_data(id),
    phone TEXT NOT NULL,
    source_id INTEGER REFERENCES telesale_sources(id),
    customer_name TEXT,
    company_name TEXT,
    invalid_count INTEGER DEFAULT 2,
    last_reported_by INTEGER REFERENCES users(id),
    last_reported_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Seed: 16 nguồn gọi điện mặc định
INSERT INTO telesale_sources (name, icon, daily_quota, display_order) VALUES
    ('NHÂN SỰ', '👥', 16, 1),
    ('KẾ TOÁN', '💰', 16, 2),
    ('KHU CÔNG NGHIỆP CƯ DÂN HỘI PHỤ HUYNH', '🏭', 16, 3),
    ('SỰ KIỆN', '🎪', 16, 4),
    ('QUÀ TẶNG', '🎁', 16, 5),
    ('MẦM NON', '🧒', 16, 6),
    ('BẢO HỘ LAO ĐỘNG', '🦺', 16, 7),
    ('BỘ Y TẾ', '🏥', 15, 8),
    ('KHỞI NGHIỆP KD', '🚀', 15, 9),
    ('NHÀ HÀNG', '🍽️', 15, 10),
    ('THUÊ VP KỶ YẾU', '🏢', 15, 11),
    ('THIẾT KẾ', '🎨', 15, 12),
    ('THỂ THAO', '⚽', 15, 13),
    ('ĐỒNG PHỤC', '👔', 15, 14),
    ('KHU CÔNG NGHIỆP', '🏗️', 15, 15),
    ('DOANH NGHIỆP', '🏛️', 15, 16)
ON CONFLICT (name) DO NOTHING;

-- Seed: 6 tình trạng bắt máy mặc định
INSERT INTO telesale_answer_statuses (name, icon, action_type, default_followup_days, display_order) VALUES
    ('Có nhu cầu — Chuyển số', '🔥', 'transfer', 0, 1),
    ('Yêu cầu gửi báo giá', '📨', 'transfer', 2, 2),
    ('Hẹn gặp trực tiếp', '🤝', 'transfer', 0, 3),
    ('Đang cân nhắc', '🤔', 'followup', 3, 4),
    ('Đã có nhà cung cấp', '🏪', 'followup', 30, 5),
    ('Không có nhu cầu', '🚫', 'cold', 0, 6)
ON CONFLICT (name) DO NOTHING;

-- Seed: 7 cột import mặc định
INSERT INTO telesale_import_columns (column_key, column_name, is_default, display_order) VALUES
    ('company_name', 'Tên Công Ty', true, 1),
    ('group_name', 'Tên Nhóm', true, 2),
    ('post_link', 'Link Đăng Bài', true, 3),
    ('post_content', 'Nội Dung Đăng Bài', true, 4),
    ('customer_name', 'Tên KH', true, 5),
    ('phone', 'SĐT', true, 6),
    ('address', 'Địa Chỉ', true, 7)
ON CONFLICT (column_key) DO NOTHING;

-- Seed: Telesale global configs
INSERT INTO app_config (key, value) VALUES
    ('telesale_pump_time', '07:00'),
    ('telesale_recall_time', '00:00'),
    ('telesale_cold_months', '4'),
    ('telesale_default_quota', '250'),
    ('telesale_followup_canhnhac', '3'),
    ('telesale_followup_ncc', '30')
ON CONFLICT (key) DO NOTHING;
