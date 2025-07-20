import React, {useState, useEffect} from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {View, Text, ActivityIndicator, StyleSheet} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

// Import your components
import AuthContainer from '../screens/AuthContainer';
import WelcomeFlow from '../components/WelcomeFlow';
import IncomeSetupContainer from '../containers/IncomeSetupContainer'; // ✅ FIXED: Import IncomeSetupContainer
import HomeContainer from '../containers/HomeContainer'; // ✅ CHANGED: Import HomeContainer instead of HomeScreen
import AnalyticsContainer from '../containers/AnalyticsContainer'; // ✅ CHANGED: Import AnalyticsContainer instead of AnalyticsScreen
import GoalsScreen from '../screens/GoalsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ModulesScreen from '../screens/ModulesScreen';
import BiometricWrapper from '../components/BiometricWrapper';

// Import API services
import AuthService from '../services/AuthService';
import TrendAPIService from '../services/TrendAPIService';
import UserProfileCache from '../services/UserProfileCache';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Icon components
const HomeIcon = ({color, size}) => (
  <Feather name="home" size={size} color={color} />
);

const AnalyticsIcon = ({color, size}) => (
  <Feather name="bar-chart-2" size={size} color={color} />
);

const GoalsIcon = ({color, size}) => (
  <Feather name="target" size={size} color={color} />
);

const SettingsIcon = ({color, size}) => (
  <Feather name="menu" size={size} color={color} />
);

// Main Tab Navigator
function MainTabs() {
  return (
    <BiometricWrapper>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#8B5CF6',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            backgroundColor: 'white',
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB',
            paddingBottom: 20,
            paddingTop: 10,
            height: 90,
          },
          tabBarLabelStyle: {
            paddingBottom: 5,
          },
        }}>
        <Tab.Screen
          name="Home"
          component={HomeContainer} // ✅ CHANGED: Use HomeContainer instead of HomeScreen
          options={{
            tabBarIcon: HomeIcon,
          }}
        />
        <Tab.Screen
          name="Analytics"
          component={AnalyticsContainer} // ✅ CHANGED: Use AnalyticsContainer instead of AnalyticsScreen
          options={{
            tabBarIcon: AnalyticsIcon,
          }}
        />
        <Tab.Screen
          name="Goals"
          component={GoalsScreen}
          options={{
            tabBarIcon: GoalsIcon,
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarIcon: SettingsIcon,
          }}
        />
      </Tab.Navigator>
    </BiometricWrapper>
  );
}

// Authentication Screen Wrapper
function AuthScreen({navigation}) {
  const handleAuthSuccess = async () => {
    try {
      // NEW: Get user profile from backend instead of AsyncStorage
      const userProfile = await TrendAPIService.getUserProfile();

      if (!userProfile.hasSeenWelcome) {
        navigation.navigate('Welcome');
      } else if (!userProfile.setupComplete || !userProfile.income) {
        navigation.navigate('IncomeSetup');
      } else {
        navigation.navigate('MainTabs');
      }
    } catch (error) {
      console.error('Error checking user setup after auth:', error);
      // Fallback to welcome flow if API fails
      navigation.navigate('Welcome');
    }
  };

  return <AuthContainer onAuthSuccess={handleAuthSuccess} />;
}

// Welcome Screen Wrapper
function WelcomeScreen({navigation}) {
  const handleWelcomeComplete = async () => {
    try {
      // NEW: Update backend instead of AsyncStorage
      await TrendAPIService.updateUserProfile({hasSeenWelcome: true});
      navigation.navigate('IncomeSetup', {isFirstTime: true});
    } catch (error) {
      console.error('Error saving welcome status:', error);
      // Continue to income setup even if API fails
      navigation.navigate('IncomeSetup', {isFirstTime: true});
    }
  };

  return <WelcomeFlow onComplete={handleWelcomeComplete} />;
}

// Main App Navigator
export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkInitialRoute();
  }, []);

  const checkInitialRoute = async () => {
    try {
      // Initialize AuthService and check authentication first
      await AuthService.initialize();

      // Initialize BiometricAuth service early
      // This will check if the app should be locked on startup
      console.log('🔐 AppNavigator: Initializing BiometricAuth service');
      // Note: BiometricAuth service auto-initializes, but we can ensure it's ready

      const isAuthenticated = AuthService.isAuthenticated();

      if (!isAuthenticated) {
        setInitialRoute('Auth');
        return;
      }

      // NEW: Get user profile from backend and cache it for immediate use by other screens
      const userProfile = await TrendAPIService.getUserProfile();

      // Cache the profile so SettingsScreen and other screens can use it immediately
      if (userProfile) {
        await UserProfileCache.set(userProfile);
        console.log(
          '🔍 APP_NAVIGATOR: Cached user profile for immediate screen access',
        );
      }

      if (!userProfile.hasSeenWelcome) {
        setInitialRoute('Welcome');
      } else if (!userProfile.setupComplete || !userProfile.income) {
        setInitialRoute('IncomeSetup');
      } else {
        setInitialRoute('MainTabs');
      }
    } catch (error) {
      // If there's an error, default to auth flow
      setInitialRoute('Auth');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName={initialRoute}>
      <Stack.Screen
        name="Auth"
        component={AuthScreen}
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="IncomeSetup"
        component={IncomeSetupContainer} // ✅ FIXED: Use IncomeSetupContainer instead of IncomeSetupScreen
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="Modules"
        component={ModulesScreen}
        options={{
          gestureEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
});
