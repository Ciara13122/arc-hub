"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState, useEffect } from "react";
import { parseEther, formatEther } from "viem";

const ABI = [
  { inputs: [{ name: "name", type: "string" }, { name: "description", type: "string" }, { name: "emoji", type: "string" }, { name: "startPrice", type: "uint256" }, { name: "durationHours", type: "uint256" }], name: "listItem", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "itemId", type: "uint256" }], name: "bid", outputs: [], stateMutability: "payable", type: "function" },
  { inputs: [{ name: "itemId", type: "uint256" }], name: "settle", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "withdraw", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "offset", type: "uint256" }, { name: "limit", type: "uint256" }], name: "getActive", outputs: [{ components: [{ name: "seller", type: "address" }, { name: "name", type: "string" }, { name: "description", type: "string" }, { name: "emoji", type: "string" }, { name: "startPrice", type: "uint256" }, { name: "currentBid", type: "uint256" }, { name: "highestBidder", type: "address" }, { name: "endTime", type: "uint256" }, { name: "settled", type: "bool" }], name: "result", type: "tuple[]" }, { name: "total", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "offset", type: "uint256" }, { name: "limit", type: "uint256" }], name: "getAll", outputs: [{ components: [{ name: "seller", type: "address" }, { name: "name", type: "string" }, { name: "description", type: "string" }, { name: "emoji", type: "string" }, { name: "startPrice", type: "uint256" }, { name: "currentBid", type: "uint256" }, { name: "highestBidder", type: "address" }, { name: "endTime", type: "uint256" }, { name: "settled", type: "bool" }], name: "result", type: "tuple[]" }, { name: "total", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "", type: "address" }], name: "pendingReturns", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalItems", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

const ADDR = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;
const EMOJIS = ["🏺", "💎", "🎨", "🏆", "🦋", "🔮", "🌟", "🎭", "🏅", "🗿"];

export default function App() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<"live" | "list">("live");
  const [name, setName] = useState(""); const [desc, setDesc] = useState(""); const [emoji, setEmoji] = useState("🏺");
  const [startPrice, setStartPrice] = useState("0.001"); const [duration, setDuration] = useState("24");
  const [bidAmounts, setBidAmounts] = useState<Record<number, string>>({});

  const { data: total, refetch: refetchTotal } = useReadContract({ address: ADDR, abi: ABI, functionName: "totalItems" });
  const { data: activeData, refetch } = useReadContract({ address: ADDR, abi: ABI, functionName: "getActive", args: [BigInt(0), BigInt(10)] });
  const { data: pending, refetch: refetchPending } = useReadContract({ address: ADDR, abi: ABI, functionName: "pendingReturns", args: address ? [address] : undefined, query: { enabled: !!address } });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => { if (isSuccess) { refetch(); refetchTotal(); refetchPending(); setName(""); setDesc(""); setTab("live"); } }, [isSuccess]);

  const activeItems = activeData?.[0] ?? [];
  const fmt = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
  const timeLeft = (endTime: bigint) => {
    const diff = Number(endTime) - Math.floor(Date.now() / 1000);
    if (diff <= 0) return "⏰ Ended";
    const h = Math.floor(diff / 3600); const m = Math.floor((diff % 3600) / 60);
    return `${h}h ${m}m left`;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⏰</span>
          <span className="font-bold text-lg">Arc Auction</span>
          <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">{total?.toString() ?? "0"} items</span>
        </div>
        <ConnectButton />
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold bg-gradient-to-br from-amber-300 to-orange-500 bg-clip-text text-transparent">On-Chain Auction ⏰</h1>
          <p className="text-gray-400">Bid on items with USDC. Winner takes the pot. Losers withdraw instantly.</p>
        </div>

        {/* Pending withdrawal banner */}
        {pending && pending > 0n && (
          <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-4">
            <div>
              <p className="font-semibold text-amber-400">💰 You have {formatEther(pending)} USDC to withdraw</p>
              <p className="text-gray-500 text-xs mt-0.5">From a previous outbid</p>
            </div>
            <button onClick={() => writeContract({ address: ADDR, abi: ABI, functionName: "withdraw" })} disabled={isPending} className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 font-semibold text-sm">
              Withdraw
            </button>
          </div>
        )}

        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-2xl p-1">
          {(["live", "list"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? "bg-amber-600 text-white" : "text-gray-500 hover:text-gray-300"}`}>
              {t === "live" ? `🔴 Live (${activeItems.length})` : "➕ List Item"}
            </button>
          ))}
        </div>

        {tab === "list" && isConnected && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            <div className="flex gap-2 flex-wrap">{EMOJIS.map(e => <button key={e} onClick={() => setEmoji(e)} className={`text-2xl p-2 rounded-xl transition-all ${emoji === e ? "bg-amber-500/30 ring-2 ring-amber-500 scale-110" : "hover:bg-gray-800"}`}>{e}</button>)}</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Item name..." maxLength={50} className="w-full bg-gray-800 rounded-xl px-4 py-3 outline-none border border-gray-700 focus:border-amber-500" />
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description..." maxLength={200} className="w-full bg-gray-800 rounded-xl px-4 py-3 outline-none border border-gray-700 focus:border-amber-500" />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-gray-500 text-xs mb-1 block">Start Price (USDC)</label>
                <input value={startPrice} onChange={e => setStartPrice(e.target.value)} type="number" step="0.001" min="0.001" className="w-full bg-gray-800 rounded-xl px-4 py-3 outline-none border border-gray-700 focus:border-amber-500" />
              </div>
              <div className="flex-1">
                <label className="text-gray-500 text-xs mb-1 block">Duration (hours)</label>
                <input value={duration} onChange={e => setDuration(e.target.value)} type="number" min="1" max="168" className="w-full bg-gray-800 rounded-xl px-4 py-3 outline-none border border-gray-700 focus:border-amber-500" />
              </div>
            </div>
            <button onClick={() => writeContract({ address: ADDR, abi: ABI, functionName: "listItem", args: [name, desc, emoji, parseEther(startPrice || "0.001"), BigInt(duration || "24")] })} disabled={!name || isPending} className="w-full py-3 font-bold rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
              {isPending ? "Listing..." : "⏰ List for Auction"}
            </button>
          </div>
        )}
        {tab === "list" && !isConnected && <p className="text-center text-gray-500 py-8">Connect wallet to list an item</p>}

        {tab === "live" && (
          <div className="space-y-4">
            {activeItems.length > 0 ? activeItems.map((item, i) => (
              <div key={i} className="bg-gray-900 border border-amber-500/20 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{item.emoji}</span>
                  <div className="flex-1">
                    <p className="font-bold text-lg">{item.name}</p>
                    <p className="text-gray-500 text-sm">{item.description}</p>
                    <p className="text-gray-600 text-xs mt-1">by {fmt(item.seller)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-amber-400 font-bold text-xl">{formatEther(item.currentBid)} USDC</p>
                    <p className="text-gray-600 text-xs">{timeLeft(item.endTime)}</p>
                  </div>
                </div>
                {item.highestBidder !== "0x0000000000000000000000000000000000000000" && (
                  <p className="text-xs text-gray-600">Top bidder: <span className="text-amber-400 font-mono">{fmt(item.highestBidder)}</span></p>
                )}
                {isConnected && item.seller.toLowerCase() !== address?.toLowerCase() && (
                  <div className="flex gap-2">
                    <input value={bidAmounts[i] ?? ""} onChange={e => setBidAmounts(b => ({ ...b, [i]: e.target.value }))} type="number" step="0.001" placeholder={`> ${formatEther(item.currentBid)}`} className="flex-1 bg-gray-800 rounded-xl px-3 py-2.5 outline-none border border-gray-700 focus:border-amber-500 text-sm" />
                    <button onClick={() => writeContract({ address: ADDR, abi: ABI, functionName: "bid", args: [BigInt(i)], value: parseEther(bidAmounts[i] || "0") })} disabled={isPending} className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 font-semibold text-sm">Bid</button>
                  </div>
                )}
              </div>
            )) : <p className="text-center text-gray-600 py-12">No live auctions. List something!</p>}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-800 py-4 text-center text-gray-600 text-sm">
        Built on Arc Network · <a href={`https://testnet.arcscan.app/address/${ADDR}`} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">Contract</a>
      </footer>
    </div>
  );
}
