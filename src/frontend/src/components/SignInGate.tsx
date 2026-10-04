import { Button } from "@/components/ui/button";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Flame, Loader2 } from "lucide-react";

/**
 * Full-screen sign-in gate. Renders children only once the user holds a
 * non-anonymous Internet Identity; otherwise shows the Ember welcome surface.
 */
export function SignInGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing, isLoggingIn, login, loginError } =
    useInternetIdentity();

  if (isInitializing) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-background"
        data-ocid="auth.loading_state"
      >
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Flame className="size-8 animate-ember-pulse text-primary" />
          <p className="text-sm">Warming up…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-subtle px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          className="relative w-full max-w-md animate-fade-up rounded-2xl border border-border bg-card p-8 text-center shadow-elevated"
          data-ocid="auth.panel"
        >
          <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-bubble-out">
            <Flame className="size-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
            Ember
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            A private room for two. Sign in, share a connection code, and keep
            the conversation between you and one friend.
          </p>
          <Button
            type="button"
            size="lg"
            onClick={() => login()}
            disabled={isLoggingIn}
            data-ocid="auth.sign_in_button"
            className="mt-8 w-full rounded-full bg-primary text-primary-foreground shadow-bubble-out transition-smooth hover:-translate-y-px hover:bg-primary/90"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in with Internet Identity"
            )}
          </Button>
          {loginError ? (
            <p
              className="mt-4 text-sm text-destructive"
              data-ocid="auth.error_state"
            >
              {loginError.message}
            </p>
          ) : null}
          <p className="mt-6 text-xs text-muted-foreground">
            Your identity stays on your device. No email, no password.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
