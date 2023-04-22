import { type NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { addDays, subDays } from "date-fns";

import { api } from "~/utils/api";
import { useState } from "react";
import { DndContext, useDraggable, useDroppable } from "@dnd-kit/core";

const Home: NextPage = () => {
  const hello = api.example.hello.useQuery({ text: "from tRPC" });
  // start at 7 days ago
  const [startAt, setStartAt] = useState(subDays(new Date(), 7));
  const [endAt, setEndAt] = useState(addDays(new Date(), 7));
  const tasksByDateQuery = api.kanban.tasks.useQuery({
    startAt: startAt,
    endAt: endAt,
  });

  return (
    <>
      <Head>
        <title>Kanban!</title>
      </Head>
      <main className="flex h-screen flex-col bg-cyan-700">
        <div className="flex flex-col px-12 py-12">
          {tasksByDateQuery.status}
        </div>
        <div className="px-12 py-24">
          <DndContext
            onDragEnd={(event) => {
              console.log(event);
            }}
          >
            <div
              id="task-list"
              className="flex flex-row space-x-2 overflow-x-scroll rounded-lg p-2"
            >
              {tasksByDateQuery.data?.map((task) => (
                <div
                  key={task.date.toISOString()}
                  className="min-h-[150px] min-w-[300px] bg-orange-400"
                >
                  <DayColumn date={task.date} />
                </div>
              ))}
            </div>
          </DndContext>
        </div>
      </main>
    </>
  );
};

export default Home;

const DayColumn = ({ date }: { date: Date }) => {
  const tasks = [1, 2, 3];

  return (
    <>
      <p>DATE: {date.toISOString()}</p>
      <p>Tasks:</p>
      <Droppable date={date}>
        {tasks.map((task) => (
          <TaskItem id={`${task}-${date.toISOString()}`} key={task} />
        ))}
      </Droppable>
    </>
  );
};

const TaskItem = ({ id }: { id: string }) => {
  return (
    <Draggable id={id} key={id}>
      <div>{id}</div>
    </Draggable>
  );
};

function Droppable(props: { name: string; date: Date; children: any }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${props.name}-${props.date.toISOString()}`,
  });
  const style = {
    color: isOver ? "green" : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {props.children}
    </div>
  );
}
function Draggable(props: { id: any; children: any }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: props.id,
  });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <button ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {props.children}
    </button>
  );
}
