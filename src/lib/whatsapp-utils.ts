export const WHATSAPP_COUNTRY_CODES: Array<{
  code: string;
  country: string;
  example: string;
}> = [
  { code: '+966', country: 'Saudi Arabia', example: '50 123 4567' },
  { code: '+971', country: 'United Arab Emirates', example: '50 123 4567' },
  { code: '+974', country: 'Qatar', example: '5512 3456' },
  { code: '+965', country: 'Kuwait', example: '5012 3456' },
  { code: '+968', country: 'Oman', example: '9123 4567' },
  { code: '+973', country: 'Bahrain', example: '3612 3456' },
  { code: '+962', country: 'Jordan', example: '79 123 4567' },
  { code: '+880', country: 'Bangladesh', example: '1711 234567' },
];

export type WhatsAppVerificationStatus = 'VERIFIED' | 'NOT_REGISTERED' | 'UNVERIFIED';

export interface WhatsAppGatewayConfig {
  configured: boolean;
  gatewayUrl: string;
  apiKey: string;
  centralInstance: string;
}

/**
 * Normalizes a country code + local phone string into E.164 digits only (no "+").
 * Example: ("+966", "050 123-4567") -> "966501234567"
 */
export function normalizeWhatsAppPhone(countryCode: string, localNumber: string): string {
  const ccDigits = countryCode.replace(/\D/g, '');
  if (!ccDigits) {
    throw new Error('Country code is required');
  }

  let localDigits = localNumber.trim().replace(/\D/g, '');
  if (!localDigits) {
    throw new Error('Phone number is required');
  }

  // Strip international "00" dialing prefix if pasted
  if (localDigits.startsWith('00')) {
    localDigits = localDigits.slice(2);
  }

  // Avoid duplicating country code if user pasted full international digits
  if (localDigits.startsWith(ccDigits) && localDigits.length - ccDigits.length >= 7) {
    localDigits = localDigits.slice(ccDigits.length);
  }

  // Strip domestic trunk leading zeroes (e.g. Saudi 050... -> 50...)
  localDigits = localDigits.replace(/^0+/, '');

  const combined = `${ccDigits}${localDigits}`;
  if (combined.length < 8 || combined.length > 15) {
    throw new Error('Enter a valid WhatsApp phone number (8–15 digits including country code)');
  }

  return combined;
}

export function formatNormalizedPhoneDisplay(countryCode: string, normalizedPhone: string): string {
  const ccDigits = countryCode.replace(/\D/g, '');
  if (ccDigits && normalizedPhone.startsWith(ccDigits)) {
    const rest = normalizedPhone.slice(ccDigits.length);
    return `+${ccDigits} ${rest}`;
  }
  return `+${normalizedPhone}`;
}

export function resolveWhatsAppGatewayConfig(
  env: Record<string, string | undefined>
): WhatsAppGatewayConfig {
  const gatewayUrl = (env.WHATSAPP_GATEWAY_URL || '').trim().replace(/\/+$/, '');
  const apiKey = (env.WHATSAPP_GATEWAY_API_KEY || '').trim();
  const centralInstance = (env.WHATSAPP_CENTRAL_INSTANCE || '').trim();

  return {
    configured: gatewayUrl.length > 0 && centralInstance.length > 0,
    gatewayUrl,
    apiKey,
    centralInstance,
  };
}

export function buildGatewayCheckUrl(config: WhatsAppGatewayConfig): string {
  return `${config.gatewayUrl}/chat/whatsappNumbers/${encodeURIComponent(config.centralInstance)}`;
}

export function buildGatewaySendMediaUrl(config: WhatsAppGatewayConfig): string {
  return `${config.gatewayUrl}/message/sendMedia/${encodeURIComponent(config.centralInstance)}`;
}

export function parseWhatsAppNumberCheckResponse(
  payload: unknown,
  cleanPhone: string
): { isRegistered: boolean; jid: string | null } {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown[] }).data)
      ? (payload as { data: unknown[] }).data
      : payload && typeof payload === 'object'
        ? [payload]
        : [];

  const targetDigits = cleanPhone.replace(/\D/g, '');

  const match =
    list.find((entry) => {
      if (!entry || typeof entry !== 'object') return false;
      const obj = entry as Record<string, unknown>;
      const num = String(obj.number ?? obj.phone ?? obj.jid ?? '').replace(/\D/g, '');
      return num === targetDigits || num.endsWith(targetDigits);
    }) ?? list[0];

  if (!match || typeof match !== 'object') {
    return { isRegistered: false, jid: null };
  }

  const record = match as Record<string, unknown>;
  const existsFlag = Boolean(
    record.exists ?? record.numberExists ?? record.isRegistered ?? record.registered ?? false
  );
  const rawJid = typeof record.jid === 'string'
    ? record.jid
    : typeof record.whatsappJid === 'string'
      ? record.whatsappJid
      : null;

  if (!existsFlag) {
    return { isRegistered: false, jid: null };
  }

  return {
    isRegistered: true,
    jid: rawJid || `${targetDigits}@s.whatsapp.net`,
  };
}

export function buildWhatsAppCvCaption(input: {
  customCaption?: string | null;
  agentName: string;
  companyName: string;
  workerCode: string;
  workerName: string;
  language: 'EN' | 'AR';
}): string {
  const agent = input.agentName.trim() || 'Authorized Agent';
  const company = input.companyName.trim() || 'Partner Recruitment Agency';
  const defaultBody =
    input.language === 'AR'
      ? `السيرة الذاتية للمرشح ${input.workerName} (${input.workerCode}). يرجى المراجعة وإفادتنا برأيكم.`
      : `Candidate CV dossier for ${input.workerName} (${input.workerCode}). Please review and let us know if you would like to proceed.`;

  const body = (input.customCaption || '').trim() || defaultBody;
  const signature = `Sent on behalf of ${agent} — ${company}`;

  if (body.includes(signature)) {
    return body;
  }

  return `${body}\n\n—\n${signature}`;
}

export function stripBase64DataUrl(
  rawBase64: string,
  format: 'PDF' | 'PNG'
): { base64: string; mimetype: string; mediatype: 'document' | 'image' } {
  const trimmed = rawBase64.trim();
  const base64 = trimmed.includes(',') ? trimmed.slice(trimmed.indexOf(',') + 1) : trimmed;
  return {
    base64,
    mimetype: format === 'PDF' ? 'application/pdf' : 'image/png',
    mediatype: format === 'PDF' ? 'document' : 'image',
  };
}
