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
  const [visible, setVisible] = useState<Map<Date, boolean>>(new Map());

  const setCurrent = (map: typeof visible) => {
    // get the keys (dates) where the value is true
    const showing = Array.from(map)
      .filter((a) => a[1])
      .map((b) => b[0]);

    const minDate = min(showing) || currentCalendarDate;

    setCurrentCalendarDate(minDate);
  };

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
            setVisible((prev) => {
              prev.set(dt.date, true);
              setCurrent(prev);
              return prev;
            });
          }}
          didBecomeInvisible={() => {
            setVisible((prev) => {
              prev.set(dt.date, false);
              setCurrent(prev);
              return prev;
            });
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
