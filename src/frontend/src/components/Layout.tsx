import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useCallerProfile } from "@/hooks/useQueries";
import { initialsFor } from "@/types";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Flame, LogOut, Settings, UserRound } from "lucide-react";

const ATTRIBUTION_URL = `https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
  typeof window !== "undefined" ? window.location.hostname : "",
)}`;

function Wordmark() {
  return (
    <Link
      to="/"
      className="group flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-ocid="nav.home_link"
    >
      <span className="relative flex size-8 items-center justify-center rounded-xl bg-gradient-primary shadow-bubble-out">
        <Flame className="size-4 text-primary-foreground" />
        <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-accent animate-ember-pulse" />
      </span>
      <span className="font-display text-xl font-semibold tracking-tight text-foreground">
        Ember
      </span>
    </Link>
  );
}

function CallerBadge() {
  const { data: profile } = useCallerProfile();
  const name = profile?.displayName?.trim() || "You";
  const avatarUrl = profile?.avatar?.blob.getDirectURL();

  return (
    <div className="flex items-center gap-2.5 rounded-full border border-border bg-card py-1 pl-1 pr-3 shadow-subtle">
      <Avatar className="size-7">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
        <AvatarFallback className="bg-secondary text-[11px] font-semibold text-secondary-foreground">
          {initialsFor(name)}
        </AvatarFallback>
      </Avatar>
      <span className="max-w-[9rem] truncate text-sm font-medium text-foreground">
        {name}
      </span>
    </div>
  );
}

export function Layout() {
  const { clear } = useInternetIdentity();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isConversation = pathname.startsWith("/chat/");

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Wordmark />
          <div className="flex items-center gap-2">
            <CallerBadge />
            <Button
              asChild
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Profile and settings"
              data-ocid="nav.profile_link"
              className="rounded-full text-muted-foreground hover:text-foreground"
            >
              <Link to="/profile">
                <UserRound className="size-4" />
              </Link>
            </Button>
            <ThemeToggle />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={clear}
              aria-label="Sign out"
              data-ocid="nav.sign_out_button"
              className="rounded-full text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main
        className={
          isConversation
            ? "flex flex-1 flex-col"
            : "mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8"
        }
      >
        <Outlet />
      </main>

      {isConversation ? null : (
        <footer className="border-t border-border bg-sidebar">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6">
            <span className="flex items-center gap-1.5">
              <Settings className="size-3.5" aria-hidden="true" />
              Private by design — two people, one room.
            </span>
            <a
              href={ATTRIBUTION_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded transition-smooth hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              © {new Date().getFullYear()}. Built with love using caffeine.ai
            </a>
          </div>
        </footer>
      )}
    </div>
  );
}
