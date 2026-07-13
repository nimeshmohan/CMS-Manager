import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProjectSummary } from "@/api/dashboard";

/** Total/published/draft item cards, aggregated across whichever collections the viewer can see (Section 11). */
export function ProjectStatsCards({
  summary,
  isLoading,
}: {
  summary: ProjectSummary | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid max-w-2xl grid-cols-3 gap-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (!summary || summary.collections.length === 0) {
    return null;
  }

  const totals = summary.collections.reduce(
    (acc, c) => ({
      total: acc.total + c.total,
      published: acc.published + c.published,
      draft: acc.draft + c.draft,
    }),
    { total: 0, published: 0, draft: 0 },
  );

  return (
    <div className="grid max-w-2xl grid-cols-3 gap-3">
      <Card>
        <CardContent className="pt-6">
          <p className="text-2xl font-semibold">{totals.total}</p>
          <p className="text-xs text-muted-foreground">Total items</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-2xl font-semibold">{totals.published}</p>
          <p className="text-xs text-muted-foreground">Published</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-2xl font-semibold">{totals.draft}</p>
          <p className="text-xs text-muted-foreground">Draft</p>
        </CardContent>
      </Card>
    </div>
  );
}
