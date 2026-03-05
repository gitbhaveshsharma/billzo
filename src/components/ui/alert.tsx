import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default:  "bg-background text-foreground border-border [&>svg]:text-foreground",
        destructive: "bg-destructive/10 border-destructive/40 text-destructive [&>svg]:text-destructive",
        success:  "bg-success/10 border-success/40 text-success [&>svg]:text-success",
        warning:  "bg-warning/10 border-warning/40 text-warning-foreground [&>svg]:text-warning",
        info:     "bg-info/10 border-info/40 text-info [&>svg]:text-info",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

type AlertVariantProps = VariantProps<typeof alertVariants>;

type AlertProps = React.HTMLAttributes<HTMLDivElement> & AlertVariantProps;
type AlertTitleProps = React.HTMLAttributes<HTMLHeadingElement>;
type AlertDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

const Alert = React.forwardRef(
  ({ className, variant, ...props }: AlertProps, ref: React.Ref<HTMLDivElement>) => (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef(
  ({ className, ...props }: AlertTitleProps, ref: React.Ref<HTMLHeadingElement>) => (
    <h5
      ref={ref}
      className={cn("mb-1 font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef(
  ({ className, ...props }: AlertDescriptionProps, ref: React.Ref<HTMLParagraphElement>) => (
    <div
      ref={ref}
      className={cn("text-sm opacity-90 [&_p]:leading-relaxed", className)}
      {...props}
    />
  )
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };