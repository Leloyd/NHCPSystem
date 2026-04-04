export class InteractionRegistry {
  constructor() {
    this.handlers = new Map();
  }

  register(objectName, handler) {
    if (!objectName || typeof handler !== 'function') {
      return;
    }
    this.handlers.set(objectName.toLowerCase(), handler);
  }

  trigger(context) {
    const name = String(context?.name ?? '').toLowerCase();
    const direct = this.handlers.get(name);
    if (direct) {
      direct(context);
      return;
    }

    for (const [key, handler] of this.handlers.entries()) {
      if (name.includes(key)) {
        handler(context);
        return;
      }
    }

    console.log('[interaction] object clicked:', context?.name ?? '(unnamed)', context);
  }
}
