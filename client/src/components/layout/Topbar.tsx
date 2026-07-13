import { Link } from "react-router-dom";
import { LogOut, Moon, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { UserAvatar } from "./UserAvatar";

/**
 * Top-bar-only shell for now — no sidebar, because there's no nav content
 * beyond the platform-wide Projects list and (for Super Admins) the global
 * Activity Log. Section 4.2's project-switching outer shell (nested
 * per-project sidebar) replaces this once a project has real Collections
 * to navigate between.
 */
export function Topbar() {
  const { profile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            C
          </div>
          CMS Manager
        </Link>
        <Link
          to="/projects"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Projects
        </Link>
        {profile?.isSuperAdmin && (
          <Link
            to="/activity-logs"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Activity Log
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === "dark" ? <Sun /> : <Moon />}
          <span className="sr-only">Toggle theme</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="rounded-full">
              <UserAvatar
                name={profile?.displayName ?? profile?.email ?? "?"}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium">{profile?.displayName}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {profile?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile">
                <User />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void logout()}>
              <LogOut />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
