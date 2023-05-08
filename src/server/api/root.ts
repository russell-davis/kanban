import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { z } from "zod";
import { isSameDay } from "date-fns";
import { RouterOutputs } from "~/utils/api";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  kanban: createTRPCRouter({
    tasks: protectedProcedure
      .input(
        z.object({
          cursor: z.string().optional(),
          limit: z.number().default(100),
          startAt: z.date(),
          endAt: z.date(),
        })
      )
      .query(async ({ input, ctx }) => {
        // get the days in the range
        const days = getDateList(input.startAt, input.endAt);

        const tasks = await ctx.prisma.task.findMany({
          where: {
            AND: [
              { userId: ctx.session.user.id },
              {
                OR: [
                  {
                    date: {
                      gte: input.startAt,
                      lte: input.endAt,
                    },
                  },
                  {
                    backlog: true,
                  },
                ],
              },
            ],
          },
          orderBy: {
            position: "asc",
          },
          include: {
            subtasks: {
              orderBy: {
                id: "asc",
              },
            },
            timeEntries: true,
            channel: true,
          },
        });
        console.info("tasks", tasks.length);

        const tasksByDate = days.map((date) => {
          return {
            date,
            tasks: tasks.filter((task) => isSameDay(task.date, date) && !task.backlog),
          };
        });

        return {
          tasksByDate: tasksByDate,
          backlog: tasks
            .filter((task) => task.backlog)
            .sort(
              // createdAt, most recent on top
              (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
            ),
        };
      }),
    create: protectedProcedure
      .input(
        z.object({
          title: z.string(),
          date: z.date(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.session || !ctx.session.user || !ctx.session.user.id) {
          throw new Error("not logged in");
        }

        const maxTaskPosition = await ctx.prisma.task.findFirst({
          orderBy: {
            position: "desc",
          },
        });
        // find the default channel for the user
        const taskChannel = await ctx.prisma.taskChannel
          .findFirst({
            where: {
              userId: ctx.session.user.id,
              isDefault: true,
            },
          })
          .then(async (c) => {
            if (!c) {
              return await ctx.prisma.taskChannel.create({
                data: {
                  name: "work",
                  userId: ctx.session.user.id,
                  isDefault: true,
                  color: "#52ffec",
                },
              });
            }
            return c;
          });

        const userId = ctx.session.user.id;
        const task = await ctx.prisma.task.create({
          data: {
            userId: userId,
            title: input.title,
            date: input.date,
            position: maxTaskPosition ? maxTaskPosition.position + 1 : 0,
            backlog: true,
            channelId: taskChannel.id,
          },
        });
        console.info("created task", task);

        return task;
      }),
    updatePosition: protectedProcedure
      .input(
        z.object({
          taskId: z.string(),
          date: z.date(),
          position: z.number(),
          backlog: z.boolean().default(false),
          scheduledFor: z.date().nullable(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return ctx.prisma.task.update({
          where: {
            id: input.taskId,
          },
          data: {
            date: input.date,
            position: input.position,
            backlog: input.backlog,
            scheduledFor: input.scheduledFor,
          },
        });
      }),
  }),
  task: createTRPCRouter({
    logTime: protectedProcedure
      .input(
        z.object({
          taskId: z.string(),
          time: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return ctx.prisma.task.update({
          where: {
            id: input.taskId,
          },
          data: {
            timeEntries: {
              create: {
                seconds: input.time,
              },
            },
          },
        });
      }),
    toggleCompleted: protectedProcedure
      .input(z.object({ taskId: z.string(), completed: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        return ctx.prisma.task.update({
          where: {
            id: input.taskId,
          },
          data: {
            completed: input.completed,
          },
        });
      }),
    find: protectedProcedure
      .input(
        z.object({
          taskId: z.string(),
        })
      )
      .query(async ({ input, ctx }) => {
        return ctx.prisma.task.findUnique({
          where: {
            id: input.taskId,
          },
          include: {
            subtasks: {
              orderBy: {
                id: "asc",
              },
            },
            timeEntries: true,
            channel: true,
          },
        });
      }),
    update: protectedProcedure
      .input(
        z.object({
          taskId: z.string(),
          title: z.string().optional(),
          notes: z.string().optional(),
          channelId: z.string().optional(),
          channel: z
            .object({
              name: z.string(),
              color: z.string(),
              isDefault: z.boolean().default(false),
            })
            .optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.session || !ctx.session.user || !ctx.session.user.id) {
          throw new Error("not logged in");
        }

        const updated = await ctx.prisma.task.update({
          where: {
            id: input.taskId,
          },
          data: {
            title: input.title,
            notes: input.notes,
            channel: !input.channel
              ? undefined
              : {
                  connectOrCreate: {
                    where: {
                      id: input.channelId,
                      userId: ctx.session.user.id,
                    },
                    create: {
                      name: input.channel.name,
                      color: input.channel.color,
                      userId: ctx.session.user.id,
                    },
                  },
                },
          },
        });

        return updated;
      }),
    delete: protectedProcedure
      .input(
        z.object({
          taskId: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return ctx.prisma.task
          .delete({
            where: {
              id: input.taskId,
            },
          })
          .then((t) => {
            console.info("deleted task", t);
            return t;
          })
          .catch((e) => {
            console.error("error deleting task", e);
            throw e;
          });
      }),
  }),
  channels: createTRPCRouter({
    list: protectedProcedure.query(async ({ input, ctx }) => {
      if (!ctx.session || !ctx.session.user || !ctx.session.user.id) {
        throw new Error("not logged in");
      }

      return ctx.prisma.taskChannel.findMany({
        where: {
          userId: ctx.session.user.id,
        },
      });
    }),
  }),
});

// export type definition of API
export type AppRouter = typeof appRouter;

function getDateList(start: Date, end: Date): Date[] {
  // Create an empty array to store the dates
  const dateList: Date[] = [];

  // Set the start date to midnight
  const currentDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());

  // Loop through all the dates between the start and end dates
  while (currentDate <= end) {
    // Add the current date to the list
    dateList.push(new Date(currentDate));

    // Move to the next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Return the list of dates
  return dateList;
}

export type TaskData = RouterOutputs["kanban"]["tasks"]["backlog"][number];
