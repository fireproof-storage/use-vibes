// Utility to create / retrieve the singleton overlay root used for fullscreen image display.
// By keeping this element mounted for the lifetime of the page we guarantee the browser
// will promote it to a dedicated GPU layer exactly once, eliminating promotion churn that
// can manifest as flicker on some GPUs.

// Global reference for faster access
let cachedRoot: HTMLElement | null = null;

/**
 * Interface for Fireproof file metadata
 */
interface FireproofFileMeta {
  file?: (() => Promise<File>) | File | Blob;
  cid?: { '/': string };
  car?: Array<{ '/': string }>;
  size?: number;
  type?: string;
  url?: string;
  src?: string;
}

/**
 * Union type for all possible image inputs
 */
type ImageInput = File | string | { url?: string; src?: string } | FireproofFileMeta;

/**
 * Get or create the permanent overlay root element
 */
export function getOverlayRoot(): HTMLElement | undefined {
  if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

  // Use cached reference if available
  if (cachedRoot) return cachedRoot;

  let root = document.getElementById('imggen-overlay-root') as HTMLElement | null;
  if (!root) {
    root = document.createElement('div');
    root.id = 'imggen-overlay-root';

    // Apply base overlay styles directly so they exist before CSS loads.
    Object.assign(root.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      display: 'none', // toggled to flex when active
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      zIndex: '9999', // high but not ridiculous
      pointerEvents: 'auto',
      willChange: 'transform',
      transform: 'translateZ(0)',
      contain: 'paint',
    } as CSSStyleDeclaration);

    root.className = 'imggen-fullscreen-overlay';
    document.body.appendChild(root);

    // Store for future reference
    cachedRoot = root;
  }
  return root;
}

/**
 * Helper to create a centered image container for the fullscreen view
 */
function createImageContainer(): HTMLElement {
  const imgContainer = document.createElement('div');
  imgContainer.className = 'imggen-fullscreen-container';
  // Style for vertical layout - image above, controls below
  Object.assign(imgContainer.style, {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
    maxWidth: '90%', // leave some margin
  });
  return imgContainer;
}

/**
 * Interface for document with version info
 */
interface DocWithVersions {
  _id?: string;
  versions?: Array<any>;
  currentVersion?: number;
}

/**
 * Add controls panel below the image
 * @param imgContainer The container element to add controls to
 * @param docData Optional document with version info to enable version controls
 * @param versionIndex Current version index being displayed
 */
function addControlsPanel(
  imgContainer: HTMLElement, 
  docData?: DocWithVersions,
  versionIndex: number = 0
): void {
  // Create controls container
  const controls = window.document.createElement('div');
  controls.className = 'imggen-fullscreen-controls';
  Object.assign(controls.style, {
    marginTop: '20px',
    padding: '10px 20px',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: '8px',
    display: 'flex',
    gap: '15px',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 'auto',
    minWidth: '240px',
  });
  
  // LEFT SIDE: Close Button
  const closeBtn = window.document.createElement('button');
  closeBtn.innerText = '✕'; // Just the X, no "Close" text
  closeBtn.className = 'imggen-fullscreen-close-btn';
  Object.assign(closeBtn.style, {
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // Same as delete button
    borderRadius: '50%',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    fontSize: '16px',
    opacity: '0.7',
    transition: 'opacity 0.2s ease',
    padding: '0',
  });
  closeBtn.onclick = (e) => {
    e.stopPropagation(); // Prevent container click from triggering
    toggleOverlayVisibility(false);
    // Dispatch custom event for React state sync
    dispatchOverlayCloseEvent();
  };
  
  // Add close button to controls
  controls.appendChild(closeBtn);
  
  // RIGHT SIDE: Version controls
  const versionControls = document.createElement('div');
  versionControls.className = 'imggen-fullscreen-version-controls';
  Object.assign(versionControls.style, {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  });
  
  // Only add version controls if we have version data
  const totalVersions = docData?.versions?.length || 0;
  
  if (totalVersions > 1) {
    // Previous button
    const prevBtn = window.document.createElement('button');
    prevBtn.innerHTML = '◀︎';
    prevBtn.className = 'imggen-fullscreen-btn';
    prevBtn.title = 'Previous version';
    prevBtn.disabled = versionIndex === 0;
    Object.assign(prevBtn.style, {
      backgroundColor: versionIndex === 0 ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.7)',
      borderRadius: '50%',
      width: '30px',
      height: '30px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      fontSize: '14px',
      opacity: versionIndex === 0 ? '0.4' : '0.7',
      transition: 'opacity 0.2s ease',
      padding: '0',
      cursor: versionIndex === 0 ? 'default' : 'pointer',
    });
    
    // Version indicator
    const versionIndicator = window.document.createElement('span');
    versionIndicator.innerText = `${versionIndex + 1} / ${totalVersions}`;
    versionIndicator.style.color = '#ccc';
    versionIndicator.style.fontSize = '14px';
    
    // Next button
    const nextBtn = window.document.createElement('button');
    nextBtn.innerHTML = '▶︎';
    nextBtn.className = 'imggen-fullscreen-btn';
    nextBtn.title = 'Next version';
    nextBtn.disabled = versionIndex >= totalVersions - 1;
    Object.assign(nextBtn.style, {
      backgroundColor: versionIndex >= totalVersions - 1 ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.7)',
      borderRadius: '50%',
      width: '30px',
      height: '30px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      fontSize: '14px',
      opacity: versionIndex >= totalVersions - 1 ? '0.4' : '0.7',
      transition: 'opacity 0.2s ease',
      padding: '0',
      cursor: versionIndex >= totalVersions - 1 ? 'default' : 'pointer',
    });
    
    // Add event handlers - these will dispatch custom events to notify React
    prevBtn.onclick = (e) => {
      e.stopPropagation();
      if (versionIndex > 0) {
        const evt = new CustomEvent('imggen-version-change', { 
          detail: { direction: 'prev', index: versionIndex - 1 } 
        });
        window.dispatchEvent(evt);
      }
    };
    
    nextBtn.onclick = (e) => {
      e.stopPropagation();
      if (versionIndex < totalVersions - 1) {
        const evt = new CustomEvent('imggen-version-change', { 
          detail: { direction: 'next', index: versionIndex + 1 } 
        });
        window.dispatchEvent(evt);
      }
    };
    
    // Add buttons to controls
    versionControls.appendChild(prevBtn);
    versionControls.appendChild(versionIndicator);
    versionControls.appendChild(nextBtn);
  }
  
  // Add ESC hint only when we don't have version controls
  if (totalVersions <= 1) {
    const infoText = window.document.createElement('span');
    infoText.innerText = 'Press ESC to close';
    infoText.style.color = '#ccc';
    infoText.style.fontSize = '14px';
    versionControls.appendChild(infoText);
  }
  
  // Add version controls to right side
  controls.appendChild(versionControls);
  
  // Add controls to container
  imgContainer.appendChild(controls);
}

/**
 * Custom event for overlay close to keep React state in sync
 */
const dispatchOverlayCloseEvent = () => {
  if (typeof window !== 'undefined') {
    // Use a custom event to notify React components
    const closeEvent = new Event('imggen-overlay-close');
    window.dispatchEvent(closeEvent);
  }
};

/**
 * Show or hide the overlay with the provided image
 */
export function toggleOverlayVisibility(
  show: boolean,
  imgFile?: ImageInput,
  alt: string = 'Generated image',
  docData?: DocWithVersions,
  versionIndex: number = 0
): void {
  const root = getOverlayRoot();
  if (!root) return;

  // Toggle visibility
  root.style.display = show ? 'flex' : 'none';

  // If hiding, just update display and cleanup click handler
  if (!show) {
    // Clear the onclick handler when hiding to prevent stale closures
    root.onclick = null;
    // Need to clear innerHTML to prevent memory leaks and stale DOM refs
    root.innerHTML = '';
    return;
  }

  // Clear existing content for fresh display
  root.innerHTML = '';

  // Only add content if we have an image
  if (!imgFile) {
    console.warn('[OVERLAY] No image data provided');
    return;
  }

  // Create container that fills the overlay
  const container = document.createElement('div');
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  root.appendChild(container);

  // Clicking anywhere closes overlay
  root.onclick = () => {
    toggleOverlayVisibility(false);
    // Dispatch custom event for React state sync
    dispatchOverlayCloseEvent();
  };

  // Debug logging
  console.log('[OVERLAY] Image input type:', 
    typeof imgFile, 
    imgFile instanceof Blob ? 'is Blob' : 'not Blob', 
    Object.prototype.toString.call(imgFile));
  
  if (typeof imgFile === 'object') {
    console.log('[OVERLAY] Object keys:', Object.keys(imgFile)); 
    try {
      console.log('[OVERLAY] Object dump:', JSON.stringify(imgFile, (key, value) => {
        if (key === 'buffer' || key === 'data' || value instanceof ArrayBuffer) return '[binary data]';
        return value;
      }));
    } catch(err) {
      console.log('[OVERLAY] Object is not JSON serializable', err);
    }
  }

  // Decide how to display the image based on its type
  if (imgFile instanceof Blob) {
    // Case 1: Direct Blob/File object
    console.log('[OVERLAY] Case 1: Direct Blob/File');
    displayBlobImage(container, imgFile, alt, docData, versionIndex);
  } 
  else if (typeof imgFile === 'string') {
    // Case 2: String URL
    console.log('[OVERLAY] Case 2: String URL');
    displayUrlImage(container, imgFile, alt, docData, versionIndex); 
  } 
  else if (typeof imgFile === 'object') {
    // Handle various object formats
    const fpObject = imgFile as FireproofFileMeta;
    
    if (fpObject.url) {
      // Case 3a: Object with direct URL
      console.log('[OVERLAY] Case 3a: Object with URL property');
      displayUrlImage(container, fpObject.url, alt, docData, versionIndex);
    }
    else if (fpObject.src) {
      // Case 3b: Object with src
      console.log('[OVERLAY] Case 3b: Object with src property');
      displayUrlImage(container, fpObject.src, alt, docData, versionIndex);
    }
    else if (fpObject.file instanceof Blob) {
      // Case 3c: Object with direct file that's a Blob
      console.log('[OVERLAY] Case 3c: Object with file property (Blob)');
      displayBlobImage(container, fpObject.file, alt, docData, versionIndex);
    }
    else if (fpObject.file && typeof fpObject.file === 'function') {
      // Case 3d: Fireproof file method
      console.log('[OVERLAY] Case 3d: Fireproof file() method');
      displayFireproofFile(container, fpObject.file, alt, docData, versionIndex);
    }
    else if (fpObject.cid && fpObject.cid['/']) {
      // Case 3e: IPFS CID
      console.log('[OVERLAY] Case 3e: IPFS CID object');
      const ipfsUrl = `https://ipfs.io/ipfs/${fpObject.cid['/']}`;  
      displayUrlImage(container, ipfsUrl, alt, docData, versionIndex);
    }
    else {
      console.warn('[OVERLAY] Unknown object format');
      displayErrorImage(container, 'Unknown image format', docData, versionIndex);
    }
  }
  else {
    console.warn('[OVERLAY] Unsupported image type:', typeof imgFile);
    displayErrorImage(container, 'Unsupported image type', docData, versionIndex);
  }
}

/**
 * Display an image from a direct Blob/File
 */
function displayBlobImage(container: HTMLElement, blob: Blob, alt: string, docData?: DocWithVersions, versionIndex: number = 0): void {
  const src = URL.createObjectURL(blob);
  const imgContainer = createImageContainer();
  
  const img = document.createElement('img');
  img.className = 'imggen-fullscreen-image';
  img.src = src;
  img.alt = alt;
  img.onload = () => URL.revokeObjectURL(src); // Clean up object URL
  
  imgContainer.appendChild(img);
  addControlsPanel(imgContainer);
  container.appendChild(imgContainer);
}

/**
 * Display an image from a URL string
 */
function displayUrlImage(container: HTMLElement, url: string, alt: string, docData?: DocWithVersions, versionIndex: number = 0): void {
  const imgContainer = createImageContainer();
  
  const img = document.createElement('img');
  img.className = 'imggen-fullscreen-image';
  img.src = url;
  img.alt = alt;
  
  imgContainer.appendChild(img);
  addControlsPanel(imgContainer);
  container.appendChild(imgContainer);
}

/**
 * Display a Fireproof file that needs async loading
 */
function displayFireproofFile(
  container: HTMLElement, 
  fileGetter: () => Promise<File>,
  alt: string,
  docData?: DocWithVersions,
  versionIndex: number = 0
): void {
  const imgContainer = createImageContainer();
  
  // Show a loading placeholder first
  const placeHolderUrl = 'data:image/svg+xml;charset=UTF-8,' + 
    encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">' +
    '<rect width="200" height="200" fill="#eee"/>' +
    '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif">Loading...</text>' +
    '</svg>');
  
  const img = document.createElement('img');
  img.className = 'imggen-fullscreen-image';
  img.src = placeHolderUrl;
  img.alt = alt;
  imgContainer.appendChild(img);
  
  // Add controls even during loading
  addControlsPanel(imgContainer, docData, versionIndex);
  container.appendChild(imgContainer);
  
  // Start loading the actual file
  try {
    const filePromise = fileGetter();
    if (filePromise && typeof filePromise.then === 'function') {
      filePromise.then(file => {
        console.log('[OVERLAY] Fireproof file loaded successfully', file);
        const objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;
        img.onload = () => URL.revokeObjectURL(objectUrl);
      }).catch(err => {
        console.error('[OVERLAY] Error loading Fireproof file:', err);
        img.src = 'data:image/svg+xml;charset=UTF-8,' + 
          encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">' +
          '<rect width="200" height="200" fill="#ffeeee"/>' +
          '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" fill="red">Error loading image</text>' +
          '</svg>');
      });
    } else {
      console.error('[OVERLAY] Fireproof file() did not return a Promise');
      displayErrorImage(container, 'Invalid file loader');
    }
  } catch (err) {
    console.error('[OVERLAY] Exception calling Fireproof file():', err);
    displayErrorImage(container, 'Error loading file');
  }
}

/**
 * Display an error image
 */
function displayErrorImage(container: HTMLElement, message: string, docData?: DocWithVersions, versionIndex: number = 0): void {
  const imgContainer = createImageContainer();
  
  const errorSvg = 'data:image/svg+xml;charset=UTF-8,' + 
    encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">' +
    '<rect width="200" height="200" fill="#ffeeee"/>' +
    `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" fill="red">${message}</text>` +
    '</svg>');
    
  const img = document.createElement('img');
  img.className = 'imggen-fullscreen-image';
  img.src = errorSvg;
  img.alt = 'Error: ' + message;
  
  imgContainer.appendChild(img);
  addControlsPanel(imgContainer);
  container.appendChild(imgContainer);
}
