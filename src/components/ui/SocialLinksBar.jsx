import React, { useState } from 'react';
import { SOCIAL_CHANNELS } from '../../constants/socialLinks';

const SocialIcon = ({ id, className = "w-4 h-4" }) => {
  switch (id) {
    case 'whatsapp':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.586-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.055-1.928-.485-1.528-.636-2.505-2.203-2.582-2.305-.077-.102-.624-.827-.624-1.577 0-.75.385-1.12.522-1.272.137-.154.298-.192.399-.192.1 0 .201.002.289.006.092.004.215-.035.335.253.127.304.433 1.053.471 1.13.038.077.064.167.013.268-.051.102-.077.167-.154.256-.077.09-.161.2-.23.268-.077.077-.157.161-.067.315.09.154.398.657.854 1.063.587.522 1.082.684 1.236.76.154.077.244.064.334-.038.09-.102.385-.448.487-.601.103-.154.205-.128.346-.077.141.051.897.423 1.051.5.154.077.256.115.295.179.039.064.039.372-.105.777z"/>
          <path d="M12 2C6.477 2 2 6.477 2 12c0 1.891.527 3.66 1.443 5.176L2 22l4.985-1.399A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.05c-1.637 0-3.153-.487-4.432-1.328l-.317-.209-2.962.83.83-2.887-.229-.335A8.006 8.006 0 014 12c0-4.411 3.589-8.05 8-8.05s8 3.639 8 8.05-3.589 8.05-8 8.05z"/>
        </svg>
      );
    case 'instagram':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      );
    case 'youtube':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      );
    case 'pinterest':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
        </svg>
      );
    case 'facebook':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      );
    default:
      return null;
  }
};

export const SocialLinksBar = ({ compact = false, showLabel = true, className = "" }) => {
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <div className={`flex flex-col items-center gap-2.5 ${className}`}>
      {showLabel && (
        <div className="flex items-center gap-2 text-zinc-400 text-xs font-['Outfit'] tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E0FF33]/60" />
          <span className="text-zinc-400 font-medium">Follow & Join</span>
          <span className="text-zinc-200 font-bold bg-white/5 px-2 py-0.5 rounded-full border border-white/10 text-[11px]">
            @vrindopnishad
          </span>
        </div>
      )}

      {/* Unified Luxury Floating Capsule */}
      <div className={`inline-flex items-center rounded-full border border-white/10 ${
        compact 
          ? 'gap-1 p-1 bg-[#181617]/90 shadow-sm' 
          : 'gap-1.5 p-1.5 bg-gradient-to-b from-[#1E1B1C] to-[#141213] shadow-[0_4px_24px_rgba(0,0,0,0.5)]'
      }`}>
        {SOCIAL_CHANNELS.map((item) => {
          const isHovered = hoveredId === item.id;
          return (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              title={`${item.label} (${item.handle})`}
              className={`relative flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer select-none active:scale-90 ${
                compact ? 'w-7.5 h-7.5' : 'w-9 h-9'
              } ${
                isHovered
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'bg-white/[0.03] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {/* Subtle hover backlight */}
              {isHovered && (
                <div 
                  className="absolute inset-0 rounded-full blur-md opacity-40 transition-opacity pointer-events-none"
                  style={{ backgroundColor: item.color }}
                />
              )}

              <span 
                className="relative z-10 transition-transform duration-300 flex items-center justify-center"
                style={{
                  color: isHovered ? item.color : undefined,
                  transform: isHovered ? 'scale(1.15)' : 'scale(1)'
                }}
              >
                <SocialIcon id={item.id} className={compact ? "w-4 h-4" : "w-4 h-4"} />
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default SocialLinksBar;
