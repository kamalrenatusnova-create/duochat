import { ConnectionList } from "@/components/ConnectionList";
import { CreateCodePanel } from "@/components/CreateCodePanel";
import { EnterCodePanel } from "@/components/EnterCodePanel";
import { useConversations } from "@/hooks/useQueries";
import { Link } from "@tanstack/react-router";
import { MessageCircleHeart, Plus, Ticket } from "lucide-react";
import { useState } from "react";

type PairingMode = "create" | "enter";

/**
 * Connections home: the list of active two-person conversations plus the
 * connection-code pairing flows (create a code, or redeem a friend's).
 */
export function ConnectionsPage() {
  const {
    data: conversations,
    isLoading,
    isError,
    refetch,
  } = useConversations();
  const [mode, setMode] = useState<PairingMode>("create");

  const hasConnections = (conversations?.length ?? 0) > 0;

  return (
    <div className="animate-fade-up" data-ocid="connections.page">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Your rooms
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Connections
          </h1>
          <p className="mt-1.5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            One code, one friend, one private room. Pair with someone to start
            talking.
          </p>
        </div>
        {hasConnections ? (
          <Link
            to="/"
            className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-subtle transition-smooth hover:-translate-y-px hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:self-auto"
            data-ocid="connections.new_connection_link"
          >
            <Plus className="size-4 text-primary" aria-hidden="true" />
            New connection
          </Link>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="connections-list-heading" className="min-w-0">
          <h2
            id="connections-list-heading"
            className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            {hasConnections
              ? `${conversations?.length} active`
              : "No connections yet"}
          </h2>

          {isLoading ? (
            <ConnectionListSkeleton />
          ) : isError ? (
            <div
              className="rounded-2xl border border-destructive/30 bg-card p-6 text-center shadow-subtle"
              data-ocid="connections.error_state"
            >
              <p className="text-sm text-foreground">
                We couldn't load your connections.
              </p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-smooth hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-ocid="connections.retry_button"
              >
                Try again
              </button>
            </div>
          ) : hasConnections ? (
            <ConnectionList conversations={conversations ?? []} />
          ) : (
            <EmptyConnections onStart={() => setMode("enter")} />
          )}
        </section>

        <aside className="min-w-0" aria-label="Pair with a friend">
          <div className="rounded-2xl border border-border bg-card p-1.5 shadow-subtle">
            <div
              role="tablist"
              aria-label="Pairing method"
              className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
            >
              <PairingTab
                active={mode === "create"}
                onClick={() => setMode("create")}
                icon={<Ticket className="size-4" aria-hidden="true" />}
                label="Create a code"
                ocid="connections.create_tab"
              />
              <PairingTab
                active={mode === "enter"}
                onClick={() => setMode("enter")}
                icon={
                  <MessageCircleHeart className="size-4" aria-hidden="true" />
                }
                label="Enter a code"
                ocid="connections.enter_tab"
              />
            </div>

            <div className="p-4 pt-5">
              {mode === "create" ? <CreateCodePanel /> : <EnterCodePanel />}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PairingTab({
  active,
  onClick,
  icon,
  label,
  ocid,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  ocid: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      data-ocid={ocid}
      className={
        active
          ? "flex items-center justify-center gap-2 rounded-lg bg-card px-3 py-2 text-sm font-medium text-foreground shadow-subtle transition-smooth"
          : "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-smooth hover:text-foreground"
      }
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function EmptyConnections({ onStart }: { onStart: () => void }) {
  return (
    <div
      className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center shadow-subtle"
      data-ocid="connections.empty_state"
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-bubble-out">
        <MessageCircleHeart
          className="size-7 text-primary-foreground"
          aria-hidden="true"
        />
      </span>
      <h3 className="mt-4 font-display text-xl font-semibold text-foreground">
        No one here yet
      </h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Create a code and share it with a friend, or enter the code they sent
        you. The moment it's redeemed, your private room opens.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-bubble-out transition-smooth hover:-translate-y-px hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-ocid="connections.empty_enter_button"
      >
        Enter a friend's code
      </button>
    </div>
  );
}

function ConnectionListSkeleton() {
  const ids = Array.from({ length: 3 }, (_, i) => `connection-skeleton-${i}`);
  return (
    <ul className="space-y-3" data-ocid="connections.loading_state">
      {ids.map((id) => (
        <li
          key={id}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-subtle"
        >
          <div className="size-11 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-48 animate-pulse rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}
