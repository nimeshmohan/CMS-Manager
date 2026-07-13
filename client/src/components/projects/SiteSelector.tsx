import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { ProviderSite } from "@cms-manager/shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSelectSite } from "@/api/connections";

/** Shown when a project's credential grants access to more than one site (Section 4.4 step 4). */
export function SiteSelector({
  projectId,
  sites,
}: {
  projectId: string;
  sites: ProviderSite[];
}) {
  const selectSite = useSelectSite(projectId);

  async function handleSelect(siteId: string): Promise<void> {
    try {
      await selectSite.mutateAsync(siteId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not select site.",
      );
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">Select a site</CardTitle>
        <CardDescription>
          This connection grants access to multiple Webflow sites — choose
          the one this project manages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {sites.map((site) => (
          <Button
            key={site.id}
            variant="outline"
            className="w-full justify-start"
            disabled={selectSite.isPending}
            onClick={() => void handleSelect(site.id)}
          >
            {selectSite.isPending && <Loader2 className="animate-spin" />}
            {site.name}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
