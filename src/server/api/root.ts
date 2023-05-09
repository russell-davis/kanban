import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
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
        })
      )
      .mutation(async ({ input, ctx }) => {
        const updated = await ctx.prisma.task.update({
          where: {
            id: input.taskId,
          },
          data: {
            title: input.title,
            notes: input.notes,
          },
        });

        return updated;
      }),
    changeChannel: protectedProcedure
      .input(
        z.object({
          taskId: z.string(),
          channelId: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const defaultChannels = await ctx.prisma.taskChannel.findMany({
          where: {
            AND: [{ userId: ctx.session.user.id }, { isDefault: true }],
          },
        });

        // if any channels are default, set them to false
        if (defaultChannels.length > 0) {
          await ctx.prisma.taskChannel.updateMany({
            where: {
              id: {
                in: defaultChannels.map((c) => c.id),
              },
            },
            data: {
              isDefault: false,
            },
          });
        }

        // set the new channel to default
        await ctx.prisma.taskChannel.update({
          where: {
            id: input.channelId,
          },
          data: {
            isDefault: true,
          },
        });

        // update the task
        const updated = await ctx.prisma.task.update({
          where: {
            id: input.taskId,
          },
          data: {
            channelId: input.channelId,
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
      return ctx.prisma.taskChannel.findMany({
        where: {
          userId: ctx.session.user.id,
        },
        orderBy: [
          // { isDefault: "desc" },
          { name: "asc" },
        ],
      });
    }),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          color: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return ctx.prisma.taskChannel.create({
          data: {
            userId: ctx.session.user.id,
            name: input.name,
            color: input.color,
          },
        });
      }),
    createAndConnect: protectedProcedure
      .input(
        z.object({
          taskId: z.string(),
          name: z.string(),
          color: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return ctx.prisma.taskChannel.create({
          data: {
            name: input.name,
            color: input.color,
            userId: ctx.session.user.id,
            tasks: {
              connect: {
                id: input.taskId,
              },
            },
          },
        });
      }),
    setDefault: protectedProcedure
      .input(
        z.object({
          newChannelId: z.string(),
          oldChannelId: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return ctx.prisma.taskChannel
          .updateMany({
            where: {
              userId: ctx.session.user.id,
            },
            data: {
              isDefault: false,
            },
          })
          .then(() => {
            return ctx.prisma.taskChannel.update({
              where: {
                id: input.newChannelId,
              },
              data: {
                isDefault: true,
              },
            });
          });
      }),
    update: protectedProcedure
      .input(
        z.object({
          channelId: z.string(),
          name: z.string(),
          color: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return ctx.prisma.taskChannel.update({
          where: {
            id: input.channelId,
          },
          data: {
            name: input.name,
            color: input.color,
          },
        });
      }),
    delete: protectedProcedure
      .input(
        z.object({
          channelId: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return ctx.prisma.taskChannel.delete({
          where: {
            id: input.channelId,
          },
        });
      }),
  }),
  users: createTRPCRouter({
    me: protectedProcedure.query(async ({ input, ctx }) => {
      return ctx.prisma.user.findUnique({
        where: {
          id: ctx.session.user.id,
        },
      });
    }),
    list: adminProcedure
      .input(
        z.object({
          search: z.string().optional(),
          limit: z.number().optional(),
          cursor: z.string().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        return ctx.prisma.user.findMany({}).then((users) => {
          return users;
        });
      }),
    toggleAdmin: adminProcedure
      .input(
        z.object({
          userId: z.string(),
          isAdmin: z.boolean(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return ctx.prisma.user.update({
          where: {
            id: input.userId,
          },
          data: {
            role: input.isAdmin ? "ADMIN" : "USER",
          },
        });
      }),
    toggleActive: adminProcedure
      .input(
        z.object({
          userId: z.string(),
          isActive: z.boolean(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return ctx.prisma.user.update({
          where: {
            id: input.userId,
          },
          data: {
            isActive: input.isActive,
          },
        });
      }),
    toggleEncryptData: protectedProcedure
      .input(
        z.object({
          encryptData: z.boolean(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return ctx.prisma.user.update({
          where: {
            id: ctx.session.user.id,
          },
          data: {
            encryptData: input.encryptData,
          },
        });
      }),
    delete: adminProcedure
      .input(
        z.object({
          userId: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return ctx.prisma.user.delete({
          where: {
            id: input.userId,
          },
        });
      }),
    ban: adminProcedure
      .input(
        z.object({
          userId: z.string(),
          isBanned: z.boolean(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return ctx.prisma.user.update({
          where: {
            id: input.userId,
          },
          data: {
            isBanned: input.isBanned,
          },
        });
      }),
  }),
  eventTracker: createTRPCRouter({
    track: publicProcedure
      .input(
        z.object({
          event: z.string(),
          data: z.any(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        console.info({
          eventName: input.event,
          data: input.data,
          created: new Date(),
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
