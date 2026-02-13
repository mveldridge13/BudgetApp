import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import * as Sentry from '@sentry/react-native';
import AppNavigator from './src/navigation/AppNavigator';

// Initialize Sentry
Sentry.init({
  dsn: 'https://671c25e0f175af928bb52201e6a08c2e@o4510880642957312.ingest.us.sentry.io/4510881121173504',
  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
  // Reduce in production for high-traffic apps
  tracesSampleRate: 1.0,
  // Enable automatic instrumentation
  enableAutoSessionTracking: true,
  // Capture user interactions
  enableUserInteractionTracing: true,
  // Only send errors in production
  enabled: !__DEV__,
});

const App = () => {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default Sentry.wrap(App);
