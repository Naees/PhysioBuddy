import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Button, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

export default function Explore() {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<any>(null);

  // Auto send frames 1sec at a time to backend to check
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (cameraEnabled) {
      interval = setInterval(async () => {
        if (cameraRef.current) {
          const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: false });
          setPhotoUri(photo.uri);

          // Send to backend automatically
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
            const response = await fetch(process.env.EXPO_PUBLIC_API_URL + '/pose', {
              method: 'POST',
              headers: {
                'Content-Type': 'multipart/form-data',
              },
              body: formData,
            });
            const data = await response.json();
            setResult(data);
          } catch (err) {
            setResult({ error: 'Failed to connect to backend.' });
          }
          setLoading(false);
        }
      }, 1000); // every 1 second
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cameraEnabled, facing]);

    return (
    <View style={{ flex: 1, padding: 16 }}>
      {!permission ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Loading permissions...</Text>
        </View>
      ) : !permission.granted ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ marginBottom: 16, fontSize: 18, fontWeight: 'bold' }}>Explore Camera Page</Text>
          <Text style={{ marginBottom: 16 }}>Camera permission is required.</Text>
          <Button title="Grant Camera Permission" onPress={requestPermission} />
        </View>
      ) : (
        <>
          <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 12 }}>Explore Camera Page</Text>
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
              <CameraView
                ref={cameraRef}
                style={{ 
                  width: 398,
                  height: 600,
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
          {loading && <Text>Processing...</Text>}
          {result && (
            <View style={{ marginTop: 16 }}>
              {result.error ? (
                <Text style={{ color: 'red' }}>Error: {result.error}</Text>
              ) : (
                <>
                  <Text>Knee Angle: {result.knee_angle}</Text>
                  <Text>Message: {result.message}</Text>
                </>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}