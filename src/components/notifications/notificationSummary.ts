import { getVisibleTaskTemplates } from "../../domain/tasks/getVisibleTaskTemplates";
import {
  getDailyIncompleteTaskTitles,
  getDailyTaskTitles,
  type BackgroundNotificationTaskSummary,
  type NotificationTaskSummary,
} from "../../domain/notifications/notificationSchedule";
import { getKstDateKey } from "../../lib/date";
import type { Character, TaskTemplate } from "../../types";

export type NotificationTaskSource = {
  completedByCharacter: Record<string, Record<string, boolean | number | undefined>>;
  customTaskTemplatesByCharacter: Record<string, TaskTemplate[]>;
  disabledDefaultTaskIdsByCharacter: Record<string, string[]>;
};

export const getNotificationTaskSummaries = (
  characters: Character[],
  taskSource: NotificationTaskSource,
): NotificationTaskSummary[] =>
  characters.map((character) => {
    const visibleTasks = getVisibleTaskTemplates(
      taskSource.disabledDefaultTaskIdsByCharacter[character.id] ?? [],
      taskSource.customTaskTemplatesByCharacter[character.id] ?? [],
    );

    return {
      characterName: character.name,
      taskTitles: getDailyIncompleteTaskTitles(
        visibleTasks,
        taskSource.completedByCharacter[character.id] ?? {},
      ),
    };
  });

export const getBackgroundNotificationTaskSummaries = (
  characters: Character[],
  taskSource: NotificationTaskSource,
  date: Date = new Date(),
): BackgroundNotificationTaskSummary[] =>
  characters.map((character) => {
    const visibleTasks = getVisibleTaskTemplates(
      taskSource.disabledDefaultTaskIdsByCharacter[character.id] ?? [],
      taskSource.customTaskTemplatesByCharacter[character.id] ?? [],
    );
    const completedTasks = taskSource.completedByCharacter[character.id] ?? {};

    return {
      characterName: character.name,
      taskTitles: getDailyIncompleteTaskTitles(visibleTasks, completedTasks),
      dailyTaskTitles: getDailyTaskTitles(visibleTasks),
      summaryDate: getKstDateKey(date),
    };
  });
