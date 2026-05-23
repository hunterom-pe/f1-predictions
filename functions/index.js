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

const { onCall, HttpsError } = require("firebase-functions/v2/https");

exports.createPostSecure = onCall(async (request) => {
  const { data, auth } = request;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication credentials invalid.");
  }

  const textToModerate = data.text || "";
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Analyze the following text for doxxing, phone numbers, email addresses, external social handles (like twitter/instagram @ handles or website links), commercial spam, and severe toxicity. Return a JSON object with keys "clean" (boolean) and "reason" (string). Here is the text: "${textToModerate}"`
            }]
          }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      const resData = await response.json();
      const resultText = resData.candidates[0].content.parts[0].text;
      const resultObj = JSON.parse(resultText);

      if (!resultObj.clean) {
        const ROASTS = [
          "You sure you want to post that, fam?",
          "This ain't it, chief. The server admin caught you lacking.",
          "Bestie, the validation check failed. Let’s try that again.",
          "Cooked by the system daemon. Post discarded.",
          "Who hurt you? Keep the bad vibes off the local node.",
          "Bro tried to sneak a social handle in. We don’t do that here.",
          "Unc, no phone numbers or real names allowed. Keep it anonymous.",
          "Gatekeeping is a feature, not a bug. Remove the external links.",
          "Not the @ link... Secure portal validation failed."
        ];
        const randomRoast = ROASTS[Math.floor(Math.random() * ROASTS.length)];
        throw new HttpsError("failed-precondition", randomRoast);
      }
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      console.error("Gemini API call failed:", e);
    }
  }

  // Backup simple checks in case API is configured but fails
  const hasPhone = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{7}\b|\b\d{10}\b/.test(textToModerate);
  const hasEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(textToModerate);
  const hasHandle = /@\w+/.test(textToModerate) || /\b(instagram|twitter|facebook|tiktok|snapchat)\.com\b/i.test(textToModerate);
  const hasUrl = /\b(https?:\/\/|www\.)\S+\b/i.test(textToModerate);

  if (hasPhone || hasEmail || hasHandle || hasUrl) {
    const ROASTS = [
      "You sure you want to post that, fam?",
      "This ain't it, chief. The server admin caught you lacking.",
      "Bestie, the validation check failed. Let’s try that again.",
      "Cooked by the system daemon. Post discarded.",
      "Who hurt you? Keep the bad vibes off the local node.",
      "Bro tried to sneak a social handle in. We don’t do that here.",
      "Unc, no phone numbers or real names allowed. Keep it anonymous.",
      "Gatekeeping is a feature, not a bug. Remove the external links.",
      "Not the @ link... Secure portal validation failed."
    ];
    const randomRoast = ROASTS[Math.floor(Math.random() * ROASTS.length)];
    throw new HttpsError("failed-precondition", randomRoast);
  }

  const newPost = {
    ...data,
    userId: auth.uid,
    status: "active",
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  };

  const newPostRef = await admin.firestore().collection("posts").add(newPost);
  return { id: newPostRef.id };
});
