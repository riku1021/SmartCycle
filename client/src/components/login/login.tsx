import {
  Box,
  Button,
  Link as ChakraLink,
  Flex,
  Heading,
  HStack,
  Image,
  Input,
  Text,
} from "@chakra-ui/react";
import { useNavigate } from "@tanstack/react-router";
import type { FC, FormEvent } from "react";
import { useState } from "react";
import { FaEnvelope, FaLock, FaUser } from "react-icons/fa6";
import { showErrorAlert } from "@/shared/alerts/alerts";
import {
  getAuthErrorMessage,
  isAlreadyRegisteredEmailError,
  isEmailNotRegisteredError,
  submitAuth,
} from "./login.auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateInputs(mode: "login" | "signup", email: string, password: string): string | null {
  if (!EMAIL_REGEX.test(email)) {
    return "有効なメールアドレス形式で入力してください。";
  }
  if (password.length < 1 || password.length > 256) {
    return "パスワードは1〜256文字で入力してください。";
  }
  if (mode === "signup" && password.length < 6) {
    return "新規登録時のパスワードは6文字以上で入力してください。";
  }
  return null;
}

const LoginComponent: FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationError = validateInputs(mode, email, password);
    if (validationError) {
      await showErrorAlert("入力エラー", validationError);
      return;
    }
    setIsSubmitting(true);
    try {
      await submitAuth({
        mode,
        email,
        password,
        name: name || undefined,
      });
      await navigate({ to: "/" });
    } catch (err: unknown) {
      if (mode === "login" && isEmailNotRegisteredError(err)) {
        await showErrorAlert(
          "未登録メールアドレス",
          "このメールアドレスは未登録です。新規登録画面に切り替えます。"
        );
        setMode("signup");
        return;
      }
      if (mode === "signup" && isAlreadyRegisteredEmailError(err)) {
        await showErrorAlert(
          "登録済みメールアドレス",
          "このメールアドレスはすでに登録されています。ログイン画面に切り替えます。"
        );
        setMode("login");
        return;
      }
      await showErrorAlert("認証エラー", getAuthErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Flex
      align="center"
      bgGradient="linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #c026d3 100%)"
      direction="column"
      inset={0}
      justify="center"
      position="fixed"
      px={3}
      py={6}
      zIndex={2000}
    >
      <Flex
        backdropFilter="blur(25px)"
        bg="rgba(255, 255, 255, 0.15)"
        border="1px solid rgba(255, 255, 255, 0.3)"
        borderRadius={{ base: "24px", md: "40px" }}
        boxShadow="0 40px 100px -20px rgba(0,0,0,0.4)"
        h={{ base: "auto", md: "min(680px, 92vh)" }}
        maxH={{ base: "92vh", md: "none" }}
        maxW="1000px"
        overflow="hidden"
        w="90vw"
      >
        <Flex
          align="center"
          bg="rgba(0, 0, 0, 0.1)"
          color="white"
          direction="column"
          display={{ base: "none", lg: "flex" }}
          flex="1.2"
          justify="center"
          p={16}
          textAlign="center"
        >
          <Image alt="SmartCycle" aria-hidden boxSize="132px" mb={6} src="/SmartCycle.svg" />
          <Heading fontSize="3rem" fontWeight={800} mb={2}>
            SmartCycle
          </Heading>
          <Text fontSize="1.2rem" opacity={0.9}>
            未来の駐輪体験を、今ここに。
          </Text>
        </Flex>

        <Flex
          bg="white"
          direction="column"
          flex={1}
          justify="center"
          overflowY="auto"
          p={{ base: 5, md: 10 }}
        >
          <HStack borderBottom="2px solid #f1f5f9" gap={6} mb={6}>
            <Button
              borderBottom={mode === "login" ? "2px solid #4f46e5" : "2px solid transparent"}
              borderRadius={0}
              color={mode === "login" ? "#4f46e5" : "#64748b"}
              fontWeight={700}
              onClick={() => setMode("login")}
              px={0}
              variant="ghost"
            >
              ログイン
            </Button>
            <Button
              borderBottom={mode === "signup" ? "2px solid #4f46e5" : "2px solid transparent"}
              borderRadius={0}
              color={mode === "signup" ? "#4f46e5" : "#64748b"}
              fontWeight={700}
              onClick={() => setMode("signup")}
              px={0}
              variant="ghost"
            >
              新規登録
            </Button>
          </HStack>

          <Box>
            {mode === "login" ? (
              <Box>
                <Heading fontSize={{ base: "1.75rem", md: "2.4rem" }} mb={3}>
                  おかえりなさい
                </Heading>
                <Text color="#64748b" mb={8}>
                  アカウント情報を入力してログインしてください。
                </Text>
              </Box>
            ) : (
              <Box>
                <Heading fontSize={{ base: "1.75rem", md: "2.4rem" }} mb={3}>
                  はじめまして
                </Heading>
                <Text color="#64748b" mb={8}>
                  わずか数秒で、次世代の駐輪ライフが始まります。
                </Text>
              </Box>
            )}

            <form noValidate onSubmit={handleSubmit}>
              {mode === "signup" && (
                <Box mb={5}>
                  <Text
                    alignItems="center"
                    color="#64748b"
                    display="flex"
                    fontWeight={600}
                    gap={1.5}
                    mb={2}
                  >
                    <FaUser aria-hidden />
                    表示名（任意）
                  </Text>
                  <Input
                    _focusVisible={{ borderColor: "#4f46e5", bg: "white" }}
                    bg="#f8fafc"
                    id="auth-name"
                    autoComplete="name"
                    placeholder="やまだ たろう"
                    value={name}
                    onChange={(ev) => setName(ev.target.value)}
                  />
                </Box>
              )}

              <Box mb={5}>
                <Text
                  alignItems="center"
                  color="#64748b"
                  display="flex"
                  fontWeight={600}
                  gap={1.5}
                  mb={2}
                >
                  <FaEnvelope aria-hidden />
                  メールアドレス
                </Text>
                <Input
                  _focusVisible={{ borderColor: "#4f46e5", bg: "white" }}
                  bg="#f8fafc"
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  placeholder="user@example.com"
                  required
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                />
                <Text color="#64748b" fontSize="0.8rem" mt={2}>
                  有効なメールアドレス形式で入力してください。
                </Text>
              </Box>

              <Box mb={5}>
                <Text
                  alignItems="center"
                  color="#64748b"
                  display="flex"
                  fontWeight={600}
                  gap={1.5}
                  mb={2}
                >
                  <FaLock aria-hidden />
                  パスワード
                </Text>
                <Input
                  _focusVisible={{ borderColor: "#4f46e5", bg: "white" }}
                  bg="#f8fafc"
                  id="auth-password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  required
                  minLength={mode === "signup" ? 6 : undefined}
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                />
                <Text color="#64748b" fontSize="0.8rem" mt={2}>
                  {mode === "signup"
                    ? "6〜256文字で入力してください。英字・数字・記号の組み合わせを推奨します。"
                    : "1〜256文字で入力してください。"}
                </Text>
              </Box>

              <Button
                bg="#4f46e5"
                color="white"
                disabled={isSubmitting}
                mt={2}
                size="lg"
                type="submit"
                w="full"
              >
                {isSubmitting
                  ? "処理中…"
                  : mode === "login"
                    ? "ログインしてはじめる"
                    : "新規登録してはじめる"}
              </Button>

              {mode === "signup" && (
                <Text color="#64748b" fontSize="0.85rem" mt={5} textAlign="center">
                  登録することで、
                  <ChakraLink color="#4f46e5" fontWeight={600} href="#terms">
                    利用規約
                  </ChakraLink>
                  と
                  <ChakraLink color="#4f46e5" fontWeight={600} href="#privacy">
                    プライバシーポリシー
                  </ChakraLink>
                  に同意したことになります。
                </Text>
              )}
            </form>
          </Box>
        </Flex>
      </Flex>

      <HStack mt={6}>
        <Button
          color="rgba(255,255,255,0.9)"
          fontWeight={600}
          onClick={() => void navigate({ to: "/" })}
          textDecoration="underline"
          variant="plain"
        >
          トップへ
        </Button>
      </HStack>
    </Flex>
  );
};

export default LoginComponent;
