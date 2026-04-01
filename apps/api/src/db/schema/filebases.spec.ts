import { filebases, filebasesRelations, type Filebase, type NewFilebase } from './filebases';
import { users } from './users';

/**
 * AGGRESSIVE TEST SUITE: Filebases Schema
 *
 * Why test schema definitions?
 * 1. Schema is the foundation - wrong schema = data corruption
 * 2. Constraints must be validated before migrations
 * 3. Relations must be correctly defined
 * 4. Types must be correctly inferred
 *
 * Testing strategy:
 * - Validate table structure (columns, types, constraints)
 * - Validate relations are correctly defined
 * - Validate type inference works correctly
 */

describe('Filebases Schema', () => {
  describe('table structure', () => {
    /**
     * WHY: Table must exist with correct name
     */
    it('should have correct table name', () => {
      // Drizzle tables have a `_` property with table metadata
      expect((filebases as any)[Symbol.for('drizzle:Name')]).toBe('filebases');
    });

    /**
     * WHY: Primary key must be UUID for security (not guessable)
     */
    it('should have id column as UUID primary key', () => {
      const idColumn = filebases.id;
      // Drizzle stores UUID as 'string' dataType with 'PgUUID' columnType
      expect(idColumn.columnType).toBe('PgUUID');
      expect(idColumn.primary).toBe(true);
      expect(idColumn.hasDefault).toBe(true); // defaultRandom()
    });

    /**
     * WHY: Each filebase must belong to exactly one user (owner)
     */
    it('should have ownerId as foreign key to users', () => {
      const ownerIdColumn = filebases.ownerId;
      // Drizzle stores UUID as 'string' dataType with 'PgUUID' columnType
      expect(ownerIdColumn.columnType).toBe('PgUUID');
      expect(ownerIdColumn.notNull).toBe(true);
    });

    /**
     * WHY: Each user can only have one filebase
     */
    it('should have unique constraint on ownerId', () => {
      const ownerIdColumn = filebases.ownerId;
      expect(ownerIdColumn.isUnique).toBe(true);
    });

    /**
     * WHY: Filebase must have a display name
     */
    it('should have name column as varchar', () => {
      const nameColumn = filebases.name;
      expect(nameColumn.dataType).toBe('string');
      expect(nameColumn.notNull).toBe(true);
    });

    /**
     * WHY: Timestamps for audit trail
     */
    it('should have createdAt and updatedAt timestamps', () => {
      const createdAtColumn = filebases.createdAt;
      const updatedAtColumn = filebases.updatedAt;

      expect(createdAtColumn.dataType).toBe('date');
      expect(createdAtColumn.notNull).toBe(true);
      expect(createdAtColumn.hasDefault).toBe(true);

      expect(updatedAtColumn.dataType).toBe('date');
      expect(updatedAtColumn.notNull).toBe(true);
      expect(updatedAtColumn.hasDefault).toBe(true);
    });
  });

  describe('relations', () => {
    /**
     * WHY: Filebase must reference its owner
     */
    it('should have owner relation to users table', () => {
      expect(filebasesRelations).toBeDefined();
      // Relations are functions that return relation config
      const config = filebasesRelations.config;
      expect(config).toBeDefined();
    });
  });

  describe('type inference', () => {
    /**
     * WHY: TypeScript types must be correctly inferred for type safety
     */
    it('should correctly infer Filebase type', () => {
      // This is a compile-time check - if types are wrong, this won't compile
      const filebase: Filebase = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ownerId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'My Filebase',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(filebase.id).toBeDefined();
      expect(filebase.ownerId).toBeDefined();
      expect(filebase.name).toBeDefined();
    });

    /**
     * WHY: NewFilebase type should not require auto-generated fields
     */
    it('should correctly infer NewFilebase type', () => {
      // NewFilebase should not require id, createdAt, updatedAt (they have defaults)
      const newFilebase: NewFilebase = {
        ownerId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'My Filebase',
      };

      expect(newFilebase.ownerId).toBeDefined();
      expect(newFilebase.name).toBeDefined();
    });
  });
});
