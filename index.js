export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

      // Handle /bookings endpoint
      if (url.pathname === "/bookings") {
        const accessKey = "d2b2b9a143b54434a4c85196d4317467";
        const secretKey = "a749a84bbfe2454aa5424e84b52e070c";

        // Generate Bokun Date header
        const now = new Date().toUTCString();
        
        // Bokun requires signing of: METHOD + PATH + DATE + AccessKey
        const method = "GET";
        const path = "/bookings/v1/bookings"; // Bokun bookings API endpoint
        const stringToSign = `${method}\n${path}\n${now}\n${accessKey}`;

        // Generate HMAC-SHA1 signature
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

        // Call Bokun API with signed headers
        const response = await fetch("https://api.bokun.io/bookings/v1/bookings", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Bokun-Date": now,
            "X-Bokun-AccessKey": accessKey,
            "X-Bokun-Signature": signature,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          return new Response(
            JSON.stringify({ error: "Bokun API error", status: response.status, details: errorText }),
            { status: response.status, headers: { "Content-Type": "application/json" } }
          );
        }

        const data = await response.json();
        return new Response(JSON.stringify(data, null, 2), {
          headers: { "Content-Type": "application/json" },
        });
      }

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
