import { cn } from "@/lib/utils";

/** Renders a field-level validation error below a form control, or nothing. */
export function FormError({
  message,
  className,
}: {
  message?: string;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p className={cn("text-sm font-medium text-destructive", className)}>
      {message}
    </p>
  );
}
