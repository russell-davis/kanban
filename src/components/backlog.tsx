import { api, RouterOutputs } from "~/utils/api";
import React, { useState } from "react";
import { ActionIcon, Button, Divider, Text, TextInput } from "@mantine/core";
import { startOfDay } from "date-fns";
import { IconCheck } from "@tabler/icons-react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Sortable } from "~/components/Sortable";
import { TaskCard } from "~/components/task/TaskCard";
import { DRAGABLES } from "~/pages/dashboard";
import { TaskData } from "~/server/api/root";
import { useSession } from "next-auth/react";
import { notifications } from "@mantine/notifications";

export const Backlog = (props: {
  goToTodayClicked: () => void;
  tasksQueryData?: RouterOutputs["kanban"]["tasks"];
  dateRange: { startAt: Date; endAt: Date };
  onEditTaskClicked: (task: TaskData) => void;
}) => {
  const session = useSession();
  // newTitle state
  const [newTitle, setNewTitle] = useState("");

  // network
  const utils = api.useContext();
  const createTaskMutation = api.task.create.useMutation({
    onMutate: async ({ title }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await utils.kanban.tasks.cancel();
      // Snapshot the previous value
      const previous = utils.kanban.tasks.getData(props.dateRange);
      // Optimistically update to the new value
      utils.kanban.tasks.setData(props.dateRange, (td) => {
        if (!td) return td;
        return {
          ...td,
          backlog: [
            ...td.backlog,
            {
              id: "optimistic",
              date: startOfDay(new Date(0)),
              backlog: true,
              completed: false,
              title: title,
              position: 0,
              createdAt: startOfDay(new Date()),
              updatedAt: startOfDay(new Date()),
              notes: "",
              userId: session.data?.user.id ?? "",
              subtasks: [],
              timeEntries: [],
              scheduledFor: null,
              channelId: "",
              channel: {
                id: "",
                name: "",
                userId: "",
                color: "",
                isDefault: false,
              },
            },
          ],
        };
      });
      // Return a context object with the snapshotted value
      return { previous };
    },
    onSuccess: async (data) => {
      // clear newTitle
      setNewTitle("");
      notifications.show({
        title: "Success",
        message: "Task created",
        autoClose: 2000,
        color: "green",
      });
    },
    onError: async (error, vars, ctx) => {
      // show error notification
      notifications.show({
        title: "Error",
        message: "Failed to create task",
        color: "red",
      });
      // rollback to previous value
      utils.kanban.tasks.setData(props.dateRange, ctx?.previous);
    },
    onSettled: async (data, error) => {
      // always refetch kanban tasks
      await utils.kanban.tasks.refetch();
    },
  });

  const orderedTasks =
    props.tasksQueryData?.backlog === undefined
      ? []
      : props.tasksQueryData?.backlog.sort((a, b) => {
          // order by incomplete before completed, then by updatedAt
          if (a.completed === b.completed) {
            if (a.updatedAt === b.updatedAt) {
              return 0;
            } else {
              return a.updatedAt > b.updatedAt ? 1 : -1;
            }
          } else {
            return a.completed ? 1 : -1;
          }
        });

  return (
    <div className="BACKLOG flex h-full flex-col">
      <div className="TITLE flex flex-row justify-between p-2">
        <Text size={"lg"} weight={500}>
          Backlog
        </Text>
        <Button compact onClick={props.goToTodayClicked}>
          Today
        </Button>
      </div>
      <div className="ACTIONS flex flex-row items-center justify-between space-x-2 p-2">
        <TextInput
          placeholder={"New task"}
          classNames={{
            root: "flex-grow",
          }}
          value={newTitle}
          disabled={createTaskMutation.isLoading}
          onChange={(event) => setNewTitle(event.currentTarget.value)}
        />
        <ActionIcon
          loading={createTaskMutation.isLoading}
          disabled={createTaskMutation.isLoading}
          onClick={async () => {
            if (newTitle.length === 0) return;
            await createTaskMutation.mutateAsync(
              {
                title: newTitle,
                date: startOfDay(new Date(0)),
              },
              {
                onSuccess: async () => {
                  await utils.kanban.tasks.refetch();
                  setNewTitle("");
                },
              }
            );
          }}
        >
          <IconCheck color={"green"} />
        </ActionIcon>
      </div>
      <Divider className={"m-2"} />
      <div className="BACKLOG_LIST flex h-full flex-col overflow-y-auto">
        <div className="flex grow flex-col space-y-2 p-2">
          <SortableContext
            items={orderedTasks}
            id={"backlog"}
            strategy={verticalListSortingStrategy}
          >
            {orderedTasks.map((task) => (
              <Sortable key={task.id} id={task.id} data={task} type={DRAGABLES.BACKLOG}>
                <TaskCard
                  key={task.id}
                  task={task}
                  dateRange={props.dateRange}
                  onEditTaskClicked={(task) => {
                    props.onEditTaskClicked(task);
                  }}
                />
              </Sortable>
            ))}

            {orderedTasks.length === 0 && (
              <Sortable
                id={"backlog"}
                data={{
                  id: "backlog-empty-0",
                }}
                type={DRAGABLES.BACKLOG}
              >
                {" "}
              </Sortable>
            )}
          </SortableContext>
        </div>
      </div>
    </div>
  );
};
