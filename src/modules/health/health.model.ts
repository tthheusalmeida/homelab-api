export const HealthStatusType = {
  OK: 'ok',
  ERROR: 'error',
} as const;

// HealthStatusType = 'ok' | 'error'
export type HealthStatusType =
  (typeof HealthStatusType)[keyof typeof HealthStatusType];

export interface HealthStatus {
  status: HealthStatusType;
  service: string;
}

export interface HealthCheck {
  check(): Promise<HealthStatus>;
}
