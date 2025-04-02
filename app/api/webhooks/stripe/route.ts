/* eslint-disable camelcase */
import { createTransaction } from '@/lib/actions/transaction.action'
import {Stripe} from 'stripe';
import {NextResponse} from 'next/server';
import {headers} from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(req: Request) {
  let event: Stripe.Event;

  try {
    const stripeSignature = (await headers()).get('stripe-signature');

    event = stripe.webhooks.constructEvent(
      await req.text(),
      stripeSignature as string,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    // On error, log and return the error message.
    if (err! instanceof Error) console.log(err);
    console.log(`❌ Error message: ${errorMessage}`);
    return NextResponse.json(
      {message: `Webhook Error: ${errorMessage}`},
      {status: 400}
    );
  }

  // Successfully constructed event.
  console.log('✅ Success:', event.id);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const transaction = {
      stripeId: session.id,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      plan: session.metadata?.plan || '',
      credits: Number(session.metadata?.credits) || 0,
      buyerId: session.metadata?.buyerId || '',
      createdAt: new Date(),
    }

    await createTransaction(transaction)
    return NextResponse.json({ message: 'Transaction created' })
  }

  return new Response('', { status: 200 })
};

export const config = {
  api: {
    bodyParser: false,
  },
};