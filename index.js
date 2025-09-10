export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const target = url.searchParams.get("url");

    if (!target) {
      return new Response("Missing 'url' query parameter", { status: 400 });
    }

    const headers = {
      "Content-Type": "application/json",
      "Bokun-AccessKey": "d2b2b9a143b54434a4c85196d4317467",
      "Bokun-SecretKey": "a749a84bbfe2454aa5424e84b52e070c",
      "User-Agent": "Mozilla/5.0"
    };

    const body = request.method !== "GET" ? await request.text() : null;

    const response = await fetch(target, {
      method: request.method,
      headers,
      body,
    });

    return new Response(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  },
};
