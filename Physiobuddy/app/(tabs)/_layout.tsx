import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, Image } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

import chatbotIcon from '../../assets/images/chatbot_icon.png';
import buddyIcon from '../../assets/images/buddy_camera_icon.png';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chatbot"
        options={{
          title: 'Chatbot',
          tabBarIcon: ({ color, focused }) => (
            <Image
              source={chatbotIcon}
              style={{
                width: 28,
                height: 28,
                tintColor: color,
                opacity: focused ? 1 : 0.6,
              }}
            />
          ),
        }}
      />
      {/* <Tabs.Screen
        name="phyBuddy"
        options={{
          title: 'Buddy',
          tabBarIcon: ({ color, focused }) => (
            <Image
              source={buddyIcon}
              style={{
                width: 28,
                height: 28,
                tintColor: color,
                opacity: focused ? 1 : 0.6,
              }}
            />
          ),
        }}
      /> */}
    </Tabs>
  );
}
