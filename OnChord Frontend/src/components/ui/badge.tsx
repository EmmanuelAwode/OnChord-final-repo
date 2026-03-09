import * as React from "react";
import { Slot } from "@radix-ui/react-slot@1.1.2";
import { cva, type VariantProps } from "class-variance-authority@0.7.1";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border-2 px-3 py-1 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-200 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-sm [a&]:hover:from-primary/90 [a&]:hover:to-primary/70 [a&]:hover:scale-105 [a&]:hover:shadow-md",
        secondary:
          "border-secondary/30 bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground shadow-sm [a&]:hover:from-secondary/90 [a&]:hover:to-secondary/70 [a&]:hover:scale-105 [a&]:hover:shadow-md",
        destructive:
          "border-destructive/30 bg-gradient-to-r from-destructive to-destructive/80 text-white shadow-sm [a&]:hover:from-destructive/90 [a&]:hover:to-destructive/70 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 [a&]:hover:scale-105 [a&]:hover:shadow-md",
        outline:
          "border-primary/40 bg-background/80 backdrop-blur-sm text-foreground [a&]:hover:bg-primary/10 [a&]:hover:text-primary [a&]:hover:border-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
