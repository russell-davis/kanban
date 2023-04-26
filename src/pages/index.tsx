import { type NextPage } from "next";
import Head from "next/head";
import { addDays, endOfDay, isSameDay, startOfDay, subDays } from "date-fns";
import { api, RouterOutputs } from "~/utils/api";
import { useEffect, useRef, useState } from "react";
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
import { ActionIcon, Text, TextInput } from "@mantine/core";
import { coordinateGetter } from "~/components/dndkit/multipleContainersKeyboardCoordinates";
import { Sortable } from "~/components/Sortable";
import { DayColumn } from "~/components/DayColumn";
import { IconCheck } from "@tabler/icons-react";
import { TaskItem } from "~/components/TaskItem";

function getNewPosition(
  dayTasks: RouterOutputs["kanban"]["tasks"][number],
  over: {
    date: Date;
    item: RouterOutputs["kanban"]["tasks"][number]["tasks"][number] | undefined;
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

const Home: NextPage = () => {
  const [startAt, setStartAt] = useState(subDays(startOfDay(new Date()), 3));
  const [endAt, setEndAt] = useState(addDays(endOfDay(new Date()), 7));
  const utils = api.useContext();
  const seedDb = api.kanban.seed.useMutation();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const createTaskMutation = api.kanban.create.useMutation();
  const updatePositionMutation = api.kanban.updatePosition.useMutation();
  const backlogTasksQuery = api.kanban.backlogTasks.useQuery();

  const tasksByDateQuery = api.kanban.tasks.useQuery(
    {
      startAt: startAt,
      endAt: endAt,
    },
    { refetchOnWindowFocus: false, refetchOnMount: false }
  );
  const getItemById = (id: string) => {
    let task = backlogTasksQuery.data?.find((t) => t.id === id);
    if (task) return task;
    task = tasksByDateQuery.data
      ?.flatMap((dt) => dt.tasks)
      .find((t) => t.id === id);
    return task;
  };
  const [tasksCopy, setTasksCopy] = useState<RouterOutputs["kanban"]["tasks"]>(
    []
  );
  const [activeDragItem, setActiveDragItem] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [clonedItems, setClonedItems] = useState<any>([]);
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
  const [scroll, setScroll] = useState({ x: 0, y: 0, percent: "0" });
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
      const { clientWidth, scrollLeft } = element;
      const visibleColumns = Math.floor(clientWidth / (columnWidth + padding));
      const leftmostVisibleIndex = Math.floor(
        scrollLeft / (columnWidth + padding)
      );
      return leftmostVisibleIndex;
    }

    const handleScroll = (event: any) => {
      if (!event.target) return;
      const percent = calculateHorizontalScrollPercent(event.target);
      if (percent < 10 || percent > 90) {
        // console.info({
        //   percent,
        //   initialScroll: scrolledToInitialPosition,
        // });
      }
      const leftMost = calculateLeftmostVisibleItem(event.target, 300, 16);
      console.info(`leftMost = ${leftMost}`);
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
  }, [scrollableRef, scrolledToInitialPosition]);
  useEffect(() => {
    if (
      !!tasksByDateQuery.data &&
      tasksByDateQuery.data.length > 0 &&
      !scrolledToInitialPosition
    ) {
      // find today's column
      const todayColumn = tasksByDateQuery.data.find((dt) =>
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
  }, [tasksByDateQuery.data, scrolledToInitialPosition]);

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
              className="flex flex-row space-x-2 overflow-x-hidden rounded-lg px-2 py-2"
            >
              <div className="BACKLOG min-w-[300px] bg-gray-800">
                <div className="flex grow flex-row justify-between p-2">
                  <Text size={"lg"} weight={500} color={"white"}>
                    Backlog
                  </Text>
                </div>
                <div className="flex grow flex-row items-center justify-between space-x-2 p-2">
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
                            await backlogTasksQuery.refetch();
                            setNewTaskTitle("");
                          },
                        }
                      );
                    }}
                  >
                    <IconCheck color={"green"} />
                  </ActionIcon>
                </div>
                <div className="flex grow flex-col space-y-2 p-2">
                  <SortableContext
                    items={backlogTasksQuery.data ?? []}
                    id={new Date(0).toISOString()}
                    strategy={verticalListSortingStrategy}
                  >
                    {backlogTasksQuery.data?.map((task) => (
                      <Sortable id={task.id} key={task.id} data={task}>
                        <TaskItem key={task.id} task={task} />
                      </Sortable>
                    ))}
                  </SortableContext>
                </div>
              </div>
              <div
                ref={scrollableRef}
                className="DATE_TASKS flex w-full overflow-x-scroll"
              >
                {tasksByDateQuery.data?.map((dt) => (
                  <DayColumn key={dt.date.toISOString()} dt={dt} />
                ))}
              </div>
              <div className="BACKLOG min-w-[300px] bg-gray-800">
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
    setTasksCopy(tasksByDateQuery.data ?? []);
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
      item: getItemById(event.over?.id as string),
    };

    if (over.containerId === "calendar") {
      // add to calendar list preview
      console.info(`scheduling ${event.active.id} for ${over.id}`);
      return;
    } else {
      console.info("over", over);
      const dayTasks = tasksByDateQuery.data?.find((dt) =>
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
  async function onDragEnd(event: DragEndEvent) {
    console.info("end", event);
    const direction = event.delta.y > 0 ? "down" : "up";
    const active = {
      id: event.active.id as string,
      date: new Date(event.active.data.current?.sortable.containerId),
      index: event.active.data.current?.sortable.index,
      item: getItemById(event.active.id as string),
    };
    const over = {
      id: event.over?.id as string,
      date: new Date(event.over?.data.current?.sortable.containerId),
      index: event.over?.data.current?.sortable.index,
      item: getItemById(event.over?.id as string),
    };
    if (!active.item) {
      return;
    }
    const overColumnId = event.over?.data.current?.sortable.containerId;
    const overColumnDate = new Date(overColumnId);
    const sameColumn =
      event.active.data.current?.sortable.containerId === overColumnId;

    const dayTasks = tasksByDateQuery.data?.find((dt) =>
      isSameDay(dt.date, overColumnDate)
    );
    if (!dayTasks) {
      return;
    }

    let newPosition = getNewPosition(dayTasks, over, direction);

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
        await backlogTasksQuery.refetch();
        await tasksByDateQuery.refetch();
      })
      .catch(async (err) => {
        console.error("ERR updatePositionMutation", err);
        await backlogTasksQuery.refetch();
        await tasksByDateQuery.refetch();
      });
    // utils.kanban.tasks.setData(
    //   {
    //     startAt,
    //     endAt,
    //   },
    //   (prev) => {
    //     if (!prev) {
    //       return prev;
    //     }
    //
    //     if (sameColumn) {
    //       return prev.map((dt) => {
    //         if (isSameDay(dt.date, active.date)) {
    //           return {
    //             ...dt,
    //             tasks: dt.tasks
    //               .map((task) => {
    //                 if (task.id === active.id) {
    //                   return {
    //                     ...task,
    //                     position: newPosition,
    //                     date: sameColumn ? task.date : overColumnDate,
    //                   };
    //                 }
    //                 return task;
    //               })
    //               .sort((a, b) => a.position - b.position),
    //           };
    //         }
    //         return dt;
    //       });
    //     } else {
    //       return prev.map((dt) => {
    //         if (isSameDay(dt.date, active.date)) {
    //           return {
    //             ...dt,
    //             tasks: dt.tasks.filter((task) => task.id !== active.id),
    //           };
    //         }
    //         if (isSameDay(dt.date, overColumnDate)) {
    //           return {
    //             ...dt,
    //             tasks: [
    //               ...dt.tasks,
    //               {
    //                 ...(active.item as any),
    //                 position: newPosition,
    //                 date: overColumnDate,
    //               },
    //             ].sort((a, b) => a.position - b.position),
    //           };
    //         }
    //         return dt;
    //       });
    //     }
    //   }
    // );

    // if the item came from the backlog, refresh the backlog list
    if (
      event.active.data.current?.sortable.containerId ===
      new Date(0).toISOString()
    ) {
      await backlogTasksQuery.refetch();
    }

    setActiveDragItem(null);
  }
  function onDragCancel(event: DragCancelEvent) {
    console.info("cancel");
    setActiveDragItem(null);
    setTasksCopy([]);
  }
};

export default Home;
