import { AiUsageService } from './ai-usage.service';
import type { AIUsageRecord } from './ai-usage.model';

type Input = Omit<AIUsageRecord, 'id' | 'createdAt'>;

const base: Input = {
  provider: 'ollama',
  model: 'm1',
  operation: 'chat',
  inputTokens: 10,
  outputTokens: 5,
  totalTokens: 15,
  estimatedCost: 0.5,
  latencyMs: 100,
  success: true,
};

describe('AiUsageService', () => {
  let service: AiUsageService;

  beforeEach(() => {
    service = new AiUsageService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('record', () => {
    it('when a usage is recorded, should generate id and createdAt and return the record', () => {
      const record = service.record(base);

      expect(record).toMatchObject(base);
      expect(record.id).toEqual(expect.any(String));
      expect(new Date(record.createdAt).toISOString()).toBe(record.createdAt);
    });

    it('when several usages are recorded, should keep the most recent first', () => {
      service.record({ ...base, model: 'a' });
      service.record({ ...base, model: 'b' });

      const { recentRequests } = service.getUsage();

      expect(recentRequests.map((r) => r.model)).toEqual(['b', 'a']);
    });

    it('when more than 1000 usages are recorded, should discard the oldest', () => {
      for (let i = 0; i < 1001; i++) {
        service.record({ ...base, model: `m${i}` });
      }

      const { summary } = service.getUsage();

      expect(summary.totalRequests).toBe(1000);
    });
  });

  describe('getUsage', () => {
    it('when there are no records, should return everything zeroed', () => {
      const usage = service.getUsage();

      expect(usage.summary).toEqual({
        totalRequests: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        averageLatencyMs: 0,
      });
      expect(usage.timeline).toEqual([]);
      expect(usage.byProvider).toEqual([]);
      expect(usage.byModel).toEqual([]);
      expect(usage.recentRequests).toEqual([]);
    });

    it('when there are records, should sum tokens and cost and round the average latency', () => {
      service.record({ ...base, latencyMs: 100 });
      service.record({ ...base, latencyMs: 201 });

      expect(service.getUsage().summary).toEqual({
        totalRequests: 2,
        inputTokens: 20,
        outputTokens: 10,
        totalTokens: 30,
        estimatedCost: 1,
        averageLatencyMs: 151,
      });
    });

    it('when a provider is given, should filter every section by it', () => {
      service.record({ ...base, provider: 'ollama' });
      service.record({ ...base, provider: 'gemini', model: 'g' });

      const usage = service.getUsage('gemini');

      expect(usage.summary.totalRequests).toBe(1);
      expect(usage.byProvider.map((p) => p.provider)).toEqual(['gemini']);
      expect(usage.byModel.map((m) => m.model)).toEqual(['g']);
      expect(usage.recentRequests).toHaveLength(1);
    });

    it('when records have different providers, should group them by provider', () => {
      service.record({ ...base, provider: 'ollama' });
      service.record({ ...base, provider: 'ollama' });
      service.record({ ...base, provider: 'gemini' });

      const byProvider = service.getUsage().byProvider;

      expect(byProvider.find((p) => p.provider === 'ollama')?.requests).toBe(2);
      expect(byProvider.find((p) => p.provider === 'gemini')?.requests).toBe(1);
    });

    it('when the same model name exists in two providers, should not mix them', () => {
      service.record({ ...base, provider: 'ollama', model: 'x' });
      service.record({ ...base, provider: 'gemini', model: 'x' });
      service.record({ ...base, provider: 'ollama', model: 'x' });

      const byModel = service.getUsage().byModel;

      expect(byModel).toHaveLength(2);
      expect(
        byModel.find((m) => m.provider === 'ollama' && m.model === 'x')
          ?.requests,
      ).toBe(2);
    });

    it('when records span several days, should group the timeline by UTC day in ascending order', () => {
      jest.useFakeTimers();

      jest.setSystemTime(new Date('2026-01-02T10:00:00Z'));
      service.record(base);
      jest.setSystemTime(new Date('2026-01-01T10:00:00Z'));
      service.record(base);
      service.record(base);

      const timeline = service.getUsage().timeline;

      expect(timeline.map((t) => t.date)).toEqual(['2026-01-01', '2026-01-02']);
      expect(timeline[0]).toMatchObject({
        requests: 2,
        inputTokens: 20,
        outputTokens: 10,
        totalTokens: 30,
        estimatedCost: 1,
      });
    });

    it('when there are more than 100 records, should limit recentRequests to 100', () => {
      for (let i = 0; i < 150; i++) {
        service.record(base);
      }

      expect(service.getUsage().recentRequests).toHaveLength(100);
    });
  });
});
