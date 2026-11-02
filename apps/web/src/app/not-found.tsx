// import Link from "next/link";
// import { ArrowUpRight } from "lucide-react";
// import { Button, Container, Section, Heading } from "@agency/ui";

// export default function NotFound() {
//   return (
//     <Section className="flex min-h-[70vh] items-center">
//       <Container className="text-center">
//         <p className="font-mono text-label uppercase tracking-wide text-accent-500">Error 404</p>
//         <Heading level={1} display className="mt-4">
//           This page **wandered off**.
//         </Heading>
//         <p className="mx-auto mt-4 max-w-md text-body-lg text-body">
//           The page you're looking for doesn't exist, or has moved somewhere else.
//         </p>
//         <Button asChild size="lg" className="mt-8">
//           <Link href="/">
//             Back to home <ArrowUpRight />
//           </Link>
//         </Button>
//       </Container>
//     </Section>
//   );
// }






// NEW ANIMATED CODE



import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button, Container, Section, Heading } from "@agency/ui";

export default function NotFound() {
  return (
    <Section className="flex min-h-[70vh] items-center overflow-hidden">
      <Container className="text-center">
        <div
          aria-hidden="true"
          className="mb-5 flex items-center justify-center gap-[0.1em] leading-[0.92] tracking-[-0.04em] text-heading sm:gap-[0.12em]"
          style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(5rem, 16vw, 10rem)", fontWeight: 800 }}
        >
          <span className="fade-up motion-reduce:animate-none">4</span>
          <span className="relative inline-flex size-[0.72em] translate-y-[0.16em] items-center justify-center rounded-full bg-accent-500 align-middle text-heading shadow-[inset_0_-0.06em_0_rgb(0_0_0_/_0.12)]">
            <span className="searching-eye absolute left-[27%] top-[30%] size-[0.09em] rounded-full bg-heading" />
            <span className="searching-eye absolute right-[27%] top-[30%] size-[0.09em] rounded-full bg-heading" />
            <span className="search-neutral-mouth absolute bottom-[25%] left-1/2 h-[0.045em] w-[0.25em] -translate-x-1/2 rounded-full bg-heading motion-reduce:animate-none" />
            <span className="search-sad-mouth absolute bottom-[22%] left-1/2 h-[0.16em] w-[0.3em] -translate-x-1/2 rounded-t-full border-t-[0.045em] border-heading motion-reduce:animate-none" />
          </span>
          <span className="fade-up motion-reduce:animate-none" style={{ animationDelay: "180ms" }}>4</span>
        </div>
        <p className="font-mono text-label uppercase tracking-wide text-accent-500">Page not found</p>
        <Heading level={1} display className="mt-4" style={{ fontSize: "clamp(1.25rem, 2.1vw, 2rem)" }}>
          This page **wandered off**.
        </Heading>
        <p className="fade-up mx-auto mt-3 max-w-md text-body-sm text-neutral-600">
          The page you're looking for doesn't exist, or has moved somewhere else.
        </p>
        <div className="fade-up" style={{ animationDelay: "120ms" }}>
          <Button asChild size="lg" className="mt-8">
            <Link href="/">
              Back to home <ArrowUpRight />
            </Link>
          </Button>
        </div>
      </Container>
    </Section>
  );
}
