import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "jsr:@supabase/supabase-js@2";

const stripe = new Stripe(
  Deno.env.get("STRIPE_SECRET_KEY")!,
  {
    apiVersion: "2024-06-20",
  }
);

const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  try {
    const signature =
      req.headers.get("stripe-signature");

    if (!signature) {
      return new Response(
        "Missing stripe signature",
        { status: 400 }
      );
    }

    const body = await req.text();

    const event =
      await stripe.webhooks.constructEventAsync(
        body,
        signature,
        Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
        undefined,
        cryptoProvider
      );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        console.log("EVENT TYPE", event.type);

        console.log("SESSION METADATA", session.metadata);
        console.log("SESSION CUSTOMER", session.customer);
        console.log("SESSION SUBSCRIPTION", session.subscription);

        const subscription =
          await stripe.subscriptions.retrieve(
            session.subscription as string
          );

        console.log("SUBSCRIPTION", subscription);

        const payload = {
          user_id: session.metadata?.user_id,
          plan: session.metadata?.plan,
          status: subscription.status,
          stripe_customer_id: session.customer,
          stripe_subscription_id: subscription.id,
          current_period_end: new Date(
            subscription.current_period_end * 1000
          ).toISOString(),
        };

        console.log("PAYLOAD", payload);

        const { data, error } = await supabase
          .from("subscriptions")
          .upsert(payload)
          .select();

        console.log("UPSERT DATA", data);
        console.log("UPSERT ERROR", error);

        break;
      }

      case "customer.subscription.updated": {
        const subscription =
          event.data.object as Stripe.Subscription;

        await supabase
          .from("subscriptions")
          .update({
            status:
              subscription.status,

            current_period_end:
              new Date(
                subscription.current_period_end * 1000
              ).toISOString(),
          })
          .eq(
            "stripe_subscription_id",
            subscription.id
          );

        break;
      }

      case "customer.subscription.deleted": {
        const subscription =
          event.data.object as Stripe.Subscription;

        await supabase
          .from("subscriptions")
          .update({
            status: "cancelled",
          })
          .eq(
            "stripe_subscription_id",
            subscription.id
          );

        break;
      }
    }

    return new Response(
      JSON.stringify({
        received: true,
      }),
      {
        status: 200,
      }
    );
  } catch (err) {
    console.error(err);

    return new Response(
      JSON.stringify({
        error: String(err),
      }),
      {
        status: 400,
      }
    );
  }
});