import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { useBrandingStore } from '@/stores/brandingStore'
import LoadingSpinner from '@/components/common/LoadingSpinner'

export default function BrandingPage() {
  const { branding, updateBranding, uploadLogo, isLoading } = useBrandingStore()
  const [formData, setFormData] = useState({
    primary_color: branding?.primary_color || '#1e5631',
    secondary_color: branding?.secondary_color || '#d4af37',
    accent_color: branding?.accent_color || '#3b82f6',
    background_color: branding?.background_color || '#ffffff',
    text_color: branding?.text_color || '#1f2937',
    company_name_display: branding?.company_name_display || '',
    tagline: branding?.tagline || '',
    show_powered_by: branding?.show_powered_by ?? true,
    custom_css: branding?.custom_css || '',
  })

  const handleSave = async () => {
    try {
      await updateBranding(formData)
      toast.success('Branding updated successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update branding')
    }
  }

  const onLogoDrop = useCallback(
    async (acceptedFiles: File[], type: 'logo' | 'logo_dark' | 'favicon') => {
      const file = acceptedFiles[0]
      if (!file) return

      try {
        await uploadLogo(file, type)
        toast.success('Logo uploaded successfully')
      } catch {
        toast.error('Failed to upload logo')
      }
    },
    [uploadLogo]
  )

  const { getRootProps: getLogoProps, getInputProps: getLogoInput } = useDropzone({
    onDrop: (files) => onLogoDrop(files, 'logo'),
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.svg'] },
    maxFiles: 1,
  })

  const { getRootProps: getFaviconProps, getInputProps: getFaviconInput } = useDropzone({
    onDrop: (files) => onLogoDrop(files, 'favicon'),
    accept: { 'image/*': ['.ico', '.png', '.svg'] },
    maxFiles: 1,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branding</h1>
          <p className="text-gray-500 mt-1">Customize your organization's look and feel</p>
        </div>
        <button onClick={handleSave} disabled={isLoading} className="btn btn-primary">
          {isLoading ? <LoadingSpinner size="sm" /> : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Logo uploads */}
          <div className="card">
            <h2 className="card-title mb-4">Logo & Favicon</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="form-label mb-2">Logo</label>
                <div
                  {...getLogoProps()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                >
                  <input {...getLogoInput()} />
                  {branding?.logo_url ? (
                    <img
                      src={branding.logo_url}
                      alt="Logo"
                      className="max-h-16 mx-auto"
                    />
                  ) : (
                    <p className="text-sm text-gray-500">
                      Drop logo here or click to upload
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="form-label mb-2">Favicon</label>
                <div
                  {...getFaviconProps()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                >
                  <input {...getFaviconInput()} />
                  {branding?.favicon_url ? (
                    <img
                      src={branding.favicon_url}
                      alt="Favicon"
                      className="h-8 w-8 mx-auto"
                    />
                  ) : (
                    <p className="text-sm text-gray-500">
                      Drop favicon here or click to upload
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="card">
            <h2 className="card-title mb-4">Colors</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="form-group">
                <label className="form-label">Primary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) =>
                      setFormData({ ...formData, primary_color: e.target.value })
                    }
                    className="h-10 w-14 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primary_color}
                    onChange={(e) =>
                      setFormData({ ...formData, primary_color: e.target.value })
                    }
                    className="form-input flex-1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Secondary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) =>
                      setFormData({ ...formData, secondary_color: e.target.value })
                    }
                    className="h-10 w-14 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.secondary_color}
                    onChange={(e) =>
                      setFormData({ ...formData, secondary_color: e.target.value })
                    }
                    className="form-input flex-1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Accent Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.accent_color || '#3b82f6'}
                    onChange={(e) =>
                      setFormData({ ...formData, accent_color: e.target.value })
                    }
                    className="h-10 w-14 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.accent_color || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, accent_color: e.target.value })
                    }
                    className="form-input flex-1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Background</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.background_color}
                    onChange={(e) =>
                      setFormData({ ...formData, background_color: e.target.value })
                    }
                    className="h-10 w-14 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.background_color}
                    onChange={(e) =>
                      setFormData({ ...formData, background_color: e.target.value })
                    }
                    className="form-input flex-1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Text Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.text_color}
                    onChange={(e) =>
                      setFormData({ ...formData, text_color: e.target.value })
                    }
                    className="h-10 w-14 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.text_color}
                    onChange={(e) =>
                      setFormData({ ...formData, text_color: e.target.value })
                    }
                    className="form-input flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Text content */}
          <div className="card">
            <h2 className="card-title mb-4">Company Information</h2>
            <div className="space-y-4">
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.company_name_display}
                  onChange={(e) =>
                    setFormData({ ...formData, company_name_display: e.target.value })
                  }
                  placeholder="Your Company Name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tagline</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.tagline}
                  onChange={(e) =>
                    setFormData({ ...formData, tagline: e.target.value })
                  }
                  placeholder="Your company tagline"
                />
              </div>

              <div className="form-group">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.show_powered_by}
                    onChange={(e) =>
                      setFormData({ ...formData, show_powered_by: e.target.checked })
                    }
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm">Show "Powered by EUSuite" badge</span>
                </label>
              </div>
            </div>
          </div>

          {/* Custom CSS */}
          <div className="card">
            <h2 className="card-title mb-4">Custom CSS</h2>
            <textarea
              className="form-input font-mono text-sm"
              rows={6}
              value={formData.custom_css}
              onChange={(e) =>
                setFormData({ ...formData, custom_css: e.target.value })
              }
              placeholder="/* Add custom CSS here */"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <div className="card sticky top-6">
            <h2 className="card-title mb-4">Preview</h2>
            
            {/* Mini preview of branding */}
            <div
              className="rounded-lg overflow-hidden border"
              style={{
                backgroundColor: formData.background_color,
                color: formData.text_color,
              }}
            >
              {/* Header preview */}
              <div
                className="p-4"
                style={{ backgroundColor: formData.primary_color }}
              >
                <div className="flex items-center gap-2">
                  {branding?.logo_url ? (
                    <img
                      src={branding.logo_url}
                      alt="Logo"
                      className="h-8"
                    />
                  ) : (
                    <div className="h-8 w-8 bg-white/20 rounded flex items-center justify-center text-white font-bold text-sm">
                      EU
                    </div>
                  )}
                  <span className="text-white font-semibold">
                    {formData.company_name_display || 'Company Name'}
                  </span>
                </div>
              </div>

              {/* Content preview */}
              <div className="p-4 space-y-3">
                <p className="text-sm opacity-80">
                  {formData.tagline || 'Your company tagline here'}
                </p>
                
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1.5 rounded text-white text-sm"
                    style={{ backgroundColor: formData.primary_color }}
                  >
                    Primary
                  </button>
                  <button
                    className="px-3 py-1.5 rounded text-white text-sm"
                    style={{ backgroundColor: formData.secondary_color }}
                  >
                    Secondary
                  </button>
                </div>

                {formData.show_powered_by && (
                  <p className="text-xs opacity-50 text-center pt-2 border-t">
                    Powered by EUSuite
                  </p>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              Changes will apply immediately after saving
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
