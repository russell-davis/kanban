import { type NextPage } from "next";
import Head from "next/head";
import { addDays, endOfDay, isSameDay, setHours, startOfDay, subDays } from "date-fns";
import { api, type RouterOutputs } from "~/utils/api";
import React, { useEffect, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  type DragCancelEvent,
  type DragEndEvent,
  type DragMoveEvent,
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
import { coordinateGetter } from "~/components/dndkit/multipleContainersKeyboardCoordinates";
import { TaskData } from "~/server/api/root";
import { useDebouncedValue } from "@mantine/hooks";
import { Backlog } from "~/components/backlog";
import { Agenda } from "~/components/agenda";
import { KanbanBoard } from "~/components/KanbanBoard";
import { classNames } from "~/lib/classNames";
import { ActionIcon, Divider, Group, Text, useMantineColorScheme } from "@mantine/core";
import { IconMoonStars, IconSun } from "@tabler/icons-react";

export const DRAGABLES = {
  CALENDAR: "calendar",
  BACKLOG: "backlog",
  BOARD: "board",
  TASK: "task",
};

const Home: NextPage = () => {
  const colorScheme = useMantineColorScheme();
  const [startAt, setStartAt] = useState(subDays(startOfDay(new Date()), 3));
  const [endAt, setEndAt] = useState(addDays(endOfDay(new Date()), 7));
  const [activeDragItem, setActiveDragItem] = useState<
    RouterOutputs["kanban"]["tasks"]["backlog"][number] | undefined
  >(undefined);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [debouncedDate, setDebouncedDate] = useDebouncedValue(currentCalendarDate, 500);

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

  // useEffect(() => {
  //   function calculateHorizontalScrollPercent(element: any) {
  //     const { scrollWidth, clientWidth, scrollLeft } = element;
  //     const maxScrollLeft = scrollWidth - clientWidth;
  //     const percentScrolled = (scrollLeft / maxScrollLeft) * 100;
  //     // round to 2 decimal places
  //     return Math.round(percentScrolled * 100) / 100;
  //   }
  //
  //   // write a function that calculates the leftmost visible item in a horizontal scrollable. the
  //   // function should take the scrollable element, and the width of the items in the scrollable.
  //   function calculateLeftmostVisibleItem(
  //     element: any,
  //     columnWidth: number,
  //     padding: number
  //   ) {
  //     const { scrollLeft, scrollWidth } = element;
  //
  //     const numberOfItems = tasksQuery.data?.tasksByDate.length || 0;
  //     const widthPerItem = document.querySelector(".DAY_COLUMN")?.clientWidth || 0;
  //
  //     // ex: if the scrollLeft is between 0 and 300, the leftmost visible item is index 0
  //     // ex: if the scrollLeft is between 300 and 600, the leftmost visible item is index 1
  //     // ex: if the scrollLeft is between 600 and 900, the leftmost visible item is index 2
  //     const scrollPercent = scrollLeft / scrollWidth;
  //
  //     let leftmostVisibleIndex = Math.round((scrollLeft / scrollWidth) * numberOfItems);
  //     console.info(leftmostVisibleIndex);
  //
  //     return leftmostVisibleIndex;
  //   }
  //
  //   const handleScroll = (event: any) => {
  //     if (!event.target) return;
  //     if (!!activeDragItem) {
  //       // prevent scrolling while dragging
  //       event.target.scrollLeft = scrollPosition.x;
  //       return;
  //     }
  //     const percent = calculateHorizontalScrollPercent(event.target);
  //     if (percent < 10 || percent > 90) {
  //     }
  //
  //     // const day = tasksQuery.data?.tasksByDate.at(leftMost);
  //     // if (day && !isSameDay(day.date, currentCalendarDate)) {
  //     //   // console.info(`day = ${day.date}`);
  //     //   // console.info(`diff = ${day.date.getTime() - currentCalendarDate.getTime()}`);
  //     //   setCurrentCalendarDate(day.date);
  //     // }
  //   };
  //
  //   const myElement = scrollableRef.current;
  //   if (myElement) {
  //     myElement.addEventListener("scroll", handleScroll);
  //   }
  //
  //   return () => {
  //     if (myElement) {
  //       myElement.removeEventListener("scroll", handleScroll);
  //     }
  //   };
  // }, [scrollableRef, tasksQuery.data?.tasksByDate, activeDragItem]);
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
      isSameDay(dt.date, debouncedDate)
    );
    if (!todayColumn) {
      return [];
    }
    const scheduledTasks = todayColumn.tasks.filter((t) => {
      return t.scheduledFor !== null;
    });
    console.info(`scheduledTasks = ${scheduledTasks.length}`);

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
  }, [tasksQuery.data?.tasksByDate, debouncedDate]);

  return (
    <>
      <Head>
        <title>Kanban!</title>
      </Head>
      <main
        className={classNames(
          // "bg-green-400",
          // "bg-gray-800",
          "flex h-screen flex-col"
        )}
      >
        <div
          className={classNames(
            // "bg-red-400",
            "flex h-24 flex-col px-2"
          )}
        >
          <Group position={"apart"} className={"my-2"}>
            <Text>Test</Text>
            <Group position="apart">
              <ActionIcon
                onClick={() => colorScheme.toggleColorScheme()}
                size="lg"
                sx={(theme) => ({
                  backgroundColor:
                    theme.colorScheme === "dark"
                      ? theme.colors.dark[6]
                      : theme.colors.gray[0],
                  color:
                    theme.colorScheme === "dark"
                      ? theme.colors.yellow[4]
                      : theme.colors.blue[6],
                })}
              >
                {colorScheme.colorScheme === "dark" ? (
                  <IconSun size="1.2rem" />
                ) : (
                  <IconMoonStars size="1.2rem" />
                )}
              </ActionIcon>
            </Group>
          </Group>

          <Divider />
        </div>
        <div
          className={classNames(
            // "bg-purple-400 p-2",
            "flex grow overflow-clip"
          )}
        >
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
              className={classNames(
                // "bg-blue-400 p-1",
                "flex w-80 shrink-0 flex-col overflow-y-auto"
              )}
            >
              <Backlog
                goToTodayClicked={() => {
                  scrollToToday();
                }}
                tasksQueryData={tasksQuery.data}
                dateRange={{
                  startAt,
                  endAt,
                }}
              />
            </div>
            <div
              className={classNames(
                // "bg-yellow-600 p-1",
                "flex grow flex-row space-x-40 overflow-x-auto"
              )}
            >
              <KanbanBoard
                currentCalendarDate={currentCalendarDate}
                setCurrentCalendarDate={setCurrentCalendarDate}
                activeDragItem={activeDragItem}
                tasks={tasksQuery.data}
                range={{
                  startAt,
                  endAt,
                }}
              />
            </div>
            <div
              className={classNames(
                // "bg-blue-600 p-1",
                "w-80 shrink-0 flex-col overflow-y-auto border-l border-gray-600"
              )}
            >
              <Agenda items={calendarTasks} currentCalendarDate={currentCalendarDate} />
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

  function shadowMoveToBacklog(task: TaskData) {
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
          return {
            ...dt,
            tasks: dt.tasks.filter((t) => t.id !== task.id),
          };
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
  function shadowMoveToDay(task: TaskData, date: Date, position: number) {
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
  function shadowMoveToHour(task: TaskData, hour: number, currentCalendarDate: Date) {
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
  async function moveToBacklog(task: TaskData) {
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
  async function moveToDay(task: TaskData, date: Date, position: number) {
    // if the task is being moved from to a different day, we need to update the position and reset the scheduledFor
    const differentDays = !isSameDay(task.date, date);
    const movingToDifferentDay =
      differentDays &&
      // is not midnight
      task.scheduledFor !== null &&
      task.scheduledFor.getHours() !== 0;
    const scheduledFor = movingToDifferentDay ? null : task.scheduledFor;
    await updatePositionMutation
      .mutateAsync({
        taskId: task.id,
        date: date,
        backlog: false,
        position: position,
        scheduledFor: scheduledFor,
      })
      .then(async () => {
        return await tasksQuery.refetch();
      })
      .catch((e) => {
        console.error(e);
      });
  }
  async function moveToHour(task: TaskData, hour: number, currentCalendarDate: Date) {
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
  function onDragStart(event: DragStartEvent) {
    console.info("start");
    const item = getItemById(event.active.id as string, tasksQuery.data);
    setActiveDragItem(item);
    // const scrollPosition = getScrollPosition(scrollableRef.current);
    // setScrollPosition(scrollPosition);
  }
  function onDragOver(event: DragOverEvent) {
    const o = event.over?.data.current;
    if (
      !(o && o.type) ||
      !event.over ||
      !event.over.id ||
      !activeDragItem ||
      event.active.id === event.over?.id
    ) {
      return;
    }
    const type = o.type;
    if (type === DRAGABLES.BACKLOG) {
      // move to backlog
      // if on self ignore
      if (
        event.active?.id === event.over?.id &&
        // neither is nullish
        !!event.active?.id &&
        !!event.over?.id
      ) {
        return;
      }
      console.info("moving to backlog");
      shadowMoveToBacklog(activeDragItem);
      return;
    }
    // move to calendar
    else if (type === DRAGABLES.CALENDAR) {
      const over = event.over.data.current as { hour: number; type: string };
      // move to calendar
      console.info("moving to calendar");
      shadowMoveToHour(activeDragItem, over.hour, currentCalendarDate);
      return;
    }
    // move to day
    else if (type === DRAGABLES.TASK) {
      const overContainer = event.over.data.current?.sortable.containerId;
      const overDate = new Date(overContainer);
      const dayTasks = tasksQuery.data?.tasksByDate.find((dt) =>
        isSameDay(dt.date, overDate)
      );
      if (!dayTasks) {
        return;
      }
      const overItem = getItemById(
        stripIdPrefix(event.over?.id as string),
        tasksQuery.data
      );
      const direction = getDirection(event);
      const newPosition = getNewPosition(
        dayTasks,
        event.over?.data.current?.sortable.index,
        overItem ? overItem.position : 0,
        direction
      );
      shadowMoveToDay(activeDragItem, overDate, newPosition);
    }
  }
  async function onDragEnd(event: DragEndEvent) {
    if (!activeDragItem) {
      return;
    }

    const overType = event.over?.data.current?.type;
    if (overType === DRAGABLES.BACKLOG) {
      // update the position of the dragged item
      await moveToBacklog(activeDragItem);
    }
    // calendar
    else if (overType === DRAGABLES.CALENDAR) {
      const over = event.over?.data?.current as { hour: number; type: string };

      // add to calendar
      await moveToHour(activeDragItem, over.hour, currentCalendarDate);
    }
    // task
    else if (overType === DRAGABLES.TASK) {
      const overDate = new Date(event.over?.data.current?.sortable.containerId);
      const overIndex = event.over?.data.current?.sortable.index;
      const overItemPosition = event.over?.data.current?.sortable.itemPosition;

      const dayTasks = tasksQuery.data?.tasksByDate.find((dt) =>
        isSameDay(dt.date, overDate)
      );
      if (!dayTasks) {
        return;
      }

      const direction = getDirection(event);
      const newPosition = getNewPosition(
        dayTasks,
        overIndex,
        overItemPosition,
        direction
      );
      await moveToDay(activeDragItem, overDate, newPosition);
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
    overIndex: number,
    overItemPosition: number,
    direction: string
  ) {
    let newPosition = -1;

    // is empty column
    if (dayTasks.tasks.length === 0) {
      newPosition = 1;
    }
    // is first item
    else if (overIndex === 0 && dayTasks.tasks.length > 0) {
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
    else if (overIndex === dayTasks.tasks.length - 1 && dayTasks.tasks.length > 0) {
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
      const prevItem = dayTasks.tasks[overIndex - 1];
      const nextItem = dayTasks.tasks[overIndex + 1];

      if (!!prevItem && !!nextItem) {
        if (direction === "down") {
          newPosition = (overItemPosition + nextItem.position) / 2;
        } else {
          newPosition = (overItemPosition + prevItem.position) / 2;
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
  function getScrollPosition(element: any) {
    const { scrollLeft, scrollTop } = element;
    return { x: scrollLeft, y: scrollTop };
  }
};

export default Home;
