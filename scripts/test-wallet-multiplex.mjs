import assert from 'assert';

// Mock Supabase Realtime Channel
let createdChannels = [];
let removedChannels = [];

const mockSupabase = {
  channel(name) {
    let callbacks = [];
    let isSubscribed = false;
    const ch = {
      name,
      on(type, config, callback) {
        if (isSubscribed) {
          throw new Error(`cannot add \`${type}\` callbacks for realtime:${name} after \`subscribe()\`.`);
        }
        callbacks.push({ type, config, callback });
        return ch;
      },
      subscribe() {
        isSubscribed = true;
        return ch;
      },
      triggerChanges() {
        callbacks.forEach(c => c.callback({}));
      }
    };
    createdChannels.push(ch);
    return ch;
  },
  removeChannel(ch) {
    removedChannels.push(ch);
  }
};

// Test implementation
const activeWalletSubscriptions = new Map();

function subscribeUserWalletTest(userId, onUpdate) {
  if (!userId || !mockSupabase) return () => {};

  const cleanId = String(userId).trim();
  let entry = activeWalletSubscriptions.get(cleanId);

  if (!entry) {
    const listeners = new Set();
    if (typeof onUpdate === 'function') listeners.add(onUpdate);

    const channelName = `fv_wallet_${cleanId}_${Date.now()}`;
    const channel = mockSupabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'foody_wallets',
          filter: `user_id=eq.${cleanId}`
        },
        async () => {
          const currentEntry = activeWalletSubscriptions.get(cleanId);
          if (currentEntry) {
            currentEntry.listeners.forEach((listener) => {
              listener({ updated: true });
            });
          }
        }
      );

    channel.subscribe();

    entry = { channel, listeners };
    activeWalletSubscriptions.set(cleanId, entry);
  } else {
    if (typeof onUpdate === 'function') {
      entry.listeners.add(onUpdate);
    }
  }

  return () => {
    const currentEntry = activeWalletSubscriptions.get(cleanId);
    if (!currentEntry) return;

    if (typeof onUpdate === 'function') {
      currentEntry.listeners.delete(onUpdate);
    }

    if (currentEntry.listeners.size === 0) {
      activeWalletSubscriptions.delete(cleanId);
      mockSupabase.removeChannel(currentEntry.channel);
    }
  };
}

console.log('🧪 Testing Wallet Multiplex Realtime Subscription...\n');

const userId = '1aa22861-59c6-4712-9d04-f0c6bed778c1';
let countA = 0;
let countB = 0;

// Component 1 (e.g. Header) subscribes
const unsubA = subscribeUserWalletTest(userId, () => { countA++; });
assert.strictEqual(createdChannels.length, 1, 'Exactly one channel created for first subscriber');

// Component 2 (e.g. RewardsDashboard) subscribes to same user
// PREVIOUSLY THIS WOULD THROW: Error: cannot add `postgres_changes` callbacks for realtime:... after `subscribe()`.
assert.doesNotThrow(() => {
  const unsubB = subscribeUserWalletTest(userId, () => { countB++; });
  assert.strictEqual(createdChannels.length, 1, 'Zero new channels created for second subscriber (multiplexed)');
  
  // Trigger update
  createdChannels[0].triggerChanges();
  assert.strictEqual(countA, 1, 'Subscriber A received update');
  assert.strictEqual(countB, 1, 'Subscriber B received update');

  // Unsub B
  unsubB();
  assert.strictEqual(removedChannels.length, 0, 'Channel kept open while Subscriber A is still active');

  // Trigger update again
  createdChannels[0].triggerChanges();
  assert.strictEqual(countA, 2, 'Subscriber A still receives updates');
  assert.strictEqual(countB, 1, 'Subscriber B does not receive updates after unsub');

  // Unsub A
  unsubA();
  assert.strictEqual(removedChannels.length, 1, 'Channel removed when all subscribers unmount');
  assert.strictEqual(activeWalletSubscriptions.has(userId), false, 'Registry cleared');
});

console.log('✅ Realtime Wallet Multiplex verification passed with 0 errors!\n');
