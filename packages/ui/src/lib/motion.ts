export const easePremium = [0.16, 1, 0.3, 1] as const;

export const durations = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
} as const;

/** Shared fade+rise entrance used across marketing sections. Motion components
 * should spread this and let `useReducedMotion` (from `motion/react`) zero out
 * the transition at the call site rather than duplicating the check everywhere. */
export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.slow, ease: easePremium },
  },
};

export const staggerChildren = (stagger = 0.08) => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger },
  },
});
