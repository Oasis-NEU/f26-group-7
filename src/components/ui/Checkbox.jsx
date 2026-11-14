// A checkbox with its label beside it. The whole row is clickable.
export default function Checkbox({ label, ...props }) {
  return (
    <label className="inline-flex items-center gap-2.5 text-[15px]">
      <input type="checkbox" className="size-5 accent-ink" {...props} />
      {label}
    </label>
  )
}
