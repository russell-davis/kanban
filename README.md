# Kanban

## What is this?
This project is a kanban board that is built with Next.js, NextAuth.js, Prisma, Tailwind CSS, and tRPC. 

## How do I run this?

### Prerequisites
1. `~/.env` - copy the `~/.env.example` file to `~/.env` and fill in the values.
> If you don't have a .env in the root of the project, you will see error like this:
>
> `Invalid environment variables: { "DATABASE_URL": ['Required'] }`
2. Database (see [below](###database))
  - sqlite - easiest option to get started
  - postgres - recommended for production and long term development
3. Install dependencies with `yarn install`
4. Initialize the database with `yarn prisma migrate dev`
   1. If prompted for a name, enter `init`
5. Regenerate the prisma client with `yarn install` (postinstall script will run `yarn prisma generate`)
6. Run the development server with `yarn run dev` or `yarn dev`


`yarn run dev` - run the development server with hot reloading. 
`yarn build` - build the production version of the app. this must be done before running the production server with `yarn start`.
`yarn start` - run the production server. optionally provide a port with `yarn start -p 3000`.


### Database
#### sqlite
To use sqlite, make sure your `.env` file has the following:
```
DATABASE_URL="file:./db.sqlite"
```
then in `~/prisma/schema.prisma` set the provider to sqlite:
```
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```


If you are not familiar with the different technologies used in this project, please refer to the respective docs.

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)
