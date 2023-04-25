import { api, RouterOutputs } from "~/utils/api";
import { ActionIcon, Text } from "@mantine/core";
import {
  IconCheck,
  IconCircleCheckFilled,
  IconEdit,
  IconTrash,
} from "@tabler/icons-react";
import { modals } from "@mantine/modals";

export const TaskItem = (props: {
  task: RouterOutputs["kanban"]["tasks"][number]["tasks"][number];
}) => {
  const utils = api.useContext();
  const deleteTaskMutation = api.kanban.deleteTask.useMutation();

  return (
    <div className="min-h-24 flex w-full flex-1 items-center justify-between rounded-lg bg-gray-200 p-1">
      <div className="flex flex-1 flex-row items-center space-x-2">
        <ActionIcon
          color={props.task.completed ? "green" : "gray"}
          className=""
        >
          <IconCircleCheckFilled size={28} />
        </ActionIcon>
        <Text size={"sm"} weight={500}>
          {props.task.title}
        </Text>
      </div>
      <div className="flex flex-row">
        <ActionIcon
          onClick={(e) => {
            e.preventDefault();
            console.info("Edit task");
            modals.open({
              modalId: "edit-task",
              title: (
                <Text weight={"600"} size={"lg"}>
                  Edit Task
                </Text>
              ),
              centered: true,
              size: "lg",
              children: (
                <div className="flex flex-col">
                  <div className="flex w-full flex-row items-start justify-between">
                    <div className="flex flex-col justify-between">
                      <Text weight={600} size={"xl"}>
                        {props.task.title}
                      </Text>
                      <Text size={"xs"} className="text-gray-800">
                        ID: {props.task.id}
                      </Text>
                    </div>
                    <ActionIcon
                      color={props.task.completed ? "green" : "gray"}
                      className="mt-2"
                    >
                      <IconCircleCheckFilled size={28} />
                    </ActionIcon>
                  </div>
                </div>
              ),
              classNames: {
                header: "bg-gray-300",
                body: "bg-gray-300 h-48",
              },
            });
          }}
        >
          <IconEdit color={"blue"} size={20} />
        </ActionIcon>

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
          <IconTrash color={"red"} size={20} />
        </ActionIcon>
      </div>
    </div>
  );
};
