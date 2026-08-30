import { Injectable } from '@nestjs/common';

import type { AIProviderName } from '../ai.model';

import type {
  AIModelUsage,
  AIProviderUsage,
  AIUsageRecord,
  AIUsageResponse,
  AIUsageSummary,
  AIUsageTimeline,
} from './ai-usage.model';

@Injectable()
export class AiUsageService {
  private readonly records: AIUsageRecord[] = [];

  private readonly maxRecords = 1000;

  record(data: Omit<AIUsageRecord, 'id' | 'createdAt'>): AIUsageRecord {
    const record: AIUsageRecord = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    this.records.unshift(record);

    if (this.records.length > this.maxRecords) {
      this.records.pop();
    }

    return record;
  }

  getUsage(provider?: AIProviderName): AIUsageResponse {
    const records = provider
      ? this.records.filter((record) => record.provider === provider)
      : this.records;

    return {
      summary: this.buildSummary(records),
      timeline: this.buildTimeline(records),
      byProvider: this.buildProviderUsage(records),
      byModel: this.buildModelUsage(records),
      recentRequests: records.slice(0, 100),
    };
  }

  private buildSummary(records: AIUsageRecord[]): AIUsageSummary {
    const totalRequests = records.length;

    const inputTokens = records.reduce(
      (sum, record) => sum + record.inputTokens,
      0,
    );

    const outputTokens = records.reduce(
      (sum, record) => sum + record.outputTokens,
      0,
    );

    const totalTokens = records.reduce(
      (sum, record) => sum + record.totalTokens,
      0,
    );

    const estimatedCost = records.reduce(
      (sum, record) => sum + record.estimatedCost,
      0,
    );

    const totalLatency = records.reduce(
      (sum, record) => sum + record.latencyMs,
      0,
    );

    return {
      totalRequests,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost,
      averageLatencyMs:
        totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0,
    };
  }

  private buildTimeline(records: AIUsageRecord[]): AIUsageTimeline[] {
    const grouped = new Map<string, AIUsageTimeline>();

    for (const record of records) {
      const date = record.createdAt.slice(0, 10);

      const current = grouped.get(date);

      if (current) {
        current.requests += 1;
        current.inputTokens += record.inputTokens;
        current.outputTokens += record.outputTokens;
        current.totalTokens += record.totalTokens;
        current.estimatedCost += record.estimatedCost;
        continue;
      }

      grouped.set(date, {
        date,
        requests: 1,
        inputTokens: record.inputTokens,
        outputTokens: record.outputTokens,
        totalTokens: record.totalTokens,
        estimatedCost: record.estimatedCost,
      });
    }

    return [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  private buildProviderUsage(records: AIUsageRecord[]): AIProviderUsage[] {
    const grouped = new Map<AIProviderName, AIUsageRecord[]>();

    for (const record of records) {
      const providerRecords = grouped.get(record.provider) ?? [];

      providerRecords.push(record);

      grouped.set(record.provider, providerRecords);
    }

    return [...grouped.entries()].map(([provider, providerRecords]) => {
      const summary = this.buildSummary(providerRecords);

      return {
        provider,

        requests: summary.totalRequests,

        inputTokens: summary.inputTokens,
        outputTokens: summary.outputTokens,
        totalTokens: summary.totalTokens,

        estimatedCost: summary.estimatedCost,
        averageLatencyMs: summary.averageLatencyMs,
      };
    });
  }

  private buildModelUsage(records: AIUsageRecord[]): AIModelUsage[] {
    const grouped = new Map<string, AIUsageRecord[]>();

    for (const record of records) {
      const key = `${record.provider}:${record.model}`;

      const modelRecords = grouped.get(key) ?? [];

      modelRecords.push(record);

      grouped.set(key, modelRecords);
    }

    return [...grouped.entries()].map(([, modelRecords]) => {
      const first = modelRecords[0];

      const summary = this.buildSummary(modelRecords);

      return {
        provider: first.provider,
        model: first.model,

        requests: summary.totalRequests,

        inputTokens: summary.inputTokens,
        outputTokens: summary.outputTokens,
        totalTokens: summary.totalTokens,

        estimatedCost: summary.estimatedCost,
        averageLatencyMs: summary.averageLatencyMs,
      };
    });
  }
}
