export function Logo({ suffix }: { suffix?: string }) {
  return (
    <span className="inline-flex items-baseline gap-2 text-[17px] leading-none font-semibold tracking-tight sm:text-xl">
      <span>
        eaternity<span className="text-accent">.</span>
      </span>
      {suffix && (
        <span className="text-[13px] font-medium tracking-normal text-stone-400 sm:text-sm">{suffix}</span>
      )}
    </span>
  );
}
