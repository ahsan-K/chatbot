import { Platform } from 'react-native';

import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '@/config/cloudinary';
import { ChatMedia } from '@/components/chat/types';

const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

export async function uploadProfileImage(uri: string, uid: string): Promise<string> {
  const formData = new FormData();
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append('file', blob, 'profile.jpg');
  } else {
    formData.append('file', { uri, type: 'image/jpeg', name: 'profile.jpg' } as any);
  }
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', `chatapp/profiles/${uid}`);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST', body: formData,
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message ?? 'Upload failed'); }
  return (await res.json()).secure_url as string;
}

export async function uploadMedia(convId: string, media: ChatMedia): Promise<string> {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    // Web: fetch the URI and append as Blob
    const response = await fetch(media.uri);
    const blob = await response.blob();
    formData.append('file', blob, media.name ?? 'file');
  } else {
    // React Native: append file URI directly
    formData.append('file', {
      uri: media.uri,
      type: media.mimeType ?? 'application/octet-stream',
      name: media.name ?? 'file',
    } as any);
  }

  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', `chatapp/${convId}`);

  const res = await fetch(UPLOAD_URL, { method: 'POST', body: formData });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? 'Upload failed');
  }

  const data = await res.json();
  return data.secure_url as string;
}
