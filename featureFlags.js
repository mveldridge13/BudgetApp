// Must be imported before react-native-gesture-handler and any other
// react-native module, because feature flag overrides have to run before any
// flag is *accessed* (importing RN core reads flags during evaluation).
//
// Detach Animated nodes in a microtask instead of during React's commit phase.
// Without this, RN 0.79 stops in-flight animations while detaching during the
// insertion-effect (commit) phase, firing their completion callbacks
// synchronously. Our overlay callbacks (onClose/onSave/etc.) call setState,
// which React 19 reports as "useInsertionEffect must not schedule updates".
import {override as overrideFeatureFlags} from 'react-native/src/private/featureflags/ReactNativeFeatureFlags';

overrideFeatureFlags({scheduleAnimatedCleanupInMicrotask: () => true});
