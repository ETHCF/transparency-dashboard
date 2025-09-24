import { createFileRoute } from "@tanstack/react-router";

import { ErrorState } from "@/components/common/ErrorState";

const NotFoundPage = () => (
  <ErrorState
    title="Page not found"
    description="Check the URL or navigate using the header."
  />
);

export const Route = createFileRoute("/$404")({
  component: NotFoundPage,
});
