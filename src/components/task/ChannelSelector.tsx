import React, { FC } from "react";
import { api, RouterOutputs } from "~/utils/api";
import { Badge, Popover, Select, Stack, Text } from "@mantine/core";
import { IconCircle } from "@tabler/icons-react";
import Link from "next/link";
import { SETTINGS_APPS } from "~/pages/settings";

export const ChannelSelector: FC<{
  taskId: string;
  currentChannel: RouterOutputs["channels"]["list"][number];
}> = ({ taskId, currentChannel }) => {
  const utils = api.useContext();
  const channels = api.channels.list.useQuery();
  const createAndConnectChannel = api.channels.createAndConnect.useMutation({
    onSettled: () => {
      // utils.kanban.tasks.refetch()
      utils.invalidate();
    },
  });
  const changeChannel = api.task.changeChannel.useMutation({
    onSettled: () => {
      // utils.kanban.tasks.refetch()
      utils.invalidate();
    },
  });
  if (channels.isLoading) return <Badge color="gray">...</Badge>;
  if (!channels.data) return <Badge color="gray">No channels</Badge>;
  const selectedOption = channels.data?.find((c) => c.id === currentChannel.id);

  const channelList =
    channels.data?.map((channel) => {
      return {
        image: <IconCircle style={{ backgroundColor: channel.color }} />,
        label: channel.name,
        value: channel.id,
      };
    }) || [];

  return (
    <Popover
      width={200}
      position="bottom-end"
      withArrow
      shadow="md"
      withinPortal
      offset={4}
    >
      <Popover.Target>
        <Badge color={selectedOption?.color}>{selectedOption?.name}</Badge>
      </Popover.Target>
      <Popover.Dropdown
        sx={(theme) => ({
          background: theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
        })}
      >
        <Stack spacing={4}>
          <Select
            label="Select a channel"
            clearable
            creatable
            searchable
            value={selectedOption?.id}
            onChange={(value) => {
              console.info("change:", value);
              if (!value) return;
              changeChannel.mutate({
                taskId: taskId,
                channelId: value,
              });
            }}
            data={channelList}
            getCreateLabel={(value) => `Create channel: "${value}"`}
            onCreate={(value) => {
              console.info("create:", value);
              createAndConnectChannel.mutate({
                taskId: taskId,
                name: value,
                color: "blue",
              });
              return value;
            }}
          />

          <Text size={"xs"}>
            <Link href={`/settings?t=${SETTINGS_APPS.CHANNELS}`}>Click here </Link> to
            manage channels
          </Text>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};
