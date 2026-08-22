import { HealthStatus } from '../health/health.model';

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface AIProviderModelDetails {
  family: string;
  families: Array<string>;
  parameter_size: string;
  quantization_level: string;
  context_length: number;
  embedding_length: number;
}

export interface AIProviderModel {
  name: string;
  model: string;
  size: number;
  details: AIProviderModelDetails;
  capabilities: string[];
}

export interface AIProvider {
  health(): Promise<HealthStatus>;
  chat(message: string, model: string, think?: boolean): Promise<string>;
  models(): Promise<AIProviderModel[]>;
}
