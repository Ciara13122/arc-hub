"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState, useEffect } from "react";

const ABI = [
  { inputs: [{ name: "room", type: "string" }, { name: "content", type: "string" }, { name: "emoji", type: "string" }], name: "sendMessage", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "room", type: "string" }, { name: "count", type: "uint256" }], name: "getRoomMessages", outputs: [{ components: [{ name: "sender", type: "address" }, { name: "content", type: "string" }, { name: "emoji", type: "string" }, { name: "timestamp", type: "uint256" }, { name: "room", type: "string" }], type: "tuple[]" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getRooms", outputs: [{ type: "string[]" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalMessages", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalRooms", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

const ADDR = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;
const EMOJIS = ["💬", "🔥", "👋", "😂", "❤️", "🚀", "💎", "🌟"];
const DEFAULT_ROOMS = ["general", "arc-builders", "defi", "nft", "random"];

export default function App() {
  const { isConnected } = useAccount();
  const [room, setRoom] = useState("general");
  const [content, setContent] = useState("");
  const [emoji, setEmoji] = useState("💬");
  const [customRoom, setCustomRoom] = useState("");

  const { data: rooms, refetch: refetchRooms } = useReadContract({ address: ADDR, abi: ABI, functionName: "getRooms" });
  const { data: messages, refetch } = useReadContract({ address: ADDR, abi: ABI, functionName: "getRoomMessages", args: [room, BigInt(30)] });
  const { data: total } = useReadContract({ address: ADDR, abi: ABI, functionName: "totalMessages" });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => { if (isSuccess) { refetch(); refetchRooms(); setContent(""); } }, [isSuccess]);

  const allRooms = [...new Set([...DEFAULT_ROOMS, ...(rooms || [])])];
  const fmt = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
  const fmtTime = (ts: bigint) => new Date(Number(ts) * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const handleSend = () => {
    if (!content.trim()) return;
    writeContract({ address: ADDR, abi: ABI, functionName: "sendMessage", args: [room, content, emoji] });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💬</span>
          <span className="font-bold text-lg">Arc Chat</span>
          <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">{total?.toString() ?? "0"} messages</span>
        </div>
        <ConnectButton />
      </header>

      <div className="flex flex-1 max-w-4xl mx-auto w-full">
        {/* Sidebar rooms */}
        <aside className="w-48 border-r border-gray-800 p-4 space-y-1 shrink-0">
          <p className="text-xs text-gray-600 uppercase font-semibold mb-3">Rooms</p>
          {allRooms.map(r => (
            <button key={r} onClick={() => setRoom(r)} className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${room === r ? "bg-emerald-600 text-white" : "text-gray-400 hover:bg-gray-800"}`}>
              # {r}
            </button>
          ))}
          <div className="pt-3 border-t border-gray-800">
            <input value={customRoom} onChange={e => setCustomRoom(e.target.value.toLowerCase().replace(/\s/g, "-"))} placeholder="new-room" maxLength={30} className="w-full bg-gray-800 rounded-lg px-2 py-1.5 text-xs outline-none border border-gray-700 focus:border-emerald-500" />
            <button onClick={() => { if (customRoom) { setRoom(customRoom); setCustomRoom(""); } }} className="w-full mt-1 text-xs text-emerald-400 hover:underline">+ Join</button>
          </div>
        </aside>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          <div className="border-b border-gray-800 px-4 py-3">
            <span className="font-semibold text-emerald-400"># {room}</span>
            <span className="text-gray-600 text-sm ml-2">on-chain forever</span>
          </div>

          <div className="flex-1 p-4 space-y-3 overflow-y-auto" style={{ maxHeight: "calc(100vh - 250px)" }}>
            {messages && messages.length > 0
              ? [...messages].reverse().map((msg, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs shrink-0 border border-gray-700">{msg.emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <a href={`https://testnet.arcscan.app/address/${msg.sender}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 text-sm font-semibold hover:underline font-mono">{fmt(msg.sender)}</a>
                      <span className="text-gray-700 text-xs">{fmtTime(msg.timestamp)}</span>
                    </div>
                    <p className="text-gray-200 text-sm mt-0.5">{msg.content}</p>
                  </div>
                </div>
              ))
              : <p className="text-center text-gray-600 py-12">No messages in #{room} yet. Say something!</p>}
          </div>

          {isConnected ? (
            <div className="border-t border-gray-800 p-4 space-y-3">
              <div className="flex gap-2 flex-wrap">{EMOJIS.map(e => <button key={e} onClick={() => setEmoji(e)} className={`text-xl p-1.5 rounded-lg transition-all ${emoji === e ? "bg-emerald-500/30 ring-2 ring-emerald-500" : "hover:bg-gray-800"}`}>{e}</button>)}</div>
              <div className="flex gap-2">
                <span className="text-2xl">{emoji}</span>
                <input value={content} onChange={e => setContent(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} placeholder="Type a message..." maxLength={300} className="flex-1 bg-gray-800 rounded-xl px-4 py-2.5 outline-none border border-gray-700 focus:border-emerald-500 text-sm" />
                <button onClick={handleSend} disabled={!content.trim() || isPending} className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm">
                  {isPending ? "..." : "Send"}
                </button>
              </div>
            </div>
          ) : (
            <div className="border-t border-gray-800 p-4 text-center text-gray-500 text-sm">Connect wallet to send messages</div>
          )}
        </div>
      </div>

      <footer className="border-t border-gray-800 py-3 text-center text-gray-600 text-xs">
        Built on Arc Network · <a href={`https://testnet.arcscan.app/address/${ADDR}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">Contract</a>
      </footer>
    </div>
  );
}
