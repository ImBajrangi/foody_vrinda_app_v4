import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from '../supabase.js';

export const CURRENT_APP_VERSION = {
  versionCode: 14,
  versionName: '1.1.3',
  buildDate: '2026-10-07'
};

class AppUpdateService {
  constructor() {
    this.cachedUpdate = null;
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
   * Launch direct APK download and package installer
   */
  async startUpdate(apkUrl) {
    const targetUrl = apkUrl || this.cachedUpdate?.apkUrl || 'https://github.com/ImBajrangi/foody_vrinda_app_v4/releases/latest/download/Foody-Vrinda-Latest.apk';
    
    if (Capacitor.isNativePlatform()) {
      try {
        await Browser.open({ url: targetUrl });
      } catch {
        if (typeof window !== 'undefined') {
          window.open(targetUrl, '_system');
        }
      }
    } else {
      if (typeof window !== 'undefined') {
        window.open(targetUrl, '_blank');
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
