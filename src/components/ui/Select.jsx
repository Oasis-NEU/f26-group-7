import { CONTROL, Field } from './Field'

// A labeled dropdown. `options` is a list of strings or { value, label }.
export default function Select({ label, hint, error, options, ...props }) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(ids) => (
        <select className={CONTROL} {...ids} {...props}>
          {options.map((option) => {
            const { value, label: text } =
              typeof option === 'string'
                ? { value: option, label: option }
                : option
            return (
              <option key={value} value={value}>
                {text}
              </option>
            )
          })}
        </select>
      )}
    </Field>
  )
}
