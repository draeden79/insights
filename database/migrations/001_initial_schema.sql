-- Alitar Financial Explorer - Initial Schema
-- Created: 2025-01-28

-- Table: series
CREATE TABLE IF NOT EXISTS series (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    frequency CHAR(1) DEFAULT 'M' COMMENT 'M=Monthly',
    unit VARCHAR(50) NOT NULL COMMENT 'index_points, ratio, etc',
    source_type VARCHAR(50) NOT NULL COMMENT 'shiller, stooq, fred',
    source_config_json JSON NOT NULL,
    transform_config_json JSON,
    status ENUM('active', 'paused') DEFAULT 'active',
    last_success_at DATETIME,
    last_attempt_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: series_points
CREATE TABLE IF NOT EXISTS series_points (
    series_id INT NOT NULL,
    period DATE NOT NULL COMMENT 'First day of month (YYYY-MM-01)',
    value DECIMAL(20, 6) NOT NULL,
    as_of DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'When data was collected',
    meta_json JSON,
    PRIMARY KEY (series_id, period),
    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
    INDEX idx_period (period),
    INDEX idx_series_period (series_id, period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: ingestion_runs
CREATE TABLE IF NOT EXISTS ingestion_runs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    series_id INT NOT NULL,
    run_type ENUM('snapshot', 'incremental', 'reset') NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME,
    status ENUM('success', 'fail', 'running') DEFAULT 'running',
    rows_upserted INT DEFAULT 0,
    error_message TEXT,
    details_json JSON,
    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
    INDEX idx_series_status (series_id, status),
    INDEX idx_started_at (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
