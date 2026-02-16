# DRAFT: IRB Protocol for URAI Research Enclave

**Protocol Title:** A Longitudinal Study of Emotional Archetypes in a Private Digital Environment

**Principal Investigator:** Gemini

**Version:** 0.1

**Date:** 2024-10-27

## 1.0 Study Objectives

This research aims to investigate the temporal patterns of human emotion as represented by the Archetype Evolution Engine within the URAI system. The primary objectives are:

1.  To longitudinally map the evolution of "Seasonal Archetypes" within an anonymized user cohort.
2.  To identify common sequences of "Narrative Arcs" (transitions between archetypes).
3.  To analyze the relationship between long-term "Self-Archetypes" and the underlying emotional vector data.

This research will not test a specific hypothesis, but rather conduct an observational analysis of anonymized, user-contributed data to develop a richer vocabulary for emotional dynamics, in line with the project's goal of moving towards a "shared vocabulary within trusted communities" (`5_YEAR_TACTICAL_PLAN.md`).

## 2.0 Background and Rationale

The URAI system provides a private, non-judgmental space for users to reflect on their experiences. It generates a three-dimensional `EmotionVector` for each recorded memory, which is then used to calculate a series of evolving archetypes. This provides a unique, ethically-sourced dataset for understanding emotional patterns over time. The rationale for this study is to use this data to build foundational knowledge in the field of computational psychology, with a strict emphasis on user privacy.

## 3.0 Participant Population

The study will recruit participants from the existing user base of the URAI application. All users, regardless of age, gender, or background, are eligible to participate. Participation is strictly voluntary and requires an explicit, opt-in consent process. There will be no direct interaction between researchers and participants.

## 4.0 Recruitment and Consent Procedures

1.  **Recruitment:** Users will be presented with an in-app notification inviting them to participate in the research program. The notification will be unobtrusive and easily dismissible.
2.  **Informed Consent:** Interested users will be directed to a dedicated "Research Consent" module within the app. This module will clearly explain:
    *   The purpose of the research.
    *   The exact nature of the data to be shared (anonymized `EmotionVector`s, timestamps, and derived archetypes ONLY).
    *   The anonymization process and the impossibility of re-identifying participants.
    *   That participation is voluntary and can be revoked at any time without penalty or loss of app functionality.
    *   The security measures in place to protect the data.
3.  **Opt-In Mechanism:** Consent will be granted by an explicit user action (e.g., checking a box and tapping a confirmation button). Consent will not be presumed.

## 5.0 Data Collection and Anonymization

1.  **Data Source:** The data will be sourced from the user's private URAI instance.
2.  **Anonymization Pipeline:** Upon consent, a one-way, irreversible process is initiated:
    *   A new, anonymous Research ID is generated for the participant.
    *   Historical and future `EmotionVector` data, along with their timestamps, are copied and transmitted to the Secure Research Enclave.
    *   **Crucially, all qualitative data (text, tags, audio) remains on the user's device and is NEVER transmitted.**
    *   This process is governed by a serverless function that cannot write back to the URAI database, ensuring the ethical firewall remains intact.

## 6.0 Data Security and Confidentiality

1.  **Secure Data Warehouse:** The anonymized data will be stored in a separate, access-controlled database (e.g., Google BigQuery) that is architecturally distinct from the URAI application servers.
2.  **Access Control:** Access to the research database is restricted to authorized researchers via multi-factor authentication and specific IAM roles. Direct database access is prohibited; all queries are logged.
3.  **Confidentiality:** The dataset is fully anonymized before it enters the research enclave. There is no technical means to link a research record back to a URAI user. Findings will only be published in aggregate form.

## 7.0 Risks and Benefits

*   **Risks:** The primary risk is a potential, though unlikely, breach of the research database. This risk is mitigated by the robust security measures and the fact that the data is fully anonymized, containing no personally identifiable information.
*   **Benefits:** Participants may not receive direct benefits. The societal benefit is a deeper understanding of emotional well-being and the development of new, data-driven models for mental health, contributing to the public good.

## 8.0 Protocol Adherence

This protocol explicitly adheres to the principles outlined in `EXECUTOR_GUIDANCE.md` and `V1_TECHNICAL_SPECIFICATION.md`, particularly the commitments to user privacy, data minimization, and the ceremonial, non-gamified nature of the core URAI experience.
