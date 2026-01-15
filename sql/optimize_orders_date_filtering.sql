-- ============================================================================
-- OPTIMIZE ORDERS DATE FILTERING
-- ============================================================================
-- This index optimizes queries that filter orders by restaurant_id and date range
-- Used by the orders page with date range filters (Today, 7 days, 30 days, All)
--
-- Query pattern being optimized:
--   SELECT * FROM orders 
--   WHERE restaurant_id = ? 
--     AND created_at >= ? 
--     AND created_at <= ? 
--   ORDER BY created_at DESC
-- ============================================================================

-- Composite index for restaurant_id + created_at date range queries
-- This is more efficient than separate indexes for this query pattern
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created_at 
ON orders(restaurant_id, created_at DESC);

-- Note: This index will help with:
-- 1. Filtering orders by restaurant (most common filter)
-- 2. Date range filtering (last 30 days, 7 days, today)
-- 3. Sorting by created_at DESC (default ordering)
--
-- The existing idx_orders_restaurant_id and idx_orders_created_at indexes
-- are still useful for other query patterns, but this composite index
-- is optimal for the date-filtered orders page queries.
