import { Layout } from "@/components/Layout";
import { ProfileSetup } from "@/components/ProfileSetup";
import { SignInGate } from "@/components/SignInGate";
import { ConnectionsPage } from "@/pages/ConnectionsPage";
import { ConversationPage } from "@/pages/ConversationPage";
import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

function RootComponent() {
  return (
    <SignInGate>
      <Outlet />
    </SignInGate>
  );
}

const rootRoute = createRootRoute({ component: RootComponent });

const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "layout",
  component: Layout,
});

/** Connections / home view — page body supplied by the connections page task. */
const connectionsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/",
  component: ConnectionsPage,
});

/** Conversation view — page body supplied by the conversation page task. */
const conversationRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/chat/$conversationId",
  component: ConversationPage,
});

/** Profile / settings view. */
const profileRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/profile",
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <div data-ocid="profile.page">
      <ProfileSetup />
    </div>
  );
}

const routeTree = rootRoute.addChildren([
  layoutRoute.addChildren([connectionsRoute, conversationRoute, profileRoute]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
