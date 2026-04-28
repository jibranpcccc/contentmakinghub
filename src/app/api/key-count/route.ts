import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const provider = url.searchParams.get("provider");

  let count = 20; // Default

  if (provider === "mistral") {
    const keys = Object.keys(process.env)
      .filter(k => k.startsWith("MISTRAL_API_KEY"))
      .map(k => process.env[k])
      .filter(k => k && k !== "your_mistral_api_key_here");
    
    count = Math.max(1, keys.length);
  }

  return NextResponse.json({ count });
}
