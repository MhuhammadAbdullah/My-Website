"use client";

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { durations, easePremium } from "./lib/motion";

const defaultVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
  variants = defaultVariants,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: React.ElementType;
  variants?: Variants;
}) {
  const shouldReduceMotion = useReducedMotion();
  const MotionComponent = motion.create(as);

  return (
    <MotionComponent
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={variants}
      transition={{
        duration: shouldReduceMotion ? 0 : durations.slow,
        delay: shouldReduceMotion ? 0 : delay,
        ease: easePremium,
      }}
    >
      {children}
    </MotionComponent>
  );
}
