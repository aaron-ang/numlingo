import { toast } from "react-toastify";

// Shown in every room so friends can join it, public or private.
const RoomCode = ({ code }: { code: string }) => {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Room code copied.");
    } catch {
      toast.info(`Room code: ${code}`);
    }
  };

  return (
    <p className="text-muted mb-6 flex items-center gap-3 text-base">
      Room code
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy room code ${code}`}
        title="Copy"
        className="font-display text-paper border-rule hover:border-paper rounded-lg border px-3 py-1 text-xl tracking-[0.2em] transition-colors"
      >
        {code}
      </button>
    </p>
  );
};

export default RoomCode;
