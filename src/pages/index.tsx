import { type NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { addDays, endOfDay, isSameDay, startOfDay, subDays } from "date-fns";
import { CSS } from "@dnd-kit/utilities";

import { api } from "~/utils/api";
import { FC, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragCancelEvent,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@mantine/core";
import { MultipleContainers } from "~/components/MultipleContainers";
import { coordinateGetter } from "~/components/dndkit/multipleContainersKeyboardCoordinates";
import { Task } from "@prisma/client";

const Home: NextPage = () => {
  const [startAt, setStartAt] = useState(subDays(startOfDay(new Date()), 3));
  const [endAt, setEndAt] = useState(addDays(endOfDay(new Date()), 7));
  const utils = api.useContext();
  const seedDb = api.kanban.seed.useMutation();
  const tasksByDateQuery = api.kanban.tasks.useQuery(
    {
      startAt: startAt,
      endAt: endAt,
    },
    { refetchOnWindowFocus: false, refetchOnMount: false }
  );
  const getItemById = (id: string) => {
    const task = tasksByDateQuery.data
      ?.flatMap((dt) => dt.tasks)
      .find((t) => t.id === id);
    return task;
  };

  const [activeDragItem, setActiveDragItem] = useState<{ id: string } | null>(
    null
  );
  const [clonedItems, setClonedItems] = useState<any>([]);
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter,
    })
  );

  return (
    <>
      <Head>
        <title>Kanban!</title>
      </Head>
      <main className="flex h-screen flex-col bg-cyan-700">
        <div className="flex flex-col px-12 py-12">
          {tasksByDateQuery.status}
          {/*<Button*/}
          {/*  compact*/}
          {/*  onClick={async () => {*/}
          {/*    await seedDb.mutateAsync().then(() => {*/}
          {/*      tasksByDateQuery.refetch();*/}
          {/*    });*/}
          {/*  }}*/}
          {/*>*/}
          {/*  seed*/}
          {/*</Button>*/}
        </div>
        <div className="py-18 px-12">
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
              className="flex flex-row space-x-2 overflow-x-scroll rounded-lg p-2"
            >
              {tasksByDateQuery.data?.map((dt) => (
                <div
                  key={dt.date.toISOString()}
                  className="day_column h-96 min-h-[50px] min-w-[300px] flex-1 bg-orange-400"
                >
                  <div className="task_list flex h-full flex-1 flex-col space-y-2 p-1">
                    <div>day: {dt.date.toLocaleDateString()}</div>
                    <SortableContext
                      items={dt.tasks}
                      id={dt.date.toISOString()}
                      key={dt.date.toISOString()}
                      strategy={verticalListSortingStrategy}
                    >
                      {dt.tasks.map((task) => (
                        <Sortable id={task.id} key={task.id}>
                          <div
                            className="min-h-24 w-full flex-1 rounded-lg bg-white "
                            key={task.id}
                          >
                            <p>{task.title}</p>
                            <p>{task.position}</p>
                          </div>
                        </Sortable>
                      ))}
                      {dt.tasks.length === 0 && (
                        <div className="flex h-full w-full grow rounded-lg bg-white ">
                          <Sortable id={dt.date.toISOString()}>
                            <p>no tasks</p>
                          </Sortable>
                        </div>
                      )}
                    </SortableContext>
                  </div>
                </div>
              ))}
            </div>
            <DragOverlay>
              {activeDragItem ? <div>dragged item</div> : null}
            </DragOverlay>
          </DndContext>
        </div>

        <MultipleContainers />
      </main>
    </>
  );

  function onDragStart(event: DragStartEvent) {
    console.info("start");
    setActiveDragItem({ id: event.active.id as string });
  }
  function onDragOver(event: DragOverEvent) {
    setActiveDragItem({ id: event.active.id as string });
    console.info("over", {
      direction: event.delta.y > 0 ? "down" : "up",
      activeindex: event.active.data.current?.sortable.index,
      overindex: event.over?.data.current?.sortable.index,
      at:
        event.over?.data.current?.sortable.index === 0
          ? "HEAD"
          : event.over?.data.current?.sortable.index ===
            event.over?.data.current?.sortable.items.length - 1
          ? "TAIL"
          : undefined,
    });
  }
  function onDragEnd(event: DragEndEvent) {
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

    let newPosition: number = -1;

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

    console.info("new position", newPosition);

    // update the position of the dragged item
    utils.kanban.tasks.setData(
      {
        startAt,
        endAt,
      },
      (prev) => {
        if (!prev) {
          return prev;
        }

        if (sameColumn) {
          return prev.map((dt) => {
            if (isSameDay(dt.date, active.date)) {
              return {
                ...dt,
                tasks: dt.tasks
                  .map((task) => {
                    if (task.id === active.id) {
                      return {
                        ...task,
                        position: newPosition,
                        date: sameColumn ? task.date : overColumnDate,
                      };
                    }
                    return task;
                  })
                  .sort((a, b) => a.position - b.position),
              };
            }
            return dt;
          });
        } else {
          return prev.map((dt) => {
            if (isSameDay(dt.date, active.date)) {
              return {
                ...dt,
                tasks: dt.tasks.filter((task) => task.id !== active.id),
              };
            }
            if (isSameDay(dt.date, overColumnDate)) {
              return {
                ...dt,
                tasks: [
                  ...dt.tasks,
                  {
                    ...(active.item as any),
                    position: newPosition,
                    date: overColumnDate,
                  },
                ].sort((a, b) => a.position - b.position),
              };
            }
            return dt;
          });
        }
      }
    );

    setActiveDragItem(null);
  }
  function onDragCancel(event: DragCancelEvent) {
    console.info("cancel");
    setActiveDragItem(null);
  }
};

export default Home;

const Sortable: FC<{ id: string; children: any }> = ({ children, id }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: id,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

const EmptyDroppable: FC<{ id: string }> = ({ id }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });
  return <div ref={setNodeRef}></div>;
};
