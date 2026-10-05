import React from 'react';
import RoleBasedTutorialTour from './RoleBasedTutorialTour';

/**
 * RoleBasedTutorialModal
 * Direct wrapper around the new game-style interactive spotlight engine RoleBasedTutorialTour.
 * Maintains full backwards compatibility with all existing props & consumers.
 */
export default function RoleBasedTutorialModal({ isOpen, onClose, onComplete, forceRole = null }) {
  return (
    <RoleBasedTutorialTour
      isOpen={isOpen}
      onClose={onClose}
      onComplete={onComplete}
      forceRole={forceRole}
    />
  );
}
