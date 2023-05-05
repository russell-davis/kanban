import { NextPage } from "next";
import { TaskCard } from "~/components/task/TaskCard";
import { IconMoonStars, IconSun } from "@tabler/icons-react";
import { ActionIcon, useMantineColorScheme } from "@mantine/core";
import { api } from "~/utils/api";
import { addWeeks, subWeeks } from "date-fns";
import { useState } from "react";

const Library: NextPage = () => {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [taskDates, setTaskDates] = useState<{
    start: Date;
    end: Date;
  }>({
    start: subWeeks(new Date(), 1),
    end: addWeeks(new Date(), 1),
  });
  const tasks = api.kanban.tasks.useQuery({
    startAt: taskDates.start,
    endAt: taskDates.end,
  });
  return (
    <div className="h-screen w-full">
      <div className="flex items-center justify-between p-4">
        <h1>Library</h1>
        <ActionIcon
          variant="outline"
          color={colorScheme === "dark" ? "yellow" : "blue"}
          onClick={() => toggleColorScheme()}
          title="Toggle color scheme"
        >
          {colorScheme === "dark" ? (
            <IconSun size="1.1rem" />
          ) : (
            <IconMoonStars size="1.1rem" />
          )}
        </ActionIcon>
      </div>
      <div className="flex h-96 w-[300px] flex-col space-y-2 p-4">
        {tasks.data?.tasksByDate
          .flatMap((tasksByDate) => tasksByDate.tasks)
          .map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              dateRange={{
                startAt: taskDates.start,
                endAt: taskDates.end,
              }}
            />
          ))}
      </div>
    </div>
  );
};

export default Library;
