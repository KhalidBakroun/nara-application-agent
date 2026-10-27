import { AppHeader } from "@/components/AppHeader";
import { StudentFlow } from "@/components/StudentFlow";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
      <AppHeader />
      <StudentFlow />
    </main>
  );
}
