import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import type { FC } from "react";
import { FaBars } from "react-icons/fa6";

type HeaderProps = {
  title: string;
  subtitle: string;
  hidden?: boolean;
  onOpenMenu?: () => void;
};

const Header: FC<HeaderProps> = ({ title, subtitle, hidden = false, onOpenMenu }) => {
  if (hidden) {
    return null;
  }
  return (
    <Box mb={6}>
      <Flex alignItems="center" gap={3}>
        <button
          type="button"
          className="top-action-btn"
          onClick={onOpenMenu}
          aria-label="メニューを開く"
          style={{ width: "42px", height: "42px", flexShrink: 0 }}
        >
          <FaBars />
        </button>
        <Heading color="var(--text)" fontSize="1.8rem">
          {title}
        </Heading>
      </Flex>
      <Text color="var(--text2)" mt={1.5}>
        {subtitle}
      </Text>
    </Box>
  );
};

export default Header;
