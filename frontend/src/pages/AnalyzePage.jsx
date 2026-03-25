import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, CheckCircle, Cpu } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'

export default function AnalyzePage() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const navigate = useNavigate()

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) setFile(accepted[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.avi', '.mov', '.mkv'] },
    maxFiles: 1,
  })

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await api.post('/api/ml/analyze', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100))
        },
      })
      toast.success('Video queued for processing')
      navigate(`/results/${res.data.job_id}`)
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8">
          <div
            {...getRootProps()}
            className={`bg-bg-card rounded-lg p-1 cursor-pointer ${isDragActive ? 'ring-2 ring-accent' : ''}`}
          >
            <div
              className={`border-2 border-dashed rounded flex flex-col items-center justify-center py-16 lg:py-24 px-8 gap-6 transition-colors ${
                isDragActive ? 'border-accent bg-green-dim' : 'border-border-strong'
              }`}
            >
              <input {...getInputProps()} />

              <div className="w-20 h-20 rounded-xl bg-green-dim flex items-center justify-center">
                <Upload size={32} className="text-accent" />
              </div>

              <AnimatePresence mode="wait">
                {file ? (
                  <motion.div key="file" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                    <div className="flex items-center gap-2 justify-center mb-2">
                      <CheckCircle size={16} className="text-accent" />
                      <span className="text-accent font-bold text-sm">File Selected</span>
                    </div>
                    <p className="text-text-primary font-heading font-bold text-xl break-all">{file.name}</p>
                    <p className="text-text-secondary text-sm mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                    <h2 className="font-heading font-bold text-text-primary text-2xl tracking-tight mb-2">Ingest Match Footage</h2>
                    <p className="text-text-secondary text-sm max-w-xs">
                      Drag and drop tactical high-angle or broadcast feed here. Supported formats: .mp4, .avi, .mkv
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-wrap justify-center gap-4">
                <button
                  type="button"
                  className="px-8 py-3 rounded font-bold text-[#f5fff6] bg-btn-primary shadow-glow-green text-sm hover:opacity-90 transition-opacity"
                >
                  Select Files
                </button>
                <button
                  type="button"
                  className="px-8 py-3 rounded font-bold text-text-primary bg-bg-muted border border-border-medium text-sm hover:bg-[#3a3c3b] transition-colors"
                >
                  Cloud Import
                </button>
              </div>

              <div className="flex flex-wrap justify-center gap-6 lg:gap-8 opacity-40">
                {['Auto-Detection', 'Pose Estimation', 'Ball Tracking'].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border border-text-primary flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-text-primary" />
                    </div>
                    <span className="text-text-primary text-[10px] uppercase tracking-widest font-mono">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {file && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
              {uploading ? (
                <div className="bg-bg-card border border-border-medium rounded-lg p-4">
                  <div className="flex justify-between text-xs text-text-secondary mb-2">
                    <span>Uploading...</span>
                    <span className="font-mono text-accent">{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleUpload}
                  className="w-full py-4 rounded font-bold text-[#f5fff6] bg-btn-primary shadow-glow-green hover:opacity-90 transition-opacity font-heading text-lg"
                >
                  Start Analysis
                </button>
              )}
            </motion.div>
          )}
        </div>

        <div className="xl:col-span-4 flex flex-col gap-4">
          <div className="backdrop-blur-[10px] bg-[rgba(51,53,52,0.6)] border border-border-medium rounded-lg p-6">
            <p className="text-[10px] text-accent uppercase tracking-widest font-bold mb-3">System Status</p>
            <h3 className="font-heading font-bold text-text-primary text-2xl mb-6">CPU Mode<br />Active</h3>

            {[
              { label: 'Processing Load', value: '12%', color: '#00ff41', pct: 12 },
              { label: 'Model Latency', value: '380ms', color: '#00daf3', pct: 38 },
            ].map(({ label, value, color, pct }) => (
              <div key={label} className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-text-secondary">{label}</span>
                  <span className="font-mono" style={{ color }}>{value}</span>
                </div>
                <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-bg-card border border-border-default rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-text-primary uppercase tracking-widest font-bold">Active Models</span>
              <Cpu size={12} className="text-accent" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="bg-green-dim border border-green-dim2 rounded-full px-3 py-1 text-accent text-[10px] font-bold inline-block w-fit">
                YOLO26_TRACKER
              </div>
              <div className="bg-bg-muted rounded-full px-3 py-1 text-text-secondary text-[10px] font-bold inline-block w-fit">
                BYTETRACK_LITE
              </div>
              <div className="bg-bg-muted rounded-full px-3 py-1 text-text-secondary text-[10px] font-bold inline-block w-fit">
                POSSESSION_ENGINE
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
