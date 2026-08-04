// app/api/privy-status/route.ts
//
// Proxies Privy's public status page (Instatus) so the client can tell users
// "our wallet provider is having an outage" instead of surfacing generic
// auth/signing failures. Fetched server-side to avoid CORS and to share one
// cached result across all clients.
import { NextResponse } from 'next/server';

const PRIVY_STATUS_URL = 'https://status.privy.io/summary.json';

export interface PrivyStatusIncident {
  id: string;
  name: string;
  status: string;
  impact: string;
  started: string;
  url: string;
}

export interface PrivyStatusResponse {
  hasIssues: boolean;
  incidents: PrivyStatusIncident[];
}

export async function GET() {
  try {
    const response = await fetch(PRIVY_STATUS_URL, {
      // One fetch per minute per server instance; an outage banner does not
      // need to be fresher than that.
      next: { revalidate: 60 },
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Status page returned ${response.status}`);
    }

    const data = await response.json();

    const incidents: PrivyStatusIncident[] = Array.isArray(
      data?.activeIncidents,
    )
      ? data.activeIncidents.map((incident: any) => ({
          id: String(incident?.id ?? ''),
          name: String(incident?.name ?? 'Privy incident'),
          status: String(incident?.status ?? 'INVESTIGATING'),
          impact: String(incident?.impact ?? ''),
          started: String(incident?.started ?? ''),
          url: String(incident?.url ?? 'https://status.privy.io'),
        }))
      : [];

    const body: PrivyStatusResponse = {
      hasIssues: data?.page?.status === 'HASISSUES' && incidents.length > 0,
      incidents,
    };

    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'public, s-maxage=60, max-age=30' },
    });
  } catch {
    // If the status page itself is unreachable, report "no known issues"
    // rather than erroring — this endpoint must never make a failure state
    // noisier than it already is.
    const body: PrivyStatusResponse = { hasIssues: false, incidents: [] };
    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
