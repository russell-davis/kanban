import { Group, Loader, Stack, Switch } from "@mantine/core";
import { api } from "~/utils/api";

export const GeneralSettings = () => {
  const user = api.users.me.useQuery();
  const toggleEncryptData = api.users.toggleEncryptData.useMutation({
    onSettled: () => {
      user.refetch();
    },
  });

  return (
    <div className="general">
      <Stack>
        <h1>General Settings</h1>

        <Stack>
          <Group>
            <Switch
              label="Encrypt Data"
              disabled={user.isLoading || !user.data}
              checked={user.data?.encryptData ?? false}
              onChange={(event) => {
                toggleEncryptData.mutate({
                  encryptData: !user.data?.encryptData,
                });
              }}
            />
            {toggleEncryptData.isLoading && <Loader size={20} />}
          </Group>
        </Stack>
      </Stack>
    </div>
  );
};
