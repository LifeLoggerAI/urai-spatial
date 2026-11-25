import type { ReactNode } from "react";

type ChapterText = {
  id: string;
  title: string;
  summary: string;
  narration?: ReactNode;
};

export function StoryChapterReader({ title, introduction, chapters }: {
  title: string;
  introduction: string;
  chapters: readonly ChapterText[];
}) {
  return (
    <article className="storytime-card storytime-stack">
      <p className="storytime-pill">Story Replay</p>
      <h1>{title}</h1>
      <p>{introduction}</p>
      {chapters.map((chapter) => (
        <section className="storytime-card" key={chapter.id}>
          <h2>{chapter.title}</h2>
          <p>{chapter.summary}</p>
          {chapter.narration}
        </section>
      ))}
    </article>
  );
}
