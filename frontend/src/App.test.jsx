import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

test('shows connect prompt when not connected', () => {
  render(<App />)
  const el = screen.getByText(/Connect Stripe Sandbox/i)
  expect(el).toBeInTheDocument()
})

test('connect button disabled until key entered', async () => {
  render(<App />)
  const button = screen.getByRole('button', { name: /connect to stripe sandbox/i })
  expect(button).toBeDisabled()
  const input = screen.getByPlaceholderText(/sk_test_/i)
  await userEvent.type(input, 'sk_test_12345')
  expect(button).toBeEnabled()
})

test('tab navigation works', async () => {
  render(<App />)
  // Dashboard tab should be active by default
  expect(screen.getByText(/total transactions/i)).toBeInTheDocument()
  const demoTab = screen.getByRole('button', { name: /demo/i })
  await userEvent.click(demoTab)
  // After switching to demo, there should be card elements
  expect(screen.getByText(/normal payment/i)).toBeInTheDocument()
})
