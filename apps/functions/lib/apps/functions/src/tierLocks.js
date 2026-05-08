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
exports.evaluateSpatialTierLock = void 0;
exports.evaluateDecision = evaluateDecision;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const index_1 = require("../../../packages/tier-locks/src/index");
if (!admin.apps.length)
    admin.initializeApp();
function evaluateDecision(input) {
    const cfg = index_1.CANONICAL_FEATURE_RULES[input.featureId];
    if (!cfg) {
        return {
            allowed: false,
            reasons: ['unknown'],
            requiredTier: undefined,
            fallback: undefined,
        };
    }
    const reasons = [];
    if (cfg.requiresAuth && !input.authenticated && !input.isAdmin && !input.isFounder) {
        reasons.push('unauthenticated');
    }
    if (!input.isAdmin &&
        !input.isFounder &&
        index_1.TIER_ORDER[input.userTier] < index_1.TIER_ORDER[cfg.requiredTier]) {
        reasons.push('insufficient_tier');
    }
    if (cfg.adminOnly && !input.isAdmin && !input.isFounder) {
        reasons.push('admin_only');
    }
    for (const consent of cfg.requiredConsents) {
        if (!input.consents[consent] && !input.isAdmin && !input.isFounder) {
            reasons.push('missing_consent');
            break;
        }
    }
    for (const flag of cfg.requiredFlags) {
        if (!input.flags[flag]) {
            reasons.push('feature_flag_disabled');
        }
    }
    if (cfg.safetyClass === 'premium' &&
        input.safetyChecks &&
        Object.values(input.safetyChecks).some((value) => value === false) &&
        !input.isAdmin &&
        !input.isFounder) {
        reasons.push('safety_blocked');
    }
    return {
        allowed: reasons.length === 0,
        reasons,
        requiredTier: cfg.requiredTier,
        fallback: cfg.fallback,
    };
}
exports.evaluateSpatialTierLock = functions.https.onCall(async (data, context) => {
    const featureId = String(data?.featureId ?? '');
    const cfg = index_1.CANONICAL_FEATURE_RULES[featureId];
    if (!cfg) {
        throw new functions.https.HttpsError('invalid-argument', 'Unknown featureId');
    }
    const uid = context.auth?.uid ?? null;
    const claims = (context.auth?.token ?? {});
    const isAdmin = claims.admin === true;
    const isFounder = claims.founder === true;
    const reasons = [];
    const flags = {};
    if (cfg.requiresAuth && !uid && !isAdmin && !isFounder) {
        reasons.push('unauthenticated');
    }
    let userTier = 'tier1';
    let consents = {};
    if (uid) {
        const userDoc = await admin.firestore().doc(`users/${uid}`).get();
        if (userDoc.exists) {
            const docTier = userDoc.get('entitlementTier');
            if (docTier === 'tier1' || docTier === 'tier2' || docTier === 'tier3') {
                userTier = docTier;
            }
            consents = userDoc.get('consents') ?? {};
        }
    }
    if (!isAdmin && !isFounder && index_1.TIER_ORDER[userTier] < index_1.TIER_ORDER[cfg.requiredTier]) {
        reasons.push('insufficient_tier');
    }
    if (cfg.adminOnly && !isAdmin && !isFounder) {
        reasons.push('admin_only');
    }
    for (const consent of cfg.requiredConsents) {
        if (!consents[consent] && !isAdmin && !isFounder) {
            reasons.push('missing_consent');
            break;
        }
    }
    const flagResults = await Promise.all(cfg.requiredFlags.map(async (flagName) => {
        const snap = await admin.firestore().doc(`features/${flagName}`).get();
        return {
            flagName,
            enabled: snap.exists ? Boolean(snap.get('enabled')) : false,
        };
    }));
    for (const { flagName, enabled } of flagResults) {
        flags[flagName] = enabled;
        if (!enabled) {
            reasons.push('feature_flag_disabled');
        }
    }
    const safetyChecks = uid
        ? ((await admin.firestore().doc(`users/${uid}/meta/safety`).get()).data() ?? {})
        : {};
    if (cfg.safetyClass === 'premium' &&
        Object.values(safetyChecks).some((value) => value === false) &&
        !isAdmin &&
        !isFounder) {
        reasons.push('safety_blocked');
    }
    const allowed = reasons.length === 0;
    const response = {
        allowed,
        featureId,
        requiredTier: cfg.requiredTier,
        userTier,
        reasons,
        flags,
        safeFallbackFeatureId: allowed ? undefined : cfg.fallback,
        messageKey: allowed ? 'tierLock.allowed' : 'tierLock.denied',
        auditId: undefined,
    };
    if (!allowed && uid && cfg.requiredTier !== 'tier1') {
        const auditRef = admin.firestore().collection(`users/${uid}/tierLockAudit`).doc();
        await auditRef.set({
            featureId,
            reasons,
            requiredTier: cfg.requiredTier,
            userTier,
            flags,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        response.auditId = auditRef.id;
    }
    return response;
});
