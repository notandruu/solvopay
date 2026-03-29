import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base } from "wagmi/chains";

let _config: ReturnType<typeof getDefaultConfig> | null = null;

export function getWagmiConfig() {
  if (!_config) {
    _config = getDefaultConfig({
      appName: "SolvoPay",
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "placeholder",
      chains: [base],
      ssr: true,
    });
  }
  return _config;
}
