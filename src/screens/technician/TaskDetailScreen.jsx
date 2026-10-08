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
  MapPin,
  Send,
  Camera,
  Play,
  CheckCircle2,
  X,
} from 'lucide-react-native';

import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../context/AuthContext';
import { useComplaints } from '../../context/ComplaintsContext';

import {
  Typography,
  Spacing,
  Geometry,
} from '../../theme';

import { ScreenHeader } from '../../components/ScreenHeader';
import { Card } from '../../components/Card';
import { StatusBadge } from '../../components/StatusBadge';
import { PriorityBadge } from '../../components/PriorityBadge';
import { TimelineView } from '../../components/TimelineView';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';

export const TaskDetailScreen = ({
  route,
  navigation,
}) => {
  const { theme, user } = useAuth();

  const {
    getComplaintById,
    updateStatus,
    addComment,
  } = useComplaints();

  const complaintId =
    route?.params?.complaintId;

  const complaint = complaintId
    ? getComplaintById(complaintId)
    : undefined;

  const [resolutionNotes, setResolutionNotes] =
    useState('');

  const [resolutionImage, setResolutionImage] =
    useState(null);

  const [updating, setUpdating] =
    useState(false);

  const [commentText, setCommentText] =
    useState('');

  /*
   * ----------------------------------------------------
   * NOT FOUND
   * ----------------------------------------------------
   */

  if (!complaint) {
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
          title="Task Detail"
          onBack={() =>
            navigation.goBack()
          }
        />

        <LoadingState
          message="Work order not found."
        />
      </SafeAreaView>
    );
  }

  /*
   * ----------------------------------------------------
   * CALL RESIDENT
   * ----------------------------------------------------
   */

  const handleCallResident = () => {
    if (!complaint.studentContact) {
      Alert.alert(
        'Contact Unavailable',
        'No phone number is available for this resident.'
      );

      return;
    }

    Linking.openURL(
      `tel:${complaint.studentContact}`
    ).catch(() => {
      Alert.alert(
        'Unable to Call',
        'The phone application could not be opened.'
      );
    });
  };

  /*
   * ----------------------------------------------------
   * START WORK
   *
   * REPORTED / ASSIGNED → IN_PROGRESS
   * ----------------------------------------------------
   */

  const handleStartWork = async () => {
    if (updating) return;

    setUpdating(true);

    try {
      const updated =
        await updateStatus(
          complaint.id,
          'IN_PROGRESS',
          'Technician arrived on-site and commenced repair.'
        );

      if (!updated) {
        throw new Error(
          'Status update returned no complaint.'
        );
      }

      Alert.alert(
        'Status Updated',
        'Ticket is now IN PROGRESS.'
      );
    } catch (error) {
      console.error(
        'Failed to start work:',
        error
      );

      Alert.alert(
        'Update Failed',
        'Unable to update the ticket status. Please try again.'
      );
    } finally {
      setUpdating(false);
    }
  };

  /*
   * ----------------------------------------------------
   * RESOLVE WORK
   *
   * IN_PROGRESS → RESOLVED
   * ----------------------------------------------------
   */

  const handleResolveWork = async () => {
    if (updating) return;

    if (!resolutionNotes.trim()) {
      Alert.alert(
        'Resolution Notes Required',
        'Please enter a brief note explaining the fix.'
      );

      return;
    }

    setUpdating(true);

    try {
      const updated =
        await updateStatus(
          complaint.id,
          'RESOLVED',
          resolutionNotes.trim(),
          resolutionImage || undefined
        );

      if (!updated) {
        throw new Error(
          'Resolution update returned no complaint.'
        );
      }

      Alert.alert(
        'Work Order Completed',
        'The complaint has been marked RESOLVED.',
        [
          {
            text: 'OK',
            onPress: () =>
              navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error(
        'Failed to resolve work:',
        error
      );

      Alert.alert(
        'Update Failed',
        'Unable to complete the work order. Please try again.'
      );
    } finally {
      setUpdating(false);
    }
  };

  /*
   * ----------------------------------------------------
   * PICK VERIFICATION PHOTO
   * ----------------------------------------------------
   */

  const pickResolutionImage =
    async () => {
      try {
        const result =
          await ImagePicker.launchImageLibraryAsync(
            {
              mediaTypes: ['images'],
              allowsEditing: true,
              quality: 0.7,
            }
          );

        if (
          !result.canceled &&
          result.assets &&
          result.assets[0]?.uri
        ) {
          setResolutionImage(
            result.assets[0].uri
          );
        }
      } catch (error) {
        console.warn(
          'Image picker error:',
          error
        );

        Alert.alert(
          'Image Error',
          'Unable to select the image.'
        );
      }
    };

  /*
   * ----------------------------------------------------
   * REMOVE VERIFICATION PHOTO
   * ----------------------------------------------------
   */

  const removeResolutionImage =
    () => {
      setResolutionImage(null);
    };

  /*
   * ----------------------------------------------------
   * ADD COMMENT
   * ----------------------------------------------------
   */

  const handleSendComment =
    async () => {
      const message =
        commentText.trim();

      if (!message) return;

      try {
        await addComment(
          complaint.id,
          message
        );

        setCommentText('');
      } catch (error) {
        console.error(
          'Failed to add comment:',
          error
        );

        Alert.alert(
          'Comment Failed',
          'Unable to post the comment. Please try again.'
        );
      }
    };

  const comments =
    complaint.comments || [];

  const timeline =
    complaint.timeline || [];

  /*
   * ----------------------------------------------------
   * STATUS HELPERS
   * ----------------------------------------------------
   */

  const canStartWork =
    complaint.status === 'REPORTED' ||
    complaint.status === 'ASSIGNED';

  const isInProgress =
    complaint.status === 'IN_PROGRESS';

  const isResolved =
    complaint.status === 'RESOLVED';

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
    >
      <ScreenHeader
        title={complaint.ticketNumber}
        subtitle={`${String(
          complaint.category || ''
        ).replace(/_/g, ' ')} Work Order`}
        onBack={() =>
          navigation.goBack()
        }
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
          contentContainerStyle={
            styles.scrollContent
          }
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
        >
          {/* STATUS */}

          <View
            style={
              styles.topStatusRow
            }
          >
            <StatusBadge
              status={complaint.status}
            />

            <PriorityBadge
              priority={
                complaint.priority
              }
            />
          </View>

          {/* ISSUE */}

          <Card
            style={styles.sectionCard}
          >
            <Text
              style={[
                styles.cardTitle,
                {
                  color:
                    theme.colors.textPrimary,
                },
              ]}
            >
              {complaint.title}
            </Text>

            <View
              style={styles.metaRow}
            >
              <MapPin
                size={14}
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
              >
                {complaint.location}
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
              PROBLEM DESCRIPTION
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

            {/* Student attachments */}

            {complaint.images &&
              complaint.images.length >
                0 && (
                <View
                  style={
                    styles.photosSection
                  }
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
                    RESIDENT ATTACHMENTS
                  </Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={
                      false
                    }
                  >
                    {complaint.images.map(
                      (uri, index) => (
                        <Image
                          key={`${uri}-${index}`}
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

          {/* RESIDENT */}

          <Card
            style={styles.sectionCard}
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
              RESIDENT STUDENT INFORMATION
            </Text>

            <View
              style={styles.studentRow}
            >
              <View
                style={styles.studentInfo}
              >
                <Text
                  style={[
                    styles.studentName,
                    {
                      color:
                        theme.colors.textPrimary,
                    },
                  ]}
                >
                  {complaint.studentName ||
                    'Student'}
                </Text>

                <Text
                  style={[
                    styles.studentRoom,
                    {
                      color:
                        theme.colors.textSecondary,
                    },
                  ]}
                >
                  {complaint.location}
                </Text>

                <Text
                  style={[
                    styles.studentPhone,
                    {
                      color:
                        theme.colors.textMuted,
                    },
                  ]}
                >
                  {complaint.studentContact ||
                    'No phone number'}
                </Text>
              </View>

              {complaint.studentContact && (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={
                    handleCallResident
                  }
                  style={[
                    styles.callButton,
                    {
                      borderColor:
                        theme.colors.accent,
                      backgroundColor:
                        theme.colors
                          .surfaceSubtle,
                    },
                  ]}
                >
                  <Phone
                    size={15}
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
          </Card>

          {/* WORKFLOW */}

          <Card
            style={[
              styles.sectionCard,
              {
                borderColor:
                  isResolved
                    ? theme.status.resolved
                    : isInProgress
                    ? theme.status.inProgress
                    : theme.colors.accent,
              },
            ]}
          >
            <Text
              style={[
                styles.fieldLabel,
                {
                  color:
                    theme.colors.textPrimary,
                },
              ]}
            >
              WORK ORDER ACTIONS
            </Text>

            {/* REPORTED / ASSIGNED */}

            {canStartWork && (
              <View
                style={
                  styles.actionPanel
                }
              >
                <Text
                  style={[
                    styles.statusHeading,
                    {
                      color:
                        theme.colors.textPrimary,
                    },
                  ]}
                >
                  {complaint.status ===
                  'ASSIGNED'
                    ? 'READY TO START'
                    : 'TICKET RECEIVED'}
                </Text>

                <Text
                  style={[
                    styles.panelDesc,
                    {
                      color:
                        theme.colors.textSecondary,
                    },
                  ]}
                >
                  This work order is assigned
                  to you. Inspect the issue and
                  start the repair when you arrive
                  at the location.
                </Text>

                <Button
                  title="Commence On-Site Work"
                  onPress={
                    handleStartWork
                  }
                  variant="primary"
                  loading={updating}
                  fullWidth
                  icon={
                    <Play
                      size={16}
                      color="#FFFFFF"
                    />
                  }
                />
              </View>
            )}

            {/* IN PROGRESS */}

            {isInProgress && (
              <View
                style={
                  styles.actionPanel
                }
              >
                <View
                  style={
                    styles.progressBanner
                  }
                >
                  <View
                    style={[
                      styles.progressDot,
                      {
                        backgroundColor:
                          theme.status
                            .inProgress,
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.progressText,
                      {
                        color:
                          theme.status
                            .inProgress,
                      },
                    ]}
                  >
                    WORK IN PROGRESS
                  </Text>
                </View>

                <Text
                  style={[
                    styles.panelDesc,
                    {
                      color:
                        theme.colors.textSecondary,
                    },
                  ]}
                >
                  Complete the repair, add a
                  resolution note, and optionally
                  attach a verification photo.
                </Text>

                <Text
                  style={[
                    styles.inputLabel,
                    {
                      color:
                        theme.colors.textSecondary,
                    },
                  ]}
                >
                  RESOLUTION NOTE
                </Text>

                <TextInput
                  placeholder="e.g. Replaced leaking valve and tested pressure seal."
                  placeholderTextColor={
                    theme.colors.textMuted
                  }
                  value={
                    resolutionNotes
                  }
                  onChangeText={
                    setResolutionNotes
                  }
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={[
                    styles.resolutionInput,
                    {
                      borderColor:
                        theme.colors.border,
                      backgroundColor:
                        theme.colors
                          .inputBackground,
                      color:
                        theme.colors.textPrimary,
                    },
                  ]}
                />

                {/* PHOTO */}

                <Text
                  style={[
                    styles.inputLabel,
                    {
                      color:
                        theme.colors.textSecondary,
                    },
                  ]}
                >
                  VERIFICATION PHOTO
                </Text>

                {resolutionImage ? (
                  <View
                    style={
                      styles.resolvedPhotoContainer
                    }
                  >
                    <Image
                      source={{
                        uri: resolutionImage,
                      }}
                      style={
                        styles.resolutionImage
                      }
                    />

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={
                        removeResolutionImage
                      }
                      style={[
                        styles.removePhotoButton,
                        {
                          backgroundColor:
                            theme.colors.accent,
                        },
                      ]}
                    >
                      <X
                        size={16}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={
                      pickResolutionImage
                    }
                    style={[
                      styles.addPhotoButton,
                      {
                        borderColor:
                          theme.colors.border,
                        backgroundColor:
                          theme.colors
                            .surfaceSubtle,
                      },
                    ]}
                  >
                    <Camera
                      size={17}
                      color={
                        theme.colors.accent
                      }
                    />

                    <Text
                      style={[
                        styles.addPhotoText,
                        {
                          color:
                            theme.colors
                              .textPrimary,
                        },
                      ]}
                    >
                      Attach Verification Photo
                    </Text>
                  </TouchableOpacity>
                )}

                {/* RESOLVE */}

                <Button
                  title="Mark as Resolved & Complete"
                  onPress={
                    handleResolveWork
                  }
                  variant="primary"
                  loading={updating}
                  fullWidth
                  icon={
                    <CheckCircle2
                      size={17}
                      color="#FFFFFF"
                    />
                  }
                  style={{
                    backgroundColor:
                      theme.status.resolved,
                    borderColor:
                      theme.status.resolved,
                    marginTop: 14,
                  }}
                />
              </View>
            )}

            {/* RESOLVED */}

            {isResolved && (
              <View
                style={[
                  styles.resolvedBanner,
                  {
                    borderColor:
                      theme.status.resolved,
                    backgroundColor:
                      theme.colors
                        .surfaceSubtle,
                  },
                ]}
              >
                <CheckCircle2
                  size={26}
                  color={
                    theme.status.resolved
                  }
                />

                <View
                  style={
                    styles.resolvedContent
                  }
                >
                  <Text
                    style={[
                      styles.resolvedTitle,
                      {
                        color:
                          theme.status
                            .resolved,
                      },
                    ]}
                  >
                    WORK VERIFIED & COMPLETED
                  </Text>

                  <Text
                    style={[
                      styles.resolvedDesc,
                      {
                        color:
                          theme.colors
                            .textPrimary,
                      },
                    ]}
                  >
                    {complaint.resolutionNotes ||
                      'Repair completed successfully.'}
                  </Text>

                  {complaint.resolvedAt && (
                    <Text
                      style={[
                        styles.resolvedDate,
                        {
                          color:
                            theme.colors
                              .textMuted,
                        },
                      ]}
                    >
                      Resolved on{' '}
                      {new Date(
                        complaint.resolvedAt
                      ).toLocaleString()}
                    </Text>
                  )}
                </View>
              </View>
            )}

          </Card>

          {/* RESOLUTION PHOTO */}

          {isResolved &&
            complaint.resolutionImage && (
              <Card
                style={
                  styles.sectionCard
                }
              >
                <Text
                  style={[
                    styles.fieldLabel,
                    {
                      color:
                        theme.colors
                          .textSecondary,
                    },
                  ]}
                >
                  VERIFICATION PHOTO
                </Text>

                <Image
                  source={{
                    uri:
                      complaint.resolutionImage,
                  }}
                  style={
                    styles.finalResolutionImage
                  }
                />
              </Card>
            )}

          {/* TIMELINE */}

          <Card
            style={styles.sectionCard}
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
              LIFECYCLE AUDIT TRAIL
            </Text>

            <TimelineView
              timeline={timeline}
              currentStatus={
                complaint.status
              }
            />
          </Card>

          {/* COMMENTS */}

          <Card
            style={styles.sectionCard}
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
              WORK LOG & COMMENTS (
              {comments.length}
              )
            </Text>

            {comments.length === 0 ? (
              <Text
                style={[
                  styles.noComments,
                  {
                    color:
                      theme.colors.textMuted,
                  },
                ]}
              >
                No internal notes yet.
              </Text>
            ) : (
              <View
                style={
                  styles.commentsList
                }
              >
                {comments.map(
                  (comment) => (
                    <View
                      key={comment.id}
                      style={[
                        styles.commentItem,
                        {
                          backgroundColor:
                            theme.colors
                              .surfaceSubtle,
                          borderColor:
                            theme.colors
                              .borderLight,
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
                                theme.colors
                                  .textPrimary,
                            },
                          ]}
                        >
                          {comment.authorName ||
                            'Technician'}
                        </Text>

                        <Text
                          style={[
                            styles.commentTime,
                            {
                              color:
                                theme.colors
                                  .textMuted,
                            },
                          ]}
                        >
                          {comment.timestamp
                            ? new Date(
                                comment.timestamp
                              ).toLocaleTimeString(
                                [],
                                {
                                  hour:
                                    '2-digit',
                                  minute:
                                    '2-digit',
                                }
                              )
                            : ''}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.commentMessage,
                          {
                            color:
                              theme.colors
                                .textPrimary,
                          },
                        ]}
                      >
                        {comment.message ||
                          comment.comment ||
                          ''}
                      </Text>
                    </View>
                  )
                )}
              </View>
            )}

            <View
              style={
                styles.addCommentRow
              }
            >
              <TextInput
                placeholder="Post an internal technician note..."
                placeholderTextColor={
                  theme.colors.textMuted
                }
                value={commentText}
                onChangeText={
                  setCommentText
                }
                multiline
                style={[
                  styles.commentInput,
                  {
                    color:
                      theme.colors
                        .textPrimary,
                    borderColor:
                      theme.colors.border,
                    backgroundColor:
                      theme.colors
                        .inputBackground,
                  },
                ]}
              />

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={
                  handleSendComment
                }
                disabled={
                  !commentText.trim()
                }
                style={[
                  styles.sendButton,
                  {
                    backgroundColor:
                      theme.colors.accent,
                    opacity:
                      commentText.trim()
                        ? 1
                        : 0.45,
                  },
                ]}
              >
                <Send
                  size={17}
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
    justifyContent:
      'space-between',
    marginBottom: 12,
  },

  sectionCard: {
    marginBottom: 12,
  },

  cardTitle: {
    fontFamily:
      Typography.display,
    fontSize:
      Typography.sizes.h2,
    lineHeight: 26,
    marginBottom: 8,
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
    marginLeft: 6,
    flex: 1,
  },

  divider: {
    height: 1,
    marginVertical: 12,
  },

  fieldLabel: {
    fontFamily:
      Typography.monoBold,
    fontSize:
      Typography.sizes.micro,
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  descriptionText: {
    fontFamily:
      Typography.body,
    fontSize:
      Typography.sizes.body,
    lineHeight: 22,
  },

  photosSection: {
    marginTop: 14,
  },

  attachedImage: {
    width: 100,
    height: 100,
    marginRight: 8,
    borderRadius:
      Geometry.radiusNone,
  },

  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  studentInfo: {
    flex: 1,
    marginRight: 12,
  },

  studentName: {
    fontFamily:
      Typography.bodyBold,
    fontSize:
      Typography.sizes.bodyLarge,
  },

  studentRoom: {
    fontFamily:
      Typography.body,
    fontSize:
      Typography.sizes.caption,
    marginTop: 3,
  },

  studentPhone: {
    fontFamily:
      Typography.mono,
    fontSize:
      Typography.sizes.micro,
    marginTop: 4,
  },

  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth:
      Geometry.borderWidthThin,
  },

  callText: {
    fontFamily:
      Typography.monoBold,
    fontSize:
      Typography.sizes.micro,
    marginLeft: 6,
  },

  actionPanel: {
    marginTop: 4,
  },

  statusHeading: {
    fontFamily:
      Typography.bodyBold,
    fontSize:
      Typography.sizes.bodyLarge,
    marginBottom: 6,
  },

  panelDesc: {
    fontFamily:
      Typography.body,
    fontSize:
      Typography.sizes.caption,
    lineHeight: 20,
    marginBottom: 14,
  },

  progressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },

  progressText: {
    fontFamily:
      Typography.monoBold,
    fontSize:
      Typography.sizes.micro,
    letterSpacing: 0.8,
  },

  inputLabel: {
    fontFamily:
      Typography.monoBold,
    fontSize:
      Typography.sizes.micro,
    letterSpacing: 0.7,
    marginBottom: 7,
  },

  resolutionInput: {
    minHeight: 100,
    borderWidth:
      Geometry.borderWidthThin,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily:
      Typography.body,
    fontSize:
      Typography.sizes.body,
    marginBottom: 14,
  },

  addPhotoButton: {
    minHeight: 52,
    borderWidth:
      Geometry.borderWidthThin,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginBottom: 4,
  },

  addPhotoText: {
    fontFamily:
      Typography.bodyMedium,
    fontSize:
      Typography.sizes.caption,
    marginLeft: 8,
  },

  resolvedPhotoContainer: {
    position: 'relative',
    marginBottom: 4,
  },

  resolutionImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },

  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  resolvedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth:
      Geometry.borderWidthThin,
    padding: 14,
  },

  resolvedContent: {
    flex: 1,
    marginLeft: 10,
  },

  resolvedTitle: {
    fontFamily:
      Typography.monoBold,
    fontSize:
      Typography.sizes.caption,
    letterSpacing: 0.7,
    marginBottom: 7,
  },

  resolvedDesc: {
    fontFamily:
      Typography.body,
    fontSize:
      Typography.sizes.body,
    lineHeight: 21,
  },

  resolvedDate: {
    fontFamily:
      Typography.mono,
    fontSize:
      Typography.sizes.micro,
    marginTop: 7,
  },

  finalResolutionImage: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },

  noComments: {
    fontFamily:
      Typography.body,
    fontSize:
      Typography.sizes.caption,
    marginBottom: 12,
  },

  commentsList: {
    marginBottom: 12,
  },

  commentItem: {
    borderWidth:
      Geometry.borderWidthThin,
    padding: 12,
    marginBottom: 8,
  },

  commentHeader: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    marginBottom: 6,
  },

  commentAuthor: {
    fontFamily:
      Typography.bodyBold,
    fontSize:
      Typography.sizes.caption,
    flex: 1,
  },

  commentTime: {
    fontFamily:
      Typography.mono,
    fontSize:
      Typography.sizes.micro,
  },

  commentMessage: {
    fontFamily:
      Typography.body,
    fontSize:
      Typography.sizes.caption,
    lineHeight: 19,
  },

  addCommentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  commentInput: {
    flex: 1,
    minHeight: 48,
    maxHeight: 100,
    borderWidth:
      Geometry.borderWidthThin,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily:
      Typography.body,
    fontSize:
      Typography.sizes.caption,
  },

  sendButton: {
    width: 48,
    height: 48,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});