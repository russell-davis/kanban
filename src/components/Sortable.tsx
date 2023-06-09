import { type FC } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Sortable: FC<{ id: string; children: any; data: any; type: string }> = ({
  children,
  id,
  data,
  type,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isOver } =
    useSortable({
      id: id,
      data: {
        type,
        ...data,
      },
      disabled: {
        draggable: data.draggable !== undefined ? data.draggable : false,
      },
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};
