import type { AIProviderName } from '../ai.model';

export interface AIUsageRecord {
  id: string;

  provider: AIProviderName;
  model: string;
  operation: string;

  inputTokens: number;
  outputTokens: number;
  totalTokens: number;

  estimatedCost: number;

  latencyMs: number;
  success: boolean;

  createdAt: string;
}

export interface AIUsageSummary {
  totalRequests: number;

  inputTokens: number;
  outputTokens: number;
  totalTokens: number;

  estimatedCost: number;
  averageLatencyMs: number;
}

export interface AIUsageTimeline {
  date: string;

  requests: number;

  inputTokens: number;
  outputTokens: number;
  totalTokens: number;

  estimatedCost: number;
}

export interface AIProviderUsage {
  provider: AIProviderName;

  requests: number;

  inputTokens: number;
  outputTokens: number;
  totalTokens: number;

  estimatedCost: number;
  averageLatencyMs: number;
}

export interface AIModelUsage {
  provider: AIProviderName;
  model: string;

  requests: number;

  inputTokens: number;
  outputTokens: number;
  totalTokens: number;

  estimatedCost: number;
  averageLatencyMs: number;
}

export interface AIUsageResponse {
  summary: AIUsageSummary;
  timeline: AIUsageTimeline[];
  byProvider: AIProviderUsage[];
  byModel: AIModelUsage[];
  recentRequests: AIUsageRecord[];
}
