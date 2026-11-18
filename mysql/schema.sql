-- Maktab Placement — MySQL 8 / MariaDB Schema (utf8mb4)
-- You can import this via phpMyAdmin OR run `npm run db:push` OR let the server auto-create tables on first API call.

CREATE TABLE IF NOT EXISTS companies (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  country VARCHAR(120) NOT NULL DEFAULT 'Saudi Arabia',
  license_number VARCHAR(120) NULL,
  address TEXT NULL,
  contact_email VARCHAR(255) NULL,
  contact_phone VARCHAR(64) NULL,
  logo_path TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_cv_templates (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  company_id VARCHAR(64) NOT NULL UNIQUE,
  primary_color VARCHAR(32) NOT NULL DEFAULT '#0F172A',
  secondary_color VARCHAR(32) NOT NULL DEFAULT '#F1F5F9',
  accent_color VARCHAR(32) NOT NULL DEFAULT '#0284C7',
  header_text_en TEXT NULL,
  header_text_ar TEXT NULL,
  footer_text_en TEXT NULL,
  footer_text_ar TEXT NULL,
  show_passport_number BOOLEAN NOT NULL DEFAULT TRUE,
  show_salary BOOLEAN NOT NULL DEFAULT TRUE,
  show_border_and_iqama BOOLEAN NOT NULL DEFAULT TRUE,
  visible_fields JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_template_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  uid VARCHAR(128) NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role ENUM('ADMIN', 'EMPLOYEE', 'AGENT') NOT NULL,
  company_id VARCHAR(64) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX users_role_company_idx (role, company_id),
  CONSTRAINT fk_user_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workers (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  worker_code VARCHAR(64) NOT NULL UNIQUE,
  status ENUM('DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'CONTRACTED') NOT NULL DEFAULT 'DRAFT',
  full_name_en VARCHAR(255) NOT NULL,
  full_name_ar VARCHAR(255) NULL,
  date_of_birth DATETIME NOT NULL,
  gender VARCHAR(32) NOT NULL,
  nationality VARCHAR(120) NOT NULL DEFAULT 'Bangladeshi',
  religion VARCHAR(64) NOT NULL,
  marital_status VARCHAR(64) NOT NULL,
  children_count INT NOT NULL DEFAULT 0,
  place_of_birth_en VARCHAR(255) NULL,
  place_of_birth_ar VARCHAR(255) NULL,
  height_cm INT NULL,
  weight_kg INT NULL,
  phone_number VARCHAR(64) NULL,
  address_en TEXT NULL,
  passport_number VARCHAR(64) NOT NULL UNIQUE,
  passport_issue_date DATETIME NULL,
  passport_expiry_date DATETIME NULL,
  border_number VARCHAR(64) NULL,
  iqama_number VARCHAR(64) NULL,
  agency_code VARCHAR(64) NOT NULL DEFAULT 'BGD',
  occupation_code VARCHAR(64) NOT NULL,
  expected_salary_sar INT NULL,
  education_code VARCHAR(64) NULL,
  experience_years INT NOT NULL DEFAULT 0,
  previous_countries JSON NULL,
  arabic_level VARCHAR(32) NOT NULL DEFAULT 'NO',
  english_level VARCHAR(32) NOT NULL DEFAULT 'NO',
  skills_matrix JSON NOT NULL,
  notes_en TEXT NULL,
  notes_ar TEXT NULL,
  face_photo_path TEXT NULL,
  full_body_photo_path TEXT NULL,
  contracted_company_id VARCHAR(64) NULL,
  contracted_at DATETIME NULL,
  contracted_notes TEXT NULL,
  registered_by_id VARCHAR(64) NOT NULL,
  updated_by_id VARCHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX workers_status_occ_idx (status, occupation_code),
  INDEX workers_passport_idx (passport_number),
  CONSTRAINT fk_worker_contract_company FOREIGN KEY (contracted_company_id) REFERENCES companies(id),
  CONSTRAINT fk_worker_registered_by FOREIGN KEY (registered_by_id) REFERENCES users(id),
  CONSTRAINT fk_worker_updated_by FOREIGN KEY (updated_by_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS worker_documents (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  worker_id VARCHAR(64) NOT NULL,
  doc_type VARCHAR(64) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  expiry_date DATETIME NULL,
  uploaded_by_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX worker_docs_worker_idx (worker_id),
  CONSTRAINT fk_doc_worker FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cv_download_logs (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  worker_id VARCHAR(64) NOT NULL,
  agent_id VARCHAR(64) NOT NULL,
  company_id VARCHAR(64) NOT NULL,
  language ENUM('EN', 'AR') NOT NULL,
  format ENUM('PDF', 'PNG') NOT NULL,
  downloaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX cv_logs_company_date_idx (company_id, downloaded_at),
  INDEX cv_logs_worker_idx (worker_id),
  CONSTRAINT fk_cvlog_worker FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
  CONSTRAINT fk_cvlog_agent FOREIGN KEY (agent_id) REFERENCES users(id),
  CONSTRAINT fk_cvlog_company FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  actor_id VARCHAR(64) NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(64) NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX audit_logs_created_idx (created_at),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
