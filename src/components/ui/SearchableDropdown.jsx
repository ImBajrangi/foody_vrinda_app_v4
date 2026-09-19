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
  required = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

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
      // Auto focus search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
    sm: 'text-xs py-1.5 px-2.5 rounded-xl gap-1.5',
    md: 'text-xs py-2 px-3 rounded-xl gap-2',
    lg: 'text-sm py-2.5 px-3.5 rounded-2xl gap-2.5'
  }[size] || 'text-xs py-2 px-3 rounded-xl gap-2';

  return (
    <div className={`relative inline-block text-left ${align === 'full' ? 'w-full' : ''}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between font-bold border transition-all duration-200 select-none cursor-pointer ${sizeClasses} ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-stone-100 dark:bg-white/5 border-stone-200 dark:border-white/5 text-stone-400 dark:text-neutral-500'
            : isOpen
            ? 'bg-amber-500/10 dark:bg-[#E0FF33]/10 border-amber-600 dark:border-[#E0FF33] text-stone-950 dark:text-white shadow-sm ring-2 ring-amber-500/20 dark:ring-[#E0FF33]/20'
            : 'bg-stone-100 hover:bg-stone-200/80 dark:bg-[#1E1B1C] dark:hover:bg-[#282526] text-stone-900 dark:text-white border-stone-300 dark:border-white/10 hover:border-amber-500/40 dark:hover:border-white/25 shadow-xs'
        } ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 truncate text-left">
          {SelectedIcon && (
            <div className={`shrink-0 flex items-center justify-center ${selectedOption?.iconBg || 'text-amber-700 dark:text-[#E0FF33]'}`}>
              {renderIcon(SelectedIcon, "w-3.5 h-3.5")}
            </div>
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : <span className="text-stone-400 dark:text-neutral-500 font-normal">{placeholder}</span>}
          </span>
          {selectedOption?.badge && (
            <span className={`text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md shrink-0 ${
              selectedOption.badgeColor || 'bg-amber-500/15 text-amber-800 dark:bg-[#E0FF33]/20 dark:text-[#E0FF33]'
            }`}>
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 ml-1.5 text-stone-500 dark:text-neutral-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-amber-600 dark:text-[#E0FF33]' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-1.5 min-w-[220px] max-w-sm rounded-2xl bg-white dark:bg-[#1C1A1B] border border-stone-200 dark:border-white/15 shadow-2xl backdrop-blur-xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : align === 'full' ? 'w-full left-0 right-0' : 'left-0'
          } ${menuClassName}`}
          style={{ maxHeight: '340px' }}
        >
          {/* Integrated Search Input */}
          {(showSearch || normalizedOptions.length > 4) && (
            <div className="p-1 pb-1.5 border-b border-stone-100 dark:border-white/10">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 dark:text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-stone-100 dark:bg-[#282526] text-xs text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-neutral-500 border border-stone-200 dark:border-white/10 rounded-xl pl-8 pr-7 py-1.5 focus:outline-none focus:border-amber-600 dark:focus:border-[#E0FF33]/60 focus:ring-1 focus:ring-amber-500/20 dark:focus:ring-[#E0FF33]/20 transition-all font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:text-neutral-400 dark:hover:text-white p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List with Custom Scrollbar */}
          <div className="max-h-[240px] overflow-y-auto no-scrollbar space-y-0.5 pr-0.5">
            {Object.entries(groupedOptions).map(([groupName, groupOpts]) => (
              <div key={groupName} className="space-y-0.5">
                {groupName !== '__ungrouped__' && (
                  <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-stone-400 dark:text-neutral-500">
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
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 text-left cursor-pointer group select-none ${
                        isSelected
                          ? 'bg-amber-500/15 text-amber-900 dark:bg-[#E0FF33]/15 dark:text-[#E0FF33] font-black'
                          : 'text-stone-800 dark:text-neutral-200 hover:bg-stone-100 dark:hover:bg-white/10 hover:text-stone-950 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {ItemIcon && (
                          <div className={`shrink-0 flex items-center justify-center w-5 h-5 rounded-lg ${
                            isSelected
                              ? 'bg-amber-600 text-white dark:bg-[#E0FF33] dark:text-black shadow-xs'
                              : 'bg-stone-200/80 dark:bg-white/10 text-stone-600 dark:text-neutral-400 group-hover:text-stone-950 dark:group-hover:text-white'
                          }`}>
                            {renderIcon(ItemIcon, "w-3 h-3")}
                          </div>
                        )}
                        <div className="min-w-0 flex-1 truncate">
                          <div className="truncate flex items-center gap-1.5">
                            <span>{opt.label}</span>
                            {opt.badge && (
                              <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded shrink-0 ${
                                opt.badgeColor || 'bg-stone-200 text-stone-700 dark:bg-white/10 dark:text-neutral-300'
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
                        <Check className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-[#E0FF33] ml-2 stroke-[3]" />
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
            <div className="pt-1 px-2 pb-0.5 border-t border-stone-100 dark:border-white/5 flex items-center justify-between text-[10px] text-stone-400 dark:text-neutral-500">
              <span>{filteredOptions.length} of {normalizedOptions.length} options</span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-amber-600 dark:text-[#E0FF33] hover:underline cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
