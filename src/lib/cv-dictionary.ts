export type CvLang = 'EN' | 'AR';

export const OCCUPATIONS: Record<string, { en: string; ar: string }> = {
  HOUSEMAID: { en: 'Housemaid', ar: 'عاملة منزلية' },
  BABY_CARE: { en: 'Baby Care / Nanny', ar: 'مربية أطفال ورضع' },
  CLEANER: { en: 'Domestic Cleaner', ar: 'عاملة نظافة' },
  COOK: { en: 'Domestic Cook', ar: 'طباخة منزلية' },
  DRIVER: { en: 'Private Driver', ar: 'سائق خاص' },
  ELDERLY_CARE: { en: 'Elderly Caregiver', ar: 'مرافقة كبار السن' },
};

export const RELIGIONS: Record<string, { en: string; arFemale: string; arMale: string }> = {
  MUSLIM: { en: 'Muslim', arFemale: 'مسلمة', arMale: 'مسلم' },
  NON_MUSLIM: { en: 'Non-Muslim', arFemale: 'غير مسلمة', arMale: 'غير مسلم' },
};

export const MARITAL_STATUSES: Record<string, { en: string; arFemale: string; arMale: string }> = {
  SINGLE: { en: 'Single', arFemale: 'عزباء', arMale: 'أعزب' },
  MARRIED: { en: 'Married', arFemale: 'متزوجة', arMale: 'متزوج' },
  DIVORCED: { en: 'Divorced', arFemale: 'مطلقة', arMale: 'مطلق' },
  WIDOWED: { en: 'Widowed', arFemale: 'أرملة', arMale: 'أرمل' },
};

export const GENDERS: Record<string, { en: string; ar: string }> = {
  FEMALE: { en: 'Female', ar: 'أنثى' },
  MALE: { en: 'Male', ar: 'ذكر' },
};

export const EDUCATION_LEVELS: Record<string, { en: string; ar: string }> = {
  NONE: { en: 'No Formal Schooling', ar: 'بدون تعليم رسمي' },
  PRIMARY: { en: 'Primary School', ar: 'المرحلة الابتدائية' },
  SECONDARY: { en: 'Secondary School', ar: 'المرحلة المتوسطة / الثانوية' },
  HIGHER_SECONDARY: { en: 'Higher Secondary (HSC)', ar: 'الثانوية العامة' },
  GRADUATE: { en: 'University Graduate', ar: 'جامعي' },
};

export const LANGUAGE_LEVELS: Record<string, { en: string; ar: string }> = {
  FLUENT: { en: 'Fluent', ar: 'ممتاز' },
  BASIC: { en: 'Basic', ar: 'أساسي' },
  NO: { en: 'None', ar: 'لا يوجد' },
};

export const SKILL_VALUES: Record<string, { en: string; arFemale: string; arMale: string }> = {
  YES: { en: 'Yes', arFemale: 'نعم', arMale: 'نعم' },
  NO: { en: 'No', arFemale: 'لا', arMale: 'لا' },
  WILLING: { en: 'Willing to Learn', arFemale: 'مستعدة للتعلم', arMale: 'مستعد للتعلم' },
};

export const SKILL_LABELS: Array<{ key: string; en: string; ar: string }> = [
  { key: 'baby_care', en: 'Baby Care', ar: 'رعاية الرضع' },
  { key: 'child_care', en: 'Child Care', ar: 'رعاية الأطفال' },
  { key: 'elderly_care', en: 'Elderly Care', ar: 'رعاية كبار السن' },
  { key: 'cleaning', en: 'House Cleaning', ar: 'تنظيف المنزل' },
  { key: 'washing', en: 'Laundry & Washing', ar: 'غسيل الملابس' },
  { key: 'ironing', en: 'Ironing', ar: 'كي الملابس' },
  { key: 'arabic_cooking', en: 'Arabic Cooking', ar: 'الطبخ العربي' },
  { key: 'sewing', en: 'Sewing & Mending', ar: 'الخياطة' },
];

export const GCC_COUNTRIES: Record<string, { en: string; ar: string }> = {
  KSA: { en: 'Saudi Arabia', ar: 'المملكة العربية السعودية' },
  UAE: { en: 'United Arab Emirates', ar: 'الإمارات العربية المتحدة' },
  QAT: { en: 'Qatar', ar: 'قطر' },
  KWT: { en: 'Kuwait', ar: 'الكويت' },
  OMN: { en: 'Oman', ar: 'سلطنة عُمان' },
  BHR: { en: 'Bahrain', ar: 'البحرين' },
  JOR: { en: 'Jordan', ar: 'الأردن' },
  LBN: { en: 'Lebanon', ar: 'لبنان' },
  SGP: { en: 'Singapore', ar: 'سنغافورة' },
  MYS: { en: 'Malaysia', ar: 'ماليزيا' },
};

export const DOC_TYPES: Record<string, { en: string }> = {
  PASSPORT_SCAN: { en: 'Passport Copy' },
  GAMCA_MEDICAL: { en: 'GAMCA Medical Slip' },
  POLICE_CLEARANCE: { en: 'Police Clearance' },
  NID: { en: 'National ID (NID)' },
  BMET_CARD: { en: 'BMET Smart Card' },
  OTHER: { en: 'Supporting Document' },
};

export const CV_LABELS: Record<CvLang, Record<string, string>> = {
  EN: {
    cvTitle: 'CANDIDATE APPLICATION DOSSIER',
    refCode: 'Reference No.',
    appliedPosition: 'Applied Position',
    monthlySalary: 'Expected Salary',
    sarPerMonth: 'SAR / Month',
    negotiable: 'Standard Contract',
    fullName: 'Full Name',
    nationality: 'Nationality',
    bangladeshi: 'Bangladeshi',
    religion: 'Religion',
    dateOfBirth: 'Date of Birth',
    age: 'Age',
    yearsOld: 'Years',
    gender: 'Gender',
    maritalStatus: 'Marital Status',
    children: 'No. of Children',
    placeOfBirth: 'Place of Birth',
    height: 'Height',
    weight: 'Weight',
    cm: 'cm',
    kg: 'kg',
    education: 'Education Level',
    personalDetails: 'Personal Details',
    passportDetails: 'Passport & GCC History',
    passportNumber: 'Passport Number',
    passportIssueDate: 'Issue Date',
    passportExpiryDate: 'Expiry Date',
    borderNumber: 'Border Number',
    iqamaNumber: 'Iqama Number',
    agencyCode: 'Sending Agency Code',
    experienceYears: 'Total Experience',
    yearsLabel: 'Years',
    freshCandidate: 'First-Time Candidate (Fresh)',
    previousCountries: 'Previous GCC / Abroad Employment',
    noPreviousAbroad: 'No prior overseas employment',
    languagesAndSkills: 'Language Proficiency & Domestic Skills',
    arabicLanguage: 'Arabic Proficiency',
    englishLanguage: 'English Proficiency',
    skillsMatrixTitle: 'Domestic Skills Evaluation',
    additionalNotes: 'Evaluator Remarks & Notes',
    facePhotoLabel: 'Passport Portrait',
    fullBodyPhotoLabel: 'Full-Length Portrait',
    licenseLabel: 'License No.',
    contactLabel: 'Contact',
  },
  AR: {
    cvTitle: 'ملف السيرة الذاتية للمرشح',
    refCode: 'الرقم المرجعي',
    appliedPosition: 'المهنة المطلوبة',
    monthlySalary: 'الراتب المتوقع',
    sarPerMonth: 'ريال سعودي / شهرياً',
    negotiable: 'حسب العقد المعتمد',
    fullName: 'الاسم الكامل',
    nationality: 'الجنسية',
    bangladeshi: 'بنغلاديشي',
    religion: 'الديانة',
    dateOfBirth: 'تاريخ الميلاد',
    age: 'العمر',
    yearsOld: 'سنة',
    gender: 'الجنس',
    maritalStatus: 'الحالة الاجتماعية',
    children: 'عدد الأطفال',
    placeOfBirth: 'مكان الميلاد',
    height: 'الطول',
    weight: 'الوزن',
    cm: 'سم',
    kg: 'كجم',
    education: 'المستوى التعليمي',
    personalDetails: 'البيانات الشخصية',
    passportDetails: 'بيانات الجواز والخبرة السابقة',
    passportNumber: 'رقم الجواز',
    passportIssueDate: 'تاريخ الإصدار',
    passportExpiryDate: 'تاريخ الانتهاء',
    borderNumber: 'رقم الحدود',
    iqamaNumber: 'رقم الإقامة',
    agencyCode: 'رمز المكتب المرسل',
    experienceYears: 'سنوات الخبرة',
    yearsLabel: 'سنوات',
    freshCandidate: 'مرشح جديد (بدون خبرة خارجية سابقة)',
    previousCountries: 'الخبرة السابقة في دول الخليج / الخارج',
    noPreviousAbroad: 'لا توجد خبرة عمل سابقة بالخارج',
    languagesAndSkills: 'إجادة اللغات والمهارات المنزلية',
    arabicLanguage: 'اللغة العربية',
    englishLanguage: 'اللغة الإنجليزية',
    skillsMatrixTitle: 'تقييم المهارات المنزلية',
    additionalNotes: 'ملاحظات إضافية',
    facePhotoLabel: 'صورة شخصية',
    fullBodyPhotoLabel: 'صورة كاملة للجسم',
    licenseLabel: 'رقم الترخيص',
    contactLabel: 'للتواصل',
  },
};

export const PROFILE_LABELS: Record<CvLang, Record<string, string>> = {
  EN: {
    profileView: 'Profile View',
    cvPreview: 'A4 CV Preview',
    basicInfo: 'Basic Info',
    identificationDetails: 'Identification & Travel Details',
    educationAndExperience: 'Education & Experience',
    skillsAndKnowledge: 'Skills & Language Proficiency',
    interviewerNotes: 'Evaluator Notes & Remarks',
    candidateIdNo: 'Candidate ID No.',
    designation: 'Designation',
    availability: 'Availability',
    availableNow: 'Available',
    contractedLabel: 'Contracted',
    draftLabel: 'Draft',
    unpublishedLabel: 'Unpublished',
    highestQualifications: 'Highest Qualification',
    employmentHistory: 'Employment History',
    experienceLocation: 'Previous Countries',
    spokenLanguages: 'Spoken Languages',
    fullBodyPortrait: 'Full-Length Standing Photo',
    clickToEnlarge: 'Click to enlarge',
    closePreview: 'Close',
    notSpecified: 'Not specified',
    backToDirectory: 'Back to Directory',
    switchLanguage: 'Language',
  },
  AR: {
    profileView: 'عرض الملف الشخصي',
    cvPreview: 'معاينة السيرة الذاتية A4',
    basicInfo: 'المعلومات الأساسية',
    identificationDetails: 'بيانات الهوية والجواز',
    educationAndExperience: 'التعليم والخبرة العملية',
    skillsAndKnowledge: 'المهارات وإجادة اللغات',
    interviewerNotes: 'ملاحظات التقييم والمقابلة',
    candidateIdNo: 'رقم المرشح',
    designation: 'المهنة المطلوبة',
    availability: 'حالة التوفر',
    availableNow: 'متاح للاستقدام',
    contractedLabel: 'تم التعاقد',
    draftLabel: 'مسودة',
    unpublishedLabel: 'غير منشور',
    highestQualifications: 'المؤهل العلمي',
    employmentHistory: 'الخبرة العملية',
    experienceLocation: 'دول العمل السابقة',
    spokenLanguages: 'اللغات المحكية',
    fullBodyPortrait: 'صورة كاملة للجسم',
    clickToEnlarge: 'اضغط للتكبير',
    closePreview: 'إغلاق',
    notSpecified: 'غير محدد',
    backToDirectory: 'العودة للدليل',
    switchLanguage: 'اللغة',
  },
};

export function getOccupationLabel(code: string, lang: CvLang): string {
  const entry = OCCUPATIONS[code];
  if (!entry) return code;
  return lang === 'AR' ? entry.ar : entry.en;
}

export function getReligionLabel(code: string, gender: string, lang: CvLang): string {
  const entry = RELIGIONS[code];
  if (!entry) return code;
  if (lang === 'EN') return entry.en;
  return gender === 'FEMALE' ? entry.arFemale : entry.arMale;
}

export function getMaritalStatusLabel(code: string, gender: string, lang: CvLang): string {
  const entry = MARITAL_STATUSES[code];
  if (!entry) return code;
  if (lang === 'EN') return entry.en;
  return gender === 'FEMALE' ? entry.arFemale : entry.arMale;
}

export function getGenderLabel(code: string, lang: CvLang): string {
  const entry = GENDERS[code];
  if (!entry) return code;
  return lang === 'AR' ? entry.ar : entry.en;
}

export function getNationalityLabel(nationality: string, gender: string, lang: CvLang): string {
  if (lang === 'EN') return nationality;
  if (nationality.toLowerCase().includes('bangladesh')) {
    return gender === 'FEMALE' ? 'بنغلاديشية' : 'بنغلاديشي';
  }
  return nationality;
}

export function getEducationLabel(code: string | null | undefined, lang: CvLang): string {
  if (!code) return lang === 'AR' ? 'غير محدد' : 'Not Specified';
  const entry = EDUCATION_LEVELS[code];
  if (!entry) return code;
  return lang === 'AR' ? entry.ar : entry.en;
}

export function getLanguageLevelLabel(code: string, lang: CvLang): string {
  const entry = LANGUAGE_LEVELS[code];
  if (!entry) return code;
  return lang === 'AR' ? entry.ar : entry.en;
}

export function getSkillValueLabel(value: string, gender: string, lang: CvLang): string {
  const entry = SKILL_VALUES[value];
  if (!entry) return value;
  if (lang === 'EN') return entry.en;
  return gender === 'FEMALE' ? entry.arFemale : entry.arMale;
}

export function getCountryLabel(code: string, lang: CvLang): string {
  const entry = GCC_COUNTRIES[code];
  if (!entry) return code;
  return lang === 'AR' ? entry.ar : entry.en;
}

export function calculateAge(dobInput: string | Date, referenceDate: Date = new Date()): number {
  const dob = typeof dobInput === 'string' ? new Date(dobInput) : dobInput;
  if (Number.isNaN(dob.getTime())) return 0;
  let age = referenceDate.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = referenceDate.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getUTCDate() < dob.getUTCDate())) {
    age--;
  }
  return Math.max(0, age);
}

const PHONETIC_DIGRAPHS: Array<[string, string]> = [
  ['sh', 'ش'],
  ['ch', 'تش'],
  ['th', 'ث'],
  ['kh', 'خ'],
  ['gh', 'غ'],
  ['ph', 'ف'],
  ['dh', 'د'],
  ['bh', 'بهـ'],
  ['ee', 'ي'],
  ['oo', 'و'],
  ['ou', 'و'],
  ['ai', 'اي'],
  ['ay', 'اي'],
];

const PHONETIC_CHARS: Record<string, string> = {
  a: 'ا',
  b: 'ب',
  c: 'ك',
  d: 'د',
  e: 'ي',
  f: 'ف',
  g: 'ج',
  h: 'ه',
  i: 'ي',
  j: 'ج',
  k: 'ك',
  l: 'ل',
  m: 'م',
  n: 'ن',
  o: 'و',
  p: 'ب',
  q: 'ق',
  r: 'ر',
  s: 'س',
  t: 'ت',
  u: 'و',
  v: 'ف',
  w: 'و',
  x: 'كس',
  y: 'ي',
  z: 'ز',
};

const COMMON_BANGLADESHI_TERMS: Record<string, string> = {
  md: 'محمد',
  mohammad: 'محمد',
  mohammed: 'محمد',
  amina: 'أمينة',
  begum: 'بيجوم',
  akhter: 'أختر',
  akter: 'أختر',
  khatun: 'خاتون',
  fatema: 'فاطمة',
  fatima: 'فاطمة',
  rahima: 'رحيمة',
  karim: 'كريم',
  abdul: 'عبد',
  rahman: 'الرحمن',
  islam: 'إسلام',
  hossain: 'حسين',
  hussein: 'حسين',
  hasan: 'حسن',
  hassan: 'حسن',
  ali: 'علي',
  ahmed: 'أحمد',
  uddin: 'الدين',
  mia: 'ميا',
  miah: 'ميا',
  dhaka: 'دكا',
  comilla: 'كوميلا',
  cumilla: 'كوميلا',
  sylhet: 'سيلهت',
  chittagong: 'شيتاغونغ',
  chattogram: 'شيتاغونغ',
  rajshahi: 'راجشاهي',
  khulna: 'خولنا',
  barisal: 'باريسال',
  rangpur: 'رانغبور',
  mymensingh: 'ميمينسينغ',
  bangladesh: 'بنغلاديش',
};

export function transliterateTextToArabicFallback(input: string): string {
  const cleaned = input.trim();
  if (!cleaned) return '';

  return cleaned
    .split(/\s+/)
    .map((rawWord) => {
      const lower = rawWord.toLowerCase().replace(/[^a-z]/g, '');
      if (!lower) return rawWord;
      if (COMMON_BANGLADESHI_TERMS[lower]) {
        return COMMON_BANGLADESHI_TERMS[lower];
      }

      let out = '';
      let i = 0;
      while (i < lower.length) {
        const pair = lower.slice(i, i + 2);
        const digraph = PHONETIC_DIGRAPHS.find(([k]) => k === pair);
        if (digraph) {
          out += digraph[1];
          i += 2;
          continue;
        }
        const ch = lower[i];
        // Skip middle short vowels unless at start for cleaner Arabic name rendering
        if ((ch === 'a' || ch === 'e' || ch === 'i' || ch === 'o' || ch === 'u') && i > 0 && i < lower.length - 1) {
          if (ch === 'i') out += 'ي';
          else if (ch === 'o' || ch === 'u') out += 'و';
          i += 1;
          continue;
        }
        out += PHONETIC_CHARS[ch] ?? '';
        i += 1;
      }
      return out || rawWord;
    })
    .join(' ');
}
