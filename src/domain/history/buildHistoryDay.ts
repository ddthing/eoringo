import { getClampedTaskCount, getTaskProgress } from "../tasks/getTaskProgress";
import { getVisibleTaskTemplates } from "../tasks/getVisibleTaskTemplates";
import type {
  Character,
  DdayEvent,
  HistoryDay,
  HistoryTask,
  TaskProgress,
  TaskTemplate,
} from "../../types";

type TaskCountValue = boolean | number | undefined;

export type BuildHistoryDayInput = {
  date: string;
  capturedAt?: string;
  characters: Character[];
  completedByCharacter: Record<string, Record<string, TaskCountValue> | undefined>;
  customTaskTemplatesByCharacter: Record<string, TaskTemplate[] | undefined>;
  disabledDefaultTaskIdsByCharacter: Record<string, string[] | undefined>;
  memosByCharacter: Record<string, string | undefined>;
  eventsByCharacter: Record<string, DdayEvent[] | undefined>;
};

const getProgress = (
  tasks: TaskTemplate[],
  completed: Record<string, TaskCountValue>,
): TaskProgress => getTaskProgress(tasks, completed as Record<string, boolean | number>);

export const buildHistoryDay = ({
  date,
  capturedAt = new Date().toISOString(),
  characters,
  completedByCharacter,
  customTaskTemplatesByCharacter,
  disabledDefaultTaskIdsByCharacter,
  memosByCharacter,
  eventsByCharacter,
}: BuildHistoryDayInput): HistoryDay => ({
  date,
  capturedAt,
  characters: Object.fromEntries(
    characters.map((character) => {
      const completed = completedByCharacter[character.id] ?? {};
      const visibleTasks = getVisibleTaskTemplates(
        disabledDefaultTaskIdsByCharacter[character.id] ?? [],
        customTaskTemplatesByCharacter[character.id] ?? [],
      );
      const byCategory = (category: TaskTemplate["category"]) =>
        visibleTasks.filter((task) => task.category === category);
      const daily = byCategory("daily");
      const weekly = byCategory("weekly");
      const other = byCategory("custom");
      const tasks: HistoryTask[] = visibleTasks.map((task) => {
        const count = getClampedTaskCount(completed[task.id], task.maxCount);

        return {
          id: task.id,
          title: task.title,
          category: task.category,
          group: task.group,
          resetType: task.resetType,
          maxCount: task.maxCount,
          count,
          completed: count >= task.maxCount,
        };
      });

      return [
        character.id,
        {
          character: {
            id: character.id,
            name: character.name,
            server: character.server,
            isMain: character.isMain,
          },
          tasks,
          memo: memosByCharacter[character.id] ?? "",
          progress: {
            daily: getProgress(daily, completed),
            weekly: getProgress(weekly, completed),
            other: getProgress(other, completed),
            total: getProgress(visibleTasks, completed),
          },
          ddayEvents: (eventsByCharacter[character.id] ?? []).map((event) => ({ ...event })),
        },
      ];
    }),
  ),
});
