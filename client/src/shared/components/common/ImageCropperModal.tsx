import React, { useRef, useState } from 'react';
import Cropper, { ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import { Check, RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  aspectRatio?: number; // e.g. 4/3 for landscape inventory, 1/1 for square profile
  title?: string;
  onClose: () => void;
  onCropComplete: (croppedBase64: string) => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageSrc,
  aspectRatio = 4 / 3,
  title = 'Crop Image',
  onClose,
  onCropComplete,
}) => {
  const cropperRef = useRef<ReactCropperElement>(null);
  const [isCropping, setIsCropping] = useState(false);

  if (!isOpen || !imageSrc) return null;

  const handleSave = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    setIsCropping(true);

    try {
      const canvas = cropper.getCroppedCanvas({
        maxWidth: 1200,
        maxHeight: 1200,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });

      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.9);
      onCropComplete(croppedBase64);
      onClose();
    } catch (err) {
      console.error('Cropping failed', err);
    } finally {
      setIsCropping(false);
    }
  };

  const handleZoom = (delta: number) => {
    cropperRef.current?.cropper.zoom(delta);
  };

  const handleRotate = () => {
    cropperRef.current?.cropper.rotate(90);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {aspectRatio === 1 ? 'Square 1:1 ratio for profile avatar' : 'Landscape 4:3 ratio for inventory catalog'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cropper Container Stage */}
        <div className="relative bg-slate-950 p-4 max-h-[60vh] flex items-center justify-center overflow-hidden">
          <Cropper
            ref={cropperRef}
            src={imageSrc}
            style={{ height: 340, width: '100%' }}
            aspectRatio={aspectRatio}
            guides={true}
            viewMode={1}
            minCropBoxWidth={100}
            minCropBoxHeight={100}
            background={false}
            responsive={true}
            autoCropArea={0.9}
            checkOrientation={false}
          />
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleZoom(0.1)}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-xs hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleZoom(-0.1)}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-xs hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleRotate}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-xs hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              title="Rotate 90°"
            >
              <RotateCw className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isCropping}
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {isCropping ? 'Cropping...' : 'Crop & Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
