import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TaskManagementToolbar } from "./TaskManagementToolbar";

describe("TaskManagementToolbar", () => {
  it("separates the result summary from the interactive filter groups", () => {
    const markup = renderToStaticMarkup(
      <TaskManagementToolbar
        query=""
        status="enabled"
        resetFilter="all"
        resultCount={26}
        onQueryChange={vi.fn()}
        onStatusChange={vi.fn()}
        onResetFilterChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(markup).toContain("ui-task-filter-card");
    expect(markup).toContain("ui-task-filter-heading");
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("26개 숙제 표시 중");
    expect(markup).toContain('id="task-management-search"');
    expect(markup).toContain("ui-task-filter-search");
    expect(markup).toContain("ui-task-filter-status");
    expect(markup).toContain("ui-task-filter-reset");
    expect(markup).toContain('aria-label="숙제 상태 필터"');
    expect(markup).toContain('aria-label="초기화 필터"');
    expect(markup).toMatch(/>활성<.*>숨김<.*>전체</s);
    expect(markup).not.toContain("ui-task-status-control");
    expect(markup).not.toContain("ui-task-status-summary");
    expect(markup).not.toContain("ui-task-status-options");
  });
});
