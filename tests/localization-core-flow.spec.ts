import { test, expect, type Page } from '@playwright/test'

type SpeechFixture = {
  starts: string[]
  active?: {
    onresult?: ((event: {results: Array<{0:{transcript:string}}>} ) => void) | null
    onend?: (() => void) | null
  }
}

async function installAdamFixtures(page: Page, speech: 'record' | 'missing' | 'throw' = 'record') {
  const conversations: Array<{locale:string; surface:string; aiProcessingConsent:boolean; message:string}> = []
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/urai/adam/conversation') {
      conversations.push(route.request().postDataJSON())
      await route.fulfill({contentType:'application/x-ndjson', body:JSON.stringify({
        type:'done', message:'Inert local fixture response.', caption:'Inert local fixture response.', suggestedActions:[],
        requiresHumanFounder:true, handoffReason:'Fixture preserves human authority.', provider:'openai',
      }) + '\n'})
    } else if (url.hostname === 'identitytoolkit.googleapis.com') {
      await route.fulfill({json:{users:[{localId:'localization-inert-user',emailVerified:true,providerUserInfo:[],createdAt:'0',lastLoginAt:'0'}]}})
    } else if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      await route.continue()
    } else {
      // No auth service, speech service or configured provider may be reached.
      await route.abort()
    }
  })
  await page.addInitScript(mode => {
    Object.defineProperty(navigator, 'language', {configurable:true, value:'de-DE'})
    const fixture: SpeechFixture = {starts:[]}
    ;(window as typeof window & {__uraiSpeechFixture:SpeechFixture}).__uraiSpeechFixture = fixture
    class InertRecognition {
      continuous = false
      interimResults = false
      lang = ''
      onresult = null
      onend: (() => void) | null = null
      onerror = null
      start() {
        if (mode === 'throw') throw new DOMException('Inert denied-start fixture', 'NotAllowedError')
        fixture.starts.push(this.lang)
        fixture.active = this
      }
      abort() { this.onend?.() }
      stop() { this.onend?.() }
    }
    Object.defineProperty(window, 'SpeechRecognition', {configurable:true,value:mode === 'missing' ? undefined : InertRecognition})
    Object.defineProperty(window, 'webkitSpeechRecognition', {configurable:true,value:undefined})
  }, speech)
  // Seed an inert user before the application starts. The fixture public config
  // is supplied only to this CI browser lane; no production auth bypass exists.
  await page.goto('/robots.txt')
  await page.evaluate(async () => {
    localStorage.setItem('urai:locale', 'fr')
    localStorage.setItem('urai:locale-preview', 'fr')
    const key = 'firebase:authUser:localization-inert-public-key:[DEFAULT]'
    const user = {
      uid:'localization-inert-user',emailVerified:true,isAnonymous:true,providerData:[],
      stsTokenManager:{refreshToken:'inert-refresh-token',accessToken:'inert-access-token',expirationTime:Date.now()+86_400_000},
      createdAt:'0',lastLoginAt:'0',apiKey:'localization-inert-public-key',appName:'[DEFAULT]',
    }
    localStorage.setItem(key, JSON.stringify(user))
    await new Promise<void>((resolve,reject) => {
      const request = indexedDB.open('firebaseLocalStorageDb', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('firebaseLocalStorage', {keyPath:'fbase_key'})
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const database = request.result
        const transaction = database.transaction('firebaseLocalStorage', 'readwrite')
        transaction.objectStore('firebaseLocalStorage').put({fbase_key:key,value:user})
        transaction.oncomplete = () => {database.close();resolve()}
        transaction.onerror = () => {database.close();reject(transaction.error)}
      }
    })
  })
  return conversations
}

async function captureInertSpeech(page: Page, transcript: string) {
  await page.evaluate(text => {
    const fixture = (window as typeof window & {__uraiSpeechFixture:SpeechFixture}).__uraiSpeechFixture
    fixture.active?.onresult?.({results:[{0:{transcript:text}}]})
    fixture.active?.onend?.()
  }, transcript)
}

test.beforeEach(async ({ page }) => {
  // Exercise the real route controls without requiring GPU availability or an account.
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (kind: string, ...args: unknown[]) {
      if (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl') return null
      return Reflect.apply(getContext, this, [kind, ...args])
    } as typeof getContext
  })
})

test('French preview persists and renders in actual Home, Life Map, Focus and Replay controls', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/settings?lang=fr')
  const language = page.locator('#urai-language')
  await expect(language).toHaveValue('fr')
  await expect(language.locator('option')).toHaveCount(20)
  await expect(page.getByTestId('locale-preview-toggle')).not.toBeChecked()
  await expect(page.getByRole('link', { name: '← Home', exact: true })).toBeVisible()
  await page.getByTestId('locale-preview-toggle').check()
  await expect(page.getByRole('heading', { name: 'Langue', exact: true })).toHaveAttribute('lang', 'fr')
  await expect(page.getByRole('link', { name: '← Accueil', exact: true })).toBeVisible()
  await page.reload()
  await expect(language).toHaveValue('fr')
  await expect(page.getByTestId('locale-preview-toggle')).toBeChecked()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('html')).toHaveAttribute('data-urai-locale-preview', 'true')
  await expect(page.locator('#language-review-status')).toContainText('Native language review is pending')
  await expect(page.locator('#language-review-status')).toHaveAttribute('lang', 'en')

  await page.goto('/home')
  await expect(page.getByTestId('home-semantic-life-map')).toHaveAccessibleName('Ouvrir directement la carte de vie')
  await expect(page.getByTestId('home-semantic-life-map')).toHaveAttribute('lang', 'fr')
  await page.goto('/life-map?demo=1')
  await page.getByRole('button', { name: 'Rechercher · Carte de vie', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Rechercher', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Fermer', exact: true })).toHaveAttribute('lang', 'fr')
  const results = page.locator('.semantic-results')
  const count = Number(await results.getAttribute('data-visible-count'))
  expect(count).toBeGreaterThan(0)
  await expect(page.locator('.life-map-navigator [role="status"]')).toHaveText(`Résultats : ${new Intl.NumberFormat('fr').format(count)}`)
  const date = results.locator('time').first()
  const occurredAt = await date.getAttribute('datetime')
  expect(occurredAt).toBeTruthy()
  await expect(date).toHaveText(new Intl.DateTimeFormat('fr', { dateStyle: 'medium' }).format(new Date(occurredAt!)))
  await expect(date).toHaveAttribute('lang', 'fr')
  await expect(page.locator('.privacy-truth')).toHaveText('Disclosed sample universe · not your memories')
  await page.getByRole('button', { name: 'Fermer', exact: true }).click()
  await expect(page.getByTestId('life-map-semantic-trigger')).toBeFocused()

  await page.goto('/focus?memoryId=quiet-reset&demo=1')
  await expect(page.getByRole('button', { name: 'Recentrer', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Recentrer', exact: true })).toHaveAttribute('lang', 'fr')
  await expect(page.getByRole('button', {name:'Entrer dans la relecture',exact:true})).toBeVisible()
  await expect(page.getByRole('button', {name:'Entrer dans la relecture',exact:true})).toHaveAttribute('lang','fr')
  await page.goto('/replay?memoryId=quiet-reset&demo=1')
  await expect(page.locator('button.unwind')).toHaveAccessibleName('← Revenir à la concentration')
  await expect(page.locator('button.unwind')).toHaveAttribute('lang', 'fr')
})

test('changing language clears preview; Arabic controls have scoped RTL and reviewed English disclosure', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/settings')
  await page.locator('#urai-language').selectOption('fr')
  await page.getByTestId('locale-preview-toggle').check()
  await page.locator('#urai-language').selectOption('ar')
  await expect(page.getByTestId('locale-preview-toggle')).not.toBeChecked()
  await expect(page.getByRole('heading', { name: 'Language', exact: true })).toBeVisible()
  await page.getByTestId('locale-preview-toggle').check()
  await expect(page.getByRole('heading', { name: 'اللغة', exact: true })).toHaveAttribute('lang', 'ar')
  await expect(page.getByRole('heading', { name: 'اللغة', exact: true })).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  await expect(page.locator('#language-review-status')).toHaveAttribute('dir', 'ltr')
  await page.reload()
  await expect(page.locator('#urai-language')).toHaveValue('ar')
  await expect(page.getByTestId('locale-preview-toggle')).toBeChecked()
  await page.locator('#urai-language').selectOption('en')
  await expect(page.getByTestId('locale-preview-toggle')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Language', exact: true })).toBeVisible()
})

test('global Adam Talk and inert conversation payload use selected preview then English fallback', async ({ page }) => {
  test.setTimeout(90_000)
  const conversations = await installAdamFixtures(page)
  await page.goto('/adam?surface=investors')
  const panel = page.getByRole('complementary', {name:'Adam founder presence'})
  await expect(panel).toHaveAttribute('data-adam-surface', 'investors')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  expect(await page.evaluate(() => navigator.language)).toBe('de-DE')
  await panel.getByText('About Adam', {exact:true}).click()
  await expect(panel.getByText(/The human founder remains required for binding founder/)).toBeVisible()
  await panel.getByRole('button', {name:'Talk',exact:true}).click()
  expect(await page.evaluate(() => (window as typeof window & {__uraiSpeechFixture:SpeechFixture}).__uraiSpeechFixture.starts)).toEqual(['fr-FR'])
  await captureInertSpeech(page, 'Bonjour, inert fixture.')
  await expect(panel.getByRole('textbox', {name:'Message Adam'})).toHaveValue('Bonjour, inert fixture.')
  await expect(panel.getByRole('button', {name:'Send',exact:true})).toBeDisabled()
  expect(conversations).toHaveLength(0)
  await panel.getByRole('checkbox', {name:/Allow this message and bounded recent context/}).check()
  await panel.getByRole('button', {name:'Send',exact:true}).click()
  await expect(panel.getByText('Inert local fixture response.', {exact:true})).toBeVisible()
  expect(conversations[0]).toMatchObject({locale:'fr-FR',surface:'investors',aiProcessingConsent:true,message:'Bonjour, inert fixture.'})
  await expect(panel.getByText(/Human founder required: Fixture preserves human authority/)).toBeVisible()

  // Change the eligibility while the global component remains mounted. The
  // next recognition and request must read the current store, not browser locale.
  await page.evaluate(() => {
    localStorage.setItem('urai:locale-preview', 'false')
    window.dispatchEvent(new StorageEvent('storage', {key:'urai:locale-preview',newValue:'false'}))
  })
  await expect(page.locator('html')).toHaveAttribute('data-urai-locale-preview', 'false')
  await panel.getByRole('button', {name:'Talk',exact:true}).click()
  expect(await page.evaluate(() => (window as typeof window & {__uraiSpeechFixture:SpeechFixture}).__uraiSpeechFixture.starts)).toEqual(['fr-FR','en-US'])
  await captureInertSpeech(page, 'English fallback fixture.')
  await panel.getByRole('button', {name:'Send',exact:true}).click()
  await expect.poll(() => conversations.length).toBe(2)
  expect(conversations[1]).toMatchObject({locale:'en-US',surface:'investors',aiProcessingConsent:true,message:'English fallback fixture.'})
  await expect(panel.getByRole('checkbox', {name:/Allow Adam’s accepted private Founder voice provider/})).not.toBeChecked()
})

for (const speech of ['missing','throw'] as const) {
  test(`global Adam keeps typed input available when speech is ${speech}`, async ({ page }) => {
    test.setTimeout(60_000)
    const conversations = await installAdamFixtures(page, speech)
    await page.goto('/adam')
    const panel = page.getByRole('complementary', {name:'Adam founder presence'})
    await panel.getByRole('button', {name:'Talk',exact:true}).click()
    await expect(panel.getByRole('status')).toHaveText('Voice input is not available in this browser. Type to Adam instead.')
    await expect(panel.getByRole('button', {name:'Talk',exact:true})).toBeEnabled()
    await panel.getByRole('textbox', {name:'Message Adam'}).fill('Typed fallback fixture.')
    await expect(panel.getByRole('textbox', {name:'Message Adam'})).toHaveValue('Typed fallback fixture.')
    await expect(panel.getByRole('button', {name:'Send',exact:true})).toBeDisabled()
    expect(conversations).toHaveLength(0)
  })
}
