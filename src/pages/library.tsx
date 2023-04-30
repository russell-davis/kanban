import { NextPage } from "next";
import { TaskCard } from "~/components/task/TaskCard";
import { IconMoonStars, IconSun } from "@tabler/icons-react";
import { ActionIcon, useMantineColorScheme } from "@mantine/core";

const Library: NextPage = () => {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
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
      <div className="flex flex-col space-y-2 p-4">
        <div className="h-96 w-[300px]">
          <TaskCard
            task={{
              id: "1",
              title: "Do a thing to the thing; then do another thing to the thing",
              completed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              backlog: false,
              position: 1,
              scheduledFor: new Date(),
              date: new Date(),
              subtasks: [],
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Library;
