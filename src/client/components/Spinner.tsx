export function Spinner() {
  return (
    <div className="grid min-h-[40vh] place-items-center" role="status" aria-label="Loading">
      <span className="size-5 animate-spin rounded-full border-2 border-stone-200 border-t-stone-900" />
    </div>
  );
}
