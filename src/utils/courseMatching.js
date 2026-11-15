/**
 * Resolves all courses belonging to a selected university.
 * Checks:
 * 1. The university object's own `courses` array (from backend populate)
 * 2. The global `courses` catalog matching by university ID
 * 3. The global `courses` catalog matching by exact or normalized university name
 */
export function resolveUniversityCourses(selectedUnivIdOrName, universities = [], courses = []) {
  if (!selectedUnivIdOrName) return [];

  // Find the university object in the universities list
  const selectedStr = String(selectedUnivIdOrName).trim();
  const univObj = (universities || []).find(u => {
    if (!u) return false;
    const uId = String(u._id || u.id || '').trim();
    const uName = String(u.name || '').trim().toLowerCase();
    return uId === selectedStr || uName === selectedStr.toLowerCase();
  }) || (typeof selectedUnivIdOrName === 'object' && selectedUnivIdOrName !== null ? selectedUnivIdOrName : null);

  const selectedId = univObj ? String(univObj._id || univObj.id || '').trim() : selectedStr;
  const selectedName = univObj ? String(univObj.name || '').trim().toLowerCase() : selectedStr.toLowerCase();
  const cleanSelectedName = selectedName.replace(/[^a-z0-9]/g, '');

  const resolved = [];
  const seenIds = new Set();

  const addCourse = (c) => {
    if (!c) return;
    const cId = String(c._id || c.id || c.title || '').trim();
    if (!cId || seenIds.has(cId)) return;
    seenIds.add(cId);
    resolved.push(c);
  };

  // 1. Direct courses array on the university object (from backend populate)
  if (univObj && Array.isArray(univObj.courses)) {
    univObj.courses.forEach(courseRef => {
      if (!courseRef) return;
      if (typeof courseRef === 'object' && (courseRef.title || courseRef.name)) {
        addCourse(courseRef);
      } else {
        const targetId = String(typeof courseRef === 'object' ? (courseRef._id || courseRef.id) : courseRef).trim();
        const match = (courses || []).find(c => String(c._id || c.id || '').trim() === targetId);
        if (match) addCourse(match);
      }
    });
  }

  // 2. Cross-reference courses from the global courses catalog
  (courses || []).forEach(c => {
    if (!c) return;
    const cUniv = c.university;
    const cUnivId = typeof cUniv === 'object' && cUniv !== null
      ? String(cUniv._id || cUniv.id || '').trim()
      : String(cUniv || '').trim();
    const cUnivName = typeof cUniv === 'object' && cUniv !== null
      ? String(cUniv.name || '').trim().toLowerCase()
      : (typeof cUniv === 'string' ? cUniv.trim().toLowerCase() : '');
    const cleanCUnivName = cUnivName.replace(/[^a-z0-9]/g, '');

    // Match by university ID
    const matchesId = selectedId && cUnivId && selectedId === cUnivId;

    // Match by exact university name
    const matchesName = selectedName && cUnivName && selectedName === cUnivName;

    // Match by normalized university name (handles spaces, "the", minor punctuation)
    const matchesNormalized = cleanSelectedName && cleanCUnivName && (
      cleanSelectedName === cleanCUnivName ||
      cleanSelectedName.replace(/^the/, '') === cleanCUnivName.replace(/^the/, '') ||
      (cleanSelectedName.length > 5 && cleanCUnivName.includes(cleanSelectedName)) ||
      (cleanCUnivName.length > 5 && cleanSelectedName.includes(cleanCUnivName))
    );

    if (matchesId || matchesName || matchesNormalized) {
      addCourse(c);
    }
  });

  return resolved;
}

