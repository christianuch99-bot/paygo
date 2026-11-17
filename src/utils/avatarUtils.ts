export const compressAvatarImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file (JPG, PNG, or WEBP).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Could not process this image. Please try another photo.'));
      img.onload = () => {
        const MAX_DIM = 512;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (dataUrl.length <= 900000) {
            resolve(dataUrl);
          } else {
            reject(new Error('Image is too large. Please choose a smaller photo.'));
          }
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        if (compressed.length <= 900000) {
          resolve(compressed);
        } else {
          const fallback = canvas.toDataURL('image/jpeg', 0.6);
          resolve(fallback);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
};
