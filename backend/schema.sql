CREATE TABLE users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    api_token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
    upload_window_started_at DATETIME NULL,
    upload_requests INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE wardrobe_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    image_path VARCHAR(100) NOT NULL UNIQUE,
    category ENUM('Tops', 'Bottoms', 'Schuhe', 'Accessoires') NOT NULL,
    color VARCHAR(80) NOT NULL,
    style VARCHAR(80) NOT NULL,
    description VARCHAR(500) NOT NULL,
    color_source ENUM('pixel', 'manual', 'legacy') NOT NULL DEFAULT 'legacy',
    color_coverage DECIMAL(4,3) NULL,
    brightness DECIMAL(4,3) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wardrobe_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_wardrobe_user_created (user_id, created_at),
    INDEX idx_wardrobe_user_category (user_id, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;