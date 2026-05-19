-- sql/init.sql

-- Extension để dùng gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── USERS ───────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password      VARCHAR(255) NOT NULL,       -- bcrypt hash
  refresh_token VARCHAR(255),                -- bcrypt hash
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW(),
  deleted_at    TIMESTAMP                    -- soft delete
);

-- ─── USER PROFILES ───────────────────────────────────
CREATE TABLE user_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gender        VARCHAR(10),                 -- 'male' | 'female'
  date_of_birth DATE,
  height_cm     NUMERIC(5,1),
  weight_kg     NUMERIC(5,1),

  -- Calculated & stored khi onboarding
  daily_calories NUMERIC(7,1),
  daily_protein  NUMERIC(6,1),
  daily_carbs    NUMERIC(6,1),
  daily_fat      NUMERIC(6,1),

  -- Preferences (PostgreSQL native arrays)
  cuisines      TEXT[],                      -- ['vietnamese','italian',...]
  allergies     TEXT[],                      -- ['peanut','milk',...]
  diet_tags     TEXT[],                      -- ['low-carb','vegetarian',...]

  is_onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- ─── FOODS ───────────────────────────────────────────
CREATE TABLE foods (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id INTEGER UNIQUE,               -- ID gốc từ Food.com dataset
  name        VARCHAR(500) NOT NULL,
  name_vi     VARCHAR(500),
  image_url   VARCHAR(1000),
  ingredients TEXT,

  -- Nutrition per 100g
  calories    NUMERIC(12,1) NOT NULL,
  protein     NUMERIC(12,1) NOT NULL,
  carbs       NUMERIC(12,1) NOT NULL,
  fat         NUMERIC(12,1) NOT NULL,
  fiber       NUMERIC(12,1),
  sugar       NUMERIC(12,1),
  sodium      NUMERIC(12,1),

  tags        TEXT[],                        -- ['vegetarian','quick',...]

  -- NGCF embedding (Phase 6)
  embedding   FLOAT[],

  created_at  TIMESTAMP DEFAULT NOW()
);

-- Full-text search index trên tên món
CREATE INDEX idx_foods_name_fts
  ON foods USING gin(to_tsvector('english', name));

-- ─── MEAL PLANS ──────────────────────────────────────
CREATE TABLE meal_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_id       UUID NOT NULL REFERENCES foods(id),
  scheduled_at  TIMESTAMP NOT NULL,          -- ngày + giờ lên lịch
  quantity_g    NUMERIC(6,1) NOT NULL,        -- gram

  -- Nutrition snapshot tại thời điểm log
  -- (tránh bug khi food data thay đổi sau này)
  calories_snap NUMERIC(7,1) NOT NULL,
  protein_snap  NUMERIC(6,1) NOT NULL,
  carbs_snap    NUMERIC(6,1) NOT NULL,
  fat_snap      NUMERIC(6,1) NOT NULL,

  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW(),
  deleted_at    TIMESTAMP                    -- soft delete
);

CREATE INDEX idx_meal_plans_user_date
  ON meal_plans (user_id, scheduled_at)
  WHERE deleted_at IS NULL;
