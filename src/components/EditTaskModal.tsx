import React, { FC, useState } from "react";
import { TaskData } from "~/server/api/root";
import {
  ActionIcon,
  Button,
  Divider,
  Group,
  Modal,
  Overlay,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { api } from "~/utils/api";
import {
  IconArchive,
  IconArrowsDiagonal,
  IconCircleCheckFilled,
  IconFocus,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";

export const EditTaskModal: FC<{
  open: boolean;
  setOpen: (open: boolean) => void;
  onClose: () => void;
  task: TaskData | undefined;
}> = ({ open, setOpen, onClose, task }) => {
  const [fullScreen, setFullScreen] = useState(false);
  const taskQuery = api.task.find.useQuery({
    taskId: task ? task.id : "",
  });

  const deleteTask = api.task.delete.useMutation({
    onSettled: () => {
      onClose();
    },
  });

  return (
    <Modal.Root
      centered
      fullScreen={fullScreen}
      size={"xl"}
      opened={open}
      onClose={() => {
        onClose();
      }}
    >
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>Edit Task: {`"${task?.title}"`}</Modal.Title>
          <Group>
            <ActionIcon
              onClick={() => {
                if (!task) return;
                deleteTask.mutate({
                  taskId: task.id,
                });
              }}
            >
              <IconTrash size={14} />
            </ActionIcon>
            <ActionIcon
              onClick={() => {
                setFullScreen(!fullScreen);
              }}
            >
              {/*<IconFocus size={14} />*/}
              <IconPencil size={14} />
            </ActionIcon>
            <ActionIcon
              onClick={() => {
                setFullScreen(!fullScreen);
              }}
            >
              <IconFocus size={14} />
              {/*<IconPencil size={14} />*/}
            </ActionIcon>
            <ActionIcon
              onClick={() => {
                setFullScreen(!fullScreen);
              }}
            >
              <IconArrowsDiagonal size={14} />
            </ActionIcon>
            <Modal.CloseButton />
          </Group>
        </Modal.Header>
        <Modal.Body>
          {taskQuery.data && (
            <EditTaskModalForm
              task={taskQuery.data}
              loading={taskQuery.isLoading}
              refetch={taskQuery.refetch}
            />
          )}
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
};
export const EditTaskModalForm: FC<{
  task: TaskData;
  loading: boolean;
  refetch: () => Promise<any>;
}> = ({ task, loading, refetch }) => {
  const completeTask = api.task.toggleCompleted.useMutation({
    onSettled: async () => {
      await refetch();
    },
  });
  const updateTask = api.task.update.useMutation();
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const changesMade = task.title !== title || task.notes !== notes;

  return (
    <div className="flex flex-col space-y-2">
      {loading && <Overlay color="#000" opacity={0.5} />}
      <div className="flex w-full flex-row items-start space-x-2 align-top">
        <ActionIcon
          color={task.completed ? "green" : "gray"}
          className="mt-2"
          loading={completeTask.isLoading}
          disabled={completeTask.isLoading}
          onClick={(e) => {
            e.stopPropagation();
            completeTask.mutate({
              taskId: task.id,
              completed: !task.completed,
            });
          }}
        >
          <IconCircleCheckFilled size={28} />
        </ActionIcon>
        <div className="flex grow flex-col justify-between pt-1">
          <Textarea
            placeholder="Your comment"
            // variant="unstyled"
            size="xl"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
          />
        </div>
      </div>
      <Textarea
        label={"Notes"}
        // variant={"unstyled"}
        placeholder={"Add notes..."}
        className="pl-10"
        minRows={3}
        classNames={{
          input: "h-36",
        }}
        value={notes}
        onChange={(event) => {
          setNotes(event.target.value);
        }}
      />
      <Divider />
      <Stack spacing={4} className={"pb-8"}>
        <Group align={"center"}>
          <Text>Audit Logs</Text>
        </Group>
        <Group align={"center"}>
          <IconArchive size={18} />
          <Text size={"xs"}>Created: {task.createdAt.toLocaleDateString()}</Text>
        </Group>
        <Group align={"center"}>
          <IconArchive size={18} />
          <Text size={"xs"}>Updated: {task.updatedAt.toLocaleDateString()}</Text>
        </Group>
      </Stack>
      <div className="flex flex-col space-y-2">
        <Divider />
        <Group position={"apart"} align={"center"}>
          <Text size={"xs"} className="">
            ID: {task.id}
          </Text>
          {changesMade && (
            <Button
              compact
              onClick={() => {
                updateTask.mutate({
                  taskId: task.id,
                  title: title,
                  notes: notes,
                });
              }}
            >
              Save
            </Button>
          )}
        </Group>
      </div>
    </div>
  );
};
