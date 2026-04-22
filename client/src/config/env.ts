import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const DEFAULT_API_BASE_URL = "http://localhost:8000";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_API_BASE_URL: z.url().default(DEFAULT_API_BASE_URL),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});

export const API_BASE_URL = env.VITE_API_BASE_URL;
