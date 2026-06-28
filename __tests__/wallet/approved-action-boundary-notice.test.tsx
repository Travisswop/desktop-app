import { renderToStaticMarkup } from 'react-dom/server';
import {
  ApprovedActionBoundaryNotice,
  hasApprovedActionBoundary,
} from '@/components/wallet/shared/ApprovedActionBoundaryNotice';

describe('ApprovedActionBoundaryNotice', () => {
  test('detects when no approval boundary details are available', () => {
    expect(hasApprovedActionBoundary(null)).toBe(false);
    expect(
      hasApprovedActionBoundary({
        riskControls: [],
      }),
    ).toBe(false);
  });

  test('renders approved caps and review state when boundary details exist', () => {
    const markup = renderToStaticMarkup(
      <ApprovedActionBoundaryNotice
        intro="Review this order inside the approved Goldman boundary."
        boundary={{
          reviewStateLabel: 'User signing required',
          maxOrderUsd: '1250',
          maxDailySpendUsd: '5000',
          maxDailyLossUsd: '350',
          maxOpenPositions: '3',
          expiry: '2026-06-30T18:15:00.000Z',
          riskControls: [
            'Keep the stop loss armed.',
            'Do not add to the position after entry.',
          ],
        }}
      />,
    );

    expect(markup).toContain('Approved Boundary');
    expect(markup).toContain('User signing required');
    expect(markup).toContain('Max order');
    expect(markup).toContain('$1,250');
    expect(markup).toContain('Daily spend cap');
    expect(markup).toContain('$5,000');
    expect(markup).toContain('Daily loss cap');
    expect(markup).toContain('$350');
    expect(markup).toContain('Open positions');
    expect(markup).toContain('3');
    expect(markup).toContain('Risk Controls');
    expect(markup).toContain('Keep the stop loss armed.');
  });
});
