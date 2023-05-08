import { NextPage } from "next";
import {
  AppShell,
  Button,
  Footer,
  Group,
  Header,
  Navbar,
  NavLink,
  Stack,
} from "@mantine/core";
import { DashboardNavbar } from "~/components/DashboardNavbar";
import { IconArrowLeft, IconHome2, IconSection } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { api } from "~/utils/api";

export const SETTINGS_APPS = {
  GENERAL: "general",
  CHANNELS: "channels",
};

const Settings: NextPage = () => {
  const router = useRouter();
  const tab = router.query.t as string;

  return (
    <AppShell
      padding="md"
      navbar={
        <Navbar width={{ base: 300 }} p="xs">
          <NavLink
            label="Dashboard"
            icon={<IconArrowLeft size="1rem" stroke={1.5} />}
            onClick={async () => {
              await router.push("/dashboard");
            }}
          />
          <NavLink
            label="General"
            icon={<IconHome2 size="1rem" stroke={1.5} />}
            onClick={async () => {
              router.push(`/settings?t=${SETTINGS_APPS.GENERAL}`, undefined, {
                shallow: true,
              });
            }}
          />
          <NavLink
            label="Channels"
            icon={<IconSection size="1rem" stroke={1.5} />}
            onClick={async () => {
              router.push(`/settings?t=${SETTINGS_APPS.CHANNELS}`, undefined, {
                shallow: true,
              });
            }}
          />
        </Navbar>
      }
      header={
        <Header height={60} p="xs">
          <DashboardNavbar />
        </Header>
      }
      styles={(theme) => ({
        main: {
          backgroundColor:
            theme.colorScheme === "dark" ? theme.colors.dark[8] : theme.colors.gray[0],
        },
      })}
      footer={
        <Footer height={40} p={4}>
          v0.0.1
        </Footer>
      }
    >
      <Stack>
        <div>{JSON.stringify(router.query)}</div>
      </Stack>
      {tab === SETTINGS_APPS.GENERAL && (
        <div className="general">
          <Stack>
            <h1>General Settings</h1>
          </Stack>
        </div>
      )}
      {tab === SETTINGS_APPS.CHANNELS && (
        <div className="channels">
          <Stack>
            <h1>Channel Settings</h1>
            <Stack>
              <ChannelSettings />
            </Stack>
          </Stack>
        </div>
      )}
    </AppShell>
  );
};

export default Settings;

const ChannelSettings = () => {
  const channels = api.channels.list.useQuery();
  if (channels.isLoading) return <div>Loading...</div>;
  if (!channels.data) return <div>No channels found</div>;

  return (
    <Stack>
      {channels.data.map((channel) => (
        <div key={channel.id}>
          <Group position={"apart"}>
            <div>{channel.name}</div>
            <Group>
              <Button compact>Edit</Button>
              <Button compact color={"red"}>
                Delete
              </Button>
            </Group>
          </Group>
        </div>
      ))}
    </Stack>
  );
};
