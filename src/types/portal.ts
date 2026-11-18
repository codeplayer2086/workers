import type {
  PreviousCountryExperience,
  SkillsMatrix,
  VisibleFieldsConfig,
} from '../db/schema.ts';
import type { UserRole, WorkerStatus } from '../lib/validation.ts';

export interface PortalUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  companyId: string | null;
  isActive: boolean;
}

export interface AdminAgentRow {
  id: string;
  fullName: string;
  email: string;
  role: 'AGENT';
  companyId: string | null;
  companyNameEn: string | null;
  companyNameAr: string | null;
  isActive: boolean;
  createdAt: string;
  visiblePassword: string | null;
}

export interface AdminEmployeeRow {
  id: string;
  fullName: string;
  email: string;
  role: 'EMPLOYEE';
  isActive: boolean;
  createdAt: string;
  visiblePassword: string | null;
}

export interface CompanyCvTemplate {
  id: string;
  companyId: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headerTextEn: string | null;
  headerTextAr: string | null;
  footerTextEn: string | null;
  footerTextAr: string | null;
  showPassportNumber: boolean;
  showSalary: boolean;
  showBorderAndIqama: boolean;
  visibleFields: VisibleFieldsConfig;
  updatedAt: string;
}

export interface Company {
  id: string;
  nameEn: string;
  nameAr: string;
  country: string;
  licenseNumber: string | null;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  logoPath: string | null;
  isActive: boolean;
  template?: CompanyCvTemplate | null;
  agentCount?: number;
}

export interface WorkerSummary {
  id: string;
  workerCode: string;
  status: WorkerStatus;
  fullNameEn: string;
  fullNameAr: string | null;
  dateOfBirth: string;
  age: number;
  gender: string;
  religion: string;
  maritalStatus: string;
  passportNumber: string;
  occupationCode: string;
  expectedSalarySar: number | null;
  experienceYears: number;
  facePhotoPath: string | null;
  fullBodyPhotoPath: string | null;
  contractedCompanyId: string | null;
  contractedCompanyName?: string | null;
  contractedAt: string | null;
  updatedAt: string;
  documentCount?: number;
}

export interface WorkerDetail {
  id: string;
  workerCode: string;
  status: WorkerStatus;
  fullNameEn: string;
  fullNameAr: string | null;
  dateOfBirth: string;
  age?: number;
  gender: 'FEMALE' | 'MALE';
  nationality: string;
  religion: 'MUSLIM' | 'NON_MUSLIM';
  maritalStatus: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
  childrenCount: number;
  placeOfBirthEn: string | null;
  placeOfBirthAr: string | null;
  heightCm: number | null;
  weightKg: number | null;
  phoneNumber?: string | null;
  addressEn?: string | null;
  passportNumber: string;
  passportIssueDate: string | null;
  passportExpiryDate: string | null;
  borderNumber: string | null;
  iqamaNumber: string | null;
  agencyCode: string;
  occupationCode: string;
  expectedSalarySar: number | null;
  educationCode: string | null;
  experienceYears: number;
  previousCountries: PreviousCountryExperience[] | null;
  arabicLevel: 'FLUENT' | 'BASIC' | 'NO';
  englishLevel: 'FLUENT' | 'BASIC' | 'NO';
  skillsMatrix: SkillsMatrix;
  notesEn: string | null;
  notesAr: string | null;
  facePhotoPath: string | null;
  fullBodyPhotoPath: string | null;
  contractedCompanyId?: string | null;
  contractedAt?: string | null;
  contractedNotes?: string | null;
}

export interface WorkerDocumentItem {
  id: string;
  workerId: string;
  docType: string;
  fileName: string;
  filePath: string;
  expiryDate: string | null;
  createdAt: string;
}

export interface CvDownloadLogItem {
  id: string;
  language: 'EN' | 'AR';
  format: 'PDF' | 'PNG';
  downloadedAt: string;
  workerCode: string;
  workerNameEn: string;
  agentName: string;
  companyNameEn: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actorName: string | null;
  actorRole: UserRole | null;
}

export interface CvShareLogItem {
  id: string;
  agentId: string;
  customerId: string;
  workerId: string;
  language: 'EN' | 'AR';
  format: 'PDF' | 'PNG';
  status: 'SENT' | 'FAILED';
  errorMsg: string | null;
  sentAt: string;
  workerCode?: string;
  workerNameEn?: string;
  workerNameAr?: string | null;
  occupationCode?: string;
}

export interface AgentCustomerItem {
  id: string;
  agentId: string;
  fullName: string;
  countryCode: string;
  phoneNumber: string;
  whatsappJid: string | null;
  whatsappStatus: 'VERIFIED' | 'NOT_REGISTERED' | 'UNVERIFIED';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  shareLogs: CvShareLogItem[];
}

export interface WhatsAppSendResultItem {
  customerId: string;
  customerName: string;
  phoneNumber: string;
  status: 'SENT' | 'FAILED';
  errorMsg: string | null;
  logId: string;
}

