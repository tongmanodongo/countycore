const listeners = new Map();

function subscribe(eventName, handler) {
  if (typeof handler !== "function") {
    throw new Error("Event handlers must be functions");
  }
  if (!listeners.has(eventName)) {
    listeners.set(eventName, new Set());
  }
  listeners.get(eventName).add(handler);
  return () => unsubscribe(eventName, handler);
}

function unsubscribe(eventName, handler) {
  const handlers = listeners.get(eventName);
  if (!handlers) return;
  handlers.delete(handler);
  if (handlers.size === 0) {
    listeners.delete(eventName);
  }
}

function emit(eventName, payload) {
  const handlers = listeners.get(eventName) || new Set();
  const snapshot = [...handlers];
  snapshot.forEach((handler) => {
    try {
      handler(payload, eventName);
    } catch (error) {
      console.warn(`Event handler failed for ${eventName}:`, error.message);
    }
  });
  return payload;
}

function listEvents() {
  return [...listeners.keys()];
}

module.exports = {
  subscribe,
  unsubscribe,
  emit,
  listEvents,
};
