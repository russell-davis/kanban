import { type NextPage } from "next";
import Head from "next/head";
import { addDays, endOfDay, isSameDay, setHours, startOfDay, subDays } from "date-fns";
import { api, type RouterOutputs } from "~/utils/api";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  type DragCancelEvent,
  type DragEndEvent,
  DragMoveEvent,
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
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Text } from "@mantine/core";
import { coordinateGetter } from "~/components/dndkit/multipleContainersKeyboardCoordinates";
import { Sortable } from "~/components/Sortable";
import { DayColumn } from "~/components/DayColumn";
import { type Task } from "@prisma/client";
import { Backlog } from "~/components/backlog";

const Home: NextPage = () => {
  const [startAt, setStartAt] = useState(subDays(startOfDay(new Date()), 3));
  const [endAt, setEndAt] = useState(addDays(endOfDay(new Date()), 7));
  const [activeDragItem, setActiveDragItem] = useState<
    RouterOutputs["kanban"]["tasks"]["backlog"][number] | undefined
  >(undefined);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(startOfDay(new Date()));

  const scrollableRef = useRef<any>(null);
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });
  const [scrolledToInitialPosition, setScrolledToInitialPosition] = useState(false);
  const scrollToToday = () => setScrolledToInitialPosition(false);

  const utils = api.useContext();
  const updatePositionMutation = api.kanban.updatePosition.useMutation();
  const tasksQuery = api.kanban.tasks.useQuery(
    {
      startAt: startAt,
      endAt: endAt,
    },
    { refetchOnWindowFocus: false, refetchOnMount: false }
  );

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

      const leftmostVisibleIndex = Math.floor(scrollLeft / (columnWidth + padding));
      return leftmostVisibleIndex;
    }

    const handleScroll = (event: any) => {
      if (!event.target) return;
      if (!!activeDragItem) {
        // prevent scrolling while dragging
        event.target.scrollLeft = scrollPosition.x;
        return;
      }
      const percent = calculateHorizontalScrollPercent(event.target);
      console.info("percent = ", percent);
      if (percent < 10 || percent > 90) {
        // console.info({
        //   percent,
        //   initialScroll: scrolledToInitialPosition,
        // });
      }
      const leftMost = calculateLeftmostVisibleItem(event.target, 300, 0);
      const day = tasksQuery.data?.tasksByDate.at(leftMost);
      if (day) {
        console.info(`day = ${day.date}`);
        setCurrentCalendarDate(day.date);
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
  }, [scrollableRef, tasksQuery.data?.tasksByDate, activeDragItem]);
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

  // useMemo to compute the tasks that do not have a default date (start of the day) for the current day
  const calendarTasks = useMemo(() => {
    if (!tasksQuery.data?.tasksByDate) {
      return [];
    }
    const todayColumn = tasksQuery.data.tasksByDate.find((dt) =>
      isSameDay(dt.date, currentCalendarDate)
    );
    if (!todayColumn) {
      return [];
    }
    const scheduledTasks = todayColumn.tasks.filter((t) => {
      return t.scheduledFor !== null;
    });

    // create an ordered array of { hour, tasks } objects even if the hour has no tasks. this will be used to render the calendar
    const hours = Array.from({ length: 24 }, (_, i) => i).map((hour) => {
      const tasks = scheduledTasks.filter((t) => t.scheduledFor?.getHours() === hour);
      return {
        id: hour,
        hour,
        tasks,
      };
    });

    return hours;
  }, [tasksQuery.data?.tasksByDate, currentCalendarDate]);

  return (
    <>
      <Head>
        <title>Kanban!</title>
      </Head>
      <main className="flex h-screen flex-col bg-gray-900">
        <div className="flex flex-col-reverse px-2 text-white"></div>
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
              <Backlog
                goToTodayClicked={() => {
                  scrollToToday();
                }}
                tasksQueryData={tasksQuery.data}
              />

              <div
                className={`DAYS flex w-full grow flex-col
                ${activeDragItem ? "scroll- overflow-x-hidden" : "overflow-x-scroll"}
                `}
                ref={scrollableRef}
              >
                <div className="DATE_TASKS flex h-full w-full">
                  {tasksQuery.data?.tasksByDate.map((dt) => (
                    <DayColumn key={dt.date.toISOString()} dt={dt} />
                  ))}
                </div>
              </div>
              <div className="CALENDAR min-w-[300px] overflow-y-scroll bg-gray-800">
                <div className="flex grow flex-col p-2">
                  <Text size={"xl"} weight={500} color={"white"}>
                    {currentCalendarDate.toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                </div>
                <div className="flex grow flex-col p-2">
                  <SortableContext
                    items={calendarTasks}
                    id={"calendar"}
                    strategy={verticalListSortingStrategy}
                  >
                    {calendarTasks.map((ct, i) => (
                      <div key={i} className="h-12">
                        <Sortable
                          id={`hour-${ct.id}`}
                          data={{
                            draggable: false,
                          }}
                        >
                          <div className="relative">
                            <div className="absolute left-0 top-0">
                              <Text size={"xs"} weight={600} className="text-stone-300">
                                {i === 0
                                  ? "12 am"
                                  : i < 12
                                  ? `${i} am`
                                  : i === 12
                                  ? "12 pm"
                                  : `${i - 12} pm`}
                              </Text>
                            </div>
                          </div>
                          <div className="flex flex-col">
                            {ct.tasks.map((t) => (
                              <Sortable id={`agenda-${t.id}`} data={t} key={t.id}>
                                <div className="flex flex-row pl-10">
                                  <div className="flex flex-col items-start space-y-2 rounded bg-white px-2">
                                    <Text color={"black"} transform={"none"}>
                                      {t.title}
                                    </Text>
                                    <Text color={"black"} size={9}>
                                      {t.scheduledFor?.toLocaleTimeString(undefined, {
                                        hour: "numeric",
                                        minute: "numeric",
                                        hour12: true,
                                      })}
                                    </Text>
                                  </div>
                                </div>
                              </Sortable>
                            ))}
                          </div>
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

  function shadowMoveToBacklog(task: Task) {
    let list = utils.kanban.tasks.getData({
      startAt: startAt,
      endAt: endAt,
    });

    if (!list) return;

    list = {
      ...list,
      backlog: list.backlog.concat({
        ...task,
        date: new Date(0),
        backlog: true,
        position: 1,
        scheduledFor: null,
      }),
      tasksByDate: list.tasksByDate.map((dt) => {
        if (!isSameDay(dt.date, task.date)) {
          return dt;
        }
        console.info(`Removing task ${task.id} from ${dt.date.toISOString()}`);
        return {
          ...dt,
          tasks: dt.tasks.filter((t) => t.id !== task.id),
        };
      }),
    };

    // set locally
    utils.kanban.tasks.setData(
      {
        startAt: startAt,
        endAt: endAt,
      },
      list
    );
  }
  function shadowMoveToDay(task: Task, date: Date, position: number) {
    let list = utils.kanban.tasks.getData({
      startAt: startAt,
      endAt: endAt,
    });

    if (!list) return;

    list = {
      ...list,
      // make sure task is not in backlog
      backlog: list.backlog.filter((t) => t.id !== task.id),
      // add task to day
      tasksByDate: list.tasksByDate
        .map((dt) => {
          // remove task from old day (task.date)
          if (!isSameDay(dt.date, task.date)) {
            return {
              ...dt,
              tasks: dt.tasks.filter((t) => t.id !== task.id),
            };
          }
          return {
            ...dt,
            tasks: dt.tasks.filter((t) => t.id !== task.id),
          };
        })
        .map((dt) => {
          // add task to new day (date)
          if (!isSameDay(dt.date, date)) {
            return dt;
          }
          const movingToDifferentDay = !isSameDay(task.date, date);
          return {
            ...dt,
            tasks: dt.tasks.concat({
              ...task,
              date: date,
              backlog: false,
              position: position,
              scheduledFor: movingToDifferentDay ? null : task.scheduledFor,
            }),
          };
        }),
    };

    // set locally
    utils.kanban.tasks.setData(
      {
        startAt: startAt,
        endAt: endAt,
      },
      list
    );
  }
  function shadowMoveToHour(task: Task, hour: number, currentCalendarDate: Date) {
    const newDate = setHours(currentCalendarDate, hour);
    let list = utils.kanban.tasks.getData({
      startAt: startAt,
      endAt: endAt,
    });

    if (!list) return;

    list = {
      ...list,
      // make sure task is not in backlog
      backlog: list.backlog.filter((t) => t.id !== task.id),
      // add task to day to task.date, then set scheduledFor to date
      tasksByDate: list.tasksByDate.map((dt) => {
        if (!isSameDay(dt.date, task.date)) {
          return {
            ...dt,
            tasks: dt.tasks.filter((t) => t.id !== task.id),
          };
        }
        return {
          ...dt,
          tasks: dt.tasks.map((t) => {
            if (t.id !== task.id) {
              return t;
            }
            const newDate = setHours(currentCalendarDate, hour);
            return {
              ...t,
              date: startOfDay(currentCalendarDate),
              scheduledFor: newDate,
              backlog: false,
            };
          }),
        };
      }),
    };

    // set locally
    utils.kanban.tasks.setData(
      {
        startAt: startAt,
        endAt: endAt,
      },
      list
    );
  }
  async function moveToBacklog(task: Task) {
    await updatePositionMutation.mutateAsync(
      {
        taskId: task.id,
        date: new Date(0),
        backlog: true,
        position: 1,
        scheduledFor: null,
      },
      {
        onSuccess: async () => {
          await tasksQuery.refetch();
        },
      }
    );
  }
  async function moveToDay(task: Task, date: Date, position: number) {
    // if the task is being moved from to a different day, we need to update the position and reset the scheduledFor
    const movingToDifferentDay =
      !isSameDay(task.date, date) &&
      // is not midnight
      task.scheduledFor &&
      task.scheduledFor.getHours() !== 0;
    await updatePositionMutation.mutateAsync(
      {
        taskId: task.id,
        date: date,
        backlog: false,
        position: position,
        scheduledFor: movingToDifferentDay ? date : task.scheduledFor,
      },
      {
        onSuccess: async () => {
          await tasksQuery.refetch();
        },
      }
    );
  }
  async function moveToHour(task: Task, hour: number, currentCalendarDate: Date) {
    const newDate = setHours(currentCalendarDate, hour);
    await updatePositionMutation.mutateAsync(
      {
        taskId: task.id,
        date: startOfDay(currentCalendarDate),
        scheduledFor: newDate,
        backlog: false,
        position: task.position,
      },
      {
        onSuccess: async () => {
          await tasksQuery.refetch();
        },
      }
    );
  }
  async function handleBacklogDrop(
    active: { date: Date; item?: Task; index: any; id: string },
    over: { date: any; item?: Task; index: any; id: any }
  ) {
    if (!active.item) return;

    // add to backlog
    console.info("add to backlog");

    // update the position of the dragged item
    await moveToBacklog(active.item);
  }
  async function handleCalendarDrop(
    active: { date: Date; item?: Task; index: any; id: string },
    over: { date: any; item?: Task; index: any; id: any }
  ) {
    if (!active.item) return;
    // if over self, ignore
    if (active.id === over.id) {
      return;
    }
    // add to calendar
    console.info(`scheduling ${active.id} for ${over.id}`);
    const hour = parseInt(over.id); // will be 0-23, use this to set the date
    await moveToHour(active.item, hour, currentCalendarDate);
    console.info("hour", hour);
  }
  async function handleDayDrop(
    active: { date: Date; item?: Task; index: any; id: string },
    over: { date: Date; item?: Task; index: any; id: string },
    direction: "up" | "down",
    sameColumn: boolean
  ) {
    const dayTasks = tasksQuery.data?.tasksByDate.find((dt) =>
      isSameDay(dt.date, over.date)
    );
    if (!dayTasks) {
      return;
    }

    if (!over) return;
    const newPosition = getNewPosition(dayTasks, over, direction);

    // if in the same column, just update the index
    if (sameColumn) {
      console.info(`moving ${active.id} to ${newPosition} in same col`);
    }
    // if in a different column, remove from old column and add to new column
    else {
      console.info(`moving ${active.id} to ${newPosition} in ${over.date}`);
    }

    if (!active.item) return;

    await moveToDay(active.item, over.date, newPosition);
  }

  function onDragStart(event: DragStartEvent) {
    console.info("start");
    const item = getItemById(event.active.id as string, tasksQuery.data);
    setActiveDragItem(item);
    const scrollPosition = getScrollPosition(scrollableRef.current);
    setScrollPosition(scrollPosition);
  }
  function onDragOver(event: DragOverEvent) {
    // update the index of the item being dragged
    const direction = getDirection(event);
    const sameCol = isSameColumn(event);
    const active = getActive(event);
    const over = getOver(event);

    if (!active.item) {
      return;
    }

    if (over.containerId === "backlog") {
      // if on self ignore
      if (active.item.id === over.id) {
        return;
      }
      console.info("moving to backlog");
      shadowMoveToBacklog(active.item);
      return;
    } else if (over.containerId === "calendar") {
      // if on self ignore
      if (active.item.id === over.id) {
        return;
      }
      // add to calendar list preview
      console.info("moving to calendar");
      const hour = parseInt(over.id); // will be 0-23, use this to set the date
      console.info("hour", hour);
      shadowMoveToHour(active.item, hour, currentCalendarDate);
      return;
    } else {
      // if on self ignore
      if (active.item.id === over.id) {
        return;
      }
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
        shadowMoveToDay(active.item, over.date, newPosition);
      }
      // if in a different column, remove from old column and add to new column
      else {
        console.info(`moving ${event.active.id} to ${newPosition} in ${over.date}`);
        shadowMoveToDay(active.item, over.date, newPosition);
      }
    }
  }
  async function onDragEnd(event: DragEndEvent) {
    console.info("end", event);
    const direction = getDirection(event);
    const active = getActive(event);
    const over = getOver(event);
    if (!active.item) {
      return;
    }
    const sameColumn = isSameColumn(event);

    if (over.containerId === "backlog") {
      await handleBacklogDrop(active, over);
    } else if (over.containerId === "calendar") {
      await handleCalendarDrop(active, over);
    } else {
      await handleDayDrop(active, over, direction, sameColumn);
    }

    setActiveDragItem(undefined);
  }
  async function onDragCancel(event: DragCancelEvent) {
    console.info("cancel");
    setActiveDragItem(undefined);
    await tasksQuery.refetch();
  }

  function getItemById(id: string, tasks: RouterOutputs["kanban"]["tasks"] | undefined) {
    let task = tasks?.backlog.find((t) => t.id === id);
    if (task) return task;
    task = tasks?.tasksByDate?.flatMap((dt) => dt.tasks).find((t) => t.id === id);
    return task;
  }
  function getNewPosition(
    dayTasks: RouterOutputs["kanban"]["tasks"]["tasksByDate"][number],
    over: {
      date: Date;
      item?: RouterOutputs["kanban"]["tasks"]["tasksByDate"][number]["tasks"][number];
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
    else if (over.index === dayTasks.tasks.length - 1 && dayTasks.tasks.length > 0) {
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
          newPosition = ((over.item ? over.item.position : 0) + nextItem.position) / 2;
        } else {
          newPosition = (prevItem.position + (over.item ? over.item.position : 0)) / 2;
        }
      }
    }
    return newPosition;
  }
  function stripIdPrefix(id: string) {
    // replace "hour-" and "agenda-" and "backlog-" with ""
    return id.replace(/(hour-|agenda-|backlog-)/, "");
  }
  function getDirection(event: DragMoveEvent) {
    return event.delta.y > 0 ? "down" : "up";
  }
  function isSameColumn(event: DragMoveEvent) {
    console.info("isSameColumn", event);
    if (!activeDragItem || !event.over?.data.current?.sortable) {
      return false;
    }
    return (
      event.active.data.current?.sortable.containerId ===
      event.over?.data.current?.sortable.containerId
    );
  }
  function getActive(event: DragMoveEvent) {
    console.info("active", event);
    // if (!activeDragItem || !event.active?.data.current?.sortable) {
    //   return false;
    // }
    return {
      id: stripIdPrefix(event.active.id as string),
      date: new Date(event.active.data.current?.sortable.containerId),
      index: event.active.data.current?.sortable.index,
      item: activeDragItem,
      containerId: event.active?.data.current?.sortable.containerId,
    };
  }
  function getOver(event: DragMoveEvent) {
    console.info("getOver", event);
    return {
      id: stripIdPrefix(event.over?.id as string),
      date: new Date(event.over?.data.current?.sortable.containerId),
      index: event.over?.data.current?.sortable.index,
      item: getItemById(stripIdPrefix(event.over?.id as string), tasksQuery.data),
      containerId: event.over?.data.current?.sortable.containerId,
    };
  }
  function getScrollPosition(element: any) {
    const { scrollLeft, scrollTop } = element;
    return { x: scrollLeft, y: scrollTop };
  }
};

export default Home;

const time = (func: Function): void => {
  console.time(func.name); // start timer
  func(); // execute function
  console.timeEnd(func.name); // end timer
};
