
# Cost Estimates for 1,000 Users

This document provides a high-level estimate of the costs associated with running URAI-Spatial for 1,000 active users.

**Assumptions:**

*   **Active User:** A user who opens the application once per day.
*   **Average Session:** 10 minutes.
*   **Stars per User:** 1,000
*   **Narrator Calls:** 5 per session.
*   **Data Export:** 1 per month.

**Firestore:**

*   **Reads per Session:**
    *   Initial load: 1 (batched query for all stars).
    *   Total per session: 1 read operation.
*   **Writes per Session:**
    *   Assuming 1 new star created per session: 1 write operation.
*   **Total Reads per 1k Users (monthly):** 1,000 users * 1 read/session * 30 days = 30,000 reads.
*   **Total Writes per 1k Users (monthly):** 1,000 users * 1 write/session * 30 days = 30,000 writes.
*   **Estimated Cost:** With the Firestore free tier (50k reads/day, 20k writes/day), the cost for 1,000 users should be negligible, likely **$0.00**.

**Cloud Functions:**

*   **`exportUserData`:**
    *   1 call per user per month.
    *   1,000 users * 1 call = 1,000 calls/month.
*   **`narrate`:**
    *   5 calls per session.
    *   1,000 users * 5 calls/session * 30 days = 150,000 calls/month.
*   **`getClusters`:**
    *   1 call per session.
    *   1,000 users * 1 call/session * 30 days = 30,000 calls/month.
*   **Estimated Cost:** The Cloud Functions free tier includes 2 million invocations per month. The estimated usage is well within the free tier, so the cost should be **$0.00**.

**Firebase Hosting:**

*   **Data Transfer:** Assuming the application size is 5MB and each user loads it once a day.
*   **Total Transfer per 1k Users (monthly):** 1,000 users * 5MB/user * 30 days = 150,000 MB = 150 GB.
*   **Estimated Cost:** The Firebase Hosting free tier includes 10GB of storage and 360MB/day of data transfer. The estimated usage will exceed the free tier. The cost for the additional data transfer will be approximately **$20/month**.

**Total Estimated Monthly Cost for 1,000 Users: ~$20.00**
