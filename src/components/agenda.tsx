import { Task } from "@prisma/client";
import { Text } from "@mantine/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Sortable } from "~/components/Sortable";
import React from "react";

export const Agenda = (props: {
  currentCalendarDate: Date;
  items: { hour: number; id: number; tasks: Task[] }[];
}) => (
  <div className="CALENDAR min-w-[300px] overflow-y-scroll bg-gray-800">
    <div className="flex grow flex-col p-2">
      <Text size={"xl"} weight={500} color={"white"}>
        {props.currentCalendarDate.toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
        })}
      </Text>
    </div>
    <div className="flex grow flex-col p-2">
      <SortableContext
        items={props.items}
        id={"calendar"}
        strategy={verticalListSortingStrategy}
      >
        {props.items.map((item, i) => (
          <div key={i} className="h-12">
            <Sortable id={`hour-${item.id}`} data={item}>
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
                  <Sortable id={t.id} data={t} key={t.id}>
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
);
