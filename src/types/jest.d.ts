// Jest testing framework types

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeCloseTo(expected: number, precision?: number): R;
      toHaveLength(expected: number): R;
      toContain(expected: any): R;
      toEqual(expected: any): R;
      toBe(expected: any): R;
      toBeTruthy(): R;
      toBeFalsy(): R;
      toBeUndefined(): R;
      toBeNull(): R;
      toBeDefined(): R;
      toBeInstanceOf(expected: any): R;
      toHaveProperty(key: string, value?: any): R;
      toMatchObject(expected: any): R;
      toThrow(expected?: any): R;
      toBeGreaterThan(expected: number): R;
      toBeLessThan(expected: number): R;
      toBeGreaterThanOrEqual(expected: number): R;
      toBeLessThanOrEqual(expected: number): R;
    }
  }

  function describe(description: string, fn: () => void): void;
  function it(description: string, fn: () => void | Promise<void>): void;
  function test(description: string, fn: () => void | Promise<void>): void;
  function expect(actual: any): jest.Matchers<any>;
  function beforeEach(fn: () => void | Promise<void>): void;
  function afterEach(fn: () => void | Promise<void>): void;
  function beforeAll(fn: () => void | Promise<void>): void;
  function afterAll(fn: () => void | Promise<void>): void;

  namespace jest {
    function fn(implementation?: any): MockedFunction<any>;
    function spyOn(object: any, method: string): MockedFunction<any>;
    function mock(moduleName: string, factory?: () => any): void;
    function clearAllMocks(): void;
    function resetAllMocks(): void;
    function restoreAllMocks(): void;

    interface MockedFunction<T> {
      (...args: any[]): any;
      mockReturnValue(value: any): this;
      mockResolvedValue(value: any): this;
      mockRejectedValue(value: any): this;
      mockImplementation(implementation: T): this;
      mockClear(): void;
      mockReset(): void;
      mockRestore(): void;
    }
  }

  // Node.js global objects for test environment
  const global: NodeJS.Global & {
    fetch?: any;
    Headers?: any;
    Request?: any;
    Response?: any;
    [key: string]: any;
  };
}