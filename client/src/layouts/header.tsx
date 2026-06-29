import { Box, Heading, Text } from "@chakra-ui/react";
import type { FC } from "react";

type HeaderProps = {
  title: string;
  subtitle: string;
  hidden?: boolean;
};

const Header: FC<HeaderProps> = ({ title, subtitle, hidden = false }) => {
  if (hidden) {
    return null;
  }
  return (
    <Box mb={6}>
      <Heading color="var(--text)" fontSize="1.8rem">
        {title}
      </Heading>
      <Text color="var(--text2)" mt={1.5}>
        {subtitle}
      </Text>
    </Box>
  );
};

export default Header;
