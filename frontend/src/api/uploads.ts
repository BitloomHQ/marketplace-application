import { apiRequest, getToken } from './client'

export type UploadFolder =
  | 'profile_pictures'
  | 'service_categories'
  | 'provider_portfolio'
  | 'service_requests'

type SignedUploadResponse = {
  success: boolean
  upload_url: string
  file_key: string
  file_url: string
  method: string
  field_name: string
}

export function generateSignedUploadUrl(data: {
  file_name: string
  file_type: string
  folder: UploadFolder
}) {
  return apiRequest<SignedUploadResponse>('/api/uploads/generate-signed-url/', {
    method: 'POST',
    body: data,
  })
}

export async function uploadToSignedUrl(
  uploadUrl: string,
  fileKey: string,
  file: File,
  fieldName = 'file',
) {
  const formData = new FormData()
  formData.append(fieldName, file)
  formData.append('file_key', fileKey)

  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Token ${token}`

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Image upload failed')
  }

  return response.json() as Promise<{
    success: boolean
    file_key: string
    file_url: string
  }>
}

export async function uploadImageFile(file: File, folder: UploadFolder): Promise<string | null> {
  try {
    const signed = await generateSignedUploadUrl({
      file_name: file.name,
      file_type: file.type || 'image/jpeg',
      folder,
    })
    await uploadToSignedUrl(signed.upload_url, signed.file_key, file, signed.field_name)
    return signed.file_key
  } catch {
    return null
  }
}
