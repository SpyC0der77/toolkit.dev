export async function GET() {
  const url = "https://openrouter.ai/api/frontend/models/find?max_price=0";

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return Response.json({ error: "Failed to fetch models" }, { status: response.status });
    }

    const json = await response.json();
    const models = (json?.data?.models ?? []).map((model: any) => model.permaslug);

    return Response.json({ models });
  } catch (error) {
    return Response.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}
