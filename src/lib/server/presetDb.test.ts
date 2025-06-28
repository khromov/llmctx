import { describe, it, expect, vi } from 'vitest'
import { PresetDbService } from './presetDb'
import * as db from './db'

// Mock the database module
vi.mock('./db', () => ({
	query: vi.fn()
}))

describe('PresetDbService', () => {
	describe('upsertPreset', () => {
		it('should handle concurrent inserts without race conditions', async () => {
			const mockQuery = vi.mocked(db.query)

			// Mock successful INSERT ... ON CONFLICT
			mockQuery.mockResolvedValueOnce({
				rows: [
					{
						id: 1,
						preset_name: 'test-preset',
						content: 'test content',
						size_kb: 10,
						document_count: 1,
						updated_at: new Date()
					}
				],
				rowCount: 1,
				command: 'INSERT',
				oid: 0,
				fields: []
			})

			const result = await PresetDbService.upsertPreset({
				preset_name: 'test-preset',
				content: 'test content',
				size_kb: 10,
				document_count: 1
			})

			expect(result).toBeDefined()
			expect(result.preset_name).toBe('test-preset')

			// Verify the query uses INSERT ... ON CONFLICT
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('INSERT INTO presets'),
				expect.any(Array)
			)
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('ON CONFLICT (preset_name) DO UPDATE'),
				expect.any(Array)
			)
		})
	})

	describe('createDistillation', () => {
		it('should handle concurrent inserts without race conditions', async () => {
			const mockQuery = vi.mocked(db.query)

			// Mock successful INSERT ... ON CONFLICT
			mockQuery.mockResolvedValueOnce({
				rows: [
					{
						id: 1,
						preset_name: 'svelte-distilled',
						version: 'latest',
						content: 'distilled content',
						size_kb: 20,
						document_count: 5,
						distillation_job_id: null,
						created_at: new Date()
					}
				],
				rowCount: 1,
				command: 'INSERT',
				oid: 0,
				fields: []
			})

			const result = await PresetDbService.createDistillation({
				preset_name: 'svelte-distilled',
				version: 'latest',
				content: 'distilled content',
				size_kb: 20,
				document_count: 5
			})

			expect(result).toBeDefined()
			expect(result.preset_name).toBe('svelte-distilled')
			expect(result.version).toBe('latest')

			// Verify the query uses INSERT ... ON CONFLICT
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('INSERT INTO distillations'),
				expect.any(Array)
			)
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('ON CONFLICT (preset_name, version) DO UPDATE'),
				expect.any(Array)
			)
		})
	})
})
