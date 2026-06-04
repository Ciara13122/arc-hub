"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState, useEffect } from "react";
import { parseEther, formatEther } from "viem";

const ABI = [
  { inputs: [{ name: "move", type: "uint8" }], name: "createMatch", outputs: [], stateMutability: "payable", type: "function" },
  { inputs: [{ name: "matchId", type: "uint256" }, { name: "move", type: "uint8" }], name: "joinMatch", outputs: [], stateMutability: "payable", type: "function" },
  { inputs: [], name: "withdraw", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "limit", type: "uint256" }], name: "getOpen", outputs: [{ components: [{ name: "player", type: "address" }, { name: "opponent", type: "address" }, { name: "playerMove", type: "uint8" }, { name: "opponentMove", type: "uint8" }, { name: "stake", type: "uint256" }, { name: "result", type: "uint8" }, { name: "createdAt", type: "uint256" }, { name: "opponentMoved", type: "bool" }], name: "result", type: "tuple[]" }, { name: "ids", type: "uint256[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "count", type: "uint256" }], name: "getRecent", outputs: [{ components: [{ name: "player", type: "address" }, { name: "opponent", type: "address" }, { name: "playerMove", type: "uint8" }, { name: "opponentMove", type: "uint8" }, { name: "stake", type: "uint256" }, { name: "result", type: "uint8" }, { name: "createdAt", type: "uint256" }, { name: "opponentMoved", type: "bool" }], type: "tuple[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "user", type: "address" }], name: "getStats", outputs: [{ name: "w", type: "uint256" }, { name: "l", type: "uint256" }, { name: "d", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "", type: "address" }], name: "pendingWins", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalGames", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

const ADDR = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;
const MOVES = [{ emoji: "🪨", name: "Rock" }, { emoji: "📄", name: "Paper" }, { emoji: "✂️", name: "Scissors" }];
const RESULTS = ["⏳ Pending", "🏆 Player Win", "🏆 Opponent Win", "🤝 Draw"];
const RESULT_COLORS = ["text-gray-500", "text-green-400", "text-red-400", "text-yellow-400"];

export default function App() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<"play" | "open" | "history">("play");
  const [selectedMove, setSelectedMove] = useState<number | null>(null);
  const [stake, setStake] = useState("0.001");
  const [joinMove, setJoinMove] = useState<number | null>(null);
  const [joiningId, setJoiningId] = useState<number | null>(null);

  const { data: total, refetch: refetchTotal } = useReadContract({ address: ADDR, abi: ABI, functionName: "totalGames" });
  const { data: openData, refetch: refetchOpen } = useReadContract({ address: ADDR, abi: ABI, functionName: "getOpen", args: [BigInt(10)] });
  const { data: recent, refetch: refetchRecent } = useReadContract({ address: ADDR, abi: ABI, functionName: "getRecent", args: [BigInt(10)] });
  const { data: stats } = useReadContract({ address: ADDR, abi: ABI, functionName: "getStats", args: address ? [address] : undefined, query: { enabled: !!address } });
  const { data: pendingWin, refetch: refetchPending } = useReadContract({ address: ADDR, abi: ABI, functionName: "pendingWins", args: address ? [address] : undefined, query: { enabled: !!address } });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) { refetchOpen(); refetchRecent(); refetchTotal(); refetchPending(); setSelectedMove(null); setJoinMove(null); setJoiningId(null); }
  }, [isSuccess]);

  const [openMatches, openIds] = openData ?? [[], []];
  const fmt = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎮</span>
          <span className="font-bold text-lg">Arc Game</span>
          <span className="text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full">{total?.toString() ?? "0"} games</span>
        </div>
        <ConnectButton />
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold bg-gradient-to-br from-cyan-300 to-blue-500 bg-clip-text text-transparent">Rock Paper Scissors 🎮</h1>
          <p className="text-gray-400">On-chain. Stake USDC. Winner withdraws the pot.</p>
        </div>

        {/* Pending win banner */}
        {pendingWin && pendingWin > 0n && (
          <div className="flex items-center justify-between bg-cyan-500/10 border border-cyan-500/30 rounded-2xl px-5 py-4">
            <div>
              <p className="font-semibold text-cyan-400">🏆 You won {formatEther(pendingWin)} USDC!</p>
              <p className="text-gray-500 text-xs mt-0.5">Click to withdraw your winnings</p>
            </div>
            <button onClick={() => writeContract({ address: ADDR, abi: ABI, functionName: "withdraw" })} disabled={isPending} className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 font-semibold text-sm">
              Withdraw
            </button>
          </div>
        )}

        {isConnected && stats && (
          <div className="flex gap-4 justify-center">
            {([["🏆", "Wins", stats[0]], ["💀", "Losses", stats[1]], ["🤝", "Draws", stats[2]]] as const).map(([icon, label, val]) => (
              <div key={String(label)} className="bg-gray-900 border border-gray-800 rounded-2xl px-6 py-3 text-center">
                <div className="text-2xl">{icon}</div>
                <div className="text-2xl font-bold">{String(val)}</div>
                <div className="text-gray-600 text-xs">{label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-2xl p-1">
          {(["play", "open", "history"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? "bg-cyan-600 text-white" : "text-gray-500 hover:text-gray-300"}`}>
              {t === "play" ? "⚔️ New Game" : t === "open" ? `🎯 Join (${openMatches.length})` : "📜 History"}
            </button>
          ))}
        </div>

        {tab === "play" && isConnected && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-5">
            <p className="text-gray-400 text-sm text-center">🔒 Your move is hidden until opponent joins</p>
            <div className="flex gap-4 justify-center">
              {MOVES.map((m, i) => (
                <button key={i} onClick={() => setSelectedMove(i)} className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 text-5xl transition-all hover:scale-105 ${selectedMove === i ? "border-cyan-500 bg-cyan-500/20 scale-110" : "border-gray-700 hover:border-cyan-500/50"}`}>
                  {m.emoji}
                  <span className="text-xs text-gray-500 font-medium">{m.name}</span>
                </button>
              ))}
            </div>
            <div>
              <label className="text-gray-500 text-xs mb-1 block">Stake (USDC) — winner gets 2×</label>
              <input value={stake} onChange={e => setStake(e.target.value)} type="number" step="0.001" min="0.001" className="w-full bg-gray-800 rounded-xl px-4 py-3 outline-none border border-gray-700 focus:border-cyan-500" />
              <p className="text-gray-600 text-xs mt-1">Pot: <span className="text-cyan-400 font-bold">{stake ? (Number(stake) * 2).toFixed(3) : "0"} USDC</span></p>
            </div>
            <button onClick={() => selectedMove !== null && writeContract({ address: ADDR, abi: ABI, functionName: "createMatch", args: [selectedMove as 0 | 1 | 2], value: parseEther(stake || "0") })} disabled={selectedMove === null || isPending} className="w-full py-3 font-bold rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
              {isPending ? "Creating..." : "⚔️ Create Match"}
            </button>
          </div>
        )}
        {tab === "play" && !isConnected && <p className="text-center text-gray-500 py-8">Connect wallet to play</p>}

        {tab === "open" && (
          <div className="space-y-4">
            {openMatches.length > 0 ? openMatches.map((match, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Creator: <span className="text-cyan-400 font-mono">{fmt(match.player)}</span></p>
                    <p className="text-gray-600 text-xs">Stake: <span className="text-white font-bold">{formatEther(match.stake)} USDC</span> · Pot: <span className="text-cyan-400 font-bold">{(Number(formatEther(match.stake)) * 2).toFixed(3)} USDC</span></p>
                  </div>
                  <span className="text-3xl">🎮</span>
                </div>
                {isConnected && match.player.toLowerCase() !== address?.toLowerCase() && (
                  <div className="space-y-3">
                    <p className="text-gray-500 text-sm font-medium">Pick your move to join:</p>
                    <div className="flex gap-3 justify-center">
                      {MOVES.map((m, mi) => (
                        <button key={mi} onClick={() => { setJoiningId(i); setJoinMove(mi); }} className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-3xl transition-all ${joiningId === i && joinMove === mi ? "border-cyan-500 bg-cyan-500/20" : "border-gray-700 hover:border-cyan-500/50"}`}>
                          {m.emoji}<span className="text-xs text-gray-500">{m.name}</span>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => joiningId === i && joinMove !== null && writeContract({ address: ADDR, abi: ABI, functionName: "joinMatch", args: [openIds[i], BigInt(joinMove)], value: match.stake })} disabled={joiningId !== i || joinMove === null || isPending} className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 font-bold text-sm">
                      {isPending ? "Playing..." : "⚔️ Join & Play"}
                    </button>
                  </div>
                )}
              </div>
            )) : <p className="text-center text-gray-600 py-12">No open matches. Create one!</p>}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-3">
            {recent && recent.filter(m => m.opponentMoved).length > 0
              ? recent.filter(m => m.opponentMoved).map((match, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{MOVES[match.playerMove]?.emoji}</span>
                    <span className="text-gray-600 text-sm">vs</span>
                    <span className="text-2xl">{MOVES[match.opponentMove]?.emoji}</span>
                    <div className="ml-1">
                      <p className="text-xs text-gray-500 font-mono">{fmt(match.player)} vs {fmt(match.opponent)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatEther(match.stake)} USDC</p>
                    <p className={`text-xs font-medium ${RESULT_COLORS[match.result]}`}>{RESULTS[match.result]}</p>
                  </div>
                </div>
              ))
              : <p className="text-center text-gray-600 py-12">No completed matches yet.</p>}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-800 py-4 text-center text-gray-600 text-sm">
        Built on Arc Network · <a href={`https://testnet.arcscan.app/address/${ADDR}`} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Contract</a>
      </footer>
    </div>
  );
}
