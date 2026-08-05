// Voyage AI is Anthropic's recommended embeddings partner.
// Sign up at voyageai.com (free tier is plenty for 100 chats) and add the key
// to your Netlify environment variables as VOYAGE_API_KEY.

export async function embedText(text: string): Promise<number[]> {
  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: text.slice(0, 8000),
      model: "voyage-3.5",
    }),
  });

  if (!response.ok) {
    throw new Error(`Voyage embedding failed: ${await response.text()}`);
  }

  const data = await response.json();
  return data.data[0].embedding as number[];
}
