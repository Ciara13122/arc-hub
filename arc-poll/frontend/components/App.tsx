"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState, useEffect } from "react";

const ABI = [
  { inputs: [{ name: "question", type: "string" }, { name: "emoji", type: "string" }, { name: "opts", type: "string[]" }], name: "createPoll", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "pollId", type: "uint256" }, { name: "optionId", type: "uint256" }], name: "vote", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "pollId", type: "uint256" }], name: "getOptions", outputs: [{ components: [{ name: "text", type: "string" }, { name: "votes", type: "uint256" }], type: "tuple[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "count", type: "uint256" }], name: "getRecent", outputs: [{ components: [{ name: "creator", type: "address" }, { name: "question", type: "string" }, { name: "emoji", type: "string" }, { name: "createdAt", type: "uint256" }, { name: "totalVotes", type: "uint256" }, { name: "optionCount", type: "uint256" }], type: "tuple[]" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalPolls", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

const ADDR = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;
const EMOJIS = ["🗳️", "🔥", "💡", "❓", "🌍", "🎯", "⚡", "🤔"];

export default function App() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<"polls" | "create">("polls");
  const [question, setQuestion] = useState("");
  const [emoji, setEmoji] = useState("🗳️");
  const [opts, setOpts] = useState(["", ""]);
  const [selectedPoll, setSelectedPoll] = useState<number | null>(null);
  const [voted, setVoted] = useState<Record<number, number>>({});

  const { data: total, refetch: refetchTotal } = useReadContract({ address: ADDR, abi: ABI, functionName: "totalPolls" });
  const { data: polls, refetch } = useReadContract({ address: ADDR, abi: ABI, functionName: "getRecent", args: [BigInt(20)] });
  const { data: pollOptions } = useReadContract({ address: ADDR, abi: ABI, functionName: "getOptions", args: selectedPoll !== null ? [BigInt(selectedPoll)] : undefined, query: { enabled: selectedPoll !== null } });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => { if (isSuccess) { refetch(); refetchTotal(); setQuestion(""); setOpts(["", ""]); setTab("polls"); } }, [isSuccess]);

  const handleCreate = () => {
    const validOpts = opts.filter(o => o.trim().length > 0);
    if (validOpts.length < 2) return;
    writeContract({ address: ADDR, abi: ABI, functionName: "createPoll", args: [question, emoji, validOpts] });
  };

  const handleVote = (pollIndex: number, optIndex: number) => {
    // pollIndex is from getRecent (reversed), need real pollId
    const realId = Number(total!) - 1 - pollIndex;
    writeContract({ address: ADDR, abi: ABI, functionName: "vote", args: [BigInt(realId), BigInt(optIndex)] });
    setVoted(v => ({ ...v, [pollIndex]: optIndex }));
  };

  const fmt = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🗳️</span>
          <span className="font-bold text-lg">Arc Poll</span>
          <span className="text-xs bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full">{total?.toString() ?? "0"} polls</span>
        </div>
        <ConnectButton />
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold bg-gradient-to-br from-violet-300 to-purple-500 bg-clip-text text-transparent">On-Chain Polls 🗳️</h1>
          <p className="text-gray-400">Every vote is transparent and permanent on Arc Network.</p>
        </div>

        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-2xl p-1">
          {(["polls", "create"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? "bg-violet-600 text-white" : "text-gray-500 hover:text-gray-300"}`}>
              {t === "polls" ? "📋 Browse Polls" : "✏️ Create Poll"}
            </button>
          ))}
        </div>

        {tab === "create" && isConnected && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            <div className="flex gap-2 flex-wrap">{EMOJIS.map(e => <button key={e} onClick={() => setEmoji(e)} className={`text-2xl p-2 rounded-xl transition-all ${emoji === e ? "bg-violet-500/30 ring-2 ring-violet-500 scale-110" : "hover:bg-gray-800"}`}>{e}</button>)}</div>
            <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Your question..." maxLength={200} className="w-full bg-gray-800 rounded-xl px-4 py-3 outline-none border border-gray-700 focus:border-violet-500" />
            {opts.map((o, i) => (
              <div key={i} className="flex gap-2">
                <input value={o} onChange={e => { const n = [...opts]; n[i] = e.target.value; setOpts(n); }} placeholder={`Option ${i + 1}`} maxLength={100} className="flex-1 bg-gray-800 rounded-xl px-4 py-3 outline-none border border-gray-700 focus:border-violet-500" />
                {i >= 2 && <button onClick={() => setOpts(opts.filter((_, j) => j !== i))} className="text-gray-600 hover:text-red-400 px-2">✕</button>}
              </div>
            ))}
            {opts.length < 4 && <button onClick={() => setOpts([...opts, ""])} className="text-violet-400 text-sm hover:underline">+ Add option</button>}
            <button onClick={handleCreate} disabled={!question || opts.filter(o => o.trim()).length < 2 || isPending} className="w-full py-3 font-bold rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
              {isPending ? "Creating..." : "🗳️ Create Poll"}
            </button>
          </div>
        )}

        {tab === "create" && !isConnected && <p className="text-center text-gray-500 py-8">Connect wallet to create a poll</p>}

        {tab === "polls" && (
          <div className="space-y-4">
            {polls && polls.length > 0 ? polls.map((poll, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{poll.emoji}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{poll.question}</p>
                    <p className="text-gray-600 text-xs mt-1">{fmt(poll.creator)} · {poll.totalVotes.toString()} votes</p>
                  </div>
                </div>
                <PollOptions pollIndex={i} totalSupply={Number(total ?? 0)} addr={ADDR} abi={ABI} voted={voted[i]} onVote={isConnected ? (optIdx) => handleVote(i, optIdx) : undefined} />
              </div>
            )) : <p className="text-center text-gray-600 py-12">No polls yet. Create the first one!</p>}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-800 py-4 text-center text-gray-600 text-sm">
        Built on Arc Network · <a href={`https://testnet.arcscan.app/address/${ADDR}`} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">Contract</a>
      </footer>
    </div>
  );
}

function PollOptions({ pollIndex, totalSupply, addr, abi, voted, onVote }: { pollIndex: number; totalSupply: number; addr: `0x${string}`; abi: any; voted?: number; onVote?: (i: number) => void }) {
  const realId = totalSupply - 1 - pollIndex;
  const { data: options } = useReadContract({ address: addr, abi, functionName: "getOptions", args: [BigInt(realId >= 0 ? realId : 0)], query: { enabled: realId >= 0 } });
  if (!options) return <div className="text-gray-700 text-sm">Loading options...</div>;
  const total = options.reduce((s, o) => s + Number(o.votes), 0);
  return (
    <div className="space-y-2">
      {options.map((opt, i) => {
        const pct = total > 0 ? Math.round((Number(opt.votes) / total) * 100) : 0;
        const isVoted = voted === i;
        return (
          <button key={i} onClick={() => onVote?.(i)} disabled={voted !== undefined || !onVote} className={`w-full text-left rounded-xl overflow-hidden border transition-all ${isVoted ? "border-violet-500" : "border-gray-700 hover:border-violet-500/50"}`}>
            <div className="relative px-4 py-3">
              <div className="absolute inset-0 bg-violet-500/20 transition-all" style={{ width: `${pct}%` }} />
              <div className="relative flex justify-between items-center">
                <span className="font-medium">{opt.text}</span>
                <span className="text-gray-400 text-sm">{pct}%</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
