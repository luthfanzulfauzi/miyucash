-- Migration: 20260625000001_update_default_categories
-- Purpose: Update default expense categories seeded on new tracker creation

CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  -- Default expense categories
  INSERT INTO public.categories (tracker_id, name, type, icon, color, is_default) VALUES
    (NEW.id, 'Makan & Minum',  'expense', 'utensils',    '#F2C4A0', true),
    (NEW.id, 'Transport',      'expense', 'car',         '#B8D4E8', true),
    (NEW.id, 'Arisan',         'expense', 'users',       '#C9B8E8', true),
    (NEW.id, 'Cicilan Mobil',  'expense', 'credit-card', '#F2A8A8', true),
    (NEW.id, 'Ciamis',         'expense', 'map-pin',     '#A8D8B9', true),
    (NEW.id, 'Tasikmalaya',    'expense', 'map-pin',     '#F5E6A3', true),
    (NEW.id, 'Internet',       'expense', 'wifi',        '#B8D4E8', true),
    (NEW.id, 'WFC',            'expense', 'coffee',      '#F2C4A0', true),
    (NEW.id, 'Kosmetik',       'expense', 'sparkles',    '#F2A8A8', true),
    (NEW.id, 'Fashion',        'expense', 'shirt',       '#C9B8E8', true),
    (NEW.id, 'Shampo',         'expense', 'droplets',    '#B8D4E8', true),
    (NEW.id, 'Alat',           'expense', 'wrench',      '#E8E8E8', true),
    (NEW.id, 'Listrik',        'expense', 'zap',         '#F5E6A3', true),
    (NEW.id, 'Grooming',       'expense', 'scissors',    '#A8D8B9', true),
    (NEW.id, 'Rokok',          'expense', 'cigarette',   '#9AAAB8', true),
    (NEW.id, 'Pulsa',          'expense', 'smartphone',  '#B8D4E8', true),
    (NEW.id, 'Netflix',        'expense', 'tv',          '#F2A8A8', true),
    (NEW.id, 'Pijat',          'expense', 'hand',        '#F2C4A0', true),
    (NEW.id, 'Kucing',         'expense', 'cat',         '#F5E6A3', true),
    (NEW.id, 'Tahsin',         'expense', 'book-open',   '#C9B8E8', true);

  -- Default income categories (unchanged)
  INSERT INTO public.categories (tracker_id, name, type, icon, color, is_default) VALUES
    (NEW.id, 'Gaji',      'income', 'briefcase',       '#A8D8B9', true),
    (NEW.id, 'Bonus',     'income', 'gift',            '#F5E6A3', true),
    (NEW.id, 'Freelance', 'income', 'laptop',          '#B8D4E8', true),
    (NEW.id, 'Investasi', 'income', 'trending-up',     '#C9B8E8', true),
    (NEW.id, 'Lainnya',   'income', 'more-horizontal', '#E8E8E8', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
