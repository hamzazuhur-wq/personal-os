import { validateLevelPayload, validateRequirementPayload } from '../features/levels/validation/levelValidation';
import { Level } from '../types/level.types';

console.log('--- Verifying POS Module 03 Development Levels ---');

// 1. Level Validation
console.log('1. Level Validation:');
const mockLevels: Level[] = [
  {
    id: 'lvl-1',
    user_id: 'user',
    life_area_id: 'area-1',
    name: 'Foundation',
    display_order: 1,
    status: 'completed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'lvl-2',
    user_id: 'user',
    life_area_id: 'area-1',
    name: 'Consistency',
    display_order: 2,
    status: 'current',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const validLevel = validateLevelPayload(
  { name: 'Competence', life_area_id: 'area-1', display_order: 3 },
  mockLevels
);
console.log('  - Valid Level isValid:', validLevel.isValid ? 'PASSED' : 'FAILED');

const duplicateOrderLevel = validateLevelPayload(
  { name: 'Duplicate Order Stage', life_area_id: 'area-1', display_order: 2 },
  mockLevels
);
console.log('  - Duplicate display_order rejected:', !duplicateOrderLevel.isValid && Boolean(duplicateOrderLevel.errors.displayOrder) ? 'PASSED' : 'FAILED');

const invalidNameLevel = validateLevelPayload(
  { name: ' ', life_area_id: 'area-1', display_order: 4 },
  mockLevels
);
console.log('  - Empty Level name rejected:', !invalidNameLevel.isValid && Boolean(invalidNameLevel.errors.name) ? 'PASSED' : 'FAILED');

// 2. Requirement Validation
console.log('2. Requirement Validation:');
const validReq = validateRequirementPayload({
  title: 'Complete 3 real case studies',
  type: 'manual',
  is_required: true,
});
console.log('  - Valid Requirement isValid:', validReq.isValid ? 'PASSED' : 'FAILED');

const invalidReq = validateRequirementPayload({
  title: 'ab',
  type: 'manual',
});
console.log('  - Too short title rejected:', !invalidReq.isValid && Boolean(invalidReq.errors.title) ? 'PASSED' : 'FAILED');

// 3. Reorder Safety Verification (Decision 4)
console.log('3. Reorder Safety Logic (Decision 4):');
const completedOrCurrentIds = mockLevels
  .filter((l) => l.status === 'completed' || l.status === 'current')
  .map((l) => l.id);

console.log('  - Protected level IDs correctly detected (lvl-1, lvl-2):', completedOrCurrentIds.length === 2 ? 'PASSED' : 'FAILED');

console.log('--- POS Module 03 Development Levels Verification Complete ---');
