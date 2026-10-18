import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, Text, View } from 'react-native';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { registerAttendance } from '@/docs/lib/attendance';
import { useAuth } from '@/docs/lib/auth';

export default function ScanScreen() {
  const { user, role } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastData, setLastData] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [permissionBusy, setPermissionBusy] = useState(false);

  const handleRequestPermission = useCallback(async () => {
    if (permissionBusy) return;

    setPermissionBusy(true);
    setMessage(null);

    try {
      const result = await requestPermission();

      if (!result.granted) {
        setMessage(
          result.canAskAgain
            ? 'Camera permission was not granted. Tap Grant Permission and choose Allow.'
            : 'Camera access is blocked for this app. Open Android Settings, allow Camera permission for QR-ATT, then return here.',
        );
      }
    } catch (error) {
      console.error('[CAMERA PERMISSION ERROR]', error);
      setMessage(
        error instanceof Error
          ? `Could not request camera permission: ${error.message}`
          : 'Could not request camera permission. Please check Android app permissions.',
      );
    } finally {
      setPermissionBusy(false);
    }
  }, [permissionBusy, requestPermission]);

  const handleCameraMountError = useCallback((error: { message: string }) => {
    console.error('[CAMERA MOUNT ERROR]', error);
    setMessage(`Camera could not start: ${error.message}`);
  }, []);

  const handleBarcodeScanned = useCallback(({ data }: { data: string }) => {
    if (scanned) return;

    setScanned(true);
    setLastData(data);
    setMessage('Recording attendance...');
    setSuccess(false);

    if (!user) {
      setMessage('Please log in before scanning.');
      return;
    }

    void registerAttendance(data, user.id)
      .then((result) => {
        setMessage(result.message);
        setSuccess(result.success);
      })
      .catch((error) => {
        console.error('[ATTENDANCE REGISTER ERROR]', error);
        setMessage(
          error instanceof Error
            ? error.message
            : 'Could not record attendance. Please try again.',
        );
        setSuccess(false);
      });
  }, [scanned, user]);

  const handleScanAgain = () => {
    setScanned(false);
    setLastData(null);
    setMessage(null);
    setSuccess(false);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicatorFallback />
        <Text style={styles.subtitle}>Checking camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Ionicons
          name="camera-outline"
          size={64}
          color={COLORS.primary}
          style={styles.icon}
        />
        <Text style={styles.title}>Camera Permission Needed</Text>
        <Text style={styles.subtitle}>
          Allow camera access so QR-ATT can scan attendance QR codes.
        </Text>

        {message ? <Text style={styles.errorText}>{message}</Text> : null}

        <AppButton
          theme="primary"
          title={permissionBusy ? 'Requesting Permission...' : 'Grant Permission'}
          icon="camera"
          onPress={() => void handleRequestPermission()}
        />

        {!permission.canAskAgain ? (
          <View style={styles.settingsButton}>
            <AppButton
              title="Open App Settings"
              icon="settings-outline"
              onPress={() => {
                if (Platform.OS === 'android') {
                  void Linking.openSettings();
                } else {
                  setMessage('Open your device settings and allow camera access for QR-ATT.');
                }
              }}
            />
          </View>
        ) : null}
      </View>
    );
  }

  if (role === null) {
    return (
      <View style={styles.container}>
        <Ionicons name="person-circle-outline" size={64} color={COLORS.primary} style={styles.icon} />
        <Text style={styles.title}>Checking your account...</Text>
        <Text style={styles.subtitle}>Please wait while we check your account role.</Text>
      </View>
    );
  }

  if (role !== 'student') {
    return (
      <View style={styles.container}>
        <Ionicons name="lock-closed-outline" size={64} color={COLORS.primary} style={styles.icon} />
        <Text style={styles.title}>Students Only</Text>
        <Text style={styles.subtitle}>Only student accounts can scan attendance QR codes.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan Attendance QR</Text>
      <Text style={styles.subtitle}>Scan the QR code provided by your teacher.</Text>

      {message && !scanned ? <Text style={styles.errorText}>{message}</Text> : null}

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          onMountError={handleCameraMountError}
        />
        <View style={styles.scanFrame} />
      </View>

      {scanned ? (
        <View style={styles.resultCard}>
          <Ionicons
            name={success ? 'checkmark-circle' : 'alert-circle'}
            size={48}
            color={success ? COLORS.primary : '#DC2626'}
            style={styles.resultIcon}
          />
          <Text style={[styles.resultMessage, success ? styles.successText : styles.errorText]}>
            {message}
          </Text>
          {lastData ? <Text style={styles.scanData}>Scanned data: {lastData}</Text> : null}
          <AppButton theme="primary" title="Scan Again" icon="refresh" onPress={handleScanAgain} />
        </View>
      ) : null}
    </View>
  );
}

function ActivityIndicatorFallback() {
  return (
    <Ionicons
      name="hourglass-outline"
      size={36}
      color={COLORS.primary}
      style={styles.icon}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: { marginBottom: 16 },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  cameraContainer: {
    width: '100%',
    height: 420,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
  },
  camera: { flex: 1 },
  scanFrame: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderWidth: 3,
    borderColor: COLORS.primary,
    borderRadius: 20,
    alignSelf: 'center',
    top: 100,
  },
  resultCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultIcon: { marginBottom: 10 },
  resultMessage: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  successText: { color: COLORS.primary },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  scanData: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  settingsButton: { marginTop: 12 },
});
