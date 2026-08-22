// Every class-size dropdown draws from this list. They used to disagree:
// the request form offered 1-20, the create-class form 3-10, and settings
// 3-10 — so a student could request a 2-student class that no teacher could
// ever create, and answering it failed on a database constraint.
//
// Mirrors utils/classSize.js on the backend and the CHECK constraints in
// migrations/align_class_size_range.sql. 1 is here because one-to-one
// tutoring is a real offering; 6 is the ceiling because an hour of live
// video split six ways is already only ten minutes of speaking time each.
export const CLASS_SIZE_OPTIONS = [1, 2, 3, 4, 5, 6]

// What a new class or request starts on. Enough for a group without being
// so large that nobody gets to speak.
export const DEFAULT_CLASS_SIZE = 4
