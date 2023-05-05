import { Divider, Text } from "@mantine/core";
import { Sortable } from "~/components/Sortable";
import React, { FC } from "react";
import { useDroppable } from "@dnd-kit/core";
import { DRAGABLES } from "~/pages";
import { TaskData } from "~/server/api/root";

export const Agenda = (props: {
  currentCalendarDate: Date;
  items: { hour: number; id: number; tasks: TaskData[] }[];
}) => (
  <div className="CALENDAR flex h-full max-h-full flex-col">
    <div className="p-2">
      <Text size={"xl"} weight={500}>
        {props.currentCalendarDate.toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
        })}
      </Text>
      <Divider className={"my-2"} />
    </div>
    <div className="overflow-y-auto p-2">
      {props.items.map((item, i) => (
        <div key={i} className="h-14">
          <Droppable
            id={`hour-drop-${i}`}
            data={{
              hour: item.hour,
            }}
            type={DRAGABLES.CALENDAR}
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
              {item.tasks.map((t) => (
                <Sortable
                  key={t.id}
                  id={`hour-task-${t.id}`}
                  data={t}
                  type={DRAGABLES.TASK}
                >
                  <div className="flex w-full flex-row pl-10">
                    <div className="flex w-full flex-col items-start space-y-2 rounded bg-white px-2">
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
              {item.tasks.length === 0 && (
                <div className="flex flex-row pl-10 text-white"></div>
              )}
            </div>
          </Droppable>
        </div>
      ))}
    </div>
  </div>
);

export const Droppable: FC<{
  id: number | string;
  data: any;
  type: string;
  children: any;
}> = ({ id, data, type, children }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
    data: {
      type,
      ...data,
    },
  });

  return <div ref={setNodeRef}>{children}</div>;
};
