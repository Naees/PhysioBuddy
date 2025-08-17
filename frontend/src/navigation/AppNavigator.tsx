import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image } from 'react-native';

// Import your screens
import HomeScreen from '../screens/Home/HomeScreen';
import PhysioBuddyScreen from '../screens/PhysioBuddy/PhysioBuddyScreen';
import ChatbotScreen from '../screens/Chatbot/ChatbotScreen';

// Import your icon image (adjust the path as needed)
import homeIcon from '../assets/home_icon.png';
import chatbotIcon from '../assets/chatbot_icon.png';
import cameraIcon from '../assets/camera_icon.png';

const Tab = createBottomTabNavigator();

const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false, // Hide tab text
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Image
              source={homeIcon}
              style={{
                width: size ?? 24,
                height: size ?? 24,
                tintColor: color,
                opacity: focused ? 1 : 0.6,
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Chatbot"
        component={ChatbotScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Image
              source={chatbotIcon}
              style={{
                width: size ?? 24,
                height: size ?? 24,
                tintColor: color,
                opacity: focused ? 1 : 0.6,
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Buddy"
        component={PhysioBuddyScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Image
              source={cameraIcon}
              style={{
                width: size ?? 24,
                height: size ?? 24,
                tintColor: color,
                opacity: focused ? 1 : 0.6,
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default AppNavigator;