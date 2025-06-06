import type { DocFileMeta, Database } from 'use-fireproof';
import { ImageGenOptions, ImageResponse } from 'call-ai';

// Interface for our image documents in Fireproof
// Interface for prompt entry
export interface PromptEntry {
  text: string; // The prompt text content
  created: number; // Timestamp when this prompt was created
}

export interface ImageDocument {
  _id?: string; // Must be defined when saving to database, but may be absent when creating
  type?: 'image'; // Document type identifier
  prompt?: string; // Legacy field, superseded by prompts/currentPromptKey
  _files?: Record<string, File | DocFileMeta>; // Files keyed by version ID (v1, v2, etc.)
  created?: number;
  currentVersion?: number; // The currently active version index (0-based)
  versions?: VersionInfo[]; // Array of version metadata
  prompts?: Record<string, PromptEntry>; // Prompts keyed by ID (p1, p2, etc.)
  currentPromptKey?: string; // The currently active prompt key
}

// Interface for version information
export interface VersionInfo {
  id: string; // Version identifier (e.g. "v1", "v2")
  created: number; // Timestamp when this version was created
  promptKey?: string; // Reference to the prompt used for this version (e.g. "p1")
}

export type GenerationPhase = 'idle' | 'generating' | 'complete' | 'error';

/** Input options for the useImageGen hook */
export interface UseImageGenOptions {
  /** Prompt text for image generation */
  prompt?: string;

  /** Document ID for fetching existing image */
  _id?: string;

  /** Fireproof database name or instance */
  database?: string | Database;

  /** Image generator options */
  options?: ImageGenOptions;

  /**
   * Generation ID - a unique identifier that changes ONLY when a fresh request is made.
   * This replaces the regenerate flag with a more explicit state change signal.
   */
  generationId?: string;

  /** Flag to skip processing when neither prompt nor _id is valid */
  skip?: boolean;

  /**
   * Edited prompt that should override the document prompt on regeneration
   * This is used when the user edits the prompt in the UI before regenerating
   */
  editedPrompt?: string;
}

export interface UseImageGenResult {
  /** Base64 image data */
  imageData: string | null;

  /** Whether the image is currently loading */
  loading: boolean;

  /** Progress percentage (0-100) */
  progress: number;

  /** Error if image generation failed */
  error: Error | null;

  /** Size information parsed from options */
  size: {
    width: number;
    height: number;
  };

  /** Document for the generated image */
  document: ImageDocument | null;
}

// Module state type for tracking pending requests and their results
export interface ModuleState {
  pendingImageGenCalls: Map<string, Promise<ImageResponse>>;
  pendingPrompts: Set<string>;
  processingRequests: Set<string>;
  requestTimestamps: Map<string, number>;
  requestCounter: number;
  // Track which image generation requests have already created documents
  // Map from prompt+options hash to document ID
  createdDocuments: Map<string, string>;
  // Track pending document creation promises to deduplicate db.put operations
  pendingDocumentCreations: Map<string, Promise<{ id: string; doc: ImageDocument }>>;
}
