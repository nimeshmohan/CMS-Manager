import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground",
        className,
      )}
    >
      {initials}
    </div>
  );
}
