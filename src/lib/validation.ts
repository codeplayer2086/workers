import { z } from 'zod';

export const userRoleSchema = z.enum(['ADMIN', 'EMPLOYEE', 'AGENT']);
export const workerStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'CONTRACTED']);
export const skillValueSchema = z.enum(['YES', 'NO', 'WILLING']);

export const skillsMatrixSchema = z.object({
  baby_care: skillValueSchema,
  child_care: skillValueSchema,
  elderly_care: skillValueSchema,
  cleaning: skillValueSchema,
  washing: skillValueSchema,
  ironing: skillValueSchema,
  arabic_cooking: skillValueSchema,
  sewing: skillValueSchema,
});

export const previousCountrySchema = z.object({
  countryCode: z.string().min(2).max(10),
  years: z.number().int().min(0).max(40),
});

export const visibleFieldsSchema = z.object({
  height: z.boolean(),
  weight: z.boolean(),
  children: z.boolean(),
  notes: z.boolean(),
  education: z.boolean(),
  placeOfBirth: z.boolean(),
});

export const companyCreateSchema = z.object({
  nameEn: z.string().trim().min(2, 'English company name is required'),
  nameAr: z.string().trim().optional().default(''),
  country: z.string().trim().min(2).default('Saudi Arabia'),
  licenseNumber: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  contactEmail: z.string().trim().email('Invalid email').optional().or(z.literal('')).nullable(),
  contactPhone: z.string().trim().optional().nullable(),
});

export const cvTemplateUpdateSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  headerTextEn: z.string().trim().max(240).optional().nullable(),
  headerTextAr: z.string().trim().max(240).optional().nullable(),
  footerTextEn: z.string().trim().max(240).optional().nullable(),
  footerTextAr: z.string().trim().max(240).optional().nullable(),
  showPassportNumber: z.boolean(),
  showSalary: z.boolean(),
  showBorderAndIqama: z.boolean(),
  visibleFields: visibleFieldsSchema,
});

export const createAgentSchema = z.object({
  companyId: z.string().trim().min(1, 'Company selection is required before creating an agent'),
  fullName: z.string().trim().min(2, 'Agent name is required'),
  email: z.string().trim().email('Valid email address is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const createEmployeeSchema = z.object({
  fullName: z.string().trim().min(2, 'Employee name is required'),
  email: z.string().trim().email('Valid email address is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const adminUpdateUserSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  email: z.string().trim().email('Valid email address is required'),
  password: z
    .string()
    .optional()
    .transform((v) => (typeof v === 'string' && v.trim().length === 0 ? undefined : v))
    .refine((v) => v === undefined || v.length >= 6, {
      message: 'Password must be at least 6 characters',
    }),
  companyId: z.string().trim().optional().nullable(),
});

export const selfProfileUpdateSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  email: z.string().trim().email('Valid email address is required'),
  password: z
    .string()
    .optional()
    .transform((v) => (typeof v === 'string' && v.trim().length === 0 ? undefined : v))
    .refine((v) => v === undefined || v.length >= 6, {
      message: 'Password must be at least 6 characters',
    }),
});

export const workerInputSchema = z.object({
  status: workerStatusSchema.default('DRAFT'),
  fullNameEn: z.string().trim().min(2, 'Full name in English is required'),
  fullNameAr: z.string().trim().optional().nullable(),
  dateOfBirth: z.string().min(4, 'Date of birth is required'),
  gender: z.enum(['FEMALE', 'MALE']),
  nationality: z.string().trim().min(2).default('Bangladeshi'),
  religion: z.enum(['MUSLIM', 'NON_MUSLIM']),
  maritalStatus: z.enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED']),
  childrenCount: z.coerce.number().int().min(0).max(20).default(0),
  placeOfBirthEn: z.string().trim().optional().nullable(),
  placeOfBirthAr: z.string().trim().optional().nullable(),
  heightCm: z.coerce.number().int().min(100).max(230).optional().nullable(),
  weightKg: z.coerce.number().int().min(30).max(180).optional().nullable(),
  phoneNumber: z.string().trim().optional().nullable(),
  addressEn: z.string().trim().optional().nullable(),
  passportNumber: z.string().trim().min(5, 'Valid passport number is required').max(30),
  passportIssueDate: z.string().optional().nullable(),
  passportExpiryDate: z.string().optional().nullable(),
  borderNumber: z.string().trim().optional().nullable(),
  iqamaNumber: z.string().trim().optional().nullable(),
  agencyCode: z.string().trim().min(2).max(20).default('BGD'),
  occupationCode: z.enum([
    'HOUSEMAID',
    'BABY_CARE',
    'CLEANER',
    'COOK',
    'DRIVER',
    'ELDERLY_CARE',
  ]),
  expectedSalarySar: z.coerce.number().int().min(400).max(15000).optional().nullable(),
  educationCode: z
    .enum(['NONE', 'PRIMARY', 'SECONDARY', 'HIGHER_SECONDARY', 'GRADUATE'])
    .optional()
    .nullable(),
  experienceYears: z.coerce.number().int().min(0).max(40).default(0),
  previousCountries: z.array(previousCountrySchema).default([]),
  arabicLevel: z.enum(['FLUENT', 'BASIC', 'NO']).default('NO'),
  englishLevel: z.enum(['FLUENT', 'BASIC', 'NO']).default('NO'),
  skillsMatrix: skillsMatrixSchema,
  notesEn: z.string().trim().max(1500).optional().nullable(),
  notesAr: z.string().trim().max(1500).optional().nullable(),
});

export const contractWorkerSchema = z.object({
  contractedCompanyId: z.string().trim().min(1, 'Hiring company is required'),
  contractedAt: z.string().min(4, 'Contract date is required'),
  contractedNotes: z.string().trim().max(1000).optional().nullable(),
});

export const cvLogSchema = z.object({
  workerId: z.string().trim().min(1),
  language: z.enum(['EN', 'AR']),
  format: z.enum(['PDF', 'PNG']),
  companyId: z.string().trim().optional(),
});

export const createAgentCustomerSchema = z.object({
  fullName: z.string().trim().min(2, 'Householder full name is required').max(200),
  countryCode: z.string().trim().min(1, 'Country code is required').max(12),
  phoneNumber: z.string().trim().min(6, 'Phone number is required').max(32),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const sendCvWhatsAppSchema = z.object({
  workerId: z.string().trim().min(1, 'Candidate selection is required'),
  customerIds: z
    .array(z.string().trim().min(1))
    .min(1, 'Select at least one verified householder recipient')
    .max(25, 'You can send to at most 25 recipients per batch'),
  language: z.enum(['EN', 'AR']),
  format: z.enum(['PDF', 'PNG']),
  caption: z.string().trim().max(1000).optional().nullable(),
  fileBase64: z.string().min(20, 'Generated CV file data is required'),
  fileName: z.string().trim().min(3, 'CV filename is required').max(180),
});


export type UserRole = z.infer<typeof userRoleSchema>;
export type WorkerStatus = z.infer<typeof workerStatusSchema>;

export function canUserViewWorker(role: UserRole, status: WorkerStatus): boolean {
  if (role === 'ADMIN' || role === 'EMPLOYEE') return true;
  return status === 'PUBLISHED';
}

export function canUserAccessInternalDocuments(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE';
}

export function canUserEditWorkers(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE';
}

export function canUserManageCompaniesAndAgents(role: UserRole): boolean {
  return role === 'ADMIN';
}
