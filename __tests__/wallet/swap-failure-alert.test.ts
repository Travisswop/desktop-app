import {
  buildSwapFailureAlertEmail,
  getSwapFailureAlertConfig,
  sanitizeForLog,
  sendSwapFailureAlertEmail,
  type SwapFailureEvent,
} from '@/lib/wallet/swapFailureAlert';

const sampleEvent: SwapFailureEvent = {
  type: 'wallet_swap_failure',
  receivedAt: '2026-06-20T15:44:55.000Z',
  source: 'desktop',
  payload: {
    provider: 'Jupiter',
    stage: 'jupiter_simulation_after_ata_prune',
    reason: 'Program ATokenGPvbdGVxr1b2hvZbsiq invoke failed',
    walletAddress: 'Abc123...xyz',
    inputToken: {
      symbol: 'MCDX',
      mint: 'XsMCDxMint',
      amount: '0.12839853',
      rawAmount: '12839853',
      tokenProgram: 'TokenzQdB...',
    },
    outputToken: {
      symbol: 'SWOP',
      mint: 'SWOPMint',
      amount: '5887.52',
      tokenProgram: 'Tokenkeg...',
    },
    route: {
      slippageBps: 300,
      platformFeeBps: 0,
      platformFeeSkippedReason: 'token-2022-route',
      instructionVersion: 'V2',
    },
    authorization: 'Bearer should-not-leak',
  },
};

function testEnv(values: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'test',
    ...values,
  } as NodeJS.ProcessEnv;
}

describe('swap failure alert helpers', () => {
  it('sanitizes sensitive fields and large payloads', () => {
    const sanitized = sanitizeForLog({
      secret: 'nope',
      nested: {
        password: 'also-nope',
      },
      items: Array.from({ length: 40 }, (_, index) => index),
      longMessage: 'x'.repeat(1_300),
    }) as Record<string, any>;

    expect(sanitized.secret).toBe('[redacted]');
    expect(sanitized.nested.password).toBe('[redacted]');
    expect(sanitized.items).toHaveLength(30);
    expect(sanitized.longMessage).toHaveLength(1_203);
  });

  it('requires recipients and provider settings before enabling alerts', () => {
    expect(getSwapFailureAlertConfig(testEnv())).toMatchObject({
      enabled: false,
      reason: 'missing-recipient',
    });

    expect(
      getSwapFailureAlertConfig({
        NODE_ENV: 'test',
        SWOP_SWAP_FAILURE_ALERT_EMAIL: 'ops@swopme.app',
      }),
    ).toMatchObject({
      enabled: false,
      reason: 'missing-provider-key',
      recipients: ['ops@swopme.app'],
    });

    expect(
      getSwapFailureAlertConfig({
        NODE_ENV: 'test',
        SWOP_SWAP_FAILURE_ALERT_EMAIL: 'ops@swopme.app',
        SENDGRID_API_KEY: 'sg-test',
        SENDGRID_FROM_EMAIL: 'alerts@swopme.app',
      }),
    ).toMatchObject({
      enabled: true,
      provider: 'sendgrid',
      recipients: ['ops@swopme.app'],
      fromEmail: 'alerts@swopme.app',
    });
  });

  it('builds a concise alert email from the sanitized swap event', () => {
    const email = buildSwapFailureAlertEmail(sampleEvent, '[Swap Alert]');

    expect(email.subject).toContain('[Swap Alert]: Jupiter');
    expect(email.subject).toContain('jupiter_simulation_after_ata_prune');
    expect(email.text).toContain('Input: 0.12839853 MCDX');
    expect(email.text).toContain('Output: 5887.52 SWOP');
    expect(email.text).toContain('feeSkipped=token-2022-route');
    expect(email.text).not.toContain('should-not-leak');
    expect(email.text).toContain('"authorization": "[redacted]"');
  });

  it('sends SendGrid alert emails without adding runtime dependencies', async () => {
    let requestUrl = '';
    let requestInit: RequestInit | undefined;
    const fetchImpl = jest.fn(async (url: string, init?: RequestInit) => {
      requestUrl = url;
      requestInit = init;
      return new Response('', { status: 202 });
    });

    const result = await sendSwapFailureAlertEmail(sampleEvent, {
      config: {
        enabled: true,
        provider: 'sendgrid',
        apiKey: 'sg-test',
        recipients: ['ops@swopme.app'],
        fromEmail: 'alerts@swopme.app',
        subjectPrefix: '[Swap Alert]',
      },
      fetchImpl,
    });

    expect(result).toEqual({ sent: true, provider: 'sendgrid' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(requestUrl).toBe('https://api.sendgrid.com/v3/mail/send');
    expect(requestInit?.headers).toMatchObject({
      Authorization: 'Bearer sg-test',
      'Content-Type': 'application/json',
    });

    const body = JSON.parse(String(requestInit?.body));
    expect(body.personalizations[0].to[0].email).toBe('ops@swopme.app');
    expect(body.from.email).toBe('alerts@swopme.app');
    expect(body.content[0].value).toContain('Jupiter');
    expect(body.content[0].value).not.toContain('should-not-leak');
  });
});
