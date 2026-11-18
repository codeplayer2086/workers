import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGatewayCheckUrl,
  buildGatewaySendMediaUrl,
  buildWhatsAppCvCaption,
  formatNormalizedPhoneDisplay,
  normalizeWhatsAppPhone,
  parseWhatsAppNumberCheckResponse,
  resolveWhatsAppGatewayConfig,
  stripBase64DataUrl,
} from './whatsapp-utils';

test('normalizeWhatsAppPhone normalizes GCC numbers with spaces, dashes, and leading zeros', () => {
  assert.equal(normalizeWhatsAppPhone('+966', '050 123-4567'), '966501234567');
  assert.equal(normalizeWhatsAppPhone('+971', '50 998 1122'), '971509981122');
  assert.equal(normalizeWhatsAppPhone('+880', '01711-204810'), '8801711204810');
});

test('normalizeWhatsAppPhone avoids double country code when user pastes full number', () => {
  assert.equal(normalizeWhatsAppPhone('+966', '966501234567'), '966501234567');
  assert.equal(normalizeWhatsAppPhone('+966', '00966501234567'), '966501234567');
});

test('normalizeWhatsAppPhone rejects invalid short numbers', () => {
  assert.throws(() => normalizeWhatsAppPhone('+966', '1234'), /8–15 digits/);
});

test('formatNormalizedPhoneDisplay formats readable E.164 display string', () => {
  assert.equal(formatNormalizedPhoneDisplay('+966', '966501234567'), '+966 501234567');
});

test('resolveWhatsAppGatewayConfig builds proper URLs and detects configuration', () => {
  const unconfigured = resolveWhatsAppGatewayConfig({});
  assert.equal(unconfigured.configured, false);

  const configured = resolveWhatsAppGatewayConfig({
    WHATSAPP_GATEWAY_URL: 'https://wa.example.com///',
    WHATSAPP_GATEWAY_API_KEY: 'secret-key',
    WHATSAPP_CENTRAL_INSTANCE: 'maktab_central',
  });
  assert.equal(configured.configured, true);
  assert.equal(
    buildGatewayCheckUrl(configured),
    'https://wa.example.com/chat/whatsappNumbers/maktab_central'
  );
  assert.equal(
    buildGatewaySendMediaUrl(configured),
    'https://wa.example.com/message/sendMedia/maktab_central'
  );
});

test('parseWhatsAppNumberCheckResponse extracts VERIFIED jid and NOT_REGISTERED state', () => {
  const verified = parseWhatsAppNumberCheckResponse(
    [{ exists: true, jid: '966501234567@s.whatsapp.net', number: '966501234567' }],
    '966501234567'
  );
  assert.deepEqual(verified, {
    isRegistered: true,
    jid: '966501234567@s.whatsapp.net',
  });

  const missing = parseWhatsAppNumberCheckResponse(
    [{ exists: false, number: '966509999999' }],
    '966509999999'
  );
  assert.deepEqual(missing, {
    isRegistered: false,
    jid: null,
  });
});

test('buildWhatsAppCvCaption appends clear agent and company signature without duplication', () => {
  const caption = buildWhatsAppCvCaption({
    customCaption: 'Please find Amina CV attached.',
    agentName: 'Fahad Al-Qahtani',
    companyName: 'Al-Jazira International Manpower',
    workerCode: 'WKR-2026-0001',
    workerName: 'Amina Begum',
    language: 'EN',
  });
  assert.ok(caption.startsWith('Please find Amina CV attached.'));
  assert.ok(
    caption.includes('Sent on behalf of Fahad Al-Qahtani — Al-Jazira International Manpower')
  );

  const reSigned = buildWhatsAppCvCaption({
    customCaption: caption,
    agentName: 'Fahad Al-Qahtani',
    companyName: 'Al-Jazira International Manpower',
    workerCode: 'WKR-2026-0001',
    workerName: 'Amina Begum',
    language: 'EN',
  });
  assert.equal(reSigned, caption);
});

test('stripBase64DataUrl strips data URI prefix and picks correct mediatype', () => {
  const pdf = stripBase64DataUrl('data:application/pdf;base64,JVBERi0xLjQ=', 'PDF');
  assert.equal(pdf.base64, 'JVBERi0xLjQ=');
  assert.equal(pdf.mediatype, 'document');
  assert.equal(pdf.mimetype, 'application/pdf');

  const png = stripBase64DataUrl('iVBORw0KGgo=', 'PNG');
  assert.equal(png.base64, 'iVBORw0KGgo=');
  assert.equal(png.mediatype, 'image');
  assert.equal(png.mimetype, 'image/png');
});
