import * as React from "react";
export function KeySequenceIndicator({ sequence }) {
    if (sequence.length === 0)
        return null;
    return (<div className="fixed bottom-4 left-4 z-50">
      <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in animate-slide-in-from-bottom animate-duration-200">
        <span className="text-sm font-mono">
          {sequence.map(key => key.toUpperCase()).join(" → ")}
        </span>
        <span className="text-xs text-gray-400">waiting for next key...</span>
      </div>
    </div>);
}
