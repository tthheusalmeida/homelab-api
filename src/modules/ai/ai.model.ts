import { HealthStatus } from '../health/health.model';

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface AIProvider {
  health(): Promise<HealthStatus>;
  chat(message: string, model: string, think: boolean): Promise<string>;
}
