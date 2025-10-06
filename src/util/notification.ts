// src/utils/notification.ts
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/**
 * Global handler – tells iOS/Android how to present foreground notifications.
 * Includes the iOS-specific properties to satisfy types on latest SDKs.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    // iOS presentation options (fixes type errors on newer SDKs)
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Ask the user for permission (idempotent). Returns true if allowed. */
export async function registerForPushPermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;

  const req = await Notifications.requestPermissionsAsync();
  return req.status === "granted";
}

/** Android needs a channel for scheduled/local notifications. Safe to call multiple times. */
export async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "General",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [250, 250],
    lightColor: "#FFD166",
    sound: undefined, // set a filename in android/app/src/main/res/raw if you add custom sounds
  });
}

/**
 * Schedule a daily reminder at local `hour:minute`.
 * Example: scheduleDailyReminder(20, 0) // 8:00 PM
 */
export async function scheduleDailyReminder(hour: number, minute: number) {
  await ensureAndroidChannel();
  await registerForPushPermissions();

  const trigger: Notifications.DailyTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
    // NOTE: `repeats` is NOT part of DailyTriggerInput in the newer types.
  };

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Don’t forget to log your meals",
      body: "Open Prestige Fitness and track your day 💪",
      sound: Platform.OS === "ios" ? undefined : false, // boolean | string per platform/type
      priority: Notifications.AndroidNotificationPriority.DEFAULT,
    },
    trigger,
  });
}

/** Cancel ALL scheduled notifications (handy for toggles). */
export async function cancelDailyReminder() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(all.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

/** Tiny helper to sanity-check notifications with a one-off ping in N seconds. */
export async function scheduleTestPing(seconds = 5) {
  await ensureAndroidChannel();
  await registerForPushPermissions();

  const trigger: Notifications.TimeIntervalTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: Math.max(1, Math.floor(seconds)),
    repeats: false,
  };

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Test notification",
      body: `This is a test ping after ${seconds}s.`,
      sound: Platform.OS === "ios" ? undefined : false,
      priority: Notifications.AndroidNotificationPriority.DEFAULT,
    },
    trigger,
  });
}
