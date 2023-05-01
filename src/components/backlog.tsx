import { api, RouterOutputs } from "~/utils/api";
import React, { useState } from "react";
import { ActionIcon, Button, Text, TextInput } from "@mantine/core";
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

  return (
    <div className="BACKLOG flex min-w-[300px] max-w-[300px] flex-col bg-gray-800">
      <div className="TITLE flex flex-row justify-between p-2">
        <Text size={"lg"} weight={500} color={"white"}>
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
      <div className="BACKLOG_LIST flex flex-col overflow-y-auto">
        <div className="flex grow flex-col space-y-2 p-2">
          <SortableContext
            items={props.tasksQueryData?.backlog ?? []}
            id={"backlog"}
            strategy={verticalListSortingStrategy}
          >
            {props.tasksQueryData?.backlog.map((task) => (
              <TaskCard key={task.id} task={task} dateRange={props.dateRange} />
            ))}

            {props.tasksQueryData?.backlog.length === 0 && (
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
