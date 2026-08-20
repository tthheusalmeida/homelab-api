export const HealthStatusOptions = {
  OK: 'ok',
  ERROR: 'error',
} as const;

// HealthStatusType = 'ok' | 'error'
export type HealthStatusType =
  (typeof HealthStatusOptions)[keyof typeof HealthStatusOptions];

export interface HealthStatus {
  status: HealthStatusType;
  service: string;
}

export interface HealthCheck {
  check(): Promise<HealthStatus>;
}
