ALTER TABLE wardrobe_items
    ADD COLUMN color_source ENUM('pixel', 'manual', 'legacy') NOT NULL DEFAULT 'legacy',
    ADD COLUMN color_coverage DECIMAL(4,3) NULL,
    ADD COLUMN brightness DECIMAL(4,3) NULL;

ALTER TABLE users
    ADD COLUMN upload_window_started_at DATETIME NULL,
    ADD COLUMN upload_requests INT UNSIGNED NOT NULL DEFAULT 0;