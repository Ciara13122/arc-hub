import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arcTestnet } from "./arcChain";

export const wagmiConfig = getDefaultConfig({
  appName: "GM Arc",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
  chains: [arcTestnet],
  ssr: true,
});
