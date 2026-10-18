/**
 * pushNotificationService.js
 *
 * External interface for Firebase Cloud Messaging (FCM) web push notifications
 * and browser Notification API.
 */

const NOTIFICATION_TOKEN_KEY = 'campusfind_fcm_token';

export const pushNotificationService = {
  /**
   * Check if web notifications are supported by the client browser.
   */
  isSupported() {
    return typeof window !== 'undefined' && 'Notification' in window;
  },

  /**
   * Request notification permission from the user.
   */
  async requestPermission() {
    if (!this.isSupported()) {
      return { granted: false, reason: 'unsupported' };
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const dummyToken = `fcm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        localStorage.setItem(NOTIFICATION_TOKEN_KEY, dummyToken);
        return { granted: true, token: dummyToken };
      }
      return { granted: false, reason: permission };
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
      return { granted: false, error: err.message };
    }
  },

  /**
   * Dispatches a local browser notification when a match or claim is confirmed.
   */
  showLocalNotification({ title, body, icon = '/logo.svg', url = '/' }) {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon,
        badge: '/logo.svg'
      });

      notification.onclick = () => {
        window.focus();
        if (url) window.location.href = url;
      };

      return true;
    } catch (err) {
      console.warn('Failed to display browser notification:', err);
      return false;
    }
  },

  /**
   * Get cached device push token if registered.
   */
  getCachedToken() {
    return localStorage.getItem(NOTIFICATION_TOKEN_KEY) || null;
  }
};

export default pushNotificationService;
