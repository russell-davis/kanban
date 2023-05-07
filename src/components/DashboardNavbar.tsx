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
import { IconMenu2, IconMoonStars, IconSun, IconTrash, IconX } from "@tabler/icons-react";

export const DashboardNavbar = () => {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const session = useSession();
  const [menuOpened, setMenuOpened] = useState(false);
  return (
    <div className={"flex h-24 flex-col px-2"}>
      <Group position={"apart"} className={"my-2"}>
        <Group>
          <Menu
            shadow="md"
            width={200}
            opened={menuOpened}
            onChange={() => setMenuOpened(!menuOpened)}
          >
            <Menu.Target>
              {menuOpened ? <IconX size={24} /> : <IconMenu2 size={24} />}
            </Menu.Target>

            <Menu.Dropdown>
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
