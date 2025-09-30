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

// Storage keys
const HABITS_KEY = '@streakmate_habits';

// Mock friend data for leaderboard
const MOCK_FRIENDS = [
  { id: '1', name: 'Alex', habits: { 'workout': 45, 'reading': 30 } },
  { id: '2', name: 'Jordan', habits: { 'workout': 38, 'meditation': 22 } },
  { id: '3', name: 'Sam', habits: { 'reading': 50, 'running': 18 } },
  { id: '4', name: 'Taylor', habits: { 'workout': 28, 'reading': 35 } },
];

// Utility: Check if date is today
const isToday = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

// Utility: Check if date was yesterday
const isYesterday = (dateString) => {
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

// Utility: Reset streaks if habit wasn't done yesterday
const resetStreaksIfNeeded = (habits) => {
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

// Component: Habit Card
const HabitCard = ({ habit, onToggle, onDelete }) => {
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

// Component: Leaderboard Card
const LeaderboardCard = ({ person, rank }) => {
  const getMedal = (r) => {
    if (r === 1) return '🥇';
    if (r === 2) return '🥈';
    if (r === 3) return '🥉';
    return r;
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

// Main App
export default function App() {
  const [screen, setScreen] = useState('home'); // 'home', 'add', 'leaderboard'
  const [habits, setHabits] = useState([]);
  const [newHabitName, setNewHabitName] = useState('');

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    await setupNotifications();
    await loadHabits();
  };

  // Setup daily notifications
  const setupNotifications = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;

      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.
    }
  }