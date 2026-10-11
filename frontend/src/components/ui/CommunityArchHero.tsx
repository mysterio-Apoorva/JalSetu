import { Users, MapPinned, Truck } from "lucide-react";

export function CommunityArchHero() {
  return <section className="story-section community-section" aria-labelledby="community-title">
    <div className="section-intro"><span className="section-kicker">One connected community</span>
      <h2 id="community-title">Everyone has a part. Every delivery has a record.</h2>
      <p>Residents, dispatchers, and drivers work from the same water network, with a workspace built for each role.</p></div>
    <div className="community-grid">
      {[
        { icon: Users, title: "Residents", label: "Request & confirm", text: "Share household needs, choose a location, and confirm water when it arrives." },
        { icon: MapPinned, title: "Dispatchers", label: "Prioritize & coordinate", text: "Review requests, plan road routes, and keep track of the registered fleet." },
        { icon: Truck, title: "Drivers", label: "Deliver & document", text: "Follow assigned stops, share location, and submit delivery evidence." },
      ].map(({ icon: Icon, title, label, text }) => <article className="community-card" key={title}>
        <span className="community-icon"><Icon size={25} /></span>
        <span className="card-label">{label}</span><h3>{title}</h3><p>{text}</p>
      </article>)}
    </div>
  </section>;
}
export default CommunityArchHero;
