import { CONTROL, Field } from './Field'

// A labeled text box. Pass `multiline` for a bigger box (a bio, a message).
export default function TextField({ label, hint, error, multiline, ...props }) {
  const Control = multiline ? 'textarea' : 'input'
  return (
    <Field label={label} hint={hint} error={error}>
      {(ids) => (
        <Control
          className={`${CONTROL} ${multiline ? 'min-h-28' : ''}`}
          {...ids}
          {...props}
        />
      )}
    </Field>
  )
}
