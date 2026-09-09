import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Caught in ErrorBoundary:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-[360px] flex items-center justify-center p-6 my-4 rounded-3xl bg-[#181617]/90 border border-red-500/30 shadow-2xl backdrop-blur-xl text-center">
          <div className="max-w-md flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 animate-pulse">
              <AlertCircle size={28} />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2 font-serif">
              Something went slightly off
            </h3>
            
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              {this.state.error?.message || "A rendering hiccup occurred. Don't worry, your sacred Prasad and basket are safe."}
            </p>

            <button
              onClick={this.handleReset}
              className="px-6 py-2.5 rounded-full bg-[#E0FF33] hover:bg-[#d4f820] text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#E0FF33]/25 active:scale-95 transition-all cursor-pointer font-['Outfit']"
            >
              <RefreshCw size={14} className="stroke-[2.5]" />
              <span>Reload View</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
