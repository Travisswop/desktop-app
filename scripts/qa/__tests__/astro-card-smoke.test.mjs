import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCardCommandContracts,
  createStep,
  describeExceptionDetails,
  markStepFailure,
  noteRunActivity,
} from '../astro-card-smoke.mjs';

function createReport() {
  return {
    cardContracts: buildCardCommandContracts({
      url: 'https://www.swopme.app/dashboard/chat',
      swapInputMint: 'in',
      swapOutputMint: 'out',
      swapAmount: '1',
      swapTaker: '',
      swapOrderRequired: false,
    }),
    steps: [],
    activeStep: null,
    activeActivity: null,
    lastProgressAt: null,
  };
}

test('markStepFailure synthesizes a page-auth failure when bootstrap fails before card checks', () => {
  const report = createReport();
  report.activeStep = 'page-auth';
  report.activeActivity = 'Waiting for Swop page content before authentication checks.';

  const step = markStepFailure(report, new Error('Runtime.evaluate timed out.'));

  assert.equal(report.steps.length, 1);
  assert.equal(step.name, 'page-auth');
  assert.equal(step.status, 'fail');
  assert.match(step.detail, /Waiting for Swop page content/);
  assert.match(step.detail, /Runtime\.evaluate timed out\./);
  assert.equal(report.activeStep, null);
  assert.equal(report.activeActivity, null);
});

test('markStepFailure keeps the existing pending step and preserves the last activity detail', () => {
  const report = createReport();
  const pageAuthContract = report.cardContracts.find((contract) => contract.step === 'page-auth');
  const step = createStep('page-auth', pageAuthContract);
  report.steps.push(step);
  noteRunActivity(report, step, 'Selecting thread containing "Trading Cabal".');

  const failedStep = markStepFailure(
    report,
    new Error('Timed out waiting for authenticated chat shell. Last value: false')
  );

  assert.equal(report.steps.length, 1);
  assert.equal(failedStep, step);
  assert.equal(failedStep.status, 'fail');
  assert.match(failedStep.detail, /Selecting thread containing "Trading Cabal"/);
  assert.match(failedStep.detail, /Timed out waiting for authenticated chat shell/);
});

test('describeExceptionDetails prefers the browser exception description over plain Uncaught', () => {
  const detail = describeExceptionDetails({
    text: 'Uncaught',
    exception: {
      description: 'Error: Chat composer textarea not found.',
    },
    stackTrace: {
      callFrames: [
        {
          url: 'https://www.swopme.app/dashboard/chat',
          lineNumber: 41,
          columnNumber: 7,
        },
      ],
    },
  });

  assert.match(detail, /Chat composer textarea not found/);
  assert.match(detail, /dashboard\/chat:42:8/);
});
