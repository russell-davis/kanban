import { Button, Container, Group, Paper, Title } from "@mantine/core";
import { IconBrandDiscord } from "@tabler/icons-react";
import { signIn } from "next-auth/react";

const Login = () => {
  return (
    <Container size={420} my={40}>
      <Title
        align="center"
        sx={(theme) => ({
          fontFamily: `Greycliff CF, ${theme.fontFamily}`,
          fontWeight: 900,
        })}
      >
        Welcome!
      </Title>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Group grow mb="md" mt="md">
          <Button
            leftIcon={<IconBrandDiscord radius="xl" />}
            onClick={() => {
              signIn("discord").then((r) => {
                console.log(r);
              });
            }}
          >
            Login with Discord
          </Button>
        </Group>
      </Paper>
    </Container>
  );
};

export default Login;
