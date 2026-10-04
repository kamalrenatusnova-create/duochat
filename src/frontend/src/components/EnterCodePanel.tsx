import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRedeemConnectionCode } from "@/hooks/useQueries";
import { type ChatError, chatErrorMessage } from "@/types";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Redeems a friend's connection code. Invalid, expired, and already-used codes
 * surface a clear message and keep the draft so the user can retry.
 */
export function EnterCodePanel() {
  const redeem = useRedeemConnectionCode();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const trimmed = code.trim();
  const canSubmit = trimmed.length > 0 && !redeem.isPending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    const submitted = trimmed;
    redeem.mutate(submitted, {
      onSuccess: (conversationId) => {
        setCode("");
        toast.success("Connected! Opening your room…");
        void navigate({
          to: "/chat/$conversationId",
          params: { conversationId: conversationId.toString() },
        });
      },
      onError: (mutationError) => {
        setError(chatErrorMessage(mutationError as ChatError));
      },
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      data-ocid="connections.enter_panel"
    >
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Have a code?
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Enter the code your friend shared to open your private room.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="connection-code">Connection code</Label>
        <Input
          id="connection-code"
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            if (error) setError(null);
          }}
          placeholder="e.g. EMBER-7K2Q"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "connection-code-error" : undefined}
          data-ocid="connections.code_input"
          className="rounded-xl font-mono tracking-[0.2em] uppercase"
        />
      </div>

      {error ? (
        <div
          id="connection-code-error"
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          data-ocid="connections.code_error"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      <Button
        type="submit"
        disabled={!canSubmit}
        data-ocid="connections.redeem_button"
        className="w-full rounded-full bg-primary text-primary-foreground shadow-bubble-out transition-smooth hover:-translate-y-px hover:bg-primary/90 disabled:translate-y-0 disabled:shadow-none"
      >
        {redeem.isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Connecting…
          </>
        ) : (
          <>
            Connect
            <ArrowRight className="size-4" aria-hidden="true" />
          </>
        )}
      </Button>
    </form>
  );
}
