import { api, RouterOutputs } from "~/utils/api";
import React, { useState } from "react";
import { ActionIcon, Button, Divider, Text, TextInput } from "@mantine/core";
import { startOfDay } from "date-fns";
import { IconCheck } from "@tabler/icons-react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Sortable } from "~/components/Sortable";
import { DRAGABLES } from "~/pages";
import { TaskCard } from "~/components/task/TaskCard";

export const Backlog = (props: {
  goToTodayClicked: () => void;
  tasksQueryData?: RouterOutputs["kanban"]["tasks"];
  dateRange: { startAt: Date; endAt: Date };
}) => {
  // newTitle state
  const [newTitle, setNewTitle] = useState("");

  // network
  const utils = api.useContext();
  const createTaskMutation = api.kanban.create.useMutation();

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
    <div className="BACKLOG h-full">
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
      <div className="BACKLOG_LIST flex flex-col overflow-y-auto">
        <div className="flex grow flex-col space-y-2 p-2">
          <SortableContext
            items={orderedTasks}
            id={"backlog"}
            strategy={verticalListSortingStrategy}
          >
            {orderedTasks.map((task) => (
              <Sortable key={task.id} id={task.id} data={task} type={DRAGABLES.BACKLOG}>
                <TaskCard key={task.id} task={task} dateRange={props.dateRange} />
              </Sortable>
            ))}

            {orderedTasks.length === 0 && (
              <Sortable id={"backlog"} data={{}} type={DRAGABLES.BACKLOG}>
                {" "}
              </Sortable>
            )}
          </SortableContext>
        </div>
      </div>
    </div>
  );
};
