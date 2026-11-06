/**
 * Tactile Haptic Vibration utility for mobile devices
 */

export function triggerHaptic(type: 'light' | 'medium' | 'success' | 'warning' = 'light') {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (type === 'light') {
        navigator.vibrate(10);
      } else if (type === 'medium') {
        navigator.vibrate(22);
      } else if (type === 'success') {
        navigator.vibrate([15, 40, 25]);
      } else if (type === 'warning') {
        navigator.vibrate([30, 40, 30]);
      }
    } catch {
      // Gracefully ignore if browser prevents vibration
    }
  }
}
