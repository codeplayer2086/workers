import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adminUpdateUserSchema,
  canUserAccessInternalDocuments,
  canUserEditWorkers,
  canUserManageCompaniesAndAgents,
  canUserViewWorker,
  companyCreateSchema,
  createAgentCustomerSchema,
  createAgentSchema,
  selfProfileUpdateSchema,
  sendCvWhatsAppSchema,
  workerInputSchema,
} from './validation';

test('RBAC isolates agents strictly to PUBLISHED workers and blocks internal documents', () => {
  assert.equal(canUserViewWorker('AGENT', 'PUBLISHED'), true);
  assert.equal(canUserViewWorker('AGENT', 'DRAFT'), false);
  assert.equal(canUserViewWorker('AGENT', 'UNPUBLISHED'), false);
  assert.equal(canUserViewWorker('AGENT', 'CONTRACTED'), false);

  assert.equal(canUserViewWorker('EMPLOYEE', 'DRAFT'), true);
  assert.equal(canUserViewWorker('EMPLOYEE', 'CONTRACTED'), true);
  assert.equal(canUserViewWorker('ADMIN', 'UNPUBLISHED'), true);

  assert.equal(canUserAccessInternalDocuments('AGENT'), false);
  assert.equal(canUserAccessInternalDocuments('EMPLOYEE'), true);
  assert.equal(canUserAccessInternalDocuments('ADMIN'), true);

  assert.equal(canUserEditWorkers('AGENT'), false);
  assert.equal(canUserManageCompaniesAndAgents('EMPLOYEE'), false);
  assert.equal(canUserManageCompaniesAndAgents('ADMIN'), true);
});

test('createAgentSchema enforces selecting companyId before agent credentials', () => {
  const missingCompany = createAgentSchema.safeParse({
    companyId: '',
    fullName: 'Fahad Al-Harbi',
    email: 'fahad@agency.sa',
    password: 'password123',
  });
  assert.equal(missingCompany.success, false);

  const valid = createAgentSchema.safeParse({
    companyId: 'comp_1',
    fullName: 'Fahad Al-Harbi',
    email: 'fahad@agency.sa',
    password: 'password123',
  });
  assert.equal(valid.success, true);
});

test('workerInputSchema validates mandatory fields and skillsMatrix', () => {
  const parsed = workerInputSchema.safeParse({
    status: 'PUBLISHED',
    fullNameEn: 'Amina Begum',
    dateOfBirth: '1997-04-12',
    gender: 'FEMALE',
    religion: 'MUSLIM',
    maritalStatus: 'MARRIED',
    passportNumber: 'EB0491823',
    occupationCode: 'HOUSEMAID',
    skillsMatrix: {
      baby_care: 'YES',
      child_care: 'YES',
      elderly_care: 'NO',
      cleaning: 'YES',
      washing: 'YES',
      ironing: 'YES',
      arabic_cooking: 'WILLING',
      sewing: 'NO',
    },
  });
  assert.equal(parsed.success, true);
});

test('createAgentCustomerSchema and sendCvWhatsAppSchema validate customer and batch dispatch payloads', () => {
  const invalidCust = createAgentCustomerSchema.safeParse({
    fullName: 'A',
    countryCode: '+966',
    phoneNumber: '12',
  });
  assert.equal(invalidCust.success, false);

  const validCust = createAgentCustomerSchema.safeParse({
    fullName: 'Abdullah Al-Mansoor',
    countryCode: '+966',
    phoneNumber: '0501234567',
    notes: 'Riyadh villa',
  });
  assert.equal(validCust.success, true);

  const emptyRecipients = sendCvWhatsAppSchema.safeParse({
    workerId: 'wkr_0001',
    customerIds: [],
    language: 'AR',
    format: 'PDF',
    fileBase64: 'JVBERi0xLjQKJeLjz9M=',
    fileName: 'WKR-2026-0001_CV_AR.pdf',
  });
  assert.equal(emptyRecipients.success, false);

  const validSend = sendCvWhatsAppSchema.safeParse({
    workerId: 'wkr_0001',
    customerIds: ['cust_seed_1', 'cust_seed_2'],
    language: 'AR',
    format: 'PDF',
    caption: 'Please review',
    fileBase64: 'JVBERi0xLjQKJeLjz9M=1234567890',
    fileName: 'WKR-2026-0001_CV_AR.pdf',
  });
  assert.equal(validSend.success, true);
});

test('companyCreateSchema allows empty Arabic name for automatic translation', () => {
  const res = companyCreateSchema.safeParse({
    nameEn: 'Al-Watan Manpower Co.',
    nameAr: '',
    country: 'Saudi Arabia',
  });
  assert.equal(res.success, true);
  if (res.success) {
    assert.equal(res.data.nameAr, '');
  }
});

test('adminUpdateUserSchema and selfProfileUpdateSchema handle optional passwords cleanly', () => {
  const keepPwd = selfProfileUpdateSchema.safeParse({
    fullName: 'Farhana Rahman',
    email: 'farhana@dhakarecruit.com',
    password: '',
  });
  assert.equal(keepPwd.success, true);
  if (keepPwd.success) {
    assert.equal(keepPwd.data.password, undefined);
  }

  const shortPwd = adminUpdateUserSchema.safeParse({
    fullName: 'Fahad',
    email: 'fahad@aljazira.sa',
    password: '123',
  });
  assert.equal(shortPwd.success, false);

  const validAdminUpdate = adminUpdateUserSchema.safeParse({
    fullName: 'Fahad Updated',
    email: 'fahad.new@aljazira.sa',
    password: 'NewPassword@2026',
    companyId: 'comp_aljazira',
  });
  assert.equal(validAdminUpdate.success, true);
});


