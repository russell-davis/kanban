import type { RouterOutputs } from "~/utils/api";
import { ActionIcon, Group, Text } from "@mantine/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Sortable } from "~/components/Sortable";
import { isSameDay } from "date-fns";
import { DRAGABLES } from "~/pages";
import { classNames } from "~/lib/classNames";
import { useIntersection } from "@mantine/hooks";
import { useEffect } from "react";
import { TaskCard } from "~/components/task/TaskCard";
import { IconDots } from "@tabler/icons-react";

export const DayColumn = (props: {
  dt: RouterOutputs["kanban"]["tasks"]["tasksByDate"][number];
  containerRef: { current: any };
  isCurrentCalendarDate: boolean;
  didBecomeVisible: () => void;
  didBecomeInvisible: () => void;
  dateRange: { startAt: Date; endAt: Date };
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
      className={classNames(
        `DAY_COLUMN flex h-full min-w-[300px] flex-1 p-2`,
        isToday ? "is_today_column" : ""
      )}
    >
      <div className={`DATE_TASK_LIST flex w-full flex-col space-y-3 p-1`}>
        <Group position={"apart"} align={"center"}>
          <div className={classNames(`p-1`, isToday ? "underline" : "")}>
            <Text size={"md"} weight={500}>
              {props.dt.date.toLocaleDateString("en-US", {
                dateStyle: "medium",
              })}
            </Text>
          </div>
          <ActionIcon>
            <IconDots size={20} />
          </ActionIcon>
          {/*<Button compact variant={"outline"}>*/}
          {/*  Details*/}
          {/*</Button>*/}
        </Group>
        <div className="flex grow flex-col overflow-y-auto">
          <SortableContext
            items={props.dt.tasks}
            id={props.dt.date.toISOString()}
            strategy={verticalListSortingStrategy}
          >
            <div
              className={`flex h-full flex-col space-y-2 rounded-lg p-2 ${classNames(
                // entry?.isIntersecting ? "bg-green-400" :
                "bg-gray-700",
                props.isCurrentCalendarDate
                  ? "rounded-lg border-2 border-solid border-white"
                  : ""
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
                    <TaskCard task={task} dateRange={props.dateRange} />
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
