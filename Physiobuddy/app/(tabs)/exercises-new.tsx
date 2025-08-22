import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Button,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useUser } from '@/contexts/UserContext';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { Audio } from 'expo-av';
import { playTTS } from '@/utils/tts';

interface Exercise {
  id: string;
  exerciseId?: number;
  name: string;
  duration: string;
  reps: string;
  sets: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  completed: boolean;
  description: string;
  instructions: string[];
}

export default function ExercisesNewPage() {
  const { selectedPatientId, refreshTrigger } = useUser();
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [currentSet, setCurrentSet] = useState(1);
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentReps, setCurrentReps] = useState(0);
  const [targetReps, setTargetReps] = useState(10);
  
  // Camera and pose detection states
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [poseResult, setPoseResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<any>(null);
  const [resetMessage, setResetMessage] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([
    {
      id: '1',
      name: 'Shoulder Rotations',
      duration: '5 min',
      reps: '10 each direction',
      sets: 2,
      difficulty: 'Easy',
      completed: true,
      description: 'Gentle shoulder mobility exercise to improve range of motion.',
      instructions: [
        'Stand with feet shoulder-width apart',
        'Keep arms at your sides',
        'Slowly roll shoulders forward 10 times',
        'Then roll shoulders backward 10 times',
        'Repeat for prescribed sets'
      ]
    },
    {
      id: '2',
      name: 'Knee Strengthening',
      duration: '10 min',
      reps: '15 reps',
      sets: 3,
      difficulty: 'Medium',
      completed: false,
      description: 'Quadriceps strengthening exercise for knee stability.',
      instructions: [
        'Sit on a chair with back straight',
        'Slowly extend your affected leg',
        'Hold for 5 seconds when fully extended',
        'Lower slowly back to starting position',
        'Rest 30 seconds between sets'
      ]
    },
    {
      id: '3',
      name: 'Back Stretches',
      duration: '8 min',
      reps: '30 second holds',
      sets: 2,
      difficulty: 'Easy',
      completed: false,
      description: 'Lower back flexibility and pain relief stretches.',
      instructions: [
        'Lie on your back with knees bent',
        'Pull both knees to your chest',
        'Hold the stretch for 30 seconds',
        'Feel gentle stretch in lower back',
        'Breathe deeply throughout'
      ]
    },
    {
      id: '4',
      name: 'Hip Flexor Stretch',
      duration: '6 min',
      reps: '30 second holds',
      sets: 2,
      difficulty: 'Easy',
      completed: false,
      description: 'Hip mobility exercise to reduce tightness.',
      instructions: [
        'Start in a lunge position',
        'Lower your back knee to the ground',
        'Push your hips forward gently',
        'Hold stretch for 30 seconds',
        'Switch sides and repeat'
      ]
    }
  ]);

  useEffect(() => {
    fetchExercises();
  }, [selectedPatientId, refreshTrigger]);

  // Auto send frames for pose detection
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (cameraEnabled && selectedExercise) {
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
            setPoseResult(data);
            
            // Update currentReps from pose detection
            if (data.reps && data.reps > currentReps) {
              setCurrentReps(data.reps);
            }
          } catch (err) {
            console.error("Pose detection error:", err);
            setPoseResult({ error: 'Failed to connect to backend.' });
          }
          setLoading(false);
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cameraEnabled, facing, selectedExercise]);

  // TTS Function
  useEffect(() => {
    if (poseResult?.feedback && !poseResult.error) {
      playTTS(poseResult.feedback).catch((e) => console.warn('TTS error', e));
    }
  }, [poseResult?.feedback]);

  // Session Reset Function
  const resetPoseSession = async () => {
    try {
      const response = await fetch(process.env.EXPO_PUBLIC_API_URL + '/reset_pose_session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setPoseResult(data);
      setResetMessage("Session reset successfully!");
      setTimeout(() => setResetMessage(""), 3000);
    } catch (err) {
      setPoseResult({ error: 'Failed to reset session.' });
    }
  };



  const fetchExercises = async () => {
    console.log('Fetching exercises for patient:', selectedPatientId);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/patients/${selectedPatientId}/exercises/today`);
      if (response.ok) {
        const exercisesData = await response.json();
        console.log('Exercises data:', exercisesData);
        const formattedExercises = exercisesData.map((ex: any, index: number) => {
          const difficultyMap: { [key: string]: 'Easy' | 'Medium' | 'Hard' } = {
            'beginner': 'Easy',
            'intermediate': 'Medium', 
            'advanced': 'Hard'
          };
          
          return {
            id: (index + 1).toString(),
            exerciseId: ex.id || (index + 1),
            name: ex.name,
            duration: `${ex.duration} min`,
            reps: `${ex.reps} reps`,
            sets: ex.sets,
            difficulty: difficultyMap[ex.difficulty] || 'Medium',
            completed: ex.status === 'completed',
            description: ex.description,
            instructions: ex.instructions ? ex.instructions.split('. ').filter((i: string) => i.length > 0) : [
              'Follow your physiotherapist\'s guidance',
              'Perform the exercise slowly and controlled',
              'Stop if you experience pain beyond 6/10',
              'Breathe normally throughout the movement',
              'Rest between sets as needed'
            ]
          };
        });
        console.log('Setting exercises:', formattedExercises.map(ex => ({ name: ex.name, completed: ex.completed })));
        setExercises([...formattedExercises]); // Force new array reference
      }
    } catch (error) {
      console.error('Failed to fetch exercises:', error);
    }
  };

  const completedCount = exercises.filter(ex => ex.completed).length;
  const progressPercentage = exercises.length > 0 ? (completedCount / exercises.length) * 100 : 0;

  const startExercise = async (exercise: Exercise) => {
    setSelectedExercise(exercise.id);
    setCurrentSet(1);
    setTimeLeft(parseInt(exercise.duration) * 60);
    setIsActive(false);
    
    // Fetch current reps from database
    try {
      if (exercise.exerciseId) {
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/patients/${selectedPatientId}/exercises/${exercise.exerciseId}/reps`);
        if (response.ok) {
          const repsData = await response.json();
          setCurrentReps(repsData.current_reps);
          setTargetReps(repsData.target_reps);
        } else {
          setCurrentReps(0);
          setTargetReps(parseInt(exercise.reps));
        }
      }
    } catch (error) {
      setCurrentReps(0);
      setTargetReps(parseInt(exercise.reps));
    }
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (!isActive && interval) {
      clearInterval(interval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  const completeSet = async () => {
    const exercise = exercises.find(ex => ex.id === selectedExercise);
    if (exercise && currentSet < exercise.sets) {
      setCurrentSet(prev => prev + 1);
      setCurrentReps(0);
      setTimeLeft(parseInt(exercise.duration) * 60 / exercise.sets);
      setIsActive(false);
    } else {
      // Complete exercise and save to backend
      try {
        if (exercise?.exerciseId) {
          const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/patients/${selectedPatientId}/exercises/${exercise.exerciseId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            // Mark exercise as completed locally
            setExercises(prev => prev.map(ex => 
              ex.id === selectedExercise ? { ...ex, completed: true } : ex
            ));
            Alert.alert('Great job!', 'Exercise completed and saved!');
          } else {
            Alert.alert('Completed!', 'Exercise completed but not saved to server.');
          }
        }
      } catch (error) {
        Alert.alert('Completed!', 'Exercise completed but not saved to server.');
      }
      
      setSelectedExercise(null);
      setCurrentSet(1);
      setCurrentReps(0);
      setIsActive(false);
    }
  };

  const resetTimer = () => {
    const exercise = exercises.find(ex => ex.id === selectedExercise);
    if (exercise) {
      setTimeLeft(parseInt(exercise.duration) * 60 / exercise.sets);
      setIsActive(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return '#10b981';
      case 'Medium': return '#f59e0b';
      case 'Hard': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const selectedEx = exercises.find(ex => ex.id === selectedExercise);

  if (selectedExercise && selectedEx) {
    // Exercise Detail View
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.detailContainer}>
          {/* Header */}
          <View style={styles.detailHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setSelectedExercise(null)}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(selectedEx.difficulty) }]}>
              <Text style={styles.difficultyText}>{selectedEx.difficulty}</Text>
            </View>
          </View>

          {/* Exercise Info */}
          <View style={styles.exerciseInfo}>
            <Text style={styles.exerciseTitle}>{selectedEx.name}</Text>
            <Text style={styles.exerciseDescription}>{selectedEx.description}</Text>
            <View style={styles.exerciseStats}>
              <Text style={styles.statText}>Set {currentSet} of {selectedEx.sets}</Text>
              <Text style={styles.statText}>Reps: {currentReps}/{targetReps}</Text>
            </View>
          </View>

          {/* Rep Counter */}
          <View style={styles.timerCard}>
            <Text style={styles.repCounterText}>{currentReps}</Text>
            <Text style={styles.repCounterLabel}>Reps Completed</Text>
            <View style={styles.timerControls}>
              <TouchableOpacity 
                style={[styles.timerButton, styles.primaryButton]}
                onPress={async () => {
                  try {
                    if (selectedEx.exerciseId) {
                      await fetch(`${process.env.EXPO_PUBLIC_API_URL}/patients/${selectedPatientId}/exercises/${selectedEx.exerciseId}/reps`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'increment' })
                      });
                    }
                    setCurrentReps(prev => prev + 1);
                  } catch (error) {
                    setCurrentReps(prev => prev + 1);
                  }
                }}
              >
                <Text style={styles.timerButtonText}>+ Rep</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.timerButton, styles.secondaryButton]}
                onPress={async () => {
                  try {
                    if (selectedEx.exerciseId) {
                      await fetch(`${process.env.EXPO_PUBLIC_API_URL}/patients/${selectedPatientId}/exercises/${selectedEx.exerciseId}/reps`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'reset' })
                      });
                    }
                    setCurrentReps(0);
                    // Also reset pose session
                    resetPoseSession();
                  } catch (error) {
                    setCurrentReps(0);
                    resetPoseSession();
                  }
                }}
              >
                <Text style={styles.secondaryButtonText}>↻ Reset</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Camera and Pose Detection */}
          <View style={styles.cameraCard}>
            <Text style={styles.cameraTitle}>Exercise Form Tracking</Text>
            {!permission ? (
              <Text>Loading camera permissions...</Text>
            ) : !permission.granted ? (
              <View style={styles.permissionContainer}>
                <Text style={styles.permissionText}>Camera permission is required for form tracking.</Text>
                <Button title="Grant Camera Permission" onPress={requestPermission} />
              </View>
            ) : (
              <>
                <View style={styles.cameraControls}>
                  <TouchableOpacity
                    style={[styles.startExerciseButton, cameraEnabled && styles.stopExerciseButton]}
                    onPress={() => setCameraEnabled(!cameraEnabled)}
                  >
                    <Text style={styles.startExerciseButtonText}>
                      {cameraEnabled ? "Stop Exercise" : "Start Exercise"}
                    </Text>
                  </TouchableOpacity>
                  {cameraEnabled && (
                    <Button
                      title={`Switch to ${facing === 'back' ? 'Front' : 'Back'} Camera`}
                      onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
                    />
                  )}
                </View>
                {cameraEnabled && (
                  <CameraView
                    ref={cameraRef}
                    style={styles.camera}
                    facing={facing}
                  >
                    <Text style={styles.cameraOverlay}>Camera Preview</Text>
                  </CameraView>
                )}
              </>
            )}
            
            {/* Reset Message Status */}
            {resetMessage ? (
              <Text style={styles.resetMessage}>{resetMessage}</Text>
            ) : null}
            
            {loading && <Text style={styles.loadingText}>Processing...</Text>}
            
            {/* Pose Detection Results */}
            {poseResult && (
              <View style={styles.poseResults}>
                {poseResult.error ? (
                  <Text style={styles.errorText}>⚠️ {poseResult.error}</Text>
                ) : (
                  <>
                    <View style={styles.poseStatsGrid}>
                      <View style={styles.poseStatItem}>
                        <Text style={styles.poseStatValue}>{poseResult.reps}</Text>
                        <Text style={styles.poseStatLabel}>Reps</Text>
                      </View>
                      <View style={styles.poseStatItem}>
                        <Text style={styles.poseStatValue}>{poseResult.stage}</Text>
                        <Text style={styles.poseStatLabel}>Stage</Text>
                      </View>
                      <View style={styles.poseStatItem}>
                        <Text style={styles.poseStatValue}>{poseResult.knee_angle}°</Text>
                        <Text style={styles.poseStatLabel}>Knee</Text>
                      </View>
                      <View style={styles.poseStatItem}>
                        <Text style={styles.poseStatValue}>{poseResult.hip_angle}°</Text>
                        <Text style={styles.poseStatLabel}>Hip</Text>
                      </View>
                    </View>
                    <View style={styles.feedbackContainer}>
                      <Text style={styles.feedbackLabel}>💬 Feedback</Text>
                      <Text style={styles.feedbackText}>{poseResult.feedback}</Text>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>

          {/* Instructions */}
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>Instructions</Text>
            {selectedEx.instructions.map((instruction, index) => (
              <View key={index} style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.instructionText}>{instruction}</Text>
              </View>
            ))}
          </View>

          {/* Complete Set Button */}
          {currentReps >= targetReps && (
            <TouchableOpacity 
              style={styles.completeButton}
              onPress={completeSet}
            >
              <Text style={styles.completeButtonText}>
                {currentSet >= selectedEx.sets ? 'Complete Exercise' : 'Complete Set'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Main Exercises List View
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Today's Exercises</Text>
          <Text style={styles.subtitle}>Complete your daily rehabilitation routine</Text>
        </View>

        {/* Progress Overview */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressTitle}>Progress Today</Text>
              <Text style={styles.progressSubtitle}>
                {completedCount} of {exercises.length} exercises completed
              </Text>
            </View>
            <View style={styles.progressStats}>
              <Text style={styles.progressPercentage}>{Math.round(progressPercentage)}%</Text>
              <Text style={styles.trophyEmoji}>🏆</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[styles.progressFill, { width: `${progressPercentage}%` }]} 
            />
          </View>
        </View>

        {/* Exercise List */}
        <View style={styles.exerciseList}>
          {exercises.map((exercise) => (
            <TouchableOpacity
              key={exercise.id}
              style={[
                styles.exerciseCard,
                exercise.completed && styles.completedCard
              ]}
              onPress={() => !exercise.completed && startExercise(exercise)}
              disabled={exercise.completed}
            >
              <View style={styles.exerciseCardHeader}>
                <View style={styles.exerciseCardLeft}>
                  <Text style={styles.exerciseCheckbox}>
                    {exercise.completed ? '✅' : '⭕'}
                  </Text>
                  <View>
                    <Text style={[styles.exerciseName, exercise.completed && styles.completedText]}>
                      {exercise.name}
                    </Text>
                    <Text style={styles.exerciseCardDescription}>
                      {exercise.description}
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: exercise.completed ? '#10b981' : getDifficultyColor(exercise.difficulty) }
                ]}>
                  <Text style={styles.statusBadgeText}>
                    {exercise.completed ? 'Completed' : exercise.difficulty}
                  </Text>
                </View>
              </View>
              
              <View style={styles.exerciseCardFooter}>
                <View style={styles.exerciseStats}>
                  <Text style={styles.exerciseStatText}>⏱ {exercise.duration}</Text>
                  <Text style={styles.exerciseStatText}>🎯 {exercise.sets} sets</Text>
                </View>
                
                {!exercise.completed && (
                  <View style={styles.startButton}>
                    <Text style={styles.startButtonText}>▶ Start</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Motivational Message */}
        {progressPercentage === 100 && (
          <View style={styles.motivationCard}>
            <Text style={styles.motivationEmoji}>🏆</Text>
            <Text style={styles.motivationTitle}>Excellent Work!</Text>
            <Text style={styles.motivationText}>
              You've completed all your exercises for today. Keep up the great progress!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingBottom: 100,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  detailContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#35469f',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  progressCard: {
    backgroundColor: '#5663a7',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  progressSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  progressStats: {
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  trophyEmoji: {
    fontSize: 24,
    marginTop: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
  exerciseList: {
    gap: 16,
    paddingBottom: 24,
  },
  exerciseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  exerciseCardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  exerciseCheckbox: {
    fontSize: 20,
    marginTop: 2,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  completedText: {
    color: '#6b7280',
  },
  exerciseCardDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  exerciseCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseStats: {
    flexDirection: 'row',
    gap: 16,
  },
  exerciseStatText: {
    fontSize: 14,
    color: '#6b7280',
  },
  startButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  startButtonText: {
    fontSize: 14,
    color: '#5663a7',
    fontWeight: '600',
  },
  motivationCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 0,
  },
  motivationEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  motivationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 8,
  },
  motivationText: {
    fontSize: 14,
    color: '#166534',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Detail view styles
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 16,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#5663a7',
    fontWeight: '600',
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  exerciseInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  exerciseTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#35469f',
    marginBottom: 8,
    textAlign: 'center',
  },
  exerciseDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  exerciseStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statText: {
    fontSize: 14,
    color: '#6b7280',
  },
  timerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#5663a7',
    marginBottom: 24,
  },
  repCounterText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#5663a7',
    marginBottom: 8,
  },
  repCounterLabel: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  timerControls: {
    flexDirection: 'row',
    gap: 16,
  },
  timerButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#5663a7',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#5663a7',
  },
  timerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5663a7',
  },
  instructionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    backgroundColor: '#5663a7',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  instructionNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  instructionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    flex: 1,
  },
  completeButton: {
    backgroundColor: '#5663a7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Camera and pose detection styles
  cameraCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cameraTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  permissionContainer: {
    alignItems: 'center',
    padding: 16,
  },
  permissionText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  cameraControls: {
    gap: 12,
    marginBottom: 16,
  },
  camera: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cameraOverlay: {
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
  },
  resetMessage: {
    color: '#10b981',
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 14,
  },
  loadingText: {
    color: '#6b7280',
    textAlign: 'center',
    fontSize: 14,
  },
  poseResults: {
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  poseStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  poseStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  poseStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5663a7',
    marginBottom: 4,
  },
  poseStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  feedbackContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#5663a7',
  },
  feedbackLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  feedbackText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  startExerciseButton: {
    backgroundColor: '#5663a7',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stopExerciseButton: {
    backgroundColor: '#ef4444',
  },
  startExerciseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});