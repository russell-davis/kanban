import type { RouterOutputs } from "~/utils/api";
import { Text } from "@mantine/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Sortable } from "~/components/Sortable";
import { TaskItem } from "~/components/TaskItem";
import { isSameDay } from "date-fns";

export const DayColumn = (props: {
  dt: RouterOutputs["kanban"]["tasks"]["tasksByDate"][number];
}) => {
  const isToday = isSameDay(props.dt.date, new Date());
  return (
    <div
      className={`day_column flex h-full min-w-[300px] flex-1 bg-gray-800 p-2 ${
        isToday ? "is_today_column" : ""
      }`}
    >
      <div className="task_list flex w-full flex-col space-y-3 p-1">
        <div
          className={`${
            isToday ? "rounded border border-white  pl-2" : ""
          } p-1`}
        >
          <Text size={"md"} weight={500} color={"white"}>
            {props.dt.date.toLocaleDateString("en-US", {
              dateStyle: "medium",
            })}
          </Text>
        </div>
        <SortableContext
          items={props.dt.tasks}
          id={props.dt.date.toISOString()}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex h-full shrink flex-col space-y-2 rounded-lg bg-gray-700 p-2">
            {props.dt.tasks
              .sort((a, b) => {
                // Sort by completed then by priority
                if (a.completed && !b.completed) {
                  return 1;
                }
                if (!a.completed && b.completed) {
                  return -1;
                }
                if (a.position > b.position) {
                  return 1;
                }
                if (a.position < b.position) {
                  return -1;
                }
                return 0;
              })
              .map((task) => (
                <Sortable id={task.id} data={task} key={task.id}>
                  <TaskItem key={task.id} task={task} />
                </Sortable>
              ))}
            {props.dt.tasks.length === 0 && (
              <Sortable id={props.dt.date.toISOString()} data={{}}>
                {" "}
              </Sortable>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};
