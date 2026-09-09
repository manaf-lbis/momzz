import React from 'react';
import { PhotoSlider } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';
import { Star, Clock } from 'lucide-react';

export interface ViewerImage {
  url: string;
  title?: string;
  subtitle?: string;
  timestamp?: string | Date;
  remarks?: string;
  isThumbnail?: boolean;
}

interface ImageViewerModalProps {
  isOpen: boolean;
  images: ViewerImage[];
  initialIndex?: number;
  onClose: () => void;
}

/**
 * ImageViewerModal — powered by react-photo-view's PhotoSlider.
 * Provides pinch-to-zoom, swipe, rotate, download, and captions overlay.
 * Mobile-native feel — like a native photo app.
 */
export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  images,
  initialIndex = 0,
  onClose,
}) => {
  const [index, setIndex] = React.useState(initialIndex);

  React.useEffect(() => {
    if (isOpen) {
      setIndex(Math.max(0, Math.min(initialIndex, images.length - 1)));
    }
  }, [isOpen, initialIndex, images.length]);

  if (images.length === 0) return null;

  const slides = images.map((img, i) => ({
    key: img.url + i,
    src: img.url,
  }));

  const currentImage = images[index] ?? images[0];
  const ts = currentImage?.timestamp
    ? new Date(currentImage.timestamp).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    : null;

  return (
    <>
      <style>{`
        .PhotoView-Portal { z-index: 99999 !important; }
        .PhotoView-Slider__BannerWrap {
          background: rgba(6, 7, 14, 0.88) !important;
          backdrop-filter: blur(14px) !important;
          border-bottom: 1px solid rgba(251, 191, 36, 0.15) !important;
        }
        .PhotoView-Slider__Counter {
          color: #fbbf24 !important;
          font-family: ui-monospace, monospace !important;
          font-weight: 800 !important;
          font-size: 11px !important;
          letter-spacing: 0.06em !important;
        }
        .PhotoView-Slider__ArrowLeft,
        .PhotoView-Slider__ArrowRight {
          background: rgba(0,0,0,0.55) !important;
          backdrop-filter: blur(8px) !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          border-radius: 14px !important;
          width: 44px !important;
          height: 44px !important;
          color: white !important;
          transition: all 0.15s ease !important;
        }
        .PhotoView-Slider__ArrowLeft:hover,
        .PhotoView-Slider__ArrowRight:hover {
          background: rgba(251, 191, 36, 0.28) !important;
          color: #fbbf24 !important;
          border-color: rgba(251, 191, 36, 0.45) !important;
        }
        .PhotoView-Slider__Backdrop {
          background: rgba(4, 5, 11, 0.97) !important;
        }
      `}</style>

      <PhotoSlider
        images={slides}
        visible={isOpen}
        onClose={onClose}
        index={index}
        onIndexChange={setIndex}
        speed={() => 250}
        easing={() => 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'}
        overlayRender={() => (
          <div
            className="absolute bottom-0 inset-x-0 z-50 px-4 pb-6 pt-12 flex flex-col gap-1.5 pointer-events-none"
            style={{
              background: 'linear-gradient(to top, rgba(4,5,11,0.92) 0%, transparent 100%)',
            }}
          >
            {currentImage?.title && (
              <p className="text-amber-400 font-black font-mono text-sm truncate">
                {currentImage.title}
              </p>
            )}
            {currentImage?.subtitle && (
              <p className="text-white/70 font-mono text-xs font-bold truncate">
                {currentImage.subtitle}
              </p>
            )}
            <div className="flex items-center gap-3 text-[10px] font-mono text-white/55 flex-wrap">
              {currentImage?.isThumbnail && (
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="w-3 h-3 fill-current" /> Primary Thumbnail
                </span>
              )}
              {ts && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {ts}
                </span>
              )}
              {currentImage?.remarks && (
                <span className="truncate text-amber-300/80">"{currentImage.remarks}"</span>
              )}
            </div>
          </div>
        )}
        toolbarRender={({ onScale, scale, rotate, onRotate }) => (
          <div className="flex items-center gap-1">
            {/* Download */}
            <a
              href={currentImage?.url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-amber-400/30 text-white hover:text-amber-300 transition-colors"
              title="Download"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
            {/* Zoom in */}
            <button
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              onClick={() => onScale(scale + 1)}
              title="Zoom In"
            >
              <span className="text-base font-bold leading-none">+</span>
            </button>
            {/* Zoom out */}
            <button
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              onClick={() => onScale(scale - 1)}
              title="Zoom Out"
            >
              <span className="text-base font-bold leading-none">−</span>
            </button>
            {/* Rotate */}
            <button
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              onClick={() => onRotate(rotate + 90)}
              title="Rotate"
            >
              <span className="text-xs font-bold">↻</span>
            </button>
          </div>
        )}
      />
    </>
  );
};
