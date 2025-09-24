/**
 * Browser-compatible Event Emitter
 * Replacement for Node.js EventEmitter in browser environments
 */

export interface EventListener {
  (...args: any[]): void;
}

export interface EventListenerOptions {
  once?: boolean;
  prepend?: boolean;
}

/**
 * Simple event emitter implementation for browser environments
 */
export class EventEmitter {
  private events: Map<string | symbol, EventListener[]> = new Map();
  private maxListeners: number = 10;

  /**
   * Set the maximum number of listeners for any single event
   */
  setMaxListeners(n: number): this {
    this.maxListeners = n;
    return this;
  }

  /**
   * Get the maximum number of listeners
   */
  getMaxListeners(): number {
    return this.maxListeners;
  }

  /**
   * Add a listener for the specified event
   */
  on(event: string | symbol, listener: EventListener): this {
    return this.addListener(event, listener);
  }

  /**
   * Add a listener for the specified event
   */
  addListener(event: string | symbol, listener: EventListener): this {
    if (typeof listener !== 'function') {
      throw new TypeError('The listener must be a function');
    }

    const listeners = this.events.get(event) || [];
    listeners.push(listener);
    this.events.set(event, listeners);

    // Check max listeners warning
    if (listeners.length > this.maxListeners) {
      // console.warn(
        `MaxListenersExceededWarning: Possible EventEmitter memory leak detected. ` +
        `${listeners.length} ${String(event)} listeners added. ` +
        `Use emitter.setMaxListeners() to increase limit`
      );
    }

    this.emit('newListener', event, listener);
    return this;
  }

  /**
   * Add a one-time listener for the specified event
   */
  once(event: string | symbol, listener: EventListener): this {
    const onceWrapper = (...args: any[]) => {
      this.removeListener(event, onceWrapper);
      listener.apply(this, args);
    };

    // Preserve original function reference for removeListener
    (onceWrapper as any).listener = listener;

    return this.on(event, onceWrapper);
  }

  /**
   * Prepend a listener to the beginning of the listeners array
   */
  prependListener(event: string | symbol, listener: EventListener): this {
    if (typeof listener !== 'function') {
      throw new TypeError('The listener must be a function');
    }

    const listeners = this.events.get(event) || [];
    listeners.unshift(listener);
    this.events.set(event, listeners);

    this.emit('newListener', event, listener);
    return this;
  }

  /**
   * Prepend a one-time listener to the beginning of the listeners array
   */
  prependOnceListener(event: string | symbol, listener: EventListener): this {
    const onceWrapper = (...args: any[]) => {
      this.removeListener(event, onceWrapper);
      listener.apply(this, args);
    };

    (onceWrapper as any).listener = listener;

    return this.prependListener(event, onceWrapper);
  }

  /**
   * Remove a listener for the specified event
   */
  off(event: string | symbol, listener: EventListener): this {
    return this.removeListener(event, listener);
  }

  /**
   * Remove a listener for the specified event
   */
  removeListener(event: string | symbol, listener: EventListener): this {
    const listeners = this.events.get(event);
    if (!listeners) return this;

    const index = listeners.findIndex(l => 
      l === listener || (l as any).listener === listener
    );

    if (index !== -1) {
      listeners.splice(index, 1);
      
      if (listeners.length === 0) {
        this.events.delete(event);
      }

      this.emit('removeListener', event, listener);
    }

    return this;
  }

  /**
   * Remove all listeners for the specified event, or all events if no event is specified
   */
  removeAllListeners(event?: string | symbol): this {
    if (event !== undefined) {
      const listeners = this.events.get(event);
      if (listeners) {
        // Emit removeListener for each listener
        listeners.forEach(listener => {
          this.emit('removeListener', event, listener);
        });
        this.events.delete(event);
      }
    } else {
      // Remove all listeners for all events
      for (const [eventName, listeners] of this.events.entries()) {
        listeners.forEach(listener => {
          this.emit('removeListener', eventName, listener);
        });
      }
      this.events.clear();
    }

    return this;
  }

  /**
   * Emit an event with the specified arguments
   */
  emit(event: string | symbol, ...args: any[]): boolean {
    const listeners = this.events.get(event);
    if (!listeners || listeners.length === 0) {
      // Special handling for 'error' events
      if (event === 'error') {
        const error = args[0];
        if (error instanceof Error) {
          throw error;
        } else {
          throw new Error(`Uncaught, unspecified "error" event. (${error})`);
        }
      }
      return false;
    }

    // Create a copy of listeners array to avoid issues if listeners are modified during emission
    const listenersCopy = [...listeners];

    listenersCopy.forEach(listener => {
      try {
        listener.apply(this, args);
      } catch (error) {
        // Emit error event for listener errors
        process.nextTick(() => {
          this.emit('error', error);
        });
      }
    });

    return true;
  }

  /**
   * Get the number of listeners for the specified event
   */
  listenerCount(event: string | symbol): number {
    const listeners = this.events.get(event);
    return listeners ? listeners.length : 0;
  }

  /**
   * Get a copy of the listeners array for the specified event
   */
  listeners(event: string | symbol): EventListener[] {
    const listeners = this.events.get(event);
    return listeners ? [...listeners] : [];
  }

  /**
   * Get a copy of the listeners array for the specified event (including wrapped listeners)
   */
  rawListeners(event: string | symbol): EventListener[] {
    return this.listeners(event);
  }

  /**
   * Get an array of event names that have listeners
   */
  eventNames(): (string | symbol)[] {
    return Array.from(this.events.keys());
  }

  /**
   * Static method to get the default max listeners
   */
  static defaultMaxListeners: number = 10;

  /**
   * Static method to get the listener count for an emitter and event
   */
  static listenerCount(emitter: EventEmitter, event: string | symbol): number {
    return emitter.listenerCount(event);
  }
}

// Browser-compatible process.nextTick polyfill
const process = {
  nextTick: (callback: Function, ...args: any[]) => {
    setTimeout(() => callback(...args), 0);
  }
};

// Make it available globally if needed
if (typeof window !== 'undefined') {
  (window as any).process = process;
}
