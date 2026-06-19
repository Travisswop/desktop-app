import { NextRequest } from 'next/server';
import { GET } from '@/app/api/polymarket/btc5m-market/route';

const btcEventMarket = {
  id: '2591404',
  question: 'Bitcoin Up or Down - June 18, 10:30PM-10:35PM ET',
  closed: true,
  active: true,
  outcomes: '["Up", "Down"]',
  outcomePrices: '["1", "0"]',
  clobTokenIds:
    '["650772394347256322993453412575341261012542910488700298280690494229061991645", "70384465825970993815844068765609179908034160003838261315467102640689641682559"]',
};

describe('BTC 5m market route', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('falls back to Gamma events for settled markets missing from the markets slug endpoint', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/markets?slug=')) {
        return Response.json([]);
      }

      if (url.includes('/events?slug=btc-updown-5m-1781836200')) {
        return Response.json([
          {
            id: '606899',
            title: 'Bitcoin Up or Down - June 18, 10:30PM-10:35PM ET',
            markets: [btcEventMarket],
          },
        ]);
      }

      return Response.json([], { status: 404 });
    });
    global.fetch = fetchMock as typeof fetch;

    const response = await GET(
      new NextRequest(
        'http://localhost/api/polymarket/btc5m-market?window_start=1781836200',
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.outcomes).toBe('["Up", "Down"]');
    expect(body.outcomePrices).toBe('["1", "0"]');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/markets?slug=btc-updown-5m-1781836200'),
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/events?slug=btc-updown-5m-1781836200'),
      expect.any(Object),
    );
  });
});
