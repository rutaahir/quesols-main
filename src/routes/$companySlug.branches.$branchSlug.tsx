import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/$companySlug/branches/$branchSlug")({
  component: BranchSlugLayout,
});

function BranchSlugLayout() {
  return <Outlet />;
}
