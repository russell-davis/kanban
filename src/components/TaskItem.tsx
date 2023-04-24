import { api, RouterOutputs } from "~/utils/api";
import { ActionIcon, Text } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

export const TaskItem = (props: {
  task: RouterOutputs["kanban"]["tasks"][number]["tasks"][number];
}) => {
  const utils = api.useContext();
  const deleteTaskMutation = api.kanban.deleteTask.useMutation();

  return (
    <div className="min-h-24 flex w-full flex-1 justify-between rounded-lg bg-gray-200 p-1">
      <Text size={"sm"} weight={500}>
        {props.task.title}
      </Text>
      <ActionIcon
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          deleteTaskMutation.mutate(
            {
              taskId: props.task.id,
            },
            {
              onSuccess: () => {
                console.info("Task deleted");
                utils.kanban.tasks.refetch();
                utils.kanban.backlogTasks.refetch();
              },
            }
          );
        }}
      >
        <IconTrash color={"red"} />
      </ActionIcon>
    </div>
  );
};
