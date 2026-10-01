// Image preparation pipeline conforming to Addendum A4.6:
// Orientation fix, downscale to max 2048px, JPEG 0.85 re-encoding, EXIF/GPS removal.

export async function processScannedImage(fileOrBlob: Blob): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(fileOrBlob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxDim = 2048;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to create canvas 2D context'));
        return;
      }

      // Draw image onto canvas (automatically strips any EXIF/GPS metadata)
      ctx.drawImage(img, 0, 0, width, height);

      // Re-encode to JPEG 0.85
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas toBlob failed'));
            return;
          }
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve({ blob, dataUrl, width, height });
        },
        'image/jpeg',
        0.85
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image file'));
    };

    img.src = url;
  });
}
