import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  component: About,
});

function About() {
  return (
    <div>
      <h1>About</h1>
      <p>Icon Base Plugin — a WordPress plugin built with React and TanStack Router.</p>
    </div>
  );
}
