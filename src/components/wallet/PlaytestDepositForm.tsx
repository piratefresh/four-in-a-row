import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const MAX_PLAYTEST_DEPOSIT = 100_000;
export const MIN_PLAYTEST_DEPOSIT = 1;

function formatBalance(amount: number): string {
  return amount.toLocaleString();
}

function isValidDeposit(amount: number): boolean {
  return (
    Number.isInteger(amount) &&
    amount >= MIN_PLAYTEST_DEPOSIT &&
    amount <= MAX_PLAYTEST_DEPOSIT
  );
}

export function PlaytestDepositForm({
  onDeposit,
}: {
  onDeposit: (
    amount: number,
    operationId: string,
  ) => Promise<{ balance: number; status: "applied" | "already_processed" }>;
}) {
  const [depositAmount, setDepositAmount] = useState("");
  const [isPending, startTransition] = useTransition();

  const parsedAmount = parseInt(depositAmount, 10);
  const isValid = isValidDeposit(parsedAmount);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValid || isPending) return;
    const operationId = crypto.randomUUID();
    startTransition(async () => {
      try {
        const result = await onDeposit(parsedAmount, operationId);
        if (result.status === "applied") {
          toast.success(`Added ${formatBalance(parsedAmount)} playtest coins`);
          setDepositAmount("");
        } else {
          toast.warning("Deposit was already processed");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to deposit coins";
        toast.error(msg);
      }
    });
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-3 items-center">
        <Input
          type="number"
          inputMode="numeric"
          placeholder={"Amount (1\u2013100,000)"}
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          className="border-cream/15 bg-felt-deep text-cream placeholder:text-game-muted focus-visible:ring-gold"
        />
        <Button
          type="submit"
          variant="primary"
          disabled={!isValid || isPending}
        >
          {isPending ? "Depositing..." : "Deposit"}
        </Button>
      </form>
      {depositAmount !== "" && !isValid && (
        <p className="mt-2 text-xs text-game-red">
          Enter a whole number between 1 and 100,000.
        </p>
      )}
    </div>
  );
}
