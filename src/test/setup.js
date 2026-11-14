import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Clear the page after every test, so one test's render can't leak into
// the next. (Testing Library only does this on its own when Vitest's
// `globals` option is on, and ours is off.)
afterEach(cleanup)

// jsdom (the pretend browser tests run in) doesn't have <dialog>'s
// showModal() and close() yet. Real browsers do. These stand-ins only fill
// the gap.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}
