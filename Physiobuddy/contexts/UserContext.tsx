import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  age: number;
  injuryType: string;
  recoveryPhase: string;
  specialNotes: string;
  workoutsPerWeek: number;
}

interface Patient {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoggedIn: boolean;
  loading: boolean;
  selectedPatientId: string;
  setSelectedPatientId: (id: string) => void;
  availablePatients: Patient[];
  patientsLoading: boolean;
  refreshTrigger: number;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState('1'); // Default to patient ID 1
  const [availablePatients, setAvailablePatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchPatients();
    fetchUser();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      fetchUser();
      setRefreshTrigger(prev => prev + 1); // Trigger refresh for other components
    }
  }, [selectedPatientId]);

  const fetchUser = async () => {
    try {
      const apiUrl = `${process.env.EXPO_PUBLIC_API_URL}/patients/${selectedPatientId}`;
      console.log('Fetching user from:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const userData = await response.json();
        console.log('User data received:', userData);
        setUser({
          id: userData.id.toString(),
          name: `${userData.first_name} ${userData.last_name}`,
          email: userData.email,
          age: userData.age,
          injuryType: userData.injury_type || 'Not specified',
          recoveryPhase: userData.recovery_phase || 'Assessment',
          specialNotes: userData.special_notes || 'No special notes',
          workoutsPerWeek: userData.workouts_per_week || 6
        });
      } else {
        console.log('API response not ok, using fallback user');
        setUser({
          id: '1',
          name: 'Sean Mitchell',
          email: 'sean.mitchell@email.com',
          age: 28,
          injuryType: 'Knee Surgery (Meniscus Repair)',
          recoveryPhase: 'Phase 2 - Early Mobility',
          specialNotes: 'Allergic to ibuprofen. Previous ACL reconstruction 2019.',
          workoutsPerWeek: 6
        });
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      console.log('Using fallback user due to error');
      // Fallback to default user
      setUser({
        id: '1',
        name: 'Sean Mitchell',
        email: 'sean.mitchell@email.com',
        age: 28,
        injuryType: 'Knee Surgery (Meniscus Repair)',
        recoveryPhase: 'Phase 2 - Early Mobility',
        specialNotes: 'Allergic to ibuprofen. Previous ACL reconstruction 2019.',
        workoutsPerWeek: 6
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/patients`);
      if (response.ok) {
        const patientsData = await response.json();
        setAvailablePatients(patientsData);
      }
    } catch (error) {
      console.error('Failed to fetch patients:', error);
      // Fallback patient list
      setAvailablePatients([
        { id: 1, name: 'John Smith', first_name: 'John', last_name: 'Smith', email: 'john.smith@email.com' },
        { id: 2, name: 'Maria Garcia', first_name: 'Maria', last_name: 'Garcia', email: 'maria.garcia@email.com' },
        { id: 3, name: 'David Wilson', first_name: 'David', last_name: 'Wilson', email: 'david.wilson@email.com' },
        { id: 4, name: 'Lisa Brown', first_name: 'Lisa', last_name: 'Brown', email: 'lisa.brown@email.com' },
        { id: 5, name: 'James Taylor', first_name: 'James', last_name: 'Taylor', email: 'james.taylor@email.com' }
      ]);
    } finally {
      setPatientsLoading(false);
    }
  };

  const isLoggedIn = user !== null;

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser, 
      isLoggedIn, 
      loading, 
      selectedPatientId, 
      setSelectedPatientId, 
      availablePatients, 
      patientsLoading,
      refreshTrigger
    }}>
      {children}
    </UserContext.Provider>
  );
};