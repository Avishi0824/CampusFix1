import React, { useState, useMemo } from 'react';

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  MapPin,
  ArrowRight,
  Play,
  CheckCheck,
} from 'lucide-react-native';

import { useAuth } from '../../context/AuthContext';
import { useComplaints } from '../../context/ComplaintsContext';

import {
  Typography,
  Spacing,
  Geometry,
} from '../../theme';

import { Card } from '../../components/Card';
import { StatsCard } from '../../components/StatsCard';
import { StatusBadge } from '../../components/StatusBadge';
import { PriorityBadge } from '../../components/PriorityBadge';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';

export const TaskQueueScreen = ({ navigation }) => {
  const { user, theme } = useAuth();

  const {
    complaints,
    updateStatus,
    isLoading,
    refreshComplaints,
  } = useComplaints();

  const [selectedTab, setSelectedTab] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);

  /*
   * ----------------------------------------------------
   * REFRESH
   * ----------------------------------------------------
   */

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      await refreshComplaints();
    } finally {
      setRefreshing(false);
    }
  };

  /*
   * ----------------------------------------------------
   * TECHNICIAN COMPLAINTS
   *
   * Only complaints assigned to the logged-in
   * technician are shown.
   * ----------------------------------------------------
   */

  const technicianComplaints = useMemo(() => {
    if (!user?.id) {
      return [];
    }

    return complaints.filter(
      (complaint) =>
        complaint.assignedTechnicianId === user.id
    );
  }, [complaints, user?.id]);

  /*
   * ----------------------------------------------------
   * FILTERED TASKS
   * ----------------------------------------------------
   */

  const techTasks = useMemo(() => {
    return technicianComplaints.filter((complaint) => {
      if (selectedTab === 'IN_PROGRESS') {
        return complaint.status === 'IN_PROGRESS';
      }

      if (selectedTab === 'HIGH') {
        return (
          complaint.priority === 'HIGH' &&
          complaint.status !== 'RESOLVED'
        );
      }

      if (selectedTab === 'RESOLVED') {
        return complaint.status === 'RESOLVED';
      }

      /*
       * ALL TASKS
       * Do not show completed tickets in the main queue.
       */
      return complaint.status !== 'RESOLVED';
    });
  }, [technicianComplaints, selectedTab]);

  /*
   * ----------------------------------------------------
   * DYNAMIC METRICS
   * ----------------------------------------------------
   */

  const assignedCount = technicianComplaints.filter(
    (complaint) =>
      complaint.status === 'ASSIGNED' ||
      complaint.status === 'REPORTED'
  ).length;

  const inProgressCount = technicianComplaints.filter(
    (complaint) =>
      complaint.status === 'IN_PROGRESS'
  ).length;

  const resolvedCount = technicianComplaints.filter(
    (complaint) =>
      complaint.status === 'RESOLVED'
  ).length;

  /*
   * ----------------------------------------------------
   * START WORK
   *
   * ASSIGNED / REPORTED → IN_PROGRESS
   * ----------------------------------------------------
   */

  const handleStartWork = async (complaintId) => {
    try {
      await updateStatus(
        complaintId,
        'IN_PROGRESS',
        'Technician arrived on-site and commenced repair.'
      );
    } catch (error) {
      console.error(
        'Failed to start work:',
        error
      );
    }
  };

  /*
   * ----------------------------------------------------
   * TASK CARD
   * ----------------------------------------------------
   */

  const renderTaskCard = ({ item }) => {
    const isHighPriority =
      item.priority === 'HIGH';

    const canStartWork =
      item.status === 'ASSIGNED' ||
      item.status === 'REPORTED';

    const canResolve =
      item.status === 'IN_PROGRESS';

    return (
      <Card
        onPress={() =>
          navigation.navigate('TaskDetail', {
            complaintId: item.id,
          })
        }
        highlighted={
          isHighPriority &&
          item.status !== 'RESOLVED'
        }
        highlightColor={theme.priority.high}
        style={styles.taskCard}
      >
        {/* Header */}

        <View style={styles.cardHeader}>
          <View style={styles.ticketRow}>
            <Text
              style={[
                styles.ticketNumber,
                {
                  color: theme.colors.accent,
                },
              ]}
            >
              {item.ticketNumber}
            </Text>

            <View style={styles.dotSeparator} />

            <Text
              style={[
                styles.categoryLabel,
                {
                  color:
                    theme.colors.textSecondary,
                },
              ]}
            >
              {String(item.category || '')
                .replace(/_/g, ' ')}
            </Text>
          </View>

          <StatusBadge
            status={item.status}
            size="small"
          />
        </View>

        {/* Title */}

        <Text
          style={[
            styles.taskTitle,
            {
              color:
                theme.colors.textPrimary,
            },
          ]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        {/* Location */}

        <View style={styles.metaBox}>
          <View style={styles.metaRow}>
            <MapPin
              size={13}
              color={
                theme.colors.textSecondary
              }
            />

            <Text
              style={[
                styles.metaText,
                {
                  color:
                    theme.colors.textSecondary,
                },
              ]}
              numberOfLines={1}
            >
              {item.location}
            </Text>
          </View>

          <Text
            style={[
              styles.studentText,
              {
                color:
                  theme.colors.textMuted,
              },
            ]}
          >
            RESIDENT:{' '}
            {String(
              item.studentName || 'UNKNOWN'
            ).toUpperCase()}
          </Text>
        </View>

        {/* Footer */}

        <View
          style={[
            styles.cardFooter,
            {
              borderTopColor:
                theme.colors.borderLight,
            },
          ]}
        >
          <PriorityBadge
            priority={item.priority}
            size="small"
          />

          <View style={styles.actionButtonsRow}>

            {/* START WORK */}

            {canStartWork && (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() =>
                  handleStartWork(item.id)
                }
                style={[
                  styles.quickActionBtn,
                  {
                    backgroundColor:
                      theme.colors.accent,
                    borderColor:
                      theme.colors.accent,
                  },
                ]}
              >
                <Play
                  size={11}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.quickActionText
                  }
                >
                  START WORK
                </Text>
              </TouchableOpacity>
            )}

            {/* RESOLVE */}

            {canResolve && (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() =>
                  navigation.navigate(
                    'TaskDetail',
                    {
                      complaintId: item.id,
                    }
                  )
                }
                style={[
                  styles.quickActionBtn,
                  {
                    backgroundColor:
                      theme.status.resolved,
                    borderColor:
                      theme.status.resolved,
                  },
                ]}
              >
                <CheckCheck
                  size={12}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.quickActionText
                  }
                >
                  RESOLVE
                </Text>
              </TouchableOpacity>
            )}

            {/* INSPECT */}

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() =>
                navigation.navigate(
                  'TaskDetail',
                  {
                    complaintId: item.id,
                  }
                )
              }
              style={[
                styles.detailsLink,
                {
                  borderColor:
                    theme.colors.border,
                  backgroundColor:
                    theme.colors.surfaceSubtle,
                },
              ]}
            >
              <Text
                style={[
                  styles.detailsLinkText,
                  {
                    color:
                      theme.colors.textPrimary,
                  },
                ]}
              >
                INSPECT
              </Text>

              <ArrowRight
                size={11}
                color={
                  theme.colors.textPrimary
                }
                style={{
                  marginLeft: 3,
                }}
              />
            </TouchableOpacity>

          </View>
        </View>
      </Card>
    );
  };

  /*
   * ----------------------------------------------------
   * UI
   * ----------------------------------------------------
   */

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor:
            theme.colors.background,
        },
      ]}
      edges={[
        'top',
        'left',
        'right',
      ]}
    >
      {/* Header */}

      <View
        style={[
          styles.headerContainer,
          {
            borderBottomColor:
              theme.colors.border,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.screenTitle,
                {
                  color:
                    theme.colors.textPrimary,
                },
              ]}
            >
              Task Queue
            </Text>

            <Text
              style={[
                styles.screenSubtitle,
                {
                  color:
                    theme.colors.textSecondary,
                },
              ]}
              numberOfLines={1}
            >
              {user?.name || 'Technician'}
              {' • '}
              {user?.specializationLabel ||
                user?.specialization ||
                'Maintenance'}
            </Text>
          </View>

          <View
            style={[
              styles.statusIndicator,
              {
                borderColor:
                  theme.colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.liveDot,
                {
                  backgroundColor:
                    theme.colors.accent,
                },
              ]}
            />

            <Text
              style={[
                styles.liveText,
                {
                  color:
                    theme.colors.textPrimary,
                },
              ]}
            >
              ON DUTY
            </Text>
          </View>
        </View>

        {/* Dynamic Stats */}

        <View style={styles.statsRow}>
          <StatsCard
            label="ASSIGNED"
            value={assignedCount}
            color={theme.status.assigned}
          />

          <View style={{ width: 8 }} />

          <StatsCard
            label="IN PROGRESS"
            value={inProgressCount}
            color={theme.status.inProgress}
          />

          <View style={{ width: 8 }} />

          <StatsCard
            label="RESOLVED"
            value={resolvedCount}
            color={theme.status.resolved}
          />
        </View>

        {/* Tabs */}

        <View style={styles.filterTabs}>
          {[
            'ALL',
            'IN_PROGRESS',
            'HIGH',
            'RESOLVED',
          ].map((tab) => {
            const isActive =
              selectedTab === tab;

            const labels = {
              ALL: 'ALL TASKS',
              IN_PROGRESS: 'IN PROGRESS',
              HIGH: 'HIGH PRIORITY',
              RESOLVED: 'RESOLVED',
            };

            return (
              <TouchableOpacity
                key={tab}
                activeOpacity={0.75}
                onPress={() =>
                  setSelectedTab(tab)
                }
                style={[
                  styles.tabButton,
                  {
                    borderBottomColor:
                      isActive
                        ? theme.colors.accent
                        : 'transparent',
                    borderBottomWidth:
                      isActive ? 2 : 0,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: isActive
                        ? theme.colors.accent
                        : theme.colors
                            .textSecondary,
                      fontFamily: isActive
                        ? Typography.monoBold
                        : Typography.mono,
                    },
                  ]}
                >
                  {labels[tab]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Task List */}

      {isLoading && !refreshing ? (
        <LoadingState
          message="Fetching work orders..."
        />
      ) : (
        <FlatList
          data={techTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTaskCard}
          contentContainerStyle={
            styles.listContent
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={
                theme.colors.accent
              }
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No Tasks in Queue"
              description={
                selectedTab === 'RESOLVED'
                  ? 'No resolved work orders found.'
                  : 'No work orders are currently assigned to you.'
              }
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  headerContainer: {
    paddingHorizontal:
      Spacing.screenHorizontal,
    paddingTop: 16,
    borderBottomWidth:
      Geometry.borderWidthThin,
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom: 16,
  },

  screenTitle: {
    fontFamily:
      Typography.display,
    fontSize:
      Typography.sizes.h1,
    letterSpacing: -0.3,
  },

  screenSubtitle: {
    fontFamily:
      Typography.body,
    fontSize:
      Typography.sizes.caption,
    marginTop: 2,
  },

  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth:
      Geometry.borderWidthThin,
    borderRadius:
      Geometry.radiusNone,
    marginLeft: 8,
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },

  liveText: {
    fontFamily:
      Typography.monoBold,
    fontSize:
      Typography.sizes.micro,
    letterSpacing: 0.6,
  },

  statsRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },

  filterTabs: {
    flexDirection: 'row',
    gap: 16,
  },

  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 2,
  },

  tabText: {
    fontSize:
      Typography.sizes.micro,
    letterSpacing: 0.8,
  },

  listContent: {
    paddingHorizontal:
      Spacing.screenHorizontal,
    paddingTop: 14,
    paddingBottom: 32,
  },

  taskCard: {
    marginBottom: 12,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom: 8,
  },

  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  ticketNumber: {
    fontFamily:
      Typography.monoBold,
    fontSize:
      Typography.sizes.caption,
    letterSpacing: 0.5,
  },

  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#9EA3AD',
    marginHorizontal: 6,
  },

  categoryLabel: {
    fontFamily:
      Typography.mono,
    fontSize:
      Typography.sizes.micro,
    letterSpacing: 0.5,
    flexShrink: 1,
  },

  taskTitle: {
    fontFamily:
      Typography.bodySemiBold,
    fontSize:
      Typography.sizes.bodyLarge,
    lineHeight: 22,
    marginBottom: 8,
  },

  metaBox: {
    marginBottom: 12,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  metaText: {
    fontFamily:
      Typography.body,
    fontSize:
      Typography.sizes.caption,
    marginLeft: 5,
    flex: 1,
  },

  studentText: {
    fontFamily:
      Typography.mono,
    fontSize:
      Typography.sizes.micro,
    letterSpacing: 0.4,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    paddingTop: 10,
    borderTopWidth:
      Geometry.borderWidthThin,
  },

  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },

  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth:
      Geometry.borderWidthThin,
    borderRadius:
      Geometry.radiusNone,
  },

  quickActionText: {
    fontFamily:
      Typography.monoBold,
    fontSize:
      Typography.sizes.micro,
    color: '#FFFFFF',
    marginLeft: 4,
    letterSpacing: 0.5,
  },

  detailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth:
      Geometry.borderWidthThin,
    borderRadius:
      Geometry.radiusNone,
  },

  detailsLinkText: {
    fontFamily:
      Typography.monoBold,
    fontSize:
      Typography.sizes.micro,
    letterSpacing: 0.5,
  },
});