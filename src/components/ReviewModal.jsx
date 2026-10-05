import { useState } from 'react';
import { Star, Sparkles, X, Check, ChefHat, Truck, ThumbsUp, Heart, Award } from 'lucide-react';
import { recordMultiStaffReview } from '../supabase';

const CHEF_TAGS = [
  'Piping Hot & Fresh',
  'Authentic Taste',
  'Pure Desi Ghee',
  'Spill-Proof Packaging',
  'Fresh Aroma',
  'Perfect Spices'
];

const RIDER_TAGS = [
  'Fast Delivery',
  'Humble & Polite',
  'Safe & Contactless',
  'Found Address Easily',
  'Handled with Care',
  '5-Star Sarathi Service'
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
  const [chefRating, setChefRating] = useState(5);
  const [chefHover, setChefHover] = useState(0);
  const [selectedChefTags, setSelectedChefTags] = useState(['🔥 Piping Hot & Fresh', '🌸 Authentic Vedic Taste']);

  const [riderRating, setRiderRating] = useState(5);
  const [riderHover, setRiderHover] = useState(0);
  const [selectedRiderTags, setSelectedRiderTags] = useState(['⚡ Super Fast Delivery', '🙏 Humble & Polite']);

  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const targetOrderId = order?.id || orderId || '';
  const displayOrderNum = targetOrderId ? String(targetOrderId).slice(-6).toUpperCase() : '';
  const resolvedShopName = shopName || order?.shopName || 'Sacred Kitchen';
  const resolvedChefName = order?.chefName || 'Head Chef Radhe';
  const resolvedRiderName = order?.riderName || order?.rider_name || 'Sarathi Gopal';

  const toggleChefTag = (tag) => {
    setSelectedChefTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleRiderTag = (tag) => {
    setSelectedRiderTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const targetShopId = order?.shopId || order?.shop_id || shopId || null;
    const targetCustName = order?.customerName || order?.customer_name || 'Devotee Customer';

    try {
      const reviewResult = await recordMultiStaffReview({
        orderId: targetOrderId,
        shopId: targetShopId,
        customerName: targetCustName,
        chefId: order?.chefId || `chef_${targetShopId}`,
        chefName: resolvedChefName,
        chefRating,
        chefTags: selectedChefTags,
        riderId: order?.riderId || order?.rider_id || 'rider_sarathi_gopal',
        riderName: resolvedRiderName,
        riderRating,
        riderTags: selectedRiderTags,
        overallComment: comment.trim()
      });

      setSubmitted(true);
      if (onReviewSubmitted) onReviewSubmitted(reviewResult);
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err) {
      console.error("Failed to submit multi-staff review:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="w-full max-w-lg bg-white dark:bg-[#1E1B1C] border border-stone-200 dark:border-white/10 rounded-[32px] sm:rounded-[40px] p-5 sm:p-7 shadow-[0_25px_80px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.85)] relative flex flex-col gap-4 text-stone-900 dark:text-white animate-scale-up max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:bg-[#E0FF33]/15 dark:border-[#E0FF33]/30 dark:text-[#E0FF33] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white font-['Outfit']">
                Rate & Reward Staff
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-neutral-400">
                {resolvedShopName}{displayOrderNum ? ` · Order #${displayOrderNum}` : ''}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-950 dark:bg-white/5 dark:hover:bg-white/10 dark:text-neutral-400 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-3xl animate-bounce">
              ✓
            </div>
            <h4 className="text-xl font-black text-stone-900 dark:text-white font-['Outfit']">Radhe Radhe!</h4>
            <p className="text-xs text-stone-600 dark:text-neutral-400">Your feedback & Trust Points have been credited to the Chef and Delivery Sarathi.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* SECTION 1: KITCHEN CHEF FEEDBACK */}
            <div className="bg-stone-50 dark:bg-[#151314] rounded-2xl p-4 border border-stone-200/80 dark:border-white/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                    <ChefHat className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-stone-900 dark:text-white font-['Outfit']">Kitchen Chef & Prasad Quality</h5>
                    <p className="text-[10px] text-stone-500 dark:text-neutral-400">{resolvedChefName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setChefHover(star)}
                      onMouseLeave={() => setChefHover(0)}
                      onClick={() => setChefRating(star)}
                      className="p-1 transition-transform hover:scale-120 cursor-pointer"
                    >
                      <Star 
                        size={18} 
                        className={`${
                          (chefHover || chefRating) >= star 
                            ? 'text-orange-500 fill-orange-500' 
                            : 'text-stone-300 dark:text-zinc-700'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Chef Compliment Badges */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {CHEF_TAGS.map(tag => {
                  const isSelected = selectedChefTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleChefTag(tag)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected 
                          ? 'bg-orange-500 text-white shadow-sm scale-102' 
                          : 'bg-stone-200/80 text-stone-700 hover:bg-stone-300 dark:bg-white/5 dark:text-neutral-400 dark:hover:bg-white/10'
                      }`}
                    >
                      {isSelected && <Check size={10} strokeWidth={3} />}
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: DELIVERY SARATHI FEEDBACK */}
            <div className="bg-stone-50 dark:bg-[#151314] rounded-2xl p-4 border border-stone-200/80 dark:border-white/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-700 dark:bg-[#E0FF33]/15 dark:text-[#E0FF33] flex items-center justify-center">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-stone-900 dark:text-white font-['Outfit']">Delivery Sarathi Service</h5>
                    <p className="text-[10px] text-stone-500 dark:text-neutral-400">{resolvedRiderName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setRiderHover(star)}
                      onMouseLeave={() => setRiderHover(0)}
                      onClick={() => setRiderRating(star)}
                      className="p-1 transition-transform hover:scale-120 cursor-pointer"
                    >
                      <Star 
                        size={18} 
                        className={`${
                          (riderHover || riderRating) >= star 
                            ? 'text-amber-500 fill-amber-500 dark:text-[#E0FF33] dark:fill-[#E0FF33]' 
                            : 'text-stone-300 dark:text-zinc-700'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Rider Compliment Badges */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {RIDER_TAGS.map(tag => {
                  const isSelected = selectedRiderTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleRiderTag(tag)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected 
                          ? 'bg-amber-600 text-white dark:bg-[#E0FF33] dark:text-black shadow-sm scale-102' 
                          : 'bg-stone-200/80 text-stone-700 hover:bg-stone-300 dark:bg-white/5 dark:text-neutral-400 dark:hover:bg-white/10'
                      }`}
                    >
                      {isSelected && <Check size={10} strokeWidth={3} />}
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Comment Textarea */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-neutral-400 mb-1">
                Additional Comments (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="Share blessings or suggestions for kitchen & delivery..."
                className="w-full bg-stone-100 dark:bg-[#151314] border border-stone-200 dark:border-white/10 rounded-xl p-3 text-xs text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-zinc-500 focus:outline-none focus:border-amber-500/80 dark:focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans']"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-950 dark:bg-white/5 dark:hover:bg-white/10 dark:text-neutral-300 font-bold text-xs transition-all cursor-pointer"
              >
                Skip
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-2 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white dark:bg-[#E0FF33] dark:hover:bg-[#CCFF00] dark:text-black font-black text-xs uppercase tracking-wider shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Award size={14} />
                {isSubmitting ? 'Submitting...' : 'Submit Ratings & Points'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}

