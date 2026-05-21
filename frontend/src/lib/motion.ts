import { useReducedMotion } from "motion/react";

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export function useMotionConfig() {
  const reduce = useReducedMotion();
  return {
    reduce: !!reduce,
    duration: reduce ? 0 : 0.32,
    stagger: reduce ? 0 : 0.06,
  };
}

export const gateEnter = {
  initial: { opacity: 0, y: reduceMotionY(12) },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: reduceMotionY(-8) },
};

function reduceMotionY(value: number) {
  return value;
}

export function motionProps(reduce: boolean, duration: number) {
  return {
    transition: reduce ? { duration: 0 } : { duration, ease: EASE_OUT },
  };
}
