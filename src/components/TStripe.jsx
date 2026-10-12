// The 8px stripe across the very top: one block per T line.
export default function TStripe() {
    return <div className="h-2 bg-ink" aria-hidden="true" />
  /* return (
    <div className="grid h-2 grid-cols-4" aria-hidden="true">
      <div className="bg-green-line" />
      <div className="bg-red-line" />
      <div className="bg-orange-line" />
      <div className="bg-blue-line" />
    </div>
  )
  */
}