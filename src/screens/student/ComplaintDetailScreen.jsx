import React, { useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Phone,
  User,
  MapPin,
  Calendar,
  Send,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Edit3,
  Trash2,
  XCircle,
  Lock,
} from 'lucide-react-native';

import { useAuth } from '../../context/AuthContext';
import { useComplaints } from '../../context/ComplaintsContext';
import { Typography, Spacing, Geometry } from '../../theme';

import { ScreenHeader } from '../../components/ScreenHeader';
import { Card } from '../../components/Card';
import { StatusBadge } from '../../components/StatusBadge';
import { PriorityBadge } from '../../components/PriorityBadge';
import { TimelineView } from '../../components/TimelineView';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';

export const ComplaintDetailScreen = ({
  route,
  navigation,
}) => {
  const { theme, user } = useAuth();
  const { getComplaintById, addComment, cancelComplaint } = useComplaints();

  const complaintId = route?.params?.complaintId;

  const complaint = complaintId
    ? getComplaintById(complaintId)
    : undefined;

  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const isOwner = Boolean(user?.id && complaint?.studentId === user.id);
  const isReported = complaint?.status === 'REPORTED';
  const isAssigned = Boolean(
    complaint?.assignedTechnicianId ||
      complaint?.status === 'ASSIGNED' ||
      complaint?.status === 'IN_PROGRESS'
  );
  const isResolved = complaint?.status === 'RESOLVED';
  const isCancelled = complaint?.status === 'CANCELLED';
  const canEditOrCancel = isOwner && isReported && !complaint?.assignedTechnicianId;

  const handleEdit = () => {
    if (!canEditOrCancel) {
      Alert.alert(
        'Edit Unavailable',
        isAssigned
          ? 'This complaint has been assigned to a technician and work is in progress. Direct edits are locked to preserve operational records.'
          : isCancelled
          ? 'This complaint has been cancelled.'
          : isResolved
          ? 'This complaint is already resolved.'
          : 'You do not have permission to edit this complaint.'
      );
      return;
    }
    navigation.navigate('ReportIssue', { complaintToEdit: complaint });
  };

  const handleCancel = () => {
    if (!canEditOrCancel) {
      Alert.alert(
        'Cancellation Unavailable',
        isAssigned
          ? 'A technician has already been assigned to this ticket. Direct cancellation is no longer possible.'
          : 'This complaint cannot be cancelled.'
      );
      return;
    }

    Alert.alert(
      'Cancel Complaint',
      'Are you sure you want to cancel this complaint? It will be removed from your active complaints list and marked as cancelled.',
      [
        { text: 'Keep Complaint', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelComplaint(complaint.id);
              Alert.alert('Complaint Cancelled', 'Your complaint has been successfully cancelled.', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (err) {
              Alert.alert('Cancellation Error', err?.message || 'Failed to cancel complaint. Please try again.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  if (!complaint) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <ScreenHeader
          title="Complaint"
          onBack={() => navigation.goBack()}
        />

        <LoadingState
          message="Ticket not found or deleted."
        />
      </SafeAreaView>
    );
  }

  const handleCallTechnician = () => {
    if (complaint.assignedTechnicianPhone) {
      Linking.openURL(
        `tel:${complaint.assignedTechnicianPhone}`
      );
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;

    setSubmittingComment(true);

    try {
      await addComment(
        complaint.id,
        commentText
      );

      setCommentText('');
    } finally {
      setSubmittingComment(false);
    }
  };

  const formattedDate = new Date(
    complaint.createdAt
  ).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <ScreenHeader
        title={complaint.ticketNumber}
        subtitle={`${complaint.category.replace('_', ' ')} Issue`}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Status & Priority Bar */}

          <View style={styles.topStatusRow}>
            <StatusBadge
              status={complaint.status}
            />

            <PriorityBadge
              priority={complaint.priority}
            />
          </View>

          {/* Action Buttons for Eligible Student Complaints */}
          {canEditOrCancel && (
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleEdit}
                disabled={cancelling}
                style={[
                  styles.actionBtn,
                  {
                    borderColor: theme.colors.accent,
                    backgroundColor: theme.colors.surfaceSubtle,
                  },
                ]}
              >
                <Edit3
                  size={15}
                  color={theme.colors.accent}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    { color: theme.colors.accent },
                  ]}
                >
                  EDIT COMPLAINT
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleCancel}
                disabled={cancelling}
                style={[
                  styles.actionBtn,
                  {
                    borderColor: '#EF4444',
                    backgroundColor: '#EF444415',
                  },
                ]}
              >
                <Trash2
                  size={15}
                  color="#EF4444"
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    { color: '#EF4444' },
                  ]}
                >
                  {cancelling ? 'CANCELLING...' : 'CANCEL TICKET'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Notice Banner: Cancelled Ticket */}
          {isCancelled && (
            <View
              style={[
                styles.infoBanner,
                {
                  backgroundColor: '#94A3B818',
                  borderColor: '#94A3B840',
                },
              ]}
            >
              <XCircle
                size={16}
                color="#94A3B8"
                style={styles.infoBannerIcon}
              />
              <Text
                style={[
                  styles.infoBannerText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                This complaint was cancelled and is no longer active.
              </Text>
            </View>
          )}

          {/* Notice Banner: Assigned / In Progress */}
          {isAssigned && isOwner && (
            <View
              style={[
                styles.infoBanner,
                {
                  backgroundColor: `${theme.colors.accent}12`,
                  borderColor: `${theme.colors.accent}30`,
                },
              ]}
            >
              <Lock
                size={15}
                color={theme.colors.accent}
                style={styles.infoBannerIcon}
              />
              <Text
                style={[
                  styles.infoBannerText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Staff allocation or work has begun. Direct editing or cancellation is locked to maintain task accountability. Add an update note below if needed.
              </Text>
            </View>
          )}

          {/* Issue Title & Description Card */}

          <Card style={styles.sectionCard}>
            <Text
              style={[
                styles.cardTitle,
                {
                  color: theme.colors.textPrimary,
                },
              ]}
            >
              {complaint.title}
            </Text>

            <View style={styles.metaRow}>
              <MapPin
                size={13}
                color={theme.colors.textSecondary}
              />

              <Text
                style={[
                  styles.metaText,
                  {
                    color:
                      theme.colors.textSecondary,
                  },
                ]}
              >
                {complaint.location}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Calendar
                size={13}
                color={theme.colors.textSecondary}
              />

              <Text
                style={[
                  styles.metaText,
                  {
                    color: theme.colors.textMuted,
                  },
                ]}
              >
                Reported on {formattedDate}
              </Text>
            </View>

            <View
              style={[
                styles.divider,
                {
                  backgroundColor:
                    theme.colors.borderLight,
                },
              ]}
            />

            <Text
              style={[
                styles.fieldLabel,
                {
                  color:
                    theme.colors.textSecondary,
                },
              ]}
            >
              DESCRIPTION
            </Text>

            <Text
              style={[
                styles.descriptionText,
                {
                  color:
                    theme.colors.textPrimary,
                },
              ]}
            >
              {complaint.description}
            </Text>

            {complaint.images &&
              complaint.images.length > 0 && (
                <View
                  style={styles.photosSection}
                >
                  <Text
                    style={[
                      styles.fieldLabel,
                      {
                        color:
                          theme.colors.textSecondary,
                      },
                    ]}
                  >
                    ATTACHED PHOTOS
                  </Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={
                      false
                    }
                  >
                    {complaint.images.map(
                      (uri, idx) => (
                        <Image
                          key={idx}
                          source={{ uri }}
                          style={
                            styles.attachedImage
                          }
                        />
                      )
                    )}
                  </ScrollView>
                </View>
              )}
          </Card>

          {/* Assigned Technician Card */}

          <Card style={styles.sectionCard}>
            <Text
              style={[
                styles.fieldLabel,
                {
                  color:
                    theme.colors.textSecondary,
                },
              ]}
            >
              ASSIGNED TECHNICIAN
            </Text>

            {complaint.assignedTechnicianName ? (
              <View style={styles.techRow}>
                <View style={styles.techInfo}>
                  <Text
                    style={[
                      styles.techName,
                      {
                        color:
                          theme.colors.textPrimary,
                      },
                    ]}
                  >
                    {complaint.assignedTechnicianName}
                  </Text>

                  <Text
                    style={[
                      styles.techSpec,
                      {
                        color:
                          theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {complaint.assignedTechnicianSpecialization ||
                      'Maintenance Specialist'}
                  </Text>

                  <Text
                    style={[
                      styles.techPhone,
                      {
                        color:
                          theme.colors.textMuted,
                      },
                    ]}
                  >
                    {complaint.assignedTechnicianPhone ||
                      '+91 98111 22334'}
                  </Text>
                </View>

                {complaint.assignedTechnicianPhone && (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={
                      handleCallTechnician
                    }
                    style={[
                      styles.callButton,
                      {
                        borderColor:
                          theme.colors.accent,
                        backgroundColor:
                          theme.colors.surfaceSubtle,
                      },
                    ]}
                  >
                    <Phone
                      size={16}
                      color={
                        theme.colors.accent
                      }
                    />

                    <Text
                      style={[
                        styles.callText,
                        {
                          color:
                            theme.colors.accent,
                        },
                      ]}
                    >
                      CALL
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View
                style={styles.unassignedBox}
              >
                <AlertCircle
                  size={16}
                  color={theme.colors.textMuted}
                />

                <Text
                  style={[
                    styles.unassignedText,
                    {
                      color:
                        theme.colors.textSecondary,
                    },
                  ]}
                >
                  Warden triage in progress.
                  Staff will be allocated shortly.
                </Text>
              </View>
            )}
          </Card>

          {/* Resolution Card (if resolved) */}

          {complaint.status === 'RESOLVED' &&
            complaint.resolutionNotes && (
              <Card
                style={[
                  styles.sectionCard,
                  {
                    borderColor:
                      theme.status.resolved,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.fieldLabel,
                    {
                      color:
                        theme.status.resolved,
                    },
                  ]}
                >
                  WORK RESOLUTION REPORT
                </Text>

                <Text
                  style={[
                    styles.descriptionText,
                    {
                      color:
                        theme.colors.textPrimary,
                    },
                  ]}
                >
                  {complaint.resolutionNotes}
                </Text>
              </Card>
            )}

          {/* Timeline Milestones */}

          <Card style={styles.sectionCard}>
            <Text
              style={[
                styles.fieldLabel,
                {
                  color:
                    theme.colors.textSecondary,
                },
              ]}
            >
              STATUS TIMELINE & AUDIT LOG
            </Text>

            <TimelineView
              timeline={complaint.timeline}
              currentStatus={complaint.status}
            />
          </Card>

          {/* Activity / Comments Feed */}

          <Card style={styles.sectionCard}>
            <Text
              style={[
                styles.fieldLabel,
                {
                  color:
                    theme.colors.textSecondary,
                },
              ]}
            >
              UPDATES & NOTES ({complaint.comments.length})
            </Text>

            {complaint.comments.length === 0 ? (
              <Text
                style={[
                  styles.noCommentsText,
                  {
                    color:
                      theme.colors.textMuted,
                  },
                ]}
              >
                No messages added yet.
              </Text>
            ) : (
              <View style={styles.commentsList}>
                {complaint.comments.map(
                  (comm) => (
                    <View
                      key={comm.id}
                      style={[
                        styles.commentItem,
                        {
                          backgroundColor:
                            theme.colors.surfaceSubtle,
                          borderColor:
                            theme.colors.borderLight,
                        },
                      ]}
                    >
                      <View
                        style={
                          styles.commentHeader
                        }
                      >
                        <Text
                          style={[
                            styles.commentAuthor,
                            {
                              color:
                                theme.colors.textPrimary,
                            },
                          ]}
                        >
                          {comm.authorName} (
                          {comm.authorRole.toUpperCase()})
                        </Text>

                        <Text
                          style={[
                            styles.commentTime,
                            {
                              color:
                                theme.colors.textMuted,
                            },
                          ]}
                        >
                          {new Date(
                            comm.timestamp
                          ).toLocaleTimeString(
                            [],
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.commentMessage,
                          {
                            color:
                              theme.colors.textPrimary,
                          },
                        ]}
                      >
                        {comm.message}
                      </Text>
                    </View>
                  )
                )}
              </View>
            )}

            {/* Add Comment Input */}

            <View style={styles.addCommentRow}>
              <TextInput
                placeholder="Type an update or note..."
                placeholderTextColor={
                  theme.colors.textMuted
                }
                value={commentText}
                onChangeText={setCommentText}
                style={[
                  styles.commentInput,
                  {
                    color:
                      theme.colors.textPrimary,
                    borderColor:
                      theme.colors.border,
                    backgroundColor:
                      theme.colors.inputBackground,
                  },
                ]}
              />

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleSendComment}
                disabled={
                  submittingComment ||
                  !commentText.trim()
                }
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor:
                      theme.colors.accent,
                    opacity: commentText.trim()
                      ? 1
                      : 0.5,
                  },
                ]}
              >
                <Send
                  size={16}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  container: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal:
      Spacing.screenHorizontal,
    paddingTop: 16,
    paddingBottom: 40,
  },

  topStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },

  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: Geometry.radiusNone,
    gap: 6,
  },

  actionBtnText: {
    fontFamily: Typography.monoBold,
    fontSize: Typography.sizes.micro,
    letterSpacing: 0.6,
  },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderWidth: 1,
    borderRadius: Geometry.radiusNone,
    marginBottom: 12,
  },

  infoBannerIcon: {
    marginRight: 8,
    marginTop: 2,
  },

  infoBannerText: {
    flex: 1,
    fontFamily: Typography.body,
    fontSize: Typography.sizes.caption,
    lineHeight: 18,
  },

  sectionCard: {
    marginBottom: 12,
  },

  cardTitle: {
    fontFamily: Typography.display,
    fontSize: Typography.sizes.h2,
    lineHeight: 26,
    marginBottom: 8,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  metaText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.caption,
    marginLeft: 6,
  },

  divider: {
    height: 1,
    marginVertical: 12,
  },

  fieldLabel: {
    fontFamily: Typography.monoBold,
    fontSize: Typography.sizes.micro,
    letterSpacing: 0.8,
    marginBottom: 6,
  },

  descriptionText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.body,
    lineHeight: 22,
  },

  photosSection: {
    marginTop: 12,
  },

  attachedImage: {
    width: 100,
    height: 100,
    marginRight: 8,
    borderRadius: Geometry.radiusNone,
  },

  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  techInfo: {
    flex: 1,
  },

  techName: {
    fontFamily: Typography.bodyBold,
    fontSize: Typography.sizes.bodyLarge,
  },

  techSpec: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.caption,
    marginTop: 2,
  },

  techPhone: {
    fontFamily: Typography.mono,
    fontSize: Typography.sizes.micro,
    marginTop: 2,
  },

  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: Geometry.borderWidthThin,
    borderRadius: Geometry.radiusNone,
    marginLeft: 12,
  },

  callText: {
    fontFamily: Typography.monoBold,
    fontSize: Typography.sizes.micro,
    marginLeft: 6,
    letterSpacing: 0.5,
  },

  unassignedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },

  unassignedText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.caption,
    marginLeft: 8,
    flex: 1,
  },

  commentsList: {
    gap: 8,
    marginBottom: 12,
  },

  commentItem: {
    padding: 10,
    borderWidth: Geometry.borderWidthThin,
    borderRadius: Geometry.radiusNone,
  },

  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  commentAuthor: {
    fontFamily: Typography.monoBold,
    fontSize: Typography.sizes.micro,
    letterSpacing: 0.5,
  },

  commentTime: {
    fontFamily: Typography.mono,
    fontSize: Typography.sizes.micro,
  },

  commentMessage: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.body,
  },

  noCommentsText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.caption,
    marginVertical: 8,
  },

  addCommentRow: {
    flexDirection: 'row',
    marginTop: 8,
  },

  commentInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    borderWidth: Geometry.borderWidthThin,
    borderRadius: Geometry.radiusNone,
    fontFamily: Typography.body,
    fontSize: Typography.sizes.body,
  },

  sendBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderRadius: Geometry.radiusNone,
  },
});