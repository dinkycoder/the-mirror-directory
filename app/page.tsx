import ReviewForm from "@/components/ReviewForm";
import { listResearch } from "@/lib/research";
import { listGenres } from "@/lib/rubric";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [genres, research] = await Promise.all([listGenres(), listResearch()]);
  return (
    <main>
      <div className="topbar">
        <h1>The Mirror Directory</h1>
        <form method="post" action="/api/logout">
          <button type="submit" className="secondary">Sign out</button>
        </form>
      </div>
      <p className="lede">
        Upload a draft and a room of advisors (a Reader, Producer, Agent, Director and Historian) will give you notes against
        your genre's rubric, starting with what already works and ending with your top three priorities for the next draft.
      </p>
      <ReviewForm genres={genres} research={research} />
    </main>
  );
}
