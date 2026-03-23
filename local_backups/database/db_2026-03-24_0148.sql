--
-- PostgreSQL database dump
--

\restrict 1W77Qne3yc31bC8dbCnfWktnOOOlqOWcIVQmmxOoTYHaKnG7FeIhB5NrIgaYaEz

-- Dumped from database version 18.3 (Debian 18.3-1.pgdg13+1)
-- Dumped by pg_dump version 18.3 (Debian 18.3-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_config; Type: TABLE; Schema: public; Owner: adminhv
--

CREATE TABLE public.app_config (
    key text NOT NULL,
    value text,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.app_config OWNER TO adminhv;

--
-- Name: commission_tiers; Type: TABLE; Schema: public; Owner: adminhv
--

CREATE TABLE public.commission_tiers (
    id integer NOT NULL,
    name text NOT NULL,
    percentage double precision DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    parent_percentage double precision DEFAULT 0 NOT NULL
);


ALTER TABLE public.commission_tiers OWNER TO adminhv;

--
-- Name: commission_tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: adminhv
--

CREATE SEQUENCE public.commission_tiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.commission_tiers_id_seq OWNER TO adminhv;

--
-- Name: commission_tiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adminhv
--

ALTER SEQUENCE public.commission_tiers_id_seq OWNED BY public.commission_tiers.id;


--
-- Name: consultation_logs; Type: TABLE; Schema: public; Owner: adminhv
--

CREATE TABLE public.consultation_logs (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    log_type text NOT NULL,
    content text,
    image_path text,
    logged_by integer,
    deposit_amount integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    next_consult_type text,
    CONSTRAINT consultation_logs_log_type_check CHECK ((log_type = ANY (ARRAY['goi_dien'::text, 'nhan_tin'::text, 'gap_truc_tiep'::text, 'gui_bao_gia'::text, 'gui_mau'::text, 'thiet_ke'::text, 'bao_sua'::text, 'gui_stk_coc'::text, 'giuc_coc'::text, 'dat_coc'::text, 'chot_don'::text, 'dang_san_xuat'::text, 'hoan_thanh'::text, 'sau_ban_hang'::text, 'tuong_tac_ket_noi'::text, 'huy'::text, 'cap_cuu_sep'::text, 'huy_coc'::text, 'hoan_thanh_cap_cuu'::text, 'giam_gia'::text, 'tu_van_lai'::text, 'gui_ct_kh_cu'::text, 'lam_quen_tuong_tac'::text])))
);


ALTER TABLE public.consultation_logs OWNER TO adminhv;

--
-- Name: consultation_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: adminhv
--

CREATE SEQUENCE public.consultation_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.consultation_logs_id_seq OWNER TO adminhv;

--
-- Name: consultation_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adminhv
--

ALTER SEQUENCE public.consultation_logs_id_seq OWNED BY public.consultation_logs.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: adminhv
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    crm_type text NOT NULL,
    customer_name text NOT NULL,
    phone text NOT NULL,
    address text,
    birthday text,
    appointment_date text,
    source_id integer,
    promotion_id integer,
    industry_id integer,
    receiver_id integer,
    assigned_to_id integer,
    referrer_id integer,
    referrer_customer_id integer,
    handover_date text DEFAULT (CURRENT_DATE)::text,
    order_status text DEFAULT 'dang_tu_van'::text,
    notes text,
    daily_order_number integer DEFAULT 0,
    cancel_requested integer DEFAULT 0,
    cancel_reason text,
    cancel_requested_by integer,
    cancel_requested_at text,
    cancel_approved integer DEFAULT 0,
    cancel_approved_by integer,
    cancel_approved_at text,
    created_by integer,
    job text,
    customer_holidays text,
    province text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT customers_order_status_check CHECK ((order_status = ANY (ARRAY['dang_tu_van'::text, 'bao_gia'::text, 'gui_stk_coc'::text, 'dat_coc'::text, 'chot_don'::text, 'sau_ban_hang'::text, 'san_xuat'::text, 'giao_hang'::text, 'hoan_thanh'::text, 'duyet_huy'::text, 'tuong_tac_ket_noi'::text, 'huy_coc'::text, 'tu_van_lai'::text, 'gui_ct_kh_cu'::text, 'lam_quen_tuong_tac'::text, 'giam_gia'::text])))
);


ALTER TABLE public.customers OWNER TO adminhv;

--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: adminhv
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customers_id_seq OWNER TO adminhv;

--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adminhv
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: adminhv
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    parent_id integer,
    head_user_id integer,
    status text DEFAULT 'active'::text,
    created_at timestamp without time zone DEFAULT now(),
    display_order integer DEFAULT 999,
    CONSTRAINT departments_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);


ALTER TABLE public.departments OWNER TO adminhv;

--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: adminhv
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.departments_id_seq OWNER TO adminhv;

--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adminhv
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: emergencies; Type: TABLE; Schema: public; Owner: adminhv
--

CREATE TABLE public.emergencies (
    id integer NOT NULL,
    customer_id integer,
    requested_by integer NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'pending'::text,
    resolved_by integer,
    resolved_note text,
    handler_id integer,
    handover_to integer,
    handover_at text,
    handover_status text,
    created_at timestamp without time zone DEFAULT now(),
    resolved_at text,
    assigned_at timestamp without time zone DEFAULT now(),
    CONSTRAINT emergencies_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'resolved'::text])))
);


ALTER TABLE public.emergencies OWNER TO adminhv;

--
-- Name: emergencies_id_seq; Type: SEQUENCE; Schema: public; Owner: adminhv
--

CREATE SEQUENCE public.emergencies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emergencies_id_seq OWNER TO adminhv;

--
-- Name: emergencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adminhv
--

ALTER SEQUENCE public.emergencies_id_seq OWNED BY public.emergencies.id;


--
-- Name: leaderboard_prizes; Type: TABLE; Schema: public; Owner: adminhv
--

CREATE TABLE public.leaderboard_prizes (
    id integer NOT NULL,
    board_key text NOT NULL,
    month text NOT NULL,
    top_rank integer NOT NULL,
    prize_amount double precision DEFAULT 0 NOT NULL,
    prize_description text,
    is_active boolean DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    conditions text DEFAULT ''::text,
    departments text DEFAULT '[]'::text,
    CONSTRAINT leaderboard_prizes_top_rank_check CHECK (((top_rank >= 1) AND (top_rank <= 10)))
);


ALTER TABLE public.leaderboard_prizes OWNER TO adminhv;

--
-- Name: leaderboard_prizes_id_seq; Type: SEQUENCE; Schema: public; Owner: adminhv
--

CREATE SEQUENCE public.leaderboard_prizes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.leaderboard_prizes_id_seq OWNER TO adminhv;

--
-- Name: leaderboard_prizes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adminhv
--

ALTER SEQUENCE public.leaderboard_prizes_id_seq OWNED BY public.leaderboard_prizes.id;


--
-- Name: order_codes; Type: TABLE; Schema: public; Owner: adminhv
--

CREATE TABLE public.order_codes (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    user_id integer NOT NULL,
    order_code text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    status text DEFAULT 'active'::text,
    deposit_amount double precision DEFAULT 0
);


ALTER TABLE public.order_codes OWNER TO adminhv;

--
-- Name: order_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: adminhv
--

CREATE SEQUENCE public.order_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_codes_id_seq OWNER TO adminhv;

--
-- Name: order_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adminhv
--

ALTER SEQUENCE public.order_codes_id_seq OWNED BY public.order_codes.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: adminhv
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    description text,
    quantity integer DEFAULT 0,
    unit_price double precision DEFAULT 0,
    total double precision DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    order_code_id integer
);


ALTER TABLE public.order_items OWNER TO adminhv;

--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: adminhv
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_id_seq OWNER TO adminhv;

--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adminhv
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: adminhv
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    target_type text NOT NULL,
    target_id integer NOT NULL,
    feature text NOT NULL,
    can_view integer DEFAULT 0,
    can_create integer DEFAULT 0,
    can_edit integer DEFAULT 0,
    can_delete integer DEFAULT 0,
    CONSTRAINT permissions_target_type_check CHECK ((target_type = ANY (ARRAY['department'::text, 'user'::text])))
);


ALTER TABLE public.permissions OWNER TO adminhv;

--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: adminhv
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO adminhv;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adminhv
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: prize_award_comments; Type: TABLE; Schema: public; Owner: adminhv
--

CREATE TABLE public.prize_award_comments (
    id integer NOT NULL,
    award_id integer NOT NULL,
    user_id integer NOT NULL,
    user_name text NOT NULL,
    comment_text text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.prize_award_comments OWNER TO adminhv;

--
-- Name: prize_award_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: adminhv
--

CREATE SEQUENCE public.prize_award_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.prize_award_comments_id_seq OWNER TO adminhv;

--
-- Name: prize_award_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adminhv
--

ALTER SEQUENCE public.prize_award_comments_id_seq OWNED BY public.prize_award_comments.id;


--
-- Name: prize_award_views; Type: TABLE; Schema: public; Owner: adminhv
--

CREATE TABLE public.prize_award_views (
    id integer NOT NULL,
    award_id integer NOT NULL,
    user_id integer NOT NULL,
    has_commented boolean DEFAULT false,
    viewed_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.prize_award_views OWNER TO adminhv;

--
-- Name: prize_award_views_id_seq; Type: SEQUENCE; Schema: public; Owner: adminhv
--

CREATE SEQUENCE public.prize_award_views_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.prize_award_views_id_seq OWNER TO adminhv;

--
-- Name: prize_award_views_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adminhv
--

ALTER SEQUENCE public.prize_award_views_id_seq OWNED BY public.prize_award_views.id;


--
-- Name: prize_awards; Type: TABLE; Schema: public; Owner: adminhv
--

CREATE TABLE public.prize_awards (
    id integer NOT NULL,
    board_key text NOT NULL,
    month text NOT NULL,
    top_rank integer NOT NULL,
    winner_type text DEFAULT 'individual'::text NOT NULL,
    winner_user_id integer,
    winner_team_id integer,
    winner_name text NOT NULL,
    prize_amount double precision DEFAULT 0 NOT NULL,
    prize_description text DEFAULT ''::text,
    photo_winner text,
    photo_certificate text,
    awarded_by integer,
    awarded_at timestamp without time zone DEFAULT now(),
    CONSTRAINT prize_awards_winner_type_check CHECK ((winner_type = ANY (ARRAY['individual'::text, 'team'::text])))
);


ALTER TABLE public.prize_awards OWNER TO adminhv;

--
-- Name: prize_awards_id_seq; Type: SEQUENCE; Schema: public; Owner: adminhv
--

CREATE SEQUENCE public.prize_awards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.prize_awards_id_seq OWNER TO adminhv;

--
-- Name: prize_awards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adminhv
--

ALTER SEQUENCE public.prize_awards_id_seq OWNED BY public.prize_awards.id;


--
-- Name: settings_industries; Type: TABLE; Schema: public; Owner: adminhv
--

CREATE TABLE public.settings_industries (
    id integer NOT NULL,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.settings_industries OWNER TO adminhv;

--
-- Name: settings_industries_id_seq; Type: SEQUENCE; Schema: public; Owner: adminhv
--

CREATE SEQUENCE public.settings_industries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.settings_industries_id_seq OWNER TO adminhv;

--
-- Name: settings_industries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adminhv
--

ALTER SEQUENCE public.settings_industries_id_seq OWNED BY public.settings_industries.id;


--
-- Name: settings_job_titles; Type: TABLE; Schema: public; Owner: adminhv
--

CREATE TABLE public.settings_job_titles (
    id integer NOT NULL,
    crm_type text NOT NULL,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.settings_job_titles OWNER TO adminhv;

--
-- Name: settings_job_titles_id_seq; Type: SEQUENCE; Schema: public; Owner: adminhv
--

CREATE SEQUENCE public.settings_job_titles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.settings_job_titles_id_seq OWNER TO adminhv;

--
-- Name: settings_job_titles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adminhv
--

ALTER SEQUENCE public.settings_job_titles_id_seq OWNED BY public.settings_job_titles.id;


--
-- Name: settings_promotions; Type: TABLE; Schema: public; Owner: adminhv
--

CREATE TABLE public.settings_promotions (
    id integer NOT NULL,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.settings_promotions OWNER TO adminhv;

--
-- Name: settings_promotions_id_seq; Type: SEQUENCE; Schema: public; Owner: adminhv
--

CREATE SEQUENCE public.settings_promotions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.settings_promotions_id_seq OWNER TO adminhv;

--
-- Name: settings_promotions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adminhv
--

ALTER SEQUENCE public.settings_promotions_id_seq OWNED BY public.settings_promotions.id;


--
-- Name: settings_sources; Type: TABLE; Schema: public; Owner: adminhv
--

CREATE TABLE public.settings_sources (
    id integer NOT NULL,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.settings_sources OWNER TO adminhv;

--
-- Name: settings_sources_id_seq; Type: SEQUENCE; Schema: public; Owner: adminhv
--

CREATE SEQUENCE public.settings_sources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.settings_sources_id_seq OWNER TO adminhv;

--
-- Name: settings_sources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adminhv
--

ALTER SEQUENCE public.settings_sources_id_seq OWNED BY public.settings_sources.id;


--
-- Name: social_handovers; Type: TABLE; Schema: public; Owner: adminhv
--

CREATE TABLE public.social_handovers (
    id integer NOT NULL,
    user_id integer NOT NULL,
    platform text NOT NULL,
    account_name text,
    acc text,
    pass text,
    two_fa text,
    link text,
    note text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.social_handovers OWNER TO adminhv;

--
-- Name: social_handovers_id_seq; Type: SEQUENCE; Schema: public; Owner: adminhv
--

CREATE SEQUENCE public.social_handovers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.social_handovers_id_seq OWNER TO adminhv;

--
-- Name: social_handovers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adminhv
--

ALTER SEQUENCE public.social_handovers_id_seq OWNED BY public.social_handovers.id;


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: adminhv
--

CREATE TABLE public.team_members (
    id integer NOT NULL,
    team_id integer NOT NULL,
    user_id integer NOT NULL
);


ALTER TABLE public.team_members OWNER TO adminhv;

--
-- Name: team_members_id_seq; Type: SEQUENCE; Schema: public; Owner: adminhv
--

CREATE SEQUENCE public.team_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.team_members_id_seq OWNER TO adminhv;

--
-- Name: team_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adminhv
--

ALTER SEQUENCE public.team_members_id_seq OWNED BY public.team_members.id;


--
-- Name: teams; Type: TABLE; Schema: public; Owner: adminhv
--

CREATE TABLE public.teams (
    id integer NOT NULL,
    name text NOT NULL,
    manager_id integer,
    leader_id integer,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.teams OWNER TO adminhv;

--
-- Name: teams_id_seq; Type: SEQUENCE; Schema: public; Owner: adminhv
--

CREATE SEQUENCE public.teams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.teams_id_seq OWNER TO adminhv;

--
-- Name: teams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adminhv
--

ALTER SEQUENCE public.teams_id_seq OWNED BY public.teams.id;


--
-- Name: tool_handovers; Type: TABLE; Schema: public; Owner: adminhv
--

CREATE TABLE public.tool_handovers (
    id integer NOT NULL,
    user_id integer NOT NULL,
    tool_name text NOT NULL,
    quantity integer DEFAULT 1,
    handover_date text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.tool_handovers OWNER TO adminhv;

--
-- Name: tool_handovers_id_seq; Type: SEQUENCE; Schema: public; Owner: adminhv
--

CREATE SEQUENCE public.tool_handovers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tool_handovers_id_seq OWNER TO adminhv;

--
-- Name: tool_handovers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adminhv
--

ALTER SEQUENCE public.tool_handovers_id_seq OWNED BY public.tool_handovers.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: adminhv
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    full_name text NOT NULL,
    phone text,
    address text,
    role text NOT NULL,
    status text DEFAULT 'active'::text,
    contract_info text,
    start_date text,
    id_card_front text,
    id_card_back text,
    telegram_group_id text,
    commission_tier_id integer,
    assigned_to_user_id integer,
    balance double precision DEFAULT 0,
    bank_name text,
    bank_account text,
    bank_holder text,
    order_code_prefix text,
    contract_file text,
    rules_file text,
    managed_by_user_id integer,
    source_customer_id integer,
    province text,
    source_crm_type text,
    department_id integer,
    birth_date text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['giam_doc'::text, 'quan_ly'::text, 'truong_phong'::text, 'nhan_vien'::text, 'hoa_hong'::text, 'ctv'::text, 'nuoi_duong'::text, 'sinh_vien'::text, 'ke_toan'::text, 'nhan_su'::text, 'thu_quy'::text, 'thu_kho'::text, 'pho_giam_doc'::text, 'thu_ky'::text, 'trinh'::text, 'nhan_vien_parttime'::text, 'tkaffiliate'::text]))),
    CONSTRAINT users_status_check CHECK ((status = ANY (ARRAY['active'::text, 'resigned'::text, 'locked'::text])))
);


ALTER TABLE public.users OWNER TO adminhv;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: adminhv
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO adminhv;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adminhv
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: withdrawal_requests; Type: TABLE; Schema: public; Owner: adminhv
--

CREATE TABLE public.withdrawal_requests (
    id integer NOT NULL,
    user_id integer NOT NULL,
    amount double precision NOT NULL,
    bank_name text,
    bank_account text,
    bank_holder text,
    status text DEFAULT 'pending'::text,
    approved_by integer,
    approved_at text,
    created_at timestamp without time zone DEFAULT now(),
    reject_reason text,
    transfer_image text,
    CONSTRAINT withdrawal_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


ALTER TABLE public.withdrawal_requests OWNER TO adminhv;

--
-- Name: withdrawal_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: adminhv
--

CREATE SEQUENCE public.withdrawal_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.withdrawal_requests_id_seq OWNER TO adminhv;

--
-- Name: withdrawal_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: adminhv
--

ALTER SEQUENCE public.withdrawal_requests_id_seq OWNED BY public.withdrawal_requests.id;


--
-- Name: commission_tiers id; Type: DEFAULT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.commission_tiers ALTER COLUMN id SET DEFAULT nextval('public.commission_tiers_id_seq'::regclass);


--
-- Name: consultation_logs id; Type: DEFAULT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.consultation_logs ALTER COLUMN id SET DEFAULT nextval('public.consultation_logs_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: emergencies id; Type: DEFAULT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.emergencies ALTER COLUMN id SET DEFAULT nextval('public.emergencies_id_seq'::regclass);


--
-- Name: leaderboard_prizes id; Type: DEFAULT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.leaderboard_prizes ALTER COLUMN id SET DEFAULT nextval('public.leaderboard_prizes_id_seq'::regclass);


--
-- Name: order_codes id; Type: DEFAULT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.order_codes ALTER COLUMN id SET DEFAULT nextval('public.order_codes_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: prize_award_comments id; Type: DEFAULT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.prize_award_comments ALTER COLUMN id SET DEFAULT nextval('public.prize_award_comments_id_seq'::regclass);


--
-- Name: prize_award_views id; Type: DEFAULT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.prize_award_views ALTER COLUMN id SET DEFAULT nextval('public.prize_award_views_id_seq'::regclass);


--
-- Name: prize_awards id; Type: DEFAULT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.prize_awards ALTER COLUMN id SET DEFAULT nextval('public.prize_awards_id_seq'::regclass);


--
-- Name: settings_industries id; Type: DEFAULT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.settings_industries ALTER COLUMN id SET DEFAULT nextval('public.settings_industries_id_seq'::regclass);


--
-- Name: settings_job_titles id; Type: DEFAULT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.settings_job_titles ALTER COLUMN id SET DEFAULT nextval('public.settings_job_titles_id_seq'::regclass);


--
-- Name: settings_promotions id; Type: DEFAULT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.settings_promotions ALTER COLUMN id SET DEFAULT nextval('public.settings_promotions_id_seq'::regclass);


--
-- Name: settings_sources id; Type: DEFAULT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.settings_sources ALTER COLUMN id SET DEFAULT nextval('public.settings_sources_id_seq'::regclass);


--
-- Name: social_handovers id; Type: DEFAULT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.social_handovers ALTER COLUMN id SET DEFAULT nextval('public.social_handovers_id_seq'::regclass);


--
-- Name: team_members id; Type: DEFAULT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.team_members ALTER COLUMN id SET DEFAULT nextval('public.team_members_id_seq'::regclass);


--
-- Name: teams id; Type: DEFAULT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.teams ALTER COLUMN id SET DEFAULT nextval('public.teams_id_seq'::regclass);


--
-- Name: tool_handovers id; Type: DEFAULT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.tool_handovers ALTER COLUMN id SET DEFAULT nextval('public.tool_handovers_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: withdrawal_requests id; Type: DEFAULT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.withdrawal_requests ALTER COLUMN id SET DEFAULT nextval('public.withdrawal_requests_id_seq'::regclass);


--
-- Data for Name: app_config; Type: TABLE DATA; Schema: public; Owner: adminhv
--

COPY public.app_config (key, value, updated_at) FROM stdin;
emergency_popup_time_1	11:00	2026-03-20 20:13:06.603952
emergency_popup_time_2	16:00	2026-03-20 20:13:06.603952
cancel_nv_popup_time_1	09:30	2026-03-20 20:36:51.568317
cancel_nv_popup_time_2	15:00	2026-03-20 20:36:51.568317
cancel_mgr_popup_time	17:00	2026-03-20 20:36:51.568317
prize_popup_start_hour	0	2026-03-24 00:45:06.747276
prize_popup_start_minute	46	2026-03-24 00:45:06.762591
prize_popup_days	2	2026-03-24 00:45:06.76562
prize_popup_interval_minutes	3	2026-03-24 00:45:06.768162
\.


--
-- Data for Name: commission_tiers; Type: TABLE DATA; Schema: public; Owner: adminhv
--

COPY public.commission_tiers (id, name, percentage, created_at, parent_percentage) FROM stdin;
4	CHIẾT KHẤU 10%- 5%	10	2026-03-22 12:32:06.204871	5
5	CHIẾT KHẤU 15% - 5%	15	2026-03-22 12:33:03.356678	5
6	CHIẾT KHẤU 20% - 10%	20	2026-03-22 17:29:41.942139	10
\.


--
-- Data for Name: consultation_logs; Type: TABLE DATA; Schema: public; Owner: adminhv
--

COPY public.consultation_logs (id, customer_id, log_type, content, image_path, logged_by, deposit_amount, created_at, next_consult_type) FROM stdin;
1	8	cap_cuu_sep	tư vấn e với sếp ơi	\N	7	0	2026-03-20 19:07:55.360651	\N
2	7	cap_cuu_sep	cứ quản lý ơi	\N	6	0	2026-03-20 19:08:11.194753	\N
3	7	cap_cuu_sep	✅ Tư vấn Sếp: em phải giải quyết như này này 	\N	1	0	2026-03-20 20:43:21.537726	\N
4	7	hoan_thanh_cap_cuu	🏥 Cấp cứu hoàn thành: em phải giải quyết như này này 	\N	1	0	2026-03-20 20:43:21.548925	\N
5	10	nhan_tin	ĐÃ NHẮN TIN	/uploads/consult/consult_10_1774083960234.png	2	0	2026-03-21 09:06:00.237805	\N
6	10	dat_coc	đã cọc 500k	/uploads/consult/consult_10_1774084767163.png	2	500000	2026-03-21 09:19:27.465839	\N
7	10	chot_don	Chốt đơn: 1 SP — abc, Đà Nẵng	\N	2	0	2026-03-21 09:19:56.435512	\N
8	2	nhan_tin	tư vấn	/uploads/consult/consult_2_1774087086738.png	2	0	2026-03-21 09:58:06.744162	gap_truc_tiep
9	2	gui_mau	gửi mẫu vải sau nhắn tin	/uploads/consult/consult_2_1774087117398.png	2	0	2026-03-21 09:58:37.401573	nhan_tin
10	2	thiet_ke	thiế tkế 	/uploads/consult/consult_2_1774087136798.png	2	0	2026-03-21 09:58:56.801917	dat_coc
11	2	gui_mau	cọc	/uploads/consult/consult_2_1774087171150.png	2	0	2026-03-21 09:59:31.388107	dat_coc
12	2	dat_coc	Đặt cọc: 500.000 VNĐ	/uploads/consult/consult_2_1774088335118.png	1	500000	2026-03-21 10:18:55.121674	\N
13	1	goi_dien	abx	/uploads/consult/consult_1_1774088630182.png	2	0	2026-03-21 10:23:50.186418	cap_cuu_sep
14	1	gui_stk_coc	cọc	/uploads/consult/consult_1_1774090371477.png	1	0	2026-03-21 10:52:51.479366	cap_cuu_sep
15	1	gui_stk_coc	134134134	/uploads/consult/consult_1_1774090547619.png	1	0	2026-03-21 10:55:47.868521	cap_cuu_sep
16	1	gui_stk_coc	sqgfsrf3241	/uploads/consult/consult_1_1774090565006.png	1	0	2026-03-21 10:56:05.008231	cap_cuu_sep
17	1	giuc_coc	hiuc	/uploads/consult/consult_1_1774099541138.png	1	0	2026-03-21 13:25:41.140119	cap_cuu_sep
18	11	goi_dien	1123	\N	3	0	2026-03-21 16:49:08.210405	goi_dien
19	11	nhan_tin	12313	/uploads/consult/consult_11_1774111775224.png	3	0	2026-03-21 16:49:35.226265	goi_dien
20	11	gap_truc_tiep	134134	/uploads/consult/consult_11_1774113952699.png	1	0	2026-03-21 17:25:52.703544	goi_dien
21	11	lam_quen_tuong_tac	134134	/uploads/consult/consult_11_1774113966015.png	1	0	2026-03-21 17:26:06.022539	goi_dien
22	11	gui_bao_gia	134134	/uploads/consult/consult_11_1774114112707.png	1	0	2026-03-21 17:28:32.710117	goi_dien
23	11	gui_stk_coc	đã gửi	/uploads/consult/consult_11_1774114128924.png	1	0	2026-03-21 17:28:48.928033	goi_dien
24	11	dat_coc	ck	/uploads/consult/consult_11_1774114287030.png	1	500000	2026-03-21 17:31:27.033119	\N
25	11	chot_don	Chốt đơn: 1 SP — HCM1, Hải Phòng	\N	3	0	2026-03-21 17:33:10.240484	dang_san_xuat
26	11	dang_san_xuat	OK	/uploads/consult/consult_11_1774115754075.png	3	0	2026-03-21 17:55:54.078825	goi_dien
27	11	hoan_thanh	abc	\N	3	0	2026-03-21 17:59:49.46093	goi_dien
28	11	sau_ban_hang	tư vấn	\N	3	0	2026-03-21 18:00:09.011758	goi_dien
29	11	tuong_tac_ket_noi	qrr	/uploads/consult/consult_11_1774116035092.png	3	0	2026-03-21 18:00:35.096468	goi_dien
30	11	gui_ct_kh_cu	âf	/uploads/consult/consult_11_1774116048620.png	3	0	2026-03-21 18:00:48.62448	goi_dien
31	11	gui_stk_coc	134134	/uploads/consult/consult_11_1774116328968.png	3	0	2026-03-22 01:05:28.972556	goi_dien
32	11	giuc_coc	123123	/uploads/consult/consult_11_1774116370310.png	3	0	2026-03-22 01:06:10.312507	goi_dien
33	11	dat_coc	134134	/uploads/consult/consult_11_1774116388188.png	3	500000	2026-03-22 01:06:28.191066	\N
34	11	huy_coc	huy	\N	3	0	2026-03-22 01:22:07.160191	goi_dien
35	11	huy_coc	huy	\N	3	0	2026-03-22 01:22:08.108974	goi_dien
36	11	huy_coc	huy	\N	3	0	2026-03-22 01:22:08.348817	goi_dien
37	11	huy_coc	huy	\N	3	0	2026-03-22 01:22:08.53999	goi_dien
38	11	huy_coc	huy	\N	3	0	2026-03-22 01:22:08.772108	goi_dien
39	11	nhan_tin	1342134	/uploads/consult/consult_11_1774117441151.png	3	0	2026-03-22 01:24:01.154169	goi_dien
40	11	nhan_tin	134134134	/uploads/consult/consult_11_1774117845497.png	3	0	2026-03-22 01:30:45.50011	goi_dien
41	11	gui_stk_coc	cọc	/uploads/consult/consult_11_1774117868251.png	3	0	2026-03-22 01:31:08.29158	goi_dien
42	11	giuc_coc	1341341	/uploads/consult/consult_11_1774117880419.png	3	0	2026-03-22 01:31:20.419748	goi_dien
43	11	dat_coc	abc	/uploads/consult/consult_11_1774117908541.png	3	1500000	2026-03-22 01:31:48.543583	\N
44	11	chot_don	Chốt đơn: 1 SP — HCM1, Hải Phòng	\N	3	0	2026-03-22 02:00:06.759722	dang_san_xuat
45	12	gui_stk_coc	12413451341	/uploads/consult/consult_12_1774120044720.png	2	0	2026-03-22 02:07:24.724167	goi_dien
46	12	giuc_coc	134513513513	/uploads/consult/consult_12_1774120057941.png	2	0	2026-03-22 02:07:37.970696	goi_dien
47	12	dat_coc	153135135135	/uploads/consult/consult_12_1774120076694.png	2	750000	2026-03-22 02:07:56.697493	\N
48	12	chot_don	Chốt đơn: 1 SP — abc, Đà Nẵng	\N	2	0	2026-03-22 02:11:01.130646	dang_san_xuat
49	12	hoan_thanh	abc	\N	2	0	2026-03-22 02:14:42.555801	goi_dien
50	13	nhan_tin	abc	/uploads/consult/consult_13_1774121027881.png	2	0	2026-03-22 02:23:47.884091	goi_dien
51	13	gui_stk_coc	stk	/uploads/consult/consult_13_1774121038411.png	2	0	2026-03-22 02:23:58.416655	goi_dien
52	13	dat_coc	adfà	/uploads/consult/consult_13_1774121052690.png	2	600000	2026-03-22 02:24:12.693521	\N
53	13	chot_don	Chốt đơn: 1 SP — HN, Cao Bằng	\N	2	0	2026-03-22 02:24:52.522862	dang_san_xuat
54	13	hoan_thanh	13451413	\N	2	0	2026-03-22 02:25:00.812731	goi_dien
55	14	gui_stk_coc	351345135	/uploads/consult/consult_14_1774121679199.png	2	0	2026-03-22 02:34:39.444022	goi_dien
56	14	giuc_coc	1345135135135	/uploads/consult/consult_14_1774121718259.png	2	0	2026-03-22 02:35:18.262985	goi_dien
57	14	dat_coc	1351351351	/uploads/consult/consult_14_1774121738577.png	2	850000	2026-03-22 02:35:38.579474	\N
58	14	chot_don	Chốt đơn: 1 SP — abc134134, Thừa Thiên Huế	\N	2	0	2026-03-22 02:36:24.466465	dang_san_xuat
59	14	hoan_thanh	34134134134	\N	2	0	2026-03-22 02:36:53.254056	goi_dien
60	14	sau_ban_hang	13131431414	\N	2	0	2026-03-22 02:41:23.976691	goi_dien
61	14	tuong_tac_ket_noi	134134134	/uploads/consult/consult_14_1774122198395.png	2	0	2026-03-22 02:43:18.427982	goi_dien
62	14	gui_ct_kh_cu	35413515135	/uploads/consult/consult_14_1774122213179.png	2	0	2026-03-22 02:43:33.181622	goi_dien
63	14	gui_stk_coc	ủtwrtưcrtư	/uploads/consult/consult_14_1774122245786.png	2	0	2026-03-22 02:44:05.789471	goi_dien
64	14	dat_coc	1341341341	/uploads/consult/consult_14_1774122266964.png	2	800000	2026-03-22 02:44:26.968628	\N
65	14	chot_don	Chốt đơn: 1 SP — abc134134, Thừa Thiên Huế	\N	2	0	2026-03-22 02:44:46.138122	dang_san_xuat
66	14	hoan_thanh	1341341341	\N	2	0	2026-03-22 03:02:44.986156	goi_dien
67	14	sau_ban_hang	134134134	\N	2	0	2026-03-22 03:03:03.347044	goi_dien
68	14	tuong_tac_ket_noi	134134134	/uploads/consult/consult_14_1774123394813.png	2	0	2026-03-22 03:03:15.078259	goi_dien
69	14	gui_ct_kh_cu	13453141	/uploads/consult/consult_14_1774123406106.png	2	0	2026-03-22 03:03:26.108774	goi_dien
70	14	gui_stk_coc	132413413	/uploads/consult/consult_14_1774123520841.png	2	0	2026-03-22 03:05:20.843212	goi_dien
71	14	dat_coc	1345134134	/uploads/consult/consult_14_1774123531762.png	2	500000	2026-03-22 03:05:31.763744	\N
72	14	chot_don	Chốt đơn: 1 SP — abc134134, Thừa Thiên Huế	\N	2	0	2026-03-22 03:05:53.328322	dang_san_xuat
73	14	hoan_thanh	134134134	\N	2	0	2026-03-22 03:06:08.979185	goi_dien
74	15	gui_stk_coc	51465416541	/uploads/consult/consult_15_1774201007332.png	1	0	2026-03-23 00:36:47.64508	goi_dien
75	15	dat_coc	23413413	/uploads/consult/consult_15_1774201024029.png	1	50000000	2026-03-23 00:37:04.076963	\N
76	15	chot_don	Chốt đơn: 1 SP — 1234134134, Đà Nẵng	\N	2	0	2026-03-23 00:37:45.076796	dang_san_xuat
77	15	hoan_thanh	134134134	\N	2	0	2026-03-23 00:45:16.603762	goi_dien
78	22	gui_stk_coc	134513414134	/uploads/consult/consult_22_1774201563150.png	3	0	2026-03-23 00:46:03.383171	goi_dien
79	22	dat_coc	1341341341	/uploads/consult/consult_22_1774201582613.png	3	100000000	2026-03-23 00:46:22.623484	\N
80	22	chot_don	Chốt đơn: 1 SP — 134134134, Thanh Hóa	\N	3	0	2026-03-23 00:46:49.578923	dang_san_xuat
81	22	hoan_thanh	134134134134	\N	3	0	2026-03-23 01:05:14.37115	goi_dien
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: adminhv
--

COPY public.customers (id, crm_type, customer_name, phone, address, birthday, appointment_date, source_id, promotion_id, industry_id, receiver_id, assigned_to_id, referrer_id, referrer_customer_id, handover_date, order_status, notes, daily_order_number, cancel_requested, cancel_reason, cancel_requested_by, cancel_requested_at, cancel_approved, cancel_approved_by, cancel_approved_at, created_by, job, customer_holidays, province, created_at, updated_at) FROM stdin;
4	nuoi_duong	NUÔI DƯỠNG 1	0945656568	\N	\N	\N	1	\N	1	3	3	\N	\N	2026-03-20	dang_tu_van	\N	1	0	\N	\N	\N	0	\N	\N	3	\N	\N	\N	2026-03-20 18:58:39.774663	2026-03-20 18:58:39.774663
5	sinh_vien	SINH VIÊN 1	0989898565	\N	\N	\N	1	\N	1	6	6	\N	\N	2026-03-20	dang_tu_van	\N	1	0	\N	\N	\N	0	\N	\N	6	\N	\N	\N	2026-03-20 18:58:53.55711	2026-03-20 18:58:53.55711
6	koc_tiktok	TIKTOK 1	0959565659	\N	\N	\N	3	\N	1	7	7	\N	\N	2026-03-20	dang_tu_van	\N	1	0	\N	\N	\N	0	\N	\N	7	\N	\N	\N	2026-03-20 18:59:09.693701	2026-03-20 18:59:09.693701
8	nhu_cau	NHU CẦU 4	0912316546	\N	\N	\N	1	\N	1	7	7	\N	\N	2026-03-20	dang_tu_van	\N	11	0	\N	\N	\N	0	\N	\N	7	\N	\N	\N	2026-03-20 19:02:57.158722	2026-03-20 19:02:57.158722
12	nhu_cau	KHÁCH 2 AFFILIATE	0961256694	abc	\N	2026-03-24	\N	\N	\N	2	2	13	\N	2026-03-22	hoan_thanh	\N	1	0	\N	\N	\N	0	\N	\N	13	\N	\N	Đà Nẵng	2026-03-22 01:35:25.220642	2026-03-22 02:14:42.560773
7	nhu_cau	NHU CẦU 3	0965656587	\N	\N	2026-03-20	1	\N	1	6	6	\N	\N	2026-03-20	dang_tu_van	\N	11	0	\N	\N	\N	0	\N	\N	6	\N	\N	\N	2026-03-20 19:02:36.870425	2026-03-20 19:02:36.870425
20	nhu_cau	KH TRINH 2	0966355694	bình dương ctv1	\N	\N	\N	\N	\N	9	9	19	\N	2026-03-22	dang_tu_van	\N	2	0	\N	\N	\N	0	\N	\N	9	\N	\N	Bình Dương	2026-03-22 13:20:48.753352	2026-03-22 13:22:13.793989
3	ctv	CTV1	0912654658	bình dương	\N	\N	2	\N	2	2	2	\N	\N	2026-03-20	dang_tu_van	\N	21	0	\N	\N	\N	0	\N	\N	2	\N	\N	Cà Mau	2026-03-20 18:57:29.226492	2026-03-21 05:02:14.623713
19	nhu_cau	KH TRINH 1	0966588598	bình dương	\N	\N	1	\N	\N	9	9	\N	\N	2026-03-22	dang_tu_van	\N	1	0	\N	\N	\N	0	\N	\N	9	\N	\N	Tiền Giang	2026-03-22 12:44:31.241634	2026-03-22 13:36:28.742517
11	nhu_cau	KHTP2	0966255123	HCM1123	\N	2026-04-05	1	\N	1	3	3	\N	\N	2026-03-21	chot_don	\N	1	0	\N	\N	\N	0	\N	\N	3	\N	\N	Cà Mau	2026-03-21 13:26:19.584503	2026-03-22 13:48:52.90443
23	nhu_cau	KH QUẢN LÝ 1	0936656123	dak	\N	\N	1	\N	1	4	4	\N	\N	2026-03-22	dang_tu_van	\N	1	0	\N	\N	\N	0	\N	\N	4	\N	\N	Đắk Nông	2026-03-22 13:55:37.804645	2026-03-22 13:56:44.926555
24	nhu_cau	KH QUẢN LÝ 2	0965656598	dak	\N	\N	1	\N	1	4	4	22	\N	2026-03-22	dang_tu_van	\N	2	0	\N	\N	\N	0	\N	\N	4	\N	\N	Đắk Lắk	2026-03-22 13:58:50.951399	2026-03-22 13:59:28.538801
10	nhu_cau	KHÁCH 1 AFFILIATE	0936666610	abc	\N	2026-03-28	1	\N	1	2	2	13	\N	2026-03-21	hoan_thanh	\N	1	0	\N	\N	\N	0	\N	\N	13	\N	\N	Đà Nẵng	2026-03-21 08:38:25.017349	2026-03-23 00:35:31.688908
2	nhu_cau	NHU CẦU 2	0912546999	hn	\N	2026-03-22	2	\N	3	2	2	\N	\N	2026-03-20	dat_coc	\N	11	0	\N	\N	\N	0	\N	\N	2	\N	\N	Bình Dương	2026-03-20 18:57:19.460085	2026-03-21 10:18:55.127819
1	nhu_cau	KHÁCH 1	0923343789	123789	\N	2026-03-27	1	\N	1	2	2	\N	\N	2026-03-20	dang_tu_van	\N	1	1	chịu thua\n❌ Từ chối: k đc hủy\n	2	2026-03-20 19:11:17.803963+00	-1	1	2026-03-20 20:40:03.07623+00	2	\N	\N	Gia Lai	2026-03-20 18:56:35.523522	2026-03-21 04:50:09.028118
15	nhu_cau	NHU CẦU 4	0923561452	1234134134	\N	2026-04-01	1	\N	1	2	2	\N	\N	2026-03-22	hoan_thanh	\N	4	0	\N	\N	\N	0	\N	\N	2	\N	\N	Đà Nẵng	2026-03-22 02:34:08.591839	2026-03-23 00:45:16.610771
22	nhu_cau	khtruongphong2	0912312323	134134134	\N	2026-04-03	2	\N	1	3	3	21	\N	2026-03-22	hoan_thanh	\N	1	0	\N	\N	\N	0	\N	\N	3	\N	\N	Thanh Hóa	2026-03-22 13:49:33.974391	2026-03-23 01:05:14.3772
21	nhu_cau	TRINH KH 2	0912565698	bình dương	2026-03-28	\N	1	\N	1	9	9	20	\N	2026-03-22	dang_tu_van	\N	3	0	\N	\N	\N	0	\N	\N	9	\N	\N	Điện Biên	2026-03-22 13:35:49.759492	2026-03-23 01:28:32.874207
13	nhu_cau	KHÁCH 3 AFFILIATE	0966366989	HN	\N	2026-04-03	\N	\N	\N	2	2	13	\N	2026-03-22	hoan_thanh	bxcvsd	2	0	\N	\N	\N	0	\N	\N	13	\N	\N	Cao Bằng	2026-03-22 02:15:44.367302	2026-03-22 02:25:00.817085
16	nhu_cau	KHÁCH 5 AFFILIATE	0364898958	\N	\N	\N	\N	\N	\N	2	2	13	\N	2026-03-22	dang_tu_van	\N	5	0	\N	\N	\N	0	\N	\N	13	\N	\N	\N	2026-03-22 02:34:23.861387	2026-03-22 02:34:23.861387
14	nhu_cau	KHÁCH 4 AFFILIATE	0936626693	abc134134	\N	2026-03-28	\N	\N	\N	2	2	13	\N	2026-03-22	hoan_thanh	34134	3	0	\N	\N	\N	0	\N	\N	13	\N	\N	Thừa Thiên Huế	2026-03-22 02:26:12.603519	2026-03-22 03:06:08.98445
9	nhu_cau	NHU CẦU 5	0956565698	\N	\N	2026-03-22	1	\N	1	3	3	\N	\N	2026-03-20	dang_tu_van	\N	11	1	chịu r\n⏰ Tự động từ chối: Quá 24h không có phản hồi	3	2026-03-20 19:11:03.467668+00	-1	\N	\N	3	\N	\N	\N	2026-03-20 19:04:24.365973	2026-03-22 03:18:32.821723
17	nhu_cau	TK 2 AFFILILATE 	0926262698	\N	\N	\N	\N	\N	\N	2	2	14	\N	2026-03-22	dang_tu_van	\N	6	0	\N	\N	\N	0	\N	\N	14	\N	\N	\N	2026-03-22 03:31:09.042063	2026-03-22 03:31:09.042063
18	nhu_cau	trinhaffiliate1313	0923456333	134134134	\N	\N	1	\N	1	7	7	\N	\N	2026-03-22	dang_tu_van	\N	1	0	\N	\N	\N	0	\N	\N	1	\N	\N	Đắk Nông	2026-03-22 03:37:05.887634	2026-03-22 03:37:31.838328
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: adminhv
--

COPY public.departments (id, name, code, parent_id, head_user_id, status, created_at, display_order) FROM stdin;
10	HỆ THỐNG VĂN PHÒNG HV	HTVPHV	\N	9	active	2026-03-20 19:11:04.486458	0
1	PHÒNG KINH DOANH	KINHDOANH	10	4	active	2026-03-20 16:02:34.369357	1
2	TEAM CẤT CÁNH	catcanh	1	3	active	2026-03-20 16:02:47.376898	999
3	TEAM XÃ HỘI	xahoiteam	1	6	active	2026-03-20 16:15:28.941175	999
4	PHÒNG SALE	phongsale	10	\N	active	2026-03-20 18:29:50.73404	2
5	PHÒNG THIẾT KẾ	thietkehv	10	\N	active	2026-03-20 18:30:04.523766	3
6	PHÒNG MARKETING	marketing	10	\N	active	2026-03-20 18:30:12.82878	4
16	PHÒNG KẾ TOÁN	ketoanhvv	10	\N	active	2026-03-20 19:35:23.419215	5
19	PHÒNG THỦ QUỸ	thuquyhvv	10	\N	active	2026-03-20 19:39:53.955504	6
17	PHÒNG HÀNH CHÍNH NHÂN SỰ	nhansuhanhchinhhv	10	\N	active	2026-03-20 19:35:41.075986	7
20	HỆ THỐNG AFFILIATE HV	hethongaffiliatehv	\N	\N	active	2026-03-21 04:07:36.014177	999
21	AFFILIATE TOÀN QUỐC	affiliatetoanquochv	20	\N	active	2026-03-21 04:07:55.324877	999
11	HỆ THỐNG XƯỞNG HV	HTXHV	\N	8	active	2026-03-20 19:11:04.489606	0
8	PHÒNG CẮT	phongcat	11	\N	active	2026-03-20 18:31:38.179794	2
12	PHÒNG IN	phongin	11	\N	active	2026-03-20 19:33:27.554241	3
13	PHÒNG ÉP	phongephv	11	\N	active	2026-03-20 19:33:39.570598	4
14	PHÒNG MAY	phongmayhv	11	\N	active	2026-03-20 19:34:02.978517	5
15	PHÒNG HOÀN THIỆN	hoanthienhv	11	\N	active	2026-03-20 19:34:18.659611	6
18	PHÒNG THỦ KHO	thukhohvv	11	\N	active	2026-03-20 19:36:10.179215	1
\.


--
-- Data for Name: emergencies; Type: TABLE DATA; Schema: public; Owner: adminhv
--

COPY public.emergencies (id, customer_id, requested_by, reason, status, resolved_by, resolved_note, handler_id, handover_to, handover_at, handover_status, created_at, resolved_at, assigned_at) FROM stdin;
1	8	7	tư vấn e với sếp ơi	pending	\N	\N	6	\N	\N	\N	2026-03-20 19:07:55.367989	\N	2026-03-20 20:02:53.225328
2	7	6	cứ quản lý ơi	resolved	1	em phải giải quyết như này này 	4	\N	\N	\N	2026-03-20 19:08:11.206371	2026-03-20 20:43:21.546295+00	2026-03-20 20:02:53.225328
\.


--
-- Data for Name: leaderboard_prizes; Type: TABLE DATA; Schema: public; Owner: adminhv
--

COPY public.leaderboard_prizes (id, board_key, month, top_rank, prize_amount, prize_description, is_active, created_by, created_at, updated_at, conditions, departments) FROM stdin;
10	teamRevenue	2026-03	1	5000000		t	1	2026-03-23 22:21:34.352538	2026-03-23 22:21:34.352538	10 đơn trên 100tr	[1,14]
11	teamRevenue	2026-03	2	500000		t	1	2026-03-23 22:21:34.354223	2026-03-23 22:21:34.354223	10 đơn trên 100tr	[1,14]
12	teamRevenue	2026-03	3	10000		t	1	2026-03-23 22:21:34.356481	2026-03-23 22:21:34.356481	10 đơn trên 100tr	[1,14]
16	employeeOrders	2026-03	1	1000000		t	1	2026-03-23 23:36:21.376419	2026-03-23 23:36:21.376419		[11]
17	employeeOrders	2026-03	2	1000000		t	1	2026-03-23 23:36:21.378267	2026-03-23 23:36:21.378267		[11]
18	employeeOrders	2026-03	3	1000000		t	1	2026-03-23 23:36:21.380107	2026-03-23 23:36:21.380107		[11]
\.


--
-- Data for Name: order_codes; Type: TABLE DATA; Schema: public; Owner: adminhv
--

COPY public.order_codes (id, customer_id, user_id, order_code, created_at, status, deposit_amount) FROM stdin;
3	11	3	VTP0002	2026-03-22 02:00:06.751298	cancelled	0
2	11	3	VTP0001	2026-03-21 17:33:10.232043	cancelled	0
6	13	2	VTA0003	2026-03-22 02:24:52.501578	completed	0
5	12	2	VTA0002	2026-03-22 02:11:01.101314	cancelled	0
7	14	2	VTA0004	2026-03-22 02:36:24.445859	completed	0
8	14	2	VTA0005	2026-03-22 02:44:46.110759	completed	0
9	14	2	VTA0006	2026-03-22 03:05:53.30599	completed	0
1	10	2	VTA0001	2026-03-21 09:16:19.134676	completed	0
10	15	2	VTA0007	2026-03-23 00:37:45.053577	completed	0
11	22	3	VTP0003	2026-03-23 00:46:49.558593	completed	0
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: adminhv
--

COPY public.order_items (id, customer_id, description, quantity, unit_price, total, created_at, order_code_id) FROM stdin;
2	10	sp	100	150000	15000000	2026-03-21 09:19:56.419071	1
4	11	ÁO CỘC TAY	100	150000	15000000	2026-03-22 02:00:06.741288	2
5	12	ÁO PHÔNG	40	150000	6000000	2026-03-22 02:11:01.110304	5
6	13	ÁO DPD	80	150000	12000000	2026-03-22 02:24:52.508391	6
7	14	ĐỒNG PHỤC	50	125000	6250000	2026-03-22 02:36:24.454087	7
8	14	DONG PHUC	100	150000	15000000	2026-03-22 02:44:46.119339	8
9	14	DONG PHUC	100	1500000	150000000	2026-03-22 03:05:53.315509	9
10	15	ÁO MẮT CHIM	1000	100000	100000000	2026-03-23 00:37:45.06639	10
11	22	DONG PHUC	2000	150000	300000000	2026-03-23 00:46:49.56568	11
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: adminhv
--

COPY public.permissions (id, target_type, target_id, feature, can_view, can_create, can_edit, can_delete) FROM stdin;
646	department	20	crm_nhu_cau	1	1	1	1
647	department	20	chuyen_so	1	1	1	0
648	department	21	crm_nhu_cau	1	1	1	1
649	department	21	chuyen_so	1	1	1	0
650	user	13	crm_nhu_cau	1	1	1	1
651	user	13	chuyen_so	1	1	1	0
652	user	14	crm_nhu_cau	1	1	1	1
653	user	14	chuyen_so	1	1	1	0
654	user	15	crm_nhu_cau	1	1	1	1
655	user	15	chuyen_so	1	1	1	0
61	user	8	tong_quan	1	0	0	0
62	user	8	so_hom_nay	1	0	0	0
63	user	8	crm_nhu_cau	1	1	1	1
64	user	8	crm_ctv	1	1	1	1
65	user	8	crm_hoa_hong	1	1	1	1
66	user	8	crm_nuoi_duong	1	1	1	1
67	user	8	crm_sinh_vien	1	1	1	1
68	user	8	affiliate_hv	1	0	0	0
69	user	8	huy_khach	1	0	0	1
70	user	8	nhan_vien	1	1	1	1
71	user	8	co_cau_to_chuc	1	1	1	1
72	user	8	phan_quyen	1	0	1	0
73	user	8	cap_cuu_sep	1	1	1	0
74	user	8	chuyen_so	1	1	1	0
75	user	8	cai_dat	1	0	1	0
391	department	10	tong_quan	1	0	0	0
392	department	10	so_hom_nay	1	0	0	0
393	department	10	crm_nhu_cau	1	1	1	1
394	department	10	crm_ctv	1	1	1	1
395	department	10	crm_hoa_hong	1	1	1	1
396	department	10	crm_nuoi_duong	1	1	1	1
397	department	10	crm_sinh_vien	1	1	1	1
398	department	10	affiliate_hv	1	0	0	0
399	department	10	huy_khach	1	0	0	1
400	department	10	nhan_vien	1	1	1	1
401	department	10	co_cau_to_chuc	1	1	1	1
402	department	10	phan_quyen	1	0	1	0
403	department	10	cap_cuu_sep	1	1	1	0
404	department	10	chuyen_so	1	1	1	0
405	department	10	cai_dat	1	0	1	0
406	department	1	tong_quan	1	0	0	0
407	department	1	so_hom_nay	1	0	0	0
408	department	1	crm_nhu_cau	1	1	1	1
409	department	1	crm_ctv	1	1	1	1
410	department	1	crm_hoa_hong	1	1	1	1
411	department	1	crm_nuoi_duong	1	1	1	1
412	department	1	crm_sinh_vien	1	1	1	1
413	department	1	affiliate_hv	1	0	0	0
414	department	1	huy_khach	1	0	0	1
415	department	1	nhan_vien	1	1	1	1
416	department	1	co_cau_to_chuc	1	1	1	1
417	department	1	phan_quyen	1	0	1	0
418	department	1	cap_cuu_sep	1	1	1	0
419	department	1	chuyen_so	1	1	1	0
420	department	1	cai_dat	1	0	1	0
421	department	2	tong_quan	1	0	0	0
422	department	2	so_hom_nay	1	0	0	0
423	department	2	crm_nhu_cau	1	1	1	1
424	department	2	crm_ctv	1	1	1	1
425	department	2	crm_hoa_hong	1	1	1	1
426	department	2	crm_nuoi_duong	1	1	1	1
427	department	2	crm_sinh_vien	1	1	1	1
428	department	2	affiliate_hv	1	0	0	0
429	department	2	huy_khach	1	0	0	1
430	department	2	nhan_vien	1	1	1	1
431	department	2	co_cau_to_chuc	1	1	1	1
432	department	2	phan_quyen	1	0	1	0
433	department	2	cap_cuu_sep	1	1	1	0
434	department	2	chuyen_so	1	1	1	0
435	department	2	cai_dat	1	0	1	0
436	department	3	tong_quan	1	0	0	0
437	department	3	so_hom_nay	1	0	0	0
438	department	3	crm_nhu_cau	1	1	1	1
439	department	3	crm_ctv	1	1	1	1
440	department	3	crm_hoa_hong	1	1	1	1
441	department	3	crm_nuoi_duong	1	1	1	1
442	department	3	crm_sinh_vien	1	1	1	1
443	department	3	affiliate_hv	1	0	0	0
444	department	3	huy_khach	1	0	0	1
445	department	3	nhan_vien	1	1	1	1
446	department	3	co_cau_to_chuc	1	1	1	1
447	department	3	phan_quyen	1	0	1	0
448	department	3	cap_cuu_sep	1	1	1	0
449	department	3	chuyen_so	1	1	1	0
450	department	3	cai_dat	1	0	1	0
451	department	4	tong_quan	1	0	0	0
452	department	4	so_hom_nay	1	0	0	0
453	department	4	crm_nhu_cau	1	1	1	1
454	department	4	crm_ctv	1	1	1	1
455	department	4	crm_hoa_hong	1	1	1	1
456	department	4	crm_nuoi_duong	1	1	1	1
457	department	4	crm_sinh_vien	1	1	1	1
458	department	4	affiliate_hv	1	0	0	0
459	department	4	huy_khach	1	0	0	1
460	department	4	nhan_vien	1	1	1	1
461	department	4	co_cau_to_chuc	1	1	1	1
462	department	4	phan_quyen	1	0	1	0
463	department	4	cap_cuu_sep	1	1	1	0
464	department	4	chuyen_so	1	1	1	0
465	department	4	cai_dat	1	0	1	0
466	department	5	tong_quan	1	0	0	0
467	department	5	so_hom_nay	1	0	0	0
468	department	5	crm_nhu_cau	1	1	1	1
469	department	5	crm_ctv	1	1	1	1
470	department	5	crm_hoa_hong	1	1	1	1
471	department	5	crm_nuoi_duong	1	1	1	1
472	department	5	crm_sinh_vien	1	1	1	1
473	department	5	affiliate_hv	1	0	0	0
474	department	5	huy_khach	1	0	0	1
475	department	5	nhan_vien	1	1	1	1
476	department	5	co_cau_to_chuc	1	1	1	1
477	department	5	phan_quyen	1	0	1	0
478	department	5	cap_cuu_sep	1	1	1	0
479	department	5	chuyen_so	1	1	1	0
480	department	5	cai_dat	1	0	1	0
481	department	6	tong_quan	1	0	0	0
482	department	6	so_hom_nay	1	0	0	0
483	department	6	crm_nhu_cau	1	1	1	1
484	department	6	crm_ctv	1	1	1	1
485	department	6	crm_hoa_hong	1	1	1	1
486	department	6	crm_nuoi_duong	1	1	1	1
487	department	6	crm_sinh_vien	1	1	1	1
488	department	6	affiliate_hv	1	0	0	0
489	department	6	huy_khach	1	0	0	1
490	department	6	nhan_vien	1	1	1	1
491	department	6	co_cau_to_chuc	1	1	1	1
492	department	6	phan_quyen	1	0	1	0
493	department	6	cap_cuu_sep	1	1	1	0
494	department	6	chuyen_so	1	1	1	0
495	department	6	cai_dat	1	0	1	0
496	department	16	tong_quan	1	0	0	0
497	department	16	so_hom_nay	1	0	0	0
498	department	16	crm_nhu_cau	1	1	1	1
499	department	16	crm_ctv	1	1	1	1
500	department	16	crm_hoa_hong	1	1	1	1
501	department	16	crm_nuoi_duong	1	1	1	1
502	department	16	crm_sinh_vien	1	1	1	1
503	department	16	affiliate_hv	1	0	0	0
504	department	16	huy_khach	1	0	0	1
505	department	16	nhan_vien	1	1	1	1
506	department	16	co_cau_to_chuc	1	1	1	1
507	department	16	phan_quyen	1	0	1	0
508	department	16	cap_cuu_sep	1	1	1	0
509	department	16	chuyen_so	1	1	1	0
510	department	16	cai_dat	1	0	1	0
511	department	19	tong_quan	1	0	0	0
512	department	19	so_hom_nay	1	0	0	0
513	department	19	crm_nhu_cau	1	1	1	1
514	department	19	crm_ctv	1	1	1	1
515	department	19	crm_hoa_hong	1	1	1	1
516	department	19	crm_nuoi_duong	1	1	1	1
517	department	19	crm_sinh_vien	1	1	1	1
518	department	19	affiliate_hv	1	0	0	0
519	department	19	huy_khach	1	0	0	1
520	department	19	nhan_vien	1	1	1	1
521	department	19	co_cau_to_chuc	1	1	1	1
522	department	19	phan_quyen	1	0	1	0
523	department	19	cap_cuu_sep	1	1	1	0
524	department	19	chuyen_so	1	1	1	0
525	department	19	cai_dat	1	0	1	0
526	department	17	tong_quan	1	0	0	0
527	department	17	so_hom_nay	1	0	0	0
528	department	17	crm_nhu_cau	1	1	1	1
529	department	17	crm_ctv	1	1	1	1
530	department	17	crm_hoa_hong	1	1	1	1
531	department	17	crm_nuoi_duong	1	1	1	1
532	department	17	crm_sinh_vien	1	1	1	1
533	department	17	affiliate_hv	1	0	0	0
534	department	17	huy_khach	1	0	0	1
535	department	17	nhan_vien	1	1	1	1
536	department	17	co_cau_to_chuc	1	1	1	1
537	department	17	phan_quyen	1	0	1	0
538	department	17	cap_cuu_sep	1	1	1	0
539	department	17	chuyen_so	1	1	1	0
540	department	17	cai_dat	1	0	1	0
541	user	9	tong_quan	1	0	0	0
542	user	9	so_hom_nay	1	0	0	0
543	user	9	crm_nhu_cau	1	1	1	1
544	user	9	crm_ctv	1	1	1	1
545	user	9	crm_hoa_hong	1	1	1	1
546	user	9	crm_nuoi_duong	1	1	1	1
547	user	9	crm_sinh_vien	1	1	1	1
548	user	9	affiliate_hv	1	0	0	0
549	user	9	huy_khach	1	0	0	1
550	user	9	nhan_vien	1	1	1	1
551	user	9	co_cau_to_chuc	1	1	1	1
552	user	9	phan_quyen	1	0	1	0
553	user	9	cap_cuu_sep	1	1	1	0
554	user	9	chuyen_so	1	1	1	0
555	user	9	cai_dat	1	0	1	0
556	user	4	tong_quan	1	0	0	0
557	user	4	so_hom_nay	1	0	0	0
558	user	4	crm_nhu_cau	1	1	1	1
559	user	4	crm_ctv	1	1	1	1
560	user	4	crm_hoa_hong	1	1	1	1
561	user	4	crm_nuoi_duong	1	1	1	1
562	user	4	crm_sinh_vien	1	1	1	1
563	user	4	affiliate_hv	1	0	0	0
564	user	4	huy_khach	1	0	0	1
565	user	4	nhan_vien	1	1	1	1
566	user	4	co_cau_to_chuc	1	1	1	1
567	user	4	phan_quyen	1	0	1	0
568	user	4	cap_cuu_sep	1	1	1	0
569	user	4	chuyen_so	1	1	1	0
570	user	4	cai_dat	1	0	1	0
571	user	3	tong_quan	1	0	0	0
572	user	3	so_hom_nay	1	0	0	0
573	user	3	crm_nhu_cau	1	1	1	1
574	user	3	crm_ctv	1	1	1	1
575	user	3	crm_hoa_hong	1	1	1	1
576	user	3	crm_nuoi_duong	1	1	1	1
577	user	3	crm_sinh_vien	1	1	1	1
578	user	3	affiliate_hv	1	0	0	0
579	user	3	huy_khach	1	0	0	1
580	user	3	nhan_vien	1	1	1	1
581	user	3	co_cau_to_chuc	1	1	1	1
582	user	3	phan_quyen	1	0	1	0
583	user	3	cap_cuu_sep	1	1	1	0
584	user	3	chuyen_so	1	1	1	0
585	user	3	cai_dat	1	0	1	0
586	user	2	tong_quan	1	0	0	0
587	user	2	so_hom_nay	1	0	0	0
588	user	2	crm_nhu_cau	1	1	1	1
589	user	2	crm_ctv	1	1	1	1
590	user	2	crm_hoa_hong	1	1	1	1
591	user	2	crm_nuoi_duong	1	1	1	1
592	user	2	crm_sinh_vien	1	1	1	1
593	user	2	affiliate_hv	1	0	0	0
594	user	2	huy_khach	1	0	0	1
595	user	2	nhan_vien	1	1	1	1
596	user	2	co_cau_to_chuc	1	1	1	1
597	user	2	phan_quyen	1	0	1	0
598	user	2	cap_cuu_sep	1	1	1	0
599	user	2	chuyen_so	1	1	1	0
600	user	2	cai_dat	1	0	1	0
601	user	6	tong_quan	1	0	0	0
602	user	6	so_hom_nay	1	0	0	0
603	user	6	crm_nhu_cau	1	1	1	1
604	user	6	crm_ctv	1	1	1	1
605	user	6	crm_hoa_hong	1	1	1	1
606	user	6	crm_nuoi_duong	1	1	1	1
607	user	6	crm_sinh_vien	1	1	1	1
608	user	6	affiliate_hv	1	0	0	0
609	user	6	huy_khach	1	0	0	1
610	user	6	nhan_vien	1	1	1	1
611	user	6	co_cau_to_chuc	1	1	1	1
612	user	6	phan_quyen	1	0	1	0
613	user	6	cap_cuu_sep	1	1	1	0
614	user	6	chuyen_so	1	1	1	0
615	user	6	cai_dat	1	0	1	0
616	user	7	tong_quan	1	0	0	0
617	user	7	so_hom_nay	1	0	0	0
618	user	7	crm_nhu_cau	1	1	1	1
619	user	7	crm_ctv	1	1	1	1
620	user	7	crm_hoa_hong	1	1	1	1
621	user	7	crm_nuoi_duong	1	1	1	1
622	user	7	crm_sinh_vien	1	1	1	1
623	user	7	affiliate_hv	1	0	0	0
624	user	7	huy_khach	1	0	0	1
625	user	7	nhan_vien	1	1	1	1
626	user	7	co_cau_to_chuc	1	1	1	1
627	user	7	phan_quyen	1	0	1	0
628	user	7	cap_cuu_sep	1	1	1	0
629	user	7	chuyen_so	1	1	1	0
630	user	7	cai_dat	1	0	1	0
\.


--
-- Data for Name: prize_award_comments; Type: TABLE DATA; Schema: public; Owner: adminhv
--

COPY public.prize_award_comments (id, award_id, user_id, user_name, comment_text, created_at) FROM stdin;
1	2	1	Giám Đốc	quá ok	2026-03-24 00:11:20.430022
2	2	1	Giám Đốc	💪	2026-03-24 00:11:22.252363
3	2	1	Giám Đốc	34	2026-03-24 00:12:17.420655
4	2	1	Giám Đốc	⭐	2026-03-24 00:12:18.476109
5	2	1	Giám Đốc	🥳	2026-03-24 00:12:19.396037
6	2	1	Giám Đốc	👑	2026-03-24 00:12:20.484427
7	2	1	Giám Đốc	⭐	2026-03-24 00:12:21.269921
8	2	1	Giám Đốc	🥳⭐💪	2026-03-24 00:12:24.005262
9	1	1	Giám Đốc	134	2026-03-24 00:53:57.181691
10	1	1	Giám Đốc	⭐	2026-03-24 00:53:58.076193
\.


--
-- Data for Name: prize_award_views; Type: TABLE DATA; Schema: public; Owner: adminhv
--

COPY public.prize_award_views (id, award_id, user_id, has_commented, viewed_at) FROM stdin;
1	2	1	t	2026-03-24 00:12:14.364009
11	1	1	t	2026-03-24 00:46:11.26282
\.


--
-- Data for Name: prize_awards; Type: TABLE DATA; Schema: public; Owner: adminhv
--

COPY public.prize_awards (id, board_key, month, top_rank, winner_type, winner_user_id, winner_team_id, winner_name, prize_amount, prize_description, photo_winner, photo_certificate, awarded_by, awarded_at) FROM stdin;
1	employeeOrders	2026-03	2	individual	8	\N	quanlyxuong	1000000		/uploads/prizes/photo_winner_1774283735417_mrxhjmitvqo.jpg	/uploads/prizes/photo_certificate_1774283735735_qqvgos71ox.png	1	2026-03-23 23:35:35.752657
2	employeeOrders	2026-03	1	individual	8	\N	quanlyxuong	1000000		/uploads/prizes/photo_winner_1774283914717_9km0eeglojf.jpg	/uploads/prizes/photo_certificate_1774283914719_9eql363nkaw.jpg	1	2026-03-23 23:38:34.722482
3	employeeOrders	2026-03	3	individual	8	\N	quanlyxuong	1000000		/uploads/prizes/photo_winner_1774286568675_yaclre2wrmc.jpg	/uploads/prizes/photo_certificate_1774286568677_2ff6bwdx0ln.jpg	1	2026-03-24 00:22:48.679722
\.


--
-- Data for Name: settings_industries; Type: TABLE DATA; Schema: public; Owner: adminhv
--

COPY public.settings_industries (id, name, created_at) FROM stdin;
1	CÔNG TY	2026-03-20 16:14:04.125586
2	ÁO LỚP	2026-03-20 16:14:07.057314
3	BẢO HỘ LAO ĐỘNG	2026-03-20 16:14:10.794571
\.


--
-- Data for Name: settings_job_titles; Type: TABLE DATA; Schema: public; Owner: adminhv
--

COPY public.settings_job_titles (id, crm_type, name, created_at) FROM stdin;
1	nuoi_duong	Nhân Sự	2026-03-23 03:26:15.729716
2	nuoi_duong	Kế Toán	2026-03-23 03:26:20.216
3	nuoi_duong	Phòng Mua Hàng	2026-03-23 03:26:24.911279
4	sinh_vien	Thể Thao	2026-03-23 03:26:29.952312
5	sinh_vien	Thời Trang LocalBrand	2026-03-23 03:26:35.85661
6	qua_tang	Quà Tặng	2026-03-23 03:26:41.302659
7	qua_tang	Sự Kiện	2026-03-23 03:26:45.107361
8	qua_tang	Du Lịch	2026-03-23 03:26:48.33222
10	koc_tiktok	KOL Tiktok	2026-03-23 03:27:04.570726
11	hoa_hong_crm	Giáo Viên	2026-03-23 03:27:09.03391
12	hoa_hong_crm	Học Sinh	2026-03-23 03:27:11.866582
13	hoa_hong_crm	Sinh Viên	2026-03-23 03:27:15.354548
14	nguoi_than	Người Thân	2026-03-23 03:27:23.699273
15	nguoi_than	Bạn Bè	2026-03-23 03:27:26.51096
16	koc_tiktok	Mẹ Bỉm Sữa	2026-03-23 03:32:16.576054
17	affiliate	Affiliate Giới Thiệu	2026-03-23 03:37:45.542342
\.


--
-- Data for Name: settings_promotions; Type: TABLE DATA; Schema: public; Owner: adminhv
--

COPY public.settings_promotions (id, name, created_at) FROM stdin;
\.


--
-- Data for Name: settings_sources; Type: TABLE DATA; Schema: public; Owner: adminhv
--

COPY public.settings_sources (id, name, created_at) FROM stdin;
1	GỌI ĐIỆN	2026-03-20 16:13:30.880215
2	KHÁCH CŨ	2026-03-20 16:13:39.780453
3	FACEBOOK	2026-03-20 16:13:57.960598
4	AFFILIATE GIỚI THIỆU	2026-03-21 08:42:28.760255
\.


--
-- Data for Name: social_handovers; Type: TABLE DATA; Schema: public; Owner: adminhv
--

COPY public.social_handovers (id, user_id, platform, account_name, acc, pass, two_fa, link, note, created_at) FROM stdin;
\.


--
-- Data for Name: team_members; Type: TABLE DATA; Schema: public; Owner: adminhv
--

COPY public.team_members (id, team_id, user_id) FROM stdin;
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: adminhv
--

COPY public.teams (id, name, manager_id, leader_id, created_at) FROM stdin;
\.


--
-- Data for Name: tool_handovers; Type: TABLE DATA; Schema: public; Owner: adminhv
--

COPY public.tool_handovers (id, user_id, tool_name, quantity, handover_date, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: adminhv
--

COPY public.users (id, username, password_hash, full_name, phone, address, role, status, contract_info, start_date, id_card_front, id_card_back, telegram_group_id, commission_tier_id, assigned_to_user_id, balance, bank_name, bank_account, bank_holder, order_code_prefix, contract_file, rules_file, managed_by_user_id, source_customer_id, province, source_crm_type, department_id, birth_date, created_at, updated_at) FROM stdin;
1	admin	$2b$10$sm4VnM62wKJ/6KXUEJswHOtYfCFG5i8WkKOlqVCHp75pQUOl5w1Km	Giám Đốc	\N	\N	giam_doc	active	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-03-20 14:50:27.546003	2026-03-20 14:50:27.546003
8	quanlyxuong	$2b$10$qcmpVkCDG2kcIx0CG7Pp2emKpEu.zHuMqPLsrPwuN0hPz7BQBwp62	quanlyxuong	0923332333	hà nội	pho_giam_doc	active	\N	2026-03-20	/uploads/idcards/8_id_card_front_1774031354838.jpg	/uploads/idcards/8_id_card_back_1774031354839.png	\N	\N	\N	0	\N	\N	\N	\N	/uploads/contracts/8_contract_file_1774031354826.pdf	/uploads/contracts/8_rules_file_1774031354830.pdf	\N	\N	Hà Nội	\N	11	1995-03-21	2026-03-20 18:29:14.819304	2026-03-23 02:43:47.729089
4	quanly1	$2b$10$y0gZzXRbgpuKR5OfAubCf.IHzfEAhWBqj63iwDBa6F1y/eEctXxHK	quanly1	0923332489	hà nội	quan_ly	active	\N	2026-03-20	/uploads/idcards/4_id_card_front_1774022733048.jpg	/uploads/idcards/4_id_card_back_1774022733048.png	\N	\N	\N	0	\N	\N	\N	VTQ	/uploads/contracts/4_contract_file_1774022733040.pdf	/uploads/contracts/4_rules_file_1774022733043.pdf	\N	\N	Hà Nội	\N	1	1994-12-25	2026-03-20 16:05:33.03284	2026-03-20 18:11:13.235958
3	truongphong1	$2b$10$K84LvFh3MU5GEHOjC0hdDeD3/U1QVVUQpBE8RmoDIzpGQhLOLOcQm	truongphong1	0921452333	hà nội	truong_phong	active	\N	2026-03-20	/uploads/idcards/3_id_card_front_1774022691413.jpg	/uploads/idcards/3_id_card_back_1774022691417.jpg	\N	\N	\N	0	\N	\N	\N	VTP	/uploads/contracts/3_contract_file_1774022691402.pdf	/uploads/contracts/3_rules_file_1774022691405.pdf	\N	\N	Hà Nội	\N	2	1996-10-23	2026-03-20 16:04:51.39671	2026-03-20 16:04:51.439056
2	nhanvien	$2b$10$r6Ad0//gj/2vwXIZDSJmSOmRY2iKhidHcBSMHeFDA47ZL0JEPUzfq	nhanvien	0921342669	hà nội	nhan_vien	active	\N	2026-03-20	/uploads/idcards/2_id_card_front_1774022613756.png	/uploads/idcards/2_id_card_back_1774022613767.jpg	\N	\N	\N	0	\N	\N	\N	VTA	/uploads/contracts/2_contract_file_1774022613746.pdf	/uploads/contracts/2_rules_file_1774022613749.pdf	\N	\N	Hà Nội	\N	2	1999-03-21	2026-03-20 16:03:33.739505	2026-03-20 18:15:26.131622
6	truongphong2	$2b$10$rgHU9RbqxO46sCIfW6RKSeE2Spj60F0fme5Ue.JX38EqyDgPWWaPa	truongphong2	0923562243	hà nội	truong_phong	active	\N	2026-03-20	/uploads/idcards/6_id_card_front_1774024296410.png	/uploads/idcards/6_id_card_back_1774024296432.jpg	\N	\N	\N	0	\N	\N	\N	VVY	/uploads/contracts/6_contract_file_1774024296387.pdf	/uploads/contracts/6_rules_file_1774024296398.pdf	\N	\N	Kon Tum	\N	3	1996-11-23	2026-03-20 16:31:36.358963	2026-03-20 16:31:36.447603
7	nhanvien2	$2b$10$UbvwW1Qmwe1M1QR17XMWJeBPte8dOGUzdvfj3gf9FOuP1O86J6Bcm	nhanvien2	0923659873	hà nội	nhan_vien	active	\N	2026-03-20	/uploads/idcards/7_id_card_front_1774024341060.jpg	/uploads/idcards/7_id_card_back_1774024341276.png	\N	\N	\N	0	\N	\N	\N	VUY	/uploads/contracts/7_contract_file_1774024341049.pdf	/uploads/contracts/7_rules_file_1774024341052.pdf	\N	\N	Quảng Ngãi	\N	3	1988-02-11	2026-03-20 16:32:21.052936	2026-03-20 16:32:21.300844
9	trinh	$2b$10$y.9sawtLHInqHeBA8uPDruQKzML0WIspZxZqWCPha/RnswSa0h39a	Lê Việt Trinh	0966366694	hà nội	trinh	active	\N	2026-03-20	/uploads/idcards/9_id_card_front_1774035000851.png	/uploads/idcards/9_id_card_back_1774035000853.jpg	\N	\N	\N	0	\N	\N	\N	BON	/uploads/contracts/9_contract_file_1774035000842.pdf	/uploads/contracts/9_rules_file_1774035000846.pdf	\N	\N	Hà Nội	\N	10	1994-05-21	2026-03-20 19:30:00.835467	2026-03-21 05:25:53.686975
15	affiliate3	$2b$10$Ro2NmbYWPFdeqKhD1Ax6l.aUl9DfXf6ffQBQgOQkuI2x/R.On5ql6	NHU CẦU 2	0912546999	hn	tkaffiliate	active	\N	\N	\N	\N	\N	\N	14	0	\N	\N	\N	\N	\N	\N	2	2	Bình Dương	nhu_cau	21	\N	2026-03-21 05:02:40.788989	2026-03-21 05:02:40.788989
16	ketoan	$2b$10$UsNgfK5TaPsYJixSiHbsae2AswzB.aGBKqxQ6ia896ahdIGACgSVi	Kế Toán	0966366695	hà nội	ke_toan	active	\N	2026-03-21	/uploads/idcards/16_id_card_front_1774072132786.jpg	/uploads/idcards/16_id_card_back_1774072132787.png	\N	\N	\N	0	\N	\N	\N	\N	/uploads/contracts/16_contract_file_1774072132775.pdf	/uploads/contracts/16_rules_file_1774072132779.pdf	\N	\N	Ninh Thuận	\N	16	1994-10-22	2026-03-21 05:48:52.764078	2026-03-21 05:48:53.090558
22	affiliatequanly1	$2b$10$Di/b6NUIiY1ENfIsaQL2AewWenXWwvK0K39oDtR3XHmNxNP/sunE6	KH QUẢN LÝ 1	0936656123	dak	tkaffiliate	active	\N	\N	\N	\N	\N	5	\N	0	\N	\N	\N	\N	\N	\N	4	23	Đắk Nông	nhu_cau	21	\N	2026-03-22 13:56:44.921328	2026-03-22 13:56:44.921328
17	thuquy	$2b$10$1Dmexladt4.IWik3Pn4zyuEuL5Ld6eRGB7yHG8X0s.xOsuHIg4Cci	Thủ Quỹ	0966366696	cần thơ	thu_quy	active	\N	2026-03-21	/uploads/idcards/17_id_card_front_1774072224564.jpg	/uploads/idcards/17_id_card_back_1774072224565.png	\N	\N	\N	0	\N	\N	\N	\N	/uploads/contracts/17_contract_file_1774072224555.pdf	/uploads/contracts/17_rules_file_1774072224558.pdf	\N	\N	Cần Thơ	\N	19	1999-10-22	2026-03-21 05:50:24.549913	2026-03-21 05:50:24.572866
14	affiliate2	$2b$10$4c81Qthmnl4L/TzG7Zw1mO7/tZJulFCghAojizrTf/uMdovpVFIZS	CTV1	0912654658	bình dương	tkaffiliate	active	\N	\N	\N	\N	\N	4	13	0	\N	\N	\N	\N	\N	\N	2	3	Cà Mau	ctv	21	\N	2026-03-21 05:02:14.620847	2026-03-22 12:32:35.680146
20	trinhaffiliate2	$2b$10$TH3kaBUPuLaQmBRkRS16KeY/CHrYpaNeoGoTmihgwmfiBKxpxrmBC	KH TRINH 2	0966355694	bình dương ctv1	tkaffiliate	active	\N	\N	\N	\N	\N	5	19	0	\N	\N	\N	\N	\N	\N	9	20	Bình Dương	nhu_cau	21	\N	2026-03-22 13:22:04.856117	2026-03-22 14:20:22.108318
18	affiliatenv2	$2b$10$x8egVz/HPRtsW55o0QjplOsChvXdQCMgIkNyeUWoyCCHkw4omD7v.	trinhaffiliate1313	0923456333	134134134	tkaffiliate	active	\N	\N	\N	\N	\N	4	\N	0	\N	\N	\N	\N	\N	\N	7	18	Đắk Nông	nhu_cau	21	\N	2026-03-22 03:37:31.83449	2026-03-22 12:32:50.51102
23	affiliatequanly2	$2b$10$tP63YJNX5Iqk8615cHMLm.7y0tJnMqHwJ7UDsQknsnh8K50D7Cn7W	KH QUẢN LÝ 2	0965656598	dak	tkaffiliate	active	\N	\N	\N	\N	\N	5	22	0	\N	\N	\N	\N	\N	\N	4	24	Đắk Lắk	nhu_cau	21	\N	2026-03-22 13:59:28.534664	2026-03-22 13:59:28.534664
13	affiliate1	$2b$10$Gi8a5u./JPY1J6q9L1.Rp.tZfi9PetrHBp7fivIDxFTlfBXwZ7aUS	KHÁCH 1	0923343789	123789	tkaffiliate	active	\N	\N	\N	\N	\N	4	\N	1500000	Vietcombank	23109388	Trương Việt	\N	\N	\N	2	1	Gia Lai	nhu_cau	21	\N	2026-03-21 04:50:09.0235	2026-03-22 23:18:12.523831
21	affiliatetruongphong1	$2b$10$p6JhXfIXqTYPCtpltvvhBeQzn90sur4zu5gKLNNpDEK4csMxhA.eG	KHTP2	0966255123	HCM1123	tkaffiliate	active	\N	\N	\N	\N	\N	5	\N	45000000	\N	\N	\N	\N	\N	\N	3	11	Cà Mau	nhu_cau	21	\N	2026-03-22 13:48:12.040583	2026-03-22 13:48:52.901428
24	affiliatetrinh3	$2b$10$8GOFMw0927PAm0nCDUkEUuz0VZiIfPHU5KVeX0DwBMf6a69O94BYK	TRINH KH 2	0912565698	bình dương	tkaffiliate	active	\N	\N	\N	\N	\N	6	20	0	\N	\N	\N	\N	\N	\N	9	21	Điện Biên	nhu_cau	21	2026-03-28	2026-03-23 01:28:32.869589	2026-03-23 01:28:32.869589
19	affiliatetrinh1	$2b$10$Qr1GjGiU7XmIg609UjEKb.K5qb4YGqa9z0FY92FMdZttWozZozau6	KH TRINH 1	0966588598	bình dương	tkaffiliate	active	\N	\N	\N	\N	\N	4	\N	0	\N	\N	\N	\N	\N	\N	9	19	Tiền Giang	nhu_cau	21	\N	2026-03-22 12:45:48.569221	2026-03-23 02:32:13.177335
\.


--
-- Data for Name: withdrawal_requests; Type: TABLE DATA; Schema: public; Owner: adminhv
--

COPY public.withdrawal_requests (id, user_id, amount, bank_name, bank_account, bank_holder, status, approved_by, approved_at, created_at, reject_reason, transfer_image) FROM stdin;
1	13	5000000	Vietcombank	23109388	Trương Việt	approved	1	2026-03-22 22:06:00.306092+07	2026-03-22 22:05:27.246133	\N	data:image/png;base64,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
2	13	500000	Vietcombank	23109388	Trương Việt	approved	1	2026-03-22 22:10:07.59924+07	2026-03-22 22:09:52.614193	\N	data:image/png;base64,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
3	13	150000	Vietcombank	23109388	Trương Việt	approved	1	2026-03-22 22:49:21.049535+07	2026-03-22 22:48:00.323143	\N	data:image/png;base64,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
4	13	200000	Vietcombank	23109388	Trương Việt	approved	1	2026-03-22 23:00:32.963134+07	2026-03-22 22:59:17.005345	\N	data:image/png;base64,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
5	13	150000	Vietcombank	23109388	Trương Việt	approved	1	2026-03-22 23:06:59.175785+07	2026-03-22 23:06:34.003596	\N	data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAXkAAADXCAIAAABwALZAAAAQAElEQVR4Aeyd+5dc1XXn92m1nggsIwESSDaSkHhJyIBxYhCQ5IessNasrAmxnQfkQf8wf9L8KPKAJHYSyMqsiT3JrEwCMsnwiAEJCC1kwBIgkAABoiW1urvy2Wefe+rUraquR3ejfuyr7/3e79lnn33v/Ra961ZJbY/8D9/cAXfAHVh4B0am3jzkcAfcAXdgoR0YGb15zOEOuAPuwEI7MCK+uQNL0wG/6qXlgPeapfV6+dW6A0vVAe81S/WV8+t2B5aWA95rltbr5VfrDixVB7zXNF85V+6AO7BwDnivWThvvbI74A40HfBe0/TClTvgDiycA95rFs5br+wOfFUOLIXzeK9ZCq+SX6M7sPQd8F6z9F9DvwN3YCk44L1mKbxKfo3uwNJ3wHvN0n8NF+IOvKY7MN8OeK+Zb0e9njvgDnRywHtNJ1c85g64A/PtgPea+XbU67kD7kAnB76qXtPp3B5zB9yBleOA95qV81r7nboDl9MB7zWX030/tzuwchzwXrNyXmu/0+Ec8FXz44D3mvnx0au4A+7A7A54r5ndH591B9yB+XHAe838+OhV3AF3YHYHvNfM7s9CzHpNd2AlOuC9ZiW+6n7P7sBX74D3mq/ecz+jO7ASHfBesxJfdb9nd2A4B+ayynvNXNzzte6AO9CvA95r+nXK89wBd2AuDnivmYt7vtYdcAf6dcB7Tb9Oed5COOA1V44D3mtWzmvtd+oOXE4HvNdcTvf93O7AynHAe83Kea39Tt2By+nAcus1l9NLP7c74A50d8B7TXdvfMYdcAfmzwHvNfPnpVdyB9yB7g54r+nujc+4A1+lA8v9XN5rlvsr7PfnDiwOB7zXLI7Xwa/CHVjuDnivWe6vsN+fO7A4HPBeszheh4W4Cq/pDiwmB7zXLKZXw6/FHVi+DnivWb6vrd+ZO7CYHPBes5heDb8Wd2D5OjBIr1m+LviduQPuwEI74L1moR32+u6AO6AOeK9RF3x3B9yBhXbAe81CO+z1F4MDfg2X3wHvNZf/NfArcAdWggPea1bCq+z36A5cfge811z+18CvwB1YCQ6MTM80HIM74Ka5A0vbgZmZxkyjMVCPI59VQ/+w+HPNQG57sjuwTBygzdBqaBxwz1sixzJZ1TO5W4L3mm7OeNwdWBEO8LRCK5nlVpklZ5aEPqe81/RplKe5A8vEgfbbmL2VzD7bXq1bxHtNN2c87g6sIAe6NZRu8SGs8V4zhGm+xB1Ydg50+yamW3xwA7zXDO6Zr3AHlp0D3VpKt/gQBnivGcI0X9LigA/cgX4c8F7Tj0ue4w64A3N1wHvNXB309e7AynPg4ie/+Pnp8+m+L33y7gfnkm49XDrz7htHj5+ejlHvNdEGJ3fAHRjAgakvP//8nbffvxiXTE2c+8xUHGaaufDlmutuvXXryPlJjS3GXqPX5bs74A4sZgemr9h61afHP7rUvMbGhQ/Hj7z0syOvHD929JUTPPSc//TD42+88vL4+7/45EuRL73XNL1y5Q64A/07sP6G7evff+vDqbRi+vS7p9bvuvvO/QeuXxc70MzIFdffceeBu7+1deTDT2g93muSU35wB9yBwRwIX9t549qTx0/HziKTk1NrN1yhFdavW6+H6UtfnHr91dd+9topnmoIeK/BBIc7ME8OrLQym3btHj317mcz3PeaNaMXJ2JXmZjgKUYmT7/72ZW33XH7nbdvjR1IvNfgksMdcAeGdGDTN69fe0GfbFZd882t59956eXXjpyaXE2xNV+7unH69TePv/7GqS8Yivea6IKTO+AODOLAFTsO7NliC0Y37737rls2izQa62/Ye/e3bt//jSslMHfFDbfvv/2mG2+7bf89B3aslyv8uQZTHO6AOzBnB8LMlyfG+Xuon73+2dd2Xh+/spGRVatyXe812YpFKfyi3IGl4kC4Ytstt/P3UHfecfOOK5stJl++95pshQt3wB2YowPTkxftHwl3qOO9poMpHnIH3IHZHPh0/B/+97OvfJxTpk+88M9/+9y7F04d/dHf//sbEzneIrzXtNjhA3fAHejtwNc3X3Pp3Ou/qJrN1PtvvXNx43Vb11237we/+cu3brACdfZeU3fEx+6AO9DLgc27d6+dfvfDMzFv+v0P35NNN92wVj5683/935fG43PNhfeO/MPf/fiJv/k/f/fc259Ny7njz3uviW45uQPuwCAOXL1j+8ZL77/9EWumf3HytFx7/Q3rRKYvnZ+4OD0jtJZ/eu7Dr337we/9t1+6aeI//+GVjzd+807vNZjlcAfcgQEd2LR158ZLb733sUy9/857csPO7bSaXOLc+6c+W71++tTxl4+e+ERWT39w+pPR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
7	13	250000	Vietcombank	23109388	Trương Việt	approved	1	2026-03-22 23:18:31.598867+07	2026-03-22 23:18:12.527738	\N	data:image/png;base64,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
6	13	145000	Vietcombank	23109388	Trương Việt	rejected	1	2026-03-23 00:30:56.446862+07	2026-03-22 23:06:45.144216	thôi hủy	\N
\.


--
-- Name: commission_tiers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adminhv
--

SELECT pg_catalog.setval('public.commission_tiers_id_seq', 6, true);


--
-- Name: consultation_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adminhv
--

SELECT pg_catalog.setval('public.consultation_logs_id_seq', 81, true);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adminhv
--

SELECT pg_catalog.setval('public.customers_id_seq', 24, true);


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adminhv
--

SELECT pg_catalog.setval('public.departments_id_seq', 22, true);


--
-- Name: emergencies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adminhv
--

SELECT pg_catalog.setval('public.emergencies_id_seq', 2, true);


--
-- Name: leaderboard_prizes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adminhv
--

SELECT pg_catalog.setval('public.leaderboard_prizes_id_seq', 19, true);


--
-- Name: order_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adminhv
--

SELECT pg_catalog.setval('public.order_codes_id_seq', 11, true);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adminhv
--

SELECT pg_catalog.setval('public.order_items_id_seq', 11, true);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adminhv
--

SELECT pg_catalog.setval('public.permissions_id_seq', 655, true);


--
-- Name: prize_award_comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adminhv
--

SELECT pg_catalog.setval('public.prize_award_comments_id_seq', 10, true);


--
-- Name: prize_award_views_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adminhv
--

SELECT pg_catalog.setval('public.prize_award_views_id_seq', 13, true);


--
-- Name: prize_awards_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adminhv
--

SELECT pg_catalog.setval('public.prize_awards_id_seq', 3, true);


--
-- Name: settings_industries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adminhv
--

SELECT pg_catalog.setval('public.settings_industries_id_seq', 3, true);


--
-- Name: settings_job_titles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adminhv
--

SELECT pg_catalog.setval('public.settings_job_titles_id_seq', 17, true);


--
-- Name: settings_promotions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adminhv
--

SELECT pg_catalog.setval('public.settings_promotions_id_seq', 1, false);


--
-- Name: settings_sources_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adminhv
--

SELECT pg_catalog.setval('public.settings_sources_id_seq', 4, true);


--
-- Name: social_handovers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adminhv
--

SELECT pg_catalog.setval('public.social_handovers_id_seq', 1, false);


--
-- Name: team_members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adminhv
--

SELECT pg_catalog.setval('public.team_members_id_seq', 1, false);


--
-- Name: teams_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adminhv
--

SELECT pg_catalog.setval('public.teams_id_seq', 1, false);


--
-- Name: tool_handovers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adminhv
--

SELECT pg_catalog.setval('public.tool_handovers_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adminhv
--

SELECT pg_catalog.setval('public.users_id_seq', 24, true);


--
-- Name: withdrawal_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: adminhv
--

SELECT pg_catalog.setval('public.withdrawal_requests_id_seq', 7, true);


--
-- Name: app_config app_config_pkey; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.app_config
    ADD CONSTRAINT app_config_pkey PRIMARY KEY (key);


--
-- Name: commission_tiers commission_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.commission_tiers
    ADD CONSTRAINT commission_tiers_pkey PRIMARY KEY (id);


--
-- Name: consultation_logs consultation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.consultation_logs
    ADD CONSTRAINT consultation_logs_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: departments departments_code_key; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_code_key UNIQUE (code);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: emergencies emergencies_pkey; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.emergencies
    ADD CONSTRAINT emergencies_pkey PRIMARY KEY (id);


--
-- Name: leaderboard_prizes leaderboard_prizes_board_key_month_top_rank_key; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.leaderboard_prizes
    ADD CONSTRAINT leaderboard_prizes_board_key_month_top_rank_key UNIQUE (board_key, month, top_rank);


--
-- Name: leaderboard_prizes leaderboard_prizes_pkey; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.leaderboard_prizes
    ADD CONSTRAINT leaderboard_prizes_pkey PRIMARY KEY (id);


--
-- Name: order_codes order_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.order_codes
    ADD CONSTRAINT order_codes_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_target_type_target_id_feature_key; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_target_type_target_id_feature_key UNIQUE (target_type, target_id, feature);


--
-- Name: prize_award_comments prize_award_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.prize_award_comments
    ADD CONSTRAINT prize_award_comments_pkey PRIMARY KEY (id);


--
-- Name: prize_award_views prize_award_views_award_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.prize_award_views
    ADD CONSTRAINT prize_award_views_award_id_user_id_key UNIQUE (award_id, user_id);


--
-- Name: prize_award_views prize_award_views_pkey; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.prize_award_views
    ADD CONSTRAINT prize_award_views_pkey PRIMARY KEY (id);


--
-- Name: prize_awards prize_awards_board_key_month_top_rank_key; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.prize_awards
    ADD CONSTRAINT prize_awards_board_key_month_top_rank_key UNIQUE (board_key, month, top_rank);


--
-- Name: prize_awards prize_awards_pkey; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.prize_awards
    ADD CONSTRAINT prize_awards_pkey PRIMARY KEY (id);


--
-- Name: settings_industries settings_industries_pkey; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.settings_industries
    ADD CONSTRAINT settings_industries_pkey PRIMARY KEY (id);


--
-- Name: settings_job_titles settings_job_titles_pkey; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.settings_job_titles
    ADD CONSTRAINT settings_job_titles_pkey PRIMARY KEY (id);


--
-- Name: settings_promotions settings_promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.settings_promotions
    ADD CONSTRAINT settings_promotions_pkey PRIMARY KEY (id);


--
-- Name: settings_sources settings_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.settings_sources
    ADD CONSTRAINT settings_sources_pkey PRIMARY KEY (id);


--
-- Name: social_handovers social_handovers_pkey; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.social_handovers
    ADD CONSTRAINT social_handovers_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_team_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_user_id_key UNIQUE (team_id, user_id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: tool_handovers tool_handovers_pkey; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.tool_handovers
    ADD CONSTRAINT tool_handovers_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: withdrawal_requests withdrawal_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_pkey PRIMARY KEY (id);


--
-- Name: idx_consultation_logs_customer; Type: INDEX; Schema: public; Owner: adminhv
--

CREATE INDEX idx_consultation_logs_customer ON public.consultation_logs USING btree (customer_id);


--
-- Name: idx_consultation_logs_type; Type: INDEX; Schema: public; Owner: adminhv
--

CREATE INDEX idx_consultation_logs_type ON public.consultation_logs USING btree (log_type);


--
-- Name: idx_customers_assigned; Type: INDEX; Schema: public; Owner: adminhv
--

CREATE INDEX idx_customers_assigned ON public.customers USING btree (assigned_to_id);


--
-- Name: idx_customers_crm; Type: INDEX; Schema: public; Owner: adminhv
--

CREATE INDEX idx_customers_crm ON public.customers USING btree (crm_type);


--
-- Name: idx_customers_receiver; Type: INDEX; Schema: public; Owner: adminhv
--

CREATE INDEX idx_customers_receiver ON public.customers USING btree (receiver_id);


--
-- Name: idx_customers_referrer; Type: INDEX; Schema: public; Owner: adminhv
--

CREATE INDEX idx_customers_referrer ON public.customers USING btree (referrer_id);


--
-- Name: idx_customers_referrer_customer; Type: INDEX; Schema: public; Owner: adminhv
--

CREATE INDEX idx_customers_referrer_customer ON public.customers USING btree (referrer_customer_id);


--
-- Name: idx_customers_status; Type: INDEX; Schema: public; Owner: adminhv
--

CREATE INDEX idx_customers_status ON public.customers USING btree (order_status);


--
-- Name: idx_emergencies_status; Type: INDEX; Schema: public; Owner: adminhv
--

CREATE INDEX idx_emergencies_status ON public.emergencies USING btree (status);


--
-- Name: idx_order_items_customer; Type: INDEX; Schema: public; Owner: adminhv
--

CREATE INDEX idx_order_items_customer ON public.order_items USING btree (customer_id);


--
-- Name: idx_pac_award; Type: INDEX; Schema: public; Owner: adminhv
--

CREATE INDEX idx_pac_award ON public.prize_award_comments USING btree (award_id);


--
-- Name: idx_prize_awards_board; Type: INDEX; Schema: public; Owner: adminhv
--

CREATE INDEX idx_prize_awards_board ON public.prize_awards USING btree (board_key, month);


--
-- Name: idx_prize_awards_month; Type: INDEX; Schema: public; Owner: adminhv
--

CREATE INDEX idx_prize_awards_month ON public.prize_awards USING btree (month);


--
-- Name: idx_social_handovers_user; Type: INDEX; Schema: public; Owner: adminhv
--

CREATE INDEX idx_social_handovers_user ON public.social_handovers USING btree (user_id);


--
-- Name: idx_team_members_team; Type: INDEX; Schema: public; Owner: adminhv
--

CREATE INDEX idx_team_members_team ON public.team_members USING btree (team_id);


--
-- Name: idx_team_members_user; Type: INDEX; Schema: public; Owner: adminhv
--

CREATE INDEX idx_team_members_user ON public.team_members USING btree (user_id);


--
-- Name: idx_tool_handovers_user; Type: INDEX; Schema: public; Owner: adminhv
--

CREATE INDEX idx_tool_handovers_user ON public.tool_handovers USING btree (user_id);


--
-- Name: idx_users_assigned_to; Type: INDEX; Schema: public; Owner: adminhv
--

CREATE INDEX idx_users_assigned_to ON public.users USING btree (assigned_to_user_id);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: adminhv
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: adminhv
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- Name: consultation_logs consultation_logs_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.consultation_logs
    ADD CONSTRAINT consultation_logs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: consultation_logs consultation_logs_logged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.consultation_logs
    ADD CONSTRAINT consultation_logs_logged_by_fkey FOREIGN KEY (logged_by) REFERENCES public.users(id);


--
-- Name: customers customers_assigned_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_assigned_to_id_fkey FOREIGN KEY (assigned_to_id) REFERENCES public.users(id);


--
-- Name: customers customers_cancel_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_cancel_approved_by_fkey FOREIGN KEY (cancel_approved_by) REFERENCES public.users(id);


--
-- Name: customers customers_cancel_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_cancel_requested_by_fkey FOREIGN KEY (cancel_requested_by) REFERENCES public.users(id);


--
-- Name: customers customers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: customers customers_industry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_industry_id_fkey FOREIGN KEY (industry_id) REFERENCES public.settings_industries(id);


--
-- Name: customers customers_promotion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.settings_promotions(id);


--
-- Name: customers customers_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id);


--
-- Name: customers customers_referrer_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_referrer_customer_id_fkey FOREIGN KEY (referrer_customer_id) REFERENCES public.customers(id);


--
-- Name: customers customers_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.users(id);


--
-- Name: customers customers_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.settings_sources(id);


--
-- Name: departments departments_head_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_head_user_id_fkey FOREIGN KEY (head_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: departments departments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: emergencies emergencies_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.emergencies
    ADD CONSTRAINT emergencies_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: emergencies emergencies_handler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.emergencies
    ADD CONSTRAINT emergencies_handler_id_fkey FOREIGN KEY (handler_id) REFERENCES public.users(id);


--
-- Name: emergencies emergencies_handover_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.emergencies
    ADD CONSTRAINT emergencies_handover_to_fkey FOREIGN KEY (handover_to) REFERENCES public.users(id);


--
-- Name: emergencies emergencies_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.emergencies
    ADD CONSTRAINT emergencies_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: emergencies emergencies_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.emergencies
    ADD CONSTRAINT emergencies_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);


--
-- Name: leaderboard_prizes leaderboard_prizes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.leaderboard_prizes
    ADD CONSTRAINT leaderboard_prizes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: order_codes order_codes_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.order_codes
    ADD CONSTRAINT order_codes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: order_codes order_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.order_codes
    ADD CONSTRAINT order_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: order_items order_items_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_code_id_fkey FOREIGN KEY (order_code_id) REFERENCES public.order_codes(id);


--
-- Name: prize_award_comments prize_award_comments_award_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.prize_award_comments
    ADD CONSTRAINT prize_award_comments_award_id_fkey FOREIGN KEY (award_id) REFERENCES public.prize_awards(id) ON DELETE CASCADE;


--
-- Name: prize_award_comments prize_award_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.prize_award_comments
    ADD CONSTRAINT prize_award_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: prize_award_views prize_award_views_award_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.prize_award_views
    ADD CONSTRAINT prize_award_views_award_id_fkey FOREIGN KEY (award_id) REFERENCES public.prize_awards(id) ON DELETE CASCADE;


--
-- Name: prize_award_views prize_award_views_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.prize_award_views
    ADD CONSTRAINT prize_award_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: prize_awards prize_awards_awarded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.prize_awards
    ADD CONSTRAINT prize_awards_awarded_by_fkey FOREIGN KEY (awarded_by) REFERENCES public.users(id);


--
-- Name: prize_awards prize_awards_winner_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.prize_awards
    ADD CONSTRAINT prize_awards_winner_team_id_fkey FOREIGN KEY (winner_team_id) REFERENCES public.teams(id);


--
-- Name: prize_awards prize_awards_winner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.prize_awards
    ADD CONSTRAINT prize_awards_winner_user_id_fkey FOREIGN KEY (winner_user_id) REFERENCES public.users(id);


--
-- Name: social_handovers social_handovers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.social_handovers
    ADD CONSTRAINT social_handovers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: teams teams_leader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: teams teams_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tool_handovers tool_handovers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.tool_handovers
    ADD CONSTRAINT tool_handovers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: users users_commission_tier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_commission_tier_id_fkey FOREIGN KEY (commission_tier_id) REFERENCES public.commission_tiers(id) ON DELETE SET NULL;


--
-- Name: users users_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: users users_managed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_managed_by_user_id_fkey FOREIGN KEY (managed_by_user_id) REFERENCES public.users(id);


--
-- Name: users users_source_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_source_customer_id_fkey FOREIGN KEY (source_customer_id) REFERENCES public.customers(id);


--
-- Name: withdrawal_requests withdrawal_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: withdrawal_requests withdrawal_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: adminhv
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 1W77Qne3yc31bC8dbCnfWktnOOOlqOWcIVQmmxOoTYHaKnG7FeIhB5NrIgaYaEz

