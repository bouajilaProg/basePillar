/**
 * HMR no-op module - used as a replacement when HMR isn't available.
 * This prevents the "Hot Module Replacement is disabled" error.
 */
module.exports = function () {
  // No-op: HMR is not available in this environment
};
