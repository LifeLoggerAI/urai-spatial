import LoginClient from './LoginClient'

export const metadata = {
  title: 'URAI - Enter Your Private World',
  description: 'Sign in to open your private URAI world and ownership controls.',
}

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const rawFrom = params.from
  const from = Array.isArray(rawFrom) ? rawFrom[0] : rawFrom

  return <LoginClient intent={from === 'signup' ? 'signup' : 'login'} />
}
