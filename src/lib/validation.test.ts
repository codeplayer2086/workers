import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canUserAccessInternalDocuments,
  canUserEditWorkers,
  canUserManageCompaniesAndAgents,
  canUserViewWorker,
  createAgentSchema,
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
