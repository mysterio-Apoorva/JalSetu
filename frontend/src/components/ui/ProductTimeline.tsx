import { MessageSquare, ListOrdered, Truck, ShieldCheck, ArrowRight } from "lucide-react";

const steps = [
  { icon: MessageSquare, title: "Report the need", detail: "Residents share their location, water needs, and household details." },
  { icon: ListOrdered, title: "Set the priority", detail: "Requests are assessed using outage duration and reported vulnerability." },
  { icon: Truck, title: "Plan the delivery", detail: "Dispatchers assign available tankers and calculate routes along real roads." },
  { icon: ShieldCheck, title: "Verify and record", detail: "A resident code, location check, and photo support the delivery record." },
];
export function ProductTimeline() {
  return <section className="story-section workflow-section" aria-labelledby="workflow-title">
    <div className="section-intro"><span className="section-kicker">From request to delivery</span>
      <h2 id="workflow-title">A clear path for every drop.</h2>
      <p>Four connected steps make water deliveries easier to coordinate and verify.</p></div>
    <ol className="workflow-steps" aria-label="Water delivery workflow">
      {steps.map(({ icon: Icon, title, detail }, index) => <li key={title} className="workflow-step">
        <div className="workflow-step-top"><span className="workflow-icon"><Icon size={22} /></span><span className="step-number">0{index + 1}</span></div>
        <h3>{title}</h3><p>{detail}</p>
        {index < steps.length - 1 && <ArrowRight className="workflow-arrow" size={18} aria-hidden="true" />}
      </li>)}
    </ol>
  </section>;
}
export default ProductTimeline;
