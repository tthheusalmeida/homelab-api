export const HealthStatusOptions = {
  OK: 'ok',
  ERROR: 'error',
} as const;

// HealthStatusType = 'ok' | 'error'
export type HealthStatusType =
  (typeof HealthStatusOptions)[keyof typeof HealthStatusOptions];

export interface HealthCheck {
  service: string;
  description: string;
  status: HealthStatusType;
}

export interface HealthService {
  service: string;
  description: string;
  checks: HealthCheck[];
}

export interface HealthCheckService {
  check(): Promise<HealthService>;
}
