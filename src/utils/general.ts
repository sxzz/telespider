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
