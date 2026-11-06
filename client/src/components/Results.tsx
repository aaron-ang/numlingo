import Leaderboard from "./Leaderboard";
import { useAppStore } from "@/utils/store";

const Results = () => {
  const {
    solved,
    incorrect,
    attempted,
    gameRoom,
    playerNames,
    playerStatus,
    resetSolved,
    resetIncorrect,
    setIsCompleted,
    resetAttempted,
    setFinalScores,
  } = useAppStore();

  const accuracy =
    attempted > 0 ? `${Math.floor((solved / attempted) * 100)}%` : "–";
  const missed = Object.entries(incorrect).sort(
    (a, b) => b[1].count - a[1].count,
  );

  // The server only starts a new room round once nobody is mid-round.
  const waiting =
    gameRoom !== null &&
    Object.entries(playerStatus).some(
      ([id, status]) => id !== gameRoom.sessionId && status === "playing",
    );

  const playAgain = () => {
    resetSolved();
    resetAttempted();
    resetIncorrect();
    // Everyone still in the room starts the next round unfinished.
    setFinalScores(
      Object.fromEntries(Object.keys(playerNames).map((id) => [id, -1])),
    );
    setIsCompleted(false);
  };

  return (
    <div className="flex w-full flex-col items-center gap-12">
      <div className="grid w-full gap-10 text-center sm:grid-cols-2 sm:text-left">
        <div>
          <p className="text-muted text-lg">Solved</p>
          <p className="font-display text-saffron text-7xl font-semibold tabular-nums">
            {solved}
          </p>
          <p className="text-muted mt-2 text-lg">
            {attempted > 0
              ? `${accuracy} accuracy over ${attempted} ${attempted === 1 ? "answer" : "answers"}`
              : "No answers submitted"}
          </p>
        </div>

        <div>
          <p className="text-muted text-lg">Missed numbers</p>
          {missed.length === 0 ? (
            <p className="text-paper mt-3 text-lg">
              {attempted > 0
                ? "None. Every answer was right."
                : "Nothing to review yet."}
            </p>
          ) : (
            <ul className="divide-line border-line mt-3 divide-y border-y text-left">
              {missed.map(([prompt, { number, count }]) => (
                <li
                  key={prompt}
                  className="text-paper flex items-baseline gap-4 py-2 text-lg"
                >
                  <span className="flex-1">{prompt}</span>
                  {count > 1 && (
                    <span className="text-coral tabular-nums">×{count}</span>
                  )}
                  <span className="font-display text-saffron w-[3ch] text-right text-xl tabular-nums">
                    {number}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {gameRoom && <Leaderboard final />}

      <button
        type="button"
        onClick={playAgain}
        disabled={waiting}
        autoFocus
        className="bg-saffron text-ink rounded-full px-6 py-2.5 text-lg font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        {waiting ? "Waiting for others to finish…" : "Play again"}
      </button>
    </div>
  );
};

export default Results;
