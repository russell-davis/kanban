import { FC, useState } from "react";
import {
  ActionIcon,
  Badge,
  Card,
  Divider,
  Group,
  Overlay,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { classNames } from "~/lib/classNames";
import {
  IconArchive,
  IconCalendar,
  IconCircleCheck,
  IconCircleCheckFilled,
  IconClock,
} from "@tabler/icons-react";
import { Timer } from "~/components/task/Timer";
import { DatePicker } from "@mantine/dates";
import { api } from "~/utils/api";
import { TaskData } from "~/server/api/root";
import { format, intervalToDuration, isSameDay } from "date-fns";
import { modals } from "@mantine/modals";

export const TaskCard: FC<{
  task: TaskData;
  dateRange: {
    startAt: Date;
    endAt: Date;
  };
}> = ({ task, dateRange }) => {
  const [datePickerOpen, setDatePickerOpen] = useState<boolean>(false);
  const [datePickerDate, setDatePickerDate] = useState<Date | null>(task.date);
  const [timerOpen, setTimerOpen] = useState<boolean>(false);

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
  const moveTaskItem = api.kanban.updatePosition.useMutation({
    onMutate: async ({ taskId, ...taskData }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await utils.kanban.tasks.cancel();

      // Snapshot the previous value
      const previous = utils.kanban.tasks.getData(dateRange);

      // Optimistically update to the new value
      utils.kanban.tasks.setData(dateRange, (td) => {
        if (!td) return td;
        return {
          ...td,
          tasksByDate: td.tasksByDate.map((tbd) => {
            if (!isSameDay(tbd.date, taskData.date)) {
              // remove the item from the old date
              return {
                ...tbd,
                tasks: tbd.tasks.filter((t) => t.id !== taskId),
              };
            }
            return {
              ...tbd,
              tasks: tbd.tasks.map((t) => {
                if (t.id !== taskId) return t;
                return {
                  ...t,
                  ...taskData,
                };
              }),
            };
          }),
          backlog: td.backlog.filter((t) => t.id !== taskId),
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
      setDatePickerOpen(false);
    },
  });

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

  const openEditModal = () =>
    modals.open({
      modalId: "edit-task",
      title: (
        <Text weight={"600"} size={"lg"}>
          Edit Task
        </Text>
      ),
      centered: true,
      size: "lg",
      shadow: "lg",
      children: (
        <div className="flex flex-col space-y-2">
          <div className="flex w-full flex-row items-start space-x-2 align-top">
            <ActionIcon
              color={task.completed ? "green" : "gray"}
              className="mt-2"
              loading={completeTask.isLoading}
              disabled={completeTask.isLoading}
              onClick={(e) => {
                e.stopPropagation();
                completeTask.mutate({
                  taskId: task.id,
                  completed: !task.completed,
                });
                task.completed = !task.completed;
              }}
            >
              <IconCircleCheckFilled size={28} />
            </ActionIcon>
            <div className="flex flex-col justify-between pt-1">
              <Text weight={600} size={"xl"}>
                {task.title}
              </Text>
            </div>
          </div>
          <Textarea
            label={"Notes"}
            variant={"unstyled"}
            placeholder={"Add notes..."}
            className="pl-10"
            minRows={4}
            classNames={{
              input: "h-56",
            }}
          />
          <Divider />
          <Stack spacing={4} className={"pb-8"}>
            <Group align={"center"}>
              <Text>Audit Logs</Text>
            </Group>
            <Group align={"center"}>
              <IconArchive size={18} />
              <Text size={"xs"}>Created: {task.createdAt.toLocaleDateString()}</Text>
            </Group>
            <Group align={"center"}>
              <IconArchive size={18} />
              <Text size={"xs"}>Updated: {task.updatedAt.toLocaleDateString()}</Text>
            </Group>
          </Stack>
          <div className="flex flex-col space-y-2">
            <Divider />
            <Text size={"xs"} className="">
              ID: {task.id}
            </Text>
          </div>
        </div>
      ),
      classNames: {
        // inner: "h-72",
      },
    });

  return (
    <Card withBorder shadow="sm" radius="md" p={"xs"}>
      {task.completed && <Overlay color="#000" opacity={0.5} />}
      <Stack spacing={2}>
        <Group position={"apart"}>
          <Stack spacing={0}>
            {task.scheduledFor ? (
              <div className={"flex"}>
                <span className="flex inline-flex items-center rounded-md bg-gray-50 px-1 py-0.5 text-[6pt] font-bold text-gray-600 ring-1 ring-inset ring-gray-500/10">
                  {task.scheduledFor && format(task.scheduledFor, "h:mm aaa")}
                </span>
              </div>
            ) : null}
            <Text
              weight={600}
              pr={totalTimeEntrySeconds > 0 ? 10 : 0}
              onClick={(event) => {
                openEditModal();
              }}
            >
              {task.title}
            </Text>
          </Stack>
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
              className={classNames(task.completed ? "text-green-500" : "text-gray-500")}
              onClick={async (event) => {
                event.stopPropagation();
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
              onClick={async (event) => {
                event.stopPropagation();
                setDatePickerOpen(!datePickerOpen);
              }}
            >
              <IconCalendar stroke={0.7} size={20} />
            </ActionIcon>
            <ActionIcon
              title={"timer"}
              color={timerOpen ? "blue" : "gray"}
              onClick={async (event) => {
                event.stopPropagation();
                setTimerOpen(!timerOpen);
              }}
            >
              <IconClock stroke={0.7} size={20} />
            </ActionIcon>
          </Group>
          <Text
            size={"xs"}
            onClick={(event) => {
              openEditModal();
            }}
          >
            <Badge color={task.channel.color}>{task.channel.name}</Badge>
          </Text>
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
          <div className={classNames("flex flex-col items-center")}>
            <DatePicker
              value={datePickerDate}
              onChange={(date) => {
                console.info(date);
                setDatePickerDate(date);
                if (!date) return;
                moveTaskItem.mutate({
                  taskId: task.id,
                  date: date,
                  position: -1,
                  backlog: false,
                  scheduledFor: null,
                });
              }}
            />
          </div>
        )}
      </Stack>
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
