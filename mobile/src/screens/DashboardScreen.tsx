import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export const DashboardScreen = () => {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.username || 'User'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Sync Indicator */}
        <View style={styles.syncCard}>
          <View style={styles.syncBadge}>
            <Text style={styles.syncDot}>●</Text>
            <Text style={styles.syncBadgeText}>Django Backend Synchronized</Text>
          </View>
          <Text style={styles.syncDescription}>
            Connected to Central PostgreSQL Database via Django REST API.
          </Text>
        </View>

        {/* Milestone Card */}
        <View style={styles.milestoneCard}>
          <Text style={styles.milestoneTitle}>Phase 3.1 Milestone Completed</Text>
          <Text style={styles.milestoneBody}>
            ✓ Authentication System Connected (Login / Register / Email OTP){'\n'}
            ✓ JWT Token Client Persistence Configured{'\n'}
            ✓ Centralized API Service Resolution (Emulator / Physical Device / Cloud){'\n'}
            ✓ Shared Account Database with Nexolith Care Website
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    padding: 20,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
  },
  welcomeText: {
    fontSize: 13,
    color: '#6B7280',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  logoutButton: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 13,
  },
  syncCard: {
    backgroundColor: '#0D9488',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  syncDot: {
    color: '#34D399',
    marginRight: 6,
    fontSize: 12,
  },
  syncBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  syncDescription: {
    color: '#CCFBF1',
    fontSize: 13,
  },
  milestoneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  milestoneBody: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
  },
});
