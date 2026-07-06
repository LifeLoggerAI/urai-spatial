export type KernelEvent<TPayload = unknown> = {
  id: string;
  type: string;
  timestamp: number;
  payload?: TPayload;
  source?: string;
};

export type KernelHandler<TPayload = unknown> = (
  event: KernelEvent<TPayload>
) => void | Promise<void>;

export class EventBus {
  private handlers = new Map<string, Set<KernelHandler>>();
  private wildcardHandlers = new Set<KernelHandler>();

  on(type: string, handler: KernelHandler) {
    if (type === "*") {
      this.wildcardHandlers.add(handler);
      return () => this.off(type, handler);
    }

    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }

    this.handlers.get(type)!.add(handler);
    return () => this.off(type, handler);
  }

  off(type: string, handler: KernelHandler) {
    if (type === "*") {
      this.wildcardHandlers.delete(handler);
      return;
    }

    this.handlers.get(type)?.delete(handler);
  }

  async emit(event: KernelEvent) {
    const direct = Array.from(this.handlers.get(event.type) ?? []);
    const wildcard = Array.from(this.wildcardHandlers);

    for (const handler of [...direct, ...wildcard]) {
      await handler(event);
    }
  }

  createEvent<TPayload = unknown>(
    type: string,
    payload?: TPayload,
    source?: string
  ): KernelEvent<TPayload> {
    return {
      id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      timestamp: Date.now(),
      payload,
      source
    };
  }

  listenerCount(type?: string) {
    if (!type) {
      return (
        this.wildcardHandlers.size +
        Array.from(this.handlers.values()).reduce((sum, set) => sum + set.size, 0)
      );
    }

    if (type === "*") return this.wildcardHandlers.size;
    return this.handlers.get(type)?.size ?? 0;
  }
}
