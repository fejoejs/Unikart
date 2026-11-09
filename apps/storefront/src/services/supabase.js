import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Subscribes to database changes for catalog and inventory.
 * Triggers callback whenever products, stock_levels, prices, or product_images are modified.
 */
export function subscribeToCatalogChanges(onUpdate) {
  if (!supabase) {
    return () => {};
  }

  try {
    const channel = supabase
      .channel('catalog_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          onUpdate?.(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stock_levels' },
        (payload) => {
          onUpdate?.(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prices' },
        (payload) => {
          onUpdate?.(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_images' },
        (payload) => {
          onUpdate?.(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_variants' },
        (payload) => {
          onUpdate?.(payload);
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.info('[Supabase Realtime] Connected and listening to catalog & variant updates.');
        } else if (err || status === 'CHANNEL_ERROR') {
          console.warn(`[Supabase Realtime] Subscription status: ${status}`, err);
        }
      });

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  } catch (err) {
    console.warn('[Supabase Realtime] Could not subscribe:', err);
    return () => {};
  }
}
