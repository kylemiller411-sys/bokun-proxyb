export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/bookings") {
        const accessKey = "d2b2b9a143b54434a4c85196d4317467";
        const secretKey = "a749a84bbfe2454aa5424e84b52e070c";

        // 🔹 Date header for Bokun
        const now = new Date().toUTCString();

        // 🔹 Compute last 7 days range
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);

        const from = sevenDaysAgo.toISOString().split("T")[0];
        const to = today.toISOString().split("T")[0];

        // 🔹 API path with query params
        const path = `/booking.json?from=${from}&to=${to}`;

        // 🔹 String to sign
        const method = "GET";
        const stringToSign = `${method}\n${path}\n${now}\n${accessKey}`;

        // 🔹 HMAC-SHA1 signature
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          "raw",
          encoder.encode(secretKey),
          { name: "HMAC", hash: "SHA-1" },
          false,
          ["sign"]
        );
        const signatureBuffer = await crypto.subtle.sign(
          "HMAC",
          key,
          encoder.encode(stringToSign)
        );
        const signatureArray = Array.from(new Uint8Array(signatureBuffer));
        const signature = signatureArray.map(b => b.toString(16).padStart(2, "0")).join("");

        // 🔹 Fetch from Bokun
        const apiUrl = `https://api.bokun.io${path}`;
        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Bokun-Date": now,
            "X-Bokun-AccessKey": accessKey,
            "X-Bokun-Signature": signature,
          },
        });

        const text = await response.text();

        return new Response(
          JSON.stringify(
            {
              status: response.status,
              headers: Object.fromEntries(response.headers),
              body: text,
              debug: { stringToSign, signature, date: now, path },
            },
            null,
            2
          ),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      // Default fallback
      return new Response(
        JSON.stringify({ message: "Worker running. Try /bookings" }),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Worker crashed", details: err.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};

