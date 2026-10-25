"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Shared button — one visual language across customer, staff and admin.
 *
 * Colours use the semantic tokens so the terracotta remap applies everywhere.
 * `asChild` renders the child element *instead of* a button — it must never
 * wrap one, or the DOM ends up with a button inside a button, which is invalid
 * and breaks keyboard activation.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-brand text-on-primary shadow-lg shadow-brand/30 hover:bg-brand-dark hover:shadow-xl",
        destructive:
          "bg-bad text-white shadow-lg shadow-bad/30 hover:bg-bad-text hover:shadow-xl",
        outline:
          "border-2 border-line bg-surface text-ink hover:bg-surface-2 hover:border-brand",
        secondary:
          "bg-surface-2 text-ink hover:bg-brand-light",
        ghost: "text-ink-muted hover:bg-surface-2",
        link: "text-brand-text underline-offset-4 hover:underline",
        success:
          "bg-ok text-white shadow-lg shadow-ok/30 hover:bg-ok-text hover:shadow-xl",
      },
      size: {
        default: "min-h-[44px] px-5 py-2",
        sm: "min-h-[38px] rounded-lg px-3 text-xs",
        lg: "min-h-[52px] rounded-2xl px-8 text-base",
        xl: "min-h-[56px] rounded-2xl px-10 text-lg",
        icon: "min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref" | "children">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  children?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, type, children, ...props },
    ref
  ) => {
    const classes = cn(buttonVariants({ variant, size, className }));

    // `asChild` means the consumer supplies the element — we must not also
    // render a button around it.
    if (asChild) {
      return (
        <Slot ref={ref} className={classes} {...(props as React.HTMLAttributes<HTMLElement>)}>
          {children}
        </Slot>
      );
    }

    return (
      <motion.button
        ref={ref}
        type={type ?? "button"}
        whileHover={props.disabled ? undefined : { scale: 1.02, y: -1 }}
        whileTap={props.disabled ? undefined : { scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={classes}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
