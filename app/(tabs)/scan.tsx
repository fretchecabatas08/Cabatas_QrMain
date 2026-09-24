import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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

  if (!permission) {
    return <View style={styles.container} />;
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
          We need access to your camera to scan QR codes.
        </Text>

        <AppButton
          theme="primary"
          title="Grant Permission"
          icon="camera"
          onPress={requestPermission}
        />
      </View>
    );
  }

  if (role === null) {
    return (
      <View style={styles.container}>
        <Ionicons
          name="person-circle-outline"
          size={64}
          color={COLORS.primary}
          style={styles.icon}
        />

        <Text style={styles.title}>Checking your account...</Text>

        <Text style={styles.subtitle}>
          Please wait while we check your account role.
        </Text>
      </View>
    );
  }

  if (role !== 'student') {
    return (
      <View style={styles.container}>
        <Ionicons
          name="lock-closed-outline"
          size={64}
          color={COLORS.primary}
          style={styles.icon}
        />

        <Text style={styles.title}>Students Only</Text>

        <Text style={styles.subtitle}>
          Only student accounts can scan attendance QR codes.
        </Text>
      </View>
    );
  }

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    setLastData(data);
    setMessage(null);
    setSuccess(false);

    if (!user) {
      setMessage('Please log in before scanning.');
      setSuccess(false);
      return;
    }

    registerAttendance(data, user.id).then((result) => {
      setMessage(result.message);
      setSuccess(result.success);
    });
  };

  const handleScanAgain = () => {
    setScanned(false);
    setLastData(null);
    setMessage(null);
    setSuccess(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan Attendance QR</Text>

      <Text style={styles.subtitle}>
        Scan the QR code provided by your teacher.
      </Text>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={
            scanned ? undefined : handleBarcodeScanned
          }
        />

        <View style={styles.scanFrame} />
      </View>

      {scanned && (
        <View style={styles.resultCard}>
          {success ? (
            <Ionicons
              name="checkmark-circle"
              size={48}
              color={COLORS.primary}
              style={styles.resultIcon}
            />
          ) : (
           <Ionicons
  name="alert-circle"
  size={48}
  color="#DC2626"
  style={styles.resultIcon}
/>
          )}

          <Text
            style={[
              styles.resultMessage,
              success ? styles.successText : styles.errorText,
            ]}
          >
            {message}
          </Text>

          {lastData && (
            <Text style={styles.scanData}>
              Scanned data: {lastData}
            </Text>
          )}

          <AppButton
            theme="primary"
            title="Scan Again"
            icon="refresh"
            onPress={handleScanAgain}
          />
        </View>
      )}
    </View>
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

  icon: {
    marginBottom: 16,
  },

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

  camera: {
    flex: 1,
  },

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

  resultIcon: {
    marginBottom: 10,
  },

  resultMessage: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },

  successText: {
    color: COLORS.primary,
  },

  errorText: {
  color: '#DC2626',
},

  scanData: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
});