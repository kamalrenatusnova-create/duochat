import { Button } from "@/components/ui/button";
import { useCreateConnectionCode } from "@/hooks/useQueries";
import { Check, Copy, Loader2, RefreshCw, Ticket } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Generates a short, shareable connection code for the caller and displays it
 * in a copyable, dashed-border card.
 */
export function CreateCodePanel() {
  const createCode = useCreateConnectionCode();
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    setCopied(false);
    createCode.mutate(undefined, {
      onSuccess: (generated) => setCode(generated),
      onError: () => toast.error("Couldn't create a code. Please try again."),
    });
  };

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Code copied — send it to your friend.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy automatically. Select the code and copy it.");
    }
  };

  return (
    <div className="space-y-4" data-ocid="connections.create_panel">
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Invite a friend
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Generate a one-time code and share it. When they enter it, your room
          opens.
        </p>
      </div>

      {code ? (
        <div
          className="rounded-2xl border border-dashed border-primary/40 bg-secondary/60 p-4 text-center"
          data-ocid="connections.code_display"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Your code
          </p>
          <p className="mt-2 select-all break-all font-mono text-2xl font-semibold tracking-[0.3em] text-foreground">
            {code}
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              onClick={() => void handleCopy()}
              data-ocid="connections.copy_code_button"
              className="flex-1 rounded-full bg-primary text-primary-foreground shadow-bubble-out transition-smooth hover:-translate-y-px hover:bg-primary/90"
            >
              {copied ? (
                <>
                  <Check className="size-4" aria-hidden="true" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-4" aria-hidden="true" />
                  Copy code
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerate}
              disabled={createCode.isPending}
              aria-label="Generate a new code"
              data-ocid="connections.regenerate_code_button"
              className="rounded-full"
            >
              {createCode.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="size-4" aria-hidden="true" />
              )}
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Codes are single-use. Generate a fresh one if it expires.
          </p>
        </div>
      ) : (
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={createCode.isPending}
          data-ocid="connections.create_code_button"
          className="w-full rounded-full bg-primary text-primary-foreground shadow-bubble-out transition-smooth hover:-translate-y-px hover:bg-primary/90"
        >
          {createCode.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Creating…
            </>
          ) : (
            <>
              <Ticket className="size-4" aria-hidden="true" />
              Create a code
            </>
          )}
        </Button>
      )}
    </div>
  );
}
