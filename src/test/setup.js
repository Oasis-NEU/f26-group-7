import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Clear the page after every test, so one test's render can't leak into
// the next. (Testing Library only does this on its own when Vitest's
// `globals` option is on, and ours is off.)
afterEach(cleanup)
