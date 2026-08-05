import { redirect } from "next/navigation";
import { Container } from "@agency/ui";
import { getInfluencerServerSession } from "@/lib/influencer-server-session";
import { InfluencerDashboardNav } from "@/components/influencer/dashboard-nav";
import { InfluencerStatusScreen } from "@/components/influencer/status-screen";
import { InfluencerDashboardRadiusScope } from "@/components/influencer/dashboard-radius-scope";

export default async function InfluencerDashboardLayout({ children }: { children: React.ReactNode }) {
  const me = await getInfluencerServerSession();

  if (!me) redirect("/influencer/login");

  // Only approved influencers get the real dashboard (brief §16) -- everyone
  // else sees a status screen instead of the nav/children, matching what
  // requireApprovedInfluencer enforces server-side on the write endpoints.
  if (me.status !== "APPROVED") {
    return (
      <div className="min-h-[60vh] py-16">
        <InfluencerDashboardRadiusScope />
        <Container className="max-w-lg">
          <InfluencerStatusScreen me={me} />
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh]">
      <InfluencerDashboardRadiusScope />
      <InfluencerDashboardNav name={me.name} />
      <Container className="py-10">{children}</Container>
    </div>
  );
}
