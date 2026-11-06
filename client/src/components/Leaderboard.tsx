import { useAppStore } from "@/utils/store";

type LeaderboardProps = {
  final: boolean;
};

const Leaderboard = ({ final }: LeaderboardProps) => {
  const { gameRoom, playerScores, finalScores, playerNames, playerStatus } =
    useAppStore();
  if (!gameRoom) return null;
  // The final board lists players who finished or are still mid-round;
  // anyone who never started this round has no result to show.
  const ranked = Object.entries(final ? finalScores : playerScores)
    .filter(
      ([id, score]) =>
        !final ||
        score >= 0 ||
        playerStatus[id] !== "idle" ||
        id === gameRoom.sessionId,
    )
    .sort((a, b) => b[1] - a[1]);

  return (
    <section className="w-full max-w-sm text-left" aria-label="Room scores">
      <ol className="divide-line border-line divide-y border-y">
        {ranked.map(([id, score], index) => {
          const isYou = id === gameRoom.sessionId;
          return (
            <li
              key={id}
              className={`flex items-baseline gap-4 py-2.5 text-lg ${isYou ? "text-paper" : "text-muted"}`}
            >
              <span className="font-display w-5 tabular-nums">{index + 1}</span>
              <span className="flex-1 truncate">
                {playerNames[id] ?? id}
                {isYou && <span className="text-muted"> (you)</span>}
              </span>
              <span className="font-display text-paper tabular-nums">
                {score === -1 ? "still playing" : score}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-muted mt-3 text-sm">Room {gameRoom.roomId}</p>
    </section>
  );
};

export default Leaderboard;
