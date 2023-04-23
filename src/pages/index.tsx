import { type NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { addDays, endOfDay, startOfDay, subDays } from "date-fns";
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

const Home: NextPage = () => {
  const [startAt, setStartAt] = useState(subDays(startOfDay(new Date()), 3));
  const [endAt, setEndAt] = useState(addDays(endOfDay(new Date()), 7));
  const seedDb = api.kanban.seed.useMutation();
  const tasksByDateQuery = api.kanban.tasks.useQuery({
    startAt: startAt,
    endAt: endAt,
  });
  const [activeDragItem, setActiveDragItem] = useState<{ id: string } | null>(
    null
  );
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
          <Button
            compact
            onClick={async () => {
              await seedDb.mutateAsync().then(() => {
                tasksByDateQuery.refetch();
              });
            }}
          >
            seed
          </Button>
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
                  <div>day: {dt.date.toLocaleDateString()}</div>
                  <div className="task_list min-h-96 flex flex-col space-y-2 p-1">
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
                          </div>
                        </Sortable>
                      ))}
                      {dt.tasks.length === 0 && (
                        <div className="min-h-64 flex h-full w-full flex-1 rounded-lg bg-white ">
                          <Sortable id={`empty-${dt.date.toISOString()}`}>
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
  }
  function onDragOver(event: DragOverEvent) {
    setActiveDragItem({ id: event.active.id as string });
    console.info({
      activeId: event.active.id,
      overId: event.over?.id,
      sameColumn:
        event.active.data.current?.sortable.containerId ===
        event.over?.data.current?.sortable.containerId,
      fromColumn: event.active.data.current?.sortable.containerId,
      toColumn: event.over?.data.current?.sortable.containerId,
    });
  }
  function onDragEnd(event: DragEndEvent) {
    console.info("end", {
      activeId: event.active.id,
      overId: event.over?.id,
      sameColumn:
        event.active.data.current?.sortable.containerId ===
        event.over?.data.current?.sortable.containerId,
      fromColumn: event.active.data.current?.sortable.containerId,
      toColumn: event.over?.data.current?.sortable.containerId,
    });
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
