import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const hapticsService = {
  /**
   * Subtle vibration for general interactions (taps, tab changes)
   */
  async lightImpact() {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      // Ignore if not on native
    }
  },

  /**
   * Medium vibration for successes or slightly more important actions
   */
  async mediumImpact() {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
      // Ignore if not on native
    }
  },

  /**
   * Vibration signal for errors or warnings
   */
  async errorImpact() {
    try {
      await Haptics.notification({ type: 'error' as any });
    } catch (e) {
      // Ignore if not on native
    }
  },

  /**
   * Short vibration for selection changes (pickers, segments)
   */
  async selection() {
    try {
      await Haptics.selectionStart();
      await Haptics.selectionChanged();
      await Haptics.selectionEnd();
    } catch (e) {
      // Ignore if not on native
    }
  }
};
