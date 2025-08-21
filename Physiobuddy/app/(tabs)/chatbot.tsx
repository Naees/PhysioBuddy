import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button, View, Text } from 'react-native';
import { useState } from 'react';

export default function Chatbot() {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraEnabled, setCameraEnabled] = useState(false);

  if (!permission) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ marginBottom: 16, fontSize: 18, fontWeight: 'bold' }}>Chatbot Camera Page</Text>
        <Text style={{ marginBottom: 16 }}>Camera permission is required.</Text>
        <Button title="Grant Camera Permission" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 12 }}>Chatbot Camera Page</Text>
      <Text style={{ marginBottom: 12 }}>
        {cameraEnabled ? "Camera is enabled." : "Camera is hidden."}
      </Text>
      <Button
        title={cameraEnabled ? "Hide Camera" : "Show Camera"}
        onPress={() => setCameraEnabled(!cameraEnabled)}
      />
      {cameraEnabled && (
        <CameraView
          style={{ flex: 1, marginTop: 16, borderRadius: 12, overflow: 'hidden' }}
          facing="back"
        />
      )}
    </View>
  );
}