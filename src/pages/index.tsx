import { type NextPage } from "next";
import Head from "next/head";
import { addDays, endOfDay, isSameDay, startOfDay, subDays } from "date-fns";
import { api, type RouterOutputs } from "~/utils/api";
import React, { useEffect, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ActionIcon, Button, Text, TextInput } from "@mantine/core";
import { coordinateGetter } from "~/components/dndkit/multipleContainersKeyboardCoordinates";
import { Sortable } from "~/components/Sortable";
import { DayColumn } from "~/components/DayColumn";
import { IconCheck } from "@tabler/icons-react";
import { TaskItem } from "~/components/TaskItem";

const Home: NextPage = () => {
  const [startAt, setStartAt] = useState(subDays(startOfDay(new Date()), 3));
  const [endAt, setEndAt] = useState(addDays(endOfDay(new Date()), 7));
  const utils = api.useContext();
  // const seedDb = api.kanban.seed.useMutation();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const createTaskMutation = api.kanban.create.useMutation();
  const updatePositionMutation = api.kanban.updatePosition.useMutation();
  // const backlogTasksQuery = api.kanban.backlogTasks.useQuery();
  const tasksQuery = api.kanban.tasks.useQuery(
    {
      startAt: startAt,
      endAt: endAt,
    },
    { refetchOnWindowFocus: false, refetchOnMount: false }
  );
  const [activeDragItem, setActiveDragItem] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter,
    })
  );
  const scrollableRef = useRef<any>(null);

  const [scrolledToInitialPosition, setScrolledToInitialPosition] =
    useState(false);
  useEffect(() => {
    function calculateHorizontalScrollPercent(element: any) {
      const { scrollWidth, clientWidth, scrollLeft } = element;
      const maxScrollLeft = scrollWidth - clientWidth;
      const percentScrolled = (scrollLeft / maxScrollLeft) * 100;
      // round to 2 decimal places
      return Math.round(percentScrolled * 100) / 100;
    }
    function calculateLeftmostVisibleItem(
      element: any,
      columnWidth: number,
      padding: number
    ) {
      const { scrollLeft } = element;
      const leftmostVisibleIndex = Math.floor(
        scrollLeft / (columnWidth + padding)
      );
      return leftmostVisibleIndex;
    }

    const handleScroll = (event: any) => {
      if (!event.target) return;
      const percent = calculateHorizontalScrollPercent(event.target);
      console.info("percent = ", percent);
      if (!!activeDragItem) {
        return;
      }
      if (percent < 10 || percent > 90) {
        // console.info({
        //   percent,
        //   initialScroll: scrolledToInitialPosition,
        // });
      }
      const leftMost = calculateLeftmostVisibleItem(event.target, 300, 16);
      const day = tasksQuery.data?.tasksByDate.at(leftMost);
      if (day) {
        // console.info(`day = ${day.date}`);
      }
      // // if percent < 0.1, fetch previous week
      // if (percent < 0.1) {
      //   setStartAt(subDays(startAt, 7));
      //   return;
      // }
      // // if percent > 0.9, fetch next week
      // if (percent > 0.9) {
      //   setStartAt(addDays(startAt, 7));
      //   return;
      // }
    };

    const myElement = scrollableRef.current;
    if (myElement) {
      myElement.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (myElement) {
        myElement.removeEventListener("scroll", handleScroll);
      }
    };
  }, [scrollableRef, tasksQuery.data?.tasksByDate]);
  const scrollToToday = () => setScrolledToInitialPosition(false);
  useEffect(() => {
    if (
      !!tasksQuery.data &&
      tasksQuery.data.tasksByDate.length > 0 &&
      !scrolledToInitialPosition
    ) {
      // find today's column
      const todayColumn = tasksQuery.data.tasksByDate.find((dt) =>
        isSameDay(dt.date, new Date())
      );
      if (todayColumn) {
        console.info("scrolling to today's column");
        // scroll to today's column
        const element = document.querySelector(".is_today_column");
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            inline: "start",
          });
          setScrolledToInitialPosition(true);
        }
      }
    }
  }, [tasksQuery.data, scrolledToInitialPosition]);

  return (
    <>
      <Head>
        <title>Kanban!</title>
      </Head>
      <main className="flex h-screen flex-col bg-gray-900">
        <div className="flex flex-col-reverse px-2 text-white">
          {/*<Text>*/}
          {/*  Scroll position x: {scroll.x}, y: {scroll.y} percent:{" "}*/}
          {/*  {scroll.percent}*/}
          {/*</Text>*/}
        </div>
        <div className="py-18 flex flex-1">
          <DndContext
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDragCancel={onDragCancel}
            collisionDetection={closestCenter}
            sensors={sensors}
            measuring={{
              droppable: {
                strategy: MeasuringStrategy.Always,
              },
            }}
          >
            <div
              id="task-list"
              className="flex h-screen flex-row space-x-2 overflow-x-hidden rounded-lg px-2 py-2"
            >
              <div className="BACKLOG flex min-w-[300px] flex-col bg-gray-800">
                <div className="TITLE flex flex-row justify-between p-2">
                  <Text size={"lg"} weight={500} color={"white"}>
                    Backlog
                  </Text>
                  <Button
                    compact
                    onClick={() => {
                      scrollToToday();
                    }}
                  >
                    Today
                  </Button>
                </div>
                <div className="ACTIONS flex flex-row items-center justify-between space-x-2 p-2">
                  <TextInput
                    placeholder={"New task"}
                    classNames={{
                      root: "flex-grow",
                    }}
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.currentTarget.value)}
                  />
                  <ActionIcon
                    loading={createTaskMutation.isLoading}
                    onClick={() => {
                      if (newTaskTitle.length === 0) return;
                      createTaskMutation.mutate(
                        {
                          title: newTaskTitle,
                          date: new Date(0),
                        },
                        {
                          onSuccess: async () => {
                            await tasksQuery.refetch();
                            setNewTaskTitle("");
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
                      items={tasksQuery.data?.backlog ?? []}
                      id={"backlog"}
                      strategy={verticalListSortingStrategy}
                    >
                      {tasksQuery.data?.backlog.map((task) => (
                        <Sortable id={task.id} key={task.id} data={task}>
                          <TaskItem key={task.id} task={task} />
                        </Sortable>
                      ))}

                      {tasksQuery.data?.backlog.length === 0 && (
                        <Sortable id={"backlog"} data={{}}>
                          {" "}
                        </Sortable>
                      )}
                    </SortableContext>
                  </div>
                </div>
              </div>

              <div
                className="DAYS flex w-full grow flex-col overflow-x-scroll"
                ref={scrollableRef}
              >
                <div className="DATE_TASKS flex h-full w-full">
                  {tasksQuery.data?.tasksByDate.map((dt) => (
                    <DayColumn key={dt.date.toISOString()} dt={dt} />
                  ))}
                </div>
              </div>
              <div className="CALENDAR min-w-[300px] overflow-y-scroll bg-gray-800">
                <div className="flex grow flex-row justify-between p-2">
                  <Text size={"lg"} weight={500} color={"white"}>
                    Calendar
                  </Text>
                </div>
                <div className="flex grow flex-col p-2">
                  <SortableContext
                    items={[]}
                    id={"calendar"}
                    strategy={verticalListSortingStrategy}
                  >
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div key={i} className="h-12">
                        <Sortable id={`hour-${i}`} data={{}}>
                          <Text
                            size={"xs"}
                            weight={600}
                            className="text-stone-300"
                          >
                            {i === 0
                              ? "12 am"
                              : i < 12
                              ? `${i} am`
                              : i === 12
                              ? "12 pm"
                              : `${i - 12} pm`}
                          </Text>
                        </Sortable>
                      </div>
                    ))}
                  </SortableContext>
                </div>
              </div>
            </div>
            <DragOverlay>
              {activeDragItem ? (
                <div
                  className="min-h-96 w-full grow rounded-lg bg-gray-200"
                  key={activeDragItem.id}
                >
                  <p>{activeDragItem.title}</p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </main>
    </>
  );

  function onDragStart(event: DragStartEvent) {
    console.info("start");
    setActiveDragItem({
      id: event.active.id as string,
      title: event.active.data.current?.title,
    });
    // setTasksCopy(tasksQuery.data?.tasksByDate ?? []);
  }
  function onDragOver(event: DragOverEvent) {
    // update the index of the item being dragged
    const direction = event.delta.y > 0 ? "down" : "up";
    const sameCol =
      event.active.data.current?.sortable.containerId ===
        event.over?.data.current?.sortable.containerId &&
      event.active.data.current?.sortable.containerId !== undefined &&
      event.over?.data.current?.sortable.containerId !== undefined;
    const over = {
      id: event.over?.id as string,
      containerId: event.over?.data.current?.sortable.containerId,
      date: new Date(event.over?.data.current?.sortable.containerId),
      index: event.over?.data.current?.sortable.index,
      item: getItemById(event.over?.id as string, tasksQuery.data),
    };

    if (over.containerId === "calendar") {
      // add to calendar list preview
      return;
    } else {
      console.info("over", over);
      const dayTasks = tasksQuery.data?.tasksByDate.find((dt) =>
        isSameDay(dt.date, over.date)
      );
      if (!dayTasks) {
        return;
      }

      const newPosition = getNewPosition(dayTasks, over, direction);
      // if in the same column, just update the index
      if (sameCol) {
        console.info(`moving ${event.active.id} to ${newPosition} in same col`);
      }
      // if in a different column, remove from old column and add to new column
      else {
        console.info(
          `moving ${event.active.id} to ${newPosition} in ${over.date}`
        );
      }
    }
  }
  function onDragEnd(event: DragEndEvent) {
    console.info("end", event);
    const direction = event.delta.y > 0 ? "down" : "up";
    const active = {
      id: event.active.id as string,
      date: new Date(event.active.data.current?.sortable.containerId),
      index: event.active.data.current?.sortable.index,
      item: getItemById(event.active.id as string, tasksQuery.data),
    };
    const over = {
      id: event.over?.id as string,
      date: new Date(event.over?.data.current?.sortable.containerId),
      index: event.over?.data.current?.sortable.index,
      item: getItemById(event.over?.id as string, tasksQuery.data),
    };
    if (!active.item) {
      return;
    }
    const overColumnId = event.over?.data.current?.sortable.containerId;
    const overColumnDate = new Date(overColumnId);
    const sameColumn =
      event.active.data.current?.sortable.containerId === overColumnId;

    if (overColumnId === "backlog") {
      // add to backlog
      console.info("add to backlog");

      // update the position of the dragged item
      updatePositionMutation
        .mutateAsync({
          taskId: active.id,
          date: new Date(0),
          position: 1,
          backlog: true,
        })
        .then(async (res) => {
          console.info("updatePositionMutation", res);
        })
        .catch(async (err) => {
          console.error("ERR updatePositionMutation", err);
        })
        .finally(async () => {
          await tasksQuery.refetch();
        });
    } else if (overColumnId === "calendar") {
      // add to calendar
      console.info(`scheduling ${event.active.id} for ${over.id}`);
    } else {
      const dayTasks = tasksQuery.data?.tasksByDate.find((dt) =>
        isSameDay(dt.date, overColumnDate)
      );
      if (!dayTasks) {
        return;
      }

      const newPosition = getNewPosition(dayTasks, over, direction);

      console.info("new position", newPosition);

      // update the position of the dragged item
      updatePositionMutation
        .mutateAsync({
          taskId: active.id,
          date: overColumnDate,
          position: newPosition,
        })
        .then(async (res) => {
          console.info("updatePositionMutation", res);
        })
        .catch(async (err) => {
          console.error("ERR updatePositionMutation", err);
        })
        .finally(async () => {
          await tasksQuery.refetch();
        });
    }

    setActiveDragItem(null);
  }
  function onDragCancel(event: DragCancelEvent) {
    console.info("cancel");
    setActiveDragItem(null);
    // setTasksCopy([]);
  }
};

export default Home;

const getItemById = (
  id: string,
  tasks: RouterOutputs["kanban"]["tasks"] | undefined
) => {
  let task = tasks?.backlog.find((t) => t.id === id);
  if (task) return task;
  task = tasks?.tasksByDate?.flatMap((dt) => dt.tasks).find((t) => t.id === id);
  return task;
};
function getNewPosition(
  dayTasks: RouterOutputs["kanban"]["tasks"]["tasksByDate"][number],
  over: {
    date: Date;
    item:
      | RouterOutputs["kanban"]["tasks"]["tasksByDate"][number]["tasks"][number]
      | undefined;
    index: any;
    id: string;
  },
  direction: string
) {
  let newPosition = -1;

  // is empty column
  if (dayTasks.tasks.length === 0) {
    newPosition = 1;
  }
  // is first item
  else if (over.index === 0 && dayTasks.tasks.length > 0) {
    if (dayTasks.tasks.length === 1) {
      newPosition = 2;
    } else {
      const firstItem = dayTasks.tasks[0];
      newPosition = firstItem ? firstItem.position / 2 : 0;
      console.info(
        `newPosition = firstItem.position / 2 \n ${newPosition} = ${firstItem?.position} / 2`
      );
    }
  }
  // is last item
  else if (
    over.index === dayTasks.tasks.length - 1 &&
    dayTasks.tasks.length > 0
  ) {
    const lastItem = dayTasks.tasks[dayTasks.tasks.length - 1];
    newPosition = lastItem ? lastItem.position + 1 : 0;
    console.info(
      `newPosition = lastItem ? lastItem.position + 1 : 0 \n ${newPosition} = ${
        lastItem ? lastItem.position + 1 : 0
      }`
    );
  }
  // is in the middle
  else {
    const prevItem = dayTasks.tasks[over.index - 1];
    const nextItem = dayTasks.tasks[over.index + 1];

    if (!!prevItem && !!nextItem) {
      if (direction === "down") {
        newPosition =
          ((over.item ? over.item.position : 0) + nextItem.position) / 2;
      } else {
        newPosition =
          (prevItem.position + (over.item ? over.item.position : 0)) / 2;
      }
    }
  }
  return newPosition;
}
