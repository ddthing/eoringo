import { describe, expect, it } from "vitest";
import { getRouteErrorBoundaryKey } from "./errorBoundaryReset";

describe("route error boundary reset", () => {
  it("keeps the boundary within one route and resets it for another tab", () => {
    expect(getRouteErrorBoundaryKey("/tasks/manage")).toBe(
      getRouteErrorBoundaryKey("/tasks/manage"),
    );
    expect(getRouteErrorBoundaryKey("/tasks/manage")).not.toBe(
      getRouteErrorBoundaryKey("/settings"),
    );
  });
});
