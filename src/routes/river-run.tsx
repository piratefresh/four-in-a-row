import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/river-run")({
  component: RiverRunLayout,
});

function RiverRunLayout() {
  return <Outlet />;
}
