import { ClipboardList, Mic, Users } from 'lucide-react';

function StatCard({ icon, label, value, detail }) {
  return <article className="stat-card"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>;
}

export default function StatsGrid({ activeClass, learnerCount, observationCount, voiceUsed }) {
  const voiceLeft = Math.max(100 - Number(voiceUsed || 0), 0);

  return (
    <section className="stats-grid">
      <StatCard icon={<Users />} label="Active class" value={activeClass?.name || 'No class yet'} detail={`${learnerCount} learners`} />
      <StatCard icon={<ClipboardList />} label="Observations" value={observationCount} detail="Saved observations" />
      <StatCard icon={<Mic />} label="Voice left" value={voiceLeft} detail={`${voiceUsed || 0} used this week`} />
    </section>
  );
}
