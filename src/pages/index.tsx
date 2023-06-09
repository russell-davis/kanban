import {
  Button,
  Container,
  createStyles,
  Group,
  List,
  rem,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconBrandDiscord, IconCheck } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { signIn } from "next-auth/react";
import { GetServerSideProps } from "next";
import { getServerAuthSession } from "~/server/auth";
import { api } from "~/utils/api";

const useStyles = createStyles((theme) => ({
  inner: {
    display: "flex",
    justifyContent: "space-between",
    paddingTop: `calc(${theme.spacing.xl} * 4)`,
    paddingBottom: `calc(${theme.spacing.xl} * 4)`,
  },

  content: {
    maxWidth: rem(680),
    marginRight: `calc(${theme.spacing.xl} * 3)`,

    [theme.fn.smallerThan("md")]: {
      maxWidth: "100%",
      marginRight: 0,
    },
  },

  title: {
    color: theme.colorScheme === "dark" ? theme.white : theme.black,
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    fontSize: rem(44),
    lineHeight: 1.2,
    fontWeight: 900,

    [theme.fn.smallerThan("xs")]: {
      fontSize: rem(28),
    },
  },

  control: {
    [theme.fn.smallerThan("xs")]: {
      flex: 1,
    },
  },

  image: {
    flex: 1,

    [theme.fn.smallerThan("md")]: {
      display: "none",
    },
  },

  highlight: {
    position: "relative",
    backgroundColor: theme.fn.variant({ variant: "light", color: theme.primaryColor })
      .background,
    borderRadius: theme.radius.sm,
    padding: `${rem(4)} ${rem(12)}`,
  },
}));

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerAuthSession(ctx);

  if (!!session) {
    if (session.user.isBanned) {
      return {
        redirect: {
          destination: "/404",
          permanent: true,
        },
      };
    }
    return {
      redirect: {
        destination: "/dashboard",
        permanent: true,
      },
    };
  }

  return {
    props: { session },
  };
};
const Home = () => {
  const { classes } = useStyles();
  const router = useRouter();
  const xt = api.eventTracker.track.useMutation();

  return (
    <div>
      <Container>
        <div className={classes.inner}>
          <div className={classes.content}>
            <Title className={classes.title}>
              A <span className={classes.highlight}>free</span> task manager <br /> built
              with React, TypeScript, and Prisma
            </Title>
            <Text color="dimmed" mt="md">
              Tired of paying for monthly subscriptions? Try out this free and open source
              kanban board for daily task management.
            </Text>

            <List
              mt={30}
              spacing="sm"
              size="sm"
              icon={
                <ThemeIcon size={20} radius="xl">
                  <IconCheck size={rem(12)} stroke={1.5} />
                </ThemeIcon>
              }
            >
              <List.Item>
                <b>TypeScript based</b> – extend the board by building type safe
                applications, components and hooks
              </List.Item>
              <List.Item>
                <b>Free and open source</b> – all packages have MIT license, including
                Mantine and Tailwindcss
              </List.Item>
            </List>

            <Group mt={30}>
              <Button
                radius="xl"
                size="md"
                className={classes.control}
                onClick={async () => {
                  // router.push("/login");
                  xt.mutate({
                    event: "login with discord",
                    data: {
                      location: "home",
                    },
                  });
                  await signIn("discord");
                }}
                leftIcon={<IconBrandDiscord />}
              >
                Get started with Discord
              </Button>
              <Button
                variant="default"
                radius="xl"
                size="md"
                className={classes.control}
                onClick={() => {
                  xt.mutate({
                    event: "view source code",
                    data: {
                      location: "home",
                    },
                  });
                  router.push("https://github.com/russell-davis/kanban");
                }}
              >
                Source code
              </Button>
            </Group>
          </div>
          {/*<Image src={image.src} className={classes.image} />*/}
        </div>
      </Container>
    </div>
  );
};

export default Home;
