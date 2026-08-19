// Universal polyfills for older WebKit / iPadOS Safari & Chrome browsers
if (typeof globalThis === 'undefined') {
  (window as any).globalThis = window;
}

if (typeof Promise !== 'undefined' && !(Promise as any).withResolvers) {
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

if (!Array.prototype.at) {
  Array.prototype.at = function (n: number) {
    n = Math.trunc(n) || 0;
    if (n < 0) n += this.length;
    if (n < 0 || n >= this.length) return undefined;
    return this[n];
  };
}

if (!(Array.prototype as any).findLast) {
  (Array.prototype as any).findLast = function (predicate: any, thisArg?: any) {
    for (let i = this.length - 1; i >= 0; i--) {
      if (predicate.call(thisArg, this[i], i, this)) return this[i];
    }
    return undefined;
  };
}

if (!Object.hasOwn) {
  Object.hasOwn = function (obj: any, prop: PropertyKey) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };
}

if (typeof window !== 'undefined' && !window.requestIdleCallback) {
  window.requestIdleCallback = function (cb: IdleRequestCallback, options?: IdleRequestOptions) {
    const start = Date.now();
    return window.setTimeout(() => {
      cb({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
      } as IdleDeadline);
    }, options?.timeout ? Math.min(options.timeout, 50) : 1);
  };
  window.cancelIdleCallback = function (id: number) {
    clearTimeout(id);
  };
}

export {};
