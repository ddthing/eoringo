import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TaskManagementToolbar } from "./TaskManagementToolbar";

describe("TaskManagementToolbar", () => {
  it("keeps the result count and status filters in one consistent control", () => {
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

    expect(markup).toContain('class="ui-task-status-control"');
    expect(markup).toContain('class="ui-task-status-summary"');
    expect(markup).toContain("26개 숙제");
    expect(markup).toContain("ui-task-status-options");
    expect(markup).toContain('aria-label="숙제 상태 필터"');
    expect(markup).toMatch(/>활성<.*>숨김<.*>전체</s);
  });
});
