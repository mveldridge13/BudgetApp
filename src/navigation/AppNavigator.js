import React, {useState, useEffect} from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {View, Text, ActivityIndicator, StyleSheet} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Feather from 'react-native-vector-icons/Feather';

// Import your components
import AuthContainer from '../screens/AuthContainer'; // <- UPDATED: Import AuthContainer (business logic)
import WelcomeFlow from '../components/WelcomeFlow';
import IncomeSetupScreen from '../screens/IncomeSetupScreen';
import HomeScreen from '../screens/HomeScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import GoalsScreen from '../screens/GoalsScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Import AuthService
import AuthService from '../services/AuthService';

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
        component={HomeScreen}
        options={{
          tabBarIcon: HomeIcon,
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
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
  );
}

// Authentication Screen Wrapper
function AuthScreen({navigation}) {
  const handleAuthSuccess = async user => {
    console.log('User authenticated successfully:', user);

    // After successful authentication, check if user needs welcome flow
    try {
      const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcome');

      if (!hasSeenWelcome) {
        console.log('New user - showing welcome flow');
        navigation.navigate('Welcome');
      } else {
        // Check if user needs income setup
        const setupData = await AsyncStorage.getItem('userSetup');
        if (!setupData) {
          console.log('User needs income setup');
          navigation.navigate('IncomeSetup');
        } else {
          const parsedData = JSON.parse(setupData);
          const isComplete =
            parsedData.setupComplete === true && parsedData.income;
          if (isComplete) {
            console.log('Setup complete - showing main app');
            navigation.navigate('MainTabs');
          } else {
            console.log('Setup incomplete - showing income setup');
            navigation.navigate('IncomeSetup');
          }
        }
      }
    } catch (error) {
      console.error('Error checking user setup after auth:', error);
      navigation.navigate('Welcome');
    }
  };

  // UPDATED: Use AuthContainer instead of AuthFlow
  return <AuthContainer onAuthSuccess={handleAuthSuccess} />;
}

// Welcome Screen Wrapper
function WelcomeScreen({navigation}) {
  const handleWelcomeComplete = async () => {
    try {
      await AsyncStorage.setItem('hasSeenWelcome', 'true');
      navigation.navigate('IncomeSetup', {isFirstTime: true});
    } catch (error) {
      console.error('Error saving welcome status:', error);
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
      console.log('Checking initial route...');

      // Initialize AuthService and check authentication first
      await AuthService.initialize();
      const isAuthenticated = AuthService.isAuthenticated();

      console.log('isAuthenticated:', isAuthenticated);

      if (!isAuthenticated) {
        console.log('User not authenticated - showing auth flow');
        setInitialRoute('Auth');
        return;
      }

      // If authenticated, continue with existing logic
      const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcome');
      const setupData = await AsyncStorage.getItem('userSetup');

      console.log('hasSeenWelcome:', hasSeenWelcome);
      console.log('setupData:', setupData);

      if (!hasSeenWelcome) {
        console.log('Authenticated user needs welcome');
        setInitialRoute('Welcome');
      } else if (!setupData) {
        console.log('Authenticated user needs income setup');
        setInitialRoute('IncomeSetup');
      } else {
        const parsedData = JSON.parse(setupData);
        const isComplete =
          parsedData.setupComplete === true && parsedData.income;
        if (isComplete) {
          console.log('Authenticated user setup complete - showing main app');
          setInitialRoute('MainTabs');
        } else {
          console.log(
            'Authenticated user setup incomplete - showing income setup',
          );
          setInitialRoute('IncomeSetup');
        }
      }
    } catch (error) {
      console.log('Error checking initial route:', error);
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
        component={IncomeSetupScreen}
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
