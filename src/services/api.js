import db from '../db/index.js'

export const logsApi = {
  getAll: (days) => db.logs.getAll(days),
  save: (data) => db.logs.save(data),
}
export const biomarkersApi = {
  getAll: () => db.biomarkers.getAll(),
  save: (data) => db.biomarkers.save(data),
}
export const baselineApi = {
  get: () => db.baseline.get(),
}
export const plansApi = {
  save: (data) => db.plans.save(data),
}
export const aiApi = db.ai
