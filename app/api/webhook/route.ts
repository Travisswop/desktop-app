import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { updateOrderPayment } from '@/actions/orderActions';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event;

  try {
    if (!webhookSecret) {
      throw new Error('Webhook secret is not set');
    }
    
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
      
      const { orderId, accessToken } = paymentIntent.metadata || {};
      
      if (orderId && accessToken) {
        try {
          await updateOrderPayment(
            orderId,
            {
              paymentIntentId: paymentIntent.id,
              status: 'completed',
            },
            accessToken
          );
          console.log(`Order ${orderId} updated successfully`);
        } catch (error) {
          console.error('Error updating order:', error);
        }
      }
      break;
      
    case 'payment_intent.payment_failed':
      const failedPaymentIntent = event.data.object;
      const { orderId: failedOrderId, accessToken: failedAccessToken } = 
        failedPaymentIntent.metadata || {};
      
      if (failedOrderId && failedAccessToken) {
        try {
          await updateOrderPayment(
            failedOrderId,
            {
              paymentIntentId: failedPaymentIntent.id,
              status: 'failed',
            },
            failedAccessToken
          );
          console.log(`Order ${failedOrderId} marked as failed`);
        } catch (error) {
          console.error('Error updating failed order:', error);
        }
      }
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
