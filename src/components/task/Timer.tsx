import React, { FC, useEffect, useState } from "react";
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
import { ActionIcon, Group, Stack, Text } from "@mantine/core";

export const Timer: FC<{
  currentDuration?: number;
  onStart: () => void;
  onStop: (duration: number) => void;
}> = ({ currentDuration = 0, onStart, onStop }) => {
  const [duration, setDuration] = useState(currentDuration);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let intervalId: any;

    if (isRunning) {
      intervalId = setInterval(() => {
        setDuration((prevDuration) => prevDuration + 1);
      }, 1000);
    }

    return () => {
      clearInterval(intervalId);
    };
  }, [isRunning]);

  const handleToggle = () => {
    setIsRunning((prevIsRunning) => !prevIsRunning);
    if (!isRunning) {
      onStart();
    } else {
      onStop(duration);
    }
  };

  const formatDuration = (duration: number) => {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <Group position={"apart"} pt={4}>
      <ActionIcon onClick={handleToggle}>
        {isRunning ? <IconPlayerPause /> : <IconPlayerPlay />}
      </ActionIcon>
      <Group>
        <Stack align={"center"} spacing={2}>
          <Text size={"xs"} transform={"uppercase"}>
            Actual
          </Text>
          <Text size={"xs"}>{formatDuration(duration)}</Text>
        </Stack>
        <Stack align={"center"} spacing={2}>
          <Text size={"xs"} transform={"uppercase"}>
            Planned
          </Text>
          <Text size={"xs"}>{formatDuration(0)}</Text>
        </Stack>
      </Group>
    </Group>
  );
};
