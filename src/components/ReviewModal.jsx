import { useState } from 'react';
import { Star, X, Check, Sparkles, Heart } from 'lucide-react';
import { supabase } from '../supabase';

const REVIEW_TAGS = [
  'Authentic Vedic Taste',
  'Pure Desi Ghee',
  'Super Fast Delivery',
  'Piping Hot & Fresh',
  'Divine Sacred Prasad',
  'Eco-Friendly Packaging'
];

export default function ReviewModal({ 
  isOpen = true,
  order, 
  orderId,
  shopId,
  shopName, 
  onClose, 
  onReviewSubmitted 
}) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState(['Authentic Vedic Taste', 'Pure Desi Ghee']);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const targetOrderId = order?.id || orderId || '';
  const displayOrderNum = targetOrderId ? String(targetOrderId).slice(-6).toUpperCase() : '';
  const resolvedShopName = shopName || order?.shopName || 'Satvik Kitchen';

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const targetShopId = order?.shopId || order?.shop_id || shopId || 'shop-vrinda-main';
    const targetCustName = order?.customerName || order?.customer_name || 'Devotee Customer';

    const reviewData = {
      order_id: targetOrderId || `REV-${Date.now()}`,
      shop_id: targetShopId,
      customer_name: targetCustName,
      rating,
      tags: selectedTags,
      comment: comment.trim(),
      created_at: new Date().toISOString()
    };

    try {
      // 1. Save to Supabase reviews table if available
      try {
        await supabase.from('foody_reviews').insert([reviewData]);
      } catch (e) {
        console.warn("Notice saving review to Supabase:", e);
      }

      // 2. Save locally for instantaneous reflection
      try {
        const localKey = `foody_reviews_${reviewData.shop_id}`;
        const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
        localStorage.setItem(localKey, JSON.stringify([reviewData, ...existing]));
      } catch (e) {}

      setSubmitted(true);
      if (onReviewSubmitted) onReviewSubmitted(reviewData);
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err) {
      console.error("Failed to submit review:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="w-full max-w-lg bg-[#1E1B1C] border border-white/10 rounded-[32px] sm:rounded-[40px] p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.85)] relative flex flex-col gap-5 text-white animate-scale-up">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E0FF33]/15 border border-[#E0FF33]/30 flex items-center justify-center text-[#E0FF33]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white font-['Outfit']">
                Rate & Review Order
              </h3>
              <p className="text-xs text-neutral-400">
                {resolvedShopName}{displayOrderNum ? ` · #${displayOrderNum}` : ''}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center text-2xl animate-bounce">
              ✓
            </div>
            <h4 className="text-xl font-black text-white font-['Outfit']">Radhe Radhe!</h4>
            <p className="text-xs text-neutral-400">Thank you for sharing your divine feedback.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1-5 Star Selector */}
            <div className="text-center space-y-2 py-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Your Overall Experience
              </span>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isActive = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1.5 transition-transform hover:scale-125 active:scale-95 cursor-pointer focus:outline-none"
                    >
                      <Star 
                        size={32} 
                        className={`transition-colors ${
                          isActive 
                            ? 'text-[#E0FF33] fill-[#E0FF33] drop-shadow-[0_0_12px_rgba(224,255,51,0.5)]' 
                            : 'text-zinc-700'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-black text-[#E0FF33] font-['Outfit']">
                {rating === 5 ? '⭐⭐⭐⭐⭐ Outstanding Vedic Prasad' : rating === 4 ? '⭐⭐⭐⭐ Great Experience' : rating === 3 ? '⭐⭐⭐ Satisfactory' : '⭐ Need Improvement'}
              </span>
            </div>

            {/* Compliment Tag Chips */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
                What did you like most?
              </span>
              <div className="flex flex-wrap gap-2">
                {REVIEW_TAGS.map(tag => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected 
                          ? 'bg-[#E0FF33] text-black shadow-md scale-102' 
                          : 'bg-white/5 text-neutral-300 hover:bg-white/10 border border-white/5'
                      }`}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Comment Textarea */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Detailed Feedback (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Share your thoughts about taste, aroma, delivery speed..."
                className="w-full bg-[#151314] border border-white/10 rounded-2xl p-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans']"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-300 font-bold text-xs transition-all cursor-pointer"
              >
                Skip
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-2 py-3 rounded-2xl bg-[#E0FF33] hover:bg-[#d8fa26] text-black font-black text-xs uppercase tracking-wider shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? 'Submitting...' : 'Post Divine Review'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
