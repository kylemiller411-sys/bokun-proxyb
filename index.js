export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

      // Default to bookings endpoint
      let path = "/booking.json";

      // Add from/to params for testing
      const from = url.searchParams.get("from") || "2025-09-01";
      const to = url.searchParams.get("to") || "2025-09-10";

      // Construct Bokun API URL
      const bokunUrl = `https://api.bokun.io${path}?from=${from}&to=${to}`;

      // Required request signing
      const date = new Date().toUTCString();
      const stringToSign = `${request.method}\n${path}?from=${from}&to=${to}\n${date}\n${env.BOKUN_ACCESS_KEY}`;

      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(env.BOKUN_SECRET_KEY),
        { name: "HMAC", hash: "SHA-1" },
        false,
        ["sign"]
      );

      const signatureBuffer = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(stringToSign)
      );

      const signature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      // Call Bokun API
      const response = await fetch(bokunUrl, {
        method: "GET",
        headers: {
          "X-Bokun-Date": date,
          "Bokun-AccessKey": env.BOKUN_ACCESS_KEY,
          "X-Bokun-Signature": signature,
          "Accept": "application/json"
        },
      });

      const data = await response.text();

      return new Response(data, {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Worker crashed", details: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
