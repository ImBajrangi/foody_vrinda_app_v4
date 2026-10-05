import FVRewardsDashboard from './FVRewardsDashboard';

/**
 * Backwards compatibility export:
 * RewardsModal now delegates directly to the cryptographic FVRewardsDashboard
 * backed by Supabase Ledger, versioned referral rules, and real FV Points.
 */
export default function RewardsModal({ isOpen, onClose }) {
  return <FVRewardsDashboard isOpen={isOpen} onClose={onClose} />;
}
