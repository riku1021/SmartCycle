import "@/index.css";
import "@/config/env";
import { ChakraProvider } from "@chakra-ui/react";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { QueryClientAtomProvider } from "jotai-tanstack-query/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createQueryClient } from "@/queries/queryClient";
import { routeTree } from "@/routeTree.gen";
import theme from "@/theme";

const router = createRouter<typeof routeTree>({ routeTree });
const queryClient = createQueryClient();

const App = () => {
  return <RouterProvider router={router} />;
};

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <ChakraProvider value={theme}>
      <QueryClientAtomProvider client={queryClient}>
        <App />
      </QueryClientAtomProvider>
    </ChakraProvider>
  </StrictMode>
);
