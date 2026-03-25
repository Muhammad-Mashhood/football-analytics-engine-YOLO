import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * jobStore — persisted job registry.
 *
 * Each entry: { job_id, status, filename, created_at, error, results? }
 *
 * By persisting to localStorage, progress is not lost when the user
 * navigates between Dashboard → Analyze → Results and back.
 */
export const useJobStore = create(
  persist(
    (set, get) => ({
      // Map<job_id, jobObject>
      jobs: {},

      /** Upsert (add or update) a job entry */
      upsertJob: (job) =>
        set((state) => ({
          jobs: { ...state.jobs, [job.job_id]: job },
        })),

      /** Remove a job from the local cache */
      removeJob: (jobId) =>
        set((state) => {
          const next = { ...state.jobs }
          delete next[jobId]
          return { jobs: next }
        }),

      /** Get a single job by id */
      getJob: (jobId) => get().jobs[jobId] ?? null,

      /** All jobs as array, newest first */
      allJobs: () =>
        Object.values(get().jobs).sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        ),
    }),
    { name: 'job-registry' }
  )
)
