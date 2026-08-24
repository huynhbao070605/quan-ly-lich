"use client";

import { ErrorState } from "@/components/states/error-state";

export default function AppError({ reset }: { reset: () => void }) {
  return <ErrorState onRetry={reset} />;
}
