import { GetServerSideProps, NextPage } from "next";
import { AppShell, Footer, Header, Navbar, NavLink } from "@mantine/core";
import { DashboardNavbar } from "~/components/DashboardNavbar";
import { IconArrowLeft, IconHome2, IconSection } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { ChannelSettings } from "~/components/settings/ChannelSettings";
import { getServerAuthSession } from "~/server/auth";
import { GeneralSettings } from "~/components/GeneralSettings";

export const SETTINGS_APPS = {
  GENERAL: "general",
  CHANNELS: "channels",
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerAuthSession(ctx);

  if (!session || !session.user) {
    return {
      redirect: {
        destination: "/login",
        permanent: true,
      },
    };
  }

  if (session.user.isBanned) {
    return {
      redirect: {
        destination: "/404",
        permanent: true,
      },
    };
  }

  return {
    props: { session },
  };
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
      {tab === SETTINGS_APPS.GENERAL && <GeneralSettings />}
      {tab === SETTINGS_APPS.CHANNELS && <ChannelSettings />}
    </AppShell>
  );
};

export default Settings;
