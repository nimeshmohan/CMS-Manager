import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTheme } from "@/providers/ThemeProvider";

/**
 * Platform-level settings — cross-project preferences only (Section 12).
 * Per-project CMS connection/collection/field settings live under each
 * project's own Settings page once Projects exist (Phase 4/5) — this page
 * intentionally never shows anything project-specific.
 */
export function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Preferences that apply across every project.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>
            Choose how the dashboard looks on this device.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button
            variant={theme === "light" ? "default" : "outline"}
            onClick={() => setTheme("light")}
          >
            <Sun />
            Light
          </Button>
          <Button
            variant={theme === "dark" ? "default" : "outline"}
            onClick={() => setTheme("dark")}
          >
            <Moon />
            Dark
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
