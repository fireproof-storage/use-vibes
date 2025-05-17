import React, { useEffect, useState } from 'react';
import { ImgGen } from 'use-vibes';
import { useFireproof, ImgFile } from 'use-fireproof';
import type { DocBase, DocFileMeta } from 'use-fireproof';
import './App.css';

// Memoized version of ImgFile to prevent unnecessary re-renders and network requests
const MemoizedImgFile = React.memo(
  ({ file, className, alt, style }: { file: File; className?: string; alt: string; style?: React.CSSProperties }) => {
    return <ImgFile file={file} className={className} alt={alt} style={style} />;
  },
  // Custom comparison function to prevent re-renders when irrelevant props change
  (prevProps, nextProps) => {
    // Only re-render if the file itself has changed
    return prevProps.file === nextProps.file;
  }
);

// Set display name for React DevTools and better debugging
MemoizedImgFile.displayName = 'MemoizedImgFile';

// Define interface for image documents
interface ImageDocument extends DocBase {
  type: 'image';
  prompt: string;
  created?: number;
  _files?: Record<string, File | DocFileMeta>;
}

function App() {
  const [inputPrompt, setInputPrompt] = useState('');
  const [activePrompt, setActivePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | undefined>();
  const [quality, setQuality] = useState<'low' | 'medium' | 'high' | 'auto'>('low');

  // Use Fireproof to query all images
  const { useLiveQuery } = useFireproof('ImgGen');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputPrompt(e.target.value);
  };

  const handleQualityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    const qualityMap: Record<number, 'low' | 'medium' | 'high' | 'auto'> = {
      0: 'low',
      1: 'medium',
      2: 'high',
      3: 'auto',
    };
    setQuality(qualityMap[value]);
  };

  const handleGenerate = (e?: React.FormEvent) => {
    // Prevent default form submission if event exists
    if (e) e.preventDefault();

    if (!inputPrompt.trim()) return;
    // Set the active prompt that gets passed to ImgGen only when button is clicked
    setActivePrompt(inputPrompt.trim());
    setSelectedImageId(undefined);
    setIsGenerating(true);
  };

  const handleImageLoad = () => {
    setIsGenerating(false);
  };

  const handleImageError = (error: Error) => {
    console.error('Image generation failed:', error);
    setIsGenerating(false);
  };

  // Get all documents with type: 'image'
  const { docs: imageDocuments } = useLiveQuery<ImageDocument>('type', {
    key: 'image',
    descending: true,
  });

  useEffect(() => {
    console.log('activePrompt', activePrompt);
    console.log('selectedImageId', selectedImageId);
  }, [activePrompt, selectedImageId]);

  return (
    <div className="container">
      <h1>Simple Image Generator</h1>
      <form onSubmit={handleGenerate} className="input-container">
        <input
          type="text"
          value={inputPrompt}
          onChange={handleInputChange}
          placeholder="Enter your image prompt here..."
          className="prompt-input"
        />
        <div className="quality-slider-container">
          <div className="slider-header">
            <label>
              Quality: <span className="quality-value">{quality}</span>
            </label>
          </div>
          <input
            type="range"
            min="0"
            max="3"
            step="1"
            value={['low', 'medium', 'high', 'auto'].indexOf(quality)}
            onChange={handleQualityChange}
            className="quality-slider"
            style={{ width: '100%' }}
          />
          <div
            className="quality-labels"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              marginTop: '8px',
            }}
          >
            <span className={quality === 'low' ? 'active' : ''} style={{ textAlign: 'center' }}>
              Low
            </span>
            <span className={quality === 'medium' ? 'active' : ''} style={{ textAlign: 'center' }}>
              Medium
            </span>
            <span className={quality === 'high' ? 'active' : ''} style={{ textAlign: 'center' }}>
              High
            </span>
            <span className={quality === 'auto' ? 'active' : ''} style={{ textAlign: 'center' }}>
              Auto
            </span>
          </div>
        </div>
        <button
          type="submit"
          className="generate-button"
          disabled={isGenerating || !inputPrompt.trim()}
        >
          {isGenerating ? 'Generating...' : 'Generate Image'}
        </button>
      </form>

      <div className="img-wrapper">
        <ImgGen
          prompt={activePrompt}
          _id={selectedImageId}
          options={{
            quality: quality,
            imgUrl: 'https://vibecode.garden',
            size: '1024x1024',
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </div>

      {/* Display previously generated images */}
      {imageDocuments.length > 0 && (
        <div className="history">
          <h3>Previously Generated Images</h3>
          <div className="image-grid">
            {imageDocuments.map((doc) => (
              <div key={doc._id} className="image-item">
                <div className="thumbnail-container">
                  <ImgGen
                    _id={doc._id}
                    className="thumbnail-img"
                    options={{
                      quality: quality,
                      imgUrl: 'https://vibecode.garden',
                      size: '1024x1024',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw ImgFile component for testing hover behavior */}
      <div className="raw-imgfile-test" style={{ marginTop: '20px', padding: '20px', border: '1px solid #ccc' }}>
        <h3>Raw ImgFile Component (for hover testing)</h3>
        <div>
          <p>Hover over this image to check network requests:</p>
          {imageDocuments.length > 0 && imageDocuments[0]?._files ? (
            <div>
              {/* Use v1 key instead of image */}
              {imageDocuments[0]._files.v1 ? (
                <>
                  <div className="memoized-wrapper" style={{ marginBottom: '20px' }}>
                    <h4>Memoized ImgFile (optimized)</h4>
                    <MemoizedImgFile 
                      file={imageDocuments[0]._files.v1 as File} 
                      alt="Test hover behavior"
                      style={{ width: '100%', maxWidth: '400px' }}
                    />
                  </div>
                  <div className="raw-wrapper">
                    <h4>Raw ImgFile (original)</h4>
                    <ImgFile 
                      file={imageDocuments[0]._files.v1 as File} 
                      alt="Test hover behavior"
                      style={{ width: '100%', maxWidth: '400px' }}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <p>Available file keys: {Object.keys(imageDocuments[0]._files).join(', ')}</p>
                  <pre style={{ maxHeight: '200px', overflow: 'auto', backgroundColor: '#f5f5f5', padding: '10px' }}>
                    {JSON.stringify(imageDocuments[0], null, 2)}
                  </pre>
                </div>
              )}
              <p>Prompt: {imageDocuments[0].prompt}</p>
            </div>
          ) : (
            <p>Generate an image first to see test ImgFile component</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
