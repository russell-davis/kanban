import { Center, Container, Stack, Text } from "@mantine/core";
import { GetServerSideProps } from "next";
import { getServerAuthSession } from "~/server/auth";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerAuthSession(context);

  if (!!session?.user) {
    return {
      props: {},
      redirect: {
        destination: "/dashboard",
      },
    };
  }

  return {
    props: {},
  };
};

const AccessPending = () => {
  return (
    <Container p={"12rem"}>
      <Center>
        <Stack>
          <h1>Access Pending</h1>
          <Text>Your account is pending approval. Please check back soon.</Text>
        </Stack>
      </Center>
    </Container>
  );
};

export default AccessPending;
