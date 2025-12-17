import { KOLAnalysis, Language } from "../types";

export class APIError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
  }
}

export const analyzeKOLHandle = async (handle: string, language: Language = 'en'): Promise<KOLAnalysis> => {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ handle, language }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error || `HTTP error! status: ${response.status}`;

    if (response.status === 429) throw new APIError("Rate limit exceeded", 429);
    if (response.status === 404) throw new APIError("Not found", 404);
    if (response.status === 400) throw new APIError("Bad request", 400);

    throw new APIError(message, response.status);
  }

  const data = await response.json();
  return data as KOLAnalysis;
};
