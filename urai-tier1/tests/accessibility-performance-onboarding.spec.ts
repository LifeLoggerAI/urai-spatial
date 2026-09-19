import { expect, test } from '@playwright/test'

test.describe('first-run onboarding accessibility', () => {
  test('keyboard setup preserves privacy disclosure, sensory controls, focus, and resumable completion', async ({ page }) => {
    await page.goto('/home/?firstRun=1', { waitUntil: 'load' })

    const setup = page.locator('[data-setup="true"]').first()
    await expect(setup).toBeVisible()
    await expect(setup).toHaveAttribute('data-setup-step', 'welcome')

    const heading = page.getByRole('heading', { name: 'Your world begins with what you choose.' })
    await expect(heading).toBeFocused()

    const continueButton = page.getByRole('button', { name: 'Continue' })
    await continueButton.focus()
    await page.keyboard.press('Enter')

    await expect(setup).toHaveAttribute('data-setup-step', 'privacy')
    await expect(page.getByRole('heading', { name: 'Permission is part of the world, not a hidden switch.' })).toBeFocused()
    await expect(page.getByText(/Global Emotional Field contribution starts Off/i)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Consent Sanctuary' })).toHaveAttribute('href', '/privacy-controls')
    await expect(page.getByRole('link', { name: 'Passport' })).toHaveAttribute('href', '/passport')

    await continueButton.focus()
    await page.keyboard.press('Enter')
    await expect(setup).toHaveAttribute('data-setup-step', 'comfort')

    const audio = page.getByRole('checkbox', { name: 'World audio' })
    const haptics = page.getByRole('checkbox', { name: 'Haptic cues' })
    await expect(audio).toBeVisible()
    await expect(haptics).toBeVisible()
    await audio.focus()
    await page.keyboard.press('Space')
    await expect(audio).toBeChecked()
    await haptics.focus()
    await page.keyboard.press('Space')
    await expect(haptics).not.toBeChecked()
    await expect(page.getByText(/Accessible text remains available when sound is off/i)).toBeVisible()

    await continueButton.focus()
    await page.keyboard.press('Enter')
    await expect(setup).toHaveAttribute('data-setup-step', 'orb')
    await expect(page.getByRole('heading', { name: 'The Orb stays inside the world with you.' })).toBeFocused()

    const begin = page.getByRole('button', { name: 'Begin guided tour' })
    await begin.focus()
    await page.keyboard.press('Enter')

    await expect(page.locator('[data-setup="true"]')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Enter Ground' })).toBeVisible()

    const stored = await page.evaluate(() => ({
      setupComplete: localStorage.getItem('urai:onboarding:v3:setup-complete'),
      setupStep: localStorage.getItem('urai:onboarding:v3:setup-step'),
      haptics: localStorage.getItem('urai:haptics:enabled-v1'),
      audioConsent: sessionStorage.getItem('urai:spatial-audio-consent-v1'),
      audioMuted: sessionStorage.getItem('urai:spatial-audio-muted-v1'),
    }))
    expect(stored.setupComplete).toBe('1')
    expect(stored.setupStep).toBeNull()
    expect(stored.haptics).toBe('false')
    expect(stored.audioConsent).toBe('true')
    expect(stored.audioMuted).toBe('false')
  })

  test('Skip setup persists completion and reduced-motion remains additive to the OS preference', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/home/?firstRun=1', { waitUntil: 'load' })

    const setup = page.locator('[data-setup="true"]').first()
    await expect(setup).toBeVisible()
    await expect(page.getByRole('button', { name: 'Skip setup' })).toBeVisible()

    const reduced = await page.evaluate(() => ({
      media: matchMedia('(prefers-reduced-motion: reduce)').matches,
      persistedUserSetting: document.documentElement.dataset.uraiReducedMotion ?? null,
    }))
    expect(reduced.media).toBe(true)
    expect(reduced.persistedUserSetting).toBe('false')

    const skip = page.getByRole('button', { name: 'Skip setup' })
    await skip.focus()
    await page.keyboard.press('Enter')
    await expect(setup).toHaveCount(0)

    const completion = await page.evaluate(() => ({
      complete: localStorage.getItem('urai:onboarding:v2:complete'),
      setupComplete: localStorage.getItem('urai:onboarding:v3:setup-complete'),
    }))
    expect(completion.complete).toBe('1')
    expect(completion.setupComplete).toBe('1')

    await page.goto('/home/', { waitUntil: 'load' })
    await expect(page.locator('[data-setup="true"]')).toHaveCount(0)
  })
})
