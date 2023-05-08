import {
  ActionIcon,
  Divider,
  Group,
  Menu,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import { signOut, useSession } from "next-auth/react";
import React, { useState } from "react";
import {
  IconMenu2,
  IconMoonStars,
  IconSettings,
  IconSun,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { SETTINGS_APPS } from "~/pages/settings";

export const DashboardNavbar = () => {
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const session = useSession();
  const [menuOpened, setMenuOpened] = useState(false);
  return (
    <div className={"flex h-24 flex-col px-2"}>
      <Group position={"apart"} className={"my-2"}>
        <Group>
          <Menu
            withinPortal
            withArrow
            offset={4}
            position={"bottom-start"}
            shadow="md"
            width={200}
            opened={menuOpened}
            // onChange={() => setMenuOpened(!menuOpened)}
            onClose={() => setMenuOpened(false)}
            onOpen={() => setMenuOpened(true)}
          >
            <Menu.Target>
              {menuOpened ? <IconX size={24} /> : <IconMenu2 size={24} />}
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Account</Menu.Label>
              <Menu.Item
                // color="blue"
                icon={<IconSettings size={14} />}
                onClick={async () => {
                  await router.push(`/settings?t=${SETTINGS_APPS.GENERAL}`);
                }}
              >
                Settings
              </Menu.Item>

              <Menu.Divider />
              <Menu.Item
                color="red"
                icon={<IconTrash size={14} />}
                onClick={async () => {
                  await signOut();
                }}
              >
                Logout
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
          <Text>Hi, {session.data?.user?.name}</Text>
        </Group>
        <Group position="apart">
          <ActionIcon
            onClick={() => {
              toggleColorScheme();
            }}
            size="lg"
            sx={(theme) => ({
              backgroundColor:
                colorScheme === "dark" ? theme.colors.dark[6] : theme.colors.gray[0],
              color:
                colorScheme === "dark" ? theme.colors.yellow[4] : theme.colors.blue[6],
            })}
          >
            {colorScheme === "dark" ? (
              <IconSun size="1.2rem" />
            ) : (
              <IconMoonStars size="1.2rem" />
            )}
          </ActionIcon>
        </Group>
      </Group>

      <Divider />
    </div>
  );
};
