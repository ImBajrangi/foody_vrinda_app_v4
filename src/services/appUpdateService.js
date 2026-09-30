import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from '../supabase';

export const CURRENT_APP_VERSION = {
  versionCode: 13,
  versionName: '1.1.2',
  buildDate: '2026-09-30'
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
      // 1. Fetch latest version record from Supabase table or app metadata
      let latestConfig = null;
      try {
        const { data, error } = await supabase
          .from('foody_app_config')
          .select('*')
          .eq('key', 'latest_app_release')
          .maybeSingle();

        if (!error && data?.value) {
          latestConfig = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        }
      } catch (e) {
        console.warn('AppUpdateService Supabase query notice:', e);
      }

      // Default fallback release descriptor if table is empty
      if (!latestConfig) {
        latestConfig = {
          versionCode: CURRENT_APP_VERSION.versionCode,
          versionName: CURRENT_APP_VERSION.versionName,
          minSupportedVersionCode: 10,
          apkUrl: 'https://github.com/ImBajrangi/foody_vrinda_app_v4/releases/latest/download/Foody-Vrinda-Latest.apk',
          releaseNotes: [
            '✨ Real-time background push notifications with soft acoustic chimes.',
            '🚀 3x faster app loading and memory optimization.',
            '🔒 Enhanced security and permanent root protection.'
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
   * Publish new version descriptor (from Developer Panel)
   */
  async publishRelease({ versionCode, versionName, apkUrl, releaseNotes, isMandatory }) {
    try {
      const payload = {
        key: 'latest_app_release',
        value: {
          versionCode: parseInt(versionCode, 10),
          versionName: String(versionName).trim(),
          apkUrl: String(apkUrl).trim(),
          releaseNotes: Array.isArray(releaseNotes) ? releaseNotes : releaseNotes.split('\n').filter(Boolean),
          isMandatory: Boolean(isMandatory),
          publishedAt: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('foody_app_config')
        .upsert(payload, { onConflict: 'key' });

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
