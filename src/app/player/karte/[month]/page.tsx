import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { KarteView } from "@/components/KarteView";

export default async function KartePage({ params }: PageProps<"/player/karte/[month]">) {
  const session = (await getSession())!;
  const { month } = await params;
  if (!/^\d{4}-\d{2}$/.test(month)) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Link href="/player/karte" className="text-sm text-ink-3">
        ← カルテ一覧
      </Link>
      <KarteView userId={session.userId} month={month} />
    </div>
  );
}
