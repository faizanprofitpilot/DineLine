import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/clients/supabase';
import { getStripe, STRIPE_PRICE_IDS, SubscriptionPlan } from '@/lib/clients/stripe';

export const runtime = 'nodejs';

/**
 * Create a Stripe checkout session for subscription
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user }, error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan, trial } = await req.json();

    if (!plan || !['starter', 'professional', 'turbo'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Only starter plan can have free trial
    const isTrial = trial === true && plan === 'starter';

    // Get user's restaurant
    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_user_id', user.id)
      .limit(1)
      .single();

    if (restaurantError || !restaurantData) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const restaurant = restaurantData as any;

    // Get app URL
    let appUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL;

    if (!appUrl) {
      return NextResponse.json(
        { error: 'App URL not configured' },
        { status: 500 }
      );
    }

    if (!appUrl.startsWith('http://') && !appUrl.startsWith('https://')) {
      appUrl = `https://${appUrl}`;
    }

    const priceId = STRIPE_PRICE_IDS[plan as SubscriptionPlan];

    // Create or retrieve Stripe customer
    const stripe = getStripe();
    let customerId = restaurant.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          restaurant_id: restaurant.id,
          user_id: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID to restaurant
      await supabase
        .from('restaurants')
        // @ts-ignore - New field not in types yet
        .update({ stripe_customer_id: customerId })
        .eq('id', restaurant.id);
    }

    // Create checkout session
    const checkoutSessionParams: any = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${appUrl}/dashboard?subscription=success`,
      cancel_url: `${appUrl}/billing?subscription=cancelled`,
      metadata: {
        restaurant_id: restaurant.id,
        user_id: user.id,
        plan: plan,
      },
      subscription_data: {
        metadata: {
          restaurant_id: restaurant.id,
          user_id: user.id,
          plan: plan,
        },
      },
    };

    // Add 14-day free trial for starter plan only
    if (isTrial) {
      checkoutSessionParams.subscription_data.trial_period_days = 14;
      checkoutSessionParams.payment_method_collection = 'if_required'; // Don't require payment method for trial
    }

    const checkoutSession = await stripe.checkout.sessions.create(checkoutSessionParams);

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error('[Stripe Checkout] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create checkout session',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

