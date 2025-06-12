import React, {useState, useEffect} from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {View, Text, ActivityIndicator, StyleSheet} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {StorageCoordinator} from '../services/storage/StorageCoordinator';

import WelcomeFlow from '../components/WelcomeFlow';
import IncomeSetupScreen from '../screens/IncomeSetupScreen';
import HomeScreen from '../screens/HomeScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import GoalsScreen from '../screens/GoalsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

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

function WelcomeScreen({navigation}) {
  const handleWelcomeComplete = async () => {
    try {
      const storageCoordinator = StorageCoordinator.getInstance();
      const userStorageManager = storageCoordinator.getUserStorageManager();

      if (userStorageManager) {
        await userStorageManager.setUserData('hasSeenWelcome', true);
      }
      navigation.navigate('IncomeSetup', {isFirstTime: true});
    } catch (error) {
      navigation.navigate('IncomeSetup', {isFirstTime: true});
    }
  };

  return <WelcomeFlow onComplete={handleWelcomeComplete} />;
}

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      try {
        const storageCoordinator = StorageCoordinator.getInstance();
        let userStorageManager = storageCoordinator.getUserStorageManager();

        while (
          !storageCoordinator.isUserStorageInitialized() ||
          !userStorageManager
        ) {
          await new Promise(resolve => setTimeout(resolve, 100));
          userStorageManager = storageCoordinator.getUserStorageManager();
          if (!isMounted) {
            return;
          }
        }

        if (!isMounted) {
          return;
        }

        const hasSeenWelcome = await userStorageManager.getUserData(
          'hasSeenWelcome',
        );
        const setupData = await userStorageManager.getUserData('user_setup');

        if (!isMounted) {
          return;
        }

        if (!hasSeenWelcome) {
          setInitialRoute('Welcome');
        } else if (!setupData) {
          setInitialRoute('IncomeSetup');
        } else {
          const isComplete =
            setupData.setupComplete === true && setupData.income;
          setInitialRoute(isComplete ? 'MainTabs' : 'IncomeSetup');
        }
      } catch (error) {
        if (isMounted) {
          setInitialRoute('Welcome');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeApp();

    return () => {
      isMounted = false;
    };
  }, []);

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
