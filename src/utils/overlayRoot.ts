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
 * Add controls panel below the image 
 */
function addControlsPanel(imgContainer: HTMLElement): void {
  // Create controls container
  const controls = document.createElement('div');
  controls.className = 'imggen-fullscreen-controls';
  Object.assign(controls.style, {
    marginTop: '20px',
    padding: '10px 20px',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: '8px',
    display: 'flex',
    gap: '15px',
    alignItems: 'center',
  });
  
  // Close Button
  const closeBtn = document.createElement('button');
  closeBtn.innerText = '✕ Close';
  closeBtn.className = 'imggen-fullscreen-btn';
  Object.assign(closeBtn.style, {
    backgroundColor: '#444',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
  });
  closeBtn.onclick = (e) => {
    e.stopPropagation(); // Prevent container click from triggering
    toggleOverlayVisibility(false);
  };
  
  // Add buttons and info to controls
  controls.appendChild(closeBtn);
  
  // Info text - image format, dimensions if available
  const infoText = document.createElement('span');
  infoText.innerText = 'Press ESC to close';
  infoText.style.color = '#ccc';
  infoText.style.fontSize = '14px';
  controls.appendChild(infoText);
  
  // Add controls to container
  imgContainer.appendChild(controls);
}

/**
 * Show or hide the overlay with the provided image
 */
export function toggleOverlayVisibility(
  show: boolean,
  imgFile?: ImageInput,
  alt: string = 'Generated image'
): void {
  const root = getOverlayRoot();
  if (!root) return;

  // Toggle visibility
  root.style.display = show ? 'flex' : 'none';

  // If hiding, just update display and return
  if (!show) {
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
  root.onclick = () => toggleOverlayVisibility(false);

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
    displayBlobImage(container, imgFile, alt);
  } 
  else if (typeof imgFile === 'string') {
    // Case 2: String URL
    console.log('[OVERLAY] Case 2: String URL');
    displayUrlImage(container, imgFile, alt); 
  } 
  else if (typeof imgFile === 'object') {
    // Handle various object formats
    const fpObject = imgFile as FireproofFileMeta;
    
    if (fpObject.url) {
      // Case 3a: Object with direct URL
      console.log('[OVERLAY] Case 3a: Object with URL property');
      displayUrlImage(container, fpObject.url, alt);
    }
    else if (fpObject.src) {
      // Case 3b: Object with src
      console.log('[OVERLAY] Case 3b: Object with src property');
      displayUrlImage(container, fpObject.src, alt);
    }
    else if (fpObject.file instanceof Blob) {
      // Case 3c: Object with direct file that's a Blob
      console.log('[OVERLAY] Case 3c: Object with file property (Blob)');
      displayBlobImage(container, fpObject.file, alt);
    }
    else if (fpObject.file && typeof fpObject.file === 'function') {
      // Case 3d: Fireproof file method
      console.log('[OVERLAY] Case 3d: Fireproof file() method');
      displayFireproofFile(container, fpObject.file, alt);
    }
    else if (fpObject.cid && fpObject.cid['/']) {
      // Case 3e: IPFS CID
      console.log('[OVERLAY] Case 3e: IPFS CID object');
      const ipfsUrl = `https://ipfs.io/ipfs/${fpObject.cid['/']}`;  
      displayUrlImage(container, ipfsUrl, alt);
    }
    else {
      console.warn('[OVERLAY] Unknown object format');
      displayErrorImage(container, 'Unknown image format');
    }
  }
  else {
    console.warn('[OVERLAY] Unsupported image type:', typeof imgFile);
    displayErrorImage(container, 'Unsupported image type');
  }
}

/**
 * Display an image from a direct Blob/File
 */
function displayBlobImage(container: HTMLElement, blob: Blob, alt: string): void {
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
function displayUrlImage(container: HTMLElement, url: string, alt: string): void {
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
  alt: string
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
  addControlsPanel(imgContainer);
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
function displayErrorImage(container: HTMLElement, message: string): void {
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
