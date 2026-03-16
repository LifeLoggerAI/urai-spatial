/**
 * @file Defines the core data structures for the Asset Factory API.
 * These types are the non-negotiable contract for all interactions.
 */

// The core entities

export interface Campaign {
  id: string; // cmp_...
  name: string;
  brandKitId: string;
  platforms: Platform[];
  aspectRatios: AspectRatio[];
  copyBlocks: {
    headlines: string[];
    ctas: string[];
  };
  assets: {
    images: string[]; // asset_...
  };
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface BrandKit {
  id: string; // bk_...
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  fonts: {
    primary: string;
    secondary: string;
  };
  logos: string[]; // asset_...
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface Job {
  id: string; // job_...
  campaignId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  variantLimit: number;
  templateVersion: string;
  createdAt: string; // ISO 8601
  completedAt?: string; // ISO 8601
}

// Enums and utility types

export type Platform = 'meta' | 'google' | 'tiktok';

export type AspectRatio = '1:1' | '9:16' | '16:9' | '4:5';
