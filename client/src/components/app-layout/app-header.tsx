import { Box, Heading, Text } from "@chakra-ui/react";
import type { FC } from "react";

type AppHeaderProps = {
  title: string;
  subtitle: string;
  hidden?: boolean;
};

const AppHeader: FC<AppHeaderProps> = ({ title, subtitle, hidden = false }) => {
  if (hidden) {
    return null;
  }
  return (
    <Box mb={6}>
      <Heading color="#0f172a" fontSize="1.8rem">
        {title}
      </Heading>
      <Text color="#64748b" mt={1.5}>
        {subtitle}
      </Text>
    </Box>
  );
};

export default AppHeader;
