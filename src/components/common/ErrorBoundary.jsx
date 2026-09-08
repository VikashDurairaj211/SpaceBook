import React from "react";
import { AlertTriangle, RefreshCw, Copy, Check } from "lucide-react";
import { generateCorrelationId, logger } from "../../utils/logger";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error) {
    const errorId = generateCorrelationId();
    return { hasError: true, error, errorId };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    logger.error("Uncaught Frontend React Error caught by ErrorBoundary", error, {
      errorId: this.state.errorId,
      componentStack: errorInfo?.componentStack,
    });
  }

  handleCopyError = () => {
    const details = `SpaceBook Error ID: ${this.state.errorId}\nMessage: ${this.state.error?.message}\nTimestamp: ${new Date().toISOString()}`;
    navigator.clipboard.writeText(details).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 3000);
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-6 text-slate-100 font-sans">
          <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl p-8 shadow-2xl text-center space-y-6 backdrop-blur-xl">
            {/* Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <AlertTriangle size={32} />
            </div>

            {/* Title & Info */}
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Application Interruption
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                SpaceBook encountered an unexpected view error. Our observability logger has captured the event.
              </p>
            </div>

            {/* Error ID Badge */}
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 text-left space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Tracking Error / Correlation ID
              </div>
              <div className="font-mono text-xs text-sky-400 select-all break-all">
                {this.state.errorId || "ERR-UNKNOWN"}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleCopyError}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-700/70 hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-200 transition-colors border border-slate-600/50"
              >
                {this.state.copied ? (
                  <>
                    <Check size={14} className="text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy Error ID</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-600/20 transition-all hover:scale-[1.02]"
              >
                <RefreshCw size={14} />
                <span>Reload App</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
