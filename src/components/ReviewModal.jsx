import { useState } from 'react';
import { Star, Sparkles, X, Check, ChefHat, Truck, ThumbsUp, Heart, Award } from 'lucide-react';
import { recordMultiStaffReview } from '../supabase';

const CHEF_TAGS = [
  '🔥 Piping Hot & Fresh',
  '🌸 Authentic Vedic Taste',
  '🌿 Pure Desi Ghee',
  '📦 Spill-Proof Packaging',
  '✨ Divine Aroma',
  '🥗 Perfect Spices'
];

const RIDER_TAGS = [
  '⚡ Super Fast Delivery',
  '🙏 Humble & Polite',
  '🛡️ Safe & Contactless',
  '📍 Found Address Easily',
  '🛵 Handled with Care',
  '⭐ 5-Star Sarathi'
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

    const targetShopId = order?.shopId || order?.shop_id || shopId || 'shop-vrinda-main';
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
      <div className="w-full max-w-lg bg-[#1E1B1C] border border-white/10 rounded-[32px] sm:rounded-[40px] p-5 sm:p-7 shadow-[0_25px_80px_rgba(0,0,0,0.85)] relative flex flex-col gap-4 text-white animate-scale-up max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E0FF33]/15 border border-[#E0FF33]/30 flex items-center justify-center text-[#E0FF33]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white font-['Outfit']">
                Rate & Reward Staff
              </h3>
              <p className="text-[11px] text-neutral-400">
                {resolvedShopName}{displayOrderNum ? ` · Order #${displayOrderNum}` : ''}
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
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center text-3xl animate-bounce">
              ✓
            </div>
            <h4 className="text-xl font-black text-white font-['Outfit']">Radhe Radhe!</h4>
            <p className="text-xs text-neutral-400">Your feedback & Trust Points have been credited to the Chef and Delivery Sarathi.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* SECTION 1: KITCHEN CHEF FEEDBACK */}
            <div className="bg-[#151314] rounded-2xl p-4 border border-white/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center">
                    <ChefHat className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white font-['Outfit']">Kitchen Chef & Prasad Quality</h5>
                    <p className="text-[10px] text-neutral-400">{resolvedChefName}</p>
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
                            ? 'text-orange-400 fill-orange-400' 
                            : 'text-zinc-700'
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
                          ? 'bg-orange-400 text-black shadow-sm scale-102' 
                          : 'bg-white/5 text-neutral-400 hover:bg-white/10'
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
            <div className="bg-[#151314] rounded-2xl p-4 border border-white/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#E0FF33]/15 text-[#E0FF33] flex items-center justify-center">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white font-['Outfit']">Delivery Sarathi Service</h5>
                    <p className="text-[10px] text-neutral-400">{resolvedRiderName}</p>
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
                            ? 'text-[#E0FF33] fill-[#E0FF33]' 
                            : 'text-zinc-700'
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
                          ? 'bg-[#E0FF33] text-black shadow-sm scale-102' 
                          : 'bg-white/5 text-neutral-400 hover:bg-white/10'
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
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                Additional Comments (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="Share blessings or suggestions for kitchen & delivery..."
                className="w-full bg-[#151314] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans']"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 font-bold text-xs transition-all cursor-pointer"
              >
                Skip
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-2 py-2.5 rounded-xl bg-[#E0FF33] hover:bg-[#d8fa26] text-black font-black text-xs uppercase tracking-wider shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
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

