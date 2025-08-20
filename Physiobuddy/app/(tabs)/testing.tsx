import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { Collapsible } from '@/components/Collapsible';
import { ExternalLink } from '@/components/ExternalLink';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function TabTwoScreen() {
  const [users, setUsers] = useState<{ id: number; name: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(process.env.EXPO_PUBLIC_API_URL + '/users', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setUsers(data);
      } catch (err: any) {
        setError(err.message);
      }
    };
    
    fetchUsers();
  }, []);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">This is for Backend connectivity testing</ThemedText>
      </ThemedView>
      <ThemedText>API URL: {process.env.EXPO_PUBLIC_API_URL}</ThemedText>
      <ThemedText>Check that you are able to see the user names pulled from the Postgresql DB</ThemedText>
      <Collapsible title="Backend & Database Connectivity">
        {error ? (
          <ThemedText type="subtitle" style={{ color: 'red' }}>
            Error: {error}
          </ThemedText>
        ) : users ? (
          <>
            <ThemedText type="subtitle">Connected! Users from DB:</ThemedText>
            {users.map((user) => (
              <ThemedText key={user.id}>{user.name}</ThemedText>
            ))}
          </>
        ) : (
          <ThemedText>Loading...</ThemedText>
        )}
      </Collapsible>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});
