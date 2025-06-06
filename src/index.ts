// Re-export specific functions and types from call-ai
import { imageGen, callAi, type ImageGenOptions, type ImageResponse } from 'call-ai';
export { imageGen, callAi, type ImageGenOptions, type ImageResponse };

// Export ImgGen component
export { default as ImgGen } from './components/ImgGen';
export type { ImgGenProps } from './components/ImgGen';

// Export style utilities
export type { ImgGenClasses } from './utils/style-utils';

// Export utility functions
export { base64ToFile } from './utils/base64';
