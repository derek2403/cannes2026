import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { MiniKitProvider } from "@worldcoin/minikit-js/minikit-provider";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MiniKitProvider>
      <Component {...pageProps} />
    </MiniKitProvider>
  );
}
