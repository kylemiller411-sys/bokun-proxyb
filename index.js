export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      let path = null;

      // Map routes
      if (url.pathname === "/bookings") {
        path = "/booking.json"; // bookings endpoint
      } else if (url.pathname === "/products") {
        path = "/activity.json"; // products endpoint
      } else {
        return new Response(
          JSON.stringify({
            message: "Worker running. Try /bookings or /products"
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      // Add from/to params (default to last 7 days for bookings)
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);

      const from =
        url.searchParams.get("from") ||
        sevenDaysAgo.toISOString().split("T")[0];
      const to =
        url.searchParams.get("to") || today.toISOString().split("T")[0];

      // Build Bokun URL
      const bokunUrl =
        path === "/booking.json"
          ? `https://api.bokun.io${path}?from=${from}&to=${to}`
          : `https://api.bokun.io${path}`;

      // Sign request
      const date = new Date().toUTCString();
      const pathForSigning =
        path === "/booking.json"
          ? `${path}?from=${from}&to=${to}`
          : path;
      const stringToSign = `${request.method}\n${pathForSigning}\n${date}\n${env.BOKUN_ACCESS_KEY}`;

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
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Call Bokun
      const response = await fetch(bokunUrl, {
        method: "GET",
        headers: {
          "X-Bokun-Date": date,
          "Bokun-AccessKey": env.BOKUN_ACCESS_KEY,
          "X-Bokun-Signature": signature,
          Accept: "application/json",
        },
      });

      const data = await response.text();

      return new Response(data, {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Worker crashed", details: err.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};
