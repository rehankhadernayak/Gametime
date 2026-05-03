import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../../components/Button';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const SCREEN_BG = '#F9F9F4';

type ChildStackParamList = {
  TaskProof: {
    taskId?: string;
    taskTitle?: string;
    taskPoints?: number;
  };
};

type TaskProofNavigation = NativeStackNavigationProp<ChildStackParamList, 'TaskProof'>;
type TaskProofRoute = RouteProp<ChildStackParamList, 'TaskProof'>;

function getPickerErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong while opening the camera or photo library.';
}

export default function TaskProofScreen() {
  const navigation = useNavigation<TaskProofNavigation>();
  const route = useRoute<TaskProofRoute>();
  const insets = useSafeAreaInsets();

  const [imageUri, setImageUri] = useState<string | null>(null);

  const taskTitle = route.params?.taskTitle;

  const pickFromCamera = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Camera access needed',
          'Allow Gametime to use your camera so you can take a photo of your completed chore.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.length) return;

      const uri = result.assets[0]?.uri;
      if (uri) setImageUri(uri);
    } catch (error) {
      Alert.alert('Could not open camera', getPickerErrorMessage(error));
    }
  }, []);

  const pickFromLibrary = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Photos access needed',
          'Allow Gametime to access your photo library so you can choose a picture as proof.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.length) return;

      const uri = result.assets[0]?.uri;
      if (uri) setImageUri(uri);
    } catch (error) {
      Alert.alert('Could not open library', getPickerErrorMessage(error));
    }
  }, []);

  const handleSubmit = () => {
    if (!imageUri) return;
    Alert.alert('Upload successful', 'Your proof was sent to your parent.');
  };

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing[3]) }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Submit Proof</Text>
        <View style={styles.headerSpacer} />
      </View>

      {taskTitle ? (
        <Text style={styles.taskHint} numberOfLines={2}>
          {taskTitle}
        </Text>
      ) : null}

      <View style={styles.actionsRow}>
        <Pressable
          onPress={pickFromCamera}
          style={({ pressed }) => [styles.pickBtn, pressed && styles.pickBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Take Photo"
        >
          <Text style={styles.pickBtnText}>Take Photo</Text>
        </Pressable>
        <Pressable
          onPress={pickFromLibrary}
          style={({ pressed }) => [styles.pickBtn, pressed && styles.pickBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Choose from Library"
        >
          <Text style={styles.pickBtnText}>Choose from Library</Text>
        </Pressable>
      </View>

      <View style={styles.previewWrap}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
        ) : (
          <Text style={styles.previewPlaceholder}>Choose a photo to preview it here</Text>
        )}
      </View>

      <View style={styles.footer}>
        <Button title="Submit to Parent" onPress={handleSubmit} disabled={!imageUri} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SCREEN_BG,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing[3],
    backgroundColor: SCREEN_BG,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  backBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 32,
    color: colors.text,
    lineHeight: 36,
    marginTop: -4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  headerSpacer: {
    width: 48,
  },
  taskHint: {
    marginTop: spacing[3],
    fontSize: 15,
    color: colors.textSub,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  pickBtn: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickBtnPressed: {
    opacity: 0.88,
  },
  pickBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  previewWrap: {
    flex: 1,
    marginTop: spacing[4],
    marginBottom: spacing[4],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewPlaceholder: {
    padding: spacing[4],
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  footer: {
    paddingBottom: spacing[2],
  },
});
