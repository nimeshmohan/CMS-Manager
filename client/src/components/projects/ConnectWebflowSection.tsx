import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import { useConnectWithApiToken, useStartOAuth } from "@/api/connections";

/**
 * Both connection methods, presented as equally first-class (Section 4.3's
 * recommendation) — "Sign in with Webflow" isn't gated on whether OAuth is
 * actually configured on this server; if it isn't, the click just surfaces
 * that error and the API token path right below it still works.
 */
export function ConnectWebflowSection({ projectId }: { projectId: string }) {
  const startOAuth = useStartOAuth(projectId);
  const connectToken = useConnectWithApiToken(projectId);
  const [apiToken, setApiToken] = useState("");
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  async function handleOAuthClick(): Promise<void> {
    setOauthError(null);
    try {
      const { url } = await startOAuth.mutateAsync();
      window.location.href = url;
    } catch (error) {
      setOauthError(
        error instanceof Error
          ? error.message
          : "Could not start Webflow sign-in.",
      );
    }
  }

  async function handleTokenSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setTokenError(null);
    try {
      await connectToken.mutateAsync(apiToken);
      toast.success("Connected to Webflow.");
      setApiToken("");
    } catch (error) {
      setTokenError(
        error instanceof Error ? error.message : "Could not connect.",
      );
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">Connect Webflow</CardTitle>
        <CardDescription>
          Connect this project to a Webflow site to manage its content.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Button
            onClick={() => void handleOAuthClick()}
            disabled={startOAuth.isPending}
          >
            {startOAuth.isPending && <Loader2 className="animate-spin" />}
            Sign in with Webflow
          </Button>
          <FormError message={oauthError ?? undefined} />
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <form onSubmit={(e) => void handleTokenSubmit(e)} className="space-y-2">
          <Label htmlFor="apiToken">Use an API Token</Label>
          <div className="flex gap-2">
            <Input
              id="apiToken"
              type="password"
              autoComplete="off"
              placeholder="Paste your Webflow Site API token"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
            />
            <Button
              type="submit"
              variant="outline"
              disabled={connectToken.isPending || !apiToken}
            >
              {connectToken.isPending && <Loader2 className="animate-spin" />}
              Connect
            </Button>
          </div>
          <FormError message={tokenError ?? undefined} />
        </form>
      </CardContent>
    </Card>
  );
}
