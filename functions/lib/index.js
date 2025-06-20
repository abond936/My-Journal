"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onDemandAggregateCardStats = exports.scheduledAggregateCardStats = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin SDK
admin.initializeApp();
const firestore = admin.firestore();
// The core aggregation logic
async function performAggregation() {
    functions.logger.info("Starting card statistics aggregation...");
    const statsRef = firestore.collection("statistics").doc("cards");
    const cardsRef = firestore.collection("cards");
    const snapshot = await cardsRef.get();
    if (snapshot.empty) {
        functions.logger.info("No cards found. Setting stats to zero.");
        await statsRef.set({
            totalCount: 0,
            types: {},
            statuses: {},
            coverImageCount: 0,
            lastUpdated: new Date().toISOString(),
        });
        return;
    }
    // Initialize stats object with type safety
    const stats = {
        totalCount: snapshot.size,
        types: {},
        statuses: {},
        coverImageCount: 0,
    };
    // Iterate over all cards and aggregate data
    snapshot.forEach(doc => {
        const card = doc.data();
        // Aggregate by type
        if (card.type) {
            stats.types[card.type] = (stats.types[card.type] || 0) + 1;
        }
        // Aggregate by status
        if (card.status) {
            stats.statuses[card.status] = (stats.statuses[card.status] || 0) + 1;
        }
        // Count cards with a cover image
        if (card.coverImage) {
            stats.coverImageCount++;
        }
    });
    // Save the aggregated stats to the 'statistics' collection
    await statsRef.set(Object.assign(Object.assign({}, stats), { lastUpdated: new Date().toISOString() }));
    functions.logger.info("Successfully aggregated card statistics:", stats);
}
// 1. Scheduled Function (runs every 4 hours)
exports.scheduledAggregateCardStats = functions.pubsub
    .schedule("every 4 hours")
    .onRun(async (context) => {
    functions.logger.info("Scheduled execution of aggregateCardStats triggered.");
    await performAggregation();
    return null;
});
// 2. HTTP-Callable Function (for on-demand execution by an admin)
exports.onDemandAggregateCardStats = functions.https
    .onCall(async (data, context) => {
    // Note: Role-based access control is not implemented here.
    // In a real app, you would verify admin status:
    // if (!context.auth || context.auth.token.role !== 'admin') {
    //   throw new functions.https.HttpsError(
    //     'permission-denied',
    //     'You must be an admin to perform this operation.'
    //   );
    // }
    try {
        await performAggregation();
        return { status: "success", message: "Card statistics aggregation completed." };
    }
    catch (error) {
        functions.logger.error("Error during on-demand aggregation:", error);
        throw new functions.https.HttpsError("internal", "An internal error occurred while aggregating stats.");
    }
});
//# sourceMappingURL=index.js.map