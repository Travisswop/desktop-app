const MAX_STRING_LENGTH = 1_200;
const MAX_ARRAY_LENGTH = 30;
const MAX_EMAIL_EVENT_LENGTH = 20_000;
const MAX_SUBJECT_DETAIL_LENGTH = 160;
const ALERT_TIMEOUT_MS = 5_000;

const DEFAULT_SUBJECT_PREFIX = '[Swop] Wallet swap failure';
const SENDGRID_MAIL_URL = 'https://api.sendgrid.com/v3/mail/send';
const RESEND_EMAIL_URL = 'https://api.resend.com/emails';

const REDACTED_FIELD_PATTERN =
  /^(accessToken|refreshToken|idToken|secret|password|authorization|apiKey|privateKey|mnemonic|seed)$/i;

type AlertProvider = 'sendgrid' | 'resend';

type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Pick<Response, 'ok' | 'status' | 'text'>>;

export type SwapFailureEvent = {
  type: 'wallet_swap_failure';
  receivedAt: string;
  source: 'desktop';
  payload: unknown;
};

export type SwapFailureAlertConfig =
  | {
      enabled: false;
      reason:
        | 'missing-recipient'
        | 'missing-provider-key'
        | 'missing-from-email';
      recipients: string[];
      subjectPrefix: string;
      provider?: AlertProvider;
    }
  | {
      enabled: true;
      provider: AlertProvider;
      apiKey: string;
      recipients: string[];
      fromEmail: string;
      subjectPrefix: string;
    };

export type SwapFailureAlertResult =
  | {
      sent: true;
      provider: AlertProvider;
    }
  | {
      sent: false;
      skippedReason: string;
    };

export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[truncated]';
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}...`
      : value;
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_LENGTH)
      .map((item) => sanitizeForLog(item, depth + 1));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        REDACTED_FIELD_PATTERN.test(key)
          ? '[redacted]'
          : sanitizeForLog(item, depth + 1),
      ]),
    );
  }
  return undefined;
}

function parseRecipientList(value: string | undefined) {
  return (value || '')
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeProvider(value: string | undefined): AlertProvider | null {
  const normalized = value?.trim().toLowerCase();
  return normalized === 'sendgrid' || normalized === 'resend'
    ? normalized
    : null;
}

function readEnvValue(
  env: NodeJS.ProcessEnv,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function getSwapFailureAlertConfig(
  env: NodeJS.ProcessEnv = process.env,
): SwapFailureAlertConfig {
  const recipients = parseRecipientList(
    readEnvValue(env, [
      'SWOP_SWAP_FAILURE_ALERT_EMAIL',
      'SWOP_SWAP_FAILURE_ALERT_TO',
    ]),
  );
  const subjectPrefix =
    readEnvValue(env, ['SWOP_SWAP_FAILURE_ALERT_SUBJECT_PREFIX']) ||
    DEFAULT_SUBJECT_PREFIX;

  if (!recipients.length) {
    return {
      enabled: false,
      reason: 'missing-recipient',
      recipients,
      subjectPrefix,
    };
  }

  const preferredProvider = normalizeProvider(
    env.SWOP_SWAP_FAILURE_ALERT_PROVIDER,
  );
  const sendgridApiKey = readEnvValue(env, ['SENDGRID_API_KEY']);
  const resendApiKey = readEnvValue(env, ['RESEND_API_KEY']);

  let provider: AlertProvider | undefined;
  let apiKey: string | undefined;

  if (preferredProvider === 'resend' && resendApiKey) {
    provider = 'resend';
    apiKey = resendApiKey;
  } else if (preferredProvider === 'sendgrid' && sendgridApiKey) {
    provider = 'sendgrid';
    apiKey = sendgridApiKey;
  } else if (sendgridApiKey) {
    provider = 'sendgrid';
    apiKey = sendgridApiKey;
  } else if (resendApiKey) {
    provider = 'resend';
    apiKey = resendApiKey;
  }

  if (!provider || !apiKey) {
    return {
      enabled: false,
      reason: 'missing-provider-key',
      recipients,
      subjectPrefix,
    };
  }

  const providerFromKey =
    provider === 'sendgrid' ? 'SENDGRID_FROM_EMAIL' : 'RESEND_FROM_EMAIL';
  const fromEmail = readEnvValue(env, [
    'SWOP_SWAP_FAILURE_ALERT_FROM',
    providerFromKey,
    'SENDGRID_FROM_EMAIL',
    'RESEND_FROM_EMAIL',
    'FROM_EMAIL',
  ]);

  if (!fromEmail) {
    return {
      enabled: false,
      reason: 'missing-from-email',
      recipients,
      subjectPrefix,
      provider,
    };
  }

  return {
    enabled: true,
    provider,
    apiKey,
    recipients,
    fromEmail,
    subjectPrefix,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readDisplayValue(
  record: Record<string, unknown> | null,
  key: string,
): string | undefined {
  if (!record) return undefined;
  const value = record[key];
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return String(value);
  return undefined;
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}\n...[truncated]`;
}

function truncateSingleLine(value: string, maxLength: number) {
  const singleLine = value.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= maxLength) return singleLine;
  return `${singleLine.slice(0, Math.max(0, maxLength - 3))}...`;
}

function formatTokenSummary(value: unknown) {
  const token = asRecord(value);
  if (!token) return null;

  const amount = readDisplayValue(token, 'amount');
  const symbol = readDisplayValue(token, 'symbol') || 'unknown token';
  const mint = readDisplayValue(token, 'mint');
  const rawAmount = readDisplayValue(token, 'rawAmount');
  const tokenProgram = readDisplayValue(token, 'tokenProgram');

  return [
    [amount, symbol].filter(Boolean).join(' '),
    mint ? `mint=${mint}` : null,
    rawAmount ? `raw=${rawAmount}` : null,
    tokenProgram ? `program=${tokenProgram}` : null,
  ]
    .filter(Boolean)
    .join(' | ');
}

function formatRouteSummary(value: unknown) {
  const route = asRecord(value);
  if (!route) return null;

  const parts = [
    readDisplayValue(route, 'slippageBps')
      ? `slippageBps=${readDisplayValue(route, 'slippageBps')}`
      : null,
    readDisplayValue(route, 'platformFeeBps')
      ? `platformFeeBps=${readDisplayValue(route, 'platformFeeBps')}`
      : null,
    readDisplayValue(route, 'platformFeeSkippedReason')
      ? `feeSkipped=${readDisplayValue(route, 'platformFeeSkippedReason')}`
      : null,
    readDisplayValue(route, 'instructionVersion')
      ? `instructionVersion=${readDisplayValue(route, 'instructionVersion')}`
      : null,
    readDisplayValue(route, 'feeAccount')
      ? `feeAccount=${readDisplayValue(route, 'feeAccount')}`
      : null,
  ].filter(Boolean);

  if (parts.length) return parts.join(' | ');
  return truncateSingleLine(JSON.stringify(route), 800);
}

export function buildSwapFailureAlertEmail(
  event: SwapFailureEvent,
  subjectPrefix = DEFAULT_SUBJECT_PREFIX,
) {
  const safeEvent = sanitizeForLog(event) as SwapFailureEvent;
  const payload = asRecord(safeEvent.payload);
  const provider = readDisplayValue(payload, 'provider') || 'unknown provider';
  const stage = readDisplayValue(payload, 'stage') || 'unknown stage';
  const reason =
    readDisplayValue(payload, 'reason') ||
    readDisplayValue(payload, 'error') ||
    'Swap failed';
  const walletAddress =
    readDisplayValue(payload, 'walletAddress') || 'unknown wallet';
  const inputToken = formatTokenSummary(payload?.inputToken);
  const outputToken = formatTokenSummary(payload?.outputToken);
  const route = formatRouteSummary(payload?.route);
  const eventJson = truncateText(
    JSON.stringify(safeEvent, null, 2) || '{}',
    MAX_EMAIL_EVENT_LENGTH,
  );
  const subjectDetail = truncateSingleLine(
    `${provider} / ${stage} / ${reason}`,
    MAX_SUBJECT_DETAIL_LENGTH,
  );

  const lines = [
    'A desktop wallet swap failure was reported.',
    '',
    `Received: ${safeEvent.receivedAt}`,
    `Source: ${safeEvent.source}`,
    `Provider: ${provider}`,
    `Stage: ${stage}`,
    `Reason: ${reason}`,
    `Wallet: ${walletAddress}`,
    inputToken ? `Input: ${inputToken}` : null,
    outputToken ? `Output: ${outputToken}` : null,
    route ? `Route: ${route}` : null,
    '',
    'Sanitized event payload:',
    eventJson,
  ].filter((line): line is string => line !== null);

  return {
    subject: `${subjectPrefix}: ${subjectDetail}`,
    text: lines.join('\n'),
  };
}

function buildSendgridPayload(
  config: Extract<SwapFailureAlertConfig, { enabled: true }>,
  email: ReturnType<typeof buildSwapFailureAlertEmail>,
) {
  return {
    personalizations: [
      {
        to: config.recipients.map((recipient) => ({ email: recipient })),
      },
    ],
    from: { email: config.fromEmail },
    subject: email.subject,
    content: [
      {
        type: 'text/plain',
        value: email.text,
      },
    ],
  };
}

function buildResendPayload(
  config: Extract<SwapFailureAlertConfig, { enabled: true }>,
  email: ReturnType<typeof buildSwapFailureAlertEmail>,
) {
  return {
    from: config.fromEmail,
    to: config.recipients,
    subject: email.subject,
    text: email.text,
  };
}

async function readFailureBody(response: Pick<Response, 'text'>) {
  try {
    return truncateSingleLine(await response.text(), 500);
  } catch {
    return '';
  }
}

export async function sendSwapFailureAlertEmail(
  event: SwapFailureEvent,
  options: {
    config?: SwapFailureAlertConfig;
    env?: NodeJS.ProcessEnv;
    fetchImpl?: FetchLike;
  } = {},
): Promise<SwapFailureAlertResult> {
  const config =
    options.config || getSwapFailureAlertConfig(options.env || process.env);

  if (!config.enabled) {
    return { sent: false, skippedReason: config.reason };
  }

  const email = buildSwapFailureAlertEmail(event, config.subjectPrefix);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ALERT_TIMEOUT_MS);
  const fetchImpl = options.fetchImpl || fetch;

  try {
    const response =
      config.provider === 'sendgrid'
        ? await fetchImpl(SENDGRID_MAIL_URL, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(buildSendgridPayload(config, email)),
            signal: controller.signal,
          })
        : await fetchImpl(RESEND_EMAIL_URL, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(buildResendPayload(config, email)),
            signal: controller.signal,
          });

    if (!response.ok) {
      const body = await readFailureBody(response);
      throw new Error(
        `${config.provider} returned ${response.status}${
          body ? `: ${body}` : ''
        }`,
      );
    }

    return { sent: true, provider: config.provider };
  } finally {
    clearTimeout(timeout);
  }
}
