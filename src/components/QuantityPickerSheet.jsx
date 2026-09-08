import { useState, useEffect, useRef } from 'react';
import { Minus, Plus, Trash2, Check, X } from 'lucide-react';

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

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 180);
  };

  const handleConfirm = () => {
    if (item) {
      if (selectedQty <= 0) {
        onRemoveItem(item.id);
      } else {
        onUpdateQuantity(item.id, selectedQty);
      }
    }
    handleClose();
  };

  const handleRemove = () => {
    if (item) {
      onRemoveItem(item.id);
    }
    handleClose();
  };

  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const clampedQty = Math.max(1, Math.min(QUANTITIES.length, index + 1));
    if (clampedQty !== selectedQty) {
      setSelectedQty(clampedQty);
    }
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

  // Sheet Drag-down to dismiss handler
  const handleSheetPointerDown = (e) => {
    isDraggingSheet.current = true;
    sheetStartY.current = e.clientY || e.touches?.[0]?.clientY || 0;
  };

  const handleSheetPointerMove = (e) => {
    if (!isDraggingSheet.current) return;
    const currentY = e.clientY || e.touches?.[0]?.clientY || 0;
    const delta = currentY - sheetStartY.current;
    if (delta > 0) {
      setDragOffsetY(delta);
    }
  };

  const handleSheetPointerUp = () => {
    if (!isDraggingSheet.current) return;
    isDraggingSheet.current = false;
    if (dragOffsetY > 90) {
      handleClose();
    } else {
      setDragOffsetY(0);
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-[99999999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
      onPointerMove={handleSheetPointerMove}
      onPointerUp={handleSheetPointerUp}
      onTouchMove={handleSheetPointerMove}
      onTouchEnd={handleSheetPointerUp}
    >
      <div 
        style={{
          transform: dragOffsetY > 0 ? `translateY(${dragOffsetY}px)` : undefined,
          transition: dragOffsetY > 0 ? 'none' : undefined
        }}
        className={`w-full sm:max-w-[380px] bg-[#1E1B1C] border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-[36px] px-6 pt-3 pb-8 shadow-2xl overflow-hidden transition-all duration-200 select-none ${
          isClosing ? 'translate-y-full sm:scale-95 sm:opacity-0' : 'translate-y-0 sm:scale-100 sm:opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple Pull / Drag Handle */}
        <div 
          onPointerDown={handleSheetPointerDown}
          onTouchStart={handleSheetPointerDown}
          className="w-full py-2 flex items-center justify-center cursor-grab active:cursor-grabbing"
        >
          <div className="w-10 h-1.5 rounded-full bg-zinc-600/80 transition-colors hover:bg-zinc-500" />
        </div>

        {/* Dish Summary Info with discreet Actions */}
        <div className="flex items-center justify-between gap-3 pb-3.5 mb-4 border-b border-white/10">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-black text-white font-['Outfit'] truncate">
              {item?.name || 'Dish'}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              ₹{item?.price} each · Total: <span className="text-[#E0FF33] font-bold">₹{(item?.price || 0) * selectedQty}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleRemove}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-zinc-400 hover:text-red-400 transition-all cursor-pointer apple-tap-target"
              title="Remove item"
            >
              <Trash2 size={15} />
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer apple-tap-target"
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
                    ? 'bg-[#E0FF33] text-[#1E1B1C] shadow-md ring-1 ring-[#E0FF33]'
                    : 'bg-[#282526] text-zinc-300 hover:text-white border border-white/5'
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
                    ? 'bg-[#E0FF33] text-[#1E1B1C] shadow-md ring-1 ring-[#E0FF33]'
                    : 'bg-[#282526] text-zinc-300 hover:text-white border border-white/5'
                }`}
              >
                {num}
              </button>
            ))}
          </div>

          {/* Precision Stepper Controls */}
          <div className="flex items-center justify-between bg-[#151314] rounded-2xl p-2 border border-white/10 mb-5">
            <button
              type="button"
              onClick={() => scrollToQty(Math.max(1, selectedQty - 1))}
              disabled={selectedQty <= 1}
              className="w-10 h-10 rounded-xl bg-[#282526] hover:bg-[#322E30] text-zinc-200 hover:text-white flex items-center justify-center transition-all cursor-pointer apple-tap-target active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Decrease"
            >
              <Minus size={16} strokeWidth={2.5} />
            </button>

            <div className="text-center">
              <span className="text-xl font-black text-[#E0FF33] font-['Outfit'] leading-none">
                {selectedQty}
              </span>
              <span className="text-[10px] text-zinc-400 block font-medium mt-0.5">
                {selectedQty === 1 ? 'Selected Item' : 'Selected Items'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => scrollToQty(Math.min(10, selectedQty + 1))}
              disabled={selectedQty >= 10}
              className="w-10 h-10 rounded-xl bg-[#E0FF33] hover:bg-[#ccff00] text-[#1E1B1C] flex items-center justify-center transition-all cursor-pointer apple-tap-target active:scale-90 shadow-md disabled:opacity-30 disabled:cursor-not-allowed"
              title="Increase"
            >
              <Plus size={16} strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Done Action Button */}
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full py-4 rounded-full bg-[#E0FF33] hover:bg-[#ccff00] text-[#1E1B1C] font-black text-base font-['Outfit'] shadow-xl transition-all cursor-pointer apple-tap-target active:scale-98 flex items-center justify-center gap-2"
        >
          <Check size={18} strokeWidth={3} />
          <span>Confirm Quantity ({selectedQty})</span>
        </button>

        {/* iOS Home Indicator Bar */}
        <div className="w-32 h-1 bg-white/20 rounded-full mx-auto mt-4 sm:hidden" />
      </div>
    </div>
  );
}
