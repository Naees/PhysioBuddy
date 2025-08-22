import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';

let currentSound: Audio.Sound | null = null;
let lastPlayedAt = 0;

/**
 * Request TTS audio from backend and play it on device.
 * minIntervalMs prevents spamming the same feedback too frequently.
 */
export async function playTTS(text: string, minIntervalMs = 5000): Promise<void> {
  if (!text) return;

  const now = Date.now();
  if (now - lastPlayedAt < minIntervalMs) return;

  try {
    // Request audio permissions
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    });

    const resp = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    
    if (!resp.ok) {
      throw new Error(`TTS request failed: ${resp.status}`);
    }

    // Get audio as array buffer and convert to base64
    const arrayBuffer = await resp.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);
    const fileUri = FileSystem.cacheDirectory + 'speech.mp3';
    await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });

    // Stop any currently playing sound
    if (currentSound) {
      try { await currentSound.unloadAsync(); } catch {}
      currentSound = null;
    }

    const { sound } = await Audio.Sound.createAsync({ uri: fileUri }, { shouldPlay: true });
    currentSound = sound;
    lastPlayedAt = now;

    sound.setOnPlaybackStatusUpdate((status: any) => {
      if (status?.didJustFinish) {
        sound.unloadAsync().finally(() => {
          if (currentSound === sound) currentSound = null;
        });
      }
    });
  } catch (error) {
    console.error('TTS Error:', error);
    throw error;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}