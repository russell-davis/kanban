import { api, type RouterOutputs } from "~/utils/api";
import { ActionIcon, Text } from "@mantine/core";
import { IconCircleCheckFilled, IconEdit, IconTrash } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { format } from "date-fns";

export const TaskItem = (props: {
  task: RouterOutputs["kanban"]["tasks"]["tasksByDate"][number]["tasks"][number];
}) => {
  const utils = api.useContext();
  const deleteTaskMutation = api.kanban.deleteTask.useMutation();
  const toggleComplete = api.kanban.toggleCompleted.useMutation();

  return (
    <div
      className={`min-h-24 flex w-full flex-1 items-center justify-between rounded-lg bg-gray-200 p-1 ${
        props.task.completed ? "opacity-30" : ""
      }`}
    >
      <div className="flex flex-1 flex-row items-center space-x-2">
        <ActionIcon
          color={props.task.completed ? "green" : "gray"}
          className=""
          loading={toggleComplete.isLoading}
          disabled={toggleComplete.isLoading}
          onClick={(e) => {
            e.preventDefault();
            toggleComplete.mutate(
              {
                taskId: props.task.id,
                completed: !props.task.completed,
              },
              {
                onSuccess: async () => {
                  console.info(
                    `Task ${!props.task.completed ? "completed" : "uncompleted"}}`
                  );
                  await utils.kanban.tasks.refetch();
                },
              }
            );
          }}
        >
          <IconCircleCheckFilled size={28} />
        </ActionIcon>
        <div className="flex flex-col">
          <Text size={"sm"} weight={500}>
            {props.task.title}
          </Text>
          <Text size={"xs"}>{format(props.task.date, "h:mm aaa")}</Text>
        </div>
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
                      loading={toggleComplete.isLoading}
                      disabled={toggleComplete.isLoading}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleComplete.mutate(
                          {
                            taskId: props.task.id,
                            completed: !props.task.completed,
                          },
                          {
                            onSuccess: async () => {
                              console.info(
                                `Task ${
                                  !props.task.completed ? "completed" : "uncompleted"
                                }}`
                              );
                              await utils.kanban.tasks.refetch();
                            },
                          }
                        );
                      }}
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
          loading={deleteTaskMutation.isLoading}
          disabled={deleteTaskMutation.isLoading}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            deleteTaskMutation.mutate(
              {
                taskId: props.task.id,
              },
              {
                onSuccess: async () => {
                  console.info("Task deleted");
                  await utils.kanban.tasks.refetch();
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
