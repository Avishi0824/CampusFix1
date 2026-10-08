import React, { useState } from 'react';

import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';

import {
  X,
  Check,
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';

import {
  Typography,
  Spacing,
  Geometry,
} from '../theme';

import { Button } from './Button';
import { PriorityBadge } from './PriorityBadge';

export const AssignmentModal = ({
  visible,
  complaint,
  staff,
  onClose,
  onAssign,
}) => {
  const { theme } = useAuth();

  const [selectedTechId, setSelectedTechId] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('HIGH');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (complaint) {
      setSelectedPriority(complaint.priority);

      /*
       * Keep the currently assigned technician selected.
       * If there is no current assignment, select the
       * best matching technician automatically.
       */
      if (complaint.assignedTechnicianId) {
        setSelectedTechId(complaint.assignedTechnicianId);
      } else {
        const matchingTechnician = staff.find(
          (tech) =>
            tech.specialization === complaint.category
        );

        setSelectedTechId(
          matchingTechnician?.id || staff[0]?.id || ''
        );
      }
    }
  }, [complaint, staff]);

  if (!complaint) return null;

  const handleConfirm = async () => {
    if (!selectedTechId) return;

    setSubmitting(true);

    try {
      await onAssign(
        selectedTechId,
        selectedPriority
      );

      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const priorities = ['HIGH', 'MEDIUM', 'LOW'];

  /*
   * ----------------------------------------------------
   * SORT TECHNICIANS
   * ----------------------------------------------------
   *
   * Exact specialization matches appear first.
   *
   * Example:
   * ELECTRICAL complaint
   * → Electrical technician first
   *
   * PLUMBING complaint
   * → Plumbing technician first
   */
  const sortedStaff = [...staff].sort((a, b) => {
    const aMatch =
      a.specialization === complaint.category ? 1 : 0;

    const bMatch =
      b.specialization === complaint.category ? 1 : 0;

    return bMatch - aMatch;
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor:
                    theme.colors.surface,
                  borderColor:
                    theme.colors.border,
                },
              ]}
            >
              {/* HEADER */}

              <View
                style={[
                  styles.header,
                  {
                    borderBottomColor:
                      theme.colors.border,
                  },
                ]}
              >
                <View>
                  <Text
                    style={[
                      styles.modalTitle,
                      {
                        color:
                          theme.colors.textPrimary,
                        fontFamily:
                          Typography.display,
                      },
                    ]}
                  >
                    Assign Technician
                  </Text>

                  <Text
                    style={[
                      styles.ticketSubtitle,
                      {
                        color:
                          theme.colors.textSecondary,
                        fontFamily:
                          Typography.mono,
                      },
                    ]}
                  >
                    TICKET: {complaint.ticketNumber}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  style={[
                    styles.closeButton,
                    {
                      borderColor:
                        theme.colors.border,
                    },
                  ]}
                >
                  <X
                    size={18}
                    color={
                      theme.colors.textPrimary
                    }
                  />
                </TouchableOpacity>
              </View>

              {/* BODY */}

              <ScrollView
                style={styles.body}
                showsVerticalScrollIndicator={false}
              >
                {/* PRIORITY */}

                <Text
                  style={[
                    styles.sectionLabel,
                    {
                      color:
                        theme.colors.textSecondary,
                      fontFamily:
                        Typography.monoBold,
                    },
                  ]}
                >
                  SET PRIORITY LEVEL
                </Text>

                <View style={styles.priorityRow}>
                  {priorities.map((p) => {
                    const isSelected =
                      selectedPriority === p;

                    return (
                      <TouchableOpacity
                        key={p}
                        activeOpacity={0.75}
                        onPress={() =>
                          setSelectedPriority(p)
                        }
                        style={[
                          styles.priorityOption,
                          {
                            borderColor:
                              isSelected
                                ? theme.colors.accent
                                : theme.colors.border,

                            backgroundColor:
                              isSelected
                                ? theme.isDark
                                  ? '#382D2A'
                                  : '#FDF0ED'
                                : 'transparent',
                          },
                        ]}
                      >
                        <PriorityBadge
                          priority={p}
                          size="small"
                        />

                        {isSelected && (
                          <Check
                            size={14}
                            color={
                              theme.colors.accent
                            }
                            style={{
                              marginLeft: 6,
                            }}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* TECHNICIANS */}

                <Text
                  style={[
                    styles.sectionLabel,
                    {
                      color:
                        theme.colors.textSecondary,
                      fontFamily:
                        Typography.monoBold,
                      marginTop: 16,
                    },
                  ]}
                >
                  SELECT AVAILABLE TECHNICIAN
                </Text>

                {sortedStaff.map((tech) => {
                  const isSelected =
                    selectedTechId === tech.id;

                  const isCategoryMatch =
                    tech.specialization ===
                    complaint.category;

                  return (
                    <TouchableOpacity
                      key={tech.id}
                      activeOpacity={0.75}
                      onPress={() =>
                        setSelectedTechId(tech.id)
                      }
                      style={[
                        styles.techCard,
                        {
                          borderColor:
                            isSelected
                              ? theme.colors.accent
                              : theme.colors.border,

                          backgroundColor:
                            isSelected
                              ? theme.isDark
                                ? '#353942'
                                : '#FAF7F0'
                              : theme.colors.cardBackground,
                        },
                      ]}
                    >
                      <View style={styles.techInfo}>
                        <View
                          style={styles.techNameRow}
                        >
                          <Text
                            style={[
                              styles.techName,
                              {
                                color:
                                  theme.colors
                                    .textPrimary,
                                fontFamily:
                                  Typography.bodyBold,
                              },
                            ]}
                          >
                            {tech.name}
                          </Text>

                          {isCategoryMatch && (
                            <View
                              style={[
                                styles.matchBadge,
                                {
                                  backgroundColor:
                                    theme.colors
                                      .accentSubtle,
                                  borderColor:
                                    theme.colors
                                      .accent,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.matchText,
                                  {
                                    color:
                                      theme.colors
                                        .accent,
                                  },
                                ]}
                              >
                                EXACT MATCH
                              </Text>
                            </View>
                          )}
                        </View>

                        <Text
                          style={[
                            styles.techSpec,
                            {
                              color:
                                theme.colors
                                  .textSecondary,
                              fontFamily:
                                Typography.body,
                            },
                          ]}
                        >
                          {tech.specializationLabel ||
                            tech.specialization}
                        </Text>

                        <View
                          style={
                            styles.techMetaRow
                          }
                        >
                          <Text
                            style={[
                              styles.techMeta,
                              {
                                color:
                                  theme.colors
                                    .textMuted,
                                fontFamily:
                                  Typography.mono,
                              },
                            ]}
                          >
                            ACTIVE:{' '}
                            {tech.activeTasksCount ||
                              0}{' '}
                            TASKS
                          </Text>

                          <Text
                            style={[
                              styles.techMeta,
                              {
                                color:
                                  theme.colors
                                    .textMuted,
                                fontFamily:
                                  Typography.mono,
                                marginLeft: 12,
                              },
                            ]}
                          >
                            ★{' '}
                            {Number(
                              tech.rating || 0
                            ).toFixed(1)}
                          </Text>
                        </View>
                      </View>

                      {/* RADIO */}

                      <View
                        style={[
                          styles.radioCircle,
                          {
                            borderColor:
                              isSelected
                                ? theme.colors.accent
                                : theme.colors.border,

                            backgroundColor:
                              isSelected
                                ? theme.colors.accent
                                : 'transparent',
                          },
                        ]}
                      >
                        {isSelected && (
                          <Check
                            size={12}
                            color="#FFFFFF"
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* FOOTER */}

              <View
                style={[
                  styles.footer,
                  {
                    borderTopColor:
                      theme.colors.border,
                  },
                ]}
              >
                <Button
                  title="Cancel"
                  onPress={onClose}
                  variant="outline"
                  style={styles.cancelBtn}
                />

                <Button
                  title="Confirm Assignment"
                  onPress={handleConfirm}
                  variant="primary"
                  loading={submitting}
                  style={styles.confirmBtn}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.gapLarge,
  },

  modalCard: {
    width: '100%',
    maxHeight: '85%',
    borderWidth: Geometry.borderWidthThin,
    borderRadius: Geometry.radiusNone,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.cardPadding,
    borderBottomWidth:
      Geometry.borderWidthThin,
  },

  modalTitle: {
    fontSize: Typography.sizes.h2,
  },

  ticketSubtitle: {
    fontSize: Typography.sizes.micro,
    marginTop: 2,
    letterSpacing: 0.5,
  },

  closeButton: {
    width: 32,
    height: 32,
    borderWidth:
      Geometry.borderWidthThin,
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: {
    padding: Spacing.cardPadding,
    maxHeight: 380,
  },

  sectionLabel: {
    fontSize: Typography.sizes.micro,
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },

  priorityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderWidth:
      Geometry.borderWidthThin,
    borderRadius: Geometry.radiusNone,
  },

  techCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth:
      Geometry.borderWidthThin,
    borderRadius: Geometry.radiusNone,
    marginBottom: 8,
  },

  techInfo: {
    flex: 1,
  },

  techNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  techName: {
    fontSize: Typography.sizes.body,
  },

  matchBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    marginLeft: 6,
  },

  matchText: {
    fontFamily: Typography.monoBold,
    fontSize: Typography.sizes.micro,
    letterSpacing: 0.4,
  },

  techSpec: {
    fontSize: Typography.sizes.caption,
    marginTop: 2,
  },

  techMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  techMeta: {
    fontSize: Typography.sizes.micro,
  },

  radioCircle: {
    width: 22,
    height: 22,
    borderWidth:
      Geometry.borderWidthThin,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  footer: {
    flexDirection: 'row',
    padding: Spacing.cardPadding,
    borderTopWidth:
      Geometry.borderWidthThin,
    gap: 12,
  },

  cancelBtn: {
    flex: 1,
  },

  confirmBtn: {
    flex: 1.5,
  },
});