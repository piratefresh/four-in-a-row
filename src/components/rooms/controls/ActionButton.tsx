type ActionButtonProps = {
  variant: "check" | "call" | "raise" | "fold" | "submit";
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
};

const VARIANT_STYLES = {
  check: "bg-emerald-600 text-white hover:bg-emerald-700",
  call: "bg-blue-600 text-white hover:bg-blue-700",
  raise: "bg-amber-600 text-white hover:bg-amber-700",
  fold: "bg-rose-600 text-white hover:bg-rose-700",
  submit: "bg-[#d9d9d9] text-[#111111] hover:bg-[#ececec]",
};

export function ActionButton({
  variant,
  onClick,
  disabled,
  children,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex w-fit self-center justify-self-center px-2 py-1 rounded-md
        hover:-translate-y-0.5 active:translate-y-0
        disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-y-0 disabled:shadow-none
        ${VARIANT_STYLES[variant]}
      `}
    >
      {children}
    </button>
  );
}
