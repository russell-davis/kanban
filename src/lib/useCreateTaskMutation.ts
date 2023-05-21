import { api } from "~/utils/api";
import { startOfDay } from "date-fns";
import { notifications } from "@mantine/notifications";

export const useCreateTaskMutation = (props: {
  userId: string;
  dateRange: any;
  onSuccess?: () => void;
  onError?: () => void;
  onSettled?: () => void;
}) => {
  const utils = api.useContext();
  return api.task.create.useMutation({
    onMutate: async ({ title }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await utils.kanban.tasks.cancel();
      // Snapshot the previous value
      const previous = utils.kanban.tasks.getData(props.dateRange);
      // Optimistically update to the new value
      utils.kanban.tasks.setData(props.dateRange, (td) => {
        if (!td) return td;
        return {
          ...td,
          backlog: [
            ...td.backlog,
            {
              id: "optimistic",
              date: startOfDay(new Date(0)),
              backlog: true,
              completed: false,
              title: title,
              position: 0,
              createdAt: startOfDay(new Date()),
              updatedAt: startOfDay(new Date()),
              notes: "",
              userId: props.userId,
              subtasks: [],
              timeEntries: [],
              scheduledFor: null,
              channelId: "",
              channel: {
                id: "",
                name: "",
                userId: "",
                color: "",
                isDefault: false,
              },
            },
          ],
        };
      });
      // Return a context object with the snapshotted value
      return { previous };
    },
    onSuccess: async (data) => {
      notifications.show({
        title: "Success",
        message: "Task created",
        autoClose: 2000,
        color: "green",
      });
      if (props.onSuccess) props.onSuccess();
    },
    onError: async (error, vars, ctx) => {
      // show error notification
      notifications.show({
        title: "Error",
        message: "Failed to create task",
        color: "red",
      });
      // rollback to previous value
      utils.kanban.tasks.setData(props.dateRange, ctx?.previous);
      if (props.onError) props.onError();
    },
    onSettled: async (data, error) => {
      // always refetch kanban tasks
      await utils.kanban.tasks.refetch();
      if (props.onSettled) props.onSettled();
    },
  });
};
