import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import Header from "../components/Header";

import appCss from "../styles.css?url";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { createServerFn } from "@tanstack/react-start";
import { getToken } from "@/lib/auth-server";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { authClient } from "@/lib/auth-client";
import { Toaster } from "@/components/ui/sonner";
import { AppTourProvider } from "@/components/onboarding/AppTourProvider";

// Get auth information for SSR using available cookies
const getAuth = createServerFn({ method: "GET" }).handler(async () => {
  return await getToken();
});

const APP_NAME = "Word Poker";
const APP_DESCRIPTION =
  "A multiplayer word-building poker game with shared community letters, betting rounds, and showdown scoring.";

export const Route = createRootRouteWithContext<{
  convexQueryClient: ConvexQueryClient;
}>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: APP_NAME,
      },
      {
        name: "description",
        content: APP_DESCRIPTION,
      },
      {
        name: "application-name",
        content: APP_NAME,
      },
      {
        name: "theme-color",
        content: "#0b0b0c",
      },
      {
        property: "og:site_name",
        content: APP_NAME,
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:title",
        content: APP_NAME,
      },
      {
        property: "og:description",
        content: APP_DESCRIPTION,
      },
      {
        name: "twitter:card",
        content: "summary",
      },
      {
        name: "twitter:title",
        content: APP_NAME,
      },
      {
        name: "twitter:description",
        content: APP_DESCRIPTION,
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.ico",
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  beforeLoad: async (ctx) => {
    const token = await getAuth();

    // all queries, mutations and actions through TanStack Query will be
    // authenticated during SSR if we have a valid token
    if (token) {
      // During SSR only (the only time serverHttpClient exists),
      // set the auth token to make HTTP queries with.
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
    }

    return {
      isAuthenticated: !!token,
      token,
    };
  },
  component: RootComponent,
});

function RootComponent() {
  const context = useRouteContext({ from: Route.id });
  return (
    <ConvexBetterAuthProvider
      client={context.convexQueryClient.convexClient}
      authClient={authClient}
      initialToken={context.token}
    >
      <RootDocument>
        <Outlet />
      </RootDocument>
    </ConvexBetterAuthProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-black text-white">
        <AppTourProvider>
          <Header />
          {children}
        </AppTourProvider>
        <Toaster richColors />
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />

        <Scripts />
      </body>
    </html>
  );
}
