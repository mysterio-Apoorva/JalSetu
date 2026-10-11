import { Route, Fingerprint, HeartHandshake, ArrowUpRight } from "lucide-react";
export function HackathonTrackCards() {
  const items = [
    {
      icon: HeartHandshake,
      title: "Need comes first.",
      copy: "Prioritize water requests by dry days and vulnerable residents.",
      tone: "sage",
      tag: "EQUITABLE TRIAGE",
    },
    {
      icon: Route,
      title: "A smarter way there.",
      copy: "Match available tankers to demand with capacity-aware routing.",
      tone: "peach",
      tag: "INTELLIGENT DISPATCH",
    },
    {
      icon: Fingerprint,
      title: "Trust, with evidence.",
      copy: "Connect resident OTP, delivery location and photo proof.",
      tone: "blue",
      tag: "VERIFIED DELIVERY",
    },
  ];
  return (
    <section className="principles" aria-label="How JAL-SETU works">
      {items.map(({ icon: Icon, title, copy, tone, tag }, i) => (
        <article className={`principle-card ${tone}`} key={title}>
          <div className="principle-top">
            <span className="principle-icon">
              <Icon size={23} />
            </span>
            <span className="eyebrow">
              0{i + 1} / {tag}
            </span>
            <ArrowUpRight size={17} />
          </div>
          <h2>{title}</h2>
          <p>{copy}</p>
        </article>
      ))}
    </section>
  );
}
