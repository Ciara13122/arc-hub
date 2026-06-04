"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState, useEffect } from "react";

const ABI = [
  { inputs: [{ name: "badgeTypeId", type: "uint256" }], name: "claimBadge", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "user", type: "address" }], name: "getMyBadges", outputs: [{ components: [{ name: "badgeTypeId", type: "uint256" }, { name: "mintedAt", type: "uint256" }], type: "tuple[]" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getAllBadgeTypes", outputs: [{ components: [{ name: "name", type: "string" }, { name: "emoji", type: "string" }, { name: "description", type: "string" }, { name: "totalMinted", type: "uint256" }, { name: "active", type: "bool" }], type: "tuple[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "", type: "address" }, { name: "", type: "uint256" }], name: "hasBadge", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalMinted", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalBadgeTypes", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

const ADDR = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

export default function App() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<"all" | "mine">("all");

  const { data: badgeTypes, refetch } = useReadContract({ address: ADDR, abi: ABI, functionName: "getAllBadgeTypes" });
  const { data: myBadges, refetch: refetchMine } = useReadContract({ address: ADDR, abi: ABI, functionName: "getMyBadges", args: address ? [address] : undefined, query: { enabled: !!address } });
  const { data: total } = useReadContract({ address: ADDR, abi: ABI, functionName: "totalMinted" });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => { if (isSuccess) { refetch(); refetchMine(); } }, [isSuccess]);

  const myBadgeIds = new Set(myBadges?.map(b => Number(b.badgeTypeId)) ?? []);
  const fmtDate = (ts: bigint) => new Date(Number(ts) * 1000).toLocaleDateString();

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏅</span>
          <span className="font-bold text-lg">Arc Badge</span>
          <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">{total?.toString() ?? "0"} minted</span>
        </div>
        <ConnectButton />
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold bg-gradient-to-br from-yellow-300 to-amber-500 bg-clip-text text-transparent">Soulbound Badges 🏅</h1>
          <p className="text-gray-400">Claim achievement badges. Permanently yours. Non-transferable.</p>
        </div>

        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-2xl p-1">
          {(["all", "mine"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? "bg-yellow-600 text-white" : "text-gray-500 hover:text-gray-300"}`}>
              {t === "all" ? `🏅 All Badges (${badgeTypes?.length ?? 0})` : `👤 Mine (${myBadges?.length ?? 0})`}
            </button>
          ))}
        </div>

        {tab === "all" && (
          <div className="grid grid-cols-2 gap-4">
            {badgeTypes && badgeTypes.filter(b => b.active).map((badge, i) => {
              const owned = myBadgeIds.has(i);
              return (
                <div key={i} className={`bg-gray-900 rounded-2xl p-5 space-y-3 text-center border transition-all ${owned ? "border-yellow-500/50 bg-yellow-500/5" : "border-gray-800"}`}>
                  <div className="text-6xl">{badge.emoji}</div>
                  <div>
                    <p className="font-bold">{badge.name}</p>
                    <p className="text-gray-500 text-xs mt-1">{badge.description}</p>
                    <p className="text-gray-700 text-xs mt-1">{badge.totalMinted.toString()} claimed</p>
                  </div>
                  {owned ? (
                    <div className="flex items-center justify-center gap-1 text-yellow-400 text-sm font-semibold">
                      <span>✓</span><span>Owned</span>
                    </div>
                  ) : isConnected ? (
                    <button onClick={() => writeContract({ address: ADDR, abi: ABI, functionName: "claimBadge", args: [BigInt(i)] })} disabled={isPending} className="w-full py-2 rounded-xl bg-gradient-to-r from-yellow-600 to-amber-600 hover:opacity-90 disabled:opacity-40 text-sm font-bold">
                      {isPending ? "Claiming..." : "✨ Claim"}
                    </button>
                  ) : (
                    <p className="text-gray-600 text-xs">Connect wallet to claim</p>
                  )}
                </div>
              );
            })}
            {(!badgeTypes || badgeTypes.length === 0) && (
              <p className="col-span-2 text-center text-gray-600 py-12">No badges available yet. Check back soon!</p>
            )}
          </div>
        )}

        {tab === "mine" && (
          <div className="grid grid-cols-2 gap-4">
            {myBadges && myBadges.length > 0 ? myBadges.map((b, i) => {
              const type = badgeTypes?.[Number(b.badgeTypeId)];
              if (!type) return null;
              return (
                <div key={i} className="bg-gray-900 border border-yellow-500/30 rounded-2xl p-5 space-y-3 text-center">
                  <div className="text-6xl">{type.emoji}</div>
                  <p className="font-bold">{type.name}</p>
                  <p className="text-gray-500 text-xs">{type.description}</p>
                  <p className="text-yellow-600 text-xs">Claimed {fmtDate(b.mintedAt)}</p>
                  <div className="text-xs text-gray-700 bg-gray-800 rounded-lg px-2 py-1">🔒 Soulbound — non-transferable</div>
                </div>
              );
            }) : <p className="col-span-2 text-center text-gray-600 py-12">You haven't claimed any badges yet.</p>}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-800 py-4 text-center text-gray-600 text-sm">
        Built on Arc Network · <a href={`https://testnet.arcscan.app/address/${ADDR}`} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline">Contract</a>
      </footer>
    </div>
  );
}
