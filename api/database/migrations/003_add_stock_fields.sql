-- Migration 003: Add stock_level and reorder_level fields to products table

ALTER TABLE products ADD COLUMN stock_level INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN reorder_level INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_products_stock_reorder ON products(stock_level, reorder_level, name);
