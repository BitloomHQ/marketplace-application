import { useEffect, useState } from 'react'
import { fetchActiveServices } from '../api/accounts'
import { DEFAULT_SERVICE_IMAGE } from '../lib/defaultServiceImage'
import { resolveMediaUrl } from '../lib/media'

let cachedMap: Record<string, string | null> | null = null

export function useServiceImageMap() {
  const [imageMap, setImageMap] = useState<Record<string, string | null>>(cachedMap ?? {})
  const [loading, setLoading] = useState(!cachedMap)

  useEffect(() => {
    if (cachedMap) return
    fetchActiveServices()
      .then((res) => {
        const map = Object.fromEntries(
          res.services.map((service) => [service.key, service.service_image]),
        )
        cachedMap = map
        setImageMap(map)
      })
      .catch(() => {
        cachedMap = {}
        setImageMap({})
      })
      .finally(() => setLoading(false))
  }, [])

  const resolveServiceImage = (serviceType: string): string => {
    const fromApi = imageMap[serviceType]
    if (fromApi) return resolveMediaUrl(fromApi) ?? fromApi
    return DEFAULT_SERVICE_IMAGE
  }

  return { resolveServiceImage, loading }
}
