export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

      // Only allow our defined endpoints
      if (url.pathname === "/bookings") {
        // Example: fetch bookings from Bókun API
        const from = url.searchParams.get("from") || "2025-09-01";
        const to = url.searchParams.get("to") || "2025-09-10";

        const path = `/booking.json?from=${from}&to=${to}`;
        const apiHost = "https://api.bokun.io"; // ✅ Use the official API domain
        const apiUrl = apiHost + path;

        // Required headers
        const date = new Date().toUTCString();
        const stringToSign = `GET\n${path}\n${date}\n${env.BOKUN_ACCESS_KEY}`;
        const encoder = new TextEncoder();
        const keyData = encoder.encode(env.BOKUN_SECRET_KEY);
        const signData = encoder.encode(stringToSign);
        const signatureBuffer = await crypto.subtle.sign(
          "HMAC",
          await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]),
          signData
        );
        const signature = Array.from(new Uint8Array(signatureBuffer))
          .map(b => b.toString(16).padStart(2, "0"))
          .join("");

        const headers = {
          "Date": date,
          "Bokun-AccessKey": env.BOKUN_ACCESS_KEY,
          "Bokun-Signature": signature,
          "Content-Type": "application/json",
          "Accept": "application/json",
        };

        const response = await fetch(apiUrl, { method: "GET", headers });

        return new Response(await response.text(), {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ message: "Worker is running. Try /bookings?from=YYYY-MM-DD&to=YYYY-MM-DD" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (err) {
      return new Response(JSON.stringify({ error: "Worker crashed", details: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
