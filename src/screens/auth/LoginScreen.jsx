import React, { useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  GraduationCap,
  Wrench,
  Shield,
  ChevronRight,
  Settings,
} from 'lucide-react-native';

import { useAuth } from '../../context/AuthContext';
import { Typography } from '../../theme';

export const LoginScreen = () => {
  const { login, signup } = useAuth();

  const [mode, setMode] = useState('login');

  const [selectedRole, setSelectedRole] =
    useState(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [password, setPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [hostel, setHostel] =
    useState('');

  const [room, setRoom] =
    useState('');

  const [specialization, setSpecialization] =
    useState('');

  const [submitting, setSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState('');

  const roles = [
    {
      role: 'student',
      label: 'STUDENT',
      title: 'Hostel Resident',
      desc: 'Report and track maintenance issues in your hostel.',
      accent: '#6D9DC5',
      icon: (
        <GraduationCap
          size={27}
          color="#A7B0BC"
        />
      ),
    },
    {
      role: 'technician',
      label: 'TECHNICIAN',
      title: 'Maintenance Staff',
      desc: 'View assigned tasks and update work progress.',
      accent: '#5FA69A',
      icon: (
        <Wrench
          size={27}
          color="#A7B0BC"
        />
      ),
    },
    {
      role: 'warden',
      label: 'WARDEN / ADMIN',
      title: 'Campus Facility Head',
      desc: 'Oversee requests, staff and facility status.',
      accent: '#D2A85A',
      icon: (
        <Shield
          size={27}
          color="#A7B0BC"
        />
      ),
    },
  ];

  const selectedRoleData =
    roles.find(
      (item) =>
        item.role === selectedRole
    );

  const resetForm = () => {
    setSelectedRole(null);
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setHostel('');
    setRoom('');
    setSpecialization('');
    setErrorMessage('');
  };

  const switchMode = (newMode) => {
    if (submitting) {
      return;
    }

    setMode(newMode);
    resetForm();
  };

  const handleRoleSelect = (role) => {
    if (submitting) {
      return;
    }

    setSelectedRole(role);
    setErrorMessage('');
  };

  /*
   * LOGIN
   */
  const handleLogin = async () => {
    if (
      !selectedRole ||
      submitting
    ) {
      return;
    }

    if (
      !email.trim() ||
      !password
    ) {
      setErrorMessage(
        'Please enter your email and password.'
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const expectedRole =
        selectedRole.toUpperCase();

      await login(
        email,
        password,
        expectedRole
      );
    } catch (error) {
      console.log(
        'Login error:',
        error
      );

      const message =
        error?.message?.toLowerCase() ||
        '';

      if (
        message.includes(
          'invalid login credentials'
        )
      ) {
        setErrorMessage(
          'Invalid email or password.'
        );
      } else if (
        message.includes(
          'not linked to a campusfix profile'
        )
      ) {
        setErrorMessage(
          'This account is not linked to a CampusFix profile.'
        );
      } else if (
        message.includes(
          'registered as'
        )
      ) {
        setErrorMessage(
          error.message
        );
      } else {
        setErrorMessage(
          error?.message ||
            'Unable to login. Please try again.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * SIGN UP
   */
  const handleSignup = async () => {
    if (
      !selectedRole ||
      submitting
    ) {
      return;
    }

    if (!name.trim()) {
      setErrorMessage(
        'Please enter your full name.'
      );
      return;
    }

    if (!email.trim()) {
      setErrorMessage(
        'Please enter your email.'
      );
      return;
    }

    if (!phone.trim()) {
      setErrorMessage(
        'Please enter your phone number.'
      );
      return;
    }

    if (!password) {
      setErrorMessage(
        'Please create a password.'
      );
      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        'Password must contain at least 6 characters.'
      );
      return;
    }

    if (
      password !== confirmPassword
    ) {
      setErrorMessage(
        'Passwords do not match.'
      );
      return;
    }

    /*
     * Student-specific fields.
     */
    if (
      selectedRole === 'student' &&
      (!hostel.trim() ||
        !room.trim())
    ) {
      setErrorMessage(
        'Please enter your hostel and room number.'
      );
      return;
    }

    /*
     * Technician-specific field.
     */
    if (
      selectedRole === 'technician' &&
      !specialization.trim()
    ) {
      setErrorMessage(
        'Please enter your specialization.'
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      await signup({
        name,
        email,
        password,
        role:
          selectedRole.toUpperCase(),
        phone,
        hostel,
        room,
        specialization,
      });
    } catch (error) {
      console.log(
        'Signup error:',
        error
      );

      const message =
        error?.message?.toLowerCase() ||
        '';

      if (
        message.includes(
          'user already registered'
        ) ||
        message.includes(
          'already registered'
        )
      ) {
        setErrorMessage(
          'An account with this email already exists.'
        );
      } else if (
        message.includes(
          'profile creation failed'
        )
      ) {
        setErrorMessage(
          error.message
        );
      } else if (
        message.includes(
          'technician profile creation failed'
        )
      ) {
        setErrorMessage(
          error.message
        );
      } else {
        setErrorMessage(
          error?.message ||
            'Unable to create your account. Please try again.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getButtonText = () => {
    if (submitting) {
      return mode === 'login'
        ? 'Signing in...'
        : 'Creating account...';
    }

    if (!selectedRole) {
      return 'Select a role to continue';
    }

    return mode === 'login'
      ? 'Sign In'
      : 'Create Account';
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
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
          {/* HEADER */}

          <View style={styles.header}>
            <View style={styles.topRow}>
              <Text style={styles.eyebrow}>
                SMART CAMPUS INFRASTRUCTURE
              </Text>

              <TouchableOpacity
                activeOpacity={0.7}
                style={
                  styles.settingsButton
                }
              >
                <Settings
                  size={24}
                  color="#A7B0BC"
                  strokeWidth={1.8}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.logo}>
              <Text
                style={
                  styles.logoCampus
                }
              >
                Campus
              </Text>

              <Text
                style={
                  styles.logoFix
                }
              >
                Fix
              </Text>
            </Text>

            <Text style={styles.subtitle}>
              Institutional Maintenance &
              Facility Management Portal
            </Text>
          </View>

          {/* MODE TOGGLE */}

          <View
            style={styles.modeToggle}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={submitting}
              onPress={() =>
                switchMode('login')
              }
              style={[
                styles.modeButton,
                mode === 'login' &&
                  styles.modeButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  mode === 'login' &&
                    styles.modeButtonTextActive,
                ]}
              >
                SIGN IN
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={submitting}
              onPress={() =>
                switchMode('signup')
              }
              style={[
                styles.modeButton,
                mode === 'signup' &&
                  styles.modeButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  mode === 'signup' &&
                    styles.modeButtonTextActive,
                ]}
              >
                CREATE ACCOUNT
              </Text>
            </TouchableOpacity>
          </View>

          {/* ROLE SELECTION */}

          <View
            style={styles.roleSection}
          >
            <Text
              style={styles.sectionTitle}
            >
              {mode === 'login'
                ? 'CONTINUE AS'
                : 'REGISTER AS'}
            </Text>

            <View
              style={styles.roleList}
            >
              {roles.map((item) => {
                const isSelected =
                  selectedRole ===
                  item.role;

                return (
                  <TouchableOpacity
                    key={item.role}
                    activeOpacity={0.82}
                    disabled={submitting}
                    onPress={() =>
                      handleRoleSelect(
                        item.role
                      )
                    }
                    style={[
                      styles.roleCard,
                      isSelected && {
                        borderColor:
                          item.accent,
                        backgroundColor:
                          '#27313D',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        isSelected && {
                          borderColor:
                            item.accent,
                          backgroundColor:
                            `${item.accent}18`,
                        },
                      ]}
                    >
                      {React.cloneElement(
                        item.icon,
                        {
                          color:
                            isSelected
                              ? item.accent
                              : '#A7B0BC',
                        }
                      )}
                    </View>

                    <View
                      style={
                        styles.roleContent
                      }
                    >
                      <Text
                        style={[
                          styles.roleLabel,
                          isSelected && {
                            color:
                              item.accent,
                          },
                        ]}
                      >
                        {item.label}
                      </Text>

                      <Text
                        style={
                          styles.roleTitle
                        }
                      >
                        {item.title}
                      </Text>

                      <Text
                        style={
                          styles.roleDescription
                        }
                      >
                        {item.desc}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.arrowContainer
                      }
                    >
                      <ChevronRight
                        size={25}
                        color={
                          isSelected
                            ? item.accent
                            : '#A7B0BC'
                        }
                        strokeWidth={1.8}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* FORM */}

          {selectedRole && (
            <View
              style={styles.formSection}
            >
              <Text
                style={
                  styles.loginSectionTitle
                }
              >
                {mode === 'login'
                  ? `${selectedRoleData?.label} LOGIN`
                  : `${selectedRoleData?.label} REGISTRATION`}
              </Text>

              {/* NAME */}

              {mode === 'signup' && (
                <TextInput
                  value={name}
                  onChangeText={(value) => {
                    setName(value);
                    setErrorMessage('');
                  }}
                  placeholder="Full name"
                  placeholderTextColor="#687380"
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!submitting}
                  style={styles.input}
                />
              )}

              {/* EMAIL */}

              <TextInput
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setErrorMessage('');
                }}
                placeholder="Email address"
                placeholderTextColor="#687380"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!submitting}
                style={styles.input}
              />

              {/* PHONE */}

              {mode === 'signup' && (
                <TextInput
                  value={phone}
                  onChangeText={(value) => {
                    setPhone(value);
                    setErrorMessage('');
                  }}
                  placeholder="Phone number"
                  placeholderTextColor="#687380"
                  keyboardType="phone-pad"
                  maxLength={15}
                  editable={!submitting}
                  style={styles.input}
                />
              )}

              {/* PASSWORD */}

              <TextInput
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setErrorMessage('');
                }}
                placeholder="Password"
                placeholderTextColor="#687380"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!submitting}
                style={styles.input}
              />

              {/* CONFIRM PASSWORD */}

              {mode === 'signup' && (
                <TextInput
                  value={confirmPassword}
                  onChangeText={(value) => {
                    setConfirmPassword(
                      value
                    );
                    setErrorMessage('');
                  }}
                  placeholder="Confirm password"
                  placeholderTextColor="#687380"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!submitting}
                  style={styles.input}
                />
              )}

              {/* STUDENT FIELDS */}

              {mode === 'signup' &&
                selectedRole ===
                  'student' && (
                  <>
                    <TextInput
                      value={hostel}
                      onChangeText={(value) => {
                        setHostel(value);
                        setErrorMessage('');
                      }}
                      placeholder="Hostel block"
                      placeholderTextColor="#687380"
                      autoCapitalize="words"
                      autoCorrect={false}
                      editable={!submitting}
                      style={styles.input}
                    />

                    <TextInput
                      value={room}
                      onChangeText={(value) => {
                        setRoom(value);
                        setErrorMessage('');
                      }}
                      placeholder="Room number"
                      placeholderTextColor="#687380"
                      autoCapitalize="characters"
                      autoCorrect={false}
                      editable={!submitting}
                      style={styles.input}
                    />
                  </>
                )}

              {/* TECHNICIAN FIELD */}

              {mode === 'signup' &&
                selectedRole ===
                  'technician' && (
                  <TextInput
                    value={specialization}
                    onChangeText={(value) => {
                      setSpecialization(
                        value
                      );
                      setErrorMessage('');
                    }}
                    placeholder="Specialization"
                    placeholderTextColor="#687380"
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!submitting}
                    style={styles.input}
                  />
                )}

              {/* ERROR */}

              {errorMessage ? (
                <Text
                  style={
                    styles.errorText
                  }
                >
                  {errorMessage}
                </Text>
              ) : null}
            </View>
          )}

          {/* ACTION BUTTON */}

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={
              !selectedRole ||
              submitting
            }
            onPress={
              mode === 'login'
                ? handleLogin
                : handleSignup
            }
            style={[
              styles.continueButton,
              selectedRole && {
                backgroundColor:
                  '#E06A47',
              },
              !selectedRole &&
                styles.continueButtonDisabled,
            ]}
          >
            <Text
              style={[
                styles.continueText,
                selectedRole &&
                  styles.continueTextActive,
              ]}
            >
              {getButtonText()}
            </Text>

            {selectedRole && (
              <ChevronRight
                size={21}
                color="#F5F3EE"
                strokeWidth={2}
              />
            )}
          </TouchableOpacity>

          {/* FOOTER */}

          <Text
            style={styles.footerText}
          >
            CAMPUSFIX V1.0 • HOSTEL
            RESIDENCE PORTAL
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#151A21',
  },

  container: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 24,
  },

  /* HEADER */

  header: {
    marginBottom: 32,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  eyebrow: {
    fontFamily: Typography.bodyMedium,
    fontSize: 13,
    color: '#89929E',
    letterSpacing: 2.5,
    flex: 1,
  },

  settingsButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: '#35404D',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },

  logo: {
    marginTop: 48,
    fontFamily: Typography.bodyBold,
    fontSize: 52,
    lineHeight: 58,
    letterSpacing: -2,
  },

  logoCampus: {
    color: '#F5F3EE',
  },

  logoFix: {
    color: '#E06A47',
  },

  subtitle: {
    marginTop: 14,
    fontFamily: Typography.body,
    fontSize: 17,
    lineHeight: 25,
    color: '#A7B0BC',
    maxWidth: 650,
  },

  /* MODE TOGGLE */

  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#202731',
    borderWidth: 1.5,
    borderColor: '#35404D',
    borderRadius: 14,
    padding: 4,
    marginBottom: 32,
  },

  modeButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modeButtonActive: {
    backgroundColor: '#27313D',
  },

  modeButtonText: {
    fontFamily: Typography.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.2,
    color: '#687380',
  },

  modeButtonTextActive: {
    color: '#F5F3EE',
  },

  /* ROLE SECTION */

  roleSection: {
    marginBottom: 28,
  },

  sectionTitle: {
    fontFamily: Typography.bodyMedium,
    fontSize: 16,
    color: '#89929E',
    letterSpacing: 3,
    marginBottom: 20,
  },

  roleList: {
    gap: 16,
  },

  roleCard: {
    minHeight: 120,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202731',
    borderWidth: 1.5,
    borderColor: '#35404D',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },

  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#35404D',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },

  roleContent: {
    flex: 1,
    paddingRight: 8,
  },

  roleLabel: {
    fontFamily: Typography.bodyBold,
    fontSize: 12,
    letterSpacing: 1.8,
    color: '#89929E',
    marginBottom: 5,
  },

  roleTitle: {
    fontFamily: Typography.bodyMedium,
    fontSize: 17,
    color: '#F5F3EE',
    marginBottom: 5,
  },

  roleDescription: {
    fontFamily: Typography.body,
    fontSize: 13,
    lineHeight: 19,
    color: '#89929E',
  },

  arrowContainer: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* FORM */

  formSection: {
    marginBottom: 28,
  },

  loginSectionTitle: {
    fontFamily: Typography.bodyMedium,
    fontSize: 16,
    color: '#89929E',
    letterSpacing: 2.5,
    marginBottom: 18,
  },

  input: {
    height: 56,
    backgroundColor: '#202731',
    borderWidth: 1.5,
    borderColor: '#35404D',
    borderRadius: 14,
    paddingHorizontal: 18,
    color: '#F5F3EE',
    fontFamily: Typography.body,
    fontSize: 16,
    marginBottom: 14,
  },

  errorText: {
    color: '#E06A47',
    fontFamily: Typography.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },

  /* ACTION BUTTON */

  continueButton: {
    minHeight: 58,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },

  continueButtonDisabled: {
    backgroundColor: '#27313D',
  },

  continueText: {
    fontFamily: Typography.bodyBold,
    fontSize: 15,
    letterSpacing: 0.8,
    color: '#687380',
  },

  continueTextActive: {
    color: '#F5F3EE',
  },

  /* FOOTER */

  footerText: {
    marginTop: 28,
    textAlign: 'center',
    fontFamily: Typography.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#59636F',
  },
});