// Utility to create / retrieve the singleton overlay root used for fullscreen image display.
// By keeping this element mounted for the lifetime of the page we guarantee the browser
// will promote it to a dedicated GPU layer exactly once, eliminating promotion churn that
// can manifest as flicker on some GPUs.

// Global reference for faster access
let cachedRoot: HTMLElement | null = null;

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
 * Show or hide the overlay with the provided image
 */
export function toggleOverlayVisibility(
  show: boolean,
  imgFile?: File,
  alt: string = 'Generated image'
): void {
  const root = getOverlayRoot();
  if (!root) return;

  // Toggle visibility
  root.style.display = show ? 'flex' : 'none';

  // Set up click-to-close behavior
  if (show) {
    // Clear existing content
    root.innerHTML = '';

    // Only add content if we have an image
    if (imgFile) {
      // Create container that fills the overlay
      const container = document.createElement('div');
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';

      // Create image
      const img = document.createElement('img');
      img.className = 'imggen-fullscreen-image';
      img.src = URL.createObjectURL(imgFile);
      img.alt = alt;
      img.onload = () => URL.revokeObjectURL(img.src); // Clean up object URL

      // Add to DOM
      container.appendChild(img);
      root.appendChild(container);
    }
  }
}
