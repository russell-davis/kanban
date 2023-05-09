import { api } from "~/utils/api";
import {
  Badge,
  Button,
  Checkbox,
  ColorInput,
  Container,
  Divider,
  Group,
  Stack,
  TextInput,
} from "@mantine/core";
import React from "react";

export const ChannelSettings = () => {
  const channels = api.channels.list.useQuery();
  const [newChannelName, setChannelName] = React.useState("");
  const [newChannelColor, setChannelColor] = React.useState("#464648");
  const [editingChannelId, setEditingChannelId] = React.useState<string | undefined>(
    undefined
  );

  const createChannel = api.channels.create.useMutation({
    onSettled: () => {
      channels.refetch();
      setChannelName("");
      setChannelColor("#464648");
    },
  });
  const updateChannel = api.channels.update.useMutation({
    onSettled: () => {
      channels.refetch();
      setChannelName("");
      setChannelColor("#464648");
    },
  });
  const setDefaultChannel = api.channels.setDefault.useMutation({
    onSettled: () => {
      channels.refetch();
    },
  });
  const deleteChannel = api.channels.delete.useMutation({
    onSettled: () => {
      channels.refetch();
    },
  });

  if (channels.isLoading) return <div>Loading...</div>;
  if (!channels.data) return <div>No channels found</div>;

  return (
    <Container>
      <Stack>
        <h1>Channels</h1>
        <Stack>
          <Group position={"apart"} align={"end"}>
            <Group className="max-w-md">
              <TextInput
                disabled={createChannel.isLoading}
                className={"w-64"}
                label={"Name"}
                value={newChannelName}
                onChange={(event) => setChannelName(event.currentTarget.value)}
              />
              <ColorInput
                disabled={createChannel.isLoading}
                className={"w-36"}
                label={"Color"}
                format="hex"
                withEyeDropper
                swatches={colors}
                value={newChannelColor}
                onChange={(value) => {
                  setChannelColor(value);
                }}
              />
            </Group>
            <Button
              compact
              disabled={createChannel.isLoading}
              onClick={() => {
                if (editingChannelId) {
                  updateChannel.mutate({
                    channelId: editingChannelId,
                    name: newChannelName,
                    color: newChannelColor,
                  });
                } else {
                  createChannel.mutate({
                    name: newChannelName,
                    color: newChannelColor,
                  });
                }
              }}
            >
              {editingChannelId ? "Update" : "Create"}
            </Button>
          </Group>
          <Divider />
        </Stack>
        {channels.data.map((channel) => (
          <div key={channel.id}>
            <Group position={"apart"}>
              <Group>
                <Checkbox
                  disabled={channels.data.length === 1 || channel.isDefault}
                  checked={channel.isDefault}
                  onChange={(event) => {
                    console.info("change:", event.currentTarget.checked);
                    const oldChannelId = channels.data.find((c) => c.isDefault)?.id;
                    if (!oldChannelId) return;
                    setDefaultChannel.mutate({
                      newChannelId: channel.id,
                      oldChannelId: oldChannelId,
                    });
                  }}
                />
                <Badge
                  style={{
                    backgroundColor: channel.color,
                    color: "white",
                  }}
                >
                  {channel.name}
                </Badge>
              </Group>
              <Group>
                <Button
                  compact
                  onClick={() => {
                    setEditingChannelId(channel.id);
                    setChannelName(channel.name);
                    setChannelColor(channel.color);
                  }}
                >
                  Edit
                </Button>
                <Button
                  compact
                  color={"red"}
                  disabled={channels.data.length === 1 || channel.isDefault}
                  onClick={() => {
                    deleteChannel.mutate({
                      channelId: channel.id,
                    });
                  }}
                >
                  Delete
                </Button>
              </Group>
            </Group>
          </div>
        ))}
      </Stack>
    </Container>
  );
};

const colors = [
  "#25262b",
  "#868e96",
  "#fa5252",
  "#e64980",
  "#be4bdb",
  "#7950f2",
  "#4c6ef5",
  "#228be6",
  "#15aabf",
  "#12b886",
  "#40c057",
  "#82c91e",
  "#fab005",
  "#fd7e14",
];
