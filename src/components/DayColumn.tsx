import { RouterOutputs } from "~/utils/api";
import { Text } from "@mantine/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Sortable } from "~/components/Sortable";
import { TaskItem } from "~/components/TaskItem";
import { isSameDay } from "date-fns";

export const DayColumn = (props: {
  dt: RouterOutputs["kanban"]["tasks"][number];
}) => {
  const isToday = isSameDay(props.dt.date, new Date());
  return (
    <div
      className={`day_column ${
        isToday ? "is_today_column" : ""
      } flex h-full min-w-[300px] flex-1 bg-gray-800
      p-2`}
    >
      <div className="task_list flex w-full flex-col space-y-2 p-1">
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
          {props.dt.tasks.map((task) => (
            <div className="h-full w-full grow rounded-lg bg-gray-700 p-2">
              <Sortable id={task.id} key={task.id} data={task}>
                <TaskItem key={task.id} task={task} />
              </Sortable>
            </div>
          ))}
          {props.dt.tasks.length === 0 && (
            <div className="flex h-full w-full grow rounded-lg bg-gray-700">
              <Sortable id={props.dt.date.toISOString()} data={{}}>
                {" "}
              </Sortable>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
};
