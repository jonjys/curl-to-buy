// Vercel Blob rejects a conditional write that lost a race with a precondition
// failure or "already exists". When two writes land at the same instant it
// rejects both with "conflicting operation", so neither was written and a retry
// is safe. Verified against the real store in the sandbox.
export function isWriteRace(error) {
  return /precondition|already exists|conflicting operation/i.test(`${error?.name} ${error?.message}`)
}

// Short random pause so two racing writers do not collide again at once.
export function raceBackoff() {
  return new Promise((resolve) => setTimeout(resolve, 25 + Math.floor(Math.random() * 100)))
}
