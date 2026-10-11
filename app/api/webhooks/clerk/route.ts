import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { deleteUserByClerkId, formatName, upsertUser } from "@/lib/users";

export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error("Clerk webhook verification failed:", err);
    return new Response("Invalid webhook signature", { status: 400 });
  }

  try {
    if (evt.type === "user.created") {
      const { id, email_addresses, primary_email_address_id, first_name, last_name } = evt.data;
      const primary =
        email_addresses.find((e) => e.id === primary_email_address_id) ?? email_addresses[0];
      await upsertUser({
        clerkId: id,
        email: primary?.email_address ?? null,
        name: formatName(first_name, last_name),
      });
    } else if (evt.type === "user.deleted" && evt.data.id) {
      await deleteUserByClerkId(evt.data.id);
    }
  } catch (err) {
    // Non-2xx makes Clerk retry the event.
    console.error("Clerk webhook handler failed:", err);
    return new Response("Webhook handler failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
