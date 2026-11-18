import {
  buildGatewayCheckUrl,
  buildGatewaySendMediaUrl,
  parseWhatsAppNumberCheckResponse,
  resolveWhatsAppGatewayConfig,
  stripBase64DataUrl,
} from './whatsapp-utils.ts';

export class GatewayNotConfiguredError extends Error {
  constructor(
    message = 'Central WhatsApp gateway is not configured. Set WHATSAPP_GATEWAY_URL, WHATSAPP_GATEWAY_API_KEY, and WHATSAPP_CENTRAL_INSTANCE in .env.'
  ) {
    super(message);
    this.name = 'GatewayNotConfiguredError';
  }
}

export function getCentralGatewayStatus() {
  const cfg = resolveWhatsAppGatewayConfig(process.env);
  return {
    configured: cfg.configured,
    centralInstanceSet: cfg.centralInstance.length > 0,
  };
}

export async function verifyNumberOnCentralWhatsApp(cleanPhone: string): Promise<{
  isRegistered: boolean;
  jid: string | null;
}> {
  const cfg = resolveWhatsAppGatewayConfig(process.env);
  if (!cfg.configured) {
    throw new GatewayNotConfiguredError();
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (cfg.apiKey) {
    headers.apikey = cfg.apiKey;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(buildGatewayCheckUrl(cfg), {
      method: 'POST',
      headers,
      body: JSON.stringify({ numbers: [cleanPhone] }),
      signal: controller.signal,
    });

    const rawText = await response.text();
    let payload: unknown = null;
    if (rawText) {
      try {
        payload = JSON.parse(rawText);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      const msg =
        (payload as { message?: string; error?: string } | null)?.message ||
        (payload as { error?: string } | null)?.error ||
        `WhatsApp gateway number check failed (${response.status})`;
      throw new Error(msg);
    }

    return parseWhatsAppNumberCheckResponse(payload, cleanPhone);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function sendCvMediaViaCentralWhatsApp(params: {
  recipientJidOrPhone: string;
  format: 'PDF' | 'PNG';
  fileBase64: string;
  fileName: string;
  caption: string;
}): Promise<{ ok: boolean; errorMsg?: string }> {
  const cfg = resolveWhatsAppGatewayConfig(process.env);
  if (!cfg.configured) {
    throw new GatewayNotConfiguredError();
  }

  const { base64, mimetype, mediatype } = stripBase64DataUrl(params.fileBase64, params.format);
  if (!base64) {
    return { ok: false, errorMsg: 'Generated CV file payload is empty' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (cfg.apiKey) {
    headers.apikey = cfg.apiKey;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(buildGatewaySendMediaUrl(cfg), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        number: params.recipientJidOrPhone,
        mediatype,
        mimetype,
        caption: params.caption,
        media: base64,
        fileName: params.fileName,
      }),
      signal: controller.signal,
    });

    const rawText = await response.text();
    let payload: unknown = null;
    if (rawText) {
      try {
        payload = JSON.parse(rawText);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      const errMsg =
        (payload as { message?: string; error?: string } | null)?.message ||
        (payload as { error?: string } | null)?.error ||
        `Gateway returned HTTP ${response.status}`;
      return { ok: false, errorMsg: errMsg };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      errorMsg: err instanceof Error ? err.message : 'Network error reaching WhatsApp gateway',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
