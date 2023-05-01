import { FC, useState } from "react";
import { ActionIcon, Card, Group, Stack, Text } from "@mantine/core";
import { useDraggable } from "@dnd-kit/core";
import { classNames, DRAGABLES } from "~/pages";
import { IconCalendar, IconCircleCheck, IconClock } from "@tabler/icons-react";
import { Timer } from "~/components/task/Timer";
import { DatePicker } from "@mantine/dates";
import { api } from "~/utils/api";
import { TaskData } from "~/server/api/root";
import { intervalToDuration, isSameDay } from "date-fns";

export const TaskCard: FC<{
  task: TaskData;
  dateRange: {
    startAt: Date;
    endAt: Date;
  };
}> = ({ task, dateRange }) => {
  const utils = api.useContext();
  const createTimeEntry = api.task.logTime.useMutation();
  const completeTask = api.task.toggleCompleted.useMutation({
    onMutate: async ({ taskId, completed }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await utils.kanban.tasks.cancel();

      // Snapshot the previous value
      const previous = utils.kanban.tasks.getData(dateRange);
      console.info(`previous: ${previous?.tasksByDate.length}`);

      // Optimistically update to the new value
      utils.kanban.tasks.setData(dateRange, (td) => {
        if (!td) return td;
        return {
          ...td,
          tasksByDate: td.tasksByDate.map((tbd) => {
            if (!isSameDay(tbd.date, task.date)) return tbd;
            return {
              ...tbd,
              tasks: tbd.tasks.map((t) => {
                if (t.id !== taskId) return t;
                return {
                  ...t,
                  completed: completed,
                };
              }),
            };
          }),
          backlog: td.backlog.map((t) => {
            if (t.id !== taskId) return t;
            return {
              ...t,
              completed: completed,
            };
          }),
        };
      });

      // Return a context object with the snapshotted value
      return { previous };
    },
    onError: (err, variables, context) => {
      utils.kanban.tasks.setData(dateRange, context?.previous);
    },
    onSettled: async () => {
      await utils.kanban.tasks.invalidate(dateRange);
      console.info("toggled completed task and invalidated");
    },
  });
  const { setNodeRef, attributes, listeners } = useDraggable({
    id: task.id,
    data: {
      type: DRAGABLES.TASK,
      task: task,
    },
  });
  const [datePickerOpen, setDatePickerOpen] = useState<boolean>(false);
  const [datePickerDate, setDatePickerDate] = useState<Date | null>(task.date);
  const [timerOpen, setTimerOpen] = useState<boolean>(false);
  const totalTimeEntrySeconds = task.timeEntries.reduce(
    (acc, timeEntry) => acc + timeEntry.seconds,
    0
  );

  const totalTimeInHoursAndMinutes = intervalToDuration({
    start: new Date(0),
    end: new Date(totalTimeEntrySeconds * 1000),
  });
  // format as hh:mm (with leading zeros)
  const actualTime = getHoursMinutes(totalTimeInHoursAndMinutes);
  const expectedTime = getHoursMinutes(
    intervalToDuration({
      start: new Date(0),
      end: new Date(0),
    })
  );

  return (
    <Card
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
    >
      <Card.Section p={8}>
        <Stack spacing={2}>
          <Group position={"apart"}>
            <Text weight={600} pr={totalTimeEntrySeconds > 0 ? 10 : 0}>
              {task.title}
            </Text>
            {totalTimeEntrySeconds > 0 ? (
              <span className="absolute right-2 top-2 inline-flex items-center rounded-md bg-gray-50 px-1 py-0.5 text-[6pt] font-bold text-gray-600 ring-1 ring-inset ring-gray-500/10">
                {actualTime} / {expectedTime}
              </span>
            ) : null}
          </Group>
          {task.subtasks.length > 0 ? (
            <Group align={"center"}>
              <ActionIcon title={"complete"}>
                <IconCircleCheck stroke={0.7} size={18} />
              </ActionIcon>
              <Text>subtasks</Text>
            </Group>
          ) : null}
          <Group position="apart" align={"center"}>
            <Group spacing={0}>
              <ActionIcon
                title={"complete"}
                className={classNames(
                  task.completed ? "text-green-500" : "text-gray-500"
                )}
                onClick={async () => {
                  completeTask.mutate({
                    taskId: task.id,
                    completed: !task.completed,
                  });
                }}
              >
                <IconCircleCheck stroke={0.7} />
              </ActionIcon>
              <ActionIcon
                title={"reschedule"}
                color={datePickerOpen ? "blue" : "gray"}
                onClick={() => setDatePickerOpen(!datePickerOpen)}
              >
                <IconCalendar stroke={0.7} size={20} />
              </ActionIcon>
              <ActionIcon
                title={"timer"}
                color={timerOpen ? "blue" : "gray"}
                onClick={() => setTimerOpen(!timerOpen)}
              >
                <IconClock stroke={0.7} size={20} />
              </ActionIcon>
            </Group>
            <Text size={"xs"}>work</Text>
          </Group>
          {timerOpen && (
            <Timer
              currentDuration={totalTimeEntrySeconds}
              onStart={() => console.log("start timer")}
              onStop={async (duration) => {
                console.log("stop", duration);

                // optimistic update
                await createTimeEntry
                  .mutateAsync({
                    taskId: task.id,
                    time: duration,
                  })
                  .then(async () => {
                    await utils.kanban.tasks.refetch();
                  })
                  .catch((e) => {
                    console.error(e);
                  });
              }}
            />
          )}
          {datePickerOpen && (
            <Group position="center">
              <DatePicker value={datePickerDate} onChange={setDatePickerDate} />
            </Group>
          )}
        </Stack>
      </Card.Section>
    </Card>
  );
};
export function getHoursMinutes(totalTimeInHoursAndMinutes: Duration) {
  // if all are zero, return --:--
  if (
    totalTimeInHoursAndMinutes.seconds === 0 &&
    totalTimeInHoursAndMinutes.minutes === 0 &&
    totalTimeInHoursAndMinutes.hours === 0
  ) {
    return "--:--";
  }

  // if less than 1 minute, return 00:01
  if (
    totalTimeInHoursAndMinutes.seconds &&
    totalTimeInHoursAndMinutes.seconds < 60 &&
    totalTimeInHoursAndMinutes.minutes === 0 &&
    totalTimeInHoursAndMinutes.hours === 0
  ) {
    return "00:01";
  }

  return `${
    !!totalTimeInHoursAndMinutes.hours && totalTimeInHoursAndMinutes.hours > 9
      ? totalTimeInHoursAndMinutes.hours
      : `0${totalTimeInHoursAndMinutes.hours}`
  }:${
    !!totalTimeInHoursAndMinutes.minutes && totalTimeInHoursAndMinutes.minutes > 9
      ? totalTimeInHoursAndMinutes.minutes
      : `0${totalTimeInHoursAndMinutes.minutes}`
  }`;
}
