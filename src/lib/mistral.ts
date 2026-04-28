interface MistralOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" | "text" };
}

export async function callMistral(
  systemPrompt: string,
  userMessage: string,
  options: MistralOptions = {}
): Promise<string> {
  const keys = [
    process.env.MISTRAL_API_KEY,
    process.env.MISTRAL_API_KEY_1,
    process.env.MISTRAL_API_KEY_2
  ].filter(k => k && k !== "your_mistral_api_key_here");

  if (keys.length === 0) {
    throw new Error("No MISTRAL_API_KEY found in environment variables.");
  }

  const apiKey = keys[Math.floor(Math.random() * keys.length)];

  const payload = {
    model: options.model || "mistral-large-latest",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: options.temperature ?? 0.65,
    max_tokens: options.max_tokens ?? 1000,
    ... (options.response_format ? { response_format: options.response_format } : {}),
  };

  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(`Mistral API error: ${response.status} ${response.statusText} ${errorData ? JSON.stringify(errorData) : ""}`);
  }

  const data = await response.json();
  
  if (!data.choices || data.choices.length === 0) {
    throw new Error("No choices returned from Mistral API.");
  }

  return data.choices[0].message.content;
}
