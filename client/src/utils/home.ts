const listeners = new Set<() => void>();

/** Subscribe to the logo being clicked. The mounted screen decides what it means. */
export const onHome = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

export const goHome = () => listeners.forEach((cb) => cb());
