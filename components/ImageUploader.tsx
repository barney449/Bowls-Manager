import React, { useState, useCallback, useRef } from 'react';
import AvatarEditor from 'react-avatar-editor';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Check, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';

interface ImageUploaderProps {
  onImageCropped: (croppedImage: string) => void;
  onCancel: () => void;
  initialImage?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageCropped, onCancel, initialImage }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const editorRef = useRef<AvatarEditor>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setImageSrc(file as any); // react-avatar-editor accepts File object
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp']
    },
    multiple: false
  });

  const handleSave = async () => {
    if (editorRef.current) {
      setIsProcessing(true);
      try {
        // Get the canvas with the cropped image
        const canvas = editorRef.current.getImageScaledToCanvas();
        // Convert to base64
        const croppedImage = canvas.toDataURL('image/png');
        onImageCropped(croppedImage);
      } catch (e) {
        console.error(e);
        alert('Failed to crop image. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  if (!imageSrc) {
    return (
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-green-600 bg-green-50' : 'border-gray-300 hover:border-green-600 hover:bg-gray-50'}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <div className="p-3 bg-gray-100 rounded-full">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-gray-700">Click or drag image here</p>
            <p className="text-xs mt-1">Supports PNG, JPG (Transparent backgrounds preserved)</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative w-full h-64 bg-gray-900 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
        <AvatarEditor
          ref={editorRef}
          image={imageSrc}
          width={200}
          height={200}
          border={20}
          borderRadius={100} // Circular mask
          color={[0, 0, 0, 0.6]} // RGBA
          scale={scale}
          rotate={0}
          crossOrigin="anonymous"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>

      <div className="flex items-center gap-4 px-2">
        <ZoomOut className="w-4 h-4 text-gray-500" />
        <input
          type="range"
          value={scale}
          min={0.5}
          max={3}
          step={0.1}
          aria-labelledby="Zoom"
          onChange={(e) => setScale(Number(e.target.value))}
          className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
        />
        <ZoomIn className="w-4 h-4 text-gray-500" />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setImageSrc(null)}
          className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1"
        >
          <X className="w-3 h-3" /> Change Image
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isProcessing}
          className="px-3 py-1.5 text-xs font-bold bg-green-600 text-white hover:bg-green-700 rounded-lg flex items-center gap-1 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          {isProcessing ? 'Processing...' : 'Apply Crop'}
        </button>
      </div>
    </div>
  );
};

export default ImageUploader;
