const MESSAGES: Record<string, string> = {
  link: "That link or code didn't work. Please use the latest link you were sent.",
  setup: "The site isn't set up yet: ACCESS_KEY and SESSION_SECRET must be configured.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main>
      <h1>The Mirror Directory</h1>
      <p className="lede">
        This is a private notes room. Open the private link you were sent and this device will be remembered for a year.
      </p>
      {error && <p className="error">{MESSAGES[error] ?? "Please try again."}</p>}
      <details className="card">
        <summary>Have an access code instead?</summary>
        <form method="post" action="/api/login">
          <label htmlFor="key">Access code</label>
          <input id="key" name="key" type="password" autoComplete="off" required />
          <button type="submit">Sign in</button>
        </form>
      </details>
    </main>
  );
}
