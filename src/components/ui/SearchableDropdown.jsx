import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

/**
 * SearchableDropdown - Web Customised, Fast, Searchable Dropdown
 * 
 * Supports:
 * - Instant fuzzy search filtering for big lists of users, roles, shops, or categories.
 * - Rich custom rendering with icons, badges, descriptions, and active checkmarks.
 * - Full Light / Dark theme harmony (Warm Vedic Stone in Light, Premium Obsidian + Neon Lime in Dark).
 * - Keyboard navigation (Esc to close, auto-focus on search).
 * - Synchronous, zero-flicker hardware-accelerated CSS positioning.
 * - Click-outside dismiss handler.
 */
export default function SearchableDropdown({
  options = [],
  value,
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search options...',
  disabled = false,
  className = '',
  menuClassName = '',
  size = 'md', // 'sm' | 'md' | 'lg'
  showSearch = true,
  icon: DefaultIcon = null,
  align = 'left', // 'left' | 'right' | 'full'
  required = false,
  showTriggerBadge = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Auto focus search input when opened ONLY on desktop devices with large lists
  useEffect(() => {
    if (isOpen && normalizedOptions.length > 5) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
      if (!isMobile) {
        const timer = setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, normalizedOptions.length]);

  // Normalize options to objects: { value, label, sublabel, icon, badge, badgeColor, group }
  const normalizedOptions = useMemo(() => {
    return options.map(opt => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { value: opt, label: String(opt) };
      }
      return opt;
    });
  }, [options]);

  // Find currently selected item
  const selectedOption = useMemo(() => {
    return normalizedOptions.find(opt => String(opt.value) === String(value));
  }, [normalizedOptions, value]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter(opt => {
      const matchLabel = opt.label?.toLowerCase().includes(q);
      const matchSub = opt.sublabel?.toLowerCase().includes(q);
      const matchValue = String(opt.value).toLowerCase().includes(q);
      const matchGroup = opt.group?.toLowerCase().includes(q);
      return matchLabel || matchSub || matchValue || matchGroup;
    });
  }, [normalizedOptions, searchQuery]);

  // Group filtered options if group property exists
  const groupedOptions = useMemo(() => {
    const hasGroups = filteredOptions.some(opt => opt.group);
    if (!hasGroups) return { '__ungrouped__': filteredOptions };

    return filteredOptions.reduce((acc, opt) => {
      const grp = opt.group || 'Other';
      if (!acc[grp]) acc[grp] = [];
      acc[grp].push(opt);
      return acc;
    }, {});
  }, [filteredOptions]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (optValue) => {
    onChange?.(optValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Safe icon renderer supporting functions, forwardRef components, and JSX elements
  const renderIcon = (IconComponent, iconClass = "w-3.5 h-3.5") => {
    if (!IconComponent) return null;
    if (React.isValidElement(IconComponent)) return IconComponent;
    if (typeof IconComponent === 'function' || (typeof IconComponent === 'object' && IconComponent !== null)) {
      const Comp = IconComponent;
      return <Comp className={iconClass} />;
    }
    return null;
  };

  const SelectedIcon = selectedOption?.icon || DefaultIcon;

  // Size variations
  const sizeClasses = {
    sm: 'text-xs py-2 px-3 rounded-xl gap-2',
    md: 'text-xs py-2.5 px-3.5 rounded-xl gap-2',
    lg: 'text-sm py-3 px-4 rounded-2xl gap-2.5'
  }[size] || 'text-xs py-2.5 px-3.5 rounded-xl gap-2';

  const triggerTitle = selectedOption ? `${selectedOption.label}${selectedOption.badge ? ` (${selectedOption.badge})` : ''}` : placeholder;

  return (
    <div className={`relative inline-block text-left ${align === 'full' ? 'w-full' : ''} ${isOpen ? 'z-[9999]' : 'relative'}`} ref={dropdownRef}>
      {/* Trigger Button with Anti-Clipping Typography */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        title={triggerTitle}
        className={`w-full flex items-center justify-between font-semibold border transition-all duration-150 ease-out select-none cursor-pointer ${sizeClasses} ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-stone-100 dark:bg-white/5 border-stone-200 dark:border-white/5 text-stone-400 dark:text-neutral-500'
            : isOpen
            ? 'bg-stone-100 dark:bg-[#252223] text-stone-950 dark:text-white border-stone-400 dark:border-white/25 shadow-sm ring-1 ring-amber-500/20 dark:ring-[#E0FF33]/20'
            : 'bg-white hover:bg-stone-50 dark:bg-[#1E1B1C] dark:hover:bg-[#252223] text-stone-900 dark:text-neutral-100 border-stone-200/90 dark:border-white/10 hover:border-stone-300 dark:hover:border-white/20 shadow-2xs'
        } ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
          {SelectedIcon && (
            <div className={`shrink-0 flex items-center justify-center w-5 h-5 rounded-lg ${
              selectedOption?.iconBg || 'bg-amber-500/10 text-amber-700 dark:bg-[#E0FF33]/15 dark:text-[#E0FF33]'
            }`}>
              {renderIcon(SelectedIcon, "w-3.5 h-3.5")}
            </div>
          )}
          <span className="font-bold whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0 text-stone-900 dark:text-white tracking-tight">
            {selectedOption ? selectedOption.label : <span className="text-stone-400 dark:text-neutral-500 font-normal">{placeholder}</span>}
          </span>
          {selectedOption?.badge && showTriggerBadge && (
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0 hidden md:inline-flex ${
              selectedOption.badgeColor || 'bg-stone-100 text-stone-700 dark:bg-white/10 dark:text-neutral-300 border border-stone-200/60 dark:border-white/5'
            }`}>
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 ml-1.5 text-stone-400 dark:text-neutral-400 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-stone-900 dark:text-white' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Popover with Mobile Bottom Sheet & Desktop Anchored Modes */}
      {isOpen && (
        <>
          {/* Mobile Backdrop Overlay (dismiss on tap outside) */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[99998] sm:hidden animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
          />

          <div
            className={`
              /* Mobile Screen: Apple-grade Native Bottom Sheet */
              fixed inset-x-0 bottom-0 z-[99999] rounded-t-[32px] bg-white dark:bg-[#1E1B1C] border-t border-stone-200 dark:border-white/15 shadow-[0_-20px_60px_rgba(0,0,0,0.85)] p-4 pb-[max(20px,env(safe-area-inset-bottom,20px))] max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200
              /* Desktop Screen: Anchored Floating Popover */
              sm:animate-none sm:fade-in sm:zoom-in-95 sm:duration-100 sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:mt-2 sm:w-auto sm:min-w-[320px] sm:max-w-md sm:rounded-2xl sm:p-2.5 sm:space-y-1.5 sm:shadow-[0_25px_60px_rgba(0,0,0,0.55)] sm:border sm:border-stone-200 sm:dark:border-white/15
              ${align === 'right' ? 'sm:right-0 sm:left-auto' : align === 'full' ? 'sm:w-full sm:left-0 sm:right-0' : 'sm:left-0 sm:right-auto'}
              ${menuClassName}
            `}
            style={{ maxHeight: 'min(500px, calc(100dvh - 100px))' }}
          >
            {/* Mobile Sheet Handle & Dynamic Header */}
            <div className="flex sm:hidden flex-col gap-2 pb-2">
              <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-white/20 mx-auto -mt-1 mb-1 pointer-events-none" />
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-[#E0FF33] shrink-0" />
                  <h4 className="text-sm font-black text-stone-900 dark:text-white font-['Outfit'] truncate">
                    {placeholder || 'Select Option'}
                  </h4>
                  {normalizedOptions.length > 0 && (
                    <span className="text-[10px] font-bold text-stone-500 dark:text-neutral-400 bg-stone-200/80 dark:bg-white/5 px-2 py-0.5 rounded-full font-mono">
                      {normalizedOptions.length}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-full bg-stone-200 dark:bg-white/10 text-stone-600 dark:text-neutral-300 flex items-center justify-center text-xs hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Integrated Search Input (Shown for lists with > 5 items) */}
            {(showSearch && normalizedOptions.length > 5) && (
              <div className="p-0.5 pb-1.5 border-b border-stone-100 dark:border-white/10 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 dark:text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full bg-stone-100/90 dark:bg-[#242122] text-xs text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-neutral-500 border border-stone-200 dark:border-white/10 rounded-xl pl-8 pr-7 py-2.5 sm:py-2 focus:outline-none focus:border-amber-500 dark:focus:border-[#E0FF33]/50 focus:ring-1 focus:ring-amber-500/20 dark:focus:ring-[#E0FF33]/20 transition-all duration-100 font-medium"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:text-neutral-400 dark:hover:text-white p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Options List with Smooth Native Touch Scrolling */}
            <div className="overflow-y-auto overscroll-contain space-y-1 pr-1 pb-1.5 flex-1 max-h-[50vh] sm:max-h-[300px] touch-pan-y no-scrollbar">
              {Object.entries(groupedOptions).map(([groupName, groupOpts]) => (
                <div key={groupName} className="space-y-0.5">
                  {groupName !== '__ungrouped__' && (
                    <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-stone-400 dark:text-neutral-500 sticky top-0 bg-white/95 dark:bg-[#1E1B1C]/95 backdrop-blur-xs z-10">
                      {groupName}
                    </div>
                  )}
                  {groupOpts.map((opt) => {
                    const isSelected = String(opt.value) === String(value);
                    const ItemIcon = opt.icon || DefaultIcon;

                    return (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => handleSelect(opt.value)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 sm:px-2.5 sm:py-2 rounded-xl text-xs font-semibold transition-colors duration-100 ease-out text-left cursor-pointer group select-none active:scale-[0.99] ${
                          isSelected
                            ? 'bg-amber-500/10 text-stone-950 dark:bg-[#E0FF33]/15 dark:text-[#E0FF33] font-bold'
                            : 'text-stone-800 dark:text-neutral-200 hover:bg-stone-100 dark:hover:bg-white/[0.08] hover:text-stone-950 dark:hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {ItemIcon && (
                            <div className={`shrink-0 flex items-center justify-center w-7 h-7 sm:w-5 sm:h-5 rounded-lg ${
                              isSelected
                                ? 'bg-amber-600 text-white dark:bg-[#E0FF33] dark:text-black shadow-xs'
                                : 'bg-stone-200/80 dark:bg-white/10 text-stone-600 dark:text-neutral-400 group-hover:text-stone-950 dark:group-hover:text-white'
                            }`}>
                              {renderIcon(ItemIcon, "w-4 h-4 sm:w-3 sm:h-3")}
                            </div>
                          )}
                          <div className="min-w-0 flex-1 truncate">
                            <div className="truncate flex items-center gap-1.5">
                              <span className={isSelected ? 'font-bold' : 'font-medium'}>{opt.label}</span>
                              {opt.badge && (
                                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded shrink-0 ${
                                  opt.badgeColor || 'bg-stone-100 text-stone-600 dark:bg-white/10 dark:text-neutral-300 border border-stone-200/60 dark:border-white/5'
                                }`}>
                                  {opt.badge}
                                </span>
                              )}
                            </div>
                            {opt.sublabel && (
                              <p className="text-[10px] text-stone-500 dark:text-neutral-400 font-normal truncate mt-0.5">
                                {opt.sublabel}
                              </p>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <Check className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0 text-amber-600 dark:text-[#E0FF33] ml-2 stroke-[2.5]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}

              {filteredOptions.length === 0 && (
                <div className="py-6 text-center text-stone-400 dark:text-neutral-500 text-xs">
                  <p className="font-semibold">No options found</p>
                  <p className="text-[10px] mt-0.5 text-stone-400 dark:text-neutral-600">Try adjusting your search</p>
                </div>
              )}
            </div>

            {/* Footer stats if multiple items */}
            {normalizedOptions.length > 5 && (
              <div className="pt-1.5 px-2 pb-0.5 border-t border-stone-100 dark:border-white/5 flex items-center justify-between text-[10px] text-stone-400 dark:text-neutral-500">
                <span>{filteredOptions.length} of {normalizedOptions.length} options</span>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-amber-600 dark:text-[#E0FF33] hover:underline cursor-pointer font-semibold"
                  >
                    Reset
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
