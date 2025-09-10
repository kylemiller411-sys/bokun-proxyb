export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      let path = null;

      // Map routes to Bokun API
      if (url.pathname === "/bookings") {
        path = "/booking.json"; // bookings
      } else if (url.pathname === "/products") {
        path = "/activity.json"; // products
      } else if (url.pathname === "/availability") {
        path = "/availability.json"; // availability
      } else {
        return new Response(
          JSON.stringify({
            message: "Worker running. Try /bookings, /products, or /availability"
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      // Default date range
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);

      const from =
        url.searchParams.get("from") ||
        sevenDaysAgo.toISOString().split("T")[0];
      const to =
        url.searchParams.get("to") || today.toISOString().split("T")[0];

      // For availability, allow productId param
      const productId = url.searchParams.get("productId");

      // Build API URL
      let bokunUrl = "";
      if (path === "/booking.json") {
        bokunUrl = `https://api.bokun.io${path}?from=${from}&to=${to}`;
      } else if (path === "/availability.json") {
        if (!productId) {
          return new Response(
            JSON.stringify({
              error: "Missing productId. Use /availability?productId=12345&from=YYYY-MM-DD&to=YYYY-MM-DD"
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        bokunUrl = `https://api.bokun.io${path}?productId=${productId}&from=${from}&to=${to}`;
      } else {
        bokunUrl = `https://api.bokun.io${path}`;
      }

      // Signing
      const date = new Date().toUTCString();
      const pathForSigning = bokunUrl.replace("https://api.bokun.io", "");
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

      // Call Bokun API
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
