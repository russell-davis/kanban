import { Center, Container, Text } from "@mantine/core";

const AccessPending = () => {
  return (
    <Container p={"12rem"}>
      <Center>
        <h1>Access Pending</h1>
        <Text>Your account is pending approval. Please check back soon.</Text>
      </Center>
    </Container>
  );
};

export default AccessPending;
