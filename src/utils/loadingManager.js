/**
 * loadingManager.js
 * Centralized singleton coordinating loading states across Axios API requests,
 * route transitions, page navigation, and background asynchronous operations.
 */
class LoadingManager {
  constructor() {
    this.activeOps = new Map(); // opKey -> { text, timestamp }
    this.listeners = new Set();
    this.showTimer = null;
    this.minDisplayTimer = null;
    this.isVisible = false;
    this.currentText = 'Loading...';
    this.shownAt = 0;
  }

  /**
   * Register a new active loading operation
   * @param {string} [key] - Optional unique key
   * @param {string} [text='Loading...'] - Human readable status
   * @returns {string} - The key assigned
   */
  start(key, text = 'Loading...') {
    const opKey = key || `op_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.activeOps.set(opKey, { text, timestamp: Date.now() });
    this.currentText = text;
    this._scheduleUpdate();
    return opKey;
  }

  /**
   * Deregister an active loading operation
   * @param {string} key
   */
  stop(key) {
    if (key) {
      this.activeOps.delete(key);
    }
    this._scheduleUpdate();
  }

  /**
   * Clear all active operations immediately
   */
  clear() {
    this.activeOps.clear();
    this._scheduleUpdate();
  }

  /**
   * Subscribe to global loading visibility changes
   * @param {Function} listener - (isLoading: boolean, text: string) => void
   * @returns {Function} unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.isVisible, this.currentText);
    return () => this.listeners.delete(listener);
  }

  _scheduleUpdate() {
    const shouldBeLoading = this.activeOps.size > 0;

    if (shouldBeLoading) {
      const entries = Array.from(this.activeOps.values());
      const latest = entries[entries.length - 1];
      if (latest?.text) {
        this.currentText = latest.text;
      }

      if (!this.isVisible) {
        if (!this.showTimer) {
          // 40ms threshold prevents brief strobe flickering on instantaneous cached reads
          this.showTimer = setTimeout(() => {
            this.showTimer = null;
            if (this.activeOps.size > 0) {
              this.isVisible = true;
              this.shownAt = Date.now();
              this._notify();
            }
          }, 40);
        }
      } else {
        this._notify();
      }
    } else {
      if (this.showTimer) {
        clearTimeout(this.showTimer);
        this.showTimer = null;
      }

      if (this.isVisible) {
        // Enforce a minimum display duration of 140ms once rendered to avoid harsh jarring cuts
        const elapsed = Date.now() - this.shownAt;
        const minDuration = 140;
        const remaining = Math.max(0, minDuration - elapsed);

        if (remaining > 0) {
          if (!this.minDisplayTimer) {
            this.minDisplayTimer = setTimeout(() => {
              this.minDisplayTimer = null;
              if (this.activeOps.size === 0) {
                this.isVisible = false;
                this._notify();
              }
            }, remaining);
          }
        } else {
          this.isVisible = false;
          this._notify();
        }
      }
    }
  }

  _notify() {
    this.listeners.forEach(fn => {
      try {
        fn(this.isVisible, this.currentText);
      } catch (err) {
        console.error('LoadingManager listener error:', err);
      }
    });
  }
}

export const loadingManager = new LoadingManager();

