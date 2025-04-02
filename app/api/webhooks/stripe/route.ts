/* eslint-disable camelcase */
import { createTransaction } from '@/lib/actions/transaction.action'
import { NextResponse } from 'next/server'
import stripe from 'stripe'

const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event

  try {
    event = stripeInstance.webhooks.constructEvent(body, sig, endpointSecret)
  } catch (err) {
    return NextResponse.json(
      { message: 'Webhook error', error: err },
      { status: 400 }
    )
  }

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
}

export const config = {
  api: {
    bodyParser: false,
  },
}