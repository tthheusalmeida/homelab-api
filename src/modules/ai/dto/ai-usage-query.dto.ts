import type { AIProviderName } from '../ai.model';

export class AiUsageQueryDto {
  from?: string;
  to?: string;
  provider?: AIProviderName;
}
