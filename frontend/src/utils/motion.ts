export const backdropMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.15 },
};

export const modalMotion = {
  initial: { opacity: 0, scale: 0.95, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
};

export const listItemMotion = (index: number) => ({
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.18, delay: Math.min(index * 0.03, 0.3), ease: [0.16, 1, 0.3, 1] as const },
});
