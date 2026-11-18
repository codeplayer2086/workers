import {
  mysqlTable,
  mysqlEnum,
  varchar,
  text,
  int,
  boolean,
  datetime,
  timestamp,
  json,
  index,
  uniqueIndex,
} from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

export const userRoleEnum = mysqlEnum('role', ['ADMIN', 'EMPLOYEE', 'AGENT']);
export const workerStatusEnum = mysqlEnum('status', [
  'DRAFT',
  'PUBLISHED',
  'UNPUBLISHED',
  'CONTRACTED',
]);
export const cvLanguageEnum = mysqlEnum('language', ['EN', 'AR']);
export const cvFormatEnum = mysqlEnum('format', ['PDF', 'PNG']);

export interface VisibleFieldsConfig {
  height: boolean;
  weight: boolean;
  children: boolean;
  notes: boolean;
  education: boolean;
  placeOfBirth: boolean;
}

export interface PreviousCountryExperience {
  countryCode: string;
  years: number;
}

export interface SkillsMatrix {
  baby_care: 'YES' | 'NO' | 'WILLING';
  child_care: 'YES' | 'NO' | 'WILLING';
  elderly_care: 'YES' | 'NO' | 'WILLING';
  cleaning: 'YES' | 'NO' | 'WILLING';
  washing: 'YES' | 'NO' | 'WILLING';
  ironing: 'YES' | 'NO' | 'WILLING';
  arabic_cooking: 'YES' | 'NO' | 'WILLING';
  sewing: 'YES' | 'NO' | 'WILLING';
}

export const companies = mysqlTable('companies', {
  id: varchar('id', { length: 64 }).primaryKey(),
  nameEn: varchar('name_en', { length: 255 }).notNull(),
  nameAr: varchar('name_ar', { length: 255 }).notNull(),
  country: varchar('country', { length: 120 }).notNull().default('Saudi Arabia'),
  licenseNumber: varchar('license_number', { length: 120 }),
  address: text('address'),
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 64 }),
  logoPath: text('logo_path'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

export const companyCvTemplates = mysqlTable('company_cv_templates', {
  id: varchar('id', { length: 64 }).primaryKey(),
  companyId: varchar('company_id', { length: 64 })
    .notNull()
    .unique()
    .references(() => companies.id, { onDelete: 'cascade' }),
  primaryColor: varchar('primary_color', { length: 32 }).notNull().default('#0F172A'),
  secondaryColor: varchar('secondary_color', { length: 32 }).notNull().default('#F1F5F9'),
  accentColor: varchar('accent_color', { length: 32 }).notNull().default('#0284C7'),
  headerTextEn: text('header_text_en'),
  headerTextAr: text('header_text_ar'),
  footerTextEn: text('footer_text_en'),
  footerTextAr: text('footer_text_ar'),
  showPassportNumber: boolean('show_passport_number').notNull().default(true),
  showSalary: boolean('show_salary').notNull().default(true),
  showBorderAndIqama: boolean('show_border_and_iqama').notNull().default(true),
  visibleFields: json('visible_fields').$type<VisibleFieldsConfig>().notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

export const users = mysqlTable(
  'users',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    uid: varchar('uid', { length: 128 }).unique(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    encryptedPassword: text('encrypted_password'),
    role: mysqlEnum('role', ['ADMIN', 'EMPLOYEE', 'AGENT']).notNull(),
    companyId: varchar('company_id', { length: 64 }).references(() => companies.id, {
      onDelete: 'restrict',
    }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [index('users_role_company_idx').on(table.role, table.companyId)]
);

export const workers = mysqlTable(
  'workers',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    workerCode: varchar('worker_code', { length: 64 }).notNull().unique(),
    status: mysqlEnum('status', ['DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'CONTRACTED'])
      .notNull()
      .default('DRAFT'),

    // 1. Personal Information
    fullNameEn: varchar('full_name_en', { length: 255 }).notNull(),
    fullNameAr: varchar('full_name_ar', { length: 255 }),
    dateOfBirth: datetime('date_of_birth', { mode: 'date' }).notNull(),
    gender: varchar('gender', { length: 32 }).notNull(),
    nationality: varchar('nationality', { length: 120 }).notNull().default('Bangladeshi'),
    religion: varchar('religion', { length: 64 }).notNull(),
    maritalStatus: varchar('marital_status', { length: 64 }).notNull(),
    childrenCount: int('children_count').notNull().default(0),
    placeOfBirthEn: varchar('place_of_birth_en', { length: 255 }),
    placeOfBirthAr: varchar('place_of_birth_ar', { length: 255 }),
    heightCm: int('height_cm'),
    weightKg: int('weight_kg'),
    phoneNumber: varchar('phone_number', { length: 64 }),
    addressEn: text('address_en'),

    // 2. Passport & GCC Returnee Information
    passportNumber: varchar('passport_number', { length: 64 }).notNull().unique(),
    passportIssueDate: datetime('passport_issue_date', { mode: 'date' }),
    passportExpiryDate: datetime('passport_expiry_date', { mode: 'date' }),
    borderNumber: varchar('border_number', { length: 64 }),
    iqamaNumber: varchar('iqama_number', { length: 64 }),
    agencyCode: varchar('agency_code', { length: 64 }).notNull().default('BGD'),

    // 3. Occupation, Experience & Compensation
    occupationCode: varchar('occupation_code', { length: 64 }).notNull(),
    expectedSalarySar: int('expected_salary_sar'),
    educationCode: varchar('education_code', { length: 64 }),
    experienceYears: int('experience_years').notNull().default(0),
    previousCountries: json('previous_countries').$type<PreviousCountryExperience[]>(),

    // 4. Language & Domestic Skills Matrix
    arabicLevel: varchar('arabic_level', { length: 32 }).notNull().default('NO'),
    englishLevel: varchar('english_level', { length: 32 }).notNull().default('NO'),
    skillsMatrix: json('skills_matrix').$type<SkillsMatrix>().notNull(),
    notesEn: text('notes_en'),
    notesAr: text('notes_ar'),

    // 5. Mandatory CV Photographs
    facePhotoPath: text('face_photo_path'),
    fullBodyPhotoPath: text('full_body_photo_path'),

    // 6. Contracting Outcome
    contractedCompanyId: varchar('contracted_company_id', { length: 64 }).references(
      () => companies.id
    ),
    contractedAt: datetime('contracted_at', { mode: 'date' }),
    contractedNotes: text('contracted_notes'),

    // 7. Audit & Ownership
    registeredById: varchar('registered_by_id', { length: 64 })
      .notNull()
      .references(() => users.id),
    updatedById: varchar('updated_by_id', { length: 64 }).references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index('workers_status_occ_idx').on(table.status, table.occupationCode),
    index('workers_passport_idx').on(table.passportNumber),
  ]
);

export const workerDocuments = mysqlTable(
  'worker_documents',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    workerId: varchar('worker_id', { length: 64 })
      .notNull()
      .references(() => workers.id, { onDelete: 'cascade' }),
    docType: varchar('doc_type', { length: 64 }).notNull(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    filePath: text('file_path').notNull(),
    expiryDate: datetime('expiry_date', { mode: 'date' }),
    uploadedById: varchar('uploaded_by_id', { length: 64 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('worker_docs_worker_idx').on(table.workerId)]
);

export const cvDownloadLogs = mysqlTable(
  'cv_download_logs',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    workerId: varchar('worker_id', { length: 64 })
      .notNull()
      .references(() => workers.id, { onDelete: 'cascade' }),
    agentId: varchar('agent_id', { length: 64 })
      .notNull()
      .references(() => users.id),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    language: mysqlEnum('language', ['EN', 'AR']).notNull(),
    format: mysqlEnum('format', ['PDF', 'PNG']).notNull(),
    downloadedAt: timestamp('downloaded_at').notNull().defaultNow(),
  },
  (table) => [
    index('cv_logs_company_date_idx').on(table.companyId, table.downloadedAt),
    index('cv_logs_worker_idx').on(table.workerId),
  ]
);

export const auditLogs = mysqlTable(
  'audit_logs',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    actorId: varchar('actor_id', { length: 64 }).references(() => users.id),
    action: varchar('action', { length: 120 }).notNull(),
    entityType: varchar('entity_type', { length: 64 }).notNull(),
    entityId: varchar('entity_id', { length: 64 }),
    metadata: json('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('audit_logs_created_idx').on(table.createdAt)]
);

export const agentCustomers = mysqlTable(
  'agent_customers',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    agentId: varchar('agent_id', { length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    countryCode: varchar('country_code', { length: 16 }).notNull(),
    phoneNumber: varchar('phone_number', { length: 32 }).notNull(),
    whatsappJid: varchar('whatsapp_jid', { length: 128 }),
    whatsappStatus: varchar('whatsapp_status', { length: 32 }).notNull().default('UNVERIFIED'),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex('agent_customers_agent_phone_uq').on(table.agentId, table.phoneNumber),
    index('agent_customers_agent_idx').on(table.agentId),
  ]
);

export const cvShareLogs = mysqlTable(
  'cv_share_logs',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    agentId: varchar('agent_id', { length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    customerId: varchar('customer_id', { length: 64 })
      .notNull()
      .references(() => agentCustomers.id, { onDelete: 'cascade' }),
    workerId: varchar('worker_id', { length: 64 })
      .notNull()
      .references(() => workers.id, { onDelete: 'cascade' }),
    language: varchar('language', { length: 8 }).notNull(),
    format: varchar('format', { length: 8 }).notNull(),
    status: varchar('status', { length: 16 }).notNull(),
    errorMsg: text('error_msg'),
    sentAt: timestamp('sent_at').notNull().defaultNow(),
  },
  (table) => [
    index('cv_share_logs_customer_idx').on(table.customerId, table.sentAt),
    index('cv_share_logs_agent_idx').on(table.agentId, table.sentAt),
    index('cv_share_logs_worker_idx').on(table.workerId),
  ]
);

export const companiesRelations = relations(companies, ({ one, many }) => ({
  template: one(companyCvTemplates, {
    fields: [companies.id],
    references: [companyCvTemplates.companyId],
  }),
  agents: many(users),
  contractedWorkers: many(workers),
  cvDownloads: many(cvDownloadLogs),
}));

export const companyCvTemplatesRelations = relations(companyCvTemplates, ({ one }) => ({
  company: one(companies, {
    fields: [companyCvTemplates.companyId],
    references: [companies.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  cvDownloads: many(cvDownloadLogs),
  auditLogs: many(auditLogs),
  customers: many(agentCustomers),
  cvShares: many(cvShareLogs),
}));

export const agentCustomersRelations = relations(agentCustomers, ({ one, many }) => ({
  agent: one(users, {
    fields: [agentCustomers.agentId],
    references: [users.id],
  }),
  shareLogs: many(cvShareLogs),
}));

export const cvShareLogsRelations = relations(cvShareLogs, ({ one }) => ({
  agent: one(users, {
    fields: [cvShareLogs.agentId],
    references: [users.id],
  }),
  customer: one(agentCustomers, {
    fields: [cvShareLogs.customerId],
    references: [agentCustomers.id],
  }),
  worker: one(workers, {
    fields: [cvShareLogs.workerId],
    references: [workers.id],
  }),
}));

export const workersRelations = relations(workers, ({ one, many }) => ({
  contractedCompany: one(companies, {
    fields: [workers.contractedCompanyId],
    references: [companies.id],
  }),
  registeredBy: one(users, {
    fields: [workers.registeredById],
    references: [users.id],
  }),
  documents: many(workerDocuments),
  cvDownloads: many(cvDownloadLogs),
  cvShareLogs: many(cvShareLogs),
}));

export const workerDocumentsRelations = relations(workerDocuments, ({ one }) => ({
  worker: one(workers, {
    fields: [workerDocuments.workerId],
    references: [workers.id],
  }),
}));
