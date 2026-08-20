export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function hasProperty<K extends string>(
  value: object,
  key: K,
): value is Record<K, unknown> {
  return key in value;
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}
