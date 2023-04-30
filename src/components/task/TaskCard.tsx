import { FC, useState } from "react";
import { Subtask, Task } from "@prisma/client";
import { ActionIcon, Card, Group, Stack, Text } from "@mantine/core";
import { useDraggable } from "@dnd-kit/core";
import { DRAGABLES } from "~/pages";
import { IconCalendar, IconCircleCheck, IconClock } from "@tabler/icons-react";

export const TaskCard: FC<{
  task: Task & { subtasks: Subtask[] };
}> = ({ task }) => {
  const { setNodeRef, attributes, listeners } = useDraggable({
    id: task.id,
    data: {
      type: DRAGABLES.TASK,
      task: task,
    },
  });
  const [timerOpen, setTimerOpen] = useState<boolean>(false);

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
            <Group>
              <div className="timer">timer</div>
            </Group>
          )}
        </Stack>
      </Card.Section>
    </Card>
  );
};
