import { NextPage } from "next";
import {
  AppShell,
  Button,
  Checkbox,
  Footer,
  Group,
  Header,
  Loader,
  Navbar,
  NavLink,
  Stack,
  Table,
} from "@mantine/core";
import { DashboardNavbar } from "~/components/DashboardNavbar";
import { IconArrowLeft, IconHome2, IconSection } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import { useState } from "react";
import { useSession } from "next-auth/react";

export const SETTINGS_APPS = {
  GENERAL: "general",
  CHANNELS: "channels",
};

const Admin: NextPage = () => {
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
              router.push(`/admin?t=general`, undefined, {
                shallow: true,
              });
            }}
          />
          <NavLink
            label="Users"
            icon={<IconSection size="1rem" stroke={1.5} />}
            onClick={async () => {
              router.push(`/admin?t=users`, undefined, {
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
      {tab === SETTINGS_APPS.GENERAL && (
        <div className="general">
          <Stack>
            <h1>General Settings</h1>
          </Stack>
        </div>
      )}
      {tab === "users" && <Users />}
    </AppShell>
  );
};

export default Admin;

export const Users = () => {
  const session = useSession();
  const currentUserIsAdmin = session.data?.user?.role === "ADMIN";
  const [userSearch, setUserSearch] = useState<string>("");
  const usersQuery = api.users.list.useInfiniteQuery({
    limit: 10,
    search: userSearch,
  });
  const toggleUserAdmin = api.users.toggleAdmin.useMutation({
    onSettled: () => {
      usersQuery.refetch();
    },
  });
  const toggleUserActive = api.users.toggleActive.useMutation({
    onSettled: () => {
      usersQuery.refetch();
    },
  });
  const toggleUserBanned = api.users.ban.useMutation({
    onSettled: () => {
      usersQuery.refetch();
    },
  });
  return (
    <Stack>
      <h1>Users</h1>
      <Table>
        <thead>
          <tr>
            <th>Id</th>
            <th>Username</th>
            <th>Active?</th>
            <th>Admin?</th>
            <th>Banned?</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {usersQuery.data?.pages.map((page) => {
            return page.map((user) => {
              return (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>
                    <Group>
                      <Checkbox
                        checked={user.isActive}
                        onChange={(event) => {
                          toggleUserActive.mutate({
                            userId: user.id,
                            isActive: !user.isActive,
                          });
                        }}
                      />
                      {toggleUserActive.isLoading && <Loader size={20} />}
                    </Group>
                  </td>
                  <td>
                    <Group>
                      <Checkbox
                        disabled={
                          user.role === "ADMIN" &&
                          currentUserIsAdmin &&
                          user.id === session.data?.user?.id
                        }
                        checked={user.role === "ADMIN"}
                        onChange={async (event) => {
                          toggleUserAdmin.mutate({
                            userId: user.id,
                            isAdmin: user.role === "ADMIN",
                          });
                        }}
                      />
                      {toggleUserAdmin.isLoading && <Loader size={20} />}
                    </Group>
                  </td>
                  <td>
                    <Group>
                      <Checkbox
                        disabled={toggleUserBanned.isLoading}
                        checked={user.isBanned}
                        onChange={async (event) => {
                          toggleUserBanned.mutate({
                            userId: user.id,
                            isBanned: !user.isBanned,
                          });
                        }}
                      />
                      {toggleUserBanned.isLoading && <Loader size={20} />}
                    </Group>
                  </td>
                  <td>
                    <Group>
                      <Button compact>Edit</Button>
                      <Button compact color={"red"}>
                        Delete
                      </Button>
                    </Group>
                  </td>
                </tr>
              );
            });
          })}
        </tbody>
      </Table>
    </Stack>
  );
};
