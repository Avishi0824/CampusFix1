import { createClient } from "@supabase/supabase-js";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-push-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ExpoTicket = {
  status?: string;
  id?: string;
  message?: string;
  details?: { error?: string };
};

Deno.serve(async (req: Request) => {
  const json = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: corsHeaders });

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // Authenticate the database trigger or other trusted caller.
    const secret = Deno.env.get("PUSH_FUNCTION_SECRET");

    if (!secret || req.headers.get("x-push-secret") !== secret) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Validate Supabase server configuration.
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase server environment variables");
      return json({ error: "Server configuration error" }, 500);
    }

    // Validate request body.
    const body: unknown = await req.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "Invalid request body" }, 400);
    }

    const complaint = body as Record<string, unknown>;

    const complaintId = complaint.complaint_id ?? null;
    const title = String(complaint.title || "New Hostel Complaint");
    const hostel = String(complaint.hostel || "Hostel");
    const room = String(complaint.room || "N/A");
    const category = String(complaint.category || "Maintenance");
    const emergency = complaint.is_emergency === true;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Find all Wardens.
    const { data: wardens, error: wardenError } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "WARDEN");

    if (wardenError) {
      console.error("Failed to fetch Warden profiles:", wardenError);
      throw new Error("Could not fetch Warden profiles");
    }

    const wardenIds = [
      ...new Set((wardens ?? []).map((warden) => warden.id)),
    ];

    if (wardenIds.length === 0) {
      return json({
        success: true,
        targets: 0,
        reason: "No Warden profiles found",
      });
    }

    // Fetch registered Warden device tokens.
    const { data: tokens, error: tokenError } = await supabase
      .from("push_tokens")
      .select("expo_push_token")
      .in("user_id", wardenIds);

    if (tokenError) {
      console.error("Failed to fetch push tokens:", tokenError);
      throw new Error("Could not fetch Warden push tokens");
    }

    const uniqueTokens = [
      ...new Set(
        (tokens ?? [])
          .map((item) => item.expo_push_token)
          .filter(
            (token): token is string =>
              typeof token === "string" && token.length > 0,
          ),
      ),
    ];

    if (uniqueTokens.length === 0) {
      return json({
        success: true,
        targets: 0,
        reason: "No registered Warden devices",
      });
    }

    // Create push messages.
    const messages = uniqueTokens.map((token) => ({
      to: token,
      title: emergency
        ? "🚨 Emergency Complaint"
        : "New Complaint Reported",
      body: `${title} • ${hostel}, Room ${room} • ${category}`,
      sound: "default",
      priority: emergency ? "high" : "default",
      channelId: "campusfix-default",
      data: {
        type: "NEW_COMPLAINT",
        complaintId,
        emergency,
      },
    }));

    // Send messages in batches of up to 100.
    const tickets: ExpoTicket[] = [];

    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);

      const expoResponse = await fetch(
        "https://exp.host/--/api/v2/push/send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(batch),
          signal: AbortSignal.timeout(15000),
        },
      );

      if (!expoResponse.ok) {
        const responseText = await expoResponse.text();

        console.error(
          "Expo API HTTP error:",
          expoResponse.status,
          responseText,
        );

        return json({
          error: "Expo push request failed",
          httpStatus: expoResponse.status,
        }, 502);
      }

      const expoResult = await expoResponse.json();

      const batchTickets: ExpoTicket[] = Array.isArray(expoResult.data)
        ? expoResult.data
        : expoResult.data
        ? [expoResult.data]
        : [];

      tickets.push(...batchTickets);
    }

    // Summarize Expo's immediate ticket responses.
    const accepted = tickets.filter(
      (ticket) => ticket.status === "ok",
    ).length;

    const failed = tickets
      .map((ticket, index) => ({ ticket, index }))
      .filter(({ ticket }) => ticket.status !== "ok");

    console.log("Push summary:", {
      complaintId,
      targets: messages.length,
      accepted,
      failed: failed.length,
    });

    if (failed.length > 0) {
      console.error("Expo ticket errors:", failed);
    }

    return json({
      success:
        failed.length === 0 && tickets.length === messages.length,
      targets: messages.length,
      accepted,
      failed,
      tickets,
    });
  } catch (error) {
    console.error(
      "send-push error:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return json({ error: "Failed to send push notification" }, 500);
  }
});
