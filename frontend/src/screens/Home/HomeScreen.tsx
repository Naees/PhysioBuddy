import React, {useState, useEffect} from 'react';
import axios from 'axios';
import { API_URL } from '@env';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import {
  Colors,
  DebugInstructions,
  Header,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';

console.log("🌍 API_URL is:", API_URL);

type User = {
  name: string;
};

function App(): React.JSX.Element {
  const [users, setUsers] = useState<User[]>([]);
  const [pingMessage, setPingMessage] = useState<string>('');
  const isDarkMode = useColorScheme() === 'dark';

    useEffect(() => {
      axios.get(`${API_URL}/users`)
      .then(res => {
        setUsers(res.data);
      })
      .catch(err => {
        console.error('Failed to fetch users:', err.message);
      });

          // Ping backend
    axios.get(`${API_URL}/ping`) // ✅ ADDED
      .then(res => {
        setPingMessage(res.data.message); // ✅ ADDED
      })
      .catch(err => {
        console.error('Ping failed:', err.message); // ✅ ADDED
      });
  }, []);

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <View style={{ padding: 24 }}>
        <Text style={styles.title}>Fetched Users:</Text>
        {users.map((user, idx) => (
          <Text key={idx}>• {user.name}</Text>
        ))}
      </View>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <Header />
        <View
          style={{
            backgroundColor: isDarkMode
              ? Colors.black
              : Colors.white,
            padding: 24,
          }}>
          <Text style={styles.title}>Step One. This is Home :)))</Text>
          <Text>
            Edit <Text style={styles.bold}>App.tsx</Text> to
            change this screen and see your edits.
          </Text>
          <Text style={styles.title}>See your changes</Text>
          <ReloadInstructions />
          <Text style={styles.title}>Debug</Text>
          <DebugInstructions />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  bold: {
    fontWeight: '700',
  },
});

export default App;