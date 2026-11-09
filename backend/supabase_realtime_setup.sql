-- =========================================================================
-- UNIKART PRODUCTION DATABASE: SUPABASE REALTIME CONFIGURATION SCRIPT
-- =========================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

DO $$
DECLARE
  tbl text;
  tbls text[] := ARRAY['products', 'product_variants', 'stock_levels', 'prices', 'product_images', 'categories', 'orders'];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
    END IF;
    EXECUTE format('ALTER TABLE %I REPLICA IDENTITY FULL', tbl);
  END LOOP;
END $$;
