import { KOLAnalysis } from "../types";

// API endpoint configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Securely analyzes a KOL handle by calling the backend API.
 * The API key is now kept secure on the server-side only.
 */
export const analyzeKOLHandle = async (handle: string): Promise<KOLAnalysis> => {
  const endpoint = `${API_URL}/api/analyze-kol`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ handle }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));

      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data: KOLAnalysis = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to connect to the analysis service. Please try again later.');
  }
};