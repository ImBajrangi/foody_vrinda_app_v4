import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from '../supabase.js';

export const CURRENT_APP_VERSION = {
  versionCode: 45,
  versionName: '1.1.34',
  buildDate: '2026-11-10'
};

export const DEFAULT_APP_VERSIONS = [
  {
    versionName: '1.1.34',
    versionCode: 45,
    status: 'upcoming', // 'upcoming' | 'current' | 'supported' | 'deprecated'
    releaseDate: '2026-11-10',
    title: 'v1.1.34 (Build 45) — Dynamic Island Broadcaster & Realtime Telemetry',
    highlights: [
      'Realtime WebSocket notification broadcaster with role-scoped targeting',
      'Apple Dynamic Island interactive alert capsules with zero clipping',
      'Acoustic synthesizer with role-based haptic chimes',
      'High-speed Fastly edge CDN zero-redirect APK downloads'
    ],
    apkUrl: 'https://raw.githubusercontent.com/ImBajrangi/foody_vrinda_app_v4/main/Foody-Vrinda-Latest.apk',
    isMandatory: false,
    minSupportedVersionCode: 43
  },
  {
    versionName: '1.1.33',
    versionCode: 44,
    status: 'current',
    releaseDate: '2026-11-04',
    title: 'v1.1.33 (Build 44) — Fastly Edge CDN & Cash Settlement Engine',
    highlights: [
      'Automated COD cash reconciliation with digital counter receipt',
      'Instant Rider Dispatch sync & live GPS route navigation',
      'Multi-kitchen branch switching & store owner access portal'
    ],
    apkUrl: 'https://raw.githubusercontent.com/ImBajrangi/foody_vrinda_app_v4/main/Foody-Vrinda-Latest.apk',
    isMandatory: false,
    minSupportedVersionCode: 43
  },
  {
    versionName: '1.1.32',
    versionCode: 43,
    status: 'supported',
    releaseDate: '2026-10-28',
    title: 'v1.1.32 (Build 43) — Bottom Sheet Invariants & Theme Guard',
    highlights: [
      'Continuous-interpolation bottom sheet dismissals without CSS hitching',
      'Obsidian luxury dark theme standard across all surfaces'
    ],
    apkUrl: 'https://raw.githubusercontent.com/ImBajrangi/foody_vrinda_app_v4/main/Foody-Vrinda-Latest.apk',
    isMandatory: false,
    minSupportedVersionCode: 15
  },
  {
    versionName: '1.1.4',
    versionCode: 15,
    status: 'deprecated',
    releaseDate: '2026-10-15',
    title: 'v1.1.4 (Build 15) — Mascot Studio & Rewards Bar',
    highlights: [
      '120fps swipe gestures & Prasad Rewards Bar',
      'Offline cart caching & local storage synchronization'
    ],
    apkUrl: 'https://raw.githubusercontent.com/ImBajrangi/foody_vrinda_app_v4/main/Foody-Vrinda-Latest.apk',
    isMandatory: true,
    minSupportedVersionCode: 10
  },
  {
    versionName: '1.1.0',
    versionCode: 10,
    status: 'deprecated',
    releaseDate: '2026-09-20',
    title: 'v1.1.0 (Build 10) — Initial Foundation Release',
    highlights: [
      'Core Satvik prasad ordering and delivery checkout engine'
    ],
    apkUrl: 'https://raw.githubusercontent.com/ImBajrangi/foody_vrinda_app_v4/main/Foody-Vrinda-Latest.apk',
    isMandatory: true,
    minSupportedVersionCode: 10
  }
];

class AppUpdateService {
  constructor() {
    this.cachedUpdate = null;
    this.cachedVersions = null;
  }

  /**
   * Fetch structured version history matrix (Current, Upcoming, and Older Versions)
   * Stored in Supabase foody_shops.payment_settings.app_versions with fallback to DEFAULT_APP_VERSIONS
   */
  async getVersionRegistry() {
    try {
      const { data, error } = await supabase
        .from('foody_shops')
        .select('payment_settings')
        .limit(1)
        .maybeSingle();

      if (!error && Array.isArray(data?.payment_settings?.app_versions) && data.payment_settings.app_versions.length > 0) {
        this.cachedVersions = data.payment_settings.app_versions;
        return this.cachedVersions;
      }
    } catch (err) {
      console.warn('AppUpdateService getVersionRegistry error:', err);
    }
    this.cachedVersions = DEFAULT_APP_VERSIONS;
    return DEFAULT_APP_VERSIONS;
  }

  /**
   * Persist updated version history matrix into Supabase Cloud
   */
  async saveVersionRegistry(versions) {
    try {
      const { data: shop } = await supabase
        .from('foody_shops')
        .select('id, payment_settings')
        .limit(1)
        .maybeSingle();

      if (!shop?.id) throw new Error('No shop configuration found in Supabase');

      const existingSettings = shop.payment_settings || {};
      const updatedSettings = {
        ...existingSettings,
        app_versions: versions,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('foody_shops')
        .update({ payment_settings: updatedSettings, updated_at: new Date().toISOString() })
        .eq('id', shop.id);

      if (error) throw error;
      this.cachedVersions = versions;
      return { success: true };
    } catch (e) {
      console.error('Save version registry error:', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * Formulates structured update announcement broadcast payloads for admins
   * @param {Object} options
   * @param {Object} options.targetVersion - The target release being announced (e.g. v1.1.34)
   * @param {string} options.messageType - 'upcoming' | 'live' | 'mandatory'
   * @param {string} options.audienceScope - 'all' | 'staff' | 'delivery' | 'kitchen'
   */
  formatUpdateMessage({ targetVersion = null, messageType = 'live', audienceScope = 'all' } = {}) {
    const ver = targetVersion || DEFAULT_APP_VERSIONS[0];
    const verTag = `v${ver.versionName}`;
    const buildTag = `(Build ${ver.versionCode})`;

    switch (messageType) {
      case 'upcoming':
        return {
          title: `⏳ The New Update is Coming! ${verTag}`,
          message: `The new Foody Vrinda update is coming soon! You will be able to update your app for 3x speed, real-time broadcasts & dynamic island alerts.`,
          priority: 'normal',
          sound: 'soft_pulse',
          type: 'app_update',
          targetCategory: audienceScope,
          data: {
            type: 'app_update',
            versionName: ver.versionName,
            versionCode: ver.versionCode,
            apkUrl: ver.apkUrl,
            messageType: 'upcoming'
          }
        };

      case 'mandatory':
        return {
          title: `⚠️ Mandatory Update Required · ${verTag}`,
          message: `Critical system update ${verTag} ${buildTag} required. Please update your Foody Vrinda app now to avoid service interruptions.`,
          priority: 'urgent',
          sound: 'alarm_high',
          type: 'app_update',
          targetCategory: audienceScope,
          data: {
            type: 'app_update',
            versionName: ver.versionName,
            versionCode: ver.versionCode,
            apkUrl: ver.apkUrl,
            isMandatory: true,
            messageType: 'mandatory'
          }
        };

      case 'live':
      default:
        return {
          title: `🚀 The New Update is Live! ${verTag}`,
          message: `The new update is coming / live (${verTag}). You can update your app now for 3x speed, live order tracking & fresh rewards!`,
          priority: 'high',
          sound: 'soft_pulse',
          type: 'app_update',
          targetCategory: audienceScope,
          data: {
            type: 'app_update',
            versionName: ver.versionName,
            versionCode: ver.versionCode,
            apkUrl: ver.apkUrl,
            isMandatory: Boolean(ver.isMandatory),
            messageType: 'live'
          }
        };
    }
  }

  /**
   * Check for remote updates from Supabase or Fallback Config
   */
  async checkForUpdates() {
    try {
      // 1. Primary: Direct GitHub Releases API (Public, unauthenticated, zero RLS restriction)
      let latestConfig = null;
      try {
        const ghRes = await fetch('https://api.github.com/repos/ImBajrangi/foody_vrinda_app_v4/releases/latest', {
          headers: { 'Accept': 'application/vnd.github.v3+json' },
          cache: 'no-store'
        });
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          const rawTag = (ghData.tag_name || '').replace(/^v/, '');
          const buildMatch = (ghData.name || '').match(/Build\s*(\d+)/i) || (ghData.body || '').match(/Build\s*(\d+)/i);
          const remoteVersionCode = buildMatch ? parseInt(buildMatch[1], 10) : 0;
          
          const apkAsset = ghData.assets?.find(a => a.name?.endsWith('.apk'));
          const apkUrl = apkAsset?.browser_download_url || 'https://github.com/ImBajrangi/foody_vrinda_app_v4/releases/latest/download/Foody-Vrinda-Latest.apk';

          let notes = [
            'Real-time background push notifications with soft acoustic chimes.',
            '3x faster app loading and memory optimization.',
            'Enhanced security and permanent root protection.'
          ];
          if (ghData.body) {
            const parsedNotes = ghData.body
              .split('\n')
              .map(l => l.replace(/^[-*•\s]+/, '').trim())
              .filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('Download') && !l.startsWith('URL'));
            if (parsedNotes.length > 0) notes = parsedNotes.slice(0, 5);
          }

          if (remoteVersionCode > 0) {
            latestConfig = {
              versionCode: remoteVersionCode,
              versionName: rawTag || '1.1.3',
              apkUrl,
              releaseNotes: notes,
              minSupportedVersionCode: 10,
              isMandatory: (ghData.body || '').toLowerCase().includes('mandatory'),
              publishedAt: ghData.published_at || new Date().toISOString()
            };
          }
        }
      } catch (ghErr) {
        console.warn('GitHub releases fetch note:', ghErr);
      }

      // 2. Secondary: Fallback to Supabase Cloud if GitHub API was unreachable
      if (!latestConfig) {
        try {
          const { data, error } = await supabase
            .from('foody_shops')
            .select('payment_settings')
            .limit(1)
            .maybeSingle();

          if (!error && data?.payment_settings?.app_release) {
            latestConfig = data.payment_settings.app_release;
          }
        } catch (e) {
          console.warn('AppUpdateService remote sync note:', e);
        }
      }

      // Default fallback release descriptor
      if (!latestConfig) {
        latestConfig = {
          versionCode: CURRENT_APP_VERSION.versionCode,
          versionName: CURRENT_APP_VERSION.versionName,
          minSupportedVersionCode: 10,
          apkUrl: 'https://github.com/ImBajrangi/foody_vrinda_app_v4/releases/latest/download/Foody-Vrinda-Latest.apk',
          releaseNotes: [
            'Real-time background push notifications with soft acoustic chimes.',
            '3x faster app loading and memory optimization.',
            'Enhanced security and permanent root protection.'
          ],
          isMandatory: false,
          publishedAt: new Date().toISOString()
        };
      }

      const hasUpdate = (latestConfig.versionCode || 0) > CURRENT_APP_VERSION.versionCode;
      const isMandatory = hasUpdate && (
        latestConfig.isMandatory === true ||
        CURRENT_APP_VERSION.versionCode < (latestConfig.minSupportedVersionCode || 0)
      );

      this.cachedUpdate = {
        hasUpdate,
        isMandatory,
        latestVersion: latestConfig.versionName || '1.1.3',
        latestVersionCode: latestConfig.versionCode || 14,
        currentVersion: CURRENT_APP_VERSION.versionName,
        currentVersionCode: CURRENT_APP_VERSION.versionCode,
        apkUrl: latestConfig.apkUrl,
        releaseNotes: latestConfig.releaseNotes || ['New performance improvements and bug fixes.']
      };

      return this.cachedUpdate;
    } catch (err) {
      console.warn('App update check error:', err);
      return { hasUpdate: false, isMandatory: false };
    }
  }

  /**
   * Launch direct APK download and package installer via high-speed Fastly edge CDN
   */
  async startUpdate(apkUrl) {
    // Fastly edge CDN URL (Mumbai node) with zero-redirect HTTP 200 stream
    const rawFastlyCdnUrl = 'https://raw.githubusercontent.com/ImBajrangi/foody_vrinda_app_v4/main/Foody-Vrinda-Latest.apk';
    const fallbackReleaseUrl = 'https://github.com/ImBajrangi/foody_vrinda_app_v4/releases/latest/download/Foody-Vrinda-Latest.apk';

    // Prioritize direct zero-redirect CDN stream to prevent Android 100% download hang
    const targetUrl = apkUrl || rawFastlyCdnUrl || fallbackReleaseUrl;

    if (Capacitor.isNativePlatform()) {
      // In native Android app, open via system browser so Android DownloadManager processes it in the notification bar
      try {
        await Browser.open({ url: targetUrl, windowName: '_system' });
      } catch (err) {
        console.warn('Native Browser.open error:', err);
        try {
          await Browser.open({ url: targetUrl });
        } catch (_) {
          if (typeof window !== 'undefined') {
            window.location.href = targetUrl;
          }
        }
      }
    } else {
      // In mobile web browser, trigger direct navigation so native DownloadManager
      // downloads the file in notification tray without opening a dead blank tab
      if (typeof window !== 'undefined') {
        const link = document.createElement('a');
        link.href = targetUrl;
        link.download = 'Foody-Vrinda-Latest.apk';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }

  /**
   * Publish new version descriptor (from Developer Panel / Supabase)
   */
  async publishRelease({ versionCode, versionName, apkUrl, releaseNotes, isMandatory }) {
    try {
      const { data: shop } = await supabase
        .from('foody_shops')
        .select('id, payment_settings')
        .limit(1)
        .maybeSingle();

      if (!shop?.id) throw new Error('No shop configuration found in Supabase');

      const existingSettings = shop.payment_settings || {};
      const updatedSettings = {
        ...existingSettings,
        app_release: {
          versionCode: parseInt(versionCode, 10),
          versionName: String(versionName).trim(),
          apkUrl: String(apkUrl).trim(),
          releaseNotes: Array.isArray(releaseNotes) ? releaseNotes : releaseNotes.split('\n').filter(Boolean),
          isMandatory: Boolean(isMandatory),
          publishedAt: new Date().toISOString()
        }
      };

      const { error } = await supabase
        .from('foody_shops')
        .update({ payment_settings: updatedSettings, updated_at: new Date().toISOString() })
        .eq('id', shop.id);

      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Publish release error:', e);
      return { success: false, error: e.message };
    }
  }
}

export const appUpdateService = new AppUpdateService();
export default appUpdateService;
