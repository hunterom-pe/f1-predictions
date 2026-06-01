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

  // Verify homeCity server-side so city restriction can't be bypassed via direct CF call
  const userSnap = await admin.firestore().collection("users").doc(auth.uid).get();
  if (!userSnap.exists) {
    throw new HttpsError("not-found", "User profile not found.");
  }
  const userData = userSnap.data();
  if (userData.homeCity && data.venueCity && data.venueCity !== userData.homeCity) {
    throw new HttpsError("failed-precondition", `Nice try, traveler. You can only post for your home node in ${userData.homeCity}.`);
  }

  // Explicit allowlist — never spread raw client data into Firestore
  const newPost = {
    text: data.text,
    venueId: typeof data.venueId === "string" ? data.venueId : "",
    venueName: typeof data.venueName === "string" ? data.venueName : "",
    venueAddress: typeof data.venueAddress === "string" ? data.venueAddress : "",
    venueCity: typeof data.venueCity === "string" ? data.venueCity : "",
    venueZone: typeof data.venueZone === "string" ? data.venueZone : "",
    date: typeof data.date === "string" ? data.date : "",
    timeRange: typeof data.timeRange === "string" ? data.timeRange : "",
    userId: auth.uid,
    status: "active",
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  };

  const newPostRef = await admin.firestore().collection("posts").add(newPost);
  return { id: newPostRef.id };
});

exports.submitReport = onCall(async (request) => {
  const { data, auth } = request;

  if (!auth || auth.token.firebase?.sign_in_provider === "anonymous") {
    throw new HttpsError("unauthenticated", "You must have a registered account to submit reports.");
  }

  const { targetUserId, postId, reason } = data;
  if (!targetUserId || typeof targetUserId !== "string") {
    throw new HttpsError("invalid-argument", "Invalid target user ID.");
  }
  if (targetUserId === auth.uid) {
    throw new HttpsError("invalid-argument", "You cannot report yourself.");
  }

  const db = admin.firestore();
  const reporterId = auth.uid;

  await db.runTransaction(async (tx) => {
    const reporterRef = db.collection("users").doc(reporterId);
    const targetRef = db.collection("users").doc(targetUserId);
    const [reporterSnap, targetSnap] = await Promise.all([tx.get(reporterRef), tx.get(targetRef)]);

    if (!reporterSnap.exists) throw new HttpsError("not-found", "Reporter account not found.");
    if (!targetSnap.exists) throw new HttpsError("not-found", "User not found.");

    const reporterData = reporterSnap.data();
    const targetData = targetSnap.data();

    // Account must be >= 48 hours old
    const ageMs = Date.now() - (reporterData.createdAt || 0);
    if (ageMs < 48 * 60 * 60 * 1000) {
      throw new HttpsError("failed-precondition", "Your account must be at least 48 hours old to submit reports.");
    }

    // Max 3 reports per calendar day
    const todayStr = new Date().toISOString().slice(0, 10);
    const dailyCount = reporterData.dailyReportDate === todayStr ? (reporterData.dailyReportCount || 0) : 0;
    if (dailyCount >= 3) {
      throw new HttpsError("resource-exhausted", "Daily report limit reached. Try again tomorrow.");
    }

    // One report per unique reporter
    const existingReporters = Array.isArray(targetData.reporterIds) ? targetData.reporterIds : [];
    if (existingReporters.includes(reporterId)) {
      throw new HttpsError("already-exists", "You have already reported this user.");
    }

    const updatedReporters = [...existingReporters, reporterId];
    const newFlagCount = updatedReporters.length;

    tx.update(targetRef, {
      reporterIds: updatedReporters,
      flag_count: newFlagCount,
      ...(newFlagCount >= 3 ? { banned: true } : {})
    });

    tx.update(reporterRef, {
      dailyReportCount: dailyCount + 1,
      dailyReportDate: todayStr
    });

    if (postId && typeof postId === "string") {
      const postRef = db.collection("posts").doc(postId);
      tx.update(postRef, {
        reported: true,
        reportReason: typeof reason === "string" ? reason : "policy_violation",
        reportedAt: admin.firestore.FieldValue.serverTimestamp(),
        reportedBy: reporterId
      });
    }
  });

  return { success: true };
});

function isAdmin(auth) {
  return auth && (auth.token.admin === true || auth.uid === "sysop_admin");
}

exports.resolveAppeal = onCall(async (request) => {
  const { data, auth } = request;
  if (!isAdmin(auth)) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }

  const { appealId, userId } = data;
  if (!appealId || !userId) {
    throw new HttpsError("invalid-argument", "appealId and userId are required.");
  }

  const db = admin.firestore();

  // 1. Re-enable the Firebase Auth account
  try {
    await admin.auth().updateUser(userId, { disabled: false });
  } catch (err) {
    console.error(`Could not re-enable Auth account for ${userId}:`, err);
  }

  // 2. Reset the user document's ban fields
  await db.collection("users").doc(userId).update({
    flag_count: 0,
    banned: false,
    isBanned: false,
    reporterIds: []
  });

  // 3. Remove device from blacklist
  const userSnap = await db.collection("users").doc(userId).get();
  if (userSnap.exists) {
    const uuid = userSnap.data().uuid;
    if (uuid) {
      await db.collection("blacklisted_devices").doc(uuid).delete();
    }
  }

  // 4. Delete the appeal document
  await db.collection("appeals").doc(appealId).delete();

  // 5. Write audit log
  await db.collection("admin_audit_log").add({
    action: "resolve_appeal",
    targetId: userId,
    appealId,
    operatorUid: auth.uid,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true };
});

exports.restorePost = onCall(async (request) => {
  const { data, auth } = request;
  if (!isAdmin(auth)) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }

  const { postId } = data;
  if (!postId) {
    throw new HttpsError("invalid-argument", "postId is required.");
  }

  const db = admin.firestore();

  await db.collection("posts").doc(postId).update({ status: "active" });

  await db.collection("admin_audit_log").add({
    action: "restore_post",
    targetId: postId,
    operatorUid: auth.uid,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true };
});
