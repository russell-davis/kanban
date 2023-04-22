import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { exampleRouter } from "~/server/api/routers/example";
import { z } from "zod";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  example: exampleRouter,
  kanban: createTRPCRouter({
    tasks: publicProcedure
      .input(
        z.object({
          cursor: z.string().optional(),
          limit: z.number().default(100),
          startAt: z.date(),
          endAt: z.date(),
        })
      )
      .query(({ input }) => {
        console.info("input", input);
        // get the days in the range
        const days = getDateList(input.startAt, input.endAt).map((date) => {
          return {
            date,
            tasks: [],
          };
        });

        return days;
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
