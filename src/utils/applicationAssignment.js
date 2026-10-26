// pickedBy is the persisted assignment on the backend. assignedExecutive was
// previously filled with a demo name, including in cached application records.
export function getAssignedExecutiveName(application) {
  const name = application?.pickedBy?.name;
  return typeof name === 'string' ? name.trim() : '';
}
