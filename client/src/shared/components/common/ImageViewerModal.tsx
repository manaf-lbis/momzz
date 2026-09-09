import React, { useState, useEffect } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Download from 'yet-another-react-lightbox/plugins/download';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';

import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import 'yet-another-react-lightbox/plugins/captions.css';

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

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  images,
  initialIndex = 0,
  onClose,
}) => {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (isOpen) {
      setIndex(Math.max(0, Math.min(initialIndex, images.length - 1)));
    }
  }, [isOpen, initialIndex, images.length]);

  if (!isOpen || images.length === 0) return null;

  const slides = images.map((img, i) => {
    const timeFormatted = img.timestamp
      ? new Date(img.timestamp).toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : null;

    const details = [
      img.subtitle,
      img.isThumbnail ? '⭐ Primary Vehicle Thumbnail' : null,
      img.remarks ? `Remarks: "${img.remarks}"` : null,
      timeFormatted ? `Captured: ${timeFormatted}` : null,
    ]
      .filter(Boolean)
      .join(' • ');

    const filename = `MOMZZ_${(img.title || 'Vehicle')
      .replace(/[^a-zA-Z0-9_-]/g, '_')}_${i + 1}.jpg`;

    return {
      src: img.url,
      title: img.title || 'Vehicle Inspection Photo',
      description: details,
      download: {
        url: img.url,
        filename,
      },
    };
  });

  return (
    <div className="momzz-lightbox-wrapper">
      <style>{`
        .yarl__root {
          --yarl__color_backdrop: rgba(6, 7, 14, 0.94);
          --yarl__color_button: rgba(255, 255, 255, 0.85);
          --yarl__color_button_active: #fbbf24;
          --yarl__thumbnails_thumbnail_border_color: rgba(255, 255, 255, 0.15);
          --yarl__thumbnails_thumbnail_border_color_active: #fbbf24;
          --yarl__thumbnails_thumbnail_border_width: 2px;
          --yarl__thumbnails_thumbnail_border_radius: 12px;
          --yarl__thumbnails_thumbnail_padding: 3px;
          --yarl__thumbnails_track_background_color: rgba(10, 12, 22, 0.85);
          z-index: 99999 !important;
          backdrop-filter: blur(16px);
        }
        .yarl__slide_title {
          font-weight: 900 !important;
          color: #fbbf24 !important;
          letter-spacing: -0.02em !important;
          font-size: 1rem !important;
        }
        .yarl__slide_description {
          font-size: 0.8rem !important;
          color: rgba(255, 255, 255, 0.85) !important;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
        }
        .yarl__button {
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6));
          transition: transform 0.15s ease, color 0.15s ease;
        }
        .yarl__button:hover {
          color: #fbbf24;
          transform: scale(1.1);
        }
      `}</style>
      <Lightbox
        open={isOpen}
        close={onClose}
        index={index}
        on={{
          view: ({ index: newIndex }) => setIndex(newIndex),
        }}
        slides={slides}
        plugins={[Zoom, Thumbnails, Download, Captions, Fullscreen]}
        animation={{
          fade: 250,
          swipe: 300,
          navigation: 300,
        }}
        carousel={{
          finite: images.length <= 1,
          preload: 2,
          padding: '16px',
        }}
        zoom={{
          maxZoomPixelRatio: 4,
          zoomInMultiplier: 1.8,
          doubleTapDelay: 300,
          doubleClickDelay: 300,
          doubleClickMaxStops: 2,
          wheelZoomDistanceFactor: 100,
          pinchZoomDistanceFactor: 100,
          scrollToZoom: true,
        }}
        thumbnails={{
          position: 'bottom',
          width: 80,
          height: 56,
          gap: 12,
          showToggle: images.length > 1,
        }}
        captions={{
          showToggle: true,
          descriptionTextAlign: 'center',
          descriptionMaxLines: 3,
        }}
      />
    </div>
  );
};
