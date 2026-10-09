import { useState, useEffect, useRef } from 'react';
import { Minus, Plus, Trash2, Check, X } from 'lucide-react';
import { resolveDishCutout } from '../supabase';

const QUANTITIES = Array.from({ length: 10 }, (_, i) => i + 1); // [1..10]
const ITEM_HEIGHT = 44; // px

export default function QuantityPickerSheet({
  isOpen,
  item,
  onClose,
  onUpdateQuantity,
  onRemoveItem
}) {
  const [selectedQty, setSelectedQty] = useState(item?.quantity || 1);
  const [isClosing, setIsClosing] = useState(false);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  const wheelRef = useRef(null);
  const isDraggingSheet = useRef(false);
  const sheetStartY = useRef(0);

  useEffect(() => {
    if (item) {
      const initialQty = item.quantity || 1;
      setSelectedQty(initialQty);
      setDragOffsetY(0);
      setIsClosing(false);

      // Center wheel on open
      setTimeout(() => {
        if (wheelRef.current) {
          wheelRef.current.scrollTop = (initialQty - 1) * ITEM_HEIGHT;
        }
      }, 30);
    }
  }, [item, isOpen]);

  // Keyboard navigation for power usability
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedQty(prev => {
          const next = Math.min(10, prev + 1);
          scrollToQty(next);
          return next;
        });
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedQty(prev => {
          const next = Math.max(1, prev - 1);
          scrollToQty(next);
          return next;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedQty]);

  if (!isOpen && !isClosing) return null;

  const handleClose = (isImmediate = false) => {
    if (isImmediate) {
      setIsClosing(false);
      onClose();
      return;
    }
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 120);
  };

  const handleConfirm = () => {
    if (item) {
      if (selectedQty <= 0) {
        onRemoveItem(item.id);
      } else {
        onUpdateQuantity(item.id, selectedQty);
      }
    }
    handleClose(true);
  };

  const handleRemove = () => {
    if (item) {
      onRemoveItem(item.id);
    }
    handleClose(true);
  };

  const scrollToQty = (qty) => {
    setSelectedQty(qty);
    if (wheelRef.current) {
      wheelRef.current.scrollTo({
        top: (qty - 1) * ITEM_HEIGHT,
        behavior: 'smooth'
      });
    }
  };

  // Sheet Drag-down to dismiss handler on grab handle
  const handleSheetPointerDown = (e) => {
    isDraggingSheet.current = true;
    sheetStartY.current = e.clientY || 0;

    const onMove = (moveEvt) => {
      if (!isDraggingSheet.current) return;
      const currentY = moveEvt.clientY || 0;
      const delta = currentY - sheetStartY.current;
      if (delta > 0) {
        setDragOffsetY(delta);
      }
    };

    const onUp = () => {
      if (!isDraggingSheet.current) return;
      isDraggingSheet.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);

      if (dragOffsetY > 40) {
        handleClose(true); // Instant dismiss on swipe down
      } else {
        setDragOffsetY(0);
      }
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
  };

  const itemImgSrc = resolveDishCutout(item?.image || item?.imageUrl, item?.name, item?.category);

  return (
    <div
      className={`fixed inset-0 z-[99999999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 transition-opacity duration-150 ${
        isClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          transform: dragOffsetY > 0 ? `translate3d(0, ${dragOffsetY}px, 0)` : undefined,
          transition: dragOffsetY > 0 ? 'none' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        className={`w-full sm:max-w-[400px] bg-stone-50 dark:bg-[#1E1B1C] border-t sm:border border-stone-200 dark:border-white/10 rounded-t-[32px] sm:rounded-[36px] px-6 pt-3 pb-8 shadow-2xl overflow-hidden transition-all duration-150 select-none ${
          isClosing ? 'translate-y-full sm:scale-95 sm:opacity-0 pointer-events-none' : 'translate-y-0 sm:scale-100 sm:opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple Pull / Drag Handle */}
        <div
          onPointerDown={handleSheetPointerDown}
          className="w-full py-2.5 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none"
        >
          <div className="w-11 h-1.5 rounded-full bg-stone-300 dark:bg-zinc-600/80 transition-colors hover:bg-stone-400 dark:hover:bg-zinc-500" />
        </div>

        {/* Dish Summary Info with Image and discreet Actions */}
        <div className="flex items-center justify-between gap-3 pb-3.5 mb-4 border-b border-stone-200 dark:border-white/10">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Dish Image Thumbnail */}
            <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-neutral-900 border border-stone-200 dark:border-white/10 overflow-hidden flex items-center justify-center shrink-0 shadow-sm relative">
              <img
                src={itemImgSrc}
                alt={item?.name || 'Dish'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=120&auto=format&fit=crop&q=80';
                }}
              />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-base font-black text-stone-900 dark:text-white font-['Outfit'] truncate">
                {item?.name || 'Dish'}
              </h3>
              <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
                ₹{item?.price} each · Total: <span className="text-amber-700 dark:text-[#FD9139] font-bold">₹{(item?.price || 0) * selectedQty}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleRemove}
              className="w-8 h-8 rounded-full bg-stone-200/80 hover:bg-rose-500/20 dark:bg-white/5 dark:hover:bg-red-500/20 flex items-center justify-center text-rose-600 dark:text-red-400 transition-all cursor-pointer apple-tap-target"
              title="Remove item"
            >
              <Trash2 size={15} style={{ color: '#E11D48', stroke: '#E11D48' }} />
            </button>
            <button
              type="button"
              onClick={() => handleClose()}
              className="w-8 h-8 rounded-full bg-stone-200/80 hover:bg-stone-300 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-stone-600 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-white transition-all cursor-pointer apple-tap-target"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Dual Wheel & Rapid-Tap Quantity Selector (Maximum Usability) */}
        <div className="my-2">
          {/* Quick Direct-Tap Horizontal Number Chips */}
          <div className="flex items-center justify-between gap-1.5 mb-3">
            {QUANTITIES.slice(0, 5).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => scrollToQty(num)}
                className={`flex-1 py-2 rounded-xl font-['Outfit'] font-black text-xs transition-all cursor-pointer apple-tap-target ${
                  selectedQty === num
                    ? 'bg-amber-600 dark:bg-[#FD9139] text-white dark:text-[#1E1B1C] shadow-md ring-1 ring-amber-600 dark:ring-[#FD9139]'
                    : 'bg-stone-200/70 dark:bg-[#282526] text-stone-700 hover:text-stone-900 dark:text-zinc-300 dark:hover:text-white border border-stone-300/40 dark:border-white/5'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-1.5 mb-4">
            {QUANTITIES.slice(5, 10).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => scrollToQty(num)}
                className={`flex-1 py-2 rounded-xl font-['Outfit'] font-black text-xs transition-all cursor-pointer apple-tap-target ${
                  selectedQty === num
                    ? 'bg-amber-600 dark:bg-[#FD9139] text-white dark:text-[#1E1B1C] shadow-md ring-1 ring-amber-600 dark:ring-[#FD9139]'
                    : 'bg-stone-200/70 dark:bg-[#282526] text-stone-700 hover:text-stone-900 dark:text-zinc-300 dark:hover:text-white border border-stone-300/40 dark:border-white/5'
                }`}
              >
                {num}
              </button>
            ))}
          </div>

          {/* Precision Stepper Controls */}
          <div className="flex items-center justify-between bg-stone-100 dark:bg-[#151314] rounded-2xl p-2 border border-stone-200 dark:border-white/10 mb-5">
            <button
              type="button"
              onClick={() => scrollToQty(Math.max(1, selectedQty - 1))}
              disabled={selectedQty <= 1}
              className="w-10 h-10 rounded-xl bg-stone-200 hover:bg-stone-300 dark:bg-[#282526] dark:hover:bg-[#322E30] text-stone-700 hover:text-stone-900 dark:text-zinc-200 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer apple-tap-target active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Decrease"
            >
              <Minus size={16} strokeWidth={2.5} />
            </button>

            <div className="text-center">
              <span className="text-xl font-black text-amber-700 dark:text-[#FD9139] font-['Outfit'] leading-none">
                {selectedQty}
              </span>
              <span className="text-[10px] text-stone-500 dark:text-zinc-400 block font-medium mt-0.5">
                {selectedQty === 1 ? 'Selected Item' : 'Selected Items'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => scrollToQty(Math.min(10, selectedQty + 1))}
              disabled={selectedQty >= 10}
              className="w-10 h-10 rounded-xl bg-amber-600 hover:bg-amber-700 dark:bg-[#FD9139] text-white dark:text-[#1E1B1C] flex items-center justify-center transition-all cursor-pointer apple-tap-target active:scale-90 shadow-md disabled:opacity-30 disabled:cursor-not-allowed"
              title="Increase"
            >
              <Plus size={16} strokeWidth={3.5} className="text-white dark:text-[#1E1B1C] stroke-current" />
            </button>
          </div>
        </div>

        {/* Done Action Button */}
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full py-4 rounded-full bg-amber-600 hover:bg-amber-700 text-white dark:bg-[#FD9139] dark:hover:bg-[#fca65e] dark:text-[#1E1B1C] font-black text-base font-['Outfit'] shadow-xl transition-all cursor-pointer apple-tap-target active:scale-98 flex items-center justify-center gap-2"
        >
          <Check size={18} strokeWidth={3} />
          <span>Confirm Quantity ({selectedQty})</span>
        </button>

        {/* iOS Home Indicator Bar */}
        <div className="w-32 h-1 bg-stone-300 dark:bg-white/20 rounded-full mx-auto mt-4 sm:hidden" />
      </div>
    </div>
  );
}
