import { FormEvent, useMemo, useState } from "react";
import { Edit3, Plus, X } from "lucide-react";
import { taskGroupLabels } from "../../data/tasks";
import { getTaskCount, getTaskProgress } from "../../domain/tasks/getTaskProgress";
import { getTaskScopeId } from "../../domain/tasks/getTaskScopeId";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { useCurrentCustomTaskTemplates } from "../../stores/useCurrentCustomTaskTemplates";
import { useTaskStore } from "../../stores/useTaskStore";
import type { ResetType, TaskCategory, TaskGroup, TaskTemplate } from "../../types";
import { useConfirmDialog } from "../common/ConfirmDialog";
import { TaskItem } from "../tasks/TaskItem";

type Draft = {
  title: string;
  description: string;
  note: string;
  category: TaskCategory;
  resetType: ResetType;
  maxCount: number;
  characterScoped: boolean;
  group: TaskGroup;
  enabledByDefault: boolean;
};

const emptyDraft: Draft = {
  title: "",
  description: "",
  note: "",
  category: "custom",
  resetType: "manual",
  maxCount: 1,
  characterScoped: true,
  group: "custom",
  enabledByDefault: true,
};

const createDraftFromTask = (task: TaskTemplate): Draft => ({
  title: task.title,
  description: task.description ?? "",
  note: task.note ?? "",
  category: task.category,
  resetType: task.resetType,
  maxCount: task.maxCount,
  characterScoped: task.characterScoped,
  group: task.group,
  enabledByDefault: task.enabledByDefault,
});

export const CustomTaskList = () => {
  const activeCharacterId = useCharacterStore((state) => state.activeCharacterId);
  const customTasks = useCurrentCustomTaskTemplates();
  const completedByCharacter = useTaskStore((state) => state.completedByCharacter);
  const addCustomTask = useTaskStore((state) => state.addCustomTask);
  const updateCustomTask = useTaskStore((state) => state.updateCustomTask);
  const removeCustomTask = useTaskStore((state) => state.removeCustomTask);
  const toggleCustomTaskEnabled = useTaskStore((state) => state.toggleCustomTaskEnabled);
  const toggleTask = useTaskStore((state) => state.toggleTask);
  const setTaskCount = useTaskStore((state) => state.setTaskCount);
  const confirm = useConfirmDialog();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const enabledCustomTasks = useMemo(
    () => customTasks.filter((task) => task.enabledByDefault),
    [customTasks],
  );
  const completed = Object.fromEntries(
    enabledCustomTasks.map((task) => [
      task.id,
      completedByCharacter[getTaskScopeId(task, activeCharacterId)]?.[task.id],
    ]),
  );
  const progress = getTaskProgress(enabledCustomTasks, completed);

  const resetForm = () => {
    setDraft(emptyDraft);
    setEditingTaskId(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.title.trim()) {
      return;
    }

    const payload = {
      ...draft,
      characterScoped: true,
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      note: draft.note.trim() || undefined,
      maxCount: Math.max(1, draft.maxCount),
    };

    if (editingTaskId) {
      updateCustomTask(activeCharacterId, editingTaskId, payload);
    } else {
      addCustomTask(activeCharacterId, payload);
    }

    resetForm();
    setIsFormOpen(false);
  };

  const startEdit = (task: TaskTemplate) => {
    setDraft(createDraftFromTask(task));
    setEditingTaskId(task.id);
    setIsFormOpen(true);
  };

  const handleRemoveCustomTask = async (task: TaskTemplate) => {
    const confirmed = await confirm({
      title: `${task.title} 숙제를 삭제할까요?`,
      description: "직접 만든 숙제와 관련 체크 기록이 함께 삭제됩니다.",
      confirmLabel: "삭제",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    removeCustomTask(activeCharacterId, task.id);
  };

  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="muted-label">커스텀 숙제</p>
          <h2 className="text-lg font-bold">
            {progress.completed}/{progress.total} 완료
          </h2>
        </div>
        <button
          type="button"
          className="secondary-button flex items-center gap-2"
          onClick={() => {
            if (isFormOpen) {
              resetForm();
            }
            setIsFormOpen((value) => !value);
          }}
        >
          {isFormOpen ? <X aria-hidden size={16} /> : <Plus aria-hidden size={16} />}
          {isFormOpen ? "닫기" : "추가"}
        </button>
      </div>
      {isFormOpen ? (
        <form className="mb-4 grid gap-2" onSubmit={handleSubmit}>
          <input
            className="field"
            name="custom-task-title"
            aria-label="숙제 이름"
            autoComplete="off"
            value={draft.title}
            onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))}
            placeholder="새 커스텀 숙제"
          />
          <input
            className="field"
            name="custom-task-description"
            aria-label="숙제 설명"
            autoComplete="off"
            value={draft.description}
            onChange={(event) =>
              setDraft((value) => ({ ...value, description: event.target.value }))
            }
            placeholder="설명"
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select
              className="field"
              name="custom-task-category"
              aria-label="숙제 분류"
              value={draft.category}
              onChange={(event) =>
                setDraft((value) => ({ ...value, category: event.target.value as TaskCategory }))
              }
            >
              <option value="daily">일일</option>
              <option value="weekly">주간</option>
              <option value="custom">커스텀</option>
            </select>
            <select
              className="field"
              name="custom-task-reset"
              aria-label="초기화 주기"
              value={draft.resetType}
              onChange={(event) =>
                setDraft((value) => ({ ...value, resetType: event.target.value as ResetType }))
              }
            >
              <option value="manual">수동</option>
              <option value="daily">일일</option>
              <option value="weekly">주간</option>
              <option value="eighteenHours">18시간</option>
            </select>
            <select
              className="field"
              name="custom-task-group"
              aria-label="숙제 그룹"
              value={draft.group}
              onChange={(event) =>
                setDraft((value) => ({ ...value, group: event.target.value as TaskGroup }))
              }
            >
              {Object.entries(taskGroupLabels).map(([group, label]) => (
                <option key={group} value={group}>
                  {label}
                </option>
              ))}
            </select>
            <input
              className="field"
              type="number"
              name="custom-task-max-count"
              inputMode="numeric"
              min={1}
              max={99}
              value={draft.maxCount}
              onChange={(event) =>
                setDraft((value) => ({ ...value, maxCount: Number(event.target.value) }))
              }
              aria-label="최대 횟수"
            />
          </div>
          <input
            className="field"
            name="custom-task-note"
            aria-label="숙제 메모"
            autoComplete="off"
            value={draft.note}
            onChange={(event) => setDraft((value) => ({ ...value, note: event.target.value }))}
            placeholder="메모"
          />
          <div className="flex flex-wrap gap-3 text-sm font-medium text-ink-muted">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.enabledByDefault}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, enabledByDefault: event.target.checked }))
                }
              />
              활성화
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="primary-button">
              {editingTaskId ? "저장" : "추가"}
            </button>
            <button type="button" className="secondary-button" onClick={resetForm}>
              취소
            </button>
          </div>
        </form>
      ) : null}
      <div className="space-y-2">
        {customTasks.length === 0 ? (
          <p className="rounded-lg bg-surface-muted p-3 text-sm text-ink-muted">
            직접 추가한 숙제가 없습니다.
          </p>
        ) : (
          customTasks.map((task) => {
            const scopeId = getTaskScopeId(task, activeCharacterId);
            const count = getTaskCount(completedByCharacter[scopeId]?.[task.id]);

            return (
              <div key={task.id} className={task.enabledByDefault ? "" : "opacity-50"}>
                <TaskItem
                  task={task}
                  count={count}
                  onToggle={() => toggleTask(scopeId, task.id, task.maxCount, task.resetType)}
                  onSetCount={(nextCount) =>
                    setTaskCount(scopeId, task.id, nextCount, task.maxCount, task.resetType)
                  }
                  onRemove={() => handleRemoveCustomTask(task)}
                  showMeta
                />
                <div className="mt-1 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-lg px-3 py-1 text-xs font-semibold text-ink-muted"
                    onClick={() => toggleCustomTaskEnabled(activeCharacterId, task.id)}
                  >
                    {task.enabledByDefault ? "비활성화" : "활성화"}
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold text-brand"
                    onClick={() => startEdit(task)}
                  >
                    <Edit3 aria-hidden size={13} />
                    수정
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
