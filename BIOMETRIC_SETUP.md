# Biometric Authentication Setup Guide

## Installation

To complete the biometric authentication implementation, you need to install the `react-native-biometrics` library:

```bash
npm install react-native-biometrics
```

### iOS Setup
Add to your `ios/Podfile`:
```ruby
pod 'react-native-biometrics', :path => '../node_modules/react-native-biometrics'
```

Then run:
```bash
cd ios && pod install
```

Add to `ios/YourApp/Info.plist`:
```xml
<key>NSFaceIDUsageDescription</key>
<string>This app uses Face ID for secure authentication</string>
```

### Android Setup
Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.USE_FINGERPRINT" />
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
```

## Implementation Complete

The biometric authentication system is now fully implemented with:

✅ **BiometricAuth Service** - Local state management with 5-minute timeout
✅ **BiometricUnlock Screen** - Smooth UI with animations  
✅ **BiometricWrapper Component** - Seamless integration
✅ **Settings Integration** - Toggle in settings screen
✅ **Cache-First Strategy** - No screen flicker, instant responses

## Features

- **5-minute auto-lock** after app goes to background
- **Instant unlock screen** - shows immediately from cache
- **Smooth animations** - pulse effect and user feedback
- **Device support detection** - Face ID, Touch ID, Fingerprint
- **Settings toggle** - Enable/disable in settings
- **Background persistence** - Remembers state across app restarts
- **No network calls** - All biometric logic is local for instant response

## Usage

1. Go to Settings → App Settings → Biometric Authentication
2. Toggle the switch to enable
3. Complete biometric authentication to confirm
4. App will now lock after 5 minutes of inactivity
5. Use biometric authentication to unlock

## Architecture

```
App Start → BiometricWrapper checks cache → Show unlock if needed
Background Timer → 5 minutes → Lock app → Show unlock on return
Settings Toggle → Test biometric → Update cache → Apply immediately
```

All state is cached locally for instant, flicker-free user experience.