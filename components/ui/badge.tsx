import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Shared badge — status only.
 *
 * Every variant resolves to a semantic token, so the badge can never
 * introduce a hue that exists nowhere else in the product.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-brand text-on-primary",
        secondary: "bg-surface-3 text-ink",
        success: "bg-ok-light text-ok-text",
        warning: "bg-warn-light text-warn-text",
        destructive: "bg-bad-light text-bad-text",
        outline: "border border-line-strong text-ink-muted",
        info: "bg-accent-light text-brand-dark",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
