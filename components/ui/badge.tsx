import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-orange-500 to-amber-500 text-white",
        secondary: "bg-stone-100 text-stone-700",
        success: "bg-gradient-to-r from-green-500 to-emerald-500 text-white",
        warning: "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
        destructive: "bg-gradient-to-r from-red-500 to-rose-500 text-white",
        outline: "border border-stone-300 text-stone-700",
        info: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white",
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
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
