import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Button, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { Audio } from 'expo-av';
import { playTTS } from '@/utils/tts';

export default function Explore() {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<any>(null);
  const [resetMessage, setResetMessage] = useState(""); // State for reset message
  const lastSpokenTime = useRef<number>(0);

  // Auto send frames 1sec at a time to backend to check
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (cameraEnabled) {
      // Set audio mode to disable camera sounds
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      interval = setInterval(async () => {
        if (cameraRef.current) {
          const photo = await cameraRef.current.takePictureAsync({ 
            quality: 0.5, 
            base64: false,
            skipProcessing: true
          });
          setPhotoUri(photo.uri);

          // Send to backend automatically every 1 sec
          setLoading(true);
          const manipResult = await ImageManipulator.manipulateAsync(
            photo.uri,
            [],
            { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
          );
          const fileUri = manipResult.uri;
          const formData = new FormData();
          formData.append('image', {
            uri: fileUri,
            name: 'photo.jpg',
            type: 'image/jpeg',
          } as any);

          try {
            console.log("Sending to:", process.env.EXPO_PUBLIC_API_URL + '/pose');
            const response = await fetch(process.env.EXPO_PUBLIC_API_URL + '/pose', {
              method: 'POST',
              headers: {
                'Content-Type': 'multipart/form-data',
              },
              body: formData,
            });
            
            console.log("Response status:", response.status);
            const data = await response.json();
            console.log("Response data:", data);
            setResult(data);
          } catch (err) {
            console.error("API call error:", err);
            setResult({ error: 'Failed to connect to backend.' });
          }
          setLoading(false);
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
    }, [cameraEnabled, facing]);

  // Session Reset Function
  const resetSession = async () => {
    try {
      const response = await fetch(process.env.EXPO_PUBLIC_API_URL + '/reset_pose_session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setResult(data);
      // Show a temporary message
      setResetMessage("Session reset successfully!");
      // Clear message after 3 seconds
      setTimeout(() => setResetMessage(""), 3000);
    } catch (err) {
      setResult({ error: 'Failed to reset session.' });
    }
  };

  // TTS Function
  useEffect(() => {
    if (result?.feedback && !result.error) {
      playTTS(result.feedback).catch((e) => console.warn('TTS error', e));
    }
  }, [result?.feedback]);
  
    return (
    <View style={{ flex: 1, padding: 16 }}>
      {!permission ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Loading permissions...</Text>
        </View>
      ) : !permission.granted ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ marginBottom: 16 }}>Camera permission is required.</Text>
          <Button title="Grant Camera Permission" onPress={requestPermission} />
        </View>
      ) : (
        <>
          <Text style={{ marginBottom: 12 }}></Text>
            <Button
              title={cameraEnabled ? "Hide Camera" : "Show Camera"}
              onPress={() => setCameraEnabled(!cameraEnabled)}
            />
            {cameraEnabled && (
              <>
                <Button
                  title={`Switch to ${facing === 'back' ? 'Front' : 'Back'} Camera`}
                  onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
                />
                <Button
                  title="Reset Exercise Counter"
                  onPress={resetSession}
                  color="#FF6347"
                />
                <CameraView
                  ref={cameraRef}
                  style={{ 
                    width: 398,
                    height: 550,
                    // flex: 1, 
                    marginTop: 16, 
                    borderRadius: 12, 
                    overflow: 'hidden' 
                  }}
                  facing={facing}
                >
                  {/* Camera overlay text */}
                  <Text style={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', padding: 8 }}>Camera Preview</Text>
                </CameraView>
              </>
            )}
          {/* Reset Message Status */}
          {resetMessage ? (
            <Text style={{ color: 'green', marginBottom: 8, textAlign: 'center' }}>{resetMessage}</Text>
          ) : null}
          {loading && <Text>Processing...</Text>}
          {result && (
            <View style={{ marginTop: 16 }}>
              {result.error ? (
                <Text style={{ color: 'red' }}>Error: {result.error}</Text>
              ) : (
                <>
                  <Text>Reps: {result.reps}</Text>
                  <Text>Stage: {result.stage}</Text>
                  <Text>Average Angle: {result.avg_angle}</Text>
                  <Text>Knee Angle: {result.knee_angle}</Text>
                  <Text>Hip Angle: {result.hip_angle}</Text>
                  <Text>Feedback: {result.feedback}</Text>
                </>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}