/**
 * Child Task Submission Kinetic Component
 * Evidence submission with red laser scanning effect
 * Camera preview, evidence upload, AI validation feedback
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { CameraView } from 'expo-camera';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  MOBILE_COLORS,
  MOBILE_TYPOGRAPHY,
  SAFE_AREA,
  HAPTIC_PATTERNS,
} from '../theme/kinetic-mobile-theme.js';
import {
  KineticButton,
  LaserScanline,
} from './shared-mobile-components.js';

const { width, height } = Dimensions.get('window');

/**
 * ChildTaskSubmissionKinetic
 * @param {Object} task - Task to submit evidence for
 * @param {Function} onSubmit - Callback when evidence submitted
 * @param {Function} onCancel - Callback to cancel
 * @param {Function} navigation - Navigation prop
 */
export function ChildTaskSubmissionKinetic({
  task = { id: '', title: 'Complete Task', description: 'Complete this task' },
  onSubmit = () => {},
  onCancel = () => {},
  navigation,
}) {
  const [mode, setMode] = useState('camera'); // 'camera' | 'preview' | 'validation'
  const [evidence, setEvidence] = useState(null);
  const [validationStatus, setValidationStatus] = useState('scanning'); // 'scanning' | 'approved' | 'rejected'
  const [validationMessage, setValidationMessage] = useState('Analyzing evidence...');
  const cameraRef = useRef(null);

  const scanlineOffset = useSharedValue(0);

  // Simulate AI validation
  const simulateValidation = (imageUri) => {
    setValidationStatus('scanning');
    setValidationMessage('Analyzing evidence with AI...');

    setTimeout(() => {
      // Random success/failure for demo
      const isValid = Math.random() > 0.2;

      if (isValid) {
        setValidationStatus('approved');
        setValidationMessage('✓ Looks great! Ready to submit');
        HAPTIC_PATTERNS.success();
      } else {
        setValidationStatus('rejected');
        setValidationMessage('⚠ Try a clearer photo or video');
        HAPTIC_PATTERNS.error();
      }
    }, 2000);
  };

  const handleCameraCapture = async () => {
    if (cameraRef.current) {
      try {
        HAPTIC_PATTERNS.buttonPress();
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });

        setEvidence(photo.uri);
        setMode('preview');
        simulateValidation(photo.uri);
      } catch (error) {
        Alert.alert('Error', 'Failed to take photo');
      }
    }
  };

  const handleGallerySelect = () => {
    HAPTIC_PATTERNS.lightTap();
    // In real app, would use expo-image-picker
    Alert.alert('Gallery', 'Select photo from device');
  };

  const handleSubmit = () => {
    if (validationStatus === 'approved') {
      HAPTIC_PATTERNS.success();
      onSubmit?.(task.id, evidence);
      navigation?.goBack();
    } else {
      HAPTIC_PATTERNS.error();
      Alert.alert('Cannot Submit', 'Please provide valid evidence');
    }
  };

  // ────────────────────────────────────────────────────────
  // RENDER: CAMERA MODE
  // ────────────────────────────────────────────────────────
  if (mode === 'camera' && !evidence) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Camera View */}
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          barcodeScannerSettings={{
            barcodeTypes: [],
          }}
        >
          {/* Red Laser Scanline */}
          <LaserScanline
            animating={true}
            height={3}
            width="100%"
          />

          {/* Scanning frame overlay */}
          <View style={styles.scanningFrame}>
            <View style={styles.corner} />
            <View style={styles.corner} />
            <View style={styles.corner} />
            <View style={styles.corner} />
          </View>

          {/* Scanning text */}
          <View style={styles.scanningTextWrapper}>
            <Text style={styles.scanningText}>📹 Scanning...</Text>
            <Text style={styles.scanningSubtext}>Position task in frame</Text>
          </View>
        </CameraView>

        {/* Camera Controls */}
        <View style={styles.controlsBottom}>
          <TouchableOpacity
            onPress={onCancel}
            style={styles.cancelButton}
          >
            <Text style={styles.controlText}>✕ Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCameraCapture}
            style={styles.captureButton}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleGallerySelect}
            style={styles.galleryButton}
          >
            <Text style={styles.controlText}>🖼️ Gallery</Text>
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{task.title}</Text>
          <Text style={styles.headerSubtitle}>{task.description}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ────────────────────────────────────────────────────────
  // RENDER: PREVIEW & VALIDATION MODE
  // ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.previewContainer}>
        {/* Preview Image */}
        {evidence && (
          <Image
            source={{ uri: evidence }}
            style={styles.previewImage}
          />
        )}

        {/* Validation Status Overlay */}
        <View style={styles.validationOverlay}>
          <View style={styles.validationCard}>
            {validationStatus === 'scanning' && (
              <>
                <Text style={styles.validationEmoji}>🔍</Text>
                <Text style={styles.validationStatus}>Analyzing...</Text>
              </>
            )}

            {validationStatus === 'approved' && (
              <>
                <Text style={styles.validationEmoji}>✓</Text>
                <Text style={styles.validationStatus} style={{ color: MOBILE_COLORS.neonGreen }}>
                  Perfect!
                </Text>
              </>
            )}

            {validationStatus === 'rejected' && (
              <>
                <Text style={styles.validationEmoji}>⚠</Text>
                <Text style={styles.validationStatus} style={{ color: MOBILE_COLORS.neonRed }}>
                  Try Again
                </Text>
              </>
            )}

            <Text style={styles.validationMessage}>{validationMessage}</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionBottom}>
        <KineticButton
          title="🔄 Retake"
          onPress={() => {
            HAPTIC_PATTERNS.lightTap();
            setEvidence(null);
            setMode('camera');
          }}
          variant="secondary"
          style={{ flex: 1 }}
        />

        <KineticButton
          title={validationStatus === 'approved' ? '✓ Submit' : '⏸ Reviewing'}
          onPress={validationStatus === 'approved' ? handleSubmit : undefined}
          variant={validationStatus === 'approved' ? 'primary' : 'danger'}
          disabled={validationStatus !== 'approved'}
          style={{ flex: 1, marginLeft: 12 }}
        />
      </View>

      {/* Task Info */}
      <View style={styles.taskInfo}>
        <Text style={styles.taskInfoTitle}>{task.title}</Text>
        <Text style={styles.taskInfoDesc}>{task.description}</Text>
        {task.RPValue && (
          <Text style={styles.taskInfoRP}>Earn +{task.RPValue} RP</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MOBILE_COLORS.primary,
  },

  camera: {
    flex: 1,
  },

  scanningFrame: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    width: '80%',
    height: '50%',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: MOBILE_COLORS.neonRed,
    justifyContent: 'space-between',
    alignItems: 'space-between',
  },

  corner: {
    width: 30,
    height: 30,
    borderWidth: 3,
    borderColor: MOBILE_COLORS.neonRed,
    borderRadius: 4,
  },

  scanningTextWrapper: {
    position: 'absolute',
    bottom: '20%',
    width: '100%',
    alignItems: 'center',
  },

  scanningText: {
    ...MOBILE_TYPOGRAPHY.h2,
    color: MOBILE_COLORS.white,
    textAlign: 'center',
  },

  scanningSubtext: {
    ...MOBILE_TYPOGRAPHY.bodySmall,
    color: MOBILE_COLORS.whiteAlpha6,
    marginTop: 8,
  },

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SAFE_AREA.horizontal,
    paddingVertical: SAFE_AREA.top,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },

  headerTitle: {
    ...MOBILE_TYPOGRAPHY.h2,
    color: MOBILE_COLORS.white,
  },

  headerSubtitle: {
    ...MOBILE_TYPOGRAPHY.caption,
    color: MOBILE_COLORS.whiteAlpha6,
    marginTop: 4,
  },

  controlsBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: SAFE_AREA.horizontal,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },

  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MOBILE_COLORS.neonBlue,
  },

  galleryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MOBILE_COLORS.neonBlue,
  },

  controlText: {
    ...MOBILE_TYPOGRAPHY.bodySmall,
    color: MOBILE_COLORS.neonBlue,
    fontWeight: '600',
  },

  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: MOBILE_COLORS.neonRed,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
  },

  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },

  // Preview Styles
  previewContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },

  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  validationOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 16,
  },

  validationCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },

  validationEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },

  validationStatus: {
    ...MOBILE_TYPOGRAPHY.h1,
    color: MOBILE_COLORS.neonBlue,
    marginBottom: 8,
  },

  validationMessage: {
    ...MOBILE_TYPOGRAPHY.bodySmall,
    color: MOBILE_COLORS.whiteAlpha6,
    textAlign: 'center',
    maxWidth: '80%',
  },

  actionBottom: {
    flexDirection: 'row',
    paddingHorizontal: SAFE_AREA.horizontal,
    paddingVertical: 16,
    paddingBottom: SAFE_AREA.bottom,
    backgroundColor: MOBILE_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: MOBILE_COLORS.whiteAlpha3,
  },

  taskInfo: {
    paddingHorizontal: SAFE_AREA.horizontal,
    paddingVertical: 12,
    backgroundColor: MOBILE_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: MOBILE_COLORS.whiteAlpha3,
  },

  taskInfoTitle: {
    ...MOBILE_TYPOGRAPHY.bodySmall,
    color: MOBILE_COLORS.white,
    fontWeight: '600',
  },

  taskInfoDesc: {
    ...MOBILE_TYPOGRAPHY.caption,
    color: MOBILE_COLORS.whiteAlpha6,
    marginTop: 4,
  },

  taskInfoRP: {
    ...MOBILE_TYPOGRAPHY.bodySmall,
    color: MOBILE_COLORS.neonBlue,
    fontWeight: '700',
    marginTop: 8,
  },
});

export default ChildTaskSubmissionKinetic;
