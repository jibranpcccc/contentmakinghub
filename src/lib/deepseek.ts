interface DeepSeekOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" | "text" };
}

export async function callDeepSeek(
  systemPrompt: string,
  userMessage: string,
  options: DeepSeekOptions = {}
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    throw new Error("DEEPSEEK_API_KEY is missing or invalid in environment variables.");
  }

  const payload = {
    model: options.model || "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: options.temperature ?? 0.65,
    max_tokens: options.max_tokens ?? 1000,
    ... (options.response_format ? { response_format: options.response_format } : {}),
  };

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(`DeepSeek API error: ${response.status} ${response.statusText} ${errorData ? JSON.stringify(errorData) : ""}`);
  }

  const data = await response.json();
  
  if (!data.choices || data.choices.length === 0) {
    throw new Error("No choices returned from DeepSeek API.");
  }

  return data.choices[0].message.content;
}
