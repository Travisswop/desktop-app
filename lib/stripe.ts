import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured.');
  }

  stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, property) {
    return getStripe()[property as keyof Stripe];
  },
});
