import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { exampleRouter } from "~/server/api/routers/example";
import { z } from "zod";
import { isSameDay, startOfDay } from "date-fns";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  example: exampleRouter,
  kanban: createTRPCRouter({
    seed: publicProcedure.mutation(async ({ ctx }) => {
      // reset db
      await ctx.prisma.task.deleteMany();

      // create tasks
      const dummyTasksPromises = [];
      const d = startOfDay(new Date());
      for (let i = 0; i < 10; i++) {
        dummyTasksPromises.push(
          ctx.prisma.task.create({
            data: {
              title: `Task ${i + 1}`,
              date: d,
              completed: false,
              position: i,
            },
          })
        );
      }

      const results = await Promise.all(dummyTasksPromises);
      console.info("results", results);

      return results;
    }),

    tasks: publicProcedure
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
            date: {
              gte: input.startAt,
              lte: input.endAt,
            },
          },
          orderBy: {
            position: "asc",
          },
        });
        console.info("tasks", tasks.length);

        const tasksByDate = days.map((date) => {
          return {
            date,
            tasks: tasks.filter((task) => isSameDay(task.date, date)),
          };
        });

        return tasksByDate;
      }),
    backlogTasks: publicProcedure.query(async ({ ctx }) => {
      const tasks = await ctx.prisma.task.findMany({
        where: {
          date: new Date(0),
        },
        orderBy: {
          position: "asc",
        },
      });
      console.info("tasks", tasks);

      return tasks;
    }),
    create: publicProcedure
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
        const task = await ctx.prisma.task.create({
          data: {
            title: input.title,
            date: input.date,
            position: maxTaskPosition ? maxTaskPosition.position + 1 : 0,
          },
        });
        console.info("created task", task);

        return task;
      }),
    updatePosition: publicProcedure
      .input(
        z.object({
          taskId: z.string(),
          date: z.date(),
          position: z.number(),
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
  const currentDate = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );

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
