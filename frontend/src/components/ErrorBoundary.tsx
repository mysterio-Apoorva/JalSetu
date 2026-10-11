import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="max-w-xl mx-auto p-8 space-y-4" role="alert">
      <h1 className="text-2xl font-bold">This screen could not be displayed</h1>
      <p>Reload to reconnect to your workspace. Any changes already saved to the server remain there.</p>
      <button className="primary-action" onClick={() => window.location.reload()}>Reload workspace</button>
      <a className="secondary-action inline-flex ml-2" href="/">Return home</a>
    </main>;
    return this.props.children;
  }
}
