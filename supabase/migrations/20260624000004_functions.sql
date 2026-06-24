-- Migration: 20260624000004_functions
-- Purpose: Database functions and triggers

-- ============================================================
-- Auto-create user profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Seed default categories when a new tracker is created
-- ============================================================
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  -- Default expense categories
  INSERT INTO public.categories (tracker_id, name, type, icon, color, is_default) VALUES
    (NEW.id, 'Makan & Minum',     'expense', 'utensils',        '#F2C4A0', true),
    (NEW.id, 'Transport',          'expense', 'car',             '#B8D4E8', true),
    (NEW.id, 'Belanja',            'expense', 'shopping-bag',    '#C9B8E8', true),
    (NEW.id, 'Tagihan & Utilitas', 'expense', 'zap',             '#F5E6A3', true),
    (NEW.id, 'Kesehatan',          'expense', 'heart',           '#F2A8A8', true),
    (NEW.id, 'Hiburan',            'expense', 'tv',              '#A8D8B9', true),
    (NEW.id, 'Pendidikan',         'expense', 'book-open',       '#B8D4E8', true),
    (NEW.id, 'Lainnya',            'expense', 'more-horizontal', '#E8E8E8', true);

  -- Default income categories
  INSERT INTO public.categories (tracker_id, name, type, icon, color, is_default) VALUES
    (NEW.id, 'Gaji',      'income', 'briefcase',       '#A8D8B9', true),
    (NEW.id, 'Bonus',     'income', 'gift',            '#F5E6A3', true),
    (NEW.id, 'Freelance', 'income', 'laptop',          '#B8D4E8', true),
    (NEW.id, 'Investasi', 'income', 'trending-up',     '#C9B8E8', true),
    (NEW.id, 'Lainnya',   'income', 'more-horizontal', '#E8E8E8', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_tracker_created ON public.trackers;
CREATE TRIGGER on_tracker_created
  AFTER INSERT ON public.trackers
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_categories();

-- ============================================================
-- Auto-add owner as first member when tracker is created
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.tracker_members (tracker_id, user_id)
  VALUES (NEW.id, NEW.owner_id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_tracker_created_add_owner ON public.trackers;
CREATE TRIGGER on_tracker_created_add_owner
  AFTER INSERT ON public.trackers
  FOR EACH ROW EXECUTE FUNCTION public.add_owner_as_member();

-- ============================================================
-- Generate random 6-char invite code helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i INT;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    -- Ensure uniqueness
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.trackers WHERE invite_code = code);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;
