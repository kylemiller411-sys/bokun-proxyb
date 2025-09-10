export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ✅ /bookings endpoint
    if (url.pathname === "/bookings") {
      const response = await fetch("https://api.bokun.io/bookings/v1/bookings", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Bokun-AccessKey": "d2b2b9a143b54434a4c85196d4317467", // your key
          "Bokun-SecretKey": "a749a84bbfe2454aa5424e84b52e070c", // your secret
        },
      });

      const data = await response.json();
      return new Response(JSON.stringify(data, null, 2), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ✅ fallback for everything else
    return new Response(
      JSON.stringify({ message: "Worker is running. Try /bookings" }),
      { headers: { "Content-Type": "application/json" } }
    );
  },
};
