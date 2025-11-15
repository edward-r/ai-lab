import React from 'react'
import Lottie from 'lottie-react'

export const LottieBox: React.FC<{ json: unknown; label?: string }> = ({ json, label }) => (
  <figure className="rounded border p-2 bg-white">
    <Lottie animationData={json} loop autoplay />
    {label ? <figcaption className="text-xs text-gray-600 mt-1">{label}</figcaption> : null}
  </figure>
)
