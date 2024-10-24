import { AIProvider } from './ai-providers.ts';

export class AnthropicProvider implements AIProvider {
  async analyzeImage(image: string): Promise<any> {
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: image.split(',')[1],
                },
              },
              {
                type: "text",
                text: "Extract and analyze the product ingredients from this photo to determine whether or not the product is vegan. Ignore anything in the photo that does not appear to be ingredients. Return a JSON object with the following fields: isVegan, ingredients, reason.  The result should only have the JSON object and nothing else, so it should begin with a { and end with a }.  Do not include any other text.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Anthropic API error", response.statusText);
      const errorBody = await response.text();
      console.error("Error body:", errorBody);
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    return await response.json();
  }
}

