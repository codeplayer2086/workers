import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAge,
  CV_LABELS,
  getMaritalStatusLabel,
  getOccupationLabel,
  getReligionLabel,
  getSkillValueLabel,
  PROFILE_LABELS,
  SKILL_LABELS,
  transliterateTextToArabicFallback,
} from './cv-dictionary';

test('calculateAge computes accurate integer age before and after birthday', () => {
  const ref = new Date('2026-06-15T00:00:00Z');
  assert.equal(calculateAge('1998-06-14', ref), 28);
  assert.equal(calculateAge('1998-06-15', ref), 28);
  assert.equal(calculateAge('1998-06-16', ref), 27);
});

test('EN and AR dictionaries remain strictly separated without mixed scripts', () => {
  for (const dict of [CV_LABELS, PROFILE_LABELS]) {
    for (const key of Object.keys(dict.EN)) {
      const enVal = dict.EN[key];
      const arVal = dict.AR[key];
      assert.ok(enVal && arVal, `Missing translation for key: ${key}`);
      assert.equal(/[\u0600-\u06FF]/.test(enVal), false, `EN label "${key}" contains Arabic characters`);
      assert.equal(/[\u0600-\u06FF]/.test(arVal), true, `AR label "${key}" must contain Arabic script`);
    }
  }
});

test('gender-aware Arabic labels return correct feminine/masculine forms', () => {
  assert.equal(getReligionLabel('MUSLIM', 'FEMALE', 'AR'), 'مسلمة');
  assert.equal(getReligionLabel('MUSLIM', 'MALE', 'AR'), 'مسلم');
  assert.equal(getMaritalStatusLabel('MARRIED', 'FEMALE', 'AR'), 'متزوجة');
  assert.equal(getSkillValueLabel('WILLING', 'FEMALE', 'AR'), 'مستعدة للتعلم');
  assert.equal(getSkillValueLabel('WILLING', 'MALE', 'AR'), 'مستعد للتعلم');
  assert.equal(getOccupationLabel('HOUSEMAID', 'AR'), 'عاملة منزلية');
});

test('all 8 domestic skills have both EN and AR labels', () => {
  assert.equal(SKILL_LABELS.length, 8);
  for (const s of SKILL_LABELS) {
    assert.ok(s.en.length > 0 && s.ar.length > 0);
  }
});

test('transliterateTextToArabicFallback converts Bangladeshi names and cities into Arabic', () => {
  assert.equal(transliterateTextToArabicFallback('Amina Begum'), 'أمينة بيجوم');
  assert.equal(transliterateTextToArabicFallback('Comilla, Bangladesh'), 'كوميلا بنغلاديش');
});
