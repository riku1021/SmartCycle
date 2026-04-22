import "@/config/env";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { QueryClientAtomProvider } from "jotai-tanstack-query/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createQueryClient } from "@/queries/queryClient";
import { routeTree } from "@/routeTree.gen";

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
    <QueryClientAtomProvider client={queryClient}>
      <App />
    </QueryClientAtomProvider>
  </StrictMode>
);
