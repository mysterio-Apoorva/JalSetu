import { MapPin, KeyRound, Fingerprint } from "lucide-react";

export function TiltedGridHero() {
  return <section className="story-section proof-section" aria-labelledby="proof-title">
    <div className="section-intro"><span className="section-kicker">Evidence behind the delivery</span>
      <h2 id="proof-title">Trust, built into the process.</h2>
      <p>Delivery verification brings three checks together before water is recorded as delivered.</p></div>
    <div className="proof-grid">
      {[
        { icon: MapPin, title: "At the right location", text: "The driver's reported position must be within 200 metres of the delivery point.", label: "Location check" },
        { icon: KeyRound, title: "Confirmed by the resident", text: "A single-use code lets the resident participate in confirming receipt of water.", label: "Resident confirmation" },
        { icon: Fingerprint, title: "Recorded with evidence", text: "A delivery photo and its digital fingerprint support a traceable audit record.", label: "Delivery evidence" },
      ].map(({ icon: Icon, title, text, label }) => <article className="proof-card" key={title}>
        <Icon size={28} /><span className="card-label">{label}</span><h3>{title}</h3><p>{text}</p>
      </article>)}
    </div>
  </section>;
}
export default TiltedGridHero;
