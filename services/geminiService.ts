import { KOLAnalysis, TruthGuardAnalysis, Language, InputType } from "../types";

export class APIError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
  }
}

/**
 * Legacy function for backward compatibility
 */
export const analyzeKOLHandle = async (
  handle: string,
  language: Language = 'en',
  forceRefresh: boolean = false
): Promise<KOLAnalysis> => {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ handle, language, forceRefresh }),
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

/**
 * New TruthGuard analysis function supporting multiple input types
 */
export const analyzeTruthGuard = async (
  input: string,
  inputType?: InputType,
  language: Language = 'en',
  forceRefresh: boolean = false
): Promise<TruthGuardAnalysis> => {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input,
      inputType,
      language,
      forceRefresh
    }),
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

  // Ensure TruthGuard-specific fields have defaults
  return {
    ...data,
    inputType: data.inputType || 'HANDLE',
    originalInput: data.originalInput || input,
    riskSignals: data.riskSignals || [],
    suggestedActions: data.suggestedActions || [],
    scamProbability: data.scamProbability ?? (100 - (data.trustScore || 50)),
    finalVerdict: data.finalVerdict || 'C_SUSPICIOUS_NEEDS_VERIFICATION',
    conclusion: data.conclusion || data.verdict || input,
    normalizedInput: data.normalizedInput || {},
    primaryActions: data.primaryActions || [],
    agentVerification: data.agentVerification || {
      status: 'NOT_RUN',
      redirectChain: [],
      forms: [],
      ctaButtons: [],
      asksForLogin: false,
      asksForOtp: false,
      asksForPayment: false,
      asksForAppDownload: false,
      asksToAddChat: false,
      screenshots: [],
      riskObservations: [],
    },
    officialRoute: data.officialRoute || {
      status: 'OFFICIAL_UNKNOWN',
      label: '',
      rationale: '',
      lane: 'UNVERIFIED',
    },
    likelyLosses: data.likelyLosses || [],
    trustSummary: data.trustSummary || [],
  } as TruthGuardAnalysis;
};
