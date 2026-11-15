const MESSAGES: Record<string, string> = {
  password: "That password didn't match. Please try again.",
  setup: "The site isn't set up yet: APP_PASSWORD and SESSION_SECRET must be configured.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main>
      <h1>The Mirror Directory</h1>
      <p className="lede">A private notes room for your screenplay.</p>
      <form className="card" method="post" action="/api/login">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
        {error && <p className="error">{MESSAGES[error] ?? "Please try again."}</p>}
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}
