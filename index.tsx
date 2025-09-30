import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const HABITS_KEY = '@streakmate_habits';

interface Habit {
  id: string;
  name: string;
  streak: number;
  lastCompleted: string | null;
  createdAt: string;
}

interface Person {
  id: string;
  name: string;
  habits: { [key: string]: number };
  isUser?: boolean;
  totalStreak?: number;
}

const MOCK_FRIENDS: Person[] = [
  { id: '1', name: 'Alex', habits: { 'workout': 45, 'reading': 30 } },
  { id: '2', name: 'Jordan', habits: { 'workout': 38, 'meditation': 22 } },
  { id: '3', name: 'Sam', habits: { 'reading': 50, 'running': 18 } },
  { id: '4', name: 'Taylor', habits: { 'workout': 28, 'reading': 35 } },
];

const isToday = (dateString: string | null): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

const isYesterday = (dateString: string | null): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
};

const resetStreaksIfNeeded = (habits: Habit[]): Habit[] => {
  return habits.map(habit => {
    if (!habit.lastCompleted) return habit;
    const completedToday = isToday(habit.lastCompleted);
    const completedYesterday = isYesterday(habit.lastCompleted);
    if (!completedToday && !completedYesterday) {
      return { ...habit, streak: 0 };
    }
    return habit;
  });
};

const HabitCard = ({ habit, onToggle, onDelete }: { habit: Habit; onToggle: (id: string) => void; onDelete: (id: string) => void }) => {
  const completedToday = isToday(habit.lastCompleted);

  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.textContainer}>
          <Text style={styles.habitName}>{habit.name}</Text>
          <Text style={styles.streakText}>
            🔥 {habit.streak} day{habit.streak !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.checkButton, completedToday && styles.checkButtonCompleted]}
          onPress={() => onToggle(habit.id)}
        >
          <Text style={styles.checkButtonText}>{completedToday ? '✓' : '○'}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(habit.id)}>
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );
};

const LeaderboardCard = ({ person, rank }: { person: Person; rank: number }) => {
  const getMedal = (r: number): string => {
    if (r === 1) return '🥇';
    if (r === 2) return '🥈';
    if (r === 3) return '🥉';
    return r.toString();
  };

  return (
    <View style={[styles.leaderCard, person.isUser && styles.userLeaderCard]}>
      <View style={styles.leaderHeader}>
        <Text style={styles.rank}>{getMedal(rank)}</Text>
        <Text style={[styles.leaderName, person.isUser && styles.userLeaderName]}>
          {person.name}
        </Text>
        <Text style={styles.totalStreak}>🔥 {person.totalStreak}</Text>
      </View>
      <View style={styles.habitsContainer}>
        {Object.entries(person.habits).map(([habit, streak]) => (
          <View key={habit} style={styles.habitRow}>
            <Text style={styles.habitLabel}>{habit}</Text>
            <Text style={styles.habitStreakValue}>{streak}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default function App() {
  const [screen, setScreen] = useState<'home' | 'add' | 'leaderboard'>('home');
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabitName, setNewHabitName] = useState('');

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    await setupNotifications();
    await loadHabits();
  };

  const setupNotifications = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;

      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'StreakMate Reminder 🔥',
          body: "Don't break your streak! Mark today's habits.",
        },
        trigger: { hour: 21, minute: 0, repeats: true },
      });
    } catch (error) {
      console.error('Notification setup error:', error);
    }
  };

  const loadHabits = async () => {
    try {
      const data = await AsyncStorage.getItem(HABITS_KEY);
      const loadedHabits: Habit[] = data ? JSON.parse(data) : [];
      const resetHabits = resetStreaksIfNeeded(loadedHabits);
      setHabits(resetHabits);
      if (JSON.stringify(loadedHabits) !== JSON.stringify(resetHabits)) {
        await saveHabits(resetHabits);
      }
    } catch (error) {
      console.error('Load habits error:', error);
    }
  };

  const saveHabits = async (habitsToSave: Habit[]) => {
    try {
      await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(habitsToSave));
    } catch (error) {
      console.error('Save habits error:', error);
    }
  };

  const toggleHabit = async (id: string) => {
    const updated = habits.map(habit => {
      if (habit.id === id) {
        const now = new Date().toISOString();
        const alreadyDone = isToday(habit.lastCompleted);
        if (alreadyDone) {
          return { ...habit, streak: Math.max(0, habit.streak - 1), lastCompleted: null };
        } else {
          return { ...habit, streak: habit.streak + 1, lastCompleted: now };
        }
      }
      return habit;
    });
    setHabits(updated);
    await saveHabits(updated);
  };

  const deleteHabit = (id: string) => {
    Alert.alert('Delete Habit', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const filtered = habits.filter(h => h.id !== id);
          setHabits(filtered);
          await saveHabits(filtered);
        },
      },
    ]);
  };

  const addHabit = async () => {
    if (!newHabitName.trim()) {
      Alert.alert('Error', 'Please enter a habit name');
      return;
    }
    const newHabit: Habit = {
      id: Date.now().toString(),
      name: newHabitName.trim(),
      streak: 0,
      lastCompleted: null,
      createdAt: new Date().toISOString(),
    };
    const updated = [...habits, newHabit];
    setHabits(updated);
    await saveHabits(updated);
    setNewHabitName('');
    setScreen('home');
  };

  const getLeaderboardData = (): Person[] => {
    const allData: Person[] = [
      {
        id: 'user',
        name: 'You',
        habits: habits.reduce((acc, h) => {
          acc[h.name.toLowerCase()] = h.streak;
          return acc;
        }, {} as { [key: string]: number }),
        isUser: true,
      },
      ...MOCK_FRIENDS,
    ];
    const withTotals = allData.map(p => ({
      ...p,
      totalStreak: Object.values(p.habits).reduce((sum, s) => sum + s, 0),
    }));
    withTotals.sort((a, b) => (b.totalStreak || 0) - (a.totalStreak || 0));
    return withTotals;
  };

  if (screen === 'home') {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>StreakMate</Text>
        </View>
        <ScrollView style={styles.scrollView}>
          {habits.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No habits yet!</Text>
              <Text style={styles.emptySubtext}>Tap the + button to add your first habit</Text>
            </View>
          ) : (
            habits.map(habit => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onToggle={toggleHabit}
                onDelete={deleteHabit}
              />
            ))
          )}
        </ScrollView>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.addButton} onPress={() => setScreen('add')}>
            <Text style={styles.addButtonText}>+ Add Habit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.leaderboardButton} onPress={() => setScreen('leaderboard')}>
            <Text style={styles.leaderboardButtonText}>🏆 Leaderboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (screen === 'add') {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setScreen('home')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Habit</Text>
        </View>
        <View style={styles.formContainer}>
          <Text style={styles.label}>Habit Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Morning workout"
            value={newHabitName}
            onChangeText={setNewHabitName}
            autoFocus
          />
          <TouchableOpacity style={styles.submitButton} onPress={addHabit}>
            <Text style={styles.submitButtonText}>Add Habit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (screen === 'leaderboard') {
    const leaderboardData = getLeaderboardData();
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setScreen('home')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leaderboard</Text>
        </View>
        <View style={styles.leaderboardHeader}>
          <Text style={styles.leaderboardHeaderText}>Compare your streaks with friends</Text>
          <Text style={styles.leaderboardSubtext}>(Mock data for MVP)</Text>
        </View>
        <ScrollView style={styles.scrollView}>
          {leaderboardData.map((person, index) => (
            <LeaderboardCard key={person.id} person={person} rank={index + 1} />
          ))}
        </ScrollView>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    position: 'absolute',
    left: 0,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  textContainer: {
    flex: 1,
  },
  habitName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  streakText: {
    fontSize: 14,
    color: '#666',
  },
  checkButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkButtonCompleted: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  checkButtonText: {
    fontSize: 24,
    color: '#000',
  },
  deleteButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  deleteButtonText: {
    color: '#999',
    fontSize: 12,
  },
  buttonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  addButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  leaderboardButton: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  leaderboardButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  formContainer: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  leaderboardHeader: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  leaderboardHeaderText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  leaderboardSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  leaderCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  userLeaderCard: {
    backgroundColor: '#fff9e6',
    borderColor: '#ffd700',
    borderWidth: 2,
  },
  leaderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  rank: {
    fontSize: 24,
    marginRight: 12,
  },
  leaderName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  userLeaderName: {
    fontWeight: '700',
  },
  totalStreak: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  habitsContainer: {
    gap: 6,
  },
  habitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  habitLabel: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  habitStreakValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});