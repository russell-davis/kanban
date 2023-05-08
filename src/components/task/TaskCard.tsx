import React, { FC, useState } from "react";
import {
  ActionIcon,
  Badge,
  Card,
  ColorInput,
  Group,
  Overlay,
  Popover,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { classNames } from "~/lib/classNames";
import { IconCalendar, IconCircleCheck, IconClock } from "@tabler/icons-react";
import { Timer } from "~/components/task/Timer";
import { DatePicker } from "@mantine/dates";
import { api, RouterOutputs } from "~/utils/api";
import { TaskData } from "~/server/api/root";
import { format, intervalToDuration, isSameDay } from "date-fns";
import { getHoursMinutes } from "~/lib/GetHoursMinutes";

export const ChannelSelector: FC<{
  taskId: string;
  currentChannel: RouterOutputs["channels"]["list"][number];
}> = ({ taskId, currentChannel }) => {
  const channels = api.channels.list.useQuery();
  const changeTaskChannel = api.task.update.useMutation();
  if (channels.isLoading) return <Badge color="gray">...</Badge>;
  if (!channels.data) return <Badge color="gray">No channels</Badge>;
  const selectedOption = channels.data?.find((c) => c.id === currentChannel.id);
  const channelList =
    channels.data?.map((channel) => {
      return {
        label: channel.name,
        value: channel.id,
      };
    }) || [];

  return (
    <Popover
      width={200}
      position="bottom-end"
      withArrow
      shadow="md"
      withinPortal
      offset={4}
    >
      <Popover.Target>
        <Badge color={selectedOption?.color}>{selectedOption?.name}</Badge>
      </Popover.Target>
      <Popover.Dropdown
        sx={(theme) => ({
          background: theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
        })}
      >
        <Stack>
          <ColorInput
            label={"Color"}
            format="hex"
            swatches={[
              "#25262b",
              "#868e96",
              "#fa5252",
              "#e64980",
              "#be4bdb",
              "#7950f2",
              "#4c6ef5",
              "#228be6",
              "#15aabf",
              "#12b886",
              "#40c057",
              "#82c91e",
              "#fab005",
              "#fd7e14",
            ]}
            defaultValue={selectedOption?.color}
            value={selectedOption?.color}
            onChange={(value) => {
              console.info("change:", value);
              // changeTaskChannel.mutateAsync({
              //   taskId: taskId,
              //   channel: {
              //     color: value,
              //   },
              // });
            }}
          />
          <Select
            label="Select a channel"
            clearable
            creatable
            searchable
            value={selectedOption?.id}
            onChange={(value) => {
              console.info("change:", value);
            }}
            data={channelList}
            getCreateLabel={(value) => `Create channel: "${value}"`}
            onCreate={(value) => {
              console.info("create:", value);
              changeTaskChannel.mutateAsync({
                taskId: taskId,
                channel: {
                  name: value,
                  color: "blue",
                },
              });
              return value;
            }}
          />
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};

export const TaskCard: FC<{
  task: TaskData;
  dateRange: {
    startAt: Date;
    endAt: Date;
  };
  onEditTaskClicked: (task: TaskData) => void;
}> = ({ task, dateRange, onEditTaskClicked }) => {
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

  const handleCardDoubleClicked = () => {
    onEditTaskClicked(task);
  };

  return (
    <Card
      withBorder
      shadow="sm"
      radius="md"
      p={"xs"}
      onDoubleClick={(event) => handleCardDoubleClicked()}
    >
      {task.completed && <Overlay color="#000" opacity={0.5} />}
      <Stack spacing={2}>
        <Group position={"apart"}>
          <Stack spacing={0}>
            {task.scheduledFor ? (
              <div className={"flex"}>
                <span className=" inline-flex items-center rounded-md bg-gray-50 px-1 py-0.5 text-[6pt] font-bold text-gray-600 ring-1 ring-inset ring-gray-500/10">
                  {task.scheduledFor && format(task.scheduledFor, "h:mm aaa")}
                </span>
              </div>
            ) : null}
            <Text
              weight={600}
              pr={totalTimeEntrySeconds > 0 ? 10 : 0}
              onClick={(event) => {
                handleCardDoubleClicked();
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
          <ChannelSelector taskId={task.id} currentChannel={task.channel} />
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
