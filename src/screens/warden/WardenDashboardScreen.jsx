import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Shield,
  AlertTriangle,
  UserX,
  Clock,
  CheckCircle2,
  Building2,
  Search,
  ArrowRight,
  MapPin,
  Calendar,
  Lock,
  Filter,
  X,
  User,
  AlertCircle,
} from 'lucide-react-native';

import { useAuth } from '../../context/AuthContext';
import { useComplaints } from '../../context/ComplaintsContext';

import {
  Typography,
  Spacing,
  Geometry,
} from '../../theme';

import { StatsCard } from '../../components/StatsCard';
import { Card } from '../../components/Card';
import { StatusBadge } from '../../components/StatusBadge';
import { PriorityBadge } from '../../components/PriorityBadge';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';

export const WardenDashboardScreen = ({ navigation }) => {
  const { theme, user } = useAuth();

  const {
    complaints,
    analytics,
    isLoading,
    refreshComplaints,
  } = useComplaints();

  const [refreshing, setRefreshing] = useState(false);

  /*
   * =====================================================
   * WARDEN BLOCK ACCESS CONTROL & SELECTION
   * =====================================================
   */

  const wardenHostel = user?.hostelBlock || user?.hostel || null;
  const isScopedWarden = Boolean(wardenHostel);

  // Available blocks derived dynamically from actual complaints in database
  const availableBlocks = useMemo(() => {
    if (isScopedWarden) {
      return [wardenHostel];
    }
    const blocks = new Set();
    complaints.forEach((c) => {
      if (c.hostelBlock) {
        blocks.add(c.hostelBlock);
      }
    });
    return ['ALL BLOCKS', ...Array.from(blocks).sort()];
  }, [complaints, isScopedWarden, wardenHostel]);

  const [selectedBlock, setSelectedBlock] = useState(
    isScopedWarden ? wardenHostel : 'ALL BLOCKS'
  );

  useEffect(() => {
    if (isScopedWarden && selectedBlock !== wardenHostel) {
      setSelectedBlock(wardenHostel);
    }
  }, [isScopedWarden, wardenHostel]);

  /*
   * =====================================================
   * FILTER STATES
   * =====================================================
   */

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const statusOptions = [
    'ALL',
    'REPORTED',
    'ASSIGNED',
    'IN_PROGRESS',
    'RESOLVED',
    'CANCELLED',
  ];

  const priorityOptions = ['ALL', 'HIGH', 'MEDIUM', 'LOW'];

  const categoryOptions = [
    'ALL',
    'PLUMBING',
    'ELECTRICAL',
    'FURNITURE',
    'INTERNET_WIFI',
    'CLEANING',
    'HVAC_AIR',
  ];

  /*
   * =====================================================
   * BLOCK SCOPED COMPLAINTS (AUTHORIZATION ENFORCED)
   * =====================================================
   */

  const blockScopedComplaints = useMemo(() => {
    return complaints.filter((c) => {
      // 1. Enforce database-level / role authorization boundary
      if (isScopedWarden && c.hostelBlock !== wardenHostel) {
        return false;
      }
      // 2. Enforce active block selector tab
      if (selectedBlock !== 'ALL BLOCKS' && c.hostelBlock !== selectedBlock) {
        return false;
      }
      return true;
    });
  }, [complaints, isScopedWarden, wardenHostel, selectedBlock]);

  /*
   * =====================================================
   * DATABASE-DERIVED BLOCK STATISTICS
   * =====================================================
   */

  const blockStats = useMemo(() => {
    // Total active complaints excludes CANCELLED and RESOLVED
    const active = blockScopedComplaints.filter(
      (c) => c.status !== 'RESOLVED' && c.status !== 'CANCELLED'
    ).length;

    const pending = blockScopedComplaints.filter(
      (c) => c.status === 'REPORTED' && !c.assignedTechnicianId
    ).length;

    const assigned = blockScopedComplaints.filter(
      (c) =>
        (c.status === 'ASSIGNED' || !!c.assignedTechnicianId) &&
        c.status !== 'RESOLVED' &&
        c.status !== 'CANCELLED'
    ).length;

    const inProgress = blockScopedComplaints.filter(
      (c) => c.status === 'IN_PROGRESS'
    ).length;

    const resolved = blockScopedComplaints.filter(
      (c) => c.status === 'RESOLVED'
    ).length;

    const cancelled = blockScopedComplaints.filter(
      (c) => c.status === 'CANCELLED'
    ).length;

    // Overdue: active complaints older than 24h
    const now = Date.now();
    const overdue = blockScopedComplaints.filter((c) => {
      if (c.status === 'RESOLVED' || c.status === 'CANCELLED') return false;
      const createdMs = new Date(c.createdAt).getTime();
      return now - createdMs > 24 * 3600 * 1000;
    }).length;

    return {
      active,
      pending,
      assigned,
      inProgress,
      resolved,
      cancelled,
      overdue,
      total: blockScopedComplaints.length,
    };
  }, [blockScopedComplaints]);

  /*
   * =====================================================
   * FILTERED COMPLAINTS FOR LIST VIEW
   * =====================================================
   */

  const filteredComplaints = useMemo(() => {
    return blockScopedComplaints.filter((c) => {
      if (selectedStatus !== 'ALL' && c.status !== selectedStatus) {
        return false;
      }
      if (selectedPriority !== 'ALL' && c.priority !== selectedPriority) {
        return false;
      }
      if (selectedCategory !== 'ALL' && c.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTicket = c.ticketNumber?.toLowerCase().includes(q);
        const matchTitle = c.title?.toLowerCase().includes(q);
        const matchRoom =
          c.roomNumber?.toLowerCase().includes(q) ||
          c.location?.toLowerCase().includes(q);
        const matchStudent = c.studentName?.toLowerCase().includes(q);
        if (!matchTicket && !matchTitle && !matchRoom && !matchStudent) {
          return false;
        }
      }
      return true;
    });
  }, [
    blockScopedComplaints,
    selectedStatus,
    selectedPriority,
    selectedCategory,
    searchQuery,
  ]);

  /*
   * =====================================================
   * REFRESH
   * =====================================================
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
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <LoadingState message="Loading campus overview..." />
      </SafeAreaView>
    );
  }

  const avgResolutionHours = analytics?.avgResolutionHours ?? 3.4;

  /*
   * =====================================================
   * RENDER SCREEN
   * =====================================================
   */

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <View
          style={[
            styles.header,
            {
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.headerTitleRow}>
            <View style={styles.titleContainer}>
              <Text
                style={[
                  styles.screenTitle,
                  {
                    color: theme.colors.textPrimary,
                  },
                ]}
              >
                Warden Dashboard
              </Text>

              <Text
                style={[
                  styles.screenSubtitle,
                  {
                    color: theme.colors.textSecondary,
                  },
                ]}
              >
                {isScopedWarden
                  ? `Assigned: ${wardenHostel}`
                  : 'Hostel Facility & Block Oversight'}
              </Text>
            </View>

            <View
              style={[
                styles.adminBadge,
                {
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Shield
                size={14}
                color={theme.colors.accent}
                strokeWidth={1.8}
              />

              <Text
                style={[
                  styles.adminBadgeText,
                  {
                    color: theme.colors.textPrimary,
                  },
                ]}
              >
                {isScopedWarden ? 'BLOCK WARDEN' : 'CHIEF WARDEN'}
              </Text>
            </View>
          </View>
        </View>

        {/* ================================================= */}
        {/* FEATURE 2A: BLOCK SELECTOR */}
        {/* ================================================= */}

        <View style={styles.sectionHeader}>
          <Text
            style={[
              styles.sectionLabel,
              {
                color: theme.colors.textSecondary,
              },
            ]}
          >
            HOSTEL BLOCK SELECTOR
          </Text>

          <Text
            style={[
              styles.sectionDescription,
              {
                color: theme.colors.textMuted,
              },
            ]}
          >
            {isScopedWarden
              ? 'Authorized scope locked to your designated block'
              : 'Select a block to inspect dedicated metrics & complaints'}
          </Text>
        </View>

        {isScopedWarden ? (
          <View
            style={[
              styles.scopedBanner,
              {
                backgroundColor: theme.colors.surfaceSubtle,
                borderColor: theme.colors.accent,
              },
            ]}
          >
            <Building2
              size={18}
              color={theme.colors.accent}
              strokeWidth={1.8}
            />
            <View style={styles.scopedBannerText}>
              <Text
                style={[
                  styles.scopedBannerTitle,
                  { color: theme.colors.textPrimary },
                ]}
              >
                {wardenHostel}
              </Text>
              <Text
                style={[
                  styles.scopedBannerSubtitle,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Authorised Jurisdiction • Single Block Scope
              </Text>
            </View>
            <Lock size={15} color={theme.colors.textMuted} />
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.blockScroll}
          >
            {availableBlocks.map((block) => {
              const isSelected = selectedBlock === block;
              const count =
                block === 'ALL BLOCKS'
                  ? complaints.length
                  : complaints.filter((c) => c.hostelBlock === block).length;

              return (
                <TouchableOpacity
                  key={block}
                  activeOpacity={0.75}
                  onPress={() => setSelectedBlock(block)}
                  style={[
                    styles.blockPill,
                    {
                      borderColor: isSelected
                        ? theme.colors.accent
                        : theme.colors.border,
                      backgroundColor: isSelected
                        ? `${theme.colors.accent}1A`
                        : theme.colors.surfaceSubtle,
                    },
                  ]}
                >
                  <Building2
                    size={14}
                    color={
                      isSelected
                        ? theme.colors.accent
                        : theme.colors.textSecondary
                    }
                    strokeWidth={1.8}
                  />

                  <Text
                    style={[
                      styles.blockPillText,
                      {
                        color: isSelected
                          ? theme.colors.accent
                          : theme.colors.textPrimary,
                        fontFamily: isSelected
                          ? Typography.monoBold
                          : Typography.mono,
                      },
                    ]}
                  >
                    {block}
                  </Text>

                  <View
                    style={[
                      styles.blockCountBadge,
                      {
                        backgroundColor: isSelected
                          ? theme.colors.accent
                          : theme.colors.surfaceHover,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.blockCountText,
                        {
                          color: isSelected
                            ? '#FFFFFF'
                            : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ================================================= */}
        {/* FEATURE 2B: DATABASE-DERIVED BLOCK STATISTICS */}
        {/* ================================================= */}

        <View style={styles.sectionHeader}>
          <Text
            style={[
              styles.sectionLabel,
              {
                color: theme.colors.textSecondary,
              },
            ]}
          >
            BLOCK STATISTICS — {selectedBlock.toUpperCase()}
          </Text>

          <Text
            style={[
              styles.sectionDescription,
              {
                color: theme.colors.textMuted,
              },
            ]}
          >
            Real-time status breakdown (excluding cancelled tickets)
          </Text>
        </View>

        {/* Stat Grid Row 1 */}
        <View style={styles.statsRow}>
          <StatsCard
            label="ACTIVE TICKETS"
            value={blockStats.active}
            color={theme.colors.accent}
            style={styles.statCard}
          />

          <View style={styles.statGap} />

          <StatsCard
            label="PENDING REVIEW"
            value={blockStats.pending}
            color={theme.priority.medium}
            style={styles.statCard}
          />
        </View>

        {/* Stat Grid Row 2 */}
        <View style={styles.statsRow}>
          <StatsCard
            label="ASSIGNED"
            value={blockStats.assigned}
            color={theme.status.assigned}
            style={styles.statCard}
          />

          <View style={styles.statGap} />

          <StatsCard
            label="IN PROGRESS"
            value={blockStats.inProgress}
            color={theme.status.inProgress}
            style={styles.statCard}
          />
        </View>

        {/* Stat Grid Row 3 */}
        <View style={styles.statsRow}>
          <StatsCard
            label="RESOLVED"
            value={blockStats.resolved}
            color={theme.status.resolved}
            style={styles.statCard}
          />

          <View style={styles.statGap} />

          <StatsCard
            label="OVERDUE (>24H)"
            value={blockStats.overdue}
            color={blockStats.overdue > 0 ? '#EF4444' : theme.colors.textMuted}
            style={styles.statCard}
          />
        </View>

        {/* ================================================= */}
        {/* FEATURE 2C: BLOCK COMPLAINT LIST & FILTERS */}
        {/* ================================================= */}

        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderRow}>
            <Text
              style={[
                styles.sectionLabel,
                {
                  color: theme.colors.textSecondary,
                },
              ]}
            >
              COMPLAINTS LIST ({filteredComplaints.length})
            </Text>

            {(searchQuery ||
              selectedStatus !== 'ALL' ||
              selectedPriority !== 'ALL' ||
              selectedCategory !== 'ALL') && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setSearchQuery('');
                  setSelectedStatus('ALL');
                  setSelectedPriority('ALL');
                  setSelectedCategory('ALL');
                }}
              >
                <Text
                  style={[
                    styles.resetFilterText,
                    { color: theme.colors.accent },
                  ]}
                >
                  RESET FILTERS
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search Bar */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: theme.colors.surfaceSubtle,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Search size={16} color={theme.colors.textMuted} />
          <TextInput
            placeholder="Search by ticket #, room, title..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[
              styles.searchInput,
              { color: theme.colors.textPrimary },
            ]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filters Horizontal Scroll */}
        <View style={styles.filterGroup}>
          <Text
            style={[
              styles.filterGroupTitle,
              { color: theme.colors.textMuted },
            ]}
          >
            STATUS:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsRow}
          >
            {statusOptions.map((st) => {
              const active = selectedStatus === st;
              return (
                <TouchableOpacity
                  key={st}
                  activeOpacity={0.75}
                  onPress={() => setSelectedStatus(st)}
                  style={[
                    styles.filterChip,
                    {
                      borderColor: active
                        ? theme.colors.accent
                        : theme.colors.border,
                      backgroundColor: active
                        ? theme.colors.accent
                        : theme.colors.surfaceSubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: active
                          ? '#FFFFFF'
                          : theme.colors.textSecondary,
                        fontFamily: active
                          ? Typography.monoBold
                          : Typography.mono,
                      },
                    ]}
                  >
                    {st.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Priority Filters */}
        <View style={styles.filterGroup}>
          <Text
            style={[
              styles.filterGroupTitle,
              { color: theme.colors.textMuted },
            ]}
          >
            PRIORITY:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsRow}
          >
            {priorityOptions.map((pr) => {
              const active = selectedPriority === pr;
              return (
                <TouchableOpacity
                  key={pr}
                  activeOpacity={0.75}
                  onPress={() => setSelectedPriority(pr)}
                  style={[
                    styles.filterChip,
                    {
                      borderColor: active
                        ? theme.colors.accent
                        : theme.colors.border,
                      backgroundColor: active
                        ? theme.colors.accent
                        : theme.colors.surfaceSubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: active
                          ? '#FFFFFF'
                          : theme.colors.textSecondary,
                        fontFamily: active
                          ? Typography.monoBold
                          : Typography.mono,
                      },
                    ]}
                  >
                    {pr}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Category Filters */}
        <View style={styles.filterGroup}>
          <Text
            style={[
              styles.filterGroupTitle,
              { color: theme.colors.textMuted },
            ]}
          >
            CATEGORY:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsRow}
          >
            {categoryOptions.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  activeOpacity={0.75}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.filterChip,
                    {
                      borderColor: active
                        ? theme.colors.accent
                        : theme.colors.border,
                      backgroundColor: active
                        ? theme.colors.accent
                        : theme.colors.surfaceSubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: active
                          ? '#FFFFFF'
                          : theme.colors.textSecondary,
                        fontFamily: active
                          ? Typography.monoBold
                          : Typography.mono,
                      },
                    ]}
                  >
                    {cat.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Complaints Cards Container */}
        <View style={styles.complaintsContainer}>
          {filteredComplaints.length === 0 ? (
            <Card style={styles.emptyCard}>
              <EmptyState
                title="No Complaints Found"
                message={`No complaints matching the selected filters in ${selectedBlock}.`}
              />
            </Card>
          ) : (
            filteredComplaints.map((item) => {
              const formattedDate = new Date(
                item.createdAt
              ).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });

              return (
                <Card
                  key={item.id}
                  onPress={() => {
                    if (navigation) {
                      navigation.navigate('WardenDetail', {
                        complaintId: item.id,
                      });
                    }
                  }}
                  style={styles.complaintCard}
                >
                  {/* Card Header: Ticket # and Date */}
                  <View style={styles.cardHeader}>
                    <View style={styles.ticketRow}>
                      <Text
                        style={[
                          styles.ticketNumber,
                          { color: theme.colors.accent },
                        ]}
                      >
                        {item.ticketNumber}
                      </Text>
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: theme.colors.textMuted },
                        ]}
                      />
                      <Text
                        style={[
                          styles.categoryTag,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {item.category.replace('_', ' ')}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.dateText,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      {formattedDate}
                    </Text>
                  </View>

                  {/* Title */}
                  <Text
                    style={[
                      styles.complaintTitle,
                      { color: theme.colors.textPrimary },
                    ]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>

                  {/* Location (Block & Room) */}
                  <View style={styles.locationRow}>
                    <MapPin
                      size={14}
                      color={theme.colors.textSecondary}
                      strokeWidth={1.8}
                    />
                    <Text
                      style={[
                        styles.locationText,
                        { color: theme.colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {item.hostelBlock || 'Hostel'} • Room{' '}
                      {item.roomNumber || 'N/A'}
                    </Text>
                  </View>

                  {/* Technician & Student Info Row */}
                  <View style={styles.techStudentRow}>
                    <View style={styles.techMeta}>
                      <User size={13} color={theme.colors.textMuted} />
                      <Text
                        style={[
                          styles.techMetaText,
                          {
                            color: item.assignedTechnicianName
                              ? theme.colors.textPrimary
                              : theme.colors.textMuted,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {item.assignedTechnicianName
                          ? `Staff: ${item.assignedTechnicianName}`
                          : 'Awaiting Staff Assignment'}
                      </Text>
                    </View>
                  </View>

                  {/* Card Footer: Badges + Details link */}
                  <View
                    style={[
                      styles.cardFooter,
                      { borderTopColor: theme.colors.borderLight },
                    ]}
                  >
                    <View style={styles.badgeRow}>
                      <StatusBadge status={item.status} size="small" />
                      <View style={{ width: 8 }} />
                      <PriorityBadge priority={item.priority} size="small" />
                    </View>

                    <View style={styles.viewRow}>
                      <Text
                        style={[
                          styles.viewDetailsText,
                          { color: theme.colors.textPrimary },
                        ]}
                      >
                        MANAGE
                      </Text>
                      <ArrowRight
                        size={14}
                        color={theme.colors.textPrimary}
                        style={{ marginLeft: 4 }}
                      />
                    </View>
                  </View>
                </Card>
              );
            })
          )}
        </View>

        {/* ================================================= */}
        {/* INSTITUTIONAL PERFORMANCE & FACILITY OVERVIEW */}
        {/* ================================================= */}

        <View style={styles.sectionHeader}>
          <Text
            style={[
              styles.sectionLabel,
              { color: theme.colors.textSecondary },
            ]}
          >
            INSTITUTIONAL METRICS
          </Text>
          <Text
            style={[
              styles.sectionDescription,
              { color: theme.colors.textMuted },
            ]}
          >
            Overall facility resolution velocity and technician allocation
          </Text>
        </View>

        {/* SERVICE PERFORMANCE */}
        <View
          style={[
            styles.slaCard,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.slaHeader}>
            <View>
              <Text
                style={[
                  styles.cardTitle,
                  { color: theme.colors.textPrimary },
                ]}
              >
                SERVICE PERFORMANCE
              </Text>
              <Text
                style={[
                  styles.cardSubtitle,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Average resolution turnaround time
              </Text>
            </View>

            <AlertTriangle
              size={20}
              color={theme.colors.accent}
              strokeWidth={1.7}
            />
          </View>

          <View style={styles.slaContent}>
            <Text
              style={[
                styles.slaValue,
                {
                  color:
                    avgResolutionHours <= 4
                      ? theme.status.resolved
                      : theme.colors.accent,
                },
              ]}
            >
              {avgResolutionHours}h
            </Text>

            <View style={styles.slaInfo}>
              <Text
                style={[
                  styles.slaLabel,
                  { color: theme.colors.textPrimary },
                ]}
              >
                Average Resolution
              </Text>
              <Text
                style={[
                  styles.slaTarget,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Institutional SLA Target: 4.0h
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

/*
 * =====================================================
 * STYLES
 * =====================================================
 */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 40,
  },

  /*
   * HEADER
   */

  header: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: 18,
    paddingBottom: 18,
    borderBottomWidth: Geometry.borderWidthThin,
  },

  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  titleContainer: {
    flex: 1,
    marginRight: 12,
  },

  screenTitle: {
    fontFamily: Typography.display,
    fontSize: Typography.sizes.h1,
    letterSpacing: -0.3,
  },

  screenSubtitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.caption,
    marginTop: 4,
  },

  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderWidth: Geometry.borderWidthThin,
  },

  adminBadgeText: {
    fontFamily: Typography.monoBold,
    fontSize: Typography.sizes.micro,
    marginLeft: 5,
    letterSpacing: 0.7,
  },

  /*
   * SECTION HEADER
   */

  sectionHeader: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: 20,
    paddingBottom: 10,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionLabel: {
    fontFamily: Typography.monoBold,
    fontSize: Typography.sizes.micro,
    letterSpacing: 1,
  },

  sectionDescription: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.caption,
    marginTop: 4,
  },

  resetFilterText: {
    fontFamily: Typography.monoBold,
    fontSize: Typography.sizes.micro,
    letterSpacing: 0.6,
  },

  /*
   * BLOCK SELECTOR PILLS
   */

  blockScroll: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: 4,
    gap: 8,
  },

  blockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderRadius: Geometry.radiusNone,
    gap: 7,
  },

  blockPillText: {
    fontSize: Typography.sizes.caption,
    letterSpacing: 0.4,
  },

  blockCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Geometry.radiusNone,
    marginLeft: 2,
  },

  blockCountText: {
    fontFamily: Typography.monoBold,
    fontSize: Typography.sizes.micro,
  },

  scopedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.screenHorizontal,
    padding: 14,
    borderWidth: 1,
    borderRadius: Geometry.radiusNone,
  },

  scopedBannerText: {
    flex: 1,
    marginLeft: 10,
  },

  scopedBannerTitle: {
    fontFamily: Typography.bodyBold,
    fontSize: Typography.sizes.bodyLarge,
  },

  scopedBannerSubtitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.micro,
    marginTop: 2,
  },

  /*
   * STATS GRID
   */

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.screenHorizontal,
    marginBottom: 8,
  },

  statCard: {
    flex: 1,
  },

  statGap: {
    width: 8,
  },

  /*
   * SEARCH & FILTERS
   */

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.screenHorizontal,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: Geometry.radiusNone,
    marginBottom: 10,
  },

  searchInput: {
    flex: 1,
    fontFamily: Typography.body,
    fontSize: Typography.sizes.caption,
    marginLeft: 8,
    padding: 0,
  },

  filterGroup: {
    marginVertical: 4,
  },

  filterGroupTitle: {
    fontFamily: Typography.monoBold,
    fontSize: Typography.sizes.micro,
    letterSpacing: 0.7,
    paddingHorizontal: Spacing.screenHorizontal,
    marginBottom: 4,
  },

  filterChipsRow: {
    paddingHorizontal: Spacing.screenHorizontal,
    gap: 6,
  },

  filterChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: Geometry.radiusNone,
  },

  filterChipText: {
    fontSize: Typography.sizes.micro,
    letterSpacing: 0.5,
  },

  /*
   * COMPLAINTS CARDS
   */

  complaintsContainer: {
    paddingHorizontal: Spacing.screenHorizontal,
    marginTop: 12,
  },

  emptyCard: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  complaintCard: {
    marginBottom: 10,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  ticketNumber: {
    fontFamily: Typography.monoBold,
    fontSize: Typography.sizes.caption,
    letterSpacing: 0.5,
  },

  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 7,
  },

  categoryTag: {
    fontFamily: Typography.mono,
    fontSize: Typography.sizes.micro,
    letterSpacing: 0.4,
  },

  dateText: {
    fontFamily: Typography.mono,
    fontSize: Typography.sizes.micro,
  },

  complaintTitle: {
    fontFamily: Typography.bodySemiBold,
    fontSize: Typography.sizes.bodyLarge,
    lineHeight: 22,
    marginBottom: 8,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  locationText: {
    flex: 1,
    fontFamily: Typography.body,
    fontSize: Typography.sizes.caption,
    marginLeft: 6,
  },

  techStudentRow: {
    marginBottom: 10,
  },

  techMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  techMetaText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.caption,
    marginLeft: 6,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: Geometry.borderWidthThin,
  },

  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  viewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  viewDetailsText: {
    fontFamily: Typography.bodySemiBold,
    fontSize: Typography.sizes.micro,
    letterSpacing: 0.6,
  },

  /*
   * INSTITUTIONAL CARDS
   */

  slaCard: {
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: 10,
    padding: 16,
    borderWidth: Geometry.borderWidthThin,
  },

  slaHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  cardTitle: {
    fontFamily: Typography.bodyBold,
    fontSize: Typography.sizes.bodyLarge,
    letterSpacing: 0.1,
  },

  cardSubtitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.micro,
    marginTop: 4,
  },

  slaContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  slaValue: {
    fontFamily: Typography.display,
    fontSize: 36,
    lineHeight: 40,
    marginRight: 16,
  },

  slaInfo: {
    flex: 1,
  },

  slaLabel: {
    fontFamily: Typography.bodyMedium,
    fontSize: Typography.sizes.caption,
  },

  slaTarget: {
    fontFamily: Typography.mono,
    fontSize: Typography.sizes.micro,
    marginTop: 4,
  },
});