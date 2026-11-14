import { Link } from 'react-router'

// Solid is for the main action on a screen; outline is for the rest.
const VARIANTS = {
  solid: 'border-ink bg-ink text-on-ink',
  outline: 'border-ink',
}

function classes(variant, className = '') {
  return `inline-flex items-center justify-center gap-2 border-2 px-4 py-3 text-[15px] font-bold disabled:opacity-50 ${VARIANTS[variant]} ${className}`
}

export function Button({
  variant = 'solid',
  type = 'button',
  className,
  ...props
}) {
  return (
    <button type={type} className={classes(variant, className)} {...props} />
  )
}

// Looks like a button but goes somewhere. `to` is a page on this site;
// `href` is another website, which opens in a new tab.
export function ButtonLink({ variant = 'solid', className, href, ...props }) {
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={classes(variant, className)}
        {...props}
      />
    )
  }
  return <Link className={classes(variant, className)} {...props} />
}
