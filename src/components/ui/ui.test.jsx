import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import Avatar from './Avatar'
import { ButtonLink } from './Button'
import Modal from './Modal'
import TextField from './TextField'

describe('TextField', () => {
  it('ties the label and hint to the input', () => {
    render(<TextField label="Username" hint="Letters and numbers." />)
    const input = screen.getByLabelText('Username')
    expect(input).toHaveAccessibleDescription('Letters and numbers.')
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  it('marks the input invalid when there is an error', () => {
    render(<TextField label="Email" error="Not an email." />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Not an email.')
  })
})

describe('Avatar', () => {
  it('shows initials, named for screen readers, when there is no photo', () => {
    render(<Avatar name="Aidan Gao" />)
    expect(screen.getByRole('img', { name: 'Aidan Gao' })).toHaveTextContent(
      'AG',
    )
  })
})

describe('ButtonLink', () => {
  it('opens other websites in a new tab', () => {
    render(<ButtonLink href="https://www.mbta.com">MBTA</ButtonLink>)
    expect(screen.getByRole('link', { name: 'MBTA' })).toHaveAttribute(
      'target',
      '_blank',
    )
  })

  it('links to pages on this site', () => {
    render(
      <MemoryRouter>
        <ButtonLink to="/explore">Explore</ButtonLink>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Explore' })).toHaveAttribute(
      'href',
      '/explore',
    )
  })
})

describe('Modal', () => {
  it('opens and closes with the open prop', () => {
    const { rerender } = render(
      <Modal open={false} onClose={() => {}} title="Share">
        Hello
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()

    rerender(
      <Modal open onClose={() => {}} title="Share">
        Hello
      </Modal>,
    )
    expect(screen.getByRole('dialog', { name: 'Share' })).toBeVisible()
  })
})
