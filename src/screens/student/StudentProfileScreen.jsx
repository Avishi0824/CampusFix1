import React, { useMemo } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  GraduationCap,
  Building,
  Phone,
  LogOut,
} from 'lucide-react-native';

import { useAuth } from '../../context/AuthContext';
import { useComplaints } from '../../context/ComplaintsContext';

import {
  Typography,
  Spacing,
  Geometry,
} from '../../theme';

import { ScreenHeader } from '../../components/ScreenHeader';
import { Card } from '../../components/Card';
import { StatsCard } from '../../components/StatsCard';
import { Button } from '../../components/Button';

export const StudentProfileScreen = () => {
  const { user, theme, logout } = useAuth();

  const { complaints } = useComplaints();

  // =====================================================
  // ONLY THE LOGGED-IN STUDENT'S COMPLAINTS
  // =====================================================

  const myComplaints = useMemo(() => {
    if (!user?.id) {
      return [];
    }

    return complaints.filter(
      (complaint) =>
        complaint.studentId === user.id
    );
  }, [complaints, user?.id]);

 /* ---------------- COMPLAINT METRICS ---------------- */

const total = complaints.filter(
  (complaint) => complaint.studentId === user?.id
).length;

const inProgress = complaints.filter(
  (complaint) =>
    complaint.studentId === user?.id &&
    (complaint.status === 'IN_PROGRESS' ||
      complaint.status === 'ASSIGNED')
).length;

const resolved = complaints.filter(
  (complaint) =>
    complaint.studentId === user?.id &&
    complaint.status === 'RESOLVED'
).length;

  // =====================================================
  // SCREEN
  // =====================================================

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor:
            theme.colors.background,
        },
      ]}
    >
      <ScreenHeader
        title="My Profile"
        subtitle="Student Account & Settings"
      />

      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ================================================= */}
        {/* PROFILE CARD */}
        {/* ================================================= */}

        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View
              style={[
                styles.avatarWrapper,
                {
                  borderColor:
                    theme.colors.accent,
                  backgroundColor:
                    theme.colors.surfaceSubtle,
                },
              ]}
            >
              <GraduationCap
                size={28}
                color={
                  theme.colors.accent
                }
              />
            </View>

            <View
              style={styles.profileDetails}
            >
              <Text
                style={[
                  styles.userName,
                  {
                    color:
                      theme.colors
                        .textPrimary,
                  },
                ]}
              >
                {user?.name || 'User'}
              </Text>

              <Text
                style={[
                  styles.userRoleTag,
                  {
                    color:
                      theme.colors.accent,
                  },
                ]}
              >
                STUDENT RESIDENT
              </Text>

              <Text
                style={[
                  styles.userEmail,
                  {
                    color:
                      theme.colors
                        .textSecondary,
                  },
                ]}
              >
                {user?.email ||
                  'No email available'}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.divider,
              {
                backgroundColor:
                  theme.colors
                    .borderLight,
              },
            ]}
          />

          {/* ================================================= */}
          {/* HOSTEL */}
          {/* ================================================= */}

          <View style={styles.infoRow}>
            <Building
              size={15}
              color={
                theme.colors
                  .textSecondary
              }
            />

            <Text
              style={[
                styles.infoLabel,
                {
                  color:
                    theme.colors
                      .textSecondary,
                },
              ]}
            >
              Hostel:
            </Text>

            <Text
              style={[
                styles.infoValue,
                {
                  color:
                    theme.colors
                      .textPrimary,
                },
              ]}
            >
              {user?.hostel ||
                user?.hostelBlock ||
                'Not provided'}

              {(user?.room ||
                user?.roomNumber) &&
                `, Room ${
                  user?.room ||
                  user?.roomNumber
                }`}
            </Text>
          </View>

          {/* ================================================= */}
          {/* PHONE */}
          {/* ================================================= */}

          <View style={styles.infoRow}>
            <Phone
              size={15}
              color={
                theme.colors
                  .textSecondary
              }
            />

            <Text
              style={[
                styles.infoLabel,
                {
                  color:
                    theme.colors
                      .textSecondary,
                },
              ]}
            >
              Phone:
            </Text>

            <Text
              style={[
                styles.infoValue,
                {
                  color:
                    theme.colors
                      .textPrimary,
                },
              ]}
            >
              {user?.phone ||
                'Not provided'}
            </Text>
          </View>
        </Card>

        {/* ================================================= */}
        {/* COMPLAINT ACTIVITY */}
        {/* ================================================= */}

        <Text
          style={[
            styles.sectionLabel,
            {
              color:
                theme.colors
                  .textSecondary,
            },
          ]}
        >
          COMPLAINT ACTIVITY
        </Text>

        <View style={styles.statsRow}>
          <StatsCard
            label="TOTAL"
            value={total}
          />

          <View
            style={styles.statsGap}
          />

          <StatsCard
            label="ACTIVE"
            value={inProgress}
            color={
              theme.status
                .inProgress
            }
          />

          <View
            style={styles.statsGap}
          />

          <StatsCard
            label="RESOLVED"
            value={resolved}
            color={
              theme.status.resolved
            }
          />
        </View>

        {/* ================================================= */}
        {/* SIGN OUT */}
        {/* ================================================= */}

        <View
          style={styles.signOutSection}
        >
          <Button
            title="Sign Out"
            onPress={logout}
            variant="danger"
            fullWidth
            icon={
              <LogOut
                size={17}
                color="#FFFFFF"
              />
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal:
      Spacing.screenHorizontal,

    paddingTop: 16,
    paddingBottom: 40,
  },

  // PROFILE

  profileCard: {
    marginBottom: 28,
  },

  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarWrapper: {
    width: 86,
    height: 86,

    borderWidth:
      Geometry.borderWidthThin,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius:
      Geometry.radiusNone,

    marginRight: 20,
  },

  profileDetails: {
    flex: 1,
  },

  userName: {
    fontFamily:
      Typography.bodyBold,

    fontSize:
      Typography.sizes.h2,
  },

  userRoleTag: {
    fontFamily:
      Typography.monoBold,

    fontSize:
      Typography.sizes.micro,

    letterSpacing: 0.8,

    marginTop: 4,
  },

  userEmail: {
    fontFamily:
      Typography.body,

    fontSize:
      Typography.sizes.caption,

    marginTop: 3,
  },

  divider: {
    height: 1,
    marginVertical: 16,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },

  infoLabel: {
    fontFamily:
      Typography.mono,

    fontSize:
      Typography.sizes.micro,

    marginLeft: 7,
    marginRight: 7,
  },

  infoValue: {
    flex: 1,

    fontFamily:
      Typography.bodyMedium,

    fontSize:
      Typography.sizes.caption,
  },

  // COMPLAINT ACTIVITY

  sectionLabel: {
    fontFamily:
      Typography.monoBold,

    fontSize:
      Typography.sizes.micro,

    letterSpacing: 0.8,

    marginBottom: 10,
  },

  statsRow: {
    flexDirection: 'row',
  },

  statsGap: {
    width: 8,
  },

  // SIGN OUT

  signOutSection: {
    marginTop: 32,
  },
});