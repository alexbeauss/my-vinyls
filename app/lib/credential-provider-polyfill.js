import { fromEnv } from "@aws-sdk/credential-providers";

export const defaultProvider = fromEnv();
