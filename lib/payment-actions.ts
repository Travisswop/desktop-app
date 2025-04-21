'use server';

import { Stripe } from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createPaymentIntent(
  amount: number
): Promise<{ clientSecret: string }> {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    if (!paymentIntent.client_secret) {
      throw new Error(
        'Failed to create payment intent: No client secret returned'
      );
    }

    return {
      clientSecret: paymentIntent.client_secret,
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw new Error('Failed to create payment intent');
  }
}

// Verify a webhook signature using the webhook secret
export async function verifyStripeWebhook(
  payload: string,
  signature: string
) {
  try {
    // Use Stripe's webhook signature verification
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    return event;
  } catch (error) {
    console.error('Error verifying webhook:', error);
    throw new Error(
      `Webhook signature verification failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

// Add a function to retrieve payment details
export async function getPaymentDetails(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(
      paymentIntentId
    );
    return paymentIntent;
  } catch (error) {
    console.error('Error retrieving payment details:', error);
    throw new Error('Failed to retrieve payment details');
  }
}

// Function to handle successful payments
export async function handleSuccessfulPayment(
  paymentIntentId: string
) {
  try {
    // Get the payment details
    const paymentIntent = await stripe.paymentIntents.retrieve(
      paymentIntentId
    );

    // Here you would typically:
    // 1. Update your database with order information
    // 2. Send confirmation emails
    // 3. Update inventory
    // 4. etc.

    console.log(`Processing successful payment: ${paymentIntentId}`);

    // For now, we'll just return the payment status
    return {
      success: true,
      paymentId: paymentIntentId,
      amount: paymentIntent.amount,
      status: paymentIntent.status,
    };
  } catch (error) {
    console.error('Error handling successful payment:', error);
    throw new Error('Failed to process successful payment');
  }
}
