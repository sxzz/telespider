export type Awaitable<T> = T | Promise<T>
export type Callbackable<R, A extends any[] = []> = R | ((...args: A) => R)

export function normalizeCallbackable<R, A extends any[] = []>(
  value: Callbackable<R, A>,
): (...args: A) => R {
  if (typeof value === 'function') {
    return value as any
  }
  return () => value
}

// eslint-disable-next-line unused-imports/no-unused-vars
export function assertUnreachable(x: never): never {
  throw new Error("Didn't expect to get here")
}

export function omitUndefined<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value != null),
  ) as any
}
