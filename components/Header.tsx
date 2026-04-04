import { ConnectWallet } from "@/components/ConnectWallet";

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
      <h1 className="text-xl font-semibold">ZeroG</h1>
      <ConnectWallet />
    </header>
  );
}
