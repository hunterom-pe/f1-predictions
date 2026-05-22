const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
admin.initializeApp();

exports.banOffendingUser = onDocumentUpdated("users/{userId}", async (event) => {
  const newValue = event.data.after.data();
  const oldValue = event.data.before.data();

  // Trigger ban if flag count reaches or exceeds 3 and it was previously less than 3
  if (newValue.flag_count >= 3 && (!oldValue || oldValue.flag_count < 3)) {
    const userId = event.params.userId;
    console.log(`User ${userId} has been flagged ${newValue.flag_count} times. Executing ban...`);

    // 1. Disable the user account in Firebase Auth
    try {
      await admin.auth().updateUser(userId, { disabled: true });
      console.log(`Disabled account in Firebase Auth for user: ${userId}`);
    } catch (err) {
      console.error(`Error disabling auth account for user ${userId}:`, err);
    }

    // 2. Blacklist their Capacitor Device UUID if present
    const deviceUuid = newValue.uuid;
    if (deviceUuid) {
      try {
        await admin.firestore().collection("blacklisted_devices").doc(deviceUuid).set({
          banned: true,
          userId: userId,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Blacklisted device UUID: ${deviceUuid}`);
      } catch (err) {
        console.error(`Error blacklisting device UUID ${deviceUuid}:`, err);
      }
    }

    // 3. Mark the banned state on the user document itself
    try {
      await event.data.after.ref.update({ banned: true });
      console.log(`Updated Firestore document for ${userId} to banned: true`);
    } catch (err) {
      console.error(`Error updating document for ${userId}:`, err);
    }
  }
});
