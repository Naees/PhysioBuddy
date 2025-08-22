import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useUser } from '@/contexts/UserContext';

interface PatientData {
  name: string;
  age: number;
  specialNote: string;
  injuryType: string;
  recoveryPhase: string;
  workoutsAllocated: number;
}

interface PainScale {
  day: string;
  scale: number;
  completed: boolean;
}

export default function ProfileNewPage() {
  const { user, loading: userLoading, selectedPatientId, setSelectedPatientId, availablePatients, patientsLoading } = useUser();
  const [reflection, setReflection] = useState('');
  const [weeklyProgress, setWeeklyProgress] = useState(42);
  const [progressData, setProgressData] = useState<any>({ exercises_completed: 3, exercises_planned: 6, weekly_target: 6 });

  const [patientInfo, setPatientInfo] = useState<any>(null);
  const [todayExercises, setTodayExercises] = useState<any[]>([
    { name: "Shoulder Rotations", status: "completed" },
    { name: "Knee Strengthening", status: "pending" },
    { name: "Back Stretches", status: "pending" }
  ]);
  const [painReports, setPainReports] = useState<PainScale[]>([
    { day: "MON", scale: 6, completed: true },
    { day: "TUE", scale: 5, completed: true },
    { day: "WED", scale: 5, completed: true },
    { day: "THU", scale: 0, completed: false },
    { day: "FRI", scale: 0, completed: false },
    { day: "SAT", scale: 0, completed: false },
    { day: "SUN", scale: 0, completed: false },
  ]);

  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [appointment, setAppointment] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user, selectedPatientId]);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        fetchProfileData();
      }
    }, [user, selectedPatientId])
  );

  const fetchProfileData = async () => {
    try {
      const [patientResponse, painResponse, progressResponse, exercisesResponse, appointmentResponse] = await Promise.all([
        fetch(`${process.env.EXPO_PUBLIC_API_URL}/patients/${selectedPatientId}`),
        fetch(`${process.env.EXPO_PUBLIC_API_URL}/patients/${selectedPatientId}/pain-reports`),
        fetch(`${process.env.EXPO_PUBLIC_API_URL}/patients/${selectedPatientId}/progress`),
        fetch(`${process.env.EXPO_PUBLIC_API_URL}/patients/${selectedPatientId}/exercises/today`),
        fetch(`${process.env.EXPO_PUBLIC_API_URL}/patients/${selectedPatientId}/appointments`)
      ]);

      if (patientResponse.ok) {
        const patientData = await patientResponse.json();
        setPatientInfo(patientData);
      }

      if (painResponse.ok) {
        const painData = await painResponse.json();
        if (painData.length > 0) {
          const formattedPain = painData.map((report: any) => ({
            day: report.date.toUpperCase(),
            scale: report.scale,
            completed: report.scale > 0
          }));
          setPainReports(formattedPain);
        }
      }

      if (progressResponse.ok) {
        const progressInfo = await progressResponse.json();
        setWeeklyProgress(progressInfo.completion_percentage || 42);
        setProgressData({
          exercises_completed: progressInfo.exercises_completed || 3,
          exercises_planned: progressInfo.exercises_planned || 6,
          weekly_target: progressInfo.weekly_target || 6
        });
      }



      if (exercisesResponse.ok) {
        const exercisesData = await exercisesResponse.json();
        setTodayExercises(exercisesData);
      }

      if (appointmentResponse.ok) {
        const appointmentData = await appointmentResponse.json();
        setAppointment(appointmentData);
      } else {
        setAppointment(null);
      }
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
    }
  };

  const getCurrentPatientName = () => {
    const currentPatient = availablePatients.find(p => p.id.toString() === selectedPatientId);
    return currentPatient ? currentPatient.first_name : 'Patient';
  };

  if (userLoading || patientsLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading user data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No user data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  const patientData: PatientData = {
    name: patientInfo ? `${patientInfo.first_name} ${patientInfo.last_name}` : user.name,
    age: patientInfo?.age || user.age,
    specialNote: patientInfo?.special_notes || user.specialNotes,
    injuryType: patientInfo?.injury_type || user.injuryType,
    recoveryPhase: patientInfo?.recovery_phase || user.recoveryPhase,
    workoutsAllocated: patientInfo?.workouts_per_week || user.workoutsPerWeek
  };



  const exportPatientInfo = async () => {
    const patientInfo = {
      ...patientData,
      weeklyPainScale: painReports.filter(day => day.completed),
      weeklyProgress,
      reflection,
      lastUpdated: new Date().toISOString(),
    };
    
    const dataStr = JSON.stringify(patientInfo, null, 2);
    
    try {
      await Share.share({
        message: `Patient Data for ${patientData.name}:\n\n${dataStr}`,
        title: 'Patient Information Export',
      });
    } catch (error) {
      Alert.alert('Export Failed', 'Unable to export patient data');
    }
  };

  const getPainLevel = (scale: number) => {
    if (scale >= 7) return { level: 'High', color: '#ef4444' };
    if (scale >= 4) return { level: 'Moderate', color: '#f59e0b' };
    if (scale >= 1) return { level: 'Low', color: '#10b981' };
    return { level: 'None', color: '#6b7280' };
  };

  const getCompletedPainData = () => {
    const completed = painReports.filter(day => day.completed);
    if (completed.length === 0) return { average: 0, trend: 'stable' };
    
    const average = completed.reduce((sum, day) => sum + day.scale, 0) / completed.length;
    const recent = completed.slice(-2);
    const trend = recent.length === 2 ? 
      (recent[1].scale < recent[0].scale ? 'improving' : 
       recent[1].scale > recent[0].scale ? 'worsening' : 'stable') : 'stable';
    
    return { average: Math.round(average * 10) / 10, trend };
  };

  const painData = getCompletedPainData();

  const getTrendEmoji = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'worsening': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return '#10b981';
      case 'worsening': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1}
        onPress={() => setShowPatientSelector(false)}
        disabled={!showPatientSelector}
      >
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>👤</Text>
              </View>
              <View>
                <Text style={styles.headerTitle}>Patient Profile</Text>
                <Text style={styles.headerSubtitle}>Medical Dashboard</Text>
              </View>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={styles.patientSelector}
                onPress={() => setShowPatientSelector(!showPatientSelector)}
              >
                <Text style={styles.patientSelectorText}>{getCurrentPatientName()} ▼</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.exportButton}
                onPress={exportPatientInfo}
              >
                <Text style={styles.exportButtonText}>📤 Export</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Patient Selector Dropdown */}
          {showPatientSelector && (
            <View style={styles.patientDropdown}>
              {availablePatients.length > 0 ? availablePatients.map((patient) => (
                <TouchableOpacity
                  key={patient.id}
                  style={[
                    styles.patientOption,
                    patient.id.toString() === selectedPatientId && styles.selectedPatientOption
                  ]}
                  onPress={() => {
                    setSelectedPatientId(patient.id.toString());
                    setShowPatientSelector(false);
                  }}
                >
                  <Text style={[
                    styles.patientOptionText,
                    patient.id.toString() === selectedPatientId && styles.selectedPatientOptionText
                  ]}>
                    {patient.name}
                  </Text>
                </TouchableOpacity>
              )) : (
                <View style={styles.patientOption}>
                  <Text style={styles.patientOptionText}>Loading patients...</Text>
                </View>
              )}
            </View>
          )}

          {/* Welcome Message */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>
              Good morning, {getCurrentPatientName()}!
            </Text>
            <Text style={styles.welcomeSubtitle}>
              How do you feel about your current health conditions?
            </Text>
          </View>

          {/* Reflection Input */}
          <View style={styles.reflectionCard}>
            <Text style={styles.reflectionLabel}>Your reflection</Text>
            <TextInput
              style={styles.reflectionInput}
              value={reflection}
              onChangeText={setReflection}
              placeholder="Share how you're feeling today..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={async () => {
                try {
                  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/patients/${selectedPatientId}/reflections`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reflection_text: reflection })
                  });
                  if (response.ok) {
                    Alert.alert('Success', 'Reflection saved successfully!');
                  }
                } catch (error) {
                  Alert.alert('Error', 'Failed to save reflection');
                }
              }}
            >
              <Text style={styles.saveButtonText}>Save Reflection</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Patient Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>👤 Patient Information</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{patientData.name}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Age</Text>
                <Text style={styles.infoValue}>{patientData.age} years</Text>
              </View>
            </View>
            
            <View style={styles.specialNoteContainer}>
              <Text style={styles.specialNoteLabel}>⚠️ Special Notes</Text>
              <View style={styles.specialNoteBox}>
                <Text style={styles.specialNoteText}>{patientData.specialNote}</Text>
              </View>
            </View>
            
            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Injury Type</Text>
                <Text style={styles.infoValue}>{patientData.injuryType}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Recovery Phase</Text>
                <View style={styles.phaseBadge}>
                  <Text style={styles.phaseBadgeText}>{patientData.recoveryPhase}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Workouts Allocated</Text>
                <Text style={styles.infoValue}>{patientData.workoutsAllocated} sessions/week</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Weekly Pain Scale */}
        <View style={[styles.card, styles.painCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>📊 Weekly Pain Assessment</Text>
          </View>
          <View style={styles.cardContent}>
            {/* Summary Stats */}
            <View style={styles.painSummary}>
              <View style={styles.painStat}>
                <Text style={styles.painStatLabel}>Average Pain</Text>
                <Text style={styles.painStatValue}>{painData.average}/10</Text>
              </View>
              <View style={styles.painStat}>
                <Text style={styles.painStatLabel}>Trend</Text>
                <View style={styles.trendContainer}>
                  <Text style={styles.trendEmoji}>{getTrendEmoji(painData.trend)}</Text>
                  <Text style={[styles.trendText, { color: getTrendColor(painData.trend) }]}>
                    {painData.trend}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Daily Pain Scale */}
            <View style={styles.dailyReports}>
              <Text style={styles.dailyReportsTitle}>Daily Reports</Text>
              {painReports.map((day, index) => (
                <View key={index} style={styles.dailyReportItem}>
                  <Text style={styles.dayLabel}>{day.day}</Text>
                  {day.completed ? (
                    <View style={styles.painReportCompleted}>
                      <View 
                        style={[styles.painDot, { backgroundColor: getPainLevel(day.scale).color }]}
                      />
                      <Text style={styles.painReportText}>
                        {day.scale}/10 - {getPainLevel(day.scale).level}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.painReportIncomplete}>Not reported</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Weekly Progress */}
        <View style={[styles.card, styles.progressCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>📈 Recovery Progress</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.progressContainer}>
              {/* Progress Circle */}
              <View style={styles.progressCircleContainer}>
                <View style={styles.progressCircle}>
                  <Text style={styles.progressPercentage}>{weeklyProgress}%</Text>
                </View>
              </View>
              
              {/* Progress Stats */}
              <View style={styles.progressStats}>
                <View style={styles.progressTarget}>
                  <Text style={styles.progressTargetTitle}>Weekly Target</Text>
                  <Text style={styles.progressTargetSubtitle}>{progressData.weekly_target} sessions planned</Text>
                </View>
                
                <View style={styles.progressNumbers}>
                  <View style={styles.progressNumber}>
                    <Text style={styles.progressNumberValue}>{progressData.exercises_completed}</Text>
                    <Text style={styles.progressNumberLabel}>Completed</Text>
                  </View>
                  <View style={styles.progressNumber}>
                    <Text style={styles.progressNumberValue}>{progressData.exercises_planned - progressData.exercises_completed}</Text>
                    <Text style={styles.progressNumberLabel}>Remaining</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarSection}>
              <View style={styles.progressBarHeader}>
                <Text style={styles.progressBarLabel}>This week</Text>
                <Text style={styles.progressBarValue}>{weeklyProgress}% complete</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[styles.progressBarFill, { width: `${weeklyProgress}%` }]}
                />
              </View>
              <Text style={styles.progressBarFooter}>Keep up the great progress!</Text>
            </View>
          </View>
        </View>

        {/* Today's Exercises Preview */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>📋 Today's Exercises</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.exercisesList}>
              {todayExercises.length > 0 ? todayExercises.map((exercise, index) => (
                <View key={index} style={styles.exerciseItem}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <View style={[
                    styles.exerciseStatus,
                    exercise.status === 'completed' ? styles.completedStatus :
                    exercise.status === 'pending' ? styles.pendingStatus : styles.inProgressStatus
                  ]}>
                    <Text style={[
                      exercise.status === 'completed' ? styles.completedStatusText :
                      exercise.status === 'pending' ? styles.pendingStatusText : styles.inProgressStatusText
                    ]}>
                      {exercise.status === 'completed' ? 'Completed' :
                       exercise.status === 'pending' ? 'Pending' : 'In Progress'}
                    </Text>
                  </View>
                </View>
              )) : (
                <Text style={styles.exerciseName}>No exercises assigned for today</Text>
              )}
            </View>
            {todayExercises.length > 0 && (
              <>
                <View style={styles.exercisesProgressBar}>
                  <View style={[styles.exercisesProgressFill, { 
                    width: `${(todayExercises.filter(ex => ex.status === 'completed').length / todayExercises.length) * 100}%` 
                  }]} />
                </View>
                <Text style={styles.exercisesProgressText}>
                  {todayExercises.filter(ex => ex.status === 'completed').length} of {todayExercises.length} exercises completed
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Upcoming Appointments */}
        <View style={[styles.card, styles.appointmentCard]}>
          <View style={[styles.cardContent, styles.appointmentContent]}>
            <Text style={styles.appointmentTitle}>📅 Your Upcoming Appointments</Text>
            <View style={styles.appointmentDetails}>
              {appointment ? (
                <>
                  <Text style={styles.appointmentDate}>{appointment.date}</Text>
                  <Text style={styles.appointmentTime}>• Physio session @{appointment.time}</Text>
                </>
              ) : (
                <Text style={styles.appointmentDate}>No upcoming appointments</Text>
              )}
            </View>
          </View>
        </View>
        </ScrollView>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafbfc',
  },
  overlay: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    backgroundColor: '#f0f7ff',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#1e40af',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    color: '#ffffff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e40af',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  exportButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  exportButtonText: {
    fontSize: 14,
    color: '#1e40af',
    fontWeight: '600',
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
    lineHeight: 32,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  reflectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  reflectionLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  reflectionInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    fontSize: 16,
    color: '#111827',
    minHeight: 80,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  painCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#1e40af',
  },
  progressCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  appointmentCard: {
    backgroundColor: '#fdf2f8',
    borderWidth: 1,
    borderColor: '#f9a8d4',
  },
  cardHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  cardContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  specialNoteContainer: {
    marginBottom: 16,
  },
  specialNoteLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  specialNoteBox: {
    backgroundColor: '#fef3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    padding: 12,
    borderRadius: 8,
  },
  specialNoteText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  infoSection: {
    gap: 12,
  },
  phaseBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  phaseBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
  },
  painSummary: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 16,
  },
  painStat: {
    flex: 1,
    alignItems: 'center',
  },
  painStatLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  painStatValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendEmoji: {
    fontSize: 16,
  },
  trendText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dailyReports: {
    gap: 8,
  },
  dailyReportsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  dailyReportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 8,
    padding: 8,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    width: 40,
    textAlign: 'left',
  },
  painReportCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  painDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  painReportText: {
    fontSize: 14,
    color: '#374151',
  },
  painReportIncomplete: {
    fontSize: 14,
    color: '#9ca3af',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressCircleContainer: {
    marginRight: 16,
  },
  progressCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: '600',
    color: '#10b981',
  },
  progressStats: {
    flex: 1,
    gap: 12,
  },
  progressTarget: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    padding: 12,
  },
  progressTargetTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
  },
  progressTargetSubtitle: {
    fontSize: 12,
    color: '#16a34a',
    marginTop: 2,
  },
  progressNumbers: {
    flexDirection: 'row',
    gap: 8,
  },
  progressNumber: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  progressNumberValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  progressNumberLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressBarSection: {
    gap: 8,
  },
  progressBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressBarLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressBarValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  progressBarFooter: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  exercisesList: {
    gap: 8,
    marginBottom: 12,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: 14,
    color: '#374151',
  },
  exerciseStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  completedStatus: {
    backgroundColor: '#dcfce7',
  },
  completedStatusText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
  },
  inProgressStatus: {
    backgroundColor: '#fef3c7',
  },
  inProgressStatusText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
  },
  pendingStatus: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  pendingStatusText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  exercisesProgressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 8,
  },
  exercisesProgressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  exercisesProgressText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#be185d',
    marginBottom: 8,
  },
  appointmentDetails: {
    alignItems: 'center',
  },
  appointmentDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#be185d',
    marginBottom: 4,
  },
  appointmentTime: {
    fontSize: 14,
    color: '#be185d',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  patientSelector: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1e40af',
  },
  patientSelectorText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  patientDropdown: {
    position: 'absolute',
    top: 80,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
    minWidth: 150,
  },
  patientOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectedPatientOption: {
    backgroundColor: '#f0f7ff',
  },
  patientOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  selectedPatientOptionText: {
    color: '#1e40af',
    fontWeight: '600',
  },
  appointmentContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
});