import { FC, useState } from "react";
import { ActionIcon, Card, Group, Stack, Text } from "@mantine/core";
import { useDraggable } from "@dnd-kit/core";
import { DRAGABLES } from "~/pages";
import { IconCalendar, IconCircleCheck, IconClock } from "@tabler/icons-react";
import { Timer } from "~/components/task/Timer";
import { DatePicker } from "@mantine/dates";
import { api } from "~/utils/api";
import { TaskData } from "~/server/api/root";

export const TaskCard: FC<{
  task: TaskData;
}> = ({ task }) => {
  const { setNodeRef, attributes, listeners } = useDraggable({
    id: task.id,
    data: {
      type: DRAGABLES.TASK,
      task: task,
    },
  });
  const [timerOpen, setTimerOpen] = useState<boolean>(true);
  const [datePickerOpen, setDatePickerOpen] = useState<boolean>(false);
  const [datePickerDate, setDatePickerDate] = useState<Date | null>(task.date);
  const createTimeEntry = api.task.logTime.useMutation();
  const utils = api.useContext();
  const totalTimeEntrySeconds = task.timeEntries.reduce(
    (acc, timeEntry) => acc + timeEntry.seconds,
    0
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
          <Group>
            <Text weight={600}>{task.title}</Text>
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
              <ActionIcon title={"complete"}>
                <IconCircleCheck stroke={0.7} />
              </ActionIcon>
              <ActionIcon title={"reschedule"}>
                <IconCalendar stroke={0.7} size={20} />
              </ActionIcon>
              <ActionIcon title={"timer"}>
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
