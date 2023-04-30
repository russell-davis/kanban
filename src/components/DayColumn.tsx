import type { RouterOutputs } from "~/utils/api";
import { Text } from "@mantine/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Sortable } from "~/components/Sortable";
import { TaskItem } from "~/components/TaskItem";
import { isSameDay } from "date-fns";
import { classNames, DRAGABLES } from "~/pages";
import { useIntersection } from "@mantine/hooks";
import { useEffect } from "react";

export const DayColumn = (props: {
  dt: RouterOutputs["kanban"]["tasks"]["tasksByDate"][number];
  containerRef: { current: any };
  didBecomeVisible: () => void;
  didBecomeInvisible: () => void;
}) => {
  const { ref, entry } = useIntersection({
    root: props.containerRef.current,
    threshold: 0.7,
  });
  useEffect(() => {
    // several components will fire this method at the same time, but we only want it
    // to fire if the dt.date is the mindate of all the visible columns
    if (entry?.isIntersecting) {
      props.didBecomeVisible();
    } else {
      props.didBecomeInvisible();
    }
  }, [entry?.isIntersecting]);
  const isToday = isSameDay(props.dt.date, new Date());
  return (
    <div
      ref={ref}
      className={`DAY_COLUMN flex h-full min-w-[300px] flex-1 p-2 ${classNames(
        isToday ? "is_today_column" : ""
      )}`}
    >
      <div className={`DATE_TASK_LIST flex w-full flex-col space-y-3 p-1`}>
        <div className={`${isToday ? "rounded border border-white  pl-2" : ""} p-1`}>
          <Text size={"md"} weight={500} color={"white"}>
            {props.dt.date.toLocaleDateString("en-US", {
              dateStyle: "medium",
            })}
          </Text>
        </div>
        <div className="flex grow flex-col overflow-y-auto">
          <SortableContext
            items={props.dt.tasks}
            id={props.dt.date.toISOString()}
            strategy={verticalListSortingStrategy}
          >
            <div
              className={`flex h-full shrink flex-col space-y-2 rounded-lg p-2 ${classNames(
                entry?.isIntersecting ? "bg-green-400" : "bg-gray-700"
              )}`}
            >
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
                  <Sortable id={task.id} data={task} key={task.id} type={DRAGABLES.TASK}>
                    <TaskItem key={task.id} task={task} />
                  </Sortable>
                ))}
              {props.dt.tasks.length === 0 && (
                <Sortable
                  id={props.dt.date.toISOString()}
                  data={{}}
                  type={DRAGABLES.TASK}
                >
                  {" "}
                </Sortable>
              )}
            </div>
          </SortableContext>
        </div>
      </div>
    </div>
  );
};
