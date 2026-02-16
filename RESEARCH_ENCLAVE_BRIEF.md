# Project Brief: The URAI Secure Research Enclave

**Date:** 2024-10-27

**Authors:** Gemini

## 1. Overview & Purpose

This document outlines the project brief for the **URAI Secure Research Enclave**, a new system to be built alongside the core URAI platform. The purpose of this enclave is to create a secure, ethical, and consent-based environment for academic research into the patterns of human emotion and experience, based on anonymized data from URAI.

This project directly corresponds to the goals outlined in Year 2 of the `5_YEAR_TACTICAL_PLAN.md`: "*Begin the careful, deliberate transition from a private tool to a shared vocabulary within trusted communities.*"

## 2. Core Principles (Adherence to EXECUTOR_GUIDANCE.md)

The Research Enclave is a separate system that *listens* to signals from URAI. It **cannot** write to or alter the core URAI user experience in any way. The following principles are non-negotiable:

*   **Explicit, Opt-In Consent:** Users must make a conscious, informed, and revocable choice to contribute their data. Anonymization is mandatory.
*   **Data Anonymization:** All contributed data will be stripped of personally identifiable information (PII). The link between a URAI user and a research participant will be severed.
*   **IRB Governance:** The enclave will be designed from the ground up to comply with Institutional Review Board (IRB) standards for human subject research.
*   **System Separation:** The enclave is a one-way data ingestion pipeline. It is architecturally distinct from the URAI Spatial and Replay environments. This is the "ethical firewall."

## 3. High-Level Architecture

The enclave will consist of three main components:

1.  **Consent & Anonymization Pipeline:**
    *   A new UI section within the URAI application where users can learn about the research, provide consent, and manage their participation.
    *   A serverless function that, upon consent, creates a new, anonymized research ID and begins a one-way transfer of historical and future (anonymized) `EmotionVector` data.

2.  **Secure Data Warehouse:**
    *   A separate, access-controlled database (e.g., Google BigQuery) to store the anonymized research data.
    *   Access will be strictly limited to authenticated researchers via specific service accounts.

3.  **Researcher Access & Analysis Tools:**
    *   A sandboxed environment (e.g., AI Platform Notebooks) where approved researchers can run queries and statistical models on the anonymized dataset.
    *   No raw data will be directly downloadable.

## 4. Next Steps

1.  **Draft IRB Protocol:** Begin drafting the formal protocol document for submission to an Institutional Review Board.
2.  **Develop Consent UI Mockups:** Design the user flow and interface for the opt-in process.
3.  **Prototype Anonymization Pipeline:** Build a proof-of-concept for the data transfer and anonymization function.

This brief marks the formal start of the research phase of the URAI project. All work will proceed with the utmost care, prioritizing user privacy and ethical integrity above all else.
