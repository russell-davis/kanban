import React, { useRef, useState } from "react";
import { DayColumn } from "~/components/DayColumn";
import { isSameDay, min } from "date-fns";
import { classNames } from "~/lib/classNames";
import { RouterOutputs } from "~/utils/api";
import { TaskData } from "~/server/api/root";

export const KanbanBoard = (props: {
  activeDragItem: any;
  tasks?: RouterOutputs["kanban"]["tasks"];
  currentCalendarDate: Date;
  setCurrentCalendarDate: (date: Date) => void;
  range: {
    startAt: Date;
    endAt: Date;
  };
  onEditTaskClicked: (task: TaskData) => void;
}) => {
  const {
    activeDragItem,
    tasks,
    currentCalendarDate,
    setCurrentCalendarDate,
    range: { startAt, endAt },
  } = props;
  const scrollableRef = useRef<any>(null);
  const [visibleColumns, setVisibleColumns] = useState<Date[]>([]);

  return (
    <div
      className={classNames(
        `DAYS h-full`,
        activeDragItem ? "scroll- overflow-x-hidden" : "overflow-x-scroll",
        // "flex h-full w-full grow"
        "flex flex-row"
      )}
      ref={scrollableRef}
    >
      {tasks?.tasksByDate.map((dt) => (
        <DayColumn
          key={dt.date.toISOString()}
          dt={dt}
          isCurrentCalendarDate={isSameDay(dt.date, currentCalendarDate)}
          containerRef={scrollableRef}
          dateRange={{
            startAt,
            endAt,
          }}
          didBecomeVisible={() => {
            if (visibleColumns.includes(dt.date)) {
              return;
            }
            const newVisible = [...visibleColumns, dt.date];
            setVisibleColumns(newVisible);
            const minDate = min(newVisible);
            if (minDate) {
              setCurrentCalendarDate(minDate);
            }
          }}
          didBecomeInvisible={() => {
            const newVisible = visibleColumns.filter((d) => !isSameDay(d, dt.date));
            setVisibleColumns(newVisible);
            const minDate = min(newVisible);
            if (minDate) {
              setCurrentCalendarDate(minDate);
            }
          }}
          onEditTaskClicked={(task) => {
            props.onEditTaskClicked(task);
          }}
        />
      ))}
      <div className="flex min-w-[40rem] grow"></div>
    </div>
  );
};
